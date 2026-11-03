/* =====================================================================
   figures/plan.js — Parts IV, V and X (the scenario, the toolbox, the plan). See docs/figures.md.
   Builders: planDecodeAlone (V.3), planBill (V.1), planControlsRun (V.14),
   planGpuFit, planE4m3, planHumps (V.10), planDistance,
   planLadderGrid, planTimeline, planDecision (spare, the old wave-1 rule),
   planSelections (X.5), planReplaySweep (X.6), planQueue (X.4), planFrontier,
   planRisks (spare, the old register).
   Harness numbers come from analysis/plan_harness.py → figures/data/plan-harness.json.
   Everything else is computed here, from seeded generators or closed formulas.
   ===================================================================== */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------------ shared helpers
  const pow2 = v => 2 ** v;
  const fmtB = b => (b >= 1024 ? `${b / 1024}K` : `${b}`);

  /** round half to even (numpy's rint) */
  function rint(v) {
    const f = Math.floor(v), d = v - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }

  // ---- E4M3, exactly as analysis/plan_harness.py
  const E4 = (() => {
    const g = [0];
    for (let m = 1; m < 8; m++) g.push(m / 8 * 2 ** -6);
    for (let e = 1; e < 16; e++) for (let m = 0; m < 8; m++) g.push((1 + m / 8) * 2 ** (e - 7));
    g.pop();                                   // the NaN pattern
    return g;                                  // 127 values, 0 … 448
  })();
  function e4round(x) {
    const ax = Math.min(Math.abs(x), 448);
    const e = Math.floor(Math.log2(Math.max(ax, 2 ** -6)));
    const step = 2 ** (e - 3);
    const q = Math.min(rint(ax / step) * step, 448);
    return q === 0 ? 0 : Math.sign(x) * q;
  }
  function e4index(q) {                       // q must be on the grid
    let lo = 0, hi = E4.length - 1;
    const a = Math.abs(q);
    while (lo < hi) { const mid = (lo + hi) >> 1; if (E4[mid] < a) lo = mid + 1; else hi = mid; }
    return q < 0 ? -lo : lo;
  }
  const e4value = i => Math.sign(i) * E4[Math.abs(i)];

  // ---- small statistics
  function histEntropy(codes) {
    const c = new Map();
    codes.forEach(v => c.set(v, (c.get(v) || 0) + 1));
    let H = 0;
    c.forEach(n => { const p = n / codes.length; H -= p * Math.log2(p); });
    return H;
  }
  function median(a) { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
  /** cross-entropy (bits) of integer codes under a Laplace in index space over the alphabet [lo, hi] */
  function laplaceIndexBits(codes, lo, hi) {
    const m = Math.round(median(codes));
    const beta = Math.max(mean(codes.map(v => Math.abs(v - m))), 0.25);
    let Z = 0;
    for (let v = lo; v <= hi; v++) Z += Math.exp(-Math.abs(v - m) / beta);
    return { m, beta, bits: mean(codes.map(v => (Math.abs(v - m) / beta + Math.log(Z)) / Math.LN2)), Z };
  }
  /** cross-entropy (bits) under a value-domain Laplace integrated over each code's grid cell */
  function gridBits(codes, values, off) {
    const u = codes.map(i => values[i + off]);
    const m = median(u), beta = Math.max(mean(u.map(v => Math.abs(v - m))), 1e-9);
    const cdf = z => (z < 0 ? 0.5 * Math.exp(z) : 1 - 0.5 * Math.exp(-z));
    const sf = z => (z < 0 ? 1 - 0.5 * Math.exp(z) : 0.5 * Math.exp(-z));
    let bits = 0;
    codes.forEach(i => {
      const k = i + off;
      const lo = k === 0 ? -Infinity : (values[k - 1] + values[k]) / 2;
      const hi = k === values.length - 1 ? Infinity : (values[k] + values[k + 1]) / 2;
      const zl = (lo - m) / beta, zh = (hi - m) / beta;
      const p = zl >= 0 ? sf(zl) - sf(zh) : cdf(zh) - cdf(zl);
      bits -= Math.log2(Math.max(p, 1e-300));
    });
    return bits / codes.length;
  }

  // ---- the synthetic indexer trace shared by X.5 and X.6 (a JS twin of test_wave2); TR.b is the stretch length
  const TR = { n: 4096, b: 256, dk: 16, k: 128, steps: 300, heads: 4 };
  const traceCache = new Map();
  function makeTrace(strength, drift, seed = 'plan-trace') {
    const key = `${strength}|${drift}|${seed}`;
    if (!traceCache.has(key)) traceCache.set(key, buildTrace(strength, drift, seed));
    return traceCache.get(key);
  }
  function buildTrace(strength, drift, seed) {
    const r = rng(seed);
    const nb = TR.n / TR.b;
    const topics = range(nb).map(() => range(TR.dk).map(() => r.normal()));
    const K = new Float64Array(TR.n * TR.dk);
    for (let p = 0; p < TR.n; p++) {
      const t = topics[Math.floor(p / TR.b)];
      for (let c = 0; c < TR.dk; c++) K[p * TR.dk + c] = strength * t[c] + r.normal();
    }
    let q = range(TR.heads).map(() => range(TR.dk).map(() => r.normal()));
    const sel = [];
    const score = new Float64Array(TR.n), prob = new Float64Array(TR.n);
    const sq = Math.sqrt(TR.dk);
    for (let s = 0; s < TR.steps; s++) {
      q = q.map(v => v.map(x => x + drift * r.normal()));
      prob.fill(0);
      for (const qh of q) {                       // softmax per head, summed over heads
        let mx = -Infinity;
        for (let p = 0; p < TR.n; p++) {
          let a = 0;
          for (let c = 0; c < TR.dk; c++) a += qh[c] * K[p * TR.dk + c];
          score[p] = a / sq;
          if (score[p] > mx) mx = score[p];
        }
        let Z = 0;
        for (let p = 0; p < TR.n; p++) { score[p] = Math.exp(score[p] - mx); Z += score[p]; }
        for (let p = 0; p < TR.n; p++) prob[p] += score[p] / Z;
      }
      const idx = Array.from(range(TR.n));
      idx.sort((a, b) => prob[b] - prob[a]);
      sel.push(idx.slice(0, TR.k));
    }
    return sel;
  }
  /** token LRU + dictionary LRU, as replay() in analysis/plan_harness.py */
  function replay(selections, B, b, nD, policy) {
    const cache = new Map(), dcache = new Map();   // Map keeps insertion order: first = least recent
    let misses = 0, total = 0, dmisses = 0, loads = 0;
    const touch = (m, key) => { m.delete(key); m.set(key, null); };
    for (const Sarr of selections) {
      const S = new Set(Sarr);
      const fresh = Sarr.filter(p => !cache.has(p));
      Sarr.forEach(p => { if (cache.has(p)) touch(cache, p); });
      for (const p of fresh) {
        if (cache.size >= B) { for (const v of cache.keys()) { if (!S.has(v)) { cache.delete(v); break; } } }
        cache.set(p, null);
        const j = Math.floor(p / b);
        if (dcache.has(j)) { dmisses++; touch(dcache, j); }
      }
      let wanted;
      if (policy === 'heaviest') {
        const cnt = new Map();
        for (const p of cache.keys()) { const j = Math.floor(p / b); cnt.set(j, (cnt.get(j) || 0) + 1); }
        wanted = [...cnt.entries()].sort((a, c) => c[1] - a[1]).slice(0, nD).map(e => e[0]);
      } else wanted = [...new Set(fresh.map(p => Math.floor(p / b)))];
      for (const j of wanted) {
        if (dcache.has(j)) { touch(dcache, j); continue; }
        loads++;
        if (dcache.size >= nD) dcache.delete(dcache.keys().next().value);
        dcache.set(j, null);
      }
      misses += fresh.length; total += Sarr.length;
    }
    return { m: misses / total, fD: dmisses / Math.max(misses, 1), nload: loads / selections.length };
  }

  /* =================================================================
     V.3 — planDecodeAlone: a furrow-statistics dictionary, and one cherry decoded alone
     ================================================================= */
  FIG.planDecodeAlone = (host) => {
    const r = rng('plan-decode');
    const centres = [40, -12, 3, 97, -55], spread = [3, 2, 4, 2, 3];
    const X = range(6).map(() => centres.map((c, j) => Math.round(c + spread[j] * r.normal())));
    const D = centres.map((_, j) => Math.round(median(X.map(row => row[j]))));
    const R = X.map(row => row.map((v, j) => v - D[j]));
    const width = range(5).map(j => Math.max(1, Math.ceil(Math.log2(2 * Math.max(...R.map(row => Math.abs(row[j]))) + 1))));
    let sel = 2;
    const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
    const grid = h('div', { class: 'pl-da' });
    const ro = readout();
    host.append(h('p', { class: 'fig-note', text: 'Click a cherry (a row) to decode it alone.' }), grid, ro);

    function tableOf(title, rows, opts) {
      const t = h('div', { class: 'pl-da-t' + (opts.cls ? ' ' + opts.cls : '') });
      t.append(h('div', { class: 'pl-da-h', html: title }));
      const body = h('div', { class: 'pl-da-body', style: `grid-template-columns: auto repeat(5, minmax(2.4rem, 1fr))` });
      body.append(h('span', { class: 'pl-da-c pl-da-k' }, ''), ...range(5).map(j => h('span', { class: 'pl-da-c pl-da-k', html: `e${j}` })));
      rows.forEach((row, i) => {
        const on = opts.isOn(i), used = opts.isUsed(i);
        body.append(h('span', { class: 'pl-da-c pl-da-k', text: opts.rowName(i) }));
        row.forEach(v => body.append(h('button', {
          type: 'button', class: 'pl-da-c pl-da-v' + (on ? ' on' : '') + (used ? ' used' : '') + (opts.dim && !used ? ' dim' : ''),
          'aria-label': `${opts.rowName(i)}`, text: opts.show(v), onclick: opts.click ? () => opts.click(i) : null,
        })));
      });
      t.append(body);
      return t;
    }
    function draw() {
      grid.replaceChildren(
        tableOf('the punnet <small>(8-bit codes)</small>', X, { rowName: i => `cherry ${i}`, show: v => sgn(v), isOn: i => i === sel, isUsed: () => false, click: i => { sel = i; draw(); } }),
        tableOf(tex('\\vD') + ' <small>(one per punnet)</small>', [D], { rowName: () => 'location', show: v => sgn(v), isOn: () => false, isUsed: () => true, cls: 'pl-da-dict' }),
        tableOf('the deltas <small>(residuals)</small>', R, { rowName: i => `δ ${i}`, show: v => sgn(v), isOn: () => false, isUsed: i => i === sel, dim: true, click: i => { sel = i; draw(); } }),
      );
      const rebuilt = R[sel].map((v, j) => v + D[j]);
      const ok = rebuilt.every((v, j) => v === X[sel][j]);
      const dBits = width.reduce((a, b) => a + b, 0);
      ro.set([
        [`cherry ${sel} rebuilt`, `${rebuilt.map(sgn).join(', ')} ${ok ? '— bit for bit ✓' : '✗'}`],
        ['read from memory', `${tex('\\vD')} + δ ${sel} only (the other ${X.length - 1} deltas untouched)`],
        ['delta size', `${dBits} bits (widths ${width.join('+')}) vs ${5 * 8} bits raw`],
      ]);
    }
    draw();
  };

  /* =================================================================
     V.1 — planBill: residual + per-cherry tax + dictionary share, per type
     ================================================================= */
  FIG.planBill = (host) => {
    const d = 512;                           // elements per cherry: the Bench's one-token-one-layer cherry v[t, l, :, :]
    const SET = 3;                           // compressor settings, bytes per furrow (centre, scale, width)
    const types = [
      { id: 'loc', name: 'furrow statistics', w: 1 + SET, side: () => 0, sideTxt: 'none' },
      { id: 'klt', name: 'KLT, rank 16', w: 32 + SET, side: () => 16 * 8 / d, sideTxt: '16 coefficients × 8 bits per cherry (assumed width)' },
      { id: 'vq', name: 'VQ, 256 × 32-dim', w: 256 + SET, side: () => 8 / 32, sideTxt: 'one 8-bit index per 32 elements (16 sub-codebooks)' },
      { id: 'sib', name: 'sibling', w: SET, side: b => Math.log2(b) / d, sideTxt: 'a log₂ b-bit pointer per cherry' },
    ];
    let lb = 11, res = 6.3;
    const rows = h('div', { class: 'pl-bill' });
    const ro = readout();
    host.append(
      controls(
        slider(texify('punnet size $\\vb$'), 8, 15, 1, lb, v => { lb = v; draw(); }, v => `${fmtB(pow2(v))} cherries`),
        slider('residual (assumed)', 3, 8, 0.1, res, v => { res = v; draw(); }, v => `${fmt(v, 1)} bits`),
      ),
      legend([['residual', series(0), 'box'], ['per-cherry tax', series(1), 'box'], [texify('dictionary share $8\\vw/\\vb$'), series(3), 'box'], ['raw = 8 bits', 'var(--ink-2)', 'dash']]),
      rows, ro,
    );
    const MAX = 12;
    function draw() {
      const b = pow2(lb);
      rows.replaceChildren();
      const out = [];
      types.forEach(t => {
        const side = t.side(b), share = 8 * t.w / b, tot = res + side + share;
        out.push([t.name, tot]);
        const seg = (v, c, label) => h('span', { class: 'pl-bill-seg', style: `width:${Math.min(100, 100 * v / MAX)}%;background:${c}`, title: `${label}: ${fmt(v, 3)} bits` });
        const track = h('span', { class: 'pl-bill-track' }, seg(res, series(0), 'residual'), seg(side, series(1), 'per-cherry tax'), seg(share, series(3), 'dictionary share'),
          h('span', { class: 'pl-bill-raw', style: `left:${100 * 8 / MAX}%` }));
        const row = h('div', { class: 'pl-bill-row' }, h('span', { class: 'pl-bill-name', text: t.name }), track,
          h('span', { class: 'pl-bill-tot' + (tot >= 8 ? ' bad' : ''), text: tot > MAX ? `${fmt(tot, 1)} ▸` : fmt(tot, 2) }));
        hover(row, () => `<b>${t.name}</b> at b = ${fmtB(b)}<br>residual ${fmt(res, 2)} bits<br>per-cherry tax ${fmt(side, 3)} bits <i>(${t.sideTxt})</i><br>dictionary ${fmt(t.w, 0)} cherries' worth → ${fmt(share, 3)} bits<br><b>total ${fmt(tot, 2)} bpe</b>`);
        rows.append(row);
      });
      const best = out.reduce((a, c) => (c[1] < a[1] ? c : a));
      ro.set([['punnet', `${fmtB(b)} cherries`], ['cheapest bill', `${best[0]}: ${fmt(best[1], 2)} bpe`], ['VQ dictionary share', `${fmt(8 * 259 / b, 2)} bits`]]);
    }
    draw();
  };

  /* =================================================================
     V.14 — planControlsRun: the harness on the synthetic set, with the shuffle
     ================================================================= */
  FIG.planControlsRun = async (host) => {
    const res = await fetch(KV.prefix + 'assets/figs/data/plan-harness.json');
    if (!res.ok) throw new Error('plan-harness.json: HTTP ' + res.status);
    const J = await res.json();
    let fmtSel = 'int8', rate = 'entropy', show = 'both';
    const box = h('div'), ro = readout();
    host.append(controls(
      seg([['int8', 'INT8'], ['e4m3', 'E4M3']], fmtSel, v => { fmtSel = v; draw(); }, 'number format'),
      seg([['entropy', 'entropy rate'], ['fixed', 'fixed-length rate']], rate, v => { rate = v; draw(); }, 'rate'),
      seg([['orig', 'original'], ['shuf', 'shuffled'], ['both', 'both']], show, v => { show = v; draw(); }, 'data'),
    ), legend([['stretch scope, original', series(0), 'line'], ['stretch scope, shuffled', series(1), 'dash'], ['global scope', series(2), 'dash'], ['sequence scope', series(4), 'dot']]), box, ro);
    const T = J.synthetic.T, bs = J.bs;
    const P = Plot(box, { x: [200, T * 1.25], xlog: 2, y: [5, 9], h: 340, xlabel: 'stretch length b (cherries)', ylabel: 'bits per element (bpe)', xticks: [256, 512, 1024, 2048, 4096, 8192], xfmt: v => (v === T ? `${fmtB(v)} (all)` : fmtB(v)), label: 'bits per element against stretch length, synthetic data' });
    function draw() {
      const L = J.ladder[fmtSel]['loc+flag'], i = rate === 'entropy' ? 0 : 1;
      const vals = [];
      ['orig', 'shuf'].forEach(t => { vals.push(L[t].global[i], L[t].request[i], ...bs.map(b => L[t].block[b][i])); });
      vals.push(J.solo[fmtSel][rate]);
      const lo = Math.min(...vals), hi = Math.max(...vals);
      P.domain({ y: [Math.floor((lo - 0.15) * 4) / 4, Math.ceil((hi + 0.15) * 4) / 4] });
      P.clear();
      rule(P, { x: J.synthetic.true_b, label: 'true stretch length', dash: '2 4' });
      rule(P, { y: J.solo[fmtSel][rate], label: `solo (global): ${fmt(J.solo[fmtSel][rate], 2)}`, color: 'var(--ink-3)' });
      const tags = show === 'both' ? ['orig', 'shuf'] : [show];
      tags.forEach(t => {
        const c = t === 'orig' ? series(0) : series(1);
        const pts = bs.map(b => [b, L[t].block[b][i]]).concat([[T, L[t].request[i]]]);
        line(P, pts, { color: c, dash: t === 'shuf' ? '6 5' : false, markers: 4, tip: ([b, v]) => `<b>${t === 'orig' ? 'original' : 'shuffled'}</b>, ${b === T ? 'sequence scope (the whole sequence)' : 'stretch of ' + fmtB(b)}<br>${fmt(v, 3)} bpe` });
        line(P, [[200, L[t].global[i]], [T * 1.25, L[t].global[i]]], { color: series(2), dash: t === 'shuf' ? '2 4' : '7 4', width: 1.6 });
        const ry = L[t].request[i];
        dot(P.g.top, P.x(T), P.y(ry), 6 * P.fs, series(4));
      });
      const g = J.gains[fmtSel]['loc+flag'];
      const f = k => `${fmtS(g.orig[rate][k], 3)} → <b>${fmtS(g.shuf[rate][k], 3)}</b>`;
      ro.set([
        [tex('\\vgainseq') + ' original → shuffled', f('gainreq')],
        [tex('\\vgainstr') + ' original → shuffled', f('gainblk')],
        ['best stretch, original', `b = ${fmtB(g.orig[rate].best_b)}, ${fmt(g.orig[rate].bpe_best, 3)} bpe`],
      ]);
    }
    draw();
  };

  /* =================================================================
     (spare) — planGpuFit: does the dump fit a 16 GB GPU?
     ================================================================= */
  FIG.planGpuFit = (host) => {
    const models = {
      a: { name: 'Qwen3.5-2B (6 full-attention layers)', wGB: 4.0, perTok: 6 * 1024 * 2 },
      b: { name: 'Qwen3-1.7B (28 layers, replication)', wGB: 3.4, perTok: 28 * 2048 * 2 },
    };
    const WORK = 1.0, CAP = 16;
    let mk = 'a', lc = 15;
    const bar = h('div', { class: 'pl-gpu' });
    const tiles = { kv: kpi('KV in BF16', '', '', series(1)), tot: kpi('total', '', '', series(0)), room: kpi('headroom', '', 'of 16 GB') };
    host.append(controls(
      seg([['a', 'Qwen3.5-2B'], ['b', 'Qwen3-1.7B']], mk, v => { mk = v; draw(); }, 'the LLM'),
      slider('context dumped', 12, 17, 1, lc, v => { lc = v; draw(); }, v => `${fmtB(pow2(v))} tokens`),
    ), legend([['weights (BF16)', series(0), 'box'], ['the orchard (BF16)', series(1), 'box'], ['working memory (assumed)', series(5), 'box'], ['16 GB', 'var(--bad)', 'dash']]), bar, h('div', { class: 'kpis' }, tiles.kv, tiles.tot, tiles.room));
    function draw() {
      const M = models[mk], L = pow2(lc);
      const kv = M.perTok * L / 1e9, tot = M.wGB + kv + WORK, MAX = 24;
      const seg = (v, c, t) => h('span', { class: 'pl-gpu-seg', style: `width:${100 * v / MAX}%;background:${c}`, title: `${t}: ${fmt(v, 2)} GB` });
      bar.replaceChildren(h('span', { class: 'pl-gpu-track' }, seg(M.wGB, series(0), 'weights'), seg(kv, series(1), 'KV'), seg(WORK, series(5), 'working memory'),
        h('span', { class: 'pl-gpu-cap', style: `left:${100 * CAP / MAX}%` })), h('span', { class: 'pl-gpu-axis' }, ...[0, 4, 8, 12, 16, 20, 24].map(v => h('span', { style: `left:${100 * v / MAX}%`, text: `${v} GB` }))));
      tiles.kv.set(`${fmt(kv, 2)} GB`, `${fmt(M.perTok / 1024, 0)} KiB per token`);
      tiles.tot.set(`${fmt(tot, 1)} GB`, M.name);
      tiles.room.set(`${fmtS(CAP - tot, 1)} GB`, tot <= CAP ? 'fits' : 'does not fit');
    }
    draw();
  };

  /* =================================================================
     (spare) — planE4m3: round a value to E4M3, find its index and its byte
     ================================================================= */
  FIG.planE4m3 = (host) => {
    let lx = Math.log10(5.3), neg = false;
    const box = h('div'), ro = readout(), bits = h('div', { class: 'pl-bits' });
    host.append(controls(
      slider(texify('$|\\vx|$ (log scale)'), -3, Math.log10(460), 0.005, lx, v => { lx = v; draw(); }, v => fmt(10 ** v, 4)),
      seg([[false, '+'], [true, '−']], neg, v => { neg = v; draw(); }, 'sign'),
    ), box, bits, ro);
    const D = Diagram(box, { w: 640, h: 150, label: 'E4M3 grid points around the value' });
    const g = el('g', {}, D.svg);
    function draw() {
      const ax = 10 ** lx, x = neg ? -ax : ax;
      const q = e4round(x), i = e4index(q);
      const ai = Math.abs(i);
      const e = Math.floor(Math.log2(Math.max(Math.min(ax, 448), 2 ** -6)));
      const step = 2 ** (e - 3);
      // the number line: 13 neighbouring grid points of |q|
      g.replaceChildren();
      const lo = Math.max(0, ai - 6), hi = Math.min(126, lo + 12), l0 = Math.max(0, hi - 12);
      const vals = range(l0, hi + 1).map(k => E4[k]);
      const v0 = vals[0], v1 = vals[vals.length - 1];
      const X = v => 40 + 560 * (v - v0) / (v1 - v0 || 1);
      el('line', { x1: 30, x2: 610, y1: 70, y2: 70, style: 'stroke:var(--ink-3);stroke-width:1.5' }, g);
      vals.forEach((v, k) => {
        const idx = l0 + k, on = idx === ai;
        el('line', { x1: X(v), x2: X(v), y1: 60, y2: 80, style: `stroke:${on ? 'var(--c)' : 'var(--ink-2)'};stroke-width:${on ? 3 : 1.4}` }, g);
        if (k % 2 === 0 || on) el('text', { x: X(v), y: 100 * 1, 'text-anchor': 'middle', class: 'val', text: String(neg && idx ? -idx : idx), style: on ? 'font-weight:700' : '' }, g);
        if (k % 4 === 0 || on) el('text', { x: X(v), y: 48, 'text-anchor': 'middle', class: 'lbl', text: fmt(v, v < 0.1 ? 5 : v < 10 ? 3 : 1) }, g);
      });
      el('text', { x: 30, y: 128, class: 'annot', text: `index ${neg ? '(negative side, mirrored)' : ''}` }, g);
      el('text', { x: 30, y: 22, class: 'annot', text: 'grid values' }, g);
      if (ax >= v0 && ax <= v1) {
        dot(g, X(ax), 70, 6, 'var(--vermilion)');
        el('text', { x: X(ax), y: 138, 'text-anchor': 'middle', class: 'lbl', text: 'x', style: 'fill:var(--vermilion)' }, g);
      }
      const sb = neg && ai ? 1 : 0, eb = ai >> 3, mb = ai & 7;
      bits.innerHTML = `<span class="pl-bit s">${sb}</span>` + eb.toString(2).padStart(4, '0').split('').map(c => `<span class="pl-bit e">${c}</span>`).join('') +
        mb.toString(2).padStart(3, '0').split('').map(c => `<span class="pl-bit m">${c}</span>`).join('') +
        `<span class="pl-bit-key">sign · exponent (4) · mantissa (3) — read as a sign-magnitude integer, the byte is the index ${i}</span>`;
      const int8 = Math.max(-127, Math.min(127, rint(x / (448 / 127))));
      ro.set([
        ['x', fmt(x, 5)], ['binade', ax < 2 ** -6 ? 'subnormal' : `[2<sup>${e}</sup>, 2<sup>${e + 1}</sup>)`], ['grid step', fmt(step, 6)],
        ['E4M3 value', fmt(q, 6)], ['index', String(i)], ['relative error', ax ? fmtPct(Math.abs(q - x) / ax, 2) : '0'],
        ['INT8 (same range, one step = 3.53)', `code ${int8} → ${fmt(int8 * 448 / 127, 3)}`],
      ]);
    }
    draw();
  };

  /* =================================================================
     V.10 — planHumps: the codes of one furrow, and three probability tables
     ================================================================= */
  FIG.planHumps = (host) => {
    const N = 20000, r = rng('plan-humps');
    const z = range(N).map(() => r.normal());
    let fmtSel = 'e4m3', mu = 0;
    const box = h('div'), ro = readout();
    host.append(controls(
      seg([['e4m3', 'E4M3'], ['int8', 'INT8']], fmtSel, v => { fmtSel = v; draw(); }, 'format'),
      slider(texify('mean $\\vmu$ (in σ)'), 0, 6, 0.25, mu, v => { mu = v; draw(); }, v => fmt(v, 2)),
    ), legend([['histogram of codes', series(0), 'box'], ['best Laplace in index space', series(1), 'line']]), box, ro);
    const P = Plot(box, { x: [-128, 128], y: [0, 0.05], h: 300, xlabel: 'code (index space)', ylabel: 'share of values', yfmt: v => fmtPct(v, 0), label: 'histogram of codes of one furrow' });
    function draw() {
      const sigma = 20;                                   // scaled values: σ = 20 → E4M3 range is used well
      const xs = z.map(v => (v + mu) * sigma);
      let codes, values, off, lo, hi;
      if (fmtSel === 'e4m3') {
        codes = xs.map(v => e4index(e4round(v)));
        values = range(-126, 127).map(e4value); off = 126; lo = -126; hi = 126;
      } else {
        const sc = Math.max(...xs.map(Math.abs)) / 127;
        codes = xs.map(v => Math.max(-127, Math.min(127, rint(v / sc))));
        values = range(-127, 128); off = 127; lo = -127; hi = 127;
      }
      const cnt = new Map();
      codes.forEach(c => cnt.set(c, (cnt.get(c) || 0) + 1));
      const top = Math.max(...cnt.values()) / N;
      P.domain({ y: [0, Math.max(0.01, top * 1.15)] });
      P.clear();
      const bw = Math.max(1, (P.x(1) - P.x(0)) * 0.9);
      cnt.forEach((n, c) => el('rect', { x: P.x(c) - bw / 2, y: P.y(n / N), width: bw, height: P.y(0) - P.y(n / N), style: `fill:${series(0)};opacity:.8` }, P.g.data));
      const L = laplaceIndexBits(codes, lo, hi);
      const pts = range(lo, hi + 1).map(v => [v, Math.exp(-Math.abs(v - L.m) / L.beta) / L.Z]);
      line(P, pts, { color: series(1), width: 2 });
      const H0 = histEntropy(codes), Hl = L.bits, Hg = gridBits(codes, values, off);
      ro.set([['order-0 entropy (histogram)', `${fmt(H0, 2)} bits`], ['Laplace in index space', `${fmt(Hl, 2)} bits`], ['grid-aware Laplace', `${fmt(Hg, 2)} bits`], ['raw', '8 bits']]);
    }
    draw();
  };

  /* =================================================================
     (spare) — planDistance: bits saved against token distance, with the shuffle
     ================================================================= */
  FIG.planDistance = (host) => {
    const T = 16384, r = rng('plan-distance');
    const noise = Float64Array.from(range(T), () => r.normal());
    const blockDraws = Float64Array.from(range(T), () => r.normal());
    const perm = r.shuffle(range(T));
    const req = 0.6;                                     // sequence offset share is irrelevant to a single sequence
    let lb = 11, share = 0.5;
    const box = h('div'), ro = readout();
    host.append(controls(
      slider('true stretch length', 8, 13, 1, lb, v => { lb = v; draw(); }, v => `${fmtB(pow2(v))} tokens`),
      slider('stretch share', 0, 0.9, 0.05, share, v => { share = v; draw(); }, v => fmtPct(v, 0)),
    ), legend([['original sequence', series(0), 'line'], ['shuffled tokens', series(1), 'dash'], ['theory (one furrow, Gaussian)', series(2), 'dash']]), box, ro);
    const deltas = range(0, 14).map(pow2);
    const P = Plot(box, { x: [1, 8192], xlog: 2, y: [0, 0.5], h: 320, xlabel: 'token distance Δ', ylabel: 'bits saved per element', xticks: [1, 4, 16, 64, 256, 1024, 4096], label: 'bits saved against token distance' });
    crosshair(P, { xname: 'Δ =', yfmt: v => `${fmt(v, 3)} bits` });
    function series_(x) {
      return deltas.map(D => {
        let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, n = 0;
        for (let t = D; t < T; t++) { const a = x[t - D], b = x[t]; sx += a; sy += b; sxx += a * a; syy += b * b; sxy += a * b; n++; }
        const cov = sxy / n - sx * sy / n / n, va = sxx / n - (sx / n) ** 2, vb = syy / n - (sy / n) ** 2;
        const r2 = Math.min(0.9999, cov * cov / (va * vb));
        return [D, 0.5 * Math.log2(1 / (1 - r2))];
      });
    }
    function draw() {
      const Lb = pow2(lb);
      const x = new Float64Array(T);
      for (let t = 0; t < T; t++) x[t] = Math.sqrt(share) * blockDraws[Math.floor(t / Lb)] + Math.sqrt(1 - share) * noise[t];
      const xs = Float64Array.from(perm, i => x[i]);
      const a = series_(x), s = series_(xs);
      const th = deltas.map(D => { const c = share * Math.max(0, 1 - D / Lb); return [D, 0.5 * Math.log2(1 / (1 - c * c))]; });
      const top = Math.max(0.25, ...a.map(p => p[1]), ...th.map(p => p[1]));
      P.domain({ y: [0, Math.ceil(top * 1.25 * 10) / 10] });
      P.clear();
      rule(P, { x: Lb, label: 'true stretch length', dash: '2 4' });
      line(P, th, { color: series(2), dash: '2 3', width: 1.6, name: 'theory' });
      line(P, a, { color: series(0), markers: 3.5, name: 'original' });
      line(P, s, { color: series(1), dash: '6 5', name: 'shuffled' });
      const loc = 0.5 * Math.log2(1 / (1 - share));       // location gain at b = true length, one furrow
      ro.set([['at Δ = 1', `${fmt(a[0][1], 3)} bits`], [`at Δ = ${fmtB(Lb)}`, `${fmt(a[lb][1], 3)} bits`], ['shuffled, Δ = 1', `${fmt(s[0][1], 3)} bits`], ['location gain at b = true length', `${fmt(loc, 3)} bits`]]);
    }
    draw();
  };

  /* =================================================================
     (spare) — planLadderGrid: what each rung pays at each scope
     ================================================================= */
  FIG.planLadderGrid = (host) => {
    const d = 1024, SET = 3, L = 32768;
    const rungs = [
      { name: 'furrow statistics', w: 1 + SET, side: () => 0, note: 'location per furrow + compressor settings' },
      { name: 'KLT bound', bound: true, note: 'computed from the eigenvalues; nothing is coded, nothing charged' },
      { name: 'KLT rank 16', w: 32 + SET, side: () => 16 * 8 / d, note: '16 basis vectors in BF16; 16 coefficients per cherry at 8 bits (assumed)' },
      { name: 'VQ 256 × 64-dim', w: 256 + SET, side: () => 8 / 64, note: '16 sub-codebooks of 256 centroids; one byte per 64 elements' },
      { name: 'sibling', w: SET, side: b => Math.log2(b) / d, noGlobal: true, note: 'pointer to the nearest sibling in the same punnet' },
    ];
    const scopes = [['global', 0], ['sequence', L], ['stretch 8K', 8192], ['stretch 2K', 2048], ['stretch 512', 512]];
    let what = 'total';
    const wrap = h('div');
    host.append(controls(seg([['share', 'dictionary share'], ['side', 'per-cherry tax'], ['total', 'both']], what, v => { what = v; draw(); }, 'show')),
      legend([['< 0.1 bit: free', 'var(--good)', 'box'], ['0.1–0.5 bit: costly', 'var(--saffron)', 'box'], ['> 0.5 bit: eats the likely gain', 'var(--bad)', 'box']]), wrap);
    function draw() {
      const rows = rungs.map(R => ({
        cells: [{ html: `<b>${R.name}</b>`, cls: '' }].concat(scopes.map(([s, b]) => {
          if (R.bound) return { html: '<span class="pl-lg-na">bound only</span>', cls: '' };
          if (s === 'global' && R.noGlobal) return { html: '<span class="pl-lg-na">n/a</span>', cls: '' };
          const share = b ? 8 * R.w / b : 0, side = R.side(b || 2048);
          const v = what === 'share' ? share : what === 'side' ? side : share + side;
          const cls = v < 0.1 ? 'pl-lg-ok' : v < 0.5 ? 'pl-lg-mid' : 'pl-lg-bad';
          return { html: `<span class="pl-lg ${cls}" title="${R.note}">${fmt(v, v < 0.01 ? 4 : 3)}</span>`, cls: '' };
        })),
      }));
      wrap.replaceChildren(table(['rung', ...scopes.map(s => s[0])], rows, { left: [0] }));
    }
    draw();
  };

  /* =================================================================
     (spare) — planTimeline: the long weekend, slot by slot
     ================================================================= */
  FIG.planTimeline = (host) => {
    const kinds = { build: ['build', series(0)], compute: ['compute', series(2)], read: ['read & think', series(4)], decide: ['decide', series(1)] };
    const days = [
      { day: 'Day 0', sub: 'before', slots: [
        { t: 'evening', k: 'compute', title: 'Re-dump with queries', text: 'Add query vectors and positions of the last 4K tokens to the dump script; dump K (before RoPE) and V of 10 sequences on the 16 GB GPU.', page: 'plan-data' }] },
      { day: 'Day 1', sub: 'build, then look', slots: [
        { t: 'morning', k: 'build', title: 'Target, rates, controls', text: 'E4M3 and INT8 functions, the two rates, the DeltaCoder interface; pass the four controls on synthetic data. (Most of this already runs: analysis/plan_harness.py.)', page: 'plan-controls' },
        { t: 'afternoon', k: 'compute', title: 'Experiment 1a', text: 'Distance curves, location and KLT gains, with the shuffle — about an hour of compute on the real dumps; the rest of the afternoon is reading the curves.', page: 'plan-experiment-1a' }] },
      { day: 'Day 2', sub: 'the ladder', slots: [
        { t: 'all day', k: 'compute', title: 'Experiment 1b', text: 'loc, KLT bound, KLT rank 16, sib — every scope, both formats, both rates, K and V, six layers.', page: 'plan-experiment-1b' },
        { t: 'overnight', k: 'compute', title: 'VQ', text: 'k-means codebooks are the slow rung; they run while nobody watches.', page: 'plan-experiment-1b' }] },
      { day: 'Day 3', sub: 'decide', slots: [
        { t: 'morning', k: 'read', title: 'Table 1 and Figure A', text: 'Scope gains per type, format and rate; distance curves with their shuffled twins.', page: 'plan-wave1-outputs' },
        { t: 'afternoon', k: 'decide', title: 'The decision', text: 'Apply the decision rule written in advance — and say so if the result falls in its gap.', page: 'plan-decision-rule' }] },
    ];
    const grid = h('div', { class: 'pl-tl' });
    const note = readout();
    host.append(legend(Object.values(kinds).map(([l, c]) => [l, c, 'box'])), grid, note);
    let cur = null;
    days.forEach(D => {
      const col = h('div', { class: 'pl-tl-day' }, h('div', { class: 'pl-tl-head' }, h('b', { text: D.day }), h('span', { text: D.sub })));
      D.slots.forEach(S => {
        const card = h('button', { type: 'button', class: 'pl-tl-slot', style: `--kc:${kinds[S.k][1]}` },
          h('span', { class: 'pl-tl-t', text: S.t }), h('span', { class: 'pl-tl-title', text: S.title }));
        card.addEventListener('click', () => show(S, card));
        hover(card, () => `<b>${S.title}</b><br>${S.text}`);
        col.append(card);
        if (!cur) cur = [S, card];
      });
      grid.append(col);
    });
    function show(S, card) {
      grid.querySelectorAll('.pl-tl-slot').forEach(c => c.classList.toggle('on', c === card));
      note.set([[S.title, S.text], ['page', `<a href="${KV.prefix}plan/${S.page.replace('plan-', '')}/">${S.page}</a>`]]);
    }
    show(...cur);
  };

  /* =================================================================
     (spare: the old wave-1 rule) — planDecision: two scope gains in, one row of the rule out
     ================================================================= */
  FIG.planDecision = (host) => {
    let gr = 0.459, gb = 0.342;
    const rows = [
      { id: 'blk', cond: '$\\vgainseq + \\vgainstr \\ge 0.75$ and $\\vgainstr \\ge 0.4$', read: 'fallen-apple similarity is real and at stretch scale', next: 'wave 2 with stretch scope', c: series(0) },
      { id: 'req', cond: '$\\vgainseq + \\vgainstr \\ge 0.75$ but $\\vgainstr < 0.15$', read: 'real, but at sequence scale', next: 'wave 2 with sequence scope; framework C optional', c: series(2) },
      { id: 'gap', cond: '$\\vgainseq + \\vgainstr \\ge 0.75$ and $0.15 \\le \\vgainstr < 0.4$', read: '<b>no row in the source</b> — both scales carry structure', next: 'our proposal: wave 2 with both scopes; framework C decides', c: series(4) },
      { id: 'mid', cond: '$0.25 \\le \\vgainseq + \\vgainstr < 0.75$', read: 'marginal; hinges on w, the victim tier and lever 2', next: 'run framework C; decide on the napkin', c: series(3) },
      { id: 'neg', cond: '$\\vgainseq + \\vgainstr < 0.25$', read: '8-bit orchards have no usable conditional structure', next: 'publish the negative; pivot to a global fixed-length miss-path compressor', c: series(1) },
    ];
    const rowOf = (x, y) => (x + y >= 0.75 ? (y >= 0.4 ? 'blk' : y < 0.15 ? 'req' : 'gap') : x + y >= 0.25 ? 'mid' : 'neg');
    const box = h('div'), ro = readout();
    const s1 = slider(texify('$\\vgainseq$ (bits)'), 0, 1.5, 0.01, gr, v => { gr = v; draw(); });
    const s2 = slider(texify('$\\vgainstr$ (bits)'), 0, 1.5, 0.01, gb, v => { gb = v; draw(); });
    const presets = [
      ['synthetic, INT8, entropy', 0.459, 0.342], ['synthetic, INT8, fixed-length', 0.570, 0.371], ['synthetic, E4M3, fixed-length', 0.058, 0.161],
    ];
    const tbl = h('div', { class: 'pl-dec' });
    host.append(controls(s1, s2), controls(...presets.map(([l, a, b]) => btn(l, () => { gr = a; gb = b; s1.set(a); s2.set(b); draw(); }, { cls: 'sm' }))), h('div', { class: 'fig-row' }, box, tbl), ro);
    const P = Plot(box, { x: [0, 1.5], y: [0, 1.5], h: 360, w: 420, xlabel: 'g_seq, the sequence-scope gain (bits per element)', ylabel: 'g_str, the stretch-scope gain (bits per element)', label: 'decision regions in the plane of the two scope gains' });
    const poly = (pts, c, op = 0.2) => el('polygon', { points: pts.map(([x, y]) => `${P.x(x)},${P.y(y)}`).join(' '), style: `fill:${c};opacity:${op};stroke:${c};stroke-width:1` }, P.g.bg);
    poly([[0, 0], [0.25, 0], [0, 0.25]], series(1));
    poly([[0.25, 0], [0.75, 0], [0, 0.75], [0, 0.25]], series(3));
    poly([[0.75, 0], [1.5, 0], [1.5, 0.15], [0.6, 0.15]], series(2));
    poly([[0.6, 0.15], [1.5, 0.15], [1.5, 0.4], [0.35, 0.4]], series(4), 0.32);
    poly([[0.35, 0.4], [1.5, 0.4], [1.5, 1.5], [0, 1.5], [0, 0.75]], series(0));
    [['stretch scope', 0.75, 1.1], ['sequence scope', 1.12, 0.07], ['the gap', 1.05, 0.27], ['marginal', 0.3, 0.2], ['no', 0.07, 0.07]].forEach(([t, x, y]) =>
      el('text', { x: P.x(x), y: P.y(y) + 4 * P.fs, 'text-anchor': 'middle', class: 'lbl', text: t }, P.g.top));
    const knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
    draggable(knob, P, ([x, y]) => { gr = clamp(+x.toFixed(2), 0, 1.5); gb = clamp(+y.toFixed(2), 0, 1.5); s1.set(gr); s2.set(gb); draw(); }, null,
      { get: () => [gr, gb], step: [0.01, 0.01], label: 'the two scope gains' });
    function draw() {
      knob.setAttribute('cx', P.x(gr)); knob.setAttribute('cy', P.y(gb));
      const id = rowOf(gr, gb);
      tbl.replaceChildren(...rows.map(R => h('div', { class: 'pl-dec-row' + (R.id === id ? ' on' : '') + (R.id === 'gap' ? ' gap' : ''), style: `--kc:${R.c}` },
        h('div', { class: 'pl-dec-cond', html: texify(R.cond) }), h('div', { class: 'pl-dec-read', html: R.read }), h('div', { class: 'pl-dec-next', html: '→ ' + R.next }))));
      const R = rows.find(x => x.id === id);
      ro.set([[tex('\\vgainseq + \\vgainstr'), `${fmt(gr + gb, 2)} bits`], ['row', R.id === 'gap' ? 'none (the gap)' : R.read], ['next', R.next]]);
    }
    draw();
  };

  /* =================================================================
     X.5 — planSelections: exact top-k on a synthetic sequence, as a raster
     ================================================================= */
  FIG.planSelections = (host) => {
    let strength = 1.5, drift = 0.15;
    const box = h('div'), ro = readout();
    host.append(controls(
      slider('topic strength', 0, 3, 0.25, strength, v => { strength = v; redraw(); }, v => fmt(v, 2)),
      slider('query drift', 0.01, 0.5, 0.01, drift, v => { drift = v; redraw(); }, v => fmt(v, 2)),
    ), box, ro);
    const nb = TR.n / TR.b, XB = 64, YB = 60;
    const P = Plot(box, { x: [0, TR.n], y: [TR.steps, 0], h: 340, xlabel: 'position (16 stretches of 256)', ylabel: 'decode step', xticks: range(0, TR.n + 1, 512), grid: false, label: 'picked positions by decode step' });
    const redraw = throttleRAF(draw);
    function draw() {
      const sel = makeTrace(strength, drift);
      const H = range(YB).map(() => new Float64Array(XB));
      sel.forEach((S, s) => S.forEach(p => { H[Math.floor(s * YB / TR.steps)][Math.floor(p * XB / TR.n)]++; }));
      const per = TR.k * (TR.steps / YB) * (XB / TR.n) * TR.n / XB;   // picks per cell if spread evenly
      P.clear('data', 'top', 'bg');
      for (let j = 1; j < nb; j++) el('line', { x1: P.x(j * TR.b), x2: P.x(j * TR.b), y1: P.y(0), y2: P.y(TR.steps), style: 'stroke:var(--rule);stroke-width:1;opacity:.6' }, P.g.bg);
      const mx = Math.max(...H.map(r => Math.max(...r)));
      const cw = P.x(TR.n / XB) - P.x(0), ch = P.y(TR.steps / YB) - P.y(0);
      H.forEach((row, yi) => row.forEach((v, xi) => {
        if (!v) return;
        el('rect', { x: P.x(xi * TR.n / XB), y: P.y(yi * TR.steps / YB), width: cw + 0.3, height: ch + 0.3, style: `fill:var(--lapis);opacity:${(0.08 + 0.92 * v / mx).toFixed(3)}` }, P.g.data);
      }));
      // stretch concentration: share of each step's picks in its heaviest 1, 2, 4 stretches; heaviest-stretch lifetime
      const shares = [1, 2, 4].map(() => 0);
      let prevTop = -1, runs = 0;
      sel.forEach(S => {
        const c = new Array(nb).fill(0);
        S.forEach(p => c[Math.floor(p / TR.b)]++);
        const sorted = c.slice().sort((a, b) => b - a);
        [1, 2, 4].forEach((n, i) => { shares[i] += sorted.slice(0, n).reduce((a, b) => a + b, 0) / TR.k; });
        const top = c.indexOf(sorted[0]);
        if (top !== prevTop) runs++;
        prevTop = top;
      });
      ro.set([['heaviest stretch holds', fmtPct(shares[0] / TR.steps, 0)], ['heaviest 2 stretches', fmtPct(shares[1] / TR.steps, 0)], ['heaviest 4 stretches', fmtPct(shares[2] / TR.steps, 0)],
        ['heaviest stretch stays heaviest', `${fmt(TR.steps / runs, 1)} steps on average`], ['if spread evenly', `top 1 = ${fmtPct(1 / nb, 1)}`]]);
      void per;
    }
    draw();
  };

  /* =================================================================
     X.6 — planReplaySweep: f_D and n_load against the dictionaries on the shelf
     ================================================================= */
  FIG.planReplaySweep = (host) => {
    let strength = 1.5;
    const nDs = [1, 2, 4, 8, 16];
    const b1 = h('div'), b2 = h('div'), ro = readout();
    host.append(controls(slider('topic strength', 0, 3, 0.25, strength, v => { strength = v; redraw(); }, v => fmt(v, 2))),
      legend([['heaviest stretches on fire', series(0), 'line'], ['LRU of stretches hit by a miss', series(1), 'dash']]), h('div', { class: 'fig-row' }, b1, b2), ro);
    const P1 = Plot(b1, { x: [1, 16], xlog: 2, y: [0, 1], w: 420, h: 330, xlabel: 'dictionaries on the shelf n_D', ylabel: 'δ-miss fraction f_D', xticks: nDs, yfmt: v => fmtPct(v, 0), label: 'delta-miss fraction against the dictionaries on the shelf' });
    const P2 = Plot(b2, { x: [1, 16], xlog: 2, y: [0, 4], w: 420, h: 330, xlabel: 'dictionaries on the shelf n_D', ylabel: 'loads per step n_load', xticks: nDs, label: 'dictionary loads per step against the dictionaries on the shelf' });
    const redraw = throttleRAF(draw);
    function draw() {
      const sel = makeTrace(strength, 0.15);
      const B = 2 * TR.k;
      const res = ['heaviest', 'lru'].map(pol => nDs.map(n => replay(sel, B, TR.b, n, pol)));
      const top = Math.max(0.5, ...res.flat().map(r => r.nload));
      P2.domain({ y: [0, Math.ceil(top * 1.15 * 2) / 2] });
      P1.clear(); P2.clear();
      rule(P1, { y: 0.8, label: '0.8', dash: '2 4' });
      rule(P1, { y: 0.5, label: '0.5', dash: '2 4', color: 'var(--ink-3)' });
      rule(P2, { y: 0.1, label: '0.1 (break-even for w = 256)', dash: '2 4' });
      res.forEach((rs, i) => {
        line(P1, rs.map((r, k) => [nDs[k], r.fD]), { color: series(i), dash: i ? '6 5' : false, markers: 4, tip: ([n, v]) => `n_D = ${n}: f_D = ${fmtPct(v, 1)}` });
        line(P2, rs.map((r, k) => [nDs[k], r.nload]), { color: series(i), dash: i ? '6 5' : false, markers: 4, tip: ([n, v]) => `n_D = ${n}: ${fmt(v, 2)} loads per step` });
      });
      const ms = [1, 2, 4].map(f => replay(sel, f * TR.k, TR.b, 1, 'lru').m);
      ro.set([['miss rate, B = k, 2k, 4k', ms.map(v => fmtPct(v, 1)).join(' · ')], ['f_D at n_D = 4 (heaviest)', fmtPct(res[0][2].fD, 0)], ['n_load at n_D = 4 (heaviest)', fmt(res[0][2].nload, 2)]]);
    }
    draw();
  };

  /* =================================================================
     (spare) — planFrontier: sequences per GPU against link bandwidth
     ================================================================= */
  FIG.planFrontier = (host) => {
    const k = 2048, NL = 78, e = 640, tpot = 0.03, HBM = 30e9;
    const missOf = { 2048: 0.30, 4096: 0.134, 8192: 0.067 };
    let B = 4096, rho = 0.75, w = 256;
    const box = h('div'), ro = readout();
    host.append(controls(
      seg([[2048, 'B = 2K'], [4096, 'B = 4K'], [8192, 'B = 8K']], B, v => { B = v; draw(); }, 'hot cache'),
      slider(texify('delta share $\\vrho$'), 0.4, 1, 0.01, rho, v => { rho = v; draw(); }),
      slider(texify('$\\vwres$ (cherries)'), 0, 1024, 16, w, v => { w = v; draw(); }),
    ), legend([['HiSparse', series(1), 'line'], ['kvblockdiff, sequence scope', series(0), 'line']]), box, ro);
    const P = Plot(box, { x: [16, 1000], xlog: true, y: [0, 400], h: 330, xticks: [16, 50, 100, 200, 450, 1000], xfmt: v => String(v), xlabel: 'link bandwidth W_link (GB/s)', ylabel: 'sequences per GPU N', label: 'sequences per GPU against link bandwidth' });
    crosshair(P, { xname: 'W_link =', xfmt: v => `${fmt(v, 0)} GB/s`, yfmt: v => fmt(v, 0) });
    const Wpts = linspace(Math.log10(16), 3, 120).map(v => 10 ** v);
    function N(W, rh, wr) {
      const m = missOf[B];
      const T = m * k * NL * e * rh, M = NL * e * (B + wr);
      return [W * 1e9 * tpot / T, HBM / M];
    }
    function draw() {
      P.clear();
      const hs = Wpts.map(W => [W, Math.min(...N(W, 1, 0))]), kb = Wpts.map(W => [W, Math.min(...N(W, rho, w))]);
      const top = Math.max(...hs.map(p => p[1]), ...kb.map(p => p[1]));
      P.domain({ y: [0, Math.ceil(top * 1.15 / 50) * 50] });
      rule(P, { x: 50, label: 'PCIe 5', dash: '2 4' });
      rule(P, { x: 450, label: 'C2C', dash: '2 4', color: 'var(--ink-3)' });
      line(P, hs, { color: series(1), name: 'HiSparse' });
      line(P, kb, { color: series(0), name: 'kvblockdiff' });
      const [hl, hm] = N(50, 1, 0), [kl, km] = N(50, rho, w);
      const n0 = Math.min(hl, hm), n1 = Math.min(kl, km);
      ro.set([['HiSparse at 50 GB/s', `${fmt(n0, 0)} (${hl < hm ? 'link' : 'HBM'}-bound)`], ['kvblockdiff at 50 GB/s', `${fmt(n1, 0)} (${kl < km ? 'link' : 'HBM'}-bound)`], ['gain', `${fmt(n1 / n0, 2)}×`]]);
    }
    draw();
  };

  /* =================================================================
     (spare: the old twelve-risk register; X.10 uses a table) — planRisks: risk cards, filtered by when we would find out
     ================================================================= */
  FIG.planRisks = (host) => {
    const R = [
      { id: 'R1', when: 'w1', q: 'Q1', title: '8-bit orchards have no usable conditional structure', know: 'wave 1, shuffle-controlled: scope gains below 0.25 bit', pivot: 'Publish the negative with the BF16 column; build the global fixed-length miss-path compressor (solo coding for sparse decode): ~1.1–1.3× for free, no residency.' },
      { id: 'R2', when: 'w1', q: 'Q1', title: 'Gains only on keys; values stay at the solo rate', know: 'the K/V split of Table 1', pivot: 'ρ capped near 0.85 for the whole cherry; still worth it if the victim tier or lever 2 also pays; decided in framework D.' },
      { id: 'R3', when: 'w1', q: 'Q3', title: 'Gains only at sequence scope', know: 'g_str small', pivot: 'sequence scope: one dictionary per sequence per layer, no dictionary shelf. Simpler, still new.' },
      { id: 'R4', when: 'w1', q: 'Q2', title: 'Only heavy dictionaries (VQ) capture the gain', know: 'VQ beats loc + KLT by a margin', pivot: 'Residency decides (Q3); product-quantization sub-codebooks ≤ 32 KB keep the decoder in shared memory; shared prefixes may make heavy dictionaries free.' },
      { id: 'R5', when: 'w1', q: 'Q2', title: 'The E4M3 index space hides structure that floats show', know: '1a gains ≫ 1b gains on E4M3 (our synthetic set: 0.80 bit entropy vs 0.22 bit fixed-length)', pivot: 'Report INT8 with a per-furrow scale as an equal 8-bit storage format; keep the per-furrow predict-or-not flag in every E4M3 dictionary.' },
      { id: 'R6', when: 'w1', q: 'Q1', title: 'The 2B stand-in LLM is unrepresentative', know: 'disagreement with Qwen3-1.7B', pivot: 'Replicate on Qwen3-1.7B (planned); later on an MLA LLM’s latent vectors.' },
      { id: 'R7', when: 'w2', q: 'Q3', title: 'Misses do not concentrate into stretches', know: 'framework C: f_D low at n_D = 8', pivot: 'Light all-resident dictionaries (w ≤ 32) or sequence scope; heavy dictionaries are out.' },
      { id: 'R8', when: 'later', q: 'Q2', title: 'The decoder cannot run at gather speed', know: 'only in phase 2; the fixed-length rate predicts the format', pivot: 'Fixed-length deltas only on the miss path; the victim tier (decode on promotion) instead of full lever 2.' },
      { id: 'R9', when: 'read', q: '—', title: 'Prior art already covers it', know: 'the papers of Part IX', pivot: 'What is new: lossless at 8 bits; the neighbour measurement with controls; the random-access miss path; the residency economics.' },
      { id: 'R10', when: 'w1', q: 'Q1', added: true, title: 'Two calibration sequences are too few', know: 'the shuffled g_seq (the calibration gap): 0.22 bit with 2 calibration sequences on synthetic data', pivot: 'Dump 8–32 calibration sequences (cheap: 200 MB each); report g_seq minus its shuffled value.' },
      { id: 'R11', when: 'w1', q: 'Q2', added: true, title: 'The probability table is the wrong shape on E4M3', know: 'solo E4M3 costs more than 8 bits under the index-space Laplace (8.4 on synthetic data)', pivot: 'Use the grid-aware table for the entropy column (done in the harness); keep the index-space one for INT8 only.' },
      { id: 'R12', when: 'w1', q: 'Q2', added: true, title: 'The fixed-length column has a straw-man baseline', know: 'solo fixed-length = 8.0 bits: the plain format cannot shorten raw codes', pivot: 'Add an exponent-splitting solo format (SplitZip-style) as rung 0 of the fixed-length column.' },
    ];
    const whenName = { w1: 'wave 1', w2: 'wave 2', later: 'phase 2', read: 'reading' };
    let f = 'all';
    const grid = h('div', { class: 'pl-risks' });
    host.append(controls(seg([['all', 'all'], ['w1', 'found in wave 1'], ['w2', 'wave 2'], ['later', 'later'], ['added', 'added here']], f, v => { f = v; draw(); }, 'filter')), grid);
    function draw() {
      grid.replaceChildren(...R.filter(r => f === 'all' || (f === 'added' ? r.added : r.when === f)).map(r => h('article', { class: 'pl-risk' + (r.added ? ' added' : '') },
        h('header', {}, h('span', { class: 'pl-risk-id', text: r.id }), h('span', { class: 'pl-risk-tags', text: `${whenName[r.when]} · ${r.q}${r.added ? ' · added here' : ''}` })),
        h('h4', { text: r.title }),
        h('div', { class: 'pl-risk-k' }, h('b', { text: 'How we would know' }), h('span', { text: r.know })),
        h('div', { class: 'pl-risk-p' }, h('b', { text: 'Pivot' }), h('span', { text: r.pivot })))));
    }
    draw();
  };

  /* =================================================================
     X.4 — planQueue: the nine experiments H1–H9, ordered by hours to a first reading
     ================================================================= */
  FIG.planQueue = (host) => {
    // hours from the cards of X.4 (writing: wiring and scripts; running: CPU or GPU time). Rounded; a day is 8 h.
    const Q = [
      { id: 'H1', q: 'Q1', title: 'keys under the leash', scenario: 'K at one KV layer, k[t, l, :, :] · stretch 4096 · leash 293', exists: 'the dump holds pre-RoPE keys; one tensor name changes', signal: 'a ratio within 0.03 of 0.636 on the same punnets', decision: 'whether keys need their own stages', write: 1, run: 2 },
      { id: 'H2', q: 'Q2', title: 'the four stretch-and-leash pairs', scenario: 'the frontier compressor at stretch 512 · leash 137, 4096 · 293, 16 384 · 1 103 and the whole sequence · 14 503, tree depth capped', exists: 'reads are counted for every cherry; the cap is a layout parameter', signal: 'about 0.0005 of ratio per doubling of reads', decision: 'which stretch length and leash the application uses', write: 1, run: 3 },
      { id: 'H3', q: 'Q1', title: 'one dictionary for a group of layers', scenario: 'V at KV layers 0, 4, 5, cherry v[t, l, :, :] · stretch 4096 · leash 293', exists: 'a punnet constructor over three layers', signal: 'paired difference against three per-layer dictionaries, a gain near 0.01 expected', decision: 'one dictionary per layer group or per layer on the shelf', write: 2, run: 2 },
      { id: 'H4', q: 'Q1', title: 'keys and values as one cherry', scenario: '(k[t, l, :, :], v[t, l, :, :]) · stretch 4096 · leash 293', exists: 'after H1: a slice spanning two tensors, one script', signal: 'below the byte-weighted mean of the halves by more than 0.005', decision: 'one cherry of both halves, or two cherries', write: 2, run: 3 },
      { id: 'H5', q: 'Q2', title: 'the bit-field split as a stage', scenario: 'the frontier line with sign and exponent through the tree, a fixed-length mantissa with escapes', exists: 'the stages exist separately; the routing is a new graph', signal: 'the gap to 0.636: 15–22 % expected at these rates', decision: 'which delta format H9 decodes', write: 8, run: 2 },
      { id: 'H6', q: 'Q3', title: 'sequence scope', scenario: 'v[t, l, :, :] · stretch 16 384 · leash 1 103, then the whole sequence · leash 14 503', exists: 'any stretch length is accepted; the tree needs an index at 225K cherries', signal: 'the curve 0.636 → 0.618 → ? and the whole-sequence point', decision: 'one dictionary per sequence at admission, or a shelf', write: 4, run: 12 },
      { id: 'H7', q: 'Q1', title: 'prose', scenario: 'the frontier line on 10 prose sequences', exists: 'the dump script; a corpus to choose and dump (one evening)', signal: 'the no-tree ratio near 0.686; the frontier worse than 0.636 by the lost repeats', decision: 'whether the headline depends on tool-heavy transcripts', write: 5, run: 8 },
      { id: 'H8', q: 'Q1', title: 'a second LLM', scenario: 'V at one KV layer, v[t, l, :, :] (8 heads × 128 elements) · stretch 4096 · leash 293 against v[t, l, h, :] (128), Qwen3-1.7B', exists: 'the dump script with the LLM name changed', signal: 'the head-joining gain and the shuffle gap on the new LLM', decision: 'how much of Part VIII to claim beyond one LLM', write: 6, run: 16 },
      { id: 'H9', q: 'Q2', title: 'a GPU decode of the frontier compressor', scenario: 'the frontier line; the decoder, not the ratio, is measured', exists: 'a CPU decoder in Rust that forks per cherry; no GPU code', signal: 'cold-decoded cherries per second against 50 GB/s of link', decision: 'the 10× rule: whether the compressor can sit on the miss path', write: 32, run: 8 },
    ];
    const QC = { Q1: series(0), Q2: series(1), Q3: series(2) };
    const QN = { Q1: 'Q1 structure', Q2: 'Q2 the store', Q3: 'Q3 residency' };
    const rows = Q.map(r => ({ ...r, total: r.write + r.run })).sort((a, b) => a.total - b.total);
    const box = h('div'), ro = readout();
    host.append(legend([['Q1 structure', QC.Q1, 'box'], ['Q2 the store', QC.Q2, 'box'], ['Q3 residency', QC.Q3, 'box'], ['writing (hatched) · running (solid)', 'var(--ink-3)', 'box']]), box, ro,
      h('p', { class: 'fig-note', text: 'Hours are the rounded estimates of the cards on this page (a day is 8 h); they are corrected after each run. Hover a bar for the card.' }));
    const P = Plot(box, { ycats: rows.map(r => `${r.id} · ${r.title}`), x: [1, 200], xlog: true, w: 900, h: 400, m: { l: 300, r: 60 }, xticks: [1, 3, 10, 30, 100], xfmt: v => `${v} h`, grid: 'x', xlabel: 'hours to a first reading (log scale)', label: 'The nine experiments of the queue by hours to a first reading, writing and running' });
    const pat = uid('plq');
    const pt = el('pattern', { id: pat, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, P.defs);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 6, style: 'stroke:var(--paper);stroke-width:2.5' }, pt);
    const bh = Math.min(22, P.ph / rows.length * 0.7);
    rows.forEach((r, i) => {
      const y = P.y(i) - bh / 2, c = QC[r.q];
      const g = el('g', { tabindex: 0, role: 'img', 'aria-label': `${r.id}: ${r.write} hours writing, ${r.run} hours running` }, P.g.data);
      el('rect', { x: P.x(1), y, width: P.x(r.write) - P.x(1), height: bh, rx: 3, style: `fill:${c}` }, g);
      el('rect', { x: P.x(1), y, width: P.x(r.write) - P.x(1), height: bh, rx: 3, style: `fill:url(#${pat})` }, g);
      el('rect', { x: P.x(r.write), y, width: P.x(r.total) - P.x(r.write), height: bh, rx: 3, style: `fill:${c}` }, g);
      el('text', { x: P.x(r.total) + 6 * P.fs, y: P.y(i) + 4 * P.fs, class: 'val', text: `${r.total} h` }, g);
      hover(g, () => `<b>${r.id} · ${esc(r.title)}</b> · ${QN[r.q]}<br><b>scenario</b> ${esc(r.scenario)}<br><b>exists</b> ${esc(r.exists)}<br><b>signal</b> ${esc(r.signal)}<br><b>decision</b> ${esc(r.decision)}<br><b>cost</b> ${r.write} h writing + ${r.run} h running`);
      g.addEventListener('focus', () => ro.set([[r.id, r.title], ['scenario', r.scenario], ['decision', r.decision], ['cost', `${r.write} h writing + ${r.run} h running`]]));
      g.addEventListener('click', () => ro.set([[r.id, r.title], ['scenario', r.scenario], ['decision', r.decision], ['cost', `${r.write} h writing + ${r.run} h running`]]));
    });
    const first = rows[0];
    ro.set([['first reading', `${first.id} · ${first.title}, ${first.total} h`], ['within a day', rows.filter(r => r.total <= 8).map(r => r.id).join(', ')], ['over a week', rows.filter(r => r.total >= 40).map(r => r.id).join(', ') || 'none']]);
  };
})();
