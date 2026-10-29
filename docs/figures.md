# Figures: API reference and cookbook

This is the guide for anyone writing an interactive figure for the primer. Read
sections 1 and 2 first. Section 3 is the full reference, and section 5 has three
complete examples you can copy. `figures/_demo.js` is a longer working example
that uses most of the API (`FIG.demoLine`, `FIG.demoDrag`, `FIG.demoBars`).

The toolkit is three classic scripts plus one stylesheet:

| file | role |
|---|---|
| `theme/assets/js/plotkit.js` | the helpers: DOM, scales, plots, marks, controls, tooltips, KaTeX, colours, numerics. Every function is a global and is also on `window.PK`. |
| `theme/assets/js/figs-loader.js` | the `FIG` registry. Builds each figure lazily and shows errors. |
| `theme/assets/js/cgraph.js` | concept graphs (section 6). |
| `theme/assets/css/figures.css` | styles for plates, plots, controls, readouts, tooltips and concept graphs. |

There are no modules, no build step and no libraries apart from KaTeX.

---

## 1. How a figure reaches the page

The build turns a figure directive in Markdown into this markup:

```html
<figure class="plate" id="fig-reuse" data-fig="reuseCurve">
  <div class="fig-host"></div>
  <figcaption><span class="plate-no">Plate III.4·1</span> caption HTML …</figcaption>
</figure>
```

Figure code goes in a per-Part file such as `figures/part3.js`. That file is
loaded as a deferred classic script after the toolkit:

```js
window.FIG = window.FIG || {};
FIG.reuseCurve = (host, figure) => {
  // host   = the empty <div class="fig-host">; put everything inside it
  // figure = the <figure> element (read data-* attributes from it if needed)
};
```

**Lifecycle.** Each builder is called **once**, when its figure comes within
about 600px of the viewport. Builders can return a Promise, for example after a
`fetch` of a JSON data file. The loader marks the figure's state on the
`<figure>` element:

| `data-built` | meaning |
|---|---|
| *(absent)* | not built yet (still off-screen) |
| `pending` | an async builder is still running |
| `1` | built successfully |
| `error` | the builder was missing, threw an error or rejected. A red `.fig-error` box with the message is placed in the host, and the error is logged with `console.error`. |

`window.buildAllFigures()` builds every figure immediately and returns
`{total, built, failed: [names]}`. The headless checker uses it, and it also
runs before printing. `window.buildFigure(figureEl)` builds a single figure.

If a Part's figures need extra styles, put them in a CSS file with the same base
name next to the JS file (for example `figures/part3.css`); the layout loads it.
Use only token variables there, and scope every rule under the figure's id or a
class prefix.

The **plate** (vellum ground, gilt border, corner flourishes in `var(--c)`,
caption) is styled by `figures.css`. Your builder only fills the host. The host
is a flex column with a gap of `.85rem`, so you can append blocks one after
another.

---

## 2. Rules of the house

1. **Colours only through CSS variables, and only in `style` or classes.** SVG
   presentation attributes do not resolve `var()`. Write
   `el('rect', {style: 'fill:var(--peacock)'})`, never `{fill: 'var(--peacock)'}`.
   Never use a hex value. All colours live in `tokens.css`, and both themes
   switch automatically.
2. **Series colours come from `series(i)`**, in a fixed order that stays
   distinct in both themes and under colour-blindness simulation: lapis,
   vermilion, peacock, saffron, amethyst, emerald, dusk, sage. Colour follows the
   entity, not its rank. If you have more than 8 series, fold the extras into
   "other" or split the chart. `var(--c)` is the Part accent; use it for the one
   thing the reader manipulates (handles, the current step). Use `--good` and
   `--bad` only for a good or bad state.
3. **Text never takes a series colour.** Labels, values and legends use ink
   colours (`--ink`, `--ink-2`, `--ink-3`). A coloured key or mark beside the
   text carries the identity.
4. **Put the container in the page before calling `Plot()`.** `Plot` and
   `Diagram` measure the host width. On phones they enlarge text and margins by
   `P.fs` (1 to 1.9) so labels stay about 10.5px or larger. Do
   `const box = h('div'); host.append(box); Plot(box, …)`, not the reverse.
5. **Size in viewBox units.** Plots default to `w: 640, h: 360` and scale to
   the column width. Write in-plot text with the classes `lbl`, `val` and
   `annot` (section 4) so it scales with `--fs` and gets a vellum halo. Do not
   hard-code `font-size`. Multiply your own pixel offsets by `P.fs`.
