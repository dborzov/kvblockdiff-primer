/* Part VI, pages VI.13–VI.18 (homework-b): dictionary scope, the amortization rule, the economics,
   the what-if calculator, the two break-even conditions and the synthetic dress rehearsal.
   Builders: hwbScopes, hwbAmortization, hwbAnatomy, hwbCalculator, hwbLoads, hwbDecode, hwbRehearsal.
   Reference-setting numbers are HiSparse's GLM-5.1 deployment at 8-bit KV (III.10); every
   dictionary number (ρ, w, f_D, n_load) is ASSUMED and labelled so. */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------ the reference setting and the cost model
  const REF = { L: 100000, k: 2048, NL: 78, e: 640, tpot: 30, link: 50, hbm: 30, B: 4096,
    m2: 0.30, m4: 0.134, m8: 0.067, dec: 500 };
  const missOf = (p, B) => (B === 2048 ? p.m2 : B === 8192 ? p.m8 : p.m4);

  /* The cost model of VI.15. p: rig (L, k, NL, e [B], tpot [ms], link [GB/s], hbm [GB], m2/m4/m8)
     + scenario (scope, B, rho, w, b, nD, fD, nload). Returns bytes per step, memory, request bounds. */
  function econ(p) {
    const m = missOf(p, p.B);
    const miss = m * p.k * p.NL * p.e;                       // raw bytes of all misses, per step per request
    let wres = 0, fD = p.fD, nload = p.nload, rho = p.rho;
    if (p.scope === 'hisparse') { fD = 0; nload = 0; rho = 1; }
    else if (p.scope === 'global') { fD = 1; nload = 0; }                // solo coding: a global code, nothing per request
    else if (p.scope === 'request') { wres = p.w; fD = 1; nload = 0; }
    else if (p.scope === 'block-all') { wres = Math.ceil(p.L / p.b) * p.w; fD = 1; nload = 0; }
    else { wres = p.nD * p.w; }
    const parts = { delta: miss * fD * rho, raw: miss * (1 - fD), loads: nload * p.NL * p.w * p.e };
    const T = parts.delta + parts.raw + parts.loads;
    const mparts = { hot: p.NL * p.e * p.B, dict: p.NL * p.e * wres };
    const M = mparts.hot + mparts.dict;
    const Nlink = p.link * 1e9 * (p.tpot / 1e3) / T, Nhbm = p.hbm * 1e9 / M;   // shown rounded to whole requests
    const N = Math.min(Nlink, Nhbm);
    return {
      m, miss, T, M, parts, mparts, wres, fD, nload, rho, Nlink, Nhbm, N,
      binds: Nlink < Nhbm ? 'link' : Nlink > Nhbm ? 'memory' : 'both',
      decode: N * miss * fD / (p.tpot / 1e3),                 // raw-equivalent bytes/s the decoder must emit
      admit: p.scope === 'request' || p.scope === 'block-all' ? wres * p.e * p.NL : 0,
    };
  }

  const SCEN = [
    { id: 'hs2', name: 'HiSparse, B = 2K', short: 'HiSparse 2K', scope: 'hisparse', B: 2048 },
    { id: 'hs4', name: 'HiSparse, B = 4K', short: 'HiSparse 4K', scope: 'hisparse', B: 4096 },
    { id: 'hs8', name: 'HiSparse, B = 8K', short: 'HiSparse 8K', scope: 'hisparse', B: 8192 },
    { id: 'solo', name: 'solo coding, a global code: ρ = 0.88', short: 'solo', scope: 'global', B: 4096, rho: 0.88 },
    { id: 'req', name: 'request scope: w = 256, ρ = 0.75', short: 'request', scope: 'request', B: 4096, w: 256, rho: 0.75 },
    { id: 'blk32', name: 'block scope, all resident: b = 4K, w = 32, ρ = 0.65', short: 'block, w 32', scope: 'block-all', B: 4096, b: 4096, w: 32, rho: 0.65 },
    { id: 'blk256', name: 'block scope, all resident: b = 4K, w = 256, ρ = 0.55', short: 'block, w 256', scope: 'block-all', B: 4096, b: 4096, w: 256, rho: 0.55 },
    { id: 'cache', name: 'dictionary cache: n_D = 4, w = 256, ρ = 0.55, f_D = 0.85, 0.05 loads', short: 'dict. cache', scope: 'block-cache', B: 4096, b: 4096, w: 256, rho: 0.55, nD: 4, fD: 0.85, nload: 0.05 },
  ];
  const DICT0 = { rho: 0.65, w: 32, b: 4096, nD: 4, fD: 0.85, nload: 0.1 };
  const scen = (s, rig) => Object.assign({}, rig || REF, DICT0, s);

  const MB = v => `${fmt(v / 1e6, v < 1e7 ? 2 : 1)} MB`;
  const tok = n => (n >= 1024 && n % 1024 === 0 ? `${n / 1024}K` : n >= 1000 && n % 1000 === 0 ? `${n / 1000}K` : String(n));
  const T = s => tex(s);
  // plots get taller in a narrow column, so that the phone-scaled text has room
  const tall = (box, hh) => (box.getBoundingClientRect().width < 520 ? Math.round(hh * 1.55) : hh);

  // ------------------------------------------------------------ HTML stacked bars (VI.15, VI.16)
  function stackRows(rows, max) {
    const box = h('div', { class: 'hwb-stack' });
    rows.forEach(r => {
      const track = h('span', { class: 'hwb-track' });
      r.parts.forEach(pt => {
        if (!(pt.v > 0)) return;
        const seg = h('span', { class: 'hwb-seg', style: `width:${(100 * pt.v / max).toFixed(2)}%;background:${pt.color}` });
        hover(seg, () => `<b>${pt.name}</b><br>${pt.fmt || MB(pt.v)}`);
        track.append(seg);
      });
      box.append(h('div', { class: 'hwb-srow' + (r.cls ? ' ' + r.cls : '') },
        h('span', { class: 'hwb-slabel', html: r.label }), track, h('span', { class: 'hwb-sval', html: r.value })));
    });
    return box;
  }

  // ============================================================ VI.13 — three nested scopes
  FIG.hwbScopes = function (host) {
    const LS = [16000, 32000, 64000, 100000, 128000];
    const BS = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];
    let L = 100000, b = 8192, t = 30000;
    const ro = readout();
    const box = h('div');
    const slL = slider(texify('request length $\\vL$'), 0, LS.length - 1, 1, LS.indexOf(L), v => { L = LS[v]; t = Math.min(t, L - 1); slT.input.max = L - 1; slT.set(t); draw(); }, v => `${tok(LS[v])} tokens`);
    const slB = slider(texify('block size $\\vb$'), 0, BS.length - 1, 1, BS.indexOf(b), v => { b = BS[v]; draw(); }, v => `${tok(BS[v])} tokens`);
    const slT = slider(texify('token $\\vt$ of request 1'), 0, L - 1, 100, t, v => { t = v; draw(); }, v => fmt(v, 0));
    host.append(controls(slL, slB, slT), box, ro);

    const D = Diagram(box, { w: 640, h: 300, grow: 0.55, label: 'Three nested dictionary scopes: one global dictionary, one per request, one per block' });
    const f = D.fs;
    const g = el('g', {}, D.svg);
    const C = { glob: 'var(--t-scope-global)', req: 'var(--t-scope-request)', blk: 'var(--t-scope-block)' };
    const chipW = 60 + 52 * f, rowX = chipW + 38, rowW = 620 - rowX;   // the left column grows with phone text

    function chip(x, y, w, hh, color, label, on) {
      const gg = el('g', {}, g);
      el('rect', { x, y, width: w, height: hh, rx: hh / 2, style: `fill:${color};fill-opacity:${on ? 1 : 0.16};stroke:${color};stroke-width:${on ? 2.5 : 1.2}` }, gg);
      el('text', { x: x + w / 2, y: y + hh / 2 + 4.2 * f, 'text-anchor': 'middle', class: 'lbl', style: `fill:${on ? 'var(--paper-3)' : 'var(--ink)'};stroke:none`, text: label }, gg);
      return gg;
    }
    function draw() {
      g.replaceChildren();
      const top = 10, pad = 12 * f;
      const chipH = 24 * f, reqH = chipH + 56 * f;
      const y1 = top + 2 * pad + chipH + 8 * f, y2 = y1 + reqH + 14 * f;
      const bottom = y2 + reqH + pad;
      D.svg.setAttribute('viewBox', `0 0 640 ${Math.round(bottom + 6)}`);
      // global scope
      el('rect', { x: 6, y: top, width: 628, height: bottom - top, rx: 16, style: `fill:${C.glob};fill-opacity:.06;stroke:${C.glob};stroke-width:1.5` }, g);
      chip(18, top + pad, chipW + 8, chipH, C.glob, 'global', true);
      svgText(g, rowX, top + pad + chipH / 2 + 4 * f, 'one dictionary for every request', { class: 'annot' });
      const blk = Math.floor(t / b);
      [[1, L, y1], [2, Math.round(L * 0.55), y2]].forEach(([r, len, y]) => {
        const sel = r === 1;
        el('rect', { x: 14, y, width: 612, height: reqH, rx: 12, style: `fill:${C.req};fill-opacity:.07;stroke:${C.req};stroke-width:${sel ? 1.8 : 1}` }, g);
        chip(22, y + 10 * f, chipW, chipH, C.req, `request ${r}`, sel);
        const w = rowW * len / L, n = Math.ceil(len / b), cw = rowW * b / L;
        const by = y + 10 * f, bh = reqH - 20 * f;
        for (let j = 0; j < n; j++) {
          const x = rowX + j * cw, ww = Math.min(cw, rowX + w - x);
          const on = sel && j === blk;
          const cell = el('rect', { x: x + 0.6, y: by, width: Math.max(0.8, ww - 1.2), height: bh, rx: Math.min(6, ww / 3),
            style: `fill:${C.blk};fill-opacity:${on ? 1 : 0.22};stroke:${C.blk};stroke-width:${on ? 2.2 : 0.8};cursor:pointer` }, g);
          hover(cell, () => `<b>request ${r}, block ${j}</b><br>tokens ${fmt(j * b, 0)}–${fmt(Math.min(len, (j + 1) * b) - 1, 0)}<br>${sel ? 'click to put the token here' : 'its own block dictionary'}`);
          if (sel) cell.addEventListener('click', () => { t = Math.min(L - 1, j * b); slT.set(t); draw(); });
        }
        if (n === 1) svgText(g, rowX + w / 2, by + bh / 2 + 4 * f, 'one block = the whole request', { class: 'lbl', 'text-anchor': 'middle' });
        svgText(g, 26, y + chipH + 28 * f, `${tok(len)} tokens\n${n} block${n > 1 ? 's' : ''}`, { class: 'val' });
        if (sel) {
          // the selected token and the three dictionaries that know about it
          const tx = rowX + rowW * t / L;
          el('line', { x1: tx, x2: tx, y1: by - 3 * f, y2: by + bh + 3 * f, style: 'stroke:var(--ink);stroke-width:2' }, g);
          dot(g, tx, by - 3 * f, 3.5 * f, 'var(--ink)');
        }
      });
      const n1 = Math.ceil(L / b);
      ro.set([
        ['token', `${fmt(t, 0)} of ${tok(L)}`],
        ['its block', b >= L ? 'the whole request' : `block ${blk} (tokens ${fmt(blk * b, 0)}–${fmt(Math.min(L, (blk + 1) * b) - 1, 0)})`],
        ['dictionaries per request, per layer', `1 request + ${n1} block dictionar${n1 > 1 ? 'ies' : 'y'}`],
        ['global', 'shared by all requests'],
      ]);
    }
    draw();
  };

  // ============================================================ VI.14 — the amortization rule 8w/b
  FIG.hwbAmortization = function (host) {
    const TYPES = [
      { name: 'loc: location + scale', short: 'loc', w: 2, color: 'var(--t-loc)' },
      { name: 'KLT, rank-16 basis', short: 'KLT, rank 16', w: 32, color: 'var(--t-klt)' },
      { name: 'VQ, 256 centroids', short: 'VQ-256', w: 256, color: 'var(--t-vq)' },
      { name: 'KLT, full basis (d = 2048)', short: 'KLT, full', w: 4096, color: 'var(--t-klt)', dash: '7 5' },
    ];
    let b = 4096, tau = 0.25;
    const L = 100000;
    const box = h('div'), tbl = h('div');
    const slTau = slider('affordable up to', 0.05, 1, 0.05, tau, v => { tau = v; draw(); }, v => `${fmt(v, 2)} bit`);
    host.append(controls(slTau, h('span', { class: 'fig-note', text: 'Drag the gold handle along the axis, or focus it and use the arrow keys.' })),
      legend(TYPES.map(t => [`${t.name} · ${T(`\\vw = ${t.w}`)}`, t.color, t.dash ? 'dash' : 'line'])), box, tbl);
    const P = Plot(box, { x: [64, 262144], xlog: 2, y: [0.001, 100], ylog: 10, h: tall(box, 380),
      xticks: [64, 256, 1024, 4096, 16384, 65536, 262144], xfmt: v => tok(v),
      yfmt: v => (v >= 1 ? fmt(v, 0) : String(v)),
      xlabel: 'block size b (tokens per dictionary)', ylabel: 'dictionary bits per element',
      label: 'Dictionary cost per element, 8w/b, against block size, for four dictionary weights' });
    const knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
    draggable(knob, P, ([x]) => { b = clamp(Math.round(x), 64, 262144); draw(); }, null,
      { get: () => [b, P.y0], step: [0, 0], label: 'block size b' });
    // arrow keys on a log axis: double / halve
    knob.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { b = Math.min(262144, b * 2); draw(); e.preventDefault(); e.stopImmediatePropagation(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { b = Math.max(64, b / 2); draw(); e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    hover(knob, () => `<b>b = ${fmt(b, 0)} tokens</b>`);

    function draw() {
      P.clear('data', 'bg');
      area(P, [[64, 0.001, tau], [262144, 0.001, tau]], { color: 'var(--good)', opacity: 0.1 });
      area(P, [[L, 0.001, 100], [262144, 0.001, 100]], { color: 'var(--ink-3)', opacity: 0.1 });
      svgText(P.g.bg, P.x(262144) - 5 * P.fs, P.y(40), 'longer than\na request', { class: 'lbl', 'text-anchor': 'end' });
      svgText(P.g.bg, P.x(70), P.y(0.0016), `affordable: ≤ ${fmt(tau, 2)} bit per element`, { class: 'lbl' });
      TYPES.forEach(t => {
        const pts = [64, 262144].map(x => [x, 8 * t.w / x]);
        line(P, pts, { color: t.color, dash: t.dash, width: 2.5 });
        const bmin = 8 * t.w / tau;
        if (bmin >= 64 && bmin <= 262144) dot(P.g.data, P.x(bmin), P.y(tau), 4.2 * P.fs, t.color);
      });
      P.g.top.querySelectorAll('.hwb-tmp').forEach(n => n.remove());
      const rl = rule(P, { y: tau, color: 'var(--good)' });
      rl.classList.add('hwb-tmp');
      const rb = rule(P, { x: b, label: `b = ${tok(b)}`, color: 'var(--c)', dash: false });
      rb.classList.add('hwb-tmp');
      P.g.top.querySelectorAll('.hwb-tmp').forEach(n => P.g.top.insertBefore(n, knob));   // keep the knob on top without moving it (moving it would drop keyboard focus)
      knob.setAttribute('cx', P.x(b)); knob.setAttribute('cy', P.y(P.y0));
      TYPES.forEach(t => { const y = 8 * t.w / b; if (y > 0.001 && y < 100) { const d = dot(P.g.top, P.x(b), P.y(y), 4.5 * P.fs, t.color); d.classList.add('hwb-tmp'); } });
      tbl.replaceChildren(table(['dictionary', T('\\vw'), `cost at ${tok(b)}`, 'smallest b'],
        TYPES.map(t => {
          const c = 8 * t.w / b, bmin = 8 * t.w / tau;
          return [t.short, String(t.w),
            { html: `${fmt(c, c < 0.1 ? 3 : 2)} bit`, cls: c <= tau ? 'pos' : 'neg' },
            bmin > L ? `${tok(Math.round(bmin))} (> request)` : `${fmt(Math.ceil(bmin), 0)}`];
        }), { left: [0] }));
    }
    draw();
  };

  // ============================================================ VI.15 — the formula, term by term
  FIG.hwbAnatomy = function (host) {
    const OPTS = [['hs4', 'HiSparse'], ['req', 'request scope'], ['blk32', 'block, w = 32'], ['blk256', 'block, w = 256'], ['cache', 'dictionary cache']];
    let id = 'req';
    const eq = h('div', { class: 'hwb-eq' });
    const bars = h('div');
    const kp = { link: kpi(T('\\vNlink'), '', 'link-bound', 'var(--ink-2)'), hbm: kpi(T('\\vNhbm'), '', 'memory-bound', 'var(--ink-2)'), n: kpi(T('\\vN'), '', '') };
    const note = h('p', { class: 'fig-note' });
    host.append(controls(seg(OPTS, id, v => { id = v; draw(); }, 'scenario')), eq, legend([
      ['δ-misses', series(0), 'box'], ['raw misses', series(1), 'box'], ['dictionary loads', series(3), 'box'],
      ['hot cache', series(2), 'box'], ['resident dictionaries', series(4), 'box']]), bars, h('div', { class: 'kpis' }, kp.link, kp.hbm, kp.n), note);
    function draw() {
      const s = scen(SCEN.find(x => x.id === id)), r = econ(s), r0 = econ(scen(SCEN[1]));
      const mk = `${fmt(r.m, 3)} \\cdot ${s.k} \\cdot ${s.NL} \\cdot ${s.e}\\,\\text{B}`;
      eq.innerHTML = tex(`\\begin{aligned}\\vTstep &= \\underbrace{${mk}}_{\\text{all misses: } ${fmt(r.miss / 1e6, 1)}\\text{ MB}} \\\\ &\\quad \\times \\big[\\underbrace{${fmt(r.fD, 2)}}_{\\vfD} \\cdot \\underbrace{${fmt(r.rho, 2)}}_{\\vrho} + (1 - ${fmt(r.fD, 2)})\\big] \\\\ &\\quad + \\underbrace{${fmt(r.nload, 2)}}_{\\vnload} \\cdot ${s.NL} \\cdot \\underbrace{${s.scope === 'hisparse' ? 0 : s.w}}_{\\vw} \\cdot ${s.e}\\,\\text{B} \\\\ &= ${fmt(r.T / 1e6, 2)}\\text{ MB} \\\\[8pt] \\vMreq &= ${s.NL} \\cdot ${s.e}\\,\\text{B} \\cdot (\\underbrace{${s.B}}_{\\vB} + \\underbrace{${fmt(r.wres, 0)}}_{\\vwres}) \\\\ &= ${fmt(r.M / 1e6, 0)}\\text{ MB}\\end{aligned}`, true);
      const maxT = Math.max(r.T, r0.T) * 1.02, maxM = Math.max(r.M, r0.M) * 1.02;
      bars.replaceChildren(
        h('div', { class: 'hwb-shead', text: 'bytes moved over the link per step, per request' }),
        stackRows([
          { label: 'HiSparse, B = 4K', parts: [{ v: r0.parts.raw, color: series(1), name: 'raw misses' }], value: MB(r0.T) },
          { label: 'this scenario', cls: 'is-sel', parts: [{ v: r.parts.delta, color: series(0), name: 'δ-misses' }, { v: r.parts.raw, color: series(1), name: 'raw misses' }, { v: r.parts.loads, color: series(3), name: 'dictionary loads' }], value: MB(r.T) },
        ], maxT),
        h('div', { class: 'hwb-shead', text: 'GPU memory per request' }),
        stackRows([
          { label: 'HiSparse, B = 4K', parts: [{ v: r0.mparts.hot, color: series(2), name: 'hot cache' }], value: MB(r0.M) },
          { label: 'this scenario', cls: 'is-sel', parts: [{ v: r.mparts.hot, color: series(2), name: 'hot cache' }, { v: r.mparts.dict, color: series(4), name: 'resident dictionaries' }], value: MB(r.M) },
        ], maxM));
      kp.link.set(fmt(r.Nlink, 0), `link-bound · ${fmt(s.link, 0)} GB/s × ${s.tpot} ms ÷ ${MB(r.T)}`);
      kp.hbm.set(fmt(r.Nhbm, 0), `memory-bound · ${fmt(s.hbm, 0)} GB ÷ ${MB(r.M)}`);
      kp.n.set(fmt(r.N, 0), `requests per GPU · ${r.binds === 'link' ? 'the link binds' : r.binds === 'memory' ? 'GPU memory binds' : 'both bind'}`);
      note.textContent = id === 'hs4' ? 'HiSparse is the special case ρ = 1, f_D = 0, n_load = 0, w_res = 0.'
        : `Assumed, not measured: ρ = ${fmt(r.rho, 2)}, w = ${s.w}${s.scope === 'block-cache' ? `, f_D = ${s.fD}, n_load = ${s.nload}` : ''}.`
          + (r.admit ? ` One-off load when the request is admitted: ${MB(r.admit)} (not per step).` : '');
    }
    draw();
  };

  // ============================================================ VI.16 — the what-if calculator
  FIG.hwbCalculator = function (host) {
    const p = Object.assign({}, REF, DICT0, { scope: 'block-cache', w: 256, rho: 0.55, nD: 4, fD: 0.85, nload: 0.05 });
    const inputs = {};
    const ARIA = { L: 'context length L', k: 'selections k', NL: 'layers', e: 'entry size e', tpot: 'step time in ms', link: 'link GB/s',
      hbm: 'GPU memory GB', m2: 'miss rate at 2048', m4: 'miss rate at 4096', m8: 'miss rate at 8192', rho: 'delta ratio', w: 'dictionary weight',
      b: 'block size', nD: 'resident dictionaries', fD: 'delta-miss fraction', nload: 'loads per step per layer', dec: 'decoder speed GB/s' };
    function num(key, label, step, unit, assumed) {
      const inp = h('input', { type: 'number', step: String(step), value: String(p[key]), 'aria-label': ARIA[key] || key });
      inp.addEventListener('input', () => { const v = parseFloat(inp.value); if (Number.isFinite(v) && v >= 0) { p[key] = v; run(); } });
      inputs[key] = inp;
      return h('label', { class: 'hwb-in' + (assumed ? ' is-assumed' : '') }, h('span', { class: 'hwb-in-name', html: label }),
        h('span', { class: 'hwb-in-box' }, inp, unit ? h('span', { class: 'hwb-in-unit', text: unit }) : null));
    }
    function pick(key, label, opts) {
      const s = h('select', { 'aria-label': label });
      opts.forEach(([v, t]) => s.append(h('option', { value: String(v), text: t })));
      s.value = String(p[key]);
      s.addEventListener('change', () => { p[key] = isNaN(+s.value) ? s.value : +s.value; run(); });
      inputs[key] = s;
      return h('label', { class: 'hwb-in' }, h('span', { class: 'hwb-in-name', html: label }), h('span', { class: 'hwb-in-box' }, s));
    }
    const start = h('select', { 'aria-label': 'start from a scenario' });
    start.append(h('option', { value: '', text: 'load a scenario…' }));
    SCEN.forEach(s => start.append(h('option', { value: s.id, text: s.name })));
    start.addEventListener('change', () => {
      const s = SCEN.find(x => x.id === start.value);
      if (!s) return;
      if (s.scope === 'hisparse') p.B = s.B;          // HiSparse is the comparison column: only B changes
      else ['scope', 'B', 'rho', 'w', 'b', 'nD', 'fD', 'nload'].forEach(k => { if (s[k] != null) p[k] = s[k]; });
      Object.keys(inputs).forEach(k => { inputs[k].value = String(p[k]); });
      start.value = '';
      run();
    });
    const reset = btn('Reset to the reference setting', () => { Object.assign(p, REF); Object.keys(inputs).forEach(k => { inputs[k].value = String(p[k]); }); run(); }, { cls: 'sm' });

    const fsRig = h('fieldset', { class: 'hwb-fs' }, h('legend', { text: 'The rig (reference setting, III.10)' }),
      num('L', `context length ${T('\\vL')}`, 1000, 'tokens'), num('k', `selections ${T('\\vk')}`, 1, 'per layer'),
      num('NL', `layers ${T('\\vNL')}`, 1, ''), num('e', `entry size ${T('\\ve')}`, 1, 'bytes'),
      num('tpot', `step time ${T('\\vtpot')}`, 1, 'ms'), num('link', `link ${T('\\vWlink')}`, 1, 'GB/s'),
      num('hbm', `GPU memory ${T('\\vMhbm')}`, 1, 'GB'));
    const fsCache = h('fieldset', { class: 'hwb-fs' }, h('legend', { text: 'The hot cache (HiSparse’s measured miss rates)' }),
      pick('B', `hot-cache slots ${T('\\vB')}`, [[2048, '2048'], [4096, '4096'], [8192, '8192']]),
      num('m2', `miss rate at ${T('\\vB = 2048')}`, 0.001, ''), num('m4', `miss rate at ${T('\\vB = 4096')}`, 0.001, ''),
      num('m8', `miss rate at ${T('\\vB = 8192')}`, 0.001, ''));
    const fsDict = h('fieldset', { class: 'hwb-fs' }, h('legend', { text: 'The dictionary (assumed until measured)' }),
      pick('scope', 'scope', [['global', 'global (solo coding)'], ['request', 'request'], ['block-all', 'block, all resident'], ['block-cache', 'block, dictionary cache']]),
      num('rho', `delta ratio ${T('\\vrho')}`, 0.01, '', true), num('w', `weight ${T('\\vw')}`, 1, 'entries', true),
      num('b', `block size ${T('\\vb')}`, 256, 'tokens'), num('nD', `resident ${T('\\vnD')}`, 1, 'per layer'),
      num('fD', `δ-miss fraction ${T('\\vfD')}`, 0.01, '', true), num('nload', `loads ${T('\\vnload')}`, 0.01, 'per step per layer', true),
      num('dec', 'decoder speed', 10, 'GB/s', true));
    const out = h('div'), note = h('p', { class: 'fig-note' });
    const kp = { hs: kpi('HiSparse', '', '', series(6)), kv: kpi('kv-blockdiff', ''), gain: kpi('gain', '', 'requests per GPU', series(5)) };
    const chartBox = h('div');
    host.append(controls(h('label', { class: 'hwb-start' }, start), reset),
      h('div', { class: 'hwb-calc' }, fsRig, fsCache, fsDict),
      h('div', { class: 'kpis' }, kp.hs, kp.kv, kp.gain), out, note,
      h('div', { class: 'hwb-shead', text: 'Scenarios, recomputed from the rig above' }),
      legend([['link-bound requests per GPU', series(0), 'box'], ['memory-bound requests per GPU', series(1), 'box'], ['requests per GPU (the smaller)', 'var(--ink)', 'line']]),
      chartBox);

    let P = null;
    function chart(rows) {
      chartBox.replaceChildren();
      const vmax = Math.max(...rows.flatMap(r => [r.Nlink, r.Nhbm]).filter(Number.isFinite));
      const top = Math.max(50, Math.ceil(vmax * 1.12 / 50) * 50);
      P = Plot(chartBox, { ycats: rows.map(r => r.short), x: [0, top], h: tall(chartBox, 420), grid: 'x', m: { r: 30 },
        xlabel: 'concurrent decode requests per GPU', label: 'Link-bound and memory-bound requests per GPU for each scenario' });
      bars(P, rows.map(r => [Math.min(r.Nlink, top), Math.min(r.Nhbm, top)]), { horizontal: true, colors: [series(0), series(1)], width: 15, fill: 0.84,
        tip: (v, i) => { const r = rows[i]; return `<b>${r.name}</b><br>link-bound ${fmt(r.Nlink, 0)} · memory-bound ${fmt(r.Nhbm, 0)}<br><b>${fmt(r.N, 0)} requests per GPU</b> (${r.binds === 'link' ? 'the link binds' : 'memory binds'})${r.assumed ? '<br><i>ρ, w, f_D, loads assumed</i>' : ''}`; } });
      const slot = Math.abs(P.y(1) - P.y(0));
      rows.forEach((r, i) => {
        const X = P.x(Math.min(r.N, top)), Y = P.y(i);
        el('line', { x1: X, x2: X, y1: Y - slot * 0.42, y2: Y + slot * 0.42, style: 'stroke:var(--ink);stroke-width:3;stroke-linecap:round' }, P.g.top);
        el('text', { x: P.x(Math.min(top, Math.max(r.Nlink, r.Nhbm))) + 6 * P.fs, y: Y + 4 * P.fs, class: 'val', style: 'font-weight:700', text: fmt(r.N, 0) }, P.g.top);
      });
      const base = rows.find(r => r.id === 'hs4');
      if (base) rule(P, { x: base.N, label: `HiSparse 4K: ${fmt(base.N, 0)}`, dash: '3 4' });
    }
    function run() {
      const S = Object.assign({}, p);
      const r0 = econ(Object.assign({}, S, { scope: 'hisparse' })), r = econ(S);
      const warn = r.decode > p.dec * 1e9;
      out.replaceChildren(table(['', 'HiSparse', 'kv-blockdiff'], [
        [`bytes per step ${T('\\vTstep')}`, MB(r0.T), MB(r.T)],
        ['… dictionary loads', '—', MB(r.parts.loads)],
        [`memory per request ${T('\\vMreq')}`, MB(r0.M), MB(r.M)],
        [`link-bound ${T('\\vNlink')}`, fmt(r0.Nlink, 0), fmt(r.Nlink, 0)],
        [`memory-bound ${T('\\vNhbm')}`, fmt(r0.Nhbm, 0), fmt(r.Nhbm, 0)],
        { cells: [`<b>requests per GPU ${T('\\vN')}</b>`, `<b>${fmt(r0.N, 0)}</b>`, `<b>${fmt(r.N, 0)}</b>`], cls: 'sum' },
        [`resident weight ${T('\\vwres')}`, '0', `${fmt(r.wres, 0)} entries`],
        ['load at admission', '—', r.admit ? MB(r.admit) : '—'],
        ['decoder output needed', '—', { html: `${fmt(r.decode / 1e9, 0)} GB/s${warn ? ' (too fast)' : ''}`, cls: warn ? 'neg' : '' }],
      ], { left: [0] }));
      kp.hs.set(fmt(r0.N, 0), `requests per GPU · ${r0.binds === 'link' ? 'link-bound' : 'memory-bound'}`);
      kp.kv.set(fmt(r.N, 0), `requests per GPU · ${r.binds === 'link' ? 'link-bound' : 'memory-bound'}`);
      kp.gain.set(`${fmt(r.N / r0.N, 2)}×`, 'requests per GPU vs HiSparse');
      const used = { global: 'Global scope: one code shared by every request (solo coding); only ρ matters.', request: 'Request scope ignores b, n_D, f_D and loads (one dictionary per request, loaded at admission).',
        'block-all': 'All resident: every block dictionary of the request stays on the GPU (ceil(L/b) per layer); n_D, f_D and loads are ignored.',
        'block-cache': 'Dictionary cache: n_D dictionaries per layer stay resident; f_D and the load rate are what trace replay will measure.' }[p.scope];
      note.textContent = used + ' Requests per GPU are rounded to the nearest whole request.';
      const rows = SCEN.map(s => Object.assign(econ(scen(s, p)), { id: s.id, short: s.short, name: s.name, assumed: s.scope !== 'hisparse' }));
      rows.push(Object.assign({}, r, { id: 'you', short: 'yours', name: 'your settings above', assumed: true }));
      chart(rows);
    }
    run();
  };

  // ============================================================ VI.17 — break-even 1: dictionary loads
  FIG.hwbLoads = function (host) {
    const WS = [{ w: 2, name: 'loc', color: 'var(--t-loc)' }, { w: 32, name: 'rank-16 KLT', color: 'var(--t-klt)' },
      { w: 256, name: 'VQ-256', color: 'var(--t-vq)' }, { w: 4096, name: 'full basis', color: 'var(--t-klt)', dash: '7 5' }];
    let rho = 0.65, fD = 0.85, nl = 0.1, nD = 4;
    const mk = REF.m4 * REF.k;                              // misses per layer per step at B = 4096: ≈ 274
    const box = h('div'), tbl = h('div');
    host.append(controls(
      slider(texify('$\\vrho$ (assumed)'), 0.3, 0.95, 0.01, rho, v => { rho = v; draw(); }),
      slider(texify('$\\vfD$ (assumed)'), 0.3, 1, 0.01, fD, v => { fD = v; draw(); }),
      slider(texify('$\\vnD$'), 1, 16, 1, nD, v => { nD = v; draw(); }, v => fmt(v, 0))),
    legend(WS.map(t => [`${t.name}, ${T(`\\vw = ${t.w}`)}`, t.color, t.dash ? 'dash' : 'line'])), box, tbl);
    const P = Plot(box, { x: [0.001, 10], xlog: 10, y: [0, 2], h: tall(box, 360), xfmt: v => String(v),
      xlabel: 'dictionary loads per step per layer, n_load', ylabel: 'link bytes vs HiSparse',
      label: 'Link traffic relative to HiSparse against the dictionary load rate' });
    const knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
    draggable(knob, P, ([x]) => { nl = clamp(x, 0.001, 10); draw(); }, null, { get: () => [nl, P.y0], step: [0, 0], label: 'loads per step per layer' });
    knob.addEventListener('keydown', e => {
      const f = e.shiftKey ? 10 : Math.SQRT2;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { nl = Math.min(10, nl * f); draw(); e.preventDefault(); e.stopImmediatePropagation(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { nl = Math.max(0.001, nl / f); draw(); e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    const xs = range(0, 61).map(i => 0.001 * Math.pow(10, i / 15));
    function draw() {
      P.clear('data');
      P.g.top.querySelectorAll('.hwb-tmp').forEach(n => n.remove());
      const floor = fD * rho + (1 - fD);
      area(P, [[0.001, 1, 2], [10, 1, 2]], { color: 'var(--bad)', opacity: 0.07 });
      WS.forEach(t => line(P, xs.map(x => [x, floor + x * t.w / mk]), { color: t.color, dash: t.dash, width: 2.5 }));
      svgText(P.g.top, P.x(0.0012), P.y(1) - 6 * P.fs, 'HiSparse: break-even', { class: 'lbl hwb-tmp' });
      svgText(P.g.top, P.x(0.0012), P.y(floor) + 15 * P.fs, `no loads: ${fmt(floor, 2)}`, { class: 'lbl hwb-tmp' });
      [rule(P, { y: 1, color: 'var(--bad)' }),
        rule(P, { y: floor, color: 'var(--good)' }),
        rule(P, { x: nl, color: 'var(--c)', dash: false })].forEach(g => g.classList.add('hwb-tmp'));
      P.g.top.querySelectorAll('.hwb-tmp').forEach(n => P.g.top.insertBefore(n, knob));   // keep the knob on top without moving it (moving it would drop keyboard focus)
      knob.setAttribute('cx', P.x(nl)); knob.setAttribute('cy', P.y(P.y0));
      WS.forEach(t => { const y = floor + nl * t.w / mk; if (y < 2) dot(P.g.top, P.x(nl), P.y(y), 4.5 * P.fs, t.color).classList.add('hwb-tmp'); });
      tbl.replaceChildren(table(['dictionary', T('\\vw'), `traffic at ${fmt(nl, nl < 0.01 ? 4 : 3)}`, `break-even ${T('\\vnload')}`, 'min. lifetime, steps'],
        WS.map(t => {
          const y = floor + nl * t.w / mk, nstar = fD * (1 - rho) * mk / t.w;
          return [t.short, String(t.w), { html: `${fmt(y, 2)}×`, cls: y < 1 ? 'pos' : 'neg' }, fmt(nstar, nstar < 0.1 ? 3 : 2), `≥ ${fmt(Math.max(1, nD / nstar), 0)}`];
        }), { left: [0] }));
    }
    draw();
  };

  // ============================================================ VI.17 — break-even 2: decoder throughput
  FIG.hwbDecode = function (host) {
    const DEC = [
      { name: 'SplitZip, BF16 (H200)', v: 2200, kind: 'fixed-length' },
      { name: 'SplitZip, FP8 E5M2 (H200)', v: 565, kind: 'fixed-length' },
      { name: 'DFloat11 (Huffman)', v: 468, kind: 'Huffman' },
      { name: 'rANS-type, typical', v: 100, lo: 20, hi: 300, kind: 'entropy coder (rough range)' },
    ];
    let N = 110, B = 4096;
    const box = h('div'), ro = readout();
    host.append(controls(
      slider(texify('requests per GPU $\\vN$'), 20, 300, 1, N, v => { N = v; draw(); }, v => fmt(v, 0)),
      seg([[2048, 'B = 2K'], [4096, 'B = 4K'], [8192, 'B = 8K']], B, v => { B = +v; draw(); }, 'hot-cache size')),
    legend([['fixed-length decoders', series(2), 'box'], ['entropy-coded decoders', series(3), 'box'], ['needed: miss path', 'var(--ink)', 'line'], ['needed: lever 2 (every read decodes)', 'var(--bad)', 'dash']]), box, ro);
    const P = Plot(box, { ycats: DEC.map(d => d.name), x: [5, 5000], xlog: 10, h: tall(box, 300), grid: 'x',
      xlabel: 'decoder output, GB/s (log scale)', label: 'Decoder throughput against what the miss path needs' });
    function draw() {
      P.clear();
      const m = missOf(REF, B), perStep = REF.k * REF.NL * REF.e / (REF.tpot / 1e3);
      const need = N * m * perStep, need2 = N * perStep;
      DEC.forEach((d, i) => {
        const Y = P.y(i), hh = Math.abs(P.y(1) - P.y(0)) * 0.5, color = d.kind === 'fixed-length' ? series(2) : series(3);
        if (d.lo) el('rect', { x: P.x(d.lo), y: Y - hh / 2, width: P.x(d.hi) - P.x(d.lo), height: hh, rx: 4, style: `fill:${color};fill-opacity:.35;stroke:${color};stroke-dasharray:4 3` }, P.g.data);
        else el('rect', { x: P.x(5), y: Y - hh / 2, width: P.x(d.v) - P.x(5), height: hh, rx: 4, style: `fill:${color}` }, P.g.data);
        const hit = el('rect', { class: 'hit', x: P.m.l, y: Y - hh, width: P.pw, height: 2 * hh }, P.g.top);
        hover(hit, () => `<b>${d.name}</b><br>${d.lo ? `about ${d.lo}–${d.hi} GB/s (rough)` : `${fmt(d.v, 0)} GB/s`} · ${d.kind}<br>${fmt((d.lo || d.v) * 1e9 / need, 1)}× the miss-path need`);
        el('text', { x: P.x(d.hi || d.v) + 6 * P.fs, y: Y + 4 * P.fs, class: 'val', text: d.lo ? `${d.lo}–${d.hi}` : fmt(d.v, 0) }, P.g.top);
      });
      rule(P, { x: need / 1e9, label: `miss path: ${fmt(need / 1e9, 0)}`, color: 'var(--ink)', dash: false });
      rule(P, { x: need2 / 1e9, label: `lever 2: ${fmt(need2 / 1e9, 0)}`, color: 'var(--bad)' });
      area(P, [[need / 1e9, -0.5, DEC.length - 0.5], [10 * need / 1e9, -0.5, DEC.length - 0.5]], { color: 'var(--saffron)', opacity: 0.1 });
      ro.set([['misses per step', `${fmt(m * REF.k, 0)} per layer`], ['miss path needs', `${fmt(need / 1e9, 0)} GB/s`], ['10× headroom', `${fmt(10 * need / 1e9, 0)} GB/s`], ['lever 2 needs', `${fmt(need2 / 1e9, 0)} GB/s`]]);
    }
    draw();
  };

  // ============================================================ VI.18 — the synthetic dress rehearsal
  FIG.hwbRehearsal = async function (host) {
    const res = await fetch(KV.prefix + 'assets/figs/data/homework-b-rehearsal.json');
    if (!res.ok) throw new Error('homework-b-rehearsal.json: HTTP ' + res.status);
    const D = await res.json();
    const TY = [
      { id: 'loc', name: 'loc', color: 'var(--t-loc)' },
      { id: 'klt', name: 'KLT bound', color: 'var(--t-klt)', dash: '7 5' },
      { id: 'vq', name: 'VQ, 256 centroids', color: 'var(--t-vq)' },
      { id: 'sib', name: 'sib', color: 'var(--t-sib)' },
    ];
    let run = 'original';
    const on = { loc: true, klt: true, vq: true, sib: true };
    const box = h('div'), ro = readout();
    const toggles = TY.map(t => btn(t.name, (ev, b) => { on[t.id] = !on[t.id]; b.setAttribute('aria-pressed', String(on[t.id])); draw(); }, { pressed: true, cls: 'sm' }));
    host.append(controls(seg([['original', 'original data'], ['shuffled', 'shuffle control']], run, v => { run = v; draw(); }, 'which data'), h('span', { class: 'hwb-toggles' }, ...toggles)),
      legend([...TY.map(t => [`${t.name}, block scope`, t.color, t.dash ? 'dash' : 'line']),
        ['global scope', 'var(--t-scope-global)', 'line'], ['request scope', 'var(--t-scope-request)', 'dash']]), box, ro);
    const Y0 = 5.95, Y1 = 7.5;
    const X1 = 9500, XL = 11000;            // flat lines stop at X1; their labels sit in the gutter beyond
    const P = Plot(box, { x: [104, 36000], xlog: 2, y: [Y0, Y1], h: tall(box, 420), xticks: D.b, xfmt: v => tok(v),
      xlabel: 'block size b (tokens)', ylabel: 'bits per element, all included',
      label: 'Lossless rate against block size for four dictionary types, with global and request lines' });
    const partTip = (t, p, b, v) => `<b>${t.name}, b = ${tok(b)}</b><br>${fmt(v, 3)} bits per element<br>residual ${fmt(p.resid, 3)}`
      + (p.side ? ` · ${t.id === 'vq' ? 'index' : 'pointer'} ${fmt(p.side, 3)}` : '') + ` · dictionary ${fmt(p.dict, 3)}${t.id === 'klt' ? ' (basis excluded)' : ''}`;
    function draw() {
      P.clear();
      const R = D[run];
      rule(P, { x: D.meta.true_block });
      svgText(P.g.top, P.x(D.meta.true_block) + 6 * P.fs, P.y(Y0) - 8 * P.fs, 'planted block length', { class: 'lbl' });
      const labels = [];
      TY.forEach(t => {
        if (!on[t.id] || R.global[t.id] == null) return;
        const short = t.id === 'klt' ? 'KLT' : t.name;
        line(P, [[104, R.global[t.id]], [X1, R.global[t.id]]], { color: 'var(--t-scope-global)', width: 1.8, dash: t.id === 'klt' ? '7 5' : null });
        line(P, [[104, R.request[t.id]], [X1, R.request[t.id]]], { color: 'var(--t-scope-request)', width: 1.8, dash: '2 4' });
        labels.push({ y: P.y(R.global[t.id]), text: `global ${short}` }, { y: P.y(R.request[t.id]), text: `request ${short}` });
      });
      labels.sort((u, v) => u.y - v.y);
      const gap = 13 * P.fs;
      labels.forEach((l, i) => { l.at = i ? Math.max(l.y, labels[i - 1].at + gap) : l.y; });
      labels.forEach(l => svgText(P.g.top, P.x(XL), l.at + 4 * P.fs, l.text, { class: 'lbl' }));
      TY.forEach(t => {
        if (!on[t.id]) return;
        const pts = D.b.map((b, i) => [b, R.block[t.id][i] == null ? NaN : Math.min(R.block[t.id][i], Y1 + 1)]);
        line(P, pts, { color: t.color, dash: t.dash, width: 2.6, markers: 4.2,
          tip: (pt) => { const i = D.b.indexOf(pt[0]); return partTip(t, R.parts[t.id][i], pt[0], R.block[t.id][i]); } });
        D.b.forEach((b, i) => {
          const v = R.block[t.id][i];
          if (v != null && v > Y1) {
            el('text', { x: P.x(b), y: P.m.t + 12 * P.fs, 'text-anchor': 'middle', class: 'val', text: `↑ ${fmt(v, 1)}` }, P.g.top);
          }
        });
      });
      const G = D.gains[run];
      ro.set([['data', run === 'original' ? 'original sequences' : 'tokens shuffled across 32 requests'],
        [T('\\vgainreq') + ' (loc)', `${fmtS(G.g_req_loc, 3)} bit`], [T('\\vgainblk') + ' (loc)', `${fmtS(G.g_blk_loc, 3)} bit`],
        ['best loc block', `${tok(G.best_b_loc)} tokens`]]);
    }
    draw();
  };
})();
