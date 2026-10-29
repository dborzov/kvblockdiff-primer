/* Part I — the tiny-file problem. Figures.
   The data comes from the datasets 'station-messages', 'message-sizes' and 'fine-readings'
   (figures/datasets/). window.GULL.records(n) returns the first n messages' field values (strings, as sent). */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------ the toy data: dataset 'station-messages' (figures/datasets/)
  const H = () => DS.spec('station-messages').helpers;
  const fields = rec => H().fields(rec);
  const compact = rec => H().compact(rec);
  function records(n) { return DS.rows('station-messages').slice(0, n).map(r => r.sent); }
  window.GULL = { records, compact, fields };

  // ------------------------------------------------------------ tiny DOM helper (plotkit's h() is used when present)
  function mk(tag, attrs, ...kids) {
    if (window.h) return window.h(tag, attrs || {}, ...kids);
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }
  const bytes = s => new TextEncoder().encode(s).length;

  // ------------------------------------------------------------ FIG: what repeats from one message to the next
  FIG.recordRepeats = function (host) {
    const recs = records(12);
    let sel = 2, on = true;
    const box = mk('div', { class: 'rr-box', role: 'list' });
    const readout = mk('div', { class: 'readout' });
    const toggle = mk('label', { class: 'rr-toggle' }, mk('input', { type: 'checkbox', checked: '' }), ' highlight what is new');
    toggle.querySelector('input').addEventListener('change', e => { on = e.target.checked; draw(); });

    function lineFor(i) {
      const cur = fields(recs[i]), prev = i ? fields(recs[i - 1]) : null;
      const line = mk('div', { class: 'rr-line' + (i === sel ? ' is-sel' : ''), role: 'listitem', tabindex: '0' });
      line.append(mk('span', { class: 'rr-time' }, recs[i].time.slice(11, 16)));
      const code = mk('code', { class: 'rr-code' });
      let fresh = 0;
      cur.forEach((f, k) => {
        code.append(mk('span', { class: 'rr-same' }, f.head));
        const pv = prev ? prev[k].value : '';
        let run = '', runNew = null;
        const flush = () => { if (run) code.append(mk('span', { class: runNew ? 'rr-new' : 'rr-same' }, run)); run = ''; };
        [...f.value].forEach((ch, c) => {
          const isNew = !prev || pv[c] !== ch;
          if (isNew) fresh++;
          if (runNew !== null && isNew !== runNew) flush();
          runNew = isNew; run += ch;
        });
        flush();
      });
      code.append(mk('span', { class: 'rr-same' }, '}'));
      line.append(code, mk('span', { class: 'rr-count' }, i ? `${fresh} new` : 'first'));
      line.addEventListener('click', () => { sel = i; draw(); });
      line.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel = i; draw(); } });
      line.dataset.fresh = fresh;
      return line;
    }
    function draw() {
      box.innerHTML = '';
      box.classList.toggle('rr-plain', !on);
      const lines = recs.map((_, i) => lineFor(i));
      lines.forEach(l => box.append(l));
      const total = bytes(compact(recs[sel]));
      const fresh = +lines[sel].dataset.fresh;
      const all = lines.slice(1).reduce((a, l, i) => a + (+l.dataset.fresh), 0);
      const allBytes = recs.slice(1).reduce((a, r) => a + bytes(compact(r)), 0);
      readout.innerHTML = sel
        ? `<span><b>message ${recs[sel].time.slice(11, 16)}</b>${total} bytes</span><span><b>new vs. the one before</b>${fresh} bytes (${(100 * fresh / total).toFixed(0)} %)</span><span><b>all 11 later messages</b>${all} of ${allBytes} bytes new (${(100 * all / allBytes).toFixed(0)} %)</span>`
        : `<span><b>message ${recs[sel].time.slice(11, 16)}</b>${total} bytes — the first message has nothing to compare with. Pick a later one.</span>`;
    }
    host.append(mk('div', { class: 'controls' }, toggle), box, readout);
    draw();
  };

  // ------------------------------------------------------------ FIG: compress one message alone with DEFLATE
  FIG.compressOne = function (host) {
    if (!window.pako) throw new Error('pako (DEFLATE in the browser) is not loaded on this page');
    const recs = records(12);
    let sel = 2;
    const picker = mk('select', { 'aria-label': 'Which message' });
    recs.forEach((r, i) => picker.append(mk('option', { value: i }, `message ${r.time.slice(11, 16)}`)));
    picker.value = sel;
    picker.addEventListener('change', () => { sel = +picker.value; draw(); });
    const msg = mk('code', { class: 'co-msg' });
    const bars = mk('div', { class: 'co-bars' });
    const readout = mk('div', { class: 'readout' });

    function bar(label, n, max, cls) {
      return mk('div', { class: 'co-row' }, mk('span', { class: 'co-label' }, label),
        mk('span', { class: 'co-track' }, mk('span', { class: 'co-fill ' + cls, style: `width:${(100 * n / max).toFixed(1)}%` })),
        mk('span', { class: 'co-n' }, `${n} B`));
    }
    function draw() {
      const s = compact(recs[sel]);
      const raw = new TextEncoder().encode(s);
      const z = window.pako.deflateRaw(raw, { level: 9 });
      msg.textContent = s;
      bars.innerHTML = '';
      bars.append(bar('raw message', raw.length, raw.length, 'is-raw'), bar('compressed alone', z.length, raw.length, 'is-z'));
      readout.innerHTML = `<span><b>saved</b>${raw.length - z.length} bytes (${(100 * (raw.length - z.length) / raw.length).toFixed(0)} %)</span><span><b>ratio</b>${(raw.length / z.length).toFixed(2)}×</span>`;
    }
    host.append(mk('div', { class: 'controls' }, mk('label', {}, 'Message ', picker)), msg, bars, readout);
    draw();
  };
})();

