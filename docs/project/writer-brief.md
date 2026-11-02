# Brief for a Part writer

You are rewriting one Part of this site. Everything you need is in the repository; read in this order
before writing a word:

1. `docs/style/philosophy.md` and `docs/style/pitfalls.md`: the reasoning behind the rules and the confusions to avoid;
   `docs/style/writing.md`: how the prose argues (facts before conclusions, simple sentences, the tropes to avoid).
2. `docs/style/terminology.md`: the vocabulary and the banned words. Non-negotiable.
2. `docs/style/voice.md`: how a page reads, and the done-checklist.
3. `docs/project/notation.md`: the Python forms; quote these listings, never invent an axis order.
4. `docs/project/scenario.md`: the problem every page must agree with.
5. `docs/project/page-plan.md`: your Part's rows (ids, titles, scope, defines) and every other page id you
   may link to with `[[#id]]`.
6. `docs/AUTHORING.md` §3–4: the Markdown dialect (`[[term]]`, `[[=term]]`, `[[~notation]]`, `[[@key]]`,
   `::: blocks`, math macros, flashcards, the YAML pitfalls).
7. `data/terms/core.yaml`, `data/symbols/core.yaml`, `data/notation/core.yaml`: what exists. Grep before you
   add.
8. `content/04-scenario/*.md`: the exemplar Part. Match its density, its definition boxes, its use of
   Python forms and chips, its takeaways and cards.

Source material: the old pages are snapshotted in `.cache/old-content/<old folder>/` (the page plan names
the old pages each new page reworks). Reuse their figures, numbers, receipts and examples. Never reuse
their words for the retired terms; retell in the new vocabulary. Old numbers that depend on the old
definitions (a 1024-element "entry") are corrected, not copied.

## Rules

- **Ids and files.** Create exactly the files of the page plan, in your Part's folder, numbered as listed.
  Page id = `<slug>-<file name without number>`. Do not rename, renumber or add pages without adding the
  row to `docs/project/page-plan.md`.
- **Defines.** Define exactly the terms the plan assigns to each page, once, with `[[=id]]` or
  `::: define id`. Never define a term whose home is elsewhere; mention it with `[[id]]`.
- **New terms, symbols, notation.** Only in `data/terms/<slug>.yaml`, `data/symbols/<slug>.yaml`,
  `data/notation/<slug>.yaml` (create the file), with `home:` on one of your pages, following the field
  format of the core files. Grep core first; never create a second id for an existing idea. Brand terms
  (emblem + colour + nick) are not yours to add; propose them in your report.
- **Cross-references.** `[[#id]]` to any page id in the plan, `[[#id/section-id]]` to a section. Pages in
  other Parts are being written at the same time; link to their ids as planned. Your partial build will warn
  "outside this partial build" for those; that is expected. An id not in the plan is a bug.
- **Numbers.** Every number traces to the old page's receipt, to `docs/project/scenario.md` §9, or to
  `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md`; keep `::: aside source Receipts` blocks (the word
  checker skips them, so ledger track names may be quoted there verbatim).
- **Figures.** Reference existing builders by name (`::: figure fig-<yourprefix>-<x> <builder>`); figure
  ids must be unique site-wide, so prefix them with your slug. Do not edit `figures/*.js`. If a builder's UI
  labels use retired words, or you need a new builder, write what you need in
  `docs/plans/figure-notes-<slug>.md` (builder, file, what label says now, what it should say; or a full
  spec for a new one). A figures task will do the JS afterwards.
- **Front matter.** Title, nav, lede, group (sidebar sub-heading), cards (one per section at least, with
  `sec:`). Quote any YAML scalar containing `: ` (run `python3 scripts/fix-frontmatter-quotes.py
  content/<dir>/*.md` before building).
- **Do not touch** other Parts' folders, `content/index.md`, the core data files, `lib/`, `theme/`,
  `figures/`, `eleventy.config.js`, `docs/` (except your figure-notes file and a page-plan row you add).
  Do not commit; the orchestrator commits.

## Checks before you report

```bash
python3 scripts/fix-frontmatter-quotes.py content/<dir>/*.md
node scripts/check-words.mjs content/<dir> data/terms/<slug>.yaml      # must print "no hits"
npm run check:tropes content/<dir>                                      # advisory; read every hit and fix the real ones
node scripts/validate-data.mjs                                          # 0 problems
ONLY=<dir> npx @11ty/eleventy --output=.cache/site-<slug>               # must finish; read the report:
grep -v "outside this partial\|used but never defined" .cache/linker-report-site-<slug>.txt
node scripts/check.mjs .cache/site-<slug> --pages <slug>/<page>,<slug>/<page> --shots --out .cache/shots-<slug>
```

The linker report must show 0 errors. Warnings allowed: references outside the partial build, terms
defined in other Parts ("used but never defined", "used before its definition" when the defining page is
in an earlier Part). A warning about a term used before its definition *inside your own Part* is a bug:
reorder or rephrase. `check.mjs` reports figure builders that threw; a builder that is "missing" because it
lives in a figure file your Part does not load is a `figs:` problem in `data/parts.yaml`: report it.

## Report

End with: the pages written (ids), the terms/symbols/notation you added, the figure notes you left,
anything in the plan you could not do and why, and any proposed brand terms. Numbers over adjectives.
