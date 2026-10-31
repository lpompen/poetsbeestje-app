/* Poetsbeestje — app.js (versie 1.1)
   Schermen: ei kiezen, thuis, poetsen, cadeautje/uitkomen, kledingkast en ouders.

   Spelregels in het kort:
   - Je kiest een ei. Na de eerste keer poetsen komt het dier eruit.
   - Spelen, aankleden en cadeautjes kan pas NA het poetsen.
   - 's Avonds mag je daarna 1 minuut spelen, dan gaapt het beestje en gaat slapen.
   - 's Ochtends kort spelen, dan gaat het naar school (weekend: buiten spelen).
   - Aaien met je vinger: omlaag = knuffelen, heen en weer = kietelen,
     omhoog (tegen de haren in) of te lang kietelen = boos.

   Alles wordt lokaal bewaard (localStorage). Elke run schrijft een log:
   - altijd in de browser (ouders > "Log van de laatste run")
   - en, als de app via `npm start` draait, ook naar logs/last-run.log
*/
(function () {
  'use strict';

  const VERSION = '1.1.0';
  const PREVIEW = !!window.PB_PREVIEW;
  const ART = window.PB_ART;
  const EGG = window.PB_EGG;
  const ITEMS = window.PB_ITEMS || [];
  const SLOTS = window.PB_SLOTS || [];
  const SPECIES = window.PB_SPECIES || [];
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
    'Kijk, de tandjes worden wit!',
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
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function reduceMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtTime(sec) { const s = Math.max(0, Math.ceil(sec)); return Math.floor(s / 60) + ':' + pad(s % 60); }

  // Dagdelen: ochtend 05:00–13:59, avond 14:00–04:59 (na middernacht hoort nog bij de avond ervoor)
  function slotOf(d) {
    const x = new Date(d.getTime());
    const h = x.getHours();
    if (h < 5) { x.setDate(x.getDate() - 1); return { day: dayKey(x), part: 'avond' }; }
    return { day: dayKey(x), part: h < 14 ? 'ochtend' : 'avond' };
  }
  function slotKey(s) { return s.day + '/' + s.part; }
  function isWeekendDay(key) {
    const p = key.split('-').map(Number);
    const g = new Date(p[0], p[1] - 1, p[2]).getDay();
    return g === 0 || g === 6;
  }

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
      if (entries.length > 700) { entries.splice(0, 1); dropped++; }
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
        version: 2,
        createdAt: new Date().toISOString(),
        species: null,
        hatched: false,
        creatureName: '',
        kidName: '',
        settings: { duration: 120, sound: true, vibrate: true, playEvening: 60, playMorning: 30 },
        owned: START_IDS.slice(),
        outfit: { kleur: 'k-natuur', hoofd: null, kleding: null, ogen: null, nek: null, hand: 'ha-tandenborstel', voeten: null, achtergrond: 'a-badkamer' },
        sessions: [],
        giftQueue: [],
        newItems: [],
        play: null,
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
      if ((raw.version || 1) < 2) {
        // versie 1 had nog geen dieren: wie al gepoetst heeft houdt Bubbel, anders mag je een ei kiezen
        const done = s.sessions.some(function (x) { return x.completed; });
        s.species = done ? 'monster' : null;
        s.hatched = done;
        if (!done) { s.creatureName = ''; s.outfit.kleur = 'k-natuur'; }
        s.version = 2;
        Log.info('spel bijgewerkt naar versie 2', done ? 'Bubbel blijft' : 'ei kiezen');
      }
      if (s.species && !SPECIES.some(function (x) { return x.id === s.species; })) { s.species = null; s.hatched = false; }
      Object.keys(s.outfit).forEach(function (slot) {
        const id = s.outfit[slot];
        if (id && (!ITEM[id] || s.owned.indexOf(id) < 0 || ITEM[id].slot !== slot)) {
          Log.warn('ongeldig item in outfit hersteld', slot + '=' + id);
          s.outfit[slot] = fresh().outfit[slot];
        }
      });
      if ([60, 120, 180].indexOf(Number(s.settings.duration)) < 0) s.settings.duration = 120;
      if ([60, 120, 180].indexOf(Number(s.settings.playEvening)) < 0) s.settings.playEvening = 60;
      if ([0, 30, 60].indexOf(Number(s.settings.playMorning)) < 0) s.settings.playMorning = 30;
      return s;
    }
    function load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) { Log.info('geen opgeslagen spel gevonden: nieuw begin'); return fresh(); }
        return migrate(JSON.parse(raw));
      } catch (e) {
        Log.warn('opgeslagen spel niet leesbaar: nieuw begin', e.message);
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
     SPELREGELS
     ========================================================= */
  function speciesById(id) {
    return SPECIES.filter(function (x) { return x.id === id; })[0] || SPECIES.filter(function (x) { return x.id === 'monster'; })[0] || SPECIES[0];
  }
  function completedSessions() { return S.sessions.filter(function (x) { return x.completed; }); }
  function daySummary(key) {
    const done = completedSessions().filter(function (x) { return x.day === key; });
    return {
      ochtend: done.some(function (x) { return x.part === 'ochtend'; }),
      avond: done.some(function (x) { return x.part === 'avond'; })
    };
  }
  function brushedIn(slot) {
    return completedSessions().some(function (x) { return x.day === slot.day && x.part === slot.part; });
  }
  function streak() {
    let count = 0;
    const s0 = slotOf(new Date());
    const p = s0.day.split('-').map(Number);
    const d = new Date(p[0], p[1] - 1, p[2], 12);
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
  function hatchPending() { return S.giftQueue.some(function (g) { return g.reason === 'hatch'; }); }
  function playSecondsFor(slot) {
    if (slot.part === 'avond' || isWeekendDay(slot.day)) return Number(S.settings.playEvening) || 60;
    return Number(S.settings.playMorning);
  }

  // waar is het beestje nu? choose | egg | wait | play-ready | play | sleep | away
  function lifeState(now) {
    now = now || new Date();
    if (!S.species) return 'choose';
    if (!S.hatched) return 'egg';
    const slot = slotOf(now);
    if (!brushedIn(slot)) return 'wait';
    const key = slotKey(slot);
    if (!S.play || S.play.slot !== key) return 'play-ready';
    if (now.getTime() < S.play.until) return 'play';
    return slot.part === 'avond' ? 'sleep' : 'away';
  }

  function startPlay() {
    const now = new Date();
    const slot = slotOf(now);
    const secs = playSecondsFor(slot);
    S.play = { slot: slotKey(slot), start: now.getTime(), until: now.getTime() + secs * 1000 };
    Store.save(S);
    Log.info('speeltijd begint', { seconden: secs, deel: slot.part, weekend: isWeekendDay(slot.day) });
  }

  function pickItem(min) {
    const pool = ITEMS.filter(function (i) { return S.owned.indexOf(i.id) < 0; });
    if (!pool.length) return null;
    const level = completedSessions().length;
    let allowed;
    if (S.owned.length <= START_IDS.length + 0 && START_IDS.every(function (id) { return S.owned.indexOf(id) >= 0; })) {
      // eerste cadeau: 's avonds een pyjama, 's ochtends iets voor op het hoofd
      if (slotOf(new Date()).part === 'avond' && pool.some(function (i) { return i.id === 'kl-sterren'; })) return ITEM['kl-sterren'];
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
    function tone(freq, start, dur, type, vol, toFreq) {
      const c = ensure();
      if (!c) return;
      try {
        const o = c.createOscillator(), g = c.createGain();
        const t = c.currentTime + start;
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, t);
        if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
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
      gift: function () { seq([1047, 1319, 1568, 2093], 0.07, 0.25, 'sine', 0.12); },
      crack: function () { tone(220, 0, 0.08, 'square', 0.09, 120); tone(1400, 0.02, 0.05, 'triangle', 0.05); },
      giggle: function () { seq([988, 1175, 1047, 1319], 0.06, 0.08, 'triangle', 0.08); },
      purr: function () { tone(130, 0, 0.5, 'sine', 0.12, 110); tone(260, 0.05, 0.4, 'sine', 0.05); },
      grr: function () { tone(110, 0, 0.35, 'sawtooth', 0.07, 80); },
      boing: function () { tone(300, 0, 0.18, 'sine', 0.12, 700); },
      yawn: function () { tone(520, 0, 1.2, 'sine', 0.1, 180); },
      pop: function () { seq([660, 990, 1320], 0.08, 0.15, 'sine', 0.12); }
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
    back: '<path d="M15 18l-6-6 6-6"/>',
    brush: '<path d="M3 21l8-8"/><path d="M10 14l7-7 3 3-7 7z"/><path d="M14 9l-1.5-1.5M16 7l-1.5-1.5M18 5l-1.5-1.5"/>',
    hanger: '<path d="M12 8.5V8c0-1.5 2-2 2-3.5a2 2 0 1 0-4 0"/><path d="M12 8.5 3.4 15a1.4 1.4 0 0 0 .8 2.5h15.6a1.4 1.4 0 0 0 .8-2.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 3-5 5-5 8 0 4 3 7 7 7z"/>',
    check: '<path d="M5 12.5 10 17 19 7"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13.5h18"/><path d="M12 9c-1.5-4-6-4.5-6-1.5S12 9 12 9zm0 0c1.5-4 6-4.5 6-1.5S12 9 12 9z"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    bag: '<rect x="5" y="7" width="14" height="14" rx="4"/><path d="M9 7V5a3 3 0 0 1 6 0v2M5 13h14M10 13v3h4v-3"/>',
    heart: '<path d="M12 20s-7-4.4-9-9a4.6 4.6 0 0 1 9-2.5A4.6 4.6 0 0 1 21 11c-2 4.6-9 9-9 9z"/>',
    laugh: '<circle cx="12" cy="12" r="9"/><path d="M7.5 10.5q1.5-2 3 0M13.5 10.5q1.5-2 3 0M7.5 14h9q-1 4-4.5 4T7.5 14z"/>',
    grumpy: '<circle cx="12" cy="12" r="9"/><path d="M7 8.5l3 1.5M17 8.5l-3 1.5M8.5 17q3.5-3 7 0"/>',
    down: '<path d="M12 4v14M6 12l6 6 6-6"/>',
    up: '<path d="M12 20V6M6 12l6-6 6 6"/>',
    sides: '<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
    hoofd: '<path d="M3 17h18"/><path d="M6.5 17c0-6 2.5-10 5.5-10s5.5 4 5.5 10"/>',
    kleding: '<path d="M8 3 3 6l2 5 3-1v11h8V10l3 1 2-5-5-3c-.5 2-2 3-4 3S8.5 5 8 3z"/>',
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
  const INK = '#1B2F4A';

  function paletteFor(outfit, sp) {
    const k = ITEM[outfit.kleur];
    return (k && k.palette) ? k.palette : sp.palette;
  }

  // tandenborstel, lokaal getekend: kop op (0,0), haren naar boven, steel naar rechts
  function brushGlyph() {
    return '<rect x="12" y="-2" width="80" height="11" rx="5.5" fill="#4FB3FF" transform="rotate(18 12 3)"/>' +
      '<rect x="-19" y="-4" width="38" height="13" rx="5.5" fill="#2B84D6"/>' +
      '<rect x="-17" y="-17" width="34" height="13" rx="3" fill="#FFFFFF" stroke="#BFE8FF" stroke-width="1.5"/>' +
      '<path d="M-11 -16 v11 M-5 -16 v11 M1 -16 v11 M7 -16 v11 M13 -16 v11" stroke="#9FDCF5" stroke-width="2"/>' +
      '<g class="bg-foam" fill="#FFFFFF" stroke="#DDF4FF" stroke-width="1.5"><circle cx="-21" cy="-17" r="6"/><circle cx="21" cy="-19" r="7"/><circle cx="0" cy="-26" r="6.5"/><circle cx="-11" cy="-28" r="4"/><circle cx="12" cy="-30" r="4.5"/></g>';
  }

  function cheeksSVG(mode) {
    const c = mode === 'angry' ? { f: '#FF4D5E', o: 0.85, rx: 17, ry: 10 }
      : mode === 'cuddle' || mode === 'giggle' ? { f: '#FF7FA8', o: 0.95, rx: 17, ry: 10 }
      : { f: '#FF8FB5', o: 0.75, rx: 15, ry: 9 };
    let s = '<ellipse cx="82" cy="203" rx="' + c.rx + '" ry="' + c.ry + '" fill="' + c.f + '" opacity="' + c.o + '"/>' +
      '<ellipse cx="218" cy="203" rx="' + c.rx + '" ry="' + c.ry + '" fill="' + c.f + '" opacity="' + c.o + '"/>';
    if (mode !== 'angry') {
      s += '<path d="M76 200 l-3 5 M82 199 l-3 6 M88 200 l-3 5 M212 200 l-3 5 M218 199 l-3 6 M224 200 l-3 5" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>';
    }
    return s;
  }

  function mouthSVG(mode, o) {
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
        '<g clip-path="url(#pb-mouth-clip)"><ellipse cx="150" cy="229" rx="34" ry="10" fill="#FF7A9C"/>' + teeth + spots + '</g>' + hl + shine +
        '<g class="pb-minibrush"><g transform="scale(.42)"><g class="bg-scrub">' + brushGlyph() + '</g></g></g>';
    }
    if (mode === 'bah') {
      return '<path d="M128 226 q7 -7 14 0 t14 0 t14 0" stroke="#6B1631" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    if (mode === 'giggle') {
      return '<path d="' + ART.LAUGH + '" fill="#6B1631"/><g clip-path="url(#pb-laugh-clip)"><rect x="126" y="203" width="48" height="11" fill="#FFFFFF"/><ellipse cx="150" cy="246" rx="18" ry="10" fill="#FF7A9C"/></g>';
    }
    if (mode === 'cuddle') return '<path d="M136 214 Q150 228 164 214" stroke="#6B1631" stroke-width="5" fill="none" stroke-linecap="round"/>';
    if (mode === 'angry') return '<path d="M134 232 Q150 216 166 232" stroke="#6B1631" stroke-width="5.5" fill="none" stroke-linecap="round"/>';
    if (mode === 'yawn') return '<ellipse cx="150" cy="226" rx="18" ry="24" fill="#6B1631"/><ellipse cx="150" cy="241" rx="12" ry="7" fill="#FF7A9C"/><rect x="141" y="203" width="18" height="6" rx="3" fill="#FFFFFF"/>';
    if (mode === 'sleep') {
      return '<ellipse cx="150" cy="222" rx="5.5" ry="6.5" fill="#6B1631"/>' +
        '<circle class="pb-snot" cx="172" cy="206" r="9" fill="#BDEBFF" opacity=".75" stroke="#FFFFFF" stroke-width="2"/>';
    }
    return '<path d="' + ART.SMILE + '" fill="#6B1631"/>' +
      '<g clip-path="url(#pb-smile-clip)"><rect x="141" y="208" width="8" height="8" rx="2" fill="#FFFFFF"/><rect x="151" y="208" width="8" height="8" rx="2" fill="#FFFFFF"/>' +
      '<ellipse cx="150" cy="234" rx="11" ry="7" fill="#FF7A9C"/></g>' +
      (o.shiny ? ART.sparkle(162, 214, 6, '#FFFFFF') : '');
  }

  function eyesSVG(mode, pal) {
    const lashes = '<path d="M92 147 l-9 -6 M96 139 l-6 -9 M208 147 l9 -6 M204 139 l6 -9" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>';
    const arc = function (d, w) { return '<path d="' + d + '" stroke="' + INK + '" stroke-width="' + w + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; };
    if (mode === 'happy' || mode === 'giggle') {
      return arc('M96 172 Q118 146 140 172', 7) + arc('M160 172 Q182 146 204 172', 7) + lashes;
    }
    if (mode === 'cuddle') return arc('M98 164 Q118 182 138 164', 6) + arc('M162 164 Q182 182 202 164', 6) + lashes;
    if (mode === 'sleep') return arc('M100 170 Q118 182 136 170', 5) + arc('M164 170 Q182 182 200 170', 5);
    if (mode === 'yawn') return arc('M100 156 L132 168 L100 180', 6) + arc('M200 156 L168 168 L200 180', 6);
    const look = mode === 'brush' ? ' transform="translate(-3 4)"' : '';
    const eye = function (cx) {
      return '<ellipse cx="' + cx + '" cy="165" rx="27" ry="31" fill="#FFFFFF" stroke="' + pal.shade + '" stroke-width="2.5"/>';
    };
    const iris = function (cx) {
      return '<circle cx="' + (cx + 3) + '" cy="170" r="20" fill="' + INK + '"/>' +
        '<ellipse cx="' + (cx + 3) + '" cy="181" rx="13" ry="7" fill="#4C86C2" opacity=".6"/>' +
        '<circle cx="' + (cx + 11) + '" cy="160" r="8.5" fill="#FFFFFF"/>' +
        '<circle cx="' + (cx - 5) + '" cy="179" r="4" fill="#FFFFFF"/>' +
        '<circle cx="' + (cx + 10) + '" cy="179" r="2" fill="#FFFFFF" opacity=".9"/>';
    };
    let lids = '';
    if (mode === 'bah') {
      lids = '<path d="M94.5 158 A27 31 0 0 1 141.5 158 Z" fill="' + pal.body + '"/><path d="M158.5 158 A27 31 0 0 1 205.5 158 Z" fill="' + pal.body + '"/>';
    }
    if (mode === 'angry') {
      lids = '<path d="M86 124 L150 124 L146 160 L86 140 Z" fill="' + pal.body + '"/><path d="M214 124 L150 124 L154 160 L214 140 Z" fill="' + pal.body + '"/>' +
        arc('M90 140 L144 158', 7) + arc('M210 140 L156 158', 7);
    }
    return '<g class="pb-eyes">' + eye(118) + eye(182) + '<g class="pb-look"' + look + '>' + iris(118) + iris(182) + '</g>' + lids + '</g>' +
      (mode === 'angry' ? '' : lashes);
  }

  const BACKPACK_BACK = '<rect x="178" y="190" width="96" height="116" rx="28" fill="#FF4F6D"/><rect x="192" y="236" width="70" height="42" rx="12" fill="#E03252"/><circle cx="227" cy="257" r="5" fill="#FFC83A"/>';
  const BACKPACK_FRONT = '<path d="M64 226 Q60 262 86 298" stroke="#FF4F6D" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M236 226 Q240 262 214 298" stroke="#FF4F6D" stroke-width="11" fill="none" stroke-linecap="round"/>';

  function creatureSVG(outfit, o) {
    o = o || {};
    const sp = speciesById(o.species || S.species);
    const pal = paletteFor(outfit, sp);
    const parts = sp.parts(pal);
    const mode = o.mode || 'smile';
    const get = function (slot) { return outfit[slot] ? ITEM[outfit[slot]] : null; };
    const kl = get('kleding'), nek = get('nek'), ogen = get('ogen'), hoofd = get('hoofd'), hand = get('hand'), voeten = get('voeten');
    const line = parts.fluffy ? '' : ' stroke="' + pal.shade + '" stroke-width="3" stroke-linejoin="round"';
    const sleeve = kl && kl.sleeve ? kl.sleeve : null;
    const p = [];
    p.push('<ellipse cx="150" cy="325" rx="88" ry="10" fill="#000000" opacity=".13"/>');
    [nek, hoofd, ogen, hand, voeten, kl].forEach(function (it) { if (it && it.back) p.push(it.back); });
    if (o.backpack) p.push(BACKPACK_BACK);
    p.push(parts.behind || '');
    p.push('<ellipse cx="112" cy="309" rx="27" ry="16" fill="' + pal.shade + '"/><ellipse cx="188" cy="309" rx="27" ry="16" fill="' + pal.shade + '"/>');
    p.push(parts.feet || '');
    if (voeten) p.push(voeten.front);
    p.push('<ellipse cx="48" cy="235" rx="16" ry="28" transform="rotate(25 48 235)" fill="' + (sleeve || pal.body) + '"' + line + '/>');
    if (sleeve) p.push('<circle cx="37" cy="258" r="11" fill="' + pal.body + '"' + line + '/>');
    p.push('<path d="' + ART.BODY + '" fill="' + pal.body + '"' + line + '/>');
    p.push('<ellipse cx="150" cy="248" rx="72" ry="56" fill="' + pal.belly + '"/>');
    if (pal.stars) p.push('<g clip-path="url(#pb-body-clip)">' + ART.BODY_STARS + '</g>');
    p.push(parts.over || '');
    p.push('<path d="M84 134 Q96 110 122 101" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" fill="none" opacity=".35"/>');
    if (kl) {
      p.push('<g clip-path="url(#pb-body-clip)">' + (kl.torso || '') +
        (kl.trim ? '<path d="' + ART.NECKLINE + '" stroke="' + kl.trim + '" stroke-width="6" fill="none"/>' : '') + '</g>' + (kl.front || ''));
    }
    p.push(cheeksSVG(mode));
    p.push(parts.face || '');
    p.push(mouthSVG(mode, o));
    p.push(eyesSVG(mode, pal));
    if (nek) p.push(nek.front);
    if (ogen) p.push(ogen.front);
    if (hoofd) p.push(hoofd.front);
    if (o.backpack) p.push(BACKPACK_FRONT);
    if (hand) p.push(hand.front);
    p.push('<ellipse cx="252" cy="215" rx="16" ry="28" transform="rotate(35 252 215)" fill="' + (sleeve || pal.body) + '"' + line + '/>');
    p.push('<circle cx="268" cy="190" r="12" fill="' + pal.body + '"' + line + '/>');
    if (o.shiny) p.push(ART.sparkle(74, 112, 8, '#FFE27A') + ART.sparkle(238, 248, 6, '#FFE27A'));
    if (mode === 'angry') {
      p.push('<g stroke="#FF4D5E" stroke-width="4" stroke-linecap="round" fill="none"><path d="M206 106 q6 -2 8 -8"/><path d="M222 98 q2 6 8 8"/><path d="M230 114 q-6 2 -8 8"/><path d="M214 122 q-2 -6 -8 -8"/></g>');
    }
    if (mode === 'yawn') p.push('<path d="M92 184 q-7 11 0 15 q7 -4 0 -15z" fill="#9FDCF5"/>');
    const g = '<g class="pb-creature' + (o.still ? ' is-still' : '') + '">' + p.join('') + '</g>';
    if (o.inner) return g;
    return '<svg class="pb-svg" viewBox="' + (o.viewBox || '0 0 300 340') + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(o.label || S.creatureName || sp.name) + '">' + g + '</svg>';
  }

  function eggSVG(sp, o) {
    o = o || {};
    const eg = sp.egg;
    const body = '<path d="' + EGG.PATH + '" fill="' + eg.base + '"/>' +
      '<g clip-path="url(#pb-egg-clip)">' + eg.deco + '<ellipse cx="112" cy="132" rx="16" ry="30" transform="rotate(20 112 132)" fill="#FFFFFF" opacity=".55"/></g>' +
      '<g class="egg-face">' + EGG.FACE + '</g>' +
      '<path d="' + EGG.PATH + '" fill="none" stroke="' + eg.shade + '" stroke-width="4"/>' +
      EGG.CRACKS.map(function (d, i) {
        return '<path class="egg-crack" data-crack="' + i + '" d="' + d + '" fill="none" stroke="#7A5A3A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity="' + (i < (o.cracks || 0) ? 1 : 0) + '"/>';
      }).join('');
    const nest = o.nest !== false;
    return '<svg class="pb-svg egg-svg' + (o.cls ? ' ' + o.cls : '') + '" viewBox="' + (o.viewBox || '0 0 300 340') + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(o.label || 'Ei') + '">' +
      (nest ? EGG.NEST_BACK : '') +
      (o.creature ? '<g class="hatch-creature">' + o.creature + '</g>' : '') +
      '<g class="egg-wobble">' +
        '<g class="egg-bot" clip-path="url(#pb-egg-bot)">' + body + '</g>' +
        '<g class="egg-top">' + eg.top + '<g clip-path="url(#pb-egg-top)">' + body + '</g></g>' +
      '</g>' +
      (nest ? '<g class="egg-nest-front">' + EGG.NEST_FRONT + '</g>' : '') +
      '</svg>';
  }

  function sceneSVG(id) {
    const it = ITEM[id] || ITEM['a-badkamer'];
    return '<svg class="pb-scene" viewBox="0 0 300 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + it.scene + '</svg>';
  }

  function thumbSVG(it) {
    if (it.slot === 'kleur') {
      return creatureSVG({ kleur: it.id }, { still: true, viewBox: '20 20 260 316', label: it.name });
    }
    if (it.slot === 'achtergrond') {
      return '<svg viewBox="0 0 300 340" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(it.name) + '">' + it.scene + '</svg>';
    }
    if (it.slot === 'kleding') {
      return creatureSVG({ kleur: S.outfit.kleur, kleding: it.id }, { still: true, viewBox: '10 196 280 140', label: it.name });
    }
    const vb = it.thumb || (SLOT[it.slot] && SLOT[it.slot].thumb) || '0 0 300 340';
    return '<svg viewBox="' + vb + '" role="img" aria-label="' + esc(it.name) + '">' + (it.back || '') + it.front + '</svg>';
  }

  /* ---------- grote tanden-animatie (mondkaart) ---------- */
  const CHART = (function () {
    const xs = [46, 80, 112, 144, 176, 208, 240, 274];
    const ws = [30, 30, 28, 28, 28, 28, 30, 30];
    const uh = [30, 32, 36, 40, 40, 36, 32, 30];
    const lh = [28, 30, 32, 34, 34, 32, 30, 28];
    const up = xs.map(function (x, i) { return { x: x, w: ws[i], y: 46, h: uh[i], upper: true }; });
    const lo = xs.map(function (x, i) { return { x: x, w: ws[i], y: 136 - lh[i], h: lh[i], upper: false }; });
    // poetsvolgorde: boven links (achter → voor), boven rechts, onder rechts, onder links
    const order = [up[0], up[1], up[2], up[3], up[4], up[5], up[6], up[7], lo[7], lo[6], lo[5], lo[4], lo[3], lo[2], lo[1], lo[0]];
    order.forEach(function (t, k) { t.k = k; t.q = Math.floor(k / 4); });
    return order;
  })();

  function chartSVG() {
    let teeth = '';
    CHART.forEach(function (t) {
      const x = t.x - t.w / 2;
      teeth += '<g class="mc-tooth" data-k="' + t.k + '">' +
        '<rect x="' + x + '" y="' + t.y + '" width="' + t.w + '" height="' + t.h + '" rx="9" fill="#FFFFFF" stroke="#E3ECF4" stroke-width="2"/>' +
        '<rect class="mc-dirt" x="' + x + '" y="' + t.y + '" width="' + t.w + '" height="' + t.h + '" rx="9" fill="#EBD27E" opacity=".75"/>' +
        '<circle class="mc-spot" cx="' + (t.x - t.w / 4) + '" cy="' + (t.y + t.h * 0.62) + '" r="3.6" fill="#A9BC4A"/>' +
        '<circle class="mc-spot" cx="' + (t.x + t.w / 5) + '" cy="' + (t.y + t.h * 0.34) + '" r="2.6" fill="#A9BC4A"/>' +
        '<g class="mc-shine">' + ART.sparkle(t.x + t.w / 2 - 4, t.y + (t.upper ? t.h - 6 : 6), 7, '#FFFFFF') + '</g>' +
        '</g>';
    });
    const hl = [[28, 40, 136, 50], [156, 40, 136, 50], [156, 96, 136, 46], [28, 96, 136, 46]].map(function (r, q) {
      return '<rect class="mc-hl" data-q="' + q + '" x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '" rx="16"/>';
    }).join('');
    return '<svg class="mc-svg" viewBox="0 0 320 180" role="img" aria-label="Tanden die je nu poetst">' +
      '<rect x="6" y="6" width="308" height="168" rx="70" fill="#8E1F45"/>' +
      '<rect x="16" y="14" width="288" height="42" rx="21" fill="#FF9BB5"/><rect x="16" y="126" width="288" height="42" rx="21" fill="#FF9BB5"/>' +
      '<ellipse cx="160" cy="108" rx="100" ry="22" fill="#FF7A9C"/>' +
      hl + teeth +
      '<g class="mc-brush" id="mc-brush"><g class="bg-scrub">' + brushGlyph() + '</g></g>' +
      '</svg>';
  }

  /* =========================================================
     SCHERMEN
     ========================================================= */
  const SCREENS = ['egg', 'home', 'brush', 'reward', 'wardrobe', 'parent'];
  let current = null;
  function show(name) {
    if (name === 'home' && S && !S.species) name = 'egg';
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

  // kleine animaatjes op het podium: hartjes, "hihi", stoomwolkjes, Zzz
  const HEART_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.4A5 5 0 0 1 12 7.2a5 5 0 0 1 9.6 4.4C19.5 16.4 12 21 12 21z" fill="#FF4F8B"/></svg>';
  function fx(type, x, y, text) {
    if (reduceMotion() && type !== 'text') return;
    const box = $('#home-fx');
    if (!box || box.childElementCount > 24) return;
    const el = document.createElement('span');
    el.className = 'fx fx-' + type;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (type === 'heart') el.innerHTML = HEART_SVG;
    else if (text) el.textContent = text;
    el.style.setProperty('--dx', ((Math.random() - 0.5) * 50).toFixed(0) + 'px');
    el.addEventListener('animationend', function () { el.remove(); });
    box.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
  }
  function stagePoint(fx, fy) {
    const r = $('#home-stage').getBoundingClientRect();
    return [r.width * fx, r.height * fy];
  }

  let sayTimer = 0;
  function say(msg, ms) {
    const el = $('#home-say');
    el.textContent = msg;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(sayTimer);
    if (ms) sayTimer = setTimeout(function () { el.textContent = ''; }, ms);
  }

  /* ---------- ei kiezen ---------- */
  let chosenEgg = null;
  function renderEgg() {
    chosenEgg = null;
    $('#btn-egg-ok').disabled = true;
    $('#btn-egg-ok').textContent = 'Kies eerst een ei';
    $('#egg-grid').innerHTML = SPECIES.map(function (sp) {
      return '<button type="button" class="egg-pick" data-species="' + sp.id + '" aria-pressed="false" aria-label="Ei van een ' + esc(sp.name.toLowerCase()) + '">' +
        '<span class="egg-pick-art">' + eggSVG(sp, { nest: false, viewBox: '30 18 240 310', label: sp.name }) + '</span>' +
        '<span class="egg-pick-name">' + esc(sp.name) + '</span></button>';
    }).join('');
  }
  function pickEgg(id) {
    chosenEgg = id;
    $$('.egg-pick').forEach(function (b) {
      const on = b.getAttribute('data-species') === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const sp = speciesById(id);
    $('#btn-egg-ok').disabled = false;
    $('#btn-egg-ok').textContent = 'Dit ei!';
    Sound.unlock(); Sound.tap();
    Log.info('ei aangewezen', sp.id);
  }
  function confirmEgg() {
    if (!chosenEgg) return;
    const sp = speciesById(chosenEgg);
    S.species = sp.id;
    S.hatched = false;
    S.creatureName = sp.defaultName;
    S.giftQueue = S.giftQueue.filter(function (g) { return g.reason !== 'hatch'; });
    Store.save(S);
    Log.info('ei gekozen', { dier: sp.id, naam: sp.defaultName });
    show('home');
    say('Poets je tanden, dan kom ik uit het ei!');
  }

  /* ---------- thuis ---------- */
  let justEquipped = null, justHatched = false, ending = false, lastState = null, pendingEnd = false;

  function greeting(d) {
    const h = d.getHours();
    return h < 6 ? 'Hallo nachtuil' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond';
  }

  function drawHomeCreature(mode, extra) {
    const art = $('#home-art');
    art.className = 'stage-art mood-' + mode;
    art.innerHTML = creatureSVG(S.outfit, Object.assign({ mode: mode }, extra || {}));
  }

  function renderHome() {
    const now = new Date();
    let state = lifeState(now);
    if (state === 'choose') { show('egg'); return; }
    if (state === 'play-ready') { startPlay(); state = 'play'; }
    // speeltijd liep af in de kledingkast: eerst nog even laten zien, dan gapen of weggaan
    let animateEnd = false;
    if (pendingEnd && (state === 'sleep' || state === 'away')) { animateEnd = true; state = 'play'; }
    pendingEnd = false;
    lastState = state;
    ending = false;
    Pet.reset();

    const slot = slotOf(now);
    const today = daySummary(slot.day);
    const sp = speciesById(S.species);
    const name = S.creatureName || sp.defaultName;
    const stage = $('#home-stage');
    stage.classList.toggle('is-night', state === 'sleep');
    stage.classList.toggle('is-away', state === 'away');
    stage.classList.toggle('is-play', state === 'play');
    $('#home-greet').textContent = greeting(now) + (S.kidName ? ', ' + S.kidName : '') + '!';
    $('#home-name').textContent = state === 'egg' ? 'Een ' + sp.name.toLowerCase() + '-ei' : name;
    $('#home-scene').innerHTML = sceneSVG(S.outfit.achtergrond);
    $('#home-away').hidden = state !== 'away';
    $('#home-fx').innerHTML = '';

    let msg = '';
    if (state === 'egg') {
      const ready = hatchPending();
      $('#home-art').className = 'stage-art';
      $('#home-art').innerHTML = eggSVG(sp, { cracks: ready ? 4 : 0, cls: ready ? 'is-ready' : '' });
      msg = ready ? 'Krak! Ik kom eruit!' : 'Poets je tanden, dan kom ik uit het ei!';
    } else if (state === 'wait') {
      const last = lastCompletedAt();
      const hours = last ? (now - last) / 36e5 : 0;
      const mood = hours > 14 ? 'bah' : 'smile';
      drawHomeCreature(mood);
      msg = mood === 'bah' ? 'Bah, mijn tandjes kriebelen. Poetsen?'
        : slot.part === 'ochtend' ? 'Goedemorgen! Eerst poetsen, dan spelen.'
        : 'Eerst poetsen, dan mogen we nog even spelen!';
    } else if (state === 'play') {
      drawHomeCreature('smile', { shiny: true });
      if (justHatched) msg = 'Hoi! Ik ben ' + name + '!';
      else if (justEquipped && ITEM[justEquipped]) msg = 'Kijk, mijn nieuwe ' + ITEM[justEquipped].name.toLowerCase() + '!';
      else if (S.giftQueue.length) msg = 'Er ligt nog een cadeautje voor je!';
      else msg = pick(['Kriebel me eens!', 'Aai me maar!', 'Zullen we me aankleden?', 'Mijn tanden glimmen!']);
    } else if (state === 'sleep') {
      drawHomeCreature('sleep');
      msg = 'Zzz... welterusten.';
    } else if (state === 'away') {
      $('#home-art').className = 'stage-art';
      $('#home-art').innerHTML = '';
      const weekend = isWeekendDay(slot.day);
      $('#home-away-text').textContent = weekend
        ? name + ' is buiten aan het spelen. Tot straks!'
        : name + ' is naar school. Tot vanmiddag!';
      msg = '';
    }
    justEquipped = null;
    justHatched = false;
    $('#home-say').textContent = msg;

    // statusregel
    const st = streak();
    let chips =
      '<span class="chip' + (today.ochtend ? ' chip--done' : '') + (slot.part === 'ochtend' && !today.ochtend ? ' chip--now' : '') + '">' + icon(today.ochtend ? 'check' : 'sun') + 'Ochtend</span>' +
      '<span class="chip' + (today.avond ? ' chip--done' : '') + (slot.part === 'avond' && !today.avond ? ' chip--now' : '') + '">' + icon(today.avond ? 'check' : 'moon') + 'Avond</span>';
    if (state === 'play') {
      chips += '<span class="chip chip--play" id="play-chip">' + icon('timer') + '<span id="play-left">' + fmtTime((S.play.until - now) / 1000) + '</span><i class="play-bar"><b id="play-bar"></b></i></span>';
    } else if (state === 'sleep') {
      chips += '<span class="chip chip--plain">' + icon('moon') + 'Slaapt tot morgen</span>';
    } else if (state === 'away') {
      chips += '<span class="chip chip--plain">' + icon('bag') + 'Terug om 14:00</span>';
    } else {
      chips += '<span class="chip chip--plain" title="Dagen op rij ochtend én avond gepoetst">' + icon('flame') + st + (st === 1 ? ' dag' : ' dagen') + '</span>';
    }
    $('#home-today').innerHTML = chips;
    $('#home-hints').hidden = state !== 'play';

    // knoppen
    const canBrush = state === 'egg' || state === 'wait';
    $('#btn-brush').hidden = !canBrush || (state === 'egg' && hatchPending());
    const wb = $('#btn-wardrobe');
    const open = state === 'play';
    wb.classList.toggle('is-locked', !open);
    wb.setAttribute('aria-disabled', String(!open));
    const lockText = state === 'egg' ? 'eerst uitbroeden' : state === 'sleep' ? 'morgen weer' : state === 'away' ? 'straks weer' : 'na het poetsen';
    $('#wardrobe-lock').hidden = open;
    $('#wardrobe-lock').innerHTML = icon('lock', 'mini') + lockText;
    $('#wardrobe-count').textContent = S.owned.length + '/' + ITEMS.length;
    const nNew = S.newItems.length;
    $('#wardrobe-new').hidden = !nNew || !open;
    $('#wardrobe-new').textContent = nNew ? nNew + ' nieuw' : '';

    const pend = $('#btn-pending');
    const gifts = S.giftQueue.filter(function (g) { return g.reason !== 'hatch'; }).length;
    if (state === 'egg' && hatchPending()) {
      pend.hidden = false;
      pend.innerHTML = icon('gift') + 'Je ei komt uit! Tik hier';
    } else if (state === 'play' && gifts) {
      pend.hidden = false;
      pend.innerHTML = icon('gift') + (gifts === 1 ? 'Er wacht een cadeautje!' : 'Er wachten ' + gifts + ' cadeautjes!');
    } else {
      pend.hidden = true;
    }
    updatePlayChip();
    if (animateEnd) endPlay();
  }

  function updatePlayChip() {
    if (!S.play) return;
    const left = (S.play.until - Date.now()) / 1000;
    const total = (S.play.until - S.play.start) / 1000 || 1;
    const t1 = $('#play-left'), bar = $('#play-bar'), t2 = $('#wardrobe-time');
    if (t1) t1.textContent = fmtTime(left);
    if (bar) bar.style.width = clamp(left / total * 100, 0, 100).toFixed(1) + '%';
    if (t2) t2.textContent = fmtTime(left);
  }

  // speeltijd voorbij: gapen en slapen, of naar school
  function endPlay() {
    if (ending) return;
    ending = true;
    Pet.reset();
    const slot = slotOf(new Date());
    const name = S.creatureName;
    $('#home-hints').hidden = true;
    $('#btn-wardrobe').classList.add('is-locked');
    if (slot.part === 'avond') {
      Log.info('speeltijd voorbij: gapen en slapen');
      drawHomeCreature('yawn');
      say('Gaaaap... ik word zo moe.');
      Sound.yawn();
      setTimeout(function () {
        if (current !== 'home') { ending = false; return; }
        drawHomeCreature('sleep');
        $('#home-stage').classList.add('is-night');
        say('Welterusten!', 2500);
        setTimeout(function () { if (current === 'home') renderHome(); else ending = false; }, 2600);
      }, 2600);
    } else {
      const weekend = isWeekendDay(slot.day);
      Log.info('speeltijd voorbij', weekend ? 'buiten spelen (weekend)' : 'naar school');
      drawHomeCreature('happy', { backpack: true });
      say(weekend ? 'Ik ga buiten spelen! Doei!' : 'Oh! Ik moet naar school. Doei!');
      Sound.pop();
      setTimeout(function () {
        if (current !== 'home') { ending = false; return; }
        $('#home-art').classList.add('is-leaving');
        setTimeout(function () { if (current === 'home') renderHome(); else ending = false; }, 1900);
      }, 1500);
    }
  }

  // tikt elke halve seconde: speeltijd, Zzz, en van dagdeel wisselen
  let zTick = 0;
  function homeTick() {
    if (!S || ending) return;
    const state = lifeState();
    if (current === 'wardrobe') {
      updatePlayChip();
      if (state !== 'play') { pendingEnd = true; show('home'); return; }
      return;
    }
    if (current !== 'home') return;
    if (lastState === 'play' && state !== 'play') { endPlay(); return; }
    if (state !== lastState && state !== 'play-ready') { renderHome(); return; }
    if (state === 'play-ready') { renderHome(); return; }
    if (state === 'play') updatePlayChip();
    if (state === 'sleep' && ++zTick % 3 === 0) {
      const pt = stagePoint(0.66, 0.3);
      fx('zzz', pt[0], pt[1], 'Z');
    }
  }

  /* ---------- aaien: kietelen, knuffelen, boos maken ---------- */
  const Pet = (function () {
    let down = false, pts = [], lastDir = 0, lastRevX = 0, revs = [], tickleSince = 0, lastTickle = 0, ups = [];
    let mood = 'smile', moodTimer = 0, angryUntil = 0, startX = 0, startY = 0, startT = 0, lastFx = 0, lastSound = 0, lastSay = 0;
    const logged = {};

    function logOnce(kind) {
      const t = Date.now();
      if (!logged[kind] || t - logged[kind] > 4000) Log.info('aaien: ' + kind);
      logged[kind] = t;
    }
    function setMood(m, ms) {
      if (mood !== m) { mood = m; drawHomeCreature(m === 'smile' ? 'smile' : m, { shiny: m === 'smile' }); }
      clearTimeout(moodTimer);
      if (ms) moodTimer = setTimeout(function () { if (lifeState() === 'play' && !ending && current === 'home') { mood = ''; setMood('smile'); } }, ms);
    }
    function reset() { down = false; pts = []; revs = []; ups = []; clearTimeout(moodTimer); mood = 'smile'; angryUntil = 0; }
    function local(e) {
      const r = $('#home-stage').getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top, r];
    }
    function lookAt(e) {
      const p = local(e), r = p[2];
      const dx = clamp((p[0] - r.width / 2) / (r.width / 2) * 6, -6, 6);
      const dy = clamp((p[1] - r.height * 0.45) / (r.height / 2) * 6, -6, 6);
      $$('#home-art .pb-look').forEach(function (g) { g.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)'; });
    }
    function talk(msg) { const t = Date.now(); if (t - lastSay > 1200) { say(msg, 2200); lastSay = t; } }

    function tickle(t, e) {
      if (t < angryUntil) return;
      if (t - lastTickle > 1000) tickleSince = t;
      lastTickle = t;
      if (t - tickleSince > 3500) { angry(t, 'Genoeg gekieteld! Nu ben ik boos!'); return; }
      setMood('giggle', 900);
      const p = local(e);
      if (t - lastFx > 260) { fx('text', p[0], p[1] - 20, pick(['hihi', 'haha', 'hihi!'])); lastFx = t; }
      if (t - lastSound > 350) { Sound.giggle(); buzz(15); lastSound = t; }
      talk('Hihihi! Dat kriebelt!');
      logOnce('kietelen');
    }
    function cuddle(t, e) {
      if (t < angryUntil) { angryUntil = 0; talk('Oké... sorry, ik ben niet meer boos.'); }
      else talk(pick(['Mmm, lekker!', 'Knuffel!', 'Nog een keer!']));
      setMood('cuddle', 1600);
      const p = local(e);
      fx('heart', p[0], p[1] - 10); fx('heart', p[0] + 18, p[1] - 30);
      if (t - lastSound > 600) { Sound.purr(); lastSound = t; }
      logOnce('knuffelen');
    }
    function angry(t, msg) {
      angryUntil = t + 3000;
      setMood('angry', 3000);
      say(msg, 2600); lastSay = t;
      const a = stagePoint(0.3, 0.12), b = stagePoint(0.7, 0.12);
      fx('steam', a[0], a[1]); fx('steam', b[0], b[1]);
      Sound.grr(); buzz([40, 30, 40]);
      logOnce('boos');
    }
    function strokeUp(t) {
      ups = ups.filter(function (u) { return t - u < 3000; });
      ups.push(t);
      if (ups.length >= 2) { ups = []; angry(t, 'Hé! Niet tegen mijn haren in!'); }
      else talk('Hé, de andere kant op!');
    }
    function tap(e) {
      const art = $('#home-art');
      art.classList.remove('is-boing'); void art.offsetWidth; art.classList.add('is-boing');
      setTimeout(function () { art.classList.remove('is-boing'); }, 500);
      const p = local(e);
      fx('heart', p[0], p[1] - 10);
      Sound.boing();
      talk(pick(['Hoi!', 'Hihi!', 'Boing!', 'Nog een keer!']));
      logOnce('tik');
    }

    function onDown(e) {
      const state = lifeState();
      Sound.unlock();
      if (state !== 'play' || ending) {
        const t = Date.now();
        if (t - lastSay < 800) return;
        lastSay = t;
        if (state === 'egg') {
          const egg = $('#home-art .egg-svg');
          if (egg) { egg.classList.remove('is-tapped'); void egg.getBBox; egg.classList.add('is-tapped'); setTimeout(function () { egg.classList.remove('is-tapped'); }, 600); }
          say(hatchPending() ? 'Tik op de gele knop, dan kom ik eruit!' : 'Nog even poetsen, dan kom ik eruit!', 2200);
        } else if (state === 'wait') {
          say('Eerst tandjes poetsen, dan mogen we spelen!', 2400);
          const art = $('#home-art'); art.classList.remove('is-no'); void art.offsetWidth; art.classList.add('is-no');
          setTimeout(function () { art.classList.remove('is-no'); }, 450);
        } else if (state === 'sleep') {
          say('Sssst... ik slaap.', 2000);
        }
        Log.info('getikt terwijl niet spelen', state);
        return;
      }
      down = true;
      const p = local(e);
      startX = p[0]; startY = p[1]; startT = e.timeStamp;
      pts = [{ x: p[0], y: p[1], t: e.timeStamp }];
      revs = []; lastDir = 0; lastRevX = p[0];
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* niet ondersteund */ }
      lookAt(e);
    }
    function onMove(e) {
      if (!down) return;
      const t = e.timeStamp;
      const p = local(e);
      const prev = pts[pts.length - 1];
      pts.push({ x: p[0], y: p[1], t: t });
      if (pts.length > 60) pts.shift();
      lookAt(e);
      // heen en weer = kietelen
      const dx = p[0] - prev.x;
      if (Math.abs(dx) > 3) {
        const dir = dx > 0 ? 1 : -1;
        if (lastDir && dir !== lastDir && Math.abs(p[0] - lastRevX) > 12) { revs.push(t); lastRevX = p[0]; }
        if (dir !== lastDir && !lastDir) lastRevX = p[0];
        lastDir = dir;
      }
      revs = revs.filter(function (r) { return t - r < 900; });
      if (revs.length >= 3) { tickle(t, e); revs = revs.slice(-1); pts = [pts[pts.length - 1]]; return; }
      // lange haal omlaag = knuffel, omhoog = tegen de haren in
      let first = pts[0];
      for (let i = 0; i < pts.length; i++) { if (t - pts[i].t <= 700) { first = pts[i]; break; } }
      const vx = p[0] - first.x, vy = p[1] - first.y;
      if (Math.abs(vy) > 45 && Math.abs(vy) > 1.6 * Math.abs(vx)) {
        if (vy > 0) cuddle(Date.now(), e); else strokeUp(Date.now());
        pts = [pts[pts.length - 1]];
      }
    }
    function onUp(e) {
      if (!down) return;
      down = false;
      const p = local(e);
      if (Math.hypot(p[0] - startX, p[1] - startY) < 10 && e.timeStamp - startT < 300) tap(e);
      setTimeout(function () { $$('#home-art .pb-look').forEach(function (g) { g.style.transform = ''; }); }, 600);
    }
    return { onDown: onDown, onMove: onMove, onUp: onUp, reset: reset };
  })();

  /* ---------- poetsen ---------- */
  const B = { state: 'idle', duration: 120, elapsed: 0, base: 0, startAt: 0, raf: 0, quadrant: -1, tooth: -1, startedAt: null, timers: [], tipTimer: 0, foamTimer: 0, egg: false, spots: [], hls: [], shines: [], segs: [], teeth: [] };

  function clearBrushTimers() {
    B.timers.forEach(clearTimeout);
    B.timers = [];
    clearInterval(B.tipTimer);
    clearInterval(B.foamTimer);
    cancelAnimationFrame(B.raf);
  }

  function startBrush() {
    const state = lifeState();
    if (state !== 'wait' && state !== 'egg') { renderHome(); return; }
    Sound.unlock();
    Sound.tap();
    B.duration = Number(S.settings.duration) || 120;
    B.elapsed = 0; B.base = 0; B.quadrant = -1; B.tooth = -1; B.startedAt = new Date();
    B.state = 'countdown';
    B.egg = !S.hatched;
    show('brush');
    const sp = speciesById(S.species);
    $('#brush-scene').innerHTML = sceneSVG(S.outfit.achtergrond);
    $('#brush-art').innerHTML = B.egg ? eggSVG(sp, { cracks: 0 }) : creatureSVG(S.outfit, { mode: 'brush', viewBox: '40 66 220 220' });
    B.spots = $$('#brush-art [data-q]');
    B.hls = $$('#brush-art [data-hl]');
    B.shines = $$('#brush-art [data-shine]');
    $('#brush-chart').innerHTML = chartSVG();
    B.teeth = $$('#brush-chart .mc-tooth').map(function (g) {
      return { dirt: $('.mc-dirt', g), spots: $$('.mc-spot', g), shine: $('.mc-shine', g), last: -1 };
    });
    $('#brush-bar').innerHTML = [0, 1, 2, 3].map(function () { return '<span class="seg"><i></i></span>'; }).join('');
    B.segs = $$('#brush-bar i');
    $('#brush-sheet').hidden = true;
    $('#brush-tip').textContent = B.egg ? 'Poets goed, dan komt het ei uit!' : 'Zet je tandenborstel klaar…';
    $('#scr-brush').classList.remove('is-brushing', 'is-paused');
    placeBrush(0, true);
    renderQuads();
    updateBrush();
    Log.info('poetsen: aftellen', { duur: B.duration, deel: slotOf(B.startedAt).part, ei: B.egg });

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

  // borstel op de mondkaart naar tand k
  function placeBrush(k, instant) {
    const t = CHART[clamp(k, 0, 15)];
    const el = $('#mc-brush');
    if (!el) return;
    if (instant) el.style.transition = 'none';
    el.style.transform = 'translate(' + t.x + 'px,' + (t.y + t.h / 2) + 'px) scale(' + (t.x < 160 ? -1 : 1) + ',' + (t.upper ? 1 : -1) + ')';
    if (instant) { void el.getBoundingClientRect(); el.style.transition = ''; }
  }
  // kleine borstel in de mond van het beestje
  function placeMiniBrush(q) {
    const el = $('#brush-art .pb-minibrush');
    if (!el) return;
    const pos = [[124, 206], [176, 206], [176, 250], [124, 250]][q];
    el.style.transform = 'translate(' + pos[0] + 'px,' + pos[1] + 'px) scale(' + (q === 0 || q === 3 ? -1 : 1) + ',' + (q < 2 ? 1 : -1) + ')';
  }

  function updateBrush() {
    const qd = B.duration / 4, td = B.duration / 16;
    const q = Math.min(3, Math.floor(B.elapsed / qd));
    const k = Math.min(15, Math.floor(B.elapsed / td));
    $('#brush-timer').textContent = fmtTime(B.duration - B.elapsed);
    // tanden op de mondkaart
    B.teeth.forEach(function (tt, i) {
      const d = 1 - clamp((B.elapsed - i * td) / td, 0, 1);
      const r = Math.round(d * 100);
      if (r === tt.last) return;
      tt.last = r;
      tt.dirt.setAttribute('opacity', (d * 0.75).toFixed(2));
      tt.spots.forEach(function (s) { s.setAttribute('opacity', d.toFixed(2)); });
      tt.shine.classList.toggle('on', d <= 0.001);
    });
    // beestje of ei
    const dirt = [0, 1, 2, 3].map(function (i) { return 1 - clamp((B.elapsed - i * qd) / qd, 0, 1); });
    B.spots.forEach(function (el) { el.setAttribute('opacity', dirt[Number(el.getAttribute('data-q'))].toFixed(2)); });
    B.shines.forEach(function (el) { el.classList.toggle('on', dirt[Number(el.getAttribute('data-shine'))] <= 0.001); });
    B.segs.forEach(function (el, i) { el.style.width = ((1 - dirt[i]) * 100).toFixed(1) + '%'; });
    if (B.egg) {
      const cracks = dirt.filter(function (d) { return d <= 0.001; }).length;
      $$('#brush-art .egg-crack').forEach(function (c, i) { c.setAttribute('opacity', i < cracks ? '1' : '0'); });
    }
    if (B.state === 'running' && k !== B.tooth) {
      B.tooth = k;
      placeBrush(k);
    }
    if (B.state === 'running' && q !== B.quadrant) {
      if (B.quadrant >= 0) {
        Sound.swap();
        buzz(120);
        Log.info('wissel naar ' + QUADS[q], { seconde: Math.round(B.elapsed) });
        $('#brush-tip').textContent = 'Nu: ' + QUADS[q].toLowerCase() + '!';
        if (B.egg) { Sound.crack(); }
      }
      B.quadrant = q;
      renderQuads();
    }
  }

  function renderQuads() {
    const active = B.quadrant < 0 ? 0 : B.quadrant;
    B.hls.forEach(function (el) { el.classList.toggle('on', Number(el.getAttribute('data-hl')) === active); });
    $$('#brush-chart .mc-hl').forEach(function (el) { el.classList.toggle('on', Number(el.getAttribute('data-q')) === active); });
    $('#mc-label').textContent = QUADS[active];
    placeMiniBrush(active);
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
    $('#scr-brush').classList.add('is-paused');
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
    $('#scr-brush').classList.remove('is-paused');
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
    $('#scr-brush').classList.remove('is-brushing', 'is-paused');
    $('#brush-sheet').hidden = true;
    const secs = Math.round(B.elapsed);
    const slot = slotOf(B.startedAt);
    if (secs >= 5 || completed) {
      S.sessions.push({ at: B.startedAt.toISOString(), day: slot.day, part: slot.part, seconds: secs, target: B.duration, completed: !!completed });
      if (S.sessions.length > 400) S.sessions = S.sessions.slice(-400);
    }
    if (!completed) {
      Store.save(S);
      Log.info('poetsbeurt gestopt', { seconden: secs, doel: B.duration });
      show('home');
      toast('Poets de hele tijd, dan krijg je een cadeautje!');
      return;
    }
    const firstOfSlot = completedSessions().filter(function (x) { return x.day === slot.day && x.part === slot.part; }).length === 1;
    // volgorde: eerst uitkomen, dan het cadeau van deze beurt (en bonus), daarna wat er al klaarlag
    const waiting = S.giftQueue.filter(function (g) { return g.reason !== 'hatch'; });
    const fresh = [];
    if (!S.hatched) fresh.push({ reason: 'hatch' });
    if (firstOfSlot) {
      fresh.push({ min: 'gewoon', reason: 'poetsbeurt' });
      const today = daySummary(slot.day);
      if (today.ochtend && today.avond) {
        const st = streak();
        if (st === 3 || (st > 0 && st % 7 === 0)) {
          fresh.push({ min: 'zeldzaam', reason: 'reeks', days: st });
          Log.info('bonus voor reeks', st + ' dagen');
        }
      }
    }
    S.giftQueue = fresh.concat(waiting);
    const before = waiting.length;
    Store.save(S);
    Sound.done();
    buzz([80, 60, 80]);
    Log.info('poetsbeurt klaar', { seconden: secs, deel: slot.part, cadeaus: S.giftQueue.length - before, eersteVanDagdeel: firstOfSlot });
    if (S.giftQueue.length) { show('reward'); confetti(); }
    else { show('home'); toast('Super schoon! Je had al een cadeautje gehad.'); }
  }

  /* ---------- cadeautje en uitkomen ---------- */
  let opening = false, revealed = null, hatchTaps = 0;
  function renderReward() {
    const g = S.giftQueue[0];
    opening = false;
    revealed = null;
    hatchTaps = 0;
    $('#btn-gift').classList.remove('is-open');
    $('#btn-gift').hidden = false;
    $('#hatch').hidden = true;
    $('#btn-hatch-next').hidden = true;
    $('.reward-stage').classList.remove('is-revealed');
    $('#reveal').hidden = true;
    $('#reward-actions').hidden = true;
    $('#reward-art').hidden = false;
    if (!g) { show('home'); return; }
    if (g.reason === 'hatch') {
      const sp = speciesById(S.species);
      $('#reward-title').textContent = 'Je ei komt uit!';
      $('#reward-sub').textContent = 'Tik een paar keer op het ei';
      $('#btn-gift').hidden = true;
      $('#reward-art').hidden = true;
      $('#hatch').hidden = false;
      $('#hatch').innerHTML = eggSVG(sp, { cracks: 1, cls: 'is-hatching', label: 'Ei, tik erop', creature: creatureSVG(S.outfit, { inner: true, mode: 'happy', shiny: true }) });
      return;
    }
    let title = 'Super gepoetst!';
    if (g.reason === 'reeks') title = 'Bonus! ' + g.days + ' dagen op rij';
    if (g.reason === 'ouders') title = 'Een cadeautje van je ouders!';
    if (g.reason === 'poetsbeurt' && S.kidName) title = 'Super gepoetst, ' + S.kidName + '!';
    $('#reward-title').textContent = title;
    $('#reward-sub').textContent = S.giftQueue.length > 1 ? 'Tik op je cadeautje. Er liggen er ' + S.giftQueue.length + ' klaar!' : 'Tik op je cadeautje';
    $('#reward-art').innerHTML = creatureSVG(S.outfit, { mode: 'happy', shiny: true });
  }

  function tapHatch() {
    if (opening || !hatchPending()) return;
    const svg = $('#hatch .egg-svg');
    if (!svg) return;
    hatchTaps++;
    Sound.unlock(); Sound.crack(); buzz(30);
    svg.classList.remove('is-tapped'); void svg.getBoundingClientRect(); svg.classList.add('is-tapped');
    $$('#hatch .egg-crack').forEach(function (c, i) { c.setAttribute('opacity', i <= hatchTaps ? '1' : '0'); });
    if (hatchTaps >= 4) openHatch();
  }
  function openHatch() {
    opening = true;
    const sp = speciesById(S.species);
    S.giftQueue = S.giftQueue.filter(function (g) { return g.reason !== 'hatch'; });
    S.hatched = true;
    S.hatchedAt = new Date().toISOString();
    Store.save(S);
    Log.info('ei uitgekomen', { dier: sp.id, naam: S.creatureName });
    const svg = $('#hatch .egg-svg');
    svg.classList.add('is-open');
    Sound.pop();
    setTimeout(function () { svg.classList.add('is-out'); confetti(); Sound.done(); }, 900);
    $('#reward-title').textContent = 'Het is een ' + sp.name.toLowerCase() + '!';
    $('#reward-sub').textContent = 'Zeg hallo tegen ' + S.creatureName + '!';
    justHatched = true;
    setTimeout(function () {
      const b = $('#btn-hatch-next');
      b.textContent = 'Hoi ' + S.creatureName + '!';
      b.hidden = false;
      b.focus();
      opening = false;
    }, reduceMotion() ? 50 : 1200);
  }

  function openGift() {
    if (opening) return;
    const g = S.giftQueue[0];
    if (!g || g.reason === 'hatch') { renderReward(); return; }
    S.giftQueue.shift();
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
      opening = false;
    }, reduceMotion() ? 50 : 650);
  }

  /* ---------- kledingkast ---------- */
  let wardrobeSlot = 'hoofd';
  function renderWardrobe() {
    if (lifeState() !== 'play') { show('home'); say('Eerst tandjes poetsen, dan mogen we me aankleden!', 2500); return; }
    $('#wardrobe-scene').innerHTML = sceneSVG(S.outfit.achtergrond);
    $('#wardrobe-art').innerHTML = creatureSVG(S.outfit, { mode: 'smile' });
    $('#wardrobe-progress').textContent = S.owned.length + ' van ' + ITEMS.length;
    updatePlayChip();
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
    $$('input[name="play-evening"]').forEach(function (r) { r.checked = Number(r.value) === Number(S.settings.playEvening); });
    $$('input[name="play-morning"]').forEach(function (r) { r.checked = Number(r.value) === Number(S.settings.playMorning); });
    $('#in-sound').checked = !!S.settings.sound;
    $('#in-vibrate').checked = !!S.settings.vibrate;
    const sp = S.species ? speciesById(S.species) : null;
    $('#parent-species').textContent = sp ? (sp.name + (S.hatched ? ' · ' + S.creatureName : ' · nog in het ei')) : 'Nog geen ei gekozen';
    $('#btn-new-egg').dataset.armed = '';
    $('#btn-new-egg').textContent = 'Ander ei kiezen';

    const done = completedSessions();
    const since = new Date(); since.setDate(since.getDate() - 13); since.setHours(0, 0, 0, 0);
    const recent = S.sessions.filter(function (x) { return new Date(x.at) >= since; });
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

  const RENDER = { egg: renderEgg, home: renderHome, reward: renderReward, wardrobe: renderWardrobe, parent: renderParent };

  /* =========================================================
     KNOPPEN
     ========================================================= */
  function on(id, fn) {
    const el = $(id);
    if (!el) { Log.error('knop ontbreekt in index.html', id); return; }
    el.addEventListener('click', fn);
  }
  function twoTap(btn, label, fn) {
    if (btn.dataset.armed !== '1') { btn.dataset.armed = '1'; btn.textContent = label; return; }
    btn.dataset.armed = '';
    fn();
  }

  function bind() {
    $('#egg-grid').addEventListener('click', function (e) {
      const b = e.target.closest('[data-species]');
      if (b) pickEgg(b.getAttribute('data-species'));
    });
    on('#btn-egg-ok', confirmEgg);

    on('#btn-brush', startBrush);
    on('#btn-wardrobe', function () {
      Sound.unlock();
      if (lifeState() !== 'play') {
        const st = lifeState();
        say(st === 'sleep' ? 'Sssst... morgen weer aankleden.' : st === 'away' ? 'Straks weer, als ik terug ben!' : st === 'egg' ? 'Eerst moet ik uit het ei komen!' : 'Eerst tandjes poetsen, dan mogen we me aankleden!', 2600);
        const b = $('#btn-wardrobe'); b.classList.remove('is-no'); void b.offsetWidth; b.classList.add('is-no');
        setTimeout(function () { b.classList.remove('is-no'); }, 450);
        Log.info('kledingkast op slot', st);
        return;
      }
      Sound.tap();
      show('wardrobe');
    });
    on('#btn-pending', function () { Sound.unlock(); show('reward'); });
    on('#btn-parent', function () { Sound.unlock(); openGate(); });

    const art = $('#home-art');
    art.addEventListener('pointerdown', Pet.onDown);
    art.addEventListener('pointermove', Pet.onMove);
    art.addEventListener('pointerup', Pet.onUp);
    art.addEventListener('pointercancel', Pet.onUp);

    on('#btn-stop', function () { if (B.state === 'paused') return; pauseBrush('stopknop', true); });
    on('#btn-pause', function () { pauseBrush('pauzeknop', false); });
    on('#btn-resume', resumeBrush);
    on('#btn-quit', function () { finishBrush(false); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && (B.state === 'running' || B.state === 'countdown')) pauseBrush('app op de achtergrond', false);
      if (!document.hidden && current === 'home' && !ending) renderHome();
    });

    on('#btn-gift', openGift);
    on('#hatch', tapHatch);
    on('#btn-hatch-next', function () { renderReward(); });
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
      const v = e.target.value.trim().slice(0, 18) || (S.species ? speciesById(S.species).defaultName : 'Bubbel');
      S.creatureName = v; e.target.value = v; Store.save(S); Log.info('naam beestje gewijzigd', v);
    });
    $('#in-kid').addEventListener('change', function (e) {
      S.kidName = e.target.value.trim().slice(0, 18); Store.save(S); Log.info('naam kind gewijzigd');
    });
    [['duration', 'duration', 'poetstijd'], ['play-evening', 'playEvening', 'speeltijd avond'], ['play-morning', 'playMorning', 'speeltijd ochtend']].forEach(function (c) {
      $$('input[name="' + c[0] + '"]').forEach(function (r) {
        r.addEventListener('change', function () {
          S.settings[c[1]] = Number(r.value); Store.save(S); Log.info(c[2] + ' ingesteld', S.settings[c[1]] + 's');
        });
      });
    });
    $('#in-sound').addEventListener('change', function (e) { S.settings.sound = e.target.checked; Store.save(S); Log.info('geluid', S.settings.sound ? 'aan' : 'uit'); });
    $('#in-vibrate').addEventListener('change', function (e) { S.settings.vibrate = e.target.checked; Store.save(S); Log.info('trillen', S.settings.vibrate ? 'aan' : 'uit'); });
    on('#btn-parent-gift', function () {
      S.giftQueue.push({ min: 'gewoon', reason: 'ouders' });
      Store.save(S);
      Log.info('cadeautje klaargezet door ouder');
      toast('Klaargezet. Je kind opent het na het poetsen.');
    });
    on('#btn-new-egg', function (e) {
      twoTap(e.currentTarget, 'Tik nog een keer: nieuw ei kiezen', function () {
        S.species = null; S.hatched = false;
        S.giftQueue = S.giftQueue.filter(function (g) { return g.reason !== 'hatch'; });
        Store.save(S);
        Log.info('ouder kiest een ander ei (spullen blijven)');
        show('egg');
      });
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
      twoTap(e.currentTarget, 'Tik nog een keer om alles te wissen', function () {
        Log.warn('spel gewist door ouder');
        Store.wipe();
        S = Store.fresh();
        Store.save(S);
        show('egg');
        toast('Alles is gewist. Kies een nieuw ei!');
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!$('#gate').hidden) closeGate();
        else if (current === 'brush' && B.state === 'running') pauseBrush('Escape-toets', false);
      }
    });
    setInterval(homeTick, 500);
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
      if (i.slot === 'kleur' && !i.palette && !i.natural) problems.push('kleur zonder palet ' + i.id);
      if (i.slot === 'achtergrond' && !i.scene) problems.push('wereld zonder tekening ' + i.id);
      if (i.slot === 'kleding' && !i.torso && !i.front) problems.push('kleding zonder tekening ' + i.id);
      if (['kleur', 'achtergrond', 'kleding'].indexOf(i.slot) < 0 && !i.front) problems.push('item zonder tekening ' + i.id);
    });
    SLOTS.forEach(function (s) { if (!IC[s.id]) problems.push('geen icoon voor vakje ' + s.id); });
    if (!EGG) problems.push('data/species.js niet geladen (eieren)');
    SPECIES.forEach(function (sp) {
      try { creatureSVG(Store.fresh().outfit, { species: sp.id }); eggSVG(sp, {}); }
      catch (e) { problems.push('dier ' + sp.id + ' tekent niet: ' + e.message); }
    });
    if (problems.length) Log.error('zelftest', problems);
    else Log.info('zelftest ok', ITEMS.length + ' items in ' + SLOTS.length + ' vakjes, ' + SPECIES.length + ' dieren');
  }

  function init() {
    if (!ART || !ITEMS.length || !SPECIES.length || !EGG) {
      Log.error('tekeningen niet geladen', { items: !!ITEMS.length, dieren: !!SPECIES.length, ei: !!EGG });
      document.body.insertAdjacentHTML('afterbegin', '<p style="padding:16px">De tekeningen konden niet laden. Ververs de pagina.</p>');
      return;
    }
    $('#pb-defs').innerHTML = ART.DEFS + EGG.DEFS;
    S = Store.load();
    selfCheck();
    const mm = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
    Log.setHeader([
      'Toestel: ' + navigator.userAgent,
      'Scherm ' + window.innerWidth + 'x' + window.innerHeight + ' @' + (window.devicePixelRatio || 1) + 'x · ' +
        (mm('(display-mode: standalone)') ? 'als app op beginscherm' : 'in browser') + ' · ' +
        (mm('(prefers-color-scheme: dark)') ? 'donker thema' : 'licht thema') + ' · ' + (PREVIEW ? 'preview' : location.host || 'bestand'),
      'Opslag: ' + (Log.storageOk() ? 'werkt' : 'GEBLOKKEERD (spel wordt niet bewaard)'),
      'Spel bij start: dier ' + (S.species || 'nog geen') + (S.species && !S.hatched ? ' (in ei)' : '') + ', status ' + lifeState() + ', ' +
        S.owned.length + '/' + ITEMS.length + ' spullen, ' + completedSessions().length + ' beurten, reeks ' + streak() +
        ', ' + S.giftQueue.length + ' cadeau(s) klaar, poetstijd ' + S.settings.duration + 's, speeltijd ' + S.settings.playEvening + 's/' + S.settings.playMorning + 's'
    ]);
    Log.info('app gestart', { versie: VERSION });
    bind();
    show(S.species ? 'home' : 'egg');
    Log.enableRemote();
    if (!PREVIEW && 'serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js')
        .then(function () { Log.info('offline-modus actief (service worker)'); })
        .catch(function (e) { Log.warn('offline-modus niet gestart', e.message); });
    }
  }

  // voor debuggen in de browserconsole: Poetsbeestje.log() toont de log
  window.Poetsbeestje = {
    version: VERSION,
    log: function () { return Log.text(); },
    state: function () { return lifeState(); },
    creatureSVG: creatureSVG, eggSVG: eggSVG, sceneSVG: sceneSVG, thumbSVG: thumbSVG
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
