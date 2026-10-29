// Two runs of the toy indexer of IV.10 ("Lucky Louis, block by block"), with and without heavy blocks.
// One layer: 4,096 positions in 32 blocks of 128, k = 64 selections per step, a HiSparse-style LRU hot cache of
// B = 128 slots, a dictionary cache of n_D = 4 shelves with the toy residency rule of IV.4. Each step keeps 85 % of
// the previous picks (the Lucky Louis part); new picks come, with probability `conc`, from three "topic" blocks that
// are replaced after 100 steps on average, else from anywhere. 320 steps, the first 50 discarded as warm-up.
//   heavy     — conc = 0.8 (the default of Plate IV.10·1)
//   scattered — conc = 0: the same Lucky Louis, no heavy blocks.
// The simulator is shared with FIG.heavyBlocks (figures/idea.js) through helpers, so the figure's tiles and this
// card agree. Seed 'iv10' for both runs.
(function () {
  const tint = (col, pct) => `color-mix(in srgb, ${col} ${pct}%, transparent)`;
  // keep the dictionaries of the nD blocks that own the most entries in the hot cache (ties: keep what is resident, then lower j)
  function residency(cache, b, nD, before) {
    const cnt = new Map();
    cache.forEach(p => cnt.set(Math.floor(p / b), (cnt.get(Math.floor(p / b)) || 0) + 1));
    const order = [...cnt.keys()].sort((x, y) => (cnt.get(y) - cnt.get(x)) || ((before.includes(y) ? 1 : 0) - (before.includes(x) ? 1 : 0)) || (x - y));
    return order.slice(0, nD).sort((x, y) => x - y);
  }
  function sim(o) {
    const { L = 4096, b = 128, k = 64, B = 128, stay = 0.85, nhot = 3, steps = 320, warm = 50, conc, life, nD, seed = 'iv10', record = false } = o;
    const r = rng(seed), nb = L / b;
    const hot = range(nhot).map(() => r.int(nb));
    const draw = () => (r() < conc ? hot[r.int(nhot)] * b + r.int(b) : r.int(L));
    let S = new Set();
    while (S.size < k) S.add(draw());
    const cache = [];                                   // oldest first
    let dc = [], raw = 0, del = 0, loads = 0, hitN = 0;
    const perBlock = new Array(nb).fill(0), marks = [], log = [];
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < nhot; i++) if (r() < 1 / life) hot[i] = r.int(nb);
      const S2 = new Set([...S].filter(() => r() < stay));
      while (S2.size < k) S2.add(draw());
      S = S2;
      const Sl = [...S].sort((x, y) => x - y);
      const inCache = new Set(cache);
      const hits = Sl.filter(p => inCache.has(p)), misses = Sl.filter(p => !inCache.has(p));
      const sel = [];
      let sd = 0, sr = 0;
      for (const p of misses) {
        if (cache.length >= B) { const v = cache.findIndex(x => !S.has(x)); cache.splice(v, 1); }
        cache.push(p);
        const j = Math.floor(p / b), isDelta = dc.includes(j);
        if (isDelta) sd++; else sr++;
        if (s >= warm) { perBlock[j]++; if (isDelta) del++; else raw++; }
        if (s >= warm && s < warm + 120) marks.push([s, p, isDelta ? 1 : 2]);
        if (record) sel.push([p, isDelta ? 1 : 2]);
      }
      for (const p of hits) { cache.splice(cache.indexOf(p), 1); cache.push(p); if (s >= warm && s < warm + 120) marks.push([s, p, 0]); if (record) sel.push([p, 0]); }
      const after = residency(cache, b, nD, dc);
      const nl = after.filter(j => !dc.includes(j)).length;
      if (s >= warm) { loads += nl; hitN += hits.length; }
      if (record && s >= warm) log.push({ step: s, hits: hits.length, delta: sd, raw: sr, loads: nl, shelf: after.join(' · '), sel });
      dc = after;
    }
    const n = steps - warm, missTot = raw + del;
    const sorted = perBlock.slice().sort((x, y) => y - x);
    return { fD: del / missTot, loads: loads / n, missPerStep: missTot / n, hit: hitN / (n * k), top4: sum(sorted.slice(0, 4)) / missTot, perBlock, marks, log, nb, b, L, warm, k };
  }
  const WORLDS = [
    { id: 'heavy', name: 'with heavy blocks', conc: 0.8 },
    { id: 'scattered', name: 'no heavy blocks', conc: 0 },
  ];
  const PARAMS = { life: 100, nD: 4 };
  const KIND = ['var(--ink-3)', 'var(--t-delta-miss)', 'var(--t-raw-miss)'];

  // per-world summaries from the rows
  const of = (rows, w) => rows.filter(r => r.world === w);
  const fD = rs => sum(rs.map(r => r.delta)) / sum(rs.map(r => r.delta + r.raw));
  const hitRate = rs => sum(rs.map(r => r.hits)) / (64 * rs.length);
  const loadsPer = rs => sum(rs.map(r => r.loads)) / rs.length;
  const perBlock = rs => { const c = new Array(32).fill(0); rs.forEach(r => r.sel.forEach(([p, k]) => { if (k) c[Math.floor(p / 128)]++; })); return c; };
  const top4 = rs => { const c = perBlock(rs).sort((x, y) => y - x); return sum(c.slice(0, 4)) / sum(c); };
  const both = (f, d) => rows => WORLDS.map(w => f(of(rows, w.id)));
  const pair = (d, pctFmt) => v => `${pctFmt ? fmtPct(v[0], 0) : fmt(v[0], d)} with heavy blocks · ${pctFmt ? fmtPct(v[1], 0) : fmt(v[1], d)} without`;

  function stepBrush(P, ctx) {
    const hit = el('rect', { x: P.m.l, y: P.m.t, width: P.pw, height: P.ph, class: 'hit ds-brush-hit', style: 'fill:transparent' }, P.g.top);
    const band = el('rect', { y: P.m.t, height: P.ph, visibility: 'hidden', style: 'fill:color-mix(in srgb, var(--c) 14%, transparent);stroke:var(--c)' }, P.g.top);
    let a = null;
    const at = e => Math.round(P.toData(e)[0]);
    hit.addEventListener('pointerdown', e => { a = at(e); hit.setPointerCapture(e.pointerId); });
    hit.addEventListener('pointermove', e => { if (a == null) return; const i = at(e); band.setAttribute('x', P.x(Math.min(a, i) - 0.5)); band.setAttribute('width', Math.abs(P.x(i) - P.x(a)) + P.x(1) - P.x(0)); band.setAttribute('visibility', 'visible'); });
    hit.addEventListener('pointerup', e => {
      if (a == null) return;
      const i = at(e), [x0, x1] = [Math.min(a, i), Math.max(a, i)];
      a = null; band.setAttribute('visibility', 'hidden');
      if (x1 - x0 < 1) { ctx.select(null); return; }
      ctx.select({ label: `steps ${x0} to ${x1}`, test: r => r.step >= x0 && r.step <= x1 });
    });
    return hit;
  }

  const raster = {
    label: 'Where the selections land',
    legend: false,
    draw(box, ctx) {
      box.append(legend([['hit', 'var(--ink-3)', 'box'], ['δ-miss', 'var(--t-delta-miss)', 'box'], ['raw miss', 'var(--t-raw-miss)', 'box']]
        .concat(ctx.hl ? [[esc(ctx.hl.label), series(1), 'dot']] : [])));
      WORLDS.forEach((w, k) => {
        const rows = of(ctx.rows, w.id), last = k === WORLDS.length - 1, b = h('div');
        box.append(b);
        const P = Plot(b, {
          x: [49.5, 319.5], y: [0, 4096], h: last ? 200 : 170, m: { l: 50, r: 10, t: 22, b: last ? 38 : 8 }, grid: false,
          xticks: last ? [50, 100, 150, 200, 250, 300] : [], yticks: [0, 2048, 4096], yfmt: v => fmt(v, 0),
          xlabel: last ? 'decode step' : '', ylabel: 'position', label: `Selections at each step, ${w.name}: grey hits, green δ-misses, brown raw misses`,
        });
        for (let j = 0; j < 32; j += 2) el('rect', { x: P.m.l, width: P.pw, y: P.y((j + 1) * 128), height: P.y(j * 128) - P.y((j + 1) * 128), style: 'fill:var(--ink-3);opacity:.06' }, P.g.bg);
        const paths = ['', '', ''], dx = Math.max(0.8, (P.x(1) - P.x(0)) * 0.9), dy = Math.max(1.4, P.ph / 4096 * 12);
        rows.forEach(r => {
          if (ctx.sel && !ctx.sel.test(r)) return;
          r.sel.forEach(([p, kind]) => { paths[kind] += `M${(P.x(r.step) - dx / 2).toFixed(1)},${(P.y(p) - dy / 2).toFixed(1)}h${dx.toFixed(1)}v${dy.toFixed(1)}h${(-dx).toFixed(1)}z`; });
        });
        el('path', { d: paths[0], style: 'fill:var(--ink-3);opacity:.3' }, P.g.data);
        el('path', { d: paths[1], style: `fill:${KIND[1]}` }, P.g.data);
        el('path', { d: paths[2], style: `fill:${KIND[2]}` }, P.g.data);
        if (ctx.hl) rows.forEach(r => { if (ctx.hl.test(r)) dot(P.g.top, P.x(r.step), P.m.t - 6 * P.fs, 2.2 * P.fs, series(1)); });
        el('text', { x: P.m.l, y: P.m.t - 8 * P.fs, class: 'lbl', text: `${w.name} (concentration ${fmtPct(w.conc, 0)}): δ-miss fraction ${fmtPct(fD(rows), 0)}, hits ${fmtPct(hitRate(rows), 0)}` }, P.g.top);
        const hit = stepBrush(P, ctx);
        hover(hit, e => { const s = clamp(Math.round(P.toData(e)[0]), 50, 319), r = rows.find(q => q.step === s); return r ? `<b>step ${s}</b>, ${w.name}<br>${r.hits} hits, ${r.delta} δ-misses, ${r.raw} raw misses<br>shelf after: blocks ${r.shelf}${r.loads ? `<br>${r.loads} dictionary load${r.loads > 1 ? 's' : ''}` : ''}` : ''; });
      });
    },
  };

  // rolling shares per step: the hit rate (nearly the same in both worlds) and the δ-miss fraction (not at all)
  const ROLL = 10;
  const roll = (rs, f) => rs.map((r, i) => { const win = rs.slice(Math.max(0, i - ROLL + 1), i + 1); return [r.step, f(win)]; });
  const shares = {
    label: 'Two shares, step by step',
    legend: false,
    draw(box, ctx) {
      box.append(legend(WORLDS.map((w, i) => [w.name, i ? 'var(--ink-3)' : 'var(--t-heavy-block)', i ? 'dash' : 'line'])));
      [['hit rate (share of selections already in the hot cache)', hitRate, 'Hit rate'], ['δ-miss fraction (share of misses whose dictionary is on the shelf)', fD, 'δ-miss fraction']].forEach(([name, f, short], k) => {
        const b = h('div'); box.append(b);
        const P = Plot(b, {
          x: [50, 319], y: [0, 1], h: k ? 190 : 160, m: { l: 50, r: 12, t: 22, b: k ? 38 : 8 }, yticks: [0, 0.5, 1], yfmt: v => fmtPct(v, 0),
          xticks: k ? [50, 100, 150, 200, 250, 300] : [], xlabel: k ? 'decode step' : '', ylabel: short, label: `${name}, rolling over ${ROLL} steps, both worlds`,
        });
        if (ctx.sel) { const rs = of(ctx.rows, 'heavy').filter(ctx.sel.test); if (rs.length) el('rect', { x: P.x(rs[0].step), width: P.x(rs[rs.length - 1].step) - P.x(rs[0].step), y: P.m.t, height: P.ph, style: `fill:${tint('var(--c)', 14)}` }, P.g.bg); }
        WORLDS.forEach((w, i) => line(P, roll(of(ctx.rows, w.id), f), { color: i ? 'var(--ink-3)' : 'var(--t-heavy-block)', dash: !!i, width: 2, name: w.name }));
        el('text', { x: P.m.l, y: P.m.t - 8 * P.fs, class: 'lbl', text: name }, P.g.top);
        crosshair(P, { xname: 'step', xfmt: v => fmt(v, 0), yfmt: v => fmtPct(v, 0) });
        stepBrush(P, ctx);
      });
    },
    note: `Each line is a rolling share over the last ${ROLL} steps.`,
  };

  const blocks = {
    label: 'Misses per block',
    legend: false,
    draw(box, ctx) {
      box.append(legend(WORLDS.map((w, i) => [w.name, i ? 'var(--ink-3)' : 'var(--t-heavy-block)', 'box'])));
      const pb = WORLDS.map(w => { const rs = of(ctx.rows, w.id).filter(r => !ctx.sel || ctx.sel.test(r)); const c = perBlock(rs), t = sum(c) || 1; return c.map(v => v / t); });
      const P = Plot(box, { xcats: range(32).map(j => (j % 4 === 0 ? String(j) : '')), y: [0, Math.max(0.1, Math.ceil(Math.max(...pb.flat()) * 10) / 10)], h: 240, ylabel: 'share of misses', xlabel: 'block j', yfmt: v => fmtPct(v, 0), grid: 'y', label: 'Share of all misses that landed in each block, both worlds' });
      bars(P, range(32).map(j => [pb[0][j], pb[1][j]]), { colors: (i, j) => (j ? 'var(--ink-3)' : 'var(--t-heavy-block)'), fill: 0.9, gap: 0, tip: (v, i, j) => `<b>block ${i}</b>, ${WORLDS[j].name}<br>${fmtPct(v, 1)} of misses` });
    },
  };

  DS.define('idea-heavy', {
    rows() {
      return WORLDS.flatMap(w => sim({ conc: w.conc, ...PARAMS, record: true }).log.map(r => ({ world: w.id, ...r })));
    },
    columns: [
      { key: 'world', label: 'world', left: true, fmt: v => (v === 'heavy' ? 'heavy blocks' : 'scattered') },
      { key: 'step', label: 'step' }, { key: 'hits', label: 'hits' }, { key: 'delta', label: 'δ-misses' }, { key: 'raw', label: 'raw misses' },
      { key: 'loads', label: 'loads' }, { key: 'shelf', label: 'shelf after the step', left: true },
    ],
    highlights: { load: { label: 'a dictionary is loaded', test: r => r.loads > 0 } },
    views: { raster, shares, blocks },
    helpers: { sim, residency, WORLDS, PARAMS },
    metrics: [
      { id: 'hit', label: 'hit rate', value: both(hitRate), fmt: pair(0, true),
        note: 'Almost the same in both worlds: 85 % of picks are kept from step to step, and the hot cache catches them either way. The ordinary Lucky Louis property cannot tell the two worlds apart.' },
      { id: 'fD', label: 'δ-miss fraction', tex: '\\vfD', value: both(fD), fmt: pair(0, true),
        note: 'Here the worlds part. With heavy blocks, most misses land in a block whose dictionary is on one of the 4 shelves; scattered, a miss usually lands in one of the other 28 blocks.' },
      { id: 'loads', label: 'dictionary loads per step', value: both(loadsPer), fmt: pair(2),
        note: v => `One load every ${fmt(1 / v[0], 0)} steps with heavy blocks; scattered, the shelf changes ${fmt(v[1], 2)} times a step. Each load costs $\\vw$ raw misses of traffic.` },
      { id: 'top4', label: 'misses in the 4 busiest blocks', value: both(top4), fmt: pair(0, true),
        note: 'Four blocks of 32 would hold 12.5 % of the misses if they landed evenly. Heavy blocks are what pushes that share up.' },
      { id: 'misses', label: 'misses per step', value: both(rs => sum(rs.map(r => r.delta + r.raw)) / rs.length), fmt: pair(1),
        note: 'Of k = 64 selections. The number of misses is HiSparse’s business and barely differs; kv-blockdiff only changes what each one costs.' },
    ],
    code: `
import pandas as pd

t = pd.read_csv("{csv}")                    # one row per step and world: hits, delta, raw, loads, shelf
for world, s in t.groupby("world"):
    misses = s.delta.sum() + s.raw.sum()
    print(f"{world:9s}  hit rate {s.hits.sum() / (64 * len(s)):.0%}"
          f"  f_D {s.delta.sum() / misses:.0%}"
          f"  loads/step {s.loads.mean():.2f}"
          f"  misses/step {misses / len(s):.1f}")
`,
  });
})();
