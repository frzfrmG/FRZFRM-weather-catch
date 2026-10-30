// makes and measures hiding spots for every picture: node gen.js worker workers out.jsonl
const H = require('./harness');
const fs = require('fs');
(async () => {
  const wk = +process.argv[2], nw = +process.argv[3], out = process.argv[4];
  const LS = [0, 0.2, 0.4, 0.6, 0.8, 1], SEEDS = [1, 2];
  const { browser, page } = await H.open({ fullSpeed: true, state: { v: 1, created: Date.now(), points: 0, book: {}, onboarded: true, glassDone: 1, photoCheck: 2, tripFix: 1 } });
  await page.addScriptTag({ content: fs.readFileSync('/tmp/wct/lv/measure.js', 'utf8') });
  const pics = await page.evaluate(() => { const o = []; Object.keys(WC.seek.WHERE).forEach(id => WC.seek.WHERE[id].in.forEach(sc => { for (let l = 0; l < WC.seek.LAYOUTS; l++) o.push([id, sc, l]); })); return o; });
  const done = new Set();
  if (fs.existsSync(out)) fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).forEach(l => { const o = JSON.parse(l); done.add(o.id + '|' + o.scene + '|' + o.layout); });
  let n = 0;
  for (let i = wk; i < pics.length; i += nw) {
    const [id, sc, l] = pics[i];
    if (done.has(id + '|' + sc + '|' + l)) continue;
    const rows = await page.evaluate(([id, sc, l, LS, SEEDS]) => {
      const SK = WC.seek, r2 = (v) => Math.round(v * 100) / 100, res = [];
      const ph = SK.photo(id, sc, l);
      LS.forEach(L => SEEDS.forEach(sd => {
        const rand = SK.rnd((Math.imul(sd, 2654435761) ^ Math.round(L * 1000) * 40503 ^ (l + 1) * 9973) >>> 0);
        const sp = SK.hide(ph, rand, L);
        if (!sp) return;
        const s = { id: id, x: r2(sp.x), y: r2(sp.y), d: r2(sp.d), dir: sp.dir, rot: Math.round(sp.rot * 1000) / 1000 };
        const m = MEAS.measure(ph, s), c = SK.centre(s);
        res.push({ id: id, scene: sc, layout: l, L: L, seed: sd, sp: { x: s.x, y: s.y, d: s.d, dir: s.dir, rot: s.rot }, m: m, cx: c.x, cy: c.y, cr: c.r });
      }));
      return res;
    }, [id, sc, l, LS, SEEDS]);
    fs.appendFileSync(out, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
    n++;
    if (n % 10 === 0) console.log(new Date().toISOString().slice(11, 19), 'worker', wk, 'pictures', n);
  }
  console.log('worker', wk, 'done', n);
  await browser.close();
})();
