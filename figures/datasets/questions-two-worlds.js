// Two worlds with the same 274 misses (VIII.4): one decode step at one layer, a 100K-token request in 25 blocks of
// 4,096, the dictionaries of 4 blocks resident. In one world the misses spread evenly over all 25 blocks; in the other
// 233 of them (85 %) pile into the 4 resident blocks. Illustrative: positions are seeded and invented, not traced.
(function () {
  const NB = 25, BS = 4096, RES = [1, 9, 10, 25], RHO = 0.65;
  const PILED = { 1: 52, 9: 61, 10: 48, 25: 72 };          // 233 misses in the heavy blocks
  const WORLDS = [['even', 'spread evenly'], ['piled', 'piled into 4 heavy blocks']];
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
  const DM = 'var(--t-delta-miss)', RM = 'var(--t-raw-miss)';
  const of = (rows, w) => rows.filter(r => r.world === w);
  const fD = rows => rows.filter(r => r.dm).length / rows.length;
  const link = rows => sum(rows.map(r => r.cost));
  const saving = rows => 1 - link(rows) / rows.length;

  /** Misses per block, one row of bars per world; resident blocks in the δ-miss colour. */
  const perBlock = {
    label: 'Misses per block',
    legend: false,
    highlights: [],
    draw(box, ctx) {
      box.append(legend([['δ-miss: dictionary resident, delta crosses', DM, 'box'], ['raw miss: whole entry crosses', RM, 'box']]));
      const D = Diagram(box, { w: 640, h: 330, label: 'Misses per block in the two worlds', grow: 0.3 });
      const fs = D.fs, L = 34 * fs, R = 632, bw = (R - L) / NB, g = el('g', {}, D.svg);
      const lane = 128 + 22 * fs, top0 = 24 * fs;
      const ymax = 75, hh = lane - 44 * fs;
      WORLDS.forEach(([w, name], wi) => {
        const rows = of(ctx.rows, w), y0 = top0 + wi * lane, base = y0 + 16 * fs + hh;
        const fd = fD(rows);
        el('text', { x: L, y: y0 + 4 * fs, class: 'lbl', text: `misses ${name}: ${rows.filter(r => r.dm).length} of ${rows.length} are δ-misses (${fmtPct(fd, 0)})` }, g);
        el('line', { x1: L, x2: R, y1: base, y2: base, style: 'stroke:var(--ink-3)' }, g);
        range(1, NB + 1).forEach(b => {
          const inB = rows.filter(r => r.block === b), n = inB.length, res = RES.includes(b);
          const x = L + (b - 1) * bw, ht = hh * n / ymax;
          const sel = ctx.sel && inB.some(r => ctx.sel.test(r));
          const dim = ctx.sel && !sel ? 35 : 100;
          const rc = el('rect', { x: x + 1.5, y: base - ht, width: bw - 3, height: Math.max(0.5, ht), rx: 2, tabindex: 0,
            style: `fill:${mix(res ? DM : RM, dim)};${sel ? 'stroke:var(--c);stroke-width:2' : ''}` }, g);
          if (n >= 30 || (wi === 0 && b === 1)) el('text', { x: x + bw / 2, y: base - ht - 4 * fs, 'text-anchor': 'middle', class: 'val', text: String(n) }, g);
          hover(rc, () => `<b>block ${b}</b> (tokens ${fmt((b - 1) * BS, 0)}–${fmt(b * BS - 1, 0)})<br>${n} misses, ${name}<br>${res ? 'dictionary resident: δ-misses' : 'no dictionary: raw misses'}`);
          rc.addEventListener('click', () => ctx.select({ label: `block ${b}`, test: r => r.block === b }));
        });
        if (wi === 1) [1, 5, 10, 15, 20, 25].forEach(b => el('text', { x: L + (b - 0.5) * bw, y: base + 15 * fs, 'text-anchor': 'middle', class: 'val', text: String(b) }, g));
      });
      el('text', { x: (L + R) / 2, y: top0 + 2 * lane + 2 * fs, 'text-anchor': 'middle', class: 'lbl', text: 'block (4,096 tokens each)' }, g);
      D.svg.setAttribute('viewBox', `0 0 640 ${top0 + 2 * lane + 10 * fs}`);
      box.append(h('p', { class: 'fig-note', text: 'Blocks 1, 9, 10 and 25 have their dictionaries resident in both worlds. Click a bar to select its misses.' }));
    },
  };

  /** Where each miss sits in the request's 100K tokens: one lane per world, one tick per miss. */
  const strip = {
    label: 'Along the request',
    legend: false,
    draw(box, ctx) {
      box.append(legend([['δ-miss', DM, 'dot'], ['raw miss', RM, 'dot'], ['resident block', mix('var(--t-dictionary-cache)', 40), 'box']]));
      const D = Diagram(box, { w: 640, h: 230, label: 'Position of every miss in the request, in the two worlds', grow: 0.3 });
      const fs = D.fs, L = 12, R = 628, g = el('g', {}, D.svg), X = p => L + (R - L) * p / (NB * BS);
      const laneH = 62 * fs, t0 = 22 * fs;
      WORLDS.forEach(([w, name], wi) => {
        const y0 = t0 + wi * (laneH + 30 * fs);
        el('text', { x: L, y: y0 - 6 * fs, class: 'lbl', text: `misses ${name}` }, g);
        range(NB).forEach(b => el('rect', { x: X(b * BS), y: y0, width: X(BS) - X(0), height: laneH,
          style: `fill:${RES.includes(b + 1) ? mix('var(--t-dictionary-cache)', 26) : mix('var(--ink)', b % 2 ? 3 : 6)}` }, g));
        of(ctx.rows, w).forEach(r => {
          const sel = ctx.sel && ctx.sel.test(r), hl = ctx.hl && ctx.hl.test(r);
          const c = el('circle', { cx: X(r.pos), cy: y0 + 6 * fs + r.jit * (laneH - 12 * fs), r: (sel || hl ? 3.4 : 2.4) * fs,
            style: `fill:${mix(r.dm ? DM : RM, ctx.sel && !sel ? 30 : 100)};stroke:var(--paper-3);stroke-width:.6` }, g);
          hover(c, () => `<b>miss ${r.k}</b>, ${name}<br>token ${fmt(r.pos, 0)}, block ${r.block}<br>${r.dm ? 'δ-miss' : 'raw miss'}: ${fmt(r.cost, 2)} entry's worth on the link`);
        });
      });
      const yb = t0 + 2 * laneH + 30 * fs + 16 * fs;
      [0, 25, 50, 75, 100].forEach(k => el('text', { x: X(k * 1024), y: yb, 'text-anchor': k === 0 ? 'start' : k === 100 ? 'end' : 'middle', class: 'val', text: `${k}K` }, g));
      el('text', { x: (L + R) / 2, y: yb + 16 * fs, 'text-anchor': 'middle', class: 'lbl', text: 'token position in the request' }, g);
      D.svg.setAttribute('viewBox', `0 0 640 ${yb + 24 * fs}`);
    },
  };

  DS.define('questions-two-worlds', {
    helpers: { RHO, RES, NB },
    rows() {
      const r = rng('questions-two-worlds');
      const out = [];
      const push = (world, block, pos) => {
        const dm = RES.includes(block);
        out.push({ world, wname: WORLDS.find(x => x[0] === world)[1], block, pos, dm, kind: dm ? 'δ-miss' : 'raw miss', cost: dm ? RHO : 1, jit: r() });
      };
      // even: 274 = 24 blocks × 11 + 1 block × 10 (block 17), positions uniform in each block
      range(1, NB + 1).forEach(b => range(b === 17 ? 10 : 11).forEach(() => push('even', b, (b - 1) * BS + r.int(BS))));
      // piled: 233 in the heavy blocks, clustered around a hot spot in each; 41 scattered over the other 21 blocks
      Object.entries(PILED).forEach(([b, n]) => {
        b = +b; const spot = 600 + r.int(BS - 1200);
        range(n).forEach(() => push('piled', b, (b - 1) * BS + clamp(Math.round(spot + r.normal(0, 380)), 0, BS - 1)));
      });
      const cold = range(1, NB + 1).filter(b => !RES.includes(b));
      range(41).forEach(() => { const b = r.pick(cold); push('piled', b, (b - 1) * BS + r.int(BS)); });
      ['even', 'piled'].forEach(w => out.filter(o => o.world === w).sort((a, b) => a.pos - b.pos).forEach((o, i) => { o.k = i + 1; }));
      return out.sort((a, b) => (a.world === b.world ? a.k - b.k : a.world === 'even' ? -1 : 1));
    },
    columns: [
      { key: 'wname', label: 'world', left: true },
      { key: 'k', label: 'miss' },
      { key: 'pos', label: 'token', fmt: v => fmt(v, 0) },
      { key: 'block', label: 'block' },
      { key: 'kind', label: 'kind', left: true },
      { key: 'cost', label: 'on the link (entries)', fmt: v => fmt(v, 2) },
    ],
    csvColumns: ['world', 'k', 'pos', 'block', 'kind', 'cost'],
    highlights: { dm: { label: 'δ-misses', test: r => r.dm } },
    views: { perBlock, strip },
    metrics: [
      { id: 'n', label: 'misses per world', value: rows => of(rows, 'even').length, fmt: (v, rows) => `${v} and ${of(rows, 'piled').length}`,
        note: 'One decode step at one layer in the reference setting. Same count in both worlds: the hot cache is equally good in each.' },
      { id: 'fdEven', label: '$\\vfD$, misses spread evenly', value: rows => fD(of(rows, 'even')), fmt: (v, rows) => `${of(rows, 'even').filter(r => r.dm).length} / 274 = ${fmtPct(v, 0)}`,
        note: 'Four resident dictionaries out of 25 blocks catch four twenty-fifths of the misses. Spread misses make the dictionary cache no better than a lottery ticket.' },
      { id: 'fdPiled', label: '$\\vfD$, misses piled up', value: rows => fD(of(rows, 'piled')), fmt: (v, rows) => `${of(rows, 'piled').filter(r => r.dm).length} / 274 = ${fmtPct(v, 0)}`,
        note: 'The same four dictionaries, now sitting where the misses are. This 85 % is an assumption chosen for the example; framework C exists to measure it.' },
      { id: 'linkEven', label: 'link traffic, spread evenly', value: rows => link(of(rows, 'even')), fmt: v => `${fmt(v, 0)} entries' worth`,
        note: `Each δ-miss moves $\\vrho = ${RHO}$ of an entry (assumed), each raw miss a whole one: 274 × (0.16 × 0.65 + 0.84).` },
      { id: 'linkPiled', label: 'link traffic, piled up', value: rows => link(of(rows, 'piled')), fmt: v => `${fmt(v, 0)} entries' worth`,
        note: '274 × (0.85 × 0.65 + 0.15). The coder and $\\vrho$ have not changed; only where the misses land.' },
      { id: 'saveEven', label: 'saving on miss traffic, spread evenly', value: rows => saving(of(rows, 'even')), fmt: v => fmtPct(v, 0),
        note: 'Barely visible: a good coder wasted on a dictionary cache that is almost never in the right place.' },
      { id: 'savePiled', label: 'saving on miss traffic, piled up', value: rows => saving(of(rows, 'piled')), fmt: (v, rows) => `${fmtPct(v, 0)} · ${fmt(v / saving(of(rows, 'even')), 1)}× the even world`,
        note: 'Five times the saving from the same bytes. That is why Q3 is a question of its own, and why it can be answered without opening a single entry.' },
    ],
    code: `
import pandas as pd

m = pd.read_csv("{csv}")                # columns: world, k, pos, block, kind, cost (entries' worth on the link)
for world, g in m.groupby("world"):
    fD = (g.kind == "δ-miss").mean()
    link = g.cost.sum()
    print(f"{world:6s} misses {len(g)}  f_D {fD:.2f}  link {link:.0f} entries' worth  saving {1 - link / len(g):.0%}")
print(m.groupby(["world", "block"]).size().unstack(0).fillna(0).astype(int))   # misses per block
`,
  });
})();
