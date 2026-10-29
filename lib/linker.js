// Post-build linker. Runs over the finished HTML of the whole site and
//  1. numbers figures ("Plate II.3·1") and labelled equations ("(II.3·2)") per page,
//  2. resolves every [data-ref] (page ids, page-id/heading-id, figure and equation ids) to a real URL
//     and fills empty cross-reference text with the target's label,
//  3. points every glossary-term mention at the page holding its <dfn id="def-…">,
//  4. checks every internal link and anchor, and that terms are not used before they are defined.
// Problems are printed and written to .cache/linker-report.txt; with STRICT=1 any error fails the build.
import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";

const PARSE_OPTS = { comment: true, blockTextElements: { script: true, noscript: true, style: true, pre: true } };

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const text = el => el.text.replace(/\s+/g, " ").trim();
const escAttr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function runLinker({ outDir, prefix, order, strict, partial = false, themes = {}, datasets = {} }) {
  const errors = [], warnings = [];
  const docs = walk(outDir).map(file => {
    const rel = path.relative(outDir, file).split(path.sep).join("/");
    const url = prefix + rel.replace(/index\.html$/, "");
    const root = parse(fs.readFileSync(file, "utf8"), PARSE_OPTS);
    const body = root.querySelector("body");
    return {
      file, rel, url, root,
      pageId: body?.getAttribute("data-page-id") || null,
      num: body?.getAttribute("data-page-num") || "",
      title: body?.getAttribute("data-page-title") || "",
      ids: new Set(root.querySelectorAll("[id]").map(e => e.getAttribute("id"))),
    };
  });
  const byUrl = new Map(docs.map(d => [d.url, d]));
  const rank = id => { const i = order.indexOf(id); return i < 0 ? Infinity : i; };

  // ---- index of link targets
  const targets = new Map(), defs = new Map();
  const add = (key, t, doc) => {
    if (targets.has(key)) errors.push(`duplicate target id "${key}" in ${doc.rel} and ${targets.get(key).doc.rel}`);
    else targets.set(key, { ...t, doc });
  };
  for (const d of docs) {
    if (d.pageId) add(d.pageId, { href: d.url, label: `${d.num ? d.num + " " : ""}${d.title}`, short: d.num || d.title }, d);
    const pre = d.num ? d.num + "·" : "";
    d.root.querySelectorAll("figure.plate[id]").forEach((f, i) => {
      const label = `Plate ${pre}${i + 1}`;
      const no = f.querySelector(".plate-no");
      if (no) no.set_content(label + ".");
      add(f.getAttribute("id"), { href: `${d.url}#${f.getAttribute("id")}`, label, short: label }, d);
    });
    d.root.querySelectorAll(".eq[id]").forEach((e, i) => {
      const label = `Eq. ${pre}${i + 1}`;
      const no = e.querySelector(".eq-no");
      if (no) no.set_content(`(${pre}${i + 1})`);
      add(e.getAttribute("id"), { href: `${d.url}#${e.getAttribute("id")}`, label, short: label }, d);
    });
    if (d.pageId) {
      for (const h of d.root.querySelectorAll("article h2[id], article h3[id]")) {
        const label = `${d.num ? d.num + " › " : ""}${text(h)}`;
        targets.set(`${d.pageId}/${h.getAttribute("id")}`, { href: `${d.url}#${h.getAttribute("id")}`, label, short: label, doc: d });
      }
    }
    for (const el of d.root.querySelectorAll("[data-xlabel][id]")) {
      add(el.getAttribute("id"), { href: `${d.url}#${el.getAttribute("id")}`, label: el.getAttribute("data-xlabel"), short: el.getAttribute("data-xlabel") }, d);
    }
    for (const dfn of d.root.querySelectorAll("dfn[id]")) {
      const id = dfn.getAttribute("id").replace(/^def-/, "");
      if (defs.has(id)) errors.push(`term "${id}" is defined twice: ${defs.get(id).doc.rel} and ${d.rel}`);
      else defs.set(id, { href: `${d.url}#def-${id}`, doc: d });
    }
  }

  // ---- resolve references and term links
  for (const d of docs) {
    for (const a of d.root.querySelectorAll("[data-ref]")) {
      const ref = a.getAttribute("data-ref");
      const t = targets.get(ref);
      if (!t) {
        (partial ? warnings : errors).push(`${d.rel}: unknown reference [[#${ref}]]${partial ? " (outside this partial build?)" : ""}`);
        a.setAttribute("data-unresolved", "1");
        continue;
      }
      const href = t.doc === d && t.href.includes("#") ? t.href.slice(t.href.indexOf("#")) : t.href;
      a.setAttribute("href", href);
      if (a.classList.contains("xref")) {
        if (!text(a)) a.set_content(escAttr(a.getAttribute("data-ref-style") === "num" ? t.short : t.label));
        a.setAttribute("title", t.label);
      }
    }
    for (const a of d.root.querySelectorAll("a.term[data-term]")) {
      const id = a.getAttribute("data-term");
      const def = defs.get(id);
      if (!def) {
        (strict && !partial ? errors : warnings).push(`${d.rel}: term "${id}" is used but never defined with [[=${id}]] or ::: define`);
        a.setAttribute("href", `${prefix}reference/glossary/#g-${id}`);
        continue;
      }
      a.setAttribute("href", def.doc === d ? `#def-${id}` : def.href);
      a.setAttribute("data-def", `${def.doc.num ? def.doc.num + " " : ""}${def.doc.title}`);
      if (d.pageId && d.pageId !== "home" && rank(def.doc.pageId) > rank(d.pageId)) {
        warnings.push(`${d.rel}: term "${id}" is used before its definition (${def.doc.num} ${def.doc.title})`);
      }
    }
  }

  // ---- check every internal link
  for (const d of docs) {
    for (const a of d.root.querySelectorAll("a[href]:not([data-unresolved])")) {
      const href = a.getAttribute("href");
      if (/^(https?:|mailto:)/.test(href)) continue;
      let [p, hash] = href.split("#");
      let target = d;
      if (p) {
        if (!p.startsWith(prefix)) { errors.push(`${d.rel}: link outside the site prefix: ${href}`); continue; }
        if (/\.[a-z0-9]+$/i.test(p) && !p.endsWith(".html")) continue;   // assets, json
        target = byUrl.get(p.endsWith("/") ? p : p + "/") || byUrl.get(p);
        if (!target) { (partial ? warnings : errors).push(`${d.rel}: broken link ${href}`); continue; }
      }
      if (hash && !target.ids.has(decodeURIComponent(hash))) errors.push(`${d.rel}: missing anchor ${href}`);
    }
  }

  // ---- running themes: every callout lists the other places its theme appears
  const occ = {};
  for (const d of docs.filter(x => x.pageId).sort((a, b) => rank(a.pageId) - rank(b.pageId))) {
    for (const n of d.root.querySelectorAll(".theme-note[data-theme]")) {
      const th = n.getAttribute("data-theme");
      let sec = null;
      for (const h of d.root.querySelectorAll("article h2[id]")) {
        if (h.range[0] < n.range[0]) sec = h;
      }
      const anchor = `th-${th}-${(occ[th] || []).filter(o => o.doc === d).length + 1}`;
      n.setAttribute("id", anchor);
      (occ[th] = occ[th] || []).push({ doc: d, node: n, anchor, sec: sec ? text(sec) : "" });
    }
  }
  for (const [th, list] of Object.entries(occ)) {
    for (const o of list) {
      const others = list.filter(x => x !== o);
      const box = o.node.querySelector(".th-also");
      if (!box) continue;
      box.set_content(others.length
        ? `<span>Also on</span> ` + others.map(x => `<a href="${x.doc === o.doc ? "#" + x.anchor : x.doc.url + "#" + x.anchor}" title="${escAttr(x.doc.num + " " + x.doc.title + (x.sec ? " › " + x.sec : ""))}">${escAttr(x.doc.num)}</a>`).join(" · ")
        : `<span>First appearance of this theme.</span>`);
    }
  }
  for (const d of docs) {
    for (const holder of d.root.querySelectorAll(".theme-occurrences[data-theme]")) {
      const list = occ[holder.getAttribute("data-theme")] || [];
      holder.set_content(list.length
        ? "<ol>" + list.map(x => `<li><a href="${x.doc.url}#${x.anchor}"><b>${escAttr(x.doc.num)}</b> ${escAttr(x.doc.title)}</a>${x.sec ? ` <span class="small">› ${escAttr(x.sec)}</span>` : ""}</li>`).join("") + "</ol>"
        : `<p class="small">Not used yet.</p>`);
    }
  }
  for (const th of Object.keys(themes)) if (!occ[th]) warnings.push(`theme "${th}" is never used`);

  // ---- running datasets: every dataset card lists the other places the same data appears
  const dso = {};
  for (const d of docs.filter(x => x.pageId).sort((a, b) => rank(a.pageId) - rank(b.pageId))) {
    for (const f of d.root.querySelectorAll("figure.ds-plate[data-ds]")) {
      const ds = f.getAttribute("data-ds");
      let sec = null;
      for (const h of d.root.querySelectorAll("article h2[id]")) if (h.range[0] < f.range[0]) sec = h;
      const cap = f.querySelector("figcaption");
      (dso[ds] = dso[ds] || []).push({ doc: d, node: f, anchor: f.getAttribute("id"), sec: sec ? text(sec) : "", cap: cap ? text(cap).replace(/^Plate [^.]*\.\s*❧?\s*/, "").slice(0, 140) : "" });
    }
  }
  for (const list of Object.values(dso)) {
    list.forEach((o, i) => {
      const box = o.node.querySelector(".ds-also");
      if (!box) return;
      const link = x => `<a href="${x.doc === o.doc ? "#" + x.anchor : x.doc.url + "#" + x.anchor}" title="${escAttr(x.doc.num + " " + x.doc.title + (x.sec ? " › " + x.sec : ""))}">${escAttr(x.doc.num)}</a>`;
      const before = list.slice(0, i).filter(x => x.doc !== o.doc), after = list.slice(i + 1).filter(x => x.doc !== o.doc);
      const parts = [];
      if (before.length) parts.push(`<span>Met before on</span> ${before.map(link).join(" · ")}`);
      if (after.length) parts.push(`<span>${before.length ? "comes back on" : "Comes back on"}</span> ${after.map(link).join(" · ")}`);
      box.set_content(parts.length ? parts.join(" <span class=\"ds-sep\">—</span> ") : `<span>Appears only here.</span>`);
    });
  }
  for (const d of docs) {
    for (const holder of d.root.querySelectorAll(".ds-occurrences[data-ds]")) {
      const list = dso[holder.getAttribute("data-ds")] || [];
      holder.set_content(list.length
        ? "<ol>" + list.map(x => `<li><a href="${x.doc.url}#${x.anchor}"><b>${escAttr(x.doc.num)}</b> ${escAttr(x.doc.title)}</a>${x.sec ? ` <span class="small">› ${escAttr(x.sec)}</span>` : ""}</li>`).join("") + "</ol>"
        : `<p class="small">Not used yet.</p>`);
    }
  }
  for (const ds of Object.keys(datasets)) if (!dso[ds] && !partial) warnings.push(`dataset "${ds}" is never shown`);

  for (const d of docs) fs.writeFileSync(d.file, d.root.toString());

  const report = [`${errors.length} error(s), ${warnings.length} warning(s)`, "", ...errors.map(e => "ERROR " + e), ...warnings.map(w => "warn  " + w)].join("\n");
  const reportFile = `.cache/linker-report-${path.basename(path.resolve(outDir))}.txt`;
  fs.mkdirSync(".cache", { recursive: true });
  fs.writeFileSync(reportFile, report + "\n");
  console.log(`[linker] ${docs.length} pages, ${targets.size} targets, ${defs.size} definitions — ${errors.length} error(s), ${warnings.length} warning(s) (see ${reportFile})`);
  for (const e of errors.slice(0, 25)) console.log("  ERROR " + e);
  if (strict && errors.length) throw new Error(`linker: ${errors.length} error(s)`);
  return { errors, warnings };
}
