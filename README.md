# kvblockdiff: the primer and the project's source of truth

**Lossless dictionary coding of the keys and values a sparse-attention LLM keeps in host memory**, told as
a story, a self-contained primer, a clean statement of one compression problem, the measurements so far,
and the research plan.

Read it at **https://www.borzov.ca/kvblockdiff-primer/**.

The site starts from a weather station whose tiny JSON messages refuse to compress one at a time, teaches
every idea it needs from scratch (bits, entropy, side information, entropy coders, prediction, vectors and
furrows, codebooks, 8-bit formats, caches), then writes attention out in Python with every shape named and
gives the LLM's growing store of keys and values its name, the *orchard*. Part IV states the problem on its
own: a sender holds the orchard, a receiver asks for one *cherry* at a time, a *dictionary* serves a
*punnet*, every cherry comes back bit for bit, and a *leash* keeps bulk compression out of the game. Part V
catalogues the stages a compressor is built from, Part VI maps the numbers onto a serving system
(HiSparse), Part VII states the hypotheses, Part VIII reports what two autonomous research campaigns
measured on real Qwen3.5-2B orchards, Part IX reads the papers critically, Part X plans what to measure
next, and Part XI is the reference.

Every estimate is quoted for a frozen reference setting; a pill in the top bar switches between the Pin
(a production deployment) and the Bench (the campaigns' own rig). Every project term is bundled with the
Python expression that pins it down, and shows its shape and bytes on hover.

## For contributors and agents

Start with [`AGENTS.md`](AGENTS.md); the documentation catalog is [`docs/README.md`](docs/README.md).
The vocabulary is a rule (`docs/style/terminology.md`); the checks enforce it.

```bash
npm install
npm run serve          # http://localhost:8080/kvblockdiff-primer/ with live reload
STRICT=1 npm run build # fail on any broken reference or undefined term
npm run check:words    # retired words
node scripts/check.mjs _site --shots   # headless check of every page, desktop + phone
```

## How the site is built

Content and presentation are kept apart. Writers touch only Markdown and data; the theme is separate.

```
content/      the prose: one Markdown file per page, one folder per Part
data/         the vocabulary: glossary terms, math symbols, Python notation, the reference settings, the Parts (YAML)
figures/      interactive figure code (one JS file per Part) and figure data
analysis/     Python scripts that reproduce the numbers behind figures
theme/        presentation: page layouts (Nunjucks), CSS, the client-side engine
lib/          the Markdown dialect (math, [[terms]], [[~notation]], ::: blocks) and the post-build linker
scripts/      headless checker, preview server, data validator, word checker
docs/         the catalog: project, style, site, tasks, papers, experiments
experiment_repos/  how to read the experiments repository behind Part VIII
```

The generator is [Eleventy](https://www.11ty.dev/) with a small Markdown dialect (`docs/site/dialect.md`).

## Deployment

The built site is published on the `gh-pages` branch by `.github/workflows/deploy.yml`: every push to
`main` runs a strict build and pushes the result to `gh-pages`, which GitHub Pages serves at
`https://www.borzov.ca/kvblockdiff-primer/`. See `docs/site/deploy.md`.