6. **Every figure works without hover.** Tooltips also open on tap and on
   keyboard focus. Give draggable points `opts.get` so arrow keys move them.
   With two or more series, show a `legend()`. Put numbers that matter in a
   `readout()` or `kpi()`, not only in tooltips.
7. **Keep state inside the builder.** Helpers and data belong inside the
   `FIG.name = (host) => { … }` closure. Do not add globals; other Parts' files
   share the page.
8. **Fail loudly.** If a data file is missing, throw. The plate then shows the
   error and the checker catches it. Do not `try/catch` to hide problems.
9. **Mark illustrative numbers as illustrative** in the caption or the KPI
   subtitle.

---

## 3. API reference

The signatures below give each function's arguments and defaults. "px" means
viewBox pixels.

### 3.1 DOM

| function | what it does |
|---|---|
| `h(tag, attrs?, ...children)` | Creates an HTML element. Attributes: `class`, `html` (innerHTML), `text`, `on<event>: fn`, others are passed to `setAttribute` (`true` → empty string, `null`/`false` → skipped). Children: nodes, strings or nested arrays. |
| `el(tag, attrs?, parent?)` | Creates an SVG element and appends it to `parent` if given. `text` sets textContent, `html` sets innerHTML. Pass colours through `style`. |
| `uid(prefix='pk')` | Returns a unique id string, for clip paths, gradients and labels. |
| `esc(str)` | HTML-escapes a string. |

### 3.2 Formatting

| function | example |
|---|---|
| `fmt(v, d=2)` | `fmt(3.14159)` → `3.14`. `fmt(3)` → `3` (integers print bare when `d` is the default). Negatives get a true minus (`−`). `NaN` → `—`, `Infinity` → `∞`. |
| `fmtS(v, d=2)` | signed: `+0.50`, `−1.20` |
| `fmtSI(v, d=1)` | `1234` → `1.2k`, `3e6` → `3M` |
| `fmtBytes(n, d=1)` | `1536` → `1.5 KiB` (binary units) |
| `fmtPct(v, d=1)` | `0.123` → `12.3%` |

### 3.3 Scales and ticks

| function | what it does |
|---|---|
| `linear(d0, d1, r0, r1)` | Returns a scale function `f(v)` with `f.invert(px)`, `f.domain` and `f.range`. |
| `logScale(d0, d1, r0, r1, base=10)` | Log scale with the same interface. |
| `ticks(lo, hi, count=6)` | "Nice" round tick values. |
| `logTicks(a, b, base=10)` | Powers of `base` inside [a, b], thinned to about 9. |

### 3.4 Plot frame

**`Plot(host, opts) → P`** draws the axes and returns the plot object.

| option | default | meaning |
|---|---|---|
| `w`, `h` | 640, 360 | viewBox size. `h` grows a little on phones. |
| `x`, `y` | `[0,1]` | data domains. A reversed domain is allowed. |
| `xlog`, `ylog` | – | `true` (base 10) or a base, e.g. `2` for block sizes |
| `xcats`, `ycats` | – | category labels. The domain becomes `[-0.5, n-0.5]` and the ticks name the categories (use with `bars`). `ycats` puts category 0 at the top. |
| `xticks`, `yticks` | auto | explicit tick values |
| `xn`, `yn` | auto | approximate tick count |
| `xfmt`, `yfmt` | auto | tick label formatters `v => string` |
| `xlabel`, `ylabel` | – | axis titles (set in small caps) |
| `grid` | `true` | `true`, `false`, `'x'` or `'y'` |
| `m` | auto | margins `{l, r, t, b}` before phone scaling |
| `equal` | `false` | equal data units on both axes (one domain is widened) |
| `noclip` | `false` | do not clip the data layer to the plot area |
| `label` | from the axis labels | `aria-label` of the SVG |
| `cls` | – | extra class on the `<svg>` |

The returned `P` has:

* `P.x(v)`, `P.y(v)`: data → px (each with `.invert`). `P.x0, P.x1, P.y0, P.y1` are the current domain.
* `P.g.bg`, `P.g.grid`, `P.g.axes`, `P.g.data`, `P.g.top`: layers, from bottom to top. `bg` and `data` are clipped to the plot area (with 5px of slack). `P.g.cross` exists after `crosshair()`.
* `P.svg`, `P.defs`, `P.W`, `P.H`, `P.m`, `P.pw`, `P.ph` (plot width and height), `P.fs` (phone text factor) and `P.opts`.
* `P.domain({x?, y?})`: re-domains the plot and redraws the axes only. Marks already drawn keep their old positions, so call `P.clear()` and redraw them. `P.clear()` also empties `P.g.top`, so re-append any drag handles you keep there (and restore their keyboard focus). To change an axis title, set `P.opts.ylabel = '…'` before calling it.
* `P.clear(...layers)`: empties layers (default `'data', 'top'`) before a redraw.
* `P.toData(pointerEvent) → [x, y]` in data units.
* `P.series`: the series registered by `line(…, {name})`, used by `crosshair`.

