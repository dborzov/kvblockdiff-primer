// node analysis/picks_bill_check.mjs
// Runs the napkin bill of figures/picks.js (the block between "BEGIN napkin bill" and "END napkin bill") in node
// against every row of the Bachelor's results/summary/napkin_grid.json, and checks that figures/data/picks-grid.json
// carries the same inputs (shares, f_D, loads) the grid used. Exit code 1 on any row off by more than 0.1 sequences.
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const src = fs.readFileSync(new URL('figures/picks.js', root), 'utf8');
const block = src.split('// ---- BEGIN napkin bill')[1].split('// ---- END napkin bill')[0];
const BILL = new Function(block.slice(block.indexOf('\n')) + '\nreturn BILL;')();
const G = JSON.parse(fs.readFileSync(new URL('figures/data/picks-grid.json', root)));
const NG = JSON.parse(fs.readFileSync((process.env.BACHELOR_KV || '/attic/d/bachelor-kv') + '/results/summary/napkin_grid.json'));
const m = BILL.missCurve(G);
const id = Object.fromEntries(G.points.map(p => [p.name, p]));
let worst = 0, bad = 0, n = 0;
const test = (what, want, p) => {
  const got = BILL.best(G, m, p), d = Math.abs(got.N - want.N);
  worst = Math.max(worst, d); n++;
  if (d > 0.1 || (want.B != null && got.B !== want.B)) { bad++; if (bad < 10) console.log(`MISMATCH ${what}: N ${got.N.toFixed(3)} vs ${want.N.toFixed(3)}, B ${got.B} vs ${want.B}`); }
};
for (const r of NG.rows) {
  const p = id[r.point], at = p.at_b[r.b], cell = G.cells[r.b][r.n_D];
  if (!at || Math.abs(at[0] - r.x) > 1e-9 || Math.abs(at[1] - r.y) > 1e-9) { bad++; console.log(`shares differ: ${r.point} b ${r.b}`); }
  if (Math.abs(cell[`f_D_${r.end}`] - r.f_D) > 1e-9 || Math.abs(cell[`n_load_${r.end}`] - r.n_load) > 1e-9) { bad++; console.log(`cell differs: b ${r.b} n_D ${r.n_D} ${r.end}`); }
  test(`${r.point} b ${r.b} n_D ${r.n_D} ${r.end} ${r.under}`, r, { x: r.x, y: r.y, b: r.b, nD: r.n_D, fD: r.f_D, nload: r.n_load, rhoRaw: r.under === 'solo' ? G.solo_y : 1 });
}
for (const g of NG.global) test(`global code ${g.ratio}`, g, BILL.globalCode(g.ratio));
test('HiSparse resized', NG.hisparse_best, { x: 0, y: 1, b: 0, nD: 0, fD: 0, nload: 0, rhoRaw: 1 });
for (const r of NG.resident) test(`${r.point}, every stretch resident`, r, { x: r.x, y: r.y, b: NG.rig.L, nD: 1, fD: 1, nload: 0, rhoRaw: 1 });
console.log(`${n} designs checked against napkin_grid.json: worst |ΔN| ${worst.toExponential(2)}, ${bad} problem(s)`);
process.exit(bad ? 1 : 0);
