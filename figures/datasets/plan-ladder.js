// The rehearsal ladder: what analysis/plan_harness.py printed for the loc dictionary on its synthetic set
// (4 evaluation sequences x 8192 entries x 64 channels, true block length 2048) — every (format, coder, data, scope)
// with its entropy rate and fixed-length rate in bits per element. Shown on IX.7 and IX.8; FIG.planControlsRun (IX.3)
// and FIG.planDecision (IX.9) read the same numbers through DS.spec('plan-ladder').helpers.J.
// J is a verbatim subset of figures/data/plan-harness.json (keys synthetic, bs, float_gains, roundtrip, solo, ladder,
// gains, controls). If the script is re-run, paste its new values here.
(function () {
  const J = {"synthetic":{"n_eval":4,"n_calib":8,"T":8192,"d":64,"true_b":2048,"var_req":1.0,"var_blk":1.0,"truth":{"gainreq":0.292,"gainblk":0.5}},"bs":[256,512,1024,2048,4096],"float_gains":{"orig":{"gainreq":0.407,"gainblk":{"256":0.37,"512":0.369,"1024":0.368,"2048":0.368,"4096":0.114}},"shuf":{"gainreq":0.105,"gainblk":{"256":0.003,"512":0.001,"1024":0.001,"2048":0.0,"4096":0.0}}},"roundtrip":{"entries":2048,"d":64,"loc_dict_bytes":64,"mean_delta_bytes":56.05,"raw_entry_bytes":64,"fixed_bits_per_element":7.006,"int8_wraparound_example":{"codes":[120,-120],"location":[-100,100],"int8_residual":[-36,36],"true_residual":[220,-220]}},"solo":{"int8":{"entropy":7.073,"fixed":8.0,"entropy_index_space_laplace":7.074,"order0_hist":6.836},"e4m3":{"entropy":6.367,"fixed":8.0,"entropy_index_space_laplace":8.375,"order0_hist":6.128}},"ladder":{"int8":{"loc":{"orig":{"global":[7.0734,7.9533],"request":[6.6139,7.3832],"block":{"256":[6.3759,7.1389],"512":[6.3164,7.0825],"1024":[6.2867,7.0296],"2048":[6.2718,7.0117],"4096":[6.4958,7.2245]}},"shuf":{"global":[7.0734,7.9533],"request":[6.9427,7.8349],"block":{"256":[7.058,7.9019],"512":[6.9986,7.8797],"1024":[6.9688,7.8454],"2048":[6.9539,7.8381],"4096":[6.9465,7.835]}}},"loc+flag":{"orig":{"global":[7.0734,7.9531],"request":[6.6141,7.383],"block":{"256":[6.3798,7.1405],"512":[6.3183,7.0824],"1024":[6.2876,7.0295],"2048":[6.2723,7.0122],"4096":[6.4961,7.2228]}},"shuf":{"global":[7.0734,7.9531],"request":[6.9429,7.8311],"block":{"256":[7.062,7.8953],"512":[7.0006,7.8736],"1024":[6.9697,7.841],"2048":[6.9544,7.8365],"4096":[6.9467,7.8332]}}}},"e4m3":{"loc":{"orig":{"global":[6.3668,8.8471],"request":[5.906,8.7859],"block":{"256":[5.6694,8.6142],"512":[5.6098,8.5958],"1024":[5.5801,8.557],"2048":[5.5653,8.5559],"4096":[5.7887,8.722]}},"shuf":{"global":[6.3668,8.8471],"request":[6.2344,8.8286],"block":{"256":[6.3496,8.9376],"512":[6.2902,8.8799],"1024":[6.2604,8.8506],"2048":[6.2456,8.8354],"4096":[6.2381,8.8247]}}},"loc+flag":{"orig":{"global":[6.3668,7.9065],"request":[5.9062,7.8485],"block":{"256":[5.6733,7.7662],"512":[5.6118,7.7301],"1024":[5.5811,7.6942],"2048":[5.5658,7.6873],"4096":[5.7889,7.8062]}},"shuf":{"global":[6.3668,7.9065],"request":[6.2345,7.8794],"block":{"256":[6.3535,8.001],"512":[6.2922,7.9404],"1024":[6.2614,7.9077],"2048":[6.2461,7.8916],"4096":[6.2384,7.8835]}}}}},"gains":{"int8":{"loc":{"orig":{"entropy":{"gainreq":0.459,"gainblk":0.342,"best_b":2048,"bpe_global":7.073,"bpe_best":6.272},"fixed":{"gainreq":0.57,"gainblk":0.371,"best_b":2048,"bpe_global":7.953,"bpe_best":7.012}},"shuf":{"entropy":{"gainreq":0.131,"gainblk":-0.004,"best_b":4096,"bpe_global":7.073,"bpe_best":6.946},"fixed":{"gainreq":0.118,"gainblk":-0.0,"best_b":4096,"bpe_global":7.953,"bpe_best":7.835}}},"loc+flag":{"orig":{"entropy":{"gainreq":0.459,"gainblk":0.342,"best_b":2048,"bpe_global":7.073,"bpe_best":6.272},"fixed":{"gainreq":0.57,"gainblk":0.371,"best_b":2048,"bpe_global":7.953,"bpe_best":7.012}},"shuf":{"entropy":{"gainreq":0.131,"gainblk":-0.004,"best_b":4096,"bpe_global":7.073,"bpe_best":6.947},"fixed":{"gainreq":0.122,"gainblk":-0.002,"best_b":4096,"bpe_global":7.953,"bpe_best":7.833}}}},"e4m3":{"loc":{"orig":{"entropy":{"gainreq":0.461,"gainblk":0.341,"best_b":2048,"bpe_global":6.367,"bpe_best":5.565},"fixed":{"gainreq":0.061,"gainblk":0.23,"best_b":2048,"bpe_global":8.847,"bpe_best":8.556}},"shuf":{"entropy":{"gainreq":0.132,"gainblk":-0.004,"best_b":4096,"bpe_global":6.367,"bpe_best":6.238},"fixed":{"gainreq":0.019,"gainblk":0.004,"best_b":4096,"bpe_global":8.847,"bpe_best":8.825}}},"loc+flag":{"orig":{"entropy":{"gainreq":0.461,"gainblk":0.34,"best_b":2048,"bpe_global":6.367,"bpe_best":5.566},"fixed":{"gainreq":0.058,"gainblk":0.161,"best_b":2048,"bpe_global":7.907,"bpe_best":7.687}},"shuf":{"entropy":{"gainreq":0.132,"gainblk":-0.004,"best_b":4096,"bpe_global":6.367,"bpe_best":6.238},"fixed":{"gainreq":0.027,"gainblk":-0.004,"best_b":4096,"bpe_global":7.907,"bpe_best":7.883}}}}},"controls":{"synthetic_truth":{"best_b":2048,"gainblk":0.342,"gainreq":0.459,"float_gainblk":0.368,"float_gainreq":0.407,"population_gainblk":0.5,"population_gainreq":0.292},"shuffle":{"int8":{"loc":{"gainreq":0.131,"gainblk":-0.004,"best_b":4096,"bpe_global":7.073,"bpe_best":6.946},"loc+flag":{"gainreq":0.131,"gainblk":-0.004,"best_b":4096,"bpe_global":7.073,"bpe_best":6.947}},"e4m3":{"loc":{"gainreq":0.132,"gainblk":-0.004,"best_b":4096,"bpe_global":6.367,"bpe_best":6.238},"loc+flag":{"gainreq":0.132,"gainblk":-0.004,"best_b":4096,"bpe_global":6.367,"bpe_best":6.238}}},"scope_consistency":"request == block(b = T) for every coder, format and data set, to the bit","roundtrip":"every block (residuals) + 2048 entries packed to bytes and rebuilt one at a time","calibration_gap_float":{"n_eval":8,"by_n_calib":{"2":0.217,"8":0.115,"32":0.069}}}};

  const BS = J.bs, T = J.synthetic.T;
  const FMT = { int8: 'INT8', e4m3: 'E4M3' }, RATE = { entropy: 'entropy rate', fixed: 'fixed-length rate' };
  const fmtB = b => (b >= 1024 ? `${b / 1024}K` : String(b));
  const g = (f, c, d, rate) => J.gains[f][c][d][rate];
  const pair = (a, b) => `${fmt(a, 3)} + ${fmt(b, 3)} = <b>${fmt(a + b, 2)} bit</b>`;
  const mix = (c, p) => `color-mix(in srgb, ${c} ${p}%, transparent)`;

  // Table 1: one row per (format, coder, data); cells "entropy / fixed-length".
  function table1(box, ctx) {
    const cell = (a, b, d = 3) => `${fmt(a, d)} <span style="color:var(--ink-3)">/</span> ${fmt(b, d)}`;
    const out = [];
    ['int8', 'e4m3'].forEach(f => ['loc', 'loc+flag'].forEach(c => ['orig', 'shuf'].forEach(d => {
      const L = J.ladder[f][c][d], ge = g(f, c, d, 'entropy'), gf = g(f, c, d, 'fixed');
      const shuf = d === 'shuf', hl = ctx.hl && ctx.rows.some(r => r.fmt === f && r.coder === c && r.data === d && ctx.hl.test(r));
      const best = ge.best_b;
      out.push({
        cls: hl ? 'hl' : null,
        cells: [
          { html: `${c}, ${FMT[f]}${shuf ? ' <i>(shuffled)</i>' : ''}` },
          { html: cell(L.global[0], L.global[1]) },
          { html: cell(L.request[0], L.request[1]) },
          { html: `${cell(L.block[best][0], L.block[best][1])} <span style="color:var(--ink-3)">(${fmtB(best)})</span>` },
          { html: `${fmtS(ge.gainreq, 3)} / ${fmtS(gf.gainreq, 3)}` },
          { html: `${fmtS(ge.gainblk, 3)} / ${fmtS(gf.gainblk, 3)}` },
        ],
      });
    })));
    box.append(table(['coder, format', 'global', 'request', 'best block (b)', texify('$\\vgainreq$'), texify('$\\vgainblk$')], out, { left: [0] }));
    const so = J.solo;
    box.append(h('p', { class: 'fig-note', html: texify(`Each cell: entropy rate / fixed-length rate, in bits per element, every byte charged. The best block is the one with the lowest entropy rate. Solo coding (rung 0, global): INT8 ${fmt(so.int8.entropy, 3)} / ${fmt(so.int8.fixed, 1)}, E4M3 ${fmt(so.e4m3.entropy, 3)} / ${fmt(so.e4m3.fixed, 1)}. Synthetic data: a check of the method, not a result about KV caches.`) }));
  }

  // Four readings of the same data: g_req + g_blk stacked, original next to shuffled, against the decision thresholds.
  function readings(box, ctx) {
    const cases = [['int8', 'entropy'], ['int8', 'fixed'], ['e4m3', 'entropy'], ['e4m3', 'fixed']];
    const c = 'loc+flag';
    box.append(legend([[texify('$\\vgainreq$ (request over global)'), series(0), 'box'], [texify('$\\vgainblk$ (block over request)'), series(1), 'box'], ['shuffled twin (paler)', mix(series(0), 40), 'box'], ['decision thresholds 0.25 and 0.75 bit', 'var(--ink-2)', 'dash']]));
    const b = h('div'); box.append(b);
    const P = Plot(b, { xcats: cases.map(([f, r]) => `${FMT[f]} · ${r === 'entropy' ? 'entropy' : 'fixed-length'}`), y: [-0.05, 1.0], h: 300, ylabel: 'scope gain (bits per element)', grid: 'y', label: 'Request and block gains of loc with its flag, four ways of reading the same synthetic data, with their shuffled twins' });
    const bw = Math.min(34 * P.fs, (P.x(1) - P.x(0)) * 0.3);
    cases.forEach(([f, r], i) => ['orig', 'shuf'].forEach((d, k) => {
      const G = g(f, c, d, r), x = P.x(i) + (k ? 0.08 : -0.08) * (P.x(1) - P.x(0)) + (k ? 0 : -bw), op = d === 'orig' ? 100 : 40;
      const rq = Math.max(G.gainreq, 0), bl = Math.max(G.gainblk, 0);
      const sel = ctx.hl && ctx.rows.some(q => q.fmt === f && q.data === d && q.coder === c && ctx.hl.test(q));
      const gr = el('g', {}, P.g.data);
      el('rect', { x, width: bw, y: P.y(rq), height: P.y(0) - P.y(rq), style: `fill:${mix(series(0), op)}` }, gr);
      el('rect', { x, width: bw, y: P.y(rq + bl), height: P.y(rq) - P.y(rq + bl), style: `fill:${mix(series(1), op)}` }, gr);
      if (sel) el('rect', { x: x - 1.5, width: bw + 3, y: P.y(rq + bl) - 1.5, height: P.y(0) - P.y(rq + bl) + 3, style: 'fill:none;stroke:var(--c);stroke-width:2' }, gr);
      el('text', { x: x + bw / 2, y: P.y(rq + bl) - 6 * P.fs, 'text-anchor': 'middle', class: 'val', text: fmt(G.gainreq + G.gainblk, 2) }, P.g.top);
      el('text', { x: x + bw / 2, y: P.y(0) + 14 * P.fs, 'text-anchor': 'middle', class: 'lbl', style: 'font-size:calc(11px * var(--fs))', text: d === 'orig' ? 'orig.' : 'shuf.' }, P.g.top);
      hover(gr, () => `<b>${FMT[f]}, ${RATE[r]}, ${d === 'orig' ? 'original' : 'shuffled'}</b><br>${tex('\\vgainreq')} = ${fmt(G.gainreq, 3)} bit<br>${tex('\\vgainblk')} = ${fmt(G.gainblk, 3)} bit (best b = ${fmtB(G.best_b)})<br>total ${fmt(G.gainreq + G.gainblk, 3)} bit`);
    }));
    rule(P, { y: 0.75, label: '0.75' });
    rule(P, { y: 0.25, label: '0.25' });
  }

  DS.define('plan-ladder', {
    helpers: { J },
    rows() {
      const out = [];
      ['int8', 'e4m3'].forEach(f => {
        out.push({ fmt: f, coder: 'solo', data: 'orig', scope: 'global', b: '', entropy: J.solo[f].entropy, fixed: J.solo[f].fixed });
        ['loc', 'loc+flag'].forEach(c => ['orig', 'shuf'].forEach(d => {
          const L = J.ladder[f][c][d];
          out.push({ fmt: f, coder: c, data: d, scope: 'global', b: '', entropy: L.global[0], fixed: L.global[1] });
          BS.forEach(b => out.push({ fmt: f, coder: c, data: d, scope: 'block', b, entropy: L.block[b][0], fixed: L.block[b][1] }));
          out.push({ fmt: f, coder: c, data: d, scope: 'request', b: T, entropy: L.request[0], fixed: L.request[1] });
        }));
      });
      return out;
    },
    columns: [
      { key: 'fmt', label: 'format', fmt: v => FMT[v] },
      { key: 'coder', label: 'coder', left: true },
      { key: 'data', label: 'data', fmt: v => (v === 'orig' ? 'original' : 'shuffled') },
      { key: 'scope', label: 'scope', left: true, fmt: (v, r) => (v === 'block' ? `block, b = ${fmtB(r.b)}` : v === 'request' ? 'request (b = 8K)' : v) },
      { key: 'entropy', label: 'entropy rate (bpe)', fmt: v => fmt(v, 4) },
      { key: 'fixed', label: 'fixed-length rate (bpe)', fmt: v => fmt(v, 4) },
    ],
    highlights: {
      shuffled: { label: 'shuffled data', test: r => r.data === 'shuf' },
      int8: { label: 'INT8', test: r => r.fmt === 'int8' },
      e4m3: { label: 'E4M3', test: r => r.fmt === 'e4m3' },
    },
    views: {
      readings: { label: 'Four readings', legend: false, draw: readings,
        note: 'Bars: the loc dictionary with its per-channel flag. Each pair is one way of reading the same run: full colour on the original data, pale after the shuffle. The number on top is the total. Hover a bar for its parts.' },
      table1: { label: 'Table 1', legend: false, draw: table1 },
    },
    metrics: [
      { id: 'bestb', label: 'best block size, original data', value: () => J.gains.int8.loc.orig.entropy.best_b, fmt: v => `b = ${fmt(v)}`,
        note: 'In every original row, the lowest rate is at the planted block length. Shorter blocks pay more dictionary for no more structure; at 4096 every block straddles two true blocks. The first control, passed.' },
      { id: 'int8-entropy', label: 'INT8, entropy rate: $\\vgainreq + \\vgainblk$', value: () => g('int8', 'loc+flag', 'orig', 'entropy'), fmt: G => pair(G.gainreq, G.gainblk),
        note: 'The scientific number on the uniform grid: what an ideal coder would save with a request dictionary and then with per-block ones. Above 0.75 in total, but the block part is under 0.4 — the gap of the decision rule (IX.9).' },
      { id: 'int8-fixed', label: 'INT8, fixed-length rate', value: () => g('int8', 'loc+flag', 'orig', 'fixed'), fmt: G => pair(G.gainreq, G.gainblk),
        note: 'The engineering number: what a fixed-width delta actually shrinks by. On the uniform grid the format keeps all of the structure, and a little more, because the baseline it is measured from wastes bits too.' },
      { id: 'e4m3-entropy', label: 'E4M3, entropy rate (grid-aware model)', value: () => g('e4m3', 'loc+flag', 'orig', 'entropy'), fmt: G => pair(G.gainreq, G.gainblk),
        note: 'The same structure, the same size: the data does not care how it is numbered, and a model that knows the grid sees it all.' },
      { id: 'e4m3-fixed', label: 'E4M3, fixed-length rate', value: () => g('e4m3', 'loc+flag', 'orig', 'fixed'), fmt: G => pair(G.gainreq, G.gainblk),
        note: 'A quarter of the INT8 figure on identical data. Residuals counted in grid steps across zero are long on a log grid, so a simple fast format cashes in little. This reading lands in the "negative" row of the rule.' },
      { id: 'e4m3-noflag', label: 'E4M3, fixed-length, global loc without the flag', value: () => J.ladder.e4m3.loc.orig.global[1], fmt: v => `${fmt(v, 3)} bpe`,
        note: v => `More than the 8 raw bits: subtracting a location from a channel that sits across zero makes its fixed-length residuals longer. The per-channel predict-or-not flag brings it back to ${fmt(J.ladder.e4m3['loc+flag'].orig.global[1], 3)}.` },
      { id: 'shuf-int8', label: 'INT8, entropy rate, after the shuffle', value: () => g('int8', 'loc+flag', 'shuf', 'entropy'), fmt: G => `${fmtS(G.gainreq, 3)} and ${fmtS(G.gainblk, 3)} bit`,
        note: 'The block gain vanishes, as it must. The request gain does not: 0.13 bit survives, which is the calibration gap of IX.3 — structure that is not in the data. Read every gain next to this twin.' },
      { id: 'solo', label: 'solo coding (rung 0): entropy / fixed-length', value: () => J.solo, fmt: s => `INT8 ${fmt(s.int8.entropy, 3)} / ${fmt(s.int8.fixed, 1)} · E4M3 ${fmt(s.e4m3.entropy, 3)} / ${fmt(s.e4m3.fixed, 1)}`,
        note: 'E4M3 starts lower in the entropy rate: its log grid suits values coded one at a time. But the plain fixed-length format cannot shorten raw codes that use the whole range, so its solo line sits at exactly 8 bits — a straw man that flatters every dictionary in that column.' },
      { id: 'rho', label: 'delta ratio $\\vrho$ for wave 2 (INT8, fixed-length, b = 2048)', value: () => J.ladder.int8['loc+flag'].orig.block[2048][1] / 8, fmt: v => `${fmt(v, 2)} · a delta of about ${fmt(v * 64, 0)} bytes for a 64-byte entry`,
        note: v => `The fixed-length rate is the size of a real delta, so ${tex('\\vrho')} is just that rate over 8. The packed-bytes round trip of IX.3 measured ${fmt(J.roundtrip.mean_delta_bytes, 2)} bytes per delta on one block of 2,048 entries.` },
      { id: 'calgap', label: 'shuffled request gain, by calibration sequences', value: () => J.controls.calibration_gap_float.by_n_calib, fmt: v => Object.entries(v).map(([n, x]) => `${n}: ${fmt(x, 3)}`).join(' · '),
        note: 'Float domain, 8 evaluation sequences. The phantom request gain shrinks as the global dictionary sees more calibration data: two sequences, the source\'s plan, are too few.' },
    ],
    numbersNote: 'Every number here was printed by analysis/plan_harness.py on its synthetic set (seed 0). Synthetic data: a check of the method, not a result about KV caches.',
    code: `
import pandas as pd

L = pd.read_csv("{csv}")       # columns: fmt, coder, data, scope, b, entropy, fixed (bits per element)

for (f, c, d), g in L[L.coder != "solo"].groupby(["fmt", "coder", "data"]):
    glob = g[g.scope == "global"].iloc[0]
    req = g[g.scope == "request"].iloc[0]
    blk = g[g.scope == "block"]
    for rate in ("entropy", "fixed"):
        best = blk.loc[blk[rate].idxmin()]
        print(f"{f:5} {c:9} {d:5} {rate:8}  g_req {glob[rate] - req[rate]:+.3f}"
              f"  g_blk {req[rate] - best[rate]:+.3f}  best b {int(best.b)}")
# (the harness rounds its gains from unrounded rates, so the last digit can differ by one)
`,
  });
})();
