// Two near-duplicate entries of one block, first 8 elements each, as INT8 codes: the toy that opens VI.8 (sib, the
// Twin). Hand-made, illustrative; the difference is computed. Gains use the Gaussian rule: halve the spread, save a bit.
(function () {
  const A = [42, -23, 63, 11, -53, 18, 29, -7];        // entry 1307, the one to send
  const B = [39, -20, 65, 6, -51, 14, 31, -9];         // entry 2954, the sibling the receiver holds
  const rms = a => Math.sqrt(mean(a.map(v => v * v)));
  const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);

  function chart(box, ctx, diffOnly) {
    if (!diffOnly) box.append(legend([['entry 1307', series(0), 'box'], ['entry 2954 (the sibling)', series(2), 'box'], ['difference', series(1), 'box']]));
    const b = h('div'); box.append(b);
    const P = Plot(b, { xcats: ctx.rows.map(r => String(r.el)), y: [-62, 72], h: 280, grid: 'y', xlabel: 'element of the entry', ylabel: 'value (INT8 codes)',
      label: diffOnly ? 'The difference between the two entries, element by element' : 'Two near-duplicate entries and their difference' });
    rule(P, { y: 0, color: 'var(--ink-3)' });
    const data = ctx.rows.map(r => (diffOnly ? [r.diff] : [r.a, r.b, r.diff]));
    bars(P, data, {
      colors: (i, j) => (diffOnly ? series(1) : series([0, 2, 1][j])), width: diffOnly ? 26 : 16,
      labels: diffOnly ? (v => sgn(v)) : false,
      tip: (v, i) => { const r = ctx.rows[i]; return `<b>element ${r.el}</b><br>entry 1307: ${r.a}<br>entry 2954: ${r.b}<br>difference: ${sgn(r.diff)}`; },
    });
    if (diffOnly) annotate(P, 6.5, 0, 'the same scale as the entries:\nthe difference hugs zero', { dx: -40, dy: -70, anchor: 'end' });
  }

  DS.define('homework-twins', {
    rows: () => A.map((a, i) => ({ el: i + 1, a, b: B[i], diff: a - B[i] })),
    columns: [{ key: 'el', label: 'element' }, { key: 'a', label: 'entry 1307' }, { key: 'b', label: 'entry 2954' }, { key: 'diff', label: 'difference', fmt: sgn }],
    views: {
      both: { label: 'The two entries', legend: false, draw: (box, ctx) => chart(box, ctx, false) },
      diff: { label: 'What is sent', draw: (box, ctx) => chart(box, ctx, true) },
    },
    metrics: [
      { id: 'spread', label: 'spread of the entry · of the difference', value: rows => [rms(rows.map(r => r.a)), rms(rows.map(r => r.diff))],
        fmt: v => `${fmt(v[0], 1)} · ${fmt(v[1], 1)} codes`,
        note: 'Root mean square, around zero. The entry swings over tens of codes; what is left after subtracting its twin is a few codes either way.' },
      { id: 'saved', label: 'bits saved per element, these eight', value: rows => Math.log2(rms(rows.map(r => r.a)) / rms(rows.map(r => r.diff))), fmt: v => `≈ ${fmt(v, 1)} bits`,
        note: 'The spread shrinks about twelve times, and every halving of the spread saves one bit (II.11). That is a big win — if every element of every entry had a twin this close.' },
      { id: 'pointer', label: 'the pointer to the sibling', value: () => Math.log2(4096) / 640, fmt: v => `12 bits per entry = ${fmt(v, 3)} bit per element`,
        note: 'For blocks of 4096 entries of 640 elements. Next to a twin this good the pointer is nothing. The catch is elsewhere: most entries have no such twin, and the sibling must be on the GPU first.' },
    ],
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("{csv}")                       # el, a (entry 1307), b (entry 2954), diff = a - b
rms = lambda x: np.sqrt((x ** 2).mean())
print(f"spread: entry {rms(d['a']):.1f}, difference {rms(d['diff']):.1f} codes")
print(f"bits saved per element ~ {np.log2(rms(d['a']) / rms(d['diff'])):.1f}")
print(f"pointer: {np.log2(4096) / 640:.3f} bit per element")
`,
  });
})();
