/* =====================================================================
   figures/idea.js — Part IV "The idea, and what it bets on" (pages IV.1–IV.15).
   Every builder is FIG.<name>; all helpers live inside this closure.
   Colours: CSS variables only. Brand colours of glossary terms are available
   as var(--t-<term-id>) (set by the layout), e.g. var(--t-delta-miss).
   Toy data come from seeded generators, so the prose and the figures agree.
   ===================================================================== */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------ shared helpers
  const T = id => `var(--t-${id})`;                       // brand colour of a glossary term
  const tint = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const E_BYTES = 640;                                     // entry size e in the reference setting (bytes)
  const isNarrow = host => (host.getBoundingClientRect().width || 640) < 540;
  const f0 = v => fmt(v, 0), f1 = v => fmt(v, 1), f2 = v => fmt(v, 2), f3 = v => fmt(v, 3);
  const pct = (v, d = 0) => `${fmt(100 * v, d)} %`;
  const bitsOf = R => 0.5 * Math.log2(1 / (1 - R));       // the Gaussian exchange rate of II.12

  function rect(g, x, y, w, hh, o = {}) {
    const st = [`fill:${o.fill || 'var(--paper-3)'}`, `stroke:${o.stroke || 'var(--rule)'}`, `stroke-width:${o.sw || 1.2}`];
    if (o.dash) st.push(`stroke-dasharray:${o.dash}`);
    if (o.op != null) st.push(`opacity:${o.op}`);
    return el('rect', { x, y, width: Math.max(0, w), height: Math.max(0, hh), rx: o.rx == null ? 5 : o.rx, style: st.join(';'), class: o.cls || null }, g);
  }
  function txt(g, x, y, s, o = {}) {
    return svgText(g, x, y, s, { class: o.cls || 'lbl', 'text-anchor': o.anchor || 'middle', style: o.style || null });
  }
  function arrowPath(g, d, color, o = {}) {
    const id = uid('ah');
    const m = el('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, g);
    el('path', { d: 'M0,0 L10,5 L0,10 z', style: `fill:${color}` }, m);
    return el('path', { d, style: `fill:none;stroke:${color};stroke-width:${o.w || 2};${o.dash ? 'stroke-dasharray:' + o.dash + ';' : ''}stroke-linecap:round`, 'marker-end': `url(#${id})` }, g);
  }
  // a small coloured key + text, for HTML legends built by hand
  const key = (color, label, shape = 'box') => [label, color, shape];

  // runs fn(i) for i = 0..n-1 in small chunks, so the page stays responsive; returns a cancel function
  function chunked(n, fn, done, perTick = 1) {
    let i = 0, alive = true;
    function tick() {
      if (!alive) return;
      const end = Math.min(n, i + perTick);
      for (; i < end; i++) fn(i);
      if (i < n) setTimeout(tick, 0); else if (done) done();
    }
    setTimeout(tick, 0);
    return () => { alive = false; };
  }

  // =================================================================== IV.1
  // FIG.ideaMapping — the two worlds side by side; click a row for what carries over and what changes.
  FIG.ideaMapping = function (host) {
    const rows = [
      { a: 'One tiny file', as: 'a Gull Rock message, about 148 bytes', b: 'One entry $\\vE_{\\vl,\\vt}$', bs: 'one token at one layer; $\\ve = 640$ bytes in the reference setting',
        same: 'The unit that is fetched alone, one at a time.', diff: 'Numbers instead of text: an entry is a vector of 8-bit numbers, not a line of JSON.' },
      { a: 'The stream of similar files', as: 'all the messages from the same station', b: 'The entries of one block', bs: '$\\vb$ consecutive tokens of one request at one layer',
        same: 'The family of look-alikes a dictionary is fitted on.', diff: 'We choose the family: the block size $\\vb$ is a knob of our design (IV.2).' },
      { a: 'The trained dictionary', as: 'built from sample messages', b: 'The block dictionary $\\vD_{\\vj}$', bs: 'per-channel means and scales, a few directions, a few centroids…',
        same: 'Side information shared by many items.', diff: 'It predicts numbers instead of supplying byte strings to copy (I.5).' },
      { a: 'Ship the dictionary once', as: 'both ends keep it for years', b: 'Load $\\vD_{\\vj}$ into GPU memory once', bs: 'and keep it while the block is in use',
        same: 'Pay once, use for many items.', diff: 'GPU memory is tiny, so dictionaries come and go: which ones are resident must be managed (IV.4).' },
      { a: 'The compressed message', as: 'about 20 bytes against the dictionary', b: 'The delta $\\vdelta_{\\vt}$', bs: 'what is left after predicting from $\\vD_{\\vj}$, stored exactly',
        same: 'Small, and useless without its dictionary.', diff: 'It must decode alone, at a random position, in microseconds (IV.6).' },
      { a: 'The decompressor', as: 'zstd on the receiving computer', b: 'A gather-and-add on the GPU', bs: '$\\vE_{\\vt} = \\mathrm{decode}(\\vdelta_{\\vt}, \\vD_{\\vj})$, bit for bit',
        same: 'Lossless: the original comes back exactly.', diff: 'It runs at miss time, inside a decode step that lasts a fraction of a millisecond.' },
      { a: 'What repeats', as: 'byte strings: keys, quotes, digits', b: 'What repeats', bs: 'statistical shape: typical values, directions, clusters',
        same: 'Redundancy between items, invisible inside one item.', diff: 'Whether KV entries have enough of it is not known yet. That is the bet (IV.7–IV.8).' },
    ];
    let open = new Set([0]);
    const list = h('div', { class: 'ivm-list', role: 'list' });
    const heads = h('div', { class: 'ivm-heads' },
      h('span', { class: 'ivm-h ivm-h-a', text: 'zstd and the tiny files (Part I)' }), h('span', { class: 'ivm-h-mid' }),
      h('span', { class: 'ivm-h ivm-h-b', text: 'kv-blockdiff and the KV cache' }));
    const allBtn = btn('Show every note', (e, b) => {
      open = open.size === rows.length ? new Set() : new Set(rows.map((_, i) => i));
      b.innerHTML = open.size === rows.length ? 'Hide the notes' : 'Show every note';
      draw();
    }, { cls: 'sm' });
    function draw() {
      list.replaceChildren();
      rows.forEach((r, i) => {
        const isOpen = open.has(i);
        const row = h('div', { class: 'ivm-row' + (isOpen ? ' is-open' : ''), role: 'listitem', tabindex: '0', 'aria-expanded': String(isOpen) },
          h('div', { class: 'ivm-card ivm-a' }, h('b', { html: texify(r.a) }), h('span', { html: texify(r.as) })),
          h('div', { class: 'ivm-mid', 'aria-hidden': 'true', text: '⇄' }),
          h('div', { class: 'ivm-card ivm-b' }, h('b', { html: texify(r.b) }), h('span', { html: texify(r.bs) })),
          isOpen ? h('div', { class: 'ivm-note' },
            h('span', {}, h('i', { text: 'carries over · ' }), r.same),
            h('span', {}, h('i', { text: 'changes · ' }), h('span', { html: texify(r.diff) }))) : null);
        const toggle = () => { if (open.has(i)) open.delete(i); else open.add(i); draw(); list.children[i].focus(); };
        row.addEventListener('click', toggle);
        row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
        list.append(row);
      });
    }
    host.append(controls(allBtn, h('span', { class: 'fig-note', text: 'Click a row (or focus it and press Enter) for what carries over and what changes.' })), heads, list);
    draw();
  };

  // FIG.ideaSystem — where the bytes live and what a miss moves: HiSparse versus kv-blockdiff.
  FIG.ideaSystem = function (host) {
    let mode = 'blockdiff';
    const RHO = 0.75, W_LOAD = 32;                         // assumed, illustrative
    const box = h('div');
    const ro = readout();
    host.append(controls(seg([['hisparse', 'HiSparse today'], ['blockdiff', 'kv-blockdiff']], mode, v => { mode = v; draw(); }, 'Which system')), box, ro);
    const narrow = isNarrow(host);
    const D = narrow ? Diagram(box, { w: 380, h: 600, label: 'Host memory, the link and GPU memory, stacked' })
      : Diagram(box, { w: 680, h: 330, label: 'Host memory on the left, the link in the middle, GPU memory on the right' });
    const g = el('g', {}, D.svg);

    function draw() {
      g.replaceChildren();
      const bd = mode === 'blockdiff';
      // geometry: host box, gpu box, link band
      const L = narrow ? { hx: 10, hy: 10, hw: 360, hh: 262, gx: 10, gy: 372, gw: 360, gh: 222 }
        : { hx: 8, hy: 30, hw: 240, hh: 290, gx: 432, gy: 30, gw: 240, gh: 290 };
      rect(g, L.hx, L.hy, L.hw, L.hh, { fill: 'var(--paper-2)', rx: 10 });
      rect(g, L.gx, L.gy, L.gw, L.gh, { fill: 'var(--paper-2)', rx: 10 });
      txt(g, L.hx + 12, L.hy + 22, 'host memory (DRAM) · big, slow to reach', { anchor: 'start' });
      txt(g, L.gx + 12, L.gy + 22, 'GPU memory (HBM) · small, fast', { anchor: 'start' });
      // --- host contents
      const hx0 = L.hx + 14, hy0 = L.hy + 38;
      if (!bd) {
        txt(g, hx0, hy0 + 8, 'the whole history, entry by entry (e bytes each)', { anchor: 'start', cls: 'annot' });
        for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
          rect(g, hx0 + c * 54, hy0 + 22 + r * 24, 48, 18, { fill: tint(T('entry'), 30), stroke: T('entry'), rx: 3 });
        }
      } else {
        txt(g, hx0, hy0 + 8, 'the same history, block by block', { anchor: 'start', cls: 'annot' });
        for (let bk = 0; bk < 2; bk++) {
          const y = hy0 + 20 + bk * 76;
          rect(g, hx0 - 4, y - 4, L.hw - 20, 70, { fill: 'none', stroke: T('block'), dash: '4 3', rx: 6 });
          rect(g, hx0, y, 66, 60, { fill: tint(T('dictionary'), 35), stroke: T('dictionary'), rx: 4 });
          txt(g, hx0 + 33, y + 26, bk ? 'D₁' : 'D₀', { cls: 'lbl ink' });
          txt(g, hx0 + 33, y + 44, 'w·e bytes', { cls: 'val' });
          for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
            rect(g, hx0 + 74 + c * 22, y + 2 + r * 20, 17, 15, { fill: tint(T('delta'), 35), stroke: T('delta'), rx: 2 });
          }
        }
        txt(g, hx0, L.hy + L.hh - 14, 'deltas δ: ρ·e bytes each, one per entry', { anchor: 'start', cls: 'annot' });
      }
      // --- GPU contents
      const gx0 = L.gx + 14, gy0 = L.gy + 40;
      txt(g, gx0, gy0 + 10, 'hot cache: B raw entries (LRU)', { anchor: 'start' });
      for (let c = 0; c < 6; c++) rect(g, gx0 + c * 36, gy0 + 20, 30, 22, { fill: tint(T('hot-cache'), 30), stroke: T('hot-cache'), rx: 3 });
      if (bd) {
        txt(g, gx0, gy0 + 70, 'dictionary cache: n_D dictionaries', { anchor: 'start' });
        for (let c = 0; c < 2; c++) {
          rect(g, gx0 + c * 76, gy0 + 80, 66, 30, { fill: tint(T('dictionary-cache'), 30), stroke: T('dictionary-cache'), rx: 4 });
          txt(g, gx0 + 33 + c * 76, gy0 + 100, c ? 'D₁' : 'D₀', { cls: 'lbl ink' });
        }
        txt(g, gx0, gy0 + 132, 'decode: E = decode(δ, D)', { anchor: 'start', cls: 'val' });
      }
      txt(g, gx0, L.gy + L.gh - 40, 'attention reads the k entries', { anchor: 'start', cls: 'annot' });
      txt(g, gx0, L.gy + L.gh - 22, 'the indexer selects, as raw entries', { anchor: 'start', cls: 'annot' });
      // --- the link
      const lines = bd
        ? [{ c: T('delta-miss'), t: 'δ-miss: a delta, ρ·e', dash: null, w: 2.2 },
          { c: T('raw-miss'), t: 'raw miss (cold block): e', dash: null, w: 3.4 },
          { c: T('dictionary-cache'), t: 'dictionary load: w·e, rare', dash: '6 5', w: 2 }]
        : [{ c: T('raw-miss'), t: 'every miss: one raw entry, e', dash: null, w: 3.4 }];
      if (!narrow) {
        txt(g, 340, 22, 'the link (PCIe)', { cls: 'lbl' });
        lines.forEach((ln, i) => {
          const y = 90 + i * 66 + (bd ? 0 : 40);
          arrowPath(g, `M ${L.hx + L.hw + 6} ${y} C ${330} ${y - 14}, ${350} ${y - 14}, ${L.gx - 8} ${y}`, ln.c, { w: ln.w, dash: ln.dash });
          txt(g, 340, y - 18, ln.t, { cls: 'lbl ink' });
        });
      } else {
        lines.forEach((ln, i) => {
          const x = 30 + i * 26;
          arrowPath(g, `M ${x} ${L.hy + L.hh + 6} L ${x} ${L.gy - 8}`, ln.c, { w: ln.w, dash: ln.dash });
          txt(g, 120, L.hy + L.hh + 26 + i * 25, ln.t, { cls: 'lbl ink', anchor: 'start' });
        });
        if (lines.length === 1) txt(g, 120, L.hy + L.hh + 51, 'over the link (PCIe)', { cls: 'lbl', anchor: 'start' });
      }
      ro.set(bd
        ? [['a δ-miss moves', `ρ·e = ${f0(RHO * E_BYTES)} B`], ['a raw miss moves', `e = ${E_BYTES} B`], ['a dictionary load moves', `w·e = ${fmtBytes(W_LOAD * E_BYTES, 0)}, now and then`]]
        : [['every miss moves', `e = ${E_BYTES} B`], ['every hot-cache slot holds', `e = ${E_BYTES} B`]]);
    }
    draw();
  };

  // =================================================================== IV.2
  // FIG.blockKnob — one toy history of 32 tokens, cut into blocks of b; pick a token, read off its block j.
  FIG.blockKnob = function (host) {
    const L = 32;
    let b = 4, t = 13;
    const BS = [1, 2, 4, 8, 16, 32];
    const box = h('div'), ro = readout();
    const bSeg = seg(BS.map(v => [v, String(v)]), b, v => { b = v; draw(); }, 'block size b');
    const tSl = slider(texify('token $\\vt$'), 0, L - 1, 1, t, v => { t = v; draw(); });
    host.append(controls(h('span', { class: 'iv-ctl-lab', html: texify('block size $\\vb$') }), bSeg, tSl), box, ro);
    const narrow = isNarrow(host);
    const per = narrow ? 16 : 32, rows = L / per;
    const W = narrow ? 380 : 680, tw = narrow ? 20 : 19, gap = 2.2, x0 = narrow ? 12 : 12;
    const rowH = 92;
    const D = Diagram(box, { w: W, h: rows * rowH + 10, label: 'A history of 32 tokens cut into blocks' });
    const g = el('g', {}, D.svg);
    function draw() {
      g.replaceChildren();
      const j = Math.floor(t / b);
      for (let r = 0; r < rows; r++) {
        const y = 30 + r * rowH;
        // block brackets on this row
        for (let s = r * per; s < (r + 1) * per; s += 1) {
          if (s % b === 0 || s === r * per) {
            const jj = Math.floor(s / b), end = Math.min((jj + 1) * b, (r + 1) * per);
            const xa = x0 + (s - r * per) * (tw + gap), xb = x0 + (end - r * per) * (tw + gap) - gap;
            const on = jj === j;
            rect(g, xa - 1.5, y - 4, xb - xa + 3, 34, { fill: on ? tint(T('block'), 26) : 'none', stroke: on ? T('block') : tint('var(--ink-3)', 55), dash: on ? null : '3 3', rx: 4, sw: on ? 1.8 : 1 });
            if (s % b === 0 && (b >= 2 || jj % 4 === 0 || on)) txt(g, xa + 1, y + 46, `j=${jj}`, { anchor: 'start', cls: 'val', style: on ? 'fill:var(--ink)' : 'fill:var(--ink-3)' });
            s = end - 1;
          }
        }
        for (let c = 0; c < per; c++) {
          const s = r * per + c, x = x0 + c * (tw + gap), on = s === t;
          rect(g, x, y, tw, 26, { fill: on ? 'var(--c)' : tint(T('entry'), 22), stroke: on ? 'var(--c)' : tint(T('entry'), 70), rx: 3 });
          el('text', { x: x + tw / 2, y: y + 17, 'text-anchor': 'middle', class: 'val', style: on ? 'fill:var(--paper-3);stroke:none' : null, text: String(s) }, g);
          const hit = rect(g, x, y, tw, 26, { fill: 'transparent', stroke: 'none', cls: 'hit' });
          hit.style.cursor = 'pointer';
          hit.addEventListener('click', () => { t = s; tSl.set(t); draw(); });
        }
        txt(g, x0, y - 12, r === 0 ? `tokens ${r * per}–${(r + 1) * per - 1}` : `tokens ${r * per}–${(r + 1) * per - 1} (continued)`, { anchor: 'start', cls: 'lbl' });
      }
      ro.set([[tex('\\vt'), String(t)], [tex('\\vb'), String(b)], [tex('\\vj = \\lfloor \\vt / \\vb \\rfloor'), String(j)],
        ['place in its block', `${t - j * b} of ${b}`], ['blocks in the history', String(Math.ceil(L / b))]]);
    }
    draw();
  };

  // =================================================================== IV.3
  // FIG.blockBytes — the bytes of one block: a dictionary of w entries' worth plus b deltas of ρ·e.
  FIG.blockBytes = function (host) {
    let lb = 12, lw = 5, rho = 0.75;                     // b = 2^lb = 4096, w = 2^lw = 32
    const e = E_BYTES;
    const bars = h('div', { class: 'ivb-bars' });
    const plotBox = h('div');
    const tiles = {
      raw: kpi('raw block', '', '$b·e$', 'var(--ink-3)'),
      kv: kpi('kv-blockdiff block', '', '', T('kv-blockdiff')),
      share: kpi('dictionary share', '', 'of the stored block', T('dictionary')),
      eff: kpi('bytes per entry, all in', '', '', T('delta')),
    };
    tiles.raw.querySelector('.s').innerHTML = texify('$\\vb\\,\\ve$');
    const presets = controls(
      h('span', { class: 'iv-ctl-lab', text: 'dictionary types (Part VI):' }),
      btn(texify('channel means &amp; scales, $\\vw = 2$'), () => setW(1), { cls: 'sm' }),
      btn(texify('a 16-direction basis, $\\vw = 32$'), () => setW(5), { cls: 'sm' }),
      btn(texify('256 centroids, $\\vw = 256$'), () => setW(8), { cls: 'sm' }));
    const sb = slider(texify('block size $\\vb$'), 4, 14, 1, lb, v => { lb = v; draw(); }, v => `${fmtSI(2 ** v, 0)} tokens`);
    const sw = slider(texify('dictionary weight $\\vw$'), 0, 10, 1, lw, v => { lw = v; draw(); }, v => `${2 ** v} entries`);
    const sr = slider(texify('delta ratio $\\vrho$'), 0.3, 1, 0.01, rho, v => { rho = v; draw(); });
    function setW(v) { lw = v; sw.set(v); draw(); }
    host.append(controls(sb, sw, sr), presets, bars, h('div', { class: 'kpis' }, tiles.raw, tiles.kv, tiles.share, tiles.eff), plotBox);
    const P = Plot(plotBox, { x: [16, 16384], xlog: 2, y: [0, 1], h: 250, xlabel: 'block size b (tokens, log scale)', ylabel: 'dictionary share', yfmt: v => fmtPct(v, 0), label: 'Share of a block’s bytes taken by its dictionary, against block size' });
    function draw() {
      const b = 2 ** lb, w = 2 ** lw;
      const raw = b * e, dict = w * e, del = b * rho * e, kv = dict + del;
      const mx = Math.max(raw, kv);
      const row = (name, parts) => h('div', { class: 'ivb-row' }, h('span', { class: 'ivb-name', html: name }),
        h('span', { class: 'ivb-track' }, parts.map(p => h('span', { class: 'ivb-seg', style: `width:${(100 * p.v / mx).toFixed(2)}%;background:${p.c}`, title: p.t }))),
        h('span', { class: 'ivb-n', text: fmtBytes(parts.reduce((s, p) => s + p.v, 0), 1) }));
      bars.replaceChildren(
        row('raw', [{ v: raw, c: tint(T('entry'), 70), t: `${b} raw entries` }]),
        row('kv-blockdiff', [{ v: dict, c: T('dictionary'), t: `dictionary: ${w} entries’ worth` }, { v: del, c: tint(T('delta'), 75), t: `${b} deltas` }]),
        legend([key(T('dictionary'), `dictionary ${tex('\\vD_{\\vj}')}`), key(tint(T('delta'), 75), `${tex('\\vb')} deltas of ${tex('\\vrho\\,\\ve')}`), key(tint(T('entry'), 70), 'raw entries')], { shape: 'box' }));
      tiles.raw.set(fmtBytes(raw, 1));
      tiles.kv.set(fmtBytes(kv, 1), `${fmt(kv / raw, 3)} of raw`);
      tiles.share.set(fmtPct(dict / kv, 1));
      tiles.eff.set(`${fmt(e * (rho + w / b), 0)} B`, `${tex('\\ve(\\vrho + \\vw/\\vb)')} = ${fmt(rho + w / b, 3)}·e`);
      P.clear();
      const pts = linspace(4, 14, 81).map(l => { const bb = 2 ** l; return [bb, w / (w + bb * rho)]; });
      area(P, pts, { color: T('dictionary'), opacity: 0.12 });
      line(P, pts, { color: T('dictionary'), name: 'share' });
      rule(P, { y: 0.1, label: '10 %' });
      const cur = w / (w + b * rho);
      dot(P.g.top, P.x(b), P.y(cur), 6 * P.fs, 'var(--c)');
      annotate(P, b, cur, `b = ${fmtSI(b, 0)}: ${fmtPct(cur, 1)}`, { dx: b > 2048 ? -30 : 30, dy: -26 });
    }
    draw();
  };

  // =================================================================== IV.4
  // FIG.missCost — the average bytes a miss moves, e·[f_D·ρ + (1 − f_D)], as the δ-miss fraction grows.
  FIG.missCost = function (host) {
    let fD = 0.85, rho = 0.75;
    const e = E_BYTES, MISSES = 274;                     // misses per layer per step at B = 4096 (III.11)
    const box = h('div');
    const tiles = {
      avg: kpi('bytes per miss', '', '', T('delta-miss')),
      layer: kpi('per layer per step', '', '274 misses (III.11)', T('kv-blockdiff')),
      shrink: kpi('miss traffic', '', 'relative to HiSparse', 'var(--ink-3)'),
    };
    const sf = slider(texify('δ-miss fraction $\\vfD$'), 0, 1, 0.01, fD, v => { fD = v; draw(); });
    const sr = slider(texify('delta ratio $\\vrho$'), 0.3, 1, 0.01, rho, v => { rho = v; draw(); });
    host.append(controls(sf, sr), legend([['kv-blockdiff at the chosen ρ', T('delta-miss')], ['HiSparse (every miss raw)', T('raw-miss'), 'dash']]), box, h('div', { class: 'kpis' }, tiles.avg, tiles.layer, tiles.shrink));
    const P = Plot(box, { x: [0, 1], y: [0, 700], h: 300, xlabel: 'δ-miss fraction f_D', ylabel: 'bytes per miss', xfmt: v => fmtPct(v, 0), label: 'Average bytes per miss against the δ-miss fraction' });
    const cost = f => e * (f * rho + (1 - f));
    const knob = el('circle', { class: 'handle', r: 7 * P.fs }, P.g.top);
    draggable(knob, P, ([x]) => { fD = clamp(+x.toFixed(2), 0, 1); sf.set(fD); draw(); }, null, { get: () => [fD, cost(fD)], step: [0.01, 0], label: 'δ-miss fraction' });
    hover(knob, () => `<b>f_D = ${fmtPct(fD, 0)}</b><br>${f0(cost(fD))} bytes per miss`);
    function draw() {
      P.clear();
      line(P, [[0, e], [1, e]], { color: T('raw-miss'), dash: '7 5', width: 2 });
      txt(P.g.data, P.x(0.02), P.y(e) - 8 * P.fs, 'HiSparse: e = 640 B', { anchor: 'start' });
      area(P, [[0, cost(0)], [1, cost(1)]], { color: T('delta-miss'), opacity: 0.1 });
      line(P, [[0, cost(0)], [1, cost(1)]], { color: T('delta-miss'), width: 2.6 });
      line(P, [[1, 0], [1, rho * e]], { color: 'var(--ink-3)', dash: '2 4', width: 1 });
      txt(P.g.data, P.x(0.98), P.y(rho * e) + 18 * P.fs, `all δ-misses: ρ·e = ${f0(rho * e)} B`, { anchor: 'end' });
      knob.setAttribute('cx', P.x(fD)); knob.setAttribute('cy', P.y(cost(fD)));
      const c = cost(fD);
      tiles.avg.set(`${f0(c)} B`, `${tex('\\ve\\,[\\vfD\\vrho + (1-\\vfD)]')}`);
      tiles.layer.set(fmtBytes(MISSES * c, 0), `vs ${fmtBytes(MISSES * e, 0)} raw`);
      tiles.shrink.set(fmtPct(c / e, 0), `saves ${fmtPct(1 - c / e, 0)}`);
    }
    draw();
  };

  // =================================================================== IV.5
  // The resolve step of HiSparse (III.6) and the toy residency rule of kv-blockdiff (IV.4), in JS.
  function hisparseResolve(S, cache, B) {                // cache: array, oldest first; returns a new state
    const c = cache.slice();
    const hits = S.filter(p => c.includes(p)), misses = S.filter(p => !c.includes(p)), evicted = [];
    for (const p of misses) {
      if (c.length >= B) { const v = c.find(x => !S.includes(x)); c.splice(c.indexOf(v), 1); evicted.push(v); }
      c.push(p);
    }
    for (const p of hits) { c.splice(c.indexOf(p), 1); c.push(p); }
    return { hits, misses, evicted, cacheAfter: c };
  }
  function residency(cache, b, nD, before) {             // keep the nD blocks with most entries in the hot cache
    const cnt = new Map();
    cache.forEach(p => cnt.set(Math.floor(p / b), (cnt.get(Math.floor(p / b)) || 0) + 1));
    const order = [...cnt.keys()].sort((x, y) => (cnt.get(y) - cnt.get(x)) || ((before.includes(y) ? 1 : 0) - (before.includes(x) ? 1 : 0)) || (x - y));
    return order.slice(0, nD).sort((x, y) => x - y);
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  FIG.toyTraceBlockdiff = async function (host) {
    const res = await fetch(KV.prefix + 'assets/figs/data/toy-trace.json');
    if (!res.ok) throw new Error('toy-trace.json: HTTP ' + res.status);
    const tr = await res.json();
    const { n, B, b, nD } = tr;
    // ---- replay both systems and check them against the expected results stored with the trace
    let cache = tr.initialCache.slice(), dicts = tr.initialDictionaries.slice();
    const states = [{ i: -1, cacheAfter: cache, dictsAfter: dicts, S: [] }];
    tr.steps.forEach((S, i) => {
      const r = hisparseResolve(S, cache, B);
      const exp = tr.expected.hisparse[i];
      for (const k of ['hits', 'misses', 'evicted', 'cacheAfter']) if (!same(r[k], exp[k])) throw new Error(`toy trace, step ${i + 1}: HiSparse ${k} ${JSON.stringify(r[k])} ≠ expected ${JSON.stringify(exp[k])}`);
      const before = dicts;
      const deltaMisses = r.misses.filter(p => before.includes(Math.floor(p / b)));
      const rawMisses = r.misses.filter(p => !before.includes(Math.floor(p / b)));
      const after = residency(r.cacheAfter, b, nD, before);
      const loads = after.filter(j => !before.includes(j));
      const xb = tr.expected.blockdiff[i];
      const got = { rawMisses, deltaMisses, dictionariesAfter: after, dictionaryLoads: loads };
      for (const k of Object.keys(got)) if (!same(got[k], xb[k])) throw new Error(`toy trace, step ${i + 1}: kv-blockdiff ${k} ${JSON.stringify(got[k])} ≠ expected ${JSON.stringify(xb[k])}`);
      states.push({ i, S, ...r, dictsBefore: before, dictsAfter: after, deltaMisses, rawMisses, loads, cacheBefore: cache });
      cache = r.cacheAfter; dicts = after;
    });

    let rho = 0.75, w = 2;
    const box = h('div'), ro = readout(), tally = h('div');
    const sr = slider(texify('delta ratio $\\vrho$'), 0.3, 1, 0.05, rho, v => { rho = v; render(); });
    const sw = slider(texify('dictionary weight $\\vw$'), 1, 16, 1, w, v => { w = v; render(); });
    host.append(legend([key(tint('var(--ink-3)', 45), 'hit: nothing moves'), key(T('delta-miss'), 'δ-miss: fetch ρ·e'), key(T('raw-miss'), 'raw miss: fetch e'), key(tint(T('dictionary-cache'), 35), 'block whose dictionary is resident')], { shape: 'box' }), box);
    const narrow = isNarrow(host);
    const tw = narrow ? 19 : 28, gap = narrow ? 2 : 3, bgap = narrow ? 6 : 12, x0 = narrow ? 10 : 100;
    const W = narrow ? 380 : 680;
    const D = Diagram(box, { w: W, h: narrow ? 236 : 200, label: 'The toy trace: history, selections, hot cache and resident dictionaries' });
    const g = el('g', {}, D.svg);
    const px = p => x0 + p * (tw + gap) + Math.floor(p / b) * bgap;
    let cur = 0;
    function render(i = cur) {
      cur = i;
      const s = states[i];
      g.replaceChildren();
      const yH = narrow ? 40 : 34, yC = narrow ? 150 : 128;
      // ---- history row
      txt(g, narrow ? 10 : 10, narrow ? 18 : yH + 20, narrow ? 'history of one layer (16 entries, 4 blocks of b = 4)' : 'history', { anchor: 'start' });
      const dictsShown = i === 0 ? s.dictsAfter : s.dictsBefore;
      for (let j = 0; j < n / b; j++) {
        const xa = px(j * b) - 3, xb = px(j * b + b - 1) + tw + 3, res = dictsShown.includes(j);
        rect(g, xa, yH - 6, xb - xa, tw + 30, { fill: res ? tint(T('dictionary-cache'), 22) : 'none', stroke: res ? T('dictionary-cache') : 'var(--ink-3)', dash: '4 3', rx: 6 });
        txt(g, xa + 4, yH + tw + 19, res ? `block ${j} · D resident` : `block ${j}`, { anchor: 'start', cls: 'val', style: res ? 'fill:var(--ink)' : 'fill:var(--ink-3)' });
      }
      for (let p = 0; p < n; p++) {
        const sel = s.S.includes(p);
        let fill = 'var(--paper-3)';
        if (sel && s.hits && s.hits.includes(p)) fill = tint('var(--ink-3)', 30);
        if (sel && s.deltaMisses && s.deltaMisses.includes(p)) fill = tint(T('delta-miss'), 45);
        if (sel && s.rawMisses && s.rawMisses.includes(p)) fill = tint(T('raw-miss'), 45);
        rect(g, px(p), yH, tw, tw, { fill, stroke: sel ? 'var(--ink)' : 'var(--rule)', sw: sel ? 2.2 : 1, rx: 4 });
        txt(g, px(p) + tw / 2, yH + tw / 2 + 4, String(p), { cls: 'val' });
      }
      // ---- hot cache row (after the step), oldest → newest, plus the evicted entry
      txt(g, 10, narrow ? yC - 18 : yC + 20, narrow ? 'hot cache after this step, oldest → newest' : 'hot cache', { anchor: 'start' });
      const cx0 = narrow ? 10 : 100, cw = narrow ? 34 : 40, cg = narrow ? 6 : 10;
      s.cacheAfter.forEach((p, k) => {
        let fill = 'var(--paper-3)';
        if (s.hits && s.hits.includes(p)) fill = tint('var(--ink-3)', 30);
        if (s.deltaMisses && s.deltaMisses.includes(p)) fill = tint(T('delta-miss'), 45);
        if (s.rawMisses && s.rawMisses.includes(p)) fill = tint(T('raw-miss'), 45);
        rect(g, cx0 + k * (cw + cg), yC, cw, 30, { fill, stroke: 'var(--ink-2)', rx: 5 });
        txt(g, cx0 + k * (cw + cg) + cw / 2, yC + 20, String(p), { cls: 'val' });
      });
      if (s.evicted && s.evicted.length) {
        const ex = cx0 + 6 * (cw + cg) + (narrow ? 4 : 18);
        rect(g, ex, yC, cw, 30, { fill: 'none', stroke: 'var(--ink-3)', dash: '3 3', rx: 5 });
        txt(g, ex + cw / 2, yC + 20, String(s.evicted[0]), { cls: 'val', style: 'fill:var(--ink-3)' });
        txt(g, ex + cw / 2, yC + 46, 'evicted', { cls: 'val', style: 'fill:var(--ink-3)' });
      }
      if (i > 0) {   // arrow from the missed entry in the history to its new slot
        const p = s.misses[0], k = s.cacheAfter.indexOf(p);
        const col = s.rawMisses.includes(p) ? T('raw-miss') : T('delta-miss');
        const xa = px(p) + tw / 2, xb = cx0 + k * (cw + cg) + cw / 2;
        arrowPath(g, `M ${xa} ${yH + tw + 2} C ${xa} ${yH + tw + 40}, ${xb} ${yC - 40}, ${xb} ${yC - 3}`, col, { w: 2.2 });
      }
      txt(g, narrow ? 10 : 100, narrow ? yC + 64 : yC + 62, 'selected entries have a dark outline; colours show what each selection cost', { anchor: 'start', cls: 'annot' });
      // ---- readout for this state
      if (i === 0) {
        ro.set([['before step 1', 'hot cache of B = 6 raw entries'], ['dictionary cache', `n_D = 2: blocks ${s.dictsAfter.join(', ')}`]]);
      } else {
        const link = s.rawMisses.length * E_BYTES + s.deltaMisses.length * rho * E_BYTES + s.loads.length * w * E_BYTES;
        ro.set([
          ['indexer picks', `[${s.S.join(', ')}]`],
          ['hits / δ-misses / raw misses', `${s.hits.length} / ${s.deltaMisses.length} / ${s.rawMisses.length}`],
          ['dictionaries before → after', `${s.dictsBefore.join(', ')} → ${s.dictsAfter.join(', ')}${s.loads.length ? ` (load D${s.loads.join(', D')})` : ''}`],
          ['link bytes this step', `${f0(link)} B (HiSparse: ${s.misses.length * E_BYTES} B)`],
        ]);
      }
      // ---- running tally over all three steps
      const all = states.slice(1);
      const nRaw = all.reduce((a, s2) => a + s2.rawMisses.length, 0), nDel = all.reduce((a, s2) => a + s2.deltaMisses.length, 0), nLoad = all.reduce((a, s2) => a + s2.loads.length, 0);
      const hs = all.reduce((a, s2) => a + s2.misses.length, 0) * E_BYTES;
      const kvMiss = nRaw * E_BYTES + nDel * rho * E_BYTES, kvAll = kvMiss + nLoad * w * E_BYTES;
      const breakEven = w / (1 - rho);
      tally.replaceChildren(table(['all three steps', 'HiSparse', 'kv-blockdiff'], [
        ['hits', '9', '9'],
        ['misses (raw / δ)', `${hs / E_BYTES} / 0`, `${nRaw} / ${nDel}`],
        ['miss bytes on the link', `${hs} B`, `${f0(kvMiss)} B`],
        ['dictionary loads', '—', `${nLoad} × ${w}·e = ${f0(nLoad * w * E_BYTES)} B`],
        { cells: ['total on the link', `${hs} B`, `${f0(kvAll)} B`], cls: 'sum' },
      ], { left: [0] }), h('p', { class: 'fig-note', html: texify(`One load of $\\vw = ${w}$ entries’ worth pays for itself after $\\vw/(1-\\vrho) = ${fmt(breakEven, 1)}$ δ-misses in that block. The toy has only ${nDel}.`) }));
    }
    const st = stepper(host, {
      steps: states, interval: 2400,
      label: (s, i) => i === 0 ? 'Before step 1: blocks 0 and 2 have their dictionaries on the GPU.'
        : i === 1 ? 'Step 1: entry 14 misses. Its block 3 has no dictionary on the GPU, so it is a raw miss. Afterwards blocks 2 and 3 hold the most hot entries: D3 is loaded, D0 dropped.'
          : i === 2 ? 'Step 2: entry 11 misses. Its block 2 has a resident dictionary: a δ-miss, only the delta crosses the link.'
            : 'Step 3: entry 15 misses in block 3, resident since step 1: another δ-miss. Hits and evictions are HiSparse’s, step for step.',
      render: i => render(i),
    });
    host.append(ro, controls(sr, sw), tally);
    void st;
  };

  // =================================================================== IV.6
  // FIG.layoutCompare — reading ONE entry from a bulk stream versus from a random-access delta store.
  FIG.layoutCompare = function (host) {
    const N = 10, RHO = 0.75, W_D = 2;                   // illustrative: deltas of ρ·e = 480 B, a light dictionary
    const r = rng('iv6-layout');
    const varSizes = range(N).map(() => Math.round(RHO * E_BYTES * (0.7 + 0.6 * r())));   // variable-length deltas
    const fixed = RHO * E_BYTES;
    let t = 6, mode = 'fixed', resident = true;
    const boxA = h('div'), boxB = h('div'), ro = readout();
    const st = slider(texify('wanted entry $\\vt$'), 0, N - 1, 1, t, v => { t = v; draw(); });
    const md = seg([['fixed', 'fixed-length deltas'], ['var', 'variable-length deltas']], mode, v => { mode = v; draw(); }, 'delta layout');
    const rs = btn('dictionary resident', (e, b) => { resident = !resident; b.setAttribute('aria-pressed', String(resident)); draw(); }, { cls: 'sm', pressed: true });
    host.append(controls(st, md, rs),
      h('div', { class: 'iv-sub', text: 'A · bulk stream (zstd and friends): one chunk, decoded front to back' }), boxA,
      h('div', { class: 'iv-sub', text: 'B · random-access delta store (kv-blockdiff): any entry decodes alone' }), boxB, ro);
    const narrow = isNarrow(host), nl = narrow ? '\n' : ' ';
    const W = narrow ? 380 : 680;
    const DA = Diagram(boxA, { w: W, h: narrow ? 120 : 100, label: 'A bulk stream: to read one entry, decode everything before it' });
    const DB = Diagram(boxB, { w: W, h: narrow ? 160 : 150, label: 'A random-access delta store: one dictionary and one slot per entry' });
    const gA = el('g', {}, DA.svg), gB = el('g', {}, DB.svg);
    function draw() {
      gA.replaceChildren(); gB.replaceChildren();
      const x0 = 10, x1 = W - 10, span = x1 - x0;
      // ---------- A: bulk stream (one coder state runs through the whole chunk)
      const yA = 8;
      const tot = sum(varSizes);
      let x = x0, decoded = 0;
      varSizes.forEach((s, i) => {
        const w = span * s / tot, need = i <= t;
        if (need) decoded += s;
        rect(gA, x + 1, yA, w - 2, 30, { fill: i === t ? 'var(--c)' : need ? tint(T('raw-miss'), 40) : 'var(--paper-3)', stroke: need ? T('raw-miss') : 'var(--rule)', rx: 3 });
        if (w > 26) txt(gA, x + w / 2, yA + 20, String(i), { cls: 'val', style: i === t ? 'fill:var(--paper-3);stroke:none' : null });
        x += w;
      });
      const xe = x0 + span * varSizes.slice(0, t + 1).reduce((a, b) => a + b, 0) / tot;
      arrowPath(gA, `M ${x0 + 4} ${yA + 44} L ${Math.max(x0 + 20, xe - 4)} ${yA + 44}`, T('raw-miss'), { w: 2 });
      txt(gA, x0, yA + 68, `to get entry ${t}: decode entries 0…${t},${nl}${f0(decoded)} B of work for one ${f0(varSizes[t])} B delta`, { anchor: 'start', cls: 'annot' });
      // ---------- B: random-access store
      const yB = 8;
      const dw = narrow ? 64 : 84;
      rect(gB, x0, yB, dw, 62, { fill: resident ? tint(T('dictionary-cache'), 35) : tint(T('dictionary'), 25), stroke: resident ? T('dictionary-cache') : T('dictionary'), rx: 5 });
      txt(gB, x0 + dw / 2, yB + 26, 'D_j', { cls: 'lbl ink' });
      txt(gB, x0 + dw / 2, yB + 44, resident ? 'on the GPU' : 'in host', { cls: 'val' });
      const sx0 = x0 + dw + 12, sspan = x1 - sx0;
      const sizes = mode === 'fixed' ? range(N).map(() => fixed) : varSizes;
      const stot = mode === 'fixed' ? N * fixed : tot;
      const ySlots = mode === 'fixed' ? yB + 16 : yB + 30;
      let sx = sx0;
      if (mode === 'var') {          // the per-entry offset table
        range(N).forEach(i => rect(gB, sx0 + i * (sspan / N) + 1, yB + 2, sspan / N - 2, 12, { fill: i === t ? 'var(--c)' : 'var(--paper-3)', stroke: 'var(--rule)', rx: 2 }));
      }
      const starts = [];
      sizes.forEach((s, i) => {
        const w = sspan * s / stot;
        starts.push(sx);
        rect(gB, sx + 1, ySlots, w - 2, 30, { fill: i === t ? 'var(--c)' : tint(T('delta'), 22), stroke: i === t ? 'var(--c)' : T('delta'), rx: 3 });
        if (w > 22) txt(gB, sx + w / 2, ySlots + 20, `δ${i}`, { cls: 'val', style: i === t ? 'fill:var(--paper-3);stroke:none' : null });
        sx += w;
      });
      const xm = starts[t] + sspan * sizes[t] / stot / 2;
      arrowPath(gB, `M ${xm} ${ySlots + 70} L ${xm} ${ySlots + 36}`, T('delta-miss'), { w: 2.2 });
      const addr = mode === 'fixed' ? `fixed slots: address = base + ${t}·|δ|,${nl}one read` : `variable slots: read the 2-byte offset,${nl}then the delta — two reads`;
      txt(gB, clamp(xm, x0 + (narrow ? 110 : 150), x1 - (narrow ? 110 : 150)), ySlots + 88, addr, { cls: 'annot' });
      // ---------- readout
      const reads = (mode === 'fixed' ? 1 : 2) + (resident ? 0 : 1);
      const bytesB = sizes[t] + (mode === 'var' ? 2 : 0) + (resident ? 0 : W_D * E_BYTES);
      ro.set([
        ['A: bytes decoded', `${f0(decoded)} B`],
        ['B: bytes read', `${f0(bytesB)} B${resident ? '' : ' (incl. the dictionary)'}`],
        ['B: separate reads', String(reads)],
      ]);
    }
    draw();
  };

  // =================================================================== IV.7
  // FIG.threeProperties — one established property about WHICH entries, two hypotheses about WHAT is inside.
  FIG.threeProperties = function (host) {
    const row = h('div', { class: 'iv-three' });
    host.append(row);
    const panel = (title, badge, kind, term) => {
      const cell = h('div', { class: 'iv-three-cell', style: `--tc:${T(term)}` },
        h('div', { class: 'iv-three-head' }, h('b', { text: title }), h('span', { class: 'iv-badge ' + kind, text: badge })));
      const b = h('div');
      cell.append(b);
      row.append(cell);
      return b;
    };
    // ① Lucky Louis — positions selected at three consecutive steps
    const b1 = panel('① Lucky Louis property', 'which · established', 'is-which', 'lucky-louis');
    const D1 = Diagram(b1, { w: 320, h: 200, label: 'Selected positions at three consecutive steps: mostly the same' });
    const base = [12, 30, 34, 60, 95, 98, 140, 175, 210, 214, 250, 282, 296];
    const steps = [base, base.filter(p => p !== 95).concat([118]), base.filter(p => p !== 95 && p !== 250).concat([118, 160])];
    steps.forEach((S, i) => {
      const y = 40 + i * 44;
      txt(D1.svg, 8, y + 5, i === 0 ? 'step t' : `t+${i}`, { anchor: 'start', cls: 'val' });
      el('line', { x1: 60, x2: 312, y1: y, y2: y, style: 'stroke:var(--rule);stroke-width:1' }, D1.svg);
      S.forEach(p => {
        const fresh = i > 0 && !steps[i - 1].includes(p);
        const m = rect(D1.svg, 60 + p * 0.82, y - 9, 5, 18, { fill: fresh ? 'var(--vermilion)' : T('lucky-louis'), stroke: 'none', rx: 1.5 });
        hover(m, () => `position ${p}<br>${fresh ? 'newly selected (a miss)' : i ? 're-selected (a hit)' : 'selected'}`);
      });
    });
    txt(D1.svg, 60, 182, 'token position →', { anchor: 'start', cls: 'val' });
    // ② fallen-apple — bits to store an entry given a neighbour Δ tokens away
    const b2 = panel('② Fallen-apple similarity', 'what · hypothesis', 'is-what', 'fallen-apple');
    const D2 = Diagram(b2, { w: 320, h: 200, label: 'Bits to store an entry given a neighbour, against token distance' });
    const xs = linspace(0, 14, 60), X = l => 54 + l * 18, Y = v => 30 + (6.6 - v) * 32;
    el('line', { x1: 54, x2: 310, y1: Y(6.5), y2: Y(6.5), style: 'stroke:var(--ink-3);stroke-dasharray:5 4' }, D2.svg);
    txt(D2.svg, 306, Y(6.5) - 6, 'no help from the neighbour', { anchor: 'end', cls: 'val' });
    el('path', { d: 'M' + xs.map(l => `${X(l)},${Y(6.5 - 0.15 - 1.4 / (1 + 2 ** l / 32))}`).join(' L'), style: `fill:none;stroke:${T('fallen-apple')};stroke-width:2.6` }, D2.svg);
    el('line', { x1: 54, x2: 54, y1: 24, y2: 176, style: 'stroke:var(--ink-3)' }, D2.svg);
    el('line', { x1: 54, x2: 310, y1: 176, y2: 176, style: 'stroke:var(--ink-3)' }, D2.svg);
    txt(D2.svg, 182, 194, 'token distance (1 … 16K, log)', { cls: 'val' });
    txt(D2.svg, 10, 100, 'bits', { anchor: 'start', cls: 'val' });
    txt(D2.svg, 70, 160, 'close neighbours help most?', { anchor: 'start', cls: 'annot' });
    // ③ upstairs — the same token one layer down
    const b3 = panel('③ Upstairs similarity', 'what · hypothesis, later', 'is-what', 'upstairs');
    const D3 = Diagram(b3, { w: 320, h: 200, label: 'Floors of layers: the same token one floor down' });
    for (let l = 0; l < 4; l++) for (let c = 0; c < 5; c++) {
      const on = c === 2 && (l === 1 || l === 2);
      rect(D3.svg, 70 + c * 48, 150 - l * 38, 40, 26, { fill: on ? tint(T('upstairs'), l === 2 ? 55 : 25) : 'var(--paper-3)', stroke: on ? T('upstairs') : 'var(--rule)', rx: 3 });
      if (c === 0) txt(D3.svg, 10, 168 - l * 38, `layer ${l}`, { anchor: 'start', cls: 'val' });
    }
    arrowPath(D3.svg, `M ${70 + 2 * 48 + 20} ${150 - 38 - 2} L ${70 + 2 * 48 + 20} ${150 - 2 * 38 + 30}`, T('upstairs'), { w: 2.4 });
    txt(D3.svg, 190, 20, 'same token, one floor up', { cls: 'annot' });
  };

  // FIG.kvAxes — the KV tensor's axes; pick an entry and an axis to see which entries count as its neighbours.
  FIG.kvAxes = function (host) {
    const NLy = 5, NT = 14;
    let l = 2, t = 9, axis = 'token';
    const box = h('div'), ro = readout();
    host.append(controls(seg([['token', 'token axis'], ['layer', 'layer axis'], ['head', 'head axis']], axis, v => { axis = v; draw(); }, 'which axis'),
      h('span', { class: 'fig-note', text: 'Click any entry to pick it.' })), box, ro);
    const narrow = isNarrow(host);
    const W = narrow ? 380 : 680, cw = narrow ? 22 : 40, ch = 26, gx = narrow ? 3 : 5, gy = 10, x0 = narrow ? 64 : 92, y0 = 22;
    const D = Diagram(box, { w: W, h: y0 + NLy * (ch + gy) + 64, label: 'Entries of one request: layers up, tokens across' });
    const g = el('g', {}, D.svg);
    function draw() {
      g.replaceChildren();
      for (let ll = 0; ll < NLy; ll++) {
        const y = y0 + (NLy - 1 - ll) * (ch + gy);
        txt(g, 8, y + 18, `layer ${ll}`, { anchor: 'start', cls: 'val' });
        for (let tt = 0; tt < NT; tt++) {
          const x = x0 + tt * (cw + gx);
          let fill = 'var(--paper-3)', stroke = 'var(--rule)', sw = 1;
          const d = Math.abs(tt - t);
          if (ll === l && tt === t) { fill = 'var(--c)'; stroke = 'var(--c)'; }
          else if (axis === 'token' && ll === l && tt < t) { fill = tint(T('fallen-apple'), Math.max(8, 70 - 9 * d)); stroke = T('fallen-apple'); }
          else if (axis === 'layer' && tt === t && Math.abs(ll - l) === 1) { fill = tint(T('upstairs'), 55); stroke = T('upstairs'); sw = 2; }
          const r = rect(g, x, y, cw, ch, { fill, stroke, sw, rx: 3 });
          r.style.cursor = 'pointer';
          r.addEventListener('click', () => { l = ll; t = tt; draw(); });
          hover(r, () => `E[${ll}, ${tt}]` + (axis === 'token' && ll === l && tt < t ? `<br>${t - tt} tokens before` : ''));
          if (axis === 'token' && ll === l && tt < t && (!narrow || d <= 3)) txt(g, x + cw / 2, y + 17, narrow ? `${d}` : `Δ${d}`, { cls: 'val' });
        }
      }
      const yb = y0 + NLy * (ch + gy) + 14;
      txt(g, x0, yb, 'token position →', { anchor: 'start', cls: 'val' });
      if (axis === 'head') {
        const x = x0 + t * (cw + gx), y = y0 + (NLy - 1 - l) * (ch + gy);
        rect(g, x, y, cw / 2 - 1, ch, { fill: tint(T('neighbour'), 50), stroke: T('neighbour'), rx: 2 });
        rect(g, x + cw / 2 + 1, y, cw / 2 - 1, ch, { fill: tint(T('neighbour'), 25), stroke: T('neighbour'), rx: 2 });
        txt(g, clamp(x + cw / 2, x0 + 130, W - 140), yb + 26, 'inside one entry: its heads’ slices (not pursued)', { cls: 'annot' });
      } else {
        txt(g, clamp(x0 + t * (cw + gx), x0 + 150, W - 150), yb + 26, axis === 'token' ? 'same layer, earlier tokens: fallen-apple neighbours' : 'same token, one floor away: upstairs neighbours', { cls: 'annot' });
      }
      ro.set(axis === 'token' ? [['entry', `E[${l}, ${t}]`], ['neighbours', `E[${l}, ${t} − Δ], Δ = 1, 2, …`], ['hypothesis', 'fallen-apple (IV.8)']]
        : axis === 'layer' ? [['entry', `E[${l}, ${t}]`], ['neighbours', `${l > 0 ? `E[${l - 1}, ${t}] below` : '—'}${l < NLy - 1 ? `, E[${l + 1}, ${t}] above` : ''}`], ['hypothesis', 'upstairs (IV.9)']]
          : [['entry', `E[${l}, ${t}]`], ['neighbours', 'the other heads’ slices of the same entry'], ['hypothesis', 'not pursued here']]);
    }
    draw();
  };

  // =================================================================== IV.8
  // FIG.appleCurve — what fallen-apple similarity would look like: a curve over Δ (all shapes illustrative).
  FIG.appleCurve = function (host) {
    const H0 = 6.5;                                       // bits per element with no help (illustrative)
    let near = 1.4, lhalf = 5, far = 0.3, thresh = false, lb = 10;
    const box = h('div'), ro = readout();
    const s1 = slider('saving next door (Δ = 1)', 0, 3, 0.05, near, v => { near = v; draw(); }, v => `${fmt(v, 2)} bit`);
    const s2 = slider('half-distance', 1, 14, 0.5, lhalf, v => { lhalf = v; draw(); }, v => `${fmtSI(2 ** v, 0)} tokens`);
    const s3 = slider('saving that never fades', 0, 1, 0.05, far, v => { far = v; draw(); }, v => `${fmt(v, 2)} bit`);
    const tb = btn('overlay a threshold claim', (e, b) => { thresh = !thresh; b.setAttribute('aria-pressed', String(thresh)); draw(); }, { cls: 'sm', pressed: false });
    host.append(controls(s1, s2, s3), controls(tb), legend([['hypothetical curve (illustrative)', T('fallen-apple')], ['tokens shuffled across conversations', 'var(--ink-3)', 'dash'], ['a threshold claim: “alike within a block of b”', 'var(--vermilion)', 'dash']]), box, ro);
    const P = Plot(box, { x: [1, 65536], xlog: 2, y: [3.5, 7], h: 320, xlabel: 'token distance Δ to the known neighbour (log scale)', ylabel: 'bits per element', xfmt: v => fmtSI(v, 0), label: 'Bits to store an entry exactly given a neighbour Δ tokens away' });
    const curve = d => H0 - far - near / (1 + d / 2 ** lhalf);
    crosshair(P, { xname: 'Δ =', xfmt: v => `${fmtSI(v, 0)} tokens`, yfmt: v => `${fmt(v, 2)} bits` });
    function draw() {
      P.clear();
      const xs = linspace(0, 16, 120).map(l => 2 ** l);
      line(P, xs.map(d => [d, H0]), { color: 'var(--ink-3)', dash: '6 5', width: 1.6, name: 'shuffled' });
      txt(P.g.data, P.x(1.3), P.y(H0) - 8 * P.fs, 'no help: the solo rate', { anchor: 'start' });
      area(P, xs.map(d => [d, curve(d), H0]), { color: T('fallen-apple'), opacity: 0.12 });
      line(P, xs.map(d => [d, curve(d)]), { color: T('fallen-apple'), width: 2.8, name: 'hypothesis' });
      if (thresh) {
        const b = 2 ** lb;
        line(P, [[1, H0 - far - near], [b, H0 - far - near], [b, H0], [65536, H0]], { color: 'var(--vermilion)', dash: '4 4', width: 2 });
        annotate(P, b, H0 - 0.6, `b = ${fmtSI(b, 0)}: a cliff that\nthe data has no reason to have`, { dx: 26, dy: 40 });
      }
      annotate(P, 2 ** lhalf, curve(2 ** lhalf), 'half the local saving\nis gone here', { dx: -20, dy: 44, anchor: 'end' });
      ro.set([['next door, Δ = 1', `${fmt(curve(1), 2)} bits`], [`Δ = ${fmtSI(2 ** lhalf, 0)}`, `${fmt(curve(2 ** lhalf), 2)} bits`], ['far away', `${fmt(H0 - far, 2)} bits`]]);
    }
    draw();
  };

  // =================================================================== IV.9
  // FIG.floors — layers as the floors of a building; the upstairs neighbour, and dictionaries shared by g floors.
  FIG.floors = function (host) {
    const FL = 8, NT = 10, NL_REF = 78;
    let l = 4, t = 6, gsz = 1;
    const box = h('div'), ro = readout();
    host.append(controls(h('span', { class: 'iv-ctl-lab', text: 'floors sharing one dictionary:' }), seg([[1, '1'], [2, '2'], [4, '4']], gsz, v => { gsz = v; draw(); }, 'group size'),
      h('span', { class: 'fig-note', text: 'Click a window to move the entry.' })), box, ro);
    const narrow = isNarrow(host);
    const W = narrow ? 380 : 620, cw = narrow ? 22 : 34, ch = 18, gx = narrow ? 3 : 6, gy = 7, x0 = narrow ? 70 : 96, y0 = 30;
    const D = Diagram(box, { w: W, h: y0 + FL * (ch + gy) + 40, label: 'A building of layers; each floor holds one layer’s entries' });
    const g = el('g', {}, D.svg);
    function draw() {
      g.replaceChildren();
      const bw = NT * (cw + gx) + 12;
      // the building outline and roof
      rect(g, x0 - 8, y0 - 8, bw, FL * (ch + gy) + 8, { fill: 'var(--paper-2)', stroke: 'var(--ink-3)', rx: 4 });
      el('path', { d: `M ${x0 - 14} ${y0 - 8} L ${x0 - 8 + bw / 2} ${y0 - 26} L ${x0 + bw - 2} ${y0 - 8}`, style: 'fill:none;stroke:var(--ink-3);stroke-width:1.4' }, g);
      for (let f = 0; f < FL; f++) {
        const y = y0 + (FL - 1 - f) * (ch + gy);
        txt(g, x0 - 14, y + 14, `layer ${f}`, { anchor: 'end', cls: 'val' });
        if (f % gsz === 0 && gsz > 1) {     // a bracket for each group of floors sharing one dictionary
          const yTop = y0 + (FL - f - gsz) * (ch + gy);
          rect(g, x0 + bw - 4, yTop, 10, gsz * (ch + gy) - gy, { fill: tint(T('dictionary'), 40), stroke: T('dictionary'), rx: 3 });
        } else if (gsz === 1) {
          rect(g, x0 + bw - 4, y, 10, ch, { fill: tint(T('dictionary'), 40), stroke: T('dictionary'), rx: 3 });
        }
        for (let c = 0; c < NT; c++) {
          const x = x0 + c * (cw + gx);
          let fill = 'var(--paper-3)', stroke = 'var(--rule)';
          if (f === l && c === t) { fill = 'var(--c)'; stroke = 'var(--c)'; }
          else if (f === l - 1 && c === t) { fill = tint(T('upstairs'), 55); stroke = T('upstairs'); }
          const r = rect(g, x, y, cw, ch, { fill, stroke, rx: 2 });
          r.style.cursor = 'pointer';
          r.addEventListener('click', () => { l = f; t = c; draw(); });
        }
      }
      if (l > 0) {
        const x = x0 + t * (cw + gx) + cw / 2, yU = y0 + (FL - 1 - l) * (ch + gy), yD = y0 + (FL - l) * (ch + gy);
        arrowPath(g, `M ${x} ${yD + 1} L ${x} ${yU + ch + 2}`, T('upstairs'), { w: 2.2 });
      }
      txt(g, x0 + bw + 12, y0 - 14, 'D', { anchor: 'start', cls: 'val' });
      txt(g, x0, y0 + FL * (ch + gy) + 18, 'tokens run along each floor →', { anchor: 'start', cls: 'val' });
      ro.set([['entry', `E[${l}, ${t}]`], ['predicted from', l > 0 ? `E[${l - 1}, ${t}], one floor down` : 'nothing below (ground floor)'],
        ['dictionaries per block of tokens', `${Math.ceil(NL_REF / gsz)} for ${NL_REF} layers`]]);
    }
    draw();
  };

  // =================================================================== IV.10
  // A toy indexer: 85 % of last step's picks are kept (Lucky Louis); new picks come from a few "topic" blocks
  // with probability c (concentration), else from anywhere. Topic blocks are replaced now and then (lifetime).
  function heavySim(o) {
    const { L = 4096, b = 128, k = 64, B = 128, stay = 0.85, nhot = 3, steps = 320, warm = 50, conc, life, nD, seed = 'iv10' } = o;
    const r = rng(seed), nb = L / b;
    const hot = range(nhot).map(() => r.int(nb));
    const draw = () => (r() < conc ? hot[r.int(nhot)] * b + r.int(b) : r.int(L));
    let S = new Set();
    while (S.size < k) S.add(draw());
    const cache = [];                                   // oldest first
    let dc = [], raw = 0, del = 0, loads = 0, resSteps = 0;
    const perBlock = new Array(nb).fill(0), marks = [];
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < nhot; i++) if (r() < 1 / life) hot[i] = r.int(nb);
      const S2 = new Set([...S].filter(() => r() < stay));
      while (S2.size < k) S2.add(draw());
      S = S2;
      const Sl = [...S].sort((x, y) => x - y);
      const inCache = new Set(cache);
      const hits = Sl.filter(p => inCache.has(p)), misses = Sl.filter(p => !inCache.has(p));
      for (const p of misses) {
        if (cache.length >= B) { const v = cache.findIndex(x => !S.has(x)); cache.splice(v, 1); }
        cache.push(p);
        const j = Math.floor(p / b), isDelta = dc.includes(j);
        if (s >= warm) { perBlock[j]++; if (isDelta) del++; else raw++; }
        if (s >= warm && s < warm + 120) marks.push([s, p, isDelta ? 1 : 2]);
      }
      for (const p of hits) { cache.splice(cache.indexOf(p), 1); cache.push(p); if (s >= warm && s < warm + 120) marks.push([s, p, 0]); }
      const after = residency(cache, b, nD, dc);
      if (s >= warm) { loads += after.filter(j => !dc.includes(j)).length; resSteps++; }
      dc = after;
    }
    const n = steps - warm, missTot = raw + del;
    const sorted = perBlock.slice().sort((x, y) => y - x);
    return { fD: del / missTot, loads: loads / n, missPerStep: missTot / n, top4: sum(sorted.slice(0, 4)) / missTot, perBlock, marks, nb, b, L, warm, k };
  }

  FIG.heavyBlocks = function (host) {
    let conc = 0.8, llife = 2, nD = 4;                  // lifetime = 10^llife steps
    const box = h('div'), barBox = h('div');
    const tiles = {
      fD: kpi('δ-miss fraction f_D', '', 'misses whose dictionary was resident', T('delta-miss')),
      loads: kpi('dictionary loads', '', 'per step per layer', T('dictionary-cache')),
      top: kpi('misses in the 4 busiest blocks', '', 'of all misses', T('heavy-block')),
      miss: kpi('misses per step', '', 'of k = 64 selections', 'var(--ink-3)'),
    };
    tiles.fD.querySelector('.k').innerHTML = texify('δ-miss fraction $\\vfD$');
    const sc = slider('concentration', 0, 0.95, 0.05, conc, v => { conc = v; run(); }, v => fmtPct(v, 0));
    const sl = slider('topic lifetime', 0.5, 3, 0.25, llife, v => { llife = v; run(); }, v => `${fmt(10 ** v, 0)} steps`);
    const sn = slider(texify('resident dictionaries $\\vnD$'), 1, 8, 1, nD, v => { nD = v; run(); });
    host.append(controls(sc, sl, sn), legend([key('var(--ink-3)', 'hit'), key(T('delta-miss'), 'δ-miss'), key(T('raw-miss'), 'raw miss')], { shape: 'dot' }), box,
      h('div', { class: 'kpis' }, tiles.fD, tiles.loads, tiles.top, tiles.miss), barBox);
    const P = Plot(box, { x: [50, 170], y: [0, 4096], h: 330, xlabel: 'decode step', ylabel: 'token position (32 blocks)', yticks: [0, 1024, 2048, 3072, 4096], label: 'Which positions are selected at each step, coloured by what each miss cost' });
    const B2 = Plot(barBox, { xcats: range(32).map(j => (j % 4 === 0 ? String(j) : '')), y: [0, 1], h: 200, ylabel: 'share of misses', xlabel: 'block j', yfmt: v => fmtPct(v, 0), grid: 'y', label: 'Share of all misses that landed in each block' });
    const run = throttleRAF(() => {
      const R = heavySim({ conc, life: 10 ** llife, nD });
      P.clear();
      for (let j = 0; j < R.nb; j += 2) el('rect', { x: P.m.l, width: P.pw, y: P.y((j + 1) * R.b), height: P.y(j * R.b) - P.y((j + 1) * R.b), style: 'fill:var(--ink-3);opacity:.06' }, P.g.data);
      const paths = ['', '', ''];
      const dx = P.pw / 120 * 0.8, dy = Math.max(1.6, P.ph / 4096 * 10);
      R.marks.forEach(([s, p, kind]) => { paths[kind] += `M${(P.x(s) - dx / 2).toFixed(1)},${(P.y(p) - dy / 2).toFixed(1)}h${dx.toFixed(1)}v${dy.toFixed(1)}h${(-dx).toFixed(1)}z`; });
      el('path', { d: paths[0], style: 'fill:var(--ink-3);opacity:.35' }, P.g.data);
      el('path', { d: paths[1], style: `fill:${T('delta-miss')}` }, P.g.data);
      el('path', { d: paths[2], style: `fill:${T('raw-miss')}` }, P.g.data);
      tiles.fD.set(fmtPct(R.fD, 0));
      tiles.loads.set(fmt(R.loads, 2));
      tiles.top.set(fmtPct(R.top4, 0));
      tiles.miss.set(fmt(R.missPerStep, 1), `of k = 64 (${fmtPct(R.missPerStep / 64, 0)} miss rate)`);
      const tot = sum(R.perBlock);
      const top = Math.max(0.2, Math.ceil(Math.max(...R.perBlock) / tot * 10) / 10);
      B2.domain({ y: [0, top] });
      B2.clear();
      bars(B2, R.perBlock.map(v => v / tot), { colors: () => T('heavy-block'), tip: (v, i) => `<b>block ${i}</b><br>${fmtPct(v, 1)} of misses` });
    });
    run();
  };

  // =================================================================== IV.11
  // FIG.catLadder — the intuitive argument as a story: three rungs, then the jump.
  FIG.catLadder = function (host) {
    const box = h('div');
    host.append(box);
    const narrow = isNarrow(host);
    const W = narrow ? 380 : 680;
    const D = Diagram(box, { w: W, h: narrow ? 520 : 300, label: 'Nested sets of plausible messages, and how surprising entry R is against each' });
    const g = el('g', {}, D.svg);
    const steps = [
      { k: 0, label: 'Rung 1 · Against everything a model could be asked — cats, helicopters, Python, tax law — entry R is one message out of an enormous set. Very surprising.' },
      { k: 1, label: 'Rung 2 · Against cat_thread we already know the subject is cats. Fewer plausible messages: R is less surprising.' },
      { k: 2, label: 'Rung 3 · Against the 100K tokens around it, all on the Maine Coon, R is least surprising of all.' },
      { k: 3, label: 'The jump · “HiSparse hits 87 % of the time, so the bottom rung must be steep, so block dictionaries will work.” Hold that thought.' },
    ];
    const H = [1, 0.66, 0.42];                            // illustrative heights of "how surprising R is"
    function render(i) {
      g.replaceChildren();
      const k = steps[i].k;
      // nested sets
      const S = narrow ? { x: 10, y: 10, w: 360, h: 300 } : { x: 10, y: 10, w: 400, h: 280 };
      const on = (lvl) => (k === lvl || (k === 3 && lvl === 2));
      rect(g, S.x, S.y, S.w, S.h, { fill: on(0) ? tint(T('cat-ladder'), 14) : 'var(--paper-2)', stroke: on(0) ? T('cat-ladder') : 'var(--rule)', rx: 18, sw: on(0) ? 2 : 1 });
      txt(g, S.x + 14, S.y + 22, 'everything: cats, helicopters, Python, tax law…', { anchor: 'start', cls: 'lbl' });
      const dog = { x: S.x + S.w * 0.62, y: S.y + 44, w: S.w * 0.33, h: S.h * 0.42 };
      rect(g, dog.x, dog.y, dog.w, dog.h, { fill: 'var(--paper-3)', stroke: 'var(--rule)', rx: 14 });
      txt(g, dog.x + dog.w / 2, dog.y + 22, 'dog_thread', { cls: 'val' });
      const cat = { x: S.x + 14, y: S.y + 44, w: S.w * 0.56, h: S.h - 60 };
      rect(g, cat.x, cat.y, cat.w, cat.h, { fill: on(1) ? tint(T('cat-ladder'), 22) : 'var(--paper-3)', stroke: on(1) ? T('cat-ladder') : 'var(--rule)', rx: 16, sw: on(1) ? 2 : 1 });
      txt(g, cat.x + 12, cat.y + 22, 'cat_thread', { anchor: 'start', cls: 'lbl' });
      const mc = { x: cat.x + 12, y: cat.y + 38, w: cat.w - 24, h: cat.h * 0.5 };
      rect(g, mc.x, mc.y, mc.w, mc.h, { fill: on(2) ? tint(T('cat-ladder'), 34) : 'var(--paper-2)', stroke: on(2) ? T('cat-ladder') : 'var(--rule)', rx: 12, sw: on(2) ? 2 : 1 });
      txt(g, mc.x + 10, mc.y + 20, 'Maine Coon: 100K tokens', { anchor: 'start', cls: 'val' });
      rect(g, mc.x, mc.y + mc.h + 8, mc.w * 0.6, cat.h - mc.h - 58, { fill: 'var(--paper-2)', stroke: 'var(--rule)', rx: 10 });
      txt(g, mc.x + 10, mc.y + mc.h + 26, 'Siamese: 10K', { anchor: 'start', cls: 'val' });
      dot(g, mc.x + mc.w * 0.7, mc.y + mc.h * 0.62, 7, 'var(--c)');
      txt(g, mc.x + mc.w * 0.7 + 12, mc.y + mc.h * 0.62 + 5, 'R', { anchor: 'start', cls: 'lbl ink' });
      // the ladder of surprise
      const Lb = narrow ? { x: 40, y: 340, w: 300, h: 150 } : { x: 450, y: 30, w: 210, h: 230 };
      txt(g, Lb.x, Lb.y - 8, 'how surprising R is (illustrative)', { anchor: 'start', cls: 'val' });
      const bw = Lb.w / 3 - 14;
      H.forEach((v, lvl) => {
        const x = Lb.x + lvl * (bw + 14), hh = (Lb.h - 30) * v, y = Lb.y + Lb.h - 22 - hh;
        rect(g, x, y, bw, hh, { fill: lvl <= Math.min(k, 2) ? tint(T('cat-ladder'), on(lvl) ? 75 : 35) : 'var(--paper-2)', stroke: T('cat-ladder'), rx: 4, op: lvl <= Math.min(k, 2) ? 1 : 0.35 });
        txt(g, x + bw / 2, Lb.y + Lb.h - 4, ['everything', 'the thread', 'the block'][lvl], { cls: 'val' });
      });
      if (k === 3) {
        const x = Lb.x + 2 * (bw + 14) + bw / 2, y = Lb.y + Lb.h - 22 - (Lb.h - 30) * H[2] - 12;
        rect(g, x - 80, y - 52, 160, 30, { fill: tint('var(--vermilion)', 18), stroke: 'var(--vermilion)', rx: 8 });
        txt(g, x, y - 32, 'HiSparse: 87 % hits', { cls: 'lbl ink' });
        arrowPath(g, `M ${x} ${y - 20} L ${x} ${y - 2}`, 'var(--vermilion)', { w: 2, dash: '4 3' });
        txt(g, x + 26, y + 2, '?', { cls: 'lbl ink', style: 'font-size:calc(22px * var(--fs,1))' });
      }
    }
    stepper(host, { steps, label: s => s.label, render: i => render(i), interval: 3200 });
  };

  // =================================================================== IV.12
  // FIG.ladderTheorem — a toy where every number is computed: H(E) ≥ H(E | thread) ≥ H(E | block), always.
  function ladderEntropies(sT, sB, sigma) {
    const NV = 16, th = [-1, 0, 1], bl = [-1.5, -0.5, 0.5, 1.5];
    const H = p => -p.reduce((a, v) => a + (v > 0 ? v * Math.log2(v) : 0), 0);
    const blockDist = mu => { const w = range(NV).map(x => Math.exp(-0.5 * ((x - mu) / sigma) ** 2)); const s = sum(w); return w.map(v => v / s); };
    const avg = ds => range(NV).map(x => mean(ds.map(d => d[x])));
    const blocks = th.map(a => bl.map(c => blockDist(7.5 + sT * a + sB * c)));
    const threads = blocks.map(avg), all = avg(threads);
    return { HE: H(all), HT: mean(threads.map(H)), HB: mean(blocks.flat().map(H)), all, thread: threads[0], block: blocks[0][1] };
  }
  FIG.ladderTheorem = function (host) {
    let sT = 2, sB = 0.6, sigma = 1.3;
    const box = h('div'), distBox = h('div'), ro = readout();
    const s1 = slider('threads differ by', 0, 4, 0.1, sT, v => { sT = v; draw(); }, v => `${fmt(v, 1)} levels`);
    const s2 = slider('blocks differ by', 0, 2, 0.1, sB, v => { sB = v; draw(); }, v => `${fmt(v, 1)} levels`);
    const s3 = slider('noise inside a block', 0.6, 3, 0.1, sigma, v => { sigma = v; draw(); }, v => `σ = ${fmt(v, 1)}`);
    host.append(controls(s1, s2, s3), h('div', { class: 'fig-row' }, box, distBox), ro);
    const P = Plot(box, { xcats: ['H(E)', 'H(E | thread)', 'H(E | block)'], y: [0, 4.2], h: 300, ylabel: 'bits per entry', grid: 'y', label: 'The three rungs of the ladder in bits' });
    const Q = Plot(distBox, { x: [-0.5, 15.5], y: [0, 0.5], h: 300, xlabel: 'value of the toy entry (16 levels)', ylabel: 'probability', label: 'The distributions behind the three rungs' });
    function draw() {
      const r = ladderEntropies(sT, sB, sigma);
      P.clear();
      bars(P, [r.HE, r.HT, r.HB], { colors: i => tint(T('cat-ladder'), [45, 70, 100][i]), labels: v => fmt(v, 2) });
      const top = Math.max(0.3, Math.max(...r.all, ...r.thread, ...r.block) * 1.15);
      Q.domain({ y: [0, top] });
      Q.clear();
      const pts = d => d.map((v, x) => [x, v]);
      line(Q, pts(r.all), { color: series(6), curve: 'step', width: 2, name: 'everything' });
      line(Q, pts(r.thread), { color: series(0), curve: 'step', width: 2, name: 'cat thread' });
      line(Q, pts(r.block), { color: series(1), curve: 'step', width: 2.6, name: 'one Maine Coon block' });
      ro.set([['I(E; thread)', `${fmt(r.HE - r.HT, 2)} bits`], ['I(E; block | thread)', `${fmt(r.HT - r.HB, 2)} bits`], ['ladder steps downward?', r.HE >= r.HT - 1e-9 && r.HT >= r.HB - 1e-9 ? 'yes — always' : 'no (bug!)']]);
    }
    distBox.prepend(legend([['everything', series(6)], ['cat thread', series(0)], ['one block of it', series(1)]]));
    draw();
  };

  // =================================================================== IV.13
  // The leak, as a live Monte Carlo. n keys in d dimensions, i.i.d. Gaussian (or, for contrast, each key
  // a close copy of the one before). A query does a random walk on the unit sphere with step η and selects
  // its top k keys at every step. We measure (a) the overlap of consecutive selections, (b) the hit rate of
  // a HiSparse-style LRU hot cache of B = 2k slots, and (c) how well a key predicts the next key (R²).
  const LEAK = { d: 32, n: 4096, k: 64, B: 128, steps: 260, warm: 60 };
  function leakKeys(corr, seed) {
    const { d, n } = LEAK, r = rng(seed), K = new Float64Array(n * d), a = Math.sqrt(1 - corr * corr);
    for (let c = 0; c < d; c++) K[c] = r.normal();
    for (let t = 1; t < n; t++) for (let c = 0; c < d; c++) K[t * d + c] = corr * K[(t - 1) * d + c] + a * r.normal();
    return K;
  }
  function neighbourR2(K) {                             // per-channel R² of key t from key t−1 (least squares with intercept)
    const { d, n } = LEAK;
    let acc = 0;
    for (let c = 0; c < d; c++) {
      let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
      for (let t = 1; t < n; t++) { const x = K[(t - 1) * d + c], y = K[t * d + c]; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; }
      const m = n - 1, cov = sxy / m - (sx / m) * (sy / m), vx = sxx / m - (sx / m) ** 2, vy = syy / m - (sy / m) ** 2;
      acc += cov * cov / (vx * vy);
    }
    return acc / d;
  }
  function topk(scores, k) {                            // indices of the k largest scores
    const n = scores.length, idx = new Int32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    // quickselect on idx by score, descending
    let lo = 0, hi = n - 1;
    while (lo < hi) {
      const piv = scores[idx[(lo + hi) >> 1]];
      let i = lo, j = hi;
      while (i <= j) {
        while (scores[idx[i]] > piv) i++;
        while (scores[idx[j]] < piv) j--;
        if (i <= j) { const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; i++; j--; }
      }
      if (k - 1 <= j) hi = j; else if (k - 1 >= i) lo = i; else break;
    }
    return Array.from(idx.subarray(0, k));
  }
  function leakRun(K, eta, seed, keepRaster) {
    const { d, n, k, B, steps, warm } = LEAK, r = rng(seed);
    let q = range(d).map(() => r.normal());
    const norm = v => { const s = Math.sqrt(v.reduce((a, x) => a + x * x, 0)); return v.map(x => x / s); };
    q = norm(q);
    const scores = new Float64Array(n), cache = [];
    let prev = null, ovSum = 0, ovN = 0, hitSum = 0, hitN = 0;
    const raster = [];
    for (let s = 0; s < steps; s++) {
      q = norm(q.map(x => x + eta * r.normal() / Math.sqrt(d)));
      for (let t = 0; t < n; t++) { let a = 0; const o = t * d; for (let c = 0; c < d; c++) a += K[o + c] * q[c]; scores[t] = a; }
      const S = topk(scores, k), Sset = new Set(S);
      if (prev && s >= warm) { let o = 0; for (const p of S) if (prev.has(p)) o++; ovSum += o / k; ovN++; }
      prev = Sset;
      const inC = new Set(cache), hits = S.filter(p => inC.has(p)), misses = S.filter(p => !inC.has(p));
      for (const p of misses) { if (cache.length >= B) cache.splice(cache.findIndex(x => !Sset.has(x)), 1); cache.push(p); }
      for (const p of hits) { cache.splice(cache.indexOf(p), 1); cache.push(p); }
      if (s >= warm) { hitSum += hits.length / k; hitN++; }
      if (keepRaster && s >= warm && s < warm + 80) raster.push(S);
    }
    return { overlap: ovSum / ovN, hit: hitSum / hitN, raster };
  }

  FIG.leakSim = function (host) {
    const ETAS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5];
    let leta = -0.6, mode = 'iid';            // η = 10^−0.6 ≈ 0.25
    const KEYS = { iid: leakKeys(0, 'iv13-keys'), copy: leakKeys(0.95, 'iv13-keys') };
    const R2 = { iid: neighbourR2(KEYS.iid), copy: neighbourR2(KEYS.copy) };
    const curves = { iid: null, copy: null };
    const status = h('span', { class: 'fig-note iv-status', text: '' });
    const rasterBox = h('div'), curveBox = h('div');
    const tiles = {
      ov: kpi('consecutive overlap', '', 'share of picks repeated from the step before', T('lucky-louis')),
      hit: kpi('LRU hit rate, B = 2k', '', 'HiSparse measured 87 %', T('hot-cache')),
      r2: kpi('neighbour predictability R²', '', 'key t from key t − 1', T('fallen-apple')),
      bits: kpi('bits a neighbour saves', '', 'per element, ½ log₂ 1/(1 − R²)', T('fallen-apple')),
    };
    tiles.r2.querySelector('.k').innerHTML = `neighbour predictability ${tex('\\vRsq')}`;
    const se = slider(texify('query drift $\\veta$'), -2, Math.log10(1.5), 0.02, leta, v => { leta = v; runOne(); }, v => fmt(10 ** v, v < -1 ? 3 : 2));
    const sm = seg([['iid', 'independent keys'], ['copy', 'each key a close copy of the last']], mode, v => { mode = v; runOne(); drawCurves(); }, 'keys');
    host.append(controls(se, sm), status, h('div', { class: 'fig-row' }, rasterBox, curveBox), h('div', { class: 'kpis' }, tiles.ov, tiles.hit, tiles.r2, tiles.bits));
    const PR = Plot(rasterBox, { x: [0, 80], y: [0, LEAK.n], h: 300, xlabel: 'decode step', ylabel: 'key position', yticks: [0, 1024, 2048, 3072, 4096], label: 'Selected key positions over 80 steps; horizontal streaks are keys re-selected step after step' });
    const PC = Plot(curveBox, { x: [0.01, 1.5], xlog: true, y: [0, 1], h: 300, xlabel: 'query drift η per step (log)', ylabel: 'share of selections', yfmt: v => fmtPct(v, 0), label: 'Overlap and LRU hit rate against query drift' });
    curveBox.prepend(legend([['LRU hit rate, B = 2k', T('hot-cache')], ['consecutive overlap', T('lucky-louis')], ['the other kind of keys', 'var(--ink-3)', 'dash']]));
    const marker = el('g', {}, PC.g.top);

    function drawRaster(raster) {
      PR.clear();
      let d = '';
      const dx = PR.pw / 80;
      // horizontal streaks: a key selected at consecutive steps is drawn as one segment
      const last = new Map();
      raster.forEach((S, s) => S.forEach(p => {
        const y = PR.y(p).toFixed(1);
        if (last.get(p) === s - 1) d += `L${(PR.x(s) + dx * 0.5).toFixed(1)},${y}`;
        else d += `M${(PR.x(s) - dx * 0.4).toFixed(1)},${y}L${(PR.x(s) + dx * 0.5).toFixed(1)},${y}`;
        last.set(p, s);
      }));
      el('path', { d, style: `fill:none;stroke:${T('lucky-louis')};stroke-width:${(1.6 * PR.fs).toFixed(2)};stroke-linecap:round` }, PR.g.data);
    }
    function drawCurves() {
      PC.clear();
      marker.replaceChildren();
      const other = mode === 'iid' ? 'copy' : 'iid';
      if (curves[other]) {
        line(PC, curves[other].map(c => [c.eta, c.hit]), { color: 'var(--ink-3)', dash: '5 4', width: 1.6 });
        line(PC, curves[other].map(c => [c.eta, c.overlap]), { color: 'var(--ink-3)', dash: '5 4', width: 1.6 });
      }
      if (curves[mode]) {
        line(PC, curves[mode].map(c => [c.eta, c.hit]), { color: T('hot-cache'), markers: true, tip: p => `η = ${fmt(p[0], 2)}<br>hit rate ${fmtPct(p[1], 0)}` });
        line(PC, curves[mode].map(c => [c.eta, c.overlap]), { color: T('lucky-louis'), markers: true, tip: p => `η = ${fmt(p[0], 2)}<br>overlap ${fmtPct(p[1], 0)}` });
      }
      rule(PC, { y: 0.866, label: 'HiSparse hits: 86.6 %', color: 'var(--ink-2)' });
      rule(PC, { y: 0.70, label: 'HiSparse overlap: 70 %', color: 'var(--ink-2)' });
      el('line', { x1: PC.x(10 ** leta), x2: PC.x(10 ** leta), y1: PC.m.t, y2: PC.H - PC.m.b, style: 'stroke:var(--c);stroke-width:2' }, marker);
    }
    let cancelOne = null;
    function runOne() {
      if (cancelOne) cancelOne();
      status.textContent = 'computing…';
      host.classList.add('is-computing');
      cancelOne = chunked(1, () => {
        const res = leakRun(KEYS[mode], 10 ** leta, 'iv13-q', true);
        drawRaster(res.raster);
        tiles.ov.set(fmtPct(res.overlap, 0));
        tiles.hit.set(fmtPct(res.hit, 0));
        tiles.r2.set(fmt(R2[mode], 3));
        tiles.bits.set(`${fmt(bitsOf(R2[mode]), 2)} bit`);
        drawCurves();
      }, () => { status.textContent = curvesDone() ? '' : 'computing the curves…'; host.classList.toggle('is-computing', !curvesDone()); });
    }
    const curvesDone = () => !!(curves.iid && curves.copy);
    // the curves over η: one Monte Carlo run per point, in chunks, for both kinds of keys
    function computeCurves(kind, done) {
      const out = [];
      chunked(ETAS.length, i => { const res = leakRun(KEYS[kind], ETAS[i], 'iv13-q', false); out.push({ eta: ETAS[i], ...res }); },
        () => { curves[kind] = out; drawCurves(); done && done(); });
    }
    runOne();
    computeCurves('iid', () => computeCurves('copy', () => { status.textContent = ''; host.classList.remove('is-computing'); }));
  };

  // =================================================================== IV.14
  // FIG.varianceBudget — the ladder as a variance budget, priced at the Gaussian exchange rate ½·log₂ 1/(1−R²).
  FIG.varianceBudget = function (host) {
    const v = { g: 30, s: 20, b: 20 };                    // % of a typical element's variance explained per rung
    let phi = 0, nu = 2;                                  // escape hatch: % of channels that are near-deterministic, their noise %
    const stack = h('div', { class: 'ivv-stack' }), tbl = h('div'), plotBox = h('div'), hatch = h('div', { class: 'kpis' });
    const names = { g: 'global (all texts)', s: 'the thread', b: 'the block' };
    const sliders = {};
    const mk = id => (sliders[id] = slider(`+ explained by ${names[id]}`, 0, 90, 1, v[id], x => {
      v[id] = x;
      const over = v.g + v.s + v.b - 99;               // keep at least 1 % noise: trim the other rungs
      if (over > 0) for (const o of ['b', 's', 'g']) if (o !== id && over > 0) { const cut = Math.min(v[o], over); v[o] -= cut; sliders[o].set(v[o]); if (v.g + v.s + v.b <= 99) break; }
      draw();
    }, x => `${x} %`));
    const sp = slider('near-deterministic channels', 0, 30, 1, phi, x => { phi = x; draw(); }, x => `${x} % of channels`);
    const sn = slider('their noise share', 0.5, 20, 0.5, nu, x => { nu = x; draw(); }, x => `${x} %`);
    host.append(controls(mk('g'), mk('s'), mk('b')), stack, tbl, plotBox,
      h('div', { class: 'iv-sub', text: 'The escape hatch: a few channels that are almost fully predictable' }), controls(sp, sn), hatch);
    const P = Plot(plotBox, { x: [0, 1], y: [0, 3.4], h: 300, xlabel: 'variance explained so far, R²', ylabel: 'bits saved per element', xfmt: v => fmtPct(v, 0), label: 'The exchange rate from variance explained to bits, with the three rungs marked' });
    const tl = { hatchAvg: kpi('whole ladder, per element', '', 'averaged over all channels', T('cat-ladder')), typical: kpi('typical channel', '', 'from the budget above', 'var(--ink-3)'), special: kpi('near-deterministic channel', '', '', T('fallen-apple')) };
    hatch.append(tl.hatchAvg, tl.typical, tl.special);
    function draw() {
      const g = v.g / 100, s = v.s / 100, b = v.b / 100, n = 1 - g - s - b;
      // the stacked bar of variance shares
      const seg2 = (w, c, lab) => h('span', { class: 'ivv-seg', style: `width:${(100 * w).toFixed(2)}%;background:${c}`, title: `${lab}: ${fmtPct(w, 0)}` }, w > 0.07 ? `${lab} ${fmtPct(w, 0)}` : '');
      stack.replaceChildren(
        seg2(g, tint(T('cat-ladder'), 35), 'global'), seg2(s, tint(T('cat-ladder'), 60), 'thread'), seg2(b, tint(T('cat-ladder'), 90), 'block'),
        seg2(n, 'repeating-linear-gradient(45deg, color-mix(in srgb, var(--ink-3) 30%, transparent) 0 6px, transparent 6px 11px)', 'noise'));
      const R = [g, g + s, g + s + b], B = R.map(bitsOf);
      tbl.replaceChildren(table(['rung', 'R² so far', 'this rung saves', 'all rungs so far', 'bits left of 8'], [
        ['global channel model', fmtPct(R[0], 0), `${f2(B[0])} bit`, `${f2(B[0])} bit`, f2(8 - B[0])],
        ['+ per-thread dictionary', fmtPct(R[1], 0), `${f2(B[1] - B[0])} bit`, `${f2(B[1])} bit`, f2(8 - B[1])],
        { cells: ['+ per-block dictionary', fmtPct(R[2], 0), `${f2(B[2] - B[1])} bit`, `${f2(B[2])} bit`, f2(8 - B[2])], cls: 'hl' },
      ], { left: [0] }), h('p', { class: 'fig-note', html: `Noise ${fmtPct(n, 0)}: no dictionary at any scope can save more than ${f2(bitsOf(1 - n))} bit per element. A block rung worth 1 bit would have to explain ${fmtPct(0.75 * (1 - R[1]), 0)} of the variance (¾ of what the thread left).` }));
      P.clear();
      const xs = linspace(0, 0.985, 120);
      area(P, xs.map(x => [x, bitsOf(x)]), { color: T('cat-ladder'), opacity: 0.08 });
      line(P, xs.map(x => [x, bitsOf(x)]), { color: 'var(--ink-3)', width: 1.8 });
      el('rect', { x: P.x(1 - n), y: P.m.t, width: P.x(1) - P.x(1 - n), height: P.ph, style: 'fill:var(--ink-3);opacity:.12' }, P.g.data);
      txt(P.g.data, (P.x(1 - n) + P.x(1)) / 2, P.m.t + 16 * P.fs, 'noise', {});
      let x0 = 0, y0 = 0;
      R.forEach((x, i) => {
        const y = bitsOf(x);
        line(P, [[x0, y0], [x, y0], [x, y]], { color: tint(T('cat-ladder'), [45, 70, 100][i]), width: 3 });
        dot(P.g.top, P.x(x), P.y(y), 5 * P.fs, tint(T('cat-ladder'), [45, 70, 100][i]));
        x0 = x; y0 = y;
      });
      annotate(P, R[2], B[2], `block rung: +${f2(B[2] - B[1])} bit`, { dx: -40, dy: -34 });
      // escape hatch
      const typical = B[2], special = bitsOf(1 - nu / 100), avg = (1 - phi / 100) * typical + (phi / 100) * special;
      tl.hatchAvg.set(`${f2(avg)} bit`);
      tl.typical.set(`${f2(typical)} bit`, `noise ${fmtPct(n, 0)}`);
      tl.special.set(`${f2(special)} bit`, `noise ${fmt(nu, 1)} %`);
    }
    draw();
  };

  // =================================================================== IV.15
  // FIG.twoLevers — requests per GPU, N = min(N_link, N_HBM), for HiSparse and the two levers (reference setting).
  FIG.twoLevers = function (host) {
    const k = 2048, NL = 78, e = E_BYTES, TPOT = 0.03, WL = 50e9, MH = 30e9;
    const MISS = { 4096: 0.134, 8192: 0.067 }, EXP = 1.08;   // HiSparse's measured points; m ∝ B^−1.08 between them
    let rho = 0.65, B = 4096, fD = 1, spend = 'cache';
    const box = h('div'), ro = readout();
    const sr = slider(texify('delta ratio $\\vrho$'), 0.3, 1, 0.01, rho, v => { rho = v; draw(); });
    const sf = slider(texify('δ-miss fraction $\\vfD$'), 0, 1, 0.05, fD, v => { fD = v; draw(); }, v => fmtPct(v, 0));
    const sb = seg([[4096, 'B = 4096'], [8192, 'B = 8192']], B, v => { B = v; draw(); }, 'hot-cache size');
    const ss = seg([['cache', 'lever 2 buys a bigger cache'], ['requests', 'lever 2 buys more requests']], spend, v => { spend = v; draw(); }, 'how lever 2 is spent');
    host.append(controls(sb, sr, sf), controls(ss), legend([[`${tex('\\vNlink')}: what the link can feed`, series(0)], [`${tex('\\vNhbm')}: what GPU memory can hold`, series(2)]], { shape: 'box' }), box, ro);
    const P = Plot(box, { xcats: ['HiSparse', 'lever 1', 'lever 2', 'both'], y: [0, 400], h: 330, ylabel: 'requests per GPU', grid: 'y', label: 'Link-bound and memory-bound request counts for HiSparse and the two levers' });
    function model(l1, l2) {
      const m0 = MISS[B];
      const Beff = l2 && spend === 'cache' ? B / rho : B;
      const m = m0 * Math.pow(Beff / B, -EXP);
      const perMiss = l1 ? e * (fD * rho + (1 - fD)) : e;
      const traffic = m * k * NL * perMiss;                 // bytes per request per step
      const hbm = NL * B * e * (l2 && spend === 'requests' ? rho : 1);
      return { Nlink: WL * TPOT / traffic, Nhbm: MH / hbm, traffic, m };
    }
    function draw() {
      const cs = [model(false, false), model(true, false), model(false, true), model(true, true)];
      const top = Math.max(250, Math.ceil(1.2 * Math.max(...cs.map(c => Math.min(Math.max(c.Nlink, c.Nhbm), 500))) / 50) * 50);
      P.domain({ y: [0, top] });
      P.clear();
      bars(P, cs.map(c => [Math.min(c.Nlink, top), Math.min(c.Nhbm, top)]), {
        colors: (i, j) => series(j === 0 ? 0 : 2),
        labels: (v, i, j) => (j === 0 ? cs[i].Nlink : cs[i].Nhbm) > top ? '≫' : f0(v),
        tip: (v, i, j) => `<b>${['HiSparse', 'lever 1', 'lever 2', 'both levers'][i]}</b><br>${j ? 'N_HBM' : 'N_link'} = ${f0(j ? cs[i].Nhbm : cs[i].Nlink)} requests`,
      });
      cs.forEach((c, i) => {
        const N = Math.min(c.Nlink, c.Nhbm);
        txt(P.g.top, P.x(i), P.m.t + 14 * P.fs, `N = ${f0(N)}`, { cls: 'lbl ink' });
      });
      const base = cs[0], both = cs[3];
      ro.set([
        ['HiSparse', `N = ${f0(Math.min(base.Nlink, base.Nhbm))} (${base.Nlink < base.Nhbm ? 'link' : 'memory'}-bound)`],
        ['both levers', `N = ${f0(Math.min(both.Nlink, both.Nhbm))}, ${fmt(Math.min(both.Nlink, both.Nhbm) / Math.min(base.Nlink, base.Nhbm), 2)}×`],
        ['miss traffic, both levers', `${fmtPct(both.traffic / base.traffic, 0)} of HiSparse${spend === 'cache' && fD === 1 ? ` (ρ^${fmt(1 + EXP, 2)} = ${fmt(Math.pow(rho, 1 + EXP), 2)})` : ''}`],
      ]);
    }
    draw();
  };
})();
