// Quick check of data/*.yaml (glossary terms, symbols, themes, parts) without a full build:
//   node scripts/validate-data.mjs
import katex from "katex";
import { loadParts, loadGlossary, loadSymbols, loadThemes, symbolMacros } from "../lib/data.js";
try {
  const parts = loadParts(), glossary = loadGlossary(), symbols = loadSymbols(), themes = loadThemes();
  const macros = symbolMacros(symbols);
  const problems = [];
  for (const id of Object.keys(symbols)) {
    try { katex.renderToString("\\v" + id, { throwOnError: true }); problems.push(`symbol "${id}" collides with KaTeX's \\v${id}`); } catch { /* good: not a built-in */ }
    try { katex.renderToString("\\v" + id, { throwOnError: true, trust: true, strict: "ignore", macros: { ...macros } }); } catch (e) { problems.push(`symbol "${id}": ${e.message}`); }
  }
  const tex = s => { for (const m of String(s || "").matchAll(/\$([^$]+)\$/g)) { try { katex.renderToString(m[1], { throwOnError: true, trust: true, strict: "ignore", macros: { ...macros } }); } catch (e) { return e.message; } } return null; };
  for (const t of Object.values(glossary)) { const e = tex(t.short); if (e) problems.push(`term "${t.id}" (${t.file}): ${e}`); }
  for (const s of Object.values(symbols)) { const e = tex(s.short); if (e) problems.push(`symbol "${s.id}" (${s.file}): ${e}`); }
  console.log(`${parts.length} parts, ${Object.keys(glossary).length} terms, ${Object.keys(symbols).length} symbols, ${Object.keys(themes).length} themes — ${problems.length} problem(s)`);
  problems.forEach(p => console.log("  " + p));
  process.exit(problems.length ? 1 : 0);
} catch (e) { console.error(e.message); process.exit(1); }
