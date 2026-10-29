// The forecaster's three notebooks of VI.13 (scope), tried on the pressure of the Gull Rock station messages
// (dataset station-messages: two days, 96 half-hourly readings, as a storm comes in). Before each reading she guesses:
//   almanac   — the coast's long-term average for late October, 1013 hPa (global scope: fit once, shared by all);
//   storm log — the average of this storm's readings so far (request scope: fit on this storm's own history);
//   hour sheet — the reading just before (block scope: the most local notebook).
// Derived: rows() reads DS.rows('station-messages'). Scores use readings 2–96 (the first has no history).
(function () {
  const ALMANAC = 1013;
  const BOOKS = [
    { key: 'almanac', name: 'almanac (global)', s: 6 },
    { key: 'storm', name: 'storm log (this storm)', s: 4 },
    { key: 'hour', name: 'hour sheet (the last reading)', s: 2 },
  ];
  const TICKS = { 0: '28 Oct 14:30', 19: '29 Oct', 43: 'noon', 67: '30 Oct', 91: 'noon' };
  const scored = rows => rows.filter(r => r.i > 0);
  const rms = (rows, k) => Math.sqrt(mean(scored(rows).map(r => (r.p - r[k]) ** 2)));
  const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), 1);

  DS.define('homework-notebooks', {
    rows() {
      const src = DS.rows('station-messages');
      let s = 0;
      return src.map((m, i) => {
        const row = { i, when: m.when, p: m.pressure_hpa, almanac: ALMANAC, storm: i ? +(s / i).toFixed(2) : NaN, hour: i ? src[i - 1].pressure_hpa : NaN };
        s += m.pressure_hpa;
        return row;
      });
    },
    columns: [
      { key: 'when', label: 'reading', left: true }, { key: 'p', label: 'pressure (hPa)', fmt: v => v.toFixed(1) },
      { key: 'storm', label: 'storm-log guess', fmt: v => (isFinite(v) ? v.toFixed(1) : '—') },
      { key: 'hour', label: 'hour-sheet guess', fmt: v => (isFinite(v) ? v.toFixed(1) : '—') },
      { key: 'mA', label: 'miss: almanac', fmt: (v, r) => sgn(r.p - r.almanac) },
      { key: 'mS', label: 'miss: storm log', fmt: (v, r) => (r.i ? sgn(r.p - r.storm) : '—') },
      { key: 'mH', label: 'miss: hour sheet', fmt: (v, r) => (r.i ? sgn(r.p - r.hour) : '—') },
    ],
    csvColumns: ['when', 'p', 'almanac', 'storm', 'hour'],
    highlights: { last: { label: 'the last hour (13:00–14:00, 30 Oct)', test: r => r.i >= 93 } },
    views: {
      guesses: {
        label: 'Readings and guesses',
        draw(box, ctx) {
          box.append(legend([['pressure, as radioed', 'var(--ink)', 'line'], ...BOOKS.map(b => [b.name, series(b.s), b.key === 'almanac' ? 'dash' : 'line'])]));
          const b = h('div'); box.append(b);
          const P = Plot(b, { x: [0, 95], y: [975, 1016], h: 300, xlabel: 'time', ylabel: 'pressure (hPa)', xticks: Object.keys(TICKS).map(Number), xfmt: v => TICKS[v] || '',
            label: 'Station pressure over two days, with the three notebooks’ guesses' });
          const R = ctx.rows;
          line(P, R.map(r => [r.i, r.almanac]), { color: series(6), dash: true, width: 2, name: 'almanac' });
          line(P, R.map(r => [r.i, r.storm]), { color: series(4), width: 2, name: 'storm log' });
          line(P, R.map(r => [r.i, r.hour]), { color: series(2), width: 2.6, curve: 'step', name: 'hour sheet' });
          line(P, R.map(r => [r.i, r.p]), { color: 'var(--ink)', width: 1.2, name: 'pressure' });
          if (ctx.hl) R.filter(ctx.hl.test).forEach(r => dot(P.g.data, P.x(r.i), P.y(r.p), 3.4 * P.fs, series(1)));
          if (ctx.sel) R.filter(ctx.sel.test).forEach(r => dot(P.g.data, P.x(r.i), P.y(r.p), 3 * P.fs, 'var(--c)'));
          annotate(P, 60, 1013, 'the almanac: 1013 every time', { dx: 10, dy: 26 });
          annotate(P, 70, R[70].storm, 'the storm log lags behind', { dx: 10, dy: -34 });
          crosshair(P, { xname: 'reading', xfmt: v => R[clamp(Math.round(v), 0, 95)].when, yfmt: v => `${fmt(v, 1)} hPa` });
        },
      },
      misses: {
        label: 'How far off, on average',
        legend: false,
        draw(box, ctx) {
          const b = h('div'); box.append(b);
          const v = BOOKS.map(k => rms(ctx.rows, k.key));
          const P = Plot(b, { ycats: BOOKS.map(k => k.name), x: [0, 24], h: 210, grid: 'x', xlabel: 'typical miss, root mean square (hPa)', label: 'Typical miss of each notebook' });
          bars(P, v, { horizontal: true, colors: i => series(BOOKS[i].s), width: 30, labels: x => `${fmt(x, 2)} hPa`,
            tip: (x, i) => `<b>${BOOKS[i].name}</b><br>typical miss ${fmt(x, 2)} hPa over readings 2–96` });
          box.append(h('p', { class: 'fig-note', text: `Each narrower notebook misses by less: the storm log halves the almanac’s miss, the hour sheet cuts the storm log’s by a factor of ${fmt(v[1] / v[2], 0)}.` }));
        },
      },
    },
    metrics: [
      { id: 'rms', label: 'typical miss: almanac · storm log · hour sheet', value: rows => BOOKS.map(k => rms(rows, k.key)), fmt: v => v.map(x => `${fmt(x, 2)}`).join(' · ') + ' hPa',
        note: 'Root mean square of reading minus guess, over the 95 readings that have a history. The almanac knows only the season; the storm log knows this storm, but lags behind its fall; the hour sheet knows where the pressure was half an hour ago.' },
      { id: 'reqgain', label: 'bits saved by the storm log over the almanac', value: rows => Math.log2(rms(rows, 'almanac') / rms(rows, 'storm')), fmt: v => `≈ ${fmt(v, 1)} bit per reading`,
        note: 'By the rule “halve the typical miss, save one bit” (II.11). This is the request rung of the ladder: what knowing this particular storm adds to the almanac.' },
      { id: 'blkgain', label: 'bits saved by the hour sheet over the storm log', value: rows => Math.log2(rms(rows, 'storm') / rms(rows, 'hour')), fmt: v => `≈ ${fmt(v, 1)} bits per reading`,
        note: 'The block rung: the most local notebook is by far the best guesser here, because pressure changes slowly from one half hour to the next. Whether KV entries are like that — whether neighbours really are better guessers — is the bet of this project.' },
      { id: 'now', label: 'the notebooks now (after the last reading)', value: rows => [mean(rows.map(r => r.p)), rows.slice(-3).map(r => r.p)],
        fmt: v => `storm log ${fmt(v[0], 1)} · hour sheet ${v[1].map(x => x.toFixed(1)).join(', ')}`,
        note: 'Two days into the storm: its readings average about 995.5 hPa, and the last hour read 978.9, 978.6, 978.2. The almanac still says 1013.' },
    ],
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("{csv}")                       # when, p (hPa), and the three guesses made before each reading
d = d.iloc[1:]                                 # the first reading has no history
rms = {k: np.sqrt(((d.p - d[k]) ** 2).mean()) for k in ["almanac", "storm", "hour"]}
print({k: round(v, 2) for k, v in rms.items()})
print(f"storm log over almanac: {np.log2(rms['almanac'] / rms['storm']):.1f} bit")
print(f"hour sheet over storm log: {np.log2(rms['storm'] / rms['hour']):.1f} bits")
`,
  });
})();
