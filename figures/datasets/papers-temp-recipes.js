// The Gull Rock temperatures (II.10–II.12) coded with two recipes from Part V. Derived: rows() reads DS.rows('resid'),
// which reads DS.rows('temp'), so every reading and every previous-value residual is the one of Part II.
//  - CacheGen (V.11): cut the readings into groups of 10; the first of each group is its anchor, every other reading is
//    stored as its difference from the anchor (token distances 1 to 9).
//  - KVComp (V.12): the same readings on a 10× coarser grid, whole degrees instead of tenths, with the same predictor
//    ("the same as last time"; the first reading guesses the four-week average, as in II.10).
(function () {
  const G = 10;
  const histH = vals => { const c = new Map(); vals.forEach(v => c.set(v, (c.get(v) || 0) + 1)); return entropy([...c.values()]); };
  const sd = a => Math.sqrt(variance(a));
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const hhmm = i => `${String(Math.floor((i % 48) / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
  const anc = rows => rows.filter(r => r.pos > 0).map(r => r.a);
  const byDist = rows => range(1, G).map(d => rows.filter(r => r.pos === d).map(r => r.a));
  const bits = ratio => 0.5 * Math.log2(ratio);
  const sgn = v => (v > 0 ? '+' : '') + fmt(v);

  // Two days of readings with their anchors; below, what is stored: the difference from the anchor, or from the reading before.
  function anchors(box, ctx) {
    const N = 96, rows = ctx.rows.slice(0, N);
    box.append(legend([['reading (°C)', series(0)], ['anchor: first reading of each group of 10', series(1), 'dot'], ['minus the anchor', series(1), 'box'], ['minus the reading before', series(2)]]));
    const b1 = h('div'), b2 = h('div'); box.append(b1, b2);
    const xo = { x: [-0.5, N - 0.5], xticks: [0, 12, 24, 36, 48, 60, 72, 84], xfmt: i => (i % 48 === 0 ? `day ${i / 48 + 1}` : hhmm(i)) };
    const P1 = Plot(b1, { ...xo, y: [7, 15.5], h: 220, ylabel: '°C', grid: 'y', label: 'Two days of Gull Rock temperatures, cut into groups of ten readings' });
    const P2 = Plot(b2, { ...xo, y: [-3.2, 3.2], h: 200, ylabel: 'difference (°C)', xlabel: 'reading', grid: 'y', label: 'Differences from the group anchor and from the previous reading' });
    [P1, P2].forEach(P => range(1, Math.ceil(N / G)).forEach(k => el('line', { x1: P.x(k * G - 0.5), x2: P.x(k * G - 0.5), y1: P.m.t, y2: P.H - P.m.b, style: 'stroke:var(--rule);stroke-dasharray:2 4' }, P.g.bg)));
    line(P1, rows.map((r, i) => [i, r.v / 10]), { color: series(0), width: 1.6 });
    rows.forEach((r, i) => { if (r.pos === 0) { const d = dot(P1.g.top, P1.x(i), P1.y(r.v / 10), 4.2 * P1.fs, series(1), { tabindex: 0 }); hover(d, () => `<b>anchor of group ${r.group + 1}</b><br>day ${r.day}, ${r.time}: ${fmt(r.v / 10, 1)} °C`); } });
    rule(P2, { y: 0, dash: false, color: 'var(--ink-3)' });
    const bw = Math.max(1, (P2.x(1) - P2.x(0)) * 0.72);
    rows.forEach((r, i) => {
      if (r.pos === 0) return;
      const y0 = P2.y(0), y1 = P2.y(r.a / 10);
      const bar = el('rect', { x: P2.x(i) - bw / 2, width: bw, y: Math.min(y0, y1), height: Math.abs(y1 - y0), style: `fill:${mix(series(1), 60)}` }, P2.g.data);
      hover(bar, () => `<b>day ${r.day}, ${r.time}</b> (distance ${r.pos} from its anchor)<br>reading ${fmt(r.v / 10, 1)} °C<br>minus the anchor: ${sgn(r.a)} tenths<br>minus the reading before: ${sgn(r.r)} tenths`);
    });
    line(P2, rows.map((r, i) => [i, i ? r.r / 10 : NaN]), { color: series(2), width: 1.6 });
    box.append(h('p', { class: 'fig-note', text: 'Dotted lines cut the readings into groups of ten (five hours). Each bar is what CacheGen’s recipe stores for one reading: its distance from the group’s first reading. The peacock line is what “the same as last time” stores. Bars grow along each group as the day warms or cools; the line stays near zero.' }));
  }

  // How far a reading strays from its anchor, by distance; the previous reading and the mean for comparison.
  function distance(box, ctx) {
    const s = byDist(ctx.rows).map(sd), sPrev = sd(ctx.rows.slice(1).map(r => r.r)), sAll = sd(ctx.rows.map(r => r.v));
    box.append(legend([['minus the anchor, by distance', series(1), 'box'], [`minus the reading before: ${fmt(sPrev, 1)}`, series(2), 'dash'], [`minus the four-week mean (the spread σ): ${fmt(sAll, 1)}`, 'var(--ink-2)', 'dash']]));
    const b = h('div'); box.append(b);
    const P = Plot(b, { xcats: range(1, G).map(String), y: [0, 28], h: 260, grid: 'y', xlabel: 'distance from the anchor (readings)', ylabel: 'typical size (tenths of °C)', label: 'Typical size of the difference from the anchor at each distance' });
    bars(P, s, { colors: () => mix(series(1), 75), labels: v => fmt(v, 1), tip: (v, i) => `<b>distance ${i + 1}</b> (${fmt((i + 1) / 2, 1)} hours after the anchor)<br>typical difference ${fmt(v, 1)} tenths<br>variance ÷ the readings’ variance: ${fmt((v / sAll) ** 2, 2)}` });
    rule(P, { y: sPrev, color: series(2) });
    rule(P, { y: sAll, color: 'var(--ink-2)' });
    box.append(h('p', { class: 'fig-note', text: 'Standard deviations, in tenths of a degree, over all 1,344 readings. At distance 1 the anchor is the reading before; by distance 9, four and a half hours later, the difference is almost as wide as the readings themselves.' }));
  }

  // One day on two grids: tenths of a degree and whole degrees.
  function staircase(box, ctx) {
    const day = 3, rows = ctx.rows.filter(r => r.day === day);
    box.append(legend([['in tenths of a degree (the stored grid of Part II)', series(0)], ['in whole degrees (a 10× coarser grid)', series(3)]]));
    const b = h('div'); box.append(b);
    const [lo, hi] = extent(rows.flatMap(r => [r.v / 10, r.deg]));
    const P = Plot(b, { x: [0, 47], y: [Math.floor(lo) - 0.5, Math.ceil(hi) + 0.5], h: 250, grid: 'y', xticks: [0, 12, 24, 36, 47], xfmt: i => hhmm(i), xlabel: `day ${day}, time`, ylabel: '°C', label: 'One day of temperatures on a fine and a coarse grid' });
    line(P, rows.map((r, i) => [i, r.deg]), { color: series(3), width: 2.4, curve: 'step' });
    line(P, rows.map((r, i) => [i, r.v / 10]), { color: series(0), width: 1.4, markers: 1.8, tip: (p, i) => `<b>${rows[i].time}</b><br>${fmt(rows[i].v / 10, 1)} °C → ${rows[i].deg} °C` });
    box.append(h('p', { class: 'fig-note', text: 'On the coarse grid a reading has only a handful of possible values and mostly repeats the one before: fewer bits to spend, and fewer for a predictor to save.' }));
  }

  // The bill on both grids: each reading alone, and minus the reading before.
  function bill(box, ctx) {
    const R = ctx.rows, g = [[histH(R.map(r => r.v)), histH(R.map(r => r.r))], [histH(R.map(r => r.deg)), histH(R.map(r => r.dr))]];
    box.append(legend([['each reading alone (order-0)', series(0), 'box'], ['minus the reading before', series(2), 'box']]));
    const b = h('div'); box.append(b);
    const P = Plot(b, { xcats: ['tenths of a degree', 'whole degrees'], y: [0, 8.4], h: 270, grid: 'y', ylabel: 'bits per reading', label: 'Entropy of the readings and of the previous-value residuals on two grids' });
    bars(P, g, { colors: (i, j) => series(j ? 2 : 0), width: 60, labels: v => fmt(v, 2),
      tip: (v, i, j) => `<b>${i ? 'whole degrees' : 'tenths'}, ${j ? 'minus the reading before' : 'each reading alone'}</b><br>${fmt(v, 2)} bits per reading` });
    g.forEach(([a, c], i) => svgText(P.g.top, P.x(i), P.y(Math.max(a, c)) - 26 * P.fs, `saves ${fmt(a - c, 2)} · ${fmtPct((a - c) / a, 0)}`, { class: 'annot', 'text-anchor': 'middle' }));
    box.append(h('p', { class: 'fig-note', text: 'Entropies of the histograms over all 1,344 readings. The predictor saves fewer bits on the coarse grid, but a larger share of what is left.' }));
  }

  DS.define('papers-temp-recipes', {
    rows() {
      const R = DS.rows('resid');
      const deg = R.map(r => Math.round(r.v / 10)), m = Math.round(mean(deg));
      return R.map((r, i) => {
        const pos = i % G, a0 = R[i - pos].v;
        return { day: r.day, time: r.time, t: r.t, v: r.v, r: r.r, group: Math.floor(i / G), pos, anchor: a0, a: r.v - a0, aStr: pos ? sgn(r.v - a0) : 'anchor', deg: deg[i], dr: deg[i] - (i ? deg[i - 1] : m) };
      });
    },
    columns: [
      { key: 'day', label: 'day' }, { key: 'time', label: 'time' },
      { key: 'v', label: 'reading (tenths)' },
      { key: 'pos', label: 'place in group' },
      { key: 'aStr', label: 'minus anchor' },
      { key: 'r', label: 'minus previous', fmt: v => sgn(v) },
      { key: 'deg', label: 'whole °C' },
      { key: 'dr', label: 'whole °C minus previous', fmt: v => sgn(v) },
    ],
    csvColumns: ['day', 'time', 'v'],
    highlights: {
      anchors: { label: 'anchors (first of each group)', test: r => r.pos === 0 },
    },
    views: {
      anchors: { label: 'Anchors and differences', draw: anchors, legend: false, highlights: [] },
      distance: { label: 'By distance from the anchor', draw: distance, legend: false, highlights: [] },
      staircase: { label: 'One day, two grids', draw: staircase, legend: false, highlights: [] },
      bill: { label: 'Bits on two grids', draw: bill, legend: false, highlights: [] },
    },
    metrics: [
      { id: 'n', label: 'readings', value: rows => rows.length, fmt: (v, rows) => `${v.toLocaleString('en-US')} in ${Math.ceil(v / G)} groups of ${G}`,
        note: 'The four weeks of Gull Rock temperatures from II.10, one channel read token after token. Each group of ten covers five hours.' },
      { id: 'sd', label: 'spread of the readings', tex: '\\vsigma', value: rows => sd(rows.map(r => r.v)), fmt: v => `${fmt(v, 1)} tenths of °C`,
        note: 'The distance from the channel’s own typical value (its four-week mean): the baseline a neighbour has to beat.' },
      { id: 'ancRatio', label: 'variance ÷ variance of the anchor differences', value: rows => variance(rows.map(r => r.v)) / variance(anc(rows)),
        fmt: v => `${fmt(v, 2)}× · ${fmt(bits(v), 2)} bits`,
        note: 'CacheGen’s statistic, measured per channel on our toy: the differences from the anchor are about three times narrower in variance than the readings. At the exchange rate that is worth less than one bit per reading.' },
      { id: 'prevRatio', label: 'variance ÷ variance of the differences from the reading before', value: rows => variance(rows.map(r => r.v)) / variance(rows.slice(1).map(r => r.r)),
        fmt: v => `${fmt(v, 0)}× · ${fmt(bits(v), 2)} bits`,
        note: 'The nearest neighbour does twenty times better than the anchor: half an hour is too short for the day to move, four and a half hours is not. Anchors buy parallel decoding; here they pay for it in bits.' },
      { id: 'ancH', label: 'entropy: readings · minus anchor · minus previous', tex: '\\vH', value: rows => [histH(rows.map(r => r.v)), histH(anc(rows)), histH(rows.map(r => r.r))],
        fmt: v => `${fmt(v[0], 2)} · ${fmt(v[1], 2)} · ${fmt(v[2], 2)} bits`,
        note: (v, rows) => { const T = variance(rows.map(r => r.v)); return `Measured, not from the formula: the anchor saves ${fmt(v[0] - v[1], 2)} bits per stored difference, the reading before ${fmt(v[0] - v[2], 2)}. The exchange-rate formula gives ${fmt(bits(T / variance(anc(rows))), 2)} and ${fmt(bits(T / variance(rows.slice(1).map(r => r.r))), 2)}: close to both.`; } },
      { id: 'steps', label: 'spread in grid steps: tenths · whole degrees', value: rows => [sd(rows.map(r => r.v)), sd(rows.map(r => r.deg))],
        fmt: v => `${fmt(v[0], 1)} · ${fmt(v[1], 1)} steps`,
        note: 'The same channel, measured with a ruler ten times coarser. Two and a half steps is the coarse lossy territory of KVComp; twenty-four is closer to an 8-bit grid.' },
      { id: 'fine', label: 'tenths: alone → minus the reading before', value: rows => [histH(rows.map(r => r.v)), histH(rows.map(r => r.r))],
        fmt: v => `${fmt(v[0], 2)} → ${fmt(v[1], 2)} bits · saves ${fmt(v[0] - v[1], 2)} (${fmtPct((v[0] - v[1]) / v[0], 0)})`,
        note: 'The fine grid of Part II: the predictor of II.10 saves almost three bits, a little under half the bill.' },
      { id: 'coarse', label: 'whole degrees: alone → minus the reading before', value: rows => [histH(rows.map(r => r.deg)), histH(rows.map(r => r.dr))],
        fmt: v => `${fmt(v[0], 2)} → ${fmt(v[1], 2)} bits · saves ${fmt(v[0] - v[1], 2)} (${fmtPct((v[0] - v[1]) / v[0], 0)})`,
        note: 'The same predictor on the coarse grid saves fewer bits but two thirds of the bill. A coarse grid shrinks every cost, and the order-0 cost fastest.' },
    ],
    code: `
import numpy as np, pandas as pd

v = pd.read_csv("{csv}")["v"].to_numpy()        # columns: day, time, v (tenths of a degree)

def H(x):                                        # entropy of the histogram, bits per value
    _, c = np.unique(x, return_counts=True); p = c / c.sum()
    return -(p * np.log2(p)).sum()

pos = np.arange(len(v)) % 10                     # place in the group of ten; 0 = the anchor
anchor = v[np.arange(len(v)) - pos]
a = (v - anchor)[pos > 0]                        # CacheGen-style differences from the anchor
r = np.diff(v, prepend=round(v.mean()))          # differences from the reading before (II.10)
print("variance ratios: anchor", (v.var() / a.var()).round(2), " previous", (v.var() / r[1:].var()).round(0))
print("entropies:", H(v).round(2), H(a).round(2), H(r).round(2))

d = np.floor(v / 10 + 0.5).astype(int)           # whole degrees (rounding halves up, as the site does)
dr = np.diff(d, prepend=round(d.mean()))
print("tenths:", H(v).round(2), "->", H(r).round(2), "  whole degrees:", H(d).round(2), "->", H(dr).round(2))
`,
  });
})();
