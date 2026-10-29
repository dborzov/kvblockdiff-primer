// A toy KV history (Part IV): one layer of one made-up request, 128 entries (tokens) of 8 elements each, stored as
// 8-bit whole numbers (−128 … 127), cut into blocks of b = 32. Built so that fallen-apple similarity HOLDS:
// every element is  typical value of its channel + a slow wander (AR(1), φ = 0.95, sd 12) + token noise (sd 4).
// Channel 0 is an "outlier" channel: large (≈ 96), slowly drifting (φ = 0.98, sd 3) and nearly noise-free (sd 0.6),
// like the few large key channels the KV-quantization papers report. Seeded (rng('idea-history')).
// It shows the mechanics of kv-blockdiff on numbers one can read — a block dictionary of typical values, fixed-length
// deltas, the dictionary tax, a neighbour-similarity curve — and is NOT evidence about real KV caches.
// Derived dataset: idea-entry-sizes (what each entry costs, three ways). Helpers are shared with it.
(function () {
  const N = 128, D = 8, B = 32;                                   // entries, elements per entry, block size b
  const CH = range(D).map(c => `c${c}`);
  const tint = (col, pct) => `color-mix(in srgb, ${col} ${pct}%, transparent)`;
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const bitsS = m => 1 + Math.ceil(Math.log2(m + 1));            // sign + binary digits for |x| ≤ m (as on I.5 and II.13)

  function generate() {
    const r = rng('idea-history');
    const mu = [96, ...range(D - 1).map(() => r.int(-40, 40))];
    const sd = c => (c === 0 ? 3 : 12), phi = c => (c === 0 ? 0.98 : 0.95), nz = c => (c === 0 ? 0.6 : 4);
    const slow = range(D).map(c => r.normal(0, sd(c)));
    return range(N).map(t => {
      if (t) for (let c = 0; c < D; c++) slow[c] = phi(c) * slow[c] + Math.sqrt(1 - phi(c) ** 2) * r.normal(0, sd(c));
      const v = range(D).map(c => clamp(Math.round(mu[c] + slow[c] + r.normal(0, nz(c))), -128, 127));
      const row = { t, block: Math.floor(t / B), v };
      v.forEach((x, c) => { row[CH[c]] = x; });
      return row;
    });
  }

  // ---- the coding, shared with idea-entry-sizes and the figures of Part IV
  const blocksOf = rows => range(Math.ceil(rows.length / B)).map(j => rows.filter(r => r.block === j));
  // the block dictionary: each channel's typical value (rounded mean) and the fixed width of its deltas
  function dictionary(blockRows) {
    const typ = range(D).map(c => Math.round(avg(blockRows.map(r => r.v[c]))));
    const width = range(D).map(c => bitsS(Math.max(...blockRows.map(r => Math.abs(r.v[c] - typ[c])))));
    return { typ, width, bits: sum(width) };
  }
  const dicts = rows => blocksOf(rows).map(dictionary);
  // an ideal context-free code: every element costs −log2 p(value), p = its frequency in the whole history
  function soloCost(rows) {
    const cnt = new Map();
    rows.forEach(r => r.v.forEach(x => cnt.set(x, (cnt.get(x) || 0) + 1)));
    const n = rows.length * D;
    return x => -Math.log2(cnt.get(x) / n);
  }
  const soloBitsPerElement = rows => { const f = soloCost(rows); return avg(rows.flatMap(r => r.v.map(f))); };
  // neighbour predictability at token distance Δ: per channel, R² of E[t] from E[t − Δ] (least squares), averaged
  function r2At(rows, dl) {
    let acc = 0;
    for (let c = 0; c < D; c++) {
      const x = rows.slice(0, rows.length - dl).map(r => r.v[c]), y = rows.slice(dl).map(r => r.v[c]);
      const mx = avg(x), my = avg(y);
      let sxy = 0, sxx = 0, syy = 0;
      x.forEach((q, i) => { sxy += (q - mx) * (y[i] - my); sxx += (q - mx) ** 2; syy += (y[i] - my) ** 2; });
      acc += sxy * sxy / (sxx * syy);
    }
    return acc / D;
  }
  const bitsOf = R => 0.5 * Math.log2(1 / (1 - R));              // the exchange rate of II.12
  const DELTAS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];
  const shuffled = rows => { const o = rng('idea-history-shuffle').shuffle(rows); return o; };
  const appleCurve = rows => DELTAS.map(dl => ({ dl, r2: r2At(rows, dl), bits: bitsOf(r2At(rows, dl)) }));

  // ---- views
  const valColor = x => (x >= 0 ? `color-mix(in srgb, var(--vermilion) ${Math.round(8 + 80 * Math.min(1, x / 110))}%, var(--paper-3))`
    : `color-mix(in srgb, var(--lapis) ${Math.round(8 + 80 * Math.min(1, -x / 110))}%, var(--paper-3))`);

  // a small drag-to-select over token positions, for the custom views
  function tokenBrush(P, ctx, rows) {
    const hit = el('rect', { x: P.m.l, y: P.m.t, width: P.pw, height: P.ph, class: 'hit ds-brush-hit', style: 'fill:transparent' }, P.g.top);
    const band = el('rect', { y: P.m.t, height: P.ph, visibility: 'hidden', style: 'fill:color-mix(in srgb, var(--c) 14%, transparent);stroke:var(--c)' }, P.g.top);
    let a = null;
    const at = e => clamp(Math.round(P.toData(e)[0]), 0, rows.length - 1);
    hit.addEventListener('pointerdown', e => { a = at(e); hit.setPointerCapture(e.pointerId); });
    hit.addEventListener('pointermove', e => {
      if (a == null) return;
      const i = at(e), [x0, x1] = [Math.min(a, i), Math.max(a, i)];
      band.setAttribute('x', P.x(x0 - 0.5)); band.setAttribute('width', P.x(x1 + 0.5) - P.x(x0 - 0.5)); band.setAttribute('visibility', 'visible');
    });
    hit.addEventListener('pointerup', e => {
      if (a == null) return;
      const i = at(e), [x0, x1] = [Math.min(a, i), Math.max(a, i)];
      a = null; band.setAttribute('visibility', 'hidden');
      if (x0 === x1) ctx.select({ label: `entry ${x0}`, test: r => r.t === x0 });
      else ctx.select({ label: `entries ${x0} to ${x1}`, test: r => r.t >= x0 && r.t <= x1 });
    });
    return hit;
  }
  const blockFrames = (P, rows, y0, y1) => {
    for (let j = 1; j * B < rows.length; j++) el('line', { x1: P.x(j * B - 0.5), x2: P.x(j * B - 0.5), y1: P.y(y0), y2: P.y(y1), style: 'stroke:var(--ink);stroke-width:1.4;stroke-dasharray:4 3' }, P.g.top);
  };

  const heat = {
    label: 'The entries',
    legend: false,
    draw(box, ctx) {
      const rows = ctx.rows, dc = dicts(rows);
      box.append(legend([['negative', 'var(--lapis)', 'box'], ['positive (darker = larger)', 'var(--vermilion)', 'box'], ['block boundary (b = 32)', 'var(--ink)', 'dash']]
        .concat(ctx.hl ? [[esc(ctx.hl.label), series(1), 'box']] : [])));
      const P = Plot(box, {
        x: [-0.5, rows.length - 0.5], y: [D - 0.5, -0.5], h: 250, grid: false, xticks: [0, 32, 64, 96, 127], yticks: range(D),
        yfmt: c => `c${c}`, xlabel: 'token position t (one column = one entry)', ylabel: 'element', m: { l: 44, r: 10, t: 22, b: 40 },
        label: 'The toy history as a grid: one column per entry, one row per element, colour = the stored 8-bit number',
      });
      const cw = P.x(1) - P.x(0), rh = P.y(1) - P.y(0);
      rows.forEach(r => {
        const dim = ctx.sel && !ctx.sel.test(r);
        r.v.forEach((x, c) => el('rect', { x: P.x(r.t - 0.5), y: P.y(c - 0.5), width: cw + 0.3, height: rh + 0.3, style: `fill:${valColor(x)}${dim ? ';opacity:.3' : ''}` }, P.g.data));
        if (ctx.hl && ctx.hl.test(r)) el('rect', { x: P.x(r.t - 0.5), y: P.y(-0.5) - 7 * P.fs, width: cw + 0.3, height: 5 * P.fs, style: `fill:${series(1)}` }, P.g.top);
      });
      blockFrames(P, rows, -0.5, D - 0.5);
      dc.forEach((d, j) => el('text', { x: P.x(j * B + B / 2 - 0.5), y: P.m.t - 6 * P.fs, 'text-anchor': 'middle', class: 'lbl', text: `block ${j}` }, P.g.top));
      const hit = tokenBrush(P, ctx, rows);
      hover(hit, e => {
        const [tx, cy] = P.toData(e), t = clamp(Math.round(tx), 0, rows.length - 1), c = clamp(Math.round(cy), 0, D - 1), r = rows[t], d = dc[r.block];
        const dl = r.v[c] - d.typ[c];
        return `<b>entry ${t}</b> (block ${r.block}), element c${c}<br>stored: <b>${r.v[c]}</b><br>block ${r.block}'s typical c${c}: ${d.typ[c]}<br>delta: ${dl >= 0 ? '+' : '−'}${Math.abs(dl)} (${d.width[c]} bits)`;
      });
    },
  };

  // dictionary and deltas: a few channels as strips, each with its block typical values (gold) and the leftovers (sticks)
  const SHOW = [0, 1, 2, 3];
  const leftovers = {
    label: 'Dictionary and deltas',
    legend: 'hl',
    draw(box, ctx) {
      const rows = ctx.rows, dc = dicts(rows), tall = box.clientWidth > 0 && box.clientWidth < 520 ? 1.5 : 1;
      box.append(legend([['stored value', series(0), 'dot'], ['the block’s typical value (dictionary)', 'var(--t-dictionary)', 'line'], ['delta = stored − typical', series(0), 'line']]));
      SHOW.forEach((c, k) => {
        const last = k === SHOW.length - 1, b = h('div');
        box.append(b);
        const vals = rows.map(r => r.v[c]), lo = Math.min(...vals), hi = Math.max(...vals), pad = Math.max(3, (hi - lo) * 0.12);
        const P = Plot(b, {
          x: [-0.5, rows.length - 0.5], y: [lo - pad, hi + pad], h: (last ? 118 : 88) * tall, m: { l: 52, r: 12, t: 16, b: last ? 34 : 6 }, grid: 'y', yn: 3,
          xticks: last ? [0, 32, 64, 96, 127] : [], xlabel: last ? 'token position t' : '', ylabel: `c${c}`, label: `Element c${c} of every entry, with its block typical values`,
        });
        if (ctx.sel) rows.forEach(r => { if (ctx.sel.test(r)) el('rect', { x: P.x(r.t - 0.5), width: P.x(1) - P.x(0), y: P.m.t, height: P.ph, style: `fill:${tint('var(--c)', 14)}` }, P.g.bg); });
        dc.forEach((d, j) => {
          const x0 = P.x(j * B - 0.5), x1 = P.x(Math.min(rows.length, (j + 1) * B) - 0.5);
          el('line', { x1: x0, x2: x1, y1: P.y(d.typ[c]), y2: P.y(d.typ[c]), style: 'stroke:var(--t-dictionary);stroke-width:2.4' }, P.g.data);
          el('text', { x: x1 - 4 * P.fs, y: P.m.t - 3 * P.fs, 'text-anchor': 'end', class: 'val', text: `${d.width[c]} bits` }, P.g.top);
        });
        rows.forEach(r => el('line', { x1: P.x(r.t), x2: P.x(r.t), y1: P.y(dc[r.block].typ[c]), y2: P.y(r.v[c]), style: `stroke:${tint(series(0), 70)};stroke-width:${1.4 * P.fs}` }, P.g.data));
        rows.forEach(r => dot(P.g.data, P.x(r.t), P.y(r.v[c]), 2.1 * P.fs, ctx.hl && ctx.hl.test(r) ? series(1) : series(0)));
        blockFrames(P, rows, P.y0, P.y1);
        el('text', { x: P.m.l + 6 * P.fs, y: P.m.t + 11 * P.fs, class: 'lbl', text: c === 0 ? 'c0 — the large, steady channel' : `c${c}` }, P.g.top);
        const hit = tokenBrush(P, ctx, rows);
        hover(hit, e => {
          const t = clamp(Math.round(P.toData(e)[0]), 0, rows.length - 1), r = rows[t], d = dc[r.block], dl = r.v[c] - d.typ[c];
          return `<b>entry ${t}</b>, c${c}<br>stored ${r.v[c]}, typical ${d.typ[c]}<br>delta ${dl >= 0 ? '+' : '−'}${Math.abs(dl)}, sent in ${d.width[c]} bits`;
        });
      });
    },
  };

  // the neighbour-similarity curve of the toy: bits a neighbour Δ tokens back saves, against Δ
  const apple = {
    label: 'Neighbours, by distance',
    legend: false,
    draw(box, ctx) {
      const rows = ctx.rows, cur = appleCurve(rows), sh = appleCurve(shuffled(rows));
      box.append(legend([['this history', 'var(--t-fallen-apple)', 'line'], ['the same entries, shuffled', 'var(--ink-3)', 'dash'], ['block size b = 32', 'var(--ink-2)', 'dash']]));
      const P = Plot(box, {
        x: [1, 64], xlog: 2, y: [0, 1], h: 260, xticks: [1, 2, 4, 8, 16, 32, 64], yticks: [0, 0.25, 0.5, 0.75, 1],
        xlabel: 'token distance Δ to the known neighbour (log scale)', ylabel: 'bits saved per element',
        label: 'Bits per element that knowing the entry Δ tokens back saves, against Δ',
      });
      rule(P, { x: B, label: 'b = 32', color: 'var(--ink-2)' });
      line(P, sh.map(p => [p.dl, p.bits]), { color: 'var(--ink-3)', dash: true, width: 1.6, name: 'shuffled' });
      line(P, cur.map(p => [p.dl, p.bits]), { color: 'var(--t-fallen-apple)', width: 2.4, markers: 3.2, name: 'this history', tip: p => `Δ = ${p[0]}<br>saves ${fmt(p[1], 2)} bit per element` });
      crosshair(P, { xname: 'Δ', xfmt: v => fmt(v, 0), yfmt: v => `${fmt(v, 2)} bit` });
    },
    note: 'Each point: for every element, the best straight-line guess of E[t] from E[t − Δ], its R², and the bits that R² is worth at the exchange rate of II.12, averaged over the 8 elements.',
  };

  DS.define('idea-history', {
    rows: generate,
    columns: [{ key: 't', label: 't' }, { key: 'block', label: 'block j' }, ...CH.map(k => ({ key: k, label: k }))],
    csvColumns: ['t', 'block', ...CH],
    highlights: {
      b2: { label: 'block 2 (entries 64–95)', test: r => r.block === 2 },
    },
    views: { heat, leftovers, apple },
    helpers: { N, D, B, CH, dictionary, dicts, blocksOf, soloCost, soloBitsPerElement, r2At, bitsOf, appleCurve, shuffled, bitsS },
    metrics: [
      { id: 'shape', label: 'entries × elements', value: rows => rows.length, fmt: v => `${v} × ${D} · ${D} bytes each`,
        note: `One layer of one made-up request. A real entry in the reference setting has 640 elements; this one has ${D}, so that every number fits on the screen. Each element is an 8-bit whole number, −128 to 127.` },
      { id: 'c0', label: 'the large channel c0', value: rows => [avg(rows.map(r => r.v[0])), Math.min(...rows.map(r => r.v[0])), Math.max(...rows.map(r => r.v[0]))],
        fmt: v => `${fmt(v[0], 1)} on average · ${v[1]} to ${v[2]}`,
        note: 'Far from zero and barely moving: the toy’s version of the few large, slowly changing key channels reported in the KV-quantization papers. Given its neighbourhood, it is almost free.' },
      { id: 'solo', label: 'bits per element, coded alone', value: soloBitsPerElement, fmt: v => `${fmt(v, 2)} bits · ${fmt(8 / v, 2)}× smaller than 8`,
        note: 'An ideal context-free code: each number costs −log₂ of its frequency in the whole history, with no help from any other entry. That gains about a fifth — the same range as the published context-free coders of 8-bit KV (1.1–1.3×).' },
      { id: 'dict', label: 'block 0’s dictionary', tex: '\\vD_0', value: rows => dictionary(rows.filter(r => r.block === 0)),
        fmt: v => `typical ${v.typ.map(x => fmt(x)).join(' · ')}<br>widths ${v.width.join(' · ')} bits`,
        note: `Two small numbers per element — a typical value and the width of the deltas — so ${2 * D} bytes: as big as two entries, a weight of $\\vw = 2$. Each block has its own.` },
      { id: 'widths', label: 'delta bits per entry, block by block', value: rows => dicts(rows).map(d => d.bits),
        fmt: v => v.map((b, j) => `block ${j}: ${b}`).join(' · '),
        note: 'Every entry of a block gets the same, fixed number of bits, so delta t sits at a computable address. The widths differ from block to block, never within one.' },
      { id: 'rho', label: 'delta ratio', tex: '\\vrho', value: rows => avg(dicts(rows).map(d => d.bits / (8 * D))), fmt: v => `${fmt(v, 2)} · ${fmt(8 * v, 1)} bits per element`,
        note: 'Delta bits over the 64 raw bits of an entry, averaged over the four blocks. The pages of Part IV assume 0.75; this toy, built so the bet holds, lands a little below.' },
      { id: 'allin', label: 'all in, per entry', tex: '\\vrho + \\vw/\\vb', value: rows => avg(dicts(rows).map(d => d.bits / (8 * D))) + 2 / B,
        fmt: v => `${fmt(v, 3)} of a raw entry`,
        note: `The dictionary’s ${2 * D} bytes, shared by the ${B} entries of its block, add $\\vw/\\vb = 2/32 = 0.0625$ to every entry. Small blocks pay a real tax.` },
      { id: 'apple1', label: 'bits saved by the entry next door', value: rows => bitsOf(r2At(rows, 1)), fmt: (v, rows) => `${fmt(v, 2)} bit per element · R² ${fmt(r2At(rows, 1), 2)}`,
        note: 'Knowing E[t − 1] explains most of each element’s variation: the slow wander is shared, only the token noise is new.' },
      { id: 'apple8', label: 'bits saved by the entry 8 tokens back', value: rows => bitsOf(r2At(rows, 8)), fmt: (v, rows) => `${fmt(v, 2)} bit per element · R² ${fmt(r2At(rows, 8), 2)}`,
        note: 'The saving fades with distance: eight tokens back, the wander has moved on.' },
      { id: 'apple32', label: 'bits saved at a distance of one block', value: rows => bitsOf(r2At(rows, B)), fmt: (v, rows) => `${fmt(v, 2)} bit per element · R² ${fmt(r2At(rows, B), 2)}`,
        note: 'At Δ = 32 the neighbour says almost nothing. In this toy, blocks much longer than a few dozen tokens would waste the saving.' },
      { id: 'shuf', label: 'next door, after shuffling the entries', value: rows => bitsOf(r2At(shuffled(rows), 1)), fmt: v => `${fmt(v, 2)} bit per element`,
        note: 'Shuffle the token order and every neighbour relation is gone: the “no help” line of any fallen-apple measurement.' },
    ],
    code: `
import numpy as np, pandas as pd

h = pd.read_csv("{csv}")                       # t, block, c0..c7: one row per entry, 8-bit whole numbers
X = h[[f"c{c}" for c in range(8)]].to_numpy()
b = 32

# coded alone: an ideal context-free code over the whole history
vals, counts = np.unique(X, return_counts=True)
p = dict(zip(vals, counts / X.size))
print("alone:", -np.mean(np.log2([p[v] for v in X.ravel()])).round(2), "bits per element")

# the block dictionary: typical value per element, and the fixed width of the deltas (sign + digits)
bits = []
for j in range(X.shape[0] // b):
    blk = X[j*b:(j+1)*b]
    typ = np.round(blk.mean(axis=0)).astype(int)
    width = 1 + np.ceil(np.log2(np.abs(blk - typ).max(axis=0) + 1)).astype(int)
    print(f"block {j}: typical {typ}, widths {width}, {width.sum()} bits per entry")
    bits.append(width.sum())
rho = np.mean(bits) / 64
print("delta ratio rho:", rho.round(2), " all in, rho + w/b:", (rho + 2 / b).round(3))

# neighbour similarity: bits saved by the entry delta tokens back (exchange rate of II.12)
for d in [1, 8, 32]:
    r2 = np.mean([np.corrcoef(X[:-d, c], X[d:, c])[0, 1] ** 2 for c in range(8)])
    print(f"delta = {d:2d}: R2 {r2:.2f}, saves {0.5 * np.log2(1 / (1 - r2)):.2f} bit per element")
`,
  });
})();