**`Diagram(host, {w=640, h=300, label, grow=0}) → {svg, defs, W, H, fs}`** is a
bare SVG for schematic drawings. It has no axes but gets the same text classes
and phone scaling. Text grows by `D.fs` on phones: leave room, or pass `grow`
(0 to 1) to add height.

### 3.5 Marks

All marks take data coordinates unless noted. Pass `parent` to draw into your
own `<g>` (useful for redrawing one part of a figure).

| function | what it does |
|---|---|
| `line(P, pts, opts) → g` | Draws a polyline through `[[x,y],…]`. Non-finite points break the line. Options: `color` (default `series(opts.series‖0)`), `width` (2.25), `dash` (`true` or a dasharray), `curve` (`'linear'` or `'step'`), `markers` (`true` or a radius), `tip(pt, i) → html` (tooltip on markers), `label` (direct label at the last point), `name` (registers the series for `crosshair`; a name drawn again replaces the old entry), `parent`, `cls`. Returns a `<g>` with `.path` and `.markers`. |
| `linePath(P, pts, curve?)` | Path data only, for updating an existing path's `d`. |
| `area(P, pts, opts) → g` | Fills `[[x,y],…]` down to `base` (default 0 if 0 is in the domain, else the bottom of the domain), or fills a band given as `[[x, lo, hi],…]`. Options: `color`, `opacity` (.14), `base`, `line` (also stroke the top edge), `parent`. |
| `bars(P, data, opts) → g` | Grouped bars on a categorical axis (use `xcats`, or `ycats` with `horizontal: true`). `data` is `[v,…]`, `[[v1,v2],…]` or `[{values},…]`. Options: `colors` (an array, or `fn(i, j, v)`; default `series(j)`), `names` (series names for the default tooltip), `labels` (`true` or `fn(v, i, j) → text`, drawn at the bar end; with `true`, every label gets one decimal if any value has decimals), `tip` (`fn(v, i, j) → html`, or `false`), `width` (max bar width, 28), `fill` (share of the slot, .78), `gap` (2), `base` (0), `horizontal`. Bars have a rounded data end and a square base. Hovering anywhere in a bar's column shows its tooltip and dims its neighbours. |
| `rule(P, {x \| y, label, color, dash, parent})` | Labelled reference line across the plot. `dash: false` draws it solid. |
| `annotate(P, x, y, text, {dx=34, dy=-30, anchor, color, dot, parent})` | Italic callout text placed `(dx, dy)` px from the point, joined by a curved leader line. Use `\n` for line breaks. |
| `crosshair(P, {series, xname, xfmt, yfmt})` | Hover and touch-scrub guide for line plots: a vertical rule, one dot per series and a tooltip listing the values. It uses `P.series` unless you pass `[{name, pts, color}]`. Create it once; it survives `P.clear()`. Draggable handles in `P.g.top` stay above it. |
| `texLabel(parent, x, y, src, {anchor, w=180, h=30, text})` | KaTeX inside an SVG (a `foreignObject`), vertically centred on `y`. With `text: true`, `src` is passed through `texify`. |
| `svgText(parent, x, y, text, attrs)` | `<text>` with `\n` line breaks. |
| `dot(parent, px, py, r, color, extra?)` | Circle in px with a surface-coloured ring. |
| `arrow(parent, x1, y1, x2, y2, color, w=2)` | Straight arrow in px. |
| `ellipsePath(P, mx, my, l1, l2, th, k=1)` | Path data for a k-σ covariance ellipse (eigenvalues `l1`, `l2`, angle `th`). |
| `roundedPath(pts, r)` | Path data for a closed polygon (px points) with rounded corners. |

### 3.6 Colour and legend

| function | what it does |
|---|---|
| `series(i) → 'var(--lapis)'` | The i-th categorical colour (8 slots; see rule 2). `series.names` lists them. |
| `legend(items, {shape}) → div.legend` | Items are `'label'`, `[label, color, shape]` or `{label, color, shape}`. The colour defaults to `series(i)`. Shapes: `line` (default), `dash`, `dot`, `box`, `band`. Labels are HTML (KaTeX is fine). |

### 3.7 Tooltips and interaction

