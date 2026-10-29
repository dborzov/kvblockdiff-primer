// The rehearsal set: the synthetic "KV cache" on which analysis/plan_harness.py runs its controls (IX.3, IX.5, IX.6).
// A browser twin of synthetic_kv(): the same recipe (4 evaluation + 8 calibration sequences of 8192 entries, 64 channels;
// channel c of entry t in sequence s is  mu_c + s_c * (request offset + block offset + noise), offsets and noise
// N(0, 1), true block length 2048, one channel in 16 with a large constant mean), drawn with the site's seeded rng —
// so its numbers are the recipe's, not numpy's draw: they differ from the harness's in the second decimal.
// The rows are one channel of the 4 evaluation sequences (32,768 entries); the metrics average all 64 channels.
// helpers: the E4M3 grid and rounding exactly as plan_harness.py, shared with figures/plan.js.
(function () {
  const NE = 4, NC = 8, T = 8192, D = 64, TB = 2048, BS = [256, 512, 1024, 2048, 4096];
  const SHOW = 24, OUT = 1;                 // the channel drawn (centred near zero) and an outlier channel for the table

  // ---- E4M3, exactly as analysis/plan_harness.py
  function rint(v) { const f = Math.floor(v), d = v - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1); }
  const E4 = (() => {
    const g = [0];
    for (let m = 1; m < 8; m++) g.push(m / 8 * 2 ** -6);
    for (let e = 1; e < 16; e++) for (let m = 0; m < 8; m++) g.push((1 + m / 8) * 2 ** (e - 7));
    g.pop();                                 // the NaN pattern
    return g;                                // 127 values, 0 … 448
  })();
  function e4round(x) {
    const ax = Math.min(Math.abs(x), 448);
    const e = Math.floor(Math.log2(Math.max(ax, 2 ** -6)));
    const step = 2 ** (e - 3);
    const q = Math.min(rint(ax / step) * step, 448);
    return q === 0 ? 0 : Math.sign(x) * q;
  }
  function e4index(q) {                     // q must be on the grid
    let lo = 0, hi = E4.length - 1;
    const a = Math.abs(q);
    while (lo < hi) { const mid = (lo + hi) >> 1; if (E4[mid] < a) lo = mid + 1; else hi = mid; }
    return q < 0 ? -lo : lo;
  }
  const e4value = i => Math.sign(i) * E4[Math.abs(i)];

  // ---- small statistics on integer codes
  function histBits(codes) {                // codes are integers in -255 … 255
    const c = new Int32Array(511);
    for (const v of codes) c[v + 255]++;
    let H = 0;
    for (const n of c) if (n) { const p = n / codes.length; H -= p * Math.log2(p); }
    return H;
  }
  function median(a) { const s = Float64Array.from(a).sort(); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
  /** the source's model: one Laplace bump per channel in index space, over the harness's alphabet -255 … 255 */
  function indexLaplaceBits(codes, lo = -255, hi = 255) {
    const m = Math.round(median(codes));
    let ad = 0; for (const v of codes) ad += Math.abs(v - m);
    const beta = Math.max(ad / codes.length, 0.25);
    let Z = 0; for (let v = lo; v <= hi; v++) Z += Math.exp(-Math.abs(v - m) / beta);
    let s = 0; for (const v of codes) s += Math.abs(v - m) / beta;
    return (s / codes.length + Math.log(Z)) / Math.LN2;
  }
  /** the grid-aware model: a value-domain Laplace, integrated over each code's grid cell (values[i + off] is code i) */
  function gridBits(codes, values, off) {
    const u = codes.map(i => values[i + off]);
    const m = median(u);
    let ad = 0; for (const v of u) ad += Math.abs(v - m);
    const beta = Math.max(ad / u.length, 1e-9);
    const cdf = z => (z < 0 ? 0.5 * Math.exp(z) : 1 - 0.5 * Math.exp(-z));
    const sf = z => (z < 0 ? 1 - 0.5 * Math.exp(z) : 0.5 * Math.exp(-z));
    const cost = new Map();
    let bits = 0;
    for (const i of codes) {
      if (!cost.has(i)) {
        const k = i + off;
        const lo = k === 0 ? -Infinity : (values[k - 1] + values[k]) / 2;
        const hi = k === values.length - 1 ? Infinity : (values[k] + values[k + 1]) / 2;
        const zl = (lo - m) / beta, zh = (hi - m) / beta;
        cost.set(i, -Math.log2(Math.max(zl >= 0 ? sf(zl) - sf(zh) : cdf(zh) - cdf(zl), 1e-300)));
      }
      bits += cost.get(i);
    }
    return bits / codes.length;
  }
  const E4VALS = range(-126, 127).map(e4value);

  // ---- the set itself (generated once, kept for the metrics)
  let SET = null;
  function make() {
    if (SET) return SET;
    const r = rng('plan-synth');
    const mu = range(D).map(() => r.normal(0, 0.5)), sc = range(D).map(() => r.uniform(0.5, 1.5));
    for (let c = 0; c < D / 16; c++) mu[c] = (r() < 0.5 ? -1 : 1) * r.uniform(4, 8);
    const nb = T / TB;
    // calibration: only its per-channel mean and largest magnitude are needed (global location, INT8 and E4M3 scales)
    const calSum = new Float64Array(D), calMax = new Float64Array(D);
    for (let s = 0; s < NC; s++) {
      const req = range(D).map(() => r.normal()), blk = range(nb * D).map(() => r.normal());
      for (let t = 0; t < T; t++) {
        const j = Math.floor(t / TB);
        for (let c = 0; c < D; c++) {
          const x = Math.fround(mu[c] + sc[c] * (req[c] + blk[j * D + c] + r.normal()));
          calSum[c] += x; if (Math.abs(x) > calMax[c]) calMax[c] = Math.abs(x);
        }
      }
    }
    const X = new Float32Array(NE * T * D), REQ = [], BLK = [];
    for (let s = 0; s < NE; s++) {
      const req = range(D).map(() => r.normal()), blk = range(nb * D).map(() => r.normal());
      REQ.push(req); BLK.push(blk);
      for (let t = 0; t < T; t++) {
        const j = Math.floor(t / TB);
        for (let c = 0; c < D; c++) X[(s * T + t) * D + c] = mu[c] + sc[c] * (req[c] + blk[j * D + c] + r.normal());
      }
    }
    const perm = rng('plan-synth-shuffle').shuffle(range(NE * T));      // the shuffle control: entries across all sequences
    const calMean = Array.from(calSum, v => v / (NC * T));
    const i8scale = Array.from(calMax, v => v / 127);
    const e4scale = 2 ** Math.ceil(Math.log2(Math.max(...calMax) / 448));
    SET = { mu, sc, X, REQ, BLK, perm, calMean, i8scale, e4scale };
    return SET;
  }

  /** Experiment 1a's float location gains, averaged over channels (location_gains in plan_harness.py). order: entry order */
  function gains(order) {
    const { X, calMean } = make();
    const N = NE * T, at = (k, c) => X[order[k] * D + c];
    const vg = new Float64Array(D), vr = new Float64Array(D), vb = BS.map(() => new Float64Array(D));
    for (let c = 0; c < D; c++) {
      let g = 0;
      for (let k = 0; k < N; k++) { const d = at(k, c) - calMean[c]; g += d * d; }
      vg[c] = g / N;
      const varOf = (a, b) => { let m = 0; for (let k = a; k < b; k++) m += at(k, c); m /= b - a; let v = 0; for (let k = a; k < b; k++) { const d = at(k, c) - m; v += d * d; } return v / (b - a); };
      let s = 0; for (let q = 0; q < NE; q++) s += varOf(q * T, (q + 1) * T); vr[c] = s / NE;
      BS.forEach((b, i) => { let w = 0; for (let k = 0; k < N; k += b) w += varOf(k, k + b); vb[i][c] = w / (N / b); });
    }
    const half = (a, z) => mean(Array.from(a, (v, c) => 0.5 * Math.log2(v / z[c])));
    return { req: half(vg, vr), blk: BS.map((b, i) => half(vr, vb[i])) };
  }
  const memo = {};
  const once = (k, f) => () => (k in memo ? memo[k] : (memo[k] = f()));
  const G = once('g', () => gains(range(NE * T)));
  const GS = once('gs', () => gains(make().perm));
  /** solo-coding prices of every channel's codes, averaged over the 64 channels */
  const CODES = once('codes', () => {
    const { X, i8scale, e4scale } = make(), N = NE * T;
    const out = { h8: [], l8: [], h4: [], l4: [], g4: [] };
    for (let c = 0; c < D; c++) {
      const i8 = new Array(N), e4 = new Array(N);
      for (let k = 0; k < N; k++) {
        const x = X[k * D + c];
        i8[k] = clamp(rint(x / i8scale[c]), -127, 127);
        e4[k] = e4index(e4round(x / e4scale));
      }
      out.h8.push(histBits(i8)); out.l8.push(indexLaplaceBits(i8));
      out.h4.push(histBits(e4)); out.l4.push(indexLaplaceBits(e4)); out.g4.push(gridBits(e4, E4VALS, 126));
    }
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, mean(v)]));
  });

  const fmtB = b => (b >= 1024 ? `${b / 1024}K` : String(b));
  const SEQ = k => Math.floor(k / T);
  // Sequence boundaries (solid) and true block boundaries (dotted), with the planted level as a step line.
  const frame = (key) => (P, ctx) => {
    for (let s = 1; s < NE; s++) rule(P, { x: s * T, dash: false, color: 'var(--ink-3)' });
    for (let k = TB; k < NE * T; k += TB) if (k % T) el('line', { x1: P.x(k), x2: P.x(k), y1: P.m.t, y2: P.H - P.m.b, style: 'stroke:var(--ink-3);stroke-dasharray:1 3;stroke-width:1' }, P.g.bg);
    for (let s = 0; s < NE; s++) el('text', { x: P.x(s * T + T / 2), y: P.m.t + 12 * P.fs, 'text-anchor': 'middle', class: 'lbl', text: `sequence ${s + 1}` }, P.g.top);
    const pts = ctx.rows.map(r => [r.k, r[key]]);
    line(P, pts, { color: series(1), width: 2.2, curve: key === 'lvl' ? 'step' : undefined });
  };
  const tlOpts = {
    x: 'k', xlabel: 'entry, sequence after sequence', ylabel: 'value (scaled units)', xdomain: [0, NE * T], ydomain: [-6.5, 6.5], zero: false, width: 0.6,
    xticks: range(0, NE * T + 1, T / 2), xtfmt: v => (v % T ? '' : `${v / 1024}K`), xfmt: v => { const k = Math.round(v), s = SEQ(k); return `sequence ${s + 1}, entry ${k - s * T}`; }, yfmt: v => fmt(v, 2), h: 270,
    highlights: [], legend: false,
  };

  DS.define('plan-synth', {
    helpers: { E4, rint, e4round, e4index, e4value, histBits, indexLaplaceBits, gridBits, median },
    rows() {
      const { X, mu, sc, REQ, BLK, perm, i8scale, e4scale } = make();
      const lvlOf = k => { const s = SEQ(k), j = Math.floor((k % T) / TB); return mu[SHOW] + sc[SHOW] * (REQ[s][SHOW] + BLK[s][j * D + SHOW]); };
      return range(NE * T).map(k => {
        const x = X[k * D + SHOW], s = SEQ(k), t = k - s * T;
        return {
          k, seq: s + 1, t, blk: Math.floor(t / TB) + 1, lvl: lvlOf(k), x,
          i8: clamp(rint(x / i8scale[SHOW]), -127, 127), e4: e4index(e4round(x / e4scale)),
          out: X[k * D + OUT], xs: X[perm[k] * D + SHOW], lvls: lvlOf(perm[k]),
        };
      });
    },
    columns: [
      { key: 'seq', label: 'sequence' },
      { key: 't', label: 'entry' },
      { key: 'blk', label: 'true block' },
      { key: 'lvl', label: 'planted level', fmt: v => fmt(v, 3) },
      { key: 'x', label: `channel ${SHOW}`, fmt: v => fmt(v, 3) },
      { key: 'i8', label: 'INT8 code' },
      { key: 'e4', label: 'E4M3 index' },
      { key: 'out', label: `channel ${OUT} (outlier)`, fmt: v => fmt(v, 3) },
    ],
    csvColumns: ['seq', 't', 'x', 'i8', 'e4', 'out'],
    highlights: {
      nearzero: { label: 'values within ±0.25 of zero', test: r => Math.abs(r.x) < 0.25 },
    },
    views: {
      sequences: DS.views.timeline(Object.assign({}, tlOpts, { y: 'x', label: 'Four sequences', after: frame('lvl'),
        note: `Channel ${SHOW} of the four evaluation sequences, entry after entry (grey), with the planted level — mean, request offset and block offset — as a step line (vermilion). Solid lines separate the sequences, dotted lines the true blocks of 2,048 entries. Drag across the plot to select a stretch.` })),
      shuffled: DS.views.timeline(Object.assign({}, tlOpts, { y: 'xs', label: 'Shuffled', after: frame('lvls'),
        note: 'The same 32,768 entries after the shuffle control: permuted across all four sequences, each entry intact. The planted level (vermilion) now jumps at every entry. No block and no sequence has anything of its own left.' })),
      codes: DS.views.histogram({ key: 'e4', bin: 1, xlabel: 'E4M3 index of the code', ylabel: 'entries', noun: 'entries', label: 'E4M3 codes', h: 260 }),
      int8: DS.views.histogram({ key: 'i8', bin: 1, xlabel: 'INT8 code', ylabel: 'entries', noun: 'entries', label: 'INT8 codes', h: 260 }),
    },
    metrics: [
      { id: 'shape', label: 'sequences × entries × channels', value: () => [NE, T, D], fmt: v => `${v[0]} × ${fmt(v[1])} × ${v[2]}`,
        note: `The evaluation set; ${NC} more sequences, kept apart, are the calibration set on which every global dictionary is fit. The plot and the table show one channel (channel ${SHOW}); the numbers below average all 64.` },
      { id: 'recipe', label: `channel ${SHOW}: centre $\\vmu$ and scale`, value: () => [make().mu[SHOW], make().sc[SHOW]], fmt: v => `μ = ${fmt(v[0], 2)}, scale ${fmt(v[1], 2)}`,
        note: 'Every value is centre + scale × (request offset + block offset + noise), each part with variance 1. So a third of each channel\'s spread is shared by a whole sequence, a third by a true block, and a third is noise that nothing can predict.' },
      { id: 'outlier', label: `channel ${OUT}: an outlier channel`, value: () => [make().mu[OUT], make().sc[OUT]], fmt: v => `μ = ${fmt(v[0], 2)}, scale ${fmt(v[1], 2)}`,
        note: 'Four channels in 64 sit far from zero, like the outlier channels of keys before RoPE. Their big constant is the cheapest thing in the set to predict: any location absorbs it.' },
      { id: 'gainreq', label: 'float location gain, request over global', tex: '\\vgainreq', value: () => G().req, fmt: v => `${fmt(v, 3)} bit`,
        note: v => `Experiment 1a's yardstick, averaged over the 64 channels of this draw. The harness's own (numpy) draw of the recipe gives 0.407. Both sit above the textbook 0.29 bit: with four sequences, a request's own location also soaks up a quarter of the block offsets and the calibration gap.` },
      { id: 'gainblk', label: 'float location gain, block over request, by $\\vb$', tex: '\\vgainblk', value: () => G().blk, fmt: v => BS.map((b, i) => `${fmtB(b)}: ${fmt(v[i], 3)}`).join(' · '),
        note: 'Level up to the planted 2,048, then it collapses: a block of 4,096 straddles two true blocks and fits neither. The numpy draw gives 0.368–0.370, then 0.114. The knee is the planted block length.' },
      { id: 'shufreq', label: 'request gain after the shuffle', value: () => GS().req, fmt: v => `${fmt(v, 3)} bit`,
        note: 'Not zero. After the shuffle each "request" is a sample of the whole pool, and the pool differs from the calibration data: a calibration gap, not structure (numpy draw: 0.105).' },
      { id: 'shufblk', label: 'block gains after the shuffle', value: () => GS().blk, fmt: v => BS.map((b, i) => `${fmtB(b)}: ${fmt(v[i], 3)}`).join(' · '),
        note: 'Zero to the third decimal at every block size. A block gain that survived here would be a bug or a fit to noise.' },
      { id: 'h4', label: 'E4M3 codes: their own histogram', value: () => CODES().h4, fmt: v => `${fmt(v, 2)} bits`,
        note: 'The order-0 entropy of each channel\'s E4M3 codes, averaged over the channels: the floor for coding them one at a time with a perfect table (the harness: 6.128).' },
      { id: 'l4', label: 'E4M3 codes: one Laplace bump in index space', value: () => CODES().l4, fmt: v => `${fmt(v, 2)} bits`,
        note: 'The source\'s model, fit here on the codes themselves. More than 8 bits — worse than storing the raw byte — because a zero-centred channel\'s codes form two humps, and one bump between them puts its peak in the hollow (the harness, fit on calibration data: 8.375).' },
      { id: 'g4', label: 'E4M3 codes: the grid-aware model', value: () => CODES().g4, fmt: v => `${fmt(v, 2)} bits`,
        note: 'One Laplace bump over the values, priced over each code\'s grid cell. A quarter of a bit above the histogram, and sane again (the harness: 6.367).' },
      { id: 'h8', label: 'INT8 codes: their own histogram', value: () => CODES().h8, fmt: v => `${fmt(v, 2)} bits`,
        note: 'On the uniform grid each channel\'s codes form one bell (the harness: 6.836).' },
      { id: 'l8', label: 'INT8 codes: one Laplace bump in index space', value: () => CODES().l8, fmt: v => `${fmt(v, 2)} bits`,
        note: 'Here the source\'s model is fine: one bell, one bump (the harness: 7.074).' },
    ],
    numbersNote: 'Computed in your browser from this draw of the recipe (all 64 channels, a second or so). The harness draws the same recipe with numpy; its numbers, quoted on the pages, differ in the second decimal.',
    code: `
import numpy as np, pandas as pd

S = pd.read_csv("{csv}")          # one channel of the 4 evaluation sequences: seq, t, x, i8, e4, out
x = S["x"].to_numpy().reshape(4, 8192)

def H(v):                         # order-0 entropy, bits per code
    _, c = np.unique(v, return_counts=True); p = c / c.sum()
    return -(p * np.log2(p)).sum()

var_req = x.var(axis=1).mean()                                    # around each sequence's own location
for b in (256, 512, 1024, 2048, 4096):
    var_blk = x.reshape(4, 8192 // b, b).var(axis=2).mean()       # around each block's own location
    print(b, "block gain of this channel:", round(0.5 * np.log2(var_req / var_blk), 3))

flat = x.ravel()[np.random.default_rng(0).permutation(x.size)].reshape(4, 8192)   # the shuffle control
print("after the shuffle, b=2048:", round(0.5 * np.log2(flat.var(axis=1).mean()
      / flat.reshape(4, 4, 2048).var(axis=2).mean()), 3))
print("order-0 entropy: INT8", round(H(S["i8"]), 2), " E4M3", round(H(S["e4"]), 2))
# (one channel only; the Numbers tab averages all 64 — the global gain also needs the calibration set)
`,
  });
})();
