/* Poetsbeestje — app.js
   Alle schermen: thuis, poetsen, cadeautje, kledingkast en ouders.
   Het spel wordt lokaal bewaard (localStorage). Elke run schrijft een log:
   - altijd in de browser (ouders > "Log van de laatste run")
   - en, als de app via `npm start` draait, ook naar logs/last-run.log
*/
(function () {
  'use strict';

  const VERSION = '1.0.1';
  const PREVIEW = !!window.PB_PREVIEW;
  const ART = window.PB_ART;
  const ITEMS = window.PB_ITEMS || [];
  const SLOTS = window.PB_SLOTS || [];
  const ITEM = {};
  ITEMS.forEach(function (i) { ITEM[i.id] = i; });
  const SLOT = {};
  SLOTS.forEach(function (s) { SLOT[s.id] = s; });
  const START_IDS = ITEMS.filter(function (i) { return i.start; }).map(function (i) { return i.id; });

  const RARITY = {
    gewoon: { label: 'Gewoon', order: 0, weight: 65 },
    zeldzaam: { label: 'Zeldzaam', order: 1, weight: 28 },
    super: { label: 'Super zeldzaam', order: 2, weight: 7 }
  };
  const QUADS = ['Boven links', 'Boven rechts', 'Onder rechts', 'Onder links'];
  const TIPS = [
    'Kleine rondjes maken!',
    'Ook de achterste tanden!',
    'Goed zo, ga zo door!',
    'Rustig poetsen, niet te hard.',
    'Je beestje glimt al!',
    'Langs het tandvlees poetsen.',
    'Hou vol, je doet het super!',
    'Ook de binnenkant van je tanden.'
  ];

  /* ---------- hulpjes ---------- */
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pad(x) { return String(x).padStart(2, '0'); }
  function reduceMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function partOf(d) { return d.getHours() < 14 ? 'ochtend' : 'avond'; }
  function fmtTime(sec) { const s = Math.max(0, Math.ceil(sec)); return Math.floor(s / 60) + ':' + pad(s % 60); }

  /* =========================================================
     LOG — één log per run. Vorige run blijft ook bewaard.
     ========================================================= */
  const Log = (function () {
    const KEY_LAST = 'poetsbeestje.log.last';
    const KEY_PREV = 'poetsbeestje.log.prev';
    const t0 = Date.now();
    const started = new Date();
    const runId = 'r-' + started.getTime().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const entries = [];
    const counts = { info: 0, warn: 0, error: 0 };
    let header = [];
    let saveTimer = 0, remoteTimer = 0, remote = false, storageOk = true, dropped = 0;

    try {
      const last = localStorage.getItem(KEY_LAST);
      if (last) localStorage.setItem(KEY_PREV, last);
    } catch (e) { storageOk = false; }

    function stamp() { return ('+' + ((Date.now() - t0) / 1000).toFixed(2) + 's').padStart(10, ' '); }
    function fmt(v) {
      if (v === undefined) return '';
      if (typeof v === 'string') return v;
      try { return JSON.stringify(v); } catch (e) { return String(v); }
    }
    function add(level, msg, data) {
      counts[level]++;
      entries.push(stamp() + ' ' + level.toUpperCase().padEnd(5) + ' ' + msg + (data !== undefined ? ' | ' + fmt(data) : ''));
      if (entries.length > 600) { entries.splice(0, 1); dropped++; }
      const c = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      c.call(console, '[Poetsbeestje] ' + msg, data === undefined ? '' : data);
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 300);
      pushRemote(level === 'error');
    }
    function text() {
      return [
        'POETSBEESTJE — LOG VAN DE LAATSTE RUN',
        'App-versie ' + VERSION + ' · run ' + runId,
        'Gestart ' + started.toLocaleString('nl-NL')
      ].concat(header, ['----'], dropped ? ['(' + dropped + ' oudere regels weggelaten)'] : [], entries, [
        '----',
        'Samenvatting: ' + counts.error + ' fout(en), ' + counts.warn + ' waarschuwing(en), ' + counts.info + ' meldingen'
      ]).join('\n');
    }
    function save() { try { localStorage.setItem(KEY_LAST, text()); } catch (e) { /* opslag geblokkeerd */ } }
    function previous() { try { return localStorage.getItem(KEY_PREV) || ''; } catch (e) { return ''; } }
    function setHeader(lines) { header = lines; save(); }
    function send() {
      if (!remote) return;
      fetch('api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: runId, text: text() })
      }).catch(function () { /* server weg: log blijft in de browser */ });
    }
    function pushRemote(now) {
      if (!remote) return;
      clearTimeout(remoteTimer);
      remoteTimer = setTimeout(send, now ? 50 : 1500);
    }
    function enableRemote() {
      if (PREVIEW || location.protocol === 'file:') return;
      if (/\.github\.io$/.test(location.hostname)) {
        add('info', 'GitHub Pages: geen server, log staat alleen in de browser (ouderscherm → Kopieer log)');
        return;
      }
      fetch('api/health', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && j.app === 'poetsbeestje') {
            remote = true;
            add('info', 'serverlog actief → logs/last-run.log');
            pushRemote(true);
          }
        })
        .catch(function () { /* statische hosting: alleen browserlog */ });
    }
    function flush() {
      save();
      if (remote && navigator.sendBeacon) {
        try { navigator.sendBeacon('api/log', new Blob([JSON.stringify({ runId: runId, text: text() })], { type: 'application/json' })); } catch (e) { /* niets */ }
      }
    }
    return {
      info: function (m, d) { add('info', m, d); },
      warn: function (m, d) { add('warn', m, d); },
      error: function (m, d) { add('error', m, d); },
      text: text, previous: previous, setHeader: setHeader, enableRemote: enableRemote, flush: flush,
      runId: runId,
      storageOk: function () { return storageOk; }
    };
  })();

  window.addEventListener('error', function (e) {
    Log.error('JS-fout: ' + e.message, (e.filename || '').split('/').pop() + ':' + e.lineno + ':' + e.colno);
  });
  window.addEventListener('unhandledrejection', function (e) {
    const r = e.reason;
    Log.error('Onafgehandelde fout', String(r && (r.message || r)));
  });
  window.addEventListener('pagehide', function () { Log.info('app verlaten'); Log.flush(); });

  /* =========================================================
     OPSLAG
     ========================================================= */
  const Store = (function () {
    const KEY = 'poetsbeestje.v1';
    function fresh() {
      return {
        version: 1,
        createdAt: new Date().toISOString(),
        creatureName: 'Bubbel',
        kidName: '',
        settings: { duration: 120, sound: true, vibrate: true },
        owned: START_IDS.slice(),
        outfit: { kleur: 'k-mint', hoofd: null, ogen: null, nek: null, hand: 'ha-tandenborstel', voeten: null, achtergrond: 'a-badkamer' },
        sessions: [],
        giftQueue: [],
        newItems: [],
        sparkles: 0
      };
    }
    function migrate(raw) {
      const f = fresh();
      const s = Object.assign(f, raw);
      s.settings = Object.assign(fresh().settings, raw.settings || {});
      s.outfit = Object.assign(fresh().outfit, raw.outfit || {});
      s.owned = Array.from(new Set((s.owned || []).filter(function (id) { return ITEM[id]; }).concat(START_IDS)));
      s.newItems = (s.newItems || []).filter(function (id) { return ITEM[id]; });
      s.sessions = Array.isArray(s.sessions) ? s.sessions.slice(-400) : [];
      s.giftQueue = Array.isArray(s.giftQueue) ? s.giftQueue : [];
      Object.keys(s.outfit).forEach(function (slot) {
        const id = s.outfit[slot];
        if (id && (!ITEM[id] || s.owned.indexOf(id) < 0 || ITEM[id].slot !== slot)) {
          Log.warn('ongeldig item in outfit hersteld', slot + '=' + id);
          s.outfit[slot] = fresh().outfit[slot];
        }
      });
      if ([60, 120, 180].indexOf(Number(s.settings.duration)) < 0) s.settings.duration = 120;
      return s;
    }
    function load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) { Log.info('geen opgeslagen spel gevonden: nieuw beestje'); return fresh(); }
        return migrate(JSON.parse(raw));
      } catch (e) {
        Log.warn('opgeslagen spel niet leesbaar: nieuw beestje', e.message);
        return fresh();
      }
    }
    function save(s) {
      try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) {
        Log.error('opslaan mislukt', e.message);
        return false;
      }
    }
    function wipe() { try { localStorage.removeItem(KEY); } catch (e) { /* niets */ } }
    return { load: load, save: save, fresh: fresh, wipe: wipe };
  })();

  let S = null;

  /* =========================================================
     SPELREGELS: beurten, reeksen, cadeautjes
     ========================================================= */
  function completedSessions() { return S.sessions.filter(function (x) { return x.completed; }); }
  function daySummary(key) {
    const done = completedSessions().filter(function (x) { return x.day === key; });
    return {
      ochtend: done.some(function (x) { return x.part === 'ochtend'; }),
      avond: done.some(function (x) { return x.part === 'avond'; })
    };
  }
  function streak() {
    let count = 0;
    const d = new Date();
    const today = daySummary(dayKey(d));
    if (!(today.ochtend && today.avond)) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 3650; i++) {
      const s = daySummary(dayKey(d));
      if (!(s.ochtend && s.avond)) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }
  function lastCompletedAt() {
    const done = completedSessions();
    return done.length ? new Date(done[done.length - 1].at) : null;
  }

  function pickItem(min) {
    const pool = ITEMS.filter(function (i) { return S.owned.indexOf(i.id) < 0; });
    if (!pool.length) return null;
    const level = completedSessions().length;
    let allowed;
    if (S.owned.length === START_IDS.length) {
      // eerste cadeau: iets voor op het hoofd, dan zie je het meteen
      allowed = pool.filter(function (i) { return i.slot === 'hoofd' && i.rarity === 'gewoon'; });
    }
    if (!allowed || !allowed.length) {
      if (min && min !== 'gewoon') {
        allowed = pool.filter(function (i) { return RARITY[i.rarity].order >= RARITY[min].order; });
      } else {
        allowed = pool.filter(function (i) {
          return (i.rarity !== 'zeldzaam' || level >= 3) && (i.rarity !== 'super' || level >= 8);
        });
      }
    }
    if (!allowed.length) allowed = pool;
    const total = allowed.reduce(function (t, i) { return t + RARITY[i.rarity].weight; }, 0);
    let r = Math.random() * total;
    for (let k = 0; k < allowed.length; k++) {
      r -= RARITY[allowed[k].rarity].weight;
      if (r <= 0) return allowed[k];
    }
    return allowed[allowed.length - 1];
  }

  function equip(id) {
    const it = ITEM[id];
    if (!it || S.owned.indexOf(id) < 0) { Log.warn('aantrekken mislukt: item niet in bezit', id); return false; }
    S.outfit[it.slot] = id;
    S.newItems = S.newItems.filter(function (x) { return x !== id; });
    Store.save(S);
    Log.info('aangetrokken', it.slot + ' = ' + id);
    return true;
  }
  function unequip(slot) {
    if (!SLOT[slot] || !SLOT[slot].removable) return;
    Log.info('uitgetrokken', slot + ' (' + S.outfit[slot] + ')');
    S.outfit[slot] = null;
    Store.save(S);
  }

  /* =========================================================
     GELUID EN TRILLEN
     ========================================================= */
  const Sound = (function () {
    let ctx = null, warned = false;
    function ensure() {
      if (!S || !S.settings.sound) return null;
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          ctx = new AC();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      } catch (e) {
        if (!warned) { Log.warn('geluid niet beschikbaar', e.message); warned = true; }
        return null;
      }
    }
    function tone(freq, start, dur, type, vol) {
      const c = ensure();
      if (!c) return;
      try {
        const o = c.createOscillator(), g = c.createGain();
        const t = c.currentTime + start;
        o.type = type || 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + dur + 0.05);
      } catch (e) { if (!warned) { Log.warn('geluid afspelen mislukt', e.message); warned = true; } }
    }
    function seq(notes, gap, dur, type, vol) { notes.forEach(function (f, i) { tone(f, i * gap, dur, type, vol); }); }
    return {
      unlock: ensure,
      tap: function () { tone(660, 0, 0.08, 'triangle', 0.07); },
      count: function () { tone(880, 0, 0.14, 'triangle', 0.12); },
      go: function () { seq([523, 659, 784], 0.1, 0.18, 'triangle', 0.15); },
      swap: function () { seq([784, 1047], 0.14, 0.2, 'square', 0.06); },
      done: function () { seq([523, 659, 784, 1047, 784, 1047], 0.12, 0.22, 'triangle', 0.16); },
      gift: function () { seq([1047, 1319, 1568, 2093], 0.07, 0.25, 'sine', 0.12); }
    };
  })();

  function buzz(pattern) {
    if (!S.settings.vibrate || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) { /* niet ondersteund */ }
  }

  let wakeLock = null;
  function keepAwake(on) {
    if (on) {
      if (!('wakeLock' in navigator)) { Log.info('scherm-aan-houden niet ondersteund op dit toestel'); return; }
      navigator.wakeLock.request('screen').then(function (l) {
        wakeLock = l;
        Log.info('scherm blijft aan tijdens poetsen');
      }).catch(function (e) { Log.warn('scherm-aan-houden geweigerd', e.message); });
    } else if (wakeLock) {
      wakeLock.release().catch(function () { /* al vrij */ });
      wakeLock = null;
    }
  }

  /* =========================================================
     ICOONTJES
     ========================================================= */
  const IC = {
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    brush: '<path d="M3 21l8-8"/><path d="M10 14l7-7 3 3-7 7z"/><path d="M14 9l-1.5-1.5M16 7l-1.5-1.5M18 5l-1.5-1.5"/>',
    hanger: '<path d="M12 8.5V8c0-1.5 2-2 2-3.5a2 2 0 1 0-4 0"/><path d="M12 8.5 3.4 15a1.4 1.4 0 0 0 .8 2.5h15.6a1.4 1.4 0 0 0 .8-2.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 3-5 5-5 8 0 4 3 7 7 7z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    check: '<path d="M5 12.5 10 17 19 7"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13.5h18"/><path d="M12 9c-1.5-4-6-4.5-6-1.5S12 9 12 9zm0 0c1.5-4 6-4.5 6-1.5S12 9 12 9z"/>',
    hoofd: '<path d="M3 17h18"/><path d="M6.5 17c0-6 2.5-10 5.5-10s5.5 4 5.5 10"/>',
    ogen: '<circle cx="7" cy="13" r="3.5"/><circle cx="17" cy="13" r="3.5"/><path d="M10.5 13h3M3.5 12 2 9.5M20.5 12 22 9.5"/>',
    nek: '<path d="M12 12 4 7v10zM12 12l8-5v10z"/>',
    hand: '<path d="M5 20 14 11"/><path d="m16 3 1.2 2.8L20 7l-2.8 1.2L16 11l-1.2-2.8L12 7l2.8-1.2z"/>',
    voeten: '<path d="M3 17v-6l5 1 3-3 3 3c3 1 6 2 7 4v1z"/><path d="M3 17h18"/>',
    kleur: '<path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3z"/>',
    achtergrond: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/>'
  };
  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + (IC[name] || '') + '</svg>';
  }

  /* =========================================================
     HET BEESTJE TEKENEN
     ========================================================= */
  function paletteOf(id) { return (ITEM[id] && ITEM[id].palette) || ITEM['k-mint'].palette; }

  function mouthSVG(mode, shiny) {
    if (mode === 'brush') {
      const M = ART.MOUTH_OPEN;
      let teeth = '', spots = '', hl = '', shine = '';
      const xs = [102, 118, 134, 151, 167, 183];
      xs.forEach(function (x, i) {
        const qUp = i < 3 ? 0 : 1;
        const qLo = i < 3 ? 3 : 2;
        teeth += '<rect x="' + x + '" y="196" width="15" height="20" rx="5" fill="#FFFFFF"/>';
        teeth += '<rect x="' + x + '" y="240" width="15" height="20" rx="5" fill="#FFFFFF"/>';
        spots += '<circle data-q="' + qUp + '" cx="' + (x + 6 + (i % 2) * 3) + '" cy="' + (209 - (i % 2) * 4) + '" r="3.6" fill="#B9C95A"/>';
        spots += '<circle data-q="' + qLo + '" cx="' + (x + 8 - (i % 2) * 3) + '" cy="' + (247 + (i % 2) * 3) + '" r="3.4" fill="#B9C95A"/>';
        if (i % 2 === 0) {
          spots += '<circle data-q="' + qUp + '" cx="' + (x + 11) + '" cy="200" r="2.4" fill="#C9D86B"/>';
          spots += '<circle data-q="' + qLo + '" cx="' + (x + 4) + '" cy="254" r="2.4" fill="#C9D86B"/>';
        }
      });
      [[0, 99, 193], [1, 150, 193], [3, 99, 237], [2, 150, 237]].forEach(function (h) {
        hl += '<rect class="pb-hl" data-hl="' + h[0] + '" x="' + h[1] + '" y="' + h[2] + '" width="51" height="26" rx="9"/>';
      });
      [[0, 112, 204], [1, 186, 204], [3, 112, 250], [2, 186, 250]].forEach(function (s) {
        shine += '<g class="pb-shine" data-shine="' + s[0] + '">' + ART.sparkle(s[1], s[2], 7, '#FFFFFF') + '</g>';
      });
      return '<rect x="' + M.x + '" y="' + M.y + '" width="' + M.w + '" height="' + M.h + '" rx="' + M.rx + '" fill="#6B1631"/>' +
        '<g clip-path="url(#pb-mouth-clip)"><ellipse cx="150" cy="229" rx="34" ry="10" fill="#FF7A9C"/>' + teeth + spots + '</g>' + hl + shine;
    }
    if (mode === 'bah') {
      return '<path d="M126 224 q8 -8 16 0 t16 0 t16 0" stroke="#6B1631" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    return '<path d="' + ART.SMILE + '" fill="#6B1631"/>' +
      '<g clip-path="url(#pb-smile-clip)"><rect x="110" y="200" width="80" height="20" fill="#FFFFFF"/>' +
      '<path d="M130 207 v12 M150 210 v10 M170 207 v12" stroke="#E6EEF5" stroke-width="2"/>' +
      '<ellipse cx="150" cy="232" rx="15" ry="7" fill="#FF7A9C"/></g>' +
      (shiny ? ART.sparkle(168, 214, 7, '#FFFFFF') + ART.sparkle(132, 212, 4, '#FFFFFF') : '');
  }

  function eyesSVG(mode, pal) {
    if (mode === 'happy') {
      return '<path d="M96 170 Q118 146 140 170" stroke="#123A52" stroke-width="7" fill="none" stroke-linecap="round"/>' +
        '<path d="M160 170 Q182 146 204 170" stroke="#123A52" stroke-width="7" fill="none" stroke-linecap="round"/>';
    }
    const lids = mode === 'bah'
      ? '<path d="M94.8 158 A24 27 0 0 1 141.2 158 Z" fill="' + pal.body + '"/><path d="M158.8 158 A24 27 0 0 1 205.2 158 Z" fill="' + pal.body + '"/>'
      : '';
    const look = mode === 'brush' ? 4 : 0;
    return '<g class="pb-eyes">' +
      '<ellipse cx="118" cy="165" rx="24" ry="27" fill="#FFFFFF" stroke="' + pal.shade + '" stroke-width="2"/>' +
      '<ellipse cx="182" cy="165" rx="24" ry="27" fill="#FFFFFF" stroke="' + pal.shade + '" stroke-width="2"/>' +
      '<circle cx="' + (122 - look) + '" cy="' + (170 + look) + '" r="13" fill="#123A52"/><circle cx="' + (186 - look) + '" cy="' + (170 + look) + '" r="13" fill="#123A52"/>' +
      '<circle cx="' + (127 - look) + '" cy="' + (164 + look) + '" r="4.5" fill="#FFFFFF"/><circle cx="' + (191 - look) + '" cy="' + (164 + look) + '" r="4.5" fill="#FFFFFF"/>' +
      '<circle cx="' + (117 - look) + '" cy="' + (176 + look) + '" r="2" fill="#FFFFFF" opacity=".8"/><circle cx="' + (181 - look) + '" cy="' + (176 + look) + '" r="2" fill="#FFFFFF" opacity=".8"/>' +
      lids + '</g>';
  }

  function creatureSVG(outfit, o) {
    o = o || {};
    const pal = paletteOf(outfit.kleur);
    const mode = o.mode || 'smile';
    const get = function (slot) { return outfit[slot] ? ITEM[outfit[slot]] : null; };
    const nek = get('nek'), ogen = get('ogen'), hoofd = get('hoofd'), hand = get('hand'), voeten = get('voeten');
    const p = [];
    p.push('<ellipse cx="150" cy="322" rx="86" ry="10" fill="#000000" opacity=".14"/>');
    [nek, hoofd, ogen, hand, voeten].forEach(function (it) { if (it && it.back) p.push(it.back); });
    p.push('<ellipse cx="112" cy="308" rx="26" ry="15" fill="' + pal.shade + '"/><ellipse cx="188" cy="308" rx="26" ry="15" fill="' + pal.shade + '"/>');
    if (voeten) p.push(voeten.front);
    p.push('<ellipse cx="48" cy="235" rx="16" ry="28" transform="rotate(25 48 235)" fill="' + pal.body + '"/>');
    p.push('<path d="' + ART.HORN_L + '" fill="' + pal.horn + '" stroke="' + pal.horn + '" stroke-width="6" stroke-linejoin="round"/>');
    p.push('<path d="' + ART.HORN_R + '" fill="' + pal.horn + '" stroke="' + pal.horn + '" stroke-width="6" stroke-linejoin="round"/>');
    p.push('<path d="' + ART.BODY + '" fill="' + pal.body + '"/>');
    p.push('<ellipse cx="150" cy="248" rx="72" ry="56" fill="' + pal.belly + '"/>');
    if (pal.stars) p.push('<g clip-path="url(#pb-body-clip)">' + ART.BODY_STARS + '</g>');
    p.push('<g fill="' + pal.shade + '" opacity=".35"><circle cx="70" cy="150" r="6"/><circle cx="82" cy="133" r="3.5"/><circle cx="231" cy="142" r="5"/><circle cx="219" cy="125" r="3"/></g>');
    p.push('<path d="M84 134 Q96 110 122 101" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" fill="none" opacity=".35"/>');
    p.push('<ellipse cx="84" cy="200" rx="12" ry="7" fill="#FF8FB5" opacity=".85"/><ellipse cx="216" cy="200" rx="12" ry="7" fill="#FF8FB5" opacity=".85"/>');
    p.push(mouthSVG(mode, o.shiny));
    p.push(eyesSVG(mode === 'bah' ? 'bah' : (o.happyEyes ? 'happy' : mode), pal));
    if (nek) p.push(nek.front);
    if (ogen) p.push(ogen.front);
    if (hoofd) p.push(hoofd.front);
    if (hand) p.push(hand.front);
    p.push('<ellipse cx="252" cy="215" rx="16" ry="28" transform="rotate(35 252 215)" fill="' + pal.body + '"/><circle cx="268" cy="190" r="12" fill="' + pal.body + '"/>');
    if (o.shiny) p.push(ART.sparkle(74, 112, 8, '#FFE27A') + ART.sparkle(238, 248, 6, '#FFE27A'));
    const label = o.label || S.creatureName;
    return '<svg class="pb-svg" viewBox="' + (o.viewBox || '0 0 300 340') + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(label) + '">' +
      '<g class="pb-creature' + (o.still ? ' is-still' : '') + '">' + p.join('') + '</g></svg>';
  }

  function sceneSVG(id) {
    const it = ITEM[id] || ITEM['a-badkamer'];
    return '<svg class="pb-scene" viewBox="0 0 300 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + it.scene + '</svg>';
  }

  function thumbSVG(it) {
    if (it.slot === 'kleur') {
      return creatureSVG({ kleur: it.id }, { still: true, viewBox: '30 46 240 290', label: it.name });
    }
    if (it.slot === 'achtergrond') {
      return '<svg viewBox="0 0 300 340" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(it.name) + '">' + it.scene + '</svg>';
    }
    const vb = it.thumb || (SLOT[it.slot] && SLOT[it.slot].thumb) || '0 0 300 340';
    return '<svg viewBox="' + vb + '" role="img" aria-label="' + esc(it.name) + '">' + (it.back || '') + it.front + '</svg>';
  }

  function quadIcon(q) {
    const cells = [[5, 5], [21, 5], [21, 15], [5, 15]];
    return '<svg class="qicon" viewBox="0 0 40 28" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="25" rx="11" class="qi-mouth"/>' +
      cells.map(function (c, i) { return '<rect x="' + c[0] + '" y="' + c[1] + '" width="14" height="8" rx="3" class="qi-t' + (i === q ? ' on' : '') + '"/>'; }).join('') + '</svg>';
  }

  /* =========================================================
     SCHERMEN
     ========================================================= */
  const SCREENS = ['home', 'brush', 'reward', 'wardrobe', 'parent'];
  let current = null;
  function show(name) {
    SCREENS.forEach(function (s) { $('#scr-' + s).hidden = s !== name; });
    if (current !== name) Log.info('scherm → ' + name);
    current = name;
    if (RENDER[name]) RENDER[name]();
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  function confetti() {
    if (reduceMotion()) return;
    const box = $('#confetti');
    let html = '';
    for (let i = 0; i < 40; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 0.35;
      const dur = 1.6 + Math.random() * 1.1;
      const rot = Math.round(Math.random() * 360);
      html += '<i class="c' + (i % 5) + '" style="left:' + left.toFixed(1) + '%;animation-delay:' + delay.toFixed(2) + 's;animation-duration:' + dur.toFixed(2) + 's;transform:rotate(' + rot + 'deg)"></i>';
    }
    box.innerHTML = html;
    setTimeout(function () { box.innerHTML = ''; }, 3000);
  }

  /* ---------- thuis ---------- */
  let justEquipped = null;
  function greeting(d) {
    const h = d.getHours();
    return h < 6 ? 'Hallo nachtuil' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond';
  }
  function renderHome() {
    const now = new Date();
    const part = partOf(now);
    const today = daySummary(dayKey(now));
    const doneNow = today[part];
    const last = lastCompletedAt();
    const hours = last ? (now - last) / 36e5 : 99;
    const mood = !doneNow && hours > 14 && completedSessions().length > 0 ? 'bah' : 'smile';

    $('#home-greet').textContent = greeting(now) + (S.kidName ? ', ' + S.kidName : '') + '!';
    $('#home-name').textContent = S.creatureName;
    $('#home-scene').innerHTML = sceneSVG(S.outfit.achtergrond);
    $('#home-art').innerHTML = creatureSVG(S.outfit, { mode: mood, shiny: doneNow });

    let say;
    if (justEquipped && ITEM[justEquipped]) say = 'Kijk, mijn nieuwe ' + ITEM[justEquipped].name.toLowerCase() + '!';
    else if (S.giftQueue.length) say = 'Er ligt nog een cadeautje voor je klaar!';
    else if (!S.sessions.length) say = 'Hoi! Ik ben ' + S.creatureName + '. Poets je met me mee?';
    else if (doneNow && part === 'ochtend') say = 'Fris! Vanavond poetsen we weer.';
    else if (doneNow) say = 'Mijn tanden glimmen. Slaap lekker!';
    else if (mood === 'bah') say = 'Bah, mijn tandjes kriebelen. Poetsen?';
    else if (part === 'ochtend') say = 'Goedemorgen! Gaan we poetsen?';
    else say = 'Zullen we onze tanden poetsen?';
    justEquipped = null;
    $('#home-say').textContent = say;

    const st = streak();
    const owned = S.owned.length;
    $('#home-today').innerHTML =
      '<span class="chip' + (today.ochtend ? ' chip--done' : '') + (part === 'ochtend' && !today.ochtend ? ' chip--now' : '') + '">' + icon(today.ochtend ? 'check' : 'sun') + 'Ochtend</span>' +
      '<span class="chip' + (today.avond ? ' chip--done' : '') + (part === 'avond' && !today.avond ? ' chip--now' : '') + '">' + icon(today.avond ? 'check' : 'moon') + 'Avond</span>' +
      '<span class="chip chip--plain" title="Dagen op rij ochtend én avond gepoetst">' + icon('flame') + st + (st === 1 ? ' dag' : ' dagen') + '</span>';
    $('#wardrobe-count').textContent = owned + '/' + ITEMS.length;
    const nNew = S.newItems.length;
    $('#wardrobe-new').hidden = !nNew;
    $('#wardrobe-new').textContent = nNew ? nNew + ' nieuw' : '';

    const pend = $('#btn-pending');
    pend.hidden = !S.giftQueue.length;
    pend.innerHTML = icon('gift') + (S.giftQueue.length === 1 ? 'Er wacht een cadeautje!' : 'Er wachten ' + S.giftQueue.length + ' cadeautjes!');
  }

  /* ---------- poetsen ---------- */
  const B = { state: 'idle', duration: 120, elapsed: 0, base: 0, startAt: 0, raf: 0, quadrant: -1, startedAt: null, timers: [], tipTimer: 0, foamTimer: 0, spots: [], hls: [], shines: [], segs: [] };

  function clearBrushTimers() {
    B.timers.forEach(clearTimeout);
    B.timers = [];
    clearInterval(B.tipTimer);
    clearInterval(B.foamTimer);
    cancelAnimationFrame(B.raf);
  }

  function startBrush() {
    Sound.unlock();
    Sound.tap();
    B.duration = Number(S.settings.duration) || 120;
    B.elapsed = 0; B.base = 0; B.quadrant = -1; B.startedAt = new Date();
    B.state = 'countdown';
    show('brush');
    $('#brush-scene').innerHTML = sceneSVG(S.outfit.achtergrond);
    $('#brush-art').innerHTML = creatureSVG(S.outfit, { mode: 'brush', viewBox: '35 50 230 235' });
    B.spots = $$('#brush-art [data-q]');
    B.hls = $$('#brush-art [data-hl]');
    B.shines = $$('#brush-art [data-shine]');
    $('#brush-bar').innerHTML = [0, 1, 2, 3].map(function () { return '<span class="seg"><i></i></span>'; }).join('');
    B.segs = $$('#brush-bar i');
    $('#brush-sheet').hidden = true;
    $('#brush-tip').textContent = 'Zet je tandenborstel klaar…';
    $('#scr-brush').classList.remove('is-brushing');
    renderQuads();
    updateBrush();
    Log.info('poetsen: aftellen', { duur: B.duration, deel: partOf(B.startedAt) });

    const cd = $('#countdown'), num = $('#countdown-num');
    const steps = ['3', '2', '1', 'Poetsen!'];
    cd.hidden = false;
    steps.forEach(function (label, i) {
      B.timers.push(setTimeout(function () {
        num.textContent = label;
        num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
        if (i < 3) Sound.count();
      }, i * 800));
    });
    B.timers.push(setTimeout(function () {
      cd.hidden = true;
      B.state = 'running';
      B.startAt = Date.now();
      B.base = 0;
      $('#scr-brush').classList.add('is-brushing');
      Sound.go();
      buzz(60);
      keepAwake(true);
      Log.info('poetsen gestart', { duur: B.duration });
      nextTip();
      B.tipTimer = setInterval(nextTip, 9000);
      B.foamTimer = setInterval(foam, 650);
      loop();
    }, steps.length * 800));
  }

  let tipIndex = 0;
  function nextTip() {
    tipIndex = (tipIndex + 1) % TIPS.length;
    $('#brush-tip').textContent = TIPS[tipIndex];
  }

  function foam() {
    if (reduceMotion()) return;
    const box = $('#brush-foam');
    if (box.childElementCount > 14) return;
    const b = document.createElement('i');
    const size = 10 + Math.random() * 22;
    b.style.width = b.style.height = size.toFixed(0) + 'px';
    b.style.left = (30 + Math.random() * 40).toFixed(1) + '%';
    b.style.animationDuration = (2.2 + Math.random() * 1.6).toFixed(2) + 's';
    b.addEventListener('animationend', function () { b.remove(); });
    box.appendChild(b);
  }

  function loop() {
    if (B.state !== 'running') return;
    B.elapsed = B.base + (Date.now() - B.startAt) / 1000;
    if (B.elapsed >= B.duration) {
      B.elapsed = B.duration;
      updateBrush();
      finishBrush(true);
      return;
    }
    updateBrush();
    B.raf = requestAnimationFrame(loop);
  }

  function updateBrush() {
    const qd = B.duration / 4;
    const q = Math.min(3, Math.floor(B.elapsed / qd));
    $('#brush-timer').textContent = fmtTime(B.duration - B.elapsed);
    const dirt = [0, 1, 2, 3].map(function (i) { return 1 - clamp((B.elapsed - i * qd) / qd, 0, 1); });
    B.spots.forEach(function (el) { el.setAttribute('opacity', dirt[Number(el.getAttribute('data-q'))].toFixed(2)); });
    B.segs.forEach(function (el, i) { el.style.width = ((1 - dirt[i]) * 100).toFixed(1) + '%'; });
    B.shines.forEach(function (el) { el.classList.toggle('on', dirt[Number(el.getAttribute('data-shine'))] <= 0.001); });
    if (B.state === 'running' && q !== B.quadrant) {
      if (B.quadrant >= 0) {
        Sound.swap();
        buzz(120);
        Log.info('wissel naar ' + QUADS[q], { seconde: Math.round(B.elapsed) });
        $('#brush-tip').textContent = 'Nu: ' + QUADS[q].toLowerCase() + '!';
      }
      B.quadrant = q;
      renderQuads();
    }
  }

  function renderQuads() {
    const active = B.quadrant;
    B.hls.forEach(function (el) { el.classList.toggle('on', Number(el.getAttribute('data-hl')) === active); });
    $('#brush-quads').innerHTML = [0, 1, 3, 2].map(function (i) {
      const cls = i < active ? ' is-done' : i === active ? ' is-active' : '';
      return '<div class="quad' + cls + '">' + (i < active ? icon('check', 'qcheck') : quadIcon(i)) + '<span>' + QUADS[i] + '</span></div>';
    }).join('');
  }

  function pauseBrush(reason, asking) {
    if (B.state === 'countdown') {
      clearBrushTimers();
      B.state = 'idle';
      $('#countdown').hidden = true;
      Log.info('poetsen afgebroken tijdens aftellen', reason);
      show('home');
      return;
    }
    if (B.state !== 'running') return;
    B.base = B.elapsed;
    B.state = 'paused';
    clearBrushTimers();
    keepAwake(false);
    $('#scr-brush').classList.remove('is-brushing');
    Log.info('pauze', { reden: reason, seconde: Math.round(B.elapsed) });
    $('#sheet-title').textContent = asking ? 'Wil je stoppen?' : 'Even pauze';
    $('#sheet-text').textContent = asking
      ? 'Als je nu stopt, krijg je geen cadeautje. Nog ' + fmtTime(B.duration - B.elapsed) + ' te gaan!'
      : 'Je was bij ' + QUADS[Math.max(0, B.quadrant)].toLowerCase() + '. Nog ' + fmtTime(B.duration - B.elapsed) + '.';
    $('#brush-sheet').hidden = false;
    $('#btn-resume').focus();
  }

  function resumeBrush() {
    if (B.state !== 'paused') return;
    $('#brush-sheet').hidden = true;
    B.state = 'running';
    B.startAt = Date.now();
    $('#scr-brush').classList.add('is-brushing');
    keepAwake(true);
    Log.info('verder poetsen', { seconde: Math.round(B.base) });
    B.tipTimer = setInterval(nextTip, 9000);
    B.foamTimer = setInterval(foam, 650);
    loop();
  }

  function finishBrush(completed) {
    clearBrushTimers();
    keepAwake(false);
    B.state = 'idle';
    $('#scr-brush').classList.remove('is-brushing');
    $('#brush-sheet').hidden = true;
    const secs = Math.round(B.elapsed);
    if (secs >= 5 || completed) {
      S.sessions.push({
        at: B.startedAt.toISOString(),
        day: dayKey(B.startedAt),
        part: partOf(B.startedAt),
        seconds: secs,
        target: B.duration,
        completed: !!completed
      });
      if (S.sessions.length > 400) S.sessions = S.sessions.slice(-400);
    }
    if (!completed) {
      Store.save(S);
      Log.info('poetsbeurt gestopt', { seconden: secs, doel: B.duration });
      show('home');
      toast('Poets de hele tijd, dan krijg je een cadeautje!');
      return;
    }
    const before = S.giftQueue.length;
    S.giftQueue.push({ min: 'gewoon', reason: 'poetsbeurt' });
    const today = daySummary(dayKey(B.startedAt));
    const thisPart = partOf(B.startedAt);
    const firstOfPart = completedSessions().filter(function (x) { return x.day === dayKey(B.startedAt) && x.part === thisPart; }).length === 1;
    if (today.ochtend && today.avond && firstOfPart) {
      const st = streak();
      if (st === 3 || (st > 0 && st % 7 === 0)) {
        S.giftQueue.push({ min: 'zeldzaam', reason: 'reeks', days: st });
        Log.info('bonus voor reeks', st + ' dagen');
      }
    }
    Store.save(S);
    Sound.done();
    buzz([80, 60, 80]);
    Log.info('poetsbeurt klaar', { seconden: secs, deel: thisPart, cadeaus: S.giftQueue.length - before });
    show('reward');
    confetti();
  }

  /* ---------- cadeautje ---------- */
  let opening = false, revealed = null;
  function renderReward() {
    const g = S.giftQueue[0];
    opening = false;
    revealed = null;
    $('#btn-gift').classList.remove('is-open');
    $('#btn-gift').hidden = false;
    $('.reward-stage').classList.remove('is-revealed');
    $('#reveal').hidden = true;
    $('#reward-actions').hidden = true;
    if (!g) { show('home'); return; }
    let title = 'Super gepoetst!';
    if (g.reason === 'reeks') title = 'Bonus! ' + g.days + ' dagen op rij';
    if (g.reason === 'ouders') title = 'Een cadeautje van je ouders!';
    if (g.reason === 'poetsbeurt' && S.kidName) title = 'Super gepoetst, ' + S.kidName + '!';
    $('#reward-title').textContent = title;
    $('#reward-sub').textContent = S.giftQueue.length > 1
      ? 'Tik op je cadeautje. Er liggen er ' + S.giftQueue.length + ' klaar!'
      : 'Tik op je cadeautje';
    $('#reward-art').innerHTML = creatureSVG(S.outfit, { mode: 'smile', shiny: true, happyEyes: true });
  }

  function openGift() {
    if (opening) return;
    const g = S.giftQueue.shift();
    if (!g) { show('home'); return; }
    opening = true;
    const it = pickItem(g.min);
    if (it) {
      S.owned.push(it.id);
      if (S.newItems.indexOf(it.id) < 0) S.newItems.push(it.id);
    } else {
      S.sparkles = (S.sparkles || 0) + 1;
    }
    Store.save(S);
    revealed = it;
    Log.info('cadeautje geopend', it ? { item: it.id, zeldzaamheid: it.rarity, reden: g.reason } : { glimster: S.sparkles });
    Sound.gift();
    buzz(40);
    $('#btn-gift').classList.add('is-open');
    setTimeout(function () {
      $('#btn-gift').hidden = true;
      const r = $('#reveal');
      if (it) {
        $('#reveal-thumb').innerHTML = thumbSVG(it);
        $('#reveal-rarity').textContent = RARITY[it.rarity].label;
        $('#reveal-rarity').className = 'rarity rarity--' + it.rarity;
        $('#reveal-name').textContent = it.name;
        $('#reveal-slot').textContent = 'Voor: ' + SLOT[it.slot].name.toLowerCase();
      } else {
        $('#reveal-thumb').innerHTML = '<svg viewBox="0 0 100 100" role="img" aria-label="Glimster"><path d="' + ART.star(50, 52, 42, 18) + '" fill="#FFC83A" stroke="#E09A00" stroke-width="3" stroke-linejoin="round"/></svg>';
        $('#reveal-rarity').textContent = 'Alles verzameld';
        $('#reveal-rarity').className = 'rarity rarity--super';
        $('#reveal-name').textContent = 'Glimster nummer ' + S.sparkles;
        $('#reveal-slot').textContent = 'Je hebt alle spullen!';
      }
      r.hidden = false;
      $('.reward-stage').classList.add('is-revealed');
      $('#reward-actions').hidden = false;
      $('#btn-wear').hidden = !it;
      $('#btn-next-gift').hidden = !S.giftQueue.length;
      $('#btn-reward-done').textContent = S.giftQueue.length ? 'Later' : 'Klaar';
      confetti();
      (it ? $('#btn-wear') : $('#btn-reward-done')).focus();
    }, reduceMotion() ? 50 : 650);
  }

  /* ---------- kledingkast ---------- */
  let wardrobeSlot = 'hoofd';
  function renderWardrobe() {
    $('#wardrobe-scene').innerHTML = sceneSVG(S.outfit.achtergrond);
    $('#wardrobe-art').innerHTML = creatureSVG(S.outfit, { mode: 'smile' });
    $('#wardrobe-progress').textContent = S.owned.length + ' van ' + ITEMS.length;
    $('#wardrobe-tabs').innerHTML = SLOTS.map(function (s) {
      const hasNew = S.newItems.some(function (id) { return ITEM[id].slot === s.id; });
      return '<button type="button" role="tab" class="tab' + (s.id === wardrobeSlot ? ' is-on' : '') + '" aria-selected="' + (s.id === wardrobeSlot) + '" data-slot="' + s.id + '">' +
        icon(s.id) + '<span>' + s.name + '</span>' + (hasNew ? '<b class="dot" aria-label="nieuw"></b>' : '') + '</button>';
    }).join('');
    const list = ITEMS.filter(function (i) { return i.slot === wardrobeSlot; });
    const ownedHere = list.filter(function (i) { return S.owned.indexOf(i.id) >= 0; }).length;
    $('#wardrobe-hint').textContent = ownedHere + ' van ' + list.length + ' ' + SLOT[wardrobeSlot].name.toLowerCase() +
      (SLOT[wardrobeSlot].removable ? ' · tik nog eens om uit te doen' : '');
    $('#wardrobe-grid').innerHTML = list.map(function (it) {
      const owned = S.owned.indexOf(it.id) >= 0;
      const on = S.outfit[it.slot] === it.id;
      const isNew = S.newItems.indexOf(it.id) >= 0;
      return '<button type="button" class="item slot--' + it.slot + (owned ? '' : ' is-locked') + (on ? ' is-on' : '') + ' item--' + it.rarity + '" data-item="' + it.id + '"' +
        ' aria-pressed="' + on + '" aria-label="' + esc(owned ? it.name : 'Nog niet verdiend') + '">' +
        '<span class="item-art">' + thumbSVG(it) + '</span>' +
        (owned ? '<span class="item-name">' + esc(it.name) + '</span>' : '<span class="item-name">' + icon('lock', 'mini') + '???</span>') +
        (on ? '<span class="item-on">' + icon('check') + '</span>' : '') +
        (isNew ? '<span class="item-new">Nieuw</span>' : '') +
        '</button>';
    }).join('');
  }

  function wardrobeClick(id) {
    const it = ITEM[id];
    if (!it) return;
    if (S.owned.indexOf(id) < 0) {
      toast(RARITY[it.rarity].label + ' — blijf poetsen om dit te verdienen!');
      Log.info('op slot getikt', id);
      return;
    }
    Sound.tap();
    if (S.outfit[it.slot] === id && SLOT[it.slot].removable) unequip(it.slot);
    else equip(id);
    renderWardrobe();
  }

  /* ---------- ouders ---------- */
  let gateAnswer = 0, gateTries = 0;
  function openGate() {
    const a = 3 + Math.floor(Math.random() * 7), b = 3 + Math.floor(Math.random() * 7);
    gateAnswer = a * b;
    const opts = [gateAnswer, gateAnswer + a, gateAnswer - b].sort(function () { return Math.random() - 0.5; });
    $('#gate-q').textContent = 'Hoeveel is ' + a + ' × ' + b + '?';
    $('#gate-answers').innerHTML = opts.map(function (v) { return '<button type="button" class="candy candy--ghost" data-answer="' + v + '">' + v + '</button>'; }).join('');
    $('#gate').hidden = false;
    $('#gate-answers button').focus();
    Log.info('oudervraag getoond');
  }
  function closeGate() { $('#gate').hidden = true; }

  function renderParent() {
    $('#in-creature').value = S.creatureName;
    $('#in-kid').value = S.kidName;
    $$('input[name="duration"]').forEach(function (r) { r.checked = Number(r.value) === Number(S.settings.duration); });
    $('#in-sound').checked = !!S.settings.sound;
    $('#in-vibrate').checked = !!S.settings.vibrate;

    const done = completedSessions();
    const all = S.sessions;
    const since = new Date(); since.setDate(since.getDate() - 13); since.setHours(0, 0, 0, 0);
    const recent = all.filter(function (x) { return new Date(x.at) >= since; });
    const avg = recent.length ? Math.round(recent.reduce(function (t, x) { return t + x.seconds; }, 0) / recent.length) : 0;
    $('#parent-stats').innerHTML =
      stat(done.length, 'beurten afgemaakt') +
      stat(streak(), 'dagen op rij (2x)') +
      stat(recent.length ? fmtTime(avg) : '–', 'gem. poetstijd, 14 dagen') +
      stat(S.owned.length + '/' + ITEMS.length, 'spullen verzameld');

    const days = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
    let cols = '';
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const s = daySummary(dayKey(d));
      cols += '<div class="hday' + (i === 0 ? ' is-today' : '') + '"><span class="hdot' + (s.ochtend ? ' on' : '') + '" title="ochtend"></span>' +
        '<span class="hdot hdot--moon' + (s.avond ? ' on' : '') + '" title="avond"></span><span class="hlabel">' + days[d.getDay()] + '</span></div>';
    }
    $('#parent-history').innerHTML = cols;
    $('#parent-version').textContent = 'Poetsbeestje ' + VERSION + (PREVIEW ? ' · preview' : '') + ' · run ' + Log.runId;
    $('#btn-log-download').hidden = PREVIEW;
    $('#log-text').hidden = true;
    $('#btn-reset').dataset.armed = '';
    $('#btn-reset').textContent = 'Alles wissen';
  }
  function stat(v, label) { return '<div class="stat"><b>' + esc(v) + '</b><span>' + esc(label) + '</span></div>'; }

  const RENDER = { home: renderHome, reward: renderReward, wardrobe: renderWardrobe, parent: renderParent };

  /* =========================================================
     KNOPPEN
     ========================================================= */
  function on(id, fn) {
    const el = $(id);
    if (!el) { Log.error('knop ontbreekt in index.html', id); return; }
    el.addEventListener('click', fn);
  }

  function bind() {
    on('#btn-brush', startBrush);
    on('#btn-wardrobe', function () { Sound.unlock(); Sound.tap(); show('wardrobe'); });
    on('#btn-pending', function () { Sound.unlock(); show('reward'); });
    on('#btn-parent', function () { Sound.unlock(); openGate(); });

    on('#btn-stop', function () { if (B.state === 'paused') return; pauseBrush('stopknop', true); });
    on('#btn-pause', function () { pauseBrush('pauzeknop', false); });
    on('#btn-resume', resumeBrush);
    on('#btn-quit', function () { finishBrush(false); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && (B.state === 'running' || B.state === 'countdown')) pauseBrush('app op de achtergrond', false);
    });

    on('#btn-gift', openGift);
    on('#btn-wear', function () {
      if (revealed && equip(revealed.id)) justEquipped = revealed.id;
      if (S.giftQueue.length) { renderReward(); toast('Aangetrokken!'); } else show('home');
    });
    on('#btn-next-gift', function () { renderReward(); });
    on('#btn-reward-done', function () { show('home'); });

    on('#btn-wardrobe-back', function () { show('home'); });
    $('#wardrobe-tabs').addEventListener('click', function (e) {
      const b = e.target.closest('[data-slot]');
      if (!b) return;
      wardrobeSlot = b.getAttribute('data-slot');
      Sound.tap();
      renderWardrobe();
    });
    $('#wardrobe-grid').addEventListener('click', function (e) {
      const b = e.target.closest('[data-item]');
      if (b) wardrobeClick(b.getAttribute('data-item'));
    });

    $('#gate-answers').addEventListener('click', function (e) {
      const b = e.target.closest('[data-answer]');
      if (!b) return;
      if (Number(b.getAttribute('data-answer')) === gateAnswer) {
        gateTries = 0;
        closeGate();
        Log.info('oudervraag goed beantwoord');
        show('parent');
      } else {
        gateTries++;
        Log.info('oudervraag fout beantwoord', gateTries);
        closeGate();
        toast('Dat klopt niet. Vraag het aan papa of mama!');
      }
    });
    on('#btn-gate-cancel', closeGate);
    on('#btn-parent-back', function () { show('home'); });

    $('#in-creature').addEventListener('change', function (e) {
      const v = e.target.value.trim().slice(0, 18) || 'Bubbel';
      S.creatureName = v; e.target.value = v; Store.save(S); Log.info('naam beestje gewijzigd', v);
    });
    $('#in-kid').addEventListener('change', function (e) {
      S.kidName = e.target.value.trim().slice(0, 18); Store.save(S); Log.info('naam kind gewijzigd');
    });
    $$('input[name="duration"]').forEach(function (r) {
      r.addEventListener('change', function () {
        S.settings.duration = Number(r.value); Store.save(S); Log.info('poetstijd ingesteld', S.settings.duration + 's');
      });
    });
    $('#in-sound').addEventListener('change', function (e) { S.settings.sound = e.target.checked; Store.save(S); Log.info('geluid', S.settings.sound ? 'aan' : 'uit'); });
    $('#in-vibrate').addEventListener('change', function (e) { S.settings.vibrate = e.target.checked; Store.save(S); Log.info('trillen', S.settings.vibrate ? 'aan' : 'uit'); });
    on('#btn-parent-gift', function () {
      S.giftQueue.push({ min: 'gewoon', reason: 'ouders' });
      Store.save(S);
      Log.info('cadeautje gegeven door ouder');
      toast('Cadeautje klaargezet. Het staat op het beginscherm.');
    });

    on('#btn-log-show', function () {
      const t = $('#log-text');
      const prev = Log.previous();
      t.value = Log.text() + (prev ? '\n\n==== VORIGE RUN ====\n' + prev : '');
      t.hidden = !t.hidden;
      $('#btn-log-show').textContent = t.hidden ? 'Bekijk log' : 'Verberg log';
      Log.info('log bekeken');
    });
    on('#btn-log-copy', function () {
      const txt = Log.text();
      const t = $('#log-text');
      function fallback() {
        t.value = txt; t.hidden = false; t.focus(); t.select();
        toast('Log geselecteerd. Kopieer hem met je toetsenbord of lang drukken.');
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { toast('Log gekopieerd. Plak hem in de chat.'); }, fallback);
      } else fallback();
    });
    on('#btn-log-download', function () {
      try {
        const blob = new Blob([Log.text()], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'poetsbeestje-log-' + dayKey(new Date()) + '.txt';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      } catch (e) { Log.warn('log downloaden mislukt', e.message); }
    });
    on('#btn-reset', function (e) {
      const b = e.currentTarget;
      if (b.dataset.armed !== '1') {
        b.dataset.armed = '1';
        b.textContent = 'Tik nog een keer om alles te wissen';
        return;
      }
      Log.warn('spel gewist door ouder');
      Store.wipe();
      S = Store.fresh();
      Store.save(S);
      show('home');
      toast('Alles is gewist. Een nieuw begin!');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!$('#gate').hidden) closeGate();
        else if (current === 'brush' && B.state === 'running') pauseBrush('Escape-toets', false);
      }
    });
  }

  /* =========================================================
     START
     ========================================================= */
  function selfCheck() {
    const problems = [];
    const ids = {};
    ITEMS.forEach(function (i) {
      if (ids[i.id]) problems.push('dubbel id ' + i.id);
      ids[i.id] = true;
      if (!SLOT[i.slot]) problems.push('onbekend vakje ' + i.slot + ' bij ' + i.id);
      if (!RARITY[i.rarity]) problems.push('onbekende zeldzaamheid bij ' + i.id);
      if (i.slot === 'kleur' && !i.palette) problems.push('kleur zonder palet ' + i.id);
      if (i.slot === 'achtergrond' && !i.scene) problems.push('wereld zonder tekening ' + i.id);
      if (i.slot !== 'kleur' && i.slot !== 'achtergrond' && !i.front) problems.push('item zonder tekening ' + i.id);
    });
    SLOTS.forEach(function (s) { if (!IC[s.id]) problems.push('geen icoon voor vakje ' + s.id); });
    if (problems.length) Log.error('zelftest items', problems);
    else Log.info('zelftest items ok', ITEMS.length + ' items in ' + SLOTS.length + ' vakjes');
  }

  function init() {
    if (!ART || !ITEMS.length) {
      Log.error('data/items.js niet geladen');
      document.body.insertAdjacentHTML('afterbegin', '<p style="padding:16px">De tekeningen konden niet laden. Ververs de pagina.</p>');
      return;
    }
    $('#pb-defs').innerHTML = ART.DEFS;
    S = Store.load();
    selfCheck();
    const mm = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
    Log.setHeader([
      'Toestel: ' + navigator.userAgent,
      'Scherm ' + window.innerWidth + 'x' + window.innerHeight + ' @' + (window.devicePixelRatio || 1) + 'x · ' +
        (mm('(display-mode: standalone)') ? 'als app op beginscherm' : 'in browser') + ' · ' +
        (mm('(prefers-color-scheme: dark)') ? 'donker thema' : 'licht thema') + ' · ' + (PREVIEW ? 'preview' : location.host || 'bestand'),
      'Opslag: ' + (Log.storageOk() ? 'werkt' : 'GEBLOKKEERD (spel wordt niet bewaard)'),
      'Spel bij start: ' + S.owned.length + '/' + ITEMS.length + ' spullen, ' + completedSessions().length + ' beurten, reeks ' + streak() +
        ', ' + S.giftQueue.length + ' cadeau(s) klaar, poetstijd ' + S.settings.duration + 's'
    ]);
    Log.info('app gestart', { versie: VERSION });
    bind();
    show('home');
    Log.enableRemote();
    if (!PREVIEW && 'serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js')
        .then(function () { Log.info('offline-modus actief (service worker)'); })
        .catch(function (e) { Log.warn('offline-modus niet gestart', e.message); });
    }
  }

  // voor debuggen in de browserconsole: Poetsbeestje.log() toont de log
  window.Poetsbeestje = { version: VERSION, log: function () { return Log.text(); }, creatureSVG: creatureSVG, sceneSVG: sceneSVG, thumbSVG: thumbSVG };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
