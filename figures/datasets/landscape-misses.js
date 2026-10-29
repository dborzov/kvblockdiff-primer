// HiSparse's measured miss rates on its GLM-5.1 trace (III.8–III.11): six (policy, slots) pairs.
// The Part III figures read these rows (and helpers.fit, the power law through the LRU points)
// instead of keeping their own copies.
(function () {
  const ROWS = [
    { policy: 'topk', name: 'keep only the current top-k', B: 2048, miss: 0.30 },
    { policy: 'lru', name: 'LRU', B: 4096, miss: 0.134 },
    { policy: 'fifo', name: 'FIFO (oldest fetch goes first)', B: 4096, miss: 0.172 },
    { policy: 'random', name: 'random eviction', B: 4096, miss: 0.161 },
    { policy: 'belady', name: 'Bélády (knows the future)', B: 4096, miss: 0.082 },
    { policy: 'lru', name: 'LRU', B: 8192, miss: 0.067 },
  ];
  const SHORT = { topk: 'top-k only', lru: 'LRU', fifo: 'FIFO', random: 'random', belady: 'Bélády' };
  const COLOR = { topk: series(0), lru: series(0), fifo: series(1), random: series(1), belady: series(4) };
  // Keeping only the current top-k is LRU with B = k slots, so it is the first LRU point.
  const isLRU = r => r.policy === 'lru' || r.policy === 'topk';
  // least-squares fit of log m = log a + s·log(B/2048) through the LRU points
  function fit(rows) {
    const pts = rows.filter(isLRU), xs = pts.map(r => Math.log(r.B / 2048)), ys = pts.map(r => Math.log(r.miss));
    const mx = mean(xs), my = mean(ys);
    const s = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / sum(xs.map(x => (x - mx) ** 2));
    const a = Math.exp(my - s * mx);
    return { s, a, m: B => a * Math.pow(B / 2048, s), slots: m => 2048 * Math.pow(m / a, 1 / s) };
  }
  const get = (rows, policy, B) => rows.find(r => r.policy === policy && r.B === B).miss;
  const nf = v => Math.round(v).toLocaleString('en-US');

  // Horizontal bars: one per measurement, miss rate (with the hit rate as the pale rest of the bar).
  function policies(box, ctx) {
    const rows = ctx.rows, wide = box.getBoundingClientRect().width > 520 || !box.getBoundingClientRect().width;
    const names = rows.map(r => (wide ? `${SHORT[r.policy]}, ${nf(r.B)} slots` : `${SHORT[r.policy]} ${r.B / 1024}K`));
    const P = Plot(box, { ycats: names, x: [0, 0.36], h: 300, xlabel: 'miss rate m', xfmt: v => fmtPct(v, 0), xticks: [0, 0.1, 0.2, 0.3], grid: 'x', label: 'Miss rate of each eviction policy on HiSparse’s trace' });
    bars(P, rows.map(r => r.miss), {
      horizontal: true, width: 22,
      colors: (i) => { const r = rows[i], c = COLOR[r.policy]; return (ctx.hl && !ctx.hl.test(r)) || (ctx.sel && !ctx.sel.test(r)) ? `color-mix(in srgb, ${c} 30%, transparent)` : c; },
      labels: v => fmtPct(v, 1),
      tip: (v, i) => `<b>${rows[i].name}</b><br>${nf(rows[i].B)} slots per layer per request<br>miss rate ${fmtPct(v, 1)} · hit rate ${fmtPct(1 - v, 1)}`,
    });
    P.g.top.querySelectorAll('.pk-bar-hits .hit').forEach((hit, i) => {
      hit.style.cursor = 'pointer';
      hit.addEventListener('click', () => ctx.select({ label: rows[i].name + `, ${nf(rows[i].B)} slots`, test: r => r === rows[i] }));
    });
    box.append(legend([['LRU (keeping only the top-k is LRU with k slots)', series(0), 'box'], ['FIFO and random eviction', series(1), 'box'], ['Bélády, clairvoyant', series(4), 'box']]));
  }

  // The LRU points against cache size, on ordinary axes: each doubling roughly halves the misses.
  function bysize(box, ctx) {
    const pts = ctx.rows.filter(isLRU), F = fit(ctx.rows);
    const P = Plot(box, { x: [1536, 11000], xlog: 2, y: [0, 0.34], h: 270, xticks: [2048, 4096, 8192], xfmt: v => nf(v), yfmt: v => fmtPct(v, 0), yticks: [0, 0.1, 0.2, 0.3], grid: 'y',
      xlabel: 'hot-cache slots B (log scale)', ylabel: 'miss rate m', label: 'LRU miss rate against hot-cache size' });
    line(P, linspace(11, 13, 40).map(l => [2 ** l, F.m(2 ** l)]), { color: `color-mix(in srgb, ${series(0)} 45%, transparent)`, width: 1.6, dash: '5 4' });
    pts.forEach((r, i) => {
      const d = dot(P.g.data, P.x(r.B), P.y(r.miss), 6 * P.fs, ctx.hl && !ctx.hl.test(r) ? 'var(--ink-3)' : series(0));
      hover(d, () => `<b>LRU, ${nf(r.B)} slots</b><br>miss rate ${fmtPct(r.miss, 1)}<br>power-law fit ${fmtPct(F.m(r.B), 1)}`);
      el('text', { x: P.x(r.B) + 10 * P.fs, y: P.y(r.miss) - 6 * P.fs, class: 'val', text: fmtPct(r.miss, 1) }, P.g.top);
      if (i) {
        const q = pts[i - 1], xm = Math.sqrt(q.B * r.B), ym = (q.miss + r.miss) / 2;
        el('text', { x: P.x(xm), y: P.y(ym) - 8 * P.fs, class: 'annot', 'text-anchor': 'middle', text: `× ${fmt(r.miss / q.miss, 2)}` }, P.g.top);
      }
    });
  }

  DS.define('landscape-misses', {
    rows: () => ROWS.map(r => Object.assign({}, r, { hit: 1 - r.miss, label: SHORT[r.policy] })),
    columns: [
      { key: 'name', label: 'eviction policy', left: true }, { key: 'B', label: 'slots B', fmt: v => nf(v) },
      { key: 'miss', label: 'miss rate m', fmt: v => fmtPct(v, 1) }, { key: 'hit', label: 'hit rate', fmt: v => fmtPct(v, 1) },
    ],
    csvColumns: ['policy', 'B', 'miss'],
    highlights: {
      lru: { label: 'LRU', test: isLRU },
      at4096: { label: 'all at 4096 slots', test: r => r.B === 4096 },
    },
    views: {
      policies: { label: 'Policies', legend: false, draw: policies,
        note: 'Averages over 78 layers and 1,799 decode steps of one GLM-5.1 request (100,384 tokens, k = 2048). Hover or tap a bar; click to select it.' },
      bysize: { label: 'LRU by cache size', highlights: [], legend: false, draw: bysize,
        note: 'The three LRU points (keeping only the top-k is LRU with 2048 slots), against slots on a log scale; the label between two points is the ratio of their miss rates. Dashed: the power-law fit of III.9.' },
    },
    metrics: [
      { id: 'overlap', label: 'selections repeated from the step before', value: rows => 1 - get(rows, 'topk', 2048), fmt: v => fmtPct(v, 0),
        note: 'A desk holding exactly the last step’s picks hits exactly the picks that repeat. So its 30 % miss rate says: on average 70 % of a step’s selections were selected one step earlier. In the toy trace of III.7 it was 3 of 4.' },
      { id: 'lru4096', label: 'LRU, 4096 slots', value: rows => get(rows, 'lru', 4096), fmt: v => `${fmtPct(v, 1)} missed`,
        note: 'HiSparse’s headline setting. Doubling the desk beyond $\\vk$ catches most of the positions that sit out a step or two and come back.' },
      { id: 'fifo', label: 'FIFO and random, 4096 slots', value: rows => [get(rows, 'fifo', 4096), get(rows, 'random', 4096)], fmt: v => v.map(x => fmtPct(x, 1)).join(' · '),
        note: 'Both worse than LRU on the same desk. What was used recently predicts the next selection; what was fetched recently does not, which is the storm-morning verdict of II.21 at full size.' },
      { id: 'belady', label: 'Bélády, 4096 slots', value: rows => get(rows, 'belady', 4096), fmt: v => `${fmtPct(v, 1)} missed`,
        note: 'The best any eviction rule could do with this desk, replayed with knowledge of the future. Even it misses one selection in twelve.' },
      { id: 'gap', label: 'LRU minus Bélády', value: rows => get(rows, 'lru', 4096) - get(rows, 'belady', 4096), fmt: v => `${fmt(v * 100, 1)} points`,
        note: 'All that a cleverer eviction policy could still win, at most. Little is left there; the remaining lever is the size of the desk.' },
      { id: 'lru8192', label: 'LRU, 8192 slots', value: rows => get(rows, 'lru', 8192), fmt: v => `${fmtPct(v, 1)} missed`,
        note: 'Twice the slots of the headline setting, half the misses, and twice the GPU memory per request.' },
      { id: 'ratios', label: 'each doubling of $\\vB$ multiplies the misses by', value: rows => { const p = rows.filter(isLRU); return p.slice(1).map((r, i) => r.miss / p[i].miss); },
        fmt: v => v.map(x => fmt(x, 2)).join(' · '), note: 'From 2048 to 4096 slots, and from 4096 to 8192. Two ratios close to one half: double the desk, halve the trips in the lift.' },
      { id: 'slope', label: 'power law through the LRU points', value: rows => fit(rows), fmt: F => `${tex('\\vm(\\vB) \\approx')} ${fmt(F.a, 3)} × (B/2048)<sup>${fmt(F.s, 2)}</sup>`,
        note: F => `A straight line on log–log axes. Its slope, ${fmt(F.s, 2)}, says that doubling the slots multiplies the misses by $2^{${fmt(F.s, 2)}} \\approx ${fmt(2 ** F.s, 2)}$. Fitted to three averaged points, so treat the exponent as roughly 1, not as a law.` },
      { id: 'beladyEq', label: 'LRU slots that match Bélády at 4096', value: rows => fit(rows).slots(get(rows, 'belady', 4096)), fmt: v => `≈ ${nf(Math.round(v / 100) * 100)} slots`,
        note: 'Read off the fitted curve: a perfect eviction oracle is worth what about 60 % more desk space buys, and no real policy is a perfect oracle.' },
    ],
    helpers: { fit, isLRU, get },
    code: `
import numpy as np, pandas as pd

m = pd.read_csv("{csv}")                         # columns: policy, B, miss
get = lambda p, B: m[(m.policy == p) & (m.B == B)].miss.item()
print("repeated from the step before:", 1 - get("topk", 2048))
print("LRU minus Belady at 4096:", round(get("lru", 4096) - get("belady", 4096), 3))

lru = m[m.policy.isin(["topk", "lru"])].sort_values("B")   # top-k only = LRU with B = k
print("ratios:", np.round(lru.miss.values[1:] / lru.miss.values[:-1], 2))
s, ia = np.polyfit(np.log(lru.B / 2048), np.log(lru.miss), 1)
a = np.exp(ia)
print("fit: m(B) =", round(a, 3), "* (B/2048) **", round(s, 2))
print("LRU slots matching Belady:", round(2048 * (get("belady", 4096) / a) ** (1 / s)))
`,
  });
})();
