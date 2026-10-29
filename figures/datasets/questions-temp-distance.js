// Framework A on the Gull Rock temperatures (VIII.2, VIII.5): for every distance Δ = 1 … 336 half-hours, how many bits
// per reading the reading Δ half-hours back saves. Derived from DS 'temp', so it changes whenever the temperatures do.
// Three columns of bits: the exchange-rate formula for the best straight-line predictor, the same predictor measured on
// exact integer residuals (histogram entropies), and the formula after shuffling the readings (the shuffle control).
(function () {
  const MAXD = 336;                                   // one week of half-hours
  const histH = vals => { const c = new Map(); vals.forEach(v => c.set(v, (c.get(v) || 0) + 1)); return entropy([...c.values()]); };
  const ex = r => 0.5 * Math.log2(1 / Math.max(1e-12, 1 - r * r));
  function corr(a, b) {
    const ma = mean(a), mb = mean(b);
    let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
    return { r: sab / Math.sqrt(saa * sbb), slope: sab / sbb, ma, mb };
  }
  const ago = d => {
    const hrs = d / 2, days = Math.floor(hrs / 24), rest = hrs - 24 * days;
    const hh = Math.floor(rest), mm = rest % 1 ? '30' : '00';
    if (!days) return hh ? `${hh} h ${mm === '30' ? '30' : ''}`.trim() : '30 min';
    return `${days} d${rest ? ` ${hh} h${mm === '30' ? ' 30' : ''}` : ''}`;
  };
  const at = (rows, d) => rows.find(r => r.d === d);
  const halfOf = rows => { const b1 = at(rows, 1).bits; return rows.find(r => r.bits <= b1 / 2); };
  const dip = rows => rows.filter(r => r.d <= 48).reduce((a, r) => (r.bits < a.bits ? r : a));

  /** Bits saved against distance, log scale, with the shuffled control and day marks. */
  const curve = {
    label: 'Bits against distance',
    legend: false,
    draw(box, ctx) {
      const rows = ctx.rows;
      box.append(legend([['formula: straight-line predictor', series(0)], ['measured on whole tenths', series(2), 'dot'], ['readings shuffled', 'var(--ink-3)', 'dash']]));
      const holder = h('div'); box.append(holder);
      const top = Math.ceil(Math.max(...rows.map(r => Math.max(r.bits, r.meas))) * 1.08 * 2) / 2;
      const P = Plot(holder, { x: [1, MAXD], xlog: 2, y: [0, top], h: 320, xticks: [1, 2, 4, 8, 16, 48, 96, 336], xfmt: v => ({ 48: '1 d', 96: '2 d', 336: '1 wk' }[v] || String(v)),
        xlabel: 'distance Δ back (half-hours)', ylabel: 'bits saved per reading', label: 'Bits a reading Δ half-hours back saves, against Δ' });
      [48, 96, 144, 192, 240, 288, 336].forEach(d => el('line', { x1: P.x(d), x2: P.x(d), y1: P.m.t, y2: P.m.t + P.ph, style: 'stroke:var(--rule);stroke-dasharray:2 4' }, P.g.bg));
      if (ctx.sel) rows.filter(r => ctx.sel.test(r)).forEach(r => el('rect', { x: P.x(r.d) - 1, y: P.m.t, width: 2, height: P.ph, style: 'fill:color-mix(in srgb, var(--c) 30%, transparent)' }, P.g.bg));
      line(P, rows.map(r => [r.d, r.sbits]), { color: 'var(--ink-3)', width: 1.6, dash: true, name: 'shuffled' });
      line(P, rows.map(r => [r.d, r.meas]), { color: series(2), width: 1.1, name: 'measured' });
      line(P, rows.map(r => [r.d, r.bits]), { color: series(0), width: 2.4, name: 'formula' });
      if (ctx.hl) rows.filter(r => ctx.hl.test(r)).forEach(r => dot(P.g.data, P.x(r.d), P.y(r.bits), 3.6 * P.fs, series(1)));
      const hf = halfOf(rows), dp = dip(rows), day = at(rows, 48);
      rule(P, { x: hf.d, label: `halved by Δ = ${hf.d}`, color: 'var(--ink-2)' });
      annotate(P, dp.d, dp.bits, `${ago(dp.d)} back: nothing`, { dx: 8, dy: -100, anchor: 'middle' });
      annotate(P, day.d, day.bits, `a day back: ${fmt(day.bits, 2)}`, { dx: -12, dy: -34, anchor: 'end' });
      crosshair(P, { xname: 'Δ =', xfmt: v => `${Math.round(v)} (${ago(Math.round(v))})`, yfmt: v => `${fmt(v, 2)} bit` });
    },
  };

  DS.define('questions-temp-distance', {
    rows() {
      const v = DS.col('temp', 'v');
      const sh = rng('questions-temp-shuffle').shuffle(v);
      return range(1, MAXD + 1).map(d => {
        const now = v.slice(d), back = v.slice(0, v.length - d);
        const c = corr(now, back);
        const res = now.map((x, i) => x - Math.round(c.ma + c.slope * (back[i] - c.mb)));
        const s = corr(sh.slice(d), sh.slice(0, sh.length - d));
        return { d, ago: ago(d), pairs: now.length, r: c.r, r2: c.r * c.r, bits: ex(c.r), meas: histH(now) - histH(res), sr: s.r, sbits: ex(s.r) };
      });
    },
    columns: [
      { key: 'd', label: 'Δ (half-hours)' },
      { key: 'ago', label: 'how far back', left: true },
      { key: 'pairs', label: 'pairs' },
      { key: 'r', label: 'correlation', fmt: v => fmt(v, 3) },
      { key: 'r2', label: 'variance explained', fmt: v => fmtPct(v, 1) },
      { key: 'bits', label: 'bits saved (formula)', fmt: v => fmt(v, 2) },
      { key: 'meas', label: 'bits saved (measured)', fmt: v => fmt(v, 2) },
      { key: 'sbits', label: 'shuffled (formula)', fmt: v => fmt(v, 3) },
    ],
    csvColumns: ['d', 'pairs', 'r', 'bits', 'meas', 'sbits'],
    highlights: {
      days: { label: 'whole days back', test: r => r.d % 48 === 0 },
      near: { label: 'the first two hours', test: r => r.d <= 4 },
    },
    views: { curve },
    metrics: [
      { id: 'b1', label: 'bits saved at $\\vgap$ = 1 (half an hour back)', value: rows => at(rows, 1).bits, fmt: v => `${fmt(v, 2)} bits`,
        note: (v, rows) => `The best straight line through the reading before explains ${fmtPct(at(rows, 1).r2, 1)} of the variance. A neighbour next door is worth almost three bits a reading — far more than any KV neighbour could hope for, because a thermometer changes slowly and its noise is tiny.` },
      { id: 'meas1', label: 'measured at $\\vgap$ = 1, on whole tenths', value: rows => at(rows, 1).meas, fmt: v => `${fmt(v, 2)} bits`,
        note: 'Entropy of the readings minus entropy of the exact integer residuals. A little below the formula, as on II.12: the readings are not quite bell-shaped. This is the column framework A reports; the formula is the quick look.' },
      { id: 'half', label: 'where the gain has halved', value: rows => halfOf(rows).d, fmt: v => `Δ = ${v} · ${ago(v)} back`,
        note: v => `The fading length, read off the data. ${ago(v)} back, a reading says less than half of what the one next door said. On KV entries, this is the number that would set the block size.` },
      { id: 'dip', label: 'the low point within a day', value: rows => dip(rows).bits, fmt: (v, rows) => `${fmt(v, 2)} bit at ${ago(dip(rows).d)}`,
        note: (v, rows) => `About ${ago(dip(rows).d)} back the daily cycle has turned far enough that the old reading tells nothing at all: its correlation with now passes through zero. The curve has faded out completely — for a while.` },
      { id: 'b48', label: 'bits saved one day back ($\\vgap$ = 48)', value: rows => at(rows, 48).bits, fmt: v => `${fmt(v, 2)} bit`,
        note: (v, rows) => `The curve climbs back: the same time yesterday knows the daily cycle. A shape nobody wrote down for KV — a far neighbour that helps more than a nearer one — and a reason to plot the whole curve rather than read one number. ${ago(at(rows, 96).d)} back it is ${fmt(at(rows, 96).bits, 2)}.` },
      { id: 'shuf', label: 'largest gain after shuffling', value: rows => Math.max(...rows.map(r => r.sbits)), fmt: v => `${fmt(v, 3)} bit`,
        note: 'The shuffle control: put the same 1,344 readings in a random order and every neighbour turns into a stranger. What is left is counting noise, a few thousandths of a bit. A real curve must stand clearly above it.' },
    ],
    code: `
import numpy as np, pandas as pd

# The method, from the temperatures themselves (download gull-rock-temperature.csv from the card on II.10)
v = pd.read_csv("gull-rock-temperature.csv")["v"].to_numpy()       # tenths of a degree
rng = np.random.default_rng(0)
shuffled = rng.permutation(v)                    # the shuffle control (a different shuffle from the card's)

def H(vals):                                     # entropy of the histogram, bits per value
    _, c = np.unique(vals, return_counts=True); p = c / c.sum()
    return -(p * np.log2(p)).sum()

def bits_saved(x, gap):                          # best straight line from the reading gap steps back
    now, back = x[gap:], x[:-gap]
    r = np.corrcoef(now, back)[0, 1]
    slope = r * now.std() / back.std()
    res = now - np.round(now.mean() + slope * (back - back.mean()))
    return 0.5 * np.log2(1 / (1 - r**2)), H(now) - H(res)   # formula, measured

for gap in (1, 2, 4, 8, 16, 24, 48, 96, 336):
    f, m = bits_saved(v, gap)
    print(f"gap {gap:3d}: formula {f:.2f}  measured {m:.2f}  shuffled {bits_saved(shuffled, gap)[0]:.3f}")

# The Numbers tab, from this card's table
t = pd.read_csv("{csv}")                         # columns: d, pairs, r, bits, meas, sbits
b1 = t.loc[t.d == 1, "bits"].item()
print("at gap 1:", round(b1, 2), "formula,", round(t.loc[t.d == 1, "meas"].item(), 2), "measured")
print("halved by gap", t.loc[t.bits <= b1 / 2, "d"].min())
day = t[t.d <= 48]; low = day.loc[day.bits.idxmin()]
print("low point", round(low.bits, 2), "at gap", int(low.d), "; one day back", round(t.loc[t.d == 48, "bits"].item(), 2))
print("largest shuffled gain", round(t.sbits.max(), 3))
`,
  });
})();
