// Headless check of the built site.
//   node scripts/check.mjs [_site] [--pages school/entropy,tiny-files/notice-anything] [--shots] [--phone] [--dark] [--out dir]
// Serves the output folder under the site prefix, opens every page (or the listed ones), forces every
// figure to build, and reports: console errors, failed requests, .fig-error boxes, KaTeX errors,
// horizontal overflow at phone width, and missing term/symbol data. Exit code 1 on any problem.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");   // pre-installed globally (NODE_PATH)

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const positional = args.filter((a, i) => !a.startsWith("--") && !["--pages", "--out"].includes(args[i - 1]));
const root = path.resolve(positional[0] || "_site");
const prefix = process.env.PATH_PREFIX ?? "/kvblockdiff-primer/";
const outDir = path.resolve(opt("--out", ".cache/shots"));

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf" };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split("?")[0]);
  if (!u.startsWith(prefix)) { res.writeHead(404); return res.end(); }
  let f = path.join(root, u.slice(prefix.length));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}${prefix}`;

function allPages() {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "index.html") out.push(path.relative(root, d).split(path.sep).join("/"));
    }
  })(root);
  return out.sort();
}
const pages = opt("--pages") ? opt("--pages").split(",").map(s => s.replace(/^\/|\/$/g, "")) : allPages();

const browser = await chromium.launch();
const problems = [];
const widths = flag("--phone") ? [375] : [1360, 375];
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 800 : 900 }, colorScheme: flag("--dark") ? "dark" : "light" });
  // fonts from Google are not reachable here: fall back silently
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  for (const p of pages) {
    const page = await ctx.newPage();
    const errs = [];
    page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
    page.on("pageerror", e => errs.push("pageerror: " + e.message));
    page.on("requestfailed", r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) errs.push("request failed: " + r.url()); });
    page.on("response", r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()}: ${r.url()}`); });
    await page.goto(base + (p ? p + "/" : ""), { waitUntil: "load" });
    await page.evaluate(() => window.buildAllFigures && window.buildAllFigures());
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({
      figErrors: [...document.querySelectorAll(".fig-error")].map(e => e.closest("figure")?.id + ": " + e.textContent.trim().slice(0, 160)),
      unbuilt: [...document.querySelectorAll("figure[data-fig]:not([data-built])")].map(f => f.id),
      katex: [...document.querySelectorAll(".katex-error")].map(e => e.getAttribute("title") || e.textContent),
      overflow: document.documentElement.scrollWidth - innerWidth,
      wide: [...document.querySelectorAll(".prose > *, .deck, .pager")].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => e.tagName + "." + e.className.split(" ")[0]).slice(0, 5),
      unknownTerms: [...document.querySelectorAll(".term[data-term]")].map(e => e.dataset.term).filter(t => !(window.KV.glossary || {})[t]),
    }));
    const where = `[${width}px] /${p}`;
    for (const e of errs) problems.push(`${where} console: ${e}`);
    for (const e of r.figErrors) problems.push(`${where} figure error: ${e}`);
    for (const e of r.unbuilt) problems.push(`${where} figure not built: ${e}`);
    for (const e of r.katex) problems.push(`${where} KaTeX error: ${e}`);
    for (const e of r.unknownTerms) problems.push(`${where} unknown term: ${e}`);
    if (r.overflow > 1) problems.push(`${where} horizontal overflow ${r.overflow}px ${r.wide.join(", ")}`);
    if (flag("--shots")) {
      fs.mkdirSync(outDir, { recursive: true });
      const name = `${(p || "home").replace(/\//g, "_")}-${width}${flag("--dark") ? "-dark" : ""}.png`;
      await page.screenshot({ path: path.join(outDir, name), fullPage: true });
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
server.close();
console.log(`checked ${pages.length} page(s) at ${widths.join(" and ")}px — ${problems.length} problem(s)`);
for (const p of problems) console.log("  " + p);
if (flag("--shots")) console.log(`screenshots in ${outDir}`);
process.exit(problems.length ? 1 : 0);
