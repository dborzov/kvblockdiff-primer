/* =====================================================================
   figures/picks.js — Part XI, "The Bachelor: picks and misses, measured" (content/11-picks). See
   docs/site/figures.md.
   Builders: picksNapkin (two figures), picksMass, picksReuse, picksLayers, picksCollapse, picksHeavy,
   picksShelf, picksShelfScaling, picksNoise.
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
    const swB = seg([[4096, 'b = 4096'], [1024, 'b = 1024']], pinB, v => { pinB = v; draw(); }, 'the Pin’s stretch length');
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
        pinRows.filter(x => x[0] === pinB).forEach(([b, n, cov, lo, hi, nl, nlf]) => {
          vrange(P, cov, lo, hi, PINC, 6.5, `<b>the Pin at 100K: n_D = ${n} × b = ${b}</b> · extrapolated<br>coverage ${fmt(cov, 3)} · f_D ${fmt(lo, 2)}–${fmt(hi, 2)} (exponent ${d.pin_beta[pol].join('–')})<br>net loads per step ${fmt(nl, 2)} at the low end, ${fmt(nlf, 2)} at the high end`, 6);
          el('text', { x: P.x(cov) + 13 * f, y: P.y(lo) + 4 * f, class: 'lbl', style: 'fill:var(--ink-2)', text: `${n} × ${b}` }, P.g.top);
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
      ['the Pin at 100K (against b / t: one value; at the fitted exponent: its range)', 'var(--ink-2)', 'pill']], { cls: 'pks-legend' }), box, ro, nt);
    function draw() {
      box.replaceChildren();
      const R = rule[pol], beta = mode === 'b' ? 0 : mode === 'bt' ? 1 : R.beta;
      const X = (b, t) => (mode === 'b' ? b : b * Math.pow(Lpin / t, beta));
      const my = rows[pol].filter(r => r[1] === nD).sort((a, b) => a[0] - b[0]);
      const xs = my.flatMap(r => T.map(t => X(r[0], t))).concat(mode === 'b' ? [] : [1024, 4096]), narrow = narrowOf(box);
      const scaled = `b · (100K / t)${mode === 'fit' ? `^${fmt(beta, 2)}` : ''}`;
      const P = Plot(box, {
        x: [Math.min(...xs) / 1.35, Math.max(...xs) * 1.35], xlog: 2, xfmt: kfmt, y: [0, 1.04], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yfmt: v => fmt(v, 1), ...size(box, 340),
        xlabel: mode === 'b' ? 'stretch length b (log scale)' : narrow ? `${scaled} (log scale)` : `${scaled}: the stretch at the Pin’s 100K a cell stands for`,
        ylabel: 'δ-miss fraction f_D',
        label: `δ-miss fraction per time bin at the Pin's share, n_D = ${nD}, against ${mode === 'b' ? 'the stretch length' : 'the stretch length scaled by the context'}`,
      });
      if (mode !== 'b') {
        [[1024, 'top'], [4096, 'bottom']].forEach(([b, pos]) => vline(P, b, narrow ? `b = ${b}` : `the Pin’s b = ${b}`, { color: 'var(--ink-3)', pos, side: 'right' }));
        pin[pol].filter(x => x[1] === nD).forEach(([b, n, lo, hi, sf]) => {
          const tip = `<b>the Pin at 100K: n_D = ${n} × b = ${b}</b> · extrapolated<br>${mode === 'bt' ? `against b / t: f_D ${fmt(sf, 2)}` : `f_D ${fmt(lo, 2)}–${fmt(hi, 2)} for exponents ${R.beta_range.join('–')}`}`;
          if (mode === 'bt') mark(P, b, sf, 4.5, 'var(--ink-2)', tip, 'dot');
          else vrange(P, b, lo, hi, 'var(--ink-2)', 6.5, tip);
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
        [`the Pin, n_D = ${nD}`, pin[pol].filter(x => x[1] === nD).sort((a, b) => b[0] - a[0]).map(([b, , lo, hi]) => `b ${b}: f_D ${fmt(lo, 2)}–${fmt(hi, 2)}`).join(' · ')],
      ]);
      nt.innerHTML = mode === 'b' ? 'Each line is one time bin; against b the bins stack: f_D at a fixed shelf falls as the context grows.'
        : `x is the stretch length at the Pin’s 100K context that a cell of the Bachelor stands for, b · (100K / t)${mode === 'fit' ? `<sup>${fmt(beta, 2)}</sup>` : ''}, proportional to b / t${mode === 'fit' ? `<sup>${fmt(beta, 2)}</sup>` : ''}; the Pin’s own stretches are the two dashed lines.`;
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

})();
