/* =====================================================================
   figures/picks.js — Part XI, "The Bachelor: picks and misses, measured" (content/11-picks). See
   docs/site/figures.md.
   Builders: picksNapkin (two figures), picksMass, picksReuse, picksLayers, picksCollapse, picksHeavy,
   picksShelf, picksShelfScaling, picksNoise; round two: picksPipeline (a concept graph built with cgraph.js),
   picksRaster, picksLadder, picksStretchRatio, picksCeiling, picksStretchN, picksExplorer. The napkin bill they
   share (BILL) is a pure block that analysis/picks_bill_check.mjs runs in node against napkin_grid.json.
   Every number is read at runtime from figures/data/picks-*.json, written by analysis/picks_figdata.py
   from the Bachelor's summaries (/attic/d/bachelor-kv/results/summary/*.json; receipts inside each file).
   Grades: measured (exact replay of stored traces), derived (arithmetic or fits on measured numbers),
   extrapolated (carried to the Pin's 100K context by a fitted rule); mixed-grade figures say which is which.

   picksNapkin draws the static headline (HiSparse's measured miss curve, no controls) when its figure's id
   ends in "-headline" (fig-picks-napkin-headline) or the <figure> carries a data-static attribute; any
   other figure gets the interactive version (miss-curve and f_D-end switches, readout).

   Colour follows the entity across the Part: pin-scaled lapis, pin-absolute vermilion, v4-scaled peacock
   (series 0, 1, 2); HiSparse's published numbers are ink diamonds; ordered quantities (n_D, budget k,
   time bins) are one-hue ramps mixed toward the plate's ground; var(--c) marks what the reader picks.
   ===================================================================== */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------------ data (fails loudly)
  async function data(name) {
    const url = (window.KV && KV.prefix ? KV.prefix : '/') + 'assets/figs/data/picks-' + name + '.json';
    const r = await fetch(url);
    if (!r.ok) throw new Error(`could not load picks-${name}.json (${r.status})`);
    return r.json();
  }
  function need(v, what) { if (v == null) throw new Error(`picks data: missing ${what}`); return v; }

  // ------------------------------------------------------------------ vocabulary and colours
  const CFG = {
    'pin-scaled': { color: series(0), what: 'k = 512 picks per layer, no position resident' },
    'pin-absolute': { color: series(1), what: 'k = 2048 picks per layer, no position resident' },
    'v4-scaled': { color: series(2), what: 'k = 128 squeezed rows of 4 positions, the last 32 positions resident' },
  };
  const NAMED = ['pin-scaled', 'pin-absolute', 'v4-scaled'];
  const HS = 'var(--ink)';                       // HiSparse's published points
  const POLICY = { touched: 'touched', heaviest: 'heaviest', popular_P8: 'popular, 8 steps', popular_P32: 'popular, 32 steps' };
  const POLICY_LONG = {
    touched: 'touched: an LRU of the stretches this step’s misses touched (the primer’s loop)',
    heaviest: 'heaviest: the n_D stretches with the most positions in the hot cache',
    popular_P8: 'popular: the n_D stretches with the most misses over the last 8 steps',
    popular_P32: 'popular: the n_D stretches with the most misses over the last 32 steps',
  };
  /** One-hue ordinal ramp: step i of n, mixed toward the card ground (more = more contrast, both themes). */
  const ramp = (hue, i, n, lo = 42) => `color-mix(in srgb, var(--${hue}) ${Math.round(lo + (100 - lo) * (n > 1 ? i / (n - 1) : 1))}%, var(--paper-3))`;
  /* Numbers are printed rounded half away from zero, as the Bachelor's results.md prints them
     (0.1895 → 19.0 %, 1.065 → 1.07); the kit's fmt uses toFixed, which sends 18.95 to 18.9. */
  const half = (v, d) => { const p = 10 ** d; return Math.sign(v) * Math.round(Math.abs(v) * p * (1 + 1e-9)) / p; };
  const fmt = (v, d = 2) => window.fmt(Number.isFinite(v) ? half(v, d) : v, d);
  const fmtS = (v, d = 2) => (half(v, d) >= 0 ? '+' : '−') + fmt(Math.abs(v), d);
  const pc = (v, d = 1) => fmt(v * 100, d) + '%';
  /** viewBox size: 640 wide in a normal plate; the plate's own width (≤ 1000) in a wide one, so text keeps its size. */
  function size(box, h0, w0 = 640) {
    const bw = box.getBoundingClientRect().width;
    const w = bw > 700 ? Math.min(1000, Math.round(bw)) : w0;
    return { w, h: Math.round(h0 * Math.sqrt(w / w0)) };
  }
  /** Positions and contexts: 512, 4096, 10.2K, 74K (exact below 10 000). */
  const kfmt = v => (v < 1e4 ? String(Math.round(v)) : fmtSI(v, v < 1e5 ? 1 : 0).replace(/k$/, 'K'));
  const narrowOf = el0 => el0.getBoundingClientRect().width < 560;   // phones: shorter axis titles and labels
  const note = html => h('p', { class: 'pks-note', html });
  const head = txt => h('div', { class: 'pks-head', text: txt });

  // ------------------------------------------------------------------ drawing helpers
  /** Diamond marker in px; hollow draws a ring-coloured outline. */
  function diamond(parent, X, Y, r, color, hollow = false) {
    const d = `M${X} ${Y - r}L${X + r} ${Y}L${X} ${Y + r}L${X - r} ${Y}Z`;
    return el('path', { d, class: hollow ? 'pks-hollow' : 'dot', style: hollow ? `stroke:${color}` : `fill:${color};stroke:var(--paper-3);stroke-width:1.5` }, parent);
  }
  function star(parent, X, Y, r, color) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      d += (i ? 'L' : 'M') + (X + rr * Math.cos(a)).toFixed(2) + ' ' + (Y + rr * Math.sin(a)).toFixed(2);
    }
    return el('path', { d: d + 'Z', class: 'dot', style: `fill:${color};stroke:var(--paper-3);stroke-width:1.5` }, parent);
  }
  /** Horizontal reference line under the marks, its label above it at the left or right end. */
  function hline(P, y, label, o = {}) {
    const f = P.fs, Y = P.y(y);
    el('line', { class: 'rule-line', x1: P.m.l, x2: P.W - P.m.r, y1: Y, y2: Y, style: `stroke:${o.color || 'var(--ink-2)'}` + (o.dash === false ? '' : `;stroke-dasharray:${o.dash || '5 4'}`) }, el('g', { class: 'pk-rule' }, P.g.bg));
    if (label) {
      const left = o.side === 'left', below = o.below || Y < P.m.t + 18 * f;
      svgText(el('g', { class: 'pk-rule' }, P.g.top), left ? P.m.l + 6 * f : P.W - P.m.r - 6 * f, below ? Y + 15 * f : Y - 6 * f, label, { class: 'lbl rule-lbl', 'text-anchor': left ? 'start' : 'end' });
    }
  }
  /** Vertical reference line under the marks, its label at the top or bottom, beside the line. */
  function vline(P, x, label, o = {}) {
    const f = P.fs, X = P.x(x);
    el('line', { class: 'rule-line', x1: X, x2: X, y1: P.m.t, y2: P.H - P.m.b, style: `stroke:${o.color || 'var(--ink-2)'}` + (o.dash === false ? '' : `;stroke-dasharray:${o.dash || '5 4'}`) }, el('g', { class: 'pk-rule' }, P.g.bg));
    if (label) {
      const left = o.side ? o.side === 'left' : X > P.m.l + P.pw * 0.7;
      const y = o.pos === 'bottom' ? P.H - P.m.b - 7 * f : P.m.t + 13 * f;
      svgText(el('g', { class: 'pk-rule' }, P.g.top), X + (left ? -6 : 6) * f, y, label, { class: 'lbl rule-lbl', 'text-anchor': left ? 'end' : 'start' });
    }
  }
  /** A marker with a tooltip, drawn above the crosshair layer. */
  function mark(P, x, y, r, color, tip, kind = 'dot') {
    const X = P.x(x), Y = P.y(y), R = r * P.fs;
    const g = el('g', {}, P.g.top);
    const m = kind === 'diamond' ? diamond(g, X, Y, R * 1.25, color) : kind === 'hdiamond' ? diamond(g, X, Y, R * 1.25, color, true)
      : kind === 'ring' ? el('circle', { cx: X, cy: Y, r: R, class: 'pks-hollow', style: `stroke:${color}` }, g)
        : kind === 'star' ? star(g, X, Y, R * 1.6, color) : dot(g, X, Y, R, color);
    if (tip) {
      const hit = el('circle', { cx: X, cy: Y, r: Math.max(R + 5 * P.fs, 11), class: 'hit', tabindex: 0 }, g);
      hover(hit, () => tip);
    }
    return m;
  }
  /** A vertical range bar (rounded ends) with a tooltip. */
  function vrange(P, x, lo, hi, color, w, tip, dx = 0) {
    const X = P.x(x) + dx * P.fs, g = el('g', {}, P.g.top);
    el('line', { x1: X, x2: X, y1: P.y(lo), y2: P.y(hi), class: 'pks-range', style: `stroke:${color};stroke-width:${w * P.fs}` }, g);
    if (tip) hover(el('rect', { x: X - 8 * P.fs, y: P.y(hi) - 6 * P.fs, width: 16 * P.fs, height: Math.abs(P.y(lo) - P.y(hi)) + 12 * P.fs, class: 'hit', tabindex: 0 }, g), () => tip);
    return g;
  }

  // ================================================================== picksNapkin — sequences per GPU per design
  FIG.picksNapkin = async (host, figure) => {
    const d = await data('napkin');
    const fig = figure || host.closest('figure');
    const isStatic = !!fig && (/-headline$/.test(fig.id || '') || fig.hasAttribute('data-static'));
    const designs = need(d.designs, 'napkin.designs');
    const curves = need(d.curves, 'napkin.curves');
    need(curves.hisparse_measured, 'napkin.curves.hisparse_measured');
    const GROUP = { hisparse: series(0), shelf: series(1), global: series(2) };
    let curve = 'hisparse_measured', end = 'low';
    const box = h('div'), ro = readout();
    const lg = legend([
      ...Object.entries(need(d.groups, 'napkin.groups')).map(([g, lab]) => [lab, GROUP[g], 'dot']),
      [`range: the two ends of the extrapolated f_D`, 'var(--ink-3)', 'pill'],
      ['the primer’s design: 4 × 4096, f_D 0.85 assumed', 'var(--ink-2)', 'ring'], ['the resized HiSparse hot cache', 'var(--ink-3)', 'dash']], { cls: 'pks-legend' });
    if (isStatic) host.append(lg, box);
    else {
      const swC = seg([['hisparse_measured', 'HiSparse’s measured curve'], ['stand_in_prediction', 'the stand-in’s prediction']], curve, v => { curve = v; draw(); }, 'miss curve');
      const swE = seg([['low', 'f_D low end'], ['high', 'f_D high end']], end, v => { end = v; draw(); }, 'end of the extrapolated δ-miss fraction');
      host.append(controls(h('span', { class: 'pks-head', text: 'miss curve' }), swC), controls(h('span', { class: 'pks-head', text: 'f_D at the Pin' }), swE), lg, box, ro);
    }
    const valueAt = r => (r.N != null ? r.N : r[end].N);
    const nf = (id, v) => fmt(v, id === 'hs-pub' ? 1 : 0);
    const bindTxt = b => (b === 'link' ? 'link-bound' : 'GPU-memory-bound');
    const cell = c => `${c.n_D} × ${c.b}: f_D ${fmt(c.f_D, 2)}, ${fmt(c.n_load, 2)} loads per step`;
    function tipOf(ds, r) {
      const head0 = `<b>${esc(ds.label)}</b> · ${ds.grade}<br>`;
      if (r.N != null) {
        let t = `${head0}${nf(ds.id, r.N)} sequences per GPU at B = ${r.B} hot-cache slots per layer (${bindTxt(r.binds)})`;
        if (r.alt) t += `<br>at the solo code-length estimate ${r.alt.rho}: ${fmt(r.alt.N, 0)} (B = ${r.alt.B})`;
        return t;
      }
      let t = `${head0}low end of f_D: ${fmt(r.low.N, 0)} at the best shelf ${cell(r.low)}; B = ${r.low.B}, ${bindTxt(r.low.binds)}`
        + `<br>high end of f_D: ${fmt(r.high.N, 0)} at ${cell(r.high)}; B = ${r.high.B}, ${bindTxt(r.high.binds)}`;
      if (r.assumed) t += `<br>the primer’s design, 4 × 4096 with f_D 0.85 and 0.05 loads assumed: ${fmt(r.assumed.N, 0)} (B = ${r.assumed.B}, ${bindTxt(r.assumed.binds)})`;
      return t;
    }
    function draw() {
      box.replaceChildren();
      const rows = curves[curve].rows, n = designs.length;
      const narrow = box.getBoundingClientRect().width < 760;      // labels above their rows unless the plate is wide
      const sz = size(box, (narrow ? 56 : 46) * n + 52);
      const P = Plot(box, {
        w: sz.w, h: sz.h, ycats: designs.map(x => (narrow ? '' : x.label)), x: [40, 152], xticks: [40, 60, 80, 100, 120, 140],
        grid: 'x', xlabel: narrow ? 'sequences per GPU at the Pin' : 'sequences per GPU at the Pin, each design at its best hot-cache size',
        m: narrow ? { l: 12, t: 8, r: 16 } : { t: 8, r: 16 }, label: 'Sequences per GPU at the Pin for each serving design, each at its best hot-cache size',
      });
      const f = P.fs, slot = Math.abs(P.y(1) - P.y(0)), cw = 7.2 * f;   // cw: the width of one value-label character
      const res = rows['hs-best'].N;
      vline(P, res, narrow ? '' : 'resized HiSparse', { pos: 'bottom', color: 'var(--ink-3)' });
      const val = (x, y, text, anchor) => el('text', { x, y, 'text-anchor': anchor, class: 'val', text }, P.g.top);
      designs.forEach((ds, i) => {
        const r = need(rows[ds.id], `napkin row ${ds.id}`), col = GROUP[ds.group];
        const top = P.y(i) - slot / 2;
        const yc = narrow ? top + slot * 0.66 : P.y(i) - 2 * f;
        if (narrow) el('text', { x: P.m.l + 2 * f, y: top + slot * 0.3, class: 'lbl', text: ds.label }, P.g.top);
        const g = el('g', {}, P.g.data);
        let lo, hi, text;
        if (r.N != null) {
          lo = hi = r.N; text = nf(ds.id, r.N);
          dot(g, P.x(r.N), yc, 5.5 * f, col);
        } else {
          lo = r.low.N; hi = r.high.N;
          el('line', { x1: P.x(lo), x2: P.x(hi), y1: yc, y2: yc, class: 'pks-range', style: `stroke:${col};stroke-width:${8 * f};opacity:${isStatic ? 1 : 0.4}` }, g);
          if (isStatic) text = Math.round(lo) === Math.round(hi) ? fmt(lo, 0) : `${fmt(lo, 0)}–${fmt(hi, 0)}`;
          else { const v = r[end].N; dot(g, P.x(v), yc, 5.5 * f, col); text = fmt(v, 0); }
        }
        if (!narrow) val(P.x((lo + hi) / 2), yc - 11 * f, text, 'middle');
        else if (!(r.assumed && r.assumed.N > hi) && P.x(hi) + 10 * f + text.length * cw < P.W - P.m.r) val(P.x(hi) + 10 * f, yc + 4 * f, text, 'start');
        else val(P.x(lo) - 10 * f, yc + 4 * f, text, 'end');
        if (r.assumed) {
          const A = r.assumed.N, X = P.x(A), lab = narrow ? `assumed: ${fmt(A, 0)}` : `assumed f_D 0.85: ${fmt(A, 0)}`;
          el('circle', { cx: X, cy: yc, r: 5.5 * f, class: 'pks-hollow', style: `stroke:${col}` }, g);
          const at = { class: 'lbl', style: 'fill:var(--ink-3)', text: lab };
          if (!narrow) el('text', Object.assign({ x: X, y: yc + 20 * f, 'text-anchor': 'middle' }, at), P.g.top);
          else if (A < lo) el('text', Object.assign({ x: X + 10 * f, y: yc + 4 * f, 'text-anchor': 'start' }, at), P.g.top);
          else el('text', Object.assign({ x: X + 6 * f, y: top + slot * 0.3, 'text-anchor': 'end' }, at), P.g.top);
        }
        const hit = el('rect', { x: P.m.l, y: P.y(i) - slot / 2, width: P.pw, height: slot, class: 'pks-row-hit', tabindex: 0 }, P.g.top);
        hover(hit, () => tipOf(ds, r));
      });
      if (isStatic) return;
      // readout: the best design, the best one with a shelf, both against the resized hot cache
      const vals = designs.map(ds => ({ ds, v: valueAt(rows[ds.id]) }));
      const best = vals.reduce((a, b) => (b.v > a.v ? b : a));
      const bestShelf = vals.filter(x => x.ds.group === 'shelf').reduce((a, b) => (b.v > a.v ? b : a));
      const gain = v => `${fmtS(100 * (v / res - 1), 1)}% over the resized HiSparse hot cache (${fmt(res, 0)})`;
      ro.set([
        ['best design', `${esc(best.ds.label)}: ${fmt(best.v, 0)} sequences per GPU, ${gain(best.v)}`],
        ['best with a dictionary shelf', `${esc(bestShelf.ds.label)}: ${fmt(bestShelf.v, 0)}, ${gain(bestShelf.v)}`],
        ['HiSparse as published', `${fmt(rows['hs-pub'].N, 1)} (B = 4096)`],
      ]);
    }
    draw();
  };

  // ================================================================== picksMass — attention mass of the top-k
  FIG.picksMass = async (host) => {
    const d = await data('mass');
    const ks = need(d.k, 'mass.k'), L = need(d.layers, 'mass.layers'), PL = need(d.per_layer, 'mass.per_layer');
    let mode = 'mean', layer = 12;
    const box = h('div'), ro = readout();
    const sw = seg([['mean', 'mean of the 28 layers'], ['layer', 'one layer']], mode, v => { mode = v; draw(); }, 'which layers');
    const sl = slider('layer l', 0, L - 1, 1, layer, v => { layer = v; if (mode !== 'layer') { mode = 'layer'; sw.set('layer'); } draw(); });
    host.append(controls(sw, sl), legend([
      ['mean of 28 layers (band: range of the five sequences)', series(0), 'line'], ['the chosen layer', 'var(--c)', 'line'], ['each of the 28 layers', 'var(--ink-3)', 'line']], { cls: 'pks-legend' }), box, ro);
    const lo = Math.max(0, Math.floor(Math.min(...PL.flat()) * 10) / 10);
    const P = Plot(box, {
      x: [ks[0] / 1.25, ks[ks.length - 1] * 1.25], xlog: 2, xticks: ks, xfmt: kfmt, y: [lo, 1], yfmt: v => pc(v, 0),
      xlabel: 'budget k: the top-k positions of a step (log scale)', ylabel: 'share of the non-self attention mass', ...size(box, 340),
      label: 'Share of the non-self attention mass held by the top-k positions, against k, per layer of Qwen 2.5 1.5B',
    });
    const f = P.fs;
    vline(P, 512, 'k = 512 (pin-scaled)', { color: 'var(--ink-3)', pos: 'bottom', side: 'right' });
    const ghosts = el('g', { class: 'pks-ghost' }, P.g.bg);
    PL.forEach(row => line(P, row.map((v, j) => [ks[j], v]), { parent: ghosts, color: 'var(--ink-3)' }));
    area(P, ks.map((k, j) => [k, d.seq_min[j], d.seq_max[j]]), { color: series(0), opacity: 0.16 });
    line(P, ks.map((k, j) => [k, d.mean[j]]), { color: series(0), markers: 3.5, tip: (p, j) => `<b>mean of 28 layers</b> · k = ${ks[j]}<br>${pc(d.mean[j])} of the non-self mass (sequences ${pc(d.seq_min[j])}–${pc(d.seq_max[j])})` });
    const sel = el('g', {}, P.g.data);
    // hit lines over every layer: hover names it, a click chooses it
    const hits = el('g', {}, P.g.top);
    PL.forEach((row, l) => {
      const hl = el('path', { d: linePath(P, row.map((v, j) => [ks[j], v])), class: 'pks-hitline', tabindex: 0, role: 'button', 'aria-label': `choose layer ${l}` }, hits);
      hover(hl, () => `<b>layer ${l}</b> · top-512 holds ${pc(row[ks.indexOf(512)])}<br>click to choose it`);
      const choose = () => { layer = l; mode = 'layer'; sw.set('layer'); sl.set(l); draw(); };
      hl.addEventListener('click', choose);
      hl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
    });
    const at = (arr, k) => arr[ks.indexOf(k)];
    function draw() {
      sel.replaceChildren();
      const isL = mode === 'layer', row = isL ? PL[layer] : d.mean;
      if (isL) {
        line(P, row.map((v, j) => [ks[j], v]), { parent: sel, color: 'var(--c)', width: 2.6, markers: 4, tip: (p, j) => `<b>layer ${layer}</b> · k = ${ks[j]}<br>${pc(row[j])} of the non-self mass` });
        const last = row[row.length - 1];
        el('text', { x: P.x(ks[ks.length - 1]) - 8 * f, y: P.y(last) + (last > 0.93 ? 17 : -9) * f, 'text-anchor': 'end', class: 'lbl', text: `layer ${layer}` }, sel);
      }
      const self = isL ? d.self.per_layer[layer] : d.self.mean, sink = isL ? d.sink.per_layer[layer] : d.sink.mean, win = isL ? d.window128.per_layer[layer] : d.window128.mean;
      ro.set([
        [isL ? `layer ${layer}` : 'mean of 28 layers', `top-64 ${pc(at(row, 64), 0)} · top-512 ${pc(at(row, 512), 0)} · top-2048 ${pc(at(row, 2048), 0)} of the non-self mass`],
        ['the token itself', `${pc(self)} of all attention`],
        ['the first 4 positions', `${pc(sink)} of the non-self mass`],
        ['the last 128 positions', `${pc(win)} of the non-self mass`],
      ]);
    }
    draw();
  };

  // ================================================================== picksReuse — miss rate against B/k
  FIG.picksReuse = async (host) => {
    const d = await data('reuse');
    const C = need(d.configs, 'reuse.configs'), hs = need(d.hisparse, 'reuse.hisparse');
    let sel = 'pin-scaled';
    const box = h('div'), ro = readout();
    const sw = seg(NAMED.map(n => [n, n]), sel, v => { sel = v; draw(); }, 'configuration');
    host.append(controls(sw), legend([
      ...NAMED.map(n => [n, CFG[n].color, 'line']),
      ['Bélády’s clairvoyant policy (the chosen configuration)', 'var(--ink-2)', 'ring'],
      ['HiSparse on GLM-5.1, published (hollow: Bélády)', HS, 'diamond'],
      ['the primer’s fit 0.294 · (B/k)<sup>−1.08</sup>', 'var(--ink-2)', 'dash']], { cls: 'pks-legend' }), box, ro);
    const fit = need(hs.fit, 'reuse.hisparse.fit');
    function draw() {
      box.replaceChildren();
      const P = Plot(box, {
        x: [1, 32], xlog: 2, xticks: [1, 2, 4, 8, 16, 32], y: [0.001, 0.6], ylog: true, yticks: [0.001, 0.003, 0.01, 0.03, 0.1, 0.3],
        yfmt: v => pc(v, v < 0.01 ? 1 : 0), xlabel: 'hot cache B / budget k (log scale)', ylabel: 'miss rate m (log scale)', ...size(box, 360),
        label: 'Hot-cache miss rate against B/k, log-log, for three named configurations of the stand-in, with HiSparse’s published points',
      });
      const order = NAMED.filter(n => n !== sel).concat([sel]);
      order.forEach(n => {
        const c = C[n], on = n === sel;
        if (on) area(P, c.lru.map(p => [p[0], p[2], p[3]]), { color: CFG[n].color, opacity: 0.18 });
        const g = line(P, c.lru.map(p => [p[0], p[1]]), { color: CFG[n].color, width: on ? 2.6 : 1.6, name: n });
        if (!on) g.classList.add('pks-faint');
      });
      line(P, [1, 1.5, 2, 3, 4, 6, 8].map(r => [r, fit.c * r ** -fit.alpha]), { color: 'var(--ink-2)', width: 1.6, dash: '6 4' });
      crosshair(P, { xname: 'B/k =', xfmt: v => fmt(v, 2), yfmt: v => pc(v, 2) });
      const c = C[sel];
      c.belady.forEach(([r, m]) => mark(P, r, m, 4.5, CFG[sel].color, `<b>${sel}, Bélády’s policy</b> at B/k = ${r}<br>${pc(m, 2)} (LRU ${pc(c.lru.find(p => p[0] === r)[1], 2)})`, 'ring'));
      hs.points.forEach(([r, m]) => mark(P, r, m, 4.5, HS, `<b>HiSparse, GLM-5.1</b> (published) at B/k = ${r}<br>miss rate ${pc(m, 1)} · k = 2048 of 100K positions`, 'diamond'));
      hs.belady.forEach(([r, m]) => mark(P, r, m, 4.5, HS, `<b>HiSparse, Bélády’s policy</b> at B/k = ${r}<br>${pc(m, 1)} (published)`, 'hdiamond'));
      const at = r => c.lru.find(p => p[0] === r)[1];
      const hsAt = r => hs.points.find(p => p[0] === r)[1];
      ro.set([
        [`${sel}, miss rate at B/k = 1 / 2 / 4`, `${[1, 2, 4].map(r => pc(at(r))).join(' / ')} (HiSparse ${[1, 2, 4].map(r => pc(hsAt(r))).join(' / ')})`],
        ['against HiSparse', [1, 2, 4].map(r => `${fmt(at(r) / hsAt(r), 2)}×`).join(' / ')],
        ['slope over B/k = 1 … 8', `${fmt(c.slope_1_8, 2)} (HiSparse’s fit ${fmt(fit.alpha, 2)})`],
        ['LRU over Bélády at B/k = 2', `${fmt(c.lru_over_belady_2, 2)} (HiSparse ${fmt(hs.lru_over_belady_2, 2)})`],
      ]);
    }
    draw();
  };

  // ================================================================== picksLayers — miss rate and bursts per layer
  FIG.picksLayers = async (host) => {
    const d = await data('layers');
    const C = need(d.configs, 'layers.configs');
    const boxA = h('div'), boxB = h('div'), ro = readout();
    host.append(legend([...NAMED.map(n => [n, CFG[n].color, 'line']), ['HiSparse, GLM-5.1: mean over its 78 layers (published)', HS, 'dash']], { cls: 'pks-legend' }),
      head('miss rate per layer at B/k = 2 (bands: range of the five sequences)'), boxA, head('burst: p99 over mean of the misses per step, per layer'), boxB, ro);
    const depthFmt = v => `${Math.round(v * 28)} (l/28 = ${fmt(v, 2)})`;
    const mk = narrowOf(boxA) ? false : 2.6, tk = { xticks: [0, 0.25, 0.5, 0.75, 1], xfmt: v => fmt(v, 2) };
    const PA = Plot(boxA, {
      x: [0, 1], ...tk, y: [0, 0.38], yfmt: v => pc(v, 0), ...size(boxA, 250), ylabel: 'miss rate m', xlabel: 'relative depth l / 28',
      label: 'Hot-cache miss rate at B/k = 2 per layer against relative depth, three named configurations',
    });
    hline(PA, d.hisparse_m_2, `HiSparse ${pc(d.hisparse_m_2)}`, { color: HS, dash: '6 4' });
    NAMED.forEach(n => area(PA, C[n].depth.map((x, l) => [x, C[n].m_seq_min[l], C[n].m_seq_max[l]]), { color: CFG[n].color, opacity: 0.14 }));
    NAMED.forEach(n => line(PA, C[n].depth.map((x, l) => [x, C[n].m[l]]), { color: CFG[n].color, width: 2, markers: mk, name: n }));
    crosshair(PA, { xname: 'layer', xfmt: depthFmt, yfmt: v => pc(v, 1) });
    const bmax = Math.ceil(Math.max(...NAMED.flatMap(n => C[n].burst)) * 2) / 2 + 0.2;
    const PB = Plot(boxB, {
      x: [0, 1], ...tk, y: [1, bmax], yticks: [1, 2, 3, 4, 5].filter(v => v <= bmax), ...size(boxB, 230), ylabel: 'p99 / mean', xlabel: 'relative depth l / 28', yfmt: v => fmt(v, 0),
      label: 'Burst factor, p99 over mean of the misses per step, per layer, three named configurations',
    });
    NAMED.forEach(n => line(PB, C[n].depth.map((x, l) => [x, C[n].burst[l]]), { color: CFG[n].color, width: 2, markers: mk, name: n }));
    crosshair(PB, { xname: 'layer', xfmt: depthFmt, yfmt: v => `${fmt(v, 2)}×` });
    const ps = C['pin-scaled'].all;
    ro.set([
      ...NAMED.map(n => [n, `m ${pc(C[n].all.m[0])} (layers ${pc(C[n].all.m_layer_p10_p90[0], 0)}–${pc(C[n].all.m_layer_p10_p90[1], 0)}, p10–p90) · burst ${fmt(C[n].all.burst[0], 1)}×`]),
      ['pin-scaled, misses per layer per step', `mean ${fmt(ps.misses_per_step[0], 0)} of 512 picks · p50 ${fmt(ps.p50, 0)} · p90 ${fmt(ps.p90, 0)} · p99 ${fmt(ps.p99, 0)}`],
    ]);
  };

  // ================================================================== picksCollapse — miss rate against the share φ = k / t
  FIG.picksCollapse = async (host) => {
    const d = await data('collapse');
    const ks = need(d.ks, 'collapse.ks'), lines = need(d.lines, 'collapse.lines'), fits = need(d.fits, 'collapse.fits'), hs = need(d.hisparse, 'collapse.hisparse');
    let r = '2';
    const box = h('div'), ro = readout();
    const col = i => ramp('lapis', i, ks.length, 38);
    const sw = seg([['1', 'B/k = 1'], ['2', 'B/k = 2'], ['4', 'B/k = 4']], r, v => { r = v; draw(); }, 'hot cache size');
    host.append(controls(sw), legend([
      ...ks.map((k, i) => [`k = ${k}`, col(i), 'line']), ['single sequences', 'var(--ink-3)', 'dots'],
      ['HiSparse, GLM-5.1 (published)', HS, 'diamond'], ['the stand-in’s curve at the Pin’s share (fit, extrapolated in t)', HS, 'hdiamond']], { cls: 'pks-legend' }), box, ro);
    function draw() {
      box.replaceChildren();
      const L = lines[r], ff = fits[r];
      const ys = ks.flatMap(k => L[k].seq.map(p => p[1]).concat(L[k].mean.map(p => p[1]))).concat([hs.m[r], ff.pin_pred[1], ff.pin_pred[2]]);
      const [y0, y1] = [Math.min(...ys) / 1.2, Math.max(...ys) * 1.15];
      const yt = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5].filter(v => v >= y0 && v <= y1);
      const P = Plot(box, {
        x: [0.0018, 0.26], xlog: true, xticks: [0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2], xfmt: v => pc(v, v < 0.01 ? 1 : 0),
        y: [y0, y1], ylog: true, yticks: yt.length >= 3 ? yt : undefined, yfmt: v => pc(v, v < 0.01 ? 1 : 0), ...size(box, 360),
        xlabel: 'share of the context picked, φ = k / t (log scale)', ylabel: 'miss rate m (log scale)',
        label: `Hot-cache miss rate at B/k = ${r} against the share of the context picked, one line per budget k over five time bins`,
      });
      const f = P.fs;
      vline(P, hs.s, 'the Pin’s share', { color: 'var(--ink-3)', pos: 'bottom', side: 'left' });
      const dots = el('g', {}, P.g.data);
      ks.forEach((k, i) => L[k].seq.forEach(([s, m]) => el('circle', { cx: P.x(s), cy: P.y(m), r: 2.4 * f, style: `fill:${col(i)};opacity:.45` }, dots)));
      ks.forEach((k, i) => line(P, L[k].mean.map(p => [p[0], p[1]]), {
        color: col(i), width: 2.2, markers: 3.6,
        tip: (p, j) => `<b>k = ${k}</b>, time bin ${j + 1} of ${L[k].mean.length} (t ≈ ${kfmt(k / p[0])})<br>φ = ${pc(p[0], 2)} · miss rate ${pc(p[1], 1)}<br>mean of ${L[k].mean[j][2]} sequences, 28 layers each`,
      }));
      mark(P, hs.s, hs.m[r], 5, HS, `<b>HiSparse, GLM-5.1</b> (published): k = 2048 of 100K, φ = ${pc(hs.s, 2)}<br>miss rate ${pc(hs.m[r])} at B/k = ${r}`, 'diamond');
      const pp = ff.pin_pred;
      vrange(P, hs.s, pp[1], pp[2], 'var(--ink-3)', 2, null, 9);
      mark(P, hs.s * Math.pow(10, 9 * f / (P.x(10) - P.x(1))), pp[0], 4.5, HS, `<b>the stand-in’s curve at the Pin’s share</b> (extrapolated)<br>a cubic in log φ read at φ = ${pc(hs.s, 2)}: ${pc(pp[0])} (sequences ${pc(pp[1])}–${pc(pp[2])})`, 'hdiamond');
      annotate(P, hs.s, hs.m[r], 'HiSparse', { dx: -26, dy: 22, anchor: 'end', dot: false });
      const ke = ff.k_exp_at_fixed_s;
      ro.set([
        ['at a fixed share φ', `m ∝ k<sup>${fmtS(ke[0], 2)}</sup> (sequences ${fmt(ke[1], 2)} … ${fmt(ke[2], 2)}): the budget adds nothing`],
        ['one curve in φ against one in k', `rms of log m ${fmt(ff.rms_s, 3)} against ${fmt(ff.rms_k, 3)}: ${fmt(ff.rms_k / ff.rms_s, 1)}× better in φ`],
        ['at the Pin’s share', `the stand-in ${pc(pp[0], 0)} (extrapolated) · HiSparse ${pc(hs.m[r])}`],
      ]);
    }
    draw();
  };

  // ================================================================== picksHeavy — misses held by the heaviest stretches
  FIG.picksHeavy = async (host) => {
    const d = await data('heavy');
    const C = need(d.configs, 'heavy.configs'), tops = need(d.tops, 'heavy.tops');
    const bs = Object.keys(C['pin-scaled'].rows).map(Number).sort((a, b) => a - b);
    let b = 1024;
    const box = h('div'), ro = readout();
    const sw = seg(bs.map(v => [v, String(v)]), b, v => { b = v; draw(); }, 'stretch length b');
    host.append(controls(h('span', { class: 'pks-head', text: 'stretch length b' }), sw), legend([
      ...NAMED.map(n => [n, CFG[n].color, 'line']), ['the trace: solid, filled', 'var(--ink-2)', 'line'], ['its shuffled twin: dashed, hollow', 'var(--ink-2)', 'dash']], { cls: 'pks-legend' }), box, ro);
    const P = Plot(box, {
      x: [0.85, 9.4], xlog: 2, xticks: tops, xfmt: v => `top ${v}`, y: [0, 1], yfmt: v => pc(v, 0), ...size(box, 330),
      xlabel: 'the heaviest n stretches of the step', ylabel: 'share of the step’s misses',
      label: 'Share of a step’s misses held by its heaviest 1, 2, 4 and 8 stretches, the trace against its shuffled twin',
    });
    const g = el('g', {}, P.g.data), gt = el('g', {}, P.g.top);
    function draw() {
      g.replaceChildren(); gt.replaceChildren();
      NAMED.forEach(n => {
        const row = C[n].rows[b];
        line(P, tops.map((t, i) => [t, row.twin[i]]), { parent: g, color: CFG[n].color, width: 1.8, dash: '6 4' });
        tops.forEach((t, i) => {
          const X = P.x(t), Y = P.y(row.twin[i]);
          el('circle', { cx: X, cy: Y, r: 3.6 * P.fs, class: 'pks-hollow', style: `stroke:${CFG[n].color}` }, gt);
          hover(el('circle', { cx: X, cy: Y, r: 9 * P.fs, class: 'hit' }, gt), () => `<b>${n}, shuffled twin</b> · b = ${b}<br>heaviest ${t}: ${pc(row.twin[i])} of the step’s misses (sequences ${pc(row.twin_lo[i])}–${pc(row.twin_hi[i])})`);
        });
        line(P, tops.map((t, i) => [t, row.real[i]]), {
          parent: g, color: CFG[n].color, width: 2.4, markers: 4,
          tip: (p, i) => `<b>${n}</b> · b = ${b} · ${fmt(row.misses_per_step, 0)} misses per step on average<br>heaviest ${tops[i]}: ${pc(row.real[i])} of the step’s misses (sequences ${pc(row.real_lo[i])}–${pc(row.real_hi[i])})<br>the twin: ${pc(row.twin[i])}`,
        });
      });
      ro.set(NAMED.map(n => {
        const row = C[n].rows[b];
        return [n, `heaviest ${pc(row.real[0], 0)} (twin ${pc(row.twin[0], 0)}, ${fmt(row.lift_top1, 1)}×) · heaviest four ${pc(row.real[2], 0)} (twin ${pc(row.twin[2], 0)}) · ${fmt(row.distinct, 0)} stretches touched per step (twin ${fmt(row.distinct_twin, 0)})`];
      }));
    }
    draw();
  };

  // ================================================================== picksShelf — f_D against the shelf's coverage
  FIG.picksShelf = async (host) => {
    const d = await data('shelf');
    const C = need(d.configs, 'shelf.configs'), pin = need(d.pin, 'shelf.pin'), asm = need(d.assumed, 'shelf.assumed'), dec = need(d.decision, 'shelf.decision');
    const NDS = [1, 2, 4, 8, 16];
    const col = n => ramp('lapis', NDS.indexOf(n), NDS.length, 40);
    const PINC = series(1);                                   // the Pin's extrapolated bars
    let cfg = 'pin-scaled', pol = 'popular_P32', pinB = 4096;
    const box = h('div'), ro = readout(), nt = note('');
    const swC = seg(NAMED.map(n => [n, n]), cfg, v => { cfg = v; draw(); }, 'configuration');
    const swP = seg(Object.entries(POLICY), pol, v => { pol = v; draw(); }, 'shelf policy');
    const swB = seg([2048, 4096, 8192, 16384].map(b => [b, `b = ${b}`]), pinB, v => { pinB = v; draw(); }, 'the Pin’s stretch length');
    host.append(controls(swC), controls(h('span', { class: 'pks-head', text: 'policy' }), swP), controls(h('span', { class: 'pks-head', text: 'the Pin’s bars' }), swB),
      legend([...NDS.map(n => [`n_D = ${n}`, col(n), 'line']), ['shuffled twin (same shelves)', 'var(--ink-3)', 'dot'],
        ['the Pin at 100K, extrapolated range (n_D × b beside it)', PINC, 'pill'], ['the primer’s assumed f_D 0.85', HS, 'star']], { cls: 'pks-legend' }), box, ro, nt);
    function draw() {
      box.replaceChildren();
      const rows = C[cfg].policies[pol], narrow = narrowOf(box);
      const P = Plot(box, {
        x: [0.006, 3.2], xlog: true, xticks: [0.01, 0.03, 0.1, 0.3, 1, 3], xfmt: v => fmt(v, v < 0.1 ? 2 : v < 1 ? 1 : 0),
        y: [0, 1.04], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yfmt: v => fmt(v, 1), ...size(box, 380),
        xlabel: narrow ? 'shelf coverage n_D · b / t (log scale)' : 'shelf coverage n_D · b / t: share of the context the shelf spans (log scale)', ylabel: 'δ-miss fraction f_D',
        label: 'δ-miss fraction against the dictionary shelf’s coverage, one line per number of dictionaries n_D, with the shuffled twin and the Pin’s extrapolated ranges',
      });
      const f = P.fs;
      hline(P, dec.affordable, `${dec.affordable}: affordable`, { color: 'var(--ink-3)', side: 'left' });
      hline(P, dec.spread, `${dec.spread}: spread below`, { color: 'var(--ink-3)', side: 'left' });
      line(P, linspace(Math.log10(0.006), Math.log10(3.2), 60).map(u => [10 ** u, Math.min(1, 10 ** u)]), { color: 'var(--ink-3)', width: 1.3, dash: '3 4' });
      annotate(P, 0.4, 0.4, narrow ? 'even spread' : 'even spread:\nf_D = coverage', { dx: 26, dy: 78, anchor: 'start' });
      const tw = el('g', {}, P.g.data);
      rows.forEach(r => el('circle', { cx: P.x(r[2]), cy: P.y(r[6]), r: 2.6 * f, style: 'fill:var(--ink-3)' }, tw));
      NDS.forEach(n => {
        const pts = rows.filter(r => r[1] === n).sort((a, b) => a[0] - b[0]);
        line(P, pts.map(r => [r[2], r[3]]), {
          color: col(n), width: 2.2, markers: 3.8,
          tip: (p, i) => { const r = pts[i]; return `<b>n_D = ${n} × b = ${r[0]}</b> · ${esc(cfg)}, ${POLICY[pol]}<br>coverage ${fmt(r[2], 3)} · f_D ${fmt(r[3], 3)} (sequences ${fmt(r[4], 2)}–${fmt(r[5], 2)})<br>twin ${fmt(r[6], 3)} · lift ${fmt(r[7], 1)}× · ${fmt(r[8], 3)} net loads per step`; },
        });
      });
      const pinRows = cfg === 'pin-scaled' ? pin[pol] : null;
      if (pinRows) {
        pinRows.filter(x => x[0] === pinB && x[2] <= 3.2).forEach(([b, n, cov, lo, hi, nlLo, nlHi, grade]) => {
          const head0 = `<b>the Pin at 100K: n_D = ${n} × b = ${b}</b> · ${grade}<br>coverage ${fmt(cov, 3)} · `;
          if (grade === 'derived') mark(P, cov, 1, 4, PINC, `${head0}f_D = 1: the shelf spans the Pin’s whole context`);
          else if (lo != null && hi != null) vrange(P, cov, lo, hi, PINC, 6.5, `${head0}f_D ${fmt(lo, 2)}–${fmt(hi, 2)} (exponent ${d.pin_beta[pol].join('–')})<br>net loads per step ${fmt(nlLo, 2)} at the low end, ${fmt(nlHi, 2)} at the high end`, 6);
          else mark(P, cov, lo ?? hi, 4, PINC, `${head0}f_D ${fmt(lo ?? hi, 2)}, the ${lo == null ? 'high' : 'low'} end only (the other end falls outside the measured stretches)<br>net loads per step ${fmt(lo == null ? nlHi : nlLo, 2)}`);
          if (grade !== 'derived') el('text', { x: P.x(cov) + 13 * f, y: P.y(lo ?? hi) + 4 * f, class: 'lbl', style: 'fill:var(--ink-2)', text: `${n} × ${b}` }, P.g.top);
        });
      }
      mark(P, asm.coverage, asm.f_D, 5, HS, `<b>the primer’s assumption</b>: f_D ${asm.f_D} with ${asm.n_load} loads per step, n_D = ${asm.n_D} × b = ${asm.b} at the Pin (coverage ${fmt(asm.coverage, 3)})`, 'star');
      const at = (n, b) => rows.find(r => r[1] === n && r[0] === b);
      const cellTxt = r => `f_D ${fmt(r[3], 2)} at coverage ${fmt(r[2], 2)} (twin ${fmt(r[6], 2)}), ${fmt(r[8], 3)} loads per step`;
      const items = [['4 × 1024', cellTxt(at(4, 1024))], ['4 × 4096', cellTxt(at(4, 4096))]];
      if (pinRows) {
        const p = pinRows.find(x => x[0] === 4096 && x[1] === 4);
        items.push(['the Pin, 4 × 4096', `f_D ${fmt(p[3], 2)}–${fmt(p[4], 2)} (extrapolated), ${fmt(p[6], 2)}–${fmt(p[5], 2)} loads per step; the primer assumed ${asm.f_D}`]);
      }
      ro.set(items);
      nt.innerHTML = `Policy ${esc(POLICY_LONG[pol])}.${pinRows ? '' : ' The Pin’s extrapolation exists for pin-scaled with the heaviest and the 32-step popular policies.'} Decision rule of X.9: f_D ≥ ${dec.affordable} with n_D ≤ 8 and ≤ 0.1 loads per step, affordable; ${dec.spread} to ${dec.affordable}, partly; below ${dec.spread}, spread.`;
      swB.querySelectorAll('button').forEach(bt => { bt.disabled = !pinRows; });
    }
    draw();
  };

  // ================================================================== picksShelfScaling — the bins collapse on b / t^1.27
  FIG.picksShelfScaling = async (host) => {
    const d = await data('shelf-scaling');
    const T = need(d.t_mid, 'scaling.t_mid'), rows = need(d.rows, 'scaling.rows'), rule = need(d.rule, 'scaling.rule'), pin = need(d.pin, 'scaling.pin'), Lpin = need(d.L, 'scaling.L');
    const NDS = [1, 2, 4, 8, 16];
    const col = i => ramp('amethyst', i, T.length, 38);
    let mode = 'fit', nD = 4, pol = 'popular_P32';
    const box = h('div'), ro = readout(), nt = note('');
    const ex0 = fmt(need(rule.popular_P32, 'scaling.rule.popular_P32').beta, 2);   // the fitted exponent of the 32-step popular shelf, 1.27
    const swM = seg([['b', 'against b'], ['bt', 'against b / t'], ['fit', `against b / t<sup>${ex0}</sup>`]], mode, v => { mode = v; draw(); }, 'horizontal axis');
    const swN = seg(NDS.map(n => [n, `n_D = ${n}`]), nD, v => { nD = v; draw(); }, 'dictionaries on the shelf');
    const swP = seg([['popular_P32', 'popular, 32 steps'], ['heaviest', 'heaviest']], pol, v => { pol = v; draw(); }, 'shelf policy');
    host.append(controls(swM), controls(swN), controls(swP), legend([
      ...T.map((t, i) => [`t ≈ ${kfmt(t)}${d.n_seq[i] < 5 ? ` (${d.n_seq[i]} sequences)` : ''}`, col(i), 'line']),
      ['the Pin at 100K, extrapolated: the range over the exponent’s two ends (dashed: the Pin’s stretch lengths)', 'var(--ink-2)', 'pill']], { cls: 'pks-legend' }), box, ro, nt);
    function draw() {
      box.replaceChildren();
      const R = rule[pol], beta = mode === 'b' ? 0 : mode === 'bt' ? 1 : R.beta;
      const X = (b, t) => (mode === 'b' ? b : b * Math.pow(Lpin / t, beta));
      const my = rows[pol].filter(r => r[1] === nD).sort((a, b) => a[0] - b[0]);
      const pins = pin[pol].filter(x => x[1] === nD).sort((a, b) => a[0] - b[0]);
      const xs = my.flatMap(r => T.map(t => X(r[0], t))).concat(mode === 'b' ? [] : pins.map(x => x[0])), narrow = narrowOf(box);
      const scaled = `b · (100K / t)${mode === 'fit' ? `^${fmt(beta, 2)}` : ''}`;
      const P = Plot(box, {
        x: [Math.min(...xs) / 1.35, Math.max(...xs) * 1.35], xlog: 2, xfmt: kfmt, y: [0, 1.04], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yfmt: v => fmt(v, 1), ...size(box, 340),
        xlabel: mode === 'b' ? 'stretch length b (log scale)' : narrow ? `${scaled} (log scale)` : `${scaled}: the stretch at the Pin’s 100K a cell stands for`,
        ylabel: 'δ-miss fraction f_D',
        label: `δ-miss fraction per time bin at the Pin's share, n_D = ${nD}, against ${mode === 'b' ? 'the stretch length' : 'the stretch length scaled by the context'}`,
      });
      if (mode !== 'b') {
        pins.forEach(([b, n, lo, hi], i) => {
          vline(P, b, String(b), { color: 'var(--ink-3)', pos: i % 2 ? 'bottom' : 'top', side: 'right' });
          const tip = `<b>the Pin at 100K: n_D = ${n} × b = ${b}</b> · extrapolated<br>${lo != null && hi != null ? `f_D ${fmt(lo, 2)}–${fmt(hi, 2)} for exponents ${R.beta_range.join('–')}` : `f_D ${fmt(lo ?? hi, 2)}, the ${lo == null ? 'high' : 'low'} end only (the other end falls outside the measured stretches)`}`;
          if (lo != null && hi != null) vrange(P, b, lo, hi, 'var(--ink-2)', 6.5, tip);
          else mark(P, b, lo ?? hi, 4.5, 'var(--ink-2)', tip, 'dot');
        });
      }
      T.forEach((t, i) => line(P, my.map(r => [X(r[0], t), r[2][i]]), {
        color: col(i), width: 2.2, markers: 4,
        tip: (p, j) => `<b>t ≈ ${kfmt(t)}</b> · n_D = ${nD} × b = ${my[j][0]} · ${POLICY[pol]}<br>f_D ${fmt(my[j][2][i], 3)} · ${fmt(my[j][3][i], 3)} net loads per step${mode === 'b' ? '' : `<br>x = ${kfmt(p[0])}`}`,
      }));
      const on = k => (k === mode ? ' class="pks-on"' : '');
      ro.set([
        ['residual of logit f_D around one curve per n_D', `<span${on('b')}>b: ${fmt(R.rms_logit.b, 2)}</span> · <span${on('bt')}>b / t: ${fmt(R.rms_logit.b_over_t, 2)}</span> · <span${on('fit')}>b / t<sup>${fmt(R.beta, 2)}</sup>: ${fmt(R.rms_logit.fitted, 2)}</span>`],
        ['fitted exponent of t', `${fmt(R.beta, 2)} (sequences ${R.beta_range.join('–')}); the loads collapse at ${fmt(R.loads_beta, 2)}`],
        [`the Pin, n_D = ${nD}`, pins.map(([b, , lo, hi]) => `b ${b}: f_D ${lo != null && hi != null ? `${fmt(lo, 2)}–${fmt(hi, 2)}` : `${fmt(lo ?? hi, 2)} (${lo == null ? 'high' : 'low'} end only)`}`).join(' · ') || 'no extrapolated cell'],
      ]);
      nt.innerHTML = mode === 'b' ? 'Each line is one time bin; against b the bins stack: f_D at a fixed shelf falls as the context grows.'
        : `x is the stretch length at the Pin’s 100K context that a cell of the Bachelor stands for, b · (100K / t)${mode === 'fit' ? `<sup>${fmt(beta, 2)}</sup>` : ''}, proportional to b / t${mode === 'fit' ? `<sup>${fmt(beta, 2)}</sup>` : ''}; the dashed lines are the Pin’s stretch lengths with an extrapolated cell (none below 2048: there the rule leaves the measured stretches).`;
    }
    draw();
  };

  // ================================================================== picksNoise — indexer errors, two brackets
  FIG.picksNoise = async (host) => {
    const d = await data('noise');
    const rows = need(d.rows, 'noise.rows'), hsm = need(d.hisparse, 'noise.hisparse');
    const ex = need(rows.find(r => r.mode === 'exact'), 'noise exact row');
    const BR = { iid: { label: 'errors drawn afresh every step', color: series(1) }, persistent: { label: 'errors fixed per position', color: series(0) } };
    let r = '2';
    const box = h('div'), ro = readout();
    const sw = seg([['1', 'B/k = 1'], ['2', 'B/k = 2'], ['4', 'B/k = 4']], r, v => { r = v; draw(); }, 'hot cache size');
    host.append(controls(sw), legend([...Object.values(BR).map(b => [b.label, b.color, 'line']), ['the exact stand-in (recall 1)', 'var(--ink)', 'dot'], ['HiSparse on GLM-5.1, against the stand-in', HS, 'dash']], { cls: 'pks-legend' }), box, ro);
    function draw() {
      box.replaceChildren();
      const ys = rows.map(x => x.ratio[r]).concat([hsm[r] / ex.m[r][0]]);
      const P = Plot(box, {
        x: [1.03, 0.42], xticks: [1, 0.9, 0.8, 0.7, 0.6, 0.5], xfmt: v => pc(v, 0), y: [Math.min(0.5, Math.min(...ys) - 0.1), Math.max(...ys) + 0.25], ...size(box, 330),
        xlabel: 'recall of the erring indexer: |noisy ∩ exact| / k', ylabel: narrowOf(box) ? 'relative miss rate' : 'miss rate, relative to the exact stand-in',
        yfmt: v => `${fmt(v, 1)}×`, label: `Hot-cache miss rate relative to the exact stand-in against the indexer's recall at B/k = ${r}, two error brackets`,
      });
      hline(P, 1, '', { color: 'var(--ink-3)', dash: false });
      const hr = hsm[r] / ex.m[r][0];
      hline(P, hr, `HiSparse ${pc(hsm[r])} = ${fmt(hr, 2)}× the stand-in`, { color: HS, dash: '6 4', side: 'left' });
      Object.entries(BR).forEach(([mode, b]) => {
        const pts = [ex].concat(rows.filter(x => x.mode === mode).sort((p, q) => q.recall - p.recall));
        line(P, pts.map(x => [x.recall, x.ratio[r]]), {
          color: b.color, width: 2.4, markers: 4.2,
          tip: (p, i) => { const x = pts[i]; return `<b>${x.mode === 'exact' ? 'exact top-k' : b.label}</b>${x.sigma ? `, σ = ${x.sigma}` : ''}<br>recall ${pc(x.recall)} · miss rate ${pc(x.m[r][0])} at B/k = ${r} (${fmt(x.ratio[r], 2)}×)`; },
        });
        // σ labels on the empty side: above-left of the rising line, above-right of the falling one
        pts.slice(1).forEach(x => el('text', { x: P.x(x.recall) + (mode === 'iid' ? -8 : 8) * P.fs, y: P.y(x.ratio[r]) - 9 * P.fs, 'text-anchor': mode === 'iid' ? 'end' : 'start', class: 'lbl', style: 'fill:var(--ink-3)', text: `σ ${x.sigma}` }, P.g.top));
      });
      mark(P, 1, 1, 4.5, 'var(--ink)', `<b>the exact stand-in</b><br>miss rate ${pc(ex.m[r][0])} at B/k = ${r}`);
      const sorted = m => rows.filter(x => x.mode === m).sort((p, q) => q.recall - p.recall);
      ro.set([
        ['recall', sorted('iid').map(x => pc(x.recall, 0)).join(' / ')],
        [BR.iid.label, sorted('iid').map(x => `${fmt(x.ratio[r], 2)}×`).join(' / ')],
        [BR.persistent.label, sorted('persistent').map(x => `${fmt(x.ratio[r], 2)}×`).join(' / ')],
        ['the exact stand-in', `${pc(ex.m[r][0])} at B/k = ${r}; HiSparse ${pc(hsm[r])}`],
      ]);
    }
    draw();
  };

  // ---- BEGIN napkin bill (pure: analysis/picks_bill_check.mjs runs this block in node against napkin_grid.json)
  /* The bill of the Bachelor's analysis/napkin_grid.py (the primer's econ(), Part VI): per sequence and step,
     link bytes T = m·k·N_L·e·[f_D·y + (1 − f_D)·r_raw] + n_load·N_L·w·e with w = x·b (x the dictionary share,
     y the delta share); GPU bytes M = N_L·e·(B + n_D·w); N = min(link·tpot / T, hbm / M); m(B) log-log through
     HiSparse's measured points, slope α beyond them; the best B where the two bounds cross. */
  const BILL = (() => {
    function missCurve(G) {
      const pts = G.m_points.slice().sort((a, b) => a[0] - b[0]);
      const xs = pts.map(p => Math.log(p[0])), ys = pts.map(p => Math.log(p[1])), a = G.m_alpha_outside, n = xs.length;
      return B => {
        const x = Math.log(B);
        if (x <= xs[0]) return Math.exp(ys[0] - a * (x - xs[0]));
        if (x >= xs[n - 1]) return Math.exp(ys[n - 1] - a * (x - xs[n - 1]));
        let i = 0;
        while (x > xs[i + 1]) i++;
        return Math.exp(ys[i] + (x - xs[i]) / (xs[i + 1] - xs[i]) * (ys[i + 1] - ys[i]));
      };
    }
    /** One design at one hot-cache size. p = {x, y, b, nD, fD, nload, rhoRaw}; a global code of ratio r is {x: 0, y: r, fD: 1}. */
    function at(G, m, B, p) {
      const R = G.rig, e = R.e, NL = R.NL, w = p.x * p.b, mm = m(B), miss = mm * R.k * NL * e;
      const parts = { delta: miss * p.fD * p.y, raw: miss * (1 - p.fD) * p.rhoRaw, loads: p.nload * NL * w * e };
      const mem = { hot: NL * e * B, dict: NL * e * p.nD * w };
      const T = parts.delta + parts.raw + parts.loads, M = mem.hot + mem.dict;
      const Nlink = R.link * 1e9 * R.tpot / 1e3 / T, Nhbm = R.hbm * 1e9 / M;
      return { B, m: mm, T, M, parts, mem, Nlink, Nhbm, N: Math.min(Nlink, Nhbm), binds: Nlink < Nhbm ? 'link' : 'memory' };
    }
    /** The best B: where the link bound (rising with B) meets the memory bound (falling), by bisection in log B
        over [k, B_max] (bachelor.frontier.balance); if memory binds at k the answer is k, if the link binds at B_max, B_max. */
    function best(G, m, p) {
      let lo = G.B_range[0], hi = G.B_range[1];
      const r0 = at(G, m, lo, p);
      if (r0.Nlink >= r0.Nhbm) return { ...r0, Bx: lo, B: Math.round(lo) };
      const r1 = at(G, m, hi, p);
      if (r1.Nlink <= r1.Nhbm) return { ...r1, Bx: hi, B: Math.round(hi) };
      for (let it = 0; it < 100; it++) {
        const mid = Math.sqrt(lo * hi), r = at(G, m, mid, p);
        if (r.Nlink < r.Nhbm) lo = mid; else hi = mid;
      }
      return { ...at(G, m, lo, p), Bx: lo, B: Math.round(lo) };
    }
    const globalCode = r => ({ x: 0, y: r, b: 0, nD: 0, fD: 1, nload: 0, rhoRaw: 1 });
    return { missCurve, at, best, globalCode };
  })();
  // ---- END napkin bill

  /** Compressor points of the napkin grid: one colour each, the same in every figure. */
  const POINT_COLOR = { light: series(5), b02: series(7), b10: series(3), b25: series(4), free: series(0), tree: series(1) };
  const SHARE = { dict: series(3), delta: series(0) };      // dictionary share, delta share (as Part X's bill)
  const MB = v => `${fmt(v / 1e6, v < 1e7 ? 2 : 1)} MB`;
  const pageUrl = id => (window.KV && KV.pages && KV.pages[id] ? KV.pages[id].url : (window.KV && KV.prefix ? KV.prefix : '/') + id.replace(/^picks-/, 'picks/') + '/');

  // ================================================================== picksPipeline — the Part's chain, card by card
  FIG.picksPipeline = async (host) => {
    const d = await data('pipeline');
    const q = need(d.queries, 'pipeline.queries'), ix = need(d.indexer, 'pipeline.indexer'), tr = need(d.trace, 'pipeline.trace');
    const hc = need(d.hot_cache, 'pipeline.hot_cache'), sh = need(d.shelf, 'pipeline.shelf'), by = need(d.bytes, 'pipeline.bytes'), nk = need(d.napkin, 'pipeline.napkin');
    const K = n => `${fmt(n / 1000, 1)}K`;
    const NODES = [
      { id: 'queries', col: 1, row: 1, nc: 'var(--cat-llm)', page: 'picks-the-bachelor', title: 'the Bachelor’s queries',
        text: `Qwen 2.5 1.5B, ${q.sequences} coding-agent sequences of ${K(q.tokens_min)}–${K(q.tokens_max)} tokens, ${q.layers} layers`,
        tip: `<b>${q.sequences} sequences, ${K(q.tokens_min)}–${K(q.tokens_max)} tokens</b><br>keys, values and queries of all ${q.layers} layers: a stand-in LLM’s dataset` },
      { id: 'indexer', col: 1, row: 2, nc: 'var(--cat-llm)', page: 'picks-the-bachelor', title: 'the stand-in indexer',
        text: `exact attention, top-${ix.k}: ${pc(ix.top512_mass, 0)} of the non-self mass`,
        tip: `<b>the top ${ix.k} positions hold ${pc(ix.top512_mass, 0)}</b> of a step’s non-self attention mass (top 64: ${pc(ix.top64_mass, 0)}; top 2048: ${pc(ix.top2048_mass, 0)})` },
      { id: 'trace', col: 2, row: 1, nc: 'var(--cat-systems)', page: 'picks-a-trace', title: 'the pick trace',
        text: `consecutive steps share ${pc(tr.repeat, 0)} of their picks (HiSparse ≈ ${pc(tr.hisparse_repeat, 0)})`,
        tip: `<b>${pc(tr.repeat, 0)} of a step’s picks were picked the step before</b>; ${pc(tr.within_8, 0)} within the last 8 steps (GLM-5.1 on HiSparse: ≈ ${pc(tr.hisparse_repeat, 0)})` },
      { id: 'hot', col: 2, row: 2, nc: 'var(--cat-systems)', page: 'picks-hot-cache', title: 'the hot cache',
        text: `an LRU of 2k slots: ${pc(hc.m[1])} of picks miss (HiSparse ${pc(hc.hisparse_m[1])})`,
        tip: `<b>miss rate ${hc.m.map(v => pc(v)).join(' / ')}</b> at B/k = 1 / 2 / 4 (HiSparse ${hc.hisparse_m.map(v => pc(v)).join(' / ')})<br>${fmt(hc.misses_per_step, 0)} misses per layer per step on average, ${fmt(hc.p99, 0)} at the p99 step` },
      { id: 'shelf', col: 3, row: 1, nc: 'var(--cat-coding)', page: 'picks-shelf', title: 'the dictionary shelf',
        text: `4 dictionaries of 4096: f_D ${fmt(sh.pin_4x4096[0], 2)}–${fmt(sh.pin_4x4096[1], 2)} at the Pin (assumed ${sh.assumed})`,
        tip: `<b>δ-miss fraction ${fmt(sh.pin_4x4096[0], 2)}–${fmt(sh.pin_4x4096[1], 2)}</b> at the Pin’s 100K (extrapolated); ${fmt(sh.bachelor_4x4096, 2)} on the Bachelor, where the same shelf spans ${pc(sh.bachelor_coverage, 0)} of the context` },
      { id: 'bytes', col: 3, row: 2, nc: 'var(--cat-coding)', page: 'picks-bytes-side', title: 'the bytes of a miss',
        text: `MDL ratio: solo ${fmt(by.solo, 3)}, light ${fmt(by.light, 3)}, tree ${fmt(by.tree, 3)}`,
        tip: `<b>MDL ratio of a miss</b>: solo ${fmt(by.solo, 3)} (no dictionary), light ${fmt(by.light, 3)}, reference tree ${fmt(by.tree, 3)}; floors ${by.floors.join(' / ')}` },
      { id: 'napkin', col: 4, row: 1, nc: 'var(--cat-project)', page: 'picks-slot-price', title: 'the napkin',
        text: `sequences per GPU at the Pin: solo code ${fmt(nk.solo, 0)}, resized HiSparse ${fmt(nk.resized, 0)}`,
        tip: `<b>sequences per GPU at the Pin</b>, each design at its best hot-cache size: solo code ${fmt(nk.solo, 0)}, light shelf ${fmt(nk.light[0], 0)}–${fmt(nk.light[1], 0)}, resized HiSparse ${fmt(nk.resized, 0)}, HiSparse as published ${fmt(nk.published, 1)}` },
    ];
    const EDGES = [['queries', 'indexer', 'q · k for every past position'], ['indexer', 'trace', `${ix.k} picks per layer and step`],
      ['trace', 'hot', 'replayed step by step'], ['hot', 'shelf', 'the misses'], ['shelf', 'bytes', 'δ-misses and raw misses'], ['bytes', 'napkin', 'link bytes, GPU memory']];
    const heads = ['the picks', 'the trace and the cache', 'the misses’ bytes', 'the bill'];
    const root = h('div', { class: 'cgraph pks-chain', style: `--cols:${heads.length}` },
      h('div', { class: 'cg-heads' }, heads.map((t, i) => h('div', { class: 'cg-head', style: `--col:${i + 1}`, text: t }))),
      h('div', { class: 'cg-grid' }, NODES.map(n => {
        const a = h('a', { class: 'cg-node', 'data-node': n.id, href: pageUrl(n.page), style: `--col:${n.col};--row:${n.row};--nc:${n.nc}` },
          h('span', { class: 'cg-title', text: n.title }), h('span', { class: 'cg-text', html: n.text }));
        hover(a, () => n.tip);
        return a;
      })),
      h('script', { type: 'application/json', class: 'cg-edges', text: JSON.stringify(EDGES) }));
    host.append(root);
    if (!window.initConceptGraphs) throw new Error('picksPipeline needs cgraph.js (window.initConceptGraphs)');
    window.initConceptGraphs();
  };

  // ================================================================== picksRaster — the real trace up close
  FIG.picksRaster = async (host) => {
    const d = await data('raster');
    const n = d.t1 - d.t0, nb = d.n_bins, BIN = d.bin, per = d.stretch_len / BIN;
    if (typeof DecompressionStream === 'undefined') throw new Error('this browser cannot inflate the trace (no DecompressionStream)');
    const packed = Uint8Array.from(atob(need(d.planes_deflate_b64, 'raster.planes')), c => c.charCodeAt(0));
    const planes = new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
    if (planes.length !== 2 * n * nb) throw new Error(`raster planes: ${planes.length} bytes, expected ${2 * n * nb}`);
    const PK = planes.subarray(0, n * nb), MS = planes.subarray(n * nb);
    const shelfAt = new Array(n), kindAt = new Uint8Array(n);
    d.shelf_runs.forEach(([a, len, ids]) => { for (let i = a; i < a + len; i++) shelfAt[i] = ids; });
    d.kind_runs.forEach(([a, len, k]) => kindAt.fill(k, a, a + len));
    const held = i => shelfAt[Math.max(i - 1, 0)];        // a step's δ-misses fall in the stretches held after the step before
    const ps = d.per_step, pmax = Math.max(...PK);
    const KIND = { 2: { label: 'reading: a user turn or a tool response', short: 'reading', color: series(3) }, 3: { label: 'writing: assistant text', short: 'assistant text', color: series(4) },
      4: { label: 'writing: a tool call', short: 'tool call', color: series(5) }, 0: { label: 'chat template', short: 'template', color: 'var(--ink-3)' } };
    const COL = { pick: 'var(--ink)', raw: series(1), delta: series(2), band: series(0) };
    let i = 0, zoom = 'all', playing = false;
    const box = h('div'), boxK = h('div'), boxS = h('div'), ro = readout();
    const playBtn = btn('▶ play', () => toggle(), { cls: 'sm' });
    const sl = slider('step t', d.t0, d.t1 - 1, 1, d.t0, v => { stop(); go(v - d.t0); }, v => String(v));
    const swZ = seg([['all', 'all positions'], ['top', 'the newest 5 120']], zoom, v => { zoom = v; build(); }, 'positions shown');
    host.append(controls(playBtn, sl, swZ), legend([
      ['a pick (darker: more picks in the 256 positions)', COL.pick, 'box'], ['a raw miss', COL.raw, 'box'], ['a δ-miss (its stretch is on the shelf)', COL.delta, 'box'],
      ['a stretch on the shelf', COL.band, 'band'], ...[2, 3, 4, 0].map(k => [KIND[k].label, KIND[k].color, 'box'])], { cls: 'pks-legend' }),
      box, h('div', { class: 'pks-head', text: 'token kind of each step' }), boxK, h('div', { class: 'pks-head', text: 'misses per step (raw and δ)' }), boxS, ro);
    const T0 = d.t0;
    // ---------------------------------------------------------------- colours from the tokens, resolved at draw time
    const probe = document.createElement('canvas').getContext('2d');
    function rgb(token) {
      const v = getComputedStyle(host).getPropertyValue(token.replace(/^var\((.*)\)$/, '$1')).trim();
      probe.fillStyle = '#000'; probe.fillStyle = v;
      const s = probe.fillStyle;
      if (s[0] === '#') return [1, 3, 5].map(j => parseInt(s.slice(j, j + 2), 16));
      const m = s.match(/[\d.]+/g);
      if (!m) throw new Error(`raster: cannot read colour ${token}`);
      return m.slice(0, 3).map(Number);
    }
    function image(lo, hi) {                                    // bins lo … hi−1 → a data URL, one pixel per (step, bin)
      const rows = hi - lo, cv = document.createElement('canvas');
      cv.width = n; cv.height = rows;
      const ctx = cv.getContext('2d'), img = ctx.createImageData(n, rows), px = img.data;
      const ink = rgb(COL.pick), raw = rgb(COL.raw), dl = rgb(COL.delta), Lp = Math.log1p(pmax);
      for (let s = 0; s < n; s++) {
        const on = held(s);
        for (let bI = lo; bI < hi; bI++) {
          const p = PK[s * nb + bI], m = MS[s * nb + bI];
          if (!p) continue;
          const o = ((hi - 1 - bI) * n + s) * 4;               // row 0 is the top: the newest positions
          let c, a;
          if (m) { c = on && on.includes(Math.floor(bI / per)) ? dl : raw; a = 0.25 + 0.7 * Math.min(1, (m / 16) ** 0.6); }
          else { c = ink; a = 0.08 + 0.62 * Math.log1p(p) / Lp; }
          px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = Math.round(255 * a);
        }
      }
      ctx.putImageData(img, 0, 0);
      return cv.toDataURL();
    }
    let P, PKd, PS, imgEl, cur = {};
    function build() {
      box.replaceChildren(); boxK.replaceChildren(); boxS.replaceChildren();
      const lo = zoom === 'all' ? 0 : nb - 20, hi = nb;
      const narrow = narrowOf(box);
      P = Plot(box, {
        x: [T0, d.t1], y: [lo * BIN, hi * BIN], ...size(box, narrow ? 460 : 330), xn: narrow ? 4 : 7, xfmt: v => fmt(v, 0), yfmt: v => kfmt(v),
        xlabel: 'decode step t (the token being written)', ylabel: narrow ? 'position' : 'position of a pick', grid: false, m: { r: 14 },
        label: 'Raster of one layer’s picks over 600 steps: positions against steps, misses coloured, the shelf’s stretches as bands',
      });
      // stretch boundaries every 1024 positions; the shelf's stretches as a wash behind the cells and an outline above them
      for (let y = Math.ceil(lo * BIN / d.stretch_len) * d.stretch_len; y <= hi * BIN; y += d.stretch_len) {
        el('line', { x1: P.x(T0), x2: P.x(d.t1), y1: P.y(y), y2: P.y(y), style: 'stroke:var(--rule);stroke-width:1;opacity:.45' }, P.g.bg);
      }
      const outl = el('g', {}, P.g.top);
      d.shelf_runs.forEach(([a, len, ids]) => ids.forEach(id => {
        const y0 = id * d.stretch_len, y1 = y0 + d.stretch_len;
        if (y1 <= lo * BIN || y0 >= hi * BIN) return;
        // the band covers the steps whose misses it classifies: those after the step that put it on the shelf
        const s0 = a ? a + 1 : 0;
        const r = { x: P.x(T0 + s0), y: P.y(Math.min(y1, hi * BIN)), width: Math.max(0, P.x(T0 + Math.min(n, a + len + 1)) - P.x(T0 + s0)), height: P.y(Math.max(y0, lo * BIN)) - P.y(Math.min(y1, hi * BIN)) };
        el('rect', { ...r, style: `fill:${COL.band};fill-opacity:.13` }, P.g.bg);
        [r.y, r.y + r.height].forEach(yy => el('line', { x1: r.x, x2: r.x + r.width, y1: yy, y2: yy, style: `stroke:${COL.band};stroke-width:1.4;stroke-opacity:.85` }, outl));
      }));
      imgEl = el('image', { href: image(lo, hi), x: P.x(T0), y: P.y(hi * BIN), width: P.x(d.t1) - P.x(T0), height: P.y(lo * BIN) - P.y(hi * BIN), preserveAspectRatio: 'none', class: 'pks-raster-img' }, P.g.data);
      // the newest position: a pick can only be older than the token being written
      line(P, [[T0, T0], [d.t1, d.t1]], { color: 'var(--ink-3)', width: 1, dash: '3 3' });
      if (!narrow) el('text', { x: P.x(T0) + 6 * P.fs, y: P.y(T0) - 6 * P.fs, class: 'lbl', style: 'fill:var(--ink-3)', text: 'the newest position, t − 1' }, P.g.top);
      cur.raster = el('line', { y1: P.m.t, y2: P.H - P.m.b, class: 'pks-cursor' }, P.g.top);
      const hit = el('rect', { x: P.m.l, y: P.m.t, width: P.pw, height: P.ph, class: 'hit' }, P.g.top);
      hover(hit, e => {
        const [x, y] = P.toData(e), s = clamp(Math.floor(x - T0), 0, n - 1), bI = clamp(Math.floor(y / BIN), 0, nb - 1);
        const p = PK[s * nb + bI], m = MS[s * nb + bI], on = held(s), inShelf = on && on.includes(Math.floor(bI / per));
        return `<b>step ${T0 + s}</b> · positions ${fmt(bI * BIN, 0)}–${fmt(bI * BIN + BIN - 1, 0)} (stretch ${Math.floor(bI / per)}${inShelf ? ', on the shelf' : ''})<br>${p} picks, ${m} ${inShelf ? 'δ-misses' : 'misses'}<br>click to move the step here`;
      });
      hit.addEventListener('click', e => { const [x] = P.toData(e); stop(); go(clamp(Math.floor(x - T0), 0, n - 1)); });
      // token kinds
      PKd = Plot(boxK, { x: [T0, d.t1], y: [0, 1], w: P.W, h: 34, m: { l: P.m.l / P.fs, r: P.m.r / P.fs, t: 2, b: 4 }, yticks: [], xticks: [], grid: false, label: 'Token kind of each step' });
      d.kind_runs.forEach(([a, len, k]) => {
        const r = el('rect', { x: PKd.x(T0 + a), y: PKd.y(1), width: PKd.x(T0 + a + len) - PKd.x(T0 + a), height: PKd.y(0) - PKd.y(1), style: `fill:${KIND[k] ? KIND[k].color : 'var(--ink-3)'}` }, PKd.g.data);
        hover(r, () => `<b>${KIND[k] ? KIND[k].label : 'other tokens'}</b><br>steps ${T0 + a}–${T0 + a + len - 1} (${len} tokens)`);
        if (len > 70 && !narrow) el('text', { x: PKd.x(T0 + a + len / 2), y: PKd.y(0.5) + 4 * PKd.fs, 'text-anchor': 'middle', class: 'lbl', style: 'fill:var(--paper-3);paint-order:normal;stroke:none', text: KIND[k].short }, PKd.g.top);
      });
      cur.kind = el('line', { y1: PKd.m.t, y2: PKd.H - PKd.m.b, class: 'pks-cursor' }, PKd.g.top);
      // misses per step
      const mmax = Math.max(...ps.misses);
      PS = Plot(boxS, { x: [T0, d.t1], y: [0, Math.ceil(mmax / 50) * 50], w: P.W, h: 110, m: { l: P.m.l / P.fs, r: P.m.r / P.fs, t: 6, b: 26 }, yn: 3, xn: narrow ? 4 : 7, xfmt: v => fmt(v, 0), grid: 'y', label: 'Misses per step, raw and δ' });
      const xs = ps.misses.map((_, s) => T0 + s);
      area(PS, xs.map((x, s) => [x, ps.d_miss[s], ps.misses[s]]), { color: COL.raw, opacity: 0.55 });
      area(PS, xs.map((x, s) => [x, 0, ps.d_miss[s]]), { color: COL.delta, opacity: 0.55 });
      cur.spark = el('line', { y1: PS.m.t, y2: PS.H - PS.m.b, class: 'pks-cursor' }, PS.g.top);
      const hs = el('rect', { x: PS.m.l, y: PS.m.t, width: PS.pw, height: PS.ph, class: 'hit' }, PS.g.top);
      hover(hs, e => { const s = clamp(Math.round(PS.toData(e)[0] - T0), 0, n - 1); return `<b>step ${T0 + s}</b><br>${ps.misses[s]} misses: ${ps.d_miss[s]} δ, ${ps.misses[s] - ps.d_miss[s]} raw`; });
      hs.addEventListener('click', e => { stop(); go(clamp(Math.round(PS.toData(e)[0] - T0), 0, n - 1)); });
      go(i);
    }
    function go(s) {
      i = s;
      sl.set(T0 + i);
      [[cur.raster, P], [cur.kind, PKd], [cur.spark, PS]].forEach(([l, Q]) => { const xx = Q.x(T0 + i + 0.5); l.setAttribute('x1', xx); l.setAttribute('x2', xx); });
      const on = held(i), m = ps.misses[i], dm = ps.d_miss[i], k = KIND[kindAt[i]] || KIND[0];
      ro.set([
        [`step ${T0 + i}`, `${k.label}`],
        ['this step', `${ps.picks[i]} picks · ${m} misses (${pc(m / ps.picks[i])}) · ${dm} δ-misses (${m ? pc(dm / m, 0) : '—'} of the misses)`],
        ['on the shelf', `stretches ${on.join(', ')}: positions ${on.map(id => `${fmt(id * d.stretch_len, 0)}–${fmt(id * d.stretch_len + d.stretch_len - 1, 0)}`).join(', ')}`],
        ['the 600 steps', `miss rate ${pc(d.window.miss_rate)} · f_D ${fmt(d.window.f_D, 2)} (the whole layer from t = 8192: ${pc(d.whole_layer.miss_rate_t_ge_8192)}, ${fmt(d.whole_layer.f_D_t_ge_8192, 2)})`],
      ]);
    }
    // ---------------------------------------------------------------- play: about 30 steps a second, looping
    let raf = 0, last = 0;
    function frame(ts) {
      if (!playing) return;
      if (ts - last > 33) { last = ts; go((i + 1) % n); }
      raf = requestAnimationFrame(frame);
    }
    function toggle() { if (playing) stop(); else { playing = true; playBtn.innerHTML = '❚❚ pause'; playBtn.setAttribute('aria-pressed', 'true'); raf = requestAnimationFrame(frame); } }
    function stop() { playing = false; cancelAnimationFrame(raf); playBtn.innerHTML = '▶ play'; playBtn.setAttribute('aria-pressed', 'false'); }
    build();
    // the cells are a bitmap: repaint them when the theme changes
    const repaint = () => { if (imgEl) build(); };
    new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint);
  };

  // ================================================================== picksLadder — the MDL ratio, dictionary share + delta share
  FIG.picksLadder = async (host) => {
    const d = await data('bytes');
    const rows = need(d.ladder, 'bytes.ladder'), floors = need(d.floors, 'bytes.floors');
    const box = h('div'), ro = readout();
    host.append(legend([['dictionary share (bytes kept on the GPU per punnet)', SHARE.dict, 'box'], ['delta share (bytes sent per cherry)', SHARE.delta, 'box'],
      ['the floors: 0.60 at stretches of 16 384, 0.57 for a whole sequence', 'var(--ink-2)', 'dash']], { cls: 'pks-legend' }), box, ro);
    const narrow = narrowOf(box), n = rows.length, sz = size(box, (narrow ? 46 : 32) * n + 60);
    const P = Plot(box, {
      w: sz.w, h: sz.h, ycats: rows.map(r => (narrow ? '' : r.label)), x: [0, 1.08], xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], xfmt: v => fmt(v, 1),
      xlabel: 'MDL ratio = dictionary share + delta share', grid: 'x', m: narrow ? { l: 12, t: 24 } : { t: 24 },
      label: 'The MDL ratio of the campaigns’ compressors, each split into its dictionary share and its delta share',
    });
    const f = P.fs, slot = Math.abs(P.y(1) - P.y(0));
    floors.forEach(fl => vline(P, fl.ratio, '', { color: 'var(--ink-2)' }));
    el('text', { x: P.x((floors[0].ratio + floors[1].ratio) / 2), y: P.m.t - 7 * f, 'text-anchor': 'middle', class: 'lbl rule-lbl', text: 'floors 0.57 · 0.60' }, P.g.top);
    rows.forEach((r, k) => {
      const top = P.y(k) - slot / 2, bh = Math.min(narrow ? slot * 0.42 : slot * 0.62, 20 * f);
      const yb = narrow ? top + slot * 0.5 : P.y(k) - bh / 2;
      if (narrow) el('text', { x: P.m.l + 2 * f, y: top + slot * 0.36, class: 'lbl', text: r.label }, P.g.top);
      const g = el('g', {}, P.g.data);
      const x0 = P.x(0), xd = P.x(r.x), xr = P.x(r.ratio);
      if (r.y > 0) {
        if (r.x > 0) el('rect', { x: x0, y: yb, width: Math.max(0, xd - x0 - 1), height: bh, style: `fill:${SHARE.dict}` }, g);
        el('path', { d: barPath(true, yb, bh, r.x > 0 ? xd + 1 : x0, xr, 4 * f), style: `fill:${SHARE.delta}` }, g);
      } else el('path', { d: barPath(true, yb, bh, x0, xr, 4 * f), style: `fill:${SHARE.dict}` }, g);
      let txt = r.id === 'none' ? '1' : `${fmt(r.ratio, 3)}${r.x >= 0.01 && r.y >= 0.01 ? ` = ${fmt(r.x, 2)} + ${fmt(r.y, 2)}` : ''}`;
      if (xr + 6 * f + txt.length * 7.2 * f > P.W - 2 * f) txt = fmt(r.ratio, 3);     // the split goes to the tooltip where it would not fit
      el('text', { x: xr + 6 * f, y: yb + bh / 2 + 4 * f, class: 'val', text: txt }, P.g.top);
      const hit = el('rect', { x: P.m.l, y: top, width: P.pw, height: slot, class: 'pks-row-hit', tabindex: 0 }, P.g.top);
      hover(hit, () => `<b>${esc(r.label)}</b> · ${r.grade}<br>MDL ratio ${fmt(r.ratio, 4)} = dictionary share ${fmt(r.x, 4)} + delta share ${fmt(r.y, 4)}<br>${esc(r.screen)}${r.trial ? ` · trial ${r.trial}` : ''}${r.coder ? ` · compressor ${r.coder}` : ''}${r.what ? `<br>${esc(r.what)}` : ''}`);
    });
    const by = id => rows.find(r => r.id === id);
    ro.set([
      ['best verified', `${fmt(by('tree').ratio, 3)}: the reference tree keeps ${pc(by('tree').x / by('tree').ratio, 0)} of its bytes in the dictionary`],
      ['no dictionary at all', `solo ${fmt(by('solo').ratio, 3)} verified, ${fmt(by('solo-ideal').ratio, 3)} ideal`],
      ['the floors', floors.map(fl => `${fmt(fl.ratio, 2)} (${fl.grade})`).join(' · ')],
    ]);
  };
  /** Bar outline with a rounded data end and a square base (the kit's shape). */
  function barPath(horiz, c0, bw, p0, p1, r) {
    const s = p1 < p0 ? 1 : -1, c1 = c0 + bw;
    r = Math.min(r, bw / 2, Math.abs(p1 - p0));
    return horiz
      ? `M${p0} ${c0}H${p1 + s * r}Q${p1} ${c0} ${p1} ${c0 + r}V${c1 - r}Q${p1} ${c1} ${p1 + s * r} ${c1}H${p0}Z`
      : `M${c0} ${p0}V${p1 + s * r}Q${c0} ${p1} ${c0 + r} ${p1}H${c1 - r}Q${c1} ${p1} ${c1} ${p1 + s * r}V${p0}Z`;
  }

  // ================================================================== picksStretchRatio — the MDL ratio against stretch length
  FIG.picksStretchRatio = async (host) => {
    const d = await data('bytes');
    const S = need(d.by_stretch, 'bytes.by_stretch'), floors = need(d.floors, 'bytes.floors');
    const PANELS = [['c2', 'C2: cherry v[t, l, :, :], six KV layers, leash 293'], ['c1', 'C1: one head of KV layer 0 (L3), no leash']];
    const boxes = PANELS.map(() => h('div')), ro = readout();
    host.append(legend([['dictionary share', SHARE.dict, 'box'], ['delta share', SHARE.delta, 'box'], ['the MDL ratio, their sum', 'var(--ink)', 'line'],
      ['the floors 0.60 / 0.57', 'var(--ink-2)', 'dash']], { cls: 'pks-legend' }),
      h('div', { class: 'fig-row' }, PANELS.map(([, t], j) => h('div', {}, head(t), boxes[j]))), ro);
    PANELS.forEach(([key], j) => {
      const pts = S[key], box = boxes[j];
      const P = Plot(box, {
        x: [362, 46341], xlog: 2, xticks: [512, 2048, 8192, 32768], xfmt: kfmt, y: [0, 0.8], yfmt: v => fmt(v, 1), ...size(box, 330),
        xlabel: 'stretch length b (log scale)', ylabel: 'share of the raw bytes', label: `The MDL ratio of ${key.toUpperCase()} against stretch length, split into dictionary share and delta share`,
      });
      const f = P.fs, bw = Math.min(26 * f, (P.x(1024) - P.x(512)) * 0.55);
      floors.forEach(fl => hline(P, fl.ratio, '', { color: 'var(--ink-2)' }));
      el('text', { x: P.x(1448), y: P.y(floors[1].ratio) + 15 * f, 'text-anchor': 'middle', class: 'lbl rule-lbl', text: narrowOf(box) ? '0.60 / 0.57' : 'floors 0.60 / 0.57' }, P.g.top);
      pts.forEach(p => {
        const X = P.x(p.b) - bw / 2;
        el('rect', { x: X, y: P.y(p.x), width: bw, height: P.y(0) - P.y(p.x), style: `fill:${SHARE.dict}` }, P.g.data);
        el('path', { d: barPath(false, X, bw, P.y(p.x) - 1, P.y(p.ratio), 4 * f), style: `fill:${SHARE.delta}` }, P.g.data);
        el('text', { x: P.x(p.b), y: P.y(p.x / 2) + 4 * f, 'text-anchor': 'middle', class: 'val', text: fmt(p.x, 2) }, P.g.top);
        const hit = el('rect', { x: X - 4 * f, y: P.m.t, width: bw + 8 * f, height: P.ph, class: 'hit', tabindex: 0 }, P.g.top);
        hover(hit, () => `<b>${key.toUpperCase()} at stretch ${p.b}</b> · verified<br>MDL ratio ${fmt(p.ratio, 4)} = dictionary share ${fmt(p.x, 4)} + delta share ${fmt(p.y, 4)}<br>trial ${p.trial} · compressor ${p.coder}`);
      });
      line(P, pts.map(p => [p.b, p.ratio]), { color: 'var(--ink)', width: 1.8, markers: 3.4 });
      pts.forEach(p => el('text', { x: P.x(p.b), y: P.y(p.ratio) - 9 * f, 'text-anchor': 'middle', class: 'val', text: fmt(p.ratio, 3) }, P.g.top));
    });
    const sumUp = pts => `${pts.map(p => fmt(p.ratio, 3)).join(' → ')} (dictionary share ${pts.map(p => fmt(p.x, 2)).join(' / ')})`;
    ro.set([['C2, 512 → 4096 → 16 384', sumUp(S.c2)], ['C1, 512 → 4096 → 16 384 → 32 768', sumUp(S.c1)]]);
  };

  // ================================================================== picksCeiling — the most the bytes side can be worth
  FIG.picksCeiling = async (host) => {
    const G = await data('grid');
    need(G.B_range, 'grid.B_range');
    const m = BILL.missCurve(G), alpha = G.m_alpha_outside, res = need(G.hisparse_best, 'grid.hisparse_best').N;
    let r = G.solo_y;
    const boxA = h('div'), boxB = h('div'), ro = readout();
    const sl = slider(texify('ratio $\\vrho$ of a global code'), 0.4, 1, 0.005, r, v => { r = v; draw(); }, v => fmt(v, 3));
    host.append(controls(sl), legend([['N limited by the link', series(0), 'line'], ['N limited by GPU memory', series(2), 'line'], ['the best hot-cache size (their crossing)', 'var(--c)', 'dot'],
      ['N* at the best size', 'var(--ink)', 'line'], [texify(`the law $\\vN \\propto \\vrho^{-1/(1+\\valpha)}$, $\\valpha$ = ${fmt(alpha, 2)}`), 'var(--ink-2)', 'dash'],
      ['the same bounds with raw misses (ρ = 1)', 'var(--ink-3)', 'dash']], { cls: 'pks-legend' }),
      h('div', { class: 'fig-row' }, h('div', {}, head('sequences per GPU against the hot-cache size'), boxA), h('div', {}, head('the best N against the ratio of every miss'), boxB)), ro);
    const Bs = linspace(Math.log2(2048), Math.log2(12288), 120).map(u => 2 ** u);
    const rs = linspace(0.4, 1, 121);
    const Nstar = rs.map(x => BILL.best(G, m, BILL.globalCode(x)));
    const PA = Plot(boxA, {
      x: [2048, 12288], xlog: 2, xticks: [2048, 4096, 8192], xfmt: kfmt, y: [40, 260], ...size(boxA, 330),
      xlabel: 'hot-cache slots per layer B (log scale)', ylabel: 'sequences per GPU', label: 'Sequences per GPU against the hot-cache size: the link bound and the memory bound',
    });
    const PB = Plot(boxB, {
      x: [1.02, 0.38], xticks: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4], xfmt: v => fmt(v, 1), y: [110, 200], ...size(boxB, 330),
      xlabel: 'MDL ratio ρ of every miss (no per-sequence bytes)', ylabel: 'best sequences per GPU N*', label: 'Best sequences per GPU against the ratio of a global code',
    });
    // right panel, fixed: N*, the law, the landmarks
    line(PB, rs.map((x, j) => [x, Nstar[j].N]), { color: 'var(--ink)', width: 2.2 });
    line(PB, rs.map(x => [x, res * x ** (-1 / (1 + alpha))]), { color: 'var(--ink-2)', width: 1.4, dash: '5 4' });
    hline(PB, res, `resized HiSparse ${fmt(res, 0)}`, { color: 'var(--ink-3)', side: 'left', below: true });
    const marks = [[G.solo_y, 'solo, verified'], [G.solo_code_length, 'solo, ideal'], [G.floors[0], '16K floor'], [G.floors[1], 'sequence floor']];
    marks.forEach(([x, lab], j) => {
      const b = BILL.best(G, m, BILL.globalCode(x));
      mark(PB, x, b.N, 3.8, 'var(--ink-2)', `<b>${lab}</b>: ratio ${fmt(x, 3)}<br>${fmt(b.N, 1)} sequences per GPU at B = ${b.B} (${fmtS(100 * (b.N / res - 1), 1)}% over the resized cache)`);
      // the curve rises to the right: above-left and below-right of a point are empty
      el('text', { x: PB.x(x) + (j % 2 ? 7 : -7) * PB.fs, y: PB.y(b.N) + (j % 2 ? 16 : -9) * PB.fs, 'text-anchor': j % 2 ? 'start' : 'end', class: 'lbl', style: 'fill:var(--ink-3)', text: lab }, PB.g.top);
    });
    const knob = el('circle', { class: 'handle', r: 7 * PB.fs }, PB.g.top);
    draggable(knob, PB, ([x]) => { r = clamp(Math.round(x / 0.005) * 0.005, 0.4, 1); sl.set(r); draw(); }, null, { get: () => [r, 0], step: [-0.005, 0], label: 'ratio of a global code' });
    hover(knob, () => `<b>ρ = ${fmt(r, 3)}</b>: drag along the curve`);
    const gA = el('g', {}, PA.g.data), gAt = el('g', {}, PA.g.top);
    // left panel, the resized HiSparse cache for reference (r = 1)
    line(PA, Bs.map(B => [B, BILL.at(G, m, B, BILL.globalCode(1)).Nlink]), { color: series(0), width: 1.3, dash: '3 4' });
    el('text', { x: PA.x(7800), y: PA.y(BILL.at(G, m, 7800, BILL.globalCode(1)).Nlink) + 16 * PA.fs, 'text-anchor': 'start', class: 'lbl', style: 'fill:var(--ink-3)', text: 'raw misses' }, PA.g.top);
    line(PA, Bs.map(B => [B, BILL.at(G, m, B, BILL.globalCode(1)).Nhbm]), { color: series(2), width: 2.2 });
    const b1 = BILL.best(G, m, BILL.globalCode(1));
    mark(PA, b1.B, b1.N, 4.5, 'var(--ink-3)', `<b>HiSparse resized</b> (raw misses, ρ = 1)<br>${fmt(b1.N, 1)} sequences per GPU at B = ${b1.B}`, 'ring');
    function draw() {
      gA.replaceChildren(); gAt.replaceChildren();
      const p = BILL.globalCode(r), b = BILL.best(G, m, p);
      line(PA, Bs.map(B => [B, BILL.at(G, m, B, p).Nlink]), { parent: gA, color: series(0), width: 2.4 });
      line(PA, Bs.map(B => [B, BILL.at(G, m, B, p).N]), { parent: gA, color: 'var(--ink)', width: 1.2 });
      dot(gAt, PA.x(b.B), PA.y(b.N), 6 * PA.fs, 'var(--c)');
      el('text', { x: PA.x(b.B) + 9 * PA.fs, y: PA.y(b.N) - 9 * PA.fs, class: 'val', text: `B* ${b.B} · N* ${fmt(b.N, 0)}` }, gAt);
      knob.setAttribute('cx', PB.x(r)); knob.setAttribute('cy', PB.y(b.N));
      knob.setAttribute('aria-valuenow', fmt(r, 3));
      const law = res * r ** (-1 / (1 + alpha));
      ro.set([
        [`ρ = ${fmt(r, 3)}`, `N* = ${fmt(b.N, 1)} sequences per GPU at B* = ${b.B} (${b.binds === 'link' ? 'the link binds' : 'GPU memory binds'})`],
        ['over the resized cache', `${fmtS(100 * (b.N / res - 1), 1)}% (resized HiSparse ${fmt(res, 0)} at B = ${G.hisparse_best.B})`],
        ['the law predicts', `${fmt(law, 1)}: a ratio cut of ${pc(1 - r, 0)} gives ${pc(b.N / res - 1, 0)} more sequences; the best cache shrinks by ${pc(1 - b.B / G.hisparse_best.B, 0)}`],
      ]);
    }
    draw();
  };

  // ================================================================== picksStretchN — the stretch that is best for the ratio is worst for the shelf
  FIG.picksStretchN = async (host) => {
    const G = await data('grid');
    const best = need(G.best, 'grid.best'), pts = need(G.points, 'grid.points');
    const IDS = ['light', 'b10', 'b25', 'tree'], BS = [2048, 4096, 8192, 16384];
    const solo = need(G.global.find(x => Math.abs(x.ratio - G.solo_y) < 1e-3), 'grid.global solo row').N, res = G.hisparse_best.N;
    let under = 'raw';
    const box = h('div'), ro = readout();
    const sw = seg([['raw', 'raw misses sent raw'], ['solo', 'a solo code under the raw misses']], under, v => { under = v; draw(); }, 'what carries the raw misses');
    const label = id => pts.find(p => p.id === id).label;
    host.append(controls(sw), legend([...IDS.map(id => [label(id), POINT_COLOR[id], 'band']), ['the high end only (the low end leaves the measured stretches)', 'var(--ink-2)', 'ring'],
      ['solo code for every miss', 'var(--ink)', 'dash'], ['resized HiSparse', 'var(--ink-3)', 'dash']], { cls: 'pks-legend' }), box, ro);
    function draw() {
      box.replaceChildren();
      const P = Plot(box, {
        x: [1700, 19700], xlog: 2, xticks: BS, xfmt: kfmt, y: [40, 150], ...size(box, 360),
        xlabel: 'stretch length b at the Pin (log scale)', ylabel: 'best sequences per GPU',
        label: 'Best sequences per GPU at the Pin against stretch length, for four dictionary points on a shelf',
      });
      hline(P, solo, `solo code for every miss ${fmt(solo, 0)}`, { color: 'var(--ink)', dash: '6 4', side: 'right' });
      hline(P, res, '', { color: 'var(--ink-3)', dash: '6 4' });
      el('text', { x: P.x(2400), y: P.y(res) - 6 * P.fs, class: 'lbl rule-lbl', text: `resized HiSparse ${fmt(res, 0)}` }, P.g.top);
      IDS.forEach(id => {
        const c = POINT_COLOR[id], cells = BS.map(b => [b, ((best[id] || {})[b] || {})[under]]).filter(([, v]) => v);
        const both = cells.filter(([, v]) => v.low && v.high);
        if (both.length > 1) area(P, both.map(([b, v]) => [b, v.low.N, v.high.N]), { color: c, opacity: 0.22 });
        line(P, both.map(([b, v]) => [b, v.low.N]), { color: c, width: 1.6 });
        line(P, both.map(([b, v]) => [b, v.high.N]), { color: c, width: 1.6 });
        const grade = b => pts.find(p => p.id === id).at_b[b][2];
        const tip = (b, v, end) => `<b>${esc(label(id))}</b> · stretch ${b} · ${end} end of f_D<br>${fmt(v.N, 1)} sequences per GPU: best shelf n_D = ${v.n_D} (f_D ${fmt(v.f_D, 2)}, ${fmt(v.n_load, 3)} loads per step), B = ${v.B}, ${v.binds === 'link' ? 'the link binds' : 'GPU memory binds'}<br>the shares at this stretch: ${grade(b)}`;
        cells.forEach(([b, v]) => {
          if (v.low && v.high) { mark(P, b, v.low.N, 3.4, c, tip(b, v.low, 'low')); mark(P, b, v.high.N, 3.4, c, tip(b, v.high, 'high')); }
          else if (v.high) mark(P, b, v.high.N, 4, c, tip(b, v.high, 'high'), 'ring');
        });
      });
      const rng = (id, b) => { const v = ((best[id] || {})[b] || {})[under]; return v && v.low && v.high ? `${fmt(v.low.N, 0)}–${fmt(v.high.N, 0)}` : v && v.high ? `${fmt(v.high.N, 0)} (high end)` : '—'; };
      ro.set(IDS.map(id => [label(id), BS.map(b => `${kfmt(b)}: ${rng(id, b)}`).join(' · ')]));
    }
    draw();
  };

  // ================================================================== picksExplorer — the napkin, any point, stretch and shelf
  FIG.picksExplorer = async (host) => {
    const G = await data('grid');
    const pts = need(G.points, 'grid.points'), cells = need(G.cells, 'grid.cells'), m = BILL.missCurve(G);
    const BS = [2048, 4096, 8192, 16384, 32768], NDS = [1, 2, 4, 8, 16, 32];
    const hs = BILL.best(G, m, { x: 0, y: 1, b: 0, nD: 0, fD: 0, nload: 0, rhoRaw: 1 });
    const S = { pt: 'light', b: 4096, nD: 4, end: 'low', under: 'raw' };
    const SHORT = { light: 'light', b02: 'share ≤ 0.02', b10: 'share ≤ 0.10', b25: 'share ≤ 0.25', free: 'no limit', tree: 'tree' };
    const box = h('div'), ro = readout(), bars = h('div', { class: 'pks-bars' }), msg = note('');
    const kp = { N: kpi('sequences per GPU', '—', ''), B: kpi('best hot-cache size', '—', ''), vs: kpi('against resized HiSparse', '—', '') };
    const ctl = (lab, s) => controls(h('span', { class: 'pks-head', text: lab }), s);
    const sP = seg(pts.map(p => [p.id, SHORT[p.id]]), S.pt, v => { S.pt = v; draw(); }, 'compressor point');
    const sB = seg(BS.map(b => [b, kfmt(b)]), S.b, v => { S.b = v; draw(); }, 'stretch length');
    const sN = seg(NDS.map(n => [n, String(n)]), S.nD, v => { S.nD = v; draw(); }, 'dictionaries on the shelf');
    const sE = seg([['low', 'low end'], ['high', 'high end']], S.end, v => { S.end = v; draw(); }, 'end of the extrapolated δ-miss fraction');
    const sU = seg([['raw', 'sent raw'], ['solo', 'solo-coded']], S.under, v => { S.under = v; draw(); }, 'raw misses');
    const bestBtn = btn('best n_D here', () => {
      let top = null;
      NDS.forEach(nD => { const r = run({ ...S, nD }); if (r.ok && (!top || r.best.N > top.N)) top = { nD, N: r.best.N }; });
      if (top) { S.nD = top.nD; sN.set(top.nD); draw(); }
    }, { cls: 'sm' });
    host.append(ctl('compressor', sP), ctl('stretch b', sB), controls(h('span', { class: 'pks-head', text: 'shelf n_D' }), sN, bestBtn), ctl('f_D at the Pin', sE), ctl('raw misses', sU),
      h('div', { class: 'kpis' }, kp.N, kp.B, kp.vs), legend([['N limited by the link', series(0), 'line'], ['N limited by GPU memory', series(2), 'line'], ['N, the smaller of the two', 'var(--ink)', 'line'],
        ['the best hot-cache size', 'var(--c)', 'dot'], ['resized HiSparse', 'var(--ink-3)', 'dash']], { cls: 'pks-legend' }), box, msg, bars, ro);
    function run(s) {
      const p = pts.find(q => q.id === s.pt), at = p.at_b[s.b], cell = (cells[s.b] || {})[s.nD];
      if (!at) return { ok: false, why: `${p.label}: no measured shares at stretch ${s.b}` };
      const fD = cell ? cell[`f_D_${s.end}`] : null;
      if (!cell || fD == null) return { ok: false, why: `not measured at this stretch length: ${cell ? esc(cell.note) : 'no cell'}` };
      const q = { x: at[0], y: at[1], b: s.b, nD: s.nD, fD, nload: cell[`n_load_${s.end}`], rhoRaw: s.under === 'solo' ? G.solo_y : 1 };
      return { ok: true, p, at, cell, q, best: BILL.best(G, m, q) };
    }
    function draw() {
      box.replaceChildren(); bars.replaceChildren();
      const r = run(S);
      const P = Plot(box, {
        x: [2048, 16384], xlog: 2, xticks: [2048, 4096, 8192, 16384], xfmt: kfmt, y: [0, 260], ...size(box, 320),
        xlabel: 'hot-cache slots per layer B (log scale)', ylabel: 'sequences per GPU', label: 'Sequences per GPU against the hot-cache size for the chosen design',
      });
      hline(P, hs.N, `resized HiSparse ${fmt(hs.N, 1)}`, { color: 'var(--ink-3)', dash: '6 4', side: 'left' });
      if (!r.ok) {
        msg.innerHTML = r.why;
        [kp.N, kp.B, kp.vs].forEach(k => k.set('—', 'not measured'));
        ro.set([['this cell', r.why]]);
        return;
      }
      msg.innerHTML = `${esc(r.p.label)} at stretch ${S.b}: dictionary share ${fmt(r.at[0], 3)}, delta share ${fmt(r.at[1], 3)} (${r.at[2]}); f_D ${fmt(r.q.fD, 2)} and ${fmt(r.q.nload, 3)} loads per step at the Pin (${r.cell.grade}); a dictionary weighs ${fmt(r.at[0] * S.b, 0)} cherries’ worth.`;
      const Bs = linspace(11, 14, 90).map(u => 2 ** u);
      const curve = Bs.map(B => BILL.at(G, m, B, r.q));
      line(P, curve.map(c => [c.B, c.Nlink]), { color: series(0), width: 2, name: 'link bound' });
      line(P, curve.map(c => [c.B, c.Nhbm]), { color: series(2), width: 2, name: 'memory bound' });
      line(P, curve.map(c => [c.B, c.N]), { color: 'var(--ink)', width: 1.2 });
      crosshair(P, { xname: 'B =', xfmt: v => fmt(v, 0), yfmt: v => fmt(v, 1) });
      const b = r.best;
      mark(P, b.B, b.N, 6, 'var(--c)', `<b>the best hot-cache size</b>: B = ${b.B}<br>${fmt(b.N, 1)} sequences per GPU (${b.binds === 'link' ? 'the link binds' : 'GPU memory binds'})`);
      kp.N.set(fmt(b.N, 1), b.binds === 'link' ? 'the link binds' : 'GPU memory binds');
      kp.B.set(String(b.B), `slots per layer (HiSparse resized: ${hs.B})`);
      kp.vs.set(`${fmtS(100 * (b.N / hs.N - 1), 1)}%`, `resized HiSparse ${fmt(hs.N, 1)}`);
      // the two bills at the best B, against resized HiSparse
      const maxT = Math.max(b.T, hs.T), maxM = Math.max(b.M, hs.M);
      bars.append(head('link bytes per sequence per step'), stackRows([
        { label: 'resized HiSparse', parts: [{ v: hs.parts.raw, color: series(1), name: 'raw misses' }], value: MB(hs.T) },
        { label: 'this design', parts: [{ v: b.parts.delta, color: series(0), name: 'δ-misses (deltas)' }, { v: b.parts.raw, color: series(1), name: S.under === 'solo' ? 'raw misses, solo-coded' : 'raw misses' }, { v: b.parts.loads, color: series(3), name: 'dictionary loads' }], value: MB(b.T) },
      ], maxT), head('GPU memory per sequence'), stackRows([
        { label: 'resized HiSparse', parts: [{ v: hs.mem.hot, color: series(2), name: 'hot cache' }], value: MB(hs.M) },
        { label: 'this design', parts: [{ v: b.mem.hot, color: series(2), name: 'hot cache' }, { v: b.mem.dict, color: series(4), name: 'dictionaries on the shelf' }], value: MB(b.M) },
      ], maxM));
      ro.set([
        ['link bytes per step', `δ-misses ${MB(b.parts.delta)} · raw misses ${MB(b.parts.raw)} · loads ${MB(b.parts.loads)} = ${MB(b.T)}`],
        ['GPU memory', `hot cache ${MB(b.mem.hot)} · ${S.nD} dictionaries ${MB(b.mem.dict)} = ${MB(b.M)}`],
        ['miss rate at B*', `${pc(b.m)} (HiSparse’s curve)`],
      ]);
    }
    function stackRows(rows, max) {
      const wrap = h('div', { class: 'pks-stack-rows' });
      rows.forEach(rw => {
        const track = h('span', { class: 'pks-track' });
        rw.parts.forEach(pt => {
          if (!(pt.v > 0)) return;
          const sg = h('span', { class: 'pks-seg', style: `width:${(100 * pt.v / max).toFixed(2)}%;background:${pt.color}` });
          hover(sg, () => `<b>${pt.name}</b><br>${MB(pt.v)}`);
          track.append(sg);
        });
        wrap.append(h('div', { class: 'pks-srow' }, h('span', { class: 'pks-slabel', html: rw.label }), track, h('span', { class: 'pks-sval', html: rw.value })));
      });
      return wrap;
    }
    draw();
  };
})();
