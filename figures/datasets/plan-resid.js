// The two rates of the harness (IX.2) on data the reader has met: the previous-value residuals of the Gull Rock
// temperatures (DS 'resid', II.10–II.11), in tenths of a degree. The functions are those of analysis/plan_harness.py:
// laplace_fit + entropy_rate (the scientific number) and fl_widths + fixed_length_rate (the engineering number).
// Here the residuals are their own fitting set (one block, block scope); the dictionary share is left out.
(function () {
  const ALO = -255, AHI = 255, EPS = 0.005;
  function fit(rs) {
    const s = rs.slice().sort((a, b) => a - b), n = s.length;
    const med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    const m = Math.round(med);
    const beta = Math.max(mean(rs.map(v => Math.abs(v - m))), 0.25);
    let Z = 0;
    for (let v = ALO; v <= AHI; v++) Z += Math.exp(-Math.abs(v - m) / beta);
    const bits = v => (Math.abs(v - m) / beta + Math.log(Z)) / Math.LN2;   // -log2 p(v) under the fitted model
    const a = rs.map(Math.abs).sort((x, y) => x - y);
    const q = a[Math.ceil((1 - EPS) * (n - 1))];                            // numpy quantile, method="higher"
    const w = Math.max(Math.ceil(Math.log2(2 * q + 1)), 1);
    return { m, beta, bits, w, lim: 2 ** (w - 1) };
  }
  let F = null;
  const model = () => F || (F = fit(DS.rows('resid').map(r => r.r)));
  const histH = vals => { const c = new Map(); vals.forEach(v => c.set(v, (c.get(v) || 0) + 1)); return entropy([...c.values()]); };

  DS.define('plan-resid', {
    rows() {
      const M = model();
      return DS.rows('resid').map((x, i) => {
        const esc = Math.abs(x.r) >= M.lim;
        return { i, day: x.day, time: x.time, t: x.t, r: x.r, lb: M.bits(x.r), esc, fb: M.w + (esc ? 8 : 0), field: esc ? `${-M.lim} + raw byte` : String(x.r) };
      });
    },
    columns: [
      { key: 'day', label: 'day' },
      { key: 'time', label: 'time' },
      { key: 'r', label: 'residual (tenths)', fmt: v => (v > 0 ? '+' : '') + fmt(v) },
      { key: 'lb', label: 'Laplace model: bits', fmt: v => fmt(v, 2) },
      { key: 'field', label: 'fixed-width field', left: true },
      { key: 'fb', label: 'fixed-length: bits' },
    ],
    csvColumns: ['day', 'time', 'r'],
    highlights: {
      esc: { label: 'escapes', test: r => r.esc },
    },
    views: {
      histogram: DS.views.histogram({
        key: 'r', domain: [-13, 14], xlabel: 'residual (tenths of a degree)', ylabel: 'residuals', unit: 'tenths', noun: 'residuals', xticks: [-12, -8, -4, 0, 4, 8, 12], h: 280,
        label: 'Residuals and the two prices',
        after(P, ctx) {
          const M = model(), n = ctx.rows.length, ks = range(-13, 14);
          let Z = 0; for (let v = ALO; v <= AHI; v++) Z += Math.exp(-Math.abs(v - M.m) / M.beta);
          el('rect', { x: P.x(-M.lim + 0.5), width: P.x(M.lim - 0.5) - P.x(-M.lim + 0.5), y: P.m.t, height: P.ph, style: 'fill:color-mix(in srgb, var(--emerald) 10%, transparent)' }, P.g.bg);
          line(P, ks.map(k => [k, n * Math.exp(-Math.abs(k - M.m) / M.beta) / Z]), { color: series(4), width: 2, markers: 2.4 });
          P.svg.closest('div').before(legend([['residuals counted', series(0), 'box'], ['escapes', series(1), 'box'], ['fitted Laplace model', series(4)], [`what a ${M.w}-bit field holds`, 'color-mix(in srgb, var(--emerald) 30%, transparent)', 'box']]));
        },
      }),
      cost: DS.views.timeline({
        x: 't', y: 'lb', xlabel: 'day', ylabel: 'bits for this residual', xname: 'day', width: 1, ydomain: [0, 15], zero: false, highlights: ['esc'], legend: false,
        xfmt: v => `${Math.floor(v) + 1}`, yfmt: v => `${fmt(v, 1)} bits`, xticks: [0, 7, 14, 21, 28], xtfmt: v => `day ${v + 1}`, label: 'Bits, residual by residual',
        after(P, ctx) {
          line(P, ctx.rows.map(r => [r.t, r.fb]), { color: series(2), width: 1.4, curve: 'step' });
          P.svg.closest('div').before(legend([['entropy coder: −log₂ p under the model', series(0)], ['fixed-width field (+8 for an escape)', series(2)], ...(ctx.hl ? [['escapes', series(1), 'dot']] : [])]));
        },
        note: 'Every residual\'s price, both ways. The entropy coder pays little for the common small residuals and more for rare big ones; the fixed-width field pays the same for all, plus a raw byte for each escape.',
      }),
    },
    metrics: [
      { id: 'fit', label: 'fitted model: centre and scale', tex: '\\vbeta', value: () => model(), fmt: M => `m = ${fmt(M.m)}, β = ${fmt(M.beta, 2)} tenths`,
        note: 'laplace_fit: the centre is the median, rounded; the scale is the mean distance from it. Two numbers per channel — the coder\'s own settings, which a block or request dictionary must ship and the harness charges.' },
      { id: 'entropy', label: 'entropy rate (Laplace model)', value: rows => mean(rows.map(r => r.lb)), fmt: v => `${fmt(v, 2)} bits`,
        note: (v, rows) => `What an ideal entropy coder with this model would spend per residual. The residuals' own histogram says ${fmt(histH(rows.map(r => r.r)), 2)} bits (II.11): the model is a little off, because these residuals are closer to a bell than to a Laplace, and the gap is the price of a two-number model.` },
      { id: 'width', label: 'field width $\\vn$', value: () => model().w, fmt: v => `${v} bits`,
        note: v => `fl_widths picks the smallest width that holds all but half a percent of the residuals: magnitudes up to ${2 ** (v - 1) - 1}. The one unused field value, ${-(2 ** (v - 1))}, means “escaped; the raw code follows”.` },
      { id: 'escapes', label: 'escapes', value: rows => rows.filter(r => r.esc).length, fmt: (v, rows) => `${v} of ${fmt(rows.length)} (${fmtPct(v / rows.length, 2)})`,
        note: 'The fronts: a drop of more than half a degree in half an hour. Each costs its 8 raw bits on top of the field, and each is a detour for the GPU decoder, which is why the width rule caps them.' },
      { id: 'fixed', label: 'fixed-length rate', value: rows => mean(rows.map(r => r.fb)), fmt: v => `${fmt(v, 2)} bits`,
        note: 'The width plus 8 bits times the escape share. This is directly the size of a delta: every residual sits at a known offset, so any one can be read without the others.' },
      { id: 'gap', label: 'fixed-length minus entropy rate', value: rows => mean(rows.map(r => r.fb)) - mean(rows.map(r => r.lb)), fmt: v => `${fmt(v, 2)} bits`,
        note: 'The price of random access on this data: what a fast, fixed-width format pays above an ideal coder. The harness prints both rates for every point, so this gap is always visible.' },
    ],
    code: `
import numpy as np, pandas as pd

r = pd.read_csv("{csv}")["r"].to_numpy()          # previous-value residuals, tenths of a degree
A = np.arange(-255, 256)

m = np.round(np.median(r)); beta = max(np.abs(r - m).mean(), 0.25)          # laplace_fit
logp = -np.abs(A - m) / beta; logp -= np.log(np.exp(logp).sum())          # normalized over the alphabet
H = -logp[(r - A[0]).astype(int)].mean() / np.log(2)                        # entropy_rate

q = np.quantile(np.abs(r), 0.995, method="higher")                          # fl_widths, eps = 0.005
n = max(int(np.ceil(np.log2(2 * q + 1))), 1)
esc = np.abs(r) >= 2 ** (n - 1)
F = n + 8 * esc.mean()                                                      # fixed_length_rate
print(f"m={m:.0f} beta={beta:.2f}  entropy rate {H:.2f}  width {n}  escapes {esc.sum()}  fixed {F:.2f}")
`,
  });
})();
