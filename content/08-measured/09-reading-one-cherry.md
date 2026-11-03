---
title: Reading one cherry
nav: Reading one cherry
group: What was found
lede: 'The scenario expected the leash to be the hard constraint and the dictionary share to be a real trade-off. Counted over 5.3 million cold decodes, the leash cost nothing at a stretch of 4096, the dictionary share stopped meaning anything for tree compressors, and stretch length kept paying with no ceiling in sight.'
cards:
  - q: Counting the leash for every single cherry cold (5.3 million cherries) instead of 8 sampled per punnet changed what?
    a: 4 of 19 winners and no headline; the sampled maxima had run up to 26 % low
    wrong: ["Every headline score", "Nothing at all", "Only the 16 384 row"]
    why: The worst cherry reads 1.1–3.7 times the mean because of long chains in the tree, so a sample of 8 per punnet missed it. The best compressors still fit 293.
    sec: the-leash-cost
  - q: What does the leash cost at its tightest setting, 137 cherries' worth on `v[t, l, :, :]` cherries?
    a: 0.0234 of ratio (compressor 97 at 0.65980 fits; compressor 121 at 0.63639 does not)
    wrong: ["Nothing", "About 0.1 of ratio", "It cannot be met at all"]
    why: No compressor was tuned for its worst cherry, so this is the most the rule costs today, not what it must cost.
    sec: the-leash-cost
  - q: Moving every cherry of a tree compressor into the dictionary, so that every delta was empty, changed the ratio by how much?
    a: '+0.00004 of ratio'
    wrong: ["+0.44, the extra dictionary bytes", "−0.05, a large saving", "+0.0234"]
    why: A reference cherry costs the same per element inside the dictionary as outside (5.84 against 5.85 bits). Where the bytes sit does not change the sum of the two shares; what a tree compressor adds per cherry is one pointer.
    sec: x-stopped-mattering
  - q: Which compressor's punnet looks like the application's picture of a small dictionary and uniform deltas?
    a: The no-tree compressor 129 (dictionary share 0.01–0.04, every delta about two thirds of a cherry)
    wrong: ["Every tree compressor", "Compressor 121", "Compressor 109, with every cherry in the dictionary"]
    why: A tree compressor's dictionary is half the punnet, made of the cherries themselves, and about 80 % of its deltas are empty.
    sec: x-stopped-mattering
  - q: What did the toolbox expect to set a ceiling on stretch length, and did one appear?
    a: The drift of the data; no ceiling appeared up to 32 768 tokens, and a bound says a whole sequence is better still
    wrong: ["The amortization rule 8w/b; it appeared at 4096", "The leash; it appeared at 16 384", "GPU memory; it appeared at 512"]
    why: The tree keeps gaining 0.010–0.020 per doubling from 16K to 32K. The right scope is the whole sequence, sequence scope.
    sec: stretch-length
---

The receiver asks for one scattered cherry at a time, so a stored format may not demand that the whole punnet be decoded to return one cherry. That sentence is the scenario's loudest rule, and the [[leash]] is its number ([[#scenario-the-leash]]): the most dictionary a cold decode of one cherry may touch, in cherries' worth, measured as that cherry's [[reads]]. Everyone expected it to cost a lot. Then the human ruled that the leash must hold for every single cherry, and the supervisor re-decoded 5.3 million cherries cold to check.

This page reports what that cost, what the dictionary share turned out to mean once trees were involved, and the one knob that kept paying.

## What the leash cost {#the-leash-cost}

| scenario (V · all, screen) | compressor | ratio | reads: mean / p99 / worst cherry |
|:--|:--|--:|:--|
| cherry `v[t, l, h, :]` · stretch 4096 · leash 293 | 126 | 0.67408 | 68 / 123 / 171 |
| cherry `v[t, l, :, :]` · 4096 · 293 | 121 | 0.63639 | 120 / 184 / 226 |
| cherry `v[t, :, :, :]` · 4096 · 293 | 116 | 0.63879 | 89 / 114 / 132 |
| cherry `v[t, l, :, :]` · 4096 · 293 · 5 sequences | 121 | 0.62970 | 120 / 182 / 247 |
| cherry `v[t, :, :, :]` · 4096 · 293 · 5 sequences | 116 | 0.62910 | 90 / 120 / 136 |
| cherry `v[t, l, :, :]` · 16 384 · 293 | 120 | 0.61768 | 141 / 190 / 229 |
| cherry `v[t, l, :, :]` · 512 · 293 | 113 | 0.68938 | 159 / 249 / 257 |
| cherry `v[t, l, h, :]` · 512 · 293 | 109 | 0.71884 | 51 / 142 / 187 |
| cherry `v[t, l, :, :]` · 4096 · **137** | 97 | 0.65980 | 64 / 101 / 129 |

