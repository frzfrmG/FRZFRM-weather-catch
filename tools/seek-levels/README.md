# Making Hide & seek levels

These scripts made `seek-levels.js` (0.15.0). They need Node with Playwright, Python 3 with numpy and scipy,
and the app served locally on port 8800 (`python3 -m http.server 8800` in the app folder). They read and write
a work folder, `/tmp/wct/lv`: copy these files there first.

1. `measure.js`: how hard a picture is. It renders the picture with and without the animal and simulates someone
   searching it, giving predicted seconds to find. Loaded into the app page by the other scripts.
2. `node gen.js 0 2 cand0.jsonl` and `node gen.js 1 2 cand1.jsonl` (two at once): makes 12 hiding spots for
   every picture (each animal, place and layout) and measures them. About 20 minutes.
3. `python3 select.py assign cand0.jsonl cand1.jsonl`: matches each level to a picture that can hit its target
   difficulty (optimal matching), then spreads animals and places out. Writes `assign.json`.
4. `node gen2.js 0 2 cand2_0.jsonl` and `... 1 2 cand2_1.jsonl`: more hiding spots near each level's target.
5. `python3 select.py final ../seek-levels.js cand*.jsonl`: picks 3 spots per level (4 for bosses), all with the
   same label, near the target and well apart, sets boss time limits, and writes the level file.

Labels: Easy under 6 predicted seconds, Medium under 15, Hard under 30, then Very challenging. Easy spots must
also be clearly visible, Very challenging ones genuinely hard to spot, and no animal shows less than about
10 by 10 screen pixels. To add levels after 100, extend `target()` and `N` in `select.py`.

If an animal's drawing changes, run `bake.js` and update `MEASURED` in `seek.js`, then remake the levels:
the pictures depend on the animals' measured shapes and colours.
