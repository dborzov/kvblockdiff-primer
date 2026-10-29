// Gull Rock fine readings: the first twelve half-hours (28 Oct 14:30–20:00) as the instruments measured them,
// finer than the messages round them: temperature to 0.01 °C, humidity to 0.1 %, pressure to 0.01 hPa,
// wind to 0.1 kn. Derived from 'station-messages': each value is the message's value plus a seeded jitter
// (seed 29, mulberry32) that stays inside the message's rounding interval. Row field `v` holds the four
// readings as integers counted in each sensor's smallest step (as stored in binary, page I.5).
(function () {
  const COLS = [
    { key: 'temp', name: 'temperature', unit: '°C', step: 0.01, dp: 2 },
    { key: 'hum', name: 'humidity', unit: '%', step: 0.1, dp: 1 },
    { key: 'pres', name: 'pressure', unit: 'hPa', step: 0.01, dp: 2 },
    { key: 'wind', name: 'wind', unit: 'kn', step: 0.1, dp: 1 },
  ];
  function mulberry(seed) {
    let s = seed | 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const typical = rows => COLS.map((_, c) => Math.round(avg(rows.map(r => r.v[c]))));
  const bitsU = v => Math.ceil(Math.log2(v + 1));
  const bitsS = m => 1 + Math.ceil(Math.log2(m + 1));
  const bitsRaw = rows => COLS.map((_, c) => bitsU(Math.max(...rows.map(r => r.v[c]))));
  const bitsMean = rows => { const t = typical(rows); return COLS.map((_, c) => bitsS(Math.max(...rows.map(r => Math.abs(r.v[c] - t[c]))))); };
  const bitsPrev = rows => COLS.map((_, c) => bitsS(Math.max(...rows.slice(1).map((r, i) => Math.abs(r.v[c] - rows[i].v[c])))));
  const sum = a => a.reduce((x, y) => x + y, 0);
  function asBytes(rows) {   // 2 + 2 + 3 + 2 bytes per row, big-endian
    const b = [];
    rows.forEach(({ v: [t, hu, p, w] }) => b.push(t >> 8, t & 255, hu >> 8, hu & 255, p >> 16, (p >> 8) & 255, p & 255, w >> 8, w & 255));
    return Uint8Array.from(b);
  }
  const PANEL = { temp: [11.2, 12.35], hum: [80, 91], pres: [1008.8, 1013], wind: [13, 19.5] };
  const YT = { temp: [11.5, 12], hum: [82, 86, 90], pres: [1010, 1012], wind: [14, 16, 18] };

  // four small panels, one per instrument, on a shared time axis. mode 'measured': the reading (dots) and the
  // value the message sends (grey step); mode 'leftover': the typical value (gold, dashed) and each row's leftover (stick).
  const strips = mode => ({
    label: mode === 'measured' ? 'As measured' : 'Minus the typical value',
    draw(box, ctx) {
      const rows = ctx.rows, n = rows.length, typ = typical(rows), tall = box.clientWidth > 0 && box.clientWidth < 520 ? 1.6 : 1;
      box.append(legend(mode === 'measured'
        ? [['the reading, as measured', series(0), 'dot'], ['the value in the message (rounded)', 'var(--ink-3)', 'line']]
        : [['the typical value (the dictionary)', 'var(--t-dictionary)', 'dash'], ['each row’s leftover', series(0), 'line']]));
      COLS.forEach((c, k) => {
        const last = k === COLS.length - 1, b = h('div');
        box.append(b);
        const P = Plot(b, {
          x: [-0.5, n - 0.5], y: PANEL[c.key], h: (last ? 112 : 84) * tall, m: { l: 64, r: 14, t: 8, b: last ? 30 : 6 }, grid: 'y', yticks: YT[c.key],
          xticks: range(n).filter(i => i % 2 === 0), xfmt: i => (last ? rows[i].time : ''), ylabel: c.unit, label: `${c.name} readings, ${c.unit}`,
        });
        const val = r => r.v[k] * c.step;
        if (ctx.sel) rows.forEach((r, i) => { if (ctx.sel.test(r)) el('rect', { x: P.x(i - 0.5), width: P.x(1) - P.x(0), y: P.m.t, height: P.ph, style: 'fill:color-mix(in srgb, var(--c) 14%, transparent)' }, P.g.bg); });
        el('text', { x: P.m.l + 6 * P.fs, y: P.m.t + 11 * P.fs, class: 'lbl', text: c.name }, P.g.top);
        if (mode === 'measured') rows.forEach((r, i) => el('line', { x1: P.x(i - 0.4), x2: P.x(i + 0.4), y1: P.y(r.msg[k]), y2: P.y(r.msg[k]), style: `stroke:var(--ink-3);stroke-width:${2 * P.fs}` }, P.g.data));
        else {
          rule(P, { y: typ[k] * c.step, label: `typical ${(typ[k] * c.step).toFixed(c.dp)}`, color: 'var(--t-dictionary)' });
          rows.forEach((r, i) => el('line', { x1: P.x(i), x2: P.x(i), y1: P.y(typ[k] * c.step), y2: P.y(val(r)), style: `stroke:${series(0)};stroke-width:${2.4 * P.fs}` }, P.g.data));
        }
        rows.forEach((r, i) => {
          const d = dot(P.g.data, P.x(i), P.y(val(r)), 3.2 * P.fs, ctx.hl && ctx.hl.test(r) ? series(1) : series(0));
          hover(d, () => `<b>${r.time}</b>, ${c.name}<br>measured ${val(r).toFixed(c.dp)} ${c.unit}<br>in the message ${r.msg[k]} ${c.unit}<br>leftover ${(r.v[k] - typ[k] >= 0 ? '+' : '−') + (Math.abs(r.v[k] - typ[k]) * c.step).toFixed(c.dp)}`);
        });
      });
    },
  });

  DS.define('fine-readings', {
    rows() {
      const r = mulberry(29);
      return DS.rows('station-messages').slice(0, 12).map(m => {
        const j = s => (r() - 0.5) * 0.88 * s;
        const v = [Math.round((m.temp_c + j(0.1)) * 100), Math.round((m.humidity * 100 + j(1)) * 10),
          Math.round((m.pressure_hpa + j(0.1)) * 100), Math.round((m.wind_kn + j(1)) * 10)];
        return { time: m.when.slice(-5), when: m.when, v, temp: v[0] / 100, hum: v[1] / 10, pres: v[2] / 100, wind: v[3] / 10,
          msg: [m.temp_c, m.humidity * 100, m.pressure_hpa, m.wind_kn] };
      });
    },
    columns: [
      { key: 'time', label: 'time', left: true },
      { key: 'temp', label: '°C', fmt: v => v.toFixed(2) },
      { key: 'hum', label: 'humidity %', fmt: v => v.toFixed(1) },
      { key: 'pres', label: 'hPa', fmt: v => v.toFixed(2) },
      { key: 'wind', label: 'wind kn', fmt: v => v.toFixed(1) },
    ],
    csvColumns: ['time', 'temp', 'hum', 'pres', 'wind'],
    highlights: {},
    views: { measured: strips('measured'), leftover: strips('leftover') },
    helpers: { COLS, typical, bitsRaw, bitsMean, bitsPrev, asBytes },   // used by FIG.numberRows (figures/tiny.js)
    metrics: [
      { id: 'equal', label: 'numbers equal to the one above', value: rows => sum(rows.slice(1).map((r, i) => r.v.filter((x, c) => x === rows[i].v[c]).length)),
        fmt: (v, rows) => `${v} of ${(rows.length - 1) * 4}`, note: 'Exact repeats are what a copy-from-earlier compressor feeds on. Here there are almost none: the readings drift by hundredths, and the last digits jitter.' },
      { id: 'deflate', label: 'as binary numbers, DEFLATE', value: rows => {
          if (!window.pako) throw new Error('metric "deflate" of dataset "fine-readings" needs pako (vendor: [pako.min.js])');
          return window.pako.deflateRaw(asBytes(rows), { level: 9 }).length;
        }, fmt: (v, rows) => `${asBytes(rows).length} B → ${v} B`,
        note: '9 bytes per row (2 + 2 + 3 + 2). DEFLATE finds nothing to copy, so nothing is gained: alike in value is not alike in bytes.' },
      { id: 'typical', label: 'typical values (the dictionary)', value: rows => typical(rows), fmt: v => v.map((x, c) => `${(x * COLS[c].step).toFixed(COLS[c].dp)} ${COLS[c].unit}`).join(' · '),
        note: 'Each column’s average over the twelve rows, rounded to the sensor’s step. Four numbers, sent once, shared by every row.' },
      { id: 'bitsraw', label: 'binary digits per row, as measured', value: rows => sum(bitsRaw(rows)), fmt: (v, rows) => `${v} · ${bitsRaw(rows).join(' + ')}`,
        note: 'Enough digits to count up to each column’s largest reading: the pressure alone, counted in hundredths, needs 17.' },
      { id: 'bitsmean', label: 'per row, minus the typical value', value: rows => sum(bitsMean(rows)), fmt: (v, rows) => `${v} · ${bitsMean(rows).join(' + ')}`,
        note: (v, rows) => `Each leftover needs only enough digits for the largest miss, plus a sign: ${fmtPct(1 - v / sum(bitsRaw(rows)), 0)} fewer than as measured. The dictionary carries what the rows share.` },
      { id: 'bitsprev', label: 'per row, minus the row above', value: rows => sum(bitsPrev(rows)), fmt: (v, rows) => `${v} · ${bitsPrev(rows).join(' + ')}`,
        note: 'A better guess for slowly drifting weather — but each row now depends on the one before, like the chain of page I.4.' },
    ],
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("{csv}")                             # time, temp, hum, pres, wind
step = np.array([0.01, 0.1, 0.01, 0.1])              # each sensor's smallest step
rows = np.round(d[["temp", "hum", "pres", "wind"]].to_numpy() / step).astype(int)

print("equal to the number above:", (rows[1:] == rows[:-1]).sum(), "of", rows[1:].size)

def digits(m):                                       # binary digits needed for 0..m
    return np.ceil(np.log2(m + 1)).astype(int)

typical = np.round(rows.mean(axis=0)).astype(int)    # the dictionary: 4 numbers
print("typical:", typical * step)
print("bits per row as measured:", digits(rows.max(axis=0)).sum())
print("minus the typical value:", (1 + digits(np.abs(rows - typical).max(axis=0))).sum())
print("minus the row above:", (1 + digits(np.abs(np.diff(rows, axis=0)).max(axis=0))).sum())
`,
  });
})();
