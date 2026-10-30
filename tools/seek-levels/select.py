"""Picks 100 Hide & seek levels from measured hiding spots.
pass 1 (assign): which picture each level uses, by how well its spots can hit the level's target difficulty
pass 2 (final):  the hiding spots for each level, all with the same label, near the target, and well apart
"""
import json, math, random, sys, collections

EASY, MED, HARD = 6.0, 15.0, 30.0           # predicted seconds: the label boundaries
WORDS = ['Easy', 'Medium', 'Hard', 'Very challenging']
N = 100
BOSS_T = {10: 9, 20: 13, 30: 19, 40: 24, 50: 33, 60: 39, 70: 46, 80: 53, 90: 61, 100: 72}

def band(T):
    return 0 if T < EASY else 1 if T < MED else 2 if T < HARD else 3

def ok(c):
    """fair, and its label is safe: easy ones clearly visible, very challenging ones genuinely hard to spot"""
    m = c['m']
    if m['Avis'] < 100 or m['f'] < 0.33 or m['T'] >= 110: return False
    b = band(m['T'])
    if b == 0 and (m['cons'] < 0.2 or m['Avis'] < 300): return False
    if b == 3 and m['cons'] > 0.12: return False
    # keep away from the label boundaries, so a spot can't sit right on the edge of two labels
    T = m['T']
    for edge in (EASY, MED, HARD):
        if abs(math.log(T / edge)) < 0.06: return False
    return True

def target(n):
    if n in BOSS_T: return BOSS_T[n]
    pts = [(1, 2.6), (14, 5.4), (15, 6.6), (44, 14.0), (45, 16.0), (74, 28.5), (75, 31.5), (99, 55.0)]
    for (a, ta), (b, tb) in zip(pts, pts[1:]):
        if a <= n <= b:
            return math.exp(math.log(ta) + (math.log(tb) - math.log(ta)) * (n - a) / (b - a))
    return 55.0

def load(paths):
    rows = []
    for p in paths:
        for l in open(p):
            if l.strip(): rows.append(json.loads(l))
    return rows

def key(c): return (c['id'], c['scene'], c['layout'])

def fitcost(cs, T0):
    """how well a picture's measured spots can hit a target: the nearest spot in the right label, in log seconds"""
    bt = band(T0)
    d = sorted(abs(math.log(c['m']['T'] / T0)) for c in cs if ok(c) and band(c['m']['T']) == bt)
    if not d: return 9.0
    near = sum(1 for x in d if x < 0.3)
    return d[0] + (0.4 if near == 0 else 0.15 if near == 1 else 0)

def assign(rows, seed=7):
    import numpy as np
    from scipy.optimize import linear_sum_assignment
    rnd = random.Random(seed)
    pics = collections.defaultdict(list)
    for c in rows: pics[key(c)].append(c)
    combos = sorted(set((k[0], k[1]) for k in pics))
    T = [target(n) for n in range(1, N + 1)]
    C = np.full((N, len(combos)), 9.0); L = {}
    for j, cb in enumerate(combos):
        for n in range(N):
            best = (9.0, None)
            for lay in range(3):
                k = (cb[0], cb[1], lay)
                if k in pics:
                    fc = fitcost(pics[k], T[n])
                    if fc < best[0]: best = (fc, k)
            C[n, j] = best[0] + rnd.random() * 0.02
            L[(n, j)] = best[1]
    r, cidx = linear_sum_assignment(C)
    lv = [None] * N
    for n, j in zip(r, cidx): n, j = int(n), int(j); lv[n] = {'n': n + 1, 'pic': L[(n, j)], 'T': T[n], 'cost': float(C[n, j])}
    # spread animals and places out: swap with a later level of the same kind when an animal comes round too soon
    def clash(i, pic):
        for j in range(max(0, i - 4), i):
            if lv[j]['pic'][0] == pic[0]: return True
        if i > 0 and lv[i - 1]['pic'][1] == pic[1]: return True
        return False
    for _ in range(3):
        for i in range(N):
            if not clash(i, lv[i]['pic']): continue
            for j in list(range(i + 1, N)) + list(range(0, i)):
                if (j + 1) % 10 == 0 or (i + 1) % 10 == 0:
                    if (j + 1) % 10 != (i + 1) % 10 or ((j + 1) % 10 == 0) != ((i + 1) % 10 == 0): continue
                if band(T[i]) != band(T[j]): continue
                pi, pj = lv[i]['pic'], lv[j]['pic']
                ci, cj = fitcost(pics[pj], T[i]), fitcost(pics[pi], T[j])
                if ci > 0.6 or cj > 0.6: continue
                lv[i]['pic'], lv[j]['pic'] = pj, pi
                if clash(i, pj) or clash(j, pi) or (j + 1 < N and clash(j + 1, lv[j + 1]['pic'])) or (i + 1 < N and clash(i + 1, lv[i + 1]['pic'])):
                    lv[i]['pic'], lv[j]['pic'] = pi, pj
                    continue
                lv[i]['cost'], lv[j]['cost'] = ci, cj
                break
    for l in lv:
        cs = pics[l['pic']]; bt = band(l['T'])
        near = [c for c in cs if ok(c) and band(c['m']['T']) == bt and abs(math.log(c['m']['T'] / l['T'])) < 0.4]
        l['band'] = bt; l['near'] = len(near); l['Ls'] = sorted(set(c['L'] for c in near)) or sorted(set(c['L'] for c in cs if ok(c) and band(c['m']['T']) == bt))
        l['clash'] = clash(l['n'] - 1, l['pic'])
    return lv

