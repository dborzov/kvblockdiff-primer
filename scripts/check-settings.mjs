// Headless check of the reference-setting switch (the Pin / the Bench) on a built site:
//   NODE_PATH=/attic/olde-llm-maths/tests/node_modules node scripts/check-settings.mjs [_site] [--page landscape/reference-setting]
// Serves the output folder under the site prefix like scripts/check.mjs, then asserts: a [[@e]] span shows the
// default setting's value, the pill switches it to the Bench and stores kvp.setting, every .refv and the pill repaint,
// kv:setting fires, the term and symbol reminders carry the "In the Bench" line, and the choice survives a reload.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const root = path.resolve(args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--page") || "_site");
const prefix = process.env.PATH_PREFIX ?? "/kvblockdiff-primer/";
const pagePath = opt("--page", "landscape/reference-setting").replace(/^\/|\/$/g, "");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (!u.startsWith(prefix)) { res.writeHead(404); return res.end(); }
  let f = path.join(root, u.slice(prefix.length));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}${prefix}${pagePath}/`;

const failures = [];
const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) failures.push(what); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
const page = await ctx.newPage();
const errs = [];
page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", e => errs.push("pageerror: " + e.message));
await page.goto(url, { waitUntil: "load" });

// 1. build-time value of [[@e]] in the default setting (pages without one skip these checks)
const refE = page.locator('.refv[data-key="e"]').first();
const hasRef = (await refE.count()) > 0;
console.log(`${hasRef ? "ok  " : "skip"} page ${pagePath} has a [[@e]] span`);
if (hasRef) {
  check((await refE.textContent()) === "640 B", `[[@e]] shows "640 B" at first (got "${await refE.textContent()}")`);
  check((await refE.getAttribute("title")) === "in the Pin", `[[@e]] carries title "in the Pin"`);
}
check(await page.evaluate(() => window.KV.setting === "pin" && window.KV.settingDefault === "pin"), "KV.setting starts as the default (pin)");
check(await page.evaluate(() => window.KV.ref("e") === 640 && window.KV.refFmt("e") === "640 B" && window.KV.refFmt("L") === "100 384"), "KV.ref / KV.refFmt read the Pin");
check(await page.evaluate(() => window.KV.refFmt("k", "bench") === "not measured"), 'KV.refFmt("k", "bench") is "not measured"');

// 2. the pill: label, emblem, click → the Bench
const pill = page.locator(".setting-pill");
check((await pill.locator(".sp-label").textContent()) === "the Pin", "pill shows the Pin");
check((await pill.locator("use").getAttribute("href")) === "#emb-pin", "pill shows the pin emblem");
await page.evaluate(() => { window.__kvEvents = []; document.addEventListener("kv:setting", e => window.__kvEvents.push(e.detail)); });
await pill.click();
if (hasRef) {
  check((await refE.textContent()) === "512 B", `[[@e]] shows "512 B" after the click (got "${await refE.textContent()}")`);
  check((await refE.getAttribute("title")) === "in the Bench", `[[@e]] title became "in the Bench"`);
  const nl = page.locator('.refv[data-key="NL"]').first();
  if (await nl.count()) check((await nl.textContent()) === "6", "[[@NL]] shows 6 in the Bench");
}
check(await page.evaluate(() => [...document.querySelectorAll(".refv[data-key]")].every(el => el.textContent === window.KV.refFmt(el.dataset.key) && el.title === "in the Bench")), "every .refv on the page repainted for the Bench");
check((await pill.locator(".sp-label").textContent()) === "the Bench", "pill shows the Bench");
check((await pill.locator("use").getAttribute("href")) === "#emb-flask", "pill shows the flask emblem");
check(/the Pin/.test(await pill.getAttribute("aria-label")) && /the Bench/.test(await pill.getAttribute("aria-label")), "pill's aria-label names the current and the next setting");
check(await page.evaluate(() => localStorage.getItem("kvp.setting") === JSON.stringify("bench")), 'localStorage kvp.setting is "bench"');
check(await page.evaluate(() => window.KV.setting === "bench" && JSON.stringify(window.__kvEvents) === '["bench"]'), "kv:setting fired once with detail 'bench'");
check(await page.evaluate(() => document.documentElement.getAttribute("data-setting") === "bench"), "<html data-setting> follows");

// 3. keyboard: Enter on the focused pill cycles back to the Pin, and once more to the Bench
await pill.focus();
await page.keyboard.press("Enter");
check(await page.evaluate(() => window.KV.setting === "pin"), "Enter on the pill cycles back to the Pin");
await page.keyboard.press("Space");
check(await page.evaluate(() => window.KV.setting === "bench"), "Space on the pill cycles on to the Bench");

// 4. the term reminder of a term with ref: (hover a chip; fall back to focus if there is none on the page)
const termId = await page.evaluate(() => {
  const withRef = [...document.querySelectorAll(".term[data-term]")].map(e => e.dataset.term).find(id => window.KV.glossary[id] && window.KV.glossary[id].ref);
  return withRef || null;
});
console.log(`${termId ? "ok  " : "skip"} page has a term chip with ref: (${termId})`);
if (termId) {
  const chip = page.locator(`.term[data-term="${termId}"]`).first();
  await chip.scrollIntoViewIfNeeded();
  await chip.hover();
  await page.waitForSelector(".pop:not([hidden]) .pop-ref", { timeout: 3000 });
  const ref = await page.locator(".pop .pop-ref").textContent();
  check(/^In the Bench:/.test(ref), `term reminder ends with "In the Bench: …" (got "${ref.slice(0, 80)}")`);
  check(/in the Pin:/.test(ref), "term reminder also lists the Pin in smaller type");
  check(!/\{[A-Za-z0-9]+\}/.test(ref), "no unfilled {placeholder} in the term reminder");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
}

// 5. the symbol reminder of a symbol with ref:
const symFound = await page.evaluate(() => !!document.querySelector(".sym.s-e, .sym.s-NL, .sym.s-L, .sym.s-k"));
console.log(`${symFound ? "ok  " : "skip"} page has a symbol with ref:`);
check(!!termId || symFound, "page has at least one term or symbol with ref: to test the reminder on");
if (symFound) {
  const sym = page.locator(".sym.s-e, .sym.s-NL, .sym.s-L, .sym.s-k").first();
  await sym.scrollIntoViewIfNeeded();
  await sym.hover();
  await page.waitForSelector(".pop:not([hidden]) .pop-ref", { timeout: 3000 });
  const ref = await page.locator(".pop .pop-ref").textContent();
  check(/^In the Bench: .+ · in the Pin: .+/.test(ref), `symbol reminder reads "In the Bench: … · in the Pin: …" (got "${ref}")`);
  await page.mouse.move(0, 0);
}

// 6. the choice survives a reload
await page.reload({ waitUntil: "load" });
check((await pill.locator(".sp-label").textContent()) === "the Bench" && (!hasRef || (await refE.textContent()) === "512 B"), "after a reload the Bench is still selected");
check(await page.evaluate(() => { window.KV.setSetting("pin"); const e = document.querySelector('.refv[data-key="e"]'); return window.KV.setting === "pin" && (!e || e.textContent === "640 B"); }), "KV.setSetting('pin') restores the Pin");
check(errs.length === 0, `no console errors (${errs.join(" | ").slice(0, 200)})`);

await browser.close();
server.close();
console.log(`${failures.length ? failures.length + " failure(s)" : "all checks passed"} on /${pagePath}`);
process.exit(failures.length ? 1 : 0);
