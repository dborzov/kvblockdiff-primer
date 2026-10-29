// One pair of key channels before and after RoPE (V.8, KVQuant): pair 4 of a 128-wide head, 64 tokens from position 1000.
// Before RoPE the first channel sits near 9 and its partner near 0.6, each with a little noise (σ = 0.3); RoPE turns the
// pair by 0.56 radians per token. Exactly the window FIG.pbKvqRope (figures/papers-b.js) shows at its start, which
// reads its pre-RoPE values from here (seed 'pb-kvq-rope').
(function () {
  const N = 64, DH = 128, PAIR = 4, START = 1000;
  const OM = Math.pow(10000, -2 * PAIR / DH);
  const sd = a => Math.sqrt(variance(a));
  const len = (a, b) => Math.hypot(a, b);

  function plane(box, ctx) {
    box.append(legend([['before RoPE', series(0), 'dot'], ['after RoPE', series(1), 'dot'], ['a circle of radius 9', 'var(--ink-3)', 'dash']]));
    const b = h('div'); box.append(b);
    const P = Plot(b, { x: [-10.5, 10.5], y: [-10.5, 10.5], equal: true, h: 340, xlabel: 'channel c8', ylabel: 'channel c9', label: 'The pair of channels as points in a plane, before and after RoPE' });
    rule(P, { x: 0, dash: false, color: 'var(--rule)' }); rule(P, { y: 0, dash: false, color: 'var(--rule)' });
    el('path', { d: range(0, 121).map((k, i) => { const a = 2 * Math.PI * k / 120; return `${i ? 'L' : 'M'}${P.x(9 * Math.cos(a))} ${P.y(9 * Math.sin(a))}`; }).join(' '), style: 'fill:none;stroke:var(--ink-3);stroke-dasharray:4 4' }, P.g.bg);
    const sel = r => ctx.sel && ctx.sel.test(r);
    ctx.rows.forEach(r => {
      const c = dot(P.g.data, P.x(r.post8), P.y(r.post9), (sel(r) ? 4.6 : 3.2) * P.fs, series(1), { tabindex: 0 });
      hover(c, () => `<b>position ${r.pos}</b><br>after RoPE: (${fmt(r.post8, 2)}, ${fmt(r.post9, 2)})<br>turned by ${fmt(r.angle, 2)} rad (mod 2π)`);
    });
    ctx.rows.forEach(r => {
      const c = dot(P.g.top, P.x(r.pre8), P.y(r.pre9), (sel(r) ? 4.6 : 3.2) * P.fs, series(0), { tabindex: 0 });
      hover(c, () => `<b>position ${r.pos}</b><br>before RoPE: (${fmt(r.pre8, 2)}, ${fmt(r.pre9, 2)})<br>length ${fmt(r.len, 2)}`);
    });
    annotate(P, 9, 0.6, 'before: one tight spot', { dx: -30, dy: -60 });
    box.append(h('p', { class: 'fig-note', text: 'Each token is a point: its c8 number across, its c9 number up. RoPE swings every point around the centre by its own angle, so the tight spot is smeared around the whole circle. Lengths do not change; directions do.' }));
  }

  DS.define('papers-rope', {
    rows() {
      const r = rng('pb-kvq-rope');
      const na = range(N).map(() => r.normal()), nb = range(N).map(() => r.normal());
      return range(N).map(t => {
        const pre8 = 9 + 0.3 * na[t], pre9 = 0.6 + 0.3 * nb[t], ang = (START + t) * OM;
        const post8 = pre8 * Math.cos(ang) - pre9 * Math.sin(ang), post9 = pre8 * Math.sin(ang) + pre9 * Math.cos(ang);
        return { t, pos: START + t, pre8, pre9, post8, post9, angle: ang % (2 * Math.PI), len: len(pre8, pre9) };
      });
    },
    columns: [
      { key: 'pos', label: 'position' },
      { key: 'pre8', label: 'c8 before', fmt: v => fmt(v, 2) }, { key: 'pre9', label: 'c9 before', fmt: v => fmt(v, 2) },
      { key: 'post8', label: 'c8 after', fmt: v => fmt(v, 2) }, { key: 'post9', label: 'c9 after', fmt: v => fmt(v, 2) },
      { key: 'len', label: 'length', fmt: v => fmt(v, 2) },
    ],
    csvColumns: ['pos', 'pre8', 'pre9'],
    views: {
      plane: { label: 'The pair as points', draw: plane, legend: false },
    },
    metrics: [
      { id: 'turn', label: 'turn per token', value: () => OM, fmt: v => `${fmt(v, 3)} rad`,
        note: v => `Pair ${PAIR} of a 128-wide head, base 10,000: a full turn every ${fmt(2 * Math.PI / v, 1)} tokens. The window of 64 tokens sees the pair spin almost six times.` },
      { id: 'level', label: 'level of c8, before → after', tex: '\\vmu', value: rows => [mean(rows.map(r => r.pre8)), mean(rows.map(r => r.post8))],
        fmt: v => `${fmt(v[0], 1)} → ${fmt(v[1], 1)}`,
        note: 'Before RoPE the channel has a typical value of its own, the thing a per-channel ruler or dictionary uses. After RoPE its average over the window is near zero: the typical value is gone.' },
      { id: 'spread', label: 'spread of c8, before → after', tex: '\\vsigma', value: rows => [sd(rows.map(r => r.pre8)), sd(rows.map(r => r.post8))],
        fmt: v => `${fmt(v[0], 2)} → ${fmt(v[1], 2)}`,
        note: v => `The same numbers, ${fmt(v[1] / v[0], 0)} times more spread out once turned. Halving a spread saves a bit (II.11), so an exact per-channel code would pay about ${fmt(Math.log2(v[1] / v[0]), 1)} more bits per number after RoPE.` },
      { id: 'length', label: 'average length of the pair, before → after', value: rows => [mean(rows.map(r => r.len)), mean(rows.map(r => len(r.post8, r.post9)))],
        fmt: v => `${fmt(v[0], 3)} → ${fmt(v[1], 3)}`,
        note: 'Unchanged: a rotation moves no point closer to the centre. Nothing is lost; the information has only moved from "how big" into "which direction".' },
    ],
    helpers: { pre: () => ({ a: DS.col('papers-rope', 'pre8'), b: DS.col('papers-rope', 'pre9') }) },
    code: `
import numpy as np, pandas as pd

d = pd.read_csv("{csv}")                         # columns: pos, pre8, pre9 (pair 4, before RoPE)
turn = 10000 ** (-2 * 4 / 128)                   # radians per token for pair 4 of a 128-wide head
ang = d["pos"] * turn
post8 = d["pre8"] * np.cos(ang) - d["pre9"] * np.sin(ang)
post9 = d["pre8"] * np.sin(ang) + d["pre9"] * np.cos(ang)
print("turn:", round(turn, 3), "rad per token")
print("level of c8:", d["pre8"].mean().round(1), "->", post8.mean().round(1))
print("spread of c8:", d["pre8"].std(ddof=0).round(2), "->", post8.std(ddof=0).round(2))
print("length:", np.hypot(d["pre8"], d["pre9"]).mean().round(3), "->", np.hypot(post8, post9).mean().round(3))
`,
  });
})();
