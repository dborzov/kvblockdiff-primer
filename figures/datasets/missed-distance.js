// The distance curve of the Gull Rock temperatures (VII.4, VII.13, VII.17): for every token distance — here every gap of
// g half-hours, 1 to 672 (two weeks) — the bits per reading that the reading g places back saves, by the exchange rate,
// in time order and after the shuffle of DS 'missed-shuffled'. Derived: rows() reads DS.rows('missed-shuffled').
(function () {
  const r2gap = (a, g) => {
    const x = a.slice(g), y = a.slice(0, a.length - g), mx = mean(x), my = mean(y);
    let s = 0, sx = 0, sy = 0;
    x.forEach((v, i) => { s += (v - mx) * (y[i] - my); sx += (v - mx) ** 2; sy += (y[i] - my) ** 2; });
    return { r: s / Math.sqrt(sx * sy), r2: (s * s) / (sx * sy) };
  };
  const exch = r2 => 0.5 * Math.log2(1 / (1 - r2));
  const G = 672;
  const at = (rows, g) => rows[g - 1];
  const span = g => (g < 48 ? `${fmt(g / 2, 1)} h` : `${fmt(g / 48, g % 48 ? 1 : 0)} day${g === 48 ? '' : 's'}`);
  const IN = series(0), SH = series(1);

  function curve(box, ctx, o) {
    box.append(legend([['in time order', IN], ['shuffled (the control)', SH]]));
    const b = h('div'); box.append(b);
    const rows = ctx.rows.filter(r => r.g <= o.max);
    const P = Plot(b, { x: o.log ? [1, o.max] : [0, o.max], xlog: o.log ? 2 : false, y: [0, 3.2], h: 290, xlabel: o.xlabel, ylabel: 'bits per reading saved',
      xticks: o.xticks, xfmt: o.xfmt, label: 'Bits saved by one earlier reading, against how far back it is' });
    [48, 96, 144, 336].filter(g => g <= o.max).forEach(g => rule(P, { x: g, label: g === 336 ? '1 week' : `${g / 48} day${g > 48 ? 's' : ''}`, color: 'var(--ink-3)' }));
    if (ctx.sel) rows.filter(ctx.sel.test).forEach(r => el('line', { x1: P.x(r.g), x2: P.x(r.g), y1: P.y(0), y2: P.y(r.bits), style: 'stroke:var(--c);stroke-width:2;opacity:.5' }, P.g.bg));
    line(P, rows.map(r => [r.g, r.bitsS]), { color: SH, width: 1.6, name: 'shuffled' });
    line(P, rows.map(r => [r.g, r.bits]), { color: IN, width: 2, name: 'in order' });
    if (ctx.hl) rows.filter(ctx.hl.test).forEach(r => dot(P.g.data, P.x(r.g), P.y(r.bits), 3.4 * P.fs, series(1)));
    o.notes.forEach(([g, text, dx, dy]) => annotate(P, g, at(ctx.rows, g).bits, text, { dx, dy }));
    crosshair(P, { xname: 'gap', xfmt: v => `${Math.round(v)} half-hours (${span(Math.round(v))})`, yfmt: v => `${fmt(v, 2)} bits` });
  }

  DS.define('missed-distance', {
    rows() {
      const S = DS.rows('missed-shuffled'), v = S.map(r => r.v), vs = S.map(r => r.vs);
      return range(1, G + 1).map(g => {
        const a = r2gap(v, g), b = r2gap(vs, g);
        return { g, hours: g / 2, span: span(g), r: a.r, r2: a.r2, bits: exch(a.r2), rS: b.r, bitsS: exch(b.r2) };
      });
    },
    columns: [
      { key: 'g', label: 'gap (half-hours)' },
      { key: 'span', label: 'gap', left: true },
      { key: 'r', label: 'correlation', fmt: v => fmt(v, 3) },
      { key: 'r2', label: 'R²', fmt: v => fmtPct(v, 1) },
      { key: 'bits', label: 'bits saved', fmt: v => fmt(v, 3) },
      { key: 'bitsS', label: 'bits saved, shuffled', fmt: v => fmt(v, 4) },
    ],
    csvColumns: ['g', 'r', 'r2', 'bits', 'rS', 'bitsS'],
    highlights: {
      days: { label: 'whole days back', test: r => r.g % 48 === 0 },
    },
    views: {
      curve: {
        label: 'Two weeks (log scale)',
        highlights: ['days'],
        draw(box, ctx) {
          curve(box, ctx, { max: G, log: true, xlabel: 'gap g (half-hours back, log scale)', xticks: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512], xfmt: v => String(v),
            notes: [[1, 'half an hour back', 34, 20], [12, 'six hours: almost nothing', 20, -40], [48, 'one day back:\nthe cycle repeats', 34, -46]] });
        },
      },
      days: {
        label: 'Three days',
        highlights: ['days'],
        draw(box, ctx) {
          curve(box, ctx, { max: 144, log: false, xlabel: 'gap g (half-hours back)', xticks: [0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144], xfmt: v => String(v),
            notes: [[24, 'twelve hours: the other\nside of the day', 30, -60], [48, 'one day', 26, -30]] });
        },
      },
    },
    metrics: [
      { id: 'g1', label: 'half an hour back ($\\vgap$ = 1)', value: rows => at(rows, 1).bits, fmt: v => `${fmt(v, 2)} bits`,
        note: (v, rows) => `The nearest neighbour explains ${fmtPct(at(rows, 1).r2, 1)} of the variance and saves about three bits of the 6.5 a reading costs alone.` },
      { id: 'g6', label: 'three hours back ($\\vgap$ = 6)', value: rows => at(rows, 6).bits, fmt: v => `${fmt(v, 2)} bits`,
        note: 'Already down to under a bit. The weather of three hours ago is a much vaguer guess: the curve falls fast.' },
      { id: 'g24', label: 'twelve hours back ($\\vgap$ = 24)', value: rows => at(rows, 24).bits, fmt: v => `${fmt(v, 2)} bits`,
        note: 'Practically nothing: noon is a poor guess for midnight.' },
      { id: 'g48', label: 'one day back ($\\vgap$ = 48)', value: rows => at(rows, 48).bits, fmt: v => `${fmt(v, 2)} bits`,
        note: 'Back up to the three-hour level: the same time yesterday knows the daily cycle. A curve can rise again; a single threshold would never show it.' },
      { id: 'half', label: 'where the saving first halves', value: rows => rows.find(r => r.bits < at(rows, 1).bits / 2).g, fmt: v => `$\\vgap$ = ${v} (${span(v)})`,
        note: 'A rough memory length for this data: the first gap that saves less than half of what the nearest neighbour saves.' },
      { id: 'shuf', label: 'largest saving after shuffling, any gap', value: rows => Math.max(...rows.map(r => r.bitsS)), fmt: v => `${fmt(v, 4)} bits`,
        note: 'The control. With the order destroyed, no gap saves even a hundredth of a bit, so every bump of the blue curve is a property of the order, not a fluke of fitting.' },
    ],
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("gull-rock-temperature-shuffled.csv")   # from the shuffle card: k, v (in order), vs (shuffled)
curve = pd.read_csv("{csv}")                            # this card: the result for every gap

def bits(a, g):                                  # bits saved by the reading g places back
    r = np.corrcoef(a[g:], a[:-g])[0, 1]
    return 0.5 * np.log2(1 / (1 - r * r))

for g in (1, 6, 24, 48):
    print(g, round(bits(d["v"].to_numpy(), g), 2), round(bits(d["vs"].to_numpy(), g), 4))
print("first gap below half:", curve.g[curve.bits < curve.bits[0] / 2].iloc[0])
print("largest shuffled saving:", curve.bitsS.max().round(4))
`,
  });
})();
