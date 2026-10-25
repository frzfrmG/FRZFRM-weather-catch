/* FRZFRM Weather Catch: the kit every jar's own variant pictures are drawn with (the pictures are in the jars-*.js files).
   People, animals, birds, buildings, vehicles, trees and sky things. Each one stands on a point, its feet or wheels at
   (x, y), and is sized by u, a unit taken from the jar's width so it reads at shelf size.
   The jar's body runs from about 15% to 85% across and 30% to 96% down; the ground is at about 88% down. */
(function (root) {
  'use strict';
  var WC = root.WC = root.WC || {};
  var D = WC.decos = WC.decos || {};
  var TAU = Math.PI * 2;
  var K = WC.kit = { TAU: TAU };
  var E = null;

  /* registers a picture. body(ctx, W, H, t, E) draws it. E is what the scene hands over: this catch's jitter (E.J),
     its random numbers (E.sr), the scene (E.s), its ground kind (E.kind) and where the ground is (E.standY) */
  K.add = function (name, at, body, opts) {
    var fn = function (ctx, W, H, t, env) { E = env; body(ctx, W, H, t, env); };
    fn.at = at;
    if (opts) Object.keys(opts).forEach(function (k) { fn[k] = opts[k]; });
    D[name] = fn;
  };
  /* what the scene handed over for the picture being drawn */
  K.env = function () { return E; };
  /* this catch's jitter: dx and dy nudge a picture about, rot turns it a little. All 0 for a preview */
  K.J = function () { return E && E.J ? E.J : { dx: 0, dy: 0, rot: 0, f: 0 }; };
  /* a point on the ground, f of the way across, nudged by this catch's jitter */
  K.at = function (W, H, f, jit) {
    var ff = f + K.J().dx * (jit === undefined ? 0.4 : jit);
    return { x: ff * W, y: (E && E.standY ? E.standY(ff) : 0.88) * H, f: ff };
  };
  /* random numbers that differ for every catch */
  K.rand = function (seed) {
    if (E && E.sr) return E.sr(seed);
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  };
  K.night = function () { return !!(E && E.s && E.s.night); };
  K.photo = function () { return !!(E && E.kind === 'photo'); };

  /* ---------- shapes ---------- */
  function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function tri(ctx, x1, y1, x2, y2, x3, y3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function rr(ctx, x, y, w, h, r) {
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function pen(ctx, col, w) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, w); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
  function seg(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function path(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.stroke(); }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function glow(ctx, x, y, r, c, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.01, r));
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    circ(ctx, x, y, r);
    ctx.fill();
  }
  function shadow(ctx, x, y, rx, ry, a) { ctx.fillStyle = 'rgba(20,24,40,' + (a === undefined ? 0.22 : a) + ')'; ell(ctx, x, y, rx, ry); ctx.fill(); }
  function star4(ctx, x, y, s, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }
  /* a twinkling glint */
  function twinkle(ctx, x, y, s, t, ph, col) {
    var k = 0.55 + 0.45 * Math.sin(t * 3 + (ph || 0));
    star4(ctx, x, y, s * k, col || 'rgba(255,255,255,0.95)');
  }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function mix(c1, c2, f) { return [Math.round(lerp(c1[0], c2[0], f)), Math.round(lerp(c1[1], c2[1], f)), Math.round(lerp(c1[2], c2[2], f))]; }
  /* the direction and amount turned by angle a from straight down: hands, legs and tails all use it */
  function swing(x, y, len, a, dir) { return [x + Math.sin(a) * len * dir, y + Math.cos(a) * len]; }
  K.circ = circ; K.ell = ell; K.tri = tri; K.poly = poly; K.rr = rr; K.pen = pen; K.seg = seg; K.path = path;
  K.rgba = rgba; K.glow = glow; K.shadow = shadow; K.star4 = star4; K.twinkle = twinkle; K.lerp = lerp; K.mix = mix; K.swing = swing;

  /* a soft cloud of overlapping circles, s across about 1.7s */
  K.cloud = function (ctx, x, y, s, col) {
    ctx.fillStyle = col || 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    [[0, 0, 0.55], [0.55, -0.28, 0.66], [1.15, 0, 0.5], [0.5, 0.18, 0.56]].forEach(function (c) {
      ctx.moveTo(x + c[0] * s + c[2] * s, y + c[1] * s);
      ctx.arc(x + c[0] * s, y + c[1] * s, c[2] * s, 0, TAU);
    });
    ctx.fill();
  };
  /* a teardrop of water, pointing up */
  K.drop = function (ctx, x, y, s, col) {
    ctx.fillStyle = col || 'rgba(170,210,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.6);
    ctx.quadraticCurveTo(x + s, y - s * 0.2, x, y + s * 0.6);
    ctx.quadraticCurveTo(x - s, y - s * 0.2, x, y - s * 1.6);
    ctx.fill();
  };
  /* a splash: drops flying out of a point on the ground */
  K.splash = function (ctx, x, y, s, t, col) {
    var p = (t * 1.4) % 1;
    pen(ctx, col || 'rgba(220,235,255,0.9)', s * 0.18);
    for (var i = -2; i <= 2; i++) {
      var a = i * 0.42, r = s * (0.5 + p * 0.9);
      seg(ctx, x + Math.sin(a) * s * 0.3, y - Math.cos(a) * s * 0.2, x + Math.sin(a) * r, y - Math.cos(a) * r * 0.9);
    }
    ctx.fillStyle = col || 'rgba(220,235,255,0.9)';
    for (var j = -1; j <= 1; j += 2) { circ(ctx, x + j * s * (0.7 + p * 0.5), y - s * (1 - p * 0.6), s * 0.12); ctx.fill(); }
  };
  /* a puddle, rx wide */
  K.puddle = function (ctx, x, y, rx, ry, t, col) {
    ctx.fillStyle = col || 'rgba(120,160,210,0.55)';
    ell(ctx, x, y, rx, ry); ctx.fill();
    ctx.fillStyle = 'rgba(210,230,250,0.35)';
    ell(ctx, x - rx * 0.2, y - ry * 0.25, rx * 0.55, ry * 0.4); ctx.fill();
    if (t === undefined || t === null) return;
    var p = (t * 0.6) % 1;
    ctx.strokeStyle = 'rgba(235,244,255,' + (0.7 * (1 - p)) + ')';
    ctx.lineWidth = Math.max(1, ry * 0.12);
    ell(ctx, x + rx * 0.25, y, rx * (0.1 + p * 0.45), ry * (0.1 + p * 0.45)); ctx.stroke();
  };
  /* water from y down to the bottom of the jar, with little shines */
  K.water = function (ctx, W, H, y, col, t, shine) {
    var c = col || [70, 120, 170];
    var g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, rgba(c, 0.92));
    g.addColorStop(1, rgba(mix(c, [10, 20, 40], 0.35), 0.95));
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, H - y);
    pen(ctx, shine || 'rgba(255,255,255,0.35)', W / 220);
    for (var i = 0; i < 6; i++) {
      var yy = y + (H - y) * (0.15 + i * 0.15), xx = W * (0.2 + ((i * 0.37 + (t || 0) * 0.02) % 0.6));
      seg(ctx, xx, yy, xx + W * (0.06 + (i % 3) * 0.03), yy);
    }
  };
  /* a zig-zag line of lightning from (x0, y0) to (x1, y1) */
  K.zig = function (ctx, x0, y0, x1, y1, rnd, amp, steps) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (var i = 1; i < steps; i++) {
      var f = i / steps;
      ctx.lineTo(lerp(x0, x1, f) + (rnd() - 0.5) * amp, lerp(y0, y1, f) + (rnd() - 0.5) * amp * 0.3);
    }
    ctx.lineTo(x1, y1);
  };
  K.bolt = function (ctx, x0, y0, x1, y1, seed, amp, w, col) {
    var rnd = K.rand(seed);
    ctx.save();
    ctx.shadowColor = 'rgba(190,210,255,0.9)';
    ctx.shadowBlur = w * 4;
    pen(ctx, col || 'rgba(255,255,255,0.97)', w);
    K.zig(ctx, x0, y0, x1, y1, rnd, amp, 9);
    ctx.stroke();
    ctx.restore();
  };
  /* a music note */
  K.note = function (ctx, x, y, s, col) {
    ctx.fillStyle = col;
    ell(ctx, x, y, s * 0.42, s * 0.3, -0.4); ctx.fill();
    pen(ctx, col, s * 0.14);
    seg(ctx, x + s * 0.36, y - s * 0.1, x + s * 0.36, y - s * 1.3);
    ctx.beginPath(); ctx.moveTo(x + s * 0.36, y - s * 1.3); ctx.quadraticCurveTo(x + s * 0.9, y - s * 1.05, x + s * 0.75, y - s * 0.6); ctx.stroke();
  };
  /* a heart */
  K.heart = function (ctx, x, y, s, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.2, x, y - s * 0.4);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
    ctx.fill();
  };

  /* ---------- people ----------
     A person with feet at (x, y), about 15u tall. o: coat, legs (trousers), skin, hair, boots, hat ('beanie', 'bobble',
     'cap', 'hood', 'sun', 'none'), hatCol, scarf (a colour), scarfFly (blown back by the wind), dir (1 faces right, -1 left),
     lean (radians, forward), arms ([back arm, front arm], angles from hanging down, forwards positive), pose ('stand',
     'walk', 'run', 'apart', 'sit', 'kneel', 'jump', 'slip'), step (0 to 1, how far through a walk), skirt, kid (smaller),
     hairLong, eyes (false to leave off). Returns the hands, head and hips, for props. */
  K.person = function (ctx, x, y, u, o) {
    o = o || {};
    var dir = o.dir === -1 ? -1 : 1;
    if (o.kid) u *= 0.78;
    var coat = o.coat || '#3D6FD8', trou = o.legs || '#2C3550', skin = o.skin || '#EFC39C', hair = o.hair || '#5A3A22';
    var boots = o.boots || '#2A2E3A', pose = o.pose || 'stand';
    var legLen = 6 * u, hipY = y - legLen, hipX = x;
    var feet, knees = null;
    var st = Math.sin((o.step || 0) * TAU);
    if (pose === 'walk') feet = [[x - dir * 1.9 * u * st, y], [x + dir * 1.9 * u * st, y]];
    else if (pose === 'run') {
      hipY = y - 5.6 * u;
      knees = [[x - dir * 1.2 * u, y - 2.6 * u], [x + dir * 2.4 * u, y - 3.4 * u]];
      feet = [[x - dir * 3.2 * u, y - 1.8 * u], [x + dir * 3.3 * u, y - 0.4 * u]];
    } else if (pose === 'apart') feet = [[x - dir * 2.2 * u, y], [x + dir * 1.6 * u, y]];
    else if (pose === 'sit') {
      hipY = y - (o.seat || 3.4) * u;
      knees = [[x + dir * 2.7 * u, hipY - 0.2 * u], [x + dir * 2.9 * u, hipY]];
      feet = [[x + dir * 2.8 * u, y], [x + dir * 3.1 * u, y]];
    } else if (pose === 'kneel') {
      hipY = y - 3.8 * u;
      knees = [[x + dir * 1.8 * u, y - 0.2 * u], [x - dir * 0.4 * u, y - 0.2 * u]];
      feet = [[x + dir * 1.9 * u, y], [x - dir * 2.6 * u, y]];
    } else if (pose === 'jump') {
      hipY = y - 8.6 * u;
      knees = [[x - dir * 1.4 * u, hipY + 2.4 * u], [x + dir * 1.6 * u, hipY + 2 * u]];
      feet = [[x - dir * 2.2 * u, hipY + 5 * u], [x + dir * 1 * u, hipY + 5.2 * u]];
    } else if (pose === 'slip') {
      hipY = y - 4.8 * u;
      knees = null;
      feet = [[x + dir * 3.6 * u, y - 2.2 * u], [x - dir * 1.8 * u, y]];
    } else feet = [[x - 0.9 * u, y], [x + 0.9 * u, y]];
    var lean = (o.lean || 0) * dir;
    // legs, the far one a shade darker
    [1, 0].forEach(function (i) {
      pen(ctx, i ? shade(trou, -0.18) : trou, 1.5 * u);
      ctx.beginPath();
      ctx.moveTo(hipX + (i ? -0.5 : 0.5) * u * dir, hipY);
      if (knees) ctx.lineTo(knees[i][0], knees[i][1]);
      ctx.lineTo(feet[i][0], feet[i][1] - 0.4 * u);
      ctx.stroke();
      ctx.fillStyle = boots;
      ell(ctx, feet[i][0] + dir * 0.35 * u, feet[i][1] - 0.45 * u, 0.95 * u, 0.55 * u);
      ctx.fill();
    });
    // the body: a coat from hips to shoulders, turned by the lean
    var bodyL = 5.4 * u;
    var shX = hipX + Math.sin(lean) * bodyL, shY = hipY - Math.cos(lean) * bodyL;
    var nx = Math.cos(lean), ny = Math.sin(lean);
    var hw = (o.skirt ? 2.3 : 1.9) * u, sw = 1.75 * u, low = o.skirt ? 1.6 * u : 1 * u;
    var bx = hipX - Math.sin(lean) * low, by = hipY + Math.cos(lean) * low;
    // arms behind the body first
    var arms = o.arms || (pose === 'walk' ? [-0.35 * st, 0.35 * st] : pose === 'run' ? [-0.9, 1.1] : [0.12, 0.12]);
    var armL = 5 * u;
    var hand2 = swing(shX - dir * 0.6 * u * nx, shY + 0.4 * u, armL, arms[0] + lean * dir, dir);
    pen(ctx, shade(coat, -0.2), 1.35 * u);
    seg(ctx, shX - dir * 0.6 * u * nx, shY + 0.4 * u, hand2[0], hand2[1]);
    ctx.fillStyle = skin;
    circ(ctx, hand2[0], hand2[1], 0.62 * u); ctx.fill();
    ctx.fillStyle = coat;
    poly(ctx, [bx - hw * nx, by - hw * ny, bx + hw * nx, by + hw * ny, shX + sw * nx, shY + sw * ny, shX - sw * nx, shY - sw * ny]);
    ctx.fill();
    ctx.beginPath(); ctx.arc(shX, shY, sw, lean + Math.PI, lean + TAU); ctx.fill();
    // a light down the side the person faces
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    poly(ctx, [bx + dir * hw * 0.2 * nx, by + dir * hw * 0.2 * ny, bx + dir * hw * nx, by + dir * hw * ny, shX + dir * sw * nx, shY + dir * sw * ny, shX + dir * sw * 0.2 * nx, shY + dir * sw * 0.2 * ny]);
    ctx.fill();
    // head
    var hr = 1.85 * u;
    var hx = shX + Math.sin(lean) * (0.7 * u + hr), hy = shY - Math.cos(lean) * (0.7 * u + hr);
    ctx.fillStyle = skin;
    circ(ctx, hx, hy, hr); ctx.fill();
    var hat = o.hat || 'none', hc = o.hatCol || '#D8432F';
    if (hat === 'hood') {
      ctx.fillStyle = coat;
      ctx.beginPath(); ctx.arc(hx - dir * 0.2 * u, hy, hr * 1.28, 0, TAU); ctx.fill();
      ctx.fillStyle = skin;
      ell(ctx, hx + dir * 0.45 * u, hy + 0.15 * u, hr * 0.72, hr * 0.8); ctx.fill();
    } else {
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(hx, hy, hr * 1.04, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
      ctx.beginPath(); ctx.arc(hx - dir * 0.5 * u, hy - 0.1 * u, hr * 0.9, dir > 0 ? Math.PI * 0.55 : -Math.PI * 0.55, dir > 0 ? Math.PI * 1.5 : Math.PI * 1.55, dir < 0); ctx.fill();
      if (o.hairLong) { rr(ctx, hx - dir * 1.9 * u - (dir > 0 ? 0 : 1.6 * u), hy - 0.4 * u, 1.6 * u, 3.6 * u, 0.7 * u); ctx.fill(); }
    }
    if (hat === 'beanie' || hat === 'bobble') {
      ctx.fillStyle = hc;
      ctx.beginPath(); ctx.arc(hx, hy - 0.2 * u, hr * 1.06, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = shade(hc, 0.25);
      rr(ctx, hx - hr * 1.08, hy - 0.6 * u, hr * 2.16, 0.8 * u, 0.4 * u); ctx.fill();
      if (hat === 'bobble') { ctx.fillStyle = '#FFFFFF'; circ(ctx, hx, hy - hr * 1.25, 0.75 * u); ctx.fill(); }
    } else if (hat === 'cap') {
      ctx.fillStyle = hc;
      ctx.beginPath(); ctx.arc(hx, hy - 0.25 * u, hr * 1.02, Math.PI, TAU); ctx.fill();
      ell(ctx, hx + dir * 1.6 * u, hy - 0.3 * u, 1.4 * u, 0.4 * u); ctx.fill();
    } else if (hat === 'sun') {
      ctx.fillStyle = hc;
      ell(ctx, hx, hy - 0.7 * u, hr * 1.9, 0.55 * u); ctx.fill();
      ctx.beginPath(); ctx.arc(hx, hy - 0.8 * u, hr * 0.85, Math.PI, TAU); ctx.fill();
    }
    if (o.eyes !== false && hat !== 'hood') { ctx.fillStyle = '#2A2233'; circ(ctx, hx + dir * 0.95 * u, hy + 0.05 * u, 0.26 * u); ctx.fill(); }
    else if (o.eyes !== false) { ctx.fillStyle = '#2A2233'; circ(ctx, hx + dir * 1.05 * u, hy + 0.15 * u, 0.26 * u); ctx.fill(); }
    if (o.scarf) {
      ctx.fillStyle = o.scarf;
      var sy = shY - 0.25 * u;
      rr(ctx, shX - 1.5 * u, sy - 0.6 * u, 3 * u, 1.2 * u, 0.5 * u); ctx.fill();
      var tailA = o.scarfFly ? -1.4 : 0.15;
      ctx.save();
      ctx.translate(shX - dir * 0.6 * u, sy);
      ctx.rotate(-tailA * dir);
      rr(ctx, -0.55 * u, 0, 1.1 * u, 3.4 * u, 0.4 * u); ctx.fill();
      ctx.restore();
    }
    // the front arm
    var sx1 = shX + dir * 0.6 * u * nx, sy1 = shY + 0.4 * u;
    var hand = swing(sx1, sy1, armL, arms[1] + lean * dir, dir);
    pen(ctx, coat, 1.35 * u);
    seg(ctx, sx1, sy1, hand[0], hand[1]);
    ctx.fillStyle = skin;
    circ(ctx, hand[0], hand[1], 0.62 * u); ctx.fill();
    return { hand: hand, hand2: hand2, head: [hx, hy], hr: hr, shoulder: [shX, shY], hip: [hipX, hipY], u: u, dir: dir };
  };
  /* lighter (k > 0) or darker (k < 0) version of a #rrggbb colour */
  function shade(hex, k) {
    if (typeof hex !== 'string' || hex.charAt(0) !== '#' || hex.length !== 7) return hex;
    var c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    var to = k > 0 ? [255, 255, 255] : [0, 0, 0];
    var m = mix(c, to, Math.abs(k));
    return '#' + m.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  K.shade = shade;

  /* ---------- animals ---------- */

  /* a dog side on. o: col, patch (a second colour), ear ('flop', 'up'), pose ('stand', 'sit', 'run'), dir, wag (tail
     swing), collar. Returns the head and mouth */
  K.dog = function (ctx, x, y, u, o) {
    o = o || {};
    var dir = o.dir === -1 ? -1 : 1, col = o.col || '#B07A45', dark = shade(col, -0.25), pose = o.pose || 'stand';
    var bx = x, by = y - 3.6 * u;
    var legs = pose === 'run' ? [[-2.6, -1.4, 1.2], [-1.8, 1, 0.9], [1.8, -1, -1.1], [2.6, 1.6, 1.2]] : [[-2.4, -2.4, 0], [-1.7, -1.7, 0], [1.8, 1.8, 0], [2.5, 2.5, 0]];
    pen(ctx, dark, 1.05 * u);
    if (pose !== 'sit') legs.forEach(function (l, i) { if (i % 2 === 0) seg(ctx, bx + l[0] * u * dir, by + 0.8 * u, bx + l[1] * u * dir, y - (pose === 'run' ? Math.abs(l[2]) * 0.6 * u : 0)); });
    // tail
    var wag = Math.sin(o.wag || 0) * 0.5;
    pen(ctx, col, 0.9 * u);
    ctx.beginPath();
    var tx = bx - 3.4 * u * dir, ty = by - 0.6 * u;
    if (pose === 'sit') { tx = x - 3.2 * u * dir; ty = y - 0.8 * u; ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - 1.6 * u * dir, ty + 0.6 * u, tx - (2.4 + wag) * u * dir, ty - 0.6 * u); }
    else { ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - 1.6 * u * dir, ty - 1 * u, tx - (1.4 + wag) * u * dir, ty - 2.8 * u); }
    ctx.stroke();
    ctx.fillStyle = col;
    var hx, hy;
    if (pose === 'sit') {
      // sitting up: haunches on the ground, chest up, front legs straight
      ell(ctx, x - 1.3 * u * dir, y - 1.7 * u, 2.3 * u, 1.7 * u); ctx.fill();
      ell(ctx, x + 0.4 * u * dir, y - 3.9 * u, 1.8 * u, 2.9 * u, 0.38 * dir); ctx.fill();
      if (o.patch) { ctx.fillStyle = o.patch; ell(ctx, x + 1.1 * u * dir, y - 4.2 * u, 0.8 * u, 1.5 * u, 0.38 * dir); ctx.fill(); ctx.fillStyle = col; }
      pen(ctx, col, 1.05 * u);
      seg(ctx, x + 1.3 * u * dir, y - 3 * u, x + 1.6 * u * dir, y);
      pen(ctx, dark, 1.05 * u);
      seg(ctx, x + 0.7 * u * dir, y - 3 * u, x + 0.9 * u * dir, y);
      ctx.fillStyle = dark;
      ell(ctx, x - 0.6 * u * dir, y - 0.4 * u, 1.3 * u, 0.5 * u); ctx.fill();
      hx = x + 1.4 * u * dir; hy = y - 7 * u;
      ctx.fillStyle = col;
    } else {
      ell(ctx, bx, by, 3.8 * u, 1.75 * u); ctx.fill();
      if (o.patch) { ctx.fillStyle = o.patch; ell(ctx, bx - 0.8 * u * dir, by - 0.6 * u, 1.4 * u, 1 * u); ctx.fill(); }
      pen(ctx, col, 1.05 * u);
      legs.forEach(function (l, i) { if (i % 2 === 1) seg(ctx, bx + l[0] * u * dir, by + 0.8 * u, bx + l[1] * u * dir, y - (pose === 'run' ? Math.abs(l[2]) * 0.6 * u : 0)); });
      hx = bx + 3.9 * u * dir; hy = by - 2.2 * u;
      ctx.fillStyle = col;
      poly(ctx, [bx + 2 * u * dir, by - 1.2 * u, hx - 0.6 * u * dir, hy - 0.4 * u, hx + 0.4 * u * dir, hy + 1 * u, bx + 3 * u * dir, by + 0.6 * u]);
      ctx.fill();
    }
    circ(ctx, hx, hy, 1.55 * u); ctx.fill();
    ell(ctx, hx + 1.5 * u * dir, hy + 0.45 * u, 1.3 * u, 0.85 * u); ctx.fill();
    ctx.fillStyle = '#1E1A22';
    circ(ctx, hx + 2.7 * u * dir, hy + 0.2 * u, 0.42 * u); ctx.fill();
    circ(ctx, hx + 0.55 * u * dir, hy - 0.45 * u, 0.27 * u); ctx.fill();
    ctx.fillStyle = dark;
    if (o.ear === 'up') tri(ctx, hx - 0.9 * u * dir, hy - 0.8 * u, hx - 0.1 * u * dir, hy - 2.9 * u, hx + 0.3 * u * dir, hy - 0.9 * u);
    else ell(ctx, hx - 0.7 * u * dir, hy + 0.5 * u, 0.75 * u, 1.45 * u, 0.25 * dir);
    ctx.fill();
    if (o.collar) { ctx.fillStyle = o.collar; ell(ctx, hx - 1.1 * u * dir, hy + 1.4 * u, 0.5 * u, 1 * u, 0.5 * dir); ctx.fill(); }
    return { head: [hx, hy], mouth: [hx + 2.2 * u * dir, hy + 0.9 * u], back: [bx, by - 1.7 * u], tail: [tx, ty] };
  };

  /* a four-legged animal side on, standing at (x, y). p: dir, col, legCol, belly, rx, ry (body), leg (length), lw (leg
     width), neck ([dx, dy] from the front of the body to the head), hr (head size), snout ([length, depth]), ears
     ('point', 'round', 'long', 'none'), tail ('short', 'long', 'tuft', 'bushy', 'none'), walk (0 to 1). Returns the
     head, the top of the back and the tail, so horns, antlers, humps and spots can go on */
  K.beast = function (ctx, x, y, u, p) {
    var dir = p.dir === -1 ? -1 : 1, col = p.col || '#8A6A4A', legCol = p.legCol || shade(col, -0.22);
    var rx = p.rx * u, ry = p.ry * u, leg = p.leg * u, lw = (p.lw || 1.1) * u;
    var by = y - leg - ry * 0.55, bx = x;
    var w = p.walk === undefined ? 0 : Math.sin(p.walk * TAU) * 0.35;
    var lx = [-rx * 0.72, -rx * 0.5, rx * 0.55, rx * 0.75];
    function legAt(i, front) {
      var a = (i % 2 ? w : -w) * (front ? 1 : -1);
      var sx = bx + lx[i] * dir, sy = by + ry * 0.35;
      var f = swing(sx, sy, leg + ry * 0.2, a, dir);
      pen(ctx, i % 2 ? legCol : shade(legCol, -0.15), lw);
      seg(ctx, sx, sy, f[0], f[1]);
      if (p.hoof) { ctx.fillStyle = p.hoof; ell(ctx, f[0], f[1] - 0.2 * u, lw * 0.6, lw * 0.4); ctx.fill(); }
    }
    legAt(0, false); legAt(2, true);
    // tail
    var tx = bx - rx * 0.95 * dir, ty = by - ry * 0.35;
    var tl = p.tail || 'short';
    if (tl !== 'none') {
      pen(ctx, p.tailCol || col, (tl === 'bushy' ? 1.6 : tl === 'long' ? 1 : 0.7) * u);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      if (tl === 'long' || tl === 'tuft') ctx.quadraticCurveTo(tx - 1.4 * u * dir, ty + 2 * u, tx - 1 * u * dir, ty + 5.4 * u);
      else if (tl === 'bushy') ctx.quadraticCurveTo(tx - 2.6 * u * dir, ty + 0.6 * u, tx - 4 * u * dir, ty + 2.4 * u);
      else ctx.lineTo(tx - 1.2 * u * dir, ty + 1.2 * u);
      ctx.stroke();
      if (tl === 'tuft') { ctx.fillStyle = shade(p.tailCol || col, -0.3); ell(ctx, tx - 1 * u * dir, ty + 5.6 * u, 0.6 * u, 1.1 * u); ctx.fill(); }
    }
    ctx.fillStyle = col;
    ell(ctx, bx, by, rx, ry); ctx.fill();
    if (p.belly) { ctx.fillStyle = p.belly; ell(ctx, bx, by + ry * 0.45, rx * 0.8, ry * 0.45); ctx.fill(); }
    legAt(1, false); legAt(3, true);
    // neck and head
    var nk = p.neck || [1.2, -2.4];
    var hx = bx + (rx + nk[0] * u) * dir, hy = by + nk[1] * u;
    var hr = (p.hr || 1.5) * u;
    ctx.fillStyle = col;
    var nw = (p.nw || 1.3) * u;
    poly(ctx, [bx + rx * 0.45 * dir, by - ry * 0.85, hx - nw * 0.4 * dir, hy - nw * 0.6, hx + nw * 0.5 * dir, hy + nw * 0.6, bx + rx * 0.85 * dir, by + ry * 0.25]);
    ctx.fill();
    if (p.mane) { ctx.fillStyle = p.mane; poly(ctx, [bx + rx * 0.35 * dir, by - ry * 0.9, hx - nw * 0.6 * dir, hy - nw * 0.9, hx - nw * 0.1 * dir, hy - nw * 0.3, bx + rx * 0.6 * dir, by - ry * 0.55]); ctx.fill(); }
    ctx.fillStyle = col;
    circ(ctx, hx, hy, hr); ctx.fill();
    var sn = p.snout || [1.6, 1];
    ctx.fillStyle = p.snoutCol || col;
    ell(ctx, hx + sn[0] * 0.6 * u * dir, hy + hr * 0.35, sn[0] * 0.75 * u, sn[1] * 0.75 * u, 0.25 * dir); ctx.fill();
    ctx.fillStyle = '#1E1A22';
    circ(ctx, hx + hr * 0.3 * dir, hy - hr * 0.25, Math.max(0.6, 0.26 * u)); ctx.fill();
    if (p.nose) { circ(ctx, hx + (sn[0] * 1.3 * u) * dir, hy + hr * 0.25, 0.35 * u); ctx.fill(); }
    var er = p.ears || 'point';
    ctx.fillStyle = p.earCol || shade(col, -0.12);
    if (er === 'point') tri(ctx, hx - hr * 0.5 * dir, hy - hr * 0.6, hx - hr * 0.2 * dir, hy - hr * 1.9, hx + hr * 0.25 * dir, hy - hr * 0.75);
    else if (er === 'round') { circ(ctx, hx - hr * 0.35 * dir, hy - hr * 0.95, hr * 0.42); }
    else if (er === 'long') ell(ctx, hx - hr * 0.5 * dir, hy - hr * 1.6, hr * 0.32, hr * 1.2, -0.25 * dir);
    else if (er === 'side') ell(ctx, hx - hr * 0.8 * dir, hy - hr * 0.3, hr * 0.7, hr * 0.3, -0.4 * dir);
    if (er !== 'none') ctx.fill();
    return { head: [hx, hy], hr: hr, back: [bx, by - ry], body: [bx, by], rx: rx, ry: ry, tail: [tx, ty], dir: dir, u: u };
  };
  /* antlers on a head: big for a stag or reindeer */
  K.antlers = function (ctx, h, size, col) {
    var u = h.u, d = h.dir, x = h.head[0] - h.hr * 0.1 * d, y = h.head[1] - h.hr * 0.8;
    pen(ctx, col || '#C8A77A', 0.55 * u);
    [-1, 1].forEach(function (side) {
      var sx = x + side * 0.4 * u;
      var top = [sx - d * 1.6 * size * u + side * 0.6 * u, y - 5 * size * u];
      ctx.beginPath(); ctx.moveTo(sx, y); ctx.quadraticCurveTo(sx - d * 2.4 * size * u, y - 2 * size * u, top[0], top[1]); ctx.stroke();
      for (var k = 1; k <= 3; k++) {
        var f = k / 3.6, px = lerp(sx, top[0], f) - d * size * u * 0.6 * Math.sin(f * 3), py = lerp(y, top[1], f);
        seg(ctx, px, py, px + d * 1.4 * size * u, py - 1.2 * size * u);
      }
    });
  };
  /* horns: curly (a goat), swept (a buffalo), long (a highland cow), stubby */
  K.horns = function (ctx, h, kind, col) {
    var u = h.u, d = h.dir, x = h.head[0], y = h.head[1] - h.hr * 0.7;
    pen(ctx, col || '#E8DCC2', (kind === 'long' ? 0.7 : 0.6) * u);
    ctx.beginPath();
    if (kind === 'curly') { ctx.moveTo(x, y); ctx.bezierCurveTo(x - d * 1.6 * u, y - 2.6 * u, x - d * 3.4 * u, y - 0.6 * u, x - d * 2.2 * u, y + 0.8 * u); }
    else if (kind === 'swept') { ctx.moveTo(x + d * 0.4 * u, y + 0.3 * u); ctx.quadraticCurveTo(x - d * 2.4 * u, y - 0.6 * u, x - d * 2.8 * u, y + 1.6 * u); }
    else if (kind === 'long') { ctx.moveTo(x - 1.6 * u, y + 0.4 * u); ctx.quadraticCurveTo(x - 3.4 * u, y - 0.6 * u, x - 3.2 * u, y - 2.6 * u); ctx.moveTo(x + 1.2 * u, y + 0.4 * u); ctx.quadraticCurveTo(x + 3 * u, y - 0.6 * u, x + 2.8 * u, y - 2.6 * u); }
    else { ctx.moveTo(x - 0.6 * u, y); ctx.lineTo(x - 1 * u, y - 1.2 * u); ctx.moveTo(x + 0.6 * u, y); ctx.lineTo(x + 0.9 * u, y - 1.2 * u); }
    ctx.stroke();
  };

  /* ---------- birds ---------- */

  /* a bird far off: a flying M, flapping with ph */
  K.flyer = function (ctx, x, y, s, col, ph) {
    var f = Math.sin(ph || 0) * 0.5;
    pen(ctx, col || 'rgba(40,44,60,0.85)', s * 0.22);
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * (0.3 + f));
    ctx.quadraticCurveTo(x - s * 0.45, y - s * (0.55 + f * 0.5), x, y);
    ctx.quadraticCurveTo(x + s * 0.45, y - s * (0.55 + f * 0.5), x + s, y - s * (0.3 + f));
    ctx.stroke();
  };
  /* a small bird perched or standing, feet at (x, y). o: body, belly, cap (top of the head), face, wing, beak, legs, dir,
     tail ('short', 'long', 'up', 'fork'), hop. s is about the size of the body */
  K.bird = function (ctx, x, y, s, o) {
    o = o || {};
    var d = o.dir === -1 ? -1 : 1, body = o.body || '#7A5534';
    var by = y - s * 1.25 - (o.hop || 0);
    ctx.fillStyle = o.tailCol || shade(body, -0.15);
    var tl = o.tail || 'short';
    if (tl === 'long') poly(ctx, [x - d * s * 0.6, by - s * 0.1, x - d * s * 3.2, by + s * 0.2, x - d * s * 3.2, by + s * 0.55, x - d * s * 0.5, by + s * 0.45]);
    else if (tl === 'up') poly(ctx, [x - d * s * 0.7, by, x - d * s * 1.8, by - s * 1.3, x - d * s * 1.3, by - s * 1.5, x - d * s * 0.4, by - s * 0.3]);
    else if (tl === 'fork') { tri(ctx, x - d * s * 0.6, by, x - d * s * 2.4, by + s * 0.2, x - d * s * 1.6, by + s * 0.5); ctx.fill(); tri(ctx, x - d * s * 0.6, by + s * 0.2, x - d * s * 2.3, by + s * 0.9, x - d * s * 1.4, by + s * 0.8); }
    else poly(ctx, [x - d * s * 0.6, by, x - d * s * 1.9, by + s * 0.55, x - d * s * 1.7, by + s * 0.95, x - d * s * 0.4, by + s * 0.6]);
    ctx.fill();
    ctx.fillStyle = body;
    ell(ctx, x, by, s * 1.2, s * 0.95, -0.12 * d); ctx.fill();
    if (o.belly) { ctx.fillStyle = o.belly; ell(ctx, x + d * s * 0.35, by + s * 0.25, s * 0.75, s * 0.62); ctx.fill(); }
    if (o.wing) { ctx.fillStyle = o.wing; ell(ctx, x - d * s * 0.25, by - s * 0.05, s * 0.8, s * 0.5, 0.2 * d); ctx.fill(); }
    var hx = x + d * s * 0.85, hy = by - s * 0.85;
    ctx.fillStyle = o.cap || body;
    circ(ctx, hx, hy, s * 0.62); ctx.fill();
    if (o.face) { ctx.fillStyle = o.face; ell(ctx, hx + d * s * 0.2, hy + s * 0.15, s * 0.42, s * 0.4); ctx.fill(); }
    ctx.fillStyle = o.eye || '#1F2433';
    circ(ctx, hx + d * s * 0.22, hy - s * 0.12, Math.max(0.6, s * 0.13)); ctx.fill();
    ctx.fillStyle = o.beak || '#3A2A1A';
    var bl = o.beakLen || 0.65;
    tri(ctx, hx + d * s * 0.5, hy - s * 0.12, hx + d * s * (0.55 + bl), hy + s * 0.02, hx + d * s * 0.5, hy + s * 0.17); ctx.fill();
    pen(ctx, o.legs || '#3A2A1A', Math.max(1, s * 0.13));
    seg(ctx, x - d * s * 0.15, by + s * 0.85, x - d * s * 0.2, y);
    seg(ctx, x + d * s * 0.3, by + s * 0.85, x + d * s * 0.3, y);
    return { head: [hx, hy], body: [x, by] };
  };
  /* a swimming bird: 'duck', 'swan' or 'goose'. Water line at y */
  K.swimmer = function (ctx, x, y, s, kind, d, t) {
    d = d === -1 ? -1 : 1;
    var bob = Math.sin((t || 0) * 2) * s * 0.06;
    var body = kind === 'swan' ? '#FFFFFF' : kind === 'goose' ? '#8C8476' : '#8A6A4E';
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x - d * s * 1.6, y - s * 0.6 + bob);
    ctx.quadraticCurveTo(x - d * s * 1.2, y + s * 0.2 + bob, x + d * s * 0.6, y + s * 0.15 + bob);
    ctx.quadraticCurveTo(x + d * s * 1.3, y - s * 0.1 + bob, x + d * s * 1, y - s * 0.55 + bob);
    ctx.quadraticCurveTo(x, y - s * 0.9 + bob, x - d * s * 1.6, y - s * 0.6 + bob);
    ctx.fill();
    var nx = x + d * s * 0.85, hx, hy;
    if (kind === 'swan') {
      pen(ctx, body, s * 0.32);
      ctx.beginPath(); ctx.moveTo(nx, y - s * 0.5 + bob); ctx.bezierCurveTo(nx + d * s * 0.6, y - s * 1.2 + bob, nx - d * s * 0.3, y - s * 1.8 + bob, nx + d * s * 0.2, y - s * 2.3 + bob); ctx.stroke();
      hx = nx + d * s * 0.3; hy = y - s * 2.35 + bob;
      ctx.fillStyle = body; circ(ctx, hx, hy, s * 0.24); ctx.fill();
      ctx.fillStyle = '#F28A2E'; tri(ctx, hx + d * s * 0.1, hy - s * 0.1, hx + d * s * 0.7, hy + s * 0.12, hx + d * s * 0.1, hy + s * 0.18); ctx.fill();
      ctx.fillStyle = '#1F2433'; circ(ctx, hx + d * s * 0.08, hy - s * 0.02, s * 0.06); ctx.fill();
    } else {
      pen(ctx, kind === 'goose' ? '#2A2A2E' : body, s * 0.3);
      ctx.beginPath(); ctx.moveTo(nx, y - s * 0.4 + bob); ctx.lineTo(nx + d * s * 0.2, y - s * (kind === 'goose' ? 1.6 : 1) + bob); ctx.stroke();
      hx = nx + d * s * 0.25; hy = y - s * (kind === 'goose' ? 1.75 : 1.15) + bob;
      ctx.fillStyle = kind === 'goose' ? '#2A2A2E' : '#2E7A4A';
      circ(ctx, hx, hy, s * 0.36); ctx.fill();
      if (kind === 'goose') { ctx.fillStyle = '#FFFFFF'; ell(ctx, hx - d * s * 0.05, hy + s * 0.12, s * 0.16, s * 0.1); ctx.fill(); }
      ctx.fillStyle = kind === 'goose' ? '#3A3A3E' : '#F2B33D';
      tri(ctx, hx + d * s * 0.25, hy - s * 0.08, hx + d * s * 0.85, hy + s * 0.08, hx + d * s * 0.25, hy + s * 0.2); ctx.fill();
      ctx.fillStyle = '#1F2433'; circ(ctx, hx + d * s * 0.1, hy - s * 0.08, s * 0.07); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(1, s * 0.08);
    ell(ctx, x, y + s * 0.2, s * 1.9, s * 0.25); ctx.stroke();
    return { head: [hx, hy] };
  };
  /* a big bird soaring, wings out: 'eagle', 'kite', 'vulture', 'kestrel' (hovering), 'gull' */
  K.soar = function (ctx, x, y, s, kind, ph) {
    var f = Math.sin(ph || 0) * (kind === 'kestrel' ? 0.35 : 0.08);
    var col = kind === 'gull' ? '#F4F6F8' : kind === 'vulture' ? '#3A2E2A' : kind === 'kestrel' ? '#B8743E' : '#5A3E2A';
    var tip = kind === 'gull' ? '#2A2E3A' : shade(col, -0.35);
    ctx.fillStyle = col;
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.1);
      ctx.quadraticCurveTo(x + side * s * 1.2, y - s * (0.6 + f), x + side * s * (kind === 'gull' ? 2.6 : 2.3), y - s * (0.2 + f * 2));
      ctx.lineTo(x + side * s * 2.1, y + s * 0.2 - s * f);
      ctx.quadraticCurveTo(x + side * s * 1, y + s * 0.25, x, y + s * 0.3);
      ctx.fill();
      ctx.fillStyle = tip;
      if (kind !== 'gull') for (var k = 0; k < 4; k++) { var tx = x + side * s * (2 + k * 0.08), ty = y - s * (0.15 + f * 2) + k * s * 0.12; ell(ctx, tx, ty, s * 0.32, s * 0.08, side * 0.3); ctx.fill(); }
      else { tri(ctx, x + side * s * 2.6, y - s * (0.2 + f * 2), x + side * s * 1.9, y - s * (0.05 + f * 1.5), x + side * s * 2.1, y + s * 0.15 - s * f); ctx.fill(); }
      ctx.fillStyle = col;
    });
    ell(ctx, x, y + s * 0.1, s * 0.35, s * 0.9); ctx.fill();
    ctx.fillStyle = kind === 'kite' ? '#B4532A' : shade(col, -0.1);
    if (kind === 'kite') { tri(ctx, x - s * 0.3, y + s * 0.8, x + s * 0.3, y + s * 0.8, x, y + s * 1.6); ctx.fill(); }
    else { ell(ctx, x, y + s * 0.95, s * 0.28, s * 0.4); ctx.fill(); }
    ctx.fillStyle = kind === 'vulture' ? '#D8A890' : kind === 'gull' ? '#FFFFFF' : col;
    circ(ctx, x, y - s * 0.75, s * 0.28); ctx.fill();
    if (kind === 'gull') { ctx.fillStyle = '#F2C230'; tri(ctx, x - s * 0.08, y - s * 0.95, x + s * 0.08, y - s * 0.95, x, y - s * 1.25); ctx.fill(); }
  };

  /* ---------- buildings ---------- */

  /* a house, its front bottom middle at (x, y). o: w, h (wall), wall, roof, door, wins (number of windows), lit (a warm
     glow in the windows), chimney, smoke (t), snow (on the roof) */
  K.house = function (ctx, x, y, u, o, t) {
    o = o || {};
    var w = (o.w || 10) * u, h = (o.h || 6.5) * u, rh = (o.rh || 4.5) * u;
    var x0 = x - w / 2, top = y - h;
    if (o.chimney !== false) {
      ctx.fillStyle = o.chimneyCol || '#8A4A3A';
      ctx.fillRect(x0 + w * 0.68, top - rh * 0.95, w * 0.12, rh * 0.8);
      if (o.smoke !== undefined) {
        for (var k = 0; k < 4; k++) {
          var p = ((o.smoke || 0) * 0.25 + k * 0.25) % 1;
          ctx.fillStyle = 'rgba(225,228,236,' + (0.6 * (1 - p)) + ')';
          circ(ctx, x0 + w * 0.74 + Math.sin(p * 4 + k) * u * (o.straight ? 0.2 : 1.2) + (o.straight ? 0 : p * 3 * u), top - rh - p * 8 * u, (0.8 + p * 1.6) * u); ctx.fill();
        }
      }
    }
    ctx.fillStyle = o.wall || '#E8DCC8';
    ctx.fillRect(x0, top, w, h);
    ctx.fillStyle = o.roof || '#7A3E36';
    poly(ctx, [x0 - 0.8 * u, top + 0.2 * u, x + w * 0.0, top - rh, x0 + w + 0.8 * u, top + 0.2 * u]);
    ctx.fill();
    if (o.snow) {
      ctx.fillStyle = '#F7FAFF';
      poly(ctx, [x0 - 0.9 * u, top + 0.3 * u, x, top - rh - 0.4 * u, x0 + w + 0.9 * u, top + 0.3 * u, x0 + w + 0.4 * u, top + 1 * u, x, top - rh + 1.2 * u, x0 - 0.4 * u, top + 1 * u]);
      ctx.fill();
    }
    var wins = o.wins === undefined ? 2 : o.wins;
    var lit = o.lit ? (typeof o.lit === 'string' ? o.lit : '#FFD27A') : '#8FB6D8';
    for (var i = 0; i < wins; i++) {
      var wx = x0 + w * (wins === 1 ? 0.22 : 0.16 + i * (0.64 / (wins - 1 || 1))) - (wins === 1 ? 0 : 0);
      if (o.door !== false && Math.abs(wx + 1.1 * u - x) < 2.2 * u) continue;
      ctx.fillStyle = lit;
      ctx.fillRect(wx, top + h * 0.22, 2.2 * u, 2.2 * u);
      if (o.lit) glow(ctx, wx + 1.1 * u, top + h * 0.22 + 1.1 * u, 4 * u, [255, 210, 120], 0.35);
      ctx.fillStyle = 'rgba(60,40,30,0.5)';
      ctx.fillRect(wx + 1 * u, top + h * 0.22, 0.2 * u, 2.2 * u);
      ctx.fillRect(wx, top + h * 0.22 + 1 * u, 2.2 * u, 0.2 * u);
    }
    if (o.door !== false) {
      ctx.fillStyle = o.door || '#3A5A8A';
      rr(ctx, x - 1.2 * u + (o.doorX || 0) * u, y - 4 * u, 2.4 * u, 4 * u, 0.5 * u); ctx.fill();
    }
    return { x0: x0, x1: x0 + w, top: top, roofTop: top - rh };
  };

  /* ---------- vehicles ---------- */
  K.wheel = function (ctx, x, y, r, col) {
    ctx.fillStyle = col || '#22262F';
    circ(ctx, x, y, r); ctx.fill();
    ctx.fillStyle = '#C9CED8';
    circ(ctx, x, y, r * 0.42); ctx.fill();
  };
  /* a car side on, wheels on y. o: col, dir, lights (on), w */
  K.car = function (ctx, x, y, u, o) {
    o = o || {};
    var d = o.dir === -1 ? -1 : 1, col = o.col || '#D8432F', L = (o.w || 13) * u;
    var x0 = x - L / 2;
    ctx.save();
    if (d < 0) { ctx.translate(x * 2, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = col;
    rr(ctx, x0, y - 4.4 * u, L, 3.3 * u, 1.2 * u); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x0 + L * 0.2, y - 4.2 * u);
    ctx.quadraticCurveTo(x0 + L * 0.28, y - 7 * u, x0 + L * 0.45, y - 7 * u);
    ctx.lineTo(x0 + L * 0.66, y - 7 * u);
    ctx.quadraticCurveTo(x0 + L * 0.78, y - 7 * u, x0 + L * 0.86, y - 4.2 * u);
    ctx.fill();
    ctx.fillStyle = o.glass || '#A8D2F0';
    poly(ctx, [x0 + L * 0.27, y - 4.4 * u, x0 + L * 0.34, y - 6.4 * u, x0 + L * 0.54, y - 6.4 * u, x0 + L * 0.54, y - 4.4 * u]); ctx.fill();
    poly(ctx, [x0 + L * 0.57, y - 4.4 * u, x0 + L * 0.57, y - 6.4 * u, x0 + L * 0.68, y - 6.4 * u, x0 + L * 0.8, y - 4.4 * u]); ctx.fill();
    ctx.fillStyle = o.lights ? '#FFF2B0' : '#F5E7B8';
    ell(ctx, x0 + L - 0.5 * u, y - 3.4 * u, 0.6 * u, 0.5 * u); ctx.fill();
    ctx.fillStyle = '#C0392B';
    ctx.fillRect(x0 + 0.1 * u, y - 3.8 * u, 0.6 * u, 0.9 * u);
    ctx.restore();
    K.wheel(ctx, x - d * L * 0.3, y - 1.2 * u, 1.45 * u);
    K.wheel(ctx, x + d * L * 0.3, y - 1.2 * u, 1.45 * u);
    return { front: [x + d * L / 2, y - 3.4 * u], top: y - 7 * u, L: L };
  };
  /* a bicycle, wheels on y; ride: someone riding it (o for the person) */
  K.bike = function (ctx, x, y, u, o) {
    o = o || {};
    var d = o.dir === -1 ? -1 : 1, r = 2.3 * u, col = o.col || '#2F7BD8';
    var bw = x - d * 3.2 * u, fw = x + d * 3.2 * u, wy = y - r;
    pen(ctx, '#22262F', 0.45 * u);
    circ(ctx, bw, wy, r); ctx.stroke();
    circ(ctx, fw, wy, r); ctx.stroke();
    pen(ctx, col, 0.55 * u);
    path(ctx, [bw, wy, x - d * 0.4 * u, wy, x + d * 2 * u, wy - 2.8 * u, x - d * 1.2 * u, wy - 2.8 * u, bw, wy]);
    seg(ctx, x - d * 0.4 * u, wy, x - d * 1.4 * u, wy - 3.6 * u);
    seg(ctx, fw, wy, x + d * 2.2 * u, wy - 3.8 * u);
    pen(ctx, '#22262F', 0.5 * u);
    seg(ctx, x + d * 1.6 * u, wy - 4 * u, x + d * 2.8 * u, wy - 3.8 * u);
    seg(ctx, x - d * 2.1 * u, wy - 3.7 * u, x - d * 0.8 * u, wy - 3.7 * u);
    return { seat: [x - d * 1.4 * u, wy - 3.8 * u], bars: [x + d * 2.4 * u, wy - 3.9 * u], pedal: [x - d * 0.4 * u, wy], back: bw, front: fw, r: r };
  };
  /* a boat on the water line y: 'row', 'sail', 'fish' (a fishing boat) */
  K.boat = function (ctx, x, y, u, o, t) {
    o = o || {};
    var kind = o.kind || 'row', d = o.dir === -1 ? -1 : 1, L = (o.w || (kind === 'fish' ? 13 : 10)) * u;
    var bob = Math.sin((t || 0) * 1.6) * 0.3 * u, rock = Math.sin((t || 0) * 1.3) * 0.04;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(rock);
    ctx.fillStyle = o.hull || (kind === 'fish' ? '#2D5A8A' : '#C8502E');
    ctx.beginPath();
    ctx.moveTo(-L / 2, -2.2 * u);
    ctx.lineTo(L / 2 + d * 0.8 * u, -2.6 * u);
    ctx.quadraticCurveTo(L * 0.4, 0.6 * u, 0, 0.6 * u);
    ctx.quadraticCurveTo(-L * 0.42, 0.6 * u, -L / 2, -2.2 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(-L / 2 + 0.5 * u, -2.2 * u, L - 1 * u, 0.45 * u);
    if (kind === 'sail') {
      pen(ctx, '#5A4030', 0.45 * u);
      seg(ctx, 0, -2.4 * u, 0, -13 * u);
      ctx.fillStyle = o.sail || '#FFFFFF';
      tri(ctx, 0.3 * u, -12.6 * u, 0.3 * u, -3.2 * u, d * 6.4 * u, -3.4 * u); ctx.fill();
      ctx.fillStyle = o.sail2 || '#F2D24A';
      tri(ctx, -0.3 * u, -10.4 * u, -0.3 * u, -3.2 * u, -d * 3.6 * u, -3.4 * u); ctx.fill();
    } else if (kind === 'fish') {
      ctx.fillStyle = '#F2EEE6';
      ctx.fillRect(-d * 1.6 * u - 1.8 * u, -6.6 * u, 3.6 * u, 4.2 * u);
      ctx.fillStyle = '#8FB6D8';
      ctx.fillRect(-d * 1.6 * u - 1.2 * u, -5.8 * u, 2.4 * u, 1.4 * u);
      pen(ctx, '#5A4030', 0.4 * u);
      seg(ctx, d * 2.6 * u, -2.6 * u, d * 2.6 * u, -9.4 * u);
      seg(ctx, d * 2.6 * u, -9 * u, d * 5.8 * u, -3 * u);
    }
    ctx.restore();
  };

  /* ---------- trees and plants ---------- */

  /* a tree standing at (x, y). o: kind ('round', 'pine', 'birch', 'bare', 'palm'), h (height in u), col, trunk,
     snow (white on top), frost (white all over), bend (sideways lean, for wind) */
  K.tree = function (ctx, x, y, u, o) {
    o = o || {};
    var kind = o.kind || 'round', h = (o.h || 14) * u, bend = (o.bend || 0) * u;
    var trunk = o.trunk || (kind === 'birch' ? '#EDEAE2' : '#6B4A2B');
    pen(ctx, trunk, (kind === 'pine' ? 1 : 1.3) * u * (o.thick || 1));
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + bend * 0.3, y - h * 0.5, x + bend, y - h * 0.72); ctx.stroke();
    if (kind === 'birch') {
      ctx.fillStyle = '#2A2A2E';
      for (var b = 1; b < 5; b++) ctx.fillRect(x + bend * (b / 8) - 0.6 * u, y - h * 0.14 * b, 1 * u, 0.3 * u);
    }
    var tx = x + bend, ty = y - h * 0.72;
    var col = o.frost ? '#E8F0FA' : o.col || (kind === 'pine' ? '#2F6A4A' : kind === 'birch' ? '#9CC45A' : '#4E9A4A');
    if (kind === 'pine') {
      ctx.fillStyle = col;
      for (var i = 0; i < 3; i++) {
        var wy = y - h * (0.25 + i * 0.25), ww = (3.6 - i * 0.9) * u * (h / (14 * u));
        tri(ctx, x + bend * (i / 3) - ww, wy, x + bend * ((i + 1) / 3), wy - h * 0.38, x + bend * (i / 3) + ww, wy); ctx.fill();
        if (o.snow) { ctx.fillStyle = '#F7FAFF'; tri(ctx, x + bend * (i / 3) - ww * 0.5, wy - h * 0.19, x + bend * ((i + 1) / 3), wy - h * 0.38, x + bend * (i / 3) + ww * 0.5, wy - h * 0.19); ctx.fill(); ctx.fillStyle = col; }
      }
    } else if (kind === 'bare') {
      pen(ctx, o.trunk || (o.frost ? '#DDE6F2' : '#5A4030'), 0.6 * u);
      var rnd = K.rand(o.seed || 31);
      for (var k = 0; k < 7; k++) {
        var f = 0.4 + k * 0.08, bx = x + bend * f, byy = y - h * f;
        var side = k % 2 ? 1 : -1, len = (3 + rnd() * 2.5) * u * (1 - f * 0.4);
        seg(ctx, bx, byy, bx + side * len, byy - len * 0.8);
        seg(ctx, bx + side * len * 0.6, byy - len * 0.48, bx + side * len * 0.9, byy - len * 1.2);
      }
    } else if (kind === 'palm') {
      ctx.fillStyle = col;
      for (var j = 0; j < 6; j++) { var a = -Math.PI / 2 + (j - 2.5) * 0.55; ell(ctx, tx + Math.cos(a) * 2.6 * u, ty + Math.sin(a) * 1.6 * u + 1 * u, 3.4 * u, 0.9 * u, a); ctx.fill(); }
    } else {
      var rs = h * 0.26;
      ctx.fillStyle = shade(col, -0.15);
      circ(ctx, tx - rs * 0.5, ty + rs * 0.25, rs * 0.8); ctx.fill();
      ctx.fillStyle = col;
      circ(ctx, tx + rs * 0.45, ty + rs * 0.2, rs * 0.85); ctx.fill();
      circ(ctx, tx, ty - rs * 0.3, rs); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      circ(ctx, tx - rs * 0.3, ty - rs * 0.55, rs * 0.45); ctx.fill();
      if (o.snow) { ctx.fillStyle = '#F7FAFF'; ctx.beginPath(); ctx.arc(tx, ty - rs * 0.3, rs, Math.PI * 1.1, Math.PI * 1.9); ctx.fill(); }
    }
    return { top: [tx, ty - h * 0.28] };
  };
  /* a little flower on a stalk */
  K.flower = function (ctx, x, y, s, col, mid) {
    pen(ctx, '#3E8A3A', s * 0.22);
    seg(ctx, x, y, x, y - s * 2.6);
    ctx.fillStyle = col;
    for (var i = 0; i < 5; i++) { var a = i * TAU / 5; circ(ctx, x + Math.cos(a) * s * 0.45, y - s * 2.6 + Math.sin(a) * s * 0.45, s * 0.42); ctx.fill(); }
    ctx.fillStyle = mid || '#FFD84D';
    circ(ctx, x, y - s * 2.6, s * 0.3); ctx.fill();
  };
  /* tufts of grass along the ground */
  K.grass = function (ctx, x0, x1, y, s, col) {
    pen(ctx, col || 'rgba(60,120,60,0.85)', s * 0.25);
    for (var x = x0; x < x1; x += s * 1.6) {
      seg(ctx, x, y, x - s * 0.3, y - s);
      seg(ctx, x + s * 0.3, y, x + s * 0.4, y - s * 1.2);
    }
  };
  /* a fence of posts and two rails from x0 to x1 */
  K.fence = function (ctx, x0, x1, y, u, col, h) {
    h = (h || 5) * u;
    pen(ctx, col || '#8A6A4A', 0.7 * u);
    seg(ctx, x0, y - h * 0.4, x1, y - h * 0.4);
    seg(ctx, x0, y - h * 0.85, x1, y - h * 0.85);
    for (var x = x0; x <= x1 + 0.1; x += (x1 - x0) / Math.max(1, Math.round((x1 - x0) / (5 * u)))) seg(ctx, x, y, x, y - h);
  };
  /* a rock */
  K.rock = function (ctx, x, y, w, h, col) {
    ctx.fillStyle = col || '#8A8E98';
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w * 0.9, y - h * 0.9, x - w * 0.2, y - h);
    ctx.quadraticCurveTo(x + w * 0.7, y - h * 1.05, x + w, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ell(ctx, x - w * 0.3, y - h * 0.7, w * 0.35, h * 0.18); ctx.fill();
  };

  /* ---------- sky things ---------- */

  /* the moon: phase 'full', 'half' or 'crescent'. sky is the colour behind it, for the shadow side */
  K.moon = function (ctx, x, y, r, phase, sky, col) {
    glow(ctx, x, y, r * 3, [255, 248, 225], 0.25);
    ctx.fillStyle = col || '#FFF6DC';
    circ(ctx, x, y, r); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,160,0.35)';
    circ(ctx, x - r * 0.3, y - r * 0.2, r * 0.22); ctx.fill();
    circ(ctx, x + r * 0.25, y + r * 0.3, r * 0.16); ctx.fill();
    if (phase === 'crescent') { ctx.fillStyle = sky || '#0E1430'; circ(ctx, x + r * 0.45, y - r * 0.12, r * 0.92); ctx.fill(); }
    else if (phase === 'half') { ctx.fillStyle = sky || '#0E1430'; ctx.beginPath(); ctx.arc(x, y, r * 1.02, -Math.PI / 2, Math.PI / 2); ctx.fill(); }
  };
  K.planet = function (ctx, x, y, r, col, t) {
    glow(ctx, x, y, r * 4, [255, 250, 230], 0.35 + 0.1 * Math.sin((t || 0) * 2));
    ctx.fillStyle = col || '#FFF8E6';
    circ(ctx, x, y, r); ctx.fill();
  };
  /* stars dotted over a part of the sky */
  K.stars = function (ctx, x0, y0, x1, y1, n, seed, s, t) {
    var rnd = K.rand(seed);
    for (var i = 0; i < n; i++) {
      var x = lerp(x0, x1, rnd()), y = lerp(y0, y1, rnd()), k = 0.5 + 0.5 * Math.sin((t || 0) * 2 + i * 1.7);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.5 * k) + ')';
      circ(ctx, x, y, s * (0.5 + rnd() * 0.6)); ctx.fill();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
