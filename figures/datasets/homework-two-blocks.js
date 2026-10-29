// Two blocks of the same request, the first four entries of each, three channels: the toy that opens VI.5 (loc,
// the Anchor). Hand-made INT8 codes (quoted on the page). Each block's anchor per channel is the median of its four
// values, rounded down; the residual is the exact difference. The variance shares use block means.
(function () {
  const RAW = {
    A: { tok: [0, 1, 2, 3], big: [97, 97, 96, 98], drifter: [12, 15, 10, 13], noisy: [-31, 22, 5, -14] },
    B: { tok: [4096, 4097, 4098, 4099], big: [88, 89, 87, 88], drifter: [-20, -17, -22, -19], noisy: [18, -40, 3, 27] },
  };
  const CH = [
    { key: 'big', name: '“big”', s: 0 },
    { key: 'drifter', name: '“drifter”', s: 2 },
    { key: 'noisy', name: '“noisy”', s: 1 },
  ];
  const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
  // share of a channel's variance explained by the block means, and the exchange-rate gain
  function shares(rows, key) {
    const all = rows.map(r => r[key]), tot = variance(all);
    const within = mean(['A', 'B'].map(b => variance(rows.filter(r => r.block === b).map(r => r[key]))));
    return { tot, within, r2: 1 - within / tot, gain: 0.5 * Math.log2(tot / within) };
  }

  function chart(box, ctx, mode) {
    box.append(legend(CH.map(c => [c.name, series(c.s), 'dot'])));
    const b = h('div'); box.append(b);
    const slots = ctx.rows.map((r, i) => i + (r.block === 'B' ? 1 : 0));          // a gap between the blocks
    const resid = mode === 'resid';
    const P = Plot(b, {
      xcats: ['0', '1', '2', '3', '', '4096', '4097', '4098', '4099'], y: resid ? [-55, 35] : [-45, 105], h: 300, grid: 'y',
      xlabel: 'token (entry) — block A, then block B', ylabel: resid ? 'residual (INT8 codes)' : 'value (INT8 codes)',
      label: resid ? 'Residuals after subtracting each block’s anchors' : 'Values of three channels in two blocks, with each block’s anchors',
    });
    el('rect', { x: P.x(3.5), y: P.m.t, width: P.x(4.5) - P.x(3.5), height: P.ph, style: `fill:color-mix(in srgb, var(--ink) 6%, transparent)` }, P.g.bg);
    if (resid) rule(P, { y: 0, color: 'var(--ink-3)' });
    CH.forEach(c => {
      ['A', 'B'].forEach(bk => {
        const rs = ctx.rows.filter(r => r.block === bk), xs = rs.map(r => slots[ctx.idx.get(r)]);
        if (!resid) {
          const a = rs[0]['a_' + c.key];
          line(P, [[xs[0] - 0.35, a], [xs[3] + 0.35, a]], { color: series(c.s), width: 1.6, dash: '5 4' });
          if (bk === 'A' || P.fs < 1.3) svgText(P.g.top, P.x(xs[3] + 0.4), P.y(a) + 4 * P.fs, `${a}`, { class: 'val' });
        }
        line(P, rs.map((r, k) => [xs[k], resid ? r['r_' + c.key] : r[c.key]]), { color: series(c.s), width: 1.6, markers: 3.5 });
      });
    });
    ctx.rows.forEach((r, i) => {
      if (!(ctx.sel && ctx.sel.test(r))) return;
      el('rect', { x: P.x(slots[i] - 0.4), y: P.m.t, width: P.x(1) - P.x(0.2), height: P.ph, style: 'fill:none;stroke:var(--c);stroke-width:1.5' }, P.g.top);
    });
    const hit = el('rect', { x: P.m.l, y: P.m.t, width: P.pw, height: P.ph, class: 'hit' }, P.g.top);
    hover(hit, e => {
      const [x] = P.toData(e), k = slots.findIndex(s => Math.abs(s - x) < 0.5);
      if (k < 0) return '';
      const r = ctx.rows[k];
      return `<b>block ${r.block}, token ${r.tok}</b><br>` + CH.map(c => `${c.name}: ${r[c.key]} − ${r['a_' + c.key]} = ${sgn(r['r_' + c.key])}`).join('<br>');
    });
  }

  DS.define('homework-two-blocks', {
    rows() {
      const rows = [];
      ['A', 'B'].forEach(bk => {
        const R = RAW[bk], anchor = {};
        CH.forEach(c => { anchor[c.key] = Math.floor(median(R[c.key])); });
        R.tok.forEach((t, k) => {
          const row = { block: bk, tok: t };
          CH.forEach(c => { row[c.key] = R[c.key][k]; row['a_' + c.key] = anchor[c.key]; row['r_' + c.key] = R[c.key][k] - anchor[c.key]; });
          rows.push(row);
        });
      });
      return rows;
    },
    columns: [
      { key: 'block', label: 'block', left: true }, { key: 'tok', label: 'token' },
      { key: 'big', label: '“big”' }, { key: 'drifter', label: '“drifter”' }, { key: 'noisy', label: '“noisy”' },
      { key: 'r_big', label: 'residual, big', fmt: sgn }, { key: 'r_drifter', label: 'residual, drifter', fmt: sgn }, { key: 'r_noisy', label: 'residual, noisy', fmt: sgn },
    ],
    csvColumns: ['block', 'tok', 'big', 'drifter', 'noisy', 'a_big', 'a_drifter', 'a_noisy', 'r_big', 'r_drifter', 'r_noisy'],
    views: {
      values: { label: 'Values and anchors', draw: (box, ctx) => chart(box, ctx, 'values') },
      resid: { label: 'Residuals', draw: (box, ctx) => chart(box, ctx, 'resid') },
    },
    metrics: [
      { id: 'anchors', label: 'anchors: block A · block B', value: rows => CH.map(c => [rows[0]['a_' + c.key], rows[4]['a_' + c.key]]),
        fmt: v => CH.map((c, i) => `${c.name} ${v[i][0]} · ${v[i][1]}`).join('<br>'),
        note: 'Each block’s median per channel, rounded down to a whole code. Six numbers in all: two per channel per block, which is why the Anchor’s weight is about two entries.' },
      { id: 'r2', label: 'variance explained by the block means', tex: '\\vRsq', value: rows => CH.map(c => shares(rows, c.key).r2),
        fmt: v => CH.map((c, i) => `${c.name} ${fmtPct(v[i], 1)}`).join('<br>'),
        note: '“big” and “drifter” move almost only between blocks, so a block’s mean says nearly everything about them. “noisy” moves as much inside a block as across blocks: its block means explain next to nothing.' },
      { id: 'gain', label: 'bits saved per element, by the exchange rate', value: rows => CH.map(c => shares(rows, c.key).gain),
        fmt: v => CH.map((c, i) => `${c.name} ${fmt(v[i], 2)}`).join('<br>'),
        note: 'The formula $\\tfrac12\\log_2\\frac{1}{1-\\vRsq}$ of VI.3, channel by channel. Two channels save about three bits each, the third almost nothing. (Four values per block is far too few to trust the decimals; the shape of the result is the point.)' },
      { id: 'avg', label: 'average over the three channels', value: rows => mean(CH.map(c => shares(rows, c.key).gain)), fmt: v => `${fmt(v, 2)} bits per element`,
        note: 'An entry’s saving is the plain average over its channels, because every element pays its own bits. With 640 channels, the share of channels that sit still decides the answer.' },
    ],
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("{csv}")                       # block, tok, three channels, their anchors and residuals
for ch in ["big", "drifter", "noisy"]:
    tot = d[ch].var(ddof=0)
    within = d.groupby("block")[ch].var(ddof=0).mean()
    r2 = 1 - within / tot
    print(f"{ch:8s} anchors {d.groupby('block')['a_' + ch].first().tolist()}  R2 {r2:.3f}  gain {0.5*np.log2(tot/within):.2f} bits")
`,
  });
})();
