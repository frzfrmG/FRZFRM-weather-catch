/* FRZFRM Weather Catch: the animal spotter.
   Works out which animal a photo shows, on the phone itself: nothing is sent anywhere, and the photo is thrown away
   straight after. It's OpenCLIP's ViT-B/32 image model (trained on LAION-2B, MIT licence), with its weights as 8-bit
   numbers. The model turns a photo into 512 numbers, and those are compared with the same kind of numbers worked out
   beforehand for words like "a photo of a hedgehog" (the labels). It knows the animals in the collection, plenty that
   aren't in it yet, and things that aren't real animals at all (people, screens, pictures and toys), so it can turn
   those down.
   It runs on the phone's graphics chip with WebGPU where the phone has it, and in plain JavaScript where it doesn't,
   which is slower. The model is downloaded once (about 88 MB) and kept on the phone. */
(function (root) {
  'use strict';
  var WC = root.WC = root.WC || {};
  var BASE = 'spotter/';
  var CACHE = 'frzfrm-spotter-1';
  var M = null, BLOB = null, LAB = null, NL = 0;
  var loading = null;
  // this file's own address, so it can start a copy of itself as a worker
  var SRC = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : null;
  var worker = null, wjobs = {}, wid = 0;
  var gpu = null, gpuTried = false, gpuBroken = '';
  var HEADS = 12, HD = 64, D = 768;

  function prod(s) { var p = 1; for (var i = 0; i < s.length; i++) p *= s[i]; return p; }
  function f32(key) { var t = M.tensors[key]; return new Float32Array(BLOB.buffer, BLOB.byteOffset + t.o, prod(t.s)); }
  function u8(key) { var t = M.tensors[key]; return new Uint8Array(BLOB.buffer, BLOB.byteOffset + t.o, prod(t.s)); }
  function info(key) { return M.tensors[key]; }

  /* ---------- getting the model onto the phone ----------
     The model, its labels and the list of its files are each fetched once and kept in their own cache, which outlives
     app updates, so it works with no signal once it's on the phone. onProgress(done, total) in bytes */
  // the list of files. From 0.12.0 it's spotter-2.json, with the pets in its labels; the model itself didn't change
  var MAN_URL = BASE + 'spotter-2.json', OLD_MAN_URL = BASE + 'spotter.json';
  function cacheOpen() { return root.caches && root.caches.open ? root.caches.open(CACHE).catch(function () { return null; }) : Promise.resolve(null); }
  function chunkUrl(ch) { return BASE + ch.f + '?h=' + ch.sha; }
  function labelsPart(man) { return { f: man.labels.f, n: man.labels.n, sha: man.labels.sha || 'n' + man.labels.n }; }
  /* the list of files: fresh when there's a signal, otherwise the copy kept with the model */
  function manifest(cache) {
    return fetch(MAN_URL, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for the spotter');
      var copy = r.clone();
      return r.json().then(function (man) { if (cache) cache.put(MAN_URL, copy).catch(function () {}); return man; });
    }).catch(function (err) {
      if (!cache) throw err;
      return cache.match(MAN_URL).then(function (hit) { return hit || cache.match(OLD_MAN_URL); }).then(function (hit) { if (!hit) throw err; return hit.json(); });
    });
  }
  function fetchChunk(cache, ch, onBytes) {
    var url = chunkUrl(ch);
    var fromCache = cache ? cache.match(url).catch(function () { return null; }) : Promise.resolve(null);
    return fromCache.then(function (hit) {
      if (hit) return hit.arrayBuffer().then(function (b) { onBytes(b.byteLength); return b; });
      return fetch(url, { cache: 'no-cache' }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + ch.f);
        var copy = res.clone();
        var done = function (b) {
          if (b.byteLength !== ch.n) throw new Error('The download was cut short');
          return cache ? cache.put(url, copy).then(function () { return b; }, function () { return b; }) : b;
        };
        if (!res.body || !res.body.getReader) return res.arrayBuffer().then(function (b) { onBytes(b.byteLength); return done(b); });
        var reader = res.body.getReader(), parts = [], got = 0;
        var pump = function () {
          return reader.read().then(function (r) {
            if (r.done) {
              var out = new Uint8Array(got), o = 0;
              parts.forEach(function (p) { out.set(p, o); o += p.length; });
              return done(out.buffer);
            }
            parts.push(r.value); got += r.value.length; onBytes(r.value.length);
            return pump();
          });
        };
        return pump();
      });
    });
  }
  function load(onProgress) {
    if (M && (BLOB || worker)) return Promise.resolve();
    if (loading) { if (onProgress) loading.listeners.push(onProgress); return loading.p; }
    var listeners = onProgress ? [onProgress] : [];
    var p = cacheOpen().then(function (cache) {
      return manifest(cache).then(function (man) {
        var lp = labelsPart(man), total = man.bytes + lp.n, done = 0;
        var tell = function (n) { done += n; listeners.forEach(function (f) { try { f(Math.min(done, total), total); } catch (e) {} }); };
        // one file after another, so the progress bar moves steadily and a phone isn't asked for 4 downloads at once.
        // Each goes straight into place, so there's never much more than the model itself in memory
        var all = new Uint8Array(man.bytes), at = 0, chain = Promise.resolve(), lb = null;
        man.chunks.forEach(function (ch) { chain = chain.then(function () { return fetchChunk(cache, ch, tell).then(function (b) { all.set(new Uint8Array(b), at); at += b.byteLength; }); }); });
        chain = chain.then(function () { return fetchChunk(cache, lp, tell).then(function (b) { lb = b; }); });
        return chain.then(function () {
          if (at !== man.bytes) throw new Error('The spotter is the wrong size');
          M = man; BLOB = all;
          var q = new Int8Array(lb), dim = man.dim;
          NL = man.labels.ids.length;
          LAB = new Float32Array(NL * dim);
          for (var c = 0; c < NL; c++) { var sc = man.labels.scale[c]; for (var j = 0; j < dim; j++) LAB[c * dim + j] = q[c * dim + j] * sc; }
          // throw away files kept from older models
          if (cache) cache.keys().then(function (ks) {
            var keep = man.chunks.map(chunkUrl).concat([chunkUrl(lp), MAN_URL]);
            ks.forEach(function (k) { if (!keep.some(function (u) { return u.indexOf('?') !== -1 ? k.url.indexOf(u) !== -1 : k.url.slice(-u.length) === u; })) cache.delete(k); });
          }).catch(function () {});
        });
      });
    });
    loading = { p: p, listeners: listeners };
    p.then(function () { loading = null; }, function () { loading = null; });
    return p;
  }
  /* is the model already on the phone? Resolves true or false without downloading anything */
  function stored() {
    return cacheOpen().then(function (cache) {
      if (!cache) return false;
      return manifest(cache).then(function (man) {
        // the model's files: when only the labels are new (a small file), it still counts as on the phone
        var urls = man.chunks.map(chunkUrl);
        return Promise.all(urls.map(function (u) { return cache.match(u); })).then(function (hits) { return hits.every(Boolean); });
      });
    }).catch(function () { return false; });
  }
  /* how big the download is, in bytes, before it starts */
  function sizeOnline() {
    return cacheOpen().then(function (cache) { return manifest(cache); }).then(function (man) { return man.bytes + labelsPart(man).n; }).catch(function () { return 0; });
  }

  /* ---------- a photo into numbers ----------
     src: a video or canvas; the middle square of it, squeezed to 224 by 224. Returns the patches the model reads:
     49 patches of 32 by 32 pixels, each as its red, then green, then blue values, normalised */
  var work = null;
  function pixels(src, sw, sh) {
    var S = M ? M.size : 224;
    if (!work) { work = document.createElement('canvas'); work.width = S; work.height = S; }
    var side = Math.min(sw, sh), sx = (sw - side) / 2, sy = (sh - side) / 2;
    var ctx = work.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // a big picture is halved a step at a time first, so the small one is smooth and not grainy
    var cur = src, cw = sw, chh = sh, cx = sx, cy = sy, cs = side;
    while (cs > S * 2.2) {
      var half = document.createElement('canvas');
      var hs = Math.round(cs / 2);
      half.width = hs; half.height = hs;
      var hc = half.getContext('2d');
      hc.imageSmoothingEnabled = true; hc.imageSmoothingQuality = 'high';
      hc.drawImage(cur, cx, cy, cs, cs, 0, 0, hs, hs);
      cur = half; cx = 0; cy = 0; cs = hs; cw = hs; chh = hs;
    }
    ctx.drawImage(cur, cx, cy, cs, cs, 0, 0, S, S);
    return ctx.getImageData(0, 0, S, S).data;
  }
  /* RGBA pixels (size x size) into the model's patches */
  function patches(rgba, S) {
    var g = S / 32, P = g * g, out = new Float32Array(P * 3072);
    var mean = M.mean, std = M.std;
    for (var py = 0; py < g; py++) for (var px = 0; px < g; px++) {
      var base = (py * g + px) * 3072;
      for (var y = 0; y < 32; y++) for (var x = 0; x < 32; x++) {
        var i = ((py * 32 + y) * S + px * 32 + x) * 4, o = y * 32 + x;
        out[base + o] = (rgba[i] / 255 - mean[0]) / std[0];
        out[base + 1024 + o] = (rgba[i + 1] / 255 - mean[1]) / std[1];
        out[base + 2048 + o] = (rgba[i + 2] / 255 - mean[2]) / std[2];
      }
    }
    return out;
  }

  /* ---------- the model in plain JavaScript ---------- */
  function erf(x) {
    var s = x < 0 ? -1 : 1, a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
    return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a));
  }
  var ACC = null;
  /* y = x W + b, for T rows of K numbers. W is 8-bit: (w - zp) * scale. act 1 is GELU. res: add y onto out instead */
  function linear(x, T, K, key, out, act, res, bias) {
    var ti = info(key), N = ti.s[1], W = u8(key), sc = ti.scale, zp = ti.zp;
    if (!ACC || ACC.length < T * N) ACC = new Float32Array(Math.max(T * N, 50 * 3072));
    var acc = ACC, t, n, k;
    for (t = 0; t < T * N; t++) acc[t] = 0;
    var xs = new Float32Array(T);
    for (k = 0; k < K; k++) {
      var row = k * N;
      for (t = 0; t < T; t += 4) {
        var x0 = x[t * K + k], x1 = t + 1 < T ? x[(t + 1) * K + k] : 0, x2 = t + 2 < T ? x[(t + 2) * K + k] : 0, x3 = t + 3 < T ? x[(t + 3) * K + k] : 0;
        xs[t] += x0; if (t + 1 < T) xs[t + 1] += x1; if (t + 2 < T) xs[t + 2] += x2; if (t + 3 < T) xs[t + 3] += x3;
        var o0 = t * N, o1 = o0 + N, o2 = o1 + N, o3 = o2 + N;
        if (t + 3 < T) {
          for (n = 0; n < N; n++) { var w = W[row + n]; acc[o0 + n] += x0 * w; acc[o1 + n] += x1 * w; acc[o2 + n] += x2 * w; acc[o3 + n] += x3 * w; }
        } else {
          for (var tt = t; tt < T; tt++) { var xv = x[tt * K + k], oo = tt * N; for (n = 0; n < N; n++) acc[oo + n] += xv * W[row + n]; }
        }
      }
    }
    var b = bias || null;
    for (t = 0; t < T; t++) {
      var off = t * N, zx = zp * xs[t];
      for (n = 0; n < N; n++) {
        var v = (acc[off + n] - zx) * sc + (b ? b[n] : 0);
        if (act === 1) v = 0.5 * v * (1 + erf(v / Math.SQRT2));
        if (res) out[off + n] += v; else out[off + n] = v;
      }
    }
    return out;
  }
  function layernorm(x, T, g, b, out) {
    for (var t = 0; t < T; t++) {
      var o = t * D, m = 0, v = 0, i;
      for (i = 0; i < D; i++) m += x[o + i];
      m /= D;
      for (i = 0; i < D; i++) { var d = x[o + i] - m; v += d * d; }
      var r = 1 / Math.sqrt(v / D + 1e-5);
      for (i = 0; i < D; i++) out[o + i] = (x[o + i] - m) * r * g[i] + b[i];
    }
    return out;
  }
  function attention(qkv, T, out) {
    var s = new Float32Array(T), W3 = 3 * D;
    for (var h = 0; h < HEADS; h++) {
      var qo = h * HD, ko = D + h * HD, vo = 2 * D + h * HD;
      for (var i = 0; i < T; i++) {
        var mx = -1e30, j, d;
        for (j = 0; j < T; j++) {
          var acc = 0;
          for (d = 0; d < HD; d++) acc += qkv[i * W3 + qo + d] * qkv[j * W3 + ko + d];
          s[j] = acc * 0.125;
          if (s[j] > mx) mx = s[j];
        }
        var sum = 0;
        for (j = 0; j < T; j++) { s[j] = Math.exp(s[j] - mx); sum += s[j]; }
        for (d = 0; d < HD; d++) {
          var v = 0;
          for (j = 0; j < T; j++) v += s[j] * qkv[j * W3 + vo + d];
          out[i * D + qo + d] = v / sum;
        }
      }
    }
    return out;
  }
  /* positional embeddings for a g x g grid of patches: the model's own 7 x 7, or stretched to fit */
  function posFor(g) {
    var pos = f32('pos');
    if (g === 7) return pos;
    var out = new Float32Array((g * g + 1) * D), y, x, c;
    for (c = 0; c < D; c++) out[c] = pos[c];
    for (y = 0; y < g; y++) for (x = 0; x < g; x++) {
      var fy = y * 6 / Math.max(1, g - 1), fx = x * 6 / Math.max(1, g - 1);
      var y0 = Math.floor(fy), x0 = Math.floor(fx), y1 = Math.min(6, y0 + 1), x1 = Math.min(6, x0 + 1), ay = fy - y0, ax = fx - x0;
      for (c = 0; c < D; c++) {
        var p = function (yy, xx) { return pos[(1 + yy * 7 + xx) * D + c]; };
        out[(1 + y * g + x) * D + c] = p(y0, x0) * (1 - ay) * (1 - ax) + p(y0, x1) * (1 - ay) * ax + p(y1, x0) * ay * (1 - ax) + p(y1, x1) * ay * ax;
      }
    }
    return out;
  }
  function embedJS(pt, g) {
    var P = g * g, T = P + 1;
    var pe = new Float32Array(P * D);
    linear(pt, P, 3072, 'patch', pe, 0, false, null);
    var t = new Float32Array(T * D), cls = f32('cls'), pos = posFor(g), i, c;
    for (c = 0; c < D; c++) t[c] = cls[c] + pos[c];
    for (i = 0; i < P; i++) for (c = 0; c < D; c++) t[(i + 1) * D + c] = pe[i * D + c] + pos[(i + 1) * D + c];
    layernorm(t, T, f32('ln_pre.g'), f32('ln_pre.b'), t);
    var h = new Float32Array(T * D), qkv = new Float32Array(T * 3 * D), a = new Float32Array(T * D), f = new Float32Array(T * 3072);
    for (var b = 0; b < M.layers; b++) {
      layernorm(t, T, f32(b + '.ln1.g'), f32(b + '.ln1.b'), h);
      linear(h, T, D, b + '.qkv', qkv, 0, false, f32(b + '.qkv.b'));
      attention(qkv, T, a);
      linear(a, T, D, b + '.out', t, 0, true, f32(b + '.out.b'));
      layernorm(t, T, f32(b + '.ln2.g'), f32(b + '.ln2.b'), h);
      linear(h, T, D, b + '.fc', f, 1, false, f32(b + '.fc.b'));
      linear(f, T, 3072, b + '.pr', t, 0, true, f32(b + '.pr.b'));
    }
    var c0 = layernorm(t.subarray(0, D), 1, f32('ln_post.g'), f32('ln_post.b'), new Float32Array(D));
    return linear(c0, 1, D, 'proj', new Float32Array(M.dim), 0, false, null);
  }

  /* ---------- the model on the graphics chip (WebGPU) ---------- */
  var WGSL_MM = [
    'struct P { T: u32, K: u32, N: u32, act: u32, res: u32, scale: f32, zp: f32, xoff: u32 };',
    '@group(0) @binding(0) var<storage, read> X: array<f32>;',
    '@group(0) @binding(1) var<storage, read> W: array<u32>;',
    '@group(0) @binding(2) var<storage, read> B: array<f32>;',
    '@group(0) @binding(3) var<storage, read_write> Y: array<f32>;',
    '@group(0) @binding(4) var<uniform> p: P;',
    'fn erf1(x: f32) -> f32 {',
    '  let s = sign(x); let a = abs(x); let t = 1.0 / (1.0 + 0.3275911 * a);',
    '  return s * (1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-a * a));',
    '}',
    'var<workgroup> xt: array<f32, 256>;',
    '@compute @workgroup_size(64)',
    'fn main(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_index) li: u32, @builtin(workgroup_id) wg: vec3<u32>) {',
    '  let n4 = gid.x; let t = wg.y; let N4 = p.N / 4u;',
    '  var acc = vec4<f32>(0.0); var xs = 0.0;',
    '  for (var k0 = 0u; k0 < p.K; k0 = k0 + 256u) {',
    '    for (var j = li; j < 256u; j = j + 64u) { let kk = k0 + j; xt[j] = select(0.0, X[p.xoff + t * p.K + kk], kk < p.K); }',
    '    workgroupBarrier();',
    '    if (n4 < N4) {',
    '      let kn = min(256u, p.K - k0);',
    '      for (var j = 0u; j < kn; j = j + 1u) {',
    '        let xv = xt[j]; let w = W[(k0 + j) * N4 + n4];',
    '        acc = acc + xv * vec4<f32>(f32(w & 255u), f32((w >> 8u) & 255u), f32((w >> 16u) & 255u), f32(w >> 24u));',
    '        xs = xs + xv;',
    '      }',
    '    }',
    '    workgroupBarrier();',
    '  }',
    '  if (n4 >= N4) { return; }',
    '  let o = t * p.N + n4 * 4u;',
    '  var y = (acc - vec4<f32>(p.zp * xs)) * p.scale + vec4<f32>(B[n4 * 4u], B[n4 * 4u + 1u], B[n4 * 4u + 2u], B[n4 * 4u + 3u]);',
    '  if (p.act == 1u) { y = 0.5 * y * (vec4<f32>(1.0) + vec4<f32>(erf1(y.x / 1.41421356), erf1(y.y / 1.41421356), erf1(y.z / 1.41421356), erf1(y.w / 1.41421356))); }',
    '  if (p.res == 1u) { Y[o] = Y[o] + y.x; Y[o + 1u] = Y[o + 1u] + y.y; Y[o + 2u] = Y[o + 2u] + y.z; Y[o + 3u] = Y[o + 3u] + y.w; }',
    '  else { Y[o] = y.x; Y[o + 1u] = y.y; Y[o + 2u] = y.z; Y[o + 3u] = y.w; }',
    '}'
  ].join('\n');
  var WGSL_LN = [
    'struct P { T: u32, D: u32, off: u32, pad: u32 };',
    '@group(0) @binding(0) var<storage, read> X: array<f32>;',
    '@group(0) @binding(1) var<storage, read> G: array<f32>;',
    '@group(0) @binding(2) var<storage, read> Bb: array<f32>;',
    '@group(0) @binding(3) var<storage, read_write> Y: array<f32>;',
    '@group(0) @binding(4) var<uniform> p: P;',
    'var<workgroup> s1: array<f32, 256>;',
    'var<workgroup> s2: array<f32, 256>;',
    '@compute @workgroup_size(256)',
    'fn main(@builtin(local_invocation_index) li: u32, @builtin(workgroup_id) wg: vec3<u32>) {',
    '  let t = wg.x; let o = p.off + t * p.D;',
    '  var a = 0.0;',
    '  for (var i = li; i < p.D; i = i + 256u) { a = a + X[o + i]; }',
    '  s1[li] = a; workgroupBarrier();',
    '  for (var st = 128u; st > 0u; st = st >> 1u) { if (li < st) { s1[li] = s1[li] + s1[li + st]; } workgroupBarrier(); }',
    '  let m = s1[0] / f32(p.D);',
    '  var v = 0.0;',
    '  for (var i = li; i < p.D; i = i + 256u) { let d = X[o + i] - m; v = v + d * d; }',
    '  s2[li] = v; workgroupBarrier();',
    '  for (var st = 128u; st > 0u; st = st >> 1u) { if (li < st) { s2[li] = s2[li] + s2[li + st]; } workgroupBarrier(); }',
    '  let r = inverseSqrt(s2[0] / f32(p.D) + 1e-5);',
    '  for (var i = li; i < p.D; i = i + 256u) { Y[t * p.D + i] = (X[o + i] - m) * r * G[i] + Bb[i]; }',
    '}'
  ].join('\n');
  var WGSL_ATT = [
    'struct P { T: u32, pad0: u32, pad1: u32, pad2: u32 };',
    '@group(0) @binding(0) var<storage, read> Q: array<f32>;',
    '@group(0) @binding(1) var<storage, read_write> O: array<f32>;',
    '@group(0) @binding(2) var<uniform> p: P;',
    '@compute @workgroup_size(64)',
    'fn main(@builtin(global_invocation_id) gid: vec3<u32>) {',
    '  let i = gid.x; let h = gid.y;',
    '  if (i >= p.T) { return; }',
    '  var s: array<f32, 64>;',
    '  let W3 = 2304u; let qo = h * 64u; let ko = 768u + h * 64u; let vo = 1536u + h * 64u;',
    '  var mx = -1e30;',
    '  for (var j = 0u; j < p.T; j = j + 1u) {',
    '    var a = 0.0;',
    '    for (var d = 0u; d < 64u; d = d + 1u) { a = a + Q[i * W3 + qo + d] * Q[j * W3 + ko + d]; }',
    '    s[j] = a * 0.125; mx = max(mx, s[j]);',
    '  }',
    '  var sum = 0.0;',
    '  for (var j = 0u; j < p.T; j = j + 1u) { s[j] = exp(s[j] - mx); sum = sum + s[j]; }',
    '  for (var d = 0u; d < 64u; d = d + 1u) {',
    '    var v = 0.0;',
    '    for (var j = 0u; j < p.T; j = j + 1u) { v = v + s[j] * Q[j * W3 + vo + d]; }',
    '    O[i * 768u + qo + d] = v / sum;',
    '  }',
    '}'
  ].join('\n');
  var WGSL_IN = [
    'struct P { P: u32, D: u32, pad0: u32, pad1: u32 };',
    '@group(0) @binding(0) var<storage, read> E: array<f32>;',
    '@group(0) @binding(1) var<storage, read> C: array<f32>;',
    '@group(0) @binding(2) var<storage, read> Pos: array<f32>;',
    '@group(0) @binding(3) var<storage, read_write> Y: array<f32>;',
    '@group(0) @binding(4) var<uniform> p: P;',
    '@compute @workgroup_size(64)',
    'fn main(@builtin(global_invocation_id) gid: vec3<u32>) {',
    '  let c = gid.x; let t = gid.y;',
    '  if (c >= p.D || t > p.P) { return; }',
    '  if (t == 0u) { Y[c] = C[c] + Pos[c]; } else { Y[t * p.D + c] = E[(t - 1u) * p.D + c] + Pos[t * p.D + c]; }',
    '}'
  ].join('\n');

  function initGPU() {
    if (gpuTried || gpuBroken) return Promise.resolve(gpu);
    gpuTried = true;
    if (!root.navigator || !navigator.gpu || root.FRZFRM_NO_GPU) return Promise.resolve(null);
    return navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }).then(function (ad) {
      if (!ad) return null;
      return ad.requestDevice({ requiredLimits: { maxStorageBufferBindingSize: Math.min(ad.limits.maxStorageBufferBindingSize, 134217728), maxBufferSize: Math.min(ad.limits.maxBufferSize, 268435456) } });
    }).then(function (dev) {
      if (!dev) return null;
      var G = { dev: dev, lost: false };
      dev.lost.then(function () { G.lost = true; if (gpu === G) { gpu = null; gpuTried = false; } });
      var mod = function (code) { return dev.createShaderModule({ code: code }); };
      G.mm = dev.createComputePipeline({ layout: 'auto', compute: { module: mod(WGSL_MM), entryPoint: 'main' } });
      G.ln = dev.createComputePipeline({ layout: 'auto', compute: { module: mod(WGSL_LN), entryPoint: 'main' } });
      G.att = dev.createComputePipeline({ layout: 'auto', compute: { module: mod(WGSL_ATT), entryPoint: 'main' } });
      G.inp = dev.createComputePipeline({ layout: 'auto', compute: { module: mod(WGSL_IN), entryPoint: 'main' } });
      var U = GPUBufferUsage;
      var buf = function (bytes, usage) { return dev.createBuffer({ size: Math.max(16, Math.ceil(bytes / 4) * 4), usage: usage }); };
      var upload = function (arr) {
        var b = dev.createBuffer({ size: Math.max(16, Math.ceil(arr.byteLength / 4) * 4), usage: U.STORAGE | U.COPY_DST, mappedAtCreation: true });
        new Uint8Array(b.getMappedRange()).set(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength));
        b.unmap();
        return b;
      };
      G.w = {};
      Object.keys(M.tensors).forEach(function (k) { if (k !== 'pos') G.w[k] = upload(M.tensors[k].t === 'u8' ? u8(k) : f32(k)); });
      G.zeros = upload(new Float32Array(3072));
      G.T = 50;
      G.pos = upload(posFor(7));
      G.patches = buf(49 * 3072 * 4, U.STORAGE | U.COPY_DST);
      G.pe = buf(49 * D * 4, U.STORAGE);
      G.t = buf(50 * D * 4, U.STORAGE);
      G.h = buf(50 * D * 4, U.STORAGE);
      G.qkv = buf(50 * 3 * D * 4, U.STORAGE);
      G.a = buf(50 * D * 4, U.STORAGE);
      G.f = buf(50 * 3072 * 4, U.STORAGE);
      G.c = buf(D * 4, U.STORAGE);
      G.out = buf(512 * 4, U.STORAGE | U.COPY_SRC);
      G.read = buf(512 * 4, U.MAP_READ | U.COPY_DST);
      // every step of the model, set up once: [pipeline, bind group, workgroups x, y]
      var steps = [];
      var uni = function (words) {
        var b = dev.createBuffer({ size: 32, usage: U.UNIFORM | U.COPY_DST, mappedAtCreation: true });
        var r = b.getMappedRange(), u = new Uint32Array(r), f = new Float32Array(r);
        words.forEach(function (w, i) { if (w && w.f !== undefined) f[i] = w.f; else u[i] = w; });
        b.unmap();
        return b;
      };
      var bind = function (pipe, list) { return dev.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: list.map(function (b, i) { return { binding: i, resource: { buffer: b } }; }) }); };
      var mm = function (x, xoff, T, K, key, y, act, res, bias) {
        var ti = M.tensors[key], N = ti.s[1];
        var u = uni([T, K, N, act, res ? 1 : 0, { f: ti.scale }, { f: ti.zp }, xoff]);
        steps.push([G.mm, bind(G.mm, [x, G.w[key], bias || G.zeros, y, u]), Math.ceil(N / 4 / 64), T]);
      };
      var ln = function (x, off, T, g, b, y) { steps.push([G.ln, bind(G.ln, [x, G.w[g], G.w[b], y, uni([T, D, off, 0])]), T, 1]); };
      mm(G.patches, 0, 49, 3072, 'patch', G.pe, 0, false, null);
      steps.push([G.inp, bind(G.inp, [G.pe, G.w.cls, G.pos, G.h, uni([49, D, 0, 0])]), Math.ceil(D / 64), 50]);
      ln(G.h, 0, 50, 'ln_pre.g', 'ln_pre.b', G.t);
      for (var b = 0; b < M.layers; b++) {
        ln(G.t, 0, 50, b + '.ln1.g', b + '.ln1.b', G.h);
        mm(G.h, 0, 50, D, b + '.qkv', G.qkv, 0, false, G.w[b + '.qkv.b']);
        steps.push([G.att, bind(G.att, [G.qkv, G.a, uni([50, 0, 0, 0])]), 1, HEADS]);
        mm(G.a, 0, 50, D, b + '.out', G.t, 0, true, G.w[b + '.out.b']);
        ln(G.t, 0, 50, b + '.ln2.g', b + '.ln2.b', G.h);
        mm(G.h, 0, 50, D, b + '.fc', G.f, 1, false, G.w[b + '.fc.b']);
        mm(G.f, 0, 50, 3072, b + '.pr', G.t, 0, true, G.w[b + '.pr.b']);
      }
      ln(G.t, 0, 1, 'ln_post.g', 'ln_post.b', G.c);
      mm(G.c, 0, 1, D, 'proj', G.out, 0, false, null);
      G.steps = steps;
      gpu = G;
      return G;
    }).catch(function () { gpu = null; return null; });
  }
  function embedGPU(G, pt) {
    var dev = G.dev;
    // the first run is watched for errors: a phone whose graphics chip can't do it falls back to plain JavaScript
    var watch = !G.checked;
    if (watch) dev.pushErrorScope('validation');
    dev.queue.writeBuffer(G.patches, 0, pt.buffer, pt.byteOffset, pt.byteLength);
    var enc = dev.createCommandEncoder();
    G.steps.forEach(function (s) {
      var pass = enc.beginComputePass();
      pass.setPipeline(s[0]);
      pass.setBindGroup(0, s[1]);
      pass.dispatchWorkgroups(s[2], s[3]);
      pass.end();
    });
    enc.copyBufferToBuffer(G.out, 0, G.read, 0, 512 * 4);
    dev.queue.submit([enc.finish()]);
    var errs = watch ? dev.popErrorScope() : Promise.resolve(null);
    return errs.then(function (err) {
      if (err) throw new Error('WebGPU: ' + err.message);
      return G.read.mapAsync(GPUMapMode.READ);
    }).then(function () {
      var r = new Float32Array(G.read.getMappedRange().slice(0));
      G.read.unmap();
      var ok = false;
      for (var i = 0; i < r.length; i++) { if (r[i] !== r[i]) { ok = false; break; } if (r[i] !== 0) ok = true; }
      if (!ok) throw new Error('WebGPU gave no answer');
      G.checked = true;
      return r;
    });
  }

  /* ---------- one photo's 512 numbers ----------
     rgba: the 224 x 224 pixels from pixels(). Uses the graphics chip when it can. Resolves a Float32Array of 512, unit length */
  function embed(rgba, opts) {
    opts = opts || {};
    var S = M.size, pt = patches(rgba, S);
    var useGPU = opts.backend !== 'js' && !!BLOB;
    return (useGPU ? initGPU() : Promise.resolve(null)).then(function (G) {
      if (G && !G.lost) return embedGPU(G, pt).catch(function (e) { gpu = null; gpuBroken = String(e && e.message || e); return embedCPU(pt, opts); });
      return embedCPU(pt, opts);
    }).then(norm);
  }

  /* ---------- the plain JavaScript model, off the main thread ----------
     Without a graphics chip to use, the model takes a few seconds a photo. It runs in a worker (a copy of this same
     file) so the app keeps moving meanwhile: the weights are handed over to it, not copied */
  function startWorker() {
    if (worker) return worker;
    if (!root.Worker || !SRC || !BLOB) return null;
    try {
      var w = new Worker(SRC);
      w.onmessage = function (ev) {
        var j = wjobs[ev.data.id];
        if (!j) return;
        delete wjobs[ev.data.id];
        if (ev.data.err) j.no(new Error(ev.data.err)); else j.ok(new Float32Array(ev.data.out));
      };
      w.onerror = function () { stopWorker('The animal spotter stopped'); };
      var buf = BLOB.buffer;
      w.postMessage({ init: { M: M } });
      w.postMessage({ blob: buf }, [buf]);
      BLOB = null;
      worker = w;
    } catch (e) { worker = null; }
    return worker;
  }
  /* if the worker goes wrong, the weights went with it: the next scan loads them again from the phone */
  function stopWorker(why) {
    if (worker) { try { worker.terminate(); } catch (e) {} }
    worker = null;
    M = null; BLOB = null;
    Object.keys(wjobs).forEach(function (k) { wjobs[k].no(new Error(why)); delete wjobs[k]; });
  }
  function embedCPU(pt, opts) {
    if (opts.inline || !startWorker()) return embedJS(pt, M.size / 32);
    var g = M.size / 32;
    return new Promise(function (ok, no) {
      var id = ++wid;
      wjobs[id] = { ok: ok, no: no };
      worker.postMessage({ id: id, pt: pt.buffer, g: g }, [pt.buffer]);
    });
  }
  function norm(v) { var s = 0, i; for (i = 0; i < v.length; i++) s += v[i] * v[i]; s = 1 / Math.sqrt(s || 1); var o = new Float32Array(v.length); for (i = 0; i < v.length; i++) o[i] = v[i] * s; return o; }

  /* ---------- deciding what it is ----------
     embs: one or more photos' numbers (a quick burst). They're averaged, compared with every label, and turned into
     chances that add up to 1. Labels of animals you'd hardly ever see in the UK count for a bit less.
     Returns { kind, id, p, gap, top: [[label, chance], ...] }. kind: 'catch' (id is the animal), 'other' (an animal
     not in the collection yet), 'person', 'screen', 'picture', 'toy', 'nothing', or 'unsure' */
  function classify(embs) {
    var dim = M.dim, avg = new Float32Array(dim), i, j;
    embs.forEach(function (e) { for (j = 0; j < dim; j++) avg[j] += e[j]; });
    avg = norm(avg);
    var dc = M.decide, ids = M.labels.ids, kinds = M.labels.kinds;
    var logit = new Float32Array(NL), mx = -1e30;
    for (i = 0; i < NL; i++) {
      var s = 0, o = i * dim;
      for (j = 0; j < dim; j++) s += avg[j] * LAB[o + j];
      logit[i] = dc.logitScale * s + (ids[i].indexOf('far:') === 0 ? dc.farBias : 0);
      if (logit[i] > mx) mx = logit[i];
    }
    var sum = 0, p = new Float32Array(NL);
    for (i = 0; i < NL; i++) { p[i] = Math.exp(logit[i] - mx); sum += p[i]; }
    // labels named like 'dog~poodle' are kinds of one animal, so their chances are added together
    var gp = {}, gkind = {}, order = [];
    for (i = 0; i < NL; i++) {
      p[i] /= sum;
      var g = ids[i].split('~')[0];
      if (!(g in gp)) { gp[g] = 0; gkind[g] = kinds[i]; order.push(g); }
      gp[g] += p[i];
    }
    order.sort(function (a, b) { return gp[b] - gp[a]; });
    var top = order[0], k = gkind[top], gap = gp[top] - gp[order[1]];
    var res = { kind: k, id: k === 'catch' ? top : null, p: gp[top], gap: gap, label: top, top: order.slice(0, 5).map(function (x) { return [x, Math.round(gp[x] * 1000) / 1000]; }) };
    if (k === 'catch' && (gp[top] < dc.pMin || gap < dc.margin)) { res.kind = 'unsure'; res.id = null; }
    else if (k !== 'catch' && gp[top] < dc.rejectMin) res.kind = 'unsure';
    // how sure it was of the animal it's best at, even when it's not sure enough to say
    res.guess = top;
    return res;
  }

  WC.spotter = {
    load: load, stored: stored, sizeOnline: sizeOnline, ready: function () { return !!(M && (BLOB || worker)); }, pixels: pixels, patches: patches, embed: embed, classify: classify,
    backend: function () { return gpu && !gpu.lost ? 'gpu' : worker ? 'worker' : 'js'; }, initGPU: initGPU, size: function () { return M ? M.bytes : 0; }, gpuProblem: function () { return gpuBroken; },
    _embedJS: function (pt) { return embedJS(pt, M.size / 32); }, _manifest: function () { return M; }
  };

  /* running as the worker: take the weights once, then turn each photo's patches into its numbers */
  if (typeof document === 'undefined' && typeof root.importScripts === 'function') {
    root.onmessage = function (ev) {
      var d = ev.data;
      if (d.init) { M = d.init.M; return; }
      if (d.blob) { BLOB = new Uint8Array(d.blob); return; }
      try {
        var out = embedJS(new Float32Array(d.pt), d.g);
        root.postMessage({ id: d.id, out: out.buffer }, [out.buffer]);
      } catch (e) { root.postMessage({ id: d.id, err: String(e && e.message || e) }); }
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
