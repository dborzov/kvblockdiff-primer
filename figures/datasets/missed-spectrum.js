// The spectrum of the ten days (VII.13): standardize the five channels of DS 'ten-days', take their 5 × 5 covariance
// (the correlation matrix) and its eigenvalues. Each row is one direction of the cloud: its eigenvalue, its share of
// the variance, its contribution to the KLT bound ½ log₂(AM/GM), and which channels it mixes. Derived from ten-days.
(function () {
  const CH = [['low', 'foot'], ['mast', 'top'], ['hum', 'humidity'], ['pres', 'pressure'], ['wind', 'wind']];
  const tint = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  // eigen-decomposition of a small symmetric matrix by Jacobi rotations
  function jacobi(M) {
    const n = M.length, A = M.map(r => r.slice()), V = M.map((_, i) => M.map((__, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < 60; sweep++) {
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-15) continue;
        const th = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]), c = Math.cos(th), s = Math.sin(th);
        for (let k = 0; k < n; k++) { const a = A[k][p], b = A[k][q]; A[k][p] = c * a - s * b; A[k][q] = s * a + c * b; }
        for (let k = 0; k < n; k++) { const a = A[p][k], b = A[q][k]; A[p][k] = c * a - s * b; A[q][k] = s * a + c * b; }
        for (let k = 0; k < n; k++) { const a = V[k][p], b = V[k][q]; V[k][p] = c * a - s * b; V[k][q] = s * a + c * b; }
      }
    }
    return range(n).map(i => ({ l: A[i][i], v: V.map(r => r[i]) })).sort((a, b) => b.l - a.l);
  }
  const gain = rows => sum(rows.map(r => r.contrib));
  const sgnFix = v => { const k = v.reduce((a, x, i) => (Math.abs(x) > Math.abs(v[a]) ? i : a), 0); return v[k] < 0 ? v.map(x => -x) : v; };

  DS.define('missed-spectrum', {
    rows() {
      const D = DS.rows('ten-days');
      const Z = CH.map(([k]) => { const v = D.map(r => r[k]), m = mean(v), s = Math.sqrt(variance(v)); return v.map(x => (x - m) / s); });
      const C = Z.map(a => Z.map(b => mean(a.map((x, t) => x * b[t]))));
      const E = jacobi(C), n = E.length;
      return E.map((e, k) => {
        const v = sgnFix(e.v);
        const o = { k: k + 1, lambda: e.l, share: e.l / n, log2: Math.log2(e.l), contrib: -0.5 * Math.log2(e.l) / n };
        CH.forEach(([key], j) => { o[key] = v[j]; });
        o.mix = CH.map(([, nm], j) => [nm, v[j]]).filter(([, w]) => Math.abs(w) > 0.3).map(([nm, w]) => `${w > 0 ? '+' : '−'}${nm}`).join(' ');
        return o;
      });
    },
    columns: [
      { key: 'k', label: 'direction' },
      { key: 'lambda', label: 'eigenvalue λ', fmt: v => fmt(v, v < 0.1 ? 4 : 2) },
      { key: 'share', label: 'share of variance', fmt: v => fmtPct(v, 1) },
      { key: 'contrib', label: 'adds to the bound (bits)', fmt: v => fmtS(v, 3) },
      { key: 'mix', label: 'mostly', left: true },
    ],
    csvColumns: ['k', 'lambda', 'share', 'contrib', 'low', 'mast', 'hum', 'pres', 'wind'],
    views: {
      spectrum: {
        label: 'The spectrum',
        draw(box, ctx) {
          const bx = h('div'); box.append(bx);
          const rows = ctx.rows;
          const P = Plot(bx, { xcats: rows.map(r => `λ${r.k}`), y: [0.004, 5], ylog: 10, h: 270, ylabel: 'eigenvalue (log scale)', grid: 'y', label: 'The five eigenvalues of the standardized ten days, largest first' });
          rule(P, { y: 1, label: 'average = 1', color: 'var(--ink-3)' });
          rows.forEach((r, i) => {
            const x0 = P.x(i - 0.32), x1 = P.x(i + 0.32), y = P.y(r.lambda);
            const rc = el('rect', { x: x0, width: x1 - x0, y, height: P.y(0.004) - y, rx: 3, style: `fill:${r.lambda < 0.1 ? series(1) : series(0)}` }, P.g.data);
            el('text', { x: (x0 + x1) / 2, y: y - 6 * P.fs, 'text-anchor': 'middle', class: 'val', text: fmt(r.lambda, r.lambda < 0.1 ? 4 : 2) }, P.g.top);
            hover(rc, () => `<b>direction ${r.k}</b>: λ = ${fmt(r.lambda, 4)}<br>${fmtPct(r.share, 1)} of the variance<br>mostly ${r.mix}`);
          });
          box.append(h('p', { class: 'fig-note', text: 'Two strong directions hold most of the variance; two middling ones hold a little; the last holds almost nothing. On a log scale that last bar is as far below the average as the first is above it — and more.' }));
        },
      },
      bound: {
        label: 'What each adds to the bound',
        draw(box, ctx) {
          const bx = h('div'); box.append(bx);
          const rows = ctx.rows;
          const P = Plot(bx, { xcats: rows.map(r => `λ${r.k}`), y: [-0.28, 0.8], h: 260, ylabel: 'bits per element', grid: 'y', label: 'Each direction’s share of the KLT bound' });
          rule(P, { y: 0, color: 'var(--ink-3)', dash: false });
          bars(P, rows.map(r => r.contrib), { colors: i => (rows[i].contrib > 0.3 ? series(1) : series(0)), labels: v => fmtS(v, 2), tip: (v, i) => `<b>direction ${rows[i].k}</b><br>−½ log₂ λ / 5 = ${fmtS(v, 3)} bits` });
          box.append(h('p', { class: 'fig-note', html: texify(`The bound is the sum of the bars, $-\\tfrac12 \\cdot$ the average of $\\log_2 \\vlambda$: ${fmt(gain(rows), 2)} bits per element. Strong directions count against it; the nearly empty direction pays for nearly all of it.`) }));
        },
      },
      mix: {
        label: 'Which channels each mixes',
        draw(box, ctx) {
          const rows = ctx.rows, n = CH.length;
          const D = Diagram(box, { w: 640, h: 260, grow: 0.6, label: 'The five directions as mixtures of the five standardized channels' });
          const fs = D.fs, L = 92 * Math.min(fs, 1.4), T = 30 * fs, cw = (628 - L) / n, rh = (D.H - T - 6) / n;
          const g = el('g', {}, D.svg);
          CH.forEach(([, nm], j) => el('text', { x: L + (j + 0.5) * cw, y: T - 10, 'text-anchor': 'middle', class: 'lbl', text: nm }, g));
          rows.forEach((r, i) => {
            el('text', { x: L - 8, y: T + (i + 0.6) * rh, 'text-anchor': 'end', class: 'val', text: `λ${r.k} = ${fmt(r.lambda, r.lambda < 0.1 ? 3 : 2)}` }, g);
            CH.forEach(([key], j) => {
              const w = r[key], c = el('rect', { x: L + j * cw + 2, y: T + i * rh + 2, width: cw - 4, height: rh - 4, rx: 4, style: `fill:${tint(w > 0 ? series(0) : series(1), Math.round(8 + 85 * Math.abs(w)))}` }, g);
              el('text', { x: L + (j + 0.5) * cw, y: T + (i + 0.6) * rh, 'text-anchor': 'middle', class: 'val', text: fmtS(w, 2) }, g);
              hover(c, () => `direction ${r.k}, ${CH[j][1]}: weight ${fmtS(w, 3)}`);
            });
          });
          box.append(h('p', { class: 'fig-note', text: 'Each row is one direction, written as weights on the five standardized channels (blue positive, red negative). The last row is foot minus top: how much the two thermometers disagree, which is almost never.' }));
        },
      },
    },
    metrics: [
      { id: 'lambdas', label: 'eigenvalues', tex: '\\vlambda', value: rows => rows.map(r => r.lambda), fmt: v => v.map(x => fmt(x, x < 0.1 ? 4 : 2)).join(' · '),
        note: 'They add up to 5, one per standardized channel, so their arithmetic mean is exactly 1.' },
      { id: 'top2', label: 'variance in the two strongest directions', value: rows => rows[0].share + rows[1].share, fmt: v => fmtPct(v, 0),
        note: 'The weather (warm and dry against cool and damp) and the pressure swing that brings the wind. A plot of this spectrum looks “low-rank”.' },
      { id: 'gain', label: 'KLT bound, ½ log₂(AM/GM)', value: gain, fmt: v => `${fmt(v, 2)} bits per element`,
        note: 'The most any rotation of these five channels can save, for bell-shaped data. One number, from five eigenvalues, before any coder exists.' },
      { id: 'last', label: 'share of the bound from the weakest direction', value: rows => rows[rows.length - 1].contrib / gain(rows), fmt: (v, rows) => `${fmtS(rows[rows.length - 1].contrib, 2)} bits · ${fmtPct(v, 0)}`,
        note: 'Nearly all of it. The bound rewards directions that are almost empty, not directions that are full: here, the two thermometers agreeing to within a tenth or two.' },
    ],
    code: `
import numpy as np, pandas as pd

days = pd.read_csv("gull-rock-ten-days.csv")       # the ten days of II.14
X = days[["low", "mast", "hum", "pres", "wind"]].to_numpy(float)
Z = (X - X.mean(0)) / X.std(0)                     # standardize each channel
lam, vec = np.linalg.eigh(np.cov(Z, rowvar=False, bias=True))
lam = lam[::-1]
print("eigenvalues:", lam.round(4), " sum", lam.sum().round(2))
print("KLT bound:", (-0.5 * np.log2(lam).mean()).round(2), "bits per element")
print("from the weakest direction:", (-0.5 * np.log2(lam[-1]) / 5).round(2))
`,
  });
})();
