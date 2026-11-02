# Page anatomy

```markdown
---
title: Surprise                       # the h1; short
nav: Surprise                         # optional shorter sidebar title
lede: One or two sentences on what this page is about. May use $math$ and [[terms]].
group: Information                    # optional sidebar sub-heading for a run of pages
figs: [school-info]                   # optional: figure files to load (default: the Part's own)
vendor: [pako.min.js]                 # optional: extra vendored scripts from theme/assets/vendor
cards:
  - q: 'What is the surprisal of an outcome with probability $\vp = 1/8$?'
    a: 3 bits
    wrong: ["8 bits", "1/8 of a bit", "0.125 bits"]
    why: 'Surprisal is $-\log_2 \vp$, and $-\log_2(1/8) = 3$.'
    sec: surprisal                    # the id of the ## section the card belongs to
---

An opening hook paragraph (no heading): a concrete situation, a toy, a surprising number.

## First idea {#first-idea}
…example, then the rule, then the example again with the rule in hand…
::: takeaway
- two to four bullets
:::

## Second idea {#second-idea}
…
::: takeaway
- …
:::
```

Rules of thumb (the reasons are in `docs/style/house-style.md`):

- 500–1200 words, one idea, one to three `##` sections, each with an id, each ending in a `::: takeaway`.
- At least one figure, table, worked example or code listing; a listing on real shapes wherever a project word is introduced.
- At least one flashcard per section; three plausible decoys; a one-line `why`. Card ids never change once published (`docs/site/flashcards.md`).
- Every outside number has a receipt: a `::: aside source Receipts` at the end of the page naming the trial id, paper section or script.
- Pages are ordered by their numeric file prefix inside the Part folder; new pages are appended at the next free number, never renumbered (`docs/site/page-plan.md`).
- A page that defines a term is that term's `home` in `data/terms/` and contains its one `[[=id]]`.
