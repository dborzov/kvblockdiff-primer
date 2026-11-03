---
title: 'Cutting the orchard: cherry shapes compared'
nav: Cutting the orchard
lede: 'The values of one sequence are one box of numbers. Before anything is compressed, someone decides what one cherry is: one head, one KV layer, one token, or several tokens. The second campaign turned the cherry shape into a measuring instrument, and it said: join the two heads, join the layers if you like, never join adjacent tokens.'
group: What was found
cards:
  - q: The layer screen scored 0.6449 and the token screen 0.6461. Why does that not rank the two cherry shapes?
    a: Each screen samples its own punnets, and what makes a punnet hard is its text; on the same window the `v[t, :, :, :]` cherry is better by 0.0043
    wrong: ["It does: v[t, l, :, :] cherries are better by 0.0012", "Because the token screen used a different leash", "Because screens are not verified"]
    why: The token screen happened to contain slightly harder text. Only a same-window comparison, the same values cut two ways, ranks cherry shapes.
    sec: heads
  - q: The same element position in the two heads of a KV layer has a cosine of about 0.05. Do the heads share information?
    a: Yes, 0.85 bit per element raw; the distances between tokens correlate up to 0.92 across heads, so they are two views of one vector
    wrong: ["No: cosine 0.05 means independent", "Only in KV layer 0", "Only after a rotation aligns them"]
    why: Copying head 0 onto head 1 is worse than guessing the mean, yet joining the heads saves 0.0322 on 20 of 20 sequences. Similarity scores are not bits; that is stereo similarity.
    sec: heads
  - q: After the heads, what did joining all six KV layers into one cherry save, and how do the layers group?
    a: A further 0.0043 of ratio (20 of 20); KV layers 0, 4, 5 behave alike and 1, 2, 3 behave alike, so by kind, not by nearness
    wrong: ["A further 0.03; adjacent layers group together", "Nothing at all", "0.0043, and only adjacent layers may be joined"]
    why: Grouping KV layers 0+4+5 and 1+2+3 beat grouping 0+1+2 and 3+4+5 by 0.0015 on 7 of 7 sequences, although the second joins neighbours.
    sec: layers
  - q: What is the verdict on upstairs similarity?
    a: Small, and not by adjacency; given everything else, adjacent KV layers share 0.03 to 0.08 bit per element, distant ones about 0.01
    wrong: ["Strong: one dictionary can serve four adjacent layers", "Zero: layers are independent", "Unmeasured"]
    why: The floor directly above is barely more alike than a floor far away. Floors come in two kinds instead.
    sec: layers
  - q: Like for like, what did joining 2 and 4 adjacent tokens into one cherry cost?
    a: +0.037 and +0.063 of ratio against the `v[t, l, :, :]` cherry
    wrong: ["−0.037 and −0.063: a saving", "Nothing: tokens share 0.29 bit", "It could not be measured under a leash"]
    why: The best trick is one pointer per token to an earlier similar token; a pair of tokens rarely has a good earlier pair to point at.
    sec: tokens
  - q: Where do the reference links point at KV layers 0, 4 and 5 (the LLM's layers 3, 19 and 23)?
    a: Mostly far away, to repeats of the same token; only 9, 7 and 12 % of links stay within 8 tokens, against 37 to 47 % in the middle layers
    wrong: ["To the adjacent token, as fallen-apple similarity predicted", "Within 8 tokens for about half the cherries, at every layer", "To the punnet's first cherry"]
    why: Middle layers build chains along the text; the first and last layers build hubs of far-apart repeats. The right axis is repetition, not distance.
    sec: tokens
---

One sequence's values are a box of about 228 000 tokens × 6 KV layers × 2 heads × 256 elements ([[#measured-the-data]]). The [[slice]] never changed in C2: always the values. What changed was the [[cherry-shape|cherry shape]], the dicing rule of [[#scenario-cherry]]: one [[head]], `v[t, l, h, :]`, 256 bytes; one KV [[layer]] with both heads, `v[t, l, :, :]`, 512 bytes; one [[token]] across six KV layers, `v[t, :, :, :]`, 3072 bytes; plus pairs and quadruples of adjacent tokens, `v[t:t+2, l, :, :]` and `v[t:t+4, l, :, :]` (cherries that stack positions, out of scope since 2026-11-03). The shape turned out to measure something: a wider cherry can always run the narrower compressor inside, so the gap between two shapes is a lower bound on what the joined parts share. That is the first purpose of varying a scenario in [[#scenario-why-vary]], the compressor as instrument.

## Heads {#heads}

A trap first. Scores from two [[screen|screens]] cannot be subtracted: each samples its own punnets, and what makes a punnet hard is its text, so the layer screen (0.6449) and the token screen (0.6461) seemed to favour `v[t, l, :, :]` when on the same values they do not ([[#measured-signal-or-noise]]). The campaign's answer was an instrument of its own.

::: define same-window
- **What it is.** Two compressors, or two cherry shapes, run on exactly the same elements. Here, one 4096-token window from each of 20 sequences, the same values diced three ways.
- **Why.** Two screens differ by more than the effect being measured; the only fair way to rank cherry shapes is on identical bytes. It is the paired comparison of [[#scenario-the-score]] taken to its limit.
- **Grade.** Encoded bytes from real compressors, one window per sequence, never put through the separate decoder. Not [[verified-result|verified results]].
:::

| one cherry is | compressor | ratio, 20 windows | the join saves |
|---|---|---:|---|
| one head, `v[t, l, h, :]`, 256 B | 102 | 0.6604 | |
| one KV layer, both heads, `v[t, l, :, :]`, 512 B | 102 | 0.6281 | 0.0322 ± 0.0009, 20 of 20 |
| one token, six KV layers, `v[t, :, :, :]`, 3072 B | 94 | 0.6238 | 0.0043 ± 0.0014, 20 of 20 |

Joining the two heads of a KV layer saves 0.0322 of ratio, about 37 times its spread over sequences. Why so much? The heads do not look alike: the same element position in the two heads has a cosine of about 0.05, and copying head 0 onto head 1 is worse than guessing the mean. Yet two tokens far apart in head 0 are far apart in head 1 too; the distances between tokens correlate up to 0.92 across heads (0.25 at KV layer 0, 0.92 at KV layer 4; 36 punnets). Two views of one vector: that is [[stereo]] similarity, the hypothesis of [[#hypotheses-stereo]], and this table is its verdict.

::: theme bits-unit
[[#hypotheses-fallen-apple]] warned that a high cosine can hide a useless neighbour. Here the warning cut the other way: a cosine near zero hid 0.85 bit per element. Only the bits settled it.
:::

How many bits? A code-length bound on four punnets: the two heads share 0.85 bit per element raw; 0.54 remain after one [[reference-cherry]] serves both heads; only 0.21 if each head gets its own reference, because two different earlier tokens no longer line up. One reference per KV layer is the natural unit.

::: takeaway
- Cherry shapes can be ranked only on the same window; the 20-sequence table is encoded bytes, one window per sequence, not verified.
- Joining the two heads saves 0.0322 (20 of 20). Same element, cosine 0.05; token distances, correlation 0.92: two views of one vector. Stereo similarity, confirmed.
:::

## Layers {#layers}

Joining all six KV layers after that saves a further 0.0043 (20 of 20), understated by about 0.002 because the token compressor lacks 102's layout. Small, and its shape is the interesting part. The orchard's `layer_id` 0 to 5 are the LLM's layers 3, 7, 11, 15, 19, 23. Grouping KV layers 0, 4, 5 and 1, 2, 3 (the LLM's 3+19+23 and 7+11+15) beat grouping 0, 1, 2 and 3, 4, 5 by 0.0015 on 7 of 7 sequences, although the second grouping joins neighbours. Layers group by kind, not by nearness.

That is the verdict on [[upstairs]] similarity ([[#hypotheses-upstairs]]): small, and not by adjacency. Given everything else a compressor knows, adjacent KV layers share 0.03 to 0.08 bit per element and distant ones about 0.01, against 0.19 to 1.19 for the two heads. The floor directly above is barely more alike than a floor far away; floors come in two kinds.

::: figure fig-measured-splits msrSplits wide
**Cutting the orchard three ways.** (a) Same-window gains in MDL ratio with their spread over sequences: the two heads joined −0.0322 ± 0.0009, the six KV layers −0.0043 ± 0.0014 (both 20 of 20), 2 and 4 adjacent tokens +0.037 and +0.063 (like for like, two sequences); negative is a saving. (b) Compressor 129, the one with no reference tree, by cherry shape: 0.7348 `v[t, l, h, :]`, 0.6863 `v[t, l, :, :]`, 0.6696 two KV layers, 0.6667 the by-kind triple, 0.6652 three adjacent KV layers, 0.6622 `v[t, :, :, :]`; different screens, so trust the shape, not the third decimal. Data: `figures/data/measured-splits.json`.
:::

How much was left on the table? A free probability table that pays nothing for its rule reaches about 0.677 / 0.641 / 0.618 at `v[t, l, h, :]` / `v[t, l, :, :]` / `v[t, :, :, :]` (four punnets); real compressors collected about 90 % of the head-to-layer gap and 19 % of the layer-to-token gap, because wider cherries pay more per term for the rule. The compressor with no tree (129, [[#measured-codebooks-and-rotations]]) gains most from width, 0.7348 to 0.6622 from one head to one token: the rule is its only tool.

::: takeaway
- All six KV layers joined: a further 0.0043. Layers group by kind (KV layers 0, 4, 5 against 1, 2, 3), not by nearness.
- Upstairs similarity: small, and not along the staircase.
:::

## Tokens {#tokens}

Joining adjacent tokens loses. Like for like, the same compressor with the same settings: 0.7264 for pairs `v[t:t+2, l, :, :]` and 0.7530 for quadruples `v[t:t+4, l, :, :]` against 0.6896 for `v[t, l, :, :]`, +0.037 and +0.063 of ratio (two sequences, a quick trial without the separate decoder; a code-length version on four punnets says +0.31 and +0.55 bit per element). The reason is the pointer. The best trick in the campaign is pointing at an earlier similar token, and a pair of tokens rarely has a good earlier pair to point at. Adjacent tokens do share up to 0.29 bit per element raw at KV layers 1 and 2, but 0.02 or less once each has its own reference.

Which says something about [[fallen-apple]] similarity, the curve over the token distance $\vgap$ of [[#hypotheses-fallen-apple]], and about [[echo]] similarity, its rival ([[#hypotheses-echo]]). On 24 punnets, where do the reference links point? Within 8 tokens for 37 / 47 / 39 % of cherries at KV layers 1 / 2 / 3 (the LLM's 7 / 11 / 15), and for 9 / 7 / 12 % at KV layers 0 / 4 / 5 (the LLM's 3 / 19 / 23). The middle layers build chains along the text; the first and last build hubs where many far-apart repeats of one token hang off one copy (largest degree 12 to 22 against 6 to 10). At KV layer 0 the adjacent token shares 0.058 bit per element. The apple fell near the tree only in the middle of the LLM. Elsewhere the right axis was never distance; it was "the same token again", the echo.

::: note warning What this page rests on
The 20-sequence comparison is encoded bytes on one window per sequence, not verified in a separate process; the only ledger-grade shape scores on five sequences, compressor 102 at 0.63848 (`v[t, l, :, :]`) and 0.67015 (`v[t, l, h, :]`), read different punnets and may not be subtracted. The reference-link shares rest on 24 punnets of two sequences, the shared bits on four. Token-cherry compressors also received less work than layer-cherry compressors.
:::

::: aside source Receipts
Same-window table and layer groupings: r24 iter-1-3 (20 windows of target 02; `regime` = layers 3+19+23 and 7+11+15, `triple` = 3+7+11 and 15+19+23). Cosine and distance correlation: r7 iter-1-1 (36 blocks). Shared bits: r9 iter-1-2 (4 blocks, bound). Adjacent tokens: r12-t0004 against its own layer score (`s-tok2-b4k-u`, `s-tok4-b4k-u`, `s-layer-b4k-u`); code-length version and lag-1 sharing: r9 iter-1-5. Layers given the rest: r9. Free model: r9 iter-1-6. Where references point: r6 iter-2-1 (24 blocks). Coder 129: r25-t0003, r25-t0004. Five-sequence ledger rows: r24-t0002, env-t0091.
:::

::: takeaway
- Adjacent tokens joined: +0.037 and +0.063. One pointer per token is the thing worth keeping.
- References point near only in the middle KV layers (37 to 47 % within 8 tokens); at KV layers 0, 4, 5 they point to repeats far away. The axis is repetition, not distance: echo over fallen apple.
:::
