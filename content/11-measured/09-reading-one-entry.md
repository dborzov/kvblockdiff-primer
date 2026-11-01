---
title: Reading one entry
nav: Reading one entry
group: What was found
lede: 'The proposal expected random access to be the hard constraint and the dictionary share to be a real trade-off. Counted over 5.3 million cold decodes, the read budget cost nothing at 4096 tokens, the dictionary share stopped meaning anything for tree coders, and block size kept paying with no ceiling in sight.'
cards:
  - q: Counting the read budget for every single entry cold (5.3 million entries) instead of 8 sampled per block changed what?
    a: 4 of 19 winners and no headline; the sampled maxima had run up to 26 % low
    wrong: ["Every headline score", "Nothing at all", "Only the 16384-token row"]
    why: The worst entry reads 1.1–3.7 times the mean because of long chains in the tree, so a sample of 8 per block missed it. The best coders still fit 293.
    sec: the-budget-cost
  - q: What does the budget cost at its tightest setting, 137 entries' worth on layer entries?
    a: 0.0234 of ratio (coder 97 at 0.65980 fits; coder 121 at 0.63639 does not)
    wrong: ["Nothing", "About 0.1 of ratio", "It cannot be met at all"]
    why: No coder was tuned for its worst entry, so this is the most the rule costs today, not what it must cost.
    sec: the-budget-cost
  - q: Moving every entry of a tree coder into the dictionary took the dictionary share from 0.56 to 1.00. What did it cost?
    a: '+0.00004 of ratio'
    wrong: ["+0.44, the extra dictionary bytes", "−0.05, a large saving", "+0.0234"]
    why: A reference entry costs the same per element inside the dictionary as outside (5.84 against 5.85 bits). Where the bytes sit is bookkeeping; the real price is a pointer.
    sec: x-stopped-mattering
  - q: Which coder's block looks like the proposal's picture of a small dictionary and uniform deltas?
    a: The no-tree coder 129 (dictionary share 0.01–0.04, every delta about two thirds of an entry)
    wrong: ["Every tree coder", "Coder 121", "Coder 109, with every entry in the dictionary"]
    why: A tree coder's dictionary is half the block, made of the entries themselves, and about 80 % of its deltas are empty.
    sec: x-stopped-mattering
  - q: What did the primer expect to set a ceiling on block size, and did one appear?
    a: The drift of the data; no ceiling appeared up to 32768 tokens, and a bound says a whole sequence is better still
    wrong: ["The amortization rule 8w/b; it appeared at 4096", "The read budget; it appeared at 16384", "GPU memory; it appeared at 512"]
    why: The tree keeps gaining 0.010–0.020 per doubling from 16k to 32k. The right scope is the whole sequence, the primer's request scope.
    sec: block-size
---

The miss path reads one scattered entry at a time, so a stored format may not demand that the whole block be decoded to return one entry. That sentence is the proposal's loudest rule ([[#idea-data-layout]]), and the campaign turned it into a measured quantity, the [[read-budget]]: the most dictionary a cold decode of one entry may touch, in entries' worth. Everyone expected it to cost a lot. Then the human ruled that the budget must hold for every single entry, and the supervisor re-decoded 5.3 million entries cold to check.

This page reports what that cost, what the dictionary share turned out to mean once trees were involved, and the one knob that kept paying.

## What the budget cost {#the-budget-cost}

| [[screen]] | coder | ratio | reads: mean / p99 / worst entry |
|:--|:--|--:|:--|
| one head, 4096, budget 293 | 126 | 0.67408 | 68 / 123 / 171 |
| one layer, 4096, 293 | 121 | 0.63639 | 120 / 184 / 226 |
| one token, 4096, 293 | 116 | 0.63879 | 89 / 114 / 132 |
| one layer, 4096, 293, 5 sequences | 121 | 0.62970 | 120 / 182 / 247 |
| one token, 4096, 293, 5 sequences | 116 | 0.62910 | 90 / 120 / 136 |
| one layer, 16384, 293 | 120 | 0.61768 | 141 / 190 / 229 |
| one layer, 512, 293 | 113 | 0.68938 | 159 / 249 / 257 |
| one head, 512, 293 | 109 | 0.71884 | 51 / 142 / 187 |
| one layer, 4096, **137** | 97 | 0.65980 | 64 / 101 / 129 |

