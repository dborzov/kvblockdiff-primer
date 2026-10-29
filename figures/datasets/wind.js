// Gull Rock wind: 1,024 half-hourly wind speeds in whole knots (three weeks).
// The values are drawn exactly as before (seed 'si-wind': a Rayleigh breeze with scale 8 kn, plus 2.5 % gales
// of 40–59 kn), so every histogram number in the prose is unchanged. They are then put in a believable order:
// a slow weather wander, an afternoon sea breeze and three storms, matched rank for rank to the values.
// Each reading also has a direction on the vane's 16-point compass (page II.2), from its own seed ('ds-wind-dir'):
// a south-westerly that wanders, veers round to the north-east for two spells, and swings west in the storms.
(function () {
  const N = 1024;
  const BEAUFORT = [[1, 'calm'], [4, 'light air'], [7, 'light breeze'], [11, 'gentle breeze'], [17, 'moderate breeze'],
    [22, 'fresh breeze'], [28, 'strong breeze'], [34, 'near gale'], [41, 'gale'], [48, 'strong gale'], [56, 'storm'], [999, 'violent storm']];
  const beaufort = kn => BEAUFORT.find(([lim]) => kn < lim)[1];
  const hhmm = i => `${String(Math.floor((i % 48) / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
  const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const addr = k => k.toString(2).padStart(4, '0');          // the vane's 4-bit address (page II.2)
  const STORMS = [[230, 7], [610, 5], [905, 6]];              // [reading at the peak, half-width in readings]
  const SPELLS = [[118, 34], [668, 26]];                      // north-easterly spells: [centre reading, half-length]
  const bump = (i, at, s) => Math.exp(-0.5 * ((i - at) / s) ** 2);
  function directions() {
    const d = rng('ds-wind-dir');
    let a = 0;
    return range(N).map(i => {
      a = 0.95 * a + d.normal(0, 13);
      const spell = SPELLS.reduce((m, [at, s]) => Math.max(m, Math.min(1, 1.6 * bump(i, at, s))), 0);
      const storm = STORMS.reduce((m, [at, s]) => Math.max(m, bump(i, at, 2.5 * s)), 0);
      const deg = 222 - 170 * spell + 25 * storm + a * (1 - 0.6 * storm) + d.normal(0, 9);
      return ((Math.round(deg / 22.5) % 16) + 16) % 16;
    });
  }
  const dirCounts = rows => { const c = new Array(16).fill(0); rows.forEach(r => c[r.k]++); return c; };
  const nonzeroCounts = rows => dirCounts(rows).filter(v => v > 0);
  const histH = vals => { const c = new Map(); vals.forEach(v => c.set(v, (c.get(v) || 0) + 1)); return entropy([...c.values()]); };
  const steps = rows => rows.filter(r => r.prev != null);
  const r2prev = rows => { const s = steps(rows); return 1 - variance(s.map(r => r.kn - r.prev)) / variance(rows.map(r => r.kn)); };

  /** This reading against the one before: a 2-D histogram (darker cell = more pairs), with the line "guess = previous". */
  const lag = {
    label: 'Against the previous reading',
    draw(box, ctx) {
      const rows = steps(ctx.rows), cnt = new Map(), hlc = new Map();
      rows.forEach(r => { const k = r.prev * 100 + r.kn; cnt.set(k, (cnt.get(k) || 0) + 1); if (ctx.hl && ctx.hl.test(r)) hlc.set(k, (hlc.get(k) || 0) + 1); });
      const top = Math.max(...cnt.values());
      const P = Plot(box, { x: [-1, 61], y: [-1, 61], h: 330, xticks: [0, 10, 20, 30, 40, 50, 60], yticks: [0, 10, 20, 30, 40, 50, 60], xlabel: 'previous reading (knots)', ylabel: 'this reading (knots)', label: 'Each wind reading against the reading half an hour before' });
      const tint = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
      el('line', { x1: P.x(0), y1: P.y(0), x2: P.x(60), y2: P.y(60), style: 'stroke:var(--ink-3);stroke-dasharray:5 4' }, P.g.bg);
      cnt.forEach((c, key) => {
        const a = Math.floor(key / 100), b = key % 100, hot = hlc.get(key);
        const sel = ctx.sel ? rows.some(r => r.prev === a && r.kn === b && ctx.sel.test(r)) : true;
        const rc = el('rect', { x: P.x(a - 0.5), y: P.y(b + 0.5), width: P.x(a + 0.5) - P.x(a - 0.5), height: P.y(b - 0.5) - P.y(b + 0.5),
          style: `fill:${tint(hot ? series(1) : series(0), (sel ? 1 : 0.35) * (28 + 72 * Math.sqrt(c / top)))}` }, P.g.data);
        hover(rc, () => `previous <b>${a} kn</b> → this <b>${b} kn</b><br>${c} time${c > 1 ? 's' : ''}${hot ? ` (${hot} ${ctx.hl.label})` : ''}`);
      });
      annotate(P, 46, 46, 'guess = previous', { dx: -60, dy: -34 });
    },
  };

  /** The wind rose: one petal per compass point, its length the number of readings from that direction. */
  const rose = {
    label: 'Directions',
    draw(box, ctx) {
      const D = Diagram(box, { w: 640, h: 340, label: 'Wind rose: readings from each of the 16 compass directions', grow: 0.5 });
      const cx = 320, cy = D.H / 2 + 4 * D.fs, R = D.H / 2 - 40 * D.fs;
      const all = dirCounts(ctx.rows), hl = ctx.hl ? dirCounts(ctx.rows.filter(ctx.hl.test)) : null;
      const sel = ctx.sel ? dirCounts(ctx.rows.filter(ctx.sel.test)) : null;
      const top = Math.max(...all), N0 = ctx.rows.length;
      const rad = v => R * Math.sqrt(v / top);                // area of a petal ∝ count
      const tint = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
      const g = el('g', {}, D.svg);
      [0.25, 0.5, 1].forEach(f => {
        el('circle', { cx, cy, r: rad(f * top), style: 'fill:none;stroke:var(--rule);stroke-dasharray:3 3' }, g);
        const a = 0.31 * Math.PI, rr = rad(f * top);         // label each ring between NE and ENE, where the petals are short
        el('text', { x: cx + rr * Math.sin(a) + 3 * D.fs, y: cy - rr * Math.cos(a), class: 'val', style: 'fill:var(--ink-3)', text: `${Math.round(f * top)}` }, g);
      });
      const wedge = (k, r) => {
        const a0 = (k - 0.42) * Math.PI / 8, a1 = (k + 0.42) * Math.PI / 8;
        const p = a => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
        const [x0, y0] = p(a0), [x1, y1] = p(a1);
        return `M${cx} ${cy}L${x0} ${y0}A${r} ${r} 0 0 1 ${x1} ${y1}Z`;
      };
      range(16).forEach(k => {
        const pg = el('g', { class: 'ds-bar', tabindex: 0, role: 'button', 'aria-label': `${COMPASS[k]}: ${all[k]} readings` }, g);
        const dim = sel && !sel[k] ? 35 : 100;
        if (all[k]) el('path', { d: wedge(k, rad(all[k])), style: `fill:${tint(series(0), dim * 0.8)};stroke:var(--paper-3);stroke-width:1` }, pg);
        if (hl && hl[k]) el('path', { d: wedge(k, rad(hl[k])), style: `fill:${tint(series(1), dim)}` }, pg);
        if (sel && sel[k]) el('path', { d: wedge(k, rad(all[k])), style: 'fill:none;stroke:var(--c);stroke-width:2' }, pg);
        const lr = R + 16 * D.fs, a = k * Math.PI / 8;
        el('text', { x: cx + lr * Math.sin(a), y: cy - lr * Math.cos(a) + 4 * D.fs, 'text-anchor': 'middle', class: k % 4 ? 'val' : 'lbl', style: k % 2 ? 'fill:var(--ink-3)' : '', text: k % 2 && D.fs > 1.3 ? '' : COMPASS[k] }, pg);
        hover(pg, () => `<b>from ${COMPASS[k]}</b> · address <code>${addr(k)}</code><br>${all[k]} readings (${fmtPct(all[k] / N0, 1)})${hl ? `<br>${hl[k]} of them ${ctx.hl.label}` : ''}<br><span class="small">click to select</span>`);
        const pick = () => ctx.select({ label: `direction = ${COMPASS[k]}`, test: r => r.k === k });
        pg.addEventListener('click', pick);
        pg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });
      el('text', { x: 12, y: 22 * D.fs, class: 'annot', text: 'petal area ∝ readings' }, g);
    },
  };

  DS.define('wind', {
    rows() {
      const r = rng('si-wind');
      const vals = range(N).map(() => (r() < 0.025 ? r.int(40, 60) : Math.round(8 * Math.sqrt(-2 * Math.log(1 - r())))));
      const q = rng('ds-wind-order'), storms = STORMS;
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
      const dir = directions();
      return kn.map((v, i) => ({ day: Math.floor(i / 48) + 1, time: hhmm(i), t: i / 48, kn: v, force: beaufort(v), k: dir[i], dir: COMPASS[dir[i]], prev: i ? kn[i - 1] : null }));
    },
    columns: [
      { key: 'day', label: 'day' },
      { key: 'time', label: 'time' },
      { key: 'kn', label: 'knots' },
      { key: 'force', label: 'Beaufort name', left: true },
      { key: 'dir', label: 'from', left: true },
    ],
    csvColumns: ['day', 'time', 'kn', 'dir'],
    highlights: {
      gales: { label: 'gales (≥ 40 kn)', test: r => r.kn >= 40 },
      over30: { label: '> 30 kn', test: r => r.kn > 30 },
      over14: { label: '> 14 kn', test: r => r.kn > 14 },
      northeast: { label: 'from NNE, NE or ENE', test: r => r.k >= 1 && r.k <= 3 },
    },
    views: {
      timeline: DS.views.timeline({
        x: 't', y: 'kn', xlabel: 'day', ylabel: 'wind (knots)', xname: 'day', width: 1.2,
        xfmt: v => `${Math.floor(v) + 1}, ${hhmm(Math.round(v * 48))}`, yfmt: v => `${fmt(v, 0)} kn`,
        xticks: [0, 7, 14, 21], xtfmt: v => `day ${v + 1}`, ydomain: [0, 62], label: 'Three weeks',
      }),
      histogram: DS.views.histogram({ key: 'kn', xlabel: 'wind speed (knots)', ylabel: 'readings', unit: 'kn', noun: 'readings', domain: [0, 64], xticks: [0, 10, 20, 30, 40, 50, 60], label: 'How often each speed' }),
      rose,
      lag,
    },
    metrics: [
      { id: 'dirTop', label: 'most common direction', value: rows => { const c = dirCounts(rows); return c.indexOf(Math.max(...c)); },
        fmt: (v, rows) => `${COMPASS[v]} · ${fmtPct(dirCounts(rows)[v] / rows.length, 1)}`,
        note: (v, rows) => `One reading in ${fmt(rows.length / dirCounts(rows)[v], 1)} comes from ${COMPASS[v]}. If all sixteen directions were equally likely, it would be one in 16.` },
      { id: 'dirSW', label: 'from the south-west (SSW, SW, WSW)', value: rows => rows.filter(r => r.k >= 9 && r.k <= 11).length, fmt: (v, rows) => `${v} · ${fmtPct(v / rows.length, 0)}`,
        note: (v, rows) => `Three directions out of sixteen carry ${fmtPct(v / rows.length, 0)} of the readings: the prevailing wind off the open sea.` },
      { id: 'dirNE', label: 'from the north-east (NNE, NE, ENE)', value: rows => rows.filter(r => r.k >= 1 && r.k <= 3).length, fmt: (v, rows) => `${v} · ${fmtPct(v / rows.length, 1)}`,
        note: (v, rows) => `The opposite three directions: about ${fmt(rows.filter(r => r.k >= 9 && r.k <= 11).length / v, 0)} times rarer, and almost all of them from two short spells.` },
      { id: 'dirBits', label: 'questions per direction, at best', value: rows => entropy(nonzeroCounts(rows)), fmt: v => `${fmt(v, 2)} bits`,
        note: v => `A questioner who knows these odds can average about ${fmt(v, 2)} yes/no questions per reading instead of 4, by asking about the likely directions first. Page II.4 names this number (the entropy) and shows how to compute it.` },
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
      { id: 'r2prev', label: 'variance explained by the previous reading', tex: '\\vRsq', value: r2prev, fmt: v => fmtPct(v, 1),
        note: 'Wind speed carries on from one half hour to the next, so “the same as last time” explains most of its ups and downs — less than for the slow temperatures, because gusts come and go within the hour.' },
      { id: 'lagFormula', label: 'bits saved, by the exchange-rate formula', value: rows => 0.5 * Math.log2(1 / (1 - r2prev(rows))), fmt: v => `${fmt(v, 2)} bits`,
        note: 'What $\\tfrac12\\log_2\\frac{1}{1-\\vRsq}$ promises, if the readings and their residuals were bell-shaped.' },
      { id: 'lagSaved', label: 'bits saved, measured', value: rows => histH(rows.map(r => r.kn)) - histH(steps(rows).map(r => r.kn - r.prev)),
        fmt: (v, rows) => `${fmt(v, 2)} bits`,
        note: (v, rows) => `The histogram entropy drops from ${fmt(histH(rows.map(r => r.kn)), 2)} bits per reading to ${fmt(histH(steps(rows).map(r => r.kn - r.prev)), 2)} for the change since the last reading. Well short of the formula: the wind is not bell-shaped, and the storms' sudden jumps give the residuals fat tails.` },
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

d = wind["dir"].value_counts(normalize=True)   # the 16 compass directions
print(d.head(3))
print("directions:", -(d * np.log2(d)).sum().round(2), "bits at best, not 4")

r = np.diff(kn)                       # this reading minus the previous one
print("R2 of 'same as last time':", (1 - r.var() / kn.var()).round(3))
`,
  });
})();