def final(rows, levels):
    pics = collections.defaultdict(list)
    for c in rows: pics[key(c)].append(c)
    out = []
    for lv in levels:
        n, k, T0 = lv['n'], tuple(lv['pic']), lv['T']
        bt = band(T0)
        want = 4 if n % 10 == 0 else 3
        cs = [c for c in pics[k] if ok(c) and band(c['m']['T']) == bt]
        cs.sort(key=lambda c: abs(math.log(c['m']['T'] / T0)))
        chosen = []
        for c in cs:
            # well apart from the spots already chosen, so playing it again really moves the animal
            if all(math.hypot(c['cx'] - d['cx'], c['cy'] - d['cy']) > 14 for d in chosen):
                chosen.append(c)
            if len(chosen) == want: break
        out.append({'n': n, 'pic': k, 'T0': T0, 'band': bt, 'spots': chosen})
    return out

if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'assign':
        rows = load(sys.argv[2:])
        lv = assign(rows)
        json.dump(lv, open('/tmp/wct/lv/assign.json', 'w'))
        for l in lv: print(l['n'], l['pic'], round(l['T'], 1), WORDS[band(l['T'])], 'cost %.2f' % l['cost'], 'near', l.get('near'), 'Ls', l['Ls'], 'CLASH' if l['clash'] else '')

def write_js(out, path):
    lines = []
    for lv in out:
        n, k, sp = lv['n'], lv['pic'], lv['spots']
        spots = ', '.join('[%s, %s, %s, %d, %s, %s]' % (fmt(c['sp']['x']), fmt(c['sp']['y']), fmt(c['sp']['d']), c['sp']['dir'], fmt(c['sp']['rot']), fmt(round(c['m']['T'], 1))) for c in sp)
        extra = ''
        if n % 10 == 0:
            extra = ', %d' % lv['limit']
        lines.append("    ['%s', '%s', %d, %d, [%s]%s]" % (k[0], k[1], k[2], lv['band'], spots, extra))
    js = """/* FRZFRM Weather Catch: the Hide & seek levels, made by a script from measured pictures.
   Each level: [animal, place, layout, difficulty, hiding spots, boss time limit in seconds (bosses only)].
   Difficulty: 0 Easy, 1 Medium, 2 Hard, 3 Very challenging, from how long the hiding spots are predicted to take to find:
   under 6 seconds, under 15, under 30, then more. The prediction renders each picture with and without the animal and
   simulates someone searching it: they look first at spots in the animal's main colours, can spot a big, uncovered
   animal in colours unlike its surroundings from further off, and are less likely to recognise it the smaller it shows,
   the more of it is covered and the more it blends in. Each spot: [x, y, size, facing, tilt, predicted seconds]. Every
   phone draws the same pictures, because the animals' shapes and colours are written down in seek.js */
(function (root) {
  var WC = root.WC = root.WC || {};
  WC.seekLevels = [
%s
  ];
})(typeof window !== 'undefined' ? window : globalThis);
""" % ',\n'.join(lines)
    open(path, 'w').write(js)

def fmt(v):
    s = ('%.3f' % v).rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'

if __name__ == '__main__' and sys.argv[1] == 'final':
    rows = load(sys.argv[3:])
    lv = json.load(open('/tmp/wct/lv/assign.json'))
    for l in lv: l['pic'] = tuple(l['pic'])
    out = final(rows, lv)
    bad = 0
    for o in out:
        want = 4 if o['n'] % 10 == 0 else 3
        Ts = [c['m']['T'] for c in o['spots']]
        if o['n'] % 10 == 0 and o['spots']:
            p75 = max(c['m']['p75'] for c in o['spots'])
            o['limit'] = int(min(150, max(30, math.ceil(p75 * 1.25 / 5) * 5)))
        flag = '' if len(o['spots']) == want else '  <-- only %d spots' % len(o['spots'])
        if flag: bad += 1
        print(o['n'], o['pic'], 'target %.1f' % o['T0'], WORDS[o['band']], 'spots', [round(t, 1) for t in Ts], ('limit %ds' % o['limit']) if o['n'] % 10 == 0 else '', flag)
    print('levels short of spots:', bad)
    json.dump([{'n': o['n'], 'pic': o['pic'], 'band': o['band'], 'T0': o['T0'], 'limit': o.get('limit'), 'spots': o['spots']} for o in out], open('/tmp/wct/lv/final.json', 'w'))
    write_js(out, sys.argv[2])
