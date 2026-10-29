/* =====================================================================
   datasets.js — the running example datasets and their tabbed card.

   A dataset is defined once, in figures/datasets/<id>.js (all of them are
   bundled into /assets/gen/datasets.js and loaded on every page), and its
   title and blurb live in data/datasets/*.yaml:

     DS.define('wind', {
       rows: () => [...],                    // seeded generator → array of plain objects (called once, cached)
       columns: [{ key, label, fmt?, left? }],   // the Table tab and the CSV
       highlights: { gales: { label, test: r => bool } },
       views: { histogram: DS.views.histogram({...}), timeline: DS.views.timeline({...}) },
       metrics: [{ id, label, tex?, value: rows => v, fmt?: v => str, note?: (v, rows) => html, mark?: '<column key>' }],
       code: `python that reads {csv} and recomputes the metrics`,
     });

   Pages show it with  ::: dataset fig-<id> <dataset> [view=a,b] [tab=…] [metrics=a,b] [marks=a,b] [hl=name]
   which the figure loader builds through FIG.dataset below. Figures that need
   the same numbers read them with DS.rows('wind') — one source of truth.
   Full guide: docs/figures.md, section 7.
   ===================================================================== */
(function () {
  'use strict';
  const SPECS = {}, CACHE = {};
  const tint = (col, pct) => `color-mix(in srgb, ${col} ${pct}%, transparent)`;
  const BASE = series(0), HL = series(1), SEL = 'var(--c)';
  const nf = new Intl.NumberFormat('en-US');
  const count = n => nf.format(n);

  const DS = {
    define(id, spec) {
      if (SPECS[id]) throw new Error(`dataset "${id}" is defined twice`);
      for (const k of ['rows', 'columns']) if (!spec[k]) throw new Error(`dataset "${id}" has no "${k}"`);
      SPECS[id] = Object.assign({ id, highlights: {}, views: {}, metrics: [] }, spec);
    },
    spec(id) {
      const s = SPECS[id];
      if (!s) throw new Error(`No dataset "${id}" — is figures/datasets/${id}.js present?`);
      return s;
    },
    /** The rows of a dataset (generated once per page, then cached). */
    rows(id) { return CACHE[id] || (CACHE[id] = DS.spec(id).rows()); },
    /** One column of a dataset as an array. */
    col(id, key) { return DS.rows(id).map(r => r[key]); },
    /** The value of one of a dataset's metrics. */
    metric(id, mid) {
      const m = DS.spec(id).metrics.find(x => x.id === mid);
      if (!m) throw new Error(`dataset "${id}" has no metric "${mid}"`);
      return m.value(DS.rows(id));
    },
    ids: () => Object.keys(SPECS),
    views: {},
    card,
  };

  /* ------------------------------------------------------------------
     Built-in views. Each factory returns { label, draw(box, ctx) }.
     ctx = { rows, idx (row → its position), hl: {label, test} | null,
             sel: {label, test} | null, select(sel), marks: [{label, value, key}] }
     A mark (a metric listed in marks=) is drawn as a rule on whichever axis shows its column.
     ------------------------------------------------------------------ */
  const isHl = (ctx, r) => !!(ctx.hl && ctx.hl.test(r));
  const isSel = (ctx, r) => !!(ctx.sel && ctx.sel.test(r));

  function drawMarks(P, ctx, axis, key) {
    ctx.marks.filter(m => m.key === key).forEach(m => rule(P, { [axis]: m.value, label: `${m.label}: ${fmt(m.value)}`, color: 'var(--ink-2)' }));
  }

  /** Brush: drag across the plot to select an x range (or a box with xy: true). */
  function brush(P, ctx, { xy = false, label, test }) {
    const hit = el('rect', { x: P.m.l, y: P.m.t, width: P.pw, height: P.ph, class: 'hit ds-brush-hit' }, P.g.bg);
    const box = el('rect', { class: 'ds-brush', style: `fill:${tint('var(--c)', 14)};stroke:var(--c)`, visibility: 'hidden' }, P.g.top);
    let a = null;
    const span = (p, q) => [Math.min(p, q), Math.max(p, q)];
    hit.addEventListener('pointerdown', e => {
      a = P.toData(e);
      hit.setPointerCapture(e.pointerId);
    });
    hit.addEventListener('pointermove', e => {
      if (!a) return;
      const b = P.toData(e);
      const [x0, x1] = span(P.x(a[0]), P.x(b[0]));
      const [y0, y1] = xy ? span(P.y(a[1]), P.y(b[1])) : [P.m.t, P.m.t + P.ph];
      Object.entries({ x: x0, y: y0, width: x1 - x0, height: y1 - y0, visibility: 'visible' }).forEach(([k, v]) => box.setAttribute(k, v));
    });
    hit.addEventListener('pointerup', e => {
      if (!a) return;
      const b = P.toData(e);
      const [x0, x1] = span(a[0], b[0]), [y0, y1] = span(a[1], b[1]);
      a = null;
      box.setAttribute('visibility', 'hidden');
      if (Math.abs(P.x(x1) - P.x(x0)) < 4) { ctx.select(null); return; }
      ctx.select({ label: label(x0, x1, y0, y1), test: r => test(r, x0, x1, y0, y1) });
    });
  }

  /** Histogram of a numeric column; click a bar to select that bin. */
  DS.views.histogram = (o) => ({
    label: o.label || 'Histogram',
    note: o.note, highlights: o.highlights, legend: o.legend,
    draw(box, ctx) {
      const bin = o.bin || 1, vals = ctx.rows.map(r => r[o.key]);
      const lo = o.domain ? o.domain[0] : Math.floor(Math.min(...vals) / bin) * bin;
      const hi = o.domain ? o.domain[1] : Math.floor(Math.max(...vals) / bin) * bin + bin;
      const nb = Math.round((hi - lo) / bin);
      const bins = range(nb).map(i => ({ a: lo + i * bin, n: 0, hl: 0, sel: 0 }));
      ctx.rows.forEach(r => {
        const b = bins[clamp(Math.floor((r[o.key] - lo) / bin), 0, nb - 1)];
        b.n++; if (isHl(ctx, r)) b.hl++; if (isSel(ctx, r)) b.sel++;
      });
      const top = Math.max(...bins.map(b => b.n)) * 1.1 || 1;
      const unit = o.unit ? ' ' + o.unit : '';
      const name = b => (bin === 1 ? `${fmt(b.a)}${unit}` : `${fmt(b.a)}–${fmt(b.a + bin)}${unit}`);
      const P = Plot(box, { x: [lo - bin / 2, hi - bin / 2], y: [0, top], h: o.h || 260, xlabel: o.xlabel, ylabel: o.ylabel || 'rows', grid: 'y', xticks: o.xticks, label: o.title || `Histogram of ${o.xlabel}` });
      const N = ctx.rows.length;
      bins.forEach(b => {
        if (!b.n) return;
        const x0 = P.x(b.a - bin * 0.42), x1 = P.x(b.a + bin * 0.42), w = Math.max(1, x1 - x0);
        const g = el('g', { class: 'ds-bar', tabindex: 0, role: 'button', 'aria-label': `${name(b)}: ${b.n}` }, P.g.data);
        const dim = ctx.sel && !b.sel ? 35 : 100;
        el('rect', { x: x0, width: w, y: P.y(b.n), height: P.y(0) - P.y(b.n), style: `fill:${tint(BASE, dim * 0.85)}` }, g);
        if (b.hl) el('rect', { x: x0, width: w, y: P.y(b.hl), height: P.y(0) - P.y(b.hl), style: `fill:${tint(HL, dim)}` }, g);
        if (b.sel && ctx.sel) el('rect', { x: x0 - 1, width: w + 2, y: P.y(b.n) - 1, height: P.y(0) - P.y(b.n) + 1, style: 'fill:none;stroke:var(--c);stroke-width:1.5' }, g);
        hover(g, () => `<b>${name(b)}</b><br>${count(b.n)} ${o.noun || 'rows'} (${fmtPct(b.n / N, 1)})${b.hl ? `<br>${count(b.hl)} of them ${ctx.hl.label}` : ''}<br><span class="small">click to select</span>`);
        const pick = () => ctx.select({ label: `${o.xlabel} ${bin === 1 ? '= ' + name(b) : 'in ' + name(b)}`, test: r => r[o.key] >= b.a && r[o.key] < b.a + bin });
        g.addEventListener('click', pick);
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });
      drawMarks(P, ctx, 'x', o.key);
      if (o.after) o.after(P, ctx);
    },
  });

  /** Line through the rows in order (x defaults to the row position); highlighted rows get dots; drag to select a stretch. */
  DS.views.timeline = (o) => ({
    label: o.label || 'Timeline',
    note: o.note, highlights: o.highlights, legend: o.legend,
    draw(box, ctx) {
      const X = r => (o.x ? r[o.x] : ctx.idx.get(r)), Y = r => r[o.y];
      const xs = ctx.rows.map(X), ys = ctx.rows.map(Y);
      const [ylo, yhi] = o.ydomain || (() => { const [a, b] = extent(ys), pad = (b - a) * 0.08 || 1; return [Math.min(0, a) === 0 && a >= 0 && o.zero !== false ? 0 : a - pad, b + pad]; })();
      const P = Plot(box, { x: o.xdomain || extent(xs), y: [ylo, yhi], h: o.h || 250, xlabel: o.xlabel || 'row', ylabel: o.ylabel, xfmt: o.xtfmt, xticks: o.xticks, yticks: o.yticks, label: o.title || `${o.ylabel} over time` });
      const pts = ctx.rows.map(r => [X(r), Y(r)]);
      line(P, pts, { color: ctx.sel ? tint(BASE, 45) : BASE, width: o.width || 1.4, curve: o.curve, name: o.ylabel });
      if (ctx.sel) {
        const sp = ctx.rows.map(r => (isSel(ctx, r) ? [X(r), Y(r)] : [X(r), NaN]));
        line(P, sp, { color: SEL, width: (o.width || 1.4) + 1, curve: o.curve });
      }
      if (ctx.hl) ctx.rows.filter(r => isHl(ctx, r)).forEach(r => dot(P.g.data, P.x(X(r)), P.y(Y(r)), 3.2 * P.fs, HL));
      drawMarks(P, ctx, 'y', o.y);
      if (o.after) o.after(P, ctx);
      brush(P, ctx, {
        label: (a, b) => `${o.xlabel || 'row'} ${o.xfmt ? o.xfmt(a) : fmt(a, 0)} to ${o.xfmt ? o.xfmt(b) : fmt(b, 0)}`,
        test: (r, a, b) => X(r) >= a && X(r) <= b,
      });
      crosshair(P, { xname: o.xname || o.xlabel || 'row', xfmt: o.xfmt || (v => fmt(v, 0)), yfmt: o.yfmt || (v => fmt(v, 2)) });
    },
  });

  /** Scatter of two columns; optional colour by a category column; drag a box to select. */
  DS.views.scatter = (o) => ({
    label: o.label || 'Scatter',
    note: o.note, highlights: o.highlights, legend: o.legend,
    draw(box, ctx) {
      const pad = ([a, b]) => { const p = (b - a) * 0.08 || 1; return [a - p, b + p]; };
      const P = Plot(box, { x: o.xdomain || pad(extent(ctx.rows.map(r => r[o.x]))), y: o.ydomain || pad(extent(ctx.rows.map(r => r[o.y]))), h: o.h || 300, equal: o.equal, xlabel: o.xlabel, ylabel: o.ylabel, label: o.title || `${o.ylabel} against ${o.xlabel}` });
      const cats = o.color ? [...new Set(ctx.rows.map(r => r[o.color]))] : [];
      if (cats.length > 1) box.before(legend(cats.map((c, i) => [o.catLabel ? o.catLabel(c) : String(c), series(o.catSeries ? o.catSeries(c, i) : i), 'dot'])));
      const r0 = (o.r || 3) * P.fs;
      ctx.rows.forEach(r => {
        const ci = cats.indexOf(r[o.color]);
        const col = isHl(ctx, r) ? HL : cats.length > 1 ? series(o.catSeries ? o.catSeries(r[o.color], ci) : ci) : BASE;
        const c = dot(P.g.data, P.x(r[o.x]), P.y(r[o.y]), isSel(ctx, r) ? r0 * 1.5 : r0, ctx.sel && !isSel(ctx, r) ? tint(col, 30) : col);
        if (o.tip) hover(c, () => o.tip(r, ctx.idx.get(r)));
      });
      drawMarks(P, ctx, 'x', o.x); drawMarks(P, ctx, 'y', o.y);
      if (o.after) o.after(P, ctx);
      brush(P, ctx, {
        xy: true,
        label: (a, b, c, d) => `${o.xlabel} ${fmt(a, 1)}…${fmt(b, 1)}, ${o.ylabel} ${fmt(c, 1)}…${fmt(d, 1)}`,
        test: (r, a, b, c, d) => r[o.x] >= a && r[o.x] <= b && r[o.y] >= c && r[o.y] <= d,
      });
    },
  });

  /** Counts per category (bars); click a bar to select the category. */
  DS.views.categories = (o) => ({
    label: o.label || 'Counts',
    note: o.note, highlights: o.highlights, legend: o.legend,
    draw(box, ctx) {
      const cats = o.order || [...new Set(ctx.rows.map(r => r[o.key]))];
      const n = cats.map(c => ctx.rows.filter(r => r[o.key] === c).length);
      const N = ctx.rows.length;
      const names = cats.map(c => (o.catLabel ? o.catLabel(c) : String(c)));
      const P = Plot(box, { xcats: names, y: [0, Math.max(...n) * 1.15], h: o.h || 240, ylabel: o.ylabel || 'rows', grid: 'y', label: o.title || `Counts of ${o.key}` });
      const selC = ctx.sel && ctx.sel.cat;
      bars(P, n, {
        colors: (i) => { const c = o.catSeries ? series(o.catSeries(cats[i], i)) : BASE; return selC != null && cats[i] !== selC ? tint(c, 35) : c; },
        labels: (v) => (v ? `${count(v)} · ${fmtPct(v / N, 0)}` : ''),
        tip: (v, i) => `<b>${names[i]}</b><br>${count(v)} ${o.noun || 'rows'} (${fmtPct(v / N, 1)})<br><span class="small">click to select</span>`,
      });
      P.g.data.querySelectorAll('.bar').forEach((b, i) => {
        b.style.cursor = 'pointer';
        b.addEventListener('click', () => ctx.select({ label: `${o.xlabel || o.key} = ${names[i]}`, cat: cats[i], test: r => r[o.key] === cats[i] }));
      });
      if (o.after) o.after(P, ctx);
    },
  });

  /* ------------------------------------------------------------------
     The card
     ------------------------------------------------------------------ */
  const TABS = [['plot', 'Plot'], ['table', 'Table'], ['numbers', 'Numbers'], ['code', 'Code']];
  const PAGE = 12;

  function cell(c, r) {
    const v = r[c.key];
    return c.fmt ? c.fmt(v, r) : typeof v === 'number' ? fmt(v) : v == null ? '' : esc(String(v));
  }
  function csvOf(spec, rows) {
    const keys = (spec.csvColumns || spec.columns.map(c => c.key));
    const q = v => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    return [keys.join(','), ...rows.map(r => keys.map(k => q(r[k])).join(','))].join('\n') + '\n';
  }

  function card(host, id, opts = {}) {
    const spec = DS.spec(id), rows = DS.rows(id), meta = (window.KV.datasets || {})[id] || {};
    const idx = new Map(rows.map((r, i) => [r, i]));
    const viewIds = (opts.view || Object.keys(spec.views)).filter(v => {
      if (!spec.views[v]) throw new Error(`dataset "${id}" has no view "${v}" (it has: ${Object.keys(spec.views).join(', ')})`);
      return true;
    });
    const metrics = opts.metrics ? opts.metrics.map(mid => {
      const m = spec.metrics.find(x => x.id === mid);
      if (!m) throw new Error(`dataset "${id}" has no metric "${mid}"`);
      return m;
    }) : spec.metrics;
    if (opts.hl && !spec.highlights[opts.hl]) throw new Error(`dataset "${id}" has no highlight "${opts.hl}"`);
    const marks = (opts.marks || []).map(mid => {
      const m = spec.metrics.find(x => x.id === mid);
      if (!m || !m.mark) throw new Error(`dataset "${id}": metric "${mid}" cannot be marked on a plot`);
      return { label: m.short || m.label, value: m.value(rows), key: m.mark };
    });

    const st = { tab: opts.tab || (viewIds.length ? 'plot' : 'table'), view: viewIds[0], hl: opts.hl || null, sel: null, onlyHl: false, page: 0 };
    const tabs = TABS.filter(([t]) => (t === 'plot' ? viewIds.length : t === 'numbers' ? metrics.length : t === 'code' ? spec.code : true));
    const tabBar = h('div', { class: 'ds-tabs', role: 'tablist', 'aria-label': `${meta.plain || id}: views of the data` });
    const panels = {}, built = {};
    const tabBtns = tabs.map(([t, label]) => {
      const pid = uid('dsp');
      const b = h('button', { type: 'button', role: 'tab', class: 'ds-tab', 'aria-controls': pid, 'data-tab': t, text: label });
      panels[t] = h('div', { class: `ds-panel ds-panel-${t}`, role: 'tabpanel', id: pid, hidden: true });
      b.addEventListener('click', () => show(t));
      b.addEventListener('keydown', e => {
        const k = tabs.findIndex(x => x[0] === t);
        const to = e.key === 'ArrowRight' ? k + 1 : e.key === 'ArrowLeft' ? k - 1 : null;
        if (to == null) return;
        e.preventDefault();
        const nx = tabs[(to + tabs.length) % tabs.length][0];
        show(nx);
        tabBtns.find(x => x.dataset.tab === nx).focus();
      });
      tabBar.append(b);
      return b;
    });
    const selBar = h('div', { class: 'ds-sel', hidden: true });
    host.append(tabBar, selBar, ...tabs.map(([t]) => panels[t]));

    const ctx = () => ({
      rows, idx, marks,
      hl: st.hl ? spec.highlights[st.hl] : null,
      sel: st.sel,
      select(sel) { st.sel = sel; st.page = 0; refresh(); },
    });

    function show(t) {
      st.tab = t;
      tabBtns.forEach(b => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      Object.entries(panels).forEach(([k, p]) => { p.hidden = k !== t; });
      if (!built[t]) { built[t] = true; BUILD[t](); }
      renderSel();
    }
    function refresh() {
      if (built.plot) drawPlot();
      if (built.table) drawTable();
      renderSel();
    }
    function renderSel() {
      const on = st.sel && (st.tab === 'plot' || st.tab === 'table');
      selBar.hidden = !on;
      if (!on) return;
      const n = rows.filter(st.sel.test).length;
      selBar.replaceChildren(h('span', { class: 'ds-sel-k', text: 'Selected' }), h('span', { html: `${esc(st.sel.label)} — <b>${count(n)}</b> of ${count(rows.length)} rows` }),
        st.tab === 'plot' ? btn('see them in the table', () => show('table'), { cls: 'sm' }) : btn('see them on the plot', () => show('plot'), { cls: 'sm' }),
        btn('clear', () => ctx().select(null), { cls: 'sm' }));
    }

    // ---- Plot
    let plotBox, plotCtl;
    function drawPlot() {
      plotBox.replaceChildren();
      const v = spec.views[st.view], box = h('div');
      const hs = hlSeg(v);
      if (hs) plotBox.append(controls(hs));
      plotBox.append(box);
      const c = ctx();
      if (c.hl && v.highlights && !v.highlights.includes(st.hl)) c.hl = null;   // this view does not show that highlight
      v.draw(box, c);
      if (c.hl && v.legend !== false) plotBox.append(legend([...(v.legend === 'hl' ? [] : [['all rows', BASE, 'box']]), [esc(c.hl.label), HL, v.legend === 'hl' ? 'dot' : 'box']]));
      if (v.note) plotBox.append(h('p', { class: 'fig-note', html: typeof v.note === 'function' ? v.note(ctx()) : v.note }));
    }
    // A view may list the highlights it can show (view.highlights = ['gales', …]) and turn off the
    // automatic "all rows / highlight" legend (view.legend = false) when it draws its own key.
    const hlSeg = (v) => {
      const keys = Object.keys(spec.highlights).filter(k => !v || !v.highlights || v.highlights.includes(k));
      if (!keys.length) return null;
      return h('span', { class: 'ds-ctl' }, h('span', { class: 'ds-ctl-k', text: 'highlight' }),
        seg([[null, 'none'], ...keys.map(k => [k, esc(spec.highlights[k].label)])], st.hl, v => { st.hl = v; refresh(); }, 'Highlight rows'));
    };
    const BUILD = {
      plot() {
        plotBox = h('div', { class: 'ds-plotbox' });
        const kids = [];
        if (viewIds.length > 1) kids.push(h('span', { class: 'ds-ctl' }, h('span', { class: 'ds-ctl-k', text: 'view' }), seg(viewIds.map(v => [v, esc(spec.views[v].label)]), st.view, v => { st.view = v; drawPlot(); }, 'Choose a view of the data')));
        plotCtl = kids.length ? controls(...kids) : null;
        panels.plot.append(...[plotCtl, plotBox].filter(Boolean));
        drawPlot();
      },
      table() {
        panels.table.append(h('div', { class: 'ds-tblbox' }));
        drawTable();
      },
      numbers() {
        const list = h('div', { class: 'ds-metrics' });
        metrics.forEach(m => {
          const v = m.value(rows);
          list.append(h('div', { class: 'ds-metric' },
            h('div', { class: 'ds-m-k' }, h('span', { html: texify(m.label) }), m.tex ? h('span', { class: 'ds-m-tex', html: tex(m.tex) }) : null),
            h('div', { class: 'ds-m-v', html: texify(m.fmt ? String(m.fmt(v, rows)) : fmt(v)) }),
            m.note ? h('div', { class: 'ds-m-note', html: texify(typeof m.note === 'function' ? m.note(v, rows) : m.note) }) : null));
        });
        panels.numbers.append(list);
        if (spec.numbersNote) panels.numbers.append(h('p', { class: 'fig-note', html: texify(spec.numbersNote) }));
      },
      code() {
        const csv = meta.csv || `${id}.csv`;
        const src = spec.code.replace(/\{csv\}/g, csv).replace(/^\n+|\s+$/g, '');
        const pre = h('pre', { class: 'ds-code' }, h('code', { text: src }));
        const dl = btn(`download ${esc(csv)}`, () => {
          const a = h('a', { href: URL.createObjectURL(new Blob([csvOf(spec, rows)], { type: 'text/csv' })), download: csv });
          document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
        }, { cls: 'sm' });
        const cp = btn('copy code', (e, b) => {
          (navigator.clipboard ? navigator.clipboard.writeText(src) : Promise.reject()).then(() => { b.textContent = 'copied ✓'; }, () => { b.textContent = 'select and copy'; });
          setTimeout(() => { b.textContent = 'copy code'; }, 1800);
        }, { cls: 'sm' });
        panels.code.append(controls(dl, cp), pre, h('p', { class: 'fig-note', text: `${count(rows.length)} rows. The CSV holds exactly the rows the plot and the table show; the code recomputes the Numbers tab from it.` }));
      },
    };

    // ---- Table
    function drawTable() {
      const box = panels.table.querySelector('.ds-tblbox');
      const c = ctx();
      let list = rows;
      if (st.sel) list = list.filter(st.sel.test);
      if (st.onlyHl && c.hl) list = list.filter(c.hl.test);
      const pages = Math.max(1, Math.ceil(list.length / PAGE));
      st.page = clamp(st.page, 0, pages - 1);
      const slice = list.slice(st.page * PAGE, st.page * PAGE + PAGE);
      const heads = ['#', ...spec.columns.map(col => col.label)];
      const t = table(heads, slice.map(r => ({ cls: c.hl && c.hl.test(r) ? 'hl' : null, cells: [String(idx.get(r)), ...spec.columns.map(col => ({ html: cell(col, r) }))] })),
        { left: spec.columns.map((col, i) => (col.left ? i + 1 : -1)).filter(i => i > 0) });
      const go = h('input', { type: 'number', min: 0, max: rows.length - 1, placeholder: 'row #', class: 'ds-go', 'aria-label': 'Jump to row number' });
      go.addEventListener('change', () => {
        const r = rows[clamp(Math.round(+go.value), 0, rows.length - 1)];
        st.sel = null; st.onlyHl = false;
        st.page = Math.floor(idx.get(r) / PAGE);
        drawTable(); renderSel();
        const row = box.querySelectorAll('tbody tr')[idx.get(r) % PAGE];
        if (row) row.classList.add('ds-jump');
      });
      const kids = [
        btn('‹', () => { st.page--; drawTable(); }, { cls: 'sm', title: 'previous rows' }),
        h('span', { class: 'ds-pg', text: `rows ${count(list.length ? st.page * PAGE + 1 : 0)}–${count(Math.min(list.length, st.page * PAGE + PAGE))} of ${count(list.length)}` }),
        btn('›', () => { st.page++; drawTable(); }, { cls: 'sm', title: 'next rows' }),
        go,
      ];
      if (c.hl) kids.push(btn(`only ${esc(c.hl.label)}`, (e, b) => { st.onlyHl = !st.onlyHl; st.page = 0; drawTable(); }, { cls: 'sm', pressed: st.onlyHl }));
      else if (Object.keys(spec.highlights).length) kids.push(hlSeg());
      box.replaceChildren(controls(...kids), t);
      const [prev, , next] = kids;
      prev.disabled = st.page === 0; next.disabled = st.page >= pages - 1;
    }

    show(tabs.find(t => t[0] === st.tab) ? st.tab : tabs[0][0]);
    return { show, select: s => ctx().select(s) };
  }

  window.DS = DS;

  // The builder behind  ::: dataset fig-x <id> …  (data-ds and data-opts are written by the build).
  window.FIG = window.FIG || {};
  FIG.dataset = (host, figure) => { card(host, figure.dataset.ds, JSON.parse(figure.dataset.opts || '{}')); };
})();
