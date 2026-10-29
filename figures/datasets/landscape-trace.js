// The toy trace of III.7: one layer of one request, 16 positions, a hot cache of B = 6 slots,
// k = 4 selections per step, three decode steps. One row per selection (12 rows).
// The same numbers are stored in figures/data/toy-trace.json (shared with IV.5); FIG.toyTrace
// checks that both agree. helpers.resolve is HiSparse's resolve rule, used by the Part III figures.
(function () {
  const N = 16, B = 6, K = 4;
  const INITIAL = [1, 10, 13, 2, 5, 9];                 // hot cache before step 1, least recently used first
  const STEPS = [[2, 5, 9, 14], [2, 5, 9, 11], [2, 9, 11, 15]];
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const HIT = 'var(--good)', MISS = 'var(--t-hot-cache)', OLD = 'var(--ink-3)';

  // HiSparse's resolve rule on one layer (cache: positions, oldest first).
  function resolve(cache, S, slots) {
    const before = cache.slice();
    const hits = S.filter(p => before.includes(p)), misses = S.filter(p => !before.includes(p));
    const c = before.slice(), evicted = [];
    for (const p of misses) {
      if (c.length >= slots) {
        const v = c.find(x => !S.includes(x));
        c.splice(c.indexOf(v), 1);
        evicted.push(v);
      }
      c.push(p);
    }
    for (const p of hits) { c.splice(c.indexOf(p), 1); c.push(p); }
    return { hits, misses, evicted, cacheAfter: c };
  }
  // Run the trace from a cache of `slots` (the most recent of INITIAL); per step: the resolve result.
  function run(slots) {
    let cache = INITIAL.slice(-slots);
    return STEPS.map(S => { const r = resolve(cache, S, slots); cache = r.cacheAfter; return r; });
  }
  const dstr = d => (d === Infinity ? '∞' : String(d));

  // The trace as a grid, drawn like the storm morning of II.21: one row per position, one column per
  // selection; the six grey columns on the left are the last uses of what the hot cache holds before step 1.
  function grid(box, ctx) {
    const rows = ctx.rows, pre = INITIAL.length;
    const D = Diagram(box, { w: 640, h: 420, label: 'The toy trace: one row per position, one column per selection' });
    const fs = D.fs, wide = fs < 1.3;
    const L = wide ? 92 : 30, R = 634, gap = 10, ncol = pre + rows.length;
    const cw = (R - L - 3 * gap) / ncol, top = 34 * fs, rh = Math.min(26, 10 * fs + 8);
    const g = el('g', {}, D.svg);
    const colX = j => L + j * cw + (j >= pre ? gap * (1 + Math.floor((j - pre) / K)) : 0);
    // group headings
    el('text', { x: colX(0) + pre * cw / 2, y: 13 * fs, 'text-anchor': 'middle', class: 'lbl', text: 'before' }, g);
    STEPS.forEach((S, s) => el('text', { x: colX(pre + s * K) + K * cw / 2, y: 13 * fs, 'text-anchor': 'middle', class: 'lbl', text: `step ${s + 1}` }, g));
    // rows: positions 0 … 15
    for (let p = 0; p < N; p++) {
      const y = top + p * rh;
      el('rect', { x: L, y, width: R - L, height: rh - 1, style: `fill:${mix('var(--ink)', p % 2 ? 2 : 5)}` }, g);
      if (p % (wide ? 1 : 3) === 0 || p === N - 1) el('text', { x: L - 6, y: y + rh * 0.7, 'text-anchor': 'end', class: 'val', text: wide ? `position ${p}` : p }, g);
    }
    // the sequence of uses: the initial cache's order, then the selections
    const seq = [...INITIAL.map(p => ({ pos: p, pre: true })), ...rows];
    const lastAt = {};
    seq.forEach((u, j) => {
      const x = colX(j), y = top + u.pos * rh, cx = x + cw / 2, cy = y + rh / 2 - 0.5;
      if (lastAt[u.pos] != null) {
        const px = colX(lastAt[u.pos]) + cw / 2;
        el('line', { x1: px, x2: cx, y1: cy, y2: cy, style: `stroke:${mix('var(--ink-2)', 55)};stroke-width:1.5` }, g);
      }
      lastAt[u.pos] = j;
      if (u.pre) { el('rect', { x: x + 1.5, y: y + 1.5, width: cw - 3, height: rh - 4, rx: 3, style: `fill:${mix(OLD, 55)}` }, g); return; }
      const dim = ctx.hl && !ctx.hl.test(u), sel = ctx.sel && ctx.sel.test(u);
      const col = u.outcome === 'hit' ? HIT : MISS;
      const cell = el('rect', { x: x + 1.5, y: y + 1.5, width: cw - 3, height: rh - 4, rx: 3, tabindex: 0,
        style: `fill:${dim ? mix(col, 22) : col};${sel ? 'stroke:var(--c);stroke-width:2.5' : ''}` }, g);
      hover(cell, () => `<b>step ${u.step}: position ${u.pos}</b><br>${u.outcome === 'hit' ? 'a hit: already in the hot cache' : `a miss: fetched over the link; ${u.evicted} evicted`}<br>reuse distance <b>${u.dist}</b>${u.again === 'yes' ? '<br>also selected at the step before' : ''}`);
      if (u.outcome === 'miss') {                 // mark the entry that went out to make room
        const ey = top + u.evictedPos * rh + rh / 2 - 0.5, s = Math.min(cw, rh) * 0.26;
        el('path', { d: `M${cx - s} ${ey - s}L${cx + s} ${ey + s}M${cx + s} ${ey - s}L${cx - s} ${ey + s}`, style: `stroke:${MISS};stroke-width:2.2` }, g);
      }
    });
    // reuse distances under the columns
    const yb = top + N * rh + 15 * fs;
    if (wide) el('text', { x: L - 6, y: yb, 'text-anchor': 'end', class: 'lbl', text: 'reuse dist.' }, g);
    rows.forEach((u, i) => el('text', { x: colX(pre + i) + cw / 2, y: yb, 'text-anchor': 'middle', class: 'val', style: u.reuse === Infinity ? `fill:${MISS}` : '', text: u.dist }, g));
    D.svg.setAttribute('viewBox', `0 0 640 ${yb + 10 * fs}`);
    box.append(legend([['used before step 1 (the hot cache’s contents)', mix(OLD, 55), 'box'], ['hit', HIT, 'box'], ['miss, fetched over the link', MISS, 'box']]));
  }

  DS.define('landscape-trace', {
    rows() {
      const res = run(B);
      // reuse distance of each selection: distinct other positions used since its last use,
      // counting the initial cache's order as the uses before step 1 and the selections in list order
      const seq = [...INITIAL, ...STEPS.flat()];
      const reuse = j => { const p = seq.lastIndexOf(seq[j], j - 1); return p < 0 ? Infinity : new Set(seq.slice(p + 1, j)).size; };
      let j = INITIAL.length;
      return STEPS.flatMap((S, s) => S.map(pos => {
        const r = res[s], hit = r.hits.includes(pos), d = reuse(j++);
        const ev = hit ? null : r.evicted[r.misses.indexOf(pos)];
        return { step: s + 1, pos, outcome: hit ? 'hit' : 'miss', reuse: d, dist: dstr(d),
          again: s > 0 ? (STEPS[s - 1].includes(pos) ? 'yes' : 'no') : '–',
          evictedPos: ev, evicted: ev == null ? '' : String(ev), after: hit ? '' : r.cacheAfter.join(', ') };
      }));
    },
    columns: [
      { key: 'step', label: 'step' }, { key: 'pos', label: 'position' }, { key: 'outcome', label: 'result' },
      { key: 'dist', label: 'reuse dist.' }, { key: 'again', label: 'repeat' },
      { key: 'evicted', label: 'evicted' }, { key: 'after', label: 'cache after', left: true },
    ],
    csvColumns: ['step', 'pos'],
    highlights: {
      miss: { label: 'misses', test: r => r.outcome === 'miss' },
      again: { label: 're-selected from the step before', test: r => r.again === 'yes' },
    },
    views: {
      grid: { label: 'The trace', legend: false, draw: grid,
        note: 'One row per stored position, one column per selection. A line joins each selection to the last use of the same position; the number under a column is its reuse distance. An orange × marks the entry a miss evicted, in the miss’s column. Hover or tap a cell.' },
      dists: DS.views.categories({ key: 'dist', order: ['0', '1', '2', '3', '4', '5', '∞'], xlabel: 'reuse distance', ylabel: 'selections', noun: 'selections', label: 'Reuse distances' }),
    },
    metrics: [
      { id: 'n', label: 'selections', value: rows => rows.length, fmt: v => `${v} = 3 steps × ${K}`,
        note: `Three decode steps of one layer, ${K} picks each, out of a history of ${N} positions. Seven of the sixteen rows stay empty: in this window, nobody asks for them.` },
      { id: 'hits', label: 'hits', value: rows => rows.filter(r => r.outcome === 'hit').length, fmt: (v, rows) => `${v} of ${rows.length} · ${fmtPct(v / rows.length, 0)}`,
        note: 'Every step finds three of its four picks already on the desk. HiSparse’s measured hit rate at 4096 slots, 86.6 %, is the same story at full size.' },
      { id: 'again', label: 're-selected from the step before', value: rows => rows.filter(r => r.again === 'yes').length,
        fmt: (v, rows) => `${v} of ${rows.filter(r => r.step > 1).length}`,
        note: 'At steps 2 and 3, three of the four picks repeat a pick of the step before. That overlap, not any cleverness of the cache, is where the hits come from (III.8 names it).' },
      { id: 'misses', label: 'misses', value: rows => rows.filter(r => r.outcome === 'miss').length, fmt: v => `${v}, all first selections`,
        note: 'Every miss is a position with reuse distance ∞: 14, 11 and 15 had not been used before. Like the first request for each logbook on the storm morning, no desk could have caught them.' },
      { id: 'maxhit', label: 'largest reuse distance of a hit', value: rows => Math.max(...rows.filter(r => r.outcome === 'hit').map(r => r.reuse)),
        note: `An LRU desk of $\\vB$ slots misses exactly the selections with reuse distance $\\ge \\vB$ (II.22). Here every repeat comes back within 3 others, comfortably inside $\\vB = ${B}$.` },
      { id: 'k4', label: `hits with only $\\vk = ${K}$ slots`, value: () => sum(run(K).map(r => r.hits.length)), fmt: v => `${v} of ${STEPS.length * K}`,
        note: 'A desk that holds only the last step’s picks does just as well on these three steps. Extra slots pay off when a position sits out a step and comes back, which this short trace never does (the Lucky Louis figure of III.8 shows it).' },
      { id: 'link', label: 'link bytes, three steps', value: rows => rows.filter(r => r.outcome === 'miss').length * 640, fmt: v => `3 ${tex('\\times')} ${tex('\\ve')} = ${v.toLocaleString('en-US')} B`,
        note: 'Each miss moves one raw entry; at the reference size of 640 bytes, three misses move 1,920 bytes. The nine hits move nothing.' },
      { id: 'hbm', label: 'hot-cache memory', value: () => B * 640, fmt: v => `${B} ${tex('\\times')} ${tex('\\ve')} = ${v.toLocaleString('en-US')} B`,
        note: 'Six slots of one raw entry each, whether they hit or not. This price is paid for every layer of every request, all the time.' },
    ],
    helpers: { N, B, K, INITIAL, STEPS, resolve },
    code: `
import pandas as pd
from collections import OrderedDict

sel = pd.read_csv("{csv}")                       # columns: step, pos (one row per selection)
B, initial = 6, [1, 10, 13, 2, 5, 9]             # slots; hot cache before step 1, oldest first

cache, hits, misses = OrderedDict.fromkeys(initial), 0, 0
for step, S in sel.groupby("step")["pos"]:
    S = list(S)
    new = [p for p in S if p not in cache]
    for p in new:                                # evict the oldest entry not selected now
        if len(cache) >= B:
            cache.pop(next(v for v in cache if v not in S))
        cache[p] = None
    for p in S:
        if p not in new: cache.move_to_end(p)    # hits become the newest
    hits += len(S) - len(new); misses += len(new)
    print(step, S, "misses:", new, "cache:", list(cache))
print("hits", hits, "misses", misses, "link bytes", misses * 640, "GPU bytes", B * 640)
`,
  });
})();
