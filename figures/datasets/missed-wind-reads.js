// Twenty phone calls to the harbour office (VII.8): each asks for one Gull Rock wind reading (DS 'wind', II.9) at a
// random time. If the 1,024 readings are stream-coded in chunks of c, every chunk holding a wanted reading must be decoded
// whole; with II.9's 5-bit slots and escapes, each call reads one slot. One row per chunk size; expected counts, exact.
(function () {
  const K = 20, N = 1024;
  const SIZES = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
  // expected number of chunks of c readings that hold at least one of K distinct random readings
  const touched = c => { let q = 1; for (let i = 0; i < K; i++) q *= (N - c - i) / (N - i); return (N / c) * (1 - Math.max(0, q)); };
  const costs = () => {
    const w = DS.rows('wind'), eps = w.filter(r => r.kn > 30).length / w.length;
    return { H: DS.metric('wind', 'entropy'), fixed: 5 + eps * 18, eps };
  };
  const row = (rows, c) => rows.find(r => r.c === c);

  DS.define('missed-wind-reads', {
    rows() {
      const C = costs();
      return SIZES.map(c => { const t = touched(c); return { c, chunks: N / c, touched: t, decoded: t * c, stream: t * c * C.H, fixed: K * C.fixed, raw: K * 8 }; });
    },
    columns: [
      { key: 'c', label: 'readings per chunk' },
      { key: 'touched', label: 'chunks touched', fmt: v => fmt(v, 1) },
      { key: 'decoded', label: 'readings decoded', fmt: v => fmt(v, 0) },
      { key: 'stream', label: 'stream: bits read', fmt: v => fmt(v, 0) },
      { key: 'fixed', label: 'fixed-length: bits read', fmt: v => fmt(v, 0) },
    ],
    csvColumns: ['c', 'chunks', 'touched', 'decoded', 'stream', 'fixed', 'raw'],
    views: {
      reads: {
        label: 'Bits read for twenty calls',
        legend: false,
        draw(box, ctx) {
          box.append(legend([['stream-coded chunks', series(1)], ['5-bit slots with escapes (II.9)', series(0)], ['one raw byte per reading', 'var(--ink-3)', 'dash']]));
          const bx = h('div'); box.append(bx);
          const rows = ctx.rows;
          const P = Plot(bx, { x: [1, 1024], xlog: 2, y: [50, 8000], ylog: 10, h: 290, xlabel: 'readings per stream chunk c (log scale)', ylabel: 'bits read (log scale)',
            xticks: [1, 4, 16, 64, 256, 1024], yticks: [100, 1000, 5000], yfmt: v => v.toLocaleString('en-US'), label: 'Bits that twenty single-reading calls must read, against the stream chunk size' });
          line(P, rows.map(r => [r.c, r.raw]), { color: 'var(--ink-3)', width: 1.4, dash: true });
          line(P, rows.map(r => [r.c, r.fixed]), { color: series(0), width: 2.4 });
          line(P, rows.map(r => [r.c, r.stream]), { color: series(1), width: 2.4, markers: 3.2, tip: p => { const r = rows.find(q => q.c === p[0]); return `<b>chunks of ${r.c}</b><br>${fmt(r.touched, 1)} chunks touched, ${fmt(r.decoded, 0)} readings decoded<br>${fmt(r.stream, 0)} bits, against ${fmt(r.fixed, 0)} for the slots`; } });
          annotate(P, 1024, row(rows, 1024).stream, 'one chunk: decode\nthe whole archive', { dx: -40, dy: 80 });
          annotate(P, 2, row(rows, 2).stream, 'two per chunk:\nalready worse', { dx: 10, dy: -80 });
          box.append(h('p', { class: 'fig-note', text: 'Expected values for 20 calls at random times among 1,024 readings, computed exactly. The stream line ignores the table of chunk addresses, which only makes it worse.' }));
        },
      },
    },
    metrics: [
      { id: 'H', label: 'stream cost per reading', tex: '\\vH', value: () => costs().H, fmt: v => `${fmt(v, 2)} bits`,
        note: 'An entropy coder over the whole archive reaches the entropy of the wind histogram (II.9). The cheapest possible bill — if you read everything.' },
      { id: 'fixed', label: 'fixed-length cost per reading', value: () => costs().fixed, fmt: (v) => `${fmt(v, 2)} bits (5-bit slot + ${fmtPct(costs().eps, 1)} escapes at 18 bits)`,
        note: (v) => `About ${fmtPct(v / costs().H - 1, 0)} above the stream. That extra is the price of jumping straight to any reading.` },
      { id: 'c2', label: 'twenty calls, chunks of 2', value: rows => row(rows, 2).stream, fmt: (v, rows) => `${fmt(v, 0)} bits · slots: ${fmt(row(rows, 2).fixed, 0)}`,
        note: 'Already worse than the slots: each call drags one unwanted neighbour along, and two readings at 4.54 bits cost more than one at 5.54.' },
      { id: 'c32', label: 'twenty calls, chunks of 32', value: rows => row(rows, 32).stream, fmt: (v, rows) => `${fmt(v, 0)} bits · ${fmt(row(rows, 32).touched, 1)} chunks touched`,
        note: (v, rows) => `About ${fmt(v / row(rows, 32).fixed, 0)} times what the slots read: each wanted reading costs a whole chunk of neighbours.` },
      { id: 'c1024', label: 'twenty calls, one chunk for everything', value: rows => row(rows, 1024).stream, fmt: v => `${fmt(v, 0)} bits`,
        note: 'The clerk of II.9 decoding the month from the first reading, for every call — the 900-page novel read for one sentence.' },
      { id: 'c1', label: 'twenty calls, one reading per chunk', value: rows => row(rows, 1).stream, fmt: (v, rows) => `${fmt(v, 0)} bits · slots: ${fmt(row(rows, 1).fixed, 0)}`,
        note: 'Fewer bits than the slots — but each reading now needs its own entry in an address table (13 bits to point into a 4,600-bit archive), which costs far more than the bit it saves. For tiny items, addresses are what hurts.' },
    ],
    code: `
import numpy as np
from math import comb

N, K = 1024, 20                         # readings in the archive, calls
H, fixed = 4.54, 5.54                   # bits per reading: stream (entropy) and 5-bit slots with escapes (II.9)
for c in (1, 2, 32, 1024):
    touched = N / c * (1 - comb(N - c, K) / comb(N, K))    # expected chunks holding a wanted reading
    print(c, round(touched, 1), "chunks", round(touched * c * H), "bits  vs", round(K * fixed), "for the slots")
`,
  });
})();
