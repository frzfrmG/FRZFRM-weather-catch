/* FRZFRM Weather Catch: the app.
   Finds your area, gets the live weather, works out what you can catch, runs the catching games,
   and keeps your shelf, points, levels and Drive mode trips. Everything is saved on the phone. */
(function () {
  'use strict';
  var WC = window.WC;
  var RU = WC.rules, SKY = WC.sky;
  var VERSION = '0.1.0';
  var TEST = /[?&]test=1(&|$)/.test(location.search);
  var KEY = 'frzfrm-wc-state-1';
  var WX_KEY = 'frzfrm-wc-weather-1';
  var MIN = 60000, HOUR = 3600000;
  var FRESH = 20 * MIN;    // weather older than this is checked again before a catch
  var REFRESH = 10 * MIN;  // how often to check the weather while the app is open
  var COOLDOWN = 10 * MIN; // how long weather stays away after it slips away
  var FAST = 6.7;          // metres per second, about 15 mph
  var CUR = 'temperature_2m,relative_humidity_2m,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,cloud_cover_low,cloud_cover_high,wind_speed_10m,wind_gusts_10m,visibility';
  var HRLY = 'temperature_2m,relative_humidity_2m,is_day,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m,visibility';

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
    return { v: 1, created: Date.now(), points: 0, book: {}, caught: {}, cool: {}, recent: {}, names: {}, log: [], haul: null, drive: false, passengerUntil: 0, onboarded: false };
  }
  function cleanState(o) {
    if (!o || o.v !== 1 || typeof o.points !== 'number' || !isFinite(o.points) || !o.book || typeof o.book !== 'object') return null;
    var f = freshState();
    Object.keys(f).forEach(function (k) { if (!(k in o)) o[k] = f[k]; });
    ['caught', 'cool', 'recent', 'names'].forEach(function (k) { if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {}; });
    if (!Array.isArray(o.log)) o.log = [];
    Object.keys(o.book).forEach(function (id) {
      var e = o.book[id];
      if (!T(id) || !e || typeof e.n !== 'number') { delete o.book[id]; return; }
      if (!Array.isArray(e.places)) e.places = [];
    });
    if (o.haul && !Array.isArray(o.haul.jars)) o.haul = null;
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
    pos: null, speeds: [], fast: false, moving: false, speedAt: 0, lastFix: 0,
    area: null, place: null, wx: null, wxError: null, fetching: null,
    reading: null, ctx: null, cls: null, wonders: [], spots: [], near: {}, coming: [], warning: null,
    watchId: null, game: null, view: null, queue: [], cardState: null, lastFocus: null,
    installEvt: null, wake: null, wakeOk: null, photos: {}, pendingSpot: null, shelfJars: [], visibleJars: {}
  };

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
    R.speeds.push(sp);
    if (R.speeds.length > 3) R.speeds.shift();
    var fast = R.speeds.filter(function (s) { return s >= FAST; }).length;
    var slow = R.speeds.filter(function (s) { return s < 3; }).length;
    if (fast >= 2) R.fast = true;
    else if (slow >= 2) R.fast = false;
    R.moving = sp >= 2.5;
    R.speedAt = now();
  }
  function onPos(p) {
    var c = p.coords;
    var t = p.timestamp || now();
    var pos = { lat: c.latitude, lon: c.longitude, acc: c.accuracy || 9999, t: t };
    var sp = typeof c.speed === 'number' && isFinite(c.speed) && c.speed >= 0 ? c.speed : null;
    var prev = R.pos;
    if (sp === null && prev && pos.acc <= 150 && prev.acc <= 150 && t - prev.t >= 8000) sp = distM(prev, pos) / ((t - prev.t) / 1000);
    if (sp !== null) noteSpeed(sp);
    R.pos = pos;
    R.lastFix = now();
    R.locating = false;
    R.problem = null;
    var a = RU.areaOf(pos.lat, pos.lon);
    if (!R.area || a.id !== R.area.id) enterArea(a);
    else if (!R.wx || now() - R.wx.at > REFRESH) refreshWeather();
    render();
  }

  function enterArea(a) {
    var first = !R.area;
    R.area = a;
    R.place = S.names[a.id] || null;
    R.cls = null; R.wonders = []; R.spots = []; R.coming = []; R.warning = null; R.reading = null;
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
        if (S.drive) driveSeal();
      }
    }).catch(function (e) {
      R.wxError = e;
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
    var near = { rain: false, showers: false, fog: false, thunder: false, lowerFog: false };
    var sea = false;
    (wx.cells || []).forEach(function (c) {
      var l = c.loc;
      if (!l) return;
      var code = l.cur.code;
      var fogLike = code === 45 || code === 48 || (typeof l.cur.vis === 'number' && l.cur.vis < 1000);
      if (RU.isRainCode(code)) near.rain = true;
      if (RU.CODES.showers.indexOf(code) !== -1 || RU.CODES.violent.indexOf(code) !== -1) near.showers = true;
      if (fogLike) near.fog = true;
      if (RU.CODES.thunder.indexOf(code) !== -1) near.thunder = true;
      if (fogLike && typeof l.elevation === 'number' && l.elevation <= elev - 100) near.lowerFog = true;
      if (typeof l.elevation === 'number' && l.elevation <= 0.5) sea = true;
    });
    var ctx = { lat: a.lat, lon: a.lon, elevation: elev, coastal: sea && elev < 60, thunderNearby: near.thunder, sunrise: d && d.sunrise, sunset: d && d.sunset };
    R.reading = o;
    R.ctx = ctx;
    R.near = near;
    R.cls = RU.classify(o, ctx);
    R.wonders = RU.wonders(o, ctx);
    R.spots = RU.spots(o, { lat: ctx.lat, lon: ctx.lon, elevation: elev, near: near });
    R.coming = timeline(here, ctx);
    R.warning = warningFrom(R.coming);
  }
  function classifyCell(c, hereCtx) {
    if (!c || !c.loc) return null;
    var o = {};
    Object.keys(c.loc.cur).forEach(function (k) { o[k] = c.loc.cur[k]; });
    o.t = now();
    return RU.classify(o, { lat: c.lat, elevation: num(c.loc.elevation), sunrise: hereCtx.sunrise, sunset: hereCtx.sunset });
  }
  function timeline(here, ctx) {
    if (!here.hourly) return [];
    var t0 = now();
    var segs = [];
    here.hourly.forEach(function (h) {
      if (h.t + HOUR <= t0 || h.t > t0 + 48 * HOUR) return;
      var d = dayFor(here.daily, h.t);
      var c = RU.classify(h, { lat: ctx.lat, elevation: ctx.elevation, coastal: ctx.coastal, sunrise: d && d.sunrise, sunset: d && d.sunset });
      var id = c.headline || 'quiet';
      var last = segs[segs.length - 1];
      if (last && last.id === id) last.to = h.t + HOUR;
      else segs.push({ id: id, from: Math.max(h.t, t0), to: h.t + HOUR });
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
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"></path>'
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
    else renderMore();
    if (S.drive) renderDrive();
  }
  function jarCount() {
    var n = 0;
    Object.keys(S.book).forEach(function (id) { if (S.book[id].n > 0) n += 1; });
    return n;
  }
  function renderTop() {
    var L = RU.levelFor(S.points);
    $('lvl').textContent = 'Lv ' + L;
    $('lvl').setAttribute('aria-label', 'Level ' + L + ', ' + S.points + ' points. Open your shelf');
    $('nav-n').textContent = jarCount() + '/' + RU.ORDERED.length;
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
    var problem = !onboard && R.problem && !(R.problem !== 'weather' && R.area) ? R.problem : null;
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
      warn.textContent = 'Heads up: ' + T(R.warning.id).name + ' is forecast here from ' + hm(R.warning.from) + '. Be ready to catch it.';
    } else warn.hidden = true;
  }
  function renderSky() {
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
      $('cond-name').textContent = T(head).name;
      pill.hidden = false;
      pill.setAttribute('data-r', T(head).r);
      $('cond-rarity').textContent = rlabel(head) + ' · ' + RU.points(head) + ' pts';
    }
    var up = $('updated');
    if (R.fetching && !R.wx) up.textContent = 'Checking the weather…';
    else if (R.wx) up.textContent = (R.fetching ? 'Updating… ' : '') + 'Weather from ' + hm(R.wx.at) + (stale() ? ' · out of date' : '');
    else up.textContent = 'Waiting for your location…';
    $('refresh-btn').disabled = !!R.fetching || !R.area;
  }
  function renderCatchBox() {
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
      hint.innerHTML = R.reading && !R.reading.isDay ? 'A quiet night. Look for Sky Wonders below, or come back when the weather changes.' : 'Nothing to catch here right now. Come back when the weather changes.';
      return;
    }
    if (!target) {
      var cooling = list.filter(function (c) { return c.cool; })[0];
      btn.disabled = true;
      if (cooling) {
        btn.textContent = T(cooling.id).name + ' slipped away';
        hint.innerHTML = 'Try again in ' + minutes(cooling.cool) + ' if it’s still here.';
      } else {
        btn.textContent = 'All caught here today';
        hint.innerHTML = 'You’ve caught everything in this area today. Wait for the weather to change, or move to a new area.';
      }
      return;
    }
    var t = T(target.id);
    btn.disabled = false;
    btn.textContent = 'Catch ' + t.name;
    var e = S.book[target.id];
    var html;
    if (stale()) html = 'The weather here is from ' + hm(R.wx.at) + '. Tap Catch and the app will check it first.';
    else if (!e || !e.n) html = '<strong>New jar!</strong> You haven’t caught ' + esc(t.name) + ' before.';
    else if (e.places.indexOf(placeFor(R.area.id)) === -1) html = 'On your shelf ×' + e.n + '. Catching it here adds <strong>a new place</strong>.';
    else html = 'On your shelf ×' + e.n + '. Catching it again earns <strong>' + RU.points(target.id) + ' points</strong>.';
    var ch = pendingChanges();
    if (ch.length) html += ' The weather has turned, so you’ll also get <strong>' + esc(T(ch[0]).name) + '</strong>.';
    hint.innerHTML = html;
  }
  function renderAlso() {
    var list = catchables().filter(function (c) { return !R.target || c.id !== R.target.id; });
    var block = $('also-block');
    if (!list.length || blockedByMoving()) { block.hidden = true; return; }
    block.hidden = false;
    $('also-title').textContent = R.target ? 'Also here right now' : 'Here right now';
    $('also').innerHTML = list.map(function (c) {
      var t = T(c.id);
      var state = c.caught ? 'Caught' : c.cool ? 'Back in ' + minutes(c.cool) : RU.points(c.id) + ' pts';
      var done = c.caught || c.cool;
      return '<button type="button" class="chip' + (done ? ' done' : '') + '" data-catch="' + c.id + '"' + (done ? ' disabled' : '') + ' aria-label="' + esc((done ? '' : 'Catch ') + t.name + ', ' + rlabel(c.id) + ', ' + state) + '">' +
        '<span class="rc-' + t.r + '">' + icon(c.id, 18) + '</span><span>' + esc(t.name) + '</span><span class="chip-pts">' + (c.caught ? icon('check', 14) : esc(state)) + '</span></button>';
    }).join('');
  }
  function renderWonders() {
    var block = $('wonder-block');
    if (!R.wonders.length) { block.hidden = true; return; }
    block.hidden = false;
    $('wonders').innerHTML = R.wonders.map(function (w) {
      var t = T(w.id);
      var caught = !!S.caught[w.key];
      var cool = coolLeft(w.key);
      var note = w.note || t.when + '.';
      var btn = caught ? '<span class="pill rc-' + t.r + '">Caught</span>' :
        cool ? '<span class="small">Back in ' + minutes(cool) + '</span>' :
        '<button class="btn" type="button" data-wonder="' + w.id + '"' + (blockedByMoving() ? ' disabled' : '') + '>Catch</button>';
      return '<div class="wcard"><span class="rc-' + t.r + '">' + icon(w.id, 26) + '</span><div class="wcard-body"><div class="wcard-name">' + esc(t.name) + '</div>' +
        '<div class="tl-r rc-' + t.r + '">' + rlabel(w.id) + ' · ' + RU.points(w.id) + ' pts</div><div class="wcard-note">' + esc(note) + '</div></div>' + btn + '</div>';
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
        if (id && RU.rank(id) >= 3) rareNote.push(T(id).name + ' to the ' + c.dir.toLowerCase());
      }
      var t = id ? T(id) : null;
      var rare = id && RU.rank(id) >= 3;
      return '<div class="g9' + (c.here ? ' here' : '') + (rare ? ' rare' : '') + '"' + (rare ? ' style="border-color:var(--r-' + t.r + ')"' : '') + '>' +
        '<span class="g9-dir">' + (c.here ? 'You' : esc(c.dir)) + '</span>' +
        (t ? '<span class="rc-' + t.r + '">' + icon(id, 20) + '</span><span class="g9-name">' + esc(t.name) + '</span>' : '<span class="g9-name">' + (cellById[c.id] || c.here ? 'Quiet' : 'No data') + '</span>') +
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
      return '<li><span class="tl-when">' + esc(s.from <= now() ? 'Now' : whenLabel(s.from)) + '</span><span class="tl-what">' + (t ? '<span class="rc-' + t.r + '">' + icon(s.id, 18) + '</span>' + esc(t.name) : icon('quiet', 18) + 'Quiet night') + '</span>' +
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
    if (n >= 15) return 'Gold';
    if (n >= 5) return 'Silver, ' + (15 - n) + ' more for gold';
    return (5 - n) + ' more for silver';
  }
  function tierOf(n) { return n >= 15 ? 'gold' : n >= 5 ? 'silver' : ''; }
  function renderShelfHead() {
    var L = RU.levelFor(S.points);
    var lo = RU.pointsFor(L), hi = RU.pointsFor(L + 1);
    $('lv-n').textContent = L;
    $('lv-title').textContent = RU.titleFor(L);
    $('lv-pts').textContent = S.points + ' / ' + hi + ' points';
    $('lv-fill').style.width = Math.round((S.points - lo) / (hi - lo) * 100) + '%';
    var next = RU.UNLOCKS.filter(function (u) { return u.level > L; })[0];
    $('lv-next').textContent = next ? 'Level ' + next.level + ' unlocks ' + next.name.toLowerCase() + ': ' + next.text.charAt(0).toLowerCase() + next.text.slice(1) : 'Every forecast power is unlocked.';
    $('jar-n').textContent = jarCount();
    $('jar-total').textContent = RU.ORDERED.length;
  }
  function renderShelf() {
    renderShelfHead();
    var html = RU.ELEMENTS.map(function (el) {
      var types = RU.ORDERED.filter(function (t) { return t.el === el.id; });
      var have = types.filter(function (t) { return S.book[t.id] && S.book[t.id].n; }).length;
      return '<section class="shelf-sec"><div class="shelf-sec-head"><h2 class="h2">' + esc(el.name) + '</h2><span class="shelf-sec-n">' + have + ' of ' + types.length + '</span></div><div class="shelf">' +
        types.map(function (t) {
          var e = S.book[t.id];
          var n = e ? e.n : 0;
          var later = t.how === 'later';
          var label = t.name + ', ' + rlabel(t.id) + (n ? ', caught ' + n + ' ' + plural(n, 'time') : later ? ', coming in a later version' : ', not caught yet');
          var meta = n ? rlabel(t.id) + (tierOf(n) ? ' · ' + tierOf(n) : '') : later ? 'Later' : rlabel(t.id);
          return '<button type="button" class="jarcell' + (n ? '' : ' locked') + '" data-jar="' + t.id + '" aria-label="' + esc(label) + '">' +
            '<canvas data-id="' + t.id + '" aria-hidden="true"></canvas><span class="plank"></span>' +
            '<span class="jar-name">' + esc(t.name) + (n > 1 ? ' ×' + n : '') + '</span><span class="jar-meta rc-' + t.r + '">' + esc(meta) + '</span></button>';
        }).join('') + '</div></section>';
    }).join('');
    $('shelves').innerHTML = html;
    R.shelfJars = [];
    R.visibleJars = {};
    var cvs = $('shelves').querySelectorAll('canvas');
    for (var i = 0; i < cvs.length; i++) R.shelfJars.push(cvs[i]);
    if (jarObserver) R.shelfJars.forEach(function (cv) { jarObserver.observe(cv); });
    requestAnimationFrame(function () { drawShelf(2, true); });
  }
  var jarObserver = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { R.visibleJars[en.target.getAttribute('data-id')] = en.isIntersecting; });
  }) : null;
  function glassLook() {
    var cs = getComputedStyle(document.documentElement);
    return { glass: cs.getPropertyValue('--glass').trim() || 'rgba(120,130,150,0.6)', q: cs.getPropertyValue('--muted').trim() || '#7A839C' };
  }
  function jarState(id) {
    var t = T(id);
    var e = S.book[id];
    if (!e || !e.n) return { locked: true, later: t.how === 'later' };
    var cur = R.cls ? R.cls.ids : [];
    var sunny = cur.indexOf('clear') !== -1 || cur.indexOf('sunnyspells') !== -1 || cur.indexOf('hotday') !== -1 || cur.indexOf('heatwave') !== -1;
    var snowy = cur.indexOf('snow') !== -1 || cur.indexOf('heavysnow') !== -1 || cur.indexOf('blizzard') !== -1 || cur.indexOf('sleet') !== -1;
    var frosty = id === 'snow' || id === 'heavysnow' || id === 'blizzard' || id === 'firstflakes' || id === 'frost' || id === 'hardfrost';
    return {
      id: id, glow: RU.rank(id) >= 3 ? { rare: '#7DB4FF', epic: '#C4A0FF', legendary: '#FFC766' }[t.r] : null,
      drip: frosty && sunny, hat: frosty && snowy, img: e.photo ? photoImg(e.photo) : null
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
      var id = cv.getAttribute('data-id');
      if (!all && jarObserver && !R.visibleJars[id]) return;
      var st = jarState(id);
      if (st.locked && !all) return;
      drawJarOn(cv, st, t, look);
    });
  }

  /* ---------- the More tab ---------- */

  function isStandalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function renderMore() {
    $('version').textContent = VERSION;
    var text = $('install-text'), btn = $('install-btn');
    if (isStandalone()) { text.textContent = 'You’re using it from your home screen. Your jars are safest here.'; btn.hidden = true; }
    else if (R.installEvt) { text.textContent = 'It opens like an app, and your jars are safer there.'; btn.hidden = false; }
    else if (isIOS()) { text.textContent = 'On iPhone: tap the Share button in Safari, then Add to Home Screen. It opens like an app, and your jars are safer there.'; btn.hidden = true; }
    else { text.textContent = 'In your browser menu, choose Add to Home screen or Install app. It opens like an app, and your jars are safer there.'; btn.hidden = true; }
  }

  /* ---------- tabs ---------- */

  function selectTab(tab) {
    R.tab = tab;
    ['catch', 'shelf', 'more'].forEach(function (k) {
      $('panel-' + k).hidden = k !== tab;
      if (k === tab) $('nav-' + k).setAttribute('aria-current', 'page');
      else $('nav-' + k).removeAttribute('aria-current');
    });
    if (tab === 'shelf') renderShelf();
    render();
    window.scrollTo(0, 0);
    kick();
  }

  /* ---------- the sheet ---------- */

  function showView(name) {
    R.view = name;
    $('game-view').hidden = name !== 'game';
    $('card-view').hidden = name !== 'card';
    $('info-view').hidden = name !== 'info';
    $('sheet').setAttribute('aria-labelledby', name === 'game' ? 'g-title' : name === 'card' ? 'c-title' : 'i-title');
  }
  function setActions(boxId, list) {
    var box = $(boxId);
    box.innerHTML = '';
    list.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn' + (a.primary ? ' btn-primary' : '');
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
      var btns = $(R.view === 'card' ? 'c-actions' : 'i-actions').querySelectorAll('button');
      var target = btns[btns.length - 1];
      if (target) try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }
  }
  function closeSheet() {
    $('overlay').hidden = true;
    R.game = null;
    R.cardState = null;
    R.queue = [];
    R.view = null;
    if (R.lastFocus && R.lastFocus.focus && document.contains(R.lastFocus)) try { R.lastFocus.focus({ preventScroll: true }); } catch (e) {}
    render();
    if (R.tab === 'shelf') renderShelf();
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
  function setPill(id) {
    var t = T(id);
    var p = $('c-pill');
    p.className = 'pill rc-' + t.r;
    p.textContent = rlabel(id) + (t.el === 'wonder' ? ' · Sky Wonder' : t.el === 'change' ? ' · Change moment' : '');
  }

  /* ---------- catching ---------- */

  function beginCatch(id, kind, key) {
    if (blockedByMoving()) { toast('You’re moving fast. Passengers can tap I’m a passenger.'); return; }
    if (!R.area) return;
    if (S.caught[key]) { toast('You’ve already caught that today.'); return; }
    var cool = coolLeft(key);
    if (cool) { toast(T(id).name + ' slipped away. Try again in ' + minutes(cool) + '.'); return; }
    if (stale()) {
      toast('Checking the weather first…');
      var areaId = R.area.id;
      refreshWeather(true).then(function () {
        var stillHere = R.area && R.area.id === areaId && !stale();
        var still = stillHere && (kind === 'weather' ? R.cls && R.cls.ids.indexOf(id) !== -1 : R.wonders.some(function (w) { return w.key === key; }));
        if (still) openGame(id, kind, key);
        else toast('The weather has changed. Have another look.');
      });
      return;
    }
    openGame(id, kind, key);
  }
  function openGame(id, kind, key) {
    var t = T(id);
    R.game = { id: id, kind: kind, key: key, areaId: R.area.id, g: WC.game.create({ id: id, night: R.reading ? !R.reading.isDay : false }), missHandled: false };
    showView('game');
    $('g-label').textContent = kind === 'wonder' ? 'Sky Wonder' : 'Catch it';
    $('g-label').className = 'ov-label rc-' + t.r;
    $('g-title').textContent = 'Catch ' + t.name;
    $('g-instr').textContent = R.game.g.instruction;
    $('g-flee').textContent = WC.game.fleeChance(id) ? rlabel(id) + ': can slip away if you miss' : 'Commons never slip away';
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
    var chance = WC.game.fleeChance(G.id);
    var name = T(G.id).name;
    if (chance && Math.random() < chance) {
      S.cool[G.key] = now() + COOLDOWN;
      addLog(name + ' slipped away' + (G.kind === 'weather' ? ' in ' + placeFor(G.areaId) : ''));
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
  function awardOne(id, key, place, verify, count) {
    count = count || 1;
    S.caught[key] = 1;
    var e = bookEntry(id);
    var isNew = !e.n;
    var before = e.n;
    e.n += count;
    var newPlace = addPlace(e, place);
    if (!e.first) e.first = { t: now(), place: place };
    e.last = now();
    var pts = RU.points(id) * count;
    S.points += pts;
    var tier = before < 15 && e.n >= 15 ? 'Gold' : before < 5 && e.n >= 5 ? 'Silver' : null;
    var r = { id: id, isNew: isNew, n: e.n, newPlace: newPlace && !isNew, place: place, pts: pts, tier: tier, verify: verify || '' };
    var t = T(id);
    addLog(isNew ? (t.el === 'change' ? 'Change moment: ' : t.el === 'wonder' ? 'Sky Wonder: ' : 'New jar: ') + t.name + (place ? ' in ' + place : '') + ' (+' + pts + ')'
      : t.name + ' again' + (place ? ' in ' + place : '') + ' (×' + e.n + ', +' + pts + ')');
    return r;
  }
  function finishCatch() {
    var G = R.game;
    R.game = null;
    var before = RU.levelFor(S.points);
    var place = placeFor(G.areaId);
    var t = now();
    var list = [];
    if (G.kind === 'weather') {
      var prev = (S.recent[G.areaId] || []).slice();
      var nowIds = R.cls && R.area && R.area.id === G.areaId ? R.cls.ids : [G.id];
      var temp = R.reading ? R.reading.temp : 10;
      list.push(awardOne(G.id, G.key, place, 'Matches the live weather for ' + place + ' at ' + hm(t) + '.'));
      RU.changesFor(prev, nowIds, temp, t).forEach(function (cid) {
        var ck = today() + '|' + G.areaId + '|' + cid;
        if (S.caught[ck]) return;
        list.push(awardOne(cid, ck, place, 'You were in ' + place + ' when the weather turned.'));
      });
      prev = prev.filter(function (p) { return t - p.t <= 3 * HOUR; });
      prev.push({ id: G.id, t: t });
      S.recent[G.areaId] = prev.slice(-8);
    } else {
      list.push(awardOne(G.id, G.key, place, 'Matches the sky over ' + place + ' at ' + hm(t) + '.'));
    }
    afterAward(list, before);
  }
  function afterAward(list, before) {
    var after = RU.levelFor(S.points);
    if (after > before && list.length) {
      list[list.length - 1].lvUp = after;
      addLog('Level ' + after + '!');
    }
    save();
    render();
    try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {}
    openReveal(list);
  }
  function unlockText(L) {
    for (var i = 0; i < RU.UNLOCKS.length; i++) if (RU.UNLOCKS[i].level === L) return 'Unlocked: ' + RU.UNLOCKS[i].name.toLowerCase() + '.';
    return '';
  }
  function openReveal(list) {
    R.queue = list.slice();
    nextReveal();
  }
  function nextReveal() {
    var r = R.queue.shift();
    if (!r) { closeSheet(); return; }
    var t = T(r.id);
    var e = S.book[r.id];
    showView('card');
    var label = r.trip ? 'From your trip' : r.isNew ? (t.el === 'change' ? 'New Change moment' : t.el === 'wonder' ? 'New Sky Wonder' : 'New jar') : 'Caught again';
    $('c-label').textContent = label;
    $('c-label').className = 'ov-label rc-' + t.r;
    $('c-title').textContent = t.name;
    setPill(r.id);
    var pts = '+' + r.pts + ' points';
    if (r.lvUp) pts += ' · Level ' + r.lvUp + '! ' + unlockText(r.lvUp);
    $('c-points').textContent = pts;
    $('c-line').textContent = t.line;
    var stats;
    if (r.trip) stats = '×' + r.count + ' on this trip · ' + e.n + ' on your shelf · ' + e.places.length + ' ' + plural(e.places.length, 'place');
    else if (r.isNew) stats = 'First one on your shelf.';
    else stats = '×' + r.n + ' · ' + e.places.length + ' ' + plural(e.places.length, 'place') + (r.newPlace ? ' · new place: ' + r.place : '');
    if (!r.isNew || r.trip) stats += ' · ' + (r.tier ? r.tier + ' reached!' : tierText(e.n));
    $('c-stats').textContent = stats;
    setVerify(r.verify);
    R.cardState = jarState(r.id);
    if (r.img) R.cardState.img = r.img;
    setActions('c-actions', [{ label: R.queue.length ? 'Next' : 'Put it on the shelf', primary: true, fn: nextReveal }]);
    openSheet();
    if (r.lvUp) toast('Level ' + r.lvUp + '! ' + unlockText(r.lvUp));
  }
  function openDetail(id) {
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
    if (n) {
      $('c-stats').textContent = '×' + n + ' · ' + tierText(n) + (e.places.length ? ' · Places: ' + e.places.slice(-12).join(', ') : '');
      setVerify(e.first ? 'First caught ' + new Date(e.first.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' at ' + hm(e.first.t) + (e.first.place ? ' in ' + e.first.place : '') : '');
    } else {
      $('c-stats').textContent = t.how === 'photo' ? 'Caught with a photo when the weather makes it possible.' : t.how === 'change' ? 'Earned when the weather turns while you’re there.' : t.how === 'sky' ? 'Comes from the sky calendar.' : '';
      setVerify('');
    }
    R.cardState = jarState(id);
    setActions('c-actions', [{ label: 'Close', primary: true, fn: closeSheet }]);
    openSheet();
  }

  /* ---------- photo catches ---------- */

  function openSpots() {
    if (!R.area || !R.spots.length) { toast('Sky Wonders appear once the weather has loaded.'); return; }
    var d = today();
    var rows = R.spots.slice().sort(function (a, b) { return (b.possible ? 1 : 0) - (a.possible ? 1 : 0); }).map(function (s) {
      var t = T(s.id);
      var caught = !!S.caught[s.id + '|' + d];
      var right = caught ? '<span class="pill rc-' + t.r + '">Caught today</span>' :
        s.possible ? '<button class="btn" type="button" data-photo="' + s.id + '"' + (blockedByMoving() ? ' disabled' : '') + '>Take photo</button>' : '';
      return '<li class="spot-item' + (s.possible || caught ? '' : ' off') + '"><span class="rc-' + t.r + '">' + icon(s.id, 24) + '</span><div class="si-body"><div class="si-name">' + esc(t.name) +
        ' <span class="tl-r rc-' + t.r + '">' + rlabel(s.id) + '</span></div><div class="si-why">' + esc(s.why) + '</div></div>' + right + '</li>';
    }).join('');
    showInfo({
      label: 'Spot a Sky Wonder', title: 'What can you see?',
      body: '<p class="muted">Photo catches open your camera. Only take one when you can really see it, and never look straight at the sun.</p><ul class="spot-list">' + rows + '</ul><p class="muted">In this test version photos aren’t checked yet. The full app will check each one.</p>'
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
    toast('Putting your photo in a jar…');
    shrinkPhoto(file).then(function (blob) {
      var before = RU.levelFor(S.points);
      var place = placeFor(R.area ? R.area.id : '');
      var r = awardOne(id, key, place, 'Photo taken in ' + place + ' at ' + hm(now()) + ', when the weather made it possible.');
      var pk = 'p' + Date.now();
      S.book[id].photo = pk;
      var img = imgFromBlob(blob);
      R.photos[pk] = img;
      r.img = img;
      putPhoto(pk, blob).catch(function () {});
      afterAward([r], before);
    }).catch(function () { toast('That photo couldn’t be read. Try again.'); });
  }

  /* ---------- Drive mode ---------- */

  function openDriveIntro() {
    showInfo({
      label: 'Drive mode', title: 'Set it up before you set off',
      body: '<p>Put your phone in a holder with the app open, and don’t touch it while you drive.</p><p>Every new area and change in the weather on your journey goes into a sealed jar. Open them when you’ve stopped.</p><p class="muted">Keep the app on screen. Phones stop sharing location with web apps when the screen is off.</p>',
      actions: [{ label: 'Not now', fn: closeSheet }, { label: 'Start Drive mode', primary: true, fn: startDrive }]
    });
  }
  function startDrive() {
    closeSheet();
    S.drive = true;
    if (!S.haul) S.haul = { start: now(), jars: [] };
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
  function driveSeal() {
    if (!S.drive || !R.cls || !R.area || !S.haul) return;
    var a = R.area, place = placeFor(a.id), t = now();
    var prev = (S.recent[a.id] || []).slice();
    var sealedHere = [];
    R.cls.ids.forEach(function (id) {
      var key = wKey(a.id, id);
      if (S.caught[key]) return;
      S.caught[key] = 2;
      S.haul.jars.push({ id: id, place: place, t: t });
      sealedHere.push(id);
    });
    if (sealedHere.length) {
      RU.changesFor(prev, R.cls.ids, R.reading ? R.reading.temp : 10, t).forEach(function (cid) {
        var ck = wKey(a.id, cid);
        if (S.caught[ck]) return;
        S.caught[ck] = 2;
        S.haul.jars.push({ id: cid, place: place, t: t });
      });
      prev = prev.filter(function (p) { return t - p.t <= 3 * HOUR; });
      sealedHere.forEach(function (id) { prev.push({ id: id, t: t }); });
      S.recent[a.id] = prev.slice(-8);
    }
    R.wonders.forEach(function (w) {
      if (S.caught[w.key]) return;
      S.caught[w.key] = 2;
      S.haul.jars.push({ id: w.id, place: place, t: t });
    });
    save();
  }
  function driveMoving() { return R.moving && now() - R.speedAt < 60000; }
  function renderDrive() {
    var hidden = !S.drive;
    $('drive').hidden = hidden;
    if (hidden) return;
    var moving = driveMoving();
    var end = $('drive-end');
    end.disabled = moving;
    end.textContent = moving ? 'Stop to end your trip' : 'End trip';
    $('drive-note').textContent = R.wakeOk === false ? 'Keep the screen switched on so the app can follow your journey.' : R.wakeOk ? 'The screen will stay on while Drive mode is on.' : '';
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
  function groupHaul(jars) {
    var by = {};
    var order = [];
    jars.forEach(function (j) {
      if (!T(j.id)) return;
      if (!by[j.id]) { by[j.id] = { id: j.id, count: 0, places: [] }; order.push(j.id); }
      by[j.id].count += 1;
      if (j.place && by[j.id].places.indexOf(j.place) === -1) by[j.id].places.push(j.place);
    });
    return order.map(function (id) { return by[id]; }).sort(function (a, b) { return RU.rank(b.id) - RU.rank(a.id); });
  }
  function openTrip() {
    var h = S.haul;
    if (!h || !h.jars.length) { S.haul = null; save(); render(); toast('No new jars on that trip.'); return; }
    var groups = groupHaul(h.jars);
    var fresh = groups.filter(function (g) { return !(S.book[g.id] && S.book[g.id].n); }).length;
    var total = h.jars.length;
    showInfo({
      label: 'Your trip', title: total + ' sealed ' + plural(total, 'jar') + (fresh ? ', ' + fresh + ' new' : ''),
      body: '<ul class="trip-list">' + groups.map(function (g) {
        var t = T(g.id);
        return '<li><span><span class="rc-' + t.r + '">' + esc(t.name) + '</span></span><span class="small">×' + g.count + ' · ' + esc(rlabel(g.id)) + '</span></li>';
      }).join('') + '</ul>',
      actions: [{ label: 'Open your jars', primary: true, fn: openHaul }]
    });
  }
  function openHaul() {
    var h = S.haul;
    if (!h) { closeSheet(); return; }
    var before = RU.levelFor(S.points);
    var groups = groupHaul(h.jars);
    var total = 0;
    var list = groups.map(function (g) {
      var e = bookEntry(g.id);
      var isNew = !e.n;
      var b4 = e.n;
      e.n += g.count;
      g.places.forEach(function (p) { addPlace(e, p); });
      if (!e.first) e.first = { t: h.start, place: g.places[0] || '' };
      e.last = now();
      var pts = RU.points(g.id) * g.count;
      S.points += pts;
      total += pts;
      return {
        id: g.id, isNew: isNew, n: e.n, count: g.count, pts: pts, place: g.places[0], trip: true,
        tier: b4 < 15 && e.n >= 15 ? 'Gold' : b4 < 5 && e.n >= 5 ? 'Silver' : null,
        verify: 'Sealed on your trip, matching the live weather along the way.'
      };
    });
    Object.keys(S.caught).forEach(function (k) { if (S.caught[k] === 2) S.caught[k] = 1; });
    addLog('Opened ' + h.jars.length + ' ' + plural(h.jars.length, 'jar') + ' from your trip (+' + total + ')');
    S.haul = null;
    afterAward(list, before);
  }
  function requestWake() {
    if (!('wakeLock' in navigator)) { R.wakeOk = false; renderDrive(); return; }
    navigator.wakeLock.request('screen').then(function (l) {
      R.wake = l;
      R.wakeOk = true;
      l.addEventListener('release', function () { R.wake = null; });
      renderDrive();
    }).catch(function () { R.wakeOk = false; renderDrive(); });
  }
  function releaseWake() {
    if (R.wake) { try { R.wake.release(); } catch (e) {} }
    R.wake = null;
  }

  /* ---------- backup ---------- */

  function backupCode() {
    var copy = JSON.parse(JSON.stringify(S));
    copy.drive = false;
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
    save();
    closeSheet();
    if (R.area) evaluate();
    render();
    toast('Jars restored.');
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
  var rafId = 0, lastTs = 0, lastShelf = 0;
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
          if (G.g.wonT === undefined || G.g.wonT < 0.05) { showGameMsg('Caught!'); setActions('g-actions', []); }
          if (G.g.wonT > 0.9) finishCatch();
        } else if (G.g.state === 'missed' && !G.missHandled) handleMiss();
      } else if (R.cardState && R.view === 'card') {
        drawJarOn($('c-canvas'), R.cardState, t, glassLook());
      }
    }
    if (R.tab === 'shelf' && !reduce && ts - lastShelf > 110) {
      lastShelf = ts;
      drawShelf(t, false);
    }
    rafId = requestAnimationFrame(frame);
  }
  function kick() {
    if (!rafId && !document.hidden) { lastTs = 0; rafId = requestAnimationFrame(frame); }
  }
  /* the scene for the live sky: the headline weather, or a clear or cloudy night when nothing's catchable */
  function skyScene() {
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
    $('spot-btn').addEventListener('click', openSpots);
    $('i-body').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-photo]') : null;
      if (b) takePhoto(b.getAttribute('data-photo'));
    });
    $('photo-input').addEventListener('change', function () { closeSheet(); onPhoto(); });
    $('drive-btn').addEventListener('click', openDriveIntro);
    $('lock-drive').addEventListener('click', openDriveIntro);
    $('lock-passenger').addEventListener('click', function () { S.passengerUntil = now() + 3 * HOUR; save(); render(); toast('Passenger mode is on for the next 3 hours.'); });
    $('pass-off').addEventListener('click', function () { S.passengerUntil = 0; save(); render(); });
    $('drive-end').addEventListener('click', endDrive);
    $('lvl').addEventListener('click', function () { selectTab('shelf'); });
    $('nav-catch').addEventListener('click', function () { selectTab('catch'); });
    $('nav-shelf').addEventListener('click', function () { selectTab('shelf'); });
    $('nav-more').addEventListener('click', function () { selectTab('more'); });
    $('shelves').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-jar]') : null;
      if (b) openDetail(b.getAttribute('data-jar'));
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
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !$('overlay').hidden && !(R.game && R.game.g.state === 'won')) closeSheet();
    });
    $('backup-btn').addEventListener('click', openBackup);
    $('restore-btn').addEventListener('click', openRestore);
    var armed = false, armTimer = 0;
    $('reset-btn').addEventListener('click', function () {
      var b = this;
      if (!armed) {
        armed = true;
        b.textContent = 'Tap again to clear everything';
        armTimer = setTimeout(function () { armed = false; b.textContent = 'Clear everything'; }, 4000);
        return;
      }
      clearTimeout(armTimer);
      armed = false;
      b.textContent = 'Clear everything';
      var keepNames = S.names;
      S = freshState();
      S.onboarded = true;
      S.names = keepNames;
      save();
      clearPhotos();
      R.photos = {};
      if (R.area) evaluate();
      render();
      toast('Everything is cleared. Happy catching.');
    });
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
        if (!S.drive) stopWatch();
      } else {
        kick();
        if (S.onboarded && !R.problem) {
          if (R.watchId === null) startWatch();
          if (S.drive) requestWake();
          if (R.area && (!R.wx || now() - R.wx.at > REFRESH)) refreshWeather();
          else if (R.wx) { evaluate(); render(); }
        }
      }
    });
    window.addEventListener('resize', function () { if (R.tab === 'shelf') requestAnimationFrame(function () { drawShelf(2, true); }); });
  }
  function tick() {
    if (R.speedAt && now() - R.speedAt > 3 * MIN) { R.fast = false; R.moving = false; }
    if (document.hidden) return;
    if (R.area && !R.fetching && (!R.wx || now() - R.wx.at > REFRESH)) refreshWeather();
    else if (R.wx) evaluate();
    render();
  }

  function boot() {
    prune();
    save();
    bind();
    if (S.onboarded) locate();
    if (S.drive) { $('drive').hidden = false; requestWake(); }
    else if (S.haul && S.haul.jars && S.haul.jars.length) setTimeout(openTrip, 600);
    render();
    kick();
    setInterval(tick, 15000);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    if ('serviceWorker' in navigator && !TEST && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  if (TEST) {
    window.WC_TEST = {
      state: function () { return S; },
      runtime: function () { return R; },
      win: function () { if (R.game) R.game.g.win(); },
      miss: function (text) { if (R.game) R.game.g.miss(text || 'Missed.'); },
      speed: function (mps) { noteSpeed(mps); noteSpeed(mps); render(); },
      refresh: function () { return refreshWeather(true); },
      evaluate: function () { evaluate(); render(); }
    };
  }

  boot();
})();
