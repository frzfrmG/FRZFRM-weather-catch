/* FRZFRM Weather Catch: the animals' jars. Each animal lives in a little room inside its jar: its everyday home, or
   one of four others, up to its favourite. A room is a wall, a floor, maybe a window, and a few things in it; the
   animal stands in front. Drawn with the kit in kit.js, in the jar's own space: the body runs from about 13% to 87%
   across and 30% to 97% down, the neck from 26% to 74% across above that. */
(function (root) {
  'use strict';
  var WC = root.WC = root.WC || {};
  var K = WC.kit;
  if (!K) return;
  var TAU = Math.PI * 2;
  var circ = K.circ, ell = K.ell, tri = K.tri, poly = K.poly, rr = K.rr, pen = K.pen, seg = K.seg, glow = K.glow, shade = K.shade, star4 = K.star4;
  var FY = 0.8; // the floor line, as a share of the height

  function rnd(seed) { var s = seed >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  /* stars dotted over part of a wall or a window, always in the same places */
  function stars(ctx, x0, y0, x1, y1, n, seed, s, t) {
    var r = rnd(seed);
    for (var i = 0; i < n; i++) {
      var x = x0 + (x1 - x0) * r(), y = y0 + (y1 - y0) * r(), k = 0.5 + 0.5 * Math.sin((t || 0) * 2 + i * 1.7);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.5 * k) + ')';
      circ(ctx, x, y, s * (0.5 + r() * 0.6)); ctx.fill();
    }
  }

  /* ---------- walls ---------- */
  function wall(ctx, W, H, kind, col, col2, t) {
    var fy = FY * H, i, x, y, r;
    var g = ctx.createLinearGradient(0, 0, 0, fy);
    g.addColorStop(0, shade(col, -0.08));
    g.addColorStop(1, shade(col, 0.06));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, fy);
    var u = W / 100;
    switch (kind) {
      case 'stripes':
        ctx.fillStyle = col2 || shade(col, 0.18);
        for (x = 0; x < W; x += 8 * u) ctx.fillRect(x, 0, 3 * u, fy);
        break;
      case 'dots':
        ctx.fillStyle = col2 || shade(col, 0.2);
        for (y = 4 * u, i = 0; y < fy; y += 7 * u, i++) for (x = (i % 2) * 3.5 * u; x < W; x += 7 * u) { circ(ctx, x, y, 1 * u); ctx.fill(); }
        break;
      case 'floral':
        for (y = 5 * u, i = 0; y < fy; y += 10 * u, i++) for (x = (i % 2) * 5 * u + 2 * u; x < W; x += 10 * u) {
          ctx.fillStyle = col2 || shade(col, -0.18);
          for (var p = 0; p < 5; p++) { circ(ctx, x + Math.cos(p * TAU / 5) * 1.3 * u, y + Math.sin(p * TAU / 5) * 1.3 * u, 0.9 * u); ctx.fill(); }
          ctx.fillStyle = 'rgba(255,240,180,0.9)'; circ(ctx, x, y, 0.6 * u); ctx.fill();
        }
        break;
      case 'damask':
        ctx.fillStyle = col2 || shade(col, 0.15);
        for (y = 6 * u, i = 0; y < fy; y += 12 * u, i++) for (x = (i % 2) * 6 * u + 3 * u; x < W; x += 12 * u) {
          poly(ctx, [x, y - 3.5 * u, x + 2.2 * u, y, x, y + 3.5 * u, x - 2.2 * u, y]); ctx.fill();
        }
        break;
      case 'planks':
        pen(ctx, shade(col, -0.22), 0.5 * u);
        for (y = 6 * u; y < fy; y += 6 * u) seg(ctx, 0, y, W, y);
        r = rnd(91);
        for (y = 0; y < fy; y += 6 * u) { x = r() * W; seg(ctx, x, y, x, y + 6 * u); x = (x + W * 0.5) % W; seg(ctx, x, y, x, y + 6 * u); }
        break;
      case 'logs':
        for (y = 3 * u; y < fy; y += 6.5 * u) {
          ctx.fillStyle = shade(col, -0.08); rr(ctx, -2 * u, y - 3 * u, W + 4 * u, 6 * u, 3 * u); ctx.fill();
          ctx.fillStyle = shade(col, 0.12); rr(ctx, -2 * u, y - 2.6 * u, W + 4 * u, 1.6 * u, 0.8 * u); ctx.fill();
        }
        break;
      case 'brick':
      case 'stone':
        var bw = kind === 'brick' ? 9 * u : 13 * u, bh = kind === 'brick' ? 4.5 * u : 8 * u;
        pen(ctx, col2 || shade(col, -0.25), 0.55 * u);
        for (y = 0, i = 0; y < fy; y += bh, i++) {
          seg(ctx, 0, y, W, y);
          for (x = (i % 2) * bw / 2; x < W; x += bw) seg(ctx, x, y, x, y + bh);
        }
        break;
      case 'tiles':
        pen(ctx, col2 || 'rgba(255,255,255,0.55)', 0.5 * u);
        for (y = 0; y < fy; y += 6 * u) seg(ctx, 0, y, W, y);
        for (x = 0; x < W; x += 6 * u) seg(ctx, x, 0, x, fy);
        break;
      case 'glass':
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        for (x = 0; x < W; x += 16 * u) ctx.fillRect(x + 2 * u, 0, 6 * u, fy);
        pen(ctx, col2 || 'rgba(255,255,255,0.75)', 0.8 * u);
        for (x = 0; x < W; x += 16 * u) seg(ctx, x, 0, x, fy);
        for (y = 14 * u; y < fy; y += 18 * u) seg(ctx, 0, y, W, y);
        break;
      case 'canvas':
        ctx.fillStyle = col2 || shade(col, -0.1);
        poly(ctx, [0, 0, W / 2, 0, 0, fy * 0.5]); ctx.fill();
        poly(ctx, [W, 0, W / 2, 0, W, fy * 0.5]); ctx.fill();
        pen(ctx, shade(col, -0.25), 0.6 * u);
        seg(ctx, W / 2, 0, W / 2, fy);
        break;
      case 'earth':
        ctx.fillStyle = col2 || shade(col, -0.15);
        r = rnd(17);
        for (i = 0; i < 24; i++) { ell(ctx, r() * W, r() * fy, (1 + r() * 2) * u, (0.6 + r()) * u, r() * 3); ctx.fill(); }
        pen(ctx, shade(col, -0.3), 0.6 * u);
        for (i = 0; i < 4; i++) {
          x = r() * W;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + (r() - 0.5) * 20 * u, 8 * u, x + (r() - 0.5) * 10 * u, 18 * u); ctx.stroke();
        }
        break;
      case 'leaves':
      case 'hedge':
        r = rnd(kind === 'hedge' ? 23 : 29);
        for (i = 0; i < 60; i++) {
          ctx.fillStyle = i % 3 ? shade(col, (r() - 0.5) * 0.4) : col2 || shade(col, 0.2);
          ell(ctx, r() * W, r() * fy, (kind === 'leaves' ? 3.5 : 2.4) * u, (kind === 'leaves' ? 1.5 : 1.8) * u, r() * 3); ctx.fill();
        }
        break;
      case 'bamboo':
        for (x = 2 * u; x < W; x += 9 * u) {
          ctx.fillStyle = shade(col, (x / W) * 0.1 - 0.05); ctx.fillRect(x, 0, 6 * u, fy);
          pen(ctx, shade(col, -0.25), 0.5 * u);
          for (y = 5 * u + (x % 3) * u; y < fy; y += 14 * u) seg(ctx, x, y, x + 6 * u, y);
        }
        break;
      case 'ice':
        pen(ctx, 'rgba(255,255,255,0.7)', 0.6 * u);
        for (y = 0, i = 0; y < fy; y += 9 * u, i++) {
          seg(ctx, 0, y, W, y);
          for (x = (i % 2) * 7 * u; x < W; x += 14 * u) seg(ctx, x, y, x, y + 9 * u);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        for (i = 0; i < 6; i++) { ctx.fillRect(i * 17 * u + 3 * u, 4 * u + (i % 3) * 20 * u, 6 * u, 1.2 * u); }
        break;
      case 'night':
        stars(ctx, 0, 0, W, fy * 0.9, 40, 61, 0.55 * u, t);
        break;
      case 'hex':
        // a honeycomb
        pen(ctx, col2 || shade(col, -0.2), 0.7 * u);
        var hs = 5 * u, hw = hs * Math.sqrt(3);
        for (y = 0, i = 0; y < fy + hs; y += hs * 1.5, i++) for (x = (i % 2) * hw / 2; x < W + hw; x += hw) {
          ctx.beginPath();
          for (var hk = 0; hk < 6; hk++) { var ha = Math.PI / 6 + hk * Math.PI / 3; ctx.lineTo(x + Math.cos(ha) * hs, y + Math.sin(ha) * hs); }
          ctx.closePath(); ctx.stroke();
        }
        break;
      case 'garden':
        // sky above a garden hedge
        var gs = ctx.createLinearGradient(0, 0, 0, fy);
        gs.addColorStop(0, shade(col, -0.1)); gs.addColorStop(1, shade(col, 0.4));
        ctx.fillStyle = gs; ctx.fillRect(0, 0, W, fy);
        K.cloud(ctx, W * 0.2, fy * 0.3, 6 * u, 'rgba(255,255,255,0.85)');
        K.cloud(ctx, W * 0.66, fy * 0.22, 5 * u, 'rgba(255,255,255,0.8)');
        ctx.fillStyle = col2 || '#4E8A44';
        ctx.fillRect(0, fy * 0.66, W, fy * 0.34);
        r = rnd(41);
        for (i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? shade(col2 || '#4E8A44', 0.1) : shade(col2 || '#4E8A44', -0.08); circ(ctx, i * W / 15, fy * 0.66 + (r() - 0.5) * 2 * u, 4.4 * u); ctx.fill(); }
        break;
      case 'bark':
        r = rnd(53);
        pen(ctx, col2 || shade(col, -0.22), 0.8 * u);
        for (i = 0; i < 14; i++) {
          x = r() * W;
          ctx.beginPath(); ctx.moveTo(x, 0);
          for (y = 0; y <= fy; y += 8 * u) ctx.lineTo(x + Math.sin(y / (9 * u) + i) * 1.6 * u, y);
          ctx.stroke();
        }
        ctx.fillStyle = shade(col, -0.25);
        ell(ctx, W * 0.22, fy * 0.6, 2 * u, 3 * u); ctx.fill();
        break;
      case 'bucket':
        // inside a bucket: ridges round it
        pen(ctx, col2 || shade(col, -0.18), 1 * u);
        for (y = 6 * u; y < fy; y += 9 * u) { ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(W / 2, y + 3 * u, W, y); ctx.stroke(); }
        var bg = ctx.createLinearGradient(0, 0, W, 0);
        bg.addColorStop(0, 'rgba(0,0,0,0.22)'); bg.addColorStop(0.3, 'rgba(0,0,0,0)'); bg.addColorStop(0.7, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,0.22)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, fy);
        break;
      case 'splash':
        // an artist's wall, splashed with paint
        r = rnd(67);
        ['#E74C3C', '#3498DB', '#F1C40F', '#2ECC71', '#9B59B6'].forEach(function (c, k) {
          ctx.fillStyle = c;
          for (var m = 0; m < 3; m++) { var sx = r() * W, sy = r() * fy * 0.9; circ(ctx, sx, sy, (0.8 + r()) * u); ctx.fill(); circ(ctx, sx + (r() - 0.5) * 4 * u, sy + (r() - 0.5) * 4 * u, 0.5 * u); ctx.fill(); }
        });
        break;
      case 'sky':
        K.cloud(ctx, W * 0.15, fy * 0.3, 7 * u, 'rgba(255,255,255,0.85)');
        K.cloud(ctx, W * 0.62, fy * 0.18, 6 * u, 'rgba(255,255,255,0.8)');
        K.cloud(ctx, W * 0.7, fy * 0.6, 8 * u, 'rgba(255,255,255,0.75)');
        break;
      case 'sea':
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        for (i = 0; i < 6; i++) { var bx = W * (0.1 + i * 0.16), by = fy * (0.9 - ((t * 0.08 + i * 0.17) % 1) * 0.9); circ(ctx, bx, by, (0.6 + (i % 3) * 0.4) * u); ctx.fill(); }
        break;
      case 'panels':
        pen(ctx, shade(col, -0.22), 0.6 * u);
        for (x = 3 * u; x < W; x += 16 * u) { rr(ctx, x, fy * 0.45, 12 * u, fy * 0.5, 1 * u); ctx.stroke(); rr(ctx, x, 4 * u, 12 * u, fy * 0.36, 1 * u); ctx.stroke(); }
        break;
      case 'curtain':
        for (x = 0; x < W; x += 6 * u) {
          var cg = ctx.createLinearGradient(x, 0, x + 6 * u, 0);
          cg.addColorStop(0, shade(col, -0.18)); cg.addColorStop(0.5, shade(col, 0.1)); cg.addColorStop(1, shade(col, -0.18));
          ctx.fillStyle = cg; ctx.fillRect(x, 0, 6 * u, fy);
        }
        break;
    }
  }
  /* a sloping attic ceiling, or a curved tower wall */
  function ceiling(ctx, W, H, kind, col) {
    var u = W / 100;
    if (kind === 'attic') {
      ctx.fillStyle = shade(col, -0.2);
      poly(ctx, [0, 0, W * 0.38, 0, 0, H * 0.42]); ctx.fill();
      poly(ctx, [W, 0, W * 0.62, 0, W, H * 0.42]); ctx.fill();
      pen(ctx, shade(col, -0.35), 1.6 * u);
      seg(ctx, 0, H * 0.42, W * 0.38, 0); seg(ctx, W, H * 0.42, W * 0.62, 0);
    } else if (kind === 'tower') {
      var g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.25, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * FY);
    } else if (kind === 'dome') {
      pen(ctx, 'rgba(255,255,255,0.18)', 0.6 * u);
      for (var i = 1; i < 5; i++) { ctx.beginPath(); ctx.ellipse(W / 2, H * FY, W * 0.12 * i, H * 0.62, 0, Math.PI, TAU); ctx.stroke(); }
    } else if (kind === 'awning') {
      for (var x = -W * 0.05, j = 0; x < W; x += 10 * u, j++) {
        ctx.fillStyle = j % 2 ? '#FFFFFF' : col;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 10 * u, 0); ctx.lineTo(x + 10 * u, H * 0.3); ctx.arc(x + 5 * u, H * 0.3, 5 * u, 0, Math.PI); ctx.closePath(); ctx.fill();
      }
    } else if (kind === 'stage') {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.3, 0); ctx.quadraticCurveTo(W * 0.18, H * 0.4, W * 0.24, H * FY); ctx.lineTo(0, H * FY); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W * 0.7, 0); ctx.quadraticCurveTo(W * 0.82, H * 0.4, W * 0.76, H * FY); ctx.lineTo(W, H * FY); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(col, -0.2);
      for (var k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(W * (k / 8), H * 0.16, W * 0.07, 0, Math.PI); ctx.fill(); }
      ctx.fillRect(0, 0, W, H * 0.16);
    }
  }

  /* ---------- floors ---------- */
  function floor(ctx, W, H, kind, col, col2, t) {
    var fy = FY * H, u = W / 100, x, y, i;
    var g = ctx.createLinearGradient(0, fy, 0, H);
    g.addColorStop(0, shade(col, 0.05)); g.addColorStop(1, shade(col, -0.2));
    ctx.fillStyle = g;
    ctx.fillRect(0, fy, W, H - fy);
    switch (kind) {
      case 'boards':
        pen(ctx, shade(col, -0.25), 0.5 * u);
        for (i = -12; i <= 12; i++) seg(ctx, W / 2 + i * 5 * u, fy, W / 2 + i * 9 * u, H);
        break;
      case 'tiles':
      case 'checker':
        var rows = 4;
        for (var rI = 0; rI < rows; rI++) {
          var y0 = fy + (H - fy) * Math.pow(rI / rows, 1.15), y1 = fy + (H - fy) * Math.pow((rI + 1) / rows, 1.15);
          for (i = -10; i < 10; i++) {
            if (kind === 'checker' ? (i + rI) % 2 === 0 : false) continue;
            var a0 = W / 2 + i * (6 + rI * 1.6) * u, a1 = W / 2 + (i + 1) * (6 + rI * 1.6) * u, b0 = W / 2 + i * (6 + (rI + 1) * 1.6) * u, b1 = W / 2 + (i + 1) * (6 + (rI + 1) * 1.6) * u;
            if (kind === 'checker') { ctx.fillStyle = col2 || '#F4F1EA'; poly(ctx, [a0, y0, a1, y0, b1, y1, b0, y1]); ctx.fill(); }
            else { pen(ctx, col2 || 'rgba(255,255,255,0.4)', 0.4 * u); poly(ctx, [a0, y0, a1, y0, b1, y1, b0, y1]); ctx.stroke(); }
          }
        }
        break;
      case 'carpet':
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        for (i = 0; i < 40; i++) ctx.fillRect((i * 37 % 100) * u, fy + (i * 17 % 20) / 20 * (H - fy), 0.8 * u, 0.8 * u);
        break;
      case 'grass':
        K.grass(ctx, 0, W, fy + 1.5 * u, 2.2 * u, shade(col, -0.25));
        K.grass(ctx, 1.2 * u, W, fy + 8 * u, 2.6 * u, shade(col, -0.18));
        break;
      case 'sand':
      case 'straw':
      case 'snow':
        ctx.fillStyle = kind === 'straw' ? shade(col, 0.25) : kind === 'snow' ? 'rgba(255,255,255,0.8)' : shade(col, -0.15);
        var rr2 = rnd(kind.length * 31);
        for (i = 0; i < (kind === 'straw' ? 26 : 40); i++) {
          x = rr2() * W; y = fy + rr2() * (H - fy);
          if (kind === 'straw') { pen(ctx, shade(col, 0.3 * (rr2() - 0.3)), 0.4 * u); seg(ctx, x, y, x + (rr2() - 0.5) * 6 * u, y + (rr2() - 0.5) * 2 * u); }
          else { circ(ctx, x, y, (0.3 + rr2() * 0.4) * u); ctx.fill(); }
        }
        break;
      case 'ice':
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (i = 0; i < 5; i++) { ell(ctx, W * (0.15 + i * 0.18), fy + (H - fy) * (0.3 + (i % 2) * 0.35), 7 * u, 0.8 * u, -0.1); ctx.fill(); }
        break;
      case 'water':
        pen(ctx, 'rgba(255,255,255,0.45)', 0.5 * u);
        for (i = 0; i < 5; i++) {
          y = fy + (H - fy) * (0.15 + i * 0.18);
          ctx.beginPath();
          for (x = 0; x <= W; x += 3 * u) ctx.lineTo(x, y + Math.sin(x / (5 * u) + t * 1.6 + i) * 0.5 * u);
          ctx.stroke();
        }
        break;
      case 'marble':
        pen(ctx, 'rgba(255,255,255,0.35)', 0.35 * u);
        for (i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo((i * 21 % 100) * u, fy); ctx.quadraticCurveTo((i * 29 % 100) * u, fy + (H - fy) * 0.6, (i * 13 % 100) * u, H); ctx.stroke(); }
        break;
      case 'stone':
        pen(ctx, shade(col, -0.25), 0.45 * u);
        for (i = 0; i < 4; i++) { y = fy + (H - fy) * i / 4; seg(ctx, 0, y, W, y); for (x = (i % 2) * 6 * u; x < W; x += 12 * u) seg(ctx, x, y, x - 2 * u, y + (H - fy) / 4); }
        break;
      case 'earth':
        ctx.fillStyle = shade(col, -0.12);
        for (i = 0; i < 18; i++) { ell(ctx, (i * 41 % 100) * u, fy + ((i * 23) % 17) / 17 * (H - fy), 1.4 * u, 0.6 * u, 0); ctx.fill(); }
        break;
      case 'cloud':
        for (i = 0; i < 7; i++) K.cloud(ctx, W * (i * 0.16 - 0.08), fy + 2 * u + (i % 2) * 3 * u, 6 * u, 'rgba(255,255,255,0.95)');
        break;
    }
    // where the wall meets the floor
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, fy - 0.6 * u, W, 1.2 * u);
  }

  /* ---------- windows ---------- */
  function windowView(ctx, x, y, w, h, view, t, u) {
    var sky = view === 'night' || view === 'nightsea' ? ['#0E1638', '#2A3A72'] : view === 'snow' ? ['#9FB6D6', '#E2EAF4'] : view === 'sunset' || view === 'lagoon' ? ['#7A6DC8', '#FFB27A'] : view === 'underwater' ? ['#1E6A9A', '#5FB8D8'] : view === 'desert' ? ['#6AA8E8', '#F2DDB0'] : view === 'rain' ? ['#6E7E94', '#B4C0CE'] : ['#5B9BE6', '#CFE6FB'];
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    if (view === 'sunny' || view === 'desert') { K.glow(ctx, x + w * 0.72, y + h * 0.3, w * 0.4, [255, 230, 150], 0.6); ctx.fillStyle = '#FFE27A'; circ(ctx, x + w * 0.72, y + h * 0.3, Math.min(w, h) * 0.12); ctx.fill(); }
    if (view === 'lagoon') {
      ctx.fillStyle = '#FFD27A'; circ(ctx, x + w * 0.5, y + h * 0.62, Math.min(w, h) * 0.14); ctx.fill();
      ctx.fillStyle = '#4AA0B8'; ctx.fillRect(x, y + h * 0.64, w, h * 0.36);
      pen(ctx, 'rgba(255,220,160,0.7)', 0.5 * u); seg(ctx, x + w * 0.38, y + h * 0.72, x + w * 0.62, y + h * 0.72); seg(ctx, x + w * 0.44, y + h * 0.82, x + w * 0.56, y + h * 0.82);
    }
    if (view === 'night' || view === 'nightsea') { stars(ctx, x, y, x + w, y + h * 0.7, 8, 7, 0.45 * u, t); K.moon(ctx, x + w * 0.7, y + h * 0.3, 2.4 * u, 'crescent', '#14204A'); }
    else if (view === 'sunny' || view === 'desert' || view === 'lagoon') { /* the sun is already in */ }
    else if (view === 'underwater') {
      ctx.fillStyle = 'rgba(255,160,80,0.9)';
      var fx = x + ((t * 4 * u) % (w + 6 * u)) - 3 * u;
      ell(ctx, fx, y + h * 0.4, 2 * u, 1.1 * u); ctx.fill(); tri(ctx, fx - 2 * u, y + h * 0.4, fx - 3.5 * u, y + h * 0.4 - 1.2 * u, fx - 3.5 * u, y + h * 0.4 + 1.2 * u); ctx.fill();
    } else K.cloud(ctx, x + w * 0.2, y + h * 0.3, 3 * u, 'rgba(255,255,255,0.9)');
    if (view === 'rain') {
      ctx.fillStyle = '#4A7A44'; ctx.fillRect(x, y + h * 0.66, w, h * 0.34);
      pen(ctx, 'rgba(230,240,255,0.7)', 0.35 * u);
      for (var rd = 0; rd < 14; rd++) { var rx0 = x + ((rd * 0.29 + t * 0.9) % 1) * w, ry0 = y + ((rd * 0.47 + t * 1.7) % 1) * h * 0.8; seg(ctx, rx0, ry0, rx0 - 0.8 * u, ry0 + 2.6 * u); }
    }
    if (view === 'garden') { ctx.fillStyle = '#4E8A44'; rr(ctx, x, y + h * 0.62, w, h * 0.38, 0); ctx.fill(); ctx.fillStyle = '#5FA050'; for (var i = 0; i < 4; i++) { circ(ctx, x + w * (0.1 + i * 0.27), y + h * 0.64, w * 0.16); ctx.fill(); } }
    if (view === 'sea' || view === 'nightsea') { ctx.fillStyle = view === 'sea' ? '#3E7FB8' : '#1A2E5A'; ctx.fillRect(x, y + h * 0.6, w, h * 0.4); pen(ctx, 'rgba(255,255,255,0.5)', 0.4 * u); seg(ctx, x + w * 0.2, y + h * 0.75, x + w * 0.4, y + h * 0.75); seg(ctx, x + w * 0.55, y + h * 0.88, x + w * 0.8, y + h * 0.88); }
    if (view === 'forest' || view === 'snow') { for (var j = 0; j < 4; j++) K.tree(ctx, x + w * (0.12 + j * 0.27), y + h, u * 0.55, { kind: 'pine', h: 14 + (j % 2) * 5, snow: view === 'snow', col: view === 'snow' ? '#3E6A58' : '#2F6A4A' }); }
    if (view === 'snow') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y + h * 0.85, w, h * 0.15); }
    if (view === 'jungle') { ctx.fillStyle = '#2F7A3A'; for (var l = 0; l < 6; l++) { ell(ctx, x + w * ((l * 0.37) % 1), y + h * (0.6 + (l % 3) * 0.15), w * 0.3, h * 0.12, l); ctx.fill(); } }
    if (view === 'desert') { ctx.fillStyle = '#E2B56A'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.quadraticCurveTo(x + w * 0.4, y + h * 0.5, x + w, y + h * 0.75); ctx.lineTo(x + w, y + h); ctx.fill(); }
    if (view === 'lake') { ctx.fillStyle = '#4A88B8'; ctx.fillRect(x, y + h * 0.68, w, h * 0.32); ctx.fillStyle = '#3E7A48'; ctx.beginPath(); ctx.moveTo(x, y + h * 0.7); ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.45, x + w * 0.6, y + h * 0.68); ctx.fill(); }
  }
  /* a window on the wall: square with a cross, round (a porthole), or arched. curtains: their colour */
  function win(ctx, W, H, o, t) {
    var u = W / 100, x = W * (o.x || 0.7), y = H * (o.y || 0.42), w = W * (o.w || 0.22), h = H * (o.h || 0.15);
    var frame = o.frame || '#F4EEE4';
    ctx.save();
    if (o.shape === 'round') { circ(ctx, x, y, w / 2); ctx.clip(); windowView(ctx, x - w / 2, y - w / 2, w, w, o.view, t, u); ctx.restore(); pen(ctx, frame, 2 * u); circ(ctx, x, y, w / 2); ctx.stroke(); pen(ctx, shade(frame, -0.3), 0.6 * u); circ(ctx, x, y, w / 2 + 1 * u); ctx.stroke(); return; }
    if (o.shape === 'arch') { ctx.beginPath(); ctx.moveTo(x - w / 2, y + h / 2); ctx.lineTo(x - w / 2, y - h / 2 + w / 2); ctx.arc(x, y - h / 2 + w / 2, w / 2, Math.PI, TAU); ctx.lineTo(x + w / 2, y + h / 2); ctx.closePath(); ctx.clip(); }
    else { ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); ctx.clip(); }
    windowView(ctx, x - w / 2, y - h / 2, w, h, o.view, t, u);
    ctx.restore();
    pen(ctx, frame, 1.6 * u);
    if (o.shape === 'arch') { ctx.beginPath(); ctx.moveTo(x - w / 2, y + h / 2); ctx.lineTo(x - w / 2, y - h / 2 + w / 2); ctx.arc(x, y - h / 2 + w / 2, w / 2, Math.PI, TAU); ctx.lineTo(x + w / 2, y + h / 2); ctx.closePath(); ctx.stroke(); }
    else { ctx.strokeRect(x - w / 2, y - h / 2, w, h); }
    pen(ctx, frame, 0.9 * u);
    seg(ctx, x, y - h / 2, x, y + h / 2); seg(ctx, x - w / 2, y, x + w / 2, y);
    ctx.fillStyle = shade(frame, -0.1);
    rr(ctx, x - w / 2 - 1.5 * u, y + h / 2, w + 3 * u, 1.6 * u, 0.5 * u); ctx.fill();
    if (o.curtains) {
      ctx.fillStyle = o.curtains;
      ctx.beginPath(); ctx.moveTo(x - w / 2 - 2.5 * u, y - h / 2 - 2 * u); ctx.lineTo(x - w / 2 + 3 * u, y - h / 2 - 2 * u); ctx.quadraticCurveTo(x - w / 2, y, x - w / 2 + 1 * u, y + h / 2 + 1 * u); ctx.lineTo(x - w / 2 - 2.5 * u, y + h / 2 + 1 * u); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w / 2 + 2.5 * u, y - h / 2 - 2 * u); ctx.lineTo(x + w / 2 - 3 * u, y - h / 2 - 2 * u); ctx.quadraticCurveTo(x + w / 2, y, x + w / 2 - 1 * u, y + h / 2 + 1 * u); ctx.lineTo(x + w / 2 + 2.5 * u, y + h / 2 + 1 * u); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(o.curtains, -0.25); ctx.fillRect(x - w / 2 - 3 * u, y - h / 2 - 3 * u, w + 6 * u, 1.2 * u);
    }
  }

  /* ---------- things in the rooms ----------
     Each stands on the floor at x (a share of the width), or hangs on the wall at x, y. o: its colours and options */
  var P = {};
  function fl(H) { return FY * H + 0.5; }
  P.rug = function (ctx, W, H, x, o) { var u = W / 100; ctx.fillStyle = o.c || '#B8483A'; ell(ctx, x * W, fl(H) + 9 * u, (o.w || 26) * u, 4.5 * u); ctx.fill(); pen(ctx, o.c2 || shade(o.c || '#B8483A', 0.3), 0.7 * u); ell(ctx, x * W, fl(H) + 9 * u, (o.w || 26) * u - 2.5 * u, 3 * u); ctx.stroke(); };
  P.armchair = function (ctx, W, H, x, o) {
    var u = W / 100, c = o.c || '#B5523D', X = x * W, Y = fl(H) + 3 * u, d = o.dir || 1;
    ctx.fillStyle = shade(c, -0.18); rr(ctx, X - 10 * u, Y - 24 * u, 20 * u, 18 * u, 5 * u); ctx.fill();
    ctx.fillStyle = c; rr(ctx, X - 11 * u, Y - 12 * u, 22 * u, 8 * u, 2.5 * u); ctx.fill();
    ctx.fillStyle = shade(c, 0.08); rr(ctx, X - 13 * u, Y - 15 * u, 5 * u, 11 * u, 2.4 * u); ctx.fill(); rr(ctx, X + 8 * u, Y - 15 * u, 5 * u, 11 * u, 2.4 * u); ctx.fill();
    ctx.fillStyle = '#5A3A22'; ctx.fillRect(X - 10 * u, Y - 4 * u, 1.6 * u, 4 * u); ctx.fillRect(X + 8.4 * u, Y - 4 * u, 1.6 * u, 4 * u);
    if (o.cushion) { ctx.fillStyle = o.cushion; rr(ctx, X - 5 * u + d * 2 * u, Y - 19 * u, 8 * u, 6 * u, 2 * u); ctx.fill(); }
  };
  P.sofa = function (ctx, W, H, x, o) {
    var u = W / 100, c = o.c || '#4E7FB8', X = x * W, Y = fl(H) + 3 * u, L = (o.w || 34) * u;
    ctx.fillStyle = shade(c, -0.15); rr(ctx, X - L / 2, Y - 21 * u, L, 14 * u, 4 * u); ctx.fill();
    ctx.fillStyle = c; rr(ctx, X - L / 2, Y - 11 * u, L, 7 * u, 2.5 * u); ctx.fill();
    ctx.fillStyle = shade(c, 0.1); rr(ctx, X - L / 2 - 2 * u, Y - 15 * u, 5 * u, 11 * u, 2.4 * u); ctx.fill(); rr(ctx, X + L / 2 - 3 * u, Y - 15 * u, 5 * u, 11 * u, 2.4 * u); ctx.fill();
    ctx.fillStyle = o.cushion || '#F2C14E'; rr(ctx, X - L / 2 + 4 * u, Y - 18 * u, 7 * u, 6 * u, 2 * u); ctx.fill(); rr(ctx, X + L / 2 - 11 * u, Y - 18 * u, 7 * u, 6 * u, 2 * u); ctx.fill();
    ctx.fillStyle = '#4A3020'; ctx.fillRect(X - L / 2 + 1 * u, Y - 4 * u, 1.6 * u, 4 * u); ctx.fillRect(X + L / 2 - 2.6 * u, Y - 4 * u, 1.6 * u, 4 * u);
  };
  P.bed = function (ctx, W, H, x, o) {
    var u = W / 100, c = o.c || '#6E8FD0', X = x * W, Y = fl(H) + 4 * u, L = (o.w || 36) * u;
    ctx.fillStyle = o.wood || '#8A5A36'; rr(ctx, X - L / 2 - 2 * u, Y - 22 * u, 4 * u, 22 * u, 1.5 * u); ctx.fill(); rr(ctx, X + L / 2 - 2 * u, Y - 15 * u, 4 * u, 15 * u, 1.5 * u); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; rr(ctx, X - L / 2, Y - 13 * u, L, 7 * u, 2 * u); ctx.fill();
    ctx.fillStyle = '#F4F4FA'; rr(ctx, X - L / 2 + 1 * u, Y - 17 * u, 10 * u, 5 * u, 2.4 * u); ctx.fill();
    ctx.fillStyle = c; rr(ctx, X - L / 2 + 9 * u, Y - 14 * u, L - 9 * u, 9 * u, 2 * u); ctx.fill();
    ctx.fillStyle = shade(c, 0.2);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 2; j++) { rr(ctx, X - L / 2 + 11 * u + i * (L - 13 * u) / 4, Y - 13 * u + j * 4 * u, 3 * u, 2.4 * u, 0.6 * u); ctx.fill(); }
  };
  P.table = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u, L = (o.w || 22) * u, top = Y - (o.h || 13) * u;
    ctx.fillStyle = o.wood || '#9A6A40';
    ctx.fillRect(X - L / 2 + 1.5 * u, top, 1.8 * u, Y - top); ctx.fillRect(X + L / 2 - 3.3 * u, top, 1.8 * u, Y - top);
    ctx.fillStyle = o.cloth || shade(o.wood || '#9A6A40', 0.1);
    rr(ctx, X - L / 2 - 1 * u, top - 1.5 * u, L + 2 * u, 2.6 * u, 0.8 * u); ctx.fill();
    if (o.cloth) { ctx.beginPath(); ctx.moveTo(X - L / 2 - 1 * u, top); ctx.lineTo(X - L / 2 - 2 * u, top + 5 * u); ctx.lineTo(X + L / 2 + 2 * u, top + 5 * u); ctx.lineTo(X + L / 2 + 1 * u, top); ctx.fill(); }
    var on = o.on || [];
    on.forEach(function (it, i) { var ix = X + (i - (on.length - 1) / 2) * (L / Math.max(2, on.length)); if (THINGS[it]) THINGS[it](ctx, ix, top - 1.5 * u, u, o); });
  };
  P.chair = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u, c = o.wood || '#8A5A36', d = o.dir || 1;
    pen(ctx, c, 1.4 * u);
    seg(ctx, X - d * 4 * u, Y, X - d * 4 * u, Y - 20 * u); seg(ctx, X + d * 4 * u, Y, X + d * 4 * u, Y - 9 * u);
    ctx.fillStyle = c; rr(ctx, X - 5 * u, Y - 10 * u, 10 * u, 2 * u, 0.6 * u); ctx.fill();
    seg(ctx, X - d * 4 * u, Y - 16 * u, X - d * 4 * u, Y - 20 * u);
    rr(ctx, X - d * 4 * u - 1 * u, Y - 21 * u, 2 * u, 10 * u, 0.8 * u); ctx.fill();
  };
  P.stool = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = fl(H) + 2 * u; pen(ctx, '#7A7E88', 1 * u); seg(ctx, X - 3 * u, Y, X - 1.5 * u, Y - 14 * u); seg(ctx, X + 3 * u, Y, X + 1.5 * u, Y - 14 * u); ctx.fillStyle = o.c || '#D8432F'; ell(ctx, X, Y - 14.5 * u, 5 * u, 1.6 * u); ctx.fill(); };
  P.lamp = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u, c = o.c || '#F2D58A';
    glow(ctx, X, Y - 30 * u, 14 * u, [255, 220, 150], 0.35);
    pen(ctx, '#3A3530', 0.9 * u); seg(ctx, X, Y, X, Y - 27 * u);
    ctx.fillStyle = '#3A3530'; ell(ctx, X, Y, 4 * u, 1 * u); ctx.fill();
    ctx.fillStyle = c; poly(ctx, [X - 5 * u, Y - 27 * u, X + 5 * u, Y - 27 * u, X + 3 * u, Y - 34 * u, X - 3 * u, Y - 34 * u]); ctx.fill();
  };
  P.bookshelf = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u, w = (o.w || 18) * u, h = (o.h || 40) * u, wood = o.wood || '#6E4528';
    ctx.fillStyle = wood; ctx.fillRect(X - w / 2, Y - h, w, h);
    ctx.fillStyle = shade(wood, -0.3); ctx.fillRect(X - w / 2 + 1 * u, Y - h + 1 * u, w - 2 * u, h - 2 * u);
    var cols = ['#C0392B', '#2E6DB4', '#E8B330', '#3E8E5A', '#8E44AD', '#E67E22', '#ECE4D0'], r = rnd(o.seed || 5), n = Math.max(2, Math.round(h / (9 * u)));
    for (var s = 0; s < n; s++) {
      var sy = Y - h + 1 * u + (s + 1) * (h - 2 * u) / n;
      ctx.fillStyle = wood; ctx.fillRect(X - w / 2, sy - 0.8 * u, w, 1.6 * u);
      for (var bx = X - w / 2 + 1.5 * u; bx < X + w / 2 - 2 * u;) { var bw = (1.4 + r() * 1.2) * u, bh = (h / n) * (0.55 + r() * 0.3); ctx.fillStyle = cols[Math.floor(r() * cols.length)]; ctx.fillRect(bx, sy - 0.8 * u - bh, bw, bh); bx += bw + 0.3 * u; }
    }
  };
  P.fireplace = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 1 * u, c = o.c || '#C9B9A2';
    ctx.fillStyle = c; ctx.fillRect(X - 15 * u, Y - 24 * u, 30 * u, 24 * u);
    ctx.fillStyle = shade(c, 0.12); ctx.fillRect(X - 17 * u, Y - 26 * u, 34 * u, 3 * u);
    ctx.fillStyle = '#2A1E1A'; rr(ctx, X - 9 * u, Y - 15 * u, 18 * u, 15 * u, 7 * u); ctx.fill();
    glow(ctx, X, Y - 5 * u, 16 * u, [255, 160, 60], 0.45 + 0.1 * Math.sin(t * 7));
    for (var i = 0; i < 3; i++) {
      var fx = X + (i - 1) * 3.5 * u, fh = (6 + 2 * Math.sin(t * 9 + i * 2)) * u;
      ctx.fillStyle = i === 1 ? '#FFD24A' : '#FF8A2A';
      ctx.beginPath(); ctx.moveTo(fx - 2.4 * u, Y - 1 * u); ctx.quadraticCurveTo(fx - 2 * u, Y - fh * 0.6, fx, Y - fh); ctx.quadraticCurveTo(fx + 2 * u, Y - fh * 0.6, fx + 2.4 * u, Y - 1 * u); ctx.fill();
    }
    ctx.fillStyle = '#5A3A22'; ctx.fillRect(X - 6 * u, Y - 1.5 * u, 12 * u, 1.5 * u);
    if (o.clock !== false) { ctx.fillStyle = '#7A5230'; rr(ctx, X - 3 * u, Y - 33 * u, 6 * u, 7 * u, 2 * u); ctx.fill(); ctx.fillStyle = '#F6F0E2'; circ(ctx, X, Y - 30.5 * u, 2 * u); ctx.fill(); pen(ctx, '#2A2A2A', 0.3 * u); seg(ctx, X, Y - 30.5 * u, X, Y - 32 * u); seg(ctx, X, Y - 30.5 * u, X + 1 * u, Y - 30.5 * u); }
    if (o.stockings) { ['#C0392B', '#2E8B57'].forEach(function (sc, i) { ctx.fillStyle = sc; var sx = X - 8 * u + i * 12 * u; rr(ctx, sx, Y - 23 * u, 3 * u, 6 * u, 0.6 * u); ctx.fill(); rr(ctx, sx, Y - 18.5 * u, 5 * u, 2.4 * u, 1 * u); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(sx - 0.3 * u, Y - 23.5 * u, 3.6 * u, 1.4 * u); }); }
  };
  P.plant = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u, s = o.s || 1;
    ctx.fillStyle = o.pot || '#C66B3D'; poly(ctx, [X - 4 * u * s, Y - 7 * u * s, X + 4 * u * s, Y - 7 * u * s, X + 3 * u * s, Y, X - 3 * u * s, Y]); ctx.fill();
    ctx.fillStyle = o.c || '#3E8E4A';
    for (var i = 0; i < 7; i++) { var a = -Math.PI / 2 + (i - 3) * 0.38; ell(ctx, X + Math.cos(a) * 6 * u * s, Y - 8 * u * s + Math.sin(a) * 6 * u * s, 4 * u * s, 1.6 * u * s, a); ctx.fill(); }
    if (o.flower) { ctx.fillStyle = o.flower; for (var j = 0; j < 3; j++) { circ(ctx, X + (j - 1) * 4 * u * s, Y - 14 * u * s - (j % 2) * 2 * u * s, 1.6 * u * s); ctx.fill(); } }
  };
  P.pots = function (ctx, W, H, x, o) { P.plant(ctx, W, H, x - 0.06, { s: 0.7, flower: '#E84A6A' }); P.plant(ctx, W, H, x + 0.04, { s: 0.85, flower: '#F2C230' }); };
  P.picture = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = (o.y || 0.4) * H, w = (o.w || 12) * u, h = (o.h || 9) * u;
    ctx.fillStyle = o.frame || '#C69A4A'; ctx.fillRect(X - w / 2 - 1.2 * u, Y - h / 2 - 1.2 * u, w + 2.4 * u, h + 2.4 * u);
    var g = ctx.createLinearGradient(0, Y - h / 2, 0, Y + h / 2); g.addColorStop(0, o.sky || '#8FC1EA'); g.addColorStop(1, '#E7F1F8');
    ctx.fillStyle = g; ctx.fillRect(X - w / 2, Y - h / 2, w, h);
    ctx.fillStyle = o.land || '#5E9A4E'; ctx.beginPath(); ctx.moveTo(X - w / 2, Y + h / 2); ctx.quadraticCurveTo(X, Y - h * 0.1, X + w / 2, Y + h * 0.2); ctx.lineTo(X + w / 2, Y + h / 2); ctx.fill();
    if (o.portrait) { ctx.fillStyle = '#3A2A20'; ctx.fillRect(X - w / 2, Y - h / 2, w, h); ctx.fillStyle = o.portrait; ell(ctx, X, Y + h * 0.2, w * 0.3, h * 0.35); ctx.fill(); circ(ctx, X, Y - h * 0.12, w * 0.18); ctx.fill(); }
  };
  P.shelf = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = (o.y || 0.42) * H, w = (o.w || 20) * u;
    ctx.fillStyle = o.wood || '#8A5A36'; ctx.fillRect(X - w / 2, Y, w, 1.6 * u);
    var items = o.items || ['jar', 'jar', 'pot'];
    items.forEach(function (it, i) { var ix = X - w / 2 + (i + 0.5) * w / items.length; if (THINGS[it]) THINGS[it](ctx, ix, Y, u, o, i); });
  };
  P.tools = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H);
    pen(ctx, '#8A6A4A', 1 * u); seg(ctx, X - 3 * u, Y - 2 * u, X - 3 * u, Y - 30 * u); seg(ctx, X + 3 * u, Y - 2 * u, X + 3 * u, Y - 28 * u);
    ctx.fillStyle = '#9AA3AE'; poly(ctx, [X - 6 * u, Y - 2 * u, X, Y - 2 * u, X - 1.5 * u, Y + 3 * u, X - 4.5 * u, Y + 3 * u]); ctx.fill();
    pen(ctx, '#7A8290', 0.7 * u); for (var i = 0; i < 5; i++) seg(ctx, X + 0.5 * u + i * 1.3 * u, Y - 28 * u, X + 0.5 * u + i * 1.3 * u, Y - 32 * u);
    seg(ctx, X + 0.3 * u, Y - 28 * u, X + 5.8 * u, Y - 28 * u);
  };
  P.can = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = fl(H) + 3 * u; ctx.fillStyle = o.c || '#3E8E5A'; rr(ctx, X - 4 * u, Y - 8 * u, 8 * u, 8 * u, 1.5 * u); ctx.fill(); pen(ctx, o.c || '#3E8E5A', 1 * u); seg(ctx, X + 3 * u, Y - 4 * u, X + 9 * u, Y - 10 * u); ctx.beginPath(); ctx.arc(X, Y - 8 * u, 3.4 * u, Math.PI, TAU); ctx.stroke(); };
  P.hay = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u, w = (o.w || 20) * u, h = (o.h || 12) * u;
    ctx.fillStyle = '#E2BE5A'; rr(ctx, X - w / 2, Y - h, w, h, 2 * u); ctx.fill();
    pen(ctx, '#C69A3A', 0.5 * u); for (var i = 1; i < 6; i++) seg(ctx, X - w / 2 + 1 * u, Y - h + i * h / 6, X + w / 2 - 1 * u, Y - h + i * h / 6 + (i % 2) * 0.6 * u);
    pen(ctx, '#8A5A2A', 0.6 * u); seg(ctx, X - w * 0.25, Y - h, X - w * 0.25, Y); seg(ctx, X + w * 0.25, Y - h, X + w * 0.25, Y);
  };
  P.lantern = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = o.hang ? (o.y || 0.3) * H : fl(H) + 2 * u;
    if (o.hang) { pen(ctx, '#3A3530', 0.5 * u); seg(ctx, X, 0, X, Y - 9 * u); }
    glow(ctx, X, Y - 5 * u, 12 * u, [255, 210, 120], 0.45 + 0.08 * Math.sin(t * 5));
    ctx.fillStyle = '#3A3530'; rr(ctx, X - 3 * u, Y - 2 * u, 6 * u, 2 * u, 0.5 * u); ctx.fill(); rr(ctx, X - 2.4 * u, Y - 10 * u, 4.8 * u, 1.6 * u, 0.6 * u); ctx.fill();
    ctx.fillStyle = '#FFD87A'; ctx.fillRect(X - 2 * u, Y - 8.5 * u, 4 * u, 6.5 * u);
    pen(ctx, '#3A3530', 0.4 * u); seg(ctx, X, Y - 8.5 * u, X, Y - 2 * u);
  };
  P.lights = function (ctx, W, H, x, o, t) {
    var u = W / 100, y0 = (o.y || 0.3) * H, cols = o.cols || ['#FFE3A6', '#FFB547', '#FF94A8', '#8FD3FF', '#9BF0C4'];
    pen(ctx, '#3A3A3A', 0.4 * u);
    ctx.beginPath(); ctx.moveTo(0, y0 - 4 * u); ctx.quadraticCurveTo(W * 0.25, y0 + 6 * u, W * 0.5, y0 - 2 * u); ctx.quadraticCurveTo(W * 0.75, y0 + 6 * u, W, y0 - 4 * u); ctx.stroke();
    for (var i = 0; i < 12; i++) {
      var f = (i + 0.5) / 12, xx = f * W, half = f < 0.5 ? f * 2 : (f - 0.5) * 2, yy = y0 - 4 * u + (f < 0.5 ? 0 : 2 * u) + 10 * u * half * (1 - half) * 1.6;
      var tw = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7);
      glow(ctx, xx, yy + 1 * u, 3 * u, [255, 230, 160], 0.4 * tw);
      ctx.fillStyle = cols[i % cols.length]; circ(ctx, xx, yy + 1 * u, 1 * u); ctx.fill();
    }
  };
  P.bunting = function (ctx, W, H, x, o) {
    var u = W / 100, y0 = (o.y || 0.27) * H, cols = o.cols || ['#E74C3C', '#F1C40F', '#3498DB', '#2ECC71', '#FFFFFF'];
    pen(ctx, '#5A5A5A', 0.4 * u);
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.quadraticCurveTo(W / 2, y0 + 8 * u, W, y0); ctx.stroke();
    for (var i = 0; i < 10; i++) { var f = (i + 0.5) / 10, xx = f * W, yy = y0 + 8 * u * 4 * f * (1 - f) * 0.5; ctx.fillStyle = cols[i % cols.length]; tri(ctx, xx - 2.4 * u, yy, xx + 2.4 * u, yy, xx, yy + 5 * u); ctx.fill(); }
  };
  P.chandelier = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = (o.y || 0.3) * H;
    pen(ctx, '#C9A44A', 0.6 * u); seg(ctx, X, 0, X, Y - 4 * u);
    glow(ctx, X, Y, 18 * u, [255, 230, 170], 0.35);
    ctx.fillStyle = '#D9B45A'; ell(ctx, X, Y, 10 * u, 2 * u); ctx.fill();
    for (var i = -2; i <= 2; i++) { ctx.fillStyle = '#FFF2C8'; rr(ctx, X + i * 4.5 * u - 0.6 * u, Y - 4 * u, 1.2 * u, 3 * u, 0.4 * u); ctx.fill(); ctx.fillStyle = '#FFD24A'; circ(ctx, X + i * 4.5 * u, Y - 4.8 * u, 0.7 * u + 0.15 * u * Math.sin(t * 6 + i)); ctx.fill(); }
    for (var j = -3; j <= 3; j++) { ctx.fillStyle = 'rgba(220,240,255,0.85)'; tri(ctx, X + j * 3 * u - 0.8 * u, Y + 1.8 * u, X + j * 3 * u + 0.8 * u, Y + 1.8 * u, X + j * 3 * u, Y + 5 * u); ctx.fill(); }
  };
  P.pillar = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 1 * u, c = o.c || '#EDE6D8';
    ctx.fillStyle = c; ctx.fillRect(X - 3.5 * u, 0, 7 * u, Y);
    ctx.fillStyle = shade(c, -0.12); for (var i = -2; i <= 2; i++) ctx.fillRect(X + i * 1.4 * u - 0.3 * u, 0, 0.6 * u, Y);
    ctx.fillStyle = shade(c, 0.05); ctx.fillRect(X - 5 * u, Y - 3 * u, 10 * u, 3 * u);
  };
  P.curtains = function (ctx, W, H, x, o) {
    var u = W / 100, c = o.c || '#A3263A';
    [[0, 1], [W, -1]].forEach(function (s) {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(s[0], 0); ctx.lineTo(s[0] + s[1] * 34 * u, 0); ctx.quadraticCurveTo(s[0] + s[1] * 19 * u, H * 0.42, s[0] + s[1] * 25 * u, H * FY); ctx.lineTo(s[0], H * FY); ctx.closePath(); ctx.fill();
      pen(ctx, shade(c, -0.25), 0.6 * u);
      for (var k = 1; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(s[0] + s[1] * (16 + k * 4) * u, 0); ctx.quadraticCurveTo(s[0] + s[1] * (13 + k * 2) * u, H * 0.42, s[0] + s[1] * (15 + k * 3) * u, H * FY); ctx.stroke(); }
      ctx.fillStyle = '#E2B84A'; rr(ctx, s[0] + s[1] * 20 * u - 2 * u, H * 0.52, 4 * u, 1.6 * u, 0.6 * u); ctx.fill();
    });
  };
  /* a bath. part: 'back' (the far rim, the taps and the water) or 'front' (the side, feet and bubbles), so an animal
     can sit in it between the two; both when it's left out */
  P.bath = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 5 * u, L = (o.w || 40) * u, c = o.c || '#FFFFFF';
    if (o.part !== 'front') {
      pen(ctx, '#B8BEC8', 1 * u); ctx.beginPath(); ctx.moveTo(X + L / 2 - 4 * u, Y - 13 * u); ctx.lineTo(X + L / 2 - 4 * u, Y - 20 * u); ctx.lineTo(X + L / 2 - 8 * u, Y - 20 * u); ctx.stroke();
      ctx.fillStyle = shade(c, -0.12); rr(ctx, X - L / 2, Y - 15 * u, L, 4 * u, 2 * u); ctx.fill();
      ctx.fillStyle = 'rgba(150,205,235,0.9)'; ell(ctx, X, Y - 12.6 * u, L / 2 - 1.6 * u, 1.6 * u); ctx.fill();
    }
    if (o.part === 'back') return;
    ctx.fillStyle = c; rr(ctx, X - L / 2, Y - 13 * u, L, 11 * u, 5.5 * u); ctx.fill();
    ctx.fillStyle = shade(c, -0.08); rr(ctx, X - L / 2 + 1 * u, Y - 5 * u, L - 2 * u, 3 * u, 2 * u); ctx.fill();
    ctx.fillStyle = '#C9A44A'; ctx.fillRect(X - L / 2 + 3 * u, Y - 2 * u, 2 * u, 2.4 * u); ctx.fillRect(X + L / 2 - 5 * u, Y - 2 * u, 2 * u, 2.4 * u);
    if (o.bubbles !== false) {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      for (var i = 0; i < 9; i++) { circ(ctx, X - L / 2 + 4 * u + i * (L - 8 * u) / 8, Y - 13 * u - (i % 3) * 1.2 * u, (2.2 + (i % 2) * 0.8) * u); ctx.fill(); }
      for (var j = 0; j < 4; j++) { var p = (t * 0.3 + j * 0.25) % 1; pen(ctx, 'rgba(200,225,255,' + (0.8 * (1 - p)) + ')', 0.35 * u); circ(ctx, X - L / 4 + j * 5 * u, Y - 18 * u - p * 22 * u, 1.3 * u); ctx.stroke(); }
    }
    if (o.duck) { ctx.fillStyle = '#F7C928'; ell(ctx, X + L / 2 - 12 * u, Y - 15.5 * u, 2.6 * u, 1.8 * u); ctx.fill(); circ(ctx, X + L / 2 - 10.6 * u, Y - 17.8 * u, 1.4 * u); ctx.fill(); ctx.fillStyle = '#F07A20'; tri(ctx, X + L / 2 - 9.4 * u, Y - 18 * u, X + L / 2 - 7.8 * u, Y - 17.6 * u, X + L / 2 - 9.4 * u, Y - 17.2 * u); ctx.fill(); }
  };
  P.pool = function (ctx, W, H, x, o, t) {
    var u = W / 100, fy = fl(H), g = ctx.createLinearGradient(0, fy, 0, H);
    g.addColorStop(0, o.c || '#4FB4D8'); g.addColorStop(1, shade(o.c || '#4FB4D8', -0.3));
    ctx.fillStyle = g; ctx.fillRect(0, fy + (o.from || 4) * u, W, H);
    pen(ctx, 'rgba(255,255,255,0.6)', 0.5 * u);
    for (var i = 0; i < 4; i++) { var y = fy + (o.from || 4) * u + 3 * u + i * 4 * u; ctx.beginPath(); for (var xx = 0; xx <= W; xx += 3 * u) ctx.lineTo(xx, y + Math.sin(xx / (4 * u) + t * 2 + i) * 0.6 * u); ctx.stroke(); }
    if (o.edge !== false) { ctx.fillStyle = o.edgeC || '#E8EEF2'; ctx.fillRect(0, fy, W, (o.from || 4) * u); }
  };
  P.ring = function (ctx, W, H, x, o, t) { var u = W / 100, X = x * W, Y = fl(H) + 12 * u + Math.sin(t * 2) * 0.5 * u; ctx.strokeStyle = o.c || '#FF6B6B'; ctx.lineWidth = 3 * u; ell(ctx, X, Y, 6 * u, 2.2 * u); ctx.stroke(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3 * u; ctx.setLineDash([2.5 * u, 4 * u]); ell(ctx, X, Y, 6 * u, 2.2 * u); ctx.stroke(); ctx.setLineDash([]); };
  P.ladder = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = fl(H) + 6 * u; pen(ctx, '#B8BEC8', 1 * u); ctx.beginPath(); ctx.moveTo(X - 3 * u, Y); ctx.lineTo(X - 3 * u, Y - 14 * u); ctx.arc(X - 1 * u, Y - 14 * u, 2 * u, Math.PI, TAU); ctx.moveTo(X + 3 * u, Y); ctx.lineTo(X + 3 * u, Y - 14 * u); ctx.arc(X + 5 * u, Y - 14 * u, 2 * u, Math.PI, TAU); ctx.stroke(); for (var i = 0; i < 3; i++) seg(ctx, X - 3 * u, Y - 3 * u - i * 4 * u, X + 3 * u, Y - 3 * u - i * 4 * u); };
  P.towel = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = (o.y || 0.45) * H; pen(ctx, '#B8BEC8', 0.8 * u); seg(ctx, X - 7 * u, Y, X + 7 * u, Y); ctx.fillStyle = o.c || '#F28AA0'; rr(ctx, X - 5 * u, Y, 10 * u, 12 * u, 1 * u); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(X - 5 * u, Y + 9 * u, 10 * u, 1 * u); };
  P.mirror = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = (o.y || 0.42) * H; ctx.fillStyle = o.frame || '#C9A44A'; ell(ctx, X, Y, 7 * u, 9 * u); ctx.fill(); var g = ctx.createLinearGradient(X - 6 * u, Y - 8 * u, X + 6 * u, Y + 8 * u); g.addColorStop(0, '#E8F2FA'); g.addColorStop(1, '#A8C2D8'); ctx.fillStyle = g; ell(ctx, X, Y, 5.8 * u, 7.8 * u); ctx.fill(); pen(ctx, 'rgba(255,255,255,0.8)', 0.6 * u); seg(ctx, X - 2 * u, Y - 4 * u, X + 1 * u, Y - 6 * u); };
  P.barre = function (ctx, W, H, x, o) { var u = W / 100, Y = (o.y || 0.62) * H; pen(ctx, '#C9A07A', 1.4 * u); seg(ctx, W * 0.05, Y, W * 0.95, Y); pen(ctx, '#8A8E98', 0.8 * u); for (var i = 0; i < 3; i++) seg(ctx, W * (0.15 + i * 0.35), Y, W * (0.15 + i * 0.35), Y - 6 * u); };
  P.easel = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u;
    pen(ctx, '#8A5A36', 1.1 * u); seg(ctx, X - 7 * u, Y, X, Y - 32 * u); seg(ctx, X + 7 * u, Y, X, Y - 32 * u); seg(ctx, X, Y - 32 * u, X + 2 * u, Y);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(X - 8 * u, Y - 30 * u, 16 * u, 13 * u);
    ctx.fillStyle = o.c || '#7EC8E3'; ctx.fillRect(X - 7 * u, Y - 29 * u, 14 * u, 6 * u);
    ctx.fillStyle = '#F2C230'; circ(ctx, X + 3 * u, Y - 26 * u, 1.8 * u); ctx.fill();
    ctx.fillStyle = '#5FA050'; ctx.fillRect(X - 7 * u, Y - 23 * u, 14 * u, 5 * u);
    ctx.fillStyle = '#8A5A36'; ctx.fillRect(X - 9 * u, Y - 17.5 * u, 18 * u, 1.4 * u);
  };
  P.paints = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = fl(H) + 4 * u; ['#E74C3C', '#3498DB', '#F1C40F'].forEach(function (c, i) { ctx.fillStyle = '#DADDE2'; rr(ctx, X + (i - 1) * 5 * u - 2 * u, Y - 4 * u, 4 * u, 4 * u, 0.8 * u); ctx.fill(); ctx.fillStyle = c; ell(ctx, X + (i - 1) * 5 * u, Y - 4 * u, 2 * u, 0.7 * u); ctx.fill(); }); };
  P.piano = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u, c = o.c || '#2A2228';
    ctx.fillStyle = c; rr(ctx, X - 13 * u, Y - 26 * u, 26 * u, 22 * u, 1.5 * u); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(X - 12 * u, Y - 14 * u, 24 * u, 3.4 * u);
    ctx.fillStyle = '#111'; for (var i = 0; i < 11; i++) if (i % 7 !== 2 && i % 7 !== 6) ctx.fillRect(X - 11.2 * u + i * 2.2 * u, Y - 14 * u, 1.2 * u, 2 * u);
    ctx.fillStyle = c; ctx.fillRect(X - 12 * u, Y - 4 * u, 2 * u, 4 * u); ctx.fillRect(X + 10 * u, Y - 4 * u, 2 * u, 4 * u);
    ctx.fillStyle = '#F6F0E2'; ctx.fillRect(X - 4 * u, Y - 23 * u, 8 * u, 6 * u);
  };
  P.notes = function (ctx, W, H, x, o, t) { var u = W / 100; for (var i = 0; i < 3; i++) { var p = (t * 0.25 + i / 3) % 1; K.note(ctx, W * (x + i * 0.06), H * (0.55 - p * 0.25), 3 * u, 'rgba(40,40,60,' + (1 - p) + ')'); } };
  P.gramophone = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = (o.y || 0.62) * H; ctx.fillStyle = '#7A4A28'; ctx.fillRect(X - 6 * u, Y - 4 * u, 12 * u, 4 * u); ctx.fillStyle = '#C9A44A'; ctx.beginPath(); ctx.moveTo(X, Y - 4 * u); ctx.lineTo(X + 2 * u, Y - 10 * u); ctx.quadraticCurveTo(X + 9 * u, Y - 22 * u, X + 12 * u, Y - 16 * u); ctx.quadraticCurveTo(X + 6 * u, Y - 12 * u, X + 3 * u, Y - 8 * u); ctx.closePath(); ctx.fill(); };
  P.telescope = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u;
    pen(ctx, '#3A3E48', 1 * u); seg(ctx, X, Y - 14 * u, X - 6 * u, Y); seg(ctx, X, Y - 14 * u, X + 6 * u, Y); seg(ctx, X, Y - 14 * u, X, Y);
    ctx.save(); ctx.translate(X, Y - 15 * u); ctx.rotate(-0.6);
    ctx.fillStyle = o.c || '#C9A44A'; rr(ctx, -10 * u, -2.4 * u, 22 * u, 4.8 * u, 1.4 * u); ctx.fill();
    ctx.fillStyle = shade(o.c || '#C9A44A', -0.25); ctx.fillRect(9 * u, -2.8 * u, 3 * u, 5.6 * u);
    ctx.restore();
  };
  P.globe = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = (o.y || 0.66) * H; ctx.fillStyle = '#7A5230'; ctx.fillRect(X - 3 * u, Y + 4 * u, 6 * u, 1.2 * u); pen(ctx, '#C9A44A', 0.6 * u); ctx.beginPath(); ctx.arc(X, Y, 5.4 * u, -1.2, 2.2); ctx.stroke(); ctx.fillStyle = '#4A88C8'; circ(ctx, X, Y, 4.4 * u); ctx.fill(); ctx.fillStyle = '#5FA050'; ell(ctx, X - 1 * u, Y - 1 * u, 2 * u, 1.4 * u, 0.4); ctx.fill(); ell(ctx, X + 2 * u, Y + 2 * u, 1.4 * u, 1 * u); ctx.fill(); };
  P.disco = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = (o.y || 0.3) * H;
    pen(ctx, '#888', 0.4 * u); seg(ctx, X, 0, X, Y - 6 * u);
    var cols = ['#FF5AA0', '#5AD8FF', '#FFE45A', '#8AFF7A', '#B07AFF'];
    for (var i = 0; i < 9; i++) { var a = t * 0.8 + i * 0.7, hc = cols[i % cols.length]; glow(ctx, W * (0.5 + 0.45 * Math.cos(a)), H * (0.5 + 0.3 * Math.sin(a * 1.3)), 4 * u, [parseInt(hc.slice(1, 3), 16), parseInt(hc.slice(3, 5), 16), parseInt(hc.slice(5, 7), 16)], 0.5); }
    ctx.fillStyle = '#C8CCD6'; circ(ctx, X, Y, 6 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (var j = 0; j < 8; j++) { var b = j * 0.8 + t * 1.5; if (Math.sin(b) > 0.3) ctx.fillRect(X + Math.cos(j * 2.3) * 3.5 * u, Y + Math.sin(j * 1.7) * 3.5 * u, 1.2 * u, 1.2 * u); }
    pen(ctx, 'rgba(90,90,110,0.5)', 0.3 * u); circ(ctx, X, Y, 6 * u); ctx.stroke(); seg(ctx, X - 6 * u, Y, X + 6 * u, Y); ctx.beginPath(); ctx.ellipse(X, Y, 3 * u, 6 * u, 0, 0, TAU); ctx.stroke();
  };
  P.glowfloor = function (ctx, W, H, x, o, t) { var u = W / 100, fy = fl(H), cols = [[255, 90, 160], [90, 216, 255], [255, 228, 90], [138, 255, 122]]; for (var i = 0; i < 8; i++) { var on = Math.sin(t * 3 + i * 1.9) > 0; if (!on) continue; var c = cols[i % 4]; ctx.fillStyle = 'rgba(' + c.join(',') + ',0.45)'; ctx.fillRect((i % 4) * W / 4, fy + Math.floor(i / 4) * (H - fy) / 2, W / 4, (H - fy) / 2); } };
  P.lavalamp = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u, c = o.c || [255, 90, 160];
    glow(ctx, X, Y - 12 * u, 14 * u, c, 0.35);
    ctx.fillStyle = '#B8BEC8'; poly(ctx, [X - 4 * u, Y, X + 4 * u, Y, X + 2.4 * u, Y - 5 * u, X - 2.4 * u, Y - 5 * u]); ctx.fill();
    ctx.fillStyle = 'rgba(' + c.join(',') + ',0.35)'; poly(ctx, [X - 2.4 * u, Y - 5 * u, X + 2.4 * u, Y - 5 * u, X + 1.4 * u, Y - 19 * u, X - 1.4 * u, Y - 19 * u]); ctx.fill();
    ctx.fillStyle = 'rgba(' + c.join(',') + ',0.95)';
    for (var i = 0; i < 3; i++) { var p = (t * 0.12 + i / 3) % 1; ell(ctx, X + Math.sin(t + i) * 0.4 * u, Y - 6 * u - p * 11 * u, 1.3 * u, 1.8 * u); ctx.fill(); }
    ctx.fillStyle = '#B8BEC8'; poly(ctx, [X - 1.4 * u, Y - 19 * u, X + 1.4 * u, Y - 19 * u, X + 0.8 * u, Y - 21 * u, X - 0.8 * u, Y - 21 * u]); ctx.fill();
  };
  P.beanbag = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = fl(H) + 5 * u; ctx.fillStyle = o.c || '#7A4AC8'; ctx.beginPath(); ctx.moveTo(X - 10 * u, Y); ctx.quadraticCurveTo(X - 12 * u, Y - 12 * u, X - 2 * u, Y - 13 * u); ctx.quadraticCurveTo(X + 10 * u, Y - 12 * u, X + 10 * u, Y); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ell(ctx, X - 4 * u, Y - 8 * u, 4 * u, 2 * u, -0.4); ctx.fill(); };
  P.tank = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = (o.y || 0.5) * H, w = (o.w || 34) * u, h = (o.h || 20) * u;
    ctx.fillStyle = '#2A3A4A'; ctx.fillRect(X - w / 2 - 1 * u, Y - h / 2 - 1 * u, w + 2 * u, h + 2 * u);
    var g = ctx.createLinearGradient(0, Y - h / 2, 0, Y + h / 2); g.addColorStop(0, '#5FC0E0'); g.addColorStop(1, '#1E6A9A');
    ctx.fillStyle = g; ctx.fillRect(X - w / 2, Y - h / 2, w, h);
    ctx.fillStyle = '#E8D8A8'; ctx.fillRect(X - w / 2, Y + h / 2 - 3 * u, w, 3 * u);
    ctx.fillStyle = '#3E8E4A'; for (var i = 0; i < 3; i++) { ctx.beginPath(); var sx = X - w / 2 + 4 * u + i * w / 3; ctx.moveTo(sx, Y + h / 2 - 2 * u); ctx.quadraticCurveTo(sx + 3 * u * Math.sin(t + i), Y, sx + 1 * u, Y - h / 4); ctx.lineTo(sx + 2 * u, Y + h / 2 - 2 * u); ctx.fill(); }
    ['#FF8A3A', '#FFD24A', '#FF5A8A'].forEach(function (c, j) { var fx = X - w / 2 + ((t * (3 + j) * u + j * 12 * u) % w), fy2 = Y - h / 4 + j * 4 * u; ctx.fillStyle = c; ell(ctx, fx, fy2, 2 * u, 1.1 * u); ctx.fill(); tri(ctx, fx - 2 * u, fy2, fx - 3.4 * u, fy2 - 1.2 * u, fx - 3.4 * u, fy2 + 1.2 * u); ctx.fill(); });
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(X - w / 2 + 2 * u, Y - h / 2 + 1 * u, 2 * u, h - 5 * u);
  };
  P.deckchair = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u, c = o.c || '#E74C3C';
    pen(ctx, '#B8865A', 1 * u); seg(ctx, X - 7 * u, Y, X + 4 * u, Y - 20 * u); seg(ctx, X + 6 * u, Y, X - 4 * u, Y - 10 * u);
    ctx.save(); ctx.beginPath(); ctx.moveTo(X + 3 * u, Y - 19 * u); ctx.lineTo(X + 7 * u, Y - 17 * u); ctx.lineTo(X - 1 * u, Y - 4 * u); ctx.lineTo(X - 6 * u, Y - 6 * u); ctx.closePath(); ctx.clip();
    for (var i = -10; i < 12; i += 2) { ctx.fillStyle = (i / 2) % 2 ? '#FFFFFF' : c; ctx.fillRect(X - 10 * u + i * u, Y - 22 * u, 1 * u, 20 * u); }
    ctx.restore();
  };
  P.bucket = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = fl(H) + 5 * u; ctx.fillStyle = o.c || '#E84A3A'; poly(ctx, [X - 4 * u, Y - 8 * u, X + 4 * u, Y - 8 * u, X + 3 * u, Y, X - 3 * u, Y]); ctx.fill(); pen(ctx, shade(o.c || '#E84A3A', -0.3), 0.5 * u); ctx.beginPath(); ctx.arc(X, Y - 8 * u, 4 * u, Math.PI, TAU); ctx.stroke(); pen(ctx, '#F2C230', 0.9 * u); seg(ctx, X + 5 * u, Y, X + 8 * u, Y - 10 * u); ctx.fillStyle = '#F2C230'; ell(ctx, X + 4.6 * u, Y + 0.6 * u, 1.6 * u, 2.4 * u, 0.3); ctx.fill(); };
  P.lifebuoy = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = (o.y || 0.42) * H; ctx.lineWidth = 3 * u; ctx.strokeStyle = '#FFFFFF'; circ(ctx, X, Y, 5 * u); ctx.stroke(); ctx.strokeStyle = '#E74C3C'; for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(X, Y, 5 * u, i * Math.PI / 2, i * Math.PI / 2 + Math.PI / 4); ctx.stroke(); } };
  P.net = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = (o.y || 0.3) * H; pen(ctx, 'rgba(200,180,140,0.8)', 0.4 * u); for (var i = 0; i < 6; i++) { seg(ctx, X - 12 * u + i * 4 * u, Y, X - 10 * u + i * 4 * u, Y + 18 * u); seg(ctx, X - 12 * u, Y + i * 3.4 * u, X + 10 * u, Y + i * 3.4 * u + 2 * u); } if (o.fish) { ctx.fillStyle = '#9AB0C4'; ell(ctx, X - 2 * u, Y + 9 * u, 3 * u, 1.3 * u, 0.3); ctx.fill(); ell(ctx, X + 5 * u, Y + 12 * u, 3 * u, 1.3 * u, -0.2); ctx.fill(); } };
  P.wheel = function (ctx, W, H, x, o, t) { var u = W / 100, X = x * W, Y = (o.y || 0.45) * H; pen(ctx, '#7A4A28', 1.2 * u); circ(ctx, X, Y, 6 * u); ctx.stroke(); ctx.fillStyle = '#7A4A28'; circ(ctx, X, Y, 1.6 * u); ctx.fill(); for (var i = 0; i < 8; i++) { var a = i * TAU / 8 + Math.sin(t * 0.5) * 0.1; seg(ctx, X, Y, X + Math.cos(a) * 9 * u, Y + Math.sin(a) * 9 * u); } };
  P.chest = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 5 * u;
    glow(ctx, X, Y - 9 * u, 12 * u, [255, 214, 90], 0.35 + 0.1 * Math.sin(t * 3));
    ctx.fillStyle = '#8A5A2A'; rr(ctx, X - 9 * u, Y - 9 * u, 18 * u, 9 * u, 1 * u); ctx.fill();
    ctx.fillStyle = '#F2C230'; for (var i = 0; i < 5; i++) { circ(ctx, X - 6 * u + i * 3 * u, Y - 10 * u, 1.6 * u); ctx.fill(); }
    ctx.fillStyle = '#6E4520'; ctx.save(); ctx.translate(X - 9 * u, Y - 9 * u); ctx.rotate(-0.5); rr(ctx, 0, -6 * u, 18 * u, 6 * u, 2 * u); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#C9A44A'; ctx.fillRect(X - 9 * u, Y - 5 * u, 18 * u, 1.2 * u);
  };
  P.shells = function (ctx, W, H, x, o) { var u = W / 100; [[x - 0.1, '#F6D0B8'], [x, '#FFFFFF'], [x + 0.12, '#F2B8C6']].forEach(function (s, i) { var X = s[0] * W, Y = fl(H) + (5 + (i % 2) * 4) * u; ctx.fillStyle = s[1]; ctx.beginPath(); ctx.moveTo(X - 3 * u, Y); ctx.quadraticCurveTo(X, Y - 6 * u, X + 3 * u, Y); ctx.closePath(); ctx.fill(); pen(ctx, shade(s[1], -0.2), 0.3 * u); for (var j = -1; j <= 1; j++) seg(ctx, X, Y - 4 * u, X + j * 2 * u, Y); }); };
  P.rocks = function (ctx, W, H, x, o) { var u = W / 100; K.rock(ctx, W * 0.12, fl(H) + 4 * u, 12 * u, 9 * u, o.c || '#7E8794'); K.rock(ctx, W * 0.88, fl(H) + 6 * u, 14 * u, 11 * u, o.c || '#6E7684'); if (o.weed !== false) { pen(ctx, '#3E8E4A', 1 * u); seg(ctx, W * 0.85, fl(H) - 4 * u, W * 0.83, fl(H) - 12 * u); seg(ctx, W * 0.9, fl(H) - 3 * u, W * 0.93, fl(H) - 10 * u); } };
  P.sandcastle = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 4 * u, c = o.c || '#E2BE7A';
    ctx.fillStyle = c; ctx.fillRect(X - 9 * u, Y - 10 * u, 18 * u, 10 * u);
    for (var i = -1; i <= 1; i += 2) { ctx.fillRect(X + i * 7 * u - 3 * u, Y - 16 * u, 6 * u, 16 * u); for (var j = 0; j < 3; j++) ctx.fillRect(X + i * 7 * u - 3 * u + j * 2.4 * u, Y - 18 * u, 1.4 * u, 2 * u); }
    ctx.fillStyle = shade(c, -0.25); rr(ctx, X - 2 * u, Y - 6 * u, 4 * u, 6 * u, 2 * u); ctx.fill();
    pen(ctx, '#7A5A3A', 0.4 * u); seg(ctx, X + 7 * u, Y - 18 * u, X + 7 * u, Y - 24 * u); ctx.fillStyle = '#E74C3C'; tri(ctx, X + 7 * u, Y - 24 * u, X + 11 * u, Y - 22.5 * u, X + 7 * u, Y - 21 * u); ctx.fill();
  };
  P.boat = function (ctx, W, H, x, o, t) { var u = W / 100; K.boat(ctx, x * W, fl(H) + 10 * u, u * 0.9, { kind: 'row', hull: o.c || '#C8502E' }, t); };
  P.jetty = function (ctx, W, H, x, o) { var u = W / 100, fy = fl(H); ctx.fillStyle = '#9A6A40'; ctx.fillRect(0, fy, W * (o.w || 0.45), 5 * u); pen(ctx, '#6E4528', 0.4 * u); for (var i = 0; i < 6; i++) seg(ctx, i * 7 * u, fy, i * 7 * u, fy + 5 * u); ctx.fillStyle = '#6E4528'; ctx.fillRect(W * (o.w || 0.45) - 3 * u, fy, 2.4 * u, 14 * u); };
  P.reeds = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = fl(H) + 6 * u; pen(ctx, '#5E8A3A', 0.7 * u); for (var i = 0; i < 5; i++) seg(ctx, X + i * 2 * u, Y, X + i * 2.4 * u - 2 * u, Y - (14 + (i % 2) * 6) * u); ctx.fillStyle = '#7A4A28'; for (var j = 0; j < 3; j++) { rr(ctx, X + j * 3 * u - 3 * u, Y - (18 + (j % 2) * 4) * u, 1.6 * u, 5 * u, 0.8 * u); ctx.fill(); } };
  P.washing = function (ctx, W, H, x, o) { var u = W / 100, Y = (o.y || 0.3) * H; pen(ctx, '#8A8E98', 0.4 * u); seg(ctx, 0, Y, W, Y + 2 * u); [['#E74C3C', 0.2, 'shirt'], ['#3498DB', 0.42, 'sock'], ['#F1C40F', 0.62, 'shirt'], ['#FFFFFF', 0.82, 'sock']].forEach(function (c) { ctx.fillStyle = c[0]; var X = c[1] * W; if (c[2] === 'shirt') { poly(ctx, [X - 4 * u, Y, X + 4 * u, Y, X + 5.5 * u, Y + 3 * u, X + 3 * u, Y + 3.5 * u, X + 3 * u, Y + 10 * u, X - 3 * u, Y + 10 * u, X - 3 * u, Y + 3.5 * u, X - 5.5 * u, Y + 3 * u]); ctx.fill(); } else { rr(ctx, X - 1.4 * u, Y, 2.8 * u, 7 * u, 1 * u); ctx.fill(); rr(ctx, X - 1.4 * u, Y + 5 * u, 5 * u, 2.6 * u, 1.2 * u); ctx.fill(); } }); };
  P.washer = function (ctx, W, H, x, o, t) { var u = W / 100, X = x * W, Y = fl(H) + 2 * u; ctx.fillStyle = '#F2F4F6'; rr(ctx, X - 9 * u, Y - 20 * u, 18 * u, 20 * u, 1.5 * u); ctx.fill(); ctx.fillStyle = '#B8BEC8'; circ(ctx, X, Y - 9 * u, 6 * u); ctx.fill(); ctx.fillStyle = '#5FB0E0'; circ(ctx, X, Y - 9 * u, 4.6 * u); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; circ(ctx, X + Math.cos(t * 4) * 2 * u, Y - 9 * u + Math.sin(t * 4) * 2 * u, 1.2 * u); ctx.fill(); ctx.fillStyle = '#8A8E98'; ctx.fillRect(X - 7 * u, Y - 18.5 * u, 6 * u, 1.4 * u); };
  P.counter = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u, w = (o.w || 50) * u, c = o.c || '#C9A07A';
    ctx.fillStyle = c; ctx.fillRect(X - w / 2, Y - 14 * u, w, 14 * u);
    ctx.fillStyle = shade(c, 0.15); ctx.fillRect(X - w / 2 - 1 * u, Y - 15.5 * u, w + 2 * u, 2.4 * u);
    pen(ctx, shade(c, -0.25), 0.4 * u); for (var i = 1; i < 4; i++) seg(ctx, X - w / 2 + i * w / 4, Y - 13 * u, X - w / 2 + i * w / 4, Y);
    var on = o.on || [];
    on.forEach(function (it, i) { var ix = X - w / 2 + (i + 0.5) * w / on.length; if (THINGS[it]) THINGS[it](ctx, ix, Y - 15.5 * u, u, o, i); });
  };
  P.sign = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = (o.y || 0.36) * H, w = (o.w || 30) * u;
    ctx.fillStyle = o.c || '#2E4A7A'; rr(ctx, X - w / 2, Y - 4 * u, w, 8 * u, 1.5 * u); ctx.fill();
    ctx.fillStyle = o.ink || '#FFFFFF';
    ctx.font = '800 ' + Math.round(4.6 * u) + 'px Archivo, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.text || '', X, Y + 0.3 * u);
  };
  P.jars = function (ctx, W, H, x, o) { P.shelf(ctx, W, H, x, { y: o.y || 0.36, w: o.w || 40, items: o.items || ['sweets', 'sweets', 'sweets', 'sweets'] }); P.shelf(ctx, W, H, x, { y: (o.y || 0.36) + 0.12, w: o.w || 40, items: o.items2 || o.items || ['sweets', 'sweets', 'sweets', 'sweets'] }); };
  P.stove = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u, c = o.c || '#B8322A';
    ctx.fillStyle = c; rr(ctx, X - 11 * u, Y - 18 * u, 22 * u, 18 * u, 2 * u); ctx.fill();
    ctx.fillStyle = shade(c, 0.2); ctx.fillRect(X - 11 * u, Y - 18 * u, 22 * u, 2 * u);
    ctx.fillStyle = '#C8CCD6'; circ(ctx, X - 5 * u, Y - 19.5 * u, 3 * u); ctx.fill(); circ(ctx, X + 5 * u, Y - 19.5 * u, 3 * u); ctx.fill();
    ctx.fillStyle = shade(c, -0.25); rr(ctx, X - 8 * u, Y - 13 * u, 7 * u, 8 * u, 1 * u); ctx.fill(); rr(ctx, X + 1 * u, Y - 13 * u, 7 * u, 8 * u, 1 * u); ctx.fill();
    if (o.pan) { ctx.fillStyle = '#3A3E48'; ell(ctx, X + 5 * u, Y - 21 * u, 4 * u, 1.4 * u); ctx.fill(); for (var i = 0; i < 2; i++) { var p = (t * 0.4 + i * 0.5) % 1; ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - p)) + ')'; circ(ctx, X + 5 * u + Math.sin(p * 6) * u, Y - 23 * u - p * 10 * u, (1 + p) * u); ctx.fill(); } }
  };
  P.pans = function (ctx, W, H, x, o) { var u = W / 100, Y = (o.y || 0.34) * H; pen(ctx, '#5A5E68', 0.5 * u); seg(ctx, W * (x - 0.15), Y, W * (x + 0.15), Y); ['#C87A3A', '#B8BEC8', '#C87A3A'].forEach(function (c, i) { var X = W * (x - 0.1 + i * 0.1); pen(ctx, '#5A5E68', 0.4 * u); seg(ctx, X, Y, X, Y + 3 * u); ctx.fillStyle = c; circ(ctx, X, Y + 6 * u, (2.4 + (i % 2)) * u); ctx.fill(); }); };
  P.tree = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 4 * u;
    ctx.fillStyle = '#6B4A2B'; ctx.fillRect(X - 1.4 * u, Y - 6 * u, 2.8 * u, 6 * u);
    ctx.fillStyle = '#2F7A4A';
    for (var i = 0; i < 4; i++) { var w = (13 - i * 3) * u, y = Y - 5 * u - i * 7 * u; tri(ctx, X - w, y, X + w, y, X, y - 11 * u); ctx.fill(); }
    var cols = ['#FF5A5A', '#FFD24A', '#5AB4FF', '#FFFFFF'];
    for (var j = 0; j < 12; j++) { var fy2 = 0.1 + (j % 4) * 0.22, fx = ((j * 0.37) % 1 - 0.5) * (1 - fy2) * 1.4; ctx.fillStyle = cols[j % 4]; circ(ctx, X + fx * 12 * u, Y - 8 * u - fy2 * 26 * u, 0.9 * u * (0.7 + 0.3 * Math.sin(t * 4 + j))); ctx.fill(); }
    star4(ctx, X, Y - 38 * u, 3.2 * u, '#FFD24A');
  };
  P.presents = function (ctx, W, H, x, o) { var u = W / 100; [['#C0392B', -6, 7], ['#2E86C1', 2, 6], ['#27AE60', 8, 5]].forEach(function (p) { var X = x * W + p[1] * u, Y = fl(H) + 6 * u, s = p[2] * u; ctx.fillStyle = p[0]; ctx.fillRect(X - s / 2, Y - s, s, s); ctx.fillStyle = '#F4D03F'; ctx.fillRect(X - 0.5 * u, Y - s, 1 * u, s); ctx.fillRect(X - s / 2, Y - s / 2 - 0.5 * u, s, 1 * u); }); };
  P.throne = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u, c = o.c || '#D4A52A';
    ctx.fillStyle = c; rr(ctx, X - 11 * u, Y - 40 * u, 22 * u, 34 * u, 3 * u); ctx.fill();
    ctx.fillStyle = o.cloth || '#A3263A'; rr(ctx, X - 8 * u, Y - 37 * u, 16 * u, 26 * u, 2 * u); ctx.fill();
    ctx.fillStyle = c; for (var i = -1; i <= 1; i++) { circ(ctx, X + i * 7 * u, Y - 41 * u, 2 * u); ctx.fill(); }
    ctx.fillStyle = shade(c, -0.15); rr(ctx, X - 13 * u, Y - 12 * u, 26 * u, 7 * u, 2 * u); ctx.fill();
    ctx.fillRect(X - 12 * u, Y - 5 * u, 2.4 * u, 5 * u); ctx.fillRect(X + 9.6 * u, Y - 5 * u, 2.4 * u, 5 * u);
  };
  P.banner = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = (o.y || 0.25) * H; pen(ctx, '#C9A44A', 0.6 * u); seg(ctx, X - 6 * u, Y, X + 6 * u, Y); ctx.fillStyle = o.c || '#A3263A'; poly(ctx, [X - 5 * u, Y, X + 5 * u, Y, X + 5 * u, Y + 20 * u, X, Y + 16 * u, X - 5 * u, Y + 20 * u]); ctx.fill(); ctx.fillStyle = '#E2B84A'; star4(ctx, X, Y + 8 * u, 3 * u, '#E2B84A'); };
  P.runner = function (ctx, W, H, x, o) { var u = W / 100, fy = fl(H); ctx.fillStyle = o.c || '#A3263A'; poly(ctx, [W * 0.42, fy, W * 0.58, fy, W * 0.72, H, W * 0.28, H]); ctx.fill(); pen(ctx, '#E2B84A', 0.6 * u); seg(ctx, W * 0.43, fy, W * 0.3, H); seg(ctx, W * 0.57, fy, W * 0.7, H); };
  P.torch = function (ctx, W, H, x, o, t) { var u = W / 100, X = x * W, Y = (o.y || 0.42) * H; glow(ctx, X, Y - 5 * u, 12 * u, [255, 170, 60], 0.45 + 0.1 * Math.sin(t * 8)); ctx.fillStyle = '#5A3A22'; poly(ctx, [X - 1.5 * u, Y - 2 * u, X + 1.5 * u, Y - 2 * u, X + 0.8 * u, Y + 6 * u, X - 0.8 * u, Y + 6 * u]); ctx.fill(); ctx.fillStyle = '#FF9A2A'; ctx.beginPath(); ctx.moveTo(X - 2 * u, Y - 2 * u); ctx.quadraticCurveTo(X, Y - (8 + Math.sin(t * 9)) * u, X + 2 * u, Y - 2 * u); ctx.fill(); };
  P.hammock = function (ctx, W, H, x, o) { var u = W / 100, Y = (o.y || 0.6) * H; pen(ctx, '#8A6A4A', 0.6 * u); seg(ctx, W * 0.05, Y - 14 * u, W * 0.2, Y - 4 * u); seg(ctx, W * 0.95, Y - 14 * u, W * 0.8, Y - 4 * u); ctx.fillStyle = o.c || '#E2884A'; ctx.beginPath(); ctx.moveTo(W * 0.2, Y - 4 * u); ctx.quadraticCurveTo(W * 0.5, Y + 8 * u, W * 0.8, Y - 4 * u); ctx.quadraticCurveTo(W * 0.5, Y + 2 * u, W * 0.2, Y - 4 * u); ctx.fill(); };
  P.mat = function (ctx, W, H, x, o) { var u = W / 100; ctx.fillStyle = o.c || '#5AB4A0'; poly(ctx, [W * (x - 0.2), fl(H) + 5 * u, W * (x + 0.2), fl(H) + 5 * u, W * (x + 0.24), fl(H) + 13 * u, W * (x - 0.24), fl(H) + 13 * u]); ctx.fill(); };
  P.fountain = function (ctx, W, H, x, o, t) { var u = W / 100, X = x * W, Y = fl(H) + 4 * u; ctx.fillStyle = '#D8D2C4'; ell(ctx, X, Y, 14 * u, 3 * u); ctx.fill(); ctx.fillRect(X - 2 * u, Y - 14 * u, 4 * u, 14 * u); ctx.fillStyle = '#7EC8E3'; ell(ctx, X, Y - 1 * u, 12 * u, 2 * u); ctx.fill(); pen(ctx, 'rgba(190,230,255,0.85)', 0.6 * u); for (var i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.moveTo(X, Y - 15 * u); ctx.quadraticCurveTo(X + i * 6 * u, Y - (20 + Math.sin(t * 5)) * u, X + i * 9 * u, Y - 2 * u); ctx.stroke(); } };
  P.arch = function (ctx, W, H, x, o) { var u = W / 100; ctx.fillStyle = o.c || '#F2E8D6'; ctx.fillRect(0, 0, W * 0.16, fl(H)); ctx.fillRect(W * 0.84, 0, W * 0.16, fl(H)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H * 0.3); ctx.quadraticCurveTo(W * 0.5, H * 0.02, 0, H * 0.3); ctx.closePath(); ctx.fill(); pen(ctx, shade(o.c || '#F2E8D6', -0.2), 0.6 * u); ctx.beginPath(); ctx.moveTo(W * 0.16, fl(H)); ctx.lineTo(W * 0.16, H * 0.28); ctx.quadraticCurveTo(W * 0.5, H * 0.06, W * 0.84, H * 0.28); ctx.lineTo(W * 0.84, fl(H)); ctx.stroke(); };
  P.palms = function (ctx, W, H, x, o) { var u = W / 100; [0.1, 0.9].forEach(function (px, i) { ctx.fillStyle = '#2F8A4A'; for (var j = 0; j < 5; j++) { var a = (i ? Math.PI : 0) + (j - 2) * 0.35 + (i ? 0.4 : -0.4); ell(ctx, W * px + Math.cos(a) * 8 * u, H * 0.3 + Math.sin(a) * 6 * u, 9 * u, 2.2 * u, a); ctx.fill(); } }); };
  P.icecubes = function (ctx, W, H, x, o) { var u = W / 100; [[0.12, 10], [0.86, 12], [0.78, 7]].forEach(function (b) { var X = b[0] * W, Y = fl(H) + 4 * u, s = b[1] * u; ctx.fillStyle = 'rgba(220,240,255,0.92)'; rr(ctx, X - s / 2, Y - s, s, s, 1.2 * u); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(X - s / 2 + 1 * u, Y - s + 1 * u, s * 0.3, s * 0.15); }); };
  P.skates = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = (o.y || 0.4) * H; pen(ctx, '#8A8E98', 0.4 * u); seg(ctx, X - 4 * u, Y - 6 * u, X, Y - 10 * u); seg(ctx, X + 4 * u, Y - 6 * u, X, Y - 10 * u); [-1, 1].forEach(function (s) { ctx.fillStyle = '#FFFFFF'; rr(ctx, X + s * 4 * u - 2 * u, Y - 6 * u, 4 * u, 6 * u, 1 * u); ctx.fill(); pen(ctx, '#B8BEC8', 0.6 * u); seg(ctx, X + s * 4 * u - 2.4 * u, Y + 0.8 * u, X + s * 4 * u + 2.4 * u, Y + 0.8 * u); }); };
  P.snowflakes = function (ctx, W, H, x, o, t) { var u = W / 100; ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (var i = 0; i < 14; i++) { var px = ((i * 0.37 + Math.sin(t * 0.5 + i) * 0.02) % 1) * W, py = ((i * 0.53 + t * 0.03) % 1) * H * FY; circ(ctx, px, py, (0.5 + (i % 3) * 0.3) * u); ctx.fill(); } };
  P.cloudbed = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = fl(H) + 2 * u; for (var i = -2; i <= 2; i++) K.cloud(ctx, X + i * 7 * u - 4 * u, Y - 8 * u - (Math.abs(i) < 2 ? 3 * u : 0), 6 * u, '#FFFFFF'); ctx.fillStyle = '#F4F8FF'; rr(ctx, X - 18 * u, Y - 12 * u, 10 * u, 5 * u, 2.4 * u); ctx.fill(); };
  P.moon = function (ctx, W, H, x, o) { var u = W / 100; K.moon(ctx, x * W, (o.y || 0.3) * H, 5 * u, o.phase || 'crescent', o.sky || '#2A3A72'); };
  P.yarn = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = fl(H) + 5 * u; ctx.fillStyle = '#B8865A'; poly(ctx, [X - 8 * u, Y - 8 * u, X + 8 * u, Y - 8 * u, X + 6 * u, Y, X - 6 * u, Y]); ctx.fill(); ['#E74C3C', '#3498DB', '#F1C40F', '#9B59B6'].forEach(function (c, i) { ctx.fillStyle = c; circ(ctx, X - 5 * u + i * 3.4 * u, Y - 9 * u - (i % 2) * 1.6 * u, 2.4 * u); ctx.fill(); }); pen(ctx, '#C9A07A', 0.5 * u); seg(ctx, X + 2 * u, Y - 14 * u, X + 8 * u, Y - 22 * u); seg(ctx, X + 4 * u, Y - 14 * u, X + 9 * u, Y - 21 * u); pen(ctx, '#E74C3C', 0.4 * u); ctx.beginPath(); ctx.moveTo(X + 6 * u, Y - 10 * u); ctx.quadraticCurveTo(X + 14 * u, Y - 4 * u, X + 12 * u, Y + 2 * u); ctx.stroke(); };
  P.jumpers = function (ctx, W, H, x, o) { var u = W / 100, Y = (o.y || 0.34) * H; pen(ctx, '#8A8E98', 0.6 * u); seg(ctx, W * 0.15, Y, W * 0.85, Y); ['#C0392B', '#2E86C1', '#F1C40F', '#27AE60'].forEach(function (c, i) { var X = W * (0.22 + i * 0.19); ctx.fillStyle = c; poly(ctx, [X - 5 * u, Y + 1 * u, X + 5 * u, Y + 1 * u, X + 7 * u, Y + 4 * u, X + 4 * u, Y + 5 * u, X + 4 * u, Y + 13 * u, X - 4 * u, Y + 13 * u, X - 4 * u, Y + 5 * u, X - 7 * u, Y + 4 * u]); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(X - 4 * u, Y + 7 * u, 8 * u, 1 * u); }); };
  P.tophat = function (ctx, W, H, x, o, t) { var u = W / 100, X = x * W, Y = fl(H) + 4 * u; ctx.fillStyle = '#1E1E26'; ell(ctx, X, Y, 8 * u, 2 * u); ctx.fill(); ctx.fillRect(X - 5 * u, Y - 10 * u, 10 * u, 10 * u); ctx.fillStyle = '#A3263A'; ctx.fillRect(X - 5 * u, Y - 3 * u, 10 * u, 1.6 * u); pen(ctx, '#1E1E26', 0.8 * u); seg(ctx, X + 8 * u, Y - 2 * u, X + 14 * u, Y - 10 * u); ctx.fillStyle = '#FFFFFF'; circ(ctx, X + 14 * u, Y - 10 * u, 0.9 * u); ctx.fill(); for (var i = 0; i < 3; i++) star4(ctx, X + 15 * u + i * 2 * u, Y - 13 * u - i * 2.4 * u, (1 + 0.6 * Math.sin(t * 4 + i)) * u, '#FFE27A'); };
  P.spotlight = function (ctx, W, H, x, o) { var u = W / 100, X = x * W; var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,245,200,0.35)'); g.addColorStop(1, 'rgba(255,245,200,0.05)'); ctx.fillStyle = g; poly(ctx, [X - 4 * u, 0, X + 4 * u, 0, X + 22 * u, H, X - 22 * u, H]); ctx.fill(); };
  P.clock = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = (o.y || 0.35) * H; ctx.fillStyle = '#7A4A28'; circ(ctx, X, Y, 5 * u); ctx.fill(); ctx.fillStyle = '#F6F0E2'; circ(ctx, X, Y, 4 * u); ctx.fill(); pen(ctx, '#2A2A2A', 0.5 * u); seg(ctx, X, Y, X, Y - 3 * u); seg(ctx, X, Y, X + 2.2 * u, Y + 1 * u); };
  P.post = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = fl(H) + 3 * u; ctx.fillStyle = '#C8202A'; rr(ctx, X - 5 * u, Y - 22 * u, 10 * u, 22 * u, 5 * u); ctx.fill(); ctx.fillStyle = '#2A2228'; ctx.fillRect(X - 3.6 * u, Y - 15 * u, 7.2 * u, 1.2 * u); ctx.fillStyle = '#E8B33A'; ctx.font = '800 ' + Math.round(2.6 * u) + 'px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('POST', X, Y - 10 * u); };
  P.letters = function (ctx, W, H, x, o) { var u = W / 100; P.shelf(ctx, W, H, x, { y: o.y || 0.4, w: 34, items: ['letter', 'parcel', 'letter', 'parcel', 'letter'] }); };
  P.boxes = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = fl(H) + 3 * u; [[-6, 12, 10], [5, 10, 8], [-1, 8, -2]].forEach(function (b, i) { ctx.fillStyle = i === 2 ? '#C9A07A' : '#B8865A'; var by = i === 2 ? Y - 10 * u : Y; ctx.fillRect(X + b[0] * u - b[1] * u / 2, by - b[1] * u * 0.8, b[1] * u, b[1] * u * 0.8); pen(ctx, '#8A5A2A', 0.4 * u); seg(ctx, X + b[0] * u - b[1] * u / 2, by - b[1] * u * 0.4, X + b[0] * u + b[1] * u / 2, by - b[1] * u * 0.4); }); };
  P.binoculars = function (ctx, W, H, x, o) { var u = W / 100, X = x * W, Y = (o.y || 0.66) * H; ctx.fillStyle = '#2A2E38'; rr(ctx, X - 5 * u, Y - 3 * u, 4 * u, 6 * u, 1.4 * u); ctx.fill(); rr(ctx, X + 1 * u, Y - 3 * u, 4 * u, 6 * u, 1.4 * u); ctx.fill(); ctx.fillStyle = '#5FB0E0'; circ(ctx, X - 3 * u, Y + 3 * u, 1.3 * u); ctx.fill(); circ(ctx, X + 3 * u, Y + 3 * u, 1.3 * u); ctx.fill(); };
  P.railing = function (ctx, W, H, x, o) { var u = W / 100, Y = fl(H); pen(ctx, o.c || '#8A5A36', 1.2 * u); seg(ctx, 0, Y - 12 * u, W, Y - 12 * u); seg(ctx, 0, Y - 6 * u, W, Y - 6 * u); for (var i = 0; i < 8; i++) seg(ctx, i * W / 7, Y - 12 * u, i * W / 7, Y); };
  P.flag = function (ctx, W, H, x, o, t) { var u = W / 100, X = x * W, Y = fl(H) - 12 * u; pen(ctx, '#6E4528', 0.8 * u); seg(ctx, X, Y, X, Y - 26 * u); ctx.fillStyle = o.c || '#E74C3C'; ctx.beginPath(); ctx.moveTo(X, Y - 26 * u); ctx.quadraticCurveTo(X + 5 * u, Y - (27 + Math.sin(t * 4)) * u, X + 10 * u, Y - 24 * u); ctx.lineTo(X + 10 * u, Y - 19 * u); ctx.quadraticCurveTo(X + 5 * u, Y - (21 + Math.sin(t * 4 + 1)) * u, X, Y - 20 * u); ctx.closePath(); ctx.fill(); };
  P.sun = function (ctx, W, H, x, o) { var u = W / 100; glow(ctx, x * W, (o.y || 0.3) * H, 16 * u, [255, 220, 120], 0.5); ctx.fillStyle = '#FFE27A'; circ(ctx, x * W, (o.y || 0.3) * H, 5 * u); ctx.fill(); };
  P.arcade = function (ctx, W, H, x, o, t) { var u = W / 100, X = x * W, Y = fl(H) + 2 * u; ctx.fillStyle = o.c || '#C8202A'; rr(ctx, X - 8 * u, Y - 34 * u, 16 * u, 34 * u, 2 * u); ctx.fill(); ctx.fillStyle = 'rgba(200,240,255,0.5)'; ctx.fillRect(X - 6 * u, Y - 30 * u, 12 * u, 14 * u); ctx.fillStyle = '#FFE27A'; ctx.fillRect(X - 6 * u, Y - 34 * u, 12 * u, 3 * u); pen(ctx, '#B8BEC8', 0.5 * u); seg(ctx, X, Y - 30 * u, X, Y - 24 * u + Math.sin(t * 2) * 2 * u); ctx.fillStyle = '#F28AA0'; circ(ctx, X - 3 * u, Y - 18 * u, 1.6 * u); ctx.fill(); ctx.fillStyle = '#7EC8E3'; circ(ctx, X + 2 * u, Y - 18 * u, 1.6 * u); ctx.fill(); };
  P.fryer = function (ctx, W, H, x, o, t) { var u = W / 100, X = x * W, Y = fl(H) - 13 * u; ctx.fillStyle = '#B8BEC8'; ctx.fillRect(X - 9 * u, Y - 10 * u, 18 * u, 10 * u); ctx.fillStyle = '#E8B33A'; for (var i = 0; i < 6; i++) ctx.fillRect(X - 7 * u + i * 2.4 * u, Y - 12 * u - (i % 2) * 1.4 * u, 1.2 * u, 4 * u); for (var j = 0; j < 2; j++) { var p = (t * 0.3 + j * 0.5) % 1; ctx.fillStyle = 'rgba(255,255,255,' + (0.4 * (1 - p)) + ')'; circ(ctx, X + (j - 0.5) * 6 * u, Y - 14 * u - p * 14 * u, (1.4 + p * 2) * u); ctx.fill(); } };

  /* a big leaf lying on the floor, for a bed */
  P.leafbed = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 9 * u, s = o.small ? 0.6 : 1;
    ctx.save(); ctx.translate(X, Y); ctx.scale(s, s);
    ctx.fillStyle = o.c || '#4E9A3A';
    ctx.beginPath(); ctx.moveTo(-24 * u, 1 * u); ctx.quadraticCurveTo(-4 * u, -9 * u, 24 * u, -1 * u); ctx.quadraticCurveTo(2 * u, 7 * u, -24 * u, 1 * u); ctx.fill();
    pen(ctx, shade(o.c || '#4E9A3A', 0.25), 0.6 * u);
    ctx.beginPath(); ctx.moveTo(-24 * u, 1 * u); ctx.quadraticCurveTo(0, -1 * u, 24 * u, -1 * u); ctx.stroke();
    for (var i = -3; i <= 3; i++) { seg(ctx, i * 6 * u, -0.4 * u, i * 6 * u + 3 * u, -4 * u); seg(ctx, i * 6 * u, -0.2 * u, i * 6 * u + 3 * u, 3 * u); }
    ctx.restore();
  };
  /* a thimble turned upside down, for a seat */
  P.thimble = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 4 * u;
    var g = ctx.createLinearGradient(X - 6 * u, 0, X + 6 * u, 0);
    g.addColorStop(0, '#9AA2AE'); g.addColorStop(0.4, '#E6EAF0'); g.addColorStop(1, '#8A929E');
    ctx.fillStyle = g; poly(ctx, [X - 6 * u, Y, X + 6 * u, Y, X + 4.6 * u, Y - 12 * u, X - 4.6 * u, Y - 12 * u]); ctx.fill();
    ell(ctx, X, Y - 12 * u, 4.6 * u, 1.4 * u); ctx.fill();
    ctx.fillStyle = 'rgba(80,90,105,0.35)';
    for (var r = 0; r < 4; r++) for (var c = -2; c <= 2; c++) { circ(ctx, X + c * 2 * u * (1 - r * 0.05), Y - 3 * u - r * 2.4 * u, 0.4 * u); ctx.fill(); }
  };
  /* big sewing buttons */
  P.buttons = function (ctx, W, H, x, o) {
    var u = W / 100;
    [[x, 7, 5, '#E8B33A'], [x - 0.08, 11, 3.6, '#5AB4C8'], [x + 0.06, 13, 3, '#E84A6A']].forEach(function (b) {
      var X = b[0] * W, Y = fl(H) + b[1] * u, r = b[2] * u;
      ctx.fillStyle = b[3]; ell(ctx, X, Y, r, r * 0.45); ctx.fill();
      ctx.fillStyle = shade(b[3], -0.25);
      [-1, 1].forEach(function (s) { ell(ctx, X + s * r * 0.25, Y - r * 0.08, r * 0.1, r * 0.06); ctx.fill(); ell(ctx, X + s * r * 0.25, Y + r * 0.1, r * 0.1, r * 0.06); ctx.fill(); });
    });
  };
  /* the wooden edge of a dolls' house, round the whole room */
  P.dollframe = function (ctx, W, H, x, o) {
    var u = W / 100, c = o.c || '#C9A07A', e = 19 * u, top = 44 * u;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, e, H); ctx.fillRect(W - e, 0, e, H);
    ctx.fillRect(0, 0, W, top);
    ctx.fillStyle = shade(c, 0.15); ctx.fillRect(0, top - 1.4 * u, W, 1.4 * u);
    ctx.fillStyle = shade(c, -0.25);
    ctx.fillRect(e, top, 1 * u, H); ctx.fillRect(W - e - 1 * u, top, 1 * u, H); ctx.fillRect(e, top, W - 2 * e, 1 * u);
  };
  /* a cushioned seat under a window */
  P.windowseat = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u, L = (o.w || 44) * u, c = o.c || '#B07AC0';
    ctx.fillStyle = o.wood || '#F2EEE6'; ctx.fillRect(X - L / 2, Y - 10 * u, L, 10 * u);
    pen(ctx, shade(o.wood || '#F2EEE6', -0.15), 0.5 * u); ctx.strokeRect(X - L / 2 + 2 * u, Y - 8 * u, L / 2 - 3 * u, 6 * u); ctx.strokeRect(X + 1 * u, Y - 8 * u, L / 2 - 3 * u, 6 * u);
    ctx.fillStyle = c; rr(ctx, X - L / 2 - 1 * u, Y - 13 * u, L + 2 * u, 3.6 * u, 1.6 * u); ctx.fill();
    ctx.fillStyle = shade(c, 0.3); rr(ctx, X - L / 2 + 2 * u, Y - 18 * u, 8 * u, 5.6 * u, 2 * u); ctx.fill(); rr(ctx, X + L / 2 - 10 * u, Y - 18 * u, 8 * u, 5.6 * u, 2 * u); ctx.fill();
  };
  /* a lighthouse lamp: a great glass lens, its beam going round */
  P.beacon = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u;
    var a = (t * 0.9) % TAU, k = Math.cos(a);
    if (k > -0.2) {
      var g = ctx.createLinearGradient(X, 0, X + k * 40 * u, 0);
      g.addColorStop(0, 'rgba(255,240,180,0.55)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g; poly(ctx, [X, Y - 24 * u, X + k * 40 * u, Y - 34 * u, X + k * 40 * u, Y - 14 * u]); ctx.fill();
    }
    ctx.fillStyle = '#3A3E48'; ctx.fillRect(X - 6 * u, Y - 10 * u, 12 * u, 10 * u);
    ctx.fillStyle = '#C8202A'; ctx.fillRect(X - 7 * u, Y - 11 * u, 14 * u, 2 * u);
    glow(ctx, X, Y - 24 * u, 14 * u, [255, 236, 170], 0.55);
    ctx.fillStyle = 'rgba(255,248,220,0.95)'; rr(ctx, X - 6 * u, Y - 32 * u, 12 * u, 21 * u, 5 * u); ctx.fill();
    pen(ctx, 'rgba(200,170,90,0.7)', 0.5 * u);
    for (var i = 1; i < 5; i++) seg(ctx, X - 6 * u, Y - 32 * u + i * 4.2 * u, X + 6 * u, Y - 32 * u + i * 4.2 * u);
    ctx.fillStyle = '#3A3E48'; poly(ctx, [X - 7 * u, Y - 32 * u, X + 7 * u, Y - 32 * u, X, Y - 38 * u]); ctx.fill();
  };
  /* a pile of nuts and acorns */
  P.nutpile = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 6 * u, r = rnd(29);
    for (var i = 0; i < 14; i++) {
      var row = i < 6 ? 0 : i < 10 ? 1 : i < 13 ? 2 : 3, n = [6, 4, 3, 1][row], k = i - [0, 6, 10, 13][row];
      var nx = X + (k - (n - 1) / 2) * 3 * u + (r() - 0.5) * u, ny = Y - row * 2.4 * u;
      if (i % 3) THINGS.acorn(ctx, nx, ny + 1.6 * u, u * 1.4); else THINGS.nuts(ctx, nx, ny + 1 * u, u);
    }
  };
  /* acorns hanging from the ceiling on strings */
  P.acorns = function (ctx, W, H, x, o, t) {
    var u = W / 100;
    [0.24, 0.4, 0.62, 0.78].forEach(function (f, i) {
      var X = f * W, L = (10 + (i % 2) * 7) * u + H * 0.2, sw = Math.sin(t * 1.2 + i) * 0.8 * u;
      pen(ctx, 'rgba(90,70,50,0.6)', 0.3 * u); seg(ctx, X, 0, X + sw, L);
      THINGS.acorn(ctx, X + sw, L + 4.4 * u, u * 2.2);
    });
  };
  /* sacks of flour and seed */
  P.sacks = function (ctx, W, H, x, o) {
    var u = W / 100;
    [[x - 0.05, 0, '#E8DCC2', 9], [x + 0.06, 2, '#D8C8A6', 8]].forEach(function (s) {
      var X = s[0] * W, Y = fl(H) + (3 + s[1]) * u, w = s[3] * u;
      ctx.fillStyle = s[2];
      ctx.beginPath(); ctx.moveTo(X - w / 2, Y); ctx.quadraticCurveTo(X - w * 0.7, Y - w, X - w * 0.3, Y - w * 1.3); ctx.lineTo(X + w * 0.3, Y - w * 1.3); ctx.quadraticCurveTo(X + w * 0.7, Y - w, X + w / 2, Y); ctx.closePath(); ctx.fill();
      pen(ctx, '#8A6A48', 0.5 * u); seg(ctx, X - w * 0.32, Y - w * 1.2, X + w * 0.32, Y - w * 1.2);
    });
  };
  /* honey dripping from the top of the wall */
  P.drips = function (ctx, W, H, x, o, t) {
    var u = W / 100, top = H * 0.26;
    ctx.fillStyle = 'rgba(240,170,40,0.92)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, top);
    for (var i = 10; i >= 0; i--) {
      var X = i * W / 10, L = (3 + ((i * 7) % 5) * 1.6) * u + Math.sin(t * 0.8 + i) * 0.6 * u;
      ctx.quadraticCurveTo(X + W / 20, top, X + W / 40, top + L);
      ctx.quadraticCurveTo(X, top + L + 2 * u, X - W / 40, top + L);
    }
    ctx.lineTo(0, top); ctx.closePath(); ctx.fill();
  };
  /* moss creeping along the bottom of the wall */
  P.moss = function (ctx, W, H, x, o) {
    var u = W / 100, r = rnd(83), y0 = fl(H);
    for (var i = 0; i < 30; i++) { ctx.fillStyle = i % 2 ? '#5E8A3A' : '#78A048'; circ(ctx, r() * W, y0 - r() * 4 * u, (1.4 + r() * 2) * u); ctx.fill(); }
  };
  /* a pile of fish */
  P.fishpile = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 6 * u;
    ctx.fillStyle = '#B8C2CC'; ell(ctx, X, Y + 0.6 * u, 8 * u, 1.6 * u); ctx.fill();
    [[-3, 0], [3, 0.4], [0, -2.2], [-1.6, -4]].forEach(function (p) { THINGS.fish(ctx, X + p[0] * u, Y + p[1] * u, u * 1.4); });
  };
  /* water at the back of the floor, with a boat tied up */
  P.dock = function (ctx, W, H, x, o, t) {
    var u = W / 100, y0 = fl(H), y1 = y0 + 7 * u;
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#2E6A8A'); g.addColorStop(1, '#3E86A8');
    ctx.fillStyle = g; ctx.fillRect(0, y0 - 0.5 * u, W, y1 - y0);
    pen(ctx, 'rgba(255,255,255,0.4)', 0.4 * u);
    for (var i = 0; i < 3; i++) { var yy = y0 + (1.6 + i * 2) * u; seg(ctx, W * (0.1 + i * 0.3) + Math.sin(t + i) * u, yy, W * (0.22 + i * 0.3) + Math.sin(t + i) * u, yy); }
    K.boat(ctx, (o.boat || 0.76) * W, y0 + 3.4 * u, u * 0.9, { kind: 'row', hull: o.c || '#C8502E' }, t);
    ctx.fillStyle = '#8A6A48'; ctx.fillRect(0, y1 - 0.5 * u, W, 1.4 * u);
  };
  /* water in front of an animal standing in it: drawn after the animal */
  P.waterfront = function (ctx, W, H, x, o, t) {
    var u = W / 100, y0 = fl(H) + (o.from || 8) * u;
    ctx.fillStyle = o.c || 'rgba(110,190,225,0.55)';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (var X = 0; X <= W; X += 3 * u) ctx.lineTo(X, y0 + Math.sin(X / (5 * u) + t * 2) * 0.6 * u);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    pen(ctx, 'rgba(255,255,255,0.6)', 0.5 * u);
    ctx.beginPath(); for (var X2 = 0; X2 <= W; X2 += 3 * u) ctx.lineTo(X2, y0 + Math.sin(X2 / (5 * u) + t * 2) * 0.6 * u); ctx.stroke();
  };
  /* a laundry basket */
  P.basket = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 5 * u;
    ['#F2F2F2', '#F28AA0', '#5AB4C8'].forEach(function (c, i) { ctx.fillStyle = c; ell(ctx, X - 3 * u + i * 3 * u, Y - 10 * u, 3.4 * u, 2 * u); ctx.fill(); });
    ctx.fillStyle = o.c || '#C9A07A'; poly(ctx, [X - 8 * u, Y - 10 * u, X + 8 * u, Y - 10 * u, X + 6.6 * u, Y, X - 6.6 * u, Y]); ctx.fill();
    pen(ctx, shade(o.c || '#C9A07A', -0.25), 0.4 * u);
    for (var i = 1; i < 4; i++) seg(ctx, X - 8 * u + i * 0.35 * u, Y - 10 * u + i * 2.5 * u, X + 8 * u - i * 0.35 * u, Y - 10 * u + i * 2.5 * u);
  };
  /* bubbles drifting up through the room */
  P.bubbles = function (ctx, W, H, x, o, t) {
    var u = W / 100;
    for (var i = 0; i < 12; i++) {
      var p = (t * 0.08 + i * 0.083) % 1, X = W * ((i * 0.37) % 1) + Math.sin(t + i) * 2 * u, Y = H * (0.95 - p * 0.75);
      pen(ctx, 'rgba(255,255,255,' + (0.75 * (1 - p)) + ')', 0.4 * u); circ(ctx, X, Y, (1 + (i % 3) * 0.6) * u); ctx.stroke();
    }
  };

  /* ---------- 0.12.0: rooms that aren't kitchens, and the pets' homes ---------- */
  /* rows of cabbages and carrot tops in the earth */
  P.vegrows = function (ctx, W, H, x, o) {
    var u = W / 100, fy = fl(H);
    [[2.5, 'cabbage'], [6.2, 'carrot']].forEach(function (row, ri) {
      var Y = fy + row[0] * u;
      ctx.fillStyle = ri ? '#5E4430' : '#6E5034'; rr(ctx, W * 0.03, Y - 1.4 * u, W * 0.94, 2.8 * u, 1.4 * u); ctx.fill();
      for (var i = 0; i < 8; i++) {
        var X = W * (0.08 + i * 0.12) + ri * 4 * u;
        if (X > W * 0.96) continue;
        if (row[1] === 'cabbage') {
          ctx.fillStyle = '#5E9E44'; circ(ctx, X, Y - 2.4 * u, 3 * u); ctx.fill();
          ctx.fillStyle = '#8CC86A'; circ(ctx, X - 0.6 * u, Y - 3 * u, 1.8 * u); ctx.fill();
          pen(ctx, '#447A32', 0.4 * u); ctx.beginPath(); ctx.arc(X, Y - 2.4 * u, 2.2 * u, 3.6, 5.6); ctx.stroke();
        } else {
          pen(ctx, '#4E9A3A', 0.7 * u); for (var k = -1; k <= 1; k++) seg(ctx, X, Y - 0.6 * u, X + k * 1.8 * u, Y - 5.4 * u);
          ctx.fillStyle = '#F07A20'; ell(ctx, X, Y - 0.4 * u, 1.3 * u, 0.8 * u); ctx.fill();
        }
      }
    });
  };
  /* a cluster of red toadstools */
  P.mushrooms = function (ctx, W, H, x, o) {
    var u = W / 100;
    [[-5, 3, 1.1], [3.4, 5, 0.8], [8, 2, 0.6]].forEach(function (m) {
      var X = x * W + m[0] * u, Y = fl(H) + m[1] * u, s = m[2] * u;
      ctx.fillStyle = '#F4EEE0'; rr(ctx, X - 1.6 * s, Y - 8 * s, 3.2 * s, 8 * s, 1.2 * s); ctx.fill();
      ctx.fillStyle = o.c || '#D8322A'; ctx.beginPath(); ctx.ellipse(X, Y - 8 * s, 6 * s, 4.6 * s, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; [[-3, -10], [1, -11.4], [3.6, -9.2], [-0.6, -9]].forEach(function (d) { circ(ctx, X + d[0] * s, Y + d[1] * s, 0.8 * s); ctx.fill(); });
    });
  };
  /* nest boxes on the wall, with eggs in the straw */
  P.nests = function (ctx, W, H, x, o) {
    var u = W / 100, Y = (o.y || 0.5) * H;
    for (var i = 0; i < 3; i++) {
      var X = W * (x - 0.24 + i * 0.24);
      ctx.fillStyle = '#8A5A36'; ctx.fillRect(X - 9 * u, Y - 9 * u, 18 * u, 10 * u);
      ctx.fillStyle = '#4A3020'; ctx.fillRect(X - 7.5 * u, Y - 7.5 * u, 15 * u, 7 * u);
      ctx.fillStyle = '#D8B86A'; ell(ctx, X, Y - 1.6 * u, 7 * u, 2.6 * u); ctx.fill();
      ctx.fillStyle = i === 1 ? '#C98A5A' : '#F4EEE4'; ell(ctx, X - 2 * u, Y - 3 * u, 1.8 * u, 2.3 * u); ctx.fill();
      ctx.fillStyle = i === 2 ? '#C98A5A' : '#F4EEE4'; ell(ctx, X + 2.2 * u, Y - 2.8 * u, 1.7 * u, 2.2 * u); ctx.fill();
      ctx.fillStyle = '#A8784A'; ctx.fillRect(X - 9.5 * u, Y, 19 * u, 1.6 * u);
    }
  };
  /* open umbrellas hanging from a rail */
  P.umbrellas = function (ctx, W, H, x, o) {
    var u = W / 100, Y = (o.y || 0.44) * H, cols = ['#E74C3C', '#F2C230', '#3498DB', '#2ECC71'];
    pen(ctx, '#8A8E98', 0.6 * u); seg(ctx, W * 0.08, Y - 9 * u, W * 0.92, Y - 9 * u);
    for (var i = 0; i < 4; i++) {
      var X = W * (0.24 + i * 0.173), c = cols[i];
      pen(ctx, '#5A5E68', 0.4 * u); seg(ctx, X, Y - 9 * u, X, Y - 6.6 * u);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(X - 8 * u, Y); ctx.quadraticCurveTo(X - 7 * u, Y - 7 * u, X, Y - 7 * u); ctx.quadraticCurveTo(X + 7 * u, Y - 7 * u, X + 8 * u, Y);
      for (var k = 3; k >= 0; k--) ctx.quadraticCurveTo(X - 8 * u + (k + 0.5) * 4 * u, Y - 2 * u, X - 8 * u + k * 4 * u, Y);
      ctx.closePath(); ctx.fill();
      pen(ctx, shade(c, -0.25), 0.4 * u); for (var j = -1; j <= 1; j++) seg(ctx, X, Y - 7 * u, X + j * 4 * u, Y - 0.8 * u);
      pen(ctx, '#3A3E48', 0.6 * u); ctx.beginPath(); ctx.moveTo(X, Y - 1 * u); ctx.lineTo(X, Y + 5 * u); ctx.arc(X + 1.2 * u, Y + 5 * u, 1.2 * u, Math.PI, 0, true); ctx.stroke();
    }
  };
  /* a stand of rolled-up umbrellas */
  P.umbrellastand = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u;
    [['#E74C3C', -2.2, -0.4], ['#2E6DB4', 0.4, 0.1], ['#F2C230', 2.6, 0.45]].forEach(function (b) {
      var bx = X + b[1] * u, lean = b[2];
      pen(ctx, '#3A3E48', 0.6 * u); seg(ctx, bx, Y - 10 * u, bx + lean * 6 * u, Y - 22 * u);
      ctx.fillStyle = b[0]; poly(ctx, [bx - 1.8 * u, Y - 10 * u, bx + 1.8 * u, Y - 10 * u, bx + lean * 5 * u + 0.8 * u, Y - 20 * u, bx + lean * 5 * u - 0.8 * u, Y - 20 * u]); ctx.fill();
    });
    ctx.fillStyle = '#5A6E7A'; rr(ctx, X - 4.4 * u, Y - 11 * u, 8.8 * u, 11 * u, 1.2 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(X - 3.2 * u, Y - 10 * u, 1.4 * u, 9 * u);
  };
  /* a town's rooftops, seen over a railing */
  P.skyline = function (ctx, W, H, x, o) {
    var u = W / 100, fy = fl(H), r = rnd(o.seed || 7);
    for (var X = -2 * u; X < W;) {
      var w = (8 + r() * 10) * u, h = (8 + r() * 18) * u;
      ctx.fillStyle = r() > 0.5 ? '#9AA8C2' : '#8898B4'; ctx.fillRect(X, fy - h, w - 0.6 * u, h);
      ctx.fillStyle = 'rgba(255,244,200,0.75)';
      for (var wy = fy - h + 2 * u; wy < fy - 2 * u; wy += 3.4 * u) for (var wx = X + 1.4 * u; wx < X + w - 2.4 * u; wx += 3 * u) if (r() > 0.45) ctx.fillRect(wx, wy, 1.2 * u, 1.6 * u);
      X += w;
    }
  };
  /* a striped sun umbrella */
  P.parasol = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 4 * u, c = o.c || '#E74C3C', ax = X - 2 * u, ay = Y - 36 * u;
    pen(ctx, '#8A8E98', 0.8 * u); seg(ctx, X, Y, ax, ay + 2 * u);
    for (var i = 0; i < 6; i++) {
      var a0 = i * Math.PI / 6, a1 = a0 + Math.PI / 6;
      ctx.fillStyle = i % 2 ? '#FFFFFF' : c;
      poly(ctx, [ax, ay, ax - Math.cos(a0) * 16 * u, Y - 29 * u + Math.sin(a0) * 4 * u, ax - Math.cos(a1) * 16 * u, Y - 29 * u + Math.sin(a1) * 4 * u]); ctx.fill();
    }
  };
  /* coats on a row of hooks */
  P.coats = function (ctx, W, H, x, o) {
    var u = W / 100, Y = (o.y || 0.36) * H;
    ctx.fillStyle = '#8A5A36'; ctx.fillRect(W * (x - 0.2), Y - 1 * u, W * 0.4, 2 * u);
    [['#2E5A8A', -0.12], ['#C0392B', 0], ['#E8B330', 0.12]].forEach(function (c) {
      var X = W * (x + c[1]);
      pen(ctx, '#3A3E48', 0.6 * u); seg(ctx, X, Y, X, Y + 2 * u);
      ctx.fillStyle = c[0]; poly(ctx, [X - 2.4 * u, Y + 1.6 * u, X + 2.4 * u, Y + 1.6 * u, X + 5.4 * u, Y + 17 * u, X - 5.4 * u, Y + 17 * u]); ctx.fill();
      rr(ctx, X - 2.6 * u, Y + 0.4 * u, 5.2 * u, 3.4 * u, 1.6 * u); ctx.fill();
      ctx.fillStyle = shade(c[0], -0.25); ctx.fillRect(X - 0.3 * u, Y + 3.4 * u, 0.6 * u, 13.6 * u);
    });
  };
  /* wellies and shoes on a mat */
  P.wellies = function (ctx, W, H, x, o) {
    var u = W / 100, Y = fl(H) + 4 * u;
    ctx.fillStyle = '#8A6A48'; rr(ctx, W * (x - 0.17), Y - 0.8 * u, W * 0.34, 2.2 * u, 0.8 * u); ctx.fill();
    [['#2E6A3A', -12, 1], ['#2E6A3A', -7.4, 1], ['#D8432F', 0, 1], ['#D8432F', 4.6, 1], ['#7A4A28', 10.6, 0]].forEach(function (b) {
      var X = x * W + b[1] * u;
      ctx.fillStyle = b[0];
      if (b[2]) { rr(ctx, X - 2 * u, Y - 10 * u, 3.6 * u, 10 * u, 1 * u); ctx.fill(); rr(ctx, X - 2 * u, Y - 2.6 * u, 5.4 * u, 2.6 * u, 1.2 * u); ctx.fill(); ctx.fillStyle = shade(b[0], 0.25); ctx.fillRect(X - 2 * u, Y - 10 * u, 3.6 * u, 1 * u); }
      else { rr(ctx, X - 2.6 * u, Y - 3 * u, 6.2 * u, 3 * u, 1.4 * u); ctx.fill(); ctx.fillStyle = shade(b[0], -0.3); ctx.fillRect(X - 1 * u, Y - 3 * u, 2.6 * u, 1 * u); }
    });
  };
  /* a cushioned dog bed, with a bone in it */
  P.dogbed = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 6 * u, c = o.c || '#C0392B';
    ctx.fillStyle = shade(c, -0.22); ell(ctx, X, Y - 3 * u, 12 * u, 5 * u); ctx.fill();
    ctx.fillStyle = '#F2E6D2'; ell(ctx, X, Y - 3.4 * u, 9 * u, 3 * u); ctx.fill();
    ctx.fillStyle = '#F8F4EC'; ctx.fillRect(X + 1.6 * u, Y - 4.4 * u, 4.4 * u, 1 * u);
    [0, 1].forEach(function (k) { circ(ctx, X + 1.6 * u + k * 4.4 * u, Y - 4.6 * u, 0.8 * u); ctx.fill(); circ(ctx, X + 1.6 * u + k * 4.4 * u, Y - 3.6 * u, 0.8 * u); ctx.fill(); });
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(X, Y - 3 * u, 12 * u, 5 * u, 0, 0, Math.PI); ctx.lineTo(X - 9 * u, Y - 3 * u); ctx.ellipse(X, Y - 3 * u, 9 * u, 2.4 * u, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ell(ctx, X - 4 * u, Y, 4 * u, 0.8 * u); ctx.fill();
  };
  /* a wooden kennel with a red roof */
  P.kennel = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u, c = o.c || '#B8865A';
    ctx.fillStyle = c; ctx.fillRect(X - 11 * u, Y - 15 * u, 22 * u, 15 * u);
    poly(ctx, [X - 12 * u, Y - 14 * u, X, Y - 24 * u, X + 12 * u, Y - 14 * u]); ctx.fill();
    ctx.fillStyle = o.roof || '#C0392B'; poly(ctx, [X - 14.5 * u, Y - 13.4 * u, X, Y - 27 * u, X + 14.5 * u, Y - 13.4 * u, X + 12.5 * u, Y - 12.4 * u, X, Y - 24 * u, X - 12.5 * u, Y - 12.4 * u]); ctx.fill();
    pen(ctx, shade(c, -0.25), 0.4 * u);
    for (var i = 1; i < 4; i++) { seg(ctx, X - 11 * u, Y - 3.6 * i * u, X - 5.4 * u, Y - 3.6 * i * u); seg(ctx, X + 5.4 * u, Y - 3.6 * i * u, X + 11 * u, Y - 3.6 * i * u); }
    ctx.fillStyle = '#2A1E1A'; ctx.beginPath(); ctx.moveTo(X - 5 * u, Y); ctx.lineTo(X - 5 * u, Y - 7 * u); ctx.arc(X, Y - 7 * u, 5 * u, Math.PI, TAU); ctx.lineTo(X + 5 * u, Y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F4EEE4'; rr(ctx, X - 4 * u, Y - 19.6 * u, 8 * u, 3 * u, 0.8 * u); ctx.fill();
  };
  /* a ball on the floor, at the front */
  P.ball = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + (o.d || 11) * u, r = (o.r || 2.6) * u;
    ctx.fillStyle = 'rgba(25,18,30,0.18)'; ell(ctx, X, Y, r, r * 0.3); ctx.fill();
    ctx.fillStyle = o.c || '#C8E04A'; circ(ctx, X, Y - r, r); ctx.fill();
    pen(ctx, '#FFFFFF', 0.4 * u);
    ctx.beginPath(); ctx.arc(X - r * 1.05, Y - r, r * 0.8, -0.8, 0.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(X + r * 1.05, Y - r, r * 0.8, Math.PI - 0.8, Math.PI + 0.8); ctx.stroke();
  };
  /* a prize rosette pinned to the wall */
  P.rosette = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = (o.y || 0.42) * H, c = o.c || '#2E5AC8';
    ctx.fillStyle = c; poly(ctx, [X - 3.4 * u, Y, X - 0.6 * u, Y, X - 1.6 * u, Y + 12 * u, X - 4.4 * u, Y + 10 * u]); ctx.fill();
    poly(ctx, [X + 0.6 * u, Y, X + 3.4 * u, Y, X + 4.4 * u, Y + 10 * u, X + 1.6 * u, Y + 12 * u]); ctx.fill();
    for (var i = 0; i < 12; i++) { var a = i / 12 * TAU; ctx.fillStyle = i % 2 ? c : shade(c, 0.3); circ(ctx, X + Math.cos(a) * 4.2 * u, Y + Math.sin(a) * 4.2 * u, 1.9 * u); ctx.fill(); }
    ctx.fillStyle = '#F2D06A'; circ(ctx, X, Y, 3.4 * u); ctx.fill();
    ctx.fillStyle = '#5A3A10'; ctx.font = '800 ' + Math.round(2.6 * u) + 'px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.text || '1st', X, Y + 0.2 * u);
  };
  /* a gold cup on a plinth */
  P.bigtrophy = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u;
    ctx.fillStyle = '#5A3A22'; ctx.fillRect(X - 6 * u, Y - 6 * u, 12 * u, 6 * u);
    ctx.fillStyle = '#7A5230'; ctx.fillRect(X - 7 * u, Y - 7.4 * u, 14 * u, 1.6 * u);
    pen(ctx, '#E2B84A', 1 * u); ctx.beginPath(); ctx.arc(X - 5.6 * u, Y - 18 * u, 2.4 * u, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(X + 5.6 * u, Y - 18 * u, 2.4 * u, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    THINGS.trophy(ctx, X, Y - 7.4 * u, u * 2.4);
    star4(ctx, X + 4 * u, Y - 22 * u, (1 + 0.5 * Math.sin(t * 3)) * u, '#FFF4C0');
  };
  /* shelves of folded towels */
  P.towelshelves = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, cols = ['#F28AA0', '#7EC8E3', '#F2E6D2', '#B8E0A0', '#F2C230', '#FFFFFF'], r = rnd(13);
    [0.3, 0.46, 0.62].forEach(function (sy, si) {
      var Y = sy * H;
      ctx.fillStyle = '#C9A07A'; ctx.fillRect(X - 30 * u, Y, 60 * u, 1.6 * u);
      for (var k = 0; k < 4; k++) {
        var sx = X - 22.5 * u + k * 15 * u, n = 2 + Math.floor(r() * 2);
        for (var j = 0; j < n; j++) {
          ctx.fillStyle = cols[(si * 3 + k * 2 + j) % cols.length]; rr(ctx, sx - 5.6 * u, Y - (j + 1) * 2.6 * u, 11.2 * u, 2.4 * u, 1 * u); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(sx - 5.2 * u, Y - (j + 1) * 2.6 * u + 1.8 * u, 10.4 * u, 0.5 * u);
        }
      }
    });
  };
  /* a castle made of cardboard boxes, flags flying */
  P.boxcastle = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u, c = '#C9A06A', d = '#A8804A';
    var box = function (bx, bw, bh) {
      ctx.fillStyle = c; ctx.fillRect(bx, Y - bh, bw, bh);
      pen(ctx, d, 0.4 * u); ctx.strokeRect(bx, Y - bh, bw, bh); seg(ctx, bx + bw / 2, Y - bh, bx + bw / 2, Y - bh * 0.72);
      ctx.fillStyle = 'rgba(120,80,40,0.45)'; ctx.fillRect(bx + bw * 0.2, Y - bh * 0.9, bw * 0.6, 0.6 * u);
    };
    box(X - 27 * u, 14 * u, 23 * u); box(X + 13 * u, 14 * u, 23 * u); box(X - 13 * u, 26 * u, 15 * u);
    [X - 27 * u, X + 13 * u].forEach(function (tx, i) {
      ctx.fillStyle = c; for (var k = 0; k < 3; k++) ctx.fillRect(tx + k * 5.2 * u, Y - 26 * u, 3.6 * u, 3.2 * u);
      pen(ctx, '#6E4528', 0.6 * u); seg(ctx, tx + 7 * u, Y - 26 * u, tx + 7 * u, Y - 34 * u);
      ctx.fillStyle = i ? '#3498DB' : '#E74C3C'; poly(ctx, [tx + 7 * u, Y - 34 * u, tx + 12 * u, Y - (32.4 + Math.sin(t * 3 + i)) * u, tx + 7 * u, Y - 31 * u]); ctx.fill();
      ctx.fillStyle = '#3A2A1A'; var wx = tx + 7 * u; ctx.beginPath(); ctx.moveTo(wx - 2 * u, Y - 13 * u); ctx.lineTo(wx - 2 * u, Y - 16 * u); ctx.arc(wx, Y - 16 * u, 2 * u, Math.PI, TAU); ctx.lineTo(wx + 2 * u, Y - 13 * u); ctx.closePath(); ctx.fill();
    });
    ctx.fillStyle = '#3A2A1A'; ctx.beginPath(); ctx.moveTo(X - 4.4 * u, Y); ctx.lineTo(X - 4.4 * u, Y - 5 * u); ctx.arc(X, Y - 5 * u, 4.4 * u, Math.PI, TAU); ctx.lineTo(X + 4.4 * u, Y); ctx.closePath(); ctx.fill();
    pen(ctx, d, 0.5 * u); ctx.beginPath(); ctx.moveTo(X - 9 * u, Y - 15 * u); ctx.lineTo(X - 7 * u, Y - 13 * u); ctx.lineTo(X - 5 * u, Y - 15 * u); ctx.stroke();
  };
  /* rolled-up socks all over the floor */
  P.socks = function (ctx, W, H, x, o) {
    var u = W / 100, r = rnd(o.seed || 21), cols = ['#E74C3C', '#3498DB', '#F2C230', '#9B59B6', '#2ECC71', '#F4F4F4', '#E67E22'], list = [];
    for (var i = 0; i < 16; i++) list.push([r() * W, fl(H) + (1 + r() * 8) * u, cols[i % cols.length]]);
    list.sort(function (a, b) { return a[1] - b[1]; }).forEach(function (s) {
      ctx.fillStyle = s[2]; circ(ctx, s[0], s[1] - 2.6 * u, 2.9 * u); ctx.fill();
      ctx.fillStyle = s[2] === '#F4F4F4' ? 'rgba(200,60,60,0.6)' : 'rgba(255,255,255,0.55)';
      ctx.fillRect(s[0] - 2.7 * u, s[1] - 3.6 * u, 5.4 * u, 0.6 * u); ctx.fillRect(s[0] - 2.5 * u, s[1] - 2 * u, 5 * u, 0.6 * u);
    });
  };
  /* the front of a drawer, across the bottom: drawn after the animal */
  P.drawerfront = function (ctx, W, H, x, o) {
    var u = W / 100, Y = fl(H) + 14 * u, c = o.c || '#B8865A';
    ctx.fillStyle = c; ctx.fillRect(0, Y, W, H - Y);
    ctx.fillStyle = shade(c, 0.18); ctx.fillRect(0, Y, W, 1.4 * u);
    ctx.fillStyle = '#C9A44A'; rr(ctx, W / 2 - 7 * u, Y + 4 * u, 14 * u, 2.4 * u, 1.2 * u); ctx.fill();
  };
  /* wooden letter blocks */
  P.blocks = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 4 * u, cols = ['#E74C3C', '#3498DB', '#F2C230', '#2ECC71'], L = 'ABCD';
    [[-6.4, 0], [0.4, 0], [-3, -6.6], [7.2, 0]].forEach(function (b, i) {
      var bx = X + b[0] * u, by = Y + b[1] * u, s = 6.2 * u;
      ctx.fillStyle = cols[i]; ctx.fillRect(bx - s / 2, by - s, s, s);
      ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.font = '800 ' + Math.round(4 * u) + 'px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(L[i], bx, by - s / 2 + 0.3 * u);
    });
  };
  /* a toy train on its track, puffing */
  P.toytrain = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 5 * u;
    pen(ctx, '#8A6A48', 0.8 * u); seg(ctx, X - 21 * u, Y, X + 15 * u, Y);
    ctx.fillStyle = '#3498DB'; ctx.fillRect(X - 19 * u, Y - 6 * u, 10 * u, 5 * u); ctx.fillStyle = '#F2C230'; ctx.fillRect(X - 18 * u, Y - 8 * u, 8 * u, 2 * u);
    ctx.fillStyle = '#E74C3C'; ctx.fillRect(X - 6 * u, Y - 8 * u, 13 * u, 7 * u); ctx.fillRect(X - 6 * u, Y - 12.4 * u, 6 * u, 4.4 * u);
    ctx.fillStyle = '#2A2A2E'; ctx.fillRect(X + 3 * u, Y - 12 * u, 2.4 * u, 4 * u);
    [X - 17 * u, X - 11 * u, X - 3 * u, X + 4 * u].forEach(function (wx) { ctx.fillStyle = '#2A2A2E'; circ(ctx, wx, Y - 0.8 * u, 1.6 * u); ctx.fill(); });
    var p = (t * 0.4) % 1; ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - p)) + ')'; circ(ctx, X + 4.2 * u, Y - 14 * u - p * 8 * u, (1.2 + p * 2) * u); ctx.fill();
  };
  /* a big hamster wheel, turning */
  P.hamsterwheel = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u, R = 11 * u, cy = Y - 14 * u, a = t * 1.5, c = o.c || '#E74C3C';
    ctx.fillStyle = '#5A8AD0'; poly(ctx, [X - 1.6 * u, cy, X + 1.6 * u, cy, X + 6 * u, Y, X - 6 * u, Y]); ctx.fill();
    pen(ctx, c, 1.8 * u); circ(ctx, X, cy, R); ctx.stroke();
    pen(ctx, shade(c, 0.25), 0.5 * u);
    for (var i = 0; i < 18; i++) { var b = a + i * TAU / 18; seg(ctx, X + Math.cos(b) * (R - 2 * u), cy + Math.sin(b) * (R - 2 * u), X + Math.cos(b) * R, cy + Math.sin(b) * R); }
    pen(ctx, 'rgba(255,255,255,0.55)', 0.4 * u);
    for (var j = 0; j < 4; j++) { var b2 = a + j * Math.PI / 2; seg(ctx, X, cy, X + Math.cos(b2) * R, cy + Math.sin(b2) * R); }
    ctx.fillStyle = '#F2C230'; circ(ctx, X, cy, 1.6 * u); ctx.fill();
  };
  /* two little dumbbells */
  P.dumbbells = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 5 * u;
    [[-5, '#2E6DB4'], [4, '#E74C3C']].forEach(function (d) {
      var dx = X + d[0] * u;
      pen(ctx, '#8A8E98', 1 * u); seg(ctx, dx - 3.4 * u, Y - 2.2 * u, dx + 3.4 * u, Y - 2.2 * u);
      ctx.fillStyle = d[1]; rr(ctx, dx - 5 * u, Y - 4.6 * u, 2.6 * u, 4.8 * u, 0.8 * u); ctx.fill(); rr(ctx, dx + 2.4 * u, Y - 4.6 * u, 2.6 * u, 4.8 * u, 0.8 * u); ctx.fill();
    });
  };
  /* a cinema screen showing a film, with red curtains each side */
  P.screen = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = (o.y || 0.4) * H, w = (o.w || 60) * u, h = w * 0.42;
    glow(ctx, X, Y, w * 0.7, [200, 220, 255], 0.22);
    ctx.fillStyle = '#E8EEF8'; ctx.fillRect(X - w / 2, Y - h / 2, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(X - w / 2 + 1 * u, Y - h / 2 + 1 * u, w - 2 * u, h - 2 * u); ctx.clip();
    var g = ctx.createLinearGradient(0, Y - h / 2, 0, Y + h / 2); g.addColorStop(0, '#5B9BE6'); g.addColorStop(1, '#CFE6FB');
    ctx.fillStyle = g; ctx.fillRect(X - w / 2, Y - h / 2, w, h);
    K.cloud(ctx, X - w * 0.25, Y - h * 0.22, 4 * u, 'rgba(255,255,255,0.9)');
    ctx.fillStyle = '#4E8A44'; ctx.beginPath(); ctx.moveTo(X - w / 2, Y + h / 2); ctx.quadraticCurveTo(X - w * 0.1, Y, X + w * 0.2, Y + h * 0.25); ctx.quadraticCurveTo(X + w * 0.35, Y + h * 0.15, X + w / 2, Y + h * 0.3); ctx.lineTo(X + w / 2, Y + h / 2); ctx.fill();
    var rx = X - w / 2 - 6 * u + ((t * 0.1) % 1) * (w + 12 * u), ry = Y - h * 0.12;
    ctx.fillStyle = '#E74C3C'; ell(ctx, rx, ry, 3 * u, 1.2 * u); ctx.fill(); ctx.fillStyle = '#F2C230'; tri(ctx, rx - 2.8 * u, ry - 0.7 * u, rx - 5.6 * u, ry, rx - 2.8 * u, ry + 0.7 * u); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#8A1E2A'; ctx.fillRect(X - w / 2 - 5 * u, Y - h / 2 - 3 * u, 5 * u, h + 6 * u); ctx.fillRect(X + w / 2, Y - h / 2 - 3 * u, 5 * u, h + 6 * u);
  };
  /* the backs of a row of cinema seats */
  P.seats = function (ctx, W, H, x, o) {
    var u = W / 100, Y = fl(H) + 3 * u;
    for (var i = 0; i < 6; i++) {
      var X = W * (0.09 + i * 0.165);
      ctx.fillStyle = o.c || '#A3263A'; rr(ctx, X - 6.6 * u, Y - 14 * u, 13.2 * u, 12 * u, 3 * u); ctx.fill();
      ctx.fillStyle = shade(o.c || '#A3263A', -0.22); ctx.fillRect(X - 6.6 * u, Y - 4 * u, 13.2 * u, 4 * u);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, X - 4.8 * u, Y - 12.6 * u, 3 * u, 7 * u, 1.4 * u); ctx.fill();
    }
  };
  /* a striped box of popcorn */
  P.popcorn = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + (o.d || 11) * u, s = o.s || 1;
    ctx.save(); ctx.translate(X, Y); ctx.scale(s, s);
    ctx.fillStyle = '#FFFFFF'; poly(ctx, [-4.4 * u, -10 * u, 4.4 * u, -10 * u, 3.4 * u, 0, -3.4 * u, 0]); ctx.fill();
    ctx.fillStyle = '#E74C3C';
    for (var i = 0; i < 3; i++) { var a = -4.4 + i * 3.4, b = -3.4 + i * 2.6; poly(ctx, [a * u, -10 * u, (a + 1.6) * u, -10 * u, (b + 1.2) * u, 0, b * u, 0]); ctx.fill(); }
    ctx.fillStyle = '#FFF4D6';
    [[-3, -11], [-1, -12.4], [1.4, -11.6], [3.2, -11], [0, -10.6], [-2, -13.4], [2, -13.6], [0.4, -14.6]].forEach(function (p) { circ(ctx, p[0] * u, p[1] * u, 1.5 * u); ctx.fill(); });
    ctx.restore();
  };
  /* a round steel vault door */
  P.vaultdoor = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = (o.y || 0.5) * H, R = 15 * u;
    ctx.fillStyle = '#6E747E'; circ(ctx, X, Y, R + 2 * u); ctx.fill();
    var g = ctx.createRadialGradient(X - 4 * u, Y - 4 * u, 2 * u, X, Y, R); g.addColorStop(0, '#DDE1E8'); g.addColorStop(1, '#8A909A');
    ctx.fillStyle = g; circ(ctx, X, Y, R); ctx.fill();
    ctx.fillStyle = '#5A606A'; for (var i = 0; i < 12; i++) { var a = i * TAU / 12; circ(ctx, X + Math.cos(a) * (R - 2 * u), Y + Math.sin(a) * (R - 2 * u), 0.8 * u); ctx.fill(); }
    pen(ctx, '#C9A44A', 1.4 * u); circ(ctx, X, Y, 5 * u); ctx.stroke();
    for (var j = 0; j < 3; j++) { var b = j * TAU / 3 + Math.sin(t * 0.3) * 0.1; seg(ctx, X, Y, X + Math.cos(b) * 7.4 * u, Y + Math.sin(b) * 7.4 * u); }
    ctx.fillStyle = '#C9A44A'; circ(ctx, X, Y, 1.6 * u); ctx.fill();
  };
  /* a heap of sunflower seeds, glinting like treasure */
  P.seedpile = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + (o.d || 5) * u, r = rnd(o.seed || 41), s = o.s || 1;
    ctx.fillStyle = '#C9A86A'; ctx.beginPath(); ctx.ellipse(X, Y, 12 * u * s, 7 * u * s, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    for (var i = 0; i < 44 * s; i++) {
      var a = Math.PI + r() * Math.PI, k = Math.sqrt(r()), sx = X + Math.cos(a) * 11 * u * s * k, sy = Y + Math.sin(a) * 6.4 * u * s * k, rot = r() * 3;
      ctx.fillStyle = '#2A2626'; ell(ctx, sx, sy, 0.8 * u, 1.5 * u, rot); ctx.fill();
      pen(ctx, 'rgba(232,226,214,0.9)', 0.25 * u); seg(ctx, sx - Math.sin(rot) * 1.1 * u, sy + Math.cos(rot) * 1.1 * u, sx + Math.sin(rot) * 1.1 * u, sy - Math.cos(rot) * 1.1 * u);
    }
    for (var j = 0; j < 3; j++) star4(ctx, X + (r() - 0.5) * 16 * u * s, Y - r() * 6 * u * s, (0.8 + 0.6 * Math.sin(t * 3 + j * 2)) * u, '#FFF4C0');
  };
  /* a little wooden hidey house */
  P.hidey = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 4 * u;
    ctx.fillStyle = '#C9A06A'; ctx.fillRect(X - 9 * u, Y - 10 * u, 18 * u, 10 * u);
    ctx.fillStyle = '#A8804A'; poly(ctx, [X - 11 * u, Y - 9 * u, X, Y - 17 * u, X + 11 * u, Y - 9 * u]); ctx.fill();
    ctx.fillStyle = '#3A2A1A'; ctx.beginPath(); ctx.arc(X, Y, 5 * u, Math.PI, TAU); ctx.closePath(); ctx.fill();
    pen(ctx, '#A8804A', 0.4 * u); seg(ctx, X - 9 * u, Y - 5 * u, X - 5.6 * u, Y - 5 * u); seg(ctx, X + 5.6 * u, Y - 5 * u, X + 9 * u, Y - 5 * u);
  };
  /* a market stall of vegetables */
  P.vegstall = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u;
    ctx.fillStyle = '#8A5A36'; ctx.fillRect(X - 34 * u, Y - 12 * u, 68 * u, 2.4 * u); ctx.fillRect(X - 32 * u, Y - 10 * u, 2 * u, 10 * u); ctx.fillRect(X + 30 * u, Y - 10 * u, 2 * u, 10 * u);
    var crate = function (cx, fill) { ctx.fillStyle = '#C9A06A'; ctx.fillRect(cx - 7.5 * u, Y - 18 * u, 15 * u, 6 * u); pen(ctx, '#A8804A', 0.4 * u); seg(ctx, cx - 7.5 * u, Y - 15 * u, cx + 7.5 * u, Y - 15 * u); fill(cx, Y - 18 * u); };
    crate(X - 24 * u, function (cx, cy) { for (var i = 0; i < 3; i++) { ctx.fillStyle = '#7CC24A'; circ(ctx, cx - 4.4 * u + i * 4.4 * u, cy - 1 * u, 3 * u); ctx.fill(); ctx.fillStyle = '#A8DA70'; circ(ctx, cx - 5 * u + i * 4.4 * u, cy - 1.6 * u, 1.6 * u); ctx.fill(); } });
    crate(X - 8 * u, function (cx, cy) { for (var i = 0; i < 5; i++) THINGS.carrot(ctx, cx - 5 * u + i * 2.5 * u, cy + 1 * u, u * 0.9); });
    crate(X + 8 * u, function (cx, cy) { ['#E74C3C', '#F2C230', '#2ECC71'].forEach(function (c, i) { ctx.fillStyle = c; rr(ctx, cx - 5.6 * u + i * 4 * u, cy - 4 * u, 3.2 * u, 4 * u, 1.4 * u); ctx.fill(); ctx.fillStyle = '#3E7A3A'; ctx.fillRect(cx - 4.4 * u + i * 4 * u, cy - 5 * u, 0.8 * u, 1.2 * u); }); });
    crate(X + 24 * u, function (cx, cy) { for (var i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? '#4E9A44' : '#3E8A3A'; rr(ctx, cx - 6 * u, cy - 1.8 * u - i * 1.8 * u, 12 * u, 1.8 * u, 0.9 * u); ctx.fill(); } });
    pen(ctx, '#8A5A36', 0.6 * u); seg(ctx, X, Y - 18 * u, X, Y - 22 * u);
    ctx.fillStyle = '#F6F0E2'; rr(ctx, X - 6 * u, Y - 27 * u, 12 * u, 5 * u, 1 * u); ctx.fill();
    ctx.fillStyle = '#2E5A3A'; ctx.font = '800 ' + Math.round(2.6 * u) + 'px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FRESH', X, Y - 24.4 * u);
  };
  /* a ball pit */
  P.ballpit = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 5 * u, r = rnd(31), cols = ['#E74C3C', '#3498DB', '#F2C230', '#2ECC71', '#9B59B6', '#FF8AB0'];
    ctx.fillStyle = '#3E6AB0'; rr(ctx, X - 16 * u, Y - 10 * u, 32 * u, 4 * u, 1.6 * u); ctx.fill();
    for (var i = 0; i < 30; i++) { ctx.fillStyle = cols[i % cols.length]; circ(ctx, X - 14 * u + r() * 28 * u, Y - 8 * u - r() * 3.4 * u, 1.9 * u); ctx.fill(); }
    ctx.fillStyle = '#5A8AD0'; rr(ctx, X - 16 * u, Y - 7.4 * u, 32 * u, 7.4 * u, 2 * u); ctx.fill();
    ctx.fillStyle = '#F2C230'; ctx.fillRect(X - 16 * u, Y - 7.4 * u, 32 * u, 1.4 * u);
  };
  /* a play tunnel */
  P.tunnel = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 4 * u, c = o.c || '#E74C3C';
    ctx.fillStyle = c; rr(ctx, X - 12 * u, Y - 12 * u, 24 * u, 12 * u, 6 * u); ctx.fill();
    pen(ctx, shade(c, -0.25), 0.6 * u);
    for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(X + i * 4.4 * u, Y - 6 * u, 1.6 * u, 6 * u, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
    ctx.fillStyle = shade(c, -0.15); ell(ctx, X + 12 * u, Y - 6 * u, 3.2 * u, 6 * u); ctx.fill();
    ctx.fillStyle = '#2A1E2A'; ell(ctx, X + 12 * u, Y - 6 * u, 2.2 * u, 4.8 * u); ctx.fill();
  };
  /* a hairdresser's chair */
  P.salonchair = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u, c = o.c || '#2A2A34';
    ctx.fillStyle = '#B8BEC8'; ell(ctx, X, Y, 6 * u, 1.4 * u); ctx.fill(); ctx.fillRect(X - 1 * u, Y - 8 * u, 2 * u, 8 * u);
    ctx.fillStyle = c; rr(ctx, X - 7 * u, Y - 12 * u, 14 * u, 4.4 * u, 2 * u); ctx.fill(); rr(ctx, X - 7.4 * u, Y - 25 * u, 4.6 * u, 14 * u, 2.2 * u); ctx.fill();
    rr(ctx, X + 3.4 * u, Y - 15.4 * u, 4.6 * u, 1.8 * u, 0.9 * u); ctx.fill();
  };
  /* a hood hairdryer on a stand */
  P.hairdryer = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u;
    ctx.fillStyle = '#B8BEC8'; ell(ctx, X, Y, 5 * u, 1.2 * u); ctx.fill();
    pen(ctx, '#B8BEC8', 1.2 * u); seg(ctx, X, Y, X, Y - 22 * u); seg(ctx, X, Y - 22 * u, X - 4 * u, Y - 24 * u);
    ctx.fillStyle = o.c || '#F28AAE'; ctx.beginPath(); ctx.ellipse(X - 6 * u, Y - 26 * u, 8 * u, 6.4 * u, -0.3, Math.PI * 0.85, Math.PI * 2.15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ell(ctx, X - 8 * u, Y - 29 * u, 3 * u, 1.4 * u, -0.3); ctx.fill();
  };
  /* a bunch of party balloons */
  P.balloons = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = (o.y || 0.44) * H;
    [['#E74C3C', -4, -6], ['#3498DB', 3, -8], ['#F2C230', 0, -12.4], ['#2ECC71', 6.4, -2], ['#FF8AB0', -7, -1]].forEach(function (b, i) {
      var bx = X + b[1] * u + Math.sin(t * 1.2 + i) * 0.6 * u, by = Y + b[2] * u;
      pen(ctx, 'rgba(90,90,100,0.6)', 0.3 * u); seg(ctx, bx, by + 4 * u, X, Y + 16 * u);
      ctx.fillStyle = b[0]; ell(ctx, bx, by, 3.4 * u, 4.2 * u); ctx.fill();
      tri(ctx, bx - 0.8 * u, by + 4.6 * u, bx + 0.8 * u, by + 4.6 * u, bx, by + 3.6 * u); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ell(ctx, bx - 1.2 * u, by - 1.6 * u, 0.9 * u, 1.4 * u, -0.4); ctx.fill();
    });
  };
  /* lily pads on the water's surface, seen from underneath */
  P.lilypads = function (ctx, W, H, x, o, t) {
    var u = W / 100;
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(0, 0, W, H * 0.07);
    [[0.18, 0.07], [0.48, 0.06], [0.8, 0.08]].forEach(function (p, i) {
      var X = p[0] * W, Y = p[1] * H;
      pen(ctx, 'rgba(60,110,50,0.8)', 0.6 * u); ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + Math.sin(t + i) * 3 * u, Y + 20 * u, X - 2 * u, fl(H) + 2 * u); ctx.stroke();
      ctx.fillStyle = '#3E7A3A'; ell(ctx, X, Y, 9 * u, 1.8 * u); ctx.fill();
      if (i === 1) { ctx.fillStyle = '#F6C6D6'; ell(ctx, X + 2 * u, Y - 1.8 * u, 2.2 * u, 1.4 * u); ctx.fill(); }
    });
  };
  /* water weed swaying up from the bottom */
  P.weeds = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + (o.d || 4) * u, c = o.c || '#3E8A4A';
    for (var i = 0; i < 5; i++) {
      var bx = X + (i - 2) * 2.4 * u, h = (18 + (i % 3) * 7) * u * (o.s || 1), sw = Math.sin(t * 1.2 + i) * 2 * u;
      pen(ctx, i % 2 ? c : shade(c, 0.18), 1.6 * u); ctx.beginPath(); ctx.moveTo(bx, Y); ctx.quadraticCurveTo(bx + sw + (i - 2) * u, Y - h * 0.5, bx + sw * 1.6, Y - h); ctx.stroke();
    }
  };
  /* a fish tank castle */
  P.castleorn = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 4 * u, c = o.c || '#B8B0C8', dk = shade(c, -0.5);
    ctx.fillStyle = c; ctx.fillRect(X - 10 * u, Y - 14 * u, 20 * u, 14 * u); ctx.fillRect(X - 13 * u, Y - 22 * u, 7 * u, 22 * u); ctx.fillRect(X + 6 * u, Y - 22 * u, 7 * u, 22 * u);
    for (var k = 0; k < 2; k++) { ctx.fillRect(X - 13 * u + k * 4.4 * u, Y - 24.4 * u, 2.6 * u, 2.6 * u); ctx.fillRect(X + 6 * u + k * 4.4 * u, Y - 24.4 * u, 2.6 * u, 2.6 * u); }
    pen(ctx, shade(c, -0.2), 0.4 * u); for (var j = 1; j < 4; j++) seg(ctx, X - 10 * u, Y - j * 3.4 * u, X + 10 * u, Y - j * 3.4 * u);
    ctx.fillStyle = dk; ctx.beginPath(); ctx.moveTo(X - 4 * u, Y); ctx.lineTo(X - 4 * u, Y - 6 * u); ctx.arc(X, Y - 6 * u, 4 * u, Math.PI, TAU); ctx.lineTo(X + 4 * u, Y); ctx.closePath(); ctx.fill();
    rr(ctx, X - 10.6 * u, Y - 17 * u, 2 * u, 3.4 * u, 1 * u); ctx.fill(); rr(ctx, X + 8.6 * u, Y - 17 * u, 2 * u, 3.4 * u, 1 * u); ctx.fill();
    pen(ctx, '#5A5E68', 0.4 * u); seg(ctx, X + 9.5 * u, Y - 24 * u, X + 9.5 * u, Y - 30 * u);
    ctx.fillStyle = '#E74C3C'; poly(ctx, [X + 9.5 * u, Y - 30 * u, X + 13 * u, Y - (29 + Math.sin(t * 2) * 0.4) * u, X + 9.5 * u, Y - 28 * u]); ctx.fill();
    for (var b = 0; b < 2; b++) { var p = (t * 0.3 + b * 0.5) % 1; pen(ctx, 'rgba(255,255,255,' + (0.8 * (1 - p)) + ')', 0.35 * u); circ(ctx, X + Math.sin(p * 7) * u, Y - 8 * u - p * 30 * u, (0.8 + p) * u); ctx.stroke(); }
  };
  /* a bell toy hanging on a string */
  P.bell = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = (o.y || 0.5) * H, sw = Math.sin(t * 2) * 0.15;
    pen(ctx, '#8A8E98', 0.4 * u); seg(ctx, X, 0, X, Y - 4 * u);
    ctx.save(); ctx.translate(X, Y - 4 * u); ctx.rotate(sw);
    ctx.fillStyle = '#E2B84A'; ctx.beginPath(); ctx.moveTo(-3 * u, 5 * u); ctx.quadraticCurveTo(-3 * u, 0, 0, 0); ctx.quadraticCurveTo(3 * u, 0, 3 * u, 5 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#C99A2A'; circ(ctx, 0, 5.4 * u, 1 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(ctx, -1.2 * u, 2 * u, 0.6 * u, 1.4 * u); ctx.fill();
    ctx.restore();
  };
  /* a dressing table */
  P.dresser = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 2 * u, c = o.c || '#F2E6EE';
    ctx.fillStyle = c; ctx.fillRect(X - 16 * u, Y - 14 * u, 32 * u, 3 * u); ctx.fillRect(X - 16 * u, Y - 11 * u, 9 * u, 11 * u); ctx.fillRect(X + 7 * u, Y - 11 * u, 9 * u, 11 * u);
    pen(ctx, shade(c, -0.18), 0.4 * u);
    [[-15, -10], [-15, -5], [8, -10], [8, -5]].forEach(function (d) { ctx.strokeRect(X + d[0] * u, Y + d[1] * u, 7 * u, 4 * u); });
    THINGS.bottle(ctx, X - 11 * u, Y - 14 * u, u); THINGS.flowers(ctx, X + 11 * u, Y - 14 * u, u, o, 1);
    ctx.fillStyle = '#F28AAE'; rr(ctx, X - 3 * u, Y - 15.6 * u, 6 * u, 1.6 * u, 0.8 * u); ctx.fill();
  };
  /* a swing set */
  P.swings = function (ctx, W, H, x, o, t) {
    var u = W / 100, X = x * W, Y = fl(H) + 3 * u, top = Y - 32 * u;
    pen(ctx, o.c || '#2E6DB4', 1.6 * u);
    seg(ctx, X - 27 * u, Y, X - 23 * u, top); seg(ctx, X - 19 * u, Y, X - 23 * u, top); seg(ctx, X + 27 * u, Y, X + 23 * u, top); seg(ctx, X + 19 * u, Y, X + 23 * u, top); seg(ctx, X - 23 * u, top, X + 23 * u, top);
    [-10, 10].forEach(function (sx, i) {
      var a = Math.sin(t * 1.4 + i * 2) * 0.18, L = 22 * u, bx = X + sx * u + Math.sin(a) * L, by = top + Math.cos(a) * L;
      pen(ctx, '#8A8E98', 0.4 * u); seg(ctx, X + sx * u - 3 * u, top, bx - 3 * u, by); seg(ctx, X + sx * u + 3 * u, top, bx + 3 * u, by);
      ctx.fillStyle = i ? '#E74C3C' : '#F2C230'; rr(ctx, bx - 4 * u, by - 0.4 * u, 8 * u, 1.6 * u, 0.6 * u); ctx.fill();
    });
  };
  /* a race's finishing line and banner */
  P.finish = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, fy = fl(H), n = 8;
    for (var i = 0; i < n; i++) for (var j = 0; j < 2; j++) {
      var y0 = fy + i * (H - fy) / n, y1 = fy + (i + 1) * (H - fy) / n, xs = X + (y0 - fy) * 0.35 + j * 2.4 * u;
      ctx.fillStyle = (i + j) % 2 ? '#FFFFFF' : '#2A2A2E'; ctx.fillRect(xs - 2.4 * u, y0, 2.4 * u, y1 - y0 + 0.3 * u);
    }
    pen(ctx, '#8A8E98', 0.8 * u); seg(ctx, X - 4 * u, fy + 1 * u, X - 4 * u, fy - 26 * u); seg(ctx, X + 18 * u, fy + 6 * u, X + 18 * u, fy - 21 * u);
    ctx.fillStyle = '#F6F0E2'; poly(ctx, [X - 4 * u, fy - 26 * u, X + 18 * u, fy - 21 * u, X + 18 * u, fy - 15 * u, X - 4 * u, fy - 20 * u]); ctx.fill();
    ctx.save(); ctx.translate(X + 7 * u, fy - 20.6 * u); ctx.rotate(0.22);
    ctx.fillStyle = '#C8202A'; ctx.font = '800 ' + Math.round(3.6 * u) + 'px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FINISH', 0, 0);
    ctx.restore();
  };
  /* a picnic: a checked blanket, a hamper and a bowl of strawberries */
  P.picnic = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + 6 * u;
    ctx.save(); poly(ctx, [X - 32 * u, Y + 9 * u, X + 32 * u, Y + 9 * u, X + 24 * u, Y - 4 * u, X - 24 * u, Y - 4 * u]); ctx.clip();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(X - 32 * u, Y - 4 * u, 64 * u, 13 * u);
    ctx.fillStyle = 'rgba(214,50,50,0.55)';
    for (var i = -8; i < 8; i++) ctx.fillRect(X + i * 4 * u, Y - 4 * u, 2 * u, 13 * u);
    for (var j = 0; j < 4; j++) ctx.fillRect(X - 32 * u, Y - 4 * u + j * 3.4 * u, 64 * u, 1.7 * u);
    ctx.restore();
    // the hamper
    var hx = X - 17 * u, hy = Y - 1 * u;
    pen(ctx, '#8A5A2A', 0.8 * u); ctx.beginPath(); ctx.arc(hx, hy - 7 * u, 4 * u, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = '#C9965A'; ctx.fillRect(hx - 6 * u, hy - 7 * u, 12 * u, 7 * u);
    pen(ctx, '#A8743A', 0.4 * u); for (var k = 1; k < 3; k++) seg(ctx, hx - 6 * u, hy - 7 * u + k * 2.3 * u, hx + 6 * u, hy - 7 * u + k * 2.3 * u);
    // strawberries in a bowl
    var bx = X + 17 * u, by = Y;
    [[-2.4, -3.2], [0, -4], [2.4, -3.2], [-1.2, -5], [1.2, -5.2]].forEach(function (p) { THINGS.strawberry(ctx, bx + p[0] * u, by + p[1] * u + 2.4 * u, u); });
    ctx.fillStyle = '#F2F4F8'; ctx.beginPath(); ctx.ellipse(bx, by - 2.4 * u, 5 * u, 2.6 * u, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
  };
  /* stones in a rockery, with flowers between */
  P.stones = function (ctx, W, H, x, o) {
    var u = W / 100;
    [[x - 0.16, 3, 11, 8, '#A8A094'], [x + 0.02, 5, 15, 10, '#9A948A'], [x + 0.18, 2, 10, 7, '#B8B2A6']].forEach(function (s) { K.rock(ctx, s[0] * W, fl(H) + s[1] * u, s[2] * u, s[3] * u, s[4]); });
    ['#B07AC0', '#F2C230', '#FFFFFF', '#E84A6A'].forEach(function (c, i) { pen(ctx, '#4E8A3A', 0.5 * u); var fx = W * (x - 0.22 + i * 0.13), fy2 = fl(H) + (2 + (i % 2) * 2) * u; seg(ctx, fx, fy2, fx, fy2 - 4 * u); K.flower(ctx, fx, fy2 - 4.4 * u, 1.3 * u, c); });
  };

  /* a perch on a stand, for a bird to stand on: its top is h units above the floor line, less d */
  P.perchstand = function (ctx, W, H, x, o) {
    var u = W / 100, X = x * W, Y = fl(H) + (o.d || 6) * u, top = Y - (o.h || 22) * u;
    ctx.fillStyle = '#8A6A48'; ell(ctx, X, Y, 7 * u, 1.6 * u); ctx.fill();
    pen(ctx, '#8A6A48', 1.4 * u); seg(ctx, X, Y, X, top);
    pen(ctx, '#B8865A', 1.6 * u); seg(ctx, X - 9 * u, top, X + 9 * u, top);
    ctx.fillStyle = '#E8E0D0'; ctx.beginPath(); ctx.ellipse(X + 7 * u, top + 0.8 * u, 2.4 * u, 1.8 * u, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
  };
  /* small things on tables, shelves and counters: drawn sitting on (x, y) */
  var THINGS = {
    teapot: function (ctx, x, y, u) { ctx.fillStyle = '#F2F4F8'; ell(ctx, x, y - 3 * u, 3.6 * u, 3 * u); ctx.fill(); pen(ctx, '#F2F4F8', 0.8 * u); seg(ctx, x + 3 * u, y - 3 * u, x + 5.4 * u, y - 5 * u); ctx.beginPath(); ctx.arc(x - 3.6 * u, y - 3 * u, 1.6 * u, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke(); ctx.fillStyle = '#5B8FD8'; ctx.fillRect(x - 3 * u, y - 3.5 * u, 6 * u, 0.8 * u); },
    cup: function (ctx, x, y, u) { ctx.fillStyle = '#FFFFFF'; rr(ctx, x - 1.6 * u, y - 3 * u, 3.2 * u, 3 * u, 0.6 * u); ctx.fill(); pen(ctx, '#FFFFFF', 0.5 * u); ctx.beginPath(); ctx.arc(x + 1.8 * u, y - 1.6 * u, 0.9 * u, -1.4, 1.4); ctx.stroke(); },
    cake: function (ctx, x, y, u) { ctx.fillStyle = '#F6D7B0'; ctx.fillRect(x - 4 * u, y - 4 * u, 8 * u, 4 * u); ctx.fillStyle = '#F28AA0'; ctx.fillRect(x - 4 * u, y - 5 * u, 8 * u, 1.4 * u); ctx.fillStyle = '#C8202A'; circ(ctx, x, y - 5.6 * u, 0.9 * u); ctx.fill(); },
    stand: function (ctx, x, y, u) { pen(ctx, '#C9A44A', 0.5 * u); seg(ctx, x, y, x, y - 9 * u); [0, 4.5].forEach(function (dy, i) { ctx.fillStyle = '#FFFFFF'; ell(ctx, x, y - 2 * u - dy * u, (4 - i) * u, 0.7 * u); ctx.fill(); ctx.fillStyle = i ? '#F28AA0' : '#F6D7B0'; circ(ctx, x - 1.4 * u, y - 3.2 * u - dy * u, 1 * u); ctx.fill(); circ(ctx, x + 1.4 * u, y - 3.2 * u - dy * u, 1 * u); ctx.fill(); }); },
    honey: function (ctx, x, y, u) { ctx.fillStyle = 'rgba(240,170,40,0.9)'; rr(ctx, x - 2 * u, y - 5 * u, 4 * u, 5 * u, 1 * u); ctx.fill(); ctx.fillStyle = '#E8DCC2'; ctx.fillRect(x - 2.2 * u, y - 5.8 * u, 4.4 * u, 1.4 * u); },
    jar: function (ctx, x, y, u, o, i) { var cols = ['#E8A33A', '#C0392B', '#7EC8E3', '#5FA050']; ctx.fillStyle = 'rgba(220,235,250,0.8)'; rr(ctx, x - 2 * u, y - 5 * u, 4 * u, 5 * u, 1 * u); ctx.fill(); ctx.fillStyle = cols[(i || 0) % 4]; rr(ctx, x - 1.6 * u, y - 3 * u, 3.2 * u, 2.6 * u, 0.6 * u); ctx.fill(); ctx.fillStyle = '#C9A44A'; ctx.fillRect(x - 2.2 * u, y - 5.8 * u, 4.4 * u, 1.2 * u); },
    sweets: function (ctx, x, y, u, o, i) { var cols = ['#FF5A8A', '#5AD8FF', '#FFE45A', '#8AFF7A', '#B07AFF']; ctx.fillStyle = 'rgba(230,240,255,0.7)'; rr(ctx, x - 2.6 * u, y - 7 * u, 5.2 * u, 7 * u, 1.2 * u); ctx.fill(); for (var k = 0; k < 5; k++) { ctx.fillStyle = cols[(k + (i || 0)) % 5]; circ(ctx, x - 1.2 * u + (k % 2) * 2.4 * u, y - 1.4 * u - Math.floor(k / 2) * 1.8 * u, 1 * u); ctx.fill(); } ctx.fillStyle = '#E2E6EE'; ctx.fillRect(x - 2.8 * u, y - 7.8 * u, 5.6 * u, 1.2 * u); },
    pot: function (ctx, x, y, u) { ctx.fillStyle = '#C66B3D'; poly(ctx, [x - 2 * u, y - 4 * u, x + 2 * u, y - 4 * u, x + 1.5 * u, y, x - 1.5 * u, y]); ctx.fill(); ctx.fillStyle = '#3E8E4A'; ell(ctx, x - 1 * u, y - 5.4 * u, 1.6 * u, 0.8 * u, -0.5); ctx.fill(); ell(ctx, x + 1 * u, y - 5.4 * u, 1.6 * u, 0.8 * u, 0.5); ctx.fill(); },
    flowers: function (ctx, x, y, u, o, i) { var cols = ['#E84A6A', '#F2C230', '#B07AFF', '#FF8A3A']; ctx.fillStyle = '#7EC8E3'; rr(ctx, x - 2 * u, y - 4 * u, 4 * u, 4 * u, 0.8 * u); ctx.fill(); for (var k = 0; k < 3; k++) K.flower(ctx, x + (k - 1) * 1.6 * u, y - 3 * u, 0.9 * u, cols[(k + (i || 0)) % 4]); },
    bread: function (ctx, x, y, u) { ctx.fillStyle = '#D9A05A'; ell(ctx, x, y - 2 * u, 4 * u, 2.4 * u); ctx.fill(); pen(ctx, '#B87A3A', 0.4 * u); for (var k = -1; k <= 1; k++) seg(ctx, x + k * 1.6 * u - 0.6 * u, y - 3.6 * u, x + k * 1.6 * u + 0.6 * u, y - 1.2 * u); },
    milk: function (ctx, x, y, u) { ctx.fillStyle = '#FFFFFF'; rr(ctx, x - 1.5 * u, y - 6 * u, 3 * u, 6 * u, 1 * u); ctx.fill(); ctx.fillStyle = '#3E7FD8'; ctx.fillRect(x - 1.5 * u, y - 6.6 * u, 3 * u, 1.2 * u); },
    icecream: function (ctx, x, y, u, o, i) { var cols = ['#F7B8C8', '#FFF0C8', '#8A5A3A', '#B8E8C8']; ctx.fillStyle = '#D9A05A'; tri(ctx, x - 1.6 * u, y - 4 * u, x + 1.6 * u, y - 4 * u, x, y); ctx.fill(); ctx.fillStyle = cols[(i || 0) % 4]; circ(ctx, x, y - 5 * u, 2 * u); ctx.fill(); },
    tub: function (ctx, x, y, u, o, i) { var cols = ['#F7B8C8', '#FFF0C8', '#8A5A3A', '#B8E8C8', '#FFD24A']; ctx.fillStyle = '#E8EEF2'; ctx.fillRect(x - 3 * u, y - 2.4 * u, 6 * u, 2.4 * u); ctx.fillStyle = cols[(i || 0) % 5]; ell(ctx, x, y - 2.6 * u, 2.8 * u, 1.4 * u); ctx.fill(); },
    fish: function (ctx, x, y, u) { ctx.fillStyle = '#9AB0C4'; ell(ctx, x, y - 1.4 * u, 3.4 * u, 1.4 * u); ctx.fill(); tri(ctx, x - 3.2 * u, y - 1.4 * u, x - 5 * u, y - 3 * u, x - 5 * u, y + 0.2 * u); ctx.fill(); ctx.fillStyle = '#1F2433'; circ(ctx, x + 2 * u, y - 1.8 * u, 0.4 * u); ctx.fill(); },
    chips: function (ctx, x, y, u) { ctx.fillStyle = '#F2F2F2'; poly(ctx, [x - 3 * u, y - 5 * u, x + 3 * u, y - 5 * u, x + 2 * u, y, x - 2 * u, y]); ctx.fill(); ctx.fillStyle = '#E8B33A'; for (var k = 0; k < 5; k++) ctx.fillRect(x - 2.4 * u + k * 1.1 * u, y - 7 * u - (k % 2) * u, 0.8 * u, 3 * u); },
    shell: function (ctx, x, y, u, o, i) { ctx.fillStyle = ['#F6D0B8', '#FFFFFF', '#F2B8C6'][(i || 0) % 3]; ctx.beginPath(); ctx.moveTo(x - 2.4 * u, y); ctx.quadraticCurveTo(x, y - 4.6 * u, x + 2.4 * u, y); ctx.closePath(); ctx.fill(); },
    carrot: function (ctx, x, y, u) { ctx.fillStyle = '#F07A20'; tri(ctx, x - 1.4 * u, y - 5 * u, x + 1.4 * u, y - 5 * u, x, y); ctx.fill(); ctx.fillStyle = '#3E8E4A'; tri(ctx, x - 1 * u, y - 5 * u, x, y - 7.4 * u, x + 1 * u, y - 5 * u); ctx.fill(); },
    acorn: function (ctx, x, y, u) { ctx.fillStyle = '#B8863A'; ell(ctx, x, y - 1.8 * u, 1.6 * u, 2 * u); ctx.fill(); ctx.fillStyle = '#6E4528'; ell(ctx, x, y - 3.4 * u, 1.9 * u, 0.9 * u); ctx.fill(); },
    nuts: function (ctx, x, y, u) { ctx.fillStyle = '#C69A5A'; [[-1.4, 0], [1.4, 0], [0, -1.6]].forEach(function (p) { ell(ctx, x + p[0] * u, y - 1.2 * u + p[1] * u, 1.4 * u, 1 * u); ctx.fill(); }); },
    letter: function (ctx, x, y, u) { ctx.fillStyle = '#F6F0E2'; ctx.fillRect(x - 2.6 * u, y - 3.6 * u, 5.2 * u, 3.6 * u); pen(ctx, '#C9B9A2', 0.3 * u); seg(ctx, x - 2.6 * u, y - 3.6 * u, x, y - 1.6 * u); seg(ctx, x + 2.6 * u, y - 3.6 * u, x, y - 1.6 * u); },
    parcel: function (ctx, x, y, u) { ctx.fillStyle = '#B8865A'; ctx.fillRect(x - 2.4 * u, y - 4 * u, 4.8 * u, 4 * u); pen(ctx, '#8A5A2A', 0.4 * u); seg(ctx, x, y - 4 * u, x, y); },
    book: function (ctx, x, y, u) { ctx.fillStyle = '#2E6DB4'; ctx.fillRect(x - 3 * u, y - 1.4 * u, 6 * u, 1.4 * u); ctx.fillStyle = '#C0392B'; ctx.fillRect(x - 2.6 * u, y - 2.6 * u, 5.4 * u, 1.2 * u); },
    candle: function (ctx, x, y, u) { ctx.fillStyle = '#F6F0E2'; ctx.fillRect(x - 0.8 * u, y - 4 * u, 1.6 * u, 4 * u); ctx.fillStyle = '#FFB547'; ell(ctx, x, y - 5 * u, 0.6 * u, 1.1 * u); ctx.fill(); },
    map: function (ctx, x, y, u) { ctx.fillStyle = '#E8D8A8'; ctx.fillRect(x - 5 * u, y - 0.8 * u, 10 * u, 0.8 * u); pen(ctx, '#C0392B', 0.4 * u); seg(ctx, x - 2 * u, y - 0.4 * u, x + 2 * u, y - 0.4 * u); },
    bottle: function (ctx, x, y, u) { ctx.fillStyle = 'rgba(180,220,200,0.8)'; rr(ctx, x - 1.6 * u, y - 5 * u, 3.2 * u, 5 * u, 1 * u); ctx.fill(); ctx.fillRect(x - 0.6 * u, y - 7 * u, 1.2 * u, 2 * u); ctx.fillStyle = '#FFFFFF'; tri(ctx, x - 0.8 * u, y - 1.4 * u, x + 0.8 * u, y - 1.4 * u, x, y - 3.6 * u); ctx.fill(); },
    lamp: function (ctx, x, y, u) { glow(ctx, x, y - 5 * u, 8 * u, [255, 220, 150], 0.35); ctx.fillStyle = '#3A3530'; ctx.fillRect(x - 0.4 * u, y - 4 * u, 0.8 * u, 4 * u); ctx.fillStyle = '#F2D58A'; poly(ctx, [x - 2.6 * u, y - 4 * u, x + 2.6 * u, y - 4 * u, x + 1.6 * u, y - 7.4 * u, x - 1.6 * u, y - 7.4 * u]); ctx.fill(); },
    bamboo: function (ctx, x, y, u) { ctx.fillStyle = '#7AB04A'; ctx.fillRect(x - 0.8 * u, y - 8 * u, 1.6 * u, 8 * u); ctx.fillStyle = '#5E8A3A'; ell(ctx, x + 2 * u, y - 7 * u, 2.4 * u, 0.8 * u, -0.5); ctx.fill(); },
    crown: function (ctx, x, y, u) { ctx.fillStyle = '#A3263A'; ell(ctx, x, y - 1 * u, 4 * u, 1.6 * u); ctx.fill(); ctx.fillStyle = '#E2B84A'; poly(ctx, [x - 3 * u, y - 2 * u, x + 3 * u, y - 2 * u, x + 3.4 * u, y - 6 * u, x + 1.6 * u, y - 4 * u, x, y - 6.6 * u, x - 1.6 * u, y - 4 * u, x - 3.4 * u, y - 6 * u]); ctx.fill(); },
    radio: function (ctx, x, y, u) { ctx.fillStyle = '#C0392B'; rr(ctx, x - 3 * u, y - 4 * u, 6 * u, 4 * u, 1 * u); ctx.fill(); ctx.fillStyle = '#2A2228'; circ(ctx, x - 1 * u, y - 2 * u, 1 * u); ctx.fill(); },
    globe: function (ctx, x, y, u) { ctx.fillStyle = '#7A5230'; ctx.fillRect(x - 1.6 * u, y - 0.8 * u, 3.2 * u, 0.8 * u); ctx.fillRect(x - 0.3 * u, y - 2 * u, 0.6 * u, 1.4 * u); ctx.fillStyle = '#4A88C8'; circ(ctx, x, y - 4.6 * u, 2.8 * u); ctx.fill(); ctx.fillStyle = '#5FA050'; ell(ctx, x - 0.8 * u, y - 5.2 * u, 1.2 * u, 0.9 * u, 0.4); ctx.fill(); ell(ctx, x + 1.2 * u, y - 3.6 * u, 0.9 * u, 0.6 * u); ctx.fill(); },
    strawberry: function (ctx, x, y, u) { ctx.fillStyle = '#E2262F'; ctx.beginPath(); ctx.moveTo(x - 2 * u, y - 3.4 * u); ctx.quadraticCurveTo(x - 2.2 * u, y - 0.6 * u, x, y); ctx.quadraticCurveTo(x + 2.2 * u, y - 0.6 * u, x + 2 * u, y - 3.4 * u); ctx.quadraticCurveTo(x, y - 4.4 * u, x - 2 * u, y - 3.4 * u); ctx.fill(); ctx.fillStyle = '#F6E27A'; [[-0.9, -2.4], [0.8, -2.2], [0, -1.2], [-0.2, -3]].forEach(function (p) { circ(ctx, x + p[0] * u, y + p[1] * u, 0.22 * u); ctx.fill(); }); ctx.fillStyle = '#3E8E4A'; tri(ctx, x - 1.6 * u, y - 3.6 * u, x + 1.6 * u, y - 3.6 * u, x, y - 4.8 * u); ctx.fill(); },
    trophy: function (ctx, x, y, u) { ctx.fillStyle = '#E2B84A'; ctx.beginPath(); ctx.moveTo(x - 2.4 * u, y - 6 * u); ctx.lineTo(x + 2.4 * u, y - 6 * u); ctx.quadraticCurveTo(x + 2 * u, y - 2 * u, x, y - 2 * u); ctx.quadraticCurveTo(x - 2 * u, y - 2 * u, x - 2.4 * u, y - 6 * u); ctx.fill(); ctx.fillRect(x - 0.5 * u, y - 2 * u, 1 * u, 1.4 * u); ctx.fillRect(x - 1.6 * u, y - 0.8 * u, 3.2 * u, 0.8 * u); }
  };

  WC.zooParts = { wall: wall, floor: floor, ceiling: ceiling, win: win, P: P, THINGS: THINGS, FY: FY, rnd: rnd };
})(typeof window !== 'undefined' ? window : globalThis);
