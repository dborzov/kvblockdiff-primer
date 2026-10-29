/* Part V (papers-b) — figures for the pages on KIVI, KVQuant, KVTC, Lexico, CacheGen and KVComp.
   Every builder is prefixed "pb". Toy data are fixed tables or seeded generators, so the numbers
   quoted in the prose are exactly what the figures show. Uses the plot kit (docs/figures.md). */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------------ shared helpers
  const LN2 = Math.log(2);
  const lg2 = v => Math.log(v) / LN2;
  // error function (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7) and the standard normal CDF
  function erf(x) {
    const s = x < 0 ? -1 : 1, a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
    return s * y;
  }
  const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
  const entBits = ps => ps.reduce((a, p) => (p > 0 ? a - p * lg2(p) : a), 0);
  const rms = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length));
  const pct = v => `${fmt(100 * v, 0)} %`;
  // a cell colour: diverging (vermilion for +, lapis for −) or one hue, mixed into the paper colour
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = n => [...String(n)].map(ch => SUP[ch] || ch).join('');
  const mixTo = (cv, share) => `color-mix(in srgb, ${cv} ${Math.round(100 * clamp(share, 0, 1))}%, var(--paper))`;

  /* ================================================================== KIVI
     pbKiviAxis — which numbers share one quantization ruler: a column (per channel) or a row
     (per token)? A fixed toy table of 12 tokens × 8 channels for keys and for values. */
  const KIVI_K = [
    [0.0, 1.4, 10.4, -0.5, -0.3, -8.4, 0.6, -0.1],
    [0.7, -1.8, 10.8, -0.1, 0.7, -8.8, -0.4, 0.5],
    [0.8, -0.2, 10.8, 0.7, -0.9, -8.2, 0.4, -0.7],
    [-1.9, -0.8, 10.9, -1.2, -1.5, -8.5, 0.9, -0.2],
    [-0.7, 0.4, 10.9, -0.3, 0.5, -8.2, -0.2, -0.8],
    [0.3, 0.2, 11.3, -1.3, -0.7, -8.7, -1.7, 0.1],
    [0.5, -0.7, 11.4, 0.8, 0.6, -8.9, 1.0, -1.3],
    [0.6, 0.6, 11.4, 0.3, -0.3, -9.3, -0.4, 0.0],
    [0.3, -0.9, 11.5, -0.1, 0.5, -8.6, 1.1, 0.6],
    [-0.2, 0.6, 11.4, 1.8, -1.6, -8.4, 0.5, -0.1],
    [-1.0, 1.3, 11.7, 0.6, 1.3, -9.3, -0.3, -1.3],
    [0.2, 1.5, 12.2, -1.8, -0.6, -9.3, 1.6, 0.4],
  ];
  const KIVI_V = [
    [0.6, -0.8, -0.3, -0.3, 0.2, 1.1, 0.0, 0.9],
    [-0.4, 0.3, -2.1, -1.4, 0.8, -0.6, 0.6, 0.5],
    [1.3, 0.8, 1.0, -0.1, -0.7, -0.7, -0.5, -1.1],
    [-2.2, -0.4, 1.0, -1.4, -7.7, -0.3, 0.9, 4.3],
    [0.6, -0.6, -0.7, 2.0, 0.8, 1.8, 2.1, -0.8],
    [0.4, 0.5, 0.6, 0.5, 0.2, 0.2, -1.5, -0.2],
    [-0.3, 0.0, -0.2, 0.2, 0.3, 0.1, 0.1, 0.0],
    [-0.4, -0.2, -0.5, 0.4, 0.0, 0.6, -1.3, 0.9],
    [-2.7, -2.6, -0.7, -2.0, 1.0, -2.0, -3.7, -3.0],
    [1.3, 0.0, -1.2, 0.0, -1.6, 1.8, -1.5, 0.5],
    [0.5, -1.5, 0.3, 1.0, 0.5, 0.3, 0.9, 0.2],
    [0.3, -0.1, 0.6, -0.9, 0.8, -0.5, -1.1, 0.4],
  ];
  // min–max ("asymmetric") rounding of every group to 2^bits marks; groups are columns or rows
  function kiviRound(X, axis, bits) {
    const T = X.length, C = X[0].length, L = 2 ** bits - 1;
    const out = X.map(r => r.slice()), steps = [];
    const groups = axis === 'channel'
      ? range(C).map(c => range(T).map(t => [t, c]))
      : range(T).map(t => range(C).map(c => [t, c]));
    groups.forEach(g => {
      const vals = g.map(([t, c]) => X[t][c]);
      const lo = Math.min(...vals), hi = Math.max(...vals), st = (hi - lo) / L || 1;
      steps.push(st);
      g.forEach(([t, c]) => { out[t][c] = lo + Math.round((X[t][c] - lo) / st) * st; });
    });
    return { out, steps };
  }

  FIG.pbKiviAxis = (host) => {
    const T = 12, C = 8;
    const DATA = { K: KIVI_K, V: KIVI_V };
    const LOUD = { K: (t, c) => c === 2 || c === 5, V: t => t === 3 || t === 8 };
    let which = 'K', axis = 'channel', bits = 2;
    const box = h('div'), ro = readout();
    host.append(
      controls(
        seg([['K', 'keys'], ['V', 'values']], which, v => { which = v; draw(); }, 'which toy table'),
        seg([['channel', 'one ruler per channel'], ['token', 'one ruler per token']], axis, v => { axis = v; draw(); }, 'which numbers share a ruler'),
        seg([[2, '2 bits'], [3, '3 bits'], [4, '4 bits']], bits, v => { bits = +v; draw(); }, 'bits per number'),
      ),
      box, ro,
    );
    // side by side on wide screens, stacked on phones (so the cells stay big enough to read)
    const narrow = box.getBoundingClientRect().width < 520;
    const cw = 30, ch = 22, head = 58, panelH = head + T * ch + 34;
    const origins = narrow ? [[46, 0], [46, panelH]] : [[64, 0], [366, 0]];
    const D = Diagram(box, { w: narrow ? 330 : 640, h: narrow ? 2 * panelH : panelH, label: 'A toy table of 12 tokens by 8 channels, before and after rounding, with the rounding error' });
    const g = el('g', {}, D.svg);

    function draw() {
      const X = DATA[which], loud = LOUD[which];
      const { out, steps } = kiviRound(X, axis, bits);
      g.replaceChildren();
      const titles = [which === 'K' ? 'keys: the numbers' : 'values: the numbers', 'rounding error'];
      origins.forEach(([x0, y0], p) => {
        const top = y0 + head;
        el('text', { x: x0, y: y0 + 18, class: 'lbl', text: titles[p] }, g);
        el('text', { x: x0 + C * cw + 4, y: top - 6, class: 'lbl', 'text-anchor': 'start', text: 'c' }, g);
        range(C).forEach(c => el('text', { x: x0 + c * cw + cw / 2, y: top - 6, 'text-anchor': 'middle', class: 'val', text: String(c) }, g));
        range(T).forEach(t => el('text', { x: x0 - 6, y: top + t * ch + ch * 0.7, 'text-anchor': 'end', class: 'val', text: `t${t}` }, g));
        range(T).forEach(t => range(C).forEach(c => {
          const x = X[t][c], e = out[t][c] - x;
          const fill = p === 0
            ? mixTo(x >= 0 ? 'var(--vermilion)' : 'var(--lapis)', 0.08 + 0.8 * Math.pow(Math.min(1, Math.abs(x) / 12), 0.55))
            : mixTo('var(--amethyst)', 0.04 + 0.9 * Math.pow(Math.min(1, Math.abs(e) / 3), 0.6));
          const r = el('rect', { x: x0 + c * cw + 1, y: top + t * ch + 1, width: cw - 2, height: ch - 2, rx: 3, class: 'pb-cell' + (loud(t, c) ? ' pb-loud' : ''), style: `fill:${fill}` }, g);
          hover(r, () => `<b>token t${t}, channel c${c}</b><br>number ${fmt(x, 1)}<br>after rounding ${fmt(out[t][c], 2)}<br>error ${fmtS(e, 2)}`);
        }));
      });
      // outline the groups that share one ruler, on the first panel
      const [x0, y0] = origins[0], top = y0 + head;
      if (axis === 'channel') range(C).forEach(c => el('rect', { x: x0 + c * cw, y: top, width: cw, height: T * ch, rx: 5, class: 'pb-group' }, g));
      else range(T).forEach(t => el('rect', { x: x0, y: top + t * ch, width: C * cw, height: ch, rx: 5, class: 'pb-group' }, g));
      // name the loud part
      if (which === 'K') [2, 5].forEach(c => el('text', { x: x0 + c * cw + cw / 2, y: top - 24, 'text-anchor': 'middle', class: 'annot', text: 'big' }, g));
      else [3, 8].forEach(t => el('text', { x: x0 + C * cw + 4, y: top + t * ch + ch * 0.7, class: 'annot', text: 'loud' }, g));
      el('text', { x: x0, y: top + T * ch + 22, class: 'annot', text: axis === 'channel' ? 'outlines: each column shares one ruler' : 'outlines: each row shares one ruler' }, g);

      const q = [], ql = [], eq = [], el2 = [];
      range(T).forEach(t => range(C).forEach(c => {
        const x = X[t][c], e = out[t][c] - x;
        if (loud(t, c)) { ql.push(x); el2.push(e); } else { q.push(x); eq.push(e); }
      }));
      const relQ = rms(eq) / rms(q), relL = rms(el2) / rms(ql);
      ro.set([
        [which === 'K' ? 'small channels' : 'quiet tokens', `typical error ${pct(relQ)} of their size`],
        [which === 'K' ? 'big channels' : 'loud tokens', `typical error ${pct(relL)} of their size`],
        ['ruler steps', `${fmt(Math.min(...steps), 2)} to ${fmt(Math.max(...steps), 2)}`],
      ]);
    }
    draw();
  };

  /* ================================================================== KVQuant
     pbKvqRope — one pair of key channels before and after RoPE, over a window of 64 tokens. */
  FIG.pbKvqRope = (host) => {
    const N = 64, DH = 128, r = rng('pb-kvq-rope');
    const na = range(N).map(() => r.normal()), nb = range(N).map(() => r.normal());
    const preA = na.map(z => 9 + 0.3 * z), preB = nb.map(z => 0.6 + 0.3 * z);
    let pair = 4, start = 1000;
    const box = h('div'), ro = readout();
    const sl = slider('channel pair', 0, 63, 1, pair, v => { pair = v; draw(); }, v => `${v} of 0–63`);
    host.append(
      controls(sl, seg([[0, '0'], [1000, '1K'], [10000, '10K'], [100000, '100K']], start, v => { start = +v; draw(); }, 'where the window starts')),
      legend([['first channel of the pair, before RoPE', series(0)], ['the same channel after RoPE', series(1)], ['its partner channel after RoPE', series(1), 'dash'], ['range one ruler must cover', series(1), 'band']]),
      box, ro,
    );
    const P = Plot(box, { x: [0, N - 1], y: [-11, 11], h: 300, xlabel: 'tokens into the window', ylabel: 'key value', label: 'One pair of key channels before and after RoPE' });
    const sd = a => Math.sqrt(variance(a));
    function draw() {
      const om = Math.pow(10000, -2 * pair / DH);
      const postA = range(N).map(t => { const p = (start + t) * om; return preA[t] * Math.cos(p) - preB[t] * Math.sin(p); });
      const postB = range(N).map(t => { const p = (start + t) * om; return preA[t] * Math.sin(p) + preB[t] * Math.cos(p); });
      P.clear();
      const [lo1, hi1] = extent(postA), [lo0, hi0] = extent(preA);
      area(P, [[0, lo1, hi1], [N - 1, lo1, hi1]], { color: series(1), opacity: 0.12 });
      area(P, [[0, lo0, hi0], [N - 1, lo0, hi0]], { color: series(0), opacity: 0.18 });
      line(P, postB.map((v, t) => [t, v]), { color: series(1), dash: '5 4', width: 1.6 });
      line(P, postA.map((v, t) => [t, v]), { color: series(1) });
      line(P, preA.map((v, t) => [t, v]), { color: series(0) });
      const s0 = sd(preA), s1 = sd(postA);
      ro.set([
        ['turn per token', `${fmt(om, om < 0.01 ? 5 : 3)} rad (a full turn every ${fmtSI(2 * Math.PI / om, 1)} tokens)`],
        ['spread before', `${fmt(s0, 2)}`],
        ['spread after', `${fmt(s1, 2)}`],
        ['3-bit ruler step', `${fmt((hi0 - lo0) / 7, 2)} → ${fmt((hi1 - lo1) / 7, 2)}`],
        ['≈ extra bits for an exact copy', `${fmt(Math.max(0, lg2(s1 / s0)), 1)}`],
      ]);
    }
    draw();
  };

  /* pbKvqEscape — pull the few largest numbers of one vector out as escapes; the ruler narrows. */
  FIG.pbKvqEscape = (host) => {
    const N = 128, r = rng('pb-kvq-escape');
    const xs = range(N).map(() => { const u = r() - 0.5; return -Math.sign(u) * Math.log(1 - 2 * Math.abs(u)); });
    xs[17] = 13.4; xs[90] = -10.6; xs[51] = 7.9;
    const jit = range(N).map(() => 0.15 + 0.7 * r());
    let share = 0.01;
    const box = h('div'), ro = readout();
    host.append(
      controls(seg([[0, 'no escapes'], [0.01, '1 %'], [0.02, '2 %'], [0.05, '5 %']], share, v => { share = +v; draw(); }, 'share of numbers escaped')),
      legend([['kept: rounded to the ruler', series(0), 'dot'], ['escaped: stored in full, with position', series(1), 'dot'], ['the 8 marks of a 3-bit ruler', 'var(--ink-3)']]),
      box, ro,
    );
    const P = Plot(box, { x: [-12, 15], y: [0, 1], h: 200, yticks: [], grid: 'x', xlabel: 'value of each of the 128 numbers in one vector', label: 'Numbers of one vector with a 3-bit ruler, with and without escapes' });
    function draw() {
      const n = Math.round(N * share);
      const order = range(N).sort((a, b) => Math.abs(xs[b]) - Math.abs(xs[a]));
      const esc = new Set(order.slice(0, n));
      const kept = xs.filter((_, i) => !esc.has(i));
      const lo = Math.min(...kept), hi = Math.max(...kept), st = (hi - lo) / 7;
      P.clear();
      range(8).forEach(k => el('line', { x1: P.x(lo + k * st), x2: P.x(lo + k * st), y1: P.y(0), y2: P.y(1), class: 'pb-mark' }, P.g.data));
      const errs = [];
      xs.forEach((x, i) => {
        const isE = esc.has(i);
        if (!isE) errs.push(lo + Math.round((x - lo) / st) * st - x);
        const c = dot(P.g.data, P.x(x), P.y(jit[i]), (isE ? 5.5 : 3.6) * P.fs, isE ? series(1) : series(0));
        hover(c, () => `<b>${fmt(x, 2)}</b><br>${isE ? 'escaped: stored exactly, plus its position' : `rounded to ${fmt(lo + Math.round((x - lo) / st) * st, 2)}`}`);
      });
      ro.set([
        ['escaped', `${n} of ${N}`],
        ['ruler step', fmt(st, 2)],
        ['typical error of kept numbers', fmt(rms(errs), 2)],
        ['escape cost', `${fmt(n * (16 + 7) / N, 2)} bits per number`],
      ]);
    }
    draw();
  };

  /* ================================================================== KVTC
     pbKvtcSpectrum — one spectrum, two stories: lossy bit allocation (reverse water-filling)
     versus the lossless shadow (the KLT gain, ½ log2 AM/GM, with the stored grid's noise floor). */
  FIG.pbKvtcSpectrum = (host) => {
    const d = 64;
    let alpha = 1.5, logD = Math.log10(0.05), nu = 0;
    const spec = a => { const l = range(d).map(i => Math.pow(i + 1, -a)); const m = mean(l); return l.map(v => v / m); };
    function waterLevel(l, Dm) {
      let lo = 1e-12, hi = Math.max(...l);
      for (let k = 0; k < 120; k++) { const th = Math.sqrt(lo * hi); if (mean(l.map(v => Math.min(th, v))) > Dm) hi = th; else lo = th; }
      return Math.sqrt(lo * hi);
    }
    const kltGain = (l, n) => { const m = l.map(v => v + n); return 0.5 * lg2(mean(m) / Math.exp(mean(m.map(Math.log)))); };
    const box = h('div');
    const tiles = {
      lossy: kpi('lossy, KVTC-style', '', '', series(0)),
      shadow: kpi('lossless shadow', '', '', series(2)),
    };
    host.append(
      controls(
        slider('steepness', 0.3, 2.5, 0.1, alpha, v => { alpha = v; draw(); }, v => fmt(v, 1)),
        slider('allowed error', -2.5, -0.5, 0.05, logD, v => { logD = v; draw(); }, v => `${fmt(100 * Math.pow(10, v), Math.pow(10, v) < 0.01 ? 2 : 1)} %`),
        seg([[0, 'no grid noise'], [1 / 12 / 1024, 'INT8 grid'], [7e-4, 'E4M3 grid'], [0.01, 'coarse (1 %)']], nu, v => { nu = +v; draw(); }, 'rounding noise of the stored grid'),
      ),
      legend([['gets bits (above the water)', series(0), 'box'], ['dropped: zero bits', 'color-mix(in srgb, var(--ink-3) 35%, transparent)', 'box'], ['water level', 'var(--c)'], ['noise floor of the stored grid', series(2), 'dash']]),
      box, h('div', { class: 'kpis' }, tiles.lossy, tiles.shadow),
    );
    const P = Plot(box, { x: [0.3, d + 0.7], y: [1e-4, 100], ylog: true, h: 320, xlabel: 'component (KLT axis), largest spread first', ylabel: 'variance', label: 'Variances of the 64 KLT components, with the water level of a lossy coder', yfmt: v => (v >= 1 ? String(v) : '10' + sup(Math.round(Math.log10(v)))) });
    function draw() {
      const l = spec(alpha), Dm = Math.pow(10, logD), th = waterLevel(l, Dm);
      const R = mean(l.map(v => Math.max(0, 0.5 * lg2(v / th))));
      const kept = l.filter(v => v > th).length;
      const G = kltGain(l, nu);
      P.clear();
      const bw = (P.x(2) - P.x(1)) * 0.78;
      l.forEach((v, i) => {
        const X = P.x(i + 1) - bw / 2, Y0 = P.y(1e-4), Yv = P.y(v), Yt = P.y(Math.min(v, th));
        el('rect', { x: X, y: Yt, width: bw, height: Y0 - Yt, class: 'pb-under' }, P.g.data);
        if (v > th) {
          const b = el('rect', { x: X, y: Yv, width: bw, height: Yt - Yv, style: `fill:${series(0)}` }, P.g.data);
          hover(b, () => `<b>component ${i + 1}</b><br>variance ${fmt(v, 3)}<br>bits: ${fmt(0.5 * lg2(v / th), 2)}`);
        }
      });
      if (nu > 0) rule(P, { y: nu, label: 'noise floor', color: series(2) });
      rule(P, { y: th, label: 'water level', color: 'var(--c)', dash: false });
      tiles.lossy.set(`${fmt(16 / R, 0)}×`, `${kept} of ${d} components kept · ${fmt(R, 2)} bits per number vs 16`);
      tiles.shadow.set(`${fmt(G, 2)} bits`, `saved per number by the rotation, ½ log₂ AM/GM`);
    }
    draw();
  };

  /* ================================================================== Lexico
     pbLexicoSparse — a vector written as a few atoms of a fixed dictionary (orthogonal matching
     pursuit), and what that would be worth losslessly: variance explained versus index + coefficient tax. */
  function solve(A, b) {           // small dense linear system, Gaussian elimination with pivoting
    const n = b.length, M = A.map((row, i) => [...row, b[i]]);
    for (let i = 0; i < n; i++) {
      let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
      [M[i], M[p]] = [M[p], M[i]];
      for (let k = i + 1; k < n; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; }
    }
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
    return x;
  }
  FIG.pbLexicoSparse = (host) => {
    const d = 32, A = 128, SMAX = 10, COEF_BITS = 8, r = rng('pb-lexico');
    const atoms = range(A).map(() => { const v = range(d).map(() => r.normal()); const n = Math.hypot(...v); return v.map(x => x / n); });
    const TRUE = [[5, 2.5], [40, -1.8], [97, 1.2]];
    const z = range(d).map(() => r.normal());
    const dotp = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    function run(sn) {
      const x = range(d).map(i => TRUE.reduce((s, [k, c]) => s + c * atoms[k][i], 0) + sn * z[i]);
      const E = dotp(x, x), steps = [{ sel: [], approx: Array(d).fill(0), R2: 0 }];
      let res = x.slice(); const sel = [];
      for (let s = 1; s <= SMAX; s++) {
        let best = -1, bv = -1;
        atoms.forEach((a, k) => { if (sel.includes(k)) return; const v = Math.abs(dotp(a, res)); if (v > bv) { bv = v; best = k; } });
        sel.push(best);
        const G = sel.map(i => sel.map(j => dotp(atoms[i], atoms[j]))), rhs = sel.map(i => dotp(atoms[i], x));
        const c = solve(G, rhs);
        const approx = range(d).map(i => sel.reduce((s, k, m) => s + c[m] * atoms[k][i], 0));
        res = x.map((v, i) => v - approx[i]);
        steps.push({ sel: sel.slice(), approx, R2: 1 - dotp(res, res) / E });
      }
      steps.forEach((st, s) => {
        st.saved = 0.5 * lg2(1 / Math.max(1e-12, 1 - st.R2));
        st.tax = s * (lg2(A) + COEF_BITS) / d;
        st.net = st.saved - st.tax;
      });
      return { x, steps };
    }
    let sn = 0.12, s = 3, cur = run(sn);
    const box1 = h('div'), box2 = h('div'), ro = readout();
    const sl = slider('atoms used', 0, SMAX, 1, s, v => { s = v; draw(); }, v => String(v));
    host.append(
      controls(sl, seg([[0.05, 'little noise'], [0.12, 'some noise'], [0.25, 'much noise']], sn, v => { sn = +v; cur = run(sn); draw(); }, 'noise no atom can explain')),
      legend([['the vector (32 numbers)', series(0), 'box'], ['its approximation from the atoms', series(1), 'dot']]),
      box1,
      legend([['bits saved per number by predicting', series(2)], ['tax per number: atom indices + coefficients', series(3), 'dash'], ['net for an exact copy', series(0)]]),
      box2, ro,
    );
    const P1 = Plot(box1, { x: [-0.7, d - 0.3], y: [-2.2, 2.2], h: 210, xlabel: 'element of the vector', ylabel: 'value', grid: 'y', label: 'A 32-number vector and its sparse approximation' });
    const P2 = Plot(box2, { x: [0, SMAX], y: [-2, 4.5], h: 240, xlabel: 'atoms used', ylabel: 'bits per number', label: 'Bits saved, tax and net gain against the number of atoms' });
    function draw() {
      const st = cur.steps[s];
      P1.clear();
      const bw = (P1.x(1) - P1.x(0)) * 0.7;
      cur.x.forEach((v, i) => el('rect', { x: P1.x(i) - bw / 2, y: P1.y(Math.max(0, v)), width: bw, height: Math.abs(P1.y(v) - P1.y(0)), style: `fill:color-mix(in srgb, ${series(0)} 55%, transparent)` }, P1.g.data));
      st.approx.forEach((v, i) => dot(P1.g.data, P1.x(i), P1.y(v), 3.4 * P1.fs, series(1)));
      P2.clear();
      rule(P2, { y: 0, dash: false });
      rule(P2, { x: s, label: `${s} atoms` });
      line(P2, cur.steps.map((q, k) => [k, q.saved]), { color: series(2), markers: 3 });
      line(P2, cur.steps.map((q, k) => [k, q.tax]), { color: series(3), dash: true });
      line(P2, cur.steps.map((q, k) => [k, q.net]), { color: series(0), width: 3, markers: 3.5 });
      ro.set([
        ['atoms chosen', st.sel.length ? st.sel.map(k => `#${k}`).join(' ') : '—'],
        ['variance explained', pct(st.R2)],
        ['saved', `${fmt(st.saved, 2)} bits per number`],
        ['tax', `${fmt(st.tax, 2)} bits per number`],
        ['net', `${fmtS(st.net, 2)} bits per number`],
      ]);
    }
    draw();
  };

  /* ================================================================== CacheGen
     pbCachegenDelta — one channel over 60 tokens: a slow drift plus noise. How much smaller is a
     difference to the previous token, or to the group's anchor, than the distance to the channel's
     own typical value? Variances are exact (stationary AR(1) drift), the series is one seeded sample. */
  FIG.pbCachegenDelta = (host) => {
    const N = 60, G = 10, MU = 2.0, r = rng('pb-cachegen');
    const zi = range(N + 400).map(() => r.normal()), zn = range(N).map(() => r.normal());
    let f = 0.85, tau = 100;
    function series1() {
      const ph = Math.exp(-1 / tau), sdI = Math.sqrt(1 - ph * ph);
      let m = 0; const ms = [];
      for (let k = 0; k < N + 400; k++) { m = ph * m + sdI * zi[k]; if (k >= 400) ms.push(m); }
      return ms.map((v, t) => MU + Math.sqrt(f) * v + Math.sqrt(1 - f) * zn[t]);
    }
    function vars() {
      const ph = Math.exp(-1 / tau);
      const adj = 2 * f * (1 - ph) + 2 * (1 - f);
      const avgPow = mean(range(G - 1).map(k => Math.pow(ph, k + 1)));
      const anc = 2 * f * (1 - avgPow) + 2 * (1 - f);
      return { loc: 1, adj, anc };
    }
    const box1 = h('div'), box2 = h('div'), ro = readout();
    host.append(
      controls(
        slider('drift share', 0, 0.98, 0.01, f, v => { f = v; draw(); }, v => pct(v)),
        seg([[10, '10 tokens'], [100, '100 tokens'], [1000, '1000 tokens']], tau, v => { tau = +v; draw(); }, 'how slowly the drift moves'),
      ),
      legend([['one channel, token by token', series(0)], ['group anchors (every 10th token)', series(1), 'dot'], ["the channel's typical value", 'var(--ink-3)', 'dash']]),
      box1, box2, ro,
    );
    const P1 = Plot(box1, { x: [0, N - 1], y: [-2, 6], h: 220, xlabel: 'token', ylabel: 'value', label: 'One channel of a toy KV cache over 60 tokens' });
    const cats = ['vs typical value', 'vs previous token', 'vs group anchor'];
    const P2 = Plot(box2, { ycats: cats, x: [0, 2.2], h: 170, xlabel: "variance, as a share of the channel's own variance", grid: 'x', label: 'Variance of three kinds of residual' });
    function draw() {
      const xs = series1(), v = vars();
      P1.clear();
      range(1, N / G).forEach(k => el('line', { x1: P1.x(k * G - 0.5), x2: P1.x(k * G - 0.5), y1: P1.m.t, y2: P1.H - P1.m.b, class: 'pb-sep' }, P1.g.data));
      rule(P1, { y: MU, label: 'typical value' });
      line(P1, xs.map((x, t) => [t, x]), { color: series(0), markers: 2.2 });
      range(N / G).forEach(k => dot(P1.g.data, P1.x(k * G), P1.y(xs[k * G]), 5 * P1.fs, series(1)));
      P2.clear();
      bars(P2, [v.loc, v.adj, v.anc], { horizontal: true, colors: i => series(i === 2 ? 1 : i === 1 ? 2 : 0), labels: x => fmt(x, 2), tip: (x, i) => `<b>${cats[i]}</b><br>variance ${fmt(x, 3)}<br>${fmtS(0.5 * lg2(1 / x), 2)} bits per number vs the typical value` });
      rule(P2, { x: 1, dash: true });
      ro.set([
        ['anchor residual', `${fmt(v.anc, 2)} of the variance`],
        ['raw ÷ anchor residual', `${fmt(1 / v.anc, 2)}×`],
        ['bits saved by the anchor', `${fmtS(0.5 * lg2(1 / v.anc), 2)} per number`],
        ['… by the previous token', `${fmtS(0.5 * lg2(1 / v.adj), 2)} per number`],
      ]);
    }
    draw();
  };

  /* ================================================================== KVComp
     pbKvcompGrid — how much a predictor of a given R² saves, as the storage grid gets coarser.
     Exact entropies of discretised Gaussians: the value x = s + n has spread σ (in grid steps),
     the predictor knows s (a share R² of the variance); the residual is round(x) − round(s). */
  function h0(sq) {
    const K = Math.ceil(7 * sq) + 2, ps = [];
    for (let k = -K; k <= K; k++) ps.push(Phi((k + 0.5) / sq) - Phi((k - 0.5) / sq));
    return entBits(ps);
  }
  function hres(sq, R2) {
    const ss = Math.sqrt(R2) * sq, sn = Math.sqrt(1 - R2) * sq, NB = 32;
    let us, w;
    if (ss < 1e-6) { us = [0]; w = [1]; } else {
      us = range(NB).map(b => -0.5 + (b + 0.5) / NB);
      const M = Math.ceil(7 * ss) + 2;
      w = us.map(u => { let t = 0; for (let m = -M; m <= M; m++) t += Math.exp(-0.5 * ((u + m) / ss) ** 2); return t; });
      const W = sum(w); w = w.map(x => x / W);
    }
    const K = Math.ceil(7 * sn) + 3, P = Array(2 * K + 1).fill(0);
    us.forEach((u, b) => { for (let k = -K; k <= K; k++) P[k + K] += w[b] * (Phi((k + 0.5 - u) / sn) - Phi((k - 0.5 - u) / sn)); });
    return entBits(P);
  }
  FIG.pbKvcompGrid = (host) => {
    let R2 = 0.75;
    const xs = range(41).map(i => Math.pow(2, -2 + 8 * i / 40));
    const H0 = xs.map(h0);
    const box1 = h('div'), box2 = h('div'), ro = readout();
    host.append(
      controls(slider(texify('explained, $\\vRsq$'), 0.1, 0.95, 0.05, R2, v => { R2 = v; draw(); }, v => pct(v))),
      legend([['no predictor (order-0)', series(0)], ['with the predictor', series(1)], ['bits saved', series(2)]]),
      box1, box2, ro,
    );
    const common = { x: [0.25, 64], xlog: 2, xfmt: v => (v < 1 ? `1/${1 / v}` : String(v)), xlabel: 'spread of the channel σ, in grid steps' };
    const P1 = Plot(box1, Object.assign({ y: [0, 8.5], h: 260, ylabel: 'bits per number', label: 'Bits per number with and without a predictor, against grid fineness' }, common));
    const P2 = Plot(box2, Object.assign({ y: [0, 60], h: 200, ylabel: 'share saved', yfmt: v => `${v} %`, label: 'Share of the bits a predictor saves, against grid fineness' }, common));
    function band(P) {
      area(P, [[2 / 3, P.y0, P.y1], [8 / 3, P.y0, P.y1]], { color: 'var(--ink-3)', opacity: 0.1 });
      rule(P, { x: 32, label: '8-bit grid, σ = 32 steps' });
    }
    function draw() {
      const HR = xs.map(x => hres(x, R2)), gain = H0.map((v, i) => v - HR[i]);
      [P1, P2].forEach(P => P.clear());
      band(P1); band(P2);
      svgText(P1.g.top, P1.x(1.33), P1.y(7.7), 'coarse lossy grids', { class: 'annot', 'text-anchor': 'middle' });
      line(P1, xs.map((x, i) => [x, H0[i]]), { color: series(0), name: 'order-0' });
      line(P1, xs.map((x, i) => [x, HR[i]]), { color: series(1), name: 'with predictor' });
      line(P1, xs.map((x, i) => [x, gain[i]]), { color: series(2), name: 'saved' });
      rule(P1, { y: 0.5 * lg2(1 / (1 - R2)), label: 'exchange-rate limit', color: series(2) });
      line(P2, xs.map((x, i) => [x, 100 * gain[i] / H0[i]]), { color: series(2) });
      const at = s => { const i = xs.findIndex(x => Math.abs(x - s) < 1e-9); return [H0[i], HR[i], gain[i]]; };
      const [a0, a1, ag] = at(1), [b0, b1, bg] = at(32);
      ro.set([
        ['σ = 1 step', `${fmt(a0, 2)} → ${fmt(a1, 2)} bits (saves ${fmt(ag, 2)}, ${pct(ag / a0)})`],
        ['σ = 32 steps', `${fmt(b0, 2)} → ${fmt(b1, 2)} bits (saves ${fmt(bg, 2)}, ${pct(bg / b0)})`],
        ['limit, ½ log₂ 1/(1−R²)', `${fmt(0.5 * lg2(1 / (1 - R2)), 2)} bits`],
      ]);
    }
    draw();
  };
})();
