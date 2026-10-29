# kv-blockdiff — a primer and a research proposal

**Lossless dictionary coding of LLM KV caches for sparse-attention decoding**, told as a story,
a self-contained primer, and a concrete research plan.

Read it at **https://www.borzov.ca/kvblockdiff-primer/**.

The site starts from a weather station whose tiny JSON messages refuse to compress one at a time,
teaches every idea it needs from scratch (bits, entropy, side information, entropy coders, prediction,
vectors and rotations, codebooks, 8-bit number formats, caches), then maps the story onto the KV cache
of a sparse-attention language model: could the tiny pieces fetched at every decode step travel as
short deltas against shared dictionaries, and be rebuilt bit for bit on the GPU?

## How the site is built

Content and presentation are kept apart. Writers touch only Markdown and data; the theme is separate.

```
content/      the prose — one Markdown file per page, one folder per Part
data/         the vocabulary — glossary terms, math symbols, running themes, the list of Parts (YAML)
figures/      interactive figure code (one JS file per Part) and figure data
analysis/     Python scripts that reproduce the numbers behind figures
theme/        presentation — page layouts (Nunjucks), CSS, the client-side engine
lib/          the Markdown dialect (math, [[terms]], ::: blocks) and the post-build linker
scripts/      headless checker, preview server, data validator
docs/         AUTHORING.md (how to write pages), figures.md, flashcards.md, PAGEPLAN.md
```

The generator is [Eleventy](https://www.11ty.dev/) with a small Markdown dialect:

- `$…$` and `$$…$$` — math, rendered at build time with KaTeX. Symbols are written as macros
  (`\ve`, `\vrho`, …) so every symbol has one meaning and one colour site-wide, a hover reminder,
  and an automatic "what's in this equation" panel.
- `[[term]]`, `[[=term]]` — glossary terms with hover reminders, and their single definition.
- `[[#page-id]]`, `[[#fig-id]]` — cross-references, resolved and checked after every build.
- `::: takeaway`, `::: note`, `::: aside`, `::: define`, `::: figure`, `::: theme`, `::: compare`, … — components.
- Front-matter `cards:` — flashcards, collected in the browser and practised on `/practice/`.

See [`docs/AUTHORING.md`](docs/AUTHORING.md) for the full guide.

## Build and preview

```bash
npm install
npm run serve          # http://localhost:8080/kvblockdiff-primer/ with live reload
npm run build          # into _site/
STRICT=1 npm run build # fail on any broken reference or undefined term
node scripts/check.mjs _site --shots   # headless check of every page, desktop + phone
```

## Deployment

The built site is published on the `gh-pages` branch by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
every push to `main` (or a manual run from the Actions tab) runs a strict build and force-pushes the result to
`gh-pages`. To publish by hand instead, run `STRICT=1 npm run build` and commit the contents of `_site/` to `gh-pages`.
GitHub Pages serves that branch; because the account's user site has the custom
domain `www.borzov.ca`, this project appears at `https://www.borzov.ca/kvblockdiff-primer/`.