| function | what it does |
|---|---|
| `hover(node, evt => html)` | Shows a tooltip on hover, tap (touch) and keyboard focus. Returning `''` or `null` hides it. Works on HTML and SVG nodes. |
| `showTip(evtOrElement, html)` / `hideTip()` | Drives the single shared `.tip` element directly. The tooltip takes `--c` from the element under the pointer. |
| `draggable(node, P, onMove([x,y], evt), onEnd?, {get, step, label})` | Pointer drag in data coordinates (mouse, pen and touch; the page does not scroll while dragging). With `get: () => [x, y]` the node becomes focusable (`role="slider"`) and arrow keys move it by `step` (`[sx, sy]`, default 1/50 of the domain; Shift moves 5×). Give the node the class `handle` for the standard accent knob. |

### 3.8 Controls and read-outs

| function | what it does |
|---|---|
| `controls(...children) → div.controls` | A wrapping row of controls. |
| `slider(label, min, max, step, value, onInput(v, out), format?)` | Returns `<label class="slider">` with the `.input` range, the `.out` value bubble and `.set(v)` (sets the value without firing `onInput`). The label is HTML (use `texify`). The value is shown with `format(v)` or `fmt`; `onInput` may overwrite `out`. |
| `seg([[value, 'label'],…], value, onChange(v), ariaLabel)` | Segmented buttons that wrap on phones. `.set(v)` updates the selection silently and `.value` reads it. |
| `btn(labelHtml, onClick(evt, btn), {pressed, cls, title})` | Round pill button. Add `cls: 'sm'` for a small one. Pass `pressed` to make it a toggle (`aria-pressed`). |
| `readout(items?) → div.readout` | Monospace, accent-tinted strip. `.set([[label, valueHtml],…])`, `.set({label: value})` or `.set(html)`. |
| `kpi(label, value, sub?, color?) → div.kpi` | Lozenge tile, colour `--kc` (default `var(--c)`). `.set(value, sub?)` updates it. Wrap tiles in `h('div', {class: 'kpis'}, …)`. |
| `table(headers, rows, {left: [colIdx]})` | Number table in a horizontally scrolling wrapper. A row is an array, or `{cells, cls}` where `cls` is `'hl'` or `'sum'`. A cell may be `{html, cls}` with `cls` `'pos'` or `'neg'`. |
| `stepper(host, {steps, render(i, step, n), label(step, i), start=0, interval=1600, loop=false, pips=true})` | Step-through bar with Back, Play/Pause and Next buttons, clickable pips, "step 2 of 5" and a caption line. `steps` is an array or a count. It calls `render` immediately and on every change, and arrow keys work while focus is in the bar. Returns `{el, go(i), next(), prev(), play(), stop(), index, n}`. The bar is appended to `host` when you call it, so append your drawing first. |

### 3.9 Maths (KaTeX)

| function | what it does |
|---|---|
| `tex(src, display=false) → html` | `katex.renderToString` with the site macros (`KV.macros`, e.g. `\ve`, `\vrho`, coloured by symbol family), `trust: true`, `strict: false`, `throwOnError: false`. Each call gets a fresh copy of the macros, so `\gdef` cannot leak between calls. |
| `texNode(src, display=false) → element` | `<span class="tex">` (inline) or `<div class="tex d">` (display). |
| `texify('HTML with $x$ and $$y$$') → html` | Renders the `$…$` and `$$…$$` parts. `\$` is a literal dollar sign. The rest of the string is treated as HTML. |

In JavaScript strings, write backslashes twice: `tex('\\frac{a}{b}')`.

### 3.10 Utilities

| function | what it does |
|---|---|
| `throttleRAF(fn)` | Runs `fn` at most once per animation frame, with the latest arguments. Use it for expensive redraws on `input` or `pointermove`. |
| `rng(seed)` | Seeded generator (mulberry32). The seed can be a number or a string. `r()` ∈ [0,1), `r.uniform(a, b)`, `r.normal(μ=0, σ=1)`, `r.int(n)` ∈ [0,n), `r.int(a, b)` ∈ [a,b], `r.pick(arr)`, `r.shuffle(arr)` (returns a copy). The same seed always gives the same figure. |
| `sum`, `mean` | of an array |
| `variance(a, ddof=0)` | population variance (`ddof=1` gives the sample variance) |
| `quantile(a, q)` | linear interpolation, `q` ∈ [0,1] (`0.5` is the median) |
| `extent(a)` | `[min, max]` of the finite values |
| `linspace(a, b, n=50)` | `n` evenly spaced values including both ends |
| `range(n)` / `range(a, b, step=1)` | integer ranges |
| `clamp(v, lo, hi)`, `log2(x)` | |
| `entropy(p)` | Shannon entropy in bits of probabilities or counts (normalised first) |

