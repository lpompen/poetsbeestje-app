/* Poetsbeestje — server.js
   Kleine webserver zonder extra pakketten. Doet drie dingen:
   1. de app serveren (lokaal met `npm start`, of op Render via render.yaml)
   2. /api/health  → laat de app weten dat er een server is
   3. /api/log     → schrijft de log van de laatste app-run naar logs/last-run.log
                     (de run daarvoor staat in logs/previous-run.log)
   De server houdt zelf ook een log bij van zijn laatste run: logs/server.log
*/
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const LOG_DIR = path.join(ROOT, 'logs');
const SERVER_LOG = path.join(LOG_DIR, 'server.log');
const RUN_LOG = path.join(LOG_DIR, 'last-run.log');
const PREV_LOG = path.join(LOG_DIR, 'previous-run.log');

fs.mkdirSync(LOG_DIR, { recursive: true });
fs.writeFileSync(SERVER_LOG,
  'POETSBEESTJE SERVER — LOG VAN DE LAATSTE RUN\n' +
  'Gestart ' + new Date().toISOString() + ' · Node ' + process.version + ' · poort ' + PORT + ' · versie ' + pkg.version + '\n----\n');

function slog(level, msg) {
  const line = new Date().toISOString() + ' ' + level.padEnd(5) + ' ' + msg;
  try { fs.appendFileSync(SERVER_LOG, line + '\n'); } catch (e) { /* schijf vol of read-only */ }
  (level === 'ERROR' ? console.error : console.log)(line);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};
// deze mappen en bestanden zijn niet voor bezoekers
const BLOCKED = ['/logs', '/.git', '/.github', '/node_modules', '/scripts', '/test-output', '/preview', '/server.js', '/render.yaml', '/package.json', '/package-lock.json'];

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

let lastRunId = null;

const server = http.createServer(function (req, res) {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); res.end(); return; }
  const p = decodeURIComponent(url.pathname);

  if (p === '/api/health') return json(res, 200, { ok: true, app: 'poetsbeestje', version: pkg.version });

  if (p === '/api/log') {
    if (req.method !== 'POST') return json(res, 405, { ok: false });
    let body = '';
    req.on('data', function (chunk) {
      body += chunk;
      if (body.length > 1024 * 1024) { slog('WARN', 'log te groot, afgewezen'); req.destroy(); }
    });
    req.on('end', function () {
      try {
        const data = JSON.parse(body);
        if (typeof data.text !== 'string') throw new Error('veld "text" ontbreekt');
        if (data.runId !== lastRunId && fs.existsSync(RUN_LOG)) {
          // nieuwe run: de vorige bewaren als previous-run.log
          try { fs.renameSync(RUN_LOG, PREV_LOG); } catch (e) { slog('WARN', 'vorige log bewaren mislukt: ' + e.message); }
        }
        fs.writeFileSync(RUN_LOG, data.text + '\n');
        if (data.runId !== lastRunId) {
          lastRunId = data.runId;
          slog('INFO', 'app-log ontvangen van run ' + data.runId + ' → logs/last-run.log');
        }
        json(res, 200, { ok: true });
      } catch (e) {
        slog('WARN', 'ongeldige app-log: ' + e.message);
        json(res, 400, { ok: false, error: e.message });
      }
    });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { ok: false });

  let rel = p.endsWith('/') ? p + 'index.html' : p;
  if (BLOCKED.some(function (b) { return rel === b || rel.startsWith(b + '/'); })) {
    res.writeHead(404); res.end('Niet gevonden'); return;
  }
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }

  fs.stat(file, function (err, st) {
    if (err || !st.isFile()) {
      slog('WARN', '404 ' + rel);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Niet gevonden');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const fresh = ext === '.html' || rel === '/sw.js' || ext === '.webmanifest';
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': fresh ? 'no-cache' : 'public, max-age=300'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

server.on('error', function (e) {
  slog('ERROR', 'server kon niet starten: ' + e.message + (e.code === 'EADDRINUSE' ? ' (poort ' + PORT + ' is bezet, probeer PORT=3001 npm start)' : ''));
  process.exit(1);
});
process.on('uncaughtException', function (e) { slog('ERROR', 'onverwachte fout: ' + (e && e.stack || e)); });
process.on('SIGINT', function () { slog('INFO', 'server gestopt (Ctrl+C)'); process.exit(0); });
process.on('SIGTERM', function () { slog('INFO', 'server gestopt'); process.exit(0); });

server.listen(PORT, function () {
  slog('INFO', 'Poetsbeestje draait op http://localhost:' + PORT);
});
