// Small HTML builders shared by the Markdown extensions and the layouts.

export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function slugify(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/\$[^$]*\$/g, " ")              // drop inline math
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";
}

export function emblem(name, cls = "emb") {
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#emb-${esc(name)}"></use></svg>`;
}

export function termStyle(term) {
  return term.brand ? `--tc:var(--t-${term.id})` : `--tc:var(--cat-${term.cat})`;
}

// A glossary term as an inline chip: <a> for a mention, <dfn> for the one place that defines it.
// The linker later points every mention at the page that holds <dfn id="def-…">.
export function termChip(term, textHtml, { def = false } = {}) {
  const cls = `term ${term.brand ? "brand" : "plain"}${def ? " def" : ""}`;
  const inner = `${term.brand ? emblem(term.emblem) : ""}<span class="term-text">${textHtml ?? esc(term.label)}</span>`;
  if (def) return `<dfn id="def-${term.id}" class="${cls}" data-term="${term.id}" style="${termStyle(term)}">${inner}</dfn>`;
  return `<a class="${cls}" data-term="${term.id}" href="#def-${term.id}" style="${termStyle(term)}">${inner}</a>`;
}