---

## 4. CSS classes for authors

| class | use |
|---|---|
| `.fig-row` | two-up grid that stacks on narrow screens (`min-width: 17rem` per cell) |
| `.fig-note` | small italic note in `--ink-3` |
| `.kpis` | grid wrapper for `kpi()` tiles |
| SVG `.lbl` | small-caps label with a vellum halo |
| SVG `.val` | monospace value label with a halo |
| SVG `.annot` | italic callout text |
| SVG `.ink`, `.ink-2`, `.mono` | text fill in `--ink` / `--ink-2`, monospace font |
| SVG `.handle` | draggable knob in `var(--c)` with a halo on hover, focus and drag |
| SVG `.hit` | invisible hit area (transparent fill that still receives pointer events) |
| SVG `.dot` | adds the surface ring to a circle |

All SVG text sizes are `calc(Npx * var(--fs))`, so they grow on phones.

---

## 5. Cookbook

Each example is a complete figure. Paste it into a Part's figures file and add
a figure directive with the same name.

### 5.1 A line plot with a legend, a reference line and hover values

```js
FIG.exampleReuse = (host) => {
  const sizes = [16, 32, 64, 128, 256, 512, 1024];
  const keys = sizes.map((b, i) => [b, 0.94 - 0.09 * i]);   // illustrative numbers
  const vals = sizes.map((b, i) => [b, 0.81 - 0.11 * i]);
  const box = h('div');
  host.append(legend(['keys K', 'values V']), box);         // in the page before Plot()
  const P = Plot(box, {
    x: [16, 1024], xlog: 2, y: [0, 1],
    xlabel: 'block size (tokens)', ylabel: 'blocks reused', yfmt: v => fmtPct(v, 0),
    label: 'Share of blocks reused against block size',
  });
  line(P, keys, { name: 'keys K', color: series(0), markers: true });
  line(P, vals, { name: 'values V', color: series(1), markers: true });
  rule(P, { y: 0.5, label: 'half reused' });
  crosshair(P, { xname: 'block of', xfmt: v => `${v} tokens`, yfmt: v => fmtPct(v) });
};
```

### 5.2 A slider and a draggable knob kept in sync, with a KaTeX readout

```js
FIG.exampleCoin = (host) => {
  let p = 0.2;
  const Hb = q => entropy([q, 1 - q]);
  const box = h('div'), ro = readout();
  const sl = slider(texify('$p$ (heads)'), 0.01, 0.99, 0.01, p, v => { p = v; draw(); });
  host.append(controls(sl), box, ro);
  const P = Plot(box, { x: [0, 1], y: [0, 1.05], h: 300, xlabel: 'probability of heads p', ylabel: 'bits per toss' });
  line(P, linspace(0, 1, 101).map(q => [q, Hb(q)]), { color: series(4) });
  const knob = el('circle', { class: 'handle', r: 7 * P.fs }, P.g.top);
  draggable(knob, P, ([x]) => { p = clamp(+x.toFixed(2), 0.01, 0.99); sl.set(p); draw(); }, null,
    { get: () => [p, Hb(p)], step: [0.01, 0], label: 'probability of heads' });
  hover(knob, () => `<b>p = ${fmt(p)}</b><br>H = ${fmt(Hb(p), 3)} bits`);
  function draw() {
    knob.setAttribute('cx', P.x(p));
    knob.setAttribute('cy', P.y(Hb(p)));
    ro.set([[tex('H(p)'), `${fmt(Hb(p), 3)} bits`], ['1000 tosses', `≈ ${fmt(1000 * Hb(p), 0)} bits`]]);
  }
  draw();
};
```

### 5.3 A step-through diagram

Compute every state first, then let `stepper` call `render(i)`.

