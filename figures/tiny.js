/* Part I — the tiny-file problem. Figures and the shared Gull Rock message generator.
   window.GULL.records(n) returns the first n messages the Gull Rock weather station sends
   (one every 30 minutes from 2026-10-28 14:30Z), as compact JSON strings, deterministic. */
window.FIG = window.FIG || {};

(function () {
  'use strict';

  // ------------------------------------------------------------ the toy data
  function rng(seed) {
    let s = seed | 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gaussian(r) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }

  const KEYS = ['station', 'time', 'temp_c', 'humidity', 'pressure_hpa', 'wind_kn', 'wind_dir', 'sky'];
  let cache = null;
  function generate(n) {
    const r = rng(7), N = () => gaussian(r);
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
      T += -0.05 + 0.18 * N();
      Hm = Math.min(0.99, Math.max(0.6, Hm + 0.006 + 0.012 * N()));
      P += -0.35 + 0.15 * N();
      W = Math.max(3, Math.round(W + 0.3 + 1.1 * N()));
      if (r() < 0.12 && di < 3) di++;
      if (i === 9) sky = 'light rain'; else if (i === 21) sky = 'rain'; else if (i === 33) sky = 'heavy rain';
    }
    return out;
  }
  const STRING_KEYS = new Set(['station', 'time', 'wind_dir', 'sky']);
  // compact JSON exactly as sent: numbers keep their fixed decimals (12.0 stays 12.0)
  function fields(rec) { return KEYS.map(k => ({ key: k, head: `${k === 'station' ? '{' : ','}"${k}":`, value: STRING_KEYS.has(k) ? `"${rec[k]}"` : rec[k] })); }
  function compact(rec) { return fields(rec).map(f => f.head + f.value).join('') + '}'; }
  function records(n) {
    if (!cache || cache.length < n) cache = generate(Math.max(n, 96));
    return cache.slice(0, n);
  }
  window.GULL = { records, compact, fields, rng, gaussian };

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
