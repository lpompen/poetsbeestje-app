# Poetsbeestje

Poets-app voor kinderen, geïnspireerd op de Philips Sonicare For Kids-app. Je kind poetst twee minuten samen met een eigen beestje (standaard heet het **Bubbel**). De tijd is verdeeld in vier stukken van 30 seconden: boven links, boven rechts, onder rechts, onder links. Bij elk stuk verdwijnen de vlekjes van de tanden van het beestje. Na een volledige beurt krijgt je kind een cadeautje: iets nieuws om het beestje mee aan te kleden.

Het beestje, de kleding en de werelden zijn eigen tekeningen. Er zitten geen Philips-figuren of -logo's in.

## Wat zit erin

- **Poetstimer** met aftellen, vier kwadranten, geluidje en trilling bij elke wissel, pauze en stopknop. Het scherm blijft aan tijdens het poetsen (waar de telefoon dat toestaat).
- **Cadeautje na elke volledige beurt.** Het eerste cadeau is altijd iets voor op het hoofd, zodat je kind meteen verschil ziet.
- **Reeks-bonus:** 3 dagen op rij ochtend én avond gepoetst (en daarna elke 7 dagen) geeft een extra, zeldzaam cadeau.
- **Kledingkast** met 50 spullen in 7 vakjes: hoofd, ogen, versiering, in de hand, voeten, kleur en wereld. Wat je nog niet hebt, zie je als silhouet.
- **Zeldzaamheid:** gewoon, zeldzaam en super zeldzaam. Zeldzame spullen komen vanaf beurt 3, super zeldzame vanaf beurt 8.
- **Ouderscherm** achter een rekensom: overzicht van 14 dagen, namen, poetstijd (1, 2 of 3 minuten), geluid en trillen aan/uit, zelf een cadeautje klaarzetten, log bekijken en alles wissen.
- **Werkt offline** en is als app op het beginscherm te zetten (PWA).
- **Licht en donker thema**, volgt de instelling van de telefoon.

Alles wordt op het toestel zelf bewaard (localStorage). Er gaat niets naar een server, behalve de log als je de app zelf met `npm start` draait.

## Bestanden

| Bestand | Wat |
| --- | --- |
| `index.html` | Alle schermen |
| `app.js` | Spelregels, timer, schermen, opslag en log |
| `styles.css` | Vormgeving |
| `data/items.js` | Tekeningen van het beestje, de 50 spullen en de werelden |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline werken en installeren op het beginscherm |
| `server.js` | Kleine webserver voor lokaal draaien en Render, schrijft de logs |
| `render.yaml` | Instellingen voor Render |
| `.github/workflows/pages.yml` | Automatisch publiceren op GitHub Pages |
| `scripts/smoke-test.mjs` | Speelt de hele app automatisch door en schrijft `logs/last-test.log` |
| `scripts/build-preview.mjs` | Maakt één los HTML-bestand in `preview/` |
| `logs/` | Logs van de laatste run, test en server, plus status en overdracht |

## Lokaal draaien

```bash
npm start
```

Open daarna http://localhost:3000. Een andere poort: `PORT=3001 npm start` (Windows PowerShell: `$env:PORT=3001; npm start`).

## Logs

Elke run van de app maakt een log, zodat je kunt zien wat er misgaat.

- **In de app:** tandwiel → rekensom → *Log van de laatste run* → *Kopieer log*. Plak hem in de chat met Claude en zeg `log`.
- **Via `npm start`:** de app stuurt zijn log ook naar de server.
  - `logs/last-run.log` – de laatste app-run
  - `logs/previous-run.log` – de run daarvoor
  - `logs/server.log` – de laatste run van de server zelf
- **Test:** `npm test` schrijft `logs/last-test.log`.
- **In de browserconsole:** `Poetsbeestje.log()`.

## Testen

```bash
npm install
npx playwright install chromium
npm test
```

De test speelt in een paar seconden alles door: een volledige poetsbeurt, cadeautje openen en aantrekken, de kledingkast, het ouderscherm (goed en fout antwoord), stoppen halverwege, de reeks-bonus, donker thema en een klein scherm. Screenshots komen in `test-output/`.

## Spullen toevoegen

Open `data/items.js` en voeg een item toe aan het juiste lijstje, bijvoorbeeld:

```js
{ id: 'h-zonnehoed', name: 'Zonnehoed', rarity: 'gewoon', front: '<ellipse cx="150" cy="100" rx="80" ry="14" fill="#FFD84D"/>' }
```

Het tekenvlak is 300 × 340. Ogen staan op (118,165) en (182,165), de hand op (268,190), de voeten op y 308. Verhoog daarna `CACHE` in `sw.js`, anders zien telefoons de oude versie nog even.

Publiceren: zie [GITHUB-DEPLOY.md](GITHUB-DEPLOY.md).
