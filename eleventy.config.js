// Build configuration.
//   content/   Markdown pages (prose only)          data/     parts, glossary terms, math symbols (YAML)
//   theme/     layouts, CSS, client-side engine     figures/  interactive figure code + data
//   lib/       Markdown dialect, linker             _site/    the generated website
import fs from "node:fs";
import path from "node:path";
import katex from "katex";
import { HtmlBasePlugin } from "@11ty/eleventy";
import { loadParts, loadGlossary, loadSymbols, loadThemes, symbolMacros, CATEGORIES, FAMILIES } from "./lib/data.js";
import { createMarkdown } from "./lib/markdown.js";
import { runLinker } from "./lib/linker.js";
import { slugify, esc, emblem, termChip } from "./lib/render.js";

const PREFIX = process.env.PATH_PREFIX ?? "/kvblockdiff-primer/";
const STRICT = process.env.STRICT === "1";
const SITE = {
  title: "kv-blockdiff",
  subtitle: "A primer and research proposal on lossless dictionary coding of LLM KV caches",
  author: "Dmitry Borzov",
  repo: "https://github.com/dborzov/kvblockdiff-primer",
  prefix: PREFIX,
};

let READING_ORDER = [];   // page ids in reading order, filled by the "pages" collection, used by the linker

export default function (cfg) {
  const parts = loadParts();
  const glossary = loadGlossary();
  const symbols = loadSymbols();
  const themes = loadThemes();
  const macros = symbolMacros(symbols);
  for (const id of Object.keys(symbols)) {
    let builtin = true;
    try { katex.renderToString("\\v" + id, { throwOnError: true }); } catch { builtin = false; }
    if (builtin) throw new Error(`symbol id "${id}" collides with the KaTeX command \\v${id}; rename it`);
  }
  const md = createMarkdown({ glossary, symbols, macros, themes, prefix: PREFIX });
  cfg.setLibrary("md", md);
  cfg.addPlugin(HtmlBasePlugin);

  // ---------------------------------------------------------------- data cascade
  const partByDir = Object.fromEntries(parts.map(p => [p.dir, p]));
  const fileOf = d => path.basename(d.page.inputPath, path.extname(d.page.inputPath));
  const partOf = d => partByDir[path.basename(path.dirname(d.page.inputPath))] || null;
  const slugOf = d => fileOf(d).replace(/^\d+-/, "");
  const orderOf = d => +((fileOf(d).match(/^(\d+)-/) || [])[1] || 0);

  cfg.addGlobalData("site", SITE);
  cfg.addGlobalData("parts", parts);
  cfg.addGlobalData("glossary", glossary);
  cfg.addGlobalData("symbols", symbols);
  cfg.addGlobalData("themes", themes);
  cfg.addGlobalData("categories", CATEGORIES);
  cfg.addGlobalData("families", FAMILIES);
  cfg.addGlobalData("layout", "page.njk");
  cfg.addGlobalData("eleventyComputed", {
    part: d => partOf(d),
    partId: d => partOf(d)?.id || "",
    pageOrder: d => orderOf(d),
    pageId: d => d.id || (partOf(d) ? `${partOf(d).slug}-${slugOf(d)}` : slugOf(d) === "index" ? "home" : slugOf(d)),
    num: d => (partOf(d) ? `${partOf(d).id}.${orderOf(d)}` : ""),
    permalink: d => d.outputPath || (partOf(d) ? `/${partOf(d).slug}/${slugOf(d)}/` : slugOf(d) === "index" ? "/" : `/${slugOf(d)}/`),
    figList: d => d.figs || partOf(d)?.figs || [],
  });

  cfg.addCollection("pages", api => {
    const pages = api.getAll()
      .filter(p => p.data.partId)
      .sort((a, b) => a.data.part.index - b.data.part.index || a.data.pageOrder - b.data.pageOrder);
    READING_ORDER = ["home", ...pages.map(p => p.data.pageId)];
    return pages;
  });

  // ---------------------------------------------------------------- filters for the layouts
  const env0 = { page: { inputPath: "(layout)" } };
  cfg.addFilter("mdInline", (s, inputPath) => (s ? md.renderInline(String(s), { page: { inputPath: inputPath || "(front matter)" } }) : ""));
  cfg.addFilter("termChip", (id, text) => {
    const t = glossary[id];
    if (!t) throw new Error(`termChip: unknown term ${id}`);
    return termChip(t, text ? esc(text) : null);
  });
  cfg.addFilter("emblem", name => emblem(name));
  cfg.addFilter("tex", s => md.kv.renderTex(String(s), false, env0));

  const byLabel = (a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" });
  cfg.addFilter("brandTerms", g => Object.values(g).filter(t => t.brand));
  cfg.addFilter("termsInCat", (g, cat) => Object.values(g).filter(t => t.cat === cat).sort((a, b) => (b.brand ? 1 : 0) - (a.brand ? 1 : 0) || byLabel(a, b)));
  cfg.addFilter("symbolsInFam", (s, fam) => Object.values(s).filter(x => x.fam === fam));
  cfg.addFilter("familyExamples", fam => Object.values(symbols).filter(x => x.fam === fam).slice(0, 4)
    .map(x => md.kv.renderTex("\\v" + x.id, false, env0)).join(" "));

  cfg.addFilter("navTree", pages => parts.map(p => {
    const groups = [];
    for (const pg of pages.filter(x => x.data.partId === p.id)) {
      const g = pg.data.group || "";
      if (!groups.length || groups[groups.length - 1].name !== g) groups.push({ name: g, pages: [] });
      groups[groups.length - 1].pages.push({ id: pg.data.pageId, num: pg.data.num, url: pg.url, nav: pg.data.nav || pg.data.title });
    }
    return { ...p, groups, count: groups.reduce((n, g) => n + g.pages.length, 0), first: groups[0]?.pages[0] };
  }));
  cfg.addFilter("neighbors", (pages, pageId) => {
    const i = pages.findIndex(p => p.data.pageId === pageId);
    const info = p => p && { url: p.url, num: p.data.num, title: p.data.nav || p.data.title, partId: p.data.partId };
    return { prev: i > 0 ? info(pages[i - 1]) : null, next: i >= 0 ? info(pages[i + 1]) : info(pages[0]) };
  });

  function cardsOf(data) {
    const env = { page: { inputPath: data.page.inputPath } };
    return (data.cards || []).map((c, i) => {
      for (const k of ["q", "a"]) if (!c[k]) throw new Error(`card #${i + 1} has no "${k}" in ${data.page.inputPath}`);
      return {
        id: `${data.pageId}/${c.id || slugify(c.q).slice(0, 40)}`,
        q: md.renderInline(String(c.q), env),
        a: md.renderInline(String(c.a), env),
        wrong: (c.wrong || []).map(w => md.renderInline(String(w), env)),
        why: c.why ? md.renderInline(String(c.why), env) : "",
        sec: c.sec || "",
        page: data.pageId, num: data.num, title: data.title, part: data.partId,
        url: PREFIX + data.permalink.replace(/^\//, "") + (c.sec ? `#${c.sec}` : ""),
      };
    });
  }
  const scriptJson = v => JSON.stringify(v).replace(/</g, "\\u003c");
  cfg.addFilter("pageCardsJson", (cards, pageId, num, title, partId, permalink, inputPath) =>
    scriptJson(cardsOf({ cards, pageId, num, title, partId, permalink, page: { inputPath } })));
  cfg.addFilter("allCardsJson", pages => JSON.stringify(pages.flatMap(p => cardsOf(p.data))));
  cfg.addFilter("pageInfoJson", d => scriptJson({ id: d.pageId, num: d.num, title: d.title, part: d.partId, url: PREFIX + (d.permalink || "/").replace(/^\//, "") }));
  cfg.addFilter("json", v => scriptJson(v));
  cfg.addFilter("hasFigCss", name => fs.existsSync(`figures/${name}.css`));

  cfg.addFilter("siteDataJs", pages => {
    const r = s => (s ? md.renderInline(String(s), env0) : "");
    const kv = {
      prefix: PREFIX,
      cats: CATEGORIES, fams: FAMILIES,
      parts: parts.map(p => ({ id: p.id, roman: p.id, title: p.title, short: p.short, slug: p.slug, color: `var(--part-${p.id})` })),
      pages: Object.fromEntries(pages.map(p => [p.data.pageId, { num: p.data.num, title: p.data.title, url: PREFIX + p.url.replace(/^\//, ""), part: p.data.partId }])),
      glossary: Object.fromEntries(Object.values(glossary).map(t => [t.id, {
        label: t.label, name: t.name || "", nick: t.nick || "", short: r(t.short), cat: t.cat,
        brand: !!t.brand, emblem: t.emblem || "",
      }])),
      symbols: Object.fromEntries(Object.values(symbols).map(s => [s.id, {
        html: md.kv.renderTex("\\v" + s.id, false, env0), name: r(s.name), short: r(s.short),
        unit: r(s.unit), fam: s.fam, home: s.home || "",
      }])),
      macros,
    };
    return `window.KV=Object.assign(window.KV||{},${scriptJson(kv)});\n`;
  });
  cfg.addFilter("termsCss", () => {
    const brand = Object.values(glossary).filter(t => t.brand);
    const light = brand.map(t => `--t-${t.id}:${t.color[0]};`).join("");
    const dark = brand.map(t => `--t-${t.id}:${t.color[1] || t.color[0]};`).join("");
    return `/* generated from data/terms/*.yaml: one brand colour per signature term */\n:root{${light}}\n`
      + `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark}}}\n:root[data-theme="dark"]{${dark}}\n`;
  });

  // ---------------------------------------------------------------- generated files
  const virtual = (file, permalink, body) =>
    cfg.addTemplate(file, body, { outputPath: permalink, layout: null, eleventyExcludeFromCollections: true });
  virtual("gen/site-data.njk", "/assets/gen/site-data.js", "{{ collections.pages | siteDataJs | safe }}");
  virtual("gen/terms-css.njk", "/assets/gen/terms.css", "{{ '' | termsCss | safe }}");
  virtual("gen/cards-json.njk", "/cards.json", "{{ collections.pages | allCardsJson | safe }}");

  // ---------------------------------------------------------------- static files
  cfg.addPassthroughCopy({ "theme/assets": "assets" });
  cfg.addPassthroughCopy({ "figures": "assets/figs" });
  cfg.addPassthroughCopy({
    "node_modules/katex/dist/katex.min.css": "assets/vendor/katex/katex.min.css",
    "node_modules/katex/dist/katex.min.js": "assets/vendor/katex/katex.min.js",
    "node_modules/katex/dist/fonts": "assets/vendor/katex/fonts",
  });
  const pako = ["node_modules/pako/dist/browser/pako.umd.min.js", "node_modules/pako/dist/pako.min.js"].find(f => fs.existsSync(f));
  if (pako) cfg.addPassthroughCopy({ [pako]: "assets/vendor/pako.min.js" });

  for (const w of ["data", "theme", "figures", "lib"]) cfg.addWatchTarget(w);

  // ONLY=03-landscape,02-school builds just those Part folders (plus the home and reference pages),
  // so that one writer's half-finished page cannot break another writer's build.
  const ONLY = (process.env.ONLY || "").split(",").map(s => s.trim()).filter(Boolean);
  if (ONLY.length) {
    for (const p of parts) if (!ONLY.includes(p.dir) && p.id !== "X") cfg.ignores.add(`content/${p.dir}/**`);
  }

  cfg.on("eleventy.after", ({ directories }) => {
    runLinker({ outDir: directories.output, prefix: PREFIX, order: READING_ORDER, strict: STRICT, partial: ONLY.length > 0, themes });
  });

  return {
    dir: { input: "content", includes: "../theme/layouts", output: "_site" },
    pathPrefix: PREFIX,
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk"],
  };
}
