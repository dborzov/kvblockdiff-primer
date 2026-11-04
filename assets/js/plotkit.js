/* =====================================================================
   plotkit.js — the figure toolkit.
   DOM + SVG helpers, scales, plot frames, chart marks (lines, areas, bars,
   rules, callouts), tooltips, dragging, controls, step-through, KaTeX math,
   series colours, seeded randomness and small numerics.

   Classic script (no modules). Every public function is a global and also
   lives on window.PK. Load after KaTeX, before figs-loader.js and the
   per-Part figure files. API reference: docs/figures.md.

   Colours: SVG presentation attributes cannot take var(--x), so every
   colour goes through style="…" or a CSS class (see figures.css).
   ===================================================================== */
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  let seq = 0;
  const uid = (prefix = 'pk') => `${prefix}-${++seq}`;

  /* ------------------------------------------------------------------
     DOM
     ------------------------------------------------------------------ */
  /** SVG element: el('circle', {cx, cy, r, class, style, text}, parent) */
  function el(tag, attrs = {}, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else e.setAttribute(k, v);
    }
    if (parent) parent.appendChild(e);
    return e;
  }

  /** HTML element: h('div', {class, html, text, onclick, …}, ...children) */
  function h(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      e.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return e;
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ------------------------------------------------------------------
     Number formatting
     ------------------------------------------------------------------ */
  /** fmt(3.14159) → "3.14"; integers print bare; negatives use a true minus. */
  function fmt(v, d = 2) {
    if (v == null || Number.isNaN(v)) return '—';
    if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
    const s = Number.isInteger(v) && d === 2 ? String(v) : v.toFixed(d);
    return s.replace(/^-(0(\.0+)?)$/, '$1').replace(/^-/, '−');
  }
  /** Signed: fmtS(0.5) → "+0.50" */
  const fmtS = (v, d = 2) => (v >= 0 ? '+' : '−') + fmt(Math.abs(v), d);
  /** Compact SI: 1234 → "1.2k", 3e6 → "3M" */
  function fmtSI(v, d = 1) {
    if (!Number.isFinite(v)) return fmt(v);
    const a = Math.abs(v);
    const u = [[1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k']].find(([k]) => a >= k);
    if (!u) return fmt(v, Number.isInteger(v) ? 0 : d);
    return fmt(v / u[0], d).replace(/\.0+$/, '') + u[1];
  }
  /** Binary bytes: 1536 → "1.5 KiB" */
  function fmtBytes(n, d = 1) {
    const U = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    let k = 0;
    while (Math.abs(n) >= 1024 && k < U.length - 1) { n /= 1024; k++; }
    return fmt(n, k ? d : 0).replace(/\.0+$/, '') + ' ' + U[k];
  }
  /** Percent of a fraction: 0.123 → "12.3%" */
  const fmtPct = (v, d = 1) => fmt(v * 100, d) + '%';

  /* ------------------------------------------------------------------
     Scales & ticks
     ------------------------------------------------------------------ */
  function linear(d0, d1, r0, r1) {
    const f = v => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
    f.invert = p => d0 + (p - r0) / (r1 - r0) * (d1 - d0);
    f.domain = [d0, d1]; f.range = [r0, r1];
    return f;
  }
  function logScale(d0, d1, r0, r1, base = 10) {
    const lg = v => Math.log(Math.max(v, 1e-300)) / Math.log(base);
    const l0 = lg(d0), l1 = lg(d1);
    const f = v => r0 + (lg(v) - l0) / (l1 - l0) * (r1 - r0);
    f.invert = p => Math.pow(base, l0 + (p - r0) / (r1 - r0) * (l1 - l0));
    f.domain = [d0, d1]; f.range = [r0, r1]; f.base = base;
    return f;
  }
  function niceStep(span, count) {
    const raw = span / Math.max(1, count);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const e = raw / p;
    return (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * p;
  }
  /** "Nice" linear ticks covering [lo, hi]. */
  function ticks(lo, hi, count = 6) {
    if (!(hi > lo)) return [lo];
    const st = niceStep(hi - lo, count), out = [];
    for (let v = Math.ceil(lo / st - 1e-9) * st; v <= hi + 1e-9 * st; v += st) out.push(+v.toFixed(10));
    return out;
  }
  /** Powers of `base` inside [a, b], thinned to at most ~9. */
  function logTicks(a, b, base = 10) {
    const lo = Math.min(a, b), hi = Math.max(a, b), out = [];
    const lg = v => Math.log(v) / Math.log(base);
    for (let e = Math.floor(lg(lo)); e <= Math.ceil(lg(hi)); e++) {
      const v = Math.pow(base, e);
      if (v >= lo * 0.999 && v <= hi * 1.001) out.push(+v.toPrecision(12));
    }
    const k = Math.ceil(out.length / 9);
    return k > 1 ? out.filter((_, i) => i % k === 0) : out;
  }
  function autoFmt(tk, isLog) {
    if (isLog) return v => (Math.abs(v) >= 1e4 ? fmtSI(v) : String(+v.toPrecision(6)));
    const step = tk.length > 1 ? Math.abs(tk[1] - tk[0]) : 1;
    const d = Math.max(0, Math.min(6, -Math.floor(Math.log10(step) + 1e-9)));
    return v => (Math.abs(v) >= 1e4 ? fmtSI(v) : fmt(v, d));
  }

  /* ------------------------------------------------------------------
     Plot frame
     ------------------------------------------------------------------ */
  /* Text inside a viewBox shrinks with the figure. When the host is narrow
     (phones) we enlarge text and margins by `fs` so labels stay ≥ ~10.5px. */
  function fontScale(host, W) {
    const w = host && host.getBoundingClientRect ? host.getBoundingClientRect().width : 0;
    return w > 0 ? clamp(0.875 * W / w, 1, 1.9) : 1;
  }

  /** Bare SVG canvas for diagrams: Diagram(host, {w, h, label, grow}) → {svg, defs, W, H, fs}.
      Text grows by fs on phones; lay out with D.fs, or pass grow (0–1) to add height. */
  function Diagram(host, o = {}) {
    const W = o.w || 640;
    const fs = o.fs || fontScale(host, W);
    const H = Math.round((o.h || 300) * (1 + (fs - 1) * (o.grow || 0)));
    const svg = el('svg', {
      class: 'plot diagram' + (o.cls ? ' ' + o.cls : ''), viewBox: `0 0 ${W} ${H}`,
      role: 'img', 'aria-label': o.label || 'diagram', style: `--fs:${+fs.toFixed(3)}`,
    });
    const D = { svg, defs: el('defs', {}, svg), W, H, fs };
    if (host) host.appendChild(svg);
    return D;
  }

  /**
   * Plot(host, opts) → P with scales P.x / P.y and layers P.g.{bg,grid,axes,data,top}.
   * opts: w, h, m{l,r,t,b}, x:[x0,x1], y:[y0,y1], xlog/ylog (true or base),
   * xcats/ycats (category labels), xticks/yticks, xn/yn, xfmt/yfmt, xlabel/ylabel,
   * grid (true|false|'x'|'y'), equal, noclip, label (aria), cls.
   */
  function Plot(host, o = {}) {
    const W = o.w || 640;
    const fs = o.fs || fontScale(host, W);
    const H = Math.round((o.h || 360) * (1 + (fs - 1) * 0.35));
    const cats = { x: o.xcats, y: o.ycats };
    const md = { l: o.ylabel ? 58 : 44, r: 18, t: 16, b: o.xlabel ? 48 : 30 };
    if (cats.y) md.l = Math.max(md.l, 14 + 6.6 * Math.max(...cats.y.map(c => String(c).length)));
    const m = {};
    for (const k in md) m[k] = Math.round((o.m && o.m[k] != null ? o.m[k] : md[k]) * fs);
    const pw = W - m.l - m.r, ph = H - m.t - m.b;

    let [x0, x1] = cats.x ? [-0.5, cats.x.length - 0.5] : (o.x || [0, 1]);
    let [y0, y1] = cats.y ? [cats.y.length - 0.5, -0.5] : (o.y || [0, 1]);
    if (o.equal) {
      const sx = (x1 - x0) / pw, sy = (y1 - y0) / ph;
      if (sx > sy) { const c = (y0 + y1) / 2, half = sx * ph / 2; y0 = c - half; y1 = c + half; }
      else { const c = (x0 + x1) / 2, half = sy * pw / 2; x0 = c - half; x1 = c + half; }
    }

    const svg = el('svg', {
      class: 'plot' + (o.cls ? ' ' + o.cls : ''), viewBox: `0 0 ${W} ${H}`, role: 'img',
      'aria-label': o.label || [o.ylabel, o.xlabel].filter(Boolean).join(' against ') || 'chart',
      style: `--fs:${+fs.toFixed(3)}`,
    });
    const defs = el('defs', {}, svg);
    const clipId = uid('clip'), pad = 5 * fs;
    el('rect', { x: m.l - pad, y: m.t - pad, width: pw + 2 * pad, height: ph + 2 * pad }, el('clipPath', { id: clipId }, defs));
    const clip = `url(#${clipId})`;
    const g = {
      bg: el('g', { class: 'layer-bg', 'clip-path': clip }, svg),
      grid: el('g', { class: 'grid' }, svg),
      axes: el('g', { class: 'axis' }, svg),
      data: el('g', { class: 'layer-data', 'clip-path': o.noclip ? null : clip }, svg),
      top: el('g', { class: 'layer-top' }, svg),
    };
    const P = { svg, defs, g, W, H, m, pw, ph, fs, clipId, series: [], opts: o };

    function setScales() {
      const xb = o.xlog === true ? 10 : o.xlog, yb = o.ylog === true ? 10 : o.ylog;
      P.x = xb ? logScale(x0, x1, m.l, W - m.r, xb) : linear(x0, x1, m.l, W - m.r);
      P.y = yb ? logScale(y0, y1, H - m.b, m.t, yb) : linear(y0, y1, H - m.b, m.t);
      Object.assign(P, { x0, x1, y0, y1 });
    }

    P.drawAxes = function () {
      g.grid.replaceChildren(); g.axes.replaceChildren();
      const xb = o.xlog === true ? 10 : o.xlog, yb = o.ylog === true ? 10 : o.ylog;
      const [xl, xh] = [Math.min(x0, x1), Math.max(x0, x1)], [yl, yh] = [Math.min(y0, y1), Math.max(y0, y1)];
      const xt = o.xticks || (cats.x ? cats.x.map((_, i) => i) : xb ? logTicks(xl, xh, xb) : ticks(xl, xh, o.xn || Math.max(3, Math.round(pw / (85 * fs)))));
      const yt = o.yticks || (cats.y ? cats.y.map((_, i) => i) : yb ? logTicks(yl, yh, yb) : ticks(yl, yh, o.yn || Math.max(3, Math.round(ph / (55 * fs)))));
      const xf = o.xfmt || (cats.x ? i => cats.x[i] : autoFmt(xt, xb));
      const yf = o.yfmt || (cats.y ? i => cats.y[i] : autoFmt(yt, yb));
      const grid = o.grid === undefined ? true : o.grid;
      const inX = X => X >= m.l - 0.5 && X <= W - m.r + 0.5, inY = Y => Y >= m.t - 0.5 && Y <= H - m.b + 0.5;

      if ((grid === true || grid === 'x') && !cats.x) xt.forEach(v => inX(P.x(v)) && el('line', { x1: P.x(v), x2: P.x(v), y1: m.t, y2: H - m.b }, g.grid));
      if ((grid === true || grid === 'y') && !cats.y) yt.forEach(v => inY(P.y(v)) && el('line', { x1: m.l, x2: W - m.r, y1: P.y(v), y2: P.y(v) }, g.grid));
      el('line', { class: 'axis-line', x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, g.axes);
      el('line', { class: 'axis-line', x1: m.l, x2: m.l, y1: m.t, y2: H - m.b }, g.axes);

      xt.forEach(v => {
        const X = P.x(v);
        if (!inX(X)) return;
        const tg = el('g', { class: 'tick' }, g.axes);
        if (!cats.x) el('line', { x1: X, x2: X, y1: H - m.b, y2: H - m.b + 5 * fs }, tg);
        el('text', { x: X, y: H - m.b + 18 * fs, 'text-anchor': 'middle', text: xf(v) }, tg);
      });
      yt.forEach(v => {
        const Y = P.y(v);
        if (!inY(Y)) return;
        const tg = el('g', { class: 'tick' }, g.axes);
        if (!cats.y) el('line', { x1: m.l - 5 * fs, x2: m.l, y1: Y, y2: Y }, tg);
        el('text', { x: m.l - 8 * fs, y: Y + 4 * fs, 'text-anchor': 'end', text: yf(v) }, tg);
      });
      if (o.xlabel) el('text', { x: m.l + pw / 2, y: H - 9 * fs, 'text-anchor': 'middle', class: 'axis-label', text: o.xlabel }, g.axes);
      if (o.ylabel) {
        const cx = 15 * fs, cy = m.t + ph / 2;
        el('text', { x: cx, y: cy, 'text-anchor': 'middle', class: 'axis-label', transform: `rotate(-90 ${cx} ${cy})`, text: o.ylabel }, g.axes);
      }
    };

    /** Re-domain the plot and redraw its axes: P.domain({x:[a,b], y:[c,d]}) */
    P.domain = function (d = {}) {
      if (d.x) [x0, x1] = d.x;
      if (d.y) [y0, y1] = d.y;
      setScales(); P.drawAxes();
      return P;
    };
    /** Empty layers before a redraw: P.clear() empties data + top. */
    P.clear = function (...names) {
      (names.length ? names : ['data', 'top']).forEach(n => g[n].replaceChildren());
      return P;
    };
    /** Pointer event → data coordinates [x, y]. */
    P.toData = function (evt) {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX; pt.y = evt.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      return [P.x.invert(q.x), P.y.invert(q.y)];
    };

    setScales(); P.drawAxes();
    if (host) host.appendChild(svg);
    return P;
  }

  /* ------------------------------------------------------------------
     Marks
     ------------------------------------------------------------------ */
  const finite = p => p && Number.isFinite(p[0]) && Number.isFinite(p[1]);

  /** Path data for data points; non-finite points break the line. curve: 'linear' | 'step' */
  function linePath(P, pts, curve = 'linear') {
    let d = '', pen = false;
    for (const p of pts) {
      if (!finite(p)) { pen = false; continue; }
      const X = P.x(p[0]).toFixed(2), Y = P.y(p[1]).toFixed(2);
      if (!pen) d += `M${X} ${Y}`;
      else d += curve === 'step' ? `H${X}V${Y}` : `L${X} ${Y}`;
      pen = true;
    }
    return d;
  }

  /** Dot with a surface-coloured ring. */
  function dot(parent, px, py, r, color, extra = {}) {
    return el('circle', Object.assign({ cx: px, cy: py, r, class: 'dot', style: `fill:${color}` }, extra), parent);
  }

  /** Straight arrow with a filled head. */
  function arrow(parent, x1, y1, x2, y2, color = 'var(--ink-2)', w = 2) {
    const g = el('g', { class: 'arrow' }, parent);
    const a = Math.atan2(y2 - y1, x2 - x1), L = 5 + 3 * w;
    el('line', { x1, y1, x2: x2 - (L - 1) * Math.cos(a), y2: y2 - (L - 1) * Math.sin(a), style: `stroke:${color};stroke-width:${w}` }, g);
    el('path', { d: `M${x2} ${y2}L${x2 - L * Math.cos(a - 0.42)} ${y2 - L * Math.sin(a - 0.42)}L${x2 - L * Math.cos(a + 0.42)} ${y2 - L * Math.sin(a + 0.42)}Z`, style: `fill:${color}` }, g);
    return g;
  }

  /** Covariance ellipse (eigenvalues l1, l2, angle th, k σ) as path data in P's pixels. */
  function ellipsePath(P, mx, my, l1, l2, th, k = 1) {
    let d = '';
    for (let i = 0; i <= 72; i++) {
      const t = i / 72 * 2 * Math.PI;
      const a = k * Math.sqrt(l1) * Math.cos(t), b = k * Math.sqrt(l2) * Math.sin(t);
      const X = mx + a * Math.cos(th) - b * Math.sin(th), Y = my + a * Math.sin(th) + b * Math.cos(th);
      d += (i ? 'L' : 'M') + P.x(X).toFixed(2) + ' ' + P.y(Y).toFixed(2);
    }
    return d + 'Z';
  }

  /** Closed polygon (pixel points) with rounded corners of radius r. */
  function roundedPath(pts, r) {
    const n = pts.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      const v1 = [p0[0] - p1[0], p0[1] - p1[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
      const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
      const r1 = Math.min(r, l1 / 2), r2 = Math.min(r, l2 / 2);
      const a = [p1[0] + v1[0] / l1 * r1, p1[1] + v1[1] / l1 * r1];
      const b = [p1[0] + v2[0] / l2 * r2, p1[1] + v2[1] / l2 * r2];
      d += (i ? 'L' : 'M') + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + 'Q' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + ' ' + b[0].toFixed(2) + ' ' + b[1].toFixed(2);
    }
    return d + 'Z';
  }

  /** Multi-line SVG text (lines split on "\n"). */
  function svgText(parent, x, y, text, attrs = {}) {
    const t = el('text', Object.assign({ x, y }, attrs), parent);
    String(text).split('\n').forEach((s, i) => el('tspan', { x, dy: i ? '1.25em' : null, text: s }, t));
    return t;
  }

  /**
   * line(P, pts, {color, width, dash, curve, markers, name, label, tip, cls, parent})
   * Draws [[x,y],…]. `name` registers the series for crosshair(); `label`
   * writes a direct label at the last point; `markers` true or a radius.
   */
  function line(P, pts, o = {}) {
    const color = o.color || series(o.series || 0);
    const g = el('g', { class: 'pk-line' + (o.cls ? ' ' + o.cls : '') }, o.parent || P.g.data);
    const style = `stroke:${color};stroke-width:${o.width || 2.25}` + (o.dash ? `;stroke-dasharray:${o.dash === true ? '6 5' : o.dash}` : '');
    g.path = el('path', { class: 'line', d: linePath(P, pts, o.curve), style }, g);
    if (o.markers) {
      const r = (o.markers === true ? 4 : o.markers) * P.fs;
      g.markers = pts.filter(finite).map((p, i) => {
        const c = dot(g, P.x(p[0]), P.y(p[1]), r, color, { class: 'dot marker' });
        if (o.tip) hover(c, () => o.tip(p, i));
        return c;
      });
    }
    const last = [...pts].reverse().find(finite);
    if (o.label && last) {
      el('text', { class: 'lbl line-end', x: P.x(last[0]) + 7 * P.fs, y: P.y(last[1]) + 4 * P.fs, text: o.label }, o.parent ? g : P.g.top);
    }
    if (o.name) {
      const s = { name: o.name, pts, color };
      const k = P.series.findIndex(q => q.name === o.name);
      if (k >= 0) P.series[k] = s; else P.series.push(s);
    }
    return g;
  }

  /**
   * area(P, pts, {color, opacity, base, line, parent})
   * pts as [[x, y]] (filled down to `base`, default the bottom of the y-domain
   * or 0 when 0 is inside it) or [[x, lo, hi]] (a band).
   */
  function area(P, pts, o = {}) {
    const color = o.color || series(o.series || 0);
    const band = pts.length && pts[0].length >= 3;
    const yb = o.base != null ? o.base : (Math.min(P.y0, P.y1) <= 0 && Math.max(P.y0, P.y1) >= 0 && !P.opts.ylog ? 0 : Math.min(P.y0, P.y1));
    const top = pts.map(p => [p[0], band ? p[2] : p[1]]);
    const bot = pts.map(p => [p[0], band ? p[1] : yb]).reverse();
    const d = linePath(P, top) + linePath(P, bot).replace(/^M/, 'L') + 'Z';
    const g = el('g', { class: 'pk-area' + (o.cls ? ' ' + o.cls : '') }, o.parent || P.g.data);
    g.fill = el('path', { class: 'area', d, style: `fill:${color};fill-opacity:${o.opacity ?? 0.14}` }, g);
    if (o.line) g.edge = el('path', { class: 'line', d: linePath(P, top), style: `stroke:${color};stroke-width:${o.width || 2}` }, g);
    return g;
  }

  /* Bar outline with a rounded data end and a square base. */
  function barPath(horiz, c0, bw, p0, p1, r) {
    const s = p1 < p0 ? 1 : -1, c1 = c0 + bw;
    r = Math.min(r, bw / 2, Math.abs(p1 - p0));
    return horiz
      ? `M${p0} ${c0}H${p1 + s * r}Q${p1} ${c0} ${p1} ${c0 + r}V${c1 - r}Q${p1} ${c1} ${p1 + s * r} ${c1}H${p0}Z`
      : `M${c0} ${p0}V${p1 + s * r}Q${c0} ${p1} ${c0 + r} ${p1}H${c1 - r}Q${c1} ${p1} ${c1} ${p1 + s * r}V${p0}Z`;
  }

  /**
   * bars(P, data, opts) — grouped bars on a categorical axis (use xcats/ycats).
   * data: [v, …] (one series) or [[v1, v2, …], …] or [{values:[…]}, …].
   * opts: colors (array | fn(i,j,v)), names (series names for the default tip),
   * horizontal, base, width (max px), fill (share of the slot), gap,
   * labels (true | fn(v,i,j) → text), tip (fn(v,i,j) → html | false), parent.
   */
  function bars(P, data, o = {}) {
    const groups = data.map(d => (typeof d === 'number' ? [d] : Array.isArray(d) ? d : d.values));
    const k = Math.max(1, ...groups.map(g => g.length));
    const horiz = !!o.horizontal, cat = horiz ? P.y : P.x, val = horiz ? P.x : P.y;
    const slot = Math.abs(cat(1) - cat(0));
    const gap = (o.gap ?? 2) * P.fs;
    const bw = Math.max(1, Math.min((o.width || 28) * P.fs, (slot * (o.fill ?? 0.78) - gap * (k - 1)) / k));
    const total = k * bw + (k - 1) * gap, base = o.base ?? 0;
    const colorOf = (i, j, v) => (typeof o.colors === 'function' ? o.colors(i, j, v) : o.colors ? o.colors[j % o.colors.length] : o.color || series(j));
    const g = el('g', { class: 'pk-bars' }, o.parent || P.g.data);
    const hits = el('g', { class: 'pk-bar-hits' }, P.g.top);
    const dec = groups.flat().some(v => Number.isFinite(v) && !Number.isInteger(v)) ? 1 : 0;
    const fmtL = typeof o.labels === 'function' ? o.labels : v => fmt(v, dec);
    const tip = o.tip === false ? null : o.tip || ((v, i, j) => `${o.names ? `<b>${o.names[j]}</b> · ` : ''}${fmt(v)}`);
    g.bars = [];
    groups.forEach((vals, i) => vals.forEach((v, j) => {
      if (!Number.isFinite(v)) return;
      const c0 = cat(i) - total / 2 + j * (bw + gap), p0 = val(base), p1 = val(v);
      const b = el('path', { class: 'bar', d: barPath(horiz, c0, bw, p0, p1, 4 * P.fs), style: `fill:${colorOf(i, j, v)}`, 'data-i': i, 'data-j': j }, g);
      g.bars.push(b);
      if (o.labels) {
        const t = horiz
          ? { x: p1 + (p1 >= p0 ? 6 : -6) * P.fs, y: c0 + bw / 2 + 4 * P.fs, 'text-anchor': p1 >= p0 ? 'start' : 'end' }
          : { x: c0 + bw / 2, y: p1 + (p1 < p0 ? -6 : 15) * P.fs, 'text-anchor': 'middle' };
        el('text', Object.assign({ class: 'val', text: fmtL(v, i, j) }, t), P.g.top);
      }
      if (tip) {
        const pad = gap / 2, r = horiz
          ? { x: P.m.l, y: c0 - pad, width: P.pw, height: bw + gap }
          : { x: c0 - pad, y: P.m.t, width: bw + gap, height: P.ph };
        const hit = el('rect', Object.assign({ class: 'hit' }, r), hits);
        hover(hit, () => tip(v, i, j));
        hit.addEventListener('pointerenter', () => b.classList.add('is-hot'));
        hit.addEventListener('pointerleave', () => b.classList.remove('is-hot'));
      }
    }));
    return g;
  }

  /** rule(P, {x | y, label, color, dash, parent}) — a labelled reference line. */
  function rule(P, o = {}) {
    const g = el('g', { class: 'pk-rule' + (o.cls ? ' ' + o.cls : '') }, o.parent || P.g.top);
    const style = `stroke:${o.color || 'var(--ink-2)'}` + (o.dash === false ? '' : `;stroke-dasharray:${o.dash || '5 4'}`);
    const f = P.fs;
    if (o.x != null) {
      const X = P.x(o.x), right = X > P.m.l + P.pw * 0.75;
      el('line', { class: 'rule-line', x1: X, x2: X, y1: P.m.t, y2: P.H - P.m.b, style }, g);
      if (o.label) svgText(g, X + (right ? -6 : 6) * f, P.m.t + 13 * f, o.label, { class: 'lbl rule-lbl', 'text-anchor': right ? 'end' : 'start' });
    } else {
      const Y = P.y(o.y), low = Y > P.m.t + 22 * f;
      el('line', { class: 'rule-line', x1: P.m.l, x2: P.W - P.m.r, y1: Y, y2: Y, style }, g);
      if (o.label) svgText(g, P.W - P.m.r - 6 * f, low ? Y - 6 * f : Y + 15 * f, o.label, { class: 'lbl rule-lbl', 'text-anchor': 'end' });
    }
    return g;
  }

  /**
   * annotate(P, x, y, text, {dx, dy, anchor, color, dot, parent})
   * Callout text placed (dx, dy) px from the data point, joined by a curved
   * leader. Text may contain "\n" line breaks.
   */
  function annotate(P, x, y, text, o = {}) {
    const f = P.fs, ax = P.x(x), ay = P.y(y);
    const dx = (o.dx ?? 34) * f, dy = (o.dy ?? -30) * f;
    const tx = ax + dx, ty = ay + dy;
    const anchor = o.anchor || (dx >= 0 ? 'start' : 'end');
    const g = el('g', { class: 'pk-annot' }, o.parent || P.g.top);
    const color = o.color || 'var(--ink-2)';
    const ex = tx + (anchor === 'start' ? -4 : anchor === 'end' ? 4 : 0) * f;
    const ey = anchor === 'middle' ? ty + (dy < 0 ? 5 : -14) * f : ty - 4 * f;
    el('path', { class: 'leader', d: `M${ax} ${ay}Q${ax} ${ey} ${ex} ${ey}`, style: `stroke:${color}` }, g);
    if (o.dot !== false) el('circle', { class: 'annot-dot', cx: ax, cy: ay, r: 2.6 * f, style: `fill:${color}` }, g);
    svgText(g, tx, ty, text, { class: 'annot', 'text-anchor': anchor });
    return g;
  }

  /**
   * crosshair(P, {series, xfmt, yfmt, xname}) — hover/scrub guide for line plots.
   * Uses the series registered by line(P, pts, {name}) unless `series` given
   * ([{name, pts, color}]). Call after the lines; returns the hit rectangle.
   */
  function crosshair(P, o = {}) {
    // own layer between data and top: survives P.clear(), stays under handles
    const cross = el('g', { class: 'layer-cross' });
    P.svg.insertBefore(cross, P.g.top);
    P.g.cross = cross;
    const hit = el('rect', { class: 'hit cross-hit', x: P.m.l, y: P.m.t, width: P.pw, height: P.ph }, cross);
    const layer = el('g', { class: 'pk-cross', style: 'display:none' }, cross);
    const vline = el('line', { class: 'cross-line', y1: P.m.t, y2: P.H - P.m.b }, layer);
    const dots = el('g', {}, layer);
    const fx = o.xfmt || (v => fmt(v)), fy = o.yfmt || (v => fmt(v));
    const move = e => {
      const list = (o.series || P.series).filter(s => s.pts.some(finite));
      if (!list.length) return;
      const [dx] = P.toData(e);
      let X = null;
      const rows = [];
      dots.replaceChildren();
      list.forEach(s => {
        const p = nearest(s.pts, dx);
        if (!p) return;
        if (X == null) X = p[0];
        dot(dots, P.x(p[0]), P.y(p[1]), 4.5 * P.fs, s.color, { class: 'dot marker' });
        rows.push(`<span class="tip-row"><i style="--kc:${s.color}"></i><span>${s.name}</span><b>${fy(p[1], s)}</b></span>`);
      });
      vline.setAttribute('x1', P.x(X)); vline.setAttribute('x2', P.x(X));
      layer.style.display = '';
      showTip(e, `<div class="tip-h">${o.xname ? o.xname + ' ' : ''}${fx(X)}</div>` + rows.join(''));
    };
    const leave = () => { layer.style.display = 'none'; hideTip(); };
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') leave(); });
    hoverNodes.add(hit);
    return hit;
  }
  function nearest(pts, x) {
    let best = null, bd = Infinity;
    for (const p of pts) {
      if (!finite(p)) continue;
      const d = Math.abs(p[0] - x);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  /** Math label inside an SVG (KaTeX in a foreignObject). (x, y) is the anchor point, vertically centred. */
  function texLabel(parent, x, y, src, o = {}) {
    const w = o.w || 180, hh = o.h || 30, anchor = o.anchor || 'middle';
    const fx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    const fo = el('foreignObject', { class: 'tex-fo', x: fx, y: y - hh / 2, width: w, height: hh }, parent);
    const justify = { start: 'flex-start', middle: 'center', end: 'flex-end' }[anchor];
    fo.append(h('div', { class: 'tex-fo-in', style: `justify-content:${justify}` }, h('span', { html: o.text ? texify(src) : tex(src) })));
    return fo;
  }

  /* ------------------------------------------------------------------
     Colours
     ------------------------------------------------------------------ */
  /* Categorical order chosen so neighbours stay distinct (incl. colour-blind
     simulation) in both themes. Past 8 series, fold into "other" instead. */
  const SERIES = ['lapis', 'vermilion', 'peacock', 'saffron', 'amethyst', 'emerald', 'dusk', 'sage'];
  function series(i) { return `var(--${SERIES[((i % SERIES.length) + SERIES.length) % SERIES.length]})`; }
  series.names = SERIES;

  /**
   * legend(items, {shape}) → HTML legend.
   * items: ['label', …] | [[label, color, shape], …] | [{label, color, shape}, …]
   * shape: 'line' (default) | 'dash' | 'dot' | 'box' | 'band'. Labels are HTML.
   */
  function legend(items, o = {}) {
    const d = h('div', { class: 'legend' + (o.cls ? ' ' + o.cls : ''), role: 'list' });
    items.forEach((it, i) => {
      if (typeof it === 'string') it = { label: it };
      else if (Array.isArray(it)) it = { label: it[0], color: it[1], shape: it[2] };
      const shape = it.shape || o.shape || 'line';
      d.append(h('span', { class: 'lg-item', role: 'listitem' },
        h('i', { class: 'lg-key lg-' + shape, style: `--kc:${it.color || series(i)}`, 'aria-hidden': 'true' }),
        h('span', { html: it.label })));
    });
    return d;
  }

  /* ------------------------------------------------------------------
     Tooltip
     ------------------------------------------------------------------ */
  let tipEl = null;
  const hoverNodes = new WeakSet();
  function tipNode() {
    if (!tipEl) { tipEl = h('div', { class: 'tip', role: 'tooltip', hidden: true }); document.body.append(tipEl); }
    return tipEl;
  }
  /** Show the shared tooltip near a pointer/focus event (or an element). */
  function showTip(evt, html) {
    if (html == null || html === '') { hideTip(); return; }
    const t = tipNode();
    t.innerHTML = html; t.hidden = false;
    const src = evt && (evt.nodeType ? evt : evt.target);
    if (src && src.nodeType === 1) {
      const c = getComputedStyle(src).getPropertyValue('--c').trim();
      if (c) t.style.setProperty('--c', c); else t.style.removeProperty('--c');
    }
    let px, py;
    if (evt && typeof evt.clientX === 'number') { px = evt.clientX; py = evt.clientY; }
    else if (src && src.getBoundingClientRect) { const r = src.getBoundingClientRect(); px = r.left + r.width / 2; py = r.bottom; }
    else return;
    const r = t.getBoundingClientRect(), above = evt && evt.pointerType === 'touch';
    let X = px + 14, Y = above ? py - r.height - 22 : py + 16;
    if (X + r.width > innerWidth - 8) X = px - r.width - 14;
    if (Y + r.height > innerHeight - 8) Y = py - r.height - 14;
    if (Y < 8) Y = py + 22;
    t.style.left = clamp(X, 8, Math.max(8, innerWidth - r.width - 8)) + 'px';
    t.style.top = Math.max(8, Y) + 'px';
  }
  function hideTip() { if (tipEl) tipEl.hidden = true; }
  /** hover(node, evt => html): tooltip on pointer hover, touch tap and keyboard focus. */
  function hover(node, fn) {
    hoverNodes.add(node);
    const show = e => showTip(e, fn(e));
    node.addEventListener('pointerenter', show);
    node.addEventListener('pointermove', show);
    node.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') show(e); });
    node.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hideTip(); });
    node.addEventListener('focus', show);
    node.addEventListener('blur', hideTip);
    return node;
  }
  addEventListener('scroll', hideTip, { passive: true });
  // a tap anywhere outside a hover target dismisses a touch tooltip
  document.addEventListener('pointerdown', e => {
    if (!tipEl || tipEl.hidden) return;
    for (let n = e.target; n; n = n.parentNode) if (hoverNodes.has(n)) return;
    hideTip();
  }, true);

  /* ------------------------------------------------------------------
     Dragging
     ------------------------------------------------------------------ */
  /**
   * draggable(node, P, onMove([x,y], evt), onEnd?, {get, step, label})
   * Pointer-drag in data coordinates. With opts.get (→ current [x, y]) the
   * node becomes focusable and arrow keys move it by opts.step ([sx, sy]; Shift ×5).
   */
  function draggable(node, P, onMove, onEnd, o = {}) {
    node.classList.add('draggable');
    node.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      node.setPointerCapture(e.pointerId); hideTip(); node.classList.add('dragging');
      const mv = ev => onMove(P.toData(ev), ev);
      const up = ev => {
        node.removeEventListener('pointermove', mv); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up);
        node.classList.remove('dragging');
        if (onEnd) onEnd(ev);
      };
      node.addEventListener('pointermove', mv); node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up);
    });
    if (o.get) {
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'slider');
      node.setAttribute('aria-label', o.label || 'draggable point: use arrow keys');
      const step = o.step || [Math.abs(P.x1 - P.x0) / 50, Math.abs(P.y1 - P.y0) / 50];
      node.addEventListener('keydown', e => {
        const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
        if (!dir) return;
        e.preventDefault();
        const k = e.shiftKey ? 5 : 1, [x, y] = o.get();
        onMove([x + dir[0] * step[0] * k, y + dir[1] * step[1] * k], e);
        if (onEnd) onEnd(e);
      });
    }
    return node;
  }

  /* ------------------------------------------------------------------
     Controls
     ------------------------------------------------------------------ */
  /** Segmented buttons: seg([[value, 'label'], …], value, onChange, ariaLabel) */
  function seg(options, value, onChange, label) {
    const wrap = h('span', { class: 'seg', role: 'group', 'aria-label': label || null });
    const opts = options.map(o => (Array.isArray(o) ? o : [o, String(o)]));
    const btns = opts.map(([v, text]) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(v === value), html: text });
      b.addEventListener('click', () => { wrap.set(v); onChange(v); });
      wrap.append(b);
      return b;
    });
    wrap.set = v => { value = v; btns.forEach((b, i) => b.setAttribute('aria-pressed', String(opts[i][0] === v))); };
    Object.defineProperty(wrap, 'value', { get: () => value });
    return wrap;
  }

  const decimalsOf = step => { const s = String(step); return s.includes('.') ? s.split('.')[1].length : 0; };
  /**
   * slider(label, min, max, step, value, onInput(v, out), format?)
   * → <label class="slider"> with .input, .out and .set(v). The value is shown
   * in `out` (format(v) or fmt); onInput may overwrite out.innerHTML.
   */
  function slider(label, min, max, step, value, onInput, format) {
    const id = uid('ctl');
    const inp = h('input', { type: 'range', id, min, max, step, value });
    const out = h('output', { class: 'num', for: id });
    const show = () => { out.textContent = format ? format(+inp.value) : fmt(+inp.value, decimalsOf(step)); };
    const lab = h('label', { class: 'slider', for: id }, h('span', { class: 'sl-name', html: label }), inp, out);
    inp.addEventListener('input', () => { show(); if (onInput) onInput(+inp.value, out); });
    show();
    lab.input = inp; lab.out = out;
    lab.set = v => { inp.value = v; show(); };
    return lab;
  }

  /** Round pill button: btn('Reset', onClick, {pressed, cls, title}) */
  function btn(label, onClick, o = {}) {
    const b = h('button', {
      type: 'button', class: 'btn' + (o.cls ? ' ' + o.cls : ''), html: label, title: o.title || null,
      'aria-pressed': o.pressed == null ? null : String(!!o.pressed),
    });
    if (onClick) b.addEventListener('click', e => onClick(e, b));
    return b;
  }

  /** Row of controls: controls(slider(…), seg(…), btn(…)) */
  const controls = (...kids) => h('div', { class: 'controls' }, ...kids);

  /** readout(items?) → div.readout with .set(items); items: [[label, valueHTML], …] | {label: value} | html */
  function readout(items) {
    const d = h('div', { class: 'readout' });
    d.set = it => {
      if (typeof it === 'string') { d.innerHTML = it; return d; }
      const rows = Array.isArray(it) ? it : Object.entries(it);
      d.innerHTML = rows.map(([k, v]) => `<span><b>${k}</b>${v}</span>`).join('');
      return d;
    };
    if (items) d.set(items);
    return d;
  }

  /** KPI tile: kpi(label, value, sub?, color?) → div.kpi with .set(value, sub?) */
  function kpi(k, v, s, color) {
    const d = h('div', { class: 'kpi', style: color ? `--kc:${color}` : null }, h('span', { class: 'k', html: k }), h('span', { class: 'v', html: v }));
    const sub = h('span', { class: 's', html: s || '' });
    if (s) d.append(sub);
    d.set = (nv, ns) => { d.querySelector('.v').innerHTML = nv; if (ns != null) { sub.innerHTML = ns; if (!sub.parentNode) d.append(sub); } return d; };
    return d;
  }

  /** table(headers, rows, {left:[colIdx]}) — rows: arrays, {cells, cls}, cells may be {html, cls} */
  function table(headers, rows, opts = {}) {
    const left = opts.left || [];
    const t = h('table', { class: 'data' });
    t.append(h('thead', {}, h('tr', {}, headers.map((x, i) => h('th', { class: left.includes(i) ? 'l' : null, html: x })))));
    const tb = h('tbody');
    t.append(tb);
    rows.forEach(r => {
      const tr = h('tr', { class: r.cls || null });
      (r.cells || r).forEach((c, i) => tr.append(h('td', {
        class: [left.includes(i) ? 'l' : '', (c && c.cls) || ''].join(' ').trim() || null,
        html: c && c.html != null ? c.html : String(c),
      })));
      tb.append(tr);
    });
    return h('div', { class: 'tbl-wrap' }, t);
  }

  /* ------------------------------------------------------------------
     Step-through
     ------------------------------------------------------------------ */
  const ICONS = {
    prev: 'M10 3 5 8l5 5', next: 'M6 3l5 5-5 5',
    play: 'M5 3v10l8-5z', pause: 'M5 3h2v10H5zM9 3h2v10H9z',
  };
  const icon = name => `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

  /**
   * stepper(host, {steps, render(i, step, n), label(step, i), start, interval, loop, pips})
   * Appends prev / play / next buttons, step pips and "step 2 of 5" to host.
   * steps: an array or a count. Returns {el, go(i), next(), prev(), play(), stop(), index, n}.
   */
  function stepper(host, o) {
    const steps = typeof o.steps === 'number' ? range(o.steps) : o.steps;
    const n = steps.length;
    let i = -1, timer = 0;
    const prev = btn(icon('prev') + '<span>Back</span>', () => { stop(); go(i - 1); }, { cls: 'sm st-prev', title: 'Previous step' });
    const play = btn('', () => (timer ? stop() : start()), { cls: 'sm st-play', pressed: false });
    const next = btn('<span>Next</span>' + icon('next'), () => { stop(); go(i + 1); }, { cls: 'sm st-next', title: 'Next step' });
    const pips = h('span', { class: 'st-pips' });
    const pipBtns = (o.pips === false || n > 16) ? [] : steps.map((_, k) =>
      h('button', { type: 'button', class: 'st-pip', 'aria-label': `Go to step ${k + 1}`, onclick: () => { stop(); go(k); } }));
    pips.append(...pipBtns);
    const count = h('span', { class: 'st-count', 'aria-live': 'polite' });
    const cap = h('span', { class: 'st-label' });
    const bar = h('div', { class: 'stepper', role: 'group', 'aria-label': o.ariaLabel || 'Step-through' },
      h('span', { class: 'st-btns' }, prev, play, next), pips, count, cap);
    const setPlay = on => { play.innerHTML = icon(on ? 'pause' : 'play') + `<span>${on ? 'Pause' : 'Play'}</span>`; play.setAttribute('aria-pressed', String(on)); };

    function go(k) {
      k = clamp(k, 0, n - 1);
      if (k === i) return;
      i = k;
      count.innerHTML = `step <b>${i + 1}</b> of ${n}`;
      const lab = o.label ? o.label(steps[i], i) : (steps[i] && steps[i].label) || '';
      cap.innerHTML = lab;
      cap.hidden = !lab;
      prev.disabled = i === 0; next.disabled = i === n - 1;
      pipBtns.forEach((b, j) => { b.classList.toggle('done', j < i); if (j === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      o.render(i, steps[i], n);
    }
    function start() {
      if (i >= n - 1) go(0);
      setPlay(true);
      timer = setInterval(() => { if (i >= n - 1) { if (o.loop) go(0); else stop(); } else go(i + 1); }, o.interval || 1600);
    }
    function stop() { clearInterval(timer); timer = 0; setPlay(false); }

    bar.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { stop(); go(i - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { stop(); go(i + 1); e.preventDefault(); }
    });
    setPlay(false);
    host.append(bar);
    go(o.start || 0);
    return {
      el: bar, go: k => { stop(); go(k); }, next: () => go(i + 1), prev: () => go(i - 1), play: start, stop,
      get index() { return i; }, n,
    };
  }

  /* ------------------------------------------------------------------
     KaTeX
     ------------------------------------------------------------------ */
  // KaTeX writes \gdef definitions into the macros object it is given, so we
  // snapshot the site macros once and hand every render a fresh copy.
  let MACROS = null;
  function macros() {
    if (!MACROS) MACROS = Object.assign({}, (window.KV && window.KV.macros) || {});
    return Object.assign({}, MACROS);
  }
  /** tex('\\ve + 1') → HTML string (inline; display=true for display mode). */
  function tex(src, display = false) {
    if (!window.katex) return `<span class="tex-raw">${esc(src)}</span>`;
    return window.katex.renderToString(String(src), {
      displayMode: !!display, macros: macros(), trust: true, strict: false, throwOnError: false,
    });
  }
  /** texNode(src, display) → <span class="tex"> or <div class="tex d"> */
  function texNode(src, display = false) {
    return h(display ? 'div' : 'span', { class: display ? 'tex d' : 'tex', html: tex(src, display) });
  }
  /** texify('HTML with $x$ and $$y$$') → HTML string; \$ is a literal dollar. */
  function texify(str) {
    return String(str)
      .replace(/\\\$/g, '\u0000')
      .replace(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g, (_, d, i) => (d != null ? tex(d.replace(/\u0000/g, '\\$'), true) : tex(i.replace(/\u0000/g, '\\$'))))
      .replace(/\u0000/g, '$');
  }

  /* ------------------------------------------------------------------
     Timing, randomness, numerics
     ------------------------------------------------------------------ */
  /** Run fn at most once per animation frame, with the latest arguments. */
  function throttleRAF(fn) {
    let id = 0, args, self;
    return function (...a) {
      args = a; self = this;
      if (!id) id = requestAnimationFrame(() => { id = 0; fn.apply(self, args); });
    };
  }

  /** Seeded RNG (mulberry32): r = rng(42); r() ∈ [0,1); r.uniform(a,b); r.normal(μ,σ); r.int(n); r.pick(arr); r.shuffle(arr) */
  function rng(seed = 1) {
    let s = typeof seed === 'number' ? seed >>> 0 : [...String(seed)].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
    const r = () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let spare = null;
    r.uniform = (a = 0, b = 1) => a + (b - a) * r();
    r.normal = (mu = 0, sigma = 1) => {
      if (spare != null) { const z = spare; spare = null; return mu + sigma * z; }
      let u = 0;
      while (u === 0) u = r();
      const v = r(), m = Math.sqrt(-2 * Math.log(u));
      spare = m * Math.sin(2 * Math.PI * v);
      return mu + sigma * m * Math.cos(2 * Math.PI * v);
    };
    r.int = (a, b) => (b == null ? Math.floor(r() * a) : a + Math.floor(r() * (b - a + 1)));
    r.pick = arr => arr[Math.floor(r() * arr.length)];
    r.shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return r;
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const sum = a => a.reduce((s, v) => s + v, 0);
  const mean = a => (a.length ? sum(a) / a.length : NaN);
  /** Population variance (ddof = 0) or sample variance (ddof = 1). */
  function variance(a, ddof = 0) {
    const m = mean(a);
    return a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - ddof);
  }
  /** Quantile with linear interpolation (q ∈ [0, 1]). */
  function quantile(a, q) {
    const s = a.filter(Number.isFinite).sort((x, y) => x - y);
    if (!s.length) return NaN;
    const p = clamp(q, 0, 1) * (s.length - 1), lo = Math.floor(p), hi = Math.ceil(p);
    return s[lo] + (s[hi] - s[lo]) * (p - lo);
  }
  const extent = a => { const f = a.filter(Number.isFinite); return [Math.min(...f), Math.max(...f)]; };
  function linspace(a, b, n = 50) {
    if (n < 2) return [a];
    return Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
  }
  /** range(n) → [0..n-1]; range(a, b, step) → [a, a+step, …) */
  function range(a, b, step = 1) {
    if (b == null) { b = a; a = 0; }
    const out = [];
    for (let v = a; step > 0 ? v < b : v > b; v += step) out.push(v);
    return out;
  }
  const log2 = Math.log2;
  /** Shannon entropy in bits of probabilities or counts (normalised). */
  function entropy(p) {
    const t = sum(p);
    return p.reduce((H, v) => (v > 0 ? H - (v / t) * Math.log2(v / t) : H), 0);
  }

  /* ------------------------------------------------------------------
     Export
     ------------------------------------------------------------------ */
  const api = {
    h, el, uid, esc,
    fmt, fmtS, fmtSI, fmtBytes, fmtPct,
    linear, logScale, ticks, logTicks,
    Plot, Diagram,
    linePath, line, area, bars, rule, annotate, crosshair, svgText, texLabel,
    dot, arrow, ellipsePath, roundedPath,
    series, legend,
    showTip, hideTip, hover, draggable,
    seg, slider, btn, controls, readout, kpi, table, stepper,
    tex, texNode, texify,
    throttleRAF, rng,
    clamp, sum, mean, variance, quantile, extent, linspace, range, log2, entropy,
  };
  window.PK = api;
  Object.assign(window, api);
})();
