/* =====================================================================
   figures/missed-a.js — Part VII, pages VII.2–VII.8 ("What Dima missed", the corrections).
   Builders (all prefixed "ma" so they never collide with missed-b.js on the same page):
     maWhichWhat  VII.2  same selections, different bytes (hit rate vs bits, shuffle toggle)
     maMiBars     VII.3  entropy / mutual-information bars for the cat-thread toy
     maKnob       VII.4  a property (bits vs distance) and a knob (net bits vs block size)
     maVqLedger   VII.5  2-D toy: k-means codebook vs rotation, bit ledger
     maBudgetBar  VII.6  the bits a dictionary can still win after noise
     maSpread     VII.6  same average R², spread evenly or concentrated in a few channels
     maBitFlips   VII.7  which bits a predictor cannot tell you, BF16 vs E4M3
     maGridLine   VII.7  the E4M3 grid vs the INT8 grid, residuals in grid steps
     maAccess     VII.8  bulk stream chunks vs single reads: bytes per miss path
   Toy data comes from seeded generators, so the numbers quoted in the prose are reproducible.
   ===================================================================== */
window.FIG = window.FIG || {};

(function () {
  'use strict';
  const { h, el, Plot, Diagram, line, area, rule, legend, slider, seg, btn, readout, kpi, controls,
    hover, draggable, tex, texify, fmt, fmtPct, rng, clamp, range, svgText, series, linspace, dot, annotate } = window.PK;
  const L2 = Math.log2;
  const bitsFromR2 = r2 => 0.5 * L2(1 / Math.max(1e-12, 1 - r2));

  /* ------------------------------------------------------------------ shared numerics */
  function corr2(a, b) {
    const n = a.length;
    let ma = 0, mb = 0;
    for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
    return saa > 0 && sbb > 0 ? (sab * sab) / (saa * sbb) : 0;
  }
  const entropyOf = probs => probs.reduce((s, p) => (p > 0 ? s - p * L2(p) : s), 0);

  /* ==================================================================
     VII.2  maWhichWhat — which entries are wanted vs what is inside them
     ================================================================== */
  FIG.maWhichWhat = (host) => {
    const N = 160, K = 8, B = 16, STEPS = 90, WARM = 10, SHOW = 26, DG = 16, CH = 8, A = 0.97;
    // the indexer's own small keys: they decide WHICH positions are selected
    const rk = rng('ma-which-keys');
    const G = range(N).map(() => range(DG).map(() => rk.normal()));
    // the stored bytes: CH channels per entry, drifting slowly along the tokens
    const rb = rng('ma-which-bytes');
    const ordered = range(CH).map(() => {
      let v = rb.normal();
      return range(N).map(() => { v = A * v + Math.sqrt(1 - A * A) * rb.normal(); return clamp(Math.round(v * 40), -127, 127); });
    });
    const perm = rng('ma-which-shuffle').shuffle(range(N));
    const shuffled = ordered.map(ch => perm.map(p => ch[p]));
    const bitsOf = bytes => bytes.reduce((s, ch) => s + bitsFromR2(corr2(ch.slice(1), ch.slice(0, -1))), 0) / bytes.length;
    const bitsOrdered = bitsOf(ordered), bitsShuffled = bitsOf(shuffled);

    function simulate(eta) {
      const rq = rng('ma-which-query');
      let q = range(DG).map(() => rq.normal());
      const norm = v => { const n = Math.hypot(...v); return v.map(x => x / n); };
      q = norm(q);
      let cache = [], hits = 0, tot = 0;
      const rows = [];
      for (let s = 0; s < STEPS; s++) {
        q = norm(q.map(x => x + eta * rq.normal() / Math.sqrt(DG)));
        const score = G.map(g => g.reduce((a, gi, i) => a + gi * q[i], 0));
        const S = range(N).sort((a, b) => score[b] - score[a]).slice(0, K);
        const row = S.map(p => ({ p, hit: cache.includes(p) }));
        if (s >= WARM) { hits += row.filter(x => x.hit).length; tot += K; }
        rows.push(row);
        cache = S.concat(cache.filter(p => !S.includes(p))).slice(0, B);
      }
      return { rows: rows.slice(-SHOW), rate: hits / tot };
    }

    let eta = 0.3, mode = 'ordered';
    const tiles = {
      hit: kpi('LRU hit rate', '', '<i>which</i>: a fact about the query', series(0)),
      bits: kpi('bits saved per element', '', '<i>what</i>: given the previous entry', series(2)),
    };
    const sl = slider(texify('query drift per step'), 0.05, 3, 0.05, eta, v => { eta = v; draw(); }, v => fmt(v, 2));
    const sw = seg([['ordered', 'bytes in token order'], ['shuffled', 'bytes shuffled']], mode, v => { mode = v; draw(); }, 'stored bytes');
    const box = h('div');
    host.append(controls(sl, sw),
      legend([['selected, found in the cache (hit)', series(0), 'box'], ['selected, not in the cache (miss)', series(1), 'box'], ['stored value above zero', series(2), 'box'], ['below zero', series(3), 'box']]),
      box, h('div', { class: 'kpis' }, tiles.hit, tiles.bits));

    const W = 640, x0 = 56, x1 = 626, cw = (x1 - x0) / N;
    const D = Diagram(box, { w: W, h: 330, label: 'Selections per step above, stored bytes below, same token positions', grow: 0.3 });
    const f = D.fs, rowH = 6.2, top = 24 * f;
    const gSel = el('g', {}, D.svg), gNow = el('g', {}, D.svg), gBytes = el('g', {}, D.svg);
    svgText(D.svg, x0, 14 * f, 'which positions the indexer selects (last 26 steps, newest at the bottom)', { class: 'lbl' });
    const yBytes = top + SHOW * rowH + 30 * f;
    const cellH = (D.H - yBytes - 22 * f) / CH;
    svgText(D.svg, x0, yBytes - 8 * f, 'what is stored there: 8 channels per entry', { class: 'lbl' });
    svgText(D.svg, x0, D.H - 6 * f, 'token position 0', { class: 'lbl' });
    svgText(D.svg, x1, D.H - 6 * f, String(N - 1), { class: 'lbl', 'text-anchor': 'end' });
    svgText(D.svg, x0 - 6 * f, top + 8, 'steps', { class: 'lbl', 'text-anchor': 'end' });

    function drawBytes() {
      gBytes.replaceChildren();
      const bytes = mode === 'ordered' ? ordered : shuffled;
      bytes.forEach((ch, c) => ch.forEach((v, t) => {
        const a = Math.min(100, Math.round(Math.abs(v) / 1.1));
        el('rect', { x: x0 + t * cw, y: yBytes + c * cellH, width: cw + 0.3, height: cellH + 0.3,
          style: `fill:color-mix(in srgb, ${v >= 0 ? series(2) : series(3)} ${a}%, var(--paper))` }, gBytes);
      }));
    }
    function draw() {
      const sim = simulate(eta);
      gSel.replaceChildren(); gNow.replaceChildren();
      sim.rows.forEach((row, s) => row.forEach(({ p, hit }) => {
        el('rect', { x: x0 + p * cw, y: top + s * rowH, width: Math.max(1.5, cw - 0.4), height: rowH - 1.2,
          style: `fill:${hit ? series(0) : series(1)}` }, gSel);
      }));
      // the newest step's selections, carried down to the bytes they fetch
      sim.rows[sim.rows.length - 1].forEach(({ p }) => {
        el('line', { x1: x0 + (p + 0.5) * cw, x2: x0 + (p + 0.5) * cw, y1: top + SHOW * rowH, y2: yBytes - 2,
          style: 'stroke:var(--ink-3);stroke-width:1;stroke-dasharray:2 2' }, gNow);
      });
      drawBytes();
      const bits = mode === 'ordered' ? bitsOrdered : bitsShuffled;
      tiles.hit.set(fmtPct(sim.rate, 0), `query drift ${fmt(eta, 2)} per step`);
      tiles.bits.set(fmt(Math.max(0, bits), 2), mode === 'ordered' ? 'bytes in token order' : 'same bytes, shuffled positions');
    }
    draw();
  };

  /* ==================================================================
     VII.3  maMiBars — the cat-thread toy as bars that cannot be read backwards
     ================================================================== */
  FIG.maMiBars = (host) => {
    // X: one element's level (a, b, c, d); thread: cat / dog; breed: Maine Coon, Siamese (cat), beagle, poodle (dog).
    // Each breed favours one level with strength s: P(X | breed) = (1-s)/4 + s·[X = the breed's level].
    let s = 0.5;
    function model(s) {
      const breed = range(4).map(z => range(4).map(x => (1 - s) / 4 + (x === z ? s : 0)));
      const thread = [0, 1].map(t => range(4).map(x => (breed[2 * t][x] + breed[2 * t + 1][x]) / 2));
      const HX = 2;
      const Ht = (entropyOf(thread[0]) + entropyOf(thread[1])) / 2;
      const Hz = breed.reduce((a, r) => a + entropyOf(r), 0) / 4;
      return { breed, thread, HX, Ht, Hz };
    }
    const sl = slider('strength of the breed', 0, 1, 0.01, s, v => { s = v; draw(); }, v => fmt(v, 2));
    const box = h('div'), tbl = h('div', { class: 'ma-mi-tbl' });
    host.append(controls(sl),
      legend([['bits still to pay: conditional entropy', 'var(--vermilion)', 'box'], ['bits saved: mutual information', 'var(--emerald)', 'band']]),
      box, tbl);
    const D = Diagram(box, { w: 640, h: 210, label: 'Three stacked bars: bits still to pay and bits saved at each rung', grow: 0.4 });
    const f = D.fs, X0 = 150, X1 = 610, sc = (X1 - X0) / 2;
    const g = el('g', {}, D.svg);
    const pat = window.PK.uid('ma-hatch');
    const p = el('pattern', { id: pat, width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, D.defs);
    el('rect', { width: 7, height: 7, style: 'fill:color-mix(in srgb, var(--emerald) 22%, var(--paper))' }, p);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 7, style: 'stroke:var(--emerald);stroke-width:3' }, p);
    function draw() {
      const m = model(s);
      g.replaceChildren();
      const rows = [['nothing known', m.HX], ['thread known', m.Ht], ['breed known', m.Hz]];
      const bh = 34 * f, gap = (D.H - 30 * f - 3 * bh) / 3;
      rows.forEach(([name, Hc], i) => {
        const y = 10 * f + i * (bh + gap);
        svgText(g, X0 - 10 * f, y + bh / 2 + 4 * f, name, { class: 'lbl', 'text-anchor': 'end' });
        el('rect', { x: X0, y, width: Math.max(0.5, Hc * sc), height: bh, rx: 4, style: 'fill:var(--vermilion)' }, g);
        el('rect', { x: X0 + Hc * sc, y, width: Math.max(0, (m.HX - Hc) * sc), height: bh, rx: 4, style: `fill:url(#${pat});stroke:var(--emerald);stroke-width:1` }, g);
        if (Hc * sc > 70 * f) svgText(g, X0 + 8 * f, y + bh / 2 + 4 * f, `pay ${fmt(Hc, 2)}`, { class: 'ma-intext' });
        if ((m.HX - Hc) * sc > 78 * f) svgText(g, X0 + Hc * sc + 8 * f, y + bh / 2 + 4 * f, `saved ${fmt(m.HX - Hc, 2)}`, { class: 'val' });
      });
      const ya = D.H - 6 * f;
      [0, 0.5, 1, 1.5, 2].forEach(v => {
        el('line', { x1: X0 + v * sc, x2: X0 + v * sc, y1: ya - 12 * f, y2: ya - 16 * f, style: 'stroke:var(--ink-3)' }, g);
        svgText(g, X0 + v * sc, ya, `${v} bit${v === 1 ? '' : 's'}`, { class: 'lbl', 'text-anchor': 'middle' });
      });
      // two single outcomes: a typical one and a rare one, both inside a Maine Coon block
      const sup = q => (q > 0 ? fmt(-L2(q), 2) + ' bits' : '∞');
      const typ = [0.25, m.thread[0][0], m.breed[0][0]], rare = [0.25, m.thread[0][3], m.breed[0][3]];
      tbl.replaceChildren(window.PK.table(['one entry of a Maine Coon block', 'nothing known', 'thread known', 'breed known'], [
        ['typical value <b>a</b> (the breed’s own level)', ...typ.map(sup)],
        ['rare value <b>d</b> (a poodle’s level)', ...rare.map(sup)],
        { cells: ['average over all values: the entropy', ...[m.HX, m.Ht, m.Hz].map(v => `${fmt(v, 2)} bits`)], cls: 'sum' },
      ], { left: [0] }));
    }
    draw();
  };

  /* ==================================================================
     VII.4  maKnob — the property (a curve over distance) and the knob (block size)
     ================================================================== */
  FIG.maKnob = (host) => {
    const SD = 0.6, L = 100384;                       // drift share of the variance; a 100K-token request
    const fOU = x => (x < 1e-6 ? 1 - x / 3 : (2 / (x * x)) * (x - 1 + Math.exp(-x)));   // variance of a block mean / variance of the drift
    const gNeighbour = (D, ell) => bitsFromR2(Math.pow(SD * Math.exp(-D / ell), 2));
    const gBlock = (b, ell) => bitsFromR2(SD * fOU(b / ell));
    const tax = (b, w) => (8 * w) / b;
    let logEll = 11, w = 2, b = 1024;
    const ell = () => Math.pow(2, logEll);
    const net = (bb) => gBlock(bb, ell()) - tax(bb, w);
    function best() {
      let bb = 8, bv = -Infinity;
      for (let e = 3; e <= 17; e += 0.01) { const v = net(Math.pow(2, e)); if (v > bv) { bv = v; bb = Math.pow(2, e); } }
      return [bb, bv];
    }
    const kfmt = v => (v >= 1024 ? `${fmt(v / 1024, v >= 10240 ? 0 : 1)}K` : fmt(v, 0));
    const sl = slider('drift length of the data (tokens)', 6, 16, 0.25, logEll, v => { logEll = v; draw(); }, v => kfmt(Math.pow(2, v)));
    const sw = seg([[2, 'w = 2 (loc)'], [32, 'w = 32 (rank-16 basis)'], [256, 'w = 256 (codebook)']], w, v => { w = v; draw(); }, 'dictionary weight');
    const boxA = h('div'), boxB = h('div'), ro = readout();
    host.append(controls(sl, sw),
      h('div', { class: 'ma-panel-t', text: 'A · the property: bits a single neighbour saves, against its token distance' }), boxA,
      h('div', { class: 'ma-panel-t', text: 'B · the knob: net bits a per-block dictionary saves, against the block size we choose' }),
      legend([['gain of the block dictionary', series(2), 'dash'], ['net = gain − dictionary cost 8w/b', series(0)], ['best block size (ring) · your choice (knob)', 'var(--ink)', 'dot']]),
      boxB, ro);
    const xfmt = v => kfmt(v);
    const PA = Plot(boxA, { x: [1, 131072], xlog: 2, y: [0, 0.4], h: 220, xticks: [1, 16, 256, 4096, 65536], xfmt, xlabel: 'token distance Δ to the neighbour', ylabel: 'bits saved', label: 'Bits saved by a neighbour against token distance' });
    const PB = Plot(boxB, { x: [16, 131072], xlog: 2, y: [-0.4, 0.75], h: 280, xticks: [16, 64, 256, 1024, 4096, 16384, 65536], xfmt, xlabel: 'block size b (tokens)', ylabel: 'bits saved per element', label: 'Net bits saved against block size' });
    const knob = el('circle', { class: 'handle', r: 7 * PB.fs }, PB.g.top);
    draggable(knob, PB, ([x]) => { b = clamp(Math.round(x), 16, 131072); draw(); }, null,
      { get: () => [b, net(b)], step: [0, 0], label: 'block size b' });
    knob.addEventListener('keydown', e => {           // arrow keys move the knob by a quarter octave
      const d = { ArrowLeft: -0.25, ArrowRight: 0.25 }[e.key];
      if (!d) return;
      b = clamp(Math.round(b * Math.pow(2, d * (e.shiftKey ? 4 : 1))), 16, 131072); draw();
    });
    hover(knob, () => `<b>b = ${fmt(b, 0)} tokens</b><br>gain ${fmt(gBlock(b, ell()), 2)} − cost ${fmt(tax(b, w), 3)} = ${fmt(net(b), 2)} bits`);
    function draw() {
      const E = ell(), [bb, bv] = best();
      PA.clear(); PB.clear('data');
      [...PB.g.top.children].forEach(n => { if (n !== knob) n.remove(); });
      const ds = linspace(0, 17, 180).map(e => Math.pow(2, e));
      area(PA, ds.filter(d => d <= b).map(d => [d, gNeighbour(d, E)]), { color: 'var(--c)', opacity: 0.16 });
      line(PA, ds.map(d => [d, gNeighbour(d, E)]), { color: series(3) });
      rule(PA, { x: E, label: 'drift length' });
      annotate(PA, Math.min(b, 65536), gNeighbour(Math.min(b, 65536), E), `distances inside\none block of ${kfmt(b)}`, { dx: 30, dy: -34 });
      const bs = linspace(4, 17, 200).map(e => Math.pow(2, e));
      area(PB, [[L, -0.4], [131072, -0.4]].map(([x, y]) => [x, y, 0.75]), { color: 'var(--ink-3)', opacity: 0.12 });
      rule(PB, { y: 0, dash: false, color: 'var(--ink-3)' });
      line(PB, bs.map(x => [x, gBlock(x, E)]), { color: series(2), dash: true });
      line(PB, bs.map(x => [x, net(x)]), { color: series(0) });
      rule(PB, { x: L, label: 'a 100K-token request:\nbeyond, b is the request' });
      if (bv > 0) el('circle', { cx: PB.x(bb), cy: PB.y(bv), r: 5.5 * PB.fs, style: 'fill:var(--paper-3);stroke:var(--ink);stroke-width:2' }, PB.g.top);
      knob.setAttribute('cx', PB.x(b)); knob.setAttribute('cy', PB.y(clamp(net(b), -0.4, 0.75)));
      ro.set([
        ['b', `${fmt(b, 0)} tokens`],
        ['gain', `${fmt(gBlock(b, E), 2)} bits`],
        ['cost 8w/b', `${fmt(tax(b, w), 3)} bits`],
        ['net', `${fmt(net(b), 2)} bits`],
        ['best b', bv > 0 ? `≈ ${fmt(bb, 0)} tokens (net ${fmt(bv, 2)})` : 'none: never pays'],
      ]);
    }
    draw();
  };

  /* ==================================================================
     VII.5  maVqLedger — codebook vs rotation on a smooth hill and on clumps
     ================================================================== */
  FIG.maVqLedger = (host) => {
    const N = 4096, DRAW = 900, ITER = 30;
    let kind = 'hill', C = 4, seed = 1;
    function sample(kind, seed) {
      const r = rng(`ma-vq-${kind}-${seed}`);
      let pts;
      if (kind === 'hill') {                        // correlated Gaussian, correlation 0.9
        pts = range(N).map(() => { const a = r.normal(), b = r.normal(); return [a, 0.9 * a + Math.sqrt(1 - 0.81) * b]; });
      } else {                                      // 16 tight clumps scattered in an ellipse
        const ctr = [];
        while (ctr.length < 16) {
          const u = r.uniform(-1, 1), v = r.uniform(-1, 1);
          if (u * u + v * v > 1) continue;
          const c = [3.6 * u, 1.8 * v];
          if (ctr.every(q => Math.hypot(q[0] - c[0], q[1] - c[1]) >= 0.9)) ctr.push(c);
        }
        pts = range(N).map(() => { const c = ctr[r.int(16)]; return [c[0] + 0.18 * r.normal(), c[1] + 0.18 * r.normal()]; });
      }
      // standardise the whole cloud to unit variance per element on average
      const m = [0, 1].map(j => pts.reduce((s, p) => s + p[j], 0) / N);
      const sd = Math.sqrt(pts.reduce((s, p) => s + (p[0] - m[0]) ** 2 + (p[1] - m[1]) ** 2, 0) / (2 * N));
      return pts.map(p => [(p[0] - m[0]) / sd, (p[1] - m[1]) / sd]);
    }
    function cov(pts) {
      const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
      let a = 0, b = 0, c = 0;
      pts.forEach(([x, y]) => { a += (x - mx) ** 2; b += (x - mx) * (y - my); c += (y - my) ** 2; });
      return [a / n, b / n, c / n, mx, my];
    }
    function kmeans(pts, C, seed) {
      const r = rng(`ma-km-${seed}-${C}`);
      const cen = [pts[r.int(N)].slice()];
      const d2 = pts.map(() => Infinity);
      while (cen.length < C) {                      // k-means++ seeding
        const last = cen[cen.length - 1];
        let tot = 0;
        pts.forEach((p, i) => { d2[i] = Math.min(d2[i], (p[0] - last[0]) ** 2 + (p[1] - last[1]) ** 2); tot += d2[i]; });
        let u = r() * tot, i = 0;
        while (u > d2[i] && i < N - 1) { u -= d2[i]; i++; }
        cen.push(pts[i].slice());
      }
      const lab = new Int32Array(N);
      for (let it = 0; it < ITER; it++) {
        pts.forEach((p, i) => {
          let bi = 0, bd = Infinity;
          for (let k = 0; k < C; k++) { const d = (p[0] - cen[k][0]) ** 2 + (p[1] - cen[k][1]) ** 2; if (d < bd) { bd = d; bi = k; } }
          lab[i] = bi;
        });
        const acc = range(C).map(() => [0, 0, 0]);
        pts.forEach((p, i) => { const a = acc[lab[i]]; a[0] += p[0]; a[1] += p[1]; a[2]++; });
        acc.forEach((a, k) => { if (a[2]) cen[k] = [a[0] / a[2], a[1] / a[2]]; });
      }
      return { cen, lab };
    }
    function ledger(pts, C, seed) {
      const [sxx, sxy, syy, mx, my] = cov(pts);
      const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      const l1 = tr / 2 + disc, l2 = Math.max(1e-9, tr / 2 - disc);
      const gm = v => Math.sqrt(v[0] * v[1]);
      const klt = 0.5 * L2(gm([sxx, syy]) / gm([l1, l2]));     // bell-shaped ledger: ½·log2 of variance ratios
      let best = null;                              // best of three k-means++ starts (lowest squared error)
      for (let t = 0; t < 3; t++) {
        const km = kmeans(pts, C, `${seed}-${t}`);
        km.sse = pts.reduce((s, p, i) => s + (p[0] - km.cen[km.lab[i]][0]) ** 2 + (p[1] - km.cen[km.lab[i]][1]) ** 2, 0);
        if (!best || km.sse < best.sse) best = km;
      }
      const { cen, lab } = best;
      const res = pts.map((p, i) => [p[0] - cen[lab[i]][0], p[1] - cen[lab[i]][1]]);
      const v = [res.reduce((s, q) => s + q[0] * q[0], 0) / N, res.reduce((s, q) => s + q[1] * q[1], 0) / N];
      const gross = 0.5 * L2(gm([sxx, syy]) / gm(v));
      const taxIdx = L2(C) / 2, taxBook = (8 * C) / N;
      const theta = Math.atan2(l1 - sxx, sxy || 1e-12);
      return { klt, gross, taxIdx, taxBook, net: gross - taxIdx - taxBook, cen, lab, l1, l2, theta, mx, my };
    }
    const sKind = seg([['hill', 'smooth hill (correlated bell)'], ['clumps', '16 clumps']], kind, v => { kind = v; draw(); }, 'data');
    const sC = seg([2, 4, 16, 64].map(c => [c, `C = ${c}`]), C, v => { C = v; draw(); }, 'codebook size');
    const nb = btn('New sample', () => { seed++; draw(); }, { cls: 'sm' });
    const boxS = h('div'), boxL = h('div');
    host.append(controls(sKind, sC, nb), legend([['points', 'var(--ink-3)', 'dot'], ['centroids', 'var(--c)', 'dot'], ['rotation (KLT) axes', series(4)], ['a few residuals', series(1)]]), boxS,
      h('div', { class: 'ma-panel-t', text: 'the ledger, in bits per element' }), boxL);
    const PS = Plot(boxS, { x: [-3.2, 3.2], y: [-2.6, 2.6], equal: true, h: 300, xlabel: 'element 1', ylabel: 'element 2', label: 'Scatter of the 2-D toy with centroids and rotation axes' });
    const cats = ['codebook: narrowing', 'codebook: tax', 'codebook: net', 'rotation (KLT)'];
    const PL = Plot(boxL, { ycats: cats, x: [-0.5, 4], h: 200, xlabel: 'bits per element', grid: 'x', label: 'Bit ledger: what the codebook buys, what it costs, and what a rotation gets' });
    const kpis = { net: kpi('codebook, net', '', 'bits per element', series(0)), klt: kpi('rotation, no tax', '', 'bits per element', series(4)) };
    host.append(h('div', { class: 'kpis' }, kpis.net, kpis.klt));
    const cache = {};
    function draw() {
      const key = `${kind}-${seed}`;
      const pts = cache[key] || (cache[key] = sample(kind, seed));
      const L = ledger(pts, C, seed);
      PS.clear();
      const gp = el('g', {}, PS.g.data);
      for (let i = 0; i < DRAW; i++) el('circle', { cx: PS.x(pts[i][0]), cy: PS.y(pts[i][1]), r: 1.6 * PS.fs, style: 'fill:var(--ink-3);fill-opacity:.45' }, gp);
      for (let i = 0; i < 60; i++) {
        const c = L.cen[L.lab[i]];
        el('line', { x1: PS.x(pts[i][0]), y1: PS.y(pts[i][1]), x2: PS.x(c[0]), y2: PS.y(c[1]), style: `stroke:${series(1)};stroke-width:1.2;stroke-opacity:.8` }, gp);
      }
      [[L.l1, L.theta], [L.l2, L.theta + Math.PI / 2]].forEach(([lam, th]) => {
        const s = 2 * Math.sqrt(lam), dx = s * Math.cos(th), dy = s * Math.sin(th);
        el('line', { x1: PS.x(L.mx - dx), y1: PS.y(L.my - dy), x2: PS.x(L.mx + dx), y2: PS.y(L.my + dy), style: `stroke:${series(4)};stroke-width:2.4` }, PS.g.data);
      });
      L.cen.forEach(c => dot(PS.g.top, PS.x(c[0]), PS.y(c[1]), 4.5 * PS.fs, 'var(--c)'));
      PL.clear();
      const vals = [L.gross, L.taxIdx + L.taxBook, L.net, L.klt];
      const cols = [series(2), series(1), L.net >= 0 ? series(0) : 'var(--bad)', series(4)];
      window.PK.bars(PL, vals, { horizontal: true, colors: i => cols[i], labels: v => fmt(v, 2), tip: (v, i) => `<b>${cats[i]}</b><br>${fmt(v, 3)} bits per element` });
      rule(PL, { x: 0, dash: false, color: 'var(--ink-3)' });
      kpis.net.set(fmt(L.net, 2), `${fmt(L.gross, 2)} − ${fmt(L.taxIdx + L.taxBook, 2)} tax`);
      kpis.klt.set(fmt(L.klt, 2), L.net > L.klt ? 'the codebook wins here' : 'the rotation wins here');
    }
    draw();
  };

  /* ==================================================================
     VII.6  maBudgetBar — the bits a dictionary can still win, after noise
     ================================================================== */
  FIG.maBudgetBar = (host) => {
    const RAW = 8, SOLO = 6.47;                        // E4M3, bell-shaped channel (VI.1)
    let noise = 30, expl = 50;
    const sN = slider('noise share of the variance', 1, 60, 1, noise, v => { noise = v; if (expl > 100 - noise) { expl = 100 - noise; sE.set(expl); } draw(); }, v => `${v} %`);
    const sE = slider('variance the dictionary explains', 0, 99, 1, expl, v => { expl = Math.min(v, 100 - noise); if (expl !== v) sE.set(expl); draw(); }, v => `${v} %`);
    const box = h('div'), ro = readout();
    host.append(controls(sN, sE), legend([
      ['already saved by solo coding', 'var(--ink-3)', 'box'], ['won by the dictionary', 'var(--emerald)', 'box'],
      ['still winnable', 'var(--saffron)', 'band'], ['paid no matter what (noise floor)', 'var(--vermilion)', 'box']]), box, ro);
    const D = Diagram(box, { w: 640, h: 150, label: 'One bar of 8 bits per element: what is paid, won and winnable', grow: 0.5 });
    const f = D.fs, X0 = 24, X1 = 616, sc = (X1 - X0) / RAW;
    const g = el('g', {}, D.svg);
    function draw() {
      const maxWin = bitsFromR2(1 - noise / 100), won = bitsFromR2(expl / 100);
      const floor = SOLO - maxWin, after = SOLO - won;
      g.replaceChildren();
      const y = 30 * f, bh = 44 * f;
      const seg_ = (a, b, style) => el('rect', { x: X0 + a * sc, y, width: Math.max(0, (b - a) * sc), height: bh, style }, g);
      seg_(0, floor, 'fill:var(--vermilion)');
      seg_(floor, after, 'fill:color-mix(in srgb, var(--saffron) 55%, var(--paper))');
      seg_(after, SOLO, 'fill:var(--emerald)');
      seg_(SOLO, RAW, 'fill:color-mix(in srgb, var(--ink-3) 45%, var(--paper))');
      el('rect', { x: X0, y, width: RAW * sc, height: bh, rx: 3, style: 'fill:none;stroke:var(--ink-2);stroke-width:1.2' }, g);
      [[0, '0'], [floor, `${fmt(floor, 2)}`], [SOLO, `${SOLO}`], [RAW, '8 bits']].forEach(([v, t], i) => {
        el('line', { x1: X0 + v * sc, x2: X0 + v * sc, y1: y + bh, y2: y + bh + 8 * f, style: 'stroke:var(--ink-2)' }, g);
        svgText(g, X0 + v * sc, y + bh + 22 * f, t, { class: 'val', 'text-anchor': i === 0 ? 'start' : i === 3 ? 'end' : 'middle' });
      });
      svgText(g, X0 + (floor / 2) * sc, y - 8 * f, 'noise floor', { class: 'lbl', 'text-anchor': 'middle' });
      svgText(g, X0 + ((floor + SOLO) / 2) * sc, y - 8 * f, `winnable ${fmt(maxWin, 2)}`, { class: 'lbl', 'text-anchor': 'middle' });
      svgText(g, X0 + after * sc, y + bh + 44 * f, `after the dictionary: ${fmt(after, 2)} bits per element`, { class: 'annot', 'text-anchor': after * sc > 400 ? 'end' : 'start' });
      ro.set([
        ['most a perfect dictionary can win', `${fmt(maxWin, 2)} bits`],
        ['this dictionary wins', `${fmt(won, 2)} bits`],
        ['still paid', `${fmt(after, 2)} of ${SOLO}`],
        ['vs raw 8 bits', `${fmt(RAW / after, 2)}× smaller`],
      ]);
    }
    draw();
  };

  /* ==================================================================
     VII.6  maSpread — the same average R², spread evenly or concentrated
     ================================================================== */
  FIG.maSpread = (host) => {
    const NC = 16, CAP = 0.999;
    const presets = {
      even: () => range(NC).map(() => 0.3),
      two: () => range(NC).map(i => (i < 2 ? 0.99 : (0.3 * NC - 2 * 0.99) / (NC - 2))),
      one: () => range(NC).map(i => (i < 1 ? CAP : (0.3 * NC - CAP) / (NC - 1))),
    };
    let r2 = presets.even();
    const box = h('div');
    const tiles = {
      avg: kpi('average R² over channels', '', 'what a single summary number would say', series(2)),
      bits: kpi('bits saved per element', '', 'these channels, as they are', series(0)),
      even: kpi('same average, spread evenly', '', 'bits saved per element', series(4)),
    };
    host.append(controls(
      btn('spread evenly', () => { r2 = presets.even(); draw(); }, { cls: 'sm' }),
      btn('two slow giants', () => { r2 = presets.two(); draw(); }, { cls: 'sm' }),
      btn('one giant', () => { r2 = presets.one(); draw(); }, { cls: 'sm' }),
      h('span', { class: 'fig-note', text: 'Drag a bar top, or focus it and use the arrow keys.' })),
      box, h('div', { class: 'kpis' }, tiles.avg, tiles.bits, tiles.even));
    const P = Plot(box, { xcats: range(NC).map(i => String(i + 1)), y: [0, 1], h: 280, xlabel: 'channel', ylabel: 'variance explained R²', grid: 'y', yfmt: v => fmtPct(v, 0), label: 'Variance explained in each of 16 channels' });
    const gb = el('g', {}, P.g.data), gl = el('g', {}, P.g.top);
    const bw = Math.min(26 * P.fs, Math.abs(P.x(1) - P.x(0)) * 0.7);
    const knobs = range(NC).map(i => {
      const k = el('circle', { class: 'handle', r: 6.5 * P.fs }, P.g.top);
      draggable(k, P, ([, y]) => { r2[i] = clamp(+y.toFixed(3), 0, CAP); draw(); }, null,
        { get: () => [i, r2[i]], step: [0, 0.01], label: `channel ${i + 1} variance explained` });
      hover(k, () => `<b>channel ${i + 1}</b><br>R² = ${fmtPct(r2[i], 1)}<br>saves ${fmt(bitsFromR2(r2[i]), 2)} bits`);
      return k;
    });
    function draw() {
      gb.replaceChildren(); gl.replaceChildren();
      r2.forEach((v, i) => {
        const x = P.x(i) - bw / 2;
        el('rect', { x, y: P.y(v), width: bw, height: Math.max(0, P.y(0) - P.y(v)), rx: 3, style: `fill:${series(2)};fill-opacity:.75` }, gb);
        svgText(gl, P.x(i), P.y(v) - 11 * P.fs, fmt(bitsFromR2(v), 2).replace(/^0(?=\.)/, ''), { class: 'val', 'text-anchor': 'middle' });
        knobs[i].setAttribute('cx', P.x(i)); knobs[i].setAttribute('cy', P.y(v));
      });
      const avg = r2.reduce((a, b) => a + b, 0) / NC;
      const bits = r2.reduce((a, v) => a + bitsFromR2(v), 0) / NC, even = bitsFromR2(avg);
      rule(P, { y: avg, parent: gl });
      tiles.avg.set(fmtPct(avg, 1));
      tiles.bits.set(fmt(bits, 2), 'numbers above the bars: bits per channel');
      tiles.even.set(fmt(even, 2), bits > even + 0.005 ? `concentration buys ${fmt(bits / even, 1)}×` : 'no concentration, no bonus');
    }
    draw();
  };

  /* ==================================================================
     VII.7  maBitFlips — which bits a predictor of a given quality cannot tell you
     ================================================================== */
  FIG.maBitFlips = (host) => {
    const N = 20000;
    const r = rng('ma-bitflips');
    const xh0 = range(N).map(() => r.normal()), res0 = range(N).map(() => r.normal());
    const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
    const bf16 = x => { f32[0] = x; const u = u32[0]; return ((u + 0x7fff + ((u >>> 16) & 1)) >>> 16) & 0xffff; };
    // E4M3: for non-negative numbers the 7-bit code equals the index of the grid value (0…126)
    const e4m3 = x => {
      const ax = Math.min(Math.abs(x), 448);
      const e = Math.floor(Math.log2(Math.max(ax, Math.pow(2, -6))));
      const step = Math.pow(2, e - 3);
      const v = Math.min(Math.round(ax / step) * step, 448);      // nearest (ties are measure-zero here)
      let code;
      if (v < Math.pow(2, -6)) code = Math.round(v / Math.pow(2, -9));
      else { const ee = Math.floor(Math.log2(v)); code = (ee + 7) * 8 + Math.round((v / Math.pow(2, ee) - 1) * 8); }
      return ((x < 0 && code > 0 ? 1 : 0) << 7) | code;
    };
    const SC = 16;                                     // channel scale for E4M3 (any scale gives the same picture)
    let R2 = 0.9;
    const sl = slider('variance the prediction explains, R²', 0, 0.999, 0.001, R2, v => { R2 = v; draw(); }, v => fmtPct(v, 1));
    const box = h('div'), ro = readout();
    host.append(controls(sl), legend([['sign', series(7), 'box'], ['exponent', series(0), 'box'], ['mantissa', series(1), 'box']]), box, ro);
    const D = Diagram(box, { w: 640, h: 214, label: 'Probability that each bit of the value differs from the same bit of its prediction', grow: 0.5 });
    const f = D.fs, g = el('g', {}, D.svg);
    function flips(R2) {
      const a = Math.sqrt(R2), b = Math.sqrt(1 - R2);
      const cB = new Float64Array(16), cE = new Float64Array(8);
      for (let i = 0; i < N; i++) {
        const xh = a * xh0[i], x = xh + b * res0[i];
        const d = bf16(x) ^ bf16(xh), d8 = e4m3(x * SC) ^ e4m3(xh * SC);
        for (let k = 0; k < 16; k++) cB[k] += (d >>> (15 - k)) & 1;
        for (let k = 0; k < 8; k++) cE[k] += (d8 >>> (7 - k)) & 1;
      }
      return [Array.from(cB, c => c / N), Array.from(cE, c => c / N)];
    }
    // order-0 entropy of the three BF16 fields of the values themselves (no predictor)
    const H0 = (() => {
      const cs = new Float64Array(2), ce = new Float64Array(256), cm = new Float64Array(128);
      xh0.forEach((a, i) => { const u = bf16(Math.sqrt(0.9) * a + Math.sqrt(0.1) * res0[i]); cs[u >>> 15]++; ce[(u >>> 7) & 255]++; cm[u & 127]++; });
      const Hc = c => entropyOf(Array.from(c, v => v / N));
      return { s: Hc(cs), e: Hc(ce), m: Hc(cm) };
    })();
    function rowOf(probs, fields, y, name) {
      const n = probs.length, X0 = 110, X1 = 620, cw = (X1 - X0) / 16;
      svgText(g, X0 - 10 * f, y + 30 * f, name, { class: 'lbl', 'text-anchor': 'end' });
      probs.forEach((p, k) => {
        const x = X0 + k * cw, fld = fields[k], col = fld === 's' ? series(7) : fld === 'e' ? series(0) : series(1);
        const ch = 54 * f;
        el('rect', { x: x + 1, y, width: cw - 2, height: ch, rx: 3, style: `fill:color-mix(in srgb, ${col} 12%, var(--paper));stroke:${col};stroke-width:1` }, g);
        const fh = ch * Math.min(1, p / 0.5);
        el('rect', { x: x + 1, y: y + ch - fh, width: cw - 2, height: fh, rx: 3, style: `fill:${col};fill-opacity:.85` }, g);
        svgText(g, x + cw / 2, y + ch + 14 * f, `${Math.round(p * 100)}`, { class: 'val', 'text-anchor': 'middle' });
      });
      return n;
    }
    function draw() {
      const [pb, pe] = flips(R2);
      g.replaceChildren();
      const fb = ['s', ...'eeeeeeee', ...'mmmmmmm'], fe = ['s', ...'eeee', ...'mmm'];
      svgText(g, 110, 14 * f, 'chance (%) that a bit differs from the same bit of the prediction · 50 = a coin flip', { class: 'lbl' });
      rowOf(pb, fb, 26 * f, 'BF16 (16 bits)');
      rowOf(pe, fe, 26 * f + 100 * f, 'E4M3 (8 bits)');
      const coin = ps => ps.filter(p => p >= 0.4).length;
      ro.set([
        ['coin-flip bits (chance ≥ 40 %)', `BF16: ${coin(pb)} of 16 · E4M3: ${coin(pe)} of 8`],
        ['BF16 cost with no predictor', `sign ${fmt(H0.s, 2)} + exponent ${fmt(H0.e, 2)} + mantissa ${fmt(H0.m, 2)} = ${fmt(H0.s + H0.e + H0.m, 2)} bits → at most ${fmt(16 / (H0.s + H0.e + H0.m), 2)}×`],
      ]);
    }
    draw();
  };

  /* ==================================================================
     VII.7  maGridLine — the E4M3 grid vs the INT8 grid, residuals counted in grid steps
     ================================================================== */
  FIG.maGridLine = (host) => {
    // non-negative E4M3 values in order: their position in this list is the index (and the 7-bit code)
    const GRID = [0];
    for (let m = 1; m < 8; m++) GRID.push((m / 8) * Math.pow(2, -6));
    for (let e = 1; e < 16; e++) for (let m = 0; m < 8; m++) GRID.push((1 + m / 8) * Math.pow(2, e - 7));
    GRID.pop();                                        // the last code is NaN: 126 is the largest index (448)
    const idxE = x => {                                // nearest grid value, as a signed index
      const ax = Math.min(Math.abs(x), 448);
      let lo = 0, hi = GRID.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (GRID[mid] <= ax) lo = mid; else hi = mid; }
      const i = ax - GRID[lo] <= GRID[hi] - ax ? lo : hi;
      return x < 0 ? -i : i;
    };
    const SCALE = 4 / 127;                             // INT8: one scale per channel, ±4 standard deviations
    const idxI = x => clamp(Math.round(x / SCALE), -127, 127);
    let v = 0.4, p = -0.1, zoom = 'wide';
    const sZ = seg([['wide', 'whole channel: −4 … 4'], ['near', 'near zero: −0.6 … 0.6']], zoom, z => { zoom = z; build(); }, 'range');
    const box = h('div'), ro = readout();
    host.append(controls(sZ, h('span', { class: 'fig-note', text: 'Drag the value and the prediction, or focus them and use the arrow keys.' })),
      legend([['the value', 'var(--c)', 'dot'], ['the prediction', series(4), 'dot']]), box, ro);
    let P = null, kv = null, kp = null;
    // lanes (y in data units): E4M3 ticks 2.6–3.1, its residual 2.3; handles 1.75; INT8 ticks 0.75–1.25, its residual 0.45
    function build() {
      box.replaceChildren();
      const R = zoom === 'wide' ? 4 : 0.6;
      v = clamp(v, -R, R); p = clamp(p, -R, R);
      P = Plot(box, { x: [-R, R], y: [0.2, 3.5], h: 250, yticks: [], grid: false, xlabel: 'value of one channel (its standard deviation = 1)', label: 'Grid points of E4M3 and INT8 on one number line' });
      const gE = el('g', {}, P.g.bg), gI = el('g', {}, P.g.bg);
      svgText(P.g.axes, P.m.l + 6 * P.fs, P.y(3.25), 'E4M3 grid points', { class: 'lbl' });
      svgText(P.g.axes, P.m.l + 6 * P.fs, P.y(1.4), 'INT8 grid points (scale 4/127)', { class: 'lbl' });
      GRID.forEach(gv => [gv, -gv].forEach(x => {
        if (Math.abs(x) <= R) el('line', { x1: P.x(x), x2: P.x(x), y1: P.y(3.05), y2: P.y(2.6), style: `stroke:${series(0)};stroke-width:1;stroke-opacity:.7` }, gE);
      }));
      for (let i = -127; i <= 127; i++) {
        const x = i * SCALE;
        if (Math.abs(x) <= R) el('line', { x1: P.x(x), x2: P.x(x), y1: P.y(1.2), y2: P.y(0.75), style: `stroke:${series(2)};stroke-width:1;stroke-opacity:.7` }, gI);
      }
      P.g.marks = el('g', {}, P.g.data);
      kp = el('circle', { class: 'handle', r: 7.5 * P.fs, style: `fill:${series(4)}` }, P.g.top);
      kv = el('circle', { class: 'handle', r: 7.5 * P.fs }, P.g.top);
      const step = [R / 100, 0];
      draggable(kv, P, ([x]) => { v = clamp(x, -R, R); draw(); }, null, { get: () => [v, 1.75], step, label: 'the value' });
      draggable(kp, P, ([x]) => { p = clamp(x, -R, R); draw(); }, null, { get: () => [p, 1.75], step, label: 'the prediction' });
      hover(kv, () => `<b>value ${fmt(v, 3)}</b><br>E4M3 index ${idxE(v)} · INT8 index ${idxI(v)}`);
      hover(kp, () => `<b>prediction ${fmt(p, 3)}</b><br>E4M3 index ${idxE(p)} · INT8 index ${idxI(p)}`);
      draw();
    }
    function draw() {
      const m = P.g.marks;
      m.replaceChildren();
      [v, p].forEach((x, i) => el('line', { x1: P.x(x), x2: P.x(x), y1: P.y(3.1), y2: P.y(0.35), style: `stroke:${i ? series(4) : 'var(--c)'};stroke-width:1.2;stroke-dasharray:3 3` }, m));
      [[2.3, idxE, series(0)], [0.45, idxI, series(2)]].forEach(([y, idx, col]) => {
        const lo = Math.min(p, v), hi = Math.max(p, v);
        el('line', { x1: P.x(lo), x2: P.x(hi), y1: P.y(y), y2: P.y(y), style: `stroke:${col};stroke-width:${7 * P.fs};stroke-opacity:.45;stroke-linecap:round` }, m);
        const right = P.x(hi) < P.m.l + P.pw * 0.7;
        svgText(m, right ? P.x(hi) + 10 * P.fs : P.x(lo) - 10 * P.fs, P.y(y) + 4 * P.fs, `${Math.abs(idx(v) - idx(p))} steps apart`, { class: 'val', 'text-anchor': right ? 'start' : 'end' });
      });
      [kv, kp].forEach((k, i) => { k.setAttribute('cx', P.x(i ? p : v)); k.setAttribute('cy', P.y(1.75)); });
      const rE = idxE(v) - idxE(p), rI = idxI(v) - idxI(p);
      ro.set([
        ['value', fmt(v, 3)], ['prediction', fmt(p, 3)],
        ['residual on the E4M3 grid', `${rE} steps`],
        ['on the INT8 grid', `${rI} steps`],
      ]);
    }
    build();
  };

  /* ==================================================================
     VII.8  maAccess — bulk stream chunks vs single reads on the miss path
     ================================================================== */
  FIG.maAccess = (host) => {
    const NE = 100384, MISS = 274, E = 640, RHO_S = 0.70, RHO_F = 0.80, OFF = 2;   // ρ values illustrative
    const REQ = 110, LINK = 50e9, WINDOW = 0.38e-3;
    let logc = 6, where = 'scattered';
    const region = () => (where === 'scattered' ? NE : 8 * 2048);
    const distinct = c => { const n = region() / c; return n * (1 - Math.pow(1 - 1 / n, MISS)); };
    const streamBytes = c => (c <= 1 ? MISS * (RHO_S * E + OFF) : distinct(c) * c * RHO_S * E);
    const fixedBytes = MISS * RHO_F * E, rawBytes = MISS * E;
    const kb = b => (b >= 1e6 ? `${fmt(b / 1e6, 1)} MB` : `${fmt(b / 1e3, 0)} KB`);
    const sC = slider('entries per stream chunk', 0, 12, 1, logc, v => { logc = v; draw(); }, v => fmt(Math.pow(2, v), 0));
    const sW = seg([['scattered', 'misses scattered over 100K'], ['heavy', 'misses inside 8 heavy blocks']], where, v => { where = v; draw(); }, 'where misses land');
    const box = h('div');
    const tiles = {
      s: kpi('stream-coded chunks', '', '', series(1)),
      f: kpi('fixed-length deltas', '', '', series(0)),
      t: kpi('link time, 110 requests', '', '', series(3)),
    };
    host.append(controls(sC, sW), legend([['stream-coded chunks (ρ = 0.70, illustrative)', series(1)], ['fixed-length deltas, one read each (ρ = 0.80)', series(0)], ['raw entries (HiSparse today)', 'var(--ink-3)', 'dash']]), box, h('div', { class: 'kpis' }, tiles.s, tiles.f, tiles.t));
    const P = Plot(box, { x: [1, 4096], xlog: 2, y: [8e4, 1e8], ylog: true, h: 320, xticks: [1, 4, 16, 64, 256, 1024, 4096],
      yfmt: v => (v >= 1e6 ? `${fmt(v / 1e6, 0)} MB` : `${fmt(v / 1e3, 0)} KB`), m: { l: 76 }, xlabel: 'entries coded together in one stream chunk', ylabel: 'bytes moved per layer per step', label: 'Bytes moved per request per layer and step against stream chunk size' });
    const knob = el('circle', { class: 'handle', r: 7 * P.fs }, P.g.top);
    draggable(knob, P, ([x]) => { logc = clamp(Math.round(L2(Math.max(1, x))), 0, 12); sC.set(logc); draw(); }, null,
      { get: () => [Math.pow(2, logc), streamBytes(Math.pow(2, logc))], step: [0, 0], label: 'stream chunk size' });
    knob.addEventListener('keydown', e => {
      const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (!d) return;
      logc = clamp(logc + d, 0, 12); sC.set(logc); draw();
    });
    function draw() {
      P.clear('data');
      [...P.g.top.children].forEach(n => { if (n !== knob) n.remove(); });
      const cs = linspace(0, 12, 121).map(e => Math.pow(2, e));
      rule(P, { y: rawBytes, label: 'raw', color: 'var(--ink-3)' });
      line(P, [[1, fixedBytes], [4096, fixedBytes]], { color: series(0) });
      line(P, cs.map(c => [c, streamBytes(c)]), { color: series(1) });
      annotate(P, 1, streamBytes(1), `one entry per chunk: ${kb(streamBytes(1))},\nbut an offset table and a second read`, { dx: 26, dy: -58 });
      const c = Math.pow(2, logc), sb = streamBytes(c);
      knob.setAttribute('cx', P.x(c)); knob.setAttribute('cy', P.y(sb));
      const t = (REQ * sb) / LINK, tf = (REQ * fixedBytes) / LINK;
      tiles.s.set(kb(sb), c <= 1 ? 'one entry per chunk, + 2-byte offsets' : `≈ ${fmt(distinct(c), 0)} chunks of ${c} decoded`);
      tiles.f.set(kb(fixedBytes), `${MISS} reads of ${fmt(RHO_F * E, 0)} B`);
      tiles.t.set(`${fmt(t * 1e3, 2)} ms`, `window 0.38 ms · fixed-length: ${fmt(tf * 1e3, 2)} ms`);
    }
    draw();
  };
})();
