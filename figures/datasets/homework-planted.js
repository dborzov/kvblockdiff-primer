// One channel of the dress rehearsal's toy (VI.18): 32 true blocks, each with its own planted offset (spread 14),
// plus white noise (spread 20), rounded to whole codes — the first 64 tokens of each block, 2,048 values. Next to it,
// the same values shuffled across blocks: the shuffle control. Seeded ('hwb-planted'); a small slice of the recipe
// of the page's Python snippet, which uses 2,048 tokens per block and 64 channels.
(function () {
  const NB = 32, NT = 64, OFF = 14, NOISE = 20;
  // Gaussian estimate of bits per element (as in the page's snippet): ½ log2(2πe·variance)
  const bits = a => 0.5 * Math.log2(2 * Math.PI * Math.E * variance(a));
  function gain(rows, key) {
    const blocks = range(NB).map(b => rows.filter(r => r.block === b + 1).map(r => r[key]));
    const within = mean(blocks.map(a => { const m = mean(a); return bits(a.map(v => v - m)); }));
    return bits(rows.map(r => r[key])) - within;
  }
  const blockMeans = (rows, key) => range(NB).map(b => mean(rows.filter(r => r.block === b + 1).map(r => r[key])));

  const view = (key, label, note) => ({
    label,
    draw(box, ctx) {
      box.append(legend([['one value', series(0), 'dot'], ['each block’s mean (what block loc predicts)', series(1), 'line']]));
      const b = h('div'); box.append(b);
      const P = Plot(b, { x: [0, NB * NT], y: [-95, 95], h: 280, xlabel: 'token (32 blocks of 64)', ylabel: 'value (codes)', xticks: range(0, NB * NT + 1, 512),
        label: `${label}: the channel’s values and each block’s mean` });
      for (let k = 1; k < NB; k++) el('line', { x1: P.x(k * NT), x2: P.x(k * NT), y1: P.m.t, y2: P.m.t + P.ph, style: 'stroke:color-mix(in srgb, var(--rule) 45%, transparent);stroke-width:1' }, P.g.bg);
      ctx.rows.forEach((r, i) => dot(P.g.data, P.x(i + 0.5), P.y(r[key]), 1.5 * P.fs, ctx.sel && ctx.sel.test(r) ? 'var(--c)' : 'color-mix(in srgb, ' + series(0) + ' 55%, transparent)'));
      blockMeans(ctx.rows, key).forEach((m, k) => line(P, [[k * NT + 2, m], [(k + 1) * NT - 2, m]], { color: series(1), width: 2.6 }));
      box.append(h('p', { class: 'fig-note', text: note }));
    },
  });

  DS.define('homework-planted', {
    rows() {
      const r = rng('hwb-planted');
      const rows = [];
      for (let b = 1; b <= NB; b++) {
        const off = r.normal(0, OFF);
        for (let t = 0; t < NT; t++) rows.push({ block: b, t, offset: off, x: Math.round(off + r.normal(0, NOISE)) });
      }
      const sh = r.shuffle(rows.map(q => q.x));
      rows.forEach((q, i) => { q.shuffled = sh[i]; });
      return rows;
    },
    columns: [
      { key: 'block', label: 'block' }, { key: 't', label: 'token in block' },
      { key: 'offset', label: 'planted offset', fmt: v => fmt(v, 1) }, { key: 'x', label: 'value' }, { key: 'shuffled', label: 'value after shuffling' },
    ],
    csvColumns: ['block', 't', 'offset', 'x', 'shuffled'],
    views: {
      original: view('x', 'In order', 'Each block’s 64 values sit around their own planted offset; the block means (red) step up and down from block to block. That spread of the means is what a block dictionary can predict.'),
      shuffled: view('shuffled', 'Shuffled', 'The same 2,048 values, dealt at random into the blocks. Every block is now a fair sample of the whole channel, so all block means sit near zero: nothing is left for a block dictionary to predict.'),
    },
    metrics: [
      { id: 'pred', label: 'block gain the recipe predicts', value: () => 0.5 * Math.log2((OFF ** 2 + NOISE ** 2) / NOISE ** 2), fmt: v => `${fmt(v, 2)} bit per element`,
        note: 'The exchange rate: block offsets hold $14^2 = 196$ of the channel’s $196 + 400 = 596$ units of variance, and $\\tfrac12\\log_2(596/400) \\approx 0.29$.' },
      { id: 'gain', label: 'block gain, measured in order', value: rows => gain(rows, 'x'), fmt: v => `${fmt(v, 2)} bit per element`,
        note: 'Bits of the channel coded around its global mean, minus bits coded around each block’s own mean (the Gaussian estimate of the page’s snippet). Close to the prediction; 32 blocks of 64 values give a noisier estimate than the snippet’s full blocks.' },
      { id: 'shuf', label: 'block gain, measured after shuffling', value: rows => gain(rows, 'shuffled'), fmt: v => `${fmt(v, 3)} bit per element`,
        note: 'The control. With neighbours no longer neighbours the gain collapses to almost nothing; the small remainder is what block means fitted on 64 values each pick up from the noise. A gain that survived this would be a bug, not structure.' },
    ],
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("{csv}")                       # block, t, planted offset, value x, and x shuffled across blocks
bits = lambda a: 0.5 * np.log2(2 * np.pi * np.e * a.var())
def gain(col):                                 # global loc minus block loc, bits per element
    within = d.groupby("block")[col].apply(lambda a: bits(a - a.mean())).mean()
    return bits(d[col]) - within
print(f"predicted {0.5*np.log2(596/400):.2f}, in order {gain('x'):.2f}, shuffled {gain('shuffled'):.3f}")
`,
  });
})();
