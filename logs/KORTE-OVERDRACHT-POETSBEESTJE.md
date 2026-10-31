# Korte overdracht Poetsbeestje

- **Wat:** poets-app voor kinderen. Ei kiezen → komt uit na de eerste beurt. Na elke eerste volledige beurt per dagdeel een cadeautje om het dier aan te kleden, daarna kort spelen (aaien, aankleden), dan slapen of naar school.
- **Live:** https://lpompen.github.io/poetsbeestje-app/ · repo `lpompen/poetsbeestje-app` · elke push naar `main` publiceert via GitHub Actions.
- **Opbouw:** zoals de WK-poule: `index.html` + `app.js` + `styles.css`, tekeningen in `data/items.js` en `data/species.js`, `server.js` + `render.yaml`, logs in `logs/`, scripts in `scripts/`, workflow in `.github/workflows/`.
- **Geen pakketten nodig** om te draaien (`npm start`). Playwright alleen voor `npm test`.
- **Opslag:** `localStorage`, sleutel `poetsbeestje.v1` (schema versie 2). Logs: `poetsbeestje.log.last` en `poetsbeestje.log.prev`.
- **Spelregels** staan in `app.js` onder "SPELREGELS" (`lifeState`, `startPlay`, `pickItem`, `streak`, `finishBrush`). Aaien zit in `Pet`, tanden-animatie in `chartSVG`/`updateBrush`.
- **Bij problemen:** vraag om de log (ouderscherm → Kopieer log) of, bij `npm start`, lees `logs/last-run.log`, `logs/previous-run.log` en `logs/server.log`. In de browserconsole: `Poetsbeestje.log()` en `Poetsbeestje.state()`.
- **Na wijzigingen:** `CACHE` in `sw.js` en `VERSION` in `app.js` ophogen, `npm test` draaien.
