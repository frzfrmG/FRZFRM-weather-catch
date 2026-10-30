/* FRZFRM Weather Catch: the animals, and the five homes each one can turn up in.
   Every animal is drawn facing right with its feet at (0, 0), in units of about 1% of the jar's width; up is minus.
   The homes are built from the room parts in zoo.js. WC.zoo.paint draws one animal at home inside a jar. */
(function (root) {
  'use strict';
  var WC = root.WC = root.WC || {};
  var K = WC.kit, Z = WC.zooParts;
  if (!K || !Z) return;
  var TAU = Math.PI * 2;
  var circ = K.circ, ell = K.ell, tri = K.tri, poly = K.poly, rr = K.rr, shade = K.shade;

  /* lines in the animal's own units: no rounding up to a whole pixel, so they stay fine on a big card */
  function ln(ctx, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
  function sg(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function fill(ctx, col) { ctx.fillStyle = col; ctx.fill(); }
  function eye(ctx, x, y, r, col) {
    ctx.fillStyle = col || '#17141C'; circ(ctx, x, y, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; circ(ctx, x + r * 0.3, y - r * 0.35, r * 0.36); ctx.fill();
  }
  function floorShadow(ctx, rx) { ctx.fillStyle = 'rgba(25,18,30,0.2)'; ell(ctx, 0, 0, rx, Math.max(1, rx * 0.16)); ctx.fill(); }
  function rnd(seed) { var s = seed >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  var A = {};

  /* ---------- the garden ---------- */

  A.ladybird = { w: 30, s: 1.4, draw: function (ctx, t) {
    floorShadow(ctx, 14);
    ln(ctx, '#1A1418', 0.9);
    [[-8, -2.6, -10, 0], [-2, -2.4, -2.6, 0], [4, -2.6, 5.6, 0]].forEach(function (l) { sg(ctx, l[0], l[1], l[2], l[3]); });
    // the head, and the black and white plate behind it
    ctx.fillStyle = '#1A1418';
    circ(ctx, 12.2, -4.2, 3.1); ctx.fill();
    ell(ctx, 8.6, -5.8, 4.6, 4.4); ctx.fill();
    ctx.fillStyle = '#F4F1EA';
    ell(ctx, 10.4, -7.8, 1.5, 1.05, -0.4); ctx.fill();
    ell(ctx, 12.4, -3.6, 0.8, 0.6); ctx.fill();
    ln(ctx, '#1A1418', 0.55);
    ctx.beginPath(); ctx.moveTo(13.6, -6.4); ctx.quadraticCurveTo(15.2, -8.4, 16.6, -8.8); ctx.stroke();
    // the wing cases: a red dome
    var g = ctx.createRadialGradient(-6, -13, 1, -2, -8, 15);
    g.addColorStop(0, '#FF6E55'); g.addColorStop(0.55, '#E2261F'); g.addColorStop(1, '#A8141A');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-13.5, -2.2); ctx.bezierCurveTo(-14.6, -12, -6, -17.6, 1, -16.7); ctx.bezierCurveTo(7, -15.9, 10.2, -10, 9.7, -3.4); ctx.quadraticCurveTo(-2, -0.4, -13.5, -2.2); ctx.fill();
    ln(ctx, 'rgba(40,6,10,0.7)', 0.6);
    ctx.beginPath(); ctx.moveTo(8.8, -10.6); ctx.bezierCurveTo(3, -15.9, -6, -16.1, -12.4, -6.5); ctx.stroke();
    // seven spots: one shared at the front, three on this side and one peeping over from the far side
    ctx.fillStyle = '#1A1418';
    [[5.4, -12.8, 2.2], [0.6, -8.2, 2.5], [-6.4, -11.4, 2.1], [-8.9, -5.4, 1.9], [-5.2, -15.2, 1.05]].forEach(function (p) { circ(ctx, p[0], p[1], p[2]); ctx.fill(); });
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; ell(ctx, -5, -13.6, 3.6, 1.4, -0.35); ctx.fill();
  } };

  A.bee = { w: 28, s: 1.45, fly: 1, draw: function (ctx, t) {
    var bob = Math.sin(t * 2.2) * 1.2;
    ctx.fillStyle = 'rgba(25,18,30,0.13)'; ell(ctx, 0, 0, 8, 1.4); ctx.fill();
    ctx.save(); ctx.translate(0, -16 + bob);
    // the far wing, behind
    var flap = Math.sin(t * 31) * 0.18;
    ctx.save(); ctx.translate(2, -5.6); ctx.rotate(-0.55 + flap);
    ctx.fillStyle = 'rgba(225,235,250,0.45)'; ell(ctx, -4.6, 0, 5.2, 2.2); ctx.fill();
    ctx.restore();
    ln(ctx, '#1E1A18', 0.8);
    sg(ctx, -3, 4.6, -4.4, 8); sg(ctx, 0, 5.4, 0.2, 8.6); sg(ctx, 3.4, 4.8, 4.4, 7.8);
    ctx.fillStyle = '#F2A33A'; ell(ctx, -4.4, 7.4, 1.3, 1); ctx.fill();
    // a plump furry body in bands: white tail, black, yellow, black, a yellow collar and a black head
    ctx.save();
    ell(ctx, -1, 0, 10.2, 7.4); ctx.clip();
    var bands = [[-12, -6.6, '#F4F0E4'], [-6.6, -3.2, '#1E1A18'], [-3.2, 0.4, '#F2C42E'], [0.4, 4.2, '#1E1A18'], [4.2, 7.4, '#F2C42E'], [7.4, 10, '#1E1A18']];
    bands.forEach(function (b) { ctx.fillStyle = b[2]; ctx.fillRect(b[0], -8, b[1] - b[0], 16); });
    var sh = ctx.createLinearGradient(0, -7.4, 0, 7.4);
    sh.addColorStop(0, 'rgba(255,255,255,0.22)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = sh; ctx.fillRect(-12, -8, 22, 16);
    ctx.restore();
    // fuzz round the edge
    ln(ctx, 'rgba(40,32,24,0.35)', 0.35);
    for (var i = 0; i < 26; i++) { var a = i / 26 * TAU; sg(ctx, -1 + Math.cos(a) * 10, Math.sin(a) * 7.3, -1 + Math.cos(a) * 10.9, Math.sin(a) * 8); }
    ctx.fillStyle = '#1E1A18'; circ(ctx, 9.6, 0.2, 3.9); ctx.fill();
    ctx.fillStyle = '#3A2E26'; ell(ctx, 10.8, -0.8, 1.4, 1.9, 0.3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; circ(ctx, 11.1, -1.6, 0.4); ctx.fill();
    ln(ctx, '#1E1A18', 0.5);
    ctx.beginPath(); ctx.moveTo(11, -3); ctx.lineTo(12.6, -6.4); ctx.lineTo(14.6, -7); ctx.stroke();
    // the near wing, in front
    ctx.save(); ctx.translate(1.4, -6); ctx.rotate(-0.25 - flap);
    ctx.fillStyle = 'rgba(235,242,255,0.55)'; ell(ctx, -5.2, 0, 6, 2.6); ctx.fill();
    ln(ctx, 'rgba(255,255,255,0.8)', 0.3); ell(ctx, -5.2, 0, 6, 2.6); ctx.stroke();
    ctx.restore();
    ctx.restore();
  } };

  /* a peacock butterfly, wings open, seen from the front. Its wings open and close slowly */
  A.butterfly = { w: 34, s: 1.35, fly: 1, sym: 1, draw: function (ctx, t) {
    var bob = Math.sin(t * 1.6) * 1.4, open = 0.62 + 0.38 * Math.abs(Math.cos(t * 1.2));
    ctx.fillStyle = 'rgba(25,18,30,0.12)'; ell(ctx, 0, 0, 9 * open, 1.3); ctx.fill();
    ctx.save(); ctx.translate(0, -20 + bob);
    [1, -1].forEach(function (s) {
      ctx.save(); ctx.scale(s * open, 1);
      // hindwing
      ctx.beginPath(); ctx.moveTo(0.6, 0.2); ctx.bezierCurveTo(2, 7, 6, 11.4, 10.4, 10.2); ctx.bezierCurveTo(14, 9, 14.2, 3, 11.6, -0.6); ctx.closePath();
      var hg = ctx.createLinearGradient(0, 0, 13, 6); hg.addColorStop(0, '#4A1A1C'); hg.addColorStop(0.35, '#8E2428'); hg.addColorStop(1, '#7A1C22');
      fill(ctx, hg);
      ln(ctx, '#3A2420', 0.5); ctx.stroke();
      ctx.fillStyle = '#1E1418'; ell(ctx, 8.6, 5, 3.3, 2.7, 0.3); ctx.fill();
      ctx.fillStyle = '#6AA8E8'; [[7.6, 4.2], [9.4, 4.4], [8.4, 6], [10, 5.8]].forEach(function (p) { circ(ctx, p[0], p[1], 0.55); ctx.fill(); });
      // forewing
      ctx.beginPath(); ctx.moveTo(0.6, -0.6); ctx.bezierCurveTo(3, -7, 8, -13.6, 15.4, -14.2); ctx.bezierCurveTo(17.6, -12, 17, -6, 12.6, -1.6); ctx.closePath();
      var fg = ctx.createLinearGradient(0, 0, 15, -12); fg.addColorStop(0, '#5A1A1E'); fg.addColorStop(0.3, '#A8282C'); fg.addColorStop(1, '#B83A2E');
      fill(ctx, fg);
      ln(ctx, '#3A2420', 0.55); ctx.stroke();
      // the eyespot near the wingtip: yellow, then black, with blue and a white dot
      ctx.fillStyle = '#E8D8A8'; ell(ctx, 10.6, -12.2, 2.4, 1.2, -0.4); ctx.fill();
      ctx.fillStyle = '#F2D06A'; circ(ctx, 12.6, -9.4, 3.1); ctx.fill();
      ctx.fillStyle = '#2A1A1E'; circ(ctx, 12.6, -9.4, 2.3); ctx.fill();
      ctx.fillStyle = '#5FA0E2'; ctx.beginPath(); ctx.arc(12.6, -9.4, 2.1, Math.PI * 0.2, Math.PI * 1.1); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; circ(ctx, 13.4, -10.2, 0.45); ctx.fill();
      ctx.restore();
    });
    // the body and feelers
    ctx.fillStyle = '#2E221E'; ell(ctx, 0, 1, 1.1, 6.2); ctx.fill();
    circ(ctx, 0, -5.8, 1.4); ctx.fill();
    ln(ctx, '#2E221E', 0.35);
    [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.moveTo(s * 0.5, -6.8); ctx.quadraticCurveTo(s * 1.6, -10, s * 3.2, -12); ctx.stroke(); circ(ctx, s * 3.3, -12.2, 0.45); ctx.fill(); });
    ctx.restore();
  } };

  /* a small garden bird: o has its colours */
  function songbird(ctx, o) {
    floorShadow(ctx, 7);
    ln(ctx, o.legs, 0.8);
    sg(ctx, -1, -5.4, -1.6, 0); sg(ctx, 2, -5.4, 2.6, 0);
    ln(ctx, o.legs, 0.5);
    sg(ctx, -1.6, 0, 0.2, 0); sg(ctx, 2.6, 0, 4.4, 0);
    // the tail, cocked up
    ctx.fillStyle = o.tail;
    poly(ctx, [-5.6, -11.6, -14.4, -15.4, -15, -13, -6.4, -8.2]); ctx.fill();
    ctx.fillStyle = o.back; ell(ctx, 0, -11, o.bw || 8.4, o.bh || 7.2, -0.15); ctx.fill();
    ctx.fillStyle = o.belly; ell(ctx, 1.8, -7.8, 5.8, 4, -0.1); ctx.fill();
    if (o.breast) { ctx.fillStyle = o.breast; ell(ctx, 4.6, -11.4, 5.2, 5.2, 0.2); ctx.fill(); }
    ctx.fillStyle = o.cap || o.back; circ(ctx, 5.6, -18, 5); ctx.fill();
  }

  A.robin = { w: 26, s: 1.45, draw: function (ctx, t) {
    songbird(ctx, { legs: '#8A6A58', tail: '#7A5E40', back: '#8A6E4B', belly: '#F1E9DC' });
    // a soft grey edge, then the orange-red face and breast
    ctx.fillStyle = '#A9B2BA'; ell(ctx, 6, -13.2, 6.3, 6.3, 0.25); ctx.fill();
    ctx.fillStyle = '#E2612A'; ell(ctx, 6.6, -13.4, 5.4, 5.8, 0.25); ctx.fill();
    ell(ctx, 8.4, -17.2, 3.4, 3.4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ell(ctx, 7.6, -15.6, 2.4, 1.2, -0.3); ctx.fill();
    // the wing over the side
    ctx.fillStyle = '#7A5E40'; ell(ctx, -2.2, -12, 6, 3.8, 0.25); ctx.fill();
    ln(ctx, '#A08A68', 0.4);
    sg(ctx, -5.6, -13, -1, -11.2); sg(ctx, -6, -11.2, -1.6, -9.6);
    eye(ctx, 7.8, -19.4, 1.1);
    ctx.fillStyle = '#2A2220'; tri(ctx, 10.4, -19, 14, -17.8, 10.4, -17); ctx.fill();
  } };

  A.bluetit = { w: 24, s: 1.5, draw: function (ctx, t) {
    songbird(ctx, { legs: '#6E7A8A', tail: '#3A6EC8', back: '#93AB4E', belly: '#F2D23A', breast: '#F2D23A', cap: '#F7F7F2', bw: 7.6, bh: 6.6 });
    // a blue cap, a black stripe through the eye, a dark collar and a little black bib
    ctx.fillStyle = '#2F7FD8'; ctx.beginPath(); ctx.arc(5.6, -18.4, 5.1, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
    ln(ctx, '#1E2A4A', 1.1);
    sg(ctx, 9.4, -17.2, 1.4, -16.6);
    ctx.beginPath(); ctx.moveTo(1, -16); ctx.quadraticCurveTo(2.6, -12.6, 7.6, -12.8); ctx.stroke();
    ctx.fillStyle = '#1E2A4A'; tri(ctx, 7.4, -14.6, 10.6, -14.8, 8.4, -12.2); ctx.fill();
    ctx.fillStyle = '#4A7ED0'; ell(ctx, -2, -11.6, 5.8, 3.4, 0.25); ctx.fill();
    ln(ctx, '#F4F6F8', 0.6); sg(ctx, -5.4, -11.6, -0.6, -10.2);
    eye(ctx, 7.6, -17.4, 0.95);
    ctx.fillStyle = '#2A2630'; tri(ctx, 10.2, -17.2, 12.6, -16.4, 10.2, -15.6); ctx.fill();
  } };

  A.squirrel = { w: 30, s: 1.25, draw: function (ctx, t) {
    floorShadow(ctx, 10);
    // a big bushy tail curled up the back
    var sway = Math.sin(t * 1.3) * 0.6;
    ctx.save(); ctx.translate(-5, -3); ctx.rotate(sway * 0.03);
    var tail = function () { ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-12, -1, -14, -19, -6, -27); ctx.quadraticCurveTo(-1, -31, 1.4, -27.4); };
    ln(ctx, 'rgba(236,230,222,0.7)', 10.6); tail(); ctx.stroke();
    ln(ctx, '#A8A29A', 8.6); tail(); ctx.stroke();
    ln(ctx, '#BDB6AC', 4.6); tail(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#8A847E'; ell(ctx, -1.6, -6.4, 7, 6.2); ctx.fill();
    ctx.fillStyle = 'rgba(160,130,100,0.5)'; ell(ctx, -2.6, -8, 5, 3.6); ctx.fill();
    ctx.fillStyle = '#7A746E'; ell(ctx, 2.4, -1, 4.6, 1.4); ctx.fill();
    ctx.fillStyle = '#8E8882'; ell(ctx, 1.6, -14, 5.2, 8.4, 0.18); ctx.fill();
    ctx.fillStyle = '#EDE6DC'; ell(ctx, 3.6, -13, 2.8, 6.6, 0.18); ctx.fill();
    // the head
    ctx.fillStyle = '#8E8882'; circ(ctx, 4.6, -23.6, 4.6); ctx.fill();
    ell(ctx, 8.4, -22.4, 3.2, 2.5, 0.1); ctx.fill();
    ctx.fillStyle = '#E8E0D4'; ell(ctx, 6.6, -21.2, 2.6, 1.6, 0.2); ctx.fill();
    ctx.fillStyle = '#7A746E'; ell(ctx, 2.6, -28, 1.4, 2.4, -0.2); ctx.fill();
    ctx.fillStyle = '#C8A898'; ell(ctx, 2.7, -27.8, 0.6, 1.3, -0.2); ctx.fill();
    ctx.fillStyle = '#F2EEE6'; circ(ctx, 6.4, -24.6, 1.6); ctx.fill();
    eye(ctx, 6.4, -24.6, 1.15);
    ctx.fillStyle = '#3A3036'; circ(ctx, 11.4, -22.6, 0.6); ctx.fill();
    // holding a nut
    ctx.fillStyle = '#B8863A'; ell(ctx, 8.8, -16.6, 1.8, 2.1); ctx.fill();
    ctx.fillStyle = '#6E4528'; ell(ctx, 8.8, -18.4, 2, 0.9); ctx.fill();
    ln(ctx, '#8E8882', 1.4); sg(ctx, 4.6, -17.4, 7.8, -16.6);
  } };

  A.hedgehog = { w: 30, s: 1.5, draw: function (ctx, t) {
    floorShadow(ctx, 13);
    ctx.fillStyle = '#4A3628'; ell(ctx, -6, -0.6, 1.6, 0.8); ctx.fill(); ell(ctx, 6, -0.6, 1.6, 0.8); ctx.fill();
    ctx.fillStyle = '#B8946A'; ell(ctx, 0.5, -4, 11.4, 4.4); ctx.fill();
    // a dome of spines: dark brown with pale tips
    var cx = -1.6, cy = -5.4, rx = 12, ry = 8.4;
    ctx.fillStyle = '#5E4430'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI * 0.96, Math.PI * 2.06); ctx.closePath(); ctx.fill();
    var r = rnd(77);
    for (var i = 0; i < 90; i++) {
      var a = Math.PI * (0.96 + 1.1 * r()), k0 = 0.35 + r() * 0.5, k1 = 1.02 + r() * 0.16, tw = (r() - 0.5) * 0.3;
      var x0 = cx + Math.cos(a) * rx * k0, y0 = cy + Math.sin(a) * ry * k0, x1 = cx + Math.cos(a + tw) * rx * k1, y1 = cy + Math.sin(a + tw) * ry * k1;
      if (y1 > -1) continue;
      ln(ctx, i % 3 ? '#4A3424' : '#7A5A40', 0.55); sg(ctx, x0, y0, x1, y1);
      ln(ctx, '#E2CCA8', 0.45); sg(ctx, x0 + (x1 - x0) * 0.8, y0 + (y1 - y0) * 0.8, x1, y1);
    }
    // the face: a pointed snout with a black nose
    ctx.fillStyle = '#C9A27A';
    ctx.beginPath(); ctx.moveTo(6, -10); ctx.quadraticCurveTo(12, -8, 15.4, -4.6); ctx.quadraticCurveTo(12, -1.8, 6.4, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#A88660'; circ(ctx, 7.4, -9.2, 1.3); ctx.fill();
    ctx.fillStyle = '#1E1618'; circ(ctx, 15.4, -4.6, 1.2); ctx.fill();
    eye(ctx, 10, -6.8, 0.95);
  } };

  /* ---------- beach and coast ---------- */

  A.seagull = { w: 34, s: 1.2, draw: function (ctx, t) {
    floorShadow(ctx, 11);
    ln(ctx, '#E8A8A0', 1.1);
    sg(ctx, -1, -7, -2, 0); sg(ctx, 2.6, -7, 3, 0);
    ctx.fillStyle = '#E8A8A0'; tri(ctx, -2, 0, -4.6, 0.4, 0.4, 0.4); ctx.fill(); tri(ctx, 3, 0, 0.6, 0.4, 5.6, 0.4); ctx.fill();
    ctx.fillStyle = '#F4F6F8'; ell(ctx, -0.5, -12.4, 11.2, 6.6, -0.12); ctx.fill();
    ctx.fillStyle = 'rgba(150,160,175,0.25)'; ell(ctx, 0, -8.6, 9, 2.6, -0.12); ctx.fill();
    // a grey back and wings with black tips, spotted white
    ctx.fillStyle = '#A3AFBB';
    ctx.beginPath(); ctx.moveTo(7, -16.4); ctx.quadraticCurveTo(-4, -20.4, -13, -14); ctx.lineTo(-11, -10.6); ctx.quadraticCurveTo(-2, -10, 6.4, -12.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#22262E'; poly(ctx, [-11, -15.2, -19, -12.6, -17.6, -10.8, -10.4, -10.8]); ctx.fill();
    ctx.fillStyle = '#F4F6F8'; circ(ctx, -16.2, -12, 0.6); ctx.fill(); circ(ctx, -13.8, -12.4, 0.5); ctx.fill();
    ln(ctx, 'rgba(255,255,255,0.6)', 0.4); sg(ctx, -8, -12.8, 3, -13.6);
    ctx.fillStyle = '#F4F6F8'; ell(ctx, 6.4, -17.4, 4, 5, 0.3); ctx.fill(); circ(ctx, 9, -22.6, 4.6); ctx.fill();
    // a yellow beak with a red spot, and a stern pale eye
    ctx.fillStyle = '#F2C230';
    ctx.beginPath(); ctx.moveTo(12.4, -23.6); ctx.lineTo(17.6, -22.8); ctx.quadraticCurveTo(18.8, -22.2, 17.8, -21); ctx.lineTo(12.6, -20.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E2402A'; circ(ctx, 16.4, -21.2, 0.75); ctx.fill();
    ctx.fillStyle = '#F2E28A'; circ(ctx, 10.4, -23.8, 1); ctx.fill();
    ctx.fillStyle = '#17141C'; circ(ctx, 10.6, -23.8, 0.5); ctx.fill();
    ln(ctx, 'rgba(90,100,115,0.7)', 0.4); sg(ctx, 9, -25.4, 11.8, -24.8);
  } };

  /* a crab, from the front, with its claws up */
  A.crab = { w: 34, s: 1.3, sym: 1, draw: function (ctx, t) {
    floorShadow(ctx, 14);
    var snap = Math.max(0, Math.sin(t * 1.7)) * 0.35;
    [1, -1].forEach(function (s) {
      ctx.save(); ctx.scale(s, 1);
      ln(ctx, '#B8481E', 1.3);
      for (var i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(8 + i * 0.8, -8 + i * 1.3); ctx.lineTo(13 + i * 0.6, -10.6 + i * 1.6); ctx.lineTo(15.6 - i * 0.6, 0); ctx.stroke();
      }
      // arm and claw
      ln(ctx, '#D9562B', 2);
      ctx.beginPath(); ctx.moveTo(7, -11); ctx.lineTo(11.6, -14.6); ctx.lineTo(12.8, -18); ctx.stroke();
      ctx.save(); ctx.translate(13.2, -20.2);
      ctx.fillStyle = '#D9562B'; ell(ctx, 0, 0, 3.4, 3.8, -0.2); ctx.fill();
      ctx.save(); ctx.rotate(-snap);
      ctx.fillStyle = '#C24A22'; poly(ctx, [-2.4, -2.4, -1.6, -7, 0.4, -6.2, 0.6, -2.6]); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#C24A22'; poly(ctx, [0.6, -2.6, 2.4, -6.6, 3.8, -5.4, 2.8, -1.6]); ctx.fill();
      ctx.fillStyle = '#3A1E14'; circ(ctx, -1.5, -6.8, 0.6); ctx.fill(); circ(ctx, 3, -6, 0.6); ctx.fill();
      ctx.restore();
      ctx.restore();
    });
    // the shell, with a crinkled front edge
    var g = ctx.createRadialGradient(-3, -12, 1, 0, -9, 12);
    g.addColorStop(0, '#F07A44'); g.addColorStop(1, '#B8441E');
    ctx.fillStyle = g;
    ell(ctx, 0, -8.8, 11.6, 6.6); ctx.fill();
    ctx.fillStyle = '#C9502A';
    for (var j = 0; j < 9; j++) { var a = Math.PI * (1.08 + j * 0.105); circ(ctx, Math.cos(a) * 11.2, -8.8 + Math.sin(a) * 6.3, 1.1); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ell(ctx, -3, -12, 4, 1.6, -0.2); ctx.fill();
    // eyes on stalks
    ln(ctx, '#B8441E', 1);
    sg(ctx, -2.6, -14, -3, -17.2); sg(ctx, 2.6, -14, 3, -17.2);
    eye(ctx, -3, -17.8, 1.1); eye(ctx, 3, -17.8, 1.1);
  } };

  /* a starfish standing on two of its arms */
  A.starfish = { w: 30, s: 1.3, sym: 1, draw: function (ctx, t) {
    floorShadow(ctx, 9);
    ctx.save();
    ctx.translate(0, -11.6); ctx.rotate(Math.sin(t * 0.8) * 0.05);
    var R1 = 12.6, R0 = 5.2;
    ctx.beginPath();
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + i * TAU / 5, b = a + TAU / 10, c = a - TAU / 10;
      var tipx = Math.cos(a) * R1, tipy = Math.sin(a) * R1;
      if (i === 0) ctx.moveTo(Math.cos(c) * R0, Math.sin(c) * R0);
      ctx.quadraticCurveTo(Math.cos(a - 0.12) * R1 * 0.7, Math.sin(a - 0.12) * R1 * 0.7, tipx + Math.cos(a - Math.PI / 2) * 1.4, tipy + Math.sin(a - Math.PI / 2) * 1.4);
      ctx.quadraticCurveTo(tipx + Math.cos(a) * 1.6, tipy + Math.sin(a) * 1.6, tipx + Math.cos(a + Math.PI / 2) * 1.4, tipy + Math.sin(a + Math.PI / 2) * 1.4);
      ctx.quadraticCurveTo(Math.cos(a + 0.12) * R1 * 0.7, Math.sin(a + 0.12) * R1 * 0.7, Math.cos(b) * R0, Math.sin(b) * R0);
    }
    ctx.closePath();
    var g = ctx.createRadialGradient(-1.6, -1.6, 0.5, 0, 0, R1);
    g.addColorStop(0, '#FFB868'); g.addColorStop(0.5, '#F48A3A'); g.addColorStop(1, '#D8602A');
    ctx.fillStyle = g; ctx.fill();
    ln(ctx, 'rgba(150,60,20,0.35)', 0.5); ctx.stroke();
    // little bumps along each arm
    for (var j = 0; j < 5; j++) {
      var aa = -Math.PI / 2 + j * TAU / 5;
      for (var k = 1; k <= 3; k++) {
        ctx.fillStyle = k % 2 ? '#FFE0B8' : '#FFC890';
        circ(ctx, Math.cos(aa) * (2.6 + k * 2.6), Math.sin(aa) * (2.6 + k * 2.6), 0.85 - k * 0.12); ctx.fill();
      }
    }
    ctx.fillStyle = '#FFD8A8'; circ(ctx, 0, 0, 1.4); ctx.fill();
    ctx.restore();
  } };

  /* a moon jellyfish, drifting and pulsing */
  A.jellyfish = { w: 28, s: 1.25, fly: 1, sym: 1, draw: function (ctx, t) {
    var p = Math.sin(t * 2.4), y0 = -25 + Math.sin(t * 0.9) * 1.6;
    ctx.fillStyle = 'rgba(25,18,30,0.1)'; ell(ctx, 0, 0, 8, 1.2); ctx.fill();
    K.glow(ctx, 0, y0 - 2, 17, [210, 190, 255], 0.28);
    // fine tentacles round the edge
    ln(ctx, 'rgba(235,225,255,0.55)', 0.3);
    for (var i = 0; i < 15; i++) {
      var x = -11 + i * 22 / 14;
      ctx.beginPath(); ctx.moveTo(x, y0);
      ctx.quadraticCurveTo(x + Math.sin(t * 2 + i) * 1.4, y0 + 5, x + Math.sin(t * 1.6 + i * 0.7) * 1.8, y0 + 9 + (i % 3));
      ctx.stroke();
    }
    // four frilly mouth arms
    for (var j = 0; j < 4; j++) {
      var mx = (j - 1.5) * 2.2;
      ln(ctx, 'rgba(225,195,250,0.7)', 1.4);
      ctx.beginPath(); ctx.moveTo(mx, y0 - 0.5);
      for (var s = 1; s <= 6; s++) ctx.lineTo(mx + Math.sin(t * 1.8 + s * 0.9 + j) * 1.2 * (s / 6 + 0.3), y0 + s * 2.4);
      ctx.stroke();
    }
    // the bell
    var bw = 12 * (1 - 0.04 * p), bh = 8.4 * (1 + 0.07 * p);
    ctx.beginPath(); ctx.moveTo(-bw, y0);
    ctx.bezierCurveTo(-bw, y0 - bh * 1.3, bw, y0 - bh * 1.3, bw, y0);
    for (var m = 0; m < 8; m++) { var x0 = bw - m * bw / 4; ctx.quadraticCurveTo(x0 - bw / 8, y0 + 1.6, x0 - bw / 4, y0); }
    ctx.closePath();
    var g = ctx.createRadialGradient(-2, y0 - bh, 1, 0, y0 - 2, bw * 1.2);
    g.addColorStop(0, 'rgba(250,245,255,0.85)'); g.addColorStop(1, 'rgba(200,180,245,0.42)');
    ctx.fillStyle = g; ctx.fill();
    ln(ctx, 'rgba(255,255,255,0.6)', 0.4); ctx.stroke();
    // four pale purple rings seen through the top
    ln(ctx, 'rgba(170,110,220,0.75)', 0.9);
    [[-6.4, -3], [-2.2, -4.8], [2.2, -4.8], [6.4, -3]].forEach(function (q) { ell(ctx, q[0], y0 + q[1], 2.1, 1.5); ctx.stroke(); });
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ell(ctx, -5, y0 - bh * 0.78, 3, 1, -0.3); ctx.fill();
  } };

  /* a grey seal on its belly, propped up on its front flippers */
  A.seal = { w: 38, s: 1.2, draw: function (ctx, t) {
    floorShadow(ctx, 16);
    var nod = Math.sin(t * 0.9) * 0.4;
    ctx.fillStyle = '#5E6870';
    poly(ctx, [-16, -2.6, -21.6, -6.2, -20.4, -0.4]); ctx.fill();
    poly(ctx, [-16, -1.8, -21, 1, -17, 0.6]); ctx.fill();
    ctx.fillStyle = '#7D8790';
    ctx.beginPath(); ctx.moveTo(-17, -1.6); ctx.bezierCurveTo(-12, -9.4, -2, -12.2, 6, -12.4); ctx.quadraticCurveTo(10, -12.6, 10.6, -8); ctx.quadraticCurveTo(10, -2, 4, -0.4); ctx.lineTo(-12, -0.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#AEB6BD'; ell(ctx, -1, -1.8, 11, 2.2); ctx.fill();
    // dappled markings
    var r = rnd(19);
    ctx.fillStyle = 'rgba(70,80,90,0.55)';
    for (var i = 0; i < 9; i++) { ell(ctx, -13 + r() * 20, -9 + r() * 6, 0.9 + r() * 1.2, 0.6 + r() * 0.8, r() * 3); ctx.fill(); }
    ctx.fillStyle = '#5E6870'; ell(ctx, 6.4, -1.8, 3.6, 1.4, 0.3); ctx.fill();
    // the head
    ctx.save(); ctx.translate(9, -13); ctx.rotate(nod * 0.08);
    ctx.fillStyle = '#7D8790'; ell(ctx, 1.6, -2.4, 5.6, 4.8); ctx.fill();
    ctx.fillStyle = '#8E98A0'; ell(ctx, 5.8, -1, 3.2, 2.5, 0.15); ctx.fill();
    eye(ctx, 3, -3.6, 1.55);
    ctx.fillStyle = '#2A2E34'; ell(ctx, 8.6, -1.4, 0.9, 0.6); ctx.fill();
    ln(ctx, 'rgba(240,240,240,0.7)', 0.22);
    sg(ctx, 7.6, -0.2, 11, -0.8); sg(ctx, 7.6, 0.2, 10.8, 0.8); sg(ctx, 7.4, 0.6, 10.2, 1.8);
    ctx.restore();
  } };

  A.puffin = { w: 22, s: 1.4, draw: function (ctx, t) {
    floorShadow(ctx, 7);
    ln(ctx, '#F2802A', 1.1); sg(ctx, -0.6, -4.6, -1, -0.6); sg(ctx, 2.6, -4.6, 3, -0.6);
    ctx.fillStyle = '#F2802A'; tri(ctx, -1, -0.8, -3.6, 0.3, 1.6, 0.3); ctx.fill(); tri(ctx, 3, -0.8, 0.6, 0.3, 5.6, 0.3); ctx.fill();
    ctx.fillStyle = '#1E1E26'; ell(ctx, 0, -13, 7.6, 10.4); ctx.fill();
    ctx.fillStyle = '#F4F4F6'; ell(ctx, 2.8, -11.6, 4.8, 8.6); ctx.fill();
    ctx.fillStyle = '#16161C'; ell(ctx, -2.6, -14, 4, 7, 0.15); ctx.fill();
    ctx.fillStyle = '#1E1E26'; circ(ctx, 2, -25.4, 5.6); ctx.fill();
    ctx.fillStyle = '#E4E6EA'; ell(ctx, 3.6, -24.8, 4.2, 3.8); ctx.fill();
    ctx.fillStyle = '#1E1E26'; ell(ctx, 2.6, -20.6, 4.6, 1.5); ctx.fill();
    // the eye, with its red ring and little grey marks
    ctx.fillStyle = '#7A808A'; tri(ctx, 4.4, -28, 5.2, -28, 4.8, -27.2); ctx.fill();
    ctx.fillStyle = '#D8402A'; circ(ctx, 4.8, -26.2, 1.05); ctx.fill();
    eye(ctx, 4.8, -26.2, 0.7);
    // the big striped beak: blue-grey at the base, then yellow, then orange-red
    ctx.save();
    ctx.beginPath(); ctx.moveTo(6.6, -28.8); ctx.quadraticCurveTo(11.6, -27.6, 13.8, -24.4); ctx.lineTo(6.6, -21.6); ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#E84A26'; ctx.fillRect(6, -30, 9, 9);
    ctx.fillStyle = '#F2C230'; poly(ctx, [8.6, -30, 9.8, -30, 9.6, -21, 8.4, -21]); ctx.fill();
    ctx.fillStyle = '#5E6E86'; ctx.fillRect(6, -30, 2.2, 9);
    ln(ctx, 'rgba(255,220,150,0.7)', 0.3); sg(ctx, 10.6, -28, 10.6, -22.6); sg(ctx, 11.8, -27, 11.8, -23);
    ctx.restore();
    ctx.fillStyle = '#F2C230'; circ(ctx, 6.8, -22.6, 0.8); ctx.fill();
  } };

  /* ---------- the countryside ---------- */

  /* a red fox sitting, its tail round its feet */
  A.fox = { w: 30, s: 1.15, draw: function (ctx, t) {
    floorShadow(ctx, 11);
    ctx.fillStyle = '#C95E28'; ell(ctx, -4, -7.4, 7.8, 7.4); ctx.fill();
    ctx.fillStyle = '#D9682B'; ell(ctx, 1, -15.4, 5.8, 10, 0.22); ctx.fill();
    ctx.fillStyle = '#F4EEE6'; ell(ctx, 4.2, -15.6, 3.2, 7.2, 0.22); ctx.fill();
    // front legs in black socks
    [[3.6, 4.2], [6.6, 7.2]].forEach(function (l) {
      ln(ctx, '#D9682B', 2.4); sg(ctx, l[0], -11, l[1] - 0.2, -5);
      ln(ctx, '#2A2220', 2.4); sg(ctx, l[1] - 0.2, -5.4, l[1], -0.8);
    });
    // the head: ears up, white cheeks, amber eyes
    ctx.fillStyle = '#2A2220'; tri(ctx, 1.2, -30.8, 2.6, -37.6, 5.4, -31.6); ctx.fill();
    ctx.fillStyle = '#D9682B'; circ(ctx, 5.2, -27.6, 5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(7.4, -30.6); ctx.quadraticCurveTo(11, -28.6, 14.2, -26.6); ctx.lineTo(13.4, -25.2); ctx.quadraticCurveTo(10, -24.2, 7, -24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F4EEE6';
    ctx.beginPath(); ctx.moveTo(5, -25.2); ctx.quadraticCurveTo(9.6, -26.6, 13.6, -25.6); ctx.quadraticCurveTo(10, -22, 6.4, -22.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#D9682B'; tri(ctx, 3.4, -31, 6.4, -38.4, 8.4, -30.4); ctx.fill();
    ctx.fillStyle = '#2A2220'; tri(ctx, 5.2, -35.2, 6.4, -38.4, 7.4, -35); ctx.fill();
    ctx.fillStyle = '#F2D8C0'; tri(ctx, 5, -31.2, 6.4, -35.6, 7.4, -31); ctx.fill();
    ctx.fillStyle = '#E8A22A'; ell(ctx, 8.4, -28.8, 1.05, 0.8, -0.3); ctx.fill();
    ctx.fillStyle = '#17141C'; ell(ctx, 8.5, -28.8, 0.35, 0.7); ctx.fill();
    ctx.fillStyle = '#1E1618'; circ(ctx, 14.2, -26.2, 0.85); ctx.fill();
    // the brush, round the front, white at the tip
    var curl = Math.sin(t * 1.1) * 0.5;
    ln(ctx, '#D9682B', 6.4);
    ctx.beginPath(); ctx.moveTo(-10, -3.6); ctx.quadraticCurveTo(-3, 1.6, 8.6 + curl, -0.8); ctx.stroke();
    ln(ctx, '#F4EEE6', 5.6); sg(ctx, 9 + curl, -0.9, 11 + curl, -1.6);
    ctx.fillStyle = '#F4EEE6'; circ(ctx, 11.2 + curl, -1.6, 2.6); ctx.fill();
  } };

  A.rabbit = { w: 28, s: 1.3, draw: function (ctx, t) {
    floorShadow(ctx, 11);
    var twitch = Math.sin(t * 9) > 0.7 ? 0.4 : 0;
    ctx.fillStyle = '#8A7258'; ell(ctx, -3, -1.3, 6.6, 1.6); ctx.fill();
    ctx.fillStyle = '#9C8366'; ell(ctx, -2, -8.6, 9.6, 8.2); ctx.fill();
    ctx.fillStyle = '#B8A284'; ell(ctx, 1.6, -5, 5, 4); ctx.fill();
    ctx.fillStyle = '#FBF8F2'; circ(ctx, -11.4, -9, 2.8); ctx.fill();
    // ears up, dark at the tips
    ctx.fillStyle = '#8A7258'; ell(ctx, 3, -26, 1.8, 7, -0.28); ctx.fill();
    ctx.fillStyle = '#9C8366'; ell(ctx, 5, -26.4, 2, 7.4, -0.14); ctx.fill();
    ctx.fillStyle = '#D8B8A4'; ell(ctx, 5.2, -26, 0.9, 5.6, -0.14); ctx.fill();
    ctx.fillStyle = '#4A3A2E'; ell(ctx, 3.9, -33, 1.4, 1, -0.14); ctx.fill();
    ctx.fillStyle = '#9C8366'; ell(ctx, 7, -16.6, 5.4, 4.8, 0.2); ctx.fill();
    ctx.fillStyle = '#B8A284'; ell(ctx, 9.4, -15, 3, 2.4, 0.2); ctx.fill();
    eye(ctx, 8.6, -18, 1.4, '#2A1E1A');
    ctx.fillStyle = '#C98A80'; ell(ctx, 12.2, -15.8 - twitch, 0.8, 0.6); ctx.fill();
    ln(ctx, 'rgba(240,235,225,0.75)', 0.2); sg(ctx, 11.6, -15, 14.6, -15.8); sg(ctx, 11.6, -14.6, 14.4, -14);
    ctx.fillStyle = '#8A7258'; ell(ctx, 6.8, -1.4, 1.6, 1.2); ctx.fill();
  } };

  /* a red deer stag */
  A.deer = { w: 38, s: 0.95, draw: function (ctx, t) {
    floorShadow(ctx, 13);
    var legs = function (col, a, b) {
      ln(ctx, col, 1.7);
      ctx.beginPath(); ctx.moveTo(a, -17); ctx.lineTo(a + 0.6, -8); ctx.lineTo(a + 0.4, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b, -17); ctx.lineTo(b - 1, -9); ctx.lineTo(b + 0.4, 0); ctx.stroke();
      ctx.fillStyle = '#2A2220'; ell(ctx, a + 0.6, -0.3, 1, 0.5); ctx.fill(); ell(ctx, b + 0.8, -0.3, 1, 0.5); ctx.fill();
    };
    legs('#7A4A2E', 8, -8.4);
    ctx.fillStyle = '#9A6440'; ell(ctx, 0, -21.4, 12.4, 6.6); ctx.fill();
    ctx.fillStyle = '#B88A62'; ell(ctx, 0.6, -17.4, 9, 2.4); ctx.fill();
    ctx.fillStyle = '#E8D8B8'; ell(ctx, -11.2, -21.6, 2.4, 3.4); ctx.fill();
    ctx.fillStyle = '#6E4228'; ell(ctx, -12.4, -23.8, 0.9, 1.6, 0.3); ctx.fill();
    legs('#9A6440', 5.6, -6);
    // a thick neck with a dark mane underneath
    ctx.fillStyle = '#8A5634';
    ctx.beginPath(); ctx.moveTo(4.4, -25); ctx.lineTo(10.6, -37.6); ctx.lineTo(15, -35.6); ctx.lineTo(11, -18.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6E4228'; poly(ctx, [11, -18.6, 13.6, -30, 15, -35.6, 12.8, -24]); ctx.fill();
    // the head
    ctx.fillStyle = '#9A6440'; ell(ctx, 14.6, -36.4, 4.8, 2.7, 0.38); ctx.fill();
    ctx.fillStyle = '#7A4A2E'; ell(ctx, 18.2, -34.2, 1.9, 1.5, 0.38); ctx.fill();
    ctx.fillStyle = '#1E1618'; ell(ctx, 19.4, -33.6, 0.8, 0.6); ctx.fill();
    ctx.fillStyle = '#8A5634'; ell(ctx, 11.2, -39.6, 1.2, 2.6, -0.7); ctx.fill();
    eye(ctx, 14.6, -37.6, 0.75);
    // antlers: the far one first, a shade darker
    [['#B8A07A', -1.4, 0.8], ['#D8C3A0', 0, 0]].forEach(function (an) {
      ctx.save(); ctx.translate(an[1], an[2]);
      ln(ctx, an[0], 1);
      ctx.beginPath(); ctx.moveTo(12.8, -38.6); ctx.bezierCurveTo(10.4, -44, 7, -48, 6.4, -53); ctx.stroke();
      ln(ctx, an[0], 0.75);
      sg(ctx, 12.2, -40.6, 16.2, -42.8); sg(ctx, 10.4, -44.6, 14.4, -47.6); sg(ctx, 7.6, -49.6, 10.4, -53.8); sg(ctx, 6.6, -51.6, 4.4, -55.6);
      ctx.restore();
    });
  } };

  /* a black and white dairy cow */
  A.cow = { w: 40, s: 1.05, draw: function (ctx, t) {
    floorShadow(ctx, 16);
    var chew = Math.sin(t * 4) * 0.3;
    var leg = function (x, col) { ln(ctx, col, 2.7); sg(ctx, x, -14, x + 0.2, -1.2); ctx.fillStyle = '#3A3236'; rr(ctx, x - 1.5, -1.6, 3.2, 1.6, 0.5); ctx.fill(); };
    leg(-10.6, '#D8D4CE'); leg(8.4, '#D8D4CE');
    ln(ctx, '#2A2628', 0.7);
    ctx.beginPath(); ctx.moveTo(-14.6, -25); ctx.quadraticCurveTo(-17, -20, -16.6, -13); ctx.stroke();
    ctx.fillStyle = '#2A2628'; ell(ctx, -16.6, -12.4, 0.9, 1.6); ctx.fill();
    ctx.fillStyle = '#F1B8B0'; ell(ctx, -3.6, -11.6, 3.2, 2); ctx.fill();
    // the body with black patches
    ctx.save();
    rr(ctx, -15, -28, 29, 16, 6.4); ctx.fillStyle = '#F6F4F0'; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#26222A';
    [[-7, -23, 5.6, 4.2, 0.3], [5.4, -25, 4.4, 3.6, -0.2], [-13.6, -16, 3.6, 4.2, 0], [7.4, -15.6, 3, 2.4, 0.4], [-1.4, -14.2, 2.4, 1.6, 0]].forEach(function (p) { ell(ctx, p[0], p[1], p[2], p[3], p[4]); ctx.fill(); });
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(-15, -15, 29, 4);
    ctx.restore();
    leg(-7.4, '#F6F4F0'); leg(11.4, '#F6F4F0');
    // the head: patched round the eyes and ears, with a pink nose
    ctx.fillStyle = '#F6F4F0'; poly(ctx, [10, -27, 15.6, -29.6, 18.6, -22, 12, -19]); ctx.fill();
    ctx.fillStyle = '#26222A'; ell(ctx, 13.6, -28, 2.8, 1.2, 0.2); ctx.fill();
    ctx.fillStyle = '#E8DCC2'; tri(ctx, 15, -30.4, 15.8, -33.4, 16.8, -30.2); ctx.fill();
    ctx.fillStyle = '#F6F4F0'; rr(ctx, 14.4, -31, 6, 10.6, 2.8); ctx.fill();
    ctx.fillStyle = '#26222A'; ell(ctx, 16.8, -28.4, 2.2, 2.6, 0.3); ctx.fill();
    ctx.fillStyle = '#F1B8B0'; ell(ctx, 18.4, -21.8 + chew, 3.2, 2.5); ctx.fill();
    ctx.fillStyle = '#B87A74'; circ(ctx, 17.4, -22, 0.5); ctx.fill(); circ(ctx, 19.6, -22, 0.5); ctx.fill();
    eye(ctx, 17.2, -27.6, 0.8);
  } };

  /* a woolly sheep with a black face */
  A.sheep = { w: 34, s: 1.2, draw: function (ctx, t) {
    floorShadow(ctx, 13);
    var leg = function (x, col) { ln(ctx, col, 1.8); sg(ctx, x, -9, x, -0.4); };
    leg(-8, '#3A3436'); leg(5.4, '#3A3436');
    // the fleece: puffs round a body
    ctx.fillStyle = '#E8E2D6'; ell(ctx, -1, -14, 12, 7.6); ctx.fill();
    var puffs = 14;
    for (var i = 0; i < puffs; i++) {
      var a = i / puffs * TAU;
      ctx.fillStyle = i % 2 ? '#F4F0E6' : '#EDE7DA';
      circ(ctx, -1 + Math.cos(a) * 11, -14 + Math.sin(a) * 6.8, 3.6); ctx.fill();
    }
    ctx.fillStyle = '#F8F5EE'; ell(ctx, -2, -17, 9, 4); ctx.fill();
    for (var j = 0; j < 5; j++) { ctx.fillStyle = '#FBF9F4'; circ(ctx, -8 + j * 3.6, -19.6 + (j % 2) * 1.2, 2.4); ctx.fill(); }
    leg(-4.4, '#2A2628'); leg(8.4, '#2A2628');
    // the black face, ears out to the sides
    ctx.fillStyle = '#2A2628'; ell(ctx, 9.6, -20.4, 3.2, 1.3, 0.35); ctx.fill();
    ell(ctx, 13.2, -17.4, 4.2, 5.6, 0.55); ctx.fill();
    ctx.fillStyle = '#FBF9F4'; circ(ctx, 10.8, -22.2, 3); ctx.fill();
    ctx.fillStyle = '#5A5052'; circ(ctx, 14, -19.2, 1.05); ctx.fill();
    eye(ctx, 14, -19.2, 0.7);
    ctx.fillStyle = '#4A4244'; circ(ctx, 16.8, -14.6, 0.45); ctx.fill();
  } };

  /* a mute swan sitting down, neck up */
  A.swan = { w: 36, s: 1.1, draw: function (ctx, t) {
    floorShadow(ctx, 15);
    ctx.fillStyle = '#F8F8F6';
    ctx.beginPath(); ctx.moveTo(-16, -10); ctx.quadraticCurveTo(-10, -13.6, 1, -12); ctx.quadraticCurveTo(10, -10, 9.4, -4); ctx.quadraticCurveTo(8, -0.4, 4, -0.4); ctx.lineTo(-10, -0.4); ctx.quadraticCurveTo(-14, -2, -16, -10); ctx.fill();
    ctx.fillStyle = 'rgba(160,170,185,0.3)'; ell(ctx, -2, -2.4, 11, 2); ctx.fill();
    ctx.fillStyle = '#EEF0F2'; ell(ctx, -3, -8.6, 9.4, 4.4, -0.08); ctx.fill();
    ln(ctx, 'rgba(180,188,200,0.7)', 0.35);
    for (var i = 0; i < 4; i++) sg(ctx, -10 + i * 3.2, -6.6 - (i % 2), -6 + i * 3.2, -9.4 - (i % 2));
    // the long neck in an S
    var bob = Math.sin(t * 0.8) * 0.4;
    ln(ctx, '#F8F8F6', 3.2);
    ctx.beginPath(); ctx.moveTo(7, -9); ctx.bezierCurveTo(12.4, -14, 4, -21.4, 7.4 + bob, -28.4); ctx.stroke();
    ctx.fillStyle = '#F8F8F6'; ell(ctx, 9.2 + bob, -29.6, 2.9, 2.2, 0.2); ctx.fill();
    // an orange beak with a black knob, and a black face by the eye
    ctx.fillStyle = '#1E1A1E'; poly(ctx, [10.4 + bob, -31.4, 12.4 + bob, -31, 12 + bob, -28.6, 10.2 + bob, -29.2]); ctx.fill();
    circ(ctx, 11.8 + bob, -31.2, 1); ctx.fill();
    ctx.fillStyle = '#F28A2E'; poly(ctx, [12 + bob, -30.8, 16.6 + bob, -28.8, 16.2 + bob, -28.2, 12 + bob, -28.8]); ctx.fill();
    eye(ctx, 10.2 + bob, -30.2, 0.55);
  } };

  /* a mallard drake */
  A.duck = { w: 30, s: 1.35, draw: function (ctx, t) {
    floorShadow(ctx, 11);
    ln(ctx, '#F28A2E', 1.1); sg(ctx, -1, -5, -1.2, 0); sg(ctx, 2.4, -5, 2.8, 0);
    ctx.fillStyle = '#F28A2E'; tri(ctx, -1.2, -0.4, -3.6, 0.4, 1.2, 0.4); ctx.fill(); tri(ctx, 2.8, -0.4, 0.6, 0.4, 5.4, 0.4); ctx.fill();
    ctx.fillStyle = '#F4F4F2'; tri(ctx, -9.6, -12.4, -13.6, -10.8, -9.4, -9.2); ctx.fill();
    ctx.fillStyle = '#1E1E22'; ell(ctx, -8.6, -11.2, 2.6, 2.8); ctx.fill();
    ln(ctx, '#1E1E22', 0.7); ctx.beginPath(); ctx.moveTo(-9, -13.4); ctx.quadraticCurveTo(-8.2, -16.2, -6.6, -14.8); ctx.stroke();
    ctx.fillStyle = '#B9B6B0'; ell(ctx, 0, -9.6, 10, 5.8, -0.06); ctx.fill();
    ctx.fillStyle = '#7A3E2A'; ell(ctx, 6.4, -10.6, 4.4, 4.6); ctx.fill();
    ctx.fillStyle = '#8E8A82'; ell(ctx, -2, -11, 6.6, 3.4, -0.1); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-5, -10.6, 4.8, 2.2);
    ctx.fillStyle = '#3557C8'; ctx.fillRect(-4.6, -10.2, 4, 1.4);
    ctx.fillStyle = '#F6F6F4'; ell(ctx, 7.6, -14.6, 2.6, 0.9, 0.2); ctx.fill();
    // a glossy green head and a yellow bill
    ctx.fillStyle = '#1E6A4A'; circ(ctx, 8.6, -18.6, 3.9); ctx.fill();
    ctx.fillStyle = '#2E9A6A'; ell(ctx, 7.6, -20, 2, 1.2, -0.4); ctx.fill();
    ctx.fillStyle = '#E8C83A';
    ctx.beginPath(); ctx.moveTo(11.4, -19.6); ctx.lineTo(16.2, -18.8); ctx.quadraticCurveTo(17.2, -18.2, 16.2, -17.4); ctx.lineTo(11.6, -17.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3A3020'; circ(ctx, 16.6, -18.1, 0.45); ctx.fill();
    eye(ctx, 9.6, -19.4, 0.6);
  } };

  /* ---------- the zoo ---------- */

  /* a lion lying down, head up */
  A.lion = { w: 44, s: 1.05, draw: function (ctx, t) {
    floorShadow(ctx, 18);
    var flick = Math.sin(t * 1.4) * 1.2;
    ln(ctx, '#C99A52', 1.5);
    ctx.beginPath(); ctx.moveTo(-15, -3.4); ctx.quadraticCurveTo(-21, -0.6, -24, -2.4 - flick); ctx.stroke();
    ctx.fillStyle = '#5A3A1E'; ell(ctx, -24.6, -2.8 - flick, 1.6, 1.2); ctx.fill();
    ctx.fillStyle = '#C9944A'; ell(ctx, -9.6, -6, 6.4, 5.4); ctx.fill();
    var g = ctx.createLinearGradient(0, -15.6, 0, 0);
    g.addColorStop(0, '#C9944A'); g.addColorStop(1, '#E8C489');
    ctx.fillStyle = g; ell(ctx, -3, -8, 14.6, 7.6); ctx.fill();
    ctx.fillStyle = '#D9A85A'; ell(ctx, -5.4, -1.6, 4.8, 1.6); ctx.fill();
    // front legs out in front
    ctx.fillStyle = '#C9944A'; rr(ctx, 6, -5.4, 11, 3.8, 1.9); ctx.fill();
    ctx.fillStyle = '#D9A85A'; rr(ctx, 4, -4.2, 14.6, 4.2, 2.1); ctx.fill();
    ell(ctx, 18.2, -1.8, 3, 1.9); ctx.fill();
    // the mane
    ctx.fillStyle = '#7A4220';
    for (var i = 0; i < 12; i++) { var a = i / 12 * TAU; circ(ctx, 10 + Math.cos(a) * 7.8, -17 + Math.sin(a) * 8.4, 3.2); ctx.fill(); }
    ctx.fillStyle = '#9A5A28'; circ(ctx, 10, -17, 8.6); ctx.fill();
    ctx.fillStyle = '#B8742E'; circ(ctx, 11.4, -16.6, 6.6); ctx.fill();
    // the face
    ctx.fillStyle = '#C9944A'; circ(ctx, 9.4, -23.4, 1.6); ctx.fill();
    ctx.fillStyle = '#E0B060'; ell(ctx, 13.4, -16.4, 4.8, 5.4); ctx.fill();
    ctx.fillStyle = '#F2DDB0'; ell(ctx, 16, -13.4, 3, 2.4); ctx.fill();
    ctx.fillStyle = '#6A3A2A'; tri(ctx, 16.4, -16, 19, -16, 17.8, -14.2); ctx.fill();
    ln(ctx, '#6A3A2A', 0.35); sg(ctx, 17.8, -14.2, 17.6, -12.6);
    ctx.beginPath(); ctx.moveTo(15.6, -12.4); ctx.quadraticCurveTo(17.6, -11.6, 19, -12.6); ctx.stroke();
    ctx.fillStyle = '#E8A22A'; ell(ctx, 14.8, -18.6, 1, 0.7, -0.2); ctx.fill();
    ctx.fillStyle = '#17141C'; circ(ctx, 15, -18.6, 0.42); ctx.fill();
  } };

  /* a tiger walking */
  A.tiger = { w: 44, s: 1.08, draw: function (ctx, t) {
    floorShadow(ctx, 18);
    var step = Math.sin(t * 1.6) * 0.8;
    var leg = function (x, col, dx) { ln(ctx, col, 3.2); sg(ctx, x, -15, x + dx, -1.4); ctx.fillStyle = col; ell(ctx, x + dx + 0.6, -1, 2, 1.1); ctx.fill(); };
    leg(-9, '#C8601E', step); leg(8.4, '#C8601E', -step);
    // the tail, ringed in black
    ln(ctx, '#E8792A', 2);
    ctx.beginPath(); ctx.moveTo(-13.6, -19); ctx.bezierCurveTo(-20, -17, -21.6, -9, -18.6, -4); ctx.stroke();
    ln(ctx, '#1E1A1E', 2.1);
    [[-17.4, -17.6], [-20.2, -13.6], [-20.4, -9.4]].forEach(function (p) { sg(ctx, p[0] - 0.3, p[1] - 0.2, p[0] + 0.3, p[1] + 0.3); });
    ctx.fillStyle = '#1E1A1E'; circ(ctx, -18.6, -4, 1.1); ctx.fill();
    // the body, striped
    ctx.save();
    ell(ctx, 0, -18, 14, 6.6); ctx.fillStyle = '#E8792A'; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#F6F0E6'; ell(ctx, 1, -12, 11, 2.6); ctx.fill();
    ln(ctx, '#1E1A1E', 1.2);
    for (var i = 0; i < 8; i++) {
      var x = -11.6 + i * 3.1;
      ctx.beginPath(); ctx.moveTo(x, -25.2); ctx.quadraticCurveTo(x + 1.4, -20, x - 0.8, -15.4); ctx.stroke();
    }
    ctx.restore();
    leg(-6, '#E8792A', -step); leg(10.6, '#E8792A', step);
    // the head: white cheeks, a pink nose, white spots on the backs of the ears
    ctx.fillStyle = '#E8792A'; circ(ctx, 13.4, -27, 1.8); ctx.fill();
    ctx.fillStyle = '#F6F0E6'; circ(ctx, 13.4, -27.2, 0.8); ctx.fill();
    ctx.fillStyle = '#E8792A'; circ(ctx, 16, -22.4, 5.2); ctx.fill();
    ctx.fillStyle = '#F6F0E6'; ell(ctx, 18.4, -19.6, 3.4, 2.4, 0.15); ctx.fill(); ell(ctx, 15, -19.2, 3, 2.4); ctx.fill();
    ln(ctx, '#1E1A1E', 0.7);
    sg(ctx, 14.6, -26.8, 15.6, -24.6); sg(ctx, 16.6, -27.2, 17, -25); sg(ctx, 12, -22, 14, -21.4); sg(ctx, 12.2, -24, 14, -23);
    ctx.fillStyle = '#C46A5A'; tri(ctx, 20, -21.6, 21.8, -21.4, 21, -20.2); ctx.fill();
    ctx.fillStyle = '#E8C23A'; ell(ctx, 18, -23.6, 1, 0.7, -0.2); ctx.fill();
    ctx.fillStyle = '#17141C'; circ(ctx, 18.2, -23.6, 0.4); ctx.fill();
  } };

  /* an African elephant: big ears, trunk and tusks */
  A.elephant = { w: 48, s: 0.9, draw: function (ctx, t) {
    floorShadow(ctx, 20);
    var flap = Math.sin(t * 1.3) * 0.07, sw = Math.sin(t * 0.9) * 1.2;
    var leg = function (x, col) { ctx.fillStyle = col; rr(ctx, x - 3, -19, 6, 19, 2.4); ctx.fill(); ctx.fillStyle = 'rgba(240,235,225,0.7)'; for (var k = -1; k <= 1; k++) { ell(ctx, x + k * 1.6, -0.6, 0.7, 0.45); ctx.fill(); } };
    leg(-10, '#74767E'); leg(9, '#74767E');
    ln(ctx, '#74767E', 0.8); ctx.beginPath(); ctx.moveTo(-17, -29); ctx.quadraticCurveTo(-18.6, -24, -18, -18); ctx.stroke();
    ctx.fillStyle = '#4A4A50'; ell(ctx, -18, -17.4, 0.7, 1.4); ctx.fill();
    var g = ctx.createLinearGradient(0, -38, 0, -14);
    g.addColorStop(0, '#9A9CA3'); g.addColorStop(1, '#7E8088');
    ctx.fillStyle = g; ell(ctx, -2, -26, 16.4, 12.2); ctx.fill();
    leg(-6.4, '#8C8E95'); leg(12.4, '#8C8E95');
    // the head and trunk
    ctx.fillStyle = '#8C8E95'; circ(ctx, 14.6, -31, 7.2); ctx.fill();
    ln(ctx, '#8C8E95', 3.8);
    ctx.beginPath(); ctx.moveTo(19, -29); ctx.bezierCurveTo(22.8, -23, 21.6 + sw * 0.4, -13, 23.6 + sw, -6.6); ctx.stroke();
    ln(ctx, '#8C8E95', 2.2);
    ctx.beginPath(); ctx.moveTo(23.6 + sw, -6.6); ctx.quadraticCurveTo(24.6 + sw, -4, 26 + sw, -6.4); ctx.stroke();
    ln(ctx, 'rgba(70,72,78,0.5)', 0.3);
    for (var w = 0; w < 6; w++) { var ty = -24 + w * 2.8; sg(ctx, 19.8 + w * 0.3, ty, 22.6 + w * 0.3, ty + 0.4); }
    ctx.fillStyle = '#F6F0E2';
    ctx.beginPath(); ctx.moveTo(18, -26.4); ctx.quadraticCurveTo(20.6, -22.8, 24, -22.4); ctx.quadraticCurveTo(21, -24.8, 19.4, -27.6); ctx.closePath(); ctx.fill();
    // the big ear, flapping
    ctx.save(); ctx.translate(10.4, -33); ctx.rotate(flap);
    ctx.fillStyle = '#9A9CA3';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.bezierCurveTo(-9, -10, -11, 4, -5, 9.4); ctx.quadraticCurveTo(-1, 11, 1.6, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(200,170,175,0.35)'; ell(ctx, -4, 0.6, 3.6, 5.4, 0.15); ctx.fill();
    ln(ctx, 'rgba(90,90,98,0.5)', 0.35); ctx.beginPath(); ctx.moveTo(0, -7); ctx.bezierCurveTo(-9, -10, -11, 4, -5, 9.4); ctx.stroke();
    ctx.restore();
    eye(ctx, 16.8, -33.4, 0.8);
    ln(ctx, 'rgba(70,72,78,0.6)', 0.3); ctx.beginPath(); ctx.arc(16.8, -33.4, 1.8, Math.PI * 1.15, Math.PI * 1.75); ctx.stroke();
  } };

  /* a giraffe: it fits the jar by reaching right up into the neck */
  A.giraffe = { w: 32, s: 0.95, tall: 1, draw: function (ctx, t) {
    floorShadow(ctx, 12);
    var chew = Math.sin(t * 3) * 0.25;
    var leg = function (x, col) {
      ln(ctx, col, 2);
      ctx.beginPath(); ctx.moveTo(x, -33); ctx.lineTo(x + 0.3, -16); ctx.lineTo(x, -1); ctx.stroke();
      ctx.fillStyle = shade(col, -0.2); circ(ctx, x + 0.3, -16, 1.2); ctx.fill();
      ctx.fillStyle = '#3A2A22'; ell(ctx, x + 0.2, -0.5, 1.2, 0.6); ctx.fill();
    };
    leg(-6.4, '#C9984A'); leg(5, '#C9984A');
    ln(ctx, '#C9984A', 0.7); ctx.beginPath(); ctx.moveTo(-10.6, -40); ctx.quadraticCurveTo(-12.2, -33, -12, -27); ctx.stroke();
    ctx.fillStyle = '#3A2A22'; ell(ctx, -12, -26.4, 0.8, 1.6); ctx.fill();
    // body and neck in one, patched
    var shape = function () {
      ctx.beginPath();
      ctx.ellipse(0, -38.4, 11, 7, -0.08, 0, TAU);
      ctx.moveTo(4, -42); ctx.lineTo(10.6, -64.4); ctx.lineTo(14, -63.4); ctx.lineTo(10.4, -36); ctx.closePath();
    };
    ctx.save();
    shape(); ctx.fillStyle = '#EAC27A'; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#A8642A';
    var r = rnd(33);
    for (var y = -70; y < -30; y += 3.4) for (var x = -12; x < 16; x += 3.6) {
      var ox = x + ((y / 3.4) % 2 ? 1.8 : 0) + (r() - 0.5) * 0.8;
      rr(ctx, ox, y + (r() - 0.5) * 0.6, 2.8 + r() * 0.5, 2.6 + r() * 0.4, 0.9); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(-12, -36, 28, 6);
    ctx.restore();
    ln(ctx, '#7A4A28', 1.1); sg(ctx, 4.6, -43.4, 10.6, -63.6);
    leg(-3.6, '#E2B266'); leg(7.6, '#E2B266');
    // the head, horns and ears
    ln(ctx, '#C9984A', 0.7); sg(ctx, 11.6, -68.6, 11.4, -72.4); sg(ctx, 13.2, -69, 13.6, -72.6);
    ctx.fillStyle = '#3A2A22'; circ(ctx, 11.4, -72.6, 0.8); ctx.fill(); circ(ctx, 13.6, -72.8, 0.8); ctx.fill();
    ctx.fillStyle = '#EAC27A'; ell(ctx, 9.6, -68, 2.2, 0.9, -0.5); ctx.fill();
    ell(ctx, 14.6, -66.4, 4.4, 2.7, 0.42); ctx.fill();
    ctx.fillStyle = '#A8642A'; circ(ctx, 13, -68, 0.9); ctx.fill();
    ctx.fillStyle = '#D9A860'; ell(ctx, 17.6, -64.2 + chew, 1.8, 1.4, 0.4); ctx.fill();
    ctx.fillStyle = '#3A2A22'; circ(ctx, 18.4, -64.8, 0.35); ctx.fill();
    eye(ctx, 14.2, -67.6, 0.75);
  } };

  /* a king penguin */
  A.penguin = { w: 20, s: 1.3, draw: function (ctx, t) {
    floorShadow(ctx, 7);
    var waddle = Math.sin(t * 2) * 0.04;
    ctx.save(); ctx.rotate(waddle);
    ctx.fillStyle = '#2A2A30'; ell(ctx, -1.6, -0.4, 2.6, 1); ctx.fill(); ell(ctx, 2.8, -0.4, 2.6, 1); ctx.fill();
    ctx.fillStyle = '#26262E'; ell(ctx, 0, -16.6, 7.6, 15); ctx.fill();
    var g = ctx.createLinearGradient(0, -28, 0, -16);
    g.addColorStop(0, '#F2A83A'); g.addColorStop(1, '#F6F6F4');
    ctx.fillStyle = '#F6F6F4'; ell(ctx, 2.6, -14.6, 5.2, 12.6); ctx.fill();
    ctx.fillStyle = g; ell(ctx, 3.4, -23.6, 3.6, 4.2); ctx.fill();
    ctx.fillStyle = '#1E1E26'; ell(ctx, -2, -16.6, 2.4, 7.6, 0.18); ctx.fill();
    ctx.fillStyle = '#26262E'; circ(ctx, 1.8, -30.2, 4.6); ctx.fill();
    // the orange patch behind the eye, and the long beak with orange underneath
    ctx.fillStyle = '#F29A2A'; ell(ctx, 1.6, -27.8, 1.5, 2.6, 0.5); ctx.fill();
    ctx.fillStyle = '#1E1E26';
    ctx.beginPath(); ctx.moveTo(5.4, -31.4); ctx.quadraticCurveTo(9, -31, 11.6, -28.6); ctx.lineTo(5.6, -29.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F2803A'; poly(ctx, [6, -29.6, 10.6, -28.9, 6.2, -28.6]); ctx.fill();
    eye(ctx, 4.2, -31.4, 0.7);
    ctx.restore();
  } };

  /* a meerkat on the lookout */
  A.meerkat = { w: 18, s: 1.55, draw: function (ctx, t) {
    floorShadow(ctx, 6);
    var look = Math.sin(t * 0.7) > 0.4 ? 1 : 0;
    ln(ctx, '#B8946A', 1.4);
    ctx.beginPath(); ctx.moveTo(-2, -3); ctx.quadraticCurveTo(-7, -0.6, -11.6, -0.6); ctx.stroke();
    ln(ctx, '#3A2A20', 1.1); sg(ctx, -10.4, -0.6, -12, -0.6);
    ctx.fillStyle = '#B8946A'; ell(ctx, 0, -5, 3.6, 4.6); ctx.fill();
    ell(ctx, 1.8, -0.6, 2.6, 0.9); ctx.fill();
    ctx.fillStyle = '#C9A577'; ell(ctx, 0.4, -15, 4.4, 10.2, 0.04); ctx.fill();
    ctx.fillStyle = '#E2C9A0'; ell(ctx, 1.8, -14.6, 2.4, 8); ctx.fill();
    ln(ctx, 'rgba(120,90,60,0.4)', 0.4);
    for (var i = 0; i < 4; i++) sg(ctx, -3.6, -18 + i * 2.6, -1.6, -17.4 + i * 2.6);
    ln(ctx, '#B8946A', 1.1); sg(ctx, 2.4, -20, 4, -16.4);
    ctx.fillStyle = '#3A2A20'; circ(ctx, 4, -16.2, 0.5); ctx.fill();
    // the head, turning now and then
    ctx.save(); ctx.translate(0.8, -28); ctx.scale(look ? 0.94 : 1, 1);
    ctx.fillStyle = '#C9A577'; circ(ctx, 0, 0, 3.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1.6, -2.4); ctx.quadraticCurveTo(4.4, -1, 6, 1.2); ctx.lineTo(2, 2.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2A2018'; circ(ctx, 6, 1.2, 0.55); ctx.fill();
    ctx.fillStyle = '#3A2A20'; ell(ctx, 1.6, -0.5, 1.5, 1.1, 0.3); ctx.fill();
    eye(ctx, 1.8, -0.6, 0.6, '#0E0C10');
    ctx.fillStyle = '#3A2A20'; ctx.beginPath(); ctx.arc(-1.8, -1.2, 1, Math.PI * 0.6, Math.PI * 1.9); ctx.fill();
    ctx.restore();
  } };

  /* a flamingo on one leg */
  A.flamingo = { w: 28, s: 0.95, tall: 1, draw: function (ctx, t) {
    floorShadow(ctx, 8);
    var sway = Math.sin(t * 0.8) * 0.6;
    ln(ctx, '#E87A9A', 1.3);
    ctx.beginPath(); ctx.moveTo(0, -31.4); ctx.lineTo(0.4, -17); ctx.lineTo(0, -0.6); ctx.stroke();
    ctx.fillStyle = '#C85A7A'; circ(ctx, 0.4, -17, 0.9); ctx.fill();
    ctx.fillStyle = '#E87A9A'; tri(ctx, 0, -0.8, -2.4, 0.3, 2.8, 0.3); ctx.fill();
    // the other leg, folded up
    ln(ctx, '#E87A9A', 1.2);
    ctx.beginPath(); ctx.moveTo(-1.6, -31.6); ctx.lineTo(-6.6, -24.6); ctx.lineTo(-2.2, -27.4); ctx.stroke();
    ctx.fillStyle = '#C85A7A'; circ(ctx, -6.6, -24.6, 0.85); ctx.fill();
    // the body, with black at the back of the wings
    ctx.fillStyle = '#1E1A1E'; tri(ctx, -8.6, -37, -12.6, -33.6, -8, -33); ctx.fill();
    ctx.fillStyle = '#F48AAE'; ell(ctx, -1, -35, 9.4, 5.6, -0.15); ctx.fill();
    ctx.fillStyle = '#E85A8A'; ell(ctx, -3, -36.2, 6.4, 3.4, -0.2); ctx.fill();
    ctx.fillStyle = '#F7A6C2'; ell(ctx, 3, -33.4, 4, 2.4, -0.3); ctx.fill();
    // the neck in an S, and the bent beak
    ln(ctx, '#F48AAE', 2.4);
    ctx.beginPath(); ctx.moveTo(6.4, -37.4); ctx.bezierCurveTo(12, -43, 1.6, -50, 4 + sway, -55.4); ctx.quadraticCurveTo(5.6 + sway, -60, 9.6 + sway, -58.4); ctx.stroke();
    ctx.fillStyle = '#F48AAE'; circ(ctx, 9.8 + sway, -58.4, 2.2); ctx.fill();
    ctx.fillStyle = '#F6E6D8';
    ctx.beginPath(); ctx.moveTo(11.4 + sway, -59.8); ctx.quadraticCurveTo(14.6 + sway, -59, 14.4 + sway, -56.6); ctx.lineTo(12.4 + sway, -57); ctx.quadraticCurveTo(12 + sway, -57.8, 11 + sway, -57.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1E1A1E';
    ctx.beginPath(); ctx.moveTo(14.5 + sway, -57.8); ctx.quadraticCurveTo(14.8 + sway, -56, 13.8 + sway, -54.8); ctx.lineTo(12.6 + sway, -56.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F2D23A'; circ(ctx, 10.4 + sway, -59.2, 0.55); ctx.fill();
    ctx.fillStyle = '#17141C'; circ(ctx, 10.5 + sway, -59.2, 0.25); ctx.fill();
  } };

  /* draws one animal in pixels: feet at (x, y), u pixels to a unit, facing dir. Flyers bob on their own */
  function drawAnimal(ctx, id, x, y, u, dir, t, scale) {
    var a = A[id];
    if (!a) return;
    var s = u * (a.s || 1) * (scale || 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale((a.sym ? 1 : dir) * s, s);
    try { a.draw(ctx, t); } finally { ctx.restore(); }
  }

  /* ---------- the homes ----------
     Each home: a wall and a floor ([kind, colour, second colour]), maybe a ceiling and a window, then things: 'back'
     on the wall, 'rear' on the floor behind the animal, 'front' in front of it. Each thing is [name, x across, options].
     at and y move the animal (y in units below the line where the wall meets the floor), s sizes it, light tints the
     room. Homes with the same name look the same, whoever lives in them. */
  var BATH_IN = { rear: [['bath', 0.52, { part: 'back' }]], front: [['bath', 0.52, { part: 'front', duck: 1 }]], y: 1, s: 0.8 };
  function withBath(o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = o[k]; }); r.rear = (o.rear || []).concat(BATH_IN.rear); r.front = BATH_IN.front.concat(o.front || []); r.y = BATH_IN.y; r.s = BATH_IN.s; return r; }
  var ROOMS = {
    // the garden
    'Leaf Bed': { wall: ['leaves', '#78B055', '#9CCB6E'], floor: ['grass', '#6AA24A'], rear: [['leafbed', 0.5]], y: 8 },
    'Thimble Tea Room': { wall: ['floral', '#F3E4D4', '#D88A9A'], floor: ['boards', '#B88A5E'], win: { x: 0.72, y: 0.46, w: 0.2, h: 0.14, view: 'garden', curtains: '#D88A9A' }, rear: [['table', 0.24, { on: ['teapot', 'cup'], cloth: '#FBF4F4', w: 18 }], ['thimble', 0.8]] },
    'Button Sofa': { wall: ['stripes', '#E6D2E6', '#EEDDEE'], floor: ['carpet', '#8E5A7E'], back: [['picture', 0.3, { y: 0.42 }]], rear: [['sofa', 0.5, { c: '#C0507A', w: 40 }], ['buttons', 0.82]] },
    'Dolls’ House Kitchen': { wall: ['stripes', '#F6E6C4', '#F0D8A6'], floor: ['checker', '#EDE6D8', '#3A4A5E'], back: [['shelf', 0.34, { y: 0.45, items: ['jar', 'jar', 'pot'] }], ['pans', 0.66, { y: 0.4 }]], rear: [['stove', 0.74, { c: '#3E7A8A', pan: 1 }], ['table', 0.27, { on: ['cake'], w: 14 }]], front: [['dollframe', 0.5]] },
    'Fairy-light Treehouse': { wall: ['planks', '#6E4A30'], floor: ['boards', '#5A3A24'], win: { x: 0.3, y: 0.46, w: 0.2, shape: 'round', view: 'night', frame: '#8A5A36' }, back: [['lights', 0.5, { y: 0.32 }]], rear: [['lantern', 0.8]], light: 'night' },
    'Flower Shop': { wall: ['tiles', '#F4EEE6', 'rgba(200,190,180,0.6)'], ceil: ['awning', '#3E8E5A'], floor: ['checker', '#E8E2D6', '#5A6A5A'], back: [['shelf', 0.3, { y: 0.47, items: ['flowers', 'flowers', 'flowers'] }], ['shelf', 0.72, { y: 0.47, items: ['pot', 'flowers', 'pot'] }]], rear: [['counter', 0.5, { w: 56, c: '#8A6A48', on: ['flowers', 'flowers', 'flowers', 'flowers'] }]] },
    'Honeycomb Kitchen': { wall: ['hex', '#F2BC4A', '#E0A030'], floor: ['boards', '#B8864E'], back: [['shelf', 0.3, { y: 0.45, items: ['honey', 'honey', 'honey'] }]], rear: [['stove', 0.76, { c: '#D88A2A', pan: 1 }], ['table', 0.25, { on: ['honey', 'bread'], w: 18 }]] },
    'Garden Tea Party': { wall: ['garden', '#8FC4EA', '#4E8A44'], floor: ['grass', '#6AA24A'], back: [['bunting', 0.5, { y: 0.34 }]], rear: [['table', 0.5, { on: ['teapot', 'stand', 'cup'], cloth: '#FFFFFF', w: 40, h: 12 }], ['chair', 0.12, { dir: 1 }], ['chair', 0.88, { dir: -1 }]] },
    'Sweet Shop': { wall: ['stripes', '#F6C6D6', '#FBE3EA'], floor: ['checker', '#F6F0EA', '#E06A8A'], back: [['sign', 0.5, { y: 0.34, text: 'SWEETS', c: '#C0306A' }], ['jars', 0.5, { y: 0.44, w: 52 }]], rear: [['counter', 0.5, { w: 58, c: '#E890B0', on: ['sweets', 'sweets', 'sweets'] }]] },
    'Honey Palace': { wall: ['damask', '#E8B33A', '#F5D27A'], floor: ['marble', '#F2E2B8'], back: [['drips', 0.5], ['chandelier', 0.5, { y: 0.4 }]], rear: [['runner', 0.5, { c: '#C08A1A' }], ['pillar', 0.21, { c: '#F6E2A8' }], ['pillar', 0.79, { c: '#F6E2A8' }]], light: 'warm' },
    'Window Seat': { wall: ['stripes', '#EFE6F4', '#F6EFF8'], floor: ['boards', '#C9A87A'], win: { x: 0.5, y: 0.47, w: 0.42, h: 0.2, view: 'garden', curtains: '#B07AC0' }, rear: [['windowseat', 0.5, { c: '#B07AC0' }], ['plant', 0.12, { flower: '#E84A6A' }], ['plant', 0.88, { flower: '#F2C230' }]] },
    'Greenhouse': { wall: ['glass', '#CFE8D6'], floor: ['stone', '#B9B2A4'], back: [['shelf', 0.3, { y: 0.5, items: ['pot', 'pot', 'pot'] }]], rear: [['plant', 0.15, { s: 1.4 }], ['pots', 0.84], ['can', 0.68]] },
    'Art Studio': { wall: ['splash', '#F2EFEA'], floor: ['boards', '#C9A87A'], back: [['picture', 0.26, { y: 0.42, w: 10, h: 8 }], ['picture', 0.74, { y: 0.4, w: 12, h: 9, sky: '#F2B8C8' }]], rear: [['easel', 0.8, { c: '#7EC8E3' }], ['paints', 0.2]] },
    'Dance Studio': { wall: ['panels', '#E6E2F2'], floor: ['boards', '#D9B88A'], back: [['mirror', 0.26, { y: 0.45 }], ['barre', 0.5, { y: 0.62 }], ['notes', 0.62]], rear: [['spotlight', 0.5]] },
    'Butterfly Ballroom': { wall: ['damask', '#5A3E8A', '#6E52A0'], floor: ['marble', '#E8E0F0'], back: [['curtains', 0.5, { c: '#8A2A5A' }], ['chandelier', 0.5, { y: 0.38 }]], light: 'warm' },
    'Garden Shed': { wall: ['planks', '#8A6A48'], floor: ['boards', '#6E5034'], win: { x: 0.68, y: 0.46, w: 0.2, h: 0.14, view: 'garden', frame: '#C9B08A' }, back: [['shelf', 0.3, { y: 0.45, items: ['pot', 'pot', 'jar'], wood: '#5A4030' }]], rear: [['tools', 0.17], ['can', 0.83]] },
    'Kitchen Table': { wall: ['tiles', '#E4EEF2', '#FFFFFF'], floor: ['checker', '#E8E4DC', '#7A8A9A'], win: { x: 0.7, y: 0.45, w: 0.22, h: 0.14, view: 'garden', curtains: '#D8432F' }, back: [['pans', 0.3, { y: 0.38 }]], rear: [['table', 0.5, { on: ['bread', 'milk', 'cup'], cloth: '#E8F0F8', w: 34 }], ['chair', 0.15, { dir: 1 }]] },
    'Reading Nook': { wall: ['damask', '#5E7A6A', '#6E8A7A'], floor: ['carpet', '#7A4A3A'], rear: [['rug', 0.5, { c: '#B8483A' }], ['bookshelf', 0.2, { h: 44 }], ['armchair', 0.72, { c: '#B5523D', cushion: '#F2C14E' }], ['lamp', 0.9]], light: 'warm' },
    'Little Post Office': { wall: ['stripes', '#EDE3D0', '#E2D4BC'], floor: ['boards', '#A8805A'], back: [['sign', 0.5, { y: 0.34, text: 'POST OFFICE', c: '#C8202A', w: 40 }], ['letters', 0.62, { y: 0.45 }]], rear: [['counter', 0.62, { w: 40, c: '#8A5A36', on: ['parcel', 'letter'] }], ['post', 0.16]] },
    'Christmas Fireside': { wall: ['damask', '#7A2A2A', '#8E3636'], floor: ['carpet', '#5A2020'], rear: [['rug', 0.5, { c: '#2E6A4A' }], ['fireplace', 0.68, { stockings: 1 }], ['tree', 0.2], ['presents', 0.38]], light: 'night' },
    'Nest-box Bedroom': { wall: ['planks', '#C9A070'], floor: ['straw', '#B8955A'], win: { x: 0.36, y: 0.44, w: 0.22, shape: 'round', view: 'garden', frame: '#8A6A48' }, rear: [['bed', 0.72, { c: '#5A8AD0', w: 30 }]] },
    'Breakfast Table': { wall: ['tiles', '#FFF4D6', '#FFFFFF'], floor: ['boards', '#C9A07A'], win: { x: 0.28, y: 0.45, w: 0.24, h: 0.16, view: 'sunny', curtains: '#F2C230' }, rear: [['table', 0.62, { on: ['cup', 'nuts', 'milk', 'bread'], cloth: '#FFFFFF', w: 36 }], ['chair', 0.9, { dir: -1 }]] },
    'Bubble Bath': withBath({ wall: ['tiles', '#CFE8F2', '#FFFFFF'], floor: ['tiles', '#E8F2F6'], back: [['mirror', 0.24, { y: 0.44 }], ['towel', 0.8, { y: 0.42, c: '#F28AA0' }]] }),
    'Music Room': { wall: ['panels', '#3E4A6A'], floor: ['boards', '#8A5A36'], back: [['picture', 0.76, { y: 0.42, portrait: '#C9A44A', w: 10, h: 12 }], ['notes', 0.5]], rear: [['rug', 0.6, { c: '#A3263A' }], ['piano', 0.26]], light: 'warm' },
    'Peanut Café': { wall: ['brick', '#B8704A', '#9A5A3A'], ceil: ['awning', '#2E6A9A'], floor: ['checker', '#E8E2D6', '#2E3A4A'], back: [['sign', 0.5, { y: 0.42, text: 'CAFÉ', c: '#2E3A4A', w: 26 }]], rear: [['counter', 0.5, { w: 60, c: '#C9A07A', on: ['nuts', 'cup', 'nuts', 'cup'] }]] },
    'Tree Den': { wall: ['bark', '#7A5636'], floor: ['earth', '#6E5034'], win: { x: 0.72, y: 0.45, w: 0.2, shape: 'round', view: 'forest', frame: '#5A3A22' }, rear: [['leafbed', 0.62, { small: 1 }], ['nutpile', 0.22]] },
    'Pantry': { wall: ['planks', '#D8C3A0'], floor: ['stone', '#A8A094'], back: [['jars', 0.5, { y: 0.4, w: 56, items: ['jar', 'jar', 'jar', 'jar'], items2: ['honey', 'jar', 'honey', 'jar'] }]], rear: [['sacks', 0.84], ['boxes', 0.16]] },
    'Bakery': { wall: ['tiles', '#F6F0E8', 'rgba(200,180,160,0.5)'], floor: ['checker', '#E8E0D4', '#8A6A4A'], back: [['sign', 0.5, { y: 0.34, text: 'BAKERY', c: '#8A5A36' }], ['shelf', 0.5, { y: 0.46, w: 50, items: ['bread', 'bread', 'bread', 'bread'] }]], rear: [['counter', 0.5, { w: 56, c: '#B8865A', on: ['bread', 'cake', 'bread'] }]] },
    'Library': { wall: ['panels', '#5A3A2A'], floor: ['boards', '#7A5236'], rear: [['rug', 0.5, { c: '#7A2A3A' }], ['bookshelf', 0.17, { h: 48 }], ['bookshelf', 0.83, { h: 48, seed: 9 }], ['lamp', 0.66]], light: 'warm' },
    'Acorn Treehouse': { wall: ['planks', '#9A6A40'], floor: ['boards', '#7A5236'], win: { x: 0.5, y: 0.47, w: 0.24, shape: 'round', view: 'forest', frame: '#6E4528' }, back: [['acorns', 0.5]], rear: [['lantern', 0.16], ['nutpile', 0.82]] },
    'Cosy Kitchen': { wall: ['brick', '#E8DCC2', '#D2C2A2'], floor: ['stone', '#B8AC9A'], win: { x: 0.3, y: 0.45, w: 0.2, h: 0.14, view: 'garden', curtains: '#7A9A5A' }, back: [['pans', 0.72, { y: 0.38 }]], rear: [['stove', 0.74, { c: '#2E5A3A', pan: 1 }], ['table', 0.24, { on: ['bread', 'cup'], w: 16 }]] },
    'Cottage Bedroom': { wall: ['floral', '#F2E6D8', '#C9708A'], floor: ['boards', '#B88A5E'], win: { x: 0.3, y: 0.45, w: 0.2, h: 0.14, view: 'night', curtains: '#7A9A5A' }, rear: [['rug', 0.5, { c: '#C9708A' }], ['bed', 0.7, { c: '#C9708A', w: 32 }]], light: 'warm' },
    'Fireside Armchair': { wall: ['damask', '#6E4A3A', '#7E5A48'], floor: ['carpet', '#5A2E26'], rear: [['rug', 0.5, { c: '#A86A3A' }], ['fireplace', 0.26], ['armchair', 0.74, { c: '#2E5A4A', cushion: '#E8B33A' }]], light: 'night' },
    // the beach and coast
    'Rooftop Loft': { wall: ['planks', '#C9B8A0'], ceil: ['attic', '#A8977E'], floor: ['boards', '#9A7A5A'], win: { x: 0.5, y: 0.5, w: 0.2, shape: 'round', view: 'sea', frame: '#6E5A44' }, rear: [['boxes', 0.18], ['lamp', 0.84]] },
    'Beach Hut': { wall: ['stripes', '#7EC8E3', '#FFFFFF'], floor: ['boards', '#E2C9A0'], win: { x: 0.46, y: 0.46, w: 0.34, h: 0.17, view: 'sea', frame: '#FFFFFF' }, back: [['lifebuoy', 0.8, { y: 0.47 }]], rear: [['deckchair', 0.18, { c: '#E74C3C' }], ['bucket', 0.8, { c: '#F2C230' }]] },
    'Pier Arcade': { wall: ['panels', '#2A2244'], floor: ['checker', '#3A3254', '#5A4A7A'], back: [['lights', 0.5, { y: 0.34 }]], rear: [['arcade', 0.2, { c: '#C8202A' }], ['arcade', 0.82, { c: '#2E6DB4' }]], light: 'night' },
    'Lighthouse Room': { wall: ['stone', '#ECE6DA', '#C9C2B4'], ceil: ['tower'], floor: ['boards', '#8A6A4A'], win: { x: 0.28, y: 0.46, w: 0.2, shape: 'round', view: 'sea', frame: '#C8202A' }, rear: [['beacon', 0.74]] },
    'Fish and Chip Shop': { wall: ['tiles', '#E8F2F6', '#FFFFFF'], floor: ['checker', '#F2F2F2', '#2E5A8A'], back: [['sign', 0.5, { y: 0.34, text: 'FISH & CHIPS', c: '#2E5A8A', w: 42 }]], rear: [['counter', 0.5, { w: 60, c: '#C8D8E4', on: ['chips', 'fish', 'chips'] }], ['fryer', 0.78]] },
    'Rock Pool Room': { wall: ['sea', '#4A9AA8'], floor: ['sand', '#E2C98A'], rear: [['rocks', 0.5, { c: '#7E8794' }], ['shells', 0.3]], light: 'water' },
    'Bucket House': { wall: ['bucket', '#D8432F'], floor: ['sand', '#E2C98A'], win: { x: 0.5, y: 0.46, w: 0.18, shape: 'round', view: 'sea', frame: '#B8301E' }, rear: [['shells', 0.22], ['shells', 0.8]] },
    'Sandcastle Hall': { wall: ['stone', '#E2C98A', '#C9AE72'], floor: ['sand', '#E8D29A'], back: [['banner', 0.5, { y: 0.36, c: '#3E7FB8' }]], rear: [['sandcastle', 0.2], ['sandcastle', 0.82], ['shells', 0.5]] },
    'Shell Shop': { wall: ['planks', '#BFDDE8'], floor: ['boards', '#D8C3A0'], back: [['sign', 0.5, { y: 0.34, text: 'SHELLS', c: '#2E7A8A' }], ['shelf', 0.5, { y: 0.46, w: 50, items: ['shell', 'shell', 'shell', 'shell', 'shell'] }]], rear: [['counter', 0.5, { w: 56, c: '#7EB8C8', on: ['shell', 'bottle', 'shell'] }]] },
    'Shipwreck Cabin': { wall: ['planks', '#5A4632'], floor: ['boards', '#4A3A2A'], win: { x: 0.72, y: 0.44, w: 0.18, shape: 'round', view: 'underwater', frame: '#C9A44A' }, back: [['wheel', 0.28, { y: 0.45 }], ['lantern', 0.5, { hang: 1, y: 0.4 }]], rear: [['chest', 0.78]], light: 'water' },
    'Seaside Bathroom': withBath({ wall: ['tiles', '#BFE3EC', '#FFFFFF'], floor: ['tiles', '#DCEFF4'], win: { x: 0.24, y: 0.44, w: 0.16, shape: 'round', view: 'sea', frame: '#FFFFFF' }, back: [['towel', 0.8, { y: 0.42, c: '#5AB4C8' }]] }),
    'Aquarium Lounge': { wall: ['stripes', '#E8EEF2', '#DDE6EC'], floor: ['carpet', '#3E6A8A'], back: [['tank', 0.5, { y: 0.47, w: 46, h: 20 }]], rear: [['sofa', 0.5, { c: '#E8A040', w: 40 }], ['plant', 0.1]] },
    'Seaside Bedroom': { wall: ['stripes', '#DCEBF5', '#FFFFFF'], floor: ['boards', '#D8C3A0'], win: { x: 0.3, y: 0.45, w: 0.2, h: 0.14, view: 'sea', curtains: '#2E6DB4' }, back: [['lifebuoy', 0.8, { y: 0.42 }]], rear: [['bed', 0.68, { c: '#2E6DB4', w: 32 }]] },
    'Star Observatory': { wall: ['night', '#141C40'], ceil: ['dome'], floor: ['boards', '#3A3A4A'], back: [['moon', 0.74, { y: 0.4, sky: '#141C40' }]], rear: [['telescope', 0.22], ['table', 0.84, { on: ['globe'], w: 12, wood: '#5A4A3A' }]], light: 'night' },
    'Fish Tank Lounge': { wall: ['stripes', '#F0EAE0', '#E6DED0'], floor: ['carpet', '#6E5A8A'], back: [['tank', 0.5, { y: 0.47, w: 52, h: 24 }]], rear: [['beanbag', 0.18, { c: '#E8A040' }], ['plant', 0.86]] },
    'Bathtub': { wall: ['tiles', '#F4F6F8', '#DDE4EA'], floor: ['checker', '#F4F4F4', '#9AA8B8'], back: [['mirror', 0.22, { y: 0.44 }]], rear: [['bath', 0.56, { bubbles: false, duck: 1 }]] },
    'Lava-lamp Den': { wall: ['panels', '#3A2A5A'], floor: ['carpet', '#2A1E3A'], rear: [['beanbag', 0.76, { c: '#E84A8A' }], ['lavalamp', 0.18, { c: [255, 90, 160] }], ['lavalamp', 0.9, { c: [90, 200, 255] }]], light: 'night' },
    'Glass Ballroom': { wall: ['glass', '#BFD8EE'], floor: ['marble', '#E8EEF4'], back: [['chandelier', 0.5, { y: 0.38 }]], rear: [['pillar', 0.21, { c: '#DDEAF6' }], ['pillar', 0.79, { c: '#DDEAF6' }]] },
    'Night Disco': { wall: ['night', '#1A1430'], floor: ['checker', '#2A2244', '#3A3060'], back: [['disco', 0.5, { y: 0.36 }]], rear: [['glowfloor', 0.5]], light: 'night' },
    'Boathouse': { wall: ['planks', '#8A6A48'], floor: ['boards', '#7A5A3A'], back: [['net', 0.24, { y: 0.36, fish: 1 }], ['lifebuoy', 0.8, { y: 0.44 }]], rear: [['dock', 0.5]], y: 12 },
    'Ice Rink': { wall: ['panels', '#DCEAF6'], floor: ['ice', '#CFE6F6'], back: [['bunting', 0.5, { y: 0.36 }], ['skates', 0.8, { y: 0.48 }]], rear: [['spotlight', 0.3]], light: 'cool' },
    'Swimming Pool': { wall: ['tiles', '#DDF0F8', '#FFFFFF'], floor: ['tiles', '#BFE6F2'], rear: [['pool', 0.5, { from: 5 }], ['ladder', 0.82], ['ring', 0.22, { c: '#FF6B6B' }]], y: 5 },
    'Cliff-top Burrow': { wall: ['earth', '#8A6A48'], floor: ['earth', '#7A5A3A'], win: { x: 0.5, y: 0.47, w: 0.3, shape: 'round', view: 'sea', frame: '#5E4430' }, rear: [['fishpile', 0.8]] },
    'Fishing Hut': { wall: ['planks', '#6E8A9A'], floor: ['boards', '#7A6A5A'], back: [['net', 0.5, { y: 0.36, fish: 1 }]], rear: [['bucket', 0.2, { c: '#5A7A8A' }], ['lantern', 0.84]] },
    'Seaside Café': { wall: ['stripes', '#F4E6D0', '#FFFFFF'], ceil: ['awning', '#2E7A8A'], floor: ['checker', '#F2EEE6', '#2E7A8A'], win: { x: 0.5, y: 0.5, w: 0.36, h: 0.15, view: 'sea', frame: '#FFFFFF' }, rear: [['table', 0.18, { on: ['cup', 'cake'], cloth: '#FFFFFF', w: 16 }], ['table', 0.84, { on: ['cup'], cloth: '#FFFFFF', w: 14 }]] },
    'Captain’s Cabin': { wall: ['panels', '#6E4528'], floor: ['boards', '#5A3A24'], win: { x: 0.74, y: 0.44, w: 0.18, shape: 'round', view: 'sea', frame: '#C9A44A' }, back: [['wheel', 0.27, { y: 0.45 }]], rear: [['table', 0.72, { on: ['map', 'candle'], w: 22, wood: '#4A2E1A' }], ['chest', 0.2]], light: 'warm' },
    // the countryside
    'Hedge Den': { wall: ['hedge', '#4E7A3A', '#6E9A4A'], floor: ['earth', '#6E5034'], rear: [['leafbed', 0.5, { c: '#8A6A2A' }]], light: 'dusk' },
    'Farmhouse Kitchen': { wall: ['brick', '#EAD9BC', '#D4BE98'], floor: ['stone', '#B8AC9A'], win: { x: 0.3, y: 0.45, w: 0.2, h: 0.14, view: 'garden', curtains: '#C0392B' }, back: [['pans', 0.74, { y: 0.38 }]], rear: [['stove', 0.76, { c: '#B8322A', pan: 1 }], ['table', 0.24, { on: ['bread', 'milk'], w: 18, cloth: '#F4E8E8' }]] },
    'Woodland Cabin': { wall: ['logs', '#9A6A40'], floor: ['boards', '#7A5236'], win: { x: 0.7, y: 0.45, w: 0.22, h: 0.15, view: 'forest', frame: '#6E4528' }, rear: [['rug', 0.5, { c: '#A8402A' }], ['fireplace', 0.25, { c: '#8A8480', clock: false }]] },
    'Fairy-light Den': { wall: ['earth', '#4A3628', '#3A2A1E'], floor: ['earth', '#3A2A1E'], back: [['lights', 0.5, { y: 0.34 }]], rear: [['beanbag', 0.2, { c: '#C0507A' }], ['lantern', 0.84]], light: 'night' },
    'Burrow Bedroom': { wall: ['earth', '#9A7A55'], floor: ['earth', '#8A6A48'], win: { x: 0.3, y: 0.44, w: 0.18, shape: 'round', view: 'garden', frame: '#6E5034' }, rear: [['bed', 0.7, { c: '#E89A5A', w: 30 }], ['lamp', 0.12]] },
    'Allotment Shed': { wall: ['planks', '#7A8A5A'], floor: ['boards', '#6E5A40'], win: { x: 0.7, y: 0.46, w: 0.2, h: 0.14, view: 'garden', frame: '#C9D8A0' }, rear: [['tools', 0.16], ['pots', 0.52], ['can', 0.84]] },
    'Carrot Kitchen': { wall: ['tiles', '#F8E6CC', '#FFFFFF'], floor: ['checker', '#F2EAE0', '#E07A2A'], back: [['shelf', 0.3, { y: 0.45, items: ['carrot', 'jar', 'carrot'] }]], rear: [['table', 0.7, { on: ['carrot', 'carrot', 'cup'], w: 24, cloth: '#FFFFFF' }], ['stove', 0.18, { c: '#E07A2A' }]] },
    'Magic Show': { wall: ['curtain', '#2A1E3A'], ceil: ['stage', '#A3263A'], floor: ['boards', '#5A3A2A'], rear: [['spotlight', 0.5], ['tophat', 0.76]], light: 'night' },
    'Wonderland Tea Party': { wall: ['garden', '#B8A0D8', '#3E7A44'], floor: ['checker', '#F4F0E8', '#2A2A2E'], back: [['clock', 0.5, { y: 0.4 }], ['lantern', 0.2, { hang: 1, y: 0.38 }], ['lantern', 0.8, { hang: 1, y: 0.36 }]], rear: [['table', 0.5, { on: ['teapot', 'cup', 'cake', 'teapot'], cloth: '#FFFFFF', w: 44, h: 12 }], ['tophat', 0.86]] },
    'Forest Cabin': { wall: ['logs', '#8A5A36'], floor: ['boards', '#6E4528'], win: { x: 0.3, y: 0.45, w: 0.22, h: 0.15, view: 'forest', frame: '#5A3A22' }, rear: [['rug', 0.55, { c: '#2E6A4A' }], ['lantern', 0.85]] },
    'Stately Hall': { wall: ['panels', '#3E5A4A'], floor: ['marble', '#E8E2D6'], back: [['picture', 0.24, { y: 0.47, portrait: '#C9A44A', w: 10, h: 13 }], ['picture', 0.76, { y: 0.47, portrait: '#8A5A36', w: 10, h: 13 }], ['chandelier', 0.5, { y: 0.36 }]], rear: [['runner', 0.5, { c: '#7A1E2A' }]] },
    'Mossy Library': { wall: ['panels', '#4A5A3A'], floor: ['carpet', '#4E6A3A'], rear: [['bookshelf', 0.17, { h: 48, wood: '#5A4A2A' }], ['bookshelf', 0.83, { h: 48, wood: '#5A4A2A', seed: 4 }], ['moss', 0.5]], light: 'warm' },
    'Snowy Lodge': { wall: ['logs', '#8A5A36'], floor: ['boards', '#6E4528'], win: { x: 0.72, y: 0.45, w: 0.24, h: 0.16, view: 'snow', frame: '#F4EEE4' }, rear: [['rug', 0.5, { c: '#A8402A' }], ['fireplace', 0.25, { c: '#9A948E', clock: false }]] },
    'Christmas Grotto': { wall: ['night', '#1E2A50'], floor: ['snow', '#E8F0F8'], back: [['snowflakes', 0.5], ['lights', 0.5, { y: 0.34 }]], rear: [['tree', 0.2], ['presents', 0.8]], light: 'night' },
    'Barn': { wall: ['planks', '#8A5A36'], floor: ['straw', '#C9A45A'], win: { x: 0.5, y: 0.44, w: 0.16, h: 0.12, view: 'garden', frame: '#F4EEE4' }, back: [['lantern', 0.8, { hang: 1, y: 0.4 }]], rear: [['hay', 0.16, { w: 18, h: 12 }], ['hay', 0.85, { w: 16, h: 10 }]] },
    'Milk Bar': { wall: ['tiles', '#EAF4FA', '#FFFFFF'], floor: ['checker', '#F4F4F4', '#C8202A'], back: [['sign', 0.5, { y: 0.34, text: 'MILK BAR', c: '#2E6DB4' }], ['shelf', 0.5, { y: 0.46, w: 44, items: ['milk', 'milk', 'milk', 'milk'] }]], rear: [['counter', 0.5, { w: 58, c: '#F4F4F4', on: ['milk', 'icecream', 'milk'] }], ['stool', 0.13, { c: '#C8202A' }], ['stool', 0.87, { c: '#C8202A' }]] },
    'Cosy Sofa': { wall: ['floral', '#EADCC8', '#B86A4A'], floor: ['carpet', '#8A5A3A'], back: [['picture', 0.5, { y: 0.44 }]], rear: [['rug', 0.5, { c: '#C9A04A' }], ['sofa', 0.5, { c: '#5A7A9A', w: 46 }], ['lamp', 0.92]], light: 'warm' },
    'Ice Cream Parlour': { wall: ['stripes', '#F7D6E0', '#D6F2E6'], floor: ['checker', '#FFFFFF', '#F28AA0'], back: [['sign', 0.5, { y: 0.34, text: 'ICE CREAM', c: '#E06A8A' }]], rear: [['counter', 0.5, { w: 60, c: '#F2C6D6', on: ['tub', 'tub', 'tub', 'tub'] }], ['stool', 0.12, { c: '#5AB4A0' }]] },
    'Knitting Room': { wall: ['floral', '#EEE2D2', '#9A6AA8'], floor: ['carpet', '#7A5A6A'], back: [['picture', 0.5, { y: 0.44 }]], rear: [['rug', 0.5, { c: '#C9708A' }], ['armchair', 0.22, { c: '#7A9A5A', cushion: '#E8B33A' }], ['yarn', 0.8]] },
    'Bedroom': { wall: ['stripes', '#E8E6F4', '#F2F0FA'], floor: ['boards', '#C9A87A'], win: { x: 0.26, y: 0.45, w: 0.2, h: 0.14, view: 'night', curtains: '#6E5AA8' }, rear: [['rug', 0.5, { c: '#6E5AA8' }], ['bed', 0.7, { c: '#6E5AA8', w: 32 }]] },
    'Woolly Jumper Shop': { wall: ['planks', '#EADFCC'], floor: ['boards', '#B88A5E'], back: [['jumpers', 0.5, { y: 0.4 }]], rear: [['counter', 0.4, { w: 44, c: '#8A5A36', on: ['parcel', 'parcel'] }], ['yarn', 0.84]] },
    'Cloud Bedroom': { wall: ['night', '#3A4A8A'], floor: ['cloud', '#DDE6FF'], back: [['moon', 0.24, { y: 0.4, sky: '#3A4A8A' }]], rear: [['cloudbed', 0.7]], light: 'night' },
    'Lakeside Cottage': { wall: ['floral', '#EFE6D6', '#7AA0C0'], floor: ['boards', '#B88A5E'], win: { x: 0.5, y: 0.47, w: 0.3, h: 0.16, view: 'lake', curtains: '#7AA0C0' }, rear: [['armchair', 0.16, { c: '#7AA0C0', cushion: '#F2C14E' }], ['plant', 0.88]] },
    'Ballet Studio': { wall: ['panels', '#F4E1E8'], floor: ['boards', '#E2C29A'], back: [['mirror', 0.76, { y: 0.46 }], ['barre', 0.5, { y: 0.62 }]], rear: [['spotlight', 0.5]] },
    'Grand Ballroom': { wall: ['damask', '#2E3A6A', '#3E4A7A'], floor: ['marble', '#EDE6D8'], back: [['curtains', 0.5, { c: '#A3263A' }], ['chandelier', 0.5, { y: 0.37 }]], light: 'warm' },
    'Royal Palace': { wall: ['damask', '#8A1E2A', '#9A2E3A'], floor: ['marble', '#F2E8D6'], back: [['banner', 0.22, { y: 0.38 }], ['banner', 0.78, { y: 0.38 }]], rear: [['runner', 0.5, { c: '#A3263A' }], ['pillar', 0.2, { c: '#F2E8D6' }], ['pillar', 0.8, { c: '#F2E8D6' }], ['throne', 0.5]], light: 'warm' },
    'Pond Cabin': { wall: ['logs', '#8A6A48'], floor: ['boards', '#7A5A3A'], win: { x: 0.3, y: 0.45, w: 0.22, h: 0.15, view: 'lake', frame: '#5A3A22' }, rear: [['rug', 0.5, { c: '#5A8A6A' }], ['reeds', 0.8]] },
    'Kitchen': { wall: ['tiles', '#E2F0E4', '#FFFFFF'], floor: ['checker', '#F2F2EE', '#5A8A6A'], win: { x: 0.7, y: 0.45, w: 0.2, h: 0.14, view: 'garden', curtains: '#5A8A6A' }, back: [['pans', 0.28, { y: 0.38 }]], rear: [['stove', 0.24, { c: '#5A8A6A', pan: 1 }], ['table', 0.76, { on: ['bread', 'cup'], w: 18 }]] },
    'Laundry Room': { wall: ['tiles', '#E6EEF6', '#FFFFFF'], floor: ['tiles', '#D8E2EC'], back: [['washing', 0.5, { y: 0.36 }]], rear: [['washer', 0.2], ['basket', 0.82]] },
    // the zoo
    'Safari Tent': { wall: ['canvas', '#D8C29A', '#C9B080'], floor: ['boards', '#A8805A'], back: [['binoculars', 0.78, { y: 0.5 }]], rear: [['rug', 0.5, { c: '#B8642A' }], ['chest', 0.2], ['lantern', 0.86]] },
    'Sunny Lounge': { wall: ['stripes', '#F6E2A8', '#FBEFC8'], floor: ['boards', '#D9B88A'], win: { x: 0.5, y: 0.47, w: 0.34, h: 0.17, view: 'sunny', frame: '#FFFFFF' }, rear: [['sofa', 0.5, { c: '#E8A040', w: 46 }], ['plant', 0.08]], light: 'warm' },
    'Castle Hall': { wall: ['stone', '#8E8A86', '#6E6A66'], floor: ['stone', '#7E7A76'], win: { x: 0.5, y: 0.47, w: 0.16, h: 0.2, shape: 'arch', view: 'sky', frame: '#6E6A66' }, back: [['banner', 0.22, { y: 0.38, c: '#2E4A8A' }], ['banner', 0.78, { y: 0.38, c: '#2E4A8A' }], ['torch', 0.36, { y: 0.5 }], ['torch', 0.64, { y: 0.5 }]], rear: [['runner', 0.5, { c: '#2E4A8A' }]] },
    'Throne Room': { wall: ['damask', '#7A1E2A', '#8A2E3A'], floor: ['marble', '#EDE2CC'], back: [['chandelier', 0.5, { y: 0.36 }], ['banner', 0.18, { y: 0.4 }], ['banner', 0.82, { y: 0.4 }]], rear: [['runner', 0.5, { c: '#A3263A' }], ['throne', 0.5]], light: 'warm' },
    'Jungle Lodge': { wall: ['bamboo', '#C9B07A'], floor: ['boards', '#8A6A48'], win: { x: 0.5, y: 0.46, w: 0.3, h: 0.17, view: 'jungle', frame: '#6E5034' }, rear: [['plant', 0.1, { s: 1.4 }], ['plant', 0.9, { s: 1.2 }]] },
    'Bamboo Kitchen': { wall: ['bamboo', '#A8C27A'], floor: ['tiles', '#D8D2C0'], back: [['shelf', 0.3, { y: 0.45, items: ['bamboo', 'pot', 'bamboo'] }]], rear: [['counter', 0.72, { w: 40, c: '#8AA05A', on: ['bamboo', 'pot'] }], ['stove', 0.18, { c: '#5A7A3A' }]] },
    'Yoga Studio': { wall: ['panels', '#E8EFE6'], floor: ['boards', '#D9B88A'], win: { x: 0.5, y: 0.46, w: 0.3, h: 0.16, view: 'garden', frame: '#FFFFFF' }, rear: [['mat', 0.5, { c: '#5AB4A0' }], ['plant', 0.1], ['plant', 0.9]] },
    'Treehouse': { wall: ['planks', '#9A6A40'], floor: ['boards', '#7A5236'], win: { x: 0.28, y: 0.46, w: 0.2, shape: 'round', view: 'jungle', frame: '#6E4528' }, rear: [['lantern', 0.85]] },
    'Palace Garden': { wall: ['garden', '#8FC4EA', '#4E8A44'], floor: ['stone', '#D8D0C0'], rear: [['fountain', 0.78], ['plant', 0.14, { s: 1.2, flower: '#E84A6A' }]] },
    'Living Room': { wall: ['floral', '#E6D6C2', '#A8705A'], floor: ['carpet', '#8A6A4A'], back: [['picture', 0.3, { y: 0.42 }]], rear: [['rug', 0.5, { c: '#A8402A' }], ['sofa', 0.5, { c: '#4E7FB8', w: 52 }], ['lamp', 0.92]] },
    'Big Kitchen': { wall: ['tiles', '#F2EEE6', '#FFFFFF'], floor: ['checker', '#EDE6DA', '#4A5A6A'], back: [['pans', 0.5, { y: 0.38 }]], rear: [['stove', 0.15, { c: '#2E4A6A', pan: 1 }], ['table', 0.86, { on: ['bread', 'cup'], w: 16 }]] },
    'Bubble Bathhouse': { wall: ['tiles', '#5AB4B8', '#7CC6C8'], floor: ['tiles', '#E8E0D0'], back: [['bubbles', 0.5]], rear: [['pool', 0.5, { from: 4, c: '#7AD0E0', edgeC: '#E8E0D0' }], ['pillar', 0.2, { c: '#F2EEE6' }], ['pillar', 0.8, { c: '#F2EEE6' }]], front: [['waterfront', 0.5, { from: 9 }]], y: 12 },
    'High Loft': { wall: ['planks', '#D8C3A0'], ceil: ['attic', '#B8A280'], floor: ['boards', '#A8805A'], win: { x: 0.24, y: 0.5, w: 0.16, h: 0.18, view: 'sky', frame: '#8A6A48' }, rear: [['boxes', 0.17], ['plant', 0.88, { s: 1.2 }]] },
    'Treetop Kitchen': { wall: ['leaves', '#5E9A4A', '#7AB45A'], floor: ['boards', '#8A6A48'], rear: [['counter', 0.2, { w: 28, c: '#8A6A48', on: ['jar', 'pot'] }], ['stove', 0.84, { c: '#3E7A5A' }]] },
    'Tall Library': { wall: ['panels', '#5A3A2A'], floor: ['boards', '#7A5236'], rear: [['bookshelf', 0.16, { h: 66, w: 16 }], ['bookshelf', 0.84, { h: 66, w: 16, seed: 12 }]], light: 'warm' },
    'Stargazing Tower': { wall: ['night', '#141C40'], ceil: ['tower'], floor: ['boards', '#3A3A4A'], back: [['moon', 0.26, { y: 0.4, sky: '#141C40' }]], rear: [['telescope', 0.8]], light: 'night' },
    'Igloo': { wall: ['ice', '#DDEEF8'], ceil: ['dome'], floor: ['snow', '#EEF4FA'], rear: [['lantern', 0.8], ['fishpile', 0.22]], light: 'cool' },
    'Fish Kitchen': { wall: ['tiles', '#DCEEF4', '#FFFFFF'], floor: ['checker', '#EEF2F4', '#4A6A8A'], back: [['shelf', 0.3, { y: 0.45, items: ['fish', 'jar', 'fish'] }]], rear: [['counter', 0.72, { w: 38, c: '#9AB0C4', on: ['fish', 'fish'] }], ['stove', 0.18, { c: '#4A6A8A', pan: 1 }]] },
    'Ice Palace': { wall: ['ice', '#BFE0F4'], floor: ['ice', '#DDEEFA'], back: [['snowflakes', 0.5], ['chandelier', 0.5, { y: 0.37 }]], rear: [['pillar', 0.21, { c: '#DDEEFA' }], ['pillar', 0.79, { c: '#DDEEFA' }]], light: 'cool' },
    'Burrow Den': { wall: ['earth', '#C9A06A', '#B8905A'], floor: ['earth', '#B8905A'], win: { x: 0.7, y: 0.45, w: 0.18, shape: 'round', view: 'desert', frame: '#8A6A48' }, rear: [['rug', 0.5, { c: '#B8642A' }], ['lamp', 0.15]] },
    'Sandy Kitchen': { wall: ['tiles', '#F2E2C2', '#FFFFFF'], floor: ['tiles', '#E2CCA0'], win: { x: 0.3, y: 0.45, w: 0.2, h: 0.14, view: 'desert', frame: '#FFFFFF' }, rear: [['stove', 0.8, { c: '#C9802A', pan: 1 }], ['table', 0.2, { on: ['cup', 'bread'], w: 16 }]] },
    'Lookout Post': { wall: ['sky', '#9FD0F2'], floor: ['sand', '#E2C98A'], back: [['sun', 0.8, { y: 0.4 }]], rear: [['railing', 0.5, { c: '#8A5A36' }], ['flag', 0.12, { c: '#E74C3C' }]] },
    'Observatory': { wall: ['night', '#18204A'], ceil: ['dome'], floor: ['boards', '#3A3A4A'], rear: [['telescope', 0.76], ['table', 0.18, { on: ['globe', 'book'], w: 14, wood: '#5A4A3A' }]], light: 'night' },
    'Lagoon Lounge': { wall: ['stripes', '#F7E6DA', '#FFF4EC'], floor: ['boards', '#E2C29A'], win: { x: 0.5, y: 0.46, w: 0.36, h: 0.17, view: 'lagoon', frame: '#FFFFFF' }, back: [['palms', 0.5]], rear: [['sofa', 0.5, { c: '#F28AAE', w: 44 }]] },
    'Pink Kitchen': { wall: ['tiles', '#F6D6DE', '#FFFFFF'], floor: ['checker', '#FFF4F6', '#E87A9A'], back: [['pans', 0.3, { y: 0.38 }]], rear: [['stove', 0.78, { c: '#E87A9A', pan: 1 }], ['table', 0.2, { on: ['cake', 'cup'], w: 16, cloth: '#FFFFFF' }]] },
    'Pool Party': { wall: ['tiles', '#DDF0F8', '#FFFFFF'], floor: ['tiles', '#E8F4F8'], back: [['palms', 0.5], ['bunting', 0.5, { y: 0.36 }]], rear: [['pool', 0.5, { from: 4 }], ['ring', 0.2, { c: '#FF6B6B' }]], front: [['waterfront', 0.5, { from: 10 }]], y: 13 }
  };
  /* a soft light over the whole room */
  function lightUp(ctx, W, H, kind, t) {
    if (!kind) return;
    var g;
    if (kind === 'night') {
      g = ctx.createRadialGradient(W / 2, H * 0.62, W * 0.15, W / 2, H * 0.62, W * 0.75);
      g.addColorStop(0, 'rgba(255,214,150,0.06)'); g.addColorStop(1, 'rgba(8,10,30,0.36)');
    } else if (kind === 'warm') {
      g = ctx.createRadialGradient(W / 2, H * 0.5, W * 0.05, W / 2, H * 0.5, W * 0.8);
      g.addColorStop(0, 'rgba(255,214,150,0.14)'); g.addColorStop(1, 'rgba(90,50,20,0.14)');
    } else if (kind === 'cool') {
      g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(200,230,255,0.16)'); g.addColorStop(1, 'rgba(160,200,240,0.06)');
    } else if (kind === 'dusk') {
      g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(255,150,100,0.16)'); g.addColorStop(1, 'rgba(40,30,60,0.2)');
    } else if (kind === 'water') {
      ctx.fillStyle = 'rgba(80,170,200,0.1)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      for (var i = 0; i < 6; i++) { ell(ctx, W * ((i * 0.31 + t * 0.03) % 1), H * (0.3 + (i % 3) * 0.2), W * 0.12, W * 0.03, 0.3); ctx.fill(); }
      return;
    }
    if (g) { ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  }
  function things(ctx, W, H, list, t) {
    (list || []).forEach(function (p) {
      var fn = Z.P[p[0]];
      if (fn) { ctx.save(); try { fn(ctx, W, H, p[1], p[2] || {}, t); } finally { ctx.restore(); } }
    });
  }
  var HOME_I = { h1: 0, h2: 1, h3: 2, h4: 3, h5: 4 };
  function roomFor(id, h) {
    var ty = WC.animals && WC.animals.type(id);
    var name = ty ? ty.homes[HOME_I[h] || 0] : '';
    return ROOMS[name] || ROOMS['Leaf Bed'];
  }
  /* an animal at home: what goes inside its jar. mk: this catch's { seed }, which sets which way it faces and nudges it */
  function paint(ctx, W, H, id, h, t, mk) {
    var room = roomFor(id, h), u = W / 100;
    var seed = mk && mk.seed ? mk.seed >>> 0 : 0;
    var dir = seed ? (seed & 1 ? -1 : 1) : 1, nudge = seed ? ((seed >>> 3) % 9 - 4) * 0.006 : 0;
    Z.wall(ctx, W, H, room.wall[0], room.wall[1], room.wall[2], t);
    if (room.ceil) Z.ceiling(ctx, W, H, room.ceil[0], room.ceil[1] || '#8A6A48');
    if (room.win) Z.win(ctx, W, H, room.win, t);
    things(ctx, W, H, room.back, t);
    Z.floor(ctx, W, H, room.floor[0], room.floor[1], room.floor[2], t);
    things(ctx, W, H, room.rear, t);
    drawAnimal(ctx, id, W * ((room.at || 0.5) + nudge), H * Z.FY + u * (room.y === undefined ? 9 : room.y), u, dir, t, room.s || 1);
    things(ctx, W, H, room.front, t);
    lightUp(ctx, W, H, room.light, t);
  }

  WC.zoo = { A: A, ROOMS: ROOMS, draw: drawAnimal, paint: paint, roomFor: roomFor };
  WC.zooAnimals = WC.zoo;
})(typeof window !== 'undefined' ? window : globalThis);
