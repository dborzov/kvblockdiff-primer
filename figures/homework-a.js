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

  window.HWA = hwa;
})();
