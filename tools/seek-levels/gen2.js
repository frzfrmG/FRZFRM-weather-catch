// makes and measures hiding spots for every picture: node gen.js worker workers out.jsonl
const H = require('./harness');
const fs = require('fs');
(async () => {
  const wk = +process.argv[2], nw = +process.argv[3], out = process.argv[4];
  const AS = JSON.parse(fs.readFileSync(process.env.ASSIGN || "/tmp/wct/lv/assign.json", "utf8"));
  const { browser, page } = await H.open({ fullSpeed: true, state: { v: 1, created: Date.now(), points: 0, book: {}, onboarded: true, glassDone: 1, photoCheck: 2, tripFix: 1 } });
  await page.addScriptTag({ content: fs.readFileSync('/tmp/wct/lv/measure.js', 'utf8') });
  let n = 0;
  for (let i = wk; i < AS.length; i += nw) {
    const lv = AS[i];
    if (!lv || !lv.pic || lv.pic[0] === '?') continue;
    const [id, sc, l] = lv.pic, Ls = lv.Ls.length ? lv.Ls : [0.5];
    const rows = await page.evaluate(([id, sc, l, Ls, lvn, many]) => {
      const SK = WC.seek, r2 = (v) => Math.round(v * 100) / 100, res = [];
      const ph = SK.photo(id, sc, l), jit = SK.rnd(lvn * 7919 + 17);
      for (let q = 0; q < many; q++) {
        const L = Math.max(0, Math.min(1, Ls[q % Ls.length] + (jit() - 0.5) * 0.24));
        const rand = SK.rnd((lvn * 1000003 + q * 7907 + 99991) >>> 0);
        const sp = SK.hide(ph, rand, L);
        if (!sp) continue;
        const s = { id: id, x: r2(sp.x), y: r2(sp.y), d: r2(sp.d), dir: sp.dir, rot: Math.round(sp.rot * 1000) / 1000 };
        const m = MEAS.measure(ph, s), c = SK.centre(s);
        res.push({ id: id, scene: sc, layout: l, L: Math.round(L * 1000) / 1000, seed: 1000 + q, lvn: lvn, sp: { x: s.x, y: s.y, d: s.d, dir: s.dir, rot: s.rot }, m: m, cx: c.x, cy: c.y, cr: c.r });
      }
      return res;
    }, [id, sc, l, Ls, lv.n + (+process.env.SALT || 0), +process.env.MANY || (lv.n % 10 === 0 ? 24 : 16)]);
    fs.appendFileSync(out, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
    n++;
    if (n % 10 === 0) console.log(new Date().toISOString().slice(11, 19), 'worker', wk, 'levels', n);
  }
  console.log('worker', wk, 'done', n);
  await browser.close();
})();
