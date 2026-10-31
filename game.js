/* FRZFRM Weather Catch: the jar games.
   scoop: drag the jar under falling rain, snow or hail
   hold: hold to let cloud or fog drift in, let go in the glowing band
   timing: tap as the marker crosses the glow (sun, wind, frost, night sky)
   flash: tap the instant the lightning flashes */
(function (root) {
  'use strict';
  var WC = root.WC = root.WC || {};
  var TAU = Math.PI * 2;
  function sfx(n) { if (WC.sfx) WC.sfx.play(n); }

  var DIFF = {
    common:    { need: 12, time: 12, half: 0.15, band: 0.30, fill: 0.30, zone: 0.26, speed: 0.85, hits: 1, win: 0.80, flashes: 1, flee: 0 },
    uncommon:  { need: 14, time: 12, half: 0.14, band: 0.24, fill: 0.34, zone: 0.22, speed: 1.05, hits: 1, win: 0.65, flashes: 1, flee: 0.10 },
    rare:      { need: 16, time: 12, half: 0.13, band: 0.19, fill: 0.38, zone: 0.18, speed: 1.25, hits: 2, win: 0.55, flashes: 1, flee: 0.15 },
    epic:      { need: 20, time: 12, half: 0.12, band: 0.15, fill: 0.42, zone: 0.15, speed: 1.45, hits: 2, win: 0.45, flashes: 2, flee: 0.20 },
    legendary: { need: 24, time: 12, half: 0.11, band: 0.12, fill: 0.46, zone: 0.12, speed: 1.65, hits: 3, win: 0.40, flashes: 2, flee: 0.25 }
  };
  /* a named storm only comes once, so it never slips away. Its game stays a challenge: three taps in a row,
     in a glow a little wider and slower than other Legendary jars. A sunset seen from a plane is just as rare, so it's the same */
  var STORM = { need: 16, time: 12, half: 0.13, band: 0.19, fill: 0.38, zone: 0.15, speed: 1.3, hits: 3, win: 0.55, flashes: 1, flee: 0 };
  function diffFor(id) { var t = WC.rules.type(id); return id === 'namedstorm' || id === 'cloudsunset' ? STORM : t ? DIFF[t.r] : DIFF.common; }
  var RATE = { drizzle: 3.5, rain: 3.5, showers: 4, downpour: 5.5, sidewaysrain: 5, cloudburst: 7, monsoon: 7, sleet: 4.5, snow: 4.5, heavysnow: 6, blizzard: 6.5, hail: 5, freezingrain: 4.5 };
  var DRIFT = { sidewaysrain: 0.18, blizzard: 0.16 };
  var SNOWY = { snow: 1, heavysnow: 1, blizzard: 1 };
  var COOL = { breeze: 1, windy: 1, gale: 1, stormforce: 1, namedstorm: 1, tornado: 1, starry: 1, fullmoon: 1, supermoon: 1, meteor: 1, frost: 1, hardfrost: 1 };
  var JAR_TOP = 0.7;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function tri(x) { var f = x - Math.floor(x); return 1 - Math.abs(f * 2 - 1); }

  function instruction(id, mech) {
    if (mech === 'scoop') {
      if (SNOWY[id]) return 'Drag the jar to scoop the falling snow before time runs out.';
      if (id === 'sleet') return 'Drag the jar to scoop the falling sleet before time runs out.';
      if (id === 'hail') return 'Drag the jar to catch the hailstones before time runs out.';
      return 'Drag the jar to scoop the falling rain before time runs out.';
    }
    if (mech === 'hold') return 'Press and hold to let it drift into the jar. Let go when it reaches the glowing band.';
    if (mech === 'flash') return 'Wait for the lightning, then tap the instant it flashes. Tap too early and you miss.';
    if (COOL[id] && /breeze|windy|gale|storm|tornado/.test(id)) return 'Tap as the gust crosses the glow.';
    if (id === 'frost' || id === 'hardfrost') return 'Tap as the frost sparkle crosses the glow.';
    if (id === 'starry' || id === 'meteor') return 'Tap as the star crosses the glow.';
    if (id === 'fullmoon' || id === 'supermoon') return 'Tap as the moon crosses the glow.';
    if (id === 'eclipse') return 'Tap as the moon crosses the glow. Never look straight at the sun.';
    return 'Tap when the sunbeam crosses the glow.';
  }

  function Game(opts) {
    var t = WC.rules.type(opts.id);
    this.id = opts.id;
    this.type = t;
    this.mech = t.game === 'photo' || !t.game ? 'timing' : t.game;
    this.d = diffFor(opts.id);
    this.night = !!opts.night;
    this.attempt = 0;
    this.instruction = instruction(this.id, this.mech);
    this.start();
  }
  Game.prototype.start = function () {
    this.attempt += 1;
    this.state = 'play';
    this.t = 0;
    this.prog = 0;
    this.result = null;
    if (this.mech === 'scoop') { this.parts = []; this.spawnAcc = 0; this.caught = 0; this.jx = 0.5; this.splash = []; }
    else if (this.mech === 'hold') { this.fill = 0; this.holding = false; this.target = 0.62 + Math.random() * 0.18; }
    else if (this.mech === 'timing') { this.hits = 0; this.zone = 0.25 + Math.random() * 0.5; this.ph = Math.random(); this.pos = 0; this.flashT = 0; }
    else if (this.mech === 'flash') { this.hits = 0; this.flashAt = 0.9 + Math.random() * 1.7; this.flashOn = false; this.flashStart = 0; this.sparkT = 0; this.boltSeed = 1; }
  };
  Game.prototype.win = function () {
    this.state = 'won';
    this.wonT = 0;
    this.prog = 1;
    this.holding = false;
  };
  Game.prototype.miss = function (text) {
    this.state = 'missed';
    this.holding = false;
    this.result = text;
  };
  Game.prototype.status = function () {
    if (this.state === 'won') return 'Caught';
    var s = '';
    if (this.mech === 'scoop') s = 'Scooped ' + this.caught + ' of ' + this.d.need + ' · ' + Math.max(0, Math.ceil(this.d.time - this.t)) + 's left';
    else if (this.mech === 'hold') s = 'Filled ' + Math.round(this.fill * 100) + '%';
    else if (this.mech === 'timing') s = 'Hits ' + this.hits + ' of ' + this.d.hits;
    else s = (this.flashOn ? 'Now!' : 'Wait for it…') + ' · ' + this.hits + ' of ' + this.d.flashes;
    if (this.attempt > 1) s += ' · try ' + this.attempt;
    return s;
  };

  Game.prototype.spawn = function () {
    var id = this.id;
    var flaky = SNOWY[id] || (id === 'sleet' && Math.random() < 0.5);
    var fast = id === 'downpour' || id === 'cloudburst' || id === 'monsoon' ? 1.25 : 1;
    this.parts.push({
      x: 0.05 + Math.random() * 0.9, y: -0.05,
      vy: id === 'hail' ? (0.55 + Math.random() * 0.25) : flaky ? (0.16 + Math.random() * 0.12) : (0.42 + Math.random() * 0.25) * fast,
      ph: Math.random() * TAU, kind: id === 'hail' ? 'hail' : flaky ? 'flake' : 'drop', s: 0.6 + Math.random() * 0.8
    });
  };
  Game.prototype.tick = function (dt) {
    if (this.state === 'won') { this.wonT += dt; return; }
    if (this.state !== 'play') return;
    this.t += dt;
    var d = this.d;
    if (this.mech === 'scoop') {
      this.spawnAcc += dt * (RATE[this.id] || 4);
      while (this.spawnAcc >= 1) { this.spawnAcc -= 1; this.spawn(); }
      var drift = (WC.rules.rank(this.id) - 1) * 0.035 + (DRIFT[this.id] || 0);
      for (var i = this.parts.length - 1; i >= 0; i--) {
        var p = this.parts[i];
        var prevY = p.y;
        p.y += p.vy * dt;
        p.x += (Math.sin(this.t * 2 + p.ph) * (p.kind === 'flake' ? 0.08 : 0.01) + drift * Math.sin(this.t * 0.7) + (DRIFT[this.id] || 0) * 0.6) * dt;
        if (prevY < JAR_TOP && p.y >= JAR_TOP && Math.abs(p.x - this.jx) <= d.half * 0.85) {
          this.caught += 1;
          sfx('drop');
          this.splash.push({ x: p.x, t: 0 });
          this.parts.splice(i, 1);
          continue;
        }
        if (p.y > 1.05 || p.x < -0.15 || p.x > 1.15) this.parts.splice(i, 1);
      }
      for (var s = this.splash.length - 1; s >= 0; s--) {
        this.splash[s].t += dt;
        if (this.splash[s].t > 0.35) this.splash.splice(s, 1);
      }
      this.prog = Math.min(1, this.caught / d.need);
      if (this.caught >= d.need) this.win();
      else if (this.t >= d.time) this.miss('Time’s up! You scooped ' + this.caught + ' of ' + d.need + '.');
    } else if (this.mech === 'hold') {
      if (this.holding) {
        var wob = WC.rules.rank(this.id) >= 3 ? (1 + 0.35 * Math.sin(this.t * 5)) : 1;
        this.fill += d.fill * wob * dt;
        if (this.fill >= 1) { this.fill = 1; this.miss('Too much! The jar overflowed.'); }
      }
      this.prog = Math.min(1, this.fill);
    } else if (this.mech === 'timing') {
      this.pos = tri(this.ph + this.t * 0.5 * d.speed);
      this.flashT = Math.max(0, this.flashT - dt);
      this.prog = this.hits / d.hits;
    } else if (this.mech === 'flash') {
      if (!this.flashOn && this.t >= this.flashAt) {
        this.flashOn = true;
        this.flashStart = this.t;
        this.boltSeed = Math.floor(Math.random() * 1000000);
      }
      if (this.flashOn && this.t - this.flashStart > d.win) { this.flashOn = false; this.miss('Missed it! Tap the instant it flashes.'); return; }
      this.sparkT = Math.max(0, this.sparkT - dt);
      this.prog = this.hits / d.flashes;
    }
  };
  Game.prototype.release = function () {
    if (this.fill < 0.04) { this.fill = 0; return; }
    var lo = this.target - this.d.band / 2, hi = this.target + this.d.band / 2;
    if (this.fill >= lo && this.fill <= hi) this.win();
    else if (this.fill < lo) this.miss('Not enough yet. Hold on a little longer.');
    else this.miss('Too much! Let go a little sooner.');
  };
  Game.prototype.tap = function () {
    if (this.mech === 'timing') {
      if (Math.abs(this.pos - this.zone) <= this.d.zone / 2) {
        this.hits += 1;
        sfx('hit');
        this.flashT = 0.3;
        if (this.hits >= this.d.hits) { this.prog = 1; this.win(); return; }
        var z = this.zone, tries = 0;
        while (Math.abs(z - this.zone) < 0.25 && tries < 20) { z = 0.18 + Math.random() * 0.64; tries += 1; }
        this.zone = z;
      } else {
        this.miss('Just missed! Tap when the marker is in the glow.');
      }
    } else if (this.mech === 'flash') {
      if (!this.flashOn) { this.miss('Too early! Wait for the flash.'); return; }
      this.hits += 1;
      sfx('zap');
      this.flashOn = false;
      this.sparkT = 0.8;
      if (this.hits >= this.d.flashes) { this.prog = 1; this.win(); return; }
      this.flashAt = this.t + 1.0 + Math.random() * 1.4;
    }
  };
  /* type: down, move or up; x: 0 to 1 across the stage */
  Game.prototype.pointer = function (type, x) {
    if (this.state !== 'play') { if (type === 'up') this.holding = false; return; }
    if (this.mech === 'scoop') { if (type !== 'up') this.jx = clamp(x, this.d.half, 1 - this.d.half); }
    else if (this.mech === 'hold') {
      if (type === 'down') this.holding = true;
      else if (type === 'up' && this.holding) { this.holding = false; this.release(); }
    } else if (type === 'down') this.tap();
  };
  Game.prototype.key = function (type, key, repeat) {
    if (this.state !== 'play') return false;
    if (this.mech === 'scoop' && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      if (type === 'down') this.jx = clamp(this.jx + (key === 'ArrowLeft' ? -0.07 : 0.07), this.d.half, 1 - this.d.half);
      return true;
    }
    if (key === ' ' || key === 'Enter') {
      if (type === 'down' && !repeat) {
        if (this.mech === 'hold') this.holding = true;
        else this.tap();
      } else if (type === 'up' && this.mech === 'hold' && this.holding) {
        this.holding = false;
        this.release();
      }
      return true;
    }
    return false;
  };

  function gameJar(ctx, cx, top, w, h, frac, col, lift, k, withLid) {
    var S = WC.sky;
    var x = cx - w / 2;
    ctx.save();
    S.jarShape(ctx, x, top, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.clip();
    if (frac > 0) {
      var fy = top + h - h * 0.84 * Math.min(1, frac);
      ctx.fillStyle = col;
      ctx.fillRect(x, fy, w, top + h - fy);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(x, fy, w, 2 * k);
    }
    ctx.restore();
    ctx.save();
    S.jarShape(ctx, x, top, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 2 * k;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    S.roundRect(ctx, x + w * 0.13, top + h * 0.3, w * 0.06, h * 0.42, w * 0.03);
    ctx.fill();
    if (withLid) S.lid(ctx, cx, top - lift, w * 0.66, h * 0.11, k);
  }

  Game.prototype.draw = function (canvas, ts) {
    var S = WC.sky;
    var size = S.fit(canvas);
    if (!size) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var W = size.W, H = size.H, k = W / 300, id = this.id, d = this.d;
    if (this.mech === 'scoop') {
      S.paint(ctx, W, H, id, ts, this.night, 'bare');
      for (var i = 0; i < this.parts.length; i++) {
        var p = this.parts[i];
        var px = p.x * W, py = p.y * H;
        if (p.kind === 'flake') {
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.beginPath(); ctx.arc(px, py, (2.2 + 2.2 * p.s) * k, 0, TAU); ctx.fill();
        } else if (p.kind === 'hail') {
          ctx.fillStyle = 'rgba(245,250,255,0.98)';
          ctx.beginPath(); ctx.arc(px, py, (2 + 1.6 * p.s) * k, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(160,180,210,0.8)';
          ctx.lineWidth = 1 * k;
          ctx.stroke();
        } else {
          ctx.strokeStyle = id === 'freezingrain' ? 'rgba(230,245,255,0.98)' : 'rgba(214,232,255,0.95)';
          ctx.lineWidth = 2.2 * k;
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 2 * k - (DRIFT[id] ? 6 * k : 0), py + 11 * k * p.s); ctx.stroke();
        }
      }
      var snowy = SNOWY[id] || id === 'hail';
      var col = snowy ? 'rgba(255,255,255,0.94)' : id === 'sleet' ? 'rgba(205,226,255,0.88)' : id === 'freezingrain' ? 'rgba(215,235,255,0.9)' : 'rgba(120,180,255,0.78)';
      gameJar(ctx, this.jx * W, JAR_TOP * H, d.half * 2 * W, (0.97 - JAR_TOP) * H, this.prog, col, 0, k, false);
      for (var s = 0; s < this.splash.length; s++) {
        var sp = this.splash[s];
        ctx.strokeStyle = 'rgba(255,255,255,' + Math.max(0, 0.9 - sp.t * 2.4) + ')';
        ctx.lineWidth = 1.6 * k;
        ctx.beginPath(); ctx.arc(sp.x * W, JAR_TOP * H, (4 + sp.t * 40) * k, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }
    } else if (this.mech === 'hold') {
      S.paint(ctx, W, H, id, ts, this.night);
      var cx = W * 0.45, top = H * 0.22, w = W * 0.42, h = H * 0.68, bodyH = h * 0.84;
      var lo = this.target - d.band / 2, hi = this.target + d.band / 2;
      var yLo = top + h - bodyH * lo, yHi = top + h - bodyH * hi;
      var rx = cx + w / 2 + 12 * k;
      ctx.save();
      ctx.shadowColor = 'rgba(245,183,89,0.9)';
      ctx.shadowBlur = 12 * k;
      ctx.fillStyle = 'rgba(245,183,89,0.95)';
      S.roundRect(ctx, rx, yHi, 12 * k, yLo - yHi, 6 * k);
      ctx.fill();
      ctx.restore();
      gameJar(ctx, cx, top, w, h, this.fill, 'rgba(236,240,246,0.9)', this.holding ? 18 * k : 0, k, true);
      ctx.save();
      ctx.setLineDash([6 * k, 5 * k]);
      ctx.strokeStyle = 'rgba(245,183,89,0.95)';
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.42, yLo); ctx.lineTo(cx + w * 0.42, yLo);
      ctx.moveTo(cx - w * 0.42, yHi); ctx.lineTo(cx + w * 0.42, yHi);
      ctx.stroke();
      ctx.restore();
      var yF = top + h - bodyH * Math.min(1, this.fill);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(rx + 16 * k, yF); ctx.lineTo(rx + 26 * k, yF - 7 * k); ctx.lineTo(rx + 26 * k, yF + 7 * k); ctx.closePath(); ctx.fill();
    } else if (this.mech === 'timing') {
      S.paint(ctx, W, H, id, ts, this.night);
      gameJar(ctx, W * 0.5, H * 0.4, W * 0.22, H * 0.3, this.prog, 'rgba(255,226,150,0.75)', 10 * k, k, true);
      var bx = W * 0.08, bw = W * 0.84, by = H * 0.82, bh = 16 * k;
      ctx.fillStyle = 'rgba(5,9,26,0.62)';
      S.roundRect(ctx, bx - 5 * k, by - 5 * k, bw + 10 * k, bh + 10 * k, 12 * k);
      ctx.fill();
      var cool = !!COOL[id];
      var zc = cool ? 'rgba(143,211,255,0.95)' : 'rgba(245,183,89,0.95)';
      var zw = d.zone * bw, zx = bx + this.zone * bw - zw / 2;
      ctx.save();
      ctx.shadowColor = zc;
      ctx.shadowBlur = 14 * k;
      ctx.fillStyle = zc;
      S.roundRect(ctx, zx, by, zw, bh, 6 * k);
      ctx.fill();
      ctx.restore();
      var mx = bx + this.pos * bw, my = by + bh / 2;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(mx, my, 12 * k, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(5,9,26,0.55)';
      ctx.lineWidth = 2 * k;
      ctx.stroke();
      ctx.fillStyle = cool ? '#1D6FA8' : '#C9861E';
      ctx.beginPath(); ctx.arc(mx, my, 5 * k, 0, TAU); ctx.fill();
      for (var hp = 0; hp < d.hits; hp++) {
        ctx.fillStyle = hp < this.hits ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(W - 20 * k - hp * 18 * k, 22 * k, 6 * k, 0, TAU); ctx.fill();
      }
      if (this.flashT > 0) {
        ctx.fillStyle = 'rgba(111,214,168,' + (this.flashT * 1.1) + ')';
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      S.paint(ctx, W, H, id, ts, this.night, 'nobolt');
      ctx.fillStyle = 'rgba(4,6,18,0.4)';
      ctx.fillRect(0, 0, W, H);
      var jcx = W * 0.5, jtop = H * 0.62, jw = W * 0.26, jh = H * 0.32;
      if (this.flashOn) {
        var e = this.t - this.flashStart;
        ctx.fillStyle = 'rgba(235,240,255,' + Math.max(0, 0.75 - e * 3) + ')';
        ctx.fillRect(0, 0, W, H);
        if (e < 0.3) {
          ctx.strokeStyle = 'rgba(255,255,255,0.98)';
          ctx.lineWidth = 3 * k;
          ctx.lineJoin = 'round';
          S.boltPath(ctx, W, this.boltSeed, W * (0.25 + (this.boltSeed % 50) / 100), H * 0.04, jcx, jtop - 8 * k, 8);
          ctx.stroke();
        }
      }
      gameJar(ctx, jcx, jtop, jw, jh, this.prog, 'rgba(255,236,150,0.55)', 14 * k, k, true);
      if (this.sparkT > 0 || this.state === 'won') {
        ctx.save();
        S.jarShape(ctx, jcx - jw / 2, jtop, jw, jh);
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,246,190,0.95)';
        ctx.lineWidth = 2 * k;
        for (var z = 0; z < 3; z++) {
          S.boltPath(ctx, W, Math.floor(ts * 12) + z * 31, jcx - jw * 0.3 + z * jw * 0.3, jtop + jh * 0.25, jcx - jw * 0.25 + z * jw * 0.25, jtop + jh * 0.9, 4);
          ctx.stroke();
        }
        ctx.restore();
      }
      for (var fp = 0; fp < d.flashes; fp++) {
        ctx.fillStyle = fp < this.hits ? '#FFF2B0' : 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(W - 20 * k - fp * 18 * k, 22 * k, 6 * k, 0, TAU); ctx.fill();
      }
    }
  };

  WC.game = {
    DIFF: DIFF,
    create: function (opts) { return new Game(opts); },
    fleeChance: function (id) { return WC.rules.type(id) ? diffFor(id).flee : 0; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
