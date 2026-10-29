// The previous-value residuals of the Gull Rock temperatures (II.10–II.11): reading minus the reading before, in tenths
// of a degree. Derived from DS.rows('temp'). The first reading has no previous one, so both ends guess the four-week
// average (11.0 °C) for it — exactly what FIG.siPredict does, so the card and the figure agree to the last digit.
(function () {
  const histH = vals => { const c = new Map(); vals.forEach(v => c.set(v, (c.get(v) || 0) + 1)); return entropy([...c.values()]); };
  const sd = rows => Math.sqrt(variance(rows.map(r => r.r)));
  // Discretised Gaussian and Laplace with standard deviation s (as in school-info.js, page II.11).
  function erf(x) {
    const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
    return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a));
  }
  const PHI = x => 0.5 * (1 + erf(x / Math.SQRT2));
  const lapCdf = (x, b) => (x < 0 ? 0.5 * Math.exp(x / b) : 1 - 0.5 * Math.exp(-x / b));
  const pmf = (kind, s, k) => (kind === 'gauss' ? PHI((k + 0.5) / s) - PHI((k - 0.5) / s) : lapCdf(k + 0.5, s / Math.SQRT2) - lapCdf(k - 0.5, s / Math.SQRT2));
  const LO = -12, HI = 12;

  DS.define('resid', {
    rows() {
      const T = DS.rows('temp'), m = Math.round(mean(T.map(x => x.v)));
      return T.map((x, i) => { const guess = i ? T[i - 1].v : m; return { day: x.day, time: x.time, t: x.t, v: x.v, guess, r: x.v - guess, rc: (x.v - guess) / 10, front: x.front }; });
    },
    columns: [
      { key: 'day', label: 'day' },
      { key: 'time', label: 'time' },
      { key: 'v', label: 'reading x' },
      { key: 'guess', label: 'guess (previous)' },
      { key: 'r', label: 'residual r', fmt: v => (v > 0 ? '+' : '') + fmt(v) },
      { key: 'front', label: 'passing', left: true },
    ],
    csvColumns: ['day', 'time', 'v', 'guess', 'r'],
    highlights: {
      night: { label: 'the first night (00:30–04:00)', test: r => r.t > 0 && r.t <= 8 / 48 },
      fronts: { label: 'fronts passing', test: r => r.front !== '' },
    },
    views: {
      histogram: DS.views.histogram({
        key: 'r', domain: [LO, HI + 1], xlabel: 'residual (tenths of a degree)', ylabel: 'readings', unit: 'tenths', noun: 'residuals', xticks: [-12, -9, -6, -3, 0, 3, 6, 9, 12], h: 280,
        label: 'Histogram, with the two shapes',
        after(P, ctx) {
          const s = sd(ctx.rows), n = ctx.rows.length, ks = range(LO, HI + 1);
          [['gauss', series(2)], ['lap', series(4)]].forEach(([kind, col]) => line(P, ks.map(k => [k, n * pmf(kind, s, k)]), { color: col, width: 2, markers: 2.6 }));
          P.svg.closest('div').before(legend([['residuals counted', series(0), 'box'], [`Gaussian with the same σ`, series(2)], ['Laplace with the same σ', series(4)]]));
        },
      }),
      timeline: DS.views.timeline({
        x: 't', y: 'rc', xlabel: 'day', ylabel: 'residual (°C)', xname: 'day', width: 1, ydomain: [-1.3, 1.3], zero: false,
        xfmt: v => `${Math.floor(v) + 1}`, yfmt: v => `${fmt(v, 1)} °C`, xticks: [0, 7, 14, 21, 28], xtfmt: v => `day ${v + 1}`, label: 'Over four weeks',
      }),
    },
    metrics: [
      { id: 'n', label: 'residuals', value: rows => rows.length, fmt: v => v.toLocaleString('en-US'), note: 'One for every reading. The very first has no previous reading, so its guess is the four-week average.' },
      { id: 'mean', label: 'mean', tex: '\\vmu', value: rows => mean(rows.map(r => r.r)), fmt: v => `${fmt(v, 3)} tenths`,
        note: 'Practically zero: the guess is as often too high as too low. Over four weeks the residuals add up to the last reading minus the first guess.' },
      { id: 'sd', label: 'standard deviation', tex: '\\vsigma', value: sd, fmt: v => `${fmt(v, 2)} tenths`,
        note: 'The typical miss of “the same as last time”: about 0.3 °C, eight times narrower than the 24.2 tenths of the readings themselves.' },
      { id: 'entropy', label: 'entropy of the histogram', tex: '\\vH', value: rows => histH(rows.map(r => r.r)), fmt: v => `${fmt(v, 2)} bits`,
        note: 'What these residuals cost an entropy coder, per reading.' },
      { id: 'gauss', label: 'formula, Gaussian', value: rows => Math.log2(sd(rows)) + 0.5 * Math.log2(2 * Math.PI * Math.E), fmt: v => `${fmt(v, 2)} bits`,
        note: '$\\log_2\\vsigma + 2.05$: the cost if the residuals were bell-shaped. A whisker above the measured entropy.' },
      { id: 'laplace', label: 'formula, Laplace', value: rows => Math.log2(sd(rows)) + Math.log2(Math.SQRT2 * Math.E), fmt: v => `${fmt(v, 2)} bits`,
        note: '$\\log_2\\vsigma + 1.94$. The measured cost sits much nearer the Gaussian: sensor noise and many small weather nudges add up to a bell. Only the fronts poke out of it, too few to make the tails fat.' },
      { id: 'largest', label: 'largest miss', value: rows => rows.reduce((a, r) => (Math.abs(r.r) > Math.abs(a.r) ? r : a)).r,
        fmt: (v, rows) => { const r = rows.find(x => x.r === v); return `${fmt(v)} tenths · day ${r.day}, ${r.time}`; },
        note: 'As the fourth front passes, the temperature drops 1.1 °C in half an hour.' },
      { id: 'width', label: 'fixed width for every residual', value: rows => Math.ceil(Math.log2(Math.max(...rows.map(r => r.r)) - Math.min(...rows.map(r => r.r)) + 1)), fmt: v => `${v} bits`,
        note: 'Two bits fewer than the readings need: the range shrank from 112 values to a couple of dozen.' },
    ],
    code: `
import numpy as np, pandas as pd

res = pd.read_csv("{csv}")              # columns: day, time, v, guess, r (tenths of a degree)
r = res["r"].to_numpy()

_, c = np.unique(r, return_counts=True); p = c / c.sum()
s = r.std()
print("mean", r.mean().round(3), " sd", s.round(2), "tenths")
print("entropy", -(p * np.log2(p)).sum().round(2), "bits")
print("Gaussian formula", (np.log2(s) + 0.5 * np.log2(2 * np.pi * np.e)).round(2),
      " Laplace formula", (np.log2(s) + np.log2(np.sqrt(2) * np.e)).round(2))
`,
  });
})();
