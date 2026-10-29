// The Gull Rock temperatures, shuffled (VII.2, VII.17): every reading of DS 'temp' kept, only the order destroyed.
// Row i holds the i-th reading in time order (v) and, beside it, the i-th reading after a seeded shuffle (vs).
// It is the shuffle control of Part VII on data the reader knows: the histogram stays, the neighbours go.
(function () {
  const histH = vals => { const c = new Map(); vals.forEach(v => c.set(v, (c.get(v) || 0) + 1)); return entropy([...c.values()]); };
  const diffs = a => a.slice(1).map((v, i) => v - a[i]);
  // squared correlation of each value with the one g places before it: the R² of the best straight-line guess
  const r2gap = (a, g) => {
    const x = a.slice(g), y = a.slice(0, a.length - g), mx = mean(x), my = mean(y);
    let s = 0, sx = 0, sy = 0;
    x.forEach((v, i) => { s += (v - mx) * (y[i] - my); sx += (v - mx) ** 2; sy += (y[i] - my) ** 2; });
    return (s * s) / (sx * sy);
  };
  const exch = r2 => 0.5 * Math.log2(1 / (1 - r2));
  const both = (rows, f) => [f(rows.map(r => r.v)), f(rows.map(r => r.vs))];
  const tint = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const IN = series(0), SH = series(1);

  // Two timelines, one above the other, on the same temperature axis.
  const orders = {
    label: 'In order and shuffled',
    legend: false,
    draw(box, ctx) {
      [['v', 'in time order', IN], ['vs', 'shuffled', SH]].forEach(([k, name, col]) => {
        const b = h('div'); box.append(b);
        const P = Plot(b, { x: [0, 28], y: [4, 18], h: 180, xlabel: name === 'shuffled' ? 'position in the record (reading number)' : '', ylabel: '°C', xticks: [0, 7, 14, 21, 28],
          xfmt: v => (name === 'shuffled' ? `${v * 48}` : `day ${v + 1}`), label: `The 1,344 temperature readings, ${name}` });
        line(P, ctx.rows.map((r, i) => [i / 48, r[k] / 10]), { color: col, width: k === 'v' ? 1.2 : 0.7 });
        el('text', { x: P.m.l + 8 * P.fs, y: P.m.t + 14 * P.fs, class: 'lbl', text: name }, P.g.top);
      });
      box.append(h('p', { class: 'fig-note', text: 'The same 1,344 numbers twice. Top: as the thermometer wrote them, half an hour apart. Bottom: dealt out in a random order. Every value is still there; only the neighbours are no longer neighbours.' }));
    },
  };

  // Each reading against the one before it, for both orders, as small dots.
  const lag = {
    label: 'Against the reading before',
    legend: false,
    draw(box, ctx) {
      box.append(legend([['in time order', IN, 'dot'], ['shuffled', SH, 'dot']]));
      const b = h('div'); box.append(b);
      const P = Plot(b, { x: [4.5, 18], y: [4.5, 18], h: 330, equal: true, xlabel: 'the reading before (°C)', ylabel: 'this reading (°C)', label: 'Each reading against the one before, in order and shuffled' });
      el('line', { x1: P.x(4.5), y1: P.y(4.5), x2: P.x(18), y2: P.y(18), style: 'stroke:var(--ink-3);stroke-dasharray:5 4' }, P.g.bg);
      const rows = ctx.rows;
      rows.forEach((r, i) => { if (i) el('circle', { cx: P.x(rows[i - 1].vs / 10), cy: P.y(r.vs / 10), r: 1.6 * P.fs, style: `fill:${tint(SH, 45)}` }, P.g.data); });
      rows.forEach((r, i) => { if (i) el('circle', { cx: P.x(rows[i - 1].v / 10), cy: P.y(r.v / 10), r: 1.6 * P.fs, style: `fill:${tint(IN, 60)}` }, P.g.data); });
      annotate(P, 15.6, 15.6, 'guess = the reading before', { dx: -60, dy: -34 });
      box.append(h('p', { class: 'fig-note', text: 'In order, the dots hug the diagonal: the reading before is an excellent guess. Shuffled, they fill a square: the reading before says nothing about this one.' }));
    },
  };

  DS.define('missed-shuffled', {
    rows() {
      const T = DS.rows('temp');
      const perm = rng('missed-shuffle').shuffle(range(T.length));
      return T.map((x, i) => ({ k: i, day: x.day, time: x.time, v: x.v, vs: T[perm[i]].v, from: `day ${T[perm[i]].day}, ${T[perm[i]].time}` }));
    },
    columns: [
      { key: 'k', label: 'position' },
      { key: 'day', label: 'day' },
      { key: 'time', label: 'time' },
      { key: 'v', label: 'in order (tenths)' },
      { key: 'vs', label: 'shuffled (tenths)' },
      { key: 'from', label: 'shuffled reading is really from', left: true },
    ],
    csvColumns: ['k', 'v', 'vs'],
    views: {
      orders,
      lag,
      histogram: Object.assign(DS.views.histogram({ key: 'v', bin: 5, domain: [50, 180], xlabel: 'temperature (tenths of °C)', ylabel: 'readings', unit: 'tenths', noun: 'readings', xticks: [60, 80, 100, 120, 140, 160],
        label: 'Histogram (the same for both)' }), { note: 'One histogram serves both columns: shuffling moves readings, it never changes them.' }),
    },
    metrics: [
      { id: 'entropy', label: 'entropy of the histogram, either order', tex: '\\vH', value: rows => both(rows, histH), fmt: v => `${fmt(v[0], 2)} · ${fmt(v[1], 2)} bits`,
        note: 'Identical, to the last digit. Anything that looks at one reading at a time — its histogram, its solo cost, which readings exist — cannot tell the two columns apart.' },
      { id: 'r2', label: 'variance explained by the reading before', tex: '\\vRsq', value: rows => both(rows, a => r2gap(a, 1)), fmt: v => `${fmtPct(v[0], 1)} in order · ${fmtPct(v[1], 2)} shuffled`,
        note: 'In order, the reading half an hour before explains nearly everything. Shuffled, the reading before is a stranger: it explains essentially nothing.' },
      { id: 'exch', label: 'bits saved, by the exchange rate', value: rows => both(rows, a => exch(r2gap(a, 1))), fmt: v => `${fmt(v[0], 2)} in order · ${fmt(v[1], 3)} shuffled`,
        note: '$\\tfrac12\\log_2\\frac{1}{1-\\vRsq}$ of the line above. A real neighbour effect must vanish when the order is shuffled, and this one does.' },
      { id: 'saved', label: 'bits saved by subtracting the reading before, measured', value: rows => both(rows, a => histH(a) - histH(diffs(a))), fmt: v => `${fmtS(v[0], 2)} in order · ${fmtS(v[1], 2)} shuffled`,
        note: 'Entropy of the readings minus entropy of the differences. Shuffled, the saving turns into a loss of about half a bit: subtracting an unrelated value adds its spread to the residual, so the variance doubles.' },
    ],
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("{csv}")                     # columns: k, v (in order), vs (shuffled), tenths of a degree

def H(a):                                    # entropy of the histogram, bits per value
    _, c = np.unique(a, return_counts=True); p = c / c.sum()
    return -(p * np.log2(p)).sum()

for col in ("v", "vs"):
    a = d[col].to_numpy()
    r2 = np.corrcoef(a[1:], a[:-1])[0, 1] ** 2
    print(col, "H", H(a).round(2), " R2", r2.round(4),
          " exchange", (0.5 * np.log2(1 / (1 - r2))).round(3), " measured", (H(a) - H(np.diff(a))).round(2))
`,
  });
})();
