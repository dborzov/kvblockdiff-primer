/* =====================================================================
   figures/_demo.js — a living example of the figure kit (docs/figures.md).
   Registers FIG.demoLine, FIG.demoDrag and FIG.demoBars. The numbers are
   illustrative, not measurements. Copy freely when writing a Part's figures.
   ===================================================================== */
window.FIG = window.FIG || {};

/* ---------------------------------------------------------------------
   demoLine — cost per element as reuse grows: lines, band, rule,
   callout, crosshair tooltip, slider, segmented switch, legend, readout.
   --------------------------------------------------------------------- */
FIG.demoLine = (host) => {
  let sigma = 6, mode = 'bits';
  const RAW = 16;
  // differential entropy of a Gaussian residual, in quantisation steps (≥ a floor)
  const hEnt = s => Math.max(0.3, 0.5 * log2(2 * Math.PI * Math.E * s * s));
  const hFix = s => Math.ceil(log2(8 * s)) + 1;   // sign + covers ±4σ
  const cost = (rho, b) => RAW * (1 - rho) + rho * b + 0.04; // + side info
  const rhos = linspace(0, 1, 51);

  const box = h('div');
  const ro = readout();
  host.append(
    controls(
      slider(texify('residual spread $\\sigma$'), 1, 64, 1, sigma, v => { sigma = v; draw(); }, v => `${v} steps`),
      seg([['bits', 'bits / element'], ['ratio', 'compression ratio']], mode, v => { mode = v; draw(); }, 'y-axis'),
    ),
    legend([
      ['fixed-length residual', series(0)],
      ['entropy-coded residual', series(1)],
      ['σ ± 25 %', series(1), 'band'],
    ]),
    box, ro,
  );

  const P = Plot(box, { x: [0, 1], y: [0, 17], xlabel: 'reuse fraction ρ', ylabel: 'bits per element', label: 'Bits per element against reuse fraction' });
  crosshair(P, { xname: 'ρ =', yfmt: v => mode === 'bits' ? `${fmt(v, 2)} bits` : `${fmt(v, 2)}×` });

  function draw() {
    const val = b => (mode === 'bits' ? b : RAW / b);
    const curve = h => rhos.map(r => [r, val(cost(r, h))]);
    const fix = curve(hFix(sigma)), ent = curve(hEnt(sigma));
    const band = rhos.map(r => [r, val(cost(r, hEnt(sigma * 0.75))), val(cost(r, hEnt(sigma * 1.25)))]);
    const top = Math.max(...ent.map(p => p[1]), ...band.map(p => Math.max(p[1], p[2])));
    P.opts.ylabel = mode === 'bits' ? 'bits per element' : 'compression ratio';
    P.domain({ y: mode === 'bits' ? [0, 17] : [0, Math.max(2, top * 1.12)] });
    P.clear();
    area(P, band, { color: series(1) });
    line(P, fix, { color: series(0), name: 'fixed-length', dash: '7 5' });
    line(P, ent, { color: series(1), name: 'entropy-coded' });
    rule(P, { y: mode === 'bits' ? RAW : 1, label: 'raw BF16' });
    const end = ent[ent.length - 1];
    annotate(P, end[0], end[1], `all blocks reused:\n${fmt(hEnt(sigma), 2)} bits / element`, { dx: -44, dy: 26 });
    ro.set([
      [tex('\\sigma'), `${sigma} steps`],
      ['entropy', `${fmt(hEnt(sigma), 2)} bits`],
      ['fixed', `${hFix(sigma)} bits`],
      [`at ${tex('\\vrho = 1')}`, `${fmt(RAW / cost(1, hEnt(sigma)), 2)}× smaller`],
    ]);
  }
  draw();
};

/* ---------------------------------------------------------------------
   demoDrag — drag points; the regression line, residuals, R² and the
   bits saved by conditioning update live. Handles work with arrow keys.
   --------------------------------------------------------------------- */
