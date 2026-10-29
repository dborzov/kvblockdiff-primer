// The foot thermometer of ten-days stored as BF16 (1 sign, 8 exponent, 7 mantissa bits): II.19.
// Derived: rows() reads DS.rows('ten-days'). Rounding is round-to-nearest-even from float32, as hardware does.
(function () {
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  function bf16(x) {
    const f = new Float32Array([x]), u = new Uint32Array(f.buffer);
    const lsb = (u[0] >>> 16) & 1;
    const b = ((u[0] + 0x7fff + lsb) >>> 16) & 0xffff;
    const g = new Uint32Array([b << 16]);
    return { bits: b, value: new Float32Array(g.buffer)[0] };
  }
  const GROUP = i => (i === 0 ? 6 : i < 9 ? 0 : 1);               // sign · exponent · mantissa colours
  const NAMES = ['s', 'e7', 'e6', 'e5', 'e4', 'e3', 'e2', 'e1', 'e0', 'm6', 'm5', 'm4', 'm3', 'm2', 'm1', 'm0'];
  const bitStr = b => b.toString(2).padStart(16, '0');
  const fieldEntropy = (rows, f) => { const c = {}; rows.forEach(r => { const k = f(r.bits); c[k] = (c[k] || 0) + 1; }); return entropy(Object.values(c)); };
  const bitEntropy = (rows, i) => { const p = rows.filter(r => (r.bits >> (15 - i)) & 1).length / rows.length; return entropy([p, 1 - p]); };
  const colored = s => [[0, 1, 6], [1, 9, 0], [9, 16, 1]].map(([a, b, k]) => `<span style="padding:0 .15rem;border-radius:3px;background:${mix(series(k), 22)}">${s.slice(a, b)}</span>`).join(' ');

  DS.define('ten-days-bf16', {
    rows() {
      return DS.rows('ten-days').map(r => {
        const b = bf16(r.low);
        return { i: r.i, day: r.day, time: r.time, t: r.t, temp: r.low, bf16: b.value, bits: b.bits, pattern: bitStr(b.bits), binade: r.low >= 8 ? '[8, 16)' : '[4, 8)' };
      });
    },
    columns: [
      { key: 'day', label: 'day' }, { key: 'time', label: 'time' }, { key: 'temp', label: 'reading (°C)', fmt: v => v.toFixed(1) },
      { key: 'bf16', label: 'as BF16', fmt: v => String(v) }, { key: 'pattern', label: 'sign · exponent · mantissa', left: true, fmt: s => `<span class="mono">${colored(s)}</span>` },
      { key: 'binade', label: 'binade', left: true },
    ],
    csvColumns: ['day', 'time', 'temp', 'bf16', 'pattern'],
    highlights: {
      low: { label: 'below 8 °C (binade [4, 8))', test: r => r.temp < 8 },
    },
    views: {
      raster: {
        label: 'All 7,680 bits',
        draw(box, ctx) {
          box.append(legend([['sign', series(6), 'box'], ['exponent (8 bits)', series(0), 'box'], ['mantissa (7 bits)', series(1), 'box']]));
          const D = Diagram(box, { w: 640, h: 330, grow: 0.5, label: 'Every bit of every BF16 reading: one column per reading, one row per bit position' });
          const fs = D.fs, L = 46 * Math.min(fs, 1.5), R = 640 - 50 * Math.min(fs, 1.5), T = 8, rh = (D.H - T - 22 * fs) / 16;
          const rows = ctx.rows, n = rows.length, cw = (R - L) / n;
          const g = el('g', {}, D.svg);
          NAMES.forEach((name, i) => {
            const y = T + i * rh, k = GROUP(i);
            el('rect', { x: L, y, width: R - L, height: rh - 1, style: `fill:${mix(series(k), 7)}` }, g);
            el('text', { x: L - 6, y: y + rh * 0.7, 'text-anchor': 'end', class: 'val', text: name }, g);
            let run = -1;                                      // run-length rectangles of the 1 bits
            for (let j = 0; j <= n; j++) {
              const on = j < n && (rows[j].bits >> (15 - i)) & 1;
              if (on && run < 0) run = j;
              if (!on && run >= 0) { el('rect', { x: L + run * cw, y, width: (j - run) * cw, height: rh - 1, style: `fill:${series(k)}` }, g); run = -1; }
            }
            el('text', { x: R + 6, y: y + rh * 0.7, class: 'val', text: fmt(bitEntropy(rows, i), 2) }, g);
          });
          el('text', { x: R + 6, y: T + 16 * rh + 16 * fs, class: 'lbl', text: 'bits' }, g);
          if (ctx.hl) rows.forEach((r, j) => { if (ctx.hl.test(r)) el('rect', { x: L + j * cw, y: T + 16 * rh + 2, width: Math.max(cw, 1), height: 6 * fs, style: `fill:${series(1)}` }, g); });
          el('text', { x: L, y: T + 16 * rh + 18 * fs, class: 'lbl', text: 'reading 0 → 479 (ten days)' }, g);
          const hit = el('rect', { x: L, y: T, width: R - L, height: 16 * rh, class: 'hit', tabindex: 0 }, D.svg);
          hover(hit, e => {
            const bb = D.svg.getBoundingClientRect(), j = e && e.clientX != null ? clamp(Math.floor(((e.clientX - bb.left) / bb.width * 640 - L) / cw), 0, n - 1) : 0, r = rows[j];
            return `<b>day ${r.day}, ${r.time}</b>: ${r.temp.toFixed(1)} °C → ${r.bf16}<br><span class="mono">${colored(r.pattern)}</span>`;
          });
          box.append(h('p', { class: 'fig-note', text: 'Each thin column is one reading, top to bottom its 16 bits; a filled cell is a 1. The number at the right of each row is that bit’s entropy over the ten days. Solid stripes cost nothing; static costs a full bit.' }));
        },
      },
      entropy: {
        label: 'Entropy of each bit',
        draw(box, ctx) {
          const b = h('div'); box.append(b);
          const P = Plot(b, { xcats: NAMES, y: [0, 1.1], h: 260, grid: 'y', xlabel: 'bit position (sign, exponent e7…e0, mantissa m6…m0)', ylabel: 'bits of information', label: 'Entropy of each bit of a BF16 temperature' });
          const Hb = NAMES.map((_, i) => bitEntropy(ctx.rows, i));
          bars(P, Hb, { colors: i => series(GROUP(i)), labels: v => (v < 0.005 ? '' : fmt(v, 2)), width: 22,
            tip: (v, i) => `<b>bit ${NAMES[i]}</b><br>${fmt(v, 3)} bits: ${v < 0.05 ? 'always the same — free to predict' : v > 0.9 ? 'a coin flip — looks like noise' : 'partly predictable'}` });
        },
      },
      hist: DS.views.histogram({ key: 'temp', bin: 0.5, domain: [4, 16], xlabel: 'temperature (°C)', ylabel: 'readings', unit: '°C', noun: 'readings', label: 'Temperatures',
        after(P) { rule(P, { x: 7.75, label: 'binade boundary: 8 °C', color: 'var(--ink-2)' }); } }),
    },
    metrics: [
      { id: 'range', label: 'temperatures', value: rows => extent(rows.map(r => r.temp)), fmt: v => `${fmt(v[0], 1)} … ${fmt(v[1], 1)} °C`,
        note: 'All of them between 4 and 16 °C, so only two binades ever occur, [4, 8) and [8, 16). The sign is always 0.' },
      { id: 'exp', label: 'sign + exponent (9 bits), together', tex: '\\vH', value: rows => fieldEntropy(rows, b => b >> 7), fmt: v => `${fmt(v, 2)} bits`,
        note: v => `Nine bits stored, ${fmt(v, 2)} bits of information: just "is it below 8 °C?", and it nearly always is not. A coder squeezes this field almost to nothing.` },
      { id: 'man', label: 'mantissa (7 bits), together', tex: '\\vH', value: rows => fieldEntropy(rows, b => b & 127), fmt: v => `${fmt(v, 2)} bits`,
        note: 'Close to the full 7: the mantissa looks like coin flips. Its lowest bits stand for sixteenths of a degree, finer than the thermometer’s own noise (about 0.15 °C).' },
      { id: 'all', label: 'the whole 16-bit pattern', tex: '\\vH', value: rows => fieldEntropy(rows, b => b), fmt: v => `${fmt(v, 2)} bits`,
        note: v => `Of 16 stored bits, ${fmt(v, 2)} carry information: about ${fmt(16 - v, 0)} bits per value could be saved, almost all of them in the sign and exponent.` },
      { id: 'low', label: 'readings below 8 °C', value: rows => rows.filter(r => r.temp < 8).length, fmt: (v, rows) => `${v} of ${rows.length}`,
        note: 'The only thing the exponent ever has to say. A rare event, so cheap: its entropy is far below one bit.' },
    ],
    code: `
import numpy as np, pandas as pd

t = pd.read_csv("{csv}")                       # columns: day, time, temp, bf16, pattern
u = np.array(t["temp"], dtype=np.float32).view(np.uint32)
bits = ((u + 0x7FFF + ((u >> 16) & 1)) >> 16).astype(np.uint16)   # round to nearest even, keep the top 16

def H(x):
    _, c = np.unique(x, return_counts=True); p = c / c.sum()
    return -(p * np.log2(p)).sum()

print("sign+exponent:", H(bits >> 7).round(2), " mantissa:", H(bits & 127).round(2), " all:", H(bits).round(2))
print("per bit:", [H((bits >> (15 - i)) & 1).round(2) for i in range(16)])
`,
  });
})();
