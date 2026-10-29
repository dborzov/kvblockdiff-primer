// The rehearsal trace of wave 2 (IX.10–IX.11): 300 decode steps of an exact top-k "indexer" over 4,096 synthetic keys
// in 16 blocks of 256. A JS twin of test_wave2() in analysis/plan_harness.py (same recipe, the site's seeded rng): each
// key is its block's topic vector times the strength plus noise, 16 dimensions; four query heads drift every step; each
// step selects the top k = 128 positions by attention probability summed over heads.
// The rows are the steps (strength 1.5, drift 0.15). helpers.makeTrace and helpers.replay are the generator and the
// replay (token LRU + dictionary LRU, as replay() in the harness) that FIG.planSelections and FIG.planReplaySweep use.
(function () {
  const TR = { n: 4096, b: 256, dk: 16, k: 128, steps: 300, heads: 4 };
  const NB = TR.n / TR.b, B2 = 2 * TR.k, ND = 4;
  const cache = new Map();
  function makeTrace(strength, drift, seed = 'plan-trace') {
    const key = `${strength}|${drift}|${seed}`;
    if (!cache.has(key)) cache.set(key, build(strength, drift, seed));
    return cache.get(key);
  }
  function build(strength, drift, seed) {
    const r = rng(seed);
    const topics = range(NB).map(() => range(TR.dk).map(() => r.normal()));
    const K = new Float64Array(TR.n * TR.dk);
    for (let p = 0; p < TR.n; p++) {
      const t = topics[Math.floor(p / TR.b)];
      for (let c = 0; c < TR.dk; c++) K[p * TR.dk + c] = strength * t[c] + r.normal();
    }
    let q = range(TR.heads).map(() => range(TR.dk).map(() => r.normal()));
    const sel = [];
    const score = new Float64Array(TR.n), prob = new Float64Array(TR.n);
    const sq = Math.sqrt(TR.dk);
    for (let s = 0; s < TR.steps; s++) {
      q = q.map(v => v.map(x => x + drift * r.normal()));
      prob.fill(0);
      for (const qh of q) {                       // softmax per head, summed over heads
        let mx = -Infinity;
        for (let p = 0; p < TR.n; p++) {
          let a = 0;
          for (let c = 0; c < TR.dk; c++) a += qh[c] * K[p * TR.dk + c];
          score[p] = a / sq;
          if (score[p] > mx) mx = score[p];
        }
        let Z = 0;
        for (let p = 0; p < TR.n; p++) { score[p] = Math.exp(score[p] - mx); Z += score[p]; }
        for (let p = 0; p < TR.n; p++) prob[p] += score[p] / Z;
      }
      const idx = Array.from(range(TR.n));
      idx.sort((a, b) => prob[b] - prob[a]);
      sel.push(idx.slice(0, TR.k));
    }
    return sel;
  }
  /** token LRU of B entries + an LRU of nD block dictionaries; per step: misses and delta-misses; in total: m, fD, nload */
  function replay(selections, B, b, nD, policy) {
    const tok = new Map(), dict = new Map();     // a Map keeps insertion order: first = least recent
    let misses = 0, total = 0, dmisses = 0, loads = 0;
    const steps = [];
    const touch = (m, key) => { m.delete(key); m.set(key, null); };
    for (const Sarr of selections) {
      const S = new Set(Sarr);
      const fresh = Sarr.filter(p => !tok.has(p));
      Sarr.forEach(p => { if (tok.has(p)) touch(tok, p); });
      let dm = 0, ld = 0;
      for (const p of fresh) {
        if (tok.size >= B) { for (const v of tok.keys()) { if (!S.has(v)) { tok.delete(v); break; } } }
        tok.set(p, null);
        const j = Math.floor(p / b);
        if (dict.has(j)) { dm++; touch(dict, j); }
      }
      let wanted;
      if (policy === 'heaviest') {
        const cnt = new Map();
        for (const p of tok.keys()) { const j = Math.floor(p / b); cnt.set(j, (cnt.get(j) || 0) + 1); }
        wanted = [...cnt.entries()].sort((a, c) => c[1] - a[1]).slice(0, nD).map(e => e[0]);
      } else wanted = [...new Set(fresh.map(p => Math.floor(p / b)))];
      for (const j of wanted) {
        if (dict.has(j)) { touch(dict, j); continue; }
        loads++; ld++;
        if (dict.size >= nD) dict.delete(dict.keys().next().value);
        dict.set(j, null);
      }
      misses += fresh.length; dmisses += dm; total += Sarr.length;
      steps.push({ miss: fresh.length, dmiss: dm, loads: ld, resident: [...dict.keys()] });
    }
    return { m: misses / total, fD: dmisses / Math.max(misses, 1), nload: loads / selections.length, steps };
  }
  const SEL = () => makeTrace(1.5, 0.15);
  const memo = {};
  const once = (k, f) => () => (k in memo ? memo[k] : (memo[k] = f()));
  const R4 = once('r4', () => replay(SEL(), B2, TR.b, ND, 'heaviest'));
  const MISS = once('miss', () => [1, 2, 4].map(f => replay(SEL(), f * TR.k, TR.b, 1, 'lru').m));
  const FD = once('fd', () => [1, 2, 4, 8, 16].map(n => replay(SEL(), B2, TR.b, n, 'heaviest')));
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;

  /** Steps × blocks: how many of each step's 128 selections fall into each block; outlined: the dictionaries resident after the step. */
  function heat(box, ctx) {
    const rows = ctx.rows, res = R4();
    const P = Plot(box, { x: [0, TR.steps], y: [NB, 0], h: 320, xlabel: 'decode step', ylabel: 'block', yticks: [0, 4, 8, 12, 16], grid: false, label: 'Selections per block and decode step' });
    const cw = P.x(1) - P.x(0), ch = P.y(1) - P.y(0);
    rows.forEach((r, s) => r.counts.forEach((c, j) => {
      if (!c) return;
      const sel = ctx.sel && ctx.sel.test(r);
      el('rect', { x: P.x(s), y: P.y(j), width: cw + 0.3, height: ch + 0.3, style: `fill:${mix(series(0), Math.round(12 + 88 * Math.min(1, c / 64)))}${ctx.sel && !sel ? ';opacity:.35' : ''}` }, P.g.data);
    }));
    if (ctx.hl) rows.forEach((r, s) => { if (ctx.hl.test(r)) el('rect', { x: P.x(s), y: P.y(r.top), width: cw + 0.3, height: ch + 0.3, style: `fill:${series(1)}` }, P.g.top); });
    const g = el('g', {}, P.g.top);
    res.steps.forEach((st, s) => st.resident.forEach(j => el('rect', { x: P.x(s) + 0.2, y: P.y(j) + ch * 0.42, width: cw, height: ch * 0.16, style: `fill:${mix('var(--ink)', 55)}` }, g)));
    const hit = el('rect', { x: P.m.l, y: P.m.t, width: P.pw, height: P.ph, class: 'hit' }, P.g.top);
    hover(hit, e => {
      const [x, y] = P.toData(e), s = clamp(Math.floor(x), 0, TR.steps - 1), j = clamp(Math.floor(y), 0, NB - 1), r = rows[s];
      return `<b>step ${s}, block ${j}</b><br>${r.counts[j]} of ${TR.k} selections<br>heaviest block this step: ${r.top} (${r.counts[r.top]})<br>${r.miss} misses, ${r.dmiss} found their dictionary`;
    });
    box.append(legend([['selections in the block (stronger = more)', series(0), 'box'], [`a dictionary resident (${ND}, heaviest-blocks policy)`, mix('var(--ink)', 55), 'line'], ...(ctx.hl ? [[esc(ctx.hl.label), series(1), 'box']] : [])]));
  }

  DS.define('plan-trace', {
    helpers: { TR, makeTrace, replay },
    rows() {
      const res = R4();
      return SEL().map((S, s) => {
        const counts = new Array(NB).fill(0);
        S.forEach(p => counts[Math.floor(p / TR.b)]++);
        const sorted = counts.slice().sort((a, b) => b - a);
        const top = counts.indexOf(sorted[0]);
        const st = res.steps[s];
        return { s, counts, top, top1: sorted[0] / TR.k, top4: (sorted[0] + sorted[1] + sorted[2] + sorted[3]) / TR.k, touched: counts.filter(Boolean).length,
          miss: st.miss, dmiss: st.dmiss, loads: st.loads, sel: S.slice().sort((a, b) => a - b).join(' ') };
      });
    },
    columns: [
      { key: 'top', label: 'top block' },
      { key: 'top1', label: 'its share', fmt: v => fmtPct(v, 0) },
      { key: 'top4', label: 'top 4', fmt: v => fmtPct(v, 0) },
      { key: 'touched', label: 'blocks hit' },
      { key: 'miss', label: 'misses' },
      { key: 'dmiss', label: 'δ-misses' },
      { key: 'loads', label: 'loads' },
    ],
    csvColumns: ['s', 'sel'],
    highlights: {
      switch: { label: 'steps where the heaviest block changes', test: r => r.s > 0 && DS.rows('plan-trace')[r.s - 1].top !== r.top },
      loads: { label: 'steps that load a dictionary', test: r => r.loads > 0 },
    },
    views: {
      heat: { label: 'Blocks by step', legend: false, highlights: ['switch'], draw: heat,
        note: `Each column is one decode step, each row one block of ${TR.b} positions; the shade counts how many of the step's ${TR.k} selections fall in that block. A thin grey bar marks a block whose dictionary is resident after the step. Hover for the counts.` },
      misses: Object.assign(DS.views.timeline({
        x: 's', y: 'miss', xlabel: 'decode step', ylabel: 'entries per step', xname: 'step', ydomain: [0, 40], width: 1.3,
        label: 'Misses per step', xfmt: v => fmt(v, 0), yfmt: v => fmt(v, 0),
        after(P, ctx) {
          line(P, ctx.rows.map(r => [r.s, r.dmiss]), { color: series(2), width: 1.3 });
          P.svg.closest('div').before(legend([[`token misses (hot cache of ${B2})`, series(0)], [`δ-misses (${ND} dictionaries resident)`, series(2)], ...(ctx.hl ? [[esc(ctx.hl.label), series(1), 'dot']] : [])]));
        },
      }), { highlights: ['loads'], legend: false,
        note: 'Step 0 starts from an empty cache: all 128 selections miss (off the top of the plot). After that, a few misses per step; the vermilion dots mark steps on which a dictionary had to be loaded.',
      }),
    },
    metrics: [
      { id: 'n', label: 'decode steps × selections', value: rows => rows.length, fmt: v => `${v} × ${TR.k}`,
        note: `Each step selects ${TR.k} of ${TR.n.toLocaleString('en-US')} positions — about 3 %, the sparsity of a real indexer picking 2,048 of a 64K context.` },
      { id: 'top', label: 'share of a step held by its heaviest 1 and 4 blocks', value: rows => [mean(rows.map(r => r.top1)), mean(rows.map(r => r.top4))], fmt: v => `${fmtPct(v[0], 0)} · ${fmtPct(v[1], 0)}`,
        note: `Spread evenly, one block of 16 would hold 6 %. Here selections pile into a few blocks: the heavy blocks that make a per-block dictionary worth keeping on the GPU.` },
      { id: 'life', label: 'how long the heaviest block stays heaviest', value: rows => rows.length / rows.filter((r, s) => !s || rows[s - 1].top !== r.top).length, fmt: v => `${fmt(v, 1)} steps on average`,
        note: 'Concentration is not enough; the heavy blocks must also last, or every new one costs a dictionary load. The query drift sets this lifetime.' },
      { id: 'miss', label: 'token miss rate, hot cache of $\\vB$ = 128, 256, 512', tex: '\\vm', value: () => MISS(), fmt: v => v.map(x => fmtPct(x, 1)).join(' · '),
        note: 'Far below HiSparse\'s 30, 13 and 7 %: this toy is much more local than a real trace, which is why its numbers show the shape of the measurement and not its result. (The numpy run of the same recipe: 8.8, 2.9 and 2.2 %.)' },
      { id: 'fd', label: 'δ-miss fraction for 1, 2, 4, 8, 16 resident dictionaries', tex: '\\vfD', value: () => FD().map(r => r.fD), fmt: v => v.map(x => fmtPct(x, 0)).join(' · '),
        note: 'The share of misses whose block dictionary is already on the GPU, with a hot cache of 256 and the heaviest-blocks policy. It rises as more dictionaries stay resident. With all 16 resident every later miss finds its dictionary; only the cold start, 128 misses before any dictionary is loaded, keeps it below 100 %. (numpy run: 10, 22, 41, 72 and 88 %.)' },
      { id: 'nload', label: 'dictionary loads per step, 4 resident', tex: '\\vnload', value: () => R4().nload, fmt: v => `${fmt(v, 2)}`,
        note: 'Below the 0.1 break-even of a heavy dictionary: the heavy blocks live long enough that a load serves many steps. (numpy run: 0.13.)' },
    ],
    numbersNote: 'Synthetic and seeded: the shape of the wave-2 measurement, not a prediction for a real model.',
    code: `
import numpy as np, pandas as pd
from collections import OrderedDict

T = pd.read_csv("{csv}")                                  # columns: s (step), sel (the 128 selected positions)
sel = [list(map(int, s.split())) for s in T["sel"]]
b, k = 256, 128

def replay(selections, B, n_D):                           # token LRU + dictionaries of the heaviest blocks
    cache, dcache = OrderedDict(), OrderedDict()
    misses = total = dmisses = loads = 0
    for S in selections:
        S = set(S); new = [p for p in S if p not in cache]
        for p in S.difference(new): cache.move_to_end(p)
        for p in new:
            if len(cache) >= B: del cache[next(v for v in cache if v not in S)]
            cache[p] = None
            if p // b in dcache: dmisses += 1; dcache.move_to_end(p // b)
        counts = {}
        for p in cache: counts[p // b] = counts.get(p // b, 0) + 1
        for j in sorted(counts, key=lambda j: -counts[j])[:n_D]:
            if j in dcache: dcache.move_to_end(j); continue
            loads += 1
            if len(dcache) >= n_D: dcache.popitem(last=False)
            dcache[j] = None
        misses += len(new); total += len(S)
    return misses / total, dmisses / max(misses, 1), loads / len(selections)

print("miss rates:", [round(replay(sel, f * k, 1)[0], 3) for f in (1, 2, 4)])
print("f_D:", [round(replay(sel, 2 * k, n)[1], 2) for n in (1, 2, 4, 8, 16)], " n_load(4):", round(replay(sel, 2 * k, 4)[2], 2))
# (the order of misses within a step can differ from the browser's, so the last digit may too)
`,
  });
})();
