# Poetsbeestje op GitHub zetten

Er zijn twee manieren om de app online te zetten. Kies er één.

## 1. GitHub Pages (aangeraden, gratis en zonder server)

De app werkt volledig op de telefoon zelf, dus een server is niet nodig.

1. Maak op GitHub een nieuwe repository, bijvoorbeeld `poetsbeestje-app`.
2. Zet de bestanden erin:
   ```bash
   cd poetsbeestje-app
   git init
   git add .
   git commit -m "Poetsbeestje: eerste versie"
   git branch -M main
   git remote add origin https://github.com/<jouw-naam>/poetsbeestje-app.git
   git push -u origin main
   ```
3. Ga op GitHub naar **Settings → Pages** en kies bij *Source* **GitHub Actions**.
4. De workflow *Publiceer op GitHub Pages* draait vanzelf (tabblad **Actions**). Na een minuut staat de app op `https://<jouw-naam>.github.io/poetsbeestje-app/`.

Bij elke `git push` naar `main` wordt de app opnieuw gepubliceerd.

Let op: op GitHub Pages is er geen server, dus de log komt niet in `logs/last-run.log`. Gebruik dan de knop **Kopieer log** in het ouderscherm.

## 2. Render (net als de WK-poule)

Hiermee draait ook `server.js`, dus de server houdt de logs bij.

1. Zet de code op GitHub (stap 1 en 2 hierboven).
2. Ga op render.com naar **New → Blueprint** en kies de repository. Render leest `render.yaml`.
3. Na het bouwen staat de app op `https://poetsbeestje.onrender.com` (of de naam die Render kiest).

Het gratis Render-plan valt na een tijdje stil in slaap; de eerste keer openen duurt dan even. De logbestanden op Render verdwijnen bij een herstart.

## Nieuwe versie uitbrengen

1. Pas de bestanden aan.
2. Verhoog `CACHE` in `sw.js` (bijvoorbeeld `poetsbeestje-1.0.1`) en `version` in `package.json` en `VERSION` in `app.js`.
3. `npm test` en kijk of `logs/last-test.log` eindigt met *ALLES OK*.
4. `git commit` en `git push`.
