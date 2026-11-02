// Banned-word checker: finds the words the site has retired (data/banned-words.yaml) in Markdown and YAML.
//   node scripts/check-words.mjs [paths…]        (default: content/ and data/)
// Prints one line per hit, `file:line: "word" — what to say instead`, then a count; exits 1 if there is any hit.
//
// What is scanned: prose lines of Markdown, the string values of front matter (title, lede, cards q/a/wrong/why, …)
// and of YAML files (the keys and full-line # comments are not).
// What is skipped: fenced code blocks and `code spans`, `::: aside source` and `::: note literature` blocks
// (the papers' own words), Markdown table rows whose first cell is "their word" or contains "their words"
// (the translation tables), and any line that ends with the comment <!-- old-words -->.
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";

const ROOT = path.resolve(import.meta.dirname, "..");
// `--rules <file>` swaps the list (e.g. data/writing-tropes.yaml, the advisory prose checker); `--advisory` never exits 1.
const argv = process.argv.slice(2);
const rulesArg = argv.indexOf("--rules");
const LIST = path.join(ROOT, rulesArg >= 0 ? argv[rulesArg + 1] : "data/banned-words.yaml");
const ADVISORY = argv.includes("--advisory");
const ARGS = argv.filter((a, i) => a !== "--advisory" && a !== "--rules" && !(rulesArg >= 0 && i === rulesArg + 1));

function loadRules() {
  let list;
  try { list = yaml.load(fs.readFileSync(LIST, "utf8")); } catch (e) { throw new Error(`${path.relative(ROOT, LIST)}: ${e.message}`); }
  if (!Array.isArray(list) || !list.length) throw new Error(`${path.relative(ROOT, LIST)}: expected a list of {match, say}`);
  return list.map((r, i) => {
    if (!r || typeof r.match !== "string" || !r.match) throw new Error(`${path.relative(ROOT, LIST)}: entry #${i + 1} has no "match"`);
    if (typeof r.say !== "string" || !r.say) throw new Error(`${path.relative(ROOT, LIST)}: entry #${i + 1} ("${r.match}") has no "say"`);
    let re;
    try { re = new RegExp(r.match, "gi"); } catch (e) { throw new Error(`${path.relative(ROOT, LIST)}: entry #${i + 1}: bad regex ${r.match}: ${e.message}`); }
    return { re, say: r.say };
  });
}

function walk(p, out = []) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(p).sort()) if (!e.startsWith(".") && e !== "node_modules") walk(path.join(p, e), out);
  } else if (/\.(md|ya?ml)$/i.test(p) && path.resolve(p) !== LIST) out.push(p);
  return out;
}

// The scannable text of one YAML line: null for a comment or a bare key; the value part of `key: value`;
// the whole line for list items and block-scalar continuation lines.
function yamlText(line) {
  if (/^\s*(#|$)/.test(line)) return null;
  const m = /^(\s*(?:-\s+)?)(?:"[^"]*"|'[^']*'|[^\s"'#:][^:#]*?)\s*:(?:\s+|$)(.*)$/.exec(line);
  if (m) {
    const v = m[2].trim();
    if (!v || /^[>|][-+]?\d*$/.test(v) || /^[\[{]$/.test(v)) return null;   // bare key, block-scalar header, open flow collection
    return v;
  }
  return line.replace(/^\s*-\s+/, "");
}

// Strip `code spans` (any backtick run, matched by an equal run) from a prose line.
function stripCodeSpans(s) {
  return s.replace(/(`+)[^`]*?\1/g, " ");
}

function firstCell(line) {
  const cells = line.trim().replace(/^\|/, "").split(/(?<!\\)\|/);
  return (cells[0] || "").trim().toLowerCase();
}

// [[#page-id]], [[term]], [[~nota]] and [[@key]] targets are ids, not prose: keep only custom text after "|".
function stripLinkTargets(s) {
  return s.replace(/\[\[([^\]|]*)(\|([^\]]*))?\]\]/g, (m, key, bar, text) => (text != null ? text : ""));
}

// Lines of a file to scan, as [lineNumber, text]; the rules above decide what is left out.
function scannable(file, src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  if (/\.ya?ml$/i.test(file)) {
    lines.forEach((l, i) => { const t = yamlText(l); if (t != null) out.push([i + 1, t]); });
    return out;
  }
  let i = 0;
  if (lines[0] === "---") {                       // front matter: scan string values only
    for (i = 1; i < lines.length && lines[i] !== "---"; i++) {
      const t = yamlText(lines[i]);
      if (t != null) out.push([i + 1, t]);
    }
    i++;
  }
  let fence = null;                               // { ch, len } of the open code fence
  let skip = null;                                // colon count of the open "source"/"literature" container
  let theirTable = false;                         // inside a table whose header's first cell is "their word"
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (fence) {
      const m = /^\s{0,3}(`{3,}|~{3,})\s*$/.exec(line);
      if (m && m[1][0] === fence.ch && m[1].length >= fence.len) fence = null;
      continue;
    }
    const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (f) { fence = { ch: f[1][0], len: f[1].length }; continue; }
    if (skip != null) {
      const m = /^\s*(:{3,})\s*$/.exec(line);
      if (m && m[1].length >= skip) skip = null;
      continue;
    }
    const c = /^\s*(:{3,})\s*(aside\s+source|note\s+literature)\b/.exec(line);
    if (c) { skip = c[1].length; continue; }
    if (/<!--\s*old-words\s*-->\s*$/.test(line)) continue;
    if (/^\s*\|/.test(line)) {
      const cell = firstCell(line);
      if (cell === "their word" || cell.includes("their words")) { theirTable = true; continue; }
      if (theirTable) continue;                   // the data rows of a "their word" table
    } else if (!line.trim()) theirTable = false;  // a blank line ends the table
    // a container directive's kind and id (`::: define grid-aware-model …`, `::: figure fig-x builder`) are ids, not prose
    const t = stripLinkTargets(stripCodeSpans(line.replace(/^(\s*:{3,}\s*)(\S+)(\s+\S+)?(\s+\S+)?/, (m, c, kind) => (kind === 'figure' || kind === 'define' || kind === 'theme' ? c + kind : m))));
    if (t.trim()) out.push([i + 1, t]);
  }
  return out;
}

function main() {
  const rules = loadRules();
  const args = ARGS;
  const roots = (args.length ? args : ["content", "data"]).map(p => path.resolve(p));
  for (const r of roots) if (!fs.existsSync(r)) { console.error(`check-words: no such path ${r}`); process.exit(2); }
  const files = roots.flatMap(r => walk(r));
  let hits = 0;
  const filesHit = new Set();
  for (const file of files) {
    const rel = path.relative(process.cwd(), file) || file;
    for (const [no, text] of scannable(file, fs.readFileSync(file, "utf8"))) {
      for (const { re, say } of rules) {
        re.lastIndex = 0;
        for (const m of text.matchAll(re)) {
          console.log(`${rel}:${no}: "${m[0]}" — ${say}`);
          hits++; filesHit.add(rel);
        }
      }
    }
  }
  console.log(hits ? `${hits} hit(s) in ${filesHit.size} file(s) of ${files.length} scanned` : `no hits in ${files.length} file(s)`);
  process.exit(hits && !ADVISORY ? 1 : 0);
}

try { main(); } catch (e) { console.error(`check-words: ${e.message}`); process.exit(2); }
