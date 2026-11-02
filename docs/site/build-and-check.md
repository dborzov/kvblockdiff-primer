# Build, preview, check

```bash
npm ci                                   # once (Node ≥ 20)
npm run build                            # full site into _site/; linker summary printed, report in .cache/
STRICT=1 npm run build                   # any linker error fails the build (CI does this)
npm run serve                            # live preview at http://localhost:8080/kvblockdiff-primer/
node scripts/validate-data.mjs           # YAML in data/ (terms, symbols, themes, parts, settings) without a build
node scripts/check.mjs _site --shots     # headless check of every page at desktop and phone width; screenshots in .cache/shots
node scripts/check.mjs _site --pages school/entropy,idea/mapping --shots   # a subset (URL paths without the prefix)
```

`PATH_PREFIX` (default `/kvblockdiff-primer/`) is honoured by the build, the checker and the preview server.

## Partial builds

While several writers work at once, build one Part into its own folder so a half-written page elsewhere
cannot break yours:

```bash
ONLY=03-landscape npx @11ty/eleventy --output=/tmp/site-landscape
node scripts/check.mjs /tmp/site-landscape --pages landscape/attention --shots --out /tmp/shots-landscape
node scripts/serve.mjs /tmp/site-landscape 8123
```

`ONLY` takes a comma-separated list of Part folders. The home and reference pages are always built.
References to pages outside the partial build are reported as warnings, not errors.

## Reading the linker report

`.cache/linker-report-<output folder>.txt` lists every problem. Errors (fail a strict build):

- `unknown reference [[#x]]`, `broken link`, `missing anchor` — a page, section, figure or equation id that does not exist.
- `duplicate target id` — two figures or equations share an id.
- `term "x" is defined twice` — two `[[=x]]` or `::: define x` on the site.
- `term "x" is used but never defined` — a `[[x]]` whose definition exists nowhere (error only in a full strict build).

Warnings (allowed, but fix the ones in your pages):

- `term "x" is used before its definition (…)` — reading order puts a mention before the home page. Either
  move the mention, explain the idea in a plain sentence instead, or (rarely) move the home page.
- `theme "x" is never used`.

The checker (`scripts/check.mjs`) loads each page in headless Chromium, fails on console errors, missing
figures and layout overflow at phone width, and saves screenshots. Look at the screenshots.

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`: `npm ci`, `STRICT=1 npm run build`, publish `_site/`
to the `gh-pages` branch, served at https://www.borzov.ca/kvblockdiff-primer/. Nothing is deployed from
other branches.