```js
FIG.exampleLRU = (host) => {
  const seq = ['A', 'B', 'C', 'A', 'D', 'B'], CAP = 3;
  let cache = [];
  const steps = seq.map(id => {             // precompute every state
    const hit = cache.includes(id), out = !hit && cache.length === CAP ? cache[CAP - 1] : null;
    cache = [id, ...cache.filter(x => x !== id)].slice(0, CAP);
    return { id, hit, cache, label: hit ? `${id} is cached: a hit, moved to the front.`
      : `${id} is new: a miss${out ? `, so ${out} (least recently used) is evicted` : ''}.` };
  });
  const D = Diagram(host, { w: 640, h: 170, label: 'LRU cache contents, step by step' });
  const g = el('g', {}, D.svg);
  stepper(host, {
    steps, label: s => s.label,
    render(i, s) {
      g.replaceChildren();
      el('text', { x: 16, y: 44, class: 'lbl', text: 'requests' }, g);
      seq.forEach((id, k) => {
        const x = 190 + k * 56, now = k === i;
        el('rect', { x, y: 22, width: 44, height: 34, rx: 6, style: `fill:${now ? 'var(--c)' : 'var(--paper)'};stroke:var(--rule);opacity:${k > i ? 0.4 : 1}` }, g);
        el('text', { x: x + 22, y: 45, 'text-anchor': 'middle', class: 'mono', style: `fill:${now ? 'var(--paper-3)' : 'var(--ink)'}`, text: id }, g);
      });
      el('text', { x: 16, y: 126, class: 'lbl', text: 'cache' }, g);
      s.cache.forEach((id, k) => {
        const x = 190 + k * 92, fresh = id === s.id;
        el('rect', { x, y: 100, width: 76, height: 42, rx: 8, style: `fill:${fresh ? (s.hit ? 'var(--good)' : 'var(--c)') : 'var(--paper)'};stroke:var(--rule)` }, g);
        el('text', { x: x + 38, y: 127, 'text-anchor': 'middle', class: 'mono', style: `fill:${fresh ? 'var(--paper-3)' : 'var(--ink)'}`, text: id }, g);
      });
    },
  });
};
```

### 5.4 Smaller recipes

* **Grouped bars:** `const P = Plot(box, {xcats: ['gzip', 'zstd', 'ours'], y: [0, 16], grid: 'y'}); bars(P, [[9.1, 9.8], [7.4, 8.0], [5.3, 7.2]], {names: ['K', 'V'], labels: true});`
* **Horizontal bars:** use `ycats` and `bars(P, data, {horizontal: true})`.
* **Redrawing on input:** keep a `draw()` that calls `P.clear()` and redraws all marks. Wrap it with `throttleRAF` if it is heavy.
* **Changing the y-axis with a switch:** `P.opts.ylabel = 'ratio'; P.domain({y: [0, top]});` (see `FIG.demoLine`).
* **Reproducible noise:** `const r = rng('part3-fig2'); const xs = range(200).map(() => r.normal(0, 1));`
* **Maths in labels:** HTML labels (`slider`, `kpi`, `legend`, `readout`) accept `tex()` and `texify()` output. Inside the SVG, use `texLabel()`.
* **A data file:** `FIG.x = async (host) => { const d = await (await fetch(url)).json(); … }`, where `url` is built from `KV.prefix`, the site's base path. If the fetch or the JSON parse fails, the promise rejects and the plate shows a figure error.

---

## 6. Concept graphs

The build renders a graph from Markdown. No JavaScript is needed from authors.

```html
<div class="cgraph" id="graph-toolbox" style="--cols:5">
  <div class="cg-heads"><div class="cg-head" style="--col:1">Information</div> …</div>
  <div class="cg-grid">
    <a class="cg-node" data-node="entropy" href="…" style="--col:1;--row:1;--nc:var(--cat-info)">
      <span class="cg-emb"><svg class="emb"><use href="#emb-spark"></use></svg></span>
      <span class="cg-title">Entropy</span><span class="cg-text">How many bits a message costs, on average.</span>
    </a>
    …  (a node without a page is a <div class="cg-node">)
  </div>
  <script type="application/json" class="cg-edges">[["entropy","side-info","conditioning"],["entropy","coding",""]]</script>
</div>
```

How it behaves:

* **Layout.** `--col` and `--row` are 1-based grid positions. Cards in one row
  share a height. Linked cards are lifted tiles with a `→` after the title;
  plain `div` nodes sit flat. `--nc` colours the top band, the emblem and the
  outgoing wires.
* **Wires.** Curved connectors with arrowheads and optional small-caps labels:
  * Between columns they run from the right edge to the left edge.
  * Within a column they run from the bottom edge to the top edge.
  * If a card sits between two cards in the same column, the wire loops around
    it through the column gap.
  * If a card sits between two cards in the same row, the wire arcs through the
    row gap.
  * Several wires on one side of a card are spread out. Labels are placed where
    they do not cover a card.
  * Wires are redrawn when the graph resizes and after fonts load.
* **Highlight.** Hovering or focusing a card (Tab works; plain nodes get
  `tabindex="0"`) highlights the card, its neighbours and its wires, and dims
  everything else.
