// Preview a built site under its real path prefix:  node scripts/serve.mjs [_site] [port]
// (Eleventy's own `npm run serve` also works for the main _site; this one serves any output folder.)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "_site");
const port = +(process.argv[3] || 8080);
const prefix = process.env.PATH_PREFIX ?? "/kvblockdiff-primer/";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf" };

http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/") { res.writeHead(302, { location: prefix }); return res.end(); }
  if (!u.startsWith(prefix)) { res.writeHead(404); return res.end("outside " + prefix); }
  let f = path.join(root, u.slice(prefix.length));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log(`serving ${root} at http://127.0.0.1:${port}${prefix}`));
