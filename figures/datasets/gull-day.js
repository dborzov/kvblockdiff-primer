// The day's twelve Gull Rock readings (14:30 to 20:00), five channels each: the vectors of II.13.
// The first three rows are the JSON messages of Part I (same generator and seed as figures/tiny.js);
// the top-of-mast thermometer is added with its own seed. Shown on II.13 (rows, columns, centring)
// and II.16 (the exactly reversible "average and difference" of the two thermometers).
(function () {
  const r1 = (v, d) => +v.toFixed(d);
  function tinyRng(seed) {
    let s = seed | 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function tinyGauss(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }

  // channel c = 0…4: key, label, unit, sensor step, decimals, series colour
  const CH = [
    { key: 'low', name: 'temperature, foot of mast', short: 'foot', unit: '°C', step: 0.1, dec: 1, s: 0 },
    { key: 'mast', name: 'temperature, top of mast', short: 'top', unit: '°C', step: 0.1, dec: 1, s: 3 },
    { key: 'hum', name: 'humidity', short: 'humidity', unit: '', step: 0.01, dec: 2, s: 2 },
    { key: 'pres', name: 'pressure', short: 'pressure', unit: 'hPa', step: 0.1, dec: 1, s: 4 },
    { key: 'wind', name: 'wind', short: 'wind', unit: 'kn', step: 1, dec: 0, s: 5 },
  ];
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const HL = series(1);

  // Fixed-length bits per value, per channel: every value is written as a whole number of sensor steps,
  // with a sign bit: 1 + ceil(log2(largest |step count| + 1)). mode: raw | centred | global.
  function widths(rows, mode) {
    const cols = CH.map(c => rows.map(r => r[c.key]));
    const mu = cols.map(mean), gmu = mean(cols.flat());
    return CH.map((c, j) => {
      const sh = mode === 'centred' ? mu[j] : mode === 'global' ? gmu : 0;
      const shq = r1(Math.round(sh / c.step) * c.step, c.dec);
      const top = Math.max(...cols[j].map(v => Math.abs(Math.round(r1(v - shq, c.dec) / c.step))));
      return 1 + Math.ceil(Math.log2(top + 1));
    });
  }
  const sd = a => Math.sqrt(variance(a));

  // Small multiples: one strip per channel, each with its own vertical scale; one column = one vector.
  function strips(box, ctx, o) {
    const rows = ctx.rows, n = rows.length;
    const D = Diagram(box, { w: 640, h: 400, label: o.title });
    const fs = D.fs, L = 12, R = 628, g = el('g', {}, D.svg);
    const X = i => L + 8 + (R - L - 16) * i / (n - 1);
    let y = 4;
    const bands = [];
    o.strips.forEach(s => {
      const vals = rows.flatMap(r => s.keys.map(k => r[k]));
      const [a, b] = extent(vals), pad = (b - a) * 0.14 || 1, lo = a - pad, hi = b + pad;
      el('text', { x: L, y: y + 12 * fs, class: 'lbl', text: s.label }, g);
      el('text', { x: R, y: y + 12 * fs, 'text-anchor': 'end', class: 'val', text: `${s.fmt(a)} … ${s.fmt(b)}${s.unit ? ' ' + s.unit : ''}` }, g);
      y += 18 * fs;
      const top = y, hh = (o.sh || 50) * (1 + (fs - 1) * 0.5);
      const Y = v => top + hh - (v - lo) / (hi - lo) * hh;
      el('rect', { x: L, y: top, width: R - L, height: hh, rx: 4, style: `fill:${mix('var(--ink)', 4)};stroke:${mix('var(--rule)', 60)}` }, g);
      s.keys.forEach((k, j) => {
        el('path', { d: rows.map((r, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(r[k]).toFixed(1)}`).join(''), style: `fill:none;stroke:${s.colors[j]};stroke-width:${o.lw || 1.8};stroke-linejoin:round` }, g);
        if (n <= 48) rows.forEach((r, i) => el('circle', { cx: X(i), cy: Y(r[k]), r: 2.6 * fs, style: `fill:${s.colors[j]}` }, g));
      });
      bands.push({ top, hh, Y, s });
      y = top + hh + 8 * fs;
    });
    const gx = el('g', {}, D.svg);
    (o.xticks || []).forEach(([i, t]) => el('text', { x: X(i), y: y + 8 * fs, 'text-anchor': 'middle', class: 'val', text: t }, gx));
    if (o.xlabel) el('text', { x: (L + R) / 2, y: y + 26 * fs, 'text-anchor': 'middle', class: 'lbl', text: o.xlabel }, gx);
    const H = y + (o.xlabel ? 34 : 16) * fs;
    D.svg.setAttribute('viewBox', `0 0 640 ${H}`);
    // highlighted and selected readings
    const gm = el('g', {}, D.svg);
    rows.forEach((r, i) => {
      if (ctx.sel && ctx.sel.test(r)) el('rect', { x: X(i) - 4, y: 18 * fs, width: 8, height: y - 18 * fs, rx: 3, style: `fill:${mix('var(--c)', 22)}` }, gm);
      if (ctx.hl && ctx.hl.test(r)) bands.forEach(b => b.s.keys.forEach(k => dot(gm, X(i), b.Y(r[k]), 3.6 * fs, HL)));
    });
    // hover / tap anywhere: the guide marks one column, the tooltip reads it as one vector
    const guide = el('line', { y1: 18 * fs, y2: y, style: 'stroke:var(--ink-2);stroke-width:1;stroke-dasharray:3 3', visibility: 'hidden' }, D.svg);
    const hit = el('rect', { x: L, y: 0, width: R - L, height: H, class: 'hit', tabindex: 0, role: 'button', 'aria-label': 'Read one reading (one column) as a vector' }, D.svg);
    let cur = 0;
    const at = e => {
      if (e && e.clientX != null) { const bb = D.svg.getBoundingClientRect(); cur = clamp(Math.round(((e.clientX - bb.left) / bb.width * 640 - L - 8) / (R - L - 16) * (n - 1)), 0, n - 1); }
      guide.setAttribute('x1', X(cur)); guide.setAttribute('x2', X(cur)); guide.setAttribute('visibility', 'visible');
      return cur;
    };
    hover(hit, e => o.tip(rows[at(e)], at(e)) + '<br><span class="small">click to select this reading</span>');
    hit.addEventListener('pointerleave', () => guide.setAttribute('visibility', 'hidden'));
    const pick = () => { const r = rows[cur]; ctx.select({ label: o.selLabel(r), test: q => q === r }); };
    hit.addEventListener('click', e => { at(e); pick(); });
    hit.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); cur = clamp(cur + (e.key === 'ArrowRight' ? 1 : -1), 0, n - 1); at(); showTip(hit, o.tip(rows[cur], cur)); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
    });
    return D;
  }

  const vecTip = r => `<b>${r.time}</b> — one vector, ${tex('\\vd = 5')}<br>` + CH.map((c, j) => `${tex('\\vx_' + j)} = ${r[c.key].toFixed(c.dec)} ${c.unit}`).join('<br>');

  DS.define('gull-day', {
    rows() {
      const r = tinyRng(7), N = () => tinyGauss(r), rm = tinyRng(1313);
      let T = 11.4, Hm = 0.82, P = 1012.6, W = 14;
      return range(12).map(i => {
        const mins = 14 * 60 + 30 + 30 * i;
        const low = r1(T, 1);
        const row = {
          i, time: `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`,
          low, mast: r1(low - 0.5 + 0.12 * tinyGauss(rm), 1), hum: r1(Hm, 2), pres: r1(P, 1), wind: W,
        };
        T += -0.05 + 0.18 * N();
        Hm = Math.min(0.99, Math.max(0.6, Hm + 0.006 + 0.012 * N()));
        P += -0.35 + 0.15 * N();
        W = Math.max(3, Math.round(W + 0.3 + 1.1 * N()));
        r();                                   // Part I's wind-direction draw: keeps the stream aligned
        return row;
      });
    },
    columns: [
      { key: 'time', label: 'time' },
      ...CH.map((c, j) => ({ key: c.key, label: `${j}: ${c.short}${c.unit ? ' (' + c.unit + ')' : ''}`, fmt: v => v.toFixed(c.dec) })),
    ],
    csvColumns: ['time', 'low', 'mast', 'hum', 'pres', 'wind'],
    highlights: {
      partI: { label: 'the three messages of Part I', test: r => r.i < 3 },
    },
    views: {
      channels: {
        label: 'Five channels',
        draw(box, ctx) {
          strips(box, ctx, {
            title: 'The five channels of the day, each on its own scale',
            strips: CH.map((c, j) => ({ keys: [c.key], colors: [series(c.s)], label: `channel ${j} · ${c.name}`, unit: c.unit, fmt: v => v.toFixed(c.dec) })),
            xticks: ctx.rows.filter((r, i) => i % 2 === 0).map(r => [r.i, r.time]), xlabel: 'time of the reading',
            tip: vecTip, selLabel: r => `the reading at ${r.time}`,
          });
          box.append(h('p', { class: 'fig-note', text: 'Each strip is one channel (a column of the table), drawn on its own scale. A vertical slice through all five strips is one reading — one vector. Hover or tap to read it; click to select it.' }));
        },
      },
      oneaxis: {
        label: 'All on one scale',
        draw(box, ctx) {
          box.append(legend(CH.map((c, j) => [`${j}: ${c.short}`, series(c.s)])));
          const b = h('div'); box.append(b);
          const P = Plot(b, { x: [0, 11], y: [0, 1100], h: 280, xlabel: 'time of the reading', ylabel: 'value in its own unit', xticks: [0, 2, 4, 6, 8, 10], xfmt: v => (ctx.rows[v] || {}).time || '', label: 'All five channels drawn against one shared vertical axis' });
          CH.forEach(c => line(P, ctx.rows.map(r => [r.i, r[c.key]]), { color: series(c.s), markers: 2.4, tip: p => `${c.name}: ${fmt(p[1], c.dec)} ${c.unit}` }));
          if (ctx.hl) ctx.rows.filter(ctx.hl.test).forEach(r => CH.forEach(c => dot(P.g.data, P.x(r.i), P.y(r[c.key]), 3.6 * P.fs, HL)));
          annotate(P, 6, 1010, 'pressure, near 1011 hPa', { dx: -10, dy: 44 });
          annotate(P, 8, 16, 'temperatures, humidity and wind:\nall squashed near zero', { dx: -40, dy: -90 });
          box.append(h('p', { class: 'fig-note', text: 'The same twelve readings with one shared axis. Read across a row and the numbers have nothing in common: one shift or one scale cannot suit them all.' }));
        },
      },
      lift: {
        label: 'Lifted: s and d',
        draw(box, ctx) {
          const rows = ctx.rows.map(r => {
            const foot = Math.round(r.low * 10), top = Math.round(r.mast * 10), d = top - foot;
            return { r, foot, top, d, s: foot + Math.floor(d / 2) };
          });
          box.append(legend([['foot (tenths of °C)', series(0)], ['top (tenths of °C)', series(3)], [tex('s') + ' = foot + ⌊d/2⌋', series(6), 'dash'], [tex('d') + ' = top − foot', series(1), 'box']]));
          const b1 = h('div'), b2 = h('div'); box.append(b1, b2);
          const xo = { x: [-0.5, 11.5], xticks: [0, 2, 4, 6, 8, 10], xfmt: v => (ctx.rows[v] || {}).time || '' };
          const P1 = Plot(b1, { ...xo, y: [104, 124], h: 230, ylabel: 'tenths of °C', label: 'The two thermometers and s, in tenths of a degree' });
          line(P1, rows.map((q, i) => [i, q.foot]), { color: series(0), markers: 2.6, tip: p => `foot ${p[1]}` });
          line(P1, rows.map((q, i) => [i, q.top]), { color: series(3), markers: 2.6, tip: p => `top ${p[1]}` });
          line(P1, rows.map((q, i) => [i, q.s]), { color: series(6), dash: true, width: 1.6 });
          const P2 = Plot(b2, { ...xo, y: [-10, 1], h: 180, xlabel: 'time of the reading', ylabel: 'd (tenths)', yticks: [-8, -6, -4, -2, 0], label: 'The difference d, on the same scale' });
          rule(P2, { y: 0, dash: false, color: 'var(--ink-3)' });
          rows.forEach((q, i) => {
            const bw = Math.min(18 * P2.fs, (P2.x(1) - P2.x(0)) * 0.7), rr = el('rect', { x: P2.x(i) - bw / 2, width: bw, y: P2.y(0), height: P2.y(q.d) - P2.y(0), rx: 3, style: `fill:${mix(series(1), 70)}` }, P2.g.data);
            hover(rr, () => `<b>${q.r.time}</b><br>foot ${q.foot}, top ${q.top}<br>d = ${q.top} − ${q.foot} = ${q.d}<br>s = ${q.foot} + ⌊${q.d}/2⌋ = ${q.s}`);
            el('text', { x: P2.x(i), y: P2.y(q.d) + 14 * P2.fs, 'text-anchor': 'middle', class: 'val', text: fmt(q.d) }, P2.g.data);
          });
          box.append(h('p', { class: 'fig-note', text: 'Top: the twelve readings in whole tenths of a degree, with s (roughly the average) riding along between them. Bottom, on the same scale: d (exactly the difference), a narrow band of small numbers. Hover a bar for the arithmetic.' }));
        },
      },
    },
    metrics: [
      { id: 'shape', label: 'vectors × elements', value: rows => rows.length, fmt: v => `${v} × 5`,
        note: v => `${v} readings (rows, vectors), each with $\\vd = 5$ elements in a fixed order. Read across and you get one reading; read down and you get one channel — one sensor's afternoon.` },
      { id: 'means', label: 'channel means $\\vmu_{\\vc}$', value: rows => CH.map(c => mean(rows.map(r => r[c.key]))),
        fmt: v => v.map((m, j) => m.toFixed(j === 2 ? 3 : 2)).join(' · '),
        note: 'Foot, top, humidity, pressure, wind. Every sensor sits at its own typical value: a pressure near 1011 hPa, a humidity near 0.85. No single number is typical of all five.' },
      { id: 'spreads', label: 'channel spreads $\\vsigma_{\\vc}$', value: rows => CH.map(c => sd(rows.map(r => r[c.key]))),
        fmt: v => v.map((s, j) => s.toFixed(j === 2 ? 3 : 2)).join(' · '),
        note: v => `Each channel moves by its own amount too: a few tenths of a degree, two hundredths of humidity, about ${fmt(v[3], 1)} hPa, about ${fmt(v[4], 0)} knots. Location and scale both belong to the channel.` },
      { id: 'bits-raw', label: 'fixed-length bits per reading, as measured', value: rows => widths(rows, 'raw'), fmt: v => `${v.join(' + ')} = ${sum(v)}`,
        note: 'Each value written as whole sensor steps, plus a sign bit. The barometer alone takes 15 bits: 1012.6 hPa is 10,126 steps of 0.1 hPa, and almost all of that number is the same in every reading.' },
      { id: 'bits-centred', label: 'bits per reading, minus each channel’s mean', value: rows => widths(rows, 'centred'), fmt: v => `${v.join(' + ')} = ${sum(v)}`,
        note: (v, rows) => `Subtract each channel's own mean (rounded to its step) and every column shrinks to a few steps around zero: ${sum(widths(rows, 'raw'))} → ${sum(v)} bits. The pressure drops from 15 bits to ${v[3]}.` },
      { id: 'bits-global', label: 'bits per reading, minus one mean of all 60 numbers', value: rows => widths(rows, 'global'), fmt: v => `${v.join(' + ')} = ${sum(v)}`,
        note: (v, rows) => `One shared shift of ${fmt(mean(CH.flatMap(c => rows.map(r => r[c.key]))), 1)} is wrong for every channel at once: a humidity of 0.82 becomes −209.32 and needs ${v[2]} bits. Worse than doing nothing.` },
      { id: 'lift-d', label: 'the difference $d$ = top − foot, in tenths', value: rows => rows.map(r => Math.round(r.mast * 10) - Math.round(r.low * 10)),
        fmt: v => `${fmt(Math.min(...v))} … ${fmt(Math.max(...v))}`,
        note: (v, rows) => `Only ${new Set(v).size} different values in a band ${Math.max(...v) - Math.min(...v) + 1} tenths wide, while the foot thermometer alone spans ${Math.round(Math.min(...rows.map(r => r.low)) * 10)} to ${Math.round(Math.max(...rows.map(r => r.low)) * 10)} tenths. The quiet direction of the KLT, in whole numbers.` },
      { id: 'lift-exact', label: 'readings recovered exactly from $(s, d)$', value: rows => rows.filter(r => {
          const f = Math.round(r.low * 10), t = Math.round(r.mast * 10), d = t - f, s = f + Math.floor(d / 2), f2 = s - Math.floor(d / 2);
          return f2 === f && f2 + d === t;
        }).length, fmt: (v, rows) => `${v} of ${rows.length}`,
        note: 'Undo the two lifting steps in reverse order — foot = s − ⌊d/2⌋, then top = foot + d — and every reading comes back bit for bit. No rounding error survives.' },
    ],
    code: `
import numpy as np, pandas as pd

day = pd.read_csv("{csv}")                      # columns: time, low, mast, hum, pres, wind
step = {"low": 0.1, "mast": 0.1, "hum": 0.01, "pres": 0.1, "wind": 1}
X = day[list(step)]
print(X.mean().round(3).to_dict())             # channel means
print(X.std(ddof=0).round(3).to_dict())        # channel spreads

def bits(shift):                               # fixed-length bits per value, with a sign bit
    out = []
    for c, s in step.items():
        sh = round(shift[c] / s) * s
        k = np.rint((X[c] - sh) / s).abs().max()
        out.append(1 + int(np.ceil(np.log2(k + 1))))
    return out

print(bits({c: 0 for c in step}), "as measured")
print(bits(X.mean()), "minus each channel's mean")
print(bits({c: X.to_numpy().mean() for c in step}), "minus one mean of all 60 numbers")

foot, top = np.rint(X["low"] * 10).astype(int), np.rint(X["mast"] * 10).astype(int)
d = top - foot; s = foot + d // 2               # lifting: exactly reversible on whole numbers
assert ((s - d // 2) == foot).all() and ((s - d // 2 + d) == top).all()
print("d:", d.min(), "...", d.max())
`,
  });
})();
