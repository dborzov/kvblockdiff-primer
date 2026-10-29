// What knowing the season does to the cost of each sky report (VII.3). One row per season and sky: how many of the
// archive's 4,096 reports it covers, and what one such report costs in surprisal, −log₂ p, without the season and with it.
// Derived: rows() counts DS.rows('sky'). On average the season saves bits; some single reports get dearer.
(function () {
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'], SKY = ['sunny', 'cloudy', 'rain', 'fog'];
  const N = rows => sum(rows.map(r => r.n));
  const avg = (rows, k) => sum(rows.map(r => r.n * r[k])) / N(rows);
  const dearer = rows => rows.filter(r => r.change > 1e-9);

  DS.define('missed-sky-cost', {
    rows() {
      const S = DS.rows('sky'), n = S.length;
      return SEASONS.flatMap(se => {
        const inSe = S.filter(r => r.season === se);
        return SKY.map(sk => {
          const c = inSe.filter(r => r.sky === sk).length, all = S.filter(r => r.sky === sk).length;
          const alone = -Math.log2(all / n), given = -Math.log2(c / inSe.length);
          return { season: se, sky: sk, name: `${sk} in ${se}`, n: c, alone, given, change: given - alone };
        });
      });
    },
    columns: [
      { key: 'season', label: 'season', left: true }, { key: 'sky', label: 'sky', left: true },
      { key: 'n', label: 'reports' },
      { key: 'alone', label: 'cost alone (bits)', fmt: v => fmt(v, 2) },
      { key: 'given', label: 'cost, season known (bits)', fmt: v => fmt(v, 2) },
      { key: 'change', label: 'change (bits)', fmt: v => fmtS(v, 2) },
    ],
    csvColumns: ['season', 'sky', 'n', 'alone', 'given', 'change'],
    highlights: { dearer: { label: 'reports that cost more given the season', test: r => r.change > 1e-9 } },
    views: {
      bar: {
        label: 'Paid and saved',
        legend: false,
        draw(box, ctx) {
          const rows = ctx.rows, H = avg(rows, 'alone'), Hc = avg(rows, 'given');
          box.append(legend([['still paid, $\\vH$', 'var(--bad)', 'box'], ['saved by the season, $\\vI$', 'var(--good)', 'box']].map(([l, c, s]) => [texify(l), c, s])));
          const D = Diagram(box, { w: 640, h: 150, label: 'The cost of a sky report without and with the season, as two bars of the same length' });
          const fs = D.fs, L = 150 * Math.min(fs, 1.3), R = 620, X = v => L + (R - L) * v / 2;
          [['nothing known', H, 0], ['season known', Hc, H - Hc]].forEach(([name, paid, saved], i) => {
            const y = 18 + i * 58 * Math.min(fs, 1.3), hh = 30 * Math.min(fs, 1.3);
            el('text', { x: L - 8, y: y + hh * 0.65, 'text-anchor': 'end', class: 'lbl', text: name }, D.svg);
            el('rect', { x: L, y, width: X(paid) - L, height: hh, rx: 4, style: 'fill:color-mix(in srgb, var(--bad) 70%, transparent)' }, D.svg);
            if (saved) el('rect', { x: X(paid), y, width: X(H) - X(paid), height: hh, rx: 4, style: 'fill:color-mix(in srgb, var(--good) 75%, transparent)' }, D.svg);
            el('text', { x: L + 8, y: y + hh * 0.65, class: 'val', text: `${fmt(paid, 2)} bits` }, D.svg);
            if (saved) el('text', { x: X(H) + 6, y: y + hh * 0.65, class: 'val', text: `+${fmt(saved, 2)} saved` }, D.svg);
          });
          D.svg.setAttribute('viewBox', `0 0 640 ${18 + 2 * 58 * Math.min(fs, 1.3)}`);
          box.append(h('p', { class: 'fig-note', text: 'The average cost of one noon report in the archive. Both bars are the same length: what the season does not settle, it saves.' }));
        },
      },
      outcomes: {
        label: 'Report by report',
        highlights: ['dearer'],
        legend: false,
        draw(box, ctx) {
          const rows = ctx.rows;
          box.append(legend([['cheaper once the season is known', 'var(--good)', 'box'], ['dearer once the season is known', 'var(--bad)', 'box']]));
          const bx = h('div'); box.append(bx);
          const P = Plot(bx, { ycats: rows.map(r => `${r.sky}, ${r.season}`), x: [-1.6, 1.6], h: 470, xlabel: 'change in the cost of one report (bits)', grid: 'x', m: { l: 116, r: 40, t: 10, b: 44 },
            label: 'How the cost of each kind of sky report changes once the season is known' });
          rule(P, { x: 0, color: 'var(--ink-3)', dash: false });
          rows.forEach((r, i) => {
            const y0 = P.y(i - 0.36), y1 = P.y(i + 0.36), xa = P.x(Math.min(0, r.change)), xb = P.x(Math.max(0, r.change));
            const c = r.change > 0 ? 'var(--bad)' : 'var(--good)', sel = ctx.sel && !ctx.sel.test(r);
            const rc = el('rect', { x: xa, width: Math.max(1, xb - xa), y: Math.min(y0, y1), height: Math.abs(y1 - y0), rx: 2, style: `fill:color-mix(in srgb, ${c} ${sel ? 30 : 80}%, transparent)` }, P.g.data);
            el('text', { x: r.change > 0 ? xb + 4 : xa - 4, y: (y0 + y1) / 2 + 4 * P.fs, 'text-anchor': r.change > 0 ? 'start' : 'end', class: 'val', text: `${r.n}` }, P.g.top);
            hover(rc, () => `<b>${r.name}</b>: ${r.n} reports<br>${fmt(r.alone, 2)} bits alone → ${fmt(r.given, 2)} with the season (${fmtS(r.change, 2)})`);
          });
          box.append(h('p', { class: 'fig-note', text: 'One bar per kind of report; the number beside it is how many of the 4,096 reports are of that kind. Common reports for their season get cheaper, reports that are unusual for their season get dearer. Weighted by the counts, the cheaper side wins.' }));
        },
      },
    },
    metrics: [
      { id: 'H', label: 'cost with nothing known', tex: '\\vH(\\vX)', value: rows => avg(rows, 'alone'), fmt: v => `${fmt(v, 2)} bits`,
        note: 'The average surprisal of a report in the archive: its entropy, as on II.4.' },
      { id: 'condH', label: 'cost with the season known', tex: '\\vH(\\vX \\mid \\vY)', value: rows => avg(rows, 'given'), fmt: v => `${fmt(v, 2)} bits`,
        note: 'The red part of the second bar. Lower, as it must be.' },
      { id: 'mi', label: 'bits the season saves', tex: '\\vI(\\vX;\\vY)', value: rows => avg(rows, 'alone') - avg(rows, 'given'), fmt: v => `${fmt(v, 2)} bits`,
        note: 'The green part. It grows as the season predicts the sky better; it can never be negative.' },
      { id: 'dearer', label: 'reports that get dearer', value: rows => sum(dearer(rows).map(r => r.n)) / N(rows), fmt: (v, rows) => `${fmtPct(v, 0)} of the reports · ${dearer(rows).length} of 16 kinds`,
        note: 'Sunny winters, foggy summers and the like: outcomes the season calls unusual. They cost more than with no season at all, and the average still falls.' },
      { id: 'worst', label: 'the biggest rise', value: rows => dearer(rows).reduce((a, r) => (r.change > a.change ? r : a)), fmt: v => `${v.name}: ${fmt(v.alone, 2)} → ${fmt(v.given, 2)} bits`,
        note: 'One report can cost a whole bit more against its context than against nothing. Only the average over many reports is guaranteed to improve.' },
    ],
    code: `
import numpy as np, pandas as pd

sky = pd.read_csv("gull-rock-sky-archive.csv")       # the archive of II.3: date, season, sky
p = sky["sky"].value_counts(normalize=True)
pg = sky.groupby("season")["sky"].value_counts(normalize=True)
alone = -np.log2(sky["sky"].map(p))
given = -np.log2([pg[s][k] for s, k in zip(sky["season"], sky["sky"])])
print("H(X)", alone.mean().round(2), " H(X|season)", given.mean().round(2), " I", (alone - given).mean().round(2))
print("share of reports that get dearer:", (given > alone + 1e-9).mean().round(2))
`,
  });
})();
