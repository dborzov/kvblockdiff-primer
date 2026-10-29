// The Gull Rock sky archive: 4,096 noon sky reports from random days of sixteen years, each with its date and season.
// The reports are drawn exactly as figures/school-info.js always drew them (seed 'si-archive', independent draws from
// the year's distribution sunny ½, cloudy ¼, rain ⅛, fog ⅛), so every number quoted on II.3–II.4 is unchanged.
// The dates come afterwards, from their own seed ('ds-sky-date'): the reports of each sky are shared out over the
// seasons in the proportions of the Gull Rock almanac (page II.5), so counting the archive by season gives the almanac back.
// Also defines DS.spec('sky').mosaic, a tile-grid view of a categorical sequence that the sticky sky reuses.
(function () {
  const SKY = ['sunny', 'cloudy', 'rain', 'fog'], P = [1 / 2, 1 / 4, 1 / 8, 1 / 8];
  const SKY_SERIES = [3, 6, 0, 7];                         // saffron, dusk, lapis, sage: one colour per sky symbol everywhere
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  const SEASON_SERIES = [5, 1, 4, 2];                      // emerald, vermilion, amethyst, peacock
  const ALMANAC = [[10, 4, 1, 1], [12, 2, 1, 1], [6, 6, 3, 1], [4, 4, 3, 5]];   // reports out of 64 (II.5)
  const LETTER = { sunny: 'S', cloudy: 'C', rain: 'R', fog: 'F' };
  const N = 4096, YEARS = [2010, 2025];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const seasonOf = m => [3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3][m];   // meteorological seasons: Mar–May is spring …
  const tint = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const skyCol = s => series(SKY_SERIES[SKY.indexOf(s)]);

  function draw(r) {                                       // the same arithmetic as school-info.js's drawSky
    let u = r(), k = 0;
    while (k < P.length - 1 && u >= P[k]) { u -= P[k]; k++; }
    return k;
  }

  // ------------------------------------------------------------ shared counting helpers
  const jointCounts = rows => SEASONS.map(se => SKY.map(sk => rows.filter(r => r.season === se && r.sky === sk).length));
  const rowTot = J => J.map(r => r.reduce((a, b) => a + b, 0));
  const colTot = J => SKY.map((_, c) => J.reduce((a, r) => a + r[c], 0));
  const condH = J => {                                     // H(rows' variable is known) = Σ p(row) H(row)
    const t = rowTot(J), N0 = t.reduce((a, b) => a + b, 0);
    return J.reduce((a, r, i) => a + (t[i] ? (t[i] / N0) * entropy(r) : 0), 0);
  };
  const transpose = J => J[0].map((_, c) => J.map(r => r[c]));
  const skyCounts = rows => SKY.map(s => rows.filter(r => r.sky === s).length);

  /**
   * mosaic(o): a categorical sequence as a grid of small tiles, one per row of the dataset, read like text
   * (left to right, then down). o: key, color(value) → css colour, cols, rowLabel(r) → text, rowEvery, title, label,
   * tip(row, i) → html, legend: [[label, colour]], h. Highlighted rows stay bright and the others fade; so does a selection.
   */
  function mosaic(o) {
    return {
      label: o.label || 'Mosaic',
      draw(box, ctx) {
        if (o.legend) box.before(legend(o.legend.map(([l, c]) => [l, c, 'box'])));
        const rows = ctx.rows, cols = o.cols, nr = Math.ceil(rows.length / cols);
        const left = o.rowLabel ? 62 : 6, W = 640, cell = (W - left - 6) / cols;
        const top = o.colTicks ? 20 : 4;
        const D = Diagram(box, { w: W, h: top + nr * cell + 8, label: o.title || 'Mosaic of the rows in order' });
        const g = el('g', {}, D.svg);
        const gap = cell > 8 ? 1.2 : cell > 4 ? 0.6 : 0;
        rows.forEach((r, i) => {
          const fade = (ctx.hl && !ctx.hl.test(r)) || (ctx.sel && !ctx.sel.test(r));
          el('rect', { x: left + (i % cols) * cell + gap / 2, y: top + Math.floor(i / cols) * cell + gap / 2, width: cell - gap, height: cell - gap, rx: cell > 8 ? 2 : 0,
            style: `fill:${fade ? tint(o.color(r[o.key]), 18) : o.color(r[o.key])}` }, g);
        });
        if (o.rowLabel) for (let k = 0; k < nr; k += o.rowEvery || 1) {
          el('text', { x: left - 6, y: top + (k + 0.5) * cell + 3.5 * D.fs, 'text-anchor': 'end', class: 'val', style: 'fill:var(--ink-3)', text: o.rowLabel(k) }, g);
        }
        if (o.colTicks) o.colTicks.forEach(([c, t]) => el('text', { x: left + (c + 0.5) * cell, y: top - 6, 'text-anchor': 'middle', class: 'val', style: 'fill:var(--ink-3)', text: t }, g));
        const hit = el('rect', { x: left, y: top, width: cols * cell, height: nr * cell, class: 'hit' }, g);
        const pt = D.svg.createSVGPoint();
        hover(hit, e => {
          if (!e || e.clientX == null) return '';
          pt.x = e.clientX; pt.y = e.clientY;
          const q = pt.matrixTransform(D.svg.getScreenCTM().inverse());
          const i = Math.floor((q.y - top) / cell) * cols + Math.floor((q.x - left) / cell);
          return rows[i] ? o.tip(rows[i], i) : '';
        });
        hit.addEventListener('pointermove', e => hit.dispatchEvent(new PointerEvent('pointerenter', e)));
      },
    };
  }

  /** Grouped bars: for each value of `outer`, the share of each value of `inner` — e.g. the sky in each season. */
  function shares(o) {
    return {
      label: o.label,
      draw(box, ctx) {
        box.before(legend(o.inner.map((v, j) => [v, series(o.innerSeries[j]), 'box'])));
        const rows = ctx.rows;
        const data = o.outer.map(a => { const sub = rows.filter(r => r[o.outerKey] === a); return o.inner.map(b => sub.filter(r => r[o.innerKey] === b).length / (sub.length || 1)); });
        const P = Plot(box, { xcats: o.outer, y: [0, o.ymax || 1], h: o.h || 270, ylabel: o.ylabel, grid: 'y', yfmt: v => fmtPct(v, 0), label: o.title });
        const selA = ctx.sel && ctx.sel.cat;
        const gb = bars(P, data, {
          colors: (i, j) => (selA != null && o.outer[i] !== selA ? tint(series(o.innerSeries[j]), 35) : series(o.innerSeries[j])),
          tip: (v, i, j) => `<b>${o.outer[i]}</b>: ${o.inner[j]} ${fmtPct(v, 1)} of ${rows.filter(r => r[o.outerKey] === o.outer[i]).length} reports${o.ref ? `<br>${o.refName}: ${fmtPct(o.ref[i][j], 1)}` : ''}<br><span class="small">click to select ${o.outer[i]}</span>`,
        });
        if (o.ref) gb.bars.forEach(b => {
          const i = +b.dataset.i, j = +b.dataset.j, bb = b.getBBox(), y = P.y(o.ref[i][j]);
          el('line', { x1: bb.x - 2, x2: bb.x + bb.width + 2, y1: y, y2: y, style: 'stroke:var(--ink);stroke-width:1.6;stroke-dasharray:3 2' }, P.g.top);
        });
        P.g.top.querySelectorAll('.pk-bar-hits rect').forEach((hr, n) => {
          const i = +gb.bars[n].dataset.i;
          hr.style.cursor = 'pointer';
          hr.addEventListener('click', () => ctx.select({ label: `${o.outerKey} = ${o.outer[i]}`, cat: o.outer[i], test: r => r[o.outerKey] === o.outer[i] }));
        });
      },
    };
  }

  const ALMANAC_SHARE = ALMANAC.map(r => r.map(v => v / 16));
  const ALMANAC_BY_SKY = transpose(ALMANAC).map(c => { const t = c.reduce((a, b) => a + b, 0); return c.map(v => v / t); });

  DS.define('sky', {
    mosaic,
    rows() {
      const r = rng('si-archive'), ks = range(N).map(() => draw(r));
      // Share each sky's reports out over the seasons in the almanac's proportions (largest remainders), then shuffle.
      const d = rng('ds-sky-date'), season = new Array(N);
      SKY.forEach((_, k) => {
        const idx = range(N).filter(i => ks[i] === k), col = ALMANAC.map(row => row[k]), tot = col.reduce((a, b) => a + b, 0);
        const exact = col.map(c => idx.length * c / tot), q = exact.map(Math.floor);
        let left = idx.length - q.reduce((a, b) => a + b, 0);
        exact.map((x, s) => [x - q[s], s]).sort((a, b) => b[0] - a[0]).forEach(([, s]) => { if (left > 0) { q[s]++; left--; } });
        const labels = d.shuffle(q.flatMap((n, s) => new Array(n).fill(s)));
        idx.forEach((i, j) => { season[i] = labels[j]; });
      });
      // A distinct date for every report: shuffle each season's days of the sixteen years and deal them out.
      const slots = SEASONS.map(() => []);
      for (let y = YEARS[0]; y <= YEARS[1]; y++) MONTHS.forEach((_, m) => { for (let dd = 1; dd <= MDAYS[m]; dd++) slots[seasonOf(m)].push([y, m, dd]); });
      const deal = slots.map(s => d.shuffle(s)), used = [0, 0, 0, 0];
      return ks.map((k, i) => {
        const [y, m, dd] = deal[season[i]][used[season[i]]++];
        return { date: `${dd} ${MONTHS[m]} ${y}`, season: SEASONS[season[i]], sky: SKY[k], k, bits: -Math.log2(P[k]) };
      });
    },
    columns: [
      { key: 'date', label: 'date (noon)', left: true },
      { key: 'season', label: 'season', left: true },
      { key: 'sky', label: 'sky', left: true },
      { key: 'bits', label: 'surprisal (bits)' },
    ],
    csvColumns: ['date', 'season', 'sky'],
    highlights: {
      fog: { label: 'fog', test: r => r.sky === 'fog' },
      rare: { label: 'rain or fog', test: r => r.sky === 'rain' || r.sky === 'fog' },
      summer: { label: 'summer', test: r => r.season === 'summer' },
      winter: { label: 'winter', test: r => r.season === 'winter' },
    },
    views: {
      mosaic: mosaic({
        key: 'sky', color: skyCol, cols: 128, label: 'All 4,096 reports', title: 'The 4,096 sky reports of the archive as coloured tiles, in archive order',
        legend: SKY.map(s => [s, skyCol(s)]),
        tip: (r, i) => `<b>report ${i}</b> · ${r.date}<br>${r.season} · <b>${r.sky}</b> (${r.bits} bit${r.bits > 1 ? 's' : ''})`,
      }),
      counts: DS.views.categories({ key: 'sky', order: SKY, catSeries: c => SKY_SERIES[SKY.indexOf(c)], xlabel: 'sky', ylabel: 'reports', noun: 'reports', label: 'How often each sky' }),
      seasons: shares({
        label: 'Sky by season', outer: SEASONS, outerKey: 'season', inner: SKY, innerKey: 'sky', innerSeries: SKY_SERIES, ymax: 0.85,
        ylabel: 'share of the season’s reports', title: 'Share of each sky report within each season', ref: ALMANAC_SHARE, refName: 'almanac',
      }),
      bysky: shares({
        label: 'Season by sky', outer: SKY, outerKey: 'sky', inner: SEASONS, innerKey: 'season', innerSeries: SEASON_SERIES, ymax: 0.7,
        ylabel: 'share of the sky’s reports', title: 'Share of each season among the reports of each sky', ref: ALMANAC_BY_SKY, refName: 'almanac',
      }),
    },
    metrics: [
      { id: 'n', label: 'reports', value: rows => rows.length, fmt: v => v.toLocaleString('en-US'),
        note: 'Noon reports from 4,096 different days of sixteen years (2010–2025), picked at random, so neighbouring rows have nothing to do with each other.' },
      ...SKY.map((s, k) => ({
        id: s, label: `share ${s}`, value: rows => rows.filter(r => r.sky === s).length / rows.length,
        fmt: (v, rows) => `${fmtPct(v, 1)} · ${rows.filter(r => r.sky === s).length}`,
        note: (v, rows) => [
          `Exactly ½ would be ${rows.length * P[k]} reports; the archive has ${rows.filter(r => r.sky === s).length}. Counting gets close to a probability, never exactly onto it.`,
          `A quarter would be ${rows.length * P[k]}. The archive is a little short of cloud: a random sample wobbles around the long-run share.`,
          `An eighth would be ${rows.length * P[k]}. Rain and fog have the same probability, yet the archive counts ${rows.filter(r => r.sky === 'rain').length} rain and ${rows.filter(r => r.sky === 'fog').length} fog reports.`,
          `Fog comes out slightly above its ⅛ here. Rare outcomes wobble the most, in relative terms: a few dozen reports either way is several per cent of their count.`][k],
      })),
      { id: 'entropy', label: 'entropy of the counts', tex: '\\vH', value: rows => entropy(skyCounts(rows)), fmt: v => `${fmt(v, 3)} bits`,
        note: 'Computed from the four counts of the whole archive: within a few thousandths of the true 1.75 bits. Order-0: shuffling the rows would not change it.' },
      { id: 'first16', label: 'entropy of the first 16 reports', value: rows => entropy(skyCounts(rows.slice(0, 16))), fmt: v => `${fmt(v, 2)} bits`,
        note: (v, rows) => `Counts ${skyCounts(rows.slice(0, 16)).join(', ')}: one fog in sixteen looks rarer than it is, and the estimate comes out low.` },
      { id: 'first64', label: 'entropy of the first 64 reports', value: rows => entropy(skyCounts(rows.slice(0, 64))), fmt: v => `${fmt(v, 2)} bits`,
        note: (v, rows) => `Counts ${skyCounts(rows.slice(0, 64)).join(', ')}: an unusually sunny stretch, so the sky looks more predictable than it is.` },
      { id: 'planA', label: 'the whole archive in plan A (2 bits each)', value: rows => 2 * rows.length, fmt: v => `${v.toLocaleString('en-US')} bits`,
        note: 'Every report costs the same two bits, whatever the sky.' },
      { id: 'planB', label: 'the whole archive in plan B (0, 10, 110, 111)', value: rows => rows.reduce((a, r) => a + r.bits, 0),
        fmt: (v, rows) => `${v.toLocaleString('en-US')} bits · ${fmt(v / rows.length, 3)} per report`,
        note: (v, rows) => `${fmtPct(1 - v / (2 * rows.length), 1)} less than plan A. Plan B's codeword lengths are the surprisals, so its total is the sum of the “surprisal” column.` },
      { id: 'seasonH', label: 'entropy of the sky in each season', value: rows => jointCounts(rows).map(r => entropy(r)),
        fmt: v => SEASONS.map((s, i) => `${s} ${fmt(v[i], 2)}`).join(' · '),
        note: 'The almanac says 1.42, 1.19, 1.76 and 1.98 bits. Counting about a thousand reports per season lands within a couple of hundredths.' },
      { id: 'condH', label: 'with the season known', tex: '\\vH(\\vX \\mid \\vY)', value: rows => condH(jointCounts(rows)), fmt: v => `${fmt(v, 3)} bits`,
        note: (v, rows) => `The four seasons' entropies, each weighted by its share of the reports: against ${fmt(entropy(skyCounts(rows)), 3)} bits without the season. The almanac's own numbers give 1.59.` },
      { id: 'mi', label: 'bits the season saves', tex: '\\vI(\\vX;\\vY)', value: rows => entropy(skyCounts(rows)) - condH(jointCounts(rows)), fmt: v => `${fmt(v, 3)} bits`,
        note: 'The archive’s own version of the almanac’s 0.16 bits per report: about 9 % of the cost of a report.' },
      { id: 'seasonGivenSky', label: 'season still uncertain after one report', tex: '\\vH(\\vY \\mid \\vX)', value: rows => condH(transpose(jointCounts(rows))),
        fmt: (v, rows) => `${fmt(v, 3)} bits of ${fmt(entropy(rowTot(jointCounts(rows))), 3)}`,
        note: (v, rows) => { const J = jointCounts(rows); return `Before the report, the season costs ${fmt(entropy(rowTot(J)), 3)} bits; after it, ${fmt(condH(transpose(J)), 3)}. The difference, ${fmt(entropy(rowTot(J)) - condH(transpose(J)), 3)} bits, is the same saving as the other way round.`; } },
    ],
    code: `
import numpy as np, pandas as pd

sky = pd.read_csv("{csv}")              # columns: date, season, sky

def H(counts):                          # entropy in bits of a list of counts
    p = np.asarray(counts, float); p = p[p > 0] / p.sum()
    return -(p * np.log2(p)).sum()

counts = sky["sky"].value_counts()
print(counts / len(sky))                # sunny ~1/2, cloudy ~1/4, rain ~1/8, fog ~1/8
print("entropy", H(counts).round(3), "bits")
print("first 16:", H(sky["sky"][:16].value_counts()).round(2), " first 64:", H(sky["sky"][:64].value_counts()).round(2))

bits = sky["sky"].map({"sunny": 1, "cloudy": 2, "rain": 3, "fog": 3})   # plan B codeword lengths
print("plan B:", bits.sum(), "bits; plan A:", 2 * len(sky))

J = pd.crosstab(sky["season"], sky["sky"])     # the almanac, counted
print(J)
H_given = sum(J.loc[s].sum() / len(sky) * H(J.loc[s]) for s in J.index)
print("H(sky | season)", H_given.round(3), "  saved", (H(counts) - H_given).round(3))
`,
  });

  // Exported for the other Part II datasets (read with DS.spec('sky')): the sky's colours and letters.
  Object.assign(DS.spec('sky'), { SKY, SKY_SERIES, LETTER, skyCol });
})();
