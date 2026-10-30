/* FRZFRM Weather Catch: Hide & seek. One of the animals hides in a busy picture, among things the same colours as it
   (a brown dog among shoes and boots), and you tap it to find it. Each animal has a few places it can hide in, and each
   place comes in three layouts, so there are hundreds of pictures. The same picture always has the same things in the
   same places, but the animal hides somewhere new every time it's shown.
   Pictures are 100 units wide and 125 tall. Nothing in here touches the page: app.js runs the game. */
(function (root) {
  'use strict';
  var WC = root.WC = root.WC || {};
  var K = WC.kit, ZA = WC.zoo;
  if (!K || !ZA) return;
  var TAU = Math.PI * 2;
  var circ = K.circ, ell = K.ell, tri = K.tri, poly = K.poly, rr = K.rr, shade = K.shade;
  var HU = 125; // the picture's height, in units
  function pen(ctx, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
  function sg(ctx, a, b, c, d) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  function rnd(seed) { var s = seed >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function arch(ctx, x, y, w, h) { ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w, y - h + w); ctx.arc(x, y - h + w, w, Math.PI, TAU); ctx.lineTo(x + w, y); ctx.closePath(); }

  /* ---------- the things to hide among ----------
     Each stands on (0, 0), about 10v wide, up is minus. c is its main colour, c2 a second one */
  var I = {};
  I.shoe = function (ctx, v, c, c2) {
    ctx.fillStyle = c2 || '#2A2420'; rr(ctx, -5 * v, -1.3 * v, 10.6 * v, 1.5 * v, 0.6 * v); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-5 * v, -1 * v); ctx.lineTo(-5 * v, -4.8 * v); ctx.quadraticCurveTo(-4.6 * v, -6 * v, -2.6 * v, -5.8 * v);
    ctx.lineTo(0.4 * v, -5.4 * v); ctx.quadraticCurveTo(2.4 * v, -3.4 * v, 4.4 * v, -3.1 * v); ctx.quadraticCurveTo(5.8 * v, -2.7 * v, 5.5 * v, -1 * v); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(c, -0.3); ell(ctx, -2.8 * v, -5.2 * v, 1.6 * v, 0.6 * v); ctx.fill();
    pen(ctx, shade(c, 0.45), 0.35 * v); sg(ctx, -0.6 * v, -5 * v, 0.8 * v, -4.2 * v); sg(ctx, -0.2 * v, -4.2 * v, 1.2 * v, -3.6 * v);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ell(ctx, 2.6 * v, -2.6 * v, 1.6 * v, 0.5 * v, -0.2); ctx.fill();
  };
  I.boot = function (ctx, v, c) {
    ctx.fillStyle = c; rr(ctx, -3.6 * v, -11 * v, 4.8 * v, 11 * v, 1 * v); ctx.fill(); rr(ctx, -3.6 * v, -3.4 * v, 8.6 * v, 3.4 * v, 1.6 * v); ctx.fill();
    ctx.fillStyle = shade(c, 0.22); rr(ctx, -3.8 * v, -11.4 * v, 5.2 * v, 1.4 * v, 0.6 * v); ctx.fill();
    ctx.fillStyle = shade(c, -0.35); ctx.fillRect(-3.6 * v, -0.7 * v, 8.6 * v, 0.7 * v);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(-2.8 * v, -9.6 * v, 0.8 * v, 6 * v);
  };
  I.slipper = function (ctx, v, c, c2) {
    ctx.fillStyle = shade(c, -0.15); ell(ctx, 0, -1.4 * v, 5.2 * v, 1.8 * v); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(1.4 * v, -1.6 * v, 3.6 * v, 2.8 * v, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c2 || shade(c, 0.4); circ(ctx, 3.4 * v, -3.6 * v, 1.4 * v); ctx.fill();
    pen(ctx, shade(c, 0.3), 0.3 * v); for (var i = 0; i < 6; i++) sg(ctx, (-1.4 + i * 1.1) * v, -3.6 * v + Math.abs(i - 2.5) * 0.4 * v, (-1.2 + i * 1.1) * v, -2.8 * v + Math.abs(i - 2.5) * 0.4 * v);
  };
  I.bag = function (ctx, v, c, c2) {
    pen(ctx, shade(c, -0.25), 0.9 * v); ctx.beginPath(); ctx.arc(0, -6.4 * v, 2.8 * v, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = c; poly(ctx, [-4.6 * v, -6.6 * v, 4.6 * v, -6.6 * v, 5.4 * v, 0, -5.4 * v, 0]); ctx.fill();
    ctx.fillStyle = shade(c, -0.18); poly(ctx, [-4.6 * v, -6.6 * v, 4.6 * v, -6.6 * v, 4.8 * v, -4.4 * v, -4.8 * v, -4.4 * v]); ctx.fill();
    ctx.fillStyle = c2 || '#E2B84A'; rr(ctx, -0.9 * v, -5 * v, 1.8 * v, 1.4 * v, 0.4 * v); ctx.fill();
  };
  I.teddy = function (ctx, v, c, c2) {
    var m = c2 || shade(c, 0.45);
    ctx.fillStyle = c; ell(ctx, 0, -3.4 * v, 3.6 * v, 3.4 * v); ctx.fill();
    ell(ctx, -3.4 * v, -4 * v, 1.2 * v, 1.9 * v, 0.4); ctx.fill(); ell(ctx, 3.4 * v, -4 * v, 1.2 * v, 1.9 * v, -0.4); ctx.fill();
    circ(ctx, -2.6 * v, -10.6 * v, 1.3 * v); ctx.fill(); circ(ctx, 2.6 * v, -10.6 * v, 1.3 * v); ctx.fill();
    circ(ctx, 0, -8.4 * v, 3.1 * v); ctx.fill();
    ctx.fillStyle = m; circ(ctx, -2.6 * v, -10.6 * v, 0.6 * v); ctx.fill(); circ(ctx, 2.6 * v, -10.6 * v, 0.6 * v); ctx.fill();
    ell(ctx, 0, -7.4 * v, 1.5 * v, 1.1 * v); ctx.fill(); ell(ctx, -2 * v, -0.8 * v, 1.5 * v, 1 * v); ctx.fill(); ell(ctx, 2 * v, -0.8 * v, 1.5 * v, 1 * v); ctx.fill();
    ell(ctx, 0, -3 * v, 2 * v, 2.1 * v); ctx.fill();
    ctx.fillStyle = '#1E1618'; circ(ctx, -1.1 * v, -9 * v, 0.4 * v); ctx.fill(); circ(ctx, 1.1 * v, -9 * v, 0.4 * v); ctx.fill(); ell(ctx, 0, -7.8 * v, 0.6 * v, 0.4 * v); ctx.fill();
  };
  I.ball = function (ctx, v, c, c2) {
    ctx.fillStyle = c; circ(ctx, 0, -4 * v, 4 * v); ctx.fill();
    ctx.save(); circ(ctx, 0, -4 * v, 4 * v); ctx.clip();
    ctx.fillStyle = c2 || '#FFFFFF'; ctx.fillRect(-4 * v, -4.8 * v, 8 * v, 1.6 * v);
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.beginPath(); ctx.arc(0, -4 * v, 4 * v, 0.2, Math.PI - 0.2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ell(ctx, -1.4 * v, -6 * v, 1.2 * v, 0.7 * v, -0.5); ctx.fill();
  };
  I.hat = function (ctx, v, c, c2) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -2.2 * v, 4.4 * v, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c2 || shade(c, -0.25); rr(ctx, -4.8 * v, -2.8 * v, 9.6 * v, 2.8 * v, 1 * v); ctx.fill();
    pen(ctx, shade(c, -0.2), 0.3 * v); for (var i = -3; i <= 3; i++) sg(ctx, i * 1.1 * v, -3 * v, i * 0.7 * v, -6 * v);
    ctx.fillStyle = c2 || shade(c, 0.35); circ(ctx, 0, -7 * v, 1.5 * v); ctx.fill();
  };
  I.scarf = function (ctx, v, c, c2) {
    var path = function () { ctx.beginPath(); ctx.moveTo(-5 * v, -1.4 * v); ctx.quadraticCurveTo(-2 * v, -6 * v, 1 * v, -2.4 * v); ctx.quadraticCurveTo(3.4 * v, 0.4 * v, 5 * v, -3.6 * v); };
    pen(ctx, c, 2.6 * v); path(); ctx.stroke();
    ctx.setLineDash([1.2 * v, 1.6 * v]); pen(ctx, c2 || shade(c, 0.45), 2.6 * v); ctx.lineCap = 'butt'; path(); ctx.stroke(); ctx.setLineDash([]);
    pen(ctx, c, 0.4 * v); for (var i = 0; i < 4; i++) sg(ctx, (4.2 + i * 0.5) * v, -4.6 * v, (4.6 + i * 0.6) * v, -5.8 * v);
  };
  I.glove = function (ctx, v, c) {
    ctx.fillStyle = c; rr(ctx, -2.8 * v, -6 * v, 5.6 * v, 6 * v, 1.6 * v); ctx.fill();
    for (var i = 0; i < 4; i++) { rr(ctx, (-2.8 + i * 1.45) * v, (-9.4 + Math.abs(i - 1.5) * 0.6) * v, 1.3 * v, 4.4 * v, 0.65 * v); ctx.fill(); }
    ctx.save(); ctx.translate(2.6 * v, -4.4 * v); ctx.rotate(0.7); rr(ctx, -0.65 * v, -3 * v, 1.3 * v, 3.4 * v, 0.65 * v); ctx.fill(); ctx.restore();
    ctx.fillStyle = shade(c, -0.25); ctx.fillRect(-2.8 * v, -1.4 * v, 5.6 * v, 1.4 * v);
  };
  I.leaf = function (ctx, v, c) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-5 * v, -1.6 * v); ctx.quadraticCurveTo(-1 * v, -6 * v, 5 * v, -2.4 * v); ctx.quadraticCurveTo(0, 1.6 * v, -5 * v, -1.6 * v); ctx.fill();
    pen(ctx, shade(c, -0.3), 0.3 * v); ctx.beginPath(); ctx.moveTo(-5.6 * v, -1.4 * v); ctx.quadraticCurveTo(0, -2.6 * v, 5 * v, -2.4 * v); ctx.stroke();
    for (var i = -1; i <= 2; i++) { sg(ctx, i * 1.6 * v, -2.2 * v, i * 1.6 * v + 1.2 * v, -3.8 * v); sg(ctx, i * 1.6 * v, -2.1 * v, i * 1.6 * v + 1 * v, -0.8 * v); }
  };
  I.conker = function (ctx, v, c) {
    ctx.fillStyle = c; circ(ctx, 0, -2.8 * v, 2.8 * v); ctx.fill();
    ctx.fillStyle = '#D8C8A0'; ell(ctx, 0, -1 * v, 1.7 * v, 0.9 * v); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(ctx, -1 * v, -4 * v, 0.9 * v, 0.5 * v, -0.5); ctx.fill();
  };
  I.acorn = function (ctx, v, c) {
    ctx.fillStyle = c; ell(ctx, 0, -2.6 * v, 1.9 * v, 2.6 * v); ctx.fill();
    ctx.fillStyle = shade(c, -0.4); ell(ctx, 0, -4.6 * v, 2.4 * v, 1.2 * v); ctx.fill();
    pen(ctx, shade(c, -0.45), 0.5 * v); sg(ctx, 0, -5.6 * v, 0.6 * v, -6.6 * v);
  };
  I.pinecone = function (ctx, v, c) {
    ctx.fillStyle = shade(c, -0.15); ell(ctx, 0, -4.4 * v, 2.8 * v, 4.4 * v); ctx.fill();
    ctx.fillStyle = shade(c, 0.12);
    for (var r = 0; r < 5; r++) for (var k = -1; k <= 1; k++) { var w = 2.6 - Math.abs(r - 2) * 0.5; ell(ctx, k * w * 0.62 * v, (-1.2 - r * 1.6) * v, 0.9 * v, 0.6 * v); ctx.fill(); }
  };
  I.pumpkin = function (ctx, v, c) {
    ctx.fillStyle = shade(c, -0.15); ell(ctx, -2.2 * v, -3.2 * v, 2.8 * v, 3.2 * v); ctx.fill(); ell(ctx, 2.2 * v, -3.2 * v, 2.8 * v, 3.2 * v); ctx.fill();
    ctx.fillStyle = c; ell(ctx, 0, -3.3 * v, 2.8 * v, 3.3 * v); ctx.fill();
    ctx.fillStyle = '#5A6A2A'; rr(ctx, -0.5 * v, -7.4 * v, 1 * v, 1.8 * v, 0.4 * v); ctx.fill();
  };
  I.mushroom = function (ctx, v, c) {
    ctx.fillStyle = '#F2EAD8'; rr(ctx, -1.2 * v, -5 * v, 2.4 * v, 5 * v, 0.8 * v); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -5 * v, 4.4 * v, 3.4 * v, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; [[-2, -6.4], [0.8, -7.4], [2.4, -5.8]].forEach(function (p) { circ(ctx, p[0] * v, p[1] * v, 0.6 * v); ctx.fill(); });
  };
  I.stick = function (ctx, v, c) {
    pen(ctx, c, 1.1 * v); sg(ctx, -5 * v, -0.8 * v, 5 * v, -2.4 * v); pen(ctx, c, 0.6 * v); sg(ctx, 1 * v, -1.6 * v, 3 * v, -4.2 * v);
    ctx.fillStyle = '#6A8A3A'; ell(ctx, 3.2 * v, -4.6 * v, 1.2 * v, 0.6 * v, -0.6); ctx.fill();
  };
  I.block = function (ctx, v, c, c2, r) {
    ctx.fillStyle = c; rr(ctx, -3.6 * v, -7.2 * v, 7.2 * v, 7.2 * v, 0.6 * v); ctx.fill();
    pen(ctx, shade(c, 0.35), 0.4 * v); ctx.strokeRect(-2.8 * v, -6.4 * v, 5.6 * v, 5.6 * v);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '800 ' + Math.max(1, 4.4 * v) + 'px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ABCDEFGHKMPRSTW'.charAt(Math.floor((r || 0) * 15)), 0, -3.4 * v);
  };
  I.toycar = function (ctx, v, c) {
    ctx.fillStyle = c; rr(ctx, -5 * v, -4 * v, 10 * v, 3 * v, 1 * v); ctx.fill(); rr(ctx, -2.6 * v, -6.4 * v, 5 * v, 2.8 * v, 1 * v); ctx.fill();
    ctx.fillStyle = 'rgba(200,235,255,0.9)'; rr(ctx, -2 * v, -5.9 * v, 1.8 * v, 1.8 * v, 0.4 * v); ctx.fill(); rr(ctx, 0.4 * v, -5.9 * v, 1.8 * v, 1.8 * v, 0.4 * v); ctx.fill();
    ctx.fillStyle = '#26262C'; circ(ctx, -2.8 * v, -1 * v, 1.3 * v); ctx.fill(); circ(ctx, 2.8 * v, -1 * v, 1.3 * v); ctx.fill();
    ctx.fillStyle = '#C8CCD6'; circ(ctx, -2.8 * v, -1 * v, 0.5 * v); ctx.fill(); circ(ctx, 2.8 * v, -1 * v, 0.5 * v); ctx.fill();
  };
  I.rubberduck = function (ctx, v, c) {
    ctx.fillStyle = c; ell(ctx, -0.6 * v, -2.4 * v, 4 * v, 2.4 * v); ctx.fill(); circ(ctx, 2 * v, -5.6 * v, 2 * v); ctx.fill();
    ctx.fillStyle = '#F07A20'; ell(ctx, 4.4 * v, -5.2 * v, 1.3 * v, 0.6 * v); ctx.fill();
    ctx.fillStyle = '#1E1618'; circ(ctx, 2.6 * v, -6.2 * v, 0.4 * v); ctx.fill();
    ctx.fillStyle = shade(c, -0.12); ell(ctx, -1.4 * v, -3 * v, 2 * v, 1 * v, -0.2); ctx.fill();
  };
  I.shell = function (ctx, v, c) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -0.4 * v);
    for (var i = 0; i <= 6; i++) { var a = Math.PI * (1.05 + i * 0.15); ctx.lineTo(Math.cos(a) * 4.4 * v, -0.6 * v + Math.sin(a) * 4.4 * v); }
    ctx.closePath(); ctx.fill();
    pen(ctx, shade(c, -0.2), 0.3 * v); for (var j = 0; j < 6; j++) { var b = Math.PI * (1.12 + j * 0.15); sg(ctx, 0, -0.4 * v, Math.cos(b) * 4 * v, -0.6 * v + Math.sin(b) * 4 * v); }
    ctx.fillStyle = shade(c, -0.1); rr(ctx, -1.2 * v, -0.8 * v, 2.4 * v, 1 * v, 0.3 * v); ctx.fill();
  };
  I.bucket = function (ctx, v, c) {
    ctx.fillStyle = c; poly(ctx, [-3.4 * v, -6.6 * v, 3.4 * v, -6.6 * v, 2.6 * v, 0, -2.6 * v, 0]); ctx.fill();
    ctx.fillStyle = shade(c, 0.25); rr(ctx, -3.8 * v, -7 * v, 7.6 * v, 1 * v, 0.4 * v); ctx.fill();
    pen(ctx, shade(c, -0.3), 0.4 * v); ctx.beginPath(); ctx.arc(0, -6.6 * v, 3.2 * v, Math.PI, TAU); ctx.stroke();
  };
  I.pebble = function (ctx, v, c) {
    ctx.fillStyle = c; ell(ctx, 0, -1.8 * v, 4.2 * v, 2.1 * v); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ell(ctx, -1.4 * v, -2.8 * v, 1.8 * v, 0.6 * v); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ell(ctx, 0.6 * v, -0.6 * v, 3.4 * v, 0.6 * v); ctx.fill();
  };
  I.rock = function (ctx, v, c) { K.rock(ctx, 0, 0, 5 * v, 7 * v, c); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(1 * v, 0); ctx.quadraticCurveTo(3.6 * v, -5 * v, 5 * v, 0); ctx.fill(); };
  I.seaweed = function (ctx, v, c) {
    for (var i = -1; i <= 1; i++) {
      pen(ctx, i ? c : shade(c, 0.2), 1.1 * v);
      ctx.beginPath(); ctx.moveTo(i * 1.4 * v, 0); ctx.bezierCurveTo(i * 1.4 * v + 2 * v, -3 * v, i * 1.4 * v - 2 * v, -6 * v, i * 2 * v + 0.6 * v, (-9 + Math.abs(i) * 2) * v); ctx.stroke();
    }
  };
  I.flower = function (ctx, v, c) {
    pen(ctx, '#4E8A3A', 0.6 * v); sg(ctx, 0, 0, 0.4 * v, -6 * v);
    ctx.fillStyle = '#5E9A44'; ell(ctx, -1.6 * v, -2.4 * v, 1.6 * v, 0.6 * v, 0.5); ctx.fill(); ell(ctx, 1.8 * v, -3.6 * v, 1.6 * v, 0.6 * v, -0.5); ctx.fill();
    ctx.fillStyle = c; for (var i = 0; i < 6; i++) { var a = i * TAU / 6; ell(ctx, 0.4 * v + Math.cos(a) * 1.9 * v, -7.2 * v + Math.sin(a) * 1.9 * v, 1.5 * v, 1 * v, a); ctx.fill(); }
    ctx.fillStyle = '#F2C230'; circ(ctx, 0.4 * v, -7.2 * v, 1.1 * v); ctx.fill();
  };
  I.sweet = function (ctx, v, c, c2) {
    ctx.fillStyle = c; tri(ctx, -3 * v, -2 * v, -5 * v, -3.4 * v, -5 * v, -0.6 * v); ctx.fill(); tri(ctx, 3 * v, -2 * v, 5 * v, -3.4 * v, 5 * v, -0.6 * v); ctx.fill();
    ell(ctx, 0, -2 * v, 3.2 * v, 2 * v); ctx.fill();
    ctx.save(); ell(ctx, 0, -2 * v, 3.2 * v, 2 * v); ctx.clip();
    ctx.fillStyle = c2 || '#FFFFFF'; for (var i = -3; i <= 3; i++) { ctx.save(); ctx.translate(i * 1.8 * v, -2 * v); ctx.rotate(0.6); ctx.fillRect(-0.4 * v, -3 * v, 0.8 * v, 6 * v); ctx.restore(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ell(ctx, -1 * v, -3 * v, 1.2 * v, 0.5 * v); ctx.fill();
  };
  I.lollipop = function (ctx, v, c, c2) {
    pen(ctx, '#F4F0E8', 0.7 * v); sg(ctx, 0, 0, 0, -5.4 * v);
    ctx.fillStyle = c; circ(ctx, 0, -7.6 * v, 2.8 * v); ctx.fill();
    pen(ctx, c2 || '#FFFFFF', 0.6 * v); ctx.beginPath();
    for (var i = 0; i < 26; i++) { var a = i * 0.5, r = i * 0.1 * v; ctx.lineTo(Math.cos(a) * r, -7.6 * v + Math.sin(a) * r); }
    ctx.stroke();
  };
  I.cupcake = function (ctx, v, c, c2) {
    ctx.fillStyle = c2 || '#F2E6D2'; poly(ctx, [-3.4 * v, -4 * v, 3.4 * v, -4 * v, 2.6 * v, 0, -2.6 * v, 0]); ctx.fill();
    pen(ctx, shade(c2 || '#F2E6D2', -0.18), 0.3 * v); for (var i = -2; i <= 2; i++) sg(ctx, i * 1.3 * v, -3.8 * v, i * 1 * v, -0.2 * v);
    ctx.fillStyle = c; ell(ctx, 0, -4.6 * v, 3.8 * v, 1.6 * v); ctx.fill(); ell(ctx, 0, -6 * v, 2.8 * v, 1.4 * v); ctx.fill(); ell(ctx, 0, -7.2 * v, 1.6 * v, 1 * v); ctx.fill();
    ctx.fillStyle = '#C8202A'; circ(ctx, 0.3 * v, -8.4 * v, 0.9 * v); ctx.fill();
  };
  I.sock = function (ctx, v, c, c2) {
    ctx.fillStyle = c; rr(ctx, -3.4 * v, -9 * v, 3.6 * v, 8 * v, 1 * v); ctx.fill(); rr(ctx, -3.4 * v, -3.4 * v, 8.4 * v, 3.4 * v, 1.6 * v); ctx.fill();
    ctx.fillStyle = c2 || shade(c, 0.4); ctx.fillRect(-3.4 * v, -9 * v, 3.6 * v, 1.3 * v); ell(ctx, 4 * v, -1.7 * v, 1.2 * v, 1.6 * v); ctx.fill();
    ctx.fillRect(-3.4 * v, -6.4 * v, 3.6 * v, 0.7 * v);
  };
  I.shirt = function (ctx, v, c) {
    ctx.fillStyle = c; poly(ctx, [-2.6 * v, -9 * v, 2.6 * v, -9 * v, 5.4 * v, -7 * v, 4.2 * v, -4.8 * v, 3 * v, -5.4 * v, 3.2 * v, 0, -3.2 * v, 0, -3 * v, -5.4 * v, -4.2 * v, -4.8 * v, -5.4 * v, -7 * v]); ctx.fill();
    ctx.fillStyle = shade(c, -0.2); ctx.beginPath(); ctx.arc(0, -9 * v, 1.4 * v, 0, Math.PI); ctx.fill();
    pen(ctx, shade(c, -0.12), 0.35 * v); sg(ctx, -1.6 * v, -4 * v, 1.4 * v, -2.6 * v);
  };
  I.towel = function (ctx, v, c, c2) {
    ctx.fillStyle = c; rr(ctx, -5 * v, -4.6 * v, 10 * v, 4.6 * v, 1 * v); ctx.fill();
    ctx.fillStyle = shade(c, 0.18); rr(ctx, -5 * v, -4.6 * v, 10 * v, 1.6 * v, 0.8 * v); ctx.fill();
    ctx.fillStyle = c2 || '#FFFFFF'; ctx.fillRect(-5 * v, -2.4 * v, 10 * v, 0.6 * v);
  };
  I.pillow = function (ctx, v, c, c2) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-5 * v, -6 * v); ctx.quadraticCurveTo(0, -4.6 * v, 5 * v, -6 * v); ctx.quadraticCurveTo(3.8 * v, -3 * v, 5 * v, 0); ctx.quadraticCurveTo(0, -1.4 * v, -5 * v, 0); ctx.quadraticCurveTo(-3.8 * v, -3 * v, -5 * v, -6 * v); ctx.fill();
    pen(ctx, c2 || shade(c, -0.15), 0.35 * v); ctx.strokeRect(-3 * v, -4.6 * v, 6 * v, 3.2 * v);
  };
  I.snowball = function (ctx, v, c) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, 5 * v, 4.4 * v, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(150,170,200,0.25)'; ctx.beginPath(); ctx.ellipse(1 * v, 0, 4 * v, 2.6 * v, 0, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ell(ctx, -1.6 * v, -3 * v, 1.6 * v, 0.6 * v); ctx.fill();
  };
  I.reed = function (ctx, v, c) {
    pen(ctx, c, 0.6 * v); sg(ctx, 0, 0, 0.6 * v, -10 * v); sg(ctx, -1 * v, 0, -2.6 * v, -7 * v); sg(ctx, 1 * v, 0, 2.8 * v, -6 * v);
    ctx.fillStyle = '#7A4A28'; rr(ctx, -0.4 * v, -10.4 * v, 1.6 * v, 3.6 * v, 0.8 * v); ctx.fill();
  };
  I.lilypad = function (ctx, v, c) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -1.6 * v, 5 * v, 2 * v, 0, 0.25, TAU - 0.25); ctx.lineTo(0, -1.6 * v); ctx.closePath(); ctx.fill();
    pen(ctx, shade(c, 0.25), 0.25 * v); for (var i = 0; i < 5; i++) { var a = 0.6 + i * 1.1; sg(ctx, 0, -1.6 * v, Math.cos(a) * 4 * v, -1.6 * v + Math.sin(a) * 1.6 * v); }
  };
  /* fruit and veg: c picks the kind too */
  I.apple = function (ctx, v, c) {
    ctx.fillStyle = c; ell(ctx, -1.2 * v, -3 * v, 2.6 * v, 3 * v); ctx.fill(); ell(ctx, 1.2 * v, -3 * v, 2.6 * v, 3 * v); ctx.fill();
    pen(ctx, '#6E4528', 0.5 * v); sg(ctx, 0, -5.6 * v, 0.4 * v, -7.2 * v);
    ctx.fillStyle = '#5E9A44'; ell(ctx, 1.4 * v, -6.8 * v, 1.2 * v, 0.5 * v, -0.4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(ctx, -1.8 * v, -4.4 * v, 0.7 * v, 1 * v, 0.3); ctx.fill();
  };
  I.orange = function (ctx, v, c) {
    ctx.fillStyle = c; circ(ctx, 0, -3.4 * v, 3.4 * v); ctx.fill();
    ctx.fillStyle = shade(c, -0.15); for (var i = 0; i < 6; i++) { circ(ctx, Math.cos(i * 2.1) * 1.8 * v, -3.4 * v + Math.sin(i * 2.1) * 1.8 * v, 0.25 * v); ctx.fill(); }
    ctx.fillStyle = '#5E7A2A'; circ(ctx, 0.4 * v, -6.6 * v, 0.5 * v); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ell(ctx, -1.4 * v, -4.8 * v, 1 * v, 0.6 * v, -0.4); ctx.fill();
  };
  I.potato = function (ctx, v, c) {
    ctx.fillStyle = c; ell(ctx, 0, -2.6 * v, 4.4 * v, 2.6 * v, -0.1); ctx.fill(); ell(ctx, 2 * v, -3.2 * v, 2.4 * v, 2 * v); ctx.fill();
    ctx.fillStyle = shade(c, -0.3); [[-2, -3], [0.6, -1.6], [2.6, -3.6], [-1, -1.4]].forEach(function (p) { circ(ctx, p[0] * v, p[1] * v, 0.3 * v); ctx.fill(); });
  };
  I.lemon = function (ctx, v, c) {
    ctx.fillStyle = c; ell(ctx, 0, -2.8 * v, 3.8 * v, 2.6 * v); ctx.fill(); circ(ctx, -3.8 * v, -2.8 * v, 0.7 * v); ctx.fill(); circ(ctx, 3.8 * v, -2.8 * v, 0.7 * v); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ell(ctx, -1 * v, -4 * v, 1.4 * v, 0.5 * v); ctx.fill();
  };
  I.banana = function (ctx, v, c) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-5 * v, -4 * v); ctx.quadraticCurveTo(-1 * v, 2 * v, 5 * v, -4.6 * v); ctx.quadraticCurveTo(0, -1.4 * v, -5 * v, -4 * v); ctx.fill();
    ctx.fillStyle = '#5A4A2A'; circ(ctx, -5 * v, -4 * v, 0.5 * v); ctx.fill(); circ(ctx, 5 * v, -4.6 * v, 0.5 * v); ctx.fill();
  };
  I.lettuce = function (ctx, v, c) {
    for (var i = 0; i < 7; i++) { var a = Math.PI + i * Math.PI / 6; ctx.fillStyle = i % 2 ? c : shade(c, 0.18); circ(ctx, Math.cos(a) * 2.6 * v, -2.6 * v + Math.sin(a) * 2.4 * v, 2.2 * v); ctx.fill(); }
    ctx.fillStyle = shade(c, 0.35); circ(ctx, 0, -3 * v, 2 * v); ctx.fill();
  };
  I.pepper = function (ctx, v, c) {
    ctx.fillStyle = c; rr(ctx, -3 * v, -6 * v, 6 * v, 6 * v, 2.4 * v); ctx.fill();
    ctx.fillStyle = shade(c, -0.2); ctx.fillRect(-0.4 * v, -5.6 * v, 0.8 * v, 5 * v);
    ctx.fillStyle = '#3E7A3A'; rr(ctx, -0.6 * v, -7.6 * v, 1.2 * v, 2 * v, 0.5 * v); ctx.fill();
  };
  I.balloon = function (ctx, v, c) {
    pen(ctx, 'rgba(90,90,100,0.7)', 0.3 * v); ctx.beginPath(); ctx.moveTo(0, -4 * v); ctx.quadraticCurveTo(1 * v, -2 * v, 0, 0); ctx.stroke();
    ctx.fillStyle = c; ell(ctx, 0, -8 * v, 3.2 * v, 3.9 * v); ctx.fill(); tri(ctx, -0.7 * v, -3.8 * v, 0.7 * v, -3.8 * v, 0, -4.6 * v); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ell(ctx, -1.2 * v, -9.4 * v, 0.8 * v, 1.3 * v, -0.4); ctx.fill();
  };
  I.present = function (ctx, v, c, c2) {
    ctx.fillStyle = c; ctx.fillRect(-3.8 * v, -6.6 * v, 7.6 * v, 6.6 * v);
    ctx.fillStyle = c2 || '#F2D03A'; ctx.fillRect(-0.6 * v, -6.6 * v, 1.2 * v, 6.6 * v); ctx.fillRect(-3.8 * v, -4 * v, 7.6 * v, 1.2 * v);
    ell(ctx, -1.4 * v, -7.4 * v, 1.4 * v, 0.9 * v, 0.4); ctx.fill(); ell(ctx, 1.4 * v, -7.4 * v, 1.4 * v, 0.9 * v, -0.4); ctx.fill();
  };
  I.partyhat = function (ctx, v, c, c2) {
    ctx.fillStyle = c; tri(ctx, -3.4 * v, 0, 3.4 * v, 0, 0, -9 * v); ctx.fill();
    ctx.save(); tri(ctx, -3.4 * v, 0, 3.4 * v, 0, 0, -9 * v); ctx.clip();
    ctx.fillStyle = c2 || '#FFFFFF'; for (var i = 0; i < 4; i++) ctx.fillRect(-4 * v, (-1.6 - i * 2.2) * v, 8 * v, 0.8 * v);
    ctx.restore();
    ctx.fillStyle = c2 || '#FFFFFF'; circ(ctx, 0, -9.2 * v, 1.1 * v); ctx.fill();
  };
  I.feather = function (ctx, v, c) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-5 * v, -0.6 * v); ctx.quadraticCurveTo(0, -5 * v, 5 * v, -3 * v); ctx.quadraticCurveTo(0, 1 * v, -5 * v, -0.6 * v); ctx.fill();
    pen(ctx, shade(c, -0.2), 0.3 * v); ctx.beginPath(); ctx.moveTo(-5.6 * v, 0); ctx.quadraticCurveTo(0, -2.4 * v, 5 * v, -3 * v); ctx.stroke();
  };
  I.haybale = function (ctx, v, c) {
    ctx.fillStyle = c; rr(ctx, -5 * v, -6 * v, 10 * v, 6 * v, 1.4 * v); ctx.fill();
    pen(ctx, shade(c, -0.2), 0.3 * v); for (var i = 1; i < 5; i++) sg(ctx, -4.4 * v, -6 * v + i * 1.2 * v, 4.4 * v, -6 * v + i * 1.2 * v + (i % 2) * 0.3 * v);
    pen(ctx, '#8A5A2A', 0.5 * v); sg(ctx, -2 * v, -6 * v, -2 * v, 0); sg(ctx, 2 * v, -6 * v, 2 * v, 0);
  };
  I.bottle = function (ctx, v, c) {
    ctx.fillStyle = c; rr(ctx, -2 * v, -7 * v, 4 * v, 7 * v, 1.4 * v); ctx.fill(); rr(ctx, -1.1 * v, -9 * v, 2.2 * v, 2.6 * v, 0.6 * v); ctx.fill();
    ctx.fillStyle = '#3E7FD8'; ctx.fillRect(-1.2 * v, -9.6 * v, 2.4 * v, 0.9 * v);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-1.4 * v, -6 * v, 0.6 * v, 4.4 * v);
  };
  I.football = function (ctx, v, c, c2) {
    ctx.fillStyle = c; circ(ctx, 0, -3.8 * v, 3.8 * v); ctx.fill();
    ctx.fillStyle = c2 || '#1E1E22';
    poly(ctx, [0, -5.2 * v, 1.3 * v, -4.3 * v, 0.8 * v, -2.8 * v, -0.8 * v, -2.8 * v, -1.3 * v, -4.3 * v]); ctx.fill();
    [[2.8, -6], [-2.8, -6], [3.2, -2], [-3.2, -2], [0, -0.4]].forEach(function (p) { circ(ctx, p[0] * v, p[1] * v, 0.9 * v); ctx.fill(); });
  };
  I.grass = function (ctx, v, c) {
    for (var i = -3; i <= 3; i++) { pen(ctx, i % 2 ? c : shade(c, 0.18), 0.7 * v); ctx.beginPath(); ctx.moveTo(i * 0.8 * v, 0); ctx.quadraticCurveTo(i * 1.4 * v, -4 * v, i * 2 * v, (-8 + Math.abs(i)) * v); ctx.stroke(); }
  };
  I.bush = function (ctx, v, c) {
    [[-2.6, -3, 2.6], [2.6, -3, 2.6], [0, -5, 3.2], [-1.4, -2, 2.4], [1.6, -2, 2.4]].forEach(function (b, i) { ctx.fillStyle = i % 2 ? c : shade(c, 0.12); circ(ctx, b[0] * v, b[1] * v, b[2] * v); ctx.fill(); });
  };
  I.jungleleaf = function (ctx, v, c) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-6 * v, -3 * v, -5 * v, -10 * v, 0, -11 * v); ctx.bezierCurveTo(5 * v, -10 * v, 6 * v, -3 * v, 0, 0); ctx.fill();
    pen(ctx, shade(c, 0.25), 0.4 * v); sg(ctx, 0, 0, 0, -10.4 * v);
    pen(ctx, shade(c, -0.2), 0.7 * v); for (var i = 0; i < 3; i++) { sg(ctx, -4.4 * v, (-3 - i * 2.6) * v, -2.6 * v, (-3.6 - i * 2.6) * v); sg(ctx, 4.4 * v, (-3 - i * 2.6) * v, 2.6 * v, (-3.6 - i * 2.6) * v); }
  };
  I.book = function (ctx, v, c) {
    ctx.fillStyle = '#F4EEE0'; ctx.fillRect(-4.4 * v, -2.6 * v, 8.8 * v, 1.8 * v);
    ctx.fillStyle = c; rr(ctx, -4.8 * v, -3.4 * v, 9.6 * v, 1 * v, 0.3 * v); ctx.fill(); rr(ctx, -4.8 * v, -1 * v, 9.6 * v, 1 * v, 0.3 * v); ctx.fill(); ctx.fillRect(-4.8 * v, -3.4 * v, 1 * v, 3.4 * v);
  };
  I.yarn = function (ctx, v, c) {
    ctx.fillStyle = c; circ(ctx, 0, -3.4 * v, 3.4 * v); ctx.fill();
    pen(ctx, shade(c, -0.22), 0.35 * v);
    for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(0, -3.4 * v, 3.2 * v, 1.2 * v + Math.abs(i) * 0.5 * v, 0.5 + i * 0.3, 0, Math.PI); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(3 * v, -1.6 * v); ctx.quadraticCurveTo(5 * v, -0.4 * v, 5.4 * v, 0); ctx.stroke();
  };
  I.paperboat = function (ctx, v, c) {
    ctx.fillStyle = shade(c, -0.08); poly(ctx, [-5 * v, -2.6 * v, 5 * v, -2.6 * v, 3.4 * v, 0, -3.4 * v, 0]); ctx.fill();
    ctx.fillStyle = c; tri(ctx, -2.6 * v, -2.6 * v, 2.6 * v, -2.6 * v, 0.2 * v, -7 * v); ctx.fill();
  };
  I.bone = function (ctx, v, c) {
    ctx.fillStyle = c; ctx.fillRect(-3.4 * v, -2.4 * v, 6.8 * v, 1.6 * v);
    [[-3.6, -2.6], [-3.6, -0.6], [3.6, -2.6], [3.6, -0.6]].forEach(function (p) { circ(ctx, p[0] * v, p[1] * v, 1.1 * v); ctx.fill(); });
  };

  /* ---------- backgrounds ----------
     gy: where the ground starts, as a share of the height. Everything else is covered in things */
  function wallBg(wall, wall2, pat, floor) {
    return function (ctx, W, H, gy) {
      var u = W / 100, y = gy * H, x, i;
      ctx.fillStyle = wall; ctx.fillRect(0, 0, W, y);
      ctx.fillStyle = wall2;
      if (pat === 'stripes') for (x = 0; x < W; x += 8 * u) ctx.fillRect(x, 0, 3 * u, y);
      else if (pat === 'dots') for (var r = 0; r * 6 * u < y; r++) for (x = (r % 2) * 3 * u; x < W; x += 6 * u) { circ(ctx, x, r * 6 * u + 3 * u, 0.9 * u); ctx.fill(); }
      else if (pat === 'tiles') { pen(ctx, wall2, 0.4 * u); for (x = 0; x < W; x += 6 * u) sg(ctx, x, 0, x, y); for (i = 0; i * 6 * u < y; i++) sg(ctx, 0, i * 6 * u, W, i * 6 * u); }
      else if (pat === 'brick') { pen(ctx, wall2, 0.5 * u); for (i = 0; i * 4.5 * u < y; i++) { sg(ctx, 0, i * 4.5 * u, W, i * 4.5 * u); for (x = (i % 2) * 4.5 * u; x < W; x += 9 * u) sg(ctx, x, i * 4.5 * u, x, (i + 1) * 4.5 * u); } }
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, y - 1.2 * u, W, 1.2 * u);
      var g = ctx.createLinearGradient(0, y, 0, H); g.addColorStop(0, shade(floor, 0.08)); g.addColorStop(1, shade(floor, -0.18));
      ctx.fillStyle = g; ctx.fillRect(0, y, W, H - y);
    };
  }
  function outBg(sky1, sky2, far, ground) {
    return function (ctx, W, H, gy) {
      var u = W / 100, y = gy * H, i;
      var g = ctx.createLinearGradient(0, 0, 0, y); g.addColorStop(0, sky1); g.addColorStop(1, sky2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, y + 2);
      if (far) far(ctx, W, y, u);
      var g2 = ctx.createLinearGradient(0, y, 0, H); g2.addColorStop(0, shade(ground, 0.06)); g2.addColorStop(1, shade(ground, -0.16));
      ctx.fillStyle = g2; ctx.fillRect(0, y, W, H - y);
    };
  }
  function trees(cols) {
    return function (ctx, W, y, u) {
      var r = rnd(7);
      for (var i = 0; i < 9; i++) { var x = i * 12 * u + r() * 4 * u; ctx.fillStyle = '#5A4632'; ctx.fillRect(x - 0.8 * u, y - 7 * u, 1.6 * u, 7 * u); ctx.fillStyle = cols[i % cols.length]; circ(ctx, x, y - 9 * u - r() * 3 * u, (5 + r() * 2) * u); ctx.fill(); }
    };
  }
  var SCENES = {
    hall: { name: 'Hallway', gy: 0.22, bg: wallBg('#E8DCC8', '#F2E8D8', 'stripes', '#B8865A'),
      items: [['shoe', 3, ['#7A4A28', '#5A3A22', '#2A2A30', '#2E3E5A', '#A8322A', '#C9965A']], ['boot', 2, ['#2E6A3A', '#C8322A', '#E8B330', '#2A2A30', '#7A4A28']], ['slipper', 1.5, ['#E8A0B0', '#9AA0A8', '#8A6A48', '#5A7AA8']],
        ['bag', 1.2, ['#8A5A36', '#C9965A', '#A8322A', '#2A2A30']], ['hat', 1, ['#C8322A', '#2E5A8A', '#E8B330', '#7A4A28']], ['scarf', 1, ['#C8322A', '#2E6A3A', '#E8B330', '#5A3A8A']], ['glove', 1, ['#7A4A28', '#2A2A30', '#C8322A']], ['ball', 0.6, ['#E74C3C', '#3498DB']]] },
    park: { name: 'Autumn park', gy: 0.3, bg: outBg('#8FB8E0', '#E8EEF2', trees(['#D8822A', '#C8522A', '#E8B030', '#8A6A2A']), '#7A5A3A'),
      items: [['leaf', 7, ['#E8842A', '#C8422A', '#E8B030', '#9A5A2A', '#B8862A']], ['conker', 1.5, ['#7A3E1E', '#8A4A22']], ['acorn', 1.5, ['#B8863A', '#9A7A3A']], ['pinecone', 1.5, ['#7A5230', '#8A6238']],
        ['pumpkin', 0.8, ['#E8842A', '#D8722A']], ['mushroom', 0.8, ['#C8322A', '#B8864A']], ['stick', 1, ['#6E5038', '#7A5A3A']]] },
    toys: { name: 'Toy box', gy: 0.2, bg: wallBg('#DDEEFA', '#F6C6D6', 'dots', '#5AB4A0'),
      items: [['block', 2, ['#E74C3C', '#3498DB', '#F2C230', '#2ECC71', '#9B59B6']], ['ball', 1.5, ['#E74C3C', '#3498DB', '#F2C230', '#2ECC71']], ['teddy', 1.5, ['#B8864A', '#E8C89A', '#8A5A36', '#F2B8C8']],
        ['toycar', 1.5, ['#E74C3C', '#3498DB', '#F2C230', '#2ECC71']], ['rubberduck', 1, ['#F7C928']], ['book', 1, ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6']], ['yarn', 0.6, ['#E84A8A', '#5AB4C8', '#F2C230']]] },
    beach: { name: 'Beach', gy: 0.3, bg: outBg('#7EC0EA', '#D8EEF8', function (ctx, W, y, u) { ctx.fillStyle = '#3E8FB8'; ctx.fillRect(0, y - 8 * u, W, 8 * u); pen(ctx, 'rgba(255,255,255,0.6)', 0.5 * u); for (var i = 0; i < 6; i++) sg(ctx, i * 18 * u, y - 4 * u, i * 18 * u + 8 * u, y - 4 * u); }, '#E8D29A'),
      items: [['shell', 3, ['#F6D0B8', '#FFFFFF', '#F2B8C6', '#E8C89A']], ['pebble', 2.5, ['#9AA0A8', '#B8B0A0', '#7E8794', '#C9BFA8']], ['bucket', 1, ['#E74C3C', '#F2C230', '#3498DB', '#2ECC71']],
        ['seaweed', 1, ['#3E7A3A', '#5A6A2A']], ['towel', 1, ['#E74C3C', '#3498DB', '#F2C230']], ['rock', 0.8, ['#8A8E98', '#9A948A']]] },
    rockpool: { name: 'Rock pool', gy: 0.12, bg: wallBg('#3E8A9A', '#4E9AAA', 'none', '#5A7A80'),
      items: [['rock', 3, ['#6E7A82', '#7E8794', '#5A646E', '#8A8E98']], ['pebble', 3, ['#9AA0A8', '#B8B0A0', '#7E8794']], ['seaweed', 2.5, ['#3E7A3A', '#5A6A2A', '#7A3A2A']], ['shell', 1.5, ['#F6D0B8', '#FFFFFF', '#F2B8C6']]] },
    flowers: { name: 'Flower bed', gy: 0.3, bg: outBg('#8FC4EA', '#E2F0FA', function (ctx, W, y, u) { ctx.fillStyle = '#4E8A44'; ctx.fillRect(0, y - 9 * u, W, 9 * u); for (var i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#5A9A4A' : '#447A3A'; circ(ctx, i * W / 15, y - 9 * u, 4 * u); ctx.fill(); } }, '#6E5034'),
      items: [['flower', 8, ['#E84A6A', '#F2C230', '#B07AFF', '#FF8A3A', '#FFFFFF', '#F28AAE', '#3E7FD8']], ['bush', 1.5, ['#4E8A3A', '#5E9A44']], ['leaf', 1, ['#5E9A44', '#4E8A3A']], ['grass', 1, ['#5E9A44']]] },
    sweets: { name: 'Sweet shop', gy: 0.26, bg: wallBg('#F6C6D6', '#FBE3EA', 'stripes', '#E890B0'),
      items: [['sweet', 4, ['#E84A6A', '#F2C230', '#5AB4C8', '#8ADA7A', '#B07AFF', '#FF8A3A']], ['lollipop', 2, ['#E84A6A', '#F2C230', '#5AB4C8', '#B07AFF']], ['cupcake', 1.5, ['#F7B8C8', '#FFF0C8', '#B8E8C8', '#8A5A3A']]] },
    laundry: { name: 'Laundry day', gy: 0.2, bg: wallBg('#E6EEF6', '#FFFFFF', 'tiles', '#D8E2EC'),
      items: [['sock', 3, ['#F4F4F4', '#2A2A30', '#9AA0A8', '#3498DB', '#E74C3C']], ['shirt', 2, ['#FFFFFF', '#2E5A8A', '#9AA0A8', '#F2C230', '#E8A0B0']], ['towel', 2, ['#FFFFFF', '#7EC8E3', '#F28AA0', '#B8E0A0']],
        ['pillow', 1.5, ['#FFFFFF', '#E6E2F2', '#F6E6CC']], ['yarn', 0.5, ['#E84A8A', '#9AA0A8']]] },
    snow: { name: 'Snowy garden', gy: 0.3, bg: outBg('#A8B8CC', '#E8EEF4', trees(['#E8F0F6', '#D8E4EE']), '#EEF4FA'),
      items: [['snowball', 4, ['#F4F8FC', '#FFFFFF', '#E6EEF6']], ['rock', 1.5, ['#7E8794', '#5A646E']], ['pinecone', 1, ['#7A5230']], ['scarf', 0.7, ['#C8322A', '#2E6A3A']], ['glove', 0.7, ['#C8322A', '#2E5A8A']],
        ['hat', 0.7, ['#C8322A', '#2E5A8A', '#E8B330']], ['stick', 1, ['#6E5038']]] },
    pond: { name: 'Duck pond', gy: 0.3, bg: outBg('#8FC4EA', '#E2F0FA', trees(['#3E7A3A', '#4E8A44', '#2E6A3A']), '#5A9AB0'),
      items: [['lilypad', 4, ['#3E8A3A', '#4E9A44', '#5E8A3A']], ['reed', 2.5, ['#5E8A3A', '#6E9A44']], ['rubberduck', 1.5, ['#F7C928']], ['pebble', 1, ['#9AA0A8', '#7E8794']], ['leaf', 1, ['#5E9A44', '#B8862A']], ['paperboat', 1, ['#FFFFFF', '#F6E6CC']]] },
    market: { name: 'Fruit and veg stall', gy: 0.28, bg: wallBg('#B8704A', '#9A5A3A', 'brick', '#8A5A36'),
      items: [['apple', 2, ['#C8322A', '#7CB83A', '#D8422A']], ['orange', 2, ['#F28A1E', '#F29A2E']], ['potato', 1.5, ['#C9A06A', '#B8905A']], ['lemon', 1.2, ['#F2D23A']], ['banana', 1, ['#F2D23A', '#E8C82A']],
        ['lettuce', 1.2, ['#7CC24A', '#5EA83A']], ['pepper', 1.2, ['#E74C3C', '#F2C230', '#2ECC71']], ['pumpkin', 0.6, ['#E8842A']]] },
    rocks: { name: 'Rocky hillside', gy: 0.3, bg: outBg('#9FC8EA', '#E8F2FA', function (ctx, W, y, u) { ctx.fillStyle = '#8AA06A'; ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(W * 0.3, y - 14 * u, W * 0.6, y - 6 * u); ctx.quadraticCurveTo(W * 0.85, y - 16 * u, W, y - 4 * u); ctx.lineTo(W, y); ctx.fill(); }, '#9A9488'),
      items: [['rock', 4, ['#8A8E98', '#9A948A', '#7E8794', '#A8A094']], ['pebble', 3, ['#9AA0A8', '#B8B0A0', '#8A8478']], ['grass', 1.5, ['#7A9A4A', '#8AA05A']], ['flower', 0.5, ['#B07AC0', '#F2C230', '#FFFFFF']]] },
    savanna: { name: 'Savanna', gy: 0.34, bg: outBg('#F6C27A', '#FCE8C0', function (ctx, W, y, u) { ctx.fillStyle = '#6E5A3A'; [0.18, 0.62, 0.86].forEach(function (f, i) { var x = f * W; ctx.fillRect(x - 0.6 * u, y - 10 * u, 1.2 * u, 10 * u); ctx.beginPath(); ctx.ellipse(x, y - 11 * u, (7 + i) * u, 2.4 * u, 0, 0, TAU); ctx.fill(); }); }, '#D8B870'),
      items: [['grass', 4, ['#C9A44A', '#B8903A', '#D8B860', '#A88A3A']], ['bush', 2, ['#8A8A3A', '#7A7A2A', '#9A8A4A']], ['rock', 1.5, ['#A88A6A', '#9A8478']], ['stick', 1, ['#7A5A3A']]] },
    jungle: { name: 'Jungle', gy: 0.14, bg: wallBg('#2E6A3A', '#3E7A44', 'none', '#3E5A2A'),
      items: [['jungleleaf', 6, ['#2E8A3A', '#3E9A44', '#5EAA3A', '#2E7A4A']], ['flower', 1.5, ['#E84A6A', '#FF8A3A', '#F2C230', '#B07AFF']], ['banana', 0.8, ['#F2D23A']], ['bush', 1, ['#3E8A3A', '#4E9A44']]] },
    farm: { name: 'Farmyard', gy: 0.32, bg: outBg('#9FC8EA', '#E8F2FA', function (ctx, W, y, u) { ctx.fillStyle = '#A8322A'; ctx.fillRect(W * 0.55, y - 16 * u, 30 * u, 16 * u); ctx.fillStyle = '#8A2A22'; poly(ctx, [W * 0.53, y - 16 * u, W * 0.7, y - 25 * u, W * 0.87, y - 16 * u]); ctx.fill(); ctx.fillStyle = '#F4EEE4'; ctx.fillRect(W * 0.66, y - 10 * u, 8 * u, 10 * u); }, '#C9A45A'),
      items: [['haybale', 2, ['#E2BE5A', '#D8B04A']], ['bucket', 1, ['#9AA0A8', '#5A7A8A']], ['bottle', 1, ['#FFFFFF']], ['football', 1, ['#FFFFFF']], ['boot', 1, ['#2E6A3A', '#2A2A30']], ['rock', 0.6, ['#8A8E98']], ['grass', 1, ['#9AA04A']]] },
    party: { name: 'Birthday party', gy: 0.22, bg: wallBg('#F6E0EA', '#F28AA0', 'dots', '#D9B88A'),
      items: [['balloon', 3, ['#E74C3C', '#3498DB', '#F2C230', '#2ECC71', '#FF8AB0', '#B07AFF']], ['present', 2.5, ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F28AAE']], ['partyhat', 1.5, ['#E74C3C', '#3498DB', '#F2C230', '#2ECC71']],
        ['cupcake', 1.2, ['#F7B8C8', '#FFF0C8', '#B8E8C8']], ['sweet', 1, ['#E84A6A', '#F2C230', '#5AB4C8']]] }
  };

  /* ---------- where each animal hides ----------
     in: the places it can hide (its colours will be mixed into the things there). like: things that look like it,
     added wherever it hides */
  var WHERE = {
    ladybird: { in: ['park', 'flowers', 'sweets', 'market'], like: [['mushroom', 1.2], ['apple', 0.8]] },
    bee: { in: ['flowers', 'sweets', 'party'], like: [['sweet', 1.2]] },
    butterfly: { in: ['flowers', 'party', 'sweets'], like: [['flower', 1.5]] },
    robin: { in: ['park', 'snow', 'market', 'flowers'], like: [['apple', 1], ['leaf', 1]] },
    bluetit: { in: ['toys', 'flowers', 'party'], like: [['ball', 1]] },
    squirrel: { in: ['park', 'hall', 'rocks', 'snow'], like: [['pinecone', 1.5]] },
    hedgehog: { in: ['park', 'hall', 'farm'], like: [['pinecone', 2], ['conker', 1]] },
    dog: { in: ['hall', 'park', 'farm', 'toys'], like: [['teddy', 1.5], ['bone', 0.6]] },
    cat: { in: ['hall', 'laundry', 'toys', 'park'], like: [['teddy', 1], ['yarn', 1]] },
    hamster: { in: ['market', 'hall', 'park', 'sweets'], like: [['potato', 1], ['teddy', 0.8]] },
    guineapig: { in: ['hall', 'toys', 'market', 'farm'], like: [['slipper', 1.2], ['teddy', 0.8]] },
    goldfish: { in: ['pond', 'market', 'rockpool', 'party'], like: [['orange', 1.2], ['leaf', 0.6]] },
    budgie: { in: ['toys', 'jungle', 'flowers', 'market'], like: [['pepper', 1], ['leaf', 0.8]] },
    tortoise: { in: ['rocks', 'market', 'park', 'farm'], like: [['rock', 1.2], ['pinecone', 0.8]] },
    seagull: { in: ['beach', 'snow', 'laundry', 'pond'], like: [['paperboat', 1], ['shirt', 0.6]] },
    crab: { in: ['beach', 'rockpool', 'market'], like: [['shell', 1.2], ['bucket', 0.6]] },
    starfish: { in: ['beach', 'rockpool', 'sweets'], like: [['shell', 1.2]] },
    jellyfish: { in: ['rockpool', 'party', 'pond'], like: [['balloon', 1.2]] },
    seal: { in: ['rocks', 'beach', 'rockpool', 'laundry'], like: [['rock', 1.2], ['pebble', 1]] },
    puffin: { in: ['rocks', 'beach', 'toys', 'snow'], like: [['rock', 1]] },
    fox: { in: ['park', 'snow', 'farm'], like: [['leaf', 1.5], ['pumpkin', 0.6]] },
    rabbit: { in: ['hall', 'farm', 'rocks', 'snow'], like: [['slipper', 1.2]] },
    deer: { in: ['park', 'savanna', 'snow'], like: [['stick', 1.5]] },
    cow: { in: ['farm', 'laundry', 'toys'], like: [['football', 1.5]] },
    sheep: { in: ['laundry', 'snow', 'farm', 'rocks'], like: [['pillow', 1.2], ['snowball', 1]] },
    swan: { in: ['pond', 'laundry', 'snow'], like: [['pillow', 1], ['paperboat', 1], ['feather', 1]] },
    duck: { in: ['pond', 'toys', 'farm'], like: [['rubberduck', 2]] },
    lion: { in: ['savanna', 'jungle', 'market', 'toys'], like: [['teddy', 1], ['haybale', 0.6]] },
    tiger: { in: ['jungle', 'market', 'park'], like: [['orange', 1], ['pumpkin', 0.8]] },
    elephant: { in: ['rocks', 'savanna', 'laundry'], like: [['rock', 1.5]] },
    giraffe: { in: ['savanna', 'jungle', 'market'], like: [['bush', 1]] },
    penguin: { in: ['snow', 'laundry', 'toys', 'party'], like: [['bottle', 1]] },
    meerkat: { in: ['savanna', 'beach', 'rocks'], like: [['grass', 1]] },
    flamingo: { in: ['party', 'flowers', 'sweets', 'toys'], like: [['balloon', 1], ['flower', 1]] }
  };
  var LAYOUTS = 3;
  /* lookalikes only go where they'd make sense (no teddy bears on the savanna), and a few things keep their own colours */
  var FIT = {
    teddy: ['hall', 'toys', 'party'], bone: ['hall', 'park', 'farm'], yarn: ['hall', 'toys', 'laundry'], slipper: ['hall', 'laundry', 'toys'],
    pinecone: ['park', 'snow', 'hall', 'rocks'], conker: ['park'], apple: ['market', 'park', 'party', 'flowers'], leaf: ['park', 'flowers', 'pond', 'snow', 'rocks'],
    mushroom: ['park', 'flowers'], sweet: ['sweets', 'party', 'toys'], flower: ['flowers', 'party', 'jungle', 'rocks'], ball: ['toys', 'hall', 'beach', 'party'],
    potato: ['market', 'farm'], orange: ['market', 'party'], pepper: ['market'], rock: ['rocks', 'beach', 'rockpool', 'farm', 'snow', 'savanna'],
    pebble: ['beach', 'rockpool', 'rocks', 'pond'], paperboat: ['pond', 'beach', 'toys'], shirt: ['laundry'], shell: ['beach', 'rockpool'], bucket: ['beach', 'farm'],
    balloon: ['party', 'toys'], stick: ['park', 'snow', 'savanna'], pumpkin: ['park', 'market', 'farm'], football: ['farm', 'toys', 'hall'],
    pillow: ['laundry', 'toys'], snowball: ['snow'], feather: ['pond', 'farm', 'laundry', 'beach'], rubberduck: ['pond', 'toys', 'laundry'],
    bush: ['savanna', 'jungle', 'flowers'], grass: ['savanna', 'rocks', 'farm', 'flowers'], bottle: ['farm', 'party'], haybale: ['farm']
  };
  var OWN_COLOURS = { rubberduck: 1 };

  /* ---------- the animals' shapes ----------
     Measured once from each drawing: its outline box in its own units, and its main colours */
  var SHAPES = {};
  function makeCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') { try { return new OffscreenCanvas(w, h); } catch (e) {} }
    var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  var POSE_T = 0.6;
  function shape(id) {
    if (SHAPES[id]) return SHAPES[id];
    var a = ZA.A[id];
    if (!a) return null;
    var S = 260, k = 4, ox = S / 2, oy = S * 0.8;
    var cv = makeCanvas(S, S), ctx = cv.getContext('2d');
    ctx.translate(ox, oy); ctx.scale(k, k);
    a.draw(ctx, POSE_T);
    var d = ctx.getImageData(0, 0, S, S).data, x0 = S, y0 = S, x1 = -1, y1 = -1, bins = {};
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
      var i = (y * S + x) * 4;
      if (d[i + 3] < 200) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      var key = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4);
      bins[key] = (bins[key] || 0) + 1;
    }
    if (x1 < 0) return null;
    var cols = Object.keys(bins).sort(function (p, q) { return bins[q] - bins[p]; }).slice(0, 4).map(function (key) {
      var c = key.split(',').map(function (n) { return Math.min(255, (+n << 4) + 8); });
      return '#' + c.map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
    });
    SHAPES[id] = { x0: (x0 - ox) / k, x1: (x1 + 1 - ox) / k, y0: (y0 - oy) / k, y1: (y1 + 1 - oy) / k, cols: cols };
    SHAPES[id].w = SHAPES[id].x1 - SHAPES[id].x0; SHAPES[id].h = SHAPES[id].y1 - SHAPES[id].y0;
    return SHAPES[id];
  }

  /* ---------- a picture ----------
     The same animal, place and layout always give the same picture: things are placed on a jittered grid, nearer ones
     lower down and a little bigger, and some of them take the animal's own colours */
  function photo(id, sceneId, layout) {
    var sc = SCENES[sceneId], wh = WHERE[id], sh = shape(id);
    if (!sc || !wh || !sh) return null;
    var r = rnd(hash(id + '|' + sceneId + '|' + layout));
    var kinds = sc.items.concat((wh.like || []).filter(function (it) { return !FIT[it[0]] || FIT[it[0]].indexOf(sceneId) !== -1; })), total = 0;
    kinds.forEach(function (it) { total += it[1]; });
    var palette = function (it) { for (var j = 0; j < sc.items.length; j++) if (sc.items[j][0] === it) return sc.items[j][2]; return null; };
    var y0 = sc.gy * HU + 3, items = [], step = 8.4 + r() * 0.8;
    for (var gy = y0; gy < HU + 4; gy += step * 0.8) for (var gx = -2; gx < 104; gx += step) {
      if (r() < 0.07) continue;
      var x = gx + (r() - 0.5) * step * 0.9, y = Math.max(y0 - 1, gy + (r() - 0.5) * step * 0.7);
      var depth = Math.max(0, Math.min(1, (y - y0) / (HU - y0)));
      var pickN = r() * total, kind = kinds[0][0];
      for (var j = 0; j < kinds.length; j++) { pickN -= kinds[j][1]; if (pickN <= 0) { kind = kinds[j][0]; break; } }
      var pal = palette(kind) || sh.cols, c = pal[Math.floor(r() * pal.length)], c2 = null;
      var mix = r(), mix2 = r();
      if (!OWN_COLOURS[kind] && mix < 0.42) c = sh.cols[Math.floor(r() * Math.min(3, sh.cols.length))];
      if (!OWN_COLOURS[kind] && mix2 < 0.35) c2 = sh.cols[Math.floor(r() * sh.cols.length)];
      var flat = kind === 'leaf' || kind === 'lilypad' || kind === 'stick' || kind === 'feather' || kind === 'banana' || kind === 'bone';
      items.push({ k: kind, x: x, y: y, s: (8.6 + r() * 3.6) * (0.82 + depth * 0.36), c: c, c2: c2, rot: (r() - 0.5) * (flat ? 2.4 : 0.5), f: r() < 0.5 && kind !== 'block' ? -1 : 1, q: r() });
    }
    items.sort(function (p, q) { return p.y - q.y; });
    return { id: id, scene: sceneId, layout: layout, items: items, y0: y0 };
  }
  function sceneName(sceneId) { return SCENES[sceneId] ? SCENES[sceneId].name : ''; }

  /* drawing, at k pixels a unit */
  function drawItem(ctx, it, k) {
    var fn = I[it.k];
    if (!fn) return;
    ctx.save();
    ctx.translate(it.x * k, it.y * k); ctx.rotate(it.rot); ctx.scale(it.f, 1);
    try { fn(ctx, it.s * k / 10, it.c, it.c2, it.q); } finally { ctx.restore(); }
  }
  function animalScale(sp, k) { var sh = shape(sp.id); return sp.d * k / Math.max(sh.w, sh.h * 0.9); }
  function drawHidden(ctx, sp, k, t) {
    var a = ZA.A[sp.id], m = animalScale(sp, k);
    ctx.save(); ctx.translate(sp.x * k, sp.y * k); ctx.scale((a.sym ? 1 : sp.dir) * m, m);
    try { a.draw(ctx, t === undefined ? POSE_T : t); } finally { ctx.restore(); }
  }
  /* the whole picture: the background, then everything from the back to the front, with the animal in its place */
  function draw(ctx, Wpx, ph, sp) {
    var k = Wpx / 100, Hpx = HU * k, sc = SCENES[ph.scene], done = !sp;
    sc.bg(ctx, Wpx, Hpx, sc.gy);
    ph.items.forEach(function (it) {
      if (!done && it.y > sp.y) { drawHidden(ctx, sp, k); done = true; }
      drawItem(ctx, it, k);
    });
    if (!done) drawHidden(ctx, sp, k);
  }
  /* just the animal, for working out where it was tapped */
  function drawMask(ctx, Wpx, sp) { drawHidden(ctx, sp, Wpx / 100); }

  /* ---------- hiding ----------
     A new spot every time: somewhere on the ground, the right size for that depth, and partly behind the things in
     front of it, but never so hidden it can't be found. rand: a random number function */
  function hide(ph, rand) {
    var sh = shape(ph.id), a = ZA.A[ph.id];
    var S = 2, Wm = 100 * S, Hm = HU * S;
    var cv = makeCanvas(Wm, Hm), ctx = cv.getContext('2d');
    var best = null;
    for (var tries = 0; tries < 36; tries++) {
      var depth = 0.12 + rand() * 0.8, y = ph.y0 + depth * (HU - ph.y0) + 2;
      var d = (11.5 + rand() * 2.5) * (0.84 + depth * 0.34);
      var sp = { id: ph.id, x: 0, y: y, d: d, dir: rand() < 0.5 ? -1 : 1 };
      var m = animalScale(sp, 1), cx = 9 + rand() * 82;
      // keep the whole animal inside the picture
      var left = sp.dir > 0 || a.sym ? sh.x0 : -sh.x1, right = sp.dir > 0 || a.sym ? sh.x1 : -sh.x0;
      sp.x = Math.max(2 - left * m, Math.min(98 - right * m, cx));
      if (y + sh.y0 * m < ph.y0 + 1 || y + sh.y1 * m > HU - 1) continue;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, Wm, Hm);
      drawHidden(ctx, sp, S);
      var n0 = count(ctx, Wm, Hm);
      if (!n0) continue;
      ctx.globalCompositeOperation = 'destination-out';
      ph.items.forEach(function (it) { if (it.y > sp.y) drawItem(ctx, it, S); });
      ctx.globalCompositeOperation = 'source-over';
      var vis = count(ctx, Wm, Hm) / n0;
      sp.vis = vis;
      var score = Math.abs(vis - 0.62);
      if (vis >= 0.42 && vis <= 0.86) return sp;
      if (vis >= 0.3 && (!best || score < best.score)) best = { sp: sp, score: score };
    }
    return best ? best.sp : null;
  }
  function count(ctx, w, h) {
    var d = ctx.getImageData(0, 0, w, h).data, n = 0;
    for (var i = 3; i < d.length; i += 4) if (d[i] > 120) n++;
    return n;
  }

  /* which animal, place and layout to play next. recent: animal ids played lately, to skip */
  function pick(rand, recent) {
    var ids = Object.keys(WHERE).filter(function (id) { return ZA.A[id] && (!recent || recent.indexOf(id) === -1); });
    if (!ids.length) ids = Object.keys(WHERE);
    var id = ids[Math.floor(rand() * ids.length)], list = WHERE[id].in;
    return { id: id, scene: list[Math.floor(rand() * list.length)], layout: Math.floor(rand() * LAYOUTS) };
  }
  /* the animal on its own, to show what to look for: fitted into a w by h box */
  function portrait(ctx, w, h, id) {
    var sh = shape(id), a = ZA.A[id];
    if (!sh) return;
    var m = Math.min(w * 0.86 / sh.w, h * 0.86 / sh.h);
    ctx.save(); ctx.translate(w / 2 - (sh.x0 + sh.w / 2) * m, h / 2 - (sh.y0 + sh.h / 2) * m); ctx.scale(m, m);
    try { a.draw(ctx, POSE_T); } finally { ctx.restore(); }
  }
  /* the middle of the animal in its spot, in units, and roughly how big it is */
  function centre(sp) {
    var sh = shape(sp.id), a = ZA.A[sp.id], m = animalScale(sp, 1), dir = a.sym ? 1 : sp.dir;
    return { x: sp.x + dir * (sh.x0 + sh.w / 2) * m, y: sp.y + (sh.y0 + sh.h / 2) * m, r: Math.max(sh.w, sh.h) * m / 2 };
  }
  function places() { var n = 0; Object.keys(WHERE).forEach(function (id) { n += WHERE[id].in.length * LAYOUTS; }); return n; }

  WC.seek = { HU: HU, SCENES: SCENES, WHERE: WHERE, I: I, LAYOUTS: LAYOUTS, shape: shape, photo: photo, hide: hide, draw: draw, drawMask: drawMask, drawHidden: drawHidden,
    pick: pick, portrait: portrait, centre: centre, sceneName: sceneName, places: places, rnd: rnd };
})(typeof window !== 'undefined' ? window : globalThis);