/* =====================================================================
   Pages I.2–I.6. Everything below reuses window.GULL and leaves the
   builders above untouched. Shared helpers:
   - the 96 messages of the first two days (28 Oct 14:30 → 30 Oct 14:00),
     split into day one (messages 0–47) and day two (48–95);
   - DEFLATE sizes via pako (level 9, raw), optionally with a preset
     dictionary — the browser stand-in for a zstd dictionary;
   - a greedy LZ parse used only to *draw* copies (DEFLATE's own parse is
     similar but not identical; every byte count comes from pako);
   - finer "as measured" readings behind the rounded message values (I.5).
   ===================================================================== */
(function () {
  'use strict';
  const G = window.GULL;
  const enc = s => new TextEncoder().encode(s);
  const dec = b => new TextDecoder().decode(b);
  function pk() { if (!window.pako) throw new Error('pako (DEFLATE in the browser) is not loaded on this page'); return window.pako; }
  const deflate = (s, dict) => pk().deflateRaw(enc(s), dict ? { level: 9, dictionary: enc(dict) } : { level: 9 });
  const zsize = (s, dict) => deflate(s, dict).length;
  let ALL = null;
  const all = () => (ALL = ALL || G.records(96).map(G.compact));
  const day1 = () => all().slice(0, 48);
  const day2 = () => all().slice(48, 96);
  const dictOf = K => (K ? day1().slice(48 - K).join('') : '');      // the K most recent messages of day one
  const logOf = n => all().slice(0, n).join('\n');                  // the station's log file: one message per line
  const stamp = i => { const t = G.records(96)[i].time; return `${+t.slice(8, 10)} Oct ${t.slice(11, 16)}`; };
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const nf = n => n.toLocaleString('en-US');
  const sizeMemo = new Map();
  function day2Sizes(K) {   // DEFLATE size of each day-two message with a K-message dictionary (K = 0: alone)
    if (!sizeMemo.has(K)) { const d = dictOf(K); sizeMemo.set(K, day2().map(m => zsize(m, d))); }
    return sizeMemo.get(K);
  }

  // greedy LZ77: at each position take the longest earlier match of ≥ 3 bytes (the closest on ties), else one literal
  function lzParse(s) {
    const out = []; let i = 0, lit = '';
    while (i < s.length) {
      let best = 0, dist = 0;
      for (let j = i - 1; j >= 0 && i - j <= 32768; j--) {
        let l = 0;
        while (l < 258 && i + l < s.length && s[j + l] === s[i + l]) l++;
        if (l > best) { best = l; dist = i - j; }
      }
      if (best >= 3) { if (lit) out.push({ lit, at: i - lit.length }); lit = ''; out.push({ len: best, dist, at: i }); i += best; }
      else lit += s[i++];
    }
    if (lit) out.push({ lit, at: i - lit.length });
    return out;
  }

  // finer readings behind the rounded values of the messages: dataset 'fine-readings'
  const FR = () => DS.spec('fine-readings').helpers;
  const COLS = [
    { key: 'temp', name: 'temperature', short: 'temp.', unit: '°C', step: 0.01, dp: 2 },
    { key: 'hum', name: 'humidity', short: 'humidity', unit: '%', step: 0.1, dp: 1 },
    { key: 'pres', name: 'pressure', short: 'pressure', unit: 'hPa', step: 0.01, dp: 2 },
    { key: 'wind', name: 'wind', short: 'wind', unit: 'kn', step: 0.1, dp: 1 },
  ];
  const readings = n => DS.rows('fine-readings').slice(0, n);
  const rowsAsBytes = rows => FR().asBytes(rows);
  function leftovers(rows, mode) {   // mode 'mean': minus each column's typical value; 'prev': minus the row above
    if (mode === 'mean') { const typ = FR().typical(rows); return { typ, L: rows.map(r => r.v.map((x, c) => x - typ[c])), from: 0 }; }
    return { typ: null, L: rows.map((r, i) => (i ? r.v.map((x, c) => x - rows[i - 1].v[c]) : null)), from: 1 };
  }
  const bitsPerColumn = (rows, mode) => (mode === 'raw' ? FR().bitsRaw(rows) : mode === 'mean' ? FR().bitsMean(rows) : FR().bitsPrev(rows));
  if (window.__TINY_TEST__) window.__TINY_TEST__ = { all, day1, day2, dictOf, logOf, zsize, deflate, day2Sizes, lzParse, readings, rowsAsBytes, leftovers, bitsPerColumn, COLS };

  const fmtLeft = (x, c) => (x > 0 ? '+' : x < 0 ? '−' : '±') + (Math.abs(x) * COLS[c].step).toFixed(COLS[c].dp);
  const fmtVal = (x, c) => (x * COLS[c].step).toFixed(COLS[c].dp);
  const showNL = ch => (ch === '\n' ? '↵\n' : ch);

  /* ------------------------------------------------------------------ I.2 · LZ copies inside the log */
  FIG.lzCopies = function (host) {
    let n = 2, view = 'marks';
    const text = h('div', { class: 'lz-text' });
    const ro = readout();
    host.append(
      controls(
        seg([[1, 'one message'], [2, 'two'], [3, 'three']], n, v => { n = v; draw(); }, 'How many messages'),
        seg([['marks', 'highlight copies'], ['ops', 'what gets written']], view, v => { view = v; draw(); }, 'What to show'),
      ),
      legend([['written out: a literal character', 'var(--ink)', 'box'], ['copied from earlier', 'var(--t-dictionary)', 'box'], ['where the copy comes from', 'var(--peacock)', 'box']]),
      text, ro,
    );
    function draw() {
      const s = logOf(n), toks = lzParse(s);
      text.replaceChildren();
      text.classList.toggle('is-ops', view === 'ops');
      const chars = [];
      const mark = (t, on) => { for (let k = t.at - t.dist; k < t.at - t.dist + t.len; k++) chars[k] && chars[k].classList.toggle('lz-src', on); };
      toks.forEach(t => {
        if (view === 'ops') {
          text.append(t.lit ? h('span', { class: 'lz-oplit' }, [...t.lit].map(showNL).join(''))
            : h('span', { class: 'lz-op' }, `copy ${t.len}, ${t.dist} back`));
          return;
        }
        if (t.lit) { for (const ch of t.lit) { const c = h('span', { class: 'lz-lit' }, showNL(ch)); chars.push(c); text.append(c); } return; }
        const box = h('span', { class: 'lz-copy', tabindex: '0' });
        for (const ch of s.substr(t.at, t.len)) { const c = h('span', {}, showNL(ch)); chars.push(c); box.append(c); }
        hover(box, () => `<b>copy ${t.len} bytes from ${t.dist} bytes back</b><br><code>${esc(s.substr(t.at, t.len))}</code>`);
        ['pointerenter', 'focus'].forEach(ev => box.addEventListener(ev, () => mark(t, true)));
        ['pointerleave', 'blur'].forEach(ev => box.addEventListener(ev, () => mark(t, false)));
        text.append(box);
      });
      const copies = toks.filter(t => !t.lit), lits = s.length - copies.reduce((a, t) => a + t.len, 0);
      ro.set([
        ['text', `${n === 1 ? 'one message' : n + ' messages'}, ${s.length} bytes`],
        ['written as', `${lits} literal characters + ${copies.length} copies`],
        ['copied', `${s.length - lits} bytes (${Math.round(100 * (s.length - lits) / s.length)} %)`],
        ['DEFLATE', `${zsize(s)} bytes`],
      ]);
    }
    draw();
  };

  /* ------------------------------------------------------------------ I.2 · bytes per message against how many are compressed together */
  FIG.perMessage = function (host) {
    const N = 96, pts = [];
    for (let n = 1; n <= N; n++) pts.push([n, zsize(logOf(n)) / n]);
    let sel = 8;
    const box = h('div'), ro = readout();
    const sl = slider('messages together', 1, N, 1, sel, v => { sel = v; draw(); });
    host.append(controls(sl), legend([['compressed, per message', series(1)], ['raw, per message', 'var(--ink-3)', 'dash']]), box, ro);
    const P = Plot(box, {
      x: [1, N], xlog: 2, y: [0, 160], h: 320, xticks: [1, 2, 4, 8, 16, 32, 64, 96], yticks: [0, 25, 50, 75, 100, 125, 150],
      xlabel: 'messages compressed together (log scale)', ylabel: 'bytes per message', label: 'Compressed bytes per message against the number of messages compressed together',
    });
    const rawPts = pts.map(([n]) => [n, (logOf(n).length - (n - 1)) / n]);   // raw bytes per message, line breaks not counted
    function draw() {
      P.clear();
      line(P, rawPts, { color: 'var(--ink-3)', dash: true, width: 1.6 });
      line(P, pts, { color: series(1), name: 'compressed' });
      const [n, y] = pts[sel - 1];
      dot(P.g.top, P.x(n), P.y(y), 6 * P.fs, 'var(--c)');
      annotate(P, n, y, `${n} message${n > 1 ? 's' : ''}:\n${y.toFixed(1)} B each`, { dx: n > 40 ? -70 : 36, dy: -42 });
      const z = Math.round(y * n);
      ro.set([
        ['log of', `${n} message${n > 1 ? 's' : ''}, ${nf(logOf(n).length)} bytes`],
        ['compressed', `${nf(z)} bytes`],
        ['per message', `${y.toFixed(1)} bytes`],
        ['vs. one alone', `${(pts[0][1] / y).toFixed(1)}× smaller`],
      ]);
    }
    crosshair(P, { series: [{ name: 'compressed', pts, color: series(1) }], xname: 'messages:', xfmt: v => `${Math.round(v)}`, yfmt: v => `${v.toFixed(1)} B each` });
    draw();
  };

  /* ------------------------------------------------------------------ I.3 · sender, receiver, a dictionary shipped once */
  FIG.dictPipeline = function (host) {
    const K = 24, D = dictOf(K), msgs = day2();
    let sent = 3;
    const grid = h('div', { class: 'dp-grid' });
    const ro = readout();
    const next = btn('Send the next message', () => { if (sent < 48) sent++; draw(); });
    host.append(controls(next, btn('Start again', () => { sent = 1; draw(); }, { cls: 'sm' })), grid, ro);
    const cell = (cls, ...kids) => h('div', { class: 'dp-cell ' + cls }, ...kids);
    function draw() {
      grid.replaceChildren(
        h('div', { class: 'dp-head' }, 'the station (sender)'), h('div', { class: 'dp-head dp-mid' }, 'over the radio'), h('div', { class: 'dp-head' }, 'the mainland (receiver)'),
        cell('dp-dict', h('b', {}, 'dictionary D'), h('span', {}, `${K} messages of day one`)),
        cell('dp-ship', h('span', { class: 'dp-arrow is-once' }), h('span', { class: 'dp-tag' }, `once: ${nf(D.length)} B`)),
        cell('dp-dict', h('b', {}, 'the same D'), h('span', {}, 'kept for good')),
      );
      const first = Math.max(0, sent - 4);
      for (let i = first; i < sent; i++) {
        const m = msgs[i], d = deflate(m, D), back = dec(pk().inflateRaw(d, { dictionary: enc(D) }));
        grid.append(
          cell('dp-msg', h('b', {}, stamp(48 + i)), h('span', {}, `${m.length} B`)),
          cell('dp-ship', h('span', { class: 'dp-arrow' }), h('span', { class: 'dp-delta' }, `δ ${d.length} B`)),
          cell('dp-out' + (back === m ? ' is-ok' : ' is-bad'), h('b', {}, back === m ? '✓ exact' : '✗ differs'), h('span', {}, `${back.length} B rebuilt`)),
        );
      }
      if (first > 0) grid.children[5].after(h('div', { class: 'dp-more' }, `… ${first} earlier message${first > 1 ? 's' : ''}, each sent the same way …`));
      const deltas = day2Sizes(K).slice(0, sent).reduce((a, b) => a + b, 0), alone = day2Sizes(0).slice(0, sent).reduce((a, b) => a + b, 0);
      ro.set([
        ['messages sent', `${sent}`],
        ['radio, with D', `${nf(D.length)} + ${nf(deltas)} = ${nf(D.length + deltas)} B`],
        ['radio, each alone', `${nf(alone)} B`],
      ]);
      next.disabled = sent >= 48;
    }
    draw();
  };

  /* ------------------------------------------------------------------ I.3 · live: how many sample messages make the dictionary */
  FIG.dictLive = function (host) {
    let K = 24, sel = 0;
    const KS = [0, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 28, 32, 40, 48];
    const picker = h('select', { 'aria-label': 'Which new message' });
    day2().forEach((_, i) => picker.append(h('option', { value: i }, stamp(48 + i))));
    picker.addEventListener('change', () => { sel = +picker.value; draw(); });
    const sl = slider('sample messages', 0, 48, 1, K, throttleRAF(v => { K = v; draw(); }));
    const msg = h('code', { class: 'co-msg dl-msg' });
    const bars = h('div', { class: 'co-bars' });
    const box = h('div'), ro = readout();
    host.append(controls(sl, h('label', {}, 'new message (day two) ', picker)), msg, bars, box, ro);
    const P = Plot(box, {
      x: [0, 48], y: [0, 130], h: 250, xticks: [0, 8, 16, 24, 32, 40, 48], yticks: [0, 25, 50, 75, 100, 125],
      xlabel: 'sample messages in the dictionary', ylabel: 'bytes (day-two average)', label: 'Average compressed size of a day-two message against the number of sample messages in the dictionary',
    });
    const curve = KS.map(k => [k, avg(day2Sizes(k))]);
    function bar(label, n, max, cls) {
      return h('div', { class: 'co-row' }, h('span', { class: 'co-label' }, label),
        h('span', { class: 'co-track' }, h('span', { class: 'co-fill ' + cls, style: `width:${(100 * n / max).toFixed(1)}%` })),
        h('span', { class: 'co-n' }, `${n} B`));
    }
    function draw() {
      const m = day2()[sel], D = dictOf(K), alone = zsize(m), withD = K ? zsize(m, D) : alone;
      msg.textContent = m;
      bars.replaceChildren(bar('raw message', m.length, m.length, 'is-raw'), bar('compressed alone', alone, m.length, 'is-z'),
        bar(K ? 'with the dictionary' : 'no dictionary yet', withD, m.length, 'is-d'));
      P.clear();
      line(P, curve, { color: 'var(--t-delta)', markers: 3.2, tip: ([k, y]) => `<b>${k} sample message${k === 1 ? '' : 's'}</b><br>average ${y.toFixed(1)} B` });
      const a = avg(day2Sizes(K));
      dot(P.g.top, P.x(K), P.y(a), 6 * P.fs, 'var(--c)');
      annotate(P, K, a, `${K}: ${a.toFixed(1)} B`, { dx: K > 30 ? -60 : 30, dy: -36 });
      ro.set([
        ['dictionary', K ? `${K} message${K > 1 ? 's' : ''}, ${nf(D.length)} B` : 'none'],
        ['this message', `${m.length} → ${withD} B`],
        ['all 48 day-two messages', `${a.toFixed(1)} B on average`],
      ]);
    }
    draw();
  };

  /* ------------------------------------------------------------------ I.4 · break-even: the dictionary is paid once */
  FIG.breakEven = function (host) {
    let K = 24, ship = 'raw';
    const NMAX = 100, box = h('div'), ro = readout();
    const alone = avg(day2Sizes(0));
    host.append(
      controls(
        slider('sample messages', 1, 48, 1, K, throttleRAF(v => { K = v; draw(); })),
        seg([['raw', 'dictionary sent as is'], ['z', 'dictionary sent compressed']], ship, v => { ship = v; draw(); }, 'How the dictionary is sent'),
      ),
      legend([['each message compressed alone', series(1)], ['dictionary once + deltas', 'var(--t-dictionary)'], ['raw messages', 'var(--ink-3)', 'dash']]),
      box, ro,
    );
    const P = Plot(box, {
      x: [0, NMAX], y: [0, 15000], h: 330, xticks: [0, 20, 40, 60, 80, 100], yfmt: v => (v ? `${v / 1000}k` : '0'),
      xlabel: 'messages sent', ylabel: 'total bytes over the radio', label: 'Total bytes sent against the number of messages, with and without a dictionary',
    });
    function draw() {
      const D = dictOf(K), fixed = ship === 'raw' ? D.length : zsize(D), delta = avg(day2Sizes(K));
      const nStar = fixed / (alone - delta);
      P.clear();
      line(P, [[0, 0], [NMAX, 147 * NMAX]], { color: 'var(--ink-3)', dash: true, width: 1.6 });
      line(P, [[0, 0], [NMAX, alone * NMAX]], { color: series(1) });
      line(P, [[0, fixed], [NMAX, fixed + delta * NMAX]], { color: 'var(--t-dictionary)' });
      if (nStar <= NMAX) {
        dot(P.g.top, P.x(nStar), P.y(alone * nStar), 6 * P.fs, 'var(--c)');
        annotate(P, nStar, alone * nStar, `break-even after\n${nStar.toFixed(1)} messages`, nStar > 25 ? { dx: -24, dy: -84, anchor: 'end' } : { dx: 30, dy: -84 });
      }
      const per = n => fixed / n + delta;
      ro.set([
        ['dictionary', `${nf(fixed)} B, paid once`],
        ['delta', `${delta.toFixed(1)} B per message (alone: ${alone.toFixed(1)} B)`],
        ['break-even', `${nStar.toFixed(1)} messages ≈ ${(nStar / 2).toFixed(1)} hours`],
        ['per message over 2 days (96)', `${per(96).toFixed(1)} B`],
        ['over a year (17,520)', `${per(17520).toFixed(1)} B`],
      ]);
    }
    draw();
  };

  /* ------------------------------------------------------------------ I.4 · decoding needs the right dictionary */
  FIG.decodeCheck = function (host) {
    const m = day2()[0], R = dictOf(24), delta = deflate(m, R);
    const d1 = day1();
    const OPTS = {
      right: { label: 'the right dictionary', dict: R },
      none: { label: 'no dictionary', dict: null },
      old: { label: 'an older dictionary', dict: d1.slice(0, 24).join('') },
      near: { label: 'almost the right one', dict: d1.slice(24, 46).join('') + d1[47] + d1[46] },
    };
    let pick = 'near';
    const sent = h('div', { class: 'dc-row' }, h('span', { class: 'dc-lab' }, 'sent'), h('code', { class: 'dc-text' }, m));
    const deltaRow = h('div', { class: 'dc-row' }, h('span', { class: 'dc-lab' }, 'delta'),
      h('code', { class: 'dc-text dc-hex' }, [...delta].map(b => b.toString(16).padStart(2, '0')).join(' ')));
    const outRow = h('div', { class: 'dc-row' });
    const ro = readout();
    host.append(controls(seg(Object.entries(OPTS).map(([k, o]) => [k, o.label]), pick, v => { pick = v; draw(); }, 'Decode with')), sent, deltaRow, outRow, ro);
    function draw() {
      const o = OPTS[pick];
      let out = null, err = null;
      try { out = dec(o.dict ? pk().inflateRaw(delta, { dictionary: enc(o.dict) }) : pk().inflateRaw(delta)); } catch (e) { err = String(e && e.message || e); }
      if (out == null && !err) err = 'no output';
      outRow.replaceChildren(h('span', { class: 'dc-lab' }, 'rebuilt'));
      let wrong = 0;
      if (err) outRow.append(h('code', { class: 'dc-text dc-err' }, `DEFLATE error: "${err}"`));
      else {
        const code = h('code', { class: 'dc-text' });
        for (let i = 0; i < Math.max(out.length, m.length); i++) {
          const ch = out[i] ?? '', bad = ch !== m[i];
          if (bad) wrong++;
          code.append(bad ? h('mark', { class: 'dc-bad' }, ch || '·') : ch);
        }
        outRow.append(code);
      }
      ro.set([
        ['dictionary', `${o.label}${o.dict ? `, ${nf(o.dict.length)} B` : ''}`],
        ['delta', `${delta.length} B`],
        ['result', err ? 'refused: the delta points into bytes the receiver does not have'
          : !wrong ? 'exact, byte for byte ✓'
            : wrong > 12 ? `garbled: ${wrong} characters wrong (DEFLATE did not object, but anyone would notice)`
              : `<span class="dc-flag">${wrong} character${wrong > 1 ? 's' : ''} wrong — a plausible message, and nothing complained</span>`],
      ]);
    }
    draw();
  };

  /* ------------------------------------------------------------------ I.5 · rows of numbers: nothing to copy, plenty to predict */
  FIG.numberRows = function (host) {
    const rows = readings(12);
    let mode = 'raw';
    const tbl = h('div', { class: 'nr-wrap' }), ro = readout();
    host.append(controls(seg([['raw', 'as measured'], ['mean', 'minus each column’s typical value'], ['prev', 'minus the row above']], mode, v => { mode = v; draw(); }, 'Show')), tbl, ro);
    const bin = rowsAsBytes(rows), binZ = pk().deflateRaw(bin, { level: 9 }).length;
    const rawBits = bitsPerColumn(rows, 'raw'), sum = a => a.reduce((x, y) => x + y, 0);
    function draw() {
      const heads = ['time', ...COLS.map(c => `${c.short}<br><small>${c.unit}</small>`)];
      const body = [];
      let same = 0;
      if (mode === 'raw') {
        rows.forEach((r, i) => body.push([{ html: r.time, cls: 'l nr-time' }, ...r.v.map((x, c) => {
          const eq = i && x === rows[i - 1].v[c];
          if (eq) same++;
          return { html: fmtVal(x, c), cls: eq ? 'nr-same' : '' };
        })]));
      } else {
        const { typ, L } = leftovers(rows, mode);
        if (typ) body.push({ cls: 'nr-dict', cells: [{ html: 'typical', cls: 'l' }, ...typ.map((x, c) => ({ html: fmtVal(x, c) }))] });
        rows.forEach((r, i) => body.push([{ html: r.time, cls: 'l nr-time' }, ...(L[i]
          ? L[i].map((x, c) => ({ html: fmtLeft(x, c), cls: 'nr-left' }))
          : r.v.map((x, c) => ({ html: fmtVal(x, c), cls: 'nr-full' })))]));
      }
      const bits = mode === 'raw' ? rawBits : bitsPerColumn(rows, mode);
      if (mode !== 'raw') body.push({ cls: 'sum nr-was', cells: [{ html: 'bits, raw', cls: 'l' }, ...rawBits.map(b => ({ html: `${b}` }))] });
      body.push({ cls: mode === 'raw' ? 'sum' : 'nr-now', cells: [{ html: mode === 'raw' ? 'bits' : 'bits, now', cls: 'l' }, ...bits.map(b => ({ html: `${b}` }))] });
      tbl.replaceChildren(table(heads, body, { left: [0] }));
      if (mode === 'raw') ro.set([
        ['equal to the number above', `${same} of 44`],
        ['12 rows as binary numbers', `${bin.length} B → DEFLATE ${binZ} B`],
        ['bits per row', `${sum(rawBits)}`],
      ]);
      else ro.set([
        ['guess', mode === 'mean' ? 'each column’s typical value (4 numbers, sent once)' : 'the row above (the first row is sent in full)'],
        ['bits per row', `${sum(rawBits)} → ${sum(bits)}`],
        ['saved', `${Math.round(100 * (1 - sum(bits) / sum(rawBits)))} %`],
      ]);
    }
    draw();
  };
})();
