// Two made-up neighbouring entries of 640 elements (IV.8, "Easy to confuse with"): unrelated in 636 elements
// (independent standard Gaussian numbers) but sharing four huge outlier channels (both 30.0). Their cosine similarity is
// high, yet one predicts almost nothing of the other. Seeded (rng('idea-cosine-3')); the page's numpy snippet draws its
// own numbers with the same recipe.
(function () {
  const D = 640, NBIG = 4;
  const others = rows => rows.filter(r => !r.big);
  const cosine = rows => { const d = sum(rows.map(r => r.a * r.b)); return d / Math.sqrt(sum(rows.map(r => r.a * r.a)) * sum(rows.map(r => r.b * r.b))); };
  const r2 = rows => { const x = rows.map(r => r.a), y = rows.map(r => r.b), mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; x.forEach((q, i) => { sxy += (q - mx) * (y[i] - my); sxx += (q - mx) ** 2; syy += (y[i] - my) ** 2; }); return sxy * sxy / (sxx * syy); };

  const strips = {
    label: 'The two entries',
    legend: 'hl',
    draw(box, ctx) {
      [['a', 'entry a', series(0)], ['b', 'entry b', series(2)]].forEach(([key, name, col], k) => {
        const last = k === 1, b = h('div');
        box.append(b);
        const P = Plot(b, { x: [-0.5, D - 0.5], y: [-4.5, 32], h: last ? 150 : 120, m: { l: 44, r: 10, t: 20, b: last ? 36 : 6 }, yticks: [0, 10, 20, 30], grid: 'y',
          xticks: last ? [0, 160, 320, 480, 639] : [], xlabel: last ? 'element (channel) c' : '', ylabel: name, label: `The 640 elements of ${name}` });
        const pts = ctx.rows.map(r => `M${P.x(r.c).toFixed(1)},${P.y(0).toFixed(1)}V${P.y(r[key]).toFixed(1)}`).join('');
        el('path', { d: pts, style: `fill:none;stroke:${col};stroke-width:${1.1 * P.fs}` }, P.g.data);
        ctx.rows.forEach(r => { if ((ctx.hl && ctx.hl.test(r)) || (ctx.sel && ctx.sel.test(r))) dot(P.g.data, P.x(r.c), P.y(r[key]), 3 * P.fs, ctx.hl && ctx.hl.test(r) ? series(1) : 'var(--c)'); });
        el('text', { x: P.m.l, y: P.m.t - 7 * P.fs, class: 'lbl', text: `${name}: four spikes of 30 at c = 0–3, then 636 small, unrelated numbers` }, P.g.top);
        crosshair(P, { series: [{ name, pts: ctx.rows.map(r => [r.c, r[key]]), color: col }], xname: 'element', xfmt: v => `c = ${fmt(v, 0)}`, yfmt: v => fmt(v, 2) });
      });
    },
  };
  const tip = r => `<b>element ${r.c}</b>${r.big ? ' (outlier channel)' : ''}<br>a = ${fmt(r.a, 2)}, b = ${fmt(r.b, 2)}`;

  DS.define('idea-cosine-pair', {
    rows() {
      const r = rng('idea-cosine-3'), a = range(D).map(() => r.normal()), b = range(D).map(() => r.normal());
      for (let c = 0; c < NBIG; c++) a[c] = b[c] = 30;
      return range(D).map(c => ({ c, a: a[c], b: b[c], big: c < NBIG }));
    },
    columns: [{ key: 'c', label: 'element c' }, { key: 'a', label: 'entry a', fmt: v => fmt(v, 3) }, { key: 'b', label: 'entry b', fmt: v => fmt(v, 3) }],
    highlights: { big: { label: 'the four outlier channels', test: r => r.big } },
    views: {
      strips,
      scatter: DS.views.scatter({ x: 'a', y: 'b', xlabel: 'element of entry a', ylabel: 'same element of entry b', equal: true, xdomain: [-5, 33], ydomain: [-5, 33], r: 2.2, h: 300, label: 'b against a, all 640', tip }),
      zoom: DS.views.scatter({ x: 'a', y: 'b', xlabel: 'element of entry a', ylabel: 'same element of entry b', equal: true, xdomain: [-3.8, 3.8], ydomain: [-3.8, 3.8], r: 2.2, h: 300, label: 'b against a, the 636', tip }),
    },
    metrics: [
      { id: 'cos', label: 'cosine similarity of a and b', value: cosine, fmt: v => fmt(v, 2),
        note: 'Close to 1: the two vectors point almost the same way. By this measure they are near-copies.' },
      { id: 'energy', label: 'share of the length in four channels', value: rows => { const big = rows.filter(r => r.big); return sum(big.map(r => r.a * r.a)) / sum(rows.map(r => r.a * r.a)); }, fmt: v => fmtPct(v, 0),
        note: 'Cosine weighs each element by its size. Four elements of 30 outweigh 636 elements of about 1, so the four decide the cosine.' },
      { id: 'cosrest', label: 'cosine of the other 636', value: rows => cosine(others(rows)), fmt: v => fmt(v, 2),
        note: 'Without the four spikes, the two entries are as unrelated as two random vectors.' },
      { id: 'r2', label: '$\\vRsq$ of the other 636', value: rows => r2(others(rows)), fmt: v => fmt(v, 3),
        note: 'How much of b’s 636 ordinary elements a straight-line guess from a explains: nothing.' },
      { id: 'bits', label: 'bits a saves on those elements', value: rows => 0.5 * Math.log2(1 / (1 - r2(others(rows)))), fmt: v => `${fmt(v, 3)} bit per element`,
        note: 'Lossless coding pays for all 640 elements. Knowing a makes the four spikes free and leaves the other 636 at full price.' },
    ],
    code: `
import numpy as np, pandas as pd

e = pd.read_csv("{csv}")                     # element c, entry a, entry b
a, b = e.a.to_numpy(), e.b.to_numpy()
print("cosine:", (a @ b / np.linalg.norm(a) / np.linalg.norm(b)).round(2))
print("share of |a|^2 in c = 0..3:", (np.sum(a[:4] ** 2) / np.sum(a ** 2)).round(2))
r2 = np.corrcoef(a[4:], b[4:])[0, 1] ** 2
print("R2 of the other 636:", r2.round(3), " bits saved:", (0.5 * np.log2(1 / (1 - r2))).round(3))
`,
  });
})();
