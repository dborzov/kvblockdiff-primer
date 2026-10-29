// Prints every number quoted in the prose of pages II.13–II.25 (school-vectors).
// It loads the toolkit (plotkit.js) and figures/school-vectors.js in Node with a tiny DOM stub,
// then runs the same seeded generators and numerics the figures use.
//   node analysis/school-vectors-numbers.mjs [section]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const ROOT = path.resolve(import.meta.dirname, "..");
const ctx = { console, Math, Float32Array, Uint32Array, Set, Array, Object, Number, String, JSON, Infinity, NaN };
ctx.window = ctx; ctx.addEventListener = () => {}; ctx.document = { addEventListener() {} };
vm.createContext(ctx);
for (const f of ["theme/assets/js/plotkit.js", "figures/school-vectors.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
export const SV = ctx.FIG._sv;
export const PK = ctx.PK;
const only = process.argv[2];
const sec = (name, fn) => { if (!only || only === name) { console.log(`\n=== ${name}`); fn(); } };
const f = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
export function run() {
  sec("day", () => {
    const day = SV.day(12);
    for (const r of day) console.log(r.time, r.low, r.mast, r.hum, r.pres, r.wind);
    for (const m of ["raw", "centred", "global", "std"]) {
      const v = SV.dayView(m);
      console.log(m, "shift", JSON.stringify(v.shift), "width", JSON.stringify(v.width), "total", v.total);
      if (m === "raw") console.log(" mu", v.mu.map(x => f(x, 3)).join(" "), " sd", v.sd.map(x => f(x, 3)).join(" "), " global mean", f(v.gmu, 2));
      console.log("  first rows", JSON.stringify(v.rows.slice(0, 3).map(r => r.map(x => +x.toFixed(2)))), " max|steps|", JSON.stringify(v.steps[0].map((_, j) => Math.max(...v.steps.map(r => Math.abs(r[j]))))));
    }
  });
  sec("month", () => {
    const X = SV.matrixOf(SV.month());
    const S = SV.covMatrix(X), R = SV.corrMatrix(S), mu = SV.colMeans(X);
    console.log("n", X.length, "means", mu.map(x => f(x, 3)).join(" "));
    console.log("sd", S.map((r, i) => f(Math.sqrt(r[i]), 3)).join(" "));
    console.log("cov"); S.forEach(r => console.log("  ", r.map(x => f(x, 4)).join("  ")));
    console.log("corr"); R.forEach(r => console.log("  ", r.map(x => f(x, 3)).join("  ")));
    const S2 = [[S[0][0], S[0][1]], [S[1][0], S[1][1]]];
    const e2 = SV.eig(S2);
    console.log("thermo eig", e2.values.map(x => f(x, 4)), "vec1", e2.vectors[0].map(x => f(x, 4)), "angle deg", f(Math.atan2(e2.vectors[0][1], e2.vectors[0][0]) * 180 / Math.PI, 2));
    const g2 = SV.amgm(e2.values); console.log("thermo AM", f(g2.am, 4), "GM", f(g2.gm, 4), "gain/elt", f(g2.gain, 3));
    const b0 = SV.gaussBits(S[0][0], 0.1) + SV.gaussBits(S[1][1], 0.1), b45 = SV.gaussBits(e2.values[0], 0.1) + SV.gaussBits(e2.values[1], 0.1);
    console.log("bits per pair, original axes", f(b0, 2), "(each", f(SV.gaussBits(S[0][0], 0.1), 2), f(SV.gaussBits(S[1][1], 0.1), 2), ") KLT axes", f(b45, 2), "(", f(SV.gaussBits(e2.values[0], 0.1), 2), f(SV.gaussBits(e2.values[1], 0.1), 2), ") saved", f(b0 - b45, 2));
    const r = R[0][1]; console.log("corr thermo", f(r, 4), "R2", f(r * r, 4), "exchange-rate bits on one channel", f(0.5 * Math.log2(1 / (1 - r * r)), 3));
    // difference / average in plain units
    const diffs = X.map(row => row[1] - row[0]), avgs = X.map(row => (row[0] + row[1]) / 2);
    console.log("diff mean", f(SV.mean(diffs), 3), "diff sd", f(Math.sqrt(PK.variance(diffs)), 3), "avg sd", f(Math.sqrt(PK.variance(avgs)), 3));
    for (const deg of [0, 15, 30, 45, 60, 90]) { const v = SV.rotVars(S2, deg * Math.PI / 180); console.log(" rot", deg, "vars", f(v[0], 3), f(v[1], 3), "sum", f(v[0] + v[1], 3), "cov", f(v[2], 3), "bits", f(SV.gaussBits(v[0], 0.1) + SV.gaussBits(Math.max(v[1], 1e-9), 0.1), 2)); }
    const eR = SV.eig(R); const gR = SV.amgm(eR.values);
    console.log("5ch corr eig", eR.values.map(x => f(x, 4)).join(" "), "AM", f(gR.am, 3), "GM", f(gR.gm, 4), "gain", f(gR.gain, 3));
    eR.vectors.forEach((v, i) => console.log("  vec", i, v.map(x => f(x, 3)).join(" ")));
  });
  sec("vq", () => {
    for (const [name, pts] of [["regimes", SV.regimes().map(p => [p.x, p.y])], ["thermo", SV.thermoPairs().map(p => [p.x, p.y])]]) {
      const st = SV.standardize2(pts);
      console.log(name, "n", pts.length, "mu", st.mu.map(x => f(x, 2)), "sd", st.sd.map(x => f(x, 2)), "KLT gain", f(SV.kltGain2(st.Z), 3));
      for (const C of [1, 2, 3, 4, 6, 8, 12, 16, 32, 64]) {
        const b = SV.vqBits(st.Z, C);
        console.log("  C", C, "gross", f(b.gross, 3), "tax", f(b.tax, 3), "net", f(b.net, 3), "resVar", b.resVar.map(x => f(x, 4)).join(" "), name === "regimes" && C === 3 ? "cents(raw units) " + b.km.cents.map(c => `(${f(c[0] * st.sd[0] + st.mu[0], 1)}, ${f(c[1] * st.sd[1] + st.mu[1], 1)})`).join(" ") : "");
      }
    }
    const reg = SV.regimes(); console.log("regime counts", SV.REGIMES.map((g, k) => reg.filter(p => p.k === k).length));
  });
  sec("cache", () => {
    for (const [name, seq] of Object.entries(SV.TRACES)) {
      console.log(name, seq.join(""), "distinct", new Set(seq).size);
      const rd = SV.reuseDistances(seq);
      console.log("  reuse", rd.map(x => (x === Infinity ? "∞" : x)).join(" "));
      const hist = {}; rd.forEach(x => { const k = x === Infinity ? "inf" : x; hist[k] = (hist[k] || 0) + 1; });
      console.log("  hist", JSON.stringify(hist));
      for (let B = 1; B <= 8; B++) {
        const l = SV.simulate(seq, B, "lru"), fi = SV.simulate(seq, B, "fifo"), o = SV.simulate(seq, B, "opt");
        const pred = rd.filter(x => x >= B).length;
        console.log(`  B=${B} LRU misses ${l.misses} (from reuse ${pred}) FIFO ${fi.misses} OPT ${o.misses}  m_LRU ${f(l.rate, 3)} m_OPT ${f(o.rate, 3)}`);
      }
    }
    const st = SV.simulate(SV.TRACES.storm, 4, "lru");
    st.steps.forEach(s => console.log(`   t${s.t} ${s.id} ${s.hit ? "hit " : "MISS"} ${s.evicted ? "evict " + s.evicted : ""} desk ${s.desk.map(o => o.id).join("")}`));
  });
  sec("numbers", () => {
    const G = SV.e4m3Grid; console.log("E4M3 nonneg count", G.length, "max", G[G.length - 1], "min sub", G[1], "min normal", G[8]);
    for (const x of [0.1, -0.1, 0.3, 1, 2, 11, 11.4, 11.5, 12, 25, 100, 448, 0.0019, 0.002]) { const q = SV.e4m3Round(x); console.log(`  x=${x} -> ${q} idx ${SV.e4m3Index(q)} bits ${SV.e4m3Bits(q).str} relerr ${f(Math.abs(q - x) / Math.abs(x), 4)}`); }
    console.log("  codes with |v|<1:", 2 * G.filter(v => v < 1 && v > 0).length + 1, "of", 2 * G.length - 1, "; |v|<0.1:", 2 * G.filter(v => v < 0.1 && v > 0).length + 1);
    // index check vs python-style e4m3_round on many values
    let bad = 0; for (let i = -126; i <= 126; i++) { const v = SV.e4m3FromIndex(i); if (SV.e4m3Index(SV.e4m3Round(v)) !== i) bad++; } console.log("  roundtrip bad", bad);
    for (const x of [11.4, 11.8, 10.8, 25, 0.1, 100]) { const b = SV.bf16(x); console.log(`  bf16 ${x} -> ${b.value} bits ${b.bits.toString(2).padStart(16, "0")}`); }
    // per-bit entropy of BF16 temperatures (foot thermometer, month)
    const vals = SV.month().map(o => o.low), H = [];
    for (let k = 15; k >= 0; k--) { const ones = vals.filter(v => (SV.bf16(v).bits >> k) & 1).length / vals.length; H.push(PK.entropy([ones, 1 - ones])); }
    console.log("  bf16 per-bit entropy (sign, 8 exp, 7 mant):", H.map(x => f(x, 2)).join(" "), "sum", f(H.reduce((a, b) => a + b, 0), 2));
    const pats = {}; vals.forEach(v => { const b = SV.bf16(v).bits; pats[b] = (pats[b] || 0) + 1; }); console.log("  distinct bf16 patterns", Object.keys(pats).length, "joint entropy", f(PK.entropy(Object.values(pats)), 2));
    const exps = {}; vals.forEach(v => { const e = (SV.bf16(v).bits >> 7) & 255; exps[e] = (exps[e] || 0) + 1; }); console.log("  exponents", JSON.stringify(exps), "H", f(PK.entropy(Object.values(exps)), 3));
    console.log("  temp range", Math.min(...vals), Math.max(...vals));
    // INT8 example scales
    console.log("  int8 rain scale", f(100 / 127, 4), "0.3->", SV.int8Round(0.3, 100 / 127) * 100 / 127);
  });
}
if (import.meta.url === `file://${process.argv[1]}`) run();
