/* How hard is a Hide & seek picture? Renders it with and without the animal and simulates someone searching it.
   Loaded into the app page after seek.js. All sizes in phone CSS pixels (the picture 350 wide). */
(function () {
  var SK = WC.seek;
  var CW = 350, CH = Math.round(350 * SK.HU / 100), DPR = 2, W = CW * DPR, H = CH * DPR, K = W / 100, KC = CW / 100;
  function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  var cA = cv(W, H), cM = cv(W, H);
  // sRGB to CIELAB (D65)
  function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  var LT = new Float32Array(256); for (var i = 0; i < 256; i++) LT[i] = lin(i);
  function fx(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
  function lab(r, g, b, out, o) {
    var R = LT[r], G = LT[g], B = LT[b];
    var X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
    var fX = fx(X), fY = fx(Y), fZ = fx(Z);
    out[o] = 116 * fY - 16; out[o + 1] = 500 * (fX - fY); out[o + 2] = 200 * (fY - fZ);
  }
  function d2(a, i, b, j) { var x = a[i] - b[j], y = a[i + 1] - b[j + 1], z = a[i + 2] - b[j + 2]; return x * x + y * y + z * z; }

  /* rough colour names, the way people look for "something brown": white, black, grey, pink, red, brown, orange,
     yellow, green, blue, purple, beige */
  function cat(L, a, b) {
    var C = Math.sqrt(a * a + b * b), h = Math.atan2(b, a) * 180 / Math.PI; if (h < 0) h += 360;
    if (C < 10 || (C < 16 && (L > 88 || L < 20))) return L >= 82 ? 0 : L <= 28 ? 1 : 2;
    if (L < 18) return 1;
    if (h >= 340 || h < 20) return L > 50 ? 3 : 4;
    if (h < 40) return L < 30 && C < 40 ? 5 : L > 75 && C < 45 ? 3 : 4;
    if (h < 78) { if (L > 72 && C < 35) return 11; return C >= 45 && L >= 45 ? 6 : 5; }
    if (h < 105) { if (L >= 70 && C >= 40) return 7; if (L >= 70) return 11; return 5; }
    if (h < 175) return 8;
    if (h < 300) return 9;
    return L > 60 && h > 320 ? 3 : 10;
  }
  var NCAT = 12, CTMP = {};
  function catTemplate(id) {
    if (CTMP[id]) return CTMP[id];
    var S = 240, c = cv(S, S), ctx = c.getContext('2d'), o = new Float32Array(3), n = new Float64Array(NCAT), tot = 0;
    SK.portrait(ctx, S, S, id);
    var d = ctx.getImageData(0, 0, S, S).data;
    for (var i = 0; i < d.length; i += 4) if (d[i + 3] > 230) { lab(d[i], d[i + 1], d[i + 2], o, 0); n[cat(o[0], o[1], o[2])]++; tot++; }
    var out = [];
    for (var k = 0; k < NCAT; k++) if (n[k] / tot >= 0.05) out.push({ k: k, w: n[k] / tot });
    var tw = out.reduce(function (s1, q) { return s1 + q.w; }, 0);
    out.forEach(function (q) { q.w /= tw; });
    CTMP[id] = out;
    return out;
  }

  /* the animal's own colours, as the picture at the top shows it: up to 5 clusters with their shares */
  var TCACHE = {};
  function template(id) {
    if (TCACHE[id]) return TCACHE[id];
    var S = 240, c = cv(S, S), ctx = c.getContext('2d');
    SK.portrait(ctx, S, S, id);
    var d = ctx.getImageData(0, 0, S, S).data, px = [];
    for (var i = 0; i < d.length; i += 4) if (d[i + 3] > 230) { var o = new Float32Array(3); lab(d[i], d[i + 1], d[i + 2], o, 0); px.push(o); }
    // k-means, started from spread-out points
    var k = 5, cs = [px[0]];
    while (cs.length < k) {
      var far = null, fd = -1;
      for (var p = 0; p < px.length; p += 7) { var m = 1e9; for (var q = 0; q < cs.length; q++) m = Math.min(m, d2(px[p], 0, cs[q], 0)); if (m > fd) { fd = m; far = px[p]; } }
      cs.push(Float32Array.from(far));
    }
    var asg = new Int8Array(px.length);
    for (var it = 0; it < 10; it++) {
      var sum = cs.map(function () { return [0, 0, 0, 0]; });
      for (p = 0; p < px.length; p++) {
        var b = 0, bd = 1e9;
        for (q = 0; q < k; q++) { var dd = d2(px[p], 0, cs[q], 0); if (dd < bd) { bd = dd; b = q; } }
        asg[p] = b; sum[b][0] += px[p][0]; sum[b][1] += px[p][1]; sum[b][2] += px[p][2]; sum[b][3]++;
      }
      for (q = 0; q < k; q++) if (sum[q][3]) cs[q] = Float32Array.from([sum[q][0] / sum[q][3], sum[q][1] / sum[q][3], sum[q][2] / sum[q][3]]);
    }
    var cnt = new Array(k).fill(0); for (p = 0; p < px.length; p++) cnt[asg[p]]++;
    var out = [];
    for (q = 0; q < k; q++) if (cnt[q] / px.length >= 0.04) out.push({ c: cs[q], w: cnt[q] / px.length });
    var tw = out.reduce(function (s, o) { return s + o.w; }, 0);
    out.forEach(function (o) { o.w /= tw; });
    TCACHE[id] = out;
    return out;
  }

  // a picture's pixels at phone (CSS) size, as Lab and as which of the animal's colours each one matches (or -1)
  function cssLab(data) {
    var out = new Float32Array(CW * CH * 3);
    for (var y = 0; y < CH; y++) for (var x = 0; x < CW; x++) {
      var r = 0, g = 0, b = 0;
      for (var dy = 0; dy < 2; dy++) for (var dx = 0; dx < 2; dx++) { var i = ((y * 2 + dy) * W + x * 2 + dx) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; }
      lab(Math.round(r / 4), Math.round(g / 4), Math.round(b / 4), out, (y * CW + x) * 3);
    }
    return out;
  }
  var MATCH = 15; // ΔE: colours this close look the same at a glance
  function classes(L, T) {
    var n = CW * CH, cl = new Int8Array(n), tc = new Float32Array(T.length * 3);
    T.forEach(function (t, q) { tc[q * 3] = t.c[0]; tc[q * 3 + 1] = t.c[1]; tc[q * 3 + 2] = t.c[2]; });
    for (var p = 0; p < n; p++) {
      var b = -1, bd = MATCH * MATCH;
      for (var q = 0; q < T.length; q++) { var dd = d2(L, p * 3, tc, q * 3); if (dd < bd) { bd = dd; b = q; } }
      cl[p] = b;
    }
    return cl;
  }
  function integral(fn) {
    var I = new Float64Array((CW + 1) * (CH + 1));
    for (var y = 0; y < CH; y++) { var row = 0; for (var x = 0; x < CW; x++) { row += fn(y * CW + x); I[(y + 1) * (CW + 1) + x + 1] = I[y * (CW + 1) + x + 1] + row; } }
    return I;
  }
  function boxSum(I, x0, y0, x1, y1) { var w = CW + 1; return I[y1 * w + x1] - I[y0 * w + x1] - I[y1 * w + x0] + I[y0 * w + x0]; }

  // a small seeded random source and a normal deviate, so the same picture always measures the same
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  /* the model's settings */
  var P = { t0: 1.5, tw: 0.1, sigma: 0.25, passes: 4, sims: 200, theta: 0.3, beta: 0.35, rho: 0.35, lam: 0,
    r0: 1.2, rA: 2.0, rF: 2.0, rK: 2.0, rQ: 1.0, rR: 1.0, aRef: 300,
    c0: -1.5, cA: 1.8, cK: 3.0, cF: 1.5 };

  function measure(ph, sp, opt) {
    opt = opt || {};
    var T = template(ph.id);
    // the picture with the animal
    var a = cA.getContext('2d', { willReadFrequently: true });
    a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-over'; a.clearRect(0, 0, W, H);
    SK.draw(a, W, ph, sp);
    var dA = a.getImageData(0, 0, W, H).data;
    // the animal on its own, then with the things in front of it cut away: what's left is what you can see
    var m = cM.getContext('2d', { willReadFrequently: true });
    m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, W, H);
    SK.drawHidden(m, sp, K);
    var dF = m.getImageData(0, 0, W, H).data;
    m.globalCompositeOperation = 'destination-out';
    ph.items.forEach(function (it) { if (it.y > sp.y) SK.drawItem(m, it, K); });
    m.globalCompositeOperation = 'source-over';
    var dV = m.getImageData(0, 0, W, H).data;
    var nF = 0, nV = 0;
    var vis = new Uint8Array(CW * CH); // visible animal pixels per CSS pixel, 0 to 4
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var i = (y * W + x) * 4 + 3;
      if (dF[i] > 120) nF++;
      if (dV[i] > 120) { nV++; vis[(y >> 1) * CW + (x >> 1)]++; }
    }
    var Afull = nF / 4, Avis = nV / 4, f = nF ? nV / nF : 0;
    if (!nV) return { T: 999, p75: 999, Avis: 0, f: 0 };
    // the biggest single piece of it you can see (bits showing between things are harder to make out)
    var seen = new Uint8Array(CW * CH), big = 0, stack = [];
    for (var p = 0; p < CW * CH; p++) {
      if (vis[p] < 2 || seen[p]) continue;
      var n = 0; stack.push(p); seen[p] = 1;
      while (stack.length) {
        var q = stack.pop(); n++;
        var qx = q % CW, qy = (q - qx) / CW;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var nx = qx + o[0], ny = qy + o[1]; if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) return; var nq = ny * CW + nx; if (!seen[nq] && vis[nq] >= 2) { seen[nq] = 1; stack.push(nq); } });
      }
      if (n > big) big = n;
    }
    var visPx = 0; for (p = 0; p < CW * CH; p++) if (vis[p] >= 2) visPx++;
    var q = visPx ? big / visPx : 0;
    // colours at phone size, and which of the animal's colours they match
    var LA = cssLab(dA), clA = classes(LA, T);
    // camouflage: how much of what shows of the animal is in colours that are also all round it
    var ringR = 6, inRing = new Uint8Array(CW * CH), ringN = 0, ringC = new Float64Array(T.length), visC = new Float64Array(T.length), visT = 0;
    var bx0 = CW, by0 = CH, bx1 = 0, by1 = 0;
    for (p = 0; p < CW * CH; p++) if (vis[p] >= 2) { var px = p % CW, py = (p - px) / CW; if (px < bx0) bx0 = px; if (px > bx1) bx1 = px; if (py < by0) by0 = py; if (py > by1) by1 = py; }
    for (y = Math.max(0, by0 - ringR); y <= Math.min(CH - 1, by1 + ringR); y++) for (x = Math.max(0, bx0 - ringR); x <= Math.min(CW - 1, bx1 + ringR); x++) {
      p = y * CW + x;
      if (vis[p] >= 1) { if (vis[p] >= 2) { visT++; if (clA[p] >= 0) visC[clA[p]]++; } continue; }
      // in the ring if it's within ringR of a visible pixel
      var hit = false;
      for (var dy = -ringR; dy <= ringR && !hit; dy += 2) for (var dx = -ringR; dx <= ringR && !hit; dx += 2) {
        var xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= CW || yy >= CH) continue;
        if (vis[yy * CW + xx] >= 2) hit = true;
      }
      if (hit) { ringN++; if (clA[p] >= 0) ringC[clA[p]]++; }
    }
    var kap = 0;
    for (var c = 0; c < T.length; c++) kap += (visC[c] / Math.max(1, visT)) * Math.min(1, (ringC[c] / Math.max(1, ringN)) / 0.15);
    // where you'd look: windows about the animal's size, scored by how much they hold of the animal's main colours
    var CT = catTemplate(ph.id), catA = new Int8Array(CW * CH);
    for (p = 0; p < CW * CH; p++) catA[p] = cat(LA[p * 3], LA[p * 3 + 1], LA[p * 3 + 2]);
    var Ic = CT.map(function (t) { return integral(function (p) { return catA[p] === t.k ? 1 : 0; }); });
    var Iall = []; for (var kc = 0; kc < NCAT; kc++) Iall.push(integral((function (kk) { return function (p) { return catA[p] === kk ? 1 : 0; }; })(kc)));
    var Iv = integral(function (p) { return vis[p] >= 2 ? 1 : 0; });
    var s = Math.max(22, Math.min(64, Math.round(Math.sqrt(Afull) * 1.25))), st = Math.max(6, Math.round(s / 2));
    var ground = Math.floor(ph.y0 * KC), wins = [];
    var xs = [], ys = [];
    for (x = 0; x + s <= CW; x += st) xs.push(x); if (xs[xs.length - 1] + s < CW) xs.push(CW - s);
    for (y = Math.max(0, ground - Math.round(s / 2)); y + s <= CH; y += st) ys.push(y); if (ys[ys.length - 1] + s < CH) ys.push(CH - s);
    var area = s * s, bestT = 0;
    // guidance weights: the animal's main colours count most
    // guidance mostly by the animal's biggest colour; its other colours help a little
    var dom = 0; CT.forEach(function (t, c) { if (t.w > CT[dom].w) dom = c; });
    var ow = 0; CT.forEach(function (t, c) { if (c !== dom) ow += t.w; });
    var gw = CT.map(function (t, c) { return (c === dom ? 1 : P.beta * t.w / Math.max(1e-6, ow)) / (1 + (ow ? P.beta : 0)); });
    // the middle of what shows of the animal
    var vx = 0, vy = 0; for (p = 0; p < CW * CH; p++) if (vis[p] >= 2) { vx += p % CW; vy += Math.floor(p / CW); }
    vx /= visPx; vy /= visPx;
    ys.forEach(function (y0) {
      xs.forEach(function (x0) {
        var M = 0;
        for (var c = 0; c < CT.length; c++) M += gw[c] * Math.min(1, boxSum(Ic[c], x0, y0, x0 + s, y0 + s) / area / Math.max(0.03, P.theta * CT[c].w));
        var cx = x0 + s / 2, cy = y0 + s / 2, dist2 = (cx - vx) * (cx - vx) + (cy - vy) * (cy - vy);
        var sh = boxSum(Iv, x0, y0, x0 + s, y0 + s) / visPx;
        // standing out: how different its colours are from the ring round it (a window three times as wide)
        var ox0 = Math.max(0, x0 - s), oy0 = Math.max(0, y0 - s), ox1 = Math.min(CW, x0 + 2 * s), oy1 = Math.min(CH, y0 + 2 * s);
        var oa = (ox1 - ox0) * (oy1 - oy0) - area, tv = 0;
        for (var kc = 0; kc < NCAT; kc++) {
          var inn = boxSum(Iall[kc], x0, y0, x0 + s, y0 + s), out = boxSum(Iall[kc], ox0, oy0, ox1, oy1) - inn;
          tv += Math.abs(inn / area - out / Math.max(1, oa));
        }
        wins.push({ M: M, sh: sh, d2: dist2, sal: tv / 2 });
        if (sh >= 0.5 && M > bestT) bestT = M;
      });
    });
    // once you look right at it, how likely you are to spot it
    var z = P.r0 + P.rA * Math.log(Avis / P.aRef) + P.rF * (f - 0.5) - P.rK * (kap - 0.5) + P.rQ * (q - 0.8) - P.rR * Math.abs(sp.rot || 0);
    var r = Math.max(0.04, Math.min(0.97, 1 / (1 + Math.exp(-z))));
    // how far off it can be spotted: big, uncovered animals in their own colours stand out from further away
    var zc = P.c0 + P.cA * Math.log(Avis / P.aRef) + P.cK * (0.5 - kap) + P.cF * (f - 0.5);
    var cons = 1 / (1 + Math.exp(-zc)), rho = P.rho * s * (1 + 2 * cons);
    wins.forEach(function (wi) { wi.D = Math.exp(-wi.d2 / (2 * rho * rho)); });
    // the search, simulated: look at windows in order of how much they look like the animal (with some noise), spot it
    // with chance r each time you look where it is; start over if you go through them all
    var R = rng(opt.seed || 12345), times = [], N = wins.length, pr = new Float64Array(N), idx = new Int32Array(N);
    var gauss = function () { var u = 1 - R(), v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    for (var sim = 0; sim < P.sims; sim++) {
      var t = P.t0, found = false;
      for (var pass = 0; pass < P.passes && !found; pass++) {
        for (var w = 0; w < N; w++) { pr[w] = wins[w].M + P.lam * wins[w].sal + P.sigma * gauss(); idx[w] = w; }
        var order = Array.prototype.slice.call(idx).sort(function (i1, i2) { return pr[i2] - pr[i1]; });
        for (var j = 0; j < N; j++) {
          var wi = wins[order[j]]; t += P.tw;
          if (wi.D > 0.01 && R() < r * wi.D) { found = true; break; }
        }
      }
      times.push(found ? t : t + 30);
    }
    times.sort(function (x1, x2) { return x1 - x2; });
    var mean = times.reduce(function (a1, b1) { return a1 + b1; }, 0) / times.length;
    var rank = 0; wins.forEach(function (wi) { if (wi.D < 0.05 && wi.M >= bestT - 0.05) rank++; });
    return { T: Math.round(mean * 10) / 10, p50: Math.round(times[Math.floor(times.length * 0.5)] * 10) / 10, p75: Math.round(times[Math.floor(times.length * 0.75)] * 10) / 10,
      Avis: Math.round(Avis), Afull: Math.round(Afull), f: Math.round(f * 100) / 100, q: Math.round(q * 100) / 100, kap: Math.round(kap * 100) / 100, r: Math.round(r * 100) / 100,
      MT: Math.round(bestT * 100) / 100, rank: rank, nwin: N, s: s, cons: Math.round(cons * 100) / 100 };
  }
  window.MEAS = { measure: measure, template: template, catTemplate: catTemplate, cat: cat, P: P };
})();
