/* FRZFRM Weather Catch: the rules.
   Weather types, areas, turning live weather data into catches, change moments,
   Sky Wonders and levels. Nothing in here touches the page, so it can be tested on its own. */
(function (root) {
  'use strict';
  var WC = root.WC = root.WC || {};
  var RAD = Math.PI / 180;
  var MIN = 60000, HOUR = 3600000, DAY = 86400000;

  /* ---------- rarity, elements and every catch ---------- */

  var RARITY = {
    common: { label: 'Common', rank: 1, points: 10 },
    uncommon: { label: 'Uncommon', rank: 2, points: 25 },
    rare: { label: 'Rare', rank: 3, points: 75 },
    epic: { label: 'Epic', rank: 4, points: 200 },
    legendary: { label: 'Legendary', rank: 5, points: 500 }
  };

  var ELEMENTS = [
    { id: 'sun', name: 'Sun' },
    { id: 'rain', name: 'Rain' },
    { id: 'frost', name: 'Frost' },
    { id: 'wind', name: 'Wind' },
    { id: 'storm', name: 'Storm' },
    { id: 'mist', name: 'Mist' },
    { id: 'wonder', name: 'Sky Wonders' },
    { id: 'change', name: 'Change moments' }
  ];

  /* how: auto = from live weather data, sky = from the sky calendar, photo = spotted with the camera,
     change = earned when the weather turns, later = not catchable in this version yet */
  var LIST = [
    ['sunnyspells', 'Sunny Spells', 'sun', 'common', 'auto', 'timing', 'Sun and cloud taking turns', 'Sun, then not sun, then sun again.'],
    ['clear', 'Clear Sky', 'sun', 'uncommon', 'auto', 'timing', 'No cloud, in daylight', 'Not one cloud. Enjoy it while it lasts.'],
    ['sunrise', 'Sunrise', 'sun', 'uncommon', 'auto', 'timing', 'Within 30 minutes after sunrise, sky not overcast', 'Up before the sun? Respect.'],
    ['goldenhour', 'Golden Hour', 'sun', 'rare', 'auto', 'timing', 'The last hour before sunset, sun showing', 'Everyone is a photographer for the next hour.'],
    ['hotday', 'Hot Day', 'sun', 'rare', 'auto', 'timing', '25°C or hotter', 'Shorts weather. Officially.'],
    ['heatwave', 'Heatwave', 'sun', 'epic', 'auto', 'timing', '30°C or hotter', 'The tarmac is soft.'],
    ['scorcher', 'Scorcher', 'sun', 'legendary', 'auto', 'timing', '35°C or hotter', 'Someone has fried an egg on a car bonnet.'],

    ['drizzle', 'Drizzle', 'rain', 'common', 'auto', 'scoop', 'Light drizzle', 'Technically rain. Umbrella effectiveness: 12%.'],
    ['rain', 'Rain', 'rain', 'common', 'auto', 'scoop', 'Steady rain', 'Puddles are now in play.'],
    ['showers', 'Showers', 'rain', 'uncommon', 'auto', 'scoop', 'Bursts of rain with dry spells between', 'Coat on. Coat off. Coat on.'],
    ['downpour', 'Downpour', 'rain', 'rare', 'auto', 'scoop', 'Heavy rain', 'Wipers on full. Still can’t see.'],
    ['sidewaysrain', 'Sideways Rain', 'rain', 'rare', 'auto', 'scoop', 'Rain with gusts of 40 mph or more', 'Umbrellas have left the chat.'],
    ['cloudburst', 'Cloudburst', 'rain', 'epic', 'auto', 'scoop', 'Rain heavier than 25 mm an hour', 'The sky just emptied a bath on you.'],
    ['monsoon', 'Monsoon', 'rain', 'legendary', 'auto', 'scoop', 'Heavy rain in the tropics', 'Warm rain, and lots of it.'],

    ['frost', 'Frost', 'frost', 'common', 'auto', 'timing', '0°C or colder, and dry', 'Car windscreen: scraped.'],
    ['sleet', 'Sleet', 'frost', 'uncommon', 'auto', 'scoop', 'Rain and snow falling together', 'Rain that’s thinking about being snow.'],
    ['hardfrost', 'Hard Frost', 'frost', 'uncommon', 'auto', 'timing', '−5°C or colder, and dry', 'Even the puddles are frozen solid.'],
    ['hail', 'Hail', 'frost', 'rare', 'auto', 'scoop', 'Hail falling in a storm', 'Frozen peas, delivered from above.'],
    ['snow', 'Snow', 'frost', 'rare', 'auto', 'scoop', 'Snow falling', 'Bread and milk will sell out.'],
    ['freezingrain', 'Freezing Rain', 'frost', 'epic', 'auto', 'scoop', 'Rain freezing as it lands', 'Every pavement is now an ice rink.'],
    ['heavysnow', 'Heavy Snow', 'frost', 'epic', 'auto', 'scoop', 'Heavy snow falling', 'Schools may close.'],
    ['blizzard', 'Blizzard', 'frost', 'legendary', 'auto', 'scoop', 'Heavy snow with gusts of 40 mph or more', 'You can’t see your own wellies.'],

    ['breeze', 'Breeze', 'wind', 'common', 'auto', 'timing', 'A steady breeze of 13 mph or more', 'Washing-line weather.'],
    ['windy', 'Windy', 'wind', 'uncommon', 'auto', 'timing', 'Gusts of 30 mph or more', 'Hair: ruined. Bins: on the move.'],
    ['gale', 'Gale', 'wind', 'rare', 'auto', 'timing', 'Gusts of 50 mph or more', 'Trampolines are leaving gardens.'],
    ['stormforce', 'Storm Force', 'wind', 'epic', 'auto', 'timing', 'Gusts of 65 mph or more', 'Fences are now optional.'],
    ['namedstorm', 'Named Storm', 'wind', 'legendary', 'later', 'timing', 'During a named storm. Comes with Storm events in a later version', 'It has a name. That’s never good.'],
    ['tornado', 'Tornado', 'wind', 'legendary', 'later', 'timing', 'An official tornado report for your area. Comes in a later version', 'Rare in the UK, and you’d stay well indoors.'],

    ['rumble', 'Rumble', 'storm', 'uncommon', 'auto', 'flash', 'Thunder in an area next to yours', 'Count the seconds between flash and rumble.'],
    ['sheetlightning', 'Sheet Lightning', 'storm', 'uncommon', 'photo', 'photo', 'A photo of a flash while there’s thunder nearby', 'The whole sky blinks.'],
    ['thunderstorm', 'Thunderstorm', 'storm', 'rare', 'auto', 'flash', 'A thunderstorm in your area', 'The dog is under the bed.'],
    ['lightningstrike', 'Lightning Strike', 'storm', 'epic', 'auto', 'flash', 'A thunderstorm with heavy rain right over your area', 'Flash and bang at the same time. Stay indoors.'],
    ['supercell', 'Supercell', 'storm', 'legendary', 'auto', 'flash', 'A thunderstorm with heavy hail or gusts of 50 mph or more', 'The biggest storm cloud you’ll ever see.'],
    ['thundersnow', 'Thundersnow', 'storm', 'legendary', 'auto', 'flash', 'Thunder while it’s snowing', 'Thunder. In a blizzard. Tell everyone.'],

    ['overcast', 'Overcast', 'mist', 'common', 'auto', 'hold', 'A fully cloudy sky', 'You’ll have 40 of these by Christmas.'],
    ['mist', 'Mist', 'mist', 'common', 'auto', 'hold', 'Mist, with under 5 km of visibility', 'Everything looks like a film set.'],
    ['fog', 'Fog', 'mist', 'uncommon', 'auto', 'hold', 'Fog, with under 1 km of visibility', 'You can’t see the end of the road.'],
    ['lowcloud', 'Low Cloud', 'mist', 'uncommon', 'auto', 'hold', 'Fog on high ground', 'The hills have their heads in the clouds.'],
    ['seafret', 'Sea Fret', 'mist', 'rare', 'auto', 'hold', 'Fog on the coast. Called haar in Scotland', 'The sea has rolled in as fog.'],
    ['freezingfog', 'Freezing Fog', 'mist', 'epic', 'auto', 'hold', 'Fog below 0°C', 'Every twig is coated in ice.'],
    ['cloudinversion', 'Cloud Inversion', 'mist', 'legendary', 'photo', 'photo', 'A photo of a sea of cloud below you, from high ground', 'You’re above the clouds. Literally.'],

    ['starry', 'Starry Night', 'wonder', 'uncommon', 'sky', 'timing', 'A clear night sky', 'Clear and dark. Look up.'],
    ['fullmoon', 'Full Moon', 'wonder', 'uncommon', 'sky', 'timing', 'A full moon on a fairly clear night', 'Bright enough to read by. Almost.'],
    ['meteor', 'Meteor Shower', 'wonder', 'rare', 'sky', 'timing', 'A meteor shower night with a clear sky', 'Make a wish. Make several.'],
    ['sunhalo', 'Sun Halo', 'wonder', 'rare', 'photo', 'photo', 'A photo of a ring around the sun', 'A ring around the sun. Rain might follow.'],
    ['supermoon', 'Supermoon', 'wonder', 'rare', 'sky', 'timing', 'A supermoon on a fairly clear night', 'The moon is closer than usual, and it shows.'],
    ['rainbow', 'Rainbow', 'wonder', 'epic', 'photo', 'photo', 'A photo of a rainbow when sun and showers meet', 'Proof the rain was worth it.'],
    ['sundog', 'Sun Dog', 'wonder', 'epic', 'photo', 'photo', 'A photo of bright patches either side of the sun', 'Two pretend suns either side of the real one.'],
    ['fogbow', 'Fogbow', 'wonder', 'epic', 'photo', 'photo', 'A photo of a white rainbow in fog', 'A rainbow that forgot its colours.'],
    ['doublerainbow', 'Double Rainbow', 'wonder', 'legendary', 'photo', 'photo', 'A photo of two rainbows at once', 'Two rainbows. Twice the luck.'],
    ['moonbow', 'Moonbow', 'wonder', 'legendary', 'photo', 'photo', 'A photo of a rainbow at night under a bright moon', 'A rainbow by moonlight. Hardly anyone sees one.'],
    ['aurora', 'Northern Lights', 'wonder', 'legendary', 'photo', 'photo', 'A photo of the Northern Lights on a clear night', 'The sky has gone green. Wake everyone up.'],
    ['eclipse', 'Eclipse', 'wonder', 'legendary', 'sky', 'timing', 'During an eclipse you can see from where you are', 'The moon got in the way. On purpose.'],

    ['sunbreak', 'Sunbreak', 'change', 'rare', 'change', null, 'Catch rain, then be there in the same area when the sun comes out', 'The moment the rain gives up.'],
    ['foglifts', 'Fog Lifts', 'change', 'rare', 'change', null, 'Catch fog or mist, then be there when it clears', 'And there’s the view.'],
    ['thaw', 'Thaw', 'change', 'rare', 'change', null, 'Catch snow or ice, then be there when it turns to rain or sun', 'Drip, drip, drip.'],
    ['winddrops', 'Wind Drops', 'change', 'rare', 'change', null, 'Catch a gale, then be there when it dies down', 'You can hear the birds again.'],
    ['firstflakes', 'First Flakes', 'change', 'epic', 'change', null, 'Catch any weather, then be there in the same area when snow starts', 'Everyone stops and looks up.'],
    ['stormfront', 'Storm Front', 'change', 'epic', 'change', null, 'Catch any weather, then be there in the same area when a storm arrives', 'The sky changed its mind, loudly.'],
    ['calm', 'Calm After the Storm', 'change', 'epic', 'change', null, 'Catch a storm, then be there when the sky clears', 'Everything smells of rain.']
  ];

  var TYPES = {};
  var ORDERED = [];
  LIST.forEach(function (r, i) {
    var t = { id: r[0], name: r[1], el: r[2], r: r[3], how: r[4], game: r[5], when: r[6], line: r[7], order: i };
    TYPES[t.id] = t;
    ORDERED.push(t);
  });

  function type(id) { return TYPES[id] || null; }
  function rank(id) { var t = TYPES[id]; return t ? RARITY[t.r].rank : 0; }
  function points(id) { var t = TYPES[id]; return t ? RARITY[t.r].points : 0; }

  /* ---------- areas: a grid of cells about 5 km across ---------- */

  var CELL = 0.045; // degrees of latitude, about 5 km
  function stepFor(cLat) { return CELL / Math.max(0.2, Math.cos(cLat * RAD)); }
  function cell(iy, ix) {
    var cLat = (iy + 0.5) * CELL;
    var step = stepFor(cLat);
    return { id: iy + '_' + ix, iy: iy, ix: ix, lat: cLat, lon: (ix + 0.5) * step };
  }
  function areaOf(lat, lon) {
    var iy = Math.floor(lat / CELL);
    var step = stepFor((iy + 0.5) * CELL);
    return cell(iy, Math.floor(lon / step));
  }
  var DIRS = [['North-west', 'North', 'North-east'], ['West', 'Here', 'East'], ['South-west', 'South', 'South-east']];
  /* the 3 x 3 block of areas around an area, north row first */
  function neighbours(a) {
    var out = [];
    for (var row = 0; row < 3; row++) {
      var iy = a.iy + 1 - row;
      for (var col = 0; col < 3; col++) {
        var dx = col - 1;
        var c;
        if (row === 1 && dx === 0) c = cell(a.iy, a.ix);
        else {
          var step = stepFor((iy + 0.5) * CELL);
          c = cell(iy, Math.floor(a.lon / step) + dx);
        }
        c.dir = DIRS[row][col];
        c.here = row === 1 && dx === 0;
        out.push(c);
      }
    }
    return out;
  }

  /* ---------- turning live weather into catches ---------- */

  var CODES = {
    drizzle: [51, 53, 55], freezing: [56, 57, 66, 67], rain: [61, 63], heavyRain: [65],
    snow: [71, 73, 77, 85], heavySnow: [75, 86], showers: [80, 81], violent: [82],
    thunder: [95, 96, 97, 99], hail: [96, 99], fog: [45, 48]
  };
  function has(list, code) { return list.indexOf(code) !== -1; }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function isRainCode(c) {
    return has(CODES.drizzle, c) || has(CODES.rain, c) || has(CODES.heavyRain, c) || has(CODES.showers, c) || has(CODES.violent, c);
  }

  var FACETS = ['storm', 'precip', 'fog', 'wind', 'heat', 'frost', 'light', 'sky'];
  var FACET_OF = {};
  [
    ['storm', ['rumble', 'thunderstorm', 'lightningstrike', 'supercell', 'thundersnow']],
    ['precip', ['drizzle', 'rain', 'showers', 'downpour', 'sidewaysrain', 'cloudburst', 'monsoon', 'sleet', 'hail', 'snow', 'freezingrain', 'heavysnow', 'blizzard']],
    ['fog', ['mist', 'fog', 'lowcloud', 'seafret', 'freezingfog']],
    ['wind', ['breeze', 'windy', 'gale', 'stormforce']],
    ['heat', ['hotday', 'heatwave', 'scorcher']],
    ['frost', ['frost', 'hardfrost']],
    ['light', ['sunrise', 'goldenhour']],
    ['sky', ['clear', 'sunnyspells', 'overcast']]
  ].forEach(function (f) { f[1].forEach(function (id) { FACET_OF[id] = f[0]; }); });

  /* o: one reading of the weather for an area.
       t (ms), interval (s), temp (°C), humidity (%), isDay, rain, showers (mm), snowfall (cm),
       code (WMO weather code), cloud, cloudLow, cloudHigh (%), wind, gusts (mph), vis (m)
     ctx: lat, elevation (m), coastal, thunderNearby, sunrise, sunset (ms)
     Returns every kind of weather happening now, rarest first. */
  function classify(o, ctx) {
    ctx = ctx || {};
    var code = num(o.code, -1);
    var temp = num(o.temp, 10);
    var gusts = num(o.gusts, 0);
    var wind = num(o.wind, 0);
    var cloud = num(o.cloud, code === 0 ? 0 : 50);
    var interval = num(o.interval, 900) || 900;
    var per = 3600 / interval;
    var wet = num(o.rain, 0) + num(o.showers, 0);
    var rate = wet * per;
    var snowfall = num(o.snowfall, 0);
    var snowRate = snowfall * per;
    var snowing = snowfall > 0;
    var vis = typeof o.vis === 'number' && isFinite(o.vis) ? o.vis : null;
    var hum = typeof o.humidity === 'number' && isFinite(o.humidity) ? o.humidity : null;
    var lat = num(ctx.lat, 50);
    var elev = num(ctx.elevation, 50);
    var thunder = has(CODES.thunder, code);
    var plainSky = code >= 0 && code <= 3;
    var out = { storm: null, precip: null, fog: null, wind: null, heat: null, frost: null, light: null, sky: null };
    var windUsed = false;

    if (thunder) {
      if (snowing || temp <= 1) out.storm = 'thundersnow';
      else if (code === 99 || gusts >= 50) out.storm = 'supercell';
      else if (code === 97 || rate >= 10) out.storm = 'lightningstrike';
      else out.storm = 'thunderstorm';
    } else if (ctx.thunderNearby) {
      out.storm = 'rumble';
    }

    var p = null;
    if (has(CODES.hail, code)) p = 'hail';
    else if (has(CODES.freezing, code)) p = 'freezingrain';
    else if (out.storm !== 'thundersnow') {
      if (has(CODES.heavySnow, code) || snowRate >= 2) p = 'heavysnow';
      else if (snowing && wet >= 0.05) p = 'sleet';
      else if (has(CODES.snow, code) || snowing) p = 'snow';
      else if (!thunder && (isRainCode(code) || (plainSky && wet >= 0.09))) {
        /* any measurable rain counts, even when the weather code only says cloudy */
        if (Math.abs(lat) <= 23.5 && (rate >= 8 || has(CODES.heavyRain, code) || has(CODES.violent, code))) p = 'monsoon';
        else if (rate >= 25) p = 'cloudburst';
        else if (has(CODES.heavyRain, code) || has(CODES.violent, code) || rate >= 8) p = 'downpour';
        else if (has(CODES.showers, code)) p = 'showers';
        else if (has(CODES.drizzle, code) || (plainSky && rate < 1)) p = 'drizzle';
        else p = 'rain';
      }
    }
    if ((p === 'drizzle' || p === 'rain' || p === 'showers' || p === 'downpour') && gusts >= 40) { p = 'sidewaysrain'; windUsed = true; }
    if ((p === 'heavysnow' && gusts >= 40) || (p === 'snow' && gusts >= 50)) { p = 'blizzard'; windUsed = true; }
    out.precip = p;

    if (!windUsed) {
      if (gusts >= 65) out.wind = 'stormforce';
      else if (gusts >= 50) out.wind = 'gale';
      else if (gusts >= 30) out.wind = 'windy';
      else if (wind >= 13) out.wind = 'breeze';
    }

    var dry = !out.precip && !(out.storm && out.storm !== 'rumble');
    if (dry) {
      var fogLike = has(CODES.fog, code) || (vis !== null && vis < 1000);
      var mistLike = !fogLike && vis !== null && vis < 5000 && (hum === null || hum >= 85);
      if (fogLike) {
        if (temp < 0 || code === 48) out.fog = 'freezingfog';
        else if (ctx.coastal && elev < 50) out.fog = 'seafret';
        else if (elev >= 300) out.fog = 'lowcloud';
        else out.fog = 'fog';
      } else if (mistLike) {
        out.fog = 'mist';
      }
    }

    if (temp >= 35) out.heat = 'scorcher';
    else if (temp >= 30) out.heat = 'heatwave';
    else if (temp >= 25) out.heat = 'hotday';

    if (dry && out.fog !== 'freezingfog') {
      if (temp <= -5) out.frost = 'hardfrost';
      else if (temp <= 0) out.frost = 'frost';
    }

    if (dry && !out.fog) {
      if (o.isDay) {
        if (plainSky ? (code === 0 || (code === 1 && cloud < 25)) : cloud < 12) out.sky = 'clear';
        else if (plainSky ? code <= 2 : cloud < 80) out.sky = 'sunnyspells';
        else out.sky = 'overcast';
        if (out.sky !== 'overcast' && ctx.sunrise && ctx.sunset && o.t) {
          if (o.t >= ctx.sunrise && o.t < ctx.sunrise + 30 * MIN) out.light = 'sunrise';
          else if (o.t >= ctx.sunset - 60 * MIN && o.t < ctx.sunset) out.light = 'goldenhour';
        }
      } else if (plainSky ? code === 3 : cloud >= 80) {
        out.sky = 'overcast';
      }
    }

    var ids = [];
    FACETS.forEach(function (f) { if (out[f]) ids.push(out[f]); });
    ids.sort(function (a, b) { return rank(b) - rank(a) || FACETS.indexOf(FACET_OF[a]) - FACETS.indexOf(FACET_OF[b]); });
    return { ids: ids, headline: ids[0] || null, facets: out };
  }

  /* ---------- change moments ---------- */

  var FAM = {
    rain: ['drizzle', 'rain', 'showers', 'downpour', 'sidewaysrain', 'cloudburst', 'monsoon'],
    sun: ['clear', 'sunnyspells', 'sunrise', 'goldenhour'],
    fog: ['mist', 'fog', 'lowcloud', 'seafret', 'freezingfog'],
    ice: ['snow', 'heavysnow', 'blizzard', 'sleet', 'freezingrain', 'frost', 'hardfrost', 'freezingfog', 'thundersnow'],
    snow: ['snow', 'heavysnow', 'blizzard', 'thundersnow'],
    gale: ['gale', 'stormforce', 'blizzard', 'sidewaysrain'],
    storm: ['thunderstorm', 'lightningstrike', 'supercell', 'thundersnow', 'hail'],
    sky: ['clear', 'sunnyspells', 'overcast']
  };
  function anyIn(ids, fam) { for (var i = 0; i < ids.length; i++) if (fam.indexOf(ids[i]) !== -1) return true; return false; }

  /* prev: what was caught in this area in the last 3 hours, [{id, t}]
     now: every kind of weather happening now (classify().ids); temp in °C
     Returns the change moments this catch earns. */
  function changesFor(prev, now, temp, t) {
    var recent = (prev || []).filter(function (p) { return t - p.t <= 3 * HOUR && t - p.t >= 0; }).map(function (p) { return p.id; });
    if (!recent.length) return [];
    var out = [];
    var sunNow = anyIn(now, FAM.sun);
    if (anyIn(recent, FAM.rain) && !anyIn(now, FAM.rain) && sunNow) out.push('sunbreak');
    if (anyIn(recent, FAM.fog) && !anyIn(now, FAM.fog) && anyIn(now, FAM.sky)) out.push('foglifts');
    if (anyIn(recent, FAM.ice) && !anyIn(now, FAM.ice) && num(temp, 0) > 0 && (anyIn(now, FAM.rain) || sunNow)) out.push('thaw');
    if (anyIn(recent, FAM.gale) && !anyIn(now, FAM.gale)) out.push('winddrops');
    if (!anyIn(recent, FAM.snow) && anyIn(now, FAM.snow)) out.push('firstflakes');
    if (!anyIn(recent, FAM.storm) && anyIn(now, FAM.storm)) out.push('stormfront');
    if (anyIn(recent, FAM.storm) && !anyIn(now, FAM.storm) && sunNow) out.push('calm');
    return out;
  }

  /* ---------- spotting weather the data missed ----------
     The data covers a whole area every 15 minutes, so it can miss a passing shower or a patch of fog.
     A player who can see one can catch it, as long as the weather around them makes it possible:
     in their area this hour or the last one, in an area next door, or air damp enough for it.
     o: the reading now. hours: hourly readings for the last hour and this hour.
     near: what the areas next door have now { rain, showers, snow, hail, thunder, fog }.
     Returns [{ id, possible, why }] in the order they're offered. */
  var SPOTTABLE = ['drizzle', 'rain', 'showers', 'sleet', 'snow', 'hail', 'mist', 'fog'];
  function wetIn(r) { return isRainCode(num(r.code, -1)) || num(r.rain, 0) + num(r.showers, 0) >= 0.09; }
  function showeryIn(r) { var c = num(r.code, -1); return has(CODES.showers, c) || has(CODES.violent, c) || num(r.showers, 0) >= 0.09; }
  function snowIn(r) { var c = num(r.code, -1); return has(CODES.snow, c) || has(CODES.heavySnow, c) || num(r.snowfall, 0) > 0; }
  function hailIn(r) { return has(CODES.hail, num(r.code, -1)); }
  function stormIn(r) { return has(CODES.thunder, num(r.code, -1)); }
  function fogIn(r) { return has(CODES.fog, num(r.code, -1)) || (typeof r.vis === 'number' && r.vis < 1000); }
  function spottable(o, ctx, hours, near) {
    hours = hours || [];
    near = near || {};
    var temp = num(o.temp, 10);
    var hum = num(o.humidity, 0);
    var cloud = num(o.cloud, 50);
    var vis = typeof o.vis === 'number' && isFinite(o.vis) ? o.vis : null;
    var wind = num(o.wind, 0);
    var all = [o].concat(hours);
    function about(test) { return all.some(test); }
    var rainWhy = about(wetIn) ? 'There’s rain about in your area this hour.' : near.rain ? 'It’s raining in an area next to yours.' : null;
    var snowWhy = about(snowIn) ? 'There’s snow about in your area this hour.' : near.snow ? 'It’s snowing in an area next to yours.' : null;
    var showery = about(showeryIn) || near.showers || cloud < 85;
    var out = [];
    function add(id, why, whyNot) { out.push({ id: id, possible: !!why, why: why || whyNot }); }

    var damp = cloud >= 70 && hum >= 80;
    add('drizzle', rainWhy || (damp ? 'It’s grey and damp enough for drizzle.' : null),
      cloud < 70 ? 'The sky is too clear for drizzle right now.' : 'The air is too dry for drizzle right now.');
    add('rain', rainWhy, damp ? 'There’s no rain about near you, but it’s damp enough to catch Drizzle.' : 'There’s no rain about anywhere near you right now.');
    add('showers', rainWhy && showery ? rainWhy : null,
      rainWhy ? 'The rain about is steady rain, not showers that come and go.' : 'There’s no rain about anywhere near you right now.');
    var wetOrSnowy = rainWhy || snowWhy;
    add('sleet', wetOrSnowy && temp <= 4 ? 'It’s cold enough for rain and snow to fall together.' : null,
      temp > 4 ? 'It’s too warm for sleet.' : 'There’s no rain or snow about near you right now.');
    add('snow', snowWhy || (rainWhy && temp <= 1 ? 'It’s cold enough for the rain about to fall as snow.' : null),
      temp > 3 ? 'It’s too warm for snow.' : 'There’s no snow about near you right now.');
    add('hail', about(hailIn) || near.hail ? 'There’s hail about near you.' : about(stormIn) || near.thunder ? 'There are storms about, and storms can bring hail.' : null,
      'Hail comes with storms, and there are none near you right now.');
    var fogWhy = about(fogIn) ? 'There’s fog about in your area this hour.' : near.fog ? 'There’s fog in an area next to yours.' : null;
    add('mist', fogWhy || (hum >= 85 ? 'The air is damp enough for mist.' : vis !== null && vis < 8000 ? 'It’s hazy enough for mist.' : null),
      'The air is too dry for mist right now.');
    add('fog', fogWhy || (vis !== null && vis < 2000 ? 'It’s murky enough for fog.' : hum >= 97 && wind < 8 ? 'The air is damp and still enough for fog.' : null),
      'There’s no fog about, and the air is too dry for it.');
    return out;
  }

  /* ---------- sun and moon ---------- */

  function julian(t) { return t / DAY + 2440587.5; }
  function fromJulian(jd) { return (jd - 2440587.5) * DAY; }
  function norm(deg) { deg = deg % 360; return deg < 0 ? deg + 360 : deg; }

  /* height of the sun above the horizon in degrees (accurate to about a degree) */
  function sunElevation(t, lat, lon) {
    var n = julian(t) - 2451545.0;
    var L = norm(280.460 + 0.9856474 * n);
    var g = norm(357.528 + 0.9856003 * n) * RAD;
    var lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
    var eps = (23.439 - 0.0000004 * n) * RAD;
    var dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
    var ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
    var gmst = norm(280.46061837 + 360.98564736629 * n);
    var ha = (gmst + lon) * RAD - ra;
    var alt = Math.asin(Math.sin(lat * RAD) * Math.sin(dec) + Math.cos(lat * RAD) * Math.cos(dec) * Math.cos(ha));
    return alt / RAD;
  }

  /* time of the full moon for lunation k + 0.5 (Meeus, Astronomical Algorithms, ch. 49) */
  function fullMoonAt(k) {
    var T = k / 1236.85;
    var jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T * T * T;
    var E = 1 - 0.002516 * T - 0.0000074 * T * T;
    var M = norm(2.5534 + 29.1053567 * k - 0.0000014 * T * T) * RAD;
    var Mp = norm(201.5643 + 385.81693528 * k + 0.0107582 * T * T) * RAD;
    var F = norm(160.7108 + 390.67050284 * k - 0.0016118 * T * T) * RAD;
    var Om = norm(124.7746 - 1.56375588 * k + 0.0020672 * T * T) * RAD;
    var s = Math.sin;
    jde += -0.40614 * s(Mp) + 0.17302 * E * s(M) + 0.01614 * s(2 * Mp) + 0.01043 * s(2 * F) +
      0.00734 * E * s(Mp - M) - 0.00515 * E * s(Mp + M) + 0.00209 * E * E * s(2 * M) -
      0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) + 0.00056 * E * s(2 * Mp + M) -
      0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F) -
      0.00024 * E * s(2 * Mp - M) - 0.00017 * s(Om);
    return fromJulian(jde - 69 / 86400);
  }
  function nearestFullMoon(t) {
    var k0 = Math.floor((julian(t) - 2451550.09766) / 29.530588861) - 1;
    var best = null;
    for (var k = k0; k <= k0 + 2; k++) {
      var fm = fullMoonAt(k + 0.5);
      if (best === null || Math.abs(fm - t) < Math.abs(best - t)) best = fm;
    }
    return best;
  }
  function moonArgs(t) {
    var T = (julian(t) - 2451545) / 36525;
    return {
      T: T,
      D: norm(297.8501921 + 445267.1114034 * T) * RAD,
      M: norm(357.5291092 + 35999.0502909 * T) * RAD,
      Mp: norm(134.9633964 + 477198.8675055 * T) * RAD,
      F: norm(93.2720950 + 483202.0175233 * T) * RAD,
      E: 1 - 0.002516 * T - 0.0000074 * T * T
    };
  }
  /* distance from the Earth to the Moon in km (main terms of Meeus ch. 47) */
  function moonDistance(t) {
    var a = moonArgs(t);
    var D = a.D, M = a.M, Mp = a.Mp, F = a.F, E = a.E, c = Math.cos;
    var r = -20905355 * c(Mp) - 3699111 * c(2 * D - Mp) - 2955968 * c(2 * D) - 569925 * c(2 * Mp) +
      48888 * E * c(M) - 3149 * c(2 * F) + 246158 * c(2 * D - 2 * Mp) - 152138 * E * c(2 * D - M - Mp) -
      170733 * c(2 * D + Mp) - 204586 * E * c(2 * D - M) - 129620 * E * c(M - Mp) + 108743 * c(D) +
      104755 * E * c(M + Mp) + 10321 * c(2 * D - 2 * F) + 79661 * c(Mp - 2 * F) - 34782 * c(4 * D - Mp) -
      23210 * c(3 * Mp) - 21636 * c(4 * D - 2 * Mp) + 24208 * E * c(2 * D + M - Mp) + 30824 * E * c(2 * D + M);
    return 385000.56 + r / 1000;
  }
  function isSupermoon(fullMoonTime) { return moonDistance(fullMoonTime) < 362500; }
  /* how much of the Moon is lit, 0 to 1 */
  function moonIllumination(t) {
    var a = moonArgs(t);
    var i = 180 - a.D / RAD - 6.289 * Math.sin(a.Mp) + 2.1 * Math.sin(a.M) - 1.274 * Math.sin(2 * a.D - a.Mp) -
      0.658 * Math.sin(2 * a.D) - 0.214 * Math.sin(2 * a.Mp) - 0.11 * Math.sin(a.D);
    return (1 + Math.cos(i * RAD)) / 2;
  }

  /* ---------- the sky calendar ---------- */

  var SHOWERS = [
    { id: 'quadrantids', name: 'Quadrantids', m: 1, d: 3 },
    { id: 'lyrids', name: 'Lyrids', m: 4, d: 22 },
    { id: 'etaaquariids', name: 'Eta Aquariids', m: 5, d: 5 },
    { id: 'perseids', name: 'Perseids', m: 8, d: 12 },
    { id: 'orionids', name: 'Orionids', m: 10, d: 21 },
    { id: 'leonids', name: 'Leonids', m: 11, d: 17 },
    { id: 'geminids', name: 'Geminids', m: 12, d: 13 }
  ];
  /* which meteor shower (if any) peaks tonight, give or take a night */
  function meteorShower(t) {
    var n = new Date(t - 12 * HOUR);
    var y = n.getFullYear();
    var nightStart = new Date(y, n.getMonth(), n.getDate()).getTime();
    for (var i = 0; i < SHOWERS.length; i++) {
      var s = SHOWERS[i];
      var peak = new Date(y, s.m - 1, s.d).getTime();
      if (Math.abs(nightStart - peak) <= 1.5 * DAY) return { id: s.id, name: s.name, year: y };
    }
    return null;
  }
  var ECLIPSES = [
    { id: '2027-08-02', name: 'partial solar eclipse', kind: 'solar', start: Date.UTC(2027, 7, 2, 7, 30), end: Date.UTC(2027, 7, 2, 12, 45), box: [-5, 72, -30, 60] },
    { id: '2028-01-12', name: 'partial lunar eclipse', kind: 'lunar', start: Date.UTC(2028, 0, 12, 3, 44), end: Date.UTC(2028, 0, 12, 4, 42), box: [-70, 85, -170, 60] },
    { id: '2028-12-31', name: 'total lunar eclipse', kind: 'lunar', start: Date.UTC(2028, 11, 31, 15, 7), end: Date.UTC(2028, 11, 31, 18, 37), box: [-70, 85, -25, 180] }
  ];
  function eclipseNow(t, lat, lon) {
    for (var i = 0; i < ECLIPSES.length; i++) {
      var e = ECLIPSES[i];
      if (t >= e.start && t <= e.end && lat >= e.box[0] && lat <= e.box[1] && lon >= e.box[2] && lon <= e.box[3]) return e;
    }
    return null;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function nightKey(t) { return dayKey(t - 12 * HOUR); }

  /* Sky Wonders the calendar says are up there right now, for a clear enough sky */
  function wonders(o, ctx) {
    ctx = ctx || {};
    var out = [];
    var code = num(o.code, -1);
    var calm = code >= 0 && code <= 3;
    var cloud = num(o.cloud, 50);
    var night = !o.isDay;
    var t = o.t;
    if (night && calm && cloud < 25) out.push({ id: 'starry', key: 'starry|' + nightKey(t) });
    var fm = nearestFullMoon(t);
    if (night && calm && cloud < 60 && Math.abs(t - fm) <= 30 * HOUR) {
      out.push({ id: 'fullmoon', key: 'fullmoon|' + dayKey(fm) });
      if (isSupermoon(fm)) out.push({ id: 'supermoon', key: 'supermoon|' + dayKey(fm) });
    }
    var ms = meteorShower(t);
    if (ms && night && calm && cloud < 40) out.push({ id: 'meteor', key: 'meteor|' + ms.id + '|' + ms.year, note: 'The ' + ms.name + ' are at their best tonight.' });
    var ec = eclipseNow(t, num(ctx.lat, 0), num(ctx.lon, 0));
    if (ec && cloud < 85 && (ec.kind === 'solar' ? o.isDay : true)) out.push({ id: 'eclipse', key: 'eclipse|' + ec.id, note: 'A ' + ec.name + ' is happening now. Never look straight at the sun.' });
    return out;
  }

  /* photo catches, and whether the weather makes each one possible right now
     ctx.near: { rain, showers, fog, thunder, lowerFog } from the areas around you */
  function spots(o, ctx) {
    ctx = ctx || {};
    var near = ctx.near || {};
    var lat = num(ctx.lat, 50), lon = num(ctx.lon, 0), elev = num(ctx.elevation, 50);
    var code = num(o.code, -1);
    var cloud = num(o.cloud, 50);
    var vis = typeof o.vis === 'number' && isFinite(o.vis) ? o.vis : null;
    var sunEl = sunElevation(o.t, lat, lon);
    var day = !!o.isDay && sunEl > 0;
    var rainHere = isRainCode(code) || (num(o.rain, 0) + num(o.showers, 0)) > 0.05;
    var showersHere = has(CODES.showers, code) || has(CODES.violent, code);
    var fogHere = has(CODES.fog, code) || (vis !== null && vis < 1000);
    var mistHere = !fogHere && vis !== null && vis < 5000;
    var thunderHere = has(CODES.thunder, code);
    var wetHere = rainHere || num(o.snowfall, 0) > 0 || thunderHere || has(CODES.freezing, code);
    var out = [];
    function add(id, ok, yes, no) { out.push({ id: id, possible: !!ok, why: ok ? yes : no }); }

    var bow = day && sunEl < 42 && cloud < 90 && (showersHere || (rainHere && cloud < 75) || (!rainHere && cloud < 70 && near.rain));
    var bowNo = !day ? 'Rainbows need the sun.' : sunEl >= 42 ? 'The sun is too high for a rainbow right now.' : 'You need sun and showers at the same time.';
    add('rainbow', bow, 'Sun and showers: stand with the sun behind you and look for the bow.', bowNo);
    add('doublerainbow', bow, 'Bright rainbows sometimes have a fainter second bow outside them.', bowNo);
    var halo = day && sunEl > 5 && !wetHere && !fogHere && (typeof o.cloudHigh === 'number' ? (o.cloudHigh >= 25 && num(o.cloudLow, 0) < 50) : (cloud >= 20 && cloud <= 90));
    add('sunhalo', halo, 'Thin high cloud is in front of the sun. Look for a ring, but never look straight at the sun.', 'Halos need thin, high cloud in front of the sun.');
    add('sundog', halo && sunEl < 40, 'Look for bright patches either side of a low sun. Never look straight at it.', 'Sun dogs need thin high cloud and a low sun.');
    add('fogbow', day && (fogHere || mistHere || near.fog), 'Fog with the sun behind you: look for a pale white arc.', 'Fogbows need fog or mist with the sun out.');
    var moon = moonIllumination(o.t);
    add('moonbow', !o.isDay && moon >= 0.85 && cloud < 90 && (showersHere || near.showers),'A bright moon and showers: look away from the moon for a pale bow.', 'Moonbows need a bright moon and showers at night.');
    add('aurora', !o.isDay && Math.abs(lat) >= 50 && cloud < 60 && !wetHere, 'A clear night this far north: look low towards the north.', Math.abs(lat) < 50 ? 'You’re too far south to see the Northern Lights.' : 'The Northern Lights need a clear, dark sky.');
    add('sheetlightning', thunderHere || near.thunder, 'There’s thunder about. Stay indoors and catch a flash through the window.', 'You need thunder in or near your area.');
    add('cloudinversion', elev >= 250 && !fogHere && cloud < 70 && near.lowerFog, 'There’s fog in the valleys below you. Look down for a sea of cloud.', 'You need to be on high ground with fog below you.');
    return out;
  }

  /* ---------- levels ---------- */

  function levelFor(p) { var L = 1; while (p >= 25 * (L + 1) * L) L += 1; return L; }
  function pointsFor(L) { return 25 * L * (L - 1); }
  var TITLES = [[1, 'Puddle Spotter'], [5, 'Cloud Watcher'], [10, 'Sky Reader'], [15, 'Weather Hunter'], [20, 'Storm Chaser'], [30, 'Sky Legend']];
  function titleFor(L) { var t = TITLES[0][1]; for (var i = 0; i < TITLES.length; i++) if (L >= TITLES[i][0]) t = TITLES[i][1]; return t; }
  var UNLOCKS = [
    { level: 5, id: 'nearby', name: 'Nearby weather', text: 'See what the weather is doing in the areas around you.' },
    { level: 10, id: 'comingup', name: 'Coming up', text: 'See the rare weather forecast for your area over the next two days.' },
    { level: 20, id: 'warnings', name: 'Early warnings', text: 'Get a heads-up a couple of hours before rare weather reaches your area.' }
  ];
  function unlocked(id, L) { for (var i = 0; i < UNLOCKS.length; i++) if (UNLOCKS[i].id === id) return L >= UNLOCKS[i].level; return false; }

  /* ---------- shelf rewards ----------
     Every 10 jars unlocks a new shelf wood or lights. Finishing a row gives that shelf its own look for good,
     every jar in a row at gold turns the shelf gold, and a full shelf earns the Sky Jar and the top title.
     Jars marked 'later' can't be caught yet, so they don't count towards any of it. */

  var SILVER_AT = 5, GOLD_AT = 15;
  function catchable(t) { return !!t && t.how !== 'later'; }
  var SHELF = ORDERED.filter(catchable);
  var SHELF_TOTAL = SHELF.length;
  var WOODS = [{ id: 'pine', name: 'Pine' }, { id: 'oak', name: 'Oak' }, { id: 'walnut', name: 'Walnut' }, { id: 'glass', name: 'Glass' }];
  var LIGHTS = [{ id: 'off', name: 'No lights' }, { id: 'glow', name: 'Shelf lights' }, { id: 'fairy', name: 'Fairy lights' }];
  var JAR_REWARDS = [
    { id: 'jars10', kind: 'jars', need: 10, name: 'Oak shelves', wood: 'oak', bonus: 100, done: 'Ten jars on your shelf, so your shelves are oak now.' },
    { id: 'jars20', kind: 'jars', need: 20, name: 'Shelf lights', lights: 'glow', bonus: 200, done: 'Twenty jars on your shelf, so every jar has its own light now.' },
    { id: 'jars30', kind: 'jars', need: 30, name: 'Walnut shelves', wood: 'walnut', bonus: 300, done: 'Thirty jars on your shelf, so your shelves are dark walnut now.' },
    { id: 'jars40', kind: 'jars', need: 40, name: 'Fairy lights', lights: 'fairy', bonus: 400, done: 'Forty jars on your shelf, so there are fairy lights across it now.' },
    { id: 'jars50', kind: 'jars', need: 50, name: 'Glass shelves', wood: 'glass', bonus: 500, done: 'Fifty jars on your shelf, so your jars sit on glass shelves now.' }
  ];
  var ROW_BONUS = 500, GOLD_BONUS = 1000, FULL_BONUS = 2000;
  var KEEPER = 'Keeper of the Sky';
  /* what each finished row looks like. noun: what one jar in the row is called */
  var ROW_LOOKS = {
    sun: { noun: 'Sun jar', name: 'Sunlit shelf', hint: 'Catch every Sun jar and sunshine fills this shelf, for good.', done: 'Every Sun jar is on your shelf, so sunshine fills it for good.' },
    rain: { noun: 'Rain jar', name: 'Rainy shelf', hint: 'Catch every Rain jar and rain runs down the back of this shelf, for good.', done: 'Every Rain jar is on your shelf, so rain runs down the back of it for good.' },
    frost: { noun: 'Frost jar', name: 'Frozen shelf', hint: 'Catch every Frost jar and this shelf ices over, for good.', done: 'Every Frost jar is on your shelf, so it’s iced over for good.' },
    wind: { noun: 'Wind jar', name: 'Windswept shelf', hint: 'Catch every Wind jar and leaves blow across this shelf, for good.', done: 'Every Wind jar is on your shelf, so leaves blow across it for good.' },
    storm: { noun: 'Storm jar', name: 'Storm shelf', hint: 'Catch every Storm jar and this shelf flickers with lightning, for good.', done: 'Every Storm jar is on your shelf, so it flickers with lightning for good.' },
    mist: { noun: 'Mist jar', name: 'Misty shelf', hint: 'Catch every Mist jar and fog drifts through this shelf, for good.', done: 'Every Mist jar is on your shelf, so fog drifts through it for good.' },
    wonder: { noun: 'Sky Wonder', name: 'Starlit shelf', hint: 'Catch every Sky Wonder and this shelf glows with stars and the Northern Lights, for good.', done: 'Every Sky Wonder is on your shelf, so it glows with stars and the Northern Lights for good.' },
    change: { noun: 'Change moment', name: 'Turning shelf', hint: 'Catch every Change moment and the sky behind this shelf turns from storm to sun, for good.', done: 'Every Change moment is on your shelf, so the sky behind it turns from storm to sun for good.' }
  };
  var REWARD = {};
  JAR_REWARDS.forEach(function (r) { REWARD[r.id] = r; });
  ELEMENTS.forEach(function (el) {
    var look = ROW_LOOKS[el.id];
    REWARD['row-' + el.id] = { id: 'row-' + el.id, kind: 'row', el: el.id, name: look.name, bonus: ROW_BONUS, done: look.done, hint: look.hint };
    REWARD['gold-' + el.id] = {
      id: 'gold-' + el.id, kind: 'gold', el: el.id, name: 'Gold ' + el.name + ' shelf', bonus: GOLD_BONUS,
      done: 'Every ' + look.noun + ' is gold, so the whole shelf is gold now.',
      hint: 'Get every ' + look.noun + ' to gold, 15 catches each, and this shelf turns gold.'
    };
  });
  REWARD.full = {
    id: 'full', kind: 'full', need: SHELF_TOTAL, name: KEEPER, prize: 'The Sky Jar', bonus: FULL_BONUS,
    done: 'You’ve caught every jar there is. The Sky Jar is yours, and it always shows the live sky wherever you are.',
    hint: 'Fill every jar on your shelf to earn the Sky Jar, which always shows the live sky wherever you are.'
  };
  function reward(id) { return REWARD[id] || null; }
  function rowTypes(elId) { return SHELF.filter(function (t) { return t.el === elId; }); }
  function shelfProgress(book) {
    book = book || {};
    var jars = 0;
    var rows = ELEMENTS.map(function (el) {
      var types = rowTypes(el.id);
      var have = 0, gold = 0;
      types.forEach(function (t) {
        var e = book[t.id];
        var n = e && typeof e.n === 'number' ? e.n : 0;
        if (n > 0) have += 1;
        if (n >= GOLD_AT) gold += 1;
      });
      jars += have;
      return { el: el.id, name: el.name, need: types.length, have: have, gold: gold, complete: have === types.length, allGold: gold === types.length };
    });
    return { jars: jars, total: SHELF_TOTAL, rows: rows, full: jars === SHELF_TOTAL };
  }
  /* every reward this shelf has earned, smallest first: jar counts, then rows, then gold rows, then the full shelf */
  function rewardsEarned(book) {
    var p = shelfProgress(book);
    var out = [];
    JAR_REWARDS.forEach(function (r) { if (p.jars >= r.need) out.push(r.id); });
    p.rows.forEach(function (r) { if (r.complete) out.push('row-' + r.el); });
    p.rows.forEach(function (r) { if (r.allGold) out.push('gold-' + r.el); });
    if (p.full) out.push('full');
    return out;
  }
  /* the next jar-count reward, ending with the full shelf; null once the shelf is full */
  function nextJarReward(jars) {
    for (var i = 0; i < JAR_REWARDS.length; i++) if (jars < JAR_REWARDS[i].need) return JAR_REWARDS[i];
    return jars < SHELF_TOTAL ? REWARD.full : null;
  }
  /* which reward unlocks a shelf wood or lights; null for the ones you start with */
  function styleReward(kind, id) {
    for (var i = 0; i < JAR_REWARDS.length; i++) if (JAR_REWARDS[i][kind] === id) return JAR_REWARDS[i];
    return null;
  }

  WC.rules = {
    RARITY: RARITY, ELEMENTS: ELEMENTS, TYPES: TYPES, ORDERED: ORDERED, CODES: CODES,
    type: type, rank: rank, points: points, facetOf: function (id) { return FACET_OF[id] || null; },
    areaOf: areaOf, neighbours: neighbours, isRainCode: isRainCode,
    classify: classify, changesFor: changesFor, wonders: wonders, spots: spots, spottable: spottable, SPOTTABLE: SPOTTABLE,
    sunElevation: sunElevation, nearestFullMoon: nearestFullMoon, moonDistance: moonDistance,
    isSupermoon: isSupermoon, moonIllumination: moonIllumination, meteorShower: meteorShower, eclipseNow: eclipseNow,
    dayKey: dayKey, nightKey: nightKey,
    levelFor: levelFor, pointsFor: pointsFor, titleFor: titleFor, UNLOCKS: UNLOCKS, unlocked: unlocked,
    SILVER_AT: SILVER_AT, GOLD_AT: GOLD_AT, catchable: catchable, SHELF_TOTAL: SHELF_TOTAL, rowTypes: rowTypes,
    WOODS: WOODS, LIGHTS: LIGHTS, JAR_REWARDS: JAR_REWARDS, ROW_LOOKS: ROW_LOOKS, KEEPER: KEEPER,
    reward: reward, shelfProgress: shelfProgress, rewardsEarned: rewardsEarned, nextJarReward: nextJarReward, styleReward: styleReward
  };
})(typeof window !== 'undefined' ? window : globalThis);
