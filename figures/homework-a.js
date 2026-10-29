/* Figures for homework-a: Part VI, pages VI.1–VI.12 (napkin information theory, the four dictionaries).
   Builders are prefixed "hwa" (homework-b's figures load on the same pages).
   Monte Carlo data comes from analysis/homework_a_*.py → figures/data/homework-a-*.json. */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------------ shared helpers
  /** The 127 non-negative E4M3 values, sorted (0, 7 subnormals, 15 binades × 8, minus NaN). */
  const GRID = (() => {
    const g = [0];
    for (let m = 1; m < 8; m++) g.push(m / 8 * 2 ** -6);
    for (let e = 1; e < 16; e++) for (let m = 0; m < 8; m++) g.push((1 + m / 8) * 2 ** (e - 7));
    g.pop();                                   // S.1111.111 is NaN
    return g;
  })();
  /** Grid position (index space) of the E4M3 value nearest to x: −126 … 126. */
  function e4m3Index(x) {
    const a = Math.min(Math.abs(x), 448);
    let lo = 0, hi = GRID.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (GRID[mid] <= a) lo = mid; else hi = mid; }
    const k = (a - GRID[lo] <= GRID[hi] - a) ? lo : hi;
    return x < 0 ? -k : k;
  }
  // error function (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7) and the standard normal CDF
  function erf(x) {
    const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
    return s * y;
  }
  const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
  /** Entropy (bits) of a list of probabilities, ignoring zeros. */
  const Hbits = ps => ps.reduce((H, p) => (p > 0 ? H - p * Math.log2(p) : H), 0);
  /** Order-0 entropy (bits) of an array of integers. */
  function histH(arr) {
    const c = new Map();
    for (const v of arr) c.set(v, (c.get(v) || 0) + 1);
    let H = 0; const n = arr.length;
    for (const k of c.values()) { const p = k / n; H -= p * Math.log2(p); }
    return H;
  }
  /** Fetch one of our Monte Carlo data files (fails loudly). */
  async function data(name) {
    const r = await fetch((window.KV && KV.prefix ? KV.prefix : '/') + 'assets/figs/data/' + name);
    if (!r.ok) throw new Error(`could not load ${name} (${r.status})`);
    return r.json();
  }
  // brand colours of the cast (CSS variables generated from data/terms)
  const BRAND = { solo: 'var(--t-solo)', loc: 'var(--t-loc)', klt: 'var(--t-klt)', vq: 'var(--t-vq)', sib: 'var(--t-sib)' };
  const EMB = { solo: 'lantern', loc: 'anchor', klt: 'compass', vq: 'hive', sib: 'twins' };
  const NAME = { solo: 'solo', loc: 'loc', klt: 'KLT', vq: 'VQ', sib: 'sib' };
  const NICK = { solo: 'the Hermit', loc: 'the Anchor', klt: 'the Compass', vq: 'the Hive', sib: 'the Twin' };
  const embSvg = (k, cls = 'hwa-emb') => `<svg class="${cls}" aria-hidden="true" style="color:${BRAND[k]}"><use href="#emb-${EMB[k]}"></use></svg>`;
  const castLabel = k => `${embSvg(k)}<b>${NAME[k]}</b> <span class="hwa-nick">${NICK[k]}</span>`;
  const gauss = (x, b) => 0.5 * Math.log2(x / b);
  const hwa = { GRID, e4m3Index, Phi, Hbits, histH, data, BRAND, EMB, NAME, NICK, embSvg, castLabel, gauss };

  // ================================================================== VI.1  the bit budget
  /* Exact code usage of a Gaussian channel on the E4M3 grid and on an INT8 grid. */
  FIG.hwaCodeUsage = (host) => {
    let lg = 5, int8mode = 'tensor';               // σ = 2^lg, in E4M3's own units (largest value 448)
    const TSTEP = 2;                               // INT8, one scale per tensor: the widest channel (σ = 64) puts 4σ at code 127
    // E4M3 cell edges in index space: midpoints between neighbouring grid values (positive side)
    function e4m3Probs(sig) {
      const s = sig, out = new Map();
      for (let k = -126; k <= 126; k++) {
        const a = Math.abs(k);
        const lo = a === 0 ? 0 : (GRID[a - 1] + GRID[a]) / 2;
        const hi = a === 126 ? Infinity : (GRID[a] + GRID[a + 1]) / 2;
        let p;
        if (k === 0) p = Phi(hi / s) - Phi(-hi / s);
        else p = Phi(hi / s) - Phi(lo / s);
        out.set(k, p);
      }
      return out;
    }
    function int8Probs(sig) {
      const step = int8mode === 'channel' ? sig / 32 : TSTEP;     // own scale: 4σ ↦ code 127
      const out = new Map();
      for (let k = -127; k <= 127; k++) {
        const lo = k === -127 ? -Infinity : (k - 0.5) * step, hi = k === 127 ? Infinity : (k + 0.5) * step;
        out.set(k, Phi(hi / sig) - Phi(lo / sig));
      }
      return out;
    }
    const boxA = h('div'), boxB = h('div');
    const kA = kpi('E4M3: order-0 entropy', '', 'bits per element', series(0));
    const kB = kpi('INT8: order-0 entropy', '', 'bits per element', series(1));
    const kC = kpi('codes in use', '', 'covering 99 % of values');
    const sl = slider(texify('channel spread $\\vsigma$'), -4, 7, 0.25, lg, v => { lg = v; draw(); },
      v => { const s = 2 ** v; return s >= 1 ? fmt(s, s % 1 ? 2 : 0) : '1/' + fmt(1 / s, 1); });
    const sw = seg([['tensor', 'INT8: one scale per tensor'], ['channel', 'INT8: own scale per channel']], int8mode, v => { int8mode = v; draw(); }, 'INT8 scaling');
    host.append(controls(sl, sw), boxA, boxB, h('div', { class: 'kpis' }, kA, kB, kC));
    const mk = (box, xl, col) => Plot(box, { x: [-128, 128], y: [0, 1], h: 190, xlabel: xl, ylabel: 'probability', yfmt: v => fmtPct(v, 0), grid: 'y', label: xl + ': probability of each code', xticks: [-120, -80, -40, 0, 40, 80, 120] });
    const PA = mk(boxA, 'E4M3 grid position (index space)'), PB = mk(boxB, 'INT8 code');
    function drawHist(P, probs, color, name) {
      P.clear();
      const top = Math.max(...probs.values());
      P.domain({ y: [0, top * 1.15] });
      const g = el('g', {}, P.g.data);
      const w = Math.max(1, P.x(1) - P.x(0));
      for (const [k, p] of probs) {
        if (p < 1e-7) continue;
        el('rect', { x: P.x(k) - w / 2, y: P.y(p), width: w * 0.9, height: Math.max(0, P.y(0) - P.y(p)), style: `fill:${color}` }, g);
      }
      const hit = el('rect', { class: 'hit', x: P.m.l, y: P.m.t, width: P.pw, height: P.ph }, P.g.top);
      hover(hit, e => { const k = Math.round(P.toData(e)[0]); const p = probs.get(k); return p == null ? '' : `<b>${name} code ${k}</b><br>probability ${fmtPct(p, 2)}<br>costs ${p > 0 ? fmt(-Math.log2(p), 1) : '∞'} bits`; });
    }
    function covering(probs) {
      const ps = [...probs.values()].sort((a, b) => b - a);
      let c = 0, n = 0; while (c < 0.99 && n < ps.length) c += ps[n++];
      return n;
    }
    function draw() {
      const s = 2 ** lg, A = e4m3Probs(s), B = int8Probs(s);
      drawHist(PA, A, series(0), 'E4M3');
      drawHist(PB, B, series(1), 'INT8');
      const HA = Hbits([...A.values()]), HB = Hbits([...B.values()]);
      kA.set(fmt(HA, 2), 'bits per element');
      kB.set(fmt(HB, 2), int8mode === 'channel' ? 'bits — own scale per channel' : 'bits — one scale per tensor');
      kC.set(`${covering(A)} · ${covering(B)}`, 'E4M3 · INT8, covering 99 % of values');
    }
    draw();
  };

  /* The bit budget: raw vs coding each element alone. Numbers from our Monte Carlo + SplitZip. */
  FIG.hwaBudgetBars = async (host) => {
    const d = await data('homework-a-budget.json');
    const r = d.ref;
    const rows = [
      { cat: 'raw 8-bit', v: 8, c: 'var(--slate)', note: 'every element stored as its byte' },
      { cat: 'E4M3 · fixed-length', v: r.fixed_length.top8.bits, c: series(0), note: `sign + mantissa raw, exponent in 3 bits (top 8), ${fmtPct(r.fixed_length.top8.escape_fraction, 1)} escaped — our Monte Carlo` },
      { cat: 'E5M2 · fixed-length', v: 8 / 1.14, c: series(1), note: 'SplitZip on real KV: 1.14× (reported ratio)' },
      { cat: 'E4M3 · ideal', v: r.H_e4m3, c: series(0), note: 'order-0 entropy of a Gaussian channel — our Monte Carlo' },
      { cat: 'E5M2 · ideal', v: 6.19, c: series(1), note: 'order-0 bound SplitZip reports for real KV' },
    ];
    const box = h('div');
    host.append(legend([['E4M3, Gaussian channel (our Monte Carlo)', series(0), 'box'], ['E5M2, real KV (SplitZip)', series(1), 'box'], ['raw', 'var(--slate)', 'box']]), box);
    const P = Plot(box, { ycats: rows.map(x => x.cat), x: [0, 10], xticks: [0, 2, 4, 6, 8], h: 250, xlabel: 'bits per element (bpe)', grid: 'x', label: 'Bits per element for raw storage and context-free codes' });
    bars(P, rows.map(x => x.v), {
      horizontal: true, colors: (i) => rows[i].c, width: 30,
      labels: v => `${fmt(v, 2)} · ${fmt(8 / v, 2)}×`,
      tip: (v, i) => `<b>${rows[i].cat}</b><br>${fmt(v, 2)} bits per element = ${fmt(8 / v, 2)}× smaller than raw<br><i>${rows[i].note}</i>`,
    });
    rule(P, { x: 8 });
  };

  // ================================================================== VI.2  solo coding
  /* The Hermit's blind spot: a block's distribution vs the global code (Gaussian cross-entropy penalty). */
  FIG.hwaSoloDrift = (host) => {
    let mu = 0.6, R2 = 0.6;
    const box = h('div');
    const kNow = kpi('extra cost on this block', '', 'bits per element', BRAND.solo);
    const kAvg = kpi('average over all blocks', '', texify('$\\tfrac12\\log_2\\frac{1}{1-\\vRsq}$'), BRAND.loc);
    const slMu = slider('this block\'s offset (σ)', -2, 2, 0.05, mu, v => { mu = v; draw(); }, v => fmtS(v, 1));
    const slR = slider(texify('block means explain $\\vRsq$'), 0, 0.95, 0.01, R2, v => { R2 = v; draw(); }, v => fmt(v, 2));
    host.append(controls(slMu, slR), legend([['the whole corpus (the Hermit\'s code is fit to this)', 'var(--ink-3)', 'band'], ['this block\'s values', BRAND.loc, 'band']]), box, h('div', { class: 'kpis' }, kNow, kAvg));
    const P = Plot(box, { x: [-4, 4], y: [0, 1], h: 260, xlabel: 'value, in units of the corpus spread', ylabel: 'density', grid: 'x', label: 'Global distribution and one block distribution' });
    const pdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
    const xs = linspace(-4, 4, 241);
    function draw() {
      const sw = Math.sqrt(1 - R2);
      const kl = -0.5 * Math.log2(sw * sw) + (sw * sw + mu * mu - 1) / (2 * Math.LN2);
      const avg = -0.5 * Math.log2(1 - R2);
      const top = pdf(0, 0, sw) * 1.12;
      P.domain({ y: [0, Math.max(0.5, top)] });
      P.clear();
      area(P, xs.map(x => [x, pdf(x, 0, 1)]), { color: 'var(--ink-3)', opacity: 0.18, line: true });
      area(P, xs.map(x => [x, pdf(x, mu, sw)]), { color: BRAND.loc, opacity: 0.22, line: true });
      rule(P, { x: mu, label: 'block\'s typical value', color: BRAND.loc });
      kNow.set(fmt(Math.max(0, kl), 2), 'bits per element, this block');
      kAvg.set(fmt(avg, 2), 'bits per element, averaged over blocks');
    }
    draw();
  };

  // ================================================================== VI.3  the exchange rate, applied
  FIG.hwaExchange = (host) => {
    let R2 = 0.75, base = 6.47;
    const saved = r => -0.5 * Math.log2(1 - r);
    const box = h('div');
    const kRate = kpi('new rate', '', 'bits per element');
    const kExtra = kpi('extra compression', '', 'on top of solo coding', series(2));
    const kTot = kpi('total vs raw 8 bits', '', '', series(3));
    host.append(
      controls(seg([[6.47, 'E4M3 Gaussian: 6.47 bits'], [6.19, 'E5M2 real KV: 6.19 bits']], base, v => { base = v; draw(); }, 'starting rate')),
      box, h('div', { class: 'kpis' }, kRate, kExtra, kTot));
    const P = Plot(box, { x: [0, 1], y: [0, 4], h: 330, xlabel: 'variance the dictionary predicts (R², after solo coding)', ylabel: 'bits saved per element', xfmt: v => fmtPct(v, 0), label: 'Bits saved against variance explained' });
    line(P, linspace(0, 0.995, 200).map(r => [r, saved(r)]), { color: series(4), width: 2.6 });
    [0.5, 0.75, 0.9, 0.94, 0.99].forEach(r => {
      dot(P.g.data, P.x(r), P.y(saved(r)), 4 * P.fs, series(4));
      svgText(P.g.data, P.x(r) - 8 * P.fs, P.y(saved(r)) - 8 * P.fs, `${fmtPct(r, 0)} → ${fmt(saved(r), 2)}`, { class: 'val', 'text-anchor': 'end' });
    });
    const guide = el('g', {}, P.g.top);
    const knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
    draggable(knob, P, ([x]) => { R2 = clamp(Math.round(x * 200) / 200, 0, 0.99); draw(); }, null,
      { get: () => [R2, saved(R2)], step: [0.01, 0], label: 'share of variance explained' });
    hover(knob, () => `<b>R² = ${fmtPct(R2, 1)}</b><br>saves ${fmt(saved(R2), 2)} bits per element`);
    function draw() {
      const s = saved(R2), nr = base - s;
      knob.setAttribute('cx', P.x(R2)); knob.setAttribute('cy', P.y(Math.min(4, s)));
      guide.replaceChildren();
      el('line', { x1: P.x(R2), x2: P.x(R2), y1: P.y(0), y2: P.y(Math.min(4, s)), style: 'stroke:var(--c);stroke-dasharray:4 4;stroke-width:1.5' }, guide);
      el('line', { x1: P.x(0), x2: P.x(R2), y1: P.y(Math.min(4, s)), y2: P.y(Math.min(4, s)), style: 'stroke:var(--c);stroke-dasharray:4 4;stroke-width:1.5' }, guide);
      kRate.set(fmt(nr, 2), `bits per element (from ${fmt(base, 2)}, saving ${fmt(s, 2)})`);
      kExtra.set(fmt(base / nr, 2) + '×', 'on top of solo coding');
      kTot.set(fmt(8 / nr, 2) + '×', `raw 8 bits → ${fmt(nr, 2)} bits`);
    }
    draw();
  };

  // ================================================================== VI.4  the shape of every dictionary coder
  FIG.hwaShapeStepper = (host) => {
    const r = rng('hwa-shape-7');
    const N = 8, D = 640, C = 64, B = 4096;
    const ent = [], res = [], pre = [];
    for (let i = 0; i < N; i++) {
      const e = clamp(Math.round(r.normal(0, 32)), -127, 127), q = Math.round(r.normal(0, 16));
      ent.push(e); res.push(q); pre.push(e - q);
    }
    const H = s => Math.log2(s) + 0.5 * Math.log2(2 * Math.PI * Math.E);    // Gaussian ideal rate, step 1
    const solo = H(32), resid = H(16), tax = Math.log2(C) / D, dict = 8 * C / B;
    const steps = [
      { show: 1, bar: 0, label: `The entry: the first 8 of its ${D} elements, as INT8 codes. Coded alone (solo), each costs about ${fmt(solo, 2)} bits.` },
      { show: 2, bar: 0, label: `The dictionary predicts every element. Here the prediction is prototype #37 of ${C}; the receiver must be told which one — that is the per-entry tax.` },
      { show: 3, bar: 0, label: 'Subtract exactly: residual = entry − prediction, integer by integer. No rounding, so nothing can be lost.' },
      { show: 3, bar: 1, label: `Code the residual. Its spread is 16 codes instead of 32, so each element costs one bit less: ${fmt(resid, 2)} bits.` },
      { show: 3, bar: 2, label: `Pay the tax: ${Math.log2(C)} bits per entry to name the prototype, ${Math.log2(C)}/${D} = ${fmt(tax, 3)} bit per element.` },
      { show: 3, bar: 3, label: `Pay for the dictionary: ${C} prototypes are ${C} entries' worth, shared by a block of ${B}: 8·${C}/${B} = ${fmt(dict, 3)} bit per element. Total ${fmt(resid + tax + dict, 2)}, i.e. ${fmt(solo - resid - tax - dict, 2)} below solo.` },
      { show: 4, bar: 3, label: 'Decoding runs backwards: prediction + residual gives every code back exactly.' },
    ];
    const D_ = Diagram(host, { w: 640, h: 300, label: 'An entry, its prediction, its residual and the bill in bits', grow: 0.4 });
    const g = el('g', {}, D_.svg);
    const fs = D_.fs;
    stepper(host, {
      steps, label: s => s.label,
      render(i, s) {
        g.replaceChildren();
        const rows = [['entry', ent, 'var(--paper)'], ['prediction', pre, `color-mix(in srgb, ${BRAND.vq} 18%, var(--paper))`], ['residual', res, `color-mix(in srgb, ${series(2)} 18%, var(--paper))`]];
        const x0 = 96, bw = 46, gap = 6, y0 = 26, rh = 54;
        rows.forEach(([name, vals, fill], k) => {
          const y = y0 + k * (rh + 22);
          const on = s.show > k;
          el('text', { x: x0 - 10, y: y + rh / 2 + 4, 'text-anchor': 'end', class: 'lbl', text: name, style: `opacity:${on ? 1 : 0.3}` }, g);
          vals.forEach((v, j) => {
            const x = x0 + j * (bw + gap);
            el('rect', { x, y, width: bw, height: rh - 14, rx: 6, style: `fill:${on ? fill : 'var(--paper-2)'};stroke:var(--rule);opacity:${on ? 1 : 0.35}` }, g);
            if (on) el('text', { x: x + bw / 2, y: y + (rh - 14) / 2 + 5 * fs, 'text-anchor': 'middle', class: 'val', text: (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) }, g);
          });
          if (k > 0 && on) el('text', { x: x0 + 4 * (bw + gap) - gap / 2, y: y - 6, 'text-anchor': 'middle', class: 'annot', text: k === 1 ? 'from the dictionary (prototype #37)' : 'entry − prediction, exactly' }, g);
          if (k === 2 && s.show > 3) el('text', { x: x0 + 8 * (bw + gap) - gap / 2, y: y + rh + 2, 'text-anchor': 'end', class: 'annot', text: 'prediction + residual = entry ✓' }, g);
        });
        // the bill
        const bx = 560, by0 = 262, sc = 27;           // 27 px per bit
        [0, 2, 4, 6, 8].forEach(t => { el('text', { x: bx - 26, y: by0 - t * sc + 4, 'text-anchor': 'end', class: 'val', text: t }, g); el('line', { x1: bx - 22, x2: bx + 64, y1: by0 - t * sc, y2: by0 - t * sc, style: `stroke:${t ? 'var(--rule)' : 'var(--ink-3)'};stroke-dasharray:${t ? '2 4' : 'none'}` }, g); });
        el('text', { x: bx + 21, y: 12, 'text-anchor': 'middle', class: 'lbl', text: 'bits / element' }, g);
        const seg_ = (x, from, to, fill, title) => { const rr = el('rect', { x, y: by0 - to * sc, width: 34, height: Math.max(1.5, (to - from) * sc), style: `fill:${fill}` }, g); hover(rr, () => title); };
        seg_(bx - 16, 0, solo, 'var(--slate)', `<b>solo</b>: ${fmt(solo, 2)} bits per element`);
        el('text', { x: bx + 1, y: by0 + 16 * fs, 'text-anchor': 'middle', class: 'lbl', text: 'solo' }, g);
        let acc = 0;
        if (s.bar >= 1) { seg_(bx + 24, 0, resid, series(2), `<b>residual</b>: ${fmt(resid, 2)} bits`); acc = resid; }
        if (s.bar >= 2) { seg_(bx + 24, acc, acc + tax, BRAND.vq, `<b>tax</b>: ${fmt(tax, 3)} bit`); acc += tax; }
        if (s.bar >= 3) { seg_(bx + 24, acc, acc + dict, 'var(--gold)', `<b>dictionary</b>: ${fmt(dict, 3)} bit`); acc += dict; }
        el('text', { x: bx + 41, y: by0 + 16 * fs, 'text-anchor': 'middle', class: 'lbl', text: 'dict.' }, g);
        if (s.bar >= 1) el('text', { x: bx + 41, y: by0 - acc * sc - 6, 'text-anchor': 'middle', class: 'val', text: fmt(acc, 2) }, g);
        el('text', { x: bx + 1, y: by0 - solo * sc - 6, 'text-anchor': 'middle', class: 'val', text: fmt(solo, 2) }, g);
      },
    });
    host.append(legend([['solo', 'var(--slate)', 'box'], ['residual bits', series(2), 'box'], ['per-entry tax', BRAND.vq, 'box'], ['dictionary, amortized', 'var(--gold)', 'box']]));
  };

  // ================================================================== VI.5  loc: the Anchor
  FIG.hwaLocGain = (host) => {
    const NB = 8, PER = 48, r = rng('hwa-loc-3');
    // fixed draws, standardized so the drift share is exactly what the slider says (in the population)
    const zb = range(NB).map(() => r.normal());
    const zm = mean(zb), zs = Math.sqrt(variance(zb));
    const off = zb.map(z => (z - zm) / zs);
    const noise = range(NB * PER).map(() => r.normal());
    const nm = mean(noise), ns = Math.sqrt(variance(noise));
    const eps = noise.map(z => (z - nm) / ns);
    let R2 = 0.75;
    const box = h('div');
    const kT = kpi(tex('\\vsigma^2_{\\text{total}}'), '', 'all blocks together', 'var(--ink-3)');
    const kW = kpi(tex('\\vsigma^2_{\\text{within}}'), '', 'average inside a block', BRAND.loc);
    const kG = kpi('gain of loc', '', 'bits per element', BRAND.loc);
    host.append(controls(slider('drift share', 0, 0.95, 0.01, R2, v => { R2 = v; draw(); }, v => fmtPct(v, 0))),
      legend([['the Hermit: global mean ± 1 sd', 'var(--ink-3)', 'band'], ['the Anchor: block median ± 1 within-block sd', BRAND.loc, 'band'], ['values', 'var(--ink-2)', 'dot']]),
      box, h('div', { class: 'kpis' }, kT, kW, kG));
    const P = Plot(box, { x: [0, NB * PER], y: [-3.6, 3.6], h: 300, xlabel: 'token position (8 blocks of 48)', ylabel: 'value (global sd = 1)', grid: 'y', label: 'One channel over eight blocks with block medians' });
    function draw() {
      const a = Math.sqrt(R2), b = Math.sqrt(1 - R2);
      const xs = range(NB * PER).map(i => a * off[Math.floor(i / PER)] + b * eps[i]);
      const vt = variance(xs), mt = mean(xs);
      let vw = 0;
      const meds = range(NB).map(j => { const blk = xs.slice(j * PER, (j + 1) * PER); vw += variance(blk) / NB; return [quantile(blk, 0.5), Math.sqrt(variance(blk))]; });
      P.clear();
      area(P, [[0, mt - Math.sqrt(vt), mt + Math.sqrt(vt)], [NB * PER, mt - Math.sqrt(vt), mt + Math.sqrt(vt)]], { color: 'var(--ink-3)', opacity: 0.12 });
      line(P, [[0, mt], [NB * PER, mt]], { color: 'var(--ink-3)', dash: '6 4', width: 1.6 });
      meds.forEach(([m, sd], j) => {
        area(P, [[j * PER, m - sd, m + sd], [(j + 1) * PER, m - sd, m + sd]], { color: BRAND.loc, opacity: 0.18 });
        line(P, [[j * PER, m], [(j + 1) * PER, m]], { color: BRAND.loc, width: 3 });
        if (j) el('line', { x1: P.x(j * PER), x2: P.x(j * PER), y1: P.m.t, y2: P.H - P.m.b, style: 'stroke:var(--rule);stroke-dasharray:2 3' }, P.g.data);
      });
      const g = el('g', {}, P.g.data);
      xs.forEach((v, i) => el('circle', { cx: P.x(i + 0.5), cy: P.y(v), r: 1.7 * P.fs, style: 'fill:var(--ink-2);opacity:.55' }, g));
      kT.set(fmt(vt, 2), 'all blocks together');
      kW.set(fmt(vw, 2), 'average inside a block');
      kG.set(fmt(0.5 * Math.log2(vt / vw), 2), 'bits per element: ½ log₂(total / within)');
    }
    draw();
  };

  // ================================================================== VI.6  KLT: the Compass
  FIG.hwaKltSpectrum = (host) => {
    const D = 64;
    let ns = 8, lgS = 1, lgW = 0;        // strong count, log10 strong variance, log10 weak variance
    const box = h('div');
    const kG = kpi('KLT gain', '', 'bits per element', BRAND.klt);
    const kB = kpi('full basis pays off when', '', '', 'var(--gold)');
    const kB2 = kpi('same shape at d = 640', '', '', 'var(--gold)');
    host.append(controls(
      slider('strong directions', 1, 32, 1, ns, v => { ns = v; draw(); }, v => `${v} of ${D}`),
      slider('their variance', -0, 2, 0.05, lgS, v => { lgS = v; draw(); }, v => fmt(10 ** v, 10 ** v < 10 ? 1 : 0)),
      slider('variance of the rest', -2, 0, 0.05, lgW, v => { lgW = v; draw(); }, v => fmt(10 ** v, 10 ** v < 0.1 ? 3 : 2)),
    ), legend([['eigenvalues (spread along each KLT axis)', BRAND.klt, 'box'], ['AM: arithmetic average', series(3), 'dash'], ['GM: geometric average', series(1), 'dash']]), box, h('div', { class: 'kpis' }, kG, kB, kB2));
    const P = Plot(box, { x: [0.5, D + 0.5], y: [0.01, 200], ylog: 10, h: 300, xlabel: 'KLT direction, strongest first', ylabel: 'variance (λ)', grid: 'y', label: 'Sorted eigenvalue spectrum with arithmetic and geometric averages', xticks: [1, 8, 16, 24, 32, 40, 48, 56, 64] });
    function draw() {
      const s = 10 ** lgS, w = 10 ** lgW;
      const lam = range(D).map(i => (i < ns ? s : w));
      const AM = mean(lam), GM = Math.exp(mean(lam.map(Math.log)));
      const gain = 0.5 * Math.log2(AM / GM);
      P.clear();
      const g = el('g', {}, P.g.data), bw = (P.x(2) - P.x(1)) * 0.8;
      lam.forEach((v, i) => {
        const r_ = el('rect', { x: P.x(i + 1) - bw / 2, y: P.y(v), width: bw, height: P.y(0.01) - P.y(v), style: `fill:${BRAND.klt};opacity:${i < ns ? 0.95 : 0.55}` }, g);
        hover(r_, () => `<b>direction ${i + 1}</b><br>variance λ = ${fmt(v, 3)}`);
      });
      rule(P, { y: AM, label: `AM = ${fmt(AM, 3)}`, color: series(3) });
      rule(P, { y: GM, label: `GM = ${fmt(GM, 3)}`, color: series(1) });
      kG.set(fmt(gain, 2), 'bits per element: ½ log₂(AM/GM)');
      const be = n => (gain > 1e-6 ? fmtSI(8 * 2 * n / gain, 1) : '∞');
      kB.set(`b > ${be(D)}`, `d = ${D}: 8·(2d)/b below the gain`);
      kB2.set(`b > ${be(640)}`, 'entries per block, basis w = 1280');
    }
    draw();
  };

  // ================================================================== VI.7  VQ: the Hive
  FIG.hwaVqCheck = async (host) => {
    const d = await data('homework-a-vq.json');
    let which = 'correlated';
    const box = h('div');
    const ro = readout();
    host.append(controls(seg([['correlated', 'correlated, bell-shaped (rank 8)'], ['clustered', '32 clusters']], which, v => { which = v; draw(); }, 'data set')),
      legend([['gross: what the residual saves', series(0), 'box'], ['tax: index + codebook', series(1), 'box'], ['net = gross − tax', 'var(--good)', 'box'], ['KLT gain (no tax)', BRAND.klt, 'dash']]), box, ro);
    const Cs = d.correlated.rows.map(r => r.C);
    const P = Plot(box, { xcats: Cs.map(String), y: [-1.5, 2.4], h: 320, xlabel: 'codebook size C (centroids)', ylabel: 'bits per element', grid: 'y', label: 'VQ gross saving, tax and net against codebook size' });
    function draw() {
      const D_ = d[which];
      P.clear();
      el('line', { x1: P.m.l, x2: P.W - P.m.r, y1: P.y(0), y2: P.y(0), style: 'stroke:var(--ink-2);stroke-width:1.2' }, P.g.data);
      bars(P, D_.rows.map(r => [r.gross, r.tax, r.net]), {
        colors: (i, j, v) => (j === 0 ? series(0) : j === 1 ? series(1) : v < 0 ? 'var(--bad)' : 'var(--good)'),
        labels: (v, i, j) => (j === 2 ? fmtS(v, 2) : ''), width: 22,
        tip: (v, i, j) => { const r = D_.rows[i]; return `<b>C = ${r.C}</b><br>gross ${fmt(r.gross, 3)} bits<br>tax ${fmt(r.tax, 3)} = index ${fmt(r.tax_index, 3)} + codebook ${fmt(r.tax_codebook, 3)}<br>net <b>${fmtS(r.net, 3)}</b><br><i>Gaussian bound on gross: KLT + index = ${fmt(r.bound_gross, 3)}</i>`; },
      });
      rule(P, { y: D_.klt_formula, label: `KLT gain ${fmt(D_.klt_formula, 2)} (no tax)`, color: BRAND.klt });
      const best = D_.rows.reduce((a, r) => (r.net > a.net ? r : a));
      ro.set([['best VQ net', `${fmtS(best.net, 2)} bits at C = ${best.C}`], ['KLT, formula', `${fmt(D_.klt_formula, 2)} bits`], ['KLT, rotated and measured', `${fmt(D_.klt_measured, 2)} bits`], ['KLT basis, if charged', `${fmt(D_.klt_basis_cost, 3)} bits`]]);
    }
    draw();
  };

  // ================================================================== VI.8  sib: the Twin
  FIG.hwaSibTwins = (host) => {
    let f = 0.3, nu = 0.1;
    const D = 640, PTR = 12 / D, FLAG = 1 / D;
    const twin = v => 0.5 * Math.log2(1 / (2 * v));
    const box = h('div');
    const kT = kpi('a twinned entry saves', '', 'bits per element vs the Anchor', BRAND.sib);
    const kN = kpi('whole block, net', '', 'bits per element vs the Anchor', BRAND.sib);
    host.append(controls(
      slider('entries with a twin', 0, 1, 0.01, f, v => { f = v; draw(); }, v => fmtPct(v, 0)),
      slider('noise share', 0.01, 1, 0.01, nu, v => { nu = v; draw(); }, v => fmtPct(v, 0)),
    ), legend([['entry with a true twin', BRAND.sib], ['entry with no twin: random sibling', BRAND.sib, 'dash'], ['the Anchor (reference)', BRAND.loc]]), box, h('div', { class: 'kpis' }, kT, kN));
    const P = Plot(box, { x: [0, 1], y: [-0.8, 3], h: 290, xlabel: 'noise share σ²_noise / (σ²_own + σ²_noise)', ylabel: 'bits per element vs the Anchor', xfmt: v => fmtPct(v, 0), label: 'Bits saved by the Twin against the Anchor' });
    line(P, linspace(0.01, 1, 200).map(v => [v, twin(v)]), { color: BRAND.sib, width: 2.6 });
    line(P, [[0, -0.5], [1, -0.5]], { color: BRAND.sib, dash: '7 5' });
    line(P, [[0, 0], [1, 0]], { color: BRAND.loc, width: 1.6 });
    annotate(P, 0.5, 0, 'twins stop helping at 50 %', { dx: 30, dy: -40 });
    const mark = el('g', {}, P.g.top);
    function draw() {
      const g = Math.max(0, twin(nu) - PTR);
      mark.replaceChildren();
      dot(mark, P.x(nu), P.y(twin(nu)), 6 * P.fs, 'var(--c)');
      kT.set(fmtS(twin(nu), 2), `before its 12-bit pointer (${fmt(PTR, 3)} per element)`);
      kN.set(fmtS(f * g - FLAG, 2), `${fmtPct(f, 0)} twinned, the rest use the Anchor; 1 flag bit per entry`);
    }
    draw();
  };

  FIG.hwaSibNearest = async (host) => {
    const d = await data('homework-a-sib.json');
    let ptr = false;
    const ds = [...new Set(d.rows.map(r => r.d))];
    const box = h('div');
    const tog = btn('add the pointer tax', (e, b) => { ptr = !ptr; b.setAttribute('aria-pressed', String(ptr)); draw(); }, { pressed: false });
    host.append(controls(tog), legend([...ds.map((v, i) => [`d = ${v}`, series(i)]), ['random sibling', 'var(--ink-3)', 'dash']]), box);
    const P = Plot(box, { x: [16, 4096], xlog: 2, y: [-0.8, 1.0], h: 300, xlabel: 'block size b (siblings to choose from)', ylabel: 'bits per element vs the Anchor', label: 'Nearest-sibling penalty against block size, per entry length', xticks: [16, 64, 256, 1024, 4096] });
    function draw() {
      P.clear();
      line(P, [[16, 0], [4096, 0]], { color: BRAND.loc, width: 1.4 });
      line(P, [[16, 0.5], [4096, 0.5]], { color: 'var(--ink-3)', dash: '7 5' });
      ds.forEach((dv, i) => {
        const pts = d.rows.filter(r => r.d === dv).map(r => [r.b, r.pen_nearest + (ptr ? r.pointer : 0)]);
        line(P, pts, { color: series(i), markers: true, name: `d = ${dv}`, tip: p => `<b>d = ${dv}, b = ${p[0]}</b><br>${fmtS(p[1], 3)} bits per element${ptr ? ' (pointer included)' : ''}` });
      });
      svgText(P.g.top, P.x(4096) - 6 * P.fs, P.y(0.5) - 6 * P.fs, 'random sibling +0.5', { class: 'lbl', 'text-anchor': 'end' });
      svgText(P.g.top, P.x(16) + 6 * P.fs, P.y(0) + 14 * P.fs, 'the Anchor', { class: 'lbl' });
    }
    draw();
    crosshair(P, { xname: 'b =', xfmt: v => String(v), yfmt: v => fmtS(v, 3) });
  };

  // ================================================================== VI.9  the four side by side
  FIG.hwaPortrait = async (host) => {
    const d = await data('homework-a-portrait.json');
    let shared = false;
    const worlds = [['drift', 'drift'], ['lowrank', 'low rank'], ['clusters', 'clusters'], ['twins', 'twins'], ['noise', 'noise']];
    const types = ['loc', 'klt', 'vq', 'sib'];
    const wrap = h('div', { class: 'hwa-heat-wrap' });
    host.append(controls(seg([[false, 'KLT basis charged to the block'], [true, 'KLT basis shared (free here)']], shared, v => { shared = v; draw(); }, 'KLT basis')), wrap,
      legend([['net saving (pays for itself)', 'var(--good)', 'box'], ['net loss', 'var(--bad)', 'box']]));
    function draw() {
      wrap.replaceChildren();
      const t = h('table', { class: 'hwa-heat' });
      t.append(h('thead', {}, h('tr', {}, h('th', { text: 'world' }), types.map(k => h('th', { html: castLabel(k) })))));
      const tb = h('tbody');
      worlds.forEach(([w, name]) => {
        const row = d.worlds[w];
        const nets = types.map(k => (k === 'klt' && shared ? row.klt.net_basis_free : row[k].net));
        const best = Math.max(...nets);
        const tr = h('tr', {}, h('th', { html: `${name}<span class="hwa-heat-sub">solo ${fmt(row.solo, 2)} bits</span>` }));
        types.forEach((k, i) => {
          const v = nets[i], a = Math.min(1, Math.abs(v) / 1.4);
          const col = v >= 0 ? 'var(--good)' : 'var(--bad)';
          const td = h('td', { class: v === best ? 'is-best' : null, tabindex: '0', style: `background:color-mix(in srgb, ${col} ${Math.round(8 + 52 * a)}%, var(--paper-3))`, html: `<b>${fmtS(v, 2)}</b>` });
          const r = row[k], dic = k === 'klt' && shared ? 8 / d.b : r.dict;
          hover(td, () => `<b>${NAME[k]} on “${name}”</b><br>gain over solo ${fmtS(r.gain, 3)}<br>− tax ${fmt(r.tax, 3)}<br>− dictionary ${fmt(dic, 3)}<br>= net <b>${fmtS(v, 3)}</b> bits per element`);
          tr.append(td);
        });
        tb.append(tr);
      });
      t.append(tb);
      wrap.append(t);
    }
    draw();
  };

  // ================================================================== VI.10  two rates
  FIG.hwaTwoRates = (host) => {
    let lb = 3, eps = 0.005;                     // β = 2^lb
    const ESC = 8 + 12;
    function rates(beta, e) {
      const pa = new Float64Array(256);          // P(|r| = k), discretized Laplace on −255…255
      let Z = 0;
      for (let k = -255; k <= 255; k++) Z += Math.exp(-Math.abs(k) / beta);
      let H = 0;
      for (let k = -255; k <= 255; k++) { const p = Math.exp(-Math.abs(k) / beta) / Z; pa[Math.abs(k)] += p; if (p > 0) H -= p * Math.log2(p); }
      const tail = n => { let s = 0; for (let k = 2 ** (n - 1); k < 256; k++) s += pa[k]; return s; };
      let c = 0, q = 0; while (q < 255 && c + pa[q] < 1 - e) { c += pa[q]; q++; }
      const nCov = Math.ceil(Math.log2(2 * q + 1)) || 1;
      const cov = nCov + tail(nCov) * ESC;
      let best = Infinity, nBest = 1;
      for (let n = 1; n <= 9; n++) { const v = n + tail(n) * ESC; if (v < best) { best = v; nBest = n; } }
      return { H, cov, nCov, best, nBest };
    }
    const box = h('div');
    const kH = kpi('entropy rate', '', 'bits per element', series(0));
    const kC = kpi('fixed-length, coverage rule', '', '', series(1));
    const kB = kpi('fixed-length, best width', '', '', series(3));
    const slB = slider(texify('Laplace scale $\\vbeta$'), -1, 5, 0.05, lb, v => { lb = v; draw(); }, v => fmt(2 ** v, 2 ** v < 4 ? 2 : 1));
    const slE = slider(texify('escape share $\\veps$'), 0.001, 0.05, 0.001, eps, v => { eps = v; redrawCurves(); draw(); }, v => fmtPct(v, 1));
    host.append(controls(slB, slE), legend([['entropy (ideal coder)', series(0)], ['fixed-length: cover all but ε', series(1)], ['fixed-length: best width', series(3), 'dash']]), box, h('div', { class: 'kpis' }, kH, kC, kB));
    const P = Plot(box, { x: [0.5, 32], xlog: 2, y: [0, 10], h: 300, xlabel: 'Laplace scale β of the residual (grid steps)', ylabel: 'bits per element', label: 'Entropy rate and fixed-length rates against the residual scale' });
    const curveG = el('g', {}, P.g.data), mark = el('g', {}, P.g.top);
    const betas = linspace(-1, 5, 121).map(v => 2 ** v);
    function redrawCurves() {
      curveG.replaceChildren();
      const rs = betas.map(b => [b, rates(b, eps)]);
      line(P, rs.map(([b, r]) => [b, r.H]), { color: series(0), parent: curveG, name: 'entropy' });
      line(P, rs.map(([b, r]) => [b, r.cov]), { color: series(1), parent: curveG, curve: 'linear', name: 'cover all but ε' });
      line(P, rs.map(([b, r]) => [b, r.best]), { color: series(3), parent: curveG, dash: '6 4', name: 'best width' });
    }
    function draw() {
      const b = 2 ** lb, r = rates(b, eps);
      mark.replaceChildren();
      el('line', { x1: P.x(b), x2: P.x(b), y1: P.m.t, y2: P.H - P.m.b, style: 'stroke:var(--c);stroke-dasharray:4 4' }, mark);
      [[r.H, series(0)], [r.cov, series(1)], [r.best, series(3)]].forEach(([v, c]) => dot(mark, P.x(b), P.y(v), 5 * P.fs, c));
      kH.set(fmt(r.H, 2), 'bits per element');
      kC.set(fmt(r.cov, 2), `width ${r.nCov} · gap ${fmtS(r.cov - r.H, 2)} bits (${fmt(100 * (r.cov / r.H - 1), 0)} %)`);
      kB.set(fmt(r.best, 2), `width ${r.nBest} · gap ${fmtS(r.best - r.H, 2)} bits (${fmt(100 * (r.best / r.H - 1), 0)} %)`);
    }
    redrawCurves(); draw();
    crosshair(P, { xname: 'β =', xfmt: v => fmt(v, 2), yfmt: v => `${fmt(v, 2)} bits` });
  };

  window.HWA = hwa;
})();
