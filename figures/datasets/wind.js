// Gull Rock wind: 1,024 half-hourly wind speeds in whole knots (three weeks).
// The values are drawn exactly as before (seed 'si-wind': a Rayleigh breeze with scale 8 kn, plus 2.5 % gales
// of 40–59 kn), so every histogram number in the prose is unchanged. They are then put in a believable order:
// a slow weather wander, an afternoon sea breeze and three storms, matched rank for rank to the values.
(function () {
  const N = 1024;
  const BEAUFORT = [[1, 'calm'], [4, 'light air'], [7, 'light breeze'], [11, 'gentle breeze'], [17, 'moderate breeze'],
    [22, 'fresh breeze'], [28, 'strong breeze'], [34, 'near gale'], [41, 'gale'], [48, 'strong gale'], [56, 'storm'], [999, 'violent storm']];
  const beaufort = kn => BEAUFORT.find(([lim]) => kn < lim)[1];
  const hhmm = i => `${String(Math.floor((i % 48) / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;

  DS.define('wind', {
    rows() {
      const r = rng('si-wind');
      const vals = range(N).map(() => (r() < 0.025 ? r.int(40, 60) : Math.round(8 * Math.sqrt(-2 * Math.log(1 - r())))));
      const q = rng('ds-wind-order'), storms = [[230, 7], [610, 5], [905, 6]];   // [reading at the peak, half-width in readings]
      let w = 0;
      const latent = range(N).map(i => {
        w = 0.97 * w + q.normal(0, 0.35);
        const hour = (i / 2) % 24;
        const storm = storms.reduce((a, [at, s]) => a + 9 * Math.exp(-0.5 * ((i - at) / s) ** 2), 0);
        return w + 0.8 * Math.cos(2 * Math.PI * (hour - 15) / 24) + storm + q.normal(0, 0.55);
      });
      const order = range(N).sort((a, b) => latent[a] - latent[b]);
      const sorted = vals.slice().sort((a, b) => a - b), kn = new Array(N);
      order.forEach((i, k) => { kn[i] = sorted[k]; });
      return kn.map((v, i) => ({ day: Math.floor(i / 48) + 1, time: hhmm(i), t: i / 48, kn: v, force: beaufort(v) }));
    },
    columns: [
      { key: 'day', label: 'day' },
      { key: 'time', label: 'time' },
      { key: 'kn', label: 'knots' },
      { key: 'force', label: 'Beaufort name', left: true },
    ],
    csvColumns: ['day', 'time', 'kn'],
    highlights: {
      gales: { label: 'gales (≥ 40 kn)', test: r => r.kn >= 40 },
      over30: { label: '> 30 kn', test: r => r.kn > 30 },
      over14: { label: '> 14 kn', test: r => r.kn > 14 },
    },
    views: {
      timeline: DS.views.timeline({
        x: 't', y: 'kn', xlabel: 'day', ylabel: 'wind (knots)', xname: 'day', width: 1.2,
        xfmt: v => `${Math.floor(v) + 1}, ${hhmm(Math.round(v * 48))}`, yfmt: v => `${fmt(v, 0)} kn`,
        xticks: [0, 7, 14, 21], xtfmt: v => `day ${v + 1}`, ydomain: [0, 62], label: 'Three weeks',
      }),
      histogram: DS.views.histogram({ key: 'kn', xlabel: 'wind speed (knots)', ylabel: 'readings', unit: 'kn', noun: 'readings', domain: [0, 64], xticks: [0, 10, 20, 30, 40, 50, 60], label: 'How often each speed' }),
    },
    metrics: [
      { id: 'n', label: 'readings', value: rows => rows.length, fmt: v => v.toLocaleString('en-US'), note: v => `One every 30 minutes for ${fmt(v / 48, 1)} days.` },
      { id: 'median', label: 'median', short: 'median', mark: 'kn', value: rows => quantile(rows.map(r => r.kn), 0.5), fmt: v => `${fmt(v)} kn`,
        note: v => `Half of all readings are at or below ${fmt(v)} knots: a gentle breeze is the typical day at Gull Rock.` },
      { id: 'mean', label: 'mean', tex: '\\bar{x}', mark: 'kn', short: 'mean', value: rows => mean(rows.map(r => r.kn)), fmt: v => `${fmt(v, 1)} kn`,
        note: (v, rows) => `Above the median (${fmt(quantile(rows.map(r => r.kn), 0.5))} kn): the few gales drag the average up. The mean listens to the rare giants; the median does not.` },
      { id: 'p95', label: '95th percentile', short: '95 %', mark: 'kn', value: rows => quantile(rows.map(r => r.kn), 0.95), fmt: v => `${fmt(v)} kn`,
        note: v => `19 readings in 20 are ${fmt(v)} knots or less — comfortably inside a 5-bit slot (0–30).` },
      { id: 'max', label: 'maximum', value: rows => Math.max(...rows.map(r => r.kn)), fmt: v => `${fmt(v)} kn`,
        note: v => `The worst gust of the three weeks. A slot wide enough for it needs ${Math.ceil(Math.log2(v + 2))} bits — paid by every reading.` },
      { id: 'gales', label: 'gales (40 kn and up)', value: rows => rows.filter(r => r.kn >= 40).length, fmt: (v, rows) => `${v} · ${fmtPct(v / rows.length, 1)}`,
        note: 'Rare, but they arrive together: three storms of a few hours each. Rare and huge is exactly what an escape is for.' },
      { id: 'fit5', label: 'fit in 5 bits (0–30 kn)', value: rows => rows.filter(r => r.kn <= 30).length / rows.length, fmt: v => fmtPct(v, 1),
        note: 'Share of readings a 5-bit slot holds directly, with code 31 reserved as the escape marker.' },
      { id: 'entropy', label: 'entropy of the histogram', tex: '\\vH', value: rows => { const c = new Map(); rows.forEach(r => c.set(r.kn, (c.get(r.kn) || 0) + 1)); return entropy([...c.values()]); },
        fmt: v => `${fmt(v, 2)} bits`, note: 'The floor for any code that treats readings one at a time, from how often each speed occurs. A raw byte spends 8 bits.' },
    ],
    code: `
import numpy as np, pandas as pd

wind = pd.read_csv("{csv}")            # columns: day, time, kn
kn = wind["kn"].to_numpy()

print(len(kn), "readings")
print("median", np.median(kn), "kn;  mean", kn.mean().round(1), "kn")
print("95th percentile", np.percentile(kn, 95), "kn;  max", kn.max(), "kn")
print("gales (>= 40 kn):", (kn >= 40).sum())
print("fit in 5 bits (0-30 kn):", (kn <= 30).mean().round(3))

p = np.bincount(kn) / len(kn)         # histogram -> probabilities
p = p[p > 0]
print("entropy:", -(p * np.log2(p)).sum().round(2), "bits per reading")
`,
  });
})();
