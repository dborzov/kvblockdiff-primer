// Loads the content-side data (parts, glossary terms, math symbols) from YAML.
// Each of data/terms/*.yaml and data/symbols/*.yaml is a map keyed by id; files are merged,
// and an id defined twice is a build error (several writers may add files side by side).
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";

const ROOT = path.resolve(import.meta.dirname, "..");

function readYaml(file) {
  try {
    return yaml.load(fs.readFileSync(file, "utf8")) ?? {};
  } catch (e) {
    throw new Error(`YAML error in ${path.relative(ROOT, file)}: ${e.message}`);
  }
}

function loadMap(dir) {
  const full = path.join(ROOT, dir);
  const out = {};
  if (!fs.existsSync(full)) return out;
  for (const f of fs.readdirSync(full).filter(f => /\.ya?ml$/.test(f)).sort()) {
    const map = readYaml(path.join(full, f));
    for (const [id, v] of Object.entries(map)) {
      if (out[id]) throw new Error(`"${id}" is defined twice: ${out[id].file} and ${dir}/${f}`);
      out[id] = { ...v, id, file: `${dir}/${f}` };
    }
  }
  return out;
}

export const CATEGORIES = {
  info:    { label: "information theory", color: "var(--cat-info)" },
  coding:  { label: "coding & compression", color: "var(--cat-coding)" },
  stats:   { label: "statistics", color: "var(--cat-stats)" },
  linalg:  { label: "vectors & linear algebra", color: "var(--cat-linalg)" },
  numbers: { label: "number formats", color: "var(--cat-numbers)" },
  systems: { label: "memory, caches & hardware", color: "var(--cat-systems)" },
  llm:     { label: "transformers & attention", color: "var(--cat-llm)" },
  project: { label: "this project's own words", color: "var(--cat-project)" },
};

export const FAMILIES = {
  index:    { label: "positions & indices", color: "var(--fam-index)" },
  resource: { label: "bytes, seconds, bandwidth", color: "var(--fam-resource)" },
  count:    { label: "counts & design knobs", color: "var(--fam-count)" },
  frac:     { label: "fractions & probabilities", color: "var(--fam-frac)" },
  info:     { label: "information (bits)", color: "var(--fam-info)" },
  stat:     { label: "statistics of numbers", color: "var(--fam-stat)" },
  object:   { label: "objects (vectors, sets, dictionaries)", color: "var(--fam-object)" },
};

export function loadParts() {
  const parts = readYaml(path.join(ROOT, "data/parts.yaml"));
  return parts.map((p, i) => ({ ...p, index: i }));
}

export function loadThemes() {
  const t = readYaml(path.join(ROOT, "data/themes.yaml"));
  for (const [id, v] of Object.entries(t)) {
    for (const k of ["title", "emblem", "color", "short"]) if (!v[k]) throw new Error(`theme "${id}" has no "${k}"`);
    v.id = id;
  }
  return t;
}

export function loadGlossary() {
  const g = loadMap("data/terms");
  for (const t of Object.values(g)) {
    for (const k of ["label", "short", "cat"]) {
      if (!t[k]) throw new Error(`term "${t.id}" (${t.file}) has no "${k}"`);
    }
    if (!CATEGORIES[t.cat]) throw new Error(`term "${t.id}" (${t.file}): unknown cat "${t.cat}"`);
    if (t.brand && (!t.color || !t.emblem)) throw new Error(`brand term "${t.id}" needs color [light, dark] and emblem`);
  }
  return g;
}

export function loadSymbols() {
  const s = loadMap("data/symbols");
  for (const v of Object.values(s)) {
    for (const k of ["tex", "fam", "name", "short"]) {
      if (!v[k]) throw new Error(`symbol "${v.id}" (${v.file}) has no "${k}"`);
    }
    if (!FAMILIES[v.fam]) throw new Error(`symbol "${v.id}" (${v.file}): unknown fam "${v.fam}"`);
    if (!/^[A-Za-z]+$/.test(v.id)) throw new Error(`symbol id "${v.id}" must be letters only (it becomes the macro \\v${v.id})`);
  }
  return s;
}

// KaTeX macros: \v<id> -> the symbol wrapped in a class that carries its colour family and identity.
export function symbolMacros(symbols) {
  const m = {};
  for (const s of Object.values(symbols)) {
    m["\\v" + s.id] = `\\htmlClass{sym s-${s.id} f-${s.fam}}{${s.tex}}`;
  }
  return m;
}
