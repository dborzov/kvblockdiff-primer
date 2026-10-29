// Sixteen residuals of one channel and two clerks' bills: the hook of VI.10 (two rates). Clerk 1 pays each value its
// surprisal under a code fit to these sixteen values; clerk 2 gives every value a 3-bit slot (−3 … 3) and escapes the
// rest (raw 8-bit value + 4-bit position). Hand-made values, quoted on the page; every bill is computed here.
(function () {
  const R = [0, -1, 2, 0, 1, -3, 0, 1, -1, 0, 2, -2, 0, 1, 14, -1];
  const WIDTH = 3, ESC = 8 + 4;
  const fits = v => Math.abs(v) <= 3;
  const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);

  DS.define('homework-sixteen', {
    rows() {
      const c = {};
      R.forEach(v => { c[v] = (c[v] || 0) + 1; });
      return R.map((r, i) => ({ i: i + 1, r, count: c[r], ideal: Math.log2(R.length / c[r]), fixed: WIDTH + (fits(r) ? 0 : ESC), esc: fits(r) ? '' : 'escape' }));
    },
    columns: [
      { key: 'i', label: 'position' }, { key: 'r', label: 'residual', fmt: sgn }, { key: 'count', label: 'seen (of 16)' },
      { key: 'ideal', label: 'clerk 1: surprisal (bits)', fmt: v => fmt(v, 2) }, { key: 'fixed', label: 'clerk 2: slot (bits)' }, { key: 'esc', label: 'note', left: true },
    ],
    csvColumns: ['i', 'r', 'count', 'ideal', 'fixed'],
    highlights: { esc: { label: 'does not fit in 3 bits', test: r => !fits(r.r) } },
    views: {
      bills: {
        label: 'The two bills, value by value',
        legend: false,
        draw(box, ctx) {
          box.append(legend([['clerk 1: a code fit to the counts', series(0), 'box'], ['clerk 2: 3-bit slots + escape', series(1), 'box']]));
          const b = h('div'); box.append(b);
          const P = Plot(b, { xcats: ctx.rows.map(r => sgn(r.r)), y: [0, 17], yticks: [0, 3, 6, 9, 12, 15], h: 280, grid: 'y', xlabel: 'the sixteen residuals, in order', ylabel: 'bits spent on the value',
            label: 'Bits each clerk spends on each of the sixteen residuals' });
          bars(P, ctx.rows.map(r => [r.ideal, r.fixed]), {
            colors: (i, j) => { const c = series(j); return ctx.sel && !ctx.sel.test(ctx.rows[i]) ? `color-mix(in srgb, ${c} 35%, transparent)` : c; },
            width: 13, fill: 0.86,
            tip: (v, i) => { const r = ctx.rows[i]; return `<b>position ${r.i}: ${sgn(r.r)}</b> (seen ${r.count}× in 16)<br>clerk 1: ${fmt(r.ideal, 2)} bits<br>clerk 2: ${r.fixed} bits${r.esc ? ' — 3-bit slot + 8-bit raw value + 4-bit position' : ''}`; },
          });
          rule(P, { y: WIDTH, label: '3-bit slot', color: 'var(--ink-3)' });
          const k = ctx.rows.findIndex(r => !fits(r.r));
          annotate(P, k, 15, 'the escape: 3 + 8 + 4 = 15 bits', { dx: -150, dy: -2, anchor: 'end' });
          const tot = j => ctx.rows.reduce((s, r) => s + (j ? r.fixed : r.ideal), 0);
          box.append(h('p', { class: 'fig-note', text: `Totals: clerk 1 ${fmt(tot(0), 1)} bits, clerk 2 ${tot(1)} bits. A common value (0, seen five times) costs clerk 1 only ${fmt(Math.log2(16 / 5), 2)} bits; a value seen once costs 4. Clerk 2 pays 3 bits for everything, and 15 for the one that does not fit.` }));
        },
      },
      histogram: DS.views.histogram({ key: 'r', domain: [-4, 15], xlabel: 'residual', ylabel: 'how often', noun: 'residuals', xticks: [-3, 0, 3, 6, 9, 14], label: 'How often each value' }),
    },
    metrics: [
      { id: 'ideal', label: 'clerk 1: a code fit to the counts', value: rows => sum(rows.map(r => r.ideal)), fmt: v => `${fmt(v, 1)} bits · ${fmt(v / 16, 2)} per value`,
        note: 'The order-0 entropy of these sixteen values, times sixteen. Optimistic: the code is fit to the very values it codes, and its table of counts is not charged.' },
      { id: 'fixed', label: 'clerk 2: 3-bit slots and one escape', value: rows => sum(rows.map(r => r.fixed)), fmt: v => `${v} bits · ${fmt(v / 16, 2)} per value`,
        note: '16 × 3 = 48 bits of slots, plus 8 bits for the raw 14 and 4 bits saying it sits at position 15. Every value can be found and decoded alone: that is what the extra bits buy.' },
      { id: 'ratio', label: 'clerk 2 against clerk 1', value: rows => sum(rows.map(r => r.fixed)) / sum(rows.map(r => r.ideal)), fmt: v => `${fmt(v, 2)}× · +${fmt((v - 1) * 100, 0)} %`,
        note: (v, rows) => `Almost half again. ${fmt((sum(rows.map(r => r.fixed)) - sum(rows.map(r => r.ideal))) / 16, 2)} bits per value: whole-bit slots where the surprisals are fractional, and one expensive outlier.` },
      { id: 'escape', label: 'share of clerk 2’s bill spent on the escape', value: rows => ESC / sum(rows.map(r => r.fixed)), fmt: v => fmtPct(v, 0),
        note: 'One value in sixteen takes a fifth of the bill. The tail of a residual distribution is what a fixed-length code pays for.' },
    ],
    code: `
import numpy as np, pandas as pd

r = pd.read_csv("{csv}")["r"].to_numpy()       # the sixteen residuals
vals, counts = np.unique(r, return_counts=True)
ideal = (counts * np.log2(len(r) / counts)).sum()  # clerk 1: surprisal of every value
fixed = 3 * len(r) + (np.abs(r) > 3).sum() * (8 + 4)   # clerk 2: 3-bit slots + escapes
print(f"clerk 1: {ideal:.1f} bits ({ideal/16:.2f}/value)   clerk 2: {fixed} bits ({fixed/16:.2f}/value)")
`,
  });
})();
