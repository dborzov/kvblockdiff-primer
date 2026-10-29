/* Figures for missed-b: Part VII, pages VII.9–VII.17 (fields & tools; design changes).
   Every builder is prefixed "mb" so it cannot collide with missed-a.js on the same pages.
   Numbers are computed live from seeded generators or closed forms; the prose quotes them. */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------------ shared numerics
  // erfc with fractional error < 1.2e-7 everywhere (Numerical Recipes "erfcc"), so tail cells stay accurate
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
      t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const Phi = z => (z === Infinity ? 1 : z === -Infinity ? 0 : 0.5 * erfc(-z / Math.SQRT2));
  const Hbits = p => { let s = 0, tot = 0; for (const v of p) tot += v; for (const v of p) if (v > 0) { const q = v / tot; s -= q * Math.log2(q); } return s; };
  const pow2 = k => Math.pow(2, k);

  // all non-negative E4M3 values, sorted: 0, 7 subnormals, 15 binades × 8 (minus NaN) = 127 values
  const E4 = (() => {
    const g = [0];
    for (let m = 1; m < 8; m++) g.push(m / 8 * pow2(-6));
    for (let e = 1; e < 16; e++) for (let m = 0; m < 8; m++) g.push((1 + m / 8) * pow2(e - 7));
    g.pop();                                   // 480 would be NaN in E4M3; max is 448
    const full = g.slice(1).reverse().map(v => -v).concat(g);   // index −126 … 126
    const bounds = [-Infinity];
    for (let i = 1; i < full.length; i++) bounds.push((full[i] + full[i - 1]) / 2);
    bounds.push(Infinity);
    return { pos: g, full, bounds };
  })();
  const e4Index = v => {            // nearest E4M3 value → signed index (−126 … 126)
    let lo = 0, hi = E4.bounds.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (E4.bounds[mid] <= v) lo = mid; else hi = mid; }
    return lo - 126;
  };
  const e4Value = i => E4.full[i + 126];

  // reference setting (III.10) and HiSparse's measured miss rates (III.8)
  const REF = { e: 640, NL: 78, k: 2048, tpot: 0.030, W: 50e9, M: 30e9, L: 100000, d: 640 };
  const missPow = Bsz => 0.134 * Math.pow(Bsz / 4096, -1.08);   // power law anchored at the measured B = 4096 point

  const accent = 'var(--c)';
  const faint = (c, pct = 25) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

  // ================================================================== VII.9 — FLAC's fixed predictors
  FIG.mbFlacOrders = (host) => {
    const N = 1024, SHOW = 240;
    const r = rng('missed-b-flac');
    const noise = range(N).map(() => r.normal(0, 1));
    const clean = range(N).map(t => 3000 * Math.sin(2 * Math.PI * t / 100) + 800 * Math.sin(2 * Math.PI * t / 37 + 1));
    const COEF = [[], [1], [2, -1], [3, -3, 1]];
    const AMP = [1, 2, 6, 20];                                   // how much each order multiplies the noise variance
    let lsig = Math.log10(4), order = 2;

    const signal = sigma => clean.map((c, t) => Math.round(c + sigma * noise[t]));
    const residual = (s, k) => { const out = []; for (let t = 3; t < N; t++) { let p = 0; COEF[k].forEach((a, j) => { p += a * s[t - 1 - j]; }); out.push(s[t] - p); } return out; };
    const riceBits = res => {         // FLAC's residual code: zig-zag, then the best single Rice parameter
      let best = Infinity;
      for (let k = 0; k <= 16; k++) {
        let b = 0; for (const v of res) { const u = v >= 0 ? 2 * v : -2 * v - 1; b += k + 1 + Math.floor(u / pow2(k)); }
        best = Math.min(best, b / res.length);
      }
      return best;
    };

    const ro = readout();
    const boxS = h('div'), boxR = h('div'), boxB = h('div');
    const ordSeg = seg([[0, 'order 0'], [1, 'order 1'], [2, 'order 2'], [3, 'order 3']], order, v => { order = v; draw(); }, 'Which predictor');
    host.append(
      controls(slider('noise σ (counts)', -1, 2.5, 0.05, lsig, v => { lsig = v; draw(); }, v => fmt(Math.pow(10, v), Math.pow(10, v) < 10 ? 1 : 0)), ordSeg),
      h('div', { class: 'fig-row' }, boxS, boxR), boxB, ro);
    const PS = Plot(boxS, { x: [0, SHOW], y: [-4200, 4200], h: 230, xlabel: 'sample number i', ylabel: 'sample value', label: 'The audio samples' });
    const PR = Plot(boxR, { x: [0, SHOW], y: [-1, 1], h: 230, xlabel: 'sample number i', ylabel: 'residual', label: 'The residual of the chosen predictor' });
    const PB = Plot(boxB, { xcats: ['order 0', 'order 1', 'order 2', 'order 3'], y: [0, 17], h: 260, ylabel: 'bits per sample', grid: 'y', label: 'Bits per sample for each fixed predictor' });

    function draw() {
      const sigma = Math.pow(10, lsig), s = signal(sigma);
      const res = [0, 1, 2, 3].map(k => residual(s, k));
      const bits = res.map(riceBits);
      const best = bits.indexOf(Math.min(...bits));
      PS.clear();
      line(PS, s.slice(0, SHOW).map((v, t) => [t, v]), { color: series(0), width: 1.6 });
      const rr = res[order].slice(0, SHOW - 3);
      const top = Math.max(4, ...rr.map(Math.abs)) * 1.1;
      PR.domain({ y: [-top, top] }); PR.clear();
      line(PR, rr.map((v, i) => [i + 3, v]), { color: series(1), width: 1.4 });
      PB.clear();
      rule(PB, { y: 16, label: 'raw: 16 bits' });
      bars(PB, bits, {
        colors: i => (i === order ? accent : faint(series(0), i === best ? 70 : 40)),
        labels: v => fmt(v, 1),
        tip: (v, i) => `<b>order ${i}</b><br>${fmt(v, 2)} bits per sample<br>noise variance × ${AMP[i]}`,
      });
      ro.set([
        ['noise σ', `${fmt(sigma, sigma < 10 ? 1 : 0)} counts`],
        ['best predictor', `order ${best}: ${fmt(bits[best], 2)} bits / sample`],
        ['vs raw 16 bits', `${fmt(16 / bits[best], 2)}× smaller`],
        [`order ${order} multiplies noise variance by`, `${AMP[order]}`],
      ]);
    }
    draw();
  };

  // ================================================================== VII.10 — a rotation as three integer shears
  FIG.mbLiftingGrid = (host) => {
    let deg = 45, view = 'l3';
    const pts = [];
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) pts.push([x, y]);
    const R = Math.round;                                     // floor(v + 0.5); the inverse uses the same rule
    const lift = (th) => { const t = Math.tan(th / 2), s = Math.sin(th); return pts.map(([x, y]) => { const x1 = x - R(t * y), y1 = y + R(s * x1), x2 = x1 - R(t * y1); return [[x, y], [x1, y], [x1, y1], [x2, y1]]; }); };
    const unlift = (th, [x, y]) => { const t = Math.tan(th / 2), s = Math.sin(th); const x1 = x + R(t * y), y1 = y - R(s * x1), x0 = x1 + R(t * y1); return [x0, y1]; };
    const exact = (th, [x, y]) => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];

    const box = h('div'), ro = readout();
    const vSeg = seg([['float', 'rotate, then round'], ['l1', 'shear 1'], ['l2', 'shear 2'], ['l3', 'shear 3 = lifted rotation']], view, v => { view = v; draw(); }, 'What to show');
    host.append(controls(slider('angle θ', 0, 90, 1, deg, v => { deg = v; draw(); }, v => `${v}°`)), controls(vSeg),
      legend([['position before this step', 'var(--ink-3)', 'dot'], ['position after it', series(0), 'dot'], ['two inputs landed on one point', 'var(--bad)', 'dot'], ['exact (real-valued) rotation', series(3), 'dot']]), box, ro);
    const P = Plot(box, { x: [-7, 7], y: [-7, 7], equal: true, h: 420, xticks: [-6, -4, -2, 0, 2, 4, 6], yticks: [-6, -4, -2, 0, 2, 4, 6], label: 'Integer points before and after a rotation' });
    // the integer lattice as faint dots
    for (let y = -7; y <= 7; y++) for (let x = -9; x <= 9; x++) el('circle', { cx: P.x(x), cy: P.y(y), r: 1.3 * P.fs, style: 'fill:var(--ink-3);opacity:.35' }, P.g.bg);

    function draw() {
      const th = deg * Math.PI / 180, L = lift(th);
      const stage = { l1: 1, l2: 2, l3: 3 }[view];
      const outs = view === 'float' ? pts.map(p => exact(th, p).map(R)) : L.map(s => s[stage]);
      const prev = view === 'float' ? pts : L.map(s => s[stage - 1]);
      const count = new Map();
      outs.forEach(p => count.set(p.join(), (count.get(p.join()) || 0) + 1));
      P.clear();
      const g = P.g.data;
      if (view === 'float' || view === 'l3') pts.forEach(p => { const [ex, ey] = exact(th, p); el('circle', { cx: P.x(ex), cy: P.y(ey), r: 5.5 * P.fs, style: `fill:none;stroke:${series(3)};stroke-width:1.3` }, g); });
      outs.forEach((p, i) => {
        const q = prev[i];
        if (q[0] !== p[0] || q[1] !== p[1]) el('line', { x1: P.x(q[0]), y1: P.y(q[1]), x2: P.x(p[0]), y2: P.y(p[1]), style: `stroke:${faint('var(--ink-2)', 45)};stroke-width:1` }, g);
      });
      prev.forEach(q => el('circle', { cx: P.x(q[0]), cy: P.y(q[1]), r: 2.2 * P.fs, style: 'fill:var(--ink-3)' }, g));
      const drawn = new Set();
      outs.forEach(p => {
        const key = p.join(), n = count.get(key);
        if (drawn.has(key)) return; drawn.add(key);
        const c = dot(P.g.top, P.x(p[0]), P.y(p[1]), (n > 1 ? 5.2 : 3.8) * P.fs, n > 1 ? 'var(--bad)' : series(0));
        hover(c, () => `<b>(${p[0]}, ${p[1]})</b>${n > 1 ? `<br>${n} inputs landed here` : ''}`);
      });
      const distinct = count.size;
      const fin = view === 'float' ? outs : L.map(s => s[3]);
      const dev = Math.max(...fin.map((p, i) => Math.hypot(p[0] - exact(th, pts[i])[0], p[1] - exact(th, pts[i])[1])));
      const back = L.every((s, i) => { const u = unlift(th, s[3]); return u[0] === pts[i][0] && u[1] === pts[i][1]; });
      const lost = 81 - distinct;
      ro.set(view === 'float'
        ? [['outputs', `${distinct} distinct of 81`], ['inputs lost', lost ? `<span style="color:var(--bad)">${lost}</span> (two inputs share an output)` : '0 at this angle'], ['undo exactly?', lost ? 'impossible' : 'only by luck'], ['largest error vs exact', `${fmt(dev, 2)} steps`]]
        : [['outputs', `${distinct} distinct of 81`], ['inputs lost', '0'], ['undo exactly?', back ? 'yes — every point returns' : 'no'], ['largest error vs exact (after shear 3)', `${fmt(dev, 2)} steps`]]);
    }
    draw();
  };

  // ================================================================== VII.11 — the E4M3 ruler: the same difference, two prices
  FIG.mbGridRuler = (host) => {
    let xv = 5.5, xp = 4.5;
    const box = h('div'), ro = readout();
    host.append(controls(
      btn('far from zero', () => { xv = 5.5; xp = 4.5; draw(); }, { cls: 'sm' }),
      btn('straddling zero', () => { xv = -0.5; xp = 0.5; draw(); }, { cls: 'sm' }),
      btn('just above zero', () => { xv = 0.25; xp = 0.75; draw(); }, { cls: 'sm' }),
      h('span', { class: 'fig-note', text: 'Drag either knob, or focus it and use the arrow keys.' })), box, ro);
    const P = Plot(box, { x: [-6, 6], y: [0, 1], h: 190, yticks: [], grid: false, xlabel: 'value (E4M3 grid points are the ticks)', label: 'The E4M3 grid between −6 and 6' });
    const ticksG = el('g', {}, P.g.bg);
    E4.full.filter(v => Math.abs(v) <= 6).forEach(v => el('line', { x1: P.x(v), x2: P.x(v), y1: P.y(0.08), y2: P.y(0.3), style: 'stroke:var(--ink-2);stroke-width:.8' }, ticksG));
    const band = el('rect', { style: `fill:${faint(accent, 22)}` }, P.g.data);
    const mk = (cls, label) => { const c = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top); const t = el('text', { class: 'lbl', 'text-anchor': 'middle', text: label }, P.g.top); return { c, t }; };
    const hx = mk('x', 'x'), hp = mk('p', 'x̂');
    const snap = v => e4Value(e4Index(clamp(v, -6, 6)));
    const stepOf = v => { const i = e4Index(v); return [e4Value(i - 1), e4Value(i + 1)]; };
    draggable(hx.c, P, ([x]) => { xv = snap(x); draw(); }, null, { get: () => [xv, 0.7], step: [0.25, 0], label: 'the value x' });
    draggable(hp.c, P, ([x]) => { xp = snap(x); draw(); }, null, { get: () => [xp, 0.7], step: [0.25, 0], label: 'the prediction' });
    // arrow keys move by one grid point instead of 0.25 when the grid is finer
    [[hx.c, () => xv, v => { xv = v; }], [hp.c, () => xp, v => { xp = v; }]].forEach(([node, get, set]) => node.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.stopImmediatePropagation(); e.preventDefault();
      const [lo, hi] = stepOf(get()); set(clamp(e.key === 'ArrowLeft' ? lo : hi, -6, 6)); draw();
    }, true));
    function draw() {
      const ix = e4Index(xv), ip = e4Index(xp), diff = xv - xp;
      const far = e4Index(4.5 + Math.abs(diff)) - e4Index(4.5);
      band.setAttribute('x', P.x(Math.min(xv, xp))); band.setAttribute('width', Math.abs(P.x(xv) - P.x(xp)));
      band.setAttribute('y', P.y(0.95)); band.setAttribute('height', P.y(0) - P.y(0.95));
      [[hx, xv, 0.62], [hp, xp, 0.62]].forEach(([o, v, y]) => { o.c.setAttribute('cx', P.x(v)); o.c.setAttribute('cy', P.y(y)); o.t.setAttribute('x', P.x(v)); o.t.setAttribute('y', P.y(y) - 13 * P.fs); });
      ro.set([
        [tex('\\vx'), `${fmt(xv, 4)} (index ${ix})`], [tex('\\vxhat'), `${fmt(xp, 4)} (index ${ip})`],
        ['difference in value', fmt(diff, 4)], ['difference in grid steps', `<b>${ix - ip}</b>`],
        ['same value difference near 4.5', `${far} steps`],
      ]);
    }
    draw();
  };

  // ================================================================== VII.11 — subtraction versus context, E4M3 versus INT8 (exact)
  function gridRates(R2, sigma = 16) {
    // x = μ + noise; μ ~ N(0, R²σ²) is the prediction both sides know; noise ~ N(0, (1−R²)σ²).
    const sm = Math.sqrt(R2) * sigma, sn = Math.sqrt(1 - R2) * sigma;
    function forGrid(bnds, offsetOfCell) {
      const nc = bnds.length - 1;
      // μ points: each prediction cell is cut into pieces no wider than hstep, with exact Gaussian weights
      const hstep = Math.min(12 * sm / 150, sn / 6), mus = [], ws = [], cs = [];
      if (sm === 0) { mus.push(0); ws.push(1); cs.push(offsetOfCell(0)); }
      else for (let c = 0; c < nc; c++) {
        const lo = Math.max(bnds[c], -6 * sm), hi = Math.min(bnds[c + 1], 6 * sm);
        if (hi <= lo) continue;
        const n = Math.max(1, Math.ceil((hi - lo) / hstep));
        for (let i = 0; i < n; i++) { const a = lo + (hi - lo) * i / n, b = lo + (hi - lo) * (i + 1) / n; mus.push((a + b) / 2); ws.push(Phi(b / sm) - Phi(a / sm)); cs.push(c); }
      }
      const wsum = ws.reduce((a, b) => a + b, 0);
      const px = new Float64Array(nc), pool = new Float64Array(2 * nc + 1);
      let ctx = 0, cur = -1, pc = new Float64Array(nc), wc = 0;
      const flush = () => { if (cur >= 0 && wc > 0) { ctx += wc * Hbits(pc); for (let j = 0; j < nc; j++) pool[j - cur + nc] += pc[j]; } };
      const cdf = new Float64Array(nc + 1);
      for (let q = 0; q < mus.length; q++) {
        if (cs[q] !== cur) { flush(); cur = cs[q]; pc = new Float64Array(nc); wc = 0; }
        const w = ws[q] / wsum;
        for (let j = 0; j <= nc; j++) cdf[j] = Phi((bnds[j] - mus[q]) / sn);
        for (let j = 0; j < nc; j++) { const p = Math.max(0, cdf[j + 1] - cdf[j]) * w; px[j] += p; pc[j] += p; }
        wc += w;
      }
      flush();
      return { solo: Hbits(px), sub: Hbits(pool), ctx };
    }
    const e4 = forGrid(E4.bounds, c => c);
    const D = sigma / 32, kb = [-Infinity];                       // INT8 step: ±127 steps cover ±4σ
    for (let k = -127; k < 127; k++) kb.push((k + 0.5) * D);
    kb.push(Infinity);
    const i8 = forGrid(kb, c => c);
    return { e4solo: e4.solo, e4sub: e4.sub, e4ctx: e4.ctx, i8solo: i8.solo, i8sub: i8.sub, i8ctx: i8.ctx };
  }

  FIG.mbContextGrid = (host) => {
    let R2 = 0.5, show = 'both';
    const grid = [0.01].concat(range(1, 20).map(i => i * 0.05), [0.97, 0.99]);
    const data = grid.map(g => [g, gridRates(g)]);
    const box = h('div'), ro = readout();
    const lg = legend([
      ['E4M3, no prediction', series(0), 'dash'], ['E4M3, subtract in index space', series(1)], ['E4M3, prediction as context', series(0)],
      ['INT8, no prediction', series(2), 'dash'], ['INT8, subtract (= context)', series(2)],
    ]);
    host.append(controls(slider(texify('variance explained $\\vRsq$'), 0.01, 0.99, 0.01, R2, v => { R2 = v; draw(); }),
      seg([['both', 'both grids'], ['e4', 'E4M3 only'], ['i8', 'INT8 only']], show, v => { show = v; draw(); }, 'Which grid')), lg, box, ro);
    const P = Plot(box, { x: [0, 1], y: [3, 8], h: 360, xlabel: 'variance explained by the prediction, R²', ylabel: 'bits per element', label: 'Bits per element against variance explained, for two grids and two ways to use a prediction' });
    crosshair(P, { xname: 'R² =', yfmt: v => `${fmt(v, 2)} bits` });
    function draw() {
      const at = gridRates(R2);
      P.clear();
      const L = (key, color, name, dash) => line(P, data.map(([g, d]) => [g, d[key]]), { color, name, dash, width: dash ? 1.8 : 2.4 });
      if (show !== 'i8') { L('e4solo', series(0), 'E4M3 solo', '6 5'); L('e4sub', series(1), 'E4M3 subtract'); L('e4ctx', series(0), 'E4M3 context'); }
      if (show !== 'e4') { L('i8solo', series(2), 'INT8 solo', '6 5'); L('i8sub', series(2), 'INT8 subtract'); }
      rule(P, { x: R2, label: `R² = ${fmt(R2, 2)}` });
      if (show !== 'i8') {
        // where subtraction in E4M3 index space stops being worse than no prediction at all
        let cross = null;
        for (let i = 1; i < data.length; i++) { const [g0, a] = data[i - 1], [g1, b] = data[i]; const d0 = a.e4sub - a.e4solo, d1 = b.e4sub - b.e4solo; if (d0 > 0 && d1 <= 0) cross = g0 + (g1 - g0) * d0 / (d0 - d1); }
        if (cross != null) annotate(P, cross, data[0][1].e4solo, `subtraction breaks even\nat R² ≈ ${fmt(cross, 2)}`, { dx: -80, dy: 80 });
      }
      ro.set([
        ['E4M3 solo', `${fmt(at.e4solo, 2)}`], ['E4M3 subtract', `${fmt(at.e4sub, 2)}`], ['E4M3 context', `<b>${fmt(at.e4ctx, 2)}</b>`],
        ['INT8 solo', `${fmt(at.i8solo, 2)}`], ['INT8 subtract', `${fmt(at.i8sub, 2)}`], ['INT8 context', `${fmt(at.i8ctx, 2)}`],
        ['float-domain formula saves', `${fmt(R2 < 1 ? -0.5 * Math.log2(1 - R2) : 0, 2)} bits`],
      ]);
    }
    draw();
  };

  // ================================================================== VII.12 — the stack behind every LRU size
  FIG.mbStackDistance = (host) => {
    const PRESETS = { anomaly: '1 2 3 4 1 2 5 1 2 3 4 5', loop: 'A B C D E A B C D E A B C D E', drift: 'A B C A B D B C D E C D E F D E F',
      storm: DS.rows('storm-morning').map(r => r.id).join(' ') };   // the forecaster's 24 requests of II.21, read from the dataset
    let text = PRESETS.anomaly, Bsel = 3;
    const parse = s => { let t = s.trim().split(/[\s,]+/).filter(Boolean); if (t.length === 1 && t[0].length > 1) t = [...t[0]]; return t.slice(0, 24); };
    function analyse(seq) {
      let st = []; const states = [], dist = [];
      for (const x of seq) { const d = st.indexOf(x); if (d >= 0) st.splice(d, 1); st = [x, ...st]; states.push(st.slice()); dist.push(d >= 0 ? d : Infinity); }
      const distinct = new Set(seq).size;
      const lru = B => dist.filter(d => d >= B).length;
      const fifo = B => { const c = []; let m = 0; for (const x of seq) if (!c.includes(x)) { m++; if (c.length >= B) c.shift(); c.push(x); } return m; };
      const opt = B => { const c = new Set(); let m = 0; seq.forEach((x, i) => { if (c.has(x)) return; m++; if (c.size >= B) { let far = null, fd = -1; for (const y of c) { let n = seq.indexOf(y, i + 1); if (n < 0) n = 1e9; if (n > fd) { fd = n; far = y; } } c.delete(far); } c.add(x); }); return m; };
      return { states, dist, distinct, lru, fifo, opt };
    }
    const inp = h('input', { type: 'text', value: text, 'aria-label': 'Request string', class: 'mb-seq', spellcheck: 'false' });
    const pre = seg([['anomaly', 'Bélády’s string'], ['loop', 'a loop of 5'], ['drift', 'a drifting set'], ['storm', 'the storm morning']], 'anomaly', v => { text = PRESETS[v]; inp.value = text; draw(); }, 'Preset request strings');
    inp.addEventListener('input', () => { text = inp.value; pre.set(null); draw(); });
    const bSl = slider('cache size B', 1, 6, 1, Bsel, v => { Bsel = v; draw(); });
    const diagBox = h('div', { class: 'mb-stack-wrap' }), plotBox = h('div'), ro = readout();
    host.append(controls(h('label', { class: 'mb-seq-l' }, 'requests ', inp)), controls(pre, bSl), diagBox,
      legend([['LRU, read off the stack', series(0)], ['FIFO, simulated', series(1), 'dot'], ['Bélády (clairvoyant), simulated', series(2), 'dot']]), plotBox, ro);
    const P = Plot(plotBox, { x: [0.5, 6.5], y: [0, 16], h: 250, xticks: [1, 2, 3, 4, 5, 6], xlabel: 'cache size B (slots)', ylabel: 'misses', label: 'Misses against cache size' });

    function draw() {
      const seq = parse(text);
      if (!seq.length) { diagBox.replaceChildren(h('p', { class: 'fig-note', text: 'Type a few requests, separated by spaces.' })); return; }
      const A = analyse(seq), n = seq.length, rows = Math.min(A.distinct, 8);
      const maxB = Math.max(2, A.distinct + 1);
      bSl.input.max = maxB; if (Bsel > maxB) { Bsel = maxB; bSl.set(Bsel); }
      // --- the stack diagram: one column per request, the stack after it, top = most recent
      const lw = 66, W = 640, cw = Math.min(44, (W - lw - 12) / n), top = 58, rh = 26, Hh = top + rows * rh + 14;
      const inner = h('div', { class: 'mb-stack-inner' });
      diagBox.replaceChildren(inner);              // inner keeps a minimum width, so phones scroll sideways instead of squeezing
      const D = Diagram(inner, { w: W, h: Hh, label: 'The LRU stack after each request' });
      const g = el('g', {}, D.svg);
      el('text', { x: 4, y: 20, class: 'lbl', text: 'request' }, g);
      el('text', { x: 4, y: 44, class: 'lbl', text: 'distance' }, g);
      for (let r = 0; r < rows; r++) el('text', { x: lw - 8, y: top + r * rh + 16, 'text-anchor': 'end', class: 'lbl', text: r === 0 ? 'top 0' : String(r) }, g);
      el('rect', { x: lw - 3, y: top - 2, width: n * cw + 4, height: Math.min(Bsel, rows) * rh + 2, rx: 5, style: `fill:${faint(series(0), 12)};stroke:${series(0)};stroke-dasharray:4 3` }, g);
      seq.forEach((x, i) => {
        const cx = lw + i * cw + cw / 2, d = A.dist[i], miss = d >= Bsel;
        el('text', { x: cx, y: 20, 'text-anchor': 'middle', class: 'mono', style: 'fill:var(--ink)', text: x }, g);
        el('text', { x: cx, y: 44, 'text-anchor': 'middle', class: 'mono', style: `fill:${miss ? 'var(--bad)' : 'var(--good)'};font-weight:600`, text: d === Infinity ? '∞' : String(d) }, g);
        A.states[i].slice(0, rows).forEach((y, r) => {
          const now = r === 0;
          el('rect', { x: cx - cw / 2 + 2, y: top + r * rh, width: cw - 4, height: rh - 3, rx: 4, style: `fill:${now ? (miss ? 'var(--bad)' : 'var(--good)') : 'var(--paper)'};stroke:var(--rule)` }, g);
          el('text', { x: cx, y: top + r * rh + 15, 'text-anchor': 'middle', class: 'mono', style: `fill:${now ? 'var(--paper-3)' : 'var(--ink-2)'}`, text: y }, g);
        });
      });
      el('text', { x: lw + n * cw + 8, y: top + Math.min(Bsel, rows) * rh - 6, class: 'lbl', text: '' }, g);
      // --- misses against B
      const Bs = range(1, maxB + 1);
      const lru = Bs.map(B => [B, A.lru(B)]), fifo = Bs.map(B => [B, A.fifo(B)]), opt = Bs.map(B => [B, A.opt(B)]);
      P.domain({ x: [0.5, maxB + 0.5], y: [0, n + 1] }); P.opts.xticks = Bs; P.domain({});
      P.clear();
      line(P, lru, { color: series(0), markers: 4, tip: p => `<b>B = ${p[0]}</b><br>LRU: ${p[1]} misses` });
      fifo.forEach(p => hover(dot(P.g.data, P.x(p[0]) + 6 * P.fs, P.y(p[1]), 4.5 * P.fs, series(1)), () => `<b>B = ${p[0]}</b><br>FIFO: ${p[1]} misses`));
      opt.forEach(p => hover(dot(P.g.data, P.x(p[0]) - 6 * P.fs, P.y(p[1]), 4.5 * P.fs, series(2)), () => `<b>B = ${p[0]}</b><br>Bélády: ${p[1]} misses`));
      rule(P, { x: Bsel, label: `B = ${Bsel}` });
      const anomaly = fifo.findIndex((p, i) => i > 0 && p[1] > fifo[i - 1][1]);
      ro.set([
        [`misses at B = ${Bsel}`, `LRU ${A.lru(Bsel)} · FIFO ${A.fifo(Bsel)} · Bélády ${A.opt(Bsel)} (of ${n})`],
        ['LRU = distances ≥ B', `${A.dist.filter(d => d >= Bsel).length}`],
        ['FIFO anomaly', anomaly > 0 ? `<span style="color:var(--bad)">yes: B = ${fifo[anomaly - 1][0]} → ${fifo[anomaly][0]} adds a miss</span>` : 'none on this string'],
      ]);
    }
    draw();
  };

  // ================================================================== VII.13 — the KLT gain read off a spectrum
  FIG.mbBoundsSpectrum = (host) => {
    const D = 64;
    let s = 8, f = 80 / 136;
    const eig = (s, f) => range(D).map(i => (i < s ? f * D / s : (1 - f) * D / (D - s)));
    const gain = (s, f) => { const l = eig(s, f); return -0.5 * l.reduce((a, v) => a + Math.log2(v), 0) / D; };   // AM = 1 after standardizing
    const box1 = h('div'), box2 = h('div'), ro = readout();
    const sS = slider('strong directions', 1, 32, 1, s, v => { s = v; draw(); });
    const sF = slider('share of variance they hold', 0.02, 0.995, 0.005, f, v => { f = v; draw(); }, v => fmtPct(v, 1));
    host.append(controls(sS, sF), controls(
      btn('example A: 8 at 10, 56 at 1', () => { s = 8; f = 80 / 136; sS.set(s); sF.set(f); draw(); }, { cls: 'sm' }),
      btn('example B: 8 at 50, 56 at 0.1', () => { s = 8; f = 400 / 405.6; sS.set(s); sF.set(f); draw(); }, { cls: 'sm' }),
      btn('flat', () => { s = 8; f = 8 / 64; sS.set(s); sF.set(f); draw(); }, { cls: 'sm' })),
    h('div', { class: 'fig-row' }, box1, box2), ro);
    const P1 = Plot(box1, { x: [0.5, D + 0.5], y: [0.002, 64], ylog: 10, h: 280, xlabel: 'direction (largest first)', ylabel: 'variance λ', label: 'The spectrum: variance along each KLT direction' });
    const P2 = Plot(box2, { x: [0, 1], y: [0, 4], h: 280, xlabel: 'share held by the strong directions', ylabel: 'gain, bits per element', yticks: [0.3, 1, 2, 3, 4], label: 'KLT gain against the share of variance in the strong directions' });
    function draw() {
      const l = eig(s, f), gm = Math.pow(2, l.reduce((a, v) => a + Math.log2(v), 0) / D), g = gain(s, f);
      P1.clear();
      area(P1, l.map((v, i) => [i + 1, v]), { color: series(4), opacity: 0.18, base: 0.002 });
      line(P1, l.map((v, i) => [i + 1, v]), { color: series(4), curve: 'step' });
      rule(P1, { y: 1, label: 'average = 1' });
      P2.clear();
      line(P2, linspace(0.02, 0.995, 120).map(q => [q, gain(s, q)]), { color: series(4) });
      rule(P2, { y: 0.3, label: '1a: below 0.3 bit, trouble' });
      rule(P2, { y: 1, label: '1a: above 1 bit, a pulse' });
      dot(P2.g.top, P2.x(f), P2.y(Math.min(g, 4)), 6 * P2.fs, accent);
      ro.set([
        ['spectrum', `${s} directions at ${fmt(l[0], 2)}, ${D - s} at ${fmt(l[D - 1], 3)}`],
        ['AM / GM', `1 / ${fmt(gm, 3)}`],
        [tex('\\tfrac12\\log_2(\\mathrm{AM}/\\mathrm{GM})'), `<b>${fmt(g, 2)} bits per element</b>`],
        ['256-centroid codebook on these vectors', `pays ${fmt(8 / D, 3)} bit per element; on Gaussian data it saves at most that much beyond the rotation`],
      ]);
    }
    draw();
  };

  // ================================================================== VII.14 — residency cost of every dictionary type
  FIG.mbResidency = (host) => {
    const TYPES = [['none (HiSparse)', 0], ['loc', 2], ['rank-16 basis', 32], ['256-centroid codebook', 256], ['full basis (d = 640)', 2 * REF.d]];
    let lb = 11, rho = 0.75;
    const box = h('div'), tbl = h('div'), ro = readout();
    host.append(controls(
      slider('block size b', 9, 15, 1, lb, v => { lb = v; draw(); }, v => `${fmtSI(pow2(v), 0)} tokens`),
      slider(texify('assumed $\\vrho$'), 0.5, 1, 0.01, rho, v => { rho = v; draw(); })), box, tbl, ro);
    const P = Plot(box, { ycats: TYPES.map(t => t[0]), x: [0, 240], xticks: [0, 50, 100, 150, 200], h: 270, xlabel: 'requests per GPU, N = min(link bound, HBM bound)', grid: 'x', label: 'Requests per GPU for each dictionary type kept resident for every block' });
    function calc(w, isNone) {
      const b = pow2(lb), extra = isNone ? 0 : REF.L / b * w, B = 4096, m = 0.134;
      const Nl = REF.W * REF.tpot / (m * REF.k * REF.NL * REF.e * (isNone ? 1 : rho));
      const Nh = REF.M / (REF.NL * REF.e * (B + extra));
      return { extra, Nl, Nh, N: Math.min(Nl, Nh), mb: extra * REF.NL * REF.e / 1e6 };
    }
    function draw() {
      const rows = TYPES.map(([name, w], i) => ({ name, w, ...calc(w, i === 0) }));
      const base = rows[0].N;
      P.clear();
      bars(P, rows.map(r => r.N), {
        horizontal: true,
        colors: i => (i === 0 ? 'var(--slate)' : rows[i].N >= base ? series(5) : 'var(--bad)'),
        labels: (v, i) => `${fmt(v, 0)}${i ? ` (${fmt(v / base, 2)}×)` : ''}, ${rows[i].Nl < rows[i].Nh ? 'link' : 'memory'}`,
        tip: (v, i) => `<b>${rows[i].name}</b><br>link bound ${fmt(rows[i].Nl, 0)} · HBM bound ${fmt(rows[i].Nh, 0)}`,
      });
      rule(P, { x: base });
      tbl.replaceChildren(table(['type', 'w', 'per layer', '÷ hot cache', 'per request'],
        rows.map((r, i) => ({ cells: [r.name, i ? r.w : '—', i ? fmt(r.extra, 0) : '0', i ? fmtPct(r.extra / 4096, 1) : '0 %', i ? `${fmt(r.mb, 1)} MB` : '—'], cls: i === 1 ? 'hl' : null })), { left: [0] }));
      ro.set([['block size', `${fmtSI(pow2(lb), 0)} tokens → ${fmt(REF.L / pow2(lb), 1)} blocks per layer`], ['hot cache', '4096 slots, miss rate 13.4 %'], ['every miss a δ-miss', `${tex('\\vfD = 1')}, no dictionary loads`]]);
    }
    draw();
  };

  // ================================================================== VII.15 — RoPE smears a structured pair of channels
  FIG.mbRopeSmear = (host) => {
    const T = 2048, r = rng('missed-b-rope');
    const pre = range(T).map(() => [5 + 0.25 * r.normal(), 1 + 0.25 * r.normal()]);
    let lth = -3, lb = 6, show = 'both';
    const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
    const spread = (pts, b) => {     // within-block spread: residual std after subtracting each block's own mean, per channel
      let ss = 0, n = 0;
      for (let j = 0; j + b <= pts.length; j += b) {
        const blk = pts.slice(j, j + b), m0 = mean(blk.map(p => p[0])), m1 = mean(blk.map(p => p[1]));
        blk.forEach(p => { ss += (p[0] - m0) ** 2 + (p[1] - m1) ** 2; n += 2; });
      }
      return Math.sqrt(ss / n);
    };
    const box = h('div'), ro = readout();
    host.append(controls(
      slider('speed θ (rad / token)', -4, 0, 0.05, lth, v => { lth = v; draw(); }, v => (Math.pow(10, v) < 0.01 ? Math.pow(10, v).toExponential(1) : fmt(Math.pow(10, v), 3))),
      slider('block size b', 4, 10, 1, lb, v => { lb = v; draw(); }, v => `${pow2(v)} tokens`),
      seg([['both', 'both'], ['pre', 'before RoPE'], ['post', 'after RoPE']], show, v => { show = v; draw(); }, 'Which keys')),
    legend([['before RoPE (one block)', 'var(--ink-3)', 'dot'], ['after RoPE (same block)', series(1), 'dot'], ['block mean = the loc prediction', series(0), 'dot'], ['after RoPE, all 2048 tokens', faint(series(1), 30), 'dot']]), box, ro);
    const P = Plot(box, { x: [-6.5, 6.5], y: [-6.5, 6.5], equal: true, h: 420, xlabel: 'channel c (first of the pair)', ylabel: 'channel c + 1', label: 'A pair of key channels before and after RoPE' });
    function draw() {
      const th = Math.pow(10, lth), b = pow2(lb);
      const post = pre.map((p, t) => rot(p, t * th));
      const j0 = Math.floor(1024 / b) * b, blkPre = pre.slice(j0, j0 + b), blkPost = post.slice(j0, j0 + b);
      P.clear();
      const g = P.g.data;
      if (show !== 'pre') post.forEach(p => el('circle', { cx: P.x(p[0]), cy: P.y(p[1]), r: 1.4 * P.fs, style: `fill:${faint(series(1), 22)}` }, g));
      if (show !== 'post') blkPre.forEach(p => el('circle', { cx: P.x(p[0]), cy: P.y(p[1]), r: 2.4 * P.fs, style: 'fill:var(--ink-3)' }, g));
      if (show !== 'pre') blkPost.forEach(p => el('circle', { cx: P.x(p[0]), cy: P.y(p[1]), r: 2.4 * P.fs, style: `fill:${series(1)}` }, g));
      const mark = blk => { const m = [mean(blk.map(p => p[0])), mean(blk.map(p => p[1]))]; dot(P.g.top, P.x(m[0]), P.y(m[1]), 6 * P.fs, series(0)); };
      if (show !== 'post') mark(blkPre);
      if (show !== 'pre') mark(blkPost);
      const sPre = spread(pre, b), sPost = spread(post, b);
      ro.set([
        ['one full turn every', `${fmtSI(2 * Math.PI / th, 1)} tokens`],
        ['spread around the block mean, before', fmt(sPre, 2)],
        ['after', fmt(sPost, 2)],
        ['extra bits per element (Gaussian estimate)', `<b>${fmt(Math.max(0, Math.log2(sPost / sPre)), 2)}</b>`],
      ]);
    }
    draw();
  };

  // ================================================================== VII.16 — the victim tier on the reuse-distance curve
  FIG.mbVictimTier = (host) => {
    let B = 2048, BV = 3200, rho = 0.65, l1 = false;
    const DICT = REF.L / 2048 * 2;            // loc dictionaries for every block (b = 2048, w = 2): needed to rebuild deltas
    const MEAS = [[2048, 0.30], [4096, 0.134], [8192, 0.067]];
    function cfg(B, BV, rho, l1) {
      const d = BV > 0 || l1 ? DICT : 0, H = B + rho * BV + d, C = B + BV, m = missPow(C), c = l1 ? rho : 1;
      const Nl = REF.W * REF.tpot / (m * REF.k * REF.NL * REF.e * c), Nh = REF.M / (REF.NL * REF.e * H), N = Math.min(Nl, Nh);
      const promos = (missPow(B) - m) * REF.k;
      const dec = N * (promos + (l1 ? m * REF.k : 0)) * REF.NL * REF.e / REF.tpot;
      return { H, C, m, mRaw: missPow(H), Nl, Nh, N, promos, dec };
    }
    const rawBest = (() => { let best = 0; for (let x = 2048; x <= 16384; x += 32) best = Math.max(best, cfg(x, 0, 1, false).N); return best; })();
    const box1 = h('div'), box2 = h('div');
    const tiles = { m: kpi('miss rate over the link', '', '', series(1)), H: kpi('GPU memory per request', '', '', series(3)), N: kpi('requests per GPU', '', ''), dec: kpi('decode on promotion', '', '', series(2)) };
    const bvS = slider(texify('victim tier $\\vBV$'), 0, 16384, 128, BV, v => { BV = v; draw(); }, v => `${fmtSI(v, 1)} deltas`);
    host.append(
      controls(seg([[2048, 'B = 2048 (= k)'], [4096, 'B = 4096'], [8192, 'B = 8192']], B, v => { B = v; draw(); }, 'Raw hot cache size'), bvS),
      controls(slider(texify('assumed $\\vrho$'), 0.4, 1, 0.05, rho, v => { rho = v; draw(); }), btn('misses move deltas too (lever 1)', (e, b) => { l1 = !l1; b.setAttribute('aria-pressed', String(l1)); draw(); }, { pressed: false, cls: 'sm' })),
      legend([['raw hot cache: hits', series(0), 'band'], ['victim tier: rebuilt on the GPU', 'var(--t-victim-tier)', 'band'], ['power law through HiSparse’s points', 'var(--ink-2)'], ['HiSparse, measured', series(1), 'dot'], ['Bélády at 4096', series(2), 'dot']]),
      h('div', { class: 'fig-row' }, box1, box2), h('div', { class: 'kpis' }, tiles.m, tiles.H, tiles.N, tiles.dec));
    const P1 = Plot(box1, { x: [1024, 32768], xlog: 2, y: [0.01, 0.6], ylog: 10, h: 300, xlabel: 'reuse distance = cache size (slots)', ylabel: 'miss rate m', xfmt: v => fmtSI(v, 0), yfmt: v => fmtPct(v, 0), yticks: [0.01, 0.02, 0.05, 0.1, 0.2, 0.5], label: 'Miss rate against cache size, with the raw cache and the victim tier marked' });
    const P2 = Plot(box2, { x: [0, 16384], y: [0, 200], h: 300, xlabel: 'victim-tier deltas B_V', ylabel: 'requests per GPU N', xfmt: v => fmtSI(v, 0), label: 'Requests per GPU against victim-tier size' });
    function draw() {
      const c = cfg(B, BV, rho, l1);
      P1.clear();
      const curve = linspace(10, 15, 80).map(e => [pow2(e), missPow(pow2(e))]);
      area(P1, [[1024, 0.01, 0.6], [B, 0.01, 0.6]], { color: series(0), opacity: 0.2 });
      if (BV > 0) area(P1, [[B, 0.01, 0.6], [Math.min(32768, B + BV), 0.01, 0.6]], { color: 'var(--t-victim-tier)', opacity: 0.18 });
      line(P1, curve, { color: 'var(--ink-2)', width: 2 });
      MEAS.forEach(([x, y]) => hover(dot(P1.g.top, P1.x(x), P1.y(y), 5 * P1.fs, series(1)), () => `<b>HiSparse, LRU</b><br>B = ${x}: ${fmtPct(y, 1)} misses`));
      hover(dot(P1.g.top, P1.x(4096), P1.y(0.082), 5 * P1.fs, series(2)), () => '<b>Bélády (clairvoyant)</b><br>B = 4096: 8.2 % misses');
      dot(P1.g.top, P1.x(Math.min(32768, c.C)), P1.y(c.m), 6.5 * P1.fs, accent);
      annotate(P1, Math.min(32768, c.C), c.m, `B + B_V: ${fmtPct(c.m, 1)}`, { dx: 26, dy: -34 });
      if (BV > 0) { dot(P1.g.top, P1.x(c.H), P1.y(c.mRaw), 4.5 * P1.fs, 'var(--ink-3)'); annotate(P1, c.H, c.mRaw, `raw cache, same memory:\n${fmtPct(c.mRaw, 1)}`, { dx: -40, dy: 70 }); }
      P2.clear();
      const xs = range(0, 16385, 256);
      line(P2, xs.map(x => [x, cfg(B, x, rho, l1).N]), { color: 'var(--t-victim-tier)', name: 'victim tier' });
      rule(P2, { y: rawBest, label: `best raw cache: ${fmt(rawBest, 0)}` });
      rule(P2, { y: cfg(4096, 0, 1, false).N, label: `HiSparse at 4096: ${fmt(cfg(4096, 0, 1, false).N, 0)}` });
      dot(P2.g.top, P2.x(BV), P2.y(c.N), 6.5 * P2.fs, accent);
      tiles.m.set(fmtPct(c.m, 1), `raw ${fmt(B, 0)} alone: ${fmtPct(missPow(B), 1)}`);
      tiles.H.set(`${fmt(c.H * REF.NL * REF.e / 1e6, 0)} MB`, `${fmt(c.H, 0)} slots’ worth per layer`);
      tiles.N.set(fmt(c.N, 0), `${c.Nl < c.Nh ? 'link' : 'memory'}-bound · ${fmt(c.N / rawBest, 2)}× best raw`);
      tiles.dec.set(`${fmt(c.dec / 1e9, 0)} GB/s`, `${fmt(c.promos, 0)} promotions per layer per step`);
    }
    draw();
  };

  // ================================================================== VII.17 — the decision table as a map
  FIG.mbDecisionMap = (host) => {
    let gx = 0.3, gy = 0.6;
    const ROWS = [
      { id: 'neg', name: 'negative', color: 'var(--slate)', poly: [[0, 0], [0.25, 0], [0, 0.25]], reading: '8-bit KV has no usable conditional structure', next: 'publish the negative (shuffle control, BF16 column); pivot to a global fixed-length miss-path coder', paper: '“How much conditional structure is left in 8-bit KV caches? (Not much.)”' },
      { id: 'marg', name: 'marginal', color: series(3), poly: [[0.25, 0], [0.75, 0], [0, 0.75], [0, 0.25]], reading: 'marginal: hinges on w, on the victim tier and on lever 2', next: 'run framework C; decide on the cost model', paper: 'the measurement plus the cost model, with the regime in which it pays' },
      { id: 'req', name: 'requestdiff', color: series(2), poly: [[0.75, 0], [1.5, 0], [1.5, 0.15], [0.6, 0.15]], reading: 'real, but per-request scale', next: 'wave 2 with request scope; framework C optional', paper: 'per-request dictionaries: a simpler system, a clean negative on block scale' },
      { id: 'hole', name: 'not in the table', color: 'var(--ink-3)', poly: [[0.6, 0.15], [1.5, 0.15], [1.5, 0.4], [0.35, 0.4]], reading: 'both scales contribute; the first draft’s table says nothing here', next: 'our proposal: treat as marginal — run C and let the cost model decide between request and block scope', paper: 'whichever scope the cost model picks' },
      { id: 'go', name: 'blockdiff', color: series(5), poly: [[0.35, 0.4], [1.5, 0.4], [1.5, 1.5], [0, 1.5], [0, 0.75]], reading: 'fallen-apple similarity is real and block-scale', next: 'wave 2 with block scope', paper: '“Lossless, scope-aware dictionary coding of 8-bit KV caches”' },
    ];
    const classify = (x, y) => { const s = x + y; if (s < 0.25) return ROWS[0]; if (s < 0.75) return ROWS[1]; if (y < 0.15) return ROWS[2]; if (y < 0.4) return ROWS[3]; return ROWS[4]; };
    const box = h('div'), ro = readout();
    host.append(legend(ROWS.map(r => [r.name, r.color, 'box'])), box, ro);
    const P = Plot(box, { x: [0, 1.5], y: [0, 1.5], h: 420, xlabel: 'request-scope gain g_req (bits per element)', ylabel: 'block-scope gain g_blk', label: 'The decision table of wave 1 as regions of the plane of the two scope gains' });
    ROWS.forEach(r => {
      const d = 'M' + r.poly.map(([x, y]) => `${P.x(x)} ${P.y(y)}`).join('L') + 'Z';
      el('path', { d, style: `fill:${faint(r.color, r.id === 'hole' ? 18 : 30)};stroke:${r.color};stroke-width:1` }, P.g.bg);
    });
    const pat = uid('mbhatch');
    const pt = el('pattern', { id: pat, width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, P.defs);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 8, style: 'stroke:var(--ink-3);stroke-width:1.5' }, pt);
    el('path', { d: 'M' + ROWS[3].poly.map(([x, y]) => `${P.x(x)} ${P.y(y)}`).join('L') + 'Z', style: `fill:url(#${pat});opacity:.5` }, P.g.bg);
    rule(P, { y: 0.1, label: 'shuffle floor ≈ 0.1 bit' });
    const knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
    draggable(knob, P, ([x, y]) => { gx = clamp(x, 0, 1.5); gy = clamp(y, 0, 1.5); draw(); }, null, { get: () => [gx, gy], step: [0.05, 0.05], label: 'the measured pair of scope gains' });
    function draw() {
      knob.setAttribute('cx', P.x(gx)); knob.setAttribute('cy', P.y(gy));
      const r = classify(gx, gy);
      ro.set([
        [`${tex('\\vgainreq')} + ${tex('\\vgainblk')}`, `${fmt(gx, 2)} + ${fmt(gy, 2)} = ${fmt(gx + gy, 2)} bits`],
        ['reading', r.reading], ['next', r.next], ['the paper', r.paper],
        ...(gy < 0.1 ? [['caution', 'block gain below the shuffle floor: indistinguishable from fitting noise']] : []),
      ]);
    }
    draw();
  };
})();
