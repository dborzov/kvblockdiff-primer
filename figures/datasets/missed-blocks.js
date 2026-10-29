// The Gull Rock temperatures cut into blocks (VII.4): for each block size b, what a per-block dictionary that stores
// the block's mean saves (in time order and shuffled), what that dictionary costs (one reading's fixed width, shared
// by b readings) and the net. Derived: rows() reads DS.rows('missed-shuffled') and DS.metric('temp', 'width').
(function () {
  const SIZES = [2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 336, 672, 1344];
  // average squared distance of each reading from the mean of its own block of b (the last block may be shorter)
  const within = (a, b) => {
    let s = 0;
    for (let k = 0; k < a.length; k += b) { const blk = a.slice(k, k + b), m = mean(blk); blk.forEach(v => { s += (v - m) ** 2; }); }
    return s / a.length;
  };
  const span = b => (b < 48 ? `${fmt(b / 2, 1)} h` : `${fmt(b / 48, b % 48 ? 1 : 0)} day${b === 48 ? '' : 's'}`);
  const best = rows => rows.reduce((a, r) => (r.net > a.net ? r : a));
  const IN = series(0), SH = series(1);

  DS.define('missed-blocks', {
    rows() {
      const S = DS.rows('missed-shuffled'), v = S.map(r => r.v), vs = S.map(r => r.vs), V = variance(v);
      const W = DS.metric('temp', 'width');
      return SIZES.map(b => {
        const gain = 0.5 * Math.log2(V / within(v, b)), gainS = 0.5 * Math.log2(V / within(vs, b)), cost = W / b;
        return { b, span: span(b), blocks: Math.ceil(v.length / b), gain, cost, net: gain - cost, gainS, netS: gainS - cost };
      });
    },
    columns: [
      { key: 'b', label: 'block size b (readings)' },
      { key: 'span', label: 'covers', left: true },
      { key: 'blocks', label: 'blocks' },
      { key: 'gain', label: 'gain (bits)', fmt: v => fmt(v, 2) },
      { key: 'cost', label: 'dictionary cost (bits)', fmt: v => fmt(v, 3) },
      { key: 'net', label: 'net (bits)', fmt: v => fmtS(v, 2) },
      { key: 'netS', label: 'net, shuffled (bits)', fmt: v => fmtS(v, 2) },
    ],
    csvColumns: ['b', 'blocks', 'gain', 'cost', 'net', 'gainS', 'netS'],
    views: {
      knob: {
        label: 'Gain, price and net',
        legend: false,
        draw(box, ctx) {
          box.append(legend([['gain of the block mean', IN, 'dash'], ['net, after paying for the dictionary', IN], ['net on shuffled readings (the control)', SH]]));
          const bx = h('div'); box.append(bx);
          const rows = ctx.rows, B = best(rows);
          const P = Plot(bx, { x: [2, 1344], xlog: 2, y: [-1, 4.2], h: 300, xlabel: 'block size b (readings, log scale)', ylabel: 'bits per reading',
            xticks: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024], label: 'What a block-mean dictionary saves, against the block size' });
          rule(P, { y: 0, color: 'var(--ink-3)', dash: false });
          rule(P, { x: 48, label: 'one day', color: 'var(--ink-3)' });
          rule(P, { x: 1344, label: 'the whole record', color: 'var(--ink-3)' });
          line(P, rows.map(r => [r.b, r.gain]), { color: IN, width: 1.8, dash: true });
          line(P, rows.map(r => [r.b, r.netS]), { color: SH, width: 1.8, markers: 2.5, tip: p => `<b>b = ${p[0]}</b><br>shuffled net ${fmtS(p[1], 2)} bits` });
          line(P, rows.map(r => [r.b, r.net]), { color: IN, width: 2.4, markers: 3, tip: p => { const r = rows.find(q => q.b === p[0]); return `<b>b = ${r.b}</b> (${r.span})<br>gain ${fmt(r.gain, 2)} − cost ${fmt(r.cost, 2)} = <b>${fmtS(r.net, 2)}</b> bits`; } });
          el('circle', { cx: P.x(B.b), cy: P.y(B.net), r: 8 * P.fs, style: 'fill:none;stroke:var(--c);stroke-width:2.2' }, P.g.top);
          annotate(P, B.b, B.net, `best: b = ${B.b}, ${fmtS(B.net, 2)} bits`, { dx: 40, dy: -26 });
          box.append(h('p', { class: 'fig-note', text: 'Small blocks track the weather closely but pay for a mean every few readings; big blocks are cheap but their mean is stale. Past one day the daily swing is inside every block and the mean saves almost nothing.' }));
        },
      },
    },
    metrics: [
      { id: 'best', label: 'best block size', value: rows => best(rows).b, fmt: (v, rows) => `b = ${v} readings (${span(v)}), net ${fmtS(best(rows).net, 2)} bits`,
        note: (v, rows) => { const r8 = rows.find(r => r.b === 8); return `The ring on the plot. Blocks of 8 do almost as well (${fmtS(r8.net, 2)}): near its best the net is flat, so the knob is forgiving.`; } },
      { id: 'cost', label: 'price of the dictionary', value: () => DS.metric('temp', 'width'), fmt: v => `${v} bits per block, ${v}/b per reading`,
        note: 'The block mean is stored as one reading, at the fixed width of the readings (II.10). Shared by b readings, it costs $7/\\vb$ bits each: the $8\\vw/\\vb$ of the page with $\\vw = 1$ and 7-bit readings.' },
      { id: 'day', label: 'net with one block per day ($\\vb$ = 48)', value: rows => rows.find(r => r.b === 48).net, fmt: v => `${fmtS(v, 2)} bits`,
        note: 'A day-long block holds a whole warm afternoon and a whole cold night, so its mean is a poor guess for both.' },
      { id: 'whole', label: 'gain with one block for the whole record', value: rows => rows.find(r => r.b === 1344).gain, fmt: v => `${fmt(v, 2)} bits`,
        note: 'One block of 1,344 readings is the whole record, and its mean is the global mean: it saves nothing over knowing the average. The analogue of a 128K-token “block” in a 100K-token request.' },
      { id: 'shuf', label: 'best net on shuffled readings', value: rows => Math.max(...rows.map(r => r.netS)), fmt: v => `${fmtS(v, 2)} bits`,
        note: 'The control. A block mean always fits its own readings a little, even shuffled; the dictionary’s price more than cancels that advantage at every block size, so nothing here is a fitting artefact.' },
    ],
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("gull-rock-temperature-shuffled.csv")   # from the shuffle card: k, v (in order), vs (shuffled)

def gain(a, b):                       # bits per reading saved by each block's mean
    w = sum(((a[k:k + b] - a[k:k + b].mean()) ** 2).sum() for k in range(0, len(a), b)) / len(a)
    return 0.5 * np.log2(a.var() / w)

v, vs = d["v"].to_numpy(float), d["vs"].to_numpy(float)
for b in (2, 4, 8, 16, 48, 1344):
    cost = 7 / b                      # one 7-bit reading per block
    print(b, "net", round(gain(v, b) - cost, 2), " shuffled net", round(gain(vs, b) - cost, 2))
`,
  });
})();
