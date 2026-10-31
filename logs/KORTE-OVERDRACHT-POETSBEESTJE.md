# Korte overdracht Poetsbeestje

- **Wat:** poets-app voor kinderen; na elke volledige poetsbeurt een cadeautje om het beestje aan te kleden.
- **Opbouw:** zoals de WK-poule: `index.html` + `app.js` + `styles.css`, data in `data/`, `server.js` + `render.yaml`, logs in `logs/`, scripts in `scripts/`, workflow in `.github/workflows/`.
- **Geen pakketten nodig** om te draaien (`npm start`). Playwright alleen voor `npm test`.
- **Opslag:** `localStorage`, sleutel `poetsbeestje.v1`. Logs: `poetsbeestje.log.last` en `poetsbeestje.log.prev`.
- **Spelregels** staan in `app.js` onder "SPELREGELS" (`pickItem`, `streak`, `finishBrush`).
- **Tekeningen** staan allemaal in `data/items.js`; het tekenvlak is 300 × 340.
- **Bij problemen:** vraag om de log (ouderscherm → Kopieer log) of lees `logs/last-run.log`, `logs/previous-run.log` en `logs/server.log`.
- **Na wijzigingen:** `CACHE` in `sw.js` ophogen en `npm test` draaien.
