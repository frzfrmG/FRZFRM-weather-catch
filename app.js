/* FRZFRM Weather Catch: the app.
   Finds your area, gets the live weather, works out what you can catch, runs the catching games,
   and keeps your shelf, points, levels, shelf rewards and Drive mode trips. Everything is saved on the phone. */
(function () {
  'use strict';
  var WC = window.WC;
  var RU = WC.rules, SKY = WC.sky;
  var VERSION = '0.2.2';
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
    return {
      v: 1, created: Date.now(), points: 0, book: {}, caught: {}, cool: {}, recent: {}, names: {}, log: [], haul: null, drive: false, passengerUntil: 0, onboarded: false,
      rewards: {}, style: { wood: 'pine', lights: 'off' }
    };
  }
  function known(list, id) { return list.some(function (x) { return x.id === id; }); }
  function cleanState(o) {
    if (!o || o.v !== 1 || typeof o.points !== 'number' || !isFinite(o.points) || !o.book || typeof o.book !== 'object') return null;
    var f = freshState();
    Object.keys(f).forEach(function (k) { if (!(k in o)) o[k] = f[k]; });
    ['caught', 'cool', 'recent', 'names', 'rewards'].forEach(function (k) { if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {}; });
    if (!Array.isArray(o.log)) o.log = [];
    Object.keys(o.book).forEach(function (id) {
      var e = o.book[id];
      if (!T(id) || !e || typeof e.n !== 'number') { delete o.book[id]; return; }
      if (!Array.isArray(e.places)) e.places = [];
      if (e.catches && !Array.isArray(e.catches)) delete e.catches;
    });
    Object.keys(o.rewards).forEach(function (id) { if (!RU.reward(id)) delete o.rewards[id]; });
    if (!o.style || typeof o.style !== 'object' || Array.isArray(o.style)) o.style = f.style;
    if (!known(RU.WOODS, o.style.wood)) o.style.wood = 'pine';
    if (!known(RU.LIGHTS, o.style.lights)) o.style.lights = 'off';
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
    reading: null, ctx: null, cls: null, wonders: [], spots: [], seen: [], near: {}, coming: [], warning: null,
    watchId: null, game: null, view: null, queue: [], cardState: null, lastFocus: null,
    installEvt: null, wake: null, wakeOk: null, photos: {}, pendingSpot: null, shelfJars: [], previewJars: null, share: null
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
    if (typeof c.altitude === 'number' && isFinite(c.altitude) && typeof c.altitudeAccuracy === 'number' && c.altitudeAccuracy <= 50) pos.alt = c.altitude;
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
    var ctx = { lat: a.lat, lon: a.lon, elevation: elev, coastal: sea && elev < 60, thunderNearby: near.thunder, sunrise: d && d.sunrise, sunset: d && d.sunset };
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
      hint.innerHTML = R.reading && !R.reading.isDay ? 'A quiet night. Look for Sky Wonders below, or come back when the weather changes.' : 'Nothing to catch here right now. If you can see rain or fog, tap Spot something.';
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
    if (n >= RU.GOLD_AT) return 'Gold';
    if (n >= RU.SILVER_AT) return 'Silver, ' + (RU.GOLD_AT - n) + ' more for gold';
    return (RU.SILVER_AT - n) + ' more for silver';
  }
  function tierOf(n) { return n >= RU.GOLD_AT ? 'gold' : n >= RU.SILVER_AT ? 'silver' : ''; }
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
  function lightsFor(kind, swags) {
    if (kind === 'glow') return '<span class="shelf-lights glow" aria-hidden="true"></span>';
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
  function shelfClass(elId, themed, gold) { return 'shelf' + (themed ? ' th-' + elId : '') + (gold ? ' gold' : ''); }
  function jarCell(t, dark) {
    var e = S.book[t.id];
    var n = e ? e.n : 0;
    var later = !RU.catchable(t);
    var label = t.name + ', ' + rlabel(t.id) + (n ? ', caught ' + n + ' ' + plural(n, 'time') + (tierOf(n) ? ', ' + tierOf(n) : '') : later ? ', coming in a later version' : ', not caught yet');
    var meta = n ? rlabel(t.id) + (tierOf(n) ? ' · ' + tierOf(n) : '') : later ? 'Later' : rlabel(t.id);
    return '<button type="button" class="jarcell' + (n ? '' : ' locked') + '" data-jar="' + t.id + '" aria-label="' + esc(label) + '">' +
      '<canvas data-id="' + t.id + '"' + (dark ? ' data-dark="1"' : '') + ' aria-hidden="true"></canvas><span class="plank"></span>' +
      '<span class="jar-name">' + esc(t.name) + (n > 1 ? ' ×' + n : '') + '</span><span class="jar-meta rc-' + t.r + '">' + esc(meta) + '</span></button>';
  }
  /* a small shelf for previews. o: { el, themed, gold, wood, lights } */
  function miniShelf(ids, o) {
    o = o || {};
    var lights = o.lights || S.style.lights;
    var dark = o.themed && DARK_ROWS[o.el];
    var cells = ids.map(function (id) {
      return '<div class="jarcell"><canvas data-id="' + id + '"' + (dark ? ' data-dark="1"' : '') + ' aria-hidden="true"></canvas><span class="plank"></span></div>';
    }).join('');
    return '<div class="mini wood-' + (o.wood || S.style.wood) + ' lights-' + lights + '"><div class="' + shelfClass(o.el, o.themed, o.gold) + '">' + lightsFor(lights) + cells + '</div></div>';
  }
  function collectPreview(box) { R.previewJars = Array.prototype.slice.call(box.querySelectorAll('canvas[data-id]')); }
  function skySection() {
    var have = !!S.rewards.full;
    var label = 'The Sky Jar, ' + (have ? 'showing the live sky: ' + skyName() : 'not earned yet. Fill your shelf to earn it');
    return '<section class="shelf-sec sky-sec" id="row-sky"><h2 class="shelf-h"><span class="row-static"><span class="row-name">The Sky Jar</span>' +
      (have ? '<span class="row-pill gold-pill">' + esc(RU.KEEPER) + '</span>' : '<span class="shelf-sec-n">' + jarCount() + ' of ' + RU.SHELF_TOTAL + '</span>') + '</span></h2>' +
      '<div class="shelf sky-shelf' + (have ? ' sky-have' : '') + '">' + lightsFor(S.style.lights) +
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
    var kind;
    if (next) {
      $('rw-label').textContent = 'Next reward';
      $('rw-name').textContent = next.prize || next.name;
      $('rw-sub').textContent = (next.id === 'full' ? 'Fill your whole shelf · ' + RU.KEEPER + ' title · ' : 'At ' + next.need + ' jars · ') + '+' + next.bonus + ' bonus points';
      $('rw-bar').hidden = false;
      $('rw-fill').style.width = Math.round(Math.min(1, prog.jars / next.need) * 100) + '%';
      $('rw-count').textContent = prog.jars + ' of ' + next.need + ' jars';
      kind = next.wood ? 'wood-' + next.wood : next.lights ? 'lights-' + next.lights : 'sky';
    } else {
      var gold = prog.rows.filter(function (r) { return S.rewards['gold-' + r.el]; }).length;
      $('rw-label').textContent = RU.KEEPER;
      $('rw-name').textContent = gold < prog.rows.length ? 'Gold shelves' : 'Every shelf is gold';
      $('rw-sub').textContent = gold < prog.rows.length ? 'Get every jar in a row to gold for +1000 bonus points. ' + gold + ' of ' + prog.rows.length + ' gold so far.' : 'You’ve won everything there is to win.';
      $('rw-bar').hidden = true;
      $('rw-count').textContent = '';
      kind = 'gold';
    }
    var sw = $('rw-swatch');
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
    $('lv-pts').textContent = S.points + ' / ' + hi + ' points';
    $('lv-fill').style.width = Math.round((S.points - lo) / (hi - lo) * 100) + '%';
    var next = RU.UNLOCKS.filter(function (u) { return u.level > L; })[0];
    $('lv-next').textContent = next ? 'Level ' + next.level + ' unlocks ' + next.name.toLowerCase() + ': ' + next.text.charAt(0).toLowerCase() + next.text.slice(1) : 'Every forecast power is unlocked.';
    var prog = RU.shelfProgress(S.book);
    $('jar-n').textContent = prog.jars;
    $('jar-total').textContent = prog.total;
    if (!$('reward-card')) return;
    var later = RU.ORDERED.filter(function (t) { return !RU.catchable(t); }).map(function (t) { return t.name; });
    $('shelf-note').textContent = later.length ? listText(later) + ' arrive in a later version.' : '';
    $('shelf-note').hidden = !later.length;
    renderRewardCard(prog);
    var sm = $('sky-meta');
    if (sm && sm.textContent !== skyMeta()) sm.textContent = skyMeta();
  }
  function renderShelf() {
    R.shelfJars = [];
    var sw = $('rw-swatch');
    if (sw) sw.removeAttribute('data-k');
    renderShelfHead();
    var prog = RU.shelfProgress(S.book);
    var box = $('shelves');
    box.className = 'shelves wood-' + S.style.wood + ' lights-' + S.style.lights;
    var html = RU.ELEMENTS.map(function (el, i) {
      var row = prog.rows[i];
      var types = RU.ORDERED.filter(function (t) { return t.el === el.id; });
      var st = rowState(el.id);
      var dark = st.themed && DARK_ROWS[el.id];
      var pill = st.gold ? '<span class="row-pill gold-pill">Gold</span>' : st.themed ? '<span class="row-pill">Complete</span>' : '';
      var label = el.name + ' shelf, ' + row.have + ' of ' + row.need + (st.gold ? ', gold' : st.themed ? ', complete' : '') + '. See what this shelf earns';
      return '<section class="shelf-sec" id="row-' + el.id + '"><h2 class="shelf-h"><button type="button" class="row-btn" data-row="' + el.id + '" aria-label="' + esc(label) + '">' +
        '<span class="row-name">' + esc(el.name) + '</span>' + pill + '<span class="shelf-sec-n">' + row.have + ' of ' + row.need + '</span>' + CHEVRON + '</button></h2>' +
        '<div class="' + shelfClass(el.id, st.themed, st.gold) + '">' + lightsFor(S.style.lights) + types.map(function (t) { return jarCell(t, dark); }).join('') + '</div></section>';
    }).join('');
    box.innerHTML = S.rewards.full ? skySection() + html : html + skySection();
    var cvs = box.querySelectorAll('canvas');
    for (var i = 0; i < cvs.length; i++) R.shelfJars.push(cvs[i]);
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
    if (!e || !e.n) return { locked: true, later: !RU.catchable(t) };
    var cur = R.cls ? R.cls.ids : [];
    var sunny = cur.indexOf('clear') !== -1 || cur.indexOf('sunnyspells') !== -1 || cur.indexOf('hotday') !== -1 || cur.indexOf('heatwave') !== -1;
    var snowy = cur.indexOf('snow') !== -1 || cur.indexOf('heavysnow') !== -1 || cur.indexOf('blizzard') !== -1 || cur.indexOf('sleet') !== -1;
    var frosty = id === 'snow' || id === 'heavysnow' || id === 'blizzard' || id === 'firstflakes' || id === 'frost' || id === 'hardfrost';
    return {
      id: id, glow: RU.rank(id) >= 3 ? { rare: '#7DB4FF', epic: '#C4A0FF', legendary: '#FFC766' }[t.r] : null,
      drip: frosty && sunny, hat: frosty && snowy, img: e.photo ? photoImg(e.photo) : null,
      lidTone: e.n >= RU.GOLD_AT ? 'gold' : null
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
      var st = jarState(cv.getAttribute('data-id'));
      if (st.locked && !st.ghost && !all) return;
      drawJarOn(cv, st, t, lookFor(cv, look));
    });
  }
  function drawPreview(t) {
    var look = glassLook();
    R.previewJars.forEach(function (cv) { drawJarOn(cv, jarState(cv.getAttribute('data-id')), t, lookFor(cv, look)); });
  }

  /* ---------- shelf rewards ---------- */

  /* award every reward the shelf has earned but not yet been given: bonus points, and new woods and lights go straight on */
  function claimRewards() {
    var fresh = RU.rewardsEarned(S.book).filter(function (id) { return !S.rewards[id]; });
    fresh.forEach(function (id) {
      var rw = RU.reward(id);
      S.rewards[id] = now();
      S.points += rw.bonus;
      if (rw.wood) S.style.wood = rw.wood;
      if (rw.lights) S.style.lights = rw.lights;
      addLog('Reward: ' + rw.name + ' (+' + rw.bonus + ')');
    });
    return fresh.map(function (id) { return { reward: id }; });
  }
  /* rewards earned before this version, or brought back with a backup code */
  function checkPendingRewards() {
    if (S.drive || !$('overlay').hidden) return;
    var before = RU.levelFor(S.points);
    var cards = claimRewards();
    if (!cards.length) return;
    var after = RU.levelFor(S.points);
    if (after > before) { cards[cards.length - 1].lvUp = after; addLog('Level ' + after + '!'); }
    save();
    render();
    if (R.tab === 'shelf') renderShelf();
    openReveal(cards);
  }
  function rewardLabel(rw) { return rw.kind === 'jars' ? 'Shelf reward' : rw.kind === 'row' ? 'Row complete' : rw.kind === 'gold' ? 'Gold shelf' : 'Shelf complete'; }
  function rewardStats(rw) {
    var prog = RU.shelfProgress(S.book);
    if (rw.kind === 'jars') {
      var next = RU.nextJarReward(prog.jars);
      return (rw.wood ? 'You can switch woods any time in Shelf style.' : 'You can switch the lights any time in Shelf style.') +
        (next ? ' Next: ' + (next.prize || next.name).replace(/^The /, 'the ') + (next.id === 'full' ? ' when your shelf is full.' : ' at ' + next.need + ' jars.') : '');
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
    $('r-label').className = 'ov-label ' + (rw.kind === 'jars' ? 'rc-rare' : 'rc-legendary');
    $('r-title').textContent = rw.name;
    var pts = '+' + rw.bonus + ' bonus points';
    if (r.lvUp) pts += ' · Level ' + r.lvUp + '! ' + unlockText(r.lvUp);
    $('r-points').textContent = pts;
    $('r-line').textContent = rw.done;
    $('r-stats').textContent = rewardStats(rw);
    var prev = $('r-preview');
    if (rw.kind === 'full') prev.innerHTML = '<div class="r-sky"><div class="ov-jar"><canvas data-id="sky" aria-hidden="true"></canvas></div></div>';
    else if (rw.kind === 'jars') prev.innerHTML = miniShelf(bestJars(shelfIds()));
    else prev.innerHTML = miniShelf(bestJars(rowIds(rw.el)), { el: rw.el, themed: true, gold: rw.kind === 'gold' });
    collectPreview(prev);
    setActions('r-actions', R.queue.length ? [{ label: 'Next', primary: true, fn: nextReveal }] :
      [{ label: 'Keep catching', fn: closeSheet }, { label: 'See your shelf', primary: true, fn: function () { seeShelf(rw); } }]);
    openSheet();
    confetti(rw.kind === 'jars' ? 18 : rw.kind === 'full' ? 60 : 36);
    try { if (navigator.vibrate) navigator.vibrate([30, 60, 30]); } catch (e) {}
    if (r.lvUp) toast('Level ' + r.lvUp + '! ' + unlockText(r.lvUp));
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
      (later.length ? '<p class="muted">' + esc(listText(later)) + ' arrive in a later version and don’t count yet.</p>' : '');
    showInfo({ label: name + ' shelf', title: rowRw.name, body: body });
    collectPreview($('i-body'));
  }
  function styleChips(kind, list) {
    return '<div class="chips style-chips" role="group" aria-label="' + (kind === 'wood' ? 'Shelves' : 'Lights') + '">' + list.map(function (o) {
      var rw = RU.styleReward(kind, o.id);
      var open = !rw || !!S.rewards[rw.id];
      var on = S.style[kind] === o.id;
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-style="' + kind + ':' + o.id + '" aria-pressed="' + on + '"' + (open ? '' : ' disabled') + '>' +
        (on ? icon('check', 14) : open ? '' : icon('lock', 14)) + '<span>' + esc(o.name) + '</span>' + (open ? '' : '<span class="chip-pts">' + rw.need + ' jars</span>') + '</button>';
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
    var items = RU.JAR_REWARDS.map(function (rw) {
      return rewardItem(rw.name, rw.need + ' jars · +' + rw.bonus + ' points', !!S.rewards[rw.id], prog.jars + ' of ' + rw.need);
    }).join('') +
      rewardItem('Finish a row', 'Each row gets its own look · +500 points', rows === prog.rows.length, rows + ' of ' + prog.rows.length) +
      rewardItem('Gold rows', 'Every jar in a row at gold · +1000 points', golds === prog.rows.length, golds + ' of ' + prog.rows.length) +
      rewardItem('The Sky Jar', 'Fill your whole shelf · ' + RU.KEEPER + ' · +2000 points', !!S.rewards.full, prog.jars + ' of ' + prog.total);
    return miniShelf(bestJars(shelfIds())) +
      '<h3 class="h2">Shelves</h3>' + styleChips('wood', RU.WOODS) +
      '<h3 class="h2">Lights</h3>' + styleChips('lights', RU.LIGHTS) +
      '<h3 class="h2">Rewards</h3><ul class="rw-list">' + items + '</ul>' +
      '<p class="muted">Tap the name of a row on your shelf to see what it needs.</p>';
  }
  function openStyle() {
    showInfo({ label: 'Your shelf', title: 'Shelf style and rewards', body: styleBody() });
    collectPreview($('i-body'));
  }
  function setStyle(val) {
    var p = val.split(':');
    var kind = p[0], id = p[1];
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
      fitText(ctx, t.name, '800', 76, DISPLAY, maxW);
      ctx.fillText(t.name, lx + pad, y);
      y += 52;
      var kind = rlabel(id).toUpperCase() + (t.el === 'wonder' ? ' · SKY WONDER' : t.el === 'change' ? ' · CHANGE MOMENT' : '') + (e.n > 1 ? ' · ×' + e.n : '');
      ctx.fillStyle = INK_R[t.r];
      fitText(ctx, kind, '600', 26, MONO, maxW);
      ctx.fillText(kind, lx + pad, y);
      var where = rec ? (rec.where || rec.place || '') : '';
      var lines = [where, rec && rec.t ? dateLong(rec.t) : '', rec ? detailLine(rec) : ''].filter(Boolean);
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
    return 'Look what I caught' + (rec && rec.place ? ' in ' + rec.place : '') + ': ' + T(id).name + ' (' + rlabel(id) + '). Catch the weather where you are: ' + appUrl();
  }
  function prepareShare(id) {
    var e = S.book[id];
    if (!e || !e.n) { R.share = null; return; }
    var s = { id: id, rec: lastCatch(e), blob: null };
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
    R.previewJars = null;
    $('sheet').scrollTop = 0;
    $('game-view').hidden = name !== 'game';
    $('card-view').hidden = name !== 'card';
    if ($('reward-view')) $('reward-view').hidden = name !== 'reward';
    $('info-view').hidden = name !== 'info';
    $('sheet').setAttribute('aria-labelledby', name === 'game' ? 'g-title' : name === 'card' ? 'c-title' : name === 'reward' ? 'r-title' : 'i-title');
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
      var btns = $(R.view === 'card' ? 'c-actions' : R.view === 'reward' ? 'r-actions' : 'i-actions').querySelectorAll('button');
      var target = btns[btns.length - 1];
      if (target) try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }
  }
  function closeSheet() {
    $('overlay').hidden = true;
    R.game = null;
    R.cardState = null;
    R.previewJars = null;
    R.share = null;
    R.queue = [];
    R.view = null;
    clearTimeout(confTimer);
    if ($('confetti')) $('confetti').innerHTML = '';
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
        var still = stillHere && (kind === 'weather' ? R.cls && R.cls.ids.indexOf(id) !== -1 : kind === 'spotted' ? canSpot(id) : R.wonders.some(function (w) { return w.key === key; }));
        if (still) openGame(id, kind, key);
        else toast('The weather has changed. Have another look.');
      });
      return;
    }
    openGame(id, kind, key);
  }
  function openGame(id, kind, key) {
    var t = T(id);
    R.game = { id: id, kind: kind, key: key, areaId: R.area.id, g: WC.game.create({ id: id, night: R.reading ? !R.reading.isDay : false }), missHandled: false, why: kind === 'spotted' ? spotWhy(id) : '' };
    showView('game');
    $('g-label').textContent = kind === 'wonder' ? 'Sky Wonder' : kind === 'spotted' ? 'You spotted it' : 'Catch it';
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
      if (num(o.vis) !== undefined) rec.vis = Math.round(o.vis / 100) / 10;
      var elev = R.wx && R.wx.here ? num(R.wx.here.elevation) : undefined;
      if (elev !== undefined) rec.elev = Math.round(elev);
    }
    if (R.pos && typeof R.pos.alt === 'number' && now() - R.lastFix < 10 * MIN) rec.alt = Math.round(R.pos.alt);
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
    record(e, snapshot(areaId, how));
    var spotted = how === 'spotted';
    var pts = RU.points(id);
    S.points += pts;
    var tier = before < 15 && e.n >= 15 ? 'Gold' : before < 5 && e.n >= 5 ? 'Silver' : null;
    var r = { id: id, isNew: isNew, n: e.n, newPlace: newPlace && !isNew, place: place, pts: pts, tier: tier, verify: verify || '', spotted: spotted };
    var t = T(id);
    var lead = spotted ? (isNew ? 'Spotted a new jar: ' : 'Spotted: ') : isNew ? (t.el === 'change' ? 'Change moment: ' : t.el === 'wonder' ? 'Sky Wonder: ' : 'New jar: ') : '';
    addLog(lead + t.name + (isNew ? '' : ' again') + (place ? ' in ' + place : '') + (isNew ? ' (+' + pts + ')' : ' (×' + e.n + ', +' + pts + ')'));
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
    } else {
      list.push(awardOne(G.id, G.key, place, 'Matches the sky over ' + place + ' at ' + hm(t) + '.', 'sky', G.areaId));
    }
    afterAward(list, before);
  }
  /* after jars go on the shelf: any shelf rewards they've earned follow the jar cards */
  function afterAward(list, before) {
    var cards = list.concat(claimRewards());
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
    if (r.reward) { showReward(r); return; }
    var t = T(r.id);
    var e = S.book[r.id];
    showView('card');
    var label = r.trip ? 'From your trip' : r.spotted ? (r.isNew ? 'Spotted · New jar' : 'Spotted') : r.isNew ? (t.el === 'change' ? 'New Change moment' : t.el === 'wonder' ? 'New Sky Wonder' : 'New jar') : 'Caught again';
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
    var next = { label: R.queue.length ? 'Next' : 'Put it on the shelf', primary: true, fn: nextReveal };
    R.share = null;
    if (RU.rank(r.id) >= 3) {
      prepareShare(r.id);
      setActions('c-actions', [{ label: 'Share', fn: function () { doShare(nextReveal); } }, next]);
    } else setActions('c-actions', [next]);
    openSheet();
    if (r.lvUp) toast('Level ' + r.lvUp + '! ' + unlockText(r.lvUp));
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
    R.cardState = jarState('sky');
    setActions('c-actions', [{ label: 'Close', primary: true, fn: closeSheet }]);
    openSheet();
  }
  function openDetail(id) {
    if (id === 'sky') { openSkyDetail(); return; }
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
    R.share = null;
    if (n) {
      prepareShare(id);
      setActions('c-actions', [{ label: 'Share', fn: function () { doShare(closeSheet); } }, { label: 'Close', primary: true, fn: closeSheet }]);
    } else setActions('c-actions', [{ label: 'Close', primary: true, fn: closeSheet }]);
    openSheet();
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
        '<p class="muted">In this test version photos aren’t checked yet.</p>'
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
      var r = awardOne(id, key, place, 'Photo taken in ' + place + ' at ' + hm(now()) + ', when the weather made it possible.', 'photo', R.area ? R.area.id : '');
      var pk = 'p' + Date.now();
      S.book[id].photo = pk;
      lastCatch(S.book[id]).photo = pk;
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
    var w = snapshot(a.id, 'trip');
    var prev = (S.recent[a.id] || []).slice();
    var sealedHere = [];
    R.cls.ids.forEach(function (id) {
      var key = wKey(a.id, id);
      if (S.caught[key]) return;
      S.caught[key] = 2;
      S.haul.jars.push({ id: id, place: place, t: t, w: w });
      sealedHere.push(id);
    });
    if (sealedHere.length) {
      RU.changesFor(prev, R.cls.ids, R.reading ? R.reading.temp : 10, t).forEach(function (cid) {
        var ck = wKey(a.id, cid);
        if (S.caught[ck]) return;
        S.caught[ck] = 2;
        S.haul.jars.push({ id: cid, place: place, t: t, w: w });
      });
      prev = prev.filter(function (p) { return t - p.t <= 3 * HOUR; });
      sealedHere.forEach(function (id) { prev.push({ id: id, t: t }); });
      S.recent[a.id] = prev.slice(-8);
    }
    R.wonders.forEach(function (sw) {
      if (S.caught[sw.key]) return;
      S.caught[sw.key] = 2;
      S.haul.jars.push({ id: sw.id, place: place, t: t, w: w });
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
    h.jars.forEach(function (j) {
      if (T(j.id)) record(bookEntry(j.id), Object.assign({}, j.w || { t: j.t, how: 'trip', place: j.place }));
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
    if (R.tab === 'shelf') renderShelf();
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
      if (R.previewJars && R.view !== 'game') drawPreview(t);
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
    $('spot-btn').addEventListener('click', openSpot);
    $('i-body').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-photo]') : null;
      if (b) { takePhoto(b.getAttribute('data-photo')); return; }
      var sn = ev.target.closest ? ev.target.closest('[data-seen]') : null;
      if (sn && !sn.disabled && R.area) { beginCatch(sn.getAttribute('data-seen'), 'spotted', wKey(R.area.id, sn.getAttribute('data-seen'))); return; }
      var s = ev.target.closest ? ev.target.closest('[data-style]') : null;
      if (s && !s.disabled) setStyle(s.getAttribute('data-style'));
    });
    if ($('style-btn')) $('style-btn').addEventListener('click', openStyle);
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
      var row = ev.target.closest ? ev.target.closest('[data-row]') : null;
      if (row) { openRowInfo(row.getAttribute('data-row')); return; }
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
      if (R.tab === 'shelf') renderShelf();
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
    else if (S.onboarded) setTimeout(checkPendingRewards, 900);
    render();
    kick();
    setInterval(tick, 15000);
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
      refresh: function () { return refreshWeather(true); },
      evaluate: function () { evaluate(); render(); },
      pending: function () { checkPendingRewards(); },
      shelf: function () { renderShelf(); }
    };
  }

  boot();
})();