* **Phones.** When the graph is narrower than 640px (a CSS container query on
  `.cgraph`), the cards stack in a single column ordered by column, then row.
  The column heads become section headings, the wires are hidden, and each card
  shows "→ leads to: X, Y".
* **Edge-label ground.** Labels sit on `var(--cg-bg)`, which defaults to
  `var(--paper)`. If the graph is placed on another ground, set `--cg-bg`.
* **Emblems.** Emblem symbols (`#emb-*`) come from the site sprite and should
  paint with `currentColor`.
* **Width.** A five-column graph wants about 56rem or more to breathe. In a
  42rem column it still works, with tight cards.
* **Errors.** An edge that names an unknown node is skipped with a console
  warning.

---

## 7. Checklist before you commit a figure

- [ ] It builds without console errors (`buildAllFigures()` in the console reports `failed: []`).
- [ ] It reads at 375px wide: no horizontal scroll, labels legible, controls wrap.
- [ ] It works in dark mode (`document.documentElement.dataset.theme = 'dark'`).
- [ ] No hex colours, and no `fill="var(…)"` attributes.
- [ ] Two or more series have a legend. Key numbers are visible without hovering.
- [ ] Draggable things have `opts.get`, so they work from the keyboard.
- [ ] The caption says what to do ("drag…", "step through…") and marks illustrative data.

---

## 7. Example datasets: the tabbed data card

The site teaches with small, made-up, *specific* datasets: three weeks of Gull Rock wind, a month of
temperatures, a sky archive, a few vectors. Whenever the prose leans on such a dataset, **show it** with a
dataset card instead of describing it in a sentence. A card is a plate with four tabs:

| tab | what it shows |
|---|---|
| **Plot** | one or more natural views of the data (a timeline for a time series, a histogram for a distribution, a scatter for pairs, counts for categories). Highlights colour notable rows; clicking a bar or dragging across a plot *selects* rows, and the selection carries over to the table. |
| **Table** | every row, paged, with "jump to row #", "only highlighted rows", and the current selection. |
| **Numbers** | the statistics the page leans on, each computed live from the rows, with a one- or two-sentence *interpretation*: what the number tells us, here. |
| **Code** | a short numpy/pandas snippet that recomputes the Numbers tab from the CSV, plus a "download CSV" button. |

Under the card, the build adds a strip "Met before on II.9 · comes back on II.12 …", linking every page that
shows the same dataset, and the title links to the reference page **Example datasets**
(`content/10-reference/09-datasets.md`), which lists every appearance. That is how a dataset becomes a
running thread: introduce it once, then bring it back.

### 7.1 Showing a dataset on a page

```markdown
::: dataset fig-wind-data wind view=timeline,histogram hl=gales marks=median,p95 tab=plot
**The Gull Rock wind archive.** Caption as for any figure: what each view shows, what the colours mean,
what the controls do, and that the data is synthetic and seeded.
:::
```

| option | meaning |
|---|---|
| `fig-…` | the plate id (unique site-wide, as for figures; it is numbered like a plate and can be cross-referenced with `[[#fig-…]]`) |
| `wind` | the dataset id |
| `view=a,b` | which of the dataset's views to offer, the first is shown first (default: all, in definition order) |
| `hl=name` | a highlight switched on at the start (default: none) |
| `marks=a,b` | metrics drawn as reference lines on the plot (metrics with `mark: '<column>'`) |
| `metrics=a,b` | which metrics the Numbers tab shows, in this order (default: all). Pick the ones this page talks about. |
| `tab=plot\|table\|numbers\|code` | the tab open at the start |
| `wide` | let the plate break out of the column |

Every number quoted in the prose must be one the card shows. A page that discusses the data in a new way
should usually show the card again — with the views, highlight and metrics that suit *this* page — rather
than just linking back.

### 7.2 Defining a dataset

Two files, so that several writers can add datasets side by side:

1. **`data/datasets/<part-slug>.yaml`** — the metadata (rendered at build time in the card head and on the
   reference page):

   ```yaml
   wind:
     title: Gull Rock wind
     blurb: Three weeks of wind speed at the Gull Rock station, one reading every half hour, in whole knots.
     emblem: flag                 # a name from theme/layouts/partials/emblems.njk
     unit: 1,024 readings · knots # short chip
     source: synthetic, seeded    # short chip
     csv: gull-rock-wind.csv      # download name
     story: >-                    # optional, reference page only
       How it was made and what it teaches.
   ```