Reads are distinct dictionary bytes in entries' worth, counted cold, for every entry; every row is a [[verified-result]]. Read the last column against the budget. A budget of 293 for every entry cost nothing at 4096 tokens and above: the day's best coders all fit under it. Counting every entry instead of 8 sampled per block changed 4 of 19 winners and no headline. The sampled maxima had run up to 26 % low, because the worst entry reads 1.1–3.7 times the mean; [[reference-tree|trees]] cause that, since a few entries hang at the end of long chains.

The tight end is where it costs. At 137 on layer entries coder 121 does not fit (worst entry 226), and the best coder that does is 97 at 0.65980, **+0.0234**. No coder was tuned for its worst entry, so that is the most the rule costs today, not what it must cost.

::: figure fig-msr-reads msrReads
**Ratio against the worst entry's reads.** Each dot is one row of the table: horizontal axis, the reads of the worst entry in entries' worth (log scale); vertical axis, [[mdl-ratio]]; colour by [[entry-split]]. Vertical rules at the two budgets, 137 and 293. Hover a dot for the coder, the screen and the mean reads. Every point is verified with every entry counted cold. Data: `measured-reads.json`.
:::

::: theme access-pattern
The access pattern of the miss path (one entry, alone, cold) was written into the rules as a number. It changed the coders' *layout* far more than their *score*: bytes are laid along tree paths, so one decode reads one path.
:::

::: takeaway
- Every best coder of the day fits 293 reads for every entry at 4096 tokens and above; there the budget cost nothing.
- Counting every entry cold changed 4 of 19 winners and no headline; the worst entry reads 1.1–3.7 times the mean.
- At 137 on layer entries the rule costs 0.0234 today; nobody has yet tuned a coder for its worst entry.
:::

## The dictionary share stopped mattering {#x-stopped-mattering}