Reads are distinct dictionary bytes in cherries' worth, counted cold, for every cherry; every row is a [[verified-result]]. Read the last column against the leash. A leash of 293 for every cherry cost nothing at a stretch of 4096 and above: the day's best compressors all fit under it. Counting every cherry instead of 8 sampled per punnet changed 4 of 19 winners and no headline. The sampled maxima had run up to 26 % low, because the worst cherry reads 1.1–3.7 times the mean; [[reference-tree|trees]] cause that, since a few cherries hang at the end of long chains.

The tight end is where it costs. At 137 on `v[t, l, :, :]` cherries compressor 121 does not fit (worst cherry 226), and the best compressor that does is 97 at 0.65980, **+0.0234**. No compressor was tuned for its worst cherry, so that is the most the rule costs today, not what it must cost.

::: figure fig-measured-reads msrReads
**Ratio against the worst cherry's reads.** Each dot is one row of the table: horizontal axis, the reads of the worst cherry in cherries' worth (log scale); vertical axis, [[mdl-ratio]]; colour by cherry shape. Vertical rules at the two leashes, 137 and 293. Hover a dot for the compressor, the screen and the mean reads. Every point is verified with every cherry counted cold. Data: `measured-reads.json`.
:::

::: theme access-pattern
The access pattern of the serving system's miss path (one cherry, alone, cold) was written into the rules as a number. It changed the compressors' *layout* far more than their *score*: bytes are laid along tree paths, so one decode reads one path.
:::

::: takeaway
- Every best compressor of the day fits 293 reads for every cherry at a stretch of 4096 and above; there the leash cost nothing.
- Counting every cherry cold changed 4 of 19 winners and no headline; the worst cherry reads 1.1–3.7 times the mean.
- At 137 on `v[t, l, :, :]` cherries the rule costs 0.0234 today; nobody has yet tuned a compressor for its worst cherry.
:::

## The dictionary share stopped mattering {#x-stopped-mattering}

