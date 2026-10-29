// Gull Rock weather regimes: 300 readings of (wind, humidity) from three moods — calm, fog, storm.
// The lumpy cloud of II.17–II.18, where a codebook (VQ) beats a rotation. Generated exactly as before
// (seed 'sv-regimes', then shuffled), so every number quoted on those pages is unchanged.
(function () {
  const REG = [
    { name: 'calm', n: 140, wind: 8, hum: 70, sw: 2.2, sh: 3.0, s: 0 },
    { name: 'fog', n: 60, wind: 4, hum: 97, sw: 1.5, sh: 1.2, s: 2 },
    { name: 'storm', n: 100, wind: 34, hum: 90, sw: 3.5, sh: 2.5, s: 4 },
  ];
  const ORDER = REG.map(g => g.name);
  const catS = c => REG.find(g => g.name === c).s;
  // the eight readings of the table that opens II.17 (row numbers, in the table's order)
  const TABLE = [0, 1, 5, 3, 2, 12, 8, 17];
  const cov = (a, b) => { const ma = mean(a), mb = mean(b); return mean(a.map((v, i) => (v - ma) * (b[i] - mb))); };
  const corrOf = rows => { const x = rows.map(r => r.wind), y = rows.map(r => r.hum); return cov(x, y) / Math.sqrt(cov(x, x) * cov(y, y)); };

  DS.define('regimes', {
    rows() {
      const r = rng('sv-regimes');
      const pts = [];
      REG.forEach(g => { for (let i = 0; i < g.n; i++) pts.push({ wind: Math.max(0, Math.round(r.normal(g.wind, g.sw))), hum: Math.min(100, Math.round(r.normal(g.hum, g.sh))), regime: g.name }); });
      return r.shuffle(pts).map((p, i) => ({ i, ...p }));
    },
    columns: [{ key: 'wind', label: 'wind (kn)' }, { key: 'hum', label: 'humidity (%)' }, { key: 'regime', label: 'regime (true mood)', left: true }],
    csvColumns: ['wind', 'hum', 'regime'],
    highlights: {
      table: { label: 'the eight readings of the table', test: r => TABLE.includes(r.i) },
    },
    views: {
      scatter: DS.views.scatter({
        x: 'wind', y: 'hum', color: 'regime', catSeries: catS, label: 'Wind vs humidity', h: 340, r: 3,
        xdomain: [0, 46], ydomain: [56, 101], xlabel: 'wind speed (kn)', ylabel: 'humidity (%)',
        tip: r => `<b>reading ${r.i}</b><br>${r.wind} kn, ${r.hum} %<br>mood: ${r.regime}`,
        after(P, ctx) {
          if (ctx.hl) ctx.rows.filter(ctx.hl.test).forEach(r => dot(P.g.top, P.x(r.wind), P.y(r.hum), 4.6 * P.fs, series(1)));
          REG.forEach(g => {
            const m = ctx.rows.filter(r => r.regime === g.name);
            const cx = mean(m.map(r => r.wind)), cy = mean(m.map(r => r.hum)), s = 8 * P.fs, X = P.x(cx), Y = P.y(cy);
            el('path', { d: `M${X} ${Y - s}L${X + s} ${Y}L${X} ${Y + s}L${X - s} ${Y}Z`, style: `fill:${series(g.s)};stroke:var(--paper-3);stroke-width:${2.5 * P.fs}` }, P.g.top);
            el('text', { x: X + 12 * P.fs, y: Y + 4 * P.fs, class: 'lbl', text: g.name }, P.g.top);
          });
        },
      }),
      counts: DS.views.categories({ key: 'regime', order: ORDER, catSeries: (c) => catS(c), xlabel: 'regime', ylabel: 'readings', noun: 'readings', label: 'How many of each' }),
    },
    metrics: [
      { id: 'n', label: 'readings', value: rows => rows.length, note: 'Two numbers each: wind speed and humidity. The colours are the true moods the generator used; k-means will have to find them without being told.' },
      { id: 'counts', label: 'calm · fog · storm', value: rows => ORDER.map(c => rows.filter(r => r.regime === c).length), fmt: v => v.join(' · '),
        note: 'Calm days are the most common, fog the rarest. Rare moods still need a centroid of their own: one storm reading forced through the calm centroid would leave a huge residual.' },
      { id: 'centroids', label: 'centroids (wind kn, humidity %)', value: rows => ORDER.map(c => { const m = rows.filter(r => r.regime === c); return [mean(m.map(r => r.wind)), mean(m.map(r => r.hum))]; }),
        fmt: v => v.map(([a, b]) => `(${fmt(a, 1)}, ${fmt(b, 1)})`).join(' '),
        note: 'The average point of each mood — calm, fog, storm. None of them is an actual reading. These three pairs are the whole codebook: 6 numbers both ends keep.' },
      { id: 'corr', label: 'correlation, wind · humidity', value: corrOf, fmt: v => fmt(v, 2),
        note: v => `A modest ${fmt(v, 2)}: windy readings tend to be wetter, because storms are wet. But a straight line through three islands describes none of them.` },
      { id: 'klt', label: 'what a rotation (KLT) saves', value: rows => { const c = corrOf(rows); return -0.25 * Math.log2(1 - c * c); }, fmt: v => `${fmt(v, 2)} bit / element`,
        note: 'Standardized, the two eigenvalues are 1 ± the correlation, so the coding gain is ¼ log₂ 1/(1 − corr²). Almost nothing: a rotation cannot see islands.' },
    ],
    code: `
import numpy as np, pandas as pd

reg = pd.read_csv("{csv}")                       # columns: wind, hum, regime
print(reg["regime"].value_counts().to_dict())
print(reg.groupby("regime")[["wind", "hum"]].mean().round(1))   # the three centroids
r = np.corrcoef(reg["wind"], reg["hum"])[0, 1]
print("correlation:", round(r, 2), " KLT gain:", round(-0.25 * np.log2(1 - r * r), 2), "bit / element")
`,
  });
})();
