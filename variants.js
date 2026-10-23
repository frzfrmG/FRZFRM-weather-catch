/* FRZFRM Weather Catch: the mystery variants, the little extras drawn into a caught jar.
   Each picture is registered by name with the layer it belongs on: stars (with the stars), back (behind the clouds),
   front (in front of the clouds, behind the rain) or ground (last of all, in front of everything).
   They're drawn in the jar's own space: the body runs from about 15% to 85% across and 30% to 96% down.
   u is a size unit from the jar's width, set by each picture so it reads at shelf size. */
(function (root) {
  'use strict';
  var WC = root.WC = root.WC || {};
  var TAU = Math.PI * 2;
  var D = WC.decos = {};

  /* what the sky drawing hands over for each picture: this catch's jitter and random numbers, the scene and its ground */
  var J, sr, rng, star4, standY, roundRect, rainbowArc, SALT, kind, scene;
  function add(name, at, body, opts) {
    var fn = function (ctx, W, H, t, E) {
      J = E.J; sr = E.sr; rng = E.rng; star4 = E.star4; standY = E.standY; roundRect = E.roundRect; rainbowArc = E.rainbowArc;
      SALT = E.salt; kind = E.kind; scene = E.s;
      body(ctx, W, H, t);
    };
    fn.at = at;
    if (opts) Object.keys(opts).forEach(function (k) { fn[k] = opts[k]; });
    D[name] = fn;
  }

  /* ---------- small helpers ---------- */
  function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function tri(ctx, x1, y1, x2, y2, x3, y3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function glow(ctx, x, y, r, c, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    circ(ctx, x, y, r);
    ctx.fill();
  }
  /* a puddle on the ground, with a lighter middle and a ripple */
  function pond(ctx, x, y, rx, ry, t) {
    ctx.fillStyle = 'rgba(120,160,210,0.5)';
    ell(ctx, x, y, rx, ry);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,225,250,0.35)';
    ell(ctx, x - rx * 0.15, y - ry * 0.2, rx * 0.6, ry * 0.45);
    ctx.fill();
    var p = ((t || 0) * 0.5) % 1;
    ctx.strokeStyle = 'rgba(235,244,255,' + (0.7 * (1 - p)) + ')';
    ctx.lineWidth = Math.max(1, ry * 0.12);
    ell(ctx, x + rx * 0.3, y, rx * (0.1 + p * 0.4), ry * (0.1 + p * 0.4));
    ctx.stroke();
  }
  /* a child in a yellow raincoat seen from behind, standing at x with their feet at y */
  function child(ctx, x, y, u, armsUp) {
    var bh = 8 * u, bw = 4.8 * u;
    ctx.fillStyle = '#D8432F';
    roundRect(ctx, x - 1.9 * u, y - 1.9 * u, 1.6 * u, 1.9 * u, 0.4 * u); ctx.fill();
    roundRect(ctx, x + 0.3 * u, y - 1.9 * u, 1.6 * u, 1.9 * u, 0.4 * u); ctx.fill();
    ctx.strokeStyle = '#FFC83D';
    ctx.lineWidth = Math.max(1.5, 1.1 * u);
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (armsUp) {
      ctx.moveTo(x - bw * 0.4, y - bh * 0.85); ctx.lineTo(x - bw * 0.85, y - bh * 1.3);
      ctx.moveTo(x + bw * 0.4, y - bh * 0.85); ctx.lineTo(x + bw * 0.85, y - bh * 1.3);
    } else {
      ctx.moveTo(x - bw * 0.45, y - bh * 0.8); ctx.lineTo(x - bw * 0.7, y - bh * 0.35);
      ctx.moveTo(x + bw * 0.45, y - bh * 0.8); ctx.lineTo(x + bw * 0.7, y - bh * 0.35);
    }
    ctx.stroke();
    ctx.fillStyle = '#FFC83D';
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.62, y - 1.6 * u);
    ctx.lineTo(x + bw * 0.62, y - 1.6 * u);
    ctx.lineTo(x + bw * 0.42, y - bh);
    ctx.quadraticCurveTo(x, y - bh - 1.2 * u, x - bw * 0.42, y - bh);
    ctx.closePath();
    ctx.fill();
    circ(ctx, x, y - bh - 1.5 * u, 2.1 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(150,90,0,0.28)';
    ctx.fillRect(x + 0.4 * u, y - bh - 1 * u, bw * 0.3, bh - 0.6 * u);
  }
  /* a white seed on its little parachute */
  function seed(ctx, x, y, s, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(1, s * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, s * 1.7);
    for (var k = -3; k <= 3; k++) { ctx.moveTo(0, 0); ctx.lineTo(Math.sin(k * 0.38) * s, -Math.cos(k * 0.38) * s * 0.9); }
    ctx.stroke();
    ctx.fillStyle = '#8A6A3A';
    ell(ctx, 0, s * 1.8, s * 0.16, s * 0.34);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- the first variants ---------- */
  function kite(ctx, W, H, t) {
    var u = W / 68;
    var cx = W * (0.6 + J.dx * 0.6), cy = H * (0.44 + J.dy * 0.5) + Math.sin(t * 0.9) * 1.2 * u;
    var a = Math.sin(t * 1.3) * 0.1 + J.rot * 0.4;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = Math.max(1, 0.35 * u);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx - 8 * u, cy + 14 * u, W * 0.24, H * 0.97);
    ctx.stroke();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(1, 0.4 * u);
    ctx.beginPath();
    ctx.moveTo(0, 8 * u);
    for (var i = 1; i <= 12; i++) ctx.lineTo(Math.sin(t * 3 + i * 0.7) * 1.6 * u * (i / 12), 8 * u + i * 0.9 * u);
    ctx.stroke();
    for (var b = 1; b <= 3; b++) {
      var bi = b * 3.6 / 0.9, by = 8 * u + b * 3.6 * u, bx = Math.sin(t * 3 + bi * 0.7) * 1.6 * u * (bi / 12);
      ctx.fillStyle = b % 2 ? '#FF5A5A' : '#FFD84D';
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx - 1.5 * u, by - 1 * u); ctx.lineTo(bx - 1.5 * u, by + 1 * u); ctx.closePath();
      ctx.moveTo(bx, by); ctx.lineTo(bx + 1.5 * u, by - 1 * u); ctx.lineTo(bx + 1.5 * u, by + 1 * u); ctx.closePath();
      ctx.fill();
    }
    var top = -6.5 * u, side = 4.8 * u, bot = 8 * u;
    var quads = [[[0, top], [side, 0], '#FF5A5A'], [[side, 0], [0, bot], '#FFD84D'], [[0, bot], [-side, 0], '#FF5A5A'], [[-side, 0], [0, top], '#FFD84D']];
    quads.forEach(function (q) {
      ctx.fillStyle = q[2];
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.closePath(); ctx.fill();
    });
    ctx.strokeStyle = 'rgba(70,40,30,0.55)';
    ctx.lineWidth = Math.max(1, 0.35 * u);
    ctx.beginPath();
    ctx.moveTo(0, top); ctx.lineTo(side, 0); ctx.lineTo(0, bot); ctx.lineTo(-side, 0); ctx.closePath();
    ctx.moveTo(0, top); ctx.lineTo(0, bot); ctx.moveTo(-side, 0); ctx.lineTo(side, 0);
    ctx.stroke();
    ctx.restore();
  }
  function balloon(ctx, W, H, t) {
    var u = W / 70, R = 7.5 * u;
    var cx = W * (0.42 - J.dx * 0.5) + Math.sin(t * 0.25) * 1.5 * u, cy = H * (0.45 + J.dy * 0.4) + Math.sin(t * 0.5) * 1.8 * u;
    var ty = cy + R * 1.42, tw = R * 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - tw, ty);
    ctx.quadraticCurveTo(cx - R * 1.05, cy + R * 0.62, cx - R, cy);
    ctx.arc(cx, cy, R, Math.PI, 0);
    ctx.quadraticCurveTo(cx + R * 1.05, cy + R * 0.62, cx + tw, ty);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#E8484A';
    ctx.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.8);
    ctx.fillStyle = '#FFD84D';
    ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.3, R * 0.68, R * 1.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#E8484A';
    ctx.beginPath(); ctx.ellipse(cx, cy + R * 0.3, R * 0.3, R * 1.5, 0, 0, TAU); ctx.fill();
    var hl = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.45, 0, cx - R * 0.45, cy - R * 0.45, R * 1.3);
    hl.addColorStop(0, 'rgba(255,255,255,0.38)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.8);
    ctx.fillStyle = 'rgba(60,20,30,0.18)';
    ctx.fillRect(cx + R * 0.35, cy - R * 1.2, R, R * 2.8);
    ctx.restore();
    var bt = ty + 2.8 * u;
    ctx.strokeStyle = 'rgba(60,40,30,0.8)';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ctx.beginPath();
    ctx.moveTo(cx - tw * 0.9, ty); ctx.lineTo(cx - 1.4 * u, bt);
    ctx.moveTo(cx + tw * 0.9, ty); ctx.lineTo(cx + 1.4 * u, bt);
    ctx.stroke();
    ctx.fillStyle = '#9A6634';
    roundRect(ctx, cx - 1.7 * u, bt, 3.4 * u, 2.6 * u, 0.5 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(60,30,10,0.35)';
    ctx.fillRect(cx - 1.7 * u, bt + 1 * u, 3.4 * u, 0.4 * u);
    ctx.restore();
  }
  function birds(ctx, W, H, t) {
    var u = W / 70, r = sr(301);
    var bx = W * (0.5 + J.dx * 0.4) + Math.sin(t * 0.3) * 2 * u, by = H * (0.45 + J.dy * 0.4);
    ctx.save();
    ctx.strokeStyle = 'rgba(28,34,54,0.88)';
    ctx.lineWidth = Math.max(1, 0.6 * u);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var flock = [[0, 0], [-6, 3.2], [6.5, 2.6], [-11.5, 6.6], [12, 5.8]];
    for (var i = 0; i < flock.length; i++) {
      var x = bx + (flock[i][0] + (r() - 0.5) * 2.4) * u, y = by + (flock[i][1] + (r() - 0.5) * 2) * u + Math.sin(t * 0.8 + i) * 0.8 * u;
      var s = (2.2 + r() * 1.4) * u, wy = s * 0.4 * Math.sin(t * 7 + i * 1.7);
      ctx.beginPath();
      ctx.moveTo(x - s, y + wy);
      ctx.quadraticCurveTo(x - s * 0.45, y - s * 0.5, x, y);
      ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.5, x + s, y + wy);
      ctx.stroke();
    }
    ctx.restore();
  }
  function shooting(ctx, W, H, t) {
    var u = W / 100;
    var hx = W * (0.4 + J.dx * 0.4), hy = H * (0.45 + J.dy * 0.3);
    var ang = -0.5 + J.rot * 0.3, L = 32 * u;
    var tx = hx + Math.cos(ang) * L, ty = hy + Math.sin(ang) * L;
    var nx = -Math.sin(ang) * 0.9 * u, ny = Math.cos(ang) * 0.9 * u;
    var g = ctx.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(190,215,255,0.5)');
    g.addColorStop(1, 'rgba(190,215,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(hx + nx, hy + ny); ctx.lineTo(tx, ty); ctx.lineTo(hx - nx, hy - ny); ctx.closePath();
    ctx.fill();
    var tw = 0.8 + 0.2 * Math.sin(t * 5);
    var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 6 * u);
    hg.addColorStop(0, 'rgba(255,255,255,' + 0.8 * tw + ')');
    hg.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(hx, hy, 6 * u, 0, TAU); ctx.fill();
    star4(ctx, hx, hy, 3.4 * u * tw, 'rgba(255,255,255,0.98)');
  }
  /* the seven bright stars of the Plough, with the bowl on the left */
  var PLOUGH = [[0, 0], [0.05, 0.42], [0.55, 0.5], [0.58, 0.12], [0.95, 0.02], [1.28, -0.03], [1.62, 0.2]];
  function plough(ctx, W, H, t) {
    var u = W / 100, sc = 21 * u;
    ctx.save();
    ctx.translate(W * (0.25 + J.dx * 0.25), H * (0.42 + J.dy * 0.3));
    ctx.rotate(J.rot * 0.6 - 0.1);
    var P = PLOUGH.map(function (p) { return [p[0] * sc, p[1] * sc]; });
    ctx.strokeStyle = 'rgba(190,205,255,0.4)';
    ctx.lineWidth = Math.max(1, 0.35 * u);
    ctx.beginPath();
    ctx.moveTo(P[0][0], P[0][1]);
    [1, 2, 3, 0].forEach(function (i) { ctx.lineTo(P[i][0], P[i][1]); });
    ctx.moveTo(P[3][0], P[3][1]);
    [4, 5, 6].forEach(function (i) { ctx.lineTo(P[i][0], P[i][1]); });
    ctx.stroke();
    P.forEach(function (p, i) {
      var tw = 0.75 + 0.25 * Math.sin(t * (1.6 + i * 0.3) + i * 2);
      var g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 3.2 * u);
      g.addColorStop(0, 'rgba(255,255,255,' + 0.6 * tw + ')');
      g.addColorStop(1, 'rgba(200,215,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p[0], p[1], 3.2 * u, 0, TAU); ctx.fill();
      star4(ctx, p[0], p[1], 2.1 * u * tw, 'rgba(255,255,255,0.98)');
    });
    ctx.restore();
  }
  /* ball lightning: a glowing ball that floats low in a thunderstorm, crackling */
  function ballL(ctx, W, H, t) {
    var u = W / 100;
    var x = W * (0.46 + J.dx * 0.6) + Math.sin(t * 0.9) * 4 * u, y = H * (0.62 + J.dy * 0.4) + Math.sin(t * 1.7) * 2.5 * u;
    var pulse = 0.88 + 0.12 * Math.sin(t * 11) * Math.sin(t * 3.1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 0, x, y, 17 * u);
    g.addColorStop(0, 'rgba(255,255,255,' + 0.95 * pulse + ')');
    g.addColorStop(0.16, 'rgba(205,222,255,' + 0.8 * pulse + ')');
    g.addColorStop(0.42, 'rgba(140,150,255,' + 0.3 * pulse + ')');
    g.addColorStop(1, 'rgba(120,120,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 17 * u, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(225,232,255,0.9)';
    ctx.lineWidth = Math.max(1, 0.5 * u);
    ctx.lineJoin = 'round';
    var r = rng((Math.floor(t * 8) * 31 + (SALT || 7)) >>> 0);
    for (var i = 0; i < 5; i++) {
      var a = r() * TAU, r0 = 4.5 * u, r1 = (8 + r() * 5) * u, ja = a + (r() - 0.5) * 0.7;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(ja) * (r0 + r1) / 2, y + Math.sin(ja) * (r0 + r1) / 2);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }
  /* a red sprite: a giant red flash that hangs over a thunderstorm like a jellyfish */
  function sprite(ctx, W, H, t) {
    var u = W / 76;
    var cx = W * (0.5 + J.dx * 0.5), cy = H * (0.36 + J.dy * 0.2);
    var a = 0.6 + 0.3 * Math.max(0, Math.sin(t * 1.7 + J.f));
    ctx.save();
    var g = ctx.createRadialGradient(cx, cy + 3 * u, 0, cx, cy + 3 * u, 14 * u);
    g.addColorStop(0, 'rgba(255,80,110,' + 0.55 * a + ')');
    g.addColorStop(1, 'rgba(255,60,100,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy + 3 * u, 14 * u, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,120,150,' + a + ')';
    ctx.lineCap = 'round';
    for (var i = 0; i < 7; i++) {
      var f = (i - 3) / 3, x0 = cx + f * 6 * u, len = (8 + (3 - Math.abs(i - 3)) * 2.2) * u;
      ctx.lineWidth = Math.max(1, (0.9 - Math.abs(f) * 0.3) * u);
      ctx.beginPath();
      ctx.moveTo(x0, cy);
      ctx.quadraticCurveTo(x0 + f * 1.5 * u + Math.sin(t * 2 + i) * 0.7 * u, cy + len * 0.5, x0 + f * 2.8 * u, cy + len);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0, cy);
      ctx.lineTo(x0 + f * 0.8 * u, cy - (2.5 + (3 - Math.abs(i - 3)) * 0.8) * u);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,150,170,' + a + ')';
    ctx.beginPath(); ctx.ellipse(cx, cy, 7.5 * u, 1.8 * u, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  /* an umbrella blown inside out, tumbling past */
  function flyaway(ctx, W, H, t) {
    var u = W / 66, R = 6.5 * u;
    var x = W * (0.52 + J.dx * 0.4) + Math.sin(t * 0.7) * 5 * u, y = H * (0.5 + J.dy * 0.3) + Math.sin(t * 1.4) * 2.5 * u;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 1.6 + J.rot * 4);
    ctx.fillStyle = '#FFC83D';
    ctx.beginPath();
    ctx.moveTo(-R, -R * 0.85);
    ctx.quadraticCurveTo(-R * 0.2, R * 0.2, 0, 0);
    ctx.quadraticCurveTo(R * 0.2, R * 0.2, R, -R * 0.85);
    ctx.quadraticCurveTo(0, -R * 0.25, -R, -R * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(190,110,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(-R * 0.55, -R * 0.62);
    ctx.quadraticCurveTo(-R * 0.15, -R * 0.1, 0, -R * 0.02);
    ctx.quadraticCurveTo(-R * 0.1, -R * 0.38, -R * 0.55, -R * 0.62);
    ctx.fill();
    ctx.strokeStyle = '#2A3040';
    ctx.lineWidth = Math.max(1, 0.45 * u);
    ctx.lineCap = 'round';
    ctx.beginPath();
    [-1, -0.5, 0.5, 1].forEach(function (f) { ctx.moveTo(0, -R * 0.05); ctx.lineTo(f * R * 1.05, -R * (0.9 + Math.abs(f) * 0.05)); });
    ctx.moveTo(0, -R * 0.5);
    ctx.lineTo(0, R * 1.5);
    ctx.arc(-0.9 * u, R * 1.5, 0.9 * u, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }
  function ripples(ctx, W, H, t) {
    var u = W / 100;
    [[0.36 + J.dx * 0.3, 0.9, 13], [0.66 + J.dx * 0.3, 0.935, 10]].forEach(function (p, j) {
      var x = p[0] * W, y = p[1] * H, rx = p[2] * u;
      ctx.fillStyle = 'rgba(190,215,250,0.34)';
      ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.24, 0, 0, TAU); ctx.fill();
      ctx.lineWidth = Math.max(1.2, 0.6 * u);
      for (var i = 0; i < 3; i++) {
        var ph = (t * 0.7 + i / 3 + j * 0.37) % 1, rr = rx * (0.15 + ph * 0.8);
        ctx.strokeStyle = 'rgba(235,244,255,' + (0.9 * (1 - ph)) + ')';
        ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.24, 0, 0, TAU); ctx.stroke();
      }
      var sp = (t * 1.3 + j * 0.5) % 1;
      ctx.fillStyle = 'rgba(235,244,255,' + (0.9 * (1 - sp)) + ')';
      [-1, 1].forEach(function (d) {
        ctx.beginPath(); ctx.arc(x + d * (0.8 + sp * 2) * u, y - Math.sin(sp * Math.PI) * 4 * u, 0.6 * u, 0, TAU); ctx.fill();
      });
    });
  }
  /* someone in a yellow raincoat under a red umbrella */
  function umbrella(ctx, W, H, t) {
    var u = W / 62, f = 0.44 + J.dx * 0.4;
    var x = f * W, gy = standY(f) * H;
    var bh = 8 * u, bw = 4.8 * u;
    ctx.save();
    ctx.fillStyle = '#26304A';
    roundRect(ctx, x - 1.9 * u, gy - 1.7 * u, 1.6 * u, 1.7 * u, 0.4 * u); ctx.fill();
    roundRect(ctx, x + 0.3 * u, gy - 1.7 * u, 1.6 * u, 1.7 * u, 0.4 * u); ctx.fill();
    ctx.fillStyle = '#FFC83D';
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.62, gy - 1.4 * u);
    ctx.lineTo(x + bw * 0.62, gy - 1.4 * u);
    ctx.lineTo(x + bw * 0.42, gy - bh);
    ctx.quadraticCurveTo(x, gy - bh - 1.2 * u, x - bw * 0.42, gy - bh);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.arc(x, gy - bh - 1.5 * u, 2.1 * u, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(150,90,0,0.28)';
    ctx.fillRect(x + 0.4 * u, gy - bh - 1 * u, bw * 0.3, bh - 0.4 * u);
    var sway = Math.sin(t * 1.1) * 0.05;
    ctx.translate(x + 1.6 * u, gy - bh * 0.5);
    ctx.rotate(sway - 0.1);
    var top = -bh * 0.5 - 7 * u, R = 7.5 * u;
    ctx.strokeStyle = '#2A3040';
    ctx.lineWidth = Math.max(1, 0.55 * u);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 1.4 * u); ctx.lineTo(0, top - R * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-0.8 * u, 1.4 * u, 0.8 * u, 0, Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#E63B3B';
    ctx.beginPath();
    ctx.moveTo(-R, top);
    ctx.quadraticCurveTo(-R, top - R * 0.72, 0, top - R * 0.72);
    ctx.quadraticCurveTo(R, top - R * 0.72, R, top);
    for (var i = 0; i < 4; i++) {
      var x1 = R - (i + 1) * R / 2, xm = R - (i + 0.5) * R / 2;
      ctx.quadraticCurveTo(xm, top - R * 0.2, x1, top);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,10,20,0.4)';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ctx.beginPath();
    [-0.5, 0, 0.5].forEach(function (q) { ctx.moveTo(0, top - R * 0.72); ctx.lineTo(q * R, top - R * 0.08); });
    ctx.stroke();
    ctx.restore();
  }
  function snowman(ctx, W, H, t) {
    var u = W / 70, f = 0.6 + J.dx * 0.3;
    var x = f * W, gy = standY(f) * H;
    var r1 = 5 * u, r2 = 3.6 * u, r3 = 2.7 * u;
    var y1 = gy - r1 * 0.85, y2 = y1 - r1 * 0.8 - r2 * 0.72, y3 = y2 - r2 * 0.8 - r3 * 0.78;
    ctx.save();
    ctx.strokeStyle = '#6B4A2B';
    ctx.lineWidth = Math.max(1, 0.5 * u);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r2 * 0.8, y2); ctx.lineTo(x - r2 * 2, y2 - r2 * 0.7);
    ctx.moveTo(x - r2 * 1.6, y2 - r2 * 0.45); ctx.lineTo(x - r2 * 1.85, y2 - r2 * 1.05);
    ctx.moveTo(x + r2 * 0.8, y2); ctx.lineTo(x + r2 * 2, y2 - r2 * 0.5 + Math.sin(t * 2) * 0.5 * u);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(100,118,155,0.6)';
    ctx.lineWidth = Math.max(1, 0.35 * u);
    [[y1, r1], [y2, r2], [y3, r3]].forEach(function (b) {
      var g = ctx.createRadialGradient(x - b[1] * 0.35, b[0] - b[1] * 0.35, b[1] * 0.1, x, b[0], b[1]);
      g.addColorStop(0, '#FFFFFF');
      g.addColorStop(1, '#D0D9EA');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, b[0], b[1], 0, TAU); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = '#E23D3D';
    roundRect(ctx, x - r3 * 1.05, y3 + r3 * 0.62, r3 * 2.1, r3 * 0.52, r3 * 0.2); ctx.fill();
    ctx.fillRect(x + r3 * 0.35, y3 + r3 * 0.9, r3 * 0.48, r3 * 1.15);
    ctx.fillStyle = '#1F2433';
    [-0.38, 0.38].forEach(function (d) { ctx.beginPath(); ctx.arc(x + d * r3, y3 - r3 * 0.18, 0.36 * u, 0, TAU); ctx.fill(); });
    [0.1, 0.55].forEach(function (d) { ctx.beginPath(); ctx.arc(x, y2 - r2 * 0.25 + d * r2, 0.34 * u, 0, TAU); ctx.fill(); });
    ctx.fillRect(x - r3 * 1.15, y3 - r3 * 0.88, r3 * 2.3, r3 * 0.3);
    ctx.fillRect(x - r3 * 0.72, y3 - r3 * 1.8, r3 * 1.44, r3 * 0.98);
    ctx.fillStyle = '#FF8A2B';
    ctx.beginPath(); ctx.moveTo(x, y3 + r3 * 0.02); ctx.lineTo(x + r3 * 0.95, y3 + r3 * 0.2); ctx.lineTo(x, y3 + r3 * 0.34); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function crystals(ctx, W, H, t) {
    var u = W / 72, r = sr(311);
    var spots = [[0.32, 0.42], [0.64, 0.5], [0.4, 0.68]];
    for (var i = 0; i < 3; i++) {
      var x = W * (spots[i][0] + (r() - 0.5) * 0.12), y = H * (spots[i][1] + (r() - 0.5) * 0.08) + Math.sin(t * 0.6 + i * 1.9) * 1.5 * u;
      var s = (3.4 + r() * 2.4) * u, a = t * 0.25 * (i % 2 ? 1 : -1) + r() * TAU;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.4);
      g.addColorStop(0, 'rgba(225,242,255,0.6)');
      g.addColorStop(1, 'rgba(225,242,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, s * 1.4, 0, TAU); ctx.fill();
      ctx.beginPath();
      for (var j = 0; j < 6; j++) {
        var an = j * Math.PI / 3, c = Math.cos(an), sn = Math.sin(an);
        ctx.moveTo(0, 0); ctx.lineTo(c * s, sn * s);
        var bx = c * s * 0.55, by = sn * s * 0.55, bl = s * 0.32;
        ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(an + 0.8) * bl, by + Math.sin(an + 0.8) * bl);
        ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(an - 0.8) * bl, by + Math.sin(an - 0.8) * bl);
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(80,120,185,0.55)';
      ctx.lineWidth = Math.max(1.5, 1.1 * u);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.98)';
      ctx.lineWidth = Math.max(1, 0.5 * u);
      ctx.stroke();
      ctx.restore();
    }
  }
  /* a red and white windsock that streams out straighter the stronger the wind */
  function windsock(ctx, W, H, t) {
    var u = W / 76, f = 0.26 + J.dx * 0.2;
    var x = f * W, gy = standY(f) * H, top = gy - 24 * u;
    var droop = Math.max(0, 0.38 - (scene.wind ? scene.wind.speed : 0.5) * 0.25);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(30,36,56,0.45)';
    ctx.lineWidth = Math.max(2, 1.3 * u);
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, top - 1 * u); ctx.stroke();
    ctx.strokeStyle = '#EEF1F6';
    ctx.lineWidth = Math.max(1, 0.8 * u);
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, top - 1 * u); ctx.stroke();
    var L = 17 * u, n = 5, pts = [];
    for (var i = 0; i <= n; i++) {
      var q = i / n;
      pts.push([x + Math.cos(droop * q) * L * q, top + 1.2 * u + Math.sin(droop * q) * L * q + Math.sin(t * 8 - i * 1.1) * 0.6 * u * q, (4.4 + (1.8 - 4.4) * q) * u / 2]);
    }
    for (var b = 0; b < n; b++) {
      var p0 = pts[b], p1 = pts[b + 1];
      ctx.fillStyle = b % 2 ? '#F4F6FA' : '#F2552C';
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1] - p0[2]); ctx.lineTo(p1[0], p1[1] - p1[2]); ctx.lineTo(p1[0], p1[1] + p1[2]); ctx.lineTo(p0[0], p0[1] + p0[2]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(40,30,40,0.35)';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1] - pts[0][2]);
    pts.forEach(function (p) { ctx.lineTo(p[0], p[1] - p[2]); });
    for (var j = n; j >= 0; j--) ctx.lineTo(pts[j][0], pts[j][1] + pts[j][2]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  /* an old street lamp, with dusk falling in the jar */
  function lamp(ctx, W, H, t) {
    var u = W / 76, f = 0.34 + J.dx * 0.3;
    var x = f * W, gy = standY(f) * H, top = gy - 26 * u;
    ctx.save();
    ctx.fillStyle = 'rgba(20,26,56,0.34)';
    ctx.fillRect(0, 0, W, H);
    if (kind === 'sea') {
      ctx.fillStyle = '#3B4256';
      ctx.fillRect(0, gy, W, H - gy);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(0, gy, W, 0.6 * u);
    }
    var fl = 0.92 + 0.08 * Math.sin(t * 9) * Math.sin(t * 3.3);
    var g = ctx.createRadialGradient(x, top, 0, x, top, 22 * u);
    g.addColorStop(0, 'rgba(255,216,140,' + 0.8 * fl + ')');
    g.addColorStop(0.3, 'rgba(255,196,110,' + 0.3 * fl + ')');
    g.addColorStop(1, 'rgba(255,196,110,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, top, 22 * u, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,140,' + 0.25 * fl + ')';
    ctx.beginPath(); ctx.ellipse(x, gy, 11 * u, 2 * u, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1E2433';
    ctx.fillRect(x - 0.6 * u, top + 2 * u, 1.2 * u, gy - top - 2 * u);
    ctx.fillRect(x - 1.5 * u, gy - 2.2 * u, 3 * u, 2.2 * u);
    ctx.beginPath();
    ctx.moveTo(x - 2.4 * u, top - 2.6 * u); ctx.lineTo(x + 2.4 * u, top - 2.6 * u); ctx.lineTo(x + 1.5 * u, top + 2.2 * u); ctx.lineTo(x - 1.5 * u, top + 2.2 * u);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 3 * u, top - 2.4 * u); ctx.lineTo(x + 3 * u, top - 2.4 * u); ctx.lineTo(x, top - 5 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,238,185,' + fl + ')';
    ctx.beginPath();
    ctx.moveTo(x - 1.6 * u, top - 1.8 * u); ctx.lineTo(x + 1.6 * u, top - 1.8 * u); ctx.lineTo(x + 1 * u, top + 1.5 * u); ctx.lineTo(x - 1 * u, top + 1.5 * u);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  /* will-o'-the-wisps: little lights that drift over the ground on a misty night */
  function wisps(ctx, W, H, t) {
    var u = W / 70, r = sr(321);
    ctx.save();
    ctx.fillStyle = 'rgba(10,18,42,0.46)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 5; i++) {
      var x = W * (0.24 + (i / 4) * 0.52 + (r() - 0.5) * 0.1) + Math.sin(t * 0.5 + i * 2.1) * 2 * u;
      var y = H * (0.56 + r() * 0.3) + Math.sin(t * 0.8 + i * 1.3) * 2 * u;
      var a = 0.65 + 0.35 * Math.sin(t * (1.3 + r()) + i * 2), rad = (4 + r() * 2) * u;
      var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(180,255,235,' + 0.95 * a + ')');
      g.addColorStop(0.25, 'rgba(90,225,205,' + 0.5 * a + ')');
      g.addColorStop(1, 'rgba(60,180,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- sun ---------- */

  function sunflowers(ctx, W, H, t) {
    var u = W / 70;
    [[0.3, 15, 0], [0.47, 20, 1], [0.66, 13, 2]].forEach(function (p) {
      var f = p[0] + J.dx * 0.25, x = f * W, gy = standY(f) * H, h = p[1] * u, i = p[2];
      var sway = Math.sin(t * 1.2 + i * 1.7) * 0.06;
      var hx = x + Math.sin(sway) * h, hy = gy - Math.cos(sway) * h;
      ctx.strokeStyle = '#3E7D3A';
      ctx.lineWidth = Math.max(1.5, 0.8 * u);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.quadraticCurveTo(x, gy - h * 0.5, hx, hy); ctx.stroke();
      ctx.fillStyle = '#4E9A45';
      ell(ctx, x + 1.7 * u, gy - h * 0.38, 1.9 * u, 0.8 * u, -0.5); ctx.fill();
      ell(ctx, x - 1.7 * u, gy - h * 0.56, 1.7 * u, 0.7 * u, 0.5); ctx.fill();
      var R = (i === 1 ? 3.6 : 3.1) * u;
      ctx.fillStyle = '#FFC93C';
      for (var k = 0; k < 12; k++) {
        var a = k / 12 * TAU + sway;
        ell(ctx, hx + Math.cos(a) * R * 0.72, hy + Math.sin(a) * R * 0.72, R * 0.46, R * 0.2, a);
        ctx.fill();
      }
      ctx.fillStyle = '#6B3E1E';
      circ(ctx, hx, hy, R * 0.44); ctx.fill();
      ctx.fillStyle = 'rgba(30,15,5,0.5)';
      for (var d = 0; d < 5; d++) { circ(ctx, hx + Math.cos(d * 1.3) * R * 0.22, hy + Math.sin(d * 1.3) * R * 0.22, R * 0.06); ctx.fill(); }
    });
  }
  function plane(ctx, W, H, t) {
    var u = W / 40;
    var x = W * (0.62 + J.dx * 0.3) + Math.sin(t * 0.2) * u, y = H * (0.38 + J.dy * 0.25);
    var a = -0.3 + J.rot * 0.2, c = Math.cos(a), s = Math.sin(a), L = 30 * u;
    [-0.55, 0.55].forEach(function (o) {
      var sx = x - c * 2.2 * u - s * o * u, sy = y - s * 2.2 * u + c * o * u;
      var g = ctx.createLinearGradient(sx, sy, sx - c * L, sy - s * L);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(1.2, 0.55 * u);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - c * L - s * o * u, sy - s * L + c * o * u); ctx.stroke();
    });
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(70,84,110,0.55)';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ctx.fillStyle = '#F7F8FB';
    tri(ctx, -0.4 * u, 0, -1.4 * u, -2.6 * u, 0.6 * u, 0); ctx.fill(); ctx.stroke();
    tri(ctx, -0.4 * u, 0, -1.4 * u, 2.6 * u, 0.6 * u, 0); ctx.fill(); ctx.stroke();
    ell(ctx, 0, 0, 2.7 * u, 0.5 * u); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#E63B3B';
    tri(ctx, -2.3 * u, 0, -2.9 * u, -1.1 * u, -2 * u, 0); ctx.fill();
    tri(ctx, -2.3 * u, 0, -2.9 * u, 1.1 * u, -2 * u, 0); ctx.fill();
    ctx.fillStyle = '#3D6FB8';
    ell(ctx, 1.9 * u, -0.12 * u, 0.5 * u, 0.2 * u); ctx.fill();
    ctx.restore();
  }
  function butterflies(ctx, W, H, t) {
    var u = W / 46, r = sr(331);
    var cols = [['#FF8A2B', '#B5470B'], ['#4DA3FF', '#1D5FBF'], ['#FF6FAE', '#B0306A']];
    for (var i = 0; i < 3; i++) {
      var bx = W * (0.3 + i * 0.2 + (r() - 0.5) * 0.08 + J.dx * 0.2), by = H * (0.42 + r() * 0.22 + J.dy * 0.2);
      var x = bx + Math.sin(t * 0.7 + i * 2) * 3 * u, y = by + Math.sin(t * 1.1 + i) * 2 * u;
      var fl = 0.35 + 0.65 * Math.abs(Math.cos(t * 7 + i * 1.3));
      var c = cols[i];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t + i) * 0.25);
      [-1, 1].forEach(function (side) {
        ctx.save();
        ctx.scale(side * fl, 1);
        ctx.fillStyle = c[0];
        ell(ctx, 1.6 * u, -1.1 * u, 1.7 * u, 1.3 * u, -0.5); ctx.fill();
        ctx.strokeStyle = c[1];
        ctx.lineWidth = Math.max(1, 0.3 * u);
        ctx.stroke();
        ctx.fillStyle = c[0];
        ell(ctx, 1.2 * u, 1.05 * u, 1.15 * u, 0.95 * u, 0.5); ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        circ(ctx, 2.1 * u, -1.3 * u, 0.35 * u); ctx.fill();
        ctx.restore();
      });
      ctx.fillStyle = '#2A2230';
      ell(ctx, 0, 0, 0.35 * u, 1.6 * u); ctx.fill();
      ctx.strokeStyle = '#2A2230';
      ctx.lineWidth = Math.max(1, 0.2 * u);
      ctx.beginPath(); ctx.moveTo(0, -1.4 * u); ctx.lineTo(-0.7 * u, -2.6 * u); ctx.moveTo(0, -1.4 * u); ctx.lineTo(0.7 * u, -2.6 * u); ctx.stroke();
      ctx.restore();
    }
  }
  function seeds(ctx, W, H, t) {
    var u = W / 54, r = sr(341);
    var f = 0.3 + J.dx * 0.25, x = f * W, gy = standY(f) * H, h = 12 * u, top = gy - h;
    ctx.strokeStyle = '#5D8F4E';
    ctx.lineWidth = Math.max(1, 0.5 * u);
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.quadraticCurveTo(x + u, gy - h * 0.5, x, top); ctx.stroke();
    glow(ctx, x, top, 4.6 * u, [255, 255, 255], 0.5);
    for (var k = 0; k < 22; k++) {
      var a = k / 22 * TAU;
      seed(ctx, x + Math.cos(a) * 0.4 * u, top + Math.sin(a) * 0.4 * u, 1.5 * u, a + Math.PI / 2);
    }
    for (var i = 0; i < 7; i++) {
      var p = (t * 0.05 + i / 7) % 1;
      var sx = x + p * 0.5 * W + Math.sin(t * 1.3 + i * 2) * 2 * u + (r() - 0.5) * 5 * u;
      var sy = top - p * 0.36 * H + (r() - 0.5) * 5 * u;
      seed(ctx, sx, sy, 1.7 * u, Math.sin(t + i) * 0.4);
    }
  }
  /* legendary: the green flash, a green spark on top of the sun just as it sets */
  function greenflash(ctx, W, H, t) {
    var u = W / 70;
    var g = ctx.createLinearGradient(0, 0, 0, H * 0.85);
    g.addColorStop(0, 'rgba(40,46,120,0.5)');
    g.addColorStop(0.55, 'rgba(240,110,70,0.45)');
    g.addColorStop(1, 'rgba(255,190,90,0.65)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    var x = W * (0.5 + J.dx * 0.4), y = H * 0.79, R = 8 * u;
    var a = 0.8 + 0.2 * Math.sin(t * 3);
    glow(ctx, x, y, R * 3.4, [255, 170, 90], 0.55);
    glow(ctx, x, y - R * 1.05, R * 1.7, [80, 255, 140], 0.6 * a);
    var sg = ctx.createLinearGradient(0, y - R, 0, y + R);
    sg.addColorStop(0, '#FFE08A');
    sg.addColorStop(1, '#FF6A3D');
    ctx.fillStyle = sg;
    circ(ctx, x, y, R); ctx.fill();
    ctx.strokeStyle = 'rgba(60,240,120,' + (0.9 * a) + ')';
    ctx.lineWidth = 1.3 * u;
    ctx.beginPath(); ctx.arc(x, y, R, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    ctx.fillStyle = 'rgba(110,255,160,' + a + ')';
    ell(ctx, x, y - R - 0.5 * u, R * 0.42, 0.75 * u); ctx.fill();
  }

  /* ---------- rain ---------- */

  function duck(ctx, x, y, u, dir) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = '#FFD23F';
    ell(ctx, 0, 0, 2.2 * u, 1.4 * u); ctx.fill();
    circ(ctx, 1.5 * u, -1.6 * u, 1.05 * u); ctx.fill();
    tri(ctx, -2.1 * u, -0.2 * u, -3 * u, -1.1 * u, -1.6 * u, -0.8 * u); ctx.fill();
    ctx.fillStyle = '#FF8A2B';
    tri(ctx, 2.4 * u, -1.75 * u, 3.4 * u, -1.45 * u, 2.4 * u, -1.15 * u); ctx.fill();
    ctx.fillStyle = '#1F2433';
    circ(ctx, 1.8 * u, -1.85 * u, 0.22 * u); ctx.fill();
    ctx.fillStyle = 'rgba(200,140,0,0.35)';
    ell(ctx, -0.3 * u, 0.05 * u, 1.1 * u, 0.6 * u, -0.2); ctx.fill();
    ctx.restore();
  }
  function ducklings(ctx, W, H, t) {
    var u = W / 50;
    var cx = W * (0.5 + J.dx * 0.25), cy = H * 0.905;
    pond(ctx, cx, cy, 16 * u, 3.6 * u, t);
    for (var i = 0; i < 3; i++) {
      var x = cx + (i - 1) * 6.4 * u + Math.sin(t * 0.5 + i) * u, y = cy - 0.7 * u + Math.sin(t * 2 + i * 1.5) * 0.3 * u;
      duck(ctx, x, y, (i === 0 ? 1.15 : 0.95) * u, 1);
    }
    ctx.fillStyle = 'rgba(120,160,210,0.4)';
    ctx.fillRect(cx - 14 * u, cy + 0.15 * u, 28 * u, 0.6 * u);
  }
  function boat(ctx, W, H, t) {
    var u = W / 46;
    var cx = W * (0.54 + J.dx * 0.25), cy = H * 0.905;
    pond(ctx, cx, cy, 14 * u, 3.4 * u, t);
    ctx.save();
    ctx.translate(cx + Math.sin(t * 0.4) * 2 * u, cy - 0.8 * u + Math.sin(t * 1.6) * 0.4 * u);
    ctx.rotate(Math.sin(t * 1.2) * 0.06);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(70,85,115,0.7)';
    ctx.lineWidth = Math.max(1, 0.25 * u);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(-5 * u, -1.6 * u); ctx.lineTo(5 * u, -1.6 * u); ctx.lineTo(3.4 * u, 0.7 * u); ctx.lineTo(-3.4 * u, 0.7 * u); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#EEF1F6';
    tri(ctx, -3 * u, -1.6 * u, 0, -6.2 * u, 3 * u, -1.6 * u); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(120,135,165,0.35)';
    tri(ctx, 0, -6.2 * u, 3 * u, -1.6 * u, 0, -1.6 * u); ctx.fill();
    ctx.restore();
  }
  function frog(ctx, W, H, t) {
    var u = W / 44;
    var f = 0.62 + J.dx * 0.25, x = f * W, gy = standY(f) * H;
    var breathe = 1 + Math.sin(t * 2.5) * 0.03;
    ctx.save();
    ctx.translate(x, gy);
    ctx.fillStyle = '#3E9B3E';
    ell(ctx, -2.7 * u, -1.2 * u, 2.1 * u, 1.3 * u, -0.3); ctx.fill();
    ell(ctx, 2.7 * u, -1.2 * u, 2.1 * u, 1.3 * u, 0.3); ctx.fill();
    ctx.fillStyle = '#56C25A';
    ell(ctx, 0, -2.5 * u, 3.4 * u * breathe, 2.6 * u); ctx.fill();
    ctx.fillStyle = '#C9EFA9';
    ell(ctx, 0, -1.6 * u, 2 * u, 1.4 * u); ctx.fill();
    var blink = (t % 3.7) < 0.12;
    [-1.6, 1.6].forEach(function (ex) {
      ctx.fillStyle = '#56C25A';
      circ(ctx, ex * u, -4.7 * u, 1.35 * u); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      if (blink) ell(ctx, ex * u, -4.7 * u, 0.9 * u, 0.15 * u); else circ(ctx, ex * u, -4.8 * u, 0.9 * u);
      ctx.fill();
      if (!blink) { ctx.fillStyle = '#1F2433'; circ(ctx, ex * u + 0.1 * u, -4.7 * u, 0.45 * u); ctx.fill(); }
    });
    ctx.strokeStyle = '#2C6E2C';
    ctx.lineWidth = Math.max(1, 0.25 * u);
    ctx.beginPath(); ctx.arc(0, -3.6 * u, 1.6 * u, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#3E9B3E';
    ell(ctx, -1.6 * u, -0.3 * u, 1 * u, 0.45 * u); ctx.fill();
    ell(ctx, 1.6 * u, -0.3 * u, 1 * u, 0.45 * u); ctx.fill();
    ctx.restore();
  }
  function snail(ctx, W, H, t) {
    var u = W / 48;
    var f = 0.42 + J.dx * 0.25, x = f * W, gy = standY(f) * H;
    ctx.save();
    ctx.translate(x, gy);
    ctx.fillStyle = '#CDB89C';
    roundRect(ctx, -4.6 * u, -1.5 * u, 9.6 * u, 1.5 * u, 0.7 * u); ctx.fill();
    ell(ctx, 4.6 * u, -2 * u, 1.1 * u, 1.5 * u, 0.3); ctx.fill();
    ctx.strokeStyle = '#B09A7C';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ctx.lineCap = 'round';
    var w = Math.sin(t * 2) * 0.3 * u;
    ctx.beginPath();
    ctx.moveTo(4.7 * u, -3.2 * u); ctx.lineTo(4.6 * u + w, -5.4 * u);
    ctx.moveTo(5.2 * u, -3.1 * u); ctx.lineTo(6.1 * u - w, -5 * u);
    ctx.stroke();
    ctx.fillStyle = '#3A2A1A';
    circ(ctx, 4.6 * u + w, -5.5 * u, 0.35 * u); ctx.fill();
    circ(ctx, 6.1 * u - w, -5.1 * u, 0.35 * u); ctx.fill();
    var sx = -0.6 * u, sy = -3.9 * u, R = 3.4 * u;
    var g = ctx.createRadialGradient(sx - R * 0.3, sy - R * 0.3, R * 0.1, sx, sy, R);
    g.addColorStop(0, '#E8954A');
    g.addColorStop(1, '#B4581E');
    ctx.fillStyle = g;
    circ(ctx, sx, sy, R); ctx.fill();
    ctx.strokeStyle = '#6E3410';
    ctx.lineWidth = Math.max(1, 0.35 * u);
    ctx.beginPath();
    for (var a = 0; a <= Math.PI * 4.2; a += 0.15) {
      var rr = R * 0.9 * (1 - a / (Math.PI * 4.6));
      var px = sx + Math.cos(a + 1) * rr, py = sy + Math.sin(a + 1) * rr;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }
  function cat(ctx, u, col) {
    ctx.fillStyle = col;
    ell(ctx, 0, 0, 2.2 * u, 1.4 * u); ctx.fill();
    circ(ctx, 2.2 * u, -0.9 * u, 1.25 * u); ctx.fill();
    tri(ctx, 1.3 * u, -1.6 * u, 1.6 * u, -3 * u, 2.3 * u, -1.9 * u); ctx.fill();
    tri(ctx, 2.4 * u, -2 * u, 3.2 * u, -2.9 * u, 3.3 * u, -1.5 * u); ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.7 * u;
    ctx.beginPath();
    [-1.3, -0.4, 0.7, 1.5].forEach(function (lx, k) { ctx.moveTo(lx * u, 0.9 * u); ctx.lineTo(lx * u + (k % 2 ? 0.6 : -0.6) * u, 2.2 * u); });
    ctx.stroke();
    ctx.lineWidth = 0.55 * u;
    ctx.beginPath(); ctx.moveTo(-2 * u, -0.2 * u); ctx.quadraticCurveTo(-3.8 * u, -0.6 * u, -3.3 * u, -2.5 * u); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ell(ctx, 0.8 * u, 0.5 * u, 1 * u, 0.6 * u); ctx.fill();
    ctx.fillStyle = '#FFE58A';
    circ(ctx, 2.7 * u, -1.1 * u, 0.26 * u); ctx.fill();
  }
  function dog(ctx, u, col, ear) {
    ctx.fillStyle = col;
    ell(ctx, 0, 0, 2.5 * u, 1.4 * u); ctx.fill();
    circ(ctx, 2.6 * u, -1.1 * u, 1.3 * u); ctx.fill();
    ell(ctx, 3.8 * u, -0.8 * u, 1 * u, 0.7 * u); ctx.fill();
    ctx.fillStyle = ear;
    ell(ctx, 2 * u, -0.9 * u, 0.6 * u, 1.3 * u, 0.3); ctx.fill();
    ctx.fillStyle = '#1F2433';
    circ(ctx, 4.7 * u, -1 * u, 0.32 * u); ctx.fill();
    circ(ctx, 3 * u, -1.6 * u, 0.24 * u); ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.8 * u;
    ctx.beginPath();
    [-1.6, -0.6, 0.8, 1.7].forEach(function (lx, k) { ctx.moveTo(lx * u, 0.9 * u); ctx.lineTo(lx * u + (k % 2 ? 0.5 : -0.5) * u, 2.3 * u); });
    ctx.moveTo(-2.3 * u, -0.4 * u); ctx.lineTo(-3.4 * u, -1.6 * u);
    ctx.stroke();
  }
  /* legendary: raining cats and dogs */
  function catsdogs(ctx, W, H, t) {
    var u = W / 50, r = sr(351);
    for (var i = 0; i < 6; i++) {
      var x0 = W * (0.24 + (i % 3) * 0.26 + (r() - 0.5) * 0.06);
      var sp = 0.07 + r() * 0.03, ph = r();
      var p = (t * sp + ph + i * 0.17) % 1;
      var y = H * (0.3 + p * 0.56), x = x0 + Math.sin(t * 1.4 + i) * 2 * u;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * (i % 2 ? 1.1 : -0.9) + i);
      ctx.shadowColor = 'rgba(255,255,255,0.55)';
      ctx.shadowBlur = 0.8 * u;
      if (i % 2) cat(ctx, u, i % 4 === 1 ? '#F08A3C' : '#2E3142');
      else dog(ctx, u * 0.95, i % 4 === 0 ? '#A26B3F' : '#F4ECE0', i % 4 === 0 ? '#6E4524' : '#B98B5E');
      ctx.restore();
    }
  }

  /* ---------- frost ---------- */

  function robin(ctx, W, H, t) {
    var u = W / 62;
    var f = 0.36 + J.dx * 0.25, x = f * W, gy = standY(f) * H, top = gy - 9 * u;
    ctx.fillStyle = '#6B4A2B';
    ctx.fillRect(x - 1.1 * u, top, 2.2 * u, gy - top);
    ctx.fillStyle = '#FFFFFF';
    ell(ctx, x, top, 1.5 * u, 0.6 * u); ctx.fill();
    var bob = Math.max(0, Math.sin(t * 3)) * 0.3 * u;
    ctx.save();
    ctx.translate(x, top - 2.3 * u - bob);
    ctx.fillStyle = '#7A5534';
    tri(ctx, -2 * u, 0.2 * u, -4.2 * u, 1.6 * u, -2 * u, 1.3 * u); ctx.fill();
    ell(ctx, 0, 0, 2.6 * u, 2.1 * u); ctx.fill();
    ctx.fillStyle = '#E8582C';
    ell(ctx, 1.2 * u, 0.2 * u, 1.5 * u, 1.6 * u); ctx.fill();
    ctx.fillStyle = '#F2E6D8';
    ell(ctx, 0.5 * u, 1.6 * u, 1.3 * u, 0.6 * u); ctx.fill();
    ctx.fillStyle = '#7A5534';
    circ(ctx, 1.6 * u, -1.7 * u, 1.3 * u); ctx.fill();
    ctx.fillStyle = '#E8582C';
    ell(ctx, 2.2 * u, -1.25 * u, 0.85 * u, 0.85 * u); ctx.fill();
    ctx.fillStyle = '#1F2433';
    circ(ctx, 2.05 * u, -2 * u, 0.28 * u); ctx.fill();
    ctx.fillStyle = '#3A2A1A';
    tri(ctx, 2.8 * u, -1.75 * u, 3.8 * u, -1.55 * u, 2.8 * u, -1.35 * u); ctx.fill();
    ctx.strokeStyle = '#3A2A1A';
    ctx.lineWidth = Math.max(1, 0.25 * u);
    ctx.beginPath(); ctx.moveTo(-0.4 * u, 2 * u); ctx.lineTo(-0.4 * u, 2.4 * u + bob); ctx.moveTo(0.6 * u, 2 * u); ctx.lineTo(0.6 * u, 2.4 * u + bob); ctx.stroke();
    ctx.restore();
  }
  function sledge(ctx, W, H, t) {
    var u = W / 44;
    var f = 0.56 + J.dx * 0.25, x = f * W;
    var y1 = standY(f - 0.06) * H, y2 = standY(f + 0.06) * H;
    var a = Math.atan2(y2 - y1, 0.12 * W);
    ctx.save();
    ctx.translate(x, (y1 + y2) / 2 - 0.4 * u);
    ctx.rotate(a);
    ctx.strokeStyle = '#5A3A22';
    ctx.lineWidth = Math.max(1.5, 0.6 * u);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5 * u, 0); ctx.lineTo(4.5 * u, 0); ctx.quadraticCurveTo(6.2 * u, 0, 6 * u, -1.9 * u);
    [-3.5, 0, 3.4].forEach(function (sx) { ctx.moveTo(sx * u, 0); ctx.lineTo(sx * u, -1.6 * u); });
    ctx.stroke();
    ctx.fillStyle = '#D8432F';
    roundRect(ctx, -5.3 * u, -2.7 * u, 10.2 * u, 1.3 * u, 0.4 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(-5 * u, -2.6 * u, 9.6 * u, 0.3 * u);
    ctx.strokeStyle = '#E9D9B5';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ctx.beginPath(); ctx.moveTo(6 * u, -1.9 * u); ctx.quadraticCurveTo(8 * u, 0.6 * u, 9.6 * u, -0.4 * u); ctx.stroke();
    ctx.restore();
  }
  function fox(ctx, W, H, t) {
    var u = W / 44;
    var f = 0.6 + J.dx * 0.25, x = f * W, gy = standY(f) * H;
    ctx.save();
    ctx.translate(x, gy);
    var sw = Math.sin(t * 1.5) * 0.12;
    ctx.save();
    ctx.rotate(sw * 0.3);
    ctx.fillStyle = '#E2702C';
    ctx.beginPath(); ctx.moveTo(-1 * u, -0.6 * u); ctx.quadraticCurveTo(-6.4 * u, -0.2 * u, -6.4 * u, -4.2 * u); ctx.quadraticCurveTo(-4.2 * u, -2.3 * u, -1.2 * u, -2.8 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ell(ctx, -6.2 * u, -3.9 * u, 0.95 * u, 0.75 * u, -0.6); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#E2702C';
    ell(ctx, 0, -3.4 * u, 2.4 * u, 3.4 * u); ctx.fill();
    ctx.fillStyle = '#FFF4EA';
    ell(ctx, 0.9 * u, -3.4 * u, 1.1 * u, 2.2 * u); ctx.fill();
    ctx.fillStyle = '#2A1E18';
    ctx.fillRect(-0.2 * u, -1.6 * u, 0.8 * u, 1.6 * u);
    ctx.fillRect(1 * u, -1.6 * u, 0.8 * u, 1.6 * u);
    ctx.fillStyle = '#E2702C';
    circ(ctx, 0.6 * u, -7.2 * u, 1.8 * u); ctx.fill();
    tri(ctx, 1.6 * u, -7.8 * u, 4.2 * u, -6.6 * u, 1.6 * u, -6 * u); ctx.fill();
    tri(ctx, -0.8 * u, -8.2 * u, -0.6 * u, -10.4 * u, 0.6 * u, -8.8 * u); ctx.fill();
    tri(ctx, 0.6 * u, -8.8 * u, 1.6 * u, -10.4 * u, 1.9 * u, -8.2 * u); ctx.fill();
    ctx.fillStyle = '#2A1E18';
    tri(ctx, -0.7 * u, -9.4 * u, -0.6 * u, -10.4 * u, 0 * u, -9.6 * u); ctx.fill();
    tri(ctx, 1.2 * u, -9.6 * u, 1.6 * u, -10.4 * u, 1.75 * u, -9.4 * u); ctx.fill();
    ctx.fillStyle = '#FFF4EA';
    ell(ctx, 2.4 * u, -6.5 * u, 1.3 * u, 0.6 * u, 0.2); ctx.fill();
    ctx.fillStyle = '#1F2433';
    circ(ctx, 4.1 * u, -6.65 * u, 0.32 * u); ctx.fill();
    circ(ctx, 1.4 * u, -7.6 * u, 0.26 * u); ctx.fill();
    ctx.restore();
  }
  function igloo(ctx, W, H, t) {
    var u = W / 62;
    var f = 0.6 + J.dx * 0.25, x = f * W, gy = standY(f) * H + 0.6 * u, R = 7 * u;
    var g = ctx.createRadialGradient(x - R * 0.4, gy - R * 0.6, R * 0.1, x, gy - R * 0.3, R * 1.1);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(1, '#C6D3E8');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, gy, R, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(110,130,170,0.6)';
    ctx.lineWidth = Math.max(1, 0.28 * u);
    ctx.stroke();
    ctx.beginPath();
    for (var row = 1; row < 4; row++) {
      var ry = gy - R * row / 4, half = Math.sqrt(R * R - (gy - ry) * (gy - ry));
      ctx.moveTo(x - half, ry); ctx.lineTo(x + half, ry);
      var y0 = gy - R * (row - 1) / 4, n = 6 - row;
      for (var k = 1; k < n; k++) {
        var bx = x - half + (2 * half) * (k + (row % 2) * 0.5) / n;
        if (bx < x + half) { ctx.moveTo(bx, y0); ctx.lineTo(bx, ry); }
      }
    }
    ctx.stroke();
    ctx.fillStyle = '#E8EEF7';
    ctx.beginPath(); ctx.arc(x + R * 0.6, gy, R * 0.44, Math.PI, 0); ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#26304A';
    ctx.beginPath(); ctx.arc(x + R * 0.6, gy, R * 0.27, Math.PI, 0); ctx.fill();
  }
  /* legendary: diamond dust, air so cold it fills with glittering ice */
  function diamond(ctx, W, H, t) {
    var u = W / 64, r = sr(361);
    var px = (scene && scene.sun ? scene.sun[0] + J.sx : 0.5 + J.dx) * W;
    var pg = ctx.createLinearGradient(px - 6 * u, 0, px + 6 * u, 0);
    pg.addColorStop(0, 'rgba(255,245,220,0)');
    pg.addColorStop(0.5, 'rgba(255,245,220,0.62)');
    pg.addColorStop(1, 'rgba(255,245,220,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(px - 6 * u, H * 0.12, 12 * u, H * 0.8);
    var cols = ['255,255,255', '190,225,255', '255,215,235', '210,255,230', '255,240,190'];
    for (var i = 0; i < 56; i++) {
      var x = W * (0.14 + r() * 0.72), y = H * (0.26 + r() * 0.64), sz = 1.1 + r() * 2.2, sp = 2 + r() * 3, ph = r() * TAU;
      var tw = Math.max(0, Math.sin(t * sp + ph));
      if (tw < 0.1) continue;
      glow(ctx, x, y, sz * 2.2 * u, [60, 100, 170], 0.18 * tw);
      star4(ctx, x, y, sz * u * tw, 'rgba(' + cols[i % 5] + ',' + (0.95 * tw) + ')');
    }
  }

  /* ---------- wind ---------- */

  function turbines(ctx, W, H, t) {
    var sp = scene && scene.wind ? scene.wind.speed : 0.5, u = W / 70;
    [[0.3, 16, 1], [0.58, 23, 0], [0.8, 12, 2]].forEach(function (p) {
      var f = p[0] + J.dx * 0.15, x = f * W, gy = standY(f) * H, h = p[1] * u, i = p[2], hy = gy - h, L = h * 0.48;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(80,90,110,0.45)';
      ctx.lineWidth = Math.max(1, 0.25 * u);
      ctx.fillStyle = '#F4F6FA';
      ctx.beginPath(); ctx.moveTo(x - 0.6 * u, gy); ctx.lineTo(x + 0.6 * u, gy); ctx.lineTo(x + 0.25 * u, hy); ctx.lineTo(x - 0.25 * u, hy); ctx.closePath();
      ctx.fill(); ctx.stroke();
      var a0 = t * (1 + sp * 2.4) * (i % 2 ? 1 : 1.15) + i * 2;
      ctx.save();
      ctx.translate(x, hy);
      for (var k = 0; k < 3; k++) {
        ctx.save();
        ctx.rotate(a0 + k * TAU / 3);
        ctx.beginPath(); ctx.moveTo(0, -0.35 * u); ctx.quadraticCurveTo(L * 0.45, -0.75 * u, L, 0); ctx.lineTo(0, 0.35 * u); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      circ(ctx, 0, 0, 0.6 * u); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
  }
  function washing(ctx, W, H, t) {
    var u = W / 70;
    var f0 = 0.2, f1 = 0.8, x0 = f0 * W, x1 = f1 * W, g0 = standY(f0) * H, g1 = standY(f1) * H;
    var t0 = g0 - 17 * u, t1 = g1 - 17 * u, sag = 3 * u;
    ctx.strokeStyle = '#6B4A2B';
    ctx.lineWidth = Math.max(1.5, 0.8 * u);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, g0); ctx.lineTo(x0, t0); ctx.moveTo(x1, g1); ctx.lineTo(x1, t1); ctx.stroke();
    ctx.strokeStyle = 'rgba(245,245,245,0.95)';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ctx.beginPath(); ctx.moveTo(x0, t0); ctx.quadraticCurveTo((x0 + x1) / 2, (t0 + t1) / 2 + sag * 2, x1, t1); ctx.stroke();
    [[0.2, 'shirt', '#E8484A'], [0.42, 'sock', '#4DA3FF'], [0.6, 'towel', '#FFD23F'], [0.8, 'sock', '#5BD46F']].forEach(function (it, i) {
      var q = it[0], x = x0 + (x1 - x0) * q, y = t0 + (t1 - t0) * q + 4 * sag * q * (1 - q);
      var blow = 0.35 + Math.sin(t * 6 + i * 1.3) * 0.12;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-blow);
      ctx.fillStyle = it[2];
      if (it[1] === 'shirt') {
        ctx.beginPath();
        ctx.moveTo(-2.6 * u, 0); ctx.lineTo(2.6 * u, 0); ctx.lineTo(3.6 * u, 1.6 * u); ctx.lineTo(2.4 * u, 2.2 * u); ctx.lineTo(2 * u, 1.5 * u);
        ctx.lineTo(2 * u, 5 * u); ctx.lineTo(-2 * u, 5 * u); ctx.lineTo(-2 * u, 1.5 * u); ctx.lineTo(-2.4 * u, 2.2 * u); ctx.lineTo(-3.6 * u, 1.6 * u);
        ctx.closePath(); ctx.fill();
      } else if (it[1] === 'sock') {
        ctx.beginPath(); ctx.moveTo(-0.8 * u, 0); ctx.lineTo(0.8 * u, 0); ctx.lineTo(0.8 * u, 3.2 * u); ctx.lineTo(2.2 * u, 3.6 * u); ctx.lineTo(2 * u, 4.6 * u); ctx.lineTo(-0.8 * u, 4.4 * u); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-0.8 * u, 0.4 * u, 1.6 * u, 0.5 * u);
      } else {
        ctx.fillRect(-2.4 * u, 0, 4.8 * u, 4.4 * u);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-2.4 * u, 3.4 * u, 4.8 * u, 0.5 * u);
      }
      ctx.fillStyle = '#8A6A48';
      ctx.fillRect(-1.4 * u, -0.4 * u, 0.5 * u, 0.9 * u);
      ctx.fillRect(0.9 * u, -0.4 * u, 0.5 * u, 0.9 * u);
      ctx.restore();
    });
  }
  function windmill(ctx, W, H, t) {
    var u = W / 70;
    var f = 0.64 + J.dx * 0.2, x = f * W, gy = standY(f) * H + 0.5 * u, h = 16 * u;
    ctx.fillStyle = '#ECE5D6';
    ctx.strokeStyle = 'rgba(90,70,55,0.5)';
    ctx.lineWidth = Math.max(1, 0.25 * u);
    ctx.beginPath(); ctx.moveTo(x - 3.2 * u, gy); ctx.lineTo(x + 3.2 * u, gy); ctx.lineTo(x + 2 * u, gy - h); ctx.lineTo(x - 2 * u, gy - h); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5A4636';
    ctx.beginPath(); ctx.moveTo(x - 2.7 * u, gy - h); ctx.quadraticCurveTo(x, gy - h - 3.6 * u, x + 2.7 * u, gy - h); ctx.closePath(); ctx.fill();
    roundRect(ctx, x - 0.9 * u, gy - 3.6 * u, 1.8 * u, 3.6 * u, 0.8 * u); ctx.fill();
    ctx.fillStyle = '#FFD27A';
    ctx.fillRect(x - 0.6 * u, gy - h + 3.5 * u, 1.2 * u, 1.4 * u);
    var a0 = t * (0.7 + (scene && scene.wind ? scene.wind.speed : 0.5)) + J.rot;
    ctx.save();
    ctx.translate(x, gy - h - 0.8 * u);
    for (var k = 0; k < 4; k++) {
      ctx.save();
      ctx.rotate(a0 + k * Math.PI / 2);
      ctx.fillStyle = 'rgba(246,241,230,0.94)';
      ctx.fillRect(0.6 * u, 0, 11 * u, 2.3 * u);
      ctx.strokeStyle = '#4A3A2E';
      ctx.lineWidth = Math.max(1, 0.28 * u);
      ctx.strokeRect(0.6 * u, 0, 11 * u, 2.3 * u);
      ctx.beginPath();
      for (var l = 1; l < 6; l++) { ctx.moveTo((0.6 + l * 1.85) * u, 0); ctx.lineTo((0.6 + l * 1.85) * u, 2.3 * u); }
      ctx.moveTo(0, 0); ctx.lineTo(11.8 * u, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#4A3A2E';
    circ(ctx, 0, 0, 0.8 * u); ctx.fill();
    ctx.restore();
  }
  function hat(ctx, W, H, t) {
    var u = W / 42;
    var x = W * (0.52 + J.dx * 0.35) + Math.sin(t * 0.8) * 5 * u, y = H * (0.48 + J.dy * 0.25) + Math.sin(t * 1.6) * 2.5 * u;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 1.1) * 0.6 + t * 0.4);
    ctx.fillStyle = '#20232E';
    roundRect(ctx, -2.6 * u, -6 * u, 5.2 * u, 6 * u, 0.6 * u); ctx.fill();
    ctx.fillStyle = '#D8432F';
    ctx.fillRect(-2.6 * u, -1.8 * u, 5.2 * u, 1.1 * u);
    ctx.fillStyle = '#20232E';
    ell(ctx, 0, 0, 4.4 * u, 1.1 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(-2 * u, -5.6 * u, 0.8 * u, 3.4 * u);
    ctx.restore();
  }
  /* legendary: flying sheep, blown clean off the hills */
  function sheep(ctx, W, H, t) {
    var u = W / 50;
    [[0.38, 0.44, 1.1, 0], [0.66, 0.58, 0.85, 1]].forEach(function (p) {
      var x = W * (p[0] + J.dx * 0.25) + Math.sin(t * 0.9 + p[3] * 2) * 4 * u, y = H * (p[1] + J.dy * 0.2) + Math.sin(t * 1.7 + p[3]) * 2 * u;
      var s = p[2] * u;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * (p[3] ? -0.9 : 0.7) + p[3] * 2);
      ctx.strokeStyle = '#24252E';
      ctx.lineWidth = Math.max(1.5, 0.8 * s);
      ctx.lineCap = 'round';
      ctx.beginPath();
      [[-2.2, 2], [-0.8, 2.6], [0.8, 2.6], [2.2, 2]].forEach(function (l, k) {
        ctx.moveTo(l[0] * s, 1.4 * s);
        ctx.lineTo((l[0] + (k < 2 ? -0.6 : 0.6) + Math.sin(t * 8 + k) * 0.3) * s, (1.4 + l[1]) * s);
      });
      ctx.stroke();
      var fleece = [[0, 0, 3], [-2.4, 0.4, 2.1], [2.4, 0.4, 2.1], [-1.2, -1.8, 2], [1.4, -1.7, 2], [0, 1.5, 2.2]];
      ctx.fillStyle = 'rgba(90,95,110,0.4)';
      fleece.forEach(function (c) { circ(ctx, c[0] * s, c[1] * s, c[2] * s + 0.35 * s); ctx.fill(); });
      ctx.fillStyle = '#F6F4EE';
      fleece.forEach(function (c) { circ(ctx, c[0] * s, c[1] * s, c[2] * s); ctx.fill(); });
      ctx.fillStyle = '#24252E';
      ell(ctx, 3.7 * s, -0.5 * s, 1.5 * s, 1.1 * s, 0.3); ctx.fill();
      ell(ctx, 3.1 * s, -1.8 * s, 0.9 * s, 0.35 * s, -0.6); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      circ(ctx, 4.2 * s, -0.8 * s, 0.25 * s); ctx.fill();
      ctx.restore();
    });
  }

  /* ---------- storm ---------- */

  function cottage(ctx, W, H, t) {
    var u = W / 48;
    var f = 0.6 + J.dx * 0.2, x = f * W, gy = standY(f) * H + 0.5 * u, w = 10 * u, h = 6 * u;
    var fl = 0.88 + 0.12 * Math.sin(t * 5) * Math.sin(t * 2.3);
    glow(ctx, x, gy - h * 0.5, 13 * u, [255, 200, 110], 0.32 * fl);
    ctx.fillStyle = '#2E3346';
    ctx.fillRect(x - w / 2, gy - h, w, h);
    ctx.fillStyle = '#1A1E2C';
    tri(ctx, x - w / 2 - 1.2 * u, gy - h, x, gy - h - 5 * u, x + w / 2 + 1.2 * u, gy - h); ctx.fill();
    ctx.fillRect(x + w * 0.22, gy - h - 5.2 * u, 1.6 * u, 3.4 * u);
    ctx.fillStyle = 'rgba(255,214,130,' + fl + ')';
    ctx.fillRect(x - w * 0.38, gy - h * 0.74, 2.4 * u, 2.2 * u);
    ctx.fillRect(x + w * 0.14, gy - h * 0.74, 2.4 * u, 2.2 * u);
    ctx.strokeStyle = '#2E3346';
    ctx.lineWidth = Math.max(1, 0.25 * u);
    ctx.beginPath();
    [x - w * 0.38, x + w * 0.14].forEach(function (wx) {
      var wy = gy - h * 0.74;
      ctx.moveTo(wx + 1.2 * u, wy); ctx.lineTo(wx + 1.2 * u, wy + 2.2 * u);
      ctx.moveTo(wx, wy + 1.1 * u); ctx.lineTo(wx + 2.4 * u, wy + 1.1 * u);
    });
    ctx.stroke();
    ctx.fillStyle = '#5A3A22';
    ctx.fillRect(x - 1 * u, gy - 3.4 * u, 2 * u, 3.4 * u);
  }
  function lighthouse(ctx, W, H, t) {
    var u = W / 62;
    var f = 0.68 + J.dx * 0.15, x = f * W, gy = standY(f) * H + 0.6 * u, h = 20 * u, ly = gy - h - 1.8 * u;
    var th = t * 1.2 + J.rot, c = Math.cos(th);
    ctx.save();
    ctx.translate(x, ly);
    ctx.scale(c > 0 ? -1 : 1, 1);
    var L = 42 * u * Math.abs(c) + 4 * u;
    var bg = ctx.createLinearGradient(0, 0, L, 0);
    bg.addColorStop(0, 'rgba(255,240,190,0.6)');
    bg.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = bg;
    tri(ctx, 0, 0, L, -6 * u, L, 6 * u); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - 2.6 * u, gy); ctx.lineTo(x + 2.6 * u, gy); ctx.lineTo(x + 1.6 * u, gy - h); ctx.lineTo(x - 1.6 * u, gy - h); ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#F4F6FA';
    ctx.fillRect(x - 3 * u, gy - h, 6 * u, h);
    ctx.fillStyle = '#D8432F';
    for (var b = 0; b < 4; b++) ctx.fillRect(x - 3 * u, gy - h + (b * 2 + 1) * h / 8, 6 * u, h / 8);
    ctx.restore();
    ctx.fillStyle = '#1F2433';
    ctx.fillRect(x - 2.4 * u, gy - h - 0.6 * u, 4.8 * u, 0.8 * u);
    ctx.fillRect(x - 1.5 * u, gy - h - 3.4 * u, 3 * u, 0.6 * u);
    tri(ctx, x - 1.9 * u, gy - h - 3.4 * u, x, gy - h - 5.4 * u, x + 1.9 * u, gy - h - 3.4 * u); ctx.fill();
    glow(ctx, x, ly, 6 * u, [255, 236, 170], 0.85);
    ctx.fillStyle = '#FFF1BF';
    ctx.fillRect(x - 1.2 * u, gy - h - 2.8 * u, 2.4 * u, 2.2 * u);
    ctx.fillStyle = '#3B4256';
    ell(ctx, x, gy, 5 * u, 1.2 * u); ctx.fill();
  }
  function scarecrow(ctx, W, H, t) {
    var u = W / 62;
    var f = 0.42 + J.dx * 0.25, x = f * W, gy = standY(f) * H;
    ctx.save();
    ctx.translate(x, gy);
    ctx.rotate(Math.sin(t * 1.6) * 0.05);
    ctx.fillStyle = '#6B4A2B';
    ctx.fillRect(-0.4 * u, -14 * u, 0.8 * u, 14 * u);
    ctx.fillRect(-6 * u, -10.6 * u, 12 * u, 0.7 * u);
    ctx.strokeStyle = '#E8C45A';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ctx.lineCap = 'round';
    ctx.beginPath();
    [-1, 1].forEach(function (d) { for (var k = -1; k <= 1; k++) { ctx.moveTo(d * 5.4 * u, -10.3 * u); ctx.lineTo(d * (6.6 + Math.abs(k) * 0.2) * u, (-10.3 + k * 0.9) * u); } });
    for (var s2 = -2; s2 <= 2; s2++) { ctx.moveTo(s2 * 0.9 * u, -5.2 * u); ctx.lineTo(s2 * 1.1 * u, -3.8 * u); }
    ctx.stroke();
    ctx.fillStyle = '#C0473A';
    ctx.beginPath();
    ctx.moveTo(-5.3 * u, -11 * u); ctx.lineTo(5.3 * u, -11 * u); ctx.lineTo(4.7 * u, -9.4 * u); ctx.lineTo(2.4 * u, -9.5 * u); ctx.lineTo(2.6 * u, -5.1 * u);
    ctx.lineTo(-2.6 * u, -5.1 * u); ctx.lineTo(-2.4 * u, -9.5 * u); ctx.lineTo(-4.7 * u, -9.4 * u);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E3B04B';
    ctx.fillRect(0.6 * u, -8.4 * u, 1.3 * u, 1.3 * u);
    ctx.fillStyle = '#D9C08C';
    circ(ctx, 0, -12.8 * u, 1.9 * u); ctx.fill();
    ctx.fillStyle = '#3A2A1A';
    circ(ctx, -0.7 * u, -13.1 * u, 0.28 * u); ctx.fill();
    circ(ctx, 0.7 * u, -13.1 * u, 0.28 * u); ctx.fill();
    ctx.strokeStyle = '#3A2A1A';
    ctx.lineWidth = Math.max(1, 0.2 * u);
    ctx.beginPath(); ctx.arc(0, -12.6 * u, 0.9 * u, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#5A3A22';
    ell(ctx, 0, -14.4 * u, 3.3 * u, 0.7 * u); ctx.fill();
    roundRect(ctx, -1.6 * u, -16.6 * u, 3.2 * u, 2.4 * u, 0.6 * u); ctx.fill();
    ctx.restore();
  }
  function castle(ctx, W, H, t) {
    var u = W / 66;
    var f = 0.55 + J.dx * 0.2, x = f * W, gy = standY(f) * H + 0.8 * u;
    ctx.fillStyle = '#171B28';
    ctx.fillRect(x - 8 * u, gy - 7 * u, 16 * u, 7 * u);
    for (var k = -8; k < 8; k += 2) ctx.fillRect(x + k * u, gy - 8.2 * u, 1.1 * u, 1.3 * u);
    [[-8.5, 12], [8.5, 12], [0, 15.5]].forEach(function (tw) {
      var tx = x + tw[0] * u, top = gy - tw[1] * u;
      ctx.fillRect(tx - 2 * u, top, 4 * u, tw[1] * u);
      for (var b = -2; b < 2; b += 1.4) ctx.fillRect(tx + b * u, top - 1.2 * u, 0.9 * u, 1.2 * u);
    });
    var fx = x, fy = gy - 15.5 * u - 1.2 * u;
    ctx.strokeStyle = '#171B28';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 4 * u); ctx.stroke();
    ctx.fillStyle = '#D8432F';
    ctx.beginPath(); ctx.moveTo(fx, fy - 4 * u);
    for (var q = 0; q <= 6; q++) ctx.lineTo(fx + q * 0.5 * u, fy - 4 * u + Math.sin(t * 6 + q) * 0.3 * u);
    for (var q2 = 6; q2 >= 0; q2--) ctx.lineTo(fx + q2 * 0.5 * u, fy - 2.6 * u + Math.sin(t * 6 + q2) * 0.3 * u);
    ctx.closePath(); ctx.fill();
    var fl = 0.85 + 0.15 * Math.sin(t * 4);
    ctx.fillStyle = 'rgba(255,214,130,' + fl + ')';
    [[-8.5, -9], [8.5, -8], [0, -11], [-3, -4.5], [3, -4.5]].forEach(function (w) { ctx.fillRect(x + (w[0] - 0.45) * u, gy + w[1] * u, 0.9 * u, 1.4 * u); });
    ctx.fillStyle = '#0D1018';
    ctx.beginPath(); ctx.moveTo(x - 1.6 * u, gy); ctx.lineTo(x - 1.6 * u, gy - 2.6 * u); ctx.arc(x, gy - 2.6 * u, 1.6 * u, Math.PI, 0); ctx.lineTo(x + 1.6 * u, gy); ctx.closePath(); ctx.fill();
  }
  /* St Elmo's fire: a blue glow that crackles at the tip of a spire in a storm */
  function elmo(ctx, W, H, t) {
    var u = W / 62;
    var f = 0.5 + J.dx * 0.2, x = f * W, gy = standY(f) * H + 0.8 * u;
    ctx.fillStyle = '#171B28';
    ctx.fillRect(x - 9 * u, gy - 5 * u, 8 * u, 5 * u);
    tri(ctx, x - 9.4 * u, gy - 5 * u, x - 5 * u, gy - 8 * u, x - 0.6 * u, gy - 5 * u); ctx.fill();
    ctx.fillRect(x - 1.8 * u, gy - 12 * u, 3.6 * u, 12 * u);
    tri(ctx, x - 2.2 * u, gy - 12 * u, x, gy - 22 * u, x + 2.2 * u, gy - 12 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,130,0.85)';
    ctx.fillRect(x - 0.5 * u, gy - 10 * u, 1 * u, 2 * u);
    ctx.fillRect(x - 7 * u, gy - 3.6 * u, 0.9 * u, 1.6 * u);
    ctx.fillRect(x - 4.4 * u, gy - 3.6 * u, 0.9 * u, 1.6 * u);
    var tx = x, ty = gy - 22 * u, fl = 0.7 + 0.3 * Math.sin(t * 9) * Math.sin(t * 2.7);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, tx, ty, 8 * u, [120, 150, 255], 0.8 * fl);
    glow(ctx, tx, ty, 3 * u, [210, 220, 255], 0.9 * fl);
    ctx.strokeStyle = 'rgba(190,205,255,' + (0.9 * fl) + ')';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    var r = rng((Math.floor(t * 10) * 13 + (SALT || 3)) >>> 0);
    for (var i = 0; i < 8; i++) {
      var a = -Math.PI / 2 + (r() - 0.5) * 2.6, L = (2 + r() * 3.5) * u;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(a) * L * 0.5 + (r() - 0.5) * u, ty + Math.sin(a) * L * 0.5); ctx.lineTo(tx + Math.cos(a) * L, ty + Math.sin(a) * L); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- mist ---------- */

  function owl(ctx, W, H, t) {
    var u = W / 60;
    var f = 0.36 + J.dx * 0.25, x = f * W, gy = standY(f) * H, top = gy - 8 * u, by = top - 3.6 * u;
    ctx.fillStyle = '#4A3A2E';
    ctx.fillRect(x - 1.2 * u, top, 2.4 * u, gy - top);
    ctx.fillStyle = '#8A6A48';
    ell(ctx, x, by, 3 * u, 3.8 * u); ctx.fill();
    tri(ctx, x - 2.5 * u, by - 2.4 * u, x - 2.3 * u, by - 4.8 * u, x - 0.9 * u, by - 3.2 * u); ctx.fill();
    tri(ctx, x + 2.5 * u, by - 2.4 * u, x + 2.3 * u, by - 4.8 * u, x + 0.9 * u, by - 3.2 * u); ctx.fill();
    ctx.fillStyle = '#D8C29E';
    ell(ctx, x, by + 1 * u, 1.9 * u, 2.5 * u); ctx.fill();
    ctx.fillStyle = 'rgba(110,80,50,0.55)';
    for (var s = 0; s < 6; s++) { ell(ctx, x + ((s % 3) - 1) * 0.9 * u, by + (0.2 + Math.floor(s / 3) * 1.2) * u, 0.3 * u, 0.18 * u); ctx.fill(); }
    ctx.fillStyle = '#6E5236';
    ell(ctx, x - 2.6 * u, by + 0.5 * u, 1 * u, 2.8 * u, 0.15); ctx.fill();
    ell(ctx, x + 2.6 * u, by + 0.5 * u, 1 * u, 2.8 * u, -0.15); ctx.fill();
    var blink = (t % 4.3) < 0.15;
    [-1.2, 1.2].forEach(function (ex) {
      ctx.fillStyle = '#F6E7C8';
      circ(ctx, x + ex * u, by - 1.8 * u, 1.2 * u); ctx.fill();
      if (blink) {
        ctx.strokeStyle = '#3A2A1A';
        ctx.lineWidth = Math.max(1, 0.3 * u);
        ctx.beginPath(); ctx.moveTo(x + (ex - 0.8) * u, by - 1.8 * u); ctx.lineTo(x + (ex + 0.8) * u, by - 1.8 * u); ctx.stroke();
      } else {
        ctx.fillStyle = '#FFB020'; circ(ctx, x + ex * u, by - 1.8 * u, 0.72 * u); ctx.fill();
        ctx.fillStyle = '#1F2433'; circ(ctx, x + ex * u, by - 1.8 * u, 0.36 * u); ctx.fill();
      }
    });
    ctx.fillStyle = '#E8A417';
    tri(ctx, x - 0.4 * u, by - 1.1 * u, x + 0.4 * u, by - 1.1 * u, x, by + 0.1 * u); ctx.fill();
    ctx.fillStyle = '#E8A417';
    ctx.fillRect(x - 1.4 * u, top - 0.4 * u, 0.8 * u, 0.6 * u);
    ctx.fillRect(x + 0.6 * u, top - 0.4 * u, 0.8 * u, 0.6 * u);
  }
  function web(ctx, W, H, t) {
    var u = W / 100;
    var cx = W * (0.36 + J.dx * 0.25), cy = H * (0.5 + J.dy * 0.25), R = 16 * u, n = 9;
    var ang = [];
    for (var i = 0; i < n; i++) ang.push(i / n * TAU + 0.2 + J.rot);
    function threads(col, w) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ang.forEach(function (a) { ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); });
      for (var ring = 1; ring <= 5; ring++) {
        var rr = R * ring / 5.4;
        ang.forEach(function (a, k) {
          var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr + Math.sin(t + ring) * 0.15 * u;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
      }
      ctx.stroke();
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    threads('rgba(40,50,70,0.35)', Math.max(1.5, 0.75 * u));
    threads('rgba(255,255,255,0.92)', Math.max(1, 0.35 * u));
    var r = sr(371);
    for (var ring = 1; ring <= 5; ring++) {
      ang.forEach(function (a) {
        if (r() < 0.45) return;
        var rr = R * ring / 5.4, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        var tw = 0.6 + 0.4 * Math.sin(t * 2 + ring + a * 3);
        ctx.fillStyle = 'rgba(40,50,70,0.3)';
        circ(ctx, x, y + 0.2 * u, (0.9 + r() * 0.4) * u); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + tw + ')';
        circ(ctx, x, y, (0.7 + r() * 0.4) * u); ctx.fill();
      });
    }
  }
  function stag(ctx, W, H, t) {
    var u = W / 42;
    var f = 0.58 + J.dx * 0.2, x = f * W, gy = standY(f) * H;
    var col = 'rgba(48,54,70,0.88)';
    ctx.save();
    ctx.translate(x, gy);
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ell(ctx, 0, -6.2 * u, 4.4 * u, 2.2 * u); ctx.fill();
    ctx.lineWidth = 0.75 * u;
    ctx.lineCap = 'round';
    ctx.beginPath();
    [-3.2, -2.2, 2.4, 3.3].forEach(function (lx) { ctx.moveTo(lx * u, -5.4 * u); ctx.lineTo(lx * u, 0); });
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2.6 * u, -7.4 * u); ctx.lineTo(-4.4 * u, -10.6 * u); ctx.lineTo(-3 * u, -11.2 * u); ctx.lineTo(-1.2 * u, -7.6 * u); ctx.closePath(); ctx.fill();
    ell(ctx, -4.6 * u, -10.8 * u, 1.6 * u, 0.9 * u, 0.4); ctx.fill();
    ctx.lineWidth = 0.55 * u;
    ctx.beginPath();
    [[-4.2, 1], [-3.2, -1]].forEach(function (b) {
      var bx = b[0] * u, by = -11.4 * u, d = b[1];
      ctx.moveTo(bx, by); ctx.lineTo(bx - d * 0.6 * u, by - 4.4 * u);
      ctx.moveTo(bx - d * 0.25 * u, by - 1.6 * u); ctx.lineTo(bx - d * 1.6 * u, by - 2.4 * u);
      ctx.moveTo(bx - d * 0.45 * u, by - 3 * u); ctx.lineTo(bx - d * 1.4 * u, by - 4 * u);
      ctx.moveTo(bx - d * 0.55 * u, by - 3.8 * u); ctx.lineTo(bx + d * 0.4 * u, by - 5.2 * u);
    });
    ctx.stroke();
    ctx.restore();
  }
  function ship(ctx, W, H, t) {
    var u = W / 62;
    var x = W * (0.5 + J.dx * 0.3) + Math.sin(t * 0.15) * 3 * u, y = H * (0.72 + J.dy * 0.1) + Math.sin(t * 0.9) * 0.4 * u;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.7) * 0.03);
    var col = 'rgba(62,70,92,0.62)';
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-9 * u, -2 * u); ctx.lineTo(9 * u, -2 * u); ctx.lineTo(6.5 * u, 1.2 * u); ctx.lineTo(-6.5 * u, 1.2 * u); ctx.closePath(); ctx.fill();
    ctx.fillRect(-9 * u, -4 * u, 3.6 * u, 2 * u);
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.45 * u;
    ctx.beginPath();
    [-3, 1.5, 5.5].forEach(function (mx, i) { ctx.moveTo(mx * u, -2 * u); ctx.lineTo(mx * u, -(i === 1 ? 15 : 12) * u); });
    ctx.moveTo(-9 * u, -4 * u); ctx.lineTo(1.5 * u, -15 * u); ctx.lineTo(9 * u, -2 * u);
    ctx.stroke();
    ctx.fillStyle = 'rgba(228,232,242,0.6)';
    [[-3, 12], [1.5, 15], [5.5, 12]].forEach(function (m) {
      var mx = m[0] * u, h = m[1] * u;
      for (var k = 0; k < 2; k++) {
        var y0 = -h + 1 * u + k * h * 0.42, y1 = y0 + h * 0.34, w0 = (1.6 + k * 0.5) * u, w1 = (2.2 + k * 0.5) * u;
        ctx.beginPath(); ctx.moveTo(mx - w0, y0); ctx.lineTo(mx + w0, y0); ctx.quadraticCurveTo(mx + w1 + 0.6 * u, (y0 + y1) / 2, mx + w1, y1); ctx.lineTo(mx - w1, y1); ctx.quadraticCurveTo(mx - w1 + 0.6 * u, (y0 + y1) / 2, mx - w0, y0); ctx.fill();
      }
    });
    ctx.restore();
  }
  /* legendary: the Brocken spectre, your own shadow cast on the fog, ringed by a rainbow glory */
  function spectre(ctx, W, H, t) {
    var u = W / 60;
    var cx = W * (0.5 + J.dx * 0.2), gy = H * 0.94, hy = H * 0.5;
    var cols = ['255,80,80', '255,170,60', '255,235,90', '90,220,120', '80,160,255', '150,110,255'];
    var pulse = 0.85 + 0.15 * Math.sin(t * 1.2);
    for (var i = 0; i < cols.length; i++) {
      ctx.strokeStyle = 'rgba(' + cols[i] + ',' + ((0.6 - i * 0.04) * pulse) + ')';
      ctx.lineWidth = 1.1 * u;
      ctx.beginPath(); ctx.arc(cx, hy, (10 - i * 1.05) * u, 0, TAU); ctx.stroke();
    }
    var g = ctx.createLinearGradient(0, hy, 0, gy);
    g.addColorStop(0, 'rgba(38,44,60,0.85)');
    g.addColorStop(1, 'rgba(38,44,60,0.1)');
    ctx.fillStyle = g;
    circ(ctx, cx, hy, 2.4 * u); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 2 * u, hy + 2.6 * u);
    ctx.quadraticCurveTo(cx - 4.4 * u, hy + 3 * u, cx - 7 * u, hy + 8 * u);
    ctx.lineTo(cx - 5.6 * u, hy + 8.6 * u);
    ctx.lineTo(cx - 3.6 * u, hy + 6 * u);
    ctx.lineTo(cx - 4.6 * u, gy);
    ctx.lineTo(cx + 4.6 * u, gy);
    ctx.lineTo(cx + 3.6 * u, hy + 6 * u);
    ctx.lineTo(cx + 5.6 * u, hy + 8.6 * u);
    ctx.lineTo(cx + 7 * u, hy + 8 * u);
    ctx.quadraticCurveTo(cx + 4.4 * u, hy + 3 * u, cx + 2 * u, hy + 2.6 * u);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------- Sky Wonders at night ---------- */

  function bat(ctx, x, y, s, fl) {
    ctx.save();
    ctx.translate(x, y);
    var wy = fl * 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(1.5 * s, -1.2 * s - wy, 3.6 * s, -0.6 * s - wy);
    ctx.quadraticCurveTo(3 * s, 0.2 * s - wy * 0.4, 2.4 * s, 0.4 * s - wy * 0.3);
    ctx.quadraticCurveTo(1.8 * s, 0.1 * s, 1.2 * s, 0.6 * s);
    ctx.quadraticCurveTo(0.8 * s, 0.2 * s, 0, 0.6 * s);
    ctx.quadraticCurveTo(-0.8 * s, 0.2 * s, -1.2 * s, 0.6 * s);
    ctx.quadraticCurveTo(-1.8 * s, 0.1 * s, -2.4 * s, 0.4 * s - wy * 0.3);
    ctx.quadraticCurveTo(-3 * s, 0.2 * s - wy * 0.4, -3.6 * s, -0.6 * s - wy);
    ctx.quadraticCurveTo(-1.5 * s, -1.2 * s - wy, 0, 0);
    ctx.fillStyle = '#0A0D18';
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,210,255,0.6)';
    ctx.lineWidth = Math.max(1, 0.2 * s);
    ctx.stroke();
    ell(ctx, 0, 0.2 * s, 0.55 * s, 0.85 * s); ctx.fill();
    tri(ctx, -0.45 * s, -0.4 * s, -0.3 * s, -1.1 * s, 0, -0.5 * s); ctx.fill();
    tri(ctx, 0.45 * s, -0.4 * s, 0.3 * s, -1.1 * s, 0, -0.5 * s); ctx.fill();
    ctx.restore();
  }
  function bats(ctx, W, H, t) {
    var u = W / 48, r = sr(381);
    for (var i = 0; i < 5; i++) {
      var x0 = W * (0.24 + r() * 0.52), y0 = H * (0.36 + r() * 0.24), s = (1.1 + r() * 0.5) * u;
      bat(ctx, x0 + Math.sin(t * 0.9 + i * 1.7) * 5 * u, y0 + Math.sin(t * 1.9 + i) * 2 * u, s, Math.sin(t * 10 + i * 2));
    }
  }
  /* Orion, the hunter: two shoulders, a belt of three stars, two feet and a little head */
  var ORION = [[0, 0, 1.3, '#FFB27A'], [0.9, 0.08, 1], [0.62, 0.78, 0.85], [0.5, 0.86, 0.9], [0.38, 0.94, 0.85], [0.18, 1.6, 0.9], [1.02, 1.5, 1.25, '#C4DCFF'], [0.48, -0.32, 0.6]];
  function orion(ctx, W, H, t) {
    var u = W / 100, sc = 19 * u;
    ctx.save();
    ctx.translate(W * (0.36 + J.dx * 0.2), H * (0.34 + J.dy * 0.2));
    ctx.rotate(J.rot * 0.5);
    var P = ORION.map(function (p) { return [p[0] * sc, p[1] * sc]; });
    ctx.strokeStyle = 'rgba(190,205,255,0.4)';
    ctx.lineWidth = Math.max(1, 0.35 * u);
    ctx.beginPath();
    [[0, 4], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [0, 7], [1, 7]].forEach(function (l) { ctx.moveTo(P[l[0]][0], P[l[0]][1]); ctx.lineTo(P[l[1]][0], P[l[1]][1]); });
    ctx.stroke();
    ORION.forEach(function (p, i) {
      var x = P[i][0], y = P[i][1], tw = 0.75 + 0.25 * Math.sin(t * (1.5 + i * 0.3) + i * 2), s = p[2];
      var c = p[3] || '#FFFFFF';
      var n = parseInt(c.slice(1), 16);
      glow(ctx, x, y, 3.4 * u * s, [(n >> 16) & 255, (n >> 8) & 255, n & 255], 0.55 * tw);
      star4(ctx, x, y, 2 * u * s * tw, c);
    });
    ctx.restore();
  }
  function lanterns(ctx, W, H, t) {
    var u = W / 70, r = sr(391);
    for (var i = 0; i < 6; i++) {
      var x0 = W * (0.22 + r() * 0.56), sp = 0.03 + r() * 0.02, ph = r();
      var p = (t * sp + ph) % 1;
      var y = H * (0.86 - p * 0.54), x = x0 + Math.sin(t * 0.6 + i * 2) * 2 * u;
      var s = (1.7 + r() * 0.9) * u * (1 - p * 0.35), fl = 0.85 + 0.15 * Math.sin(t * 7 + i * 3);
      glow(ctx, x, y, s * 4.2, [255, 170, 80], 0.45 * fl);
      var g = ctx.createLinearGradient(0, y - s * 1.6, 0, y + s * 1.6);
      g.addColorStop(0, '#FFAE52');
      g.addColorStop(1, '#FFE8B0');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x - s * 1.2, y - s * 1.6); ctx.lineTo(x + s * 1.2, y - s * 1.6); ctx.lineTo(x + s * 0.8, y + s * 1.4); ctx.lineTo(x - s * 0.8, y + s * 1.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,235,' + fl + ')';
      circ(ctx, x, y + s * 1.2, s * 0.38); ctx.fill();
    }
  }
  function milkyway(ctx, W, H, t) {
    var u = W / 100, r = sr(401);
    ctx.save();
    ctx.translate(W * 0.5, H * 0.46);
    ctx.rotate(-0.6 + J.rot * 0.4);
    for (var k = 0; k < 3; k++) {
      var bw = (17 - k * 5.5) * u;
      var g = ctx.createLinearGradient(0, -bw, 0, bw);
      g.addColorStop(0, 'rgba(180,170,255,0)');
      g.addColorStop(0.5, k === 2 ? 'rgba(255,245,235,0.32)' : 'rgba(200,190,255,' + (0.16 + k * 0.08) + ')');
      g.addColorStop(1, 'rgba(180,170,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-W, -bw, W * 2, bw * 2);
    }
    ctx.fillStyle = 'rgba(10,12,30,0.28)';
    ell(ctx, 6 * u, 0.6 * u, W * 0.5, 1.5 * u, 0.04); ctx.fill();
    for (var i = 0; i < 110; i++) {
      var x = (r() - 0.5) * W * 1.4, y = (r() + r() + r() - 1.5) * 9 * u;
      var a = 0.35 + 0.65 * Math.abs(Math.sin(t * (1 + r()) + i));
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
      ctx.fillRect(x, y, Math.max(1, 0.45 * u), Math.max(1, 0.45 * u));
    }
    ctx.restore();
  }
  /* legendary: a great comet, with a white dust tail and a thin blue one */
  function comet(ctx, W, H, t) {
    var u = W / 100;
    var hx = W * (0.64 + J.dx * 0.25), hy = H * (0.36 + J.dy * 0.2), L = 54 * u;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(2.55 + J.rot * 0.3);
    var g = ctx.createLinearGradient(0, 0, L, 0);
    g.addColorStop(0, 'rgba(255,250,235,0.85)');
    g.addColorStop(0.4, 'rgba(255,240,220,0.35)');
    g.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -1.3 * u); ctx.quadraticCurveTo(L * 0.5, -2 * u, L, 6 * u); ctx.lineTo(L, 15 * u); ctx.quadraticCurveTo(L * 0.5, 6.5 * u, 0, 1.3 * u); ctx.closePath(); ctx.fill();
    var g2 = ctx.createLinearGradient(0, 0, L * 1.1, 0);
    g2.addColorStop(0, 'rgba(150,200,255,0.85)');
    g2.addColorStop(1, 'rgba(150,200,255,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(0, -0.6 * u); ctx.lineTo(L * 1.1, -1.8 * u); ctx.lineTo(L * 1.1, 0.2 * u); ctx.lineTo(0, 0.6 * u); ctx.closePath(); ctx.fill();
    ctx.restore();
    var tw = 0.85 + 0.15 * Math.sin(t * 4);
    glow(ctx, hx, hy, 7 * u, [220, 240, 255], 0.9 * tw);
    ctx.fillStyle = '#FFFFFF';
    circ(ctx, hx, hy, 1.5 * u); ctx.fill();
  }

  /* ---------- Sky Wonders by day ---------- */

  function bubbles(ctx, W, H, t) {
    var u = W / 68, r = sr(411);
    for (var i = 0; i < 8; i++) {
      var x0 = W * (0.2 + r() * 0.6), sp = 0.04 + r() * 0.03, ph = r();
      var p = (t * sp + ph) % 1;
      var y = H * (0.88 - p * 0.55), x = x0 + Math.sin(t * 1.2 + i * 1.9) * 2.5 * u, R = (2.6 + r() * 3.6) * u;
      var hh = (t * 40 + i * 50) % 360;
      var g = ctx.createLinearGradient(x - R, y - R, x + R, y + R);
      g.addColorStop(0, 'hsla(' + hh + ',90%,62%,0.75)');
      g.addColorStop(0.5, 'hsla(' + (hh + 120) + ',90%,66%,0.6)');
      g.addColorStop(1, 'hsla(' + (hh + 240) + ',90%,62%,0.75)');
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      circ(ctx, x, y, R); ctx.fill();
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(1.5, 0.6 * u);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ell(ctx, x - R * 0.4, y - R * 0.45, R * 0.28, R * 0.15, -0.6); ctx.fill();
    }
  }
  function parachute(ctx, W, H, t) {
    var u = W / 66;
    var x = W * (0.5 + J.dx * 0.35) + Math.sin(t * 0.8) * 3 * u, y = H * (0.42 + J.dy * 0.2) + Math.sin(t * 0.5) * 2 * u, R = 7 * u;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.8) * 0.12);
    var cols = ['#E8484A', '#FFD23F', '#4DA3FF', '#FFD23F', '#E8484A'];
    for (var k = 0; k < 5; k++) {
      ctx.fillStyle = cols[k];
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, Math.PI + k * Math.PI / 5, Math.PI + (k + 1) * Math.PI / 5); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(40,40,50,0.7)';
    ctx.lineWidth = Math.max(1, 0.2 * u);
    ctx.beginPath();
    [-R, -R * 0.5, R * 0.5, R].forEach(function (cx0) { ctx.moveTo(cx0, 0); ctx.lineTo(0, 7.4 * u); });
    ctx.stroke();
    ctx.fillStyle = '#A26B3F';
    circ(ctx, 0, 8.2 * u, 1.1 * u); ctx.fill();
    circ(ctx, -0.9 * u, 7.4 * u, 0.45 * u); ctx.fill();
    circ(ctx, 0.9 * u, 7.4 * u, 0.45 * u); ctx.fill();
    ell(ctx, 0, 10.1 * u, 1.3 * u, 1.4 * u); ctx.fill();
    ctx.fillStyle = '#1F2433';
    circ(ctx, -0.4 * u, 8.1 * u, 0.18 * u); ctx.fill();
    circ(ctx, 0.4 * u, 8.1 * u, 0.18 * u); ctx.fill();
    ctx.restore();
  }
  function gold(ctx, W, H, t) {
    var u = W / 44;
    var f = 0.64 + J.dx * 0.2, x = f * W, gy = standY(f) * H + 0.4 * u;
    ctx.fillStyle = '#23252E';
    ell(ctx, x, gy - 3 * u, 4.4 * u, 3.2 * u); ctx.fill();
    ctx.fillRect(x - 3.6 * u, gy - 0.6 * u, 0.9 * u, 0.8 * u);
    ctx.fillRect(x + 2.7 * u, gy - 0.6 * u, 0.9 * u, 0.8 * u);
    ctx.fillStyle = '#FFC93C';
    ctx.strokeStyle = '#B57F0E';
    ctx.lineWidth = Math.max(1, 0.2 * u);
    [[-2.6, -5.4], [-1, -6.2], [0.8, -6], [2.4, -5.4], [-1.8, -6.9], [0.2, -7.5], [1.6, -6.9]].forEach(function (c) { ell(ctx, x + c[0] * u, gy + c[1] * u, 1.3 * u, 0.9 * u); ctx.fill(); ctx.stroke(); });
    ctx.fillStyle = '#2F323D';
    ell(ctx, x, gy - 5.2 * u, 4.7 * u, 0.8 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ell(ctx, x - 2 * u, gy - 3.4 * u, 0.8 * u, 1.6 * u, 0.3); ctx.fill();
    for (var i = 0; i < 4; i++) {
      var a = Math.max(0, Math.sin(t * 2.4 + i * 1.7));
      if (a < 0.15) continue;
      star4(ctx, x + (i - 1.5) * 2.2 * u, gy - (8.4 + (i % 2) * 1.6) * u, 1.2 * u * a, 'rgba(255,248,210,' + a + ')');
    }
  }
  /* legendary: a fire rainbow, a flat band of rainbow colours glowing in thin high cloud */
  function firerainbow(ctx, W, H, t) {
    var u = W / 100, r = sr(421);
    var y0 = H * (0.5 + J.dy * 0.15);
    var cols = ['255,80,80', '255,165,60', '255,230,100', '100,225,140', '90,165,255', '170,120,255'];
    for (var s = 0; s < 14; s++) {
      var x = W * (0.05 + r() * 0.9), w = W * (0.14 + r() * 0.22), yy = y0 + (r() - 0.5) * 8 * u, drift = Math.sin(t * 0.3 + s) * 2 * u;
      for (var k = 0; k < cols.length; k++) {
        var g = ctx.createLinearGradient(x - w / 2 + drift, 0, x + w / 2 + drift, 0);
        g.addColorStop(0, 'rgba(' + cols[k] + ',0)');
        g.addColorStop(0.5, 'rgba(' + cols[k] + ',0.5)');
        g.addColorStop(1, 'rgba(' + cols[k] + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - w / 2 + drift, yy + (k - 2.5) * 1.35 * u, w, 1.45 * u);
      }
    }
  }

  /* ---------- change moments ---------- */

  function jumper(ctx, W, H, t) {
    var u = W / 62;
    var x = W * (0.5 + J.dx * 0.25), gy = H * 0.905;
    var ph = (t * 0.9) % 1, up = Math.sin(ph * Math.PI) * 4.2 * u;
    pond(ctx, x, gy, 9 * u, 2 * u, t);
    if (ph < 0.3) {
      var sp = ph / 0.3;
      ctx.fillStyle = 'rgba(210,232,255,' + (0.95 * (1 - sp)) + ')';
      for (var d = 0; d < 7; d++) {
        var a = Math.PI + (d + 0.5) / 7 * Math.PI;
        circ(ctx, x + Math.cos(a) * (2 + sp * 5) * u, gy + Math.sin(a) * (1 + sp * 5) * u, 0.55 * u); ctx.fill();
      }
    }
    child(ctx, x, gy - 0.6 * u - up, u, up > 1.5 * u);
  }
  function hedgehog(ctx, W, H, t) {
    var u = W / 42;
    var f = 0.6 + J.dx * 0.25, x = f * W, gy = standY(f) * H;
    ctx.save();
    ctx.translate(x, gy);
    ctx.fillStyle = '#5A4030';
    ctx.beginPath();
    ctx.moveTo(-5 * u, 0);
    for (var k = 0; k <= 12; k++) {
      var a = Math.PI + k / 12 * Math.PI, am = a + Math.PI / 24;
      ctx.lineTo(Math.cos(a) * 4.6 * u, Math.sin(a) * 4.6 * u * 0.85);
      if (k < 12) ctx.lineTo(Math.cos(am) * 5.9 * u, Math.sin(am) * 5.9 * u * 0.85);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7A5A42';
    ell(ctx, -0.4 * u, -1.6 * u, 3.6 * u, 2.2 * u); ctx.fill();
    ctx.fillStyle = '#E6CDAE';
    ctx.beginPath(); ctx.moveTo(3 * u, -3.6 * u); ctx.quadraticCurveTo(5.6 * u, -2.8 * u, 7 * u, -0.9 * u); ctx.lineTo(3.4 * u, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1F2433';
    circ(ctx, 7 * u, -1 * u, 0.45 * u); ctx.fill();
    circ(ctx, 4.8 * u, -2.4 * u, 0.32 * u); ctx.fill();
    ctx.fillStyle = '#3A2A1A';
    ell(ctx, -2.4 * u, -0.1 * u, 0.8 * u, 0.4 * u); ctx.fill();
    ell(ctx, 2.6 * u, -0.1 * u, 0.8 * u, 0.4 * u); ctx.fill();
    ctx.restore();
  }
  function wallcat(ctx, W, H, t) {
    var u = W / 60;
    var top = H * 0.86 - 5 * u, x0 = W * 0.1, x1 = W * 0.66;
    ctx.fillStyle = '#9C4F3A';
    ctx.fillRect(x0, top, x1 - x0, H - top);
    ctx.strokeStyle = 'rgba(60,25,15,0.45)';
    ctx.lineWidth = Math.max(1, 0.2 * u);
    ctx.beginPath();
    for (var row = 0; row * 1.6 * u < H - top; row++) {
      var y = top + row * 1.6 * u;
      ctx.moveTo(x0, y); ctx.lineTo(x1, y);
      for (var bx = x0 + (row % 2) * 1.6 * u; bx < x1; bx += 3.2 * u) { ctx.moveTo(bx, y); ctx.lineTo(bx, y + 1.6 * u); }
    }
    ctx.stroke();
    ctx.fillStyle = '#B8BCC6';
    ctx.fillRect(x0 - 0.4 * u, top - 0.9 * u, x1 - x0 + 0.8 * u, 0.9 * u);
    var cx = W * (0.42 + J.dx * 0.15), cy = top - 0.9 * u, sw = Math.sin(t * 1.3) * 1.2 * u;
    ctx.strokeStyle = '#2A2D3A';
    ctx.lineWidth = Math.max(1.5, 0.75 * u);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 1.4 * u, cy - 0.6 * u); ctx.quadraticCurveTo(cx - 2.8 * u, cy + 2 * u, cx - 2.2 * u + sw, cy + 5 * u); ctx.stroke();
    ctx.fillStyle = '#2A2D3A';
    ell(ctx, cx, cy - 2.6 * u, 2.2 * u, 2.8 * u); ctx.fill();
    circ(ctx, cx + 0.6 * u, cy - 6.1 * u, 1.65 * u); ctx.fill();
    tri(ctx, cx - 0.6 * u, cy - 7 * u, cx - 0.4 * u, cy - 8.8 * u, cx + 0.6 * u, cy - 7.6 * u); ctx.fill();
    tri(ctx, cx + 0.9 * u, cy - 7.6 * u, cx + 1.9 * u, cy - 8.7 * u, cx + 2 * u, cy - 6.9 * u); ctx.fill();
    ctx.fillStyle = '#C8E86A';
    circ(ctx, cx + 0.2 * u, cy - 6.2 * u, 0.3 * u); ctx.fill();
    circ(ctx, cx + 1.3 * u, cy - 6.2 * u, 0.3 * u); ctx.fill();
  }
  function ladybird(ctx, W, H, t) {
    var u = W / 56;
    var x = W * (0.28 + J.dx * 0.2), gy = H * 0.97;
    ctx.fillStyle = '#4E9A45';
    ctx.beginPath(); ctx.moveTo(x - 1.3 * u, gy); ctx.quadraticCurveTo(x - 0.8 * u, gy - 12 * u, x + 3 * u, gy - 21 * u); ctx.quadraticCurveTo(x + 0.6 * u, gy - 11 * u, x + 1.3 * u, gy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3E7D3A';
    ctx.beginPath(); ctx.moveTo(x + 2 * u, gy); ctx.quadraticCurveTo(x + 3 * u, gy - 8 * u, x + 6 * u, gy - 12 * u); ctx.quadraticCurveTo(x + 3.6 * u, gy - 6 * u, x + 3.6 * u, gy); ctx.closePath(); ctx.fill();
    var p = 0.55 + Math.sin(t * 0.4) * 0.1, lx = x + (-0.1 + p * p * 2.2) * u, ly = gy - p * 18 * u;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(0.35 - p * 0.5);
    ctx.fillStyle = '#1F2433';
    circ(ctx, 0, -2.5 * u, 1.05 * u); ctx.fill();
    ctx.fillStyle = '#E23D3D';
    ell(ctx, 0, 0, 2 * u, 2.4 * u); ctx.fill();
    ctx.strokeStyle = '#1F2433';
    ctx.lineWidth = Math.max(1, 0.25 * u);
    ctx.beginPath(); ctx.moveTo(0, -2.3 * u); ctx.lineTo(0, 2.4 * u); ctx.stroke();
    ctx.fillStyle = '#1F2433';
    [[-0.9, -0.9], [0.9, -0.9], [-1.1, 0.6], [1.1, 0.6], [-0.5, 1.6], [0.5, 1.6]].forEach(function (s) { circ(ctx, s[0] * u, s[1] * u, 0.42 * u); ctx.fill(); });
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ell(ctx, -0.8 * u, -1.5 * u, 0.5 * u, 0.25 * u, -0.6); ctx.fill();
    ctx.restore();
  }
  /* legendary: red sky at night, shepherd's delight */
  function redsky(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H * 0.84);
    g.addColorStop(0, 'rgba(150,30,80,0.62)');
    g.addColorStop(0.45, 'rgba(235,70,60,0.55)');
    g.addColorStop(1, 'rgba(255,170,70,0.6)');
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.86);
    ctx.globalCompositeOperation = 'screen';
    var g2 = ctx.createLinearGradient(0, H * 0.4, 0, H * 0.86);
    g2.addColorStop(0, 'rgba(255,120,80,0)');
    g2.addColorStop(1, 'rgba(255,150,90,0.55)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, H * 0.4, W, H * 0.46);
    ctx.restore();
  }

  /* ---------- the list: name, layer, picture ---------- */

  add('kite', 'front', kite);
  add('balloon', 'front', balloon);
  add('sunflowers', 'ground', sunflowers);
  add('plane', 'front', plane);
  add('butterflies', 'front', butterflies);
  add('seeds', 'ground', seeds);
  add('greenflash', 'back', greenflash, { noSun: true });

  add('ripples', 'ground', ripples);
  add('umbrella', 'ground', umbrella);
  add('ducklings', 'ground', ducklings);
  add('boat', 'ground', boat);
  add('frog', 'ground', frog);
  add('snail', 'ground', snail);
  add('catsdogs', 'front', catsdogs);

  add('crystals', 'ground', crystals);
  add('snowman', 'ground', snowman);
  add('robin', 'ground', robin);
  add('sledge', 'ground', sledge);
  add('fox', 'ground', fox);
  add('igloo', 'ground', igloo);
  add('diamond', 'ground', diamond);

  add('windsock', 'ground', windsock);
  add('flyaway', 'front', flyaway);
  add('turbines', 'ground', turbines);
  add('washing', 'ground', washing);
  add('windmill', 'ground', windmill);
  add('hat', 'front', hat);
  add('sheep', 'front', sheep);

  add('cottage', 'ground', cottage);
  add('sprite', 'front', sprite);
  add('lighthouse', 'ground', lighthouse);
  add('scarecrow', 'ground', scarecrow);
  add('castle', 'ground', castle);
  add('elmo', 'ground', elmo);
  add('ball', 'ground', ballL);

  add('lamp', 'ground', lamp);
  add('wisps', 'ground', wisps);
  add('owl', 'ground', owl);
  add('web', 'ground', web);
  add('stag', 'ground', stag);
  add('ship', 'ground', ship);
  add('spectre', 'ground', spectre);

  add('shooting', 'back', shooting);
  add('plough', 'stars', plough);
  add('bats', 'front', bats);
  add('orion', 'stars', orion);
  add('lanterns', 'front', lanterns);
  add('milkyway', 'stars', milkyway);
  add('comet', 'back', comet);

  add('birds', 'front', birds);
  add('bubbles', 'front', bubbles);
  add('parachute', 'front', parachute);
  add('gold', 'ground', gold);
  add('firerainbow', 'back', firerainbow);

  add('rainbow', 'back', function (ctx, W, H) { rainbowArc(ctx, W, H, 'single', 0.85); });
  add('jumper', 'ground', jumper);
  add('hedgehog', 'ground', hedgehog);
  add('wallcat', 'ground', wallcat);
  add('ladybird', 'ground', ladybird);
  add('redsky', 'front', redsky);
})(typeof window !== 'undefined' ? window : globalThis);
