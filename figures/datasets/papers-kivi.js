// KIVI's toy cache (V.7): one head of one layer, 12 tokens × 8 channels, keys and values. Made up to have the shape the
// KIVI paper reports for real models — two key channels that are big and creep slowly, and value tokens that are loud
// everywhere. One row per (token, channel). FIG.pbKiviAxis (figures/papers-b.js) reads its tables from here.
(function () {
  const K = [
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
  const V = [
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
  const T = 12, C = 8, BIG = [2, 5], LOUD = [3, 8];
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const sgn = v => (v > 0 ? '+' : '') + fmt(v, 1);
  // the two tables back from the rows: X[t][c]
  const table = (rows, key) => range(T).map(t => range(C).map(c => rows[t * C + c][key]));
  const cols = X => range(C).map(c => X.map(r => r[c]));
  const span = a => Math.max(...a) - Math.min(...a);
  // share of the variance explained by each channel's own mean (pooled over all 96 numbers)
  const r2chan = X => { const all = X.flat(), tot = variance(all); return 1 - mean(cols(X).map(c => variance(c))) / tot; };

  // Keys on top, values below: each channel a line across the 12 tokens.
  function lines(box, ctx) {
    const hl = ctx.hl, bigOn = hl && hl === DS.spec('papers-kivi').highlights.big, loudOn = hl && hl === DS.spec('papers-kivi').highlights.loud;
    box.append(legend([['one channel (a column of the table)', series(0)], ...(bigOn ? [['the two big key channels, c2 and c5', series(1)]] : []), ...(loudOn ? [['the loud value tokens, t3 and t8', series(1), 'band']] : [])]));
    [['key', 'keys', [-10.5, 13.5]], ['value', 'values', [-8.5, 5]]].forEach(([key, name, dom]) => {
      const b = h('div'); box.append(b);
      const X = table(ctx.rows, key);
      const P = Plot(b, { x: [-0.4, T - 0.6], y: dom, h: key === 'key' ? 250 : 210, grid: 'y', xticks: range(T), xfmt: v => `t${v}`,
        xlabel: key === 'value' ? 'token' : null, ylabel: name, label: `The ${name} of the toy cache, one line per channel` });
      if (loudOn && key === 'value') LOUD.forEach(t => el('rect', { x: P.x(t - 0.42), y: P.m.t, width: P.x(t + 0.42) - P.x(t - 0.42), height: P.ph, style: `fill:${mix(series(1), 16)}` }, P.g.bg));
      rule(P, { y: 0, dash: false, color: 'var(--ink-3)' });
      range(C).forEach(c => {
        const on = bigOn && key === 'key' && BIG.includes(c);
        const col = on ? series(1) : bigOn && key === 'key' ? mix(series(0), 45) : series(0);
        line(P, X.map((r, t) => [t, r[c]]), { color: col, width: on ? 2.6 : 1.5, markers: 2.4,
          tip: p => `<b>${name.slice(0, -1)}, token t${p[0]}, channel c${c}</b><br>${sgn(p[1])}` });
      });
      if (key === 'key') {
        svgText(P.g.top, P.x(T - 0.6) - 4 * P.fs, P.y(X[T - 1][2]) - 8 * P.fs, 'c2', { class: 'lbl', 'text-anchor': 'end' });
        svgText(P.g.top, P.x(T - 0.6) - 4 * P.fs, P.y(X[T - 1][5]) - 8 * P.fs, 'c5', { class: 'lbl', 'text-anchor': 'end' });
      } else {
        svgText(P.g.top, P.x(3) + 8 * P.fs, P.y(-7.7) + 4 * P.fs, 't3: c4 at −7.7', { class: 'lbl' });
      }
    });
    box.append(h('p', { class: 'fig-note', text: 'Read a line to follow one channel down a column of the table; read a vertical slice to see one token. Hover a dot for its number.' }));
  }

  // Ruler lengths: what one min–max ruler must span, for every column and every row, keys and values.
  function rulers(box, ctx) {
    const groups = [];
    [['key', 'keys'], ['value', 'values']].forEach(([key, name]) => {
      const X = table(ctx.rows, key);
      groups.push({ name: `${name}, per channel`, v: cols(X).map(span), who: i => `channel c${i}` });
      groups.push({ name: `${name}, per token`, v: X.map(span), who: i => `token t${i}` });
    });
    box.append(legend([['one ruler (a column or a row)', series(0), 'dot'], ['their average', series(1), 'line']]));
    const b = h('div'); box.append(b);
    const P = Plot(b, { ycats: groups.map(g => g.name), x: [0, 23], h: 250, grid: 'x', xlabel: 'length of the ruler (largest − smallest number it covers)', label: 'How long each ruler must be' });
    groups.forEach((g, i) => {
      g.v.forEach((v, j) => {
        const d = dot(P.g.data, P.x(v), P.y(i) + ((j % 3) - 1) * 6 * P.fs, 3.4 * P.fs, series(0), { tabindex: 0 });
        hover(d, () => `<b>${g.who(j)}</b>: a ruler of length ${fmt(v, 1)}`);
      });
      const m = mean(g.v), Y = P.y(i);
      el('line', { x1: P.x(m), x2: P.x(m), y1: Y - 14 * P.fs, y2: Y + 14 * P.fs, style: `stroke:${series(1)};stroke-width:2.5` }, P.g.top);
      svgText(P.g.top, P.x(m) + 6 * P.fs, Y - 9 * P.fs, fmt(m, 1), { class: 'val' });
    });
    box.append(h('p', { class: 'fig-note', text: 'Each dot is one ruler: the range of one column (per channel) or one row (per token). Short rulers mean fine marks for the same number of bits.' }));
  }

  DS.define('papers-kivi', {
    rows() {
      return range(T).flatMap(t => range(C).map(c => ({ t, c, token: `t${t}`, channel: `c${c}`, key: K[t][c], value: V[t][c] })));
    },
    columns: [
      { key: 'token', label: 'token' }, { key: 'channel', label: 'channel' },
      { key: 'key', label: 'key', fmt: v => fmt(v, 1) }, { key: 'value', label: 'value', fmt: v => fmt(v, 1) },
    ],
    csvColumns: ['t', 'c', 'key', 'value'],
    highlights: {
      big: { label: 'big key channels (c2, c5)', test: r => BIG.includes(r.c) },
      loud: { label: 'loud value tokens (t3, t8)', test: r => LOUD.includes(r.t) },
    },
    views: {
      lines: { label: 'Channel by channel', draw: lines, legend: false },
      rulers: { label: 'Ruler lengths', draw: rulers, legend: false },
    },
    metrics: [
      { id: 'shape', label: 'tokens × channels, for keys and for values', value: rows => rows.length / C, fmt: v => `${v} × ${C}`,
        note: 'One head of one layer: 96 key numbers and 96 value numbers. Toy numbers, made up to have the shape KIVI reports.' },
      { id: 'kmeans', label: 'key channel means', tex: '\\vmu_{\\vc}', value: rows => cols(table(rows, 'key')).map(mean),
        fmt: v => v.map(m => fmt(m, 1)).join(' · '),
        note: 'Six channels hover near 0; c2 sits at +11.2 and c5 at −8.7, token after token. Each key channel has a typical size of its own.' },
      { id: 'krulers', label: 'key rulers: per channel · per token', value: rows => { const X = table(rows, 'key'); return [mean(cols(X).map(span)), mean(X.map(span))]; },
        fmt: v => `${fmt(v[0], 1)} · ${fmt(v[1], 1)}`,
        note: v => `The average length a ruler must cover. Down a column it is ${fmt(v[0], 1)}; across a row ${fmt(v[1], 1)}, about ${fmt(v[1] / v[0], 0)} times longer, because every row holds both a +11 and a −9. Same bits, ${fmt(v[1] / v[0], 0)} times coarser marks.` },
      { id: 'vrulers', label: 'value rulers: per channel · per token', value: rows => { const X = table(rows, 'value'); return [mean(cols(X).map(span)), mean(X.map(span))]; },
        fmt: v => `${fmt(v[0], 1)} · ${fmt(v[1], 1)}`,
        note: (v, rows) => `Turned around: a row is the shorter ruler. Only the loud rows are long (t3 spans ${fmt(span(table(rows, 'value')[3]), 1)}), and per channel they stretch every column they cross.` },
      { id: 'kr2', label: 'key variance explained by each channel’s mean', tex: '\\vRsq', value: rows => r2chan(table(rows, 'key')),
        fmt: v => `${fmtPct(v, 1)} · ${fmt(0.5 * Math.log2(1 / (1 - v)), 2)} bits`,
        note: 'The number KIVI does not report, here for the toy: guessing every key by its channel’s typical value explains almost all of its spread. At the exchange rate of II.12 that is worth about 2.7 bits per number for an exact copy — in this toy, which was built with two big channels.' },
      { id: 'vr2', label: 'value variance explained by each channel’s mean', tex: '\\vRsq', value: rows => r2chan(table(rows, 'value')),
        fmt: v => `${fmtPct(v, 1)} · ${fmt(0.5 * Math.log2(1 / (1 - v)), 2)} bits`,
        note: 'For values the same guess explains next to nothing: their structure runs along rows (loud tokens), which a per-channel guess cannot see.' },
    ],
    helpers: { tables: () => ({ K: table(DS.rows('papers-kivi'), 'key'), V: table(DS.rows('papers-kivi'), 'value') }) },
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("{csv}")                         # columns: t, c, key, value (12 tokens x 8 channels)
K = d.pivot(index="t", columns="c", values="key").to_numpy()
V = d.pivot(index="t", columns="c", values="value").to_numpy()
span = lambda a, axis: (a.max(axis) - a.min(axis)).mean()

print("key channel means:", K.mean(0).round(1))
print("key rulers, per channel / per token:", span(K, 0).round(1), span(K, 1).round(1))
print("value rulers, per channel / per token:", span(V, 0).round(1), span(V, 1).round(1))
for name, X in [("keys", K), ("values", V)]:
    R2 = 1 - X.var(0).mean() / X.var()           # variance explained by each channel's mean
    print(name, "R2 =", R2.round(3), " bits:", (0.5 * np.log2(1 / (1 - R2))).round(2))
`,
  });
})();
