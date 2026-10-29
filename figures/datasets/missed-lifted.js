// The two mast thermometers of the ten days, turned by 45° with three integer shears (VII.10). Readings are whole tenths
// of a degree; each shear moves one coordinate by a rounded multiple of the other, so the turn undoes exactly.
// Derived: rows() reads DS.rows('ten-days'). Compare thermo-axes (II.15), the same turn in real numbers.
(function () {
  const TH = -Math.PI / 4, T = Math.tan(TH / 2), S = Math.sin(TH);
  const lift = (x1, x2) => { x1 -= Math.round(T * x2); x2 += Math.round(S * x1); x1 -= Math.round(T * x2); return [x1, x2]; };
  const unlift = (x1, x2) => { x1 += Math.round(T * x2); x2 -= Math.round(S * x1); x1 += Math.round(T * x2); return [x1, x2]; };
  const histH = vals => { const c = new Map(); vals.forEach(v => c.set(v, (c.get(v) || 0) + 1)); return entropy([...c.values()]); };
  const gauss = vals => 0.5 * Math.log2(2 * Math.PI * Math.E * variance(vals));   // bits of a bell of this spread, on a grid of step 1
  const col = (rows, k) => rows.map(r => r[k]);
  const per = (rows, f, a, b) => (f(col(rows, a)) + f(col(rows, b))) / 2;
  const bound = rows => {
    const x = col(rows, 'low'), y = col(rows, 'mast'), mx = mean(x), my = mean(y);
    const a = variance(x), c = variance(y), b = mean(x.map((v, i) => (v - mx) * (y[i] - my)));
    const m = (a + c) / 2, d = Math.sqrt(((a - c) / 2) ** 2 + b * b);
    return { l1: m + d, l2: m - d, gain: 0.5 * Math.log2(m / Math.sqrt((m + d) * (m - d))) };
  };

  DS.define('missed-lifted', {
    rows() {
      return DS.rows('ten-days').map(r => {
        const low = Math.round(r.low * 10), mast = Math.round(r.mast * 10), [a, d] = lift(low, mast), [u, w] = unlift(a, d);
        return { day: r.day, time: r.time, low, mast, a, d, back: u === low && w === mast ? 'yes' : 'NO' };
      });
    },
    columns: [
      { key: 'day', label: 'day' }, { key: 'time', label: 'time' },
      { key: 'low', label: 'foot (tenths)' }, { key: 'mast', label: 'top (tenths)' },
      { key: 'a', label: 'lifted 1st' }, { key: 'd', label: 'lifted 2nd' },
      { key: 'back', label: 'undone exactly?' },
    ],
    csvColumns: ['day', 'time', 'low', 'mast', 'a', 'd'],
    views: {
      before: DS.views.scatter({ x: 'low', y: 'mast', equal: true, r: 2.2, h: 300, label: 'As measured', xlabel: 'foot thermometer (tenths of °C)', ylabel: 'top thermometer (tenths of °C)',
        tip: r => `<b>day ${r.day}, ${r.time}</b><br>foot ${r.low}, top ${r.mast}` }),
      after: Object.assign(DS.views.scatter({ x: 'a', y: 'd', equal: true, r: 2.2, h: 300, label: 'After three shears', xlabel: 'first lifted coordinate (≈ the sum)', ylabel: 'second (≈ the difference)',
        tip: r => `<b>day ${r.day}, ${r.time}</b><br>foot ${r.low}, top ${r.mast}<br>→ (${r.a}, ${r.d})` }),
      { note: 'The same 480 pairs of whole numbers after the three shears, on equal axes. The tilted cloud is now lying flat: almost all the spread is in the first coordinate, the second barely moves.' }),
    },
    metrics: [
      { id: 'exact', label: 'readings rebuilt exactly', value: rows => rows.filter(r => r.back === 'yes').length, fmt: (v, rows) => `${v} of ${rows.length}`,
        note: 'Run the three shears backwards with the signs flipped, and every pair of whole numbers comes back to the last tenth. Lossless.' },
      { id: 'distinct', label: 'different pairs, before → after', value: rows => [new Set(rows.map(r => `${r.low},${r.mast}`)).size, new Set(rows.map(r => `${r.a},${r.d}`)).size], fmt: v => `${v[0]} → ${v[1]}`,
        note: 'No two inputs land on the same output. Rotate-then-round could not promise that; the shears can.' },
      { id: 'bound', label: 'transform coding gain from the eigenvalues', value: rows => bound(rows).gain, fmt: (v, rows) => { const B = bound(rows); return `${fmt(v, 2)} bits per value (λ = ${fmt(B.l1, 0)} and ${fmt(B.l2, 1)})`; },
        note: '½ log₂ of the eigenvalues’ arithmetic over geometric mean, for the pair in tenths² (II.16). The most an exact real-valued turn could save.' },
      { id: 'gauss', label: 'bits per value, before → after (bell-curve rule)', value: rows => [per(rows, gauss, 'low', 'mast'), per(rows, gauss, 'a', 'd')], fmt: v => `${fmt(v[0], 2)} → ${fmt(v[1], 2)} · saves ${fmt(v[0] - v[1], 2)}`,
        note: (v, rows) => `Each coordinate priced by its spread, as on II.11. The lifted turn keeps ${fmt(v[0] - v[1], 2)} of the ${fmt(bound(rows).gain, 2)} bits the formula promises: the rounding inside the shears costs a few hundredths.` },
      { id: 'hist', label: 'bits per value, before → after (histograms)', value: rows => [per(rows, histH, 'low', 'mast'), per(rows, histH, 'a', 'd')], fmt: v => `${fmt(v[0], 2)} → ${fmt(v[1], 2)} · saves ${fmt(v[0] - v[1], 2)}`,
        note: 'The entropy of each coordinate’s histogram. A little lower than the bell-curve figure: 480 readings spread over a hundred values leave many values seen once, which makes a histogram look cheaper than the source really is.' },
    ],
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("{csv}")                    # columns: day, time, low, mast (tenths), a, d (lifted)
low, mast = d["low"].to_numpy(), d["mast"].to_numpy()

def lift(x1, x2, th):                       # a rotation by th as three integer shears
    t, s = np.tan(th / 2), np.sin(th)
    x1 = x1 - np.round(t * x2); x2 = x2 + np.round(s * x1); x1 = x1 - np.round(t * x2)
    return x1, x2

def unlift(x1, x2, th):                     # the same steps, backwards, signs flipped
    t, s = np.tan(th / 2), np.sin(th)
    x1 = x1 + np.round(t * x2); x2 = x2 - np.round(s * x1); x1 = x1 + np.round(t * x2)
    return x1, x2

a, b = lift(low, mast, -np.pi / 4)
assert (unlift(a, b, -np.pi / 4)[0] == low).all() and (unlift(a, b, -np.pi / 4)[1] == mast).all()
g = lambda v: 0.5 * np.log2(2 * np.pi * np.e * v.var())        # bits of a bell of this spread
lam = np.linalg.eigvalsh(np.cov(low, mast, bias=True))
print("bound", (0.5 * np.log2(lam.mean() / np.sqrt(lam.prod()))).round(2))
print("saved", ((g(low) + g(mast)) / 2 - (g(a) + g(b)) / 2).round(2), "bits per value")
`,
  });
})();
