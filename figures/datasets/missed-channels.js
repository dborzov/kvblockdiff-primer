// Ten days at Gull Rock, channel by channel (VII.6, VII.15): how much of each channel's variance the reading half an hour
// before explains, and what that is worth in bits by the exchange rate. Derived: rows() reads DS.rows('ten-days').
// A channel whose previous reading is a worse guess than its mean (R² below zero) gets the flag "do not predict".
(function () {
  const CH = [
    { key: 'low', name: 'temperature, foot of mast', unit: '°C', s: 0 },
    { key: 'mast', name: 'temperature, top of mast', unit: '°C', s: 3 },
    { key: 'hum', name: 'humidity', unit: '', s: 2 },
    { key: 'pres', name: 'pressure', unit: 'hPa', s: 4 },
    { key: 'wind', name: 'wind', unit: 'kn', s: 5 },
  ];
  const exch = r2 => 0.5 * Math.log2(1 / (1 - r2));
  const avg = rows => mean(rows.map(r => r.used));
  const bitsAvg = rows => mean(rows.map(r => r.bits));

  DS.define('missed-channels', {
    rows() {
      const D = DS.rows('ten-days');
      return CH.map((c, j) => {
        const v = D.map(r => r[c.key]), d = v.slice(1).map((x, i) => x - v[i]);
        const r2 = 1 - variance(d) / variance(v), used = Math.max(0, r2);
        return { j, key: c.key, name: c.name, s: c.s, r2, used, predict: r2 > 0 ? 'yes' : 'no', bits: exch(used) };
      });
    },
    columns: [
      { key: 'j', label: 'channel' },
      { key: 'name', label: 'sensor', left: true },
      { key: 'r2', label: 'R² of “same as last time”', fmt: v => fmtPct(v, 1) },
      { key: 'predict', label: 'predict?' },
      { key: 'bits', label: 'bits saved', fmt: v => fmt(v, 2) },
    ],
    csvColumns: ['j', 'key', 'r2', 'predict', 'bits'],
    highlights: { giants: { label: 'slow channels (R² above 90 %)', test: r => r.r2 > 0.9 } },
    views: {
      bars: {
        label: 'Five channels',
        legend: 'hl',
        draw(box, ctx) {
          const rows = ctx.rows, A = avg(rows);
          const bx = h('div'); box.append(bx);
          const P = Plot(bx, { xcats: rows.map(r => ({ low: 'foot', mast: 'top' })[r.key] || r.name), y: [0, 1.12], h: 280, ylabel: 'variance explained (R²)', yfmt: v => fmtPct(v, 0), yticks: [0, 0.25, 0.5, 0.75, 1], grid: 'y',
            label: 'Variance explained by the previous reading, channel by channel' });
          bars(P, rows.map(r => r.used), {
            colors: i => (ctx.hl && ctx.hl.test(rows[i]) ? series(1) : series(rows[i].s)),
            labels: (v, i) => (rows[i].r2 > 0 ? `${fmt(rows[i].bits, 2)}${P.fs > 1.3 ? '' : ' bits'}` : ''),
            tip: (v, i) => `<b>${rows[i].name}</b><br>R² = ${fmtPct(rows[i].r2, 1)}${rows[i].r2 > 0 ? '' : ' (worse than the mean: flag “do not predict”)'}<br>saves ${fmt(rows[i].bits, 2)} bits per reading`,
          });
          rule(P, { y: A, label: `average ${fmtPct(A, 0)}`, color: 'var(--ink-2)' });
          rows.forEach((r, i) => { if (r.r2 <= 0) el('text', { x: P.x(i), y: P.y(0) - 8 * P.fs, 'text-anchor': 'middle', class: 'val', text: P.fs > 1.3 ? 'none' : 'not predicted' }, P.g.top); });
          box.append(h('p', { class: 'fig-note', text: 'Each bar is one channel of the ten days of II.14; the label above it is what the previous reading saves, in bits per reading, by the exchange rate. Foot and top are the two thermometers on the mast. Three channels drift slowly; humidity and wind jump about from one half-hour to the next.' }));
        },
      },
    },
    metrics: [
      { id: 'avg', label: 'average variance explained', tex: '\\vRsq', value: avg, fmt: v => fmtPct(v, 1),
        note: 'Over the five channels, with the wind counted as zero because it is left unpredicted.' },
      { id: 'even', label: 'bits if that average were spread evenly', value: rows => exch(avg(rows)), fmt: v => `${fmt(v, 2)} bits per element`,
        note: 'What the napkin would say from the average alone: every channel explaining the same share.' },
      { id: 'bits', label: 'bits actually saved, averaged over channels', value: bitsAvg, fmt: v => `${fmt(v, 2)} bits per element`,
        note: (v, rows) => `About ${fmt(v / exch(avg(rows)), 1)} times the even-spread figure. The exchange rate is steep near 100 %, so three slow channels at about 95 % are worth far more than five lukewarm ones.` },
      { id: 'flag', label: 'channels left unpredicted', value: rows => rows.filter(r => r.r2 <= 0).map(r => r.name), fmt: v => v.join(', ') || 'none',
        note: (v, rows) => `The wind's reading half an hour before is a worse guess than its average (R² = ${fmtPct(rows.find(r => r.key === 'wind').r2, 0)}), so its “predict or not” flag says no. Humidity is predicted, for almost nothing.` },
      { id: 'split', label: 'slow three · quick two', value: rows => [mean(rows.filter(r => r.r2 > 0.5).map(r => r.bits)), mean(rows.filter(r => r.r2 <= 0.5).map(r => r.bits))], fmt: v => `${fmt(v[0], 2)} · ${fmt(v[1], 2)} bits per element`,
        note: 'Split the vector in two and the whole saving sits in one half. If the quick half is the values of a KV entry, the entry’s average is held up by it, however well the keys do.' },
    ],
    code: `
import numpy as np, pandas as pd

days = pd.read_csv("gull-rock-ten-days.csv")   # the ten days of II.14: low, mast, hum, pres, wind
x = {c: days[c].to_numpy() for c in ["low", "mast", "hum", "pres", "wind"]}
r2 = {c: 1 - np.diff(v).var() / v.var() for c, v in x.items()}   # the guess "same as last time"
used = {c: max(0.0, v) for c, v in r2.items()}  # flag: a channel is predicted only if it helps
bits = {c: 0.5 * np.log2(1 / (1 - v)) for c, v in used.items()}
avg = np.mean(list(used.values()))
print({c: round(v, 3) for c, v in r2.items()})
print("even:", round(0.5 * np.log2(1 / (1 - avg)), 2), " per channel:", round(np.mean(list(bits.values())), 2))
`,
  });
})();
