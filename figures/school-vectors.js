/* =====================================================================
   figures/school-vectors.js — Part II, pages II.13–II.25 (vectors, number
   formats, machines). See docs/figures.md for the toolkit.

   All toy data comes from seeded generators below, so every number quoted
   in the prose is reproducible: `node analysis/school-vectors-numbers.mjs`
   loads this file and prints them. Builders are all prefixed `sv` (this file
   shares Part II pages with figures/school-info.js); the shared data and
   numerics live on FIG._sv (no new globals).
   ===================================================================== */
window.FIG = window.FIG || {};

(function () {
  'use strict';
  const SV = (FIG._sv = FIG._sv || {});
  const PKr = () => window.PK;               // plotkit, resolved at call time

  /* ==================================================================
     1. Toy data
     ================================================================== */

  // --- 1a. The day's readings: the same generator (and seed) as Part I's
  //         Gull Rock messages (figures/tiny.js), plus the mast thermometer.
  function tinyRng(seed) {
    let s = seed | 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function tinyGauss(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  const r1 = (v, d) => +v.toFixed(d);

  SV.CHANNELS = [
    { key: 'low', name: 'temperature, foot of mast', short: 'temp (foot)', unit: '°C', step: 0.1, dec: 1 },
    { key: 'mast', name: 'temperature, top of mast', short: 'temp (top)', unit: '°C', step: 0.1, dec: 1 },
    { key: 'hum', name: 'humidity', short: 'humidity', unit: '', step: 0.01, dec: 2 },
    { key: 'pres', name: 'air pressure', short: 'pressure', unit: 'hPa', step: 0.1, dec: 1 },
    { key: 'wind', name: 'wind speed', short: 'wind', unit: 'kn', step: 1, dec: 0 },
  ];

  SV.day = function (n = 12) {
    const r = tinyRng(7), N = () => tinyGauss(r);
    let T = 11.4, Hm = 0.82, P = 1012.6, W = 14;
    const rm = tinyRng(1313);
    const out = [];
    for (let i = 0; i < n; i++) {
      const mins = 14 * 60 + 30 + 30 * i;
      const hh = Math.floor(mins / 60) % 24, mm = mins % 60;
      const low = r1(T, 1);
      out.push({
        time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
        low, mast: r1(low - 0.5 + 0.12 * tinyGauss(rm), 1),
        hum: r1(Hm, 2), pres: r1(P, 1), wind: W,
      });
      T += -0.05 + 0.18 * N();
      Hm = Math.min(0.99, Math.max(0.6, Hm + 0.006 + 0.012 * N()));
      P += -0.35 + 0.15 * N();
      W = Math.max(3, Math.round(W + 0.3 + 1.1 * N()));
      if (r() < 0.12) { /* wind direction draw in Part I's generator: keep the stream aligned */ }
    }
    return out;
  };

  // --- 1b. Ten days of readings (480 vectors, d = 5), for correlation and rotation.
  let monthCache = null;
  SV.month = function () {
    if (monthCache) return monthCache;
    const r = PKr().rng('sv-month');
    const out = [];
    let anom = 0, pres = 1012;
    for (let i = 0; i < 480; i++) {
      const hour = (i * 0.5) % 24;
      anom = 0.985 * anom + 0.36 * r.normal();                 // slow weather anomaly, σ ≈ 2 °C
      pres = 1012 + 0.99 * (pres - 1012) + 1.1 * r.normal();   // slow pressure swings, σ ≈ 8 hPa
      const air = 11 + 1.2 * Math.sin(2 * Math.PI * (hour - 9) / 24) + anom;
      const low = r1(air + r.normal(0, 0.15), 1);
      const mast = r1(air - 0.6 + r.normal(0, 0.15), 1);
      const hum = r1(Math.min(1, Math.max(0.4, 0.82 - 0.02 * (air - 11) + r.normal(0, 0.03))), 2);
      const p = r1(pres, 1);
      const wind = Math.max(0, Math.round(14 - 0.6 * (pres - 1012) + r.normal(0, 4)));
      out.push({ low, mast, hum, pres: p, wind });
    }
    return (monthCache = out);
  };
  SV.matrixOf = rows => rows.map(o => SV.CHANNELS.map(c => o[c.key]));

  // The II.13 table in one of four views. Each channel is written as whole numbers of its
  // sensor step (0.1 °C, 0.01, 0.1 hPa, 1 kn). 'raw': as measured. 'centred': minus the
  // channel's mean (rounded to the step, so the result is still an exact whole number).
  // 'global': minus one mean of all numbers. 'std': (value − mean) / spread, no grid.
  // Returns {rows: [[…d values]], shift: [per channel], width: [bits per value], …}.
  SV.dayView = function (mode, n = 12) {
    const day = SV.day(n), C = SV.CHANNELS;
    const cols = C.map(c => day.map(o => o[c.key]));
    const mu = cols.map(mean);
    const sd = cols.map((v, j) => Math.sqrt(mean(v.map(x => (x - mu[j]) ** 2))));
    const gmu = mean(cols.flat());
    const shift = C.map((c, j) => mode === 'centred' || mode === 'std' ? mu[j] : mode === 'global' ? gmu : 0);
    const shiftQ = C.map((c, j) => r1(Math.round(shift[j] / c.step) * c.step, c.dec + (mode === 'global' ? 0 : 0)));
    const rows = day.map(o => C.map((c, j) => {
      if (mode === 'std') return (o[c.key] - mu[j]) / sd[j];
      return r1(o[c.key] - shiftQ[j], c.dec);
    }));
    const steps = rows.map(r => r.map((v, j) => Math.round(v / C[j].step)));
    const width = mode === 'std' ? C.map(() => NaN) : C.map((c, j) => 1 + Math.ceil(Math.log2(Math.max(...steps.map(r => Math.abs(r[j]))) + 1)));
    return { day, rows, steps, mu, sd, gmu, shift: shiftQ, width, total: width.reduce((s, v) => s + v, 0) };
  };

  // --- 1c. Weather regimes in the (wind, humidity) plane: three clusters.
  SV.REGIMES = [
    { name: 'calm', n: 140, wind: 8, hum: 70, sw: 2.2, sh: 3.0 },
    { name: 'fog', n: 60, wind: 4, hum: 97, sw: 1.5, sh: 1.2 },
    { name: 'storm', n: 100, wind: 34, hum: 90, sw: 3.5, sh: 2.5 },
  ];
  let regimeCache = null;
  SV.regimes = function () {
    if (regimeCache) return regimeCache;
    const r = PKr().rng('sv-regimes');
    const pts = [];
    SV.REGIMES.forEach((g, k) => {
      for (let i = 0; i < g.n; i++) pts.push({ x: Math.max(0, Math.round(r.normal(g.wind, g.sw))), y: Math.min(100, Math.round(r.normal(g.hum, g.sh))), k });
    });
    return (regimeCache = r.shuffle(pts));
  };
  // The two thermometers of the month, as a 2-D cloud (°C), for the VQ-vs-KLT comparison.
  SV.thermoPairs = () => SV.month().map(o => ({ x: o.low, y: o.mast }));

  /* ==================================================================
     2. Numerics
     ================================================================== */
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  SV.mean = mean;
  SV.colMeans = X => X[0].map((_, j) => mean(X.map(r => r[j])));
  SV.covMatrix = function (X) {
    const mu = SV.colMeans(X), d = mu.length, n = X.length;
    const S = Array.from({ length: d }, () => new Array(d).fill(0));
    for (const row of X) for (let a = 0; a < d; a++) for (let b = a; b < d; b++) S[a][b] += (row[a] - mu[a]) * (row[b] - mu[b]);
    for (let a = 0; a < d; a++) for (let b = a; b < d; b++) { S[a][b] /= n; S[b][a] = S[a][b]; }
    return S;
  };
  SV.corrMatrix = function (S) {
    return S.map((row, a) => row.map((v, b) => v / Math.sqrt(S[a][a] * S[b][b])));
  };
  // Jacobi eigen-decomposition of a symmetric matrix: {values (descending), vectors (columns)}.
  SV.eig = function (A0) {
    const n = A0.length, A = A0.map(r => r.slice());
    const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
      if (off < 1e-22) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-300) continue;
        const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k][p], akq = A[k][q];
          A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k], aqk = A[q][k];
          A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p], vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
        }
      }
    }
    const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => A[b][b] - A[a][a]);
    return { values: idx.map(i => A[i][i]), vectors: idx.map(i => V.map(r => r[i])) };
  };
  // Bits of a finely quantized Gaussian with variance v on a grid of step `step` (the II.11 rule).
  SV.gaussBits = (v, step) => 0.5 * Math.log2(2 * Math.PI * Math.E * v / (step * step));
  SV.amgm = vals => {
    const am = mean(vals), gm = Math.exp(mean(vals.map(Math.log)));
    return { am, gm, gain: 0.5 * Math.log2(am / gm) };
  };
  // Variances of a 2-D cloud along axes rotated by angle th (radians).
  SV.rotVars = function (S, th) {
    const c = Math.cos(th), s = Math.sin(th);
    const v1 = c * c * S[0][0] + 2 * c * s * S[0][1] + s * s * S[1][1];
    const v2 = s * s * S[0][0] - 2 * c * s * S[0][1] + c * c * S[1][1];
    const cov = (c * c - s * s) * S[0][1] + c * s * (S[1][1] - S[0][0]);
    return [v1, v2, cov];
  };

  // k-means on 2-D points [[x, y], …], deterministic (seeded k-means++, best of `tries`).
  SV.kmeans = function (pts, C, seed = 1, tries = 4, maxIter = 60) {
    let best = null;
    for (let t = 0; t < tries; t++) {
      const r = PKr().rng(`sv-km-${seed}-${C}-${t}`);
      const cents = [pts[r.int(pts.length)].slice()];
      while (cents.length < C) {
        const d2 = pts.map(p => Math.min(...cents.map(c => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2)));
        let u = r() * d2.reduce((s, v) => s + v, 0), i = 0;
        while (i < pts.length - 1 && (u -= d2[i]) > 0) i++;
        cents.push(pts[i].slice());
      }
      const res = SV.lloyd(pts, cents, maxIter);
      if (!best || res.sse < best.sse) best = res;
    }
    return best;
  };
  SV.assign = (pts, cents) => pts.map(p => {
    let bi = 0, bd = Infinity;
    cents.forEach((c, i) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2; if (d < bd) { bd = d; bi = i; } });
    return bi;
  });
  SV.lloyd = function (pts, cents0, maxIter = 60, record = false) {
    let cents = cents0.map(c => c.slice());
    const hist = [];
    let lab = SV.assign(pts, cents);
    for (let it = 0; it < maxIter; it++) {
      if (record) hist.push({ cents: cents.map(c => c.slice()), lab: lab.slice() });
      const sums = cents.map(() => [0, 0, 0]);
      pts.forEach((p, i) => { sums[lab[i]][0] += p[0]; sums[lab[i]][1] += p[1]; sums[lab[i]][2]++; });
      const next = cents.map((c, k) => (sums[k][2] ? [sums[k][0] / sums[k][2], sums[k][1] / sums[k][2]] : c));
      const lab2 = SV.assign(pts, next);
      const moved = next.some((c, k) => Math.abs(c[0] - cents[k][0]) + Math.abs(c[1] - cents[k][1]) > 1e-12);
      cents = next; lab = lab2;
      if (!moved) break;
    }
    if (record) hist.push({ cents: cents.map(c => c.slice()), lab: lab.slice() });
    let sse = 0;
    pts.forEach((p, i) => { sse += (p[0] - cents[lab[i]][0]) ** 2 + (p[1] - cents[lab[i]][1]) ** 2; });
    return { cents, lab, sse, hist };
  };
  // Standardize 2-D points per channel (II.13): returns {Z, mu, sd}.
  SV.standardize2 = function (pts) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const mu = [mean(xs), mean(ys)];
    const sd = [Math.sqrt(mean(xs.map(v => (v - mu[0]) ** 2))), Math.sqrt(mean(ys.map(v => (v - mu[1]) ** 2)))];
    return { Z: pts.map(p => [(p[0] - mu[0]) / sd[0], (p[1] - mu[1]) / sd[1]]), mu, sd };
  };
  // Bits per element a VQ codebook saves (Gaussian rule on per-channel residual variances),
  // its index tax, and the net, on standardized 2-D data Z.
  SV.vqBits = function (Z, C, seed = 1) {
    const km = SV.kmeans(Z, C, seed);
    const res = Z.map((p, i) => [p[0] - km.cents[km.lab[i]][0], p[1] - km.cents[km.lab[i]][1]]);
    const v = [0, 1].map(j => mean(res.map(q => q[j] * q[j])));
    const gross = mean([0, 1].map(j => 0.5 * Math.log2(1 / Math.max(v[j], 1e-9))));
    const tax = Math.log2(C) / 2;
    return { km, gross, tax, net: gross - tax, resVar: v };
  };
  // KLT gain (bits per element) of standardized 2-D data.
  SV.kltGain2 = function (Z) {
    const S = SV.covMatrix(Z);
    return SV.amgm(SV.eig(S).values).gain;
  };

  // --- Number formats --------------------------------------------------------
  // E4M3 (the "fn" variant: no infinities, max 448): all non-negative values, sorted (127 of them).
  SV.e4m3Grid = (function () {
    const sub = [1, 2, 3, 4, 5, 6, 7].map(m => m / 8 * 2 ** -6);
    const nor = [];
    for (let e = 1; e <= 15; e++) for (let m = 0; m < 8; m++) nor.push((1 + m / 8) * 2 ** (e - 7));
    nor.pop();                                         // S.1111.111 is NaN
    return [0, ...sub, ...nor];
  })();
  // Nearest E4M3 value (ties to even mantissa), saturating at 448.
  SV.e4m3Round = function (x) {
    const ax = Math.min(Math.abs(x), 448);
    const e = Math.floor(Math.log2(Math.max(ax, 2 ** -6)));
    const step = 2 ** (e - 3);
    let q = ax / step, fl = Math.floor(q), fr = q - fl;
    let k = fr > 0.5 ? fl + 1 : fr < 0.5 ? fl : (fl % 2 === 0 ? fl : fl + 1);
    const v = Math.min(k * step, 448);
    return x < 0 ? -v : v;
  };
  SV.e4m3Index = function (xq) {
    const ax = Math.abs(xq), G = SV.e4m3Grid;
    let lo = 0, hi = G.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (G[mid] < ax) lo = mid + 1; else hi = mid; }
    return xq < 0 ? -lo : lo;
  };
  SV.e4m3FromIndex = i => (i < 0 ? -SV.e4m3Grid[-i] : SV.e4m3Grid[i]);
  SV.e4m3Bits = function (xq) {
    const i = Math.abs(SV.e4m3Index(xq));
    const s = xq < 0 ? 1 : 0;
    let e, m;
    if (i < 8) { e = 0; m = i; } else { e = 1 + Math.floor((i - 8) / 8); m = (i - 8) % 8; }
    return { s, e, m, str: `${s} ${e.toString(2).padStart(4, '0')} ${m.toString(2).padStart(3, '0')}` };
  };
  // BF16: round-to-nearest-even of a float32 to its top 16 bits. Returns {bits (uint16), value}.
  SV.bf16 = function (x) {
    const f = new Float32Array([x]), u = new Uint32Array(f.buffer);
    const lsb = (u[0] >>> 16) & 1;
    const b = ((u[0] + 0x7fff + lsb) >>> 16) & 0xffff;
    const g = new Uint32Array([b << 16]);
    return { bits: b, value: new Float32Array(g.buffer)[0] };
  };
  SV.int8Round = (x, scale) => Math.max(-127, Math.min(127, Math.round(x / scale)));

  // --- Caches -----------------------------------------------------------------
  SV.LOGBOOKS = { G: 'Gull Rock', S: 'Seal Point', H: 'Harbour buoy', L: 'Lighthouse', N: 'North Cape', F: 'Ferry pier', M: 'Mill Bay', R: 'Reef' };
  SV.TRACES = {
    storm: 'G S G H G S L G S F G S H G N G S L G S M G S R'.split(' '),
    sweep: 'G S H L N G S H L N G S H L N G S H L N G S H L'.split(' '),
    random: (function () { const r = tinyRng(99), k = 'GSHLNFMR'; return Array.from({ length: 24 }, () => k[Math.floor(r() * 8)]); })(),
  };
  // Simulate a cache of `slots` under 'lru' | 'fifo' | 'opt' (Bélády). Returns per-step states.
  SV.simulate = function (seq, slots, policy = 'lru') {
    let desk = [];                        // array of {id, last, added}
    const steps = [];
    seq.forEach((id, t) => {
      const found = desk.find(o => o.id === id);
      let evicted = null;
      if (found) found.last = t;
      else {
        if (desk.length >= slots) {
          let victim;
          if (policy === 'lru') victim = desk.reduce((a, b) => (b.last < a.last ? b : a));
          else if (policy === 'fifo') victim = desk.reduce((a, b) => (b.added < a.added ? b : a));
          else {
            const nextUse = o => { const k = seq.indexOf(o.id, t + 1); return k < 0 ? Infinity : k; };
            victim = desk.reduce((a, b) => (nextUse(b) > nextUse(a) ? b : a));
          }
          evicted = victim.id;
          desk[desk.indexOf(victim)] = { id, last: t, added: t };   // the new item takes the victim's slot
        } else desk.push({ id, last: t, added: t });
      }
      steps.push({ t, id, hit: !!found, evicted, desk: desk.map(o => ({ ...o })) });
    });
    const misses = steps.filter(s => !s.hit).length;
    return { steps, misses, hits: seq.length - misses, rate: misses / seq.length };
  };
  // Reuse (stack) distance of every request: distinct other items since its previous use (Infinity if first).
  SV.reuseDistances = function (seq) {
    return seq.map((id, t) => {
      const prev = t ? seq.lastIndexOf(id, t - 1) : -1;
      if (prev < 0) return Infinity;
      return new Set(seq.slice(prev + 1, t)).size;
    });
  };
  // The LRU stack (most recent first) just before request t.
  SV.lruStack = function (seq, t) {
    const out = [];
    for (let k = t - 1; k >= 0; k--) if (!out.includes(seq[k])) out.push(seq[k]);
    return out;
  };

  /* ==================================================================
     3. Figure helpers (plotkit globals are used only inside builders)
     ================================================================== */
  const sgn = (v, d) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d);
  const num = (v, d) => (v < 0 ? '−' + Math.abs(v).toFixed(d) : v.toFixed(d));
  const mix = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
  const onKey = (node, fn) => node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });

  /* ==================================================================
     II.13 — the table of readings: vectors are rows, channels are columns
     ================================================================== */
  FIG.svChannelTable = (host) => {
    const C = SV.CHANNELS;
    let mode = 'raw', sel = { type: 'col', i: 3 };
    const views = {};
    ['raw', 'centred', 'global', 'std'].forEach(m => { views[m] = SV.dayView(m); });
    const wrap = h('div', { class: 'tbl-wrap' });
    const ro = readout();
    const bitsRo = readout();
    host.append(
      controls(seg([['raw', 'as measured'], ['centred', 'minus each channel’s mean'], ['global', 'minus one mean for all'], ['std', 'standardized']], mode, v => { mode = v; draw(); }, 'Which numbers to show')),
      h('div', { class: 'fig-note', text: 'Click a column head to pick a channel, or a time to pick a vector.' }),
      wrap, ro, bitsRo,
    );
    const fmtCell = (v, j) => (mode === 'std' ? num(v, 2) : mode === 'raw' ? v.toFixed(C[j].dec) : num(v, C[j].dec));
    function draw() {
      const v = views[mode];
      const t = h('table', { class: 'data sv-tab' });
      const hr = h('tr', {}, h('th', { class: 'l', text: 'time' }));
      C.forEach((c, j) => {
        const th = h('th', { class: 'sv-click' + (sel.type === 'col' && sel.i === j ? ' sv-sel' : ''), tabindex: '0', role: 'button', 'aria-pressed': String(sel.type === 'col' && sel.i === j), html: `${tex('\\vc = ' + j)}<br><span class="sv-sub">${c.short}${c.unit ? ' (' + c.unit + ')' : ''}</span>` });
        const pick = () => { sel = { type: 'col', i: j }; draw(); };
        th.addEventListener('click', pick); onKey(th, pick);
        hr.append(th);
      });
      t.append(h('thead', {}, hr));
      const tb = h('tbody');
      v.rows.forEach((row, i) => {
        const rowSel = sel.type === 'row' && sel.i === i;
        const tm = h('td', { class: 'l sv-click' + (rowSel ? ' sv-sel' : ''), tabindex: '0', role: 'button', 'aria-pressed': String(rowSel), text: v.day[i].time });
        const pick = () => { sel = { type: 'row', i }; draw(); };
        tm.addEventListener('click', pick); onKey(tm, pick);
        const tr = h('tr', { class: rowSel ? 'sv-rowsel' : null }, tm);
        row.forEach((x, j) => tr.append(h('td', { class: sel.type === 'col' && sel.i === j ? 'sv-colsel' : null, text: fmtCell(x, j) })));
        tb.append(tr);
      });
      t.append(tb);
      const foot = h('tfoot');
      if (mode === 'centred' || mode === 'global') foot.append(h('tr', { class: 'sv-foot' }, h('td', { class: 'l', text: 'subtracted' }), ...v.shift.map((s, j) => h('td', { text: s.toFixed(mode === 'global' ? Math.max(1, C[j].dec) : C[j].dec) }))));
      if (mode === 'std') {
        foot.append(h('tr', { class: 'sv-foot' }, h('td', { class: 'l', text: 'mean' }), ...v.mu.map((s, j) => h('td', { text: s.toFixed(C[j].dec + 1) }))));
        foot.append(h('tr', { class: 'sv-foot' }, h('td', { class: 'l', text: 'spread σ' }), ...v.sd.map((s, j) => h('td', { text: s.toFixed(C[j].dec + 1) }))));
      } else foot.append(h('tr', { class: 'sv-foot sv-bits' }, h('td', { class: 'l', text: 'bits / value' }), ...v.width.map(w => h('td', { text: String(w) }))));
      t.append(foot);
      wrap.replaceChildren(t);
      if (sel.type === 'col') {
        const j = sel.i, raw = views.raw;
        ro.set([[`channel ${tex('\\vc = ' + j)}`, C[j].name], ['values', '12, one per reading'], ['mean ' + tex('\\vmu_{' + j + '}'), raw.mu[j].toFixed(C[j].dec + 1) + ' ' + C[j].unit], ['spread ' + tex('\\vsigma_{' + j + '}'), raw.sd[j].toFixed(C[j].dec + 1) + ' ' + C[j].unit]]);
      } else {
        const r = views.raw.rows[sel.i];
        ro.set([[`vector at ${views.raw.day[sel.i].time}`, tex('\\vxvec = (' + r.map((x, j) => x.toFixed(C[j].dec)).join(',\\ ') + ')')], [tex('\\vd'), '5 elements']]);
      }
      bitsRo.set(mode === 'std'
        ? [['no grid', 'standardized numbers are for comparing channels, not for sending']]
        : [['fixed-length bits per reading', v.width.join(' + ') + ' = <b>' + v.total + '</b>'], ['as measured', views.raw.total + ' bits']]);
    }
    draw();
  };

  /* ==================================================================
     II.14 — covariance as the average signed rectangle
     ================================================================== */
  FIG.svCovScatter = (host) => {
    const X = SV.matrixOf(SV.month()), C = SV.CHANNELS;
    const PAIRS = [[0, 1, 'the two thermometers'], [0, 2, 'temperature · humidity'], [3, 4, 'pressure · wind'], [0, 3, 'temperature · pressure']];
    let pi = 0, hl = null;
    const box = h('div'), ro = readout();
    host.append(
      controls(seg(PAIRS.map((p, i) => [i, p[2]]), pi, v => { pi = v; hl = null; draw(); }, 'Which pair of channels')),
      legend([['product positive (same side of both means)', series(0), 'dot'], ['product negative (opposite sides)', series(1), 'dot'], ['the rectangle of the picked reading', 'var(--c)', 'box']]),
      box, ro,
    );
    const P = Plot(box, { x: [0, 1], y: [0, 1], h: 400, xlabel: 'x', ylabel: 'y', label: 'Scatter of two channels with their means' });
    const gQ = el('g', {}, P.g.bg), gPts = el('g', {}, P.g.data), gHl = el('g', {}, P.g.data);
    let cur = null;
    function stats() {
      const [a, b] = PAIRS[pi];
      const xs = X.map(r => r[a]), ys = X.map(r => r[b]);
      const ma = mean(xs), mb = mean(ys);
      const sa = Math.sqrt(mean(xs.map(v => (v - ma) ** 2))), sb = Math.sqrt(mean(ys.map(v => (v - mb) ** 2)));
      const cov = mean(xs.map((v, i) => (v - ma) * (ys[i] - mb)));
      return { a, b, xs, ys, ma, mb, sa, sb, cov, corr: cov / (sa * sb) };
    }
    function draw() {
      cur = stats();
      const { a, b, xs, ys, ma, mb } = cur;
      const pad = (lo, hi) => { const d = (hi - lo) * 0.06; return [lo - d, hi + d]; };
      P.opts.xlabel = `${C[a].name}${C[a].unit ? ' (' + C[a].unit + ')' : ''} — channel ${a}`;
      P.opts.ylabel = `${C[b].name}${C[b].unit ? ' (' + C[b].unit + ')' : ''} — channel ${b}`;
      P.domain({ x: pad(...extent(xs)), y: pad(...extent(ys)) });
      gQ.replaceChildren(); gPts.replaceChildren();
      const X0 = P.x(P.x0), X1 = P.x(P.x1), Y0 = P.y(P.y0), Y1 = P.y(P.y1), MX = P.x(ma), MY = P.y(mb);
      [[MX, Y1, X1 - MX, MY - Y1, 0], [X0, MY, MX - X0, Y0 - MY, 0], [X0, Y1, MX - X0, MY - Y1, 1], [MX, MY, X1 - MX, Y0 - MY, 1]].forEach(([x, y, w, hh, s]) =>
        el('rect', { x, y, width: Math.max(0, w), height: Math.max(0, hh), style: `fill:${mix(series(s), 7)}` }, gQ));
      el('line', { x1: MX, x2: MX, y1: Y1, y2: Y0, style: 'stroke:var(--ink-3);stroke-dasharray:5 4;stroke-width:1.2' }, gQ);
      el('line', { x1: X0, x2: X1, y1: MY, y2: MY, style: 'stroke:var(--ink-3);stroke-dasharray:5 4;stroke-width:1.2' }, gQ);
      el('text', { x: MX + 6 * P.fs, y: Y1 + 14 * P.fs, class: 'lbl', text: 'mean' }, gQ);
      xs.forEach((x, i) => {
        const pr = (x - ma) * (ys[i] - mb);
        el('circle', { cx: P.x(x), cy: P.y(ys[i]), r: 2.3 * P.fs, style: `fill:${pr >= 0 ? series(0) : series(1)};opacity:.62` }, gPts);
      });
      if (hl == null) {                                   // default: a reading far out in a corner
        let best = 0; xs.forEach((x, i) => { const pr = Math.abs((x - ma) * (ys[i] - mb)); if (pr > best && i % 7 === 3) { best = pr; hl = i; } });
      }
      drawHl();
      const r2 = cur.corr * cur.corr;
      ro.set([
        [tex('\\vsigma_{' + a + '}'), `${fmt(cur.sa, 3)} ${C[a].unit}`], [tex('\\vsigma_{' + b + '}'), `${fmt(cur.sb, 3)} ${C[b].unit}`],
        ['covariance', fmt(cur.cov, 4)], ['correlation', `<b>${fmt(cur.corr, 3)}</b>`],
        [tex('\\vRsq = \\text{corr}^2'), fmt(r2, 3)], ['bits saved', `${fmt(0.5 * Math.log2(1 / (1 - r2)), 2)} on channel ${b}, knowing channel ${a}`],
      ]);
    }
    function drawHl() {
      gHl.replaceChildren();
      if (hl == null) return;
      const { xs, ys, ma, mb } = cur;
      const x = xs[hl], y = ys[hl], pr = (x - ma) * (y - mb);
      const x0 = Math.min(P.x(ma), P.x(x)), y0 = Math.min(P.y(mb), P.y(y));
      el('rect', { x: x0, y: y0, width: Math.abs(P.x(x) - P.x(ma)), height: Math.abs(P.y(y) - P.y(mb)), style: `fill:${mix('var(--c)', 22)};stroke:var(--c);stroke-width:1.6` }, gHl);
      dot(gHl, P.x(x), P.y(y), 5 * P.fs, 'var(--c)');
      const txt = `(${fmt(x - ma, 2)}) × (${fmt(y - mb, 2)}) = ${fmt(pr, 3)}`;
      const right = P.x(x) < P.x(P.x0) + P.pw * 0.55;
      el('text', { x: P.x(x) + (right ? 10 : -10) * P.fs, y: P.y(y) - 9 * P.fs, 'text-anchor': right ? 'start' : 'end', class: 'val', text: txt }, gHl);
    }
    const pick = e => {
      const [px, py] = P.toData(e);
      const { xs, ys } = cur, sx = (P.x1 - P.x0), sy = (P.y1 - P.y0);
      let bi = 0, bd = Infinity;
      xs.forEach((x, i) => { const d = ((x - px) / sx) ** 2 + ((ys[i] - py) / sy) ** 2; if (d < bd) { bd = d; bi = i; } });
      if (bd < 0.004) { hl = bi; drawHl(); }
    };
    P.svg.addEventListener('pointermove', pick);
    P.svg.addEventListener('pointerdown', pick);
    draw();
  };

  /* ==================================================================
     II.14 — the covariance / correlation matrix as a heat table
     ================================================================== */
  FIG.svCovMatrix = (host) => {
    const X = SV.matrixOf(SV.month()), C = SV.CHANNELS;
    const S = SV.covMatrix(X), R = SV.corrMatrix(S);
    let mode = 'cov';
    const wrap = h('div', { class: 'tbl-wrap' }), ro = readout();
    host.append(controls(seg([['cov', 'covariance (raw units)'], ['corr', 'correlation (standardized)']], mode, v => { mode = v; draw(); }, 'Which matrix')), wrap, ro);
    const sig = v => { const a = Math.abs(v); return a === 0 ? '0' : a >= 10 ? num(v, 1) : a >= 1 ? num(v, 2) : a >= 0.01 ? num(v, 3) : num(v, 4); };
    function draw() {
      const M = mode === 'cov' ? S : R;
      const mx = Math.max(...M.flat().map(Math.abs));
      const t = h('table', { class: 'data sv-heat' });
      t.append(h('thead', {}, h('tr', {}, h('th', { class: 'l', text: '' }), ...C.map((c, j) => h('th', { html: `${tex('\\vc=' + j)}<br><span class="sv-sub">${c.short}</span>` })))));
      const tb = h('tbody');
      M.forEach((row, a) => {
        const tr = h('tr', {}, h('th', { class: 'l', html: `${tex('\\vc=' + a)} <span class="sv-sub">${C[a].short}</span>` }));
        row.forEach((v, b) => {
          const pct = Math.round(8 + 70 * Math.abs(v) / mx);
          const td = h('td', { class: a === b ? 'sv-diag' : null, style: `background:${mix(v >= 0 ? series(0) : series(1), pct)}`, tabindex: '0', text: sig(v) });
          hover(td, () => `<b>${C[a].short} × ${C[b].short}</b><br>${a === b ? (mode === 'cov' ? 'variance ' + tex('\\vsigma_{' + a + '}^2') : 'a channel with itself: always 1') : (mode === 'cov' ? 'covariance' : 'correlation')} = ${sig(v)}`);
          tr.append(td);
        });
        tb.append(tr);
      });
      t.append(tb);
      wrap.replaceChildren(t);
      ro.set(mode === 'cov'
        ? [['diagonal', 'each channel’s variance, in its own units squared'], ['biggest entry', 'pressure, ' + sig(S[3][3]) + ' hPa²'], ['smallest diagonal', 'humidity, ' + sig(S[2][2])]]
        : [['diagonal', 'all 1'], ['two thermometers', sig(R[0][1])], ['temperature · humidity', sig(R[0][2])], ['pressure · wind', sig(R[3][4])]]);
    }
    draw();
  };

  /* ==================================================================
     II.15 — turning the axes of the two-thermometer cloud
     ================================================================== */
  FIG.svRotation = (host) => {
    const X = SV.matrixOf(SV.month());
    const mu = [mean(X.map(r => r[0])), mean(X.map(r => r[1]))];
    const pts = X.map(r => [r[0] - mu[0], r[1] - mu[1]]);
    const S = SV.covMatrix(pts);
    const E = SV.eig(S);
    let thK = Math.atan2(E.vectors[0][1], E.vectors[0][0]) * 180 / Math.PI;
    if (thK < 0) thK += 180;
    let th = 0;
    const box = h('div');
    const tiles = {
      v1: kpi('spread² along axis 1', '', '', series(4)),
      v2: kpi('spread² along axis 2', '', '', series(2)),
      tot: kpi('total spread²', '', 'never changes'),
      bits: kpi('bits per reading', '', ''),
    };
    const sl = slider('angle of axis 1', 0, 180, 0.5, th, v => { th = v; draw(); }, v => `${v.toFixed(1)}°`);
    const ro = readout();
    host.append(
      controls(sl, btn('Snap to KLT', () => { th = +thK.toFixed(1); sl.set(th); draw(); }), btn('Reset', () => { th = 0; sl.set(0); draw(); }, { cls: 'sm' })),
      h('div', { class: 'fig-note', text: 'Drag the round handle at the end of axis 1, or use the slider.' }),
      box, h('div', { class: 'kpis' }, tiles.v1, tiles.v2, tiles.tot, tiles.bits), ro,
    );
    const P = Plot(box, { x: [-6.5, 6.5], y: [-6.5, 6.5], equal: true, h: 470, xlabel: 'foot thermometer minus its mean (°C)', ylabel: 'top thermometer minus its mean (°C)', label: 'The two-thermometer cloud with a rotatable pair of axes' });
    const gPts = el('g', {}, P.g.data), gAx = el('g', {}, P.g.data);
    pts.forEach(([x, y]) => el('circle', { cx: P.x(x), cy: P.y(y), r: 2.2 * P.fs, style: 'fill:var(--ink-3);opacity:.55' }, gPts));
    const knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
    const R0 = 5.4;
    draggable(knob, P, ([x, y]) => {
      let a = Math.atan2(y, x) * 180 / Math.PI;
      if (a < 0) a += 180;
      th = Math.round(a * 2) / 2; if (th >= 180) th = 0;
      sl.set(th); draw();
    }, null, { get: () => [R0 * Math.cos(th * Math.PI / 180), R0 * Math.sin(th * Math.PI / 180)], step: [0.15, 0.15], label: 'angle of axis 1' });
    hover(knob, () => `<b>axis 1 at ${th.toFixed(1)}°</b><br>drag to turn both axes`);
    function axis(g, ang, sd, color, label) {
      const c = Math.cos(ang), s = Math.sin(ang), L = 9;
      el('line', { x1: P.x(-L * c), y1: P.y(-L * s), x2: P.x(L * c), y2: P.y(L * s), style: `stroke:${color};stroke-width:1.6` }, g);
      el('line', { x1: P.x(-2 * sd * c), y1: P.y(-2 * sd * s), x2: P.x(2 * sd * c), y2: P.y(2 * sd * s), style: `stroke:${color};stroke-width:${11 * P.fs};stroke-linecap:round;opacity:.28` }, g);
      const lx = P.x(6.1 * c), ly = P.y(6.1 * s);
      el('text', { x: lx, y: ly - 8 * P.fs, 'text-anchor': 'middle', class: 'lbl', text: label }, g);
    }
    function draw() {
      const t = th * Math.PI / 180;
      const [v1, v2, cv] = SV.rotVars(S, t);
      gAx.replaceChildren();
      axis(gAx, t + Math.PI / 2, Math.sqrt(Math.max(v2, 0)), series(2), 'axis 2');
      axis(gAx, t, Math.sqrt(v1), series(4), 'axis 1');
      knob.setAttribute('cx', P.x(R0 * Math.cos(t))); knob.setAttribute('cy', P.y(R0 * Math.sin(t)));
      const b1 = SV.gaussBits(v1, 0.1), b2 = SV.gaussBits(Math.max(v2, 1e-6), 0.1), b0 = SV.gaussBits(S[0][0], 0.1) + SV.gaussBits(S[1][1], 0.1);
      tiles.v1.set(`${fmt(v1, 3)} °C²`, `σ = ${fmt(Math.sqrt(v1), 2)} °C`);
      tiles.v2.set(`${fmt(v2, 3)} °C²`, `σ = ${fmt(Math.sqrt(Math.max(v2, 0)), 2)} °C`);
      tiles.tot.set(`${fmt(v1 + v2, 3)} °C²`);
      tiles.bits.set(fmt(b1 + b2, 2), `${fmt(b1, 2)} + ${fmt(b2, 2)}; was ${fmt(b0, 2)}`);
      ro.set([['angle', `${th.toFixed(1)}° (KLT: ${thK.toFixed(1)}°)`], ['covariance of the new coordinates', fmt(cv, 3)], ['bits saved per reading', `<b>${fmt(b0 - b1 - b2, 2)}</b>`]]);
    }
    draw();
  };

  /* ==================================================================
     II.16 — eigenvalue spectra, flat to spiky, and ½ log₂ AM/GM
     ================================================================== */
  FIG.svSpectrum = (host) => {
    const R5 = SV.corrMatrix(SV.covMatrix(SV.matrixOf(SV.month())));
    const gull = SV.eig(R5).values;
    const thermo = SV.eig([[1, R5[0][1]], [R5[0][1], 1]]).values;
    const rep = (v, n) => new Array(n).fill(v);
    const PRE = {
      thermo: { label: 'two thermometers', vals: thermo },
      gull: { label: 'Gull Rock, 5 channels', vals: gull },
      flat: { label: 'flat (64)', vals: rep(1, 64) },
      a: { label: '8 strong ×10 (64)', vals: [...rep(10, 8), ...rep(1, 56)] },
      b: { label: '8 strong, 56 quiet (64)', vals: [...rep(50, 8), ...rep(0.1, 56)] },
      custom: { label: 'your own (64)', vals: null },
    };
    let pre = 'gull', r = 8, ratio = 100;
    const box = h('div');
    const tiles = { am: kpi('AM of the λ’s', '', 'ordinary average', series(0)), gm: kpi('GM of the λ’s', '', 'geometric average', series(1)), gain: kpi('coding gain', '', 'bits per element'), vec: kpi('per vector', '', 'bits saved') };
    const sR = slider('strong directions', 1, 63, 1, r, v => { r = v; pre = 'custom'; sg.set('custom'); draw(); });
    const sQ = slider('strong ÷ quiet variance', 0, 4, 0.05, Math.log10(ratio), v => { ratio = 10 ** v; pre = 'custom'; sg.set('custom'); draw(); }, v => `${fmt(10 ** v, 10 ** v < 10 ? 1 : 0)}×`);
    const sg = seg(Object.entries(PRE).map(([k, p]) => [k, p.label]), pre, v => { pre = v; draw(); }, 'Spectrum');
    host.append(controls(sg), controls(sR, sQ), legend([['eigenvalue λ (variance along one KLT axis)', series(4), 'box'], ['AM', series(0), 'dash'], ['GM', series(1), 'dash']]), box, h('div', { class: 'kpis' }, tiles.am, tiles.gm, tiles.gain, tiles.vec));
    const P = Plot(box, { x: [0.5, 5.5], y: [1e-3, 100], ylog: true, h: 330, xlabel: 'KLT axis, sorted by variance', ylabel: 'eigenvalue λ (standardized)', yfmt: v => (v >= 1 ? String(v) : v >= 0.01 ? String(v) : v.toExponential(0)), label: 'Eigenvalue spectrum with its arithmetic and geometric means' });
    function vals() {
      let v = pre === 'custom' ? [...rep(ratio, r), ...rep(1, 64 - r)] : PRE[pre].vals.slice();
      const m = mean(v);
      return v.map(x => x / m).sort((a, b) => b - a);
    }
    function draw() {
      const v = vals(), d = v.length, g = SV.amgm(v);
      P.domain({ x: [0.5, d + 0.5] });
      P.clear();
      const bw = Math.max(1.5, P.pw / d * 0.8);
      v.forEach((lam, i) => {
        const y = Math.max(lam, 1.2e-3);
        const rr = el('rect', { x: P.x(i + 1) - bw / 2, y: P.y(y), width: bw, height: P.y(1e-3) - P.y(y), rx: Math.min(3, bw / 3), style: `fill:${series(4)};opacity:.8` }, P.g.data);
        hover(rr, () => `<b>axis ${i + 1}</b><br>λ = ${fmt(lam, lam < 0.01 ? 4 : 3)}`);
      });
      rule(P, { y: g.am, label: `AM = ${fmt(g.am, 2)}`, color: series(0) });
      rule(P, { y: g.gm, label: `GM = ${fmt(g.gm, 3)}`, color: series(1) });
      tiles.am.set(fmt(g.am, 2));
      tiles.gm.set(fmt(g.gm, 3));
      tiles.gain.set(fmt(g.gain, 2), `½ log₂(${fmt(g.am / g.gm, 2)})`);
      tiles.vec.set(fmt(g.gain * d, 2), `${d} elements × ${fmt(g.gain, 2)}`);
    }
    draw();
  };

  /* ==================================================================
     II.17 — k-means on the weather regimes, with the index tax
     ================================================================== */
  FIG.svKmeans = (host) => {
    const raw = SV.regimes(), pts = raw.map(p => [p.x, p.y]);
    const st = SV.standardize2(pts), Z = st.Z;
    let C = 3, seed = 0, state = null;
    const box = h('div');
    const tiles = { gross: kpi('bits saved', '', 'per element (Gaussian rule)', series(2)), tax: kpi('index tax', '', '', series(1)), net: kpi('net', '', 'per element') };
    const ro = readout();
    const sC = slider(texify('codebook size $\\vC$'), 1, 8, 1, C, v => { C = v; seed = 0; init(); draw(); });
    host.append(
      controls(sC, btn('One k-means step', () => { step(); draw(); }), btn('Run to the end', () => { for (let i = 0; i < 100 && step(); i++); draw(); }), btn('New start', () => { seed++; init(); draw(); }, { cls: 'sm' })),
      box, h('div', { class: 'kpis' }, tiles.gross, tiles.tax, tiles.net), ro,
    );
    const P = Plot(box, { x: [0, 46], y: [56, 101], h: 420, xlabel: 'wind speed (kn)', ylabel: 'humidity (%)', label: 'Readings in the wind–humidity plane, coloured by their nearest centroid' });
    const gPts = el('g', {}, P.g.data), gC = el('g', {}, P.g.top);
    const toRaw = c => [c[0] * st.sd[0] + st.mu[0], c[1] * st.sd[1] + st.mu[1]];
    function init() {
      const r = PK.rng(`sv-km-${seed}-${C}-0`);
      const cents = [Z[r.int(Z.length)].slice()];
      while (cents.length < C) {
        const d2 = Z.map(p => Math.min(...cents.map(c => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2)));
        let u = r() * d2.reduce((a, b) => a + b, 0), i = 0;
        while (i < Z.length - 1 && (u -= d2[i]) > 0) i++;
        cents.push(Z[i].slice());
      }
      state = { cents, lab: SV.assign(Z, cents), it: 0, done: C === 1 ? false : false };
    }
    function step() {
      const res = SV.lloyd(Z, state.cents, 1);
      const moved = res.cents.some((c, k) => Math.abs(c[0] - state.cents[k][0]) + Math.abs(c[1] - state.cents[k][1]) > 1e-9);
      state.cents = res.cents; state.lab = res.lab;
      if (moved) state.it++;
      state.done = !moved;
      return moved;
    }
    function draw() {
      gPts.replaceChildren(); gC.replaceChildren();
      raw.forEach((p, i) => el('circle', { cx: P.x(p.x), cy: P.y(p.y), r: 3 * P.fs, style: `fill:${series(state.lab[i])};opacity:.6` }, gPts));
      state.cents.forEach((c, k) => {
        const [cx, cy] = toRaw(c);
        const g = el('g', {}, gC);
        const s = 9 * P.fs, X = P.x(cx), Y = P.y(cy);
        el('path', { d: `M${X} ${Y - s}L${X + s} ${Y}L${X} ${Y + s}L${X - s} ${Y}Z`, style: `fill:${series(k)};stroke:var(--paper-3);stroke-width:${2.5 * P.fs}` }, g);
        hover(g, () => `<b>centroid ${k + 1}</b><br>${fmt(cx, 1)} kn, ${fmt(cy, 1)} %<br>${state.lab.filter(l => l === k).length} readings`);
      });
      const res = Z.map((p, i) => [p[0] - state.cents[state.lab[i]][0], p[1] - state.cents[state.lab[i]][1]]);
      const v = [0, 1].map(j => mean(res.map(q => q[j] * q[j])));
      const gross = mean(v.map(x => 0.5 * Math.log2(1 / Math.max(x, 1e-9)))), tax = Math.log2(C) / 2;
      tiles.gross.set(fmt(gross, 2));
      tiles.tax.set(fmt(tax, 2), `log₂ ${C} bits per reading ÷ 2 elements`);
      tiles.net.set(fmt(gross - tax, 2));
      tiles.net.style.setProperty('--kc', gross - tax >= 0 ? 'var(--good)' : 'var(--bad)');
      ro.set([['k-means steps', `${state.it}${state.done ? ' — converged' : ''}`], ['spread² left, per channel', `${fmt(v[0], 3)} · ${fmt(v[1], 3)} (was 1 · 1)`], ['codebook', `${C} centroid${C > 1 ? 's' : ''} × 2 numbers`]]);
    }
    init(); draw();
  };

  /* ==================================================================
     II.18 — VQ against the KLT on two clouds: bells and clusters
     ================================================================== */
  FIG.svVqVsKlt = (host) => {
    const SETS = {
      thermo: { label: 'two thermometers (one bell-shaped cloud)', pts: SV.thermoPairs().map(p => [p.x, p.y]) },
      regimes: { label: 'weather regimes (three clusters)', pts: SV.regimes().map(p => [p.x, p.y]) },
    };
    const CS = [2, 3, 4, 8, 16, 32, 64];
    for (const s of Object.values(SETS)) {
      const Z = SV.standardize2(s.pts).Z;
      s.klt = SV.kltGain2(Z);
      s.res = CS.map(C => SV.vqBits(Z, C));
    }
    let set = 'thermo';
    const box = h('div'), ro = readout();
    host.append(
      controls(seg(Object.entries(SETS).map(([k, s]) => [k, s.label]), set, v => { set = v; draw(); }, 'Data set')),
      legend([['bits the residual saves', series(2), 'box'], ['index tax', series(1), 'box'], ['net = saved − tax', series(5), 'box'], ['KLT gain (no tax)', series(4), 'dash']]),
      box, ro,
    );
    const P = Plot(box, { xcats: CS.map(String), y: [-0.2, 4.8], h: 360, grid: 'y', xlabel: 'codebook size C (centroids)', ylabel: 'bits per element', label: 'VQ bits saved, index tax and net against codebook size, with the KLT gain' });
    function draw() {
      const s = SETS[set];
      P.clear();
      bars(P, s.res.map(r => [r.gross, r.tax, r.net]), {
        colors: (i, j, v) => (j === 2 ? (v >= 0 ? series(5) : 'var(--bad)') : [series(2), series(1)][j]),
        labels: (v, i, j) => (j === 2 ? fmt(v, 2) : ''),
        tip: (v, i, j) => `<b>C = ${CS[i]}</b><br>${['saved', 'tax', 'net'][j]}: ${fmt(v, 2)} bits / element`,
        width: 18,
      });
      rule(P, { y: s.klt, label: `KLT: ${fmt(s.klt, 2)}`, color: series(4) });
      const best = s.res.reduce((a, b, i) => (b.net > a.net ? { net: b.net, i } : a), { net: -Infinity, i: 0 });
      ro.set([['KLT gain', `${fmt(s.klt, 2)} bits / element, no tax`], ['best VQ net', `${fmt(best.net, 2)} at C = ${CS[best.i]}`], ['winner', best.net > s.klt ? '<b>the codebook</b>' : '<b>the rotation</b>']]);
    }
    draw();
  };

  /* ==================================================================
     II.19 — a uniform grid and a floating-point grid on one number line
     ================================================================== */
  FIG.svGrids = (host) => {
    const E = SV.e4m3Grid;
    const Q = {
      rain: { label: 'rainfall rate (mm/h)', lo: 0, hi: 100, loLog: 0.05, scale: 100 / 127, v: 0.3, unit: 'mm/h' },
      temp: { label: 'temperature (°C)', lo: -30, hi: 30, scale: 0.25, v: 25, unit: '°C' },
    };
    let q = 'rain', axis = 'lin', v = Q.rain.v;
    const box = h('div');
    const tiles = { i: kpi('INT8 (uniform)', '', '', series(0)), f: kpi('8-bit float', '', '', series(1)) };
    const sAx = seg([['lin', 'even axis'], ['log', 'logarithmic axis']], axis, x => { axis = x; build(); }, 'Axis');
    host.append(controls(seg([['rain', 'rainfall rate'], ['temp', 'temperature']], q, x => { q = x; v = Q[q].v; if (q === 'temp') { axis = 'lin'; sAx.set('lin'); } build(); }, 'Quantity'), sAx),
      legend([['INT8 grid points (value = k × scale)', series(0), 'dot'], ['8-bit float grid points (3 mantissa bits)', series(1), 'dot'], ['the value you pick', 'var(--c)', 'dot']]),
      box, h('div', { class: 'kpis' }, tiles.i, tiles.f),
      h('div', { class: 'fig-note', text: 'Drag the handle along the line (or focus it and use the arrow keys).' }));
    let P = null, knob = null, gDyn = null;
    function build() {
      const o = Q[q], log = axis === 'log' && q === 'rain';
      box.replaceChildren();
      P = Plot(box, { x: log ? [o.loLog, o.hi] : [o.lo, o.hi], xlog: log, y: [0, 3], h: 210, grid: false, yticks: [], xlabel: o.label, m: { l: 92, r: 18, t: 14, b: 48 }, label: 'Two grids of representable values on one number line' });
      const rows = [[2.15, 'INT8', series(0)], [0.85, '8-bit float', series(1)]];
      rows.forEach(([y, name, col]) => {
        el('line', { x1: P.x(P.x0), x2: P.x(P.x1), y1: P.y(y), y2: P.y(y), style: 'stroke:var(--rule);stroke-width:1' }, P.g.data);
        el('text', { x: P.m.l - 10 * P.fs, y: P.y(y) + 4 * P.fs, 'text-anchor': 'end', class: 'lbl', text: name }, P.g.axes);
      });
      const inX = x => x >= Math.min(P.x0, P.x1) && x <= Math.max(P.x0, P.x1);
      for (let k = -127; k <= 127; k++) { const x = k * o.scale; if (inX(x)) el('line', { x1: P.x(x), x2: P.x(x), y1: P.y(2.15) - 9 * P.fs, y2: P.y(2.15) + 9 * P.fs, style: `stroke:${series(0)};stroke-width:1.1;opacity:.75` }, P.g.data); }
      E.forEach(x0 => [x0, -x0].forEach(x => { if (inX(x)) el('line', { x1: P.x(x), x2: P.x(x), y1: P.y(0.85) - 9 * P.fs, y2: P.y(0.85) + 9 * P.fs, style: `stroke:${series(1)};stroke-width:1.1;opacity:.75` }, P.g.data); }));
      gDyn = el('g', {}, P.g.data);
      knob = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
      const span = log ? null : (o.hi - o.lo) / 200;
      draggable(knob, P, ([x]) => { v = clamp(x, log ? o.loLog : o.lo, o.hi); draw(); }, null,
        { get: () => [v, 1.5], step: [log ? v * 0.03 : span, 0], label: 'value on the number line' });
      draw();
    }
    function draw() {
      const o = Q[q];
      const ki = SV.int8Round(v, o.scale), vi = ki * o.scale, vf = SV.e4m3Round(v);
      gDyn.replaceChildren();
      el('line', { x1: P.x(v), x2: P.x(v), y1: P.y(2.9), y2: P.y(0.2), style: 'stroke:var(--c);stroke-width:1.3;stroke-dasharray:4 3' }, gDyn);
      dot(gDyn, P.x(vi), P.y(2.15), 6 * P.fs, series(0));
      dot(gDyn, P.x(vf), P.y(0.85), 6 * P.fs, series(1));
      knob.setAttribute('cx', P.x(v)); knob.setAttribute('cy', P.y(1.5));
      const rel = (a, b) => (b === 0 ? '—' : fmtPct(Math.abs(a - b) / Math.abs(b), 1));
      tiles.i.set(`${fmt(vi, 3)}`, `k = ${ki} · off by ${fmt(Math.abs(vi - v), 3)} ${o.unit} (${rel(vi, v)})`);
      tiles.f.set(`${fmt(vf, vf < 1 ? 4 : 3)}`, `off by ${fmt(Math.abs(vf - v), Math.abs(vf - v) < 0.01 ? 4 : 3)} ${o.unit} (${rel(vf, v)})`);
      knob.setAttribute('aria-valuetext', `${fmt(v, 3)} ${o.unit}`);
      hover(knob, () => `<b>${fmt(v, 3)} ${o.unit}</b>`);
    }
    build();
  };

  /* ==================================================================
     II.19 — BF16 bit patterns of temperatures, and the entropy of each bit
     ================================================================== */
  FIG.svBf16Bits = (host) => {
    const day = SV.day(12), month = SV.month().map(o => o.low);
    const wrap = h('div', { class: 'tbl-wrap' }), box = h('div'), ro = readout();
    host.append(wrap, legend([['sign', series(6), 'box'], ['exponent (8 bits)', series(0), 'box'], ['mantissa (7 bits)', series(1), 'box']]), box, ro);
    const t = h('table', { class: 'data sv-bits-tab' });
    t.append(h('thead', {}, h('tr', {}, h('th', { class: 'l', text: 'time' }), h('th', { text: 'reading' }), h('th', { text: 'as BF16' }), h('th', { class: 'l', text: 'the 16 bits: sign · exponent · mantissa' }))));
    const tb = h('tbody');
    day.slice(0, 8).forEach(o => {
      const b = SV.bf16(o.low), s = b.bits.toString(2).padStart(16, '0');
      tb.append(h('tr', {}, h('td', { class: 'l', text: o.time }), h('td', { text: o.low.toFixed(1) }), h('td', { text: String(b.value) }),
        h('td', { class: 'l sv-bitcell', html: `<span class="sv-b-s">${s[0]}</span> <span class="sv-b-e">${s.slice(1, 9)}</span> <span class="sv-b-m">${s.slice(9)}</span>` })));
    });
    t.append(tb); wrap.append(t);
    const labels = ['s', 'e7', 'e6', 'e5', 'e4', 'e3', 'e2', 'e1', 'e0', 'm6', 'm5', 'm4', 'm3', 'm2', 'm1', 'm0'];
    const Hb = labels.map((_, i) => { const k = 15 - i; const ones = month.filter(v => (SV.bf16(v).bits >> k) & 1).length / month.length; return PK.entropy([ones, 1 - ones]); });
    const P = Plot(box, { xcats: labels, y: [0, 1.1], h: 260, grid: 'y', xlabel: 'bit position (sign, exponent e7…e0, mantissa m6…m0)', ylabel: 'bits of information', label: 'Entropy of each bit of a BF16 temperature' });
    bars(P, Hb, { colors: i => (i === 0 ? series(6) : i < 9 ? series(0) : series(1)), labels: v => fmt(v, 2), tip: (v, i) => `<b>bit ${labels[i]}</b><br>${fmt(v, 3)} bits: ${v < 0.05 ? 'always the same — free to predict' : v > 0.9 ? 'a coin flip — looks like noise' : 'partly predictable'}`, width: 22 });
    const joint = f => { const c = {}; month.forEach(v => { const k = f(SV.bf16(v).bits); c[k] = (c[k] || 0) + 1; }); return PK.entropy(Object.values(c)); };
    ro.set([['sign + exponent (9 bits), together', `${fmt(joint(b => b >> 7), 2)} bits`], ['mantissa (7 bits), together', `${fmt(joint(b => b & 127), 2)} bits`], ['the whole 16-bit pattern', `${fmt(joint(b => b), 2)} bits`], ['readings', `${month.length} (ten days, foot thermometer)`]]);
  };

  /* ==================================================================
     II.20 — the E4M3 grid and index space: residuals counted in steps
     ================================================================== */
  FIG.svIndexSpace = (host) => {
    const E = SV.e4m3Grid;
    const ZOOM = { s: 0.5, m: 16, l: 448 };
    let zoom = 's', x = 0.1, xh = -0.1;
    const box = h('div');
    const tiles = { x: kpi('value', '', '', 'var(--c)'), xh: kpi('prediction', '', '', series(2)), r: kpi('residual in E4M3 steps', '', ''), ri: kpi('same on an INT8 grid', '', '', series(0)) };
    const sz = seg([['s', 'zoom −0.5 … 0.5'], ['m', '−16 … 16'], ['l', 'all: −448 … 448']], zoom, v => { zoom = v; build(); }, 'Zoom');
    const preset = (a, b, z) => btn(`${a} vs ${b}`, () => { x = a; xh = b; zoom = z; sz.set(z); build(); }, { cls: 'sm' });
    host.append(controls(sz), controls(h('span', { class: 'fig-note', text: 'Try:' }), preset(12, 11, 'm'), preset(0.1, -0.1, 's'), preset(0.25, 0.2, 's'), preset(200, 100, 'l')),
      legend([['E4M3 grid points', series(1), 'dot'], ['INT8 grid with the same range', series(0), 'dot'], ['value (drag)', 'var(--c)', 'dot'], ['prediction (drag)', series(2), 'dot']]),
      box, h('div', { class: 'kpis' }, tiles.x, tiles.xh, tiles.r, tiles.ri));
    let P, kx, kh, gDyn;
    function build() {
      const Z = ZOOM[zoom];
      box.replaceChildren();
      P = Plot(box, { x: [-Z, Z], y: [0, 3], h: 220, grid: false, yticks: [], xlabel: 'value', m: { l: 92, r: 18, t: 14, b: 48 }, label: 'E4M3 and INT8 grid points with a value and its prediction' });
      [[2.2, 'E4M3', series(1)], [0.8, 'INT8', series(0)]].forEach(([y, name]) => {
        el('line', { x1: P.x(P.x0), x2: P.x(P.x1), y1: P.y(y), y2: P.y(y), style: 'stroke:var(--rule)' }, P.g.data);
        el('text', { x: P.m.l - 10 * P.fs, y: P.y(y) + 4 * P.fs, 'text-anchor': 'end', class: 'lbl', text: name }, P.g.axes);
      });
      for (let i = -126; i <= 126; i++) { const v = SV.e4m3FromIndex(i); if (Math.abs(v) <= Z) el('line', { x1: P.x(v), x2: P.x(v), y1: P.y(2.2) - 9 * P.fs, y2: P.y(2.2) + 9 * P.fs, style: `stroke:${series(1)};stroke-width:1;opacity:.7` }, P.g.data); }
      const sc = Z / 127;
      for (let k = -127; k <= 127; k++) el('line', { x1: P.x(k * sc), x2: P.x(k * sc), y1: P.y(0.8) - 9 * P.fs, y2: P.y(0.8) + 9 * P.fs, style: `stroke:${series(0)};stroke-width:1;opacity:.55` }, P.g.data);
      gDyn = el('g', {}, P.g.data);
      kh = el('circle', { class: 'handle sv-pred', r: 8 * P.fs }, P.g.top);
      kx = el('circle', { class: 'handle', r: 8 * P.fs }, P.g.top);
      const st = Z / 400;
      draggable(kx, P, ([v]) => { x = clamp(v, -Z, Z); draw(); }, null, { get: () => [x, 1.5], step: [st, 0], label: 'value' });
      draggable(kh, P, ([v]) => { xh = clamp(v, -Z, Z); draw(); }, null, { get: () => [xh, 1.5], step: [st, 0], label: 'prediction' });
      x = clamp(x, -Z, Z); xh = clamp(xh, -Z, Z);
      draw();
    }
    function draw() {
      const Z = ZOOM[zoom], sc = Z / 127;
      const qx = SV.e4m3Round(x), qh = SV.e4m3Round(xh), ix = SV.e4m3Index(qx), ih = SV.e4m3Index(qh);
      const kix = SV.int8Round(x, sc), kih = SV.int8Round(xh, sc);
      gDyn.replaceChildren();
      const lo = Math.min(qx, qh), hi = Math.max(qx, qh);
      el('rect', { x: P.x(lo), y: P.y(2.2) - 13 * P.fs, width: Math.max(1, P.x(hi) - P.x(lo)), height: 26 * P.fs, style: `fill:${mix('var(--c)', 18)}` }, gDyn);
      dot(gDyn, P.x(qx), P.y(2.2), 5 * P.fs, 'var(--c)'); dot(gDyn, P.x(qh), P.y(2.2), 5 * P.fs, series(2));
      dot(gDyn, P.x(kix * sc), P.y(0.8), 5 * P.fs, 'var(--c)'); dot(gDyn, P.x(kih * sc), P.y(0.8), 5 * P.fs, series(2));
      kx.setAttribute('cx', P.x(x)); kx.setAttribute('cy', P.y(1.5));
      kh.setAttribute('cx', P.x(xh)); kh.setAttribute('cy', P.y(1.5));
      const d = v => (Math.abs(v) < 0.1 && v !== 0 ? 5 : Math.abs(v) < 1 ? 4 : 3);
      tiles.x.set(fmt(qx, d(qx)), `index ${ix} · bits ${SV.e4m3Bits(qx).str}`);
      tiles.xh.set(fmt(qh, d(qh)), `index ${ih} · bits ${SV.e4m3Bits(qh).str}`);
      tiles.r.set(String(ix - ih), `value difference ${fmt(qx - qh, 4)}`);
      tiles.ri.set(String(kix - kih), `scale ${fmt(sc, 4)}: ${kix} − ${kih}`);
    }
    build();
  };

  /* ==================================================================
     II.21 — the forecaster's desk: an LRU (or FIFO) cache, step by step
     ================================================================== */
  FIG.svDeskSim = (host) => {
    const seq = SV.TRACES.storm;
    let slots = 4, policy = 'lru', st = null, at = 0;
    const holder = h('div'), ro = readout();
    host.append(controls(
      slider('desk slots', 2, 6, 1, slots, v => { slots = v; rebuild(); }),
      seg([['lru', 'LRU'], ['fifo', 'FIFO (first in, first out)']], policy, v => { policy = v; rebuild(); }, 'Eviction policy'),
    ), holder, ro);
    function rebuild() {
      at = st ? st.index : 0;
      holder.replaceChildren();
      const sim = SV.simulate(seq, slots, policy);
      const D = Diagram(holder, { w: 640, h: 330, grow: 0.5, label: 'The request list, the desk and the archive at one step' });
      const g = el('g', {}, D.svg);
      st = stepper(holder, {
        steps: sim.steps, start: Math.min(at, seq.length - 1),
        label: s => s.hit ? `<b>${SV.LOGBOOKS[s.id]}</b> is on the desk: a hit.` : `<b>${SV.LOGBOOKS[s.id]}</b> is not on the desk: a miss, fetched by the lift${s.evicted ? `; <b>${SV.LOGBOOKS[s.evicted]}</b> goes back down (${policy === 'lru' ? 'least recently used' : 'on the desk longest'})` : ''}.`,
        render(i, s) {
          g.replaceChildren();
          const fs = D.fs, bw = 44, gap = 8, x0 = 20;
          el('text', { x: x0, y: 22 * fs, class: 'lbl', text: 'requests' }, g);
          seq.forEach((id, k) => {
            const row = Math.floor(k / 12), col = k % 12, x = x0 + col * (bw + gap), y = 30 * fs + row * (bw * 0.85 + 6);
            const past = k < i, now = k === i, hit = sim.steps[k].hit;
            const fill = now ? 'var(--c)' : past ? mix(hit ? 'var(--good)' : 'var(--bad)', 30) : 'var(--paper)';
            el('rect', { x, y, width: bw, height: bw * 0.8, rx: 6, style: `fill:${fill};stroke:var(--rule);opacity:${k > i ? 0.55 : 1}` }, g);
            el('text', { x: x + bw / 2, y: y + bw * 0.52, 'text-anchor': 'middle', class: 'mono', style: `fill:${now ? 'var(--paper-3)' : 'var(--ink)'};font-weight:600`, text: id }, g);
          });
          const yd = 30 * fs + 2 * (bw * 0.85 + 6) + 24 * fs;
          el('text', { x: x0, y: yd, class: 'lbl', text: `desk (${slots} slots)` }, g);
          const sw = Math.min(96, (600 - x0) / slots - 10);
          // the next victim, if a miss happened now with a full desk
          const desk = s.desk;
          let victim = null;
          if (desk.length >= slots) victim = policy === 'lru' ? desk.reduce((a, b) => (b.last < a.last ? b : a)) : desk.reduce((a, b) => (b.added < a.added ? b : a));
          for (let k = 0; k < slots; k++) {
            const o = desk[k], x = x0 + k * (sw + 10), y = yd + 10 * fs;
            const fresh = o && o.id === s.id;
            el('rect', { x, y, width: sw, height: 54 * fs, rx: 8, style: `fill:${fresh ? (s.hit ? mix('var(--good)', 55) : mix('var(--c)', 55)) : 'var(--paper)'};stroke:${o && victim === o ? 'var(--ink-2)' : 'var(--rule)'};stroke-dasharray:${o && victim === o ? '5 4' : 'none'}` }, g);
            if (o) {
              el('text', { x: x + sw / 2, y: y + 24 * fs, 'text-anchor': 'middle', class: 'mono', style: 'fill:var(--ink);font-weight:600', text: o.id }, g);
              el('text', { x: x + sw / 2, y: y + 44 * fs, 'text-anchor': 'middle', class: 'annot', text: policy === 'lru' ? `used ${s.t - o.last === 0 ? 'now' : s.t - o.last + ' ago'}` : `came ${s.t - o.added === 0 ? 'now' : s.t - o.added + ' ago'}` }, g);
            }
          }
          const ya = yd + 10 * fs + 54 * fs + 30 * fs;
          el('text', { x: x0, y: ya, class: 'lbl', text: 'archive' }, g);
          Object.keys(SV.LOGBOOKS).forEach((id, k) => {
            const x = x0 + 70 * fs + k * 34 * fs, on = desk.some(o => o.id === id);
            el('text', { x, y: ya, class: 'mono', style: `fill:var(--ink-3);opacity:${on ? 0.35 : 1}`, text: id }, g);
          });
          const done = sim.steps.slice(0, i + 1), miss = done.filter(z => !z.hit).length;
          ro.set([['requests so far', String(i + 1)], ['hits', String(i + 1 - miss)], ['misses', String(miss)], ['miss rate', fmtPct(miss / (i + 1), 0)], ['whole morning', `${sim.misses} misses of ${seq.length} (${fmtPct(sim.rate, 0)})`]]);
        },
      });
    }
    rebuild();
  };

  /* ==================================================================
     II.22 — reuse distances, their histogram and the miss-rate curve
     ================================================================== */
  FIG.svReuse = (host) => {
    let trace = 'storm', B = 4;
    const top = h('div'), row = h('div', { class: 'fig-row' }), hb = h('div'), cb = h('div'), ro = readout();
    host.append(controls(
      seg([['storm', 'storm morning'], ['sweep', 'round-robin sweep'], ['random', 'random']], trace, v => { trace = v; draw(); }, 'Request list'),
      slider(texify('desk slots $\\vB$'), 1, 8, 1, B, v => { B = v; draw(); }),
    ), top, legend([['LRU, read off the reuse distances', series(0), 'line'], ['LRU, simulated', series(0), 'dot'], ['Bélády (clairvoyant)', series(4), 'dash'], ['FIFO, simulated', series(3), 'dot']]), row, ro);
    row.append(hb, cb);
    const D = Diagram(top, { w: 640, h: 150, grow: 0.6, label: 'Each request with its reuse distance' });
    const g = el('g', {}, D.svg);
    const PH = Plot(hb, { xcats: ['0', '1', '2', '3', '4', '5', '6', '7', '∞'], y: [0, 20], h: 300, grid: 'y', xlabel: 'reuse distance', ylabel: 'requests', label: 'Histogram of reuse distances' });
    const PC = Plot(cb, { x: [0.5, 8.5], y: [0, 1.05], h: 300, xticks: [1, 2, 3, 4, 5, 6, 7, 8], xlabel: 'desk slots B', ylabel: 'miss rate m(B)', yfmt: v => fmtPct(v, 0), label: 'Miss rate against desk size' });
    function draw() {
      const seq = SV.TRACES[trace], rd = SV.reuseDistances(seq);
      g.replaceChildren();
      const fs = D.fs, bw = 44, gap = 8, x0 = 20;
      seq.forEach((id, k) => {
        const r = Math.floor(k / 12), c = k % 12, x = x0 + c * (bw + gap), y = 10 + r * (bw * 0.8 + 26 * fs);
        const miss = rd[k] >= B;
        el('rect', { x, y, width: bw, height: bw * 0.7, rx: 6, style: `fill:${mix(miss ? 'var(--bad)' : 'var(--good)', 26)};stroke:var(--rule)` }, g);
        el('text', { x: x + bw / 2, y: y + bw * 0.47, 'text-anchor': 'middle', class: 'mono', style: 'fill:var(--ink);font-weight:600', text: id }, g);
        el('text', { x: x + bw / 2, y: y + bw * 0.7 + 17 * fs, 'text-anchor': 'middle', class: 'val', text: rd[k] === Infinity ? '∞' : String(rd[k]) }, g);
      });
      const counts = new Array(9).fill(0);
      rd.forEach(v => { counts[v === Infinity ? 8 : Math.min(v, 7)]++; });
      PH.clear();
      bars(PH, counts, { colors: i => (i >= B ? mix('var(--bad)', 70) : mix('var(--good)', 70)), labels: v => (v ? String(v) : ''), tip: (v, i) => `<b>distance ${i === 8 ? '∞ (first request)' : i}</b><br>${v} request${v === 1 ? '' : 's'}: ${i >= B ? 'miss' : 'hit'} with ${B} slots` });
      const Bs = [1, 2, 3, 4, 5, 6, 7, 8];
      const fromRd = Bs.map(b => [b, rd.filter(v => v >= b).length / seq.length]);
      PC.clear();
      rule(PC, { x: B, label: `B = ${B}`, color: 'var(--c)' });
      line(PC, fromRd, { color: series(0), curve: 'linear' });
      const lru = Bs.map(b => [b, SV.simulate(seq, b, 'lru').rate]), opt = Bs.map(b => [b, SV.simulate(seq, b, 'opt').rate]), fifo = Bs.map(b => [b, SV.simulate(seq, b, 'fifo').rate]);
      line(PC, opt, { color: series(4), dash: true, markers: 3.5, tip: p => `Bélády, B = ${p[0]}: ${fmtPct(p[1], 0)}` });
      fifo.forEach(([b, m]) => dot(PC.g.data, PC.x(b) + 7 * PC.fs, PC.y(m), 3.6 * PC.fs, series(3)));
      lru.forEach(([b, m]) => dot(PC.g.data, PC.x(b), PC.y(m), 4.6 * PC.fs, series(0)));
      const at = b => SV.simulate(seq, b, 'lru');
      ro.set([['reuse distance ≥ B', `${rd.filter(v => v >= B).length} of ${seq.length} requests`], [`LRU with ${B} slots`, `${at(B).misses} misses (${fmtPct(at(B).rate, 0)})`], ['Bélády', `${SV.simulate(seq, B, 'opt').misses} misses`], ['FIFO', `${SV.simulate(seq, B, 'fifo').misses} misses`], ['first requests (∞)', String(rd.filter(v => v === Infinity).length)]]);
    }
    draw();
  };

  /* ==================================================================
     II.23 — bandwidth and latency: effective speed against read size
     ================================================================== */
  FIG.svWires = (host) => {
    const LINKS = [
      { name: 'HBM (H200)', bw: 4.8e12, lat: 0.5e-6, color: series(5) },
      { name: 'PCIe Gen5 ×16, in practice', bw: 50e9, lat: 1e-6, color: series(1) },
    ];
    let infl = 64, size = 1024;
    const box = h('div'), ro = readout();
    const lbl = b => (b >= 1 << 20 ? `${b / (1 << 20)} MiB` : b >= 1024 ? `${b / 1024} KiB` : `${b} B`);
    host.append(controls(
      slider('reads in flight', 0, 12, 1, Math.log2(infl), v => { infl = 2 ** v; draw(); }, v => String(2 ** v)),
      slider('size of each read', 6, 24, 1, Math.log2(size), v => { size = 2 ** v; draw(); }, v => lbl(2 ** v)),
    ), legend(LINKS.map(l => [l.name, l.color])), box, ro);
    const P = Plot(box, { x: [64, 2 ** 24], xlog: 2, y: [1e5, 1e13], ylog: 10, h: 360, xlabel: 'size of each read (bytes)', ylabel: 'bytes per second delivered', xticks: [64, 1024, 16384, 262144, 4194304], xfmt: lbl, yfmt: v => (v >= 1e12 ? `${v / 1e12} TB/s` : v >= 1e9 ? `${v / 1e9} GB/s` : v >= 1e6 ? `${v / 1e6} MB/s` : `${v / 1e3} KB/s`), yticks: [1e6, 1e8, 1e10, 1e12], label: 'Delivered bandwidth against read size' });
    const thr = (l, s) => Math.min(l.bw, infl * s / (l.lat + s / l.bw));
    function draw() {
      P.clear();
      const xs = []; for (let e = 6; e <= 24; e += 0.25) xs.push(2 ** e);
      LINKS.forEach(l => {
        rule(P, { y: l.bw, label: `${l.name}: peak`, color: l.color });
        line(P, xs.map(s => [s, thr(l, s)]), { color: l.color, width: 2.6 });
        dot(P.g.data, P.x(size), P.y(thr(l, size)), 5 * P.fs, l.color);
      });
      rule(P, { x: size, color: 'var(--c)', label: lbl(size) });
      const [hb, pc] = LINKS.map(l => thr(l, size));
      const f = v => (v >= 1e12 ? `${fmt(v / 1e12, 2)} TB/s` : v >= 1e9 ? `${fmt(v / 1e9, 1)} GB/s` : `${fmt(v / 1e6, 1)} MB/s`);
      ro.set([['HBM delivers', `${f(hb)} (${fmtPct(hb / LINKS[0].bw, 0)} of peak)`], ['PCIe delivers', `${f(pc)} (${fmtPct(pc / LINKS[1].bw, 0)} of peak)`], ['ratio', `${fmt(hb / pc, 0)}×`]]);
    }
    draw();
  };

  /* ==================================================================
     II.24 — amortization: a fixed cost spread over n items, and break-even
     ================================================================== */
  FIG.svAmortize = (host) => {
    const PRE = {
      ferry: { label: 'ferry season ticket', fixed: 300, save: 12, unit: 'crowns', item: 'trips', what: 'price per trip' },
      means: { label: 'channel means (II.13)', fixed: 45, save: 24, unit: 'bits', item: 'readings', what: 'bits per reading' },
      codebook: { label: 'regime codebook (II.17)', fixed: 96, save: 2.92, unit: 'bits', item: 'readings', what: 'bits per reading' },
    };
    let pre = 'ferry', o = { ...PRE.ferry };
    const box = h('div'), ro = readout();
    const sF = slider('fixed cost', 0, 4, 0.01, Math.log10(o.fixed), v => { o.fixed = +(10 ** v).toPrecision(3); draw(); }, v => fmt(10 ** v, 10 ** v < 10 ? 1 : 0));
    const sS = slider('saving per item', -1, 2, 0.01, Math.log10(o.save), v => { o.save = +(10 ** v).toPrecision(3); draw(); }, v => fmt(10 ** v, 10 ** v < 10 ? 2 : 0));
    host.append(controls(seg(Object.entries(PRE).map(([k, p]) => [k, p.label]), pre, v => { pre = v; o = { ...PRE[v] }; sF.set(Math.log10(o.fixed)); sS.set(Math.log10(o.save)); draw(); }, 'Example')), controls(sF, sS),
      legend([['fixed cost per item = fixed ÷ items', series(1)], ['saving per item', series(5), 'dash'], ['profit region', series(5), 'band']]), box, ro);
    const P = Plot(box, { x: [1, 1e4], xlog: 10, y: [1e-2, 1e4], ylog: 10, h: 340, xlabel: 'number of items sharing the fixed cost', ylabel: 'cost per item', label: 'Fixed cost per item against the number of items, with the saving per item' });
    function draw() {
      P.clear();
      const ns = []; for (let e = 0; e <= 4; e += 0.05) ns.push(10 ** e);
      const be = o.fixed / o.save;
      area(P, ns.filter(n => n >= be).map(n => [n, o.fixed / n, o.save]), { color: series(5), opacity: 0.16 });
      line(P, ns.map(n => [n, o.fixed / n]), { color: series(1), width: 2.6 });
      line(P, [[1, o.save], [1e4, o.save]], { color: series(5), dash: true });
      if (be >= 1 && be <= 1e4) { rule(P, { x: be, label: `break-even ≈ ${fmt(be, be < 10 ? 1 : 0)} ${o.item}`, color: 'var(--c)' }); dot(P.g.top, P.x(be), P.y(o.save), 6 * P.fs, 'var(--c)'); }
      P.opts.ylabel = `${o.what.split(' per ')[0]} per ${o.item.replace(/s$/, '')} (${o.unit})`;
      P.drawAxes();
      const at = n => o.fixed / n - o.save;
      ro.set([['fixed cost', `${fmt(o.fixed, 0)} ${o.unit}`], ['saving per item', `${fmt(o.save, 2)} ${o.unit}`], ['break-even', `${fmt(be, 1)} ${o.item}`], [`net after 10 ${o.item}`, `${fmt(-at(10) * 10, 0)} ${o.unit}`], [`net after 1000`, `${fmt(-at(1000) * 1000, 0)} ${o.unit}`]]);
    }
    draw();
  };
})();
