// Every value of the 8-bit float FP8 E4M3 ("fn" variant: no infinities, largest 448), in order:
// 253 rungs of a ladder, indexed −126 … 126. II.20 (index space); a reference table for later Parts.
(function () {
  const POS = (function () {
    const out = [{ v: 0, e: 0, m: 0 }];
    for (let m = 1; m < 8; m++) out.push({ v: m / 8 * 2 ** -6, e: 0, m });
    for (let e = 1; e <= 15; e++) for (let m = 0; m < 8; m++) out.push({ v: (1 + m / 8) * 2 ** (e - 7), e, m });
    out.pop();                                         // S.1111.111 is NaN
    return out;
  })();
  const pow2 = k => (k >= 0 ? String(2 ** k) : `2⁻${String(-k).replace(/./g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`);
  const vfmt = v => (v === 0 ? '0' : Math.abs(v) >= 1 ? String(v) : String(+v.toPrecision(6)));

  DS.define('e4m3', {
    rows() {
      const rows = [];
      for (let i = -126; i <= 126; i++) {
        const p = POS[Math.abs(i)], s = i < 0 ? 1 : 0, v = s ? -p.v : p.v;
        const kind = i === 0 ? 'zero' : p.e === 0 ? 'subnormal' : 'normal';
        const binade = p.e === 0 ? (i === 0 ? '—' : 'below 2⁻⁶') : `[${pow2(p.e - 7)}, ${pow2(p.e - 6)})`;
        rows.push({ index: i, value: v, bits: `${s} ${p.e.toString(2).padStart(4, '0')} ${p.m.toString(2).padStart(3, '0')}`, kind, binade });
      }
      return rows;
    },
    columns: [
      { key: 'index', label: 'index' }, { key: 'value', label: 'value', fmt: vfmt },
      { key: 'bits', label: 'bits: sign exponent mantissa', fmt: s => `<span class="mono">${s}</span>` },
      { key: 'kind', label: 'kind', left: true }, { key: 'binade', label: 'binade', left: true },
    ],
    csvColumns: ['index', 'value', 'bits', 'kind'],
    highlights: {
      unit: { label: 'between −1 and 1', test: r => Math.abs(r.value) < 1 },
      tenth: { label: 'between −0.1 and 0.1', test: r => Math.abs(r.value) < 0.1 },
      sub: { label: 'zero and subnormals', test: r => r.kind !== 'normal' },
    },
    views: {
      ladder: {
        label: 'The ladder (log scale)',
        draw(box, ctx) {
          const b = h('div'); box.append(b);
          const rows = ctx.rows.filter(r => r.index > 0);
          const P = Plot(b, { x: [0, 127], y: [2 ** -10, 2 ** 9.5], ylog: 2, h: 320, xlabel: 'index (rung number)', ylabel: 'value', xticks: [1, 8, 24, 40, 56, 72, 88, 104, 126],
            yticks: [2 ** -9, 2 ** -6, 2 ** -3, 1, 8, 64, 448], yfmt: v => (v >= 1 ? String(v) : pow2(Math.round(Math.log2(v)))), label: 'E4M3 value against its index, on a logarithmic value axis' });
          rows.forEach(r => dot(P.g.data, P.x(r.index), P.y(r.value), 2.6 * P.fs, ctx.hl && ctx.hl.test(r) ? series(1) : r.kind === 'subnormal' ? series(6) : series(0)));
          const k1 = rows.find(r => r.value === 1), k2 = rows.find(r => r.value === 2);
          line(P, [[k1.index, 1], [k2.index, 1], [k2.index, 2]], { color: 'var(--c)', width: 2 });
          annotate(P, k2.index, 1.4, 'one doubling = 8 rungs\n(1 → 2 is index 56 → 64)', { dx: 30, dy: 40 });
          annotate(P, 4, 2 ** -7.5, 'subnormals: evenly spaced', { dx: 30, dy: -34 });
          hover(P.svg, e => { const [x] = P.toData(e), r = rows[clamp(Math.round(x) - 1, 0, rows.length - 1)]; return `<b>index ${r.index}</b>: ${vfmt(r.value)}<br><span class="mono">${r.bits}</span> · ${r.kind}`; });
          box.append(h('p', { class: 'fig-note', text: 'The non-negative half of the ladder (the negative half mirrors it). On a log axis the rungs climb in a straight line: every doubling of the value takes 8 rungs, anywhere above the subnormals.' }));
        },
      },
      linear: {
        label: 'The ladder (even scale)',
        draw(box, ctx) {
          const b = h('div'); box.append(b);
          const P = Plot(b, { x: [-130, 130], y: [-470, 470], h: 300, xlabel: 'index (rung number)', ylabel: 'value', xticks: [-126, -64, 0, 64, 126], label: 'E4M3 value against index on an even value axis' });
          area(P, [[-55, -470, 470], [55, -470, 470]].map(([x, lo, hi]) => [x, lo, hi]), { color: 'var(--c)', opacity: 0.1 });
          ctx.rows.forEach(r => dot(P.g.data, P.x(r.index), P.y(r.value), 2.2 * P.fs, ctx.hl && ctx.hl.test(r) ? series(1) : series(0)));
          annotate(P, 0, 0, '111 rungs between −1 and 1:\nthey all look like zero here', { dx: 40, dy: -80 });
          box.append(h('p', { class: 'fig-note', text: 'The same 253 values on an even axis. Almost half the rungs huddle around zero, inside the shaded band; the top binade alone spans 256 to 448.' }));
        },
      },
    },
    metrics: [
      { id: 'n', label: 'values (rungs)', value: rows => rows.length, fmt: v => `${v}, indices −126 … 126`,
        note: 'Zero, 7 subnormals and 15 binades of 8 values on each side, minus the one pattern per sign reserved for "not a number". Index 0 is zero; each step up is the next representable value.' },
      { id: 'max', label: 'largest and smallest positive', value: rows => [Math.max(...rows.map(r => r.value)), Math.min(...rows.filter(r => r.value > 0).map(r => r.value))],
        fmt: v => `${v[0]} · 2⁻⁹ ≈ ${fmt(v[1], 4)}`, note: 'A range of more than five orders of magnitude in 8 bits, paid for with precision: within 6.25 % above the subnormals.' },
      { id: 'doubling', label: 'rungs per doubling', value: rows => { const i = v => rows.find(r => r.value === v).index; return [i(2) - i(1), i(1) - i(0.5), i(192) - i(96)]; },
        fmt: v => `${v[0]} (also ${v[1]} and ${v[2]})`, note: '1 → 2, 0.5 → 1 and 96 → 192 are all 8 rungs: one binade, one mantissa pattern per rung. Index space is a logarithm of the value.' },
      { id: 'unit', label: 'rungs between −1 and 1', value: rows => rows.filter(r => Math.abs(r.value) < 1).length, fmt: (v, rows) => `${v} of ${rows.length}`,
        note: 'Almost half the codes describe numbers smaller than 1. A logarithmic grid spends as many codes on each binade below 1 as on each one above it.' },
      { id: 'tenth', label: 'rungs between −0.1 and 0.1', value: rows => rows.filter(r => Math.abs(r.value) < 0.1).length,
        note: 'So two values 0.2 apart near zero can be dozens of rungs apart: ±0.1 round to ±0.1015625, at indices ±29, which is 58 rungs.' },
      { id: 'gap', label: 'rungs from 11 to 12, and from −0.1 to 0.1', value: rows => { const i = v => rows.find(r => r.value === v).index; return [i(12) - i(11), i(0.1015625) - i(-0.1015625)]; },
        fmt: v => `${v[0]} · ${v[1]}`, note: 'The same idea from both ends: near 12 the rungs are a whole unit apart, near 0 they are packed tight. A residual counted in rungs depends on where it falls.' },
    ],
    code: `
import numpy as np, pandas as pd

g = pd.read_csv("{csv}")                       # columns: index, value, bits, kind
v = g["value"].to_numpy()
print(len(v), "values; max", v.max(), "; smallest positive", v[v > 0].min())
idx = dict(zip(v, g["index"]))
print("rungs 1 -> 2:", idx[2.0] - idx[1.0], "; 11 -> 12:", idx[12.0] - idx[11.0])
print("between -1 and 1:", (np.abs(v) < 1).sum(), "; between -0.1 and 0.1:", (np.abs(v) < 0.1).sum())
print("rungs from -0.1 to 0.1:", idx[0.1015625] - idx[-0.1015625])
`,
  });
})();
