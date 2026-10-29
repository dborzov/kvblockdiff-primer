// The world of IV.13 ("The leak"): 4,096 keys of d = 32 elements in which no key says anything about its neighbour
// (every element an independent Gaussian number), and, for contrast, keys that are each a close copy of the one before
// (corr = 0.95 per element). A query does a random walk on the unit sphere with step η, selects its top k = 64 keys,
// and a HiSparse-style LRU hot cache of B = 128 slots serves them (260 steps, the first 60 warm-up).
// Rows: the first 300 keys of each kind, element 0 of key t and of key t+1 (what a neighbour would have to predict).
// The keys, the R² and the Monte Carlo run are shared with FIG.leakSim (figures/idea.js) through helpers.
// Seeds: keys 'iv13-keys', query 'iv13-q'.
(function () {
  const LEAK = { d: 32, n: 4096, k: 64, B: 128, steps: 260, warm: 60 };
  function leakKeys(corr, seed) {
    const { d, n } = LEAK, r = rng(seed), K = new Float64Array(n * d), a = Math.sqrt(1 - corr * corr);
    for (let c = 0; c < d; c++) K[c] = r.normal();
    for (let t = 1; t < n; t++) for (let c = 0; c < d; c++) K[t * d + c] = corr * K[(t - 1) * d + c] + a * r.normal();
    return K;
  }
  function neighbourR2(K) {                             // per-channel R² of key t from key t−1 (least squares with intercept)
    const { d, n } = LEAK;
    let acc = 0;
    for (let c = 0; c < d; c++) {
      let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
      for (let t = 1; t < n; t++) { const x = K[(t - 1) * d + c], y = K[t * d + c]; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; }
      const m = n - 1, cov = sxy / m - (sx / m) * (sy / m), vx = sxx / m - (sx / m) ** 2, vy = syy / m - (sy / m) ** 2;
      acc += cov * cov / (vx * vy);
    }
    return acc / d;
  }
  function topk(scores, k) {                            // indices of the k largest scores
    const n = scores.length, idx = new Int32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    // quickselect on idx by score, descending
    let lo = 0, hi = n - 1;
    while (lo < hi) {
      const piv = scores[idx[(lo + hi) >> 1]];
      let i = lo, j = hi;
      while (i <= j) {
        while (scores[idx[i]] > piv) i++;
        while (scores[idx[j]] < piv) j--;
        if (i <= j) { const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; i++; j--; }
      }
      if (k - 1 <= j) hi = j; else if (k - 1 >= i) lo = i; else break;
    }
    return Array.from(idx.subarray(0, k));
  }
  function leakRun(K, eta, seed, keepRaster) {
    const { d, n, k, B, steps, warm } = LEAK, r = rng(seed);
    let q = range(d).map(() => r.normal());
    const norm = v => { const s = Math.sqrt(v.reduce((a, x) => a + x * x, 0)); return v.map(x => x / s); };
    q = norm(q);
    const scores = new Float64Array(n), cache = [];
    let prev = null, ovSum = 0, ovN = 0, hitSum = 0, hitN = 0;
    const raster = [];
    for (let s = 0; s < steps; s++) {
      q = norm(q.map(x => x + eta * r.normal() / Math.sqrt(d)));
      for (let t = 0; t < n; t++) { let a = 0; const o = t * d; for (let c = 0; c < d; c++) a += K[o + c] * q[c]; scores[t] = a; }
      const S = topk(scores, k), Sset = new Set(S);
      if (prev && s >= warm) { let o = 0; for (const p of S) if (prev.has(p)) o++; ovSum += o / k; ovN++; }
      prev = Sset;
      const inC = new Set(cache), hits = S.filter(p => inC.has(p)), misses = S.filter(p => !inC.has(p));
      for (const p of misses) { if (cache.length >= B) cache.splice(cache.findIndex(x => !Sset.has(x)), 1); cache.push(p); }
      for (const p of hits) { cache.splice(cache.indexOf(p), 1); cache.push(p); }
      if (s >= warm) { hitSum += hits.length / k; hitN++; }
      if (keepRaster && s >= warm && s < warm + 80) raster.push(S);
    }
    return { overlap: ovSum / ovN, hit: hitSum / hitN, raster };
  }


  const ETA = 10 ** -0.6;                               // the default query drift of Plate IV.13·1, ≈ 0.25
  const KINDS = [{ id: 'iid', name: 'independent keys', corr: 0 }, { id: 'copy', name: 'each key a close copy of the last', corr: 0.95 }];
  const cache = {};
  const keys = kind => cache['K' + kind] || (cache['K' + kind] = leakKeys(KINDS.find(k => k.id === kind).corr, 'iv13-keys'));
  const r2 = kind => cache['R' + kind] ?? (cache['R' + kind] = neighbourR2(keys(kind)));
  const run = kind => cache['M' + kind] || (cache['M' + kind] = leakRun(keys(kind), ETA, 'iv13-q', false));
  const bitsOf = R => 0.5 * Math.log2(1 / (1 - R));
  const SHOW = 300;
  const COL = { iid: 'var(--t-lucky-louis)', copy: 'var(--t-fallen-apple)' };

  const walk = {
    label: 'One element along the keys',
    legend: false,
    draw(box, ctx) {
      box.append(legend(KINDS.map(k => [k.name, COL[k.id], 'line'])));
      KINDS.forEach((k, i) => {
        const rows = ctx.rows.filter(r => r.kind === k.id), last = i === 1, b = h('div');
        box.append(b);
        const P = Plot(b, { x: [0, SHOW - 1], y: [-3.6, 3.6], h: last ? 150 : 120, m: { l: 46, r: 10, t: 20, b: last ? 36 : 6 }, yticks: [-3, 0, 3],
          xticks: last ? [0, 100, 200, 299] : [], xlabel: last ? 'key position t' : '', ylabel: 'element 0', label: `Element 0 of the first ${SHOW} keys, ${k.name}` });
        if (ctx.sel) rows.forEach(r => { if (ctx.sel.test(r)) el('rect', { x: P.x(r.t - 0.5), width: P.x(1) - P.x(0), y: P.m.t, height: P.ph, style: 'fill:color-mix(in srgb, var(--c) 14%, transparent)' }, P.g.bg); });
        line(P, rows.map(r => [r.t, r.x]), { color: COL[k.id], width: 1.4, name: k.name });
        el('text', { x: P.m.l, y: P.m.t - 7 * P.fs, class: 'lbl', text: k.name }, P.g.top);
        crosshair(P, { xname: 'key', xfmt: v => fmt(v, 0), yfmt: v => fmt(v, 2) });
      });
    },
  };

  DS.define('idea-leak', {
    rows() {
      const { d } = LEAK;
      return KINDS.flatMap(k => { const K = keys(k.id); return range(SHOW).map(t => ({ kind: k.id, t, x: K[t * d], next: K[(t + 1) * d] })); });
    },
    columns: [
      { key: 'kind', label: 'keys', left: true, fmt: v => (v === 'iid' ? 'independent' : 'close copies') },
      { key: 't', label: 'key t' }, { key: 'x', label: 'element 0 of key t', fmt: v => fmt(v, 3) }, { key: 'next', label: 'element 0 of key t + 1', fmt: v => fmt(v, 3) },
    ],
    highlights: {},
    views: {
      pairs: Object.assign(DS.views.scatter({
        x: 'x', y: 'next', color: 'kind', catLabel: c => KINDS.find(k => k.id === c).name, catSeries: c => (c === 'iid' ? 5 : 1),
        xlabel: 'element 0 of key t', ylabel: 'element 0 of key t + 1', equal: true, xdomain: [-3.6, 3.6], ydomain: [-3.6, 3.6], r: 2.4, h: 320,
        label: 'Each key against the next', tip: r => `<b>key ${r.t}</b> (${r.kind === 'iid' ? 'independent' : 'close copies'})<br>element 0: ${fmt(r.x, 2)}<br>next key: ${fmt(r.next, 2)}`,
      }), { legend: false }),
      walk,
    },
    helpers: { LEAK, leakKeys, neighbourR2, topk, leakRun, keys, r2, ETA },
    metrics: [
      { id: 'r2', label: 'neighbour predictability $\\vRsq$', value: () => KINDS.map(k => r2(k.id)), fmt: v => `${fmt(v[0], 3)} independent · ${fmt(v[1], 2)} close copies`,
        note: 'How much of each element of key t is explained by the same element of key t − 1, averaged over the 32 elements and all 4,096 keys. Independent keys: nothing. Close copies: nine tenths.' },
      { id: 'bits', label: 'bits a neighbour could save', value: () => KINDS.map(k => bitsOf(r2(k.id))), fmt: v => `${fmt(v[0], 3)} · ${fmt(v[1], 2)} bits per element`,
        note: 'The exchange rate of II.12, ½ log₂ 1/(1 − R²). For the independent keys, fallen-apple similarity is zero by construction.' },
      { id: 'overlap', label: 'consecutive overlap at η ≈ 0.25', value: () => KINDS.map(k => run(k.id).overlap), fmt: v => `${fmtPct(v[0], 0)} · ${fmtPct(v[1], 0)}`,
        note: 'The share of each step’s 64 picks that the step before also picked. HiSparse measured about 70 % on a real model — and the incompressible keys match it.' },
      { id: 'hit', label: 'LRU hit rate at η ≈ 0.25', value: () => KINDS.map(k => run(k.id).hit), fmt: v => `${fmtPct(v[0], 0)} · ${fmtPct(v[1], 0)}`,
        note: 'A hot cache of B = 128 = 2k slots. Near HiSparse’s 87 % for both kinds of keys: the hit rate follows the query’s drift, not the keys’ resemblance.' },
    ],
    code: `
import numpy as np, pandas as pd

k = pd.read_csv("{csv}")            # first 300 keys of each kind: element 0 of key t and of key t+1
for kind, s in k.groupby("kind"):
    r2 = np.corrcoef(s.x, s.next)[0, 1] ** 2
    print(f"{kind:5s}  R2 {r2:.3f}  bits a neighbour saves {0.5 * np.log2(1 / (1 - r2)):.2f}")
# (The card's R2 uses all 4,096 keys and all 32 elements; this sample of 300 x element 0 gives about the same.
#  The overlap and hit rate come from the Monte Carlo run of the page, reproduced by its numpy snippet.)
`,
  });
})();
