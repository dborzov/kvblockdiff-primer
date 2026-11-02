// Loads the content-side data (parts, glossary terms, math symbols, Python notation, reference settings) from YAML.
// Each of data/terms/*.yaml, data/symbols/*.yaml and data/notation/*.yaml is a map keyed by id; files are merged,
// and an id defined twice is a build error (several writers may add files side by side).
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { FORMATS, formatValue, templateKeys } from "./settings-fmt.js";

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

// Python notation (data/notation/*.yaml): the [[~id]] chips. Each entry: code (the Python text shown inline),
// name, short (1–2 sentences, Markdown inline), and optionally shape / bytes (templates with {key} placeholders
// over data/settings.yaml keys, filled per setting in the hover reminder) and home (the page id that introduces it).
export function loadNotation() {
  const n = loadMap("data/notation");
  for (const v of Object.values(n)) {
    if (!/^[a-z][a-z0-9-]*$/.test(v.id)) throw new Error(`notation id "${v.id}" (${v.file}) must be lower-case letters, digits and dashes (it is written [[~${v.id}]])`);
    for (const k of ["code", "name", "short"]) {
      if (v[k] == null || v[k] === "") throw new Error(`notation "${v.id}" (${v.file}) has no "${k}"`);
      if (typeof v[k] !== "string") throw new Error(`notation "${v.id}" (${v.file}): "${k}" must be a string (quote it)`);
    }
    for (const k of ["shape", "bytes", "home"]) {
      if (v[k] != null && typeof v[k] !== "string") throw new Error(`notation "${v.id}" (${v.file}): "${k}" must be a string (quote it)`);
    }
  }
  return n;
}

// The frozen reference settings (data/settings.yaml): the key table, the settings, the default.
// Every setting must carry every key (null = not measured); every fmt must be a known format.
export function loadSettings() {
  const file = "data/settings.yaml";
  const s = readYaml(path.join(ROOT, file));
  const keys = s.keys, settings = s.settings;
  if (!keys || typeof keys !== "object" || !Object.keys(keys).length) throw new Error(`${file}: "keys" must map each key to {name, unit, fmt}`);
  if (!settings || typeof settings !== "object" || !Object.keys(settings).length) throw new Error(`${file}: "settings" must map each setting id to {label, name, home, values}`);
  for (const [k, spec] of Object.entries(keys)) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(k)) throw new Error(`${file}: key "${k}" must be letters and digits (it is written [[@${k}]] and {${k}})`);
    if (!spec || !spec.name) throw new Error(`${file}: key "${k}" has no "name"`);
    if (!FORMATS.includes(spec.fmt)) throw new Error(`${file}: key "${k}": fmt "${spec.fmt}" is not one of ${FORMATS.join(", ")}`);
    spec.unit = spec.unit || "";
  }
  for (const [id, v] of Object.entries(settings)) {
    if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error(`${file}: setting id "${id}" must be lower-case letters, digits and dashes`);
    for (const f of ["label", "name", "values"]) if (!v || !v[f]) throw new Error(`${file}: setting "${id}" has no "${f}"`);
    if (v.emblem != null && typeof v.emblem !== "string") throw new Error(`${file}: setting "${id}": "emblem" must be an emblem name`);
    for (const k of Object.keys(keys)) if (!(k in v.values)) throw new Error(`${file}: setting "${id}" has no value for "${k}" (write null when it is not measured there)`);
    for (const k of Object.keys(v.values)) if (!keys[k]) throw new Error(`${file}: setting "${id}" has a value "${k}" that is not in "keys"`);
    v.id = id; v.home = v.home || ""; v.emblem = v.emblem || "map";
  }
  if (!settings[s.default]) throw new Error(`${file}: default "${s.default}" is not one of the settings (${Object.keys(settings).join(", ")})`);
  return { default: s.default, keys, settings, ids: Object.keys(settings) };
}

// A key's formatted value in one setting (the default setting unless an id is given).
export function refFmt(S, key, id = S.default) {
  return formatValue(S.settings[id].values[key], S.keys[key].fmt);
}

// Terms and symbols may carry `ref:`, and notation entries `shape:` and `bytes:`: templates whose
// {key} placeholders must be settings keys.
export function validateRefs(S, glossary, symbols, notation = {}) {
  const check = (kind, v, field) => {
    if (v[field] == null) return;
    if (typeof v[field] !== "string") throw new Error(`${kind} "${v.id}" (${v.file}): "${field}" must be a template string with {key} placeholders`);
    for (const k of templateKeys(v[field])) {
      if (!S.keys[k]) throw new Error(`${kind} "${v.id}" (${v.file}): ${field} uses {${k}}, which is not a key of data/settings.yaml (${Object.keys(S.keys).join(", ")})`);
    }
  };
  for (const t of Object.values(glossary)) check("term", t, "ref");
  for (const s of Object.values(symbols)) check("symbol", s, "ref");
  for (const n of Object.values(notation)) { check("notation", n, "shape"); check("notation", n, "bytes"); }
}

// KaTeX macros: \v<id> -> the symbol wrapped in a class that carries its colour family and identity.
export function symbolMacros(symbols) {
  const m = {};
  for (const s of Object.values(symbols)) {
    m["\\v" + s.id] = `\\htmlClass{sym s-${s.id} f-${s.fam}}{${s.tex}}`;
  }
  return m;
}
