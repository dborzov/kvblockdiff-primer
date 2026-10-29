/* =====================================================================
   figures/plan.js — Part IX, "The plan". See docs/figures.md.
   Builders: planDecodeAlone (IX.1), planBill (IX.2), planControlsRun (IX.3),
   planGpuFit (IX.4), planE4m3 + planHumps (IX.5), planDistance (IX.6),
   planLadderGrid (IX.7), planTimeline (IX.8), planDecision (IX.9),
   planSelections (IX.10), planReplaySweep (IX.11), planFrontier (IX.12),
   planRisks (IX.15).
   Harness numbers come from analysis/plan_harness.py → figures/data/plan-harness.json, transcribed into the
   dataset 'plan-ladder' (figures/datasets/plan-ladder.js). The E4M3 helpers live in 'plan-synth', the synthetic
   indexer trace and its replay in 'plan-trace'. Everything else is computed here, from seeded generators or closed formulas.
   ===================================================================== */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------------ shared helpers
  const pow2 = v => 2 ** v;
  const fmtB = b => (b >= 1024 ? `${b / 1024}K` : `${b}`);

  // ---- E4M3, exactly as analysis/plan_harness.py: one copy, in the rehearsal set's dataset file
  const { E4, rint, e4round, e4index, e4value } = DS.spec('plan-synth').helpers;

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

  // ---- the synthetic indexer trace of IX.10 and IX.11 and its replay: one copy, in the rehearsal trace's dataset file
  const { TR, makeTrace, replay } = DS.spec('plan-trace').helpers;

  /* =================================================================
     IX.1 — planDecodeAlone: a loc dictionary, and one entry decoded alone
     ================================================================= */
  FIG.planDecodeAlone = (host) => {
    // The Gull Rock afternoon of II.13 (DS 'gull-day') as a block: 12 entries, 5 channels, each value in whole sensor
    // steps (tenths of a degree, hundredths of humidity, tenths of a hPa, knots). The loc dictionary is the median per channel.
    const STEP = [['low', 10], ['mast', 10], ['hum', 100], ['pres', 10], ['wind', 1]];
    const day = DS.rows('gull-day');
    const X = day.map(r => STEP.map(([k, f]) => Math.round(r[k] * f)));
    const D = STEP.map((_, j) => rint(median(X.map(row => row[j]))));
    const R = X.map(row => row.map((v, j) => v - D[j]));
    const width = range(5).map(j => Math.max(1, Math.ceil(Math.log2(2 * Math.max(...R.map(row => Math.abs(row[j]))) + 1))));
    const raw = DS.metric('gull-day', 'bits-raw');                 // II.13: whole sensor steps plus a sign bit
    const names = day.map(r => r.time);
    let sel = 3;
    const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
    const grid = h('div', { class: 'pl-da' });
    const ro = readout();
    host.append(h('p', { class: 'fig-note', text: 'Click an entry (a row) to decode it alone.' }), grid, ro);

    function tableOf(title, rows, opts) {
      const t = h('div', { class: 'pl-da-t' + (opts.cls ? ' ' + opts.cls : '') });
      t.append(h('div', { class: 'pl-da-h', html: title }));
      const body = h('div', { class: 'pl-da-body', style: 'grid-template-columns: auto repeat(3, minmax(2.2rem, 1fr)) minmax(3.4rem, 1.4fr) minmax(2.2rem, 1fr)' });
      body.append(h('span', { class: 'pl-da-c pl-da-k' }, ''), ...['foot', 'top', 'hum.', 'pres.', 'wind'].map(t => h('span', { class: 'pl-da-c pl-da-k', html: t })));
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
        tableOf('the block <small>(whole sensor steps)</small>', X, { rowName: i => names[i], show: v => String(v), isOn: i => i === sel, isUsed: () => false, click: i => { sel = i; draw(); } }),
        tableOf(tex('\\vD') + ' <small>(one per block)</small>', [D], { rowName: () => 'median', show: v => String(v), isOn: () => false, isUsed: () => true, cls: 'pl-da-dict' }),
        tableOf('the deltas <small>(residuals)</small>', R, { rowName: i => `δ ${names[i]}`, show: v => sgn(v), isOn: () => false, isUsed: i => i === sel, dim: true, click: i => { sel = i; draw(); } }),
      );
      const rebuilt = R[sel].map((v, j) => v + D[j]);
      const ok = rebuilt.every((v, j) => v === X[sel][j]);
      const dBits = width.reduce((a, b) => a + b, 0);
      ro.set([
        [`the ${names[sel]} reading, rebuilt`, `${rebuilt.join(', ')} ${ok ? '— bit for bit ✓' : '✗'}`],
        ['read from memory', `${tex('\\vD')} + δ ${names[sel]} only (the other ${X.length - 1} deltas untouched)`],
        ['delta size', `${dBits} bits (widths ${width.join(' + ')}) against ${sum(raw)} bits raw (${raw.join(' + ')})`],
      ]);
    }
    draw();
  };

  /* =================================================================
     IX.2 — planBill: residual + per-entry tax + dictionary share, per type
     ================================================================= */
  FIG.planBill = (host) => {
    const d = 1024;                          // elements per entry in the proxy model
    const SET = 3;                           // coder settings, bytes per channel (centre, scale, width)
    const types = [
      { id: 'loc', name: 'loc', w: 1 + SET, side: () => 0, sideTxt: 'none' },
      { id: 'klt', name: 'KLT, rank 16', w: 32 + SET, side: () => 16 * 8 / d, sideTxt: '16 coefficients × 8 bits per entry (assumed width)' },
      { id: 'vq', name: 'VQ, 256 × 64-dim', w: 256 + SET, side: () => 8 / 64, sideTxt: 'one 8-bit index per 64 elements' },
      { id: 'sib', name: 'sib', w: SET, side: b => Math.log2(b) / d, sideTxt: 'a log₂ b-bit pointer per entry' },
    ];
    let lb = 11, res = 6.3;
    const rows = h('div', { class: 'pl-bill' });
    const ro = readout();
    host.append(
      controls(
        slider(texify('block size $\\vb$'), 8, 15, 1, lb, v => { lb = v; draw(); }, v => `${fmtB(pow2(v))} entries`),
        slider('residual (assumed)', 3, 8, 0.1, res, v => { res = v; draw(); }, v => `${fmt(v, 1)} bits`),
      ),
      legend([['residual', series(0), 'box'], ['per-entry tax', series(1), 'box'], [texify('dictionary share $8\\vw/\\vb$'), series(3), 'box'], ['raw = 8 bits', 'var(--ink-2)', 'dash']]),
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
        const track = h('span', { class: 'pl-bill-track' }, seg(res, series(0), 'residual'), seg(side, series(1), 'per-entry tax'), seg(share, series(3), 'dictionary share'),
          h('span', { class: 'pl-bill-raw', style: `left:${100 * 8 / MAX}%` }));
        const row = h('div', { class: 'pl-bill-row' }, h('span', { class: 'pl-bill-name', text: t.name }), track,
          h('span', { class: 'pl-bill-tot' + (tot >= 8 ? ' bad' : ''), text: tot > MAX ? `${fmt(tot, 1)} ▸` : fmt(tot, 2) }));
        hover(row, () => `<b>${t.name}</b> at b = ${fmtB(b)}<br>residual ${fmt(res, 2)} bits<br>per-entry tax ${fmt(side, 3)} bits <i>(${t.sideTxt})</i><br>dictionary ${fmt(t.w, 0)} entries' worth → ${fmt(share, 3)} bits<br><b>total ${fmt(tot, 2)} bpe</b>`);
        rows.append(row);
      });
      const best = out.reduce((a, c) => (c[1] < a[1] ? c : a));
      ro.set([['block', `${fmtB(b)} entries`], ['cheapest bill', `${best[0]}: ${fmt(best[1], 2)} bpe`], ['VQ dictionary share', `${fmt(8 * 259 / b, 2)} bits`]]);
    }
    draw();
  };

  /* =================================================================
     IX.3 — planControlsRun: the harness on the synthetic set, with the shuffle
     ================================================================= */
  FIG.planControlsRun = (host) => {
    const J = DS.spec('plan-ladder').helpers.J;      // the harness's printout, transcribed from figures/data/plan-harness.json
    let fmtSel = 'int8', rate = 'entropy', show = 'both';
    const box = h('div'), ro = readout();
    host.append(controls(
      seg([['int8', 'INT8'], ['e4m3', 'E4M3']], fmtSel, v => { fmtSel = v; draw(); }, 'number format'),
      seg([['entropy', 'entropy rate'], ['fixed', 'fixed-length rate']], rate, v => { rate = v; draw(); }, 'rate'),
      seg([['orig', 'original'], ['shuf', 'shuffled'], ['both', 'both']], show, v => { show = v; draw(); }, 'data'),
    ), legend([['block scope, original', series(0), 'line'], ['block scope, shuffled', series(1), 'dash'], ['global scope', series(2), 'dash'], ['request scope', series(4), 'dot']]), box, ro);
    const T = J.synthetic.T, bs = J.bs;
    const P = Plot(box, { x: [200, T * 1.25], xlog: 2, y: [5, 9], h: 340, xlabel: 'block size b (entries)', ylabel: 'bits per element (bpe)', xticks: [256, 512, 1024, 2048, 4096, 8192], xfmt: v => (v === T ? `${fmtB(v)} (all)` : fmtB(v)), label: 'bits per element against block size, synthetic data' });
    function draw() {
      const L = J.ladder[fmtSel]['loc+flag'], i = rate === 'entropy' ? 0 : 1;
      const vals = [];
      ['orig', 'shuf'].forEach(t => { vals.push(L[t].global[i], L[t].request[i], ...bs.map(b => L[t].block[b][i])); });
      vals.push(J.solo[fmtSel][rate]);
      const lo = Math.min(...vals), hi = Math.max(...vals);
      P.domain({ y: [Math.floor((lo - 0.15) * 4) / 4, Math.ceil((hi + 0.15) * 4) / 4] });
      P.clear();
      rule(P, { x: J.synthetic.true_b, label: 'true block length', dash: '2 4' });
      rule(P, { y: J.solo[fmtSel][rate], label: `solo (global): ${fmt(J.solo[fmtSel][rate], 2)}`, color: 'var(--ink-3)' });
      const tags = show === 'both' ? ['orig', 'shuf'] : [show];
      tags.forEach(t => {
        const c = t === 'orig' ? series(0) : series(1);
        const pts = bs.map(b => [b, L[t].block[b][i]]).concat([[T, L[t].request[i]]]);
        line(P, pts, { color: c, dash: t === 'shuf' ? '6 5' : false, markers: 4, tip: ([b, v]) => `<b>${t === 'orig' ? 'original' : 'shuffled'}</b>, ${b === T ? 'request scope (the whole sequence)' : 'block of ' + fmtB(b)}<br>${fmt(v, 3)} bpe` });
        line(P, [[200, L[t].global[i]], [T * 1.25, L[t].global[i]]], { color: series(2), dash: t === 'shuf' ? '2 4' : '7 4', width: 1.6 });
        const ry = L[t].request[i];
        dot(P.g.top, P.x(T), P.y(ry), 6 * P.fs, series(4));
      });
      const g = J.gains[fmtSel]['loc+flag'];
      const f = k => `${fmtS(g.orig[rate][k], 3)} → <b>${fmtS(g.shuf[rate][k], 3)}</b>`;
      ro.set([
        [tex('\\vgainreq') + ' original → shuffled', f('gainreq')],
        [tex('\\vgainblk') + ' original → shuffled', f('gainblk')],
        ['best block, original', `b = ${fmtB(g.orig[rate].best_b)}, ${fmt(g.orig[rate].bpe_best, 3)} bpe`],
      ]);
    }
    draw();
  };

  /* =================================================================
     IX.4 — planGpuFit: does the dump fit a 16 GB GPU?
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
      seg([['a', 'Qwen3.5-2B'], ['b', 'Qwen3-1.7B']], mk, v => { mk = v; draw(); }, 'model'),
      slider('context dumped', 12, 17, 1, lc, v => { lc = v; draw(); }, v => `${fmtB(pow2(v))} tokens`),
    ), legend([['weights (BF16)', series(0), 'box'], ['KV cache (BF16)', series(1), 'box'], ['working memory (assumed)', series(5), 'box'], ['16 GB', 'var(--bad)', 'dash']]), bar, h('div', { class: 'kpis' }, tiles.kv, tiles.tot, tiles.room));
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
     IX.5 — planE4m3: round a value to E4M3, find its index and its byte
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
     IX.5 — planHumps: the codes of one channel, and three entropy models
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
    const P = Plot(box, { x: [-128, 128], y: [0, 0.05], h: 300, xlabel: 'code (index space)', ylabel: 'share of values', yfmt: v => fmtPct(v, 0), label: 'histogram of codes of one channel' });
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
     IX.6 — planDistance: bits saved against token distance, with the shuffle
     ================================================================= */
  FIG.planDistance = (host) => {
    const T = 16384, r = rng('plan-distance');
    const noise = Float64Array.from(range(T), () => r.normal());
    const blockDraws = Float64Array.from(range(T), () => r.normal());
    const perm = r.shuffle(range(T));
    const req = 0.6;                                     // request offset share is irrelevant to a single sequence
    let lb = 11, share = 0.5;
    const box = h('div'), ro = readout();
    host.append(controls(
      slider('true block length', 8, 13, 1, lb, v => { lb = v; draw(); }, v => `${fmtB(pow2(v))} tokens`),
      slider('block share', 0, 0.9, 0.05, share, v => { share = v; draw(); }, v => fmtPct(v, 0)),
    ), legend([['original sequence', series(0), 'line'], ['shuffled tokens', series(1), 'dash'], ['theory (one channel, Gaussian)', series(2), 'dash']]), box, ro);
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
      rule(P, { x: Lb, label: 'true block length', dash: '2 4' });
      line(P, th, { color: series(2), dash: '2 3', width: 1.6, name: 'theory' });
      line(P, a, { color: series(0), markers: 3.5, name: 'original' });
      line(P, s, { color: series(1), dash: '6 5', name: 'shuffled' });
      const loc = 0.5 * Math.log2(1 / (1 - share));       // location gain at b = true length, one channel
      ro.set([['at Δ = 1', `${fmt(a[0][1], 3)} bits`], [`at Δ = ${fmtB(Lb)}`, `${fmt(a[lb][1], 3)} bits`], ['shuffled, Δ = 1', `${fmt(s[0][1], 3)} bits`], ['location gain at b = true length', `${fmt(loc, 3)} bits`]]);
    }
    draw();
  };

  /* =================================================================
     IX.7 — planLadderGrid: what each rung pays at each scope
     ================================================================= */
  FIG.planLadderGrid = (host) => {
    const d = 1024, SET = 3, L = 32768;
    const rungs = [
      { name: 'loc', w: 1 + SET, side: () => 0, note: 'location per channel + coder settings' },
      { name: 'KLT bound', bound: true, note: 'computed from the eigenvalues; nothing is coded, nothing charged' },
      { name: 'KLT rank 16', w: 32 + SET, side: () => 16 * 8 / d, note: '16 basis vectors in BF16; 16 coefficients per entry at 8 bits (assumed)' },
      { name: 'VQ 256 × 64-dim', w: 256 + SET, side: () => 8 / 64, note: '16 sub-codebooks of 256 centroids; one byte per 64 elements' },
      { name: 'sib', w: SET, side: b => Math.log2(b) / d, noGlobal: true, note: 'pointer to the nearest sibling in the same block' },
    ];
    const scopes = [['global', 0], ['request', L], ['block 8K', 8192], ['block 2K', 2048], ['block 512', 512]];
    let what = 'total';
    const wrap = h('div');
    host.append(controls(seg([['share', 'dictionary share'], ['side', 'per-entry tax'], ['total', 'both']], what, v => { what = v; draw(); }, 'show')),
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
     IX.8 — planTimeline: the long weekend, slot by slot
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
     IX.9 — planDecision: two scope gains in, one row of the rule out
     ================================================================= */
  FIG.planDecision = (host) => {
    let [gr, gb] = (() => { const g = DS.spec('plan-ladder').helpers.J.gains.int8['loc+flag'].orig.entropy; return [g.gainreq, g.gainblk]; })();
    const rows = [
      { id: 'blk', cond: '$\\vgainreq + \\vgainblk \\ge 0.75$ and $\\vgainblk \\ge 0.4$', read: 'fallen-apple similarity is real and block-scale', next: 'wave 2 with block scope', c: series(0) },
      { id: 'req', cond: '$\\vgainreq + \\vgainblk \\ge 0.75$ but $\\vgainblk < 0.15$', read: 'real, but per-request ("requestdiff")', next: 'wave 2 with request scope; framework C optional', c: series(2) },
      { id: 'gap', cond: '$\\vgainreq + \\vgainblk \\ge 0.75$ and $0.15 \\le \\vgainblk < 0.4$', read: '<b>no row in the source</b> — both scales carry structure', next: 'our proposal: wave 2 with both scopes; framework C decides', c: series(4) },
      { id: 'mid', cond: '$0.25 \\le \\vgainreq + \\vgainblk < 0.75$', read: 'marginal; hinges on w, the victim tier and lever 2', next: 'run framework C; decide on the cost model', c: series(3) },
      { id: 'neg', cond: '$\\vgainreq + \\vgainblk < 0.25$', read: '8-bit KV has no usable conditional structure', next: 'publish the negative; pivot to a global fixed-length miss-path coder', c: series(1) },
    ];
    const rowOf = (x, y) => (x + y >= 0.75 ? (y >= 0.4 ? 'blk' : y < 0.15 ? 'req' : 'gap') : x + y >= 0.25 ? 'mid' : 'neg');
    const box = h('div'), ro = readout();
    const s1 = slider(texify('$\\vgainreq$ (bits)'), 0, 1.5, 0.01, gr, v => { gr = v; draw(); });
    const s2 = slider(texify('$\\vgainblk$ (bits)'), 0, 1.5, 0.01, gb, v => { gb = v; draw(); });
    const G = (f, rate) => { const g = DS.spec('plan-ladder').helpers.J.gains[f]['loc+flag'].orig[rate]; return [g.gainreq, g.gainblk]; };
    const presets = [['synthetic, INT8, entropy', ...G('int8', 'entropy')], ['synthetic, INT8, fixed-length', ...G('int8', 'fixed')], ['synthetic, E4M3, fixed-length', ...G('e4m3', 'fixed')]];
    const tbl = h('div', { class: 'pl-dec' });
    host.append(controls(s1, s2), controls(...presets.map(([l, a, b]) => btn(l, () => { gr = a; gb = b; s1.set(a); s2.set(b); draw(); }, { cls: 'sm' }))), h('div', { class: 'fig-row' }, box, tbl), ro);
    const P = Plot(box, { x: [0, 1.5], y: [0, 1.5], h: 360, w: 420, xlabel: 'g_req (bits per element)', ylabel: 'g_blk (bits per element)', label: 'decision regions in the plane of the two scope gains' });
    const poly = (pts, c, op = 0.2) => el('polygon', { points: pts.map(([x, y]) => `${P.x(x)},${P.y(y)}`).join(' '), style: `fill:${c};opacity:${op};stroke:${c};stroke-width:1` }, P.g.bg);
    poly([[0, 0], [0.25, 0], [0, 0.25]], series(1));
    poly([[0.25, 0], [0.75, 0], [0, 0.75], [0, 0.25]], series(3));
    poly([[0.75, 0], [1.5, 0], [1.5, 0.15], [0.6, 0.15]], series(2));
    poly([[0.6, 0.15], [1.5, 0.15], [1.5, 0.4], [0.35, 0.4]], series(4), 0.32);
    poly([[0.35, 0.4], [1.5, 0.4], [1.5, 1.5], [0, 1.5], [0, 0.75]], series(0));
    [['block scope', 0.75, 1.1], ['request scope', 1.12, 0.07], ['the gap', 1.05, 0.27], ['marginal', 0.3, 0.2], ['no', 0.07, 0.07]].forEach(([t, x, y]) =>
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
      ro.set([[tex('\\vgainreq + \\vgainblk'), `${fmt(gr + gb, 2)} bits`], ['row', R.id === 'gap' ? 'none (the gap)' : R.read], ['next', R.next]]);
    }
    draw();
  };

  /* =================================================================
     IX.10 — planSelections: exact top-k on a synthetic sequence, as a raster
     ================================================================= */
  FIG.planSelections = (host) => {
    let strength = 1.5, drift = 0.15;
    const box = h('div'), ro = readout();
    host.append(controls(
      slider('topic strength', 0, 3, 0.25, strength, v => { strength = v; redraw(); }, v => fmt(v, 2)),
      slider('query drift', 0.01, 0.5, 0.01, drift, v => { drift = v; redraw(); }, v => fmt(v, 2)),
    ), box, ro);
    const nb = TR.n / TR.b, XB = 64, YB = 60;
    const P = Plot(box, { x: [0, TR.n], y: [TR.steps, 0], h: 340, xlabel: 'position (16 blocks of 256)', ylabel: 'decode step', xticks: range(0, TR.n + 1, 512), grid: false, label: 'selected positions by decode step' });
    const redraw = throttleRAF(draw);
    function draw() {
      const sel = makeTrace(strength, drift);
      const H = range(YB).map(() => new Float64Array(XB));
      sel.forEach((S, s) => S.forEach(p => { H[Math.floor(s * YB / TR.steps)][Math.floor(p * XB / TR.n)]++; }));
      const per = TR.k * (TR.steps / YB) * (XB / TR.n) * TR.n / XB;   // selections per cell if spread evenly
      P.clear('data', 'top', 'bg');
      for (let j = 1; j < nb; j++) el('line', { x1: P.x(j * TR.b), x2: P.x(j * TR.b), y1: P.y(0), y2: P.y(TR.steps), style: 'stroke:var(--rule);stroke-width:1;opacity:.6' }, P.g.bg);
      const mx = Math.max(...H.map(r => Math.max(...r)));
      const cw = P.x(TR.n / XB) - P.x(0), ch = P.y(TR.steps / YB) - P.y(0);
      H.forEach((row, yi) => row.forEach((v, xi) => {
        if (!v) return;
        el('rect', { x: P.x(xi * TR.n / XB), y: P.y(yi * TR.steps / YB), width: cw + 0.3, height: ch + 0.3, style: `fill:var(--lapis);opacity:${(0.08 + 0.92 * v / mx).toFixed(3)}` }, P.g.data);
      }));
      // block concentration: share of each step's selections in its top 1, 2, 4 blocks; top-block lifetime
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
      ro.set([['top 1 block holds', fmtPct(shares[0] / TR.steps, 0)], ['top 2 blocks', fmtPct(shares[1] / TR.steps, 0)], ['top 4 blocks', fmtPct(shares[2] / TR.steps, 0)],
        ['heaviest block stays heaviest', `${fmt(TR.steps / runs, 1)} steps on average`], ['if spread evenly', `top 1 = ${fmtPct(1 / nb, 1)}`]]);
      void per;
    }
    draw();
  };

  /* =================================================================
     IX.11 — planReplaySweep: f_D and n_load against resident dictionaries
     ================================================================= */
  FIG.planReplaySweep = (host) => {
    let strength = 1.5;
    const nDs = [1, 2, 4, 8, 16];
    const b1 = h('div'), b2 = h('div'), ro = readout();
    host.append(controls(slider('topic strength', 0, 3, 0.25, strength, v => { strength = v; redraw(); }, v => fmt(v, 2))),
      legend([['heaviest blocks resident', series(0), 'line'], ['LRU of blocks hit by a miss', series(1), 'dash']]), h('div', { class: 'fig-row' }, b1, b2), ro);
    const P1 = Plot(b1, { x: [1, 16], xlog: 2, y: [0, 1], w: 420, h: 330, xlabel: 'resident dictionaries n_D', ylabel: 'δ-miss fraction f_D', xticks: nDs, yfmt: v => fmtPct(v, 0), label: 'delta-miss fraction against resident dictionaries' });
    const P2 = Plot(b2, { x: [1, 16], xlog: 2, y: [0, 4], w: 420, h: 330, xlabel: 'resident dictionaries n_D', ylabel: 'loads per step n_load', xticks: nDs, label: 'dictionary loads per step against resident dictionaries' });
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
      rule(P2, { y: 0.1, label: '0.1 (heavy w break-even)', dash: '2 4' });
      res.forEach((rs, i) => {
        line(P1, rs.map((r, k) => [nDs[k], r.fD]), { color: series(i), dash: i ? '6 5' : false, markers: 4, tip: ([n, v]) => `n_D = ${n}: f_D = ${fmtPct(v, 1)}` });
        line(P2, rs.map((r, k) => [nDs[k], r.nload]), { color: series(i), dash: i ? '6 5' : false, markers: 4, tip: ([n, v]) => `n_D = ${n}: ${fmt(v, 2)} loads per step` });
      });
      const ms = [1, 2, 4].map(f => replay(sel, f * TR.k, TR.b, 1, 'lru').m);
      ro.set([['token miss rate, B = k, 2k, 4k', ms.map(v => fmtPct(v, 1)).join(' · ')], ['f_D at n_D = 4 (heaviest)', fmtPct(res[0][2].fD, 0)], ['n_load at n_D = 4 (heaviest)', fmt(res[0][2].nload, 2)]]);
    }
    draw();
  };

  /* =================================================================
     IX.12 — planFrontier: requests per GPU against link bandwidth
     ================================================================= */
  FIG.planFrontier = (host) => {
    const k = 2048, NL = 78, e = 640, tpot = 0.03, HBM = 30e9;
    const missOf = { 2048: 0.30, 4096: 0.134, 8192: 0.067 };
    let B = 4096, rho = 0.75, w = 256;
    const box = h('div'), ro = readout();
    host.append(controls(
      seg([[2048, 'B = 2K'], [4096, 'B = 4K'], [8192, 'B = 8K']], B, v => { B = v; draw(); }, 'hot cache'),
      slider(texify('delta ratio $\\vrho$'), 0.4, 1, 0.01, rho, v => { rho = v; draw(); }),
      slider(texify('$\\vwres$ (entries)'), 0, 1024, 16, w, v => { w = v; draw(); }),
    ), legend([['HiSparse', series(1), 'line'], ['kv-blockdiff, request scope', series(0), 'line']]), box, ro);
    const P = Plot(box, { x: [16, 1000], xlog: true, y: [0, 400], h: 330, xticks: [16, 50, 100, 200, 450, 1000], xfmt: v => String(v), xlabel: 'link bandwidth W_link (GB/s)', ylabel: 'requests per GPU N', label: 'requests per GPU against link bandwidth' });
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
      line(P, kb, { color: series(0), name: 'kv-blockdiff' });
      const [hl, hm] = N(50, 1, 0), [kl, km] = N(50, rho, w);
      const n0 = Math.min(hl, hm), n1 = Math.min(kl, km);
      ro.set([['HiSparse at 50 GB/s', `${fmt(n0, 0)} (${hl < hm ? 'link' : 'HBM'}-bound)`], ['kv-blockdiff at 50 GB/s', `${fmt(n1, 0)} (${kl < km ? 'link' : 'HBM'}-bound)`], ['gain', `${fmt(n1 / n0, 2)}×`]]);
    }
    draw();
  };

  /* =================================================================
     IX.15 — planRisks: risk cards, filtered by when we would find out
     ================================================================= */
  FIG.planRisks = (host) => {
    const R = [
      { id: 'R1', when: 'w1', q: 'Q1', title: '8-bit KV has no usable conditional structure', know: 'wave 1, shuffle-controlled: scope gains below 0.25 bit', pivot: 'Publish the negative with the BF16 column; build the global fixed-length miss-path coder (solo coding for sparse decode): ~1.1–1.3× for free, no residency.' },
      { id: 'R2', when: 'w1', q: 'Q1', title: 'Gains only on keys; values stay at the solo rate', know: 'the K/V split of Table 1', pivot: 'ρ capped near 0.85 for the whole entry; still worth it if the victim tier or lever 2 also pays; decided in framework D.' },
      { id: 'R3', when: 'w1', q: 'Q3', title: 'Gains only at request scope', know: 'g_blk small', pivot: '"requestdiff": one dictionary per request per layer, no dictionary cache. Simpler, still new.' },
      { id: 'R4', when: 'w1', q: 'Q2', title: 'Only heavy dictionaries (VQ) capture the gain', know: 'VQ beats loc + KLT by a margin', pivot: 'Residency decides (Q3); product-quantization sub-codebooks ≤ 32 KB keep the decoder in shared memory; shared prefixes may make heavy dictionaries free.' },
      { id: 'R5', when: 'w1', q: 'Q2', title: 'The E4M3 index space hides structure that floats show', know: '1a gains ≫ 1b gains on E4M3 (our synthetic set: 0.80 bit entropy vs 0.22 bit fixed-length)', pivot: 'Report INT8 with a per-channel scale as an equal 8-bit storage format; keep the per-channel predict-or-not flag in every E4M3 dictionary.' },
      { id: 'R6', when: 'w1', q: 'Q1', title: 'The 2B proxy is unrepresentative', know: 'disagreement with Qwen3-1.7B', pivot: 'Replicate on Qwen3-1.7B (planned); later on an MLA model’s latent vectors.' },
      { id: 'R7', when: 'w2', q: 'Q3', title: 'Misses do not concentrate into blocks', know: 'framework C: f_D low at n_D = 8', pivot: 'Light all-resident dictionaries (w ≤ 32) or request scope; heavy dictionaries are out.' },
      { id: 'R8', when: 'later', q: 'Q2', title: 'The decoder cannot run at gather speed', know: 'only in phase 2; the fixed-length rate predicts the format', pivot: 'Fixed-length deltas only on the miss path; the victim tier (decode on promotion) instead of full lever 2.' },
      { id: 'R9', when: 'read', q: '—', title: 'Prior art already covers it', know: 'the papers of Part V', pivot: 'What is new: lossless at 8 bits; the neighbour measurement with controls; the random-access miss path; the residency economics.' },
      { id: 'R10', when: 'w1', q: 'Q1', added: true, title: 'Two calibration sequences are too few', know: 'the shuffled g_req (the calibration gap): 0.22 bit with 2 calibration sequences on synthetic data', pivot: 'Dump 8–32 calibration sequences (cheap: 200 MB each); report g_req minus its shuffled value.' },
      { id: 'R11', when: 'w1', q: 'Q2', added: true, title: 'The entropy model is the wrong shape on E4M3', know: 'solo E4M3 costs more than 8 bits under the index-space Laplace (8.4 on synthetic data)', pivot: 'Use the grid-aware model for the entropy column (done in the harness); keep the index-space one for INT8 only.' },
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
})();
