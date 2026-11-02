# AGENTS.md

Guidance for AI agents (and people) working in this repository. Read this file, then open only the
docs your task needs: the catalog in [`docs/README.md`](docs/README.md) maps tasks to short, focused docs.

## What this repository is

The source of a static site, **the kv-blockdiff primer** (https://www.borzov.ca/kvblockdiff-primer/): the
source of truth for the context, vocabulary, arguments, measurements and plans of the **kv-blockdiff**
research project (lossless dictionary + delta coding of a language model's KV store, on the miss path of
sparse-attention decoding). It is written for two readers at once, a human and an AI agent, and it
introduces every project word through code on real shapes before using it. One-page summary of the
project: [`docs/project/overview.md`](docs/project/overview.md).

Content and presentation are separate. Writers touch `content/` (Markdown), `data/` (YAML vocabulary),
`figures/` (figure code and data) and `analysis/` (scripts that produce figure data). `theme/` and `lib/`
are the engine; change them only when a task is about the engine.

## Commands

```bash
npm ci                                  # once
npm run build                           # Eleventy build into _site/ (linker report in .cache/)
STRICT=1 npm run build                  # fail on any broken reference or undefined term; CI runs this
npm run serve                           # live preview at http://localhost:8080/kvblockdiff-primer/
node scripts/validate-data.mjs          # check data/*.yaml without a full build
node scripts/check.mjs _site --shots    # headless check of every page, desktop + phone, screenshots in .cache/shots
node scripts/check.mjs _site --pages school/entropy,idea/mapping --shots   # a few pages only
ONLY=04-idea npx @11ty/eleventy --output=/tmp/site-idea      # build one Part (refs out of the Part warn only)
```

There is no test suite beyond these: the strict build and the checker are the tests. Run both before
committing content. Details and what the warnings mean: [`docs/site/build-and-check.md`](docs/site/build-and-check.md).

## The rules that bite

1. **Vocabulary is law.** Every project word has one meaning, one home page, one definition
   (`[[=id]]` or `::: define id`, exactly once on the whole site) and lives in `data/terms/*.yaml`; every
   math symbol likewise in `data/symbols/*.yaml` (macro `\v<id>`). Before using or coining a word, read
   [`docs/project/terminology.md`](docs/project/terminology.md) and the banned-words list in
   [`docs/style/voice-and-words.md`](docs/style/voice-and-words.md). Never say "model"; never quote a
   compression figure as "×".
2. **Define before use, through code.** A term is introduced where it is first needed, with a Python
   expression on the Bench's real tensor shapes, and that expression is reused later instead of prose
   paraphrase. Notation rules: [`docs/project/notation.md`](docs/project/notation.md).
3. **Renaming a file renames its page id** (`<part slug>-<file name without the number>`), which every
   `[[#id]]` reference uses. Grep before renaming. Flashcard ids (`page-id/sec`) must never change once published.
4. **Numbers are quoted for a frozen rig** (the Pin or the Bench). Setting-dependent numbers in new
   prose go through `[[@key]]`; never mix a live number with a typed one in one computation.
   [`docs/project/rigs.md`](docs/project/rigs.md).
5. **Every number in prose matches its figure and its receipt.** Figure data comes from
   `analysis/` scripts or the experiments repo notes; cite trial ids in a `::: aside source Receipts`.
   [`docs/workflows/sync-numbers.md`](docs/workflows/sync-numbers.md).
6. **Scepticism is house style.** Mark assumptions, illustrative numbers and unverified results as such;
   retell papers in our words and say where we are not convinced. [`docs/style/papers.md`](docs/style/papers.md).
7. **Commit in Git** with descriptive messages; the site deploys from `main` by GitHub Actions
   (`.github/workflows/deploy.yml`) after a strict build.

## Maintain as you go

Whatever the task, leave the project's shared context better than you found it: add or fix glossary
entries, flashcards and cross-references on pages you touch, update the catalog in `docs/` when you add a
doc or a workflow, and record any new convention in the doc that owns it (not in a commit message).
The full list of standing duties: [`docs/workflows/maintain.md`](docs/workflows/maintain.md).

## Where to start, by task

| task | read |
|---|---|
| understand the project before any writing | `docs/project/overview.md`, then `docs/project/state-of-knowledge.md` |
| write or edit a page | `docs/workflows/new-page.md` (+ `docs/style/house-style.md`, `docs/site/markdown-dialect.md`) |
| add a paper review page | `docs/workflows/new-paper-page.md`, `docs/style/papers.md` |
| add or rename a term or symbol | `docs/workflows/new-term-or-symbol.md`, `docs/workflows/rename-term.md` |
| an interactive figure | `docs/site/figures.md` |
| flashcards | `docs/site/flashcards.md` |
| check or update a measured number | `docs/workflows/sync-numbers.md`, `experiment_repos/kv-compress-roofline/README.md` |
| the engine (`lib/`, `theme/`) | `docs/site/repo-layout.md`, then the file headers |
| the current rework of the vocabulary | `docs/plans/terminology-rework.md` |
