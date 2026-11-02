# How to write a paper page

One page per paper, in `content/09-papers/`, id `papers-<slug>`. The reader may know nothing about the
paper; the page must be enough to understand what it does from zero, using only what this site has already
taught (Parts I–VIII). Every outside word is translated on first contact (`docs/style/terminology.md` §4.3).

## The sections, in this order

1. **Hook (no heading).** One paragraph: the situation the paper is in, as a concrete scene, and the one
   sentence of what it does.
2. **`## The idea, by example {#idea}`.** A worked toy in our vocabulary: a small tensor with its shape, the
   paper's trick applied to it step by step, with a listing or a table. The reader should be able to redo it
   by hand. Name the data path the paper lives on (bulk transfer, network fetch, GPU footprint, miss path).
3. **`## What they assume {#assume}`.** The background the paper treats as known in its introduction and
   setup. This is usually the most reliable part of a paper and often the most useful to us: which
   statistics of the orchard they take for granted, which number formats, which serving setup.
4. **`## What they show {#show}`.** Their results, each with how verifiable it is (reproduced by others?
   on which LLMs? lossy or lossless? which metric?). Quote numbers as "their measurement". Say where a result
   is hard to check and where their framing flatters it.
5. **`## What it says about our scenario {#ours}`.** Three sub-lists: *builds on* (what in Parts IV–VIII it
   supports), *conflicts with* (what it contradicts, and who we believe and why), *suggests* (ideas for a
   stage, a scenario, or an experiment for Part X). Every item links to the page it touches.
6. **`## Their words, ours {#words}`.** A table with the first column headed "their word" (the word checker
   skips these rows), the second column our term with its chip, the third a one-line note on where the
   meanings differ.
7. **`::: aside source Receipts`.** The citation (authors, venue, year, link), the sections or figures each
   number comes from.

Every section ends with a `::: takeaway`; every section has at least one flashcard.

## The trust rule

What a paper assumes in its introduction and background is more likely true than what it reports as a
result, and a result that is easy to verify (a formula, a count) is more trustworthy than one that is not (a
throughput on a private rig). Read papers as a source of ideas to try, not of facts to repeat. Where a
paper's claim bears on one of our hypotheses, say which hypothesis, and whether the claim is evidence or
only a hint.

## Adding a paper

1. Add the row to `docs/project/page-plan.md` under Part IX and the page file at the next free number.
2. New terms the paper needs go in `data/terms/papers.yaml` with `home: papers-<slug>`.
3. Add the paper to `content/11-reference/08-references.md` and, if it fits, to the prior-art map.
4. Run `npm run check:words content/09-papers/<file>.md` and a partial build (`ONLY=09-papers`).
