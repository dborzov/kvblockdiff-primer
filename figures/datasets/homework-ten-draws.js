// Ten draws from one bell-shaped "channel", rounded to FP8 E4M3: the table that opens VI.1 (the bit budget).
// The ten drawn values are fixed (they are quoted on the page); everything else — the stored value, the byte and the
// grid position — is computed here from the E4M3 ladder (dataset e4m3), so the two can never disagree.
(function () {
  const DRAWN = [130.62, -163.56, 26.76, -36.34, -28.97, -13.80, -129.28, -14.84, -55.37, 212.67];
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const FIELD = [
    { key: 'sign', name: 'sign', n: 1, col: 'var(--ink-3)' },
    { key: 'exp', name: 'exponent', n: 4, col: series(1) },
    { key: 'mant', name: 'mantissa', n: 3, col: series(0) },
  ];
  const H = arr => { const c = {}; arr.forEach(v => { c[v] = (c[v] || 0) + 1; }); return -Object.values(c).reduce((s, k) => s + k / arr.length * Math.log2(k / arr.length), 0); };
  const vstr = v => (v < 0 ? '−' : '+') + Math.abs(v);

  DS.define('homework-ten-draws', {
    rows() {
      const ladder = DS.rows('e4m3').filter(r => r.index >= 0);    // non-negative rungs, index 0 … 126
      return DRAWN.map((x, i) => {
        const a = Math.abs(x);
        let best = ladder[0];
        ladder.forEach(r => { const d = Math.abs(r.value - a), db = Math.abs(best.value - a); if (d < db || (d === db && r.bits.slice(-1) === '0')) best = r; });
        const s = x < 0 ? 1 : 0, [, e, m] = best.bits.split(' ');
        return { n: i + 1, drawn: x, stored: s ? -best.value : best.value, sign: String(s), exp: e, mant: m, pos: s ? -best.index : best.index };
      });
    },
    columns: [
      { key: 'n', label: 'draw' },
      { key: 'drawn', label: 'drawn', fmt: v => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(2) },
      { key: 'stored', label: 'stored (E4M3)', fmt: vstr },
      { key: 'sign', label: 'sign', fmt: v => `<span class="mono">${v}</span>` },
      { key: 'exp', label: 'exponent', fmt: v => `<span class="mono">${v}</span>` },
      { key: 'mant', label: 'mantissa', fmt: v => `<span class="mono">${v}</span>` },
      { key: 'pos', label: 'grid position', fmt: v => (v < 0 ? '−' : '+') + Math.abs(v) },
    ],
    csvColumns: ['n', 'drawn', 'stored', 'sign', 'exp', 'mant', 'pos'],
    highlights: {
      top: { label: 'exponent 1110 (128 to 240)', test: r => r.exp === '1110' },
      neg: { label: 'negative', test: r => r.sign === '1' },
    },
    views: {
      bytes: {
        label: 'The ten bytes',
        legend: false,
        draw(box, ctx) {
          box.append(legend(FIELD.map(f => [`${f.name} (${f.n} bit${f.n > 1 ? 's' : ''})`, f.col, 'box'])));
          const n = ctx.rows.length, rowH = 30, narrow = box.clientWidth < 520, W = narrow ? 340 : 640;
          const D = Diagram(box, { w: W, h: 40 + n * rowH, label: 'The ten stored bytes, bit by bit, coloured by field' });
          const fs = D.fs, g = el('g', {}, D.svg);
          const cw = narrow ? 28 : 36, x0 = narrow ? 64 : 640 / 2 - 4 * cw - 20 * (fs - 1);
          el('text', { x: x0 - 10, y: 22, 'text-anchor': 'end', class: 'lbl', text: narrow ? 'stored' : 'drawn → stored' }, g);
          el('text', { x: x0 + 8 * cw + 12, y: 22, class: 'lbl', text: narrow ? 'rung' : 'grid position' }, g);
          ctx.rows.forEach((r, i) => {
            const y = 34 + i * rowH, hl = ctx.hl && ctx.hl.test(r), sel = ctx.sel && ctx.sel.test(r);
            if (hl) el('rect', { x: 2, y: y - 3, width: W - 4, height: rowH - 2, rx: 6, style: `fill:${mix(series(1), 14)}` }, g);
            if (sel) el('rect', { x: 2, y: y - 3, width: W - 4, height: rowH - 2, rx: 6, style: 'fill:none;stroke:var(--c);stroke-width:1.5' }, g);
            el('text', { x: x0 - 10, y: y + rowH / 2 + 1, 'text-anchor': 'end', class: 'val', text: narrow ? vstr(r.stored) : `${(r.drawn < 0 ? '−' : '+') + Math.abs(r.drawn).toFixed(2)} → ${vstr(r.stored)}` }, g);
            const bits = (r.sign + r.exp + r.mant).split('');
            bits.forEach((b, k) => {
              const f = k === 0 ? FIELD[0] : k < 5 ? FIELD[1] : FIELD[2];
              const x = x0 + k * cw + (k >= 1 ? 3 : 0) + (k >= 5 ? 3 : 0);
              el('rect', { x, y, width: cw - 3, height: rowH - 8, rx: 3, style: `fill:${mix(f.col, b === '1' ? 70 : 16)};stroke:${mix(f.col, 80)};stroke-width:1` }, g);
              el('text', { x: x + (cw - 3) / 2, y: y + (rowH - 8) / 2 + 4.5 * fs, 'text-anchor': 'middle', class: 'mono', style: `fill:${b === '1' ? 'var(--paper-3)' : 'var(--ink)'};font-size:${(narrow ? 11 : 12) * fs}px`, text: b }, g);
            });
            el('text', { x: x0 + 8 * cw + 12, y: y + rowH / 2 + 1, class: 'val', text: (r.pos < 0 ? '−' : '+') + Math.abs(r.pos) }, g);
          });
          box.append(h('p', { class: 'fig-note', text: 'Each row is one stored byte: 1 sign bit, 4 exponent bits, 3 mantissa bits (filled = 1). Read the columns: the exponent keeps repeating a few patterns; the sign and the mantissa do not.' }));
        },
      },
      ladder: {
        label: 'On the E4M3 ladder',
        draw(box, ctx) {
          const b = h('div'); box.append(b);
          const rungs = DS.rows('e4m3');
          const P = Plot(b, { x: [-130, 130], y: [-470, 470], h: 300, xlabel: 'grid position (index space)', ylabel: 'value', xticks: [-126, -64, 0, 64, 126], label: 'The ten draws on the E4M3 ladder: value against grid position' });
          rungs.forEach(r => dot(P.g.data, P.x(r.index), P.y(r.value), 1.6 * P.fs, mix('var(--ink-3)', 55)));
          ctx.rows.forEach(r => {
            const hl = ctx.hl && ctx.hl.test(r), sel = ctx.sel && ctx.sel.test(r);
            const c = dot(P.g.data, P.x(r.pos), P.y(r.stored), (sel ? 6.5 : 5) * P.fs, hl ? series(1) : series(0));
            hover(c, () => `<b>draw ${r.n}</b>: ${r.drawn} → ${vstr(r.stored)}<br>byte <span class="mono">${r.sign} ${r.exp} ${r.mant}</span><br>grid position ${r.pos}`);
          });
          annotate(P, 0, 0, '111 rungs between −1 and 1:\nnone of the ten lands there', { dx: 30, dy: -90 });
          box.append(h('p', { class: 'fig-note', text: 'Grey: all 253 rungs of E4M3 (dataset of II.20). Coloured: the ten stored values. They all sit on the steep outer arms, positions 86 to 117 from the middle, where a few exponents cover the range a bell curve of this spread lives in.' }));
        },
      },
    },
    metrics: [
      { id: 'patterns', label: 'exponent patterns used', value: rows => new Set(rows.map(r => r.exp)).size, fmt: v => `${v} of 16`,
        note: 'Ten values, and only four of the sixteen exponents: 1010, 1011, 1100, 1110. The exponent tells you roughly how big a number is, and a bell curve keeps its numbers within a few doublings of its spread.' },
      { id: 'expH', label: 'entropy of these ten exponents', value: rows => H(rows.map(r => r.exp)), fmt: v => `${fmt(v, 2)} bits (of 4 stored)`,
        note: 'A rough count from ten values: 1110 four times, the other three twice each. A million draws refine it to 2.54 bits. Either way the exponent field carries well under its 4 bits: this is the easy saving.' },
      { id: 'signs', label: 'signs', value: rows => rows.filter(r => r.sign === '1').length, fmt: v => `${v} negative · ${10 - v} positive`,
        note: 'Seven to three looks lopsided, but ten coin tosses do this about a third of the time. Over a million draws the sign carries a full bit: nothing to save.' },
      { id: 'mant', label: 'mantissa patterns used', value: rows => new Set(rows.map(r => r.mant)).size, fmt: v => `${v} of 8`,
        note: 'The mantissa picks where in its doubling a value falls, and a smooth bell gives every position about the same chance. Six of eight patterns in ten draws is what noise looks like.' },
    ],
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("{csv}", dtype={"sign": str, "exp": str, "mant": str})
def H(col):                                    # entropy of the observed values, bits
    p = col.value_counts(normalize=True).to_numpy()
    return -(p * np.log2(p)).sum()
print("exponent patterns:", d["exp"].nunique(), "of 16 ->", d["exp"].value_counts().to_dict())
print(f"entropy of the ten exponents: {H(d['exp']):.2f} bits (4 stored)")
print("negative:", (d["sign"] == "1").sum(), " mantissa patterns:", d["mant"].nunique(), "of 8")
`,
  });
})();
