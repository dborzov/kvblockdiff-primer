# AGENTS.md

Guidance for AI agents (and people) working in this repository. Read this file, then only the docs your
task needs: the catalog in `docs/README.md` maps tasks to short, specific documents. Do not load the whole
`docs/` tree.

## What this repository is

The source of truth for the context of **kvblockdiff**, a research project on lossless dictionary coding
of the keys and values a sparse-attention LLM keeps in host memory (its *orchard*), published as a
static site at https://www.borzov.ca/kvblockdiff-primer/. The site is a primer (Parts I–III), a clean
statement of the compression problem (Part IV), a catalogue of compressor stages (V), the serving
application (VI), the hypotheses (VII), the measurements of two autonomous research campaigns (VIII),
critical paper readings (IX), the research plan (X), the pick traces measured on a stand-in LLM (XI) and a
reference (XII). One-screen overview:
`docs/project/overview.md`.

## The four things every task depends on

0. **The reasoning comes first.** `docs/style/philosophy.md` is the human's intent behind every rule
   below, written so that an agent can act in cases the rules do not cover; `docs/style/pitfalls.md`
   lists the confusions this project is prone to; `docs/style/writing.md` says how the prose must argue
   (facts before conclusions, simple sentences, no slogans or metaphors). Read them before any task that
   touches wording.

1. **The vocabulary is a rule, not a style.** `docs/style/terminology.md` defines every project word
   (orchard, furrow, pick, stretch, slice, cherry, cherry shape, punnet, dictionary, delta, leash,
   compressor, stage, …) and bans the overloaded ones (model, channel, entry, block, cache, coder,
   request, thread, …). `npm run check:words` enforces it on `content/` and `data/`.
2. **Every term is bundled with a Python form.** `docs/project/notation.md` is the canonical set of
   listings and index names (`v[token_pos_id, layer_id, head_id, elem_id]`); pages quote them.
3. **The compression scenario is the problem.** `docs/project/scenario.md` is the dense statement
   (sender/receiver, the contract, the MDL ratio, the leash); Part IV teaches it; everything else must
   agree with it.

## Commands

```bash
npm install                                   # once (Node ≥ 20)
npm run build                                 # full site into _site/; linker report in .cache/
STRICT=1 npm run build                        # fail on broken references or undefined terms (CI does this)
npm run serve                                 # live preview at http://localhost:8080/kvblockdiff-primer/
node scripts/validate-data.mjs                # the YAML in data/ (terms, symbols, notation, settings)
npm run check:words [paths…]                  # retired words; must be clean before a commit touches content
npm run check:tropes [paths…]                 # advisory: patterns of poor prose (docs/style/writing.md §3)
ONLY=05-toolbox npx @11ty/eleventy --output=.cache/site-toolbox   # build one Part; linker warns on refs outside it
node scripts/check.mjs _site --pages toolbox/the-bill --shots     # headless check of pages + figures, screenshots
python3 scripts/fix-frontmatter-quotes.py content/<dir>/*.md       # quote YAML scalars containing ': '
```

Details and what each check reports: `docs/site/build.md`.

## Where things live

| path | what | who edits |
|---|---|---|
| `content/<NN-part>/<NN-page>.md` | the prose, one page per file; page id = `<slug>-<file name without number>` | writers |
| `data/terms/*.yaml`, `data/symbols/*.yaml`, `data/notation/*.yaml` | glossary, math symbols, Python notation (hover reminders) | writers, in their own Part file |
| `data/parts.yaml`, `data/settings.yaml`, `data/themes.yaml`, `data/banned-words.yaml` | the Parts, the two reference settings (the Pin, the Bench), running themes, the retired words | orchestrator |
| `figures/<part>.js` (+ `.css`), `figures/data/*.json` | interactive figures and their data | figure author |
| `analysis/*.py` | scripts that produce figure data from the experiment ledgers | figure author |
| `theme/`, `lib/`, `eleventy.config.js`, `scripts/` | layouts, CSS, the client engine, the Markdown dialect, the linker, checks | maintainers only |
| `experiment_repos/kv-compress-roofline/` | how to read the experiments repository (notes written in the old vocabulary; translation in `docs/style/terminology.md` §4.2) | read-only |
| `docs/` | the catalog (`docs/README.md`) | everyone, by task |

## Rules that are easy to miss

- Define a term once (`[[=id]]` or `::: define id`) on its `home` page; mention it elsewhere with
  `[[id]]`. Parts are in dependency order; the linker warns when a term is used before its definition.
- Never add a term to `data/terms/core.yaml`; add it to `data/terms/<part-slug>.yaml`. Grep first.
- Page ids are referenced site-wide (`[[#id]]`) and by the experiment notes; renaming a file renames its
  id. The page plan (`docs/project/page-plan.md`) is the list; add a row when you add a page.
- Numbers come with receipts (`::: aside source`); campaign numbers carry their grade (verified, quick,
  code-length estimate, bound). The pinned numbers are in `docs/project/numbers.md`.
- Figures: colours only via CSS variables; every UI label in the site's vocabulary; `check.mjs` must
  report no failed builder.
- Do not edit `.github/workflows/deploy.yml` from an agent session: pushes that touch it are rejected
  without the `workflow` OAuth scope.
- The old site (before the 2026-11 rework) lives in git history; `docs/style/terminology.md` §4.1 maps its
  words to ours. Do not reintroduce them.