FIG.demoDrag = (host) => {
  let seed = 7, pts = sample(seed);
  function sample(s) {
    const r = rng(s);
    return range(9).map(() => { const x = r.normal(0, 1); return [x, 0.8 * x + r.normal(0, 0.5)]; });
  }

  const box = h('div');
  const tiles = {
    rho: kpi(tex('\\vrho'), '', 'correlation'),
    r2: kpi('R²', '', 'variance explained', series(2)),
    bits: kpi('bits saved', '', 'per element, if Gaussian', series(3)),
  };
  const ro = readout();
  host.append(
    controls(
      btn('New sample', () => { pts = sample(++seed); draw(); }),
      btn('Reset', () => { seed = 7; pts = sample(seed); draw(); }),
      h('span', { class: 'fig-note', text: 'Drag a point, or focus it and use the arrow keys.' }),
    ),
    box,
    h('div', { class: 'kpis' }, tiles.rho, tiles.r2, tiles.bits),
    ro,
  );

  const P = Plot(box, { x: [-3, 3], y: [-3, 3], equal: true, h: 440, xlabel: 'previous block k[t−1]', ylabel: 'this block k[t]', label: 'Scatter of key values with a fitted line' });
  const fitG = el('g', {}, P.g.data);
  texLabel(P.g.top, P.m.l + 12 * P.fs, P.m.t + 16 * P.fs, '\\hat k_t = a + b\\,k_{t-1}', { anchor: 'start', w: 220 });
  const handles = pts.map((_, i) => {
    const c = el('circle', { class: 'handle', r: 7 * P.fs }, P.g.top);
    draggable(c, P, ([x, y]) => { pts[i] = [clamp(x, -3, 3), clamp(y, -3, 3)]; draw(); }, null,
      { get: () => pts[i], step: [0.1, 0.1], label: `point ${i + 1}` });
    hover(c, () => `<b>point ${i + 1}</b><br>k[t−1] = ${fmt(pts[i][0])}<br>k[t] = ${fmt(pts[i][1])}`);
    return c;
  });

  function draw() {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const mx = mean(xs), my = mean(ys), vx = variance(xs), vy = variance(ys);
    const cov = mean(pts.map(([x, y]) => (x - mx) * (y - my)));
    const b = cov / vx, a = my - b * mx, rho = cov / Math.sqrt(vx * vy);
    const saved = -0.5 * log2(Math.max(1e-9, 1 - rho * rho));

    fitG.replaceChildren();
    pts.forEach(([x, y]) => el('line', { x1: P.x(x), y1: P.y(y), x2: P.x(x), y2: P.y(a + b * x), class: 'resid', style: 'stroke:var(--vermilion);stroke-dasharray:3 3;stroke-width:1.4' }, fitG));
    line(P, [[P.x0, a + b * P.x0], [P.x1, a + b * P.x1]], { color: series(0), parent: fitG, width: 2.5 });
    pts.forEach(([x, y], i) => { handles[i].setAttribute('cx', P.x(x)); handles[i].setAttribute('cy', P.y(y)); });

    tiles.rho.set(fmt(rho, 3));
    tiles.r2.set(fmt(rho * rho, 3));
    tiles.bits.set(fmt(saved, 2));
    ro.set([['a', fmt(a, 3)], ['b', fmt(b, 3)], ['residual σ', fmt(Math.sqrt(vy * (1 - rho * rho)), 3)], ['median k[t]', fmt(quantile(ys, 0.5), 3)]]);
  }
  draw();
};

/* ---------------------------------------------------------------------
   demoBars — a step-through of a coding pipeline: grouped bars, value
   labels, per-bar tooltips, a reference rule, KPI tiles and a stepper.
   --------------------------------------------------------------------- */
FIG.demoBars = (host) => {
  const stages = [
    { cat: 'raw BF16', kv: [16, 16], label: 'Every element is stored as a 16-bit BF16 number.' },
    { cat: 'split exponent', kv: [12.6, 13.5], label: 'Exponents repeat a lot; coding them apart saves a few bits.' },
    { cat: 'Δ vs t−1', kv: [8.1, 10.4], label: 'Keys drift slowly, so the difference to the previous block is small.' },
    { cat: 'entropy coder', kv: [5.3, 7.2], label: 'An entropy coder spends bits only where the residual is surprising.' },
  ];
  const BYTES_PER_TOKEN = 2 * 32 * 4096 * 2;   // K and V · layers · width · BF16
  const TOKENS = 32768;

  const box = h('div');
  const tiles = {
    k: kpi('keys', '', 'bits / element', series(0)),
    v: kpi('values', '', 'bits / element', series(1)),
    size: kpi('KV cache at 32k tokens', '', ''),
  };
  host.append(legend([['keys K', series(0)], ['values V', series(1)]], { shape: 'box' }), box);
  const P = Plot(box, { xcats: stages.map(s => s.cat), y: [0, 18], h: 320, ylabel: 'bits per element', grid: 'y', label: 'Bits per element after each coding stage' });

  stepper(host, {
    steps: stages,
    label: s => s.label,
    render(i) {
      P.clear();
      rule(P, { y: 16, label: 'raw' });
      const faint = j => `color-mix(in srgb, ${series(j)} 22%, transparent)`;
      bars(P, stages.map(s => s.kv), {
        colors: (k, j) => (k <= i ? series(j) : faint(j)),
        labels: (v, k) => (k <= i ? fmt(v, v % 1 ? 1 : 0) : ''),
        tip: (v, k, j) => `<b>${stages[k].cat}</b><br>${j ? 'values' : 'keys'}: ${fmt(v, 1)} bits / element${k > i ? '<br><i>(a later step)</i>' : ''}`,
      });
      const [bk, bv] = stages[i].kv;
      tiles.k.set(fmt(bk, 1), `${fmt(16 / bk, 2)}× smaller`);
      tiles.v.set(fmt(bv, 1), `${fmt(16 / bv, 2)}× smaller`);
      tiles.size.set(fmtBytes(BYTES_PER_TOKEN * TOKENS * ((bk + bv) / 2) / 16), 'illustrative 7B-class model');
    },
  });
  host.append(h('div', { class: 'kpis' }, tiles.k, tiles.v, tiles.size));
};
