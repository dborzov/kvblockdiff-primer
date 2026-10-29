// Part I (pages I.2–I.6): every number quoted in the prose, recomputed from the figure code itself.
// Run: node analysis/tiny-numbers.cjs   (uses pako from node_modules and the helpers in figures/tiny.js)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
global.window = { FIG: {}, __TINY_TEST__: true, pako: require(path.join(root, 'node_modules/pako')) };
global.FIG = window.FIG;
new Function(fs.readFileSync(path.join(root, 'figures/tiny.js'), 'utf8'))();
const T = window.__TINY_TEST__, G = window.GULL;
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const f1 = x => x.toFixed(1);

console.log('== I.2 one at a time');
const m3 = G.records(3).map(G.compact);
console.log('first three messages alone:', m3.map(m => T.zsize(m)).join(', '));
for (const n of [1, 2, 3]) {
  const s = T.logOf(n), t = T.lzParse(s), c = t.filter(x => !x.lit);
  const copied = c.reduce((a, x) => a + x.len, 0);
  console.log(`log of ${n}: ${s.length} B, ${s.length - copied} literals + ${c.length} copies (${Math.round(100 * copied / s.length)} % copied), DEFLATE ${T.zsize(s)} B`);
  if (n <= 2) console.log('   copies:', c.map(x => `${JSON.stringify(s.substr(x.at, x.len))}<-${x.dist}`).join(' '));
}
for (const n of [1, 2, 4, 8, 16, 24, 48, 96]) { const z = T.zsize(T.logOf(n)); console.log(`log of ${n}: ${z} B, ${f1(z / n)} B per message`); }

console.log('== I.3 trained dictionary');
const d2 = T.day2();
console.log('day two: raw avg', f1(avg(d2.map(m => m.length))), 'alone avg', f1(avg(T.day2Sizes(0))));
for (const K of [1, 2, 4, 8, 12, 16, 24, 32, 48]) {
  const s = T.day2Sizes(K);
  console.log(`K=${K}: dict ${T.dictOf(K).length} B (compressed ${T.zsize(T.dictOf(K))} B); day-two avg ${f1(avg(s))} B, first ${s[0]}, min ${Math.min(...s)}, max ${Math.max(...s)}`);
}
console.log('first five day-two deltas with K=24:', T.day2Sizes(24).slice(0, 5).join(', '));

console.log('== I.4 three lessons');
const d1 = T.day1();
const alone48 = d1.map(m => T.zsize(m)).reduce((a, b) => a + b, 0);
console.log(`day one: raw ${d1.join('').length} B; each alone total ${alone48} B (${f1(alone48 / 48)}/msg); as one log ${T.zsize(T.logOf(48))} B (${f1(T.zsize(T.logOf(48)) / 48)}/msg)`);
const a0 = avg(T.day2Sizes(0));
for (const K of [1, 8, 24, 48]) {
  const D = T.dictOf(K), d = avg(T.day2Sizes(K)), z = T.zsize(D);
  console.log(`K=${K}: break-even raw ${f1(D.length / (a0 - d))} msgs, compressed ${f1(z / (a0 - d))}; per msg over 96: ${f1(D.length / 96 + d)}, over 17520: ${f1(D.length / 17520 + d)}`);
}
const all = T.all(), chain = all.slice(1).map((m, i) => T.zsize(m, all[i]));
console.log('previous message as the dictionary: avg', f1(avg(chain)), 'over messages 1..95');
const m0 = d2[0], R = T.dictOf(24), delta = T.deflate(m0, R);
const enc = s => new TextEncoder().encode(s), dec = b => new TextDecoder().decode(b);
const near = d1.slice(24, 46).join('') + d1[47] + d1[46];
console.log('decode check: message', m0, 'delta', delta.length);
console.log('  near ->', dec(window.pako.inflateRaw(delta, { dictionary: enc(near) })));
console.log('  old  ->', dec(window.pako.inflateRaw(delta, { dictionary: enc(d1.slice(0, 24).join('')) })));
try { window.pako.inflateRaw(delta); } catch (e) { console.log('  none -> error:', e.message || e); }

console.log('== I.5 rows of numbers');
const rows = T.readings(12);
rows.forEach(r => console.log(r.time, r.v.map((x, c) => (x * T.COLS[c].step).toFixed(T.COLS[c].dp)).join('  ')));
let same = 0; for (let i = 1; i < 12; i++) for (let c = 0; c < 4; c++) if (rows[i].v[c] === rows[i - 1].v[c]) same++;
const bin = T.rowsAsBytes(rows);
console.log('equal to above:', same, 'of 44; binary', bin.length, 'B -> DEFLATE', window.pako.deflateRaw(bin, { level: 9 }).length, 'B');
for (const mode of ['raw', 'mean', 'prev']) { const b = T.bitsPerColumn(rows, mode); console.log(mode, 'bits', b.join('/'), 'sum', b.reduce((x, y) => x + y)); }
const { typ, L } = T.leftovers(rows, 'mean');
console.log('typical', typ.map((x, c) => (x * T.COLS[c].step).toFixed(T.COLS[c].dp)).join(' '));
console.log('leftover ranges', [0, 1, 2, 3].map(c => [Math.min(...L.map(l => l[c])), Math.max(...L.map(l => l[c]))].map(x => (x * T.COLS[c].step).toFixed(T.COLS[c].dp)).join('..')).join(' | '));
