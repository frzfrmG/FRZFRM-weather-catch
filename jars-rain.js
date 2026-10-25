/* FRZFRM Weather Catch: the Rain row's own variants. Every jar has seven of its own; no picture is in two jars.
   Drawn with the kit in kit.js. */
(function (root) {
  'use strict';
  var K = root.WC && root.WC.kit;
  if (!K) return;
  var TAU = Math.PI * 2;
  var circ = K.circ, ell = K.ell, tri = K.tri, poly = K.poly, rr = K.rr, pen = K.pen, seg = K.seg, glow = K.glow, shade = K.shade;

  /* a few rain streaks in front of a picture, so it stands in the same rain as the jar */
  function rainOver(ctx, W, H, t, x0, x1, y0, y1, n, slant, a, seed) {
    var rnd = K.rand(seed || 5);
    pen(ctx, 'rgba(225,232,245,' + (a || 0.55) + ')', W / 260);
    for (var i = 0; i < n; i++) {
      var x = x0 + (x1 - x0) * rnd(), sp = 0.8 + rnd() * 0.5, len = (y1 - y0) * 0.12;
      var y = y0 + ((rnd() * (y1 - y0) + t * H * 0.5 * sp) % (y1 - y0));
      seg(ctx, x, y, x + len * (slant || 0.2), y + len);
    }
  }
  /* flood water over the bottom of the jar, from y down */
  function flood(ctx, W, H, y, t, col) {
    K.water(ctx, W, H, y, col || [92, 112, 140], t, 'rgba(220,232,250,0.45)');
    var rnd = K.rand(17);
    ctx.strokeStyle = 'rgba(230,240,255,0.5)';
    ctx.lineWidth = Math.max(1, W / 300);
    for (var i = 0; i < 5; i++) {
      var p = ((t * 0.7 + i * 0.2) % 1), x = W * (0.2 + rnd() * 0.6), yy = y + (H - y) * (0.2 + rnd() * 0.6);
      ell(ctx, x, yy, W * 0.02 * (0.3 + p * 1.5), W * 0.006 * (0.3 + p * 1.5)); ctx.stroke();
    }
  }

  /* ---------- Drizzle ---------- */

  /* a slug on a leaf, with its shiny trail */
  function slug(ctx, W, H, t) {
    var u = W / 52, g = K.at(W, H, 0.52), x = g.x, y = g.y - 0.6 * u;
    // the leaf
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.08);
    ctx.fillStyle = '#5E9A3A';
    ctx.beginPath();
    ctx.moveTo(-11 * u, 0.4 * u);
    ctx.quadraticCurveTo(-3 * u, -5 * u, 10 * u, -1 * u);
    ctx.quadraticCurveTo(2 * u, 3.6 * u, -11 * u, 0.4 * u);
    ctx.fill();
    pen(ctx, '#3E7A2A', 0.35 * u);
    ctx.beginPath(); ctx.moveTo(-11 * u, 0.4 * u); ctx.quadraticCurveTo(-1 * u, -1.2 * u, 10 * u, -1 * u); ctx.stroke();
    for (var v = -3; v <= 2; v++) seg(ctx, v * 2.6 * u, -0.6 * u - Math.abs(v) * 0.05 * u, v * 2.6 * u + 1.6 * u, -2.6 * u + Math.abs(v) * 0.3 * u);
    // slime trail
    pen(ctx, 'rgba(235,242,255,0.75)', 0.5 * u);
    ctx.beginPath(); ctx.moveTo(-9 * u, -0.2 * u); ctx.quadraticCurveTo(-5 * u, -2.2 * u, -1.5 * u, -1.6 * u); ctx.stroke();
    // the slug, stretching as it goes
    var str = 1 + Math.sin(t * 1.2) * 0.06;
    ctx.translate(2.6 * u, -1.9 * u);
    ctx.fillStyle = '#B98552';
    ctx.beginPath();
    ctx.moveTo(-4.6 * u * str, 0.6 * u);
    ctx.quadraticCurveTo(-4.4 * u * str, -0.8 * u, -1 * u, -1.4 * u);
    ctx.quadraticCurveTo(2.6 * u, -1.9 * u, 3.4 * u, -0.6 * u);
    ctx.quadraticCurveTo(3.6 * u, 0.6 * u, 2 * u, 0.7 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9A6A3E';
    ell(ctx, 0.9 * u, -1 * u, 1.9 * u, 0.7 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ell(ctx, -1.2 * u, -0.9 * u, 1.8 * u, 0.25 * u); ctx.fill();
    // eye stalks, waving
    var w = Math.sin(t * 2.2) * 0.25;
    pen(ctx, '#9A6A3E', 0.32 * u);
    seg(ctx, 2.8 * u, -0.9 * u, 3.6 * u + w * u, -3 * u);
    seg(ctx, 2.4 * u, -1 * u, 2.8 * u - w * u, -3.1 * u);
    ctx.fillStyle = '#3A2A1A';
    circ(ctx, 3.6 * u + w * u, -3.1 * u, 0.32 * u); ctx.fill();
    circ(ctx, 2.8 * u - w * u, -3.2 * u, 0.32 * u); ctx.fill();
    ctx.restore();
    // a drip landing on the leaf
    var p = (t * 0.8) % 1;
    if (p < 0.7) K.drop(ctx, x - 6 * u, y - 18 * u + p * 15 * u, 0.6 * u, 'rgba(200,220,245,0.85)');
  }

  /* wellies by the back door, with a puddle */
  function wellies(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.55), x = g.x, y = g.y;
    K.puddle(ctx, x + 2 * u, y - 0.2 * u, 9 * u, 1.4 * u, t);
    [[-2.9, '#F2C230', -0.04], [2.9, '#E8B820', 0.05]].forEach(function (b, i) {
      ctx.save();
      ctx.translate(x + b[0] * u, y - 0.4 * u);
      ctx.rotate(b[2]);
      ctx.fillStyle = b[1];
      rr(ctx, -2 * u, -9.5 * u, 4 * u, 9 * u, 1 * u); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-2 * u, -2.5 * u);
      ctx.lineTo(4.4 * u, -2.5 * u);
      ctx.quadraticCurveTo(5.4 * u, -2.3 * u, 5.2 * u, -0.4 * u);
      ctx.lineTo(-2 * u, -0.4 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3A3A44';
      rr(ctx, -2.2 * u, -0.8 * u, 7.6 * u, 1 * u, 0.4 * u); ctx.fill();
      ctx.fillStyle = shade(b[1], -0.25);
      rr(ctx, -2.1 * u, -9.9 * u, 4.2 * u, 1.1 * u, 0.5 * u); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      rr(ctx, -1.3 * u, -8.6 * u, 0.7 * u, 6 * u, 0.35 * u); ctx.fill();
      // drops running down
      var p = ((t * 0.5 + i * 0.4) % 1);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      circ(ctx, 1 * u, -8 * u + p * 6 * u, 0.35 * u); ctx.fill();
      ctx.restore();
    });
  }

  /* a grey heron, standing still in the shallows */
  function heron(ctx, W, H, t) {
    var u = W / 62, g = K.at(W, H, 0.58), x = g.x, y = g.y;
    K.puddle(ctx, x, y - 0.3 * u, 11 * u, 1.7 * u, t, 'rgba(120,150,190,0.6)');
    var bob = Math.max(0, Math.sin(t * 0.7)) * 0.6 * u;
    pen(ctx, '#8A6A3A', 0.4 * u);
    seg(ctx, x - 0.6 * u, y - 8 * u, x - 1 * u, y - 0.4 * u);
    seg(ctx, x + 0.6 * u, y - 8 * u, x + 0.9 * u, y - 0.4 * u);
    // body, a long grey oval tipped up
    ctx.fillStyle = '#9AA3AE';
    ell(ctx, x - 0.4 * u, y - 10.2 * u, 4.2 * u, 2.3 * u, -0.35); ctx.fill();
    ctx.fillStyle = '#6E7884';
    ell(ctx, x - 1.6 * u, y - 10.6 * u, 3 * u, 1.4 * u, -0.25); ctx.fill();
    ctx.fillStyle = '#3A3E48';
    tri(ctx, x - 4 * u, y - 9 * u, x - 6.2 * u, y - 8 * u, x - 3.6 * u, y - 8.2 * u); ctx.fill();
    // the S of the neck
    pen(ctx, '#E8ECF0', 1.3 * u);
    ctx.beginPath();
    ctx.moveTo(x + 2.6 * u, y - 11.6 * u);
    ctx.bezierCurveTo(x + 4.4 * u, y - 13 * u, x + 1.6 * u, y - 14.6 * u, x + 2.6 * u, y - 16.6 * u + bob);
    ctx.stroke();
    var hx = x + 3 * u, hy = y - 17.2 * u + bob;
    ctx.fillStyle = '#E8ECF0';
    ell(ctx, hx, hy, 1.4 * u, 1 * u); ctx.fill();
    ctx.fillStyle = '#2A2E38';
    poly(ctx, [hx - 1.2 * u, hy - 0.6 * u, hx + 0.6 * u, hy - 0.9 * u, hx - 3.4 * u, hy - 0.3 * u]); ctx.fill();
    ctx.fillStyle = '#E0B040';
    tri(ctx, hx + 0.8 * u, hy - 0.4 * u, hx + 5.2 * u, hy + 0.3 * u, hx + 0.8 * u, hy + 0.5 * u); ctx.fill();
    ctx.fillStyle = '#1F2433';
    circ(ctx, hx + 0.3 * u, hy - 0.2 * u, 0.3 * u); ctx.fill();
    // a reflection in the water
    ctx.fillStyle = 'rgba(160,170,185,0.3)';
    ell(ctx, x - 0.2 * u, y + 0.6 * u, 3 * u, 0.6 * u); ctx.fill();
  }

  /* an angler under a big green umbrella, line in the pond */
  function angler(ctx, W, H, t) {
    var u = W / 66, g = K.at(W, H, 0.38), x = g.x, y = g.y;
    var px = W * 0.68 + K.J().dx * W * 0.2, py = y + 0.4 * u;
    K.puddle(ctx, px, py, 10 * u, 1.8 * u, null, 'rgba(110,145,185,0.65)');
    // the umbrella, tipped towards the weather
    ctx.save();
    ctx.translate(x - 1 * u, y);
    ctx.rotate(-0.18);
    pen(ctx, '#4A4A50', 0.45 * u);
    seg(ctx, 0, 0, 0, -16 * u);
    ctx.fillStyle = '#3E6B3A';
    ctx.beginPath(); ctx.moveTo(-10 * u, -11.5 * u); ctx.quadraticCurveTo(0, -21 * u, 10 * u, -11.5 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2F5A2E';
    for (var k = -2; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * 5 * u, -11.5 * u); ctx.quadraticCurveTo((k + 0.5) * 5 * u, -13.2 * u, (k + 1) * 5 * u, -11.5 * u); ctx.fill(); }
    ctx.restore();
    // the angler on a stool
    pen(ctx, '#6B5030', 0.5 * u);
    seg(ctx, x - 1.4 * u, y, x + 0.8 * u, y - 3 * u); seg(ctx, x + 0.8 * u, y, x - 1.4 * u, y - 3 * u);
    var p = K.person(ctx, x, y, u, { pose: 'sit', seat: 3.2, coat: '#5E6B3A', legs: '#3A3E30', hat: 'beanie', hatCol: '#2F5A2E', arms: [0.4, 1.35], boots: '#2F4A2A' });
    // the rod and line
    var tipX = px - 2 * u, tipY = y - 15 * u;
    pen(ctx, '#3A2E26', 0.35 * u);
    seg(ctx, p.hand[0], p.hand[1], tipX, tipY);
    var bob = Math.sin(t * 2.5) * 0.3 * u;
    pen(ctx, 'rgba(255,255,255,0.7)', 0.18 * u);
    ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo(tipX + 2 * u, tipY + 6 * u, px + 1 * u, py - 0.8 * u + bob); ctx.stroke();
    ctx.fillStyle = '#E8432F';
    ell(ctx, px + 1 * u, py - 1 * u + bob, 0.5 * u, 0.7 * u); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ell(ctx, px + 1 * u, py - 1.5 * u + bob, 0.35 * u, 0.3 * u); ctx.fill();
  }

  /* a cottage window steamed up from the inside, with a smiley face wiped in it */
  function mistywindow(ctx, W, H, t) {
    var u = W / 58, g = K.at(W, H, 0.5, 0.2), x = g.x, y = g.y + 1 * u;
    // a stone cottage wall under a slate roof
    ctx.fillStyle = '#8C8A86';
    ctx.fillRect(x - 14 * u, y - 20 * u, 28 * u, 20 * u);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    var rnd = K.rand(71);
    for (var k = 0; k < 18; k++) { rr(ctx, x - 14 * u + rnd() * 26 * u, y - 20 * u + rnd() * 18 * u, (2 + rnd() * 2) * u, 1.4 * u, 0.5 * u); ctx.fill(); }
    ctx.fillStyle = '#3E4450';
    poly(ctx, [x - 16 * u, y - 19.4 * u, x + 16 * u, y - 19.4 * u, x + 13 * u, y - 23 * u, x - 13 * u, y - 23 * u]); ctx.fill();
    // the window: a warm room behind fogged glass
    var wx = x - 7.5 * u, wy = y - 16.5 * u, ww = 15 * u, wh = 11 * u;
    ctx.fillStyle = '#F2EEE6';
    ctx.fillRect(wx - 1.1 * u, wy - 1.1 * u, ww + 2.2 * u, wh + 2.2 * u);
    var gl = ctx.createLinearGradient(wx, wy, wx, wy + wh);
    gl.addColorStop(0, '#F6C978');
    gl.addColorStop(1, '#E09A4A');
    ctx.fillStyle = gl;
    ctx.fillRect(wx, wy, ww, wh);
    // curtains either side
    ctx.fillStyle = '#B8423A';
    ctx.fillRect(wx, wy, 2 * u, wh);
    ctx.fillRect(wx + ww - 2 * u, wy, 2 * u, wh);
    // the mist on the glass, thinner at the top
    var mg = ctx.createLinearGradient(wx, wy, wx, wy + wh);
    mg.addColorStop(0, 'rgba(236,240,246,0.55)');
    mg.addColorStop(1, 'rgba(236,240,246,0.88)');
    ctx.fillStyle = mg;
    ctx.fillRect(wx, wy, ww, wh);
    // the smiley, wiped clear: the warm room shows through the lines
    var cx = wx + ww * 0.5, cy = wy + wh * 0.5;
    pen(ctx, '#F2B860', 0.95 * u);
    ctx.beginPath(); ctx.arc(cx, cy, 3.6 * u, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + 0.3 * u, 2.1 * u, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#F2B860';
    circ(ctx, cx - 1.3 * u, cy - 1.2 * u, 0.55 * u); ctx.fill();
    circ(ctx, cx + 1.3 * u, cy - 1.2 * u, 0.55 * u); ctx.fill();
    // drips running down from it
    pen(ctx, 'rgba(242,184,96,0.9)', 0.4 * u);
    [[-2.6, 2.4], [2.2, 3], [0.4, 3.8]].forEach(function (d, i) {
      var len = (1.2 + ((t * 0.35 + i * 0.37) % 1) * 3) * u;
      seg(ctx, cx + d[0] * u, cy + d[1] * u, cx + d[0] * u, cy + d[1] * u + len);
    });
    // the sill
    ctx.fillStyle = '#E8E2D6';
    ctx.fillRect(wx - 2 * u, wy + wh + 1 * u, ww + 4 * u, 1.3 * u);
    rainOver(ctx, W, H, t, x - 14 * u, x + 14 * u, y - 22 * u, y, 10, 0.18, 0.45, 9);
  }


  /* ---------- Showers ---------- */

  /* a blackbird tugging a worm out of the wet grass */
  function blackbird(ctx, W, H, t) {
    var u = W / 58, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    var tug = Math.sin(t * 2.4) * 0.6 * u;
    var b = K.bird(ctx, x - tug * 0.5, y, 2.6 * u, { body: '#1E1E24', beak: '#F2A03A', tail: 'long', eye: '#F2A03A', legs: '#3A3A40' });
    // the worm, stretched from the beak to the ground
    pen(ctx, '#E59A8E', 0.6 * u);
    ctx.beginPath();
    var bx = b.head[0] + 1.9 * u, by = b.head[1] + 0.1 * u, gx = x + 6.5 * u, gy = y - 0.2 * u;
    ctx.moveTo(bx, by);
    ctx.bezierCurveTo(bx + 2.2 * u, by + 1 * u + tug, gx - 1 * u, gy - 4 * u, gx, gy);
    ctx.stroke();
    ctx.fillStyle = 'rgba(70,50,30,0.6)';
    ell(ctx, gx, gy + 0.2 * u, 1.3 * u, 0.4 * u); ctx.fill();
    K.grass(ctx, x - 7 * u, x + 9 * u, y, 1.2 * u, 'rgba(60,110,60,0.9)');
  }

  /* a wet dog shaking itself dry, drops everywhere */
  function wetdog(ctx, W, H, t) {
    var u = W / 62, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    var sh = Math.sin(t * 22) * 0.5 * u;
    ctx.save();
    ctx.translate(sh, 0);
    var d = K.dog(ctx, x, y, u, { col: '#C48A52', ear: 'flop', collar: '#2F7BD8', wag: t * 8 });
    ctx.restore();
    // shake lines and flying drops
    pen(ctx, 'rgba(255,255,255,0.75)', 0.35 * u);
    [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(x + s * 0.5 * u, y - 4 * u, 6 * u, s > 0 ? -0.5 : Math.PI - 0.5, s > 0 ? 0.4 : Math.PI + 0.4); ctx.stroke(); });
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI * 0.05 - i * Math.PI * 0.11, p = (t * 1.6 + i * 0.13) % 1;
      var r = (5 + p * 7) * u;
      K.drop(ctx, x + Math.cos(a) * r, y - 4 * u + Math.sin(a) * r * 0.8, 0.55 * u * (1 - p * 0.5), 'rgba(170,210,250,' + (0.9 - p * 0.6) + ')');
    }
    void d;
  }

  /* a sparrow splashing in a stone bird bath */
  function birdbath(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    ctx.fillStyle = '#B8B2A6';
    poly(ctx, [x - 2 * u, y, x + 2 * u, y, x + 1.2 * u, y - 7 * u, x - 1.2 * u, y - 7 * u]); ctx.fill();
    rr(ctx, x - 3.4 * u, y - 1 * u, 6.8 * u, 1.2 * u, 0.4 * u); ctx.fill();
    ctx.fillStyle = '#C9C3B6';
    ctx.beginPath(); ctx.moveTo(x - 7.5 * u, y - 8.6 * u); ctx.quadraticCurveTo(x, y - 4.4 * u, x + 7.5 * u, y - 8.6 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9FC2E8';
    ell(ctx, x, y - 8.6 * u, 7.3 * u, 0.9 * u); ctx.fill();
    ctx.fillStyle = '#A8A296';
    ctx.fillRect(x - 7.7 * u, y - 9 * u, 15.4 * u, 0.6 * u);
    var hop = Math.max(0, Math.sin(t * 5)) * 0.6 * u;
    K.bird(ctx, x + 1.4 * u, y - 8.4 * u, 1.9 * u, { body: '#9A7450', belly: '#D9CDB6', cap: '#7E7A80', face: '#C9BCA6', wing: '#7A5A3A', beak: '#4A3A2A', hop: hop, dir: -1 });
    // splashes
    var p = (t * 2) % 1;
    ctx.fillStyle = 'rgba(200,225,255,' + (0.9 - p * 0.8) + ')';
    for (var i = -2; i <= 2; i++) { circ(ctx, x + 1.4 * u + i * (1 + p * 2) * u, y - 9 * u - Math.sin((i + 2.5) / 5 * Math.PI) * (1 + p * 3) * u, 0.4 * u); ctx.fill(); }
  }

  /* a dark shaft of rain hanging from a cloud far off, with the sun out between */
  function rainshaft(ctx, W, H, t) {
    var x = W * (0.36 + K.J().dx * 0.3), top = H * 0.42, bot = H * 0.86, w = W * 0.2;
    var g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(80,92,118,0.75)');
    g.addColorStop(1, 'rgba(80,92,118,0.25)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, top);
    ctx.lineTo(x + w * 0.5, top);
    ctx.lineTo(x + w * 0.62, bot);
    ctx.lineTo(x - w * 0.3, bot);
    ctx.closePath();
    ctx.fill();
    pen(ctx, 'rgba(200,210,230,0.35)', W / 300);
    for (var i = 0; i < 9; i++) {
      var f = i / 8, sx = x - w * 0.45 + w * 0.9 * f, off = Math.sin(t * 3 + i) * W * 0.004;
      seg(ctx, sx + off, top + H * 0.02, sx + w * 0.12 + off, bot - H * 0.01);
    }
    K.cloud(ctx, x - w * 0.62, top + H * 0.005, w * 0.62, 'rgba(96,106,128,0.98)');
    K.cloud(ctx, x - w * 0.15, top - H * 0.02, w * 0.5, 'rgba(110,120,142,0.98)');
  }

  /* a kid on a bike riding straight through a puddle */
  function puddlebike(ctx, W, H, t) {
    var u = W / 62, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    K.puddle(ctx, x, y - 0.3 * u, 12 * u, 1.8 * u, null);
    var b = K.bike(ctx, x, y, u, { col: '#E8432F' });
    K.person(ctx, b.seat[0] + 0.3 * u, b.pedal[1] + 0.6 * u, u, { pose: 'sit', seat: (b.pedal[1] + 0.6 * u - b.seat[1]) / u, coat: '#F2C230', legs: '#2C3550', hat: 'hood', kid: true, arms: [1.2, 1.25] });
    // two fans of water off the wheels
    [b.back, b.front].forEach(function (wx, i) {
      var p = (t * 2 + i * 0.5) % 1;
      pen(ctx, 'rgba(210,230,255,' + (0.85 - p * 0.5) + ')', 0.5 * u);
      for (var k = 0; k < 5; k++) {
        var a = Math.PI * (1.15 + k * 0.17), r = (2.5 + p * 4 + k * 0.4) * u;
        seg(ctx, wx + Math.cos(a) * 2 * u, y - 0.8 * u + Math.sin(a) * 1 * u, wx + Math.cos(a) * r, y - 0.8 * u + Math.sin(a) * r * 0.8);
      }
    });
  }

  /* virga: wisps of rain trailing under a cloud that dry up before they reach the ground */
  function virga(ctx, W, H, t) {
    var x = W * (0.55 + K.J().dx * 0.3), y = H * 0.46, w = W * 0.32;
    for (var i = 0; i < 12; i++) {
      var f = i / 11, sx = x - w * 0.42 + w * 0.84 * f, len = H * (0.13 + 0.07 * Math.sin(i * 2.3 + 1));
      var g = ctx.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, 'rgba(96,108,138,0.85)');
      g.addColorStop(0.6, 'rgba(96,108,138,0.4)');
      g.addColorStop(1, 'rgba(96,108,138,0)');
      pen(ctx, g, W * 0.02);
      var sway = Math.sin(t * 0.8 + i) * W * 0.012;
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.quadraticCurveTo(sx + W * 0.01, y + len * 0.55, sx - W * 0.07 + sway, y + len);
      ctx.stroke();
    }
    K.cloud(ctx, x - w * 0.58, y - H * 0.005, w * 0.44, 'rgba(112,122,148,0.98)');
    K.cloud(ctx, x - w * 0.12, y - H * 0.035, w * 0.42, 'rgba(128,138,162,0.98)');
    K.cloud(ctx, x - w * 0.36, y - H * 0.045, w * 0.3, 'rgba(142,152,176,0.98)');
  }


  /* ---------- Downpour ---------- */

  /* a drainpipe gushing into a puddle */
  function drainpipe(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.34, 0.2), x = g.x, y = g.y;
    // a corner of a brick wall, with the gutter along the top
    ctx.fillStyle = '#A85A44';
    ctx.fillRect(x - 14 * u, y - 26 * u, 12 * u, 26 * u);
    ctx.fillStyle = 'rgba(70,30,20,0.35)';
    for (var r = 0; r < 12; r++) ctx.fillRect(x - 14 * u, y - 26 * u + r * 2.2 * u, 12 * u, 0.25 * u);
    ctx.fillStyle = '#3A3E48';
    ctx.fillRect(x - 15 * u, y - 27 * u, 14.6 * u, 1.6 * u);
    // the pipe down the wall and its spout
    ctx.fillStyle = '#4A505C';
    ctx.fillRect(x - 3.4 * u, y - 26 * u, 2 * u, 22 * u);
    ctx.save();
    ctx.translate(x - 2.4 * u, y - 4.6 * u);
    ctx.rotate(-0.6);
    ctx.fillRect(-1 * u, -0.2 * u, 2 * u, 3.6 * u);
    ctx.restore();
    // the water: a thick arc and a splash
    var sx = x - 0.4 * u, sy = y - 3 * u;
    pen(ctx, 'rgba(200,222,250,0.9)', 1.5 * u);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 4 * u, sy - 0.5 * u, sx + 6 * u, y - 0.4 * u); ctx.stroke();
    pen(ctx, 'rgba(255,255,255,0.6)', 0.4 * u);
    for (var k = 0; k < 3; k++) { var p = (t * 3 + k / 3) % 1; seg(ctx, sx + p * 5 * u, sy + p * p * 2.6 * u - 0.4 * u, sx + p * 5 * u + 0.8 * u, sy + p * p * 2.6 * u); }
    K.puddle(ctx, x + 7 * u, y - 0.2 * u, 7 * u, 1.3 * u, t);
    K.splash(ctx, x + 6 * u, y - 0.3 * u, 2.2 * u, t);
    // the gutter spilling over too
    var q = (t * 1.5) % 1;
    ctx.fillStyle = 'rgba(200,222,250,0.85)';
    circ(ctx, x - 9 * u, y - 25 * u + q * 8 * u, 0.4 * u); ctx.fill();
  }

  /* a car through a deep puddle, a wave of spray off the side */
  function carsplash(ctx, W, H, t) {
    var u = W / 62, g = K.at(W, H, 0.42), x = g.x, y = g.y;
    K.puddle(ctx, x + 3 * u, y - 0.2 * u, 16 * u, 2 * u, null, 'rgba(110,140,180,0.7)');
    var c = K.car(ctx, x, y, u, { col: '#3A7BD5', lights: true });
    // the wave of spray behind the front wheel
    var p = (t * 1.2) % 1;
    for (var k = 0; k < 3; k++) {
      var f = (p + k / 3) % 1;
      ctx.fillStyle = 'rgba(215,232,255,' + (0.75 * (1 - f)) + ')';
      ctx.beginPath();
      var bx = x + 5 * u, rx = (4 + f * 7) * u, ry = (4 + f * 6) * u;
      ctx.moveTo(bx, y - 0.8 * u);
      ctx.quadraticCurveTo(bx + rx * 0.4, y - ry, bx + rx, y - ry * 0.6);
      ctx.quadraticCurveTo(bx + rx * 0.7, y - ry * 0.3, bx + rx * 0.9, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(235,244,255,0.9)';
    for (var i = 0; i < 8; i++) { var a = -0.2 - i * 0.18, r = (6 + ((t * 2 + i * 0.3) % 1) * 6) * u; circ(ctx, x + 6 * u + Math.cos(a) * r, y - 2 * u + Math.sin(a) * r * 0.7, 0.45 * u); ctx.fill(); }
    // headlight beams in the gloom
    glow(ctx, c.front[0] + 1 * u, c.front[1], 5 * u, [255, 245, 200], 0.5);
  }

  /* someone running for cover with a newspaper over their head */
  function runcover(ctx, W, H, t) {
    var u = W / 62, g = K.at(W, H, 0.5), x = g.x + Math.sin(t * 0.8) * 0.8 * u, y = g.y;
    var p = K.person(ctx, x, y - Math.abs(Math.sin(t * 9)) * 0.8 * u, u, { pose: 'run', coat: '#C84A3A', legs: '#2C3550', hair: '#2A1E18', arms: [2.65, 2.45], lean: 0.25 });
    // the newspaper held up as a roof
    var hx = (p.hand[0] + p.hand2[0]) / 2, hy = Math.min(p.hand[1], p.hand2[1]) - 0.3 * u;
    ctx.fillStyle = '#F2F0EA';
    poly(ctx, [hx - 4.4 * u, hy + 1 * u, hx, hy - 1 * u, hx + 4.4 * u, hy + 1.2 * u, hx, hy + 0.2 * u]); ctx.fill();
    pen(ctx, 'rgba(60,60,70,0.55)', 0.22 * u);
    for (var k = 0; k < 3; k++) seg(ctx, hx + 1 * u, hy + 0.2 * u - k * 0.4 * u, hx + 3.6 * u, hy + 1 * u - k * 0.3 * u);
    K.splash(ctx, x + 3 * u, y - 0.2 * u, 1.8 * u, t * 1.6);
    rainOver(ctx, W, H, t, x - 9 * u, x + 9 * u, y - 22 * u, y, 14, 0.28, 0.5, 3);
  }

  /* a duck paddling past a park bench, deep in floodwater */
  function floodduck(ctx, W, H, t) {
    var u = W / 62, x = W * (0.5 + K.J().dx * 0.3), wy = H * 0.84;
    // the bench, only its back above the water, and a lamp post
    pen(ctx, '#3A3E48', 0.6 * u);
    seg(ctx, x - 9 * u, wy, x - 9 * u, wy - 6 * u);
    seg(ctx, x + 3 * u, wy, x + 3 * u, wy - 6 * u);
    ctx.fillStyle = '#8A5A34';
    for (var k = 0; k < 2; k++) rr(ctx, x - 10 * u, wy - 5.8 * u + k * 2.2 * u, 14 * u, 1.3 * u, 0.4 * u), ctx.fill();
    ctx.fillStyle = '#2E333D';
    ctx.fillRect(x + 9 * u, wy - 22 * u, 1 * u, 22 * u);
    ctx.fillRect(x + 7.6 * u, wy - 23 * u, 3.8 * u, 1.6 * u);
    glow(ctx, x + 9.5 * u, wy - 21.5 * u, 3 * u, [255, 220, 150], 0.5);
    flood(ctx, W, H, wy, t);
    var dx = Math.sin(t * 0.4) * 3 * u;
    K.swimmer(ctx, x - 2 * u + dx, wy + 2.6 * u, 2.8 * u, 'duck', 1, t);
  }

  /* a curtain of rain sweeping in: a dark wall of rain with a sharp edge, and brighter sky beyond it */
  function raincurtain(ctx, W, H, t) {
    var edge = W * (0.5 + Math.sin(t * 0.25) * 0.04 + K.J().dx * 0.3), top = H * 0.2, bot = H * 0.9;
    ctx.fillStyle = 'rgba(205,214,232,0.28)';
    ctx.fillRect(edge, top, W - edge, bot - top);
    var g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(26,30,44,0.9)');
    g.addColorStop(1, 'rgba(40,46,64,0.7)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(edge + W * 0.08, top);
    for (var i = 0; i <= 12; i++) { var f = i / 12; ctx.lineTo(edge + W * 0.08 - f * W * 0.16 + Math.sin(f * 11 + t * 2) * W * 0.012, top + (bot - top) * f); }
    ctx.lineTo(0, bot);
    ctx.closePath();
    ctx.fill();
    pen(ctx, 'rgba(215,222,238,0.55)', W / 240);
    var rnd = K.rand(41);
    for (var k = 0; k < 46; k++) {
      var f2 = rnd(), yy = top + ((rnd() * (bot - top) + t * H * 0.9) % (bot - top));
      var xx = f2 * (edge + W * 0.06 - (yy - top) / (bot - top) * W * 0.16);
      seg(ctx, xx, yy, xx - W * 0.014, yy + H * 0.06);
    }
    // the ragged edge of it, catching the light
    pen(ctx, 'rgba(225,230,245,0.35)', W / 120);
    ctx.beginPath();
    for (var j = 0; j <= 12; j++) { var f3 = j / 12, ex = edge + W * 0.08 - f3 * W * 0.16 + Math.sin(f3 * 11 + t * 2) * W * 0.012; if (j) ctx.lineTo(ex, top + (bot - top) * f3); else ctx.moveTo(ex, top); }
    ctx.stroke();
  }


  /* a bucket left out, overflowing */
  function bucket(ctx, W, H, t) {
    var u = W / 58, g = K.at(W, H, 0.52), x = g.x, y = g.y;
    K.puddle(ctx, x, y - 0.2 * u, 11 * u, 1.8 * u, t);
    ctx.fillStyle = '#9AA3B0';
    poly(ctx, [x - 6 * u, y - 10 * u, x + 6 * u, y - 10 * u, x + 4.6 * u, y - 0.4 * u, x - 4.6 * u, y - 0.4 * u]); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    poly(ctx, [x - 4.6 * u, y - 10 * u, x - 2.8 * u, y - 10 * u, x - 2.4 * u, y - 0.4 * u, x - 3.6 * u, y - 0.4 * u]); ctx.fill();
    pen(ctx, '#7A8290', 0.5 * u);
    seg(ctx, x - 5.4 * u, y - 6.8 * u, x + 5.4 * u, y - 6.8 * u);
    seg(ctx, x - 5 * u, y - 3.6 * u, x + 5 * u, y - 3.6 * u);
    // the handle
    pen(ctx, '#6A7280', 0.4 * u);
    ctx.beginPath(); ctx.arc(x, y - 10 * u, 6 * u, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    // brimful water and the overflow
    ctx.fillStyle = '#A8CBF0';
    ell(ctx, x, y - 10 * u, 6 * u, 1.1 * u); ctx.fill();
    var p = (t * 0.8) % 1;
    ctx.strokeStyle = 'rgba(235,244,255,' + (0.8 * (1 - p)) + ')';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ell(ctx, x + 1 * u, y - 10 * u, (0.5 + p * 3) * u, (0.1 + p * 0.6) * u); ctx.stroke();
    pen(ctx, 'rgba(200,222,250,0.85)', 0.7 * u);
    [-1, 1].forEach(function (s, i) {
      ctx.beginPath(); ctx.moveTo(x + s * 5.8 * u, y - 10 * u); ctx.quadraticCurveTo(x + s * 6.4 * u, y - 7 * u, x + s * (5.4 + i * 0.4) * u, y - 0.6 * u); ctx.stroke();
    });
    K.drop(ctx, x - 1.5 * u, y - 14 * u + ((t * 1.3) % 1) * 4 * u, 0.6 * u);
  }

  /* legendary: Noah's Ark afloat, the giraffes peeking out */
  function ark(ctx, W, H, t) {
    var u = W / 66, x = W * (0.5 + K.J().dx * 0.2), wy = H * 0.86;
    var bob = Math.sin(t * 1.1) * 0.5 * u, rock = Math.sin(t * 0.9) * 0.03;
    ctx.save();
    ctx.translate(x, wy + bob);
    ctx.rotate(rock);
    // the hull
    ctx.fillStyle = '#7A4A2A';
    ctx.beginPath();
    ctx.moveTo(-18 * u, -6 * u);
    ctx.lineTo(18 * u, -6 * u);
    ctx.quadraticCurveTo(15 * u, 1.5 * u, 0, 1.5 * u);
    ctx.quadraticCurveTo(-15 * u, 1.5 * u, -18 * u, -6 * u);
    ctx.fill();
    pen(ctx, 'rgba(50,28,14,0.45)', 0.3 * u);
    for (var k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-17 * u + k * 0.6 * u, -6 * u + k * 1.8 * u); ctx.quadraticCurveTo(0, -4.4 * u + k * 1.8 * u, 17 * u - k * 0.6 * u, -6 * u + k * 1.8 * u); ctx.stroke(); }
    // the house on deck
    ctx.fillStyle = '#A8703E';
    ctx.fillRect(-10 * u, -12 * u, 20 * u, 6 * u);
    ctx.fillStyle = '#6A3E22';
    poly(ctx, [-12 * u, -11.6 * u, 0, -15.6 * u, 12 * u, -11.6 * u]); ctx.fill();
    ctx.fillStyle = '#3A2414';
    [-6, 0, 6].forEach(function (wx) { rr(ctx, wx * u - 1.2 * u, -10.6 * u, 2.4 * u, 2.4 * u, 0.6 * u); ctx.fill(); });
    // an elephant's trunk out of one window
    pen(ctx, '#9AA0AA', 0.9 * u);
    ctx.beginPath(); ctx.moveTo(6 * u, -9.4 * u); ctx.quadraticCurveTo(9 * u, -9 * u, 8.6 * u, -6.8 * u + Math.sin(t * 1.5) * 0.4 * u); ctx.stroke();
    // two giraffes through the roof
    [[-3.6, 0], [1.8, 1]].forEach(function (gf) {
      var gx = gf[0] * u, nb = Math.sin(t * 0.9 + gf[1]) * 0.4 * u;
      ctx.fillStyle = '#E8B85A';
      poly(ctx, [gx - 0.8 * u, -14 * u, gx + 0.8 * u, -14 * u, gx + 1 * u + nb, -22 * u, gx - 0.2 * u + nb, -22 * u]); ctx.fill();
      ell(ctx, gx + 1.2 * u + nb, -22.4 * u, 1.9 * u, 1 * u, 0.2); ctx.fill();
      ctx.fillStyle = '#A8682E';
      circ(ctx, gx + 0.1 * u, -16.6 * u, 0.4 * u); ctx.fill();
      circ(ctx, gx + 0.5 * u + nb * 0.6, -19 * u, 0.35 * u); ctx.fill();
      pen(ctx, '#A8682E', 0.3 * u);
      seg(ctx, gx + 0.2 * u + nb, -23 * u, gx - 0.1 * u + nb, -24.6 * u);
      seg(ctx, gx + 1 * u + nb, -23.2 * u, gx + 1.1 * u + nb, -24.8 * u);
      ctx.fillStyle = '#1F2433';
      circ(ctx, gx + 1.6 * u + nb, -22.7 * u, 0.25 * u); ctx.fill();
    });
    ctx.restore();
    flood(ctx, W, H, wy, t, [86, 104, 132]);
  }

  /* ---------- Sideways Rain ---------- */

  /* someone leaning right into the wind, hood up */
  function leaner(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.55), x = g.x, y = g.y;
    var gust = Math.sin(t * 1.7) * 0.05;
    K.person(ctx, x, y, u, { pose: 'apart', dir: -1, lean: 0.5 + gust, coat: '#2F8A6A', legs: '#2C3550', hat: 'hood', scarf: '#E8C23A', scarfFly: true, arms: [0.3, 0.9] });
    rainOver(ctx, W, H, t, x - 14 * u, x + 10 * u, y - 22 * u, y, 18, 1.6, 0.6, 7);
  }

  /* trees bent right over */
  function benttrees(ctx, W, H, t) {
    var u = W / 62;
    [[0.3, 13, 5], [0.55, 17, 6.5], [0.74, 11, 4.5]].forEach(function (tr, i) {
      var g = K.at(W, H, tr[0], 0.2);
      var sway = Math.sin(t * 2.2 + i * 1.3) * 1 * u;
      K.tree(ctx, g.x, g.y, u, { kind: 'round', h: tr[1], bend: tr[2] + sway / u, col: i === 1 ? '#4A8A44' : '#3E7A3E' });
      ctx.fillStyle = 'rgba(80,140,70,0.85)';
      for (var k = 0; k < 3; k++) { var p = (t * 0.9 + k * 0.33 + i * 0.2) % 1; ell(ctx, g.x + (tr[2] + 3 + p * 14) * u, g.y - tr[1] * u * 0.75 + p * 3 * u, 0.7 * u, 0.35 * u, p * 6); ctx.fill(); }
    });
  }

  /* a wheelie bin knocked flat by the wind, its lid flapping and the rubbish blowing off */
  function wheeliebin(ctx, W, H, t) {
    var u = W / 58, g = K.at(W, H, 0.44), x = g.x, y = g.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.08);
    // lying on its back, the bottom towards us: a tall box on its side
    K.shadow(ctx, 0, 0, 11 * u, 1.2 * u);
    ctx.fillStyle = '#2F6A3A';
    poly(ctx, [-10 * u, -0.6 * u, 5 * u, -0.6 * u, 6 * u, -7.8 * u, -10 * u, -6.6 * u]); ctx.fill();
    ctx.fillStyle = '#3A7A46';
    poly(ctx, [-10 * u, -6.6 * u, 6 * u, -7.8 * u, 5.6 * u, -8.8 * u, -9.6 * u, -7.6 * u]); ctx.fill();
    // the handle and wheels at the bottom end
    ctx.fillStyle = '#22262F';
    rr(ctx, -11.2 * u, -7 * u, 1.4 * u, 5 * u, 0.5 * u); ctx.fill();
    K.wheel(ctx, -9.6 * u, -1.8 * u, 1.5 * u);
    K.wheel(ctx, -9.6 * u, -6.6 * u, 1.2 * u);
    // the lid, open and banging in the wind
    var a = -0.4 - Math.abs(Math.sin(t * 3.6)) * 1.1;
    ctx.translate(5.6 * u, -0.8 * u);
    ctx.rotate(a);
    ctx.fillStyle = '#25562E';
    rr(ctx, 0, -8 * u, 1.3 * u, 8.6 * u, 0.5 * u); ctx.fill();
    ctx.restore();
    // rubbish blowing away: paper, a can and a crisp packet
    for (var i = 0; i < 5; i++) {
      var p = (t * 0.4 + i * 0.2) % 1, px = x + (7 + p * 26) * u, py = y - (2 + (i % 3) * 2.2 + Math.sin(p * 7 + i) * 1.6) * u - p * 7 * u;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p * 10 + i);
      ctx.fillStyle = ['#F2F0E8', '#D8432F', '#3E8ED8', '#F2F0E8', '#F2C230'][i];
      if (i === 1) { rr(ctx, -0.6 * u, -1 * u, 1.2 * u, 2 * u, 0.3 * u); ctx.fill(); }
      else ctx.fillRect(-1.2 * u, -0.8 * u, 2.4 * u, 1.6 * u);
      ctx.restore();
    }
  }


  /* a festival tent in the wind, its flysheet flapping */
  function tent(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    // guy ropes and pegs
    pen(ctx, 'rgba(240,240,240,0.8)', 0.25 * u);
    seg(ctx, x - 7 * u, y - 6 * u, x - 13 * u, y); seg(ctx, x + 7 * u, y - 6 * u, x + 13 * u, y);
    ctx.fillStyle = '#E8792F';
    ctx.beginPath(); ctx.moveTo(x - 10 * u, y); ctx.quadraticCurveTo(x - 9 * u, y - 11 * u, x, y - 11.5 * u); ctx.quadraticCurveTo(x + 9 * u, y - 11 * u, x + 10 * u, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#C85A1F';
    ctx.beginPath(); ctx.moveTo(x - 3 * u, y); ctx.quadraticCurveTo(x - 2 * u, y - 7 * u, x, y - 7.4 * u); ctx.quadraticCurveTo(x + 2 * u, y - 7 * u, x + 3 * u, y); ctx.closePath(); ctx.fill();
    pen(ctx, '#A84A18', 0.3 * u);
    ctx.beginPath(); ctx.moveTo(x - 10 * u, y); ctx.quadraticCurveTo(x, y - 18 * u, x + 10 * u, y); ctx.stroke();
    // the loose corner of the flysheet
    var f = Math.sin(t * 7) * 1.2;
    ctx.fillStyle = '#F2A04A';
    ctx.beginPath();
    ctx.moveTo(x + 6 * u, y - 7 * u);
    ctx.quadraticCurveTo(x + 11 * u, y - (9 + f) * u, x + 14 * u, y - (6 + f * 1.6) * u);
    ctx.quadraticCurveTo(x + 11 * u, y - (4 + f * 0.6) * u, x + 8.4 * u, y - 3.4 * u);
    ctx.closePath();
    ctx.fill();
    // bunting on a pole
    pen(ctx, '#5A4A3A', 0.4 * u);
    seg(ctx, x - 13 * u, y, x - 13 * u, y - 16 * u);
    var cols = ['#E8432F', '#F2C230', '#3E8ED8', '#5BC46F'];
    for (var k = 0; k < 4; k++) {
      var bx = x - 13 * u + (k + 0.5) * 2.6 * u, by = y - 15.6 * u + k * 0.9 * u, fl = Math.sin(t * 8 + k) * 0.6 * u;
      ctx.fillStyle = cols[k];
      tri(ctx, bx - 1.1 * u, by, bx + 1.1 * u, by + 0.4 * u, bx + fl * 0.3, by + 2.2 * u + fl * 0.2); ctx.fill();
    }
    pen(ctx, 'rgba(240,240,240,0.7)', 0.2 * u);
    seg(ctx, x - 13 * u, y - 15.8 * u, x - 2 * u, y - 12 * u);
  }

  /* the sea hitting the prom, spray bursting over the railing */
  function seawall(ctx, W, H, t) {
    var u = W / 60, top = H * 0.8;
    K.water(ctx, W, H, top, [70, 98, 128], t);
    // the promenade wall and railing, in front
    var wx = W * (0.42 + K.J().dx * 0.2);
    ctx.fillStyle = '#8E8A82';
    ctx.fillRect(wx, top - 2 * u, W - wx, H - top + 2 * u);
    ctx.fillStyle = '#A8A49A';
    ctx.fillRect(wx, top - 2.6 * u, W - wx, 1.2 * u);
    pen(ctx, '#2F4A6A', 0.45 * u);
    seg(ctx, wx + 1 * u, top - 8 * u, W, top - 8 * u);
    seg(ctx, wx + 1 * u, top - 5.4 * u, W, top - 5.4 * u);
    for (var k = 0; k < 6; k++) seg(ctx, wx + (1 + k * 4) * u, top - 2.6 * u, wx + (1 + k * 4) * u, top - 8.2 * u);
    // the burst of spray, building and falling
    var p = (t * 0.45) % 1, h = Math.sin(p * Math.PI) * 22 * u;
    var g = ctx.createLinearGradient(0, top - h, 0, top);
    g.addColorStop(0, 'rgba(255,255,255,0.15)');
    g.addColorStop(1, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(wx - 6 * u, top);
    ctx.quadraticCurveTo(wx - 4 * u, top - h * 0.8, wx + 2 * u, top - h);
    ctx.quadraticCurveTo(wx + 9 * u, top - h * 1.05, wx + 12 * u, top - h * 0.6);
    ctx.quadraticCurveTo(wx + 6 * u, top - h * 0.3, wx + 4 * u, top);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    var rnd = K.rand(61);
    for (var i = 0; i < 12; i++) { var a = rnd(); circ(ctx, wx - 4 * u + a * 18 * u, top - h * (0.4 + rnd() * 0.7), (0.3 + rnd() * 0.4) * u); ctx.fill(); }
  }

  /* legendary: a seagull blown backwards, looking very surprised */
  function backgull(ctx, W, H, t) {
    var u = W / 56, x = W * (0.5 + K.J().dx * 0.4) + Math.sin(t * 0.6) * 3 * u, y = H * (0.52 + K.J().dy * 0.4) + Math.sin(t * 1.3) * 1.2 * u;
    // speed lines going the wrong way: it's moving tail first, to the right
    pen(ctx, 'rgba(255,255,255,0.7)', 0.35 * u);
    for (var k = 0; k < 4; k++) { var sy = y - 3 * u + k * 2 * u; seg(ctx, x - 14 * u - k * u, sy, x - 7 * u - k * 0.5 * u, sy); }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.12 + Math.sin(t * 3) * 0.06);
    // wings flung forward
    var fl = Math.sin(t * 6) * 0.6 * u;
    ctx.fillStyle = '#B8C0CC';
    ctx.beginPath(); ctx.moveTo(-1 * u, -1 * u); ctx.quadraticCurveTo(-6 * u, -7 * u - fl, -11 * u, -6 * u - fl); ctx.quadraticCurveTo(-6 * u, -3 * u, -1 * u, 0.6 * u); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1 * u, -1 * u); ctx.quadraticCurveTo(-2 * u, -8 * u + fl, -6 * u, -9 * u + fl); ctx.quadraticCurveTo(-3 * u, -4 * u, 1.6 * u, 0.4 * u); ctx.fill();
    ctx.fillStyle = '#2A2E3A';
    tri(ctx, -11 * u, -6 * u - fl, -8.6 * u, -6.6 * u - fl, -9.4 * u, -5 * u - fl); ctx.fill();
    // body and tail
    ctx.fillStyle = '#F6F7F9';
    ell(ctx, 0, 0, 5.4 * u, 2.6 * u, 0.1); ctx.fill();
    ctx.fillStyle = '#DDE2E8';
    tri(ctx, 4.6 * u, -0.6 * u, 8 * u, 0.6 * u, 4.6 * u, 1.4 * u); ctx.fill();
    // the head, facing the way it should be going, with big eyes
    ctx.fillStyle = '#F6F7F9';
    circ(ctx, -5 * u, -1.6 * u, 2.2 * u); ctx.fill();
    ctx.fillStyle = '#F2C230';
    tri(ctx, -6.8 * u, -1.4 * u, -10 * u, -0.6 * u, -6.8 * u, -0.2 * u); ctx.fill();
    ctx.fillStyle = '#D8432F';
    circ(ctx, -8.8 * u, -0.6 * u, 0.3 * u); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    circ(ctx, -5.6 * u, -2.4 * u, 0.95 * u); ctx.fill();
    ctx.fillStyle = '#1F2433';
    circ(ctx, -5.9 * u, -2.4 * u, 0.45 * u); ctx.fill();
    // a feather torn loose
    ctx.restore();
    var p = (t * 0.6) % 1;
    ctx.save();
    ctx.translate(x + 8 * u + p * 14 * u, y + 2 * u - Math.sin(p * 6) * 2 * u);
    ctx.rotate(p * 8);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ell(ctx, 0, 0, 1.6 * u, 0.5 * u); ctx.fill();
    ctx.restore();
  }

  /* ---------- Cloudburst ---------- */

  /* a football floating away down a flooded street */
  function football(ctx, W, H, t) {
    var u = W / 60, wy = H * 0.85, x = W * (0.5 + K.J().dx * 0.3) + Math.sin(t * 0.5) * 4 * u;
    // a street sign and a lamp post sticking out of the water
    ctx.fillStyle = '#3A3E48';
    ctx.fillRect(W * 0.24, wy - 14 * u, 0.8 * u, 14 * u);
    ctx.fillStyle = '#F2F2F2';
    rr(ctx, W * 0.24 - 3 * u, wy - 15 * u, 6.8 * u, 2.6 * u, 0.4 * u); ctx.fill();
    pen(ctx, '#2A2E38', 0.2 * u);
    rr(ctx, W * 0.24 - 2.7 * u, wy - 14.7 * u, 6.2 * u, 2 * u, 0.3 * u); ctx.stroke();
    ctx.fillStyle = '#2A2E38';
    ctx.fillRect(W * 0.24 - 2 * u, wy - 14 * u, 4.6 * u, 0.35 * u);
    flood(ctx, W, H, wy, t, [96, 104, 120]);
    // the ball, bobbing and spinning slowly
    var by = wy + 0.4 * u + Math.sin(t * 2) * 0.4 * u, r = 2.6 * u;
    ctx.fillStyle = '#FFFFFF';
    circ(ctx, x, by - r * 0.55, r); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(x, by - r * 0.55, r, 0, TAU); ctx.clip();
    ctx.translate(x, by - r * 0.55);
    ctx.rotate(t * 0.4);
    ctx.fillStyle = '#22262F';
    function pent(px, py, s) { ctx.beginPath(); for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * TAU / 5; ctx.lineTo(px + Math.cos(a) * s, py + Math.sin(a) * s); } ctx.closePath(); ctx.fill(); }
    pent(0, 0, r * 0.36);
    for (var k = 0; k < 5; k++) { var a = -Math.PI / 2 + k * TAU / 5; pent(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.3); }
    ctx.restore();
    ctx.fillStyle = 'rgba(92,112,140,0.6)';
    ctx.fillRect(x - r * 1.2, by, r * 2.4, r * 0.5);
  }

  /* a manhole cover lifted on a fountain of water */
  function manhole(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.52), x = g.x, y = g.y;
    ctx.fillStyle = '#4A4E58';
    ell(ctx, x, y - 0.2 * u, 14 * u, 2.2 * u); ctx.fill();
    ctx.fillStyle = '#22262F';
    ell(ctx, x, y - 0.3 * u, 4 * u, 0.9 * u); ctx.fill();
    // the fountain
    var surge = 0.85 + 0.15 * Math.sin(t * 5);
    var top = y - 15 * u * surge;
    var gr = ctx.createLinearGradient(0, top, 0, y);
    gr.addColorStop(0, 'rgba(230,240,255,0.95)');
    gr.addColorStop(1, 'rgba(170,200,240,0.8)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(x - 2.6 * u, y - 0.4 * u);
    ctx.quadraticCurveTo(x - 1.6 * u, y - 8 * u, x - 2.2 * u, top);
    ctx.lineTo(x + 2.2 * u, top);
    ctx.quadraticCurveTo(x + 1.6 * u, y - 8 * u, x + 2.6 * u, y - 0.4 * u);
    ctx.closePath();
    ctx.fill();
    // water falling off the top
    pen(ctx, 'rgba(210,228,255,0.8)', 0.5 * u);
    [-1, 1].forEach(function (s) { for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + s * 1.8 * u, top + k * 0.4 * u); ctx.quadraticCurveTo(x + s * (6 + k) * u, top - 1 * u, x + s * (7 + k * 1.4) * u, y - 1 * u); ctx.stroke(); } });
    // the cover, riding on top
    ctx.save();
    ctx.translate(x + Math.sin(t * 4) * 0.5 * u, top - 0.6 * u);
    ctx.rotate(Math.sin(t * 3) * 0.25);
    ctx.fillStyle = '#5A5E68';
    ell(ctx, 0, 0, 4.2 * u, 1.2 * u); ctx.fill();
    ctx.fillStyle = '#3A3E48';
    ctx.fillRect(-4.2 * u, 0, 8.4 * u, 0.7 * u);
    pen(ctx, 'rgba(255,255,255,0.25)', 0.2 * u);
    for (var i = -2; i <= 2; i++) seg(ctx, i * 1.4 * u - 0.6 * u, -0.8 * u, i * 1.4 * u + 0.6 * u, 0.6 * u);
    ctx.restore();
  }

  /* sandbags piled across a front door, the flood lapping at them */
  function sandbags(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5, 0.2), x = g.x, y = g.y + 1 * u;
    ctx.fillStyle = '#E8DCC8';
    ctx.fillRect(x - 13 * u, y - 22 * u, 26 * u, 22 * u);
    ctx.fillStyle = '#2F5A8A';
    rr(ctx, x - 4 * u, y - 15 * u, 8 * u, 15 * u, 0.8 * u); ctx.fill();
    ctx.fillStyle = '#E8C23A';
    circ(ctx, x + 2.6 * u, y - 7.5 * u, 0.5 * u); ctx.fill();
    ctx.fillStyle = '#F2EEE6';
    ctx.fillRect(x - 5 * u, y - 16 * u, 10 * u, 1 * u);
    // the bags, in two layers
    var bagC = ['#C9A878', '#BE9C6C', '#D4B486'];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 4 - (r === 2 ? 1 : 0); c++) {
      var bx = x - 9 * u + c * 5.4 * u + (r === 1 ? 2.7 * u : 0) + (r === 2 ? 2.7 * u : 0), by = y - 2.6 * u - r * 2.6 * u;
      ctx.fillStyle = bagC[(r + c) % 3];
      rr(ctx, bx - 2.6 * u, by - 1.4 * u, 5.4 * u, 2.9 * u, 1.3 * u); ctx.fill();
      pen(ctx, 'rgba(90,70,40,0.4)', 0.2 * u);
      seg(ctx, bx + 2 * u, by - 1 * u, bx + 2 * u, by + 1 * u);
    }
    var wy = y - 1.6 * u + Math.sin(t * 1.2) * 0.4 * u;
    ctx.fillStyle = 'rgba(96,114,140,0.85)';
    ctx.fillRect(x - 16 * u, wy, 32 * u, y - wy + 3 * u);
    pen(ctx, 'rgba(230,240,255,0.6)', 0.3 * u);
    seg(ctx, x - 15 * u, wy, x + 15 * u, wy);
    rainOver(ctx, W, H, t, x - 14 * u, x + 14 * u, y - 24 * u, y, 16, 0.18, 0.5, 11);
  }

  /* someone kayaking down a flooded street */
  function kayak(ctx, W, H, t) {
    var u = W / 62, wy = H * 0.85, x = W * (0.5 + K.J().dx * 0.3) + Math.sin(t * 0.35) * 3 * u;
    // a half-sunk car roof behind
    ctx.fillStyle = '#C84A3A';
    ctx.beginPath(); ctx.moveTo(W * 0.66, wy); ctx.quadraticCurveTo(W * 0.68, wy - 4 * u, W * 0.74, wy - 4 * u); ctx.lineTo(W * 0.8, wy - 4 * u); ctx.quadraticCurveTo(W * 0.85, wy - 4 * u, W * 0.86, wy); ctx.fill();
    ctx.fillStyle = '#A8D2F0';
    ctx.fillRect(W * 0.71, wy - 3.2 * u, W * 0.1, 2 * u);
    flood(ctx, W, H, wy, t, [90, 108, 132]);
    var by = wy + 1.2 * u + Math.sin(t * 2) * 0.3 * u;
    // the kayak
    ctx.fillStyle = '#F2C230';
    ctx.beginPath(); ctx.moveTo(x - 11 * u, by - 1 * u); ctx.quadraticCurveTo(x, by + 1.6 * u, x + 11 * u, by - 1 * u); ctx.quadraticCurveTo(x, by - 2.4 * u, x - 11 * u, by - 1 * u); ctx.fill();
    // the paddler, from the waist up
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 20 * u, by - 30 * u, 40 * u, 29 * u); ctx.clip();
    var p = K.person(ctx, x, by + 4.4 * u, u, { coat: '#D8432F', hat: 'cap', hatCol: '#2F7BD8', arms: [1.4, 1.6], legs: '#D8432F' });
    ctx.restore();
    // the paddle, swinging side to side
    var a = Math.sin(t * 2.4) * 0.5, cx = (p.hand[0] + p.hand2[0]) / 2, cy = (p.hand[1] + p.hand2[1]) / 2;
    var dx = Math.cos(a) * 8 * u, dy = Math.sin(a) * 4 * u;
    pen(ctx, '#3A3E48', 0.45 * u);
    seg(ctx, cx - dx, cy - dy, cx + dx, cy + dy);
    ctx.fillStyle = '#2F7BD8';
    ell(ctx, cx - dx, cy - dy, 1.4 * u, 0.6 * u, a); ctx.fill();
    ell(ctx, cx + dx, cy + dy, 1.4 * u, 0.6 * u, a); ctx.fill();
  }

  /* a rain gauge, full to the brim and spilling over */
  function raingauge(ctx, W, H, t) {
    var u = W / 56, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    // the post
    ctx.fillStyle = '#8A6A4A';
    ctx.fillRect(x - 0.8 * u, y - 7 * u, 1.6 * u, 7 * u);
    // the clear tube with its scale
    var top = y - 22 * u;
    ctx.fillStyle = '#8EC0F0';
    ctx.fillRect(x - 2.6 * u, top + 1 * u, 5.2 * u, 14.6 * u);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x - 2.6 * u, top + 1 * u, 1.2 * u, 14.6 * u);
    pen(ctx, 'rgba(30,50,90,0.6)', 0.22 * u);
    for (var k = 0; k <= 12; k++) seg(ctx, x + 2.6 * u, top + 2 * u + k * 1.1 * u, x + (k % 4 === 0 ? 0.6 : 1.5) * u, top + 2 * u + k * 1.1 * u);
    pen(ctx, 'rgba(255,255,255,0.8)', 0.3 * u);
    rr(ctx, x - 2.6 * u, top + 1 * u, 5.2 * u, 14.6 * u, 0.6 * u); ctx.stroke();
    // the funnel on top, overflowing
    ctx.fillStyle = 'rgba(220,235,250,0.9)';
    poly(ctx, [x - 4.4 * u, top - 1.6 * u, x + 4.4 * u, top - 1.6 * u, x + 2.6 * u, top + 1.2 * u, x - 2.6 * u, top + 1.2 * u]); ctx.fill();
    ctx.fillStyle = '#8EC0F0';
    ell(ctx, x, top - 1.6 * u, 4.4 * u, 0.7 * u); ctx.fill();
    pen(ctx, 'rgba(200,222,250,0.85)', 0.5 * u);
    [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.moveTo(x + s * 4.3 * u, top - 1.4 * u); ctx.quadraticCurveTo(x + s * 5 * u, top + 6 * u, x + s * 4 * u, y - 0.4 * u); ctx.stroke(); });
    var p = (t * 1.6) % 1;
    ctx.fillStyle = 'rgba(220,236,255,' + (1 - p) + ')';
    circ(ctx, x - 4.3 * u, top + p * 14 * u, 0.4 * u); ctx.fill();
    circ(ctx, x + 4.3 * u, top + ((p + 0.5) % 1) * 14 * u, 0.4 * u); ctx.fill();
    K.puddle(ctx, x, y - 0.2 * u, 9 * u, 1.4 * u, t);
  }

  /* stone steps turned into a waterfall */
  function steps(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5, 0.2), x0 = g.x - 16 * u, y0 = g.y;
    var n = 6, sw = 5.2 * u, sh = 3 * u;
    for (var i = 0; i < n; i++) {
      var sx = x0 + i * sw, sy = y0 - (n - i) * sh;
      ctx.fillStyle = i % 2 ? '#8E8A82' : '#9C988E';
      ctx.fillRect(sx, sy, W, sh + 0.2 * u);
      // a sheet of water over each step, pouring off the edge
      ctx.fillStyle = 'rgba(150,185,230,0.85)';
      ctx.fillRect(sx, sy - 0.7 * u, W, 1.3 * u);
      var fall = ctx.createLinearGradient(0, sy, 0, sy + sh);
      fall.addColorStop(0, 'rgba(210,228,252,0.95)');
      fall.addColorStop(1, 'rgba(160,195,240,0.7)');
      ctx.fillStyle = fall;
      ctx.beginPath(); ctx.moveTo(sx + 1 * u, sy - 0.4 * u); ctx.quadraticCurveTo(sx - 1.8 * u, sy + sh * 0.3, sx - 1.4 * u, sy + sh); ctx.lineTo(sx + 0.8 * u, sy + sh); ctx.quadraticCurveTo(sx - 0.2 * u, sy + sh * 0.4, sx + 2.6 * u, sy - 0.4 * u); ctx.closePath(); ctx.fill();
      pen(ctx, 'rgba(255,255,255,0.8)', 0.3 * u);
      for (var k = 0; k < 3; k++) { var p = (t * 2.2 + k * 0.33 + i * 0.17) % 1; seg(ctx, sx - 0.8 * u + k * 0.5 * u, sy + p * sh * 0.8, sx - 1 * u + k * 0.5 * u, sy + p * sh * 0.8 + 0.8 * u); }
      ctx.fillStyle = 'rgba(255,255,255,' + (0.55 + 0.3 * Math.sin(t * 6 + i)) + ')';
      ell(ctx, sx - 0.4 * u, sy + sh, 2 * u, 0.6 * u); ctx.fill();
    }
    K.puddle(ctx, x0 + n * sw + 4 * u, y0 - 0.2 * u, 8 * u, 1.3 * u, t);
    // a railing up the side
    pen(ctx, '#2F3A4A', 0.45 * u);
    seg(ctx, x0 - 1 * u, y0 - n * sh - 6 * u, x0 + n * sw + 2 * u, y0 - 6 * u);
    for (var j = 0; j <= 3; j++) seg(ctx, x0 + j * sw * 2, y0 - (n - j * 2) * sh - 6 * u - j * 0.2 * u, x0 + j * sw * 2, y0 - (n - j * 2) * sh);
  }


  /* legendary: a rain bomb, a pale burst of rain slamming down and spreading out across the ground */
  function rainbomb(ctx, W, H, t) {
    var x = W * (0.5 + K.J().dx * 0.3), base = H * 0.86, top = H * 0.38, w = W * 0.15;
    var p = (t * 0.25) % 1, spread = 0.55 + 0.45 * Math.sin(p * Math.PI);
    var g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, 'rgba(176,186,208,0.92)');
    g.addColorStop(1, 'rgba(226,232,244,0.92)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.55, top);
    ctx.quadraticCurveTo(x - w * 0.6, base - H * 0.14, x - w * (1 + spread * 0.6), base - H * 0.05);
    ctx.quadraticCurveTo(x - w * (1.8 + spread), base - H * 0.1, x - w * (2.4 + spread * 1.2), base);
    ctx.lineTo(x + w * (2.4 + spread * 1.2), base);
    ctx.quadraticCurveTo(x + w * (1.8 + spread), base - H * 0.1, x + w * (1 + spread * 0.6), base - H * 0.05);
    ctx.quadraticCurveTo(x + w * 0.6, base - H * 0.14, x + w * 0.55, top);
    ctx.closePath();
    ctx.fill();
    // the outflow curling up each side
    pen(ctx, 'rgba(250,252,255,0.75)', W / 160);
    [-1, 1].forEach(function (s) {
      for (var k = 0; k < 2; k++) {
        var cx = x + s * w * (1.5 + spread * 0.7 + k * 0.6), cy = base - H * (0.035 - k * 0.008), r = H * (0.03 - k * 0.008);
        ctx.beginPath(); ctx.arc(cx, cy, r, s > 0 ? Math.PI * 0.9 : Math.PI * 0.1, s > 0 ? Math.PI * 2.4 : -Math.PI * 1.4, s < 0); ctx.stroke();
      }
    });
    // streaks of rain inside it
    pen(ctx, 'rgba(120,132,160,0.45)', W / 240);
    for (var i = 0; i < 10; i++) { var f = (i + 0.5) / 10, sx = x - w * 0.45 + w * 0.9 * f, yy = top + ((t * H * 0.9 + i * H * 0.07) % (base - top - H * 0.06)); seg(ctx, sx, yy, sx, yy + H * 0.05); }
    K.cloud(ctx, x - w * 1.5, top + H * 0.012, w * 1, 'rgba(54,62,82,0.98)');
    K.cloud(ctx, x - w * 0.3, top - H * 0.02, w * 0.95, 'rgba(46,54,74,0.98)');
  }


  /* ---------- Monsoon ---------- */

  /* a kid sheltering under a giant leaf */
  function leafbrolly(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    var p = K.person(ctx, x, y, u, { kid: true, coat: '#F2A03A', legs: '#3A6AB8', hair: '#1E1A18', arms: [0.2, 2.6], boots: '#5A3A22' });
    // the leaf, its stalk in the raised hand
    var hx = p.hand[0], hy = p.hand[1];
    pen(ctx, '#3E7A2A', 0.5 * u);
    seg(ctx, hx, hy + 1 * u, hx + 0.6 * u, hy - 4 * u);
    ctx.save();
    ctx.translate(hx + 0.6 * u, hy - 4 * u);
    ctx.rotate(-0.08 + Math.sin(t * 1.3) * 0.04);
    ctx.fillStyle = '#4E9A3A';
    ctx.beginPath(); ctx.moveTo(-12 * u, 2.2 * u); ctx.quadraticCurveTo(-6 * u, -5 * u, 2 * u, -3.2 * u); ctx.quadraticCurveTo(10 * u, -2.6 * u, 13 * u, 3.2 * u); ctx.quadraticCurveTo(0, -0.6 * u, -12 * u, 2.2 * u); ctx.fill();
    pen(ctx, '#BFE08A', 0.35 * u);
    ctx.beginPath(); ctx.moveTo(-11 * u, 1.8 * u); ctx.quadraticCurveTo(0, -3 * u, 12.6 * u, 3 * u); ctx.stroke();
    pen(ctx, 'rgba(40,90,30,0.6)', 0.25 * u);
    for (var k = -4; k <= 4; k++) seg(ctx, k * 2.4 * u, -1.8 * u + Math.abs(k) * 0.3 * u, k * 2.4 * u + 1 * u, 0.6 * u + Math.abs(k) * 0.4 * u);
    ctx.restore();
    // drips off the tips
    [[-11.6, 2.6], [13, 3.6]].forEach(function (d, i) {
      var q = (t * 1.2 + i * 0.5) % 1;
      K.drop(ctx, hx + d[0] * u, hy - 4 * u + d[1] * u + q * 10 * u, 0.5 * u);
    });
  }

  /* pink lotus flowers on a pond, rain rippling round them */
  function lotus(ctx, W, H, t) {
    var u = W / 60, wy = H * 0.84;
    K.water(ctx, W, H, wy, [60, 108, 100], t);
    var x = W * (0.5 + K.J().dx * 0.3);
    [[-9, 3, 1], [8, 4.4, 0.8], [0, 5.4, 1.1]].forEach(function (pad) {
      ctx.fillStyle = '#3E8A4A';
      ctx.beginPath(); ctx.ellipse(x + pad[0] * u, wy + pad[1] * u, 5 * u * pad[2], 1.5 * u * pad[2], 0, 0.2, TAU - 0.2); ctx.lineTo(x + pad[0] * u, wy + pad[1] * u); ctx.fill();
    });
    [[-4, 1.2], [6, 0.9]].forEach(function (fl, i) {
      var fx = x + fl[0] * u, fy = wy - 4 * u * fl[1], s = fl[1];
      pen(ctx, '#3E7A3A', 0.4 * u);
      seg(ctx, fx, fy + 2 * u, fx + 0.4 * u, wy + 2 * u);
      var sway = Math.sin(t + i) * 0.04;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(sway);
      [[-1, '#E8789A'], [1, '#E8789A'], [-0.5, '#F2A0B8'], [0.5, '#F2A0B8'], [0, '#FAC6D4']].forEach(function (pt) {
        ctx.fillStyle = pt[1];
        ctx.save();
        ctx.rotate(pt[0] * 0.55);
        ctx.beginPath(); ctx.moveTo(0, 1 * u * s); ctx.quadraticCurveTo(-1.6 * u * s, -1.6 * u * s, 0, -4 * u * s); ctx.quadraticCurveTo(1.6 * u * s, -1.6 * u * s, 0, 1 * u * s); ctx.fill();
        ctx.restore();
      });
      ctx.fillStyle = '#F2C230';
      circ(ctx, 0, -0.4 * u * s, 0.6 * u * s); ctx.fill();
      ctx.restore();
    });
  }

  /* green rice terraces stepping down a hillside, water shining in each one */
  function terraces(ctx, W, H, t) {
    var u = W / 60, side = K.J().dx >= 0 ? 1 : -1, ph = K.J().f || 0;
    var n = 6;
    function edge(i, x) { return H * (0.6 + i * 0.062) + Math.sin(x / W * 3.4 + i * 0.8 + ph) * H * 0.016 - (x / W - 0.5) * H * 0.04 * side; }
    for (var i = 0; i < n; i++) {
      var steps = 16;
      ctx.fillStyle = ['#5C9A4E', '#64A256', '#5A964C', '#68A65A', '#5E9C50', '#6AA85C'][i];
      ctx.beginPath();
      for (var k = 0; k <= steps; k++) { var x = W * k / steps; if (k) ctx.lineTo(x, edge(i, x)); else ctx.moveTo(x, edge(i, x)); }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      ctx.fill();
      // the water held in the terrace, catching the light
      ctx.strokeStyle = 'rgba(214,234,244,0.75)';
      ctx.lineWidth = Math.max(1, W / 220);
      ctx.beginPath();
      for (var k2 = 1; k2 < steps; k2++) { var x2 = W * k2 / steps, y2 = edge(i, x2) + H * 0.012; if (k2 > 1) ctx.lineTo(x2, y2); else ctx.moveTo(x2, y2); }
      ctx.stroke();
      // the little wall along its edge
      ctx.strokeStyle = 'rgba(46,92,44,0.9)';
      ctx.lineWidth = Math.max(1, W / 160);
      ctx.beginPath();
      for (var k3 = 0; k3 <= steps; k3++) { var x3 = W * k3 / steps; if (k3) ctx.lineTo(x3, edge(i, x3)); else ctx.moveTo(x3, edge(i, x3)); }
      ctx.stroke();
      // rows of rice
      pen(ctx, 'rgba(40,96,40,0.9)', 0.28 * u);
      for (var r = 0; r < 9; r++) { var tx = W * (0.08 + r * 0.105) + (i % 2) * W * 0.05, ty = edge(i, tx) + H * 0.04; seg(ctx, tx, ty, tx - 0.4 * u, ty - 1.4 * u); seg(ctx, tx + 0.4 * u, ty, tx + 0.8 * u, ty - 1.3 * u); }
    }
    // mist hanging over the far terraces
    var mg = ctx.createLinearGradient(0, H * 0.5, 0, H * 0.78);
    mg.addColorStop(0, 'rgba(220,232,226,0)');
    mg.addColorStop(0.4, 'rgba(220,232,226,0.4)');
    mg.addColorStop(1, 'rgba(220,232,226,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(0, H * 0.5, W, H * 0.28);
    void t;
  }



  /* a tuk-tuk splashing through the rain */
  function tuktuk(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    K.puddle(ctx, x, y - 0.2 * u, 13 * u, 1.8 * u, null, 'rgba(100,140,130,0.7)');
    var bounce = Math.abs(Math.sin(t * 6)) * 0.3 * u;
    ctx.save();
    ctx.translate(0, -bounce);
    // the canopy roof and the frame
    ctx.fillStyle = '#2F2F38';
    rr(ctx, x - 8 * u, y - 13.4 * u, 14 * u, 1.6 * u, 0.8 * u); ctx.fill();
    ctx.fillStyle = '#F2C230';
    ctx.beginPath();
    ctx.moveTo(x - 8 * u, y - 2.4 * u);
    ctx.lineTo(x - 8 * u, y - 7 * u);
    ctx.quadraticCurveTo(x - 7.6 * u, y - 12 * u, x - 4 * u, y - 12 * u);
    ctx.lineTo(x + 3 * u, y - 12 * u);
    ctx.lineTo(x + 7 * u, y - 6 * u);
    ctx.lineTo(x + 7.6 * u, y - 2.4 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2E8A4A';
    ctx.fillRect(x - 8 * u, y - 4.6 * u, 15.6 * u, 2.2 * u);
    ctx.fillStyle = '#1E2230';
    poly(ctx, [x - 3 * u, y - 4.6 * u, x - 3 * u, y - 11 * u, x + 2.6 * u, y - 11 * u, x + 6 * u, y - 6 * u, x + 6 * u, y - 4.6 * u]); ctx.fill();
    ctx.fillStyle = '#A8D2F0';
    poly(ctx, [x + 3 * u, y - 11 * u, x + 6.4 * u, y - 6.2 * u, x + 5 * u, y - 6.2 * u, x + 2.4 * u, y - 10.4 * u]); ctx.fill();
    // the driver
    ctx.fillStyle = '#E8DCC8';
    ctx.fillRect(x + 0.6 * u, y - 8 * u, 2.6 * u, 3.4 * u);
    ctx.fillStyle = '#8A5A3A';
    circ(ctx, x + 1.9 * u, y - 9.4 * u, 1.3 * u); ctx.fill();
    ctx.fillStyle = '#1E1A18';
    ctx.beginPath(); ctx.arc(x + 1.9 * u, y - 9.6 * u, 1.35 * u, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#FFF2B0';
    ell(ctx, x + 7.4 * u, y - 4 * u, 0.7 * u, 0.6 * u); ctx.fill();
    glow(ctx, x + 8.4 * u, y - 4 * u, 5 * u, [255, 240, 180], 0.4);
    ctx.restore();
    K.wheel(ctx, x - 5.4 * u, y - 1.3 * u, 1.4 * u);
    K.wheel(ctx, x + 5.6 * u, y - 1.3 * u, 1.4 * u);
    K.splash(ctx, x - 5.4 * u, y - 0.2 * u, 2 * u, t * 2);
    K.splash(ctx, x + 5.6 * u, y - 0.2 * u, 2 * u, t * 2 + 0.5);
  }

  /* an elephant standing in the flood, spraying water from its trunk */
  function elephant(ctx, W, H, t) {
    var u = W / 66, wy = H * 0.86, x = W * (0.46 + K.J().dx * 0.3);
    var e = K.beast(ctx, x, wy + 1 * u, u, { col: '#8E949E', rx: 7, ry: 4.4, leg: 4.6, lw: 2.6, neck: [-0.6, -1.4], hr: 3.2, snout: [0.1, 0.1], ears: 'none', tail: 'short' });
    // the big ear
    ctx.fillStyle = '#7E848E';
    ell(ctx, e.head[0] - 1.2 * u, e.head[1] + 0.4 * u, 2.6 * u, 3.2 * u, -0.2); ctx.fill();
    ctx.fillStyle = '#A8AEB8';
    ell(ctx, e.head[0] - 1 * u, e.head[1] + 0.4 * u, 1.6 * u, 2.2 * u, -0.2); ctx.fill();
    // the trunk curling up, and its fountain
    var tx = e.head[0] + 2.4 * u, ty = e.head[1] + 0.6 * u;
    pen(ctx, '#8E949E', 1.6 * u);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + 3.4 * u, ty + 1 * u, tx + 3 * u, ty - 4 * u); ctx.quadraticCurveTo(tx + 2.8 * u, ty - 6 * u, tx + 4 * u, ty - 7 * u); ctx.stroke();
    ctx.fillStyle = '#F2F0E6';
    tri(ctx, tx - 0.2 * u, ty + 0.6 * u, tx + 1.8 * u, ty + 1.4 * u, tx + 0.4 * u, ty + 1.8 * u); ctx.fill();
    var sx = tx + 4 * u, sy = ty - 7.4 * u;
    for (var k = 0; k < 9; k++) {
      var p = (t * 1.2 + k / 9) % 1, a = -1.9 + (k % 3) * 0.35, sp = 9 * u;
      var px = sx + Math.cos(a) * sp * p * 1.3, py = sy + Math.sin(a) * sp * p + p * p * 14 * u;
      ctx.fillStyle = 'rgba(210,232,255,' + (0.9 - p * 0.7) + ')';
      circ(ctx, px, py, (0.5 + p * 0.4) * u); ctx.fill();
    }
    flood(ctx, W, H, wy, t, [80, 112, 104]);
  }

  /* a water buffalo wallowing up to its neck, an egret riding on its back */
  function buffalo(ctx, W, H, t) {
    var u = W / 52, wy = H * 0.85, x = W * (0.52 + K.J().dx * 0.3), d = K.J().dx >= 0 ? -1 : 1;
    var bob = Math.sin(t * 1.2) * 0.25 * u;
    // the broad back, just out of the water
    ctx.fillStyle = '#4E484C';
    ell(ctx, x - d * 3 * u, wy - 0.4 * u + bob, 8.6 * u, 3.8 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ell(ctx, x - d * 4 * u, wy - 3 * u + bob, 5 * u, 0.9 * u); ctx.fill();
    // the head held up, with its great swept-back horns
    var hx = x + d * 6.6 * u, hy = wy - 3.6 * u + bob;
    ctx.fillStyle = '#4E484C';
    poly(ctx, [x + d * 3 * u, wy - 2.4 * u + bob, hx, hy - 1.8 * u, hx + d * 1.6 * u, hy + 1.2 * u, x + d * 3.6 * u, wy + 0.6 * u + bob]); ctx.fill();
    ell(ctx, hx, hy, 2.5 * u, 2.1 * u, 0.2 * d); ctx.fill();
    ctx.fillStyle = '#6E666A';
    ell(ctx, hx + d * 2 * u, hy + 1.1 * u, 1.6 * u, 1.3 * u); ctx.fill();
    ctx.fillStyle = '#2A2428';
    circ(ctx, hx + d * 2.8 * u, hy + 0.9 * u, 0.3 * u); ctx.fill();
    circ(ctx, hx + d * 0.7 * u, hy - 0.6 * u, 0.32 * u); ctx.fill();
    ctx.fillStyle = '#3E383C';
    ell(ctx, hx - d * 2 * u, hy - 0.6 * u, 1.3 * u, 0.6 * u, -0.4 * d); ctx.fill();
    // two crescent horns, thick at the head and tapering to points
    [[0, '#B0A694', 0.8], [0.9, '#C9BFAE', 1]].forEach(function (hn) {
      var ox = hn[0] * u * d, k = hn[2];
      ctx.fillStyle = hn[1];
      ctx.beginPath();
      ctx.moveTo(hx - d * 0.8 * u + ox, hy - 1.2 * u);
      ctx.bezierCurveTo(hx - d * 2.6 * u + ox, hy - 5.6 * u * k, hx - d * 6.4 * u + ox, hy - 5 * u * k, hx - d * 7.6 * u + ox, hy - 1.6 * u);
      ctx.bezierCurveTo(hx - d * 6 * u + ox, hy - 3.6 * u * k, hx - d * 3.4 * u + ox, hy - 3.6 * u * k, hx + d * 0.6 * u + ox, hy - 1.4 * u);
      ctx.closePath();
      ctx.fill();
    });
    // the egret on its back
    var hop = Math.max(0, Math.sin(t * 2.6)) * 0.3 * u;
    K.bird(ctx, x - d * 4.6 * u, wy - 3.9 * u + bob - hop, 1.5 * u, { body: '#FFFFFF', cap: '#FFF2D8', beak: '#F2C230', legs: '#5A5A50', tail: 'short', dir: d });
    flood(ctx, W, H, wy, t, [96, 122, 100]);
    // ripples round it
    ctx.strokeStyle = 'rgba(230,240,232,0.55)';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ell(ctx, x, wy + 0.8 * u, 12 * u, 1.4 * u); ctx.stroke();
  }



  /* legendary: a peacock dancing in the rain, its tail fanned out */
  function peacock(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5, 0.2), x = g.x, y = g.y;
    var sway = Math.sin(t * 1.6) * 0.05;
    ctx.save();
    ctx.translate(x, y - 6 * u);
    ctx.rotate(sway);
    // the fan of feathers
    var n = 15;
    for (var i = 0; i < n; i++) {
      var a = Math.PI + (i + 0.5) * Math.PI / n, L = 15 * u;
      var ex = Math.cos(a) * L, ey = Math.sin(a) * L;
      pen(ctx, '#3E8A5A', 0.5 * u);
      seg(ctx, 0, 0, ex * 0.95, ey * 0.95);
      ctx.fillStyle = '#2E7A5A';
      ell(ctx, ex * 0.7, ey * 0.7, 3 * u, 1.3 * u, a); ctx.fill();
      ctx.fillStyle = '#3EA87A';
      ell(ctx, ex, ey, 2.3 * u, 1.8 * u, a); ctx.fill();
      ctx.fillStyle = '#E8B84A';
      ell(ctx, ex, ey, 1.4 * u, 1.1 * u, a); ctx.fill();
      ctx.fillStyle = '#2A4AB8';
      ell(ctx, ex, ey, 0.85 * u, 0.7 * u, a); ctx.fill();
      ctx.fillStyle = '#1A1A3A';
      circ(ctx, ex, ey, 0.38 * u); ctx.fill();
    }
    for (var j = 0; j < 7; j++) { var b2 = Math.PI + (j + 0.5) * Math.PI / 7; ctx.fillStyle = '#4AA86E'; ell(ctx, Math.cos(b2) * 7 * u, Math.sin(b2) * 7 * u, 1.6 * u, 0.9 * u, b2); ctx.fill(); }
    ctx.restore();
    // legs, body, neck and crest
    pen(ctx, '#8A7A6A', 0.45 * u);
    seg(ctx, x - 0.6 * u, y - 4 * u, x - 0.9 * u, y); seg(ctx, x + 0.6 * u, y - 4 * u, x + 0.9 * u, y);
    ctx.fillStyle = '#2C5AB8';
    ell(ctx, x, y - 6 * u, 2.4 * u, 3 * u); ctx.fill();
    ctx.fillStyle = '#8A6A4A';
    ell(ctx, x - 0.4 * u, y - 5 * u, 1.6 * u, 1.8 * u); ctx.fill();
    pen(ctx, '#2C5AB8', 1.3 * u);
    ctx.beginPath(); ctx.moveTo(x + 0.4 * u, y - 8 * u); ctx.quadraticCurveTo(x + 1.6 * u, y - 10.4 * u, x + 1 * u, y - 12.4 * u); ctx.stroke();
    ctx.fillStyle = '#2C5AB8';
    circ(ctx, x + 1.2 * u, y - 13 * u, 1.2 * u); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ell(ctx, x + 1.6 * u, y - 13.1 * u, 0.6 * u, 0.3 * u); ctx.fill();
    ctx.fillStyle = '#1F2433';
    circ(ctx, x + 1.6 * u, y - 13.1 * u, 0.22 * u); ctx.fill();
    ctx.fillStyle = '#B8A88A';
    tri(ctx, x + 2.2 * u, y - 13.2 * u, x + 3.4 * u, y - 12.8 * u, x + 2.2 * u, y - 12.4 * u); ctx.fill();
    pen(ctx, '#2C5AB8', 0.2 * u);
    for (var c = -1; c <= 1; c++) { seg(ctx, x + 1 * u, y - 14 * u, x + (1 + c * 0.8) * u, y - 16 * u); ctx.fillStyle = '#3E8ED8'; circ(ctx, x + (1 + c * 0.8) * u, y - 16.2 * u, 0.35 * u); ctx.fill(); }
    rainOver(ctx, W, H, t, x - 16 * u, x + 16 * u, y - 24 * u, y, 14, 0.12, 0.5, 13);
  }

  K.add('slug', 'ground', slug);
  K.add('wellies', 'ground', wellies);
  K.add('heron', 'ground', heron);
  K.add('angler', 'ground', angler);
  K.add('mistywindow', 'ground', mistywindow);

  K.add('blackbird', 'ground', blackbird);
  K.add('wetdog', 'ground', wetdog);
  K.add('birdbath', 'ground', birdbath);
  K.add('rainshaft', 'front', rainshaft);
  K.add('puddlebike', 'ground', puddlebike);
  K.add('virga', 'front', virga);

  K.add('drainpipe', 'ground', drainpipe);
  K.add('carsplash', 'ground', carsplash);
  K.add('runcover', 'ground', runcover);
  K.add('floodduck', 'ground', floodduck);
  K.add('raincurtain', 'back', raincurtain);
  K.add('bucket', 'ground', bucket);
  K.add('ark', 'ground', ark);

  K.add('leaner', 'ground', leaner);
  K.add('benttrees', 'ground', benttrees);
  K.add('wheeliebin', 'ground', wheeliebin);
  K.add('tent', 'ground', tent);
  K.add('seawall', 'ground', seawall);
  K.add('backgull', 'front', backgull);

  K.add('football', 'ground', football);
  K.add('manhole', 'ground', manhole);
  K.add('sandbags', 'ground', sandbags);
  K.add('kayak', 'ground', kayak);
  K.add('raingauge', 'ground', raingauge);
  K.add('steps', 'ground', steps);
  K.add('rainbomb', 'front', rainbomb);

  K.add('leafbrolly', 'ground', leafbrolly);
  K.add('lotus', 'ground', lotus);
  K.add('terraces', 'ground', terraces);
  K.add('tuktuk', 'ground', tuktuk);
  K.add('elephant', 'ground', elephant);
  K.add('buffalo', 'ground', buffalo);
  K.add('peacock', 'ground', peacock);
})(typeof window !== 'undefined' ? window : globalThis);
