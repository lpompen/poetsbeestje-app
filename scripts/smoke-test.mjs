// Poetsbeestje — scripts/smoke-test.mjs
// Speelt de app één keer helemaal door in een echte (onzichtbare) browser:
// poetsen, cadeautje openen, aankleden, kledingkast, ouderscherm, stoppen,
// reeks-bonus en donker thema. De klok wordt versneld, dus het duurt seconden.
//
// Gebruik:  npm install   (eenmalig, haalt Playwright op)
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
  const visible = (sel) => page.isVisible(sel);

  await page.clock.install({ time: new Date('2026-10-31T19:30:00+01:00') });
  await page.goto(BASE);
  await page.waitForSelector('#home-art svg');
  await page.clock.fastForward(1000);
  check('beginscherm toont het beestje', await visible('#home-art svg'));
  check('naam staat bovenaan', (await page.textContent('#home-name')) === 'Bubbel');
  check('tekstballon heeft tekst', ((await page.textContent('#home-say')) || '').length > 5, await page.textContent('#home-say'));
  await shot('01-beginscherm');

  // ---------- een volledige poetsbeurt ----------
  await page.click('#btn-brush');
  check('aftellen verschijnt', await visible('#countdown'));
  await page.clock.fastForward(4000);
  await page.clock.runFor(100);
  check('aftellen weg, poetsen loopt', !(await visible('#countdown')) && (await page.getAttribute('#scr-brush', 'class')).includes('is-brushing'));
  await page.clock.fastForward(40000);
  await page.clock.runFor(100);
  const active = await page.textContent('#brush-quads .quad.is-active');
  check('na 40 s is "Boven rechts" aan de beurt', /Boven rechts/.test(active || ''), active);
  const q0 = await page.evaluate(() => Array.from(document.querySelectorAll('#brush-art [data-q="0"]')).map((e) => Number(e.getAttribute('opacity'))));
  const q2 = await page.evaluate(() => Array.from(document.querySelectorAll('#brush-art [data-q="2"]')).map((e) => Number(e.getAttribute('opacity'))));
  check('vlekjes boven links zijn weg', q0.length > 0 && q0.every((v) => v === 0), q0.join(','));
  check('vlekjes onder rechts zitten er nog', q2.length > 0 && q2.every((v) => v === 1), q2.join(','));
  check('timer loopt af', /1:(1|2)\d/.test(await page.textContent('#brush-timer')), await page.textContent('#brush-timer'));
  await shot('02-poetsen');
  await page.clock.fastForward(82000);
  await page.clock.runFor(200);
  check('na 2 minuten: cadeauscherm', await visible('#scr-reward'));
  let s = await state();
  check('beurt opgeslagen als afgemaakt', s.sessions.length === 1 && s.sessions[0].completed && s.sessions[0].part === 'avond', JSON.stringify(s.sessions[0]));
  check('1 cadeautje klaar', s.giftQueue.length === 1);
  await shot('03-cadeau-dicht');

  await page.click('#btn-gift', { force: true });
  await page.clock.fastForward(1000);
  await page.clock.runFor(100);
  check('cadeautje open, item zichtbaar', await visible('#reveal'));
  const itemName = await page.textContent('#reveal-name');
  s = await state();
  const newId = s.owned[s.owned.length - 1];
  check('eerste cadeau is iets voor op het hoofd', newId.startsWith('h-'), newId + ' (' + itemName + ')');
  await shot('04-cadeau-open');
  await page.click('#btn-wear');
  s = await state();
  check('item meteen aangetrokken', s.outfit.hoofd === newId);
  check('terug op beginscherm met nieuwe tekst', /nieuwe/.test(await page.textContent('#home-say')), await page.textContent('#home-say'));
  check('avond-chip staat op klaar', (await page.getAttribute('#home-today .chip:nth-child(2)', 'class')).includes('chip--done'));
  await shot('05-beginscherm-met-item');

  // ---------- kledingkast ----------
  await page.click('#btn-wardrobe');
  check('kledingkast open', await visible('#scr-wardrobe'));
  const locked = await page.$$eval('#wardrobe-grid .item.is-locked', (els) => els.length);
  const onItem = await page.$$eval('#wardrobe-grid .item.is-on', (els) => els.map((e) => e.dataset.item));
  check('hoofd-tab: gekozen item gemarkeerd', onItem[0] === newId, onItem.join(','));
  check('hoofd-tab: andere items op slot', locked === 9, String(locked));
  await shot('06-kledingkast');
  await page.click(`#wardrobe-grid [data-item="${newId}"]`);
  s = await state();
  check('nog eens tikken doet het uit', s.outfit.hoofd === null);
  await page.click(`#wardrobe-grid [data-item="${newId}"]`);
  s = await state();
  check('en weer aan', s.outfit.hoofd === newId);
  await page.click('#wardrobe-tabs [data-slot="kleur"]');
  await page.click('#wardrobe-grid [data-item="k-roze"]');
  check('op slot getikt geeft melding', await visible('#toast'), await page.textContent('#toast'));
  await page.click('#wardrobe-grid [data-item="k-mint"]');
  s = await state();
  check('kleur blijft aan (kan niet uit)', s.outfit.kleur === 'k-mint');
  await page.click('#wardrobe-tabs [data-slot="achtergrond"]');
  await shot('07-kledingkast-werelden');
  await page.click('#btn-wardrobe-back');

  // ---------- ouders ----------
  const answer = async (correct) => {
    await page.click('#btn-parent');
    const q = await page.textContent('#gate-q');
    const [, a, b] = q.match(/(\d+) × (\d+)/);
    const good = Number(a) * Number(b);
    const vals = await page.$$eval('#gate-answers [data-answer]', (els) => els.map((e) => Number(e.dataset.answer)));
    const pick = correct ? good : vals.find((v) => v !== good);
    await page.click(`#gate-answers [data-answer="${pick}"]`);
  };
  await answer(false);
  check('fout antwoord: terug naar beginscherm', await visible('#scr-home') && !(await visible('#gate')));
  await answer(true);
  check('goed antwoord: ouderscherm', await visible('#scr-parent'));
  check('overzicht telt 1 beurt', /1/.test(await page.textContent('#parent-stats .stat b')));
  await shot('08-ouders');
  await page.click('#btn-log-show');
  const logText = await page.inputValue('#log-text');
  check('log in de app bevat de poetsbeurt', logText.includes('poetsbeurt klaar') && logText.includes('cadeautje geopend'));
  check('log zonder fouten', /0 fout\(en\)/.test(logText), logText.split('\n').pop());
  await page.check('#dur-60');
  s = await state();
  check('poetstijd op 1 minuut gezet', s.settings.duration === 60);
  await page.fill('#in-creature', 'Pluis');
  await page.press('#in-creature', 'Enter');
  await page.click('#btn-parent-gift');
  await page.click('#btn-parent-back');
  check('nieuwe naam op beginscherm', (await page.textContent('#home-name')) === 'Pluis');
  check('cadeau-melding op beginscherm', await visible('#btn-pending'));
  await page.click('#btn-pending', { force: true });
  check('cadeau van ouders', /ouders/.test(await page.textContent('#reward-title')));
  await page.click('#btn-gift', { force: true });
  await page.clock.fastForward(1000);
  await page.click('#btn-reward-done');

  // ---------- stoppen halverwege ----------
  await page.click('#btn-brush');
  await page.clock.fastForward(4000);
  await page.clock.fastForward(12000);
  await page.click('#btn-stop');
  check('stopvraag verschijnt', await visible('#brush-sheet') && /stoppen/i.test(await page.textContent('#sheet-title')));
  await page.click('#btn-quit');
  s = await state();
  const last = s.sessions[s.sessions.length - 1];
  check('gestopte beurt telt niet als afgemaakt', !last.completed && s.giftQueue.length === 0, JSON.stringify(last));
  check('terug op beginscherm', await visible('#scr-home'));

  // ---------- reeks-bonus (3 dagen op rij) ----------
  await page.evaluate((k) => {
    const st = JSON.parse(localStorage.getItem(k));
    const mk = (day, part) => ({ at: day + (part === 'ochtend' ? 'T07:30:00.000Z' : 'T18:30:00.000Z'), day, part, seconds: 120, target: 120, completed: true });
    st.sessions = [mk('2026-10-29', 'ochtend'), mk('2026-10-29', 'avond'), mk('2026-10-30', 'ochtend'), mk('2026-10-30', 'avond'), mk('2026-10-31', 'ochtend')];
    localStorage.setItem(k, JSON.stringify(st));
  }, KEY);
  await page.reload();
  await page.waitForSelector('#home-art svg');
  await page.click('#btn-brush');
  await page.clock.fastForward(4000);
  await page.clock.fastForward(61000);
  await page.clock.runFor(200);
  s = await state();
  check('reeks van 3 dagen geeft extra cadeau', s.giftQueue.length === 2 && s.giftQueue[1].reason === 'reeks', JSON.stringify(s.giftQueue));
  await page.click('#btn-gift', { force: true });
  await page.clock.fastForward(1000);
  check('knop "Volgende cadeautje" zichtbaar', await visible('#btn-next-gift'));
  await page.click('#btn-next-gift');
  check('bonus-titel', /dagen op rij/.test(await page.textContent('#reward-title')), await page.textContent('#reward-title'));
  await page.click('#btn-gift', { force: true });
  await page.clock.fastForward(1000);
  const rar = await page.textContent('#reveal-rarity');
  check('bonus is minstens zeldzaam', /zeldzaam/i.test(rar), rar);
  await shot('09-bonus-cadeau');
  await page.click('#btn-reward-done');

  // ---------- donker thema ----------
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await page.waitForSelector('#home-art svg');
  await page.clock.fastForward(500);
  await shot('10-donker');
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('donker thema actief', bodyBg === 'rgb(6, 38, 58)', bodyBg);

  // ---------- smal scherm ----------
  await page.setViewportSize({ width: 360, height: 640 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload();
  await page.waitForSelector('#home-art svg');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('geen horizontale scroll op 360 px', !overflow);
  const btnBottom = await page.evaluate(() => document.querySelector('#btn-wardrobe').getBoundingClientRect().bottom);
  check('knoppen passen op klein scherm (640 px)', btnBottom <= 640, Math.round(btnBottom) + 'px');
  await shot('11-klein-scherm');

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
