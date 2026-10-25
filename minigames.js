/* FRZFRM Weather Catch: weather minigames, in their own Games tab.
   Lightning Reflex: tap the instant lightning strikes.
   Thunder Distance: count from flash to rumble and say how far away the storm is (3 seconds is about 1 km).
   Rain Rush: catch raindrops, dodge hail and lightning, for as long as you can.
   Hotter or Colder: two real cities, live weather. Which is hotter right now?
   Playing earns Games XP for a Games rank of its own, separate from the catching level. */
(function (root) {
  'use strict';
  var WC = root.WC = root.WC || {};
  var TAU = Math.PI * 2;

  var RANKS = [[0, 'Drizzle Rookie'], [100, 'Shower Scout'], [250, 'Breeze Runner'], [500, 'Cloud Ace'], [900, 'Hail Hero'], [1500, 'Lightning Legend'], [2500, 'Storm Master']];
  function rankFor(xp) {
    var i = 0;
    for (var k = 0; k < RANKS.length; k++) if (xp >= RANKS[k][0]) i = k;
    var next = RANKS[i + 1] || null;
    return { i: i, name: RANKS[i][1], at: RANKS[i][0], next: next ? { name: next[1], at: next[0] } : null };
  }
  var GAMES = [
    { id: 'reflex', name: 'Lightning Reflex', line: 'Tap the instant lightning strikes. How fast are you?', unit: 'ms', low: true },
    { id: 'thunder', name: 'Thunder Distance', line: 'Count from the flash to the rumble. How far away is the storm?', unit: 'points' },
    { id: 'rush', name: 'Rain Rush', line: 'Catch the rain in your jar. Dodge the hail and the lightning.', unit: 'drops' },
    { id: 'hot', name: 'Hotter or Colder', line: 'Two real cities, the weather right now. Which one is hotter?', unit: 'in a row' }
  ];
  /* Games XP for a finished round */
  function xpFor(id, r) {
    if (id === 'reflex') { var a = r.avg; return 10 + (a < 250 ? 25 : a < 300 ? 20 : a < 350 ? 15 : a < 420 ? 10 : a < 520 ? 5 : 0); }
    if (id === 'thunder') return 5 + r.points * 2;
    if (id === 'rush') return Math.min(60, 5 + Math.floor(r.score / 2));
    if (id === 'hot') return Math.min(60, 5 + r.streak * 5);
    return 0;
  }
  /* the score that goes on the game's card, and whether it beats the best */
  function scoreOf(id, r) { return id === 'reflex' ? r.avg : id === 'thunder' ? r.points : id === 'rush' ? r.score : r.streak; }
  function better(id, a, b) { if (b === null || b === undefined) return true; return id === 'reflex' ? a < b : a > b; }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function boltPath(ctx, x0, y0, x1, y1, seed, W) {
    var s = seed >>> 0;
    function r() { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (var i = 1; i < 8; i++) { var f = i / 8; ctx.lineTo(x0 + (x1 - x0) * f + (r() - 0.5) * W * 0.12, y0 + (y1 - y0) * f); }
    ctx.lineTo(x1, y1);
  }
  function drawBolt(ctx, x0, y0, x1, y1, seed, W, k, a) {
    ctx.save();
    ctx.strokeStyle = 'rgba(180,200,255,' + (0.5 * a) + ')';
    ctx.lineWidth = 8 * k;
    ctx.lineJoin = 'round';
    boltPath(ctx, x0, y0, x1, y1, seed, W); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,' + a + ')';
    ctx.lineWidth = 3 * k;
    boltPath(ctx, x0, y0, x1, y1, seed, W); ctx.stroke();
    ctx.restore();
  }
  function bigText(ctx, W, H, text, y, size, col) {
    ctx.save();
    ctx.font = '800 ' + Math.round(size) + 'px Archivo, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = 'rgba(5,9,26,0.7)';
    ctx.strokeText(text, W / 2, y);
    ctx.fillStyle = col || '#FFFFFF';
    ctx.fillText(text, W / 2, y);
    ctx.restore();
  }

  /* ---------- Lightning Reflex ---------- */
  function Reflex(ui) {
    this.ui = ui;
    this.rounds = 5;
    this.times = [];
    this.wait();
  }
  Reflex.prototype.wait = function () {
    this.phase = 'wait';
    this.t0 = performance.now();
    this.at = this.t0 + rnd(1300, 4200);
    this.seed = Math.floor(Math.random() * 1e6);
    this.ui.status('Strike ' + (this.times.length + 1) + ' of ' + this.rounds + ' · wait for it…');
  };
  Reflex.prototype.tick = function (now) {
    if (this.phase === 'wait' && now >= this.at) { this.phase = 'strike'; this.strikeAt = now; this.ui.buzz(20); }
    if (this.phase === 'strike' && now - this.strikeAt > 1500) {
      // too slow counts as a slow one, so nobody gets stuck
      this.times.push(1500);
      this.after(now);
    }
    if ((this.phase === 'shown' || this.phase === 'early') && now >= this.nextAt) {
      if (this.times.length >= this.rounds) this.finish(); else this.wait();
    }
  };
  Reflex.prototype.after = function (now) {
    this.phase = 'shown';
    this.nextAt = now + 1000;
    var last = this.times[this.times.length - 1];
    this.ui.status('Strike ' + this.times.length + ' of ' + this.rounds + ' · ' + last + ' ms');
  };
  Reflex.prototype.down = function (x, y, ts) {
    // the tap's own time, when the browser gives one on the same clock
    var pn = performance.now(), now = typeof ts === 'number' && ts > 0 && ts <= pn + 50 && ts > pn - 2000 ? ts : pn;
    if (this.phase === 'wait') {
      this.phase = 'early';
      this.nextAt = performance.now() + 1100;
      this.ui.status('Too soon! Wait for the flash.');
      this.ui.buzz([40, 40, 40]);
    } else if (this.phase === 'strike') {
      this.times.push(Math.max(80, Math.round(now - this.strikeAt)));
      this.after(performance.now());
    }
  };
  Reflex.prototype.finish = function () {
    this.phase = 'over';
    var sum = 0, best = 9999;
    this.times.forEach(function (v) { sum += v; best = Math.min(best, v); });
    var avg = Math.round(sum / this.times.length);
    this.ui.done({ avg: avg, bestTap: best, times: this.times.slice(), summary: 'Average ' + avg + ' ms · fastest ' + best + ' ms' });
  };
  Reflex.prototype.draw = function (ctx, W, H, t, now) {
    var k = W / 300;
    WC.sky.paint(ctx, W, H, 'thunderstorm', t, false, 'bare');
    ctx.fillStyle = 'rgba(4,6,18,0.45)';
    ctx.fillRect(0, 0, W, H);
    if (this.phase === 'strike' || (this.phase === 'shown' && now - this.strikeAt < 260)) {
      var e = (now - this.strikeAt) / 1000;
      ctx.fillStyle = 'rgba(235,240,255,' + Math.max(0, 0.85 - e * 2.5) + ')';
      ctx.fillRect(0, 0, W, H);
      drawBolt(ctx, W * (0.35 + (this.seed % 30) / 100), 0, W * 0.5, H * 0.86, this.seed, W, k, 1);
    }
    if (this.phase === 'wait') bigText(ctx, W, H, 'Wait…', H * 0.5, 36 * k, 'rgba(255,255,255,0.85)');
    else if (this.phase === 'strike') bigText(ctx, W, H, 'TAP!', H * 0.5, 54 * k, '#FFF2B0');
    else if (this.phase === 'early') bigText(ctx, W, H, 'Too soon!', H * 0.5, 40 * k, '#FF9C9C');
    else if (this.phase === 'shown') bigText(ctx, W, H, this.times[this.times.length - 1] + ' ms', H * 0.5, 46 * k, '#FFFFFF');
    for (var i = 0; i < this.rounds; i++) {
      ctx.fillStyle = i < this.times.length ? '#FFF2B0' : 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(W / 2 + (i - 2) * 18 * k, H - 18 * k, 5.5 * k, 0, TAU); ctx.fill();
    }
  };

  /* ---------- Thunder Distance ---------- */
  function Thunder(ui) {
    this.ui = ui;
    this.rounds = 5;
    this.round = 0;
    this.points = 0;
    this.log = [];
    this.audio = null;
    try { var AC = root.AudioContext || root.webkitAudioContext; if (AC) this.audio = new AC(); } catch (e) { this.audio = null; }
    this.next();
  }
  Thunder.prototype.next = function () {
    this.round += 1;
    this.km = 1 + Math.floor(Math.random() * 4);
    var now = performance.now();
    this.flashAt = now + rnd(900, 2000);
    this.rumbleAt = this.flashAt + this.km * 3000 + rnd(-250, 250);
    this.phase = 'wait';
    this.seed = Math.floor(Math.random() * 1e6);
    this.ui.choices(null);
    this.ui.status('Storm ' + this.round + ' of ' + this.rounds + ' · watch for the flash, then count');
  };
  Thunder.prototype.rumble = function () {
    this.ui.buzz([180, 80, 260]);
    var a = this.audio;
    if (!a) return;
    try {
      if (a.state === 'suspended') a.resume();
      var len = 2.2, sr = a.sampleRate, buf = a.createBuffer(1, Math.floor(sr * len), sr), d = buf.getChannelData(0), last = 0;
      for (var i = 0; i < d.length; i++) {
        // brown noise, swelling then dying away: a far-off rumble
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        var f = i / d.length;
        d[i] = last * 3.2 * Math.min(1, f * 6) * Math.pow(1 - f, 1.6);
      }
      var src = a.createBufferSource(), lp = a.createBiquadFilter(), g = a.createGain();
      src.buffer = buf;
      lp.type = 'lowpass';
      lp.frequency.value = 240;
      g.gain.value = 0.9;
      src.connect(lp); lp.connect(g); g.connect(a.destination);
      src.start();
    } catch (e) {}
  };
  Thunder.prototype.tick = function (now) {
    if (this.phase === 'wait' && now >= this.flashAt) { this.phase = 'count'; this.ui.status('Storm ' + this.round + ' of ' + this.rounds + ' · count the seconds…'); }
    if (this.phase === 'count' && now >= this.rumbleAt) {
      this.phase = 'ask';
      this.rumble();
      var self = this;
      this.ui.status('How far away is the storm?');
      this.ui.choices([1, 2, 3, 4].map(function (km) { return { label: km + ' km', fn: function () { self.answer(km); } }; }));
    }
    if (this.phase === 'reveal' && now >= this.nextAt) {
      if (this.round >= this.rounds) this.finish(); else this.next();
    }
  };
  Thunder.prototype.answer = function (km) {
    if (this.phase !== 'ask') return;
    var off = Math.abs(km - this.km), pts = off === 0 ? 3 : off === 1 ? 1 : 0;
    this.points += pts;
    this.log.push({ km: this.km, guess: km, pts: pts });
    this.phase = 'reveal';
    this.nextAt = performance.now() + 2300;
    this.ui.choices(null);
    var secs = Math.round((this.rumbleAt - this.flashAt) / 100) / 10;
    this.ui.status((pts === 3 ? 'Spot on! ' : pts ? 'Close! ' : 'Not quite. ') + secs + ' seconds ÷ 3 = ' + this.km + ' km away' + (pts ? ' · +' + pts : ''));
  };
  Thunder.prototype.finish = function () {
    this.phase = 'over';
    this.ui.done({ points: this.points, log: this.log, summary: this.points + ' of ' + this.rounds * 3 + ' points' });
  };
  Thunder.prototype.down = function () {};
  Thunder.prototype.draw = function (ctx, W, H, t, now) {
    var k = W / 300;
    var shake = this.phase === 'ask' && now - this.rumbleAt < 1400 ? (1 - (now - this.rumbleAt) / 1400) * 6 * k : 0;
    ctx.save();
    if (shake) ctx.translate(Math.sin(now * 0.09) * shake, Math.cos(now * 0.11) * shake * 0.6);
    WC.sky.paint(ctx, W, H, 'sheetlightning', t, false, 'nobolt');
    ctx.fillStyle = 'rgba(4,6,18,0.35)';
    ctx.fillRect(-10, -10, W + 20, H + 20);
    var since = now - this.flashAt;
    if (this.phase !== 'wait' && since >= 0 && since < 420) {
      var a = since < 120 ? 1 : Math.max(0, 1 - (since - 120) / 300);
      ctx.fillStyle = 'rgba(235,240,255,' + (0.7 * a) + ')';
      ctx.fillRect(0, 0, W, H);
      drawBolt(ctx, W * (0.6 + (this.seed % 25) / 100), 0, W * (0.72 + (this.seed % 9) / 100), H * 0.74, this.seed, W * 0.6, k * 0.7, a);
    }
    if (this.phase === 'ask' && now - this.rumbleAt < 1600) bigText(ctx, W, H, 'RUMBLE…', H * 0.42, 40 * k, '#FFE2A0');
    else if (this.phase === 'count') bigText(ctx, W, H, 'Count…', H * 0.42, 34 * k, 'rgba(255,255,255,0.75)');
    else if (this.phase === 'reveal') bigText(ctx, W, H, this.km + ' km', H * 0.42, 50 * k, '#FFFFFF');
    ctx.restore();
    for (var i = 0; i < this.rounds; i++) {
      var lg = this.log[i];
      ctx.fillStyle = !lg ? 'rgba(255,255,255,0.3)' : lg.pts === 3 ? '#6FD6A8' : lg.pts ? '#FFD27A' : '#FF8A8A';
      ctx.beginPath(); ctx.arc(W / 2 + (i - 2) * 18 * k, H - 18 * k, 5.5 * k, 0, TAU); ctx.fill();
    }
  };
  Thunder.prototype.stop = function () { try { if (this.audio && this.audio.close) this.audio.close(); } catch (e) {} };

  /* ---------- Rain Rush ---------- */
  var JAR_Y = 0.8;
  function Rush(ui) {
    this.ui = ui;
    this.t = 0;
    this.score = 0;
    this.lives = 3;
    this.x = 0.5;
    this.half = 0.11;
    this.items = [];
    this.bolts = [];
    this.pops = [];
    this.dropIn = 0.3;
    this.hailIn = 2.6;
    this.boltIn = 7;
    this.hurt = 0;
    this.ui.status('Drag the jar · ♥♥♥');
  }
  Rush.prototype.spawn = function (kind) {
    var sp = 1 + this.t / 45;
    this.items.push({ kind: kind, x: rnd(0.06, 0.94), y: -0.04, vy: (kind === 'hail' ? rnd(0.5, 0.62) : kind === 'gold' ? rnd(0.36, 0.44) : rnd(0.42, 0.58)) * sp, ph: Math.random() * TAU });
  };
  Rush.prototype.lose = function () {
    this.lives -= 1;
    this.hurt = 0.5;
    this.ui.buzz([60, 40, 60]);
    if (this.lives <= 0) { this.over = true; this.ui.done({ score: this.score, summary: this.score + ' drops in ' + Math.round(this.t) + ' seconds' }); }
  };
  Rush.prototype.tickDt = function (dt) {
    if (this.over) return;
    this.t += dt;
    this.hurt = Math.max(0, this.hurt - dt);
    this.dropIn -= dt; this.hailIn -= dt; this.boltIn -= dt;
    if (this.dropIn <= 0) { this.spawn(Math.random() < 0.07 ? 'gold' : 'drop'); this.dropIn = Math.max(0.16, 0.5 - this.t * 0.006) * rnd(0.7, 1.3); }
    if (this.hailIn <= 0) { this.spawn('hail'); this.hailIn = Math.max(0.6, 2.4 - this.t * 0.03) * rnd(0.7, 1.3); }
    if (this.boltIn <= 0 && this.t > 6) {
      this.bolts.push({ x: rnd(0.12, 0.88), w: 0.13, t: 0, seed: Math.floor(Math.random() * 1e6), hit: false });
      this.boltIn = Math.max(2.6, 7 - this.t * 0.07) * rnd(0.8, 1.2);
    }
    for (var i = this.items.length - 1; i >= 0; i--) {
      var it = this.items[i], py = it.y;
      it.y += it.vy * dt;
      it.x += Math.sin(this.t * 2 + it.ph) * 0.012 * dt;
      if (py < JAR_Y && it.y >= JAR_Y && Math.abs(it.x - this.x) <= this.half * 0.9) {
        this.items.splice(i, 1);
        if (it.kind === 'hail') { this.lose(); this.pops.push({ x: it.x, t: 0, txt: 'Ouch!', bad: true }); }
        else { var v = it.kind === 'gold' ? 5 : 1; this.score += v; this.pops.push({ x: it.x, t: 0, txt: '+' + v }); this.ui.buzz(8); }
        if (this.over) return;
        continue;
      }
      if (it.y > 1.05) this.items.splice(i, 1);
    }
    for (var b = this.bolts.length - 1; b >= 0; b--) {
      var bo = this.bolts[b];
      bo.t += dt;
      if (bo.t >= 0.95 && !bo.hit) {
        bo.hit = true;
        if (Math.abs(this.x - bo.x) <= bo.w / 2 + this.half * 0.6) { this.lose(); this.pops.push({ x: this.x, t: 0, txt: 'Zap!', bad: true }); if (this.over) return; }
      }
      if (bo.t > 1.3) this.bolts.splice(b, 1);
    }
    for (var p = this.pops.length - 1; p >= 0; p--) { this.pops[p].t += dt; if (this.pops[p].t > 0.8) this.pops.splice(p, 1); }
    var hearts = '';
    for (var h = 0; h < 3; h++) hearts += h < this.lives ? '♥' : '♡';
    this.ui.status(this.score + ' ' + (this.score === 1 ? 'drop' : 'drops') + ' · ' + hearts);
  };
  Rush.prototype.tick = function () {};
  Rush.prototype.down = function (x) { this.x = clamp(x, this.half, 1 - this.half); };
  Rush.prototype.move = function (x) { this.x = clamp(x, this.half, 1 - this.half); };
  Rush.prototype.key = function (key) {
    if (key === 'ArrowLeft') { this.x = clamp(this.x - 0.07, this.half, 1 - this.half); return true; }
    if (key === 'ArrowRight') { this.x = clamp(this.x + 0.07, this.half, 1 - this.half); return true; }
    return false;
  };
  Rush.prototype.draw = function (ctx, W, H, t) {
    var k = W / 300, S = WC.sky;
    S.paint(ctx, W, H, this.t > 30 ? 'downpour' : 'rain', t, false, 'bare');
    // lightning: a warning stripe first, then the strike
    this.bolts.forEach(function (bo) {
      var x = bo.x * W, w = bo.w * W;
      if (bo.t < 0.95) {
        var blink = 0.18 + 0.22 * Math.abs(Math.sin(bo.t * 14));
        ctx.fillStyle = 'rgba(255,240,150,' + blink + ')';
        ctx.fillRect(x - w / 2, 0, w, H);
        ctx.strokeStyle = 'rgba(255,240,150,0.8)';
        ctx.setLineDash([6 * k, 6 * k]);
        ctx.lineWidth = 2 * k;
        ctx.strokeRect(x - w / 2, -2, w, H + 4);
        ctx.setLineDash([]);
      } else {
        var a = Math.max(0, 1 - (bo.t - 0.95) / 0.35);
        ctx.fillStyle = 'rgba(235,240,255,' + (0.45 * a) + ')';
        ctx.fillRect(0, 0, W, H);
        drawBolt(ctx, x, 0, x + (bo.seed % 20 - 10) * k, H * 0.92, bo.seed, w * 1.4, k, a);
      }
    });
    this.items.forEach(function (it) {
      var x = it.x * W, y = it.y * H;
      if (it.kind === 'hail') {
        ctx.fillStyle = '#F4F8FF';
        ctx.beginPath(); ctx.arc(x, y, 6 * k, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(120,140,180,0.9)';
        ctx.lineWidth = 1.5 * k;
        ctx.stroke();
      } else {
        var gold = it.kind === 'gold';
        ctx.fillStyle = gold ? '#FFD24D' : 'rgba(150,200,255,0.95)';
        ctx.beginPath();
        ctx.moveTo(x, y - 9 * k);
        ctx.quadraticCurveTo(x + 6 * k, y, x, y + 5 * k);
        ctx.quadraticCurveTo(x - 6 * k, y, x, y - 9 * k);
        ctx.fill();
        if (gold) { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.2 * k; ctx.stroke(); }
      }
    });
    // the jar
    var jw = this.half * 2 * W, jh = (0.98 - JAR_Y) * H * 1.15, jx = this.x * W - jw / 2, jy = JAR_Y * H - 4 * k;
    ctx.save();
    S.jarShape(ctx, jx, jy, jw, jh);
    ctx.fillStyle = this.hurt > 0 ? 'rgba(255,120,120,0.35)' : 'rgba(255,255,255,0.16)';
    ctx.fill();
    ctx.clip();
    var fill = Math.min(1, this.score / 80);
    if (fill > 0) { ctx.fillStyle = 'rgba(120,180,255,0.75)'; ctx.fillRect(jx, jy + jh - jh * 0.84 * fill, jw, jh); }
    ctx.restore();
    ctx.save();
    S.jarShape(ctx, jx, jy, jw, jh);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2.4 * k;
    ctx.stroke();
    ctx.restore();
    this.pops.forEach(function (p) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.t / 0.8);
      ctx.font = '800 ' + Math.round(18 * k) + 'px Archivo, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = p.bad ? '#FF9C9C' : '#FFFFFF';
      ctx.fillText(p.txt, p.x * W, JAR_Y * H - 14 * k - p.t * 40 * k);
      ctx.restore();
    });
  };

  /* ---------- Hotter or Colder ---------- */
  var CITIES = [
    ['London', 'UK', 51.51, -0.13], ['Edinburgh', 'UK', 55.95, -3.19], ['Cardiff', 'UK', 51.48, -3.18], ['Belfast', 'UK', 54.6, -5.93],
    ['Dublin', 'Ireland', 53.35, -6.26], ['Paris', 'France', 48.86, 2.35], ['Rome', 'Italy', 41.9, 12.5], ['Madrid', 'Spain', 40.42, -3.7],
    ['Oslo', 'Norway', 59.91, 10.75], ['Reykjavik', 'Iceland', 64.15, -21.94], ['Athens', 'Greece', 37.98, 23.73], ['Moscow', 'Russia', 55.76, 37.62],
    ['Cairo', 'Egypt', 30.04, 31.24], ['Nairobi', 'Kenya', -1.29, 36.82], ['Cape Town', 'South Africa', -33.92, 18.42], ['Dubai', 'UAE', 25.2, 55.27],
    ['Mumbai', 'India', 19.08, 72.88], ['Bangkok', 'Thailand', 13.76, 100.5], ['Singapore', 'Singapore', 1.35, 103.82], ['Beijing', 'China', 39.9, 116.4],
    ['Tokyo', 'Japan', 35.68, 139.69], ['Sydney', 'Australia', -33.87, 151.21], ['Auckland', 'New Zealand', -36.85, 174.76], ['Honolulu', 'USA', 21.31, -157.86],
    ['Anchorage', 'USA', 61.22, -149.9], ['Los Angeles', 'USA', 34.05, -118.24], ['New York', 'USA', 40.71, -74.01], ['Toronto', 'Canada', 43.65, -79.38],
    ['Mexico City', 'Mexico', 19.43, -99.13], ['Rio de Janeiro', 'Brazil', -22.91, -43.17], ['Buenos Aires', 'Argentina', -34.6, -58.38], ['Lima', 'Peru', -12.05, -77.04]
  ];
  var CITY_KEY = 'frzfrm-wc-cities-1';
  function weatherKind(code, day) {
    if (code === 0 || code === 1) return day ? 'clear' : 'starry';
    if (code === 2) return day ? 'sunnyspells' : 'quiet';
    if (code === 3) return 'overcast';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 71 && code <= 77 || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'thunderstorm';
    if (code >= 51) return 'rain';
    return day ? 'sunnyspells' : 'quiet';
  }
  function loadCities() {
    try {
      var c = JSON.parse(localStorage.getItem(CITY_KEY) || 'null');
      if (c && Date.now() - c.at < 30 * 60000 && Array.isArray(c.list) && c.list.length >= 8) return Promise.resolve(c.list);
    } catch (e) {}
    if (!root.fetch) return Promise.reject(new Error('offline'));
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + CITIES.map(function (c) { return c[2]; }).join(',') +
      '&longitude=' + CITIES.map(function (c) { return c[3]; }).join(',') + '&current=temperature_2m,weather_code,is_day&timezone=auto&timeformat=unixtime';
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
      var arr = Array.isArray(j) ? j : [j];
      var list = [];
      arr.forEach(function (x, i) {
        if (!x || !x.current || typeof x.current.temperature_2m !== 'number' || !CITIES[i]) return;
        list.push({ name: CITIES[i][0], country: CITIES[i][1], temp: x.current.temperature_2m, code: x.current.weather_code, day: x.current.is_day === 1, offset: x.utc_offset_seconds || 0 });
      });
      if (list.length < 8) throw new Error('Not enough cities');
      try { localStorage.setItem(CITY_KEY, JSON.stringify({ at: Date.now(), list: list })); } catch (e) {}
      return list;
    });
  }
  function localTime(offset) {
    var d = new Date(Date.now() + offset * 1000);
    var h = d.getUTCHours(), m = d.getUTCMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function Hot(ui) {
    this.ui = ui;
    this.streak = 0;
    this.recent = [];
    this.list = null;
    var self = this;
    ui.status('Getting the weather in 32 cities…');
    ui.choices(null);
    loadCities().then(function (list) {
      if (self.stopped) return;
      self.list = list.slice();
      var here = ui.here && ui.here();
      if (here && typeof here.temp === 'number') self.list.push({ name: here.name || 'Where you are', country: 'You', temp: here.temp, code: here.code, day: here.day, offset: null, you: true });
      self.next();
    }).catch(function () {
      if (self.stopped) return;
      ui.status('Couldn’t get the live weather. This game needs the internet.');
      ui.done(null);
    });
  }
  Hot.prototype.pick = function () {
    var L = this.list, rec = this.recent, tries = 0, a, b;
    do {
      a = L[Math.floor(Math.random() * L.length)];
      b = L[Math.floor(Math.random() * L.length)];
      tries++;
    } while (tries < 300 && (a === b || Math.abs(a.temp - b.temp) < 2 || (tries < 200 && (rec.indexOf(a.name) !== -1 || rec.indexOf(b.name) !== -1))));
    rec.push(a.name, b.name);
    while (rec.length > 10) rec.shift();
    return [a, b];
  };
  Hot.prototype.next = function () {
    var pair = this.pick(), self = this;
    this.pair = pair;
    this.answered = false;
    this.ui.status(this.streak ? this.streak + ' in a row. Which is hotter right now?' : 'Which is hotter right now?');
    this.ui.choices(pair.map(function (c, i) {
      return { city: c, label: c.name, fn: function () { self.answer(i); } };
    }), 'cities');
  };
  Hot.prototype.answer = function (i) {
    if (this.answered) return;
    this.answered = true;
    var p = this.pair, right = p[i].temp >= p[1 - i].temp;
    this.ui.reveal(p.map(function (c) { return Math.round(c.temp); }), i, right);
    var self = this;
    if (right) {
      this.streak += 1;
      this.ui.buzz(15);
      this.ui.status('Yes! ' + this.streak + ' in a row.');
      setTimeout(function () { if (!self.stopped) self.next(); }, 1500);
    } else {
      this.ui.buzz([60, 40, 60]);
      this.ui.status('Not this time: ' + p[1 - i].name + ' is hotter.');
      setTimeout(function () { if (!self.stopped) self.ui.done({ streak: self.streak, summary: self.streak + ' in a row' }); }, 1700);
    }
  };
  Hot.prototype.tick = function () {};
  Hot.prototype.down = function () {};
  Hot.prototype.draw = null;

  /* ---------- running a game ---------- */
  var MAKERS = { reflex: Reflex, thunder: Thunder, rush: Rush, hot: Hot };
  var cur = null, raf = 0, lastT = 0;
  function loop(ts) {
    if (!cur) { raf = 0; return; }
    var g = cur.g, dt = lastT ? Math.min(0.05, (ts - lastT) / 1000) : 0.016;
    lastT = ts;
    if (g.tickDt) g.tickDt(dt);
    g.tick(performance.now());
    if (cur && g.draw && cur.canvas) {
      var size = WC.sky.fit(cur.canvas);
      if (size) g.draw(cur.canvas.getContext('2d'), size.W, size.H, ts / 1000, performance.now());
    }
    raf = cur ? requestAnimationFrame(loop) : 0;
  }
  /* ui: { canvas, status(text), choices(list, kind), reveal(temps, picked, right), done(result), buzz(pattern), here() } */
  function start(id, ui) {
    stop();
    var M = MAKERS[id];
    if (!M) return null;
    cur = { id: id, ui: ui, canvas: ui.canvas, g: null };
    cur.g = new M(ui);
    lastT = 0;
    if (!raf) raf = requestAnimationFrame(loop);
    return cur.g;
  }
  function stop() {
    if (cur && cur.g) { cur.g.stopped = true; cur.g.over = true; if (cur.g.stop) cur.g.stop(); }
    cur = null;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function pointer(type, x, y, ts) {
    if (!cur || !cur.g || cur.g.over) return;
    if (type === 'down' && cur.g.down) cur.g.down(x, y, ts);
    else if (type === 'move' && cur.g.move) cur.g.move(x, y);
  }
  function key(k) {
    if (!cur || !cur.g || cur.g.over) return false;
    if (cur.g.key) return cur.g.key(k);
    if ((k === ' ' || k === 'Enter') && cur.g.down) { cur.g.down(0.5, 0.5); return true; }
    return false;
  }

  WC.mini = {
    GAMES: GAMES, RANKS: RANKS, rankFor: rankFor, xpFor: xpFor, scoreOf: scoreOf, better: better, weatherKind: weatherKind, localTime: localTime,
    start: start, stop: stop, pointer: pointer, key: key, active: function () { return !!cur; }, current: function () { return cur ? cur.id : null; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
