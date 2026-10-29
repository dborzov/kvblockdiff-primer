/* Part V (Papers), pages V.1–V.6 and V.13 — figures of writer papers-a. See docs/figures.md.
   Builders: paHisparsePoints (V.2), paSelectors (V.3), paEscapes (V.4), paFloatRatios (V.5),
   paVideoLayout (V.6), paSlepianWolf (V.13). All data are either numbers quoted from papers
   (marked as such in tooltips) or exact/seeded toy computations; nothing is sampled at random. */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  /* ---------------------------------------------------------------- shared maths
     erfc: Numerical Recipes' Chebyshev fit (fractional error < 1.2e-7), enough for
     shares quoted to 0.01 %. mass(s, lo, hi) = P(lo <= |x| < hi) for x ~ N(0, s^2). */
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const mass = (s, lo, hi) => erfc(lo / (s * Math.SQRT2)) - (hi === Infinity ? 0 : erfc(hi / (s * Math.SQRT2)));
  const ent = ps => -ps.reduce((a, p) => a + (p > 0 ? p * Math.log2(p) : 0), 0);

  /* The toy KV exponent model of V.4: eight bell-shaped channels whose widths span `spread`
     binades (the widest at 2^0.5), plus an optional outlier channel of width 16. FP8 values are
     scaled so the widest channel's 3.9-sigma point sits at 256 (headroom to the format's maximum). */
  const FMT = {
    bf16: { label: 'BF16', expBits: 8, keep: 8, total: 16, bias: 127 },
    e5m2: { label: 'FP8 E5M2', expBits: 5, keep: 3, total: 8, bias: 15, top: 30 },
    e4m3: { label: 'FP8 E4M3', expBits: 4, keep: 4, total: 8, bias: 7, top: 15 },
  };
  function toyScales(spread, outlier) {
    const sc = range(8).map(i => 2 ** (0.5 - spread + spread * i / 7));
    if (outlier) sc.push(16);
    return sc;
  }
  const fmtScale = (fmt, sc) => (fmt === 'bf16' ? 1 : 256 / (3.9 * Math.max(...sc)));
  function exponentHist(fmt, sc) {
    const F = FMT[fmt], H = new Array(2 ** F.expBits).fill(0), scale = fmtScale(fmt, sc), w = 1 / sc.length;
    sc.forEach(s0 => {
      const s = s0 * scale;
      if (fmt === 'bf16') {
        H[0] += w * mass(s, 0, 2 ** -126);
        for (let e = -126; e <= 127; e++) H[e + 127] += w * mass(s, 2 ** e, 2 ** (e + 1));
      } else {
        H[0] += w * mass(s, 0, 2 ** (1 - F.bias));                        // zero and subnormals
        for (let f = 1; f <= F.top; f++) {
          const e = f - F.bias;
          H[f] += w * mass(s, 2 ** e, f < F.top ? 2 ** (e + 1) : Infinity); // top binade saturates
        }
      }
    });
    return H;
  }
  function fieldOf(fmt, x) {
    const F = FMT[fmt], a = Math.abs(x);
    if (fmt === 'bf16') return a < 2 ** -126 ? 0 : clamp(Math.floor(Math.log2(a)) + 127, 1, 254);
    const e = Math.floor(Math.log2(a));
    return e < 1 - F.bias ? 0 : Math.min(e + F.bias, F.top);
  }
  /* Code a histogram with a fixed n-bit code over its 2^n most frequent fields + escapes. */
  function codeStats(fmt, H, n, escBits) {
    const F = FMT[fmt];
    const order = range(H.length).sort((a, b) => H[b] - H[a]);
    const full = n >= F.expBits;
    const covered = new Set(full ? range(H.length) : order.slice(0, 2 ** n));
    const cov = full ? 1 : sum(order.slice(0, 2 ** n).map(f => H[f]));
    const eps = 1 - cov, Hx = ent(H);
    const bits = full ? F.total : F.keep + n + eps * escBits;
    return { order, covered, cov, eps, H: Hx, bits, ratio: F.total / bits, ideal: F.total / (F.keep + Hx), full };
  }

  /* ---------------------------------------------------------------- V.2 HiSparse's points
     Numbers: HiSparse §4.3 / Fig. 6 (GLM-5.1 trace, means over the first 1,000 decode steps). */
  FIG.paHisparsePoints = (host) => {
    const LRU = [[2048, 0.30], [4096, 0.134], [8192, 0.067]];
    const OTHER = [
      { name: 'FIFO', m: 0.172, color: series(1), nudge: -11 },
      { name: 'random replacement', m: 0.161, color: series(3), nudge: 11 },
      { name: 'Bélády (clairvoyant)', m: 0.082, color: series(4), nudge: 0 },
    ];
    let mode = 'all';
    const box = h('div'), ro = readout();
    host.append(
      controls(seg([['all', 'fit through all three LRU points'], ['two', 'fit through 4096 and 8192 only']], mode,
        v => { mode = v; draw(); }, 'Which points the power law is fitted through')),
      legend([['LRU', series(0), 'dot'], ['FIFO', series(1), 'dot'], ['random', series(3), 'dot'], ['Bélády', series(4), 'dot'], ['power-law fit', series(0), 'line']]),
      box, ro);
    const P = Plot(box, {
      x: [1700, 20000], xlog: 2, y: [0.02, 0.5], ylog: true, h: 340,
      xticks: [2048, 4096, 8192, 16384], xfmt: v => `${v / 1024}K`,
      yticks: [0.02, 0.05, 0.1, 0.2, 0.5], yfmt: v => fmtPct(v, 0),
      xlabel: 'hot-cache size B (slots per layer)', ylabel: 'miss rate m',
      label: 'Miss rate against hot-cache size on HiSparse’s GLM-5.1 trace',
    });
    const gx = P.x(8192);
    el('rect', { x: gx, y: P.m.t, width: P.W - P.m.r - gx, height: P.ph, style: 'fill:var(--ink);fill-opacity:.05' }, P.g.bg);
    el('text', { x: P.W - P.m.r - 6 * P.fs, y: P.m.t + 14 * P.fs, class: 'lbl', 'text-anchor': 'end', text: 'beyond the data: a guess' }, P.g.bg);

    function fit(pts) {
      const xs = pts.map(p => Math.log2(p[0])), ys = pts.map(p => Math.log2(p[1]));
      const mx = mean(xs), my = mean(ys);
      const s = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / sum(xs.map(x => (x - mx) ** 2));
      return { alpha: -s, at: B => 2 ** (my + s * (Math.log2(B) - mx)) };
    }
    const src = 'HiSparse §4.3, Fig. 6; re-checked against the abstract and summaries';
    function draw() {
      P.clear();
      const f = fit(mode === 'all' ? LRU : LRU.slice(1));
      const curve = (a, b) => linspace(Math.log2(a), Math.log2(b), 30).map(x => [2 ** x, f.at(2 ** x)]);
      line(P, curve(1700, 2048), { color: series(0), dash: '6 5', width: 2 });
      line(P, curve(2048, 8192), { color: series(0), width: 2.6 });
      line(P, curve(8192, 20000), { color: series(0), dash: '6 5', width: 2 });
      annotate(P, 2048, 0.30, 'B = k: keep only\nthe current picks', { dx: 30, dy: 4 });
      annotate(P, 4096, 0.082, 'Bélády: no policy\ncan do better', { dx: 40, dy: 22 });
      LRU.forEach(([B, m], i) => {
        const c = dot(P.g.top, P.x(B), P.y(m), 5.5 * P.fs, series(0), { tabindex: 0 });
        hover(c, () => `<b>LRU, B = ${B}</b><br>miss rate ${fmtPct(m, 1)}${i === 0 ? '<br>(with exactly k slots LRU keeps only the current picks)' : ''}<br><i>${src}</i>`);
      });
      OTHER.forEach(o => {
        const c = dot(P.g.top, P.x(4096) + o.nudge * P.fs, P.y(o.m), 5.5 * P.fs, o.color, { tabindex: 0 });
        hover(c, () => `<b>${o.name}, B = 4096</b><br>miss rate ${fmtPct(o.m, 1)}<br><i>${src}</i>`);
      });
      ro.set([
        ['fitted exponent α', fmt(f.alpha, 2)],
        ['double the cache', `misses × ${fmt(2 ** -f.alpha, 2)}`],
        ['guess at B = 16K', fmtPct(f.at(16384), 1)],
      ]);
    }
    draw();
  };

  /* ---------------------------------------------------------------- V.3 four selectors on one toy step */
  FIG.paSelectors = (host) => {
    const N = 64, K = 8, G = 4, BLK = 16;
    const r = rng('papers-a-selectors');
    const bump = (t, c, w) => Math.exp(-0.5 * ((t - c) / w) ** 2);
    const s = range(N).map(t => 0.1 + 0.12 * r() + 0.85 * bump(t, 10, 1.6) + 0.7 * bump(t, 33, 2.4) + 0.55 * bump(t, 50, 1.2) + (t >= 61 ? 0.42 : 0));
    s[22] += 0.62; s[41] += 0.5;
    const scorer = s.map(v => v + r.normal(0, 0.08));                    // DSA: a cheap separate scorer
    const topIdx = (arr, n) => range(arr.length).sort((a, b) => arr[b] - arr[a]).slice(0, n);
    const groups = fn => range(N / G).map(g => fn(s.slice(g * G, g * G + G)));
    const expand = gs => gs.flatMap(g => range(g * G, g * G + G)).sort((a, b) => a - b);
    const truth = new Set(topIdx(s, K));
    const SEL = {
      dsa: { read: topIdx(scorer, K).sort((a, b) => a - b), merged: null, what: '8 single tokens' },
      quest: { read: expand(topIdx(groups(a => Math.max(...a)), 2)), merged: null, what: '2 pages of 4 tokens (scored by their best member)' },
      nsa: { read: expand(topIdx(groups(a => mean(a)), 2)), merged: null, what: '2 blocks of 4 tokens (scored by a summary)' },
    };
    const mergedScore = groups(a => mean(a)).map(v => v + r.normal(0, 0.04));
    const csaPick = topIdx(mergedScore, 2);
    SEL.csa = { read: expand(csaPick), merged: csaPick, what: '2 merged entries (4 tokens blended into each)' };
    let mode = 'dsa';
    const box = h('div'), ro = readout();
    host.append(
      controls(seg([['dsa', 'DSA'], ['quest', 'Quest'], ['nsa', 'NSA'], ['csa', 'CSA']], mode, v => { mode = v; draw(); }, 'Selector')),
      legend([['read by attention', 'var(--c)', 'box'], ['not read', 'var(--ink-3)', 'box'], ['true top 8', 'var(--ink)', 'dot']]),
      box, ro);
    const top = Math.max(...s) * 1.18;
    const P = Plot(box, { x: [-0.8, N - 0.2], y: [0, top], h: 300, grid: 'y', xticks: [0, 16, 32, 48, 63], yn: 4, yfmt: v => fmt(v, 1),
      xlabel: 'past position (one layer)', ylabel: 'relevance (toy units)', label: 'Relevance of 64 past positions and the positions each selector reads' });
    range(N / BLK).forEach(b => {
      const x0 = P.x(b * BLK - 0.5), x1 = P.x((b + 1) * BLK - 0.5);
      el('rect', { x: x0, y: P.m.t, width: x1 - x0, height: P.ph, style: `fill:var(--ink);fill-opacity:${b % 2 ? 0.0 : 0.05}` }, P.g.bg);
      el('text', { x: (x0 + x1) / 2, y: P.m.t + 13 * P.fs, class: 'lbl', 'text-anchor': 'middle', text: `block ${b}` }, P.g.bg);
    });
    const runs = arr => arr.filter((p, i) => i === 0 || p !== arr[i - 1] + 1).length;
    function draw() {
      P.clear();
      const S = SEL[mode], read = new Set(S.read), bw = Math.max(1, P.x(0.36) - P.x(-0.36));
      range(N).forEach(t => {
        const on = read.has(t) && !S.merged;
        el('rect', { x: P.x(t) - bw / 2, y: P.y(s[t]), width: bw, height: P.y(0) - P.y(s[t]), rx: 1.5,
          style: `fill:${on ? 'var(--c)' : 'var(--ink-3)'};fill-opacity:${on ? 1 : S.merged ? 0.22 : 0.35}` }, P.g.data);
        if (truth.has(t)) dot(P.g.top, P.x(t), P.y(s[t]) - 7 * P.fs, 2.6 * P.fs, 'var(--ink)');
      });
      if (S.merged) {
        range(N / G).forEach(g => {
          const on = S.merged.includes(g), v = mean(s.slice(g * G, g * G + G));
          el('rect', { x: P.x(g * G - 0.45), y: P.y(v), width: P.x(g * G + G - 0.55) - P.x(g * G - 0.45), height: P.y(0) - P.y(v), rx: 2,
            style: `fill:${on ? 'var(--c)' : 'var(--ink-3)'};fill-opacity:${on ? 0.85 : 0.18}` }, P.g.data);
        });
      }
      const blocks = new Set(S.read.map(p => Math.floor(p / BLK))).size;
      const caught = S.read.filter(p => truth.has(p)).length;
      const captured = sum(S.read.map(p => s[p])) / sum([...truth].map(p => s[p]));
      ro.set([
        ['attention reads', S.what],
        ['16-position blocks touched', `${blocks} of ${N / BLK}`],
        ['runs of consecutive positions', String(runs(S.read))],
        ['true top 8 caught', `${caught} of 8`],
        ['relevance captured', fmtPct(captured, 0)],
      ]);
    }
    draw();
  };

  /* ---------------------------------------------------------------- V.4 SplitZip's escapes on a toy histogram */
  FIG.paEscapes = (host) => {
    const st = { fmt: 'bf16', n: 4, esc: 40, spread: 3.5, outlier: true };
    const r = rng('papers-a-escapes');
    const draws = range(32).map(() => ({ ch: r.int(9), z: r.normal(0, 1) }));   // channel 8 = the outlier
    const box = h('div'), ro = readout(), strip = h('div', { class: 'pa-strip', role: 'list', 'aria-label': 'Codewords of 32 sample numbers' });
    const escList = h('div', { class: 'pa-esc-list' });
    const tiles = {
      cov: kpi('covered by the table', '', '', series(2)),
      H: kpi('exponent entropy', '', 'bits (order 0)', series(4)),
      bits: kpi('bits per number', '', '', series(0)),
      ratio: kpi('ratio, this code', '', '', 'var(--c)'),
      ideal: kpi('ratio, ideal coder', '', 'entropy-coded exponent', series(6)),
    };
    const outBtn = btn('outlier channel', (e, b) => { st.outlier = !st.outlier; b.setAttribute('aria-pressed', String(st.outlier)); draw(); }, { pressed: true, cls: 'sm' });
    host.append(
      controls(
        seg([['bf16', 'BF16'], ['e5m2', 'FP8 E5M2'], ['e4m3', 'FP8 E4M3']], st.fmt, v => { st.fmt = v; draw(); }, 'Number format'),
        seg([[3, '3-bit code (top 8)'], [4, '4-bit code (top 16)']], st.n, v => { st.n = v; draw(); }, 'Code width'),
        seg([[24, '24 bits / escape'], [40, '40 bits / escape']], st.esc, v => { st.esc = v; draw(); }, 'Cost of one escape'),
      ),
      controls(
        slider('spread of channel widths', 0, 6, 0.5, st.spread, v => { st.spread = v; draw(); }, v => `${fmt(v, 1)} binades`),
        outBtn,
      ),
      legend([['exponent value with a codeword', series(2), 'box'], ['escaped value', series(1), 'box']]),
      box,
      h('div', { class: 'kpis' }, ...Object.values(tiles)),
      ro,
      h('div', { class: 'fig-note', text: '32 sample numbers from the same toy: exponent field, then its codeword (hex) or ESC.' }),
      strip, escList,
    );
    let P = null;
    function draw() {
      const F = FMT[st.fmt], sc = toyScales(st.spread, st.outlier), Hh = exponentHist(st.fmt, sc);
      const cs = codeStats(st.fmt, Hh, st.n, st.esc);
      const shown = range(Hh.length).filter(f => Hh[f] > 2e-5);
      const lo = Math.min(...shown), hi = Math.max(...shown), ymax = Math.max(...Hh) * 100 * 1.15;
      box.replaceChildren();
      P = Plot(box, { x: [lo - 0.8, hi + 0.8], y: [0, ymax], h: 260, grid: 'y', yn: 4, yfmt: v => fmt(v, 0) + '%',
        xticks: range(lo, hi + 1, Math.max(1, Math.ceil((hi - lo + 1) / 12))),
        xlabel: `${F.label} exponent field (raw value)`, ylabel: 'share of numbers', label: 'Histogram of exponent values with covered and escaped values' });
      const bw = Math.max(1.5, (P.x(1) - P.x(0)) * 0.78);
      range(lo, hi + 1).forEach(f => {
        const v = Hh[f] * 100, cov = cs.covered.has(f);
        const b = el('rect', { x: P.x(f) - bw / 2, y: P.y(v), width: bw, height: Math.max(0, P.y(0) - P.y(v)), rx: 1.5,
          style: `fill:${cov ? series(2) : series(1)}` }, P.g.data);
        const k = cs.order.indexOf(f);
        hover(b, () => `<b>field ${f}</b>${f === 0 ? ' (zero / subnormal)' : ''}<br>${fmt(v, 3)} % of numbers<br>${cov ? (cs.full ? 'every value has a codeword' : `codeword ${k.toString(16).toUpperCase()} (${st.n} bits)`) : 'escaped: position + raw value'}`);
      });
      tiles.cov.set(fmtPct(cs.cov, 2), cs.full ? 'every value fits' : `escape share ε = ${fmt(cs.eps, 4)}`);
      tiles.H.set(fmt(cs.H, 2));
      tiles.bits.set(fmt(cs.bits, 2), `of ${F.total}`);
      tiles.ratio.set(fmt(cs.ratio, 3) + '×', cs.ratio < 1 ? 'the data grows' : '');
      tiles.ideal.set(fmt(cs.ideal, 3) + '×');
      ro.set(cs.full
        ? `<span><b>no saving</b>a ${st.n}-bit code on a ${F.expBits}-bit exponent: ${F.total} bits stay ${F.total} (1.000×)</span>`
        : `<span><b>bits per number</b>${F.keep} (sign + mantissa, raw) + ${st.n} (code) + ${fmt(cs.eps, 4)} × ${st.esc} (escapes) = ${fmt(cs.bits, 2)}</span><span><b>ratio</b>${F.total} / ${fmt(cs.bits, 2)} = ${fmt(cs.ratio, 3)}×</span>`);
      // the stream of 32 sample numbers
      const scale = fmtScale(st.fmt, sc);
      strip.replaceChildren();
      const escs = [];
      draws.forEach((d, i) => {
        const ch = d.ch === 8 && !st.outlier ? 7 : d.ch;                  // without the outlier, reuse the widest channel
        const f = fieldOf(st.fmt, d.z * sc[ch] * scale);
        const cov = cs.covered.has(f), k = cs.order.indexOf(f);
        if (!cov) escs.push(`(${i}, ${f})`);
        strip.append(h('span', { class: 'pa-cell' + (cov ? '' : ' is-esc'), role: 'listitem', title: `number ${i}: exponent field ${f}` },
          h('b', { text: String(f) }), h('i', { text: cov ? (cs.full ? '—' : k.toString(16).toUpperCase()) : 'ESC' })));
      });
      escList.innerHTML = escs.length
        ? `<b>escape stream</b> (position, raw exponent): ${escs.join(' ')}`
        : `<b>escape stream</b>: empty for these 32 numbers — at ε = ${fmt(cs.eps, 4)} expect one escape every ${cs.eps > 0 ? fmt(1 / cs.eps, 0) : '∞'} numbers`;
    }
    draw();
  };

  /* ---------------------------------------------------------------- V.5 lossless float coders, one chart
     Ratios: SplitZip's codec comparison table (Qwen3-32B BF16 KV, 256M values); ZipNN's speed is
     from its own paper. The two "ours" rows are exact calculations with the V.4 toy model. */
  FIG.paFloatRatios = (host) => {
    const bell = codeStats('bf16', exponentHist('bf16', [1]), 4, 40).ideal;
    const mix = codeStats('bf16', exponentHist('bf16', toyScales(3.5, true)), 4, 40).ideal;
    const FAM = [['entropy-coded exponent', series(0)], ['fixed-length exponent code', series(2)], ['other float coder', series(3)], ['byte-string matching (LZ)', series(5)], ['our calculation (ideal coder, toy data)', series(6)]];
    const SRC = 'ratio: SplitZip’s comparison table';
    const ROWS = [
      { name: 'ZipNN', v: 1.515, fam: 0, how: 'Huffman, CPU', speed: 'decode 1.7 GB/s (from ZipNN’s own paper)' },
      { name: 'Falcon', v: 1.428, fam: 2, how: 'adaptive bit-planes, GPU', speed: '' },
      { name: 'DFloat11', v: 1.423, fam: 0, how: 'Huffman with small lookup tables, GPU', speed: 'decode 468.2 GB/s' },
      { name: 'SplitZip', v: 1.324, fam: 1, how: 'fixed 4-bit code + escapes, GPU', speed: 'decode 2181.8 GB/s' },
      { name: 'ZipServ', v: 1.236, fam: 1, how: 'fixed-length bitmap, GPU', speed: 'decode 1260.9 GB/s (GPU kernel)' },
      { name: 'nvCOMP LZ4', v: 1.019, fam: 3, how: 'LZ matching', speed: '' },
      { name: 'one bell curve', v: bell, fam: 4, how: 'exact: exponent entropy of one Gaussian in BF16, sign and mantissa raw', toy: true },
      { name: 'toy KV mix (V.4)', v: mix, fam: 4, how: 'exact: the default toy of the SplitZip page', toy: true },
    ];
    let mode = 'ratio';
    const box = h('div');
    host.append(
      controls(seg([['ratio', 'compression ratio'], ['bits', 'bits per BF16 number']], mode, v => { mode = v; draw(); }, 'Scale')),
      legend(FAM.map(([l, c]) => [l, c, 'box'])),
      box);
    let P = null;
    function draw() {
      box.replaceChildren();
      const bits = mode === 'bits';
      P = Plot(box, {
        ycats: ROWS.map(r => r.name), x: bits ? [9.5, 16.4] : [0.95, 1.62], h: 400, grid: 'x', m: { t: 34 },
        xfmt: v => (bits ? fmt(v, 0) : fmt(v, 1) + '×'), xn: 6,
        xlabel: bits ? 'bits per BF16 number (bars: bits saved below 16)' : 'compression ratio (original ÷ compressed)',
        label: 'Compression ratios of lossless float coders on one BF16 KV workload',
      });
      const val = r => (bits ? 16 / r.v : r.v);
      const g = bars(P, ROWS.map(val), {
        horizontal: true, base: bits ? 16 : 1, width: 22,
        colors: i => FAM[ROWS[i].fam][1],
        labels: v => (bits ? fmt(v, 2) : fmt(v, 3) + '×'),
        tip: (v, i) => { const r = ROWS[i]; return `<b>${r.name}</b><br>${r.how}<br>${fmt(r.v, 3)}× · ${fmt(16 / r.v, 2)} bits per number${r.speed ? '<br>' + r.speed : ''}<br><i>${r.toy ? 'our calculation, exact' : SRC}</i>`; },
      });
      g.bars.forEach((b, k) => { if (ROWS[k].toy) b.setAttribute('style', `fill:${series(6)};fill-opacity:.35;stroke:${series(6)};stroke-width:1.6;stroke-dasharray:4 3`); });
      const refs = bits
        ? [[16, 'raw', 0], [12, '4-bit ceiling', 1], [11.29, 'exponent ceiling', 2]]
        : [[1, 'raw', 0], [16 / 12, '4-bit ceiling', 1], [16 / 11.29, 'exponent ceiling', 2]];
      refs.forEach(([x, label, k]) => {
        const X = P.x(x), leftward = (k === 1) !== bits;
        el('line', { x1: X, x2: X, y1: P.m.t - 4 * P.fs, y2: P.H - P.m.b, style: 'stroke:var(--ink-2);stroke-dasharray:5 4' }, P.g.top);
        if (k) svgText(P.g.top, X + (leftward ? -5 : 5) * P.fs, P.m.t - 8 * P.fs, label, { class: 'lbl', 'text-anchor': leftward ? 'end' : 'start' });
      });
    }
    draw();
  };

  /* ---------------------------------------------------------------- V.6 KV-Codec's pipeline, as we read it */
  FIG.paVideoLayout = (host) => {
    const T = 8, C = 8, LAY = 3, cell = 13;
    const r = rng('papers-a-video');
    const off = range(C).map(() => r.normal(0, 1));
    const vals = range(LAY).map(l => range(T).map(t => range(C).map(c => off[c] + 0.35 * l + 0.25 * Math.sin((t + c) / 2.5) + r.normal(0, 0.18))));
    const all = vals.flat(2), lo = Math.min(...all), hi = Math.max(...all);
    const shade = v => 0.12 + 0.83 * (v - lo) / (hi - lo);
    const q = v => Math.round(3 * (v - lo) / (hi - lo)) / 3;                // 4 rounding levels
    const LC = [series(1), series(5), series(0)];                          // the three colour planes
    const D = Diagram(host, { w: 640, h: 250, label: 'KV-Codec pipeline: KV cache, rounding, frames, prediction, decoding', grow: 0.4 });
    const g = el('g', {}, D.svg);
    const fs = D.fs;
    const steps = [
      { label: 'The KV cache of a stored prefix: three layers (sheets) × 8 tokens (columns) × 8 channels (rows). Shades are values.' },
      { label: 'Round every number to a few integer levels. This is the only lossy step: what follows rebuilds the integers exactly, not the originals.' },
      { label: 'Each token becomes one small frame (its 8 channels as a 4 × 2 picture); its three layers become the frame’s three colour planes.' },
      { label: 'The video coder predicts each frame from the previous one — the previous token, token distance 1 — and from neighbouring pixels: neighbouring channels of the same token. It stores the exact residual.' },
      { label: 'Decoding runs on the GPU’s video chip, a whole chunk at a time (about 10,000 tokens). One single token cannot be decoded alone.' },
    ];
    function sheets(rounded, x0, y0) {
      for (let l = LAY - 1; l >= 0; l--) {
        const ox = x0 + l * 12, oy = y0 - l * 12;
        el('rect', { x: ox - 2, y: oy - 2, width: T * cell + 4, height: C * cell + 4, rx: 3, style: 'fill:var(--paper);stroke:var(--rule)' }, g);
        range(T).forEach(t => range(C).forEach(c => {
          const v = vals[l][t][c];
          el('rect', { x: ox + t * cell, y: oy + c * cell, width: cell - 1, height: cell - 1, style: `fill:${LC[l]};fill-opacity:${(shade(rounded ? lo + q(v) * (hi - lo) : v)).toFixed(3)}` }, g);
        }));
      }
      el('text', { x: x0 + T * cell / 2, y: y0 + C * cell + 18 * fs, class: 'lbl', 'text-anchor': 'middle', text: 'tokens →' }, g);
      el('text', { x: 0, y: 0, transform: `translate(${x0 - 9} ${y0 + C * cell / 2}) rotate(-90)`, class: 'lbl', 'text-anchor': 'middle', text: 'channels' }, g);
    }
    const FX = 250, FY = 95, fw = 4 * 9, fh = 2 * 9, gap = 10;
    function frames(hl) {
      range(T).forEach(t => {
        const x = FX + t * (fw + gap);
        for (let l = LAY - 1; l >= 0; l--) {
          const ox = x + l * 3, oy = FY - l * 3;
          el('rect', { x: ox - 1, y: oy - 1, width: fw + 2, height: fh + 2, rx: 2, style: `fill:var(--paper);stroke:${t === hl ? 'var(--c)' : 'var(--rule)'};stroke-width:${t === hl ? 2 : 1}` }, g);
          if (l === 0) range(C).forEach(c => {
            const v = vals[0][t][c];
            el('rect', { x: ox + (c % 4) * 9, y: oy + Math.floor(c / 4) * 9, width: 8, height: 8, style: `fill:${LC[0]};fill-opacity:${shade(lo + q(v) * (hi - lo)).toFixed(3)}` }, g);
          });
        }
        el('text', { x: x + fw / 2, y: FY + fh + 16 * fs, class: 'lbl', 'text-anchor': 'middle', text: `t${t}` }, g);
      });
      el('text', { x: FX, y: FY - 26 * fs, class: 'lbl', text: 'one frame per token (3 planes = 3 layers)' }, g);
    }
    stepper(host, {
      steps, label: s => s.label,
      render(i) {
        g.replaceChildren();
        sheets(i >= 1, 46, 70);
        if (i >= 1) el('text', { x: 46 + T * cell / 2 + 12, y: 34 * fs, class: 'annot', 'text-anchor': 'middle', text: i === 1 ? 'rounded: lossy' : 'rounded' }, g);
        if (i >= 2) {
          arrow(g, 46 + T * cell + 40, 120, FX - 14, 120, 'var(--ink-2)', 2);
          frames(i === 3 ? 5 : -1);
        }
        if (i === 3) {
          const xa = FX + 4 * (fw + gap) + fw / 2, xb = FX + 5 * (fw + gap) + fw / 2;
          el('path', { d: `M${xa} ${FY + fh + 24 * fs} Q${(xa + xb) / 2} ${FY + fh + 50 * fs} ${xb} ${FY + fh + 24 * fs}`, style: 'fill:none;stroke:var(--c);stroke-width:2' }, g);
          arrow(g, xb - 6, FY + fh + 30 * fs, xb, FY + fh + 24 * fs, 'var(--c)', 2);
          el('text', { x: (xa + xb) / 2, y: FY + fh + 64 * fs, class: 'annot', 'text-anchor': 'middle', text: 'from the previous token (Δ = 1)' }, g);
          el('text', { x: xb + fw / 2 + 4, y: FY - 10 * fs, class: 'annot', 'text-anchor': 'middle', text: 'and from neighbouring pixels' }, g);
        }
        if (i === 4) {
          const x0 = FX - 4, x1 = FX + T * (fw + gap) - gap + 10, y = FY + fh + 30 * fs;
          el('path', { d: `M${x0} ${y - 6} V${y} H${x1} V${y - 6}`, style: 'fill:none;stroke:var(--c);stroke-width:2' }, g);
          el('text', { x: (x0 + x1) / 2, y: y + 18 * fs, class: 'annot', 'text-anchor': 'middle', text: 'decoded together, as one video chunk' }, g);
        }
      },
    });
  };

  /* ---------------------------------------------------------------- V.13 Slepian–Wolf bins, three bits */
  FIG.paSlepianWolf = (host) => {
    const CODES = range(8).map(v => v.toString(2).padStart(3, '0'));
    const comp = x => [...x].map(b => (b === '0' ? '1' : '0')).join('');
    const binOf = x => parseInt((x[0] === '0' ? x : comp(x)).slice(1), 2);
    const BINS = range(4).map(i => { const a = '0' + i.toString(2).padStart(2, '0'); return [a, comp(a)]; });
    const dist = (a, b) => [...a].filter((c, i) => c !== b[i]).length;
    const flip = (x, bits) => [...x].map((c, i) => (bits.includes(i) ? (c === '0' ? '1' : '0') : c)).join('');
    let X = '101', rel = 'b2';
    const REL = { none: [], b1: [0], b2: [1], b3: [2], two: [0, 1] };
    const binsBox = h('div', { class: 'pa-bins' }), ro = readout(), verdict = h('div', { class: 'pa-verdict' });
    host.append(
      controls(seg(CODES.map(c => [c, `<code>${c}</code>`]), X, v => { X = v; draw(); }, 'The lower thermometer’s reading X')),
      controls(seg([['none', 'Y = X'], ['b1', 'Y: first bit flipped'], ['b2', 'Y: middle bit flipped'], ['b3', 'Y: last bit flipped'], ['two', 'two bits flipped (breaks the promise)']], rel, v => { rel = v; draw(); }, 'How the receiver’s Y differs from X')),
      binsBox, ro, verdict);
    function draw() {
      const Y = flip(X, REL[rel]), b = binOf(X), [m0, m1] = BINS[b];
      const pick = dist(m0, Y) <= dist(m1, Y) ? m0 : m1;
      binsBox.replaceChildren(...BINS.map((pair, i) => h('div', { class: 'pa-bin' + (i === b ? ' is-sent' : '') },
        h('span', { class: 'pa-bin-k', text: `bin ${i} · sent as ${i.toString(2).padStart(2, '0')}` }),
        h('span', { class: 'pa-bin-m' }, ...pair.map(m => h('code', { class: (m === X ? 'is-x ' : '') + (i === b && m === pick ? 'is-pick' : ''), text: m }))),
        i === b ? h('span', { class: 'pa-bin-d', text: `differs from Y in ${dist(pair[0], Y)} and ${dist(pair[1], Y)} bits` }) : null)));
      ro.set([['X (sender)', `<code>${X}</code>`], ['Y (receiver only)', `<code>${Y}</code>`], ['sent', `bin ${b.toString(2).padStart(2, '0')} — 2 bits, not 3`], ['receiver picks', `<code>${pick}</code>`]]);
      const ok = pick === X;
      verdict.className = 'pa-verdict ' + (ok ? 'is-ok' : 'is-bad');
      verdict.textContent = ok
        ? 'Correct: the other member of the bin differs from Y in at least two bits, so it cannot be X.'
        : 'Wrong: with two flips, the bin’s other member is closer to Y. The 2-bit price holds only while the promise (at most one flip) holds.';
    }
    draw();
  };
})();
