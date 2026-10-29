// The two thermometers of ten-days, measured along the cloud's own axes (the KLT of II.15):
// "along" (roughly the average) and "across" (roughly the difference), each centred, in °C.
// Derived: rows() reads DS.rows('ten-days').
(function () {
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const cov = (a, b) => { const ma = mean(a), mb = mean(b); return mean(a.map((v, i) => (v - ma) * (b[i] - mb))); };
  // the KLT angle of the 2×2 covariance matrix, and its eigenvalues
  function klt(rows) {
    const x = rows.map(r => r.low), y = rows.map(r => r.mast);
    const a = cov(x, x), b = cov(x, y), c = cov(y, y);
    const th = 0.5 * Math.atan2(2 * b, a - c);
    const m = (a + c) / 2, d = Math.sqrt(((a - c) / 2) ** 2 + b * b);
    return { th, l1: m + d, l2: m - d, a, c, mx: mean(x), my: mean(y) };
  }
  const gaussBits = v => 0.5 * Math.log2(2 * Math.PI * Math.E * v / 0.01);   // a coordinate rounded to 0.1 °C (II.11)

  DS.define('thermo-axes', {
    rows() {
      const src = DS.rows('ten-days'), K = klt(src), c = Math.cos(K.th), s = Math.sin(K.th);
      return src.map(r => {
        const x = r.low - K.mx, y = r.mast - K.my;
        return { i: r.i, day: r.day, time: r.time, t: r.t, foot: +x.toFixed(2), top: +y.toFixed(2), along: c * x + s * y, across: -s * x + c * y };
      });
    },
    columns: [
      { key: 'day', label: 'day' }, { key: 'time', label: 'time' },
      { key: 'foot', label: 'foot − mean (°C)', fmt: v => fmt(v, 2) }, { key: 'top', label: 'top − mean (°C)', fmt: v => fmt(v, 2) },
      { key: 'along', label: 'along (°C)', fmt: v => fmt(v, 2) }, { key: 'across', label: 'across (°C)', fmt: v => fmt(v, 3) },
    ],
    csvColumns: ['day', 'time', 'foot', 'top', 'along', 'across'],
    highlights: {
      disagree: { label: 'thermometers disagree by more than usual (|across| > 0.35 °C)', test: r => Math.abs(r.across) > 0.35 },
    },
    views: {
      timeline: {
        label: 'Along and across, over ten days',
        draw(box, ctx) {
          box.append(legend([['along the cloud (≈ average of the two)', series(4)], ['across the cloud (≈ their difference)', series(2)]]));
          const b = h('div'); box.append(b);
          const P = Plot(b, { x: [0, 10], y: [-7, 7], h: 280, xlabel: 'day', ylabel: 'coordinate (°C)', xticks: range(0, 10, 2), xfmt: v => `day ${v + 1}`, label: 'The two rotated coordinates over ten days' });
          line(P, ctx.rows.map(r => [r.t, r.along]), { color: series(4), width: 1.4, name: 'along' });
          line(P, ctx.rows.map(r => [r.t, r.across]), { color: series(2), width: 1.4, name: 'across' });
          if (ctx.hl) ctx.rows.filter(ctx.hl.test).forEach(r => dot(P.g.data, P.x(r.t), P.y(r.across), 3 * P.fs, series(1)));
          crosshair(P, { xname: 'day', xfmt: v => `${Math.floor(v) + 1}, ${String(Math.floor((v % 1) * 24)).padStart(2, '0')}h`, yfmt: v => `${fmt(v, 2)} °C` });
          box.append(h('p', { class: 'fig-note', text: 'Same ten days, same two numbers per reading, only measured along new axes. The first coordinate carries the weather; the second is a thin line hugging zero.' }));
        },
      },
      cloud: DS.views.scatter({
        x: 'along', y: 'across', equal: true, label: 'The cloud, turned', r: 2.2, h: 300,
        xdomain: [-6.5, 6.5], ydomain: [-1.6, 1.6],
        xlabel: 'along the cloud, axis 1 (°C)', ylabel: 'across, axis 2 (°C)',
        tip: r => `<b>day ${r.day}, ${r.time}</b><br>along ${fmt(r.along, 2)} °C<br>across ${fmt(r.across, 3)} °C`,
        after(P) { rule(P, { y: 0, color: 'var(--ink-3)' }); rule(P, { x: 0, color: 'var(--ink-3)' }); },
      }),
      arrows: {
        label: 'The original cloud, with its axes',
        draw(box, ctx) {
          const K = klt(DS.rows('ten-days')), c = Math.cos(K.th), s = Math.sin(K.th);
          const b = h('div'); box.append(b);
          const P = Plot(b, { x: [-6.5, 6.5], y: [-6.5, 6.5], equal: true, h: 380, xlabel: 'foot thermometer minus its mean (°C)', ylabel: 'top thermometer minus its mean (°C)', label: 'The centred thermometer cloud with its two KLT axes drawn as arrows' });
          ctx.rows.forEach(r => el('circle', { cx: P.x(r.foot), cy: P.y(r.top), r: 2 * P.fs, style: `fill:${ctx.hl && ctx.hl.test(r) ? series(1) : 'var(--ink-3)'};opacity:.55` }, P.g.data));
          const s1 = 2 * Math.sqrt(K.l1), s2 = 2 * Math.sqrt(K.l2);
          arrow(P.g.top, P.x(0), P.y(0), P.x(s1 * c), P.y(s1 * s), series(4), 3);
          arrow(P.g.top, P.x(0), P.y(0), P.x(-s2 * s * 6), P.y(s2 * c * 6), series(2), 3);
          annotate(P, s1 * c, s1 * s, `axis 1: λ₁ = ${fmt(K.l1, 2)} °C²\n(arrow = 2σ)`, { dx: -150, dy: 18 });
          annotate(P, -s2 * s * 6, s2 * c * 6, `axis 2: λ₂ = ${fmt(K.l2, 3)} °C²\n(arrow = 2σ, drawn 6× longer)`, { dx: -40, dy: -44 });
          box.append(h('p', { class: 'fig-note', text: `The two arrows are the eigenvectors of the covariance matrix, at ${fmt(K.th * 180 / Math.PI, 1)}° and ${fmt(K.th * 180 / Math.PI + 90, 1)}°, each as long as two standard deviations of the cloud along it. The short one is stretched six times so you can see it.` }));
        },
      },
    },
    metrics: [
      { id: 'angle', label: 'angle of axis 1', value: rows => klt(DS.rows('ten-days')).th * 180 / Math.PI, fmt: v => `${fmt(v, 1)}°`,
        note: 'Almost exactly the diagonal (45°): the two thermometers have nearly the same spread, so the long axis of the cigar runs at equal parts of each.' },
      { id: 'lambdas', label: 'variance along each axis', tex: '\\vlambda_1,\\ \\vlambda_2', value: rows => [variance(rows.map(r => r.along)), variance(rows.map(r => r.across))],
        fmt: v => `${fmt(v[0], 2)} · ${fmt(v[1], 3)} °C²`, note: v => `These are the eigenvalues. Along the cloud the readings swing as much as the weather does; across it, the spread is ${fmt(v[0] / v[1], 0)} times smaller.` },
      { id: 'total', label: 'total spread², before and after', value: rows => [klt(DS.rows('ten-days')).a + klt(DS.rows('ten-days')).c, variance(rows.map(r => r.along)) + variance(rows.map(r => r.across))],
        fmt: v => `${fmt(v[0], 2)} = ${fmt(v[1], 2)} °C²`, note: 'A rotation moves no point, so the total spread cannot change. Only its split between the two axes does: 2.99 + 2.95 before, 5.91 + 0.025 after.' },
      { id: 'corr', label: 'correlation of the new coordinates', value: rows => { const a = rows.map(r => r.along), b = rows.map(r => r.across); return cov(a, b) / Math.sqrt(cov(a, a) * cov(b, b)); },
        fmt: v => fmt(Math.abs(v) < 5e-4 ? 0 : v, 3), note: 'Zero, by construction: that is what the eigenvectors are. Knowing "how warm" tells you nothing more about "how much they disagree".' },
      { id: 'bits', label: 'bits per reading, original → turned axes', value: rows => {
          const K = klt(DS.rows('ten-days'));
          return [gaussBits(K.a) + gaussBits(K.c), gaussBits(variance(rows.map(r => r.along))) + gaussBits(variance(rows.map(r => r.across)))];
        }, fmt: v => `${fmt(v[0], 2)} → ${fmt(v[1], 2)}`,
        note: v => `Each coordinate rounded to 0.1 °C and coded to its own spread (the Gaussian rule of II.11). The quiet axis is cheap: ${fmt(v[0] - v[1], 2)} bits saved per reading.` },
    ],
    code: `
import numpy as np, pandas as pd

t = pd.read_csv("{csv}")                       # foot, top: centred thermometers; along, across: turned
X = t[["foot", "top"]].to_numpy()
S = np.cov(X.T, bias=True)
lam, V = np.linalg.eigh(S)                     # eigenvalues ascending, eigenvectors in columns
print("eigenvalues:", lam[::-1].round(3), " angle:", np.degrees(np.arctan2(V[1, 1], V[0, 1])).round(1))
Y = X @ V[:, ::-1]                             # rotate: along, across
print("variances along / across:", Y.var(axis=0).round(3), " total:", Y.var(axis=0).sum().round(2))
print("corr of new coordinates:", np.corrcoef(Y.T)[0, 1].round(3))
bits = lambda v: 0.5 * np.log2(2 * np.pi * np.e * v / 0.1**2)
print("bits:", (bits(S[0, 0]) + bits(S[1, 1])).round(2), "->", bits(Y.var(axis=0)).sum().round(2))
`,
  });
})();
