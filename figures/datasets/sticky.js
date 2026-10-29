// The sticky sky: four weeks of half-hourly sky reports (1,344, one row of 48 per day) from an illustrative model —
// with probability 0.8 (the stickiness) the sky carries on from half an hour before, otherwise the next report is drawn
// afresh from the year's distribution (sunny ½, cloudy ¼, rain ⅛, fog ⅛). Seed 'ds-sticky-288' (picked so that the sample's own numbers match the model's to two decimals). Pages II.4 and II.6.
// The model's exact numbers (II.6: the previous report saves 1.01 bits) are computed alongside the sample's.
(function () {
  const SKY = ['sunny', 'cloudy', 'rain', 'fog'], P = [1 / 2, 1 / 4, 1 / 8, 1 / 8], STICK = 0.8, DAYS = 28;
  const SKY_SERIES = [3, 6, 0, 7];
  const skyCol = s => series(SKY_SERIES[SKY.indexOf(s)]);
  const hhmm = i => `${String(Math.floor((i % 48) / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
  const tint = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const draw = r => { let u = r(), k = 0; while (k < 3 && u >= P[k]) { u -= P[k]; k++; } return k; };
  const counts = ks => SKY.map((_, k) => ks.filter(v => v === k).length);
  const trans = rows => { const T = SKY.map(() => [0, 0, 0, 0]); rows.forEach((r, i) => { if (i) T[rows[i - 1].k][r.k]++; }); return T; };
  const condH = T => { const t = T.map(r => r.reduce((a, b) => a + b, 0)), n = t.reduce((a, b) => a + b, 0); return T.reduce((a, r, i) => a + (t[i] ? t[i] / n * entropy(r) : 0), 0); };
  const modelCondH = P.reduce((a, p, i) => a + p * entropy(P.map((q, j) => (1 - STICK) * q + (i === j ? STICK : 0))), 0);
  const runs = rows => { const out = []; rows.forEach((r, i) => { if (i && rows[i - 1].k === r.k) out[out.length - 1].n++; else out.push({ k: r.k, n: 1 }); }); return out; };
  // mosaic lives in sky.js (loaded first); fetched lazily so the order of definition does not matter
  const mosaicView = o => ({ label: o.label, draw: (box, ctx) => DS.spec('sky').mosaic(o).draw(box, ctx) });
  const common = {
    key: 'sky', color: skyCol, cols: 48, legend: SKY.map(s => [s, skyCol(s)]), rowEvery: 1,
    colTicks: [[0, '00:00'], [12, '06:00'], [24, '12:00'], [36, '18:00']],
  };
  let shuffled = null;

  /** What follows what: a 4 × 4 grid, rows = the previous report, columns = the next, shaded by share of the row. */
  const transitions = {
    label: 'What follows what',
    draw(box, ctx) {
      const T = trans(ctx.rows);
      const D = Diagram(box, { w: 640, h: 290, label: 'Counts of each sky report following each other', grow: 0.4 });
      const g = el('g', {}, D.svg), x0 = 170, y0 = 54 * D.fs, cw = 110, ch = (D.H - y0 - 14) / 4;
      el('text', { x: x0 + 2 * cw, y: 16 * D.fs, 'text-anchor': 'middle', class: 'lbl', text: 'next report →' }, g);
      el('text', { x: 8, y: y0 - 10 * D.fs, class: 'lbl', text: 'previous ↓' }, g);
      SKY.forEach((s, j) => el('text', { x: x0 + (j + 0.5) * cw, y: y0 - 10 * D.fs, 'text-anchor': 'middle', class: 'lbl', text: s }, g));
      T.forEach((row, i) => {
        const tot = row.reduce((a, b) => a + b, 0);
        el('rect', { x: 8, y: y0 + i * ch + 6, width: 14, height: ch - 12, rx: 3, style: `fill:${skyCol(SKY[i])}` }, g);
        el('text', { x: 30, y: y0 + (i + 0.5) * ch + 4 * D.fs, class: 'lbl', text: `${SKY[i]} (${tot})` }, g);
        row.forEach((c, j) => {
          const sh = tot ? c / tot : 0;
          const cell = el('g', { tabindex: 0, 'aria-label': `${SKY[i]} then ${SKY[j]}: ${c}` }, g);
          el('rect', { x: x0 + j * cw + 2, y: y0 + i * ch + 2, width: cw - 4, height: ch - 4, rx: 5, style: `fill:${tint(skyCol(SKY[j]), Math.round(8 + 85 * sh))};stroke:${i === j ? 'var(--ink-2)' : 'var(--rule)'};stroke-width:${i === j ? 2 : 1}` }, cell);
          el('text', { x: x0 + (j + 0.5) * cw, y: y0 + (i + 0.5) * ch + 4 * D.fs, 'text-anchor': 'middle', class: 'val', text: `${fmtPct(sh, 0)}` }, cell);
          hover(cell, () => `<b>${SKY[i]} → ${SKY[j]}</b><br>${c} of the ${tot} reports after ${SKY[i]} (${fmtPct(sh, 1)})<br>a fresh draw alone would give ${fmtPct(P[j], 1)}`);
        });
      });
    },
  };

  DS.define('sticky', {
    rows() {
      const r = rng('ds-sticky-288'), ks = [];
      for (let i = 0; i < DAYS * 48; i++) ks.push(i && r() < STICK ? ks[i - 1] : draw(r));
      return ks.map((k, i) => ({ day: Math.floor(i / 48) + 1, time: hhmm(i), sky: SKY[k], k, same: i && ks[i - 1] === k ? 'yes' : i ? 'no' : '' }));
    },
    columns: [
      { key: 'day', label: 'day' },
      { key: 'time', label: 'time' },
      { key: 'sky', label: 'sky', left: true },
      { key: 'same', label: 'same as before?', left: true },
    ],
    csvColumns: ['day', 'time', 'sky'],
    highlights: {
      fog: { label: 'fog', test: r => r.sky === 'fog' },
      changes: { label: 'the sky changes', test: r => r.same === 'no' },
    },
    views: {
      mosaic: mosaicView(Object.assign({ label: 'Four weeks, in order', title: 'Four weeks of half-hourly sky reports, one row per day', rowLabel: k => `day ${k + 1}`,
        tip: (r) => `<b>day ${r.day}, ${r.time}</b><br>${r.sky}${r.same === 'yes' ? ' (as before)' : r.same === 'no' ? ' (changed)' : ''}` }, common)),
      shuffled: {
        label: 'The same, shuffled',
        draw(box, ctx) {
          if (!shuffled) shuffled = rng('ds-sticky-shuffle').shuffle(DS.rows('sticky'));
          const pos = new Map(DS.rows('sticky').map((r, i) => [r, i]));
          const rows = shuffled.filter(r => ctx.rows.includes(r));
          DS.spec('sky').mosaic(Object.assign({ title: 'The same reports in a random order', rowLabel: k => `row ${k + 1}`,
            tip: r => `<b>${r.sky}</b><br>really from day ${r.day}, ${r.time} (report ${pos.get(r)})` }, common, { colTicks: null })).draw(box, Object.assign({}, ctx, { rows }));
        },
      },
      transitions,
      counts: DS.views.categories({ key: 'sky', order: SKY, catSeries: c => SKY_SERIES[SKY.indexOf(c)], xlabel: 'sky', ylabel: 'reports', noun: 'reports', label: 'How often each sky' }),
    },
    metrics: [
      { id: 'n', label: 'reports', value: rows => rows.length, fmt: v => v.toLocaleString('en-US'), note: 'One every half hour for 28 days: 48 a day.' },
      { id: 'order0', label: 'order-0 entropy', tex: '\\vH(\\vX)', value: rows => entropy(counts(rows.map(r => r.k))), fmt: v => `${fmt(v, 2)} bits`,
        note: 'From the four counts alone: 1.75 bits, like the noon archive of II.3. The shuffled picture has the same counts, so the same order-0 entropy. The counts know nothing about the runs.' },
      { id: 'repeats', label: 'reports that repeat the one before', value: rows => rows.filter(r => r.same === 'yes').length / (rows.length - 1), fmt: v => fmtPct(v, 1),
        note: 'The model carries the sky on 80 % of the time, and a fresh draw lands on the same sky by chance about a third of the rest. Shuffled, only about 34 % of neighbours would match.' },
      { id: 'run', label: 'average run of one sky', value: rows => { const u = runs(rows); return rows.length / u.length; }, fmt: v => `${fmt(v, 1)} reports`,
        note: (v, rows) => `About ${fmt(v / 2, 1)} hours before the sky changes. The longest run is ${Math.max(...runs(rows).map(u => u.n))} reports of ${SKY[runs(rows).reduce((a, u) => (u.n > a.n ? u : a)).k]}.` },
      { id: 'condH', label: 'with the previous report known', tex: '\\vH(\\vX \\mid \\vY)', value: rows => condH(trans(rows)), fmt: v => `${fmt(v, 2)} bits`,
        note: `The average entropy of the rows of “what follows what”, each weighted by how often its sky comes. The model's exact value is ${fmt(modelCondH, 2)} bits.` },
      { id: 'saved', label: 'bits the previous report saves', tex: '\\vI(\\vX;\\vY)', value: rows => entropy(counts(rows.map(r => r.k))) - condH(trans(rows)), fmt: v => `${fmt(v, 2)} bits`,
        note: `The model's exact value is ${fmt(1.75 - modelCondH, 2)} bits per report: six times what the season saves (0.16).` },
    ],
    code: `
import numpy as np, pandas as pd

sky = pd.read_csv("{csv}")["sky"]       # 1,344 half-hourly reports, in order

def H(counts):
    p = np.asarray(counts, float); p = p[p > 0] / p.sum()
    return -(p * np.log2(p)).sum()

print("order-0 entropy", H(sky.value_counts()).round(2), "bits")
print("repeats", (sky.values[1:] == sky.values[:-1]).mean().round(3))

T = pd.crosstab(sky.values[:-1], sky.values[1:])     # previous -> next
H_prev = sum(T.loc[a].sum() / T.values.sum() * H(T.loc[a]) for a in T.index)
print("H(next | previous)", H_prev.round(2), "bits;  saved", (H(sky.value_counts()) - H_prev).round(2))
`,
  });
})();
