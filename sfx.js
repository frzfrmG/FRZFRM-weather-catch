/* FRZFRM Weather Catch: sound effects, made on the phone as it plays them (no sound files to download).
   Glassy chimes and clinks to go with the jars, and soft game sounds. play(name) plays one; setOn(false) mutes them.
   Sounds start after the first tap anywhere, as phones require. Where the phone allows it they mix with music and
   follow the silent switch, like other game sounds. */
(function (root) {
  var WC = root.WC = root.WC || {};
  var AC = root.AudioContext || root.webkitAudioContext;
  var ctx = null, master = null, noiseBuf = null, on = true, last = {};
  try { if (root.navigator && root.navigator.audioSession) root.navigator.audioSession.type = 'ambient'; } catch (e) {}

  function init() {
    if (ctx || !AC) return ctx;
    try { ctx = new AC(); } catch (e) { ctx = null; return null; }
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.6;
    master.connect(comp); comp.connect(ctx.destination);
    var n = Math.floor(ctx.sampleRate * 1.2);
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function resume() { try { var pr = ctx.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
  function unlock() { if (!init()) return; if (ctx.state !== 'running') resume(); }

  /* building blocks: a tone that fades, a glass bell (a tone and its higher overtones), and a burst of filtered noise */
  function tone(f, t, dur, o) {
    o = o || {};
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || dur));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function bell(f, t, dur, vol) {
    [[1, 1], [2.76, 0.4], [5.4, 0.2], [8.93, 0.08]].forEach(function (p) { tone(f * p[0], t, dur / Math.sqrt(p[0]), { vol: vol * p[1], a: 0.002 }); });
  }
  function noise(t, dur, o) {
    o = o || {};
    var src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    flt.type = o.type || 'lowpass';
    flt.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    flt.Q.value = o.q || 0.7;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.a || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.4); src.stop(t + dur + 0.05);
  }
  function sparkle(t, n, vol) { for (var i = 0; i < n; i++) tone(2200 + Math.random() * 3200, t + i * 0.035 + Math.random() * 0.02, 0.14, { vol: (vol || 0.04) * (0.6 + Math.random() * 0.6), a: 0.001 }); }
  var N = { G4: 392, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.5, G6: 1567.98, A6: 1760, C7: 2093 };

  var SOUNDS = {
    // catching weather and animals
    catch: function (t) { bell(N.C6, t, 0.9, 0.15); bell(N.E6, t + 0.08, 0.9, 0.13); bell(N.G6, t + 0.16, 1.3, 0.13); },
    swirl: function (t) { noise(t, 0.75, { type: 'bandpass', f: 700, f2: 3400, q: 2.2, vol: 0.16, a: 0.3 }); sparkle(t + 0.35, 5, 0.05); },
    clink: function (t) { tone(2650, t, 0.3, { vol: 0.26, a: 0.001 }); tone(4130, t, 0.22, { vol: 0.15, a: 0.001 }); tone(6250, t, 0.12, { vol: 0.08, a: 0.001 }); noise(t, 0.04, { type: 'highpass', f: 5000, vol: 0.08, a: 0.001 }); },
    epic: function (t) { [N.G5, N.C6, N.E6, N.G6, N.C7].forEach(function (f, i) { bell(f, t + i * 0.065, 1.2, 0.1); }); tone(N.C5, t + 0.3, 1.1, { type: 'triangle', vol: 0.06, a: 0.04 }); sparkle(t + 0.25, 14, 0.045); },
    rare: function (t) { [N.C6, N.E6, N.G6, N.C7].forEach(function (f, i) { bell(f, t + i * 0.07, 1.1, 0.11); }); sparkle(t + 0.2, 10); },
    legend: function (t) {
      [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6, N.C7].forEach(function (f, i) { bell(f, t + i * 0.06, 1.5, 0.09); });
      tone(N.C5 / 2, t, 1.8, { type: 'triangle', vol: 0.12, a: 0.06 }); tone(N.G4 / 2, t + 0.1, 1.7, { type: 'triangle', vol: 0.07, a: 0.06 });
      sparkle(t + 0.3, 20, 0.05);
    },
    level: function (t) { [N.G5, N.C6, N.E6, N.G6].forEach(function (f, i) { bell(f, t + i * 0.09, 0.9, 0.12); }); tone(N.C6, t + 0.36, 1.0, { type: 'triangle', vol: 0.07, a: 0.02 }); sparkle(t + 0.4, 8); },
    reward: function (t) { bell(N.E6, t, 0.8, 0.12); bell(N.A6, t + 0.1, 1.0, 0.11); sparkle(t + 0.1, 7); },
    tick: function (t) { tone(1900, t, 0.04, { type: 'triangle', vol: 0.2, a: 0.001 }); },
    miss: function (t) { tone(N.E5, t, 0.13, { type: 'triangle', vol: 0.17 }); tone(N.C5, t + 0.11, 0.24, { type: 'triangle', vol: 0.17, f2: N.G4 }); },
    shutter: function (t) { noise(t, 0.03, { type: 'highpass', f: 3200, vol: 0.18, a: 0.001 }); noise(t + 0.07, 0.04, { type: 'highpass', f: 2600, vol: 0.12, a: 0.001 }); },
    // catching games
    drop: function (t) { tone(900 + Math.random() * 500, t, 0.12, { vol: 0.2, f2: 1700, glide: 0.06 }); },
    hit: function (t) { bell(N.A6, t, 0.28, 0.2); },
    zap: function (t) { noise(t, 0.12, { type: 'highpass', f: 2500, vol: 0.2, a: 0.001 }); tone(N.E6, t, 0.2, { vol: 0.14, type: 'triangle' }); },
    // hide & seek
    find: function (t) { tone(520, t, 0.12, { vol: 0.16, f2: 900, glide: 0.08 }); bell(N.E6, t + 0.06, 0.7, 0.11); bell(N.A6, t + 0.14, 0.9, 0.1); },
    hint: function (t) { noise(t, 0.4, { type: 'bandpass', f: 600, f2: 2400, q: 1.2, vol: 0.18, a: 0.1 }); },
    // the low notes have a buzzier copy an octave up, so a phone's small speaker plays them too
    boss: function (t) {
      [[0, 0.5], [0.24, 0.5], [0.48, 1.0]].forEach(function (n, i) { var f = i < 2 ? 98 : 146.8; tone(f, t + n[0], n[1], { type: 'triangle', vol: 0.24 }); tone(f * 2, t + n[0], n[1] * 0.8, { type: 'square', vol: 0.05 }); });
      noise(t, 0.12, { type: 'lowpass', f: 400, vol: 0.1 });
    },
    go: function (t) { tone(N.C5, t, 0.14, { type: 'square', vol: 0.08 }); tone(N.G5, t + 0.14, 0.3, { type: 'square', vol: 0.08 }); },
    win: function (t) { [N.C5, N.E5, N.G5, N.C6].forEach(function (f, i) { tone(f, t + i * 0.1, 0.35, { type: 'triangle', vol: 0.12 }); }); bell(N.C6, t + 0.42, 1.2, 0.12); bell(N.E6, t + 0.42, 1.2, 0.1); sparkle(t + 0.45, 14); },
    lose: function (t) { [N.G5, N.E5, N.C5].forEach(function (f, i) { tone(f, t + i * 0.17, 0.45, { type: 'triangle', vol: 0.18 }); }); tone(N.C5 / 2, t + 0.5, 0.7, { type: 'triangle', vol: 0.12 }); },
    // weather hop
    hop: function (t) { tone(520, t, 0.08, { vol: 0.22, f2: 880, glide: 0.06 }); },
    log: function (t) { tone(330, t, 0.12, { type: 'triangle', vol: 0.3, f2: 220 }); noise(t, 0.05, { type: 'lowpass', f: 1400, vol: 0.12, a: 0.002 }); },
    pad: function (t) { tone(420, t, 0.1, { vol: 0.24, f2: 700, glide: 0.05 }); noise(t, 0.1, { type: 'bandpass', f: 1400, q: 1.5, vol: 0.1, a: 0.004 }); },
    slide: function (t) { noise(t, 0.22, { type: 'highpass', f: 3200, f2: 5200, vol: 0.12, a: 0.03 }); },
    splash: function (t) { noise(t, 0.55, { type: 'lowpass', f: 3200, f2: 420, vol: 0.5, a: 0.004 }); tone(760, t, 0.18, { vol: 0.18, f2: 260 }); },
    squash: function (t) { tone(380, t, 0.17, { type: 'triangle', vol: 0.42, f2: 120 }); noise(t, 0.18, { type: 'lowpass', f: 1800, f2: 300, vol: 0.4, a: 0.002 }); },
    thunder: function (t) {
      noise(t, 0.08, { type: 'highpass', f: 2200, vol: 0.4, a: 0.001 });
      noise(t + 0.03, 1.9, { type: 'lowpass', f: 520, f2: 70, vol: 0.6, a: 0.02 });
      noise(t + 0.05, 1.5, { type: 'bandpass', f: 420, f2: 160, q: 0.7, vol: 0.45, a: 0.05 });
    },
    bell: function (t) { bell(N.A6, t, 0.22, 0.1); bell(N.A6, t + 0.3, 0.22, 0.1); bell(N.A6, t + 0.6, 0.22, 0.1); },
    train: function (t) { noise(t, 1.4, { type: 'bandpass', f: 320, f2: 1000, q: 0.6, vol: 0.42, a: 0.25 }); },
    gust: function (t) { noise(t, 1.2, { type: 'bandpass', f: 420, f2: 1600, q: 0.9, vol: 0.32, a: 0.4 }); },
    creak: function (t) { tone(300, t, 0.6, { type: 'sawtooth', vol: 0.12, f2: 390 }); tone(250, t + 0.28, 0.45, { type: 'sawtooth', vol: 0.1, f2: 200 }); },
    crash: function (t) { noise(t, 0.7, { type: 'lowpass', f: 2000, f2: 180, vol: 0.6, a: 0.002 }); tone(160, t, 0.5, { type: 'triangle', vol: 0.3, f2: 60 }); },
    door: function (t) { bell(N.D6, t, 0.6, 0.09); bell(N.A6, t + 0.12, 0.8, 0.08); },
    stage: function (t) { bell(N.G5, t, 0.8, 0.1); bell(N.D6, t + 0.1, 0.9, 0.1); bell(N.G6, t + 0.2, 1.1, 0.09); sparkle(t + 0.25, 6); },
    day: function (t) { [N.C6, N.E6, N.G6, N.C7].forEach(function (f, i) { bell(f, t + i * 0.12, 1.1, 0.11); }); tone(N.C5, t + 0.48, 1.2, { type: 'triangle', vol: 0.08, a: 0.05 }); sparkle(t + 0.5, 12); },
    best: function (t) { [N.E6, N.G6, N.C7].forEach(function (f, i) { bell(f, t + i * 0.1, 1.0, 0.11); }); sparkle(t + 0.3, 10); }
  };
  /* the same sound again within 40 ms is skipped, so quick repeats don't pile up. Until the phone lets sounds play
     (after the first tap), a sound is dropped rather than saved up, so they don't all play at once later */
  function play(name) {
    if (!on || !SOUNDS[name] || !init()) return;
    if (ctx.state !== 'running') { resume(); return; }
    var nowMs = Date.now();
    if (last[name] && nowMs - last[name] < 40) return;
    last[name] = nowMs;
    try { SOUNDS[name](ctx.currentTime + 0.01); } catch (e) {}
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { root.addEventListener(ev, unlock, { passive: true }); });
  WC.sfx = { play: play, unlock: unlock, setOn: function (v) { on = !!v; }, isOn: function () { return on; }, names: Object.keys(SOUNDS) };
})(typeof window !== 'undefined' ? window : globalThis);
