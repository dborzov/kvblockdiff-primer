/* Part VIII, "The measurements" (content/08-measured): figures/measured.js.
   Builders: msrHeadline, msrTensor, msrCurve, msrLadderC1, msrLadderC2, msrShuffle, msrSplits, msrCast,
   msrTime, msrReads, msrBlocks, msrMemory, msrNoise, msrEconomics.
   Every measured number is read at runtime from figures/data/measured-*.json (ledger-derived, see
   analysis/measured_extract.py and PART-XI-SPEC.md §4); the few constants of the data itself (tensor
   geometry, the Pin of III.11) are written inline with their source.
   Colour follows the entity: the cherry shape ((256,) / (2, 256) / (6, 2, 256) / other) and the
   recurring compressors 102, 121 and 129 keep the same series colour in every figure. */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------------ data (fails loudly)
  async function data(name) {
    const url = (window.KV && KV.prefix ? KV.prefix : '/') + 'assets/figs/data/measured-' + name + '.json';
    const r = await fetch(url);
    if (!r.ok) throw new Error(`could not load measured-${name}.json (${r.status})`);
    return r.json();
  }
  /** need(obj.key, 'file.key') throws when a field the figure relies on is missing. */
  function need(v, what) { if (v == null) throw new Error(`measured data: missing ${what}`); return v; }
  function num(v, what) { need(v, what); if (!Number.isFinite(+v)) throw new Error(`measured data: ${what} is not a number`); return +v; }

  // ------------------------------------------------------------------ units and colours
  const bits = r => 8 * r;                                   // the site thinks in bits per element, the campaign in ratios
  const fb = (r, d = 2) => `${fmt(bits(r), d)} bits`;
  const rb = (r, d = 4) => `${fmt(r, d)} · ${fb(r)}`;        // "0.6364 · 5.09 bits"
  const SPLIT_IDX = { head: 0, layer: 1, token: 2, other: 3 };
  const splitKey = s => (s in SPLIT_IDX && s !== 'other' ? s : 'other');
  const splitColor = s => series(SPLIT_IDX[splitKey(s)]);
  /** JSON strings shown verbatim (labels, grades, steps) in the site's words: numbers untouched. */
  const WORDS = [[/\bexact[- ]model\b/g, 'code-length estimate'], [/\bintact model\b/g, 'the LLM intact'], [/\bmodel\b/g, 'LLM'], [/\bentries\b/g, 'cherries'], [/\bentry\b/g, 'cherry'], [/\bblocks\b/g, 'punnets'], [/\bblock\b/g, 'punnet'], [/\bchannels\b/g, 'furrows'], [/\bchannel\b/g, 'furrow'], [/\bcoders\b/g, 'compressors'], [/\bcoder\b/g, 'compressor'], [/\bread budget\b/g, 'leash'], [/\bbudget\b/g, 'leash'], [/\bthreads?\b/g, 'sequence'], [/\bsegments?\b/g, 'parts']];
  const words = t => (t == null ? t : WORDS.reduce((x, [re, to]) => x.replace(re, to), String(t)));
  const SPLIT_LABEL = { head: 'cherry (256,): one head', layer: 'cherry (2, 256): one KV layer, both heads', token: 'cherry (6, 2, 256): one token, six KV layers', other: 'other cherry shapes (two or three KV layers, by kind, columns, 8 tokens)' };
  const splitLegend = (keys = ['head', 'layer', 'token', 'other'], shape = 'dot') => keys.map(k => [SPLIT_LABEL[k], splitColor(k), shape]);
  const CODER = { 102: series(4), 121: series(5), 129: series(6) };   // the compressors that recur across pages
  const NEUTRAL = 'var(--slate)';                                      // landmarks that are not compressors (raw, solo)
  const EST = 'var(--ink-3)';                                          // estimates: code-length estimates and bounds
  const tokFmt = n => (n >= 1024 ? `${n / 1024}k` : String(n));
  const seqName = s => `seq ${s}`;
  const readsOf = r => (r && r.reads ? `reads mean ${fmt(r.reads.mean, 0)}${r.reads.p99 != null ? ` · p99 ${fmt(r.reads.p99, 0)}` : ''} · worst ${fmt(r.reads.max, 0)}` : 'reads not in the ledger');
  const perSeq = ps => (ps ? Object.entries(ps).map(([k, v]) => `${k}: ${fmt(v, 4)}`).join(' · ') : '');
  /** A viewBox width that keeps phone text at about 11px even in a narrow grid cell (see fontScale in plotkit). */
  const fitW = (box, max = 640) => { const w = box.getBoundingClientRect().width; return w > 0 ? Math.min(max, Math.max(300, Math.round(w / 0.5))) : max; };

  // ------------------------------------------------------------------ drawing helpers
  /* Bar outline with a rounded data end and a square base (the kit's own bar shape). */
  function barPath(horiz, c0, bw, p0, p1, r) {
    const s = p1 < p0 ? 1 : -1, c1 = c0 + bw;
    r = Math.min(r, bw / 2, Math.abs(p1 - p0));
    return horiz
      ? `M${p0} ${c0}H${p1 + s * r}Q${p1} ${c0} ${p1} ${c0 + r}V${c1 - r}Q${p1} ${c1} ${p1 + s * r} ${c1}H${p0}Z`
      : `M${c0} ${p0}V${p1 + s * r}Q${c0} ${p1} ${c0 + r} ${p1}H${c1 - r}Q${c1} ${p1} ${c1} ${p1 + s * r}V${p0}Z`;
  }
  /** Diagonal hatch pattern (paint server); the stroke colour is a token. */
  function hatch(P, color = 'var(--ink-3)') {
    const id = uid('hatch');
    const p = el('pattern', { id, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, P.defs);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 6, style: `stroke:${color};stroke-width:1.6` }, p);
    return `url(#${id})`;
  }
  /** A second tick row along the top edge: the same positions in bits per element (8 × ratio).
      The caption sits left of the first tick when the left margin has room, else on a row above (needs m.t ≳ 42). */
  function bitsAxis(P, label = 'bits per element') {
    const f = P.fs, lo = Math.min(P.x0, P.x1), hi = Math.max(P.x0, P.x1);
    const xt = P.opts.xticks || ticks(lo, hi, P.opts.xn || Math.max(3, Math.round(P.pw / (85 * f))));
    const g = el('g', { class: 'msr-bits' }, P.g.axes);
    xt.forEach(v => {
      const X = P.x(v);
      if (X < P.m.l - 0.5 || X > P.W - P.m.r + 0.5) return;
      el('text', { x: X, y: P.m.t - 7 * f, 'text-anchor': 'middle', text: fmt(8 * v, 2) }, el('g', { class: 'tick' }, g));
    });
    if (!label) return;
    const roomLeft = P.m.l >= 80 * f;
    el('text', { x: roomLeft ? P.m.l - 16 * f : P.W - P.m.r, y: P.m.t - (roomLeft ? 7 : 21) * f, 'text-anchor': 'end', class: 'lbl', style: 'fill:var(--ink-3)', text: label }, g);
  }
  /** Vertical reference line (drawn under the marks) with its label at the bottom, the top or above the plot. */
  function vrule(P, x, label, o = {}) {
    const f = P.fs, X = P.x(x);
    el('line', { class: 'rule-line', x1: X, x2: X, y1: P.m.t, y2: P.H - P.m.b, style: `stroke:${o.color || 'var(--ink-2)'}` + (o.dash === false ? '' : `;stroke-dasharray:${o.dash || '5 4'}`) }, el('g', { class: 'pk-rule' }, P.g.bg));
    const g = el('g', { class: 'pk-rule' }, P.g.top);
    if (label) {
      const left = o.side ? o.side === 'left' : X > P.m.l + P.pw * (o.pos === 'above' ? 0.5 : 0.7);
      const y = o.pos === 'top' ? P.m.t + 13 * f : o.pos === 'above' ? P.m.t - 6 * f : P.H - P.m.b - 6 * f;
      svgText(g, X + (left ? -6 : 6) * f, y, label, { class: 'lbl rule-lbl', 'text-anchor': left ? 'end' : 'start' });
    }
    return g;
  }
  /** Horizontal reference line (under the marks) with its label at the left or right end, above the line. */
  function hrule(P, y, label, o = {}) {
    const f = P.fs, Y = P.y(y);
    el('line', { class: 'rule-line', x1: P.m.l, x2: P.W - P.m.r, y1: Y, y2: Y, style: `stroke:${o.color || 'var(--ink-2)'}` + (o.dash === false ? '' : `;stroke-dasharray:${o.dash || '5 4'}`) }, el('g', { class: 'pk-rule' }, P.g.bg));
    const g = el('g', { class: 'pk-rule' }, P.g.top);
    if (label) {
      const left = o.side === 'left', low = Y > P.m.t + 22 * f;
      svgText(g, left ? P.m.l + 6 * f : P.W - P.m.r - 6 * f, low ? Y - 6 * f : Y + 15 * f, label, { class: 'lbl rule-lbl', 'text-anchor': left ? 'start' : 'end' });
    }
    return g;
  }
  /** A callout whose text sits directly above the point, joined by a straight vertical leader (for crowded squares). */
  function callout(P, x, y, text, ty, o = {}) {
    const f = P.fs, g = el('g', { class: 'pk-annot' }, P.g.top), n = text.split('\n').length;
    const X = P.x(x) + (o.dx || 0) * f, bottom = P.y(ty) + ((n - 1) * 1.25 * 13.5 + 6) * f;
    el('path', { class: 'leader', d: `M${P.x(x)} ${P.y(y)}V${bottom}`, style: 'stroke:var(--ink-2)' }, g);
    el('circle', { class: 'annot-dot', cx: P.x(x), cy: P.y(y), r: 2.6 * f, style: 'fill:var(--ink-2)' }, g);
    svgText(g, X, P.y(ty), text, { class: 'annot', 'text-anchor': o.anchor || 'middle' });
    return g;
  }
  /**
   * Horizontal bars whose category label sits left of the axis on wide hosts and above its bar on narrow
   * ones (phones), so long labels never squeeze the plot. rows: [{label, v, color, tip, text, kind:
   * 'solid'|'dashed'|'range', lo, hi, err, dim}]. o: {x, xticks, xfmt, xlabel, label, h, rowH, width,
   * valfmt, base, bitsAxis, m, narrow}. Returns {P, narrow, slot}.
   */
  function hbars(box, rows, o = {}) {
    const narrow = o.narrow ?? box.getBoundingClientRect().width < 560;
    const n = rows.length, rowH = o.rowH || (narrow ? 46 : 32);
    const m = Object.assign({ t: o.bitsAxis ? (narrow ? 42 : 30) : 16 }, narrow ? { l: 12 } : {}, o.m || {});
    const P = Plot(box, {
      w: o.w, ycats: narrow ? rows.map(() => '') : rows.map(r => r.label), x: o.x, xticks: o.xticks, xfmt: o.xfmt,
      h: o.h || rowH * n + (o.xlabel ? 48 : 30) + m.t, xlabel: o.xlabel, grid: 'x', label: o.label, m,
    });
    if (o.bitsAxis) bitsAxis(P, typeof o.bitsAxis === 'string' ? o.bitsAxis : undefined);
    const f = P.fs, slot = Math.abs(P.y(1) - P.y(0));
    const g = el('g', { class: 'pk-bars msr-hbars' }, P.g.data), hits = el('g', { class: 'pk-bar-hits' }, P.g.top);
    const base = o.base ?? Math.min(P.x0, P.x1);
    const vf = o.valfmt || (v => fmt(v, 4));
    rows.forEach((r, i) => {
      const yc = P.y(i);
      let y0, bh;
      if (narrow) {
        el('text', { x: P.m.l + 3 * f, y: yc - slot / 2 + 13 * f, class: 'lbl', text: r.label }, P.g.top);
        bh = Math.min(slot - 21 * f, 26 * f); y0 = yc - slot / 2 + 17 * f;
      } else { bh = Math.min((o.width || 22) * f, slot * 0.74); y0 = yc - bh / 2; }
      const lo = r.lo != null ? r.lo : base, hi = r.hi != null ? r.hi : r.v;
      const color = r.color || series(0), kind = r.kind || 'solid';
      let style = `fill:${color}`;
      if (kind === 'dashed') style = `fill:${color};fill-opacity:.16;stroke:${color};stroke-width:1.5;stroke-dasharray:5 4`;
      if (kind === 'range') style = `fill:${hatch(P, color)};stroke:${color};stroke-width:1.2;stroke-dasharray:4 3`;
      if (r.dim) style += ';opacity:.55';
      const p0 = P.x(lo), p1 = P.x(hi);
      const shape = kind === 'range'
        ? el('rect', { class: 'bar', x: Math.min(p0, p1), y: y0, width: Math.abs(p1 - p0), height: bh, rx: 3 * f, style }, g)
        : el('path', { class: 'bar', d: barPath(true, y0, bh, p0, p1, 4 * f), style }, g);
      if (r.err) {
        const yw = y0 + bh / 2, a = P.x(r.v - r.err), b = P.x(r.v + r.err), cap = Math.min(5 * f, bh / 2);
        const ws = 'stroke:var(--ink);stroke-width:1.5';
        el('line', { x1: a, x2: b, y1: yw, y2: yw, style: ws }, P.g.top);
        el('line', { x1: a, x2: a, y1: yw - cap, y2: yw + cap, style: ws }, P.g.top);
        el('line', { x1: b, x2: b, y1: yw - cap, y2: yw + cap, style: ws }, P.g.top);
      }
      const rightwards = p1 >= p0;
      const edge = rightwards ? Math.max(p1, r.err ? P.x(r.v + r.err) : -Infinity) : Math.min(p1, r.err ? P.x(r.v - r.err) : Infinity);
      const text = r.text != null ? r.text : vf(r.v);
      // a leftward bar whose label would run off the plot gets its label on the empty side of the base instead
      const fits = rightwards || edge - 6 * f - text.length * 6.4 * f >= P.m.l;
      if (text) el('text', { x: fits ? edge + (rightwards ? 6 : -6) * f : p0 + 6 * f, y: y0 + bh / 2 + 4 * f, 'text-anchor': rightwards || !fits ? 'start' : 'end', class: 'val', text }, P.g.top);
      const hit = el('rect', { class: 'hit', x: P.m.l, y: yc - slot / 2, width: P.pw, height: slot }, hits);
      hover(hit, () => r.tip || `<b>${esc(words(r.label))}</b><br>${text}`);
      hit.addEventListener('pointerenter', () => shape.classList.add('is-hot'));
      hit.addEventListener('pointerleave', () => shape.classList.remove('is-hot'));
    });
    return { P, narrow, slot };
  }
  const sub = (txt, cls = 'fig-note') => h('p', { class: cls, html: txt });
  const head = txt => h('div', { class: 'msr-head', text: txt });

  // ================================================================== VIII.1  msrHeadline — from 8 bits to 5
  FIG.msrHeadline = async (host) => {
    const [pd, ld, rd, md] = await Promise.all([data('points'), data('ladders'), data('reads'), data('memory')]);
    const lm = need(pd.landmarks, 'points.landmarks');
    const solo = num(lm.solo_ideal.ratio, 'landmarks.solo_ideal.ratio');
    const c1 = need(ld.c1.rows, 'ladders.c1.rows').find(r => r.coder === 34);
    need(c1, 'ladders.c1 row of compressor 34');
    const tbl = need(rd.every_entry_table, 'reads.every_entry_table');
    const row = (track) => need(tbl.find(r => r.track === track), `reads.every_entry_table ${track}`);
    const r4k = row('s-layer-b4k-r293'), r5 = row('st02n5-layer-b4k-r293'), r16 = row('s-layer-b16k-r293');
    const floor = num(md.floors.block_16k.ratio, 'memory.floors.block_16k.ratio');
    const GO = 0.75;                                       // the plan's decision rule: go when the gain over solo reaches 0.75 bit (plan-decision-rule)
    const ver = r => `${r.verified ? 'verified' : 'not verified'}, every cherry counted cold`;
    const rows = [
      { label: 'raw FP8, one byte', v: 8, ratio: 1, color: NEUTRAL, tip: '<b>raw</b><br>every element stored as its byte: 8 bits, ratio 1.0' },
      { label: 'solo ideal, six layers', v: bits(solo), ratio: solo, color: NEUTRAL, tip: `<b>solo ideal</b><br>${rb(solo)}<br>per-furrow order-0 entropy of the values, all six layers (tables uncharged); the landmark of the stretch-4096 screens` },
      { label: 'C1 ladder top · KV layer 0 (L3) h0, stretch 4096', v: bits(c1.ratio), ratio: c1.ratio, color: splitColor('head'), tip: `<b>C1 · compressor ${c1.coder} ${esc(words(c1.name))}</b> · ${c1.trial}<br>${rb(c1.ratio)}<br>values of KV layer 0 (the LLM’s layer 3), head 0 · stretch 4096 · no leash · two dev sequences<br>${perSeq(c1.per_sequence)}` },
      { label: 'C2 · cherry (2, 256), stretch 4096, 2 seq', v: bits(r4k.ratio), ratio: r4k.ratio, color: splitColor('layer'), tip: `<b>C2 · compressor ${r4k.coder} ${esc(words(r4k.name))}</b> · ${r4k.trial}<br>${rb(r4k.ratio)}<br>${esc(words(r4k.screen))} · ${ver(r4k)}<br>${readsOf(r4k)}` },
      { label: 'C2 · cherry (2, 256), stretch 4096, 5 seq', v: bits(r5.ratio), ratio: r5.ratio, color: splitColor('layer'), tip: `<b>C2 · compressor ${r5.coder} ${esc(words(r5.name))}</b> · ${r5.trial}<br>${rb(r5.ratio)}<br>${esc(words(r5.screen))} · ${ver(r5)}<br>${readsOf(r5)}` },
      { label: 'C2 · cherry (2, 256), stretch 16 384, 2 seq', v: bits(r16.ratio), ratio: r16.ratio, color: splitColor('layer'), tip: `<b>C2 · compressor ${r16.coder} ${esc(words(r16.name))}</b> · ${r16.trial}<br>${rb(r16.ratio)}<br>${esc(words(r16.screen))} · ${ver(r16)}<br>${readsOf(r16)}` },
      { label: 'punnet floor · estimate', v: bits(floor), ratio: floor, kind: 'dashed', color: EST, tip: `<b>punnet floor at stretch 16 384 · code-length estimate</b><br>≈ ${rb(floor, 2)}<br>${esc(words(md.floors.block_16k.grade))} — an estimate, not a compressor` },
    ].map(r => Object.assign(r, { text: `${fmt(r.v, 2)} (${fmt(r.ratio, r.ratio === 1 ? 1 : 4)})` }));
    const box = h('div');
    const kA = kpi('best verified at stretch 4096', fmt(r4k.ratio, 4), `${fb(r4k.ratio)} · compressor ${r4k.coder}, two sequences`, splitColor('layer'));
    const kB = kpi('gain over solo', `${fmt(bits(solo - r4k.ratio), 2)} bits`, `at stretch 4096; ${fmt(bits(solo - r16.ratio), 2)} bits at stretch 16 384`, splitColor('layer'));
    const kC = kpi('the plan asked for', `${fmt(GO, 2)} bit`, 'go threshold: solo − 0.75 bit (IX, decision rule)');
    host.append(legend([
      ['C1: KV layer 0 (L3), head 0, cherry (256,)', splitColor('head'), 'box'], ['C2: cherry (2, 256)', splitColor('layer'), 'box'],
      ['landmarks (raw, solo)', NEUTRAL, 'box'], ['estimate (code-length)', EST, 'dash'], ['solo minus 0.75 bit', 'var(--ink-2)', 'dash']]), box,
      h('div', { class: 'kpis' }, kA, kB, kC));
    const { P } = hbars(box, rows, { x: [0, 9.6], xticks: [0, 2, 4, 6, 8], xlabel: 'bits per element of one value (ratio in brackets)', m: { t: 24 }, width: 24,
      label: 'Bits per element: raw, solo ideal, the campaigns’ best verified results and the code-length floor' });
    vrule(P, bits(solo) - GO, `go threshold: solo − ${fmt(GO, 2)} bit = ${fmt(bits(solo) - GO, 2)}`, { pos: 'above' });
  };

  // ================================================================== VIII.2  msrTensor — one sequence's value tensor
  FIG.msrTensor = (host) => {
    // Geometry of the data (PART-XI-SPEC §1.1; targets/02 README): 6 KV layers × 2 heads × 256 elements, one byte per element at FP8.
    const LAYERS = [3, 7, 11, 15, 19, 23], HEADS = 2, CH = 256, BLOCK = 4096;
    const TOK = 228144;                 // tokens of sequence 0 (sequences run 219,678–229,360); 228,144 × 3072 = 700,858,368 bytes
    const TOTAL = 6806453, SEQS = 30;    // tokens of all thirty sequences of target 02: 6,806,453 × 3072 ≈ 20.9 GB
    const BYTES = { head: CH, layer: CH * HEADS, token: CH * HEADS * LAYERS.length };
    const PER_BLOCK = { head: BLOCK * HEADS * LAYERS.length, layer: BLOCK * LAYERS.length, token: BLOCK };
    const NAME = { head: 'one head', layer: 'one layer, both heads', token: 'one token, all six layers' };
    const seqBytes = TOK * BYTES.token, allBytes = TOTAL * BYTES.token;
    const MB = v => `${fmt(v / 1e6, 1)} MB`, GB = v => `${fmt(v / 1e9, 1)} GB`;
    let sel = 'all';
    const box = h('div'), ro = readout();
    const kS = kpi('one sequence', MB(seqBytes), `${TOK.toLocaleString('en-GB')} tokens × ${BYTES.token} B`);
    const kD = kpi('thirty sequences', GB(allBytes), `${TOTAL.toLocaleString('en-GB')} tokens, values only`);
    const sw = seg([['all', 'all three shapes'], ['head', '(256,)'], ['layer', '(2, 256)'], ['token', '(6, 2, 256)']], sel, v => select(v), 'cherry shape');
    host.append(controls(sw), legend([
      ['head 0 band', 'color-mix(in srgb, var(--ink) 7%, var(--paper-3))', 'box'], ['head 1 band', 'color-mix(in srgb, var(--ink) 16%, var(--paper-3))', 'box'],
      ...splitLegend(['head', 'layer', 'token'], 'box')]), box, ro, h('div', { class: 'kpis' }, kS, kD),
      sub('One column stands for one token position; a real column would be a hair’s width of the 228K.'));
    const D = Diagram(box, { w: 640, h: 300, grow: 0.5, label: 'The value tensor of one sequence: tokens along the long axis, six layers of two heads as bands, 256 elements deep; three cherry shapes outlined' });
    const f = D.fs, W = D.W, H = D.H;
    const x0 = 74 * f, x1 = W - 34 * f, y0 = 66 * f, y1 = H - 40 * f;
    const dx = 14 * f, dy = 9 * f, nb = LAYERS.length * HEADS, bh = (y1 - y0) / nb, bw = x1 - x0;
    const g = el('g', {}, D.svg);
    // the box: top and right faces for depth (furrows), then the 12 bands
    el('path', { d: `M${x0} ${y0}L${x0 + dx} ${y0 - dy}H${x1 + dx}L${x1} ${y0}Z`, style: 'fill:color-mix(in srgb, var(--ink) 22%, var(--paper-3));stroke:var(--ink-3);stroke-width:1' }, g);
    el('path', { d: `M${x1} ${y0}L${x1 + dx} ${y0 - dy}V${y1 - dy}L${x1} ${y1}Z`, style: 'fill:color-mix(in srgb, var(--ink) 30%, var(--paper-3));stroke:var(--ink-3);stroke-width:1' }, g);
    for (let i = 0; i < nb; i++) {
      const hd = i % HEADS;
      el('rect', { x: x0, y: y0 + i * bh, width: bw, height: bh, style: `fill:color-mix(in srgb, var(--ink) ${hd ? 16 : 7}%, var(--paper-3));stroke:var(--ink-3);stroke-width:${hd ? 0.5 : 1};stroke-opacity:${hd ? 0.5 : 0.9}` }, g);
    }
    el('rect', { x: x0, y: y0, width: bw, height: y1 - y0, style: 'fill:none;stroke:var(--ink-2);stroke-width:1.2' }, g);
    LAYERS.forEach((L, k) => el('text', { x: x0 - 6 * f, y: y0 + (k * HEADS + 1) * bh + 4 * f, 'text-anchor': 'end', class: 'lbl', text: `layer ${L}` }, g));
    const cx = x1 + dx + 11 * f, cy = (y0 + y1) / 2 - dy / 2;
    el('text', { x: cx, y: cy, 'text-anchor': 'middle', class: 'lbl', transform: `rotate(90 ${cx} ${cy})`, text: `${CH} elements deep` }, g);
    // the token axis under the box
    const ay = y1 + 16 * f;
    arrow(g, x0, ay, x1, ay, 'var(--ink-3)', 1.2);
    el('text', { x: x0, y: ay + 14 * f, class: 'lbl', text: `tokens 1 … ${TOK.toLocaleString('en-GB')} of one sequence` }, g);
    // the three cuts, each one token column wide (exaggerated)
    const cw = Math.max(7 * f, 9);
    const CUTS = {
      head: { x: x0 + bw * 0.2, b0: 0, nbands: 1, row: 2 },
      layer: { x: x0 + bw * 0.5, b0: 2, nbands: 2, row: 1 },
      token: { x: x0 + bw * 0.8, b0: 0, nbands: nb, row: 2 },
    };
    const cutEls = {};
    for (const [k, c] of Object.entries(CUTS)) {
      const cg = el('g', { class: 'msr-cut', tabindex: 0, role: 'button', 'aria-label': `${NAME[k]}: ${BYTES[k]} bytes per cherry` }, D.svg);
      const col = splitColor(k), yy = y0 + c.b0 * bh, hh = c.nbands * bh;
      el('rect', { x: c.x, y: yy, width: cw, height: hh, style: `fill:${col};fill-opacity:.9;stroke:${col};stroke-width:1.5` }, cg);
      const ly = y0 - dy - (c.row === 1 ? 30 : 12) * f;
      el('line', { x1: c.x + cw / 2, x2: c.x + cw / 2, y1: ly + 4 * f, y2: yy, style: `stroke:${col};stroke-width:1.2;stroke-dasharray:3 3` }, cg);
      el('text', { x: c.x + cw / 2, y: ly, 'text-anchor': 'middle', class: 'lbl', text: `${k === 'layer' ? 'one layer' : k === 'head' ? 'one head' : 'one token'} · ${BYTES[k]} B` }, cg);
      cg.rect = cg.firstChild;
      cg.addEventListener('click', () => { select(sel === k ? 'all' : k); sw.set(sel); });
      cg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(sel === k ? 'all' : k); sw.set(sel); } });
      hover(cg, () => `<b>${NAME[k]}</b><br>${BYTES[k]} bytes per cherry · ${PER_BLOCK[k].toLocaleString('en-GB')} cherries per punnet at stretch 4096`);
      cutEls[k] = cg;
    }
    function select(v) {
      sel = v;
      for (const [k, cg] of Object.entries(cutEls)) {
        const on = sel === 'all' || sel === k;
        cg.style.opacity = on ? 1 : 0.3;
        cg.rect.style.stroke = sel === k ? 'var(--ink)' : splitColor(k);
        cg.rect.style.strokeWidth = sel === k ? 2.5 : 1.5;
      }
      if (sel === 'all') ro.set([['bytes per cherry', `head ${BYTES.head} · layer ${BYTES.layer} · token ${BYTES.token}`], ['cherries per punnet', `${PER_BLOCK.head.toLocaleString('en-GB')} · ${PER_BLOCK.layer.toLocaleString('en-GB')} · ${PER_BLOCK.token.toLocaleString('en-GB')}`], ['one sequence', MB(seqBytes)], [`${SEQS} sequences`, GB(allBytes)]]);
      else ro.set([['cherry', `${NAME[sel]}: ${BYTES[sel]} B`], ['per punnet (stretch 4096)', `${PER_BLOCK[sel].toLocaleString('en-GB')} cherries`], ['one sequence', `${(TOK * (BYTES.token / BYTES[sel])).toLocaleString('en-GB')} cherries · ${MB(seqBytes)}`], [`${SEQS} sequences`, GB(allBytes)]]);
    }
    select(sel);
  };

  // ================================================================== IV.8  msrCurve — the compressibility square
  FIG.msrCurve = async (host) => {
    const [pd, sd] = await Promise.all([data('points'), data('splits')]);
    const pts = need(pd.points, 'points.points'), lm = need(pd.landmarks, 'points.landmarks');
    const solo = num(lm.solo_ideal.ratio, 'landmarks.solo_ideal.ratio');
    // compressor 129 by cherry shape (verified ledger rows): the ringed layer-screen point of the caption lives here, not in STATUS
    const extra = need(sd.coder_129_by_split.rows, 'splits.coder_129_by_split.rows')
      .filter(r => !pts.some(p => p.coder === 129 && p.split === r.split && p.b === 4096))
      .map(r => ({ track: `s-${r.split}-b4k-r293`, split: r.split, b: 4096, budget: 293, coder: 129, name: 'pure-wls', ratio: r.ratio, x: r.x, y: r.y, reads: r.reads, trial: r.trial, verified: r.verified, campaign: 'C2', role: '129 by split', layers: 'all six', n_sequences: 2 }));
    const all = pts.concat(extra);
    const is129 = p => p.coder === 129 && p.split === 'layer';
    const is109 = p => p.coder === 109 && p.b === 512;
    let show = 'both';
    const box = h('div', { class: 'msr-square' }), ro = readout();
    const sw = seg([['both', 'C1 and C2'], ['C2', 'C2 only'], ['C1', 'C1 only']], show, v => { show = v; draw(); }, 'campaign');
    const anyUnverified = all.some(p => !p.verified);
    host.append(controls(sw), legend([...splitLegend(), ['baseline: dictionary share + delta share = 1', 'var(--ink-2)', 'line'], [`solo ideal ${fmt(solo, 3)}`, 'var(--ink-2)', 'dash'], ['constant ratio', 'var(--ink-3)', 'line'],
      ...(anyUnverified ? [['not verified (ring)', 'var(--ink-2)', 'dot']] : [])]), box, ro,
      sub('Click or tap a point to read it out; hover for the full record. Every point is a ledger row; C1 points are values of KV layer 0 (L3), head 0 only.'));
    const P = Plot(box, { w: 520, h: 520, x: [0, 1], y: [0, 1], equal: true, xlabel: 'dictionary share  w / b', ylabel: 'delta share  ρ', grid: false,
      xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1], label: 'The compressibility square: dictionary share against delta share for every verified record' });
    const f = P.fs;
    // static geometry in the background layer: iso-lines of constant ratio, the baseline and the solo line
    const iso = (r, style, labelAt, text) => {
      el('line', { x1: P.x(0), y1: P.y(r), x2: P.x(r), y2: P.y(0), style }, P.g.bg);
      if (text) { const X = P.x(r * labelAt), Y = P.y(r * (1 - labelAt)); el('text', { x: X, y: Y - 4 * f, 'text-anchor': 'middle', class: 'lbl', transform: `rotate(-45 ${X} ${Y})`, text }, P.g.bg); }
    };
    // labels sit where no compressor can be: 0.9 and 0.8 near the x axis, 0.7 and 0.6 near the y axis, the baseline in its empty upper half
    [[0.9, 0.85], [0.8, 0.85], [0.7, 0.2], [0.6, 0.2]].forEach(([r, t]) => iso(r, 'stroke:var(--ink-3);stroke-width:1;opacity:.5', t, fmt(r, 1)));
    iso(1, 'stroke:var(--ink-2);stroke-width:1.6', 0.35, 'baseline  x + y = 1');
    iso(solo, 'stroke:var(--ink-2);stroke-width:1.4;stroke-dasharray:6 5', 0, null);
    el('text', { x: P.x(solo) + 5 * f, y: P.y(0) - 6 * f, class: 'lbl', text: `solo ideal ${fmt(solo, 3)}` }, P.g.bg);
    const tip = p => `<b>compressor ${p.coder} ${esc(words(p.name))}</b> · ${p.campaign}${p.role && p.role !== 'incumbent' ? ` · ${esc(words(p.role))}` : ''}<br>`
      + `scenario: V · all · ${SPLIT_LABEL[splitKey(p.split)].replace(/:.*$/, '')}${p.split !== splitKey(p.split) ? ` (${esc(p.split)})` : ''} · stretch ${p.b} · ${p.budget ? `leash ${p.budget}` : 'no leash'} (${esc(words(p.track))})<br>`
      + `ratio <b>${fmt(p.ratio, 4)}</b> = x ${fmt(p.x, 3)} + y ${fmt(p.y, 3)} · ${fb(p.ratio)}<br>${readsOf(p)}<br>${p.trial} · ${p.verified ? 'verified' : 'not verified'}${p.layers ? ` · ${esc(words(p.layers))}` : ''}`;
    const pick = p => ro.set([[`compressor ${p.coder}`, `${esc(words(p.name))} · ${p.campaign} · ${esc(words(p.track))}`], ['ratio', `${fmt(p.ratio, 4)} = ${fmt(p.x, 3)} + ${fmt(p.y, 3)} · ${fb(p.ratio)}`], ['reads', p.reads ? `worst ${fmt(p.reads.max, 0)} · mean ${fmt(p.reads.mean, 0)}` : '—'], ['trial', p.trial]]);
    function draw() {
      P.clear();
      const vis = all.filter(p => show === 'both' || p.campaign === show);
      // draw C1 first so the C2 incumbents sit on top where they overlap
      vis.sort((a, b) => (a.campaign === 'C1' ? 0 : 1) - (b.campaign === 'C1' ? 0 : 1)).forEach(p => {
        const col = splitColor(p.split), X = P.x(p.x), Y = P.y(p.y), ring = is129(p) || is109(p);
        if (ring) el('circle', { cx: X, cy: Y, r: 9.5 * f, style: 'fill:none;stroke:var(--ink);stroke-width:1.6' }, P.g.data);
        const c = el('circle', { class: 'dot msr-pt', cx: X, cy: Y, r: (p.campaign === 'C1' ? 4.4 : 5.2) * f, tabindex: ring ? 0 : null,
          style: p.verified ? `fill:${col}` : `fill:var(--paper-3);stroke:${col};stroke-width:2` }, P.g.data);
        hover(c, () => tip(p));
        c.addEventListener('click', () => pick(p));
      });
      // callout text lives in the empty triangle above the baseline (x + y > 1 is impossible for a compressor)
      const a129 = vis.find(is129), a109 = vis.find(is109);
      if (a129) annotate(P, a129.x, a129.y, `compressor 129: no reference cherries,\n1–4 % in the dictionary · ${fmt(a129.ratio, 4)}`, { dx: (P.x(0.2) - P.x(a129.x)) / f, dy: (P.y(0.86) - P.y(a129.y)) / f, anchor: 'start' });
      if (a109) callout(P, a109.x, a109.y, `compressor 109: every cherry in\nthe dictionary, delta share 0 · ${fmt(a109.ratio, 4)}`, 0.42);
      const best = vis.find(p => p.track === 's-layer-b4k-r293' && p.coder === 121) || vis.slice().sort((a, b) => a.ratio - b.ratio)[0];
      if (best) pick(best);
    }
    draw();
  };

  // ================================================================== VIII.4  msrLadderC1 — Night one, the twin ladder
  FIG.msrLadderC1 = async (host) => {
    const ld = await data('ladders');
    const rows = need(ld.c1.rows, 'ladders.c1.rows'), lm = need(ld.c1.landmarks, 'ladders.c1.landmarks');
    const soloL3 = num(lm.solo_ideal, 'ladders.c1.landmarks.solo_ideal'), base = num(lm.baseline, 'ladders.c1.landmarks.baseline');
    const blocks = need(ld.blocks.c1.points, 'ladders.blocks.c1.points');
    const SHORT = { 9: 'solo: per-furrow stats', 4: 'nearest earlier cherry', 15: 'recursive references', 17: 'coded along own tree', 19: '8 match-quality classes', 21: 'shrink to the reference', 23: 'k-medoid references', 27: 'one stream per level', 30: 'copy-shrink', 34: 'MST internal nodes', 37: 'lean tables', 43: 'all in the dictionary' };
    let view = 'ladder';
    const box = h('div'), col = splitColor('head');
    const sw = seg([['ladder', 'the ladder at stretch 4096'], ['punnets', 'stretch length 512 → 32K']], view, v => { view = v; draw(); }, 'view');
    const kTop = kpi('ladder top (compressor 34)', fmt(rows.find(r => r.coder === 34).ratio, 4), `${fb(rows.find(r => r.coder === 34).ratio)} · from solo ${fmt(rows[0].ratio, 4)}`, col);
    const kGain = kpi('gain over solo coding', `${fmt(bits(rows[0].ratio - rows.find(r => r.coder === 34).ratio), 2)} bits`, 'compressor 09 → 34, same screen, same punnets', col);
    const kBlk = kpi('stretch length', `${fmt(blocks[0].ratio, 4)} → ${fmt(blocks[blocks.length - 1].ratio, 4)}`, `${tokFmt(blocks[0].b)} → ${tokFmt(blocks[blocks.length - 1].b)} tokens, compressor 34’s family`, col);
    host.append(controls(sw), legend([['values of KV layer 0 (L3), head 0 · cherry (256,) · FP8 · stretch 4096 · two dev sequences', col, 'box'], ['set aside by C1 (stream compression)', col, 'dash'], [`solo ideal ${fmt(soloL3, 4)} · baseline ${fmt(base, 1)}`, 'var(--ink-2)', 'dash']]),
      box, h('div', { class: 'kpis' }, kTop, kGain, kBlk), sub('The axis starts at 0.6: bar lengths compare only above that. Hover a bar for its trial id.'));
    function draw() {
      box.replaceChildren();
      if (view === 'ladder') {
        const R = rows.map(r => ({
          label: `${String(r.coder).padStart(2, '0')} · ${SHORT[r.coder] || r.step.slice(0, 24)}`, v: r.ratio, color: col, kind: r.set_aside ? 'dashed' : 'solid',
          tip: `<b>compressor ${r.coder} ${esc(words(r.name))}</b> · ${r.trial}${r.trial_in_spec ? ` (spec: ${r.trial_in_spec})` : ''}<br>${esc(words(r.step))}<br>ratio <b>${fmt(r.ratio, 5)}</b> · ${fb(r.ratio)} · x ${fmt(r.x, 3)} + y ${fmt(r.y, 3)}<br>${perSeq(r.per_sequence)}${r.set_aside_note ? `<br><i>${esc(words(r.set_aside_note))}</i>` : ''}`,
        }));
        const { P } = hbars(box, R, { x: [0.6, 1.03], xticks: [0.6, 0.7, 0.8, 0.9, 1.0], xlabel: 'MDL ratio at stretch 4096 (axis from 0.6)', bitsAxis: true, label: 'C1’s ladder: MDL ratio of each compressor on values of KV layer 0 (L3), head 0' });
        vrule(P, soloL3, `solo ideal ${fmt(soloL3, 4)}`, { pos: 'bottom' });
        vrule(P, base, `baseline ${fmt(base, 1)}`, { pos: 'top', side: 'left' });
      } else {
        const R = blocks.map(p => ({ label: `${tokFmt(p.b)} tokens · compressor ${p.coder}`, v: p.ratio, color: col,
          tip: `<b>stretch ${p.b} tokens</b> · compressor ${p.coder} · ${p.trial}<br>${esc(words(p.track))}<br>ratio <b>${fmt(p.ratio, 5)}</b> · ${fb(p.ratio)} · x ${fmt(p.x, 3)} + y ${fmt(p.y, 3)}` }));
        const { P } = hbars(box, R, { x: [0.6, 0.83], xticks: [0.6, 0.65, 0.7, 0.75, 0.8], xlabel: 'MDL ratio by stretch length, compressor 34’s family (axis from 0.6)', bitsAxis: true, label: 'C1: MDL ratio against stretch length on values of KV layer 0 (L3), head 0' });
        vrule(P, soloL3, `solo ideal ${fmt(soloL3, 4)}`, { pos: 'bottom', side: 'left' });
      }
    }
    draw();
  };

  // ================================================================== VIII.5  msrLadderC2 — from 0.690 to 0.636 on one screen
  FIG.msrLadderC2 = async (host) => {
    const ld = await data('ladders');
    const rows = need(ld.c2.rows, 'ladders.c2.rows'), five = need(ld.c2.five_sequences, 'ladders.c2.five_sequences');
    const solo = num(ld.c2.landmarks.solo_ideal, 'ladders.c2.landmarks.solo_ideal');
    const SHORT = { 'r7-t0002': 'C1’s tree, both heads', 'r7-t0001': '+ cross-head prediction', 'r7-t0003': 'terms chosen one by one', 'r11-t0001': 'any earlier element', 'r11-t0003': 'cheaper positions', 'r11-t0002': 'laid out along paths', 'r22-t0001': 'tree after prediction', 'r22-t0003': 'bit-cost rounding', 'r20-t0001': 'blend ancestor errors', 'r22-t0005': 'head 0 first, no order', 'env-t0096': '+ refit slopes and tree' };
    const col = splitColor('layer');
    const colOf = r => (CODER[r.coder] || col);
    const boxA = h('div'), boxB = h('div'), ro = readout();
    const last = rows[rows.length - 1];
    host.append(legend([['cherry (2, 256), stretch 4096, leash 293, two dev sequences', col, 'box'], ['compressor 102', CODER[102], 'box'], ['compressor 121', CODER[121], 'box'], ['side branch off 102 (compressor 126)', col, 'dash']]),
      h('div', { class: 'msr-row msr-row-32' }, h('div', {}, head('the ladder, every rung verified'), boxA), h('div', {}, head('121 against 102 on five sequences of target 02'), boxB)), ro,
      sub(`Solo ideal on this screen: ${fmt(solo, 4)} (${fb(solo)}); the axis starts at 0.6. Hover a bar or a point for its trial id.`));
    const R = rows.map(r => ({
      label: `${r.coder} · ${SHORT[r.trial] || r.what.slice(0, 23)}`, v: r.ratio, color: colOf(r), kind: r.side_branch ? 'dashed' : 'solid',
      tip: `<b>compressor ${r.coder} ${esc(words(r.name))}</b> · ${r.trial}<br>${esc(words(r.what))}<br>ratio <b>${fmt(r.ratio, 5)}</b> · ${fb(r.ratio)} · x ${fmt(r.x, 3)} + y ${fmt(r.y, 3)}<br>${perSeq(r.per_sequence)}<br>${readsOf(r)}${r.every_entry ? ' (every cherry)' : ' (sampled)'}${r.side_branch ? `<br><i>${esc(words(r.side_branch))}</i>` : ''}`,
    }));
    hbars(boxA, R, { w: fitW(boxA), x: [0.6, 0.72], xticks: [0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.72], xfmt: v => fmt(v, 2), xlabel: 'MDL ratio on the layer screen (axis from 0.6)', bitsAxis: true, label: 'C2’s ladder on the layer screen' });
    // paired points: 102 and 121 on each of the five sequences
    const seqs = need(five.sequences, 'five_sequences.sequences');
    const a = need(five.coder_102, 'five_sequences.coder_102'), b = need(five.coder_121, 'five_sequences.coder_121'), d = need(five.paired_difference, 'five_sequences.paired_difference');
    const vals = seqs.flatMap(s => [num(a.per_sequence[s], `102 per_sequence ${s}`), num(b.per_sequence[s], `121 per_sequence ${s}`)]);
    const [lo, hi] = extent(vals), pad = (hi - lo) * 0.25;
    const PB = Plot(boxB, { w: fitW(boxB), xcats: seqs, y: [lo - pad * 1.6, hi + pad], h: 300, ylabel: 'MDL ratio', xlabel: 'sequence of target 02', grid: 'y', yn: 5, yfmt: v => fmt(v, 3), m: { r: 14 }, label: 'Compressor 121 against compressor 102 on five sequences, paired' });
    const fB = PB.fs;
    seqs.forEach((s, i) => {
      const ya = a.per_sequence[s], yb = b.per_sequence[s], X = PB.x(i);
      el('line', { x1: X, x2: X, y1: PB.y(ya), y2: PB.y(yb), style: 'stroke:var(--ink-3);stroke-width:1.5' }, PB.g.data);
      const da = dot(PB.g.data, X, PB.y(ya), 5 * fB, CODER[102], { class: 'dot' });
      const db = dot(PB.g.data, X, PB.y(yb), 5 * fB, CODER[121], { class: 'dot' });
      hover(da, () => `<b>compressor 102 path-rows</b> · ${a.trial} · ${seqName(s)}<br>ratio ${fmt(ya, 5)} · ${fb(ya)}<br>mean of five ${fmt(a.ratio, 5)} · reads mean ${fmt(a.reads_mean, 0)} (sampled)`);
      hover(db, () => `<b>compressor 121 stack-rows</b> · ${b.trial} · ${seqName(s)}<br>ratio ${fmt(yb, 5)} · ${fb(yb)}<br>mean of five ${fmt(b.ratio, 5)} · reads mean ${fmt(b.reads_mean, 0)} (every cherry)`);
      el('text', { x: X, y: PB.y(Math.min(ya, yb)) + 16 * fB, 'text-anchor': 'middle', class: 'val', text: fmtS(d.per_sequence[s], 4) }, PB.g.top);
    });
    ro.set([['121 − 102, mean of five', `${fmtS(d.mean, 5)} (${fmtS(bits(d.mean), 3)} bits)`], ['spread over sequences', `SD ${fmt(d.sd, 5)}`], ['the sequences themselves', `${fmt(lo, 4)} to ${fmt(hi, 4)}`], ['ladder', `${fmt(rows[0].ratio, 4)} → ${fmt(last.ratio, 4)}, ${fmt(bits(rows[0].ratio - last.ratio), 2)} bits in ${rows.length - 1} steps`]]);
  };

  // ================================================================== VIII.5  msrShuffle — trust, but shuffle
  FIG.msrShuffle = async (host) => {
    const sd = await data('splits');
    const sh = need(sd.shuffle, 'splits.shuffle');
    const tree = need(sh.tree_coder, 'shuffle.tree_coder'), tree2 = need(sh.tree_coder_other_slice, 'shuffle.tree_coder_other_slice');
    const pred = need(sh.prediction_gain, 'shuffle.prediction_gain');
    const REAL = series(5), SHUF = series(3);
    const boxA = h('div'), boxB = h('div');
    const kT = kpi('reference tree, shuffled', `${fmt(tree.original, 4)} → ${fmt(tree.shuffled, 4)}`, `+${fmt(bits(tree.shuffled - tree.original), 2)} bits: ${esc(words(tree.note || 'the repeats were the text’s'))}`, SHUF);
    const kP = kpi('prediction gain, shuffled', `${fmtS(pred[0].original, 4)} → ${fmtS(pred[0].shuffled, 4)}`, 'barely moves: the geometry is the LLM’s', REAL);
    host.append(legend([['real punnets', REAL, 'box'], ['shuffled punnets (a KV layer’s tokens drawn at random across sequences, heads kept together)', SHUF, 'box']]),
      h('div', { class: 'fig-row' }, h('div', {}, head('the reference-tree compressor: MDL ratio'), boxA), h('div', {}, head('linear prediction: gain in ratio (negative is a saving)'), boxB)),
      h('div', { class: 'kpis' }, kT, kP), sub(`Encoder bytes, not isolated-verified: ${esc(words(sh.grade))}.`));
    const catsA = [`${tree.windows} windows`, `${tree2.windows}-window slice`];
    const PA = Plot(boxA, { w: fitW(boxA), xcats: catsA, y: [0.6, 0.8], h: 280, grid: 'y', ylabel: 'MDL ratio (axis from 0.6)', yfmt: v => fmt(v, 2), label: 'Reference-tree compressor on real and on shuffled punnets' });
    bars(PA, [[tree.original, tree.shuffled], [tree2.original, tree2.shuffled]], { colors: [REAL, SHUF], base: 0.6, labels: v => fmt(v, 4), width: 40,
      tip: (v, i, j) => `<b>${j ? 'shuffled' : 'real'} punnets</b> · ${esc(words(i ? tree2.label : tree.label))}<br>ratio ${fmt(v, 4)} · ${fb(v)}<br>${i ? tree2.windows : tree.windows} windows` });
    hrule(PA, 0.778, 'solo ideal 0.778', { side: 'left' });
    const catsB = pred.map(p => `compressor ${p.coder}`);
    const PB = Plot(boxB, { w: fitW(boxB), xcats: catsB, y: [-0.04, 0.004], h: 280, grid: 'y', ylabel: 'gain in ratio', yfmt: v => fmtS(v, 3), label: 'Linear-prediction gain on real and on shuffled punnets' });
    bars(PB, pred.map(p => [p.original, p.shuffled]), { colors: [REAL, SHUF], labels: v => fmtS(v, 4), width: 40,
      tip: (v, i, j) => `<b>${j ? 'shuffled' : 'real'} punnets</b> · compressor ${pred[i].coder}, ${esc(words(pred[i].label))}<br>gain ${fmtS(v, 4)} of ratio · ${fmtS(bits(v), 3)} bits<br>${pred[i].windows} windows` });
    rule(PB, { y: 0, dash: false, color: 'var(--ink-3)' });
  };

  // ================================================================== VIII.6  msrSplits — how to cut the tensor
  FIG.msrSplits = async (host) => {
    const sd = await data('splits');
    const sw = need(sd.same_window, 'splits.same_window'), adj = need(sd.adjacent_tokens, 'splits.adjacent_tokens');
    const joins = need(sw.joins, 'same_window.joins'), c129 = need(sd.coder_129_by_split.rows, 'splits.coder_129_by_split.rows');
    const j1 = need(joins.find(j => j.from === 'head' && j.to === 'layer'), 'join head→layer'), j2 = need(joins.find(j => j.from === 'layer' && j.to === 'token'), 'join layer→token');
    const tree102 = need(sd.cast && sd.cast.tree_102, 'splits.cast.tree_102');
    const boxA = h('div'), boxB = h('div');
    const kH = kpi('(256,) → (2, 256)', fmtS(j1.delta, 4), `${fmtS(bits(j1.delta), 2)} bits · ${esc(words(j1.agree))} sequences`, splitColor('layer'));
    const kL = kpi('(2, 256) → (6, 2, 256)', fmtS(j2.delta, 4), `${fmtS(bits(j2.delta), 2)} bits · ${esc(words(j2.agree))}; understated by ≈ ${fmt(j2.understated_by, 3)}`, splitColor('token'));
    const kT = kpi('adjacent tokens joined', `${fmtS(adj.loss_vs_layer.tok2, 3)} · ${fmtS(adj.loss_vs_layer.tok4, 3)}`, '2 · 4 adjacent tokens, against the same compressor on (2, 256) cherries', splitColor('other'));
    host.append(legend([...splitLegend(['layer', 'token'], 'box'), ['adjacent tokens joined (tok2, tok4)', splitColor('other'), 'box'], ['spread over sequences (whisker)', 'var(--ink)', 'line'], ...splitLegend(['head']), [`tree compressor 102 on the layer screen, ${fmt(tree102, 4)}`, CODER[102], 'dash']]),
      h('div', { class: 'fig-row' },
        h('div', {}, head('(a) joining cherries: change in MDL ratio, same window'), boxA),
        h('div', {}, head('(b) compressor 129 (no reference tree) by cherry shape'), boxB)),
      h('div', { class: 'kpis' }, kH, kL, kT),
      sub(`(a) ${esc(words(sw.grade))}; the tok2/tok4 rows are ${esc(words(adj.grade))}, trial ${adj.trial}. (b) ${esc(words(sd.coder_129_by_split.note))}.`));
    const RA = [
      { label: '(256,) → (2, 256)', v: j1.delta, err: j1.spread, color: splitColor('layer'), text: `${fmtS(j1.delta, 4)} ± ${fmt(j1.spread, 4)}`, tip: `<b>joining the two heads of a layer</b><br>${fmtS(j1.delta, 5)} of ratio (${fmtS(bits(j1.delta), 3)} bits), spread ${fmt(j1.spread, 5)}, ${esc(words(j1.agree))} sequences<br>compressor ${sw.means.head.coder}: head ${fmt(sw.means.head.ratio, 4)} → layer ${fmt(sw.means.layer.ratio, 4)}` },
      { label: '(2, 256) → (6, 2, 256)', v: j2.delta, err: j2.spread, color: splitColor('token'), text: `${fmtS(j2.delta, 4)} ± ${fmt(j2.spread, 4)}`, tip: `<b>joining all six layers of a token</b><br>${fmtS(j2.delta, 5)} of ratio (${fmtS(bits(j2.delta), 3)} bits), spread ${fmt(j2.spread, 5)}, ${esc(words(j2.agree))} sequences<br>layer ${fmt(sw.means.layer.ratio, 4)} (compressor ${sw.means.layer.coder}) → token ${fmt(sw.means.token.ratio, 4)} (compressor ${sw.means.token.coder})<br><i>${esc(words(j2.note))}</i>` },
      { label: '2 adjacent tokens (tok2)', v: adj.loss_vs_layer.tok2, color: splitColor('other'), text: fmtS(adj.loss_vs_layer.tok2, 4), tip: `<b>joining 2 adjacent tokens</b> · compressor ${adj.coder} · ${adj.trial}<br>layer ${fmt(adj.ratios.layer, 4)} → tok2 ${fmt(adj.ratios.tok2, 4)}: ${fmtS(adj.loss_vs_layer.tok2, 4)} (${fmtS(bits(adj.loss_vs_layer.tok2), 2)} bits)<br>${esc(words(adj.grade))}` },
      { label: '4 adjacent tokens (tok4)', v: adj.loss_vs_layer.tok4, color: splitColor('other'), text: fmtS(adj.loss_vs_layer.tok4, 4), tip: `<b>joining 4 adjacent tokens</b> · compressor ${adj.coder} · ${adj.trial}<br>layer ${fmt(adj.ratios.layer, 4)} → tok4 ${fmt(adj.ratios.tok4, 4)}: ${fmtS(adj.loss_vs_layer.tok4, 4)} (${fmtS(bits(adj.loss_vs_layer.tok4), 2)} bits)<br>${esc(words(adj.grade))}` },
    ];
    const A = hbars(boxA, RA, { w: fitW(boxA), x: [-0.052, 0.092], xticks: [-0.04, -0.02, 0, 0.02, 0.04, 0.06, 0.08], xfmt: v => fmtS(v, 2), base: 0, h: 300, xlabel: 'change in MDL ratio when joining (negative is a saving)', bitsAxis: 'bits', label: 'Same-window change in MDL ratio when cherries are joined' });
    vrule(A.P, 0, null, { dash: false, color: 'var(--ink-3)' });
    const order = ['head', 'layer', 'pair', 'regime', 'triple', 'column', 'token'];
    const rows129 = c129.slice().sort((a, b) => order.indexOf(a.split) - order.indexOf(b.split));
    const RB = rows129.map(r => ({ label: `${r.split} (${r.values_per_entry} B)`, v: r.ratio, color: splitColor(r.split),
      tip: `<b>compressor 129 pure-wls · ${SPLIT_LABEL[splitKey(r.split)].replace(/:.*$/, '')}${splitKey(r.split) === 'other' ? ` (${esc(r.split)})` : ''}, ${r.values_per_entry} bytes</b> · ${r.trial}<br>ratio ${fmt(r.ratio, 5)} · ${fb(r.ratio)} · x ${fmt(r.x, 3)} + y ${fmt(r.y, 3)}<br>${readsOf(r)} · ${r.verified ? 'verified' : 'not verified'}` }));
    const B = hbars(boxB, RB, { w: fitW(boxB), x: [0.6, 0.76], xticks: [0.6, 0.64, 0.68, 0.72, 0.76], xfmt: v => fmt(v, 2), h: 300, xlabel: 'MDL ratio, stretch 4096, leash 293 (axis from 0.6)', bitsAxis: true, label: 'Compressor 129 by cherry shape' });
    vrule(B.P, tree102, null, { color: CODER[102] });
  };

  // ================================================================== VIII.7  msrCast — codebooks and rotations on one screen
  FIG.msrCast = async (host) => {
    const sd = await data('splits');
    const c = need(sd.cast, 'splits.cast'), cb = need(sd.codebooks, 'splits.codebooks');
    const pen = need(c.fixed_rotation_penalty_bits, 'cast.fixed_rotation_penalty_bits');
    const rq = need(cb.rq_no_tree, 'codebooks.rq_no_tree'), led = need(cb.ledger, 'codebooks.ledger');
    const box = h('div');
    const kGap = kpi('129 vs 102, same screen', fmtS(c.c129_prediction_only - c.tree_102, 4), `${fmt(sd.coder_129_by_split.vs_102_on_layer, 4)} worse on ${esc(words(sd.coder_129_by_split.segments))}`, CODER[129]);
    const kRQ = kpi('a codebook (RQ) saves', fmtS(rq.delta_vs_own_control, 4), `${esc(words(rq.segments))} parts · on tree + prediction: chosen on ${esc(words(cb.on_tree_plus_prediction.codebook_chosen_on_blocks))} punnets`, CODER[129]);
    const kRot = kpi('a fixed rotation costs', `+${fmt(pen[0], 2)}–${fmt(pen[1], 2)} bits`, `code-length bound; rounding after rotating ≈ ${fmt(cb.fixed_rotations.lattice_constant_bits, 2)} bit`, EST);
    host.append(legend([['landmark (solo ideal)', NEUTRAL, 'box'], ['compressor 129: linear prediction, no tree', CODER[129], 'box'], ['derived, not run', CODER[129], 'dash'], ['code-length bound', EST, 'band'], ['compressor 102: reference tree', CODER[102], 'box'], ['compressor 121: tree + prediction', CODER[121], 'box']]),
      box, h('div', { class: 'kpis' }, kGap, kRQ, kRot),
      sub(`Scenario V · all · cherry (2, 256) · stretch 4096 · leash 293 (screen ${esc(words(c.track))}); the axis starts at 0.6. “129 + RQ” is derived: RQ’s ${fmtS(rq.delta_vs_own_control, 4)} was measured on compressor 128’s own prediction-only control (${fmt(led.control_prediction_only_128.ratio, 4)} → ${fmt(led.rq_no_tree_128.ratio, 4)}), not on compressor 129.`));
    const rows = [
      { label: 'solo ideal', v: c.solo_ideal, color: NEUTRAL, tip: `<b>solo ideal</b> · landmark of the screen<br>${rb(c.solo_ideal)}<br>per-furrow order-0 entropy, tables uncharged` },
      { label: '129 · prediction only', v: c.c129_prediction_only, color: CODER[129], tip: `<b>compressor 129 pure-wls</b> · r25-t0003 · isolated-verified<br>${rb(c.c129_prediction_only)}<br>mean, scale, linear prediction, one stream per cherry; dictionary share 0.02` },
      { label: '129 + a fixed rotation', kind: 'range', lo: c.c129_prediction_only, hi: c.c129_prediction_only + pen[1] / 8, v: c.c129_prediction_only + pen[1] / 8, color: EST, text: `+${fmt(pen[0] / 8, 3)}–${fmt(pen[1] / 8, 3)} · bound`,
        tip: `<b>a fixed rotation (DCT, Hadamard, random) before rounding</b><br>+${fmt(pen[0], 2)} to +${fmt(pen[1], 2)} bits per element = +${fmt(pen[0] / 8, 3)} to +${fmt(pen[1] / 8, 3)} of ratio<br>${esc(words(cb.fixed_rotations.grade))}<br>rotating then rounding costs ≈ ${fmt(cb.fixed_rotations.lattice_constant_bits, 4)} bit (the lattice constant); measured ${fmt(cb.fixed_rotations.measured_rounding_bits[0], 2)}–${fmt(cb.fixed_rotations.measured_rounding_bits[1], 2)}` },
      { label: '129 + RQ · derived', v: c.c129_plus_rq_derived, color: CODER[129], kind: 'dashed', tip: `<b>compressor 129 with residual quantisation stacked · derived</b><br>${rb(c.c129_plus_rq_derived)} = ${fmt(c.c129_prediction_only, 4)} ${fmtS(rq.delta_vs_own_control, 5)}<br>RQ’s saving was measured on compressor 128’s own control: ${fmt(led.control_prediction_only_128.ratio, 5)} (${led.control_prediction_only_128.trial}) → ${fmt(led.rq_no_tree_128.ratio, 5)} (${led.rq_no_tree_128.trial}, isolated), ${esc(words(rq.segments))} parts, ${esc(words(rq.blocks_better))} punnets` },
      { label: '102 · reference tree', v: c.tree_102, color: CODER[102], tip: `<b>compressor 102 path-rows</b> · ${led.tree_102.trial} · isolated-verified<br>${rb(c.tree_102)}<br>reference tree with linear prediction, laid out along tree paths` },
      { label: '121 · tree + prediction', v: c.tree_plus_prediction_121, color: CODER[121], tip: `<b>compressor 121 stack-rows</b> · env-t0096 · verified, every cherry counted<br>${rb(c.tree_plus_prediction_121)}<br>the screen’s incumbent` },
    ];
    const { P } = hbars(box, rows, { x: [0.6, 0.83], xticks: [0.6, 0.65, 0.7, 0.75, 0.8], xlabel: 'MDL ratio on the layer screen, lower is better (axis from 0.6)', bitsAxis: true, label: 'The cast on the layer screen: solo ideal, compressor 129 with and without codebooks and rotations, the tree compressors 102 and 121' });
    vrule(P, c.tree_102, null, { color: CODER[102], dash: '2 4' });
  };

  // ================================================================== VIII.8  msrTime — sound, time and bits
  FIG.msrTime = async (host) => {
    const td = await data('time');
    const nn = need(td.neural_network, 'time.neural_network'), rp = need(td.references_point, 'time.references_point');
    const B = need(nn.bits, 'neural_network.bits');
    const layers = need(rp.layers, 'references_point.layers');
    const MID = series(2), OUT = series(3), NN = series(4);
    const boxA = h('div'), boxB = h('div');
    const kLin = kpi('a linear rule saves', `${fmt(B.solo - B.linear, 2)} bits`, `at KV layer 1 (L7), no reference: ${fmt(B.solo, 3)} → ${fmt(B.linear, 3)}`, NN);
    const kNet = kpi('a small network adds', `${fmt(B.linear - B.network, 2)} bit`, `${fmt(B.linear, 3)} → ${fmt(B.network, 3)}; one run; control recovered ${fmtPct(nn.positive_control_recovery, 0)}`, NN);
    const mids = layers.filter(L => [7, 11, 15].includes(L)), outs = layers.filter(L => ![7, 11, 15].includes(L));
    const kRef = kpi('references within 8 tokens', `${mids.map(L => rp.within_8_tokens_pct[L]).join(' / ')} %`, `layers ${mids.join(', ')}; ${outs.map(L => rp.within_8_tokens_pct[L]).join(' / ')} % at ${outs.join(', ')}`, MID);
    host.append(legend([['code-length estimate at KV layer 1 (L7), no reference cherry', NN, 'box'], ['middle KV layers 1, 2, 3 (L7, L11, L15): chains along the text', MID, 'box'], ['KV layers 0, 4, 5 (L3, L19, L23): hubs on far-apart repeats', OUT, 'box']]),
      h('div', { class: 'msr-row msr-row-23' },
        h('div', {}, head('(a) bits per element at KV layer 1 (L7), no reference'), boxA),
        h('div', {}, head('(b) share of reference pointers within 8 tokens, by layer'), boxB)),
      h('div', { class: 'kpis' }, kLin, kNet, kRef),
      sub(`(a) ${esc(words(nn.grade))}. (b) ${esc(rp.receipt.replace(/^.*\(/, '').replace(/\)$/, ''))}; hover a bar for the largest degree and the pointer cost.`));
    const tipA = (name, v, note) => `<b>${name}</b><br>${fmt(v, 3)} bits per element at KV layer 1 (L7) (ratio ${fmt(v / 8, 4)})<br>${note}`;
    const RA = [
      { label: 'no prediction', v: B.solo, color: NN, text: fmt(B.solo, 3), tip: tipA('no prediction (per-furrow statistics)', B.solo, 'code-length estimate, one run') },
      { label: 'a linear rule', v: B.linear, color: NN, text: fmt(B.linear, 3), tip: tipA('linear prediction across elements', B.linear, `saves ${fmt(B.solo - B.linear, 3)} bits`) },
      { label: 'a small network', v: B.network, color: NN, text: fmt(B.network, 3), tip: tipA('a small neural network', B.network, `${fmt(B.linear - B.network, 3)} bit beyond the linear rule; with a reference it adds ${fmtS(nn.with_reference_bits.network[0], 3)} to ${fmtS(nn.with_reference_bits.network[1], 3)}`) },
    ];
    hbars(boxA, RA, { w: fitW(boxA), x: [0, 8.6], xticks: [0, 2, 4, 6, 8], xlabel: 'bits per element (8 = raw)', h: 290, label: 'Bits per element at KV layer 1 (L7) without a reference cherry: no prediction, a linear rule, a small network' });
    const pcts = layers.map(L => num(rp.within_8_tokens_pct[L], `within_8_tokens_pct ${L}`));
    const PB = Plot(boxB, { w: fitW(boxB), xcats: layers.map(L => `L${L}`), y: [0, 60], h: 290, grid: 'y', ylabel: 'share within 8 tokens', yfmt: v => `${v} %`, xlabel: 'layer', label: 'Share of reference pointers landing within 8 tokens, by layer' });
    bars(PB, pcts, { colors: i => ([7, 11, 15].includes(layers[i]) ? MID : OUT), labels: v => `${v} %`, width: 36,
      tip: (v, i) => `<b>KV layer ${layers.indexOf(layers[i])} (L${layers[i]})</b> · ${[7, 11, 15].includes(layers[i]) ? 'middle layer: chains' : 'first or last layers: hubs'}<br>${v} % of references within 8 tokens<br>largest degree ${rp.largest_degree[layers[i]]} cherries · a pointer costs ${fmt(rp.parent_bits[layers[i]], 1)} bits<br>24 punnets at 4096, two sequences` });
  };

  // ================================================================== VIII.9  msrReads — ratio against the worst cherry's reads
  FIG.msrReads = async (host) => {
    const rd = await data('reads');
    const tbl = need(rd.every_entry_table, 'reads.every_entry_table'), budgets = need(rd.budgets, 'reads.budgets');
    const cost = need(rd.budget_137_cost_on_layer, 'reads.budget_137_cost_on_layer'), rc = need(rd.rule_change, 'reads.rule_change');
    const box = h('div');
    const k137 = kpi('leash 137 on (2, 256) cherries', fmtS(cost.delta, 4), esc(words(cost.note)), splitColor('layer'));
    const k293 = kpi('leash 293 at stretch 4096 and above', fmtS(rc.budget_293_cost_at_4k_and_above, 1), 'every incumbent fits; counting every cherry changed ' + esc(words(rc.winners_changed)) + ' winners');
    const kW = kpi('worst cherry over the mean', `${fmt(rc.worst_over_mean[0], 1)}–${fmt(rc.worst_over_mean[1], 1)}×`, `sampled maxima had run up to ${fmtPct(rc.sampled_max_low_by_up_to, 0)} low`);
    host.append(legend([...splitLegend(['head', 'layer', 'token']), ['mean → worst cherry', 'var(--ink-3)', 'line'], ['leashes', 'var(--ink-2)', 'dash']]), box, h('div', { class: 'kpis' }, k137, k293, kW),
      sub(`Reads: one (2, 256) cherry of distinct dictionary bytes touched by one cold decode, counted for every cherry (${num(rd.entries_counted_in_table, 'entries_counted_in_table').toLocaleString('en-GB')} cherries in this table). Every row is verified.`));
    const xs = tbl.flatMap(r => [r.reads.mean, r.reads.max]), ys = tbl.map(r => r.ratio);
    const [xl, xh] = extent(xs), [yl, yh] = extent(ys);
    const P = Plot(box, { x: [Math.min(40, xl * 0.8), Math.max(400, xh * 1.25)], xlog: true, y: [yl - 0.012, yh + 0.012], h: 380, xlabel: 'reads to rebuild one cherry, in cherries’ worth (log scale)', ylabel: 'MDL ratio', yfmt: v => fmt(v, 2), m: { r: 24, t: 26 },
      xticks: [50, 100, 137, 200, 293, 400].filter(v => v >= Math.min(40, xl * 0.8)), xfmt: v => String(v), grid: 'y', label: 'MDL ratio against the worst cherry’s reads for every row of the every-cherry table' });
    // bits on the right edge: a few y ticks in bits
    const f = P.fs;
    ticks(yl - 0.012, yh + 0.012, 5).forEach(v => { const Y = P.y(v); if (Y < P.m.t || Y > P.H - P.m.b) return; el('text', { x: P.W - P.m.r + 4 * f, y: Y + 4 * f, text: fmt(8 * v, 2), style: 'fill:var(--ink-3)' }, el('g', { class: 'tick' }, P.g.axes)); });
    el('text', { x: P.W - P.m.r + 4 * f, y: P.m.t - 7 * f, class: 'lbl', style: 'fill:var(--ink-3)', text: 'bits' }, P.g.axes);
    budgets.filter(b => b <= P.x1).forEach((b, i) => vrule(P, b, `leash ${b}`, { pos: i % 2 ? 'top' : 'bottom' }));
    const lab = r => `${r.coder}${r.n_sequences > 2 ? ` · ${r.n_sequences} seq` : ''}`;
    // a dot that sits on another row's mean→worst line at nearly the same ratio gets its label underneath
    const crowded = r => tbl.some(o => o !== r && Math.abs(o.ratio - r.ratio) < 0.004 && o.reads.mean < r.reads.max && r.reads.max < o.reads.max);
    tbl.forEach(r => {
      const col = splitColor(r.split), Y = P.y(r.ratio), X0 = P.x(r.reads.mean), X1 = P.x(r.reads.max);
      el('line', { x1: X0, x2: X1, y1: Y, y2: Y, style: `stroke:${col};stroke-width:1.5;opacity:.55` }, P.g.data);
      el('line', { x1: X0, x2: X0, y1: Y - 4 * f, y2: Y + 4 * f, style: `stroke:${col};stroke-width:1.5;opacity:.7` }, P.g.data);
      const c = dot(P.g.data, X1, Y, 5.5 * f, col, { class: 'dot' });
      hover(c, () => `<b>compressor ${r.coder} ${esc(words(r.name))}</b> · ${r.trial}<br>screen ${esc(words(r.screen))} (${esc(words(r.track))})<br>ratio <b>${fmt(r.ratio, 5)}</b> · ${fb(r.ratio)}<br>reads mean ${fmt(r.reads.mean, 1)} · p99 ${fmt(r.reads.p99, 0)} · worst ${fmt(r.reads.max, 1)} (${fmt(r.worst_over_mean, 2)}× the mean)<br>${r.n_blocks} punnets, ${r.n_entries.toLocaleString('en-GB')} cherries, ${r.n_sequences} sequences · ${r.verified ? 'verified' : 'not verified'}`);
      if (crowded(r)) el('text', { x: X1, y: Y + 15 * f, 'text-anchor': 'middle', class: 'val', text: lab(r) }, P.g.top);
      else el('text', { x: X1 + 8 * f, y: Y + 4 * f, class: 'val', text: lab(r) }, P.g.top);
    });
  };

  // ================================================================== VIII.9  msrBlocks — ratio against stretch length
  FIG.msrBlocks = async (host) => {
    const [ld, md, pd] = await Promise.all([data('ladders'), data('memory'), data('points')]);
    const c1 = need(ld.blocks.c1.points, 'ladders.blocks.c1.points'), c2 = need(ld.blocks.c2.points, 'ladders.blocks.c2.points');
    const fl = need(md.floors, 'memory.floors');
    const f16 = num(fl.block_16k.ratio, 'floors.block_16k.ratio'), fseq = num(fl.whole_sequence.ratio, 'floors.whole_sequence.ratio');
    const solo = num(pd.landmarks.solo_ideal.ratio, 'landmarks.solo_ideal.ratio');
    const C1 = splitColor('head'), C2 = splitColor('layer');
    const box = h('div'), ro = readout();
    host.append(legend([['C1: values of KV layer 0 (L3), head 0, cherry (256,), no leash', C1], ['C2: cherry (2, 256), leash 293', C2], ['code-length floors: estimates, not compressors', EST, 'dash'], [`solo ideal ${fmt(solo, 3)} (six layers)`, 'var(--ink-2)', 'dash']]), box, ro,
      sub('Each point is a verified incumbent on its own screen, so the shape is solid and the third decimal is not. Hover or scrub for values.'));
    const P = Plot(box, { x: [512, 32768], xlog: 2, y: [0.54, 0.82], h: 360, xlabel: 'stretch length (tokens, log scale)', ylabel: 'MDL ratio', xfmt: tokFmt, yfmt: v => fmt(v, 2), m: { r: 34 },
      xticks: [512, 1024, 2048, 4096, 8192, 16384, 32768], label: 'MDL ratio against stretch length for C1 and C2, with the code-length floors' });
    const f = P.fs;
    [0.6, 0.65, 0.7, 0.75, 0.8].forEach(v => el('text', { x: P.W - P.m.r + 4 * f, y: P.y(v) + 4 * f, text: fmt(8 * v, 1), style: 'fill:var(--ink-3)' }, el('g', { class: 'tick' }, P.g.axes)));
    el('text', { x: P.W - P.m.r + 4 * f, y: P.m.t - 4 * f, class: 'lbl', style: 'fill:var(--ink-3)', text: 'bits' }, P.g.axes);
    hrule(P, solo, `solo ideal ${fmt(solo, 3)}`);
    hrule(P, f16, `punnet floor at stretch 16 384 ≈ ${fmt(f16, 2)} · estimate`, { color: EST, dash: '6 5', side: 'left' });
    hrule(P, fseq, `whole sequence ≈ ${fmt(fseq, 2)} · extrapolation`, { color: EST, dash: '2 4', side: 'left' });
    const tipOf = (camp) => (p) => { const r = p[2]; return `<b>${camp} · stretch ${r.b} tokens</b><br>compressor ${r.coder} · ${r.trial} · ${esc(words(r.track))}<br>ratio <b>${fmt(r.ratio, 5)}</b> · ${fb(r.ratio)} · x ${fmt(r.x, 3)} + y ${fmt(r.y, 3)}${r.reads ? `<br>${readsOf(r)}` : ''}`; };
    line(P, c1.map(p => [p.b, p.ratio, p]), { name: 'C1 · KV layer 0 (L3), head 0', color: C1, markers: 5, tip: tipOf('C1') });
    line(P, c2.map(p => [p.b, p.ratio, p]), { name: 'C2 · one layer', color: C2, markers: 5, tip: tipOf('C2') });
    crosshair(P, { xname: 'stretch of', xfmt: v => `${tokFmt(v)} tokens`, yfmt: v => `${fmt(v, 4)} · ${fb(v)}` });
    const perD = (pts) => { const a = pts[0], b = pts[pts.length - 1], n = Math.log2(b.b / a.b); return `${fmtS(b.ratio - a.ratio, 4)} over ${n} doublings (${fmtS((b.ratio - a.ratio) / n, 4)} each, ${fmtS(bits(b.ratio - a.ratio) / n, 2)} bits)`; };
    ro.set([[`C1 ${tokFmt(c1[0].b)} → ${tokFmt(c1[c1.length - 1].b)}`, perD(c1)], [`C2 ${tokFmt(c2[0].b)} → ${tokFmt(c2[c2.length - 1].b)}`, perD(c2)], ['whole sequence', esc(words(fl.whole_sequence.grade))]]);
  };

  // ================================================================== VIII.10  msrMemory — the memory table
  FIG.msrMemory = async (host) => {
    const md = await data('memory');
    const mt = need(md.memory_table, 'memory.memory_table'), rows = need(mt.rows, 'memory_table.rows'), y102 = need(mt.coder_102_yardstick, 'memory_table.coder_102_yardstick');
    const layers = need(mt.layers, 'memory_table.layers'), win = need(mt.window, 'memory_table.window');
    const MODEL = series(6);
    const box = h('div');
    const kW = kpi('one window', `${win.tokens[1] - win.tokens[0]} tokens`, `sequence ${win.sequence} of target ${win.target}, tokens ${win.tokens[0].toLocaleString('en-GB')}–${win.tokens[1].toLocaleString('en-GB')}; code-length estimates, not compressors`, MODEL);
    const intact = rows.find(r => r.id === 'intact'), both = rows.find(r => r.id === 'both');
    const kI = kpi('intact LLM leaves', `${fmt(intact.mean_bits, 2)} bits`, 'per value, given the whole past: the values are computed, not noisy', MODEL);
    const kC = kpi('compressor 102, no LLM', `${fmt(y102.mean_bits, 2)} bits`, `≈ the blinded LLM (${fmt(both.mean_bits, 2)}); ratio ${fmt(y102.ratio, 4)} on ${y102.blocks} punnets`, CODER[102]);
    host.append(legend([['the LLM’s own prediction, blinded one way at a time (code-length estimate)', MODEL, 'box'], ['compressor 102 on 12 real punnets at stretch 4096 at the same position', CODER[102], 'box']]),
      box, h('div', { class: 'kpis' }, kW, kI, kC), sub(`${esc(words(mt.grade))}. Hover a bar for its six per-layer values; per layer the match with 102 is ± 1 bit.`));
    const SHORT = { intact: 'intact LLM', attn16k: 'no attention past 16,384', attn2k: 'no attention past 2,048', attn256: 'no attention past 256', reset: 'linear-state reset', both: 'reset, attention ≤ 2,048' };
    const perLayer = pl => layers.map((L, i) => `L${L} ${fmt(pl[i], 2)}`).join(' · ');
    const R = rows.map(r => ({ label: SHORT[r.id] || r.label.slice(0, 26), v: r.mean_bits, color: MODEL, text: fmt(r.mean_bits, 2),
      tip: `<b>${esc(words(r.label))}</b><br>${fmt(r.mean_bits, 3)} bits per value, mean of six layers (ratio ${fmt(r.mean_bits / 8, 3)})<br>${perLayer(r.per_layer)}` }));
    R.push({ label: 'compressor 102, no LLM', v: y102.mean_bits, color: CODER[102], text: fmt(y102.mean_bits, 2),
      tip: `<b>compressor 102 path-rows, a real compressor</b><br>${fmt(y102.mean_bits, 2)} bits per value = ratio ${fmt(y102.ratio, 4)}, mean of ${y102.blocks} punnets (6 KV layers × both dev sequences, b = 4096, stretch start ${win.tokens[0].toLocaleString('en-GB')})<br>${perLayer(y102.per_layer)}` });
    const { P } = hbars(box, R, { x: [0, 8.8], xticks: [0, 2, 4, 6, 8], xlabel: 'bits left per stored FP8 value (8 = raw)', label: 'The memory table: bits per value the LLM leaves as it is blinded, against compressor 102' });
    vrule(P, 8, 'raw 8', { pos: 'bottom', side: 'left', color: 'var(--ink-3)' });
  };

  // ================================================================== VIII.11  msrNoise — pairing, drawn
  FIG.msrNoise = async (host) => {
    const nd = await data('noise');
    const five = need(nd.five_sequences, 'noise.five_sequences'), pn = need(nd.page_numbers, 'noise.page_numbers'), led = need(nd.between_sequence_sd_ledger, 'noise.between_sequence_sd_ledger');
    const seqs = need(five.sequences, 'five_sequences.sequences');
    const a = need(five.coder_102, 'five_sequences.coder_102'), b = need(five.coder_121, 'five_sequences.coder_121'), d = need(five.paired_difference, 'five_sequences.paired_difference');
    const sdBetween = num(pn.between_sequence_sd_20_sequences, 'page_numbers.between_sequence_sd_20_sequences'), sdPaired = num(d.sd, 'paired_difference.sd');
    const boxA = h('div'), boxB = h('div'), ro = readout();
    host.append(legend([['compressor 102 path-rows', CODER[102]], ['compressor 121 stack-rows', CODER[121]], ['spread of one score between sequences', series(6), 'box'], ['spread of the paired difference', series(7), 'box']]),
      h('div', { class: 'msr-row msr-row-32' },
        h('div', {}, head('MDL ratio of 102 and 121 on five sequences of target 02'), boxA),
        h('div', {}, head('two standard deviations (log scale)'), boxB)), ro,
      sub(`Screen ${esc(words(five.track))}: ${five.n_blocks} punnets, ${five.n_entries.toLocaleString('en-GB')} cherries. The between-sequence spread is the 20-sequence page figure; on these five it is ${fmt(led.coder_121_5_seq, 4)} (121) and ${fmt(led.coder_102_5_seq, 4)} (102).`));
    const ya = seqs.map(s => num(a.per_sequence[s], `102 ${s}`)), yb = seqs.map(s => num(b.per_sequence[s], `121 ${s}`));
    const [lo, hi] = extent(ya.concat(yb)), pad = (hi - lo) * 0.22;
    const PA = Plot(boxA, { w: fitW(boxA), xcats: seqs.map(seqName), y: [lo - pad * 1.7, hi + pad], h: 320, grid: 'y', ylabel: 'MDL ratio', yfmt: v => fmt(v, 3), yn: 5, m: { r: 14 }, label: 'Ratios of compressors 102 and 121 on five sequences, as two parallel lines' });
    const fA = PA.fs;
    const tipA = (who, t, s, v, mean) => `<b>compressor ${who}</b> · ${t} · ${seqName(s)}<br>ratio ${fmt(v, 5)} · ${fb(v)}<br>mean of five ${fmt(mean, 5)}`;
    line(PA, ya.map((v, i) => [i, v]), { color: CODER[102], markers: 5, name: 'compressor 102', tip: (p, i) => tipA(102, a.trial, seqs[i], p[1], a.ratio) });
    line(PA, yb.map((v, i) => [i, v]), { color: CODER[121], markers: 5, name: 'compressor 121', tip: (p, i) => tipA(121, b.trial, seqs[i], p[1], b.ratio) });
    seqs.forEach((s, i) => el('text', { x: PA.x(i), y: PA.y(Math.min(ya[i], yb[i])) + 17 * fA, 'text-anchor': 'middle', class: 'val', text: fmtS(d.per_sequence[s], 4) }, PA.g.top));
    // the two spreads on a log axis: bars drawn by hand so the base is the bottom of the domain, not 0
    const y0 = 0.00005, y1 = 0.03;
    const PB = Plot(boxB, { w: fitW(boxB), xcats: ['one score', 'paired difference'], y: [y0, y1], ylog: true, h: 320, grid: 'y', ylabel: 'standard deviation of the ratio', yfmt: v => fmt(v, v < 0.001 ? 4 : 3), m: { r: 14 }, label: 'Standard deviation of one score between sequences against that of the paired difference' });
    const fB = PB.fs, bw = Math.min(46 * fB, Math.abs(PB.x(1) - PB.x(0)) * 0.6);
    [[0, sdBetween, series(6), `<b>one compressor’s score, between sequences</b><br>SD ≈ ${fmt(sdBetween, 3)} of ratio (${fmt(bits(sdBetween), 3)} bits), 20 sequences<br>on these five: ${fmt(led.coder_121_5_seq, 5)} (121), ${fmt(led.coder_102_5_seq, 5)} (102)`],
     [1, sdPaired, series(7), `<b>121 − 102 on the same punnets, between sequences</b><br>SD ${fmt(sdPaired, 5)} of ratio (${fmt(bits(sdPaired), 4)} bits)<br>per sequence: ${seqs.map(s => fmtS(d.per_sequence[s], 5)).join(', ')}`]].forEach(([i, v, col, tip]) => {
      const X = PB.x(i) - bw / 2;
      const bar = el('path', { class: 'bar', d: barPath(false, X, bw, PB.y(y0), PB.y(v), 4 * fB), style: `fill:${col}` }, PB.g.data);
      el('text', { x: PB.x(i), y: PB.y(v) - 7 * fB, 'text-anchor': 'middle', class: 'val', text: fmt(v, v < 0.001 ? 5 : 3) }, PB.g.top);
      const hit = el('rect', { class: 'hit', x: PB.x(i) - Math.abs(PB.x(1) - PB.x(0)) / 2, y: PB.m.t, width: Math.abs(PB.x(1) - PB.x(0)), height: PB.ph }, PB.g.top);
      hover(hit, () => tip);
      hit.addEventListener('pointerenter', () => bar.classList.add('is-hot'));
      hit.addEventListener('pointerleave', () => bar.classList.remove('is-hot'));
    });
    ro.set([['121 − 102', `${fmtS(d.mean, 5)} on every sequence (${fmtS(bits(d.mean), 3)} bits)`], ['paired SD', fmt(sdPaired, 5)], ['between-sequence SD', fmt(sdBetween, 3)], ['quieter by', `≈ ${fmt(sdBetween / sdPaired, 0)}×`]]);
  };

  // ================================================================== VIII.13  msrEconomics — sequences per GPU with measured ratios
  FIG.msrEconomics = async (host) => {
    const pd = await data('points');
    const E = need(pd.economics_inputs, 'points.economics_inputs');
    // The Pin (III.11: HiSparse's GLM-5.1 deployment at 8-bit storage), copied from figures/homework-b.js:
    // context L, picks k per layer, NL KV layers, cherry e bytes, step tpot ms, link GB/s, GPU memory GB, miss rates at B = 2048/4096/8192.
    const REF = { L: 100000, k: 2048, NL: 78, e: 640, tpot: 30, link: 50, hbm: 30, m2: 0.30, m4: 0.134, m8: 0.067 };
    const BS = [2048, 4096, 8192];
    const missOf = B => (B === 2048 ? REF.m2 : B === 8192 ? REF.m8 : REF.m4);
    const b = 4096, nBlocks = Math.ceil(REF.L / b);          // the measured compressors ran on stretch 4096
    const light = need(E.light_no_tree_coder_129_layer, 'economics_inputs.light_no_tree_coder_129_layer'), tree = need(E.tree_coder_121_layer, 'economics_inputs.tree_coder_121_layer');
    const S = [
      { id: 'hs', short: 'HiSparse', name: 'HiSparse: no dictionary, raw misses', kind: 'hisparse', rho: num(E.hisparse.rho, 'hisparse.rho'), w: 0, tag: 'reference', color: series(6) },
      { id: 'solo', short: 'solo ideal', name: 'solo ideal: a global code, nothing per sequence', kind: 'global', rho: num(E.solo_ideal.rho, 'solo_ideal.rho'), w: 0, tag: 'measured entropy', color: NEUTRAL },
      { id: 'light', short: 'light compressor 129', name: `light compressor 129 (no tree): punnet dictionaries resident (${light.trial})`, kind: 'punnet', rho: num(light.rho, 'light.rho'), wb: num(light.w_over_b, 'light.w_over_b'), w: Math.round(light.w_over_b * b), tag: 'measured ρ, w/b', color: CODER[129] },
      { id: 'tree', short: 'tree compressor 121', name: `tree compressor 121: half the punnet resident, deltas 0.11 of raw (${tree.trial})`, kind: 'punnet', rho: num(tree.delta_share, 'tree.delta_share'), wb: num(tree.w_over_b, 'tree.w_over_b'), w: Math.round(tree.w_over_b * b), tag: 'measured deltas, w/b', color: CODER[121] },
      { id: 'floor', short: 'sequence floor', name: 'sequence-scope floor: ρ = 0.60, w = 256 (code-length estimate)', kind: 'sequence', rho: num(E.block_floor_exact_model.rho, 'block_floor_exact_model.rho'), w: 256, tag: 'hypothetical', color: EST },
    ];
    let fD = 1, nload = 0, nD = nBlocks, cur = 'light';
    /* Bytes over the link per step and GPU memory per sequence for one design at hot-cache size B (the napkin of VI.9). */
    function econ(s, B) {
      const miss = missOf(B) * REF.k * REF.NL * REF.e;
      let f = fD, nl = nload, wres = 0;
      if (s.kind === 'hisparse') { f = 0; nl = 0; }
      else if (s.kind === 'global') { f = 1; nl = 0; }
      else if (s.kind === 'sequence') { f = 1; nl = 0; wres = s.w; }
      else wres = Math.min(nBlocks, nD) * s.w;
      const parts = { delta: miss * f * s.rho, raw: miss * (1 - f), loads: nl * REF.NL * s.w * REF.e };
      const T = parts.delta + parts.raw + parts.loads, M = REF.NL * REF.e * (B + wres);
      const Nlink = REF.link * 1e9 * (REF.tpot / 1e3) / T, Nhbm = REF.hbm * 1e9 / M;
      return { B, miss, T, M, parts, wres, f, nl, Nlink, Nhbm, N: Math.min(Nlink, Nhbm), binds: Nlink < Nhbm ? 'the link binds' : 'GPU memory binds' };
    }
    const best = s => BS.map(B => econ(s, B)).reduce((p, c) => (c.N > p.N ? c : p));
    const MB = v => `${fmt(v / 1e6, v < 1e7 ? 2 : 1)} MB`, T = s => tex(s);
    const box = h('div'), tbl = h('div');
    const kp = { link: kpi(T('\\vNlink'), '', 'link-bound', 'var(--ink-2)'), hbm: kpi(T('\\vNhbm'), '', 'memory-bound', 'var(--ink-2)'), n: kpi(T('\\vN'), '', 'sequences per GPU'), gain: kpi('vs HiSparse', '', 'sequences per GPU') };
    const sw = seg(S.map(s => [s.id, s.short]), cur, v => { cur = v; run(); }, 'design');
    const slF = slider(texify('$\\vfD$ (assumed)'), 0.5, 1, 0.01, fD, v => { fD = v; run(); });
    const slL = slider(texify('$\\vnload$ (assumed)'), 0, 0.2, 0.01, nload, v => { nload = v; run(); });
    const swD = seg([[nBlocks, `all ${nBlocks} resident`], [8, '8 resident'], [2, '2 resident']], nD, v => { nD = v; run(); }, 'resident punnet dictionaries per layer');
    host.append(controls(sw), controls(slF, slL, swD), h('div', { class: 'kpis' }, kp.link, kp.hbm, kp.n, kp.gain),
      legend([['link-bound sequences per GPU', series(0), 'box'], ['memory-bound sequences per GPU', series(1), 'box'], ['sequences per GPU (the smaller)', 'var(--ink)', 'line']]), box, tbl,
      sub(`<b>Measured:</b> ρ and the dictionary share w/b of compressors 129 and 121 on (2, 256) cherries (ledger trials ${light.trial}, ${tree.trial}); the solo ideal is the per-furrow entropy. <b>Assumed:</b> ${texify('$\\vfD$, $\\vnload$')}, which dictionaries stay resident, HiSparse’s miss-rate curve and every number of the reference setting (III.10). Each design is shown at its best hot-cache size B of 2K, 4K or 8K. For the punnet compressors ρ is the bytes a miss moves over the link: compressor 129’s MDL ratio (its deltas alone are ${fmt(light.delta_share, 3)}), compressor 121’s deltas (its MDL ratio is ${fmt(tree.rho, 4)}). Requests are rounded to whole numbers.`));
    function run() {
      const rows = S.map(s => Object.assign({ s }, best(s)));
      const hs = rows.find(r => r.s.id === 'hs'), me = rows.find(r => r.s.id === cur);
      kp.link.set(fmt(me.Nlink, 0), `link-bound · ${REF.link} GB/s × ${REF.tpot} ms ÷ ${MB(me.T)} per step`);
      kp.hbm.set(fmt(me.Nhbm, 0), `memory-bound · ${REF.hbm} GB ÷ ${MB(me.M)} per sequence`);
      kp.n.set(fmt(me.N, 0), `${esc(words(me.s.short))} at B = ${tokFmt(me.B).toUpperCase()} · ${me.binds}`);
      kp.gain.set(`${fmt(me.N / hs.N, 2)}×`, `HiSparse at its best B (${tokFmt(hs.B).toUpperCase()}): ${fmt(hs.N, 0)}`);
      // the chart: two bars per design, capped so one huge link-bound count does not flatten the rest
      box.replaceChildren();
      const maxN = Math.max(...rows.map(r => r.N));
      const top = Math.ceil(Math.min(Math.max(...rows.flatMap(r => [r.Nlink, r.Nhbm])), 2.5 * maxN) * 1.12 / 50) * 50;
      const P = Plot(box, { ycats: rows.map(r => r.s.short), x: [0, top], h: 330, grid: 'x', m: { r: 44 }, xlabel: 'concurrent decode sequences per GPU', label: 'Link-bound and memory-bound sequences per GPU for each design at its best hot-cache size' });
      bars(P, rows.map(r => [Math.min(r.Nlink, top), Math.min(r.Nhbm, top)]), { horizontal: true, colors: [series(0), series(1)], width: 14, fill: 0.84,
        tip: (v, i) => { const r = rows[i]; return `<b>${esc(words(r.s.name))}</b><br>B = ${r.B} · bytes per step ${MB(r.T)} · memory per sequence ${MB(r.M)}<br>link-bound ${fmt(r.Nlink, 0)} · memory-bound ${fmt(r.Nhbm, 0)}<br><b>${fmt(r.N, 0)} sequences per GPU</b> (${r.binds}) · ${fmt(r.N / hs.N, 2)}× HiSparse<br><i>${esc(words(r.s.tag))}</i>`; } });
      const f = P.fs, slot = Math.abs(P.y(1) - P.y(0));
      rows.forEach((r, i) => {
        const X = P.x(Math.min(r.N, top)), Y = P.y(i);
        el('line', { x1: X, x2: X, y1: Y - slot * 0.42, y2: Y + slot * 0.42, style: 'stroke:var(--ink);stroke-width:3;stroke-linecap:round' }, P.g.top);
        const far = Math.max(r.Nlink, r.Nhbm);
        el('text', { x: P.x(Math.min(top, far)) + 6 * f, y: Y + 4 * f, class: 'val', style: 'font-weight:700', text: `${fmt(r.N, 0)}${far > top ? ` ›${fmt(far, 0)}` : ''}` }, P.g.top);
        if (r.s.id === cur) el('rect', { x: P.m.l, y: Y - slot / 2, width: P.pw, height: slot, rx: 4, style: 'fill:var(--c);opacity:.09' }, P.g.bg);
      });
      rule(P, { x: hs.N, label: `HiSparse ${fmt(hs.N, 0)}`, dash: '3 4' });
      tbl.replaceChildren(table(['design', T('\\vrho'), T('\\vw/\\vb'), T('\\vB'), T('\\vTstep'), T('\\vMreq'), T('\\vNlink'), T('\\vNhbm'), T('\\vN'), 'vs HiSparse', 'inputs'], rows.map(r => ({
        cls: r.s.id === cur ? 'hl' : null,
        cells: [`<span class="msr-key" style="--kc:${r.s.color}"></span>${esc(words(r.s.short))}`, fmt(r.s.rho, r.s.kind === 'hisparse' ? 1 : 3), r.s.wb != null ? fmt(r.s.wb, 3) : r.s.kind === 'sequence' ? `w = ${r.s.w}` : '—', String(r.B), MB(r.T), MB(r.M), fmt(r.Nlink, 0), fmt(r.Nhbm, 0), `<b>${fmt(r.N, 0)}</b>`,
          { html: `${fmt(r.N / hs.N, 2)}×`, cls: r.N > hs.N * 1.02 ? 'pos' : r.N < hs.N * 0.98 ? 'neg' : '' }, `<span class="msr-tag ${r.s.tag.startsWith('measured') ? 'is-measured' : r.s.tag === 'hypothetical' ? 'is-hypo' : ''}">${esc(words(r.s.tag))}</span>`],
      })), { left: [0, 10] }));
    }
    run();
  };
})();
