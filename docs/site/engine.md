# The engine: how a page becomes HTML

For maintainers. Writers never need this.

## The pipeline

1. `eleventy.config.js` loads `data/` (`lib/data.js`: parts, glossary, symbols, notation, themes,
   settings), builds the KaTeX macro table from the symbols, creates the Markdown engine
   (`lib/markdown.js`), and registers filters for the layouts (term chips, notation chips, TeX, the
   navigation tree, cards JSON, the generated `assets/gen/site-data.js` that carries glossary, symbols,
   notation, settings and page info to the client).
2. Each `content/**/*.md` page is rendered with `theme/layouts/page.njk` (home, glossary, notation,
   themes and practice pages have their own layouts). `eleventyComputed` derives the page id, Part,
   number ("IV.3") and permalink from the folder and file names.
3. After the build, `lib/linker.js` runs over the finished HTML: numbers plates and equations, resolves
   `[data-ref]` cross-references, points `a.term[data-term]` at the page holding `<dfn id="def-…">`,
   checks links and anchors, warns on terms used before their definition, writes the report; under
   `STRICT=1` any error fails the build.
4. `theme/assets/js/core.js` (every page): theme, navigation drawer, keyboard paging, the reference-setting
   pill (`KV.setting`, `KV.ref`, `KV.refText`, event `kv:setting`) and the hover/tap popovers for `.term`,
   `.sym` and `.nota`. `cards.js` / `practice.js`: flashcards. `figs-loader.js` + `plotkit.js` + the Part's
   `figures/<name>.js`: figures, built lazily when scrolled into view.

## Where to change what

| change | where |
|---|---|
| a new `[[…]]` kind or `::: block` | `lib/markdown.js` (`wiki` rule, `box()` calls); document it in `dialect.md` |
| a new hoverable | `lib/render.js` (the chip HTML), `core.js` (`*Html()` + `remindable`), `site.css` / `tokens.css` |
| a new data file kind | `lib/data.js` (`load*`, validation), `eleventy.config.js` (global data, site-data), `scripts/validate-data.mjs` |
| a new emblem | `theme/layouts/partials/emblems.njk` (24 × 24 `<symbol id="emb-…">`, stroke style like the others) |
| Part colours | `theme/assets/css/tokens.css` (`--part-<id>`) |
| a reference-setting key | `data/settings.yaml`; formats in `lib/settings-fmt.js` |
| the linker's rules | `lib/linker.js` |
| the headless checker | `scripts/check.mjs` (Playwright, pre-installed Chromium) |
| the word checker | `scripts/check-words.mjs`, `data/banned-words.yaml` |

`ONLY=<dirs>` makes Eleventy ignore the other Parts (the reference Part always builds) and the linker run
in partial mode (outside references are warnings).

## Invariants the engine assumes

- Page ids are unique and equal `<slug>-<file name without number>`.
- Every term has exactly one `<dfn>` on the site; every symbol id is a valid TeX macro name (letters only).
- Figure builders are globals on `window.FIG`; a Part loads only the files named in `data/parts.yaml`
  `figs`.
- The site is served under `/kvblockdiff-primer/` (`SITE.prefix`); all client code uses `KV.prefix`.
