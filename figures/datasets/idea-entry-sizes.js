// What each entry of the toy KV history (dataset 'idea-history') costs, three ways — the KV twin of 'message-sizes':
//   raw   — 8 elements × 1 byte;
//   solo  — an ideal context-free code: each element −log2 of its frequency in the whole history (no other entry helps);
//   delta — the fixed-length delta against its block's dictionary (typical value per element, b = 32).
// Plus, per block, the dictionary itself: 8 typical values + 8 widths = 16 bytes (w = 2).
(function () {
  const H = () => DS.spec('idea-history').helpers;
  const tint = (col, pct) => `color-mix(in srgb, ${col} ${pct}%, transparent)`;
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const DICT_BYTES = 16;
  const SER = {
    raw: { label: 'raw entry', color: 'var(--ink-3)' },
    solo: { label: 'coded alone', color: series(0) },
    delta: { label: 'delta against the block dictionary', color: 'var(--t-delta)' },
  };

  // one column per entry: a wide pale bar behind a narrower solid one; blocks marked; drag to select
  const columns = o => ({
    label: o.label,
    legend: 'hl',
    draw(box, ctx) {
      const rows = ctx.rows, keys = [o.back, o.front];
      box.append(legend(keys.map(k => [SER[k].label, k === o.back ? tint(SER[k].color, 40) : SER[k].color, 'box'])));
      const b = h('div'); box.append(b);
      const P = Plot(b, {
        x: [-0.5, rows.length - 0.5], y: [0, 9], h: 240, grid: 'y', yticks: [0, 2, 4, 6, 8], xticks: [0, 32, 64, 96, 127],
        xlabel: 'entry (token position t)', ylabel: 'bytes', label: o.title,
      });
      const slot = P.x(1) - P.x(0);
      rows.forEach(r => {
        const dim = ctx.sel && !ctx.sel.test(r);
        const bar = (key, frac, pct) => el('rect', { x: P.x(r.t) - slot * frac / 2, width: slot * frac, y: P.y(r[key]), height: P.y(0) - P.y(r[key]), style: `fill:${tint(SER[key].color, dim ? pct * 0.35 : pct)}` }, P.g.data);
        bar(o.back, 0.96, 30);
        bar(o.front, 0.62, 100);
        if (ctx.hl && ctx.hl.test(r)) dot(P.g.data, P.x(r.t), P.y(r[o.back]) - 6 * P.fs, 2.4 * P.fs, series(1));
      });
      for (let j = 1; j * 32 < rows.length; j++) el('line', { x1: P.x(j * 32 - 0.5), x2: P.x(j * 32 - 0.5), y1: P.m.t, y2: P.m.t + P.ph, style: 'stroke:var(--ink);stroke-width:1.2;stroke-dasharray:4 3' }, P.g.top);
      ctx.marks.filter(m => keys.includes(m.key)).forEach(m => rule(P, { y: m.value, label: `${m.label}: ${fmt(m.value, 2)} B`, color: 'var(--ink-2)' }));
      // hover + drag-select over entries
      const hit = el('rect', { x: P.m.l, y: P.m.t, width: P.pw, height: P.ph, class: 'hit ds-brush-hit', style: 'fill:transparent' }, P.g.top);
      const band = el('rect', { y: P.m.t, height: P.ph, visibility: 'hidden', style: 'fill:color-mix(in srgb, var(--c) 14%, transparent);stroke:var(--c)' }, P.g.top);
      const at = e => clamp(Math.round(P.toData(e)[0]), 0, rows.length - 1);
      let a = null;
      hover(hit, e => { const r = rows[at(e)]; return `<b>entry ${r.t}</b> (block ${r.block})<br>raw ${r.raw} B<br>coded alone ${fmt(r.solo, 2)} B<br>delta ${fmt(r.delta, 2)} B`; });
      hit.addEventListener('pointerdown', e => { a = at(e); hit.setPointerCapture(e.pointerId); });
      hit.addEventListener('pointermove', e => { if (a == null) return; const i = at(e), [x0, x1] = [Math.min(a, i), Math.max(a, i)]; band.setAttribute('x', P.x(x0 - 0.5)); band.setAttribute('width', P.x(x1 + 0.5) - P.x(x0 - 0.5)); band.setAttribute('visibility', 'visible'); });
      hit.addEventListener('pointerup', e => {
        if (a == null) return;
        const i = at(e), [x0, x1] = [Math.min(a, i), Math.max(a, i)];
        a = null; band.setAttribute('visibility', 'hidden');
        ctx.select(x0 === x1 ? { label: `entry ${x0}`, test: r => r.t === x0 } : { label: `entries ${x0} to ${x1}`, test: r => r.t >= x0 && r.t <= x1 });
      });
    },
  });

  // the bytes of each block: raw, against dictionary + deltas, as bars to scale
  const blocks = {
    label: 'Block by block',
    legend: false,
    draw(box, ctx) {
      const rows = ctx.rows, js = [...new Set(rows.map(r => r.block))];
      box.append(legend([['raw block', tint('var(--ink-3)', 55), 'box'], ['dictionary (16 B)', 'var(--t-dictionary)', 'box'], ['32 deltas', 'var(--t-delta)', 'box']]));
      const D = Diagram(box, { w: 640, h: 70 + js.length * 64, grow: 0.3, label: 'Bytes of each block: raw, and as one dictionary plus its deltas, to scale' });
      const fs = D.fs, L = 92 * Math.min(fs, 1.4), R = 640 - 96 * Math.min(fs, 1.4), max = 32 * 8, sc = (R - L) / max;
      js.forEach((j, k) => {
        const blk = rows.filter(r => r.block === j), del = sum(blk.map(r => r.delta)), raw = sum(blk.map(r => r.raw)), y = 18 + k * 64 * (1 + (fs - 1) * 0.3);
        const sel = ctx.sel && blk.some(r => ctx.sel.test(r));
        el('text', { x: L - 8, y: y + 22, 'text-anchor': 'end', class: 'lbl', text: `block ${j}` }, D.svg);
        el('rect', { x: L, y, width: raw * sc, height: 15, rx: 3, style: `fill:${tint('var(--ink-3)', 55)}` }, D.svg);
        el('text', { x: L + raw * sc + 6, y: y + 12, class: 'val', text: `${raw} B` }, D.svg);
        el('rect', { x: L, y: y + 20, width: DICT_BYTES * sc, height: 15, rx: 3, style: 'fill:var(--t-dictionary)' }, D.svg);
        el('rect', { x: L + DICT_BYTES * sc + 1.5, y: y + 20, width: del * sc, height: 15, rx: 3, style: `fill:var(--t-delta)${sel ? ';stroke:var(--c);stroke-width:2' : ''}` }, D.svg);
        el('text', { x: L + (DICT_BYTES + del) * sc + 8, y: y + 32, class: 'val', text: `${fmt(DICT_BYTES + del, 0)} B · ${fmtPct((DICT_BYTES + del) / raw, 0)}` }, D.svg);
        el('text', { x: L, y: y + 50, class: 'annot', text: `dictionary ${fmtPct(DICT_BYTES / (DICT_BYTES + del), 0)} of the stored block; deltas ${fmt(blk[0].delta * 8, 0)} bits per entry` }, D.svg);
      });
    },
  };

  DS.define('idea-entry-sizes', {
    rows() {
      const hist = DS.rows('idea-history'), f = H().soloCost(hist), dc = H().dicts(hist);
      return hist.map(r => ({ t: r.t, block: r.block, raw: 8, solo: sum(r.v.map(f)) / 8, delta: dc[r.block].bits / 8 }));
    },
    columns: [
      { key: 't', label: 't' }, { key: 'block', label: 'block j' }, { key: 'raw', label: 'raw B' },
      { key: 'solo', label: 'alone B', fmt: v => fmt(v, 2) }, { key: 'delta', label: 'delta B', fmt: v => fmt(v, 3) },
    ],
    highlights: { b2: { label: 'block 2', test: r => r.block === 2 } },
    views: {
      alone: columns({ label: 'Each alone', back: 'raw', front: 'solo', title: 'Raw and context-free size of each of the 128 toy entries' }),
      delta: columns({ label: 'With the block dictionary', back: 'solo', front: 'delta', title: 'Each toy entry coded alone and as a delta against its block dictionary' }),
      blocks,
    },
    metrics: [
      { id: 'raw', label: 'raw entry', tex: '\\ve', value: () => 8, fmt: v => `${v} B`, note: 'Eight 8-bit numbers. In the reference setting the same picture has 640 of them: $\\ve = 640$ bytes.' },
      { id: 'solo', label: 'coded alone', mark: 'solo', short: 'average alone', value: rows => avg(rows.map(r => r.solo)),
        fmt: v => `${fmt(v, 2)} B · ${fmtPct(1 - v / 8, 0)} saved`,
        note: 'With no other entry to lean on, an entry shrinks by about a sixth — the same story as a Gull Rock message compressed alone (I.1).' },
      { id: 'delta', label: 'delta against the block dictionary', tex: '\\vdsz', mark: 'delta', short: 'average delta', value: rows => avg(rows.map(r => r.delta)),
        fmt: (v, rows) => `${fmt(v, 2)} B · ${Math.min(...rows.map(r => r.delta))} to ${Math.max(...rows.map(r => r.delta))} B`,
        note: v => `${fmt(v / 8, 2)} of the raw entry: the delta ratio $\\vrho$ of IV.2. Better than alone, though far from the radio messages’ 147 → 22 bytes: numbers that wander share a shape, never exact bytes.` },
      { id: 'dictb', label: 'one block dictionary', tex: '\\vDsz', value: () => DICT_BYTES, fmt: v => `${v} B · weight 2`,
        note: 'A typical value and a delta width per element. Like the radio almanac it is side information, but it serves only the 32 entries of its own block.' },
      { id: 'share', label: 'dictionary share of a stored block', value: rows => { const d = avg([...new Set(rows.map(r => r.block))].map(j => sum(rows.filter(r => r.block === j).map(r => r.delta)))); return DICT_BYTES / (DICT_BYTES + d); },
        fmt: v => fmtPct(v, 0), note: 'With only 32 entries per block, the dictionary is a visible slice. At $\\vb = 4096$ the same dictionary would be a rounding error.' },
      { id: 'allin', label: 'per entry, all in', value: rows => avg(rows.map(r => r.delta)) + DICT_BYTES / 32, fmt: v => `${fmt(v, 2)} B · ${fmt(v / 8, 3)} of raw`,
        note: 'Delta plus the entry’s share of its dictionary: $\\ve(\\vrho + \\vw/\\vb)$. The dictionary tax here is 0.5 B per entry.' },
    ],
    code: `
import pandas as pd

s = pd.read_csv("{csv}")              # one row per toy entry: raw, solo (coded alone), delta — in bytes
print("coded alone:", s.solo.mean().round(2), "B of", s.raw[0])
print("delta:", s.delta.mean().round(2), "B, rho =", (s.delta.mean() / 8).round(2))
per_block = s.groupby("block").delta.sum()
print("dictionary share per block:", (16 / (16 + per_block)).round(2).tolist())
print("all in per entry:", (s.delta.mean() + 16 / 32).round(2), "B")
`,
  });
})();
