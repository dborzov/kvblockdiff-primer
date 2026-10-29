/* Part VIII — The questions. Figures for the question and framework pages.
   Every figure here is SCHEMATIC: it shows the shapes an experiment could produce and how we
   would read them, from toy models with stated parameters. None of it is KV-cache data.
   Builders: qDecision (VIII.2), qBar (VIII.3), qDistance (VIII.5), qCurve (VIII.6),
   qReplay (VIII.7), qFrontier (VIII.8), qParkedMap (VIII.9), qAxes (VIII.10), qProbe (VIII.11). */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------ shared bits
  const schem = (txt) => h('div', { class: 'q-schem', html: txt || 'Schematic · no data yet' });
  const SOLO_BITS = 6.24;          // solo coding, ideal coder: ≈ 0.78 × 8 bits (II/VI: order-0 entropy 6.2–6.5)
  const FIX = 1.13;                // fixed-length overhead over the ideal rate (assumed: middle of the 10–15 % gap)

  // ================================================================ VIII.2 · the wave-1 decision rule
  FIG.qDecision = (host) => {
    let gr = 0.3, gb = 0.55;
    const box = h('div'), ro = readout();
    const sR = slider(texify('request-scope gain $\\vgainreq$'), 0, 1.5, 0.01, gr, v => { gr = v; draw(); }, v => `${fmt(v, 2)} bit`);
    const sB = slider(texify('block-scope gain $\\vgainblk$'), 0, 1.5, 0.01, gb, v => { gb = v; draw(); }, v => `${fmt(v, 2)} bit`);
    host.append(schem('Schematic · the decision rule, drawn before any data'), controls(sR, sB), box, ro);
    const P = Plot(box, {
      x: [0, 1.5], y: [0, 1.5], h: 400, xlabel: 'gain of a per-request dictionary (bits per element)',
      ylabel: 'extra gain of per-block dictionaries', label: 'Regions of the wave-1 decision rule over the two scope gains',
    });
    const REG = [
      { id: 'block', pts: [[0.35, 0.4], [1.5, 0.4], [1.5, 1.5], [0, 1.5], [0, 0.75]], color: 'var(--t-scope-block)', at: [0.95, 1.1], name: 'block scale',
        read: 'fallen-apple similarity is real, and it lives at block scale', next: 'wave 2 with block-scope dictionaries (frameworks C and D)' },
      { id: 'request', pts: [[0.75, 0], [1.5, 0], [1.5, 0.15], [0.6, 0.15]], color: 'var(--t-scope-request)', at: [1.08, 0.06], name: 'request scale',
        read: 'real, but at the scale of a whole request', next: 'wave 2 with one dictionary per request; framework C optional; a simpler system, still a paper' },
      { id: 'grey', pts: [[0.6, 0.15], [1.5, 0.15], [1.5, 0.4], [0.35, 0.4]], color: 'var(--slate)', at: [1.05, 0.27], name: 'the rule is silent',
        read: 'the rule as first written has no row for this corner', next: 'our reading: treat it as marginal — run framework C and let the cost model decide' },
      { id: 'marginal', pts: [[0.25, 0], [0.75, 0], [0, 0.75], [0, 0.25]], color: 'var(--saffron)', at: [0.3, 0.2], name: 'marginal',
        read: 'marginal: the verdict hinges on dictionary weight, the victim tier and lever 2', next: 'run framework C; decide on the cost model (framework D)' },
      { id: 'none', pts: [[0, 0], [0.25, 0], [0, 0.25]], color: 'var(--ink-3)', at: [0.065, 0.06], name: 'none',
        read: '8-bit KV has no usable conditional structure', next: 'publish the negative with its shuffle control; pivot to a global fixed-length coder for the miss path' },
    ];
    const regG = el('g', {}, P.g.data);
    REG.forEach(R => {
      const d = R.pts.map((p, i) => `${i ? 'L' : 'M'}${P.x(p[0]).toFixed(1)} ${P.y(p[1]).toFixed(1)}`).join('') + 'Z';
      R.path = el('path', { d, class: 'q-region', style: `fill:${R.color}` }, regG);
      svgText(P.g.top, P.x(R.at[0]), P.y(R.at[1]), R.name, { class: 'lbl', 'text-anchor': 'middle' });
    });
    const knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
    draggable(knob, P, ([x, y]) => { gr = +clamp(x, 0, 1.5).toFixed(2); gb = +clamp(y, 0, 1.5).toFixed(2); sR.set(gr); sB.set(gb); draw(); }, null,
      { get: () => [gr, gb], step: [0.01, 0.01], label: 'measured scope gains' });
    hover(knob, () => `<b>${fmt(gr, 2)} + ${fmt(gb, 2)} = ${fmt(gr + gb, 2)} bit</b> per element beyond a global dictionary`);
    const regionOf = (x, y) => {
      const s = x + y;
      if (s < 0.25) return REG[4];
      if (s < 0.75) return REG[3];
      if (y >= 0.4) return REG[0];
      if (y < 0.15) return REG[1];
      return REG[2];
    };
    const r2 = bits => 1 - Math.pow(2, -2 * bits);
    function draw() {
      knob.setAttribute('cx', P.x(gr)); knob.setAttribute('cy', P.y(gb));
      const R = regionOf(gr, gb);
      REG.forEach(Q => Q.path.classList.toggle('is-on', Q === R));
      ro.set([
        ['reading', R.read],
        ['next', R.next],
        ['the two gains need', `${fmtPct(r2(gr + gb), 0)} of the variance a global dictionary leaves, explained (block alone: ${fmtPct(r2(gb), 0)} of what the request leaves)`],
      ]);
    }
    draw();
  };

  // ================================================================ VIII.3 · the bar to clear
  FIG.qBar = (host) => {
    let mode = 'ideal', gain = 0.6, dict = 0.06;
    const box = h('div'), ro = readout();
    host.append(
      schem('Schematic · illustrative bits, no data yet'),
      controls(
        seg([['ideal', 'ideal entropy coder'], ['fixed', 'fixed-length GPU code']], mode, v => { mode = v; draw(); }, 'which rate'),
        slider('dictionary saves (vs solo, ideal)', 0, 2, 0.05, gain, v => { gain = v; draw(); }, v => `${fmt(v, 2)} bit`),
        slider(texify('dictionary cost $8\\vw/\\vb$'), 0, 1, 0.01, dict, v => { dict = v; draw(); }, v => `${fmt(v, 2)} bit`),
      ),
      legend([['delta (crosses the link on a miss)', 'var(--t-delta)', 'box'], ['dictionary, amortized (stored, resident)', 'var(--t-dictionary)', 'box']]),
      box, ro,
    );
    const CATS = ['raw 8-bit (HiSparse)', 'solo coding', 'dictionary + delta'];
    const P = Plot(box, { ycats: CATS, x: [0, 8.6], h: 230, xlabel: 'bits per element (raw = 8)', grid: 'x', label: 'Bits per element: raw, solo coding and a dictionary coder' });
    function rect(i, x0, x1, color, op) {
      const y0 = P.y(i - 0.27), y1 = P.y(i + 0.27);
      return el('rect', { x: P.x(x0), y: Math.min(y0, y1), width: Math.max(0, P.x(x1) - P.x(x0)), height: Math.abs(y1 - y0), rx: 3 * P.fs, style: `fill:${color};fill-opacity:${op || 1}` }, P.g.data);
    }
    function draw() {
      P.clear();
      const f = mode === 'ideal' ? 1 : FIX;
      const solo = SOLO_BITS * f;
      const delta = Math.max(0.3, (SOLO_BITS - gain) * f);
      const total = delta + dict;
      rect(0, 0, 8, 'var(--t-hisparse)', 0.85);
      rect(1, 0, solo, 'var(--t-solo)', 0.85);
      rect(2, 0, delta, 'var(--t-delta)', 0.9);
      rect(2, delta, total, 'var(--t-dictionary)', 0.9);
      [[0, 8], [1, solo], [2, total]].forEach(([i, v]) => svgText(P.g.top, P.x(v) + 6 * P.fs, P.y(i) + 4 * P.fs, fmt(v, 2), { class: 'val' }));
      rule(P, { x: solo, label: 'the bar to clear' });
      const rho = delta / 8;
      const verdict = total >= solo ? '<b>loses to solo</b> — ship solo coding, no dictionary'
        : delta >= solo ? 'smaller only if you ignore the dictionary' : `beats solo by ${fmt(solo - total, 2)} bit per element`;
      ro.set([
        [tex('\\vrho'), `${fmt(rho, 3)} (delta only)`],
        ['miss bytes vs raw', `÷ ${fmt(1 / rho, 2)}`],
        ['miss bytes vs solo', `÷ ${fmt(solo / delta, 2)}`],
        ['storage vs solo', verdict],
      ]);
    }
    draw();
  };

  // ================================================================ VIII.5 · bits versus distance
  FIG.qDistance = (host) => {
    // toy channel: x_t = request mean (share sReq) + local AR(1) part (share sLoc, decay length lam) + noise.
    // An affine predictor from one neighbour at distance Δ reaches R² = corr², corr = sReq + sLoc·exp(−Δ/λ).
    const PRE = {
      local: { name: 'fallen-apple world', sReq: 0.1, sLoc: 0.75, lam: 512 },
      request: { name: 'per-request world', sReq: 0.6, sLoc: 0, lam: 512 },
      none: { name: 'nothing world', sReq: 0, sLoc: 0, lam: 512 },
    };
    let cur = Object.assign({}, PRE.local), world = 'local';
    const bits = (s, D) => { const c = s.sReq + s.sLoc * Math.exp(-D / s.lam); return 0.5 * log2(1 / Math.max(1e-9, 1 - c * c)); };
    const xs = linspace(0, 15, 76).map(v => Math.pow(2, v));
    const box = h('div'), ro = readout();
    const sQ = slider('request share of variance', 0, 0.9, 0.01, cur.sReq, v => { cur.sReq = v; fix('q'); draw(); }, v => fmtPct(v, 0));
    const sL = slider('local share of variance', 0, 0.9, 0.01, cur.sLoc, v => { cur.sLoc = v; fix('l'); draw(); }, v => fmtPct(v, 0));
    const sT = slider(texify('decay length (tokens)'), 1, 13, 0.25, log2(cur.lam), v => { cur.lam = Math.pow(2, v); draw(); }, v => fmt(Math.pow(2, v), 0));
    const pick = seg([['local', 'fallen-apple'], ['request', 'per-request'], ['none', 'nothing']], world, v => {
      world = v; cur = Object.assign({}, PRE[v]); sQ.set(cur.sReq); sL.set(cur.sLoc); sT.set(log2(cur.lam)); draw();
    }, 'which world');
    function fix(which) {      // shares cannot exceed 98 % together; the rest is noise
      if (cur.sReq + cur.sLoc > 0.98) { if (which === 'q') { cur.sLoc = 0.98 - cur.sReq; sL.set(cur.sLoc); } else { cur.sReq = 0.98 - cur.sLoc; sQ.set(cur.sReq); } }
    }
    host.append(schem('Schematic · a toy channel model, no KV data'), controls(pick, sQ, sL, sT),
      legend([['your world', 'var(--c)'], ['fallen-apple world', 'var(--t-fallen-apple)', 'dash'], ['per-request world', 'var(--t-scope-request)', 'dash'], ['nothing world', 'var(--ink-3)', 'dash'], ['after shuffling', 'var(--carmine)', 'dot']]),
      box, ro);
    const P = Plot(box, { x: [1, 32768], xlog: 2, y: [0, 1.6], h: 340, xticks: [1, 4, 16, 64, 256, 1024, 4096, 32768], xfmt: v => v >= 1024 ? `${v / 1024}K` : String(v),
      xlabel: 'token distance Δ to the neighbour', ylabel: 'bits saved per element', label: 'Bits saved by a neighbour against token distance' });
    crosshair(P, { xname: 'Δ =', xfmt: v => `${fmt(v, 0)} tokens`, yfmt: v => `${fmt(v, 3)} bit` });
    function draw() {
      P.clear();
      ['local', 'request', 'none'].forEach(k => line(P, xs.map(D => [D, bits(PRE[k], D)]), {
        color: k === 'local' ? 'var(--t-fallen-apple)' : k === 'request' ? 'var(--t-scope-request)' : 'var(--ink-3)', dash: '5 5', width: 1.6, name: PRE[k].name,
      }));
      line(P, xs.map(D => [D, 0]), { color: 'var(--carmine)', dash: '1.5 4', width: 2.4, name: 'after shuffling' });
      const pts = xs.map(D => [D, bits(cur, D)]);
      line(P, pts, { color: 'var(--c)', width: 3.2, name: 'your world' });
      const near = bits(cur, 1), far = bits(cur, 32768), half = cur.lam * Math.LN2;
      if (cur.sLoc > 0.02 && half >= 1 && half <= 32768) {
        rule(P, { x: half, label: `half-decay ≈ ${fmt(half, 0)} tokens`, color: 'var(--ink-3)' });
      }
      let reading;
      if (near < 0.05) reading = 'flat near zero: neighbours do not help at this precision — a negative Q1';
      else if (near - far > 0.1) reading = far > 0.05
        ? `decays to a positive floor: local (fallen-apple) similarity on top of per-request structure; natural block scale ≈ ${fmt(half, 0)} tokens`
        : `decays to zero: fallen-apple similarity; natural block scale ≈ ${fmt(half, 0)} tokens`;
      else reading = 'flat but positive: structure shared across the whole request, not local — per-request dictionaries, not block ones';
      ro.set([['at Δ = 1', `${fmt(near, 2)} bit`], ['at Δ = 32K', `${fmt(far, 2)} bit`], ['reading', reading]]);
    }
    draw();
  };

  // ================================================================ VIII.6 · the compressibility curve and its roofline
  FIG.qCurve = (host) => {
    const D_EL = 640;                       // elements per entry (reference setting)
    const ZERO = 1.6e-5;                    // where "no dictionary" (x = 0) is drawn on the log axis
    let world = 'corr', mode = 'ideal', lb = 12;   // b = 2^lb
    // schematic gains in bits per element over solo, per world; loosely shaped after the VI.7 Monte Carlo
    const FAM = [
      { id: 'loc', name: 'loc', color: 'var(--t-loc)', set: [
        { hp: 'location only', w: 1, g: { corr: 0.2, clus: 0.22, none: 0.01 } },
        { hp: 'location + scale', w: 2, g: { corr: 0.26, clus: 0.28, none: 0.015 } }] },
      { id: 'klt', name: 'KLT, rank r', color: 'var(--t-klt)', set: [4, 8, 16, 32, 64, 320].map(r => ({
        hp: r === 320 ? 'full basis (bound)' : `rank ${r}`, w: 2 * r, g: { corr: 0.26 + 0.36 * (1 - Math.exp(-r / 12)), clus: 0.28 + 0.4 * (1 - Math.exp(-r / 12)), none: 0.0 } })) },
      { id: 'vq', name: 'VQ, C centroids', color: 'var(--t-vq)', set: [16, 64, 256, 1024, 4096].map(C => ({
        hp: `C = ${C}`, w: C, side: log2(C) / D_EL, g: { corr: 0.26 + 0.16 * Math.min(1, log2(C) / 12), clus: 0.28 + 1.3 * Math.min(1, log2(C) / 10), none: 0.0 } })) },
      { id: 'sib', name: 'sib', color: 'var(--t-sib)', set: [{ hp: 'nearest sibling', w: 0, sideB: true, g: { corr: -0.15, clus: 0.55, none: -0.5 } }] },
    ];
    const WORLDS = { corr: 'correlated, bell-shaped', clus: 'clustered', none: 'no structure' };
    const box = h('div'), ro = readout();
    const sB = slider(texify('block size $\\vb$'), 9, 15, 1, lb, v => { lb = v; draw(); }, v => `${fmt(Math.pow(2, v), 0)} tokens`);
    host.append(
      schem('Schematic · invented point clouds, no data yet'),
      controls(
        seg([['corr', 'correlated data'], ['clus', 'clustered data'], ['none', 'no structure']], world, v => { world = v; draw(); }, 'which world'),
        seg([['ideal', 'ideal coder'], ['fixed', 'fixed-length']], mode, v => { mode = v; draw(); }, 'which rate'),
        sB),
      legend([
        ...FAM.map(f => [f.name, f.color, 'dot']),
        ['roofline', 'var(--t-curve)'], ['pays for itself vs solo', 'var(--good)', 'band'],
      ]),
      box, ro,
    );
    const P = Plot(box, {
      x: [1e-5, 10], xlog: true, y: [0.4, 1.06], h: 400,
      xticks: [ZERO, 1e-4, 1e-3, 1e-2, 1e-1, 1, 10], xfmt: v => (v === ZERO ? '0' : v >= 1 ? String(v) : String(+v.toPrecision(1))),
      xlabel: 'dictionary cost per entry, w / b (entries’ worth)', ylabel: 'delta ratio ρ', label: 'The compressibility curve: delta size against dictionary cost',
    });
    // axis break between "0" and the log part
    const bx = P.x(3.2e-5), by = P.H - P.m.b;
    el('path', { d: `M${bx - 5 * P.fs} ${by + 5 * P.fs}l${6 * P.fs} ${-10 * P.fs}M${bx} ${by + 5 * P.fs}l${6 * P.fs} ${-10 * P.fs}`, class: 'q-break' }, P.g.axes);
    const tipFor = (f, s, x, y) => `<b>${f.name} · ${s.hp}</b><br>w = ${s.w} entries’ worth, b = ${Math.pow(2, lb)}<br>dictionary ${x === ZERO ? '0' : fmt(x, 4)} + delta ${fmt(y, 3)} = <b>${fmt((x === ZERO ? 0 : x) + y, 3)}</b> of an entry<br>= ${fmt(8 * ((x === ZERO ? 0 : x) + y), 2)} bits per element`;
    function draw() {
      P.clear();
      const b = Math.pow(2, lb), f = mode === 'ideal' ? 1 : FIX;
      const solo = SOLO_BITS * f / 8;
      const loc = 0.6 + 0.4 * 2048 / (2048 + b);       // smaller blocks fit a little better (schematic)
      // break-even region: total = x + ρ < solo
      const xs = [ZERO, ...linspace(-5, log2(solo * 0.999) / log2(10), 80).map(v => Math.pow(10, v))];
      area(P, xs.map(x => [x, 0.4, Math.max(0.4, solo - (x === ZERO ? 0 : x))]), { color: 'var(--good)', opacity: 0.1 });
      rule(P, { y: 1, label: 'raw entries (HiSparse)' });
      rule(P, { y: solo, label: `solo coding · ${fmt(solo, 2)}`, color: 'var(--t-solo)' });
      const pts = [];
      FAM.forEach(fm => fm.set.forEach(s => {
        const g0 = s.g[world], g = g0 > 0 ? g0 * loc : g0;
        const side = (s.side || 0) + (s.sideB ? lb / D_EL : 0);
        const y = (Math.max(0.3, SOLO_BITS - g) * f + side) / 8;
        const x = s.w ? s.w / b : ZERO;
        pts.push({ f: fm, s, x, y });
      }));
      // roofline: best ρ reachable at each dictionary budget (a staircase), starting from solo at x = 0
      const sorted = [{ x: ZERO, y: solo }, ...pts].sort((a, c) => a.x - c.x);
      const roof = []; let best = Infinity;
      sorted.forEach(p => { if (p.y < best) { best = p.y; roof.push([p.x, p.y]); } });
      roof.push([10, best]);
      line(P, roof, { color: 'var(--t-curve)', width: 3, curve: 'step' });
      pts.forEach(p => {
        const c = dot(P.g.data, P.x(p.x), P.y(Math.min(1.05, p.y)), 5.5 * P.fs, p.f.color, { tabindex: 0 });
        hover(c, () => tipFor(p.f, p.s, p.x, p.y));
      });
      dot(P.g.top, P.x(ZERO), P.y(1), 6.5 * P.fs, 'var(--t-hisparse)');
      dot(P.g.top, P.x(ZERO), P.y(solo), 6.5 * P.fs, 'var(--t-solo)');
      svgText(P.g.top, P.x(ZERO) + 10 * P.fs, P.y(1) + 16 * P.fs, 'HiSparse (0, 1)', { class: 'lbl' });
      svgText(P.g.top, P.x(ZERO) + 10 * P.fs, P.y(solo) + 16 * P.fs, `solo (0, ${fmt(solo, 2)})`, { class: 'lbl' });
      const cand = pts.map(p => ({ ...p, tot: (p.x === ZERO ? 0 : p.x) + p.y })).sort((a, c) => a.tot - c.tot)[0];
      const light = Math.min(solo, ...pts.filter(p => p.x === ZERO || p.x <= 0.01).map(p => p.y));
      ro.set([
        ['world', WORLDS[world]],
        ['best total', cand.tot < solo ? `${cand.f.name} · ${cand.s.hp}: ${fmt(8 * cand.tot, 2)} bits per element, ${fmt(8 * (solo - cand.tot), 2)} below solo` : 'nothing beats solo coding'],
        ['roofline at w/b ≤ 0.01', `ρ = ${fmt(light, 3)}`],
      ]);
    }
    draw();
  };

  // ================================================================ VIII.7 · trace replay toy
  FIG.qReplay = (host) => {
    const L = 2048, K = 32, B = 64, T = 110, WARM = 30, SHOW = 48;
    let conc = 0.6, b = 256, nD = 4, seed = 7, trace = null, traceKey = '';
    function makeTrace() {
      const r = rng('q-replay-' + seed);
      const u = new Float64Array(L); for (let p = 0; p < L; p++) u[p] = r.normal();
      let c = [0, 1, 2].map(() => r.uniform(0, L));
      const phi = 0.97, inn = Math.sqrt(1 - phi * phi), sc = new Float64Array(L), idx = range(L), out = [];
      for (let t = 0; t < T; t++) {
        for (let p = 0; p < L; p++) u[p] = phi * u[p] + inn * r.normal();
        c = c.map(x => (r() < 0.03 ? r.uniform(0, L) : clamp(x + r.normal(0, 4), 0, L - 1)));
        for (let p = 0; p < L; p++) {
          let bump = 0;
          for (const x of c) { const z = (p - x) / 24; bump += Math.exp(-0.5 * z * z); }
          sc[p] = (1 - conc) * u[p] + conc * 3 * bump;
        }
        out.push(idx.slice().sort((a, q) => sc[q] - sc[a]).slice(0, K));
      }
      return out;
    }
    function replay(bb, nn, keep) {
      const cache = new Map(); let dres = new Set();
      let miss = 0, dm = 0, sel = 0, loads = 0, steps = 0;
      const log = [];
      trace.forEach((S, t) => {
        const Ss = new Set(S), rec = { hit: [], dm: [], rm: [], res: [...dres] };
        for (const p of S) {
          if (cache.has(p)) { rec.hit.push(p); continue; }
          (dres.has(Math.floor(p / bb)) ? rec.dm : rec.rm).push(p);
          if (cache.size >= B) for (const v of cache.keys()) if (!Ss.has(v)) { cache.delete(v); break; }
          cache.set(p, 1);
        }
        S.forEach(p => { cache.delete(p); cache.set(p, 1); });       // selected entries become the most recent
        const cnt = new Map();
        for (const p of cache.keys()) { const j = Math.floor(p / bb); cnt.set(j, (cnt.get(j) || 0) + 1); }
        const heavy = [...cnt.entries()].sort((a, q) => q[1] - a[1] || a[0] - q[0]).slice(0, nn).map(e => e[0]);
        heavy.push(...[...dres].filter(j => !heavy.includes(j)).slice(0, nn - heavy.length));   // keep old ones while there is room
        rec.loads = heavy.filter(j => !dres.has(j)).length;
        dres = new Set(heavy);
        if (t >= WARM) { miss += rec.dm.length + rec.rm.length; dm += rec.dm.length; sel += S.length; loads += rec.loads; steps++; }
        if (keep) log.push(rec);
      });
      return { m: miss / sel, fD: dm / Math.max(1, miss), nload: loads / steps, log };
    }
    const D = h('div'), small = h('div');
    const tiles = {
      m: kpi('token miss rate ' + tex('\\vm'), '', 'hot cache of 2k slots', 'var(--t-hot-cache)'),
      fD: kpi('δ-miss fraction ' + tex('\\vfD'), '', '', 'var(--t-delta-miss)'),
      nl: kpi('loads per step ' + tex('\\vnload'), '', 'dictionaries', 'var(--t-dictionary-cache)'),
    };
    const verdict = h('div', { class: 'readout' });
    const sC = slider('concentration into hot spots', 0, 1, 0.05, conc, v => { conc = v; draw(); }, v => fmtPct(v, 0));
    const sN = slider(texify('resident dictionaries $\\vnD$'), 1, 8, 1, nD, v => { nD = v; draw(); });
    host.append(
      schem('Toy trace · a made-up indexer, not a real one'),
      controls(sC, seg([[64, 'b = 64'], [128, 'b = 128'], [256, 'b = 256']], b, v => { b = v; draw(); }, 'block size'), sN,
        btn('New trace', () => { seed++; draw(); })),
      legend([['hit', 'var(--ink-3)', 'box'], ['δ-miss', 'var(--t-delta-miss)', 'dot'], ['raw miss', 'var(--t-raw-miss)', 'dot'], ['dictionary resident', 'var(--t-dictionary-cache)', 'band']]),
      D, h('div', { class: 'kpis' }, tiles.m, tiles.fD, tiles.nl), verdict, small);
    const DG = Diagram(D, { w: 640, h: 300, label: 'Selections of a toy indexer over 48 decode steps, by position, with misses and resident dictionaries' });
    const g = el('g', {}, DG.svg);
    const left = 46 * DG.fs, top = 10, bot = DG.H - 26 * DG.fs, right = DG.W - 8;
    const colW = (right - left) / SHOW, yOf = p => top + (bot - top) * p / L;
    const SP = Plot(small, { x: [1, 8], y: [0, 1], h: 210, xticks: range(1, 9), xlabel: 'resident dictionaries per layer n_D', ylabel: 'δ-miss fraction', label: 'δ-miss fraction against number of resident dictionaries' });
    function draw() {
      const key = `${seed}|${conc}`;
      if (key !== traceKey) { trace = makeTrace(); traceKey = key; }
      const res = replay(b, nD, true);
      g.replaceChildren();
      for (let j = 0; j < L / b; j++) if (j % 2) el('rect', { x: left, y: yOf(j * b), width: right - left, height: yOf(b) - top, class: 'q-band' }, g);
      res.log.slice(T - SHOW).forEach((rec, i) => {
        const x = left + i * colW;
        rec.res.forEach(j => el('rect', { x, y: yOf(j * b), width: colW, height: yOf(b) - top, class: 'q-res' }, g));
        rec.hit.forEach(p => el('rect', { x: x + colW * 0.2, y: yOf(p) - 1, width: colW * 0.6, height: 2.2, class: 'q-hit' }, g));
        rec.dm.forEach(p => el('circle', { cx: x + colW / 2, cy: yOf(p), r: 2.6 * DG.fs, class: 'q-dm' }, g));
        rec.rm.forEach(p => el('circle', { cx: x + colW / 2, cy: yOf(p), r: 2.6 * DG.fs, class: 'q-rm' }, g));
      });
      svgText(g, left - 6 * DG.fs, top + 10 * DG.fs, '0', { class: 'lbl', 'text-anchor': 'end' });
      svgText(g, left - 6 * DG.fs, bot, String(L), { class: 'lbl', 'text-anchor': 'end' });
      svgText(g, left - 30 * DG.fs, (top + bot) / 2, 'position', { class: 'lbl', 'text-anchor': 'middle', transform: `rotate(-90 ${left - 30 * DG.fs} ${(top + bot) / 2})` });
      svgText(g, (left + right) / 2, DG.H - 6 * DG.fs, `decode step → (last ${SHOW} of ${T}; ${L / b} blocks of ${b})`, { class: 'lbl', 'text-anchor': 'middle' });
      tiles.m.set(fmtPct(res.m, 1));
      tiles.fD.set(fmtPct(res.fD, 0), `with ${nD} of ${L / b} blocks`);
      tiles.nl.set(fmt(res.nload, 2), 'dictionaries per step');
      let v;
      if (nD >= L / b) v = 'there is a slot for every block: once touched, every dictionary stays resident — the "light, all-resident dictionaries" regime';
      else if (res.fD >= 0.8 && res.nload <= 0.1) v = 'misses concentrate and blocks stay heavy: heavy dictionaries would be affordable';
      else if (res.fD >= 0.8) v = 'misses concentrate, but the heavy blocks change often: affordable only for light dictionaries (loads cost w each)';
      else if (res.fD < 0.5) v = 'misses are spread over many blocks: only light all-resident or per-request dictionaries remain viable';
      else v = 'in between: the verdict depends on dictionary weight and the cost model';
      verdict.innerHTML = `<span><b>reading</b>${v}</span>`;
      SP.clear();
      const curve = range(1, 9).map(n => [n, replay(b, n, false).fD]);
      rule(SP, { y: 0.8, label: 'f_D = 0.8', color: 'var(--ink-3)' });
      rule(SP, { y: 0.5, label: '0.5', color: 'var(--ink-3)' });
      line(SP, curve, { color: 'var(--t-delta-miss)', markers: true, tip: p => `n_D = ${p[0]}: f_D = ${fmtPct(p[1], 0)}` });
      const c = curve[nD - 1];
      dot(SP.g.top, SP.x(c[0]), SP.y(c[1]), 7 * SP.fs, 'var(--c)');
    }
    draw();
  };

  // ================================================================ VIII.8 · requests per GPU
  FIG.qFrontier = (host) => {
    const k = 2048, NL = 78, e = 640, TPOT = 0.030;
    let W = 50, M = 30, rho = 0.75, fD = 0.85, showVictim = true;
    const m = Bs => 0.134 * Math.pow(Bs / 4096, -1.08);          // HiSparse's three points, power-law fit (III.9)
    const Bgrid = linspace(log2(2048), log2(16384), 121).map(v => Math.pow(2, v));
    const BVgrid = [0, ...linspace(6, 15, 37).map(v => Math.pow(2, v))];
    function N(Bs, o) {
      const T = m(Bs + (o.BV || 0)) * k * NL * e * (o.fD * o.rho + (1 - o.fD)) + (o.nload || 0) * NL * (o.w || 0) * e;
      const Nl = W * 1e9 * TPOT / T;
      const Mr = NL * e * ((o.slot || 1) * Bs + o.rho * (o.BV || 0) + (o.wres || 0));
      return Math.min(Nl, M * 1e9 / Mr);
    }
    const SYS = [
      { id: 'his', name: 'HiSparse', color: 'var(--t-hisparse)', f: Bs => N(Bs, { rho: 1, fD: 1 }) },
      { id: 'req', name: 'lever 1 · request scope (w = 256)', color: 'var(--t-scope-request)', f: Bs => N(Bs, { rho, fD: 1, wres: 256 }) },
      { id: 'blk', name: 'lever 1 · block scope, 4 resident (w = 32)', color: 'var(--t-scope-block)', f: Bs => N(Bs, { rho, fD, nload: 0.1, w: 32, wres: 128 }) },
      { id: 'vic', name: 'lever 1 + victim tier (best size)', color: 'var(--t-victim-tier)', f: Bs => Math.max(...BVgrid.map(BV => N(Bs, { rho, fD: 1, wres: 256, BV }))) },
      { id: 'lv2', name: 'levers 1 + 2 · deltas in the hot cache', color: 'var(--t-kv-blockdiff)', f: Bs => N(Bs, { rho, fD: 1, wres: 256, slot: rho }) },
    ];
    const box = h('div'), tbl = h('div');
    host.append(
      schem('Schematic · assumed ρ and f<sub>D</sub>, reference setting otherwise'),
      controls(
        slider('link bandwidth', 25, 450, 5, W, v => { W = v; draw(); }, v => `${v} GB/s`),
        slider('GPU memory for KV', 10, 80, 1, M, v => { M = v; draw(); }, v => `${v} GB`),
        slider(texify('delta ratio $\\vrho$'), 0.4, 1, 0.01, rho, v => { rho = v; draw(); }),
        slider(texify('$\\vfD$ (block scope)'), 0, 1, 0.01, fD, v => { fD = v; draw(); }),
        btn('victim tier', (ev, b) => { showVictim = !showVictim; b.setAttribute('aria-pressed', String(showVictim)); draw(); }, { pressed: showVictim })),
      legend(SYS.map(s => [s.name, s.color])),
      box, tbl,
    );
    const P = Plot(box, { x: [2048, 16384], xlog: 2, y: [0, 320], h: 380, xticks: [2048, 4096, 8192, 16384], xfmt: v => `${v / 1024}K`,
      xlabel: 'hot-cache slots per layer B', ylabel: 'requests per GPU N', label: 'Requests per GPU against hot-cache size for HiSparse and kv-blockdiff variants' });
    crosshair(P, { xname: 'B =', xfmt: v => fmt(v, 0), yfmt: v => fmt(v, 0) });
    function draw() {
      P.clear();
      P.series.length = 0;
      el('rect', { x: P.x(8192), y: P.m.t, width: P.x(16384) - P.x(8192), height: P.ph, class: 'q-extrap' }, P.g.data);
      svgText(P.g.data, P.x(11585), P.m.t + 14 * P.fs, 'extrapolated m(B)', { class: 'lbl', 'text-anchor': 'middle' });
      const rows = [];
      let base = null, top = 0;
      const curves = SYS.filter(s => s.id !== 'vic' || showVictim).map(s => {
        const pts = Bgrid.map(Bs => [Bs, s.f(Bs)]);
        const bi = pts.reduce((a, p, i) => (p[1] > pts[a][1] ? i : a), 0);
        top = Math.max(top, ...pts.map(p => p[1]));
        return { s, pts, best: pts[bi] };
      });
      P.domain({ y: [0, Math.max(160, Math.ceil(top * 1.12 / 20) * 20)] });
      curves.forEach(({ s, pts, best }) => {
        line(P, pts, { color: s.color, width: s.id === 'his' ? 3 : 2.4, name: s.name });
        dot(P.g.top, P.x(best[0]), P.y(best[1]), 5.5 * P.fs, s.color);
        if (s.id === 'his') base = best[1];
        rows.push([`<i class="q-key" style="--kc:${s.color}"></i>${s.name}`, fmt(best[0], 0), fmt(best[1], 0), base ? `${(best[1] / base).toFixed(2)}×` : '—']);
      });
      tbl.replaceChildren(table(['system, each at its own best B', 'best B', 'N', 'vs HiSparse'], rows, { left: [0] }));
    }
    draw();
  };

  // ================================================================ VIII.9 · the parked shelf at a glance
  FIG.qParkedMap = (host) => {
    // positions are our judgement (cost to test, odds of a useful answer), not data
    const Q = [
      { s: 'indexer keys as a free dictionary', x: 0.72, y: 0.35, p: 0 },
      { s: 'anchor entries', x: 0.15, y: 0.3, p: 0 },
      { s: 'shared prefixes', x: 0.82, y: 0.6, p: 0 },
      { s: 'rate allocation', x: 0.22, y: 0.78, p: 0 },
      { s: 'upstairs groups', x: 0.32, y: 0.38, p: 1 },
      { s: 'GQA heads alike?', x: 0.12, y: 0.22, p: 1 },
      { s: 'prefill vs generated', x: 0.25, y: 0.55, p: 1 },
      { s: 'surprising misses', x: 0.5, y: 0.5, p: 1 },
      { s: 'automated search', x: 0.6, y: 0.17, p: 2 },
      { s: 'compressibility as a probe', x: 0.08, y: 0.68, p: 2 },
    ];
    const PAGES = ['VIII.9 dictionaries', 'VIII.10 measurements', 'VIII.11 automation & probes'];
    const box = h('div');
    host.append(schem('Our judgement · not data'), legend(PAGES.map((p, i) => [p, series(i), 'dot'])), box);
    const P = Plot(box, { x: [0, 1], y: [0, 1], h: 380, xticks: [0, 0.5, 1], yticks: [0, 0.5, 1], xfmt: v => (v === 0 ? 'cheap' : v === 1 ? 'costly' : ''), yfmt: v => (v === 0 ? 'long shot' : v === 1 ? 'likely' : ''),
      xlabel: 'cost to test', ylabel: 'odds of a useful answer', label: 'Parked questions placed by cost to test and odds of a useful answer' });
    svgText(P.g.bg, P.x(0.03), P.y(0.95), 'cheap and promising:\ndo these first', { class: 'annot' });
    svgText(P.g.bg, P.x(0.97), P.y(0.06), 'costly long shots', { class: 'annot', 'text-anchor': 'end' });
    Q.forEach(q => {
      const c = dot(P.g.data, P.x(q.x), P.y(q.y), 6.5 * P.fs, series(q.p), { tabindex: 0 });
      hover(c, () => `<b>${q.s}</b><br>${PAGES[q.p]}`);
      const right = q.x < 0.62;
      svgText(P.g.top, P.x(q.x) + (right ? 10 : -10) * P.fs, P.y(q.y) + 4 * P.fs, q.s, { class: 'lbl', 'text-anchor': right ? 'start' : 'end' });
    });
  };

  // ================================================================ VIII.10 · neighbours along the axes of the KV tensor
  FIG.qAxes = (host) => {
    let mode = 'token';
    const NT = 12, NLY = 5;
    const TXT = {
      token: 'Fallen-apple similarity: the same layer, a few tokens back (Δ = 1, 2, 4). Framework A measures exactly this.',
      layer: 'Upstairs similarity: the same token, one floor down. If strong, one dictionary could serve a group of layers.',
      head: 'A possible third neighbour: the same token and layer, another key/value head. Only exists where heads are stored separately (not in MLA).',
      split: 'Not a neighbour but a split: prompt tokens (prefill) versus tokens the model wrote itself. Same curves, measured on each side.',
    };
    const cap = h('div', { class: 'readout' });
    const box = h('div');
    host.append(schem('Diagram · one request, a few tokens, layers and two heads'),
      controls(seg([['token', 'token axis'], ['layer', 'layer axis'], ['head', 'head axis'], ['split', 'prefill vs generated']], mode, v => { mode = v; draw(); }, 'which neighbour')),
      box, cap);
    const D = Diagram(box, { w: 640, h: 270, label: 'Grid of entries by token, layer and head with the neighbour of the selected question highlighted', grow: 0.5 });
    const g = el('g', {}, D.svg);
    const cw = 38, ch = 34, x0 = 92, y0 = 50, off = 16;
    const cell = (t, l, hd) => ({ x: x0 + t * cw + hd * off, y: y0 + (NLY - 1 - l) * ch - hd * off });
    function draw() {
      g.replaceChildren();
      const T0 = 9, L0 = 2;
      [1, 0].forEach(hd => {
        for (let l = 0; l < NLY; l++) for (let t = 0; t < NT; t++) {
          const { x, y } = cell(t, l, hd);
          let cls = hd ? 'q-cell back' : 'q-cell';
          if (mode === 'split' && hd === 0) cls += t >= 8 ? ' gen' : ' pre';
          if (hd === 0 && t === T0 && l === L0) cls += ' me';
          if (mode === 'token' && hd === 0 && l === L0 && [T0 - 1, T0 - 2, T0 - 4].includes(t)) cls += ' nb nb' + (T0 - t);
          if (mode === 'layer' && hd === 0 && t === T0 && l === L0 - 1) cls += ' nb up';
          if (mode === 'head' && hd === 1 && t === T0 && l === L0) cls += ' nb hd';
          el('rect', { x, y, width: cw - 4, height: ch - 4, rx: 4, class: cls }, g);
        }
      });
      const me = cell(T0, L0, 0);
      svgText(g, me.x + (cw - 4) / 2, me.y + ch / 2 + 2, 'E', { class: 'mono q-me-t', 'text-anchor': 'middle' });
      if (mode === 'token') [1, 2, 4].forEach(dd => { const c = cell(T0 - dd, L0, 0); svgText(g, c.x + (cw - 4) / 2, c.y + ch / 2 + 2, `Δ${dd}`, { class: 'mono q-small', 'text-anchor': 'middle' }); });
      if (mode === 'split') {
        const a = cell(0, NLY - 1, 0), bb = cell(8, NLY - 1, 0);
        svgText(g, a.x, a.y - 30, 'prefill (the prompt)', { class: 'lbl' });
        svgText(g, bb.x, bb.y - 30, 'generated', { class: 'lbl' });
      }
      const bl = cell(0, 0, 0);
      svgText(g, x0, bl.y + ch + 16, 'tokens →', { class: 'lbl' });
      svgText(g, x0 - 12, y0 + ch * 2, 'layers ↑', { class: 'lbl', 'text-anchor': 'end' });
      const tr = cell(NT - 1, NLY - 1, 1);
      svgText(g, tr.x + cw - 4, tr.y - 6, 'second head (behind)', { class: 'lbl', 'text-anchor': 'end' });
      cap.innerHTML = `<span><b>${{ token: 'token axis', layer: 'layer axis', head: 'head axis', split: 'a split' }[mode]}</b>${TXT[mode]}</span>`;
    }
    draw();
  };

  // ================================================================ VIII.11 · compressibility as a probe
  FIG.qProbe = (host) => {
    let pat = 'graded';
    const NLY = 12, DS = range(0, 16).map(v => Math.pow(2, v));
    const PAT = {
      graded: { amp: l => 0.9, lam: l => Math.pow(2, 2 + 0.85 * l), read: 'Deeper layers keep their state for longer: their bits fade over thousands of tokens, early layers over a few. Long blocks would suit deep layers, short ones early layers.' },
      uniform: { amp: l => 0.6, lam: l => 256, read: 'Every layer looks alike: one block size for the whole stack, and the probe says little about what layers store.' },
      few: { amp: l => ([3, 4, 9].includes(l) ? 1.1 : 0.12), lam: l => ([3, 4, 9].includes(l) ? 2048 : 16), read: 'A few layers carry slowly varying state; the rest are token-by-token detail. Dictionaries (and HBM) would go to those few layers.' },
    };
    const bits = (l, D) => PAT[pat].amp(l) * Math.exp(-D / PAT[pat].lam(l));
    const box = h('div'), ro = readout();
    host.append(schem('Schematic · three invented patterns, no data'),
      controls(seg([['graded', 'graded with depth'], ['uniform', 'all layers alike'], ['few', 'a few layers']], pat, v => { pat = v; draw(); }, 'which pattern')),
      box, ro);
    const D = Diagram(box, { w: 640, h: 300, label: 'Heat map of bits saved by layer and token distance (invented)' });
    const g = el('g', {}, D.svg);
    const lx = 70, rx = 620, ty = 12, by = 252;
    const cw = (rx - lx) / DS.length, chh = (by - ty) / NLY;
    function draw() {
      g.replaceChildren();
      for (let l = 0; l < NLY; l++) DS.forEach((Dd, i) => {
        const v = bits(l, Dd);
        const r = el('rect', { x: lx + i * cw, y: by - (l + 1) * chh, width: cw - 1, height: chh - 1, class: 'q-heat', style: `fill:color-mix(in srgb, var(--t-curve) ${Math.round(100 * Math.min(1, v / 1.1))}%, var(--paper-3))`, tabindex: 0 }, g);
        hover(r, () => `<b>layer ${l}</b>, Δ = ${Dd}<br>${fmt(v, 2)} bit saved (invented)`);
      });
      [0, 4, 8, 12, 15].forEach(i => svgText(g, lx + (i + 0.5) * cw, by + 16 * D.fs, DS[i] >= 1024 ? `${DS[i] / 1024}K` : String(DS[i]), { class: 'lbl', 'text-anchor': 'middle' }));
      [0, 5, 11].forEach(l => svgText(g, lx - 8, by - (l + 0.5) * chh + 4, `layer ${l}`, { class: 'lbl', 'text-anchor': 'end' }));
      svgText(g, (lx + rx) / 2, D.H - 4, 'token distance Δ (log scale) →', { class: 'lbl', 'text-anchor': 'middle' });
      ro.set([['what we would read', PAT[pat].read]]);
    }
    draw();
  };
})();
