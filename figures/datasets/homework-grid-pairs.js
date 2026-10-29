// Five value–prediction pairs counted on two 8-bit grids: the table of VI.11 (the grid). INT8 with a step of 2
// (codes round(x/2), halves away from zero); E4M3 in index space, read off the ladder of dataset e4m3.
// Values and predictions are quoted on the page; every residual is computed here.
(function () {
  const PAIRS = [[104, 96], [40, 44], [-60, -52], [10, 2], [-3, 6]];
  const STEP = 2;
  const code = x => Math.sign(x) * Math.round(Math.abs(x) / STEP);
  const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  function idxOf(x) {                                   // nearest E4M3 rung (ties to an even mantissa)
    const L = DS.rows('e4m3');
    let best = L[0];
    L.forEach(r => { const d = Math.abs(r.value - x), db = Math.abs(best.value - x); if (d < db || (d === db && r.bits.slice(-1) === '0')) best = r; });
    return best.index;
  }

  DS.define('homework-grid-pairs', {
    rows() {
      return PAIRS.map(([v, p], i) => {
        const iv = idxOf(v), ip = idxOf(p);
        return { n: i + 1, value: v, pred: p, int8: code(v) - code(p), e4m3: iv - ip, iv, ip };
      });
    },
    columns: [
      { key: 'value', label: 'value' }, { key: 'pred', label: 'prediction' },
      { key: 'int8', label: 'INT8 residual (steps)', fmt: sgn }, { key: 'e4m3', label: 'E4M3 residual (steps)', fmt: sgn },
      { key: 'iv', label: 'E4M3 position of value' }, { key: 'ip', label: '… of prediction' },
    ],
    csvColumns: ['value', 'pred', 'int8', 'e4m3', 'iv', 'ip'],
    highlights: { worse: { label: 'E4M3 needs more steps', test: r => Math.abs(r.e4m3) > Math.abs(r.int8) } },
    views: {
      rungs: {
        label: 'Rungs between guess and value',
        legend: false,
        draw(box, ctx) {
          box.append(legend([['INT8 grid points (step 2)', series(0), 'line'], ['E4M3 grid points', series(1), 'line'], ['value', 'var(--ink)', 'dot'], ['prediction', 'var(--c)', 'dot']]));
          const ladder = DS.rows('e4m3');
          const rowH = 92, n = ctx.rows.length;
          const D = Diagram(box, { w: 640, h: n * rowH + 10, label: 'For each pair, the grid points of INT8 and of E4M3 between the prediction and the value' });
          const fs = D.fs, g = el('g', {}, D.svg), L = 24, R = 616;
          ctx.rows.forEach((r, k) => {
            const y0 = 8 + k * rowH, lo = Math.min(r.value, r.pred), hi = Math.max(r.value, r.pred), pad = (hi - lo) * 0.12;
            const X = v => L + (v - (lo - pad)) / (hi - lo + 2 * pad) * (R - L);
            const hl = ctx.hl && ctx.hl.test(r), sel = ctx.sel && ctx.sel.test(r);
            if (hl) el('rect', { x: 2, y: y0 - 4, width: 636, height: rowH - 6, rx: 8, style: `fill:${mix(series(1), 9)}` }, g);
            if (sel) el('rect', { x: 2, y: y0 - 4, width: 636, height: rowH - 6, rx: 8, style: 'fill:none;stroke:var(--c);stroke-width:1.5' }, g);
            el('text', { x: L, y: y0 + 10 * fs, class: 'lbl', text: `value ${r.value}, prediction ${r.pred}` }, g);
            el('text', { x: R, y: y0 + 10 * fs, 'text-anchor': 'end', class: 'val', text: `INT8 ${sgn(r.int8)} · E4M3 ${sgn(r.e4m3)}` }, g);
            const yI = y0 + 18 * fs + 14, yE = yI + 22, tk = 7;
            el('line', { x1: L, x2: R, y1: yI, y2: yI, style: `stroke:${mix('var(--rule)', 70)}` }, g);
            el('line', { x1: L, x2: R, y1: yE, y2: yE, style: `stroke:${mix('var(--rule)', 70)}` }, g);
            for (let c = Math.ceil((lo - pad) / STEP); c * STEP <= hi + pad; c++) el('line', { x1: X(c * STEP), x2: X(c * STEP), y1: yI - tk, y2: yI + tk, style: `stroke:${series(0)};stroke-width:1.6` }, g);
            ladder.filter(q => q.value >= lo - pad && q.value <= hi + pad).forEach(q => el('line', { x1: X(q.value), x2: X(q.value), y1: yE - tk, y2: yE + tk, style: `stroke:${series(1)};stroke-width:1.1` }, g));
            [[r.pred, 'var(--c)'], [r.value, 'var(--ink)']].forEach(([v, c]) => {
              el('line', { x1: X(v), x2: X(v), y1: yI - 12, y2: yE + 12, style: `stroke:${c};stroke-width:2` }, g);
              dot(g, X(v), yE + 14, 4 * fs, c);
            });
          });
          box.append(h('p', { class: 'fig-note', text: 'Each row zooms on the stretch between one prediction and its value (its own scale). Upper ticks: INT8 grid points, one every 2 units. Lower ticks: E4M3 rungs. A residual is the number of ticks you walk past. Far from zero E4M3 has fewer ticks than INT8; near zero its ticks fuse into a solid band.' }));
        },
      },
    },
    metrics: [
      { id: 'smaller', label: 'pairs where E4M3 needs fewer steps', value: rows => rows.filter(r => Math.abs(r.e4m3) < Math.abs(r.int8)).length, fmt: v => `${v} of 5`,
        note: 'The three pairs far from zero (around 100, 40 and −60). There E4M3’s rungs are 8, 4 and 4 units apart, coarser than INT8’s 2, so a miss of a few units is one or two rungs.' },
      { id: 'total', label: 'all five residuals, in steps', value: rows => [sum(rows.map(r => Math.abs(r.int8))), sum(rows.map(r => Math.abs(r.e4m3)))],
        fmt: v => `INT8 ${v[0]} · E4M3 ${v[1]}`,
        note: 'Two pairs near zero do all the damage. The miss from 2 to 10 walks past 18 rungs; the miss from 6 to −3 crosses zero and walks past 144.' },
      { id: 'cross', label: 'E4M3 rungs strictly between −1 and 1', value: () => DS.rows('e4m3').filter(r => Math.abs(r.value) < 1).length, fmt: v => `${v} of 253`,
        note: 'Every residual that crosses zero walks past all of them. That is why prediction in E4M3 index space fails exactly where values are small and their sign is uncertain.' },
    ],
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("{csv}")                       # value, pred, int8 and e4m3 residuals (steps), E4M3 positions
print(d[["value", "pred", "int8", "e4m3"]])
print("E4M3 fewer steps:", (d.e4m3.abs() < d.int8.abs()).sum(), "of", len(d))
print("total steps: INT8", d.int8.abs().sum(), " E4M3", d.e4m3.abs().sum())
`,
  });
})();
