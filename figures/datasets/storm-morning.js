// The storm morning: the forecaster's 24 requests for 8 station logbooks, in order (II.21–II.22).
// A request trace: which logbook, when, and how far back it was last used (its reuse distance).
(function () {
  const SEQ = 'G S G H G S L G S F G S H G N G S L G S M G S R'.split(' ');
  const BOOKS = { G: 'Gull Rock', S: 'Seal Point', H: 'Harbour buoy', L: 'Lighthouse', F: 'Ferry pier', N: 'North Cape', M: 'Mill Bay', R: 'Reef' };
  const ORDER = Object.keys(BOOKS);
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const dstr = d => (d === Infinity ? '∞' : String(d));
  const reuse = seq => seq.map((id, t) => { const p = t ? seq.lastIndexOf(id, t - 1) : -1; return p < 0 ? Infinity : new Set(seq.slice(p + 1, t)).size; });
  // A desk of `slots` under 'lru', 'fifo' or 'opt' (Bélády): which requests hit.
  function sim(seq, slots, policy) {
    let desk = [];
    return seq.map((id, t) => {
      const f = desk.find(o => o.id === id);
      if (f) { f.last = t; return true; }
      if (desk.length >= slots) {
        const next = o => { const k = seq.indexOf(o.id, t + 1); return k < 0 ? Infinity : k; };
        const v = policy === 'lru' ? desk.reduce((a, b) => (b.last < a.last ? b : a)) : policy === 'fifo' ? desk.reduce((a, b) => (b.added < a.added ? b : a)) : desk.reduce((a, b) => (next(b) > next(a) ? b : a));
        desk[desk.indexOf(v)] = { id, last: t, added: t };
      } else desk.push({ id, last: t, added: t });
      return false;
    });
  }
  const misses = (rows, slots, policy) => sim(rows.map(r => r.id), slots, policy).filter(x => !x).length;

  // The trace as a grid: one row per logbook, one column per request. With withReuse, each repeat is
  // joined to the logbook's previous request, and its reuse distance is written under the column.
  function raster(box, ctx, withReuse) {
    const rows = ctx.rows, n = rows.length;
    const D = Diagram(box, { w: 640, h: 300, label: 'The morning’s requests: one row per logbook, one column per request' });
    const fs = D.fs, wide = fs < 1.3, L = wide ? 112 : 26, R = 632, cw = (R - L) / n, top = 22 * fs, rh = Math.min(26, 14 * fs + 6);
    const g = el('g', {}, D.svg), gs = el('g', {}, D.svg);
    rows.forEach((r, k) => el('text', { x: L + (k + 0.5) * cw, y: 14 * fs, 'text-anchor': 'middle', class: 'mono', style: 'fill:var(--ink-2)', text: r.id }, g));
    ORDER.forEach((id, j) => {
      const y = top + j * rh;
      el('rect', { x: L, y, width: R - L, height: rh - 2, style: `fill:${mix('var(--ink)', j % 2 ? 2 : 5)}` }, g);
      el('text', { x: L - 6, y: y + rh * 0.68, 'text-anchor': 'end', class: 'val', text: wide ? `${id} ${BOOKS[id]}` : id }, g);
    });
    const yOf = id => top + ORDER.indexOf(id) * rh;
    rows.forEach((r, k) => {
      const x = L + k * cw, y = yOf(r.id), c = ctx.hl ? (ctx.hl.test(r) ? series(1) : mix('var(--ink-3)', 55)) : series(ORDER.indexOf(r.id));
      if (withReuse && r.prev >= 0) el('line', { x1: L + (r.prev + 0.5) * cw, x2: x + cw / 2, y1: y + rh / 2 - 1, y2: y + rh / 2 - 1, style: `stroke:${mix('var(--ink-2)', 60)};stroke-width:1.5` }, g);
      const cell = el('rect', { x: x + 1.5, y: y + 1.5, width: cw - 3, height: rh - 5, rx: 3, tabindex: 0, style: `fill:${c};${ctx.sel && ctx.sel.test(r) ? 'stroke:var(--c);stroke-width:2.5' : ''}` }, g);
      hover(cell, () => {
        gs.replaceChildren();
        if (withReuse && r.prev >= 0) {
          el('rect', { x: L + (r.prev + 1) * cw, y: top, width: (k - r.prev - 1) * cw, height: ORDER.length * rh, style: `fill:${mix('var(--c)', 12)}` }, gs);
          const between = [...new Set(rows.slice(r.prev + 1, k).map(q => q.id))];
          return `<b>request ${r.k}: ${BOOKS[r.id]}</b><br>last asked for at request ${r.prev + 1}<br>in between: ${between.map(b => BOOKS[b]).join(', ') || 'nothing'}<br>reuse distance <b>${r.dist}</b>`;
        }
        return `<b>request ${r.k}: ${BOOKS[r.id]}</b>${r.prev < 0 ? '<br>first request for this logbook' : `<br>asked for before at request ${r.prev + 1}`}`;
      });
      cell.addEventListener('pointerleave', () => gs.replaceChildren());
    });
    let y = top + ORDER.length * rh + 4;
    if (withReuse) {
      if (wide) el('text', { x: L - 6, y: y + 14 * fs, 'text-anchor': 'end', class: 'lbl', text: 'reuse distance' }, g);
      rows.forEach((r, k) => el('text', { x: L + (k + 0.5) * cw, y: y + 14 * fs, 'text-anchor': 'middle', class: 'val', style: r.reuse === Infinity ? 'fill:var(--ink-3)' : '', text: r.dist }, g));
      y += 18 * fs;
    }
    el('text', { x: L, y: y + 16 * fs, class: 'lbl', text: wide || !withReuse ? 'request 1 → 24' : 'request 1 → 24, reuse distance under each' }, g);
    D.svg.setAttribute('viewBox', `0 0 640 ${y + 24 * fs}`);
  }

  DS.define('storm-morning', {
    rows() {
      const rd = reuse(SEQ), lru = sim(SEQ, 4, 'lru'), fifo = sim(SEQ, 4, 'fifo');
      return SEQ.map((id, t) => ({ k: t + 1, id, logbook: BOOKS[id], prev: t ? SEQ.lastIndexOf(id, t - 1) : -1, reuse: rd[t], dist: dstr(rd[t]), csvDist: rd[t] === Infinity ? 'inf' : rd[t], lru4: lru[t] ? 'hit' : 'miss', fifo4: fifo[t] ? 'hit' : 'miss' }));
    },
    columns: [
      { key: 'k', label: 'request' }, { key: 'id', label: 'code' }, { key: 'logbook', label: 'logbook', left: true },
      { key: 'dist', label: 'reuse distance' }, { key: 'lru4', label: 'LRU, 4 slots' }, { key: 'fifo4', label: 'FIFO, 4 slots' },
    ],
    csvColumns: ['k', 'id', 'logbook'],
    highlights: {
      first: { label: 'first requests', test: r => r.reuse === Infinity },
      lru: { label: 'LRU misses (4 slots)', test: r => r.lru4 === 'miss' },
      fifo: { label: 'FIFO misses (4 slots)', test: r => r.fifo4 === 'miss' },
      far: { label: 'reuse distance ≥ 3', test: r => r.reuse >= 3 && r.reuse < Infinity },
    },
    views: {
      raster: { label: 'The morning', legend: 'hl', draw(box, ctx) { raster(box, ctx, false); box.append(h('p', { class: 'fig-note', text: 'One row per logbook, one column per request, in order. Hover a request for when that logbook was last asked for.' })); } },
      reuse: { label: 'With reuse distances', legend: 'hl', draw(box, ctx) { raster(box, ctx, true); box.append(h('p', { class: 'fig-note', text: 'Each repeat is joined to the same logbook’s previous request. Its reuse distance counts the other rows with a request inside that stretch. Hover a request to shade the stretch.' })); } },
      counts: DS.views.categories({ key: 'id', order: ORDER, catLabel: c => c, catSeries: (c) => ORDER.indexOf(c), xlabel: 'logbook', ylabel: 'requests', noun: 'requests', label: 'Requests per logbook' }),
      dists: DS.views.categories({ key: 'dist', order: ['0', '1', '2', '3', '4', '5', '∞'], xlabel: 'reuse distance', ylabel: 'requests', noun: 'requests', label: 'Reuse distances' }),
    },
    metrics: [
      { id: 'n', label: 'requests', value: rows => rows.length, note: 'One morning of work at the harbour office, in the order the forecaster asked.' },
      { id: 'distinct', label: 'different logbooks', value: rows => new Set(rows.map(r => r.id)).size,
        note: 'So 8 first requests that must miss, whatever the desk: no cache can hold a logbook that has never been fetched.' },
      { id: 'gs', label: 'requests for Gull Rock and Seal Point', value: rows => rows.filter(r => r.id === 'G' || r.id === 'S').length, fmt: (v, rows) => `${v} of ${rows.length}`,
        note: 'Two logbooks take more than half the morning; four others appear once. Lopsided, bursty demand is what makes a small desk worth having.' },
      { id: 'lru4', label: 'misses with 4 slots: LRU', value: rows => misses(rows, 4, 'lru'), fmt: (v, rows) => `${v} of ${rows.length}`,
        note: 'The 8 unavoidable first requests plus 2: the Harbour buoy and the Lighthouse come back after being sent down.' },
      { id: 'fifo4', label: 'misses with 4 slots: FIFO', value: rows => misses(rows, 4, 'fifo'), fmt: (v, rows) => `${v} of ${rows.length}`,
        note: 'FIFO sends Gull Rock down just because it arrived first, and it is wanted again at once. Same desk, same requests, four more trips of the lift.' },
      { id: 'dist2', label: 'requests with reuse distance 2', value: rows => rows.filter(r => r.reuse === 2).length,
        note: 'The big bar of the histogram: Gull Rock and Seal Point alternating around one other logbook. A desk of 3 catches every one of them.' },
      { id: 'curve', label: 'LRU miss rate $\\vm(\\vB)$ for $\\vB$ = 1 … 6', value: rows => [1, 2, 3, 4, 5, 6].map(B => rows.filter(r => r.reuse >= B).length / rows.length),
        fmt: v => v.map(x => fmtPct(x, 0)).join(' · '), note: 'Read straight off the reuse distances: the share of requests with distance ≥ B. A cliff from 2 to 3 slots, then a slow slide to the floor of 33 % — the first requests.' },
      { id: 'belady4', label: 'misses with 4 slots: Bélády (clairvoyant)', value: rows => misses(rows, 4, 'opt'), fmt: (v, rows) => `${v} of ${rows.length}`,
        note: 'Knowing the whole morning in advance saves just one trip over LRU. On this list, a cleverer rule hardly helps; only a bigger desk does.' },
    ],
    code: `
import pandas as pd

seq = pd.read_csv("{csv}")["id"].tolist()      # columns: k, id, logbook

def reuse(seq):                                # distinct other items since the previous request
    out = []
    for t, x in enumerate(seq):
        prev = max((i for i in range(t) if seq[i] == x), default=None)
        out.append(float("inf") if prev is None else len(set(seq[prev + 1:t])))
    return out

def lru_misses(seq, slots):
    desk, miss = [], 0                         # most recently used last
    for x in seq:
        if x in desk: desk.remove(x)
        else:
            miss += 1
            if len(desk) == slots: desk.pop(0)
        desk.append(x)
    return miss

rd = reuse(seq)
print(len(seq), "requests,", len(set(seq)), "logbooks")
print("LRU misses with 4 slots:", lru_misses(seq, 4))
print("m(B):", [round(sum(d >= B for d in rd) / len(seq), 2) for B in range(1, 7)])
`,
  });
})();