The application drew a punnet as a small [[dictionary]] plus one [[delta]] per cherry, and expected a real trade-off between the two ([[#app-sizes]]). The tree compressors erased it. Moving every cherry of compressor 91 into the dictionary (compressor 101) left every delta empty and every coded byte filed as dictionary, for **+0.00004** of ratio (12 punnets, in process, encoder bytes; the [[dictionary-share|dictionary share]] $\vxshare$ went from 0.56 to the whole coded size, about 0.69), and compressor 109, with every cherry in the dictionary and every delta empty, is the incumbent on two screens. A [[reference-cherry]] costs the same per element inside the dictionary as outside: 5.84 against 5.85 bits at KV layer 2 (the LLM's layer 11). Where the bytes sit does not change the sum of the two shares, and neither share is a score on its own. What a tree compressor adds per cherry is one pointer.

The same fact from the delta side: about 80 % of compressor 102's deltas are **empty**, because the cherry sits in the dictionary as somebody's reference; the remaining deltas are 0.5–0.75 of a raw cherry. Every good tree compressor sits at a dictionary share of 0.43–0.54.

:::: compare Two pictures of one punnet
::: col The application's punnet
- A small dictionary, $\vxshare$ of a few per cent.
- One delta per cherry, all of similar size, [[delta-share|delta share]] $\vrho$ well under 1.
- This is the **no-tree** compressor's punnet: compressor 129, dictionary share 0.01–0.04, every miss a delta of 0.66–0.69 of a cherry ([[#measured-codebooks-and-rotations]]).
:::
::: col A tree compressor's punnet
- A "dictionary" that is half the punnet, made of the cherries themselves (the inner nodes of the tree).
- Four deltas in five are empty; the rest are 0.5–0.75 of a cherry.
- The ratio is 0.636 instead of 0.686 on the same screen, and reading one cherry means walking its path to the root, about 120 cherries' worth.
:::
::::

For the application's cost arithmetic this is the finding to carry forward: a tree compressor's dictionary is most of the punnet, resident on the GPU, and the small-dictionary picture belongs to the no-tree compressor alone ([[#measured-what-it-means]]).

::: theme side-info
The receiver's side information here is other cherries of the same punnet rather than a fitted summary of them. That is why the dictionary share lost its meaning: a cherry in the dictionary is still a cherry, paid at the same 5.8 bits per element.
:::

::: takeaway
- Filing every coded byte as dictionary (every delta empty) cost +0.00004; a reference cherry costs the same inside or outside the dictionary. The price is a pointer.
- About 80 % of a tree compressor's deltas are empty; good tree compressors sit at a dictionary share of 0.43–0.54.
- The application's small-dictionary picture is the no-tree compressor's; a tree compressor's dictionary is half the punnet, resident.
:::

## Stretch length {#stretch-length}

| stretch length (tokens) | best verified, cherry `v[t, l, :, :]` | compressor |
|--:|--:|:--|
| 512 | 0.68938 | 113 |
| 4096 | 0.63639 | 121 |
| 16 384 | 0.61768 | 120 |

Different screens, so the gaps are approximate: the shape is solid, the third decimal is not. Behind the shape, two mechanisms pull apart. The tree keeps gaining 0.010–0.020 per doubling from 16 384 to 32 768 tokens (one window of one sequence, three KV layers), while the net gain of [[linear-prediction]] has stopped by 32 768, its rule being a fixed cost that is paid off by then. A nearest-neighbour bound puts a punnet of a whole sequence 0.26–0.45 bit per element below a punnet of 16 384 tokens, with more than half of that arriving between 32 768 and 65 536 (one window; the bound allows cycles and charges no pointers). That is repeated text coming into view. At 16 384 everything other than the values themselves is about 2 % of the ratio: prediction 0.005–0.007 of raw, parents 0.003, classes, flags and tables about 0.003.

::: figure fig-measured-stretches msrBlocks
**Ratio against stretch length.** Horizontal axis, stretch length in tokens on a log scale (512 to 32 768); vertical axis, [[mdl-ratio]]. Two lines: campaign C1 on KV layer 0, head 0, cherry `v[t, 0, 0, :]` (0.7237 / 0.6731 / 0.6416 / 0.6294 at 512 / 4096 / 16 384 / 32 768, no leash) and campaign C2 on cherry `v[t, l, :, :]` with a leash of 293 (0.68938 / 0.63639 / 0.61768). All points verified, each on its own screen. Dashed: the [[code-length-estimate|code-length]] extrapolation to a whole sequence (about 0.57), a direction and not a measurement. Data: `measured-ladders.json`.
:::

The [[amortization]] rule of [[#school-amortization]] expected two limits: the dictionary's $8\vw/\vb$ puts a floor under the stretch length, and the drift of the data a ceiling above it. The floor is real; it is why the 512 row learns its rule instead of storing it ([[#measured-time-and-bits]]). The ceiling never appeared in this text up to 32 768 tokens, and the bound says the biggest jump lies just past where the campaign stopped. One caution: the text was coding-agent transcripts, which repeat themselves a great deal, and a different kind of text could drift faster. The direction is still clear. The right stretch is the whole sequence, which in the scenario's words is [[scope-sequence|sequence scope]] ([[#scenario-scope]]).

::: theme amortize
Stretch length is the one knob that costs nothing to turn. A longer stretch is free to ask for, holds more repeats to point at, and spreads the prediction rule thinner. Every doubling paid, and the campaign ran out of window before the data ran out of repeats.
:::

::: aside source Receipts
- The every-entry table: env-t0009 to t0013 and env-t0088 to t0097 (all isolated, every entry counted cold); the re-count of 19 tracks: env retro-review and `reads-recheck.json`, which also give the worst-entry ratios and the 26 % shortfall. 137 on layer entries: env-t0089 (coder 97) against env-t0096 (coder 121).
- Every delta empty for +0.00004, and 5.84 against 5.85 bits: r6 iter-2-2 (12 blocks, in process; that page's "x = 1.00" is the share of coded bytes, the ledger's dictionary share is bytes over raw, so coder 109 sits at a share equal to its ratio). Coder 109 with every delta empty: r6-t0004, env-t0009. Empty deltas: r24 and r25 delta-size analyses (one block per layer); 121's delta sizes in env-t0096.
- Block sizes: env-t0010 (113), env-t0096 (121), env-t0097 (120). Per-doubling gains and the whole-sequence pool: r19 iter-1-1 to 1-3 (one window). The 2 % at 16k: r19 iter-1-1 (36 blocks). C1 line: r1-t0045, r1-t0042, r4-t0008.
- Notes: `notes/03-structure-and-method.md` §5, `notes/01-headline-numbers-and-coders.md` §A, §F; spec §1.9.
:::

::: takeaway
- 0.689 / 0.636 / 0.618 at stretches of 512 / 4096 / 16 384 tokens; the shape is solid, the third decimal is not.
- The tree keeps gaining 0.010–0.020 per doubling from 16K to 32K while prediction has saturated; a whole-sequence punnet is 0.26–0.45 bit better than 16K (a bound, one window).
- No drift ceiling appeared. The right scope is the whole sequence: sequence scope.
:::