2. **`figures/datasets/<id>.js`** — the data, its columns, views, highlights and metrics. All these files are
   bundled into `/assets/gen/datasets.js`, which every page loads (after `plotkit.js` and `datasets.js`,
   before the Part figure files). Wrap the file in an IIFE; it may only call `DS.define`.

   ```js
   (function () {
     DS.define('wind', {
       rows() {                      // called once per page, then cached: a seeded generator, never Math.random
         const r = rng('si-wind');
         return range(1024).map(i => ({ day: Math.floor(i / 48) + 1, t: i / 48, kn: /* … */ 0 }));
       },
       columns: [{ key: 'day', label: 'day' }, { key: 'kn', label: 'knots' }, { key: 'force', label: 'Beaufort name', left: true }],
       csvColumns: ['day', 'time', 'kn'],          // optional (default: the columns' keys)
       highlights: { gales: { label: 'gales (≥ 40 kn)', test: r => r.kn >= 40 } },
       views: {
         timeline: DS.views.timeline({ x: 't', y: 'kn', xlabel: 'day', ylabel: 'wind (knots)', xtfmt: v => `day ${v + 1}` }),
         histogram: DS.views.histogram({ key: 'kn', xlabel: 'wind speed (knots)', ylabel: 'readings', unit: 'kn', noun: 'readings' }),
       },
       metrics: [
         { id: 'median', label: 'median', mark: 'kn', value: rows => quantile(rows.map(r => r.kn), 0.5), fmt: v => `${fmt(v)} kn`,
           note: v => `Half of all readings are at or below ${fmt(v)} knots: a gentle breeze is the typical day.` },
       ],
       code: `import pandas as pd\nwind = pd.read_csv("{csv}")\nprint(wind["kn"].median())`,   // {csv} → the download name
     });
   })();
   ```

**Built-in views** (`DS.views.*`, each takes an options object and returns `{label, draw}`):

| view | options |
|---|---|
| `timeline` | `x` (column; default the row position), `y`, `xlabel`, `ylabel`, `xtfmt` (tick labels), `xfmt`/`yfmt` (crosshair), `xticks`, `yticks`, `ydomain`, `xdomain`, `curve` (`'step'`), `width`, `h`, `label` (button text) |
| `histogram` | `key`, `bin` (default 1), `domain` `[lo, hi]`, `xlabel`, `ylabel`, `unit`, `noun`, `xticks`, `h`, `label` |
| `scatter` | `x`, `y`, `xlabel`, `ylabel`, `color` (a category column), `catLabel(c)`, `catSeries(c, i)`, `equal`, `xdomain`, `ydomain`, `r`, `tip(row, i)`, `h`, `label` |
| `categories` | `key`, `order` (category order), `catLabel(c)`, `catSeries(c, i)`, `xlabel`, `ylabel`, `noun`, `h`, `label` |

Every built-in view takes `after(P, ctx)` (and passes through `note`, `highlights`, `legend`, below) to draw extra marks on top (fits, reference curves, annotations).
Any view (built-in or custom) may also carry `highlights: ['gales', …]` (the highlights it can show; the
highlight picker offers only those), `legend: false` (no automatic "all rows / highlight" legend, for a view
that draws its own key; `legend: 'hl'` keeps only the highlight's entry) and `note` (a sentence or `ctx => html` shown under the plot).
A dataset spec may carry extra fields such as `helpers: {…}` for figures that share its logic
(`DS.spec('<id>').helpers`). Custom views must style with inline `style` or classes from `figures.css`:
the card may be shown on a page of another Part, which does not load that Part's stylesheet.
A **custom view** is any `{ label, draw(box, ctx) }`: put a `Plot`/`Diagram` in `box` and use
`ctx.rows`, `ctx.hl` (`{label, test}` or null), `ctx.sel`, `ctx.select({label, test})`, `ctx.marks`, `ctx.idx`.
Use custom views when the natural picture of the data is not a standard chart: a grid of JSON messages, a
heat map of a matrix, arrows for vectors, a cache diagram.

**Metrics**: `{ id, label, tex?, short?, value(rows), fmt?(v, rows), note?(v, rows) | note, mark? }`.
`note` is the point of the tab: one or two sentences, in the page's voice, on what the number *means* for
this data (compare it with another metric, connect it to the coding question). `label` and `note` may
contain `$…$` maths with the site's macros (they go through `texify`).

**Reusing a dataset in a figure.** A figure that computes on the same data must read it from the dataset, so
there is one generator and the numbers always agree: `DS.rows('wind')`, `DS.col('wind', 'kn')`,
`DS.metric('wind', 'median')`.

**Datasets built from datasets.** A derived dataset (residuals of the temperatures, say) is its own
`DS.define` whose `rows()` reads `DS.rows('temp')`.
