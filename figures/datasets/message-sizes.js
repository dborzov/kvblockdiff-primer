// Gull Rock message sizes: what each of the 96 station messages (dataset 'station-messages') costs on the radio,
// compressed four ways with DEFLATE (pako, raw, level 9), computed live in the browser:
//   alone  — the message compressed by itself;
//   log    — what the message adds when it is appended to the station's log file (one message per line):
//            size of the compressed log of messages 1..i+1 minus that of 1..i;
//   dict   — day-two messages only: compressed with a preset dictionary of the last 24 day-one messages (3,522 B);
//   chain  — compressed with the previous message as the dictionary.
// Needs pako on the page (front matter: vendor: [pako.min.js]).
(function () {
  const K = 24;   // sample messages in the dictionary of pages I.3–I.4
  function pk() { if (!window.pako) throw new Error('dataset "message-sizes" needs pako: add  vendor: [pako.min.js]  to the page'); return window.pako; }
  const enc = s => new TextEncoder().encode(s);
  const z = (s, dict) => pk().deflateRaw(enc(s), dict ? { level: 9, dictionary: enc(dict) } : { level: 9 }).length;
  const H = () => DS.spec('station-messages').helpers;
  const tint = (col, pct) => `color-mix(in srgb, ${col} ${pct}%, transparent)`;
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const nf = n => n.toLocaleString('en-US');
  const SER = {
    raw: { label: 'raw message', color: 'var(--ink-3)' },
    alone: { label: 'compressed alone', color: series(0) },
    log: { label: 'added to the log', color: series(2) },
    dict: { label: 'with the dictionary (δ)', color: 'var(--t-delta)' },
    chain: { label: 'with the previous message as dictionary', color: series(4) },
  };

  /* Columns: one per message. `back` is a wide pale bar, `front` a narrower solid one in front of it,
     `tick` a short horizontal stroke. Red dots above mark highlighted messages; a drag selects a stretch. */
  const columns = o => ({
    label: o.label,
    draw(box, ctx) {
      const rows = ctx.rows.filter(o.only || (() => true));
      const i0 = rows[0].i, i1 = rows[rows.length - 1].i;
      const keys = [o.back, o.front, o.tick].filter(Boolean);
      box.append(legend(keys.map(k => [SER[k].label, k === o.back ? tint(SER[k].color, 40) : SER[k].color, k === o.tick ? 'line' : 'box']).concat(ctx.hl ? [[esc(ctx.hl.label), series(1), 'dot']] : [])));
      const P = Plot(appendBox(box), {
        x: [i0 - 0.5, i1 + 0.5], y: [0, o.ymax], h: o.h || 250, grid: 'y', yticks: o.yticks,
        xticks: H().TICKS.filter(t => t >= i0 && t <= i1).concat(i0 > 0 ? [i0] : []), xfmt: v => (v === i0 && i0 > 0 ? '29 Oct 14:30' : H().TICKNAME[v]),
        xlabel: o.xlabel || 'message, in the order sent', ylabel: 'bytes', label: o.title,
      });
      const slot = P.x(1) - P.x(0);
      rows.forEach(r => {
        const dim = ctx.sel && !ctx.sel.test(r);
        const bar = (key, frac, pct) => {
          const v = r[key];
          if (v == null) return;
          const w = slot * frac;
          el('rect', { x: P.x(r.i) - w / 2, width: w, y: P.y(v), height: P.y(0) - P.y(v), style: `fill:${tint(SER[key].color, dim ? pct * 0.35 : pct)}` }, P.g.data);
        };
        if (o.back) bar(o.back, 0.92, 30);
        if (o.front) bar(o.front, 0.62, 100);
        if (o.tick && r[o.tick] != null) el('line', { x1: P.x(r.i) - slot * 0.46, x2: P.x(r.i) + slot * 0.46, y1: P.y(r[o.tick]), y2: P.y(r[o.tick]), style: `stroke:${tint(SER[o.tick].color, dim ? 35 : 100)};stroke-width:${2 * P.fs}` }, P.g.data);
        if (ctx.hl && ctx.hl.test(r)) dot(P.g.data, P.x(r.i), P.y(Math.max(...keys.map(k => r[k] || 0))) - 7 * P.fs, 2.8 * P.fs, series(1));
      });
      ctx.marks.filter(m => keys.includes(m.key)).forEach(m => rule(P, { y: m.value, label: `${m.label}: ${fmt(m.value, 1)} B`, color: 'var(--ink-2)' }));
      if (o.after) o.after(P, rows);
      H().scrub([P], ctx, rows, r => `<b>${r.when}</b>` + keys.filter(k => r[k] != null).map(k => `<br>${SER[k].label}: <b>${r[k]} B</b>`).join(''));
    },
  });
  function appendBox(box) { const b = h('div'); box.append(b); return b; }

  /* Running totals of day one, three ways: the same 48 messages, the same compressor. */
  const totals = {
    label: 'Running total, day one',
    legend: 'hl',
    draw(box, ctx) {
      const rows = ctx.rows.filter(r => r.day === 1);
      const ways = ['raw', 'alone', 'log'];
      box.append(legend(ways.map(k => [k === 'log' ? 'compressed as one log' : SER[k].label, SER[k].color, k === 'raw' ? 'dash' : 'line'])));
      const cum = {};
      ways.forEach(k => { let s = 0; cum[k] = rows.map(r => [r.i + 1, (s += r[k])]); });
      const P = Plot(appendBox(box), {
        x: [0, 52], y: [0, 7600], h: box.clientWidth > 0 && box.clientWidth < 520 ? 400 : 280, xticks: [0, 8, 16, 24, 32, 40, 48], yticks: [0, 2000, 4000, 6000], yfmt: v => (v ? `${v / 1000}k` : '0'),
        xlabel: 'messages sent on day one', ylabel: 'bytes over the radio, so far', label: 'Running total of bytes for the 48 messages of day one, three ways',
      });
      if (ctx.sel) rows.forEach(r => { if (ctx.sel.test(r)) el('rect', { x: P.x(r.i + 0.5), width: P.x(1) - P.x(0), y: P.m.t, height: P.ph, style: `fill:${tint('var(--c)', 14)}` }, P.g.bg); });
      ways.forEach(k => {
        line(P, [[0, 0], ...cum[k]], { color: SER[k].color, width: 2.2, dash: k === 'raw', name: SER[k].label });
        const [x, y] = cum[k][cum[k].length - 1];
        el('text', { x: P.x(x) + 6 * P.fs, y: P.y(y) + 4 * P.fs, class: 'val', text: nf(y) }, P.g.top);
      });
      if (ctx.hl) rows.forEach(r => { if (ctx.hl.test(r)) dot(P.g.data, P.x(r.i + 1), P.y(cum.log[rows.indexOf(r)][1]), 3 * P.fs, series(1)); });
      const yl = cum.log[47][1], ya = cum.alone[47][1];
      const bx = P.x(48) - 14 * P.fs;   // a bracket between the two compressed totals
      el('path', { d: `M${bx + 5 * P.fs},${P.y(ya)} H${bx} V${P.y(yl)} H${bx + 5 * P.fs}`, style: 'fill:none;stroke:var(--ink-2);stroke-width:1.2' }, P.g.top);
      svgText(P.g.top, bx - 6 * P.fs, P.y((yl + ya) / 2) - 6 * P.fs, `the same data,\n${fmt(ya / yl, 1)}× apart`, { class: 'annot', 'text-anchor': 'end' });
      crosshair(P, { series: ways.map(k => ({ name: k === 'log' ? 'as one log' : SER[k].label, pts: cum[k], color: SER[k].color })), xname: 'after', xfmt: v => `${v} message${v === 1 ? '' : 's'}`, yfmt: v => `${nf(v)} B` });
    },
  };

  DS.define('message-sizes', {
    rows() {
      const msgs = DS.rows('station-messages');
      const json = msgs.map(r => r.json);
      const D = json.slice(48 - K, 48).join('');
      let prevLog = 0;
      return msgs.map((m, i) => {
        const logZ = z(json.slice(0, i + 1).join('\n'));
        const row = {
          i, day: m.day, when: m.when, word_change: m.word_change, raw: m.bytes, alone: z(m.json), log: logZ - prevLog,
          dict: i >= 48 ? z(m.json, D) : null, chain: i ? z(m.json, json[i - 1]) : null,
        };
        prevLog = logZ;
        return row;
      });
    },
    columns: [
      { key: 'when', label: 'sent', left: true },
      { key: 'raw', label: 'raw B' },
      { key: 'alone', label: 'alone B' },
      { key: 'log', label: 'added to log B' },
      { key: 'dict', label: 'with D B', fmt: v => (v == null ? '—' : String(v)) },
      { key: 'chain', label: 'with previous B', fmt: v => (v == null ? '—' : String(v)) },
    ],
    csvColumns: ['when', 'day', 'raw', 'alone', 'log', 'dict', 'chain'],
    highlights: {
      changes: { label: 'a word changes (sky or wind direction)', test: r => r.word_change },
      first: { label: 'the first message', test: r => r.i === 0 },
    },
    views: {
      alone: columns({ label: 'Each alone', back: 'raw', front: 'alone', ymax: 165, yticks: [0, 50, 100, 150], title: 'Raw and compressed size of each of the 96 messages' }),
      log: columns({ label: 'Added to the log', back: 'alone', front: 'log', ymax: 140, yticks: [0, 25, 50, 75, 100, 125], title: 'What each message costs alone and when appended to the log' }),
      dictionary: columns({ label: 'Day two, with a dictionary', only: r => r.day === 2, back: 'alone', front: 'dict', ymax: 140, yticks: [0, 25, 50, 75, 100, 125], title: 'Day-two messages: compressed alone and with the dictionary' }),
      chain: columns({ label: 'Day two, three ways', only: r => r.day === 2, back: 'alone', front: 'dict', tick: 'chain', ymax: 140, yticks: [0, 25, 50, 75, 100, 125], title: 'Day-two messages: compressed alone, with the dictionary, and with the previous message' }),
      total: totals,
    },
    metrics: [
      { id: 'alone', label: 'compressed alone', mark: 'alone', short: 'average alone', value: rows => avg(rows.map(r => r.alone)),
        fmt: (v, rows) => `${fmt(v, 1)} B · ${Math.min(...rows.map(r => r.alone))} to ${Math.max(...rows.map(r => r.alone))}`,
        note: (v, rows) => `Average over all 96 messages, against ${fmt(avg(rows.map(r => r.raw)), 1)} B raw. The spread is tiny: whatever the weather, DEFLATE finds the same few short repeats inside one message.` },
      { id: 'saved', label: 'saved, alone', value: rows => 1 - avg(rows.map(r => r.alone)) / avg(rows.map(r => r.raw)), fmt: v => fmtPct(v, 0),
        note: 'About one byte in six. Compare the 96 % of each message that repeats the message before: alone, a compressor can use almost none of it.' },
      { id: 'logfirst', label: 'first message, in the log', value: rows => rows[0].log, fmt: v => `${v} B`,
        note: 'With nothing earlier to copy, the first line of the log costs what a message alone costs.' },
      { id: 'loglater', label: 'each later message, in the log', mark: 'log', short: 'average added', value: rows => avg(rows.slice(1).map(r => r.log)),
        fmt: (v, rows) => `${fmt(v, 1)} B · ${Math.min(...rows.slice(1).map(r => r.log))} to ${Math.max(...rows.slice(1).map(r => r.log))}`,
        note: v => `Every later message finds its near-twin one line back and adds only about ${fmt(v, 0)} bytes — over ten times less than alone. The compressor did not get smarter; it got context.` },
      { id: 'logday', label: 'day one as one log', value: rows => rows.filter(r => r.day === 1).reduce((a, r) => a + r.log, 0),
        fmt: v => `${nf(v)} B · ${fmt(v / 48, 1)} B per message`, note: 'All 48 messages of day one compressed together, one per line.' },
      { id: 'log96', label: 'both days as one log', value: rows => rows.reduce((a, r) => a + r.log, 0),
        fmt: v => `${nf(v)} B · ${fmt(v / 96, 1)} B per message`, note: 'The longer the log, the closer the cost per message gets to the 10 or so bytes a later message adds.' },
      { id: 'day1raw', label: 'day one, raw', value: rows => rows.filter(r => r.day === 1).reduce((a, r) => a + r.raw, 0),
        fmt: v => `${nf(v)} B · ${fmt(v / 48, 1)} B each`, note: 'The 48 messages of day one as text, nothing done to them.' },
      { id: 'day1alone', label: 'day one, each alone', value: rows => rows.filter(r => r.day === 1).reduce((a, r) => a + r.alone, 0),
        fmt: v => `${nf(v)} B · ${fmt(v / 48, 1)} B each`, note: 'The same 48 messages, each compressed by itself: 16 % saved.' },
      { id: 'factor', label: 'alone ÷ as one log', value: rows => { const d = rows.filter(r => r.day === 1); return d.reduce((a, r) => a + r.alone, 0) / d.reduce((a, r) => a + r.log, 0); },
        fmt: v => `${fmt(v, 1)}×`, note: 'Same bytes, same compressor, same day. Only the way the data is cut up differs — and that alone is worth a factor of nine.' },
      { id: 'dsize', label: 'dictionary $\\vD$', value: rows => DS.rows('station-messages').slice(48 - K, 48).reduce((a, r) => a + r.bytes, 0),
        fmt: v => `${nf(v)} B · ${K} messages`, note: 'The last 24 messages of day one (28 Oct 14:30 to 29 Oct 14:00), held by both ends. It travels once.' },
      { id: 'dict', label: 'day two, with the dictionary', tex: '\\vdelta', mark: 'dict', short: 'average δ', value: rows => avg(rows.filter(r => r.dict != null).map(r => r.dict)),
        fmt: (v, rows) => { const d = rows.filter(r => r.dict != null).map(r => r.dict); return `${fmt(v, 1)} B · ${Math.min(...d)} to ${Math.max(...d)}`; },
        note: (v, rows) => `Against ${fmt(avg(rows.filter(r => r.day === 2).map(r => r.alone)), 1)} B for the same 48 messages alone: the dictionary brings each message the context the log had.` },
      { id: 'stale', label: 'first and last delta of day two', value: rows => rows[48].dict, fmt: (v, rows) => `${v} B → ${rows[95].dict} B`,
        note: 'The dictionary goes stale. The first day-two message looks like the samples; a day later the storm has moved on, and the deltas have grown by half.' },
      { id: 'chain', label: 'with the previous message as $\\vD$', mark: 'chain', short: 'average with previous', value: rows => avg(rows.slice(1).map(r => r.chain)), fmt: v => `${fmt(v, 1)} B`,
        note: 'Messages 2 to 96, each compressed against the one before: as good as the 24-message dictionary, and free — but each message now needs the one before it.' },
      { id: 'breakeven', label: 'break-even', value: rows => { const d = DS.rows('station-messages').slice(48 - K, 48).reduce((a, r) => a + r.bytes, 0), two = rows.filter(r => r.day === 2); return d / (avg(two.map(r => r.alone)) - avg(two.map(r => r.dict))); },
        fmt: v => `${fmt(v, 1)} messages ≈ ${fmt(v / 2, 0)} hours`, note: 'Dictionary bytes ÷ bytes saved per message (alone minus δ, day-two averages). Before this many messages, the dictionary costs more than it saves.' },
    ],
    code: `
import pandas as pd

s = pd.read_csv("{csv}")      # one row per message: raw, alone, log, dict (day two only), chain; all in bytes
day1, day2 = s[s.day == 1], s[s.day == 2]

print("alone:", s.alone.mean().round(1), "B on average, raw", s.raw.mean().round(1), "B")
print("in the log: first", s.log[0], "B, later ones", s.log[1:].mean().round(1), "B each")
print("day one: raw", day1.raw.sum(), " each alone", day1.alone.sum(), " as one log", day1.log.sum(),
      " factor", (day1.alone.sum() / day1.log.sum()).round(1))
print("day two with D:", day2.dict.mean().round(1), "B (", day2.dict.min(), "to", day2.dict.max(), ")")
print("previous message as D:", s.chain[1:].mean().round(1), "B")
D = 3522                      # the 24-message dictionary, bytes
print("break-even after", round(D / (day2.alone.mean() - day2.dict.mean()), 1), "messages")

# To recompute the sizes themselves (zlib's raw DEFLATE differs from the page's pako by a byte or two):
# import zlib
# def deflate(m, zdict=None):
#     z = zlib.compressobj(9, zlib.DEFLATED, -15, **({"zdict": zdict} if zdict else {}))
#     return len(z.compress(m) + z.flush())
`,
  });
})();
