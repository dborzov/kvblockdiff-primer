/* Part III — Where things stand. Figures for the pages on decoding, attention, the KV cache,
   sparse attention, HiSparse and the reference numbers. See docs/figures.md.
   All numbers are either toy numbers (marked illustrative in the captions) or the reference
   setting of III.10, which is frozen in REF below. */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------ the reference setting (III.10)
  // HiSparse's GLM-5.1 deployment converted to 8-bit storage. Every derived number on
  // III.5, III.9 and III.11 is computed from these.
  const REF = {
    NL: 78,              // sparse layers
    k: 2048,             // selections per layer per step
    L: 100384,           // context length of the trace (tokens)
    eBF16: 1280,         // bytes per entry in BF16 (100 KB per token / 78 layers, rounded)
    e: 640,              // bytes per entry at 8 bits
    tpot: 0.030,         // seconds per decode step
    Wlink: 50e9,         // practical PCIe Gen5 x16 bandwidth, bytes/s (64 nominal)
    WlinkNominal: 64e9,
    Mhbm: 30e9,          // GPU memory for KV per GPU, bytes
    miss: { 2048: 0.30, 4096: 0.134, 8192: 0.067 },   // HiSparse's LRU points
    belady4096: 0.082, fifo4096: 0.172, random4096: 0.161,
  };
  const GB = 1e9, MB = 1e6;
  const fmtGB = (b, d = 1) => `${fmt(b / GB, d)} GB`;
  const fmtMB = (b, d = 0) => `${fmt(b / MB, d)} MB`;
  const fmtInt = v => Math.round(v).toLocaleString('en-US');
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;

  // =====================================================================
  // III.1 — prefill and decode on a toy model: the grid of cells grows
  // =====================================================================
  FIG.decodeGrid = (host) => {
    const TOK = ['The', ' weather', ' on', ' Gull', ' Rock', ' is', ' fog', 'gy', ',', ' and', ' cold'];
    const PROMPT = 6, LAYERS = 4, COLS = 10;
    const show = s => s.replace(/^ /, '␣');
    const steps = [{ n: 0, kind: 'start' }, { n: PROMPT, kind: 'prefill' }];
    for (let n = PROMPT + 1; n <= COLS; n++) steps.push({ n, kind: 'decode' });

    const D = Diagram(host, { w: 640, h: 250, grow: 0.3, label: 'Grid of layers by token positions, filling up during prefill and decode' });
    const g = el('g', {}, D.svg);
    const ro = readout();
    host.append(ro);
    const x0 = 78, cw = 54, ch = 30, gap = 6, top = 46;
    const cx = c => x0 + c * cw;
    const ry = l => top + (LAYERS - 1 - l) * (ch + gap);

    stepper(host, {
      steps,
      label: (s) => {
        if (s.kind === 'start') return `The prompt “${TOK.slice(0, PROMPT).join('')}” arrives: ${PROMPT} tokens, nothing stored yet.`;
        if (s.kind === 'prefill') return `<b>Prefill:</b> all ${PROMPT} prompt tokens climb the ${LAYERS} layers together and leave their cells. Out comes the first new token, “${show(TOK[PROMPT])}”.`;
        const t = s.n - 1;
        return `<b>Decode step ${s.n - PROMPT}:</b> “${show(TOK[t])}” climbs the layers, leaves one cell per layer and looks back at all ${s.n} cells of each layer. Out comes “${show(TOK[s.n])}”.`;
      },
      render(i, s) {
        g.replaceChildren();
        const fs = D.fs;
        for (let l = 0; l < LAYERS; l++) el('text', { x: 40, y: ry(l) + ch / 2 + 4, class: 'val', 'text-anchor': 'middle', text: `l = ${l}` }, g);
        for (let c = 0; c < COLS; c++) {
          const stored = c < s.n, isNew = s.kind === 'decode' ? c === s.n - 1 : s.kind === 'prefill' && c < PROMPT;
          const looked = s.kind === 'decode' && c < s.n;
          for (let l = 0; l < LAYERS; l++) {
            const fill = !stored ? 'var(--paper)' : looked ? mix('var(--c)', 30) : mix('var(--t-entry)', s.kind === 'prefill' ? 34 : 18);
            const r = el('rect', {
              x: cx(c) + 3, y: ry(l), width: cw - gap, height: ch, rx: 5,
              style: `fill:${fill};stroke:${isNew && s.kind === 'decode' ? 'var(--c)' : 'var(--rule)'};stroke-width:${isNew && s.kind === 'decode' ? 2.6 : 1};${stored ? '' : 'stroke-dasharray:3 3;opacity:.55'}`,
            }, g);
            hover(r, () => stored ? `<b>token ${c} (“${show(TOK[c])}”), layer ${l}</b><br>the cell this token left at this layer${looked ? '<br><i>looked at in this step</i>' : ''}` : `<b>position ${c}</b><br>not written yet`);
          }
          const tx = cx(c) + 3 + (cw - gap) / 2, ty = ry(0) + ch + 14 * fs;
          el('text', { x: tx, y: ty, class: 'mono', 'text-anchor': 'end', transform: `rotate(-38 ${tx} ${ty})`,
            style: `font-size:calc(12px * var(--fs));fill:${c < s.n ? 'var(--ink)' : 'var(--ink-3)'};${c < PROMPT ? 'font-weight:600' : ''}`, text: show(TOK[c]) }, g);
          el('text', { x: tx, y: top - 8, class: 'val', 'text-anchor': 'middle', style: 'fill:var(--ink-3)', text: c }, g);
        }
        el('text', { x: x0 - 4, y: top - 8, class: 'lbl', 'text-anchor': 'end', text: 't =' }, g);
        if (s.n > 0 && s.n < TOK.length) {
          const c = Math.min(s.n, COLS - 1), nx = s.n < COLS ? cx(c) + cw / 2 : cx(COLS - 1) + cw / 2;
          if (s.n < COLS) {
            el('rect', { x: cx(s.n) + 3, y: ry(LAYERS - 1), width: cw - gap, height: LAYERS * (ch + gap) - gap, rx: 6, style: 'fill:none;stroke:var(--c);stroke-dasharray:5 4;stroke-width:1.6' }, g);
          }
          el('text', { x: nx, y: top - 26, class: 'annot', 'text-anchor': s.n < COLS ? 'middle' : 'end', text: `next: “${show(TOK[s.n])}”` }, g);
        }
        const stored = LAYERS * s.n;
        const lookedAt = s.kind === 'decode' ? `${LAYERS} × ${s.n} = ${LAYERS * s.n}` : s.kind === 'prefill'
          ? `${LAYERS} × (1 + 2 + … + ${PROMPT}) = ${LAYERS * PROMPT * (PROMPT + 1) / 2}, in one parallel pass` : '0';
        ro.set([['phase', s.kind === 'start' ? 'waiting' : s.kind], ['tokens stored', s.n], ['cells stored', `${LAYERS} × ${s.n} = ${stored}`], ['cells looked at in this step', lookedAt]]);
      },
    });
  };

  // =====================================================================
  // III.2 — attention as a soft lookup: drag the query, watch the weights
  // =====================================================================
  FIG.attentionToy = (host) => {
    const TOK = ['The', 'weather', 'on', 'Gull', 'Rock', 'is', 'fog', 'gy'];
    const KEYS = [[-1.1, -0.35], [0.85, 0.85], [-0.55, -0.95], [-0.25, 1.2], [0.3, 1.25], [-1.05, 0.4], [1.25, 0.3], [0.95, -0.45]];
    let q = [2.1, 1.5];
    const box = h('div'), rowBox = h('div', { class: 'fig-row' }), sBox = h('div'), wBox = h('div');
    const mixBar = h('div', { class: 'ls-mix', role: 'img', 'aria-label': 'The output as a mix of the eight values' });
    const ro = readout();
    host.append(h('div', { class: 'fig-note', text: 'Drag the query (the accent knob), or focus it and use the arrow keys.' }), box, rowBox, h('div', { class: 'ls-mix-wrap' }, h('span', { class: 'ls-mix-lbl', text: 'output = mix of values' }), mixBar), ro);
    rowBox.append(sBox, wBox);

    const P = Plot(box, { x: [-3, 3], y: [-2.4, 2.4], equal: true, w: 560, h: 400, xlabel: 'element 0', ylabel: 'element 1', label: 'Keys and the query as points in two dimensions' });
    const keyG = el('g', {}, P.g.data), qG = el('g', {}, P.g.data);
    KEYS.forEach(([x, y], i) => {
      el('line', { x1: P.x(0), y1: P.y(0), x2: P.x(x), y2: P.y(y), style: `stroke:${series(i)};stroke-width:1.5;opacity:.5` }, keyG);
      const d = dot(keyG, P.x(x), P.y(y), 6 * P.fs, series(i));
      hover(d, () => `<b>key of “${TOK[i]}”</b><br>(${fmt(x)}, ${fmt(y)})<br>score q·key = ${fmt(score(i), 2)}`);
      const dx = x >= 0 ? 9 : -9;
      el('text', { x: P.x(x) + dx * P.fs, y: P.y(y) - 8 * P.fs, class: 'lbl', 'text-anchor': x >= 0 ? 'start' : 'end', text: TOK[i] }, keyG);
    });
    const qLine = el('line', { style: 'stroke:var(--c);stroke-width:2.6' }, qG);
    const qLbl = el('text', { class: 'lbl', text: 'query q' }, P.g.top);
    const knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
    draggable(knob, P, ([x, y]) => { q = [clamp(x, -2.9, 2.9), clamp(y, -2.1, 2.1)]; draw(); }, null,
      { get: () => q, step: [0.1, 0.1], label: 'the query vector' });
    hover(knob, () => `<b>query</b> (${fmt(q[0])}, ${fmt(q[1])})<br>length ${fmt(Math.hypot(...q))}`);

    const SP = Plot(sBox, { ycats: TOK, x: [-5, 5], h: 340, xlabel: 'score q·key', grid: 'x', label: 'Scores of the eight keys' });
    const WP = Plot(wBox, { ycats: TOK, x: [0, 1], h: 340, xlabel: 'weight (softmax)', xfmt: v => fmtPct(v, 0), grid: 'x', label: 'Softmax weights of the eight keys' });
    function score(i) { return q[0] * KEYS[i][0] + q[1] * KEYS[i][1]; }
    function draw() {
      const s = KEYS.map((_, i) => score(i));
      const mx = Math.max(...s), ex = s.map(v => Math.exp(v - mx)), Z = sum(ex), w = ex.map(v => v / Z);
      qLine.setAttribute('x1', P.x(0)); qLine.setAttribute('y1', P.y(0));
      qLine.setAttribute('x2', P.x(q[0])); qLine.setAttribute('y2', P.y(q[1]));
      knob.setAttribute('cx', P.x(q[0])); knob.setAttribute('cy', P.y(q[1]));
      qLbl.setAttribute('x', P.x(q[0]) + 12 * P.fs); qLbl.setAttribute('y', P.y(q[1]) + 18 * P.fs);
      SP.clear(); WP.clear();
      bars(SP, s.map(v => clamp(v, -4.6, 4.6)), { horizontal: true, colors: i => series(i), labels: (v, i) => fmt(s[i], 1), tip: (v, i) => `<b>${TOK[i]}</b><br>score ${fmt(s[i], 2)}` });
      bars(WP, w, { horizontal: true, colors: i => series(i), labels: v => (v >= 0.005 ? fmtPct(v, 0) : ''), tip: (v, i) => `<b>${TOK[i]}</b><br>weight ${fmtPct(v, 1)}` });
      mixBar.replaceChildren(...w.map((v, i) => h('span', { class: 'ls-mix-seg', style: `flex:${v} 1 0;background:${series(i)}`, title: `${TOK[i]}: ${fmtPct(v, 1)}` })));
      const order = w.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
      ro.set([
        ['largest weight', `${TOK[order[0][1]]} ${fmtPct(order[0][0], 0)}`],
        ['top two together', fmtPct(order[0][0] + order[1][0], 0)],
        ['all eight weights add up to', fmtPct(sum(w), 0)],
        ['query length', fmt(Math.hypot(...q), 2)],
      ]);
    }
    draw();
  };

  // =====================================================================
  // III.3 — what one entry holds, for three models
  // =====================================================================
  FIG.entryAnatomy = (host) => {
    const MODELS = {
      toy: { name: 'the toy of III.2', layers: 4, parts: [['K, head 0', 16, 'k'], ['K, head 1', 16, 'k'], ['V, head 0', 16, 'v'], ['V, head 1', 16, 'v']], note: '2 KV heads × 16 numbers × (key and value)' },
      qwen: { name: 'Qwen3.5-2B', layers: 6, parts: [['K, head 0', 256, 'k'], ['K, head 1', 256, 'k'], ['V, head 0', 256, 'v'], ['V, head 1', 256, 'v']], note: '2 KV heads × 256 numbers × (key and value); only its 6 full-attention layers keep entries' },
      glm: { name: 'GLM-5.1-class (MLA)', layers: 78, parts: [['one compressed vector (keys and values are rebuilt from it)', 640, 'l']], note: 'one latent vector of ≈ 640 numbers per token per layer (≈ 100 KB per token in BF16 over 78 layers)' },
    };
    let model = 'qwen', bits = 8;
    const strip = h('div', { class: 'ls-strip', role: 'img' });
    const note = h('div', { class: 'fig-note' });
    const tiles = { d: kpi('numbers per entry', ''), e: kpi(`bytes per entry ${tex('\\ve')}`, '', '', 'var(--t-entry)'), n: kpi('entries per token', '', 'one per layer'), tok: kpi('bytes per token', '', 'all layers') };
    host.append(controls(
      seg([['toy', 'toy model'], ['qwen', 'Qwen3.5-2B'], ['glm', 'GLM-5.1-class']], model, v => { model = v; draw(); }, 'model'),
      seg([[16, 'BF16 (16 bits)'], [8, '8 bits']], bits, v => { bits = v; draw(); }, 'number format'),
    ), strip, note, h('div', { class: 'kpis' }, tiles.d, tiles.e, tiles.n, tiles.tok));
    function draw() {
      const M = MODELS[model], d = sum(M.parts.map(p => p[1])), e = d * bits / 8;
      strip.setAttribute('aria-label', `One entry of ${M.name}: ${d} numbers`);
      strip.replaceChildren(...M.parts.map(([lab, n, kind]) => {
        const seg_ = h('span', { class: `ls-strip-seg is-${kind}`, style: `flex:${n} 1 0` }, h('span', { class: 'ls-strip-lbl', text: `${lab} · ${n}` }));
        hover(seg_, () => `<b>${lab}</b><br>${n} numbers × ${bits} bits = ${fmtInt(n * bits / 8)} bytes`);
        seg_.tabIndex = 0;
        return seg_;
      }));
      note.innerHTML = `${M.name}: ${M.note}.`;
      tiles.d.set(fmtInt(d));
      tiles.e.set(e >= 1000 ? `${fmt(e / 1000, 2)} KB` : `${fmtInt(e)} B`, `${d} × ${bits / 8} byte${bits > 8 ? 's' : ''}`);
      tiles.n.set(M.layers);
      tiles.tok.set(e * M.layers >= 1000 ? `${fmt(e * M.layers / 1000, 1)} KB` : `${fmtInt(e * M.layers)} B`, `${M.layers} × ${tex('\\ve')}`);
    }
    draw();
  };

  // =====================================================================
  // III.3 — RoPE: one pair of key channels before and after the rotation
  // =====================================================================
  FIG.ropeSpin = (host) => {
    const N = 64, r = rng('landscape-rope');
    const pre = range(N).map(() => [1.4 + r.normal(0, 0.18), 0.35 + r.normal(0, 0.18)]);   // illustrative keys
    let after = true, deg = 23;
    const box = h('div'), ro = readout();
    const sw = seg([[false, 'before RoPE'], [true, 'after RoPE']], after, v => { after = v; draw(); }, 'which keys');
    const sl = slider('rotation per position', 0, 90, 1, deg, v => { deg = v; draw(); }, v => `${v}°`);
    host.append(controls(sw, sl), legend([['early positions', series(0), 'dot'], ['late positions', series(1), 'dot']]), box, ro);
    const P = Plot(box, { x: [-2, 2], y: [-2, 2], equal: true, h: 340, xlabel: 'key channel 2c', ylabel: 'key channel 2c+1', label: 'One pair of key channels for 64 tokens' });
    const g = el('g', {}, P.g.data);
    const pts = () => pre.map(([x, y], t) => {
      if (!after) return [x, y];
      const a = t * deg * Math.PI / 180;
      return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    });
    function draw() {
      g.replaceChildren();
      const ps = pts();
      el('circle', { cx: P.x(0), cy: P.y(0), r: Math.abs(P.x(Math.hypot(1.4, 0.35)) - P.x(0)), style: 'fill:none;stroke:var(--rule);stroke-dasharray:3 4' }, g);
      ps.forEach(([x, y], t) => {
        const c = `color-mix(in srgb, ${series(1)} ${Math.round(100 * t / (N - 1))}%, ${series(0)})`;
        const d = dot(g, P.x(x), P.y(y), 4.2 * P.fs, c);
        hover(d, () => `<b>token t = ${t}</b><br>(${fmt(x)}, ${fmt(y)})${after ? `<br>turned by ${t} × ${deg}° = ${t * deg}°` : ''}`);
      });
      const sd = i => Math.sqrt(variance(ps.map(p => p[i])));
      const sd0 = i => Math.sqrt(variance(pre.map(p => p[i])));
      ro.set([['spread of channel 2c', `${fmt(sd(0), 2)} (before RoPE ${fmt(sd0(0), 2)})`], ['spread of channel 2c+1', `${fmt(sd(1), 2)} (before RoPE ${fmt(sd0(1), 2)})`]]);
    }
    draw();
  };

  // =====================================================================
  // III.4 — dense versus sparse reading: which entries one step reads
  // =====================================================================
  // A toy selection generator shared by the reading grid and the Lucky Louis raster:
  // each layer has a slowly moving "topic" bump over positions plus fixed per-position noise.
  function toySelector(seed, layers, maxPos, k, drift) {
    const r = rng(seed);
    const noise = range(layers).map(() => range(maxPos).map(() => r.normal(0, 1)));
    const phase = range(layers).map(() => r.uniform(0, 2 * Math.PI));
    const speed = range(layers).map(() => r.uniform(0.6, 1.4));
    return (l, t) => {          // the k positions layer l selects at step t (positions 0..t stored)
      const c1 = (0.5 + 0.42 * Math.sin(phase[l] + drift * speed[l] * t)) * t;
      const c2 = (0.5 + 0.42 * Math.cos(1.7 * phase[l] + 0.8 * drift * speed[l] * t)) * t;
      const sc = range(t + 1).map(p => 1.1 * noise[l][p] + 2.6 * Math.exp(-((p - c1) ** 2) / 18) + 2.2 * Math.exp(-((p - c2) ** 2) / 10) + (p >= t - 1 ? 1.5 : 0));
      return range(t + 1).sort((a, b) => sc[b] - sc[a]).slice(0, Math.min(k, t + 1)).sort((a, b) => a - b);
    };
  }

  FIG.readingGrid = (host) => {
    const LAYERS = 6, MAXP = 48, K = 6;
    const pick = toySelector('landscape-reading', LAYERS, MAXP, K, 0.05);
    let t = 30, mode = 'sparse';
    const ro = readout();
    const sl = slider(texify('decode step $\\vt$'), 8, MAXP - 1, 1, t, v => { t = v; draw(); });
    const sw = seg([['dense', 'dense: read everything'], ['sparse', 'sparse: read the k picks']], mode, v => { mode = v; draw(); }, 'attention mode');
    host.append(controls(sw, sl));
    const D = Diagram(host, { w: 640, h: 178, grow: 0.25, label: 'Stored and read entries, layers by positions' });
    const g = el('g', {}, D.svg);
    const box = h('div');
    host.append(legend([['entries stored (= read per step by dense attention)', series(0)], ['entries read per step by sparse attention', series(1)]]), box, ro);
    const P = Plot(box, { x: [0, MAXP - 1], y: [0, LAYERS * MAXP], h: 230, xlabel: 'decode step t', ylabel: 'entries', label: 'Entries stored and read per step against the step' });
    const x0 = 64, cw = (640 - x0 - 10) / MAXP, ch = 20, top = 22;
    const ry = l => top + (LAYERS - 1 - l) * (ch + 3);
    function draw() {
      g.replaceChildren();
      for (let l = 0; l < LAYERS; l++) {
        el('text', { x: x0 - 8, y: ry(l) + ch / 2 + 4, class: 'val', 'text-anchor': 'end', text: `l = ${l}` }, g);
        const sel = mode === 'dense' ? null : new Set(pick(l, t));
        for (let p = 0; p < MAXP; p++) {
          const stored = p <= t, read = stored && (!sel || sel.has(p));
          const fill = !stored ? 'var(--paper)' : read ? 'var(--c)' : mix('var(--t-entry)', 22);
          const r = el('rect', { x: x0 + p * cw + 0.8, y: ry(l), width: cw - 1.6, height: ch, rx: 2, style: `fill:${fill};stroke:${stored ? 'none' : 'var(--rule)'};${stored ? '' : 'opacity:.5'}` }, g);
          if (stored) hover(r, () => `<b>layer ${l}, position ${p}</b><br>${read ? 'read at this step' : 'stored, not read at this step'}`);
        }
      }
      el('text', { x: x0 + (t + 0.5) * cw, y: top - 6, class: 'annot', 'text-anchor': 'middle', text: `t = ${t}` }, g);
      el('text', { x: x0 - 8, y: top - 6, class: 'lbl', 'text-anchor': 'end', text: 'layer' }, g);
      P.clear();
      const xs = range(8, MAXP);
      line(P, xs.map(s => [s, LAYERS * (s + 1)]), { color: series(0), name: 'stored' });
      line(P, xs.map(s => [s, LAYERS * Math.min(K, s + 1)]), { color: series(1), name: 'sparse reads' });
      rule(P, { x: t, label: `step ${t}`, color: 'var(--c)' });
      const reads = mode === 'dense' ? LAYERS * (t + 1) : LAYERS * K;
      ro.set([['stored', `${LAYERS} × ${t + 1} = ${LAYERS * (t + 1)} entries`], ['read at this step', `${reads} entries (${mode})`], ['share read', fmtPct(reads / (LAYERS * (t + 1)), 0)]]);
    }
    draw();
  };

  // =====================================================================
  // III.5 — the memory wall: keep everything on the GPU, or fetch everything each step?
  // =====================================================================
  // A horizontal meter (HTML): value against a limit line; red when the limit is crossed.
  function meter(label) {
    const fill = h('span', { class: 'ls-meter-fill' }), lim = h('span', { class: 'ls-meter-lim' });
    const limLbl = h('span', { class: 'ls-meter-limlbl' }), val = h('span', { class: 'ls-meter-val' });
    const track = h('span', { class: 'ls-meter-track' }, fill, lim, limLbl);
    const row = h('div', { class: 'ls-meter' }, h('span', { class: 'ls-meter-lbl', html: label }), track, val);
    row.set = (v, limit, vTxt, limTxt) => {
      const max = Math.max(2 * limit, v * 1.08);
      fill.style.width = `${(100 * v / max).toFixed(2)}%`;
      lim.style.left = limLbl.style.left = `${(100 * limit / max).toFixed(2)}%`;
      limLbl.textContent = limTxt;
      row.classList.toggle('is-over', v > limit);
      val.innerHTML = vTxt;
    };
    return row;
  }
  FIG.memoryWall = (host) => {
    const CTX = [4096, 8192, 16384, 32768, 65536, 100384, 131072, 262144, 524288, 1048576];
    const ctxName = n => (n === 100384 ? '100K (the trace)' : n >= 1048576 ? '1M' : `${n / 1024}K`);
    let ci = 6, reqs = 10, k = 2048, bytesPer = 2;   // BF16
    const d = 640;
    const mMem = meter('GPU memory if every history stays on the GPU');
    const mLink = meter('link traffic if every step fetches all selections');
    const tiles = { kv: kpi('KV per request', ''), bw: kpi('traffic per request', ''), nm: kpi('requests that fit in 30 GB', '', '', 'var(--t-entry)'), nl: kpi('requests a 50 GB/s link feeds', '', '', 'var(--t-hisparse)') };
    host.append(
      controls(
        slider('context length', 0, CTX.length - 1, 1, ci, v => { ci = v; draw(); }, v => ctxName(CTX[v])),
        slider('requests per GPU', 1, 64, 1, reqs, v => { reqs = v; draw(); }),
      ),
      controls(
        seg([[512, 'k = 512'], [1024, '1024'], [2048, '2048'], [4096, '4096']], k, v => { k = v; draw(); }, 'selections per layer per step'),
        seg([[2, 'BF16'], [1, '8 bits']], bytesPer, v => { bytesPer = v; draw(); }, 'number format'),
      ),
      h('div', { class: 'ls-meters' }, mMem, mLink),
      h('div', { class: 'kpis' }, tiles.kv, tiles.bw, tiles.nm, tiles.nl),
    );
    function draw() {
      const e = d * bytesPer, L = CTX[ci];
      const kvReq = L * REF.NL * e, bwReq = k * REF.NL * e / REF.tpot;
      mMem.set(reqs * kvReq, REF.Mhbm, `${fmtGB(reqs * kvReq, reqs * kvReq < 10 * GB ? 1 : 0)}`, '30 GB');
      mLink.set(reqs * bwReq, REF.Wlink, `${fmt(reqs * bwReq / GB, 1)} GB/s`, '50 GB/s');
      tiles.kv.set(fmtGB(kvReq, kvReq < GB ? 2 : 1), `${fmtInt(L)} tokens × ${REF.NL} × ${fmtInt(e)} B`);
      tiles.bw.set(`${fmt(bwReq / GB, 2)} GB/s`, `${fmt(k * REF.NL * e / MB, 0)} MB per step ÷ 30 ms`);
      tiles.nm.set(fmtInt(Math.floor(REF.Mhbm / kvReq)));
      tiles.nl.set(fmtInt(Math.floor(REF.Wlink / bwReq)), `${fmtInt(Math.floor(REF.WlinkNominal / bwReq))} at the nominal 64 GB/s`);
    }
    draw();
  };

  // =====================================================================
  // III.6 — HiSparse for one request at one layer: archive, lift, desk
  // =====================================================================
  FIG.hisparseSystem = (host) => {
    const tipped = (node, html) => { node.tabIndex = 0; hover(node, () => html); return node; };
    const SEL = new Set([2, 5, 9, 14]), HOT = [10, 13, 14, 2, 5, 9];
    const hist = h('div', { class: 'ls-sys-hist', 'aria-label': 'the history: 16 entries' },
      range(16).map(p => tipped(h('span', { class: 'ls-sys-cell' + (SEL.has(p) ? ' is-sel' : ''), text: p }),
        `<b>entry at position ${p}</b><br>raw, ${tex('\\ve')} bytes${SEL.has(p) ? '<br>selected at this step' : ''}`)));
    const hostTier = h('div', { class: 'ls-sys-tier is-host' },
      h('div', { class: 'ls-sys-head' }, h('b', { text: 'host DRAM' }), h('span', { text: 'the archive' })),
      hist,
      h('p', { class: 'ls-sys-note', html: `every entry of the request, one per position, ${tex('\\ve')} bytes each` }));
    const link = tipped(h('div', { class: 'ls-sys-link' },
      h('span', { class: 'ls-sys-arrow', 'aria-hidden': 'true' }),
      h('b', { text: 'PCIe link' }), h('span', { text: 'the lift' }),
      h('span', { class: 'ls-sys-miss', html: `each miss: ${tex('\\ve')} bytes` })),
      '<b>the host-to-GPU link</b><br>about 50 GB/s in practice<br>carries one raw entry per miss');
    const slots = h('div', { class: 'ls-sys-slots' }, HOT.map(p => tipped(h('span', { class: 'ls-sys-slot' + (p === 14 ? ' is-miss' : SEL.has(p) ? ' is-hit' : ''), text: p }),
      p === 14 ? '<b>position 14: a miss</b><br>just fetched over the link into the slot of evicted entry 1'
        : SEL.has(p) ? `<b>position ${p}: a hit</b><br>already on the GPU, read in place` : `<b>position ${p}</b><br>resident, not selected now`)));
    const gpuTier = h('div', { class: 'ls-sys-tier is-gpu' },
      h('div', { class: 'ls-sys-head' }, h('b', { text: 'GPU memory (HBM)' }), h('span', { text: 'the desk' })),
      tipped(h('div', { class: 'ls-sys-box is-indexer', html: `<b>indexer</b> names ${tex('\\vS_{\\vt}')}: here positions 2, 5, 9, 14` }),
        '<b>the indexer</b><br>picks k positions per layer per step<br>(k = 2048 in the reference setting; 4 here)'),
      h('span', { class: 'ls-sys-down', 'aria-hidden': 'true' }),
      h('div', { class: 'ls-sys-box is-hot' }, h('div', { html: `<b>hot cache</b>: ${tex('\\vB')} slots, least recently used on the left` }), slots),
      h('span', { class: 'ls-sys-down', 'aria-hidden': 'true' }),
      tipped(h('div', { class: 'ls-sys-box is-attn', html: '<b>attention</b> reads the selected entries in place' }),
        '<b>attention</b><br>unchanged: it reads exactly the selected entries'));
    host.append(h('div', { class: 'ls-sys' }, hostTier, link, gpuTier),
      legend([['selected at this step', 'var(--t-indexer)', 'box'], ['hit (already in the hot cache)', 'var(--good)', 'box'], ['miss (just fetched)', 'var(--t-hot-cache)', 'box']]));
  };

  // =====================================================================
  // III.7 — the toy trace, step by step (data shared with IV.5)
  // =====================================================================
  // HiSparse's resolve rule on one layer (cache: array of positions, oldest first).
  function resolveStep(cache, S, B) {
    const before = cache.slice();
    const hits = S.filter(p => before.includes(p)), misses = S.filter(p => !before.includes(p));
    const c = before.slice(), evicted = [];
    for (const p of misses) {
      if (c.length >= B) {
        const v = c.find(x => !S.includes(x));
        c.splice(c.indexOf(v), 1);
        evicted.push(v);
      }
      c.push(p);
    }
    for (const p of hits) { c.splice(c.indexOf(p), 1); c.push(p); }
    return { hits, misses, evicted, cacheAfter: c };
  }
  const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  FIG.toyTrace = async (host) => {
    const res = await fetch(KV.prefix + 'assets/figs/data/toy-trace.json');
    if (!res.ok) throw new Error(`toy-trace.json: HTTP ${res.status}`);
    const T = await res.json();
    // run the resolve rule and check it against the expected trace in the data file
    let cache = T.initialCache.slice();
    const runs = T.steps.map((S, i) => {
      const r = resolveStep(cache, S, T.B);
      if (!sameJSON(r, T.expected.hisparse[i])) throw new Error(`toy trace: step ${i + 1} disagrees with expected.hisparse: ${JSON.stringify(r)}`);
      const out = { S, before: cache, ...r };
      cache = r.cacheAfter;
      return out;
    });
    // the stepper: the initial state, then for every step (a) the selection, (b) the resolve
    const frames = [{ kind: 'init', cache: T.initialCache }];
    runs.forEach((r, i) => { frames.push({ kind: 'select', i, r }); frames.push({ kind: 'resolve', i, r }); });

    const D = Diagram(host, { w: 640, h: 222, grow: 0.3, label: 'History row and hot-cache row of the toy trace' });
    const g = el('g', {}, D.svg);
    const defs = D.defs;
    const mk = el('marker', { id: uid('ls-arr'), viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0 0L10 5L0 10z', style: 'fill:var(--t-hot-cache)' }, mk);
    const tiles = {
      hits: kpi('hits so far', '0', '', 'var(--good)'),
      miss: kpi('misses so far', '0', '', 'var(--t-hot-cache)'),
      link: kpi('bytes on the link', '0', `at ${tex('\\ve')} = 640 B`, 'var(--t-hot-cache)'),
      hbm: kpi('hot-cache memory', `${T.B} ${tex('\\times')} ${tex('\\ve')}`, `${fmtInt(T.B * REF.e)} B, always`, 'var(--t-hisparse)'),
    };
    const hx0 = 14, hw = (640 - 2 * hx0) / T.n, hy = 40, ch = 34;
    const sx0 = 14, sw = 74, sy = 136;
    const hcx = p => hx0 + p * hw + hw / 2;
    const scx = k => sx0 + k * (sw + 8) + sw / 2;
    stepper(host, {
      steps: frames,
      interval: 2200,
      label: f => {
        if (f.kind === 'init') return `Before step 1. The hot cache holds ${T.initialCache.join(', ')} (least recently used first). ${T.B} slots, all full.`;
        const r = f.r;
        if (f.kind === 'select') return `<b>Step ${f.i + 1}:</b> the indexer selects ${r.S.join(', ')}. ${r.hits.join(', ')} are on the desk already: hits. ${r.misses.join(', ')} is not: a miss.`;
        return `<b>Step ${f.i + 1}, resolved:</b> ${r.evicted.join(', ')} (least recently used, not selected) is evicted; ${r.misses.join(', ')} is fetched over the link (${tex('\\ve')} bytes); the hits move to the newest end.`;
      },
      render(i, f) {
        g.replaceChildren();
        const r = f.r, sel = new Set(r ? r.S : []);
        const shown = f.kind === 'resolve' ? r.cacheAfter : f.kind === 'select' ? r.before : f.cache;
        const resident = new Set(shown);
        el('text', { x: hx0, y: hy - 12, class: 'lbl', text: 'history in host DRAM' }, g);
        for (let p = 0; p < T.n; p++) {
          const isSel = sel.has(p);
          const rr = el('rect', { x: hx0 + p * hw + 1.5, y: hy, width: hw - 3, height: ch, rx: 5,
            style: `fill:${resident.has(p) ? mix('var(--t-hisparse)', 16) : 'var(--paper)'};stroke:${isSel ? 'var(--t-indexer)' : 'var(--rule)'};stroke-width:${isSel ? 3 : 1}` }, g);
          hover(rr, () => `<b>position ${p}</b><br>${resident.has(p) ? 'also in the hot cache' : 'only in host DRAM'}${isSel ? '<br>selected at this step' : ''}`);
          el('text', { x: hcx(p), y: hy + ch / 2 + 4.5, class: 'val', 'text-anchor': 'middle', style: isSel ? 'font-weight:700' : '', text: p }, g);
        }
        el('text', { x: sx0, y: sy + ch + 26, class: 'lbl', text: 'hot cache in GPU memory · oldest → newest' }, g);
        shown.forEach((p, k) => {
          const hit = f.kind !== 'init' && r.hits.includes(p), miss = f.kind === 'resolve' && r.misses.includes(p);
          const fill = miss ? mix('var(--t-hot-cache)', 34) : hit ? mix('var(--good)', 30) : 'var(--paper)';
          const stroke = miss ? 'var(--t-hot-cache)' : hit ? 'var(--good)' : 'var(--rule)';
          const rr = el('rect', { x: scx(k) - sw / 2, y: sy, width: sw, height: ch + 4, rx: 7, style: `fill:${fill};stroke:${stroke};stroke-width:${hit || miss ? 2 : 1}` }, g);
          hover(rr, () => `<b>slot ${k + 1}: position ${p}</b><br>${miss ? 'a miss, just fetched' : hit ? 'a hit, read in place' : 'resident, not selected'}`);
          el('text', { x: scx(k), y: sy + ch / 2 + 6.5, class: 'val', 'text-anchor': 'middle', style: hit || miss ? 'font-weight:700' : '', text: p }, g);
        });
        if (f.kind === 'resolve') {
          const ex = scx(T.B) + 10;
          el('rect', { x: ex - sw / 2, y: sy, width: sw, height: ch + 4, rx: 7, style: 'fill:none;stroke:var(--ink-3);stroke-dasharray:4 3' }, g);
          el('text', { x: ex, y: sy + ch / 2 + 6.5, class: 'val', 'text-anchor': 'middle', style: 'fill:var(--ink-3)', text: r.evicted.join(',') }, g);
          el('text', { x: ex, y: sy - 8, class: 'lbl', 'text-anchor': 'middle', text: 'evicted' }, g);
          r.misses.forEach(p => {
            const k = r.cacheAfter.indexOf(p), x1 = hcx(p), y1 = hy + ch + 2, x2 = scx(k), y2 = sy - 2;
            el('path', { d: `M${x1} ${y1} C ${x1} ${y1 + 40}, ${x2} ${y2 - 40}, ${x2} ${y2}`, 'marker-end': `url(#${mk.id})`, style: 'fill:none;stroke:var(--t-hot-cache);stroke-width:2.4' }, g);
          });
        } else if (f.kind === 'select') {
          r.misses.forEach(p => el('text', { x: hcx(p), y: hy + ch + 18, class: 'annot', 'text-anchor': 'middle', text: 'miss' }, g));
        }
        const done = f.kind === 'init' ? [] : runs.slice(0, f.kind === 'resolve' ? f.i + 1 : f.i);
        const hits = sum(done.map(x => x.hits.length)), misses = sum(done.map(x => x.misses.length));
        tiles.hits.set(hits); tiles.miss.set(misses);
        tiles.link.set(`${misses} ${tex('\\times')} ${tex('\\ve')}`, `${fmtInt(misses * REF.e)} B at ${tex('\\ve')} = 640 B`);
      },
    });
    host.append(h('div', { class: 'kpis' }, tiles.hits, tiles.miss, tiles.link, tiles.hbm),
      legend([['selected now', 'var(--t-indexer)', 'box'], ['in the hot cache', mix('var(--t-hisparse)', 40), 'box'], ['hit', 'var(--good)', 'box'], ['miss, fetched over the link', 'var(--t-hot-cache)', 'box']]));
  };

  // =====================================================================
  // III.8 — Lucky Louis: selections of one layer over many steps (toy)
  // =====================================================================
  FIG.louisRaster = (host) => {
    const N = 96, DIM = 12, K = 8, STEPS = 36, B = 2 * K;
    const rk = rng('landscape-louis-keys'), rq = rng('landscape-louis-walk');
    const keys = range(N).map(() => range(DIM).map(() => rk.normal()));      // independent random keys
    const unit = v => { const n = Math.hypot(...v); return v.map(x => x / n); };
    const q0 = unit(range(DIM).map(() => rq.normal()));
    const kicks = range(STEPS).map(() => range(DIM).map(() => rq.normal() / Math.sqrt(DIM)));
    const dotp = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
    let drift = 0.3;
    function run() {
      let q = q0.slice();
      return range(STEPS).map(s => {
        if (s) q = unit(q.map((v, i) => v + drift * kicks[s][i]));
        const sc = keys.map(k => dotp(k, q));
        return range(N).sort((a, b) => sc[b] - sc[a]).slice(0, K);
      });
    }
    const DRIFTS = [0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 0.75, 1, 1.5];
    const sl = slider('query drift per step', 0, DRIFTS.length - 1, 1, DRIFTS.indexOf(drift), v => { drift = DRIFTS[v]; draw(); }, v => fmt(DRIFTS[v], 2));
    host.append(controls(sl), legend([['re-selected from the step before', 'var(--t-lucky-louis)', 'box'], ['new pick', 'var(--t-hot-cache)', 'box']]));
    const x0 = 46, cw = (640 - x0 - 8) / N, rh = 7.4, top = 18;
    const D = Diagram(host, { w: 640, h: top + STEPS * rh + 30, grow: 0.15, label: 'Selected positions of one layer over 36 decode steps' });
    const g = el('g', {}, D.svg);
    const ro = readout();
    host.append(ro);
    function draw() {
      const picks = run();
      g.replaceChildren();
      el('text', { x: 632, y: top - 6, class: 'lbl', 'text-anchor': 'end', text: 'stored positions 0 … 95 →' }, g);
      el('text', { x: x0 - 6, y: top - 6, class: 'lbl', 'text-anchor': 'end', text: 'step' }, g);
      [0, 10, 20, 30].forEach(s => el('text', { x: x0 - 6, y: top + s * rh + rh + 12, class: 'val', 'text-anchor': 'end', text: s + 1 }, g));
      let over = 0;
      picks.forEach((P_, s) => {
        const prev = s ? new Set(picks[s - 1]) : null;
        P_.forEach(p => {
          const again = prev && prev.has(p);
          if (again) over++;
          el('rect', { x: x0 + p * cw + 0.4, y: top + s * rh + 0.6, width: Math.max(1.2, cw - 0.8), height: rh - 1.2, rx: 1,
            style: `fill:${s === 0 ? 'var(--ink-3)' : again ? 'var(--t-lucky-louis)' : 'var(--t-hot-cache)'}` }, g);
        });
      });
      let cache = picks[0].slice(), hits = 0;
      for (let s = 1; s < STEPS; s++) { const r = resolveStep(cache, picks[s], B); hits += r.hits.length; cache = r.cacheAfter; }
      const tot = K * (STEPS - 1);
      ro.set([['re-selected from the step before', fmtPct(over / tot, 0)], [`LRU hit rate, ${B} slots`, fmtPct(hits / tot, 0)], ['keys', 'independent random numbers']]);
    }
    draw();
  };

  // =====================================================================
  // III.9 — the reuse-distance curve: a power law through HiSparse's LRU points
  // =====================================================================
  // least-squares fit of log m = log a + s log(B/2048) through the three LRU points
  const LRU_PTS = [[2048, REF.miss[2048]], [4096, REF.miss[4096]], [8192, REF.miss[8192]]];
  const FIT = (() => {
    const xs = LRU_PTS.map(p => Math.log(p[0] / 2048)), ys = LRU_PTS.map(p => Math.log(p[1]));
    const mx = mean(xs), my = mean(ys);
    const s = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / sum(xs.map(x => (x - mx) ** 2));
    const a = Math.exp(my - s * mx);
    return { s, a, m: B => a * Math.pow(B / 2048, s) };
  })();

  FIG.reuseCurve = (host) => {
    let lb = 12;   // log2 of B
    const box = h('div'), ro = readout();
    const sl = slider(texify('hot-cache slots $\\vB$'), 10, 16, 0.05, lb, v => { lb = v; draw(); }, v => fmtInt(Math.pow(2, v)));
    host.append(controls(sl), legend([
      ['power-law fit', series(0)], ['HiSparse, LRU (measured)', series(0), 'dot'],
      ['Bélády at 4096 (clairvoyant)', series(4), 'dot'], ['FIFO, random at 4096', series(1), 'dot'],
    ]), box, ro);
    const P = Plot(box, {
      x: [1024, 65536], xlog: 2, y: [0.004, 1], ylog: true, h: 380,
      xfmt: v => (v >= 1024 ? `${v / 1024}K` : v), yfmt: v => fmtPct(v, v < 0.01 ? 1 : 0),
      xlabel: 'hot-cache slots B (per layer, per request)', ylabel: 'miss rate m', label: 'Miss rate against hot-cache size, log-log',
    });
    // measured range vs extrapolation
    [[1024, 2048], [8192, 65536]].forEach(([a, b]) => el('rect', { x: P.x(a), y: P.y(1), width: P.x(b) - P.x(a), height: P.y(0.004) - P.y(1), style: `fill:${mix('var(--ink)', 5)}` }, P.g.bg));
    el('text', { x: P.x(23000), y: P.y(0.6), class: 'annot', 'text-anchor': 'middle', text: 'extrapolated' }, P.g.bg);
    const curve = (a, b) => linspace(Math.log2(a), Math.log2(b), 40).map(l => [2 ** l, FIT.m(2 ** l)]);
    line(P, curve(1024, 2048), { color: series(0), dash: '6 5', width: 2 });
    line(P, curve(2048, 8192), { color: series(0), width: 2.6 });
    line(P, curve(8192, 65536), { color: series(0), dash: '6 5', width: 2 });
    LRU_PTS.forEach(([b, m]) => { const d = dot(P.g.data, P.x(b), P.y(m), 6.5 * P.fs, series(0)); hover(d, () => `<b>LRU, ${b} slots</b><br>measured miss rate ${fmtPct(m, 1)}<br>fit ${fmtPct(FIT.m(b), 1)}`); });
    const bel = el('path', { d: `M${P.x(4096)} ${P.y(REF.belady4096) - 8 * P.fs}l${8 * P.fs} ${8 * P.fs}l${-8 * P.fs} ${8 * P.fs}l${-8 * P.fs} ${-8 * P.fs}z`, class: 'dot', style: `fill:${series(4)}` }, P.g.data);
    hover(bel, () => `<b>Bélády at 4096 slots</b><br>miss rate ${fmtPct(REF.belady4096, 1)}<br>LRU needs ≈ ${fmtInt(2048 * Math.pow(REF.belady4096 / FIT.a, 1 / FIT.s))} slots for this`);
    [[REF.fifo4096, 'FIFO'], [REF.random4096, 'random']].forEach(([m, n]) => {
      const sq = el('rect', { x: P.x(4096) - 4.5 * P.fs + (n === 'FIFO' ? -9 : 9) * P.fs, y: P.y(m) - 4.5 * P.fs, width: 9 * P.fs, height: 9 * P.fs, rx: 1.5, class: 'dot', style: `fill:${series(1)}` }, P.g.data);
      hover(sq, () => `<b>${n} eviction, 4096 slots</b><br>miss rate ${fmtPct(m, 1)}`);
    });
    annotate(P, 4096, REF.belady4096, 'Bélády 8.2 %', { dx: 64, dy: 30 });
    const guide = el('g', {}, P.g.top);
    const knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
    draggable(knob, P, ([x]) => { lb = clamp(Math.log2(x), 10, 16); sl.set(lb); draw(); }, null, { get: () => [2 ** lb, FIT.m(2 ** lb)], step: [2 ** lb * 0.06, 0], label: 'hot-cache size on the curve' });
    function draw() {
      const B = Math.round(2 ** lb), m = FIT.m(B), measured = REF.miss[B];
      const mm = measured != null ? measured : m;
      knob.setAttribute('cx', P.x(B)); knob.setAttribute('cy', P.y(m));
      guide.replaceChildren();
      el('line', { x1: P.x(B), x2: P.x(B), y1: P.y(m), y2: P.y(0.004), style: 'stroke:var(--c);stroke-dasharray:3 4;stroke-width:1.4' }, guide);
      el('line', { x1: P.x(1024), x2: P.x(B), y1: P.y(m), y2: P.y(m), style: 'stroke:var(--c);stroke-dasharray:3 4;stroke-width:1.4' }, guide);
      const missPer = mm * REF.k, link = missPer * REF.NL * REF.e, hbm = B * REF.NL * REF.e;
      ro.set([
        [tex('\\vB'), `${fmtInt(B)} slots${B < 2048 || B > 8192 ? ' (extrapolated)' : ''}`],
        [tex('\\vm'), `${fmtPct(mm, 1)}${measured != null ? ' (measured)' : ' (fit)'}`],
        ['misses per layer per step', fmtInt(missPer)],
        ['link bytes per step', fmtMB(link, 1)],
        ['GPU memory per request', fmtMB(hbm, 0)],
      ]);
    }
    draw();
  };

  // =====================================================================
  // III.10 — the reference setting as a pinboard (8-bit vs BF16)
  // =====================================================================
  FIG.refSetting = (host) => {
    let bytesPer = 1;
    const fmtB = b => (b >= GB ? fmtGB(b, 1) : b >= MB ? fmtMB(b, b >= 100 * MB ? 0 : 1) : b >= 1000 ? `${fmt(b / 1000, b >= 10000 ? 0 : 2)} KB` : `${fmtInt(b)} B`);
    const e = () => 640 * bytesPer;
    const CARDS = [
      ['the model', [
        ['sparse layers', 'NL', () => '78', 'GLM-5.1, as in HiSparse’s trace'],
        ['selections per layer per step', 'k', () => '2048', 'the top-k of DSA'],
        ['context length', 'L', () => '100,384', 'HiSparse’s LongBench-V2 prompt'],
        ['numbers per entry', 'd', () => '≈ 640', '100 KB of BF16 per token ÷ 78 layers ÷ 2 bytes'],
        ['entry size', 'e', () => fmtB(e()), 'd numbers × bytes per number', true],
        ['bytes per token, all layers', null, () => fmtB(e() * REF.NL), '78 × e', true],
      ]],
      ['the cache', [
        ['miss rate, top-k only (B = 2048)', 'm', () => '30 %', 'HiSparse’s trace'],
        ['miss rate, LRU, B = 4096', 'm', () => '13.4 %', 'HiSparse’s trace; Bélády 8.2 %'],
        ['miss rate, LRU, B = 8192', 'm', () => '6.7 %', 'HiSparse’s trace'],
      ]],
      ['the machine', [
        ['time per output token', 'tpot', () => '30 ms', 'HiSparse’s deployment'],
        ['host-to-GPU link', 'Wlink', () => '50 GB/s', 'PCIe Gen5 ×16, one direction, in practice (64 on paper)'],
        ['GPU memory for KV, per GPU', 'Mhbm', () => '30 GB', 'about 240 GB left on 8 × H200 after the weights'],
      ]],
      ['derived from the above', [
        ['KV history of one 100K request', null, () => fmtB(REF.L * REF.NL * e()), 'L × N_L × e', true],
        ['hot cache per request, B = 4096', null, () => fmtB(4096 * REF.NL * e()), '4096 × N_L × e', true],
        ['miss traffic per step, B = 4096', null, () => fmtB(0.134 * 2048 * REF.NL * e()), '0.134 × 2048 × N_L × e', true],
      ]],
    ];
    const board = h('div', { class: 'ls-pins' });
    host.append(controls(seg([[1, '8 bits per number (reference)'], [2, 'BF16 (16 bits)']], bytesPer, v => { bytesPer = v; draw(); }, 'number format')), board);
    function draw() {
      board.replaceChildren(...CARDS.map(([group, cards]) => h('div', { class: 'ls-pin-group' },
        h('div', { class: 'ls-pin-head', text: group }),
        h('div', { class: 'ls-pin-cards' }, cards.map(([lab, sym, val, src, bytes]) => {
          const changed = bytes && bytesPer !== 1;
          const c = h('div', { class: 'ls-pin' + (changed ? ' is-changed' : ''), tabindex: 0 },
            h('span', { class: 'ls-pin-lbl', text: lab }),
            h('span', { class: 'ls-pin-val', html: (sym ? tex('\\v' + sym) + (val().startsWith('≈') ? ' ' : ' = ') : '') + val() }));
          hover(c, () => `<b>${lab}</b><br>${src}${changed ? '<br><i>doubles in BF16</i>' : ''}`);
          return c;
        })))));
    }
    draw();
  };

  // =====================================================================
  // III.11 — which wall binds: link-bound versus memory-bound requests per GPU
  // =====================================================================
  const linkBound = (B, m) => REF.Wlink * REF.tpot / (m * REF.k * REF.NL * REF.e);
  const memBound = B => REF.Mhbm / (B * REF.NL * REF.e);

  FIG.derivedNumbers = (host) => {
    let lb = 12;
    const chip = (html, cls) => h('span', { class: 'ls-chain-chip' + (cls ? ' ' + cls : ''), html });
    const arrow = () => h('span', { class: 'ls-chain-arrow', 'aria-hidden': 'true', text: '→' });
    const chainL = h('div', { class: 'ls-chain' }), chainM = h('div', { class: 'ls-chain' });
    const box = h('div'), ro = readout();
    const sl = slider(texify('hot-cache slots $\\vB$'), 11, 14, 0.01, lb, v => { lb = v; draw(); }, v => fmtInt(Math.round(2 ** v)));
    host.append(controls(sl),
      h('div', { class: 'ls-chains' }, h('div', { class: 'ls-chain-head', text: 'the link' }), chainL, h('div', { class: 'ls-chain-head', text: 'the memory' }), chainM),
      legend([['requests the link can feed', series(0)], ['requests the GPU memory can hold', series(1)], ['reachable', mix('var(--c)', 30), 'band']]), box, ro);
    const P = Plot(box, { x: [2048, 16384], xlog: 2, y: [0, 320], h: 340, xfmt: v => `${v / 1024}K`, xlabel: 'hot-cache slots B', ylabel: 'requests per GPU', label: 'Link-bound and memory-bound requests per GPU against hot-cache size' });
    const Bs = linspace(11, 14, 121).map(l => 2 ** l);
    const lk = Bs.map(B => [B, linkBound(B, FIT.m(B))]), mm = Bs.map(B => [B, memBound(B)]);
    area(P, Bs.map((B, i) => [B, Math.min(lk[i][1], mm[i][1])]), { color: 'var(--c)', opacity: 0.16, base: 0 });
    line(P, lk, { color: series(0) });
    line(P, mm, { color: series(1) });
    [2048, 4096, 8192].forEach(B => { const d = dot(P.g.data, P.x(B), P.y(linkBound(B, REF.miss[B])), 5.5 * P.fs, series(0)); hover(d, () => `<b>${B} slots, measured miss rate ${fmtPct(REF.miss[B], 1)}</b><br>the link can feed ${fmt(linkBound(B, REF.miss[B]), 0)} requests`); });
    let best = Bs[0], bestN = 0;
    Bs.forEach(B => { const n = Math.min(linkBound(B, FIT.m(B)), memBound(B)); if (n > bestN) { bestN = n; best = B; } });
    annotate(P, best, bestN, `best: ≈ ${fmt(bestN, 0)} requests\nat ≈ ${fmtInt(Math.round(best / 100) * 100)} slots`, { dx: 46, dy: -34 });
    const guide = el('g', {}, P.g.top);
    const knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
    const cur = () => { const B = Math.round(2 ** lb), m = REF.miss[B] != null ? REF.miss[B] : FIT.m(B); return { B, m, nl: linkBound(B, m), nm: memBound(B) }; };
    draggable(knob, P, ([x]) => { lb = clamp(Math.log2(x), 11, 14); sl.set(lb); draw(); }, null, { get: () => [2 ** lb, Math.min(cur().nl, cur().nm)], step: [2 ** lb * 0.04, 0], label: 'hot-cache size' });
    function draw() {
      const { B, m, nl, nm } = cur(), measured = REF.miss[B] != null;
      const n = Math.min(nl, nm);
      knob.setAttribute('cx', P.x(B)); knob.setAttribute('cy', P.y(n));
      guide.replaceChildren();
      el('line', { x1: P.x(B), x2: P.x(B), y1: P.y(0), y2: P.y(320), style: 'stroke:var(--c);stroke-dasharray:3 4;stroke-width:1.4' }, guide);
      const missPer = m * REF.k, stepBytes = missPer * REF.NL * REF.e, perReq = stepBytes / REF.tpot, hot = B * REF.NL * REF.e;
      chainL.replaceChildren(
        chip(`${tex('\\vk')} = 2048 × ${tex('\\vm')} = ${fmtPct(m, 1)}${measured ? '' : ' (fit)'}`), arrow(),
        chip(`${fmtInt(missPer)} misses per layer per step`), arrow(),
        chip(`× 78 layers × 640 B = ${fmtMB(stepBytes, 1)} per step`), arrow(),
        chip(`÷ 30 ms = ${fmt(perReq / GB, 2)} GB/s per request`), arrow(),
        chip(`50 GB/s ÷ that = <b>${fmt(nl, 0)}</b> requests`, nl <= nm ? 'is-bind' : ''));
      chainM.replaceChildren(
        chip(`${tex('\\vB')} = ${fmtInt(B)} slots × 78 layers × 640 B`), arrow(),
        chip(`${fmtMB(hot, 0)} per request`), arrow(),
        chip(`30 GB ÷ that = <b>${fmt(nm, 0)}</b> requests`, nm < nl ? 'is-bind' : ''));
      ro.set([['link can feed', `${fmt(nl, 0)}`], ['memory can hold', `${fmt(nm, 0)}`], ['requests per GPU', `<b>${fmt(n, 0)}</b> (${nl <= nm ? 'the link' : 'the memory'} binds)`]]);
    }
    draw();
  };

  // =====================================================================
  // III.11 — the 0.38 ms window: link time versus decoder time
  // =====================================================================
  FIG.deadlineWindow = (host) => {
    const SPEEDS = [25, 50, 100, 200, 500, 1000, 2000, 5000];
    let si = 4;
    const window_us = REF.tpot / REF.NL * 1e6;                       // ≈ 385 µs
    const bytes = 110 * Math.round(REF.miss[4096] * REF.k) * REF.e;   // 110 requests × 274 misses × 640 B
    const linkUs = bytes / REF.Wlink * 1e6;
    const box = h('div'), ro = readout();
    const sl = slider('decoder speed', 0, SPEEDS.length - 1, 1, si, v => { si = v; draw(); }, v => `${fmtInt(SPEEDS[v])} GB/s`);
    host.append(controls(sl), box, ro);
    const P = Plot(box, { ycats: ['link', 'decoder'], x: [0, 420], h: 190, grid: 'x', xlabel: 'time within one layer’s window (µs)', label: 'Link time and decoder time within the 0.38 ms window' });
    function draw() {
      const decUs = bytes / (SPEEDS[si] * GB) * 1e6;
      P.domain({ x: [0, Math.max(420, decUs * 1.08)] });
      P.clear();
      el('rect', { x: P.x(0), y: P.m.t, width: P.x(window_us) - P.x(0), height: P.ph, style: `fill:${mix('var(--c)', 7)}` }, P.g.data);
      bars(P, [linkUs, decUs], { horizontal: true, colors: i => (i ? (decUs > window_us / 10 ? 'var(--bad)' : 'var(--good)') : 'var(--t-hot-cache)'), labels: v => `${fmt(v, 0)} µs`,
        tip: (v, i) => (i ? `<b>decoder at ${fmtInt(SPEEDS[si])} GB/s</b><br>${fmt(v, 0)} µs for ${fmt(bytes / MB, 1)} MB` : `<b>link at 50 GB/s</b><br>${fmt(v, 0)} µs for ${fmt(bytes / MB, 1)} MB`) });
      rule(P, { x: window_us, label: '0.38 ms window ends', dash: false, color: 'var(--ink)' });
      rule(P, { x: window_us / 10, label: 'a tenth', color: 'var(--ink-3)' });
      ro.set([['bytes per layer slice', `${fmt(bytes / MB, 1)} MB`], ['link', `${fmt(linkUs, 0)} µs`], ['decoder', `${fmt(decUs, 0)} µs = ${fmtPct(decUs / window_us, 0)} of the window`]]);
    }
    draw();
  };
})();