The proposal drew a block as a small [[dictionary]] plus one [[delta]] per entry, and expected a real trade-off between the two ([[#idea-size-relations]]). The tree coders erased it. Moving every entry of coder 91 into the dictionary (coder 101) took the dictionary share $\vw/\vb$ from 0.56 to 1.00 for **+0.00004** of ratio (12 blocks, in process, a block test), and coder 109, with every entry in the dictionary and every delta empty, is the incumbent on two screens. A [[reference-entry]] costs the same per element inside the dictionary as outside: 5.84 against 5.85 bits at L11. Where the bytes sit is bookkeeping. The real price of a tree coder is one pointer per entry.

The same fact from the delta side: about 80 % of coder 102's deltas are **empty**, because the entry sits in the dictionary as somebody's reference; the remaining deltas are 0.5–0.75 of a raw entry. Every good tree coder sits at a dictionary share of 0.43–0.54.

:::: compare Two pictures of one block
::: col The proposal's block
- A small dictionary, $\vw/\vb$ of a few per cent.
- One delta per entry, all of similar size, [[delta-ratio]] $\vrho$ well under 1.
- This is the **no-tree** coder's block: coder 129, dictionary share 0.01–0.04, every miss a delta of 0.66–0.69 of an entry ([[#measured-codebooks-and-rotations]]).
:::
::: col A tree coder's block
- A "dictionary" that is half the block, made of the entries themselves (the inner nodes of the tree).
- Four deltas in five are empty; the rest are 0.5–0.75 of an entry.
- The ratio is 0.636 instead of 0.686 on the same screen, and reading one entry means walking its path to the root, about 120 entries' worth.
:::
::::

For the primer's cost model this is the finding to carry forward: a tree coder's dictionary is most of the block, resident on the GPU, and the small-dictionary picture belongs to the no-tree coder alone.

::: theme side-info
The receiver's side information here is other entries of the same block rather than a fitted summary of them. That is why the dictionary share lost its meaning: an entry in the dictionary is still an entry, paid at the same 5.8 bits per element.
:::

::: takeaway
- Dictionary share 0.56 → 1.00 cost +0.00004; a reference entry costs the same inside or outside the dictionary. The price is a pointer.
- About 80 % of a tree coder's deltas are empty; good tree coders sit at a dictionary share of 0.43–0.54.
- The proposal's small-dictionary picture is the no-tree coder's; a tree coder's dictionary is half the block, resident.
:::

## Block size {#block-size}

| block size (tokens) | best verified, one layer's entry | coder |
|--:|--:|:--|
| 512 | 0.68938 | 113 |
| 4096 | 0.63639 | 121 |
| 16384 | 0.61768 | 120 |

Different screens, so the gaps are approximate: the shape is solid, the third decimal is not. Behind the shape, two mechanisms pull apart. The tree keeps gaining 0.010–0.020 per doubling from 16384 to 32768 tokens (one window of one sequence, three layers), while the net gain of [[linear-prediction]] has stopped by 32768, its rule being a fixed cost that is paid off by then. A nearest-neighbour bound puts a pool of a whole sequence 0.26–0.45 bit per element below a pool of 16384 tokens, with more than half of that arriving between 32768 and 65536 (one window; the bound allows cycles and charges no pointers). That is repeated text coming into view. At 16384 tokens everything other than the values themselves is about 2 % of the ratio: prediction 0.005–0.007 of raw, parents 0.003, classes, flags and tables about 0.003.

::: figure fig-msr-blocks msrBlocks
**Ratio against block size.** Horizontal axis, block size in tokens on a log scale (512 to 32768); vertical axis, [[mdl-ratio]]. Two lines: campaign C1 on layer 3, head 0 (0.7237 / 0.6731 / 0.6416 / 0.6294 at 512 / 4096 / 16384 / 32768, no read budget) and campaign C2 on one layer's entry with a read budget of 293 (0.68938 / 0.63639 / 0.61768). All points verified, each on its own screen. Dashed: the [[exact-model]] extrapolation to a whole sequence (about 0.57), a direction and not a measurement. Data: `measured-ladders.json`.
:::

The primer's [[#homework-amortization-rule]] expected two limits: the dictionary's $8\vw/\vb$ puts a floor under the block size, and the drift of the data a ceiling above it. The floor is real; it is why the 512-token row learns its rule instead of storing it ([[#measured-time-and-bits]]). The ceiling never appeared in this text up to 32768 tokens, and the bound says the biggest jump lies just past where the campaign stopped. One caution: the text was coding-agent transcripts, which repeat themselves a great deal, and a different kind of text could drift faster. The direction is still clear. The right block is the whole sequence, which in the primer's words is [[scope-request]].

::: theme amortize
Block size is the one knob that costs nothing to turn. A bigger block is free to ask for, holds more repeats to point at, and spreads the prediction rule thinner. Every doubling paid, and the campaign ran out of window before the data ran out of repeats.
:::

::: aside source Receipts
- The every-entry table: env-t0009 to t0013 and env-t0088 to t0097 (all isolated, every entry counted cold); the re-count of 19 tracks: env retro-review and `reads-recheck.json`, which also give the worst-entry ratios and the 26 % shortfall. 137 on layer entries: env-t0089 (coder 97) against env-t0096 (coder 121).
- Dictionary share 0.56 → 1.00 for +0.00004, and 5.84 against 5.85 bits: r6 iter-2-2 (12 blocks, in process). Coder 109 at a dictionary share of 1: r6-t0004, env-t0009. Empty deltas: r24 and r25 delta-size analyses (one block per layer); 121's delta sizes in env-t0096.
- Block sizes: env-t0010 (113), env-t0096 (121), env-t0097 (120). Per-doubling gains and the whole-sequence pool: r19 iter-1-1 to 1-3 (one window). The 2 % at 16k: r19 iter-1-1 (36 blocks). C1 line: r1-t0045, r1-t0042, r4-t0008.
- Notes: `notes/03-structure-and-method.md` §5, `notes/01-headline-numbers-and-coders.md` §A, §F; spec §1.9.
:::

::: takeaway
- 0.689 / 0.636 / 0.618 at 512 / 4096 / 16384 tokens; the shape is solid, the third decimal is not.
- The tree keeps gaining 0.010–0.020 per doubling from 16k to 32k while prediction has saturated; a whole-sequence pool is 0.26–0.45 bit better than 16k (a bound, one window).
- No drift ceiling appeared. The right scope is the whole sequence: the primer's request scope.
:::
