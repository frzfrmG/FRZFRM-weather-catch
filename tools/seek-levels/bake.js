const H = require('./harness');
(async () => {
  const { browser, page } = await H.open({ fullSpeed: true, state: { v: 1, created: Date.now(), points: 0, book: {}, onboarded: true, glassDone: 1, photoCheck: 2, tripFix: 1 } });
  const r = await page.evaluate(() => { const o = {}; Object.keys(WC.zoo.A).sort().forEach(id => { const s = WC.seek.shape(id); if (s) o[id] = [s.x0, s.x1, s.y0, s.y1, s.cols]; }); return o; });
  console.log(JSON.stringify(r));
  await browser.close();
})();
