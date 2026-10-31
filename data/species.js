/* Poetsbeestje — data/species.js
   De dieren die uit een ei kunnen komen, en de eieren zelf.
   Elk dier gebruikt hetzelfde tekenvlak (300 x 340) als de kleding in items.js,
   zodat alle spullen op ieder dier passen.

   Per dier:
   - palette: eigen kleuren (body, shade, belly, horn)
   - parts(p): extra tekeningen bij een palet p
       behind  achter het lijf (oren, hoorns, staart, stekels, pluis)
       over    op het lijf (manen, vlekjes, streepjes)
       face    op het gezicht (neusje, snorharen)
       feet    over de voetjes (hoefjes, klauwtjes)
       fluffy  true = pluizige rand in plaats van een gladde lijn
   - egg: hoe het ei eruitziet (base, shade, deco op het ei, top boven op het ei)
*/
(function () {
  'use strict';

  const ART = window.PB_ART;
  function n(v) { return Math.round(v * 10) / 10; }
  function mirror(d) {
    // spiegelt een pad (alleen M/L/Q/C/Z met absolute coördinaten) om x = 150
    return d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, function (m, x, y) { return n(300 - Number(x)) + ' ' + y; });
  }
  function both(fn) { return fn(112) + fn(188); }

  /* ---------- delen per dier ---------- */
  function monster(p) {
    return {
      behind:
        '<path d="' + ART.HORN_L + '" fill="' + p.horn + '" stroke="' + p.horn + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="' + ART.HORN_R + '" fill="' + p.horn + '" stroke="' + p.horn + '" stroke-width="6" stroke-linejoin="round"/>',
      over: '<g fill="' + p.shade + '" opacity=".35"><circle cx="70" cy="150" r="6"/><circle cx="82" cy="133" r="3.5"/><circle cx="231" cy="142" r="5"/><circle cx="219" cy="125" r="3"/></g>',
      face: '', feet: ''
    };
  }

  function eenhoorn(p) {
    const earL = 'M96 118 Q86 72 104 54 Q126 74 126 106 Z';
    const innerL = 'M101 108 Q96 80 105 66 Q117 82 117 102 Z';
    return {
      behind:
        // staart in regenboogkleuren
        '<path d="M70 262 C30 258 10 290 18 322 C30 302 44 296 62 300 Z" fill="#FF8DC1"/>' +
        '<path d="M68 272 C40 282 30 304 38 330 C48 310 58 304 72 306 Z" fill="#B794FF"/>' +
        '<path d="M66 284 C52 296 52 316 60 334 C66 318 72 312 80 312 Z" fill="#7FD3FF"/>' +
        // oortjes
        '<path d="' + earL + '" fill="' + p.body + '" stroke="' + p.shade + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="' + mirror(earL) + '" fill="' + p.body + '" stroke="' + p.shade + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="' + innerL + '" fill="#FFC2DD"/><path d="' + mirror(innerL) + '" fill="#FFC2DD"/>' +
        // gouden hoorn
        '<path d="M138 100 L150 22 L162 100 Z" fill="url(#pb-gold)" stroke="#E9B000" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M141 86 L159 78 M143.5 70 L156.5 63 M146 54 L154 49 M148 40 L152 36" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".85"/>',
      over:
        // krullende manen boven op het hoofd
        '<circle cx="104" cy="112" r="12" fill="#B794FF"/><circle cx="120" cy="98" r="14" fill="#FF8DC1"/>' +
        '<circle cx="94" cy="128" r="9" fill="#FFE27A"/><circle cx="136" cy="92" r="10" fill="#7FD3FF"/>' +
        '<circle cx="128" cy="114" r="9" fill="#FFB3D6"/><circle cx="172" cy="94" r="8" fill="#B794FF"/>' +
        '<circle cx="186" cy="102" r="7" fill="#FF8DC1"/>' +
        '<path d="M116 92 q6 -4 10 2 M100 108 q5 -3 8 2" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".7"/>',
      face: ART.sparkle(66, 186, 6, '#FFD166') + ART.sparkle(236, 184, 5, '#FFD166'),
      feet: both(function (cx) {
        return '<path d="M' + (cx - 25) + ' 313 h50 v4 a9 9 0 0 1 -9 9 h-32 a9 9 0 0 1 -9 -9z" fill="#C9A7FF"/>';
      })
    };
  }

  function dino(p) {
    // stekels rond de bovenkant van het hoofd (achter het lijf, alleen de punten steken uit)
    let plates = '';
    [-104, -78, -52, -28, -6].forEach(function (deg, i) {
      const a = deg * Math.PI / 180;
      const cx = 150 + 106 * Math.cos(a), cy = 202 + 112 * Math.sin(a);
      const nx = Math.cos(a), ny = Math.sin(a);
      const tx = -ny, ty = nx;
      const len = i === 1 || i === 2 ? 30 : 24, half = 15;
      const bx = cx - nx * 8, by = cy - ny * 8;
      plates += '<path d="M' + n(bx + tx * half) + ' ' + n(by + ty * half) + ' L' + n(cx + nx * len) + ' ' + n(cy + ny * len) +
        ' L' + n(bx - tx * half) + ' ' + n(by - ty * half) + ' Z" fill="' + p.horn + '" stroke="' + p.horn + '" stroke-width="6" stroke-linejoin="round"/>';
    });
    return {
      behind:
        '<path d="M74 248 Q24 250 6 300 Q42 288 80 300 Z" fill="' + p.body + '" stroke="' + p.shade + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M38 268 l-6 -12 l12 4 M22 284 l-8 -10 l12 2" fill="' + p.horn + '" stroke="' + p.horn + '" stroke-width="4" stroke-linejoin="round"/>' +
        plates,
      over:
        '<g fill="' + p.shade + '" opacity=".4"><circle cx="86" cy="138" r="8"/><circle cx="102" cy="120" r="4.5"/><circle cx="214" cy="132" r="7"/><circle cx="228" cy="152" r="4"/></g>' +
        '<path d="M104 276 Q150 288 196 276 M110 294 Q150 306 190 294" stroke="' + p.shade + '" stroke-width="3" stroke-linecap="round" fill="none" opacity=".35"/>',
      face: '<circle cx="142" cy="203" r="2.4" fill="' + p.shade + '"/><circle cx="158" cy="203" r="2.4" fill="' + p.shade + '"/>',
      feet: both(function (cx) {
        return '<g fill="#FFFFFF"><ellipse cx="' + (cx - 12) + '" cy="303" rx="3.5" ry="5"/><ellipse cx="' + cx + '" cy="300" rx="3.5" ry="5"/><ellipse cx="' + (cx + 12) + '" cy="303" rx="3.5" ry="5"/></g>';
      })
    };
  }

  function pluis(p) {
    // pluizige rand: rondjes langs de rand van het lijf
    let pts = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      pts.push([n(150 + 104 * Math.cos(a)), n(202 + 108 * Math.sin(a)), i % 2 ? 16 : 19]);
    }
    const ring = function (extra) {
      return pts.map(function (q) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + q[2] + '"' + extra + '/>'; }).join('');
    };
    const tuft = [[136, 84, 13], [152, 72, 16], [168, 84, 12], [144, 66, 9]];
    const tuftRing = function (extra) {
      return tuft.map(function (q) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + q[2] + '"' + extra + '/>'; }).join('');
    };
    return {
      fluffy: true,
      behind:
        '<g fill="' + p.body + '" stroke="' + p.shade + '" stroke-width="3">' + ring('') + tuftRing('') + '</g>' +
        '<g fill="' + p.body + '">' + ring('') + tuftRing('') + '</g>',
      over:
        '<path d="M74 176 q6 -7 13 0 M222 168 q6 -7 13 0 M88 252 q6 -7 13 0 M200 258 q6 -7 13 0 M150 98 q5 -6 10 0" stroke="' + p.shade + '" stroke-width="3" stroke-linecap="round" fill="none" opacity=".45"/>',
      face: '', feet: ''
    };
  }

  function poes(p) {
    const earL = 'M80 134 L88 52 L144 98 Z';
    const innerL = 'M93 120 L97 72 L128 98 Z';
    return {
      behind:
        '<path d="M76 290 C30 296 16 244 34 210" stroke="' + p.shade + '" stroke-width="24" stroke-linecap="round" fill="none"/>' +
        '<path d="M76 290 C30 296 16 244 34 210" stroke="' + p.body + '" stroke-width="18" stroke-linecap="round" fill="none"/>' +
        '<path d="M28 236 l14 4 M24 256 l15 1" stroke="' + p.shade + '" stroke-width="5" stroke-linecap="round" opacity=".6"/>' +
        '<path d="' + earL + '" fill="' + p.body + '" stroke="' + p.shade + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="' + mirror(earL) + '" fill="' + p.body + '" stroke="' + p.shade + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="' + innerL + '" fill="#FFB3C7"/><path d="' + mirror(innerL) + '" fill="#FFB3C7"/>',
      over:
        '<path d="M139 98 l2 16 M150 94 v20 M161 98 l-2 16" stroke="' + p.shade + '" stroke-width="4.5" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M48 176 h16 M46 190 h14 M236 176 h16 M240 190 h14" stroke="' + p.shade + '" stroke-width="4" stroke-linecap="round" opacity=".5"/>',
      face:
        '<path d="M143 199 h14 l-7 8 z" fill="#FF8FAB" stroke="#FF8FAB" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M70 200 L38 192 M70 208 L38 212 M230 200 L262 192 M230 208 L262 212" stroke="#B5835A" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>',
      feet: both(function (cx) {
        return '<g fill="#FFB3C7"><circle cx="' + (cx - 10) + '" cy="306" r="3.4"/><circle cx="' + cx + '" cy="303" r="3.4"/><circle cx="' + (cx + 10) + '" cy="306" r="3.4"/></g>';
      })
    };
  }

  function konijn(p) {
    return {
      behind:
        '<circle cx="62" cy="294" r="20" fill="#FFFFFF" stroke="' + p.shade + '" stroke-width="3"/><circle cx="52" cy="284" r="8" fill="#FFFFFF"/>' +
        '<ellipse cx="116" cy="62" rx="19" ry="52" transform="rotate(-10 116 62)" fill="' + p.body + '" stroke="' + p.shade + '" stroke-width="3"/>' +
        '<ellipse cx="184" cy="62" rx="19" ry="52" transform="rotate(10 184 62)" fill="' + p.body + '" stroke="' + p.shade + '" stroke-width="3"/>' +
        '<ellipse cx="116" cy="62" rx="8" ry="37" transform="rotate(-10 116 62)" fill="#FFC2DD"/>' +
        '<ellipse cx="184" cy="62" rx="8" ry="37" transform="rotate(10 184 62)" fill="#FFC2DD"/>',
      over: '',
      face: '<ellipse cx="150" cy="201" rx="7" ry="5" fill="#FF8FAB"/>',
      feet: both(function (cx) {
        return '<ellipse cx="' + cx + '" cy="314" rx="31" ry="13" fill="' + p.body + '" stroke="' + p.shade + '" stroke-width="3"/>' +
          '<ellipse cx="' + cx + '" cy="317" rx="9" ry="5" fill="#FFC2DD"/>' +
          '<g fill="#FFC2DD"><circle cx="' + (cx - 13) + '" cy="309" r="3.4"/><circle cx="' + cx + '" cy="306" r="3.4"/><circle cx="' + (cx + 13) + '" cy="309" r="3.4"/></g>';
      })
    };
  }

  /* ---------- eieren ---------- */
  const EGG_PATH = 'M150 64 C214 64 252 170 252 222 C252 284 206 318 150 318 C94 318 48 284 48 222 C48 170 86 64 150 64Z';
  const ZIG = 'L270 200 L245 186 L220 202 L195 186 L170 202 L150 188 L130 202 L105 186 L80 202 L55 188 L30 200 L0 190';
  function dots(list, color) {
    return list.map(function (d) { return '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '" fill="' + (d[3] || color) + '"/>'; }).join('');
  }

  window.PB_SPECIES = [
    {
      id: 'eenhoorn', name: 'Eenhoorn', defaultName: 'Sterretje',
      palette: { body: '#FFF6FB', shade: '#E9C2DA', belly: '#FFFFFF', horn: '#FFD166' },
      parts: eenhoorn,
      egg: {
        base: '#FFF7FC', shade: '#EFCDE2',
        top: '<path d="M140 78 L150 26 L160 78 Z" fill="url(#pb-gold)" stroke="#E9B000" stroke-width="2.5" stroke-linejoin="round"/><path d="M143 64 L157 58 M145.5 50 L154.5 45" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>',
        deco:
          '<path d="M40 194 l22 -16 l22 16 l22 -16 l22 16 l22 -16 l22 16 l22 -16 l22 16 l22 -16 l22 16" fill="none" stroke="#FF8DC1" stroke-width="10" stroke-linejoin="round"/>' +
          '<path d="M40 214 l22 -16 l22 16 l22 -16 l22 16 l22 -16 l22 16 l22 -16 l22 16 l22 -16 l22 16" fill="none" stroke="#B794FF" stroke-width="10" stroke-linejoin="round"/>' +
          '<path d="M40 234 l22 -16 l22 16 l22 -16 l22 16 l22 -16 l22 16 l22 -16 l22 16 l22 -16 l22 16" fill="none" stroke="#7FD3FF" stroke-width="10" stroke-linejoin="round"/>' +
          ART.sparkle(196, 130, 12, '#FFD166') + ART.sparkle(110, 272, 9, '#FFD166') + ART.sparkle(206, 280, 6, '#FFD166')
      }
    },
    {
      id: 'dino', name: 'Dino', defaultName: 'Dino',
      palette: { body: '#86DC5E', shade: '#4FAA38', belly: '#EAFBC0', horn: '#FF9F43' },
      parts: dino,
      egg: {
        base: '#D9F2AE', shade: '#9ACB62',
        top: '<g fill="#FF9F43" stroke="#FF9F43" stroke-width="5" stroke-linejoin="round"><path d="M124 86 L130 56 L146 78Z"/><path d="M140 74 L150 40 L160 74Z"/><path d="M154 78 L170 56 L176 86Z"/></g>',
        deco: dots([[104, 140, 16], [182, 168, 22], [120, 238, 14], [210, 238, 12], [150, 292, 10], [84, 200, 9], [166, 110, 7]], '#8CCB57')
      }
    },
    {
      id: 'pluis', name: 'Pluisbol', defaultName: 'Pluis',
      palette: { body: '#C9A7FF', shade: '#9C78E6', belly: '#F2E8FF', horn: '#FF9FCB' },
      parts: pluis,
      egg: {
        base: '#E8DAFF', shade: '#B79BF0',
        top: '<g fill="#C9A7FF" stroke="#9C78E6" stroke-width="3"><circle cx="136" cy="74" r="12"/><circle cx="150" cy="62" r="15"/><circle cx="164" cy="74" r="12"/></g><g fill="#C9A7FF"><circle cx="136" cy="74" r="12"/><circle cx="150" cy="62" r="15"/><circle cx="164" cy="74" r="12"/></g>',
        deco: dots([[100, 140, 9], [150, 120, 8], [200, 140, 9], [80, 196, 8], [124, 180, 9], [176, 180, 9], [220, 196, 8], [100, 250, 9], [150, 232, 8], [200, 250, 9], [126, 292, 8], [176, 292, 8]], '#FFFFFF')
      }
    },
    {
      id: 'poes', name: 'Poesje', defaultName: 'Mimi',
      palette: { body: '#FFB866', shade: '#E2852A', belly: '#FFF2DE', horn: '#FFB3C7' },
      parts: poes,
      egg: {
        base: '#FFD8A8', shade: '#E8A15A',
        top: '<path d="M102 108 L106 50 L148 80 Z" fill="#FFD8A8" stroke="#E8A15A" stroke-width="3" stroke-linejoin="round"/><path d="' + mirror('M102 108 L106 50 L148 80 Z') + '" fill="#FFD8A8" stroke="#E8A15A" stroke-width="3" stroke-linejoin="round"/>' +
          '<path d="M112 92 L114 64 L136 80Z" fill="#FFB3C7"/><path d="' + mirror('M112 92 L114 64 L136 80Z') + '" fill="#FFB3C7"/>',
        deco: '<path d="M60 160 Q90 150 112 162 M188 162 Q210 150 240 160 M52 222 Q84 212 106 224 M194 224 Q216 212 248 222 M70 278 Q96 270 114 280 M186 280 Q204 270 230 278" stroke="#F2A14E" stroke-width="10" stroke-linecap="round" fill="none"/>'
      }
    },
    {
      id: 'konijn', name: 'Konijntje', defaultName: 'Flapje',
      palette: { body: '#F6EEE7', shade: '#D9C5B3', belly: '#FFFFFF', horn: '#FFB3C7' },
      parts: konijn,
      egg: {
        base: '#FFF2F6', shade: '#EAC9D5',
        top: '<ellipse cx="128" cy="46" rx="13" ry="34" transform="rotate(-12 128 46)" fill="#FFF2F6" stroke="#EAC9D5" stroke-width="3"/><ellipse cx="172" cy="46" rx="13" ry="34" transform="rotate(12 172 46)" fill="#FFF2F6" stroke="#EAC9D5" stroke-width="3"/>' +
          '<ellipse cx="128" cy="46" rx="6" ry="24" transform="rotate(-12 128 46)" fill="#FFC2DD"/><ellipse cx="172" cy="46" rx="6" ry="24" transform="rotate(12 172 46)" fill="#FFC2DD"/>',
        deco: dots([[104, 140, 8, '#FF9FCB'], [190, 130, 7, '#7FE3C2'], [140, 172, 7, '#FFD84D'], [214, 196, 8, '#FF9FCB'], [82, 214, 7, '#7FE3C2'], [160, 250, 8, '#FF9FCB'], [110, 274, 7, '#FFD84D'], [200, 270, 7, '#7FE3C2']], '#FF9FCB')
      }
    },
    {
      id: 'monster', name: 'Monstertje', defaultName: 'Bubbel',
      palette: { body: '#5EE0B5', shade: '#30B48B', belly: '#CBF7E7', horn: '#FFD166' },
      parts: monster,
      egg: {
        base: '#A3F2D5', shade: '#4FC79E',
        top: '<path d="M112 96 Q110 68 120 48 Q136 64 138 86Z" fill="#FFD166" stroke="#FFD166" stroke-width="5" stroke-linejoin="round"/><path d="' + mirror('M112 96 Q110 68 120 48 Q136 64 138 86Z') + '" fill="#FFD166" stroke="#FFD166" stroke-width="5" stroke-linejoin="round"/>',
        deco: dots([[108, 150, 15], [188, 186, 19], [128, 254, 13], [204, 120, 9], [92, 214, 10], [208, 266, 11]], '#6FE3BC')
      }
    }
  ];

  window.PB_EGG = {
    PATH: EGG_PATH,
    DEFS:
      '<clipPath id="pb-egg-clip"><path d="' + EGG_PATH + '"/></clipPath>' +
      '<clipPath id="pb-egg-top"><path d="M0 0 H300 V190 ' + ZIG + ' Z"/></clipPath>' +
      '<clipPath id="pb-egg-bot"><path d="M0 340 H300 V190 ' + ZIG + ' Z"/></clipPath>',
    NEST_BACK: '<ellipse cx="150" cy="302" rx="114" ry="26" fill="#B9773A"/><ellipse cx="150" cy="298" rx="98" ry="17" fill="#7A4A1E" opacity=".35"/>',
    NEST_FRONT: '<path d="M34 298 Q150 352 266 298 Q262 332 150 338 Q38 332 34 298Z" fill="#C98A4B"/>' +
      '<path d="M60 314 l24 8 M96 324 l26 4 M140 330 l24 0 M184 326 l24 -4 M222 316 l22 -8" stroke="#E6BC86" stroke-width="3.5" stroke-linecap="round"/>',
    CRACKS: [
      'M78 150 l20 4 l6 -14 l18 8 l8 -10',
      'M50 206 l22 4 l10 -14 l18 10',
      'M250 202 l-20 6 l-10 -14 l-16 12',
      'M118 316 l8 -20 l16 6 l6 -18'
    ],
    FACE: '<path d="M116 210 q11 9 22 0 M162 210 q11 9 22 0" stroke="#6B4A3A" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="108" cy="228" rx="11" ry="6" fill="#FF8FB5" opacity=".7"/><ellipse cx="192" cy="228" rx="11" ry="6" fill="#FF8FB5" opacity=".7"/>' +
      '<path d="M142 234 q8 6 16 0" stroke="#6B4A3A" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
  };
})();
