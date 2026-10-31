/* FRZFRM Weather Catch: Weather Hop.
   A road-crossing game in the Crossy Road view: you play one of your caught animals and hop up a never-ending world of
   grass, roads, rivers and railway lines through a day of weather. A day has five stages (misty morning, sunny midday,
   windy afternoon, thunderstorm, frosty night), each ending in a door themed like the next. Then the next day comes, with
   the last night's weather left behind (frost, fallen branches, thicker fog) and everything a bit faster.
   The world is drawn as blocks seen from above and in front, leaning a little to the right: every block shows its top,
   its front and its right side. The animals are their jar drawings, standing up in it.
   create(canvas, options) runs a game on a canvas; the app draws the score, banners and panels round it. */
(function (root) {
  var WC = root.WC = root.WC || {};
  var ZA = WC.zoo, SK = WC.seek, KIT = WC.kit;
  var TAU = Math.PI * 2;
  var COLS = 9, STAGE_ROWS = 30, START_ROW = 2, HOP_T = 0.12, SLIDE_T = 0.14, BEHIND = 5.4;
  var XL = -5.5, XR = 14.5, SPAN = XR - XL;
  var SKEW = 0.12, SZ = 0.78, SY = 0.86;

  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * (2 - t); }
  function shade(hex, k) {
    if (KIT && KIT.shade) return KIT.shade(hex, k);
    return hex;
  }
  function pickW(list, R) {
    var tot = 0, i; for (i = 0; i < list.length; i++) tot += list[i][1];
    var n = R() * tot;
    for (i = 0; i < list.length; i++) { n -= list[i][1]; if (n <= 0) return list[i][0]; }
    return list[list.length - 1][0];
  }
  function rr(R, a) { return a[0] + R() * (a[1] - a[0]); }
  function rint(R, a, b) { return a + Math.floor(R() * (b - a + 1)); }

  /* ---------- the day ---------- */
  var STAGES = [
    { id: 'mist', name: 'Misty morning', car: [1.2, 2.0], gap: [2.8, 5], log: [0.7, 1.1], roadRun: 2, waterRun: 2, mix: [['road', 0.78], ['water', 0.22]], creep: 0.22, door: '#AFC0D2', icon: 'mist',
      note: 'Slow traffic in the fog. Tap to hop forward, swipe to go sideways or back.', caught: 'The fog swallowed you up.' },
    { id: 'sun', name: 'Sunny midday', car: [1.6, 2.7], gap: [2.2, 4], log: [0.9, 1.5], roadRun: 3, waterRun: 3, mix: [['road', 0.55], ['water', 0.3], ['rail', 0.15]], creep: 0.28, door: '#F5B759', icon: 'sun',
      note: 'Busier roads, rivers to cross on logs, and trains.', caught: 'Too slow: the clouds rolled in over you.' },
    { id: 'wind', name: 'Windy afternoon', car: [1.8, 2.9], gap: [2.1, 3.7], log: [1.2, 1.9], roadRun: 3, waterRun: 3, mix: [['road', 0.5], ['water', 0.32], ['rail', 0.18]], creep: 0.3, door: '#6FB7B0', icon: 'wind',
      note: 'Gusts push you sideways when the arrows show, and things blow across the grass.', caught: 'The wind blew you away.' },
    { id: 'storm', name: 'Thunderstorm', car: [1.9, 3.0], gap: [2.0, 3.5], log: [1.1, 1.8], roadRun: 3, waterRun: 3, mix: [['road', 0.5], ['water', 0.28], ['rail', 0.22]], creep: 0.32, door: '#4A5878', icon: 'bolt',
      note: 'Lightning strikes where the ground glows. Pylons and trees creak before they fall.', caught: 'The storm caught up with you.' },
    { id: 'night', name: 'Frosty night', car: [1.8, 2.9], gap: [2.2, 3.7], log: [1.0, 1.7], roadRun: 3, waterRun: 2, mix: [['road', 0.55], ['water', 0.25], ['rail', 0.2]], creep: 0.3, door: '#2E3A66', icon: 'moon',
      note: 'Icy patches make you slide. Watch for headlights in the dark.', caught: 'Lost in the dark.' }
  ];
  function dayNote(day) {
    if (day === 2) return 'Frost on the ground from last night, and the storm brought branches down. Everything’s a bit faster.';
    if (day === 3) return 'Thick fog after a cold night, and busier roads.';
    return 'Everything’s faster again than yesterday.';
  }
  /* how hard a stage is on a day: everything speeds up and closes up a little each day, and a little through each stage */
  function prm(day, stage, prog) {
    var st = STAGES[stage], m = Math.min(1.9, 1 + 0.17 * (day - 1)), ramp = 0.9 + 0.2 * (prog || 0), sp = Math.pow(m, 0.55) * ramp;
    return {
      car: [st.car[0] * sp, st.car[1] * sp],
      gap: [Math.max(1.65, st.gap[0] / Math.pow(m, 0.4)), Math.max(2.3, st.gap[1] / Math.pow(m, 0.4))],
      log: [st.log[0] * Math.pow(m, 0.45) * ramp, st.log[1] * Math.pow(m, 0.45) * ramp],
      logLen: stage >= 2 || day >= 2 ? [1.7, 3.2] : [2.2, 4],
      logGap: [1.0, 2.3 + 0.2 * (day - 1)],
      pads: stage === 0 ? 0.7 / m : 0,
      roadRun: Math.min(5, st.roadRun + Math.floor((day - 1) / 2)),
      waterRun: Math.min(4, st.waterRun + Math.floor((day - 1) / 3)),
      obst: 0.2 + (stage === 0 && day >= 2 ? 0.08 : 0),
      ice: stage === 4 ? Math.min(0.32, 0.18 + 0.03 * (day - 1)) : stage === 0 && day >= 2 ? Math.min(0.14, 0.07 * (day - 1)) : 0,
      roller: stage === 2 ? 0.4 : stage === 3 ? 0.22 : 0,
      fall: stage === 3 ? Math.min(0.6, 0.35 + 0.05 * (day - 1)) : stage === 2 && day >= 2 ? 0.15 : 0,
      creep: st.creep * Math.pow(m, 0.5),
      gust: stage === 2 ? [4.8 / m, 7.5 / m] : stage === 3 ? [8 / m, 12 / m] : null,
      bolt: stage === 3 ? [2.6 / Math.pow(m, 0.6), 4.2 / Math.pow(m, 0.6)] : null,
      warn: Math.max(0.85, 1.3 - 0.07 * (day - 1)),
      train: [3 / m, 7 / m], trainSpeed: 20 * Math.pow(m, 0.3),
      fog: stage === 0 ? Math.min(0.9, 0.7 + 0.08 * (day - 1)) : 0,
      branches: stage === 0 && day >= 2
    };
  }
  /* how each stage looks: fog, rain, wind lines, darkness and a colour wash */
  var LOOK = {
    mist: { fog: 0.72, rain: 0, wind: 0.1, dark: 0, tint: [228, 234, 242, 0.06], frost: 0 },
    sun: { fog: 0, rain: 0, wind: 0, dark: 0, tint: [255, 214, 150, 0.08], frost: 0 },
    wind: { fog: 0, rain: 0, wind: 1, dark: 0, tint: [200, 208, 220, 0.12], frost: 0 },
    storm: { fog: 0.08, rain: 1, wind: 0.5, dark: 0.34, tint: [40, 50, 80, 0.32], frost: 0 },
    night: { fog: 0, rain: 0, wind: 0, dark: 0.8, tint: [20, 30, 70, 0.14], frost: 1 }
  };

  /* ---------- the worlds: one for each row of the animal shelf ---------- */
  var CARS = ['#E24B4B', '#3E7FD8', '#F2C230', '#2EAE6B', '#F28C28', '#9B59B6', '#EDEDED', '#2A2F3A'];
  var THEMES = {
    garden: { name: 'Garden lanes', grass: ['#8DCB69', '#84C260'], out: '#6FA854', props: [['tree', 3], ['hedge', 2], ['flowers', 1.5], ['pot', 0.8]], edge: [['tree', 3], ['hedge', 2]],
      cars: [['car', 3], ['van', 1.5], ['bus', 0.4]], rollers: [['bin', 2], ['chair', 1]], water: ['#5DB5E2', '#4FA7D6'], log: '#8A5A36', wall: ['#4E8C3A', 'hedge'], train: '#C8402F', fall: ['tree', 'pylon'], leaf: '#5DAA45' },
    pets: { name: 'Town and park', grass: ['#93CE6E', '#8AC465'], out: '#7AAE5C', props: [['tree', 2.5], ['bench', 1.5], ['bin', 1], ['postbox', 0.8]], edge: [['tree', 3], ['bench', 1], ['postbox', 0.6]],
      cars: [['car', 3], ['bus', 1.2], ['van', 1.2]], rollers: [['bin', 2], ['bag', 1]], water: ['#5AA7C8', '#4F99BA'], log: '#8A5A36', wall: ['#A8553A', 'brick'], train: '#2E6FC0', fall: ['pylon', 'tree'], leaf: '#55A548' },
    coast: { name: 'Seaside', grass: ['#EBDDAE', '#E3D39F'], out: '#D6C38B', props: [['hut', 2], ['rock', 2], ['castle', 1.2], ['parasol', 1.2]], edge: [['rock', 2], ['hut', 1.5], ['parasol', 1]],
      cars: [['camper', 2], ['car', 2], ['icecream', 1]], rollers: [['ball', 2], ['deckchair', 1]], water: ['#3EA7D8', '#3497C7'], log: '#B49A7A', wall: ['#F2EEE4', 'fence'], train: '#E07A2A', fall: ['pylon'], leaf: '#7FB458' },
    country: { name: 'Countryside', grass: ['#96CD63', '#8CC35A'], out: '#7BAF50', props: [['tree', 2.5], ['bale', 2], ['bush', 1.5], ['rock', 0.8]], edge: [['tree', 3], ['bush', 1.5], ['bale', 0.8]],
      cars: [['tractor', 2], ['car', 2], ['truck', 1]], rollers: [['bale', 1.5], ['branch', 1.5]], water: ['#5AAED6', '#4C9FC7'], log: '#8A5A36', wall: ['#9A9488', 'stone'], train: '#3E7A3A', fall: ['tree', 'pylon'], leaf: '#58A640' },
    zoo: { name: 'Safari park', grass: ['#D2C877', '#C9BF6C'], out: '#B8AE5E', props: [['acacia', 2], ['rock', 2], ['mound', 1.2], ['bush', 1]], edge: [['acacia', 2], ['rock', 1.5], ['bush', 1]],
      cars: [['jeep', 3], ['truck', 1]], rollers: [['tumble', 2], ['branch', 1]], water: ['#5DA6C2', '#5097B3'], log: '#8A5A36', wall: ['#C2A15A', 'bamboo'], train: '#7A5A3A', fall: ['acacia', 'pylon'], leaf: '#8AA548' }
  };
  var LEN = { car: 1.05, van: 1.35, bus: 2.4, truck: 2.5, tractor: 1.2, camper: 1.6, icecream: 1.4, jeep: 1.25, bin: 0.55, chair: 0.6, bag: 0.5, ball: 0.6, deckchair: 0.75, bale: 0.8, branch: 1.2, tumble: 0.7 };
  var NAMES = { car: 'a car', van: 'a van', bus: 'a bus', truck: 'a lorry', tractor: 'a tractor', camper: 'a camper van', icecream: 'an ice cream van', jeep: 'a safari jeep',
    bin: 'a flying bin', chair: 'a flying garden chair', bag: 'a flying bag', ball: 'a flying beach ball', deckchair: 'a flying deckchair', bale: 'a rolling hay bale', branch: 'a flying branch', tumble: 'a tumbleweed' };

  function create(canvas, o) {
    o = o || {};
    var ctx = canvas.getContext('2d');
    var R = rng(o.seed || (Math.random() * 4294967296) >>> 0);
    var theme = THEMES[o.theme] || THEMES.garden;
    var animal = ZA && ZA.A[o.animal] ? o.animal : 'dog', A = ZA.A[animal], shp = SK.shape(animal);
    var V = { W: 0, H: 0, S: 40, cx: 0, cy: 0, cam: START_ROW, dpr: 1 };
    var day0 = Math.max(1, o.day || 1);
    var rows = [], backs = {};
    var gen = { r: 0, day: day0, stage: 0, start: 0, plan: [], first: true, fresh: false, gate: 3, corridor: 4, padCol: 4, lastWater: 1, lastRoad: 1 };
    var p = { x: 4, r: START_ROW, fx: 4, fr: START_ROW, tx: 4, tr: START_ROW, t: 1, hop: false, slide: 0, bump: 0, face: 1, queue: null, log: null, off: 0, alive: true, cause: null, kind: null, deadT: 0, maxR: START_ROW, dir: null, push: 0, idle: 0 };
    var G = { t: 0, started: false, paused: false, ended: false, raf: 0, last: 0, look: null, stage: 0, day: day0, bolts: [], boltT: 3, gust: null, gustT: 6, flash: 0, scorch: [], rain: [], streaks: [], dark: null };
    var dk = document.createElement('canvas'), dctx = dk.getContext('2d');

    /* ---------- making the world, a row at a time ---------- */
    function laneAt(r) {
      if (r < 0) { if (!backs[r]) backs[r] = backLane(r); return backs[r]; }
      while (rows.length <= r) genNext();
      return rows[r];
    }
    function newLane(r, t, day, stage) { return { r: r, t: t, day: day, stage: stage, blocks: {}, props: [], ice: {}, movers: [], dir: 1, speed: 0 }; }
    function backLane(r) {
      var L = newLane(r, 'grass', day0, 0);
      for (var c = -6; c <= 14; c++) if ((c < 0 || c > 8 || R() < 0.35) && R() < 0.6) L.props.push({ x: c, k: pickW(theme.edge, R), v: R() });
      return L;
    }
    function genNext() {
      var g = gen;
      if (!g.plan.length) plan();
      var spec = g.plan.shift();
      var L = makeLane(spec, g.r, g.day, g.stage, (g.r - g.start) / STAGE_ROWS);
      rows.push(L);
      g.r++;
      if (g.r >= g.start + STAGE_ROWS) {
        g.stage++;
        if (g.stage > 4) { g.stage = 0; g.day++; }
        g.start = g.r; g.plan = []; g.fresh = true;
      }
    }
    function plan() {
      var g = gen, left = g.start + STAGE_ROWS - g.r, st = STAGES[g.stage], pr = prm(g.day, g.stage, 0);
      if (g.first || g.fresh) {
        g.gate = rint(R, 1, 6);
        if (g.first) { g.first = false; for (var i = 0; i < 5; i++) g.plan.push({ t: 'grass', start: true }); return; }
        g.fresh = false; g.plan.push({ t: 'grass', clear: true }, { t: 'grass' }); return;
      }
      if (left <= 1) { g.plan.push({ t: 'door' }); return; }
      if (left <= 2) { g.plan.push({ t: 'grass', approach: true }); return; }
      var room = left - 2, k = pickW(st.mix, R), n = k === 'rail' ? 1 : rint(R, 1, k === 'road' ? pr.roadRun : pr.waterRun);
      n = Math.max(1, Math.min(n, room - 1));
      for (var j = 0; j < n; j++) g.plan.push({ t: k, first: j === 0 });
      var after = Math.min(room - n, R() < 0.35 ? 2 : 1);
      for (j = 0; j < after; j++) g.plan.push({ t: 'grass' });
      if (!after) g.plan.push({ t: 'grass' });
    }
    function makeLane(spec, r, day, stage, prog) {
      var pr = prm(day, stage, prog), L = newLane(r, spec.t, day, stage);
      if (spec.t === 'grass') fillGrass(L, spec, pr);
      else if (spec.t === 'road') fillRoad(L, spec, pr);
      else if (spec.t === 'water') fillWater(L, spec, pr);
      else if (spec.t === 'rail') { L.train = { st: 'wait', t: rr(R, [1.5, 4.5]), x: 0, len: 12 + R() * 6, dir: R() < 0.5 ? 1 : -1, speed: pr.trainSpeed * (0.9 + R() * 0.25), pr: pr }; }
      else if (spec.t === 'door') fillDoor(L);
      if (spec.t === 'grass' || spec.t === 'door') edgeProps(L);
      if (spec.t !== 'water') gen.padCol = rint(R, 1, 7);
      return L;
    }
    function edgeProps(L) {
      for (var c = -6; c <= 14; c++) if ((c < 0 || c > 8) && !(L.door) && R() < 0.55) L.props.push({ x: c, k: pickW(theme.edge, R), v: R() });
    }
    function fillGrass(L, spec, pr) {
      if (spec.start || spec.clear) return;
      var keep = {}; keep[gen.corridor] = 1;
      // nothing right in front of a lily pad
      var before = rows[L.r - 1];
      if (before && before.pads) Object.keys(before.pads).forEach(function (c) { keep[c] = 1; });
      if (spec.approach) { keep[gen.gate] = 1; keep[gen.gate + 1] = 1; }
      // a few things move across in the wind, or a pylon or tree stands by the edge in the storm: then nothing else in the way
      if (!spec.approach && pr.roller && R() < pr.roller) {
        L.dir = R() < 0.5 ? 1 : -1; L.speed = rr(R, [1.0, 1.7]) * (0.9 + 0.1 * L.day);
        fillMovers(L, theme.rollers, [3.2, 6], CARS);
        L.rolling = true;
        return;
      }
      if (!spec.approach && pr.fall && R() < pr.fall) {
        var side = R() < 0.5 ? -1 : 1, n = rint(R, 4, 6);
        L.fall = { side: side, k: theme.fall[Math.floor(R() * theme.fall.length)], cover: side < 0 ? [0, n - 1] : [COLS - n, COLS - 1], st: 'stand', t: 0 };
        return;
      }
      var count = Math.round(COLS * pr.obst * (0.6 + 0.8 * R()));
      for (var i = 0, tries = 0; i < count && tries < 40; tries++) {
        var c = rint(R, 0, COLS - 1);
        if (keep[c] || L.blocks[c]) continue;
        L.blocks[c] = 1; L.props.push({ x: c, k: pr.branches && R() < 0.35 ? 'fallen' : pickW(theme.props, R), v: R() }); i++;
      }
      if (pr.ice) for (c = 0; c < COLS; c++) if (!L.blocks[c] && R() < pr.ice) L.ice[c] = 1;
      if (L.stage === 4 && R() < 0.4) L.lamp = R() < 0.5 ? -0.62 : COLS - 0.38;
      if (R() < 0.3) gen.corridor = clamp(gen.corridor + (R() < 0.5 ? -1 : 1), 0, COLS - 1);
    }
    function fillMovers(L, kinds, gap, cols) {
      var x = XL + R() * 2, first = null, guard = 0;
      while (guard++ < 30) {
        var k = pickW(kinds, R), len = LEN[k] || 1;
        if (x + len > XR - (gap[0] - 0.2)) break;
        var m = { x: x, len: len, k: k, col: cols ? cols[Math.floor(R() * cols.length)] : null, v: R() };
        L.movers.push(m);
        if (!first) first = m;
        x += len + rr(R, gap);
      }
    }
    function fillRoad(L, spec, pr) {
      var prev = rows[L.r - 1];
      L.dir = prev && prev.t === 'road' ? -prev.dir : (R() < 0.5 ? 1 : -1);
      L.speed = rr(R, pr.car);
      var kinds = theme.cars, gap = pr.gap;
      fillMovers(L, kinds, gap, CARS);
      if (L.movers.length < 2) fillMovers(L, kinds, [gap[0], gap[0] + 0.5], CARS);
      if (pr.ice) for (var c = 0; c < COLS; c++) if (R() < pr.ice * 0.5) L.ice[c] = 1;
    }
    function fillWater(L, spec, pr) {
      var prev = rows[L.r - 1];
      if (pr.pads && R() < pr.pads && !(prev && prev.t === 'water' && !prev.pads)) {
        L.pads = {};
        // pads line up across the whole river, so every pad leads on to the next row
        // one line of pads is always in the column kept clear through the grass, so there's always a way on
        if (!(prev && prev.pads) || !gen.padSet) { gen.padSet = [gen.corridor]; var n = rint(R, 1, 3); for (var i = 0; i < n; i++) { var c = rint(R, 0, COLS - 1); if (gen.padSet.indexOf(c) === -1) gen.padSet.push(c); } }
        gen.padSet.forEach(function (c) { L.pads[c] = 1; });
        return;
      }
      L.dir = prev && prev.t === 'water' && !prev.pads ? -prev.dir : (R() < 0.5 ? 1 : -1);
      L.speed = rr(R, pr.log);
      var x = XL + R(), guard = 0;
      while (guard++ < 20) {
        var len = rr(R, pr.logLen);
        if (x + len > XR - 1) break;
        L.movers.push({ x: x, len: len, k: 'log', v: R() });
        x += len + rr(R, pr.logGap);
      }
    }
    function fillDoor(L) {
      var g = gen.gate;
      for (var c = 0; c < COLS; c++) if (c !== g && c !== g + 1) L.blocks[c] = 1;
      L.door = { g: g, open: 0, next: (L.stage + 1) % 5 };
    }

    /* ---------- moving ---------- */
    function solid(L) { return L.t === 'grass' || L.t === 'road' || L.t === 'rail' || L.t === 'door'; }
    function curX() { return p.hop ? lerp(p.fx, p.tx, ease(p.t)) : p.x; }
    function curZ() { return p.hop ? lerp(p.fr, p.tr, ease(p.t)) : p.r; }
    function move(dir) {
      if (!p.alive || G.ended) return;
      if (G.paused) return;
      if (p.hop) { p.queue = dir; return; }
      G.started = true;
      var dr = dir === 'up' ? 1 : dir === 'down' ? -1 : 0, dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      if (dx) p.face = dx;
      tryHop(dx, dr, 0);
    }
    /* slide: 0 for a hop you asked for, 1 for sliding on ice or being pushed by the wind */
    function tryHop(dx, dr, slide) {
      var tr = p.r + dr, from = laneAt(p.r);
      if (tr < 0) { p.bump = 1; return false; }
      var L = laneAt(tr), tx = p.x + dx;
      if (solid(L)) {
        tx = Math.round(tx);
        if (tx < 0 || tx > COLS - 1 || L.blocks[tx]) { if (!slide) p.bump = 1; return false; }
      } else {
        if (tx < -0.3 || tx > COLS - 0.7) { if (!slide) p.bump = 1; return false; }
        if (slide && dr) return false; // never slide into a river
      }
      p.fx = p.x; p.fr = p.r; p.tx = tx; p.tr = tr; p.t = 0; p.hop = true; p.slide = slide; p.dir = [dx, dr];
      p.log = null;
      return true;
    }
    function land() {
      p.hop = false; p.x = p.tx; p.r = p.tr;
      var L = laneAt(p.r);
      if (L.t === 'water') {
        var hit = null;
        if (L.pads) { var c = Math.round(p.x); if (L.pads[c] && Math.abs(p.x - c) < 0.45) { p.x = c; hit = { pad: c }; } }
        else for (var i = 0; i < L.movers.length; i++) { var m = L.movers[i]; if (p.x > m.x - 0.2 && p.x < m.x + m.len + 0.2) { hit = m; break; } }
        if (!hit) { die('water'); return; }
        if (hit.pad === undefined) { p.log = hit; p.off = clamp(p.x - hit.x, 0.3, hit.len - 0.3); p.x = hit.x + p.off; } else p.log = null;
      }
      if (p.r > p.maxR) { p.maxR = p.r; p.idle = 0; if (o.onScore) o.onScore(p.maxR - START_ROW); }
      if (L.stage !== G.stage || L.day !== G.day) {
        var newDay = L.day !== G.day;
        G.stage = L.stage; G.day = L.day;
        if (o.onStage) o.onStage({ day: G.day, stage: G.stage, name: STAGES[G.stage].name, note: newDay ? dayNote(G.day) : STAGES[G.stage].note, newDay: newDay, icon: STAGES[G.stage].icon });
      }
      // ice: keep going the same way
      if (solid(L) && L.ice[Math.round(p.x)] && p.dir && p.slide < 3) {
        var d = p.dir, n = p.slide;
        if (tryHop(d[0], d[1], n + 1)) return;
      }
      if (p.push) { var pd = p.push; p.push = 0; if (tryHop(pd, 0, 1)) return; }
      if (p.queue) { var q = p.queue; p.queue = null; move(q); }
    }
    function die(cause, kind) {
      if (!p.alive || o.god) return;
      p.alive = false; p.cause = cause; p.kind = kind || null; p.deadT = 0; p.hop = false;
      if (cause === 'water' || cause === 'swept') p.splash = 0;
    }

    /* ---------- the world going on ---------- */
    function update(dt) {
      G.t += dt;
      var rBot = Math.floor(V.cam - BEHIND - 3), rTop = Math.ceil(V.cam + 22);
      for (var r = Math.max(rBot, -10); r <= rTop; r++) updLane(laneAt(r), dt);
      // the player
      if (p.alive) {
        if (p.bump) p.bump = Math.max(0, p.bump - dt * 6);
        if (p.hop) { p.t += dt / (p.slide ? SLIDE_T : HOP_T); if (p.t >= 1) { p.t = 1; land(); } }
        else if (p.log) {
          p.x = p.log.x + p.off;
          if (p.x < -0.45 || p.x > COLS - 0.55) die('swept');
        }
        if (p.alive) collide();
        p.idle += dt;
      } else p.deadT += dt;
      hazards(dt);
      // the view creeps forward, faster if you stand still for long; fall behind and the weather catches you
      var pr = prm(G.day, G.stage, 0), z = curZ();
      if (G.started && p.alive) V.cam += pr.creep * (p.idle > 6 ? 2.6 : 1) * dt;
      if (z > V.cam) V.cam += (z - V.cam) * Math.min(1, dt * 5);
      if (p.alive && z < V.cam - BEHIND) die('caught');
      // the look of the weather follows the stage you're in
      var tgt = LOOK[STAGES[G.stage].id], lk = G.look;
      if (!lk) lk = G.look = JSON.parse(JSON.stringify(tgt));
      var k = Math.min(1, dt * 0.9);
      ['fog', 'rain', 'wind', 'dark', 'frost'].forEach(function (key) { var v = tgt[key]; if (key === 'fog' && G.stage === 0) v = prm(G.day, 0, 0).fog; lk[key] += (v - lk[key]) * k; });
      for (var i = 0; i < 4; i++) lk.tint[i] += (tgt.tint[i] - lk.tint[i]) * k;
      if (G.flash) G.flash = Math.max(0, G.flash - dt * 3.2);
      if (!p.alive && !G.ended && p.deadT > 1.0) {
        G.ended = true;
        if (o.onEnd) o.onEnd({ score: p.maxR - START_ROW, day: G.day, stage: G.stage, cause: p.cause, kind: p.kind, caught: STAGES[G.stage].caught });
      }
    }
    function updLane(L, dt) {
      if (L.movers.length && L.speed) {
        for (var i = 0; i < L.movers.length; i++) {
          var m = L.movers[i];
          m.x += L.dir * L.speed * dt;
          if (L.dir > 0 && m.x > XR) m.x -= SPAN;
          if (L.dir < 0 && m.x + m.len < XL) m.x += SPAN;
        }
      }
      var tr = L.train;
      if (tr) {
        tr.t -= dt;
        if (tr.st === 'wait' && tr.t <= 0) { tr.st = 'warn'; tr.t = 1.4; }
        else if (tr.st === 'warn' && tr.t <= 0) { tr.st = 'pass'; tr.x = tr.dir > 0 ? XL - tr.len : XR; }
        else if (tr.st === 'pass') {
          tr.x += tr.dir * tr.speed * dt;
          if ((tr.dir > 0 && tr.x > XR) || (tr.dir < 0 && tr.x + tr.len < XL)) { tr.st = 'wait'; tr.t = rr(R, tr.pr.train); }
        }
      }
      if (L.door) { var near = clamp((p.r - (L.r - 3)) / 2, 0, 1); L.door.open += (near - L.door.open) * Math.min(1, dt * 6); }
      var f = L.fall;
      if (f && f.st !== 'down') {
        var pr = prm(L.day, L.stage, 0);
        if (f.st === 'stand') { if (p.alive && L.r - p.r <= 3 && L.r - p.r >= -1) { f.st = 'wobble'; f.t = 0.7; } }
        else {
          f.t -= dt;
          if (f.st === 'wobble' && f.t <= 0) { f.st = 'warn'; f.t = pr.warn + 0.2; }
          else if (f.st === 'warn' && f.t <= 0) { f.st = 'fall'; f.t = 0.32; }
          else if (f.st === 'fall' && f.t <= 0) {
            f.st = 'down';
            for (var c = f.cover[0]; c <= f.cover[1]; c++) L.blocks[c] = 1;
            if (p.alive) { var cr = p.hop ? (p.t < 0.5 ? p.fr : p.tr) : p.r, cx = Math.round(curX()); if (cr === L.r && cx >= f.cover[0] && cx <= f.cover[1]) die(f.k === 'pylon' ? 'pylon' : 'tree'); }
          }
        }
      }
    }
    function collide() {
      var cr = p.hop ? (p.t < 0.45 ? p.fr : p.tr) : p.r, x = curX(), L = laneAt(cr);
      for (var i = 0; i < L.movers.length; i++) {
        var m = L.movers[i];
        if (L.t === 'water') continue;
        if (x + 0.28 > m.x + 0.1 && x - 0.28 < m.x + m.len - 0.1) { die(L.rolling ? 'roller' : 'car', m.k); return; }
      }
      var tr = L.train;
      if (tr && tr.st === 'pass' && x + 0.3 > tr.x && x - 0.3 < tr.x + tr.len) die('train');
    }
    function hazards(dt) {
      var pr = prm(G.day, G.stage, 0);
      // lightning: the ground glows where it's going to strike
      if (pr.bolt && G.started && p.alive) {
        G.boltT -= dt;
        if (G.boltT <= 0) { spawnBolt(pr); G.boltT = rr(R, pr.bolt); if (G.day >= 3 && R() < 0.4) spawnBolt(pr); }
      }
      G.bolts = G.bolts.filter(function (b) {
        b.t -= dt;
        if (!b.hit && b.t <= 0) {
          b.hit = true; b.t = 0.22; G.flash = 1;
          G.scorch.push({ x: b.x, r: b.r, t: 7 });
          if (p.alive) { var cr = p.hop ? (p.t < 0.5 ? p.fr : p.tr) : p.r; if (cr === b.r && Math.round(curX()) === b.x && solid(laneAt(cr))) die('bolt'); }
          return true;
        }
        return !(b.hit && b.t <= 0);
      });
      G.scorch = G.scorch.filter(function (s) { s.t -= dt; return s.t > 0; });
      // gusts: arrows and wind lines first, then a push one square sideways
      if (pr.gust && G.started && p.alive) {
        if (!G.gust) { G.gustT -= dt; if (G.gustT <= 0) G.gust = { dir: R() < 0.5 ? -1 : 1, t: 1.1, st: 'warn' }; }
        else {
          G.gust.t -= dt;
          if (G.gust.st === 'warn' && G.gust.t <= 0) {
            G.gust.st = 'blow'; G.gust.t = 0.7;
            var L = laneAt(p.r);
            if (!p.log && L.t !== 'water') { if (p.hop) p.push = G.gust.dir; else tryHop(G.gust.dir, 0, 1); }
          } else if (G.gust.st === 'blow' && G.gust.t <= 0) { G.gust = null; G.gustT = rr(R, pr.gust); }
        }
      } else if (!pr.gust) G.gust = null;
    }
    function spawnBolt(pr) {
      for (var tries = 0; tries < 12; tries++) {
        var r = p.r + rint(R, tries < 4 ? 1 : 0, 3), x = clamp(Math.round(p.x) + rint(R, -2, 2), 0, COLS - 1);
        if (tries < 3 && R() < 0.5) x = clamp(Math.round(p.x), 0, COLS - 1);
        var L = laneAt(r);
        if (!solid(L) || L.blocks[x]) continue;
        if (G.bolts.some(function (b) { return b.r === r && b.x === x; })) continue;
        G.bolts.push({ x: x, r: r, t: pr.warn, w: pr.warn, hit: false, seed: R() });
        return;
      }
    }

    /* ---------- drawing ---------- */
    function P(x, z, y) { var dz = z - V.cam; return [V.cx + (x - 4) * V.S + dz * V.S * SKEW, V.cy - dz * V.S * SZ - (y || 0) * V.S * SY]; }
    function quad(a, b, c, d, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); }
    function flat(x0, x1, z0, z1, col, y) { quad(P(x0, z0, y), P(x1, z0, y), P(x1, z1, y), P(x0, z1, y), col); }
    function box(x0, x1, z0, z1, y0, y1, top, front, side) {
      front = front || shade(top, -0.13); side = side || shade(top, -0.27);
      var a = P(x0, z0, y0), b = P(x1, z0, y0), c = P(x1, z0, y1), d = P(x0, z0, y1), e = P(x1, z1, y1), f = P(x0, z1, y1), g = P(x1, z1, y0);
      quad(b, g, e, c, side);
      quad(a, b, c, d, front);
      quad(d, c, e, f, top);
    }
    function ell(cx, cy, rx, ry, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); ctx.fill(); }

    function groundCol(L) {
      if (L.t === 'road') return '#5E626B';
      if (L.t === 'rail') return '#8A8172';
      if (L.t === 'water') return theme.water[L.r & 1];
      return theme.grass[L.r & 1];
    }
    function drawGround(L) {
      var r = L.r, z0 = r - 0.5, z1 = r + 0.5, xa = -12, xb = 22;
      flat(xa, xb, z0, z1, groundCol(L));
      if (L.t === 'road') {
        var up = laneAt(r + 1), dn = laneAt(r - 1);
        if (up.t === 'road') for (var x = -10; x < 20; x++) flat(x + 0.2, x + 0.62, z1 - 0.035, z1 + 0.035, 'rgba(240,236,220,0.75)');
        else flat(xa, xb, z1 - 0.07, z1, '#8A8F98');
        if (dn.t !== 'road') flat(xa, xb, z0, z0 + 0.07, '#8A8F98');
      } else if (L.t === 'water') {
        var dn2 = laneAt(r - 1), up2 = laneAt(r + 1);
        if (dn2.t !== 'water') flat(xa, xb, z0, z0 + 0.08, 'rgba(255,255,255,0.35)');
        if (up2.t !== 'water') flat(xa, xb, z1 - 0.06, z1, 'rgba(20,50,80,0.25)');
        var off = ((G.t * (L.speed || 0.4) * 0.5 * (L.dir || 1)) % 1 + 1) % 1;
        for (var w = -10; w < 20; w += 1.6) flat(w + off, w + off + 0.45, r - 0.1 + ((w * 7) % 3) * 0.08, r - 0.06 + ((w * 7) % 3) * 0.08, 'rgba(255,255,255,0.28)');
      } else if (L.t === 'rail') {
        for (var s = -10; s < 20; s += 0.5) flat(s - 0.07, s + 0.07, r - 0.38, r + 0.38, '#6B4E36');
        flat(xa, xb, r - 0.25, r - 0.19, '#C9CDD4'); flat(xa, xb, r + 0.19, r + 0.25, '#C9CDD4');
      }
      // outside the play area is a little darker
      flat(xa, -0.5, z0, z1, 'rgba(0,0,0,0.12)');
      flat(COLS - 0.5, xb, z0, z1, 'rgba(0,0,0,0.12)');
      // frost and ice
      if (G.look && G.look.frost > 0.05 && (L.t === 'grass' || L.t === 'door')) for (var f = 0; f < 10; f++) { var fx = ((r * 13 + f * 5.3) % 16) - 4, fz = r - 0.4 + ((f * 0.37 + r * 0.13) % 0.8); flat(fx, fx + 0.12, fz, fz + 0.05, 'rgba(255,255,255,' + (0.45 * G.look.frost) + ')'); }
      for (var c in L.ice) { c = +c; flat(c - 0.46, c + 0.46, r - 0.42, r + 0.42, 'rgba(200,232,255,0.62)'); flat(c - 0.3, c + 0.05, r - 0.1, r - 0.04, 'rgba(255,255,255,0.8)'); flat(c - 0.05, c + 0.3, r + 0.12, r + 0.18, 'rgba(255,255,255,0.7)'); }
      // logs and lily pads float on the water, under everything else
      if (L.t === 'water') {
        if (L.pads) for (var pc in L.pads) { pc = +pc; var cc = P(pc, r, 0); ell(cc[0], cc[1], V.S * 0.42, V.S * 0.42 * SZ, '#3E8A3A'); ell(cc[0], cc[1] - 1, V.S * 0.36, V.S * 0.36 * SZ, '#5DAA4E'); }
        L.movers.forEach(function (m) {
          if (m.x > XR || m.x + m.len < XL) return;
          box(m.x, m.x + m.len, r - 0.32, r + 0.32, -0.04, 0.16, theme.log === '#B49A7A' ? '#C9B08E' : '#A8743F', theme.log === '#B49A7A' ? '#A88E6C' : '#8A5A36', '#6E4428');
          var e = P(m.x + m.len, r, 0.06); ell(e[0] + V.S * 0.04, e[1], V.S * 0.05, V.S * 0.18, '#D9B27A');
        });
      }
    }
    function drawDecals(L) {
      var r = L.r;
      G.scorch.forEach(function (s) { if (s.r === r) { var c = P(s.x, r, 0); ell(c[0], c[1], V.S * 0.38, V.S * 0.38 * SZ, 'rgba(30,26,24,' + Math.min(0.55, s.t / 7) + ')'); } });
      G.bolts.forEach(function (b) {
        if (b.r !== r || b.hit) return;
        var k = 1 - b.t / b.w, pulse = 0.5 + 0.5 * Math.sin(G.t * (10 + 14 * k)), c = P(b.x, r, 0);
        ell(c[0], c[1], V.S * (0.3 + 0.2 * k), V.S * (0.3 + 0.2 * k) * SZ, 'rgba(255,226,90,' + (0.25 + 0.45 * pulse * (0.4 + k)) + ')');
        ctx.strokeStyle = 'rgba(255,248,200,' + (0.6 + 0.4 * pulse) + ')'; ctx.lineWidth = Math.max(1.5, V.S * 0.05);
        ctx.beginPath(); ctx.ellipse(c[0], c[1], V.S * 0.46, V.S * 0.46 * SZ, 0, 0, TAU); ctx.stroke();
      });
      var f = L.fall;
      if (f && (f.st === 'warn' || f.st === 'wobble' || f.st === 'fall')) {
        var a = f.st === 'wobble' ? 0.18 : 0.3 + 0.25 * (0.5 + 0.5 * Math.sin(G.t * 16));
        flat(f.cover[0] - 0.5, f.cover[1] + 0.5, r - 0.45, r + 0.45, 'rgba(120,20,30,' + a + ')');
        for (var s2 = f.cover[0] - 0.5; s2 < f.cover[1] + 0.5; s2 += 0.5) flat(s2, s2 + 0.22, r - 0.45, r + 0.45, 'rgba(255,210,60,' + (a * 0.6) + ')');
      }
    }

    /* things standing in a square: x is the square's middle */
    function prop(k, x, z, v) {
      var leaf = theme.leaf, night = G.look && G.look.frost > 0.5;
      switch (k) {
        case 'tree': {
          var h = 0.75 + v * 0.35;
          box(x - 0.1, x + 0.1, z - 0.1, z + 0.1, 0, 0.32, '#8A5A36');
          box(x - 0.38, x + 0.38, z - 0.34, z + 0.34, 0.3, 0.3 + h * 0.6, leaf);
          box(x - 0.26, x + 0.26, z - 0.24, z + 0.24, 0.3 + h * 0.6, 0.3 + h * 0.9, night ? '#E8EEF4' : shade(leaf, 0.12));
          break;
        }
        case 'acacia':
          box(x - 0.07, x + 0.07, z - 0.07, z + 0.07, 0, 0.9, '#7A5A3A');
          box(x - 0.55, x + 0.55, z - 0.4, z + 0.4, 0.88, 1.05, '#7E9A3A');
          break;
        case 'hedge': box(x - 0.46, x + 0.46, z - 0.32, z + 0.32, 0, 0.48, '#4E8C3A'); break;
        case 'bush': box(x - 0.34, x + 0.34, z - 0.3, z + 0.3, 0, 0.36, leaf); box(x - 0.2, x + 0.2, z - 0.18, z + 0.18, 0.36, 0.46, shade(leaf, 0.1)); break;
        case 'flowers':
          box(x - 0.4, x + 0.4, z - 0.32, z + 0.32, 0, 0.12, '#7A5232');
          [['#E84A6A', -0.22, -0.1], ['#F2C230', 0.05, 0.12], ['#B07AFF', 0.24, -0.08], ['#FFFFFF', -0.05, -0.18]].forEach(function (fl) { box(x + fl[1] - 0.07, x + fl[1] + 0.07, z + fl[2] - 0.07, z + fl[2] + 0.07, 0.12, 0.24, fl[0]); });
          break;
        case 'pot': box(x - 0.22, x + 0.22, z - 0.22, z + 0.22, 0, 0.3, '#C8683A'); box(x - 0.18, x + 0.18, z - 0.18, z + 0.18, 0.3, 0.52, leaf); break;
        case 'bench': box(x - 0.4, x + 0.4, z - 0.12, z + 0.12, 0.2, 0.28, '#9A6A3A'); box(x - 0.4, x + 0.4, z + 0.1, z + 0.16, 0.28, 0.55, '#8A5A30'); box(x - 0.38, x - 0.3, z - 0.1, z + 0.1, 0, 0.2, '#3A3F48'); box(x + 0.3, x + 0.38, z - 0.1, z + 0.1, 0, 0.2, '#3A3F48'); break;
        case 'bin': box(x - 0.18, x + 0.18, z - 0.2, z + 0.2, 0, 0.5, '#2F6B3E'); box(x - 0.2, x + 0.2, z - 0.22, z + 0.22, 0.5, 0.56, '#24563A'); break;
        case 'postbox': box(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 0, 0.62, '#C8322A'); box(x - 0.17, x + 0.17, z - 0.17, z + 0.17, 0.62, 0.68, '#2A2A30'); break;
        case 'hut': {
          var hc = ['#E24B4B', '#3E7FD8', '#2EAE6B', '#F2C230'][Math.floor(v * 4)];
          box(x - 0.4, x + 0.4, z - 0.36, z + 0.36, 0, 0.72, '#F7F3EA');
          for (var s = -0.32; s < 0.4; s += 0.24) quad(P(x + s, z - 0.36, 0), P(x + s + 0.1, z - 0.36, 0), P(x + s + 0.1, z - 0.36, 0.72), P(x + s, z - 0.36, 0.72), hc);
          box(x - 0.44, x + 0.44, z - 0.4, z + 0.4, 0.72, 0.84, shade(hc, -0.15));
          break;
        }
        case 'rock': box(x - 0.36, x + 0.3, z - 0.3, z + 0.3, 0, 0.3, '#9AA0A8'); box(x - 0.1, x + 0.36, z - 0.22, z + 0.2, 0, 0.22, '#8A9098'); break;
        case 'castle': box(x - 0.34, x + 0.34, z - 0.3, z + 0.3, 0, 0.3, '#E2C27A'); box(x - 0.18, x + 0.18, z - 0.16, z + 0.16, 0.3, 0.55, '#D9B76C'); box(x - 0.34, x - 0.24, z - 0.3, z - 0.2, 0.3, 0.4, '#D9B76C'); box(x + 0.24, x + 0.34, z - 0.3, z - 0.2, 0.3, 0.4, '#D9B76C'); break;
        case 'parasol': {
          box(x - 0.03, x + 0.03, z - 0.03, z + 0.03, 0, 0.9, '#EDEDED');
          var pc2 = ['#E24B4B', '#3E7FD8', '#F28C28'][Math.floor(v * 3)];
          box(x - 0.44, x + 0.44, z - 0.4, z + 0.4, 0.86, 0.96, pc2, '#FFFFFF');
          break;
        }
        case 'bale': box(x - 0.4, x + 0.4, z - 0.3, z + 0.3, 0, 0.5, '#E2BE5A'); quad(P(x - 0.2, z - 0.3, 0), P(x - 0.14, z - 0.3, 0), P(x - 0.14, z - 0.3, 0.5), P(x - 0.2, z - 0.3, 0.5), '#C9A243'); quad(P(x + 0.14, z - 0.3, 0), P(x + 0.2, z - 0.3, 0), P(x + 0.2, z - 0.3, 0.5), P(x + 0.14, z - 0.3, 0.5), '#C9A243'); break;
        case 'mound': box(x - 0.3, x + 0.3, z - 0.26, z + 0.26, 0, 0.5, '#B8864A'); box(x - 0.16, x + 0.16, z - 0.14, z + 0.14, 0.5, 0.85, '#A8783E'); break;
        case 'fallen': box(x - 0.48, x + 0.48, z - 0.12, z + 0.08, 0, 0.16, '#7A5232', '#6A4428'); box(x - 0.1, x + 0.18, z - 0.3, z - 0.1, 0.05, 0.18, theme.leaf); break;
        case 'lamp': {
          box(x - 0.05, x + 0.05, z - 0.05, z + 0.05, 0, 1.6, '#3A3F48');
          box(x - 0.14, x + 0.14, z - 0.14, z + 0.14, 1.6, 1.72, '#FFE9A8', '#F5D27A', '#E8BE5E');
          break;
        }
      }
    }
    /* things that move along a row: m.x is the back end, len long; dir says which way it's going */
    function mover(m, z, dir) {
      var x0 = m.x, x1 = m.x + m.len, c = m.col || '#E24B4B', k = m.k, ahead = dir > 0;
      var wheels = function (y) { [x0 + 0.18, x1 - 0.18].forEach(function (wx) { var w = P(wx, z - 0.33, y || 0.1); ell(w[0], w[1], V.S * 0.1, V.S * 0.1, '#23262E'); }); };
      var lights = function (y0, y1) {
        // the right-hand end shows: headlights if it's driving right, tail lights if left
        var a = P(x1, z - 0.25, y0), b = P(x1, z + 0.05, y1);
        ctx.fillStyle = ahead ? '#FFF2B0' : '#E8303A'; ctx.fillRect(a[0] - 1, b[1], Math.max(2, V.S * 0.05), Math.max(2, a[1] - b[1]));
      };
      switch (k) {
        case 'bus':
          box(x0, x1, z - 0.36, z + 0.36, 0.1, 0.92, c === '#EDEDED' ? '#E24B4B' : c);
          for (var wx = x0 + 0.15; wx < x1 - 0.3; wx += 0.42) quad(P(wx, z - 0.36, 0.55), P(wx + 0.3, z - 0.36, 0.55), P(wx + 0.3, z - 0.36, 0.82), P(wx, z - 0.36, 0.82), 'rgba(40,60,90,0.75)');
          wheels(); lights(0.2, 0.4); break;
        case 'truck': {
          var cabL = ahead ? x1 - 0.6 : x0, cabR = ahead ? x1 : x0 + 0.6, tl = ahead ? x0 : x0 + 0.62, tr2 = ahead ? x1 - 0.62 : x1;
          box(tl, tr2, z - 0.36, z + 0.36, 0.12, 0.95, '#D8DCE2');
          box(cabL, cabR, z - 0.34, z + 0.34, 0.12, 0.72, c);
          quad(P(cabL + 0.1, z - 0.34, 0.45), P(cabR - 0.1, z - 0.34, 0.45), P(cabR - 0.1, z - 0.34, 0.66), P(cabL + 0.1, z - 0.34, 0.66), 'rgba(40,60,90,0.75)');
          wheels(); lights(0.2, 0.36); break;
        }
        case 'tractor': {
          var tc = m.v < 0.5 ? '#2E8A3A' : '#C8322A';
          box(x0 + 0.1, x1 - 0.1, z - 0.26, z + 0.26, 0.15, 0.48, tc);
          box(x0 + (ahead ? 0.1 : 0.55), x0 + (ahead ? 0.6 : 1.05), z - 0.24, z + 0.24, 0.48, 0.85, 'rgba(180,210,230,0.9)', 'rgba(150,180,200,0.9)', 'rgba(120,150,170,0.9)');
          var bw = P(ahead ? x0 + 0.3 : x1 - 0.3, z - 0.3, 0.28); ell(bw[0], bw[1], V.S * 0.26, V.S * 0.26, '#23262E'); ell(bw[0], bw[1], V.S * 0.1, V.S * 0.1, '#E2BE5A');
          var fw = P(ahead ? x1 - 0.2 : x0 + 0.2, z - 0.3, 0.14); ell(fw[0], fw[1], V.S * 0.14, V.S * 0.14, '#23262E');
          break;
        }
        case 'jeep': {
          var jc = m.v < 0.5 ? '#8A8A4A' : '#A89A6A';
          box(x0, x1, z - 0.33, z + 0.33, 0.12, 0.48, jc);
          box(x0 + 0.25, x0 + 0.32, z - 0.3, z + 0.3, 0.48, 0.8, '#3A3F48'); box(x0 + 0.25, x1 - 0.25, z - 0.3, z - 0.24, 0.74, 0.8, '#3A3F48');
          wheels(); lights(0.24, 0.38); break;
        }
        case 'camper':
          box(x0, x1, z - 0.34, z + 0.34, 0.12, 0.45, c === '#2A2F3A' ? '#3E7FD8' : c);
          box(x0, x1, z - 0.34, z + 0.34, 0.45, 0.82, '#F4F1E8');
          quad(P(x0 + 0.2, z - 0.34, 0.52), P(x1 - 0.2, z - 0.34, 0.52), P(x1 - 0.2, z - 0.34, 0.72), P(x0 + 0.2, z - 0.34, 0.72), 'rgba(40,60,90,0.7)');
          wheels(); lights(0.18, 0.36); break;
        case 'icecream':
          box(x0, x1, z - 0.34, z + 0.34, 0.12, 0.8, '#F7C6D2');
          box(x0 + 0.1, x1 - 0.1, z - 0.34, z - 0.3, 0.12, 0.3, '#8FD3F0');
          box(x0 + m.len / 2 - 0.08, x0 + m.len / 2 + 0.08, z - 0.08, z + 0.08, 0.8, 1.05, '#F2D9A8');
          box(x0 + m.len / 2 - 0.12, x0 + m.len / 2 + 0.12, z - 0.12, z + 0.12, 1.05, 1.2, '#FFF4E0');
          wheels(); lights(0.2, 0.36); break;
        case 'van':
          box(x0, x1, z - 0.35, z + 0.35, 0.12, 0.78, c);
          quad(P(ahead ? x1 - 0.42 : x0 + 0.08, z - 0.35, 0.48), P(ahead ? x1 - 0.08 : x0 + 0.42, z - 0.35, 0.48), P(ahead ? x1 - 0.08 : x0 + 0.42, z - 0.35, 0.7), P(ahead ? x1 - 0.42 : x0 + 0.08, z - 0.35, 0.7), 'rgba(40,60,90,0.75)');
          wheels(); lights(0.2, 0.4); break;
        case 'car':
          box(x0, x1, z - 0.32, z + 0.32, 0.1, 0.4, c);
          box(x0 + m.len * 0.22, x0 + m.len * 0.78, z - 0.28, z + 0.28, 0.4, 0.66, shade(c, 0.12));
          quad(P(x0 + m.len * 0.27, z - 0.28, 0.44), P(x0 + m.len * 0.73, z - 0.28, 0.44), P(x0 + m.len * 0.73, z - 0.28, 0.62), P(x0 + m.len * 0.27, z - 0.28, 0.62), 'rgba(40,60,90,0.7)');
          wheels(); lights(0.18, 0.34); break;
        // things blowing across the grass
        case 'bin': box(x0 + 0.05, x1 - 0.05, z - 0.2, z + 0.2, 0.05 + Math.abs(Math.sin(G.t * 9 + m.v * 9)) * 0.12, 0.55, '#2F6B3E'); break;
        case 'chair': box(x0, x1, z - 0.22, z + 0.22, 0.25, 0.32, '#F4F4F4'); box(x0, x0 + 0.08, z - 0.22, z + 0.22, 0.32, 0.62, '#E8E8E8'); break;
        case 'deckchair': box(x0, x1, z - 0.24, z + 0.24, 0.2, 0.3, '#E24B4B', '#FFFFFF'); break;
        case 'bag': { var bp = P(x0 + m.len / 2, z, 0.35 + 0.15 * Math.sin(G.t * 7 + m.v * 9)); ell(bp[0], bp[1], V.S * 0.2, V.S * 0.16, 'rgba(245,245,245,0.9)'); break; }
        case 'ball': { var bb = P(x0 + m.len / 2, z, 0.28 + 0.2 * Math.abs(Math.sin(G.t * 6 + m.v * 9))); ell(bb[0], bb[1], V.S * 0.25, V.S * 0.25, '#FFFFFF'); ctx.fillStyle = '#E24B4B'; ctx.beginPath(); ctx.moveTo(bb[0], bb[1]); ctx.arc(bb[0], bb[1], V.S * 0.25, G.t * 5, G.t * 5 + 1.2); ctx.fill(); ctx.fillStyle = '#3E7FD8'; ctx.beginPath(); ctx.moveTo(bb[0], bb[1]); ctx.arc(bb[0], bb[1], V.S * 0.25, G.t * 5 + 2.1, G.t * 5 + 3.3); ctx.fill(); break; }
        case 'bale': box(x0, x1, z - 0.3, z + 0.3, 0, 0.55, '#E2BE5A'); break;
        case 'branch': box(x0, x1, z - 0.08, z + 0.08, 0.1, 0.22, '#7A5232'); box(x0 + 0.3, x0 + 0.5, z - 0.3, z - 0.08, 0.12, 0.26, theme.leaf); break;
        case 'tumble': { var tb = P(x0 + m.len / 2, z, 0.3 + 0.1 * Math.abs(Math.sin(G.t * 5 + m.v * 9))); ctx.strokeStyle = '#9A7A4A'; ctx.lineWidth = Math.max(1, V.S * 0.03); for (var q = 0; q < 6; q++) { ctx.beginPath(); ctx.ellipse(tb[0], tb[1], V.S * 0.28, V.S * 0.2, G.t * 4 + q, 0, TAU); ctx.stroke(); } break; }
        default: box(x0, x1, z - 0.3, z + 0.3, 0.1, 0.5, c);
      }
    }
    function train(L) {
      var t = L.train, z = L.r;
      // the signal at the right edge
      var sx = COLS - 0.42;
      box(sx - 0.04, sx + 0.04, z - 0.46, z - 0.38, 0, 1.1, '#3A3F48');
      var on = t.st === 'warn' || t.st === 'pass', blink = on && Math.floor(G.t * 6) % 2 === 0;
      var l1 = P(sx - 0.12, z - 0.46, 1.05), l2 = P(sx + 0.12, z - 0.46, 1.05);
      ell(l1[0], l1[1], V.S * 0.08, V.S * 0.08, blink ? '#FF3B30' : '#5A2A2A'); ell(l2[0], l2[1], V.S * 0.08, V.S * 0.08, on && !blink ? '#FF3B30' : '#5A2A2A');
      if (t.st !== 'pass') return;
      var c = theme.train, x = t.x, seg = 3.2;
      for (var s = 0; s < t.len; s += seg) {
        var a = x + s + 0.06, b = Math.min(x + t.len, x + s + seg) - 0.06;
        if (b < XL - 1 || a > XR + 1) continue;
        box(a, b, z - 0.4, z + 0.4, 0.12, 1.0, c);
        for (var w = a + 0.25; w < b - 0.4; w += 0.6) quad(P(w, z - 0.4, 0.55), P(w + 0.38, z - 0.4, 0.55), P(w + 0.38, z - 0.4, 0.82), P(w, z - 0.4, 0.82), 'rgba(230,240,250,0.85)');
      }
    }
    function door(L) {
      var d = L.door, z = L.r, g = d.g, st = STAGES[d.next], wall = theme.wall, wc = wall[0];
      var seg = function (x0, x1) {
        if (wall[1] === 'hedge') box(x0, x1, z - 0.3, z + 0.3, 0, 0.75, wc);
        else if (wall[1] === 'fence') { for (var x = Math.ceil(x0 * 4) / 4; x < x1; x += 0.25) box(x, x + 0.12, z - 0.05, z + 0.05, 0, 0.75, wc); box(x0, x1, z - 0.06, z + 0.06, 0.45, 0.55, wc); }
        else if (wall[1] === 'bamboo') { for (var y = Math.ceil(x0 * 5) / 5; y < x1; y += 0.2) box(y, y + 0.16, z - 0.08, z + 0.08, 0, 0.8 + ((y * 7) % 1) * 0.15, wc); }
        else { box(x0, x1, z - 0.28, z + 0.28, 0, 0.7, wc); for (var b = Math.ceil(x0); b < x1; b++) quad(P(b, z - 0.28, 0.02), P(b + 0.03, z - 0.28, 0.02), P(b + 0.03, z - 0.28, 0.68), P(b, z - 0.28, 0.68), 'rgba(0,0,0,0.15)'); }
      };
      seg(-12, g - 0.5);
      var post = function (x) { box(x, x + 0.18, z - 0.2, z + 0.2, 0, 1.35, shade(st.door, -0.25)); };
      var o2 = d.open, w = 1 - 0.18;
      post(g - 0.68);
      box(g - 0.5, g - 0.5 + Math.max(0.06, w * (1 - o2)), z - 0.06, z + 0.06, 0, 1.15, st.door);
      box(g + 1.5 - Math.max(0.06, w * (1 - o2)), g + 1.5, z - 0.06, z + 0.06, 0, 1.15, st.door);
      post(g + 1.5);
      box(g - 0.68, g + 1.68, z - 0.2, z + 0.2, 1.35, 1.55, shade(st.door, -0.15));
      seg(g + 1.68, 22);
      // the next stage's sign above the door
      var c = P(g + 0.5, z - 0.2, 1.75);
      icon(st.icon, c[0], c[1], V.S * 0.32);
    }
    function icon(k, x, y, s) {
      ctx.save(); ctx.translate(x, y);
      ell(0, 0, s * 1.15, s * 1.15, 'rgba(255,255,255,0.92)');
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.5, s * 0.16);
      if (k === 'sun') { ell(0, 0, s * 0.42, s * 0.42, '#F2A62E'); ctx.strokeStyle = '#F2A62E'; for (var i = 0; i < 8; i++) { var a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6); ctx.lineTo(Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85); ctx.stroke(); } }
      else if (k === 'moon') { ell(0, 0, s * 0.6, s * 0.6, '#2E3A66'); ell(s * 0.28, -s * 0.18, s * 0.5, s * 0.5, 'rgba(255,255,255,1)'); }
      else if (k === 'bolt') { ctx.fillStyle = '#F2C230'; ctx.beginPath(); ctx.moveTo(s * 0.1, -s * 0.75); ctx.lineTo(-s * 0.35, s * 0.08); ctx.lineTo(0, s * 0.08); ctx.lineTo(-s * 0.15, s * 0.75); ctx.lineTo(s * 0.4, -s * 0.12); ctx.lineTo(s * 0.04, -s * 0.12); ctx.closePath(); ctx.fill(); }
      else if (k === 'wind') { ctx.strokeStyle = '#3E8F8A'; ctx.beginPath(); ctx.moveTo(-s * 0.7, -s * 0.2); ctx.lineTo(s * 0.3, -s * 0.2); ctx.arc(s * 0.3, -s * 0.42, s * 0.22, Math.PI / 2, -Math.PI * 0.9, true); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-s * 0.7, s * 0.22); ctx.lineTo(s * 0.45, s * 0.22); ctx.stroke(); }
      else { ctx.strokeStyle = '#8A9AAE'; [-0.35, 0, 0.35].forEach(function (yy, j) { ctx.beginPath(); ctx.moveTo(-s * (0.7 - j * 0.1), yy * s); ctx.lineTo(s * (0.7 - j * 0.15), yy * s); ctx.stroke(); }); }
      ctx.restore();
    }
    function faller(L) {
      var f = L.fall, z = L.r, edge = f.side < 0 ? -0.62 : COLS - 0.38, base = P(edge, z, 0);
      var len = (f.cover[1] - f.cover[0] + 1.6) * V.S, ang = 0;
      if (f.st === 'wobble') ang = Math.sin(G.t * 30) * 0.04;
      else if (f.st === 'warn') ang = Math.sin(G.t * 22) * 0.06 + 0.05;
      else if (f.st === 'fall') ang = (1 - f.t / 0.32) * Math.PI / 2;
      else if (f.st === 'down') ang = Math.PI / 2;
      ctx.save(); ctx.translate(base[0], base[1]); ctx.rotate(ang * (f.side < 0 ? 1 : -1));
      if (f.k === 'pylon') {
        var h = len * 0.95, w0 = V.S * 0.3, w1 = V.S * 0.08;
        ctx.strokeStyle = '#5E6670'; ctx.lineWidth = Math.max(1.4, V.S * 0.045);
        ctx.beginPath(); ctx.moveTo(-w0, 0); ctx.lineTo(-w1, -h); ctx.moveTo(w0, 0); ctx.lineTo(w1, -h); ctx.stroke();
        ctx.lineWidth = Math.max(1, V.S * 0.025);
        for (var i = 0; i < 7; i++) { var y1 = -h * i / 7, y2 = -h * (i + 1) / 7, a1 = lerp(w0, w1, i / 7), a2 = lerp(w0, w1, (i + 1) / 7); ctx.beginPath(); ctx.moveTo(-a1, y1); ctx.lineTo(a2, y2); ctx.moveTo(a1, y1); ctx.lineTo(-a2, y2); ctx.stroke(); }
        ctx.lineWidth = Math.max(1.4, V.S * 0.045);
        [0.72, 0.88].forEach(function (k2) { ctx.beginPath(); ctx.moveTo(-V.S * 0.42, -h * k2); ctx.lineTo(V.S * 0.42, -h * k2); ctx.stroke(); });
        ctx.fillStyle = '#C8D4DE'; [-0.42, 0.42].forEach(function (sx) { [0.72, 0.88].forEach(function (k2) { ctx.fillRect(sx * V.S - 2, -h * k2, 4, V.S * 0.12); }); });
      } else {
        var th = len * 0.9, tw = V.S * 0.16, cw = f.k === 'acacia' ? V.S * 0.9 : V.S * 0.5;
        ctx.fillStyle = '#7A5232'; ctx.fillRect(-tw / 2, -th, tw, th);
        ctx.fillStyle = f.k === 'acacia' ? '#7E9A3A' : theme.leaf;
        if (f.k === 'acacia') ctx.fillRect(-cw, -th - V.S * 0.18, cw * 2, V.S * 0.22);
        else { ctx.fillRect(-cw, -th - V.S * 0.3, cw * 2, V.S * 0.75); ctx.fillStyle = shade(theme.leaf, 0.12); ctx.fillRect(-cw * 0.7, -th - V.S * 0.62, cw * 1.4, V.S * 0.4); }
      }
      ctx.restore();
    }
    function drawPlayer() {
      var x = curX(), z = curZ(), t = p.hop ? p.t : 1;
      var y = p.hop ? Math.sin(Math.PI * t) * (p.slide ? 0.06 : 0.36) : p.bump ? Math.sin(p.bump * Math.PI) * 0.12 : 0;
      var sinking = 0;
      if (!p.alive && (p.cause === 'water' || p.cause === 'swept')) sinking = Math.min(1, p.deadT * 2.2);
      if (!p.alive && p.cause === 'caught') return;
      var g = P(x, z, 0);
      if (!sinking) ell(g[0], g[1] + V.S * 0.04, V.S * 0.3, V.S * 0.11, 'rgba(20,24,40,0.22)');
      var s = P(x, z - 0.12, y), m = 1.12 * V.S / Math.max(shp.w, shp.h);
      ctx.save();
      if (sinking) { ctx.beginPath(); ctx.rect(s[0] - V.S, s[1] - V.S * 2, V.S * 2, V.S * 2 + V.S * 0.05 - sinking * V.S * 0.1); ctx.clip(); ctx.translate(0, sinking * V.S * 0.7); }
      ctx.translate(s[0], s[1]);
      if (!p.alive && (p.cause === 'car' || p.cause === 'train' || p.cause === 'pylon' || p.cause === 'tree' || p.cause === 'roller')) ctx.scale(1.35, 0.22);
      var sq = p.hop ? 1 + 0.12 * Math.sin(Math.PI * t) : 1;
      ctx.scale((A.sym ? 1 : p.face) * m / sq, m * sq);
      ctx.translate(-(shp.x0 + shp.w / 2), 0);
      try { A.draw(ctx, G.t); } finally { ctx.restore(); }
      if (!p.alive && p.cause === 'bolt') { ell(s[0], s[1] - V.S * 0.3, V.S * 0.45 * (1 + p.deadT), V.S * 0.3 * (1 + p.deadT), 'rgba(60,60,64,' + Math.max(0, 0.6 - p.deadT * 0.5) + ')'); }
      if (sinking) for (var i = 0; i < 2; i++) { var rp = (p.deadT * 1.6 + i * 0.4) % 1.2; ctx.strokeStyle = 'rgba(255,255,255,' + Math.max(0, 0.8 - rp) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(g[0], g[1], V.S * (0.2 + rp * 0.5), V.S * (0.2 + rp * 0.5) * SZ, 0, 0, TAU); ctx.stroke(); }
    }
    function drawObjects(L, pz) {
      var r = L.r, list = [];
      L.props.forEach(function (q) { list.push({ x: q.x, f: function () { prop(q.k, q.x, r, q.v); } }); });
      if (L.lamp !== undefined) list.push({ x: L.lamp, f: function () { prop('lamp', L.lamp, r, 0); } });
      if (L.t !== 'water') L.movers.forEach(function (m) { if (m.x < XR && m.x + m.len > XL) list.push({ x: m.x + m.len / 2, f: function () { mover(m, r, L.dir); } }); });
      if (L.door) list.push({ x: -20, f: function () { door(L); } });
      if (L.fall) list.push({ x: L.fall.side < 0 ? -1 : COLS, f: function () { faller(L); } });
      if (L.train) list.push({ x: 30, f: function () { train(L); } });
      if (pz === r) list.push({ x: curX(), f: drawPlayer });
      list.sort(function (a, b) { return a.x - b.x; });
      list.forEach(function (it) { it.f(); });
    }
    function drawWeather(W, H) {
      var lk = G.look;
      if (!lk) return;
      // a colour wash for the time of day
      if (lk.tint[3] > 0.01) { ctx.fillStyle = 'rgba(' + Math.round(lk.tint[0]) + ',' + Math.round(lk.tint[1]) + ',' + Math.round(lk.tint[2]) + ',' + lk.tint[3].toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
      // fog: thick far off, thin near you, with slow drifting banks
      if (lk.fog > 0.02) {
        var gr = ctx.createLinearGradient(0, 0, 0, H * 0.62);
        gr.addColorStop(0, 'rgba(234,239,244,' + (lk.fog * 0.97) + ')'); gr.addColorStop(0.5, 'rgba(234,239,244,' + (lk.fog * 0.5) + ')'); gr.addColorStop(1, 'rgba(234,239,244,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H * 0.62);
        for (var i = 0; i < 4; i++) {
          var fx = ((G.t * (8 + i * 3) + i * 170) % (W + 300)) - 150, fy = H * (0.18 + i * 0.13);
          var g2 = ctx.createRadialGradient(fx, fy, 0, fx, fy, W * 0.4);
          g2.addColorStop(0, 'rgba(240,244,248,' + (lk.fog * 0.35) + ')'); g2.addColorStop(1, 'rgba(240,244,248,0)');
          ctx.fillStyle = g2; ctx.fillRect(fx - W * 0.4, fy - W * 0.4, W * 0.8, W * 0.8);
        }
      }
      // rain
      if (lk.rain > 0.02) {
        if (!G.rain.length) for (var j = 0; j < 140; j++) G.rain.push([Math.random(), Math.random(), 0.7 + Math.random() * 0.6]);
        ctx.strokeStyle = 'rgba(200,214,236,' + (0.45 * lk.rain) + ')'; ctx.lineWidth = 1.2; ctx.beginPath();
        G.rain.forEach(function (d) { var x = ((d[0] + G.t * 0.08 * d[2]) % 1) * (W + 60) - 30, y = ((d[1] + G.t * 1.6 * d[2]) % 1) * (H + 40) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16); });
        ctx.stroke();
      }
      // wind lines, many more during a gust, and arrows showing which way it'll push
      var gust = G.gust, wind = lk.wind + (gust ? 1.2 : 0);
      if (wind > 0.05) {
        if (!G.streaks.length) for (var k = 0; k < 26; k++) G.streaks.push([Math.random(), Math.random(), 0.6 + Math.random()]);
        var gd = gust ? gust.dir : 1, n = Math.round(Math.min(26, 6 + wind * 10));
        ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(0.75, 0.25 + wind * 0.25) + ')'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        for (var s = 0; s < n; s++) {
          var st = G.streaks[s], sx = (((st[0] + G.t * 0.5 * st[2] * gd) % 1 + 1) % 1) * (W + 120) - 60, sy = st[1] * H * 0.9 + 20;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - gd * 22, sy - 5, sx - gd * 44, sy); ctx.stroke();
        }
        if (gust && gust.st === 'warn') {
          var ax = W / 2, ay = H * 0.22, al = 0.5 + 0.5 * Math.sin(G.t * 14);
          ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.35 * al) + ')';
          for (var a = -1; a <= 1; a++) { var cx = ax + a * 46 * gd; ctx.beginPath(); ctx.moveTo(cx + gd * 16, ay); ctx.lineTo(cx - gd * 8, ay - 14); ctx.lineTo(cx - gd * 8, ay + 14); ctx.closePath(); ctx.fill(); }
        }
      }
      // the dark, with light round you, from headlights and street lamps
      if (lk.dark > 0.02) {
        var dpr = V.dpr;
        if (dk.width !== canvas.width || dk.height !== canvas.height) { dk.width = canvas.width; dk.height = canvas.height; }
        dctx.setTransform(dpr, 0, 0, dpr, 0, 0); dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, W, H);
        dctx.fillStyle = 'rgba(6,10,28,' + Math.min(0.88, lk.dark) + ')'; dctx.fillRect(0, 0, W, H);
        dctx.globalCompositeOperation = 'destination-out';
        var hole = function (x, y, r, a) { var g3 = dctx.createRadialGradient(x, y, 0, x, y, r); g3.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g3.addColorStop(1, 'rgba(0,0,0,0)'); dctx.fillStyle = g3; dctx.fillRect(x - r, y - r, r * 2, r * 2); };
        var pp = P(curX(), curZ(), 0.3); hole(pp[0], pp[1], V.S * 3.2, 0.95);
        var rBot = Math.floor(V.cam - 8), rTop = Math.ceil(V.cam + 18);
        for (var r = rBot; r <= rTop; r++) {
          var L = laneAt(r);
          if (L.t === 'road') L.movers.forEach(function (m) { if (m.x > XR || m.x + m.len < XL) return; var hx = L.dir > 0 ? m.x + m.len + 0.9 : m.x - 0.9, h = P(hx, r, 0.1); hole(h[0], h[1], V.S * 1.3, 0.8); });
          if (L.lamp !== undefined) { var lp = P(L.lamp, r, 0.2); hole(lp[0], lp[1], V.S * 2.2, 0.85); }
          if (L.train && L.train.st !== 'wait') { var sg = P(COLS - 0.42, r, 1); hole(sg[0], sg[1], V.S * 0.9, 0.7); }
          if (L.door) { var dp = P(L.door.g + 0.5, r, 1.5); hole(dp[0], dp[1], V.S * 1.6, 0.8); }
        }
        G.bolts.forEach(function (b) { if (!b.hit) { var bp = P(b.x, b.r, 0); hole(bp[0], bp[1], V.S * 0.9, 0.9); } });
        if (G.flash) { dctx.fillStyle = 'rgba(0,0,0,' + G.flash + ')'; dctx.fillRect(0, 0, W, H); }
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(dk, 0, 0); ctx.restore();
      }
      // lightning: the bolt itself and a white flash
      G.bolts.forEach(function (b) {
        if (!b.hit) return;
        var e = P(b.x, b.r, 0), x = e[0] + (b.seed - 0.5) * 80, y = -10, R2 = rng(Math.floor(b.seed * 1e6));
        ctx.strokeStyle = 'rgba(255,250,210,0.95)'; ctx.lineWidth = Math.max(2.5, V.S * 0.08); ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(x, y);
        for (var q = 1; q <= 9; q++) { var tt = q / 9; ctx.lineTo(lerp(x, e[0], tt) + (q < 9 ? (R2() - 0.5) * 40 : 0), lerp(y, e[1], tt)); }
        ctx.stroke();
      });
      if (G.flash) { ctx.fillStyle = 'rgba(255,255,250,' + (G.flash * 0.55) + ')'; ctx.fillRect(0, 0, W, H); }
      // the weather catching up at the bottom
      var z = curZ(), gap = z - (V.cam - BEHIND), near = clamp(1 - gap / 3.5, 0, 1), st2 = STAGES[G.stage].id;
      var col = st2 === 'mist' ? '236,240,245' : st2 === 'night' ? '4,6,18' : st2 === 'storm' ? '40,46,62' : '120,132,150';
      var bh = H * (0.12 + 0.2 * near), gb = ctx.createLinearGradient(0, H - bh, 0, H);
      gb.addColorStop(0, 'rgba(' + col + ',0)'); gb.addColorStop(1, 'rgba(' + col + ',' + (0.35 + 0.6 * near) + ')');
      ctx.fillStyle = gb; ctx.fillRect(0, H - bh, W, bh);
    }
    function draw() {
      var W = V.W, H = V.H;
      ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
      ctx.fillStyle = theme.out; ctx.fillRect(0, 0, W, H);
      var rTop = Math.ceil(V.cam + (V.cy + 3 * V.S) / (V.S * SZ)) + 1, rBot = Math.floor(V.cam - (H - V.cy) / (V.S * SZ)) - 1, r;
      for (r = rTop; r >= rBot; r--) drawGround(laneAt(r));
      for (r = rTop; r >= rBot; r--) drawDecals(laneAt(r));
      var pz = Math.round(curZ());
      for (r = rTop; r >= rBot; r--) drawObjects(laneAt(r), pz);
      drawWeather(W, H);
    }

    /* ---------- running ---------- */
    function frame(ts) {
      G.raf = requestAnimationFrame(frame);
      var now = ts / 1000, dt = G.last ? Math.min(0.05, now - G.last) : 0.016;
      G.last = now;
      if (!G.paused) update(dt);
      draw();
    }
    function resize() {
      var w = canvas.clientWidth || 360, h = canvas.clientHeight || 640, dpr = Math.min(2, root.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      V.W = w; V.H = h; V.dpr = dpr;
      V.S = Math.min(w / 10.2, h / 13.5);
      V.cx = w / 2 - V.S * 0.3; V.cy = h * 0.7;
    }
    resize();
    laneAt(40);
    if (o.onStage) o.onStage({ day: G.day, stage: 0, name: STAGES[0].name, note: G.day > 1 ? dayNote(G.day) : STAGES[0].note, newDay: G.day > 1, first: true, icon: STAGES[0].icon });
    G.raf = requestAnimationFrame(frame);
    return {
      move: move,
      resize: resize,
      pause: function () { G.paused = true; G.last = 0; },
      resume: function () { G.paused = false; G.last = 0; },
      stop: function () { cancelAnimationFrame(G.raf); G.raf = 0; },
      info: function () { return { x: p.x, r: p.r, hop: p.hop, alive: p.alive, cause: p.cause, score: p.maxR - START_ROW, day: G.day, stage: G.stage, cam: V.cam, started: G.started, log: !!p.log }; },
      hz: function () { return { bolts: G.bolts.filter(function (b) { return !b.hit; }).map(function (b) { return [b.x, b.r, b.t]; }), gust: G.gust ? G.gust.dir : 0, creep: prm(G.day, G.stage, 0).creep, now: G.t, x: curX(), z: curZ() }; },
      // tests: what's in a row, and a quick way to a stage
      lane: function (r) { var L = laneAt(r); return { t: L.t, stage: L.stage, day: L.day, blocks: Object.keys(L.blocks).map(Number), movers: L.movers.map(function (m) { return [m.x, m.len, m.k]; }), dir: L.dir, speed: L.speed, pads: L.pads ? Object.keys(L.pads).map(Number) : null, door: L.door ? L.door.g : null, ice: Object.keys(L.ice).map(Number), fall: L.fall ? L.fall.st : null, train: L.train ? L.train.st : null }; },
      skip: function (r) { if (!o.test) return; p.r = p.tr = p.fr = r; p.x = p.tx = p.fx = clamp(Math.round(p.x), 0, COLS - 1); var L = laneAt(r); if (L.blocks[p.x] || !solid(L)) { for (var c = 0; c < COLS; c++) if (!L.blocks[c] && solid(L)) { p.x = p.tx = p.fx = c; break; } } p.maxR = Math.max(p.maxR, r); V.cam = r; G.stage = L.stage; G.day = L.day; G.look = null; G.started = true; }
    };
  }

  function themeFor(id) { var t = WC.animals && WC.animals.type(id); return t && THEMES[t.row] ? t.row : 'garden'; }
  WC.hop = { create: create, STAGES: STAGES, THEMES: THEMES, themeFor: themeFor, NAMES: NAMES, START_ROW: START_ROW };
})(typeof window !== 'undefined' ? window : globalThis);
