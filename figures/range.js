/* Part XII, "The interesting range" (content/12-range): figures/range.js.
   Builders: rngShareVsRatio, rngEntropyLadder, rngCorners, rngFireStates, rngFireTrace, rngFireNapkin,
   rngDollars, rngSettings.
   Measured numbers are read at runtime from figures/data/measured-*.json (Part XI's extraction) and
   figures/data/range-curve.json (analysis/range_extract.py). The rig (layers, entry size, selections, miss
   rates, TPOT, link, memory) comes from the reference-setting switch, KV.settings (spec §5); when the engine has
   not loaded it, the Pin's constants of III.10 are used and a fig-note says so. Toys and assumptions are marked.
   Colour follows the entity: the entry splits and the recurring coders 121 and 129 keep Part XI's colours. */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------------ data (fails loudly)
  async function data(file) {
    const url = (window.KV && KV.prefix ? KV.prefix : '/') + 'assets/figs/data/' + file + '.json';
    const r = await fetch(url);
    if (!r.ok) throw new Error(`could not load ${file}.json (${r.status})`);
    return r.json();
  }
  /** need(obj.key, 'file.key') throws when a field the figure relies on is missing. */
  function need(v, what) { if (v == null) throw new Error(`range data: missing ${what}`); return v; }
  function num(v, what) { need(v, what); if (!Number.isFinite(+v)) throw new Error(`range data: ${what} is not a number`); return +v; }

  // ------------------------------------------------------------------ the reference setting (the switch, or the Pin)
  /* The two settings of spec §5, used only when KV.settings is absent (the engine's switch not loaded yet). */
  const PIN = { label: 'the Pin', name: 'GLM-5.1 on 8 × H200, as HiSparse serves it, at 8-bit storage',
    values: { model: 'GLM-5.1', NL: 78, heads: null, headdim: null, d: 640, e: 640, k: 2048, L: 100384, b: 4096, m2: 0.30, m4: 0.134, m8: 0.067, tpot: 30, Wlink: 50, Mhbm: 30, gpu: 'H200 (141 GB)', format: '8-bit (E4M3)' } };
  const BENCH = { label: 'the Bench', name: 'Qwen3.5-2B on one RTX 5080, the campaigns’ data',
    values: { model: 'Qwen3.5-2B', NL: 6, heads: 2, headdim: 256, d: 512, e: 512, k: null, L: 225000, b: 4096, m2: null, m4: null, m8: null, tpot: null, Wlink: 50, Mhbm: 10, gpu: 'RTX 5080 (16 GB)', format: 'FP8 E4M3, values' } };
  const FALLBACK = { pin: PIN, bench: BENCH };
  /* key → [name, unit, fmt]: a fallback for data/settings.yaml (spec §5) when the engine's KV.settingKeys is absent */
  const KEYS = {
    model: ['model', '', 'text'], NL: ['layers with a KV cache', 'layers', 'int'], heads: ['KV heads per layer', '', 'int'],
    headdim: ['elements per head', '', 'int'], d: ['elements per entry', 'elements', 'int'], e: ['entry size', 'bytes', 'bytes'],
    k: ['selections per layer per step', '', 'int'], L: ['context length', 'tokens', 'int'], b: ['block size used in examples', 'tokens', 'int'],
    m2: ['miss rate at 2048 slots', '', 'pct'], m4: ['miss rate at 4096 slots', '', 'pct'], m8: ['miss rate at 8192 slots', '', 'pct'],
    tpot: ['time per output token', 'ms', 'ms'], Wlink: ['link bandwidth', 'GB/s', 'gbps'], Mhbm: ['GPU memory for KV', 'GB', 'gb'],
    gpu: ['GPU', '', 'text'], format: ['storage format', '', 'text'],
  };
  const hasSwitch = () => !!(window.KV && KV.settings && typeof KV.settings === 'object' && Object.keys(KV.settings).length);
  const settings = () => (hasSwitch() ? KV.settings : FALLBACK);
  function settingId() {
    const S = settings();
    if (hasSwitch() && KV.setting && S[KV.setting]) return KV.setting;
    if (hasSwitch() && KV.settingDefault && S[KV.settingDefault]) return KV.settingDefault;
    return S.pin ? 'pin' : Object.keys(S)[0];
  }
  const current = () => settings()[settingId()] || PIN;
  const rig = () => Object.assign({}, (current().values || {}));          // nulls stay null: "not measured"
  const label = () => current().label || settingId();
  const missSide = r => [r.k, r.m2, r.m4, r.m8, r.tpot].every(v => v != null);   // the selector-side numbers exist
  const NM = () => 'not measured';
  const onSetting = fn => document.addEventListener('kv:setting', fn);
  /** A fig-note when the switch is not loaded (figures then use the Pin's constants). */
  const switchNote = () => (hasSwitch() ? document.createDocumentFragment() : h('p', { class: 'fig-note', text: 'The reference-setting switch is not loaded on this page; the rig is the Pin (III.10): 78 layers, 640 B entries, 2048 selections, 30 ms, 50 GB/s, 30 GB.' }));
  /** [name, unit, fmt] of a setting key: the engine's table (KV.settingKeys, data/settings.yaml) when loaded, else KEYS. */
  function keyMeta(k) {
    const s = window.KV && KV.settingKeys && KV.settingKeys[k];
    if (s) return [s.name || k, s.unit || '', s.fmt || 'text'];
    return KEYS[k] || [k, '', 'text'];
  }
  /** A value in the engine's format (KV.fmt, lib/settings-fmt.js: "225 000", "640 B", "13.4 %"), so the table matches the prose and the [[@key]] spans. */
  function fmtVal(f, v) {
    if (v == null) return null;
    if (window.KV && KV.fmt && typeof KV.fmt.formatValue === 'function') return KV.fmt.formatValue(v, f);
    if (f === 'int') return (+v).toLocaleString('en-GB');
    if (f === 'bytes') return `${v} B`;
    if (f === 'pct') return fmtPct(v, 1);
    if (f === 'ms') return `${v} ms`;
    if (f === 'gbps') return `${v} GB/s`;
    if (f === 'gb') return `${v} GB`;
    return String(v);
  }
  const fmtKey = (k, v) => fmtVal(keyMeta(k)[2], v);

  // ------------------------------------------------------------------ the cost model of VI.15 (copied from homework-b.js)
  const REF = { L: 100000, k: 2048, NL: 78, e: 640, tpot: 30, link: 50, hbm: 30, B: 4096, m2: 0.30, m4: 0.134, m8: 0.067, dec: 500 };
  const missOf = (p, B) => (B === 2048 ? p.m2 : B === 8192 ? p.m8 : p.m4);
  /** The setting's values in econ's field names (link, hbm); nulls stay null. */
  const rigEcon = r => ({ L: r.L, k: r.k, NL: r.NL, e: r.e, tpot: r.tpot, link: r.Wlink, hbm: r.Mhbm, m2: r.m2, m4: r.m4, m8: r.m8 });

  /* p: rig (L, k, NL, e [B], tpot [ms], link [GB/s], hbm [GB], m2/m4/m8) + scenario (scope, B, rho, w, b, nD, fD,
     nload, lever2). Returns bytes per step, memory, request bounds. lever2: the resident dictionary replaces the
     hot-cache slots of its block, so the hot cache needs about (1 − f_D) B slots for the cold blocks. */
  function econ(p) {
    const m = missOf(p, p.B);
    const miss = m * p.k * p.NL * p.e;                       // raw bytes of all misses, per step per request
    let wres = 0, fD = p.fD, nload = p.nload, rho = p.rho;
    if (p.scope === 'hisparse') { fD = 0; nload = 0; rho = 1; }
    else if (p.scope === 'global') { fD = 1; nload = 0; }
    else if (p.scope === 'request') { wres = p.w; fD = 1; nload = 0; }
    else if (p.scope === 'block-all') { wres = Math.ceil(p.L / p.b) * p.w; fD = 1; nload = 0; }
    else { wres = p.nD * p.w; }
    const parts = { delta: miss * fD * rho, raw: miss * (1 - fD), loads: nload * p.NL * p.w * p.e };
    const T = parts.delta + parts.raw + parts.loads;
    const hotSlots = p.scope === 'block-cache' && p.lever2 ? (1 - fD) * p.B : p.B;
    const mparts = { hot: p.NL * p.e * hotSlots, dict: p.NL * p.e * wres };
    const M = mparts.hot + mparts.dict;
    const Nlink = p.link * 1e9 * (p.tpot / 1e3) / T, Nhbm = p.hbm * 1e9 / M;
    const N = Math.min(Nlink, Nhbm);
    return { m, miss, T, M, parts, mparts, wres, fD, nload, rho, Nlink, Nhbm, N,
      binds: Nlink < Nhbm ? 'link' : Nlink > Nhbm ? 'memory' : 'both' };
  }

  // ------------------------------------------------------------------ units, colours, small helpers
  const MB = v => `${fmt(v / 1e6, v < 1e7 ? 2 : 1)} MB`;
  const KB = v => `${fmt(v / 1e3, v < 1e4 ? 1 : 0)} KB`;
  const tok = n => (n >= 1024 && n % 1024 === 0 ? `${n / 1024}K` : n >= 1000 && n % 1000 === 0 ? `${n / 1000}K` : String(n));
  const T = s => tex(s);
  const tall = (box, hh) => (box.getBoundingClientRect().width < 520 ? Math.round(hh * 1.55) : hh);
  const sub = (txt, cls = 'fig-note') => h('p', { class: cls, html: txt });
  const bits = r => 8 * r;
  const fb = (r, d = 2) => `${fmt(bits(r), d)} bits`;
  const SPLIT_IDX = { head: 0, layer: 1, token: 2, other: 3 };
  const splitKey = s => (s in SPLIT_IDX && s !== 'other' ? s : 'other');
  const splitColor = s => series(SPLIT_IDX[splitKey(s)]);
  const SPLIT_LABEL = { head: 'one head (256 B)', layer: 'one layer, both heads (512 B)', token: 'one token, six layers (3072 B)', other: 'other splits (pair, triple, regime, column, tok8)' };
  const splitLegend = (keys = ['head', 'layer', 'token', 'other'], shape = 'dot') => keys.map(k => [SPLIT_LABEL[k], splitColor(k), shape]);
  const CODER = { 121: series(5), 129: series(6) };          // the recurring coders keep Part XI's colours
  const NEUTRAL = 'var(--slate)';                            // landmarks that are not coders (raw, solo)
  const EST = 'var(--ink-3)';                                // estimates: exact models and bounds
  const MODEL = series(3);                                   // the network's own prediction (exact model, one window)
  const HS = series(6);                                      // HiSparse, as in VI.16's calculator
  const POLICY = { raw: HS, block: series(1), fire: series(0) };
  /* the two coder points the on-fire figures switch between (measured: env-t0096; r1-t0036 on the curve) */
  const POINTS = {
    tree: { x: 0.525, y: 0.112, short: 'tree coder', name: 'tree coder 121: x = 0.525, y = 0.112 (env-t0096, layer entries)', emptyShare: 0.8 },
    light: { x: 0.10, y: 0.61, short: 'curve point x = 0.10', name: 'curve point x ≤ 0.10: x = 0.099, y = 0.610 (r1-t0036, coder 30, layer 3 head 0)' },
  };
  function pearson(xs, ys) {
    const n = xs.length; if (n < 3) return NaN;
    const mx = mean(xs), my = mean(ys);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    return sxy / Math.sqrt(sxx * syy);
  }

  // ------------------------------------------------------------------ drawing helpers (the bar kit of Part XI)
  function barPath(horiz, c0, bw, p0, p1, r) {
    const s = p1 < p0 ? 1 : -1, c1 = c0 + bw;
    r = Math.min(r, bw / 2, Math.abs(p1 - p0));
    return horiz
      ? `M${p0} ${c0}H${p1 + s * r}Q${p1} ${c0} ${p1} ${c0 + r}V${c1 - r}Q${p1} ${c1} ${p1 + s * r} ${c1}H${p0}Z`
      : `M${c0} ${p0}V${p1 + s * r}Q${c0} ${p1} ${c0 + r} ${p1}H${c1 - r}Q${c1} ${p1} ${c1} ${p1 + s * r}V${p0}Z`;
  }
  function hatch(P, color = 'var(--ink-3)') {
    const id = uid('hatch');
    const p = el('pattern', { id, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, P.defs);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 6, style: `stroke:${color};stroke-width:1.6` }, p);
    return `url(#${id})`;
  }
  /** A second tick column along the right edge: the same positions in bits per element (8 × ratio). */
  function bitsAxisRight(P, label = 'bits') {
    const f = P.fs, lo = Math.min(P.y0, P.y1), hi = Math.max(P.y0, P.y1);
    const yt = P.opts.yticks || ticks(lo, hi, P.opts.yn || 5);
    const g = el('g', { class: 'rng-bits' }, P.g.axes);
    yt.forEach(v => {
      const Y = P.y(v);
      if (Y < P.m.t - 0.5 || Y > P.H - P.m.b + 0.5) return;
      el('text', { x: P.W - P.m.r + 7 * f, y: Y + 4 * f, text: fmt(8 * v, 2) }, el('g', { class: 'tick' }, g));
    });
    el('text', { x: P.W - P.m.r + 7 * f, y: P.m.t - 8 * f, class: 'lbl', style: 'fill:var(--ink-3)', text: label }, g);
  }
  /** Vertical reference line (under the marks) with its label at the bottom or top. */
  function vrule(P, x, label, o = {}) {
    const f = P.fs, X = P.x(x);
    el('line', { class: 'rule-line', x1: X, x2: X, y1: P.m.t, y2: P.H - P.m.b, style: `stroke:${o.color || 'var(--ink-2)'}` + (o.dash === false ? '' : `;stroke-dasharray:${o.dash || '5 4'}`) }, el('g', { class: 'pk-rule' }, P.g.bg));
    const g = el('g', { class: 'pk-rule' }, P.g.top);
    if (label) {
      const left = o.side ? o.side === 'left' : X > P.m.l + P.pw * 0.7;
      const y = o.pos === 'top' ? P.m.t + 13 * f : P.H - P.m.b - 6 * f;
      svgText(g, X + (left ? -6 : 6) * f, y, label, { class: 'lbl rule-lbl', 'text-anchor': left ? 'end' : 'start' });
    }
    return g;
  }
  /**
   * Horizontal bars whose category label sits left of the axis on wide hosts and above its bar on narrow ones.
   * rows: [{label, v, color, tip, text, kind: 'solid'|'dashed'|'range', lo, hi, dim}]. o: {x, xticks, xfmt, xlabel,
   * label, h, rowH, width, valfmt, base, m, narrow}. Returns {P, narrow, slot}.
   */
  function hbars(box, rows, o = {}) {
    const narrow = o.narrow ?? box.getBoundingClientRect().width < 560;
    const n = rows.length, rowH = o.rowH || (narrow ? 46 : 32);
    const m = Object.assign({ t: 16 }, narrow ? { l: 12 } : {}, o.m || {});
    const P = Plot(box, { w: o.w, ycats: narrow ? rows.map(() => '') : rows.map(r => r.label), x: o.x, xticks: o.xticks, xfmt: o.xfmt,
      h: o.h || rowH * n + (o.xlabel ? 48 : 30) + m.t, xlabel: o.xlabel, grid: 'x', label: o.label, m });
    const f = P.fs, slot = Math.abs(P.y(1) - P.y(0));
    const g = el('g', { class: 'pk-bars rng-hbars' }, P.g.data), hits = el('g', { class: 'pk-bar-hits' }, P.g.top);
    const base = o.base ?? Math.min(P.x0, P.x1);
    const vf = o.valfmt || (v => fmt(v, 2));
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
      if (kind === 'hollow') style = `fill:none;stroke:${color};stroke-width:1.5`;
      if (r.dim) style += ';opacity:.55';
      const p0 = P.x(lo), p1 = P.x(hi);
      const shape = kind === 'range' || kind === 'hollow'
        ? el('rect', { class: 'bar', x: Math.min(p0, p1), y: y0, width: Math.abs(p1 - p0), height: bh, rx: 3 * f, style }, g)
        : el('path', { class: 'bar', d: barPath(true, y0, bh, p0, p1, 4 * f), style }, g);
      const text = r.text != null ? r.text : vf(r.v);
      if (text) el('text', { x: p1 + 6 * f, y: y0 + bh / 2 + 4 * f, class: 'val', text }, P.g.top);
      const hit = el('rect', { class: 'hit', x: P.m.l, y: yc - slot / 2, width: P.pw, height: slot }, hits);
      hover(hit, () => r.tip || `<b>${esc(r.label)}</b><br>${text}`);
      hit.addEventListener('pointerenter', () => shape.classList.add('is-hot'));
      hit.addEventListener('pointerleave', () => shape.classList.remove('is-hot'));
    });
    return { P, narrow, slot };
  }
  /** A grade tag (measured / exact model / extrapolation / assumed). */
  const tag = (txt, kind) => `<span class="rng-tag${kind ? ' is-' + kind : ''}">${esc(txt)}</span>`;

  // ================================================================== XII.1  rngShareVsRatio — dictionary share against ratio
  FIG.rngShareVsRatio = async (host) => {
    const [pd, sd, cd] = await Promise.all([data('measured-points'), data('measured-splits'), data('range-curve')]);
    const pts = need(pd.points, 'points.points').filter(p => p.verified && p.role !== 'baseline');
    // coder 129 by entry split (verified ledger rows) carries the layer-split point the caption names
    const extra = need(sd.coder_129_by_split.rows, 'splits.coder_129_by_split.rows')
      .filter(r => r.verified && !pts.some(p => p.coder === 129 && p.split === r.split && p.b === 4096))
      .map(r => ({ track: `s-${r.split}-b4k-r293`, split: r.split, b: 4096, campaign: 'C2', coder: 129, name: 'pure-wls', ratio: r.ratio, x: r.x, y: r.y, trial: r.trial, verified: true, role: '129 by split' }));
    const pair = need(cd.share_pair, 'range-curve.share_pair');
    const all = pts.concat(extra);
    [pair.from, pair.to].forEach(q => {
      if (!all.some(p => p.trial === q.trial && p.track === q.track)) all.push(Object.assign({ split: 'head', b: 4096, campaign: 'C2', verified: true, role: 'pair' }, q));
    });
    const is129 = p => p.coder === 129 && p.split === 'layer';
    const p91 = all.find(p => p.trial === pair.from.trial && p.track === pair.from.track), p109 = all.find(p => p.trial === pair.to.trial && p.track === pair.to.track);
    need(p91, 'coder 91 point'); need(p109, 'coder 109 point');
    const xOf = p => p.x;                                  // the ledger's x: dictionary bytes ÷ raw bytes (a coder with every delta empty sits at x = its ratio)
    const box = h('div'), ro = readout();
    host.append(legend([...splitLegend(), ['all good tree coders, 0.63–0.69', 'var(--ink-3)', 'band'], ['solo ideal (six layers)', 'var(--ink-2)', 'dash']]), box, ro,
      sub('Every point is a verified ledger row of Part XI (C2 incumbents and the C1 ladder; C1 points are values of layer 3, head 0). x is the dictionary’s share of the raw bytes, so a coder whose deltas are all empty sits at x = its ratio, never at 1. Hover or tap a point for its record. The correlations are computed from the points shown, for the subsets named.'));
    const solo = num(pd.landmarks.solo_ideal.ratio, 'landmarks.solo_ideal.ratio');
    const P = Plot(box, { x: [0, 1], y: [0.6, 0.82], h: tall(box, 400), m: { r: 58, t: 26 }, grid: 'y',
      xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yticks: [0.6, 0.65, 0.7, 0.75, 0.8],
      xlabel: 'dictionary share x (dictionary bytes ÷ raw bytes)', ylabel: 'MDL ratio (all costs)', label: 'Dictionary share against MDL ratio for every verified record of Part XI' });
    bitsAxisRight(P);
    const f = P.fs;
    const tip = p => `<b>coder ${p.coder} ${esc(p.name)}</b> · ${p.campaign}${p.role && p.role !== 'incumbent' ? ` · ${esc(p.role)}` : ''}<br>`
      + `${esc(p.track)} · ${SPLIT_LABEL[splitKey(p.split)].replace(/ \(.*\)/, '')} · blocks of ${p.b}<br>`
      + `ratio <b>${fmt(p.ratio, 4)}</b> = x ${fmt(p.x, 3)} + y ${fmt(p.y, 3)} · ${fb(p.ratio)}<br>share of the coded bytes ${fmtPct(p.x / p.ratio, 0)} · ${p.trial} · verified`;
    function draw() {
      P.clear('bg', 'data', 'top');
      // the band of good tree coders and the solo line
      area(P, [[0, 0.63, 0.69], [1, 0.63, 0.69]], { color: 'var(--ink-3)', opacity: 0.1 });
      [0.63, 0.69].forEach(v => el('line', { x1: P.m.l, x2: P.W - P.m.r, y1: P.y(v), y2: P.y(v), style: 'stroke:var(--ink-3);stroke-dasharray:4 4;stroke-width:1' }, P.g.bg));
      svgText(P.g.bg, P.m.l + 6 * f, P.y(0.69) - 5 * f, 'all good tree coders', { class: 'lbl' });
      el('line', { x1: P.m.l, x2: P.W - P.m.r, y1: P.y(solo), y2: P.y(solo), style: 'stroke:var(--ink-2);stroke-dasharray:6 5;stroke-width:1.3' }, P.g.bg);
      svgText(P.g.bg, P.W - P.m.r - 6 * f, P.y(solo) - 5 * f, `solo ideal ${fmt(solo, 3)}`, { class: 'lbl', 'text-anchor': 'end' });
      all.slice().sort((a, b) => (a.campaign === 'C1' ? 0 : 1) - (b.campaign === 'C1' ? 0 : 1)).forEach(p => {
        const X = P.x(xOf(p)), Y = P.y(p.ratio), ring = is129(p) || p === p91 || p === p109;
        if (ring) el('circle', { cx: X, cy: Y, r: 9 * f, style: 'fill:none;stroke:var(--ink);stroke-width:1.5' }, P.g.data);
        const c = el('circle', { class: 'dot rng-pt', cx: X, cy: Y, r: (p.campaign === 'C1' ? 4.2 : 5) * f, tabindex: ring ? 0 : null, style: `fill:${splitColor(p.split)}` }, P.g.data);
        hover(c, () => tip(p));
      });
      // the two stories of the page: 129 (a tiny dictionary that buys 0.09) and 91 → 109 (every byte into the dictionary, nothing changes)
      const a129 = all.find(is129);
      if (a129) annotate(P, xOf(a129), a129.ratio, `coder 129: ${fmtPct(a129.x, 0)} in the dictionary,\nratio ${fmt(a129.ratio, 3)}`, { dx: 26, dy: 34 });
      const arrowG = el('g', {}, P.g.top);
      arrow(arrowG, P.x(xOf(p91)) + 7 * f, P.y(p91.ratio), P.x(xOf(p109)) - 8 * f, P.y(p109.ratio), 'var(--ink)', 1.6);
      svgText(P.g.top, (P.x(xOf(p91)) + P.x(xOf(p109))) / 2, P.y(p109.ratio) - 9 * f, '91 → 109', { class: 'annot', 'text-anchor': 'middle' });
      // the correlation among tree coders (dictionary share 0.4–1.0 of the raw bytes): small, and its sign depends on the subset
      const tree = all.filter(p => p.x >= 0.4 && p.x <= 1.0), treeC2 = tree.filter(p => p.campaign === 'C2');
      const r = pearson(tree.map(xOf), tree.map(p => p.ratio)), r2 = pearson(treeC2.map(xOf), treeC2.map(p => p.ratio));
      const rr = extent(tree.map(p => p.ratio));
      ro.set([['coder 91 → 109', `x ${fmt(p91.x, 2)} → ${fmt(p109.x, 2)} (every delta empty, so x = ratio): same ratio within ${fmt(Math.abs(pair.delta_ratio), 3)}`],
        ['tree coders, x ≥ 0.4', `${tree.length} verified records (C1 and C2) · ratios ${fmt(rr[0], 3)}–${fmt(rr[1], 3)}`],
        ['Pearson r, share vs ratio', `${fmtS(r, 2)} over all ${tree.length} · ${fmtS(r2, 2)} over the ${treeC2.length} C2 records: small, and the sign depends on the subset`],
        ['coder 129 vs solo', a129 ? `${fmtPct(a129.x, 1)} of dictionary buys −${fmt(solo - a129.ratio, 3)} of ratio` : '—']]);
    }
    draw();
  };

  // ================================================================== XII.2  rngEntropyLadder — bits per element, nested
  FIG.rngEntropyLadder = async (host) => {
    const [pd, ld, md] = await Promise.all([data('measured-points'), data('measured-ladders'), data('measured-memory')]);
    const solo = num(ld.c2.landmarks.solo_ideal, 'ladders.c2.landmarks.solo_ideal');
    const tree = need(need(ld.c2.rows, 'ladders.c2.rows').find(r => r.coder === 121), 'ladders.c2 row of coder 121');
    const light = need(pd.economics_inputs.light_no_tree_coder_129_layer, 'points.economics_inputs.light_no_tree_coder_129_layer');
    const fl = need(md.floors, 'memory.floors');
    const f16 = num(fl.block_16k.ratio, 'floors.block_16k.ratio'), fseq = num(fl.whole_sequence.ratio, 'floors.whole_sequence.ratio');
    const mt = need(md.memory_table, 'memory.memory_table'), rows = need(mt.rows, 'memory_table.rows');
    const cut = need(rows.find(r => r.id === 'both'), 'memory_table row both'), intact = need(rows.find(r => r.id === 'intact'), 'memory_table row intact');
    const soloB = bits(solo);
    const saved = v => (v >= soloB ? '—' : `saves ${fmtPct((soloB - v) / soloB, 0)}`);
    const box = h('div'), tblBox = h('div');
    const narrow = box.getBoundingClientRect().width < 560;
    host.append(legend([['measured coders (verified ledger rows)', 'var(--ink-2)', 'box'], ['landmarks: raw and solo', NEUTRAL, 'box'], ['exact models and bounds (not coders)', EST, 'dash'],
      ['the network’s own prediction, one window', MODEL, 'box']]), box, tblBox,
      sub('Bits per stored FP8 element of a value; the ratio is bits ÷ 8. "Saves" is the share of solo coding’s bits removed. Hover a bar for its receipt. The two model rows are one 2048-token window of one sequence; the floors are exact models, not coders.'));
    const R = [
      { label: 'raw', v: 8, ratio: 1, color: NEUTRAL, kind: 'hollow', grade: 'definition', g: 'def', rec: 'one byte per element (FP8 E4M3)' },
      { label: 'solo ideal', v: soloB, ratio: solo, color: NEUTRAL, grade: 'ledger landmark', g: 'measured', rec: 'per-channel order-0 entropy of the values, all six layers (landmark.solo_ratio of the C2 screens)' },
      { label: 'light coder 129', v: bits(light.rho), ratio: light.rho, color: CODER[129], grade: `verified · ${light.trial}`, g: 'measured', rec: `no reference entries, ${fmtPct(light.w_over_b, 1)} of dictionary; layer entries (512 B), screen of a tenth of the blocks` },
      { label: 'tree coder 121', v: bits(tree.ratio), ratio: tree.ratio, color: CODER[121], grade: `verified · ${tree.trial}`, g: 'measured', rec: `${esc(tree.what)}; x ${fmt(tree.x, 3)} + y ${fmt(tree.y, 3)}; layer entries, screen of a tenth of the blocks` },
      { label: 'block floor, 16K', v: bits(f16), ratio: f16, color: EST, kind: 'dashed', grade: 'exact model', g: 'model', rec: esc(fl.block_16k.grade) },
      { label: 'sequence floor', v: bits(fseq), ratio: fseq, color: EST, kind: 'range', grade: 'extrapolation', g: 'hypo', rec: esc(fl.whole_sequence.grade) },
      { label: 'model, state reset, 2K window', v: Math.round(cut.mean_bits * 100 + 1e-6) / 100, ratio: Math.round(cut.mean_bits * 100 + 1e-6) / 800, color: MODEL, grade: 'exact model, one window', g: 'model', rec: `${esc(cut.label)}: the network predicting its own values with its running state reset and its attention kept inside the 2,048-token window; ${esc(mt.grade)}` },
      { label: 'model intact', v: Math.round(intact.mean_bits * 100 + 1e-6) / 100, ratio: Math.round(intact.mean_bits * 100 + 1e-6) / 800, color: MODEL, grade: 'exact model, one window', g: 'model', rec: `${esc(intact.label)}: given the whole past the values are computed, not noisy; the same window` },
    ];
    R.forEach(r => {
      r.text = narrow ? `${fmt(r.v, 2)} · ${fmt(r.ratio, 3)}` : `${fmt(r.v, 2)} bits · ratio ${fmt(r.ratio, 3)} · ${saved(r.v)}`;
      r.tip = `<b>${esc(r.label)}</b> · ${esc(r.grade)}<br>${fmt(r.v, 3)} bits per element · ratio ${fmt(r.ratio, 4)} · ${saved(r.v)} of solo<br>${r.rec}`;
    });
    const { P } = hbars(box, R, { x: [0, narrow ? 11.5 : 12.5], xticks: [0, 2, 4, 6, 8], xlabel: 'bits per element (8 = raw)', narrow,
      label: 'Nested ladder of bits per element: raw, solo, the two coders, the floors and the model’s own prediction' });
    vrule(P, 8, 'raw 8', { pos: 'top', side: 'left', color: 'var(--ink-3)' });
    vrule(P, soloB, `solo ${fmt(soloB, 2)}`, { pos: 'top', side: 'left', color: 'var(--ink-2)' });
    tblBox.append(table(['', 'bits', 'ratio', 'share of solo saved', 'grade'],
      R.map(r => [esc(r.label), fmt(r.v, 3), fmt(r.ratio, 3), r.v >= soloB ? '—' : fmtPct((soloB - r.v) / soloB, 0), { html: tag(r.grade, r.g) }]), { left: [0, 4] }));
  };

  // ================================================================== XII.3  rngCorners — the curve with its two corners
  FIG.rngCorners = async (host) => {
    const cd = await data('range-curve');
    const pts = need(cd.points, 'range-curve.points');
    const byRole = r => pts.filter(p => p.role === r);
    const curve = byRole('curve').sort((a, b) => a.x - b.x);
    if (curve.length < 3) throw new Error('range-curve: fewer than three curve points');
    const tree = need(byRole('tree')[0], 'tree point'), alld = need(byRole('all-dictionary')[0], 'all-dictionary point');
    const soloC = need(byRole('solo-coded')[0], 'solo coded'), soloI = need(byRole('solo-ideal')[0], 'solo ideal'), solo6 = need(byRole('solo-ideal-c2')[0], 'solo ideal six layers');
    const light = byRole('light')[0];
    const best = cd.best_per_budget || [];
    const X0 = 0.05, X1 = 0.45;                               // the corners: tiny dictionaries; half the block resident
    const box = h('div', { class: 'rng-square' }), ro = readout();
    host.append(legend([['the measured curve: coder 30 at each budget (C1, layer 3 head 0)', series(0), 'line'], ['the C2 tree point, layer entries', CODER[121], 'dot'], ['every entry in the dictionary (y = 0)', NEUTRAL, 'dot'],
      ['later best coder per budget', 'var(--ink-2)', 'dot'], ['baseline x + y = 1, ending at (1, 0): the whole block resident, raw', 'var(--ink-2)', 'line'], [`solo lines: coded ${fmt(soloC.ratio, 3)} · ideal ${fmt(soloI.ratio, 3)} · six layers ${fmt(solo6.ratio, 3)}`, 'var(--ink-2)', 'dash']]), box, ro,
      sub('x is the dictionary’s share of the raw bytes, y the deltas’ share; the ratio is x + y, so every point of one ratio lies on one diagonal. Grey corners: per-entry coding (left) and half the history resident (right); the accent band between is the interesting range. Hover or tap a point for its receipt; click to read it out.'));
    const P = Plot(box, { w: 520, h: 520, x: [0, 1], y: [0, 1], equal: true, grid: false, xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1],
      xlabel: 'dictionary share x (of the raw bytes)', ylabel: 'delta share y', label: 'The compressibility curve under a dictionary budget, with the two boring corners shaded' });
    const f = P.fs;
    // regions
    area(P, [[0, 0, 1], [X0, 0, 1]], { color: 'var(--ink-3)', opacity: 0.14 });
    area(P, [[X1, 0, 1], [1, 0, 1]], { color: 'var(--ink-3)', opacity: 0.14 });
    area(P, [[X0, 0, 1], [X1, 0, 1]], { color: 'var(--c)', opacity: 0.08 });
    [X0, X1].forEach(x => el('line', { x1: P.x(x), x2: P.x(x), y1: P.m.t, y2: P.H - P.m.b, style: 'stroke:var(--ink-3);stroke-dasharray:3 4;stroke-width:1' }, P.g.bg));
    // region names live in the empty triangle above the baseline (x + y > 1 is impossible for a coder)
    svgText(P.g.bg, P.x(0.25), P.y(0.965), 'the interesting range', { class: 'lbl', 'text-anchor': 'middle' });
    svgText(P.g.bg, P.x(0.725), P.y(0.78), 'half the history\nresident', { class: 'lbl', 'text-anchor': 'middle' });
    const pX = P.x(X0 / 2), pY = P.y(0.3);
    el('text', { x: pX, y: pY + 4 * f, class: 'lbl', 'text-anchor': 'middle', transform: `rotate(-90 ${pX} ${pY})`, text: 'per-entry coding' }, P.g.bg);
    // iso-lines: the baseline and the three solo lines (x + y = constant)
    const iso = (r, style) => el('line', { x1: P.x(0), y1: P.y(r), x2: P.x(r), y2: P.y(0), style }, P.g.bg);
    iso(1, 'stroke:var(--ink-2);stroke-width:1.5');
    const bX = P.x(0.55), bY = P.y(0.45);
    el('text', { x: bX, y: bY - 5 * f, class: 'lbl', 'text-anchor': 'middle', transform: `rotate(-45 ${bX} ${bY})`, text: 'baseline  x + y = 1' }, P.g.bg);
    iso(soloC.ratio, 'stroke:var(--ink-2);stroke-width:1.2;stroke-dasharray:6 5');
    iso(soloI.ratio, 'stroke:var(--ink-2);stroke-width:1;stroke-dasharray:2 4');
    iso(solo6.ratio, 'stroke:var(--ink-2);stroke-width:1;stroke-dasharray:2 4');
    // (1, 0): the right end of the baseline, the whole block resident and raw; a landmark, not a coder
    const corner = el('circle', { class: 'dot rng-pt', cx: P.x(1), cy: P.y(0), r: 4.6 * f, tabindex: 0, style: 'fill:var(--paper-3);stroke:var(--ink-2);stroke-width:1.6' }, P.g.data);
    hover(corner, () => '<b>(1, 0): the whole block resident, raw</b><br>the right end of the baseline x + y = 1: every entry kept as it is, nothing coded; ratio 1<br>a landmark of the square, not a coder');
    svgText(P.g.top, P.x(1) - 2 * f, P.y(0) - 26 * f, 'whole block\nresident, raw', { class: 'lbl', 'text-anchor': 'end' });
    // the curve: solo coded → budget points → the C2 tree point (dashed: different entries) → every entry in the dictionary
    const c1 = [soloC].concat(curve);
    line(P, c1.map(p => [p.x, p.y]), { color: series(0), width: 2.4 });
    line(P, [[curve[curve.length - 1].x, curve[curve.length - 1].y], [tree.x, tree.y], [alld.x, alld.y]], { color: series(0), width: 1.6, dash: '5 5' });
    const rec = p => `<b>${p.role === 'curve' ? (p.budget == null ? 'unconstrained' : `budget x ≤ ${fmt(p.budget, 2)}`) : esc(p.name || p.role)}</b>${p.coder ? ` · coder ${p.coder} ${esc(p.name)}` : ''}<br>`
      + `ratio <b>${fmt(p.ratio, 4)}</b> = x ${fmt(p.x, 3)} + y ${fmt(p.y, 3)} · ${fb(p.ratio)}<br>${esc(p.track)} · ${p.trial || 'no trial'} · ${p.grade === 'ledger' ? 'ledger row' : 'page number'}${p.verified ? ', verified' : ''}<br><i>${esc(p.note || p.receipt || '')}</i>`;
    const pick = p => ro.set([[p.role === 'curve' ? (p.budget == null ? 'unconstrained' : `x ≤ ${fmt(p.budget, 2)}`) : esc(p.name || p.role), `ratio ${fmt(p.ratio, 4)} = ${fmt(p.x, 3)} + ${fmt(p.y, 3)} · ${fb(p.ratio)}`],
      ['saving per δ-miss', `(1 − y) e = ${fmt(1 - p.y, 2)} e`], ['dictionary', `x b = ${fmt(p.x * 4096, 0)} entries’ worth of a 4096 block`], ['receipt', `${p.trial || 'page'} · ${esc(p.track)} · ${p.grade}`]]);
    const mark = (p, color, r, shape) => {
      const X = P.x(p.x), Y = P.y(p.y);
      const n = shape === 'square' ? el('rect', { class: 'rng-pt', x: X - r, y: Y - r, width: 2 * r, height: 2 * r, rx: 2, tabindex: 0, style: `fill:${color};stroke:var(--paper-3);stroke-width:1.5` }, P.g.data)
        : el('circle', { class: 'dot rng-pt', cx: X, cy: Y, r, tabindex: 0, style: shape === 'hollow' ? `fill:var(--paper-3);stroke:${color};stroke-width:1.6` : `fill:${color}` }, P.g.data);
      hover(n, () => rec(p));
      n.addEventListener('click', () => pick(p));
      return n;
    };
    best.forEach(p => mark(p, 'var(--ink-2)', 3.6 * f, 'hollow'));
    c1.forEach(p => mark(p, series(0), 5 * f));
    mark(tree, CODER[121], 5.5 * f, 'square');
    mark(alld, NEUTRAL, 5 * f);
    if (light) mark(light, CODER[129], 4.6 * f);
    // point labels: the budget on each curve point, placed up-right where the square is empty
    svgText(P.g.top, P.x(soloC.x) + 7 * f, P.y(soloC.y) - 7 * f, `solo · ${fmt(soloC.ratio, 3)}`, { class: 'val' });
    curve.forEach(p => svgText(P.g.top, P.x(p.x) + 7 * f, P.y(p.y) - 7 * f, p.budget == null ? `free · ${fmt(p.ratio, 3)}` : `x ≤ ${fmt(p.budget, 2)} · ${fmt(p.ratio, 3)}`, { class: 'val' }));
    svgText(P.g.top, P.x(tree.x) - 9 * f, P.y(tree.y) + 4 * f, `tree 121 · ${fmt(tree.ratio, 3)}`, { class: 'val', 'text-anchor': 'end' });
    svgText(P.g.top, P.x(alld.x) - 8 * f, P.y(alld.y) - 6 * f, `all in the dictionary · ${fmt(alld.ratio, 3)}`, { class: 'val', 'text-anchor': 'end' });
    pick(curve.find(p => p.budget === 0.1) || curve[0]);
  };

  // ================================================================== XII.4  rngFireStates — the four states and what a miss moves
  FIG.rngFireStates = (host) => {
    let pt = 'tree', r = rig();
    const box = h('div'), ro = readout(), note = h('p', { class: 'fig-note' });
    host.append(controls(seg([['tree', 'tree coder: x 0.525 · y 0.112'], ['light', 'curve point: x 0.10 · y 0.61']], pt, v => { pt = v; draw(); }, 'coder point')), box, ro, note, switchNote());
    const D = Diagram(box, { w: 640, h: 360, label: 'The four states of a block in the dictionary cache, ice, warming, on fire and cooling, with the bytes a miss moves in each' });
    const f = D.fs, g = el('g', {}, D.svg);
    const C = { ice: 'var(--sky)', warm: 'var(--saffron)', fire: 'var(--vermilion)', cool: 'var(--slate)' };
    function draw() {
      g.replaceChildren();
      r = rig();
      const e = r.e ?? 640, b = r.b ?? 4096, p = POINTS[pt];
      const dict = p.x * b * e, dmiss = p.y * e;
      const Bf = v => (v >= 1e6 ? MB(v) : v >= 1e3 ? KB(v) : `${fmt(v, 0)} B`);
      const states = [
        { name: 'ice', color: C.ice, lines: ['nothing resident', 'a miss moves:', `raw e = ${Bf(e)}`] },
        { name: 'warming', color: C.warm, lines: ['popularity rising,', 'nothing resident', 'a miss moves:', `raw e = ${Bf(e)}`] },
        { name: 'on fire', color: C.fire, lines: ['dictionary resident', 'load in flight at first:', `x b e = ${Bf(dict)}`, 'a miss moves:', `mean y e ≈ ${Bf(dmiss)}`].concat(pt === 'tree' ? [`${fmtPct(p.emptyShare, 0)} of deltas empty,`, 'the rest 0.5–0.75 e'] : ['every miss a delta']) },
        { name: 'cooling', color: C.cool, lines: ['popularity falling,', 'dictionary still resident', 'a miss moves:', `mean y e ≈ ${Bf(dmiss)}`, 'once the slot is given up', `raw e = ${Bf(e)}`] },
      ];
      // a 2 × 2 ring read clockwise: ice (top left) → warming → on fire → cooling → ice; the boxes are sized for the longest one,
      // and the viewBox grows with the phone text
      const lineH = 13.5 * f, bw = 250, nmax = Math.max(...states.map(s => s.lines.length)), bh = 24 * f + (nmax + 1) * lineH, gapY = 56 * f, y0 = 10, y1 = y0 + bh + gapY;
      const pos = [{ x: 8, y: y0 }, { x: 382, y: y0 }, { x: 382, y: y1 }, { x: 8, y: y1 }];
      D.svg.setAttribute('viewBox', `0 0 640 ${Math.round(y1 + bh + 10)}`);
      states.forEach((st, i) => {
        const { x, y } = pos[i];
        el('rect', { x, y, width: bw, height: bh, rx: 12, style: `fill:${st.color};fill-opacity:.1;stroke:${st.color};stroke-width:2` }, g);
        el('path', { d: `M${x} ${y + 12}Q${x} ${y} ${x + 12} ${y}H${x + bw - 12}Q${x + bw} ${y} ${x + bw} ${y + 12}V${y + 24 * f}H${x}Z`, style: `fill:${st.color}` }, g);
        el('text', { x: x + bw / 2, y: y + 16.5 * f, 'text-anchor': 'middle', class: 'lbl', style: 'fill:var(--paper-3);stroke:none;font-weight:600', text: st.name }, g);
        st.lines.forEach((t, k) => {
          const isVal = /^(raw e|mean y e|x b e) /.test(t);
          svgText(g, x + bw / 2, y + 24 * f + (k + 1) * lineH + 2 * f, t, { class: isVal ? 'val' : t === 'a miss moves:' ? 'lbl' : 'annot', 'text-anchor': 'middle' });
        });
      });
      const A = 'var(--ink-2)';
      // ice → warming (across the top), label above the arrow
      arrow(g, pos[0].x + bw + 4, y0 + bh / 2, pos[1].x - 4, y0 + bh / 2, A, 2);
      svgText(g, 320, y0 + bh / 2 - 8 * f, 'popularity\nrising', { class: 'lbl', 'text-anchor': 'middle' });
      // warming → on fire (down the right column), label to the right of the arrow in the row gap
      arrow(g, pos[1].x + bw / 2, y0 + bh + 4, pos[2].x + bw / 2, y1 - 4, A, 2);
      // (with the phone enlargement the full label runs off the right edge, so it is shortened there)
      svgText(g, pos[1].x + bw / 2 + 8 * f, y0 + bh + gapY / 2 - 4 * f, f > 1.4 ? 'crosses θ:\nload begins' : 'popularity ≥ θ:\nload begins', { class: 'lbl', 'text-anchor': 'start' });
      // on fire → cooling (across the bottom), label below the arrow
      arrow(g, pos[2].x - 4, y1 + bh / 2, pos[3].x + bw + 4, y1 + bh / 2, A, 2);
      svgText(g, 320, y1 + bh / 2 - 8 * f, 'popularity\n< θ', { class: 'lbl', 'text-anchor': 'middle' });
      // cooling → ice (up the left column), label to the right of the arrow
      arrow(g, pos[3].x + bw / 2, y1 - 4, pos[0].x + bw / 2, y0 + bh + 4, A, 2);
      svgText(g, pos[3].x + bw / 2 + 8 * f, y0 + bh + gapY / 2 - 4 * f, 'slot claimed by\na hotter block', { class: 'lbl', 'text-anchor': 'start' });
      const be = p.x * b / (1 - p.y);
      ro.set([['one block’s dictionary', `x b e = ${fmt(p.x, 3)} × ${tok(b)} × ${e} B = ${MB(dict)} per layer${r.NL ? ` · ${MB(dict * r.NL)} over ${r.NL} layers` : ''}`],
        ['a δ-miss moves', `y e ≈ ${Bf(dmiss)} (saves ${fmt(1 - p.y, 2)} e = ${Bf((1 - p.y) * e)})`],
        ['a load pays for itself after', `x b / (1 − y) ≈ ${fmt(be, 0)} δ-misses in its block (a raw prefetch of the block: ${tok(b)})`]]);
      note.textContent = `${p.name}; e = ${e} B and b = ${tok(b)} tokens from ${label()}. θ is the popularity threshold; popularity is the running count of a block’s misses over recent steps. A cooling block keeps its dictionary, so its misses still travel as deltas, until a hotter block claims the slot and it is ice again.`;
    }
    onSetting(draw);
    draw();
  };

  // ================================================================== XII.4  rngFireTrace — a seeded toy replay of three policies
  FIG.rngFireTrace = (host) => {
    // a Pin toy: 640-byte entries and 274 misses per layer per step at B = 4096, whatever the reference-setting switch says
    const STEPS = 300, NB = 25, MISS = 274, B = 4096, b = 4096, LOAD_STEPS = 4, ALPHA = 1 / 10, DRIFT = 60, E = 640;
    let conc = 0.7, theta = 20, nD = 4, pt = 'tree', view = 'step';
    const box = h('div'), ro = readout(), note = h('p', { class: 'fig-note' });
    host.append(controls(
      slider('concentration (share of misses in the hot blocks)', 0, 1, 0.05, conc, v => { conc = v; redraw(); }, v => fmtPct(v, 0)),
      slider('threshold θ (misses per step)', 2, 60, 1, theta, v => { theta = v; redraw(); }, v => fmt(v, 0)),
      slider(texify('$\\vnD$ (resident dictionaries, and hot blocks)'), 1, 8, 1, nD, v => { nD = v; redraw(); }, v => fmt(v, 0)),
      seg([['tree', 'tree coder: x 0.525 · y 0.112'], ['light', 'curve point: x 0.10 · y 0.61']], pt, v => { pt = v; redraw(); }, 'coder point'),
      seg([['step', 'bytes per step'], ['cum', 'cumulative']], view, v => { view = v; redraw(); }, 'what the plot shows')),
      legend([['HiSparse: every miss raw', POLICY.raw, 'line'], ['whole-block prefetch when popular', POLICY.block, 'line'], ['on fire: load the dictionary, then δ-misses', POLICY.fire, 'line']]),
      box, ro, note);
    const P = Plot(box, { x: [0, STEPS], y: [0, 1], h: tall(box, 360), xlabel: 'decode step', ylabel: 'link bytes per step, per layer (KB)', grid: 'y',
      label: 'Link bytes per step for three policies on a toy selector whose hot blocks drift' });
    let cross = null;
    /* The toy selector: MISS misses per layer per step; a share `conc` lands in nD hot blocks (random weights), the
       rest spreads over the cold blocks; the hot set drifts every DRIFT steps (half of it is replaced). Counts per block. */
    function misses() {
      const R = rng('range-fire-trace'), out = [];
      let hot = R.shuffle(range(NB)).slice(0, nD);
      for (let s = 0; s < STEPS; s++) {
        if (s > 0 && s % DRIFT === 0) {
          const keep = hot.slice(0, Math.floor(nD / 2)), pool = range(NB).filter(j => !hot.includes(j));
          hot = keep.concat(R.shuffle(pool).slice(0, nD - keep.length));
        }
        const c = new Float64Array(NB);
        const nh = clamp(Math.round(MISS * conc * (1 + 0.08 * R.normal())), 0, MISS);
        const w = hot.map(() => R.uniform(0.5, 1.5)), ws = sum(w);
        let given = 0;
        hot.forEach((j, i) => { const v = i === hot.length - 1 ? nh - given : Math.round(nh * w[i] / ws); c[j] += v; given += v; });
        const cold = range(NB).filter(j => !hot.includes(j)), rem = MISS - nh;
        const base = Math.floor(rem / cold.length);
        cold.forEach(j => { c[j] += base; });
        for (let i = 0; i < rem - base * cold.length; i++) c[R.pick(cold)] += 1;
        out.push(c);
      }
      return out;
    }
    /* Replay one policy over the counts. States: 0 ice, 1 loading, 2 on fire (resident), 3 cooling (resident, popularity
       below θ). Popularity is an exponential average of the block's misses per step (α = 1/10). A block starts loading
       when its popularity reaches θ and a slot is free, or a cooling block with lower popularity can be evicted. */
    function replay(counts, policy, x, y) {
      const size = policy === 'block' ? b : x * b;              // entries' worth moved by one load, and resident per block
      const state = new Uint8Array(NB), left = new Int16Array(NB), pop = new Float64Array(NB);
      const bytes = new Float64Array(STEPS), mem = new Float64Array(STEPS);
      let loads = 0, deltaMisses = 0, resident = 0;
      for (let s = 0; s < STEPS; s++) {
        const c = counts[s];
        let v = 0;
        for (let j = 0; j < NB; j++) {
          if (policy !== 'raw' && (state[j] === 2 || state[j] === 3)) { v += c[j] * (policy === 'block' ? 0 : y); deltaMisses += c[j]; }
          else v += c[j];
          pop[j] = pop[j] * (1 - ALPHA) + c[j] * ALPHA;
        }
        if (policy !== 'raw') {
          for (let j = 0; j < NB; j++) {
            if (state[j] === 1) { v += size / LOAD_STEPS; if (--left[j] <= 0) state[j] = 2; }
            else if (state[j] === 2 && pop[j] < theta) state[j] = 3;
            else if (state[j] === 3 && pop[j] >= theta) state[j] = 2;
          }
          const cands = [];
          for (let j = 0; j < NB; j++) if (state[j] === 0 && pop[j] >= theta) cands.push(j);
          cands.sort((p, q) => pop[q] - pop[p]);
          for (const j of cands) {
            if (resident < nD) { state[j] = 1; left[j] = LOAD_STEPS; resident++; loads++; continue; }
            let cold = -1;
            for (let q = 0; q < NB; q++) if (state[q] === 3 && pop[q] < pop[j] && (cold < 0 || pop[q] < pop[cold])) cold = q;
            if (cold >= 0) { state[cold] = 0; state[j] = 1; left[j] = LOAD_STEPS; loads++; }
          }
        }
        bytes[s] = v;
        mem[s] = B + resident * size;
      }
      const total = sum(bytes), allMiss = MISS * STEPS;
      return { bytes, total, loads, peak: Math.max(...mem), fD: deltaMisses / allMiss, nload: loads / STEPS };
    }
    const redraw = throttleRAF(draw);
    function draw() {
      const e = E, p = POINTS[pt];
      const counts = misses();
      const res = { raw: replay(counts, 'raw'), block: replay(counts, 'block', 1, 0), fire: replay(counts, 'fire', p.x, p.y) };
      const cumOf = q => { let a = 0; return Array.from(q.bytes, v => (a += v)); };
      const ser = k => (view === 'cum' ? cumOf(res[k]).map((v, s) => [s, v * e / 1e6]) : Array.from(res[k].bytes, (v, s) => [s, v * e / 1e3]));
      const top = Math.max(...['raw', 'block', 'fire'].map(k => Math.max(...ser(k).map(q => q[1]))));
      P.opts.ylabel = view === 'cum' ? 'link bytes so far, per layer (MB)' : 'link bytes per step, per layer (KB)';
      P.domain({ y: [0, Math.ceil(top * 1.08 / (view === 'cum' ? 10 : 50)) * (view === 'cum' ? 10 : 50)] });
      P.clear();
      ['raw', 'block', 'fire'].forEach(k => {
        const name = { raw: 'HiSparse', block: 'whole-block prefetch', fire: 'on fire' }[k];
        line(P, ser(k), { name, color: POLICY[k], width: k === 'raw' ? 1.8 : 2.2 });
      });
      for (let s = DRIFT; s < STEPS; s += DRIFT) el('line', { x1: P.x(s), x2: P.x(s), y1: P.m.t, y2: P.H - P.m.b, style: 'stroke:var(--ink-3);stroke-dasharray:3 4;stroke-width:1' }, P.g.bg);
      svgText(P.g.bg, P.x(DRIFT) + 4 * P.fs, P.m.t + 12 * P.fs, 'hot set drifts', { class: 'lbl' });
      if (!cross) cross = crosshair(P, { xname: 'step', xfmt: v => fmt(v, 0), yfmt: v => (view === 'cum' ? `${fmt(v, 1)} MB` : `${fmt(v, 0)} KB`) });
      const cum = k => MB(res[k].total * e), mem = k => `${fmt(res[k].peak / B, 2)} hot caches = ${MB(res[k].peak * e)}`;
      ro.set([['link bytes, 300 steps, per layer', `HiSparse ${cum('raw')} · prefetch ${cum('block')} · on fire ${cum('fire')}`],
        ['on fire vs HiSparse', `${fmtPct(res.fire.total / res.raw.total, 0)} of the bytes · prefetch ${fmtPct(res.block.total / res.raw.total, 0)}`],
        ['loads', `prefetch ${res.block.loads} whole blocks · on fire ${res.fire.loads} dictionaries (n_load ${fmt(res.fire.nload, 3)} per step)`],
        ['misses served as δ', `f_D = ${fmtPct(res.fire.fD, 0)} (prefetch: ${fmtPct(res.block.fD, 0)} absorbed)`],
        ['peak GPU memory, per layer', `prefetch ${mem('block')} · on fire ${mem('fire')} (hot cache alone ${MB(B * e)})`]]);
      note.textContent = `A Pin toy, not a trace: ${NB} blocks of ${tok(b)} tokens, ${MISS} misses per layer per step and e = ${e} B as on the Pin at B = 4096 (the reference-setting switch does not change them), a seeded selector whose hot set of n_D blocks holds the chosen share of the misses and drifts every ${DRIFT} steps. Loads take ${LOAD_STEPS} steps; popularity is a 10-step running average; a cooling block keeps its dictionary (its misses stay deltas) until a hotter block claims the slot. ${p.name}.`;
    }
    draw();
  };

  // ================================================================== XII.5  rngFireNapkin — the calculator of §1.3
  FIG.rngFireNapkin = async (host) => {
    const cd = await data('range-curve');
    const pts = need(cd.points, 'range-curve.points');
    const curve = pts.filter(p => ['curve', 'tree', 'all-dictionary'].includes(p.role)).sort((a, b) => a.x - b.x);
    if (curve.length < 4) throw new Error('range-curve: too few points for the napkin slider');
    let idx = curve.findIndex(p => p.role === 'tree'), nD = 4, fD = 0.85, nload = 0.05, lever2 = false, Bs = 4096;
    const b = 4096;                                            // the curve was measured at 4096-token blocks
    const ptName = p => (p.role === 'tree' ? 'tree coder 121 (C2, layer entries)' : p.role === 'all-dictionary' ? 'every entry in the dictionary (coder 43)' : p.budget == null ? 'coder 30, unconstrained' : `coder 30, budget x ≤ ${fmt(p.budget, 2)}`);
    const kp = { T: kpi(T('\\vTstep'), '', 'link bytes per step, per request'), M: kpi(T('\\vMreq'), '', 'GPU memory per request'),
      link: kpi(T('\\vNlink'), '', 'link-bound', 'var(--ink-2)'), hbm: kpi(T('\\vNhbm'), '', 'memory-bound', 'var(--ink-2)'),
      N: kpi(T('\\vN'), '', 'requests per GPU'), ratio: kpi('vs HiSparse', '', 'same B, raw misses', series(5)),
      be: kpi('break-even', '', 'δ-misses per loaded block'), steps: kpi('break-even', '', 'steps at this f_D and n_D') };
    const slPt = slider('point on the measured curve', 0, curve.length - 1, 1, idx, v => { idx = v; run(); }, i => `x ${fmt(curve[i].x, 3)} · y ${fmt(curve[i].y, 3)}`);
    const lever = btn('lever 2: the dictionary replaces the hot-cache slots of its block', (ev, bt) => { lever2 = !lever2; bt.setAttribute('aria-pressed', String(lever2)); run(); }, { pressed: false, cls: 'sm' });
    const ptLine = h('p', { class: 'rng-ptline' });
    const tblBox = h('div'), chartBox = h('div'), note = h('p', { class: 'fig-note' });
    host.append(controls(slPt), ptLine,
      controls(slider(texify('$\\vnD$'), 1, 16, 1, nD, v => { nD = v; run(); }, v => fmt(v, 0)),
        slider(texify('$\\vfD$ (assumed)'), 0.05, 1, 0.05, fD, v => { fD = v; run(); }),
        slider(texify('$\\vnload$ (assumed)'), 0, 0.3, 0.005, nload, v => { nload = v; run(); }, v => fmt(v, 3)),
        seg([[2048, 'B = 2K'], [4096, 'B = 4K'], [8192, 'B = 8K']], Bs, v => { Bs = +v; run(); }, 'hot-cache slots'), lever),
      h('div', { class: 'kpis' }, kp.T, kp.M, kp.link, kp.hbm, kp.N, kp.ratio, kp.be, kp.steps), tblBox,
      legend([['link-bound requests per GPU', series(0), 'box'], ['memory-bound requests per GPU', series(1), 'box'], ['requests per GPU (the smaller)', 'var(--ink)', 'line']]), chartBox, note, switchNote());
    function chart(rows) {
      chartBox.replaceChildren();
      const vals = rows.flatMap(r => [r.Nlink, r.Nhbm]).filter(Number.isFinite);
      const top = Math.max(50, Math.ceil(Math.max(...vals, 1) * 1.12 / 50) * 50);
      const P = Plot(chartBox, { ycats: rows.map(r => r.short), x: [0, top], h: tall(chartBox, 230), grid: 'x', m: { r: 30 },
        xlabel: 'concurrent decode requests per GPU', label: 'Link-bound and memory-bound requests per GPU: HiSparse, the chosen point, the same point with lever 2' });
      bars(P, rows.map(r => [Number.isFinite(r.Nlink) ? Math.min(r.Nlink, top) : NaN, Math.min(r.Nhbm, top)]), { horizontal: true, colors: [series(0), series(1)], width: 15, fill: 0.84,
        tip: (v, i) => { const r = rows[i]; return `<b>${esc(r.name)}</b><br>link-bound ${Number.isFinite(r.Nlink) ? fmt(r.Nlink, 0) : NM()} · memory-bound ${fmt(r.Nhbm, 0)}${Number.isFinite(r.N) ? `<br><b>${fmt(r.N, 0)} requests per GPU</b> (${r.binds === 'link' ? 'the link binds' : 'memory binds'})` : ''}`; } });
      const slot = Math.abs(P.y(1) - P.y(0));
      rows.forEach((r, i) => {
        const Y = P.y(i);
        if (Number.isFinite(r.N)) {
          const X = P.x(Math.min(r.N, top));
          el('line', { x1: X, x2: X, y1: Y - slot * 0.42, y2: Y + slot * 0.42, style: 'stroke:var(--ink);stroke-width:3;stroke-linecap:round' }, P.g.top);
        }
        const edge = Math.max(Number.isFinite(r.Nlink) ? r.Nlink : 0, r.Nhbm);
        el('text', { x: P.x(Math.min(top, edge)) + 6 * P.fs, y: Y + 4 * P.fs, class: 'val', style: 'font-weight:700', text: Number.isFinite(r.N) ? fmt(r.N, 0) : `memory ${fmt(r.Nhbm, 0)}` }, P.g.top);
      });
    }
    function run() {
      const p = curve[idx], r = rig(), R = rigEcon(r);
      const x = p.x, y = p.y, w = x * b, ok = missSide(r) && [R.NL, R.e, R.link, R.hbm, R.L].every(v => v != null);
      const dataOk = [R.NL, R.e, R.hbm].every(v => v != null);
      if (!dataOk) throw new Error(`setting ${settingId()} lacks NL, e or Mhbm`);
      const base = Object.assign({}, REF, R, { B: Bs, b, w, rho: y, nD, fD, nload });
      ptLine.innerHTML = `<b>${esc(ptName(p))}</b> · ratio ${fmt(p.ratio, 4)} = x ${fmt(x, 3)} + y ${fmt(y, 3)} · ${p.trial} · one block’s dictionary = x b = ${fmt(w, 0)} entries’ worth = ${MB(w * R.e)} per layer · a δ-miss saves (1 − y) e = ${fmt(1 - y, 2)} e`;
      const be = w / (1 - y);
      kp.be.set(Number.isFinite(be) ? fmt(be, 0) : '∞', `δ-misses per loaded block: x b / (1 − y) (a raw prefetch of the block: ${tok(b)})`);
      const r0 = econ(Object.assign({}, base, { scope: 'hisparse' })), r1 = econ(Object.assign({}, base, { scope: 'block-cache', lever2 })), r2 = econ(Object.assign({}, base, { scope: 'block-cache', lever2: true })), r1n = econ(Object.assign({}, base, { scope: 'block-cache', lever2: false }));
      const mem = v => `${MB(v)} = hot cache ${MB(r1.mparts.hot)} + ${nD} × ${MB(r1.mparts.dict / nD)}`;
      kp.M.set(MB(r1.M), mem(r1.M));
      kp.hbm.set(fmt(r1.Nhbm, 0), `memory-bound · ${fmt(R.hbm, 0)} GB ÷ ${MB(r1.M)}${lever2 ? ' · lever 2' : ''}`);
      if (ok) {
        const mps = r0.m * R.k, steps = be * nD / (fD * mps);
        kp.T.set(MB(r1.T), `δ ${MB(r1.parts.delta)} + raw ${MB(r1.parts.raw)} + loads ${MB(r1.parts.loads)} · HiSparse ${MB(r0.T)}`);
        kp.link.set(fmt(r1.Nlink, 0), `link-bound · ${fmt(R.link, 0)} GB/s × ${R.tpot} ms ÷ ${MB(r1.T)}`);
        kp.N.set(fmt(r1.N, 0), `requests per GPU · ${r1.binds === 'link' ? 'the link binds' : r1.binds === 'memory' ? 'GPU memory binds' : 'both bind'}`);
        kp.ratio.set(`${fmt(r1.N / r0.N, 2)}×`, `HiSparse at B = ${tok(Bs)}: ${fmt(r0.N, 0)} requests (${r0.binds === 'link' ? 'link' : 'memory'}-bound)`);
        kp.steps.set(fmt(steps, 0), `steps: ${fmt(be, 0)} × n_D ÷ (f_D × ${fmt(mps, 0)} misses per layer per step)`);
      } else {
        [kp.T, kp.link, kp.N, kp.ratio, kp.steps].forEach(k => k.set(NM(), `on ${label()}: needs k, the miss rates and TPOT, and no selector ran there`));
      }
      const miss = v => (ok ? v : NM());
      tblBox.replaceChildren(table(['', 'HiSparse', 'this point', '+ lever 2'], [
        [`bytes per step ${T('\\vTstep')}`, miss(MB(r0.T)), miss(MB(r1n.T)), miss(MB(r2.T))],
        ['… of which dictionary loads', '—', miss(MB(r1n.parts.loads)), miss(MB(r2.parts.loads))],
        [`memory per request ${T('\\vMreq')}`, MB(r0.M), MB(r1n.M), MB(r2.M)],
        ['… hot cache', MB(r0.mparts.hot), MB(r1n.mparts.hot), MB(r2.mparts.hot)],
        ['… resident dictionaries', '—', MB(r1n.mparts.dict), MB(r2.mparts.dict)],
        [`link-bound ${T('\\vNlink')}`, miss(fmt(r0.Nlink, 0)), miss(fmt(r1n.Nlink, 0)), miss(fmt(r2.Nlink, 0))],
        [`memory-bound ${T('\\vNhbm')}`, fmt(r0.Nhbm, 0), fmt(r1n.Nhbm, 0), fmt(r2.Nhbm, 0)],
        { cells: [`<b>requests per GPU ${T('\\vN')}</b>`, `<b>${miss(fmt(r0.N, 0))}</b>`, `<b>${miss(fmt(r1n.N, 0))}</b>`, `<b>${miss(fmt(r2.N, 0))}</b>`], cls: 'sum' },
      ], { left: [0] }));
      chart([
        { short: `HiSparse, B = ${tok(Bs)}`, name: `HiSparse at B = ${tok(Bs)}: raw misses, no dictionary`, Nlink: ok ? r0.Nlink : NaN, Nhbm: r0.Nhbm, N: ok ? r0.N : NaN, binds: r0.binds },
        { short: 'this point', name: `${ptName(p)}, n_D = ${nD}, f_D = ${fD}, n_load = ${nload}`, Nlink: ok ? r1n.Nlink : NaN, Nhbm: r1n.Nhbm, N: ok ? r1n.N : NaN, binds: r1n.binds },
        { short: '+ lever 2', name: 'the same point with lever 2: the dictionary replaces the hot-cache slots of its block', Nlink: ok ? r2.Nlink : NaN, Nhbm: r2.Nhbm, N: ok ? r2.N : NaN, binds: r2.binds },
      ]);
      note.textContent = `Rig: ${label()} (${[`N_L = ${R.NL}`, `e = ${R.e} B`, R.k != null ? `k = ${R.k}` : 'k not measured', R.tpot != null ? `TPOT = ${R.tpot} ms` : 'TPOT not measured', `${R.link} GB/s`, `${R.hbm} GB`].join(', ')}). Measured: x and y of the chosen point (b = ${tok(b)} tokens). Assumed: f_D, n_load, n_D. Requests per GPU are rounded to whole requests.`;
    }
    onSetting(run);
    run();
  };

  // ================================================================== XII.6  rngDollars — N → TPS → cost per million tokens
  FIG.rngDollars = (host) => {
    const SCEN = [
      { id: 'hs', short: 'HiSparse', name: 'HiSparse, B = 4K (VI.15)', N: 109, color: HS, src: 'the Pin, link-bound' },
      { id: 'solo', short: 'solo', name: 'solo coding, ρ = 0.88 (VI.16, assumed ρ)', N: 124, color: NEUTRAL, src: 'the Pin, link-bound' },
      { id: 'req', short: 'request scope', name: 'request scope, w = 256, ρ = 0.75 (VI.16, assumed)', N: 138, color: series(2), src: 'the Pin, memory-bound' },
      { id: 'fire', short: 'on-fire napkin', name: 'on-fire dictionaries, lever 2, n_D = 1 (XII.5)', N: 120, color: series(5), src: 'the Pin, memory-bound: the lever-2 example of XII.5' },
      { id: 'free', short: 'free N', name: 'any N you choose', N: 200, color: 'var(--c)', src: 'the slider' },
    ];
    let sc = 'hs', freeN = 200, price = 3, tpot = null;
    const kN = kpi(T('\\vN'), '', 'requests per GPU (the decode batch)'), kTPS = kpi('TPS', '', 'tokens per second per GPU = N ÷ TPOT'), kCost = kpi('cost per 1M tokens', '', 'price ÷ (TPS × 3600) × 10⁶', series(5)), kRatio = kpi('vs HiSparse', '', 'the number that transfers');
    const slN = slider(texify('free $\\vN$'), 20, 400, 1, freeN, v => { freeN = v; if (sc !== 'free') { sc = 'free'; sg.set('free'); } run(); }, v => fmt(v, 0));
    const tpotIn = h('input', { type: 'number', step: '1', min: '1', 'aria-label': 'time per output token in ms' });
    tpotIn.addEventListener('input', () => { const v = parseFloat(tpotIn.value); if (Number.isFinite(v) && v > 0) { tpot = v; run(); } });
    const tpotLab = h('label', { class: 'rng-in' }, h('span', { class: 'rng-in-name', html: `step time ${T('\\vtpot')}` }), h('span', { class: 'rng-in-box' }, tpotIn, h('span', { class: 'rng-in-unit', text: 'ms' })));
    const tpotNote = h('span', { class: 'fig-note' });
    const sg = seg(SCEN.map(s => [s.id, s.short]), sc, v => { sc = v; run(); }, 'scenario');
    const chartBox = h('div'), note = h('p', { class: 'fig-note' });
    host.append(controls(sg), controls(slN, tpotLab, tpotNote, slider('price per GPU-hour (assumed)', 0.5, 10, 0.1, price, v => { price = v; run(); }, v => `USD ${fmt(v, 1)}`)),
      h('div', { class: 'kpis' }, kN, kTPS, kCost, kRatio), chartBox, note, switchNote());
    function fromSetting() {
      const r = rig();
      tpot = r.tpot != null ? +r.tpot : null;
      tpotIn.disabled = tpot == null;
      tpotIn.value = tpot == null ? '' : String(tpot);
      tpotNote.textContent = tpot == null ? `TPOT is not measured on ${label()}: no selector ran, so there is no step time to divide by.` : `TPOT from ${label()}; edit it to see the effect.`;
    }
    const tps = N => (tpot ? N / (tpot / 1e3) : NaN);
    const cost = N => (tpot ? price / (tps(N) * 3600) * 1e6 : NaN);
    const usd = v => (Number.isFinite(v) ? `USD ${fmt(v, v < 0.1 ? 3 : 2)}` : NM());
    function run() {
      const rows = SCEN.map(s => Object.assign({}, s, { N: s.id === 'free' ? freeN : s.N }));
      const cur = rows.find(s => s.id === sc), hs = rows.find(s => s.id === 'hs');
      kN.set(fmt(cur.N, 0), `${esc(cur.name)} · ${esc(cur.src)}`);
      kTPS.set(Number.isFinite(tps(cur.N)) ? fmt(tps(cur.N), 0) : NM(), tpot ? `${fmt(cur.N, 0)} ÷ ${fmt(tpot / 1e3, 3)} s` : `tokens per second per GPU needs TPOT, not measured on ${label()}`);
      kCost.set(usd(cost(cur.N)), tpot ? `USD ${fmt(price, 2)} per GPU-hour (assumed) ÷ (${fmt(tps(cur.N), 0)} × 3600) × 10⁶` : `needs TPOT, not measured on ${label()}`);
      kRatio.set(`${fmt(cur.N / hs.N, 2)}×`, `throughput vs HiSparse; cost ${fmt(hs.N / cur.N, 2)}× HiSparse’s (the price cancels out of this ratio)`);
      chartBox.replaceChildren();
      if (tpot) {
        const vals = rows.map(s => cost(s.N)), top = Math.max(...vals) * (chartBox.getBoundingClientRect().width < 520 ? 1.7 : 1.3);
        const P = Plot(chartBox, { ycats: rows.map(s => s.short), x: [0, top], h: tall(chartBox, 230), grid: 'x', xfmt: v => fmt(v, 2), m: { r: 24 },
          xlabel: 'USD per million output tokens (at the assumed price)', label: 'Cost per million output tokens for each scenario' });
        bars(P, vals, { horizontal: true, colors: (i) => rows[i].color, width: 16, labels: (v, i) => `${fmt(v, 3)} · N ${fmt(rows[i].N, 0)}`,
          tip: (v, i) => `<b>${esc(rows[i].name)}</b><br>N = ${fmt(rows[i].N, 0)} · ${fmt(tps(rows[i].N), 0)} tokens/s per GPU<br>USD ${fmt(v, 3)} per million tokens · ${fmt(hs.N / rows[i].N, 2)}× HiSparse` });
        rule(P, { x: cost(hs.N), dash: '3 4' });
      } else chartBox.append(h('p', { class: 'fig-note', text: `No bar chart: TPOT is not measured on ${label()}. The ratio of N to HiSparse’s N still holds, since the price and TPOT cancel out of it.` }));
      note.textContent = `N values: HiSparse 109, solo 124 and request scope 138 are VI.16’s results on the Pin (ρ and w assumed there); the napkin’s N is 120, the lever-2 example of XII.5 (n_D = 1, f_D = 0.3, n_load = 0.01). The model counts link bytes and GPU memory only; compute, prefill and kernel batching are outside it.`;
    }
    onSetting(() => { fromSetting(); run(); });
    fromSetting();
    run();
  };

  // ================================================================== XII.7  rngSettings — the two settings side by side
  FIG.rngSettings = (host) => {
    const wrap = h('div', { class: 'rng-set-wrap' }), btns = h('div', { class: 'controls' }), note = h('p', { class: 'fig-note' });
    host.append(btns, wrap, note);
    /* rows computed from the frozen quantities: [name, unit, formula, fmt, inputs, f(values)]; "not measured" when an input is null */
    const DERIVED = [
      ['bytes per token, all KV layers', 'bytes', 'NL × e', 'bytes', ['NL', 'e'], v => v.NL * v.e],
      ['bytes per block of b tokens, one layer', 'bytes', 'b × e', 'bytes', ['b', 'e'], v => v.b * v.e],
      ['bytes of one request’s KV cache', 'bytes', 'L × NL × e', 'bytes', ['L', 'NL', 'e'], v => v.L * v.NL * v.e],
      ['misses per layer per step at 4096 slots', '', 'm4 × k', 'int', ['m4', 'k'], v => Math.round(v.m4 * v.k)],
    ];
    const cell = (id, cur, v) => h('td', { class: (id === cur ? 'is-cur' : '') + (v == null ? ' is-null' : ''), text: v == null ? 'not measured' : v });
    const differs = vals => new Set(vals.map(v => (v == null ? 'null' : String(v)))).size > 1;
    function draw() {
      const S = settings(), ids = Object.keys(S), cur = settingId();
      const known = Object.keys((window.KV && KV.settingKeys) || KEYS);
      const keys = known.filter(k => ids.some(id => k in (S[id].values || {})));
      ids.forEach(id => Object.keys(S[id].values || {}).forEach(k => { if (!keys.includes(k)) keys.push(k); }));
      const t = h('table', { class: 'rng-set' });
      t.append(h('thead', {}, h('tr', {}, h('th', { class: 'l', text: 'quantity' }), ...ids.map(id => h('th', { class: 'rng-card' + (id === cur ? ' is-cur' : '') },
        h('span', { class: 'rng-card-label', text: S[id].label || id }), h('span', { class: 'rng-card-name', text: S[id].name || '' }), id === cur ? h('span', { class: 'rng-card-cur', text: 'current' }) : null)))));
      const tb = h('tbody');
      keys.forEach(k => {
        const meta = keyMeta(k);
        const vals = ids.map(id => (S[id].values || {})[k]);
        tb.append(h('tr', { class: differs(vals) ? 'is-diff' : null },
          h('td', { class: 'l' }, h('span', { class: 'rng-key', text: meta[0] }), meta[1] ? h('span', { class: 'rng-unit', text: ` (${meta[1]})` }) : null, h('code', { class: 'rng-code', text: k })),
          ...ids.map((id, i) => cell(id, cur, fmtKey(k, vals[i])))));
      });
      // the derived rows, under a sub-heading, with the formula where the frozen rows show the key
      tb.append(h('tr', { class: 'rng-set-derived' }, h('td', { class: 'l', colspan: String(ids.length + 1) }, h('span', { class: 'rng-head', text: 'derived from the rows above' }))));
      DERIVED.forEach(([name, unit, formula, f, inputs, fn]) => {
        const vals = ids.map(id => { const v = S[id].values || {}; return inputs.every(k => v[k] != null) ? fn(v) : null; });
        tb.append(h('tr', { class: differs(vals) ? 'is-diff' : null },
          h('td', { class: 'l' }, h('span', { class: 'rng-key', text: name }), unit ? h('span', { class: 'rng-unit', text: ` (${unit})` }) : null, h('code', { class: 'rng-code', text: formula })),
          ...ids.map((id, i) => cell(id, cur, fmtVal(f, vals[i])))));
      });
      t.append(tb);
      wrap.replaceChildren(t);
      btns.replaceChildren(...ids.filter(id => id !== cur).map(id => btn(`Switch to ${S[id].label || id}`, () => { if (window.KV && typeof KV.setSetting === 'function') KV.setSetting(id); }, { cls: 'sm' })));
      btns.querySelectorAll('button').forEach(bq => { bq.disabled = !(window.KV && typeof KV.setSetting === 'function'); });
      note.textContent = hasSwitch()
        ? `The current setting is ${S[cur].label || cur}. Rows with an outline differ between the settings; "not measured" marks a quantity the Bench never ran (no sparse-attention selector), and a derived row that needs one. The last four rows are computed live from the rows above them. The button calls the site’s switch, so the hover reminders and [[@key]] numbers change with it.`
        : 'The reference-setting switch is not loaded on this page: the two settings shown are the spec’s static values and the button is disabled.';
    }
    onSetting(draw);
    draw();
  };
})();
