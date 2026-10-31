# Poetsbeestje

Poets-app voor kinderen, geïnspireerd op de Philips Sonicare For Kids-app. Je kind kiest een ei, en na de eerste keer poetsen komt daar een eigen dier uit. Daarna poetst het elke ochtend en avond twee minuten mee. Wie de hele tijd poetst, krijgt een cadeautje om het dier aan te kleden, en mag daarna nog even met het dier spelen.

**Live:** https://lpompen.github.io/poetsbeestje-app/

Het beestje, de kleding en de werelden zijn eigen tekeningen. Er zitten geen Philips-figuren of -logo's in.

## Wat zit erin

- **Een ei kiezen:** eenhoorn, dino, pluisbol, poesje, konijntje of monstertje. Het ei krijgt barstjes tijdens de eerste poetsbeurt; daarna tikt je kind het open.
- **Poetstimer** met aftellen, pauze en stopknop. Een grote mond met 16 tanden laat zien welke tand nu aan de beurt is: de tandenborstel schrobt er met schuim overheen en de tand wordt van geel glinsterend wit. Vier stukken: boven links, boven rechts, onder rechts, onder links, met een geluidje en trilling bij elke wissel. Het scherm blijft aan tijdens het poetsen (waar de telefoon dat toestaat).
- **Eerst poetsen, dan spelen.** Aankleden, cadeautjes openen en spelen kan alleen na het poetsen.
- **Speeltijd:** 's avonds 1 minuut, dan gaapt het dier en valt het in slaap. Op schooldagen 's ochtends 30 seconden, dan gaat het met een rugzak naar school (terug om 14:00). In het weekend geldt de avondtijd en gaat het buiten spelen. Ouders kunnen de tijden aanpassen.
- **Aaien met je vinger:** omlaag aaien = knuffelen (hartjes), heen en weer kriebelen = kietelen (hihi), omhoog aaien (tegen de haren in) of te lang kietelen = boos (stoomwolkjes). Even tikken = boing. De oogjes volgen je vinger.
- **Cadeautje na de eerste volledige beurt van elk dagdeel.** Het eerste avondcadeau is altijd de sterrenpyjama.
- **Reeks-bonus:** 3 dagen op rij ochtend én avond gepoetst (en daarna elke 7 dagen) geeft een extra, zeldzaam cadeau.
- **Kledingkast** met 60 spullen in 8 vakjes: hoofd, kleding (o.a. 4 pyjama's), ogen, versiering, in de hand, voeten, kleur en wereld. Wat je nog niet hebt, zie je als silhouet.
- **Zeldzaamheid:** gewoon, zeldzaam en super zeldzaam. Zeldzame spullen komen vanaf beurt 3, super zeldzame vanaf beurt 8.
- **Ouderscherm** achter een rekensom: overzicht van 14 dagen, ander ei kiezen, namen, poetstijd (1, 2 of 3 minuten), speeltijd, geluid en trillen aan/uit, zelf een cadeautje klaarzetten, log bekijken en alles wissen.
- **Werkt offline** en is als app op het beginscherm te zetten (PWA).
- **Licht en donker thema**, volgt de instelling van de telefoon.

Alles wordt op het toestel zelf bewaard (localStorage). Er gaat niets naar een server, behalve de log als je de app zelf met `npm start` draait.

## Bestanden

| Bestand | Wat |
| --- | --- |
| `index.html` | Alle schermen |
| `app.js` | Spelregels, timer, schermen, opslag en log |
| `styles.css` | Vormgeving |
| `data/items.js` | Tekeningen van het lijf, de 60 spullen en de werelden |
| `data/species.js` | De zes dieren en hun eieren |
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

De test speelt in een paar seconden een hele week na: ei kiezen, de eerste poetsbeurt met de tanden-animatie, het ei openen, de pyjama, kietelen/knuffelen/boos maken, de kledingkast, gapen en slapen, weekend en schooldag, het ouderscherm, stoppen halverwege, de reeks-bonus, donker thema en een klein scherm (75 controles). Screenshots komen in `test-output/`.

## Spullen toevoegen

Open `data/items.js` en voeg een item toe aan het juiste lijstje, bijvoorbeeld:

```js
{ id: 'h-zonnehoed', name: 'Zonnehoed', rarity: 'gewoon', front: '<ellipse cx="150" cy="100" rx="80" ry="14" fill="#FFD84D"/>' }
```

Het tekenvlak is 300 × 340. Ogen staan op (118,165) en (182,165), de hand op (268,190), de voeten op y 308. Kleding (`kleding`) gebruikt `torso` (wordt binnen het lijf geknipt, onder de hals), `sleeve` (mouwkleur) en `front`. Een nieuw dier voeg je toe in `data/species.js`. Verhoog daarna `CACHE` in `sw.js`, anders zien telefoons de oude versie nog even.

Publiceren: zie [GITHUB-DEPLOY.md](GITHUB-DEPLOY.md).
