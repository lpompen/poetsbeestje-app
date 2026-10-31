/* Poetsbeestje — data/items.js
   Alle tekeningen (SVG) van het beestje, de kleding en de werelden.
   Coördinaten: één tekenvlak van 300 x 340. Het beestje staat in het midden,
   ogen op (118,165) en (182,165), mond rond y 210-250, voeten op y 308,
   rechterhand op (268,190).

   Een item heeft:  id, slot, name, rarity (gewoon | zeldzaam | super),
   front (svg vóór het lijf), optioneel back (svg achter het lijf),
   thumb (viewBox voor het plaatje in de kledingkast), start (meteen in bezit).
*/
(function () {
  'use strict';

  /* ---------- kleine tekenhulpjes ---------- */
  function n(v) { return Math.round(v * 10) / 10; }

  function star(cx, cy, R, r, points) {
    const p = points || 5;
    let d = '';
    for (let i = 0; i < p * 2; i++) {
      const rad = i % 2 ? r : R;
      const a = -Math.PI / 2 + (i * Math.PI) / p;
      d += (i ? 'L' : 'M') + n(cx + rad * Math.cos(a)) + ' ' + n(cy + rad * Math.sin(a)) + ' ';
    }
    return d + 'Z';
  }

  function sparkle(cx, cy, s, fill, opacity) {
    return '<path d="M' + cx + ' ' + (cy - s) + ' Q' + cx + ' ' + cy + ' ' + (cx + s) + ' ' + cy +
      ' Q' + cx + ' ' + cy + ' ' + cx + ' ' + (cy + s) + ' Q' + cx + ' ' + cy + ' ' + (cx - s) + ' ' + cy +
      ' Q' + cx + ' ' + cy + ' ' + cx + ' ' + (cy - s) + 'Z" fill="' + (fill || '#FFFFFF') + '"' +
      (opacity ? ' opacity="' + opacity + '"' : '') + '/>';
  }

  function rng(seed) {
    let s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function starField(count, seed, x0, y0, w, h, color, maxR) {
    const r = rng(seed);
    let out = '';
    for (let i = 0; i < count; i++) {
      out += '<circle cx="' + n(x0 + r() * w) + '" cy="' + n(y0 + r() * h) + '" r="' + n(0.6 + r() * maxR) +
        '" fill="' + color + '" opacity="' + n(0.45 + r() * 0.55) + '"/>';
    }
    return out;
  }

  function bothFeet(fn) { return fn(112) + fn(188); }

  function heart(cx, cy, s) {
    return 'M' + cx + ' ' + n(cy + s * 0.9) +
      ' C' + n(cx - s * 1.6) + ' ' + n(cy - s * 0.1) + ' ' + n(cx - s * 0.9) + ' ' + n(cy - s * 1.3) + ' ' + cx + ' ' + n(cy - s * 0.45) +
      ' C' + n(cx + s * 0.9) + ' ' + n(cy - s * 1.3) + ' ' + n(cx + s * 1.6) + ' ' + n(cy - s * 0.1) + ' ' + cx + ' ' + n(cy + s * 0.9) + ' Z';
  }

  function flower(cx, cy, r, petal, middle) {
    let out = '';
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      out += '<circle cx="' + n(cx + Math.cos(a) * r) + '" cy="' + n(cy + Math.sin(a) * r) + '" r="' + n(r * 0.85) + '" fill="' + petal + '"/>';
    }
    return out + '<circle cx="' + cx + '" cy="' + cy + '" r="' + n(r * 0.7) + '" fill="' + middle + '"/>';
  }

  function leaf(x, y, rot, s, color) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + s + ')">' +
      '<path d="M0 0 Q34 -44 0 -100 Q-34 -44 0 0Z" fill="' + color + '"/>' +
      '<path d="M0 -4 L0 -88" stroke="#FFFFFF" stroke-opacity=".35" stroke-width="3" fill="none"/></g>';
  }

  function pumpkin(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<ellipse cx="-10" cy="0" rx="14" ry="16" fill="#F27A12"/><ellipse cx="10" cy="0" rx="14" ry="16" fill="#F27A12"/>' +
      '<ellipse cx="0" cy="0" rx="13" ry="17" fill="#FF9A33"/><rect x="-2.5" y="-23" width="5" height="9" rx="2" fill="#3DAA5C"/>' +
      '<path d="M-9 -4 l4 -5 l4 5z M1 -4 l4 -5 l4 5z" fill="#FFE27A"/><path d="M-9 5 q9 7 18 0 q-9 3 -18 0z" fill="#FFE27A"/></g>';
  }

  function bat(x, y) {
    return '<path d="M' + x + ' ' + y + ' q-6 -8 -16 -4 q6 2 4 8 q6 -4 12 2 q6 -6 12 -2 q-2 -6 4 -8 q-10 -4 -16 4z" fill="#2A1645"/>';
  }

  /* ---------- het beestje zelf ---------- */
  const BODY = 'M150 88 C215 88 258 140 258 205 C258 270 212 312 150 312 C88 312 42 270 42 205 C42 140 85 88 150 88Z';
  const SMILE = 'M114 206 Q150 220 186 206 Q150 262 114 206Z';
  const MOUTH_OPEN = { x: 96, y: 194, w: 108, h: 66, rx: 26 };

  const DEFS =
    '<linearGradient id="pb-g-bath" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E3F9FF"/><stop offset="1" stop-color="#A9E6F8"/></linearGradient>' +
    '<linearGradient id="pb-g-beach" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FD8F7"/><stop offset="1" stop-color="#E2F8FF"/></linearGradient>' +
    '<linearGradient id="pb-g-space" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120C3A"/><stop offset="1" stop-color="#3A2690"/></linearGradient>' +
    '<linearGradient id="pb-g-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#39CBEA"/><stop offset="1" stop-color="#0A5F93"/></linearGradient>' +
    '<linearGradient id="pb-g-jungle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D5F7B5"/><stop offset="1" stop-color="#5CC27E"/></linearGradient>' +
    '<linearGradient id="pb-g-castle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC9E3"/><stop offset="1" stop-color="#FFF3F9"/></linearGradient>' +
    '<linearGradient id="pb-g-aurora" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#08202E"/><stop offset="1" stop-color="#145A6A"/></linearGradient>' +
    '<linearGradient id="pb-g-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2D1650"/><stop offset=".55" stop-color="#8E3B7A"/><stop offset="1" stop-color="#FF9A4D"/></linearGradient>' +
    '<linearGradient id="pb-rainbow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF6B8B"/><stop offset=".2" stop-color="#FFB347"/><stop offset=".4" stop-color="#FFE45C"/><stop offset=".6" stop-color="#5EE0B5"/><stop offset=".8" stop-color="#4FB3FF"/><stop offset="1" stop-color="#A98BFF"/></linearGradient>' +
    '<radialGradient id="pb-galaxy" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#6A4FE0"/><stop offset=".6" stop-color="#3A2690"/><stop offset="1" stop-color="#1A1048"/></radialGradient>' +
    '<linearGradient id="pb-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE98A"/><stop offset="1" stop-color="#F2A900"/></linearGradient>' +
    '<radialGradient id="pb-glass" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".45"/><stop offset="1" stop-color="#BDEBFF" stop-opacity=".12"/></radialGradient>' +
    '<clipPath id="pb-body-clip"><path d="' + BODY + '"/></clipPath>' +
    '<clipPath id="pb-smile-clip"><path d="' + SMILE + '"/></clipPath>' +
    '<clipPath id="pb-mouth-clip"><rect x="' + MOUTH_OPEN.x + '" y="' + MOUTH_OPEN.y + '" width="' + MOUTH_OPEN.w + '" height="' + MOUTH_OPEN.h + '" rx="' + MOUTH_OPEN.rx + '"/></clipPath>';

  window.PB_ART = {
    BODY: BODY,
    SMILE: SMILE,
    MOUTH_OPEN: MOUTH_OPEN,
    HORN_L: 'M94 112 Q96 80 106 60 Q122 78 128 102 Z',
    HORN_R: 'M206 112 Q204 80 194 60 Q178 78 172 102 Z',
    BODY_STARS: starField(34, 11, 42, 88, 216, 224, '#FFFFFF', 2.2) + sparkle(96, 250, 6, '#FFE27A') + sparkle(214, 120, 5, '#FFE27A') + sparkle(196, 282, 4, '#FFFFFF'),
    DEFS: DEFS,
    star: star,
    sparkle: sparkle
  };

  /* ---------- vakjes in de kledingkast ---------- */
  window.PB_SLOTS = [
    { id: 'hoofd', name: 'Hoofd', removable: true, thumb: '55 0 190 125' },
    { id: 'ogen', name: 'Ogen', removable: true, thumb: '50 112 200 104' },
    { id: 'nek', name: 'Versiering', removable: true, thumb: '45 232 210 100' },
    { id: 'hand', name: 'In de hand', removable: true, thumb: '215 40 85 170' },
    { id: 'voeten', name: 'Voeten', removable: true, thumb: '72 270 156 68' },
    { id: 'kleur', name: 'Kleur', removable: false },
    { id: 'achtergrond', name: 'Wereld', removable: false }
  ];

  /* ---------- kleuren voor het lijf ---------- */
  const kleuren = [
    { id: 'k-mint', name: 'Muntgroen', rarity: 'gewoon', start: true, palette: { body: '#5EE0B5', shade: '#30B48B', belly: '#CBF7E7', horn: '#FFD166' } },
    { id: 'k-roze', name: 'Suikerspinroze', rarity: 'gewoon', palette: { body: '#FF8DC1', shade: '#E15E9C', belly: '#FFD8EB', horn: '#8FE3FF' } },
    { id: 'k-blauw', name: 'Oceaanblauw', rarity: 'gewoon', palette: { body: '#4FB3FF', shade: '#2B84D6', belly: '#CDEBFF', horn: '#FFD166' } },
    { id: 'k-paars', name: 'Druivenpaars', rarity: 'gewoon', palette: { body: '#A98BFF', shade: '#7C5BDF', belly: '#E5DBFF', horn: '#6EF0C8' } },
    { id: 'k-oranje', name: 'Mandarijn', rarity: 'gewoon', palette: { body: '#FFA24C', shade: '#DE7A21', belly: '#FFE1C2', horn: '#7BD7FF' } },
    { id: 'k-geel', name: 'Zonnegeel', rarity: 'zeldzaam', palette: { body: '#FFD84D', shade: '#DDAF1C', belly: '#FFF4C4', horn: '#FF7FB0' } },
    { id: 'k-regenboog', name: 'Regenboog', rarity: 'super', palette: { body: 'url(#pb-rainbow)', shade: '#B678E8', belly: '#FFF6FB', horn: '#FFFFFF' } },
    { id: 'k-sterren', name: 'Sterrenhemel', rarity: 'super', palette: { body: 'url(#pb-galaxy)', shade: '#2A1F66', belly: '#5B4BB7', horn: '#FFD166', stars: true } }
  ].map(function (i) { i.slot = 'kleur'; return i; });

  /* ---------- hoofd ---------- */
  const flowerRing = (function () {
    const colors = ['#FF8DC1', '#FFC83A', '#FFFFFF', '#A98BFF', '#FF8DC1', '#FFC83A', '#FFFFFF'];
    let leaves = '', flowers = '';
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.12 + (i * 0.76) / 6);
      const x = n(150 - Math.cos(a) * 74), y = n(114 - Math.sin(a) * 30);
      leaves += '<ellipse cx="' + n(x + 9) + '" cy="' + n(y + 4) + '" rx="8" ry="4" fill="#3DBA6E" transform="rotate(25 ' + n(x + 9) + ' ' + n(y + 4) + ')"/>';
      flowers += flower(x, y, 7.5, colors[i], i % 2 ? '#FF8A1F' : '#FFC83A');
    }
    return leaves + flowers;
  })();

  const hoofd = [
    { id: 'h-pet', name: 'Pet', rarity: 'gewoon', front:
      '<path d="M96 104 Q94 52 150 50 Q206 52 204 104 Z" fill="#3F8CFF"/>' +
      '<path d="M150 102 Q200 94 246 102 Q254 112 240 116 Q196 110 150 112 Z" fill="#2563D9"/>' +
      '<path d="M96 104 Q150 92 204 104 L204 111 Q150 99 96 111 Z" fill="#2563D9"/>' +
      '<path d="M150 52 L150 100" stroke="#2563D9" stroke-width="3" opacity=".6"/>' +
      '<circle cx="150" cy="51" r="7" fill="#FFC83A"/>' +
      '<path d="M114 74 Q124 60 140 58" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".35" fill="none"/>' },
    { id: 'h-feestmuts', name: 'Feestmuts', rarity: 'gewoon', front:
      '<g transform="rotate(-8 150 100)"><path d="M118 102 L150 20 L182 102 Z" fill="#FF4F8B"/>' +
      '<path d="M128.1 76 L171.9 76 L177.3 90 L122.7 90Z" fill="#FFC83A"/><path d="M139.1 48 L160.9 48 L164.8 58 L135.2 58Z" fill="#3FD0EE"/>' +
      '<circle cx="150" cy="18" r="11" fill="#FFC83A"/>' + sparkle(150, 18, 5, '#FFFFFF', '.8') + '</g>' },
    { id: 'h-heks', name: 'Heksenhoed', rarity: 'gewoon', front:
      '<ellipse cx="150" cy="104" rx="86" ry="15" fill="#3B2466"/>' +
      '<path d="M108 104 Q118 62 140 30 Q150 14 176 10 Q162 30 170 50 Q182 80 192 104 Z" fill="#4B2E83"/>' +
      '<path d="M112 92 Q150 84 190 92 L192 104 Q150 96 108 104 Z" fill="#FF8A1F"/>' +
      '<rect x="141" y="87" width="18" height="14" rx="3" fill="none" stroke="#FFC83A" stroke-width="3"/>' +
      sparkle(128, 62, 6, '#FFE27A') + sparkle(160, 44, 4, '#FFE27A') },
    { id: 'h-cowboy', name: 'Cowboyhoed', rarity: 'gewoon', front:
      '<path d="M102 100 Q100 56 124 54 Q150 64 176 54 Q200 56 198 100 Z" fill="#B5733A"/>' +
      '<path d="M102 89 Q150 97 198 89 L198 100 Q150 108 102 100 Z" fill="#7A4A1E"/>' +
      '<path d="M50 92 Q64 112 150 112 Q236 112 250 92 Q254 110 236 120 Q150 132 64 120 Q46 110 50 92 Z" fill="#C98546"/>' +
      '<path d="M150 62 L150 88" stroke="#7A4A1E" stroke-width="3" opacity=".45"/>' +
      '<path d="' + star(150, 95, 7, 3) + '" fill="#FFC83A"/>' },
    { id: 'h-bloemen', name: 'Bloemenkrans', rarity: 'gewoon', front: flowerRing },
    { id: 'h-koptelefoon', name: 'Koptelefoon', rarity: 'zeldzaam', front:
      '<path d="M70 150 Q66 60 150 58 Q234 60 230 150" stroke="#2B2B3A" stroke-width="12" fill="none" stroke-linecap="round"/>' +
      '<path d="M80 118 Q92 72 150 66" stroke="#FFFFFF" stroke-width="3" opacity=".25" fill="none"/>' +
      '<rect x="50" y="130" width="34" height="52" rx="14" fill="#FF4F8B"/><rect x="216" y="130" width="34" height="52" rx="14" fill="#FF4F8B"/>' +
      '<rect x="60" y="138" width="14" height="36" rx="7" fill="#D42C69"/><rect x="226" y="138" width="14" height="36" rx="7" fill="#D42C69"/>' },
    { id: 'h-kroon', name: 'Kroon', rarity: 'zeldzaam', front:
      '<path d="M108 104 L104 58 L128 80 L150 50 L172 80 L196 58 L192 104 Z" fill="url(#pb-gold)" stroke="#E09A00" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="106" y="91" width="88" height="13" rx="4" fill="#F2A900"/>' +
      '<circle cx="150" cy="97.5" r="5" fill="#FF4F8B"/><circle cx="126" cy="97.5" r="4" fill="#3FD0EE"/><circle cx="174" cy="97.5" r="4" fill="#23C97F"/>' +
      '<circle cx="104" cy="58" r="5" fill="#FFE98A"/><circle cx="150" cy="50" r="6" fill="#FFE98A"/><circle cx="196" cy="58" r="5" fill="#FFE98A"/>' },
    { id: 'h-piraat', name: 'Piratenhoed', rarity: 'zeldzaam', front:
      '<path d="M64 106 Q80 60 150 56 Q220 60 236 106 Q192 92 150 98 Q108 92 64 106 Z" fill="#2B2B3A"/>' +
      '<path d="M64 106 Q108 92 150 98 Q192 92 236 106" stroke="#FFC83A" stroke-width="4" fill="none"/>' +
      '<path d="M137 86 L163 94 M163 86 L137 94" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="150" cy="72" r="10" fill="#FFFFFF"/><rect x="144" y="78" width="12" height="7" rx="2" fill="#FFFFFF"/>' +
      '<circle cx="146" cy="72" r="2.6" fill="#2B2B3A"/><circle cx="154" cy="72" r="2.6" fill="#2B2B3A"/>' },
    { id: 'h-eenhoorn', name: 'Eenhoornhoorn', rarity: 'super', front:
      '<path d="M136 100 L150 18 L164 100 Z" fill="url(#pb-gold)"/>' +
      '<path d="M139 88 L161 80 M141.5 72 L158.5 64 M144 56 L156 49 M146.5 40 L153.5 36" stroke="#FF8DC1" stroke-width="4" stroke-linecap="round"/>' +
      flower(126, 100, 6, '#FF8DC1', '#FFC83A') + flower(174, 100, 6, '#A98BFF', '#FFC83A') + sparkle(176, 40, 6, '#FFE27A') },
    { id: 'h-ruimtehelm', name: 'Ruimtehelm', rarity: 'super', thumb: '20 0 260 320', front:
      '<circle cx="150" cy="168" r="122" fill="url(#pb-glass)" stroke="#FFFFFF" stroke-width="5" stroke-opacity=".85"/>' +
      '<path d="M66 116 Q90 72 138 58" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" opacity=".6" fill="none"/>' +
      '<path d="M48 250 Q150 300 252 250" stroke="#C9D3E6" stroke-width="10" fill="none" stroke-linecap="round"/>' +
      '<line x1="150" y1="46" x2="150" y2="20" stroke="#C9D3E6" stroke-width="4"/><circle cx="150" cy="17" r="8" fill="#FF4F8B"/>' }
  ].map(function (i) { i.slot = 'hoofd'; return i; });

  /* ---------- ogen ---------- */
  const ogen = [
    { id: 'o-bril', name: 'Ronde bril', rarity: 'gewoon', front:
      '<path d="M87 160 L58 152 M213 160 L242 152" stroke="#2B2B3A" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="118" cy="165" r="31" fill="#FFFFFF" fill-opacity=".12" stroke="#2B2B3A" stroke-width="6"/>' +
      '<circle cx="182" cy="165" r="31" fill="#FFFFFF" fill-opacity=".12" stroke="#2B2B3A" stroke-width="6"/>' },
    { id: 'o-zonnebril', name: 'Zonnebril', rarity: 'gewoon', front:
      '<path d="M84 148 L56 142 M216 148 L244 142" stroke="#1E2A4A" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M84 146 H146 Q148 182 120 186 Q86 186 84 146 Z" fill="#1E2A4A"/><path d="M154 146 H216 Q214 186 180 186 Q152 182 154 146 Z" fill="#1E2A4A"/>' +
      '<path d="M146 150 Q150 144 154 150" stroke="#1E2A4A" stroke-width="6" fill="none"/>' +
      '<rect x="84" y="142" width="62" height="7" rx="3.5" fill="#FF4F8B"/><rect x="154" y="142" width="62" height="7" rx="3.5" fill="#FF4F8B"/>' +
      '<path d="M96 158 L112 158 M166 158 L182 158" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".5"/>' },
    { id: 'o-hartjes', name: 'Hartjesbril', rarity: 'gewoon', front:
      '<path d="M88 160 L60 152 M212 160 L240 152" stroke="#FF2E6E" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="' + heart(118, 168, 26) + '" fill="#FF4F8B" fill-opacity=".35" stroke="#FF2E6E" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="' + heart(182, 168, 26) + '" fill="#FF4F8B" fill-opacity=".35" stroke="#FF2E6E" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M144 158 Q150 152 156 158" stroke="#FF2E6E" stroke-width="5" fill="none"/>' },
    { id: 'o-sterren', name: 'Sterrenbril', rarity: 'zeldzaam', front:
      '<path d="M86 162 L58 152 M214 162 L242 152" stroke="#FF4F8B" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="' + star(118, 166, 38, 19) + '" fill="#FFC83A" fill-opacity=".3" stroke="#FF4F8B" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="' + star(182, 166, 38, 19) + '" fill="#FFC83A" fill-opacity=".3" stroke="#FF4F8B" stroke-width="5" stroke-linejoin="round"/>' },
    { id: 'o-duikbril', name: 'Duikbril', rarity: 'zeldzaam', front:
      '<path d="M44 160 Q150 150 256 160" stroke="#2B2B3A" stroke-width="10" fill="none"/>' +
      '<rect x="82" y="134" width="136" height="62" rx="28" fill="#9BEAFB" fill-opacity=".35" stroke="#FF8A1F" stroke-width="8"/>' +
      '<path d="M100 148 Q108 140 120 140" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity=".7" fill="none"/>' +
      '<path d="M226 192 L232 120 Q234 102 250 102" stroke="#23C97F" stroke-width="9" fill="none" stroke-linecap="round"/>' },
    { id: 'o-masker', name: 'Heldenmasker', rarity: 'zeldzaam', front:
      '<path d="M76 152 L52 140 M224 152 L248 140" stroke="#B8233A" stroke-width="6" stroke-linecap="round"/>' +
      '<path fill-rule="evenodd" fill="#E53950" d="M74 150 Q110 124 150 140 Q190 124 226 150 Q232 182 206 194 Q176 200 150 184 Q124 200 94 194 Q68 182 74 150 Z ' +
      'M98 166 A20 22 0 1 0 138 166 A20 22 0 1 0 98 166 Z M162 166 A20 22 0 1 0 202 166 A20 22 0 1 0 162 166 Z"/>' }
  ].map(function (i) { i.slot = 'ogen'; return i; });

  /* ---------- versiering (nek en buik) ---------- */
  let pearls = '';
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = (1 - t) * (1 - t) * 88 + 2 * t * (1 - t) * 150 + t * t * 212;
    const y = (1 - t) * (1 - t) * 258 + 2 * t * (1 - t) * 318 + t * t * 258;
    pearls += '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="6.2" fill="#FFFFFF" stroke="#E3D9F2" stroke-width="1.5"/>';
  }

  const nek = [
    { id: 'n-strik', name: 'Strikje', rarity: 'gewoon', front:
      '<path d="M150 276 L116 258 Q106 276 116 294 Z" fill="#FF4F8B"/><path d="M150 276 L184 258 Q194 276 184 294 Z" fill="#FF4F8B"/>' +
      '<circle cx="124" cy="270" r="3" fill="#FFFFFF"/><circle cx="122" cy="283" r="3" fill="#FFFFFF"/><circle cx="176" cy="270" r="3" fill="#FFFFFF"/><circle cx="178" cy="283" r="3" fill="#FFFFFF"/>' +
      '<rect x="141" y="267" width="18" height="18" rx="6" fill="#D42C69"/>' },
    { id: 'n-sjaal', name: 'Sjaal', rarity: 'gewoon', front:
      '<path d="M196 280 L222 280 L226 322 L200 322 Z" fill="#FF8A1F"/>' +
      '<path d="M203 322 v8 M210 322 v8 M217 322 v8 M224 322 v8" stroke="#FF8A1F" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M56 252 Q150 288 244 252 L248 272 Q150 312 52 272 Z" fill="#FF8A1F"/>' +
      '<path d="M90 263 L92 283 M126 270 L127 292 M174 270 L173 292 M210 263 L208 283" stroke="#FFC83A" stroke-width="8"/>' +
      '<path d="M199 292 L223 292 M200 306 L224 306" stroke="#FFC83A" stroke-width="6"/>' },
    { id: 'n-ketting', name: 'Parelketting', rarity: 'gewoon', front: pearls },
    { id: 'n-bandana', name: 'Bandana', rarity: 'gewoon', front:
      '<path d="M82 256 Q150 272 218 256 L150 306 Z" fill="#3F8CFF"/>' +
      '<g fill="#FFFFFF"><circle cx="118" cy="268" r="3"/><circle cx="150" cy="272" r="3"/><circle cx="182" cy="268" r="3"/><circle cx="134" cy="284" r="3"/><circle cx="166" cy="284" r="3"/><circle cx="150" cy="296" r="2.6"/></g>' },
    { id: 'n-medaille', name: 'Gouden medaille', rarity: 'zeldzaam', front:
      '<path d="M128 254 L150 286 L172 254" stroke="#3F8CFF" stroke-width="10" fill="none" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="150" cy="293" r="16" fill="url(#pb-gold)" stroke="#E09A00" stroke-width="3"/>' +
      '<path d="' + star(150, 293, 8, 3.6) + '" fill="#FFF3B0"/>' },
    { id: 'n-cape', name: 'Supercape', rarity: 'super', thumb: '0 120 300 220',
      back: '<path d="M80 150 Q150 128 220 150 L284 324 Q150 342 16 324 Z" fill="#E53950"/><path d="M110 160 L60 318 M190 160 L240 318" stroke="#B8233A" stroke-width="5" opacity=".6"/>',
      front: '<path d="M86 260 Q150 282 214 260" stroke="#E53950" stroke-width="9" fill="none" stroke-linecap="round"/>' +
        '<circle cx="150" cy="272" r="11" fill="url(#pb-gold)" stroke="#E09A00" stroke-width="2"/><path d="' + star(150, 272, 6, 2.6) + '" fill="#FFFFFF"/>' }
  ].map(function (i) { i.slot = 'nek'; return i; });

  /* ---------- in de hand (hand op 268,190) ---------- */
  let petals = '';
  for (let i = 0; i < 10; i++) {
    petals += '<ellipse cx="266" cy="76" rx="6" ry="11" fill="#FFC83A" transform="rotate(' + i * 36 + ' 266 92)"/>';
  }

  const hand = [
    { id: 'ha-tandenborstel', name: 'Tandenborstel', rarity: 'gewoon', start: true, thumb: '222 78 78 130', front:
      '<g transform="translate(268 190) rotate(12)">' +
      '<rect x="-5" y="-64" width="10" height="74" rx="5" fill="#4FB3FF"/><rect x="-6" y="-30" width="12" height="16" rx="5" fill="#2B84D6"/>' +
      '<rect x="-7" y="-92" width="14" height="32" rx="6" fill="#4FB3FF"/>' +
      '<rect x="5" y="-90" width="10" height="26" rx="3" fill="#FFFFFF" stroke="#BFE8FF" stroke-width="1.5"/>' +
      '<path d="M8 -84 h6 M8 -77 h6 M8 -70 h6" stroke="#7CCFEA" stroke-width="2"/>' +
      '<path d="M10 -92 q4 -8 10 -4 q4 4 -2 6z" fill="#FFFFFF" stroke="#BFE8FF" stroke-width="1"/></g>' },
    { id: 'ha-ballon', name: 'Ballon', rarity: 'gewoon', thumb: '222 30 78 170', front:
      '<path d="M268 190 C254 160 280 132 262 100" stroke="#5B6B8A" stroke-width="2" fill="none"/>' +
      '<ellipse cx="262" cy="70" rx="24" ry="29" fill="#FF4F6D"/><path d="M256 100 l6 -6 l6 6z" fill="#E03252"/>' +
      '<ellipse cx="252" cy="60" rx="6" ry="10" fill="#FFFFFF" opacity=".45" transform="rotate(-20 252 60)"/>' },
    { id: 'ha-appel', name: 'Appel', rarity: 'gewoon', thumb: '240 130 60 75', front:
      '<circle cx="277" cy="175" r="17" fill="#FF4A4A"/><ellipse cx="270" cy="169" rx="4" ry="6" fill="#FFFFFF" opacity=".5"/>' +
      '<path d="M277 159 q2 -9 6 -11" stroke="#7A4A1E" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M281 151 q10 -6 14 2 q-8 6 -14 -2z" fill="#3DBA6E"/>' },
    { id: 'ha-zonnebloem', name: 'Zonnebloem', rarity: 'gewoon', thumb: '230 50 70 155', front:
      '<path d="M268 196 Q273 150 266 104" stroke="#3DAA5C" stroke-width="5" fill="none"/>' +
      '<path d="M270 150 q18 -12 26 0 q-14 10 -26 0z" fill="#3DBA6E"/>' + petals +
      '<circle cx="266" cy="92" r="10" fill="#8B5A2B"/><circle cx="263" cy="89" r="1.6" fill="#5C3A1A"/><circle cx="269" cy="94" r="1.6" fill="#5C3A1A"/>' },
    { id: 'ha-pompoen', name: 'Pompoenlampje', rarity: 'gewoon', thumb: '240 140 60 70', front:
      '<path d="M268 186 Q268 162 278 160" stroke="#5B3A1E" stroke-width="3" fill="none"/>' + pumpkin(278, 178, 0.95) },
    { id: 'ha-toverstaf', name: 'Toverstaf', rarity: 'zeldzaam', thumb: '222 70 78 140', front:
      '<g transform="translate(268 190) rotate(18)"><rect x="-4" y="-70" width="8" height="80" rx="4" fill="#3B2A8C"/><rect x="-4" y="-70" width="8" height="12" fill="#FFFFFF"/>' +
      '<path d="' + star(0, -88, 20, 9) + '" fill="#FFC83A" stroke="#F2A900" stroke-width="3" stroke-linejoin="round"/></g>' +
      sparkle(290, 96, 6, '#FFE27A') + sparkle(250, 82, 5, '#FFFFFF') + sparkle(296, 128, 4, '#FFFFFF') },
    { id: 'ha-microfoon', name: 'Microfoon', rarity: 'zeldzaam', thumb: '232 100 68 108', front:
      '<g transform="translate(268 190) rotate(15)"><rect x="-5" y="-50" width="10" height="56" rx="5" fill="#2B2B3A"/>' +
      '<circle cx="0" cy="-62" r="16" fill="#C9D3E6"/><path d="M-12 -66 h24 M-13 -59 h26 M-9 -73 h18" stroke="#8C98B0" stroke-width="2"/>' +
      '<rect x="-12" y="-50" width="24" height="6" rx="3" fill="#FF4F8B"/></g>' }
  ].map(function (i) { i.slot = 'hand'; return i; });

  /* ---------- voeten ---------- */
  const voeten = [
    { id: 'v-sneakers', name: 'Sneakers', rarity: 'gewoon', front: bothFeet(function (cx) {
      return '<path d="M' + (cx - 28) + ' 312 q0 -24 22 -24 h10 q24 0 24 24 z" fill="#FF4F6D"/>' +
        '<rect x="' + (cx - 29) + '" y="309" width="58" height="10" rx="5" fill="#FFFFFF"/>' +
        '<path d="M' + (cx - 8) + ' 297 l10 5 M' + (cx - 4) + ' 292 l10 5" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>';
    }) },
    { id: 'v-laarzen', name: 'Regenlaarzen', rarity: 'gewoon', front: bothFeet(function (cx) {
      return '<rect x="' + (cx - 22) + '" y="278" width="44" height="36" rx="9" fill="#FFC83A"/>' +
        '<rect x="' + (cx - 26) + '" y="308" width="52" height="12" rx="6" fill="#E09A00"/>' +
        '<rect x="' + (cx - 22) + '" y="278" width="44" height="7" rx="3.5" fill="#FFE57A"/>';
    }) },
    { id: 'v-zwemvliezen', name: 'Zwemvliezen', rarity: 'gewoon', front: bothFeet(function (cx) {
      return '<path d="M' + (cx - 14) + ' 300 L' + (cx - 32) + ' 330 Q' + cx + ' 338 ' + (cx + 32) + ' 330 L' + (cx + 14) + ' 300 Z" fill="#23C97F"/>' +
        '<path d="M' + (cx - 8) + ' 306 L' + (cx - 16) + ' 330 M' + cx + ' 306 L' + cx + ' 333 M' + (cx + 8) + ' 306 L' + (cx + 16) + ' 330" stroke="#129A5E" stroke-width="2.5"/>' +
        '<ellipse cx="' + cx + '" cy="302" rx="18" ry="10" fill="#129A5E"/>';
    }) },
    { id: 'v-rolschaatsen', name: 'Rolschaatsen', rarity: 'zeldzaam', front: bothFeet(function (cx) {
      return '<path d="M' + (cx - 26) + ' 314 q0 -26 22 -26 h8 q22 0 22 26 z" fill="#A98BFF"/>' +
        '<rect x="' + (cx - 28) + '" y="313" width="56" height="7" rx="3.5" fill="#FFFFFF"/>' +
        '<circle cx="' + (cx - 16) + '" cy="327" r="7" fill="#FFC83A" stroke="#E09A00" stroke-width="2"/><circle cx="' + (cx + 16) + '" cy="327" r="7" fill="#FFC83A" stroke="#E09A00" stroke-width="2"/>';
    }) },
    { id: 'v-sloffen', name: 'Konijnensloffen', rarity: 'zeldzaam', front: bothFeet(function (cx) {
      return '<ellipse cx="' + (cx - 8) + '" cy="292" rx="5" ry="13" fill="#FFC2DD"/><ellipse cx="' + (cx + 8) + '" cy="292" rx="5" ry="13" fill="#FFC2DD"/>' +
        '<ellipse cx="' + (cx - 8) + '" cy="293" rx="2.4" ry="8" fill="#FF8DC1"/><ellipse cx="' + (cx + 8) + '" cy="293" rx="2.4" ry="8" fill="#FF8DC1"/>' +
        '<ellipse cx="' + cx + '" cy="311" rx="30" ry="15" fill="#FFD6E8"/>' +
        '<circle cx="' + (cx - 8) + '" cy="308" r="2.6" fill="#2B2B3A"/><circle cx="' + (cx + 8) + '" cy="308" r="2.6" fill="#2B2B3A"/><circle cx="' + cx + '" cy="314" r="2.6" fill="#FF8DC1"/>';
    }) }
  ].map(function (i) { i.slot = 'voeten'; return i; });

  /* ---------- werelden (achtergronden) ---------- */
  const tiles = (function () {
    let s = '<g stroke="#FFFFFF" stroke-opacity=".6" stroke-width="2">';
    [50, 100, 150, 200, 250].forEach(function (x) { s += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="268"/>'; });
    [45, 90, 135, 180, 225].forEach(function (y) { s += '<line x1="0" y1="' + y + '" x2="300" y2="' + y + '"/>'; });
    return s + '</g>';
  })();

  const bubbles = function (list) {
    return list.map(function (b) {
      return '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + b[2] + '" fill="#FFFFFF" fill-opacity=".55" stroke="#FFFFFF" stroke-width="1.5"/>';
    }).join('');
  };

  const achtergrond = [
    { id: 'a-badkamer', name: 'Badkamer', rarity: 'gewoon', start: true, scene:
      '<rect width="300" height="340" fill="url(#pb-g-bath)"/>' + tiles +
      '<rect x="196" y="26" width="78" height="96" rx="39" fill="#F2FDFF" stroke="#7CCFEA" stroke-width="5"/>' +
      '<path d="M214 60 Q222 44 238 40" stroke="#BDEBFA" stroke-width="6" stroke-linecap="round" fill="none"/>' +
      '<rect x="16" y="122" width="78" height="8" rx="4" fill="#7CCFEA"/>' +
      '<rect x="38" y="70" width="5" height="40" rx="2.5" fill="#FFC83A"/><rect x="48" y="64" width="5" height="46" rx="2.5" fill="#FF4F8B"/>' +
      '<path d="M30 94 H62 L58 122 H34 Z" fill="#4FB3FF"/>' +
      '<path d="M70 106 h16 a4 4 0 0 1 4 4 v12 h-24 v-12 a4 4 0 0 1 4 -4z" fill="#FFFFFF"/>' +
      '<rect y="268" width="300" height="72" fill="#86D7F2"/><rect y="268" width="300" height="6" fill="#68C4E4"/>' +
      bubbles([[28, 200, 10], [56, 236, 6], [272, 176, 8], [256, 214, 5], [282, 244, 4]]) },
    { id: 'a-strand', name: 'Strand', rarity: 'gewoon', scene:
      '<rect width="300" height="340" fill="url(#pb-g-beach)"/>' +
      '<circle cx="244" cy="62" r="44" fill="#FFE27A" opacity=".35"/><circle cx="244" cy="62" r="28" fill="#FFD23F"/>' +
      '<g fill="#FFFFFF"><ellipse cx="70" cy="58" rx="30" ry="12"/><ellipse cx="92" cy="50" rx="20" ry="12"/><ellipse cx="54" cy="52" rx="16" ry="10"/></g>' +
      '<path d="M0 196 Q40 186 80 196 T160 196 T240 196 T320 196 V260 H0 Z" fill="#26B0E3"/>' +
      '<path d="M0 214 Q40 206 80 214 T160 214 T240 214 T320 214" stroke="#9BEAFB" stroke-width="4" fill="none" opacity=".7"/>' +
      '<path d="M0 248 Q150 228 300 248 V340 H0 Z" fill="#FFE3A3"/>' +
      '<path d="' + star(40, 306, 14, 6) + '" fill="#FF8A65" stroke="#F06A45" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M250 310 Q262 284 274 310 Z" fill="#FFB3C7"/><path d="M262 308 L262 292 M256 308 L259 294 M268 308 L265 294" stroke="#FF8DB0" stroke-width="2"/>' },
    { id: 'a-onderwater', name: 'Onderwater', rarity: 'gewoon', scene:
      '<rect width="300" height="340" fill="url(#pb-g-sea)"/>' +
      '<path d="M60 0 L100 0 L40 270 L10 270 Z M170 0 L200 0 L172 270 L142 270 Z" fill="#FFFFFF" opacity=".1"/>' +
      '<path d="M20 340 Q8 300 22 270 Q36 240 22 210 Q12 190 24 170" stroke="#23C97F" stroke-width="9" fill="none" stroke-linecap="round"/>' +
      '<path d="M280 340 Q292 304 278 276 Q266 252 280 228" stroke="#2FD48A" stroke-width="9" fill="none" stroke-linecap="round"/>' +
      '<g transform="translate(64 96)"><ellipse rx="16" ry="10" fill="#FFB23F"/><path d="M14 0 L28 -9 L28 9 Z" fill="#FF8A1F"/><circle cx="-7" cy="-2" r="2.4" fill="#123A52"/></g>' +
      '<g transform="translate(240 150) scale(-0.8 0.8)"><ellipse rx="16" ry="10" fill="#FF8DC1"/><path d="M14 0 L28 -9 L28 9 Z" fill="#E15E9C"/><circle cx="-7" cy="-2" r="2.4" fill="#123A52"/></g>' +
      '<path d="M0 282 Q150 262 300 282 V340 H0 Z" fill="#F3D58A"/>' +
      bubbles([[44, 160, 5], [52, 136, 3], [262, 90, 6], [254, 66, 4], [150, 30, 4]]) },
    { id: 'a-jungle', name: 'Jungle', rarity: 'gewoon', scene:
      '<rect width="300" height="340" fill="url(#pb-g-jungle)"/>' +
      '<path d="M88 0 Q100 40 84 84 M214 0 Q204 34 220 70" stroke="#2E9E5B" stroke-width="4" fill="none"/>' +
      '<ellipse cx="88" cy="50" rx="7" ry="4" fill="#3DBA6E"/><ellipse cx="208" cy="40" rx="7" ry="4" fill="#3DBA6E"/>' +
      leaf(14, 110, -50, 1, '#2E9E5B') + leaf(36, 70, -18, 0.8, '#3DBA6E') + leaf(286, 100, 50, 1, '#2E9E5B') + leaf(266, 60, 18, 0.8, '#3DBA6E') +
      leaf(0, 270, -70, 0.9, '#2E9E5B') + leaf(300, 276, 70, 0.9, '#2E9E5B') +
      '<path d="M0 278 Q150 262 300 278 V340 H0 Z" fill="#3DAA5C"/>' +
      flower(34, 296, 6, '#FF4F6D', '#FFC83A') + flower(268, 306, 7, '#FF8DC1', '#FFC83A') + flower(240, 290, 5, '#FFC83A', '#FF8A1F') },
    { id: 'a-kasteel', name: 'Kasteel', rarity: 'zeldzaam', scene:
      '<rect width="300" height="340" fill="url(#pb-g-castle)"/>' +
      '<g fill="#FFFFFF"><ellipse cx="226" cy="48" rx="28" ry="11"/><ellipse cx="246" cy="40" rx="18" ry="11"/></g>' +
      '<path d="M0 240 Q70 200 150 230 T300 220 V340 H0 Z" fill="#9BE7A8"/>' +
      '<rect x="24" y="170" width="64" height="62" fill="#C7B8FF"/><rect x="12" y="140" width="24" height="92" fill="#B7A5FA"/><rect x="76" y="140" width="24" height="92" fill="#B7A5FA"/>' +
      '<path d="M8 142 L24 108 L40 142 Z M72 142 L88 108 L104 142 Z" fill="#FF6FA8"/>' +
      '<path d="M24 108 V92 l12 5 -12 5 M88 108 V92 l12 5 -12 5" stroke="#7C5BDF" stroke-width="2" fill="#FFC83A"/>' +
      '<path d="M46 232 v-22 a10 10 0 0 1 20 0 v22 z" fill="#7C5BDF"/>' +
      '<rect x="254" y="150" width="28" height="82" fill="#B7A5FA"/><path d="M250 152 L268 118 L286 152 Z" fill="#FF6FA8"/>' +
      '<rect y="282" width="300" height="58" fill="#7FD88E"/>' + flower(270, 300, 5, '#FFFFFF', '#FFC83A') + flower(30, 306, 5, '#FF8DC1', '#FFC83A') },
    { id: 'a-ruimte', name: 'Ruimte', rarity: 'zeldzaam', scene:
      '<rect width="300" height="340" fill="url(#pb-g-space)"/>' + starField(60, 7, 0, 0, 300, 260, '#FFFFFF', 1.8) +
      '<circle cx="236" cy="70" r="24" fill="#FF8DC1"/><path d="M228 60 q10 -6 20 0" stroke="#FFFFFF" stroke-opacity=".4" stroke-width="4" fill="none"/>' +
      '<ellipse cx="236" cy="70" rx="42" ry="10" transform="rotate(-18 236 70)" fill="none" stroke="#FFD23F" stroke-width="5"/>' +
      '<circle cx="56" cy="64" r="18" fill="#E9E6FF"/><circle cx="50" cy="60" r="4" fill="#C9C2F2"/><circle cx="62" cy="70" r="3" fill="#C9C2F2"/>' +
      '<path d="M110 30 L150 50" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M0 276 Q80 258 150 270 T300 268 V340 H0 Z" fill="#8F86D6"/>' +
      '<ellipse cx="60" cy="302" rx="16" ry="5" fill="#7A70C4"/><ellipse cx="236" cy="312" rx="20" ry="6" fill="#7A70C4"/>' },
    { id: 'a-pompoenland', name: 'Pompoenland', rarity: 'zeldzaam', scene:
      '<rect width="300" height="340" fill="url(#pb-g-dusk)"/>' + starField(18, 3, 0, 0, 300, 120, '#FFFFFF', 1.2) +
      '<circle cx="232" cy="62" r="28" fill="#FFF3C4"/>' + bat(70, 62) + bat(104, 84) + bat(186, 44) +
      '<path d="M0 262 Q90 236 170 258 T300 250 V340 H0 Z" fill="#3A1D5C"/>' +
      '<path d="M0 292 Q150 276 300 292 V340 H0 Z" fill="#2A1645"/>' +
      pumpkin(34, 302, 1.1) + pumpkin(268, 308, 1.3) + pumpkin(232, 292, 0.7) },
    { id: 'a-noorderlicht', name: 'Noorderlicht', rarity: 'super', scene:
      '<rect width="300" height="340" fill="url(#pb-g-aurora)"/>' + starField(40, 21, 0, 0, 300, 200, '#FFFFFF', 1.4) +
      '<path d="M-10 92 Q60 42 130 82 T310 62" stroke="#3BE09A" stroke-width="26" fill="none" opacity=".45" stroke-linecap="round"/>' +
      '<path d="M-10 122 Q80 82 160 112 T320 92" stroke="#A98BFF" stroke-width="18" fill="none" opacity=".4" stroke-linecap="round"/>' +
      '<path d="M-10 72 Q90 32 170 62 T320 42" stroke="#6FF7FF" stroke-width="10" fill="none" opacity=".35" stroke-linecap="round"/>' +
      '<path d="M0 250 Q80 214 160 244 T300 236 V340 H0 Z" fill="#EAF6FF"/><path d="M0 282 Q120 260 300 278 V340 H0 Z" fill="#CFE6F7"/>' +
      '<path d="M22 254 L36 214 L50 254 Z M30 236 L36 220 L42 236 Z" fill="#0F3B46"/><path d="M256 248 L272 202 L288 248 Z" fill="#0F3B46"/>' }
  ].map(function (i) { i.slot = 'achtergrond'; return i; });

  window.PB_ITEMS = [].concat(kleuren, hoofd, ogen, nek, hand, voeten, achtergrond);
})();
