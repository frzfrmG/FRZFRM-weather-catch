/* FRZFRM Weather Catch: Weather Hop.
   A road-crossing game in the Crossy Road view: you play one of your caught animals and hop up a never-ending world of
   grass, roads, rivers and railway lines through a day of weather. A day has five stages (misty morning, sunny midday,
   windy afternoon, thunderstorm, frosty night), each ending in a door themed like the next. Then the next day comes, with
   the last night's weather left behind (frost, fallen branches, thicker fog) and everything a bit faster.
   The world is seen from above and in front, leaning a little to the right, and painted soft and round like the jar
   drawings: rounded blocks, round trees, logs, grass with tufts, and a sky along the top with the stage's weather.
   The animals are their jar drawings, standing up in it. Hops, splashes, trains and thunder have sounds (sfx.js).
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
      cars: [['car', 3], ['van', 1.5], ['bus', 0.4]], rollers: [['bin', 2], ['chair', 1]], water: ['#5DB5E2', '#4FA7D6'], log: '#8A5A36', wall: ['#4E8C3A', 'hedge'], train: '#C8402F', fall: ['tree', 'pylon'], leaf: '#5DAA45', bloom: ['flower', '#FFFFFF', '#F7D84A'], sky: 'hills' },
    pets: { name: 'Town and park', grass: ['#93CE6E', '#8AC465'], out: '#7AAE5C', props: [['tree', 2.5], ['bench', 1.5], ['bin', 1], ['postbox', 0.8]], edge: [['tree', 3], ['bench', 1], ['postbox', 0.6]],
      cars: [['car', 3], ['bus', 1.2], ['van', 1.2]], rollers: [['bin', 2], ['bag', 1]], water: ['#5AA7C8', '#4F99BA'], log: '#8A5A36', wall: ['#A8553A', 'brick'], train: '#2E6FC0', fall: ['pylon', 'tree'], leaf: '#55A548', bloom: ['flower', '#FFFFFF', '#F2C230'], sky: 'town' },
    coast: { name: 'Seaside', grass: ['#EBDDAE', '#E3D39F'], out: '#D6C38B', props: [['hut', 2], ['rock', 2], ['castle', 1.2], ['parasol', 1.2]], edge: [['rock', 2], ['hut', 1.5], ['parasol', 1]],
      cars: [['camper', 2], ['car', 2], ['icecream', 1]], rollers: [['ball', 2], ['deckchair', 1]], water: ['#3EA7D8', '#3497C7'], log: '#B49A7A', wall: ['#F2EEE4', 'fence'], train: '#E07A2A', fall: ['pylon'], leaf: '#7FB458', bloom: ['pebble', '#F7EEDC', '#D9C3A0'], sky: 'sea' },
    country: { name: 'Countryside', grass: ['#96CD63', '#8CC35A'], out: '#7BAF50', props: [['tree', 2.5], ['bale', 2], ['bush', 1.5], ['rock', 0.8]], edge: [['tree', 3], ['bush', 1.5], ['bale', 0.8]],
      cars: [['tractor', 2], ['car', 2], ['truck', 1]], rollers: [['bale', 1.5], ['branch', 1.5]], water: ['#5AAED6', '#4C9FC7'], log: '#8A5A36', wall: ['#9A9488', 'stone'], train: '#3E7A3A', fall: ['tree', 'pylon'], leaf: '#58A640', bloom: ['flower', '#F7D84A', '#FFF6D0'], sky: 'hills' },
    zoo: { name: 'Safari park', grass: ['#D2C877', '#C9BF6C'], out: '#B8AE5E', props: [['acacia', 2], ['rock', 2], ['mound', 1.2], ['bush', 1]], edge: [['acacia', 2], ['rock', 1.5], ['bush', 1]],
      cars: [['jeep', 3], ['truck', 1]], rollers: [['tumble', 2], ['branch', 1]], water: ['#5DA6C2', '#5097B3'], log: '#8A5A36', wall: ['#C2A15A', 'bamboo'], train: '#7A5A3A', fall: ['acacia', 'pylon'], leaf: '#8AA548', bloom: ['pebble', '#C9B87A', '#B19A60'], sky: 'savanna' }
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
    var V = { W: 0, H: 0, S: 40, cx: 0, cy: 0, cam: START_ROW, dpr: 1, sky: 80 };
    var day0 = Math.max(1, o.day || 1);
    var rows = [], backs = {};
    var gen = { r: 0, day: day0, stage: 0, start: 0, plan: [], first: true, fresh: false, gate: 3, corridor: 4, padCol: 4, lastWater: 1, lastRoad: 1 };
    var p = { x: 4, r: START_ROW, fx: 4, fr: START_ROW, tx: 4, tr: START_ROW, t: 1, hop: false, slide: 0, bump: 0, face: 1, queue: null, log: null, off: 0, alive: true, cause: null, kind: null, deadT: 0, maxR: START_ROW, dir: null, push: 0, idle: 0 };
    var G = { t: 0, started: false, paused: false, ended: false, raf: 0, last: 0, look: null, stage: 0, day: day0, bolts: [], boltT: 3, gust: null, gustT: 6, flash: 0, scorch: [], rain: [], streaks: [], snow: [], dark: null, fx: [], sky: null, cloudX: 0, pf: 0, pt: 0 };
    var LEAVES = ['214,140,60', '196,96,52', '232,184,72', hexRGB(theme.leaf).join(',')];
    /* a sound, while the game's going (sfx.js; switched off in More) */
    function snd(n) { if (WC.sfx && !G.ended && !G.paused) WC.sfx.play(n); }
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
      if (!slide) snd('hop');
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
        if (hit.pad === undefined) { p.log = hit; p.off = clamp(p.x - hit.x, 0.3, hit.len - 0.3); p.x = hit.x + p.off; snd('log'); } else { p.log = null; snd('pad'); }
        spawnFx('drop', p.x, p.r - 0.3, 0.1, 4, { spd: 0.8, up: 1.6, g: 7, life: 0.5, s: 0.05, col: '226,242,255' });
      } else spawnFx('dust', p.x, p.r - 0.22, 0.04, p.slide ? 2 : 4, { spd: 0.9, up: 0.5, life: 0.4, s: 0.08, col: dustCol(L) });
      if (p.r > p.maxR) { p.maxR = p.r; p.idle = 0; if (o.onScore) o.onScore(p.maxR - START_ROW); }
      if (L.stage !== G.stage || L.day !== G.day) {
        var newDay = L.day !== G.day;
        G.stage = L.stage; G.day = L.day;
        if (o.onStage) o.onStage({ day: G.day, stage: G.stage, name: STAGES[G.stage].name, note: newDay ? dayNote(G.day) : STAGES[G.stage].note, newDay: newDay, icon: STAGES[G.stage].icon });
      }
      // ice: keep going the same way
      if (solid(L) && L.ice[Math.round(p.x)] && p.dir && p.slide < 3) {
        var d = p.dir, n = p.slide;
        if (tryHop(d[0], d[1], n + 1)) { snd('slide'); return; }
      }
      if (p.push) { var pd = p.push; p.push = 0; if (tryHop(pd, 0, 1)) return; }
      if (p.queue) { var q = p.queue; p.queue = null; move(q); }
    }
    function die(cause, kind) {
      if (!p.alive || o.god) return;
      var dx0 = curX();
      p.alive = false; p.cause = cause; p.kind = kind || null; p.deadT = 0; p.hop = false;
      if (cause === 'water' || cause === 'swept') { p.splash = 0; snd('splash'); spawnFx('drop', dx0, p.r - 0.2, 0.1, 14, { spd: 1.6, up: 3, g: 9, life: 0.8, s: 0.06, col: '225,242,255' }); }
      else if (cause === 'car' || cause === 'roller' || cause === 'train') { snd('squash'); spawnFx('star', dx0, p.r, 0.5, 6, { spd: 1.8, up: 0.6, life: 0.8, s: 0.16 }); }
      else if (cause === 'pylon' || cause === 'tree') spawnFx('dust', dx0, p.r, 0.1, 10, { spd: 1.6, up: 0.6, life: 0.7, s: 0.12, col: '206,196,176' });
      else if (cause === 'caught') snd('lose');
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
      // little effects, leaves blowing in the wind, and the sky
      for (var fi = G.fx.length - 1; fi >= 0; fi--) {
        var f2 = G.fx[fi];
        f2.t += dt; f2.x += f2.vx * dt; f2.z += f2.vz * dt; f2.y += f2.vy * dt;
        if (f2.g) { f2.vy -= f2.g * dt; if (f2.y < 0) { f2.y = 0; f2.vy = 0; f2.vx *= 0.4; f2.vz *= 0.4; } }
        if (f2.t >= f2.life) G.fx.splice(fi, 1);
      }
      if (lk.wind > 0.3 && Math.random() < dt * 5 * lk.wind) {
        var wd = G.gust ? G.gust.dir : 1, lz = V.cam - 3 + Math.random() * 14, lsp = xspan(lz);
        G.fx.push({ k: 'leaf', x: wd > 0 ? lsp[0] : lsp[1], z: lz, y: 0.3 + Math.random() * 1.4, vx: wd * (2.4 + Math.random() * 2.4) * (G.gust ? 1.8 : 1), vz: 0, vy: 0, g: 0, t: 0, life: 7, s: 0.07 + Math.random() * 0.05, col: LEAVES[Math.floor(Math.random() * LEAVES.length)], rot: Math.random() * TAU });
      }
      easeSky(dt);
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
        if (tr.st === 'wait' && tr.t <= 0) { tr.st = 'warn'; tr.t = 1.4; if (Math.abs(L.r - p.r) < 9) snd('bell'); }
        else if (tr.st === 'warn' && tr.t <= 0) { tr.st = 'pass'; tr.x = tr.dir > 0 ? XL - tr.len : XR; if (Math.abs(L.r - p.r) <= 5) snd('train'); }
        else if (tr.st === 'pass') {
          tr.x += tr.dir * tr.speed * dt;
          if ((tr.dir > 0 && tr.x > XR) || (tr.dir < 0 && tr.x + tr.len < XL)) { tr.st = 'wait'; tr.t = rr(R, tr.pr.train); }
        }
      }
      if (L.door) {
        var was = L.door.open, near = clamp((p.r - (L.r - 3)) / 2, 0, 1);
        L.door.open += (near - L.door.open) * Math.min(1, dt * 6);
        if (was < 0.5 && L.door.open >= 0.5) { snd('door'); spawnFx('glow', L.door.g + 0.5, L.r - 0.2, 0.7, 12, { spd: 1.4, up: 1.2, life: 1, s: 0.14, col: '255,236,160' }); }
      }
      var f = L.fall;
      if (f && f.st !== 'down') {
        var pr = prm(L.day, L.stage, 0);
        if (f.st === 'stand') { if (p.alive && L.r - p.r <= 3 && L.r - p.r >= -1) { f.st = 'wobble'; f.t = 0.7; snd('creak'); } }
        else {
          f.t -= dt;
          if (f.st === 'wobble' && f.t <= 0) { f.st = 'warn'; f.t = pr.warn + 0.2; }
          else if (f.st === 'warn' && f.t <= 0) { f.st = 'fall'; f.t = 0.32; }
          else if (f.st === 'fall' && f.t <= 0) {
            f.st = 'down';
            snd('crash');
            spawnFx('dust', (f.cover[0] + f.cover[1]) / 2, L.r, 0.1, 12, { dx: f.cover[1] - f.cover[0] + 1, spd: 1.2, up: 0.5, life: 0.8, s: 0.14, col: '214,204,184' });
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
          snd('thunder');
          spawnFx('spark', b.x, b.r, 0.1, 12, { spd: 2.6, up: 3, g: 8, life: 0.5, s: 0.1 });
          G.scorch.push({ x: b.x, r: b.r, t: 7 });
          if (p.alive) { var cr = p.hop ? (p.t < 0.5 ? p.fr : p.tr) : p.r; if (cr === b.r && Math.round(curX()) === b.x && solid(laneAt(cr))) die('bolt'); }
          return true;
        }
        return !(b.hit && b.t <= 0);
      });
      G.scorch = G.scorch.filter(function (s) { s.t -= dt; return s.t > 0; });
      // gusts: arrows and wind lines first, then a push one square sideways
      if (pr.gust && G.started && p.alive) {
        if (!G.gust) { G.gustT -= dt; if (G.gustT <= 0) { G.gust = { dir: R() < 0.5 ? -1 : 1, t: 1.1, st: 'warn' }; snd('gust'); } }
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

    /* ---------- drawing ----------
       The world is painted soft and round, in the same flat painted style as the animals in their jars: rounded blocks,
       round trees and bushes, logs that look like logs, grass with tufts and flowers, and a sky along the top showing the
       stage's weather over the world's own skyline. Things that never change shape (trees, rocks, cars) are painted once
       into little pictures and reused, which keeps it quick on a phone. */
    var PO = null, SPR = {}, sprS = 0, sprD = 0;
    function P(x, z, y) {
      if (PO) { var d0 = z - PO.z; return [PO.ox + (x - PO.x) * V.S + d0 * V.S * SKEW, PO.oy - d0 * V.S * SZ - (y || 0) * V.S * SY]; }
      var dz = z - V.cam; return [V.cx + (x - 4) * V.S + dz * V.S * SKEW, V.cy - dz * V.S * SZ - (y || 0) * V.S * SY];
    }
    /* paint something once into a picture of its own, w by h squares with its ground point ax across and ay down, and
       reuse it. The view leans the same way everywhere, so the picture fits wherever the thing stands */
    function cached(key, x, z, w, h, ax, ay, fn) {
      if (sprS !== V.S || sprD !== V.dpr) { SPR = {}; sprS = V.S; sprD = V.dpr; }
      var s = SPR[key];
      if (!s) {
        var cw = Math.ceil(w * V.S), ch = Math.ceil(h * V.S), cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.ceil(cw * V.dpr)); cv.height = Math.max(1, Math.ceil(ch * V.dpr));
        var keep = ctx;
        ctx = cv.getContext('2d');
        ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
        PO = { x: x, z: z, ox: ax * V.S, oy: ay * V.S };
        try { fn(); } finally { ctx = keep; PO = null; }
        s = SPR[key] = { cv: cv, w: cw, h: ch, ax: ax * V.S, ay: ay * V.S };
      }
      var b = P(x, z, 0);
      ctx.drawImage(s.cv, b[0] - s.ax, b[1] - s.ay, s.w, s.h);
    }
    /* the same scatter of tufts, flowers and ripples every time a row is drawn */
    function hash(a, b) { var h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
    /* which squares across are on screen in a row */
    function xspan(z) { var dz = z - V.cam; return [Math.floor(4 - V.cx / V.S - dz * SKEW) - 1, Math.ceil(4 + (V.W - V.cx) / V.S - dz * SKEW) + 1]; }
    function path4(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); }
    function quad(a, b, c, d, col) { ctx.fillStyle = col; path4(a, b, c, d); ctx.fill(); }
    /* a face with soft corners: filled, then outlined in its own colour with round joins */
    function squad(a, b, c, d, col, lw) { ctx.fillStyle = col; path4(a, b, c, d); ctx.fill(); if (lw > 0.6) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); } }
    function flat(x0, x1, z0, z1, col, y) { quad(P(x0, z0, y), P(x1, z0, y), P(x1, z1, y), P(x0, z1, y), col); }
    /* a block with rounded corners and a soft light along its top edge. rad: how round, in squares */
    function box(x0, x1, z0, z1, y0, y1, top, front, side, rad) {
      front = front || shade(top, -0.12); side = side || shade(top, -0.25);
      var rd = rad === undefined ? 0.08 : rad, i = Math.max(0, Math.min(rd / 2, (x1 - x0) / 3, (z1 - z0) / 3, (y1 - y0) / 3)), lw = i * 2 * V.S;
      x0 += i; x1 -= i; z0 += i; z1 -= i; y0 += i; y1 -= i;
      var a = P(x0, z0, y0), b = P(x1, z0, y0), c = P(x1, z0, y1), d = P(x0, z0, y1), e = P(x1, z1, y1), f = P(x0, z1, y1), g = P(x1, z1, y0);
      squad(b, g, e, c, side, lw);
      squad(a, b, c, d, front, lw);
      squad(d, c, e, f, top, lw);
      if (lw > 2 && c[0] - d[0] > lw * 1.5) {
        ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = Math.max(1, lw * 0.4); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(d[0] + lw * 0.2, d[1] - lw * 0.1); ctx.lineTo(c[0] - lw * 0.2, c[1] - lw * 0.1); ctx.stroke();
      }
    }
    function ell(cx, cy, rx, ry, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); ctx.fill(); }
    function dot(cx, cy, r) { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, Math.max(0.1, r), 0, TAU); }
    function rrect(x, y, w, h, r) { ctx.beginPath(); rpath(x, y, w, h, r); }
    function rpath(x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    /* a painted ball, lit from the top left: tree tops, bushes, rocks. sy squashes it */
    function ball(x, z, y, r, col, sy) {
      var c = P(x, z, y), R0 = r * V.S, ry = R0 * (sy || 1);
      var g = ctx.createRadialGradient(c[0] - R0 * 0.35, c[1] - ry * 0.45, R0 * 0.08, c[0], c[1], R0 * 1.08);
      g.addColorStop(0, shade(col, 0.2)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.2));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c[0], c[1], Math.max(0.1, R0), Math.max(0.1, ry), 0, 0, TAU); ctx.fill();
    }
    function shadowAt(x, z, rx, a) { var c = P(x, z, 0); ell(c[0], c[1] + V.S * 0.02, rx * V.S, rx * V.S * SZ * 0.75, 'rgba(16,30,20,' + (a || 0.2) + ')'); }
    function star4(x, y, s, col) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - s);
      ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
    }
    /* something round lying along the row, like a log or a hay bale: a long rounded shape lit from above, cut end showing */
    function cyl(x0, x1, z, y0, rad, col, endCol) {
      var yc = y0 + rad, a = P(x0, z, yc), b = P(x1, z, yc), hh = rad * 1.16 * V.S, top = a[1] - hh;
      var g = ctx.createLinearGradient(0, top, 0, top + hh * 2);
      g.addColorStop(0, shade(col, 0.22)); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, -0.28));
      ctx.fillStyle = g; rrect(a[0] - hh * 0.3, top, b[0] - a[0] + hh * 0.3, hh * 2, hh * 0.95); ctx.fill();
      var ec = endCol || shade(col, 0.3);
      ell(b[0], b[1], Math.max(1, hh * 0.36), hh * 0.96, ec);
      ctx.strokeStyle = shade(ec, -0.18); ctx.lineWidth = Math.max(1, V.S * 0.022);
      ctx.beginPath(); ctx.ellipse(b[0], b[1], Math.max(0.5, hh * 0.18), hh * 0.5, 0, 0, TAU); ctx.stroke();
    }
    function rgb(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a === undefined ? 1 : +a.toFixed(3)) + ')'; }
    function hexRGB(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    function mixc(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }

    /* ---------- the ground ---------- */
    function groundCol(L) {
      if (L.t === 'road') return '#62666F';
      if (L.t === 'rail') return '#9A8F7C';
      if (L.t === 'water') return theme.water[L.r & 1];
      return theme.grass[L.r & 1];
    }
    function grassy(L) { return L.t === 'grass' || L.t === 'door'; }
    /* where grass meets a road, river or railway its edge is soft and bumpy. down: the bumps hang from the row's far
       edge; otherwise they rise from its near edge */
    function verge(z, col, r, down, sp) {
      var st = 0.4, x = Math.floor(sp[0]) - 1, c0 = P(x, z, 0), sg = down ? 1 : -1;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(c0[0], c0[1]);
      for (var i = 0; x < sp[1] + 1; i++, x += st) {
        var c1 = P(x + st, z, 0), b = V.S * SZ * (0.2 + 0.14 * hash(r * 3 + (down ? 1 : 0), i));
        ctx.quadraticCurveTo((c0[0] + c1[0]) / 2, c0[1] + sg * b, c1[0], c1[1]);
        c0 = c1;
      }
      ctx.closePath(); ctx.fill();
    }
    function tufts(L, sp) {
      if (V.lite) return;
      var r = L.r, base = groundCol(L), wide = sp[1] - sp[0], n = Math.round(wide * 0.6), i, s, c;
      // tufts: three little blades each
      ctx.fillStyle = shade(base, -0.17); ctx.beginPath();
      for (i = 0; i < n; i++) {
        c = P(sp[0] + hash(r, i) * wide, r - 0.4 + hash(r, i + 101) * 0.8, 0); s = V.S * (0.07 + 0.04 * hash(r, i + 202));
        ctx.moveTo(c[0] - s, c[1]); ctx.lineTo(c[0] - s * 0.85, c[1] - s * 1.1); ctx.lineTo(c[0] - s * 0.4, c[1]); ctx.lineTo(c[0], c[1] - s * 1.6);
        ctx.lineTo(c[0] + s * 0.4, c[1]); ctx.lineTo(c[0] + s * 0.85, c[1] - s * 1.1); ctx.lineTo(c[0] + s, c[1]); ctx.closePath();
      }
      ctx.fill();
      var bl = theme.bloom;
      if (!bl || L.door) return;
      var pts = [];
      for (i = 0; i < Math.round(wide * 0.2); i++) {
        var fx = sp[0] + hash(r, i + 303) * wide;
        if (fx > -0.5 && fx < COLS - 0.5 && L.blocks[Math.round(fx)]) continue;
        pts.push(P(fx, r - 0.35 + hash(r, i + 404) * 0.7, 0));
      }
      s = V.S * 0.05;
      ctx.fillStyle = bl[1]; ctx.beginPath();
      pts.forEach(function (p2) { ctx.moveTo(p2[0] + s * 1.5, p2[1]); ctx.ellipse(p2[0], p2[1], s * 1.5, s * (bl[0] === 'flower' ? 1.2 : 0.8), 0, 0, TAU); });
      ctx.fill();
      ctx.fillStyle = bl[2]; ctx.beginPath();
      pts.forEach(function (p2, k) { if (bl[0] === 'flower') dot(p2[0], p2[1], s * 0.75); else if (k % 2) { ctx.moveTo(p2[0] + s * 2.4, p2[1] + s * 0.4); ctx.ellipse(p2[0] + s * 1.6, p2[1] + s * 0.4, s * 0.8, s * 0.55, 0, 0, TAU); } });
      ctx.fill();
    }
    function drawGround(L) {
      var r = L.r, z0 = r - 0.5, z1 = r + 0.5, sp = xspan(r), xa = sp[0] - 1, xb = sp[1] + 1;
      var up = laneAt(r + 1), dn = laneAt(r - 1);
      flat(xa, xb, z0, z1, groundCol(L));
      if (grassy(L)) tufts(L, sp);
      else if (L.t === 'road') {
        // soft patches in the tarmac, kerbs, and lane lines with round ends
        for (var q = 0; q < 3; q++) { var pc = P(sp[0] + hash(r, q + 20) * (sp[1] - sp[0]), r - 0.2 + hash(r, q + 30) * 0.4, 0); ell(pc[0], pc[1], V.S * (0.35 + 0.3 * hash(r, q + 40)), V.S * 0.1, 'rgba(0,0,0,0.06)'); }
        if (up.t === 'road') {
          ctx.strokeStyle = 'rgba(246,242,228,0.85)'; ctx.lineWidth = Math.max(1.5, V.S * 0.065); ctx.lineCap = 'round'; ctx.beginPath();
          for (var x = sp[0]; x < sp[1]; x++) { var d1 = P(x + 0.22, z1, 0), d2 = P(x + 0.62, z1, 0); ctx.moveTo(d1[0], d1[1]); ctx.lineTo(d2[0], d2[1]); }
          ctx.stroke();
        } else { flat(xa, xb, z1 - 0.1, z1, '#B4B9C1'); flat(xa, xb, z1 - 0.14, z1 - 0.1, 'rgba(0,0,0,0.12)'); }
        if (dn.t !== 'road') flat(xa, xb, z0, z0 + 0.08, '#B4B9C1');
      } else if (L.t === 'water') {
        if (up.t !== 'water') flat(xa, xb, z1 - 0.16, z1, 'rgba(8,40,72,0.16)');
        if (dn.t !== 'water') flat(xa, xb, z0, z0 + 0.06, 'rgba(255,255,255,0.45)');
        // ripples drifting with the current, and the odd sparkle
        var off = (((G.t * (L.speed || 0.4) * 0.5 * (L.dir || 1)) % 1.6) + 1.6) % 1.6;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = Math.max(1.2, V.S * 0.035); ctx.lineCap = 'round'; ctx.beginPath();
        for (var w = Math.floor(sp[0] / 1.6) * 1.6 - 1.6; w < sp[1]; w += 1.6) {
          var a = P(w + off, r - 0.18 + hash(r, Math.round(w * 5)) * 0.36, 0), qs = V.S * 0.14;
          ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(a[0] + qs, a[1] - qs * 0.5, a[0] + qs * 2, a[1]); ctx.quadraticCurveTo(a[0] + qs * 3, a[1] + qs * 0.5, a[0] + qs * 4, a[1]);
        }
        ctx.stroke();
        for (var sk = 0; sk < (V.lite ? 0 : 5); sk++) {
          var sa = Math.sin(G.t * 2.2 + sk * 2.3 + r * 1.7);
          if (sa < 0.6) continue;
          var sc = P(sp[0] + hash(r, sk + 505) * (sp[1] - sp[0]), r - 0.25 + hash(r, sk + 606) * 0.5, 0);
          star4(sc[0], sc[1], V.S * 0.1 * sa, 'rgba(255,255,255,' + ((sa - 0.5) * 1.6).toFixed(2) + ')');
        }
      } else if (L.t === 'rail') {
        // wooden sleepers with round ends, and two shiny rails
        ctx.strokeStyle = '#7A5A3E'; ctx.lineWidth = Math.max(2, V.S * 0.12); ctx.lineCap = 'round'; ctx.beginPath();
        for (var s = Math.floor(sp[0] * 2) / 2; s < sp[1]; s += 0.5) { var t1 = P(s, r - 0.33, 0), t2 = P(s, r + 0.33, 0); ctx.moveTo(t1[0], t1[1]); ctx.lineTo(t2[0], t2[1]); }
        ctx.stroke();
        flat(xa, xb, r - 0.27, r - 0.19, '#6E737B'); flat(xa, xb, r + 0.17, r + 0.25, '#6E737B');
        flat(xa, xb, r - 0.25, r - 0.21, '#E4E8EE'); flat(xa, xb, r + 0.19, r + 0.23, '#E4E8EE');
      }
      if (!grassy(L)) { if (grassy(up)) verge(z1, groundCol(up), r, true, sp); if (grassy(dn)) verge(z0, groundCol(dn), r + 1000, false, sp); }
      // outside the play area is a little darker
      flat(xa, -0.5, z0, z1, 'rgba(0,0,0,0.1)');
      flat(COLS - 0.5, xb, z0, z1, 'rgba(0,0,0,0.1)');
      // frost and ice
      if (G.look && G.look.frost > 0.05 && grassy(L)) for (var f = 0; f < 10; f++) { var fx = ((r * 13 + f * 5.3) % 16) - 4, fz = r - 0.4 + ((f * 0.37 + r * 0.13) % 0.8); flat(fx, fx + 0.12, fz, fz + 0.05, 'rgba(255,255,255,' + (0.45 * G.look.frost) + ')'); }
      for (var c in L.ice) {
        c = +c;
        squad(P(c - 0.38, r - 0.36, 0), P(c + 0.38, r - 0.36, 0), P(c + 0.38, r + 0.36, 0), P(c - 0.38, r + 0.36, 0), '#CFE9FB', V.S * 0.14);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(1.2, V.S * 0.045); ctx.lineCap = 'round'; ctx.beginPath();
        var h1 = P(c - 0.26, r - 0.08, 0), h2 = P(c + 0.02, r - 0.08, 0), h3 = P(c - 0.04, r + 0.14, 0), h4 = P(c + 0.22, r + 0.14, 0);
        ctx.moveTo(h1[0], h1[1]); ctx.lineTo(h2[0], h2[1]); ctx.moveTo(h3[0], h3[1]); ctx.lineTo(h4[0], h4[1]); ctx.stroke();
      }
      // lily pads and logs float on the water, under everything else
      if (L.t === 'water') {
        if (L.pads) for (var pd in L.pads) lilyPad(+pd, r);
        L.movers.forEach(function (m) { if (m.x > XR || m.x + m.len < XL) return; logArt(m, r); });
      }
    }
    function lilyPad(c, r) {
      var cc = P(c, r, 0), R0 = V.S * 0.4;
      ell(cc[0], cc[1] + V.S * 0.04, R0, R0 * SZ, '#357A34');
      ctx.fillStyle = '#5DAA4E'; ctx.beginPath(); ctx.moveTo(cc[0], cc[1]); ctx.ellipse(cc[0], cc[1], R0 * 0.95, R0 * 0.95 * SZ, 0, -1.2, TAU - 1.6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(40,110,40,0.45)'; ctx.lineWidth = Math.max(1, V.S * 0.02); ctx.beginPath();
      for (var i = 0; i < 5; i++) { var a = -0.4 + i * 1.05; ctx.moveTo(cc[0], cc[1]); ctx.lineTo(cc[0] + Math.cos(a) * R0 * 0.8, cc[1] + Math.sin(a) * R0 * 0.8 * SZ); }
      ctx.stroke();
      if (hash(r, c + 7) < 0.3) { ell(cc[0] - R0 * 0.3, cc[1] - R0 * 0.12, V.S * 0.09, V.S * 0.07, '#FF9EC0'); ell(cc[0] - R0 * 0.3, cc[1] - R0 * 0.14, V.S * 0.035, V.S * 0.03, '#FFE27A'); }
    }
    function logArt(m, r) {
      var sandy = theme.log === '#B49A7A', col = sandy ? '#BFA27C' : '#9C6B3F', w0 = P(m.x, r - 0.3, 0), w1 = P(m.x + m.len, r - 0.3, 0);
      ell((w0[0] + w1[0]) / 2, w0[1] + V.S * 0.03, (w1[0] - w0[0]) / 2 + V.S * 0.12, V.S * 0.07, 'rgba(255,255,255,0.32)');
      cyl(m.x, m.x + m.len, r, -0.05, 0.2, col, sandy ? '#E8D4B0' : '#E2BD86');
      ctx.strokeStyle = shade(col, -0.2); ctx.lineWidth = Math.max(1, V.S * 0.025); ctx.lineCap = 'round'; ctx.beginPath();
      for (var bx = m.x + 0.25, j = 0; bx < m.x + m.len - 0.4; bx += 0.5, j++) { var p1 = P(bx, r, 0.12 + (j % 2) * 0.12); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p1[0] + V.S * 0.24, p1[1]); }
      ctx.stroke();
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
        squad(P(f.cover[0] - 0.45, r - 0.42, 0), P(f.cover[1] + 0.45, r - 0.42, 0), P(f.cover[1] + 0.45, r + 0.42, 0), P(f.cover[0] - 0.45, r + 0.42, 0), 'rgba(120,20,30,' + a + ')', 0);
        for (var s2 = f.cover[0] - 0.45; s2 < f.cover[1] + 0.45; s2 += 0.5) flat(s2, s2 + 0.22, r - 0.42, r + 0.42, 'rgba(255,210,60,' + (a * 0.6) + ')');
      }
    }

    /* ---------- things standing in a square (x is the square's middle) ---------- */
    /* how much room each kind of thing needs in its picture: width, height, and where its ground point is, in squares.
       Kept tight, as every picture is copied whole onto the screen each frame */
    var ROOM = { tree: [1.3, 1.7, 0.65, 1.38], acacia: [1.5, 1.5, 0.75, 1.18], hedge: [1.25, 1.3, 0.62, 0.95], hut: [1.15, 1.55, 0.58, 1.18],
      parasol: [1.35, 1.45, 0.62, 1.12], lamp: [1.2, 2.1, 0.6, 1.78], mound: [0.95, 1.45, 0.48, 1.15], flowers: [1.0, 1.0, 0.5, 0.65] };
    function prop(k, x, z, v) {
      var vb = Math.floor(v * 4) / 4 + 0.125, night = G.look && G.look.frost > 0.5 ? 1 : 0, rm = ROOM[k] || [1.2, 1.25, 0.6, 0.9];
      cached('p|' + k + '|' + vb + '|' + night, x, z, rm[0], rm[1], rm[2], rm[3], function () { propArt(k, x, z, vb, night); });
    }
    function propArt(k, x, z, v, night) {
      var leaf = theme.leaf, lt = shade(leaf, 0.14), dk = shade(leaf, -0.16);
      var snow = function (bx, bz, by, r) { if (!night) return; var c = P(bx, bz, by); ell(c[0] - r * V.S * 0.1, c[1] - r * V.S * 0.5, r * V.S * 0.72, r * V.S * 0.4, 'rgba(250,252,255,0.95)'); };
      switch (k) {
        case 'tree': {
          var h = 0.75 + v * 0.35, col = v < 0.5 ? leaf : lt;
          shadowAt(x, z, 0.44, 0.2);
          box(x - 0.08, x + 0.08, z - 0.08, z + 0.08, 0, 0.45, '#8A5A36', null, null, 0.06);
          ball(x - 0.17, z + 0.1, 0.42 + h * 0.3, 0.27, dk);
          ball(x + 0.19, z + 0.05, 0.4 + h * 0.28, 0.25, col);
          ball(x, z - 0.04, 0.52 + h * 0.42, 0.34, col);
          snow(x, z - 0.04, 0.52 + h * 0.42, 0.34);
          break;
        }
        case 'acacia': {
          shadowAt(x, z, 0.62, 0.15);
          ctx.strokeStyle = '#7A5A3A'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, V.S * 0.09);
          var b0 = P(x, z, 0), b1 = P(x + 0.04, z, 0.6), b2 = P(x - 0.26, z, 0.92), b3 = P(x + 0.3, z, 0.94);
          ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); ctx.moveTo(b1[0], b1[1]); ctx.lineTo(b3[0], b3[1]); ctx.stroke();
          var cp = P(x, z, 1.02);
          ell(cp[0], cp[1] + V.S * 0.07, V.S * 0.64, V.S * 0.2, '#62802C');
          ell(cp[0] - V.S * 0.03, cp[1] - V.S * 0.02, V.S * 0.58, V.S * 0.16, '#86A23E');
          ell(cp[0] - V.S * 0.14, cp[1] - V.S * 0.07, V.S * 0.28, V.S * 0.07, '#A0BA58');
          break;
        }
        case 'hedge': {
          shadowAt(x, z, 0.52, 0.18);
          box(x - 0.46, x + 0.46, z - 0.3, z + 0.3, 0, 0.36, '#4E8C3A', null, null, 0.26);
          ball(x - 0.27, z - 0.06, 0.38, 0.2, '#4E8C3A'); ball(x + 0.27, z - 0.06, 0.38, 0.2, '#4E8C3A'); ball(x, z - 0.1, 0.42, 0.22, '#5A9A44');
          snow(x, z - 0.1, 0.42, 0.34);
          break;
        }
        case 'bush': shadowAt(x, z, 0.38, 0.18); ball(x - 0.16, z + 0.05, 0.2, 0.2, dk); ball(x + 0.17, z, 0.2, 0.2, leaf); ball(x, z - 0.06, 0.28, 0.24, lt); snow(x, z - 0.06, 0.3, 0.24); break;
        case 'flowers':
          shadowAt(x, z, 0.42, 0.12);
          box(x - 0.38, x + 0.38, z - 0.3, z + 0.3, 0, 0.1, '#7A5232', null, null, 0.18);
          [['#E84A6A', -0.2, -0.08], ['#F2C230', 0.06, 0.12], ['#B07AFF', 0.22, -0.06], ['#FFFFFF', -0.04, -0.18], ['#FF8FB0', 0.17, 0.2]].forEach(function (fl) {
            var st = P(x + fl[1], z + fl[2], 0.1), tp = P(x + fl[1], z + fl[2], 0.26);
            ctx.strokeStyle = '#3F7A30'; ctx.lineWidth = Math.max(1, V.S * 0.03); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(st[0], st[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
            ball(x + fl[1], z + fl[2], 0.28, 0.075, fl[0]);
          });
          break;
        case 'pot': shadowAt(x, z, 0.28, 0.18); box(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, 0.3, '#C8683A', null, null, 0.12); ball(x, z, 0.48, 0.22, leaf); snow(x, z, 0.48, 0.22); break;
        case 'bench':
          shadowAt(x, z, 0.46, 0.14);
          box(x - 0.38, x - 0.3, z - 0.1, z + 0.1, 0, 0.22, '#3A3F48', null, null, 0.03); box(x + 0.3, x + 0.38, z - 0.1, z + 0.1, 0, 0.22, '#3A3F48', null, null, 0.03);
          box(x - 0.43, x + 0.43, z - 0.14, z + 0.12, 0.2, 0.28, '#B07A44', null, null, 0.06);
          box(x - 0.43, x + 0.43, z + 0.1, z + 0.17, 0.32, 0.6, '#9A6A3A', null, null, 0.06);
          break;
        case 'bin': shadowAt(x, z, 0.25, 0.18); box(x - 0.18, x + 0.18, z - 0.2, z + 0.2, 0, 0.5, '#2F6B3E', null, null, 0.16); box(x - 0.21, x + 0.21, z - 0.23, z + 0.23, 0.48, 0.58, '#24563A', null, null, 0.1); break;
        case 'postbox':
          shadowAt(x, z, 0.22, 0.2);
          box(x - 0.16, x + 0.16, z - 0.16, z + 0.16, 0, 0.62, '#D0362C', null, null, 0.22);
          ball(x, z, 0.62, 0.16, '#D63A2F', 0.62);
          box(x - 0.09, x + 0.09, z - 0.17, z - 0.16, 0.42, 0.47, '#2A2A30', null, null, 0);
          break;
        case 'hut': {
          var hc = ['#E24B4B', '#3E7FD8', '#2EAE6B', '#F2C230'][Math.floor(v * 4) % 4];
          shadowAt(x, z, 0.48, 0.18);
          box(x - 0.38, x + 0.38, z - 0.34, z + 0.34, 0, 0.7, '#F7F3EA', null, null, 0.1);
          for (var s = -0.3; s < 0.35; s += 0.2) quad(P(x + s, z - 0.345, 0.06), P(x + s + 0.09, z - 0.345, 0.06), P(x + s + 0.09, z - 0.345, 0.66), P(x + s, z - 0.345, 0.66), hc);
          box(x - 0.45, x + 0.45, z - 0.41, z + 0.41, 0.68, 0.84, shade(hc, -0.12), null, null, 0.12);
          break;
        }
        case 'rock': shadowAt(x, z, 0.4, 0.18); ball(x + 0.13, z + 0.06, 0.13, 0.2, '#8E949C', 0.72); ball(x - 0.08, z - 0.04, 0.17, 0.28, '#A4AAB2', 0.76); snow(x - 0.08, z - 0.04, 0.2, 0.24); break;
        case 'castle': {
          shadowAt(x, z, 0.42, 0.14);
          box(x - 0.34, x + 0.34, z - 0.3, z + 0.3, 0, 0.28, '#E2C27A', null, null, 0.1);
          box(x - 0.17, x + 0.17, z - 0.15, z + 0.15, 0.28, 0.56, '#D9B76C', null, null, 0.1);
          box(x - 0.34, x - 0.22, z - 0.3, z - 0.18, 0.28, 0.4, '#D9B76C', null, null, 0.06); box(x + 0.22, x + 0.34, z - 0.3, z - 0.18, 0.28, 0.4, '#D9B76C', null, null, 0.06);
          var f0 = P(x, z, 0.56), f1 = P(x, z, 0.82);
          ctx.strokeStyle = '#5A4A3A'; ctx.lineWidth = Math.max(1, V.S * 0.025); ctx.beginPath(); ctx.moveTo(f0[0], f0[1]); ctx.lineTo(f1[0], f1[1]); ctx.stroke();
          ctx.fillStyle = '#E24B4B'; ctx.beginPath(); ctx.moveTo(f1[0], f1[1]); ctx.lineTo(f1[0] + V.S * 0.16, f1[1] + V.S * 0.05); ctx.lineTo(f1[0], f1[1] + V.S * 0.1); ctx.closePath(); ctx.fill();
          break;
        }
        case 'parasol': {
          var pc2 = ['#E24B4B', '#3E7FD8', '#F28C28'][Math.floor(v * 3) % 3], cc = P(x, z, 0.88), rw = V.S * 0.5, rh = V.S * 0.24, ry = rh * 0.42, i;
          shadowAt(x + 0.1, z, 0.5, 0.14);
          box(x - 0.025, x + 0.025, z - 0.025, z + 0.025, 0, 0.9, '#EDEDED', null, null, 0);
          ctx.fillStyle = pc2; ctx.beginPath(); ctx.ellipse(cc[0], cc[1], rw, rh, 0, Math.PI, TAU); ctx.ellipse(cc[0], cc[1], rw, ry, 0, 0, Math.PI); ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          for (i = 1; i < 6; i += 2) {
            var a0 = Math.PI - i * Math.PI / 6, a1 = Math.PI - (i + 1) * Math.PI / 6;
            ctx.beginPath(); ctx.moveTo(cc[0], cc[1] - rh); ctx.lineTo(cc[0] + Math.cos(a0) * rw, cc[1] + Math.sin(a0) * ry); ctx.ellipse(cc[0], cc[1], rw, ry, 0, a0, a1, true); ctx.closePath(); ctx.fill();
          }
          ell(cc[0], cc[1] - rh, V.S * 0.04, V.S * 0.04, '#EDEDED');
          break;
        }
        case 'bale': shadowAt(x, z, 0.46, 0.18); cyl(x - 0.38, x + 0.38, z, 0, 0.27, '#E2BE5A', '#D9AE48'); break;
        case 'mound': shadowAt(x, z, 0.36, 0.18); ball(x, z, 0.3, 0.32, '#B8864A', 1.05); ball(x + 0.02, z, 0.68, 0.17, '#A8783E', 1.35); break;
        case 'fallen': shadowAt(x, z, 0.52, 0.14); cyl(x - 0.46, x + 0.46, z - 0.02, 0, 0.1, '#7A5232', '#C49A60'); ball(x + 0.12, z - 0.2, 0.14, 0.14, leaf); ball(x - 0.14, z - 0.22, 0.1, 0.11, dk); break;
        case 'lamp': {
          shadowAt(x, z, 0.2, 0.2);
          box(x - 0.045, x + 0.045, z - 0.045, z + 0.045, 0, 1.6, '#3A3F48', null, null, 0.03);
          var lc = P(x, z, 1.66), lg = ctx.createRadialGradient(lc[0], lc[1], 0, lc[0], lc[1], V.S * 0.55);
          lg.addColorStop(0, 'rgba(255,236,170,0.6)'); lg.addColorStop(1, 'rgba(255,236,170,0)');
          ctx.fillStyle = lg; ctx.fillRect(lc[0] - V.S * 0.55, lc[1] - V.S * 0.55, V.S * 1.1, V.S * 1.1);
          ball(x, z, 1.66, 0.13, '#FFE9A8');
          box(x - 0.13, x + 0.13, z - 0.13, z + 0.13, 1.76, 1.83, '#3A3F48', null, null, 0.06);
          break;
        }
      }
    }
    /* things that move along a row: m.x is the back end, len long; dir says which way it's going. Vehicles keep their
       shape, so each kind and colour is painted once */
    var VEHICLE = { bus: 1.3, truck: 1.3, tractor: 1.15, jeep: 1.15, camper: 1.2, icecream: 1.3, van: 1.15, car: 1.0 };
    function mover(m, z, dir) {
      var ay = VEHICLE[m.k];
      if (ay) cached('v|' + m.k + '|' + (m.col || '') + '|' + (dir > 0 ? 1 : 0) + '|' + (m.v < 0.5 ? 0 : 1), m.x, z, m.len + 0.5, ay + 0.42, 0.22, ay, function () { moverArt(m, z, dir); });
      else moverArt(m, z, dir);
    }
    function moverArt(m, z, dir) {
      var x0 = m.x, x1 = m.x + m.len, c = m.col || '#E24B4B', k = m.k, ahead = dir > 0, len = m.len, zf = z - 0.33;
      var shadow = function () { var s0 = P(x0, z, 0), s1 = P(x1, z, 0); ell((s0[0] + s1[0]) / 2, s0[1] + V.S * 0.04, (s1[0] - s0[0]) / 2 + V.S * 0.08, V.S * 0.2, 'rgba(16,20,30,0.2)'); };
      var wheel = function (wx, r) { var w = P(wx, zf, r); ell(w[0], w[1], V.S * r, V.S * r, '#23262E'); ell(w[0], w[1], V.S * r * 0.45, V.S * r * 0.45, '#A4AAB4'); };
      var wheels = function (r) { r = r || 0.12; wheel(x0 + 0.22, r); wheel(x1 - 0.22, r); };
      var win = function (a, b, y0, y1, col) { squad(P(a, zf - 0.01, y0), P(b, zf - 0.01, y0), P(b, zf - 0.01, y1), P(a, zf - 0.01, y1), col || 'rgba(46,72,108,0.85)', V.S * 0.06); };
      var lamp = function (y) { var lp = P(x1 - 0.02, z - 0.18, y); ell(lp[0], lp[1], V.S * 0.06, V.S * 0.07, ahead ? '#FFF2B0' : '#E8303A'); };
      shadow();
      switch (k) {
        case 'bus': {
          var bc = c === '#EDEDED' || c === '#2A2F3A' ? '#E24B4B' : c;
          box(x0, x1, z - 0.36, z + 0.36, 0.1, 0.94, bc, null, null, 0.24);
          quad(P(x0 + 0.12, zf - 0.03, 0.38), P(x1 - 0.12, zf - 0.03, 0.38), P(x1 - 0.12, zf - 0.03, 0.46), P(x0 + 0.12, zf - 0.03, 0.46), 'rgba(255,255,255,0.55)');
          for (var wx = x0 + 0.2; wx < x1 - 0.35; wx += 0.44) win(wx, wx + 0.32, 0.56, 0.82);
          wheels(0.13); lamp(0.3); break;
        }
        case 'truck': {
          var cabL = ahead ? x1 - 0.62 : x0, cabR = ahead ? x1 : x0 + 0.62, tl = ahead ? x0 : x0 + 0.66, tr2 = ahead ? x1 - 0.66 : x1;
          box(tl, tr2, z - 0.36, z + 0.36, 0.14, 0.96, '#DDE1E7', null, null, 0.14);
          box(cabL, cabR, z - 0.34, z + 0.34, 0.12, 0.74, c, null, null, 0.24);
          win(cabL + 0.12, cabR - 0.12, 0.46, 0.66);
          wheels(0.13); lamp(0.24); break;
        }
        case 'tractor': {
          var tc = m.v < 0.5 ? '#2E8A3A' : '#C8322A';
          box(x0 + 0.08, x1 - 0.08, z - 0.26, z + 0.26, 0.16, 0.5, tc, null, null, 0.18);
          box(x0 + (ahead ? 0.1 : 0.52), x0 + (ahead ? 0.62 : 1.04), z - 0.24, z + 0.24, 0.48, 0.88, '#BCD6E6', '#A2C2D6', '#88A8BC', 0.14);
          var bw = P(ahead ? x0 + 0.3 : x1 - 0.3, zf, 0.3); ell(bw[0], bw[1], V.S * 0.28, V.S * 0.28, '#23262E'); ell(bw[0], bw[1], V.S * 0.12, V.S * 0.12, '#E2BE5A');
          var fw = P(ahead ? x1 - 0.2 : x0 + 0.2, zf, 0.15); ell(fw[0], fw[1], V.S * 0.15, V.S * 0.15, '#23262E'); ell(fw[0], fw[1], V.S * 0.06, V.S * 0.06, '#E2BE5A');
          break;
        }
        case 'jeep': {
          var jc = m.v < 0.5 ? '#8A8A4A' : '#A89A6A';
          box(x0, x1, z - 0.33, z + 0.33, 0.12, 0.5, jc, null, null, 0.18);
          box(x0 + 0.24, x0 + 0.32, z - 0.3, z + 0.3, 0.48, 0.82, '#3A3F48', null, null, 0.04); box(x0 + 0.24, x1 - 0.24, z - 0.3, z - 0.22, 0.75, 0.82, '#3A3F48', null, null, 0.04);
          var sw = P(ahead ? x0 + 0.02 : x1 - 0.02, z, 0.36); ell(sw[0], sw[1], V.S * 0.09, V.S * 0.17, '#2A2D33');
          wheels(0.13); lamp(0.3); break;
        }
        case 'camper':
          box(x0, x1, z - 0.34, z + 0.34, 0.12, 0.84, '#F4F1E8', null, null, 0.26);
          box(x0 + 0.02, x1 - 0.02, z - 0.345, z + 0.3, 0.12, 0.44, c === '#2A2F3A' ? '#3E7FD8' : c, null, null, 0.14);
          win(x0 + 0.22, x0 + len * 0.45, 0.54, 0.74); win(x0 + len * 0.55, x1 - 0.22, 0.54, 0.74);
          wheels(); lamp(0.26); break;
        case 'icecream': {
          box(x0, x1, z - 0.34, z + 0.34, 0.12, 0.82, '#F7C6D2', null, null, 0.24);
          quad(P(x0 + 0.1, zf - 0.02, 0.18), P(x1 - 0.1, zf - 0.02, 0.18), P(x1 - 0.1, zf - 0.02, 0.3), P(x0 + 0.1, zf - 0.02, 0.3), '#8FD3F0');
          win(x0 + len * 0.3, x0 + len * 0.7, 0.46, 0.7, 'rgba(255,255,255,0.75)');
          var cm = x0 + len / 2, cb = P(cm, z, 0.82), ct = P(cm, z, 1.08);
          ctx.fillStyle = '#E8C48A'; ctx.beginPath(); ctx.moveTo(cb[0], cb[1]); ctx.lineTo(ct[0] - V.S * 0.12, ct[1]); ctx.lineTo(ct[0] + V.S * 0.12, ct[1]); ctx.closePath(); ctx.fill();
          ball(cm, z, 1.12, 0.14, '#FFF4E0');
          wheels(); lamp(0.26); break;
        }
        case 'van':
          box(x0, x1, z - 0.35, z + 0.35, 0.12, 0.8, c, null, null, 0.24);
          win(ahead ? x1 - 0.44 : x0 + 0.1, ahead ? x1 - 0.1 : x0 + 0.44, 0.46, 0.7);
          wheels(); lamp(0.26); break;
        case 'car':
          box(x0, x1, z - 0.32, z + 0.32, 0.1, 0.42, c, null, null, 0.2);
          box(x0 + len * 0.2, x1 - len * 0.2, z - 0.27, z + 0.27, 0.38, 0.7, shade(c, 0.12), null, null, 0.22);
          win(x0 + len * 0.27, x0 + len * 0.48, 0.45, 0.64); win(x0 + len * 0.52, x1 - len * 0.27, 0.45, 0.64);
          wheels(); lamp(0.26); break;
        // things blowing across the grass
        case 'bin': box(x0 + 0.05, x1 - 0.05, z - 0.2, z + 0.2, 0.05 + Math.abs(Math.sin(G.t * 9 + m.v * 9)) * 0.12, 0.55, '#2F6B3E', null, null, 0.16); break;
        case 'chair': box(x0, x1, z - 0.22, z + 0.22, 0.25, 0.33, '#F4F4F4', null, null, 0.06); box(x0, x0 + 0.09, z - 0.22, z + 0.22, 0.33, 0.64, '#E8E8E8', null, null, 0.06); break;
        case 'deckchair': box(x0, x1, z - 0.24, z + 0.24, 0.2, 0.31, '#E24B4B', '#FFFFFF', null, 0.08); break;
        case 'bag': { var bp = P(x0 + len / 2, z, 0.35 + 0.15 * Math.sin(G.t * 7 + m.v * 9)); ell(bp[0], bp[1], V.S * 0.2, V.S * 0.16, 'rgba(245,245,245,0.92)'); ell(bp[0] - V.S * 0.06, bp[1] - V.S * 0.05, V.S * 0.06, V.S * 0.04, 'rgba(255,255,255,0.9)'); break; }
        case 'ball': {
          var bb = P(x0 + len / 2, z, 0.28 + 0.2 * Math.abs(Math.sin(G.t * 6 + m.v * 9))), br = V.S * 0.25;
          ell(bb[0], bb[1], br, br, '#FFFFFF');
          ctx.fillStyle = '#E24B4B'; ctx.beginPath(); ctx.moveTo(bb[0], bb[1]); ctx.arc(bb[0], bb[1], br, G.t * 5, G.t * 5 + 1.2); ctx.fill();
          ctx.fillStyle = '#3E7FD8'; ctx.beginPath(); ctx.moveTo(bb[0], bb[1]); ctx.arc(bb[0], bb[1], br, G.t * 5 + 2.1, G.t * 5 + 3.3); ctx.fill();
          ctx.fillStyle = '#F2C230'; ctx.beginPath(); ctx.moveTo(bb[0], bb[1]); ctx.arc(bb[0], bb[1], br, G.t * 5 + 4.2, G.t * 5 + 5.4); ctx.fill();
          ell(bb[0] - br * 0.35, bb[1] - br * 0.4, br * 0.22, br * 0.16, 'rgba(255,255,255,0.7)');
          break;
        }
        case 'bale': cyl(x0, x1, z, 0, 0.27, '#E2BE5A', '#D9AE48'); break;
        case 'branch': cyl(x0, x1, z, 0.08, 0.07, '#7A5232', '#C49A60'); ball(x0 + 0.42, z - 0.16, 0.18, 0.15, theme.leaf); ball(x0 + 0.2, z - 0.12, 0.14, 0.1, shade(theme.leaf, -0.15)); break;
        case 'tumble': { var tb = P(x0 + len / 2, z, 0.3 + 0.1 * Math.abs(Math.sin(G.t * 5 + m.v * 9))); ctx.strokeStyle = '#9A7A4A'; ctx.lineWidth = Math.max(1, V.S * 0.03); for (var q = 0; q < 6; q++) { ctx.beginPath(); ctx.ellipse(tb[0], tb[1], V.S * 0.28, V.S * 0.2, G.t * 4 + q, 0, TAU); ctx.stroke(); } break; }
        default: box(x0, x1, z - 0.3, z + 0.3, 0.1, 0.5, c, null, null, 0.18);
      }
    }
    function train(L) {
      var t = L.train, z = L.r, sx = COLS - 0.42;
      // the signal at the right edge
      box(sx - 0.05, sx + 0.05, z - 0.47, z - 0.37, 0, 1.0, '#3A3F48', null, null, 0.04);
      box(sx - 0.21, sx + 0.21, z - 0.48, z - 0.4, 0.92, 1.18, '#2A2E36', null, null, 0.12);
      var on = t.st === 'warn' || t.st === 'pass', blink = on && Math.floor(G.t * 6) % 2 === 0;
      var l1 = P(sx - 0.1, z - 0.49, 1.05), l2 = P(sx + 0.1, z - 0.49, 1.05);
      ell(l1[0], l1[1], V.S * 0.07, V.S * 0.07, blink ? '#FF3B30' : '#5A2A2A'); ell(l2[0], l2[1], V.S * 0.07, V.S * 0.07, on && !blink ? '#FF3B30' : '#5A2A2A');
      if (on) { var lit = blink ? l1 : l2; ell(lit[0], lit[1], V.S * 0.16, V.S * 0.16, 'rgba(255,80,60,0.28)'); }
      if (t.st !== 'pass') return;
      var c = theme.train, x = t.x, seg = 3.2;
      for (var s = 0; s < t.len; s += seg) {
        var a = x + s + 0.08, b = Math.min(x + t.len, x + s + seg) - 0.08;
        if (b < XL - 1 || a > XR + 1) continue;
        var sh0 = P(a, z, 0), sh1 = P(b, z, 0); ell((sh0[0] + sh1[0]) / 2, sh0[1] + V.S * 0.05, (sh1[0] - sh0[0]) / 2, V.S * 0.22, 'rgba(16,20,30,0.2)');
        box(a, b, z - 0.4, z + 0.4, 0.16, 1.02, c, null, null, 0.26);
        quad(P(a + 0.14, z - 0.42, 0.36), P(b - 0.14, z - 0.42, 0.36), P(b - 0.14, z - 0.42, 0.44), P(a + 0.14, z - 0.42, 0.44), 'rgba(255,255,255,0.5)');
        for (var w = a + 0.3; w < b - 0.45; w += 0.62) squad(P(w, z - 0.42, 0.56), P(w + 0.36, z - 0.42, 0.56), P(w + 0.36, z - 0.42, 0.84), P(w, z - 0.42, 0.84), 'rgba(226,238,250,0.92)', V.S * 0.07);
        [a + 0.45, b - 0.45].forEach(function (wx) { var wp = P(wx, z - 0.4, 0.13); ell(wp[0], wp[1], V.S * 0.13, V.S * 0.13, '#23262E'); });
      }
    }
    function door(L) {
      var d = L.door, z = L.r, g = d.g, st = STAGES[d.next], wall = theme.wall, wc = wall[0], sp = xspan(z);
      var seg = function (x0, x1) {
        x0 = Math.max(x0, sp[0] - 1); x1 = Math.min(x1, sp[1] + 1);
        if (x1 <= x0) return;
        if (wall[1] === 'hedge') {
          box(x0, x1, z - 0.3, z + 0.3, 0, 0.62, wc, null, null, 0.24);
          ctx.fillStyle = shade(wc, 0.1); ctx.beginPath();
          for (var hx = Math.ceil(x0 * 2) / 2 + 0.25; hx < x1 - 0.1; hx += 0.5) { var hp = P(hx, z - 0.12, 0.62); ctx.moveTo(hp[0] + V.S * 0.2, hp[1]); ctx.ellipse(hp[0], hp[1], V.S * 0.2, V.S * 0.11, 0, 0, TAU); }
          ctx.fill();
        } else if (wall[1] === 'fence') {
          for (var x = Math.ceil(x0 * 3) / 3; x < x1; x += 1 / 3) box(x, x + 0.13, z - 0.05, z + 0.05, 0, 0.78, wc, null, null, 0.1);
          box(x0, x1, z - 0.06, z + 0.06, 0.42, 0.54, wc, null, null, 0.06);
        } else if (wall[1] === 'bamboo') {
          for (var y = Math.ceil(x0 * 4) / 4; y < x1; y += 0.25) box(y, y + 0.19, z - 0.08, z + 0.08, 0, 0.8 + hash(Math.round(y * 4), 3) * 0.2, wc, null, null, 0.14);
        } else {
          for (var b = Math.floor(x0); b < x1; b++) {
            var bx0 = Math.max(x0, b), bx1 = Math.min(x1, b + 1);
            if (bx1 - bx0 < 0.08) continue;
            box(bx0 + 0.02, bx1 - 0.02, z - 0.28, z + 0.28, 0, 0.7, hash(b, z) < 0.5 ? wc : shade(wc, 0.07), null, null, 0.14);
          }
        }
      };
      seg(-12, g - 0.5);
      var post = function (x) { box(x, x + 0.2, z - 0.2, z + 0.2, 0, 1.35, shade(st.door, -0.25), null, null, 0.1); };
      var o2 = d.open, w = 1 - 0.18;
      post(g - 0.7);
      box(g - 0.5, g - 0.5 + Math.max(0.06, w * (1 - o2)), z - 0.06, z + 0.06, 0, 1.15, st.door, null, null, 0.06);
      box(g + 1.5 - Math.max(0.06, w * (1 - o2)), g + 1.5, z - 0.06, z + 0.06, 0, 1.15, st.door, null, null, 0.06);
      post(g + 1.5);
      box(g - 0.7, g + 1.7, z - 0.2, z + 0.2, 1.33, 1.55, shade(st.door, -0.15), null, null, 0.14);
      seg(g + 1.7, 22);
      // the next stage's sign above the door
      var c = P(g + 0.5, z - 0.2, 1.75);
      icon(st.icon, c[0], c[1], V.S * 0.32);
    }
    function icon(k, x, y, s) {
      ctx.save(); ctx.translate(x, y);
      ell(0, s * 0.1, s * 1.2, s * 1.2, 'rgba(0,0,0,0.18)');
      ell(0, 0, s * 1.15, s * 1.15, 'rgba(255,255,255,0.95)');
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
        ctx.strokeStyle = '#5E6670'; ctx.lineWidth = Math.max(1.4, V.S * 0.045); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-w0, 0); ctx.lineTo(-w1, -h); ctx.moveTo(w0, 0); ctx.lineTo(w1, -h); ctx.stroke();
        ctx.lineWidth = Math.max(1, V.S * 0.025);
        for (var i = 0; i < 7; i++) { var y1 = -h * i / 7, y2 = -h * (i + 1) / 7, a1 = lerp(w0, w1, i / 7), a2 = lerp(w0, w1, (i + 1) / 7); ctx.beginPath(); ctx.moveTo(-a1, y1); ctx.lineTo(a2, y2); ctx.moveTo(a1, y1); ctx.lineTo(-a2, y2); ctx.stroke(); }
        ctx.lineWidth = Math.max(1.4, V.S * 0.045);
        [0.72, 0.88].forEach(function (k2) { ctx.beginPath(); ctx.moveTo(-V.S * 0.42, -h * k2); ctx.lineTo(V.S * 0.42, -h * k2); ctx.stroke(); });
        [-0.42, 0.42].forEach(function (sx) { [0.72, 0.88].forEach(function (k2) { ell(sx * V.S, -h * k2 + V.S * 0.07, V.S * 0.045, V.S * 0.08, '#C8D4DE'); }); });
      } else {
        var th = len * 0.9, tw = V.S * 0.17;
        ctx.fillStyle = '#7A5232'; rrect(-tw / 2, -th, tw, th, tw * 0.45); ctx.fill();
        if (f.k === 'acacia') { ell(0, -th - V.S * 0.04, V.S * 0.92, V.S * 0.2, '#62802C'); ell(-V.S * 0.05, -th - V.S * 0.1, V.S * 0.82, V.S * 0.15, '#86A23E'); }
        else {
          var cr = V.S * 0.44;
          ell(-cr * 0.55, -th + cr * 0.15, cr * 0.8, cr * 0.8, shade(theme.leaf, -0.16)); ell(cr * 0.58, -th + cr * 0.2, cr * 0.74, cr * 0.74, theme.leaf);
          ell(0, -th - cr * 0.45, cr, cr, shade(theme.leaf, 0.08)); ell(-cr * 0.3, -th - cr * 0.75, cr * 0.36, cr * 0.28, 'rgba(255,255,255,0.18)');
        }
      }
      ctx.restore();
    }
    function drawPlayer() {
      var x = curX(), z = curZ(), t = p.hop ? p.t : 1;
      var y = p.hop ? Math.sin(Math.PI * t) * (p.slide ? 0.06 : 0.36) : p.bump ? Math.sin(p.bump * Math.PI) * 0.12 : 0;
      // standing on a log, you're up on top of it
      var Lc = laneAt(Math.round(z));
      if (p.alive && Lc.t === 'water' && !Lc.pads) y += 0.24;
      var sinking = 0;
      if (!p.alive && (p.cause === 'water' || p.cause === 'swept')) sinking = Math.min(1, p.deadT * 2.2);
      if (!p.alive && p.cause === 'caught') return;
      var g = P(x, z, 0);
      if (!sinking) ell(g[0], g[1] + V.S * 0.04, V.S * 0.3 * (1 - y * 0.6), V.S * 0.11 * (1 - y * 0.6), 'rgba(20,24,40,0.24)');
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
      var r = L.r, list = [], sp = xspan(r);
      L.props.forEach(function (q) { if (q.x >= sp[0] - 1 && q.x <= sp[1] + 1) list.push({ x: q.x, f: function () { prop(q.k, q.x, r, q.v); } }); });
      if (L.lamp !== undefined) list.push({ x: L.lamp, f: function () { prop('lamp', L.lamp, r, 0); } });
      if (L.t !== 'water') L.movers.forEach(function (m) { if (m.x < XR && m.x + m.len > XL) list.push({ x: m.x + m.len / 2, f: function () { mover(m, r, L.dir); } }); });
      if (L.door) list.push({ x: -20, f: function () { door(L); } });
      if (L.fall) list.push({ x: L.fall.side < 0 ? -1 : COLS, f: function () { faller(L); } });
      if (L.train) list.push({ x: 30, f: function () { train(L); } });
      if (pz === r) list.push({ x: curX(), f: drawPlayer });
      list.sort(function (a, b) { return a.x - b.x; });
      list.forEach(function (it) { it.f(); });
    }

    /* ---------- little effects: dust from a hop, splashes, sparks, a crash, leaves in the wind ---------- */
    function spawnFx(k, x, z, y, n, o) {
      o = o || {};
      for (var i = 0; i < n; i++) {
        var a = Math.random() * TAU, sp = (o.spd || 1) * (0.5 + Math.random() * 0.7);
        G.fx.push({ k: k, x: x + (o.dx || 0) * (Math.random() - 0.5), z: z, y: y, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp * 0.6, vy: (o.up || 0) * (0.6 + Math.random() * 0.8), g: o.g || 0, t: 0, life: (o.life || 0.45) * (0.7 + Math.random() * 0.6), s: (o.s || 0.08) * (0.7 + Math.random() * 0.6), col: o.col || '255,255,255', rot: Math.random() * TAU });
      }
      if (G.fx.length > 140) G.fx.splice(0, G.fx.length - 140);
    }
    function dustCol(L) { return L.ice && L.ice[Math.round(p.x)] ? '235,246,255' : L.t === 'road' ? '196,200,208' : theme.name === 'Seaside' ? '244,232,204' : G.look && G.look.frost > 0.5 ? '240,246,255' : '236,244,224'; }
    function drawFx(bright) {
      G.fx.forEach(function (f) {
        if ((f.k === 'spark' || f.k === 'glow') !== bright) return;
        var c = P(f.x, f.z, f.y), u = f.t / f.life, a = Math.max(0, 1 - u);
        if (f.k === 'dust') ell(c[0], c[1], V.S * f.s * (1 + u * 1.2), V.S * f.s * (1 + u * 1.2) * 0.75, 'rgba(' + f.col + ',' + (0.6 * a).toFixed(3) + ')');
        else if (f.k === 'drop') ell(c[0], c[1], V.S * f.s * 0.8, V.S * f.s, 'rgba(' + f.col + ',' + (0.9 * a).toFixed(3) + ')');
        else if (f.k === 'star') star4(c[0], c[1], V.S * f.s * (1 - u * 0.3), 'rgba(255,214,80,' + a.toFixed(3) + ')');
        else if (f.k === 'leaf') {
          ctx.save(); ctx.translate(c[0], c[1] + Math.sin(G.t * 5 + f.rot) * V.S * 0.08); ctx.rotate(f.rot + G.t * 4 * (f.vx > 0 ? 1 : -1));
          ctx.fillStyle = 'rgba(' + f.col + ',' + Math.min(1, a * 3).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(0, 0, V.S * f.s, V.S * f.s * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore();
        } else if (f.k === 'spark') {
          ctx.strokeStyle = 'rgba(255,240,170,' + a.toFixed(3) + ')'; ctx.lineWidth = Math.max(1.2, V.S * 0.035); ctx.lineCap = 'round';
          var c2 = P(f.x - f.vx * 0.04, f.z - f.vz * 0.04, f.y - f.vy * 0.04); ctx.beginPath(); ctx.moveTo(c2[0], c2[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
        } else if (f.k === 'glow') star4(c[0], c[1], V.S * f.s * (0.6 + 0.4 * Math.sin(u * Math.PI)), 'rgba(' + f.col + ',' + Math.sin(u * Math.PI).toFixed(3) + ')');
      });
    }

    /* ---------- the weather over everything ---------- */
    /* the sky along the top, one for each stage of the day, over the world's own skyline */
    var SKIES = {
      mist: { top: [140, 156, 178], hor: [222, 228, 236], sun: 0.4, cloud: [212, 218, 228], cloudA: 0.9, stars: 0, moon: 0, speed: 0.5 },
      sun: { top: [66, 150, 222], hor: [190, 226, 248], sun: 1, cloud: [255, 255, 255], cloudA: 0.95, stars: 0, moon: 0, speed: 0.6 },
      wind: { top: [88, 144, 198], hor: [204, 226, 240], sun: 0.6, cloud: [240, 245, 250], cloudA: 0.9, stars: 0, moon: 0, speed: 2.6 },
      storm: { top: [38, 44, 64], hor: [92, 102, 126], sun: 0, cloud: [62, 70, 92], cloudA: 1, stars: 0, moon: 0, speed: 1.4 },
      night: { top: [8, 13, 38], hor: [34, 46, 92], sun: 0, cloud: [48, 58, 96], cloudA: 0.45, stars: 1, moon: 1, speed: 0.4 }
    };
    function easeSky(dt) {
      var tgt = SKIES[STAGES[G.stage].id], sk = G.sky;
      if (!sk) { G.sky = JSON.parse(JSON.stringify(tgt)); return; }
      var k = Math.min(1, dt * 0.9);
      ['top', 'hor', 'cloud'].forEach(function (key) { for (var i = 0; i < 3; i++) sk[key][i] += (tgt[key][i] - sk[key][i]) * k; });
      ['sun', 'cloudA', 'stars', 'moon', 'speed'].forEach(function (key) { sk[key] += (tgt[key] - sk[key]) * k; });
      G.cloudX += dt * sk.speed * (G.gust ? 2.2 : 1);
    }
    function cloud(cx, cy, w, col) {
      ctx.fillStyle = col; ctx.beginPath();
      dot(cx + w * 0.22, cy, w * 0.2); dot(cx + w * 0.45, cy - w * 0.1, w * 0.25); dot(cx + w * 0.7, cy - w * 0.02, w * 0.18); dot(cx + w * 0.86, cy + w * 0.06, w * 0.12);
      rpath(cx + w * 0.06, cy, w * 0.88, w * 0.17, w * 0.085);
      ctx.fill();
    }
    function hills(W, h, sk) {
      var kind = theme.sky || 'hills', base = hexRGB(theme.out), dark = G.look ? G.look.dark : 0;
      var fog = G.look ? G.look.fog : 0;
      var tone = function (f) { var c = mixc(base, sk.hor, Math.min(0.92, f + fog * 0.45)); return dark > 0.02 ? mixc(c, [12, 16, 36], Math.min(0.85, dark)) : c; };
      var far = tone(0.62), near = tone(0.38);
      var ridge = function (col, y0, amp, f1, ph) {
        ctx.fillStyle = rgb(col); ctx.beginPath(); ctx.moveTo(0, h + 2);
        for (var x = 0; x <= W + 8; x += 8) ctx.lineTo(x, y0 - amp * (0.55 + 0.3 * Math.sin(x * f1 + ph) + 0.15 * Math.sin(x * f1 * 2.7 + ph * 1.9)));
        ctx.lineTo(W, h + 2); ctx.closePath(); ctx.fill();
      };
      var i, x, y;
      if (kind === 'sea') {
        ridge(far, h * 0.82, h * 0.2, 0.012, 1.2);
        var sea = mixc(hexRGB(theme.water[0]), sk.hor, 0.35);
        if (dark > 0.02) sea = mixc(sea, [12, 16, 36], Math.min(0.85, dark));
        ctx.fillStyle = rgb(sea); ctx.fillRect(0, h * 0.8, W, h * 0.2 + 2);
        ctx.fillStyle = rgb(sk.hor, 0.5); ctx.fillRect(0, h * 0.8, W, 1.5);
        // a little lighthouse on the far shore
        x = W * 0.16; y = h * 0.8;
        ctx.fillStyle = rgb(dark > 0.4 ? [40, 40, 56] : [246, 244, 238]); ctx.fillRect(x - 3, y - h * 0.28, 6, h * 0.28);
        ctx.fillStyle = rgb(dark > 0.4 ? [255, 226, 140] : [226, 75, 75]); ctx.fillRect(x - 4, y - h * 0.33, 8, h * 0.06);
        return;
      }
      if (kind === 'savanna') {
        ctx.fillStyle = rgb(far); ctx.beginPath(); ctx.moveTo(W * 0.48, h + 2); ctx.quadraticCurveTo(W * 0.7, h * 0.18, W * 0.95, h + 2); ctx.fill();
        ridge(near, h * 0.92, h * 0.07, 0.01, 0.4);
        ctx.fillStyle = rgb(near); ctx.strokeStyle = rgb(near); ctx.lineWidth = 2; ctx.lineCap = 'round';
        [[0.12, 0.9], [0.34, 0.7], [0.82, 0.85]].forEach(function (a) {
          var tx = W * a[0], ty = h * 0.9, s = h * 0.22 * a[1];
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + s * 0.1, ty - s); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(tx + s * 0.1, ty - s, s * 0.8, s * 0.2, 0, 0, TAU); ctx.fill();
        });
        return;
      }
      ridge(far, h * 0.78, h * 0.24, 0.011, 2.1);
      if (kind === 'town') {
        // rooftops and a church spire beyond the park
        ctx.fillStyle = rgb(near); ctx.beginPath();
        for (i = 0, x = -10; x < W + 20; i++) {
          var bw = 22 + hash(i, 9) * 26, bh = h * (0.16 + hash(i, 10) * 0.16), by = h * 0.98;
          ctx.moveTo(x, by); ctx.lineTo(x, by - bh); ctx.lineTo(x + bw / 2, by - bh - bw * 0.35); ctx.lineTo(x + bw, by - bh); ctx.lineTo(x + bw, by); ctx.closePath();
          if (i === 4) { ctx.moveTo(x + bw + 4, by); ctx.lineTo(x + bw + 4, by - h * 0.36); ctx.lineTo(x + bw + 10, by - h * 0.62); ctx.lineTo(x + bw + 16, by - h * 0.36); ctx.lineTo(x + bw + 16, by); ctx.closePath(); x += 18; }
          x += bw + 2;
        }
        ctx.fill();
        return;
      }
      ridge(near, h * 0.92, h * 0.14, 0.017, 0.7);
      // round trees along the near hills
      ctx.fillStyle = rgb(mixc(near, [0, 0, 0], 0.08)); ctx.beginPath();
      for (i = 0; i < 9; i++) { x = hash(i, 21) * W; y = h * (0.86 - 0.08 * hash(i, 22)); var tr = h * (0.05 + 0.04 * hash(i, 23)); dot(x, y - tr, tr); ctx.moveTo(x + 1, y); ctx.rect(x - 1, y - tr, 2, tr + 4); }
      ctx.fill();
    }
    /* the sky's still parts are painted into two layers a few times a second (every frame while lightning flashes):
       behind, the sky with its sun or moon and stars; in front, the skyline and the haze. Clouds drift between them */
    var skyC = { back: document.createElement('canvas'), front: document.createElement('canvas'), n: 0, w: 0, h: 0 };
    function paintLayer(cv, w, h, fn) {
      var d = V.dpr, pw = Math.max(1, Math.ceil(w * d)), ph = Math.max(1, Math.ceil(h * d)), c2 = cv.getContext('2d'), keep = ctx;
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
      c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, pw, ph); c2.setTransform(d, 0, 0, d, 0, 0);
      ctx = c2;
      try { fn(); } finally { ctx = keep; }
    }
    function drawSky(W) {
      var sk = G.sky;
      if (!sk) return;
      var h = V.sky, hh = Math.ceil(h * 1.6) + 2, fl = G.flash || 0, white = [255, 255, 255];
      var top = fl ? mixc(sk.top, white, fl * 0.45) : sk.top, hor = fl ? mixc(sk.hor, white, fl * 0.45) : sk.hor;
      if (skyC.n-- <= 0 || fl || skyC.w !== W || skyC.h !== h || skyC.d !== V.dpr) {
        skyC.n = 5; skyC.w = W; skyC.h = h; skyC.d = V.dpr;
        paintLayer(skyC.back, W, h, function () { skyBack(W, h, sk, top, hor); });
        paintLayer(skyC.front, W, hh, function () {
          hills(W, h, sk);
          var hz = ctx.createLinearGradient(0, h - 1, 0, h + h * 0.6);
          hz.addColorStop(0, rgb(hor, 0.8)); hz.addColorStop(1, rgb(hor, 0));
          ctx.fillStyle = hz; ctx.fillRect(0, h - 1, W, h * 0.6 + 1);
        });
      }
      ctx.drawImage(skyC.back, 0, 0, W, h);
      if (sk.cloudA > 0.02 && !V.lite) {
        var cc = fl ? mixc(sk.cloud, white, fl * 0.6) : sk.cloud;
        for (var i = 0; i < 5; i++) {
          var cw = h * (0.85 + hash(i, 6) * 0.9), span = W + cw * 2;
          var cx = (((hash(i, 7) * span + G.cloudX * (10 + i * 4)) % span) + span) % span - cw;
          cloud(cx, h * (0.22 + hash(i, 8) * 0.38), cw, rgb(mixc(cc, [0, 0, 0], i % 2 ? 0.05 : 0), sk.cloudA));
        }
      }
      ctx.drawImage(skyC.front, 0, 0, W, hh);
    }
    function skyBack(W, h, sk, top, hor) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(hor));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, h);
      var i;
      if (sk.stars > 0.02) {
        for (i = 0; i < 36; i++) {
          var tw = 0.55 + 0.45 * Math.sin(G.t * (1.2 + hash(i, 3) * 2) + i);
          ctx.fillStyle = 'rgba(255,255,255,' + (sk.stars * tw * (0.45 + hash(i, 4) * 0.55)).toFixed(3) + ')';
          var ss = 1 + hash(i, 5) * 1.2; ctx.fillRect(hash(i, 1) * W, hash(i, 2) * h * 0.78, ss, ss);
        }
      }
      var bx = W * 0.8, by = h * 0.42, br = h * 0.17;
      if (sk.moon > 0.02) {
        ell(bx, by, br, br, 'rgba(250,246,226,' + sk.moon.toFixed(3) + ')');
        ell(bx + br * 0.42, by - br * 0.2, br * 0.84, br * 0.84, rgb(mixc(top, hor, by / h)));
        var mg = ctx.createRadialGradient(bx, by, br * 0.4, bx, by, br * 3); mg.addColorStop(0, 'rgba(220,226,255,' + (0.28 * sk.moon).toFixed(3) + ')'); mg.addColorStop(1, 'rgba(220,226,255,0)');
        ctx.fillStyle = mg; ctx.fillRect(bx - br * 3, 0, br * 6, h);
      }
      if (sk.sun > 0.02) {
        var sg = ctx.createRadialGradient(bx, by, br * 0.5, bx, by, br * 3.2); sg.addColorStop(0, 'rgba(255,240,190,' + (0.6 * sk.sun).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = sg; ctx.fillRect(bx - br * 3.2, 0, br * 6.4, h);
        ell(bx, by, br * 1.05, br * 1.05, 'rgba(255,226,150,' + sk.sun.toFixed(3) + ')');
        ell(bx, by, br * 0.82, br * 0.82, 'rgba(255,248,214,' + sk.sun.toFixed(3) + ')');
      }
    }
    /* the light over the world: a colour wash, fog, and the dark with light round you, headlights and lamps */
    function drawLight(W, H) {
      var lk = G.look;
      if (!lk) return;
      if (lk.tint[3] > 0.01) { ctx.fillStyle = 'rgba(' + Math.round(lk.tint[0]) + ',' + Math.round(lk.tint[1]) + ',' + Math.round(lk.tint[2]) + ',' + lk.tint[3].toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
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
      if (lk.dark > 0.02) {
        // the dark is soft all over, so it's drawn at half size and stretched to fit, which saves a lot of work
        var dw = Math.ceil(W / 2), dh = Math.ceil(H / 2);
        if (dk.width !== dw || dk.height !== dh) { dk.width = dw; dk.height = dh; }
        dctx.setTransform(0.5, 0, 0, 0.5, 0, 0); dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, W, H);
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
        ctx.drawImage(dk, 0, 0, dw * 2, dh * 2);
      }
    }
    /* what's in the air, over the sky too: rain, snow, wind and its arrows, lightning, and the weather catching up */
    function drawAir(W, H) {
      var lk = G.look;
      if (!lk) return;
      if (lk.rain > 0.02) {
        if (!G.rain.length) for (var j = 0; j < 140; j++) G.rain.push([Math.random(), Math.random(), 0.7 + Math.random() * 0.6]);
        ctx.strokeStyle = 'rgba(200,214,236,' + (0.45 * lk.rain) + ')'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath();
        G.rain.forEach(function (d) { var x = ((d[0] + G.t * 0.08 * d[2]) % 1) * (W + 60) - 30, y = ((d[1] + G.t * 1.6 * d[2]) % 1) * (H + 40) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16); });
        ctx.stroke();
      }
      if (lk.frost > 0.05 && !V.lite) {
        if (!G.snow.length) for (var n = 0; n < 70; n++) G.snow.push([Math.random(), Math.random(), 0.6 + Math.random() * 0.8, Math.random() * TAU]);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * lk.frost).toFixed(3) + ')'; ctx.beginPath();
        G.snow.forEach(function (d) { var x = ((((d[0] + 0.03 * Math.sin(G.t * 0.7 + d[3]) + G.t * 0.006 * d[2]) % 1) + 1) % 1) * W, y = ((d[1] + G.t * 0.06 * d[2]) % 1) * H; dot(x, y, 0.8 + d[2] * 1.1); });
        ctx.fill();
      }
      var gust = G.gust, wind = lk.wind + (gust ? 1.2 : 0);
      if (wind > 0.05) {
        if (!G.streaks.length) for (var k = 0; k < 26; k++) G.streaks.push([Math.random(), Math.random(), 0.6 + Math.random()]);
        var gd = gust ? gust.dir : 1, cnt = Math.round(Math.min(26, 6 + wind * 10));
        ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(0.75, 0.25 + wind * 0.25) + ')'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        for (var s = 0; s < cnt; s++) {
          var st = G.streaks[s], sx = (((st[0] + G.t * 0.5 * st[2] * gd) % 1 + 1) % 1) * (W + 120) - 60, sy = st[1] * H * 0.9 + 20;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx - gd * 22, sy - 5, sx - gd * 44, sy); ctx.stroke();
        }
        if (gust && gust.st === 'warn') {
          var ax = W / 2, ay = Math.max(V.sky + 40, H * 0.22), al = 0.5 + 0.5 * Math.sin(G.t * 14);
          ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.35 * al) + ')';
          for (var a = -1; a <= 1; a++) { var cx = ax + a * 46 * gd; ctx.beginPath(); ctx.moveTo(cx + gd * 16, ay); ctx.lineTo(cx - gd * 8, ay - 14); ctx.lineTo(cx - gd * 8, ay + 14); ctx.closePath(); ctx.fill(); }
        }
      }
      drawFx(true);
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
      // rows hidden behind the sky aren't drawn
      var rTop = Math.ceil(V.cam + (V.cy - V.sky + 2.6 * V.S) / (V.S * SZ)) + 1, rBot = Math.floor(V.cam - (H - V.cy) / (V.S * SZ)) - 1, r;
      for (r = rTop; r >= rBot; r--) drawGround(laneAt(r));
      for (r = rTop; r >= rBot; r--) drawDecals(laneAt(r));
      var pz = Math.round(curZ());
      for (r = rTop; r >= rBot; r--) drawObjects(laneAt(r), pz);
      drawFx(false);
      drawLight(W, H);
      drawSky(W, H);
      drawAir(W, H);
    }

    /* ---------- running ---------- */
    function frame(ts) {
      G.raf = requestAnimationFrame(frame);
      var now = ts / 1000, dt = G.last ? Math.min(0.05, now - G.last) : 0.016;
      // a phone that can't keep up gets a lighter picture: fewer little details, and fewer pixels
      if (G.last && !G.paused && !V.lite && !o.full) {
        if (++G.pf > 60) { G.pt += now - G.last; if (G.pf === 180) { if (G.pt / 120 > 0.024) { V.lite = true; resize(); } G.pf = 0; G.pt = 0; } }
      }
      G.last = now;
      if (!G.paused) update(dt);
      draw();
    }
    function resize() {
      var w = canvas.clientWidth || 360, h = canvas.clientHeight || 640, dpr = Math.min(V.lite ? 1.5 : 2, root.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      V.W = w; V.H = h; V.dpr = dpr;
      V.S = Math.min(w / 10.2, h / 13.5);
      V.cx = w / 2 - V.S * 0.3; V.cy = h * 0.7;
      V.sky = Math.round(clamp(h * 0.12, 64, 120));
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
      info: function () { return { lite: !!V.lite, x: p.x, r: p.r, hop: p.hop, alive: p.alive, cause: p.cause, score: p.maxR - START_ROW, day: G.day, stage: G.stage, cam: V.cam, started: G.started, log: !!p.log }; },
      hz: function () { return { bolts: G.bolts.filter(function (b) { return !b.hit; }).map(function (b) { return [b.x, b.r, b.t]; }), gust: G.gust ? G.gust.dir : 0, creep: prm(G.day, G.stage, 0).creep, now: G.t, x: curX(), z: curZ() }; },
      // tests: what's in a row, and a quick way to a stage
      lane: function (r) { var L = laneAt(r); return { t: L.t, stage: L.stage, day: L.day, blocks: Object.keys(L.blocks).map(Number), movers: L.movers.map(function (m) { return [m.x, m.len, m.k]; }), dir: L.dir, speed: L.speed, pads: L.pads ? Object.keys(L.pads).map(Number) : null, door: L.door ? L.door.g : null, ice: Object.keys(L.ice).map(Number), fall: L.fall ? L.fall.st : null, train: L.train ? L.train.st : null }; },
      skip: function (r) { if (!o.test) return; p.r = p.tr = p.fr = r; p.x = p.tx = p.fx = clamp(Math.round(p.x), 0, COLS - 1); var L = laneAt(r); if (L.blocks[p.x] || !solid(L)) { for (var c = 0; c < COLS; c++) if (!L.blocks[c] && solid(L)) { p.x = p.tx = p.fx = c; break; } } p.maxR = Math.max(p.maxR, r); V.cam = r; G.stage = L.stage; G.day = L.day; G.look = null; G.started = true; }
    };
  }

  function themeFor(id) { var t = WC.animals && WC.animals.type(id); return t && THEMES[t.row] ? t.row : 'garden'; }
  WC.hop = { create: create, STAGES: STAGES, THEMES: THEMES, themeFor: themeFor, NAMES: NAMES, START_ROW: START_ROW };
})(typeof window !== 'undefined' ? window : globalThis);
