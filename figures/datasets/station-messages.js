// Gull Rock station messages: the first two days of the station's radio archive, 96 compact JSON messages,
// one every 30 minutes from 28 Oct 2026 14:30Z to 30 Oct 14:00Z. A storm comes in: the pressure falls 34 hPa,
// the wind rises from 14 to 51 knots and veers from SW to W, the sky goes from overcast to heavy rain.
// The generator (seed 7, its own mulberry32 + Box–Muller, run message by message) is the one Part I has always
// used, so every byte count quoted in Part I is unchanged. Part I's figures read these rows (figures/tiny.js).
// Each row keeps `sent` (the field values as strings, exactly as written into the message) and `json` (the message).
(function () {
  const N = 96;
  const KEYS = ['station', 'time', 'temp_c', 'humidity', 'pressure_hpa', 'wind_kn', 'wind_dir', 'sky'];
  const STRING_KEYS = new Set(['station', 'time', 'wind_dir', 'sky']);
  const SKIES = ['overcast', 'light rain', 'rain', 'heavy rain'];
  function mulberry(seed) {
    let s = seed | 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gaussian(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  function generate(n) {
    const r = mulberry(7), G = () => gaussian(r);
    let T = 11.4, Hm = 0.82, P = 1012.6, W = 14, di = 0, sky = 'overcast';
    const dirs = ['SW', 'SW', 'WSW', 'W'];
    const out = [];
    for (let i = 0; i < n; i++) {
      const mins = 14 * 60 + 30 + 30 * i;
      const day = 28 + Math.floor(mins / 1440), hh = Math.floor(mins / 60) % 24, mm = mins % 60;
      out.push({
        station: 'gull-rock',
        time: `2026-10-${day}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}Z`,
        temp_c: T.toFixed(1), humidity: Hm.toFixed(2), pressure_hpa: P.toFixed(1),
        wind_kn: String(W), wind_dir: dirs[di], sky,
      });
      T += -0.05 + 0.18 * G();
      Hm = Math.min(0.99, Math.max(0.6, Hm + 0.006 + 0.012 * G()));
      P += -0.35 + 0.15 * G();
      W = Math.max(3, Math.round(W + 0.3 + 1.1 * G()));
      if (r() < 0.12 && di < 3) di++;
      if (i === 9) sky = 'light rain'; else if (i === 21) sky = 'rain'; else if (i === 33) sky = 'heavy rain';
    }
    return out;
  }
  // a message's fields as written: {key, head: '{"key":' or ',"key":', value: '"text"' or '12.0'}
  const fields = rec => KEYS.map(k => ({ key: k, head: `${k === 'station' ? '{' : ','}"${k}":`, value: STRING_KEYS.has(k) ? `"${rec[k]}"` : rec[k] }));
  const compact = rec => fields(rec).map(f => f.head + f.value).join('') + '}';
  // characters of the values that differ from the same position in the previous message (the count of Plate I.1·1)
  function newChars(rec, prev) {
    const a = fields(rec), b = fields(prev);
    let n = 0;
    a.forEach((f, k) => [...f.value].forEach((ch, j) => { if (b[k].value[j] !== ch) n++; }));
    return n;
  }
  const when = rec => `${+rec.time.slice(8, 10)} Oct ${rec.time.slice(11, 16)}`;

  /* ---- the weather view: sky band + pressure, wind and temperature, one panel each, one shared time axis */
  const TICKS = [0, 19, 43, 67, 91];
  const TICKNAME = { 0: '28 Oct 14:30', 19: '29 Oct', 43: 'noon', 67: '30 Oct', 91: 'noon' };
  const skyColor = s => `color-mix(in srgb, var(--sky) ${[12, 30, 52, 78][SKIES.indexOf(s)]}%, var(--paper-3))`;
  const weatherView = {
    label: 'The weather',
    draw(box, ctx) {
      const rows = ctx.rows, n = rows.length;
      const M = { l: 62, r: 18, t: 10, b: 8 };
      const panels = [
        { key: 'pressure_hpa', name: 'pressure', unit: 'hPa', y: [975, 1016], yticks: [980, 990, 1000, 1010], col: series(0), dp: 1 },
        { key: 'wind_kn', name: 'wind', unit: 'kn', y: [0, 56], yticks: [0, 20, 40], col: series(2), dp: 0 },
        { key: 'temp_c', name: 'temperature', unit: '°C', y: [5.5, 13], yticks: [6, 8, 10, 12], col: series(1), dp: 1 },
      ];
      const plots = [];
      // sky band: one coloured cell per message, the sky named where it changes
      const sky = Plot(appendBox(box), { x: [-0.5, n - 0.5], y: [0, 1], h: 46, m: { ...M, t: 4, b: 4 }, xticks: [], yticks: [], grid: false, ylabel: 'sky', label: 'Sky reported in each message' });
      rows.forEach(r => el('rect', { x: sky.x(r.i - 0.5), width: sky.x(r.i + 0.5) - sky.x(r.i - 0.5) + 0.4, y: sky.y(1), height: sky.y(0) - sky.y(1), style: `fill:${skyColor(r.sky)}` }, sky.g.data));
      rows.forEach((r, k) => {
        if (k && r.sky === rows[k - 1].sky) return;
        const end = rows.findIndex((q, j) => j > k && q.sky !== r.sky);
        const mid = (r.i + (end < 0 ? n : end) - 1) / 2;
        if ((end < 0 ? n : end) - k < 6) return;
        el('text', { x: sky.x(mid), y: sky.y(0.5) + 4 * sky.fs, 'text-anchor': 'middle', class: 'lbl', text: r.sky }, sky.g.top);
      });
      plots.push(sky);
      panels.forEach((p, k) => {
        const last = k === panels.length - 1;
        const P = Plot(appendBox(box), {
          x: [-0.5, n - 0.5], y: p.y, h: last ? 128 : 100, m: { ...M, b: last ? 30 : 8 }, xticks: TICKS, xfmt: v => (last ? TICKNAME[v] : ''),
          yticks: p.yticks, ylabel: `${p.name} (${p.unit})`, grid: true, label: `${p.name} in each message, ${p.unit}`,
        });
        if (ctx.sel) rows.forEach(r => { if (ctx.sel.test(r)) el('rect', { x: P.x(r.i - 0.5), width: P.x(r.i + 0.5) - P.x(r.i - 0.5), y: P.m.t, height: P.ph, style: 'fill:color-mix(in srgb, var(--c) 16%, transparent)' }, P.g.bg); });
        line(P, rows.map(r => [r.i, r[p.key]]), { color: p.col, width: 1.8, curve: p.key === 'wind_kn' ? 'step' : 'linear' });
        if (ctx.hl) rows.forEach(r => { if (ctx.hl.test(r)) dot(P.g.data, P.x(r.i), P.y(r[p.key]), 3 * P.fs, series(1)); });
        if (p.key === 'wind_kn') rows.forEach((r, j) => {
          if (j && r.wind_dir === rows[j - 1].wind_dir) return;
          el('text', { x: P.x(r.i), y: P.y(r.wind_kn) - 9 * P.fs, 'text-anchor': j ? 'middle' : 'start', class: 'lbl', text: `from ${r.wind_dir}` }, P.g.top);
        });
        ctx.marks.filter(m => m.key === p.key).forEach(m => rule(P, { y: m.value, label: `${m.label}: ${fmt(m.value)}`, color: 'var(--ink-2)' }));
        plots.push(P);
      });
      scrub(plots, ctx, rows, r => `<b>${r.when}</b><br>${r.sky}, wind ${r.wind_kn} kn from ${r.wind_dir}<br>${r.pressure_hpa.toFixed(1)} hPa, ${r.temp_c.toFixed(1)} °C, humidity ${r.humidity.toFixed(2)}`);
    },
  };
  function appendBox(box) { const b = h('div'); box.append(b); return b; }

  // One overlay per panel: hover (or arrow keys) shows the message under the pointer, with a guide line in every
  // panel; drag across to select a stretch of messages; click selects one message.
  function scrub(plots, ctx, rows, tip) {
    const guides = plots.map(P => el('line', { y1: P.m.t, y2: P.H - P.m.b, style: 'stroke:var(--ink-2);stroke-width:1;stroke-dasharray:3 3', visibility: 'hidden' }, P.g.top));
    const show = i => guides.forEach((g, k) => { const x = plots[k].x(i); g.setAttribute('x1', x); g.setAttribute('x2', x); g.setAttribute('visibility', 'visible'); });
    const hide = () => { guides.forEach(g => g.setAttribute('visibility', 'hidden')); hideTip(); };
    const at = (P, e) => clamp(Math.round(P.toData(e)[0]), rows[0].i, rows[rows.length - 1].i);
    const byI = new Map(rows.map(r => [r.i, r]));
    plots.forEach(P => {
      const hit = el('rect', { x: P.m.l, y: P.m.t, width: P.pw, height: P.ph, class: 'hit ds-brush-hit', tabindex: 0, role: 'slider', 'aria-label': 'Move through the messages with the arrow keys; Enter selects one' }, P.g.top);
      const band = el('rect', { y: P.m.t, height: P.ph, visibility: 'hidden', style: 'fill:color-mix(in srgb, var(--c) 14%, transparent);stroke:var(--c)' }, P.g.top);
      let a = null, cur = rows[0].i;
      hit.addEventListener('pointerdown', e => { a = at(P, e); hit.setPointerCapture(e.pointerId); });
      hit.addEventListener('pointermove', e => {
        const i = at(P, e);
        show(i); showTip(e, tip(byI.get(i)));
        if (a != null && i !== a) {
          const [x0, x1] = [Math.min(a, i), Math.max(a, i)];
          band.setAttribute('x', P.x(x0 - 0.5)); band.setAttribute('width', P.x(x1 + 0.5) - P.x(x0 - 0.5)); band.setAttribute('visibility', 'visible');
        }
      });
      hit.addEventListener('pointerup', e => {
        if (a == null) return;
        const b = at(P, e), [x0, x1] = [Math.min(a, b), Math.max(a, b)];
        a = null; band.setAttribute('visibility', 'hidden');
        const r0 = byI.get(x0), r1 = byI.get(x1);
        ctx.select(x0 === x1 ? { label: `the message of ${r0.when}`, test: r => r.i === x0 }
          : { label: `messages ${r0.when} to ${r1.when}`, test: r => r.i >= x0 && r.i <= x1 });
      });
      hit.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hide(); });
      hit.addEventListener('blur', hide);
      hit.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          cur = clamp(cur + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 8 : 1), rows[0].i, rows[rows.length - 1].i);
          show(cur); showTip(hit, tip(byI.get(cur)));
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const r = byI.get(cur);
          ctx.select({ label: `the message of ${r.when}`, test: q => q.i === cur });
        }
      });
    });
  }

  /* ---- the messages view: the radio log itself, one compact message per line, coloured like code.
     Styles are inline because the card may appear on pages that do not load Part I's stylesheet. */
  const ST = {
    log: 'max-height:21rem;overflow:auto;background:var(--code-bg);color:var(--code-fg);border-radius:10px;padding:.45rem .3rem;font-family:var(--f-mono);font-size:.74rem;line-height:1.55',
    line: 'display:grid;grid-template-columns:6.6rem max-content 3.4rem;gap:.7rem;align-items:baseline;padding:.08rem .4rem;border-radius:5px;cursor:pointer;white-space:pre;min-width:max-content;border-left:3px solid transparent',
    t: 'position:sticky;left:0;z-index:1;padding-right:.3rem;color:var(--gold-2);background:inherit',
    k: 'color:var(--code-dim)', s: 'color:var(--tok-str)', n: 'color:var(--tok-num)', b: 'color:var(--code-dim);text-align:right',
  };
  const lineBg = (hl, sel) => (sel ? 'background:color-mix(in srgb, var(--c) 34%, var(--code-bg));' : 'background:var(--code-bg);') + (hl ? 'border-left-color:var(--vermilion);' : '');
  const logView = {
    label: 'The messages',
    draw(box, ctx) {
      const log = h('div', { style: ST.log, role: 'list', 'aria-label': 'The messages, one per line', tabindex: 0 });
      let firstSel = null;
      ctx.rows.forEach(r => {
        const hl = !!(ctx.hl && ctx.hl.test(r)), sel = !!(ctx.sel && ctx.sel.test(r));
        const line = h('div', { style: ST.line + ';' + lineBg(hl, sel), role: 'listitem', tabindex: 0, title: 'click to select this message' });
        const code = h('span');
        fields(r.sent).forEach(f => code.append(h('span', { style: ST.k }, f.head), h('span', { style: STRING_KEYS.has(f.key) ? ST.s : ST.n }, f.value)));
        code.append(h('span', { style: ST.k }, '}'));
        line.append(h('span', { style: ST.t }, r.when), code, h('span', { style: ST.b }, `${r.bytes} B`));
        const pick = () => ctx.select({ label: `the message of ${r.when}`, test: q => q.i === r.i });
        line.addEventListener('click', pick);
        line.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        if (sel && !firstSel) firstSel = line;
        log.append(line);
      });
      const legendBits = [['string value', 'var(--tok-str)', 'box'], ['number', 'var(--tok-num)', 'box']];
      if (ctx.hl) legendBits.push([esc(ctx.hl.label), 'var(--vermilion)', 'box']);
      box.append(legend(legendBits), log, h('p', { class: 'fig-note', text: 'All 96 messages, exactly as sent: scroll down through them, and sideways for the end of each line. Click a message to select it.' }));
      if (firstSel) requestAnimationFrame(() => { log.scrollTop = firstSel.offsetTop - log.offsetTop - 8; });
    },
  };

  DS.define('station-messages', {
    rows() {
      const recs = generate(N);
      const rows = recs.map((rec, i) => ({
        i, day: i < 48 ? 1 : 2, when: when(rec), stamp: rec.time,
        temp_c: +rec.temp_c, humidity: +rec.humidity, pressure_hpa: +rec.pressure_hpa, wind_kn: +rec.wind_kn, wind_dir: rec.wind_dir, sky: rec.sky,
        sent: rec, json: compact(rec), bytes: compact(rec).length, new_chars: i ? newChars(rec, recs[i - 1]) : null,
        word_change: i > 0 && (rec.sky !== recs[i - 1].sky || rec.wind_dir !== recs[i - 1].wind_dir),
      }));
      return rows;
    },
    columns: [
      { key: 'when', label: 'sent', left: true },
      { key: 'temp_c', label: '°C', fmt: v => v.toFixed(1) },
      { key: 'humidity', label: 'humidity', fmt: v => v.toFixed(2) },
      { key: 'pressure_hpa', label: 'hPa', fmt: v => v.toFixed(1) },
      { key: 'wind_kn', label: 'wind kn' },
      { key: 'wind_dir', label: 'from', left: true },
      { key: 'sky', label: 'sky', left: true },
      { key: 'bytes', label: 'bytes' },
      { key: 'new_chars', label: 'new chars', fmt: v => (v == null ? '—' : String(v)) },
    ],
    csvColumns: ['stamp', 'temp_c', 'humidity', 'pressure_hpa', 'wind_kn', 'wind_dir', 'sky', 'json'],
    highlights: {
      changes: { label: 'a word changes (sky or wind direction)', test: r => r.word_change },
      gales: { label: 'gales (40 kn and up)', test: r => r.wind_kn >= 40 },
    },
    views: { weather: weatherView, messages: logView },
    helpers: { when, fields, compact, scrub, TICKS, TICKNAME },   // shared with the datasets derived from this one
    metrics: [
      { id: 'n', label: 'messages', value: rows => rows.length, fmt: (v, rows) => `${v} · ${rows[0].when} to ${rows[rows.length - 1].when}`,
        note: 'One every 30 minutes for two days. Day one is the first 48 (to 29 Oct 14:00), day two the next 48. Later pages compress the first against the second.' },
      { id: 'bytes', label: 'bytes per message', value: rows => mean(rows.map(r => r.bytes)), fmt: (v, rows) => `${fmt(v, 1)} B · ${Math.min(...rows.map(r => r.bytes))} to ${Math.max(...rows.map(r => r.bytes))}`,
        note: 'Every message is about the same length: the same eight fields in the same order. Only the sky’s words (“rain”, “heavy rain”) make some a few bytes longer.' },
      { id: 'skeleton', label: 'keys and punctuation', value: rows => rows[0].bytes - fields(rows[0].sent).reduce((a, f) => a + f.value.length, 0),
        fmt: (v, rows) => `${v} B · ${fmtPct(v / mean(rows.map(r => r.bytes)), 0)} of each message`,
        note: 'The braces, the eight keys with their quotes, the colons and commas: identical in all 96 messages. Add the station’s name, `"gull-rock"`, and 99 bytes of every message never change at all.' },
      { id: 'new', label: 'new characters per message', value: rows => mean(rows.slice(1).map(r => r.new_chars)),
        fmt: (v, rows) => `${fmt(v, 1)} · ${fmtPct(v / mean(rows.slice(1).map(r => r.bytes)), 1)} of the bytes`,
        note: (v, rows) => { const c = rows.slice(1).map(r => r.new_chars); return `Characters that differ from the message just before, averaged over the 95 later messages: about one byte in ${Math.round(mean(rows.slice(1).map(r => r.bytes)) / v)}. The fewest is ${Math.min(...c)}; the most, ${Math.max(...c)}, when the sky turns to “light rain”. Everything else the mainland could have guessed.`; } },
      { id: 'words', label: 'words that change', value: rows => rows.filter(r => r.word_change).length,
        fmt: v => `${v} of 95 messages`, note: 'The sky goes overcast → light rain → rain → heavy rain, and the wind veers SW → WSW → W. Five changes of a word in two days; the other 90 messages repeat both words exactly.' },
      { id: 'pressure', label: 'pressure fall', value: rows => rows[0].pressure_hpa,
        fmt: (v, rows) => `${fmt(v, 1)} → ${fmt(rows[rows.length - 1].pressure_hpa, 1)} hPa`,
        note: (v, rows) => `A fall of ${fmt(v - rows[rows.length - 1].pressure_hpa, 1)} hPa in two days, never more than a few tenths per message: a deep storm, arriving slowly. Slow drift is what makes each message so predictable from the one before.` },
      { id: 'windmax', label: 'strongest wind', mark: 'wind_kn', short: 'max', value: rows => Math.max(...rows.map(r => r.wind_kn)),
        fmt: (v, rows) => `${v} kn · ${rows.find(r => r.wind_kn === v).when}`,
        note: (v, rows) => `Up from ${rows[0].wind_kn} kn at the start: storm force by the second afternoon. Yet the message that reports it is the same 147 bytes, with the same skeleton, as the calm one.` },
    ],
    code: `
import re
import pandas as pd

msgs = pd.read_csv("{csv}")          # one row per message; "json" is the message exactly as sent
sizes = msgs["json"].str.len()
print(len(msgs), "messages,", sizes.mean().round(1), "bytes on average,", sizes.min(), "to", sizes.max())

def values(m):                        # the value of each field, as written: "SW", 1012.6, ...
    return re.findall(r'"\\w+":("[^"]*"|[^,}]+)', m)

first = msgs["json"][0]
print("keys and punctuation:", len(first) - sum(len(v) for v in values(first)), "bytes")

def new_chars(prev, cur):             # characters that differ from the same place in the previous message
    return sum(j >= len(u) or u[j] != ch for u, v in zip(values(prev), values(cur)) for j, ch in enumerate(v))

new = [new_chars(a, b) for a, b in zip(msgs["json"], msgs["json"][1:])]
print("new characters per message:", round(sum(new) / len(new), 1), "min", min(new), "max", max(new))
print("pressure", msgs["pressure_hpa"].iloc[0], "->", msgs["pressure_hpa"].iloc[-1], "hPa;  max wind", msgs["wind_kn"].max(), "kn")
`,
  });
})();
