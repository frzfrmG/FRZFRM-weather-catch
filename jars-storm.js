/* FRZFRM Weather Catch: the Storm row's own variants. Every jar has seven of its own; no picture is in two jars. */
(function (root) {
  'use strict';
  var K = root.WC && root.WC.kit;
  if (!K) return;
  var TAU = Math.PI * 2;
  var circ = K.circ, ell = K.ell, tri = K.tri, poly = K.poly, rr = K.rr, pen = K.pen, seg = K.seg, glow = K.glow, shade = K.shade, star4 = K.star4;

  /* a flash every so often: 1 at its brightest, 0 in between */
  function flash(t, period, ph) {
    var p = ((t + (ph || 0)) % period) / period;
    return p < 0.05 ? 1 : p < 0.1 ? 0.3 : p < 0.14 ? 0.8 : 0;
  }
  /* the same, but never quite off: for strikes that are the whole picture */
  function glimmer(t, period, ph) { return Math.max(0.42 + 0.08 * Math.sin(t * 7 + (ph || 0)), flash(t, period, ph)); }
  /* a branching bolt of lightning */
  function forkBolt(ctx, x0, y0, x1, y1, seed, w, depth, col) {
    var rnd = K.rand(seed);
    function go(ax, ay, bx, by, ww, d) {
      var pts = [ax, ay], n = 7;
      for (var i = 1; i < n; i++) { var f = i / n; pts.push(ax + (bx - ax) * f + (rnd() - 0.5) * Math.abs(by - ay) * 0.22, ay + (by - ay) * f + (rnd() - 0.5) * Math.abs(bx - ax) * 0.1); }
      pts.push(bx, by);
      pen(ctx, col || 'rgba(255,255,255,0.97)', ww);
      K.path(ctx, pts);
      if (d > 0) for (var k = 2; k < pts.length - 2; k += 4) {
        var sx = pts[k], sy = pts[k + 1], L = Math.hypot(bx - ax, by - ay) * 0.35;
        var a = Math.atan2(by - ay, bx - ax) + (rnd() < 0.5 ? -0.7 : 0.7);
        go(sx, sy, sx + Math.cos(a) * L, sy + Math.sin(a) * L, ww * 0.55, d - 1);
      }
    }
    ctx.save();
    ctx.shadowColor = 'rgba(190,200,255,0.95)';
    ctx.shadowBlur = w * 5;
    go(x0, y0, x1, y1, w, depth);
    ctx.restore();
  }
  function snowField(ctx, W, H, y) {
    ctx.fillStyle = '#E6EAF4';
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, y); for (var i = 0; i <= 8; i++) ctx.lineTo(W * i / 8, y + Math.sin(i * 1.9) * H * 0.008); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  function sea(ctx, W, H, y, col, t) {
    var c = col || [40, 50, 80];
    var g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, K.rgba(c, 0.95));
    g.addColorStop(1, K.rgba(K.mix(c, [0, 0, 0], 0.4), 0.98));
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, H - y);
    pen(ctx, 'rgba(220,230,250,0.4)', W / 260);
    for (var i = 0; i < 5; i++) { var yy = y + (H - y) * (0.2 + i * 0.17), xx = W * (0.15 + ((i * 0.31 + (t || 0) * 0.03) % 0.6)); seg(ctx, xx, yy, xx + W * 0.08, yy); }
  }

  /* ---------- Rumble ---------- */

  /* a dog peeking out of its kennel at the thunder */
  function kennel(ctx, W, H, t) {
    var u = W / 56, g = K.at(W, H, 0.52), x = g.x, y = g.y;
    ctx.fillStyle = '#B8743E';
    ctx.fillRect(x - 7 * u, y - 9 * u, 14 * u, 9 * u);
    ctx.fillStyle = '#8A4A2A';
    poly(ctx, [x - 8.6 * u, y - 8.6 * u, x, y - 14.6 * u, x + 8.6 * u, y - 8.6 * u]); ctx.fill();
    pen(ctx, 'rgba(70,40,20,0.35)', 0.3 * u);
    for (var k = 1; k < 4; k++) seg(ctx, x - 7 * u, y - k * 2.2 * u, x + 7 * u, y - k * 2.2 * u);
    ctx.fillStyle = '#2A1E18';
    ctx.beginPath(); ctx.moveTo(x - 3.4 * u, y); ctx.lineTo(x - 3.4 * u, y - 4.6 * u); ctx.arc(x, y - 4.6 * u, 3.4 * u, Math.PI, TAU); ctx.lineTo(x + 3.4 * u, y); ctx.closePath(); ctx.fill();
    // the dog's head in the doorway, ears flat, eyes wide
    var peek = Math.max(0, Math.sin(t * 0.9)) * 0.8 * u;
    var hx = x + 0.4 * u, hy = y - 2.6 * u - peek;
    ctx.fillStyle = '#D8B07A';
    circ(ctx, hx, hy, 2.3 * u); ctx.fill();
    ell(ctx, hx + 0.6 * u, hy + 1.3 * u, 1.6 * u, 1.1 * u); ctx.fill();
    ctx.fillStyle = '#A8784A';
    ell(ctx, hx - 2 * u, hy + 0.6 * u, 0.8 * u, 1.8 * u, 0.5); ctx.fill();
    ell(ctx, hx + 2.3 * u, hy + 0.6 * u, 0.8 * u, 1.8 * u, -0.5); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    circ(ctx, hx - 0.8 * u, hy - 0.4 * u, 0.6 * u); ctx.fill();
    circ(ctx, hx + 0.9 * u, hy - 0.4 * u, 0.6 * u); ctx.fill();
    ctx.fillStyle = '#1E1A22';
    circ(ctx, hx - 0.7 * u, hy - 0.3 * u, 0.32 * u); ctx.fill();
    circ(ctx, hx + 1 * u, hy - 0.3 * u, 0.32 * u); ctx.fill();
    circ(ctx, hx + 0.6 * u, hy + 1 * u, 0.45 * u); ctx.fill();
    // a paw over the edge
    ctx.fillStyle = '#D8B07A';
    ell(ctx, x - 1.8 * u, y - 0.5 * u, 1.1 * u, 0.6 * u); ctx.fill();
  }

  /* cows lying down: they say it means rain is coming */
  function cows(ctx, W, H, t) {
    var u = W / 60;
    [[0.36, 1, 0], [0.64, -1, 1.7]].forEach(function (c) {
      var g = K.at(W, H, c[0]), x = g.x, y = g.y, d = c[1];
      ctx.fillStyle = '#F2EEE6';
      ell(ctx, x, y - 2.2 * u, 5.4 * u, 2.4 * u); ctx.fill();
      ctx.fillStyle = '#2A2A30';
      ell(ctx, x - d * 1.4 * u, y - 3 * u, 1.8 * u, 1.1 * u, 0.3); ctx.fill();
      ell(ctx, x + d * 2.2 * u, y - 1.8 * u, 1.2 * u, 0.8 * u); ctx.fill();
      // folded legs
      ctx.fillStyle = '#E2DCD2';
      ell(ctx, x + d * 3.4 * u, y - 0.4 * u, 2 * u, 0.6 * u); ctx.fill();
      ell(ctx, x - d * 3 * u, y - 0.4 * u, 1.6 * u, 0.6 * u); ctx.fill();
      // head up, chewing
      var chew = Math.sin(t * 3 + c[2]) * 0.15 * u;
      var hx = x + d * 5.8 * u, hy = y - 4.4 * u;
      ctx.fillStyle = '#F2EEE6';
      K.poly(ctx, [x + d * 3.6 * u, y - 3.6 * u, hx - d * 1 * u, hy - 1 * u, hx, hy + 1.6 * u, x + d * 4 * u, y - 1.4 * u]); ctx.fill();
      ell(ctx, hx, hy, 1.6 * u, 1.9 * u); ctx.fill();
      ctx.fillStyle = '#F2B8B0';
      ell(ctx, hx + d * 0.3 * u, hy + 1.6 * u + chew, 1.3 * u, 0.9 * u); ctx.fill();
      ctx.fillStyle = '#1E1A22';
      circ(ctx, hx + d * 0.6 * u, hy - 0.4 * u, 0.28 * u); ctx.fill();
      ctx.fillStyle = '#E2DCD2';
      ell(ctx, hx - d * 1.6 * u, hy - 0.8 * u, 1 * u, 0.45 * u, -0.3 * d); ctx.fill();
      pen(ctx, '#E8DCC2', 0.4 * u);
      seg(ctx, hx - d * 0.4 * u, hy - 1.6 * u, hx - d * 0.8 * u, hy - 2.6 * u);
      pen(ctx, '#F2EEE6', 0.35 * u);
      ctx.beginPath(); ctx.moveTo(x - d * 5.2 * u, y - 2.6 * u); ctx.quadraticCurveTo(x - d * 7 * u, y - 1.6 * u, x - d * 6.6 * u, y - 0.2 * u); ctx.stroke();
    });
  }

  /* a towering anvil cloud on the horizon, the storm next door, flickering inside */
  function anvil(ctx, W, H, t) {
    var x = W * (0.6 + K.J().dx * 0.3), base = H * 0.82, top = H * 0.4;
    var lit = 'rgba(244,240,246,0.98)', mid = 'rgba(214,214,228,0.98)', dark = 'rgba(160,164,190,0.98)';
    // the tower: wide at the bottom, narrowing as it climbs, lit on the sunny side
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.moveTo(x - W * 0.2, base);
    ctx.bezierCurveTo(x - W * 0.22, base - H * 0.14, x - W * 0.1, top + H * 0.12, x - W * 0.07, top + H * 0.05);
    ctx.lineTo(x + W * 0.08, top + H * 0.05);
    ctx.bezierCurveTo(x + W * 0.12, top + H * 0.14, x + W * 0.24, base - H * 0.14, x + W * 0.22, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lit;
    [[-0.12, 0.92], [-0.06, 0.8], [-0.1, 0.66], [-0.04, 0.55]].forEach(function (c) {
      K.cloud(ctx, x + W * c[0] - W * 0.07, top + (base - top) * c[1], W * 0.075, lit);
    });
    ctx.fillStyle = 'rgba(150,154,180,0.35)';
    ctx.beginPath(); ctx.moveTo(x + W * 0.04, top + H * 0.06); ctx.bezierCurveTo(x + W * 0.1, top + H * 0.16, x + W * 0.22, base - H * 0.14, x + W * 0.2, base); ctx.lineTo(x + W * 0.06, base); ctx.closePath(); ctx.fill();
    // the anvil top, spreading downwind
    ctx.fillStyle = lit;
    ctx.beginPath();
    ctx.moveTo(x - W * 0.16, top + H * 0.06);
    ctx.quadraticCurveTo(x - W * 0.2, top - H * 0.005, x - W * 0.02, top - H * 0.012);
    ctx.quadraticCurveTo(x + W * 0.3, top - H * 0.02, x + W * 0.46, top + H * 0.02);
    ctx.quadraticCurveTo(x + W * 0.26, top + H * 0.04, x + W * 0.1, top + H * 0.07);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(x - W * 0.2, base - H * 0.025, W * 0.42, H * 0.03);
    // rain under it and a flicker inside
    pen(ctx, 'rgba(140,146,176,0.5)', W / 260);
    for (var k = 0; k < 6; k++) seg(ctx, x - W * 0.14 + k * W * 0.055, base, x - W * 0.15 + k * W * 0.055, base + H * 0.04);
    var fl = flash(t, 3.1, 0.4);
    glow(ctx, x, base - H * 0.14, W * 0.12, [255, 250, 220], 0.15 + 0.5 * fl);
  }


  /* the weather house: the little man with the umbrella has come out, so it's stormy */
  function weatherhouse(ctx, W, H, t) {
    var u = W / 54, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    // its post
    ctx.fillStyle = '#6B4A2B';
    ctx.fillRect(x - 0.8 * u, y - 8 * u, 1.6 * u, 8 * u);
    var by = y - 8 * u;
    ctx.fillStyle = '#E8DCC0';
    ctx.fillRect(x - 6 * u, by - 7 * u, 12 * u, 7 * u);
    ctx.fillStyle = '#8A3A2E';
    poly(ctx, [x - 7.4 * u, by - 6.6 * u, x, by - 11.4 * u, x + 7.4 * u, by - 6.6 * u]); ctx.fill();
    ctx.fillStyle = '#F2F0EA';
    circ(ctx, x, by - 8.4 * u, 1 * u); ctx.fill();
    // the two doorways
    ctx.fillStyle = '#3A2A20';
    [-2.8, 2.8].forEach(function (dx) { ctx.beginPath(); ctx.moveTo(x + dx * u - 1.6 * u, by); ctx.lineTo(x + dx * u - 1.6 * u, by - 3.6 * u); ctx.arc(x + dx * u, by - 3.6 * u, 1.6 * u, Math.PI, TAU); ctx.lineTo(x + dx * u + 1.6 * u, by); ctx.fill(); });
    // the lady stays in (sunny), the man is out with his umbrella (stormy)
    ctx.fillStyle = '#D85A8A';
    ell(ctx, x - 2.8 * u, by - 1.6 * u, 0.9 * u, 1.6 * u); ctx.fill();
    var sw = Math.sin(t * 2) * 0.3 * u;
    var mx = x + 4.6 * u + sw, my = by + 0.2 * u;
    ctx.fillStyle = '#2F4A8A';
    ell(ctx, mx, my - 2.2 * u, 1 * u, 1.9 * u); ctx.fill();
    ctx.fillStyle = '#F2C7A0';
    circ(ctx, mx, my - 4.6 * u, 0.8 * u); ctx.fill();
    ctx.fillStyle = '#1E1E24';
    ctx.beginPath(); ctx.arc(mx, my - 6.6 * u, 2.4 * u, Math.PI, TAU); ctx.fill();
    pen(ctx, '#1E1E24', 0.25 * u);
    seg(ctx, mx, my - 6.6 * u, mx + 0.4 * u, my - 3 * u);
    // the balcony
    ctx.fillStyle = '#A8703E';
    ctx.fillRect(x - 7 * u, by - 0.2 * u, 14 * u, 0.8 * u);
  }

  /* a pheasant running for the hedge */
  function pheasant(ctx, W, H, t) {
    var u = W / 46, g = K.at(W, H, 0.5), x = g.x + Math.sin(t * 0.8) * u, y = g.y, d = -1;
    var run = Math.sin(t * 9);
    pen(ctx, '#8A6A4A', 0.35 * u);
    seg(ctx, x - 0.4 * u, y - 3 * u, x - 0.4 * u + run * 1.2 * u, y); seg(ctx, x + 0.4 * u, y - 3 * u, x + 0.4 * u - run * 1.2 * u, y);
    // the long tail
    ctx.fillStyle = '#A86A3A';
    poly(ctx, [x - d * 2 * u, y - 4.6 * u, x - d * 11 * u, y - 7.4 * u, x - d * 10.6 * u, y - 6.6 * u, x - d * 2 * u, y - 3.4 * u]); ctx.fill();
    pen(ctx, 'rgba(60,30,14,0.5)', 0.18 * u);
    for (var k = 1; k < 6; k++) seg(ctx, x - d * (2 + k * 1.6) * u, y - (4.4 + k * 0.55) * u, x - d * (2 + k * 1.6) * u, y - (3.6 + k * 0.55) * u);
    ctx.fillStyle = '#C8743A';
    ell(ctx, x, y - 4.4 * u, 3.2 * u, 2 * u, 0.1 * d); ctx.fill();
    ctx.fillStyle = 'rgba(90,40,14,0.35)';
    for (var s = 0; s < 6; s++) { circ(ctx, x - 1.6 * u + (s % 3) * 1.4 * u, y - 4.8 * u + Math.floor(s / 3) * 1.1 * u, 0.25 * u); ctx.fill(); }
    // white collar, green head and red face
    ctx.fillStyle = '#FFFFFF';
    ell(ctx, x + d * 2.4 * u, y - 6 * u, 1 * u, 0.5 * u, 0.3 * d); ctx.fill();
    ctx.fillStyle = '#1E5A4A';
    poly(ctx, [x + d * 2 * u, y - 5.6 * u, x + d * 3.2 * u, y - 8.4 * u, x + d * 4 * u, y - 8 * u, x + d * 3 * u, y - 5.4 * u]); ctx.fill();
    circ(ctx, x + d * 3.6 * u, y - 8.6 * u, 1.1 * u); ctx.fill();
    ctx.fillStyle = '#D8302A';
    ell(ctx, x + d * 3.8 * u, y - 8.6 * u, 0.6 * u, 0.8 * u); ctx.fill();
    ctx.fillStyle = '#E8D8A0';
    tri(ctx, x + d * 4.5 * u, y - 8.8 * u, x + d * 5.6 * u, y - 8.5 * u, x + d * 4.5 * u, y - 8.2 * u); ctx.fill();
    K.grass(ctx, x - 12 * u, x + 8 * u, y, 1.2 * u, 'rgba(60,110,60,0.85)');
  }

  /* a grumpy cloud, grumbling */
  function grumpycloud(ctx, W, H, t) {
    var u = W / 60, x = W * (0.52 + K.J().dx * 0.3) + Math.sin(t * 0.4) * 2 * u, y = H * (0.5 + K.J().dy * 0.3);
    var shake = Math.sin(t * 25) * (flash(t, 2.6) ? 0.5 * u : 0.08 * u);
    K.cloud(ctx, x - 10 * u + shake, y, 9 * u, 'rgba(120,126,146,0.98)');
    ctx.fillStyle = 'rgba(90,96,118,0.6)';
    ell(ctx, x + shake, y + 4 * u, 9 * u, 2 * u); ctx.fill();
    // the grumpy face
    var fx = x - 1.4 * u + shake, fy = y - 0.6 * u;
    pen(ctx, '#2A2E3E', 0.6 * u);
    seg(ctx, fx - 3.6 * u, fy - 2 * u, fx - 1.4 * u, fy - 1.2 * u);
    seg(ctx, fx + 3.6 * u, fy - 2 * u, fx + 1.4 * u, fy - 1.2 * u);
    ctx.fillStyle = '#2A2E3E';
    circ(ctx, fx - 2.2 * u, fy, 0.6 * u); ctx.fill();
    circ(ctx, fx + 2.2 * u, fy, 0.6 * u); ctx.fill();
    ctx.beginPath(); ctx.arc(fx, fy + 3.4 * u, 1.8 * u, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    // a little bolt when it grumbles
    if (flash(t, 2.6)) { ctx.fillStyle = '#FFE07A'; poly(ctx, [x + 2 * u, y + 5 * u, x + 0.4 * u, y + 8.4 * u, x + 1.6 * u, y + 8.4 * u, x + 0.6 * u, y + 11 * u, x + 3.2 * u, y + 7.4 * u, x + 2 * u, y + 7.4 * u, x + 3 * u, y + 5 * u]); ctx.fill(); }
    pen(ctx, 'rgba(255,255,255,0.6)', 0.3 * u);
    for (var k = 0; k < 3; k++) { var p = (t * 0.8 + k / 3) % 1; ctx.beginPath(); ctx.arc(x - 12 * u - p * 3 * u, y + 1 * u, (1 + p * 2) * u, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke(); }
  }

  /* legendary: mammatus, pouches of cloud hanging under the storm, lit orange by the low sun */
  function mammatus(ctx, W, H, t) {
    var top = H * 0.3, rows = 3, rnd = K.rand(171);
    ctx.fillStyle = 'rgba(150,110,120,0.95)';
    ctx.fillRect(0, top - H * 0.08, W, H * 0.08);
    for (var r = 0; r < rows; r++) {
      var y = top + r * H * 0.07, n = 6 - r;
      for (var i = 0; i < n; i++) {
        var x = W * ((i + 0.5 + (r % 2) * 0.5) / n), rx = W / n * 0.55, ry = H * (0.05 - r * 0.008) + Math.sin(t * 0.6 + i + r) * H * 0.004;
        var g = ctx.createRadialGradient(x - rx * 0.2, y + ry * 0.5, 0, x, y, rx * 1.2);
        g.addColorStop(0, 'rgba(255,190,140,0.98)');
        g.addColorStop(0.6, 'rgba(220,140,130,0.96)');
        g.addColorStop(1, 'rgba(150,100,120,0.95)');
        ctx.fillStyle = g;
        ell(ctx, x, y, rx, ry + rnd() * H * 0.006); ctx.fill();
      }
    }
  }

  /* ---------- Sheet Lightning ---------- */

  /* a photographer with a camera on a tripod, waiting for the flash */
  function photographer(ctx, W, H, t) {
    var u = W / 58, g = K.at(W, H, 0.4), x = g.x, y = g.y;
    var tx = x + 6 * u, ty = y - 9 * u;
    pen(ctx, '#4A4E5E', 0.4 * u);
    seg(ctx, tx, ty, tx - 2.4 * u, y); seg(ctx, tx, ty, tx + 2.4 * u, y); seg(ctx, tx, ty, tx + 0.2 * u, y);
    ctx.fillStyle = '#22262F';
    rr(ctx, tx - 2 * u, ty - 2.4 * u, 4 * u, 2.6 * u, 0.5 * u); ctx.fill();
    ctx.fillStyle = '#3A4050';
    ctx.save(); ctx.translate(tx + 1.6 * u, ty - 1.2 * u); ctx.rotate(-0.5); rr(ctx, 0, -0.9 * u, 3 * u, 1.8 * u, 0.4 * u); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(255,60,50,' + (0.5 + 0.5 * Math.sin(t * 4)) + ')';
    circ(ctx, tx - 1.2 * u, ty - 1.8 * u, 0.3 * u); ctx.fill();
    K.person(ctx, x, y, u, { coat: '#2F3A4A', legs: '#1E2230', hat: 'beanie', hatCol: '#3A4A6A', arms: [0.2, 1.4], skin: '#C8A88A' });
    var fl = flash(t, 3.4);
    if (fl) glow(ctx, tx + 3 * u, ty - 3 * u, 5 * u, [255, 255, 240], 0.4 * fl);
  }

  /* a house lit up for an instant by the flash */
  function litwindow(ctx, W, H, t) {
    var u = W / 56, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    var fl = flash(t, 3.2);
    var wall = fl ? '#B8BCD0' : '#262B40', roof = fl ? '#7A7E96' : '#181C2E';
    var h = K.house(ctx, x, y, u, { w: 14, h: 8, rh: 5, wall: wall, roof: roof, door: fl ? '#5A6080' : '#141828', wins: 0, chimneyCol: roof });
    // one window with a lamp on, and someone looking out
    ctx.fillStyle = '#FFD27A';
    ctx.fillRect(x - 5 * u, y - 6.6 * u, 3 * u, 3 * u);
    glow(ctx, x - 3.5 * u, y - 5.1 * u, 5 * u, [255, 210, 120], 0.35);
    ctx.fillStyle = '#3A2A20';
    circ(ctx, x - 3.4 * u, y - 5.4 * u, 0.7 * u); ctx.fill();
    ell(ctx, x - 3.4 * u, y - 3.8 * u, 1.1 * u, 0.9 * u); ctx.fill();
    ctx.fillStyle = fl ? '#E8ECF8' : '#3A4058';
    ctx.fillRect(x + 2 * u, y - 6.6 * u, 3 * u, 3 * u);
    void h;
  }

  /* trees black against the flickering sky */
  function silhouettes(ctx, W, H, t) {
    var u = W / 60, fl = flash(t, 2.9, 0.7);
    var g = ctx.createLinearGradient(0, H * 0.5, 0, H * 0.88);
    g.addColorStop(0, 'rgba(200,190,255,0)');
    g.addColorStop(1, 'rgba(200,190,255,' + (0.15 + 0.55 * fl) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.5, W, H * 0.4);
    [[0.22, 18, 'round'], [0.38, 24, 'pine'], [0.56, 20, 'round'], [0.74, 26, 'pine'], [0.86, 15, 'round']].forEach(function (tr, i) {
      var gp = K.at(W, H, tr[0], 0.1);
      K.tree(ctx, gp.x, gp.y, u, { kind: tr[2], h: tr[1], col: '#0C0E1A', trunk: '#0C0E1A' });
      void i;
    });
  }

  /* a church spire against the flash */
  function spire(ctx, W, H, t) {
    var u = W / 56, g = K.at(W, H, 0.55), x = g.x, y = g.y, fl = flash(t, 3.3, 1.1);
    var c = fl ? '#9AA0BA' : '#1A1E30';
    ctx.fillStyle = c;
    ctx.fillRect(x - 10 * u, y - 7 * u, 12 * u, 7 * u);
    poly(ctx, [x - 11 * u, y - 7 * u, x - 4 * u, y - 11 * u, x + 3 * u, y - 7 * u]); ctx.fill();
    ctx.fillRect(x + 1 * u, y - 14 * u, 5 * u, 14 * u);
    poly(ctx, [x + 0.6 * u, y - 14 * u, x + 3.5 * u, y - 28 * u, x + 6.4 * u, y - 14 * u]); ctx.fill();
    pen(ctx, c, 0.3 * u);
    seg(ctx, x + 3.5 * u, y - 28 * u, x + 3.5 * u, y - 31 * u);
    seg(ctx, x + 2.4 * u, y - 30 * u, x + 4.6 * u, y - 30 * u);
    ctx.fillStyle = '#FFD27A';
    ctx.beginPath(); ctx.moveTo(x - 7 * u, y - 2 * u); ctx.lineTo(x - 7 * u, y - 4.4 * u); ctx.arc(x - 6.2 * u, y - 4.4 * u, 0.8 * u, Math.PI, TAU); ctx.lineTo(x - 5.4 * u, y - 2 * u); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 3 * u, y - 2 * u); ctx.lineTo(x - 3 * u, y - 4.4 * u); ctx.arc(x - 2.2 * u, y - 4.4 * u, 0.8 * u, Math.PI, TAU); ctx.lineTo(x - 1.4 * u, y - 2 * u); ctx.fill();
    ctx.fillStyle = fl ? '#C8CCE0' : '#2E3450';
    circ(ctx, x + 3.5 * u, y - 10 * u, 1.2 * u); ctx.fill();
  }

  /* a blue jet shooting up out of the top of a far-off storm */
  function bluejet(ctx, W, H, t) {
    var x = W * (0.46 + K.J().dx * 0.3), base = H * 0.66;
    var p = (t * 0.5) % 1, on = 0.75 + 0.25 * Math.sin(p * TAU);
    ctx.fillStyle = 'rgba(40,44,70,0.95)';
    K.cloud(ctx, x - W * 0.2, base, W * 0.16, 'rgba(48,52,80,0.97)');
    K.cloud(ctx, x - W * 0.02, base - H * 0.02, W * 0.13, 'rgba(56,60,90,0.97)');
    if (on > 0) {
      var top = base - H * 0.3;
      var g = ctx.createLinearGradient(0, base, 0, top);
      g.addColorStop(0, 'rgba(140,190,255,0.9)');
      g.addColorStop(1, 'rgba(90,120,255,0)');
      ctx.fillStyle = g;
      poly(ctx, [x - W * 0.012, base - H * 0.04, x + W * 0.012, base - H * 0.04, x + W * 0.06, top, x - W * 0.06, top]); ctx.fill();
      glow(ctx, x, base - H * 0.05, W * 0.05, [170, 210, 255], 0.7 * on);
    }
  }

  /* legendary: an anvil crawler, spidery lightning creeping along under the clouds */
  function crawler(ctx, W, H, t) {
    var p = (t * 0.3) % 1;
    var y = H * (0.36 + K.J().dy * 0.4), rnd = K.rand(17);
    ctx.fillStyle = 'rgba(200,190,255,' + (0.08 + 0.08 * Math.sin(t * 9)) + ')';
    ctx.fillRect(0, 0, W, H * 0.6);
    var reach = 0.55 + 0.45 * Math.min(1, p / 0.45);
    ctx.save();
    ctx.shadowColor = 'rgba(200,190,255,0.95)';
    ctx.shadowBlur = W * 0.02;
    function crawl(x0, y0, dir, len, w, d) {
      var x = x0, yy = y0;
      pen(ctx, 'rgba(250,248,255,0.95)', w);
      ctx.beginPath(); ctx.moveTo(x, yy);
      var steps = 6;
      for (var i = 0; i < steps; i++) {
        x += dir * len / steps * (0.7 + rnd() * 0.6); yy += (rnd() - 0.5) * H * 0.03;
        ctx.lineTo(x, yy);
        if (d > 0 && rnd() < 0.45) { ctx.stroke(); crawl(x, yy, dir * (rnd() < 0.3 ? -1 : 1), len * 0.45, w * 0.6, d - 1); pen(ctx, 'rgba(250,248,255,0.95)', w); ctx.beginPath(); ctx.moveTo(x, yy); }
      }
      ctx.stroke();
    }
    var cx = W * (0.5 + K.J().dx * 0.3);
    crawl(cx, y, 1, W * 0.45 * reach, W * 0.008, 2);
    crawl(cx, y, -1, W * 0.45 * reach, W * 0.008, 2);
    ctx.restore();
  }

  /* ---------- Thunderstorm ---------- */

  /* the lightning, mirrored in a big puddle in the street */
  function boltreflect(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5), y = g.y, x = g.x;
    ctx.fillStyle = '#3A3E4E';
    ctx.fillRect(0, y - 1 * u, W, H - y + 1 * u);
    var px = x, py = y + 3.4 * u;
    ctx.fillStyle = 'rgba(70,84,120,0.9)';
    ell(ctx, px, py, 15 * u, 3 * u); ctx.fill();
    var fl = flash(t, 2.4, 0.3);
    ctx.save();
    ctx.beginPath(); ctx.ellipse(px, py, 15 * u, 3 * u, 0, 0, TAU); ctx.clip();
    if (fl) {
      ctx.fillStyle = 'rgba(220,226,255,' + (0.4 * fl) + ')';
      ctx.fillRect(px - 15 * u, py - 3 * u, 30 * u, 6 * u);
      pen(ctx, 'rgba(255,255,255,' + fl + ')', 0.5 * u);
      K.path(ctx, [px - 2 * u, py - 3 * u, px + 1 * u, py - 1.6 * u, px - 1 * u, py - 0.6 * u, px + 2 * u, py + 1 * u, px + 0.4 * u, py + 2.4 * u]);
    }
    pen(ctx, 'rgba(255,255,255,0.3)', 0.3 * u);
    var q = (t * 0.8) % 1;
    ell(ctx, px - 6 * u, py, (1 + q * 3) * u, (0.3 + q) * u); ctx.stroke();
    ctx.restore();
    // a kerb and a lamp post at the edge
    ctx.fillStyle = '#5A5E6E';
    ctx.fillRect(0, y - 1.4 * u, W, 0.8 * u);
    ctx.fillStyle = '#22262F';
    ctx.fillRect(W * 0.8, y - 18 * u, 0.9 * u, 17 * u);
    ctx.fillRect(W * 0.8 - 1.6 * u, y - 18.8 * u, 4 * u, 1.2 * u);
    glow(ctx, W * 0.8 + 0.4 * u, y - 17.4 * u, 4 * u, [255, 214, 150], 0.5);
  }

  /* a storm chaser's van, weather gear on the roof */
  function chaser(ctx, W, H, t) {
    var u = W / 62, g = K.at(W, H, 0.48), x = g.x, y = g.y;
    var L = 17 * u, x0 = x - L / 2;
    ctx.fillStyle = '#F2F0EA';
    rr(ctx, x0, y - 9 * u, L * 0.78, 7.6 * u, 1 * u); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x0 + L * 0.76, y - 8.6 * u); ctx.lineTo(x0 + L * 0.9, y - 5.4 * u); ctx.lineTo(x0 + L, y - 5 * u); ctx.lineTo(x0 + L, y - 1.6 * u); ctx.lineTo(x0 + L * 0.76, y - 1.4 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E8432F';
    ctx.fillRect(x0, y - 4.6 * u, L, 1.1 * u);
    ctx.fillStyle = '#A8D2F0';
    poly(ctx, [x0 + L * 0.78, y - 8.2 * u, x0 + L * 0.88, y - 5.6 * u, x0 + L * 0.78, y - 5.6 * u]); ctx.fill();
    ctx.fillRect(x0 + L * 0.1, y - 8 * u, L * 0.2, 2.4 * u);
    // the roof rack: an anemometer, a dish and an aerial
    pen(ctx, '#3A3E48', 0.35 * u);
    seg(ctx, x0 + L * 0.2, y - 9 * u, x0 + L * 0.2, y - 13 * u);
    var sp = t * 9;
    for (var c = 0; c < 3; c++) { var a = sp + c * TAU / 3; seg(ctx, x0 + L * 0.2, y - 13 * u, x0 + L * 0.2 + Math.cos(a) * 1.8 * u, y - 13 * u + Math.sin(a) * 0.5 * u); ctx.fillStyle = '#3A3E48'; circ(ctx, x0 + L * 0.2 + Math.cos(a) * 1.8 * u, y - 13 * u + Math.sin(a) * 0.5 * u, 0.5 * u); ctx.fill(); }
    ctx.fillStyle = '#C9CED8';
    ctx.beginPath(); ctx.arc(x0 + L * 0.45, y - 10.4 * u, 1.8 * u, Math.PI * 0.9, Math.PI * 1.9); ctx.fill();
    seg(ctx, x0 + L * 0.62, y - 9 * u, x0 + L * 0.66, y - 16 * u);
    K.wheel(ctx, x0 + L * 0.2, y - 1.4 * u, 1.6 * u);
    K.wheel(ctx, x0 + L * 0.8, y - 1.4 * u, 1.6 * u);
    ctx.fillStyle = '#FFF2B0';
    ell(ctx, x0 + L - 0.4 * u, y - 3.6 * u, 0.6 * u, 0.5 * u); ctx.fill();
    glow(ctx, x0 + L + 2 * u, y - 3.6 * u, 6 * u, [255, 240, 190], 0.45);
    ctx.fillStyle = 'rgba(255,90,60,' + (0.5 + 0.5 * Math.sin(t * 6)) + ')';
    circ(ctx, x0 + L * 0.5, y - 9.4 * u, 0.5 * u); ctx.fill();
  }

  /* ---------- Lightning Strike ---------- */

  /* forked lightning, branching all the way to the ground */
  function forked(ctx, W, H, t) {
    var fl = glimmer(t, 2.7, 0.9);
    var x = W * (0.34 + K.J().dx * 0.3);
    ctx.globalAlpha = fl;
    forkBolt(ctx, x, H * 0.3, x + W * 0.14, H * 0.88, 1801, W * 0.012, 2);
    ctx.globalAlpha = 1;
  }

  /* a tower's lightning rod taking the strike */
  function rod(ctx, W, H, t) {
    var u = W / 58, g = K.at(W, H, 0.62), x = g.x, y = g.y;
    var fl = glimmer(t, 2.2, 1.1);
    ctx.fillStyle = fl ? '#7A8098' : '#2A2E44';
    ctx.fillRect(x - 3.6 * u, y - 22 * u, 7.2 * u, 22 * u);
    poly(ctx, [x - 4.4 * u, y - 22 * u, x, y - 26 * u, x + 4.4 * u, y - 22 * u]); ctx.fill();
    ctx.fillStyle = '#FFD27A';
    for (var k = 0; k < 3; k++) { ctx.fillRect(x - 1 * u, y - 18 * u + k * 5 * u, 2 * u, 2.6 * u); }
    pen(ctx, '#C9CED8', 0.35 * u);
    seg(ctx, x, y - 26 * u, x, y - 31 * u);
    seg(ctx, x + 3.8 * u, y - 22 * u, x + 3.8 * u, y);
    if (fl) {
      ctx.globalAlpha = fl;
      forkBolt(ctx, x - W * 0.1, H * 0.3, x, y - 31 * u, 77, W * 0.011, 1);
      ctx.globalAlpha = 1;
      glow(ctx, x, y - 31 * u, 7 * u, [255, 250, 220], 0.8 * fl);
      if (fl > 0.6) { ctx.fillStyle = 'rgba(220,226,255,' + 0.15 * fl + ')'; ctx.fillRect(0, 0, W, H); }
    }
  }

  /* a power cut: every house dark but one, with a candle */
  function powercut(ctx, W, H, t) {
    var u = W / 62, g = K.at(W, H, 0.5, 0.2), x = g.x, y = g.y + 1 * u;
    for (var i = -1; i <= 1; i++) {
      var hx = x + i * 10.4 * u;
      ctx.fillStyle = '#2A2E44';
      ctx.fillRect(hx - 5 * u, y - 9 * u, 10 * u, 9 * u);
      ctx.fillStyle = '#1C2034';
      poly(ctx, [hx - 5.6 * u, y - 8.8 * u, hx, y - 13 * u, hx + 5.6 * u, y - 8.8 * u]); ctx.fill();
      ctx.fillRect(hx + 2 * u, y - 13 * u, 1.4 * u, 2.6 * u);
      ctx.fillStyle = '#141828';
      ctx.fillRect(hx - 3.6 * u, y - 7 * u, 2.6 * u, 2.4 * u);
      ctx.fillRect(hx + 1 * u, y - 7 * u, 2.6 * u, 2.4 * u);
      ctx.fillRect(hx - 1 * u, y - 4 * u, 2 * u, 4 * u);
    }
    // the candle in one window, flickering
    var cx = x + 2.3 * u, cy = y - 5.8 * u, fl = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 7);
    glow(ctx, cx, cy, 4 * u * fl, [255, 190, 90], 0.7);
    ctx.fillStyle = '#F2E6C8';
    ctx.fillRect(cx - 0.3 * u, cy - 0.2 * u, 0.6 * u, 1.2 * u);
    ctx.fillStyle = '#FFD27A';
    ell(ctx, cx, cy - 0.6 * u, 0.3 * u, 0.55 * u * fl); ctx.fill();
    // the street lights off
    pen(ctx, '#1A1E2E', 0.5 * u);
    seg(ctx, x - 17 * u, y, x - 17 * u, y - 12 * u);
  }

  /* a tree split by lightning, smoking */
  function splittree(ctx, W, H, t) {
    var u = W / 58, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    ctx.fillStyle = '#4A3A2E';
    poly(ctx, [x - 2.4 * u, y, x - 1 * u, y, x - 1.2 * u, y - 10 * u, x - 5 * u, y - 18 * u, x - 3 * u, y - 18.4 * u, x - 2.4 * u, y - 12 * u]); ctx.fill();
    poly(ctx, [x + 2.4 * u, y, x + 1 * u, y, x + 1.2 * u, y - 9 * u, x + 6 * u, y - 16 * u, x + 7.6 * u, y - 15 * u, x + 2.6 * u, y - 8 * u]); ctx.fill();
    // the bare charred branches
    pen(ctx, '#3A2E26', 0.6 * u);
    seg(ctx, x - 4.4 * u, y - 16.6 * u, x - 8 * u, y - 19 * u); seg(ctx, x - 3.6 * u, y - 17.6 * u, x - 2.6 * u, y - 22 * u);
    seg(ctx, x + 6.6 * u, y - 15.4 * u, x + 10 * u, y - 17 * u); seg(ctx, x + 5 * u, y - 14.6 * u, x + 6 * u, y - 20 * u);
    // the glowing split
    var gl = 0.6 + 0.4 * Math.sin(t * 3);
    pen(ctx, 'rgba(255,150,60,' + gl + ')', 0.5 * u);
    K.path(ctx, [x, y - 1 * u, x - 0.3 * u, y - 4 * u, x + 0.3 * u, y - 7 * u, x, y - 9 * u]);
    glow(ctx, x, y - 5 * u, 5 * u, [255, 140, 50], 0.35 * gl);
    for (var k = 0; k < 4; k++) {
      var p = (t * 0.4 + k / 4) % 1;
      ctx.fillStyle = 'rgba(180,180,190,' + (0.45 * (1 - p)) + ')';
      circ(ctx, x + Math.sin(p * 5 + k) * 2 * u, y - 10 * u - p * 12 * u, (1 + p * 2.4) * u); ctx.fill();
    }
  }

  /* lightning hitting the sea */
  function seastrike(ctx, W, H, t) {
    var wy = H * 0.84;
    sea(ctx, W, H, wy, [36, 44, 72], t);
    var fl = glimmer(t, 2.5, 0.2), x = W * (0.56 + K.J().dx * 0.3);
    if (fl) {
      ctx.globalAlpha = fl;
      forkBolt(ctx, x - W * 0.06, H * 0.3, x, wy, 913, W * 0.011, 1);
      ctx.globalAlpha = 1;
      glow(ctx, x, wy, W * 0.16, [220, 230, 255], 0.6 * fl);
      ctx.fillStyle = 'rgba(230,236,255,' + 0.35 * fl + ')';
      ctx.fillRect(0, wy, W, H - wy);
    }
    // a little boat far off, keeping its distance
    K.boat(ctx, W * 0.24, wy + H * 0.02, W / 120, { kind: 'sail' }, t);
  }

  /* lightning going up from the top of a tall mast */
  function upward(ctx, W, H, t) {
    var u = W / 60, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    // the lattice mast
    pen(ctx, '#C84A3A', 0.45 * u);
    seg(ctx, x - 3 * u, y, x, y - 34 * u); seg(ctx, x + 3 * u, y, x, y - 34 * u);
    pen(ctx, '#E8ECF0', 0.3 * u);
    for (var k = 0; k < 10; k++) { var f = k / 10, w = 3 * u * (1 - f), yy = y - 34 * u * f; seg(ctx, x - w, yy, x + w * 0.9, yy - 3 * u); }
    ctx.fillStyle = 'rgba(255,70,60,' + (0.5 + 0.5 * Math.sin(t * 4)) + ')';
    circ(ctx, x, y - 34.6 * u, 0.6 * u); ctx.fill();
    var fl = glimmer(t, 2.6, 0.6);
    if (fl) {
      ctx.globalAlpha = fl;
      forkBolt(ctx, x, y - 35 * u, x + W * 0.08, H * 0.28, 517, W * 0.01, 2);
      ctx.globalAlpha = 1;
      glow(ctx, x, y - 35 * u, 6 * u, [255, 250, 230], 0.7 * fl);
    }
  }

  /* legendary: lightning glass, a branching tube of glass the strike made in the sand */
  function fulgurite(ctx, W, H, t) {
    var u = W / 54, base = H * 0.86;
    ctx.fillStyle = '#D8C49A';
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, base); ctx.quadraticCurveTo(W * 0.5, base - H * 0.03, W, base + H * 0.01); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(170,140,90,0.5)';
    for (var d = 0; d < 14; d++) { circ(ctx, W * ((d * 0.071 + 0.05) % 1), base + H * (0.02 + (d % 4) * 0.025), 0.3 * u); ctx.fill(); }
    var x = W * (0.5 + K.J().dx * 0.3), y = base + H * 0.04;
    var gl = 0.65 + 0.35 * Math.sin(t * 2);
    glow(ctx, x, y - 6 * u, 12 * u, [180, 230, 255], 0.45 * gl);
    function branch(bx, by, a, len, w, depth) {
      var ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
      pen(ctx, 'rgba(210,240,255,0.95)', w);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + ex) / 2 + Math.sin(a * 3) * u, (by + ey) / 2, ex, ey); ctx.stroke();
      pen(ctx, 'rgba(255,255,255,0.9)', w * 0.35);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + ex) / 2 + Math.sin(a * 3) * u, (by + ey) / 2, ex, ey); ctx.stroke();
      if (depth > 0) { branch(ex, ey, a - 0.5, len * 0.65, w * 0.7, depth - 1); branch(ex, ey, a + 0.45, len * 0.6, w * 0.7, depth - 1); }
    }
    branch(x, y, -Math.PI / 2, 6 * u, 1.3 * u, 3);
    for (var s = 0; s < 4; s++) K.twinkle(ctx, x + (s - 1.5) * 4 * u, y - (8 + (s % 2) * 4) * u, 0.9 * u, t, s, 'rgba(230,248,255,0.95)');
  }

  /* ---------- Supercell ---------- */

  /* a wall cloud: a dark block lowering out of the storm's base, slowly turning */
  function wallcloud(ctx, W, H, t) {
    var x = W * (0.32 + K.J().dx * 0.2), top = H * 0.5, h = H * 0.15, w = W * 0.26;
    ctx.fillStyle = 'rgba(36,42,52,0.98)';
    ctx.fillRect(x - w * 1.1, top - H * 0.03, w * 2.2, H * 0.04);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.6, top);
    ctx.lineTo(x + w * 0.6, top);
    ctx.bezierCurveTo(x + w * 0.62, top + h * 0.5, x + w * 0.45, top + h * 0.95, x + w * 0.3, top + h);
    ctx.lineTo(x - w * 0.3, top + h);
    ctx.bezierCurveTo(x - w * 0.45, top + h * 0.95, x - w * 0.62, top + h * 0.5, x - w * 0.6, top);
    ctx.fill();
    // bands of cloud wrapping round it, turning
    for (var k = 0; k < 4; k++) {
      var yy = top + h * (0.18 + k * 0.22), sh = Math.sin(t * 0.8 + k) * w * 0.12, ww = w * (0.58 - k * 0.07);
      pen(ctx, 'rgba(140,150,170,0.55)', W / 170);
      ctx.beginPath(); ctx.moveTo(x - ww + sh, yy); ctx.quadraticCurveTo(x + sh * 0.5, yy + h * 0.08, x + ww + sh, yy - h * 0.02); ctx.stroke();
    }
    // scud below it, and the light behind
    ctx.fillStyle = 'rgba(90,100,116,0.85)';
    K.cloud(ctx, x - w * 0.5 + Math.sin(t * 0.5) * w * 0.1, top + h * 1.05, w * 0.18, 'rgba(90,100,116,0.85)');
    var g = ctx.createLinearGradient(0, top + h, 0, H * 0.86);
    g.addColorStop(0, 'rgba(200,220,200,0.25)');
    g.addColorStop(1, 'rgba(200,220,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w, top + h, w * 2, H * 0.86 - top - h);
  }


  /* the beaver's tail: a broad, flat band of cloud trailing off the storm */
  function beaver(ctx, W, H, t) {
    var y = H * (0.5 + K.J().dy * 0.3), x0 = W * 0.5, sh = Math.sin(t * 0.3) * W * 0.01;
    ctx.fillStyle = 'rgba(48,56,68,0.98)';
    ctx.beginPath();
    ctx.moveTo(x0 + sh, y - H * 0.035);
    ctx.quadraticCurveTo(W * 0.8 + sh, y - H * 0.05, W * 1.05, y - H * 0.03);
    ctx.lineTo(W * 1.05, y + H * 0.025);
    ctx.quadraticCurveTo(W * 0.8 + sh, y + H * 0.035, x0 + sh, y + H * 0.045);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(150,164,170,0.6)';
    ctx.beginPath();
    ctx.moveTo(x0 + sh, y + H * 0.045);
    ctx.quadraticCurveTo(W * 0.8 + sh, y + H * 0.035, W * 1.05, y + H * 0.025);
    ctx.lineTo(W * 1.05, y + H * 0.035);
    ctx.quadraticCurveTo(W * 0.8 + sh, y + H * 0.05, x0 + sh, y + H * 0.06);
    ctx.closePath();
    ctx.fill();
    pen(ctx, 'rgba(120,132,146,0.7)', W / 220);
    for (var k = 0; k < 3; k++) { var yy = y - H * 0.02 + k * H * 0.02; ctx.beginPath(); ctx.moveTo(x0 + W * 0.05 + sh, yy); ctx.quadraticCurveTo(W * 0.8, yy - H * 0.01, W, yy - H * 0.006); ctx.stroke(); }
  }


  /* the overshooting top: a dome of cloud bursting up through the anvil */
  function overshoot(ctx, W, H, t) {
    var x = W * (0.5 + K.J().dx * 0.3), y = H * 0.3, pulse = 1 + Math.sin(t * 0.7) * 0.04;
    var g = ctx.createRadialGradient(x - W * 0.04, y - H * 0.04, 0, x, y, W * 0.18 * pulse);
    g.addColorStop(0, 'rgba(255,246,232,0.98)');
    g.addColorStop(1, 'rgba(196,200,214,0.98)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y + H * 0.02, W * 0.16 * pulse, H * 0.08 * pulse, 0, Math.PI, TAU); ctx.fill();
    K.cloud(ctx, x - W * 0.14, y + H * 0.01, W * 0.08, 'rgba(232,230,236,0.98)');
    K.cloud(ctx, x + W * 0.02, y + H * 0.02, W * 0.07, 'rgba(220,220,230,0.98)');
  }

  /* a weather radar dome on the hill, its beam sweeping round */
  function radar(ctx, W, H, t) {
    var u = W / 56, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    ctx.fillStyle = '#C9CED8';
    poly(ctx, [x - 3 * u, y, x + 3 * u, y, x + 2 * u, y - 10 * u, x - 2 * u, y - 10 * u]); ctx.fill();
    pen(ctx, '#9AA4B8', 0.25 * u);
    for (var k = 1; k < 4; k++) seg(ctx, x - 3 * u + k * 0.3 * u, y - k * 2.6 * u, x + 3 * u - k * 0.3 * u, y - k * 2.6 * u);
    ctx.fillStyle = '#F6F7F9';
    circ(ctx, x, y - 14 * u, 5 * u); ctx.fill();
    pen(ctx, 'rgba(150,160,180,0.6)', 0.2 * u);
    for (var j = -1; j <= 1; j++) { ctx.beginPath(); ctx.ellipse(x, y - 14 * u, 5 * u, 1.6 * u * Math.abs(j * 2 + 0.01), 0, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(x, y - 14 * u, 2 * u, 5 * u, 0, 0, TAU); ctx.stroke();
    // the sweep
    var a = t * 1.2;
    var gr = ctx.createRadialGradient(x, y - 14 * u, 0, x, y - 14 * u, W * 0.4);
    gr.addColorStop(0, 'rgba(120,255,150,0.35)');
    gr.addColorStop(1, 'rgba(120,255,150,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(x, y - 14 * u); ctx.arc(x, y - 14 * u, W * 0.4, a, a + 0.35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,80,70,' + (0.5 + 0.5 * Math.sin(t * 3)) + ')';
    circ(ctx, x, y - 19.4 * u, 0.5 * u); ctx.fill();
  }

  /* a funnel cloud reaching down from the storm */
  function funnel(ctx, W, H, t) {
    var x = W * (0.72 + K.J().dx * 0.2), top = H * 0.46, len = H * (0.26 + 0.03 * Math.sin(t * 0.5));
    ctx.fillStyle = 'rgba(40,46,56,0.98)';
    ctx.fillRect(x - W * 0.18, top - H * 0.03, W * 0.36, H * 0.04);
    var g = ctx.createLinearGradient(x - W * 0.08, 0, x + W * 0.08, 0);
    g.addColorStop(0, 'rgba(28,32,40,0.98)');
    g.addColorStop(0.6, 'rgba(46,52,62,0.98)');
    g.addColorStop(1, 'rgba(80,88,100,0.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - W * 0.09, top);
    for (var i = 0; i <= 12; i++) { var f = i / 12, w = W * 0.09 * Math.pow(1 - f, 1.3) + W * 0.006, wob = Math.sin(f * 6 + t * 2) * W * 0.01 * f; ctx.lineTo(x + w + wob - f * f * W * 0.05, top + len * f); }
    for (var j = 12; j >= 0; j--) { var f2 = j / 12, w2 = W * 0.09 * Math.pow(1 - f2, 1.3) + W * 0.006, wob2 = Math.sin(f2 * 6 + t * 2) * W * 0.01 * f2; ctx.lineTo(x - w2 + wob2 - f2 * f2 * W * 0.05, top + len * f2); }
    ctx.closePath();
    ctx.fill();
    pen(ctx, 'rgba(170,180,190,0.6)', W / 300);
    for (var k = 1; k < 7; k++) { var f3 = k / 7, yy = top + len * f3, ww = W * 0.09 * Math.pow(1 - f3, 1.3) + W * 0.006; ctx.beginPath(); ctx.ellipse(x - f3 * f3 * W * 0.05 + Math.sin(f3 * 6 + t * 2) * W * 0.01 * f3, yy, ww, H * 0.005, 0, 0, Math.PI); ctx.stroke(); }
  }


  /* a weather balloon going up, its instrument swinging underneath */
  function sonde(ctx, W, H, t) {
    var u = W / 60, p = (t * 0.06) % 1, x = W * (0.6 + K.J().dx * 0.3) + Math.sin(t * 0.8) * 2 * u, y = H * (0.66 - p * 0.24);
    var s = 1 - p * 0.3;
    ctx.fillStyle = '#F4F2EE';
    ell(ctx, x, y, 5 * u * s, 5.6 * u * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ell(ctx, x - 1.6 * u * s, y - 2 * u * s, 1.2 * u * s, 1.8 * u * s, -0.3); ctx.fill();
    ctx.fillStyle = '#C9C3B6';
    tri(ctx, x - 0.8 * u * s, y + 5.4 * u * s, x + 0.8 * u * s, y + 5.4 * u * s, x, y + 6.4 * u * s); ctx.fill();
    var sw = Math.sin(t * 2) * 0.15;
    var bx = x + Math.sin(sw) * 9 * u * s, by = y + 6.4 * u * s + Math.cos(sw) * 9 * u * s;
    pen(ctx, 'rgba(255,255,255,0.8)', 0.18 * u);
    seg(ctx, x, y + 6.4 * u * s, bx, by);
    ctx.fillStyle = '#E8432F';
    ctx.fillRect(bx - 1.2 * u * s, by, 2.4 * u * s, 1.8 * u * s);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bx - 0.6 * u * s, by + 0.5 * u * s, 1.2 * u * s, 0.4 * u * s);
  }

  /* legendary: the mothership, a supercell carved into stacked layers like a giant disc */
  function mothership(ctx, W, H, t) {
    var x = W * (0.5 + K.J().dx * 0.2), y = H * 0.48, rot = t * 0.15;
    for (var i = 0; i < 6; i++) {
      var f = i / 5, ry = H * (0.05 - f * 0.004), rx = W * (0.44 - f * 0.12), yy = y - H * 0.025 * i;
      var c = Math.round(70 + i * 22);
      ctx.fillStyle = 'rgba(' + c + ',' + (c + 8) + ',' + (c + 30) + ',0.97)';
      ctx.beginPath(); ctx.ellipse(x, yy, rx, ry, 0, 0, TAU); ctx.fill();
      pen(ctx, 'rgba(230,236,255,0.35)', W / 300);
      ctx.beginPath(); ctx.ellipse(x, yy, rx * 0.98, ry * 0.9, 0, Math.PI * (0.1 + (rot % 0.2)), Math.PI * (0.9 + (rot % 0.2))); ctx.stroke();
    }
    var gr = ctx.createLinearGradient(0, y, 0, H * 0.88);
    gr.addColorStop(0, 'rgba(120,140,160,0.55)');
    gr.addColorStop(1, 'rgba(120,140,160,0.1)');
    ctx.fillStyle = gr;
    poly(ctx, [x - W * 0.1, y + H * 0.04, x + W * 0.1, y + H * 0.04, x + W * 0.14, H * 0.88, x - W * 0.14, H * 0.88]); ctx.fill();
    var fl = flash(t, 2.1, 0.5);
    if (fl) glow(ctx, x + W * 0.1, y, W * 0.2, [230, 236, 255], 0.5 * fl);
  }

  /* ---------- Thundersnow ---------- */

  /* the snow lit purple by the flash */
  function purpleflash(ctx, W, H, t) {
    var fl = flash(t, 2.8, 0.2);
    var g = ctx.createLinearGradient(0, H * 0.55, 0, H);
    g.addColorStop(0, 'rgba(190,150,255,0)');
    g.addColorStop(1, 'rgba(190,150,255,' + (0.2 + 0.6 * fl) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
    var rnd = K.rand(211);
    for (var i = 0; i < 18; i++) {
      var x = W * (0.1 + rnd() * 0.8), y = H * (0.6 + rnd() * 0.3);
      ctx.fillStyle = 'rgba(240,230,255,' + (0.4 + 0.6 * fl) + ')';
      circ(ctx, x, y, W * 0.006); ctx.fill();
    }
  }

  /* someone jumping for joy in the thundersnow */
  function joy(ctx, W, H, t) {
    var u = W / 56, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    var hop = Math.max(0, Math.sin(t * 3)) * 2.4 * u;
    K.person(ctx, x, y - hop, u, { pose: hop > 0.6 * u ? 'jump' : 'stand', coat: '#E8432F', legs: '#2C3550', hat: 'bobble', hatCol: '#F2C230', scarf: '#3E8ED8', arms: [2.7, 2.6] });
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (var k = 0; k < 6; k++) { var a = k / 6 * TAU + t, r = (6 + (t * 3 % 1) * 3) * u; star4(ctx, x + Math.cos(a) * r, y - 10 * u + Math.sin(a) * r * 0.6, 0.7 * u, 'rgba(255,255,255,0.75)'); }
  }

  /* a snowboarder in the air */
  function snowboard(ctx, W, H, t) {
    var u = W / 58, p = (t * 0.35) % 1, x = W * (0.25 + p * 0.5), y = H * 0.8 - Math.sin(p * Math.PI) * H * 0.16;
    ctx.fillStyle = '#EEF2F8';
    ctx.beginPath(); ctx.moveTo(0, H * 0.78); ctx.quadraticCurveTo(W * 0.3, H * 0.8, W * 0.5, H * 0.9); ctx.lineTo(W, H * 0.92); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(p * Math.PI) * 0.4 - 0.2);
    ctx.fillStyle = '#E8432F';
    rr(ctx, -5 * u, -0.5 * u, 10 * u, 1 * u, 0.5 * u); ctx.fill();
    K.person(ctx, 0, -0.4 * u, u, { pose: 'kneel', coat: '#3E8ED8', legs: '#2C3550', hat: 'beanie', hatCol: '#1E1E24', arms: [1.6, 2.1], lean: 0.2 });
    ctx.restore();
    pen(ctx, 'rgba(255,255,255,0.6)', 0.3 * u);
    for (var k = 1; k < 5; k++) { var q = Math.max(0, p - k * 0.03); seg(ctx, W * (0.25 + q * 0.5), H * 0.82 - Math.sin(q * Math.PI) * H * 0.16, W * (0.25 + q * 0.5) - u, H * 0.82 - Math.sin(q * Math.PI) * H * 0.16); }
  }

  /* a mountain goat on a snowy crag */
  function goat(ctx, W, H, t) {
    var u = W / 54, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    ctx.fillStyle = '#5A5E72';
    poly(ctx, [x - 11 * u, y + 1 * u, x - 6 * u, y - 7 * u, x + 2 * u, y - 8 * u, x + 9 * u, y - 4 * u, x + 12 * u, y + 1 * u]); ctx.fill();
    ctx.fillStyle = '#F2F4F8';
    poly(ctx, [x - 6.6 * u, y - 6 * u, x - 6 * u, y - 7 * u, x + 2 * u, y - 8 * u, x + 9 * u, y - 4 * u, x + 7 * u, y - 4 * u, x + 2 * u, y - 6.6 * u]); ctx.fill();
    var gt = K.beast(ctx, x - 1 * u, y - 7.4 * u, u, { col: '#F4F2EC', legCol: '#E0DCD2', rx: 3.2, ry: 2, leg: 2.8, lw: 0.9, neck: [0.4, -2], hr: 1.2, snout: [1.4, 0.8], ears: 'side', tail: 'short' });
    K.horns(ctx, gt, 'curly', '#2A2A30');
    ctx.fillStyle = '#F4F2EC';
    tri(ctx, gt.head[0] + 0.8 * u, gt.head[1] + 1 * u, gt.head[0] + 1.6 * u, gt.head[1] + 1 * u, gt.head[0] + 1.1 * u, gt.head[1] + 3 * u); ctx.fill();
    void t;
  }

  /* the flash mirrored in a frozen lake */
  function lakeflash(ctx, W, H, t) {
    var wy = H * 0.84, fl = glimmer(t, 2.8, 0.2);
    var g = ctx.createLinearGradient(0, wy, 0, H);
    g.addColorStop(0, 'rgba(170,170,220,0.95)');
    g.addColorStop(1, 'rgba(110,110,170,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, wy, W, H - wy);
    pen(ctx, 'rgba(255,255,255,0.4)', W / 300);
    seg(ctx, W * 0.2, wy + (H - wy) * 0.4, W * 0.45, wy + (H - wy) * 0.5);
    seg(ctx, W * 0.55, wy + (H - wy) * 0.7, W * 0.8, wy + (H - wy) * 0.6);
    var x = W * (0.58 + K.J().dx * 0.2);
    if (fl) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, wy, W, H - wy); ctx.clip();
      ctx.globalAlpha = fl;
      forkBolt(ctx, x, wy, x - W * 0.05, H, 333, W * 0.008, 1, 'rgba(240,230,255,0.95)');
      ctx.restore();
      ctx.fillStyle = 'rgba(230,220,255,' + 0.35 * fl + ')';
      ctx.fillRect(0, wy, W, H - wy);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(0, wy, W, Math.max(1, H * 0.004));
  }

  /* a polar bear plodding through the snow */
  function polarbear(ctx, W, H, t) {
    var u = W / 52, g = K.at(W, H, 0.5), x = g.x, y = g.y;
    var b = K.beast(ctx, x, y, u, { col: '#F2F0E8', legCol: '#E2DED2', rx: 5.4, ry: 2.9, leg: 2.6, lw: 1.8, neck: [1.2, -0.2], hr: 1.7, snout: [1.8, 1.1], ears: 'round', tail: 'none', nw: 2.2, walk: t * 0.3, nose: true });
    ctx.fillStyle = 'rgba(150,170,210,0.25)';
    ell(ctx, b.body[0] - 1 * u, b.body[1] + 1.4 * u, 4.4 * u, 1.2 * u); ctx.fill();
    ctx.fillStyle = '#1E1E24';
    circ(ctx, b.head[0] + 0.5 * u, b.head[1] - 0.4 * u, 0.3 * u); ctx.fill();
  }

  /* legendary: a snow globe with a little thundersnow storm inside */
  function snowglobe(ctx, W, H, t) {
    var u = W / 52, g = K.at(W, H, 0.5), x = g.x, y = g.y, r = 9 * u, cy = y - 3 * u - r;
    // the base
    ctx.fillStyle = '#6A3E2A';
    poly(ctx, [x - 7 * u, y, x + 7 * u, y, x + 5.4 * u, y - 3.4 * u, x - 5.4 * u, y - 3.4 * u]); ctx.fill();
    ctx.fillStyle = '#E8C24A';
    ctx.fillRect(x - 5.6 * u, y - 2.2 * u, 11.2 * u, 0.6 * u);
    // inside: a dark sky, a snowy hill, a tiny house, snow and a bolt
    ctx.save();
    circ(ctx, x, cy, r); ctx.clip();
    var sk = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    sk.addColorStop(0, '#3A3460');
    sk.addColorStop(1, '#8E88B8');
    ctx.fillStyle = sk;
    ctx.fillRect(x - r, cy - r, r * 2, r * 2);
    var fl = flash(t, 2.4);
    if (fl) { ctx.fillStyle = 'rgba(220,210,255,' + 0.45 * fl + ')'; ctx.fillRect(x - r, cy - r, r * 2, r * 2); pen(ctx, 'rgba(255,255,255,' + fl + ')', 0.4 * u); K.path(ctx, [x + 2 * u, cy - r * 0.7, x, cy - r * 0.2, x + 1.6 * u, cy - r * 0.1, x - 0.4 * u, cy + r * 0.3]); }
    ctx.fillStyle = '#F2F4FA';
    ell(ctx, x, cy + r * 0.85, r * 1.1, r * 0.45); ctx.fill();
    K.house(ctx, x - 2 * u, cy + r * 0.55, u * 0.45, { w: 9, h: 6, rh: 4, wall: '#E8DCC8', roof: '#B8423A', lit: true, snow: true });
    var rnd = K.rand(223);
    for (var i = 0; i < 18; i++) {
      var sx = x - r + rnd() * r * 2, sy = cy - r + ((rnd() * r * 2 + t * u * (1 + rnd())) % (r * 2));
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      circ(ctx, sx, sy, 0.3 * u); ctx.fill();
    }
    ctx.restore();
    // the glass
    pen(ctx, 'rgba(255,255,255,0.75)', 0.4 * u);
    circ(ctx, x, cy, r); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ell(ctx, x - r * 0.45, cy - r * 0.45, r * 0.2, r * 0.36, -0.6); ctx.fill();
  }

  /* ---------- Named Storm ---------- */

  /* a red weather warning sign */
  function warning(ctx, W, H, t) {
    var u = W / 54, g = K.at(W, H, 0.52), x = g.x, y = g.y;
    var wob = Math.sin(t * 5) * 0.06;
    pen(ctx, '#8A8E98', 0.7 * u);
    seg(ctx, x, y, x, y - 12 * u);
    ctx.save();
    ctx.translate(x, y - 12 * u);
    ctx.rotate(wob);
    ctx.fillStyle = '#E8302A';
    poly(ctx, [0, -10 * u, -8 * u, 3.4 * u, 8 * u, 3.4 * u]); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    poly(ctx, [0, -7 * u, -5.4 * u, 1.8 * u, 5.4 * u, 1.8 * u]); ctx.fill();
    ctx.fillStyle = '#1E1E24';
    rr(ctx, -0.7 * u, -4.6 * u, 1.4 * u, 3.6 * u, 0.6 * u); ctx.fill();
    circ(ctx, 0, 0.2 * u, 0.75 * u); ctx.fill();
    ctx.restore();
  }

  /* the storm on the weather map: isobars packed tight round a big L */
  function stormmap(ctx, W, H, t) {
    var cx = W * (0.5 + K.J().dx * 0.3), cy = H * 0.5;
    for (var i = 1; i <= 6; i++) {
      pen(ctx, 'rgba(255,255,255,' + (0.75 - i * 0.08) + ')', W / 240);
      ctx.beginPath();
      for (var k = 0; k <= 40; k++) { var a = k / 40 * TAU, r = W * 0.05 * i * (1 + 0.12 * Math.sin(a * 2 + i + t * 0.2)); var px = cx + Math.cos(a) * r * 1.1, py = cy + Math.sin(a) * r * 0.85; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.closePath();
      ctx.stroke();
    }
    // the cold front and warm front
    pen(ctx, '#3E8ED8', W / 150);
    ctx.beginPath(); ctx.moveTo(cx + W * 0.04, cy + H * 0.02); ctx.quadraticCurveTo(cx + W * 0.1, cy + H * 0.16, cx - W * 0.05, cy + H * 0.32); ctx.stroke();
    ctx.fillStyle = '#3E8ED8';
    for (var j = 0; j < 4; j++) { var f = (j + 0.5) / 4, fx = cx + W * 0.04 + (W * 0.02 - W * 0.09 * f) + Math.sin(f * 3) * W * 0.04, fy = cy + H * 0.02 + H * 0.3 * f; tri(ctx, fx, fy, fx + W * 0.03, fy + H * 0.008, fx + W * 0.008, fy + H * 0.025); ctx.fill(); }
    pen(ctx, '#E8432F', W / 150);
    ctx.beginPath(); ctx.moveTo(cx + W * 0.04, cy + H * 0.02); ctx.quadraticCurveTo(cx + W * 0.22, cy + H * 0.02, cx + W * 0.34, cy + H * 0.1); ctx.stroke();
    ctx.fillStyle = '#E8432F';
    for (var m = 0; m < 3; m++) { var mx = cx + W * (0.1 + m * 0.08), my = cy + H * (0.026 + m * 0.02); ctx.beginPath(); ctx.arc(mx, my, W * 0.014, Math.PI, TAU); ctx.fill(); }
    // the L
    pen(ctx, '#E8432F', W * 0.022);
    seg(ctx, cx - W * 0.03, cy - H * 0.05, cx - W * 0.03, cy + H * 0.03);
    seg(ctx, cx - W * 0.03, cy + H * 0.03, cx + W * 0.03, cy + H * 0.03);
  }

  /* the storm seen from space: a white spiral over the Earth, a satellite watching */
  function satellite(ctx, W, H, t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(6,8,20,0.96)');
    g.addColorStop(1, 'rgba(10,14,34,0.96)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    K.stars(ctx, 0, 0, W, H * 0.6, 30, 231, W / 400, t);
    // the Earth's curve
    var ex = W * 0.5, ey = H * 1.35, er = H * 0.72;
    var eg = ctx.createRadialGradient(ex, ey - er * 0.6, er * 0.2, ex, ey, er);
    eg.addColorStop(0, '#3E7AC8');
    eg.addColorStop(1, '#1E3A7A');
    ctx.fillStyle = eg;
    circ(ctx, ex, ey, er); ctx.fill();
    pen(ctx, 'rgba(140,200,255,0.6)', W * 0.012);
    circ(ctx, ex, ey, er + W * 0.005); ctx.stroke();
    // the spiral storm
    var sx = W * (0.5 + K.J().dx * 0.3), sy = H * 0.76, rot = t * 0.3;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, 0.55);
    for (var arm = 0; arm < 3; arm++) {
      pen(ctx, 'rgba(255,255,255,0.85)', W * 0.022);
      ctx.beginPath();
      for (var k = 0; k <= 24; k++) { var f = k / 24, a = rot + arm * TAU / 3 + f * 4, r = W * 0.02 + f * W * 0.2; if (k) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.stroke();
    }
    ctx.fillStyle = '#1E3A7A';
    circ(ctx, 0, 0, W * 0.018); ctx.fill();
    ctx.restore();
    // the satellite
    var u = W / 80, tx = W * 0.28, ty = H * 0.34 + Math.sin(t * 0.5) * u;
    ctx.fillStyle = '#C9A84A';
    ctx.fillRect(tx - 1.5 * u, ty - 1.5 * u, 3 * u, 3 * u);
    ctx.fillStyle = '#3E6AB8';
    ctx.fillRect(tx - 8 * u, ty - 1.2 * u, 5.6 * u, 2.4 * u);
    ctx.fillRect(tx + 2.4 * u, ty - 1.2 * u, 5.6 * u, 2.4 * u);
    pen(ctx, 'rgba(200,220,255,0.5)', 0.2 * u);
    for (var c = 1; c < 4; c++) { seg(ctx, tx - 8 * u + c * 1.4 * u, ty - 1.2 * u, tx - 8 * u + c * 1.4 * u, ty + 1.2 * u); seg(ctx, tx + 2.4 * u + c * 1.4 * u, ty - 1.2 * u, tx + 2.4 * u + c * 1.4 * u, ty + 1.2 * u); }
  }

  /* boats tossing on their moorings in the harbour */
  function harbour(ctx, W, H, t) {
    var u = W / 60, wy = H * 0.84;
    sea(ctx, W, H, wy, [46, 52, 84], t);
    ctx.fillStyle = '#5A5E6E';
    ctx.fillRect(W * 0.72, wy - 3 * u, W * 0.3, H - wy + 3 * u);
    ctx.fillStyle = '#6E7282';
    ctx.fillRect(W * 0.72, wy - 3.6 * u, W * 0.3, 1 * u);
    [[0.28, 0, '#E8432F'], [0.5, 1.6, '#F2C230']].forEach(function (b) {
      var rock = Math.sin(t * 2.2 + b[1]) * 0.25, bx = W * b[0], by = wy + 1.4 * u + Math.sin(t * 2 + b[1]) * 0.6 * u;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rock);
      ctx.fillStyle = b[2];
      ctx.beginPath(); ctx.moveTo(-5 * u, -1.6 * u); ctx.lineTo(5.4 * u, -2 * u); ctx.quadraticCurveTo(4 * u, 0.8 * u, 0, 0.8 * u); ctx.quadraticCurveTo(-4 * u, 0.8 * u, -5 * u, -1.6 * u); ctx.fill();
      pen(ctx, '#3A3E48', 0.35 * u);
      seg(ctx, 0, -1.8 * u, 0, -13 * u);
      pen(ctx, 'rgba(255,255,255,0.6)', 0.15 * u);
      seg(ctx, 0, -13 * u, 5 * u, -2 * u); seg(ctx, 0, -13 * u, -4.6 * u, -1.8 * u);
      ctx.restore();
    });
    // spray over the harbour wall
    var p = (t * 0.5) % 1, hh = Math.sin(p * Math.PI) * 10 * u;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ell(ctx, W * 0.72, wy - 3 * u - hh * 0.5, 3 * u, hh * 0.6 + 0.1); ctx.fill();
  }

  /* windows boarded up and taped against the storm */
  function batten(ctx, W, H, t) {
    var u = W / 58, g = K.at(W, H, 0.5, 0.2), x = g.x, y = g.y + 1 * u;
    ctx.fillStyle = '#D8CDBA';
    ctx.fillRect(x - 13 * u, y - 18 * u, 26 * u, 18 * u);
    ctx.fillStyle = '#4A3E4E';
    ctx.fillRect(x - 14 * u, y - 19.4 * u, 28 * u, 1.6 * u);
    [-6.5, 6.5].forEach(function (wx) {
      ctx.fillStyle = '#2A3048';
      ctx.fillRect(x + wx * u - 4 * u, y - 15 * u, 8 * u, 7 * u);
      ctx.fillStyle = '#C8A06A';
      for (var k = 0; k < 3; k++) { ctx.save(); ctx.translate(x + wx * u, y - 11.5 * u + (k - 1) * 2.4 * u); ctx.rotate((k - 1) * 0.12); ctx.fillRect(-4.8 * u, -0.8 * u, 9.6 * u, 1.6 * u); ctx.restore(); }
      ctx.fillStyle = '#8A6A3A';
      for (var n = -1; n <= 1; n++) { circ(ctx, x + wx * u - 4 * u, y - 11.5 * u + n * 2.4 * u, 0.25 * u); ctx.fill(); circ(ctx, x + wx * u + 4 * u, y - 11.5 * u + n * 2.4 * u, 0.25 * u); ctx.fill(); }
    });
    ctx.fillStyle = '#3A5A8A';
    rr(ctx, x - 2.2 * u, y - 8 * u, 4.4 * u, 8 * u, 0.5 * u); ctx.fill();
    pen(ctx, 'rgba(240,240,240,0.85)', 0.6 * u);
    seg(ctx, x - 1.8 * u, y - 7.4 * u, x + 1.8 * u, y - 4 * u); seg(ctx, x + 1.8 * u, y - 7.4 * u, x - 1.8 * u, y - 4 * u);
    var fl = Math.sin(t * 6) * 0.3 * u;
    ctx.fillStyle = '#E8432F';
    poly(ctx, [x + 13 * u, y - 14 * u, x + 17 * u + fl, y - 13 * u, x + 13 * u, y - 12 * u]); ctx.fill();
  }

  /* a hurricane hunter plane flying into the storm */
  function hunter(ctx, W, H, t) {
    var u = W / 70, x = W * (0.42 + K.J().dx * 0.3) + Math.sin(t * 0.5) * 2 * u, y = H * (0.48 + K.J().dy * 0.4) + Math.sin(t * 1.2) * u;
    var tilt = Math.sin(t * 1.5) * 0.08 - 0.1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.fillStyle = '#E8ECF2';
    ell(ctx, 0, 0, 12 * u, 1.8 * u); ctx.fill();
    ctx.fillStyle = '#D8432F';
    poly(ctx, [-10 * u, -1 * u, -13 * u, -6 * u, -11 * u, -6 * u, -8 * u, -1 * u]); ctx.fill();
    ctx.fillStyle = '#C9CED8';
    poly(ctx, [-1 * u, 0, 4 * u, 0, -2 * u, 9 * u, -4 * u, 9 * u]); ctx.fill();
    poly(ctx, [-1 * u, 0, 3 * u, 0, -2 * u, -5 * u, -3.6 * u, -5 * u]); ctx.fill();
    ctx.fillStyle = '#4A505C';
    [2.4, 5.6].forEach(function (e) { ctx.fillRect(-1.4 * u - e * 0.1 * u, e * u - 0.3 * u, 2.4 * u, 1.1 * u); });
    var sp = t * 30;
    pen(ctx, 'rgba(255,255,255,0.6)', 0.2 * u);
    [2.4, 5.6].forEach(function (e) { seg(ctx, 1.2 * u, e * u + Math.sin(sp) * u, 1.2 * u, e * u - Math.sin(sp) * u + 0.6 * u); });
    ctx.fillStyle = '#9CC9F0';
    ell(ctx, 10.4 * u, -0.6 * u, 1.4 * u, 0.6 * u); ctx.fill();
    ctx.fillStyle = '#D8432F';
    ctx.fillRect(-6 * u, -0.3 * u, 14 * u, 0.6 * u);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,80,70,' + (0.5 + 0.5 * Math.sin(t * 5)) + ')';
    circ(ctx, x - 2 * u, y + 9 * u, 0.5 * u); ctx.fill();
  }

  K.add('kennel', 'ground', kennel);
  K.add('cows', 'ground', cows);
  K.add('anvil', 'front', anvil);
  K.add('weatherhouse', 'ground', weatherhouse);
  K.add('pheasant', 'ground', pheasant);
  K.add('grumpycloud', 'front', grumpycloud);
  K.add('mammatus', 'front', mammatus);
  K.add('photographer', 'ground', photographer);
  K.add('litwindow', 'ground', litwindow);
  K.add('silhouettes', 'ground', silhouettes);
  K.add('spire', 'ground', spire);
  K.add('bluejet', 'front', bluejet);
  K.add('crawler', 'front', crawler);
  K.add('boltreflect', 'ground', boltreflect);
  K.add('chaser', 'ground', chaser);
  K.add('forked', 'front', forked);
  K.add('rod', 'ground', rod);
  K.add('powercut', 'ground', powercut);
  K.add('splittree', 'ground', splittree);
  K.add('seastrike', 'ground', seastrike);
  K.add('upward', 'ground', upward);
  K.add('fulgurite', 'ground', fulgurite);
  K.add('wallcloud', 'front', wallcloud);
  K.add('beaver', 'front', beaver);
  K.add('overshoot', 'front', overshoot);
  K.add('radar', 'ground', radar);
  K.add('funnel', 'front', funnel);
  K.add('sonde', 'front', sonde);
  K.add('mothership', 'front', mothership);
  K.add('purpleflash', 'ground', purpleflash);
  K.add('joy', 'ground', joy);
  K.add('snowboard', 'ground', snowboard);
  K.add('goat', 'ground', goat);
  K.add('lakeflash', 'ground', lakeflash);
  K.add('polarbear', 'ground', polarbear);
  K.add('snowglobe', 'ground', snowglobe);
  K.add('warning', 'ground', warning);
  K.add('stormmap', 'front', stormmap);
  K.add('satellite', 'front', satellite);
  K.add('harbour', 'ground', harbour);
  K.add('batten', 'ground', batten);
  K.add('hunter', 'front', hunter);
})(typeof window !== 'undefined' ? window : globalThis);
