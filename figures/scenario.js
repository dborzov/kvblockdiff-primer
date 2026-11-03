/* =====================================================================
   figures/scenario.js — Part IV "The scenario" (content/04-scenario).
   Builders: scnAskAnswer (01), scnStretchKnob (02), scnSliceDice (03),
   scnCherryShapes (04), scnPunnet (05), scnContract (06), scnScoreSquare (07),
   scnLeash (08), scnScopeCost (09).
   Colours: CSS variables only; brand colours of glossary terms are var(--t-<id>).
   Measured numbers are read at runtime from figures/data/measured-*.json; toy
   data come from seeded generators, so the prose and the figures agree.
   ===================================================================== */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------ shared helpers
  const T = id => `var(--t-${id})`;                       // brand colour of a glossary term
  const tint = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const isNarrow = host => (host.getBoundingClientRect().width || 640) < 540;
  /** 49152 → "49 152" (thin spaces), the way the prose writes big counts. */
  const big = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const B = n => `${big(n)} B`;
  const code = s => `<code>${esc(s)}</code>`;
  const sub = txt => h('p', { class: 'fig-note', html: txt });

  // the Bench's value tensor: v.shape == (n_tokens, n_kv_layers, n_kv_heads, head_dim), one byte per element
  const BENCH = { tokens: 225000, layers: 6, heads: 2, dim: 256 };
  const STRETCH = 4096;
  // the three cherry shapes of the campaigns; `split` is the experiment repository's name for each
  const SHAPES = {
    head: { code: 'v[t, l, h, :]', bytes: 256, perTok: 12, name: 'one head’s vector' },
    layer: { code: 'v[t, l, :, :]', bytes: 512, perTok: 6, name: 'one layer, both heads' },
    token: { code: 'v[t, :, :, :]', bytes: 3072, perTok: 1, name: 'every KV layer' },
  };
  const SHAPE_IDX = { head: 0, layer: 1, token: 2, other: 3 };
  const shapeKey = s => (s in SHAPES ? s : 'other');
  const shapeColor = s => series(SHAPE_IDX[shapeKey(s)]);
  const shapeCode = s => (s in SHAPES ? SHAPES[s].code : s);
  const SHAPE_LABEL = { head: 'cherry v[t, l, h, :] · 256 B', layer: 'cherry v[t, l, :, :] · 512 B', token: 'cherry v[t, :, :, :] · 3072 B', other: 'other shapes (pair, triple, regime, column, tok8)' };
  const shapeLegend = (keys = ['head', 'layer', 'token', 'other'], shape = 'dot') => keys.map(k => [SHAPE_LABEL[k], shapeColor(k), shape]);

  function rect(g, x, y, w, hh, o = {}) {
    const st = [`fill:${o.fill || 'var(--paper-3)'}`, `stroke:${o.stroke || 'var(--rule)'}`, `stroke-width:${o.sw == null ? 1.2 : o.sw}`];
    if (o.dash) st.push(`stroke-dasharray:${o.dash}`);
    if (o.op != null) st.push(`opacity:${o.op}`);
    return el('rect', { x, y, width: Math.max(0, w), height: Math.max(0, hh), rx: o.rx == null ? 5 : o.rx, style: st.join(';'), class: o.cls || null }, g);
  }
  function poly(g, pts, o = {}) {
    const st = [`fill:${o.fill || 'var(--paper-3)'}`, `stroke:${o.stroke || 'var(--rule)'}`, `stroke-width:${o.sw == null ? 1.2 : o.sw}`, 'stroke-linejoin:round'];
    if (o.op != null) st.push(`opacity:${o.op}`);
    return el('polygon', { points: pts.map(p => p.join(',')).join(' '), style: st.join(';'), class: o.cls || null }, g);
  }
  function txt(g, x, y, s, o = {}) {
    return svgText(g, x, y, s, { class: o.cls || 'lbl', 'text-anchor': o.anchor || 'middle', style: o.style || null, transform: o.transform || null });
  }
  function arrowPath(g, d, color, o = {}) {
    const id = uid('ah');
    const m = el('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, g);
    el('path', { d: 'M0,0 L10,5 L0,10 z', style: `fill:${color}` }, m);
    return el('path', { d, style: `fill:none;stroke:${color};stroke-width:${o.w || 2};${o.dash ? 'stroke-dasharray:' + o.dash + ';' : ''}stroke-linecap:round`, 'marker-end': `url(#${id})` }, g);
  }
  /** A paint server of thin vertical ticks every `step` px: many cells drawn as one rect. */
  function ticksPattern(defs, step, color, hh = 40) {
    const id = uid('tk');
    const p = el('pattern', { id, width: step, height: hh, patternUnits: 'userSpaceOnUse' }, defs);
    el('line', { x1: 0, y1: 0, x2: 0, y2: hh, style: `stroke:${color};stroke-width:.7` }, p);
    return `url(#${id})`;
  }
  /** A small book: the dictionary the receiver holds. */
  function book(g, x, y, w, hh, color) {
    rect(g, x, y, w, hh, { fill: tint(color, 22), stroke: color, rx: 3, sw: 1.4 });
    el('line', { x1: x + 7, y1: y, x2: x + 7, y2: y + hh, style: `stroke:${color};stroke-width:1.4` }, g);
    for (let i = 1; i <= 3; i++) el('line', { x1: x + 13, y1: y + i * hh / 4, x2: x + w - 6, y2: y + i * hh / 4, style: `stroke:${color};stroke-width:1;opacity:.55` }, g);
  }

  // ------------------------------------------------------------ data (fails loudly)
  async function data(name) {
    const url = (window.KV && KV.prefix ? KV.prefix : '/') + 'assets/figs/data/measured-' + name + '.json';
    const r = await fetch(url);
    if (!r.ok) throw new Error(`could not load measured-${name}.json (${r.status})`);
    return r.json();
  }
  function need(v, what) { if (v == null) throw new Error(`measured data: missing ${what}`); return v; }
  function num(v, what) { need(v, what); if (!Number.isFinite(+v)) throw new Error(`measured data: ${what} is not a number`); return +v; }
  const fb = (r, d = 2) => `${fmt(8 * r, d)} bits`;
  const readsOf = p => (p && p.reads ? `worst-cherry reads ${fmt(p.reads.max, 0)} · mean ${fmt(p.reads.mean, 0)}${p.reads.p99 != null ? ` · p99 ${fmt(p.reads.p99, 0)}` : ''}` : 'reads not in the records');
  /** The prose form of a scenario, from a record of the campaigns. */
  const scenarioOf = p => `V (${esc(p.layers || 'all six')}) · cherry ${shapeCode(p.split)}${shapeKey(p.split) === 'other' ? ` (${esc(p.split)})` : ''} · stretch ${big(p.b)} · ${p.budget ? `leash ${big(p.budget)}` : 'no leash'}`;

  // =================================================================== IV.1
  // FIG.scnAskAnswer — sender with the orchard, receiver with a dictionary, one delta per ask.
  FIG.scnAskAnswer = function (host) {
    const CHERRY = 512, SHARE = 0.11, DELTA = Math.ceil(SHARE * CHERRY);   // 57 B: the campaigns' best delta share, assumed
    const ROWS = 36;                                                        // token rows drawn (each stands for ~6 250 positions)
    let r = rng('scn-ask'), asks = [];
    const box = h('div'), ro = readout();
    const askBtn = btn('Ask for another cherry', () => ask());
    host.append(controls(askBtn, btn('Reset', () => { r = rng('scn-ask'); asks = []; draw(); }, { cls: 'sm' })), box, ro,
      sub('Click the sender’s box or the button to ask. Illustrative sizes: a 512-byte cherry <code>v[t, l, :, :]</code> and a delta assumed at 0.11 of it, the campaigns’ best delta share.'));
    const narrow = isNarrow(host);
    const W = narrow ? 380 : 640, H = narrow ? 600 : 334;
    const D = Diagram(box, { w: W, h: H, label: 'A sender holding the orchard answers a receiver’s ask with one delta' });
    const g = el('g', {}, D.svg);
    const S = narrow ? { x: 12, y: 14, w: 356, h: 282 } : { x: 12, y: 14, w: 268, h: 306 };            // sender box
    const R = narrow ? { x: 12, y: 428, w: 356, h: 160 } : { x: 392, y: 14, w: 236, h: 306 };          // receiver box
    const O = { x: S.x + (narrow ? 60 : 56), y: S.y + 62, cw: narrow ? 9 : 8, rh: 5.4, dx: 16, dy: -11 };  // the orchard box
    O.w = O.cw * BENCH.layers * BENCH.heads; O.h = O.rh * ROWS;

    function ask() {
      const pos = r.int(BENCH.tokens), layer = r.int(BENCH.layers);
      asks.push({ pos, layer, row: Math.floor(pos / BENCH.tokens * ROWS) });
      draw();
    }
    function draw() {
      g.replaceChildren();
      const cur = asks[asks.length - 1];
      // ---- sender
      rect(g, S.x, S.y, S.w, S.h, { fill: tint(T('orchard'), 5), stroke: 'var(--rule)', rx: 10 });
      txt(g, S.x + 12, S.y + 20, 'sender · host memory', { anchor: 'start' });
      txt(g, S.x + 12, S.y + 36, 'the orchard, one sequence', { anchor: 'start', cls: 'annot' });
      // the orchard: a tall thin box (token axis down, layers × heads across, elements receding)
      const { x, y, w, h: hh, cw, rh, dx, dy } = O;
      poly(g, [[x + w, y], [x + w + dx, y + dy], [x + w + dx, y + hh + dy], [x + w, y + hh]], { fill: tint(T('orchard'), 30), stroke: T('orchard'), sw: 1 });
      poly(g, [[x, y], [x + dx, y + dy], [x + w + dx, y + dy], [x + w, y]], { fill: tint(T('orchard'), 18), stroke: T('orchard'), sw: 1 });
      rect(g, x, y, w, hh, { fill: tint(T('orchard'), 10), stroke: T('orchard'), rx: 0, sw: 1 });
      for (let c = 1; c < BENCH.layers * BENCH.heads; c++) el('line', { x1: x + c * cw, y1: y, x2: x + c * cw, y2: y + hh, style: `stroke:${T('orchard')};stroke-width:${c % 2 ? 0.35 : 0.9};opacity:${c % 2 ? 0.5 : 0.8}` }, g);
      for (let rr = 1; rr < ROWS; rr++) el('line', { x1: x, y1: y + rr * rh, x2: x + w, y2: y + rr * rh, style: `stroke:${T('orchard')};stroke-width:.3;opacity:.45` }, g);
      // earlier asks, faintly; the current one bright
      asks.forEach((a, i) => {
        const last = i === asks.length - 1;
        rect(g, x + a.layer * 2 * cw, y + a.row * rh, 2 * cw, rh, { fill: last ? T('cherry') : tint(T('cherry'), 45), stroke: last ? 'var(--ink)' : 'none', rx: 0, sw: 1.2 });
      });
      // axis labels
      arrowPath(g, `M${x - 10} ${y + 4} V${y + hh - 4}`, 'var(--ink-3)', { w: 1 });
      txt(g, x - 16, y + hh / 2, 'token_pos_id', { cls: 'val', transform: `rotate(-90 ${x - 16} ${y + hh / 2})`, style: 'fill:var(--ink-2)' });
      arrowPath(g, `M${x + 2} ${y + hh + 9} H${x + w - 2}`, 'var(--ink-3)', { w: 1 });
      txt(g, x + w / 2, y + hh + 23, 'layer_id 0 … 5', { cls: 'val', style: 'fill:var(--ink-2)' });
      txt(g, S.x + 12, y + hh + 37, 'head_id 0, 1 inside each layer', { anchor: 'start', cls: 'val', style: 'fill:var(--ink-3)' });
      arrowPath(g, `M${x + w + 3} ${y - 3} L${x + w + dx + 1} ${y + dy - 3}`, 'var(--ink-3)', { w: 1 });
      txt(g, x + w + dx + 6, y + dy - 2, 'elem_id', { anchor: 'start', cls: 'val', style: 'fill:var(--ink-2)' });
      txt(g, x + w + dx + 6, y + dy + 12, '0 … 255', { anchor: 'start', cls: 'val', style: 'fill:var(--ink-3)' });
      // ---- receiver
      rect(g, R.x, R.y, R.w, R.h, { fill: tint(T('dictionary'), 5), stroke: 'var(--rule)', rx: 10 });
      txt(g, R.x + 12, R.y + 20, 'receiver · GPU', { anchor: 'start' });
      const bx = R.x + 16, by = R.y + 44;
      book(g, bx, by, 52, 64, T('dictionary'));
      txt(g, bx + 62, by + 24, 'dictionary', { anchor: 'start', cls: 'lbl' });
      txt(g, bx + 62, by + 40, 'held before any ask', { anchor: 'start', cls: 'annot' });
      const sy = by + 92;
      txt(g, R.x + 16, sy - 6, 'cherry rebuilt', { anchor: 'start', cls: 'lbl' });
      rect(g, R.x + 16, sy, 52, 18, { fill: cur ? T('cherry') : 'none', stroke: cur ? 'var(--ink)' : tint('var(--ink-3)', 60), dash: cur ? null : '3 3', rx: 2 });
      txt(g, R.x + 78, sy + 13, cur ? `bit for bit ✓ · ${B(CHERRY)}` : 'nothing asked yet', { anchor: 'start', cls: 'val', style: 'fill:var(--ink-2)' });
      // ---- the arrow: one delta
      const ax1 = narrow ? W / 2 : S.x + S.w + 6, ay1 = narrow ? S.y + S.h + 6 : S.y + 120;
      const ax2 = narrow ? W / 2 : R.x - 6, ay2 = narrow ? R.y - 6 : ay1;
      arrowPath(g, `M${ax1} ${ay1} L${ax2} ${ay2}`, cur ? T('delta') : 'var(--ink-3)', { w: cur ? 2.4 : 1.6, dash: cur ? null : '4 4' });
      const lx = narrow ? W / 2 + 10 : (ax1 + ax2) / 2, ly = narrow ? (ay1 + ay2) / 2 : ay1 - 14;
      txt(g, lx, ly, cur ? 'one delta' : 'an ask', { anchor: narrow ? 'start' : 'middle', cls: 'lbl' });
      if (cur) txt(g, lx, ly + 14, `${B(DELTA)} for cherry (${big(cur.pos)}, ${cur.layer}, :, :)`, { anchor: narrow ? 'start' : 'middle', cls: 'val', style: 'fill:var(--ink-2)' });
      // size bars under the arrow: raw cherry against the delta
      const bw = narrow ? 150 : 96, bx0 = narrow ? W / 2 - 170 : (ax1 + ax2) / 2 - bw / 2, by0 = narrow ? (ay1 + ay2) / 2 + 24 : ay1 + 36;
      txt(g, bx0, by0 - 4, 'raw cherry', { anchor: 'start', cls: 'annot' });
      rect(g, bx0, by0, bw, 8, { fill: tint('var(--ink-3)', 35), stroke: 'none', rx: 2 });
      txt(g, bx0 + bw + 4, by0 + 8, B(CHERRY), { anchor: 'start', cls: 'val', style: 'fill:var(--ink-3)' });
      txt(g, bx0, by0 + 26, 'delta', { anchor: 'start', cls: 'annot' });
      rect(g, bx0, by0 + 30, bw * DELTA / CHERRY, 8, { fill: T('delta'), stroke: 'none', rx: 2 });
      txt(g, bx0 + bw * DELTA / CHERRY + 4, by0 + 38, B(DELTA), { anchor: 'start', cls: 'val', style: 'fill:var(--ink-2)' });
      // click or key on the sender box asks
      const hit = rect(g, S.x, S.y, S.w, S.h, { fill: 'transparent', stroke: 'none', rx: 10, cls: 'hit scn-hit' });
      hit.setAttribute('tabindex', '0'); hit.setAttribute('role', 'button'); hit.setAttribute('aria-label', 'ask for another cherry');
      hit.addEventListener('click', ask);
      hit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ask(); } });
      const n = asks.length;
      ro.set([
        ['asked', cur ? `v[${big(cur.pos)}, ${cur.layer}, :, :]` : '—'],
        ['raw cherry', B(CHERRY)], ['delta', `${B(DELTA)} (0.11 ×)`], ['asks', String(n)],
        ['raw so far', B(n * CHERRY)], ['sent so far', B(n * DELTA)],
      ]);
    }
    draw();
  };

  // =================================================================== IV.2
  // FIG.scnStretchKnob — one toy sequence of 32 token positions cut into stretches; pick a position, read off its stretch_id.
  FIG.scnStretchKnob = function (host) {
    const L = 32;
    let b = 4, t = 13;
    const BS = [1, 2, 4, 8, 16, 32];
    const box = h('div'), ro = readout();
    const bSeg = seg(BS.map(v => [v, String(v)]), b, v => { b = v; draw(); }, 'stretch_len');
    const tSl = slider('<code>token_pos_id</code>', 0, L - 1, 1, t, v => { t = v; draw(); });
    host.append(controls(h('span', { class: 'scn-ctl-lab', html: '<code>stretch_len</code>' }), bSeg, tSl), box, ro);
    const narrow = isNarrow(host);
    const per = 16, rows = L / per;
    const W = narrow ? 380 : 680, tw = narrow ? 20 : 36, gap = narrow ? 2.2 : 4, x0 = 12;
    const rowH = narrow ? 92 : 100;
    const D = Diagram(box, { w: W, h: rows * rowH + 10, label: 'A sequence of 32 token positions cut into stretches' });
    const g = el('g', {}, D.svg);
    function draw() {
      g.replaceChildren();
      const j = Math.floor(t / b);
      for (let r = 0; r < rows; r++) {
        const y = 30 + r * rowH;
        // stretch frames on this row
        for (let s = r * per; s < (r + 1) * per; s += 1) {
          if (s % b === 0 || s === r * per) {
            const jj = Math.floor(s / b), end = Math.min((jj + 1) * b, (r + 1) * per);
            const xa = x0 + (s - r * per) * (tw + gap), xb = x0 + (end - r * per) * (tw + gap) - gap;
            const on = jj === j;
            rect(g, xa - 1.5, y - 4, xb - xa + 3, narrow ? 34 : 40, { fill: on ? tint(T('stretch'), 26) : 'none', stroke: on ? T('stretch') : tint('var(--ink-3)', 55), dash: on ? null : '3 3', rx: 4, sw: on ? 1.8 : 1 });
            if (s % b === 0 && (b >= 2 || !narrow || jj % 4 === 0 || on)) txt(g, xa + 1, y + (narrow ? 46 : 54), b >= 8 || (r === 0 && jj === 0) ? `stretch_id=${jj}` : String(jj), { anchor: 'start', cls: 'val', style: on ? 'fill:var(--ink)' : 'fill:var(--ink-3)' });
            s = end - 1;
          }
        }
        for (let c = 0; c < per; c++) {
          const s = r * per + c, x = x0 + c * (tw + gap), on = s === t;
          rect(g, x, y, tw, narrow ? 26 : 32, { fill: on ? 'var(--c)' : tint(T('orchard'), 22), stroke: on ? 'var(--c)' : tint(T('orchard'), 70), rx: 3 });
          el('text', { x: x + tw / 2, y: y + (narrow ? 17 : 21), 'text-anchor': 'middle', class: 'val', style: on ? 'fill:var(--paper-3);stroke:none' : null, text: String(s) }, g);
          const hit = rect(g, x, y, tw, narrow ? 26 : 32, { fill: 'transparent', stroke: 'none', cls: 'hit' });
          hit.style.cursor = 'pointer';
          hit.addEventListener('click', () => { t = s; tSl.set(t); draw(); });
        }
        txt(g, x0, y - 12, r === 0 ? `token positions ${r * per}–${(r + 1) * per - 1}` : `token positions ${r * per}–${(r + 1) * per - 1} (continued)`, { anchor: 'start', cls: 'lbl' });
      }
      ro.set([['token_pos_id', String(t)], ['stretch_len', String(b)], ['stretch_id = token_pos_id // stretch_len', String(j)],
        ['place in its stretch', `${t - j * b} of ${b}`], ['stretches in the sequence', String(Math.ceil(L / b))]]);
    }
    draw();
  };

  // =================================================================== IV.3
  // FIG.scnSliceDice — the Bench's value tensor, one stretch, a slice, and a cherry cut from it.
  FIG.scnSliceDice = function (host) {
    const NROWS = BENCH.layers * BENCH.heads;                 // 12 (layer, head) rows on the front face
    const SLICES = {
      all: { label: 'all values', code: 'v[:, :, :, :]', rows: range(NROWS), shapes: ['head', 'layer', 'token'] },
      l0h0: { label: 'one layer and head', code: 'v[:, 0, 0, :]', rows: [0], shapes: ['head'] },
      l13h0: { label: 'two layers of one head', code: 'v[:, [1, 3], 0, :]', rows: [2, 6], shapes: ['head', 'layer'] },
    };
    let slice = 'all', shape = 'layer';
    const cherryRows = () => {                                // the rows one cherry spans, for the outline
      const rows = SLICES[slice].rows;
      if (shape === 'token') return rows;
      if (shape === 'layer') return slice === 'all' ? [2, 3] : rows;
      return [rows[0]];
    };
    const box = h('div'), ro = readout(), shapeSlot = h('span');
    const sliceSeg = seg(Object.entries(SLICES).map(([k, s]) => [k, `${s.label} <code>${s.code}</code>`]), slice, v => { slice = v; if (!SLICES[v].shapes.includes(shape)) shape = SLICES[v].shapes[0]; shapeSeg(); draw(); }, 'slice');
    function shapeSeg() {
      shapeSlot.replaceChildren(h('span', { class: 'scn-ctl-lab', text: 'cherry shape' }),
        seg(SLICES[slice].shapes.map(k => [k, `<code>${SHAPES[k].code}</code>`]), shape, v => { shape = v; draw(); }, 'cherry shape'));
    }
    shapeSeg();
    host.append(controls(h('span', { class: 'scn-ctl-lab', text: 'slice' }), sliceSeg), controls(shapeSlot), box, ro,
      sub('Real sizes, one byte per element. The stretch band is drawn wider than its 1.8 % of the token axis so it can be seen.'));
    const narrow = isNarrow(host);
    const W = narrow ? 380 : 640, H = 336;
    const D = Diagram(box, { w: W, h: H, label: 'The value tensor of one sequence on the Bench, with a stretch, a slice and a cherry marked' });
    const g = el('g', {}, D.svg);
    const F = { x: narrow ? 64 : 92, y: 92, w: narrow ? 250 : 440, rh: narrow ? 13 : 14, dx: narrow ? 34 : 44, dy: narrow ? -24 : -30 };
    F.h = F.rh * NROWS;
    const bandX = F.x + F.w * 0.36, bandW = Math.max(F.w * STRETCH / BENCH.tokens, narrow ? 24 : 30);
    function draw() {
      g.replaceChildren();
      const { x, y, w, h: hh, rh, dx, dy } = F;
      const rows = SLICES[slice].rows, cr = cherryRows();
      // the box: right face, top face, front face
      poly(g, [[x + w, y], [x + w + dx, y + dy], [x + w + dx, y + hh + dy], [x + w, y + hh]], { fill: tint(T('orchard'), 28), stroke: T('orchard'), sw: 1 });
      poly(g, [[x, y], [x + dx, y + dy], [x + w + dx, y + dy], [x + w, y]], { fill: tint(T('orchard'), 16), stroke: T('orchard'), sw: 1 });
      rect(g, x, y, w, hh, { fill: tint(T('orchard'), 9), stroke: T('orchard'), rx: 0, sw: 1 });
      // the stretch band: across the front and the top face
      rect(g, bandX, y, bandW, hh, { fill: tint(T('stretch'), 38), stroke: 'none', rx: 0 });
      poly(g, [[bandX, y], [bandX + dx, y + dy], [bandX + bandW + dx, y + dy], [bandX + bandW, y]], { fill: tint(T('stretch'), 38), stroke: 'none' });
      // the slice: the chosen rows inside the band, brighter
      rows.forEach(i => rect(g, bandX, y + i * rh, bandW, rh, { fill: tint(T('slice'), 55), stroke: 'none', rx: 0 }));
      // row rules: layers heavy, heads light
      for (let i = 1; i < NROWS; i++) el('line', { x1: x, y1: y + i * rh, x2: x + w, y2: y + i * rh, style: `stroke:${T('orchard')};stroke-width:${i % 2 ? 0.4 : 1};opacity:${i % 2 ? 0.5 : 0.85}` }, g);
      el('line', { x1: bandX, y1: y, x2: bandX, y2: y + hh, style: `stroke:${T('stretch')};stroke-width:1.2` }, g);
      el('line', { x1: bandX + bandW, y1: y, x2: bandX + bandW, y2: y + hh, style: `stroke:${T('stretch')};stroke-width:1.2` }, g);
      // the cherry: one token column, the rows of the chosen shape (outlined; a gap between the two layers of v[:, [1, 3], 0, :] stays a gap)
      const cx = bandX + bandW * 0.42, cwid = Math.max(5, bandW * 0.18);
      const groups = []; cr.forEach(i => { const last = groups[groups.length - 1]; if (last && last[1] === i - 1) last[1] = i; else groups.push([i, i]); });
      groups.forEach(([a, b2]) => rect(g, cx, y + a * rh, cwid, (b2 - a + 1) * rh, { fill: T('cherry'), stroke: 'var(--ink)', rx: 1, sw: 1.4 }));
      if (groups.length > 1) el('line', { x1: cx + cwid / 2, y1: y + (groups[0][1] + 1) * rh, x2: cx + cwid / 2, y2: y + groups[1][0] * rh, style: 'stroke:var(--ink);stroke-width:1;stroke-dasharray:2 2' }, g);
      // labels: axes
      for (let l = 0; l < BENCH.layers; l++) txt(g, x - 6, y + (l * 2 + 1) * rh + 4, String(l), { anchor: 'end', cls: 'val', style: 'fill:var(--ink-2)' });
      txt(g, x - 22, y + hh / 2, 'layer_id', { cls: 'val', transform: `rotate(-90 ${x - 22} ${y + hh / 2})`, style: 'fill:var(--ink-2)' });
      txt(g, x + w + 4, y + rh * 0.5 + 4, '0', { anchor: 'start', cls: 'val', style: 'fill:var(--ink-3)' });
      txt(g, x + w + 4, y + rh * 1.5 + 4, '1', { anchor: 'start', cls: 'val', style: 'fill:var(--ink-3)' });
      txt(g, x + w + 14, y + rh * 2.6 + 4, 'head_id', { anchor: 'start', cls: 'val', style: 'fill:var(--ink-2)' });
      arrowPath(g, `M${x + 2} ${y + hh + 10} H${x + w - 2}`, 'var(--ink-3)', { w: 1 });
      txt(g, x, y + hh + 24, 'token_pos_id 0', { anchor: 'start', cls: 'val', style: 'fill:var(--ink-2)' });
      txt(g, x + w, y + hh + 24, `≈ ${big(BENCH.tokens)}`, { anchor: 'end', cls: 'val', style: 'fill:var(--ink-2)' });
      arrowPath(g, `M${x + w + 4} ${y - 4} L${x + w + dx + 2} ${y + dy - 4}`, 'var(--ink-3)', { w: 1 });
      txt(g, x + w + dx + 2, y + dy - 10, 'elem_id 0 … 255', { anchor: 'end', cls: 'val', style: 'fill:var(--ink-2)' });
      // labels: band, slice, cherry (callouts above the box)
      txt(g, bandX + bandW / 2, y + dy - 34, `one stretch: ${big(STRETCH)} positions`, { cls: 'lbl' });
      el('line', { x1: bandX + bandW / 2 + dx / 2, y1: y + dy - 28, x2: bandX + bandW / 2 + dx / 2, y2: y + dy - 2, style: 'stroke:var(--ink-3);stroke-width:1' }, g);
      txt(g, x, y + hh + 44, `slice ${SLICES[slice].code}`, { anchor: 'start', cls: 'val', style: 'fill:var(--ink)' });
      txt(g, x, y + hh + 58, `cherry ${SHAPES[shape].code}: ${SHAPES[shape].name}`, { anchor: 'start', cls: 'val', style: 'fill:var(--ink-2)' });
      // numbers
      const perTok = rows.length / cr.length, punnet = STRETCH * perTok, raw = STRETCH * rows.length * BENCH.dim;
      ro.set([
        ['slice', code(SLICES[slice].code)], ['cherry', code(SHAPES[shape].code)],
        ['cherry_bytes', B(SHAPES[shape].bytes)], ['punnet_size', `${big(punnet)} cherries per stretch`],
        ['punnet raw bytes', `${B(raw)} (${fmtBytes(raw, 1)})`],
      ]);
    }
    draw();
  };

  // =================================================================== IV.4
  // FIG.scnCherryShapes — three cherry shapes for one token position of the Bench's values.
  FIG.scnCherryShapes = function (host) {
    const BEST = { head: 0.670, layer: 0.636, token: 0.638 };   // best verified MDL ratio per shape, on the campaigns' own screens
    let sel = 'layer';
    const grid = h('div', { class: 'scn-shapes' }), ro = readout();
    host.append(grid, ro, sub('Ratios come from different screens (different punnets): trust the order, not the third decimal.'));
    const cols = {};
    Object.entries(SHAPES).forEach(([k, s]) => {
      const dbox = h('div');
      const stat = (dt, dd) => [h('dt', { text: dt }), h('dd', { html: dd })];
      const col = h('button', { type: 'button', class: 'scn-shape', 'aria-pressed': 'false', onclick: () => { sel = k; draw(); } },
        h('span', { class: 'scn-shape-h', text: s.code }), h('span', { class: 'scn-shape-s', text: s.name }), dbox,
        h('dl', {}, ...stat('cherry_bytes', B(s.bytes)), ...stat('per token position', String(s.perTok)),
          ...stat('per stretch of 4096', big(STRETCH * s.perTok)), ...stat('best verified ratio', `${fmt(BEST[k], 3)} <small>different screens</small>`)));
      grid.append(col);
      cols[k] = { col, dbox, g: null };
    });
    // the drawings need their cells in the page first
    Object.entries(cols).forEach(([k, c]) => {
      const D = Diagram(c.dbox, { w: 200, h: 140, grow: 0.5, label: `The elements one ask returns under cherry shape ${SHAPES[k].code}` });
      c.g = el('g', {}, D.svg);
    });
    function cell(g, x, y, w, hh, on) {
      rect(g, x, y, w, hh, { fill: on ? T('cherry') : tint(T('orchard'), 14), stroke: on ? 'var(--ink)' : tint(T('orchard'), 60), rx: 2, sw: on ? 1.2 : 0.8 });
      for (let i = 1; i < 8; i++) el('line', { x1: x + i * w / 8, y1: y + 2, x2: x + i * w / 8, y2: y + hh - 2, style: `stroke:${on ? 'var(--paper-3)' : T('orchard')};stroke-width:.5;opacity:.6` }, g);
    }
    function draw() {
      Object.entries(cols).forEach(([k, c]) => {
        c.col.classList.toggle('on', k === sel); c.col.setAttribute('aria-pressed', String(k === sel));
        c.g.replaceChildren();
        const x0 = 40, y0 = 14, cw = 70, ch = 14, gx = 6, gy = 4;
        for (let l = 0; l < BENCH.layers; l++) for (let hd = 0; hd < BENCH.heads; hd++) {
          const on = k === 'token' || (k === 'layer' && l === 1) || (k === 'head' && l === 1 && hd === 0);
          cell(c.g, x0 + hd * (cw + gx), y0 + l * (ch + gy), cw, ch, on);
        }
        for (let l = 0; l < BENCH.layers; l++) txt(c.g, x0 - 5, y0 + l * (ch + gy) + ch - 3, String(l), { anchor: 'end', cls: 'val', style: 'fill:var(--ink-3)' });
        txt(c.g, x0 - 24, y0 + 3 * (ch + gy), 'layer_id', { cls: 'val', transform: `rotate(-90 ${x0 - 24} ${y0 + 3 * (ch + gy)})`, style: 'fill:var(--ink-3)' });
        txt(c.g, x0 + cw / 2, y0 + 6 * (ch + gy) + 8, 'head 0', { cls: 'val', style: 'fill:var(--ink-3)' });
        txt(c.g, x0 + cw + gx + cw / 2, y0 + 6 * (ch + gy) + 8, 'head 1', { cls: 'val', style: 'fill:var(--ink-3)' });
        txt(c.g, x0 + cw + gx / 2, y0 + 6 * (ch + gy) + 22, '256 elements each', { cls: 'val', style: 'fill:var(--ink-3)' });
      });
      const s = SHAPES[sel];
      ro.set([['cherry', code(s.code)], ['one ask returns', `${big(s.bytes)} elements · ${B(s.bytes)}`], ['per token position', `${s.perTok} ${s.perTok === 1 ? 'cherry' : 'cherries'} of ${B(BENCH.layers * BENCH.heads * BENCH.dim)}`],
        ['punnet of a 4096 stretch', `${big(STRETCH * s.perTok)} cherries · ${fmtBytes(STRETCH * BENCH.layers * BENCH.heads * BENCH.dim, 1)} raw`]]);
    }
    draw();
  };

  // =================================================================== IV.5
  // FIG.scnPunnet — the slice of one stretch, re-boxed as cherries under two shapes.
  FIG.scnPunnet = function (host) {
    const LAYERS = [1, 3], N = STRETCH, RAW = N * LAYERS.length * BENCH.dim;   // 2 097 152 B
    let shape = 'layer';
    const box = h('div'), ro = readout();
    host.append(controls(h('span', { class: 'scn-ctl-lab', text: 'cherry shape' }), seg([['head', '<code>v[t, l, 0, :]</code>'], ['layer', '<code>v[t, [1, 3], 0, :]</code>']], shape, v => { shape = v; draw(); }, 'cherry shape')), box, ro,
      sub('The full-width bars are to scale (one tick every 64 positions); the zoom shows the first 12 positions as separate cells and boxes.'));
    const narrow = isNarrow(host);
    const W = narrow ? 380 : 640, ZN = 12;
    const D = Diagram(box, { w: W, h: narrow ? 372 : 216, label: 'The slice of one stretch, and the same elements boxed as cherries' });
    const g = el('g', {}, D.svg);
    const x0 = narrow ? 72 : 76, bw = narrow ? W - x0 - 14 : 400, rh = 20, zx = narrow ? x0 : x0 + bw + 26, zw = narrow ? 300 : 120, zc = zw / ZN;
    const tick64 = ticksPattern(D.defs, bw / N * 64, T('orchard'), 100), tickC = ticksPattern(D.defs, bw / N * 64, T('cherry'), 100);
    function draw() {
      g.replaceChildren();
      // ---- top: the slice, two rows of 4096 cells
      const ty = 34, zy = narrow ? ty + 2 * rh + 50 : ty;
      txt(g, x0, ty - 14, 'the slice of one stretch: v[stretch, [1, 3], 0, :]', { anchor: 'start', cls: 'lbl' });
      LAYERS.forEach((l, i) => {
        const y = ty + i * (rh + 4);
        rect(g, x0, y, bw, rh, { fill: tint(T('slice'), 30), stroke: T('slice'), rx: 2, sw: 1 });
        rect(g, x0, y, bw, rh, { fill: tick64, stroke: 'none', rx: 0 });
        txt(g, x0 - 6, y + rh - 6, `layer_id ${l}`, { anchor: 'end', cls: 'val', style: 'fill:var(--ink-2)' });
      });
      arrowPath(g, `M${x0} ${ty + 2 * rh + 12} H${x0 + bw - 2}`, 'var(--ink-3)', { w: 1 });
      txt(g, x0 + bw / 2, ty + 2 * rh + 26, narrow ? `${big(N)} positions · 256 B per cell` : `${big(N)} token positions · each cell 256 elements = 256 B`, { cls: 'val', style: 'fill:var(--ink-3)' });
      // zoom of the first 12 positions
      const zoom = (y, rows, boxes) => {
        txt(g, zx, y - 6, `first ${ZN} positions, zoomed`, { anchor: 'start', cls: 'annot' });
        if (rows) LAYERS.forEach((l, i) => range(ZN).forEach(c => rect(g, zx + c * zc, y + i * (rh + 4), zc - 1, rh, { fill: tint(T('slice'), 30), stroke: T('slice'), rx: 1, sw: 0.8 })));
        if (boxes === 'head') LAYERS.forEach((l, i) => range(ZN).forEach(c => rect(g, zx + c * zc, y + i * (rh + 4), zc - 1, rh, { fill: tint(T('cherry'), 40), stroke: T('cherry'), rx: 2, sw: 1.2 })));
        if (boxes === 'layer') range(ZN).forEach(c => rect(g, zx + c * zc, y, zc - 1, 2 * rh + 4, { fill: tint(T('cherry'), 40), stroke: T('cherry'), rx: 2, sw: 1.2 }));
      };
      zoom(zy, true, null);
      // the zoom bracket from the first positions of the bars
      el('path', { d: `M${x0} ${ty + 2 * rh + 4} L${zx} ${zy + 2 * rh + 4}`, style: 'stroke:var(--ink-3);stroke-width:.8;stroke-dasharray:3 3;fill:none' }, g);
      // ---- bottom: the punnet
      const py = zy + 2 * rh + 56, pzy = narrow ? py + 2 * rh + 50 : py;
      txt(g, x0, py - 14, `the punnet: cherries of shape ${SHAPES[shape].code}`, { anchor: 'start', cls: 'lbl' });
      if (shape === 'head') LAYERS.forEach((l, i) => {
        const y = py + i * (rh + 4);
        rect(g, x0, y, bw, rh, { fill: tint(T('cherry'), 32), stroke: T('cherry'), rx: 2, sw: 1 });
        rect(g, x0, y, bw, rh, { fill: tickC, stroke: 'none', rx: 0 });
      });
      else {
        rect(g, x0, py, bw, 2 * rh + 4, { fill: tint(T('cherry'), 32), stroke: T('cherry'), rx: 2, sw: 1 });
        rect(g, x0, py, bw, 2 * rh + 4, { fill: tickC, stroke: 'none', rx: 0 });
      }
      txt(g, x0 - 6, py + rh + 2, shape === 'head' ? '8 192 boxes' : '4 096 boxes', { anchor: 'end', cls: 'val', style: 'fill:var(--ink-2)' });
      txt(g, x0 + bw / 2, py + 2 * rh + 20, `${big(N * (shape === 'head' ? 2 : 1))} × ${B(SHAPES[shape].bytes)} = ${B(RAW)} raw${narrow ? '' : ', the same bytes'}`, { cls: 'val', style: 'fill:var(--ink-3)' });
      zoom(pzy, false, shape);
      el('path', { d: `M${x0} ${py + 2 * rh + 4} L${zx} ${pzy + 2 * rh + 4}`, style: 'stroke:var(--ink-3);stroke-width:.8;stroke-dasharray:3 3;fill:none' }, g);
      ro.set([['punnet_size', `${big(N * (shape === 'head' ? 2 : 1))} cherries`], ['cherry_bytes', B(SHAPES[shape].bytes)], ['raw bytes', `${B(RAW)} (${fmtBytes(RAW, 0)}), whatever the shape`]]);
    }
    draw();
  };

  // =================================================================== IV.6
  // FIG.scnContract — a toy punnet, a loc dictionary, and one cherry decoded cold; the dictionary bytes touched, against a toy leash.
  FIG.scnContract = function (host) {
    const r = rng('plan-decode');
    const centres = [40, -12, 3, 97, -55], spread = [3, 2, 4, 2, 3];
    const X = range(6).map(() => centres.map((c, j) => Math.round(c + spread[j] * r.normal())));
    const Dd = centres.map((_, j) => Math.round(quantile(X.map(row => row[j]), 0.5)));
    const R = X.map(row => row.map((v, j) => v - Dd[j]));
    const width = range(5).map(j => Math.max(1, Math.ceil(Math.log2(2 * Math.max(...R.map(row => Math.abs(row[j]))) + 1))));
    const CHERRY_B = 5, DICT_B = Dd.length, LEASH = 2 * CHERRY_B;     // one byte per 8-bit code; a toy leash of 2 × cherry bytes
    let sel = 2;
    const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
    const grid = h('div', { class: 'scn-da' });
    const ro = readout();
    host.append(h('p', { class: 'fig-note', text: 'Click a cherry (a row) to decode it cold. Illustrative numbers.' }), grid, ro);

    function tableOf(title, rows, opts) {
      const t = h('div', { class: 'scn-da-t' + (opts.cls ? ' ' + opts.cls : '') });
      t.append(h('div', { class: 'scn-da-h', html: title }));
      const body = h('div', { class: 'scn-da-body', style: 'grid-template-columns: auto repeat(5, minmax(2.4rem, 1fr))' });
      body.append(h('span', { class: 'scn-da-c scn-da-k', text: 'furrow' }), ...range(5).map(j => h('span', { class: 'scn-da-c scn-da-k', text: String(j) })));
      rows.forEach((row, i) => {
        const on = opts.isOn(i), used = opts.isUsed(i);
        body.append(h('span', { class: 'scn-da-c scn-da-k', text: opts.rowName(i) }));
        row.forEach(v => body.append(h('button', {
          type: 'button', class: 'scn-da-c scn-da-v' + (on ? ' on' : '') + (used ? ' used' : '') + (opts.dim && !used ? ' dim' : ''),
          'aria-label': `${opts.rowName(i)}`, text: opts.show(v), onclick: opts.click ? () => opts.click(i) : null,
        })));
      });
      t.append(body);
      return t;
    }
    function meter() {
      const scale = LEASH * 1.25;
      return h('div', { class: 'scn-meter' },
        h('div', { class: 'scn-meter-track' },
          h('span', { class: 'scn-meter-fill', style: `width:${100 * DICT_B / scale}%` }),
          h('span', { class: 'scn-meter-leash', style: `left:${100 * LEASH / scale}%` })),
        h('div', { class: 'scn-meter-lab', html: `dictionary bytes touched by this decode: <b>${DICT_B} of ${DICT_B}</b> (read whole) · leash ${LEASH} B = 2 × cherry bytes` }));
    }
    function draw() {
      const dict = tableOf('the dictionary <small>(one per punnet)</small>', [Dd], { rowName: () => 'location', show: v => sgn(v), isOn: () => false, isUsed: () => true, cls: 'scn-da-dict' });
      dict.append(meter());
      grid.replaceChildren(
        tableOf('the punnet <small>(8-bit codes)</small>', X, { rowName: i => `cherry ${i}`, show: v => sgn(v), isOn: i => i === sel, isUsed: () => false, click: i => { sel = i; draw(); } }),
        dict,
        tableOf('the deltas', R, { rowName: i => `δ ${i}`, show: v => sgn(v), isOn: () => false, isUsed: i => i === sel, dim: true, click: i => { sel = i; draw(); } }),
      );
      const rebuilt = R[sel].map((v, j) => v + Dd[j]);
      const ok = rebuilt.every((v, j) => v === X[sel][j]);
      const dBits = width.reduce((a, b) => a + b, 0);
      ro.set([
        [`cherry ${sel} rebuilt`, `${rebuilt.map(sgn).join(', ')} ${ok ? '— bit for bit ✓' : '✗'}`],
        ['read', `the dictionary + δ ${sel} only (the other ${X.length - 1} deltas untouched)`],
        ['delta size', `${dBits} bits (widths ${width.join('+')}) vs ${8 * CHERRY_B} bits raw`],
        ['reads', `${DICT_B} B of dictionary ≤ leash ${LEASH} B ✓`],
      ]);
    }
    draw();
  };

  // =================================================================== IV.7
  // FIG.scnScoreSquare — the square of scores: dictionary share against delta share for every verified record.
  FIG.scnScoreSquare = async (host) => {
    const [pd, sd] = await Promise.all([data('points'), data('splits')]);
    const pts = need(pd.points, 'points.points'), lm = need(pd.landmarks, 'points.landmarks');
    const solo = num(lm.solo_ideal.ratio, 'landmarks.solo_ideal.ratio');
    // compressor 129 by cherry shape (verified records): the ringed v[t, l, :, :] point of the caption lives here, not in the incumbents
    const extra = need(sd.coder_129_by_split.rows, 'splits.coder_129_by_split.rows')
      .filter(r => !pts.some(p => p.coder === 129 && p.split === r.split && p.b === 4096))
      .map(r => ({ track: `s-${r.split}-b4k-r293`, split: r.split, b: 4096, budget: 293, coder: 129, name: 'pure-wls', ratio: r.ratio, x: r.x, y: r.y, reads: r.reads, trial: r.trial, verified: r.verified, campaign: 'C2', role: '129 by cherry shape', layers: 'all six', n_sequences: 2 }));
    const all = pts.concat(extra);
    const is129 = p => p.coder === 129 && p.split === 'layer';
    const is109 = p => p.coder === 109 && p.b === 512;
    let show = 'both';
    const box = h('div', { class: 'scn-square' }), ro = readout();
    const sw = seg([['both', 'C1 and C2'], ['C2', 'C2 only'], ['C1', 'C1 only']], show, v => { show = v; draw(); }, 'campaign');
    const anyUnverified = all.some(p => !p.verified);
    host.append(controls(sw), legend([...shapeLegend(), ['no compression x_D + ρ = 1', 'var(--ink-2)', 'line'], [`solo ${fmt(solo, 3)}`, 'var(--ink-2)', 'dash'], ['constant ratio', 'var(--ink-3)', 'line'],
      ...(anyUnverified ? [['not verified (ring)', 'var(--ink-2)', 'dot']] : [])]), box, ro,
      sub('Click or tap a point to read it out; hover for the full record. Every point is a verified record of the campaigns; C1 points are values of layer 3, head 0 only.'));
    const P = Plot(box, { w: 520, h: 520, x: [0, 1], y: [0, 1], equal: true, xlabel: 'dictionary share  x_D', ylabel: 'delta share  ρ', grid: false,
      xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1], label: 'The square of scores: dictionary share against delta share for every verified record' });
    const f = P.fs;
    const iso = (r, style, labelAt, text) => {
      el('line', { x1: P.x(0), y1: P.y(r), x2: P.x(r), y2: P.y(0), style }, P.g.bg);
      if (text) { const X = P.x(r * labelAt), Y = P.y(r * (1 - labelAt)); el('text', { x: X, y: Y - 4 * f, 'text-anchor': 'middle', class: 'lbl', transform: `rotate(-45 ${X} ${Y})`, text }, P.g.bg); }
    };
    [[0.9, 0.85], [0.8, 0.85], [0.7, 0.2], [0.6, 0.2]].forEach(([r, t]) => iso(r, 'stroke:var(--ink-3);stroke-width:1;opacity:.5', t, fmt(r, 1)));
    iso(1, 'stroke:var(--ink-2);stroke-width:1.6', 0.35, 'no compression  x_D + ρ = 1');
    iso(solo, 'stroke:var(--ink-2);stroke-width:1.4;stroke-dasharray:6 5', 0, null);
    el('text', { x: P.x(solo) + 5 * f, y: P.y(0) - 6 * f, class: 'lbl', text: `solo ${fmt(solo, 3)}` }, P.g.bg);
    const tip = p => `<b>compressor ${p.coder} ${esc(p.name)}</b> · ${p.campaign}${p.role && p.role !== 'incumbent' ? ` · ${esc(p.role)}` : ''}<br>`
      + `scenario: ${scenarioOf(p)}<br>`
      + `MDL ratio <b>${fmt(p.ratio, 4)}</b> = x_D ${fmt(p.x, 3)} + ρ ${fmt(p.y, 3)} · ${fb(p.ratio)}<br>${readsOf(p)}<br>${p.trial} · ${p.verified ? 'verified' : 'not verified'}`;
    const pick = p => ro.set([[`compressor ${p.coder}`, `${esc(p.name)} · ${p.campaign}`], ['scenario', scenarioOf(p)], ['ratio', `${fmt(p.ratio, 4)} = ${fmt(p.x, 3)} + ${fmt(p.y, 3)} · ${fb(p.ratio)}`], ['worst-cherry reads', p.reads ? `${fmt(p.reads.max, 0)} (mean ${fmt(p.reads.mean, 0)})` : '—'], ['trial', p.trial]]);
    function draw() {
      P.clear();
      const vis = all.filter(p => show === 'both' || p.campaign === show);
      vis.sort((a, b) => (a.campaign === 'C1' ? 0 : 1) - (b.campaign === 'C1' ? 0 : 1)).forEach(p => {
        const col = shapeColor(p.split), X = P.x(p.x), Y = P.y(p.y), ring = is129(p) || is109(p);
        if (ring) el('circle', { cx: X, cy: Y, r: 9.5 * f, style: 'fill:none;stroke:var(--ink);stroke-width:1.6' }, P.g.data);
        const c = el('circle', { class: 'dot scn-pt', cx: X, cy: Y, r: (p.campaign === 'C1' ? 4.4 : 5.2) * f, tabindex: ring ? 0 : null,
          style: p.verified ? `fill:${col}` : `fill:var(--paper-3);stroke:${col};stroke-width:2` }, P.g.data);
        hover(c, () => tip(p));
        c.addEventListener('click', () => pick(p));
      });
      const a129 = vis.find(is129), a109 = vis.find(is109);
      if (a129) annotate(P, a129.x, a129.y, `compressor 129: no reference cherries,\n2 % in the dictionary · ${fmt(a129.ratio, 4)}`, { dx: (P.x(0.2) - P.x(a129.x)) / f, dy: (P.y(0.86) - P.y(a129.y)) / f, anchor: 'start' });
      if (a109) annotate(P, a109.x, a109.y, `compressor 109: every cherry in the\ndictionary, ρ = 0 · ${fmt(a109.ratio, 4)} at stretch 512`, { dx: (P.x(0.52) - P.x(a109.x)) / f, dy: (P.y(0.42) - P.y(a109.y)) / f, anchor: 'middle' });
      const best = vis.find(p => p.track === 's-layer-b4k-r293' && p.coder === 121) || vis.slice().sort((a, b) => a.ratio - b.ratio)[0];
      if (best) pick(best);
    }
    draw();
  };

  // =================================================================== IV.8
  // FIG.scnLeash — reads against the leash for every cherry of one punnet.
  // The records hold summaries only (mean, p99, worst per screen); a per-cherry series is synthesised from them with a seeded generator.
  FIG.scnLeash = async (host) => {
    const rd = await data('reads');
    const tbl = need(rd.every_entry_table, 'reads.every_entry_table');
    const LEASHES = [[137, 'stretch 512'], [293, 'stretch 4096'], [1103, 'stretch 16 384'], [14503, 'the whole sequence']];   // one leash per stretch length (the rulings of 2026-11-03)
    const stretchOf = l => (LEASHES.find(([v]) => v === l) || [l, ''])[1];
    const tree = tbl.find(p => p.coder === 121 && p.b === 4096 && p.budget === 293);
    if (!tree) throw new Error('measured data: no every-cherry record for compressor 121 at stretch 4096, leash 293');
    const curve = need(rd.reads_curve && rd.reads_curve.points, 'reads.reads_curve.points');
    const corner = curve.slice().sort((a, b) => b.reads_mean - a.reads_mean)[0];           // the all-dictionary corner: the most reads on record
    const N = STRETCH, r = rng('scn-leash');
    const synthTree = () => {
      const m = num(tree.reads.mean, 'reads.mean'), p99 = num(tree.reads.p99, 'reads.p99'), mx = num(tree.reads.max, 'reads.max');
      const s = (p99 - m) / 2.326;                                                              // a normal spread that puts the 99th percentile where the record has it
      const v = range(N).map(i => m + s * r.normal() + 0.3 * s * Math.sin(i / 89));            // a slow swell: the tree's depth drifts along the stretch
      const shift = m - mean(v);
      const w = v.map(x => clamp(Math.round(x + shift), 8, mx));
      w[r.int(N)] = mx;                                                                        // one cherry is the worst on record
      return w;
    };
    const SER = {
      tree: { label: `reference tree (compressor ${tree.coder} ${esc(tree.name)})`, color: series(0), v: synthTree(), from: `mean ${fmt(tree.reads.mean, 0)}, p99 ${fmt(tree.reads.p99, 0)}, worst ${fmt(tree.reads.max, 0)} on record` },
      light: { label: 'light, no tree (reads under 5)', color: series(1), v: range(N).map(() => (r() < 0.4 ? 4 : 3)), from: 'a loc dictionary of about 4 cherries’ worth, read whole' },
      all: { label: 'all-dictionary corner (≈ 1 490)', color: series(2), v: range(N).map(() => Math.round(1490 + r.normal(0, 6))), from: `every cherry in the dictionary; compressor ${corner.coder}: mean ${big(corner.reads_mean)} reads on record, sampled` },
    };
    let leash = 293, ser = 'tree';
    const box = h('div'), ro = readout();
    host.append(controls(h('span', { class: 'scn-ctl-lab', text: 'leash' }), seg(LEASHES.map(([v, s]) => [v, `${big(v)} (${s})`]), leash, v => { leash = Number(v); draw(); }, 'leash'),
      h('span', { class: 'scn-ctl-lab', text: 'compressor' }), seg(Object.entries(SER).map(([k, s]) => [k, s.label]), ser, v => { ser = v; draw(); }, 'compressor')),
      legend([...Object.values(SER).map(s => [s.label, s.color]), ['leash', T('leash'), 'dash'], ['above the leash', 'var(--bad)', 'band']]), box, ro,
      sub('Synthesised: the records hold a mean, a p99 and a worst cherry per screen (in cherries’ worth of 512 B: the distinct dictionary bytes one cold decode touched), not every cherry’s reads. Each series here is drawn from those summaries with a seeded generator, so its shape is illustrative and its mean, p99 and worst are the records’. The punnet drawn is one stretch of 4096 cherries, whose own leash is 293; the leashes of the other stretch lengths are shown for comparison.'));
    const P = Plot(box, { x: [0, N - 1], y: [0, 300], h: 340, xlabel: 'cherry index in the punnet (position order)', ylabel: 'reads, in cherries’ worth', grid: 'y', xticks: [0, 1024, 2048, 3072, 4095], label: 'Reads of every cherry of one punnet against the leash' });
    crosshair(P, { xname: 'cherry', xfmt: v => `#${Math.round(v)}`, yfmt: v => `${fmt(v, 0)} cherries’ worth` });
    function draw() {
      const S = SER[ser], v = S.v, vmax = Math.max(...v);
      const yTop = Math.max(10, vmax * 1.15, Math.min(leash, 2000) * 1.15);
      const shown = Math.min(leash, yTop * 0.97);                                                // the whole-sequence leash sits above the chart
      P.domain({ y: [0, yTop] });
      P.clear();
      const pts = v.map((y, i) => [i, y]);
      area(P, pts.map(([x, y]) => [x, leash, Math.max(y, leash)]), { color: 'var(--bad)', opacity: 0.45 });
      line(P, pts, { color: S.color, width: 1, name: 'reads' });
      rule(P, { y: shown, label: `leash ${big(leash)} (${stretchOf(leash)}${leash > yTop ? '; above the chart' : ''})`, color: T('leash') });
      const over = v.filter(y => y > leash).length, worst = Math.max(...v);
      ro.set([['mean', fmt(mean(v), 1)], ['p99', fmt(quantile(v, 0.99), 0)], ['worst cherry', fmt(worst, 0)], ['above the leash', `${big(over)} of ${big(N)} (${fmtPct(over / N, 1)})`],
        ['verdict', over ? `fails the leash of ${big(leash)} (${stretchOf(leash)})` : `fits the leash of ${big(leash)} (${stretchOf(leash)})`], ['from', S.from]]);
    }
    draw();
  };

  // =================================================================== IV.9
  // FIG.scnScopeCost — what a dictionary costs per element against its weight and the punnet that shares it.
  FIG.scnScopeCost = (host) => {
    const BS = [512, 4096, 16384, 225000];
    const ws = range(0, 12.01, 0.25).map(e => 2 ** e);
    const bits = (w, b) => 8 * w / b;
    const MARKS = [
      { x: 0.02, b: 4096, label: 'light dictionary, x_D = 0.02', note: 'furrow statistics, no reference cherries (compressor 129)' },
      { x: 0.52, b: 4096, label: 'reference-tree dictionary, x_D = 0.52', note: 'made of cherries: half the punnet at every stretch length' },
    ].map(m => Object.assign(m, { w: Math.round(m.x * m.b) }));
    const box = h('div'), ro = readout();
    host.append(legend([...BS.map((b, i) => [`punnet of ${big(b)} cherries${b === 225000 ? ' (a whole sequence)' : ''}`, series(i)]), ['raw 8 bits', 'var(--ink-2)', 'dash'], ['the campaigns’ dictionaries', 'var(--c)', 'dot']]), box, ro);
    const yfmtv = v => (v >= 1 ? String(v) : `0.${'0'.repeat(Math.max(0, -Math.round(Math.log10(v)) - 1))}1`);
    const P = Plot(box, { x: [1, 4096], xlog: 2, y: [0.00002, 100], ylog: true, h: 380, xlabel: 'dictionary weight w, in cherries’ worth (log)', ylabel: 'bits per element (log)',
      xticks: [1, 4, 16, 64, 256, 1024, 4096], yticks: [0.0001, 0.001, 0.01, 0.1, 1, 10, 100], yfmt: yfmtv, grid: 'y', label: 'Dictionary bits per element against its weight, one line per punnet size' });
    BS.forEach((b, i) => line(P, ws.map(w => [w, bits(w, b)]), { color: series(i), name: `punnet ${big(b)}`, width: 2 }));
    rule(P, { y: 8, label: 'raw 8 bits' });
    crosshair(P, { xname: 'w =', xfmt: v => `${fmt(v, 0)} cherries’ worth`, yfmt: v => `${v < 0.01 ? v.toPrecision(2) : fmt(v, 3)} bits` });
    const f = P.fs;
    MARKS.forEach((m, i) => {
      const y = bits(m.w, m.b);
      const c = el('circle', { class: 'dot scn-pt', cx: P.x(m.w), cy: P.y(y), r: 6.5 * f, tabindex: 0, style: 'fill:var(--c)' }, P.g.top);
      hover(c, () => `<b>${esc(m.label)}</b><br>weight w = ${big(m.w)} cherries’ worth · punnet of ${big(m.b)}<br>8w/b = <b>${fmt(y, 3)} bits per element</b><br><i>${esc(m.note)}</i>`);
      const short = f > 1.3;   // phones: shorter callouts, so they stay inside the plot
      annotate(P, m.w, y, `${i ? 'reference tree' : short ? 'light' : 'light dictionary'}, x_D = ${fmt(m.x, 2)}\nw = ${big(m.w)}: ${fmt(y, 2)} bits${short ? '' : ' per element'}`, i ? { dx: -16, dy: -46, anchor: 'end' } : { dx: short ? 12 : 26, dy: 44, anchor: 'start' });
    });
    ro.set(MARKS.map(m => [`x_D = ${fmt(m.x, 2)}`, `w = ${big(m.w)} · ${fmt(bits(m.w, m.b), 3)} bits per element at b = ${big(m.b)} · ${fmt(bits(m.w, 225000), 4)} at a whole sequence`]));
  };
})();
