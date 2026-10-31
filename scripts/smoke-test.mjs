// Poetsbeestje — scripts/smoke-test.mjs
// Speelt de app één keer helemaal door in een echte (onzichtbare) browser.
// De klok wordt versneld, dus het duurt maar seconden. Getest wordt onder meer:
// ei kiezen, eerste poetsbeurt met tanden-animatie, ei laten uitkomen, pyjama als
// eerste avondcadeau, speeltijd, kietelen/knuffelen/boos maken, kledingkast pas na
// poetsen, gapen en slapen, weekend buiten spelen, schooldag naar school,
// ouderscherm, stoppen halverwege, reeks-bonus, donker thema en klein scherm.
//
// Gebruik:  npm install                       (eenmalig, haalt Playwright op)
//           npx playwright install chromium   (eenmalig)
//           npm test
// Resultaat: logs/last-test.log  +  screenshots in test-output/
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.PB_OUT || join(ROOT, 'test-output');
const PORT = Number(process.env.PB_PORT) || 3917;
const BASE = `http://localhost:${PORT}/`;
const KEY = 'poetsbeestje.v1';
const MIN = 60 * 1000, HOUR = 60 * MIN;

const lines = [];
let fails = 0;
const t0 = Date.now();
function log(s) {
  const l = `+${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s ${s}`;
  lines.push(l);
  console.log(l);
}
function check(name, ok, detail) {
  if (!ok) fails++;
  log(`${ok ? 'OK  ' : 'FOUT'} ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
}

await mkdir(OUT, { recursive: true });
await mkdir(join(ROOT, 'logs'), { recursive: true });

// ---------- server starten ----------
const server = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
let serverOut = '';
server.stdout.on('data', (d) => { serverOut += d; });
server.stderr.on('data', (d) => { serverOut += d; });
let up = false;
for (let i = 0; i < 50 && !up; i++) {
  try { const r = await fetch(BASE + 'api/health'); up = r.ok; } catch { await new Promise((r) => setTimeout(r, 100)); }
}
check('server start en /api/health antwoordt', up, up ? BASE : serverOut.trim());

let browser;
const pageErrors = [];
const consoleErrors = [];
try {
  browser = await chromium.launch({ executablePath: process.env.PB_CHROME || undefined });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    locale: 'nl-NL', timezoneId: 'Europe/Amsterdam'
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const shot = async (name) => { await page.screenshot({ path: join(OUT, name + '.png') }); log(`     screenshot ${name}.png`); };
  const state = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
  const life = () => page.evaluate(() => window.Poetsbeestje.state());
  const visible = (sel) => page.isVisible(sel);
  const text = async (sel) => ((await page.textContent(sel)) || '').trim();
  const tick = async (ms) => { await page.clock.fastForward(ms); await page.clock.runFor(600); };
  const brushFull = async (seconds) => {
    await page.click('#btn-brush');
    await tick(3500);
    await tick(seconds * 1000 + 500);
  };
  const artBox = async () => page.locator('#home-art').boundingBox();
  const drag = async (pts) => {
    const b = await artBox();
    const at = (p) => [b.x + b.width * p[0], b.y + b.height * p[1]];
    await page.mouse.move(...at(pts[0]));
    await page.mouse.down();
    for (const p of pts.slice(1)) await page.mouse.move(...at(p), { steps: 4 });
    await page.mouse.up();
  };

  // zaterdag 31 oktober, 19:30
  await page.clock.install({ time: new Date('2026-10-31T19:30:00+01:00') });
  await page.goto(BASE);
  await page.waitForSelector('#egg-grid .egg-pick');

  // ---------- ei kiezen ----------
  check('nieuw spel begint met ei kiezen', await visible('#scr-egg'));
  const eggs = await page.$$eval('#egg-grid .egg-pick', (els) => els.map((e) => e.dataset.species));
  check('zes eieren, waaronder eenhoorn, dino en pluisbol', eggs.length === 6 && ['eenhoorn', 'dino', 'pluis'].every((x) => eggs.includes(x)), eggs.join(','));
  check('knop is uit tot je een ei kiest', await page.isDisabled('#btn-egg-ok'));
  await page.click('[data-species="eenhoorn"]');
  await shot('01-ei-kiezen');
  await page.click('#btn-egg-ok');
  let s = await state();
  check('eenhoorn-ei gekozen, naam Sterretje', s.species === 'eenhoorn' && !s.hatched && s.creatureName === 'Sterretje');
  check('beginscherm toont het ei in een nest', await visible('#home-art .egg-svg'));
  check('status is "egg"', (await life()) === 'egg');
  await page.click('#btn-wardrobe', { force: true });
  check('kledingkast zit op slot vóór het uitkomen', !(await visible('#scr-wardrobe')), await text('#home-say'));
  await shot('02-ei-in-nest');

  // ---------- eerste poetsbeurt: tanden-animatie ----------
  await page.click('#btn-brush');
  await tick(3500);
  check('poetsen loopt', (await page.getAttribute('#scr-brush', 'class')).includes('is-brushing'));
  check('mondkaart met 16 tanden', (await page.$$eval('#brush-chart .mc-tooth', (e) => e.length)) === 16);
  const brushPos1 = await page.$eval('#mc-brush', (e) => e.style.transform);
  await tick(16000);
  const brushPos2 = await page.$eval('#mc-brush', (e) => e.style.transform);
  check('borstel schuift van tand naar tand', brushPos1 !== brushPos2, brushPos1 + ' → ' + brushPos2);
  const d0 = await page.$eval('#brush-chart [data-k="0"] .mc-dirt', (e) => Number(e.getAttribute('opacity')));
  const d8 = await page.$eval('#brush-chart [data-k="8"] .mc-dirt', (e) => Number(e.getAttribute('opacity')));
  check('eerste tand is schoon, onderste nog vies', d0 === 0 && d8 > 0.7, `${d0} / ${d8}`);
  check('eerste tand glinstert', (await page.getAttribute('#brush-chart [data-k="0"] .mc-shine', 'class')).includes('on'));
  check('label zegt boven links', (await text('#mc-label')) === 'Boven links');
  await tick(25000);
  check('na 41 s: boven rechts', (await text('#mc-label')) === 'Boven rechts');
  const cracks = await page.$$eval('#brush-art .egg-crack', (els) => els.filter((e) => e.getAttribute('opacity') === '1').length);
  check('ei krijgt barstjes tijdens het poetsen', cracks === 1, String(cracks));
  await shot('03-poetsen-tanden');
  await tick(80000);
  check('na 2 minuten: cadeauscherm', await visible('#scr-reward'));
  s = await state();
  check('eerst uitkomen, dan een cadeautje', s.giftQueue.map((g) => g.reason).join(',') === 'hatch,poetsbeurt', JSON.stringify(s.giftQueue));

  // ---------- ei laten uitkomen ----------
  check('ei ligt klaar om op te tikken', await visible('#hatch .egg-svg'));
  for (let i = 0; i < 4; i++) { await page.click('#hatch', { force: true }); await page.clock.runFor(150); }
  await tick(1500);
  s = await state();
  check('ei is uitgekomen', s.hatched === true);
  check('titel noemt de eenhoorn', /eenhoorn/.test(await text('#reward-title')), await text('#reward-title'));
  check('knop "Hoi Sterretje!"', /Hoi Sterretje/.test(await text('#btn-hatch-next')));
  await new Promise((r) => setTimeout(r, 900));
  await shot('04-uitgekomen');
  await page.click('#btn-hatch-next');
  await page.click('#btn-gift', { force: true });
  await tick(1000);
  check('eerste avondcadeau is de sterrenpyjama', (await text('#reveal-name')) === 'Sterrenpyjama', await text('#reveal-name'));
  await new Promise((r) => setTimeout(r, 600));
  await shot('05-pyjama-cadeau');
  await page.click('#btn-wear');
  s = await state();
  check('pyjama meteen aangetrokken', s.outfit.kleding === 'kl-sterren');

  // ---------- speeltijd ----------
  check('status is nu "play"', (await life()) === 'play');
  check('speeltijd-teller zichtbaar', await visible('#play-chip'), await text('#play-chip'));
  check('hulpje voor aaien zichtbaar', await visible('#home-hints'));
  check('poetsknop weg tijdens spelen', !(await visible('#btn-brush')));
  check('tekstballon begroet', /Sterretje/.test(await text('#home-say')), await text('#home-say'));
  await shot('06-spelen-pyjama');

  await drag([[0.35, 0.55], [0.65, 0.56], [0.35, 0.55], [0.65, 0.56], [0.35, 0.55], [0.65, 0.56]]);
  check('heen en weer kriebelen = kietelen', (await page.getAttribute('#home-art', 'class')).includes('mood-giggle'));
  await shot('07-kietelen');
  await tick(1200);
  await drag([[0.5, 0.25], [0.5, 0.4], [0.5, 0.55]]);
  check('omlaag aaien = knuffelen', (await page.getAttribute('#home-art', 'class')).includes('mood-cuddle'));
  check('hartjes verschijnen', (await page.$$eval('#home-fx .fx-heart', (e) => e.length)) > 0);
  await shot('08-knuffelen');
  await tick(2000);
  await drag([[0.5, 0.6], [0.5, 0.45], [0.5, 0.3]]);
  await page.clock.runFor(200);
  await drag([[0.45, 0.6], [0.45, 0.45], [0.45, 0.3]]);
  check('twee keer omhoog aaien = boos', (await page.getAttribute('#home-art', 'class')).includes('mood-angry'), await text('#home-say'));
  await shot('09-boos');
  await tick(3500);
  check('na een paar seconden weer blij', (await page.getAttribute('#home-art', 'class')).includes('mood-smile'));

  // ---------- kledingkast tijdens spelen ----------
  await page.click('#btn-wardrobe', { force: true });
  check('kledingkast open tijdens spelen', await visible('#scr-wardrobe'));
  await page.click('#wardrobe-tabs [data-slot="kleding"]');
  const kl = await page.$$eval('#wardrobe-grid .item', (els) => els.map((e) => e.dataset.item));
  check('vak kleding met pyjama\'s', kl.length === 8 && kl.includes('kl-sterren') && kl.includes('kl-wolkjes'), kl.join(','));
  check('speeltijd ook in de kledingkast', /\d:\d\d/.test(await text('#wardrobe-time')), await text('#wardrobe-time'));
  await shot('10-kledingkast-kleding');

  // ---------- speeltijd voorbij in de kledingkast: gapen en slapen ----------
  await tick(52000);
  check('na de speeltijd terug naar huis', await visible('#scr-home'));
  check('beestje gaapt', (await page.getAttribute('#home-art', 'class')).includes('mood-yawn'), await text('#home-say'));
  await shot('11-gapen');
  await tick(3000);
  await tick(3000);
  check('status is nu "sleep"', (await life()) === 'sleep');
  check('nachtlucht op het podium', (await page.getAttribute('#home-stage', 'class')).includes('is-night'));
  await tick(2000);
  check('Zzz boven het hoofd', (await page.$$eval('#home-fx .fx-zzz', (e) => e.length)) > 0);
  await page.click('#btn-wardrobe', { force: true });
  check('kledingkast op slot tijdens slapen', !(await visible('#scr-wardrobe')) && /morgen/.test(await text('#wardrobe-lock')), await text('#wardrobe-lock'));
  await shot('12-slapen');

  // ---------- zondagochtend: weekend, buiten spelen ----------
  await page.clock.fastForward(12 * HOUR);   // zondag 07:30
  await page.reload();
  await page.waitForSelector('#home-art');
  check('zondagochtend: eerst poetsen', (await life()) === 'wait' && await visible('#btn-brush'), await text('#home-say'));
  await brushFull(120);
  s = await state();
  check('ochtendbeurt geeft cadeautje', s.giftQueue.length === 1);
  await page.click('#btn-gift', { force: true });
  await tick(1000);
  await page.click('#btn-reward-done');
  check('weekend: 1 minuut spelen', /^[01]:\d\d$/.test(await text('#play-left')), await text('#play-left'));
  await tick(61000);
  check('weekend: gaat buiten spelen', /buiten spelen/.test(await text('#home-say')), await text('#home-say'));
  await tick(2000);
  await tick(2500);
  check('status is "away"', (await life()) === 'away' && await visible('#home-away'), await text('#home-away-text'));

  // ---------- maandagochtend: naar school ----------
  await page.clock.fastForward(24 * HOUR);   // maandag ~07:35
  await page.reload();
  await page.waitForSelector('#home-art');
  await brushFull(120);
  await page.click('#btn-gift', { force: true });
  await tick(1000);
  await page.click('#btn-reward-done');
  check('schooldag: 30 seconden spelen', /^0:(2|3)\d$/.test(await text('#play-left')), await text('#play-left'));
  await tick(31000);
  check('zegt dat hij naar school moet', /school/.test(await text('#home-say')), await text('#home-say'));
  await shot('13-naar-school');
  await tick(2000);
  await tick(2500);
  check('op school: kaartje op het podium', /naar school/.test(await text('#home-away-text')), await text('#home-away-text'));
  await shot('14-op-school');

  // ---------- ouders ----------
  const answer = async (correct) => {
    await page.click('#btn-parent');
    const q = await text('#gate-q');
    const [, a, b] = q.match(/(\d+) × (\d+)/);
    const good = Number(a) * Number(b);
    const vals = await page.$$eval('#gate-answers [data-answer]', (els) => els.map((e) => Number(e.dataset.answer)));
    const pickVal = correct ? good : vals.find((v) => v !== good);
    await page.click(`#gate-answers [data-answer="${pickVal}"]`);
  };
  await answer(false);
  check('fout antwoord: geen ouderscherm', !(await visible('#scr-parent')));
  await answer(true);
  check('goed antwoord: ouderscherm', await visible('#scr-parent'));
  check('dier staat in het ouderscherm', /Eenhoorn · Sterretje/.test(await text('#parent-species')), await text('#parent-species'));
  await page.click('#btn-log-show');
  const logText = await page.inputValue('#log-text');
  check('log bevat speeltijd en aaien', logText.includes('speeltijd begint') && logText.includes('naar school'));
  check('log zonder fouten', /0 fout\(en\)/.test(logText), logText.split('\n').filter((l) => /Samenvatting/.test(l))[0]);
  await page.check('#pe-120');
  await page.check('#pm-60');
  await page.check('#dur-60');
  s = await state();
  check('speeltijd en poetstijd ingesteld', s.settings.playEvening === 120 && s.settings.playMorning === 60 && s.settings.duration === 60, JSON.stringify(s.settings));
  await page.click('#btn-parent-gift');
  await shot('15-ouders');
  await page.click('#btn-parent-back');
  check('cadeau van ouders wacht tot na het poetsen', !(await visible('#btn-pending')));

  // ---------- maandagavond: stoppen halverwege, dan echt poetsen ----------
  await page.clock.fastForward(11 * HOUR);   // maandag ~18:40
  await page.reload();
  await page.waitForSelector('#home-art');
  await page.click('#btn-brush');
  await tick(3500);
  await tick(12000);
  await page.click('#btn-stop');
  check('stopvraag verschijnt', await visible('#brush-sheet') && /stoppen/i.test(await text('#sheet-title')));
  await page.click('#btn-quit');
  s = await state();
  check('gestopte beurt telt niet', !s.sessions[s.sessions.length - 1].completed && (await life()) === 'wait');
  await brushFull(60);
  s = await state();
  check('volle beurt: eerst poets-cadeau, dan dat van ouders', s.giftQueue.map((g) => g.reason).join(',') === 'poetsbeurt,ouders', JSON.stringify(s.giftQueue));
  await page.click('#btn-gift', { force: true });
  await tick(1000);
  await page.click('#btn-reward-done');
  check('ouder-cadeau via de gele knop', await visible('#btn-pending'));
  await page.click('#btn-pending', { force: true });
  check('cadeau van ouders', /ouders/.test(await text('#reward-title')));
  await page.click('#btn-gift', { force: true });
  await tick(1000);
  await page.click('#btn-reward-done');

  // ---------- reeks-bonus (3 dagen op rij) ----------
  await page.clock.fastForward(24 * HOUR);   // dinsdagavond
  await page.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k));
    const key = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return key(d); };
    const mk = (dk, part) => ({ at: dk + (part === 'ochtend' ? 'T07:30:00.000Z' : 'T18:30:00.000Z'), day: dk, part, seconds: 120, target: 120, completed: true });
    st.sessions = [mk(day(2), 'ochtend'), mk(day(2), 'avond'), mk(day(1), 'ochtend'), mk(day(1), 'avond'), mk(day(0), 'ochtend')];
    st.play = null; st.giftQueue = [];
    localStorage.setItem(k, JSON.stringify(st));
  }, KEY);
  await page.reload();
  await page.waitForSelector('#home-art');
  const now6 = await page.evaluate(() => new Date().toString().slice(0, 21));
  await brushFull(60);
  s = await state();
  check('reeks van 3 dagen geeft extra cadeau', s.giftQueue.length === 2 && s.giftQueue[1].reason === 'reeks', JSON.stringify(s.giftQueue) + ' @ ' + now6);
  await page.click('#btn-gift', { force: true });
  await tick(1000);
  if (await visible('#btn-next-gift')) {
    await page.click('#btn-next-gift');
    check('bonus-titel', /dagen op rij/.test(await text('#reward-title')), await text('#reward-title'));
    await page.click('#btn-gift', { force: true });
    await tick(1000);
    check('bonus is minstens zeldzaam', /zeldzaam/i.test(await text('#reveal-rarity')), await text('#reveal-rarity'));
  }
  await page.click('#btn-reward-done');

  // ---------- ander ei ----------
  await answer(true);
  await page.click('#btn-new-egg');
  await page.click('#btn-new-egg');
  check('ander ei kiezen opent de eieren', await visible('#scr-egg'));
  await page.click('[data-species="dino"]');
  await page.click('#btn-egg-ok');
  s = await state();
  check('dino-ei, spullen bewaard', s.species === 'dino' && !s.hatched && s.owned.length > 5, s.owned.length + ' spullen');

  // ---------- donker thema ----------
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await page.waitForSelector('#home-art');
  await page.clock.runFor(500);
  await shot('16-donker');
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('donker thema actief', bodyBg === 'rgb(6, 38, 58)', bodyBg);

  // ---------- smal scherm ----------
  await page.setViewportSize({ width: 360, height: 640 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload();
  await page.waitForSelector('#home-art');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('geen horizontale scroll op 360 px', !overflow);
  const btnBottom = await page.evaluate(() => document.querySelector('#btn-wardrobe').getBoundingClientRect().bottom);
  check('knoppen passen op klein scherm (640 px)', btnBottom <= 640, Math.round(btnBottom) + 'px');
  await page.click('#btn-brush');
  await tick(3500);
  const chartBottom = await page.evaluate(() => document.querySelector('.chart').getBoundingClientRect().bottom);
  check('mondkaart past op klein scherm', chartBottom <= 640, Math.round(chartBottom) + 'px');
  await shot('17-klein-poetsen');

  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.clock.runFor(2000);
  await new Promise((r) => setTimeout(r, 500));
} catch (e) {
  check('test liep door zonder crash', false, e.stack || e.message);
} finally {
  if (browser) await browser.close();
}

const realErrors = consoleErrors.filter((t) => !/fonts\.(googleapis|gstatic)|net::ERR_|Failed to load resource/.test(t));
check('geen JavaScript-fouten op de pagina', pageErrors.length === 0, pageErrors.join(' | '));
check('geen foutmeldingen in de console', realErrors.length === 0, realErrors.join(' | '));
if (consoleErrors.length !== realErrors.length) log(`     (genegeerd: ${consoleErrors.length - realErrors.length} netwerkmelding(en), bv. lettertypes zonder internet)`);

const runLog = join(ROOT, 'logs', 'last-run.log');
const runText = existsSync(runLog) ? await readFile(runLog, 'utf8') : '';
check('server schreef log van de laatste app-run naar logs/last-run.log', runText.includes('POETSBEESTJE') && runText.includes('app gestart') && runText.includes('serverlog actief'));

server.kill('SIGTERM');
await new Promise((r) => setTimeout(r, 300));

const summary = fails ? `${fails} FOUT(EN)` : 'ALLES OK';
const report = [
  'POETSBEESTJE — LOG VAN DE LAATSTE TEST',
  'Gedraaid ' + new Date().toLocaleString('nl-NL') + ' · Node ' + process.version,
  '----',
  ...lines,
  '----',
  'Resultaat: ' + summary
].join('\n') + '\n';
await writeFile(join(ROOT, 'logs', 'last-test.log'), report);
if (process.env.PB_DATED_LOG) await writeFile(join(ROOT, 'logs', process.env.PB_DATED_LOG), report);
console.log('\nResultaat: ' + summary + '  (zie logs/last-test.log)');
process.exit(fails ? 1 : 0);
