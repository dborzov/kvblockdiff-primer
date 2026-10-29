// Ten days of Gull Rock readings: 480 vectors (one every 30 minutes), five channels each.
// The cloud of II.14–II.18: two thermometers that agree, humidity that falls as it warms,
// wind that rises as the pressure falls. Generated exactly as before (seed 'sv-month'), so every
// number quoted on those pages is unchanged. Derived datasets: thermo-axes (II.15), ten-days-bf16 (II.19).
(function () {
  const r1 = (v, d) => +v.toFixed(d);
  const CH = [
    { key: 'low', name: 'temperature, foot of mast', short: 'foot', unit: '°C', dec: 1, s: 0 },
    { key: 'mast', name: 'temperature, top of mast', short: 'top', unit: '°C', dec: 1, s: 3 },
    { key: 'hum', name: 'humidity', short: 'humidity', unit: '', dec: 2, s: 2 },
    { key: 'pres', name: 'pressure', short: 'pressure', unit: 'hPa', dec: 1, s: 4 },
    { key: 'wind', name: 'wind', short: 'wind', unit: 'kn', dec: 0, s: 5 },
  ];
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const HL = series(1);
  const hhmm = i => `${String(Math.floor((i % 48) / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
  // the six readings of the table that opens II.14: [day, reading of that day]
  const TABLE = [[1, 40], [3, 24], [4, 16], [6, 40], [8, 24], [10, 8]].map(([d, k]) => (d - 1) * 48 + k);

  const col = (rows, k) => rows.map(r => r[k]);
  const cov = (a, b) => { const ma = mean(a), mb = mean(b); return mean(a.map((v, i) => (v - ma) * (b[i] - mb))); };
  const corr = (rows, a, b) => { const x = col(rows, a), y = col(rows, b); return cov(x, y) / Math.sqrt(cov(x, x) * cov(y, y)); };

  // Small multiples over the ten days: one strip per channel (the thermometers share one), each on its own scale.
  function strips(box, ctx, o) {
    const rows = ctx.rows, n = rows.length;
    const D = Diagram(box, { w: 640, h: 400, label: o.title });
    const fs = D.fs, L = 12, R = 628, g = el('g', {}, D.svg);
    const X = i => L + 6 + (R - L - 12) * i / (n - 1);
    let y = 4;
    const bands = [];
    o.strips.forEach(s => {
      const vals = rows.flatMap(r => s.keys.map(k => r[k]));
      const [a, b] = extent(vals), pad = (b - a) * 0.1 || 1, lo = a - pad, hi = b + pad;
      el('text', { x: L, y: y + 12 * fs, class: 'lbl', text: s.label }, g);
      el('text', { x: R, y: y + 12 * fs, 'text-anchor': 'end', class: 'val', text: `${s.fmt(a)} … ${s.fmt(b)}${s.unit ? ' ' + s.unit : ''}` }, g);
      y += 18 * fs;
      const top = y, hh = (s.h || 52) * (1 + (fs - 1) * 0.5);
      const Y = v => top + hh - (v - lo) / (hi - lo) * hh;
      el('rect', { x: L, y: top, width: R - L, height: hh, rx: 4, style: `fill:${mix('var(--ink)', 4)};stroke:${mix('var(--rule)', 60)}` }, g);
      for (let d = 1; d < 10; d++) el('line', { x1: X(d * 48), x2: X(d * 48), y1: top, y2: top + hh, style: `stroke:${mix('var(--rule)', 55)};stroke-width:1` }, g);
      s.keys.forEach((k, j) => el('path', { d: rows.map((r, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(r[k]).toFixed(1)}`).join(''), style: `fill:none;stroke:${s.colors[j]};stroke-width:1.3;stroke-linejoin:round;opacity:.9` }, g));
      bands.push({ Y, s });
      y = top + hh + 8 * fs;
    });
    for (let d = 0; d < 10; d++) el('text', { x: X(d * 48 + 24), y: y + 8 * fs, 'text-anchor': 'middle', class: 'val', text: fs > 1.3 ? String(d + 1) : `day ${d + 1}` }, g);
    const H = y + 18 * fs;
    D.svg.setAttribute('viewBox', `0 0 640 ${H}`);
    const gm = el('g', {}, D.svg);
    rows.forEach((r, i) => {
      if (ctx.sel && ctx.sel.test(r)) el('line', { x1: X(i), x2: X(i), y1: 18 * fs, y2: y, style: `stroke:${mix('var(--c)', 45)};stroke-width:2` }, gm);
      if (ctx.hl && ctx.hl.test(r)) bands.forEach(b => b.s.keys.forEach(k => dot(gm, X(i), b.Y(r[k]), 3.4 * fs, HL)));
    });
    const guide = el('line', { y1: 18 * fs, y2: y, style: 'stroke:var(--ink-2);stroke-width:1;stroke-dasharray:3 3', visibility: 'hidden' }, D.svg);
    const hit = el('rect', { x: L, y: 0, width: R - L, height: H, class: 'hit', tabindex: 0, role: 'button', 'aria-label': 'Read one reading (one vertical slice) as a vector' }, D.svg);
    let cur = 0;
    const at = e => {
      if (e && e.clientX != null) { const bb = D.svg.getBoundingClientRect(); cur = clamp(Math.round(((e.clientX - bb.left) / bb.width * 640 - L - 6) / (R - L - 12) * (n - 1)), 0, n - 1); }
      guide.setAttribute('x1', X(cur)); guide.setAttribute('x2', X(cur)); guide.setAttribute('visibility', 'visible');
      return cur;
    };
    const tip = r => `<b>day ${r.day}, ${r.time}</b> — one vector<br>` + CH.map((c, j) => `${tex('\\vx_' + j)} = ${r[c.key].toFixed(c.dec)} ${c.unit}`).join('<br>');
    hover(hit, e => tip(rows[at(e)]) + '<br><span class="small">click to select this reading</span>');
    hit.addEventListener('pointerleave', () => guide.setAttribute('visibility', 'hidden'));
    const pick = () => { const r = rows[cur]; ctx.select({ label: `day ${r.day}, ${r.time}`, test: q => q === r }); };
    hit.addEventListener('click', e => { at(e); pick(); });
    hit.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); cur = clamp(cur + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 48 : 1), 0, n - 1); at(); showTip(hit, tip(rows[cur])); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
    });
  }

  const pairView = (a, b, label, extra) => DS.views.scatter({
    x: a.key, y: b.key, label, r: 2.2, h: 330,
    xlabel: `${a.name}${a.unit ? ' (' + a.unit + ')' : ''}`, ylabel: `${b.name}${b.unit ? ' (' + b.unit + ')' : ''}`,
    tip: r => `<b>day ${r.day}, ${r.time}</b><br>${a.short} ${r[a.key].toFixed(a.dec)} ${a.unit}<br>${b.short} ${r[b.key].toFixed(b.dec)} ${b.unit}`,
    after(P, ctx) {
      const ma = mean(col(ctx.rows, a.key)), mb = mean(col(ctx.rows, b.key));
      rule(P, { x: ma, color: 'var(--ink-3)' }); rule(P, { y: mb, label: 'means', color: 'var(--ink-3)' });
      if (extra) extra(P, ctx, ma, mb);
    },
  });

  DS.define('ten-days', {
    rows() {
      const r = rng('sv-month');
      let anom = 0, pres = 1012;
      return range(480).map(i => {
        const hour = (i * 0.5) % 24;
        anom = 0.985 * anom + 0.36 * r.normal();                 // slow weather anomaly, σ ≈ 2 °C
        pres = 1012 + 0.99 * (pres - 1012) + 1.1 * r.normal();   // slow pressure swings
        const air = 11 + 1.2 * Math.sin(2 * Math.PI * (hour - 9) / 24) + anom;
        const low = r1(air + r.normal(0, 0.15), 1);
        const mast = r1(air - 0.6 + r.normal(0, 0.15), 1);
        const hum = r1(Math.min(1, Math.max(0.4, 0.82 - 0.02 * (air - 11) + r.normal(0, 0.03))), 2);
        const p = r1(pres, 1);
        const wind = Math.max(0, Math.round(14 - 0.6 * (pres - 1012) + r.normal(0, 4)));
        return { i, day: Math.floor(i / 48) + 1, time: hhmm(i), t: i / 48, low, mast, hum, pres: p, wind };
      });
    },
    columns: [
      { key: 'day', label: 'day' }, { key: 'time', label: 'time' },
      ...CH.map((c, j) => ({ key: c.key, label: `${j}: ${c.short}${c.unit ? ' (' + c.unit + ')' : ''}`, fmt: v => v.toFixed(c.dec) })),
    ],
    csvColumns: ['day', 'time', 'low', 'mast', 'hum', 'pres', 'wind'],
    highlights: {
      table: { label: 'the six readings of the table (II.14)', test: r => TABLE.includes(r.i) },
      windy: { label: 'wind ≥ 25 kn', test: r => r.wind >= 25 },
    },
    views: {
      days: {
        label: 'Ten days',
        draw(box, ctx) {
          box.append(legend([['foot of mast', series(0)], ['top of mast', series(3)], ['humidity', series(2)], ['pressure', series(4)], ['wind', series(5)]]));
          const b = h('div'); box.append(b);
          strips(b, ctx, {
            title: 'Ten days of the five channels, each strip on its own scale',
            strips: [
              { keys: ['low', 'mast'], colors: [series(0), series(3)], label: 'channels 0 and 1 · the two thermometers', unit: '°C', fmt: v => v.toFixed(1), h: 70 },
              { keys: ['hum'], colors: [series(2)], label: 'channel 2 · humidity', unit: '', fmt: v => v.toFixed(2) },
              { keys: ['pres'], colors: [series(4)], label: 'channel 3 · pressure', unit: 'hPa', fmt: v => v.toFixed(1) },
              { keys: ['wind'], colors: [series(5)], label: 'channel 4 · wind', unit: 'kn', fmt: v => v.toFixed(0) },
            ],
          });
          b.append(h('p', { class: 'fig-note', text: 'Each strip is one channel on its own scale; a vertical slice through all of them is one reading (hover or tap to read it, click to select it). The two thermometer lines are almost one line.' }));
        },
      },
      thermo: pairView(CH[0], CH[1], 'Foot vs top', (P, ctx, ma, mb) => {
        const d = mb - ma;
        line(P, [[P.x0, P.x0 + d], [P.x1, P.x1 + d]], { color: 'var(--ink-2)', dash: '6 4', width: 1.2 });
        annotate(P, ma + 2.2, ma + 2.2 + d, `top = foot ${d < 0 ? '−' : '+'} ${fmt(Math.abs(d), 2)} °C`, { dx: -70, dy: -46 });
      }),
      humid: pairView(CH[0], CH[2], 'Temperature vs humidity'),
      storm: pairView(CH[3], CH[4], 'Pressure vs wind'),
    },
    metrics: [
      { id: 'n', label: 'readings', value: rows => rows.length, fmt: v => `${v} × 5`,
        note: v => `${fmt(v / 48, 0)} days, one reading every 30 minutes, five channels each: ${fmt(v * 5, 0)} numbers.` },
      { id: 'spread-thermo', label: 'spreads of the two thermometers', tex: '\\vsigma_0,\\ \\vsigma_1', value: rows => [Math.sqrt(variance(col(rows, 'low'))), Math.sqrt(variance(col(rows, 'mast')))],
        fmt: v => `${fmt(v[0], 2)} · ${fmt(v[1], 2)} °C`, note: 'Each thermometer wanders by about 1.7 °C either side of its mean as the weather comes and goes. On its own, each one costs bits.' },
      { id: 'diff', label: 'top − foot', value: rows => rows.map(r => r.mast - r.low), fmt: v => `${fmt(mean(v), 2)} ± ${fmt(Math.sqrt(variance(v)), 2)} °C`,
        note: (v, rows) => `The top of the mast is about ${fmt(-mean(v), 1)} °C colder, and that difference barely moves: its spread is ${fmt(Math.sqrt(variance(col(rows, 'low'))) / Math.sqrt(variance(v)), 0)} times smaller than either thermometer's. Knowing one thermometer pins the other to a few tenths.` },
      { id: 'cov-thermo', label: 'covariance of the thermometers', tex: '\\operatorname{cov}(\\vx_0, \\vx_1)', value: rows => cov(col(rows, 'low'), col(rows, 'mast')), fmt: v => `${fmt(v, 2)} °C²`,
        note: 'The average signed rectangle. Almost every reading is warm on both thermometers or cold on both, so nearly every rectangle counts as positive.' },
      { id: 'corr-thermo', label: 'correlation of the thermometers', value: rows => corr(rows, 'low', 'mast'), fmt: v => fmt(v, 3),
        note: v => `The covariance divided by the two spreads. ${fmt(v, 3)} is about as close to +1 as two real sensors get: each one has its own small noise, so never exactly 1.` },
      { id: 'bits-thermo', label: 'bits saved predicting top from foot', value: rows => { const c = corr(rows, 'low', 'mast'); return [c * c, 0.5 * Math.log2(1 / (1 - c * c))]; },
        fmt: v => `${fmt(v[1], 2)} bits`, note: v => `Correlation squared is the $\\vRsq$ of the best straight-line prediction: ${fmt(v[0], 3)}. The exchange rate of II.12 turns that into ${fmt(v[1], 2)} bits per reading on the top thermometer.` },
      { id: 'corr-temp-hum', label: 'correlation, temperature · humidity', value: rows => corr(rows, 'low', 'hum'), fmt: v => fmt(v, 2),
        note: v => `Negative: warm air at Gull Rock is drier air. Weaker than the thermometers, so worth less: $\\vRsq = ${fmt(v * v, 2)}$, about ${fmt(0.5 * Math.log2(1 / (1 - v * v)), 2)} bit.` },
      { id: 'corr-pres-wind', label: 'correlation, pressure · wind', value: rows => corr(rows, 'pres', 'wind'), fmt: v => fmt(v, 2),
        note: 'Negative: falling pressure brings wind. A storm is a low.' },
      { id: 'corr-temp-pres', label: 'correlation, temperature · pressure', value: rows => corr(rows, 'low', 'pres'), fmt: v => fmt(v, 2),
        note: 'Nearly zero: in this data the two ignore each other, and the positive and negative rectangles cancel.' },
      { id: 'variances', label: 'variances (the diagonal of $\\vSigma$)', value: rows => CH.map(c => variance(col(rows, c.key))),
        fmt: v => v.map(x => (x < 0.01 ? fmt(x, 4) : x < 10 ? fmt(x, 2) : fmt(x, 1))).join(' · '),
        note: 'Foot, top, humidity, pressure, wind, each in its own unit squared. The pressure’s 29.5 hPa² is fifteen thousand times the humidity’s 0.002: in raw units the big numbers drown the small ones.' },
    ],
    code: `
import numpy as np, pandas as pd

days = pd.read_csv("{csv}")                    # columns: day, time, low, mast, hum, pres, wind
X = days[["low", "mast", "hum", "pres", "wind"]]

print(len(X), "readings")
print("spreads:", X.std(ddof=0).round(2).to_dict())
diff = X["mast"] - X["low"]
print("top - foot:", diff.mean().round(2), "+/-", diff.std(ddof=0).round(2))

S = np.cov(X.to_numpy().T, bias=True)          # the covariance matrix (population)
R = np.corrcoef(X.to_numpy().T)                # the correlation matrix
print("cov(foot, top) =", S[0, 1].round(2))
print(np.round(R, 2))
r2 = R[0, 1] ** 2
print("R^2 =", r2.round(3), " bits saved:", (0.5 * np.log2(1 / (1 - r2))).round(2))
print("variances:", np.round(np.diag(S), 4))
`,
  });
})();
