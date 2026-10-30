// A test harness for FRZFRM Weather Catch: phone-sized browser, mocked weather and place names.
const { chromium } = require('playwright');
const BASE = 'http://localhost:8800/';
function weatherJSON(url, over) {
  const u = new URL(url);
  const lats = u.searchParams.get('latitude').split(',');
  const now = Math.floor(Date.now() / 1000);
  const cur = Object.assign({ time: now - (now % 900), interval: 900, temperature_2m: 12, relative_humidity_2m: 80, is_day: 1, precipitation: 0.3, rain: 0.3, showers: 0, snowfall: 0, weather_code: 61, cloud_cover: 90, cloud_cover_low: 60, cloud_cover_high: 40, wind_speed_10m: 9, wind_gusts_10m: 20, visibility: 12000 }, over || {});
  const one = () => {
    const o = { latitude: 51.5, longitude: -0.12, elevation: 30, current: cur };
    if (u.searchParams.get('hourly')) {
      const h = { time: [] }; const keys = u.searchParams.get('hourly').split(',');
      keys.forEach(k => h[k] = []);
      for (let i = -2; i < 48; i++) { h.time.push(now - (now % 3600) + i * 3600); keys.forEach(k => h[k].push(cur[k] !== undefined ? cur[k] : 0)); }
      o.hourly = h;
    }
    if (u.searchParams.get('daily')) {
      const d = new Date(); d.setHours(0, 0, 0, 0); const t0 = Math.floor(d.getTime() / 1000);
      o.daily = { time: [t0, t0 + 86400, t0 + 172800], sunrise: [t0 + 7 * 3600, t0 + 31 * 3600, t0 + 55 * 3600], sunset: [t0 + 17 * 3600, t0 + 41 * 3600, t0 + 65 * 3600] };
    }
    return o;
  };
  return JSON.stringify(lats.length > 1 ? lats.map(one) : one());
}
async function open(opts) {
  opts = opts || {};
  const gpu = opts.plainGpu ? [] : ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
  const browser = await chromium.launch({ args: gpu.concat(['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']).concat(opts.args || []) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: opts.dark ? 'dark' : 'light',
    geolocation: { latitude: 51.53, longitude: -0.14, accuracy: 20 }, permissions: ['geolocation', 'camera'] });
  await context.route('https://api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: weatherJSON(r.request().url(), opts.weather) }));
  await context.route('https://api.bigdatacloud.net/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ city: 'London', locality: 'Camden Town', principalSubdivision: 'England' }) }));
  await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await context.route('https://fonts.gstatic.com/**', r => r.fulfill({ status: 404, body: '' }));
  if (opts.routes) for (const k of Object.keys(opts.routes)) await context.route(k, opts.routes[k]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  if (!opts.fullSpeed) await page.addInitScript(() => { window.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(performance.now()); }, 200); }; window.cancelAnimationFrame = function (id) { clearTimeout(id); }; });
  if (opts.state) await page.addInitScript(s => { try { if (!localStorage.getItem('frzfrm-wc-state-1')) localStorage.setItem('frzfrm-wc-state-1', s); } catch (e) {} }, JSON.stringify(opts.state));
  await page.goto(BASE + (opts.query || '?test=1'));
  await page.waitForTimeout(opts.wait || 1500);
  return { browser, context, page, errors };
}
// the test browser draws slowly, so animation runs at a few frames a second there
async function shot(page, path) { await page.waitForTimeout(300); await page.screenshot({ path }); }
module.exports = { open, BASE, shot };
