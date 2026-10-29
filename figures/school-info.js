/* =====================================================================
   figures/school-info.js — Part II, pages II.2–II.12 (information, coding, prediction).
   Every toy number comes from a seeded generator, so the prose and the figures agree.
   The generators are exposed on window.SCHOOLINFO (data only, no DOM) so the numbers
   quoted in the prose can be re-checked from the browser console.
   Builders: siQuestions, siSurprisal, siEntropyBars, siHistogram, siJointTable,
   siInfoBars, siHuffman, siArith, siFixedWidth, siPredict, siShapes, siExchange.
   ===================================================================== */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ================================================================= shared toy facts
  const SKY = ['sunny', 'cloudy', 'rain', 'fog'];
  const SKY_P = [1 / 2, 1 / 4, 1 / 8, 1 / 8];
  const SUMMER_P = [3 / 4, 1 / 8, 1 / 16, 1 / 16];
  const SKY_SERIES = [3, 6, 0, 7];              // saffron, dusk, lapis, sage: one colour per sky symbol everywhere
  const skyCol = i => series(SKY_SERIES[i]);
  const tint = (col, pct) => `color-mix(in srgb, ${col} ${pct}%, transparent)`;

  // The season almanac: counts out of 64 reports (16 per season). Sharpness s mixes a useless almanac
  // (every season looks like the year) with the sharpest table these seasons allow; s = 0.5 is Gull Rock's.
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  const INDEP = [8, 4, 2, 2];
  const SHARP = [[12, 4, 0, 0], [16, 0, 0, 0], [4, 8, 4, 0], [0, 4, 4, 8]];
  const ALMANAC_S = 0.5;
  const joint = s => SHARP.map(row => row.map((v, c) => (1 - s) * INDEP[c] + s * v));
  const rowSum = r => r.reduce((a, b) => a + b, 0);
  function condH(J) {               // H(X | Y) for a joint table with rows = Y, columns = X
    const tot = rowSum(J.map(rowSum));
    return J.reduce((a, r) => a + (rowSum(r) / tot) * entropy(r), 0);
  }
  const transpose = J => J[0].map((_, c) => J.map(r => r[c]));

  // The sticky sky: the next report repeats the last one with probability s, else is drawn afresh.
  const chainRow = (s, i) => SKY_P.map((q, j) => (1 - s) * q + (i === j ? s : 0));
  const chainCondH = s => SKY_P.reduce((a, p, i) => a + p * entropy(chainRow(s, i)), 0);

  // The sky archive: noon reports from random days, independent draws from the year's distribution.
  function drawSky(r, P = SKY_P) {
    let u = r(), k = 0;
    while (k < P.length - 1 && u >= P[k]) { u -= P[k]; k++; }
    return k;
  }
  let archiveCache = null;
  const skyArchive = () => archiveCache || (archiveCache = (() => { const r = rng('si-archive'); return range(4096).map(() => drawSky(r)); })());
  const countsOf = (xs, k = 4) => { const c = new Array(k).fill(0); xs.forEach(v => c[v]++); return c; };

  // Wind speeds in knots: mostly a breeze (Rayleigh, scale 8 kn), and 2.5 % gales of 40–60 kn.
  const WIND_N = 1024, POS_BITS = 10, RAW_BITS = 8;
  let windCache = null;
  function windSample() {
    if (windCache) return windCache;
    const r = rng('si-wind');
    windCache = range(WIND_N).map(() => (r() < 0.025 ? r.int(40, 60) : Math.round(8 * Math.sqrt(-2 * Math.log(1 - r())))));
    return windCache;
  }
  function fixedCost(xs, n) {        // n-bit slots, top code = escape marker, escapes cost position + raw byte
    const maxFit = 2 ** n - 2;
    const escIdx = [];
    xs.forEach((v, i) => { if (v > maxFit) escIdx.push(i); });
    const eps = escIdx.length / xs.length;
    return { n, maxFit, escIdx, esc: escIdx.length, eps, escBits: eps * (POS_BITS + RAW_BITS), perValue: n + eps * (POS_BITS + RAW_BITS) };
  }

  // Temperature every 30 minutes for 14 days, in tenths of a degree: day cycle + slow wander + 3 fronts + sensor noise.
  const DAYS = 28;
  let tempCache = null;
  function tempSeries() {
    if (tempCache) return tempCache;
    const r = rng('si-temp'), n = DAYS * 48;
    const fronts = [[170, -30], [395, -22], [560, 34], [810, -28], [1060, 30]];   // [reading, change in tenths of °C], each over 3 hours
    let w = 0;
    const xs = [];
    for (let i = 0; i < n; i++) {
      const hour = (i / 2) % 24;
      const cycle = 25 * Math.cos(2 * Math.PI * (hour - 15) / 24);
      w = 0.985 * w + r.normal(0, 1.1);
      const fr = fronts.reduce((a, [at, d]) => a + d * clamp((i - at) / 6, 0, 1), 0);
      xs.push(Math.round(138 + cycle + w + fr + r.normal(0, 1.0)));
    }
    return (tempCache = xs);
  }
  const PRED_LABELS = { none: 'no prediction', average: 'the average', previous: 'previous value', trend: 'previous + trend' };
  function predictAt(xs, i, kind, m) {
    if (kind === 'none') return 0;
    if (kind === 'average' || i === 0) return m;
    if (kind === 'previous' || i === 1) return xs[i - 1];
    return 2 * xs[i - 1] - xs[i - 2];
  }
  function residuals(xs, kind) {
    const m = Math.round(mean(xs));
    return xs.map((x, i) => x - predictAt(xs, i, kind, m));
  }
  function histH(vals) {             // plug-in (order-0) entropy of a list of integers, in bits
    const c = new Map();
    vals.forEach(v => c.set(v, (c.get(v) || 0) + 1));
    return entropy([...c.values()]);
  }
  const widthBits = vals => Math.ceil(Math.log2(Math.max(...vals) - Math.min(...vals) + 1));

  // Discretised Gaussian and Laplace shapes on the integers, with the same standard deviation σ.
  function erf(x) {                  // Abramowitz & Stegun 7.1.26 (error < 1.5e-7)
    const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
    return s * y;
  }
  const PHI = x => 0.5 * (1 + erf(x / Math.SQRT2));
  const lapCdf = (x, b) => (x < 0 ? 0.5 * Math.exp(x / b) : 1 - 0.5 * Math.exp(-x / b));
  function shapePmf(kind, sigma) {
    const K = Math.ceil(14 * sigma) + 3, b = sigma / Math.SQRT2, out = [];
    for (let k = -K; k <= K; k++) {
      const p = kind === 'gauss' ? PHI((k + 0.5) / sigma) - PHI((k - 0.5) / sigma) : lapCdf(k + 0.5, b) - lapCdf(k - 0.5, b);
      out.push([k, p]);
    }
    return out;
  }
  const shapeExactH = (kind, sigma) => entropy(shapePmf(kind, sigma).map(d => d[1]));
  const shapeFormula = (kind, sigma) => Math.log2(sigma) + (kind === 'gauss' ? 0.5 * Math.log2(2 * Math.PI * Math.E) : Math.log2(Math.SQRT2 * Math.E));
  function shapeMC(kind, sigma, N = 20000) {
    const r = rng(`si-shape-${kind}-${sigma}`), b = sigma / Math.SQRT2, xs = [];
    for (let i = 0; i < N; i++) {
      if (kind === 'gauss') xs.push(Math.round(r.normal(0, sigma)));
      else { const u = r() - 0.5; xs.push(Math.round(-b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)))); }
    }
    return { H: histH(xs), sd: Math.sqrt(variance(xs)) };
  }
  const exchangeBits = R2 => 0.5 * Math.log2(1 / (1 - R2));

  window.SCHOOLINFO = {
    SKY, SKY_P, SUMMER_P, SEASONS, joint, condH, transpose, ALMANAC_S, chainCondH,
    skyArchive, countsOf, windSample, fixedCost, tempSeries, residuals, histH, widthBits,
    shapeExactH, shapeFormula, shapeMC, exchangeBits,
  };

  // ================================================================= small helpers
  const bitsTxt = (b, d = 2) => `${fmt(b, d)} bit${Math.abs(b - 1) < 1e-9 ? '' : 's'}`;
  const fracTxt = p => {             // 0.125 → "1/8" when p is a simple fraction, else a decimal
    if (p === 0) return '0';
    for (const d of [2, 4, 8, 16, 32, 64, 128, 256]) { const n = p * d; if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n) === d ? '1' : `${Math.round(n)}/${d}`; }
    return fmt(p, 3);
  };

  // ================================================================= II.2 — twenty questions
  FIG.siQuestions = host => {
    const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const labelsFor = N => (N <= 16 ? range(N).map(k => COMPASS[k * 16 / N]) : range(N).map(k => `${Math.round(k * 360 / N)}°`));
    let N = 16, seed = 1, secret, lo, hi, asked, answers, labels, pureHalving;
    const grid = h('div', { class: 'si-q-grid', role: 'list' });
    const log = h('ol', { class: 'si-q-log' });
    const ro = readout();
    const bHalf = btn('Ask a halving question', () => ask('half'));
    const bOne = btn('Ask “is it …?” about one', () => ask('one'));
    const sN = seg([2, 4, 8, 16, 32, 64].map(v => [v, String(v)]), N, v => { N = v; reset(); }, 'number of possibilities');
    host.append(
      controls(h('span', { class: 'fig-note', text: 'Possibilities:' }), sN),
      grid,
      controls(bHalf, bOne, btn('New secret', () => { seed++; reset(); }, { cls: 'sm' })),
      log, ro,
    );
    function reset() {
      labels = labelsFor(N);
      secret = rng(`si-q-${seed}-${N}`).int(N);
      lo = 0; hi = N; asked = 0; answers = ''; pureHalving = true;
      log.replaceChildren();
      draw();
    }
    function ask(kind) {
      if (hi - lo <= 1) return;
      let q, yes;
      if (kind === 'half') {
        const mid = lo + Math.ceil((hi - lo) / 2);
        q = mid === hi - 1 ? `Is it ${labels[mid]}?` : `Is it one of ${labels[mid]} … ${labels[hi - 1]}?`;
        yes = secret >= mid;
        if (yes) lo = mid; else hi = mid;
      } else {
        pureHalving = false;
        q = `Is it ${labels[lo]}?`;
        yes = secret === lo;
        if (yes) hi = lo + 1; else lo = lo + 1;
      }
      asked++; answers += yes ? '1' : '0';
      log.append(h('li', {}, h('span', { text: q }), h('b', { text: yes ? ' yes → 1' : ' no → 0' })));
      log.scrollTop = log.scrollHeight;
      draw();
    }
    function draw() {
      const nb = Math.log2(N);
      grid.replaceChildren(...labels.map((lab, k) => {
        const out = k < lo || k >= hi, found = hi - lo === 1 && k === lo;
        return h('div', { class: 'si-q-cell' + (out ? ' out' : '') + (found ? ' hit' : ''), role: 'listitem' },
          h('b', { text: lab }), h('code', { text: k.toString(2).padStart(nb, '0') }));
      }));
      const done = hi - lo === 1;
      bHalf.disabled = done; bOne.disabled = done;
      const rows = [['questions asked', String(asked)], ['still possible', String(hi - lo)], [`enough for ${N}`, `${tex('\\log_2 ' + N)} = ${nb} questions`]];
      if (done) rows.push(['found', pureHalving
        ? `${labels[lo]} — your answers <code>${answers}</code> are its address`
        : `${labels[lo]} after ${asked} question${asked === 1 ? '' : 's'} (answers <code>${answers}</code>)`]);
      ro.set(rows);
    }
    reset();
  };

  // ================================================================= II.3 — surprisal curve
  FIG.siSurprisal = host => {
    let p = 1 / 8, mode = 'lin', P, knob;
    const box = h('div'), ro = readout();
    host.append(controls(seg([['lin', 'ordinary axis'], ['log', 'axis in halvings']], mode, v => { mode = v; build(); }, 'probability axis')), box, ro);
    const MIN = 1 / 256;
    function build() {
      box.replaceChildren();
      const common = { y: [0, 8.4], h: 320, yticks: [0, 1, 2, 3, 4, 5, 6, 7, 8], ylabel: 'surprisal (bits)', label: 'Surprisal in bits against the probability of an outcome' };
      P = mode === 'lin'
        ? Plot(box, Object.assign({ x: [0, 1], xticks: [0, 0.125, 0.25, 0.5, 0.75, 1], xfmt: fracTxt, xlabel: 'probability p of the outcome' }, common))
        : Plot(box, Object.assign({ x: [MIN, 1], xlog: 2, xticks: [1 / 256, 1 / 64, 1 / 16, 1 / 4, 1], xfmt: fracTxt, xlabel: 'probability p (each step left halves it)' }, common));
      const curve = linspace(Math.log2(MIN), 0, 240).map(e => 2 ** e).map(q => [q, -Math.log2(q)]);
      line(P, curve, { color: series(4) });
      [[1 / 2, 'sunny', 0], [1 / 4, 'cloudy', 1], [1 / 8, 'rain, fog', 2]].forEach(([q, lab, i]) => {
        dot(P.g.data, P.x(q), P.y(-Math.log2(q)), 5 * P.fs, skyCol(i));
        el('text', { x: P.x(q) + 8 * P.fs, y: P.y(-Math.log2(q)) - 8 * P.fs, class: 'lbl', text: lab }, P.g.data);
      });
      knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
      draggable(knob, P, ([x], e) => {
        if (e && e.type === 'keydown') p = clamp(p * (x > p ? 2 ** 0.25 : 2 ** -0.25), MIN, 1);
        else p = clamp(x, MIN, 1);
        draw();
      }, null, { get: () => [p, -Math.log2(p)], step: [1e-6, 0], label: 'probability of the outcome' });
      hover(knob, () => `<b>p = ${fmt(p, 3)}</b><br>surprisal ${bitsTxt(-Math.log2(p))}`);
      draw();
    }
    function draw() {
      knob.setAttribute('cx', P.x(p));
      knob.setAttribute('cy', P.y(-Math.log2(p)));
      const s = -Math.log2(p), oneIn = 1 / p;
      ro.set([
        [tex('\\vp'), fmt(p, p < 0.01 ? 4 : 3)],
        ['happens', `once in ${fmt(oneIn, oneIn < 10 ? 2 : oneIn < 100 ? 1 : 0)}`],
        ['surprisal', bitsTxt(s)],
        ['like', `naming one of ${fmt(oneIn, oneIn < 10 ? 2 : 0)} equally likely things`],
      ]);
    }
    build();
  };

  // ================================================================= II.4 — draggable probability bars
  FIG.siEntropyBars = host => {
    const PRESETS = { year: SKY_P.slice(), summer: SUMMER_P.slice(), equal: [0.25, 0.25, 0.25, 0.25], certain: [1, 0, 0, 0] };
    let ps = PRESETS.year.slice();
    const box = h('div'), strip = h('div', { class: 'si-strip' }), stripNote = h('div', { class: 'fig-note' });
    const kH = kpi(tex('\\vH'), '', 'bits per report', series(4));
    const kMax = kpi('most possible', '2 bits', 'four outcomes, all equally likely', series(2));
    const sp = seg([['year', 'Gull Rock year'], ['summer', 'summer'], ['equal', 'all equal'], ['certain', 'always sunny']], 'year', v => { ps = PRESETS[v].slice(); draw(); }, 'preset');
    host.append(controls(sp, h('span', { class: 'fig-note', text: 'Drag the top of a bar, or focus it and use ↑ ↓.' })), box, strip, stripNote, h('div', { class: 'kpis' }, kH, kMax));
    const P = Plot(box, { xcats: SKY, y: [0, 1.1], yticks: [0, 0.25, 0.5, 0.75, 1], yfmt: v => fmt(v, 2), h: 300, ylabel: 'probability', grid: 'y', label: 'Probabilities of the four sky reports' });
    const g = el('g', {}, P.g.data), gt = el('g', {}, P.g.top);
    const slot = Math.abs(P.x(1) - P.x(0)), bw = Math.min(70 * P.fs, slot * 0.55);
    const rects = SKY.map((_, i) => el('rect', { x: P.x(i) - bw / 2, width: bw, rx: 4 * P.fs, style: `fill:${skyCol(i)}` }, g));
    const labs = SKY.map(() => el('text', { class: 'val', 'text-anchor': 'middle' }, gt));
    const handles = SKY.map((name, i) => {
      const c = el('circle', { class: 'handle', r: 8 * P.fs, cx: P.x(i) }, gt);
      draggable(c, P, ([, y]) => { setP(i, clamp(y, 0, 1)); sp.set(null); draw(); }, null, { get: () => [i, ps[i]], step: [0, 0.01], label: `probability of ${name}` });
      hover(c, () => `<b>${name}</b><br>p = ${fmt(ps[i], 3)}<br>surprisal ${ps[i] > 0 ? bitsTxt(-Math.log2(ps[i])) : '—'}`);
      return c;
    });
    function setP(i, v) {
      const rest = 1 - v, others = ps.reduce((a, q, j) => a + (j === i ? 0 : q), 0);
      ps = ps.map((q, j) => (j === i ? v : others > 1e-9 ? q * rest / others : rest / 3));
    }
    function draw() {
      ps.forEach((q, i) => {
        rects[i].setAttribute('y', P.y(q)); rects[i].setAttribute('height', Math.max(0, P.y(0) - P.y(q)));
        handles[i].setAttribute('cy', P.y(q));
        labs[i].setAttribute('x', P.x(i)); labs[i].setAttribute('y', P.y(q) - 14 * P.fs);
        labs[i].textContent = q > 1e-6 ? `${fmt(q, 3)} · ${fmt(-Math.log2(q), 2)} b` : 'never';
      });
      const H = entropy(ps);
      kH.set(fmt(H, 3), `bits per report · perplexity ${fmt(2 ** H, 2)}`);
      strip.replaceChildren(...ps.map((q, i) => {
        const c = q > 0 ? -q * Math.log2(q) : 0;
        return h('span', { style: `width:${(100 * c / 2).toFixed(2)}%;background:${skyCol(i)}`, title: `${SKY[i]}: ${fmt(c, 3)} bits` });
      }));
      stripNote.textContent = 'Strip, 2 bits wide: each report’s share p × surprisal — ' +
        ps.map((q, i) => `${SKY[i]} ${fmt(q > 0 ? -q * Math.log2(q) : 0, 3)}`).join(' + ') + ` = ${fmt(H, 3)} bits.`;
    }
    draw();
  };

  // ================================================================= II.4 — histogram of the archive
  FIG.siHistogram = host => {
    const arch = skyArchive();
    const KS = range(3, 13);                     // n = 8 … 4096 reports
    const avg = KS.map(k => {                    // average estimate over 200 independent archives of size 2^k
      const r = rng(`si-arch-avg-${k}`);
      let s = 0;
      for (let t = 0; t < 200; t++) s += entropy(countsOf(range(2 ** k).map(() => drawSky(r))));
      return [2 ** k, s / 200];
    });
    let k = 5;
    const bL = h('div'), bR = h('div'), ro = readout();
    host.append(
      controls(slider('reports counted', 3, 12, 1, k, v => { k = v; draw(); }, v => String(2 ** v))),
      h('div', { class: 'fig-row' }, bL, bR),
      legend([['true probability', 'var(--ink)', 'dash'], ['this archive', series(4)], ['average of 200 archives', series(2), 'dash'], ['true entropy 1.75 bits', 'var(--ink-2)', 'dash']]),
      ro,
    );
    const PL = Plot(bL, { xcats: SKY, y: [0, 0.8], h: 300, ylabel: 'share of reports', grid: 'y', label: 'Histogram of the first n reports' });
    const PR = Plot(bR, { x: [8, 4096], xlog: 2, y: [1.2, 2.05], h: 300, xticks: [8, 32, 128, 512, 2048], xlabel: 'reports counted', ylabel: 'estimated entropy (bits)', label: 'Estimated entropy against the number of reports counted' });
    const curve = KS.map(kk => [2 ** kk, entropy(countsOf(arch.slice(0, 2 ** kk)))]);
    line(PR, avg, { color: series(2), dash: true, name: 'average of 200 archives' });
    line(PR, curve, { color: series(4), markers: true, name: 'this archive' });
    rule(PR, { y: 1.75, label: '1.75 bits' });
    crosshair(PR, { xname: 'reports:', yfmt: v => `${fmt(v, 3)} bits` });
    const mark = el('circle', { class: 'handle', r: 7 * PR.fs, style: 'pointer-events:none' }, PR.g.top);
    function draw() {
      const n = 2 ** k, c = countsOf(arch.slice(0, n)), est = entropy(c);
      PL.clear();
      bars(PL, c.map(v => v / n), { colors: (i) => skyCol(i), labels: (v, i) => `${c[i]}`, tip: (v, i) => `<b>${SKY[i]}</b><br>${c[i]} of ${n} reports (${fmtPct(v)})<br>true: ${fmtPct(SKY_P[i])}`, width: 46 });
      SKY_P.forEach((q, i) => el('line', { x1: PL.x(i) - 30 * PL.fs, x2: PL.x(i) + 30 * PL.fs, y1: PL.y(q), y2: PL.y(q), style: 'stroke:var(--ink);stroke-width:2;stroke-dasharray:5 3' }, PL.g.top));
      mark.setAttribute('cx', PR.x(n)); mark.setAttribute('cy', PR.y(est));
      ro.set([['reports counted', String(n)], ['estimated entropy', bitsTxt(est, 3)], ['true entropy', '1.75 bits'], ['error', `${fmtS(est - 1.75, 3)} bits`]]);
    }
    draw();
  };

  // ================================================================= II.5 — joint table explorer
  FIG.siJointTable = host => {
    let s = ALMANAC_S, sel = 1;
    const tbl = h('div', { class: 'si-jt-wrap' }), box = h('div');
    const kHX = kpi(tex('\\vH(\\vX)'), '1.75', 'bits: no almanac', series(4));
    const kHXY = kpi(tex('\\vH(\\vX \\mid \\vY)'), '', 'bits: with the almanac', series(2));
    const kSave = kpi('saved', '', 'bits per report', series(5));
    const sl = slider('almanac sharpness', 0, 1, 0.05, s, v => { s = v; draw(); }, v => (v === 0 ? '0 · useless' : v === ALMANAC_S ? '½ · Gull Rock' : v === 1 ? '1 · sharpest' : fmt(v, 2)));
    host.append(controls(sl, btn('Gull Rock almanac', () => { s = ALMANAC_S; sl.set(s); draw(); }, { cls: 'sm' })), tbl,
      legend([['selected season (bars in sky colours)', series(3), 'box'], ['whole year (grey bars)', 'var(--ink-3)', 'box']]), box, h('div', { class: 'kpis' }, kHX, kHXY, kSave));
    const P = Plot(box, { xcats: SKY, y: [0, 1], h: 250, ylabel: 'probability', grid: 'y', label: 'Sky probabilities in the selected season and in the whole year' });
    function draw() {
      const J = joint(s), colTot = transpose(J).map(rowSum);
      const t = h('table', { class: 'data si-jt' });
      t.append(h('thead', {}, h('tr', {}, h('th', { class: 'l', text: 'season ↓ · sky →' }), ...SKY.map(n => h('th', { text: n })), h('th', { text: 'reports' }), h('th', { html: `bits if known` }))));
      const tb = h('tbody');
      J.forEach((row, r) => {
        const tr = h('tr', { class: r === sel ? 'is-sel' : null, tabindex: '0', 'aria-label': `select ${SEASONS[r]}` });
        tr.append(h('th', { class: 'l', text: SEASONS[r] }));
        row.forEach((v, c) => tr.append(h('td', { text: fmt(v, v % 1 ? 1 : 0), style: `background:${tint(skyCol(c), Math.round(100 * Math.min(1, v / 16)))}` })));
        tr.append(h('td', { text: '16' }), h('td', { class: 'si-jt-h', text: fmt(entropy(row), 2) }));
        const pick = () => { sel = r; draw(); };
        tr.addEventListener('click', pick);
        tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        tb.append(tr);
      });
      tb.append(h('tr', { class: 'sum' }, h('th', { class: 'l', text: 'whole year' }), ...colTot.map(v => h('td', { text: fmt(v, 0) })), h('td', { text: '64' }), h('td', { class: 'si-jt-h', text: '1.75' })));
      t.append(tb);
      tbl.replaceChildren(t, h('div', { class: 'fig-note', text: 'Click a season (or focus it and press Enter) to compare its sky with the whole year.' }));
      P.clear();
      const rowP = J[sel].map(v => v / 16);
      bars(P, rowP.map((v, i) => [v, SKY_P[i]]), {
        colors: (i, j) => (j === 0 ? skyCol(i) : 'var(--ink-3)'), names: [SEASONS[sel], 'whole year'],
        labels: v => fmt(v, 2), tip: (v, i, j) => `<b>${SKY[i]}</b> · ${j ? 'whole year' : SEASONS[sel]}<br>p = ${fmt(v, 3)}`,
      });
      const hxy = condH(J);
      kHXY.set(fmt(hxy, 3), `bits: with the almanac (${SEASONS[sel]} alone: ${fmt(entropy(J[sel]), 2)})`);
      kSave.set(fmt(1.75 - hxy, 3), `bits per report (${fmtPct((1.75 - hxy) / 1.75, 0)})`);
    }
    draw();
  };

  // ================================================================= II.6 — information bars
  FIG.siInfoBars = host => {
    let kind = 'season', st = 0.8;
    const D = Diagram(host, { w: 640, h: 210, grow: 1, label: 'Entropy of the sky report and of the side information, overlapping by the mutual information' });
    const g = el('g', {}, D.svg);
    const sl = slider('stickiness', 0, 0.95, 0.05, st, v => { st = v; draw(); }, v => fmt(v, 2));
    const sk = seg([['season', 'the season'], ['previous', 'the previous report'], ['none', 'nothing'], ['self', 'the report itself']], kind, v => { kind = v; draw(); }, 'side information');
    const kHXY = kpi(tex('\\vH(\\vX \\mid \\vY)'), '', 'bits still to send', series(2));
    const kI = kpi(tex('\\vI(\\vX;\\vY)'), '', 'bits saved per report', series(4));
    host.prepend(controls(h('span', { class: 'fig-note', text: 'The receiver knows:' }), sk, sl));
    host.append(h('div', { class: 'kpis' }, kHXY, kI));
    function nums() {
      if (kind === 'season') { const J = joint(ALMANAC_S); return { HX: 1.75, HY: 2, HXY: condH(J), name: 'the season' }; }
      if (kind === 'previous') { const c = chainCondH(st); return { HX: 1.75, HY: 1.75, HXY: c, name: 'the previous report' }; }
      if (kind === 'none') return { HX: 1.75, HY: 0, HXY: 1.75, name: 'nothing' };
      return { HX: 1.75, HY: 1.75, HXY: 0, name: 'the report itself' };
    }
    function seg2(x0, x1, y, hgt, fill, label, cls) {
      if (x1 - x0 < 0.5) return;
      el('rect', { x: x0, y, width: x1 - x0, height: hgt, rx: 5, style: `fill:${fill};stroke:var(--ink-3);stroke-width:.8` }, g);
      if (label && x1 - x0 > 46 * D.fs) svgText(g, (x0 + x1) / 2, y + hgt / 2 + 4 * D.fs, label, { class: cls || 'val', 'text-anchor': 'middle' });
    }
    function draw() {
      sl.input.disabled = kind !== 'previous';
      sl.style.opacity = kind === 'previous' ? 1 : 0.4;
      const { HX, HY, HXY, name } = nums(), I = HX - HXY, HYX = HY - I;
      const f = D.fs, k = 140, x0 = 70, y1 = 46 * f, y2 = 128 * f, bh = 40 * f;
      g.replaceChildren();
      el('text', { x: 6, y: y1 + bh / 2 + 4 * f, class: 'lbl', text: 'sky' }, g);
      el('text', { x: 6, y: y2 + bh / 2 + 4 * f, class: 'lbl', text: 'known' }, g);
      const a = x0 + HXY * k, b = x0 + HX * k, c = a + HY * k;
      seg2(x0, a, y1, bh, tint(skyCol(0), 45), `still to send ${fmt(HXY, 2)}`);
      seg2(a, b, y1, bh, tint(series(4), 55), `shared ${fmt(I, 2)}`);
      if (I > 0.005 && b - a <= 46 * D.fs) el('text', { x: b + 6, y: y1 + bh / 2 + 4 * D.fs, class: 'val', text: `← shared ${fmt(I, 2)}` }, g);
      seg2(a, a + I * k, y2, bh, tint(series(4), 55), `shared ${fmt(I, 2)}`);
      seg2(a + I * k, c, y2, bh, tint(series(2), 30), `${fmt(HYX, 2)}`);
      if (I > 0.01) [a, b].forEach(x => el('line', { x1: x, x2: x, y1: y1 - 8 * f, y2: y2 + bh + 8 * f, style: 'stroke:var(--ink-2);stroke-dasharray:4 3' }, g));
      el('text', { x: x0, y: y1 - 12 * f, class: 'annot', text: `H(X) = ${fmt(HX, 2)} bits: the sky report` }, g);
      el('text', { x: Math.min(a, 360), y: y2 + bh + 24 * f, class: 'annot', text: HY > 0 ? `H(Y) = ${fmt(HY, 2)} bits: ${name}` : 'Y = nothing: 0 bits' }, g);
      kHXY.set(fmt(HXY, 3), `bits still to send (${fmtPct(HXY / HX, 0)} of 1.75)`);
      kI.set(fmt(I, 3), `bits saved per report, knowing ${name}`);
    }
    draw();
  };

  // ================================================================= II.7 — Huffman builder
  function huffman(weights) {
    const nodes = weights.map((w, i) => ({ id: i, w, leaf: true, sym: i, kids: null, born: 0 }));
    let pool = nodes.slice(), step = 0;
    const merges = [];
    while (pool.length > 1) {
      pool.sort((a, b) => a.w - b.w || a.id - b.id);
      const [m1, m2] = pool.splice(0, 2);
      step++;
      const pair = [m1, m2].sort((a, b) => b.w - a.w || a.id - b.id);   // heavier (or older) child on the left, gets 0
      const node = { id: nodes.length, w: m1.w + m2.w, leaf: false, kids: pair, born: step };
      nodes.push(node); pool.push(node); merges.push({ a: m1, b: m2, node });
    }
    const root = pool[0], code = new Array(weights.length).fill('');
    const order = [];
    (function walk(n, c, depth) { n.depth = depth; if (n.leaf) { code[n.sym] = c || '0'; order.push(n); return; } walk(n.kids[0], c + '0', depth + 1); walk(n.kids[1], c + '1', depth + 1); })(root, '', 0);
    (function height(n) { n.hgt = n.leaf ? 0 : 1 + Math.max(height(n.kids[0]), height(n.kids[1])); return n.hgt; })(root);
    return { nodes, merges, root, code, order };
  }

  FIG.siHuffman = host => {
    const PRESETS = { year: [16, 8, 4, 4], summer: [24, 4, 2, 2], lopsided: [29, 1, 1, 1], equal: [8, 8, 8, 8] };
    let w = PRESETS.year.slice(), T = huffman(w), cur = 0, st = null;
    const sliders = SKY.map((name, i) => slider(name, 1, 32, 1, w[i], v => { w[i] = v; sp.set(null); recompute(); }));
    const sp = seg([['year', 'Gull Rock year'], ['summer', 'summer'], ['lopsided', 'lopsided'], ['equal', 'all equal']], 'year', v => { w = PRESETS[v].slice(); sliders.forEach((s, i) => s.set(w[i])); recompute(); }, 'preset');
    host.append(controls(sp), h('div', { class: 'controls si-hf-sliders' }, h('span', { class: 'fig-note', text: 'Counts out of the reports:' }), ...sliders));
    const D = Diagram(host, { w: 640, h: 300, label: 'Huffman tree for the four sky reports', grow: 0.3 });
    const g = el('g', {}, D.svg);
    const tblBox = h('div');
    const kL = kpi('average codeword', '', 'bits per report', series(1));
    const kH = kpi('entropy', '', 'bits per report', series(4));
    const kO = kpi('overhead', '', 'Huffman above entropy', series(5));
    function recompute() { T = huffman(w); draw(cur); if (st) st.el.querySelector('.st-label').innerHTML = stepLabel(cur); }
    const tot = () => rowSum(w);
    const pTxt = v => fracTxt(v / tot());
    function stepLabel(i) {
      if (i === 0) return 'Start: one leaf per sky report, labelled with its probability.';
      if (i === 4) return `Read each codeword from the top: left branch 0, right branch 1. ${SKY.map((s, k) => `${s} = <code>${T.code[k]}</code>`).join(', ')}.`;
      const m = T.merges[i - 1], nm = n => (n.leaf ? SKY[n.sym] : `the ${pTxt(n.w)} node`);
      return `Merge the two least likely: ${nm(m.a)} (${pTxt(m.a.w)}) and ${nm(m.b)} (${pTxt(m.b.w)}) → a node of ${pTxt(m.node.w)}.`;
    }
    function draw(step) {
      g.replaceChildren();
      const W = 640, bottom = D.H - 70 * D.fs, top = 30 * D.fs, maxH = T.root.hgt, dy = (bottom - top) / Math.max(1, maxH);
      const pos = new Map();
      T.order.forEach((n, k) => pos.set(n.id, [W * (k + 1) / (T.order.length + 1), bottom]));
      (function place(n) { if (n.leaf) return pos.get(n.id); const a = place(n.kids[0]), b = place(n.kids[1]); const p = [(a[0] + b[0]) / 2, bottom - n.hgt * dy]; pos.set(n.id, p); return p; })(T.root);
      const vis = n => n.leaf || n.born <= Math.min(step, 3);
      const ghost = el('g', { style: 'opacity:.18' }, g);
      T.nodes.filter(n => !n.leaf && !vis(n)).forEach(n => n.kids.forEach(kid => {
        const [x1, y1] = pos.get(n.id), [x2, y2] = pos.get(kid.id);
        el('line', { x1, y1, x2, y2, style: 'stroke:var(--ink-3);stroke-width:1.4;stroke-dasharray:4 4' }, ghost);
      }));
      T.nodes.filter(n => !n.leaf && !vis(n)).forEach(n => { const [x, y] = pos.get(n.id); el('circle', { cx: x, cy: y, r: 7 * D.fs, style: 'fill:var(--paper-2);stroke:var(--ink-3)' }, ghost); });
      const fresh = step >= 1 && step <= 3 ? T.merges[step - 1] : null;
      T.nodes.filter(n => !n.leaf && vis(n)).forEach(n => n.kids.forEach((kid, side) => {
        const [x1, y1] = pos.get(n.id), [x2, y2] = pos.get(kid.id);
        const hot = fresh && fresh.node === n;
        el('line', { x1, y1, x2, y2, style: `stroke:${hot ? 'var(--c)' : 'var(--ink-3)'};stroke-width:${hot ? 3 : 1.8}` }, g);
        el('text', { x: (x1 + x2) / 2 + (side ? 9 : -9) * D.fs, y: (y1 + y2) / 2 - 2, class: 'val', 'text-anchor': side ? 'start' : 'end', text: String(side) }, g);
      }));
      T.nodes.filter(vis).forEach(n => {
        const [x, y] = pos.get(n.id), hot = fresh && (fresh.node === n || fresh.a === n || fresh.b === n);
        const r = (n.leaf ? 11 : 8) * D.fs;
        el('circle', { cx: x, cy: y, r, style: `fill:${n.leaf ? skyCol(n.sym) : 'var(--paper-2)'};stroke:${hot ? 'var(--c)' : 'var(--ink-3)'};stroke-width:${hot ? 3 : 1.4}` }, g);
        if (n.leaf) {
          el('text', { x, y: y + r + 15 * D.fs, 'text-anchor': 'middle', class: 'lbl', text: SKY[n.sym] }, g);
          el('text', { x, y: y + r + 30 * D.fs, 'text-anchor': 'middle', class: 'val', text: pTxt(n.w) }, g);
          if (step === 4) el('text', { x, y: y + r + 46 * D.fs, 'text-anchor': 'middle', class: 'val', style: 'font-weight:700', text: T.code[n.sym] }, g);
        } else {
          el('text', { x: x + r + 5 * D.fs, y: y - r - 2 * D.fs, 'text-anchor': 'start', class: 'val', text: pTxt(n.w) }, g);
        }
      });
      const ps = w.map(v => v / tot()), L = ps.reduce((a, p, i) => a + p * T.code[i].length, 0), H = entropy(ps);
      tblBox.replaceChildren(table(['report', 'p', 'surprisal', 'codeword', 'length'],
        SKY.map((s, i) => [s, fmt(ps[i], 3), fmt(-Math.log2(ps[i]), 2), { html: step === 4 ? `<code>${T.code[i]}</code>` : '…' }, step === 4 ? String(T.code[i].length) : '…']), { left: [0] }));
      kL.set(step === 4 ? fmt(L, 3) : '…', 'bits per report');
      kH.set(fmt(H, 3), 'bits per report');
      kO.set(step === 4 ? `${fmt(L - H, 3)}` : '…', step === 4 ? `bits (${fmtPct((L - H) / H, 0)} above entropy)` : 'Huffman above entropy');
    }
    st = stepper(host, {
      steps: 5,
      label: (_, i) => stepLabel(i),
      render(i) { cur = i; draw(i); },
    });
    host.append(tblBox, h('div', { class: 'kpis' }, kL, kH, kO));
  };

  // ================================================================= II.8 — arithmetic coding interval
  FIG.siArith = host => {
    const MSG = [0, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 3];   // a summer fortnight: 12 sunny, 2 cloudy, 1 rain, 1 fog
    const LETTER = ['S', 'C', 'R', 'F'], HUFF = [1, 2, 3, 3];
    const MODELS = { summer: SUMMER_P, year: SKY_P };
    let model = 'summer', cur = 0;
    const sm = seg([['summer', 'summer model'], ['year', 'year model']], model, v => { model = v; draw(cur); }, 'model');
    host.append(controls(h('span', { class: 'fig-note', text: 'Both ends use the' }), sm));
    const D = Diagram(host, { w: 640, h: 226, label: 'The coding interval shrinking as each report is coded', grow: 1 });
    const g = el('g', {}, D.svg);
    const ro = readout();
    const kB = kpi('this model', '', 'bits so far', series(2));
    const kHf = kpi('Huffman code', '', 'bits so far (0 / 10 / 110 / 111)', series(1));
    function states(P) {                 // [low, width] before each symbol
      const out = [[0, 1]];
      MSG.forEach(s => { const [lo, wd] = out[out.length - 1]; const start = P.slice(0, s).reduce((a, b) => a + b, 0); out.push([lo + wd * start, wd * P[s]]); });
      return out;
    }
    function label(i) {
      if (i === 0) return 'Before any report the interval is all of [0, 1). Its four slices belong to the four reports.';
      const s = MSG[i - 1], P = MODELS[model];
      return `Report ${i} is <b>${SKY[s]}</b>: keep its slice, ${fracTxt(P[s])} of the interval, and zoom in. Cost: ${bitsTxt(-Math.log2(P[s]), 3)}.`;
    }
    const bin = (x, n) => { let s = ''; for (let k = 0; k < n; k++) { x *= 2; const b = Math.floor(x); s += b; x -= b; } return s; };
    function bar(y, hgt, P, chosen, faded) {
      const f = D.fs;
      let x = 20;
      P.forEach((p, k) => {
        const wpx = 600 * p;
        el('rect', { x, y, width: wpx, height: hgt, style: `fill:${tint(skyCol(k), faded ? 30 : chosen === k ? 95 : 55)};stroke:${chosen === k ? 'var(--c)' : 'var(--paper-3)'};stroke-width:${chosen === k ? 3 : 1}` }, g);
        if (wpx > 24 * f) el('text', { x: x + wpx / 2, y: y + hgt / 2 + 4 * f, 'text-anchor': 'middle', class: 'lbl', text: wpx > 70 * D.fs ? SKY[k] : LETTER[k] }, g);
        x += wpx;
      });
    }
    function draw(i) {
      const P = MODELS[model], S = states(P), f = D.fs;
      g.replaceChildren();
      const cw = 600 / MSG.length;
      MSG.forEach((s, k) => {
        const on = k < i, now = k === i - 1;
        el('rect', { x: 20 + k * cw + 1.5, y: 8 * f, width: cw - 3, height: 26 * f, rx: 5, style: `fill:${on ? skyCol(s) : 'var(--paper-2)'};stroke:${now ? 'var(--c)' : 'var(--rule)'};stroke-width:${now ? 3 : 1}` }, g);
        el('text', { x: 20 + k * cw + cw / 2, y: 26 * f, 'text-anchor': 'middle', class: 'val', text: LETTER[s] }, g);
      });
      const [lo, wd] = S[Math.max(0, i - 1)], [lo2, wd2] = S[i];
      el('text', { x: 20, y: 56 * f, class: 'lbl', text: i === 0 ? 'the interval [0, 1)' : `before report ${i}: width ${fmt(wd, 6)}` }, g);
      bar(64 * f, 34 * f, P, i === 0 ? -1 : MSG[i - 1], false);
      if (i === 0) el('text', { x: 320, y: 150 * f, 'text-anchor': 'middle', class: 'annot', text: 'Press Next (or Play) to code the reports one by one.' }, g);
      if (i > 0) {
        const start = P.slice(0, MSG[i - 1]).reduce((a, b) => a + b, 0);
        const xa = 20 + 600 * start, xb = xa + 600 * P[MSG[i - 1]];
        const yA = 98 * f, yB = 140 * f;
        el('path', { d: `M${xa} ${yA}L20 ${yB}M${xb} ${yA}L620 ${yB}`, style: 'stroke:var(--c);stroke-dasharray:4 3;fill:none;stroke-width:1.6' }, g);
        el('path', { d: `M${xa} ${yA}L${xb} ${yA}L620 ${yB}L20 ${yB}Z`, style: `fill:${tint('var(--c)', 8)}` }, g);
        el('text', { x: 20, y: 160 * f, class: 'lbl', text: `zoomed in, after report ${i}: width ${fmt(wd2, 6)}` }, g);
        bar(168 * f, 34 * f, P, -1, true);
      }
      const bits = -Math.log2(wd2), hf = MSG.slice(0, i).reduce((a, s) => a + HUFF[s], 0);
      const bl = bin(lo2, 40), bh = bin(Math.min(lo2 + wd2, 1 - 1e-15), 40);
      let common = 0; while (common < 40 && bl[common] === bh[common]) common++;
      ro.set([['interval', `[${fmt(lo2, 8)}, ${fmt(lo2 + wd2, 8)})`], ['width', i ? `${fmt(wd2, 8)} = 2<sup>−${fmt(bits, 2)}</sup>` : '1'], ['binary digits already settled', i ? `0.<code>${bl.slice(0, common) || '—'}</code>…` : 'none yet']]);
      kB.set(fmt(bits, 2), `bits so far (${model} model)`);
      kHf.set(String(hf), 'bits so far (0 / 10 / 110 / 111)');
    }
    stepper(host, { steps: MSG.length + 1, label: (_, i) => label(i), render(i) { cur = i; draw(i); }, interval: 1300 });
    host.append(ro, h('div', { class: 'kpis' }, kB, kHf));
  };

  // ================================================================= II.9 — fixed width and escapes
  FIG.siFixedWidth = host => {
    const xs = windSample(), hist = range(64).map(v => xs.filter(x => x === v).length);
    const H = histH(xs);
    let n = 5;
    const bTop = h('div'), bBot = h('div'), ro = readout();
    const kE = kpi('escaped', '', 'readings', series(1));
    const kB = kpi('bits per reading', '', 'slots + escape stream', series(2));
    const kT = kpi(`all ${WIND_N} readings`, '', 'versus raw 8-bit bytes', series(4));
    host.append(controls(slider(texify('width $\\vn$'), 3, 8, 1, n, v => { n = v; draw(); }, v => `${v} bits`)),
      legend([['fits in its slot', series(2), 'box'], ['escaped (gale)', series(1), 'box']]), bTop,
      h('div', { class: 'kpis' }, kE, kB, kT),
      legend([['slots: n bits each', series(2), 'box'], ['escape stream, spread over all readings', series(1), 'box'], ['raw byte: 8 bits', 'var(--ink-2)', 'dash'], [`entropy of the histogram: ${fmt(H, 2)} bits`, series(4), 'dash']]),
      bBot, ro);
    const P = Plot(bTop, { x: [-0.5, 63.5], y: [0, Math.max(...hist) * 1.12], h: 280, xticks: [0, 10, 20, 30, 40, 50, 60], xlabel: 'wind speed (knots)', ylabel: 'readings', grid: 'y', label: 'Histogram of wind speeds with the fixed-length cut-off' });
    const costs = range(3, 9).map(k => fixedCost(xs, k));
    const PB = Plot(bBot, { xcats: costs.map(c => `n = ${c.n}`), y: [0, 10], h: 230, ylabel: 'bits per reading', grid: 'y', label: 'Bits per reading for each width' });
    function draw() {
      const c = fixedCost(xs, n);
      P.clear();
      hist.forEach((cnt, v) => {
        if (!cnt) return;
        el('rect', { x: P.x(v - 0.42), width: P.x(v + 0.42) - P.x(v - 0.42), y: P.y(cnt), height: P.y(0) - P.y(cnt), style: `fill:${v > c.maxFit ? series(1) : series(2)}` }, P.g.data);
      });
      if (c.maxFit < 63.5) rule(P, { x: c.maxFit + 0.5, label: `fits: 0–${c.maxFit} kn\ncode ${2 ** n - 1} = escape` });
      PB.clear();
      costs.forEach((k, i) => {
        const x = PB.x(i), bw = 30 * PB.fs, on = k.n === n;
        el('rect', { x: x - bw / 2, width: bw, y: PB.y(k.n), height: PB.y(0) - PB.y(k.n), style: `fill:${tint(series(2), on ? 100 : 35)}` }, PB.g.data);
        el('rect', { x: x - bw / 2, width: bw, y: PB.y(k.perValue), height: PB.y(k.n) - PB.y(k.perValue), style: `fill:${tint(series(1), on ? 100 : 35)}` }, PB.g.data);
        el('text', { x, y: PB.y(Math.min(k.perValue, 9.4)) - 6 * PB.fs, 'text-anchor': 'middle', class: 'val', text: fmt(k.perValue, 2) + (k.perValue > 10 ? ' ↑' : '') }, PB.g.top);
      });
      rule(PB, { y: 8 });
      rule(PB, { y: H, color: series(4) });
      kE.set(`${c.esc}`, `readings (${tex('\\veps')} = ${fmtPct(c.eps, 1)})`);
      kB.set(fmt(c.perValue, 2), `= ${n} + ${fmt(c.escBits, 2)} (escapes)`);
      const totBytes = Math.ceil(WIND_N * c.perValue / 8);
      kT.set(`${totBytes} B`, `versus ${WIND_N} B raw (${fmt(WIND_N / totBytes, 2)}× smaller)`);
      const pairs = c.escIdx.slice(0, 6).map(i => `(#${i}, ${xs[i]} kn)`).join(' ');
      ro.set([['escape stream', c.esc ? `${pairs}${c.esc > 6 ? ` … ${c.esc - 6} more` : ''}` : 'empty'], ['each escape', `${POS_BITS}-bit position + ${RAW_BITS}-bit raw value`]]);
    }
    draw();
  };

  // ================================================================= II.10 — predict, then send the residual
  FIG.siPredict = host => {
    const xs = tempSeries(), m = Math.round(mean(xs));
    let kind = 'previous', zoom = 'all';
    const bS = h('div'), bR = h('div'), bH = h('div');
    const kS = kpi('residual spread', '', '', series(2));
    const kB = kpi('bits per reading', '', 'entropy of the residuals', series(4));
    const kW = kpi('fixed width', '', 'bits to hold every residual', series(1));
    host.append(
      controls(seg(Object.entries(PRED_LABELS).map(([k, v]) => [k, v]), kind, v => { kind = v; draw(); }, 'predictor'),
        seg([['all', `${DAYS} days`], ['day', 'one day']], zoom, v => { zoom = v; draw(); }, 'zoom')),
      legend([['temperature', series(0)], ['prediction', series(1), 'dash'], ['residual', series(2)]]),
      bS, h('div', { class: 'fig-row' }, bR, bH), h('div', { class: 'kpis' }, kS, kB, kW));
    const PS = Plot(bS, { x: [0, DAYS], y: [3, 19], h: 250, xlabel: 'day', ylabel: '°C', label: 'Temperature every 30 minutes with the prediction' });
    const PR = Plot(bR, { x: [0, DAYS], y: [-6, 6], h: 230, xlabel: 'day', ylabel: 'residual (°C)', label: 'Residual over time' });
    const PH = Plot(bH, { x: [-6, 6], y: [0, 0.3], h: 230, xlabel: 'residual (°C)', ylabel: 'share of readings', grid: 'y', label: 'Histogram of the residuals' });
    const base = {};
    ['none', 'average', 'previous', 'trend'].forEach(k => { const r = residuals(xs, k); base[k] = { r, H: histH(r), sd: Math.sqrt(variance(r)), w: widthBits(r) }; });
    function draw() {
      const { r, H, sd, w } = base[kind];
      const n0 = zoom === 'all' ? 0 : 9 * 48, n1 = zoom === 'all' ? xs.length : 10 * 48 + 1;
      const t = i => i / 48;
      PS.domain({ x: [t(n0), t(n1 - 1)] }); PR.domain({ x: [t(n0), t(n1 - 1)] });
      PS.clear(); PR.clear(); PH.clear();
      const idx = range(n0, n1);
      line(PS, idx.map(i => [t(i), xs[i] / 10]), { color: series(0), width: zoom === 'all' ? 1.4 : 2.2, curve: zoom === 'day' ? 'step' : 'linear' });
      if (kind !== 'none') line(PS, idx.map(i => [t(i), predictAt(xs, i, kind, m) / 10]), { color: series(1), dash: '5 4', width: 1.6, curve: zoom === 'day' ? 'step' : 'linear' });
      else el('text', { x: PS.m.l + 10 * PS.fs, y: PS.H - PS.m.b - 10 * PS.fs, class: 'annot', text: 'the guess is always 0 °C, off the chart' }, PS.g.top);
      const lim = Math.max(1.5, Math.ceil(Math.max(...r.map(Math.abs)) / 10));
      const showLim = kind === 'none' ? 19 : Math.min(lim, 8);
      PR.domain({ y: kind === 'none' ? [0, 19] : [-showLim, showLim] });
      PR.clear();
      line(PR, idx.map(i => [t(i), r[i] / 10]), { color: series(2), width: 1.2, curve: zoom === 'day' ? 'step' : 'linear' });
      const lo = kind === 'none' ? Math.min(...r) : -showLim * 10, hi = kind === 'none' ? Math.max(...r) : showLim * 10;
      const cnt = new Map(); r.forEach(v => cnt.set(v, (cnt.get(v) || 0) + 1));
      const top = Math.max(...cnt.values()) / r.length;
      PH.domain({ x: [lo / 10 - 0.1, hi / 10 + 0.1], y: [0, top * 1.15] });
      PH.clear();
      cnt.forEach((c, v) => {
        if (v < lo || v > hi) return;
        const x0 = PH.x(v / 10 - 0.045), x1 = PH.x(v / 10 + 0.045);
        el('rect', { x: x0, width: Math.max(1, x1 - x0), y: PH.y(c / r.length), height: PH.y(0) - PH.y(c / r.length), style: `fill:${series(2)}` }, PH.g.data);
      });
      kS.set(`${fmt(sd / 10, 2)} °C`, `standard deviation · ${fmt(sd, 1)} tenths`);
      kB.set(fmt(H, 2), `entropy of the residuals (saves ${fmt(base.none.H - H, 2)} vs none)`);
      kW.set(`${w}`, `bits to hold every residual (none: ${base.none.w})`);
    }
    draw();
  };

  // ================================================================= II.11 — Gaussian and Laplace
  FIG.siShapes = host => {
    let sigma = 4;
    const SIG = [0.25, 0.5, 1, 2, 4, 8, 16, 32];
    const mc = { gauss: SIG.map(s => [s, shapeMC('gauss', s).H]), lap: SIG.map(s => [s, shapeMC('lap', s).H]) };
    const bTop = h('div'), bBot = h('div'), tblBox = h('div');
    host.append(
      controls(slider(texify('spread $\\vsigma$ (steps)'), -2, 5, 0.25, Math.log2(sigma), v => { sigma = 2 ** v; draw(); }, v => fmt(2 ** v, 2 ** v < 1 ? 2 : 1))),
      legend([['Gaussian', series(0)], ['Laplace', series(1)], ['Monte Carlo, 20 000 draws', 'var(--ink)', 'dot']]),
      h('div', { class: 'fig-row' }, bTop, bBot), tblBox);
    const PT = Plot(bTop, { x: [-16, 16], y: [0, 0.5], h: 280, xlabel: 'residual (integer steps)', ylabel: 'probability', grid: 'y', label: 'Gaussian and Laplace shapes with the same spread' });
    const PB = Plot(bBot, { x: [0.25, 32], xlog: 2, y: [-1, 7.5], h: 280, xticks: [0.25, 1, 4, 16], xfmt: v => fmt(v, v < 1 ? 2 : 0), xlabel: 'spread σ (steps, doubling to the right)', ylabel: 'bits per value', label: 'Bits per value against the spread' });
    const sgrid = linspace(-2, 5, 57).map(e => 2 ** e);
    line(PB, sgrid.map(s => [s, shapeFormula('gauss', s)]), { color: series(0), dash: '6 4', width: 1.5 });
    line(PB, sgrid.map(s => [s, shapeFormula('lap', s)]), { color: series(1), dash: '6 4', width: 1.5 });
    line(PB, sgrid.map(s => [s, shapeExactH('gauss', s)]), { color: series(0), name: 'Gaussian (exact)' });
    line(PB, sgrid.map(s => [s, shapeExactH('lap', s)]), { color: series(1), name: 'Laplace (exact)' });
    mc.gauss.forEach(([s, v]) => dot(PB.g.data, PB.x(s), PB.y(v), 3.6 * PB.fs, 'var(--ink)'));
    mc.lap.forEach(([s, v]) => dot(PB.g.data, PB.x(s), PB.y(v), 3.6 * PB.fs, 'var(--ink)'));
    rule(PB, { y: 0, dash: false, color: 'var(--ink-3)' });
    el('text', { x: PB.x(0.3), y: PB.y(4.2), class: 'annot', text: 'dashed: log₂ σ + constant' }, PB.g.top);
    crosshair(PB, { xname: 'σ =', xfmt: v => fmt(v, 2), yfmt: v => `${fmt(v, 2)} bits` });
    const mark = el('line', { style: 'stroke:var(--c);stroke-width:2' }, PB.g.top);
    function draw() {
      const half = Math.max(4, Math.ceil(4.5 * sigma));
      const g = shapePmf('gauss', sigma).filter(d => Math.abs(d[0]) <= half), l = shapePmf('lap', sigma).filter(d => Math.abs(d[0]) <= half);
      const top = Math.max(...g.map(d => d[1]), ...l.map(d => d[1]));
      PT.domain({ x: [-half, half], y: [0, top * 1.12] });
      PT.clear();
      const mk = half <= 12 ? 3.2 : false;
      line(PT, g, { color: series(0), markers: mk });
      line(PT, l, { color: series(1), markers: mk });
      mark.setAttribute('x1', PB.x(sigma)); mark.setAttribute('x2', PB.x(sigma));
      mark.setAttribute('y1', PB.m.t); mark.setAttribute('y2', PB.H - PB.m.b);
      const mg = shapeMC('gauss', sigma), ml = shapeMC('lap', sigma);
      tblBox.replaceChildren(table(['shape', 'formula log₂σ + c', 'exact (bits)', 'Monte Carlo (bits)'], [
        ['Gaussian', `${fmt(shapeFormula('gauss', sigma), 3)}`, fmt(shapeExactH('gauss', sigma), 3), fmt(mg.H, 3)],
        ['Laplace', `${fmt(shapeFormula('lap', sigma), 3)}`, fmt(shapeExactH('lap', sigma), 3), fmt(ml.H, 3)],
      ], { left: [0] }));
    }
    draw();
  };

  // ================================================================= II.12 — the exchange rate
  FIG.siExchange = host => {
    let R2 = 0.75;
    const MAXR = 0.995;
    const bL = h('div'), bR = h('div');
    const kR = kpi(tex('\\vRsq'), '', 'variance explained', series(2));
    const kS = kpi('residual spread', '', 'of the original σ', series(0));
    const kB = kpi('bits saved', '', 'per value', series(4));
    const kN = kpi('next bit needs', '', '', series(1));
    const sl = slider(texify('$\\vRsq$'), 0, MAXR, 0.005, R2, v => { R2 = v; draw(); }, v => fmtPct(v, 1));
    host.append(controls(sl), h('div', { class: 'fig-row' }, bL, bR), h('div', { class: 'kpis' }, kR, kS, kB, kN));
    const P = Plot(bL, { x: [0, 1], y: [0, 4], h: 300, xticks: [0, 0.25, 0.5, 0.75, 1], xfmt: v => fmtPct(v, 0), xlabel: 'variance explained R²', ylabel: 'bits saved per value', label: 'Bits saved against the share of variance explained' });
    line(P, linspace(0, MAXR, 300).map(r => [r, exchangeBits(r)]), { color: series(4) });
    [[0.5, '50 %'], [0.75, '75 %'], [0.9, '90 %'], [0.9375, '94 %'], [0.99, '99 %']].forEach(([r, lab]) => {
      const pt = dot(P.g.data, P.x(r), P.y(exchangeBits(r)), 4 * P.fs, 'var(--ink-2)');
      hover(pt, () => `<b>R² = ${lab}</b><br>saves ${bitsTxt(exchangeBits(r))}`);
    });
    rule(P, { y: 1, label: '1 bit' }); rule(P, { y: 2, label: '2 bits' });
    const knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
    draggable(knob, P, ([x]) => { R2 = clamp(x, 0, MAXR); sl.set(R2); draw(); }, null, { get: () => [R2, exchangeBits(R2)], step: [0.01, 0], label: 'variance explained' });
    const PR = Plot(bR, { x: [-3.5, 3.5], y: [0, 1.6], h: 300, xlabel: 'value minus its prediction (in σ of the original)', ylabel: 'density', grid: 'y', label: 'The spread before and after prediction' });
    const bell = s => linspace(-3.5, 3.5, 281).map(x => [x, Math.exp(-x * x / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI))]);
    function draw() {
      const s = Math.sqrt(1 - R2), b = exchangeBits(R2);
      knob.setAttribute('cx', P.x(R2)); knob.setAttribute('cy', P.y(b));
      PR.domain({ y: [0, Math.min(6, Math.max(0.5, 1.15 / (s * Math.sqrt(2 * Math.PI))))] });
      PR.clear();
      area(PR, bell(1), { color: series(0), opacity: 0.12 });
      line(PR, bell(1), { color: series(0), width: 1.8 });
      area(PR, bell(s), { color: series(2), opacity: 0.2 });
      line(PR, bell(s), { color: series(2) });
      el('text', { x: PR.x(1.3), y: PR.y(0.24), class: 'annot', text: 'before: σ' }, PR.g.top);
      kR.set(fmtPct(R2, 1), 'variance explained');
      kS.set(`${fmt(100 * s, 1)} %`, `of the original σ: ${tex('\\sqrt{1-\\vRsq}')}`);
      kB.set(fmt(b, 2), 'bits per value');
      const nxt = 1 - (1 - R2) / 4;
      kN.set(nxt <= MAXR + 1e-9 ? fmtPct(nxt, 1) : '> 99.5 %', 'R² for one more bit');
    }
    draw();
  };
})();
