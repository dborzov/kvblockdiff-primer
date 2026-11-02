# Repository layout

| folder | what it holds | who edits it |
|---|---|---|
| `content/` | the prose: one Markdown file per page, one folder per Part (`04-idea/02-dictionary-delta-block.md`) | writers |
| `data/terms/*.yaml` | the glossary: every defined term, its reminder, emblem and colour | writers (own file per Part) |
| `data/symbols/*.yaml` | the notation: every math symbol, its family colour and meaning | writers (own file per Part) |
| `data/settings.yaml` | the frozen rigs (the Pin, the Bench) and the keys `[[@key]]` renders | rarely; see `project/rigs.md` |
| `data/themes.yaml`, `data/parts.yaml` | running themes; the list of Parts in reading order | rarely |
| `figures/<part>.js` (+ `.css`) | interactive figures of one Part, registered as `FIG.<builder>` | writers |
| `figures/data/*.json` | data files figures fetch; produced by `analysis/` | analysis scripts |
| `analysis/` | Python and Node scripts that reproduce every figure number | writers |
| `theme/` | layouts (Nunjucks), CSS, client-side JS (terms hover, cards, plot kit, setting switch) | maintainers |
| `lib/` | the Markdown dialect (`markdown.js`), data loading (`data.js`), the post-build linker (`linker.js`), rendering helpers | maintainers |
| `scripts/` | `check.mjs` (headless checker), `serve.mjs`, `validate-data.mjs`, `check-settings.mjs` | maintainers |
| `docs/` | this documentation (catalog in `docs/README.md`) | everyone, as they go |
| `experiment_repos/` | how to read the experiments repository behind the measured Part; verified notes; the pinned-number spec | measured-Part writers |
| `.github/workflows/deploy.yml` | strict build on push to `main`, published to `gh-pages` | maintainers |

Build outputs: `_site/` (the site), `.cache/` (linker reports, screenshots). Both are git-ignored.

## Ids, in one place

- **Page id** = `<part slug>-<file name without its number>`: `content/02-school/04-entropy.md` → `school-entropy`,
  page number II.4, URL `/school/entropy/`. Part slugs come from `data/parts.yaml`.
- **Section id**: `## Heading {#my-id}`; referenced as `[[#page-id/my-id]]`.
- **Figure id** `fig-<topic>-<name>`, **equation id** `eq-<topic>-<name>`: unique across the site.
- **Term id** and **symbol id**: the YAML key; symbols become TeX macros `\v<id>` (letters only).
- **Flashcard id** `page-id/<slug of q>`: never changes once published (readers' progress keys on it).

## The engine, briefly

`eleventy.config.js` wires it: `lib/data.js` loads and validates YAML; `lib/markdown.js` turns the dialect
into HTML (KaTeX at build time, term chips, `:::` components, code captions, concept graphs); after the
build `lib/linker.js` numbers plates and equations, resolves `[[#…]]`, points chips at definitions and
checks links, anchors and define-before-use. `theme/assets/js/core.js` does hover reminders and the rig
switch in the browser; `cards.js`/`practice.js` the flashcards; `plotkit.js`/`figs-loader.js` the figures.
