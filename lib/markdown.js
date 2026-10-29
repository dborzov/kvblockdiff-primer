// The Markdown dialect of this site: CommonMark + tables, plus
//   $…$ / $$…$$        math, rendered to HTML at build time by KaTeX, with colour-coded symbol macros
//                      (\ve, \vrho, … from data/symbols) and an automatic "what's in this equation" legend
//   [[term]]           a glossary term chip (hover reminder, link to its definition)
//   [[term|text]]      the same with custom text;  [[=term]] marks THE definition of a term
//   [[#target]]        a cross-reference to a page id, page-id/heading-id, figure or equation id
//   ::: name …  :::    components: takeaway, note, aside, define, figure, keycard, try, pull, cols/col
//   ```python caption  highlighted code with a caption;  ```graph  a concept graph from YAML
// See docs/AUTHORING.md for the author's view of all of this.
import MarkdownIt from "markdown-it";
import container from "markdown-it-container";
import katex from "katex";
import * as yaml from "js-yaml";
import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";
import { esc, slugify, emblem, termChip } from "./render.js";
import { CATEGORIES } from "./data.js";

loadLanguages(["python", "json", "bash"]);

const NOTE_KINDS = {
  intuition: "Intuition", example: "Example", numbers: "By the numbers", connection: "Connection",
  practice: "In practice", warning: "Careful", key: "Key idea", history: "Back story",
  metric: "The metric", question: "A question", literature: "From the literature", toy: "Toy world",
};
const NOTE_EMBLEMS = {
  intuition: "spark", example: "quill", numbers: "abacus", connection: "link", practice: "gear",
  warning: "warn", key: "key", history: "scroll", metric: "gauge", question: "question",
  literature: "book", toy: "lighthouse",
};
const ASIDE_KINDS = { reminder: "Reminder", detail: "Detail", aside: "Aside", source: "Source", why: "Why?" };

function where(env) {
  return env?.page?.inputPath ? ` (in ${env.page.inputPath})` : "";
}

