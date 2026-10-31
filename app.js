/* FRZFRM Weather Catch: the app.
   Finds your area, gets the live weather, works out what you can catch, runs the catching games,
   and keeps your shelf, points, levels, shelf rewards and Drive mode trips. Everything is saved on the phone. */
(function () {
  'use strict';
  var WC = window.WC;
  var RU = WC.rules, SKY = WC.sky, AN = WC.animals, SP = WC.spotter, SK = WC.seek, LV = WC.seekLevels || [], ZA = WC.zoo;
  function sfx(n) { if (WC.sfx && S && S.sound !== false) WC.sfx.play(n); }
  var VERSION = '0.17.0';
  var TEST = /[?&]test=1(&|$)/.test(location.search);
  var KEY = 'frzfrm-wc-state-1';
  var WX_KEY = 'frzfrm-wc-weather-1';
  var STORMS_KEY = 'frzfrm-wc-storms-1';
  var MIN = 60000, HOUR = 3600000;
  var FRESH = 20 * MIN;    // weather older than this is checked again before a catch
  var REFRESH = 10 * MIN;  // how often to check the weather while the app is open
  var COOLDOWN = 10 * MIN; // how long weather stays away after it slips away
  var FAST = 6.7;          // metres per second, about 15 mph
  var CUR = 'temperature_2m,relative_humidity_2m,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,cloud_cover_low,cloud_cover_high,wind_speed_10m,wind_gusts_10m,visibility';
  var HRLY = 'temperature_2m,relative_humidity_2m,is_day,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,visibility';
  var VARS = RU.VARIANT_SLOTS; // mystery variants, commonest first: Classic, the row's six surprises, its legendary

  /* ---------- small helpers ---------- */

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hm(t) { var d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function now() { return TEST && window.__wcNow ? window.__wcNow() : Date.now(); }
  function today() { return RU.dayKey(now()); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : undefined; }
  function plural(n, one, many) { return n === 1 ? one : (many || one + 's'); }
  function T(id) { return RU.type(id); }
  function rlabel(id) { return RU.RARITY[T(id).r].label; }
  function minutes(ms) { var m = Math.max(1, Math.ceil(ms / MIN)); return m + ' ' + plural(m, 'minute'); }
  function whenLabel(t) {
    var d = new Date(t), n = new Date(now());
    var dayDiff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000);
    var h = d.getHours();
    var part = dayDiff === 0 ? (h >= 18 ? 'Tonight' : 'Today') : dayDiff === 1 ? (h >= 18 ? 'Tomorrow night' : 'Tomorrow') : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return part + ' ' + hm(t);
  }

  /* ---------- saved state ---------- */

  function freshState() {
    return {
      v: 1, created: Date.now(), points: 0, book: {}, caught: {}, cool: {}, recent: {}, names: {}, log: [], haul: null, drive: false, passengerUntil: 0, onboarded: false,
      rewards: {}, style: { wood: 'pine', lights: 'off', jars: {} }, oldJars: null, vmap: 2, animals: freshAnimals(), seek: freshSeek(), hop: freshHop(), sound: true
    };
  }
  function known(list, id) { return list.some(function (x) { return x.id === id; }); }
  /* what's been found of each variant: { c: { n, seed, t, place }, ... }. Jars caught before variants count as Classic,
     with no seed, so they look just as they always did. */
  function cleanVars(e) {
    var src = e.vars && typeof e.vars === 'object' && !Array.isArray(e.vars) ? e.vars : {};
    var out = {}, sum = 0;
    VARS.forEach(function (v) {
      var x = src[v];
      if (!x || typeof x.n !== 'number' || !(x.n >= 1)) return;
      out[v] = {
        n: Math.floor(x.n), seed: typeof x.seed === 'number' && isFinite(x.seed) ? x.seed >>> 0 : 0,
        t: typeof x.t === 'number' && isFinite(x.t) ? x.t : 0, place: typeof x.place === 'string' ? x.place : ''
      };
      if (typeof x.power === 'number' && isFinite(x.power)) out[v].power = Math.max(0, Math.min(1, x.power));
      sum += out[v].n;
    });
    if (e.n > sum) {
      var c = out.c || (out.c = { n: 0, seed: 0, t: e.last || (e.first && e.first.t) || 0, place: (e.first && e.first.place) || '' });
      c.n += e.n - sum;
    }
    e.vars = out;
    delete e.glass;
  }
  /* 0.4 moved Ball Lightning from a storm's first surprise to its legendary */
  function moveStormVariants(id, e) {
    if (!T(id) || T(id).el !== 'storm' || id === 'namedstorm' || !e.vars || !e.vars.a) return;
    var a = e.vars.a, p = e.vars.p;
    if (!p || a.t > p.t) e.vars.p = { n: a.n + (p ? p.n : 0), seed: a.seed, t: a.t, place: a.place };
    else p.n += a.n;
    delete e.vars.a;
    (e.catches || []).forEach(function (r) { if (r.v === 'a') r.v = 'p'; });
  }
  /* how strong a catch was, from its readings: stars, and how far along its weather's range it sat */
  function rate(id, rec) {
    var sg = RU.strength(id, rec);
    if (sg) { rec.stars = sg.stars; rec.power = Math.round(sg.f * 100) / 100; }
    return sg;
  }
  /* each jar remembers its strongest catch. Returns true when this one beats an earlier one */
  function bestUpdate(e, rec, sg) {
    var b = e.best;
    if (b && (b.stars > sg.stars || (b.stars === sg.stars && b.f >= sg.f))) return false;
    e.best = { stars: sg.stars, f: Math.round(sg.f * 100) / 100, key: sg.key, v: sg.v, t: rec.t || 0, place: rec.place || '' };
    return !!b;
  }
  function cleanState(o) {
    if (!o || o.v !== 1 || typeof o.points !== 'number' || !isFinite(o.points) || !o.book || typeof o.book !== 'object') return null;
    var oldMap = !(o.vmap >= 2);
    var f = freshState();
    Object.keys(f).forEach(function (k) { if (!(k in o)) o[k] = f[k]; });
    ['caught', 'cool', 'recent', 'names', 'rewards'].forEach(function (k) { if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {}; });
    if (!Array.isArray(o.log)) o.log = [];
    Object.keys(o.book).forEach(function (id) {
      var e = o.book[id];
      if (!T(id) || !e || typeof e.n !== 'number') { delete o.book[id]; return; }
      if (!Array.isArray(e.places)) e.places = [];
      if (e.catches && !Array.isArray(e.catches)) delete e.catches;
      if (e.storms && (typeof e.storms !== 'object' || Array.isArray(e.storms))) delete e.storms;
      else if (e.storms) Object.keys(e.storms).forEach(function (k) {
        var x = e.storms[k];
        if (!RU.okStormName(k) || !x || typeof x.n !== 'number') { delete e.storms[k]; return; }
        if (x.best && (typeof x.best !== 'object' || Array.isArray(x.best))) delete x.best;
      });
      cleanVars(e);
      if (oldMap) moveStormVariants(id, e);
      if (e.best && (typeof e.best !== 'object' || typeof e.best.stars !== 'number')) delete e.best;
      // catches saved with their readings but before strength existed get their stars now
      (e.catches || []).forEach(function (rec) {
        if (!rec || typeof rec !== 'object') return;
        if (!('stars' in rec)) {
          var sg = rate(id, rec);
          if (!sg) rec.stars = 0;
          else bestUpdate(e, rec, sg);
        }
        var x = e.vars && e.vars[rec.v || 'c'];
        if (x && typeof rec.power === 'number' && x.seed === (rec.seed >>> 0)) x.power = rec.power;
      });
    });
    o.vmap = 2;
    Object.keys(o.rewards).forEach(function (id) { if (!RU.reward(id)) delete o.rewards[id]; });
    if (!o.style || typeof o.style !== 'object' || Array.isArray(o.style)) o.style = f.style;
    if (!known(RU.WOODS, o.style.wood)) o.style.wood = 'pine';
    if (!known(RU.LIGHTS, o.style.lights)) o.style.lights = 'off';
    var jars = o.style.jars && typeof o.style.jars === 'object' && !Array.isArray(o.style.jars) ? o.style.jars : {};
    o.style.jars = {};
    sections().forEach(function (sec) { if (typeof jars[sec] === 'string' && RU.jarLook(jars[sec])) o.style.jars[sec] = jars[sec]; });
    if (o.haul && !Array.isArray(o.haul.jars)) o.haul = null;
    if (o.oldJars && (typeof o.oldJars !== 'object' || !Array.isArray(o.oldJars.found) || typeof o.oldJars.n !== 'number')) o.oldJars = null;
    // 0.11 took random glass out of catches: jar looks are picked in Shelf style instead
    delete o.glassNote; delete o.glassDone;
    delete o.games;
    o.animals = cleanAnimals(o.animals);
    o.seek = cleanSeek(o.seek);
    o.hop = cleanHop(o.hop);
    o.sound = o.sound !== false;
    if (o.photoNote && !Array.isArray(o.photoNote)) o.photoNote = null;
    if (o.day && (typeof o.day !== 'object' || typeof o.day.d !== 'string' || !o.day.n || typeof o.day.n !== 'object')) o.day = null;
    if (o.tripNote && (typeof o.tripNote !== 'object' || !Array.isArray(o.tripNote.trips))) o.tripNote = null;
    return o;
  }
  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? cleanState(JSON.parse(raw)) : null;
    } catch (e) { return null; }
  }
  var S = loadState() || freshState();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function prune() {
    var cutoff = RU.dayKey(now() - 3 * 86400000);
    Object.keys(S.caught).forEach(function (k) {
      var m = k.match(/\d{4}-\d{2}-\d{2}/);
      if (m && m[0] < cutoff && S.caught[k] !== 2) delete S.caught[k];
    });
    Object.keys(S.cool).forEach(function (k) { if (S.cool[k] < now()) delete S.cool[k]; });
    Object.keys(S.recent).forEach(function (a) {
      S.recent[a] = (S.recent[a] || []).filter(function (p) { return now() - p.t <= 3 * HOUR; });
      if (!S.recent[a].length) delete S.recent[a];
    });
    var names = Object.keys(S.names);
    if (names.length > 400) names.slice(0, names.length - 400).forEach(function (k) { delete S.names[k]; });
    if (S.log.length > 80) S.log = S.log.slice(-80);
    if (S.passengerUntil && S.passengerUntil < now()) S.passengerUntil = 0;
  }
  function addLog(text) {
    S.log.push({ t: now(), text: text });
    if (S.log.length > 80) S.log.shift();
  }

  /* ---------- photos, kept in the phone's own database ---------- */

  var dbp = null;
  function db() {
    if (!dbp) {
      dbp = new Promise(function (res, rej) {
        if (!('indexedDB' in window)) { rej(new Error('No IndexedDB')); return; }
        var r = indexedDB.open('frzfrm-wc', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('photos'); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      });
      dbp.catch(function () {});
    }
    return dbp;
  }
  function putPhoto(key, blob) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var tx = d.transaction('photos', 'readwrite');
        tx.objectStore('photos').put(blob, key);
        tx.oncomplete = res;
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function getPhoto(key) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var q = d.transaction('photos', 'readonly').objectStore('photos').get(key);
        q.onsuccess = function () { res(q.result || null); };
        q.onerror = function () { rej(q.error); };
      });
    });
  }
  function deletePhoto(key) {
    return db().then(function (d) {
      return new Promise(function (res) {
        var tx = d.transaction('photos', 'readwrite');
        tx.objectStore('photos').delete(key);
        tx.oncomplete = res;
        tx.onerror = res;
      });
    }).catch(function () {});
  }
  function clearPhotos() {
    return db().then(function (d) {
      return new Promise(function (res) {
        var tx = d.transaction('photos', 'readwrite');
        tx.objectStore('photos').clear();
        tx.oncomplete = res;
        tx.onerror = res;
      });
    }).catch(function () {});
  }
  function imgFromBlob(blob) {
    var img = new Image();
    img.src = URL.createObjectURL(blob);
    return img;
  }
  function photoImg(key) {
    if (!key) return null;
    if (R.photos[key]) return typeof R.photos[key] === 'string' ? null : R.photos[key];
    R.photos[key] = 'loading';
    getPhoto(key).then(function (b) { R.photos[key] = b ? imgFromBlob(b) : 'none'; }).catch(function () { R.photos[key] = 'none'; });
    return null;
  }
  function shrinkPhoto(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, 720 / Math.max(w, h));
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * s));
        cv.height = Math.max(1, Math.round(h * s));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { if (b) resolve(b); else reject(new Error('No photo')); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Bad photo')); };
      img.src = url;
    });
  }

  /* ---------- what's happening right now ---------- */

  var R = {
    tab: 'catch', problem: null, locating: false,
    pos: null, speeds: [], fast: false, moving: false, speedAt: 0, lastFix: 0, fixes: [], hiddenAt: 0,
    area: null, place: null, wx: null, wxError: null, fetching: null,
    reading: null, ctx: null, cls: null, wonders: [], spots: [], seen: [], near: {}, coming: [], warning: null,
    watchId: null, game: null, view: null, queue: [], cardState: null, lastFocus: null,
    installEvt: null, wake: null, wakeOk: null, photos: {}, pendingSpot: null, shelfJars: [], previewJars: null, share: null,
    cardId: null, cardV: null, lookSec: 'sun', forceV: TEST ? ((location.search.match(/[?&]force=([cabdefgp])(?:&|$)/) || [])[1] || null) : null,
    forceH: TEST ? ((location.search.match(/[?&]home=(h[1-5])(?:&|$)/) || [])[1] || null) : null, forceScan: null, cardKind: null, cardH: null,
    cam: null, scanning: false, spotterHere: undefined, animalJars: [],
    depth: undefined, depthArea: null, depthAt: 0,
    storms: null, stormsAt: 0, storm: null, spin: null, rewardToken: null,
    flyReads: [], flyingNow: false, flyAt: 0, flightPos: null
  };

  /* ---------- named storms ----------
     storms.json, kept next to the app, lists the season's named storms and when each can be caught.
     The last copy is saved on the phone, so storms still work without a signal. */
  function goodStorms(j) { return j && typeof j === 'object' && Array.isArray(j.storms) ? j : null; }
  var STORMS_ON = !TEST || /[?&]storms=1(&|$)/.test(location.search); // tests ask for storms when they want them
  function loadStorms() {
    if (!STORMS_ON) return;
    try { R.storms = goodStorms(JSON.parse(localStorage.getItem(STORMS_KEY) || 'null')); } catch (e) { R.storms = null; }
  }
  function fetchStorms(force) {
    if (!STORMS_ON || !window.fetch || (!force && now() - R.stormsAt < 30 * MIN)) return Promise.resolve();
    R.stormsAt = now();
    return fetch('storms.json?t=' + Math.floor(Date.now() / (5 * MIN)), { cache: 'no-store' }).then(function (res) { return res.ok ? res.json() : null; }).then(function (j) {
      j = goodStorms(j);
      if (!j) return;
      var changed = JSON.stringify(j) !== JSON.stringify(R.storms);
      R.storms = j;
      try { localStorage.setItem(STORMS_KEY, JSON.stringify(j)); } catch (e) {}
      if (changed && R.wx) { evaluate(); render(); }
    }).catch(function () {});
  }
  function stormsList() { return R.storms ? R.storms.storms : null; }
  function stormAt(t, lat, lon) { return RU.activeStorm(stormsList(), t, lat, lon); }
  /* a named storm jar takes the storm's own name: Storm Boelo. Right now, or for one catch */
  function liveName(id) { return id === 'namedstorm' && R.storm ? 'Storm ' + R.storm.name : T(id).name; }
  function recName(id, rec) { return id === 'namedstorm' && rec && RU.okStormName(rec.storm) ? 'Storm ' + rec.storm : T(id).name; }
  function segName(s) { return s.id === 'namedstorm' && s.storm ? 'Storm ' + s.storm : T(s.id).name; }
  /* every storm caught gets its own jar on the Storm shelf. The Named Storm jar remembers each one:
     how many, when and where first, and the catch on show (its rarest, the newest of those) */
  function addStorm(e, rec) {
    if (!RU.okStormName(rec.storm)) return false;
    if (!e.storms || typeof e.storms !== 'object' || Array.isArray(e.storms)) e.storms = {};
    var x = e.storms[rec.storm];
    if (!x) x = e.storms[rec.storm] = { n: 0, t: rec.t || 0, place: rec.place || '' };
    x.n += 1;
    if (!x.best || catchRank(rec) >= catchRank(x.best)) x.best = Object.assign({}, rec);
    return x.n === 1;
  }
  /* how special one catch is: its variant */
  function catchRank(rec) { return rec ? RU.variantRank(rec.v || 'c') : -1; }
  function stormNames(e) {
    if (!e || !e.storms) return [];
    return Object.keys(e.storms).filter(RU.okStormName).sort(function (a, b) { return (e.storms[a].t || 0) - (e.storms[b].t || 0); });
  }
  /* the catch to show for one storm's jar */
  function stormRec(e, name) {
    var x = e && e.storms && e.storms[name];
    if (!x) return null;
    if (x.best && typeof x.best === 'object') return x.best;
    var best = null;
    (e.catches || []).forEach(function (r) { if (r && r.storm === name && (!best || catchRank(r) >= catchRank(best))) best = r; });
    return best || { t: x.t, place: x.place, storm: name };
  }
  function stormState(name) {
    var st = jarState('namedstorm'), rec = stormRec(S.book.namedstorm, name);
    if (rec && !st.locked) st.mark = markOf('namedstorm', rec.v, rec.seed, rec.power);
    return st;
  }
  /* the season so far on the Named Storm jar card: caught, here now, or got away */
  function stormSeason(e) {
    var caught = e && e.storms ? e.storms : {};
    var parts = RU.stormList(stormsList()).filter(function (s) { return s.from <= now() || caught[s.name]; }).map(function (s) {
      if (caught[s.name]) return s.name + ' caught';
      return now() <= s.to ? s.name + ' happening now' : s.name + ' got away';
    });
    return parts.length ? 'Storms this season: ' + parts.join(', ') + '.' : '';
  }

  /* ---------- location ---------- */

  function locate() {
    if (!('geolocation' in navigator)) { showProblem('unsupported'); return; }
    if (!window.isSecureContext) { showProblem('insecure'); return; }
    R.locating = true;
    R.problem = null;
    render();
    navigator.geolocation.getCurrentPosition(onPos, onPosError, { enableHighAccuracy: !!S.drive, maximumAge: 2 * MIN, timeout: 20000 });
    startWatch();
  }
  function startWatch() {
    stopWatch();
    if (!('geolocation' in navigator) || !S.onboarded) return;
    R.watchId = navigator.geolocation.watchPosition(onPos, onWatchError, { enableHighAccuracy: !!S.drive, maximumAge: S.drive ? 5000 : MIN, timeout: 60000 });
  }
  function stopWatch() {
    if (R.watchId !== null && 'geolocation' in navigator) navigator.geolocation.clearWatch(R.watchId);
    R.watchId = null;
  }
  function onPosError(err) {
    R.locating = false;
    if (R.area) return;
    showProblem(err && err.code === 1 ? 'denied' : err && err.code === 3 ? 'timeout' : 'unavailable');
  }
  function onWatchError(err) {
    if (err && err.code === 1 && !R.area) { R.locating = false; showProblem('denied'); }
  }
  function distM(a, b) {
    var rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  function noteSpeed(sp) {
    var was = R.fast;
    R.speeds.push(sp);
    if (R.speeds.length > 3) R.speeds.shift();
    var fast = R.speeds.filter(function (s) { return s >= FAST; }).length;
    var slow = R.speeds.filter(function (s) { return s < 3; }).length;
    if (fast >= 2) R.fast = true;
    else if (slow >= 2) R.fast = false;
    R.moving = sp >= 2.5;
    R.speedAt = now();
    // Drive mode starts sealing the weather as soon as the car gets going
    if (!was && R.fast && S.drive) setTimeout(driveSeal, 0);
  }
  function onPos(p) {
    var c = p.coords;
    var t = p.timestamp || now();
    var pos = { lat: c.latitude, lon: c.longitude, acc: c.accuracy || 9999, t: t };
    if (typeof c.altitude === 'number' && isFinite(c.altitude) && typeof c.altitudeAccuracy === 'number' && c.altitudeAccuracy <= 50) pos.alt = c.altitude;
    if (typeof c.altitude === 'number' && isFinite(c.altitude) && !(c.altitudeAccuracy > 400)) pos.altF = c.altitude;
    var sp = typeof c.speed === 'number' && isFinite(c.speed) && c.speed >= 0 ? c.speed : null;
    var prev = R.pos;
    var spF = sp;
    // phones that don't say how fast they're going: work it out from an earlier fix, 8 seconds to 10 minutes before.
    // Fixes can come every second, so the one just before is usually too close to measure from
    if (sp === null && pos.acc <= 150) {
      var base = null;
      for (var i = R.fixes.length - 1; i >= 0; i--) {
        var f = R.fixes[i], gap = t - f.t;
        if (gap > 10 * MIN) break;
        if (gap >= 8000 && f.acc <= 150) { base = f; break; }
      }
      if (base) sp = distM(base, pos) / ((t - base.t) / 1000);
    }
    R.fixes.push({ lat: pos.lat, lon: pos.lon, acc: pos.acc, t: t });
    if (R.fixes.length > 40) R.fixes.shift();
    // a plane can be worked out from rougher fixes, as long as it has gone a long way fast
    if (spF === null && prev && pos.acc <= 1000 && prev.acc <= 1000 && t - prev.t >= 8000 && t - prev.t <= 120000 && distM(prev, pos) >= 3000) spF = distM(prev, pos) / ((t - prev.t) / 1000);
    if (spF === null) spF = sp;
    if (sp !== null) noteSpeed(sp);
    noteTripFix(t, sp);
    pos.spd = spF;
    R.pos = pos;
    R.lastFix = now();
    R.locating = false;
    R.problem = null;
    noteFlight(pos, spF);
    // up in a plane the ground weather can't be caught, so the app doesn't keep asking for it
    if (flying() || RU.isFlying(pos.altF, spF)) { R.flightPos = pos; render(); return; }
    var a = RU.areaOf(pos.lat, pos.lon);
    if (!R.area || a.id !== R.area.id) enterArea(a);
    else if (!R.wx || now() - R.wx.at > REFRESH) refreshWeather();
    render();
  }

  /* a plane: two of the last three readings high and fast. It stops counting as a flight once that stops */
  function noteFlight(pos, sp) {
    var f = RU.isFlying(pos.altF, sp);
    R.flyReads.push(f);
    if (R.flyReads.length > 3) R.flyReads.shift();
    var yes = R.flyReads.filter(Boolean).length;
    if (yes >= 2) { if (!R.flyingNow) addLog('Flying'); R.flyingNow = true; R.flyAt = now(); }
    else if (yes === 0) R.flyingNow = false;
  }
  function flying() { return R.flyingNow && now() - R.flyAt < 3 * MIN; }
  function flightSun() {
    var p = R.flightPos || R.pos;
    return p ? RU.cloudSunset(now(), p.lat, p.lon, p.altF) : null;
  }
  function flightKey() { return 'cloudsunset|' + today(); }
  function enterArea(a) {
    var first = !R.area;
    if (S.drive && S.haul && !first) tripDiag().areas += 1;
    R.area = a;
    R.place = S.names[a.id] || null;
    R.cls = null; R.wonders = []; R.spots = []; R.seen = []; R.coming = []; R.warning = null; R.reading = null;
    var cached = cachedWeather(a.id);
    R.wx = cached;
    if (cached) evaluate();
    nameArea(a);
    if (!cached || now() - cached.at > 5 * MIN) refreshWeather();
    else if (S.drive) driveSeal();
    if (!first && !S.drive) {
      var name = R.place ? R.place.short : 'a new area';
      toast('You’re in ' + name + ' now. New area, new catches.');
    }
  }
  function nameArea(a) {
    if (S.names[a.id] || !R.pos) return;
    var pos = R.pos;
    fetchJSON('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + pos.lat.toFixed(5) + '&longitude=' + pos.lon.toFixed(5) + '&localityLanguage=en', 8000).then(function (j) {
      var city = (j && j.city) || '', loc = (j && j.locality) || '', sub = (j && j.principalSubdivision) || '';
      if (!city && !loc && !sub) return;
      var name = loc && city && loc !== city ? loc + ', ' + city : (city || loc || sub);
      S.names[a.id] = { name: name, short: loc || city || sub };
      save();
      if (R.area && R.area.id === a.id) { R.place = S.names[a.id]; render(); }
    }).catch(function () {});
  }
  function placeFor(areaId) {
    if (S.names[areaId]) return S.names[areaId].short;
    if (R.area && R.area.id === areaId && R.area) return 'the area near ' + R.area.lat.toFixed(2) + ', ' + R.area.lon.toFixed(2);
    return 'an unnamed area';
  }
  function placeLong() { return R.place ? R.place.name : 'Your area'; }

  /* ---------- live weather ---------- */

  function fetchJSON(url, ms) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 10000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) {
        return r.text().then(function (txt) {
          var reason = '';
          try { reason = JSON.parse(txt).reason || ''; } catch (e) {}
          throw new Error('HTTP ' + r.status + (reason ? ': ' + reason : ''));
        });
      }
      return r.json();
    }, function (e) { clearTimeout(timer); throw e; });
  }
  function weatherUrl(cells, opts) {
    return 'https://api.open-meteo.com/v1/forecast?latitude=' + cells.map(function (c) { return c.lat.toFixed(4); }).join(',') +
      '&longitude=' + cells.map(function (c) { return c.lon.toFixed(4); }).join(',') +
      '&current=' + CUR +
      (opts.hourly ? '&hourly=' + HRLY : '') +
      (opts.daily ? '&daily=sunrise,sunset&forecast_days=3' : '') +
      '&timezone=auto&timeformat=unixtime&wind_speed_unit=mph';
  }
  function pick(src, key, i) {
    var v = i === null ? src[key] : (src[key] ? src[key][i] : undefined);
    return num(v);
  }
  function readingFrom(src, i) {
    return {
      temp: pick(src, 'temperature_2m', i), humidity: pick(src, 'relative_humidity_2m', i), isDay: pick(src, 'is_day', i) === 1,
      rain: pick(src, 'rain', i), showers: pick(src, 'showers', i), snowfall: pick(src, 'snowfall', i), code: pick(src, 'weather_code', i),
      cloud: pick(src, 'cloud_cover', i), cloudLow: pick(src, 'cloud_cover_low', i), cloudHigh: pick(src, 'cloud_cover_high', i),
      wind: pick(src, 'wind_speed_10m', i), gusts: pick(src, 'wind_gusts_10m', i), vis: pick(src, 'visibility', i)
    };
  }
  function parseLoc(j) {
    if (!j || !j.current) throw new Error('No weather in the reply');
    var c = j.current;
    var cur = readingFrom(c, null);
    cur.t = (num(c.time) || 0) * 1000;
    cur.interval = num(c.interval) || 900;
    var loc = { elevation: num(j.elevation), cur: cur, hourly: null, daily: null };
    if (j.hourly && Array.isArray(j.hourly.time)) {
      loc.hourly = j.hourly.time.map(function (tt, i) {
        var o = readingFrom(j.hourly, i);
        o.t = tt * 1000;
        o.interval = 3600;
        return o;
      });
    }
    if (j.daily && Array.isArray(j.daily.time)) {
      loc.daily = j.daily.time.map(function (d, i) {
        return { day: d * 1000, sunrise: (num(j.daily.sunrise && j.daily.sunrise[i]) || 0) * 1000, sunset: (num(j.daily.sunset && j.daily.sunset[i]) || 0) * 1000 };
      });
    }
    return loc;
  }
  function cacheWeather(wx) {
    try {
      var all = JSON.parse(localStorage.getItem(WX_KEY) || '{}');
      all[wx.areaId] = wx;
      var ids = Object.keys(all).sort(function (a, b) { return all[b].at - all[a].at; });
      ids.slice(6).forEach(function (k) { delete all[k]; });
      localStorage.setItem(WX_KEY, JSON.stringify(all));
    } catch (e) {}
  }
  function cachedWeather(areaId) {
    try {
      var all = JSON.parse(localStorage.getItem(WX_KEY) || '{}');
      var w = all[areaId];
      return w && w.here && now() - w.at < HOUR ? w : null;
    } catch (e) { return null; }
  }
  function refreshWeather(loud) {
    if (!R.area) return Promise.resolve();
    if (R.fetching && R.fetching.areaId === R.area.id) return R.fetching.p;
    fetchStorms();
    var a = R.area;
    var driving = !!S.drive;
    var nb = RU.neighbours(a).filter(function (c) { return !c.here; });
    var pHere = fetchJSON(weatherUrl([a], { hourly: !driving, daily: true }), 12000);
    var pNear = driving ? Promise.resolve(null) : fetchJSON(weatherUrl(nb, {}), 12000).catch(function () { return null; });
    var p = Promise.all([pHere, pNear]).then(function (res) {
      var here = parseLoc(Array.isArray(res[0]) ? res[0][0] : res[0]);
      var cells = null;
      if (res[1]) {
        var arr = Array.isArray(res[1]) ? res[1] : [res[1]];
        cells = nb.map(function (c, i) {
          var l = null;
          try { l = arr[i] ? parseLoc(arr[i]) : null; } catch (e) { l = null; }
          return { id: c.id, dir: c.dir, lat: c.lat, lon: c.lon, loc: l };
        });
      } else if (R.wx && R.wx.areaId === a.id) {
        cells = R.wx.cells;
      }
      if (!here.hourly && R.wx && R.wx.areaId === a.id && R.wx.here) here.hourly = R.wx.here.hourly;
      var wx = { areaId: a.id, at: now(), here: here, cells: cells };
      if (R.area && R.area.id === a.id) {
        R.wx = wx;
        R.wxError = null;
        if (R.problem === 'weather') R.problem = null;
        cacheWeather(wx);
        evaluate();
        fetchDepth();
        if (S.drive) driveSeal();
      }
    }).catch(function (e) {
      R.wxError = e;
      if (S.drive && S.haul) tripDiag().wxFail += 1;
      if (!R.wx) showProblem('weather');
      else if (loud) toast('Couldn’t get new weather. Showing the last update.');
    }).then(function () {
      R.fetching = null;
      render();
    });
    R.fetching = { areaId: a.id, p: p };
    render();
    return p;
  }
  /* how deep the snow is, for the strength of snowy catches. It's asked for on its own, only while it's snowing,
     so the main weather never depends on it. Without it, snow is measured by how fast it's falling */
  var SNOWY = { snow: true, heavysnow: true, blizzard: true, sleet: true, thundersnow: true, firstflakes: true };
  function fetchDepth() {
    var a = R.area;
    if (!a || !R.cls || !R.cls.ids.some(function (id) { return SNOWY[id]; })) return;
    if (R.depthArea === a.id && now() - R.depthAt < 20 * MIN) return;
    R.depthAt = now();
    fetchJSON('https://api.open-meteo.com/v1/forecast?latitude=' + a.lat.toFixed(4) + '&longitude=' + a.lon.toFixed(4) +
      '&hourly=snow_depth&forecast_days=1&timezone=auto&timeformat=unixtime', 8000).then(function (j) {
      var h = j && j.hourly;
      if (!h || !Array.isArray(h.time) || !Array.isArray(h.snow_depth) || !R.area || R.area.id !== a.id) return;
      var t = now(), best = -1;
      h.time.forEach(function (tt, i) { if (num(h.snow_depth[i]) !== undefined && (best < 0 || Math.abs(tt * 1000 - t) < Math.abs(h.time[best] * 1000 - t))) best = i; });
      if (best < 0) return;
      R.depth = Math.round(h.snow_depth[best] * 1000) / 10;
      R.depthArea = a.id;
    }).catch(function () {});
  }
  function dayFor(daily, t) {
    if (!daily) return null;
    for (var i = 0; i < daily.length; i++) if (t >= daily[i].day && t < daily[i].day + 24 * HOUR) return daily[i];
    return null;
  }
  function evaluate() {
    var wx = R.wx;
    if (!wx || !wx.here || !R.area) return;
    var a = R.area;
    var here = wx.here;
    var t = now();
    var o = {};
    Object.keys(here.cur).forEach(function (k) { o[k] = here.cur[k]; });
    o.t = t;
    var d = dayFor(here.daily, t);
    var elev = num(here.elevation);
    if (elev === undefined) elev = 50;
    var near = { rain: false, showers: false, snow: false, hail: false, fog: false, thunder: false, lowerFog: false };
    var sea = false;
    (wx.cells || []).forEach(function (c) {
      var l = c.loc;
      if (!l) return;
      var code = l.cur.code;
      var fogLike = code === 45 || code === 48 || (typeof l.cur.vis === 'number' && l.cur.vis < 1000);
      if (RU.isRainCode(code) || (num(l.cur.rain) || 0) + (num(l.cur.showers) || 0) >= 0.09) near.rain = true;
      if (RU.CODES.showers.indexOf(code) !== -1 || RU.CODES.violent.indexOf(code) !== -1) near.showers = true;
      if (RU.CODES.snow.indexOf(code) !== -1 || RU.CODES.heavySnow.indexOf(code) !== -1 || (num(l.cur.snowfall) || 0) > 0) near.snow = true;
      if (RU.CODES.hail.indexOf(code) !== -1) near.hail = true;
      if (fogLike) near.fog = true;
      if (RU.CODES.thunder.indexOf(code) !== -1) near.thunder = true;
      if (fogLike && typeof l.elevation === 'number' && l.elevation <= elev - 100) near.lowerFog = true;
      if (typeof l.elevation === 'number' && l.elevation <= 0.5) sea = true;
    });
    var ctx = { lat: a.lat, lon: a.lon, elevation: elev, coastal: sea && elev < 60, thunderNearby: near.thunder, sunrise: d && d.sunrise, sunset: d && d.sunset,
      storm: stormAt(t, a.lat, a.lon) };
    R.storm = ctx.storm;
    R.reading = o;
    R.ctx = ctx;
    R.near = near;
    R.cls = RU.classify(o, ctx);
    R.wonders = RU.wonders(o, ctx);
    R.spots = RU.spots(o, { lat: ctx.lat, lon: ctx.lon, elevation: elev, near: near });
    R.seen = RU.spottable(o, ctx, hoursAround(here, t), near);
    R.coming = timeline(here, ctx);
    R.warning = warningFrom(R.coming);
  }
  /* hourly readings for the last hour and this one: each hourly value covers the hour before its time */
  function hoursAround(here, t) {
    if (!here.hourly) return [];
    return here.hourly.filter(function (h) { return h.t > t - HOUR && h.t <= t + HOUR; });
  }
  function classifyCell(c, hereCtx) {
    if (!c || !c.loc) return null;
    var o = {};
    Object.keys(c.loc.cur).forEach(function (k) { o[k] = c.loc.cur[k]; });
    o.t = now();
    return RU.classify(o, { lat: c.lat, elevation: num(c.loc.elevation), sunrise: hereCtx.sunrise, sunset: hereCtx.sunset, storm: hereCtx.storm });
  }
  function timeline(here, ctx) {
    if (!here.hourly) return [];
    var t0 = now();
    var segs = [];
    here.hourly.forEach(function (h) {
      if (h.t + HOUR <= t0 || h.t > t0 + 48 * HOUR) return;
      var d = dayFor(here.daily, h.t);
      var st = stormAt(h.t, ctx.lat, ctx.lon);
      var c = RU.classify(h, { lat: ctx.lat, elevation: ctx.elevation, coastal: ctx.coastal, sunrise: d && d.sunrise, sunset: d && d.sunset, storm: st });
      var id = c.headline || 'quiet';
      var last = segs[segs.length - 1];
      if (last && last.id === id) last.to = h.t + HOUR;
      else segs.push({ id: id, from: Math.max(h.t, t0), to: h.t + HOUR, storm: id === 'namedstorm' && st ? st.name : null });
    });
    return segs;
  }
  function warningFrom(segs) {
    if (!R.cls) return null;
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (s.from <= now()) continue;
      if (s.from - now() > 3 * HOUR) break;
      if (s.id !== 'quiet' && RU.rank(s.id) >= 3 && R.cls.ids.indexOf(s.id) === -1) return s;
    }
    return null;
  }

  /* ---------- what can be caught ---------- */

  function wKey(areaId, id) { return today() + '|' + areaId + '|' + id; }
  function coolLeft(key) { var u = S.cool[key]; return u && u > now() ? u - now() : 0; }
  function isPassenger() { return S.passengerUntil > now(); }
  function blockedByMoving() { return R.fast && !isPassenger() && !S.drive; }
  function stale() { return !R.wx || now() - R.wx.at > FRESH; }
  function catchables() {
    if (!R.cls || !R.area) return [];
    return R.cls.ids.map(function (id) {
      var key = wKey(R.area.id, id);
      return { id: id, key: key, caught: !!S.caught[key], cool: coolLeft(key) };
    });
  }
  function nextTarget(list) {
    for (var i = 0; i < list.length; i++) if (!list[i].caught && !list[i].cool) return list[i];
    return null;
  }
  function pendingChanges() {
    if (!R.cls || !R.area || !R.reading) return [];
    var prev = S.recent[R.area.id] || [];
    return RU.changesFor(prev, R.cls.ids, R.reading.temp, now()).filter(function (cid) { return !S.caught[wKey(R.area.id, cid)]; });
  }

  /* ---------- icons ---------- */

  var P = {
    sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"></path>',
    rise: '<path d="M3 18h18M7.5 18a4.5 4.5 0 0 1 9 0M12 7v3M5.6 11.6l1.4 1.4M18.4 11.6L17 13"></path>',
    cloud: '<path d="M7 18.5h9.5a4 4 0 0 0 .4-7.98 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 18.5z"></path>',
    cloudHi: '<path d="M7 14.5h9.5a4 4 0 0 0 .4-7.98 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 14.5z"></path>',
    rain: '<path d="M8.5 17.5l-1 3M12.5 17.5l-1 3M16.5 17.5l-1 3"></path>',
    drizzle: '<path d="M9 18v1.5M13 18v1.5M17 18v1.5"></path>',
    flakes: '<circle cx="8.5" cy="18.5" r=".9"></circle><circle cx="12.5" cy="20.5" r=".9"></circle><circle cx="16.5" cy="18.5" r=".9"></circle>',
    hail: '<circle cx="8.5" cy="18.5" r="1.4"></circle><circle cx="12.5" cy="20.5" r="1.4"></circle><circle cx="16.5" cy="18.5" r="1.4"></circle>',
    flake: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5L12 6l2.5-1.5M9.5 19.5L12 18l2.5 1.5"></path>',
    bolt: '<path d="M12.5 15l-2.5 4h3.5l-2 3.5"></path>',
    fog: '<path d="M4 8h16M3 12h18M5 16h14M7 20h10"></path>',
    wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7"></path>',
    moon: '<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"></path>',
    full: '<circle cx="12" cy="12" r="7.5"></circle><circle cx="10" cy="10" r="1.4"></circle><circle cx="14.5" cy="14" r="1"></circle>',
    star: '<path d="M12 3l2.2 5.6L20 9.3l-4.4 3.9 1.3 5.8L12 16l-4.9 3 1.3-5.8L4 9.3l5.8-.7z"></path>',
    bow: '<path d="M3 18a9 9 0 0 1 18 0M7 18a5 5 0 0 1 10 0"></path>',
    halo: '<circle cx="12" cy="12" r="3"></circle><circle cx="12" cy="12" r="8"></circle>',
    drop: '<path d="M12 3.5c3 4 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-10z"></path>',
    eclipse: '<circle cx="12" cy="12" r="7.5"></circle><path d="M14 4.8a7.5 7.5 0 0 1 0 14.4 7.5 7.5 0 0 0 0-14.4z"></path>',
    sunCloud: '<path d="M9 4.5V3M4.5 9H3M5.6 5.6l-1-1M13.4 5.6l1-1"></path><path d="M6.3 10.2A3.5 3.5 0 0 1 12.6 8"></path><path d="M8.5 19.5h8a3.5 3.5 0 0 0 .3-6.98 4.8 4.8 0 0 0-9.2 1.05A3 3 0 0 0 8.5 19.5z"></path>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>',
    flower: '<circle cx="12" cy="9" r="2.2"></circle><path d="M12 6.8a2.6 2.6 0 1 1 2.2-3.9M14.2 9a2.6 2.6 0 1 1 1.6 4.4M9.8 9a2.6 2.6 0 1 0-1.6 4.4M12 6.8a2.6 2.6 0 1 0-2.2-3.9M12 11.2V21M12 17c-2-2.6-4.6-2.6-6-1.6M12 15.5c1.8-2 4.2-2.2 5.6-1.2"></path>',
    wave: '<path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0"></path>',
    tree: '<path d="M12 21v-6M12 15c-4.4 0-7-2.2-7-5.4C5 6.4 8 3.5 12 3.5s7 2.9 7 6.1c0 3.2-2.6 5.4-7 5.4z"></path><path d="M8.5 21h7"></path>',
    bone: '<g transform="rotate(-38 12 12)"><path d="M7.2 10.5H16.8A2.1 2.1 0 1 1 20.2 10.8V13.2A2.1 2.1 0 1 1 16.8 13.5H7.2A2.1 2.1 0 1 1 3.8 13.2V10.8A2.1 2.1 0 1 1 7.2 10.5Z"></path></g>',
    paw: '<path d="M12 12.6c-2.6 0-5 2.6-5 4.8 0 1.6 1.2 2.4 2.6 2.4 1 0 1.6-.5 2.4-.5s1.4.5 2.4.5c1.4 0 2.6-.8 2.6-2.4 0-2.2-2.4-4.8-5-4.8z"></path><ellipse cx="5.6" cy="10.6" rx="1.7" ry="2.1"></ellipse><ellipse cx="9.3" cy="6.4" rx="1.8" ry="2.3"></ellipse><ellipse cx="14.7" cy="6.4" rx="1.8" ry="2.3"></ellipse><ellipse cx="18.4" cy="10.6" rx="1.7" ry="2.1"></ellipse>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"></path>',
    crown: '<path d="M4 18.5h16M4.6 15.5L3.4 7.5l4.8 3.6L12 4.5l3.8 6.6 4.8-3.6-1.2 8z"></path>',
    heart: '<path d="M12 20.2s-7.6-4.6-7.6-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.6 2.6c0 5.6-7.6 10.2-7.6 10.2z"></path>'
  };
  var ICON = {
    clear: ['sun'], hotday: ['sun'], heatwave: ['sun'], scorcher: ['sun'], sunrise: ['rise'], goldenhour: ['rise'],
    sunnyspells: ['sunCloud'], sunbreak: ['sunCloud'], calm: ['sunCloud'], winddrops: ['sunCloud'],
    overcast: ['cloud'], quiet: ['moon'],
    drizzle: ['cloudHi', 'drizzle'], rain: ['cloudHi', 'rain'], showers: ['cloudHi', 'drizzle'], downpour: ['cloudHi', 'rain'],
    sidewaysrain: ['cloudHi', 'rain'], cloudburst: ['cloudHi', 'rain'], monsoon: ['cloudHi', 'rain'], freezingrain: ['cloudHi', 'rain'],
    sleet: ['cloudHi', 'flakes'], snow: ['cloudHi', 'flakes'], heavysnow: ['cloudHi', 'flakes'], blizzard: ['cloudHi', 'flakes'], firstflakes: ['cloudHi', 'flakes'],
    hail: ['cloudHi', 'hail'], frost: ['flake'], hardfrost: ['flake'], thaw: ['drop'],
    rumble: ['cloudHi', 'bolt'], sheetlightning: ['cloudHi', 'bolt'], thunderstorm: ['cloudHi', 'bolt'], lightningstrike: ['cloudHi', 'bolt'],
    supercell: ['cloudHi', 'bolt'], thundersnow: ['cloudHi', 'bolt'], stormfront: ['cloudHi', 'bolt'],
    mist: ['fog'], fog: ['fog'], lowcloud: ['fog'], seafret: ['fog'], freezingfog: ['fog'], foglifts: ['fog'], cloudinversion: ['fog'],
    breeze: ['wind'], windy: ['wind'], gale: ['wind'], stormforce: ['wind'], namedstorm: ['wind'], tornado: ['wind'],
    starry: ['moon'], fullmoon: ['full'], supermoon: ['full'], moonbow: ['bow'], meteor: ['star'], aurora: ['star'],
    sunhalo: ['halo'], sundog: ['halo'], rainbow: ['bow'], doublerainbow: ['bow'], fogbow: ['bow'], eclipse: ['eclipse']
  };
  function icon(id, size) {
    var s = size || 18;
    var parts = (ICON[id] || [id in P ? id : 'cloud']).map(function (k) { return P[k]; }).join('');
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + parts + '</svg>';
  }

  /* ---------- rendering ---------- */

  function render() {
    renderTop();
    if (R.tab === 'catch') renderCatch();
    else if (R.tab === 'shelf') renderShelfHead();
    else if (R.tab === 'animals') renderAnimalHead();
    else renderMore();
    if (S.drive) renderDrive();
  }
  function jarCount() { return RU.shelfProgress(S.book).jars; }
  function renderTop() {
    var L = RU.levelFor(S.points);
    $('lvl').textContent = 'Lv ' + L;
    $('lvl').setAttribute('aria-label', 'Level ' + L + ', ' + S.points + ' points. Open your shelf');
    $('nav-n').textContent = jarCount() + '/' + RU.SHELF_TOTAL;
  }
  function showProblem(kind) {
    R.problem = kind;
    render();
  }
  var PROBLEMS = {
    denied: ['Location is switched off for this app', 'Weather Catch needs your location to know which weather you’re in. Turn on location for this website in your browser or phone settings, then tap Try again.'],
    timeout: ['Couldn’t find where you are', 'Finding your location took too long. Check location services are on, then try again.'],
    unavailable: ['Couldn’t find where you are', 'Your phone couldn’t work out where you are. Check location services are on, then try again.'],
    insecure: ['Open the app from its secure link', 'Phones only share location with secure websites. Open the app from its https:// address.'],
    unsupported: ['This browser can’t share your location', 'Try opening the app in Safari or Chrome.'],
    weather: ['Couldn’t get the weather', 'Check your internet connection, then try again.']
  };
  function renderCatch() {
    var onboard = !S.onboarded;
    var problem = !onboard && R.problem && !(R.problem !== 'weather' && R.area) && !flying() ? R.problem : null;
    $('onboard').hidden = !onboard;
    $('problem').hidden = !problem;
    $('live').hidden = onboard || !!problem;
    if (problem) {
      $('problem-title').textContent = PROBLEMS[problem][0];
      $('problem-text').textContent = PROBLEMS[problem][1];
      var detail = problem === 'weather' && R.wxError ? String(R.wxError.message || R.wxError).slice(0, 200) : '';
      $('problem-detail').textContent = detail ? 'Details: ' + detail : '';
      $('problem-detail').hidden = !detail;
      $('problem-btn').hidden = problem === 'unsupported' || problem === 'insecure';
    }
    if (onboard || problem) return;
    renderSky();
    renderFlight();
    renderStormNote();
    renderCatchBox();
    renderAlso();
    renderWonders();
    renderSpotTip();
    renderNearby();
    renderComing();
    renderLog();
    var L = RU.levelFor(S.points);
    var warn = $('warn');
    if (R.warning && RU.unlocked('warnings', L)) {
      warn.hidden = false;
      warn.textContent = 'Heads up: ' + segName(R.warning) + ' is forecast here from ' + hm(R.warning.from) + '. Be ready to catch it.';
    } else warn.hidden = true;
  }
  function renderSky() {
    if (flying()) {
      var fp = R.flightPos || R.pos, fs = flightSun();
      $('area-name').textContent = 'Above the clouds';
      $('area-note').textContent = 'Flying' + (fp && typeof fp.spd === 'number' ? ' at ' + Math.round(fp.spd * 3.6) + ' km/h' : '');
      $('temp').textContent = fp && typeof fp.altF === 'number' ? Math.round(fp.altF).toLocaleString('en-GB') + ' m' : '';
      $('cond-name').textContent = fs && fs.now ? 'Sunset over the clouds' : 'Above the clouds';
      var fpill = $('cond-pill');
      fpill.hidden = !(fs && fs.now);
      if (fs && fs.now) { fpill.setAttribute('data-r', 'legendary'); $('cond-rarity').textContent = 'Legendary · ' + RU.points('cloudsunset') + ' pts'; }
      $('updated').textContent = 'The weather on the ground can’t be caught from a plane';
      $('refresh-btn').disabled = true;
      return;
    }
    var head = R.cls ? R.cls.headline : null;
    $('area-name').textContent = R.area ? placeLong() : (R.locating ? 'Finding you…' : 'Your area');
    $('area-note').textContent = isPassenger() ? 'Passenger mode · area about 5 km across' : 'Area about 5 km across';
    $('temp').textContent = R.reading && typeof R.reading.temp === 'number' ? Math.round(R.reading.temp) + '°C' : '';
    var pill = $('cond-pill');
    if (!R.cls) {
      $('cond-name').textContent = R.area ? 'Checking the sky…' : 'Finding you…';
      pill.hidden = true;
    } else if (!head) {
      $('cond-name').textContent = R.reading && R.reading.isDay ? 'Calm and quiet' : 'A quiet night';
      pill.hidden = true;
    } else {
      $('cond-name').textContent = liveName(head);
      pill.hidden = false;
      pill.setAttribute('data-r', T(head).r);
      $('cond-rarity').textContent = rlabel(head) + ' · ' + livePoints(head) + ' pts';
    }
    var up = $('updated');
    if (R.fetching && !R.wx) up.textContent = 'Checking the weather…';
    else if (R.wx) up.textContent = (R.fetching ? 'Updating… ' : '') + 'Weather from ' + hm(R.wx.at) + (stale() ? ' · out of date' : '');
    else up.textContent = 'Waiting for your location…';
    $('refresh-btn').disabled = !!R.fetching || !R.area;
  }
  /* while a named storm is on: say so, and what it takes to catch it here */
  function renderStormNote() {
    var el = $('storm-note');
    if (!el) return; // an older page without the note, just after an update
    var st = R.storm;
    if (!st || !R.cls || !R.area) { el.hidden = true; el.innerHTML = ''; return; }
    var nm = esc(st.name);
    var e = S.book.namedstorm;
    var have = !!(e && e.storms && e.storms[st.name]);
    var g = R.reading && typeof R.reading.gusts === 'number' ? Math.round(R.reading.gusts) : null;
    var html;
    if (R.cls.ids.indexOf('namedstorm') !== -1) {
      html = S.caught[wKey(R.area.id, 'namedstorm')] ? '<strong>Storm ' + nm + ' is here.</strong> You’ve caught it in this area today. Catch it again in a new area, or tomorrow if it’s still here.' :
        '<strong>Storm ' + nm + ' is here.</strong> ' + (have ? 'Catch it again for more points and another mystery jar.' : 'Catch it while it lasts. Each storm only comes once.');
    } else {
      html = '<strong>Storm ' + nm + ' is crossing the UK.</strong> Catch it when it reaches you: gusts of 35 mph or more, or rain with gusts of 25 mph.' + (g !== null ? ' Gusts here now: ' + g + ' mph.' : '');
    }
    el.innerHTML = html;
    el.hidden = false;
  }
  /* up in a plane: how high, and whether the sun is setting yet */
  function renderFlight() {
    var card = $('flight-card');
    if (!card) return;
    var on = flying();
    card.hidden = !on;
    // the ground weather's tools aren't any use from a plane
    ['refresh-btn', 'spot-btn', 'drive-btn'].forEach(function (k) { if ($(k)) $(k).hidden = on; });
    ['nearby', 'comingup'].forEach(function (k) { if ($(k) && $(k).parentNode) $(k).parentNode.hidden = on; });
    if (!on) return;
    var fp = R.flightPos || R.pos, fs = flightSun();
    $('fc-alt').textContent = fp && typeof fp.altF === 'number' ? Math.round(fp.altF).toLocaleString('en-GB') + ' m up' : 'High up';
    var btn = $('fc-btn'), txt;
    if (S.caught[flightKey()]) {
      btn.disabled = true; btn.textContent = 'Caught today';
      txt = '<strong>Sunset Over the Clouds is on your shelf.</strong> You can catch it again on another day’s flight.';
    } else if (fs && fs.now) {
      btn.disabled = false; btn.textContent = 'Catch Sunset Over the Clouds';
      txt = '<strong>The sun is setting over the clouds.</strong> Catch it before it goes. It’s a legendary jar, and it never slips away.';
    } else if (fs && fs.why === 'soon') {
      btn.disabled = true; btn.textContent = 'Wait for the sunset';
      txt = 'The sun sets in about ' + (fs.mins > 90 ? Math.round(fs.mins / 60) + ' hours' : minutes(fs.mins * MIN)) + ' where the plane is. Keep the app open and look out of the window.';
    } else {
      btn.disabled = true; btn.textContent = fs && fs.why === 'set' ? 'The sun has set' : 'Not sunset yet';
      txt = 'Sunset Over the Clouds can be caught when the sun sets while you’re flying.';
    }
    $('fc-text').innerHTML = txt + ' The weather on the ground can’t be caught from up here.';
  }
  function renderCatchBox() {
    if (flying()) { $('lock-card').hidden = true; $('pass-pill').hidden = true; $('catch-box').hidden = true; R.target = null; return; }
    var locked = blockedByMoving();
    $('lock-card').hidden = !locked;
    $('pass-pill').hidden = !isPassenger();
    $('catch-box').hidden = locked;
    var btn = $('catch-btn'), hint = $('catch-hint');
    var list = catchables();
    var target = nextTarget(list);
    R.target = target;
    if (!R.cls) {
      btn.disabled = true;
      btn.textContent = 'Catch';
      hint.innerHTML = R.area ? 'Checking the weather for your area…' : 'Finding where you are…';
      return;
    }
    if (!list.length) {
      btn.disabled = true;
      btn.textContent = 'Nothing to catch right now';
      hint.innerHTML = R.reading && !R.reading.isDay ? 'A quiet night. Look for Sky Wonders below, or come back when the weather changes.' : 'Nothing to catch here right now. If you can see rain or fog, tap Spot something.';
      return;
    }
    if (!target) {
      var cooling = list.filter(function (c) { return c.cool; })[0];
      btn.disabled = true;
      if (cooling) {
        btn.textContent = liveName(cooling.id) + ' slipped away';
        hint.innerHTML = 'Try again in ' + minutes(cooling.cool) + ' if it’s still here.';
      } else {
        btn.textContent = 'All caught here today';
        hint.innerHTML = 'You’ve caught everything in this area today. Wait for the weather to change, or move to a new area.';
      }
      return;
    }
    var t = T(target.id);
    btn.disabled = false;
    btn.textContent = 'Catch ' + liveName(target.id);
    var e = S.book[target.id];
    var html;
    if (stale()) html = 'The weather here is from ' + hm(R.wx.at) + '. Tap Catch and the app will check it first.';
    else if (!e || !e.n) html = '<strong>New jar!</strong> You haven’t caught ' + esc(liveName(target.id)) + ' before.';
    else if (e.places.indexOf(placeFor(R.area.id)) === -1) html = 'On your shelf ×' + e.n + '. Catching it here adds <strong>a new place</strong>' + (caughtToday(target.id) ? ', for ' + livePoints(target.id) + ' points: half, as you’ve caught it today already.' : '.');
    else html = 'On your shelf ×' + e.n + '. Catching it again earns <strong>' + livePoints(target.id) + ' points</strong>' + (caughtToday(target.id) ? ', half, as you’ve caught it today already' : '') + '.';
    var ch = pendingChanges();
    if (ch.length) html += ' The weather has turned, so you’ll also get <strong>' + esc(T(ch[0]).name) + '</strong>.';
    hint.innerHTML = html;
  }
  function renderAlso() {
    var list = catchables().filter(function (c) { return !R.target || c.id !== R.target.id; });
    var block = $('also-block');
    if (!list.length || blockedByMoving() || flying()) { block.hidden = true; return; }
    block.hidden = false;
    $('also-title').textContent = R.target ? 'Also here right now' : 'Here right now';
    $('also').innerHTML = list.map(function (c) {
      var t = T(c.id), name = liveName(c.id);
      var state = c.caught ? 'Caught today' : c.cool ? 'Back in ' + minutes(c.cool) : livePoints(c.id) + ' pts';
      var done = c.caught || c.cool;
      return '<button type="button" class="chip' + (done ? ' done' : '') + '" data-catch="' + c.id + '"' + (done ? ' disabled' : '') + ' aria-label="' + esc((done ? '' : 'Catch ') + name + ', ' + rlabel(c.id) + ', ' + state) + '">' +
        '<span class="rc-' + t.r + '">' + icon(c.id, 18) + '</span><span>' + esc(name) + '</span><span class="chip-pts">' + (c.caught ? icon('check', 14) + ' today' : esc(state)) + '</span></button>';
    }).join('');
  }
  function renderWonders() {
    var block = $('wonder-block');
    if (!R.wonders.length || flying()) { block.hidden = true; return; }
    block.hidden = false;
    $('wonders').innerHTML = R.wonders.map(function (w) {
      var t = T(w.id);
      var caught = !!S.caught[w.key];
      var cool = coolLeft(w.key);
      var note = w.note || t.when + '.';
      var btn = caught ? '<span class="pill rc-' + t.r + '">' + (R.reading && !R.reading.isDay ? 'Caught tonight' : 'Caught today') + '</span>' :
        cool ? '<span class="small">Back in ' + minutes(cool) + '</span>' :
        '<button class="btn" type="button" data-wonder="' + w.id + '"' + (blockedByMoving() ? ' disabled' : '') + '>Catch</button>';
      return '<div class="wcard"><span class="rc-' + t.r + '">' + icon(w.id, 26) + '</span><div class="wcard-body"><div class="wcard-name">' + esc(t.name) + '</div>' +
        '<div class="tl-r rc-' + t.r + '">' + rlabel(w.id) + ' · ' + livePoints(w.id) + ' pts</div><div class="wcard-note">' + esc(note) + '</div></div>' + btn + '</div>';
    }).join('');
  }
  var TIP_ORDER = ['moonbow', 'cloudinversion', 'rainbow', 'fogbow', 'sheetlightning'];
  function renderSpotTip() {
    var tip = $('spot-tip');
    var s = null;
    for (var i = 0; i < TIP_ORDER.length && !s; i++) {
      var sp = R.spots.filter(function (x) { return x.id === TIP_ORDER[i] && x.possible; })[0];
      if (sp && !S.caught[sp.id + '|' + today()]) s = sp;
    }
    if (!s) { tip.hidden = true; return; }
    tip.hidden = false;
    tip.innerHTML = '<strong>' + esc(T(s.id).name) + ' weather.</strong> ' + esc(s.why);
  }
  function lockedCard(level, text) {
    var L = RU.levelFor(S.points);
    return '<div class="locked-card">' + icon('lock', 20) + '<span><strong>Unlocks at Level ' + level + '.</strong> ' + esc(text) + ' You’re Level ' + L + ', with ' + (RU.pointsFor(level) - S.points) + ' points to go.</span></div>';
  }
  function renderNearby() {
    var box = $('nearby');
    var L = RU.levelFor(S.points);
    if (!RU.unlocked('nearby', L)) { box.innerHTML = lockedCard(5, 'See what the weather is doing in the areas around you.'); return; }
    if (!R.area || !R.wx || !R.wx.cells) { box.innerHTML = '<p class="small">Nearby weather appears once the weather has loaded.</p>'; return; }
    var cellById = {};
    R.wx.cells.forEach(function (c) { cellById[c.id] = c; });
    var rareNote = [];
    var html = RU.neighbours(R.area).map(function (c) {
      var id;
      if (c.here) id = R.cls ? R.cls.headline : null;
      else {
        var cc = classifyCell(cellById[c.id], R.ctx || {});
        id = cc ? cc.headline : null;
        if (id && RU.rank(id) >= 3) rareNote.push(liveName(id) + ' to the ' + c.dir.toLowerCase());
      }
      var t = id ? T(id) : null;
      var rare = id && RU.rank(id) >= 3;
      return '<div class="g9' + (c.here ? ' here' : '') + (rare ? ' rare' : '') + '"' + (rare ? ' style="border-color:var(--r-' + t.r + ')"' : '') + '>' +
        '<span class="g9-dir">' + (c.here ? 'You' : esc(c.dir)) + '</span>' +
        (t ? '<span class="rc-' + t.r + '">' + icon(id, 20) + '</span><span class="g9-name">' + esc(liveName(id)) + '</span>' : '<span class="g9-name">' + (cellById[c.id] || c.here ? 'Quiet' : 'No data') + '</span>') +
        '</div>';
    }).join('');
    box.innerHTML = '<div class="grid9">' + html + '</div><p class="near-note">' + (rareNote.length ? 'Rare nearby: ' + esc(rareNote.join(', ')) + '. Each area is about 5 km across.' : 'Nothing rare in the areas around you right now.') + '</p>';
  }
  function renderComing() {
    var box = $('comingup');
    var L = RU.levelFor(S.points);
    if (!RU.unlocked('comingup', L)) { box.innerHTML = lockedCard(10, 'See the rare weather forecast for your area over the next two days.'); return; }
    if (!R.coming.length) { box.innerHTML = '<p class="small">The forecast appears once the weather has loaded.</p>'; return; }
    var rare = R.coming.filter(function (s) { return s.id !== 'quiet' && RU.rank(s.id) >= 3 && s.from > now() - HOUR; });
    var rows = rare.length ? rare.slice(0, 6) : R.coming.slice(0, 5);
    var head = rare.length ? '' : '<p class="small">Nothing rare forecast in the next two days. Here’s what’s coming:</p>';
    box.innerHTML = head + '<ul class="timeline">' + rows.map(function (s) {
      var t = s.id === 'quiet' ? null : T(s.id);
      return '<li><span class="tl-when">' + esc(s.from <= now() ? 'Now' : whenLabel(s.from)) + '</span><span class="tl-what">' + (t ? '<span class="rc-' + t.r + '">' + icon(s.id, 18) + '</span>' + esc(segName(s)) : icon('quiet', 18) + 'Quiet night') + '</span>' +
        (t ? '<span class="tl-r rc-' + t.r + '">' + rlabel(s.id) + '</span>' : '<span></span>') + '</li>';
    }).join('') + '</ul>';
  }
  function renderLog() {
    var d = today();
    var items = S.log.filter(function (e) { return RU.dayKey(e.t) === d; }).slice(-8).reverse();
    $('log').innerHTML = items.length ? items.map(function (e) {
      return '<li><span class="lt">' + hm(e.t) + '</span><span>' + esc(e.text) + '</span></li>';
    }).join('') : '<li class="empty">Nothing caught yet today.</li>';
  }

  /* ---------- the shelf ---------- */

  function tierText(n) {
    var t = RU.tierFor(n), nx = RU.nextTier(n);
    if (!nx) return t.name;
    return (t ? t.name + ', ' : '') + (nx.at - n) + ' more for ' + nx.name.toLowerCase();
  }
  function tierOf(n) { var t = RU.tierFor(n); return t ? t.id : ''; }
  function medal(n) { var t = RU.tierFor(n); return t ? '<span class="medal m-' + t.id + '" aria-hidden="true"></span>' : ''; }
  function listText(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function dateLabel(t) { return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function shelfIds() { return RU.ORDERED.filter(RU.catchable).map(function (t) { return t.id; }); }
  function rowIds(elId) { return RU.rowTypes(elId).map(function (t) { return t.id; }); }
  function elName(elId) { var el = RU.ELEMENTS.filter(function (x) { return x.id === elId; })[0]; return el ? el.name : ''; }
  /* up to n jars to show off: the rarest ones you have first, then ones still to catch */
  function bestJars(ids, n) {
    var have = ids.filter(function (id) { return S.book[id] && S.book[id].n; });
    var rest = ids.filter(function (id) { return have.indexOf(id) === -1; });
    have.sort(function (a, b) { return RU.rank(b) - RU.rank(a) || T(a).order - T(b).order; });
    return have.concat(rest).slice(0, n || 3);
  }
  /* the live sky in words, for the Sky Jar */
  function skyName() {
    if (!R.cls) return 'waiting for the weather';
    if (R.cls.headline) return T(R.cls.headline).name;
    return R.reading && !R.reading.isDay ? 'a quiet night' : 'calm and quiet';
  }
  function skyMeta() { return S.rewards.full ? 'Live · ' + skyName() : 'Fill your shelf'; }

  var DARK_ROWS = { storm: true, wonder: true };
  var DARK_LOOK = { glass: 'rgba(255,255,255,0.62)', q: '#9AA6C2', veil: 'rgba(22,28,50,0.74)' };
  var CHEVRON = '<svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>';
  var BULBS = ['#FFE3A6', '#FFB547', '#FF94A8', '#8FD3FF', '#9BF0C4'];
  /* shelf lights: a glowing strip, or fairy lights hanging in swags across the top */
  var LANTERNS = ['#FF9A62', '#FFD36B', '#FF7B9C', '#9FD8FF', '#B8F0A0'];
  function lightsFor(kind, swags) {
    if (kind === 'glow') return '<span class="shelf-lights glow" aria-hidden="true"></span>';
    if (kind === 'lanterns' || kind === 'stars') {
      // paper lanterns, or a string of stars, hanging along a cord across the top
      swags = swags || 2;
      var w2 = 300 / swags, d2 = 'M0 3', out = '', n = 0;
      for (var s2 = 0; s2 < swags; s2++) {
        d2 += 'Q' + (s2 * w2 + w2 / 2) + ' 30 ' + ((s2 + 1) * w2) + ' 3';
        [0.22, 0.5, 0.78].forEach(function (q) {
          var x = (s2 + q) / swags * 100, y = 2 + 10.5 * 4 * q * (1 - q);
          out += '<i style="left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + 'px;--b:' + (kind === 'stars' ? '#FFF1B8' : LANTERNS[n % LANTERNS.length]) + ';animation-delay:-' + ((n * 0.71) % 3).toFixed(2) + 's"></i>';
          n += 1;
        });
      }
      return '<span class="shelf-lights ' + kind + '" aria-hidden="true"><svg viewBox="0 0 300 30" preserveAspectRatio="none"><path d="' + d2 + '" vector-effect="non-scaling-stroke"></path></svg>' + out + '</span>';
    }
    if (kind !== 'fairy') return '';
    swags = swags || 3;
    var w = 300 / swags, d = 'M0 2.5', bulbs = '', i = 0;
    for (var s = 0; s < swags; s++) {
      d += 'Q' + (s * w + w / 2) + ' 37.5 ' + ((s + 1) * w) + ' 2.5';
      [0.15, 0.38, 0.62, 0.85].forEach(function (u) {
        var x = (s + u) / swags * 100, y = 2 + 14 * 4 * u * (1 - u);
        bulbs += '<i style="left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + 'px;--b:' + BULBS[i % BULBS.length] + ';animation-delay:-' + ((i * 0.53) % 2.4).toFixed(2) + 's"></i>';
        i += 1;
      });
    }
    return '<span class="shelf-lights fairy" aria-hidden="true"><svg viewBox="0 0 300 30" preserveAspectRatio="none"><path d="' + d + '" vector-effect="non-scaling-stroke"></path></svg>' + bulbs + '</span>';
  }
  function rowState(elId) { return { themed: !!S.rewards['row-' + elId], gold: !!S.rewards['gold-' + elId] }; }
  function shelfClass(elId, themed, gold) { return 'shelf' + (themed ? ' th-' + elId : ' plain') + (gold ? ' gold' : ''); }
  /* walnut is a dark wood, so jars still to catch are drawn in light glass on it */
  function darkWood(wood) { return (wood || S.style.wood) === 'walnut'; }
  /* one storm's own jar on the Storm shelf */
  function stormCell(name, dark) {
    var x = S.book.namedstorm.storms[name];
    var label = 'Storm ' + name + ', ' + rlabel('namedstorm') + ', caught ' + x.n + ' ' + plural(x.n, 'time');
    return '<button type="button" class="jarcell" data-jar="namedstorm" data-storm="' + esc(name) + '" aria-label="' + esc(label) + '">' +
      '<canvas data-id="namedstorm" data-storm="' + esc(name) + '"' + (dark ? ' data-dark="1"' : '') + ' aria-hidden="true"></canvas><span class="plank"></span>' +
      '<span class="jar-name">Storm ' + esc(name) + (x.n > 1 ? ' ×' + x.n : '') + '</span><span class="jar-meta rc-legendary">' + esc(rlabel('namedstorm')) + '</span></button>';
  }
  function jarCell(t, dark) {
    if (t.id === 'namedstorm') {
      var names = stormNames(S.book.namedstorm);
      if (names.length) return names.map(function (nm) { return stormCell(nm, dark); }).join('');
    }
    var e = S.book[t.id];
    var n = e ? e.n : 0;
    var later = !RU.catchable(t);
    var label = t.name + ', ' + rlabel(t.id) + (n ? ', caught ' + n + ' ' + plural(n, 'time') + (tierOf(n) ? ', ' + tierOf(n) : '') + ', ' + varsFound(e) + ' of ' + VARS.length + ' variants' : later ? ', coming in a later version' : ', not caught yet');
    var meta = later && !n ? 'Later' : rlabel(t.id);
    var nx = n ? RU.nextTier(n) : null;
    var bar = nx ? '<span class="tierbar t-' + nx.id + '" aria-hidden="true"><i style="width:' + Math.round(n / nx.at * 100) + '%"></i></span>' : '';
    if (nx) label += ', ' + (nx.at - n) + ' more for ' + nx.name.toLowerCase();
    return '<button type="button" class="jarcell' + (n ? '' : ' locked') + '" data-jar="' + t.id + '" aria-label="' + esc(label) + '">' +
      '<canvas data-id="' + t.id + '"' + (dark ? ' data-dark="1"' : '') + ' aria-hidden="true"></canvas><span class="plank"></span>' +
      '<span class="jar-name">' + esc(t.name) + (n > 1 ? ' ×' + n : '') + '</span><span class="jar-meta rc-' + t.r + '">' + (n ? medal(n) : '') + esc(meta) + '</span>' + bar + '</button>';
  }
  /* a small shelf for previews. o: { el, themed, gold, wood, lights } */
  function miniShelf(ids, o) {
    o = o || {};
    var lights = o.lights || S.style.lights;
    var dark = o.themed ? DARK_ROWS[o.el] : darkWood(o.wood);
    var cells = ids.map(function (id) {
      return '<div class="jarcell"><canvas data-id="' + id + '"' + (dark ? ' data-dark="1"' : '') + ' aria-hidden="true"></canvas><span class="plank"></span></div>';
    }).join('');
    return '<div class="mini wood-' + (o.wood || S.style.wood) + ' lights-' + lights + '"><div class="' + shelfClass(o.el, o.themed, o.gold) + '">' + lightsFor(lights) + cells + '</div></div>';
  }
  function collectPreview(box) { R.previewJars = Array.prototype.slice.call(box.querySelectorAll('canvas[data-id], canvas[data-look]')); }
  function skySection() {
    var have = !!S.rewards.full;
    var label = 'The Sky Jar, ' + (have ? 'showing the live sky: ' + skyName() : 'not earned yet. Fill your shelf to earn it');
    return '<section class="shelf-sec sky-sec" id="row-sky">' +
      '<div class="shelf sky-shelf' + (have ? ' sky-have' : '') + '">' + lightsFor(S.style.lights) +
      '<h2 class="plate-h"><span class="plate plate-static"><span class="plate-name">The Sky Jar</span>' +
      (have ? '<span class="row-pill gold-pill">' + esc(RU.KEEPER) + '</span>' : '<span class="plate-n">' + jarCount() + ' of ' + RU.SHELF_TOTAL + '</span>') + '</span></h2>' +
      '<button type="button" class="jarcell sky-cell' + (have ? '' : ' locked') + '" data-jar="sky" aria-label="' + esc(label) + '">' +
      '<canvas data-id="sky" aria-hidden="true"></canvas><span class="plank"></span><span class="jar-name">The Sky Jar</span>' +
      '<span class="jar-meta rc-legendary" id="sky-meta">' + esc(skyMeta()) + '</span></button>' +
      '<p class="sky-note">' + (have ? 'It always shows the live sky wherever you are.' : 'Fill every jar on your shelf to earn it. It always shows the live sky wherever you are.') + '</p></div></section>';
  }
  function swatchHtml(kind) {
    if (kind === 'sky') return '<canvas class="sw-jar" data-id="sky" aria-hidden="true"></canvas>';
    if (kind.indexOf('lights-') === 0) return '<span class="sw-box ' + kind + '">' + lightsFor(kind.slice(7), 1) + '<span class="plank"></span></span>';
    return '<span class="sw-box ' + (kind === 'gold' ? 'gold' : kind) + '"><span class="plank"></span></span>';
  }
  function renderRewardCard(prog) {
    var next = RU.nextJarReward(prog.jars);
    var kind, sub = $('rw-sub');
    if (next) {
      $('rw-label').textContent = 'Next reward';
      $('rw-name').textContent = next.prize || next.name;
      if (sub) sub.textContent = (next.id === 'full' ? 'Fill your whole shelf · ' + RU.KEEPER + ' title · ' : 'At ' + next.need + ' jars · ') + '+' + next.bonus + ' bonus points';
      $('rw-bar').hidden = false;
      $('rw-fill').style.width = Math.round(Math.min(1, prog.jars / next.need) * 100) + '%';
      $('rw-count').textContent = prog.jars + ' of ' + next.need + ' jars · +' + next.bonus;
      kind = next.wood ? 'wood-' + next.wood : next.lights ? 'lights-' + next.lights : 'sky';
    } else {
      var gold = prog.rows.filter(function (r) { return S.rewards['gold-' + r.el]; }).length;
      $('rw-label').textContent = RU.KEEPER;
      $('rw-name').textContent = gold < prog.rows.length ? 'Gold shelves' : 'Every shelf is gold';
      if (sub) sub.textContent = gold < prog.rows.length ? 'Get every jar in a row to gold for +1000 bonus points. ' + gold + ' of ' + prog.rows.length + ' gold so far.' : 'You’ve won everything there is to win.';
      $('rw-bar').hidden = true;
      $('rw-count').textContent = gold < prog.rows.length ? gold + ' of ' + prog.rows.length + ' rows gold' : 'All done';
      kind = 'gold';
    }
    var sw = $('rw-swatch');
    if (!sw) return;
    if (sw.getAttribute('data-k') !== kind) {
      sw.setAttribute('data-k', kind);
      sw.innerHTML = swatchHtml(kind);
      var cv = sw.querySelector('canvas');
      if (cv) { R.shelfJars.push(cv); if (jarObserver) jarObserver.observe(cv); }
    }
  }
  function renderShelfHead() {
    var L = RU.levelFor(S.points);
    var lo = RU.pointsFor(L), hi = RU.pointsFor(L + 1);
    $('lv-n').textContent = L;
    $('lv-title').textContent = S.rewards.full ? RU.KEEPER : RU.titleFor(L);
    $('lv-pts').textContent = S.points.toLocaleString('en-GB') + ' / ' + hi.toLocaleString('en-GB') + ' points';
    $('lv-fill').style.width = Math.round((S.points - lo) / (hi - lo) * 100) + '%';
    var prog = RU.shelfProgress(S.book);
    var later = RU.ORDERED.filter(function (t) { return !RU.catchable(t); }).map(function (t) { return t.name; });
    if ($('shelf-note')) {
      $('shelf-note').textContent = later.length ? listText(later) + (later.length === 1 ? ' arrives' : ' arrive') + ' in a later version.' : '';
      $('shelf-note').hidden = !later.length;
    }
    renderRewardCard(prog);
    var sm = $('sky-meta');
    if (sm && sm.textContent !== skyMeta()) sm.textContent = skyMeta();
  }
  /* ---------- the display case: the best jar on the shelf, in the spotlight ---------- */
  function bestOnShelf() {
    var best = null;
    RU.ORDERED.forEach(function (t) {
      var e = S.book[t.id];
      if (!e || !e.n || !RU.catchable(t)) return;
      var cands = [];
      if (t.id === 'namedstorm' && stormNames(e).length) stormNames(e).forEach(function (nm) { var rec = stormRec(e, nm); cands.push({ storm: nm, v: (rec && rec.v) || 'c', n: e.storms[nm].n }); });
      else cands.push({ v: bestVariant(e), n: e.n });
      cands.forEach(function (c) {
        var score = RU.variantRank(c.v) * 1000 + RU.rank(t.id) * 100 + Math.min(99, c.n);
        if (!best || score > best.score) best = { id: t.id, v: c.v, storm: c.storm || null, score: score };
      });
    });
    return best;
  }
  function caseState() {
    var b = R.caseBest;
    if (!b) return { locked: true, id: 'case' };
    return b.storm ? stormState(b.storm) : jarState(b.id);
  }
  function shelfStats() {
    var prog = RU.shelfProgress(S.book), found = 0, legends = 0, golds = 0, total = 0;
    RU.ORDERED.filter(RU.catchable).forEach(function (t) {
      var e = S.book[t.id];
      total += VARS.length;
      if (!e || !e.n) return;
      found += varsFound(e);
      if (e.vars && e.vars.p) legends += 1;
      if (e.n >= RU.GOLD_AT) golds += 1;
    });
    return { jars: prog.jars, total: prog.total, found: found, vtotal: total, legends: legends, golds: golds };
  }
  function statChip(n, of, label) {
    return '<span class="stat"><span class="stat-v"><b>' + n + '</b>' + (of ? '<span class="stat-of">/' + of + '</span>' : '') + '</span><span class="stat-k">' + esc(label) + '</span></span>';
  }
  function renderCase() {
    var box = $('case');
    if (!box) return;
    var b = R.caseBest = bestOnShelf();
    var st = shelfStats();
    var t = b ? T(b.id) : null, vr = b ? RU.variant(b.id, b.v) : null, e = b ? S.book[b.id] : null;
    var name = b ? (b.storm ? 'Storm ' + b.storm : t.name) : 'Your best jar goes here';
    $('case-name').textContent = name;
    $('case-var').innerHTML = b ? '<span class="' + (vr.legend ? 'legend-text' : '') + '">' + esc(vr.name) + '</span><span class="case-odds">' + esc(vr.odds) + ' · ' + esc(vr.pct) + '</span>' : 'Catch your first weather to start your shelf.';
    $('case-meta').innerHTML = b ? '<span class="pill rc-' + t.r + '">' + esc(rlabel(b.id)) + '</span>' + (e && RU.tierFor(e.n) ? '<span class="case-tier">' + medal(e.n) + esc(RU.tierFor(e.n).name) + '</span>' : '') : '';
    var jb = $('case-jar');
    jb.setAttribute('aria-label', b ? 'Your best jar: ' + name + ', ' + vr.name + '. Open it' : 'No jars yet');
    jb.disabled = !b;
    $('case-stats').innerHTML = statChip(st.jars, st.total, 'jars') + statChip(st.found, st.vtotal, 'variants') +
      statChip(st.legends, null, st.legends === 1 ? 'legendary' : 'legendaries') + statChip(st.golds, null, 'gold jars');
    box.classList.toggle('case-empty', !b);
    box.classList.toggle('case-legend', !!(vr && vr.legend));
  }
  var ROW_ICON = { sun: 'clear', rain: 'rain', frost: 'snow', wind: 'windy', storm: 'thunderstorm', mist: 'fog', wonder: 'starry', change: 'sunbreak', garden: 'flower', pets: 'bone', coast: 'wave', country: 'tree', zoo: 'paw' };
  function secIcon(sec, size) { return icon(ROW_ICON[sec] || 'cloud', size); }
  function rowChips(prog) {
    return RU.ELEMENTS.map(function (el, i) {
      var row = prog.rows[i], st = rowState(el.id);
      return '<button type="button" class="rchip' + (row.complete ? ' done' : '') + (st.gold ? ' gold' : '') + '" data-jump="row-' + el.id + '" aria-label="' + esc(el.name + ' shelf, ' + row.have + ' of ' + row.need) + '">' +
        icon(ROW_ICON[el.id], 16) + '<span>' + esc(el.name) + '</span><span class="rchip-n">' + row.have + '/' + row.need + '</span></button>';
    }).join('') + '<button type="button" class="rchip' + (S.rewards.full ? ' gold' : '') + '" data-jump="row-sky">' + icon('star', 16) + '<span>Sky Jar</span></button>';
  }
  function renderShelf() {
    R.shelfJars = [];
    var sw = $('rw-swatch');
    if (sw) sw.removeAttribute('data-k');
    renderShelfHead();
    renderCase();
    var prog = RU.shelfProgress(S.book);
    if ($('row-chips')) $('row-chips').innerHTML = rowChips(prog);
    var box = $('shelves');
    // one cabinet: every row is a compartment with a nameplate, in the shelf's own wood
    box.className = 'shelves cabinet wood-' + S.style.wood + ' lights-' + S.style.lights;
    var html = RU.ELEMENTS.map(function (el, i) {
      var row = prog.rows[i];
      var types = RU.ORDERED.filter(function (t) { return t.el === el.id; });
      var st = rowState(el.id);
      var dark = st.themed ? DARK_ROWS[el.id] : darkWood();
      var pill = st.gold ? '<span class="row-pill gold-pill">Gold</span>' : st.themed ? '<span class="row-pill">Complete</span>' : '';
      var label = el.name + ' shelf, ' + row.have + ' of ' + row.need + (st.gold ? ', gold' : st.themed ? ', complete' : '') + '. See what this shelf earns';
      return '<section class="shelf-sec" id="row-' + el.id + '"><div class="' + shelfClass(el.id, st.themed, st.gold) + '"><span class="sec-wash w-' + el.id + '" aria-hidden="true"></span>' + lightsFor(S.style.lights) +
        '<h2 class="plate-h"><button type="button" class="plate p-' + el.id + '" data-row="' + el.id + '" aria-label="' + esc(label) + '">' + secIcon(el.id, 16) +
        '<span class="plate-name">' + esc(el.name) + '</span><span class="plate-n">' + row.have + ' of ' + row.need + '</span>' + pill + '</button></h2>' +
        types.map(function (t) { return jarCell(t, dark); }).join('') + '</div></section>';
    }).join('');
    box.innerHTML = S.rewards.full ? skySection() + html : html + skySection();
    var cvs = box.querySelectorAll('canvas');
    for (var i = 0; i < cvs.length; i++) R.shelfJars.push(cvs[i]);
    var cc = $('case-canvas');
    if (cc) R.shelfJars.push(cc);
    if (jarObserver) R.shelfJars.forEach(function (cv) { jarObserver.observe(cv); });
    requestAnimationFrame(function () { drawShelf(2, true); });
  }
  var jarObserver = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { en.target.wcSeen = en.isIntersecting; });
  }) : null;
  function glassLook() {
    var cs = getComputedStyle(document.documentElement);
    return { glass: cs.getPropertyValue('--glass').trim() || 'rgba(120,130,150,0.6)', q: cs.getPropertyValue('--muted').trim() || '#7A839C', veil: cs.getPropertyValue('--veil').trim() || 'rgba(200,206,220,0.72)' };
  }
  function lookFor(cv, base) { return cv.getAttribute('data-dark') ? DARK_LOOK : base; }
  function jarState(id) {
    if (id === 'sky') {
      if (!S.rewards.full) return { locked: true, ghost: skyScene() };
      return { id: skyScene(), night: R.reading ? !R.reading.isDay : false, glow: '#FFC766', lidTone: 'gold' };
    }
    var t = T(id);
    var e = S.book[id];
    if (!e || !e.n) return { locked: true, later: !RU.catchable(t), id: id };
    var cur = R.cls ? R.cls.ids : [];
    var sunny = cur.indexOf('clear') !== -1 || cur.indexOf('sunnyspells') !== -1 || cur.indexOf('hotday') !== -1 || cur.indexOf('heatwave') !== -1;
    var snowy = cur.indexOf('snow') !== -1 || cur.indexOf('heavysnow') !== -1 || cur.indexOf('blizzard') !== -1 || cur.indexOf('sleet') !== -1;
    var frosty = id === 'snow' || id === 'heavysnow' || id === 'blizzard' || id === 'firstflakes' || id === 'frost' || id === 'hardfrost';
    return {
      id: id, glow: RU.rank(id) >= 3 ? { rare: '#7DB4FF', epic: '#C4A0FF', legendary: '#FFC766' }[t.r] : null,
      drip: frosty && sunny, hat: frosty && snowy, img: e.photo ? photoImg(e.photo) : null,
      lidTone: tierOf(e.n) || null, mark: shelfMark(id, e)
    };
  }
  function drawJarOn(cv, st, t, look) {
    var size = SKY.fit(cv);
    if (!size) return;
    var ctx = cv.getContext('2d');
    if (ctx) SKY.jar(ctx, size.W, size.H, st, t, look);
  }
  function drawShelf(t, all) {
    var look = glassLook();
    R.shelfJars.forEach(function (cv) {
      if (!all && jarObserver && !cv.wcSeen) return;
      var storm = cv.getAttribute('data-storm');
      var st = cv.id === 'case-canvas' ? caseState() : storm ? stormState(storm) : jarState(cv.getAttribute('data-id'));
      if (st.locked && !st.ghost && !all) return;
      drawJarOn(cv, st, t, lookFor(cv, look));
    });
  }
  function drawPreview(t) {
    var look = glassLook();
    R.previewJars.forEach(function (cv) {
      var an = cv.getAttribute('data-animal');
      var lk = cv.getAttribute('data-look');
      if (lk) { drawJarOn(cv, lookSample(cv.getAttribute('data-sec'), lk), t, lookFor(cv, look)); return; }
      var an = cv.getAttribute('data-animal');
      if (an) { drawJarOn(cv, cv.getAttribute('data-home') ? animalView(an, cv.getAttribute('data-home')) : animalJar(an), t, lookFor(cv, look)); return; }
      var id = cv.getAttribute('data-id'), v = cv.getAttribute('data-var');
      drawJarOn(cv, v ? variantState(id, v) : jarState(id), t, lookFor(cv, look));
    });
  }
  /* has this jar had this variant? */
  function comboFound(id, v) {
    var e = S.book[id];
    return !!(e && e.vars && e.vars[v]);
  }
  /* one variant of a jar, in a glass (its best one if none is given): the one found, or a frosted preview of one
     still to find, even in a jar not caught yet */
  function variantState(id, v) {
    var e = S.book[id], x = e && e.vars && e.vars[v];
    var st = e && e.n ? jarState(id) : { id: id };
    st.mark = markOf(id, v, x ? x.seed : PREVIEW_SEED, x ? x.power : undefined);
    st.preview = !x;
    st.glow = null;
    st.hat = st.drip = false;
    return st;
  }


  /* ---------- shelf rewards ---------- */

  /* award every reward the shelf has earned but not yet been given: bonus points, and new woods and lights go straight on */
  function claimRewards() {
    var fresh = RU.rewardsEarned(S.book).filter(function (id) { return !S.rewards[id]; });
    // each reward remembers how the shelf looked just before it, so its card can show the change
    var out = fresh.map(claimOne);
    // shelf looks earned by levelling up, once the bonus points above are counted
    RU.levelRewardsAt(RU.levelFor(S.points)).forEach(function (rw) { if (!S.rewards[rw.id]) out.push(claimOne(rw.id)); });
    return out;
  }
  function claimOne(id) {
    var rw = RU.reward(id);
    var before = { wood: S.style.wood, lights: S.style.lights };
    S.rewards[id] = now();
    S.points += rw.bonus;
    if (rw.wood) S.style.wood = rw.wood;
    if (rw.lights) S.style.lights = rw.lights;
    addLog('Reward: ' + rw.name + (rw.bonus ? ' (+' + rw.bonus + ')' : ''));
    return { reward: id, before: before };
  }
  /* rewards earned before this version, or brought back with a backup code */
  function checkPendingRewards() {
    if (S.drive || !$('overlay').hidden) return;
    var before = RU.levelFor(S.points);
    var cards = claimRewards();
    if (S.oldJars) { cards.unshift({ oldJars: S.oldJars }); S.oldJars = null; }
    if (!cards.length) return;
    var after = RU.levelFor(S.points);
    if (after > before) { cards[cards.length - 1].lvUp = after; addLog('Level ' + after + '!'); }
    save();
    render();
    if (R.tab === 'shelf') renderShelf();
    openReveal(cards);
  }
  function rewardLabel(rw) { return rw.kind === 'jars' ? 'Shelf reward' : rw.kind === 'level' ? 'Level ' + rw.level + ' reward' : rw.kind === 'row' ? 'Row complete' : rw.kind === 'gold' ? 'Gold shelf' : 'Shelf complete'; }
  function rewardStats(rw) {
    var prog = RU.shelfProgress(S.book);
    if (rw.kind === 'jars') {
      var next = RU.nextJarReward(prog.jars);
      return (rw.wood ? 'You can switch woods any time in Shelf style.' : 'You can switch the lights any time in Shelf style.') +
        (next ? ' Next: ' + (next.prize || next.name).replace(/^The /, 'the ') + (next.id === 'full' ? ' when your shelf is full.' : ' at ' + next.need + ' jars.') : '');
    }
    if (rw.kind === 'level') {
      var nl = RU.LEVEL_REWARDS.filter(function (x) { return x.level > rw.level; })[0];
      return (rw.wood ? 'You can switch woods any time in Shelf style.' : 'You can switch the lights any time in Shelf style.') + (nl ? ' Something else is waiting at Level ' + nl.level + '.' : '');
    }
    if (rw.kind === 'row') return 'Rows finished: ' + prog.rows.filter(function (r) { return S.rewards['row-' + r.el]; }).length + ' of ' + prog.rows.length + '. ' + RU.reward('gold-' + rw.el).hint;
    if (rw.kind === 'gold') return 'Gold shelves: ' + prog.rows.filter(function (r) { return S.rewards['gold-' + r.el]; }).length + ' of ' + prog.rows.length + '.';
    return 'Your title is now ' + RU.KEEPER + '.';
  }
  var CONF = ['#F5B759', '#7DB4FF', '#C4A0FF', '#6FD6A8', '#FF94A8', '#FFFFFF'];
  var confTimer = 0;
  function confetti(n) {
    var box = $('confetti');
    clearTimeout(confTimer);
    box.innerHTML = '';
    if (reduce) return;
    var html = '';
    for (var i = 0; i < n; i++) {
      html += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + CONF[i % CONF.length] + ';animation-delay:' + (Math.random() * 0.6).toFixed(2) + 's;--dx:' +
        Math.round(Math.random() * 140 - 70) + 'px;--rot:' + Math.round(Math.random() * 900 - 450) + 'deg"></i>';
    }
    box.innerHTML = html;
    confTimer = setTimeout(function () { box.innerHTML = ''; }, 3600);
  }
  /* a shelf reward: a gift box to tap open, then the shelf as it was turns into the new one */
  function boxOn() { return !reduce && !(TEST && !/[?&]box=1(&|$)/.test(location.search)); }
  function rewardTeaser(rw) {
    if (rw.kind === 'jars') return rw.need + ' jars on your shelf!';
    if (rw.kind === 'level') return 'Level ' + rw.level + '!';
    if (rw.kind === 'row') return 'The ' + elName(rw.el) + ' row is full!';
    if (rw.kind === 'gold') return 'Every ' + elName(rw.el) + ' jar is gold!';
    return 'Your whole shelf is full!';
  }
  /* the little shelf on a reward card. swap: the shelf before the reward and after it, stacked, to turn one into the other */
  function rewardPreview(rw, swap, before) {
    if (rw.kind === 'full') return '<div class="r-sky' + (swap ? ' r-in' : '') + '"><div class="ov-jar"><canvas data-id="sky" aria-hidden="true"></canvas></div></div>';
    var now, old = '';
    if (rw.kind === 'jars' || rw.kind === 'level') {
      var ids = bestJars(shelfIds());
      now = miniShelf(ids);
      if (swap) old = miniShelf(ids, { wood: (before && before.wood) || S.style.wood, lights: (before && before.lights) || S.style.lights });
    } else {
      var rids = bestJars(rowIds(rw.el));
      now = miniShelf(rids, { el: rw.el, themed: true, gold: rw.kind === 'gold' });
      if (swap) old = miniShelf(rids, { el: rw.el, themed: rw.kind === 'gold', gold: false });
    }
    return swap ? '<div class="r-swap"><div class="r-old" aria-hidden="true">' + old + '</div><div class="r-new">' + now + '</div></div>' : now;
  }
  function showReward(r) {
    var rw = RU.reward(r.reward);
    if (!$('reward-view')) { toast('Reward: ' + rw.name + '! +' + rw.bonus + ' points'); nextReveal(); return; }
    showView('reward');
    R.cardState = null;
    var v = $('reward-view');
    v.classList.remove('pop');
    void v.offsetWidth;
    v.classList.add('pop');
    $('r-label').textContent = rewardLabel(rw);
    $('r-label').className = 'ov-label ' + (rw.kind === 'jars' || rw.kind === 'level' ? 'rc-rare' : 'rc-legendary');
    var prev = $('r-preview');
    var token = R.rewardToken = {};
    var finalActions = R.queue.length ? [{ label: 'Next', primary: true, fn: nextReveal }] :
      [{ label: 'Keep catching', fn: closeSheet }, { label: 'See your shelf', primary: true, fn: function () { seeShelf(rw); } }];
    var fill = function (anim) {
      $('r-title').textContent = rw.name;
      var pts = rw.bonus ? '+' + rw.bonus + ' bonus points' : 'A new look for your shelf';
      if (r.lvUp) pts += ' · Level ' + r.lvUp + '! ' + unlockText(r.lvUp);
      $('r-points').textContent = pts;
      $('r-line').textContent = rw.done;
      $('r-stats').textContent = rewardStats(rw);
      ['r-title', 'r-points', 'r-line', 'r-stats'].forEach(function (k) {
        var el = $(k);
        el.classList.remove('r-in');
        if (anim) { void el.offsetWidth; el.classList.add('r-in'); }
      });
      setActions('r-actions', finalActions);
    };
    var celebrate = function () {
      confetti(rw.kind === 'jars' || rw.kind === 'level' ? 36 : rw.kind === 'full' ? 70 : 50);
      sfx(rw.kind === 'full' ? 'legend' : 'reward');
      try { if (navigator.vibrate) navigator.vibrate([30, 60, 30]); } catch (e) {}
      if (r.lvUp) { setTimeout(function () { sfx('level'); }, 700); toast('Level ' + r.lvUp + '! ' + unlockText(r.lvUp)); }
    };
    if (!boxOn()) {
      prev.innerHTML = rewardPreview(rw, false);
      collectPreview(prev);
      fill(false);
      openSheet();
      celebrate();
      return;
    }
    // the closed box first
    prev.innerHTML = '<button type="button" class="gift' + (rw.kind === 'jars' || rw.kind === 'level' ? '' : ' gold-gift') + '" id="r-gift" aria-label="Open your reward">' +
      '<span class="gift-glow"></span><span class="gift-box"></span><span class="gift-lid"><span class="gift-bow"></span></span></button><p class="gift-hint">Tap to open</p>';
    R.previewJars = null;
    $('r-title').textContent = rewardTeaser(rw);
    $('r-points').textContent = '';
    $('r-line').textContent = rw.kind === 'full' ? 'The last prize of all is inside.' : rw.kind === 'jars' || rw.kind === 'level' ? 'Something new for your shelf is inside.' : 'Something new for this row is inside.';
    $('r-stats').textContent = '';
    var opened = false;
    var open = function () {
      if (opened || R.rewardToken !== token) return;
      opened = true;
      sfx('swirl');
      $('r-gift').classList.add('open');
      var hint = prev.querySelector('.gift-hint');
      if (hint) hint.style.visibility = 'hidden';
      setActions('r-actions', [{ label: 'Opening…', primary: true, fn: function () {} }]);
      $('r-actions').querySelector('button').disabled = true;
      try { if (navigator.vibrate) navigator.vibrate(25); } catch (e) {}
      setTimeout(function () {
        if (R.rewardToken !== token || R.view !== 'reward') return;
        prev.innerHTML = rewardPreview(rw, true, r.before);
        collectPreview(prev);
        setTimeout(function () {
          if (R.rewardToken !== token || R.view !== 'reward') return;
          var sw = prev.querySelector('.r-swap');
          if (sw) sw.classList.add('go');
          fill(true);
          celebrate();
        }, 650);
      }, 560);
    };
    $('r-gift').addEventListener('click', open);
    setActions('r-actions', [{ label: 'Open it', primary: true, fn: open }]);
    openSheet();
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
  }
  /* after old jars are opened: what turned up, with the best of them on a little shelf */
  function showOldJars(r) {
    var o = r.oldJars;
    var best = {};
    o.found.forEach(function (f) { if (T(f.id) && (!best[f.id] || RU.variantRank(f.v) > RU.variantRank(best[f.id]))) best[f.id] = f.v; });
    var ids = Object.keys(best).sort(function (a, b) { return RU.variantRank(best[b]) - RU.variantRank(best[a]) || RU.rank(b) - RU.rank(a); });
    var n = o.found.length;
    if (!$('reward-view')) { toast('Your old jars are open: ' + n + ' ' + plural(n, 'surprise') + '.'); nextReveal(); return; }
    showView('reward');
    R.cardState = null;
    var v = $('reward-view');
    v.classList.remove('pop');
    void v.offsetWidth;
    v.classList.add('pop');
    $('r-label').textContent = 'Mystery variants';
    $('r-label').className = 'ov-label rc-epic';
    $('r-title').textContent = 'Your old jars are open';
    $('r-points').textContent = n ? n + ' ' + plural(n, 'surprise') + ' in ' + o.n + ' old ' + plural(o.n, 'catch', 'catches') : 'All ' + o.n + ' came out Classic';
    $('r-line').textContent = 'Every jar you caught before variants just had its own mystery roll.';
    $('r-stats').textContent = n ? ids.slice(0, 4).map(function (id) { return T(id).name + ': ' + RU.variant(id, best[id]).name; }).join(' · ') +
      (ids.length > 4 ? ' · and ' + (ids.length - 4) + ' more' : '') : 'Classic turns up in 2 of every 3 jars. Every new catch is a fresh chance.';
    var show = ids.slice(0, 3);
    bestJars(shelfIds(), 6).forEach(function (id) { if (show.length < 3 && show.indexOf(id) === -1 && S.book[id] && S.book[id].n) show.push(id); });
    $('r-preview').innerHTML = miniShelf(show);
    collectPreview($('r-preview'));
    setActions('r-actions', R.queue.length ? [{ label: 'Next', primary: true, fn: nextReveal }] :
      [{ label: 'Keep catching', fn: closeSheet }, { label: 'See your shelf', primary: true, fn: function () { closeSheet(); selectTab('shelf'); } }]);
    openSheet();
    if (n) confetti(o.found.some(function (f) { return f.v === 'p'; }) ? 60 : 24);
  }
  function seeShelf(rw) {
    closeSheet();
    selectTab('shelf');
    var target = rw.kind === 'full' ? $('row-sky') : rw.el ? $('row-' + rw.el) : null;
    if (target) try { target.scrollIntoView({ block: 'start' }); } catch (e) { target.scrollIntoView(); }
  }
  function openRowInfo(elId) {
    var name = elName(elId);
    if (!name) return;
    var row = RU.shelfProgress(S.book).rows.filter(function (r) { return r.el === elId; })[0];
    var st = rowState(elId);
    var rowRw = RU.reward('row-' + elId), goldRw = RU.reward('gold-' + elId);
    var missing = RU.rowTypes(elId).filter(function (t) { return !(S.book[t.id] && S.book[t.id].n); }).map(function (t) { return t.name; });
    var later = RU.ORDERED.filter(function (t) { return t.el === elId && !RU.catchable(t); }).map(function (t) { return t.name; });
    var body = miniShelf(bestJars(rowIds(elId)), { el: elId, themed: true, gold: st.gold }) +
      '<p class="rw-p"><strong>' + (st.themed ? 'Earned.' : '+' + rowRw.bonus + ' points.') + '</strong> ' + esc(st.themed ? rowRw.done : rowRw.hint) + '</p>' +
      (st.themed ? '' : '<p class="muted">' + row.have + ' of ' + row.need + ' caught. Still to find: ' + esc(listText(missing)) + '.</p>') +
      '<p class="rw-p"><strong>' + (st.gold ? 'Gold.' : '+' + goldRw.bonus + ' points.') + '</strong> ' + esc(st.gold ? goldRw.done : goldRw.hint) + '</p>' +
      (st.gold ? '' : '<p class="muted">' + row.gold + ' of ' + row.need + ' gold so far.</p>') +
      (later.length ? '<p class="muted">' + esc(listText(later)) + (later.length === 1 ? ' arrives in a later version and doesn’t' : ' arrive in a later version and don’t') + ' count yet.</p>' : '');
    showInfo({ label: name + ' shelf', title: rowRw.name, body: body });
    collectPreview($('i-body'));
  }
  function styleChips(kind, list) {
    return '<div class="chips style-chips" role="group" aria-label="' + (kind === 'wood' ? 'Shelves' : 'Lights') + '">' + list.map(function (o) {
      var rw = RU.styleReward(kind, o.id);
      var open = !rw || !!S.rewards[rw.id];
      var on = S.style[kind] === o.id;
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-style="' + kind + ':' + o.id + '" aria-pressed="' + on + '"' + (open ? '' : ' disabled') + '>' +
        (on ? icon('check', 14) : open ? '' : icon('lock', 14)) + '<span>' + esc(o.name) + '</span>' + (open ? '' : '<span class="chip-pts">' + (rw.kind === 'level' ? 'Level ' + rw.level : rw.need + ' jars') + '</span>') + '</button>';
    }).join('') + '</div>';
  }
  function rewardItem(name, sub, done, status) {
    return '<li class="rw-item' + (done ? ' done' : '') + '"><span class="rw-ic">' + icon(done ? 'check' : 'lock', 16) + '</span><span class="rw-body"><span class="rw-n">' + esc(name) +
      '</span><span class="rw-s">' + esc(sub) + '</span></span><span class="rw-st">' + esc(done ? 'Earned' : status) + '</span></li>';
  }
  function styleBody() {
    var prog = RU.shelfProgress(S.book);
    var rows = prog.rows.filter(function (r) { return S.rewards['row-' + r.el]; }).length;
    var golds = prog.rows.filter(function (r) { return S.rewards['gold-' + r.el]; }).length;
    var L = RU.levelFor(S.points);
    var items = RU.JAR_REWARDS.map(function (rw) {
      return rewardItem(rw.name, rw.need + ' jars · +' + rw.bonus + ' points', !!S.rewards[rw.id], prog.jars + ' of ' + rw.need);
    }).join('') +
      RU.LEVEL_REWARDS.map(function (rw) { return rewardItem(rw.name, 'Reach Level ' + rw.level, !!S.rewards[rw.id], 'Level ' + L + ' of ' + rw.level); }).join('') +
      rewardItem('Finish a row', 'Each row gets its own look · +500 points', rows === prog.rows.length, rows + ' of ' + prog.rows.length) +
      rewardItem('Gold rows', 'Every jar in a row at gold · +1000 points', golds === prog.rows.length, golds + ' of ' + prog.rows.length) +
      rewardItem('The Sky Jar', 'Fill your whole shelf · ' + RU.KEEPER + ' · +2000 points', !!S.rewards.full, prog.jars + ' of ' + prog.total);
    return miniShelf(bestJars(shelfIds())) +
      '<h3 class="h2">Shelves</h3>' + styleChips('wood', RU.WOODS) +
      '<h3 class="h2">Lights</h3>' + styleChips('lights', RU.LIGHTS) +
      '<h3 class="h2">Jars</h3>' + jarPicker() +
      '<h3 class="h2">Rewards</h3><ul class="rw-list">' + items + '</ul>' +
      '<p class="muted">Tap the name of a row on your shelf to see what it needs.</p>';
  }
  function openStyle() {
    showInfo({ label: 'Your shelf', title: 'Shelf style and rewards', body: styleBody() });
    collectPreview($('i-body'));
    drawPreview(2);
    centerSecChip($('i-body'));
  }
  /* keep the section being styled in view in its row of chips */
  function centerSecChip(box) {
    var row = box.querySelector('.sec-chips'), on = row && row.querySelector('.sec-chip.on');
    if (on) row.scrollLeft = Math.max(0, on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2);
  }
  /* jar looks: pick a section, then its look. Each look is shown on that section's own best jar */
  function jarPicker() {
    var L = RU.levelFor(S.points), secs = sections();
    if (secs.indexOf(R.lookSec) === -1) R.lookSec = secs[0];
    var cur = S.style.jars[R.lookSec] || 'plain';
    var open = RU.JAR_LOOKS.filter(function (lk) { return L >= lk.level; }), next = RU.JAR_LOOKS.filter(function (lk) { return L < lk.level; })[0];
    return '<div class="chips style-chips sec-chips" role="group" aria-label="Section">' + secs.map(function (sec) {
        var on = sec === R.lookSec, lk = RU.jarLook(S.style.jars[sec] || 'plain');
        return '<button type="button" class="chip sec-chip s-' + sec + (on ? ' on' : '') + '" data-style="sec:' + sec + '" aria-pressed="' + on + '" aria-label="' + esc(sectionName(sec) + ', ' + lk.name) + '">' + secIcon(sec, 15) + '<span>' + esc(sectionName(sec)) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="look-grid" role="group" aria-label="' + esc('Jar look for ' + sectionName(R.lookSec)) + '">' + open.map(function (lk) {
        var on = lk.id === cur;
        return '<button type="button" class="look' + (on ? ' on' : '') + '" data-style="jar:' + R.lookSec + ':' + lk.id + '" aria-pressed="' + on + '">' +
          '<canvas data-look="' + lk.id + '" data-sec="' + R.lookSec + '" aria-hidden="true"></canvas><span class="look-n">' + (on ? icon('check', 13) : '') + esc(lk.name) + '</span></button>';
      }).join('') + '</div>' +
      '<p class="small">' + (next ? 'Next jar look: <strong>' + esc(next.name) + '</strong> at Level ' + next.level + '. ' : '') + 'Each section can have its own look.</p>';
  }
  /* a section's best jar, in a jar look, for the picker */
  function lookSample(sec, lookId) {
    var lk = RU.jarLook(lookId), st;
    if (AN && AN.ROWS.some(function (r) { return r.id === sec; })) {
      var ids = AN.rowTypes(sec).map(function (t) { return t.id; });
      var have = ids.filter(function (id) { return S.animals.book[id]; })[0] || ids[0];
      st = S.animals.book[have] ? animalJar(have) : animalView(have, 'h1');
    } else {
      var id = bestJars(rowIds(sec), 1)[0];
      st = S.book[id] && S.book[id].n ? jarState(id) : variantState(id, 'c');
    }
    st.preview = false;
    st.glow = null;
    st.mark = st.mark ? Object.assign({}, st.mark) : { seed: PREVIEW_SEED };
    if (lk && lk.key) st.mark.glass = lk.key; else delete st.mark.glass;
    return st;
  }
  function setStyle(val) {
    var p = val.split(':');
    var kind = p[0], id = p[1];
    if (kind === 'sec' || kind === 'jar') {
      if (sections().indexOf(id) === -1) return;
      if (kind === 'jar') {
        var lk = RU.jarLook(p[2]);
        if (!lk || RU.levelFor(S.points) < lk.level) return;
        if (lk.id === 'plain') delete S.style.jars[id]; else S.style.jars[id] = lk.id;
        save();
      }
      R.lookSec = id;
      var bd = $('i-body'), keep = $('sheet').scrollTop;
      bd.innerHTML = styleBody();
      collectPreview(bd);
      drawPreview(2);
      $('sheet').scrollTop = keep;
      centerSecChip(bd);
      var fb = bd.querySelector('[data-style="' + val + '"]');
      if (fb) try { fb.focus({ preventScroll: true }); } catch (e) {}
      return;
    }
    var list = kind === 'wood' ? RU.WOODS : kind === 'lights' ? RU.LIGHTS : null;
    if (!list || !known(list, id)) return;
    var rw = RU.styleReward(kind, id);
    if (rw && !S.rewards[rw.id]) return;
    S.style[kind] = id;
    save();
    var body = $('i-body');
    body.innerHTML = styleBody();
    collectPreview(body);
    var b = body.querySelector('[data-style="' + val + '"]');
    if (b) try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
  }

  /* ---------- levels ahead ----------
     Every level with something on it, up to 40: new titles, new powers and new shelf looks.
     The next two are shown in full. Further on, only hints: a title's first letters, and a clue to the rest. */
  function levelRoad() {
    var road = {};
    function at(L) { return road[L] || (road[L] = { level: L, items: [] }); }
    RU.TITLES.forEach(function (tt) { if (tt[0] > 1) at(tt[0]).items.push({ kind: 'title', name: tt[1] }); });
    RU.UNLOCKS.forEach(function (u) { at(u.level).items.push({ kind: 'unlock', name: u.name, text: u.text, hint: u.hint }); });
    RU.LEVEL_REWARDS.forEach(function (r) { at(r.level).items.push({ kind: 'style', name: r.name, text: r.about, hint: r.hint }); });
    RU.JAR_LOOKS.forEach(function (lk) { if (lk.level > 1) at(lk.level).items.push({ kind: 'jar', name: lk.name, text: lk.about, hint: 'A new look for your jars' }); });
    return Object.keys(road).map(Number).sort(function (a, b) { return a - b; }).map(function (L) { return road[L]; });
  }
  function maskName(n) { return n.split(' ').map(function (w) { return w.charAt(0) + w.slice(1).replace(/[^\s]/g, '•'); }).join(' '); }
  var ROAD_KIND = { title: 'New title', unlock: 'Unlocks', style: 'Shelf look', jar: 'Jar look' };
  function openLevels() {
    var L = RU.levelFor(S.points), lo = RU.pointsFor(L), hi = RU.pointsFor(L + 1);
    var road = levelRoad(), ahead = 0, nextLv = null;
    var rows = road.map(function (stop) {
      var done = stop.level <= L;
      var full = done || ahead < 2;
      if (!done) { if (nextLv === null) nextLv = stop.level; ahead += 1; }
      var items = stop.items.map(function (it) {
        var k = '<span class="lr-k">' + ROAD_KIND[it.kind] + '</span>';
        if (full) return '<li class="lr-item">' + k + '<strong>' + esc(it.name) + '</strong>' + (it.text ? '<span class="lr-t">' + esc(it.text) + '</span>' : '') + '</li>';
        return '<li class="lr-item hint">' + k + '<strong>' + esc(it.kind === 'title' ? maskName(it.name) : 'Something new') + '</strong><span class="lr-t">' + esc(it.kind === 'title' ? 'A new title to call yourself.' : it.hint + '…') + '</span></li>';
      }).join('');
      var togo = RU.pointsFor(stop.level) - S.points;
      return '<li class="lr-stop' + (done ? ' done' : '') + (stop.level === nextLv ? ' next' : '') + (full ? '' : ' far') + '" data-lv="' + stop.level + '">' +
        '<span class="lr-node" aria-hidden="true">' + (done ? icon('check', 14) : full ? stop.level : icon('lock', 13)) + '</span>' +
        '<div class="lr-body"><div class="lr-head"><span class="lr-lv">Level ' + stop.level + '</span><span class="lr-pts">' + (done ? 'Reached' : togo.toLocaleString('en-GB') + ' points to go') + '</span></div>' +
        '<ul class="lr-items">' + items + '</ul></div></li>';
    }).join('');
    var head = '<div class="lv-now"><div class="bar" aria-hidden="true"><span style="width:' + Math.round((S.points - lo) / (hi - lo) * 100) + '%"></span></div>' +
      '<p class="muted"><strong>' + (hi - S.points).toLocaleString('en-GB') + ' points</strong> to Level ' + (L + 1) + '. Catch weather to earn points: Common 10, Uncommon 25, Rare 75, Epic 200, Legendary 500. 4 and 5 star catches are worth more, and shelf rewards give bonus points. Animals earn 5 to 100 each.</p></div>';
    showInfo({
      label: 'Levels ahead', title: 'Level ' + L + ' · ' + (S.rewards.full ? RU.KEEPER : RU.titleFor(L)),
      body: head + '<ol class="road">' + rows + '</ol>'
    });
    var nx = $('i-body').querySelector('.lr-stop.next');
    if (nx) setTimeout(function () { var sh = $('sheet'); if (sh && nx.offsetTop > sh.clientHeight * 0.6) sh.scrollTop = nx.offsetTop - sh.clientHeight * 0.35; }, 30);
  }

  /* ---------- animals ----------
     Scan a real animal with the camera and it moves into its jar. The photo is looked at on the phone and thrown away
     straight after. Each animal can be caught once every 30 minutes. Its first catch moves into its everyday home;
     after that, every catch turns up in one of its five homes. */
  function freshAnimals() { return { book: {}, day: null, rows: {} }; }
  /* Hide & seek: finds that earned points today (d is the day), every find ever, each animal's quickest find in ms, and
     how hard the pictures are now (skill, 0 to 1: it goes up with quick finds and down with hints) */
  /* Weather Hop: each animal's best score (s), furthest day (d) and stage (g) and runs (n); and checkpoints, the day each
     animal can start from */
  function freshHop() { return { best: {}, ck: {} }; }
  function cleanHop(h) {
    var out = freshHop(), num = function (v) { return typeof v === 'number' && isFinite(v) && v >= 0 ? Math.floor(v) : 0; };
    if (!h || typeof h !== 'object' || Array.isArray(h)) return out;
    if (h.best && typeof h.best === 'object') Object.keys(h.best).forEach(function (id) { var b = h.best[id]; if (AN && AN.type(id) && b && typeof b === 'object') out.best[id] = { s: num(b.s), d: Math.max(1, num(b.d)), g: Math.min(4, num(b.g)), n: num(b.n), t: num(b.t) }; });
    if (h.ck && typeof h.ck === 'object') Object.keys(h.ck).forEach(function (id) { var d = num(h.ck[id]); if (AN && AN.type(id) && d >= 2) out.ck[id] = d; });
    return out;
  }
  function freshSeek() { return { d: '', n: 0, total: 0, best: {}, lv: 1, top: 1, plays: {}, boss: {}, t: {}, bossOn: 0, left: 0 }; }
  function cleanSeek(k) {
    var out = freshSeek();
    if (!k || typeof k !== 'object' || Array.isArray(k)) return out;
    if (typeof k.d === 'string') out.d = k.d;
    if (typeof k.n === 'number' && isFinite(k.n)) out.n = Math.max(0, Math.floor(k.n));
    if (typeof k.total === 'number' && isFinite(k.total)) out.total = Math.max(0, Math.floor(k.total));
    var whole = function (v, lo, hi) { return typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : lo; };
    out.lv = whole(k.lv, 1, LV.length + 1);
    out.top = Math.max(out.lv, whole(k.top, 1, LV.length + 1));
    ['plays', 'boss', 't'].forEach(function (key) {
      var o = k[key];
      if (o && typeof o === 'object' && !Array.isArray(o)) Object.keys(o).forEach(function (n) { var i = +n, v = o[n]; if (i >= 1 && i <= LV.length && typeof v === 'number' && isFinite(v) && v > 0) out[key][i] = Math.floor(v); });
    });
    // a boss level that was under way when the app closed counts as a loss
    var on = whole(k.bossOn, 0, LV.length);
    if (on && isBoss(on)) { out.lv = blockStart(on); out.left = on; }
    else out.left = whole(k.left, 0, LV.length);
    if (k.best && typeof k.best === 'object') Object.keys(k.best).forEach(function (id) { if (AN && AN.type(id) && typeof k.best[id] === 'number' && k.best[id] > 0) out.best[id] = k.best[id]; });
    return out;
  }
  function cleanAnimals(a) {
    var out = freshAnimals();
    if (!a || typeof a !== 'object' || Array.isArray(a) || !AN) return out;
    var num0 = function (v) { return typeof v === 'number' && isFinite(v) ? v : 0; };
    if (a.book && typeof a.book === 'object' && !Array.isArray(a.book)) Object.keys(a.book).forEach(function (id) {
      var e = a.book[id];
      if (!AN.type(id) || !e || typeof e.n !== 'number' || !(e.n >= 1)) return;
      var x = { n: Math.floor(e.n), first: { t: num0(e.first && e.first.t) }, last: num0(e.last), homes: {} };
      AN.HOME_SLOTS.forEach(function (h) {
        var hh = e.homes && e.homes[h];
        if (!hh || typeof hh.n !== 'number' || !(hh.n >= 1)) return;
        x.homes[h] = { n: Math.floor(hh.n), seed: num0(hh.seed) >>> 0, t: num0(hh.t) };
      });
      if (!Object.keys(x.homes).length) x.homes.h1 = { n: x.n, seed: 0, t: x.first.t };
      var u = e.undo;
      if (u && typeof u === 'object' && typeof u.t === 'number' && AN.HOME_SLOTS.indexOf(u.h) !== -1) x.undo = { t: u.t, h: u.h, pts: num0(u.pts), isNew: !!u.isNew, newH: !!u.newH, prevLast: num0(u.prevLast),
        prevHome: u.prevHome && typeof u.prevHome === 'object' ? { seed: num0(u.prevHome.seed) >>> 0, t: num0(u.prevHome.t) } : null, rowDone: typeof u.rowDone === 'string' ? u.rowDone : null, day: typeof u.day === 'string' ? u.day : '', print: !!u.print };
      if (Array.isArray(e.prints)) x.prints = e.prints.filter(function (p) { return typeof p === 'string' && /^[0-9.]+:[A-Za-z0-9+/=]+$/.test(p) && p.length < 900; }).slice(-PET_PRINTS);
      out.book[id] = x;
    });
    if (a.day && typeof a.day === 'object' && typeof a.day.d === 'string' && a.day.n && typeof a.day.n === 'object') {
      out.day = { d: a.day.d, n: {} };
      Object.keys(a.day.n).forEach(function (id) { if (AN.type(id) && typeof a.day.n[id] === 'number') out.day.n[id] = a.day.n[id]; });
    }
    if (a.rows && typeof a.rows === 'object') AN.ROWS.forEach(function (r) { if (typeof a.rows[r.id] === 'number') out.rows[r.id] = a.rows[r.id]; });
    return out;
  }
  function aName(t) { var n = t.name.toLowerCase(); return (/^[aeiou]/.test(n) ? 'an ' : 'a ') + n; }

  /* ---------- telling pets apart ----------
     Each pet counts once: catching your own dog over and over doesn't level up the Dog jar. Every pet caught leaves a
     print, the 512 numbers the spotter made from that scan (never the photo), kept on the phone. A new scan that's very
     like one of them is taken to be the same pet. Two pets that look almost the same can be mistaken for one another */
  var PET_SAME = 0.84, PET_PRINTS = 20;
  function isPet(id) { var t = AN && AN.type(id); return !!(t && t.row === 'pets'); }
  function packPrint(v) {
    var mx = 0, i;
    for (i = 0; i < v.length; i++) mx = Math.max(mx, Math.abs(v[i]));
    var sc = (mx || 1) / 127, q = new Int8Array(v.length), bin = '';
    for (i = 0; i < v.length; i++) q[i] = Math.max(-127, Math.min(127, Math.round(v[i] / sc)));
    var b = new Uint8Array(q.buffer);
    for (i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    return sc.toFixed(8) + ':' + btoa(bin);
  }
  function unpackPrint(p) {
    try {
      var parts = p.split(':'), sc = parseFloat(parts[0]), bin = atob(parts[1]), q = new Int8Array(bin.length), v = new Float32Array(bin.length), n = 0, i;
      for (i = 0; i < bin.length; i++) q[i] = (bin.charCodeAt(i) << 24) >> 24;
      for (i = 0; i < q.length; i++) { v[i] = q[i] * sc; n += v[i] * v[i]; }
      n = 1 / Math.sqrt(n || 1);
      for (i = 0; i < v.length; i++) v[i] *= n;
      return v;
    } catch (e) { return null; }
  }
  /* how like the closest pet already caught this scan is, from -1 to 1 (0 when there's nothing to compare) */
  function petLikeness(id, emb) {
    var e = S.animals.book[id], best = 0;
    if (!e || !e.prints || !emb) return 0;
    e.prints.forEach(function (p) {
      var v = unpackPrint(p);
      if (!v || v.length !== emb.length) return;
      var d = 0;
      for (var i = 0; i < v.length; i++) d += v[i] * emb[i];
      if (d > best) best = d;
    });
    return best;
  }
  function addPrint(id, emb) {
    var e = S.animals.book[id];
    if (!e || !emb) return;
    e.prints = (e.prints || []).concat([packPrint(emb)]).slice(-PET_PRINTS);
  }
  function homesFound(e) { return e ? AN.HOME_SLOTS.filter(function (h) { return !!e.homes[h]; }).length : 0; }
  /* the home on show on the shelf: the rarest one found */
  function bestHome(e) {
    var best = 'h1';
    AN.HOME_SLOTS.forEach(function (h) { if (e && e.homes[h]) best = h; });
    return best;
  }
  /* one home of an animal: the one found, or a frosted preview of one still to find. Its jar is in its row's jar look */
  function animalView(id, h) {
    var e = S.animals.book[id], x = e && e.homes[h], lk = jarLook(AN.type(id).row);
    var mk = { seed: x ? x.seed : PREVIEW_SEED };
    if (lk) mk.glass = lk;
    var hk = AN.homeRank ? AN.homeRank(h) : 0;
    if (x && hk >= 2) mk.shine = hk >= 4 ? 3 : hk >= 3 ? 2 : 1;
    return { animal: id, home: h, id: 'a:' + id, lidTone: e ? tierOf(e.n) || null : null, preview: !x, mark: mk };
  }
  /* an animal's jar on the shelf: its best home, or an empty jar still to fill */
  function animalJar(id) {
    var e = S.animals.book[id];
    if (!e || !e.n) return { locked: true, id: 'a:' + id };
    return animalView(id, bestHome(e));
  }
  function animalPicture(id, h, seed, w, hh) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = hh;
    var st = animalView(id, h);
    st.mark.seed = seed;
    st.preview = false;
    SKY.jar(cv.getContext('2d'), w, hh, st, 2, glassLook());
    return cv;
  }
  function animalToday(id) { var d = S.animals.day; return d && d.d === today() ? d.n[id] || 0 : 0; }
  function animalCool(id) { var e = S.animals.book[id]; return e && e.last ? Math.max(0, e.last + AN.COOLDOWN - now()) : 0; }
  function animalPoints(id, again) { return Math.max(1, Math.round(AN.points(id) * (again ? AN.REPEAT : 1))); }
  function awardAnimal(id) {
    var A = S.animals, t = AN.type(id), e = A.book[id], isNew = !e;
    if (!e) e = A.book[id] = { n: 0, first: { t: now() }, last: 0, homes: {} };
    var before = e.n, prevLast = e.last;
    e.n += 1;
    e.last = now();
    var seed = rand32() || 1;
    var h = isNew ? 'h1' : R.forceH || AN.rollHome(rand32() / 4294967296);
    var x = e.homes[h], newH = !x, prevHome = x ? { seed: x.seed, t: x.t } : null;
    if (!x) x = e.homes[h] = { n: 0, seed: seed, t: now() };
    x.n += 1;
    // each home shows its newest catch
    x.seed = seed; x.t = now();
    var again = animalToday(id) > 0;
    var pts = animalPoints(id, again);
    if (!A.day || A.day.d !== today()) A.day = { d: today(), n: {} };
    A.day.n[id] = (A.day.n[id] || 0) + 1;
    S.points += pts;
    // the first time a whole row of the animal shelf is filled: bonus points
    var rowDone = null;
    if (isNew && !A.rows[t.row]) {
      var row = AN.progress(A.book).rows.filter(function (rw) { return rw.row === t.row; })[0];
      if (row && row.complete) { A.rows[t.row] = now(); S.points += AN.ROW_BONUS; rowDone = t.row; }
    }
    // enough to take this catch back if the scan got the animal wrong
    e.undo = { t: now(), h: h, pts: pts, isNew: isNew, newH: newH, prevLast: prevLast, prevHome: prevHome, rowDone: rowDone, day: today(), print: false };
    addLog((isNew ? 'New animal: ' + t.name : t.name + ' · ' + AN.home(id, h).name) + (isNew ? ' (+' + pts + ')' : ' (×' + e.n + ', +' + pts + ')'));
    if (rowDone) addLog('Animal row complete: ' + AN.rowName(rowDone) + ' (+' + AN.ROW_BONUS + ')');
    return { animal: id, isNew: isNew, n: e.n, h: h, seed: seed, pts: pts, again: again, newH: newH && !isNew, tier: RU.tierReached(before, e.n), rowDone: rowDone };
  }

  /* ---------- taking back a wrong catch ----------
     The spotter can get an animal wrong (a hamster taken for a dog). For a day afterwards, the latest catch of an animal
     can be taken back: off the shelf, with its points. Catches from before 0.16.2 can only be taken back when they were
     the animal's only one */
  function canTakeBack(id) {
    var e = S.animals.book[id];
    if (!e) return false;
    if (e.undo) return now() - e.undo.t < 24 * HOUR;
    return e.n === 1 && !!e.first && now() - e.first.t < 24 * HOUR;
  }
  function takeBackAnimal(id) {
    var A = S.animals, e = A.book[id], t = AN.type(id);
    if (!e || !t || !canTakeBack(id)) return false;
    var u = e.undo || { isNew: true, pts: AN.points(id), day: RU.dayKey(e.first.t) };
    S.points = Math.max(0, S.points - (u.pts || 0));
    if (u.rowDone && A.rows[u.rowDone]) { delete A.rows[u.rowDone]; S.points = Math.max(0, S.points - AN.ROW_BONUS); }
    if (A.day && A.day.d === u.day && A.day.n[id]) A.day.n[id] -= 1;
    if (u.isNew) delete A.book[id];
    else {
      e.n -= 1;
      e.last = u.prevLast || 0;
      var x = e.homes[u.h];
      if (x) {
        if (u.newH || x.n <= 1) delete e.homes[u.h];
        else { x.n -= 1; if (u.prevHome) { x.seed = u.prevHome.seed; x.t = u.prevHome.t; } }
      }
      if (u.print && e.prints && e.prints.length) e.prints.pop();
      delete e.undo;
    }
    addLog('Took back ' + aName(t) + ': the scan got the animal wrong');
    save();
    return true;
  }
  function askTakeBack(id, fromReveal) {
    var t = AN.type(id), e = S.animals.book[id], u = e && e.undo, pts = u ? u.pts : AN.points(id);
    if (u && u.rowDone && S.animals.rows[u.rowDone]) pts += AN.ROW_BONUS;
    // after a fresh catch, carry on to anything else it earned; from the shelf, go back to the jar
    var after = function () { if (fromReveal && R.queue.length) nextReveal(); else closeSheet(); };
    stopSpin();
    showInfo({
      label: 'Wrong animal?', title: 'Take back this ' + t.name.toLowerCase() + '?',
      body: '<p>If the scan got the animal wrong, this takes the catch back off your shelf, with its ' + pts + ' ' + plural(pts, 'point') + '. Then you can scan it again.</p>',
      actions: [{ label: 'Keep it', fn: function () { if (fromReveal) after(); else openAnimal(id); } }, { label: 'Take it back', primary: true, fn: function () {
        var ok = takeBackAnimal(id);
        render();
        after();
        toast(ok ? 'Taken back. Scan it again whenever you’re ready.' : 'That catch can’t be taken back now.');
      } }]
    });
  }
  function showUndo(id, text, fromReveal) {
    var p = $('c-undo');
    if (!p) return;
    p.hidden = !canTakeBack(id);
    $('c-undo-btn').textContent = text;
    R.undo = { id: id, reveal: !!fromReveal };
  }

  /* the Animals tab: a button to scan, then a shelf with a row for each place you'd find them */
  function animalCell(t) {
    var e = S.animals.book[t.id], n = e ? e.n : 0, dark = darkWood();
    var label = t.name + ', ' + RU.RARITY[t.r].label + (n ? ', caught ' + n + ' ' + plural(n, 'time') + ', ' + homesFound(e) + ' of 5 homes' : ', not caught yet');
    return '<button type="button" class="jarcell' + (n ? '' : ' locked') + '" data-animal="' + t.id + '" aria-label="' + esc(label) + '">' +
      '<canvas data-animal="' + t.id + '"' + (dark ? ' data-dark="1"' : '') + ' aria-hidden="true"></canvas><span class="plank"></span>' +
      '<span class="jar-name">' + esc(t.name) + (n > 1 ? ' ×' + n : '') + '</span><span class="jar-meta rc-' + t.r + '">' + (n ? medal(n) : '') + esc(RU.RARITY[t.r].label) + '</span></button>';
  }
  function renderAnimalHead(prog) {
    if (!$('an-count') || !AN) return;
    prog = prog || AN.progress(S.animals.book);
    $('an-count').textContent = prog.have + ' of ' + prog.total;
    var note = R.spotterHere ? 'Animals are recognised on your phone, even with no signal. The photo is never kept.' : 'Your first scan downloads the animal spotter: about 88 MB, just once. The photo is never kept or sent anywhere.';
    if ($('scan-note').textContent !== note) $('scan-note').textContent = note;
  }
  function renderAnimals() {
    if (!$('panel-animals') || !AN) return;
    R.animalJars = [];
    var prog = AN.progress(S.animals.book);
    renderAnimalHead(prog);
    $('an-chips').innerHTML = AN.ROWS.map(function (r, i) {
      var row = prog.rows[i];
      return '<button type="button" class="rchip' + (row.complete ? ' done' : '') + '" data-jump="arow-' + r.id + '" aria-label="' + esc(r.name + ' row, ' + row.have + ' of ' + row.need) + '">' +
        secIcon(r.id, 16) + '<span>' + esc(r.name) + '</span><span class="rchip-n">' + row.have + '/' + row.need + '</span></button>';
    }).join('');
    var box = $('an-shelves');
    box.className = 'shelves cabinet wood-' + S.style.wood + ' lights-' + S.style.lights;
    box.innerHTML = AN.ROWS.map(function (r, i) {
      var row = prog.rows[i];
      return '<section class="shelf-sec" id="arow-' + r.id + '"><div class="shelf plain"><span class="sec-wash w-' + r.id + '" aria-hidden="true"></span>' + lightsFor(S.style.lights) +
        '<h2 class="plate-h"><span class="plate plate-static p-' + r.id + '">' + secIcon(r.id, 16) + '<span class="plate-name">' + esc(r.name) + '</span><span class="plate-n">' + row.have + ' of ' + row.need + '</span>' +
        (S.animals.rows[r.id] ? '<span class="row-pill">Complete</span>' : '') + '</span></h2>' +
        AN.rowTypes(r.id).map(animalCell).join('') + '</div></section>';
    }).join('');
    var cvs = box.querySelectorAll('canvas');
    for (var i = 0; i < cvs.length; i++) { R.animalJars.push(cvs[i]); if (jarObserver) jarObserver.observe(cvs[i]); }
    requestAnimationFrame(function () { drawAnimals(2, true); });
    if (SP && R.spotterHere === undefined) SP.stored().then(function (have) { R.spotterHere = have; renderAnimalHead(); });
    seekNote();
    hopNote();
  }
  function drawAnimals(t, all) {
    var look = glassLook();
    (R.animalJars || []).forEach(function (cv) {
      if (!all && jarObserver && !cv.wcSeen) return;
      var st = animalJar(cv.getAttribute('data-animal'));
      if (st.locked && !all) return;
      drawJarOn(cv, st, t, lookFor(cv, look));
    });
  }

  /* an animal's card: its five homes, every one of which can be looked at */
  function setAnimalPill(id) {
    var t = AN.type(id), p = $('c-pill');
    p.className = 'pill rc-' + t.r;
    p.textContent = RU.RARITY[t.r].label + ' · ' + AN.rowName(t.row);
  }
  function setHome(id, h, fresh, locked) {
    var el = $('c-var');
    if (!el) return;
    if (id && h === null) { el.hidden = false; el.innerHTML = '<span class="v-name">Opening the jar…</span>'; return; }
    var hd = id && h ? AN.home(id, h) : null;
    if (!hd) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<span class="v-name' + (hd.fav ? ' legend-text' : '') + '">' + esc(hd.name) + '</span><span class="v-odds">' + esc(hd.odds) + ' · ' + esc(hd.pct) + '</span>' +
      (hd.fav ? '<span class="v-legend">Favourite</span>' : hd.id === 'h1' ? '<span class="v-home">Everyday</span>' : '') +
      (fresh ? '<span class="v-new">New home</span>' : locked ? '<span class="v-lock">' + icon('lock', 13) + 'Not found yet</span>' : '');
  }
  function homeStrip(id, e) {
    var list = AN.homes(id);
    return '<div class="var-h"><span class="h2">Homes</span><span class="var-n">' + homesFound(e) + ' of ' + list.length + ' found</span></div>' +
      '<div class="var-strip" role="group" aria-label="Homes of this animal">' + list.map(function (hd) {
        var x = e && e.homes[hd.id], on = R.cardH === hd.id;
        return '<button type="button" class="vjar' + (on ? ' on' : '') + (x ? '' : ' locked') + (hd.fav ? ' legend' : '') + '" data-home="' + hd.id + '" aria-pressed="' + on + '"' +
          ' aria-label="' + esc(hd.name + (hd.fav ? ', its favourite' : '') + (x ? ', found ' + x.n + ' ' + plural(x.n, 'time') : ', not found yet, ' + hd.odds)) + '">' +
          '<canvas data-animal="' + id + '" data-home="' + hd.id + '" aria-hidden="true"></canvas><span class="vjar-n">' + (x ? '×' + x.n : esc(hd.odds)) + '</span></button>';
      }).join('') + '</div>' +
      '<p class="small var-note">The first catch moves into its everyday home. After that, each catch turns up in one of its five homes, up to its favourite: <span class="legend-text">' + esc(list[4].name) + '</span>, 1 in 24.</p>';
  }
  function renderHomes(id) {
    var box = $('c-vars');
    if (!box) return;
    setJarNav(!!id);
    if (!id) { box.hidden = true; box.innerHTML = ''; return; }
    var e = S.animals.book[id];
    box.hidden = false;
    box.innerHTML = homeStrip(id, e);
    R.previewJars = Array.prototype.slice.call(box.querySelectorAll('canvas[data-animal]'));
  }
  function markHomes(h) {
    Array.prototype.forEach.call($('c-vars').querySelectorAll('button[data-home]'), function (b) {
      var on = b.getAttribute('data-home') === h;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function showHome(id, h) {
    var e = S.animals.book[id];
    R.cardH = h;
    R.cardState = animalView(id, h);
    setHome(id, h, false, !(e && e.homes[h]));
    updateScorch();
  }
  function pickHome(h) {
    if (R.cardKind !== 'animal' || R.view !== 'card' || AN.HOME_SLOTS.indexOf(h) === -1) return;
    showHome(R.cardId, h);
    markHomes(h);
  }
  function stepHome(dir) {
    var i = AN.HOME_SLOTS.indexOf(R.cardH);
    var next = AN.HOME_SLOTS[(i + dir + AN.HOME_SLOTS.length) % AN.HOME_SLOTS.length];
    var cv = $('c-canvas');
    var swap = function () { pickHome(next); centerStrip(true); };
    if (reduce) { swap(); return; }
    cv.classList.remove('drag');
    cv.style.transform = 'translateX(' + (-dir * 34) + '%)';
    cv.style.opacity = '0';
    setTimeout(function () {
      swap();
      cv.classList.add('drag');
      cv.style.transform = 'translateX(' + (dir * 34) + '%)';
      void cv.offsetWidth;
      cv.classList.remove('drag');
      cv.style.transform = '';
      cv.style.opacity = '';
    }, 150);
  }
  function animalStats(id, e) {
    if (!e || !e.n) return 'Scan a real ' + AN.type(id).name.toLowerCase() + ' to catch it.';
    var cool = animalCool(id);
    var hb = S.hop && S.hop.best[id];
    return '×' + e.n + ' · ' + homesFound(e) + ' of 5 homes' + (hb && hb.s ? ' · Weather Hop best ' + hb.s : '') + (cool ? ' · next catch in ' + minutes(cool) : '');
  }
  function openAnimal(id) {
    var t = AN.type(id), e = S.animals.book[id], n = e ? e.n : 0;
    if (!t) return;
    showView('card');
    R.cardKind = 'animal';
    R.cardId = id;
    $('c-label').textContent = n ? 'On your animal shelf' : 'Not caught yet';
    $('c-label').className = 'ov-label rc-' + t.r;
    $('c-title').textContent = t.name;
    setAnimalPill(id);
    $('c-points').textContent = AN.points(id) + ' points a catch, or a fifth for another the same day';
    $('c-line').textContent = t.line;
    $('c-stats').textContent = animalStats(id, e);
    setVerify(n && e.first.t ? 'First caught ' + new Date(e.first.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' at ' + hm(e.first.t) : '');
    setTier(n);
    setPhotoLine(null);
    setStrength(null);
    showHome(id, n ? bestHome(e) : 'h1');
    renderHomes(id);
    R.share = null;
    showUndo(id, 'Was the last ' + t.name.toLowerCase() + ' the wrong animal? Take it back');
    setActions('c-actions', [{ label: 'Scan an animal', fn: function () { openScan(); } }, { label: 'Close', primary: true, fn: closeSheet }]);
    openSheet();
    centerStrip();
  }
  /* a new catch, opened: the reel spins through its homes at their real odds and lands on this one */
  function revealAnimal(r) {
    var id = r.animal, t = AN.type(id), e = S.animals.book[id];
    showView('card');
    R.cardKind = 'animal';
    R.cardId = id;
    $('c-label').textContent = r.isNew ? 'New animal' : 'Caught again';
    $('c-label').className = 'ov-label rc-' + t.r;
    $('c-title').textContent = t.name;
    setAnimalPill(id);
    var pts = '+' + r.pts + ' points' + (r.again ? ' · a fifth, as it’s not your first today' : '');
    if (r.rowDone) pts += ' · +' + AN.ROW_BONUS + ' for filling the ' + AN.rowName(r.rowDone) + ' row!';
    if (r.lvUp) pts += ' · Level ' + r.lvUp + '! ' + unlockText(r.lvUp);
    $('c-points').textContent = pts;
    $('c-line').textContent = r.isNew ? 'It’s moved into its everyday home, the ' + AN.home(id, 'h1').name + '. Catch it again to find its other homes.' : t.line;
    $('c-stats').textContent = r.isNew ? 'First one on your animal shelf.' : '×' + r.n + ' · ' + homesFound(e) + ' of 5 homes';
    setTier(e.n, r.tier);
    setPhotoLine(null);
    setVerify('');
    setStrength(null);
    R.cardH = r.h;
    R.cardState = animalView(id, r.h);
    R.cardState.mark.seed = r.seed;
    R.cardState.preview = false;
    renderHomes(null);
    showUndo(id, 'Not ' + aName(t) + '? Take it back', true);
    setActions('c-actions', [{ label: R.queue.length ? 'Next' : 'Put it on the shelf', primary: true, fn: nextReveal }]);
    openSheet();
    var land = function () {
      setHome(id, r.h, r.newH);
      updateScorch();
      var hk = AN.homeRank ? AN.homeRank(r.h) : 0, tier = hk >= 4 ? 3 : hk >= 3 ? 2 : hk >= 2 ? 1 : 0;
      if (r.isNew) tier = Math.max(tier, t.r === 'epic' ? 2 : t.r === 'rare' ? 1 : 0);
      landFx(tier, t.row, r.isNew || r.newH);
      if (r.h === 'h5') {
        // its favourite home: a long buzz and a lot of confetti
        confetti(70);
        try { if (navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 80]); } catch (err) {}
      } else if (r.isNew || r.rowDone) confetti(24);
      else if (r.newH) { try { if (navigator.vibrate) navigator.vibrate(30); } catch (err) {} }
    };
    if (!r.isNew && spinOn()) {
      spinReveal(r, land, {
        roll: function () { return AN.rollHome(rand32() / 4294967296); },
        won: r.h,
        pic: function (h, pw, ph) { return animalPicture(id, h, r.seed, pw, ph); },
        tile: function (h) { var hd = AN.home(id, h); return { cls: ['classic', 'uncommon', 'rare', 'epic', 'legend'][hd.rank], odds: hd.odds }; },
        slow: r.h === 'h5',
        during: function () { setHome(id, null); }
      });
    } else land();
    if (r.lvUp) { sfx('level'); toast('Level ' + r.lvUp + '! ' + unlockText(r.lvUp)); }
  }

  /* ---------- scanning an animal ----------
     The camera shows what's in front of you; Scan grabs a frame or three from it, which the spotter looks at on the
     phone and throws away. A real animal in the collection goes in its jar, at most once every 30 minutes each */
  var SCAN_TIPS = {
    person: 'That looks like a person. Point the camera at an animal.',
    screen: 'That looks like a screen. Animals have to be scanned for real, not on a phone or a TV.',
    picture: 'That looks like a picture. Scan the real animal.',
    toy: 'That looks like a toy or an ornament. Scan a real animal.',
    nothing: 'No animal there. Get it in the square and try again.',
    unsure: 'Not sure what that is. Get the whole animal in the square, close up and in good light.',
    other: 'That animal isn’t in the collection yet.'
  };
  function scanMsg(text) { $('s-msg').textContent = text || ''; }
  function setDl(done, total) {
    var f = total ? done / total : 0;
    $('s-dl-fill').style.width = Math.round(f * 100) + '%';
    $('s-dl-t').textContent = total ? Math.round(done / 1e6) + ' of ' + Math.round(total / 1e6) + ' MB' : 'Starting…';
  }
  function openScan() {
    if (!SP || !AN) { toast('Scanning animals doesn’t work on this phone yet.'); return; }
    showView('scan');
    $('s-title').textContent = 'Getting ready…';
    $('s-stage').hidden = true;
    $('s-dl').hidden = true;
    $('s-busy').hidden = true;
    scanMsg('');
    setActions('s-actions', [{ label: 'Close', fn: closeSheet }]);
    openSheet();
    if (R.forceScan || SP.ready()) { startCamera(); return; }
    SP.stored().then(function (have) {
      R.spotterHere = have;
      if (R.view !== 'scan') return;
      if (have) startCamera(); else offerDownload();
    });
  }
  function offerDownload() {
    $('s-title').textContent = 'The animal spotter';
    scanMsg('To recognise animals, Weather Catch keeps an animal spotter on your phone. It’s a one-time download of about 88 MB, so Wi-Fi is best. After that it works with no signal, and photos never leave your phone.');
    setActions('s-actions', [{ label: 'Not now', fn: closeSheet }, { label: 'Download', primary: true, fn: downloadSpotter }]);
  }
  function downloadSpotter() {
    $('s-title').textContent = 'Downloading the spotter';
    $('s-dl').hidden = false;
    setDl(0, 0);
    scanMsg('It carries on if you close this, as long as the app stays open.');
    setActions('s-actions', [{ label: 'Close', fn: closeSheet }]);
    SP.load(function (d, t) { if (R.view === 'scan') setDl(d, t); }).then(function () {
      R.spotterHere = true;
      renderAnimalHead();
      if (R.view !== 'scan') { toast('The animal spotter is ready. Tap Scan an animal.'); return; }
      $('s-dl').hidden = true;
      startCamera();
    }, function () {
      if (R.view !== 'scan') return;
      $('s-title').textContent = 'The download stopped';
      scanMsg('Check your connection and try again. What’s downloaded so far is kept.');
      setActions('s-actions', [{ label: 'Close', fn: closeSheet }, { label: 'Try again', primary: true, fn: downloadSpotter }]);
    });
  }
  function startCamera() {
    $('s-title').textContent = 'Point at the animal';
    $('s-stage').hidden = false;
    scanMsg('Starting the camera…');
    setActions('s-actions', [{ label: 'Close', fn: closeSheet }]);
    // the spotter gets ready meanwhile, from the phone
    if (!R.forceScan && !SP.ready()) SP.load().catch(function () {});
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camProblem('This browser can’t use the camera.'); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: false }).then(function (stream) {
      if (R.view !== 'scan') { stream.getTracks().forEach(function (tr) { tr.stop(); }); return; }
      stopCamera();
      R.cam = stream;
      var v = $('s-video');
      v.srcObject = stream;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
      // zoom: the camera's own where the phone allows it, otherwise the middle of the picture made bigger
      var tr = stream.getVideoTracks()[0], caps = tr && tr.getCapabilities ? tr.getCapabilities() : {};
      R.camHw = caps && caps.zoom && caps.zoom.max > 1 ? caps.zoom : null;
      setZoom(1);
      $('s-zoom').hidden = false;
      readyToScan();
    }, function (err) {
      if (R.view !== 'scan') return;
      var blocked = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      camProblem(blocked ? 'Weather Catch needs the camera to scan animals. Allow camera access for this site in your browser’s settings, then try again.' : 'The camera didn’t start. Close anything else using it and try again.');
    });
  }
  function camProblem(text) {
    $('s-title').textContent = 'No camera';
    $('s-stage').hidden = true;
    scanMsg(text);
    setActions('s-actions', [{ label: 'Close', fn: closeSheet }, { label: 'Try again', primary: true, fn: startCamera }]);
  }
  /* zoom from 1 to 4 times: the camera's zoom as far as it goes, then the rest by taking a smaller middle square */
  var ZOOM_MAX = 4, zoomT = 0;
  function setZoom(z) {
    z = Math.max(1, Math.min(ZOOM_MAX, z));
    R.zoom = z;
    var hw = R.camHw, hz = 1;
    if (hw) {
      hz = Math.max(hw.min || 1, Math.min(hw.max, z));
      if (hw.step) hz = Math.round(hz / hw.step) * hw.step;
      var track = R.cam && R.cam.getVideoTracks()[0];
      clearTimeout(zoomT);
      zoomT = setTimeout(function () { if (track && track.readyState === 'live') track.applyConstraints({ advanced: [{ zoom: hz }] }).catch(function () { R.camHw = null; setZoom(R.zoom); }); }, 60);
    }
    R.zoomDigital = Math.max(1, z / hz);
    var v = $('s-video');
    if (v) v.style.transform = R.zoomDigital > 1.001 ? 'scale(' + R.zoomDigital.toFixed(3) + ')' : '';
    var btns = document.querySelectorAll('#s-zoom button');
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', Math.abs(+btns[i].getAttribute('data-z') - z) < 0.25);
    $('s-zoom-v').textContent = (Math.round(z * 10) / 10) + '×';
  }
  /* pinching the camera picture zooms too */
  function zoomPinch() {
    var st = $('s-stage'), pts = {}, start = null;
    var dist = function () { var k = Object.keys(pts); if (k.length < 2) return 0; var a = pts[k[0]], b = pts[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y); };
    st.addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('#s-zoom')) return; pts[e.pointerId] = { x: e.clientX, y: e.clientY }; if (Object.keys(pts).length === 2) start = { d: dist(), z: R.zoom || 1 }; });
    st.addEventListener('pointermove', function (e) { if (!pts[e.pointerId]) return; pts[e.pointerId] = { x: e.clientX, y: e.clientY }; if (start && start.d > 10) { setZoom(start.z * dist() / start.d); e.preventDefault(); } });
    var up = function (e) { delete pts[e.pointerId]; if (Object.keys(pts).length < 2) start = null; };
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    document.querySelectorAll('#s-zoom button').forEach(function (b) { b.addEventListener('click', function () { setZoom(+b.getAttribute('data-z')); }); });
  }
  function readyToScan(text) {
    scanMsg(text || 'Get the whole animal in the square, then tap Scan. For small ones like bees, zoom in.');
    setActions('s-actions', [{ label: 'Close', fn: closeSheet }, { label: 'Scan', primary: true, id: 's-go', fn: doScan }]);
  }
  function stopCamera() {
    if (R.cam) { R.cam.getTracks().forEach(function (tr) { try { tr.stop(); } catch (e) {} }); R.cam = null; }
    R.camHw = null;
    if ($('s-zoom')) $('s-zoom').hidden = true;
    var v = $('s-video');
    if (v && v.srcObject) { try { v.pause(); } catch (e) {} v.srcObject = null; }
    R.scanning = false;
  }
  function wait(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
  function doScan() {
    if (R.scanning) return;
    var v = $('s-video');
    if (!R.forceScan && (!R.cam || !v || !v.videoWidth)) { scanMsg('The camera isn’t ready yet. Give it a moment.'); return; }
    R.scanning = true;
    sfx('shutter');
    $('s-busy').hidden = false;
    if ($('s-go')) $('s-go').disabled = true;
    scanMsg('Looking…');
    var slow = setTimeout(function () { if (R.scanning && R.view === 'scan') scanMsg('Looking… this takes a few seconds on this phone.'); }, 2500);
    var job;
    if (R.forceScan) job = wait(300).then(function () { return R.forceScan; });
    else job = SP.load().then(function () {
      // a quick burst of three frames where the phone is quick enough, one where it isn't: they're averaged
      var embs = [];
      var grab = function () { return SP.embed(SP.pixels(v, v.videoWidth, v.videoHeight, R.zoomDigital || 1)).then(function (em) { embs.push(em); }); };
      return grab().then(function () {
        if (SP.backend() !== 'gpu') return null;
        return wait(120).then(grab).then(function () { return wait(120); }).then(grab);
      }).then(function () { return SP.classify(embs); });
    });
    job.then(function (res) { clearTimeout(slow); scanDone(res); }, function () {
      clearTimeout(slow);
      R.scanning = false;
      if (R.view !== 'scan') return;
      $('s-busy').hidden = true;
      readyToScan('Something went wrong looking at that. Try again.');
    });
  }
  function scanDone(res) {
    R.scanning = false;
    if (R.view !== 'scan') return;
    $('s-busy').hidden = true;
    if (res && res.kind === 'catch' && AN.type(res.id)) {
      var t = AN.type(res.id), cool = animalCool(res.id);
      if (cool) {
        readyToScan('That’s ' + aName(t) + '! You caught one ' + minutes(now() - S.animals.book[res.id].last) + ' ago. Each animal can be caught once every 30 minutes, so try again in ' + minutes(cool) + '.');
        return;
      }
      var emb = res.emb ? (res.emb instanceof Float32Array ? res.emb : new Float32Array(res.emb)) : null;
      if (isPet(res.id) && emb && petLikeness(res.id, emb) >= PET_SAME) {
        readyToScan('That looks like the same ' + t.name.toLowerCase() + ' you’ve already caught. Each pet only counts once, so find a different ' + t.name.toLowerCase() + ' to level up your ' + t.name + ' jar.');
        return;
      }
      var before = RU.levelFor(S.points);
      var r = awardAnimal(res.id);
      if (isPet(res.id) && emb) { addPrint(res.id, emb); S.animals.book[res.id].undo.print = true; }
      stopCamera();
      afterAward([r], before);
      return;
    }
    sfx('miss');
    readyToScan(SCAN_TIPS[res && res.kind] || SCAN_TIPS.unsure);
  }

  /* ---------- Hide & seek ----------
     Levels: a picture each, with an animal hiding in it; tap it to find it. Every level was measured for how hard its
     animal is to find (seek-levels.js has how), so its label means what it says: Easy, Medium, Hard or Very challenging.
     Every 10th level is a boss: find it within the time, with no hints and at most BOSS_LIVES wrong taps, or go back to
     the first level after the last boss and make it back. Each level has a few hiding spots and takes the next one each
     time it's played, so a level played again has the animal somewhere new. The first SEEK_DAY finds each day earn
     points, more for harder levels */
  var SEEK_DAY = 10, SEEK_PTS = [3, 5, 7, 10], BOSS_PTS = 25, BOSS_LIVES = 3;
  var SEEK_WORDS = ['Easy', 'Medium', 'Hard', 'Very challenging'];
  function seekToday() { if (S.seek.d !== today()) { S.seek.d = today(); S.seek.n = 0; } return S.seek; }
  function seekLeft() { return Math.max(0, SEEK_DAY - seekToday().n); }
  function isBoss(lv) { return lv % 10 === 0; }
  function blockStart(lv) { return Math.floor((lv - 1) / 10) * 10 + 1; }
  function nextBoss(lv) { return Math.ceil(lv / 10) * 10; }
  function seekNote() {
    var el = $('seek-note');
    if (!el) return;
    var lv = S.seek.lv;
    if (!LV.length) el.textContent = 'Find the animal hiding in a busy picture.';
    else if (lv > LV.length) el.textContent = 'All ' + LV.length + ' levels beaten! More are on the way. Until then, play bonus pictures.';
    else if (isBoss(lv)) el.textContent = 'Boss level ' + lv + ' · ' + SEEK_WORDS[LV[lv - 1][3]] + '. Find it in time to move on.';
    else el.textContent = 'Level ' + lv + ' · ' + SEEK_WORDS[LV[lv - 1][3]] + '. Boss at level ' + Math.min(nextBoss(lv), LV.length) + '.';
  }
  function clock(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + pad(s % 60); }
  function secs1(ms) { return (Math.round(ms / 100) / 10).toFixed(1) + ' seconds'; }
  function timeWords(ms) { var s = Math.round(ms / 1000), m = Math.floor(s / 60); s %= 60; return (m ? m + ' ' + plural(m, 'minute') : '') + (m && s ? ' ' : '') + (s ? s + ' ' + plural(s, 'second') : ''); }
  function openSeek() {
    if (!SK) return;
    showView('seek');
    openSheet();
    if (S.seek.left) {
      // a boss level left half-way last time (the app was closed, say) counted as a loss
      toast('Boss level ' + S.seek.left + ' was left before the end, so it counted as a loss. Back to level ' + blockStart(S.seek.left) + '.');
      S.seek.left = 0;
      save();
    }
    seekRound();
  }
  /* the next level, or after the last one a bonus picture: any level, played for fun */
  function seekRound() {
    stopSeek();
    var bonus = S.seek.lv > LV.length, lv = bonus ? 1 + Math.floor(Math.random() * LV.length) : S.seek.lv, def = LV[lv - 1];
    ['k-canvas', 'k-fx'].forEach(function (id) { var c = $(id); c.getContext('2d').clearRect(0, 0, c.width, c.height); });
    if (!def) {
      $('k-msg').textContent = 'The levels didn’t load. Close this and try again in a moment.';
      setActions('k-actions', [{ label: 'Close', primary: true, fn: closeSheet }]);
      return;
    }
    var spots = def[4], plays = S.seek.plays[lv] || 0, s = spots[plays % spots.length];
    S.seek.plays[lv] = plays + 1;
    save();
    var boss = !bonus && isBoss(lv), t = AN.type(def[0]);
    R.seek = { lv: lv, bonus: bonus, boss: boss, diff: def[3], limit: boss ? (def[5] || 90) * 1000 : 0, lives: BOSS_LIVES,
      ph: SK.photo(def[0], def[1], def[2]), sp: { id: def[0], x: s[0], y: s[1], d: s[2], dir: s[3], rot: s[4] },
      start: 0, live: false, over: false, found: false, hint: null, misses: [], timer: null, fx: null };
    $('k-title').textContent = 'Find the ' + t.name;
    $('k-where').innerHTML = esc(bonus ? 'Bonus picture' : boss ? 'Boss · level ' + lv : 'Level ' + lv) + ' <span class="kd d' + def[3] + '">' + SEEK_WORDS[def[3]] + '</span>';
    var who = $('k-who'), wctx = who.getContext('2d');
    wctx.clearRect(0, 0, who.width, who.height);
    SK.portrait(wctx, who.width, who.height, t.id);
    $('k-stage').setAttribute('aria-label', 'A busy picture: ' + SK.sceneName(def[1]) + '. Somewhere in it is ' + aName(t) + '. Tap it when you find it.');
    $('k-msg').textContent = '';
    $('k-time').classList.remove('low');
    seekPath();
    seekLives();
    if (boss) seekBossIntro();
    else seekGo();
  }
  /* a boss level waits behind a cover until Start, so the clock is fair */
  function seekBossIntro() {
    var K1 = R.seek, t = AN.type(K1.ph.id);
    $('k-cover').hidden = false;
    $('k-cover-t').textContent = 'Boss level ' + K1.lv;
    sfx('boss');
    $('k-time').textContent = clock(K1.limit);
    $('k-msg').textContent = 'Find the ' + t.name.toLowerCase() + ' within ' + timeWords(K1.limit) + '. No hints, and ' + BOSS_LIVES + ' wrong taps ends it. If it gets away, you go back to level ' + blockStart(K1.lv) + '.';
    setActions('k-actions', [{ label: 'Not now', fn: closeSheet }, { label: 'Start', primary: true, fn: seekGo }]);
  }
  function seekGo() {
    var K1 = R.seek;
    if (!K1 || K1.live || K1.over) return;
    K1.start = now(); K1.live = true;
    if (K1.boss) { S.seek.bossOn = K1.lv; save(); sfx('go'); }
    $('k-cover').hidden = true;
    $('k-msg').textContent = '';
    seekPaint();
    seekActions();
    K1.timer = setInterval(seekTick, 250);
    seekTick();
  }
  /* the ten levels up to the next boss: done, this one, still to come */
  function seekPath() {
    var el = $('k-path'), K1 = R.seek;
    if (!el) return;
    if (!K1 || K1.bonus) { el.hidden = true; return; }
    var b0 = blockStart(K1.lv), html = '';
    for (var n = b0; n < b0 + 10 && n <= LV.length; n++) {
      var cls = 'kp' + (n < K1.lv ? ' done' : n === K1.lv ? ' now' : '') + (isBoss(n) ? ' boss' : '');
      html += '<span class="' + cls + '">' + (isBoss(n) ? icon('crown', 14) : '') + '</span>';
    }
    el.innerHTML = html;
    el.hidden = false;
    el.setAttribute('aria-label', 'Level ' + K1.lv + '. The boss is level ' + Math.min(nextBoss(K1.lv), LV.length) + '.');
  }
  function seekLives() {
    var el = $('k-lives'), K1 = R.seek;
    if (!el) return;
    if (!K1 || !K1.boss) { el.hidden = true; return; }
    var html = '';
    for (var i = 0; i < BOSS_LIVES; i++) html += '<span class="kl' + (i < K1.lives ? '' : ' gone') + '">' + icon('heart', 15) + '</span>';
    el.innerHTML = html;
    el.hidden = false;
    el.setAttribute('aria-label', K1.lives + ' wrong ' + plural(K1.lives, 'tap') + ' left');
  }
  /* the picture, drawn once at the phone's sharpness, and the animal on its own in a hidden canvas for taps */
  function seekPaint() {
    var K1 = R.seek;
    if (!K1 || !K1.ph) return;
    var st = $('k-stage'), w = st.clientWidth || 320, dpr = Math.min(2.5, window.devicePixelRatio || 1);
    var W = Math.round(w * dpr), H = Math.round(w * SK.HU / 100 * dpr);
    // resize only when needed, and always wipe: some browsers keep the old picture when a canvas is set to its own size
    [$('k-canvas'), $('k-fx')].forEach(function (c) { if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } var x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); });
    SK.draw($('k-canvas').getContext('2d'), W, K1.ph, K1.sp);
    var mw = Math.max(1, Math.round(w)), mh = Math.max(1, Math.round(w * SK.HU / 100));
    var mk = document.createElement('canvas');
    mk.width = mw; mk.height = mh;
    var mctx = mk.getContext('2d');
    SK.drawMask(mctx, mw, K1.sp);
    K1.mdata = mctx.getImageData(0, 0, mw, mh).data; K1.mw = mw; K1.mh = mh;
    seekFx();
  }
  /* the clock: counting up, or on a boss level counting down */
  function seekTick() {
    var K1 = R.seek;
    if (!K1 || !K1.start) return;
    var el = K1.over ? K1.ms : now() - K1.start;
    if (!K1.boss) { $('k-time').textContent = clock(el); return; }
    var left = Math.max(0, K1.limit - el), secLeft = Math.ceil(left / 1000);
    if (K1.live && left < 10000 && secLeft > 0 && secLeft !== K1.lastSec) { K1.lastSec = secLeft; sfx('tick'); }
    $('k-time').textContent = clock(secLeft * 1000);
    $('k-time').classList.toggle('low', K1.live && left < 10000);
    if (K1.live && left <= 0) bossLost(K1.lv, 'time');
  }
  function seekActions() {
    var K1 = R.seek;
    if (!K1) return;
    if (K1.over) {
      var next = K1.lost ? { label: 'Level ' + S.seek.lv, primary: true, fn: seekRound } : K1.shown ? { label: 'Try again', primary: true, fn: seekRound } :
        { label: K1.bonus || S.seek.lv > LV.length ? 'Bonus picture' : isBoss(S.seek.lv) ? 'Boss level' : 'Next level', primary: true, fn: seekRound };
      setActions('k-actions', [{ label: 'Done', fn: seekDone }, next]);
    } else if (K1.boss) setActions('k-actions', []);
    else setActions('k-actions', [{ label: K1.hint ? 'Show me' : 'Hint', fn: K1.hint ? seekShow : seekHint }]);
  }
  function seekTap(ev) {
    var K1 = R.seek;
    if (!K1 || !K1.mdata || !K1.live || K1.over) return;
    var rc = $('k-stage').getBoundingClientRect();
    if (!rc.width) return;
    var x = (ev.clientX - rc.left) / rc.width * K1.mw, y = (ev.clientY - rc.top) / rc.height * K1.mh;
    // a finger's width round the tap counts
    var hit = false, rad = Math.max(10, K1.mw * 0.035);
    for (var a = 0; a < 16 && !hit; a++) for (var d = 0; d <= rad && !hit; d += rad / 2) {
      var px = Math.round(x + Math.cos(a * Math.PI / 8) * d), py = Math.round(y + Math.sin(a * Math.PI / 8) * d);
      if (px >= 0 && py >= 0 && px < K1.mw && py < K1.mh && K1.mdata[(py * K1.mw + px) * 4 + 3] > 60) hit = true;
    }
    if (hit) { seekFound(); return; }
    K1.misses.push({ x: x / K1.mw, y: y / K1.mh, t: performance.now() });
    sfx('miss');
    try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
    if (K1.boss) {
      K1.lives -= 1;
      seekLives();
      if (K1.lives <= 0) { bossLost(K1.lv, 'taps'); return; }
      $('k-msg').textContent = K1.lives === 1 ? 'Careful: one more wrong tap and it gets away.' : K1.lives + ' wrong taps left.';
    }
    seekFx();
  }
  function seekHint() {
    var K1 = R.seek;
    if (!K1 || !K1.live || K1.boss) return;
    var c = SK.centre(K1.sp), r = Math.max(15, c.r * 2.4), a = Math.random() * Math.PI * 2, off = Math.random() * r * 0.45;
    K1.hint = { x: c.x + Math.cos(a) * off, y: c.y + Math.sin(a) * off, r: r };
    $('k-msg').textContent = 'It’s somewhere in the circle. A hint halves the points.';
    sfx('hint');
    seekActions();
    seekFx();
  }
  function seekStop(K1) { K1.over = true; K1.live = false; K1.ms = now() - K1.start; K1.foundAt = performance.now(); clearInterval(K1.timer); K1.timer = null; seekTick(); }
  function seekFound() {
    var K1 = R.seek;
    if (!K1 || K1.over) return;
    seekStop(K1);
    K1.found = true;
    var t = AN.type(K1.ph.id), day = seekToday(), pts = 0, extra = 0, before = RU.levelFor(S.points), best = S.seek.best[t.id], quickest = false;
    S.seek.total += 1;
    if (!best || K1.ms < best) { S.seek.best[t.id] = K1.ms; quickest = !!best; }
    if (!K1.bonus && (!S.seek.t[K1.lv] || K1.ms < S.seek.t[K1.lv])) S.seek.t[K1.lv] = K1.ms;
    if (day.n < SEEK_DAY) { pts = SEEK_PTS[K1.diff] || 3; if (K1.hint) pts = Math.max(1, Math.round(pts / 2)); day.n += 1; S.points += pts; }
    if (K1.boss) {
      S.seek.bossOn = 0;
      if (!S.seek.boss[K1.lv]) { S.seek.boss[K1.lv] = now(); extra = BOSS_PTS; S.points += extra; addLog('Beat Hide & seek boss level ' + K1.lv + ' (+' + extra + ')'); }
    }
    if (!K1.bonus) { S.seek.lv = K1.lv + 1; S.seek.top = Math.max(S.seek.top, S.seek.lv); }
    save();
    var left = seekLeft(), all = pts + extra, msg = K1.boss ? 'You beat the boss in ' + secs1(K1.ms) + '!' : 'Found it in ' + secs1(K1.ms) + '!' + (quickest ? ' Your quickest ' + t.name.toLowerCase() + ' yet.' : '');
    if (all) msg += ' +' + all + ' ' + plural(all, 'point') + (K1.hint ? ' (half, for the hint)' : '') + '.';
    if (pts) msg += ' ' + (left ? left + ' more ' + plural(left, 'find') + ' earn points today.' : 'That’s today’s points all found.');
    else if (!extra) msg += ' Today’s points are all found, so this one’s for fun.';
    if (!K1.bonus && S.seek.lv > LV.length) msg += ' That’s all ' + LV.length + ' levels beaten! More are on the way.';
    else if (!K1.bonus && isBoss(S.seek.lv)) msg += ' Next up: the boss!';
    $('k-msg').textContent = msg;
    var after = RU.levelFor(S.points);
    if (after > before) { addLog('Level ' + after + '!'); sfx('level'); toast('Level ' + after + '! ' + unlockText(after)); }
    seekPath();
    seekActions();
    seekFx();
    confetti(K1.boss ? 50 : 12);
    sfx(K1.boss ? 'win' : 'find');
    try { if (navigator.vibrate) navigator.vibrate(K1.boss ? [40, 50, 40, 50, 90] : [30, 40, 30]); } catch (e) {}
    render();
  }
  /* Show me, on an ordinary level: the animal lit up, and the level to try again with it hiding somewhere new */
  function seekShow() {
    var K1 = R.seek;
    if (!K1 || K1.over || K1.boss) return;
    seekStop(K1);
    K1.shown = true;
    sfx('hint');
    $('k-msg').textContent = 'There it is! Try again and it’ll hide somewhere new.';
    seekActions();
    seekFx();
    try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) {}
  }
  /* a boss level lost: out of time, out of taps, or left half-way. Back to the first level after the last boss */
  function bossLost(lv, why) {
    var back = blockStart(lv), K1 = R.seek;
    S.seek.bossOn = 0;
    S.seek.lv = back;
    save();
    if (!K1 || K1.lv !== lv || K1.over) { seekNote(); render(); return; }
    seekStop(K1);
    K1.lost = true;
    sfx('lose');
    var t = AN.type(K1.ph.id);
    $('k-msg').textContent = (why === 'time' ? 'Time’s up!' : BOSS_LIVES + ' wrong taps!') + ' The ' + t.name.toLowerCase() + ' got away, so it’s back to level ' + back + '. Make it back here to try the boss again.';
    seekPath();
    seekActions();
    seekFx();
    try { if (navigator.vibrate) navigator.vibrate([60, 40, 60]); } catch (e) {}
    render();
  }
  /* the X during a boss level: leaving counts as a loss, so check first */
  function seekLeaveAsk() {
    var K1 = R.seek;
    $('k-msg').textContent = 'Leave the boss level? It counts as a loss, and you’ll go back to level ' + blockStart(K1.lv) + '.';
    setActions('k-actions', [{ label: 'Leave', fn: closeSheet }, { label: 'Keep looking', primary: true, fn: function () { if (R.seek === K1 && !K1.over) { $('k-msg').textContent = ''; seekActions(); } } }]);
  }
  function seekBusy() { var K1 = R.seek; return !!(K1 && K1.boss && K1.live && !K1.over && R.view === 'seek'); }
  /* rewards earned by levelling up here are shown when you're done */
  function seekDone() {
    var cards = claimRewards();
    if (cards.length) { save(); openReveal(cards); } else closeSheet();
  }
  /* on top of the picture: the hint's circle, a cross where a tap missed, and the animal lit up once it's found (or shown) */
  function seekFx() {
    var K1 = R.seek, fx = $('k-fx');
    if (!K1 || !fx || !K1.ph) return;
    if (K1.fx) { cancelAnimationFrame(K1.fx); K1.fx = null; }
    var ctx = fx.getContext('2d'), W = fx.width, H = fx.height, k = W / 100, tn = performance.now(), more = false, TWO = Math.PI * 2;
    ctx.clearRect(0, 0, W, H);
    var hole = function (x, y, r, a) {
      ctx.fillStyle = 'rgba(10,14,30,' + a + ')';
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TWO, true); ctx.fill('evenodd');
    };
    if (K1.over) {
      var c = SK.centre(K1.sp), p = Math.min(1, (tn - K1.foundAt) / 450), r = Math.max(9, c.r * 1.45) * k, g = 1 + 0.14 * p;
      hole(c.x * k, c.y * k, r, 0.5 * p);
      ctx.save(); ctx.translate(c.x * k, c.y * k); ctx.scale(g, g); ctx.translate(-c.x * k, -c.y * k); SK.drawHidden(ctx, K1.sp, k); ctx.restore();
      ctx.strokeStyle = K1.found ? '#FFD24A' : '#FFFFFF'; ctx.lineWidth = Math.max(2, 0.8 * k); ctx.beginPath(); ctx.arc(c.x * k, c.y * k, r, 0, TWO); ctx.stroke();
      if (p < 1) more = true;
    } else if (K1.hint) {
      var h = K1.hint;
      hole(h.x * k, h.y * k, h.r * k, 0.38);
      ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = Math.max(2, 0.6 * k); ctx.setLineDash([2 * k, 1.6 * k]);
      ctx.beginPath(); ctx.arc(h.x * k, h.y * k, h.r * k, 0, TWO); ctx.stroke(); ctx.setLineDash([]);
    }
    K1.misses = K1.misses.filter(function (m) { return tn - m.t < 700; });
    K1.misses.forEach(function (m) {
      var a = 1 - (tn - m.t) / 700, x = m.x * W, y = m.y * H, s = 2.2 * k;
      ctx.strokeStyle = 'rgba(214,40,50,' + a + ')'; ctx.lineWidth = Math.max(2, 0.7 * k); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.stroke();
      more = true;
    });
    if (more) K1.fx = requestAnimationFrame(seekFx);
  }
  /* leaving a boss level that's under way counts as a loss */
  function stopSeek() {
    var K1 = R.seek;
    if (!K1) return;
    if (K1.timer) clearInterval(K1.timer);
    if (K1.fx) cancelAnimationFrame(K1.fx);
    R.seek = null;
    if ($('k-cover')) $('k-cover').hidden = true;
    if (K1.boss && K1.live && !K1.over) {
      bossLost(K1.lv, 'left');
      toast('You left boss level ' + K1.lv + ', so it counts as a loss. Back to level ' + blockStart(K1.lv) + '.');
    }
    seekNote();
  }

  /* sound effects: on unless switched off in More */
  function renderSound() {
    var b = $('sound-btn');
    if (!b) return;
    var on = S.sound !== false;
    b.textContent = on ? 'Turn sounds off' : 'Turn sounds on';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    $('sound-text').textContent = on ? 'Sounds are on: chimes when you catch, clinks as jars land, and game sounds. They follow your phone’s silent switch where it allows.' : 'Sounds are off.';
  }
  function toggleSound() {
    S.sound = S.sound === false;
    save();
    if (WC.sfx) { WC.sfx.setOn(S.sound); if (S.sound) { WC.sfx.unlock(); sfx('clink'); } }
    renderSound();
  }

  /* ---------- Weather Hop ----------
     A road-crossing game (hop.js) played as one of your caught animals. Each animal keeps its own records: its best
     score, the furthest day and stage it reached and how many runs; and every day it finishes is a checkpoint it can start
     a later run from */
  var HOP_WORDS = { water: 'Splash! Into the river.', swept: 'Swept off the edge on a log!', bolt: 'Struck by lightning!', pylon: 'Flattened by a falling pylon!', tree: 'Flattened by a falling tree!', train: 'Hit by a train!' };
  function hopCaught() { return AN.ORDERED.filter(function (t) { var e = S.animals.book[t.id]; return e && e.n > 0 && ZA && ZA.A[t.id]; }); }
  function hopNote() {
    var el = $('hop-note');
    if (!el) return;
    var have = hopCaught(), best = null;
    Object.keys(S.hop.best).forEach(function (id) { var b = S.hop.best[id]; if (AN.type(id) && (!best || b.s > best.s)) best = { id: id, s: b.s }; });
    el.textContent = !have.length ? 'Catch an animal, then hop it across roads and rivers through a day of weather.' :
      best ? 'Your best: ' + AN.type(best.id).name + ', ' + best.s + ' ' + plural(best.s, 'hop') + '.' : 'Hop your animals across roads and rivers through a day of weather.';
  }
  function hopStageName(day, stage) { return 'Day ' + day + ' · ' + WC.hop.STAGES[stage].name; }
  function openHop() {
    if (!WC.hop || !ZA) return;
    closeSheet();
    $('hop').hidden = false;
    document.documentElement.classList.add('hopping');
    hopPick();
  }
  function closeHop() {
    hopStop();
    $('hop').hidden = true;
    document.documentElement.classList.remove('hopping');
    render();
    hopNote();
  }
  function hopStop() {
    var H = R.hop;
    if (H && H.game) H.game.stop();
    R.hop = null;
    clearTimeout(hopBannerT);
    $('hop-banner').hidden = true;
  }
  function hopPanel(id) { ['hop-pick', 'hop-end'].forEach(function (p) { $(p).hidden = p !== id; }); $('hop-hud').hidden = !!id; }
  /* pick an animal: the ones you've caught, with their best */
  function hopPick() {
    hopStop();
    hopPanel('hop-pick');
    $('hop-ck').hidden = true;
    var list = hopCaught(), grid = $('hop-grid');
    grid.innerHTML = '';
    $('hop-pick-sub').textContent = list.length ? 'Play as one of your animals. Each one keeps its own best score.' : 'Catch an animal first: scan one with your camera in the Animals tab, then come back and play as it.';
    list.forEach(function (t) {
      var b = S.hop.best[t.id], btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'hop-pet';
      btn.innerHTML = '<canvas width="96" height="96" aria-hidden="true"></canvas><strong></strong><span></span>';
      btn.querySelector('strong').textContent = t.name;
      btn.querySelector('span').textContent = b ? 'Best ' + b.s + (b.d > 1 ? ' · Day ' + b.d : '') : 'New';
      btn.setAttribute('aria-label', t.name + (b ? ', best ' + b.s : ''));
      SK.portrait(btn.querySelector('canvas').getContext('2d'), 96, 96, t.id);
      btn.addEventListener('click', function () { hopChoose(t.id); });
      grid.appendChild(btn);
    });
    setActions('hop-pick-actions', [{ label: 'Close', fn: closeHop }]);
  }
  /* a checkpoint: start from the last day this animal reached, or from the beginning */
  function hopChoose(id) {
    var ck = S.hop.ck[id] || 1;
    if (ck < 2) { hopStart(id, 1); return; }
    $('hop-ck').hidden = false;
    $('hop-ck-t').textContent = 'Your ' + AN.type(id).name.toLowerCase() + ' has reached Day ' + ck + '. Start from there, or from the beginning?';
    setActions('hop-ck-actions', [{ label: 'Day 1', fn: function () { hopStart(id, 1); } }, { label: 'Day ' + ck, primary: true, fn: function () { hopStart(id, ck); } }]);
    $('hop-ck').scrollIntoView({ block: 'nearest' });
  }
  var hopBannerT = 0;
  function hopBanner(title, sub, long) {
    $('hop-banner-t').textContent = title;
    $('hop-banner-s').textContent = sub || '';
    $('hop-banner').hidden = false;
    $('hop-banner').classList.remove('go'); void $('hop-banner').offsetWidth; $('hop-banner').classList.add('go');
    clearTimeout(hopBannerT);
    hopBannerT = setTimeout(function () { $('hop-banner').hidden = true; }, long ? 4200 : 3000);
  }
  function hopStart(id, day) {
    hopStop();
    hopPanel(null);
    var t = AN.type(id), b = S.hop.best[id];
    $('hop-score').textContent = '0';
    $('hop-best').textContent = b ? 'Best ' + b.s : '';
    $('hop-hint').hidden = false;
    var H = R.hop = { id: id, day: day, score: 0, startDay: day, game: null, reached: { d: day, g: 0 } };
    H.game = WC.hop.create($('hop-canvas'), {
      animal: id, theme: WC.hop.themeFor(id), day: day, test: TEST && !!window.__hopTest,
      onScore: function (s) {
        H.score = s;
        $('hop-score').textContent = s;
        if (s === 1) $('hop-hint').hidden = true;
      },
      onStage: function (st) {
        $('hop-stage').textContent = hopStageName(st.day, st.stage);
        if ((st.day - 1) * 5 + st.stage > (H.reached.d - 1) * 5 + H.reached.g) H.reached = { d: st.day, g: st.stage };
        if (st.first) hopBanner(st.day > 1 ? 'Day ' + st.day : st.name, st.day > 1 ? st.name + '. ' + st.note : st.note, true);
        else if (st.newDay) {
          sfx('day');
          hopBanner('Day ' + st.day, st.note, true);
          // a finished day is a checkpoint, kept straight away in case the app closes mid-run
          if (st.day > (S.hop.ck[id] || 1)) { S.hop.ck[id] = st.day; save(); }
        } else { sfx('stage'); hopBanner(st.name, st.note); }
      },
      onEnd: function (e) { hopEnd(H, e); }
    });
    H.game.resize();
  }
  function hopEnd(H, e) {
    if (R.hop !== H) return;
    var id = H.id, t = AN.type(id), old = S.hop.best[id], b = old ? JSON.parse(JSON.stringify(old)) : { s: 0, d: 1, g: 0, n: 0, t: 0 };
    var newBest = e.score > b.s && e.score > 0;
    b.n += 1; b.t = now();
    if (newBest) b.s = e.score;
    if ((H.reached.d - 1) * 5 + H.reached.g > (b.d - 1) * 5 + b.g) { b.d = H.reached.d; b.g = H.reached.g; }
    S.hop.best[id] = b;
    save();
    var cause = e.cause === 'car' || e.cause === 'roller' ? 'Hit by ' + (WC.hop.NAMES[e.kind] || 'a car') + '!' : e.cause === 'caught' ? e.caught : HOP_WORDS[e.cause] || 'Out!';
    if (e.cause === 'water' && WC.hop.themeFor(id) === 'coast') cause = 'Splash! Into the sea.';
    $('hop-cause').textContent = cause;
    $('hop-endscore').textContent = e.score;
    $('hop-endline').textContent = (newBest ? 'A new best for your ' + t.name.toLowerCase() + '!' : 'Best for your ' + t.name.toLowerCase() + ': ' + b.s + '.') + ' Reached ' + hopStageName(e.day, e.stage) + '.';
    $('hop-endline').classList.toggle('new', newBest);
    setActions('hop-end-actions', [
      { label: 'Play again', primary: true, fn: function () { if ((S.hop.ck[id] || 1) >= 2) { hopPick(); hopChoose(id); } else hopStart(id, 1); } },
      { label: 'Another animal', fn: hopPick },
      { label: 'Done', fn: closeHop }
    ]);
    hopPanel('hop-end');
    if (newBest) { confetti(30); setTimeout(function () { sfx('best'); }, 500); }
  }
  /* tap to hop forward; swipe left, right or back */
  function hopInput() {
    var cv = $('hop-canvas'), st = null;
    cv.addEventListener('pointerdown', function (ev) { st = { x: ev.clientX, y: ev.clientY, t: performance.now() }; ev.preventDefault(); });
    cv.addEventListener('pointerup', function (ev) {
      if (!st || !R.hop || !R.hop.game) return;
      var dx = ev.clientX - st.x, dy = ev.clientY - st.y, d = Math.max(Math.abs(dx), Math.abs(dy));
      st = null;
      if (R.hop.paused) { R.hop.paused = false; R.hop.game.resume(); $('hop-hint').hidden = true; return; }
      R.hop.game.move(d < 18 ? 'up' : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'up' : 'down'));
    });
    cv.addEventListener('pointercancel', function () { st = null; });
    document.addEventListener('keydown', function (ev) {
      if ($('hop').hidden || !R.hop || !R.hop.game) return;
      var k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', ' ': 'up' }[ev.key];
      if (k) { ev.preventDefault(); R.hop.game.move(k); }
    });
    window.addEventListener('resize', function () { if (R.hop && R.hop.game) R.hop.game.resize(); });
    document.addEventListener('visibilitychange', function () {
      // away from the app, the game waits; it carries on with your next tap
      if (document.hidden && R.hop && R.hop.game && !$('hop').hidden) { R.hop.game.pause(); R.hop.paused = true; $('hop-hint').textContent = 'Paused. Tap to carry on.'; $('hop-hint').hidden = false; }
    });
  }

  /* ---------- sharing a jar ----------
     A picture of the jar with its label, for the phone's share menu. It's drawn as soon as a card with a
     Share button opens, so the share menu can open straight away when the button is tapped. */

  var SHARE_W = 1080, SHARE_H = 1350;
  var INK_R = { common: '#5B647F', uncommon: '#1F7A5C', rare: '#1D5FBF', epic: '#7A3FC2', legendary: '#915500' };
  function appUrl() { return location.href.split(/[?#]/)[0]; }
  function dateLong(t) { return new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + hm(t); }
  function detailLine(rec) {
    var bits = [];
    if (typeof rec.temp === 'number') bits.push(Math.round(rec.temp) + '°C');
    if (typeof rec.gust === 'number' && rec.gust >= 20) bits.push('gusts ' + rec.gust + ' mph');
    else if (typeof rec.wind === 'number' && rec.wind > 0) bits.push('wind ' + rec.wind + ' mph');
    if (typeof rec.rain === 'number') bits.push('rain ' + rec.rain + ' mm/h');
    if (typeof rec.snow === 'number') bits.push('snow ' + rec.snow + ' cm/h');
    var up = typeof rec.alt === 'number' ? rec.alt : rec.elev;
    if (typeof up === 'number' && up >= 150) bits.push(up + ' m up');
    return bits.join(' · ');
  }
  /* a moment in the scene's animation that looks good still: lightning mid-flash */
  function stillTime(id) {
    var s = SKY.SCENES[id];
    if (s && s.bolt) return (s.bolt[2] || 4.6) + 0.04;
    if (s && s.sheet) return 3.25;
    return 2;
  }
  function loadPhoto(key) {
    if (!key) return Promise.resolve(null);
    return getPhoto(key).then(function (b) {
      if (!b) return null;
      var img = imgFromBlob(b);
      return new Promise(function (res) {
        if (img.complete && img.naturalWidth) { res(img); return; }
        img.onload = function () { res(img); };
        img.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([document.fonts.load('800 80px Archivo'), document.fonts.load('500 34px Archivo'), document.fonts.load('600 26px "IBM Plex Mono"')]).catch(function () {});
  }
  function fitText(ctx, text, weight, size, family, maxW) {
    for (var s = size; s > 18; s -= 2) {
      ctx.font = weight + ' ' + s + 'px ' + family;
      if (ctx.measureText(text).width <= maxW) return s;
    }
    return 18;
  }
  var DISPLAY = 'Archivo, "Arial Narrow", Arial, sans-serif', MONO = '"IBM Plex Mono", Menlo, monospace';
  function makeShareCard(id, rec) {
    var t = T(id), e = S.book[id];
    return Promise.all([fontsReady(), loadPhoto((rec && rec.photo) || e.photo)]).then(function (res) {
      var cv = document.createElement('canvas');
      cv.width = SHARE_W;
      cv.height = SHARE_H;
      var ctx = cv.getContext('2d');
      var bg = ctx.createLinearGradient(0, 0, 0, SHARE_H);
      bg.addColorStop(0, '#0B1020');
      bg.addColorStop(1, '#1B2449');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, SHARE_W, SHARE_H);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#EEF2FA';
      ctx.font = '800 52px ' + DISPLAY;
      ctx.fillText('FRZFRM', 64, 104);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9AA6C2';
      ctx.font = '600 24px ' + MONO;
      ctx.fillText('WEATHER CATCH', SHARE_W - 64, 100);
      // the jar, still, as it looks on the shelf
      var jw = 510, jh = 680;
      var jc = document.createElement('canvas');
      jc.width = jw;
      jc.height = jh;
      var st = jarState(id);
      st.img = res[1] || null;
      st.mark = markOf(id, rec && rec.v, rec && rec.seed, rec && rec.power);
      SKY.jar(jc.getContext('2d'), jw, jh, st, stillTime(id), DARK_LOOK);
      ctx.drawImage(jc, (SHARE_W - jw) / 2, 150);
      // the label
      var lx = 60, ly = 862, lw = SHARE_W - 120, lh = 400, pad = 48, maxW = lw - pad * 2;
      ctx.save();
      SKY.roundRect(ctx, lx, ly, lw, lh, 28);
      ctx.clip();
      ctx.fillStyle = '#F3EEE7';
      ctx.fillRect(lx, ly, lw, lh);
      ctx.fillStyle = INK_R[t.r];
      ctx.fillRect(lx, ly, lw, 12);
      ctx.restore();
      ctx.textAlign = 'left';
      var y = ly + pad + 66;
      ctx.fillStyle = '#121933';
      var title = recName(id, rec);
      fitText(ctx, title, '800', 76, DISPLAY, maxW);
      ctx.fillText(title, lx + pad, y);
      y += 52;
      var vr = RU.variant(id, (rec && rec.v) || 'c');
      var kind = rlabel(id).toUpperCase() + (t.el === 'wonder' ? ' · SKY WONDER' : t.el === 'change' ? ' · CHANGE MOMENT' : '') +
        (vr.id !== 'c' ? ' · ' + vr.name.toUpperCase() + ', ' + vr.odds.toUpperCase() + ' (' + vr.pct + ')' : e.n > 1 ? ' · ×' + e.n : '');
      ctx.fillStyle = INK_R[t.r];
      fitText(ctx, kind, '600', 26, MONO, maxW);
      ctx.fillText(kind, lx + pad, y);
      var where = rec ? (rec.where || rec.place || '') : '';
      var sg = rec ? RU.strength(id, rec) : null;
      var lines = [where, rec && rec.t ? dateLong(rec.t) : '', sg ? starsText(sg.stars) + '  ' + RU.strengthText(sg) : rec ? detailLine(rec) : ''].filter(Boolean);
      y += 64;
      lines.forEach(function (line, i) {
        ctx.fillStyle = i === 0 ? '#121933' : '#4F5878';
        fitText(ctx, line, i === 0 ? '700' : '500', i === 0 ? 38 : 32, DISPLAY, maxW);
        ctx.fillText(line, lx + pad, y);
        y += i === 0 ? 52 : 46;
      });
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9AA6C2';
      var foot = appUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');
      fitText(ctx, foot, '500', 24, MONO, SHARE_W - 128);
      ctx.fillText(foot, SHARE_W / 2, SHARE_H - 40);
      return new Promise(function (resolve, reject) {
        cv.toBlob(function (b) { if (b) resolve(b); else reject(new Error('No picture')); }, 'image/png');
      });
    });
  }
  function shareText(id, rec) {
    var vr = RU.variant(id, (rec && rec.v) || 'c');
    var sg = rec ? RU.strength(id, rec) : null;
    return 'Look what I caught' + (rec && rec.place ? ' in ' + rec.place : '') + ': ' + recName(id, rec) + ' (' + rlabel(id) + (vr.id !== 'c' ? ', ' + vr.name + ', ' + vr.odds + ', ' + vr.pct : '') + ')' +
      (sg ? ', ' + sg.stars + ' ' + plural(sg.stars, 'star') + ': ' + RU.strengthText(sg) : '') + '. Catch the weather where you are: ' + appUrl();
  }
  /* rec: the catch to share. Without one, the newest */
  function prepareShare(id, rec) {
    var e = S.book[id];
    if (!e || !e.n) { R.share = null; return; }
    var s = { id: id, rec: rec || lastCatch(e), blob: null };
    s.promise = makeShareCard(id, s.rec).then(function (b) { s.blob = b; return b; });
    s.promise.catch(function () {});
    R.share = s;
  }
  /* then: what happens after sharing, like moving on to the next jar card */
  function doShare(then) {
    var s = R.share;
    if (!s) return;
    function go(blob) {
      var file = null;
      try { file = new File([blob], 'frzfrm-' + s.id + '.png', { type: 'image/png' }); } catch (e) {}
      if (file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: T(s.id).name, text: shareText(s.id, s.rec) }).catch(function (err) {
          if (!err || err.name !== 'AbortError') sharePreview(blob, then);
        });
      } else sharePreview(blob, then);
    }
    if (s.blob) go(s.blob);
    else s.promise.then(go, function () { toast('Couldn’t make the picture. Try again.'); });
  }
  function sharePreview(blob, then) {
    var s = R.share;
    var url = URL.createObjectURL(blob);
    showInfo({
      label: 'Share', title: 'Your jar, ready to send',
      body: '<img class="share-img" src="' + url + '" alt="' + esc(T(s.id).name + ' jar with its label') + '"><p class="muted">Press and hold the picture to save it or send it to friends.</p>',
      actions: [{ label: 'Done', primary: true, fn: then || closeSheet }]
    });
  }

  /* ---------- the More tab ---------- */

  function isStandalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function renderMore() {
    $('version').textContent = VERSION;
    renderSound();
    renderPhotosCard();
    var text = $('install-text'), btn = $('install-btn');
    if (isStandalone()) { text.textContent = 'You’re using it from your home screen. Your jars are safest here.'; btn.hidden = true; }
    else if (R.installEvt) { text.textContent = 'It opens like an app, and your jars are safer there.'; btn.hidden = false; }
    else if (isIOS()) { text.textContent = 'On iPhone: tap the Share button in Safari, then Add to Home Screen. It opens like an app, and your jars are safer there.'; btn.hidden = true; }
    else { text.textContent = 'In your browser menu, choose Add to Home screen or Install app. It opens like an app, and your jars are safer there.'; btn.hidden = true; }
  }

  /* ---------- tabs ---------- */

  function selectTab(tab) {
    var changed = R.tab !== tab;
    R.tab = tab;
    ['catch', 'shelf', 'animals', 'more'].forEach(function (k) {
      if (!$('panel-' + k)) return;
      $('panel-' + k).hidden = k !== tab;
      if (k === tab) $('nav-' + k).setAttribute('aria-current', 'page');
      else $('nav-' + k).removeAttribute('aria-current');
    });
    if (tab === 'shelf') renderShelf();
    if (tab === 'animals') renderAnimals();
    render();
    window.scrollTo(0, 0);
    // the new tab eases in
    var pn = $('panel-' + tab);
    if (changed && pn && !reduce) { pn.classList.remove('enter'); void pn.offsetWidth; pn.classList.add('enter'); }
    kick();
  }

  /* ---------- the sheet ---------- */

  function showView(name) {
    stopSpin();
    clearJarFx();
    R.view = name;
    R.previewJars = null;
    $('sheet').classList.remove('scorched');
    $('sheet').scrollTop = 0;
    R.cardKind = null;
    $('game-view').hidden = name !== 'game';
    if ($('scan-view')) $('scan-view').hidden = name !== 'scan';
    if (name !== 'scan') stopCamera();
    if ($('seek-view')) $('seek-view').hidden = name !== 'seek';
    if (name !== 'seek') stopSeek();
    $('card-view').hidden = name !== 'card';
    if ($('c-undo')) $('c-undo').hidden = true;
    if ($('reward-view')) $('reward-view').hidden = name !== 'reward';
    $('info-view').hidden = name !== 'info';
    $('sheet').setAttribute('aria-labelledby', name === 'game' ? 'g-title' : name === 'scan' ? 's-title' : name === 'seek' ? 'k-title' : name === 'card' ? 'c-title' : name === 'reward' ? 'r-title' : 'i-title');
  }
  function setActions(boxId, list) {
    var box = $(boxId);
    box.innerHTML = '';
    list.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn' + (a.primary ? ' btn-primary' : '') + (a.danger ? ' btn-danger' : '');
      b.textContent = a.label;
      if (a.id) b.id = a.id;
      b.addEventListener('click', a.fn);
      box.appendChild(b);
    });
  }
  function openSheet() {
    var ov = $('overlay');
    if (ov.hidden) R.lastFocus = document.activeElement;
    ov.hidden = false;
    kick();
    if (R.view !== 'game') {
      var btns = $(R.view === 'card' ? 'c-actions' : R.view === 'reward' ? 'r-actions' : R.view === 'scan' ? 's-actions' : R.view === 'seek' ? 'k-actions' : 'i-actions').querySelectorAll('button');
      var target = btns[btns.length - 1];
      if (target) try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }
  }
  function closeSheet() {
    stopSpin();
    clearJarFx();
    freeThumbs();
    $('sheet').classList.remove('scorched');
    stopCamera();
    stopSeek();
    $('overlay').hidden = true;
    R.game = null;
    R.cardState = null;
    R.previewJars = null;
    R.share = null;
    R.queue = [];
    R.view = null;
    R.cardKind = null;
    clearTimeout(confTimer);
    if ($('confetti')) $('confetti').innerHTML = '';
    if (R.lastFocus && R.lastFocus.focus && document.contains(R.lastFocus)) try { R.lastFocus.focus({ preventScroll: true }); } catch (e) {}
    render();
    if (R.tab === 'shelf') renderShelf();
    if (R.tab === 'animals') renderAnimals();
  }
  function showInfo(o) {
    showView('info');
    $('i-label').textContent = o.label || '';
    $('i-label').className = 'ov-label' + (o.labelClass ? ' ' + o.labelClass : '');
    $('i-title').textContent = o.title || '';
    $('i-body').innerHTML = o.body || '';
    setActions('i-actions', o.actions || [{ label: 'Close', primary: true, fn: closeSheet }]);
    openSheet();
  }
  function setVerify(text) {
    var el = $('c-verify');
    if (!text) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = icon('check', 16) + '<span></span>';
    el.lastChild.textContent = text;
  }
  /* on a photo jar's card: how many photos it holds, and a way to see or delete them */
  function setPhotoLine(id) {
    var el = $('c-photo');
    if (!el) return;
    var n = id ? photoCount(id) : 0;
    el.hidden = !n;
    if (!n) return;
    $('c-photo-t').textContent = n === 1 ? 'This jar holds 1 photo.' : 'This jar holds ' + n + ' photos.';
    R.photoJar = id;
  }
  function setPill(id) {
    var t = T(id);
    var p = $('c-pill');
    p.className = 'pill rc-' + t.r;
    p.textContent = rlabel(id) + (t.el === 'wonder' ? ' · Sky Wonder' : t.el === 'change' ? ' · Change moment' : '');
  }

  /* ---------- catching ---------- */

  function beginCatch(id, kind, key) {
    if (kind === 'flight') { openFlightCatch(); return; }
    if (flying()) { toast('You’re flying! The weather on the ground can’t be caught from up here.'); return; }
    if (blockedByMoving()) { toast('You’re moving fast. Passengers can tap I’m a passenger.'); return; }
    if (!R.area) return;
    if (S.caught[key]) { toast('You’ve already caught that today.'); return; }
    var cool = coolLeft(key);
    if (cool) { toast(liveName(id) + ' slipped away. Try again in ' + minutes(cool) + '.'); return; }
    if (stale()) {
      toast('Checking the weather first…');
      var areaId = R.area.id;
      refreshWeather(true).then(function () {
        var stillHere = R.area && R.area.id === areaId && !stale();
        var still = stillHere && (kind === 'weather' ? R.cls && R.cls.ids.indexOf(id) !== -1 : kind === 'spotted' ? canSpot(id) : R.wonders.some(function (w) { return w.key === key; }));
        if (still) openGame(id, kind, key);
        else toast('The weather has changed. Have another look.');
      });
      return;
    }
    openGame(id, kind, key);
  }
  /* Sunset Over the Clouds: no weather needed, just the plane and the sun */
  function openFlightCatch() {
    if (!flying()) { toast('Sunset Over the Clouds can only be caught from a plane.'); render(); return; }
    var fs = flightSun();
    if (!fs || !fs.now) { toast('Wait for the sun to set where the plane is.'); render(); return; }
    if (S.caught[flightKey()]) { toast('You’ve caught it today already.'); return; }
    openGame('cloudsunset', 'flight', flightKey());
  }
  function openGame(id, kind, key) {
    var t = T(id);
    R.game = { id: id, kind: kind, key: key, areaId: R.area ? R.area.id : 'sky', g: WC.game.create({ id: id, night: R.reading ? !R.reading.isDay : false }), missHandled: false, why: kind === 'spotted' ? spotWhy(id) : '' };
    showView('game');
    $('g-label').textContent = kind === 'wonder' ? 'Sky Wonder' : kind === 'spotted' ? 'You spotted it' : 'Catch it';
    $('g-label').className = 'ov-label rc-' + t.r;
    $('g-title').textContent = 'Catch ' + liveName(id);
    $('g-instr').textContent = R.game.g.instruction;
    $('g-flee').textContent = id === 'namedstorm' ? 'Named storms never slip away. Keep trying while it’s here' : id === 'cloudsunset' ? 'It never slips away. Keep trying while the sun sets' : WC.game.fleeChance(id) ? rlabel(id) + ': can slip away if you miss' : 'Commons never slip away';
    hideGameMsg();
    setActions('g-actions', [{ label: 'Let it go', fn: closeSheet }]);
    openSheet();
    focusStage();
  }
  function focusStage() { try { $('g-stage').focus({ preventScroll: true }); } catch (e) {} }
  function showGameMsg(text) { var m = $('g-msg'); m.textContent = text; m.hidden = false; }
  function hideGameMsg() { var m = $('g-msg'); m.hidden = true; m.textContent = ''; }
  function handleMiss() {
    var G = R.game;
    G.missHandled = true;
    sfx('miss');
    var chance = WC.game.fleeChance(G.id);
    var name = liveName(G.id);
    if (chance && Math.random() < chance) {
      S.cool[G.key] = now() + COOLDOWN;
      addLog(name + ' slipped away' + (G.kind !== 'wonder' ? ' in ' + placeFor(G.areaId) : ''));
      save();
      showGameMsg(G.g.result + ' ' + name + ' slipped away. Try again in 10 minutes if it’s still here.');
      setActions('g-actions', [{ label: 'Close', primary: true, fn: closeSheet }]);
      render();
    } else {
      showGameMsg(G.g.result);
      setActions('g-actions', [{ label: 'Let it go', fn: closeSheet }, { label: 'Try again', primary: true, fn: retryGame }]);
    }
  }
  function retryGame() {
    if (!R.game) return;
    R.game.missHandled = false;
    R.game.g.start();
    hideGameMsg();
    setActions('g-actions', [{ label: 'Let it go', fn: closeSheet }]);
    focusStage();
  }
  function bookEntry(id) {
    var e = S.book[id];
    if (!e) e = S.book[id] = { n: 0, places: [], first: null, last: 0 };
    return e;
  }
  function addPlace(e, place) {
    if (!place || e.places.indexOf(place) !== -1) return false;
    e.places.push(place);
    if (e.places.length > 60) e.places.shift();
    return true;
  }
  /* the details of a catch, kept for its label: when, where, how high, how it was caught and the weather at the time */
  var KEEP = 12;
  function snapshot(areaId, how) {
    var rec = { t: now(), how: how, place: placeFor(areaId) };
    var nm = S.names[areaId];
    if (nm && nm.name !== rec.place) rec.where = nm.name;
    var o = R.reading;
    if (o && R.area && R.area.id === areaId) {
      var per = 3600 / (o.interval || 900);
      var wet = (num(o.rain) || 0) + (num(o.showers) || 0);
      if (num(o.temp) !== undefined) rec.temp = Math.round(o.temp * 10) / 10;
      if (num(o.wind) !== undefined) rec.wind = Math.round(o.wind);
      if (num(o.gusts) !== undefined) rec.gust = Math.round(o.gusts);
      if (wet > 0) rec.rain = Math.round(wet * per * 10) / 10;
      if ((num(o.snowfall) || 0) > 0) rec.snow = Math.round(o.snowfall * per * 10) / 10;
      if (num(o.vis) !== undefined) { rec.vis = Math.round(o.vis / 100) / 10; rec.visM = Math.round(o.vis); }
      if (typeof R.depth === 'number' && R.depthArea === areaId) rec.depth = R.depth;
      var elev = R.wx && R.wx.here ? num(R.wx.here.elevation) : undefined;
      if (elev !== undefined) rec.elev = Math.round(elev);
    }
    if (R.pos && typeof R.pos.alt === 'number' && now() - R.lastFix < 10 * MIN) rec.alt = Math.round(R.pos.alt);
    if (how === 'flight') {
      rec.place = 'above the clouds';
      delete rec.where;
      var fp = R.flightPos || R.pos;
      if (fp && typeof fp.altF === 'number') rec.alt = Math.round(fp.altF);
      if (fp && typeof fp.spd === 'number') rec.kmh = Math.round(fp.spd * 3.6);
      delete rec.temp; delete rec.wind; delete rec.gust; delete rec.rain; delete rec.snow; delete rec.vis; delete rec.visM; delete rec.depth; delete rec.elev;
    }
    // caught in a named storm: the catch remembers which one
    if (R.storm && R.area && R.area.id === areaId && R.cls && R.cls.ids.indexOf('namedstorm') !== -1) rec.storm = R.storm.name;
    return rec;
  }
  /* each jar keeps its first catch and the most recent ones */
  function record(e, rec) {
    if (!Array.isArray(e.catches)) e.catches = [];
    e.catches.push(rec);
    if (e.catches.length > KEEP) e.catches.splice(1, e.catches.length - KEEP);
  }
  function lastCatch(e) {
    if (e.catches && e.catches.length) return e.catches[e.catches.length - 1];
    return e.first ? { t: e.first.t, place: e.first.place } : null;
  }
  /* ---------- mystery variants ----------
     Each catch opens as a variant, with the odds the app shows, and gets its own seed so it's drawn one of a kind.
     Two people catching the same storm get different jars. */
  function rand32() {
    try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]; } catch (e) { return Math.floor(Math.random() * 4294967296) >>> 0; }
  }
  function rollCatch(rec) {
    rec.v = TEST && R.forceV ? R.forceV : RU.rollVariant(rand32() / 4294967296);
    rec.seed = rand32() || 1;
    return rec;
  }
  /* counts each variant found, and keeps the newest of each one to show. Returns true the first time a variant turns up */
  function addVariant(e, rec) {
    if (!e.vars) e.vars = {};
    var x = e.vars[rec.v];
    var fresh = !x;
    if (!x) x = e.vars[rec.v] = { n: 0, seed: 0, t: 0, place: '' };
    x.n += 1;
    // the catch on show is the newest
    x.seed = rec.seed;
    x.t = rec.t;
    x.place = rec.place || '';
    if (typeof rec.power === 'number') x.power = rec.power; else delete x.power;
    return fresh;
  }
  /* the shelf's sections: a row for each kind of weather, then the animal rows */
  function sections() { return RU.ELEMENTS.map(function (el) { return el.id; }).concat(AN ? AN.ROWS.map(function (r) { return r.id; }) : []); }
  function sectionName(sec) { var el = RU.ELEMENTS.filter(function (x) { return x.id === sec; })[0]; return el ? el.name : AN ? AN.rowName(sec) : ''; }
  /* the jar look picked for a section in Shelf style, if it's unlocked: the key sky.js draws it by, or null for clear glass */
  function jarLook(sec) {
    var id = S.style.jars && S.style.jars[sec], lk = id && RU.jarLook(id);
    return lk && lk.key && RU.levelFor(S.points) >= lk.level ? lk.key : null;
  }
  /* the shelf shows the rarest variant found */
  function bestVariant(e) {
    var best = 'c';
    VARS.forEach(function (v) { if (e && e.vars && e.vars[v]) best = v; });
    return best;
  }
  function varsFound(e) { return VARS.filter(function (v) { return e && e.vars && e.vars[v]; }).length; }
  /* what the jar needs to draw one particular catch */
  function markOf(id, v, seed, power) {
    var vr = RU.variant(id, v || 'c');
    seed = seed >>> 0;
    var pw = typeof power === 'number' && isFinite(power) ? power : undefined;
    var lk = T(id) ? jarLook(T(id).el) : null;
    if (!vr || (!seed && !vr.deco && !vr.legend && pw === undefined && !lk)) return null;
    var mk = { seed: seed, deco: vr.deco, legend: vr.legend };
    // rare, epic and legendary variants catch the light now and then
    var vk = RU.variantRank(vr.id);
    if (vk >= 3) mk.shine = vk >= 7 ? 3 : vk >= 5 ? 2 : 1;
    if (pw !== undefined) mk.power = pw;
    if (lk) mk.glass = lk;
    return mk;
  }
  function shelfMark(id, e) {
    var v = bestVariant(e), x = e.vars && e.vars[v];
    return markOf(id, v, x ? x.seed : 0, x ? x.power : undefined);
  }
  /* the catch to show for a variant: the record of the one on show, or what the jar remembers of it */
  function recFor(e, v) {
    var x = e.vars && e.vars[v];
    var seed = x ? x.seed : 0;
    var list = e.catches || [];
    for (var i = list.length - 1; i >= 0; i--) if ((list[i].v || 'c') === v && (list[i].seed >>> 0) === seed) return list[i];
    return x ? { t: x.t, place: x.place, v: v, seed: seed } : lastCatch(e);
  }
  function variantNote(id, v) {
    var vr = RU.variant(id, v);
    return vr && vr.id !== 'c' ? ' (' + vr.name + ')' : '';
  }
  /* jars caught before variants existed: each of those catches gets one mystery roll, once, at the usual odds.
     They're the Classic ones with no seed. A card then shows what turned up. */
  function openOldJars() {
    var total = 0, found = [];
    Object.keys(S.book).forEach(function (id) {
      var e = S.book[id];
      var x = e.vars && e.vars.c;
      if (!x || x.seed) return;
      var n = x.n;
      delete e.vars.c;
      var old = (e.catches || []).filter(function (r) { return !r.v; }).slice(-n);
      var recs = [];
      for (var i = old.length; i < n; i++) recs.push({ t: (e.first && e.first.t) || 0, place: x.place });
      recs.concat(old).forEach(function (rec) {
        rollCatch(rec);
        var y = e.vars[rec.v] || (e.vars[rec.v] = { n: 0, seed: 0, t: -1, place: '' });
        y.n += 1;
        if ((rec.t || 0) >= y.t) {
          y.seed = rec.seed; y.t = rec.t || 0; y.place = rec.place || '';
          if (typeof rec.power === 'number') y.power = rec.power; else delete y.power;
        }
        if (rec.v !== 'c') found.push({ id: id, v: rec.v });
      });
      total += n;
    });
    if (total) {
      S.oldJars = { n: total, found: found };
      addLog('Opened ' + total + ' old ' + plural(total, 'jar') + ': ' + found.length + ' ' + plural(found.length, 'surprise'));
    }
    return total;
  }

  /* ---------- points ----------
     A catch earns its rarity's points, more for 4 and 5 stars. The first catch of each kind of weather each day earns full
     points; catching it again the same day, in another area, earns half. Trip jars earn half too: there was no game */
  function dayCounts() {
    var d = today();
    if (!S.day || S.day.d !== d || !S.day.n || typeof S.day.n !== 'object') S.day = { d: d, n: {} };
    return S.day.n;
  }
  function caughtToday(id) { return (dayCounts()[id] || 0) > 0; }
  function countToday(id) { var n = dayCounts(); n[id] = (n[id] || 0) + 1; }
  function catchPoints(id, sg, trip, again) {
    var p = RU.points(id) * (sg ? RU.starBonus(sg.stars) : 1);
    if (trip) p *= 0.5;
    if (again) p *= 0.5;
    return Math.max(1, Math.round(p));
  }
  /* what a saved catch earned: saved with it from 0.9.0, worked out the old way (full points) before that */
  function earned(id, rec) { return typeof rec.pts === 'number' && isFinite(rec.pts) ? rec.pts : Math.round(RU.points(id) * (rec.stars ? RU.starBonus(rec.stars) : 1)); }
  /* what catching it now would earn, before stars */
  function livePoints(id) { return catchPoints(id, null, false, caughtToday(id)); }
  /* how: live, spotted, change, sky or photo */
  function awardOne(id, key, place, verify, how, areaId) {
    S.caught[key] = 1;
    var e = bookEntry(id);
    var isNew = !e.n;
    var before = e.n;
    e.n += 1;
    var newPlace = addPlace(e, place);
    if (!e.first) e.first = { t: now(), place: place };
    e.last = now();
    var rec = rollCatch(snapshot(areaId, how));
    if (id === 'namedstorm' && !rec.storm && R.storm) rec.storm = R.storm.name;
    var sg = rate(id, rec);
    if (id === 'namedstorm') addStorm(e, rec);
    record(e, rec);
    var newV = addVariant(e, rec) && !isNew;
    var newBest = sg ? bestUpdate(e, rec, sg) : false;
    var spotted = how === 'spotted';
    var again = caughtToday(id);
    var pts = catchPoints(id, sg, false, again);
    rec.pts = pts;
    countToday(id);
    S.points += pts;
    var tier = RU.tierReached(before, e.n);
    var r = { id: id, isNew: isNew, n: e.n, newPlace: newPlace && !isNew, place: place, pts: pts, tier: tier, verify: verify || '', spotted: spotted, v: rec.v, seed: rec.seed, newV: newV, rec: rec,
      sg: sg, newBest: newBest, again: again };
    var t = T(id);
    var lead = spotted ? (isNew ? 'Spotted a new jar: ' : 'Spotted: ') : isNew ? (t.el === 'change' ? 'Change moment: ' : t.el === 'wonder' ? 'Sky Wonder: ' : 'New jar: ') : '';
    addLog(lead + recName(id, rec) + variantNote(id, rec.v) + (isNew ? '' : ' again') + (place ? ' in ' + place : '') + (isNew ? ' (+' + pts + ')' : ' (×' + e.n + ', +' + pts + ')'));
    return r;
  }
  function finishCatch() {
    var G = R.game;
    R.game = null;
    var before = RU.levelFor(S.points);
    var place = placeFor(G.areaId);
    var t = now();
    var list = [];
    if (G.kind === 'weather' || G.kind === 'spotted') {
      var prev = (S.recent[G.areaId] || []).slice();
      var nowIds = (R.cls && R.area && R.area.id === G.areaId ? R.cls.ids : []).slice();
      if (nowIds.indexOf(G.id) === -1) nowIds.push(G.id);
      var temp = R.reading ? R.reading.temp : 10;
      if (G.kind === 'spotted') list.push(awardOne(G.id, G.key, place, 'You spotted it in ' + place + ' at ' + hm(t) + '. ' + (G.why || ''), 'spotted', G.areaId));
      else list.push(awardOne(G.id, G.key, place, 'Matches the live weather for ' + place + ' at ' + hm(t) + '.', 'live', G.areaId));
      RU.changesFor(prev, nowIds, temp, t).forEach(function (cid) {
        var ck = today() + '|' + G.areaId + '|' + cid;
        if (S.caught[ck]) return;
        list.push(awardOne(cid, ck, place, 'You were in ' + place + ' when the weather turned.', 'change', G.areaId));
      });
      prev = prev.filter(function (p) { return t - p.t <= 3 * HOUR; });
      prev.push({ id: G.id, t: t });
      S.recent[G.areaId] = prev.slice(-8);
    } else if (G.kind === 'flight') {
      var fp = R.flightPos || R.pos;
      list.push(awardOne(G.id, G.key, 'above the clouds', 'Caught from a plane' + (fp && typeof fp.altF === 'number' ? ' ' + Math.round(fp.altF).toLocaleString('en-GB') + ' m up' : '') + ', as the sun set at ' + hm(t) + '.', 'flight', G.areaId));
    } else {
      list.push(awardOne(G.id, G.key, place, 'Matches the sky over ' + place + ' at ' + hm(t) + '.', 'sky', G.areaId));
    }
    afterAward(list, before);
  }
  /* after jars go on the shelf: any shelf rewards they've earned follow the jar cards */
  function afterAward(list, before) {
    var cards = list.concat(claimRewards());
    if (S.oldJars) { cards.push({ oldJars: S.oldJars }); S.oldJars = null; }
    var after = RU.levelFor(S.points);
    if (after > before && cards.length) {
      cards[cards.length - 1].lvUp = after;
      addLog('Level ' + after + '!');
    }
    save();
    render();
    try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {}
    openReveal(cards);
  }
  function unlockText(L) {
    var bits = [];
    for (var i = 0; i < RU.UNLOCKS.length; i++) if (RU.UNLOCKS[i].level === L) bits.push('Unlocked: ' + RU.UNLOCKS[i].name.toLowerCase() + '.');
    RU.jarLooksAt(L).forEach(function (lk) { bits.push('New jar look: ' + lk.name + '. Pick it in Shelf style.'); });
    return bits.join(' ');
  }
  function openReveal(list) {
    R.queue = list.slice();
    nextReveal();
  }
  function nextReveal() {
    var r = R.queue.shift();
    if (!r) { closeSheet(); return; }
    if (r.reward) { showReward(r); return; }
    if (r.oldJars) { showOldJars(r); return; }
    if (r.animal) { revealAnimal(r); return; }
    var t = T(r.id);
    var e = S.book[r.id];
    showView('card');
    var label = r.trip ? 'From your trip' : r.spotted ? (r.isNew ? 'Spotted · New jar' : 'Spotted') : r.isNew ? (t.el === 'change' ? 'New Change moment' : t.el === 'wonder' ? 'New Sky Wonder' : 'New jar') : 'Caught again';
    $('c-label').textContent = label;
    $('c-label').className = 'ov-label rc-' + t.r;
    $('c-title').textContent = recName(r.id, r.rec);
    setPill(r.id);
    var bonus = r.sg ? RU.starBonus(r.sg.stars) : 1;
    var halves = [];
    if (r.trip) halves.push('half on a trip');
    if (r.again) halves.push('half as it’s your second today');
    var pts = '+' + r.pts + ' points' + (bonus > 1 ? ' · ×' + bonus + ' for ' + r.sg.stars + ' stars' : '') + (halves.length ? ' · ' + halves.join(', ') : '');
    if (r.lvUp) pts += ' · Level ' + r.lvUp + '! ' + unlockText(r.lvUp);
    $('c-points').textContent = pts;
    $('c-line').textContent = t.line;
    var stats;
    if (r.trip) stats = r.isNew ? 'First one on your shelf.' : '×' + e.n + ' on your shelf · ' + e.places.length + ' ' + plural(e.places.length, 'place');
    else if (r.isNew) stats = 'First one on your shelf.';
    else stats = '×' + r.n + ' · ' + e.places.length + ' ' + plural(e.places.length, 'place') + (r.newPlace ? ' · new place: ' + r.place : '');
    $('c-stats').textContent = stats;
    setTier(e.n, r.tier);
    setPhotoLine(null);
    setVerify(r.verify);
    R.cardState = jarState(r.id);
    if (r.img) R.cardState.img = r.img;
    var v = r.v || bestVariant(e);
    R.cardV = v;
    if (r.v) R.cardState.mark = markOf(r.id, r.v, r.seed, r.rec && r.rec.power);
    setVariant(r.id, v, r.newV);
    setStrength(r.sg, r.newBest ? 'Strongest yet' : '');
    renderVars(null);
    var next = { label: R.queue.length ? 'Next' : 'Put it on the shelf', primary: true, fn: nextReveal };
    R.share = null;
    if (RU.rank(r.id) >= 3 || RU.variantRank(v) >= 3 || (r.sg && r.sg.stars >= 4)) {
      prepareShare(r.id, r.rec);
      setActions('c-actions', [{ label: 'Share', fn: function () { doShare(nextReveal); } }, next]);
    } else setActions('c-actions', [next]);
    openSheet();
    var land = function () {
      if (r.v && R.cardState) R.cardState.mark = markOf(r.id, r.v, r.seed, r.rec && r.rec.power);
      setVariant(r.id, v, r.newV);
      updateScorch();
      var vk = RU.variantRank(v), tk = RU.rank(r.id);
      var tier = v === 'p' ? 3 : vk >= 5 ? 2 : vk >= 3 ? 1 : 0;
      if (r.isNew) tier = Math.max(tier, tk >= 5 ? 3 : tk >= 4 ? 2 : tk >= 3 ? 1 : 0);
      landFx(tier, t.el, r.isNew || r.newV);
      if (v === 'p') {
        confetti(60);
        try { if (navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 80]); } catch (err) {}
      } else if ((RU.variantRank(v) >= 5 && (r.newV || r.isNew)) || (r.newBest && r.sg.stars === 5)) confetti(18);
      else if (RU.variantRank(v) >= 1) { try { if (navigator.vibrate) navigator.vibrate(30); } catch (err) {} }
    };
    if (r.v && spinOn()) spinReveal(r, land); else land();
    if (r.lvUp) { sfx('level'); toast('Level ' + r.lvUp + '! ' + unlockText(r.lvUp)); }
  }
  /* how a jar levels up: bronze, silver, gold, then rainbow (RU.TIERS). Every catch counts, and nothing is used up.
     reached: the tier's name when this catch got it there */
  function setTier(n, reached) {
    var box = $('c-tier');
    if (!box) return;
    if (!n) { box.hidden = true; return; }
    box.hidden = false;
    var cur = RU.tierFor(n), nx = RU.nextTier(n), txt, f, kind;
    var head = cur ? medal(n) + '<strong>' + cur.name + ' jar' + (reached === cur.name ? '!' : '.') + '</strong> ' : '';
    if (!nx) { txt = head + n + ' catches, the top level.'; f = 1; kind = cur.id; }
    else {
      var gap = nx.at - n;
      txt = head + '<strong>' + gap + ' more</strong> ' + plural(gap, 'catch', 'catches') + ' for ' + (cur ? nx.name.toLowerCase() : 'a ' + nx.name.toLowerCase() + ' jar') + ' (' + n + ' of ' + nx.at + ').';
      f = n / nx.at; kind = nx.id;
    }
    $('c-tier-t').innerHTML = txt;
    box.className = 'ov-tier t-' + kind;
    $('c-tier-fill').style.width = Math.round(f * 100) + '%';
  }
  /* the strength line: stars, the reading in words, and whether it beats this jar's strongest */
  function starsText(n) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= n ? '★' : '☆'; return s; }
  function setStrength(sg, tag, label) {
    var el = $('c-str');
    if (!el) return;
    if (!sg || !sg.stars) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = (label ? '<span class="str-k">' + esc(label) + '</span>' : '') +
      '<span class="stars" role="img" aria-label="' + sg.stars + ' out of 5 stars">' + starsText(sg.stars) + '</span>' +
      '<span class="str-v">' + esc(RU.strengthText(sg) + (label && sg.t ? ', ' + new Date(sg.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')) + '</span>' +
      (tag ? '<span class="v-new">' + esc(tag) + '</span>' : '');
  }
  /* the variant line under a jar's name: which one it is, its odds, and whether it's a new find or not found yet */
  function setVariant(id, v, fresh, locked) {
    var el = $('c-var');
    if (!el) return;
    // while the reel spins
    if (id && v === null) { el.hidden = false; el.innerHTML = '<span class="v-name">Opening the jar…</span>'; return; }
    var vr = id && RU.variant(id, v);
    if (!vr) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<span class="v-name' + (vr.legend ? ' legend-text' : '') + '">' + esc(vr.name) + '</span><span class="v-odds">' + esc(vr.odds) + ' · ' + esc(vr.pct) + '</span>' +
      (vr.legend ? '<span class="v-legend">Legendary</span>' : '') +
      (fresh ? '<span class="v-new">New variant</span>' : locked ? '<span class="v-lock">' + icon('lock', 13) + 'Not found yet</span>' : '');
  }
  /* Burning Glass gathers the sun and scorches the card it's on */
  function updateScorch() {
    var sh = $('sheet');
    if (!sh) return;
    var mk = R.view === 'card' && R.cardState && !R.spin ? R.cardState.mark : null;
    sh.classList.toggle('scorched', !!(mk && mk.glass === 'burning'));
  }
  /* on a jar's card: a strip of all its variants. Tap one to see it big, even one not found yet */
  var PREVIEW_SEED = 1;
  function renderVars(id) {
    var box = $('c-vars');
    if (!box) return;
    var e = id && S.book[id];
    var show = !!id && RU.catchable(T(id));
    setJarNav(show);
    if (!show) { box.hidden = true; box.innerHTML = ''; return; }
    var have = !!(e && e.n);
    box.hidden = false;
    var list = RU.variants(id), lv = list[list.length - 1];
    box.innerHTML = '<div class="var-h"><span class="h2">Variants</span><span class="var-n">' + (have ? varsFound(e) : 0) + ' of ' + list.length + ' found</span></div>' +
      '<div class="var-strip" role="group" aria-label="Variants of this jar">' + list.map(function (vr) {
        var x = e && e.vars && e.vars[vr.id];
        var on = R.cardV === vr.id;
        return '<button type="button" class="vjar' + (on ? ' on' : '') + (x ? '' : ' locked') + (vr.legend ? ' legend' : '') + '" data-var="' + vr.id + '" aria-pressed="' + on + '"' +
          ' aria-label="' + esc(vr.name + (vr.legend ? ', legendary' : '') + (x ? ', found ' + x.n + ' ' + plural(x.n, 'time') : ', not found yet, ' + vr.odds + ' jars')) + '">' +
          '<canvas data-id="' + id + '" data-var="' + vr.id + '" aria-hidden="true"></canvas><span class="vjar-n">' + (x ? '×' + x.n : esc(vr.odds)) + '</span></button>';
      }).join('') + '</div>' +
      (!have ? '<p class="small var-note">Swipe the jar to see all eight. You find out which one you get when you catch it. <span class="legend-text">' + esc(lv.name) + '</span> is its legendary, about 1 in every 60 catches.</p>' :
        e.vars && e.vars.p ? '' : '<p class="small var-note"><span class="legend-text">' + esc(lv.name) + '</span> is this jar’s legendary, the rarest find of all: about 1 in every 60 catches.</p>');
    R.previewJars = Array.prototype.slice.call(box.querySelectorAll('canvas[data-var]'));
  }
  /* scroll the strip sideways so the variant on show is in the middle, without moving the card */
  function centerStrip(smooth) {
    var strip = $('c-vars') && $('c-vars').querySelector('.var-strip'), cur = strip && strip.querySelector('button.on');
    if (!cur) return;
    var left = Math.max(0, cur.offsetLeft - (strip.clientWidth - cur.offsetWidth) / 2);
    if (smooth && strip.scrollTo) strip.scrollTo({ left: left, behavior: 'smooth' }); else strip.scrollLeft = left;
  }
  /* swipe the big jar, or tap its arrows, to go through a jar's variants */
  function setJarNav(on) { if ($('c-prev')) { $('c-prev').hidden = !on; $('c-next').hidden = !on; } }
  function canSwipe() { return R.view === 'card' && !R.spin && !!R.cardId && !$('c-vars').hidden && !!$('c-vars').querySelector('.var-strip'); }
  function stepVariant(dir) {
    if (!canSwipe()) return;
    if (R.cardKind === 'animal') { stepHome(dir); return; }
    var list = RU.variants(R.cardId), i = 0;
    list.forEach(function (vr, k) { if (vr.id === R.cardV) i = k; });
    var next = list[(i + dir + list.length) % list.length];
    var cv = $('c-canvas');
    var swap = function () { pickVariant(next.id); centerStrip(true); };
    if (reduce) { swap(); return; }
    cv.classList.remove('drag');
    cv.style.transform = 'translateX(' + (-dir * 34) + '%)';
    cv.style.opacity = '0';
    setTimeout(function () {
      swap();
      cv.classList.add('drag');
      cv.style.transform = 'translateX(' + (dir * 34) + '%)';
      void cv.offsetWidth;
      cv.classList.remove('drag');
      cv.style.transform = '';
      cv.style.opacity = '';
    }, 150);
  }
  /* the moment a jar lands on its card: the weather (or the animal's world) swirls into the jar, the jar drops onto the
     card with a clink and a bounce, and rarer finds glow behind it: blue for rare, purple for epic, gold rays for legendary */
  var SWIRL = {
    sun: ['#FFD27A', '#F5B759', '#FFF1C6'], rain: ['#7DB4FF', '#BFDBFF', '#5C8FD8'], frost: ['#FFFFFF', '#CFE8FF', '#9FD0FF'],
    wind: ['#B8E3DC', '#E6F4F1', '#7CC4BA'], storm: ['#C4A0FF', '#7D88B8', '#FFE58A'], mist: ['#E3E8F0', '#C2CAD8', '#FFFFFF'],
    wonder: ['#FF94A8', '#FFD27A', '#7DB4FF', '#6FD6A8', '#C4A0FF'], change: ['#FFC47A', '#9FC0F0', '#FFFFFF'],
    garden: ['#8DCB69', '#F2C230', '#FFFFFF'], pets: ['#F5B759', '#FF94A8', '#FFFFFF'], coast: ['#7DD3F0', '#F2E2B0', '#FFFFFF'],
    country: ['#A8D46F', '#E2BE5A', '#FFFFFF'], zoo: ['#E2BE5A', '#F28C28', '#FFF1C6']
  };
  var fxTimers = [];
  function clearJarFx() {
    fxTimers.forEach(clearTimeout);
    fxTimers = [];
    if ($('c-halo')) $('c-halo').className = 'jar-halo';
    if ($('c-swirl')) $('c-swirl').innerHTML = '';
    if ($('c-canvas')) $('c-canvas').classList.remove('pop');
  }
  function landFx(tier, pal, fresh) {
    clearJarFx();
    var later = function (ms, fn) { fxTimers.push(setTimeout(fn, ms)); };
    var tierSound = tier >= 3 ? 'legend' : tier === 2 ? 'epic' : tier === 1 ? 'rare' : fresh ? 'reward' : '';
    var halo = $('c-halo'), sw = $('c-swirl'), cv = $('c-canvas');
    if (halo && tier) { void halo.offsetWidth; halo.className = 'jar-halo h' + tier; }
    if (reduce) { sfx('clink'); if (tierSound) later(150, function () { sfx(tierSound); }); return; }
    if (cv) { void cv.offsetWidth; cv.classList.add('pop'); }
    if (sw) {
      var cols = SWIRL[pal] || SWIRL.mist, html = '', n = 14 + tier * 5;
      for (var i = 0; i < n; i++) {
        html += '<i style="--a:' + Math.round(Math.random() * 360) + 'deg;--r:' + Math.round(84 + Math.random() * 46) + 'px;--s:' + (4 + Math.random() * 5).toFixed(1) +
          'px;background:' + cols[i % cols.length] + ';animation-delay:' + (Math.random() * 0.25).toFixed(2) + 's"></i>';
      }
      sw.innerHTML = html;
      later(1500, function () { sw.innerHTML = ''; });
    }
    sfx('swirl');
    later(240, function () { sfx('clink'); });
    if (tierSound) later(430, function () { sfx(tierSound); });
  }
  /* the reveal: a reel of jars spins past a marker, slows down and lands on the variant caught, then the jar opens.
     The jars on the reel turn up at the real odds, and what's caught is decided before the reel starts. Tap to skip */
  function spinOn() { return !reduce && !(TEST && !/[?&]spin=1(&|$)/.test(location.search)); }
  function stopSpin() {
    var sp = R.spin;
    if (!sp) return;
    R.spin = null;
    cancelAnimationFrame(sp.raf);
    clearTimeout(sp.timer);
    $('c-var').classList.remove('spinning');
    if (sp.reel && sp.reel.parentNode) sp.reel.parentNode.removeChild(sp.reel);
    $('c-jar').classList.remove('reeling');
  }
  var TILE_W = 78, TILE_GAP = 8, REEL_N = 34, REEL_AT = 28, REEL_MS = 3400;
  /* a still picture of one variant, for the reel */
  function variantPicture(id, v, seed, power, w, h) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var st = jarState(id);
    st.mark = markOf(id, v, seed, power);
    st.glow = null;
    st.hat = st.drip = false;
    SKY.jar(cv.getContext('2d'), w, h, st, stillTime(id), glassLook());
    return cv;
  }
  /* kit: what's on the reel. Left out, it's a weather jar's variants and glass */
  function spinReveal(r, land, kit) {
    if (!kit) {
      if (!RU.variants(r.id).length) { land(); return; }
      kit = {
        roll: function () { return RU.rollVariant(rand32() / 4294967296); },
        won: r.v,
        pic: function (v, w, h) { return variantPicture(r.id, v, r.seed, r.rec && r.rec.power, w, h); },
        tile: function (v) { var vr = RU.variant(r.id, v), vk = RU.variantRank(v); return { cls: vr.legend ? 'legend' : vk >= 5 ? 'epic' : vk >= 3 ? 'rare' : vk >= 1 ? 'uncommon' : 'classic', odds: vr.odds }; },
        slow: r.v === 'p',
        during: function () { setVariant(r.id, null); }
      };
    }
    var dpr = Math.min(2, window.devicePixelRatio || 1), pw = Math.round(64 * dpr), ph = Math.round(85 * dpr);
    var pics = {};
    var pic = function (vg) { return pics[vg] || (pics[vg] = kit.pic(vg, pw, ph)); };
    // every jar on the reel turns up at the real odds
    var seq = [];
    for (var i = 0; i < REEL_N; i++) seq.push(i === REEL_AT ? kit.won : kit.roll());
    // the rarest of all: the reel takes its time
    var crown = kit.slow, ms = crown ? REEL_MS * 1.6 : REEL_MS;
    var reel = document.createElement('div');
    reel.className = 'reel';
    reel.setAttribute('aria-hidden', 'true');
    var track = document.createElement('div');
    track.className = 'reel-track';
    seq.forEach(function (vg) {
      var tl = kit.tile(vg.split(':')[0]);
      var tile = document.createElement('div');
      tile.className = 'reel-tile r-' + tl.cls;
      var c = document.createElement('canvas');
      c.width = pw; c.height = ph;
      c.getContext('2d').drawImage(pic(vg), 0, 0);
      tile.appendChild(c);
      var lab = document.createElement('span');
      lab.className = 'reel-odds';
      lab.textContent = tl.odds;
      tile.appendChild(lab);
      track.appendChild(tile);
    });
    reel.appendChild(track);
    var mark = document.createElement('div');
    mark.className = 'reel-mark';
    reel.appendChild(mark);
    var box = $('c-jar');
    box.classList.add('reeling');
    box.appendChild(reel);
    var sp = { reel: reel, raf: 0, timer: 0 };
    R.spin = sp;
    $('c-var').classList.add('spinning');
    kit.during();
    updateScorch();
    var width = reel.clientWidth || 320;
    // land somewhere inside the caught tile, not always dead centre
    var jitter = (Math.random() - 0.5) * TILE_W * 0.6;
    var to = REEL_AT * (TILE_W + TILE_GAP) + TILE_W / 2 + jitter - width / 2;
    var t0 = 0, lastTile = -1;
    sp.finish = function () {
      if (R.spin !== sp) return;
      track.style.transform = 'translateX(' + (-to) + 'px)';
      var won = track.children[REEL_AT];
      if (won) won.classList.add('won');
      cancelAnimationFrame(sp.raf);
      sp.raf = 0;
      sp.timer = setTimeout(function () {
        if (R.spin !== sp) return;
        stopSpin();
        land();
      }, crown ? 1200 : 520);
    };
    var step = function (ts) {
      if (R.spin !== sp) return;
      if (!t0) t0 = ts;
      var f = Math.min(1, (ts - t0) / ms);
      // fast at first, then a long slow-down
      var e = 1 - Math.pow(1 - f, 4);
      var x = to * e;
      track.style.transform = 'translateX(' + (-x) + 'px)';
      var under = Math.floor((x + width / 2) / (TILE_W + TILE_GAP));
      if (under !== lastTile) {
        lastTile = under;
        sfx('tick');
        if (f > 0.55) { try { if (navigator.vibrate) navigator.vibrate(4); } catch (err) {} }
      }
      if (f >= 1) { sp.finish(); return; }
      sp.raf = requestAnimationFrame(step);
    };
    sp.raf = requestAnimationFrame(step);
  }
  function markStrip(v) {
    Array.prototype.forEach.call($('c-vars').querySelectorAll('button[data-var]'), function (b) {
      var on = b.getAttribute('data-var') === v;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function pickVariant(v) {
    var id = R.cardId, e = id && S.book[id];
    var vr = id && RU.variant(id, v);
    if (!vr || vr.id !== v || R.view !== 'card') return;
    var x = e && e.vars && e.vars[v];
    R.cardV = v;
    if (!e || !e.n) R.cardState = variantState(id, v);
    R.cardState.mark = markOf(id, v, x ? x.seed : PREVIEW_SEED, x ? x.power : undefined);
    R.cardState.preview = !x;
    setVariant(id, v, false, !x);
    markStrip(v);
    updateScorch();
    if (x) {
      prepareShare(id, recFor(e, v));
      setActions('c-actions', [{ label: 'Share', fn: function () { doShare(closeSheet); } }, { label: 'Close', primary: true, fn: closeSheet }]);
    } else {
      R.share = null;
      setActions('c-actions', [{ label: 'Close', primary: true, fn: closeSheet }]);
    }
  }
  function openSkyDetail() {
    var have = !!S.rewards.full;
    var full = RU.reward('full');
    showView('card');
    $('c-label').textContent = have ? RU.KEEPER : 'The last jar';
    $('c-label').className = 'ov-label rc-legendary';
    $('c-title').textContent = 'The Sky Jar';
    var p = $('c-pill');
    p.className = 'pill rc-legendary';
    p.textContent = have ? 'Live' : 'Not earned yet';
    $('c-points').textContent = have ? 'Earned ' + dateLabel(S.rewards.full) : '+' + full.bonus + ' bonus points when you earn it';
    $('c-line').textContent = have ? 'The sky over ' + (R.place ? R.place.name : 'you') + ' right now: ' + skyName() + '.' : full.hint;
    $('c-stats').textContent = have ? 'It changes with the weather wherever you go.' : jarCount() + ' of ' + RU.SHELF_TOTAL + ' jars so far.';
    setVerify('');
    setVariant(null);
    setStrength(null);
    setTier(0);
    setPhotoLine(null);
    renderVars(null);
    R.cardState = jarState('sky');
    setActions('c-actions', [{ label: 'Close', primary: true, fn: closeSheet }]);
    openSheet();
  }
  /* one storm's jar: its name, how many times it was caught, when and where first, and the catch on show */
  function openStormDetail(name) {
    var id = 'namedstorm', t = T(id), e = S.book[id], x = e.storms[name];
    var rec = stormRec(e, name);
    showView('card');
    $('c-label').textContent = 'On your shelf';
    $('c-label').className = 'ov-label rc-' + t.r;
    $('c-title').textContent = 'Storm ' + name;
    setPill(id);
    $('c-points').textContent = RU.points(id) + ' points a catch';
    $('c-line').textContent = t.line;
    var season = stormSeason(e);
    $('c-stats').textContent = '×' + x.n + (season ? ' · ' + season : '');
    setVerify(x.t ? 'First caught ' + new Date(x.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' at ' + hm(x.t) + (x.place ? ' in ' + x.place : '') : '');
    setTier(0);
    setPhotoLine(null);
    R.cardState = stormState(name);
    R.cardId = id;
    R.cardV = (rec && rec.v) || 'c';
    setVariant(id, R.cardV, false);
    setStrength(rec ? RU.strength(id, rec) : null);
    renderVars(null);
    R.share = null;
    prepareShare(id, rec);
    setActions('c-actions', [{ label: 'Share', fn: function () { doShare(closeSheet); } }, { label: 'Close', primary: true, fn: closeSheet }]);
    openSheet();
    updateScorch();
  }
  function openDetail(id, storm) {
    if (id === 'sky') { openSkyDetail(); return; }
    if (id === 'namedstorm' && storm && S.book.namedstorm && S.book.namedstorm.storms && S.book.namedstorm.storms[storm]) { openStormDetail(storm); return; }
    var t = T(id);
    var e = S.book[id];
    var n = e ? e.n : 0;
    showView('card');
    $('c-label').textContent = n ? 'On your shelf' : t.how === 'later' ? 'Coming later' : 'Not caught yet';
    $('c-label').className = 'ov-label rc-' + t.r;
    $('c-title').textContent = t.name;
    setPill(id);
    $('c-points').textContent = RU.points(id) + ' points a catch';
    $('c-line').textContent = n ? t.line : t.when + '.';
    var season = id === 'namedstorm' ? stormSeason(e) : '';
    if (n) {
      $('c-stats').textContent = '×' + n + (e.places.length ? ' · Places: ' + e.places.slice(-12).join(', ') : '') + (season ? ' · ' + season : '');
      setVerify(e.first ? 'First caught ' + new Date(e.first.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' at ' + hm(e.first.t) + (e.first.place ? ' in ' + e.first.place : '') : '');
    } else {
      $('c-stats').textContent = t.how === 'photo' ? 'Caught with a photo when the weather makes it possible.' : t.how === 'change' ? 'Earned when the weather turns while you’re there.' : t.how === 'sky' ? 'Comes from the sky calendar.' :
        t.how === 'flight' ? 'Caught from a plane while the sun sets. Keep the app open on the flight: your phone’s GPS can tell you’re flying, even without wifi.' : season;
      setVerify('');
    }
    setTier(n);
    setPhotoLine(n && t.how === 'photo' ? id : null);
    R.cardId = id;
    // a jar not caught yet shows a frosted preview of its Classic, and every variant can be looked at
    var open = !n && RU.catchable(t);
    R.cardV = n ? bestVariant(e) : open ? 'c' : null;
    R.cardState = open ? variantState(id, 'c') : jarState(id);
    setVariant(n || open ? id : null, R.cardV, false, open);
    setStrength(n && e.best ? e.best : null, '', 'Strongest');
    renderVars(id);
    R.share = null;
    if (n) {
      prepareShare(id, recFor(e, R.cardV));
      setActions('c-actions', [{ label: 'Share', fn: function () { doShare(closeSheet); } }, { label: 'Close', primary: true, fn: closeSheet }]);
    } else setActions('c-actions', [{ label: 'Close', primary: true, fn: closeSheet }]);
    openSheet();
    centerStrip();
    updateScorch();
  }

  /* ---------- photo catches ---------- */

  /* ---------- spotting: weather the data missed, and Sky Wonders caught with a photo ---------- */


  function seenList() {
    if (!R.cls || !R.area) return [];
    return R.seen.filter(function (s) { return R.cls.ids.indexOf(s.id) === -1; }).map(function (s) {
      var key = wKey(R.area.id, s.id);
      return { id: s.id, possible: s.possible, why: s.why, key: key, caught: !!S.caught[key], cool: coolLeft(key) };
    });
  }
  function canSpot(id) {
    return !!R.cls && (R.cls.ids.indexOf(id) !== -1 || R.seen.some(function (s) { return s.id === id && s.possible; }));
  }
  function spotWhy(id) {
    var s = R.seen.filter(function (x) { return x.id === id; })[0];
    return s && s.possible ? s.why : '';
  }
  /* one list: what can be caught right now first, then a folded list of what can't and why */
  function openSpot() {
    if (!R.area || !R.cls) { toast('Spotting works once the weather has loaded.'); return; }
    var d = today();
    var weather = seenList().map(function (s) { return { id: s.id, possible: s.possible, why: s.why, caught: s.caught, cool: s.cool, photo: false }; });
    var sky = R.spots.map(function (s) { return { id: s.id, possible: s.possible, why: s.why, caught: !!S.caught[s.id + '|' + d], cool: 0, photo: true }; });
    var all = weather.concat(sky);
    var dis = blockedByMoving() ? ' disabled' : '';
    var can = all.filter(function (s) { return s.possible || s.caught || s.cool; });
    var cannot = all.filter(function (s) { return !(s.possible || s.caught || s.cool); });
    var rows = can.map(function (s) {
      var t = T(s.id);
      var right = s.caught ? '<span class="pill rc-' + t.r + '">Caught today</span>' :
        s.cool ? '<span class="small">Back in ' + minutes(s.cool) + '</span>' :
        s.photo ? '<button class="btn" type="button" data-photo="' + s.id + '"' + dis + '>Take a photo</button>' :
        '<button class="btn" type="button" data-seen="' + s.id + '"' + dis + '>Catch ' + esc(t.name) + '</button>';
      return '<li class="spot-item"><span class="rc-' + t.r + '">' + icon(s.id, 24) + '</span><div class="si-body"><div class="si-name">' + esc(t.name) +
        ' <span class="tl-r rc-' + t.r + '">' + rlabel(s.id) + (s.photo ? ' · photo' : '') + '</span></div><div class="si-why">' + esc(s.why) + '</div></div>' + right + '</li>';
    }).join('');
    var nots = cannot.map(function (s) { return '<li><strong>' + esc(T(s.id).name) + '.</strong> ' + esc(s.why) + '</li>'; }).join('');
    showInfo({
      label: 'Spot something', title: 'What can you see?',
      body: '<p class="muted">The weather data can miss a passing shower or a patch of fog, and Sky Wonders like rainbows are caught with a photo. Only catch what you can really see, and never look straight at the sun.</p>' +
        (rows ? '<ul class="spot-list">' + rows + '</ul>' : '<p>Nothing else can be caught here right now.</p>') +
        (nots ? '<details class="not-box"><summary>Not possible right now (' + cannot.length + ')</summary><ul class="not-list">' + nots + '</ul></details>' : '') +
        '<p class="muted">Photos are checked on your phone: they have to show the sky, with no faces in them.</p>'
    });
  }
  function takePhoto(id) {
    R.pendingSpot = id;
    var input = $('photo-input');
    input.value = '';
    input.click();
  }
  function onPhoto() {
    var input = $('photo-input');
    var file = input.files && input.files[0];
    var id = R.pendingSpot;
    R.pendingSpot = null;
    if (!file || !id) return;
    var key = id + '|' + today();
    if (S.caught[key]) { toast('You’ve already caught ' + T(id).name + ' today.'); return; }
    toast('Checking your photo…');
    shrinkPhoto(file).then(function (blob) {
      // a photo the phone can't check doesn't go in a jar
      var cant = { ok: false, reason: 'error', text: 'Your phone couldn’t check this photo, so it can’t go in a jar.' };
      var checker = WC.photoCheck ? WC.photoCheck.check(blob, id).catch(function () { return cant; }) : Promise.resolve(cant);
      return checker.then(function (v) {
        if (!v.ok) { photoFailed(id, v); return; }
        putInJar(id, key, blob, v);
      });
    }).catch(function () { toast('That photo couldn’t be read. Try again.'); });
  }
  /* a photo that didn't pass: say why, and offer another go straight away */
  function photoFailed(id, v) {
    var el = $('toast');
    if (el) el.hidden = true;
    showInfo({
      label: 'Photo check', labelClass: 'rc-danger', title: 'That photo didn’t pass',
      body: '<p>' + esc(v.text) + '</p><p class="muted">Photos are checked on your phone, and nothing is sent anywhere. Take a new photo of the ' + esc(T(id).name) + ' to catch it.</p>',
      actions: [{ label: 'Not now', fn: closeSheet }, { label: 'Try another photo', primary: true, fn: function () { closeSheet(); takePhoto(id); } }]
    });
  }
  function putInJar(id, key, blob, v) {
    var before = RU.levelFor(S.points);
    var place = placeFor(R.area ? R.area.id : '');
    var r = awardOne(id, key, place, (v && v.text ? v.text + ' ' : '') + 'Taken in ' + place + ' at ' + hm(now()) + ', when the weather made it possible.', 'photo', R.area ? R.area.id : '');
    var pk = 'p' + Date.now();
    S.book[id].photo = pk;
    lastCatch(S.book[id]).photo = pk;
    var img = imgFromBlob(blob);
    R.photos[pk] = img;
    r.img = img;
    putPhoto(pk, blob).catch(function () {});
    afterAward([r], before);
  }
  /* photos already in jars are checked again each time the photo checks get stricter (0.7.1, then 0.9.0), once on each
     phone. One that fails, with a face in it or the wrong kind of sky, is taken back: that catch stops counting, its
     points come off and the photo is deleted, and a jar left with no catches is empty again. A catch whose photo can't be
     found stays as it is. */
  function checkLevel() { return WC.photoCheck && WC.photoCheck.VERSION ? WC.photoCheck.VERSION : 1; }
  function recheckPhotos() {
    if ((S.photoCheck || 0) >= checkLevel() || R.recheck || !WC.photoCheck || !S.onboarded) return Promise.resolve([]);
    var jobs = [];
    RU.ORDERED.forEach(function (t) {
      var e = S.book[t.id];
      if (t.how !== 'photo' || !e || !e.n) return;
      var keys = [];
      (e.catches || []).forEach(function (rec) { if (rec && rec.photo && keys.indexOf(rec.photo) === -1) keys.push(rec.photo); });
      if (e.photo && keys.indexOf(e.photo) === -1) keys.push(e.photo);
      keys.forEach(function (pk) { jobs.push({ id: t.id, pk: pk }); });
    });
    if (!jobs.length) { S.photoCheck = checkLevel(); save(); return Promise.resolve([]); }
    R.recheck = true;
    var failed = [], broken = false;
    var chain = Promise.resolve();
    jobs.forEach(function (j) {
      chain = chain.then(function () {
        return getPhoto(j.pk).then(function (blob) {
          if (!blob) return null;
          return WC.photoCheck.check(blob, j.id).then(function (v) { if (v && !v.ok) failed.push({ id: j.id, pk: j.pk, text: v.text }); }, function () {});
        }, function () { broken = true; });
      });
    });
    return chain.then(function () {
      R.recheck = false;
      // if the phone's photo store couldn't be opened, try again next time
      if (broken) return [];
      var out = failed.map(function (f) { return takeBack(f); }).filter(Boolean);
      S.photoCheck = checkLevel();
      // what to tell the player is saved, so it's still said if the app closes before the card shows
      if (out.length) S.photoNote = out;
      save();
      if (out.length) {
        render();
        if (R.tab === 'shelf') renderShelf();
        whenFree(showPhotoNote);
      }
      return out;
    });
  }
  /* takes one photo catch off the shelf: one that failed a check, or one whose photo the player deleted (mine).
     Returns what to tell the player */
  function takeBack(f, mine) {
    var e = S.book[f.id];
    if (!e || !e.n) return null;
    var recs = (e.catches || []).filter(function (rec) { return rec && rec.photo === f.pk; });
    if (!recs.length) recs = [{ photo: f.pk, t: e.last || now() }];
    var pts = 0;
    recs.forEach(function (rec) {
      e.n -= 1;
      pts += earned(f.id, rec);
      var x = rec.v && e.vars && e.vars[rec.v];
      if (x) {
        x.n -= 1;
        if (x.n <= 0) delete e.vars[rec.v];
      }
      if (rec.t) delete S.caught[f.id + '|' + RU.dayKey(rec.t)];
    });
    if (e.catches) e.catches = e.catches.filter(function (rec) { return recs.indexOf(rec) === -1; });
    S.points = Math.max(0, S.points - pts);
    deletePhoto(f.pk);
    delete R.photos[f.pk];
    var name = T(f.id).name;
    if (e.n <= 0) delete S.book[f.id];
    else {
      var left = e.catches || [];
      var withPhoto = left.filter(function (rec) { return rec.photo; });
      if (e.photo === f.pk) { if (withPhoto.length) e.photo = withPhoto[withPhoto.length - 1].photo; else delete e.photo; }
      if (left.length) { e.first = { t: left[0].t, place: left[0].place || '' }; e.last = left[left.length - 1].t; }
      // each variant still found shows one of its own catches
      Object.keys(e.vars || {}).forEach(function (v) {
        var mine = left.filter(function (rec) { return rec.v === v; });
        if (mine.length) { var m = mine[mine.length - 1]; e.vars[v].seed = m.seed; e.vars[v].t = m.t; e.vars[v].place = m.place || ''; }
      });
    }
    addLog((mine ? 'Photo deleted: ' : 'Photo check: ') + name + ' taken back (−' + pts + ')');
    return { id: f.id, name: name, text: f.text, pts: pts, gone: !S.book[f.id] };
  }
  function showPhotoNote() {
    var list = S.photoNote;
    if (!Array.isArray(list) || !list.length) return;
    S.photoNote = null;
    save();
    tookBack(list);
  }
  function tookBack(list) {
    var many = list.length > 1;
    showInfo({
      label: 'Photo check', labelClass: 'rc-danger', title: many ? 'Some photos didn’t pass' : 'Your ' + list[0].name + ' photo didn’t pass',
      body: '<p class="muted">Photo checks are stricter now, so the photos already in your jars have just been checked again.</p>' +
        list.map(function (x) {
          return '<p><strong>' + esc(x.name) + ':</strong> ' + esc(x.text) + ' That catch is taken back' + (x.pts ? ', with its ' + x.pts + ' points' : '') + '.' +
            (x.gone ? ' Catch it again with a photo of the real thing.' : '') + '</p>';
        }).join(''),
      actions: [{ label: 'OK', primary: true, fn: function () { closeSheet(); setTimeout(checkPendingRewards, 300); } }]
    });
  }
  /* ---------- your photos ----------
     Every photo in a jar, and any left on the phone outside one, each with a Delete button. Photos never leave the phone.
     Deleting a jar's photo takes that catch back too, with its points, as a failed photo check does. */
  function photoKeys() {
    return db().then(function (d) {
      return new Promise(function (res) {
        try {
          var q = d.transaction('photos', 'readonly').objectStore('photos').getAllKeys();
          q.onsuccess = function () { res(q.result || []); };
          q.onerror = function () { res([]); };
        } catch (e) { res([]); }
      });
    }).catch(function () { return []; });
  }
  /* [{ pk, id (the jar, or null), t, place }], newest first */
  function photoList() {
    var items = [], seen = {};
    RU.ORDERED.forEach(function (t) {
      var e = S.book[t.id];
      if (!e || !e.n) return;
      (e.catches || []).forEach(function (rec) {
        if (rec && rec.photo && !seen[rec.photo]) { seen[rec.photo] = 1; items.push({ pk: rec.photo, id: t.id, t: rec.t || 0, place: rec.place || '' }); }
      });
      if (e.photo && !seen[e.photo]) { seen[e.photo] = 1; items.push({ pk: e.photo, id: t.id, t: e.last || 0, place: '' }); }
    });
    return photoKeys().then(function (keys) {
      keys.forEach(function (k) {
        if (typeof k === 'string' && !seen[k]) { seen[k] = 1; items.push({ pk: k, id: null, t: Number(k.slice(1)) || 0, place: '' }); }
      });
      return items.sort(function (a, b) { return b.t - a.t; });
    });
  }
  function photoCount(id) {
    var e = S.book[id], keys = {};
    if (!e) return 0;
    (e.catches || []).forEach(function (rec) { if (rec && rec.photo) keys[rec.photo] = 1; });
    if (e.photo) keys[e.photo] = 1;
    return Object.keys(keys).length;
  }
  function freeThumbs() { (R.thumbs || []).forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); R.thumbs = []; }
  /* only: just the photos in one jar */
  function openPhotos(only) {
    R.photoOnly = only || null;
    photoList().then(function (items) {
      if (only) items = items.filter(function (x) { return x.id === only; });
      R.photoItems = items;
      freeThumbs();
      var list = items.map(function (x) {
        var name = x.id ? T(x.id).name : 'Not in a jar';
        var when = x.t ? new Date(x.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' at ' + hm(x.t) : '';
        return '<li class="photo-item"><img class="ph-img" data-pk="' + esc(x.pk) + '" alt="' + esc('Photo in ' + name) + '">' +
          '<div class="ph-body"><div class="ph-name">' + esc(name) + '</div><div class="ph-when">' + esc([when, x.place].filter(Boolean).join(' · ')) + '</div></div>' +
          '<button class="btn btn-danger ph-del" type="button" data-delphoto="' + esc(x.pk) + '">Delete</button></li>';
      }).join('');
      showInfo({
        label: 'Your photos', title: only ? T(only).name + ' photos' : 'Every photo in your jars',
        body: (items.length ? '<ul class="photo-list">' + list + '</ul>' : '<p>' + (only ? 'There are no photos in this jar.' : 'There are no photos on this phone.') + '</p>') +
          '<p class="muted">Photos are only kept on this phone. Deleting one from a jar takes that catch back too, with its points.</p>',
        actions: only ? [{ label: 'Close', fn: closeSheet }, { label: 'All your photos', primary: true, fn: function () { openPhotos(); } }] : [{ label: 'Close', primary: true, fn: closeSheet }]
      });
      items.forEach(function (x) {
        getPhoto(x.pk).then(function (b) {
          var img = $('i-body').querySelector('img[data-pk="' + x.pk.replace(/[^\w-]/g, '') + '"]');
          if (!img || !b || R.photoItems !== items) return;
          var u = URL.createObjectURL(b);
          R.thumbs.push(u);
          img.src = u;
        }).catch(function () {});
      });
    });
  }
  function photoPoints(id, pk) {
    var e = S.book[id], pts = 0, any = false;
    (e && e.catches || []).forEach(function (rec) { if (rec && rec.photo === pk) { any = true; pts += earned(id, rec); } });
    return any ? pts : RU.points(id);
  }
  function confirmDeletePhoto(pk) {
    var x = (R.photoItems || []).filter(function (it) { return it.pk === pk; })[0];
    if (!x) return;
    var back = function () { openPhotos(R.photoOnly); };
    var img = $('i-body').querySelector('img[data-pk="' + pk.replace(/[^\w-]/g, '') + '"]');
    var src = img && img.src ? img.src : '';
    showInfo({
      label: 'Delete photo', labelClass: 'rc-danger', title: 'Delete this photo?',
      body: (src ? '<img class="share-img ph-big" src="' + esc(src) + '" alt="The photo">' : '') +
        '<p>' + (x.id ? 'It’s deleted from this phone for good, and the ' + esc(T(x.id).name) + ' catch it was taken for comes off your shelf, with its ' + photoPoints(x.id, pk) + ' points.' :
          'It’s deleted from this phone for good. It isn’t in any of your jars.') + '</p>',
      actions: [{ label: 'Keep it', fn: back }, { label: 'Delete photo', danger: true, fn: function () { deleteOnePhoto(x); } }]
    });
  }
  function deleteOnePhoto(x) {
    var gone = null;
    if (x.id && S.book[x.id]) gone = takeBack({ id: x.id, pk: x.pk, text: '' }, true);
    else { deletePhoto(x.pk); delete R.photos[x.pk]; }
    save();
    render();
    if (R.tab === 'shelf') renderShelf();
    toast(gone ? 'Photo deleted. ' + gone.name + ' was taken back' + (gone.pts ? ' (−' + gone.pts + ' points)' : '') + '.' : 'Photo deleted.');
    openPhotos(R.photoOnly && S.book[R.photoOnly] ? R.photoOnly : null);
  }
  function renderPhotosCard() {
    var txt = $('photos-text');
    if (!txt) return;
    photoList().then(function (items) {
      var n = items.length;
      txt.textContent = n ? n + ' ' + plural(n, 'photo') + ' on this phone. See them all, and delete any you don’t want in a jar.' : 'Photos you take for your jars show here. They’re only kept on this phone.';
    });
  }

  /* runs fn once nothing else is on screen: no card, no catch and no Drive mode trip */
  function whenFree(fn, tries) {
    tries = tries || 0;
    if ($('overlay').hidden && !R.game && !S.drive) { fn(); return; }
    if (tries < 400) setTimeout(function () { whenFree(fn, tries + 1); }, 1500);
  }

  /* ---------- Drive mode ----------
     A trip seals the weather you drive through, with nothing to touch: each kind of weather once a trip, and 5 jars at
     most. When the trip is full, a rarer kind of weather takes the place of the commonest one sealed so far. Trip jars
     earn half points, because there's no catching game to play. */

  var TRIP_MAX = 5;
  function openDriveIntro() {
    showInfo({
      label: 'Drive mode', title: 'Set it up before you set off',
      body: '<p>Put your phone in a holder with the app open, and don’t touch it while you drive.</p>' +
        '<p>Once you’ve driven out of the area you set off from, the weather on your journey goes into sealed jars: each kind of weather once a trip, up to ' + TRIP_MAX + ' jars, keeping the rarest. Open them when you’ve stopped. Trip jars earn half points, as there’s no catching game to play.</p>' +
        '<p class="muted">Keep the app open on screen, ideally plugged in. A website only gets your location while it’s open, so if the screen turns off or you open another app, the trip stops following you.</p>',
      actions: [{ label: 'Not now', fn: closeSheet }, { label: 'Start Drive mode', primary: true, fn: startDrive }]
    });
  }
  function startDrive() {
    closeSheet();
    S.drive = true;
    if (!S.haul) S.haul = { start: now(), jars: [], from: R.area ? R.area.id : null };
    tripDiag();
    S.passengerUntil = 0;
    addLog('Drive mode on');
    save();
    $('drive').hidden = false;
    requestWake();
    startWatch();
    if (R.area && R.wx) driveSeal();
    else if (R.area) refreshWeather();
    renderDrive();
  }
  /* what the trip saw, so an empty trip can say why: GPS fixes, how fast, new areas, time off screen, weather that didn't load */
  function tripDiag() {
    var h = S.haul;
    if (!h) return {};
    if (!h.diag || typeof h.diag !== 'object') h.diag = { fixes: 0, fast: 0, top: 0, areas: 0, left: false, hidden: 0, gaps: 0, wxFail: 0, swapped: 0, lastFix: 0 };
    return h.diag;
  }
  function noteTripFix(t, sp) {
    if (!S.drive || !S.haul) return;
    var dg = tripDiag();
    dg.fixes += 1;
    if (typeof sp === 'number' && isFinite(sp)) {
      if (sp > dg.top) dg.top = Math.round(sp * 10) / 10;
      if (sp >= FAST) dg.fast += 1;
    }
    if (dg.lastFix && t - dg.lastFix > 2 * MIN) dg.gaps += 1;
    dg.lastFix = t;
  }
  /* Drive mode seals the weather only on the road: while the car is moving at driving speed, and only once it's
     left the area the trip set off from. So nobody can skip the catching games where they are */
  function driving() { return R.fast && now() - R.speedAt < 2 * MIN; }
  function commonest(jars) {
    var low = null;
    jars.forEach(function (j) { if (!low || RU.rank(j.id) < RU.rank(low.id) || (RU.rank(j.id) === RU.rank(low.id) && j.t > low.t)) low = j; });
    return low;
  }
  /* puts one kind of weather in the trip, if the rules allow. Returns true when it went in */
  function sealOne(h, jar) {
    if (S.caught[jar.key]) return false;
    if (h.jars.some(function (j) { return j.id === jar.id; })) return false;
    if (h.jars.length >= TRIP_MAX) {
      var low = commonest(h.jars);
      if (!low || RU.rank(jar.id) <= RU.rank(low.id)) return false;
      h.jars.splice(h.jars.indexOf(low), 1);
      // the weather it replaced can be caught again where it was
      if (low.key && S.caught[low.key] === 2) delete S.caught[low.key];
      tripDiag().swapped += 1;
    }
    h.jars.push(jar);
    S.caught[jar.key] = 2;
    return true;
  }
  function driveSeal() {
    if (!S.drive || !R.cls || !R.area || !S.haul || flying()) return;
    var h = S.haul;
    if (!h.from) { h.from = R.area.id; save(); }
    if (R.area.id === h.from) return;
    var dg = tripDiag();
    if (!dg.left) { dg.left = true; save(); }
    if (!driving()) return;
    if (!R.wx || R.wx.areaId !== R.area.id) return;
    var a = R.area, place = placeFor(a.id), t = now();
    var w = snapshot(a.id, 'trip');
    var prev = (S.recent[a.id] || []).slice();
    var changed = false, sealedHere = [];
    R.cls.ids.forEach(function (id) {
      if (sealOne(h, { id: id, place: place, t: t, w: w, key: wKey(a.id, id) })) { changed = true; sealedHere.push(id); }
    });
    RU.changesFor(prev, R.cls.ids, R.reading ? R.reading.temp : 10, t).forEach(function (cid) {
      if (sealOne(h, { id: cid, place: place, t: t, w: w, key: wKey(a.id, cid) })) changed = true;
    });
    R.wonders.forEach(function (sw) {
      if (sealOne(h, { id: sw.id, place: place, t: t, w: w, key: sw.key })) changed = true;
    });
    if (sealedHere.length) {
      prev = prev.filter(function (p) { return t - p.t <= 3 * HOUR; });
      sealedHere.forEach(function (id) { prev.push({ id: id, t: t }); });
      S.recent[a.id] = prev.slice(-8);
    }
    if (changed) { save(); renderDrive(); }
  }
  function driveMoving() { return R.moving && now() - R.speedAt < 60000; }
  function tripName(j) { return j.id === 'namedstorm' && j.w && RU.okStormName(j.w.storm) ? 'Storm ' + j.w.storm : T(j.id).name; }
  function renderDrive() {
    var hidden = !S.drive;
    $('drive').hidden = hidden;
    if (hidden) return;
    var moving = driveMoving();
    var end = $('drive-end');
    end.disabled = moving;
    end.textContent = moving ? 'Stop to end your trip' : 'End trip';
    $('drive-note').textContent = R.wakeHow === 'lock' ? 'The screen will stay on while Drive mode is on.' :
      R.wakeHow === 'video' ? 'Keep the app open on screen. If the screen turns off, the trip stops following you.' :
      R.wakeOk === false ? 'Keep the screen switched on so the app can follow your journey.' : '';
    var st = $('drive-status');
    if (!st) return;
    var h = S.haul || { jars: [] }, n = h.jars.length;
    var sealed = n ? n + ' of ' + TRIP_MAX + ' jars sealed: ' + h.jars.slice().sort(function (a, b) { return RU.rank(b.id) - RU.rank(a.id); }).map(tripName).join(', ') + '.' : 'No jars sealed yet.';
    var how;
    if (!R.pos) how = 'Waiting for your location…';
    else if (!h.from || (R.area && R.area.id === h.from)) how = 'Jars start once you’ve driven out of ' + (R.place && R.area && R.area.id === h.from ? R.place.short : 'the area you set off from') + '.';
    else if (!driving()) how = 'Jars are sealed while you’re driving, at about 15 mph or more.';
    else how = n >= TRIP_MAX ? 'The trip is full. Rarer weather can still swap in for the commonest jar.' : 'Sealing the weather as you go.';
    st.textContent = sealed + ' ' + how;
  }
  function endDrive() {
    if (driveMoving()) return;
    S.drive = false;
    addLog('Drive mode off');
    save();
    releaseWake();
    $('drive').hidden = true;
    startWatch();
    if (R.area) refreshWeather();
    openTrip();
  }
  /* trips from before 0.9.0 could seal the same weather many times: a trip now keeps each kind of weather once,
     and its 5 rarest kinds. The newest copy of each stays */
  function trimHaul(h) {
    var by = {};
    h.jars.forEach(function (j) { if (T(j.id) && (!by[j.id] || j.t >= by[j.id].t)) by[j.id] = j; });
    var keep = Object.keys(by).map(function (id) { return by[id]; }).sort(function (a, b) { return RU.rank(b.id) - RU.rank(a.id) || a.t - b.t; }).slice(0, TRIP_MAX);
    h.jars.forEach(function (j) { if (keep.indexOf(j) === -1 && j.key && S.caught[j.key] === 2) delete S.caught[j.key]; });
    h.jars = keep;
  }
  /* why a trip came back empty, from what it saw */
  function emptyTripWhy(h) {
    var dg = h && h.diag;
    if (!dg) return 'Drive mode seals the weather once you’ve driven out of the area you set off from.';
    if (!dg.fixes || dg.hidden > 2 * MIN || dg.gaps) return 'Your phone stopped sharing where you were during the trip, probably because the screen turned off or another app was opened. A website only gets your location while it’s open on screen, so next time keep the app open in a phone holder, ideally plugged in.';
    if (!dg.left) return 'You didn’t leave the area you set off from. Areas are about 5 km across, and jars are only sealed in the new ones you drive through.';
    if (!dg.fast) return 'Your phone never showed the car going at driving speed (about 15 mph or more), so nothing was sealed.';
    if (dg.wxFail) return 'The weather couldn’t load on the road, probably because there was no signal.';
    return 'Everything you drove through had already been caught today.';
  }
  function openTrip() {
    var h = S.haul;
    if (h) trimHaul(h);
    if (!h || !h.jars.length) {
      var why = emptyTripWhy(h);
      S.haul = null;
      save();
      render();
      showInfo({ label: 'Your trip', title: 'No jars on that trip', body: '<p>' + esc(why) + '</p>' });
      return;
    }
    var fresh = h.jars.filter(function (j) { return !(S.book[j.id] && S.book[j.id].n); }).length;
    var total = h.jars.length;
    var list = h.jars.slice().sort(function (a, b) { return RU.rank(b.id) - RU.rank(a.id); });
    showInfo({
      label: 'Your trip', title: total + ' sealed ' + plural(total, 'jar') + (fresh ? ', ' + fresh + ' new' : ''),
      body: '<ul class="trip-list">' + list.map(function (j) {
        var t = T(j.id);
        return '<li><span><span class="rc-' + t.r + '">' + esc(tripName(j)) + '</span></span><span class="small">' + esc(rlabel(j.id)) + (j.place ? ' · ' + esc(j.place) : '') + '</span></li>';
      }).join('') + '</ul><p class="muted">Each kind of weather goes in once a trip, up to ' + TRIP_MAX + ' jars. Trip jars earn half points, as there was no catching game.</p>',
      actions: [{ label: 'Open your jars', primary: true, fn: openHaul }]
    });
  }
  function openHaul() {
    var h = S.haul;
    if (!h) { closeSheet(); return; }
    trimHaul(h);
    var before = RU.levelFor(S.points);
    var total = 0;
    // each sealed jar opens as its own variant, with its own strength and points
    var list = h.jars.slice().sort(function (a, b) { return RU.rank(b.id) - RU.rank(a.id); }).map(function (j) {
      var e = bookEntry(j.id);
      var isNew = !e.n, b4 = e.n;
      e.n += 1;
      addPlace(e, j.place);
      if (!e.first) e.first = { t: j.t || h.start, place: j.place || '' };
      e.last = now();
      var rec = rollCatch(Object.assign({}, j.w || { t: j.t, how: 'trip', place: j.place }));
      rec.how = 'trip';
      var sg = rate(j.id, rec);
      if (j.id === 'namedstorm') addStorm(e, rec);
      record(e, rec);
      var newV = addVariant(e, rec) && !isNew;
      var newBest = sg ? bestUpdate(e, rec, sg) && !isNew : false;
      var again = caughtToday(j.id);
      var pts = catchPoints(j.id, sg, true, again);
      rec.pts = pts;
      countToday(j.id);
      total += pts;
      return {
        id: j.id, isNew: isNew, n: e.n, count: 1, pts: pts, place: j.place, trip: true, again: again,
        tier: RU.tierReached(b4, e.n), v: rec.v, seed: rec.seed, rec: rec, sg: sg, newV: newV, newBest: newBest,
        verify: 'Sealed on your trip' + (j.place ? ' in ' + j.place : '') + (j.t ? ' at ' + hm(j.t) : '') + ', matching the live weather there.'
      };
    });
    S.points += total;
    Object.keys(S.caught).forEach(function (k) { if (S.caught[k] === 2) S.caught[k] = 1; });
    addLog('Opened ' + list.length + ' ' + plural(list.length, 'jar') + ' from your trip (+' + total + ')');
    S.haul = null;
    afterAward(list, before);
  }
  /* ---------- fairer trips ----------
     Before 0.9.0 a trip sealed every kind of weather again in each new area it drove through, so one drive could bring
     23 jars. Trips already opened are recounted once, under the rules trips follow now: each kind of weather once, the
     5 rarest kinds, at half points. For each kind the trip keeps its rarest copy; the rest come off the shelf, with
     their points. Shelf rewards already earned stay. */
  function dropCatch(id, rec) {
    var e = S.book[id];
    if (!e) return;
    e.n -= 1;
    var x = e.vars && e.vars[rec.v || 'c'];
    if (x) { x.n -= 1; if (x.n <= 0) delete e.vars[rec.v || 'c']; }
    if (id === 'namedstorm' && e.storms && RU.okStormName(rec.storm) && e.storms[rec.storm]) {
      var sx = e.storms[rec.storm];
      sx.n -= 1;
      if (sx.n <= 0) delete e.storms[rec.storm];
      else if (sx.best && sx.best.t === rec.t && sx.best.seed === rec.seed) delete sx.best;
    }
    if (e.catches) e.catches = e.catches.filter(function (r) { return r !== rec; });
  }
  /* after catches come off a jar: an empty jar is empty again; otherwise its first and last catch, the catch on show
     for each variant and each storm, and its strongest, come from the catches it still has */
  function tidyJar(id) {
    var e = S.book[id];
    if (!e) return;
    if (e.n <= 0) { delete S.book[id]; return; }
    var left = e.catches || [];
    if (left.length) { e.first = { t: left[0].t, place: left[0].place || '' }; e.last = left[left.length - 1].t; }
    Object.keys(e.vars || {}).forEach(function (v) {
      var mine = left.filter(function (r) { return (r.v || 'c') === v; });
      if (mine.length) { var m = mine[mine.length - 1]; e.vars[v].seed = m.seed; e.vars[v].t = m.t; e.vars[v].place = m.place || ''; }
    });
    if (e.storms) Object.keys(e.storms).forEach(function (nm) {
      var sx = e.storms[nm], mine = left.filter(function (r) { return r.storm === nm; });
      if (mine.length) { sx.t = mine[0].t; sx.place = mine[0].place || sx.place; }
      if (!sx.best) mine.forEach(function (r) { if (!sx.best || catchRank(r) >= catchRank(sx.best)) sx.best = Object.assign({}, r); });
    });
    if (e.best) {
      e.best = null;
      left.forEach(function (r) { var sg = RU.strength(id, r); if (sg) bestUpdate(e, r, sg); });
      if (!e.best) delete e.best;
    }
  }
  function recountTrips() {
    if (S.tripFix) return null;
    S.tripFix = 1;
    var recs = [];
    Object.keys(S.book).forEach(function (id) {
      (S.book[id].catches || []).forEach(function (rec) { if (rec && rec.how === 'trip' && typeof rec.t === 'number' && isFinite(rec.t)) recs.push({ id: id, rec: rec }); });
    });
    if (!recs.length) return null;
    recs.sort(function (a, b) { return a.rec.t - b.rec.t; });
    // seals more than an hour apart were on different trips
    var trips = [], cur = null;
    recs.forEach(function (x) {
      if (!cur || x.rec.t - cur.last > HOUR) { cur = { list: [], first: x.rec.t, last: x.rec.t }; trips.push(cur); }
      cur.list.push(x);
      cur.last = x.rec.t;
    });
    var before = RU.levelFor(S.points), out = [], lost = 0, removed = 0, touched = {};
    trips.forEach(function (tr) {
      var by = {};
      tr.list.forEach(function (x) {
        var b = by[x.id], rv = RU.variantRank(x.rec.v || 'c'), bv = b ? RU.variantRank(b.rec.v || 'c') : -1;
        if (!b || rv > bv || (rv === bv && (x.rec.stars || 0) > (b.rec.stars || 0))) by[x.id] = x;
      });
      var kinds = Object.keys(by).sort(function (a, b) { return RU.rank(b) - RU.rank(a) || RU.variantRank(by[b].rec.v || 'c') - RU.variantRank(by[a].rec.v || 'c'); });
      var keep = kinds.slice(0, TRIP_MAX).map(function (id) { return by[id]; });
      var pts = 0, gone = [];
      tr.list.forEach(function (x) {
        var was = earned(x.id, x.rec);
        if (keep.indexOf(x) !== -1) {
          var half = catchPoints(x.id, x.rec.stars ? { stars: x.rec.stars } : null, true, false);
          pts += was - half;
          x.rec.pts = half;
        } else { pts += was; gone.push(x); }
      });
      gone.forEach(function (x) { dropCatch(x.id, x.rec); touched[x.id] = 1; });
      pts = Math.max(0, pts);
      S.points = Math.max(0, S.points - pts);
      lost += pts;
      removed += gone.length;
      if (gone.length || pts) out.push({ t: tr.first, kept: keep.map(function (x) { return recName(x.id, x.rec); }), removed: gone.length, pts: pts });
    });
    Object.keys(touched).forEach(tidyJar);
    if (!out.length) return null;
    addLog('Trips recounted: ' + removed + ' extra ' + plural(removed, 'jar') + ' taken back (−' + lost + ')');
    return { trips: out, before: before, after: RU.levelFor(S.points), removed: removed, pts: lost };
  }
  function showTripNote() {
    var n = S.tripNote;
    if (!n || !Array.isArray(n.trips) || !n.trips.length) { S.tripNote = null; return; }
    S.tripNote = null;
    save();
    showInfo({
      label: 'Drive mode', title: 'Your trips have been recounted',
      body: '<p>Drive mode is fairer now. A trip keeps each kind of weather once, up to ' + TRIP_MAX + ' jars, and trip jars earn half points. Your trips so far have been recounted the same way.</p>' +
        n.trips.map(function (tr) {
          var day = new Date(tr.t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
          return '<p><strong>' + esc(day) + ' trip:</strong> kept ' + esc(listText(tr.kept)) + '.' +
            (tr.removed ? ' ' + tr.removed + ' extra ' + plural(tr.removed, 'jar') + ' came off' + (tr.pts ? ', with ' + tr.pts.toLocaleString('en-GB') + ' points' : '') + '.' : tr.pts ? ' ' + tr.pts.toLocaleString('en-GB') + ' points came off.' : '') + '</p>';
        }).join('') +
        '<p>' + (n.after < n.before ? 'You’re Level ' + n.after + ' now (you were Level ' + n.before + ').' : 'You’re still Level ' + n.after + '.') + ' Shelf looks you’ve already earned stay yours.</p>',
      actions: [{ label: 'OK', primary: true, fn: function () { closeSheet(); setTimeout(checkPendingRewards, 300); } }]
    });
  }
  /* keeping the screen on: the Wake Lock where the phone has one, otherwise a tiny silent video playing on a loop,
     which stops most phones going to sleep */
  var AWAKE = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAMzbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAD6AAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAl10cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAD6AAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAACAAAAAgAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAA+gAAAAAAABAAAAAAHVbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABAAAABAABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABgG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAUBzdGJsAAAAuHN0c2QAAAAAAAAAAQAAAKhhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAACAAIABIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAALmF2Y0MBQsAe/+EAFmdCwB7aJbARAAADAAEAAAMAAg8WLqABAAVozgGXIAAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAAAAVYAAAFWAAAABhzdHRzAAAAAAAAAAEAAAAEAABAAAAAABRzdHNzAAAAAAAAAAEAAAABAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAAEAAAAAQAAACRzdHN6AAAAAAAAAAAAAAAEAAACiwAAAAsAAAALAAAACwAAABRzdGNvAAAAAAAAAAEAAANjAAAAYnVkdGEAAABabWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAtaWxzdAAAACWpdG9vAAAAHWRhdGEAAAABAAAAAExhdmY2MC4xNi4xMDAAAAAIZnJlZQAAArRtZGF0AAACcQYF//9t3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCAzMWUxOWY5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTAgcmVmPTEgZGVibG9jaz0xOi0zOi0zIGFuYWx5c2U9MHgxOjB4MTExIG1lPWhleCBzdWJtZT0yIHBzeT0xIHBzeV9yZD0yLjAwOjAuNzAgbWl4ZWRfcmVmPTAgbWVfcmFuZ2U9MTYgY2hyb21hX21lPTEgdHJlbGxpcz0wIDh4OGRjdD0wIGNxbT0wIGRlYWR6b25lPTIxLDExIGZhc3RfcHNraXA9MSBjaHJvbWFfcXBfb2Zmc2V0PTAgdGhyZWFkcz0xIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MCB3ZWlnaHRwPTAga2V5aW50PTI1MCBrZXlpbnRfbWluPTEgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD0xMCByYz1jcmYgbWJ0cmVlPTEgY3JmPTUxLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjIwAIAAAAASZYiEBrOf//8PRQABAx8mq1XgAAAAB0GaIBrOcsAAAAAHQZpAGc5ywAAAAAdBmmAYznLA';
  function awakeVideo(on) {
    var v = R.awakeVid;
    if (!on) { if (v) try { v.pause(); } catch (e) {} return; }
    if (!v) {
      v = R.awakeVid = document.createElement('video');
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
      v.setAttribute('aria-hidden', 'true');
      v.muted = true;
      v.loop = true;
      v.src = AWAKE;
      v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none';
      document.body.appendChild(v);
    }
    try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    R.wakeHow = 'video';
  }
  function requestWake() {
    if (!('wakeLock' in navigator)) { R.wakeOk = false; awakeVideo(true); renderDrive(); return; }
    navigator.wakeLock.request('screen').then(function (l) {
      R.wake = l;
      R.wakeOk = true;
      R.wakeHow = 'lock';
      awakeVideo(false);
      l.addEventListener('release', function () { R.wake = null; });
      renderDrive();
    }).catch(function () { R.wakeOk = false; awakeVideo(true); renderDrive(); });
  }
  function releaseWake() {
    if (R.wake) { try { R.wake.release(); } catch (e) {} }
    R.wake = null;
    R.wakeHow = null;
    awakeVideo(false);
  }

  /* ---------- backup ---------- */

  function backupCode() {
    var copy = JSON.parse(JSON.stringify(S));
    copy.drive = false;
    // pets' prints are only for telling pets apart on this phone, and would make the code very long
    if (copy.animals && copy.animals.book) Object.keys(copy.animals.book).forEach(function (id) { delete copy.animals.book[id].prints; });
    return 'FRZFRM1:' + btoa(unescape(encodeURIComponent(JSON.stringify(copy))));
  }
  function openBackup() {
    var code = backupCode();
    showInfo({
      label: 'Back up', title: 'Your backup code',
      body: '<p class="muted">Copy this and keep it somewhere safe, like a note or an email to yourself.</p><label class="muted" for="backup-text">Backup code</label><textarea id="backup-text" readonly>' + esc(code) + '</textarea>',
      actions: [{ label: 'Close', fn: closeSheet }, { label: 'Copy', primary: true, fn: function () { copyText(code, $('backup-text')); } }]
    });
  }
  function copyText(text, ta) {
    function fallback() { if (ta) { ta.focus(); ta.select(); } toast('Select the code and copy it.'); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast('Backup code copied.'); }, fallback);
    else fallback();
  }
  function openRestore() {
    showInfo({
      label: 'Restore', title: 'Paste a backup code',
      body: '<p class="muted">This replaces the jars on this phone with the ones in the code.</p><label class="muted" for="restore-text">Backup code</label><textarea id="restore-text" autocomplete="off" spellcheck="false"></textarea><p class="muted" id="restore-msg" role="status"></p>',
      actions: [{ label: 'Cancel', fn: closeSheet }, { label: 'Restore', primary: true, fn: doRestore }]
    });
  }
  function doRestore() {
    var raw = ($('restore-text').value || '').replace(/\s+/g, '');
    var o = null;
    try {
      if (raw.indexOf('FRZFRM1:') === 0) o = cleanState(JSON.parse(decodeURIComponent(escape(atob(raw.slice(8))))));
    } catch (e) { o = null; }
    if (!o) { $('restore-msg').textContent = 'That code doesn’t look right. Check you copied all of it.'; return; }
    o.drive = false;
    o.onboarded = true;
    S = o;
    openOldJars();
    var tn = recountTrips();
    save();
    closeSheet();
    if (tn) { S.tripNote = tn; save(); whenFree(showTripNote); }
    if (R.area) evaluate();
    render();
    if (R.tab === 'shelf') renderShelf();
    if (R.tab === 'animals') renderAnimals();
    toast('Jars restored.');
    setTimeout(checkPendingRewards, 500);
  }

  /* ---------- toast ---------- */

  var toastTimer = 0;
  function toast(text) {
    var el = $('toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 4200);
  }

  /* ---------- animation ---------- */

  var reduce = false;
  try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
  var rafId = 0, lastTs = 0, lastShelf = 0, lastPrev = 0;
  function frame(ts) {
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;
    var t = reduce ? 2 : ts / 1000;
    if (R.tab === 'catch' && !S.drive) {
      if (!S.onboarded) {
        var oc = $('onboard-canvas'), os = SKY.fit(oc);
        if (os) SKY.paint(oc.getContext('2d'), os.W, os.H, 'sunnyspells', t, false);
      } else if (!$('live').hidden) {
        var sc = $('sky-canvas'), ss = SKY.fit(sc);
        if (ss) SKY.paint(sc.getContext('2d'), ss.W, ss.H, skyScene(), t, R.reading ? !R.reading.isDay : false);
      }
    }
    if (!$('overlay').hidden) {
      if (R.game) {
        var G = R.game;
        G.g.tick(dt);
        G.g.draw($('g-canvas'), ts / 1000);
        $('g-fill').style.width = Math.round(Math.min(1, G.g.prog) * 100) + '%';
        var st = G.g.status();
        if ($('g-status').textContent !== st) $('g-status').textContent = st;
        if (G.g.state === 'won') {
          if (G.g.wonT === undefined || G.g.wonT < 0.05) { showGameMsg('Caught!'); setActions('g-actions', []); if (!G.sfxWon) { G.sfxWon = 1; sfx('catch'); } }
          if (G.g.wonT > 0.9) finishCatch();
        } else if (G.g.state === 'missed' && !G.missHandled) handleMiss();
      } else if (R.cardState && R.view === 'card') {
        drawJarOn($('c-canvas'), R.cardState, t, glassLook());
      }
      // the little jars on a card move a little less often, to spare the phone
      if (R.previewJars && R.view !== 'game' && (ts - lastPrev > 90 || ts < lastPrev)) { lastPrev = ts; drawPreview(t); }
    }
    if (R.tab === 'shelf' && !reduce && ts - lastShelf > 110) {
      lastShelf = ts;
      drawShelf(t, false);
    }
    if (R.tab === 'animals' && !reduce && ts - lastShelf > 110) {
      lastShelf = ts;
      drawAnimals(t, false);
    }
    rafId = requestAnimationFrame(frame);
  }
  function kick() {
    if (!rafId && !document.hidden) { lastTs = 0; rafId = requestAnimationFrame(frame); }
  }
  /* the scene for the live sky: the headline weather, or a clear or cloudy night when nothing's catchable */
  function skyScene() {
    if (flying()) {
      var fs = flightSun();
      return fs && fs.now ? 'cloudsunset' : fs && fs.el > -6 ? 'flying' : 'flyingnight';
    }
    if (!R.cls) return 'overcast';
    if (R.cls.headline) return R.cls.headline;
    if (R.reading && !R.reading.isDay) return typeof R.reading.cloud === 'number' && R.reading.cloud < 30 ? 'starry' : 'quiet';
    return 'sunnyspells';
  }

  /* ---------- wiring ---------- */

  function bind() {
    $('start-btn').addEventListener('click', function () {
      S.onboarded = true;
      save();
      locate();
      render();
    });
    $('problem-btn').addEventListener('click', function () {
      if (R.problem === 'weather' && R.area) { R.problem = null; refreshWeather(true); render(); }
      else locate();
    });
    $('refresh-btn').addEventListener('click', function () { refreshWeather(true); });
    $('catch-btn').addEventListener('click', function () {
      if (R.target) beginCatch(R.target.id, 'weather', R.target.key);
    });
    $('also').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-catch]') : null;
      if (!b || !R.area) return;
      var id = b.getAttribute('data-catch');
      beginCatch(id, 'weather', wKey(R.area.id, id));
    });
    $('wonders').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-wonder]') : null;
      if (!b) return;
      var w = R.wonders.filter(function (x) { return x.id === b.getAttribute('data-wonder'); })[0];
      if (w) beginCatch(w.id, 'wonder', w.key);
    });
    $('spot-btn').addEventListener('click', function () { if (flying()) toast('You’re flying! The weather on the ground can’t be caught from up here.'); else openSpot(); });
    if ($('fc-btn')) $('fc-btn').addEventListener('click', openFlightCatch);
    $('i-body').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-photo]') : null;
      if (b) { takePhoto(b.getAttribute('data-photo')); return; }
      var del = ev.target.closest ? ev.target.closest('[data-delphoto]') : null;
      if (del) { confirmDeletePhoto(del.getAttribute('data-delphoto')); return; }
      var sn = ev.target.closest ? ev.target.closest('[data-seen]') : null;
      if (sn && !sn.disabled && R.area) { beginCatch(sn.getAttribute('data-seen'), 'spotted', wKey(R.area.id, sn.getAttribute('data-seen'))); return; }
      var s = ev.target.closest ? ev.target.closest('[data-style]') : null;
      if (s && !s.disabled) setStyle(s.getAttribute('data-style'));
    });
    if ($('style-btn')) $('style-btn').addEventListener('click', openStyle);
    if ($('c-vars')) $('c-vars').addEventListener('click', function (ev) {
      var hb = ev.target.closest ? ev.target.closest('button[data-home]') : null;
      if (hb && !hb.disabled) { pickHome(hb.getAttribute('data-home')); return; }
      var b = ev.target.closest ? ev.target.closest('button[data-var]') : null;
      if (b && !b.disabled) pickVariant(b.getAttribute('data-var'));
    });
    $('photo-input').addEventListener('change', function () { closeSheet(); onPhoto(); });
    if ($('photos-btn')) $('photos-btn').addEventListener('click', function () { openPhotos(); });
    if ($('c-photo-btn')) $('c-photo-btn').addEventListener('click', function () { if (R.photoJar) openPhotos(R.photoJar); });
    if ($('c-undo-btn')) $('c-undo-btn').addEventListener('click', function () { if (R.undo) askTakeBack(R.undo.id, R.undo.reveal); });
    $('drive-btn').addEventListener('click', openDriveIntro);
    $('lock-drive').addEventListener('click', openDriveIntro);
    $('lock-passenger').addEventListener('click', function () { S.passengerUntil = now() + 3 * HOUR; save(); render(); toast('Passenger mode is on for the next 3 hours.'); });
    $('pass-off').addEventListener('click', function () { S.passengerUntil = 0; save(); render(); });
    $('drive-end').addEventListener('click', endDrive);
    $('lvl').addEventListener('click', openLevels);
    $('nav-catch').addEventListener('click', function () { selectTab('catch'); });
    $('nav-shelf').addEventListener('click', function () { selectTab('shelf'); });
    if ($('nav-animals')) $('nav-animals').addEventListener('click', function () { selectTab('animals'); });
    $('nav-more').addEventListener('click', function () { selectTab('more'); });
    if ($('lv-tile')) $('lv-tile').addEventListener('click', openLevels);
    if ($('rw-tile')) $('rw-tile').addEventListener('click', openStyle);
    if ($('case-jar')) $('case-jar').addEventListener('click', function () { if (R.caseBest) openDetail(R.caseBest.id, R.caseBest.storm); });
    if ($('row-chips')) $('row-chips').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-jump]') : null;
      var to = b && $(b.getAttribute('data-jump'));
      if (to) try { to.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); } catch (e) { to.scrollIntoView(); }
    });
    if ($('scan-btn')) $('scan-btn').addEventListener('click', openScan);
    if ($('seek-btn')) $('seek-btn').addEventListener('click', openSeek);
    if ($('s-zoom')) zoomPinch();
    if (WC.sfx) WC.sfx.setOn(S.sound !== false);
    if ($('sound-btn')) $('sound-btn').addEventListener('click', toggleSound);
    if ($('hop-btn')) { $('hop-btn').addEventListener('click', openHop); $('hop-x').addEventListener('click', closeHop); hopInput(); }
    if ($('k-stage')) $('k-stage').addEventListener('pointerdown', seekTap);
    if ($('an-shelves')) $('an-shelves').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-animal]') : null;
      if (b) openAnimal(b.getAttribute('data-animal'));
    });
    if ($('an-chips')) $('an-chips').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-jump]') : null;
      var to = b && $(b.getAttribute('data-jump'));
      if (to) try { to.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); } catch (e) { to.scrollIntoView(); }
    });
    $('shelves').addEventListener('click', function (ev) {
      var row = ev.target.closest ? ev.target.closest('[data-row]') : null;
      if (row) { openRowInfo(row.getAttribute('data-row')); return; }
      var b = ev.target.closest ? ev.target.closest('[data-jar]') : null;
      if (b) openDetail(b.getAttribute('data-jar'), b.getAttribute('data-storm'));
    });
    var stage = $('g-stage');
    function gx(e) { var r = stage.getBoundingClientRect(); return r.width ? (e.clientX - r.left) / r.width : 0.5; }
    stage.addEventListener('pointerdown', function (e) {
      if (!R.game || R.game.g.state !== 'play') return;
      e.preventDefault();
      try { stage.setPointerCapture(e.pointerId); } catch (x) {}
      R.game.g.pointer('down', gx(e));
    });
    stage.addEventListener('pointermove', function (e) { if (R.game) R.game.g.pointer('move', gx(e)); });
    stage.addEventListener('pointerup', function (e) { if (R.game) R.game.g.pointer('up', gx(e)); });
    stage.addEventListener('pointercancel', function (e) { if (R.game) R.game.g.pointer('up', gx(e)); });
    stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    stage.addEventListener('keydown', function (e) { if (R.game && R.game.g.key('down', e.key, e.repeat)) e.preventDefault(); });
    stage.addEventListener('keyup', function (e) { if (R.game && R.game.g.key('up', e.key, false)) e.preventDefault(); });
    $('overlay').addEventListener('click', function (ev) { if (ev.target === $('overlay') && !(R.game && R.game.g.state === 'won')) closeSheet(); });
    if ($('sheet-x')) $('sheet-x').addEventListener('click', function () { if (seekBusy()) { seekLeaveAsk(); return; } if (!(R.game && R.game.g.state === 'won')) closeSheet(); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !$('overlay').hidden && !(R.game && R.game.g.state === 'won')) closeSheet();
      else if ((ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && !$('overlay').hidden && canSwipe()) { ev.preventDefault(); stepVariant(ev.key === 'ArrowRight' ? 1 : -1); }
    });
    // the big jar on a card: swipe it sideways to go through the variants, or tap it to skip the reveal
    var cjar = $('c-jar'), ccv = $('c-canvas'), swipe = null;
    if (cjar && $('c-prev')) bindSwipe();
    function bindSwipe() {
    $('c-prev').addEventListener('click', function () { stepVariant(-1); });
    $('c-next').addEventListener('click', function () { stepVariant(1); });
    cjar.addEventListener('pointerdown', function (ev) {
      if (ev.target.closest && ev.target.closest('.jar-nav')) return;
      if (R.spin) { R.spin.finish(); return; }
      if (!canSwipe()) return;
      swipe = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
      try { cjar.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    cjar.addEventListener('pointermove', function (ev) {
      if (!swipe || ev.pointerId !== swipe.id) return;
      var dx = ev.clientX - swipe.x;
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(ev.clientY - swipe.y)) { ccv.classList.add('drag'); ccv.style.transform = 'translateX(' + Math.round(dx * 0.55) + 'px)'; }
    });
    var endSwipe = function (ev, cancelled) {
      if (!swipe || ev.pointerId !== swipe.id) return;
      var dx = ev.clientX - swipe.x, dy = ev.clientY - swipe.y;
      swipe = null;
      ccv.classList.remove('drag');
      if (!cancelled && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) stepVariant(dx < 0 ? 1 : -1);
      else ccv.style.transform = '';
    };
    cjar.addEventListener('pointerup', function (ev) { endSwipe(ev, false); });
    cjar.addEventListener('pointercancel', function (ev) { endSwipe(ev, true); });
    } // an older page without the jar arrows, just after an update, simply has no swiping
    $('backup-btn').addEventListener('click', openBackup);
    $('restore-btn').addEventListener('click', openRestore);
    $('reset-btn').addEventListener('click', function () {
      var jars = jarCount();
      showInfo({
        label: 'Warning', labelClass: 'rc-danger', title: 'Clear everything?',
        body: '<p><strong>This can’t be undone.</strong> Every jar' + (jars ? ' (' + jars + ' on your shelf)' : '') + ', animal, point, level, photo and shelf reward on this phone will be gone for good.</p>' +
          '<p class="muted">Want to keep them? Close this and tap Back up first, so you can restore them later.</p>',
        actions: [{ label: 'Keep my jars', primary: true, fn: closeSheet }, { label: 'Yes, clear everything', danger: true, fn: confirmClear }]
      });
    });
    function confirmClear() {
      showInfo({
        label: 'Last check', labelClass: 'rc-danger', title: 'Are you really sure?',
        body: '<p>Your whole shelf will be emptied now. There’s no way to get it back without a backup code.</p>',
        actions: [{ label: 'No, keep them', primary: true, fn: closeSheet }, { label: 'Clear it all', danger: true, fn: doClear }]
      });
    }
    function doClear() {
      closeSheet();
      var keepNames = S.names;
      S = freshState();
      S.onboarded = true;
      S.names = keepNames;
      save();
      clearPhotos();
      R.photos = {};
      if (R.area) evaluate();
      render();
      if (R.tab === 'shelf') renderShelf();
      if (R.tab === 'animals') renderAnimals();
      toast('Everything is cleared. Happy catching.');
    }
    $('install-btn').addEventListener('click', function () {
      var ev = R.installEvt;
      if (!ev) return;
      R.installEvt = null;
      ev.prompt();
      if (ev.userChoice) ev.userChoice.then(function () { renderMore(); });
      renderMore();
    });
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); R.installEvt = e; if (R.tab === 'more') renderMore(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
        rafId = 0;
        if (R.view === 'scan' && R.cam) { stopCamera(); setActions('s-actions', [{ label: 'Close', fn: closeSheet }, { label: 'Start the camera', primary: true, fn: startCamera }]); scanMsg('The camera stopped while the app was in the background.'); }
        if (!S.drive) stopWatch();
        R.hiddenAt = now();
      } else {
        // time spent off screen in Drive mode: the trip can't follow the car then
        if (S.drive && S.haul && R.hiddenAt) { tripDiag().hidden += Math.max(0, now() - R.hiddenAt); save(); }
        R.hiddenAt = 0;
        kick();
        checkForUpdate();
        if (S.onboarded && !R.problem) {
          if (R.watchId === null) startWatch();
          if (S.drive) requestWake();
          if (R.area && !flying() && (!R.wx || now() - R.wx.at > REFRESH)) refreshWeather();
          else if (R.wx) { evaluate(); render(); }
        }
      }
    });
    window.addEventListener('resize', function () { if (R.tab === 'shelf') requestAnimationFrame(function () { drawShelf(2, true); }); if (R.tab === 'animals') requestAnimationFrame(function () { drawAnimals(2, true); }); });
  }
  /* updates: when the app opens or comes back on screen, check whether a newer version is online and switch to it,
     so nobody has to close the app to get one. Once per version, and never mid-catch, on a card or in Drive mode. */
  var lastUpdateCheck = 0;
  function checkForUpdate(force) {
    if (!force && (TEST || Date.now() - lastUpdateCheck < 5 * MIN)) return;
    lastUpdateCheck = Date.now();
    if (!window.fetch) return;
    fetch('index.html', { cache: 'no-store' }).then(function (res) { return res.ok ? res.text() : ''; }).then(function (html) {
      var m = /data-v="([^"]+)"/.exec(html);
      if (!m || m[1] === VERSION || S.drive || R.game || !$('overlay').hidden || document.hidden) return;
      var tried = false;
      try { tried = sessionStorage.getItem('wc-update') === m[1]; sessionStorage.setItem('wc-update', m[1]); } catch (e) { tried = true; }
      if (!tried) location.reload();
    }).catch(function () {});
  }
  function tick() {
    if (R.speedAt && now() - R.speedAt > 3 * MIN) { R.fast = false; R.moving = false; }
    if (document.hidden) return;
    if (flying()) { render(); return; }
    if (R.area && !R.fetching && (!R.wx || now() - R.wx.at > REFRESH)) refreshWeather();
    else if (R.wx) evaluate();
    render();
  }

  function boot() {
    loadStorms();
    fetchStorms(true);
    openOldJars();
    var tn = recountTrips();
    if (tn) S.tripNote = tn;
    prune();
    save();
    bind();
    if (S.onboarded) locate();
    var trip = !!(S.haul && S.haul.jars && S.haul.jars.length);
    if (S.drive) { $('drive').hidden = false; requestWake(); }
    else if (trip) setTimeout(openTrip, 600);
    // old photos are checked before any rewards are given out, in case a catch that doesn't count is taken back
    if (S.onboarded) setTimeout(function () {
      if (S.tripNote) whenFree(showTripNote);
      if (S.photoNote) whenFree(showPhotoNote);
      var next = function () { if (!S.drive && !trip) checkPendingRewards(); };
      recheckPhotos().then(next, next);
    }, 900);
    render();
    kick();
    setInterval(tick, 15000);
    setTimeout(checkForUpdate, 4000);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    if ('serviceWorker' in navigator && !TEST && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  /* straight after an update a phone can briefly pair the old page with the new code: reload once to get both.
     The page says which version it is on its <html> tag. */
  if (document.documentElement.getAttribute('data-v') !== VERSION) {
    var tried = false;
    try { tried = sessionStorage.getItem('wc-reload') === VERSION; sessionStorage.setItem('wc-reload', VERSION); } catch (e) { tried = true; }
    if (!tried) { location.reload(); return; }
  }

  if (TEST) {
    window.WC_TEST = {
      state: function () { return S; },
      runtime: function () { return R; },
      win: function () { if (R.game) R.game.g.win(); },
      miss: function (text) { if (R.game) R.game.g.miss(text || 'Missed.'); },
      speed: function (mps) { noteSpeed(mps); noteSpeed(mps); render(); },
      pos: function (lat, lon, alt, mps) { onPos({ coords: { latitude: lat, longitude: lon, accuracy: 30, altitude: alt === undefined ? null : alt, altitudeAccuracy: alt === undefined ? null : 20, speed: mps === undefined ? null : mps }, timestamp: now() }); },
      refresh: function () { return refreshWeather(true); },
      evaluate: function () { evaluate(); render(); },
      pending: function () { checkPendingRewards(); },
      shelf: function () { renderShelf(); },
      variant: function (v) { R.forceV = v || null; },
      home: function (h) { R.forceH = h || null; },
      scanAs: function (res) { R.forceScan = res || null; },
      animal: function (id) { openAnimal(id); },
      jarState: function (id) { return jarState(id); },
      checkUpdate: function () { checkForUpdate(true); },
      fetchStorms: function () { return fetchStorms(true); },
      photo: function (id) { R.pendingSpot = id; },
      levels: function () { openLevels(); },
      flying: function () { return flying(); },
      recheck: function () { S.photoCheck = 0; return recheckPhotos(); }
    };
  }

  boot();
})();
