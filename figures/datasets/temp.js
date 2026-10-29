// Gull Rock temperatures: 28 days × 48 half-hourly readings (1,344), in whole tenths of a degree.
// Exactly the generator figures/school-info.js used for II.10–II.12 (seed 'si-temp'): a daily cycle peaking at 15:00,
// a slow weather wander, five fronts (each changing the temperature over three hours) and sensor noise of σ = 1 tenth.
(function () {
  const DAYS = 28, N = DAYS * 48;
  const FRONTS = [[170, -30], [395, -22], [560, 34], [810, -28], [1060, 30]];   // [reading, change in tenths], over 6 readings
  const hhmm = i => `${String(Math.floor((i % 48) / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
  const histH = vals => { const c = new Map(); vals.forEach(v => c.set(v, (c.get(v) || 0) + 1)); return entropy([...c.values()]); };
  const widthBits = vals => Math.ceil(Math.log2(Math.max(...vals) - Math.min(...vals) + 1));
  const diffs = rows => { const m = Math.round(mean(rows.map(r => r.v))); return rows.map((r, i) => r.v - (i ? rows[i - 1].v : m)); };   // as DS 'resid'
  const r2 = rows => 1 - variance(diffs(rows)) / variance(rows.map(r => r.v));
  const inFront = i => FRONTS.findIndex(([at]) => i >= at && i <= at + 6);
  const tint = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const xtfmt = v => `day ${v + 1}`;

  /** Each reading against the one before, as a 2-D histogram in °C; the dashed diagonal is “the same as last time”. */
  const lag = {
    label: 'Against the previous reading',
    draw(box, ctx) {
      const rows = ctx.rows, idx = ctx.idx, cnt = new Map(), hlc = new Map();
      rows.forEach(r => {
        const i = idx.get(r); if (!i) return;
        const k = DS.rows('temp')[i - 1].v * 1000 + r.v;
        cnt.set(k, (cnt.get(k) || 0) + 1);
        if (ctx.hl && ctx.hl.test(r)) hlc.set(k, (hlc.get(k) || 0) + 1);
      });
      const top = Math.max(...cnt.values());
      const P = Plot(box, { x: [5, 18], y: [5, 18], h: 340, xlabel: 'previous reading (°C)', ylabel: 'this reading (°C)', label: 'Each temperature reading against the one half an hour before' });
      el('line', { x1: P.x(5), y1: P.y(5), x2: P.x(18), y2: P.y(18), style: 'stroke:var(--ink-3);stroke-dasharray:5 4' }, P.g.bg);
      cnt.forEach((c, key) => {
        const a = Math.floor(key / 1000) / 10, b = (key % 1000) / 10, hot = hlc.get(key);
        const rc = el('rect', { x: P.x(a - 0.05), y: P.y(b + 0.05), width: P.x(a + 0.05) - P.x(a - 0.05), height: P.y(b - 0.05) - P.y(b + 0.05),
          style: `fill:${tint(hot ? series(1) : series(0), 30 + 70 * Math.sqrt(c / top))}` }, P.g.data);
        hover(rc, () => `previous <b>${fmt(a, 1)} °C</b> → this <b>${fmt(b, 1)} °C</b><br>${c} time${c > 1 ? 's' : ''}`);
      });
      annotate(P, 15.5, 15.5, 'guess = previous', { dx: -70, dy: -30 });
    },
  };

  DS.define('temp', {
    rows() {
      const r = rng('si-temp');
      let w = 0;
      return range(N).map(i => {
        const hour = (i / 2) % 24;
        const cycle = 25 * Math.cos(2 * Math.PI * (hour - 15) / 24);
        w = 0.985 * w + r.normal(0, 1.1);
        const fr = FRONTS.reduce((a, [at, d]) => a + d * clamp((i - at) / 6, 0, 1), 0);
        const v = Math.round(138 + cycle + w + fr + r.normal(0, 1.0));
        const f = inFront(i);
        return { day: Math.floor(i / 48) + 1, time: hhmm(i), t: i / 48, v, c: v / 10, front: f < 0 ? '' : `front ${f + 1} (${FRONTS[f][1] > 0 ? 'warm' : 'cold'})` };
      });
    },
    columns: [
      { key: 'day', label: 'day' },
      { key: 'time', label: 'time' },
      { key: 'v', label: 'tenths of °C' },
      { key: 'c', label: '°C', fmt: v => fmt(v, 1) },
      { key: 'front', label: 'passing', left: true },
    ],
    csvColumns: ['day', 'time', 'v'],
    highlights: {
      fronts: { label: 'fronts passing', test: r => r.front !== '' },
      night: { label: 'the first night (00:00–03:30)', test: r => r.day === 1 && r.t < 8 / 48 },
    },
    views: {
      timeline: DS.views.timeline({
        x: 't', y: 'c', xlabel: 'day', ylabel: 'temperature (°C)', xname: 'day', width: 1.2, ydomain: [4, 18], zero: false,
        xfmt: v => `${Math.floor(v) + 1}, ${hhmm(Math.round(v * 48))}`, yfmt: v => `${fmt(v, 1)} °C`,
        xticks: [0, 7, 14, 21, 28], xtfmt, label: 'Four weeks',
      }),
      histogram: DS.views.histogram({ key: 'c', bin: 0.5, domain: [5, 18], xlabel: 'temperature (°C)', ylabel: 'readings', unit: '°C', noun: 'readings', xticks: [6, 8, 10, 12, 14, 16], label: 'How often each temperature' }),
      lag,
    },
    metrics: [
      { id: 'n', label: 'readings', value: rows => rows.length, fmt: v => v.toLocaleString('en-US'), note: 'One every 30 minutes for 28 days.' },
      { id: 'mean', label: 'mean', tex: '\\vmu', mark: 'c', short: 'mean', value: rows => mean(rows.map(r => r.c)), fmt: v => `${fmt(v, 1)} °C`,
        note: '“The average” predictor of II.10 guesses this for every reading. It is known to both ends, and it saves nothing.' },
      { id: 'sd', label: 'standard deviation', tex: '\\vsigma', value: rows => Math.sqrt(variance(rows.map(r => r.v))), fmt: v => `${fmt(v / 10, 1)} °C · ${fmt(v, 1)} tenths`,
        note: 'The typical distance of a reading from the mean (II.11 defines it). Most of it is the daily swing of about ±2.5 °C, the rest the weather and the fronts.' },
      { id: 'distinct', label: 'different values', value: rows => new Set(rows.map(r => r.v)).size, fmt: v => `${v} (in tenths)`,
        note: (v, rows) => `From ${fmt(Math.min(...rows.map(r => r.c)), 1)} to ${fmt(Math.max(...rows.map(r => r.c)), 1)} °C. With 1,344 readings spread over ${v} values, many values are seen only a few times — the histogram's entropy is estimated a little low.` },
      { id: 'entropy', label: 'entropy of the histogram', tex: '\\vH', value: rows => histH(rows.map(r => r.v)), fmt: v => `${fmt(v, 2)} bits`,
        note: 'What an entropy coder would need per reading if it sent the readings themselves, one at a time. This is the bill that prediction attacks.' },
      { id: 'width', label: 'fixed width for the readings', value: rows => widthBits(rows.map(r => r.v)), fmt: v => `${v} bits`,
        note: 'Enough slots for every value between the lowest and the highest reading (as on II.9, offset to start at the lowest).' },
      { id: 'r2', label: 'variance explained by the previous reading', tex: '\\vRsq', value: r2, fmt: v => fmtPct(v, 1),
        note: 'The cloud hugs the diagonal: a reading is almost always within a few tenths of the one before. Only 1.6 % of the variance is left for the residual.' },
      { id: 'exch', label: 'bits saved, by the exchange rate', value: rows => 0.5 * Math.log2(1 / (1 - r2(rows))), fmt: v => `${fmt(v, 2)} bits`,
        note: 'The formula $\\tfrac12\\log_2\\frac{1}{1-\\vRsq}$, which assumes bell-shaped values and residuals.' },
      { id: 'saved', label: 'bits saved, measured', value: rows => histH(rows.map(r => r.v)) - histH(diffs(rows)), fmt: v => `${fmt(v, 2)} bits`,
        note: (v, rows) => `Histogram entropy of the readings minus that of the previous-value residuals (${fmt(histH(rows.map(r => r.v)), 2)} − ${fmt(histH(diffs(rows)), 2)}). Close to the formula, a little below it: the readings are not quite bell-shaped.` },
    ],
    code: `
import numpy as np, pandas as pd

temp = pd.read_csv("{csv}")             # columns: day, time, v (tenths of a degree)
v = temp["v"].to_numpy()

def H(vals):                            # entropy of the histogram, bits per value
    _, c = np.unique(vals, return_counts=True); p = c / c.sum()
    return -(p * np.log2(p)).sum()

print(len(v), "readings; mean", (v.mean() / 10).round(1), "°C; sd", v.std().round(1), "tenths")
print("entropy", H(v).round(2), "bits; width", int(np.ceil(np.log2(v.max() - v.min() + 1))), "bits")

r = np.diff(v, prepend=round(v.mean()))  # previous-value residuals (the first guess: the average)
R2 = 1 - r.var() / v.var()
print("R2", R2.round(3), " formula", (0.5 * np.log2(1 / (1 - R2))).round(2), " measured", (H(v) - H(r)).round(2))
`,
  });
})();
