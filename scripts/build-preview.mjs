// Poetsbeestje — scripts/build-preview.mjs
// Maakt één los HTML-bestand (preview/poetsbeestje.html) met alle CSS en JS erin,
// handig om de app als losse pagina te delen of te bekijken zonder server.
// Gebruik: npm run preview
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(ROOT, 'preview', 'poetsbeestje.html');

const html = await readFile(join(ROOT, 'index.html'), 'utf8');
const css = await readFile(join(ROOT, 'styles.css'), 'utf8');
const items = await readFile(join(ROOT, 'data', 'items.js'), 'utf8');
const species = await readFile(join(ROOT, 'data', 'species.js'), 'utf8');
const app = await readFile(join(ROOT, 'app.js'), 'utf8');

const body = html.split('<!-- BODY-START -->')[1]?.split('<!-- BODY-END -->')[0];
if (!body) throw new Error('index.html mist de BODY-START / BODY-END markeringen');
for (const [name, src] of [['items.js', items], ['species.js', species], ['app.js', app]]) {
  if (/<\/script/i.test(src)) throw new Error(name + ' bevat "</script>" en kan niet inline');
}
const fonts = html.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]+)">/)?.[1];

const page = [
  '<title>Poetsbeestje</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  fonts ? `<link rel="stylesheet" href="${fonts}">` : '',
  `<style>\n${css}\n</style>`,
  body.trim(),
  '<script>window.PB_PREVIEW = true;</script>',
  `<script>\n${items}\n</script>`,
  `<script>\n${species}\n</script>`,
  `<script>\n${app}\n</script>`
].join('\n');

await mkdir(dirname(out), { recursive: true });
await writeFile(out, page);
console.log('Preview gemaakt: ' + out + ' (' + Math.round(page.length / 1024) + ' kB)');
