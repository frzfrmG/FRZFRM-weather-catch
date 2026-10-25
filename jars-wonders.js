/* FRZFRM Weather Catch: the Sky Wonders row's own variants. Every jar has seven of its own; no picture is in two jars.
   Many Sky Wonders are caught with a photo, so their pictures also have to stand at the bottom of someone's photo. */
(function (root) {
  'use strict';
  var K = root.WC && root.WC.kit;
  if (!K) return;
  var TAU = Math.PI * 2;
  var circ = K.circ, ell = K.ell, tri = K.tri, poly = K.poly, rr = K.rr, pen = K.pen, seg = K.seg, glow = K.glow, shade = K.shade, star4 = K.star4;

  /* where the scene put its moon, sun and eclipse, with this catch's nudge */
  function moonAt(W, H, dx, dy, dr) {
    var E = K.env(), m = E && E.s && E.s.moon ? E.s.moon : [dx, dy, dr || 0.06];
    var J = K.J();
    return { x: (m[0] + (J.sx || 0)) * W, y: (m[1] + (J.sy || 0)) * H, r: m[2] * W };
  }
  function sunPos(W, H, dx, dy) {
    var E = K.env(), s = E && E.s && E.s.sun ? E.s.sun : [dx, dy, 0.05];
    var J = K.J();
    return { x: (s[0] + (J.sx || 0)) * W, y: (s[1] + (J.sy || 0)) * H, r: s[2] * W };
  }
  function eclipseAt(W, H) { var J = K.J(); return { x: W * (0.55 + (J.sx || 0)), y: H * (0.34 + (J.sy || 0)), r: W * 0.09 }; }
  /* the rainbow's circle, as the scene draws it */
  function bowAt(W, H) { var J = K.J(); return { x: W * (0.42 + (J.rb || 0)), y: H * 0.98, R: W * 0.66, bw: W * 0.02 }; }
  /* a bank of snow along the bottom, for the far north */
  function snowbank(ctx, W, H, y, t) {
    ctx.fillStyle = '#DCE6F2';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, y + H * 0.01);
    for (var i = 0; i <= 8; i++) { var x = W * i / 8; ctx.lineTo(x, y + Math.sin(i * 1.7 + 0.5) * H * 0.008); }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(140,170,220,0.25)';
    ctx.fillRect(0, y + H * 0.03, W, H - y);
    void t;
  }
  /* fog drifting over the bottom of the jar, fading in from y0 (no hard edge, even over a photo) */
  function mistOver(ctx, W, H, y0, a) {
    var g = ctx.createLinearGradient(0, y0, 0, H);
    g.addColorStop(0, 'rgba(228,232,238,0)');
    g.addColorStop(0.35, 'rgba(228,232,238,' + a + ')');
    g.addColorStop(1, 'rgba(228,232,238,' + a * 0.8 + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, H - y0);
  }
  /* a dark lake along the bottom */
  function lake(ctx, W, H, y, col) {
    var c = col || [24, 34, 64];
    var g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, K.rgba(c, 0.95));
    g.addColorStop(1, K.rgba(K.mix(c, [0, 0, 0], 0.4), 0.98));
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, H - y);
  }

  /* ---------- Starry Night ---------- */

  /* a kid with a telescope, a red torch at their feet */
  function telescope(ctx, W, H, t) {
    var u = W / 62, g = K.at(W, H, 0.42), x = g.x, y = g.y;
    glow(ctx, x + 2 * u, y - 1 * u, 4 * u, [255, 80, 70], 0.5);
    ctx.fillStyle = '#C0392B';
    rr(ctx, x + 1.2 * u, y - 1.4 * u, 1.8 * u, 1 * u, 0.3 * u); ctx.fill();
    var p = K.person(ctx, x, y, u, { kid: true, coat: '#3A4A7A', legs: '#1E2438', hat: 'bobble', hatCol: '#E8432F', arms: [0.5, 1.4], skin: '#D8B090' });
    // the tripod and the tube, pointed up at the stars
    var tx = x + 6 * u, ty = y - 8 * u;
    pen(ctx, '#B8BEC8', 0.4 * u);
    seg(ctx, tx, ty, tx - 2 * u, y); seg(ctx, tx, ty, tx + 2.2 * u, y); seg(ctx, tx, ty, tx + 0.3 * u, y);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(-0.75);
    ctx.fillStyle = '#E8ECF2';
    rr(ctx, -4 * u, -1 * u, 11 * u, 2 * u, 0.6 * u); ctx.fill();
    ctx.fillStyle = '#2F3A5A';
    ctx.fillRect(4.6 * u, -1.1 * u, 2.6 * u, 2.2 * u);
    ctx.fillStyle = '#9AB8E8';
    ell(ctx, 7.2 * u, 0, 0.4 * u, 1 * u); ctx.fill();
    ctx.restore();
    void p;
  }

  /* the space station going over: a bright, steady light crossing the sky */
  function station(ctx, W, H, t) {
    var J = K.J();
    function at(f) { return [W * (0.2 + f * 0.62), H * (0.56 - Math.sin(f * Math.PI) * 0.2 + J.dy)]; }
    var p = 0.15 + ((t * 0.05) % 0.7), now = at(p);
    pen(ctx, 'rgba(255,255,255,0.22)', W / 360);
    ctx.setLineDash([W / 110, W / 80]);
    ctx.beginPath();
    for (var k = 0; k <= 16; k++) { var q = at(p * k / 16); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }
    ctx.stroke();
    ctx.setLineDash([]);
    var x = now[0], y = now[1], u = W / 90;
    glow(ctx, x, y, W * 0.06, [255, 250, 230], 0.75);
    ctx.fillStyle = 'rgba(205,218,255,0.98)';
    ctx.fillRect(x - 3.6 * u, y - 1.6 * u, 1.5 * u, 3.2 * u);
    ctx.fillRect(x + 2.1 * u, y - 1.6 * u, 1.5 * u, 3.2 * u);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 2.1 * u, y - 0.3 * u, 4.2 * u, 0.6 * u);
    ctx.fillRect(x - 0.6 * u, y - 0.9 * u, 1.2 * u, 1.8 * u);
  }


  /* a campfire and a glowing tent under the stars */
  function campfire(ctx, W, H, t) {
    var u = W / 62, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    // the tent, lit from inside
    var tx = x - 7 * u;
    ctx.fillStyle = '#3E5A8A';
    tri(ctx, tx - 7 * u, y, tx, y - 9 * u, tx + 7 * u, y); ctx.fill();
    ctx.fillStyle = '#F2B860';
    tri(ctx, tx - 2.4 * u, y, tx, y - 6.2 * u, tx + 2.4 * u, y); ctx.fill();
    glow(ctx, tx, y - 2 * u, 6 * u, [255, 200, 120], 0.35);
    // the fire
    var fx = x + 6 * u;
    glow(ctx, fx, y - 2 * u, 10 * u, [255, 150, 60], 0.45 + 0.1 * Math.sin(t * 9));
    pen(ctx, '#5A3A22', 0.8 * u);
    seg(ctx, fx - 2.6 * u, y - 0.2 * u, fx + 2.6 * u, y - 1.2 * u);
    seg(ctx, fx - 2.4 * u, y - 1.2 * u, fx + 2.4 * u, y - 0.2 * u);
    [['#E8432F', 2.2, 5.4], ['#F2A03A', 1.6, 4.2], ['#FFE07A', 0.9, 2.6]].forEach(function (f, i) {
      var fl = Math.sin(t * 11 + i * 2) * 0.4 * u;
      ctx.fillStyle = f[0];
      ctx.beginPath();
      ctx.moveTo(fx - f[1] * u, y - 1 * u);
      ctx.quadraticCurveTo(fx - f[1] * u, y - f[2] * 0.5 * u, fx + fl, y - (f[2] + 1) * u);
      ctx.quadraticCurveTo(fx + f[1] * u, y - f[2] * 0.5 * u, fx + f[1] * u, y - 1 * u);
      ctx.closePath();
      ctx.fill();
    });
    // sparks rising
    for (var k = 0; k < 5; k++) {
      var p = (t * 0.7 + k * 0.2) % 1;
      ctx.fillStyle = 'rgba(255,200,110,' + (1 - p) + ')';
      circ(ctx, fx + Math.sin(p * 6 + k) * 2 * u, y - 6 * u - p * 12 * u, 0.3 * u); ctx.fill();
    }
  }

  /* ---------- Full Moon ---------- */

  /* the moon's path, glittering across the water */
  function moonpath(ctx, W, H, t) {
    var m = moonAt(W, H, 0.7, 0.26, 0.075), wy = H * 0.82;
    lake(ctx, W, H, wy, [18, 30, 70]);
    for (var i = 0; i < 14; i++) {
      var f = i / 13, y = wy + (H - wy) * f * 0.95 + H * 0.006, w = W * (0.02 + f * 0.1);
      var sh = Math.sin(t * 3 + i * 1.7) * W * 0.012;
      ctx.fillStyle = 'rgba(255,246,215,' + (0.85 - f * 0.4) + ')';
      ctx.fillRect(m.x - w / 2 + sh, y, w * (0.5 + 0.5 * Math.abs(Math.sin(i * 2.1 + t))), Math.max(1, H * 0.006));
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(0, wy, W, Math.max(1, H * 0.003));
  }

  /* a badger out snuffling in the moonlight */
  function badger(ctx, W, H, t) {
    var u = W / 48, g = K.at(W, H, 0.5), x = g.x, y = g.y, d = K.J().dx >= 0 ? 1 : -1;
    var sniff = Math.sin(t * 5) * 0.2 * u;
    var b = K.beast(ctx, x, y, u, { dir: d, col: '#8A8A90', legCol: '#2A2A30', rx: 5, ry: 2.4, leg: 1.8, lw: 1.3, neck: [0.6, 0.6], hr: 1.8, snout: [2.2, 0.9], ears: 'round', earCol: '#2A2A30', tail: 'short', walk: t * 0.4 });
    // the black and white face
    var hx = b.head[0], hy = b.head[1] + sniff;
    ctx.fillStyle = '#F2F2F2';
    ell(ctx, hx + d * 0.6 * u, hy + 0.2 * u, 2.2 * u, 1.5 * u, 0.2 * d); ctx.fill();
    ctx.fillStyle = '#1E1E24';
    ell(ctx, hx + d * 0.7 * u, hy - 0.1 * u, 2.2 * u, 0.5 * u, 0.25 * d); ctx.fill();
    ctx.fillStyle = '#F2F2F2';
    ell(ctx, hx + d * 1.4 * u, hy + 0.7 * u, 1.4 * u, 0.6 * u, 0.25 * d); ctx.fill();
    ctx.fillStyle = '#1E1E24';
    circ(ctx, hx + d * 2.8 * u, hy + 0.9 * u, 0.4 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ell(ctx, x, y - 4.4 * u, 3.6 * u, 0.6 * u); ctx.fill();
  }

  /* a wolf howling on a rock */
  function wolf(ctx, W, H, t) {
    var u = W / 58, g = K.at(W, H, 0.4), x = g.x, y = g.y, d = 1;
    K.rock(ctx, x + 1 * u, y + 0.4 * u, 9 * u, 5 * u, '#2E3448');
    var by = y - 4.6 * u;
    ctx.fillStyle = '#6E7484';
    // sitting: haunches, chest up, head thrown back
    ell(ctx, x - 1.6 * u, by - 1.8 * u, 2.6 * u, 2 * u); ctx.fill();
    ell(ctx, x + 0.6 * u, by - 4.4 * u, 2 * u, 3.2 * u, 0.3); ctx.fill();
    pen(ctx, '#6E7484', 1.1 * u);
    seg(ctx, x + 1.4 * u, by - 3 * u, x + 1.7 * u, by);
    pen(ctx, '#5A606E', 1.1 * u);
    seg(ctx, x + 0.6 * u, by - 3 * u, x + 0.8 * u, by);
    // bushy tail
    ctx.fillStyle = '#5A606E';
    ell(ctx, x - 4.4 * u, by - 0.8 * u, 2.6 * u, 0.9 * u, -0.3); ctx.fill();
    // the head, nose to the moon
    var hx = x + 1.8 * u, hy = by - 8 * u;
    ctx.fillStyle = '#6E7484';
    circ(ctx, hx, hy, 1.6 * u); ctx.fill();
    poly(ctx, [hx - 0.6 * u, hy - 0.8 * u, hx + 2 * u, hy - 3.6 * u, hx + 2.6 * u, hy - 2.8 * u, hx + 1.2 * u, hy + 0.6 * u]); ctx.fill();
    tri(ctx, hx - 1.2 * u, hy - 0.6 * u, hx - 1.6 * u, hy - 2.8 * u, hx - 0.1 * u, hy - 1.2 * u); ctx.fill();
    ctx.fillStyle = '#D8DCE4';
    ell(ctx, x + 1.2 * u, by - 5.6 * u, 1 * u, 1.8 * u, 0.3); ctx.fill();
    ctx.fillStyle = '#1E1E24';
    circ(ctx, hx + 2.5 * u, hy - 3.3 * u, 0.35 * u); ctx.fill();
    // the howl
    var p = (t * 0.6) % 1;
    pen(ctx, 'rgba(220,230,255,' + (0.6 * (1 - p)) + ')', 0.3 * u);
    for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(hx + 2.6 * u, hy - 3.6 * u, (1.6 + k * 1.4 + p * 3) * u, -1.3, -0.3); ctx.stroke(); }
    void d;
  }

  /* a hare sitting up, gazing at the moon */
  function moonhare(ctx, W, H, t) {
    var u = W / 58, g = K.at(W, H, 0.38), x = g.x, y = g.y;
    var tw = Math.sin(t * 1.7) * 0.06;
    ctx.fillStyle = '#9A7A5A';
    ell(ctx, x - 0.6 * u, y - 2.6 * u, 3.4 * u, 2.6 * u); ctx.fill();
    ell(ctx, x + 1 * u, y - 5.6 * u, 1.8 * u, 2.8 * u, 0.35); ctx.fill();
    ell(ctx, x - 1 * u, y - 0.4 * u, 2.6 * u, 0.7 * u); ctx.fill();
    ctx.fillStyle = '#F2EDE4';
    circ(ctx, x - 3.8 * u, y - 2.6 * u, 0.8 * u); ctx.fill();
    // head tipped up, ears back
    var hx = x + 1.8 * u, hy = y - 8.4 * u;
    ctx.fillStyle = '#9A7A5A';
    ell(ctx, hx, hy, 1.6 * u, 1.3 * u, -0.5); ctx.fill();
    [[-0.5, '#8A6A4A'], [0, '#9A7A5A']].forEach(function (e) {
      ctx.save();
      ctx.translate(hx - 0.6 * u, hy - 0.8 * u);
      ctx.rotate(-0.55 + e[0] + tw);
      ctx.fillStyle = e[1];
      ell(ctx, 0, -2.6 * u, 0.6 * u, 2.8 * u); ctx.fill();
      ctx.fillStyle = '#2A2A30';
      ell(ctx, 0, -5 * u, 0.5 * u, 0.6 * u); ctx.fill();
      ctx.restore();
    });
    ctx.fillStyle = '#F2C230';
    circ(ctx, hx + 0.5 * u, hy - 0.4 * u, 0.4 * u); ctx.fill();
    ctx.fillStyle = '#1E1E24';
    circ(ctx, hx + 0.6 * u, hy - 0.45 * u, 0.2 * u); ctx.fill();
    // the moonlight on its back
    ctx.fillStyle = 'rgba(255,248,225,0.22)';
    ell(ctx, x + 0.6 * u, y - 6.4 * u, 0.7 * u, 2 * u, 0.35); ctx.fill();
  }

  /* legendary: the cow that jumped over the moon */
  function cowmoon(ctx, W, H, t) {
    var m = moonAt(W, H, 0.7, 0.26, 0.075), u = W / 50;
    // the leap goes from low on one side, over the top of the moon, and down the other
    var p = (t * 0.16) % 1, a = Math.PI * (0.92 - p * 0.84);
    var R = Math.max(m.r * 2, W * 0.16);
    var cx = Math.max(W * 0.22, Math.min(W * 0.8, m.x + Math.cos(a) * R)), cy = Math.max(H * 0.3, m.y + m.r * 0.9 - Math.sin(a) * R * 0.75);
    pen(ctx, 'rgba(255,248,225,0.35)', W / 300);
    ctx.setLineDash([W / 100, W / 80]);
    ctx.beginPath();
    for (var k = 0; k <= 14; k++) { var b = Math.PI * (0.92 - k / 14 * 0.84), bx = Math.max(W * 0.22, Math.min(W * 0.8, m.x + Math.cos(b) * R)), by = Math.max(H * 0.3, m.y + m.r * 0.9 - Math.sin(b) * R * 0.75); if (k) ctx.lineTo(bx, by); else ctx.moveTo(bx, by); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.cos(a) * 0.45);
    // legs stretched out front and back
    pen(ctx, '#F2F0EA', 0.9 * u);
    seg(ctx, 2.4 * u, 0.6 * u, 5.2 * u, 2 * u); seg(ctx, 1.8 * u, 0.8 * u, 4.6 * u, 2.8 * u);
    seg(ctx, -2.4 * u, 0.6 * u, -5.4 * u, 2.2 * u); seg(ctx, -1.8 * u, 0.8 * u, -4.8 * u, 3 * u);
    ctx.fillStyle = '#1E1E24';
    [[5.2, 2], [4.6, 2.8], [-5.4, 2.2], [-4.8, 3]].forEach(function (h) { circ(ctx, h[0] * u, h[1] * u, 0.45 * u); ctx.fill(); });
    ctx.fillStyle = '#F2F0EA';
    ell(ctx, 0, 0, 3.8 * u, 1.9 * u); ctx.fill();
    ctx.fillStyle = '#2A2A30';
    ell(ctx, -1 * u, -0.5 * u, 1.3 * u, 0.9 * u, 0.4); ctx.fill();
    ell(ctx, 1.8 * u, 0.4 * u, 0.9 * u, 0.7 * u); ctx.fill();
    ctx.fillStyle = '#F2B8B0';
    ell(ctx, 0.6 * u, 1.6 * u, 0.9 * u, 0.5 * u); ctx.fill();
    ctx.fillStyle = '#F2F0EA';
    circ(ctx, 4.4 * u, -1 * u, 1.35 * u); ctx.fill();
    ctx.fillStyle = '#F2B8B0';
    ell(ctx, 5.4 * u, -0.5 * u, 0.9 * u, 0.7 * u); ctx.fill();
    ctx.fillStyle = '#1E1E24';
    circ(ctx, 4.5 * u, -1.4 * u, 0.25 * u); ctx.fill();
    pen(ctx, '#E8DCC2', 0.35 * u);
    seg(ctx, 3.9 * u, -2 * u, 3.5 * u, -2.9 * u); seg(ctx, 4.6 * u, -2.2 * u, 4.8 * u, -3.1 * u);
    pen(ctx, '#F2F0EA', 0.35 * u);
    ctx.beginPath(); ctx.moveTo(-3.8 * u, -0.4 * u); ctx.quadraticCurveTo(-5.6 * u, -2.4 * u, -6.4 * u, -1.6 * u); ctx.stroke();
    ctx.restore();
    star4(ctx, cx - 6 * u, cy + 3 * u, 0.9 * u, 'rgba(255,240,190,' + (0.5 + 0.5 * Math.sin(t * 4)) + ')');
  }


  /* ---------- Meteor Shower ---------- */

  /* two stargazers lying on a blanket, one pointing up */
  function stargazers(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5, 0.2), x = g.x, y = g.y;
    ctx.fillStyle = '#B8423A';
    poly(ctx, [x - 13 * u, y + 0.4 * u, x + 13 * u, y + 0.4 * u, x + 11 * u, y - 3 * u, x - 11 * u, y - 3 * u]); ctx.fill();
    pen(ctx, 'rgba(255,255,255,0.25)', 0.3 * u);
    for (var k = -3; k <= 3; k++) seg(ctx, x + k * 3.4 * u, y + 0.4 * u, x + k * 2.9 * u, y - 3 * u);
    [[-1, '#3A6AB8', '#F2C230'], [1, '#2E8A6A', '#5A3A22']].forEach(function (pp, i) {
      var px = x + pp[0] * 5.4 * u, py = y - 2 * u;
      // lying flat, knees up
      pen(ctx, '#1E2438', 1.4 * u);
      ctx.beginPath(); ctx.moveTo(px - 1 * u, py); ctx.lineTo(px + 2.4 * u, py - 3 * u); ctx.lineTo(px + 4.6 * u, py); ctx.stroke();
      ctx.fillStyle = pp[1];
      rr(ctx, px - 6.6 * u, py - 1.5 * u, 6.4 * u, 2.6 * u, 1.2 * u); ctx.fill();
      ctx.fillStyle = '#E8C09A';
      circ(ctx, px - 7.8 * u, py - 0.6 * u, 1.6 * u); ctx.fill();
      ctx.fillStyle = pp[2];
      ctx.beginPath(); ctx.arc(px - 8.2 * u, py - 0.5 * u, 1.7 * u, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
      if (i === 0) { pen(ctx, pp[1], 1.1 * u); seg(ctx, px - 4 * u, py - 1 * u, px - 2.6 * u, py - 6.6 * u); ctx.fillStyle = '#E8C09A'; circ(ctx, px - 2.5 * u, py - 7 * u, 0.6 * u); ctx.fill(); }
    });
    // a fresh streak where they're pointing
    var p = (t * 0.5) % 1;
    if (p < 0.4) {
      var sx = x - 4 * u + p * 30 * u, sy = H * 0.42 + p * 12 * u;
      var gr = ctx.createLinearGradient(sx - 8 * u, sy - 3 * u, sx, sy);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(255,255,255,0.95)');
      pen(ctx, gr, 0.4 * u);
      seg(ctx, sx - 8 * u, sy - 3 * u, sx, sy);
    }
  }

  /* a fireball: a big, bright green meteor breaking up as it falls */
  function fireball(ctx, W, H, t) {
    var p = (t * 0.22) % 1, x = W * (0.25 + p * 0.5), y = H * (0.36 + p * 0.22 + K.J().dy);
    var tx = x - W * 0.32, ty = y - H * 0.16;
    var gr = ctx.createLinearGradient(tx, ty, x, y);
    gr.addColorStop(0, 'rgba(120,255,170,0)');
    gr.addColorStop(0.7, 'rgba(160,255,190,0.55)');
    gr.addColorStop(1, 'rgba(240,255,240,0.95)');
    ctx.fillStyle = gr;
    var nx = -(y - ty), ny = x - tx, L = Math.sqrt(nx * nx + ny * ny), w = W * 0.018;
    nx = nx / L * w; ny = ny / L * w;
    poly(ctx, [tx, ty, x + nx, y + ny, x - nx, y - ny]); ctx.fill();
    glow(ctx, x, y, W * 0.07, [180, 255, 200], 0.8);
    ctx.fillStyle = '#FFFFFF';
    circ(ctx, x, y, W * 0.012); ctx.fill();
    // bits breaking off
    for (var k = 1; k <= 4; k++) { var f = k / 5; ctx.fillStyle = 'rgba(200,255,210,' + (0.8 - f * 0.5) + ')'; circ(ctx, x - (x - tx) * f * 0.6 + Math.sin(k * 3) * W * 0.01, y - (y - ty) * f * 0.6 + W * 0.012, W * 0.005); ctx.fill(); }
  }

  /* a domed observatory on a hill, its slit open to the sky */
  function observatory(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.55), x = g.x, y = g.y;
    ctx.fillStyle = '#D8DCE4';
    ctx.fillRect(x - 7 * u, y - 7 * u, 14 * u, 7 * u);
    ctx.fillStyle = '#EEF0F4';
    ctx.beginPath(); ctx.arc(x, y - 7 * u, 7.4 * u, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(80,90,120,0.25)';
    ctx.beginPath(); ctx.arc(x, y - 7 * u, 7.4 * u, Math.PI * 1.5, TAU); ctx.lineTo(x, y - 7 * u); ctx.fill();
    // the slit and the telescope looking out
    ctx.fillStyle = '#141A30';
    poly(ctx, [x - 1.2 * u, y - 14.2 * u, x + 1.2 * u, y - 14.2 * u, x + 1.6 * u, y - 7 * u, x - 1.6 * u, y - 7 * u]); ctx.fill();
    ctx.save();
    ctx.translate(x, y - 9 * u);
    ctx.rotate(-0.9 + Math.sin(t * 0.2) * 0.05);
    ctx.fillStyle = '#8A94A8';
    rr(ctx, -0.6 * u, -0.7 * u, 7 * u, 1.4 * u, 0.4 * u); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#3A4A6A';
    rr(ctx, x - 1.4 * u, y - 4.4 * u, 2.8 * u, 4.4 * u, 0.4 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,90,80,' + (0.5 + 0.5 * Math.sin(t * 3)) + ')';
    circ(ctx, x + 4.6 * u, y - 5 * u, 0.4 * u); ctx.fill();
  }

  /* star trails: the whole sky circling the Pole Star */
  function startrails(ctx, W, H, t) {
    var cx = W * (0.62 + K.J().dx * 0.3), cy = H * 0.28, rnd = K.rand(91);
    var spin = t * 0.02;
    for (var i = 0; i < 26; i++) {
      var r = W * (0.03 + rnd() * 0.5), a0 = rnd() * TAU + spin, len = 0.5 + rnd() * 0.7;
      var c = rnd() < 0.2 ? '255,214,170' : rnd() < 0.4 ? '190,210,255' : '255,255,255';
      ctx.strokeStyle = 'rgba(' + c + ',' + (0.35 + rnd() * 0.45) + ')';
      ctx.lineWidth = Math.max(1, W / 420);
      ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + len); ctx.stroke();
    }
    glow(ctx, cx, cy, W * 0.03, [255, 255, 255], 0.6);
    ctx.fillStyle = '#FFFFFF';
    circ(ctx, cx, cy, W * 0.006); ctx.fill();
  }

  /* a meteorite, still glowing in its little crater */
  function meteorite(ctx, W, H, t) {
    var u = W / 52, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    var pulse = 0.65 + 0.35 * Math.sin(t * 2.5);
    glow(ctx, x, y - 2 * u, 12 * u, [255, 130, 50], 0.6 * pulse);
    ctx.fillStyle = 'rgba(20,16,24,0.7)';
    ell(ctx, x, y - 0.3 * u, 9 * u, 1.8 * u); ctx.fill();
    ctx.fillStyle = '#6A5448';
    ell(ctx, x - 8 * u, y - 0.8 * u, 2.6 * u, 1.2 * u); ctx.fill();
    ell(ctx, x + 8 * u, y - 0.8 * u, 2.6 * u, 1.2 * u); ctx.fill();
    ctx.fillStyle = '#5A4A44';
    ctx.beginPath(); ctx.moveTo(x - 3.4 * u, y - 0.6 * u); ctx.quadraticCurveTo(x - 3.8 * u, y - 3.8 * u, x - 0.6 * u, y - 4.4 * u); ctx.quadraticCurveTo(x + 3.4 * u, y - 4.4 * u, x + 3.6 * u, y - 0.8 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,120,0.35)';
    ell(ctx, x - 1 * u, y - 3.4 * u, 1.6 * u, 0.6 * u); ctx.fill();
    pen(ctx, 'rgba(255,170,80,' + (0.7 + 0.3 * pulse) + ')', 0.5 * u);
    K.path(ctx, [x - 2.4 * u, y - 2.4 * u, x - 0.6 * u, y - 1.6 * u, x + 0.4 * u, y - 3 * u, x + 2.2 * u, y - 1.6 * u]);
    seg(ctx, x - 0.6 * u, y - 1.6 * u, x - 0.2 * u, y - 0.6 * u);
    for (var k = 0; k < 3; k++) {
      var p = (t * 0.4 + k / 3) % 1;
      ctx.fillStyle = 'rgba(210,210,220,' + (0.45 * (1 - p)) + ')';
      circ(ctx, x + Math.sin(p * 4 + k) * 1.4 * u, y - 5 * u - p * 8 * u, (0.8 + p * 1.6) * u); ctx.fill();
    }
  }


  /* a flying saucer, lights going round its rim */
  function ufo(ctx, W, H, t) {
    var u = W / 60, x = W * (0.5 + K.J().dx * 0.4) + Math.sin(t * 0.7) * 4 * u, y = H * (0.5 + K.J().dy * 0.4) + Math.sin(t * 1.4) * 1.2 * u;
    var g = ctx.createLinearGradient(0, y, 0, H * 0.9);
    g.addColorStop(0, 'rgba(180,255,200,0.35)');
    g.addColorStop(1, 'rgba(180,255,200,0)');
    ctx.fillStyle = g;
    poly(ctx, [x - 2.6 * u, y + 1 * u, x + 2.6 * u, y + 1 * u, x + 8 * u, H * 0.9, x - 8 * u, H * 0.9]); ctx.fill();
    ctx.fillStyle = 'rgba(170,220,255,0.85)';
    ctx.beginPath(); ctx.arc(x, y - 1 * u, 3.4 * u, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#9AA4B8';
    ell(ctx, x, y, 9 * u, 2.2 * u); ctx.fill();
    ctx.fillStyle = '#C8D0DC';
    ell(ctx, x, y - 0.6 * u, 8 * u, 1.2 * u); ctx.fill();
    for (var k = 0; k < 6; k++) {
      var a = k / 6 * TAU + t * 2, lx = x + Math.cos(a) * 7.4 * u, ly = y + Math.sin(a) * 1.2 * u + 0.6 * u;
      if (Math.sin(a) < -0.2) continue;
      ctx.fillStyle = ['#FF6B5A', '#FFE07A', '#7AF2A0'][k % 3];
      circ(ctx, lx, ly, 0.6 * u); ctx.fill();
    }
  }

  /* ---------- Sun Halo ---------- */

  /* mares' tails: wispy cirrus hooked by the wind high up */
  function marestails(ctx, W, H, t) {
    var rnd = K.rand(101), dx = Math.sin(t * 0.1) * W * 0.02;
    for (var i = 0; i < 7; i++) {
      var x = W * (0.15 + rnd() * 0.7) + dx, y = H * (0.32 + rnd() * 0.3), L = W * (0.15 + rnd() * 0.18);
      pen(ctx, 'rgba(255,255,255,' + (0.5 + rnd() * 0.35) + ')', W * (0.006 + rnd() * 0.006));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + L * 0.6, y - L * 0.05, x + L, y - L * 0.3);
      ctx.stroke();
      pen(ctx, 'rgba(255,255,255,0.35)', W * 0.004);
      for (var k = 1; k < 4; k++) { var f = k / 4, px = x + L * f * 0.9, py = y - L * 0.08 * f * f * 3; seg(ctx, px, py, px - W * 0.02, py + H * 0.03); }
    }
  }

  /* two contrails crossing high in the sky, their planes still drawing them */
  function contrails(ctx, W, H, t) {
    var J = K.J();
    [[0.12, 0.62, 0.9, 0.36, 0], [0.86, 0.66, 0.16, 0.34, 0.5]].forEach(function (c) {
      var p = 0.55 + ((t * 0.03 + c[4]) % 0.45);
      var x0 = W * c[0], y0 = H * (c[1] + J.dy), x1 = W * (c[0] + (c[2] - c[0]) * p), y1 = H * (c[1] + (c[3] - c[1]) * p + J.dy);
      var g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(255,255,255,0.1)');
      g.addColorStop(1, 'rgba(255,255,255,0.9)');
      pen(ctx, g, W * 0.012);
      seg(ctx, x0, y0, x1, y1);
      ctx.fillStyle = '#F4F6FA';
      var a = Math.atan2(y1 - y0, x1 - x0);
      ctx.save(); ctx.translate(x1, y1); ctx.rotate(a);
      ell(ctx, W * 0.006, 0, W * 0.014, W * 0.003); ctx.fill();
      tri(ctx, 0, 0, -W * 0.006, -W * 0.012, -W * 0.01, 0); ctx.fill();
      tri(ctx, 0, 0, -W * 0.006, W * 0.012, -W * 0.01, 0); ctx.fill();
      ctx.restore();
    });
  }

  /* a sundial in the garden, its shadow telling the time */
  function sundial(ctx, W, H, t) {
    var u = W / 58, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    ctx.fillStyle = '#B8B2A6';
    rr(ctx, x - 3 * u, y - 1.2 * u, 6 * u, 1.2 * u, 0.4 * u); ctx.fill();
    poly(ctx, [x - 1.8 * u, y - 1.2 * u, x + 1.8 * u, y - 1.2 * u, x + 1.2 * u, y - 7 * u, x - 1.2 * u, y - 7 * u]); ctx.fill();
    ctx.fillStyle = '#C9C3B6';
    ell(ctx, x, y - 7.4 * u, 5.4 * u, 1.6 * u); ctx.fill();
    ctx.fillStyle = '#C8A04A';
    ell(ctx, x, y - 7.7 * u, 4.6 * u, 1.2 * u); ctx.fill();
    pen(ctx, 'rgba(90,70,30,0.6)', 0.18 * u);
    for (var k = 0; k < 9; k++) { var a = Math.PI * (1 + k / 8); seg(ctx, x + Math.cos(a) * 3.4 * u, y - 7.7 * u + Math.sin(a) * 0.9 * u, x + Math.cos(a) * 4.3 * u, y - 7.7 * u + Math.sin(a) * 1.1 * u); }
    // the shadow, creeping round
    var sa = Math.PI * (1.2 + ((t * 0.02) % 0.6));
    pen(ctx, 'rgba(60,50,30,0.5)', 0.5 * u);
    seg(ctx, x, y - 7.7 * u, x + Math.cos(sa) * 3.6 * u, y - 7.7 * u + Math.sin(sa) * 0.9 * u);
    ctx.fillStyle = '#8A6A2A';
    tri(ctx, x - 0.2 * u, y - 7.8 * u, x + 2.6 * u, y - 7.8 * u, x - 0.2 * u, y - 10.4 * u); ctx.fill();
    K.flower(ctx, x - 7 * u, y, 1.2 * u, '#E8789A');
    K.flower(ctx, x + 7.4 * u, y, 1.1 * u, '#F2C230', '#8A4A2A');
  }

  /* a skylark hanging high in the sky, singing */
  function skylark(ctx, W, H, t) {
    var u = W / 60, x = W * (0.5 + K.J().dx * 0.4), y = H * (0.52 + K.J().dy * 0.4) + Math.sin(t * 2) * 0.6 * u;
    var fl = Math.sin(t * 22) * 1;
    ctx.fillStyle = '#8A6A4A';
    [-1, 1].forEach(function (s) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 2.4 * u, y - (2 + fl) * u, x + s * 4.6 * u, y - (1 + fl * 1.4) * u); ctx.quadraticCurveTo(x + s * 2.6 * u, y + 0.4 * u, x, y + 0.8 * u); ctx.fill();
    });
    ell(ctx, x, y + 0.4 * u, 1 * u, 2.2 * u); ctx.fill();
    ctx.fillStyle = '#C8A87A';
    ell(ctx, x, y + 0.6 * u, 0.6 * u, 1.4 * u); ctx.fill();
    ctx.fillStyle = '#8A6A4A';
    circ(ctx, x, y - 1.8 * u, 0.9 * u); ctx.fill();
    tri(ctx, x - 0.4 * u, y - 2.4 * u, x, y - 3.6 * u, x + 0.3 * u, y - 2.4 * u); ctx.fill();
    tri(ctx, x - 0.7 * u, y + 2.4 * u, x + 0.7 * u, y + 2.4 * u, x, y + 3.8 * u); ctx.fill();
    for (var k = 0; k < 3; k++) {
      var p = (t * 0.5 + k / 3) % 1;
      K.note(ctx, x + (2 + p * 6) * u * (k % 2 ? 1 : -1), y - 3 * u - p * 6 * u, 1.3 * u, 'rgba(60,60,90,' + (0.8 * (1 - p)) + ')');
    }
  }

  /* a weather station: the white louvred box and the spinning cups */
  function station2(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    // the screen on its legs
    pen(ctx, '#E8ECF0', 0.6 * u);
    seg(ctx, x - 6 * u, y, x - 6 * u, y - 7 * u); seg(ctx, x - 1 * u, y, x - 1 * u, y - 7 * u);
    ctx.fillStyle = '#F6F7F9';
    ctx.fillRect(x - 7 * u, y - 13 * u, 7 * u, 6 * u);
    poly(ctx, [x - 7.6 * u, y - 13 * u, x + 0.6 * u, y - 13 * u, x - 0.4 * u, y - 14.4 * u, x - 6.6 * u, y - 14.4 * u]); ctx.fill();
    pen(ctx, 'rgba(120,130,150,0.55)', 0.2 * u);
    for (var k = 0; k < 5; k++) seg(ctx, x - 6.6 * u, y - 12.2 * u + k * 1.1 * u, x - 0.4 * u, y - 12.6 * u + k * 1.1 * u);
    // the anemometer mast and cups
    pen(ctx, '#9AA4B8', 0.5 * u);
    seg(ctx, x + 5 * u, y, x + 5 * u, y - 17 * u);
    var sp = t * 6;
    for (var c = 0; c < 3; c++) {
      var a = sp + c * TAU / 3, cx2 = x + 5 * u + Math.cos(a) * 3 * u, cy2 = y - 17 * u + Math.sin(a) * 0.8 * u;
      pen(ctx, '#9AA4B8', 0.3 * u);
      seg(ctx, x + 5 * u, y - 17 * u, cx2, cy2);
      ctx.fillStyle = Math.sin(a) > 0 ? '#5A6478' : '#C9D0DC';
      circ(ctx, cx2, cy2, 0.9 * u); ctx.fill();
    }
    ctx.fillStyle = '#D8432F';
    tri(ctx, x + 5 * u, y - 19 * u, x + 7.6 * u, y - 18.4 * u, x + 5 * u, y - 17.8 * u); ctx.fill();
  }

  /* a kestrel hovering, perfectly still against the wind */
  function kestrel(ctx, W, H, t) {
    var u = W / 60, x = W * (0.48 + K.J().dx * 0.4), y = H * (0.5 + K.J().dy * 0.4);
    K.soar(ctx, x, y, 4.2 * u, 'kestrel', t * 16);
    ctx.fillStyle = '#B8743E';
    poly(ctx, [x - 0.8 * u, y + 3.6 * u, x + 0.8 * u, y + 3.6 * u, x + 1.6 * u, y + 7 * u, x - 1.6 * u, y + 7 * u]); ctx.fill();
    ctx.fillStyle = '#2A2A30';
    ctx.fillRect(x - 1.6 * u, y + 6.4 * u, 3.2 * u, 0.6 * u);
    ctx.fillStyle = '#8A94A8';
    circ(ctx, x, y - 3.2 * u, 1.1 * u); ctx.fill();
  }

  /* legendary: the upside-down rainbow, a smile of colour high above the sun */
  function smilearc(ctx, W, H, t) {
    var s = sunPos(W, H, 0.5, 0.34);
    var cx = W * 0.5 + (s.x - W * 0.5) * 0.5, R = W * 0.24, bot = H * 0.3, cy = bot - R, bw = W * 0.011;
    var cols = ['#A36BFF', '#5C6BFF', '#4DA3FF', '#5BD46F', '#FFD84D', '#FF9F43', '#FF5A5A'];
    ctx.save();
    ctx.globalAlpha = 0.85 + 0.1 * Math.sin(t);
    for (var i = 0; i < cols.length; i++) {
      ctx.strokeStyle = cols[i];
      ctx.lineWidth = bw * 1.15;
      ctx.beginPath(); ctx.arc(cx, cy, R - (cols.length - 1 - i) * bw, Math.PI * 0.27, Math.PI * 0.73); ctx.stroke();
    }
    ctx.restore();
    glow(ctx, cx, bot - bw * 3, W * 0.12, [255, 255, 255], 0.18);
  }


  /* ---------- Supermoon ---------- */

  /* a city skyline under the huge moon */
  function cityrise(ctx, W, H, t) {
    var u = W / 60, base = H * 0.96, rnd = K.rand(113);
    var x = W * 0.1;
    while (x < W * 0.92) {
      var w = (4 + rnd() * 5) * u, h = (8 + rnd() * 16) * u;
      ctx.fillStyle = rnd() < 0.5 ? '#141A30' : '#1A2038';
      ctx.fillRect(x, base - h, w, h);
      if (rnd() < 0.25) { ctx.fillRect(x + w * 0.4, base - h - 3 * u, w * 0.2, 3 * u); }
      for (var r = 0; r < Math.floor(h / (2.4 * u)) - 1; r++) for (var c = 0; c < Math.floor(w / (1.8 * u)); c++) {
        if (rnd() < 0.35) { ctx.fillStyle = 'rgba(255,214,130,' + (0.6 + 0.4 * Math.sin(t * 0.5 + r + c)) + ')'; ctx.fillRect(x + 0.6 * u + c * 1.8 * u, base - h + 1.4 * u + r * 2.4 * u, 0.8 * u, 1 * u); }
      }
      x += w + rnd() * 1.2 * u;
    }
    ctx.fillStyle = 'rgba(255,80,70,' + (0.4 + 0.6 * Math.max(0, Math.sin(t * 2))) + ')';
    circ(ctx, W * 0.5, base - 25 * u, 0.4 * u); ctx.fill();
  }

  /* a bare tree, black against the giant moon */
  function moontree(ctx, W, H, t) {
    var m = moonAt(W, H, 0.6, 0.32, 0.12), u = W / 60, x = m.x - 4 * u, y = K.at(W, H, m.x / W, 0).y;
    var sway = Math.sin(t * 0.6) * 0.3;
    pen(ctx, '#0C1022', 1.8 * u);
    seg(ctx, x, y, x + 0.4 * u, m.y + m.r * 0.6);
    function branch(bx, by, a, len, w, d) {
      var ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
      pen(ctx, '#0C1022', Math.max(0.3 * u, w));
      seg(ctx, bx, by, ex, ey);
      if (d > 0) { branch(ex, ey, a - 0.45 + sway * 0.1, len * 0.7, w * 0.65, d - 1); branch(ex, ey, a + 0.4 + sway * 0.1, len * 0.68, w * 0.65, d - 1); }
    }
    branch(x + 0.4 * u, m.y + m.r * 0.6, -Math.PI / 2 - 0.5, 6 * u, 1.2 * u, 3);
    branch(x + 0.4 * u, m.y + m.r * 0.9, -Math.PI / 2 + 0.55, 6.5 * u, 1.2 * u, 3);
    branch(x + 0.4 * u, m.y + m.r * 1.6, -Math.PI / 2 - 1.1, 5 * u, 1 * u, 2);
    // an owl on the branch, just a shape
    ctx.fillStyle = '#0C1022';
    ell(ctx, x + 4.2 * u, m.y + m.r * 0.2, 1.1 * u, 1.5 * u); ctx.fill();
    tri(ctx, x + 3.3 * u, m.y + m.r * 0.2 - 1.2 * u, x + 3.7 * u, m.y + m.r * 0.2 - 2.2 * u, x + 4 * u, m.y + m.r * 0.2 - 1.3 * u); ctx.fill();
    tri(ctx, x + 5.1 * u, m.y + m.r * 0.2 - 1.2 * u, x + 4.7 * u, m.y + m.r * 0.2 - 2.2 * u, x + 4.4 * u, m.y + m.r * 0.2 - 1.3 * u); ctx.fill();
  }

  /* the big tide: a harbour full to the brim, a boat riding high */
  function hightide(ctx, W, H, t) {
    var u = W / 60, top = H * 0.8 + Math.sin(t * 0.8) * 0.5 * u, m = moonAt(W, H, 0.6, 0.32, 0.12);
    var wx = W * (0.62 + K.J().dx * 0.2);
    lake(ctx, W, H, top, [22, 36, 76]);
    for (var i = 0; i < 6; i++) { var f = i / 5; ctx.fillStyle = 'rgba(255,246,215,' + (0.6 - f * 0.3) + ')'; ctx.fillRect(m.x - W * 0.04 + Math.sin(t * 3 + i) * W * 0.01, top + (H - top) * f * 0.9 + H * 0.005, W * 0.06, Math.max(1, H * 0.005)); }
    // the harbour wall, the water right up to its top
    ctx.fillStyle = '#4A5068';
    ctx.fillRect(wx, top - 2 * u, W - wx, H - top + 2 * u);
    ctx.fillStyle = '#5E6680';
    ctx.fillRect(wx, top - 2.8 * u, W - wx, 1 * u);
    pen(ctx, '#8A94A8', 0.35 * u);
    seg(ctx, wx + 3 * u, top - 2.6 * u, wx + 3 * u, H); seg(ctx, wx + 5 * u, top - 2.6 * u, wx + 5 * u, H);
    for (var r = 0; r < 4; r++) seg(ctx, wx + 3 * u, top + r * 2.4 * u, wx + 5 * u, top + r * 2.4 * u);
    // a boat floating high
    K.boat(ctx, wx - 9 * u, top + 0.6 * u, u, { kind: 'row', hull: '#E8F0F8', dir: -1 }, t);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    seg(ctx, wx - 4 * u, top - 1.4 * u, wx, top - 2.2 * u);
  }

  /* a kid on a rope swing, swinging across the moon */
  function moonswing(ctx, W, H, t) {
    var u = W / 50, m = moonAt(W, H, 0.6, 0.32, 0.12);
    var by = Math.max(H * 0.36, m.y + m.r * 0.6);
    // the branch it hangs from
    pen(ctx, '#0C1022', 1.8 * u);
    ctx.beginPath(); ctx.moveTo(0, by - 1 * u); ctx.quadraticCurveTo(W * 0.45, by - 3 * u, W * 0.86, by + 1.4 * u); ctx.stroke();
    pen(ctx, '#0C1022', 0.8 * u);
    seg(ctx, W * 0.66, by - 1.6 * u, W * 0.74, by - 5 * u);
    var px = m.x - 1 * u, py = by - 1.8 * u;
    var a = Math.sin(t * 1.4) * 0.5, L = H * 0.3;
    var sx = px + Math.sin(a) * L, sy = py + Math.cos(a) * L;
    pen(ctx, '#0C1022', 0.3 * u);
    seg(ctx, px - 1.6 * u, py, sx - 1.6 * u, sy); seg(ctx, px + 1.6 * u, py, sx + 1.6 * u, sy);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-a);
    ctx.fillStyle = '#0C1022';
    ctx.fillRect(-2.4 * u, -0.4 * u, 4.8 * u, 0.8 * u);
    K.person(ctx, 0, 3.4 * u, u, { pose: 'sit', seat: 3.6, kid: true, coat: '#0C1022', legs: '#0C1022', skin: '#0C1022', hair: '#0C1022', boots: '#0C1022', arms: [2.6, 2.9], eyes: false });
    ctx.restore();
  }


  /* a tiny astronaut on the moon, waving */
  function astronaut(ctx, W, H, t) {
    var m = moonAt(W, H, 0.6, 0.32, 0.12), u = m.r / 9;
    var x = m.x - m.r * 0.2, y = m.y - m.r * 0.15;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.15);
    // the flag
    pen(ctx, '#8A8A94', 0.3 * u);
    seg(ctx, 3 * u, 0, 3 * u, -8 * u);
    ctx.fillStyle = '#E8432F';
    var fl = Math.sin(t * 2) * 0.3 * u;
    poly(ctx, [3 * u, -8 * u, 7 * u, -7.4 * u + fl, 3 * u, -6 * u]); ctx.fill();
    // the suit
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, -1.6 * u, -6 * u, 3.2 * u, 4 * u, 1 * u); ctx.fill();
    pen(ctx, '#FFFFFF', 1.1 * u);
    seg(ctx, -0.7 * u, -2.2 * u, -0.9 * u, 0); seg(ctx, 0.7 * u, -2.2 * u, 0.9 * u, 0);
    var wave = Math.sin(t * 4) * 0.5;
    seg(ctx, -1.4 * u, -5.4 * u, -3 * u + Math.sin(wave) * u, -8 * u);
    seg(ctx, 1.4 * u, -5.4 * u, 2.4 * u, -3.4 * u);
    circ(ctx, 0, -7.4 * u, 1.7 * u); ctx.fill();
    ctx.fillStyle = '#F2B84A';
    ell(ctx, 0.4 * u, -7.4 * u, 1.1 * u, 0.9 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    circ(ctx, 0.1 * u, -7.8 * u, 0.3 * u); ctx.fill();
    ctx.fillStyle = '#C9CED8';
    ctx.fillRect(-2.4 * u, -6 * u, 0.9 * u, 3 * u);
    ctx.restore();
  }

  /* legendary: a blood moon, the full moon turned red in the Earth's shadow */
  function bloodmoon(ctx, W, H, t) {
    var m = moonAt(W, H, 0.6, 0.32, 0.12);
    glow(ctx, m.x, m.y, m.r * 3.2, [200, 60, 40], 0.4 + 0.05 * Math.sin(t));
    var g = ctx.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, m.r * 0.1, m.x, m.y, m.r * 1.02);
    g.addColorStop(0, '#E8743A');
    g.addColorStop(0.7, '#B83A22');
    g.addColorStop(1, '#6A1A12');
    ctx.fillStyle = g;
    circ(ctx, m.x, m.y, m.r * 1.02); ctx.fill();
    ctx.fillStyle = 'rgba(90,20,10,0.35)';
    circ(ctx, m.x - m.r * 0.3, m.y - m.r * 0.2, m.r * 0.22); ctx.fill();
    circ(ctx, m.x + m.r * 0.25, m.y + m.r * 0.3, m.r * 0.16); ctx.fill();
    circ(ctx, m.x + m.r * 0.35, m.y - m.r * 0.35, m.r * 0.1); ctx.fill();
    K.stars(ctx, W * 0.1, H * 0.1, W * 0.9, H * 0.6, 26, 117, W / 300, t);
  }

  /* ---------- Rainbow ---------- */

  /* someone with a rainbow-striped umbrella */
  function rainbowbrolly(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    var p = K.person(ctx, x, y, u, { coat: '#2F3A5A', legs: '#2C3550', hair: '#8A4A2A', hairLong: true, arms: [0.3, 2.2], boots: '#E8432F' });
    var hx = p.hand[0], hy = p.hand[1];
    pen(ctx, '#3A3A40', 0.4 * u);
    seg(ctx, hx, hy + 1 * u, hx - 0.4 * u, hy - 7 * u);
    var cols = ['#FF5A5A', '#FF9F43', '#FFD84D', '#5BD46F', '#4DA3FF', '#A36BFF'];
    var cx = hx - 0.4 * u, cy = hy - 7 * u, R = 8.4 * u, tilt = Math.sin(t * 0.8) * 0.05;
    for (var i = 0; i < 6; i++) {
      var a0 = Math.PI + tilt + i * Math.PI / 6, a1 = a0 + Math.PI / 6;
      ctx.fillStyle = cols[i];
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, Math.PI + tilt, TAU + tilt); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3A3A40';
    circ(ctx, cx, cy - 0.1 * u, 0.5 * u); ctx.fill();
  }

  /* a chalk rainbow drawn on the pavement */
  function chalk(ctx, W, H, t) {
    var u = W / 58, base = H * 0.86;
    ctx.fillStyle = '#9A9A9E';
    ctx.fillRect(0, base, W, H - base);
    pen(ctx, 'rgba(60,60,70,0.4)', 0.25 * u);
    for (var k = 1; k < 6; k++) seg(ctx, W * k / 6, base, W * k / 6 - 2 * u, H);
    seg(ctx, 0, base + (H - base) * 0.5, W, base + (H - base) * 0.5);
    var cx = W * (0.5 + K.J().dx * 0.3), cy = base + (H - base) * 0.85;
    var cols = ['#FF8A8A', '#FFC07A', '#FFE48A', '#9AE6A0', '#8AC6FF', '#C09AFF'];
    for (var i = 0; i < 6; i++) {
      ctx.strokeStyle = cols[i];
      ctx.lineWidth = Math.max(1, 1.1 * u);
      ctx.beginPath(); ctx.ellipse(cx, cy, (10 - i * 1.2) * u, (5 - i * 0.6) * u, 0, Math.PI, TAU); ctx.stroke();
    }
    // a cloud at each end, and the chalk
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    K.cloud(ctx, cx - 13 * u, cy - 0.5 * u, 2.4 * u, 'rgba(255,255,255,0.9)');
    K.cloud(ctx, cx + 7.4 * u, cy - 0.5 * u, 2.4 * u, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = '#FFE48A';
    ctx.save(); ctx.translate(cx + 13 * u, base + 2 * u); ctx.rotate(0.4); rr(ctx, -1.4 * u, -0.4 * u, 2.8 * u, 0.8 * u, 0.3 * u); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#8AC6FF';
    ctx.save(); ctx.translate(cx - 15 * u, base + 3.4 * u); ctx.rotate(-0.6); rr(ctx, -1.4 * u, -0.4 * u, 2.8 * u, 0.8 * u, 0.3 * u); ctx.fill(); ctx.restore();
    void t;
  }

  /* a rainbow trout leaping from the river */
  function trout(ctx, W, H, t) {
    var u = W / 46, wy = H * 0.86, x = W * (0.5 + K.J().dx * 0.3);
    lake(ctx, W, H, wy, [70, 110, 150]);
    var p = (t * 0.4) % 1, arc = Math.sin(p * Math.PI);
    var fx = x - 6 * u + p * 12 * u, fy = wy - arc * 10 * u, a = Math.cos(p * Math.PI) * -0.9;
    if (p < 0.92) {
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(a);
      ctx.fillStyle = '#9AA68A';
      ctx.beginPath(); ctx.moveTo(-5 * u, 0); ctx.quadraticCurveTo(-1 * u, -2.4 * u, 4 * u, -0.6 * u); ctx.quadraticCurveTo(5.2 * u, 0, 4 * u, 0.6 * u); ctx.quadraticCurveTo(-1 * u, 2.4 * u, -5 * u, 0); ctx.fill();
      ctx.fillStyle = '#F2B8C8';
      ctx.beginPath(); ctx.moveTo(-4.6 * u, 0.1 * u); ctx.quadraticCurveTo(0, -0.6 * u, 4 * u, 0); ctx.quadraticCurveTo(0, 0.9 * u, -4.6 * u, 0.1 * u); ctx.fill();
      ctx.fillStyle = '#E8E4D8';
      ctx.beginPath(); ctx.moveTo(-3 * u, 0.9 * u); ctx.quadraticCurveTo(0, 1.9 * u, 3.6 * u, 0.6 * u); ctx.quadraticCurveTo(0, 1.2 * u, -3 * u, 0.9 * u); ctx.fill();
      ctx.fillStyle = '#4A4E3A';
      for (var k = 0; k < 7; k++) { circ(ctx, -3 * u + k * 1 * u, -1 * u + Math.sin(k * 2) * 0.3 * u, 0.22 * u); ctx.fill(); }
      ctx.fillStyle = '#8A967A';
      tri(ctx, -4.6 * u, 0, -7 * u, -1.8 * u, -7 * u, 1.8 * u); ctx.fill();
      ctx.fillStyle = '#1F2433';
      circ(ctx, 3 * u, -0.4 * u, 0.3 * u); ctx.fill();
      ctx.restore();
    }
    K.splash(ctx, x - 6 * u, wy, 2 * u, t);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ell(ctx, x + 6 * u, wy + 0.6 * u, (1 + p * 4) * u, (0.3 + p) * u); ctx.stroke();
  }

  /* rainbow bunting strung across the sky */
  function bunting(ctx, W, H, t) {
    var cols = ['#FF5A5A', '#FF9F43', '#FFD84D', '#5BD46F', '#4DA3FF', '#A36BFF'];
    [[0.52, 0], [0.64, 3]].forEach(function (row, ri) {
      var y0 = H * (row[0] + K.J().dy * 0.4), sag = H * 0.06;
      pen(ctx, 'rgba(255,255,255,0.85)', W / 300);
      ctx.beginPath(); ctx.moveTo(W * 0.1, y0); ctx.quadraticCurveTo(W * 0.5, y0 + sag * 2, W * 0.9, y0); ctx.stroke();
      for (var i = 0; i < 9; i++) {
        var f = (i + 0.5) / 9, x = W * (0.1 + f * 0.8), y = y0 + sag * 4 * f * (1 - f);
        var fl = Math.sin(t * 3 + i + ri) * W * 0.004;
        ctx.fillStyle = cols[(i + row[1]) % 6];
        tri(ctx, x - W * 0.032, y, x + W * 0.032, y, x + fl, y + H * 0.05); ctx.fill();
      }
    });
  }

  /* a rainbow-striped crossing, with its flashing beacons */
  function crossing(ctx, W, H, t) {
    var u = W / 58, base = H * 0.86;
    ctx.fillStyle = '#4A4E58';
    ctx.fillRect(0, base, W, H - base);
    var cols = ['#FF5A5A', '#FF9F43', '#FFD84D', '#5BD46F', '#4DA3FF', '#A36BFF'];
    var cx = W * (0.5 + K.J().dx * 0.3);
    for (var i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i];
      poly(ctx, [cx - 12 * u + i * 4 * u, base + 1 * u, cx - 9.6 * u + i * 4 * u, base + 1 * u, cx - 9.2 * u + i * 4.6 * u, H, cx - 12.2 * u + i * 4.6 * u, H]);
      ctx.fill();
    }
    [cx - 15 * u, cx + 14 * u].forEach(function (bx, k) {
      pen(ctx, '#1E1E24', 0.5 * u);
      ctx.setLineDash([1 * u, 1 * u]);
      seg(ctx, bx, base + 1 * u, bx, base - 14 * u);
      ctx.setLineDash([]);
      var on = Math.sin(t * 4 + k * Math.PI) > 0;
      if (on) glow(ctx, bx, base - 15 * u, 4 * u, [255, 170, 60], 0.6);
      ctx.fillStyle = on ? '#FFB84A' : '#C8802A';
      circ(ctx, bx, base - 15 * u, 1.6 * u); ctx.fill();
    });
  }

  /* an artist at an easel, painting the rainbow */
  function painter(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.4), x = g.x, y = g.y;
    // the easel and canvas
    var ex = x + 8 * u;
    pen(ctx, '#8A5A34', 0.6 * u);
    seg(ctx, ex - 3 * u, y, ex, y - 14 * u); seg(ctx, ex + 3 * u, y, ex, y - 14 * u); seg(ctx, ex, y - 12 * u, ex + 1 * u, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ex - 4.6 * u, y - 15 * u, 9.2 * u, 7 * u);
    var cols = ['#FF5A5A', '#FF9F43', '#FFD84D', '#5BD46F', '#4DA3FF', '#A36BFF'];
    for (var i = 0; i < 6; i++) { ctx.strokeStyle = cols[i]; ctx.lineWidth = Math.max(1, 0.5 * u); ctx.beginPath(); ctx.arc(ex, y - 8.6 * u, (4 - i * 0.45) * u, Math.PI, TAU); ctx.stroke(); }
    ctx.fillStyle = '#6EA45E';
    ctx.fillRect(ex - 4.6 * u, y - 9.4 * u, 9.2 * u, 1.4 * u);
    // the painter
    var dab = Math.sin(t * 3) * 0.15;
    var p = K.person(ctx, x, y, u, { coat: '#E8DCC8', legs: '#3A4A7A', hat: 'beanie', hatCol: '#B8423A', arms: [0.9, 1.5 + dab], hair: '#5A3A22' });
    pen(ctx, '#6B4A2B', 0.35 * u);
    seg(ctx, p.hand[0], p.hand[1], p.hand[0] + 2.6 * u, p.hand[1] - 1.6 * u);
    ctx.fillStyle = '#C8A06A';
    ell(ctx, p.hand2[0] - 0.6 * u, p.hand2[1], 1.8 * u, 1.1 * u, 0.3); ctx.fill();
    ['#FF5A5A', '#FFD84D', '#4DA3FF'].forEach(function (c, k) { ctx.fillStyle = c; circ(ctx, p.hand2[0] - 1.4 * u + k * 0.8 * u, p.hand2[1] - 0.2 * u, 0.3 * u); ctx.fill(); });
  }

  /* ---------- Sun Dog ---------- */

  /* a sun dog: a real dog, in sunglasses */
  function shadesdog(ctx, W, H, t) {
    var u = W / 54, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    var d = K.dog(ctx, x, y, u, { col: '#E0B070', ear: 'flop', pose: 'sit', collar: '#2F7BD8', wag: t * 6 });
    var hx = d.head[0], hy = d.head[1];
    ctx.fillStyle = '#1E1E24';
    rr(ctx, hx - 0.4 * u, hy - 0.9 * u, 2 * u, 1.2 * u, 0.4 * u); ctx.fill();
    rr(ctx, hx + 2 * u, hy - 0.8 * u, 1.4 * u, 1.1 * u, 0.4 * u); ctx.fill();
    pen(ctx, '#1E1E24', 0.3 * u);
    seg(ctx, hx + 1.6 * u, hy - 0.4 * u, hx + 2 * u, hy - 0.4 * u);
    seg(ctx, hx - 0.4 * u, hy - 0.5 * u, hx - 1.6 * u, hy - 0.2 * u);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(hx + 0.1 * u, hy - 0.7 * u, 0.5 * u, 0.3 * u);
  }

  /* a hot dog, mustard and all */
  function hotdog(ctx, W, H, t) {
    var u = W / 54, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    ctx.fillStyle = '#F2F0EA';
    poly(ctx, [x - 8 * u, y - 0.4 * u, x + 8 * u, y - 0.4 * u, x + 9 * u, y - 2.4 * u, x - 9 * u, y - 2.4 * u]); ctx.fill();
    ctx.fillStyle = '#E0A85A';
    rr(ctx, x - 7.6 * u, y - 5.6 * u, 15.2 * u, 3.6 * u, 1.8 * u); ctx.fill();
    ctx.fillStyle = '#B8542E';
    rr(ctx, x - 8.6 * u, y - 6.6 * u, 17.2 * u, 2.2 * u, 1.1 * u); ctx.fill();
    ctx.fillStyle = '#EAB86A';
    rr(ctx, x - 7.6 * u, y - 6.2 * u, 15.2 * u, 1.6 * u, 0.8 * u); ctx.fill();
    ctx.fillStyle = '#B8542E';
    rr(ctx, x - 8.6 * u, y - 7 * u, 17.2 * u, 1.6 * u, 0.8 * u); ctx.fill();
    pen(ctx, '#F2C230', 0.45 * u);
    ctx.beginPath();
    for (var k = 0; k <= 12; k++) { var px = x - 7 * u + k * 1.17 * u, py = y - 6.6 * u + (k % 2 ? -0.5 : 0.4) * u; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke();
    for (var s = 0; s < 3; s++) {
      var p = (t * 0.5 + s / 3) % 1;
      pen(ctx, 'rgba(255,255,255,' + (0.5 * (1 - p)) + ')', 0.35 * u);
      ctx.beginPath(); ctx.moveTo(x - 3 * u + s * 3 * u, y - 8 * u - p * 5 * u); ctx.quadraticCurveTo(x - 2 * u + s * 3 * u, y - 9.5 * u - p * 5 * u, x - 3 * u + s * 3 * u, y - 11 * u - p * 5 * u); ctx.stroke();
    }
  }

  /* ice fishing on a frozen lake */
  function icefishing(ctx, W, H, t) {
    var u = W / 60, base = H * 0.86;
    ctx.fillStyle = '#DDE8F2';
    ctx.fillRect(0, base, W, H - base);
    pen(ctx, 'rgba(150,180,220,0.6)', 0.25 * u);
    seg(ctx, W * 0.1, base + 3 * u, W * 0.4, base + 4 * u); seg(ctx, W * 0.6, base + 6 * u, W * 0.9, base + 5 * u);
    var x = W * (0.42 + K.J().dx * 0.3);
    // the hole
    ctx.fillStyle = '#2A4A7A';
    ell(ctx, x + 8 * u, base + 2.2 * u, 2.6 * u, 0.9 * u); ctx.fill();
    // the bucket seat and the angler
    ctx.fillStyle = '#E8432F';
    poly(ctx, [x - 2 * u, base + 1 * u, x + 2 * u, base + 1 * u, x + 1.6 * u, base - 3 * u, x - 1.6 * u, base - 3 * u]); ctx.fill();
    var p = K.person(ctx, x, base + 1 * u, u, { pose: 'sit', seat: 4, coat: '#2F6A8A', legs: '#2C3550', hat: 'bobble', hatCol: '#F2C230', scarf: '#E8432F', arms: [0.6, 1.2] });
    pen(ctx, '#3A2E26', 0.3 * u);
    seg(ctx, p.hand[0], p.hand[1], x + 7.4 * u, base - 4 * u);
    var bob = Math.sin(t * 2) * 0.4 * u;
    pen(ctx, 'rgba(60,60,70,0.7)', 0.15 * u);
    seg(ctx, x + 7.4 * u, base - 4 * u, x + 8 * u, base + 1.8 * u + bob);
  }

  /* a snow goose flying past, black wingtips */
  function snowgoose(ctx, W, H, t) {
    var u = W / 60, x = W * (0.5 + K.J().dx * 0.4) + Math.sin(t * 0.3) * 3 * u, y = H * (0.48 + K.J().dy * 0.4);
    var fl = Math.sin(t * 5) * 1.2;
    ctx.fillStyle = '#F6F7F9';
    [[-1, 0.2], [1, 0]].forEach(function (s) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 2 * u, y - (3 + fl * s[0]) * u, x - 6 * u, y - (5 + fl * s[0] * 1.6) * u); ctx.lineTo(x - 4.6 * u, y - 0.4 * u); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = '#2A2A30';
    tri(ctx, x - 6 * u, y - (5 + fl * -1.6) * u, x - 4.6 * u, y - (4.4 + fl * -1.2) * u, x - 5.4 * u, y - (3.4 + fl * -1) * u); ctx.fill();
    ctx.fillStyle = '#F6F7F9';
    ell(ctx, x, y + 0.4 * u, 4.2 * u, 1.4 * u, -0.08); ctx.fill();
    pen(ctx, '#F6F7F9', 0.9 * u);
    seg(ctx, x + 3.6 * u, y, x + 6.6 * u, y - 0.8 * u);
    circ(ctx, x + 7 * u, y - 0.9 * u, 1 * u); ctx.fill();
    ctx.fillStyle = '#F29A6A';
    tri(ctx, x + 7.8 * u, y - 1.1 * u, x + 9.4 * u, y - 0.8 * u, x + 7.8 * u, y - 0.4 * u); ctx.fill();
    ctx.fillStyle = '#1F2433';
    circ(ctx, x + 7.3 * u, y - 1.1 * u, 0.22 * u); ctx.fill();
    ctx.fillStyle = '#F6F7F9';
    [-1, 1].forEach(function () {});
    ctx.fillStyle = '#2A2A30';
    tri(ctx, x - 6 * u, y - (5 + fl * 1.6) * u, x - 4.6 * u, y - (4.4 + fl * 1.2) * u, x - 5.4 * u, y - (3.4 + fl) * u); ctx.fill();
  }

  /* the sun with ears: its two sun dogs either side, and a smile */
  function sunears(ctx, W, H, t) {
    var s = sunPos(W, H, 0.5, 0.6), d = W * 0.22;
    [-1, 1].forEach(function (k) {
      var ex = s.x + k * d, ey = s.y;
      glow(ctx, ex, ey, W * 0.08, [255, 220, 170], 0.75);
      ['#FF8A6A', '#FFD27A', '#FFF6E0'].forEach(function (c, i) {
        ctx.fillStyle = c;
        ell(ctx, ex - k * i * W * 0.006, ey, W * (0.026 - i * 0.005), W * (0.06 - i * 0.008), 0); ctx.fill();
      });
    });
    var r = W * 0.075;
    glow(ctx, s.x, s.y, r * 2.2, [255, 240, 200], 0.6);
    ctx.fillStyle = '#FFE9A8';
    circ(ctx, s.x, s.y, r); ctx.fill();
    ctx.fillStyle = '#B8702A';
    var bl = Math.sin(t * 0.8) > 0.95 ? 0.2 : 1;
    ell(ctx, s.x - r * 0.35, s.y - r * 0.15, r * 0.1, r * 0.15 * bl); ctx.fill();
    ell(ctx, s.x + r * 0.35, s.y - r * 0.15, r * 0.1, r * 0.15 * bl); ctx.fill();
    pen(ctx, '#B8702A', r * 0.11);
    ctx.beginPath(); ctx.arc(s.x, s.y + r * 0.05, r * 0.45, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    ctx.fillStyle = 'rgba(255,130,110,0.45)';
    circ(ctx, s.x - r * 0.58, s.y + r * 0.25, r * 0.15); ctx.fill();
    circ(ctx, s.x + r * 0.58, s.y + r * 0.25, r * 0.15); ctx.fill();
  }


  /* the parhelic circle: a white ring through the sun, all the way round the sky */
  function skycircle(ctx, W, H, t) {
    var s = sunPos(W, H, 0.5, 0.6);
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.15 * Math.sin(t * 0.8);
    pen(ctx, 'rgba(255,255,255,0.9)', W * 0.012);
    ctx.beginPath(); ctx.ellipse(W * 0.5, s.y - H * 0.12, W * 0.62, H * 0.12, 0, 0.08 * Math.PI, 0.92 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(W * 0.5, s.y - H * 0.12, W * 0.62, H * 0.12, 0, 1.05 * Math.PI, 1.95 * Math.PI); ctx.stroke();
    ctx.restore();
    // the 22 degree halo it crosses
    pen(ctx, 'rgba(255,255,255,0.4)', W * 0.008);
    circ(ctx, s.x, s.y, W * 0.22); ctx.stroke();
    [-1, 1].forEach(function (k) { glow(ctx, s.x + k * W * 0.62 * 0.98, s.y - H * 0.12 + H * 0.12 * 0.2, W * 0.03, [255, 255, 255], 0.6); });
  }

  /* ---------- Fogbow ---------- */

  /* silver birches, pale in the fog */
  function birches(ctx, W, H, t) {
    var u = W / 60;
    [[0.24, 20, 0.55], [0.4, 26, 0.85], [0.7, 22, 0.7], [0.82, 16, 0.45]].forEach(function (b, i) {
      var g = K.at(W, H, b[0], 0.2);
      ctx.save();
      ctx.globalAlpha = b[2];
      K.tree(ctx, g.x, g.y, u, { kind: 'birch', h: b[1], col: '#B8C8A0', seed: 40 + i, bend: Math.sin(t * 0.5 + i) * 0.2 });
      ctx.restore();
    });
    mistOver(ctx, W, H, H * 0.52, 0.35);
  }

  /* a rowing boat on a misty lake */
  function rowboat(ctx, W, H, t) {
    var u = W / 60, wy = H * 0.84, x = W * (0.5 + K.J().dx * 0.3);
    lake(ctx, W, H, wy, [150, 166, 184]);
    pen(ctx, 'rgba(255,255,255,0.4)', 0.3 * u);
    seg(ctx, W * 0.1, wy + 3 * u, W * 0.4, wy + 3 * u); seg(ctx, W * 0.55, wy + 6 * u, W * 0.9, wy + 6 * u);
    var row = Math.sin(t * 1.6);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, wy + 0.8 * u); ctx.clip();
    K.person(ctx, x, wy + 1.6 * u, u, { pose: 'sit', seat: 3, coat: '#5A6A4A', legs: '#3A3E30', hat: 'beanie', hatCol: '#3A4A3A', lean: row * 0.15, arms: [1.2 + row * 0.4, 1.4 + row * 0.4] });
    ctx.restore();
    K.boat(ctx, x + 1 * u, wy + 1 * u, u, { kind: 'row', hull: '#7A5A3A' }, t);
    pen(ctx, '#6B4A2B', 0.4 * u);
    seg(ctx, x - 5 * u, wy - 2 * u, x - 9 * u + row * 2 * u, wy + 1.4 * u);
    seg(ctx, x + 7 * u, wy - 2 * u, x + 11 * u + row * 2 * u, wy + 1.4 * u);
    mistOver(ctx, W, H, H * 0.5, 0.3);
  }

  /* a white horse cut into a chalk hillside */
  function whitehorse(ctx, W, H, t) {
    var u = W / 60, x = W * (0.5 + K.J().dx * 0.3), y = H * 0.72;
    ctx.fillStyle = '#5E7A56';
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H * 0.8); ctx.quadraticCurveTo(W * 0.4, H * 0.58, W, H * 0.76); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // the horse, in long white strokes
    pen(ctx, '#F6F4EC', 1 * u);
    ctx.beginPath();
    ctx.moveTo(x - 9 * u, y + 1 * u);
    ctx.quadraticCurveTo(x - 2 * u, y - 2 * u, x + 5 * u, y - 1.4 * u);
    ctx.quadraticCurveTo(x + 8 * u, y - 3.4 * u, x + 10 * u, y - 2 * u);
    ctx.stroke();
    seg(ctx, x - 6 * u, y + 0.6 * u, x - 8 * u, y + 4 * u);
    seg(ctx, x - 3 * u, y, x - 2 * u, y + 3.6 * u);
    seg(ctx, x + 3 * u, y - 1 * u, x + 5 * u, y + 2.6 * u);
    seg(ctx, x + 5 * u, y - 1 * u, x + 3 * u, y + 3 * u);
    seg(ctx, x - 9 * u, y + 1 * u, x - 12 * u, y + 2.4 * u);
    ctx.fillStyle = '#F6F4EC';
    circ(ctx, x + 8.6 * u, y - 3.4 * u, 0.6 * u); ctx.fill();
    mistOver(ctx, W, H, H * 0.45, 0.4);
    void t;
  }

  /* dewdrops on the grass, each with a tiny bow in it */
  function dewdrops(ctx, W, H, t) {
    var u = W / 56, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    pen(ctx, '#5E8A4E', 0.5 * u);
    [[-9, 10, -0.2], [-4, 13, 0.1], [1, 11, -0.1], [6, 14, 0.2], [10, 9, -0.25]].forEach(function (b, i) {
      var bx = x + b[0] * u, top = y - b[1] * u, bend = b[2] * u * 6;
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx, y - b[1] * u * 0.6, bx + bend, top); ctx.stroke();
      var dx = bx + bend * 0.7, dy = y - b[1] * u * 0.72;
      ctx.fillStyle = 'rgba(220,235,250,0.85)';
      circ(ctx, dx, dy, 1.4 * u); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(1, 0.2 * u);
      circ(ctx, dx, dy, 1.4 * u); ctx.stroke();
      ['#FF9A9A', '#FFE48A', '#9AE6A0', '#8AC6FF'].forEach(function (c, k) { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(dx, dy + 0.6 * u, (1 - k * 0.18) * u, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); });
      K.twinkle(ctx, dx - 0.5 * u, dy - 0.6 * u, 0.6 * u, t, i);
    });
  }

  /* one tree alone in the fog */
  function lonetree(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.62, 0.3);
    ctx.save();
    ctx.globalAlpha = 0.75;
    K.tree(ctx, g.x, g.y, u, { kind: 'round', h: 26, col: '#6E7A72', trunk: '#4E5450', bend: 1 });
    ctx.restore();
    mistOver(ctx, W, H, H * 0.45, 0.3);
    void t;
  }

  /* white chalk cliffs in the sea mist */
  function cliffs(ctx, W, H, t) {
    var u = W / 60, top = H * 0.62, side = K.J().dx >= 0 ? 1 : -1;
    lake(ctx, W, H, H * 0.86, [110, 140, 160]);
    var x0 = side > 0 ? W * 0.42 : W * 0.58;
    ctx.fillStyle = '#F2F0E8';
    ctx.beginPath();
    ctx.moveTo(x0, H * 0.87);
    for (var i = 0; i <= 6; i++) { var f = i / 6, xx = x0 + side * f * W * 0.6, yy = top + Math.sin(f * 5) * H * 0.015 + f * H * 0.02; ctx.lineTo(xx + side * Math.sin(i * 2.4) * u, yy + (i ? 0 : H * 0.05)); }
    ctx.lineTo(x0 + side * W * 0.6, H * 0.87);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5E8A4E';
    ctx.beginPath(); ctx.moveTo(x0 + side * 0.5 * u, top + H * 0.04); for (var k = 0; k <= 6; k++) { var f2 = k / 6; ctx.lineTo(x0 + side * f2 * W * 0.6, top + Math.sin(f2 * 5) * H * 0.015 + f2 * H * 0.02 - 1.2 * u); } ctx.lineTo(x0 + side * W * 0.6, top - 2 * u); ctx.closePath(); ctx.fill();
    pen(ctx, 'rgba(170,165,150,0.6)', 0.3 * u);
    for (var j = 0; j < 5; j++) { var cx = x0 + side * (4 + j * 6) * u; seg(ctx, cx, top + 4 * u, cx + side * u, H * 0.86); }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(0, H * 0.86, W, Math.max(1, H * 0.006));
    mistOver(ctx, W, H, H * 0.45, 0.35);
    void t;
  }

  /* ---------- Double Rainbow ---------- */

  /* two magpies: two for joy */
  function magpies(ctx, W, H, t) {
    var u = W / 58;
    [[0.38, 1, 0], [0.6, -1, 1.3]].forEach(function (m) {
      var g = K.at(W, H, m[0]);
      var hop = Math.max(0, Math.sin(t * 3 + m[2])) * 0.8 * u;
      K.bird(ctx, g.x, g.y, 2 * u, { body: '#1E1E24', belly: '#FFFFFF', wing: '#2E3A6A', tail: 'long', tailCol: '#1E2A4A', beak: '#1E1E24', dir: m[1], hop: hop });
      ctx.fillStyle = '#FFFFFF';
      ell(ctx, g.x - m[1] * 0.6 * u, g.y - 2.6 * u - hop, 1.2 * u, 0.5 * u, 0.2 * m[1]); ctx.fill();
    });
  }

  /* two friends on a tandem */
  function tandem(ctx, W, H, t) {
    var u = W / 66, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    var r = 2.3 * u, bw = x - 6 * u, fw = x + 6 * u, wy = y - r;
    pen(ctx, '#22262F', 0.45 * u);
    circ(ctx, bw, wy, r); ctx.stroke();
    circ(ctx, fw, wy, r); ctx.stroke();
    pen(ctx, '#2E8A6A', 0.55 * u);
    K.path(ctx, [bw, wy, x - 3 * u, wy - 3.2 * u, x + 3 * u, wy - 3.2 * u, fw, wy]);
    K.path(ctx, [x - 3.6 * u, wy, x - 3 * u, wy - 3.2 * u]);
    K.path(ctx, [x + 1.6 * u, wy, x + 3 * u, wy - 3.2 * u]);
    seg(ctx, bw, wy, x - 3.6 * u, wy); seg(ctx, x - 3.6 * u, wy, x + 1.6 * u, wy);
    seg(ctx, fw, wy, x + 5.4 * u, wy - 4 * u);
    var st = t * 0.8;
    K.person(ctx, x - 3.4 * u, wy + 0.6 * u, u, { pose: 'sit', seat: 4.2, coat: '#F2C230', legs: '#2C3550', hat: 'cap', hatCol: '#E8432F', arms: [1.2, 1.3], lean: 0.25, step: st });
    K.person(ctx, x + 2.4 * u, wy + 0.6 * u, u, { pose: 'sit', seat: 4.2, coat: '#E8432F', legs: '#2C3550', hair: '#2A1E18', hairLong: true, arms: [1.2, 1.35], lean: 0.25 });
  }

  /* twin lambs, one springing into the air */
  function lambs(ctx, W, H, t) {
    var u = W / 58;
    [[0.38, 0, 1], [0.62, 1.4, -1]].forEach(function (l, i) {
      var g = K.at(W, H, l[0]), jump = i ? Math.max(0, Math.sin(t * 2.4)) * 4 * u : 0;
      var x = g.x, y = g.y - jump, d = l[2];
      pen(ctx, '#2A2A30', 0.8 * u);
      seg(ctx, x - 1.6 * u, y - 3 * u, x - 1.8 * u - (jump ? d * u : 0), y); seg(ctx, x + 1.6 * u, y - 3 * u, x + 1.8 * u + (jump ? d * u : 0), y);
      ctx.fillStyle = '#F6F4EE';
      for (var k = 0; k < 6; k++) { circ(ctx, x - 2.4 * u + (k % 3) * 2.4 * u, y - 4.2 * u - Math.floor(k / 3) * 1.4 * u, 1.6 * u); ctx.fill(); }
      ctx.fillStyle = '#2A2A30';
      ell(ctx, x + d * 4 * u, y - 5.6 * u, 1.3 * u, 1 * u, 0.3 * d); ctx.fill();
      ell(ctx, x + d * 3.4 * u, y - 6.2 * u, 1 * u, 0.4 * u, -0.5 * d); ctx.fill();
      ctx.fillStyle = '#F6F4EE';
      circ(ctx, x + d * 4.4 * u, y - 5.9 * u, 0.25 * u); ctx.fill();
    });
  }

  /* the double rainbow reflected in a still lake */
  function reflectbow(ctx, W, H, t) {
    var wy = H * 0.84, b = bowAt(W, H);
    lake(ctx, W, H, wy, [70, 100, 140]);
    var cols = ['#FF5A5A', '#FF9F43', '#FFD84D', '#5BD46F', '#4DA3FF', '#5C6BFF', '#A36BFF'];
    ctx.save();
    ctx.beginPath(); ctx.rect(0, wy, W, H - wy); ctx.clip();
    ctx.globalAlpha = 0.5 + 0.1 * Math.sin(t * 2);
    var ry = (H - wy) * 0.9;
    [[W * 0.36, 1], [W * 0.46, 0.6]].forEach(function (bow, k) {
      for (var i = 0; i < cols.length; i++) {
        ctx.strokeStyle = cols[k ? cols.length - 1 - i : i];
        ctx.lineWidth = b.bw * 0.7;
        ctx.globalAlpha = (0.5 + 0.1 * Math.sin(t * 2 + i)) * bow[1];
        ctx.beginPath(); ctx.ellipse(W * 0.5 + (b.x - W * 0.42), wy, bow[0] - i * b.bw * 0.75, ry - i * b.bw * 0.3, 0, 0, Math.PI); ctx.stroke();
      }
    });
    ctx.restore();
    pen(ctx, 'rgba(255,255,255,0.3)', W / 300);
    for (var r = 0; r < 3; r++) { var yy = wy + (H - wy) * (0.3 + r * 0.25); seg(ctx, W * 0.2, yy, W * 0.8, yy); }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(0, wy, W, Math.max(1, H * 0.004));
  }


  /* two kids on a seesaw */
  function seesaw(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    var a = Math.sin(t * 1.6) * 0.22, L = 11 * u;
    ctx.fillStyle = '#E8432F';
    tri(ctx, x - 2 * u, y, x + 2 * u, y, x, y - 3.4 * u); ctx.fill();
    var lx = x - Math.cos(a) * L, ly = y - 3.4 * u - Math.sin(a) * L, rx = x + Math.cos(a) * L, ry = y - 3.4 * u + Math.sin(a) * L;
    pen(ctx, '#F2C230', 0.9 * u);
    seg(ctx, lx, ly, rx, ry);
    K.person(ctx, lx + 1.6 * u, ly + 3.4 * u, u, { pose: 'sit', seat: 3.6, kid: true, coat: '#3E8ED8', legs: '#2C3550', hat: 'cap', hatCol: '#2F3A5A', arms: [1.2, 1.4] });
    K.person(ctx, rx - 1.6 * u, ry + 3.4 * u, u, { pose: 'sit', seat: 3.6, kid: true, dir: -1, coat: '#5BC46F', legs: '#2C3550', hair: '#E8A040', hairLong: true, arms: [1.2, 1.4] });
  }

  /* bonus stripes: the faint pink and green bands just inside the bow */
  function bonus(ctx, W, H, t) {
    var b = bowAt(W, H);
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 1.2);
    var inner = b.R - b.bw * 7;
    ['#F2A0C8', '#A0E8B8', '#F2A0C8', '#A0E8B8'].forEach(function (c, i) {
      ctx.strokeStyle = c;
      ctx.lineWidth = b.bw * 0.8;
      ctx.beginPath(); ctx.arc(b.x, b.y, inner - b.bw * (0.6 + i * 0.95), Math.PI, TAU); ctx.stroke();
    });
    ctx.restore();
  }

  /* legendary: a triple rainbow */
  function triplebow(ctx, W, H, t) {
    var b = bowAt(W, H);
    var cols = ['#FF5A5A', '#FF9F43', '#FFD84D', '#5BD46F', '#4DA3FF', '#5C6BFF', '#A36BFF'];
    ctx.save();
    ctx.globalAlpha = 0.42 + 0.08 * Math.sin(t);
    var R3 = b.R * 1.55;
    for (var i = 0; i < cols.length; i++) {
      ctx.strokeStyle = cols[i];
      ctx.lineWidth = b.bw * 1.1;
      ctx.beginPath(); ctx.arc(b.x, b.y, R3 - i * b.bw * 1.05, Math.PI, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- Moonbow ---------- */

  /* a waterfall pouring in the moonlight */
  function moonfall(ctx, W, H, t) {
    var u = W / 60, side = K.J().dx >= 0 ? -1 : 1, x = side < 0 ? W * 0.3 : W * 0.7, top = H * 0.5, base = H * 0.9;
    ctx.fillStyle = '#1A2038';
    ctx.beginPath();
    ctx.moveTo(side < 0 ? 0 : W, top - 4 * u);
    ctx.lineTo(x - side * 3 * u, top - 3 * u);
    ctx.lineTo(x - side * 2 * u, base);
    ctx.lineTo(side < 0 ? 0 : W, base);
    ctx.closePath();
    ctx.fill();
    var g = ctx.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, 'rgba(230,236,255,0.9)');
    g.addColorStop(1, 'rgba(200,214,250,0.6)');
    ctx.fillStyle = g;
    poly(ctx, [x - 3 * u, top - 2.6 * u, x + 3 * u, top - 2.6 * u, x + 4.4 * u, base, x - 4.4 * u, base]); ctx.fill();
    pen(ctx, 'rgba(255,255,255,0.7)', 0.3 * u);
    for (var k = 0; k < 6; k++) { var p = (t * 1.4 + k / 6) % 1, sx = x - 2.4 * u + k * 1 * u; seg(ctx, sx, top + p * (base - top) * 0.8, sx + 0.2 * u, top + p * (base - top) * 0.8 + 3 * u); }
    lake(ctx, W, H, base - 0.6 * u, [20, 30, 66]);
    for (var j = 0; j < 4; j++) { var q = (t * 0.6 + j / 4) % 1; ctx.fillStyle = 'rgba(220,230,255,' + (0.4 * (1 - q)) + ')'; circ(ctx, x + Math.sin(j * 2) * 3 * u, base - q * 5 * u, (1.5 + q * 2) * u); ctx.fill(); }
  }

  /* glow-worms shining in the grass */
  function glowworms(ctx, W, H, t) {
    var u = W / 60, rnd = K.rand(131);
    K.grass(ctx, W * 0.1, W * 0.9, K.at(W, H, 0.5, 0).y, 1.4 * u, 'rgba(30,50,40,0.9)');
    for (var i = 0; i < 11; i++) {
      var f = 0.15 + rnd() * 0.7, g = K.at(W, H, f, 0), y = g.y - (0.5 + rnd() * 3) * u;
      var k = 0.5 + 0.5 * Math.sin(t * (1.2 + rnd()) + i * 2);
      glow(ctx, g.x, y, 3 * u * (0.6 + k * 0.6), [140, 255, 120], 0.55 * k + 0.1);
      ctx.fillStyle = 'rgba(210,255,190,' + (0.6 + 0.4 * k) + ')';
      circ(ctx, g.x, y, 0.45 * u); ctx.fill();
    }
  }

  /* a warty toad on a stone */
  function toad(ctx, W, H, t) {
    var u = W / 54, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    K.rock(ctx, x, y + 0.2 * u, 7 * u, 3 * u, '#3A3E4E');
    var by = y - 3 * u, breathe = 1 + Math.sin(t * 2) * 0.04;
    ctx.fillStyle = '#7A6A44';
    ell(ctx, x, by - 2 * u, 4.6 * u, 2.8 * u * breathe); ctx.fill();
    ctx.fillStyle = '#8A7A52';
    ell(ctx, x + 2.4 * u, by - 3 * u, 2.8 * u, 2 * u); ctx.fill();
    ctx.fillStyle = '#D8C89A';
    ell(ctx, x + 2.2 * u, by - 1.2 * u, 2.6 * u, 1.1 * u); ctx.fill();
    ctx.fillStyle = '#5A4E32';
    [[-2.6, -3], [-0.6, -3.8], [-2, -1.6], [0.6, -2.4], [-3.4, -1.8]].forEach(function (w) { circ(ctx, x + w[0] * u, by + w[1] * u, 0.5 * u); ctx.fill(); });
    ctx.fillStyle = '#6A5A3A';
    ell(ctx, x - 2.8 * u, by - 0.4 * u, 2 * u, 1 * u); ctx.fill();
    ell(ctx, x + 3.6 * u, by - 0.2 * u, 1.2 * u, 0.7 * u); ctx.fill();
    ctx.fillStyle = '#E8B040';
    circ(ctx, x + 2.6 * u, by - 4.4 * u, 0.9 * u); ctx.fill();
    ctx.fillStyle = '#1E1E24';
    ell(ctx, x + 2.7 * u, by - 4.4 * u, 0.55 * u, 0.3 * u); ctx.fill();
    pen(ctx, '#4A3E22', 0.25 * u);
    ctx.beginPath(); ctx.arc(x + 3.8 * u, by - 3 * u, 1.4 * u, 0.2, 1.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,248,225,0.25)';
    ell(ctx, x - 0.6 * u, by - 4 * u, 2 * u, 0.6 * u); ctx.fill();
  }

  /* a big pale moth fluttering towards the moon */
  function moth(ctx, W, H, t) {
    var u = W / 60, x = W * (0.48 + K.J().dx * 0.4) + Math.sin(t * 0.9) * 3 * u, y = H * (0.5 + K.J().dy * 0.4) + Math.sin(t * 2.2) * 1.4 * u;
    var fl = 0.55 + 0.45 * Math.abs(Math.sin(t * 9));
    ctx.fillStyle = '#E8E0C8';
    [-1, 1].forEach(function (s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s * fl, 1);
      ctx.beginPath(); ctx.moveTo(0, -0.6 * u); ctx.quadraticCurveTo(4 * u, -5 * u, 6.4 * u, -2.4 * u); ctx.quadraticCurveTo(5.4 * u, 0.6 * u, 0, 0.4 * u); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 0.4 * u); ctx.quadraticCurveTo(4.6 * u, 1 * u, 4 * u, 4 * u); ctx.quadraticCurveTo(1.6 * u, 4.4 * u, 0, 1.6 * u); ctx.fill();
      ctx.fillStyle = '#8A7A5A';
      circ(ctx, 3.4 * u, -2 * u, 0.9 * u); ctx.fill();
      ctx.fillStyle = '#F6F0DC';
      circ(ctx, 3.4 * u, -2 * u, 0.4 * u); ctx.fill();
      ctx.fillStyle = '#E8E0C8';
      ctx.restore();
    });
    ctx.fillStyle = '#B8A888';
    ell(ctx, x, y + 0.6 * u, 0.7 * u, 2.4 * u); ctx.fill();
    pen(ctx, '#B8A888', 0.25 * u);
    ctx.beginPath(); ctx.moveTo(x - 0.2 * u, y - 1.6 * u); ctx.quadraticCurveTo(x - 1.6 * u, y - 3.6 * u, x - 2.4 * u, y - 3.4 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 0.2 * u, y - 1.6 * u); ctx.quadraticCurveTo(x + 1.6 * u, y - 3.6 * u, x + 2.4 * u, y - 3.4 * u); ctx.stroke();
    glow(ctx, x, y, 8 * u, [255, 250, 230], 0.12);
  }

  /* a little boat with a lantern on the dark water */
  function lanternboat(ctx, W, H, t) {
    var u = W / 60, wy = H * 0.85, x = W * (0.5 + K.J().dx * 0.3);
    lake(ctx, W, H, wy, [18, 28, 60]);
    K.boat(ctx, x, wy + 1 * u, u, { kind: 'row', hull: '#3A2E2A' }, t);
    pen(ctx, '#2A2226', 0.4 * u);
    seg(ctx, x + 3 * u, wy - 1.4 * u, x + 3 * u, wy - 9 * u);
    seg(ctx, x + 3 * u, wy - 9 * u, x + 5.4 * u, wy - 9 * u);
    var sw = Math.sin(t * 1.5) * 0.3 * u;
    glow(ctx, x + 5.4 * u + sw, wy - 7.4 * u, 7 * u, [255, 200, 110], 0.6);
    ctx.fillStyle = '#FFD27A';
    rr(ctx, x + 4.6 * u + sw, wy - 8.6 * u, 1.6 * u, 2.2 * u, 0.4 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,210,122,0.4)';
    for (var k = 0; k < 5; k++) ctx.fillRect(x + 4 * u + Math.sin(t * 3 + k) * u, wy + 2 * u + k * 1.4 * u, 3 * u, Math.max(1, 0.3 * u));
    ctx.fillStyle = '#141A2A';
    ell(ctx, x - 2 * u, wy - 3.4 * u, 1.8 * u, 2.2 * u); ctx.fill();
    circ(ctx, x - 2 * u, wy - 6.4 * u, 1.2 * u); ctx.fill();
  }

  /* a tiny glowing fairy, trailing sparkles */
  function fairy(ctx, W, H, t) {
    var u = W / 60, x = W * (0.5 + K.J().dx * 0.4) + Math.sin(t * 0.8) * 6 * u, y = H * (0.56 + K.J().dy * 0.4) + Math.sin(t * 1.6) * 3 * u;
    for (var k = 1; k <= 7; k++) {
      var px = x - Math.cos(t * 0.8 - k * 0.15) * 6 * u * 0 - k * 1.4 * u * Math.sign(Math.cos(t * 0.8) || 1), py = y - Math.sin(t * 1.6 - k * 0.3) * 3 * u + Math.sin(t * 1.6) * 3 * u * 0;
      K.twinkle(ctx, px, py + Math.sin(k) * u, 0.7 * u * (1 - k / 9), t, k, 'rgba(220,255,240,0.9)');
    }
    glow(ctx, x, y, 6 * u, [200, 255, 230], 0.55);
    var fl = 0.6 + 0.4 * Math.abs(Math.sin(t * 14));
    ctx.fillStyle = 'rgba(220,240,255,0.7)';
    ell(ctx, x - 1.2 * u * fl, y - 1 * u, 1.4 * u * fl, 2 * u, -0.4); ctx.fill();
    ell(ctx, x + 1.2 * u * fl, y - 1 * u, 1.4 * u * fl, 2 * u, 0.4); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ell(ctx, x, y, 0.5 * u, 1.3 * u); ctx.fill();
    circ(ctx, x, y - 1.7 * u, 0.6 * u); ctx.fill();
  }

  /* legendary: a humpback whale leaping under the moonbow, its long white flipper out */
  function whale(ctx, W, H, t) {
    var u = W / 52, wy = H * 0.85, x = W * (0.46 + K.J().dx * 0.3);
    lake(ctx, W, H, wy, [18, 32, 70]);
    var p = (t * 0.16) % 1, up = Math.sin(Math.min(1, p * 1.25) * Math.PI);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, wy + 0.3 * u); ctx.clip();
    ctx.translate(x, wy + (1 - up) * 14 * u);
    ctx.rotate(0.28 - up * 0.18);
    // the dark back
    ctx.fillStyle = '#2E3A54';
    ctx.beginPath();
    ctx.moveTo(-3.4 * u, 3 * u);
    ctx.bezierCurveTo(-4 * u, -7 * u, -2 * u, -13 * u, 1.4 * u, -15.6 * u);
    ctx.bezierCurveTo(4.4 * u, -12.6 * u, 4.8 * u, -4 * u, 3.8 * u, 3 * u);
    ctx.closePath();
    ctx.fill();
    // the grooved white throat
    ctx.fillStyle = '#DCE2EE';
    ctx.beginPath();
    ctx.moveTo(1.2 * u, 3 * u);
    ctx.bezierCurveTo(1.4 * u, -5 * u, 1.8 * u, -11 * u, 1.6 * u, -15 * u);
    ctx.bezierCurveTo(3.8 * u, -12 * u, 4.2 * u, -5 * u, 3.6 * u, 3 * u);
    ctx.closePath();
    ctx.fill();
    pen(ctx, 'rgba(70,84,110,0.5)', 0.22 * u);
    for (var k = 0; k < 8; k++) { var gy = -13 * u + k * 2 * u; seg(ctx, 1.7 * u, gy, 3.6 * u - Math.abs(k - 4) * 0.1 * u, gy + 0.4 * u); }
    // bumps on the head and the eye
    ctx.fillStyle = '#46546E';
    [[0.2, -13.4], [0.8, -14.2], [-0.4, -12.4]].forEach(function (b) { circ(ctx, b[0] * u, b[1] * u, 0.35 * u); ctx.fill(); });
    ctx.fillStyle = '#10131E';
    circ(ctx, -0.6 * u, -9.6 * u, 0.42 * u); ctx.fill();
    // the long flipper
    ctx.save();
    ctx.translate(3.2 * u, -7 * u);
    ctx.rotate(0.7 + Math.sin(t * 2) * 0.08);
    ctx.fillStyle = '#E8ECF4';
    ell(ctx, 4.4 * u, 0, 4.8 * u, 0.95 * u); ctx.fill();
    ctx.fillStyle = 'rgba(46,58,84,0.35)';
    ell(ctx, 4.4 * u, -0.4 * u, 4.2 * u, 0.3 * u); ctx.fill();
    ctx.restore();
    // moonlight along its back
    ctx.fillStyle = 'rgba(255,248,225,0.28)';
    ell(ctx, -2.6 * u, -6 * u, 0.7 * u, 5 * u, 0.15); ctx.fill();
    ctx.restore();
    // the splash, lit by the moon
    for (var sp = 0; sp < 14; sp++) {
      var q = (t * 0.9 + sp / 14) % 1, a = Math.PI * (1.04 + sp * 0.066);
      ctx.fillStyle = 'rgba(230,236,255,' + (0.85 * (1 - q)) + ')';
      circ(ctx, x + Math.cos(a) * (4 + q * 10) * u, wy - Math.abs(Math.sin(a)) * q * 8 * u * (0.4 + up), (0.4 + q * 0.6) * u); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = Math.max(1, 0.3 * u);
    ell(ctx, x, wy + 0.6 * u, (7 + up * 4) * u, 1.2 * u); ctx.stroke();
  }



  /* ---------- Northern Lights ---------- */

  /* a reindeer in the snow, antlers against the lights */
  function reindeer(ctx, W, H, t) {
    var u = W / 60, base = H * 0.88;
    snowbank(ctx, W, H, base, t);
    var x = W * (0.5 + K.J().dx * 0.3), d = K.J().dx >= 0 ? -1 : 1;
    var r = K.beast(ctx, x, base + 0.6 * u, u, { dir: d, col: '#7A6250', legCol: '#5A4636', belly: '#D8CCBC', rx: 4.4, ry: 2.3, leg: 4.6, lw: 1.1, neck: [0.6, -3.2], hr: 1.4, snout: [1.6, 1], ears: 'point', tail: 'short', nw: 1.6 });
    ctx.fillStyle = '#EDE6DA';
    ell(ctx, r.head[0] - d * 1.2 * u, r.head[1] + 2.2 * u, 1.4 * u, 2 * u, 0.3 * d); ctx.fill();
    K.antlers(ctx, r, 1.15, '#C8A77A');
  }

  /* a log cabin, snow on the roof and the fire lit */
  function cabin(ctx, W, H, t) {
    var u = W / 60, base = H * 0.88;
    snowbank(ctx, W, H, base, t);
    var x = W * (0.5 + K.J().dx * 0.3), y = base + 1 * u;
    var h = K.house(ctx, x, y, u, { w: 14, h: 7.5, rh: 5, wall: '#8A5A34', roof: '#4A3020', door: '#4A2E1A', wins: 2, lit: '#FFC86A', snow: true, chimneyCol: '#5A4A40', smoke: t });
    pen(ctx, 'rgba(60,30,14,0.45)', 0.3 * u);
    for (var k = 1; k < 6; k++) seg(ctx, h.x0, y - k * 1.3 * u, h.x1, y - k * 1.3 * u);
    ctx.fillStyle = '#F7FAFF';
    ell(ctx, x, y + 0.2 * u, 9 * u, 1.2 * u); ctx.fill();
  }

  /* a husky team pulling a sled */
  function husky(ctx, W, H, t) {
    var u = W / 70, base = H * 0.88;
    snowbank(ctx, W, H, base, t);
    var x = W * (0.42 + K.J().dx * 0.3), y = base + 1 * u, run = t * 2.4;
    // the sled and musher
    pen(ctx, '#8A5A34', 0.5 * u);
    seg(ctx, x - 8 * u, y - 0.4 * u, x + 1 * u, y - 0.4 * u);
    ctx.beginPath(); ctx.moveTo(x + 1 * u, y - 0.4 * u); ctx.quadraticCurveTo(x + 2.4 * u, y - 0.6 * u, x + 2 * u, y - 2.4 * u); ctx.stroke();
    seg(ctx, x - 7 * u, y - 0.4 * u, x - 7.4 * u, y - 7 * u);
    ctx.fillStyle = '#B8423A';
    rr(ctx, x - 6 * u, y - 3.4 * u, 6.4 * u, 2.6 * u, 0.6 * u); ctx.fill();
    K.person(ctx, x - 9 * u, y - 0.4 * u, u, { coat: '#3A5A8A', legs: '#2C3550', hat: 'beanie', hatCol: '#E8432F', arms: [0.6, 1.4], lean: 0.2 });
    // the dogs, two by two, on the line
    pen(ctx, 'rgba(40,40,40,0.7)', 0.2 * u);
    seg(ctx, x + 2 * u, y - 2.4 * u, x + 20 * u, y - 3.8 * u);
    [0, 1, 2].forEach(function (k) {
      K.dog(ctx, x + (6 + k * 6.4) * u, y + (k % 2 ? 0.4 : 0) * u, 0.85 * u, { col: k === 1 ? '#5A5A62' : '#7A7A84', patch: '#F2F2F2', ear: 'up', pose: 'run', wag: run + k });
    });
  }

  /* an arctic fox, white against the snow */
  function arcticfox(ctx, W, H, t) {
    var u = W / 56, base = H * 0.88;
    snowbank(ctx, W, H, base, t);
    var x = W * (0.5 + K.J().dx * 0.3), y = base + 1 * u;
    var f = K.beast(ctx, x, y, u, { col: '#F2F4F8', legCol: '#D8DCE6', rx: 3.6, ry: 1.9, leg: 2.6, lw: 0.9, neck: [0.6, -1.6], hr: 1.5, snout: [1.6, 0.7], ears: 'round', earCol: '#E6EAF2', tail: 'bushy', tailCol: '#F2F4F8', nose: true });
    ctx.fillStyle = '#1E1E24';
    circ(ctx, f.head[0] + 0.45 * u, f.head[1] - 0.3 * u, 0.28 * u); ctx.fill();
    ctx.fillStyle = 'rgba(140,170,220,0.25)';
    ell(ctx, x, y - 2.6 * u, 3.2 * u, 0.8 * u); ctx.fill();
    // breath in the cold
    var p = (t * 0.5) % 1;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.4 * (1 - p)) + ')';
    circ(ctx, f.head[0] + (2.6 + p * 2) * u, f.head[1] + 0.2 * u - p * u, (0.5 + p) * u); ctx.fill();
  }

  /* a forest of snowy pines */
  function pines(ctx, W, H, t) {
    var u = W / 60, base = H * 0.9;
    snowbank(ctx, W, H, base, t);
    var rnd = K.rand(141);
    for (var i = 0; i < 9; i++) {
      var f = 0.12 + i * 0.095 + (rnd() - 0.5) * 0.04, h = 12 + rnd() * 14;
      K.tree(ctx, W * f, base + 1 * u, u * (0.8 + rnd() * 0.3), { kind: 'pine', h: h, col: '#1E3A3A', snow: true, trunk: '#2A2226' });
    }
  }

  /* the lights mirrored in a still lake */
  function lakeglow(ctx, W, H, t) {
    var wy = H * 0.84;
    lake(ctx, W, H, wy, [10, 22, 40]);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, wy, W, H - wy); ctx.clip();
    for (var i = 0; i < 6; i++) {
      var x = W * (0.2 + i * 0.12), k = 0.5 + 0.5 * Math.sin(t * 1.4 + i * 0.9);
      ctx.save();
      ctx.translate(x, wy);
      ctx.scale(1, 3.2);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.07);
      var c = i % 3 === 2 ? '170,120,255' : '90,255,160';
      g.addColorStop(0, 'rgba(' + c + ',' + (0.5 * k + 0.15) + ')');
      g.addColorStop(1, 'rgba(' + c + ',0)');
      ctx.fillStyle = g;
      circ(ctx, 0, 0, W * 0.07); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, wy, W, Math.max(1, H * 0.003));
    pen(ctx, 'rgba(255,255,255,0.16)', W / 300);
    for (var r = 0; r < 4; r++) { var yy = wy + (H - wy) * (0.25 + r * 0.18); seg(ctx, W * 0.15, yy, W * 0.85, yy); }
  }


  /* legendary: the aurora crown, rays pouring down from one point overhead */
  function crown(ctx, W, H, t) {
    var cx = W * (0.5 + K.J().dx * 0.3), cy = H * 0.26;
    for (var i = 0; i < 22; i++) {
      var a = Math.PI * (0.08 + i / 21 * 0.84), k = 0.5 + 0.5 * Math.sin(t * 1.8 + i * 1.3);
      var L = H * (0.45 + 0.2 * Math.sin(i * 2.7)), ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L;
      var purple = i % 4 === 0;
      var g = ctx.createLinearGradient(cx, cy, ex, ey);
      g.addColorStop(0, purple ? 'rgba(190,120,255,0.05)' : 'rgba(120,255,170,0.05)');
      g.addColorStop(0.5, purple ? 'rgba(190,120,255,' + (0.5 * k) + ')' : 'rgba(120,255,170,' + (0.6 * k + 0.1) + ')');
      g.addColorStop(1, 'rgba(120,255,170,0)');
      pen(ctx, g, W * (0.012 + 0.012 * k));
      seg(ctx, cx, cy, ex, ey);
    }
    glow(ctx, cx, cy, W * 0.08, [170, 255, 200], 0.45 + 0.15 * Math.sin(t * 2));
  }

  /* ---------- Eclipse ---------- */

  /* someone in card eclipse glasses, looking up */
  function glasses(ctx, W, H, t) {
    var u = W / 54, g = K.at(W, H, 0.42), x = g.x, y = g.y;
    var p = K.person(ctx, x, y, u, { coat: '#E8432F', legs: '#2C3550', hair: '#2A1E18', arms: [0.4, 2.3], lean: -0.12 });
    var hx = p.head[0], hy = p.head[1];
    ctx.fillStyle = '#F2F0EA';
    rr(ctx, hx - 0.6 * u, hy - 1.2 * u, 3.6 * u, 1.5 * u, 0.4 * u); ctx.fill();
    ctx.fillStyle = '#1E1E24';
    rr(ctx, hx + 0.1 * u, hy - 1 * u, 1.2 * u, 1.1 * u, 0.4 * u); ctx.fill();
    rr(ctx, hx + 1.6 * u, hy - 1 * u, 1.2 * u, 1.1 * u, 0.4 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,120,0.7)';
    circ(ctx, hx + 0.6 * u, hy - 0.6 * u, 0.25 * u); ctx.fill();
    pen(ctx, '#F2F0EA', 0.3 * u);
    seg(ctx, hx - 0.6 * u, hy - 0.6 * u, hx - 1.8 * u, hy - 0.2 * u);
    void t;
  }

  /* hundreds of little crescent suns in the shade of a tree */
  function crescents(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.3, 0.2);
    K.tree(ctx, g.x, g.y, u, { kind: 'round', h: 22, col: '#2E4A3A', trunk: '#3A2E26' });
    var rnd = K.rand(151);
    ctx.fillStyle = 'rgba(20,24,40,0.45)';
    ell(ctx, g.x + 8 * u, g.y + 0.4 * u, 14 * u, 2.6 * u); ctx.fill();
    for (var i = 0; i < 18; i++) {
      var cx = g.x + (-3 + rnd() * 22) * u, cy = g.y - 1 * u + rnd() * 2.8 * u, r = (0.5 + rnd() * 0.3) * u;
      ctx.fillStyle = 'rgba(255,238,190,' + (0.6 + 0.3 * Math.sin(t + i)) + ')';
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.45, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(20,24,40,0.9)';
      ctx.beginPath(); ctx.ellipse(cx - r * 0.4, cy - r * 0.08, r * 0.85, r * 0.42, 0, 0, TAU); ctx.fill();
    }
  }

  /* shadow bands: ripples of light racing over the ground just before totality */
  function bands(ctx, W, H, t) {
    var top = H * 0.8;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, top, W, H - top); ctx.clip();
    for (var i = -4; i < 14; i++) {
      var x = W * (i * 0.1) + ((t * W * 0.08) % (W * 0.2));
      ctx.fillStyle = 'rgba(255,240,200,' + (0.12 + 0.08 * Math.sin(t * 3 + i)) + ')';
      ctx.beginPath();
      ctx.moveTo(x, top); ctx.quadraticCurveTo(x + W * 0.03, top + (H - top) * 0.5, x - W * 0.02, H);
      ctx.lineTo(x + W * 0.03, H); ctx.quadraticCurveTo(x + W * 0.08, top + (H - top) * 0.5, x + W * 0.05, top);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /* planets coming out in the daytime dark */
  function planets(ctx, W, H, t) {
    var e = eclipseAt(W, H);
    K.planet(ctx, e.x - W * 0.25, e.y + H * 0.1, W * 0.012, '#FFF8E6', t);
    K.planet(ctx, e.x + W * 0.2, e.y - H * 0.06, W * 0.009, '#FFE6C8', t + 1);
    K.planet(ctx, e.x - W * 0.08, e.y + H * 0.24, W * 0.007, '#FFD0B0', t + 2);
    K.stars(ctx, W * 0.15, H * 0.15, W * 0.85, H * 0.7, 14, 161, W / 340, t);
  }

  /* Baily's beads: the last bits of sunlight through the valleys on the moon's edge */
  function beads(ctx, W, H, t) {
    var e = eclipseAt(W, H), off = e.r * 0.32;
    var mx = e.x - off, my = e.y + off * 0.3;
    for (var i = 0; i < 7; i++) {
      var a = 0.1 + i * 0.16 - 0.5, bx = mx + Math.cos(a) * e.r * 0.99, by = my + Math.sin(a) * e.r * 0.99;
      var k = 0.6 + 0.4 * Math.sin(t * 4 + i * 1.7);
      glow(ctx, bx, by, e.r * 0.3, [255, 250, 230], 0.6 * k);
      ctx.fillStyle = '#FFFFFF';
      circ(ctx, bx, by, e.r * 0.06 * k); ctx.fill();
    }
  }

  /* the diamond ring: one blazing point of sun on the ring of light */
  function ring(ctx, W, H, t) {
    var e = eclipseAt(W, H), off = e.r * 0.32;
    var a = -0.4, bx = e.x - off + Math.cos(a) * e.r, by = e.y + off * 0.3 + Math.sin(a) * e.r;
    pen(ctx, 'rgba(255,250,235,0.85)', W * 0.006);
    circ(ctx, e.x - off, e.y + off * 0.3, e.r * 1.01); ctx.stroke();
    var k = 0.85 + 0.15 * Math.sin(t * 3);
    glow(ctx, bx, by, e.r * 1.2 * k, [255, 252, 240], 0.85);
    for (var i = 0; i < 4; i++) {
      var ra = i * Math.PI / 4 + t * 0.05, L = e.r * (i % 2 ? 0.7 : 1.3) * k;
      pen(ctx, 'rgba(255,255,255,0.85)', W * 0.004);
      seg(ctx, bx - Math.cos(ra) * L, by - Math.sin(ra) * L, bx + Math.cos(ra) * L, by + Math.sin(ra) * L);
    }
    ctx.fillStyle = '#FFFFFF';
    circ(ctx, bx, by, e.r * 0.12); ctx.fill();
  }

  /* legendary: totality, the pearly corona streaming out round the black moon */
  function corona(ctx, W, H, t) {
    var e = eclipseAt(W, H), off = e.r * 0.32;
    var mx = e.x - off * 0.2, my = e.y + off * 0.06;
    for (var i = 0; i < 18; i++) {
      var a = i / 18 * TAU + Math.sin(t * 0.3 + i) * 0.03, L = e.r * (1.6 + 1.4 * Math.abs(Math.sin(i * 1.9)));
      var g = ctx.createLinearGradient(mx, my, mx + Math.cos(a) * L, my + Math.sin(a) * L);
      g.addColorStop(0, 'rgba(255,252,240,0.85)');
      g.addColorStop(1, 'rgba(255,252,240,0)');
      ctx.fillStyle = g;
      var w = e.r * (0.18 + 0.12 * Math.abs(Math.sin(i * 3.1)));
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(a + 0.35) * e.r, my + Math.sin(a + 0.35) * e.r);
      ctx.quadraticCurveTo(mx + Math.cos(a) * L * 0.6, my + Math.sin(a) * L * 0.6, mx + Math.cos(a) * L, my + Math.sin(a) * L);
      ctx.quadraticCurveTo(mx + Math.cos(a) * L * 0.6, my + Math.sin(a) * L * 0.6, mx + Math.cos(a - 0.35) * e.r, my + Math.sin(a - 0.35) * e.r);
      ctx.closePath();
      ctx.fill();
      void w;
    }
    glow(ctx, mx, my, e.r * 2, [255, 248, 230], 0.5);
    ctx.fillStyle = '#0B0E1C';
    circ(ctx, mx, my, e.r * 1.02); ctx.fill();
    // a pink prominence on the edge
    ctx.fillStyle = 'rgba(255,90,120,0.85)';
    ell(ctx, mx + e.r * 0.95, my - e.r * 0.3, e.r * 0.08, e.r * 0.13, 0.4); ctx.fill();
  }

  K.add('telescope', 'ground', telescope);
  K.add('station', 'stars', station);
  K.add('campfire', 'ground', campfire);
  K.add('moonpath', 'ground', moonpath);
  K.add('badger', 'ground', badger);
  K.add('wolf', 'ground', wolf);
  K.add('moonhare', 'ground', moonhare);
  K.add('cowmoon', 'back', cowmoon);
  K.add('stargazers', 'ground', stargazers);
  K.add('fireball', 'back', fireball);
  K.add('observatory', 'ground', observatory);
  K.add('startrails', 'stars', startrails);
  K.add('meteorite', 'ground', meteorite);
  K.add('ufo', 'front', ufo);
  K.add('marestails', 'back', marestails);
  K.add('contrails', 'front', contrails);
  K.add('sundial', 'ground', sundial);
  K.add('skylark', 'front', skylark);
  K.add('station2', 'ground', station2);
  K.add('kestrel', 'front', kestrel);
  K.add('smilearc', 'back', smilearc);
  K.add('cityrise', 'ground', cityrise);
  K.add('moontree', 'ground', moontree);
  K.add('hightide', 'ground', hightide);
  K.add('moonswing', 'ground', moonswing);
  K.add('astronaut', 'back', astronaut);
  K.add('bloodmoon', 'back', bloodmoon);
  K.add('rainbowbrolly', 'ground', rainbowbrolly);
  K.add('chalk', 'ground', chalk);
  K.add('trout', 'ground', trout);
  K.add('bunting', 'front', bunting);
  K.add('crossing', 'ground', crossing);
  K.add('painter', 'ground', painter);
  K.add('shadesdog', 'ground', shadesdog);
  K.add('hotdog', 'ground', hotdog);
  K.add('icefishing', 'ground', icefishing);
  K.add('snowgoose', 'front', snowgoose);
  K.add('sunears', 'back', sunears);
  K.add('skycircle', 'back', skycircle);
  K.add('birches', 'ground', birches);
  K.add('rowboat', 'ground', rowboat);
  K.add('whitehorse', 'ground', whitehorse);
  K.add('dewdrops', 'ground', dewdrops);
  K.add('lonetree', 'ground', lonetree);
  K.add('cliffs', 'ground', cliffs);
  K.add('magpies', 'ground', magpies);
  K.add('tandem', 'ground', tandem);
  K.add('lambs', 'ground', lambs);
  K.add('reflectbow', 'ground', reflectbow);
  K.add('seesaw', 'ground', seesaw);
  K.add('bonus', 'back', bonus);
  K.add('triplebow', 'back', triplebow);
  K.add('moonfall', 'ground', moonfall);
  K.add('glowworms', 'ground', glowworms);
  K.add('toad', 'ground', toad);
  K.add('moth', 'front', moth);
  K.add('lanternboat', 'ground', lanternboat);
  K.add('fairy', 'front', fairy);
  K.add('whale', 'ground', whale);
  K.add('reindeer', 'ground', reindeer);
  K.add('cabin', 'ground', cabin);
  K.add('husky', 'ground', husky);
  K.add('arcticfox', 'ground', arcticfox);
  K.add('pines', 'ground', pines);
  K.add('lakeglow', 'ground', lakeglow);
  K.add('crown', 'stars', crown);
  K.add('glasses', 'ground', glasses);
  K.add('crescents', 'ground', crescents);
  K.add('bands', 'ground', bands);
  K.add('planets', 'stars', planets);
  K.add('beads', 'back', beads);
  K.add('ring', 'back', ring);
  K.add('corona', 'back', corona);
})(typeof window !== 'undefined' ? window : globalThis);