export function createMarkdown({ glossary, symbols, macros, themes = {}, datasets = {}, prefix = "/" }) {
  const md = new MarkdownIt({ html: true, typographer: true, linkify: false });

  const katexOpts = display => ({
    displayMode: display, throwOnError: true, strict: "ignore", trust: true,
    macros: { ...macros }, output: "html",
  });
  function renderTex(tex, display, env) {
    try {
      return katex.renderToString(tex, katexOpts(display));
    } catch (e) {
      throw new Error(`KaTeX: ${e.message}\n   in $${tex}$${where(env)}`);
    }
  }
  const inline = (s, env) => (s ? md.renderInline(String(s), env) : "");

  // ---------------------------------------------------------------- math
  md.inline.ruler.after("escape", "math_inline", (state, silent) => {
    const src = state.src, pos = state.pos;
    if (src.charCodeAt(pos) !== 0x24 || src.charCodeAt(pos + 1) === 0x24) return false;
    const next = src[pos + 1];
    if (!next || /\s/.test(next)) return false;
    let end = pos + 1;
    for (;;) {
      end = src.indexOf("$", end);
      if (end < 0) return false;
      if (src[end - 1] === "\\") { end++; continue; }
      break;
    }
    if (/\s/.test(src[end - 1]) || /[0-9]/.test(src[end + 1] || "")) return false;
    if (!silent) {
      const t = state.push("math_inline", "math", 0);
      t.content = src.slice(pos + 1, end);
    }
    state.pos = end + 1;
    return true;
  });

  md.block.ruler.before("fence", "math_block", (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    if (state.sCount[startLine] - state.blkIndent >= 4) return false;
    if (state.src.slice(start, start + 2) !== "$$") return false;
    if (silent) return true;
    const closeRe = /\$\$\s*(?:\{#([A-Za-z][\w-]*)\})?\s*$/;
    let line = startLine, text = state.src.slice(start + 2, state.eMarks[startLine]);
    const lines = [];
    let id = null, closed = false;
    for (;;) {
      const m = text.match(closeRe);
      if (m) { lines.push(text.slice(0, m.index)); id = m[1] || null; closed = true; break; }
      lines.push(text);
      if (++line >= endLine) break;
      text = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
    }
    if (!closed) return false;
    state.line = line + 1;
    const t = state.push("math_block", "math", 0);
    t.block = true; t.content = lines.join("\n"); t.meta = { id }; t.map = [startLine, state.line];
    return true;
  }, { alt: ["paragraph", "reference", "blockquote", "list"] });

  function usedSymbols(tex) {
    const seen = [];
    for (const m of tex.matchAll(/\\v([A-Za-z]+)/g)) {
      if (symbols[m[1]] && !seen.includes(m[1])) seen.push(m[1]);
    }
    return seen;
  }
  function legend(ids, env) {
    if (!ids.length) return "";
    const rows = ids.map(id => {
      const s = symbols[id];
      const unit = s.unit ? ` <span class="lg-unit">[${inline(s.unit, env)}]</span>` : "";
      const home = s.home ? ` <a class="xref lg-home" data-ref="${esc(s.home)}" data-ref-style="num" href="#"></a>` : "";
      return `<div class="lg-row f-${s.fam}"><dt>${renderTex("\\v" + id, false, env)}</dt><dd><b>${inline(s.name, env)}</b>${unit} — ${inline(s.short, env)}${home}</dd></div>`;
    }).join("");
    return `<details class="eq-legend"><summary><span class="side-kind">Symbols</span><span class="side-title">What’s in this equation (${ids.length})</span></summary><dl>${rows}</dl></details>`;
  }
  md.renderer.rules.math_inline = (tokens, idx, _o, env) => renderTex(tokens[idx].content, false, env);
  md.renderer.rules.math_block = (tokens, idx, _o, env) => {
    const t = tokens[idx];
    const id = t.meta.id ? ` id="${t.meta.id}"` : "";
    const no = t.meta.id ? `<span class="eq-no"></span>` : "";
    return `<div class="eq"${id}><div class="eq-math">${renderTex(t.content, true, env)}${no}</div>${legend(usedSymbols(t.content), env)}</div>\n`;
  };

  // ---------------------------------------------------------------- [[wiki]] links
  md.inline.ruler.before("link", "wiki", (state, silent) => {
    const src = state.src, pos = state.pos;
    if (src.charCodeAt(pos) !== 0x5b || src.charCodeAt(pos + 1) !== 0x5b) return false;
    const end = src.indexOf("]]", pos + 2);
    if (end < 0) return false;
    const raw = src.slice(pos + 2, end).replace(/\\\|/g, "|");   // "\|" (needed inside table cells) means "|"
    if (!raw || raw.includes("\n\n")) return false;
    if (!silent) {
      const bar = raw.indexOf("|");
      const key = (bar < 0 ? raw : raw.slice(0, bar)).trim();
      const text = bar < 0 ? null : raw.slice(bar + 1);
      const t = state.push("wiki", "", 0);
      t.meta = { key, text };
    }
    state.pos = end + 2;
    return true;
  });
  md.renderer.rules.wiki = (tokens, idx, _o, env) => {
    const { key, text } = tokens[idx].meta;
    const textHtml = text != null ? inline(text, env) : null;
    if (key.startsWith("#")) {
      const target = key.slice(1);
      return `<a class="xref" data-ref="${esc(target)}" href="#${esc(target)}">${textHtml ?? ""}</a>`;
    }
    const def = key.startsWith("=");
    const id = def ? key.slice(1) : key;
    const term = glossary[id];
    if (!term) throw new Error(`Unknown glossary term [[${key}]]${where(env)} — add it to data/terms/*.yaml`);
    return termChip(term, textHtml, { def });
  };

  // ---------------------------------------------------------------- headings: {#id} or an automatic slug
  md.core.ruler.push("kv_heading_ids", state => {
    if (state.inlineMode) return;
    const used = new Set();
    const toks = state.tokens;
    for (let i = 0; i < toks.length; i++) {
      if (toks[i].type !== "heading_open") continue;
      const inl = toks[i + 1];
      let id = null;
      const m = inl.content.match(/\s*\{#([A-Za-z][\w-]*)\}\s*$/);
      if (m) {
        id = m[1];
        inl.content = inl.content.slice(0, m.index);
        const last = inl.children[inl.children.length - 1];
        if (last && last.type === "text") last.content = last.content.replace(/\s*\{#[A-Za-z][\w-]*\}\s*$/, "");
      } else {
        id = slugify(inl.content);
      }
      let u = id, n = 2;
      while (used.has(u)) u = `${id}-${n++}`;
      used.add(u);
      toks[i].attrSet("id", u);
    }
  });

  // ---------------------------------------------------------------- tables and links
  md.renderer.rules.table_open = () => `<div class="tbl-wrap"><table class="data">\n`;
  md.renderer.rules.table_close = () => `</table></div>\n`;
  const linkOpen = md.renderer.rules.link_open || ((t, i, o, e, s) => s.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, idx, o, env, self) => {
    const href = tokens[idx].attrGet("href") || "";
    if (/^https?:/.test(href)) {
      tokens[idx].attrSet("target", "_blank");
      tokens[idx].attrSet("rel", "noopener");
      tokens[idx].attrJoin("class", "ext");
    }
    return linkOpen(tokens, idx, o, env, self);
  };

  // ---------------------------------------------------------------- code fences and graphs
  md.renderer.rules.fence = (tokens, idx, _o, env) => {
    const t = tokens[idx];
    const [lang = "", ...rest] = t.info.trim().split(/\s+/);
    const caption = rest.join(" ");
    if (lang === "graph") return renderGraph(t.content, env);
    const grammar = Prism.languages[lang];
    const code = grammar ? Prism.highlight(t.content, grammar, lang) : esc(t.content);
    const cap = `<figcaption class="code-cap"><span class="code-lang">${esc(lang || "text")}</span>${caption ? `<span class="code-title">${inline(caption, env)}</span>` : ""}</figcaption>`;
    return `<figure class="code">${cap}<pre class="language-${esc(lang || "text")}"><code>${code}</code></pre></figure>\n`;
  };

  function renderGraph(src, env) {
    let g;
    try { g = yaml.load(src); } catch (e) { throw new Error(`graph YAML: ${e.message}${where(env)}`); }
    const cols = g.columns || [];
    const heads = cols.map((c, i) => `<div class="cg-head" style="--col:${i + 1}">${inline(c, env)}</div>`).join("");
    const nodes = (g.nodes || []).map(n => {
      const term = n.term ? glossary[n.term] : null;
      if (n.term && !term) throw new Error(`graph node "${n.id}": unknown term "${n.term}"${where(env)}`);
      const color = n.color || (n.cat ? CATEGORIES[n.cat]?.color : null)
        || (term ? (term.brand ? `var(--t-${term.id})` : `var(--cat-${term.cat})`) : "var(--c)");
      const emb = n.emblem || term?.emblem;
      const tag = n.link ? "a" : "div";
      const link = n.link ? ` data-ref="${esc(n.link)}" href="#"` : "";
      return `<${tag} class="cg-node" data-node="${esc(n.id)}"${link} style="--col:${n.col || 1};--row:${n.row || 1};--nc:${color}">`
        + (emb ? `<span class="cg-emb">${emblem(emb)}</span>` : "")
        + `<span class="cg-title">${inline(n.title || term?.label || n.id, env)}</span>`
        + (n.text ? `<span class="cg-text">${inline(n.text, env)}</span>` : "")
        + `</${tag}>`;
    }).join("\n");
    const edges = JSON.stringify((g.edges || []).map(e => [e[0], e[1], e[2] || ""])).replace(/</g, "\\u003c");
    return `<div class="cgraph" id="graph-${esc(g.id || "g")}" style="--cols:${Math.max(1, cols.length)}">`
      + `<div class="cg-heads">${heads}</div><div class="cg-grid">${nodes}</div>`
      + `<script type="application/json" class="cg-edges">${edges}</script></div>\n`;
  }

  // ---------------------------------------------------------------- ::: containers
  function lastH2Id(tokens, idx) {
    for (let i = idx; i >= 0; i--) {
      if (tokens[i].type === "heading_open" && tokens[i].tag === "h2") return tokens[i].attrGet("id") || "";
    }
    return "";
  }
  function box(name, open, close) {
    md.use(container, name, {
      validate: params => params.trim().split(/\s+/)[0] === name,
      render(tokens, idx, _o, env) {
        const t = tokens[idx];
        if (t.nesting === -1) return close;
        const rest = t.info.trim().slice(name.length).trim();
        return open(rest, env, tokens, idx);
      },
    });
  }

  box("takeaway", (title, env, tokens, idx) =>
    `<aside class="takeaway" data-sec="${esc(lastH2Id(tokens, idx))}"><div class="tk-head">${emblem("key")}<span class="tk-kicker">Takeaway</span>${title ? `<span class="tk-title">${inline(title, env)}</span>` : ""}</div><div class="tk-body">\n`,
    `</div></aside>\n`);

  box("note", (rest, env) => {
    const [kind, ...t] = rest.split(/\s+/);
    if (!NOTE_KINDS[kind]) throw new Error(`::: note: unknown kind "${kind}" (use ${Object.keys(NOTE_KINDS).join(", ")})${where(env)}`);
    const title = t.join(" ");
    return `<div class="note note-${kind}"><div class="note-tag">${emblem(NOTE_EMBLEMS[kind])}<span>${NOTE_KINDS[kind]}</span>${title ? `<span class="note-title">${inline(title, env)}</span>` : ""}</div><div class="note-body">\n`;
  }, `</div></div>\n`);

  box("aside", (rest, env) => {
    const [kind, ...t] = rest.split(/\s+/);
    if (!ASIDE_KINDS[kind]) throw new Error(`::: aside: unknown kind "${kind}" (use ${Object.keys(ASIDE_KINDS).join(", ")})${where(env)}`);
    let title = t.join(" "), open = "";
    if (/^open\b/.test(title)) { open = " open"; title = title.replace(/^open\s*/, ""); }
    return `<aside class="side side-${kind}"><details${open}><summary><span class="side-kind">${ASIDE_KINDS[kind]}</span><span class="side-title">${inline(title, env)}</span></summary><div class="side-body">\n`;
  }, `</div></details></aside>\n`);

  box("define", (rest, env) => {
    const [id, ...t] = rest.split(/\s+/);
    const term = glossary[id];
    if (!term) throw new Error(`::: define: unknown term "${id}"${where(env)} — add it to data/terms/*.yaml`);
    const label = t.length ? inline(t.join(" "), env) : null;
    const nick = term.nick ? `<span class="db-nick">“${inline(term.nick, env)}”</span>` : "";
    const cat = `<span class="db-cat">${esc(CATEGORIES[term.cat].label)}</span>`;
    return `<div class="defbox${term.brand ? " brand" : ""}" data-term="${id}" style="${term.brand ? `--tc:var(--t-${id})` : `--tc:var(--cat-${term.cat})`}"><div class="db-head">${termChip(term, label, { def: true })}${nick}${cat}</div><div class="db-body">\n`;
  }, `</div></div>\n`);

  box("figure", (rest, env) => {
    const [id, spec = "", ...flags] = rest.split(/\s+/);
    const wide = flags.includes("wide") ? " wide" : "";
    if (!/^fig-[\w-]+$/.test(id || "")) throw new Error(`::: figure needs an id starting with "fig-"${where(env)}`);
    let host;
    if (spec.startsWith("img=")) host = `<div class="fig-host"><img src="${esc(spec.slice(4))}" alt="" loading="lazy"></div>`;
    else if (spec) host = `<div class="fig-host"></div>`;
    else throw new Error(`::: figure ${id}: give a builder name (FIG.<name>) or img=/assets/img/…${where(env)}`);
    const data = spec && !spec.startsWith("img=") ? ` data-fig="${esc(spec)}"` : "";
    return `<figure class="plate${wide}" id="${id}"${data}>${host}<figcaption><span class="plate-no"></span>\n`;
  }, `</figcaption></figure>\n`);

  // ::: dataset fig-<id> <dataset-id> [view=a,b] [tab=plot|table|numbers|code] [metrics=a,b] [marks=a,b] [hl=name] [wide]
  // A running example dataset as a tabbed card (plot / table / numbers / code). The block's content is the caption.
  box("dataset", (rest, env) => {
    const [id, ds, ...args] = rest.split(/\s+/);
    if (!/^fig-[\w-]+$/.test(id || "")) throw new Error(`::: dataset needs an id starting with "fig-"${where(env)}`);
    const d = datasets[ds];
    if (!d) throw new Error(`::: dataset ${id}: unknown dataset "${ds}" (see data/datasets/*.yaml)${where(env)}`);
    const opts = {};
    let wide = "";
    for (const a of args) {
      if (a === "wide") { wide = " wide"; continue; }
      const m = a.match(/^(view|tab|metrics|marks|hl)=([\w,.-]+)$/);
      if (!m) throw new Error(`::: dataset ${id}: unknown option "${a}" (use view=, tab=, metrics=, marks=, hl=, wide)${where(env)}`);
      opts[m[1]] = ["view", "metrics", "marks"].includes(m[1]) ? m[2].split(",") : m[2];
    }
    const meta = [d.unit && `<span>${inline(d.unit, env)}</span>`, d.source && `<span>${inline(d.source, env)}</span>`].filter(Boolean).join("");
    return `<figure class="plate ds-plate${wide}" id="${id}" data-fig="dataset" data-ds="${esc(ds)}" data-opts="${esc(JSON.stringify(opts))}">`
      + `<div class="ds-head">${emblem(d.emblem)}<div class="ds-head-text"><span class="ds-kicker">Example dataset</span>`
      + `<a class="ds-title" href="/reference/datasets/#ds-${esc(ds)}">${inline(d.title, env)}</a>`
      + `<span class="ds-blurb">${inline(d.blurb, env)}</span>${meta ? `<span class="ds-meta">${meta}</span>` : ""}</div></div>`
      + `<div class="fig-host"></div><div class="ds-also"></div><figcaption><span class="plate-no"></span>\n`;
  }, `</figcaption></figure>\n`);

  box("keycard", (eyebrow, env) =>
    `<div class="keycard">${eyebrow ? `<div class="kc-eyebrow">${inline(eyebrow, env)}</div>` : ""}<div class="kc-body">\n`,
    `</div></div>\n`);

  box("try", () => `<div class="try"><div class="try-head">☞ Things to try</div><div class="try-body">\n`, `</div></div>\n`);

  box("pull", () => `<blockquote class="pull">\n`, `</blockquote>\n`);

  box("theme", (rest, env) => {
    const [id, ...t] = rest.split(/\s+/);
    const th = themes[id];
    if (!th) throw new Error(`::: theme: unknown theme "${id}" (see data/themes.yaml)${where(env)}`);
    const title = t.length ? `<span class="th-title">${inline(t.join(" "), env)}</span>` : "";
    return `<aside class="theme-note" data-theme="${id}" style="--thc:${th.color}"><div class="th-head">${emblem(th.emblem)}<span class="th-kicker">Running theme</span><a class="th-name" href="/reference/themes/#theme-${id}">${esc(th.title)}</a>${title}</div><div class="th-body">\n`;
  }, `</div><div class="th-also"></div></aside>\n`);

  box("compare", (title, env) =>
    `<div class="compare">${title ? `<div class="cmp-title">${inline(title, env)}</div>` : ""}<div class="cmp-cols">\n`,
    `</div></div>\n`);

  box("cols", () => `<div class="cols">\n`, `</div>\n`);
  box("col", (title, env) => `<div class="col">${title ? `<div class="col-title">${inline(title, env)}</div>` : ""}\n`, `</div>\n`);

  md.kv = { renderTex, inline, usedSymbols };
  return md;
}
