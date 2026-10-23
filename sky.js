/* FRZFRM Weather Catch: drawing the sky.
   Each kind of weather has a scene made from simple layers (sky, sun, clouds, rain, snow, wind, fog, lightning, ground).
   The same scenes fill the live sky, the jars on the shelf and the catching games. */
(function (root) {
  'use strict';
  var WC = root.WC = root.WC || {};
  var TAU = Math.PI * 2;

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ---------- one of a kind ----------
     Every catch has its own seed, so two people catching the same storm get different jars: the clouds, rain, stars and hills
     fall differently, and the sun, moon and lightning sit in slightly different places. With no seed a scene draws exactly as it always has. */
  var NOJ = { sx: 0, sy: 0, bx: 0, h1: 0, h2: 0, f: 0, dx: 0, dy: 0, rot: 0, rb: 0 };
  var SALT = 0, J = NOJ;
  function mix(a, b) {
    var h = Math.imul((a >>> 0) ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul(((b >>> 0) + 0x6A09E667) | 0, 0xC2B2AE35);
    h ^= h >>> 16; h = Math.imul(h, 0x7FEB352D);
    h ^= h >>> 15; h = Math.imul(h, 0x846CA68B);
    h ^= h >>> 16;
    return h >>> 0;
  }
  /* a layer's random numbers, shuffled by the catch's seed */
  function sr(seed) { return rng(SALT ? mix(seed, SALT) : seed); }
  function setMark(mk) {
    SALT = mk && mk.seed ? mk.seed >>> 0 : 0;
    if (!SALT) { J = NOJ; return; }
    var r = rng(mix(SALT, 99));
    J = {
      sx: (r() - 0.5) * 0.08, sy: (r() - 0.5) * 0.05, bx: (r() - 0.5) * 0.16, h1: (r() - 0.5) * 2.4, h2: (r() - 0.5) * 2.4,
      f: r() * TAU, dx: (r() - 0.5) * 0.12, dy: (r() - 0.5) * 0.08, rot: (r() - 0.5) * 0.5, rb: (r() - 0.5) * 0.1
    };
  }

  var CL = {
    white: 'rgba(255,255,255,0.92)', light: 'rgba(222,227,236,0.92)', grey: 'rgba(170,177,190,0.92)',
    dark: 'rgba(92,100,118,0.94)', storm: 'rgba(48,52,74,0.96)', violet: 'rgba(96,90,140,0.94)',
    pink: 'rgba(255,200,205,0.85)', gold: 'rgba(255,218,160,0.88)', green: 'rgba(78,98,90,0.94)'
  };
  function cl(n, y0, y1, size, speed, col, seed) { return { n: n, y0: y0, y1: y1, size: size, speed: speed, col: col, seed: seed }; }
  function rain(n, len, speed, alpha, width, slant, seed, x0, x1) { return { n: n, len: len, speed: speed, alpha: alpha, width: width, slant: slant, seed: seed, x0: x0 || 0, x1: x1 === undefined ? 1.1 : x1 }; }
  function snow(n, size, speed, alpha, wobble, seed, slant) { return { n: n, size: size, speed: speed, alpha: alpha, wobble: wobble, seed: seed, slant: slant || 0 }; }

  var SCENES = {
    sunnyspells: { sky: ['#3C86E8', '#B8DCFF'], sun: [0.72, 0.24, 0.07, 3.2], clouds: [cl(4, 0.12, 0.42, 0.17, 0.012, 'white', 12)] },
    clear: { sky: ['#2E7BE6', '#A8D8FF'], sun: [0.74, 0.26, 0.075, 3.6] },
    sunrise: { sky: ['#40508F', '#F7A66A'], sun: [0.3, 0.8, 0.075, 4.5, '#FFD9A8'], clouds: [cl(3, 0.2, 0.45, 0.16, 0.006, 'pink', 51)] },
    goldenhour: { sky: ['#2F62AE', '#F6C46E'], sun: [0.72, 0.66, 0.07, 4.2, '#FFE3A3'], rays: [0.72, 0.66], clouds: [cl(3, 0.12, 0.38, 0.15, 0.008, 'gold', 52)] },
    hotday: { sky: ['#2D86EA', '#CFE9FF'], sun: [0.6, 0.24, 0.085, 4], shimmer: 0.6 },
    heatwave: { sky: ['#F0913F', '#FFE2A6'], sun: [0.5, 0.3, 0.1, 4.2], shimmer: 1 },
    scorcher: { sky: ['#D9502A', '#FFC56B'], sun: [0.5, 0.3, 0.12, 5, '#FFFFFF'], shimmer: 1.6 },

    drizzle: { sky: ['#66738A', '#B0B8C6'], clouds: [cl(7, 0, 0.35, 0.26, 0.006, 'grey', 15)], rain: rain(70, 0.028, 0.32, 0.5, 1, 0.18, 16) },
    rain: { sky: ['#4F5A70', '#949EAF'], clouds: [cl(7, 0, 0.35, 0.27, 0.007, 'dark', 17)], rain: rain(120, 0.055, 0.85, 0.55, 1.2, 0.22, 18) },
    showers: { sky: ['#5A79A8', '#B9C9DE'], sun: [0.82, 0.2, 0.055, 3], clouds: [cl(4, 0.05, 0.35, 0.22, 0.01, 'white', 21), cl(3, 0.15, 0.4, 0.2, 0.012, 'grey', 22)], rain: rain(70, 0.05, 0.8, 0.45, 1.1, 0.2, 23) },
    downpour: { sky: ['#363F52', '#6B7588'], clouds: [cl(8, 0, 0.35, 0.28, 0.008, 'storm', 19)], rain: rain(240, 0.085, 1.4, 0.6, 1.4, 0.28, 20) },
    sidewaysrain: { sky: ['#3E4A62', '#8592A8'], clouds: [cl(7, 0, 0.33, 0.26, 0.05, 'dark', 53)], rain: rain(200, 0.05, 1.1, 0.6, 1.3, 1.6, 54), wind: { n: 16, alpha: 0.5, speed: 0.9, seed: 55 } },
    cloudburst: { sky: ['#232A3A', '#4E5870'], clouds: [cl(9, 0, 0.38, 0.3, 0.006, 'storm', 56)], rain: rain(380, 0.12, 1.8, 0.62, 1.6, 0.18, 57), murk: 0.22 },
    monsoon: { sky: ['#40605A', '#9DB8AA'], clouds: [cl(8, 0, 0.36, 0.28, 0.006, 'green', 58)], rain: rain(300, 0.1, 1.5, 0.55, 1.5, 0.12, 59), ground: 'green' },

    frost: { sky: ['#7FA7D9', '#E6F0FB'], sun: [0.25, 0.7, 0.06, 3, '#FFF1DA'], ground: 'frost', sparkle: 40 },
    sleet: { sky: ['#7D889E', '#C9D0DC'], clouds: [cl(7, 0, 0.33, 0.26, 0.006, 'grey', 30)], snow: snow(50, 1.7, 0.22, 0.85, 0.6, 31), rain: rain(55, 0.035, 0.6, 0.45, 1, 0.18, 32), ground: 'slush' },
    hardfrost: { sky: ['#5C85C4', '#DCE9F8'], sun: [0.3, 0.72, 0.055, 2.6, '#FFF5E6'], ground: 'frost', sparkle: 90, tint: 'rgba(160,200,255,0.12)' },
    hail: { sky: ['#3A4256', '#7C869C'], clouds: [cl(8, 0, 0.35, 0.28, 0.01, 'storm', 60)], hail: { n: 70, size: 2.6, speed: 1.3, seed: 61 } },
    snow: { sky: ['#8A95AC', '#DDE3EE'], clouds: [cl(6, 0, 0.3, 0.26, 0.004, 'light', 33)], snow: snow(90, 2.2, 0.11, 0.95, 1, 34), ground: 'snow' },
    freezingrain: { sky: ['#6E7A90', '#BCC6D4'], clouds: [cl(7, 0, 0.33, 0.26, 0.006, 'grey', 62)], rain: rain(110, 0.045, 0.8, 0.6, 1.2, 0.15, 63), ground: 'ice', sparkle: 30 },
    heavysnow: { sky: ['#76819A', '#C5CCDA'], clouds: [cl(7, 0, 0.3, 0.27, 0.005, 'grey', 35)], snow: snow(210, 2.5, 0.17, 0.95, 1.4, 36), ground: 'snow' },
    blizzard: { sky: ['#8790A6', '#D3D9E4'], clouds: [cl(6, 0, 0.3, 0.27, 0.04, 'grey', 64)], snow: snow(260, 2.3, 0.3, 0.95, 0.6, 65, 1.4), wind: { n: 20, alpha: 0.5, speed: 1.2, seed: 66 }, murk: 0.28, ground: 'snow' },

    breeze: { sky: ['#5C9AE6', '#CBE3FA'], sun: [0.8, 0.22, 0.055, 3], clouds: [cl(4, 0.1, 0.4, 0.15, 0.03, 'white', 67)], wind: { n: 7, alpha: 0.45, speed: 0.35, seed: 68 } },
    windy: { sky: ['#5F82B5', '#BFD1E8'], clouds: [cl(5, 0.08, 0.4, 0.18, 0.05, 'white', 25)], wind: { n: 14, alpha: 0.6, speed: 0.55, seed: 26 } },
    gale: { sky: ['#465A7C', '#8EA1BF'], clouds: [cl(6, 0.05, 0.4, 0.2, 0.1, 'grey', 27)], wind: { n: 30, alpha: 0.7, speed: 1.1, seed: 28 }, leaves: 10 },
    stormforce: { sky: ['#2F3D57', '#6E7F9C'], clouds: [cl(7, 0.02, 0.4, 0.22, 0.16, 'dark', 69)], wind: { n: 46, alpha: 0.75, speed: 1.6, seed: 70 }, leaves: 18, rain: rain(60, 0.04, 1, 0.4, 1, 1.4, 71) },
    namedstorm: { sky: ['#2B2746', '#69648C'], swirl: true, clouds: [cl(8, 0, 0.4, 0.25, 0.12, 'violet', 72)], wind: { n: 40, alpha: 0.7, speed: 1.5, seed: 73 }, rain: rain(140, 0.06, 1.2, 0.5, 1.2, 1.2, 74) },
    tornado: { sky: ['#33433C', '#7E9184'], clouds: [cl(8, 0, 0.3, 0.26, 0.02, 'green', 75)], tornado: 0.55, wind: { n: 16, alpha: 0.5, speed: 1, seed: 76 } },

    rumble: { sky: ['#5B7FB8', '#C3D3EA'], sun: [0.2, 0.25, 0.05, 2.8], farstorm: true, clouds: [cl(3, 0.08, 0.3, 0.14, 0.01, 'white', 77)] },
    sheetlightning: { sky: ['#1F2338', '#4B5272'], clouds: [cl(9, 0, 0.45, 0.28, 0.006, 'storm', 78)], sheet: true },
    thunderstorm: { sky: ['#262A40', '#585D78'], clouds: [cl(8, 0, 0.35, 0.28, 0.01, 'storm', 37)], rain: rain(170, 0.07, 1.2, 0.55, 1.3, 0.25, 38), bolt: [0.42, null, 4.6] },
    lightningstrike: { sky: ['#191C2E', '#454A66'], clouds: [cl(9, 0, 0.36, 0.29, 0.012, 'storm', 79)], rain: rain(220, 0.08, 1.4, 0.55, 1.4, 0.25, 80), bolt: [0.5, 'rgba(235,240,255,0.35)', 2.2] },
    supercell: { sky: ['#2A3B4A', '#7A8E8A'], anvil: true, rain: rain(120, 0.07, 1.3, 0.5, 1.3, 0.1, 81, 0.32, 0.68), bolt: [0.5, null, 3.4] },
    thundersnow: { sky: ['#35335A', '#8784AE'], clouds: [cl(8, 0, 0.33, 0.28, 0.008, 'violet', 39)], snow: snow(180, 2.4, 0.16, 0.95, 1.4, 40), bolt: [0.58, 'rgba(200,180,255,0.3)', 4.6], ground: 'snow' },

    overcast: { sky: ['#768092', '#C2C7D1'], clouds: [cl(6, 0.02, 0.32, 0.26, 0.005, 'light', 13), cl(6, 0.18, 0.55, 0.22, 0.008, 'grey', 14)] },
    mist: { sky: ['#9AA6B8', '#D8DEE6'], sun: [0.7, 0.3, 0.05, 2.2, 'rgba(255,246,225,0.75)'], fog: { n: 5, alpha: 0.45, top: 0.35, seed: 82 } },
    fog: { sky: ['#AEB5C1', '#DCE0E6'], fog: { n: 7, alpha: 0.75, top: 0.12, seed: 24 } },
    lowcloud: { sky: ['#8E9AAD', '#D3D9E2'], ground: 'peaks', fog: { n: 7, alpha: 0.72, top: 0.2, seed: 83 }, fogOver: true },
    seafret: { sky: ['#A3AFBF', '#D9DFE6'], ground: 'sea', fog: { n: 7, alpha: 0.68, top: 0.25, seed: 84 }, fogOver: true },
    freezingfog: { sky: ['#A9BED6', '#E2EAF3'], ground: 'frost', sparkle: 50, fog: { n: 7, alpha: 0.7, top: 0.12, seed: 85 }, fogOver: true },
    cloudinversion: { sky: ['#2E7BE6', '#BFE0FF'], sun: [0.78, 0.2, 0.06, 3.2], ground: 'cloudsea' },

    starry: { night: true, sky: ['#060B22', '#1F2E5C'], stars: 90, moon: [0.76, 0.22, 0.055, 'crescent'] },
    fullmoon: { night: true, sky: ['#071030', '#22346A'], stars: 40, moon: [0.7, 0.26, 0.075, 'full'] },
    meteor: { night: true, sky: ['#050A20', '#1B2A57'], stars: 110, meteors: true },
    sunhalo: { sky: ['#4A8CE0', '#C4DDF6'], cirrus: true, sun: [0.5, 0.34, 0.05, 2.4], halo: true },
    supermoon: { night: true, sky: ['#071030', '#22346A'], stars: 30, moon: [0.6, 0.32, 0.12, 'full'] },
    rainbow: { sky: ['#5A79A8', '#C9D8EA'], sun: [0.86, 0.16, 0.05, 3], rainbow: 'single', clouds: [cl(3, 0.05, 0.25, 0.18, 0.008, 'white', 42)], rain: rain(40, 0.045, 0.7, 0.35, 1, 0.2, 43) },
    sundog: { sky: ['#4D88D6', '#F2D7B0'], cirrus: true, sun: [0.5, 0.6, 0.045, 2.6], sundogs: true },
    fogbow: { sky: ['#B3BDC9', '#E4E8EE'], rainbow: 'fog', fog: { n: 6, alpha: 0.55, top: 0.3, seed: 86 } },
    doublerainbow: { sky: ['#5A79A8', '#C9D8EA'], sun: [0.88, 0.14, 0.045, 3], rainbow: 'double', rain: rain(40, 0.045, 0.7, 0.35, 1, 0.2, 87) },
    moonbow: { night: true, sky: ['#081236', '#26386E'], stars: 40, moon: [0.86, 0.15, 0.05, 'full'], rainbow: 'moon', rain: rain(40, 0.045, 0.7, 0.3, 1, 0.2, 88) },
    aurora: { night: true, sky: ['#040A1C', '#0F2240'], stars: 80, aurora: true },
    eclipse: { sky: ['#1C2140', '#4B5385'], stars: 20, eclipse: true },

    sunbreak: { sky: ['#55627A', '#C6D3E6'], clouds: [cl(5, 0, 0.3, 0.28, 0.004, 'dark', 44)], sun: [0.78, 0.22, 0.065, 3.4], rays: [0.78, 0.22], rain: rain(35, 0.04, 0.7, 0.3, 1, 0.2, 45) },
    foglifts: { sky: ['#5E9BE8', '#E1E6EC'], sun: [0.72, 0.24, 0.065, 3.4], fog: { n: 4, alpha: 0.6, top: 0.55, seed: 48 } },
    thaw: { sky: ['#6FA0DA', '#DCE8F5'], sun: [0.75, 0.25, 0.06, 3.2], ground: 'thaw', drips: true },
    winddrops: { sky: ['#6A9BDB', '#D6E6F7'], sun: [0.25, 0.28, 0.055, 3], clouds: [cl(3, 0.12, 0.35, 0.16, 0.002, 'white', 89)], wind: { n: 3, alpha: 0.3, speed: 0.1, seed: 90 } },
    firstflakes: { sky: ['#7B8499', '#CCD2DE'], clouds: [cl(6, 0, 0.3, 0.26, 0.004, 'light', 46)], snow: snow(24, 3.2, 0.07, 1, 1, 47) },
    stormfront: { sky: ['#3D78C9', '#9EC6F0'], sun: [0.18, 0.24, 0.055, 3], front: true, rain: rain(90, 0.065, 1.1, 0.5, 1.2, 0.22, 49, 0.55), bolt: [0.74, null, 4.6] },
    calm: { sky: ['#5C93D8', '#E3ECF5'], sun: [0.3, 0.3, 0.06, 3.4], clouds: [cl(3, 0.02, 0.2, 0.24, 0.02, 'dark', 91)], ground: 'wet' },

    quiet: { night: true, sky: ['#0B1230', '#26355F'], stars: 30, moon: [0.72, 0.24, 0.045, 'crescent'], clouds: [cl(4, 0.1, 0.45, 0.2, 0.004, 'dark', 92)] }
  };

  /* ---------- layers ---------- */

  function puff(ctx, x, y, s, col) {
    ctx.fillStyle = col;
    var c = [[0, 0, 0.55], [0.55, -0.28, 0.66], [1.15, 0, 0.5], [0.5, 0.18, 0.56]];
    ctx.beginPath();
    for (var i = 0; i < c.length; i++) {
      var cx = x + c[i][0] * s, cy = y + c[i][1] * s, r = c[i][2] * s;
      ctx.moveTo(cx + r, cy);
      ctx.arc(cx, cy, r, 0, TAU);
    }
    ctx.fill();
  }
  function clouds(ctx, W, H, t, o) {
    var r = sr(o.seed);
    for (var i = 0; i < o.n; i++) {
      var s = o.size * (0.7 + r() * 0.6) * W;
      var span = W + s * 2.6;
      var base = r() * span;
      var y = (o.y0 + (o.y1 - o.y0) * r()) * H;
      var sp = o.speed * W * (0.6 + r() * 0.8);
      var x = ((base + t * sp) % span) - s * 1.4;
      puff(ctx, x, y, s, CL[o.col] || o.col);
    }
  }
  function rainL(ctx, W, H, t, o) {
    var r = sr(o.seed);
    var k = W / 300;
    ctx.strokeStyle = 'rgba(228,236,250,' + o.alpha + ')';
    ctx.lineWidth = o.width * k;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i < o.n; i++) {
      var x0 = (o.x0 + r() * (o.x1 - o.x0)) * W;
      var y0 = r() * H;
      var sp = o.speed * (0.7 + r() * 0.6) * H;
      var len = o.len * H * (0.7 + r() * 0.6);
      var y = ((y0 + t * sp) % (H + len)) - len;
      var x = x0 - o.slant * (y / H) * W * 0.15;
      if (o.slant > 1) x = ((x % (W * 1.2)) + W * 1.2) % (W * 1.2) - W * 0.1;
      ctx.moveTo(x, y);
      ctx.lineTo(x - o.slant * len * 0.35, y + len);
    }
    ctx.stroke();
  }
  function snowL(ctx, W, H, t, o) {
    var r = sr(o.seed);
    var k = W / 300;
    ctx.fillStyle = 'rgba(255,255,255,' + o.alpha + ')';
    ctx.beginPath();
    for (var i = 0; i < o.n; i++) {
      var x0 = r() * W, y0 = r() * H;
      var s = o.size * (0.5 + r()) * k;
      var sp = o.speed * (0.6 + r() * 0.8) * H;
      var ph = r() * TAU;
      var y = ((y0 + t * sp) % (H + 10 * k)) - 5 * k;
      var x = x0 + Math.sin(t * 1.3 + ph) * o.wobble * 6 * k - o.slant * (t * sp * 0.6);
      x = ((x % W) + W) % W;
      ctx.moveTo(x + s, y);
      ctx.arc(x, y, s, 0, TAU);
    }
    ctx.fill();
  }
  function hailL(ctx, W, H, t, o) {
    var r = sr(o.seed);
    var k = W / 300;
    ctx.fillStyle = 'rgba(245,250,255,0.95)';
    ctx.beginPath();
    for (var i = 0; i < o.n; i++) {
      var x = r() * W, y0 = r() * H;
      var s = o.size * (0.6 + r() * 0.8) * k;
      var sp = o.speed * (0.8 + r() * 0.4) * H;
      var y = ((y0 + t * sp) % (H * 0.9));
      ctx.moveTo(x + s, y);
      ctx.arc(x, y, s, 0, TAU);
    }
    ctx.fill();
  }
  function sunAt(ctx, W, H, s) {
    var cx = s[0] * W, cy = s[1] * H, rr = s[2] * W, glow = s[3];
    var g = ctx.createRadialGradient(cx, cy, rr * 0.2, cx, cy, rr * glow);
    g.addColorStop(0, 'rgba(255,244,214,0.95)');
    g.addColorStop(0.35, 'rgba(255,226,150,0.5)');
    g.addColorStop(1, 'rgba(255,226,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, rr * glow, 0, TAU); ctx.fill();
    ctx.fillStyle = s[4] || '#FFF4D8';
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
  }
  function rays(ctx, W, H, t, x, y) {
    ctx.save();
    ctx.translate(x * W, y * H);
    var L = H * 1.3;
    for (var i = 0; i < 7; i++) {
      var a = 1.85 + i * 0.11 + Math.sin(t * 0.4 + i) * 0.012;
      ctx.fillStyle = 'rgba(255,236,190,' + (0.1 + 0.04 * Math.sin(t * 0.7 + i * 1.7)) + ')';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - 0.03) * L, Math.sin(a - 0.03) * L);
      ctx.lineTo(Math.cos(a + 0.03) * L, Math.sin(a + 0.03) * L);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  function halo(ctx, W, H, s) {
    var cx = s[0] * W, cy = s[1] * H, R = W * 0.26, k = W / 300;
    ctx.save();
    ctx.lineWidth = 7 * k;
    ctx.strokeStyle = 'rgba(255,190,160,0.28)';
    ctx.beginPath(); ctx.arc(cx, cy, R - 4 * k, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(170,200,255,0.25)';
    ctx.beginPath(); ctx.arc(cx, cy, R + 5 * k, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function sundogs(ctx, W, H, s, t) {
    var cy = s[1] * H, k = W / 300;
    [-1, 1].forEach(function (side) {
      var cx = s[0] * W + side * W * 0.27;
      var a = 0.75 + 0.15 * Math.sin(t * 1.5 + side);
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18 * k);
      g.addColorStop(0, 'rgba(255,255,240,' + a + ')');
      g.addColorStop(0.4, 'rgba(255,200,150,' + a * 0.5 + ')');
      g.addColorStop(1, 'rgba(160,190,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx, cy, 10 * k, 18 * k, 0, 0, TAU); ctx.fill();
    });
  }
  function cirrus(ctx, W, H, t) {
    var r = sr(93), k = W / 300;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2 * k;
    ctx.lineCap = 'round';
    for (var i = 0; i < 9; i++) {
      var x = ((r() * W * 1.4 + t * 2 * k) % (W * 1.4)) - W * 0.2;
      var y = H * (0.08 + r() * 0.5);
      var L = W * (0.2 + r() * 0.25);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + L * 0.5, y - 10 * k, x + L, y - 4 * k);
      ctx.stroke();
    }
  }
  function fogB(ctx, W, H, t, o) {
    var r = sr(o.seed);
    for (var i = 0; i < o.n; i++) {
      var y = (o.top + (1 - o.top) * (i / o.n)) * H + Math.sin(t * 0.35 + i * 1.3 + J.f) * H * 0.012;
      var h = H * (0.1 + r() * 0.07);
      var a = o.alpha * (0.75 + 0.25 * Math.sin(t * 0.25 + i));
      var g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, 'rgba(238,241,246,0)');
      g.addColorStop(0.5, 'rgba(238,241,246,' + a + ')');
      g.addColorStop(1, 'rgba(238,241,246,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, W, h);
    }
  }
  function windL(ctx, W, H, t, o) {
    var r = sr(o.seed);
    var k = W / 300;
    ctx.strokeStyle = 'rgba(255,255,255,' + o.alpha + ')';
    ctx.lineWidth = 1.6 * k;
    ctx.lineCap = 'round';
    for (var i = 0; i < o.n; i++) {
      var y = r() * H * 0.75;
      var L = W * (0.12 + r() * 0.2);
      var span = W + L;
      var x = ((r() * span + t * o.speed * W * (0.7 + r() * 0.6)) % span) - L;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + L * 0.5, y - 6 * k, x + L, y);
      ctx.stroke();
    }
  }
  function leaves(ctx, W, H, t, n) {
    var r = sr(29);
    var k = W / 300;
    for (var i = 0; i < n; i++) {
      var span = W + 20 * k;
      var x = ((r() * span + t * W * (0.5 + r() * 0.5)) % span) - 10 * k;
      var y = H * (0.3 + r() * 0.45) + Math.sin(t * 3 + i) * 8 * k;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 4 + i);
      ctx.fillStyle = i % 2 ? 'rgba(201,140,62,0.9)' : 'rgba(150,104,48,0.9)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 4 * k, 2 * k, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  function stars(ctx, W, H, t, n) {
    var r = sr(41);
    var k = W / 300;
    for (var i = 0; i < n; i++) {
      var x = r() * W, y = r() * H * 0.72, s = (0.4 + r() * 1.3) * k;
      var tw = 0.5 + 0.5 * Math.sin(t * (1 + r() * 2) + r() * 6);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.7 * tw) + ')';
      ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    }
  }
  function moon(ctx, W, H, m) {
    var cx = W * m[0], cy = H * m[1], r = W * m[2];
    var g = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 4);
    g.addColorStop(0, 'rgba(230,236,255,0.38)');
    g.addColorStop(1, 'rgba(230,236,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r * 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#EEF2FF';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    if (m[3] === 'crescent') {
      ctx.fillStyle = 'rgba(7,12,36,0.94)';
      ctx.beginPath(); ctx.arc(cx + r * 0.45, cy - r * 0.2, r * 0.92, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(170,180,205,0.45)';
      [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.18], [-0.05, 0.35, 0.14], [0.35, -0.35, 0.1]].forEach(function (s) {
        ctx.beginPath(); ctx.arc(cx + s[0] * r, cy + s[1] * r, s[2] * r, 0, TAU); ctx.fill();
      });
    }
  }
  function aurora(ctx, W, H, t) {
    var k = W / 300;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var cols = [['rgba(80,255,170,', 0.0], ['rgba(110,220,255,', 1.7], ['rgba(190,120,255,', 3.1]];
    for (var c = 0; c < cols.length; c++) {
      var base = cols[c][0], ph = cols[c][1];
      for (var x = 0; x <= W; x += 3 * k) {
        var f = x / W;
        var y = H * (0.18 + 0.1 * Math.sin(f * 5 + t * 0.35 + ph + J.f) + 0.05 * Math.sin(f * 11 - t * 0.6 + J.f));
        var h = H * (0.22 + 0.08 * Math.sin(f * 7 + t * 0.5 + ph));
        var a = (0.16 + 0.12 * Math.sin(f * 9 + t * 0.8 + ph)) * (c === 0 ? 1 : 0.6);
        if (a <= 0) continue;
        var g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, base + '0)');
        g.addColorStop(0.65, base + a + ')');
        g.addColorStop(1, base + '0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 3.2 * k, h);
      }
    }
    ctx.restore();
  }
  function meteors(ctx, W, H, t) {
    var k = W / 300;
    for (var i = 0; i < 3; i++) {
      var period = 2.6 + i * 0.9;
      var p = ((t + i * 1.3) % period) / period;
      if (p > 0.35) continue;
      var r = sr(Math.floor((t + i * 1.3) / period) * 7 + i);
      var x0 = W * (0.2 + r() * 0.7), y0 = H * (0.05 + r() * 0.3);
      var len = W * 0.28;
      var x = x0 - p / 0.35 * len, y = y0 + p / 0.35 * len * 0.5;
      var g = ctx.createLinearGradient(x, y, x + len * 0.35, y - len * 0.17);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2 * k;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * 0.35, y - len * 0.17); ctx.stroke();
    }
  }
  function eclipse(ctx, W, H, t) {
    var cx = W * (0.55 + J.sx), cy = H * (0.34 + J.sy), r = W * 0.09;
    var g = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 3.2);
    g.addColorStop(0, 'rgba(255,246,220,0.85)');
    g.addColorStop(0.3, 'rgba(255,230,190,0.3)');
    g.addColorStop(1, 'rgba(255,230,190,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r * 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFF2D6';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    var off = r * (0.32 + 0.05 * Math.sin(t * 0.3));
    ctx.fillStyle = '#0E1226';
    ctx.beginPath(); ctx.arc(cx - off, cy + off * 0.3, r * 0.98, 0, TAU); ctx.fill();
  }
  /* mul: fainter or stronger than usual */
  function rainbowArc(ctx, W, H, kind, mul) {
    var cx = W * (0.42 + J.rb), cy = H * 0.98, R = W * 0.66, bw = W * 0.02;
    var cols = ['#FF5A5A', '#FF9F43', '#FFD84D', '#5BD46F', '#4DA3FF', '#5C6BFF', '#A36BFF'];
    ctx.save();
    if (kind === 'fog') {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = bw * 5;
      ctx.beginPath(); ctx.arc(cx, cy, R - bw * 3, Math.PI, TAU); ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.globalAlpha = (kind === 'moon' ? 0.28 : 0.6) * (mul || 1);
    for (var i = 0; i < cols.length; i++) {
      ctx.strokeStyle = kind === 'moon' ? (i < 3 ? '#FFF6E8' : '#E6ECFF') : cols[i];
      ctx.lineWidth = bw;
      ctx.beginPath(); ctx.arc(cx, cy, R - i * bw, Math.PI, TAU); ctx.stroke();
    }
    if (kind === 'double') {
      ctx.globalAlpha = 0.32;
      var R2 = R + bw * 4;
      for (var j = 0; j < cols.length; j++) {
        ctx.strokeStyle = cols[cols.length - 1 - j];
        ctx.lineWidth = bw * 0.9;
        ctx.beginPath(); ctx.arc(cx, cy, R2 + j * bw * 0.9, Math.PI, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function shimmer(ctx, W, H, t, amt) {
    var k = W / 300;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.14 + 0.08 * amt) + ')';
    ctx.lineWidth = 1.2 * k;
    for (var i = 0; i < 5; i++) {
      var y = H * (0.6 + i * 0.045);
      ctx.beginPath();
      for (var x = 0; x <= W; x += 6 * k) ctx.lineTo(x, y + Math.sin(x * 0.05 / k + t * 3 + i) * 2.2 * k * amt);
      ctx.stroke();
    }
  }
  function boltPath(ctx, W, seed, x0, y0, x1, y1, steps) {
    var r = rng(seed);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (var i = 1; i < steps; i++) {
      var f = i / steps;
      ctx.lineTo(x0 + (x1 - x0) * f + (r() - 0.5) * W * 0.1, y0 + (y1 - y0) * f);
    }
    ctx.lineTo(x1, y1);
  }
  function flashOn(p) { return p < 0.09 || (p > 0.18 && p < 0.25); }
  function boltX(b) { return J === NOJ ? b[0] : Math.max(0.24, Math.min(0.7, b[0] + J.bx)); }
  function bolt(ctx, W, H, t, b) {
    var period = b[2] || 4.6;
    if (!flashOn(t % period)) return;
    var k = W / 300, x = boltX(b);
    ctx.fillStyle = b[1] || 'rgba(235,240,255,0.28)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.96)';
    ctx.lineWidth = 2.4 * k;
    ctx.lineJoin = 'round';
    var seed = Math.floor(t / period) + 7;
    boltPath(ctx, W, SALT ? mix(seed, SALT) : seed, x * W, H * 0.3, x * W + W * 0.04, H * 0.78, 7);
    ctx.stroke();
  }
  function sheet(ctx, W, H, t) {
    var p = t % 3.2;
    var a = p < 0.12 ? 0.45 : (p > 0.22 && p < 0.3) ? 0.3 : (p > 1.6 && p < 1.68) ? 0.2 : 0;
    if (!a) return;
    var g = ctx.createRadialGradient(W * (0.6 + J.sx), H * 0.25, 0, W * (0.6 + J.sx), H * 0.25, W * 0.8);
    g.addColorStop(0, 'rgba(225,230,255,' + a + ')');
    g.addColorStop(1, 'rgba(225,230,255,' + a * 0.3 + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  function farstorm(ctx, W, H, t) {
    for (var i = 0; i < 4; i++) puff(ctx, W * (0.55 + i * 0.12), H * (0.52 - (i % 2) * 0.06), W * 0.13, CL.storm);
    var p = t % 3.8;
    if (p < 0.1 || (p > 0.2 && p < 0.26)) {
      var g = ctx.createRadialGradient(W * 0.78, H * 0.5, 0, W * 0.78, H * 0.5, W * 0.2);
      g.addColorStop(0, 'rgba(255,250,220,0.55)');
      g.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = g;
      ctx.fillRect(W * 0.5, H * 0.3, W * 0.5, H * 0.4);
    }
  }
  function front(ctx, W, H) {
    for (var i = 0; i < 6; i++) puff(ctx, W * (0.48 + i * 0.1), H * (0.06 + (i % 2) * 0.12), W * 0.22, CL.storm);
  }
  function anvil(ctx, W, H) {
    var g = ctx.createLinearGradient(0, H * 0.1, 0, H * 0.8);
    g.addColorStop(0, 'rgba(230,234,240,0.95)');
    g.addColorStop(0.5, 'rgba(120,130,145,0.96)');
    g.addColorStop(1, 'rgba(40,46,60,0.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(W * 0.32, H * 0.78);
    ctx.lineTo(W * 0.36, H * 0.3);
    ctx.quadraticCurveTo(W * 0.18, H * 0.24, W * 0.04, H * 0.2);
    ctx.quadraticCurveTo(W * 0.5, H * 0.04, W * 0.98, H * 0.16);
    ctx.quadraticCurveTo(W * 0.78, H * 0.24, W * 0.64, H * 0.3);
    ctx.lineTo(W * 0.68, H * 0.78);
    ctx.closePath();
    ctx.fill();
    for (var i = 0; i < 5; i++) puff(ctx, W * (0.3 + i * 0.08), H * (0.62 - i * 0.07), W * 0.1, 'rgba(70,78,95,0.85)');
  }
  function tornadoL(ctx, W, H, t, x) {
    var k = W / 300;
    ctx.fillStyle = 'rgba(70,80,74,0.85)';
    for (var i = 0; i < 26; i++) {
      var f = i / 25;
      var y = H * (0.3 + f * 0.52);
      var w = W * (0.16 * (1 - f) + 0.012);
      var cx = (x + J.bx * 0.5) * W + Math.sin(t * 2 + f * 5) * 10 * k * f;
      ctx.beginPath(); ctx.ellipse(cx, y, w, 5 * k, 0, 0, TAU); ctx.fill();
    }
  }
  function swirl(ctx, W, H, t) {
    var k = W / 300;
    ctx.save();
    ctx.translate(W * 0.5, H * 0.35);
    ctx.rotate(t * 0.3);
    ctx.strokeStyle = 'rgba(200,190,255,0.18)';
    ctx.lineWidth = 10 * k;
    for (var i = 0; i < 3; i++) {
      ctx.rotate(TAU / 3);
      ctx.beginPath();
      for (var a = 0; a < 5; a += 0.2) ctx.lineTo(Math.cos(a) * a * 14 * k, Math.sin(a) * a * 14 * k);
      ctx.stroke();
    }
    ctx.restore();
  }
  function sparkle(ctx, W, H, t, n) {
    var r = sr(94), k = W / 300;
    for (var i = 0; i < n; i++) {
      var x = r() * W, y = H * (0.82 + r() * 0.17);
      var a = Math.max(0, Math.sin(t * (1.5 + r() * 2) + r() * 6));
      if (a < 0.2) continue;
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
      ctx.fillRect(x - 0.8 * k, y - 0.8 * k, 1.6 * k, 1.6 * k);
    }
  }
  function drips(ctx, W, H, t) {
    var k = W / 300;
    ctx.fillStyle = 'rgba(236,244,255,0.95)';
    for (var i = 0; i < 9; i++) {
      var x = W * (0.06 + i * 0.11);
      var len = (10 + (i % 3) * 7) * k;
      ctx.beginPath(); ctx.moveTo(x - 4 * k, 0); ctx.lineTo(x + 4 * k, 0); ctx.lineTo(x, len); ctx.closePath(); ctx.fill();
      var ph = (t * 0.6 + i * 0.29) % 1;
      ctx.fillStyle = 'rgba(170,212,255,' + (0.9 - ph * 0.6) + ')';
      ctx.beginPath(); ctx.arc(x, len + ph * H * 0.6, 2 * k, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(236,244,255,0.95)';
    }
  }
  function hill(ctx, W, H, base, amp, col, ph) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var i = 0; i <= 24; i++) {
      var f = i / 24;
      ctx.lineTo(f * W, H * base - Math.sin(f * Math.PI * 2 + ph) * H * amp - Math.sin(f * Math.PI * 5 + ph * 2) * H * amp * 0.4);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }
  function peaks(ctx, W, H, col1, col2, base) {
    ctx.fillStyle = col1;
    ctx.beginPath();
    ctx.moveTo(0, H);
    var pts = [[0, 0.72], [0.14, 0.52], [0.26, 0.64], [0.42, 0.42], [0.56, 0.6], [0.7, 0.48], [0.86, 0.62], [1, 0.55]];
    pts.forEach(function (p) { ctx.lineTo(p[0] * W, (p[1] + base) * H); });
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col2;
    [[0.14, 0.52], [0.42, 0.42], [0.7, 0.48]].forEach(function (p) {
      ctx.beginPath();
      ctx.moveTo((p[0] - 0.05) * W, (p[1] + base + 0.06) * H);
      ctx.lineTo(p[0] * W, (p[1] + base) * H);
      ctx.lineTo((p[0] + 0.05) * W, (p[1] + base + 0.06) * H);
      ctx.closePath();
      ctx.fill();
    });
  }
  function ground(ctx, W, H, kind, night, t) {
    var dk = night;
    switch (kind) {
      case 'snow':
        hill(ctx, W, H, 0.81, 0.035, dk ? '#5C6A8C' : '#C9D3E6', 1.3 + J.h1);
        hill(ctx, W, H, 0.88, 0.03, dk ? '#9AA8C6' : '#F1F4FA', 2.1 + J.h2);
        break;
      case 'slush':
        hill(ctx, W, H, 0.81, 0.035, dk ? '#2A3550' : 'rgba(60,72,96,0.7)', 1.3 + J.h1);
        hill(ctx, W, H, 0.88, 0.03, dk ? '#6C7896' : '#C8D0DE', 2.1 + J.h2);
        break;
      case 'frost':
        hill(ctx, W, H, 0.81, 0.035, dk ? '#4C5E86' : '#B7C9E4', 1.3 + J.h1);
        hill(ctx, W, H, 0.88, 0.03, dk ? '#7F93BB' : '#E4EDF8', 2.1 + J.h2);
        break;
      case 'ice':
        hill(ctx, W, H, 0.81, 0.035, dk ? '#3C4C72' : '#8FA4C4', 1.3 + J.h1);
        hill(ctx, W, H, 0.88, 0.03, dk ? '#6E84AE' : '#D2DDEE', 2.1 + J.h2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(0, H * 0.9, W, H * 0.012);
        break;
      case 'green':
        hill(ctx, W, H, 0.81, 0.035, dk ? '#14261E' : '#3E6B4E', 1.3 + J.h1);
        hill(ctx, W, H, 0.88, 0.03, dk ? '#0B1712' : '#2B5038', 2.1 + J.h2);
        break;
      case 'thaw':
        hill(ctx, W, H, 0.81, 0.035, '#6F9A6C', 1.3 + J.h1);
        hill(ctx, W, H, 0.88, 0.03, '#4F7A50', 2.1 + J.h2);
        ctx.fillStyle = 'rgba(245,248,252,0.9)';
        [[0.15, 0.9, 0.08], [0.5, 0.93, 0.1], [0.82, 0.91, 0.07]].forEach(function (p) {
          ctx.beginPath(); ctx.ellipse(p[0] * W, p[1] * H, p[2] * W, H * 0.02, 0, 0, TAU); ctx.fill();
        });
        break;
      case 'wet':
        hill(ctx, W, H, 0.81, 0.035, 'rgba(22,30,56,0.55)', 1.3 + J.h1);
        hill(ctx, W, H, 0.88, 0.03, 'rgba(12,18,36,0.88)', 2.1 + J.h2);
        ctx.fillStyle = 'rgba(200,225,255,0.3)';
        [[0.25, 0.93, 0.09], [0.66, 0.95, 0.12]].forEach(function (p) {
          ctx.beginPath(); ctx.ellipse(p[0] * W, p[1] * H, p[2] * W, H * 0.012, 0, 0, TAU); ctx.fill();
        });
        break;
      case 'sea':
        ctx.fillStyle = dk ? '#1A2A44' : '#5C7590';
        ctx.fillRect(0, H * 0.78, W, H * 0.22);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = W / 300 * 1.4;
        for (var i = 0; i < 4; i++) {
          var y = H * (0.82 + i * 0.045);
          ctx.beginPath();
          for (var x = 0; x <= W; x += W / 30) ctx.lineTo(x, y + Math.sin(x / W * 18 + t * 1.5 + i) * H * 0.006);
          ctx.stroke();
        }
        break;
      case 'peaks':
        peaks(ctx, W, H, dk ? '#1A2238' : '#55617C', dk ? '#8A96B4' : '#E8EDF5', 0.12);
        break;
      case 'cloudsea':
        peaks(ctx, W, H, '#4E5C78', '#F4F7FB', 0.0);
        ctx.fillStyle = 'rgba(250,252,255,0.97)';
        ctx.fillRect(0, H * 0.74, W, H * 0.26);
        for (var j = 0; j < 9; j++) puff(ctx, W * (j * 0.13 - 0.06) + Math.sin(t * 0.2 + j) * W * 0.01, H * 0.73, W * 0.1, 'rgba(250,252,255,0.97)');
        break;
      default:
        hill(ctx, W, H, 0.81, 0.035, dk ? '#0B1230' : 'rgba(22,30,56,0.55)', 1.3 + J.h1);
        hill(ctx, W, H, 0.88, 0.03, dk ? '#050916' : 'rgba(12,18,36,0.88)', 2.1 + J.h2);
    }
  }

  /* ---------- variants: something extra in the jar ----------
     Drawn in the jar's own space: the body runs from about 15% to 85% across and 30% to 96% down.
     u is a size unit from the jar's width, set by each picture so it reads at shelf size. */

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
  function hillY(f, base, amp, ph) { return base - Math.sin(f * TAU + ph) * amp - Math.sin(f * Math.PI * 5 + ph * 2) * amp * 0.4; }
  /* where something standing at f across meets the ground, as a share of the height */
  function standY(kind, f) {
    if (kind === 'sea') return 0.9;
    if (kind === 'peaks' || kind === 'cloudsea' || kind === 'photo') return 0.95;
    return hillY(f, 0.88, 0.03, 2.1 + J.h2) + 0.012;
  }
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
  function umbrella(ctx, W, H, t, kind) {
    var u = W / 62, f = 0.44 + J.dx * 0.4;
    var x = f * W, gy = standY(kind, f) * H;
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
  function snowman(ctx, W, H, t, kind) {
    var u = W / 70, f = 0.6 + J.dx * 0.3;
    var x = f * W, gy = standY(kind, f) * H;
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
  function windsock(ctx, W, H, t, s, kind) {
    var u = W / 76, f = 0.26 + J.dx * 0.2;
    var x = f * W, gy = standY(kind, f) * H, top = gy - 24 * u;
    var droop = Math.max(0, 0.38 - (s.wind ? s.wind.speed : 0.5) * 0.25);
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
  function lamp(ctx, W, H, t, kind) {
    var u = W / 76, f = 0.34 + J.dx * 0.3;
    var x = f * W, gy = standY(kind, f) * H, top = gy - 26 * u;
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
  /* back: behind the clouds. front: in front of the clouds, behind the rain. ground: last of all */
  var DECO_AT = { plough: 'stars', shooting: 'back', rainbow: 'back', kite: 'front', balloon: 'front', birds: 'front', flyaway: 'front', sprite: 'front' };
  function deco(ctx, W, H, dk, t, at, s, kind) {
    if ((DECO_AT[dk] || 'ground') !== at) return;
    switch (dk) {
      case 'plough': plough(ctx, W, H, t); break;
      case 'shooting': shooting(ctx, W, H, t); break;
      case 'rainbow': rainbowArc(ctx, W, H, 'single', 0.85); break;
      case 'kite': kite(ctx, W, H, t); break;
      case 'balloon': balloon(ctx, W, H, t); break;
      case 'birds': birds(ctx, W, H, t); break;
      case 'flyaway': flyaway(ctx, W, H, t); break;
      case 'sprite': sprite(ctx, W, H, t); break;
      case 'ripples': ripples(ctx, W, H, t); break;
      case 'umbrella': umbrella(ctx, W, H, t, kind); break;
      case 'snowman': snowman(ctx, W, H, t, kind); break;
      case 'crystals': crystals(ctx, W, H, t); break;
      case 'windsock': windsock(ctx, W, H, t, s, kind); break;
      case 'lamp': lamp(ctx, W, H, t, kind); break;
      case 'wisps': wisps(ctx, W, H, t); break;
      case 'ball': ballL(ctx, W, H, t); break;
    }
  }
  /* a variant over a photo jar: everything in front, standing at the bottom of the jar */
  function decoOver(ctx, W, H, id, t, mk) {
    if (!mk || !mk.deco) return;
    var s = SCENES[id] || SCENES.overcast;
    setMark(mk);
    try {
      ['stars', 'back', 'front', 'ground'].forEach(function (at) { deco(ctx, W, H, mk.deco, t, at, s, 'photo'); });
    } finally { setMark(null); }
  }

  /* draw a scene. night darkens daytime scenes for the live sky.
     opt: 'bare' leaves out falling rain, snow and lightning (the scoop game draws its own), 'nobolt' leaves out lightning.
     mk: a caught jar's { seed, deco }, which makes this one jar different from everyone else's */
  function paint(ctx, W, H, id, t, night, opt, mk) {
    setMark(mk);
    try { scene(ctx, W, H, id, t, night, opt, mk && mk.deco); } finally { setMark(null); }
  }
  function scene(ctx, W, H, id, t, night, opt, dk) {
    var s = SCENES[id] || SCENES.overcast;
    var bare = opt === 'bare';
    var noBolt = bare || opt === 'nobolt';
    var dark = !!night && !s.night;
    var kind = s.ground || 'hills';
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, s.sky[0]);
    g.addColorStop(1, s.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (dark) { ctx.fillStyle = 'rgba(6,10,32,0.58)'; ctx.fillRect(0, 0, W, H); }
    if (s.stars) stars(ctx, W, H, t, s.stars);
    if (dk) deco(ctx, W, H, dk, t, 'stars', s, kind);
    if (s.aurora) aurora(ctx, W, H, t);
    if (s.meteors) meteors(ctx, W, H, t);
    if (s.swirl) swirl(ctx, W, H, t);
    if (s.cirrus && !dark) cirrus(ctx, W, H, t);
    if (s.sun && !dark) {
      var sun = J === NOJ ? s.sun : [s.sun[0] + J.sx, s.sun[1] + J.sy, s.sun[2], s.sun[3], s.sun[4]];
      sunAt(ctx, W, H, sun);
      if (s.halo) halo(ctx, W, H, sun);
      if (s.sundogs) sundogs(ctx, W, H, sun, t);
      if (s.rays) rays(ctx, W, H, t, s.rays[0] + J.sx, s.rays[1] + J.sy);
    }
    if (s.moon) moon(ctx, W, H, J === NOJ ? s.moon : [s.moon[0] + J.sx, s.moon[1] + J.sy, s.moon[2], s.moon[3]]);
    if (s.eclipse) eclipse(ctx, W, H, t);
    if (s.rainbow) rainbowArc(ctx, W, H, s.rainbow);
    if (dk) deco(ctx, W, H, dk, t, 'back', s, kind);
    if (s.farstorm) farstorm(ctx, W, H, t);
    if (s.front) front(ctx, W, H);
    if (s.anvil) anvil(ctx, W, H);
    if (s.clouds) for (var i = 0; i < s.clouds.length; i++) clouds(ctx, W, H, t, s.clouds[i]);
    if (s.tornado) tornadoL(ctx, W, H, t, s.tornado);
    if (dk) deco(ctx, W, H, dk, t, 'front', s, kind);
    if (!bare) {
      if (s.rain) rainL(ctx, W, H, t, s.rain);
      if (s.snow) snowL(ctx, W, H, t, s.snow);
      if (s.hail) hailL(ctx, W, H, t, s.hail);
    }
    if (s.wind) windL(ctx, W, H, t, s.wind);
    if (s.leaves) leaves(ctx, W, H, t, s.leaves);
    if (s.fog && !s.fogOver) fogB(ctx, W, H, t, s.fog);
    if (!noBolt) {
      if (s.bolt) bolt(ctx, W, H, t, s.bolt);
      if (s.sheet) sheet(ctx, W, H, t);
    }
    if (s.shimmer) shimmer(ctx, W, H, t, s.shimmer);
    if (s.murk) { ctx.fillStyle = 'rgba(215,220,230,' + s.murk + ')'; ctx.fillRect(0, 0, W, H); }
    if (s.drips) drips(ctx, W, H, t);
    ground(ctx, W, H, kind, dark || !!s.night, t);
    if (s.sparkle) sparkle(ctx, W, H, t, s.sparkle);
    if (s.fog && s.fogOver) fogB(ctx, W, H, t, s.fog);
    if (s.tint) { ctx.fillStyle = s.tint; ctx.fillRect(0, 0, W, H); }
    if (dk) deco(ctx, W, H, dk, t, 'ground', s, kind);
  }

  /* ---------- jars ---------- */

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  /* body and neck of a jar inside the box x, y, w, h: the neck opens at y, the base sits at y + h */
  function jarShape(ctx, x, y, w, h) {
    var bx = x + w * 0.04, bw = w * 0.92, by = y + h * 0.16, bh = h * 0.84, r = w * 0.18;
    var nx = x + w * 0.2, nw = w * 0.6;
    ctx.beginPath();
    ctx.moveTo(nx, y);
    ctx.lineTo(nx + nw, y);
    ctx.lineTo(nx + nw, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, nx, by);
    ctx.closePath();
  }
  /* tone: 'gold' for gold jars and the Sky Jar, otherwise a plain metal lid */
  function lid(ctx, cx, bottom, w, h, k, tone) {
    var x = cx - w / 2;
    var g = ctx.createLinearGradient(x, 0, x + w, 0);
    var gold = tone === 'gold';
    g.addColorStop(0, gold ? '#B8862B' : '#9AA3B5');
    g.addColorStop(0.45, gold ? '#FBE29A' : '#E3E7EE');
    g.addColorStop(1, gold ? '#9A6B17' : '#7E879A');
    ctx.fillStyle = g;
    roundRect(ctx, x, bottom - h, w, h, 3 * k);
    ctx.fill();
    ctx.strokeStyle = gold ? 'rgba(90,58,8,0.4)' : 'rgba(40,46,64,0.35)';
    ctx.lineWidth = Math.max(1, 0.9 * k);
    for (var i = 1; i < 6; i++) {
      var lx = x + (w * i) / 6;
      ctx.beginPath();
      ctx.moveTo(lx, bottom - h + 2 * k);
      ctx.lineTo(lx, bottom - 2 * k);
      ctx.stroke();
    }
  }
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function cover(ctx, img, x, y, w, h) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var s = Math.max(w / iw, h / ih);
    var dw = iw * s, dh = ih * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  /* Prism, the rarest variant: a jar of rainbow glass */
  function hue(h, s, l, a) { return 'hsla(' + Math.round(((h % 360) + 360) % 360) + ',' + s + '%,' + l + '%,' + a + ')'; }
  function prismGlow(ctx, W, H, cx, cy, t) {
    var gl = ctx.createRadialGradient(cx, cy, W * 0.06, cx, cy, W * 0.5);
    gl.addColorStop(0, hue(t * 40, 100, 72, 0.55));
    gl.addColorStop(0.55, hue(t * 40 + 140, 100, 72, 0.22));
    gl.addColorStop(1, hue(t * 40 + 260, 100, 72, 0));
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);
  }
  function prismSheen(ctx, x, top, w, h, t) {
    var g = ctx.createLinearGradient(x, top + h, x + w, top);
    for (var i = 0; i <= 6; i++) g.addColorStop(i / 6, hue(t * 30 + i * 60, 100, 60, 0.36));
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(x, top, w, h);
    ctx.restore();
    var p = (t * 0.22) % 1.7 - 0.35, bx = x + w * p, d = w * 0.16;
    var b = ctx.createLinearGradient(bx - d, top + h * 0.6 + d * 0.6, bx + d, top + h * 0.6 - d * 0.6);
    b.addColorStop(0, 'rgba(255,255,255,0)');
    b.addColorStop(0.5, 'rgba(255,255,255,0.32)');
    b.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = b;
    ctx.fillRect(x, top, w, h);
  }
  function prismGlints(ctx, x, top, w, h, t, k) {
    [[0.84, 0.3], [0.2, 0.8], [0.62, 0.12], [0.9, 0.7]].forEach(function (p, i) {
      var a = Math.max(0, Math.sin(t * 2.2 + i * 2.1));
      if (a < 0.15) return;
      star4(ctx, x + w * p[0], top + h * p[1], (2 + 3 * a) * k, hue(t * 30 + i * 90, 100, 88, 0.95 * a));
    });
  }

  /* a padlock badge, on a variant that hasn't been found yet */
  function padlock(ctx, cx, cy, s) {
    ctx.save();
    ctx.fillStyle = 'rgba(12,16,34,0.66)';
    ctx.beginPath(); ctx.arc(cx, cy, s * 1.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = s * 0.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.34, cy - s * 0.1);
    ctx.lineTo(cx - s * 0.34, cy - s * 0.3);
    ctx.arc(cx, cy - s * 0.3, s * 0.34, Math.PI, 0);
    ctx.lineTo(cx + s * 0.34, cy - s * 0.1);
    ctx.stroke();
    roundRect(ctx, cx - s * 0.54, cy - s * 0.14, s * 1.08, s * 0.76, s * 0.14);
    ctx.fill();
    ctx.restore();
  }

  /* st: { id, locked, later, ghost, sealed, glow (hex), drip, hat, img, lift, night, lidTone, mark, preview }
     ghost: a locked jar that shows a faint picture of what's inside. night: darken a daytime scene.
     mark: this catch's { seed, deco, prism }, so it's one of a kind. preview: a variant not found yet, frosted with a padlock.
     look: { glass, q, veil } colours that follow the page theme */
  function jar(ctx, W, H, st, t, look) {
    ctx.clearRect(0, 0, W, H);
    var k = W / 120;
    var x = W * 0.1, top = H * 0.17, w = W * 0.8, h = H * 0.8, cx = W / 2;
    var mk = st.locked ? null : st.mark || null;
    var pr = !!(mk && mk.prism);
    if (pr) prismGlow(ctx, W, H, cx, top + h * 0.55, t);
    else if (st.glow) {
      /* the glow fades out before the canvas edge, so it never shows as a box */
      var a = 0.4 + 0.14 * Math.sin(t * 2);
      var gl = ctx.createRadialGradient(cx, top + h * 0.55, W * 0.06, cx, top + h * 0.55, W * 0.5);
      gl.addColorStop(0, hexA(st.glow, a));
      gl.addColorStop(1, hexA(st.glow, 0));
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.save();
    jarShape(ctx, x, top, w, h);
    ctx.clip();
    if (st.locked && st.ghost) {
      paint(ctx, W, H, st.ghost, t, false);
      ctx.fillStyle = look.veil || 'rgba(200,206,220,0.72)';
      ctx.fillRect(0, 0, W, H);
    } else if (st.locked) {
      ctx.fillStyle = 'rgba(150,160,182,0.14)';
      ctx.fillRect(0, 0, W, H);
    } else if (st.sealed) {
      var sg = ctx.createLinearGradient(0, top, 0, top + h);
      sg.addColorStop(0, '#3A4466');
      sg.addColorStop(1, '#1B2140');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      for (var f = 0; f < 6; f++) {
        var fy = top + h * (0.35 + 0.1 * f) + Math.sin(t * 1.2 + f) * 2 * k;
        ctx.fillRect(x, fy, w, 1.2 * k);
      }
    } else if (st.img && typeof st.img === 'object' && (st.img.naturalWidth || st.img.width)) {
      cover(ctx, st.img, x, top, w, h);
      decoOver(ctx, W, H, st.id, t, mk);
    } else {
      paint(ctx, W, H, st.id, t, !!st.night, null, mk);
    }
    if (pr && !st.sealed) prismSheen(ctx, x, top, w, h, t);
    if (st.preview) { ctx.fillStyle = 'rgba(150,160,182,0.3)'; ctx.fillRect(x, top, w, h); }
    var sh = ctx.createLinearGradient(x, 0, x + w, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.12)');
    sh.addColorStop(0.3, 'rgba(255,255,255,0.06)');
    sh.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = sh;
    ctx.fillRect(x, top, w, h);
    ctx.restore();
    ctx.save();
    jarShape(ctx, x, top, w, h);
    if (pr) {
      var og = ctx.createLinearGradient(x, top, x + w, top + h);
      for (var oi = 0; oi <= 6; oi++) og.addColorStop(oi / 6, hue(t * 30 + oi * 60, 100, 70, 0.95));
      ctx.strokeStyle = og;
      ctx.lineWidth = Math.max(1.5, 2.2 * k);
    } else {
      ctx.strokeStyle = look.glass;
      ctx.lineWidth = Math.max(1, 1.5 * k);
    }
    ctx.stroke();
    ctx.restore();
    if (pr) prismGlints(ctx, x, top, w, h, t, k);
    if (st.preview) padlock(ctx, x + w * 0.8, top + h * 0.85, 8 * k);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    roundRect(ctx, x + w * 0.12, top + h * 0.3, w * 0.07, h * 0.42, w * 0.035);
    ctx.fill();
    lid(ctx, cx, top + 1 - (st.lift || 0) * h * 0.3, w * 0.66, h * 0.11, k, st.lidTone);
    if (st.hat) {
      var hy = top + 1 - h * 0.11;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(cx, hy, w * 0.35, h * 0.05, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.12, hy - h * 0.02, w * 0.12, h * 0.04, 0, 0, TAU);
      ctx.ellipse(cx + w * 0.1, hy - h * 0.03, w * 0.14, h * 0.045, 0, 0, TAU);
      ctx.fill();
    }
    if (st.drip) {
      for (var i = 0; i < 3; i++) {
        var ph = (t * 0.5 + i * 0.37) % 1;
        var dx = x + w * (0.3 + i * 0.22);
        var dy = top + h * 0.22 + ph * h * 0.68;
        var s = 2.4 * k;
        ctx.fillStyle = 'rgba(170,212,255,' + (0.95 - ph * 0.5) + ')';
        ctx.beginPath();
        ctx.moveTo(dx, dy - s * 1.8);
        ctx.quadraticCurveTo(dx + s, dy - s * 0.2, dx, dy + s * 0.6);
        ctx.quadraticCurveTo(dx - s, dy - s * 0.2, dx, dy - s * 1.8);
        ctx.fill();
      }
    }
    if (st.locked) {
      ctx.fillStyle = look.q;
      ctx.font = '800 ' + Math.round(W * 0.28) + 'px Archivo, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.later ? '…' : '?', cx, top + h * 0.6);
    }
  }

  /* fit a canvas to its CSS size at the screen's pixel density */
  function fit(cv) {
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return null;
    var W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    return { W: W, H: H };
  }

  WC.sky = {
    SCENES: SCENES, paint: paint, jar: jar, jarShape: jarShape, lid: lid, roundRect: roundRect,
    boltPath: boltPath, fit: fit, rng: rng, has: function (id) { return !!SCENES[id]; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
