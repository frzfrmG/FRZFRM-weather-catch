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
  /* a catch's strength, 0 to 1, from how strong the weather really was: it draws the jar a little lighter or heavier
     than usual, with more rain, deeper snow, thicker fog or a hotter sun. Without one, scenes draw just as they always have. */
  var POW = null, LIFT = 0;
  function setMark(mk) {
    POW = mk && typeof mk.power === 'number' && isFinite(mk.power) ? Math.max(0, Math.min(1, mk.power)) : null;
    LIFT = 0;
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
    cloudsunset: { sky: ['#1E2766', '#FF9C5E'], sun: [0.64, 0.66, 0.065, 5, '#FFE4AE'], clouds: [cl(2, 0.16, 0.32, 0.11, 0.004, 'pink', 96)], ground: 'cloudtops' },

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

    quiet: { night: true, sky: ['#0B1230', '#26355F'], stars: 30, moon: [0.72, 0.24, 0.045, 'crescent'], clouds: [cl(4, 0.1, 0.45, 0.2, 0.004, 'dark', 92)] },
    /* the live sky while flying: above the clouds by day, and at night */
    flying: { sky: ['#1C5FD4', '#A6D2FF'], sun: [0.72, 0.24, 0.06, 3.4], ground: 'whitetops' },
    flyingnight: { night: true, sky: ['#060B22', '#1F2E5C'], stars: 110, moon: [0.74, 0.22, 0.05, 'crescent'], ground: 'nighttops' }
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
        hill(ctx, W, H, 0.81 - LIFT, 0.035, dk ? '#5C6A8C' : '#C9D3E6', 1.3 + J.h1);
        hill(ctx, W, H, 0.88 - LIFT, 0.03, dk ? '#9AA8C6' : '#F1F4FA', 2.1 + J.h2);
        break;
      case 'slush':
        hill(ctx, W, H, 0.81 - LIFT, 0.035, dk ? '#2A3550' : 'rgba(60,72,96,0.7)', 1.3 + J.h1);
        hill(ctx, W, H, 0.88 - LIFT, 0.03, dk ? '#6C7896' : '#C8D0DE', 2.1 + J.h2);
        break;
      case 'frost':
        hill(ctx, W, H, 0.81 - LIFT, 0.035, dk ? '#4C5E86' : '#B7C9E4', 1.3 + J.h1);
        hill(ctx, W, H, 0.88 - LIFT, 0.03, dk ? '#7F93BB' : '#E4EDF8', 2.1 + J.h2);
        break;
      case 'ice':
        hill(ctx, W, H, 0.81 - LIFT, 0.035, dk ? '#3C4C72' : '#8FA4C4', 1.3 + J.h1);
        hill(ctx, W, H, 0.88 - LIFT, 0.03, dk ? '#6E84AE' : '#D2DDEE', 2.1 + J.h2);
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
      case 'cloudtops': case 'whitetops': case 'nighttops':
        // the tops of the clouds, seen from a plane: lit pink at sunset, white by day, silver by night
        var tc = kind === 'cloudtops' ? ['#F4B9A6', '#B98BB5', '#6E5A93', 'rgba(250,200,178,0.98)', 'rgba(238,176,168,0.98)'] :
          kind === 'whitetops' ? ['#FFFFFF', '#E4ECF7', '#C4D2E6', 'rgba(255,255,255,0.99)', 'rgba(240,245,252,0.99)'] :
          ['#3A4670', '#262F52', '#151B36', 'rgba(70,82,120,0.98)', 'rgba(58,68,104,0.98)'];
        var cg = ctx.createLinearGradient(0, H * 0.74, 0, H);
        cg.addColorStop(0, tc[0]);
        cg.addColorStop(0.5, tc[1]);
        cg.addColorStop(1, tc[2]);
        ctx.fillStyle = cg;
        ctx.fillRect(0, H * 0.77, W, H * 0.23);
        for (var c2 = 0; c2 < 11; c2++) puff(ctx, W * (c2 * 0.11 - 0.09) + Math.sin(t * 0.12 + c2) * W * 0.006, H * (0.765 + (c2 % 3) * 0.008), W * 0.075, c2 % 2 ? tc[3] : tc[4]);
        if (kind === 'cloudtops') {
          var sg2 = ctx.createRadialGradient(W * 0.64, H * 0.77, 0, W * 0.64, H * 0.77, W * 0.4);
          sg2.addColorStop(0, 'rgba(255,225,170,0.7)');
          sg2.addColorStop(1, 'rgba(255,225,170,0)');
          ctx.fillStyle = sg2;
          ctx.fillRect(0, H * 0.72, W, H * 0.2);
        }
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
    if (kind === 'cloudtops' || kind === 'whitetops' || kind === 'nighttops') return 0.84;
    return hillY(f, 0.88 - LIFT, 0.03, 2.1 + J.h2) + 0.012;
  }
  /* the variant pictures live in variants.js. Each one is drawn on its own layer with what it needs from this scene */
  var ENV = { J: NOJ, salt: 0, s: null, kind: 'hills', sr: sr, rng: rng, star4: star4, roundRect: roundRect, rainbowArc: rainbowArc, standY: function (f) { return standY(ENV.kind, f); } };
  function decoFn(dk) { return dk && WC.decos ? WC.decos[dk] || null : null; }
  function deco(ctx, W, H, dk, t, at, s, kind) {
    var fn = decoFn(dk);
    if (!fn || (fn.at || 'ground') !== at) return;
    ENV.J = J; ENV.salt = SALT; ENV.s = s; ENV.kind = kind;
    ctx.save();
    try { fn(ctx, W, H, t, ENV); } finally { ctx.restore(); }
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

  function copy(o) { var c = {}; for (var k in o) c[k] = o[k]; return c; }
  function powered(s, p) {
    var m = 0.7 + 0.65 * p, c = copy(s);
    if (s.rain) { c.rain = copy(s.rain); c.rain.n = Math.round(s.rain.n * m); c.rain.len *= 0.85 + 0.3 * p; c.rain.speed *= 0.9 + 0.2 * p; }
    if (s.snow) { c.snow = copy(s.snow); c.snow.n = Math.round(s.snow.n * m); c.snow.size *= 0.9 + 0.2 * p; }
    if (s.hail) { c.hail = copy(s.hail); c.hail.n = Math.round(s.hail.n * m); }
    if (s.wind) { c.wind = copy(s.wind); c.wind.n = Math.max(1, Math.round(s.wind.n * m)); }
    if (s.leaves) c.leaves = Math.round(s.leaves * m);
    if (s.fog) { c.fog = copy(s.fog); c.fog.alpha = Math.min(0.92, s.fog.alpha * (0.8 + 0.35 * p)); c.veil = p; }
    if (s.sun) c.sun = [s.sun[0], s.sun[1], s.sun[2] * (0.9 + 0.2 * p), s.sun[3] * (0.8 + 0.45 * p), s.sun[4]];
    if (s.shimmer) c.shimmer = s.shimmer * (0.6 + 0.8 * p);
    if (s.sparkle) c.sparkle = Math.round(s.sparkle * m);
    if (s.murk) c.murk = s.murk * (0.8 + 0.4 * p);
    return c;
  }
  var DEEP = { snow: true, slush: true, frost: true, ice: true };
  /* sunny jars measured by temperature: a hotter catch glows warmer */
  var WARM = { sunnyspells: true, clear: true, sunrise: true, goldenhour: true, hotday: true, heatwave: true, scorcher: true };
  function warmth(ctx, W, H, sun, p) {
    if (p <= 0) return;
    // a bright glare round the sun, and a warm haze low in the sky
    var cx = sun[0] * W, cy = sun[1] * H, rr = W * (0.3 + 0.4 * p);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
    g.addColorStop(0, 'rgba(255,251,236,' + (0.6 * p) + ')');
    g.addColorStop(0.4, 'rgba(255,240,200,' + (0.25 * p) + ')');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
    var h = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.8);
    h.addColorStop(0, 'rgba(255,214,150,0)');
    h.addColorStop(1, 'rgba(255,214,150,' + (0.24 * p) + ')');
    ctx.fillStyle = h;
    ctx.fillRect(0, H * 0.45, W, H * 0.35);
  }
  /* thicker fog hides the hills: nothing at 1 star, most of the ground at 5 */
  function veilL(ctx, W, H, p) {
    if (p <= 0) return;
    var y0 = H * 0.38;
    var g = ctx.createLinearGradient(0, y0, 0, H);
    g.addColorStop(0, 'rgba(232,236,242,0)');
    g.addColorStop(0.5, 'rgba(232,236,242,' + (0.6 * p) + ')');
    g.addColorStop(1, 'rgba(232,236,242,' + (0.72 * p) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, H - y0);
    ctx.fillStyle = 'rgba(232,236,242,' + (0.18 * p) + ')';
    ctx.fillRect(0, 0, W, H);
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
    if (POW !== null) s = powered(s, POW);
    LIFT = POW !== null && DEEP[s.ground] ? (POW - 0.4) * 0.06 : 0;
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
    if (s.sun && !dark && !(decoFn(dk) && decoFn(dk).noSun)) {
      var sun = J === NOJ ? s.sun : [s.sun[0] + J.sx, s.sun[1] + J.sy, s.sun[2], s.sun[3], s.sun[4]];
      sunAt(ctx, W, H, sun);
      if (POW !== null && WARM[id]) warmth(ctx, W, H, sun, POW);
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
    if (s.veil) veilL(ctx, W, H, s.veil);
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
    ctx.beginPath();
    jarPath(ctx, x, y, w, h);
  }
  /* the jar's outline added to the path being drawn */
  function jarPath(ctx, x, y, w, h) {
    var bx = x + w * 0.04, bw = w * 0.92, by = y + h * 0.16, bh = h * 0.84, r = w * 0.18;
    var nx = x + w * 0.2, nw = w * 0.6;
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
    /* a plain tin lid until the jar levels up: bronze, silver, gold, then rainbow */
    var LIDS = {
      plain: ['#7F8696', '#B4BAC6', '#666D7C', 'rgba(40,46,64,0.35)'],
      bronze: ['#7A4A22', '#E7A970', '#5E3517', 'rgba(60,30,8,0.45)'],
      silver: ['#A9B3C6', '#FFFFFF', '#8792A8', 'rgba(40,46,64,0.3)'],
      gold: ['#B8862B', '#FBE29A', '#9A6B17', 'rgba(90,58,8,0.4)']
    };
    var c = LIDS[tone] || LIDS.plain;
    if (tone === 'rainbow') {
      ['#FF5A5A', '#FFA63D', '#FFE14D', '#5FD36B', '#4DA6FF', '#9B6BFF'].forEach(function (col, i) { g.addColorStop(i / 5, col); });
      c = [0, 0, 0, 'rgba(255,255,255,0.55)'];
    } else {
      g.addColorStop(0, c[0]);
      g.addColorStop(0.45, c[1]);
      g.addColorStop(1, c[2]);
    }
    ctx.fillStyle = g;
    roundRect(ctx, x, bottom - h, w, h, 3 * k);
    ctx.fill();
    if (tone && tone !== 'bronze') {
      // a little glint so silver, gold and rainbow lids catch the eye
      star4(ctx, x + w * 0.82, bottom - h * 1.05, Math.max(2, h * 0.55), 'rgba(255,255,255,0.8)');
    }
    ctx.strokeStyle = c[3];
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
  /* a legendary variant: the jar glows gold and twinkles */
  function legendGlow(ctx, W, H, cx, cy, t) {
    var a = 0.5 + 0.16 * Math.sin(t * 2);
    var gl = ctx.createRadialGradient(cx, cy, W * 0.06, cx, cy, W * 0.5);
    gl.addColorStop(0, 'rgba(255,205,110,' + a + ')');
    gl.addColorStop(0.6, 'rgba(255,190,90,' + a * 0.35 + ')');
    gl.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);
  }
  /* a rare catch catches the light now and then: a soft band of light sweeps across the glass. Each jar has its own
     moment (from its seed), so a shelf of them glints here and there rather than all at once */
  function glint(ctx, x, top, w, h, t, mk) {
    var per = mk.shine >= 3 ? 4.2 : mk.shine === 2 ? 5.2 : 6.5;
    var ph = (((t + ((mk.seed || 0) % 1000) * 0.173) % per) + per) % per / per, u = ph / 0.26;
    if (u >= 1) return;
    var col = mk.shine >= 3 ? '255,236,180' : mk.shine === 2 ? '238,228,255' : '232,244,255', a = 0.5 * Math.sin(u * Math.PI);
    [[0, 0.17, 1], [0.24, 0.07, 0.7]].forEach(function (b) {
      ctx.save();
      ctx.translate(x - w * 0.55 + (u - b[0] * 0.5) * w * 2.3, top + h * 0.5);
      ctx.rotate(0.4);
      var bw = w * b[1], g = ctx.createLinearGradient(-bw, 0, bw, 0);
      g.addColorStop(0, 'rgba(' + col + ',0)');
      g.addColorStop(0.5, 'rgba(' + col + ',' + (a * b[2]).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(-bw, -h, bw * 2, h * 2);
      ctx.restore();
    });
  }
  /* an epic catch twinkles too */
  function shineStars(ctx, x, top, w, h, t, k, mk) {
    [[0.86, 0.27], [0.13, 0.68], [0.72, 0.9]].forEach(function (p, i) {
      var a = Math.max(0, Math.sin(t * 1.7 + i * 2.1 + ((mk.seed || 0) % 7)));
      if (a < 0.3) return;
      star4(ctx, x + w * p[0], top + h * p[1], (1.8 + 2.6 * a) * k, 'rgba(238,228,255,' + (0.9 * a).toFixed(3) + ')');
    });
  }
  function legendGlints(ctx, x, top, w, h, t, k) {
    [[0.86, 0.3], [0.16, 0.78], [0.66, 0.1], [0.92, 0.72], [0.1, 0.36]].forEach(function (p, i) {
      var a = Math.max(0, Math.sin(t * 2.2 + i * 2.3));
      if (a < 0.15) return;
      star4(ctx, x + w * p[0], top + h * p[1], (2.2 + 3.2 * a) * k, i % 2 ? 'rgba(255,255,255,' + 0.95 * a + ')' : 'rgba(255,214,120,' + 0.95 * a + ')');
    });
  }

  /* ---------- jar glass ----------
     A catch's glass only tints the jar and touches its edges, so the picture inside stays clear. Each glass has a tint,
     a band of colour round the inside of the rim, and sometimes something of its own: flecks, bubbles, drops or frost.
     tint and edge are [r, g, b, alpha]; rim colours the jar's outline. */
  var GLASS = {
    amber: { tint: [255, 176, 72, 0.2], edge: [226, 136, 36, 0.42], rim: 'rgba(196,120,40,0.9)' },
    sunstone: { tint: [255, 206, 130, 0.07], edge: [240, 190, 90, 0.2], rim: 'rgba(206,150,60,0.9)', fx: 'flecks' },
    burning: { tint: [255, 190, 110, 0.07], edge: [255, 170, 80, 0.24], rim: 'rgba(214,128,44,0.95)', fx: 'lens' },
    seaglass: { tint: [110, 196, 184, 0.22], edge: [214, 246, 238, 0.5], wide: 1.4, rim: 'rgba(70,160,150,0.9)', fx: 'speckle' },
    ripple: { tint: [160, 196, 236, 0.05], edge: [190, 215, 245, 0.18], fx: 'ripple' },
    raindrop: { tint: [170, 202, 240, 0.05], edge: [190, 215, 245, 0.16], fx: 'drops' },
    frosted: { tint: [236, 244, 255, 0.1], edge: [255, 255, 255, 0.62], wide: 1.8, rim: 'rgba(250,252,255,0.95)', fx: 'speckle' },
    iceblue: { tint: [150, 200, 255, 0.2], edge: [190, 225, 255, 0.4], rim: 'rgba(235,246,255,0.95)', fx: 'crisp' },
    frozen: { tint: [190, 226, 255, 0.07], edge: [230, 244, 255, 0.34], rim: 'rgba(225,240,255,0.95)', fx: 'frozen' },
    breezeblue: { tint: [140, 214, 204, 0.13], edge: [90, 186, 176, 0.3], rim: 'rgba(80,160,150,0.9)' },
    seed: { tint: [200, 230, 220, 0.05], edge: [210, 235, 228, 0.16], fx: 'bubbles' },
    whirl: { tint: [200, 220, 255, 0.05], edge: [210, 228, 255, 0.16], fx: 'whirl' },
    smoky: { tint: [66, 58, 60, 0.24], edge: [36, 32, 38, 0.5], rim: 'rgba(70,64,70,0.95)' },
    crackle: { tint: [220, 232, 255, 0.04], edge: [220, 232, 255, 0.14], fx: 'crackle' },
    charged: { tint: [120, 170, 255, 0.06], edge: [110, 160, 255, 0.3], rim: 'rgba(130,175,255,0.95)', fx: 'spark' },
    misted: { edge: [244, 247, 252, 0.42], wide: 1.9, fx: 'mistdrops' },
    moonstone: { tint: [200, 214, 255, 0.06], edge: [205, 220, 255, 0.2], fx: 'sheen' },
    opal: { tint: [240, 240, 255, 0.04], fx: 'opal' },
    twilight: { tint: [92, 62, 172, 0.22], edge: [70, 40, 150, 0.44], rim: 'rgba(110,80,190,0.9)' },
    starlight: { tint: [40, 50, 110, 0.12], edge: [160, 170, 255, 0.24], rim: 'rgba(170,180,255,0.9)', fx: 'glints' },
    aurora: { tint: [120, 255, 200, 0.03], fx: 'aurora' },
    dawn: { fx: 'dawn', edge: [255, 200, 170, 0.18] },
    dew: { tint: [210, 236, 220, 0.04], edge: [215, 240, 225, 0.16], fx: 'dew' },
    dichroic: { fx: 'dichroic' },
    // the animals' glasses: garden, beach and coast, countryside and zoo
    greenhouse: { tint: [150, 210, 160, 0.13], edge: [110, 180, 120, 0.3], rim: 'rgba(100,160,110,0.9)' },
    pressed: { tint: [250, 220, 232, 0.08], edge: [240, 200, 220, 0.22], rim: 'rgba(214,150,180,0.9)', fx: 'pressed' },
    honey: { tint: [255, 196, 80, 0.18], edge: [235, 165, 50, 0.38], rim: 'rgba(214,150,40,0.95)', fx: 'honeycomb' },
    bottle: { tint: [60, 140, 90, 0.24], edge: [30, 110, 60, 0.46], rim: 'rgba(40,120,70,0.95)' },
    sandetch: { tint: [240, 228, 200, 0.08], rim: 'rgba(214,196,160,0.95)', fx: 'etch' },
    pearl: { tint: [255, 236, 244, 0.1], edge: [255, 230, 240, 0.3], rim: 'rgba(240,215,228,0.95)', fx: 'pearl' },
    meadow: { tint: [240, 210, 120, 0.13], edge: [220, 180, 90, 0.3], rim: 'rgba(200,160,70,0.9)' },
    hedgerow: { tint: [220, 230, 210, 0.03], edge: [210, 220, 200, 0.12], fx: 'bramble' },
    harvest: { tint: [255, 220, 140, 0.05], edge: [240, 200, 110, 0.16], fx: 'wheat' },
    safari: { tint: [230, 190, 120, 0.14], edge: [200, 160, 90, 0.32], rim: 'rgba(180,140,80,0.9)' },
    jungle: { tint: [200, 235, 200, 0.03], edge: [180, 220, 180, 0.12], fx: 'leafetch' },
    goldleaf: { tint: [255, 230, 160, 0.08], edge: [240, 210, 130, 0.22], rim: 'rgba(214,170,70,0.95)', fx: 'goldleaf' }
  };
  function rgbaA(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  /* a soft band of colour round the inside of the jar: the jar's own outline, stroked wide and clipped to the inside */
  function edgeBand(ctx, x, top, w, h, k, c, wide) {
    // the shadow of a frame round the jar falls just inside it, as a soft glow along the glass (the frame itself is clipped away)
    var band = w * 0.08 * (wide || 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - w, top - h, w * 3, h * 3);
    jarPath(ctx, x, top, w, h);
    ctx.shadowColor = rgbaA(c, Math.min(1, c[3] * 1.5));
    ctx.shadowBlur = band;
    ctx.fillStyle = rgbaA(c, 1);
    ctx.fill('evenodd');
    ctx.restore();
  }
  /* a point round the outline of the jar's body, f from 0 to 1, starting at the top of the right shoulder */
  function rimPoint(x, top, w, h, f) {
    var bx = x + w * 0.04, bw = w * 0.92, by = top + h * 0.16, bh = h * 0.84;
    var per = 2 * (bw + bh), d = ((f % 1) + 1) % 1 * per;
    if (d < bh) return [bx + bw, by + d];
    d -= bh; if (d < bw) return [bx + bw - d, by + bh];
    d -= bw; if (d < bh) return [bx, by + bh - d];
    d -= bh; return [bx + d, by];
  }
  /* the parts of a glass that stay still (its tint, the glow round the edge, frost, ripples, cracks) are drawn once
     for each size of jar and kept, because the soft glow is slow to draw on a phone. Only the moving parts are
     drawn every frame */
  var GCACHE = {}, GCACHE_N = 0;
  function glassStill(key, W, H, x, top, w, h, k) {
    if (typeof document === 'undefined') return null;
    var id = key + '|' + W + '|' + H, c = GCACHE[id];
    if (c) return c;
    if (GCACHE_N >= 120) { GCACHE = {}; GCACHE_N = 0; }
    c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    if (!g) return null;
    g.save();
    jarShape(g, x, top, w, h);
    g.clip();
    stillParts(g, key, x, top, w, h, k);
    g.restore();
    GCACHE[id] = c; GCACHE_N += 1;
    return c;
  }
  function stillParts(ctx, key, x, top, w, h, k, edgeCol) {
    var gd = GLASS[key];
    var r = rng(mix(seedOf(key), 4242));
    var bx = x + w * 0.04, bw = w * 0.92, by = top + h * 0.16, bh = h * 0.84;
    var i;
    if (gd.tint) { ctx.fillStyle = rgbaA(gd.tint, gd.tint[3]); ctx.fillRect(x, top, w, h); }
    if (gd.fx === 'dawn') {
      var dg = ctx.createLinearGradient(0, top, 0, top + h);
      dg.addColorStop(0, 'rgba(255,176,130,0.15)');
      dg.addColorStop(0.55, 'rgba(255,220,200,0.04)');
      dg.addColorStop(1, 'rgba(130,184,255,0.14)');
      ctx.fillStyle = dg; ctx.fillRect(x, top, w, h);
    }
    if (edgeCol || gd.edge) edgeBand(ctx, x, top, w, h, k, edgeCol || gd.edge, gd.wide);
    switch (gd.fx) {
      case 'lens': {
        var lg = ctx.createRadialGradient(bx + bw * 0.3, by + bh * 0.25, 0, bx + bw * 0.3, by + bh * 0.25, bw * 0.5);
        lg.addColorStop(0, 'rgba(255,248,226,0.24)');
        lg.addColorStop(1, 'rgba(255,248,226,0)');
        ctx.fillStyle = lg; ctx.fillRect(x, top, w, h);
        break;
      }
      case 'ripple':
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = Math.max(1, 0.7 * k);
        [0.07, 0.13, 0.87, 0.93].forEach(function (f, j) {
          ctx.beginPath();
          for (var yy = 0; yy <= 24; yy++) {
            var fy2 = yy / 24, xx = bx + bw * f + Math.sin(fy2 * 9 + j * 1.7) * 1.4 * k;
            if (yy) ctx.lineTo(xx, by + bh * fy2); else ctx.moveTo(xx, by + bh * fy2);
          }
          ctx.stroke();
        });
        break;
      case 'speckle':
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (i = 0; i < 70; i++) {
          var e1 = r(), sx = e1 < 0.5 ? (r() < 0.5 ? r() * 0.12 : 1 - r() * 0.12) : r(), sy = e1 < 0.5 ? r() : (r() < 0.5 ? r() * 0.1 : 1 - r() * 0.1);
          ctx.fillRect(bx + bw * sx, by + bh * sy, 0.9 * k, 0.9 * k);
        }
        break;
      case 'crisp':
        jarShape(ctx, x, top, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = Math.max(1, 2.6 * k);
        ctx.stroke();
        break;
      case 'frozen': {
        // ice creeping up from the bottom, with frost ferns at the corners
        var iy = by + bh * 0.84;
        var ig = ctx.createLinearGradient(0, iy - bh * 0.05, 0, by + bh);
        ig.addColorStop(0, 'rgba(225,242,255,0)');
        ig.addColorStop(0.35, 'rgba(225,242,255,0.5)');
        ig.addColorStop(1, 'rgba(240,250,255,0.72)');
        ctx.fillStyle = ig;
        ctx.beginPath();
        ctx.moveTo(bx, by + bh);
        for (i = 0; i <= 18; i++) ctx.lineTo(bx + bw * i / 18, iy - (i % 2 ? r() * bh * 0.05 : 0));
        ctx.lineTo(bx + bw, by + bh);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = Math.max(1, 0.6 * k);
        [[bx + bw * 0.04, by + bh * 0.98, -1.2], [bx + bw * 0.96, by + bh * 0.98, -1.95]].forEach(function (s) {
          var a = s[2], L = bh * 0.2;
          ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[0] + Math.cos(a) * L, s[1] + Math.sin(a) * L); ctx.stroke();
          for (var b = 1; b <= 4; b++) {
            var f = b / 5, qx = s[0] + Math.cos(a) * L * f, qy = s[1] + Math.sin(a) * L * f, l2 = L * 0.28 * (1 - f * 0.5);
            ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(qx + Math.cos(a - 0.7) * l2, qy + Math.sin(a - 0.7) * l2);
            ctx.moveTo(qx, qy); ctx.lineTo(qx + Math.cos(a + 0.7) * l2, qy + Math.sin(a + 0.7) * l2); ctx.stroke();
          }
        });
        break;
      }
      case 'crackle':
        ctx.strokeStyle = 'rgba(255,255,255,0.24)';
        ctx.lineWidth = Math.max(0.6, 0.5 * k);
        for (i = 0; i < 16; i++) {
          var cx3 = bx + bw * (r() < 0.5 ? r() * 0.3 : 0.7 + r() * 0.3), cy3 = by + bh * r(), a3 = r() * TAU;
          ctx.beginPath(); ctx.moveTo(cx3, cy3);
          for (var s3 = 0; s3 < 4; s3++) {
            a3 += (r() - 0.5) * 1.4;
            cx3 += Math.cos(a3) * bw * 0.06; cy3 += Math.sin(a3) * bw * 0.06;
            ctx.lineTo(cx3, cy3);
          }
          ctx.stroke();
        }
        break;
      case 'dew':
      case 'mistdrops':
        drops(ctx, r, gd.fx, bx, by, bw, bh, k, 0);
        break;
      case 'pressed':
        // little flowers pressed into the glass round the bottom
        var pcols = ['rgba(240,150,180,0.6)', 'rgba(250,215,110,0.6)', 'rgba(190,160,235,0.6)', 'rgba(255,255,255,0.55)'];
        for (i = 0; i < 9; i++) {
          var pfx = bx + bw * (0.06 + i * 0.11 + (r() - 0.5) * 0.04), pfy = by + bh * (0.86 + r() * 0.1), ps = (1.6 + r() * 1.2) * k;
          ctx.fillStyle = pcols[i % pcols.length];
          for (var pp = 0; pp < 5; pp++) { var pa = pp * TAU / 5 + r(); ctx.beginPath(); ctx.ellipse(pfx + Math.cos(pa) * ps * 0.6, pfy + Math.sin(pa) * ps * 0.6, ps * 0.5, ps * 0.3, pa, 0, TAU); ctx.fill(); }
          ctx.fillStyle = 'rgba(255,240,180,0.7)'; ctx.beginPath(); ctx.arc(pfx, pfy, ps * 0.22, 0, TAU); ctx.fill();
          if (i % 2) { ctx.strokeStyle = 'rgba(120,170,110,0.45)'; ctx.lineWidth = Math.max(0.6, 0.4 * k); ctx.beginPath(); ctx.moveTo(pfx, pfy + ps * 0.5); ctx.quadraticCurveTo(pfx + ps, pfy + ps * 1.4, pfx + ps * 0.4, pfy + ps * 2.4); ctx.stroke(); }
        }
        break;
      case 'honeycomb': {
        // a band of honeycomb round the bottom
        ctx.strokeStyle = 'rgba(255,214,130,0.36)';
        ctx.lineWidth = Math.max(0.7, 0.55 * k);
        var hs2 = 3.4 * k, hw2 = hs2 * Math.sqrt(3);
        for (var hy = by + bh * 0.82, hrow = 0; hy < by + bh + hs2; hy += hs2 * 1.5, hrow++) for (var hx = bx + (hrow % 2) * hw2 / 2; hx < bx + bw + hw2; hx += hw2) {
          ctx.beginPath();
          for (var hk = 0; hk < 6; hk++) { var ha = Math.PI / 6 + hk * Math.PI / 3; ctx.lineTo(hx + Math.cos(ha) * hs2, hy + Math.sin(ha) * hs2); }
          ctx.closePath(); ctx.stroke();
        }
        break;
      }
      case 'etch': {
        // worn frosty by the sand, most at the bottom
        var eg = ctx.createLinearGradient(0, by + bh * 0.62, 0, by + bh);
        eg.addColorStop(0, 'rgba(255,255,255,0)'); eg.addColorStop(1, 'rgba(255,252,245,0.5)');
        ctx.fillStyle = eg; ctx.fillRect(x, by + bh * 0.6, w, bh * 0.42);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        for (i = 0; i < 60; i++) ctx.fillRect(bx + bw * r(), by + bh * (0.72 + r() * 0.28), 0.8 * k, 0.8 * k);
        break;
      }
      case 'bramble':
        // brambles and blackberries etched round the bottom
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = Math.max(0.7, 0.55 * k);
        ctx.beginPath();
        ctx.moveTo(bx, by + bh * 0.9);
        for (i = 1; i <= 8; i++) ctx.quadraticCurveTo(bx + bw * (i - 0.5) / 8, by + bh * (i % 2 ? 0.8 : 0.96), bx + bw * i / 8, by + bh * 0.88);
        ctx.stroke();
        for (i = 0; i < 8; i++) {
          var bxx = bx + bw * (0.07 + i * 0.12), byy = by + bh * (i % 2 ? 0.84 : 0.92);
          ctx.fillStyle = i % 3 ? 'rgba(90,40,90,0.35)' : 'rgba(170,60,80,0.35)';
          for (var bb = 0; bb < 4; bb++) { ctx.beginPath(); ctx.arc(bxx + (bb % 2) * 1.1 * k, byy + (bb > 1 ? 1.1 : 0) * k, 0.8 * k, 0, TAU); ctx.fill(); }
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(bxx + 3 * k, byy - 2.4 * k, 2 * k, 1 * k, -0.6, 0, TAU); ctx.stroke();
        }
        break;
      case 'wheat':
        // ears of wheat etched in gold, standing round the glass
        ctx.strokeStyle = 'rgba(240,200,110,0.55)';
        ctx.fillStyle = 'rgba(240,200,110,0.55)';
        ctx.lineWidth = Math.max(0.7, 0.5 * k);
        [0.05, 0.14, 0.86, 0.95].forEach(function (f, j) {
          var sx2 = bx + bw * f, sy2 = by + bh, top2 = by + bh * (0.55 + (j % 2) * 0.1);
          ctx.beginPath(); ctx.moveTo(sx2, sy2); ctx.quadraticCurveTo(sx2 + (f < 0.5 ? 1 : -1) * 2 * k, (sy2 + top2) / 2, sx2, top2); ctx.stroke();
          for (var g2 = 0; g2 < 5; g2++) {
            var gy = top2 + g2 * 2.2 * k;
            ctx.beginPath(); ctx.ellipse(sx2 - 1.2 * k, gy, 0.9 * k, 1.6 * k, -0.5, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.ellipse(sx2 + 1.2 * k, gy, 0.9 * k, 1.6 * k, 0.5, 0, TAU); ctx.fill();
          }
        });
        break;
      case 'leafetch':
        // leaves etched round the bottom
        ctx.strokeStyle = 'rgba(255,255,255,0.32)';
        ctx.lineWidth = Math.max(0.7, 0.5 * k);
        for (i = 0; i < 10; i++) {
          var lx = bx + bw * (0.04 + i * 0.1), ly = by + bh * (0.86 + (i % 3) * 0.04), la = -Math.PI / 2 + (r() - 0.5) * 1.6, ll = (4 + r() * 3) * k;
          ctx.save(); ctx.translate(lx, ly); ctx.rotate(la);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(ll * 0.5, -ll * 0.35, ll, 0); ctx.quadraticCurveTo(ll * 0.5, ll * 0.35, 0, 0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ll * 0.85, 0); ctx.stroke();
          ctx.restore();
        }
        break;
      case 'goldleaf':
        // flakes of gold leaf round the top of the jar
        for (i = 0; i < 22; i++) {
          var gx = bx + bw * (0.04 + r() * 0.92), gy2 = by + bh * (r() * 0.12) + (r() < 0.3 ? bh * 0.05 : 0), gs3 = (0.8 + r() * 1.4) * k;
          ctx.fillStyle = r() < 0.5 ? 'rgba(232,190,80,0.85)' : 'rgba(250,218,120,0.8)';
          ctx.beginPath(); ctx.moveTo(gx, gy2 - gs3); ctx.lineTo(gx + gs3, gy2 - gs3 * 0.2); ctx.lineTo(gx + gs3 * 0.3, gy2 + gs3); ctx.lineTo(gx - gs3 * 0.8, gy2 + gs3 * 0.3); ctx.closePath(); ctx.fill();
        }
        break;
    }
  }
  /* beads of water on the glass. Raindrops run down now and then, leaving a trail */
  function drops(ctx, r, kind, bx, by, bw, bh, k, t) {
    var nd = kind === 'drops' ? 14 : kind === 'dew' ? 9 : 10;
    for (var i = 0; i < nd; i++) {
      var dx0 = bx + bw * (0.06 + r() * 0.88), dy0 = by + bh * (kind === 'dew' ? 0.35 + r() * 0.6 : 0.05 + r() * 0.9);
      var rr = (kind === 'dew' ? 1.6 + r() * 1.6 : kind === 'drops' ? 1.1 + r() * 1.5 : 0.8 + r() * 1) * k;
      var cyc = kind === 'drops' ? ((t * 0.12 + r()) % 1) : 1;
      if (cyc < 0.25) {
        var run = cyc / 0.25;
        ctx.strokeStyle = 'rgba(225,238,255,0.22)';
        ctx.lineWidth = rr * 0.7;
        ctx.beginPath(); ctx.moveTo(dx0, dy0); ctx.lineTo(dx0, dy0 + run * bh * 0.3); ctx.stroke();
        dy0 += run * bh * 0.3;
      }
      ctx.fillStyle = 'rgba(210,228,250,0.22)';
      ctx.beginPath(); ctx.arc(dx0, dy0, rr, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(40,60,90,0.18)';
      ctx.lineWidth = Math.max(0.6, rr * 0.25);
      ctx.beginPath(); ctx.arc(dx0, dy0, rr, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.arc(dx0 - rr * 0.35, dy0 - rr * 0.35, rr * 0.3, 0, TAU); ctx.fill();
    }
  }
  /* a soft spot of colour, without filling the whole jar */
  function spot(ctx, px, py, rad, c, a) {
    var gg = ctx.createRadialGradient(px, py, 0, px, py, rad);
    gg.addColorStop(0, rgbaA(c, a));
    gg.addColorStop(1, rgbaA(c, 0));
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill();
  }
  /* the glass of one catch, over what's inside the jar (the jar is the clip) */
  function glassIn(ctx, W, H, x, top, w, h, k, t, key, seed) {
    var gd = GLASS[key];
    if (!gd) return;
    var r = rng(mix(seed || 1, 4242));
    var bx = x + w * 0.04, bw = w * 0.92, by = top + h * 0.16, bh = h * 0.84;
    var i, px, py;
    ctx.save();
    if (gd.fx === 'dichroic') {
      // two colours that take turns as the light moves: each one's glow is kept, and they cross-fade
      var ph = (Math.sin(t * 0.7) + 1) / 2;
      var ca = dichroicLayer(W, H, x, top, w, h, k, 0), cb = dichroicLayer(W, H, x, top, w, h, k, 1);
      if (ca && cb) {
        ctx.globalAlpha = 1 - ph; ctx.drawImage(ca, 0, 0);
        ctx.globalAlpha = ph; ctx.drawImage(cb, 0, 0);
        ctx.globalAlpha = 1;
      }
    } else {
      var still = glassStill(key, W, H, x, top, w, h, k);
      if (still) ctx.drawImage(still, 0, 0);
      else stillParts(ctx, key, x, top, w, h, k);
    }
    switch (gd.fx) {
      case 'flecks':
        for (i = 0; i < 26; i++) {
          var side = r() < 0.5, fx = side ? (r() < 0.5 ? r() * 0.16 : 1 - r() * 0.16) : r(), fy = side ? r() : (r() < 0.5 ? r() * 0.12 : 1 - r() * 0.1);
          px = bx + bw * fx; py = by + bh * fy;
          var tw = 0.4 + 0.6 * Math.max(0, Math.sin(t * (1.2 + r() * 1.8) + r() * 6));
          ctx.fillStyle = 'rgba(255,214,120,' + (0.45 + 0.5 * tw) + ')';
          ctx.beginPath(); ctx.arc(px, py, (0.5 + r() * 0.9) * k, 0, TAU); ctx.fill();
          if (tw > 0.9) star4(ctx, px, py, 2.6 * k, 'rgba(255,240,190,0.85)');
        }
        break;
      case 'lens': {
        // the sun gathered to a burning point
        var fpx = bx + bw * (0.56 + r() * 0.14), fpy = by + bh * 0.86, pulse = 0.75 + 0.25 * Math.sin(t * 3.1);
        spot(ctx, fpx, fpy, w * 0.16, [255, 200, 110], 0.62 * pulse);
        spot(ctx, fpx, fpy, w * 0.035, [255, 255, 236], 0.95 * pulse);
        ctx.strokeStyle = 'rgba(255,226,170,0.16)';
        ctx.lineWidth = Math.max(1, 0.8 * k);
        for (i = 1; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(fpx, fpy, w * 0.07 * i * (0.9 + 0.1 * pulse), w * 0.03 * i, 0, 0, TAU); ctx.stroke(); }
        break;
      }
      case 'drops':
        drops(ctx, r, 'drops', bx, by, bw, bh, k, t);
        break;
      case 'bubbles':
        ctx.strokeStyle = 'rgba(255,255,255,0.42)';
        ctx.lineWidth = Math.max(0.6, 0.45 * k);
        ctx.beginPath();
        for (i = 0; i < 46; i++) {
          var u0 = r(), v0 = r(), br = (0.5 + r() * 1.3) * k, sp2 = 0.004 + r() * 0.01;
          px = bx + bw * ((u0 + t * sp2) % 1); py = by + bh * v0 + Math.sin(t * 0.6 + i) * k * 0.6;
          ctx.moveTo(px + br, py); ctx.arc(px, py, br, 0, TAU);
        }
        ctx.stroke();
        break;
      case 'whirl': {
        var cx2 = bx + bw / 2, cy2 = by + bh * 0.52;
        ctx.strokeStyle = 'rgba(255,255,255,0.17)';
        ctx.lineWidth = Math.max(1, 0.9 * k);
        for (i = 0; i < 3; i++) {
          ctx.beginPath();
          for (var a2 = 0; a2 < 4.6; a2 += 0.15) {
            var ang = a2 + t * 0.35 + i * TAU / 3, rad = bw * (0.08 + a2 * 0.085);
            var qx2 = cx2 + Math.cos(ang) * rad, qy2 = cy2 + Math.sin(ang) * rad * 0.8;
            if (a2) ctx.lineTo(qx2, qy2); else ctx.moveTo(qx2, qy2);
          }
          ctx.stroke();
        }
        break;
      }
      case 'sheen':
        spot(ctx, bx + bw * (0.5 + 0.38 * Math.sin(t * 0.32)), by + bh * (0.45 + 0.2 * Math.cos(t * 0.27)), bw * 0.45, [190, 215, 255], 0.26);
        break;
      case 'pearl':
        spot(ctx, bx + bw * (0.5 + 0.36 * Math.sin(t * 0.3)), by + bh * (0.5 + 0.22 * Math.cos(t * 0.25)), bw * 0.42, [255, 228, 240], 0.24);
        spot(ctx, bx + bw * (0.5 - 0.3 * Math.sin(t * 0.22)), by + bh * (0.4 + 0.2 * Math.sin(t * 0.31)), bw * 0.3, [215, 235, 255], 0.16);
        break;
      case 'goldleaf': {
        // now and then a flake catches the light
        var cyc2 = (t * 0.35) % 1;
        if (cyc2 < 0.25) {
          var gr2 = rng(mix(seedOf(key), Math.floor(t * 0.35)));
          star4(ctx, bx + bw * (0.1 + gr2() * 0.8), by + bh * gr2() * 0.12, 3.2 * k * Math.sin(cyc2 / 0.25 * Math.PI), 'rgba(255,240,190,0.9)');
        }
        break;
      }
      case 'opal':
      case 'aurora': {
        var cols = gd.fx === 'opal' ? [[255, 140, 200], [120, 240, 190], [130, 170, 255], [255, 220, 120]] : [[80, 255, 170], [190, 120, 255], [110, 220, 255]];
        for (i = 0; i < 9; i++) {
          var p2 = rimPoint(x, top, w, h, i / 9 + t * (gd.fx === 'opal' ? 0.03 : 0.045));
          spot(ctx, p2[0], p2[1], bw * 0.32, cols[i % cols.length], gd.fx === 'opal' ? 0.24 : 0.26);
        }
        break;
      }
      case 'glints':
        for (i = 0; i < 16; i++) {
          px = bx + bw * (0.05 + r() * 0.9); py = by + bh * (0.04 + r() * 0.92);
          var tw2 = Math.max(0, Math.sin(t * (1.4 + r() * 2.2) + r() * 6));
          if (tw2 > 0.15) star4(ctx, px, py, (1 + 2.4 * tw2) * k, 'rgba(255,255,255,' + (0.85 * tw2) + ')');
        }
        break;
    }
    ctx.restore();
  }
  /* Dichroic Glass's two colours, magenta and teal, each kept with its glow */
  function dichroicLayer(W, H, x, top, w, h, k, which) {
    if (typeof document === 'undefined') return null;
    var id = 'dichroic' + which + '|' + W + '|' + H, c = GCACHE[id];
    if (c) return c;
    c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    if (!g) return null;
    var col = which ? [60, 220, 190] : [230, 70, 200];
    g.save();
    jarShape(g, x, top, w, h);
    g.clip();
    g.fillStyle = rgbaA(col, 0.07); g.fillRect(x, top, w, h);
    edgeBand(g, x, top, w, h, k, [col[0], col[1], col[2], 0.34]);
    g.restore();
    GCACHE[id] = c; GCACHE_N += 1;
    return c;
  }
  /* what a glass puts outside the jar: icicles under the lid, a spark running round the rim */
  function glassOut(ctx, W, H, x, top, w, h, k, t, key) {
    var gd = GLASS[key];
    if (!gd) return;
    if (gd.fx === 'frozen') {
      ctx.fillStyle = 'rgba(230,244,255,0.95)';
      [[0.3, 7], [0.42, 11], [0.55, 6], [0.68, 9]].forEach(function (p, i) {
        var ix = x + w * p[0], iy = top + 1, L = p[1] * k * (1 + 0.04 * Math.sin(t + i));
        ctx.beginPath(); ctx.moveTo(ix - 2 * k, iy); ctx.lineTo(ix + 2 * k, iy); ctx.lineTo(ix, iy + L); ctx.closePath(); ctx.fill();
      });
    } else if (gd.fx === 'spark') {
      var cyc = t % 3.6;
      if (cyc < 0.7) {
        var f = cyc / 0.7;
        for (var i = 0; i < 6; i++) {
          var p = rimPoint(x, top, w, h, f * 0.9 - i * 0.012);
          var a = (1 - i / 6) * Math.sin(f * Math.PI);
          ctx.fillStyle = 'rgba(200,225,255,' + a + ')';
          ctx.beginPath(); ctx.arc(p[0], p[1], (2.2 - i * 0.25) * k, 0, TAU); ctx.fill();
        }
        var p0 = rimPoint(x, top, w, h, f * 0.9);
        star4(ctx, p0[0], p0[1], 5 * k * Math.sin(f * Math.PI), 'rgba(255,255,255,0.95)');
      }
    }
  }
  /* a pearl on top of the lid, for Pearl Glass */
  function pearl(ctx, cx, y, r) {
    ctx.save();
    ctx.fillStyle = 'rgba(40,30,40,0.25)';
    ctx.beginPath(); ctx.ellipse(cx, y, r * 1.1, r * 0.35, 0, 0, TAU); ctx.fill();
    var g = ctx.createRadialGradient(cx - r * 0.35, y - r * 1.2, r * 0.1, cx, y - r * 0.8, r * 1.1);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#F4ECEE'); g.addColorStop(1, '#C9C2D0');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, y - r * 0.8, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,235,0.35)'; ctx.beginPath(); ctx.arc(cx + r * 0.3, y - r * 0.5, r * 0.45, 0, TAU); ctx.fill();
    ctx.restore();
  }
  /* a wax seal pressed onto the jar, just under the lid. Nothing says what it means */
  function waxSeal(ctx, cx, cy, s, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(40,10,10,0.25)';
    ctx.beginPath(); ctx.arc(cx + s * 0.08, cy + s * 0.12, s, 0, TAU); ctx.fill();
    ctx.fillStyle = '#B3262E';
    ctx.beginPath();
    for (var i = 0; i <= 16; i++) {
      var a = i / 16 * TAU, rr = s * (i % 2 ? 0.92 : 1.02);
      if (i) ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,8,14,0.55)';
    ctx.lineWidth = Math.max(1, s * 0.12);
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.66, 0, TAU); ctx.stroke();
    star4(ctx, cx, cy, s * 0.42, 'rgba(90,10,16,0.65)');
    ctx.fillStyle = 'rgba(255,200,200,' + (0.25 + 0.1 * Math.sin(t * 1.5)) + ')';
    ctx.beginPath(); ctx.ellipse(cx - s * 0.35, cy - s * 0.4, s * 0.28, s * 0.14, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* a jar still to catch: empty glass with dust settled in the bottom, and a cobweb on some */
  function dusty(ctx, x, top, w, h, k, seed) {
    var r = rng(seed || 7);
    var g = ctx.createLinearGradient(0, top + h * 0.74, 0, top + h);
    g.addColorStop(0, 'rgba(160,150,130,0)');
    g.addColorStop(1, 'rgba(160,150,130,0.34)');
    ctx.fillStyle = g;
    ctx.fillRect(x, top + h * 0.7, w, h * 0.3);
    ctx.fillStyle = 'rgba(150,140,120,0.45)';
    for (var i = 0; i < 16; i++) {
      ctx.beginPath(); ctx.arc(x + w * (0.12 + r() * 0.76), top + h * (0.24 + r() * 0.72), (0.5 + r() * 0.9) * k, 0, TAU); ctx.fill();
    }
    if (r() < 0.55) {
      var cx = x + w * (r() < 0.5 ? 0.06 : 0.94), cy = top + h * 0.18, dir = cx < x + w / 2 ? 1 : -1, R = w * 0.2;
      ctx.strokeStyle = 'rgba(150,150,160,0.5)';
      ctx.lineWidth = Math.max(1, 0.5 * k);
      ctx.beginPath();
      for (var a = 0; a <= 4; a++) {
        var an = (a / 4) * Math.PI / 2;
        ctx.moveTo(cx, cy); ctx.lineTo(cx + dir * Math.cos(an) * R, cy + Math.sin(an) * R);
      }
      for (var ring = 1; ring <= 3; ring++) {
        var rr = R * ring / 3.4;
        for (var b = 0; b <= 4; b++) {
          var an2 = (b / 4) * Math.PI / 2, px = cx + dir * Math.cos(an2) * rr, py = cy + Math.sin(an2) * rr;
          if (b === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }
  }
  function seedOf(id) { var h = 7; for (var i = 0; i < (id || '').length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0; return h; }

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
     mark: this catch's { seed, deco, legend, power }, so it's one of a kind. preview: a variant not found yet, frosted with a padlock.
     look: { glass, q, veil } colours that follow the page theme */
  function jar(ctx, W, H, st, t, look) {
    ctx.clearRect(0, 0, W, H);
    var k = W / 120;
    var x = W * 0.1, top = H * 0.17, w = W * 0.8, h = H * 0.8, cx = W / 2;
    var mk = st.locked ? null : st.mark || null;
    var lg = !!(mk && mk.legend);
    if (lg) legendGlow(ctx, W, H, cx, top + h * 0.55, t);
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
      ctx.fillStyle = 'rgba(150,160,182,0.1)';
      ctx.fillRect(0, 0, W, H);
      if (!st.later) dusty(ctx, x, top, w, h, k, seedOf(st.id));
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
    } else if (st.animal && WC.zoo) {
      // an animal at home
      WC.zoo.paint(ctx, W, H, st.animal, st.home || 'h1', t, mk);
    } else if (st.img && typeof st.img === 'object' && (st.img.naturalWidth || st.img.width)) {
      cover(ctx, st.img, x, top, w, h);
      decoOver(ctx, W, H, st.id, t, mk);
    } else {
      paint(ctx, W, H, st.id, t, !!st.night, null, mk);
    }
    if (mk && mk.glass && GLASS[mk.glass]) glassIn(ctx, W, H, x, top, w, h, k, t, mk.glass, mk.seed);
    if (st.preview) { ctx.fillStyle = 'rgba(150,160,182,0.3)'; ctx.fillRect(x, top, w, h); }
    var sh = ctx.createLinearGradient(x, 0, x + w, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.12)');
    sh.addColorStop(0.3, 'rgba(255,255,255,0.06)');
    sh.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = sh;
    ctx.fillRect(x, top, w, h);
    if (mk && mk.shine && !st.preview && !st.locked) glint(ctx, x, top, w, h, t, mk);
    ctx.restore();
    ctx.save();
    jarShape(ctx, x, top, w, h);
    var gl = mk && mk.glass ? GLASS[mk.glass] : null;
    ctx.strokeStyle = lg ? 'rgba(214,160,60,0.95)' : gl && gl.rim ? gl.rim : look.glass;
    ctx.lineWidth = Math.max(1, (lg ? 2 : gl && gl.rim ? 2.2 : 1.5) * k);
    if (st.locked && !st.ghost) ctx.setLineDash([5 * k, 3.5 * k]);
    ctx.stroke();
    ctx.restore();
    if (lg) legendGlints(ctx, x, top, w, h, t, k);
    else if (mk && mk.shine >= 2 && !st.preview && !st.locked) shineStars(ctx, x, top, w, h, t, k, mk);
    if (st.preview) padlock(ctx, x + w * 0.8, top + h * 0.85, 8 * k);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    roundRect(ctx, x + w * 0.12, top + h * 0.3, w * 0.07, h * 0.42, w * 0.035);
    ctx.fill();
    if (gl) glassOut(ctx, W, H, x, top, w, h, k, t, mk.glass);
    lid(ctx, cx, top + 1 - (st.lift || 0) * h * 0.3, w * 0.66, h * 0.11, k, st.lidTone);
    if (gl && gl.fx === 'pearl') pearl(ctx, cx, top + 1 - (st.lift || 0) * h * 0.3 - h * 0.11, 4.8 * k);
    if (mk && mk.seal && !st.preview) waxSeal(ctx, x + w * 0.78, top + h * 0.2, 7.5 * k, t);
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
    if (st.locked && (st.later || st.ghost)) {
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
    SCENES: SCENES, paint: paint, jar: jar, jarShape: jarShape, lid: lid, roundRect: roundRect, GLASS: GLASS, waxSeal: waxSeal,
    boltPath: boltPath, fit: fit, rng: rng, has: function (id) { return !!SCENES[id]; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
