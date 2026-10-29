// FLAC's four fixed guesses applied to the Gull Rock temperatures (VII.9). Order 0 guesses 0 (stores the reading),
// order 1 "the same as last time" (the residuals of II.10), order 2 "continue the straight line", order 3 "continue the
// parabola". Derived: rows() reads DS.rows('temp'); the first three readings, which lack enough history, are left out.
(function () {
  const histH = vals => { const c = new Map(); vals.forEach(v => c.set(v, (c.get(v) || 0) + 1)); return entropy([...c.values()]); };
  const KEYS = ['v', 'r1', 'r2', 'r3'];
  const NAMES = ['order 0: guess 0', 'order 1: same as last', 'order 2: straight line', 'order 3: parabola'];
  const SER = [6, 0, 2, 4];
  const bitsOf = rows => KEYS.map(k => histH(rows.map(r => r[k])));
  const sdOf = (rows, k) => Math.sqrt(variance(rows.map(r => r[k])));
  const sgn = v => (v > 0 ? '+' : '') + fmt(v);

  DS.define('missed-orders', {
    rows() {
      const T = DS.rows('temp'), x = T.map(r => r.v);
      return T.slice(3).map((r, j) => {
        const i = j + 3;
        return { day: r.day, time: r.time, t: r.t, v: x[i], r1: x[i] - x[i - 1], r2: x[i] - 2 * x[i - 1] + x[i - 2], r3: x[i] - 3 * x[i - 1] + 3 * x[i - 2] - x[i - 3], front: r.front };
      });
    },
    columns: [
      { key: 'day', label: 'day' }, { key: 'time', label: 'time' },
      { key: 'v', label: 'reading (tenths)' },
      { key: 'r1', label: 'order 1 residual', fmt: sgn },
      { key: 'r2', label: 'order 2 residual', fmt: sgn },
      { key: 'r3', label: 'order 3 residual', fmt: sgn },
      { key: 'front', label: 'passing', left: true },
    ],
    csvColumns: ['day', 'time', 'v', 'r1', 'r2', 'r3'],
    highlights: { fronts: { label: 'fronts passing', test: r => r.front !== '' } },
    views: {
      bits: {
        label: 'Bits per reading',
        legend: false,
        draw(box, ctx) {
          const b = bitsOf(ctx.rows), lo = b.indexOf(Math.min(...b));
          const bx = h('div'); box.append(bx);
          const P = Plot(bx, { xcats: ['order 0', 'order 1', 'order 2', 'order 3'], y: [0, 7.4], h: 260, ylabel: 'bits per reading', grid: 'y', label: 'Bits per temperature reading for each of FLAC’s four guesses' });
          bars(P, b, { colors: i => (i === lo ? series(0) : `color-mix(in srgb, ${series(0)} 45%, transparent)`), labels: v => fmt(v, 2), tip: (v, i) => `<b>${NAMES[i]}</b><br>${fmt(v, 2)} bits per reading` });
          box.append(h('p', { class: 'fig-note', text: 'Entropy of each residual’s histogram: what an ideal coder pays per reading with that guess. The darker bar is the best guess.' }));
        },
      },
      hist: {
        label: 'Residual shapes',
        legend: false,
        draw(box, ctx) {
          box.append(legend(KEYS.slice(1).map((k, j) => [NAMES[j + 1], series(SER[j + 1])])));
          const bx = h('div'); box.append(bx);
          const P = Plot(bx, { x: [-20, 20], y: [0, 0.16], h: 270, xlabel: 'residual (tenths of a degree)', ylabel: 'share of readings', yfmt: v => fmtPct(v, 0), label: 'How often each residual occurs, for orders 1 to 3' });
          KEYS.slice(1).forEach((k, j) => {
            const c = new Map(); ctx.rows.forEach(r => c.set(r[k], (c.get(r[k]) || 0) + 1));
            line(P, range(-20, 21).map(v => [v, (c.get(v) || 0) / ctx.rows.length]), { color: series(SER[j + 1]), width: 2, markers: 2.2, name: NAMES[j + 1] });
          });
          crosshair(P, { xname: 'residual', xfmt: v => `${Math.round(v)} tenths`, yfmt: v => fmtPct(v, 1) });
          box.append(h('p', { class: 'fig-note', text: 'Orders 1 and 2 leave nearly the same narrow bell. Order 3 leaves a bell about twice as wide: it combines four noisy readings, and their noise adds up.' }));
        },
      },
      day: {
        label: 'One day with a front',
        legend: false,
        draw(box, ctx) {
          const rows = ctx.rows.filter(r => r.day === 4);
          const b1 = h('div'), b2 = h('div');
          box.append(b1);
          const P1 = Plot(b1, { x: [3, 4], y: [9, 16.5], h: 170, ylabel: '°C', xticks: [3, 3.25, 3.5, 3.75, 4], xfmt: v => `${String(Math.round((v - 3) * 24)).padStart(2, '0')}:00`, label: 'The temperature on day 4' });
          line(P1, rows.map(r => [r.t, r.v / 10]), { color: series(6), width: 2 });
          if (ctx.hl) rows.filter(ctx.hl.test).forEach(r => dot(P1.g.data, P1.x(r.t), P1.y(r.v / 10), 3.2 * P1.fs, series(1)));
          box.append(legend(KEYS.slice(1).map((k, j) => [NAMES[j + 1], series(SER[j + 1])])), b2);
          const P2 = Plot(b2, { x: [3, 4], y: [-16, 16], h: 210, xlabel: 'time on day 4', ylabel: 'residual (tenths)', xticks: [3, 3.25, 3.5, 3.75, 4], xfmt: v => `${String(Math.round((v - 3) * 24)).padStart(2, '0')}:00`, label: 'The three residuals on day 4' });
          rule(P2, { y: 0, color: 'var(--ink-3)', dash: false });
          KEYS.slice(1).forEach((k, j) => line(P2, rows.map(r => [r.t, r[k]]), { color: series(SER[j + 1]), width: 1.6, name: NAMES[j + 1] }));
          crosshair(P2, { xname: 'time', xfmt: v => `${String(Math.floor((v - 3) * 24)).padStart(2, '0')}:${Math.round(((v - 3) * 48) % 2) ? '30' : '00'}`, yfmt: v => fmt(v, 0) });
          box.append(h('p', { class: 'fig-note', text: 'Day 4, with the first (cold) front passing in the early afternoon (red dots, when the highlight is on). Orders 1 and 2 stay within a few tenths; order 3 swings about twice as far, on quiet stretches as much as during the front: it is amplifying sensor noise.' }));
        },
      },
    },
    metrics: [
      { id: 'h0', label: 'order 0 (store the reading)', value: rows => bitsOf(rows)[0], fmt: v => `${fmt(v, 2)} bits`,
        note: 'No guess at all: the entropy of the readings themselves, as on II.10.' },
      { id: 'h1', label: 'order 1 (same as last time)', value: rows => bitsOf(rows)[1], fmt: v => `${fmt(v, 2)} bits`,
        note: 'The guess of II.10: nearly three bits cheaper than storing the reading.' },
      { id: 'h2', label: 'order 2 (continue the line)', value: rows => bitsOf(rows)[2], fmt: v => `${fmt(v, 2)} bits`,
        note: 'A whisker better than order 1. The straight line follows the slow daily rise and fall, but it also doubles down on the last reading’s noise, and the two effects nearly cancel.' },
      { id: 'h3', label: 'order 3 (continue the parabola)', value: rows => bitsOf(rows)[3], fmt: v => `${fmt(v, 2)} bits`,
        note: 'Almost a bit worse than order 2. The temperature is smooth enough that a curve adds nothing, and the four readings it combines bring four helpings of noise.' },
      { id: 'sd', label: 'spread of the residual, orders 1 · 2 · 3', tex: '\\vsigma', value: rows => KEYS.slice(1).map(k => sdOf(rows, k)), fmt: v => v.map(x => fmt(x, 2)).join(' · ') + ' tenths',
        note: 'For pure sensor noise of one tenth, the three guesses would leave spreads in the ratio $\\sqrt2 : \\sqrt6 : \\sqrt{20}$. Here orders 1 and 2 also remove some real weather, so they come out close together; order 3 cannot hide its noise.' },
    ],
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("{csv}")                     # columns: day, time, v, r1, r2, r3 (tenths of a degree)

def H(a):                                    # entropy of the histogram, bits per reading
    _, c = np.unique(a, return_counts=True); p = c / c.sum()
    return -(p * np.log2(p)).sum()

x = d["v"].to_numpy()
assert (d["r3"].to_numpy()[3:] == np.diff(x, 3)).all()   # order k is the k-th difference
for k, col in enumerate(["v", "r1", "r2", "r3"]):
    print("order", k, round(H(d[col]), 2), "bits", " sd", round(d[col].std(ddof=0), 2))
`,
  });
})();
