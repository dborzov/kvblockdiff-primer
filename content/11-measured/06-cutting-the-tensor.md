---
title: How to cut the tensor
nav: How to cut the tensor
lede: 'The values of one sequence are one box of numbers. Before anything is compressed, someone decides what one entry is: one head, one layer, one token, or several tokens. The second campaign turned that choice into a measuring instrument, and it said: join the two heads, join the layers if you like, never join adjacent tokens.'
group: What was found
cards:
  - q: The layer screen scored 0.6449 and the token screen 0.6461. Why does that not rank the two entry splits?
    a: Each screen samples its own blocks, and what makes a block hard is its text; on the same window the token entry is better by 0.0043
    wrong: ["It does: layer entries are better by 0.0012", "Because the token screen used a different read budget", "Because screens are not verified"]
    why: The token screen happened to contain slightly harder text. Only a same-window comparison, the same values cut two ways, ranks splits.
    sec: heads
  - q: The same channel in the two heads of a layer has a cosine of about 0.05. Do the heads share information?
    a: Yes, 0.85 bit per element raw; the distances between tokens correlate up to 0.92 across heads, so they are two views of one vector
    wrong: ["No: cosine 0.05 means independent", "Only in layer 3", "Only after a rotation aligns them"]
    why: Copying head 0 onto head 1 is worse than guessing the mean, yet joining the heads saves 0.0322 on 20 of 20 sequences. Similarity scores are not bits.
    sec: heads
  - q: After the heads, what did joining all six layers into one entry save, and how do the layers group?
    a: A further 0.0043 of ratio (20 of 20); layers 3, 19, 23 behave alike and 7, 11, 15 behave alike, so by kind, not by nearness
    wrong: ["A further 0.03; adjacent layers group together", "Nothing at all", "0.0043, and only adjacent layers may be joined"]
    why: Grouping 3+19+23 and 7+11+15 beat grouping 3+7+11 and 15+19+23 by 0.0015 on 7 of 7 sequences, although the second joins neighbours.
    sec: layers
  - q: What is the verdict on upstairs similarity?
    a: Small, and not by adjacency; given everything else, adjacent layers share 0.03 to 0.08 bit per element, distant ones about 0.01
    wrong: ["Strong: one dictionary can serve four adjacent layers", "Zero: layers are independent", "Unmeasured"]
    why: The floor directly above is barely more alike than a floor far away. Floors come in two kinds instead.
    sec: layers
  - q: Like for like, what did joining 2 and 4 adjacent tokens into one entry cost?
    a: +0.037 and +0.063 of ratio against one layer's entry
    wrong: ["−0.037 and −0.063: a saving", "Nothing: tokens share 0.29 bit", "It could not be measured under a read budget"]
    why: The best trick is one pointer per token to an earlier similar token; a pair of tokens rarely has a good earlier pair to point at.
    sec: tokens
  - q: Where do the reference links point at layers 3, 19 and 23?
    a: Mostly far away, to repeats of the same token; only 9, 7 and 12 % of links stay within 8 tokens, against 37 to 47 % in the middle layers
    wrong: ["To the adjacent token, as fallen-apple similarity predicted", "Within 8 tokens for about half the entries, at every layer", "To the block's first entry"]
    why: Middle layers build chains along the text; the first and last layers build hubs of far-apart repeats. The right axis is repetition, not distance.
    sec: tokens
---

One sequence's values are a box of about 228,000 tokens × 6 layers × 2 heads × 256 channels ([[#measured-the-data]]). The primer's [[entry]] was one token at one layer, keys and values together, $\ve$ = 640 bytes. The campaign cut the values three ways, one [[head]] (256 bytes), one [[layer]] with both heads (512), one [[token]] across six layers (3,072), plus pairs and quadruples of adjacent tokens. The [[entry-split]] turned out to measure something: a wider entry can always run the narrower coder inside, so the gap between two splits is a lower bound on what the joined parts share.

## Heads {#heads}

A trap first. Scores from two [[screen|screens]] cannot be subtracted: each samples its own blocks, and what makes a block hard is its text, so the layer screen (0.6449) and the token screen (0.6461) seemed to favour layers when on the same values they do not ([[#measured-signal-or-noise]]). The campaign's answer was an instrument of its own.

::: define same-window
- **What:** two coders, or two entry splits, run on exactly the same elements. Here, one 4,096-token window from each of 20 sequences, the same values cut three ways.
- **Why:** two screens differ by more than the effect being measured; the only fair way to rank entry splits is on identical bytes.
- **Grade:** encoded bytes from real coders, one window per sequence, never put through the isolated decoder. Not [[verified-result|verified results]].
:::

| one entry is | coder | ratio, 20 windows | the join saves |
|---|---|---:|---|
| one head (256 B) | 102 | 0.6604 | |
| one layer, both heads (512 B) | 102 | 0.6281 | 0.0322 ± 0.0009, 20 of 20 |
| one token, six layers (3,072 B) | 94 | 0.6238 | 0.0043 ± 0.0014, 20 of 20 |

Joining the two heads of a layer saves 0.0322 of ratio, about 37 times its spread over sequences. Why so much? The heads do not look alike: the same channel in the two heads has a cosine of about 0.05, and copying head 0 onto head 1 is worse than guessing the mean. Yet two tokens far apart in head 0 are far apart in head 1 too; the distances between tokens correlate up to 0.92 across heads (0.25 at layer 3, 0.92 at layer 19; 36 blocks). Two views of one vector.

::: theme bits-unit
[[#idea-fallen-apple]] warned that a high cosine can hide a useless neighbour. Here the warning cut the other way: a cosine near zero hid 0.85 bit per element. Only the bits settled it.
:::

How many bits? A code-length bound on four blocks: the two heads share 0.85 bit per element raw; 0.54 remain after one [[reference-entry]] serves both heads; only 0.21 if each head gets its own reference, because two different earlier tokens no longer line up. One reference per layer is the natural unit.

::: takeaway
- Entry splits can be ranked only on the same window; the 20-sequence table is encoded bytes, one window per sequence, not verified.
- Joining the two heads saves 0.0322 (20 of 20). Same channel, cosine 0.05; token distances, correlation 0.92: two views of one vector.
:::

## Layers {#layers}

Joining all six layers after that saves a further 0.0043 (20 of 20), understated by about 0.002 because the token coder lacks 102's layout. Small, and its shape is the interesting part. Grouping layers 3, 19, 23 and 7, 11, 15 beat grouping 3, 7, 11 and 15, 19, 23 by 0.0015 on 7 of 7 sequences, although the second grouping joins neighbours. Layers group by kind, not by nearness.

That is the verdict on [[upstairs]] similarity ([[#idea-upstairs]]): small, and not by adjacency. Given everything else a coder knows, adjacent layers share 0.03 to 0.08 bit per element and distant ones about 0.01, against 0.19 to 1.19 for the two heads. The floor directly above is barely more alike than a floor far away; floors come in two kinds.

::: figure fig-msr-splits msrSplits wide
**Cutting the tensor three ways.** (a) Same-window gains in MDL ratio with their spread over sequences: the two heads joined −0.0322 ± 0.0009, the six layers −0.0043 ± 0.0014 (both 20 of 20), 2 and 4 adjacent tokens +0.037 and +0.063 (like for like, two sequences); negative is a saving. (b) Coder 129, the coder with no reference tree, by entry split: 0.7348 head, 0.6863 layer, 0.6696 pair, 0.6667 regime, 0.6652 triple, 0.6622 token; different screens, so trust the shape, not the third decimal. Data: `figures/data/measured-splits.json`.
:::

How much was left on the table? A free model that pays nothing for its rule reaches about 0.677 / 0.641 / 0.618 at head / layer / token (four blocks); real coders collected about 90 % of the head-to-layer gap and 19 % of the layer-to-token gap, because wider entries pay more per term for the rule. The coder with no tree (129, [[#measured-codebooks-and-rotations]]) gains most from width, 0.7348 to 0.6622 from head to token: the rule is its only tool.

::: takeaway
- All six layers joined: a further 0.0043. Layers group by kind (3, 19, 23 against 7, 11, 15), not by nearness.
- Upstairs similarity: small, and not along the staircase.
:::

## Tokens {#tokens}

Joining adjacent tokens loses. Like for like, the same coder with the same settings: 0.7264 for pairs and 0.7530 for quadruples against 0.6896 for one layer, +0.037 and +0.063 of ratio (two sequences, a quick trial without the isolated check; a code-length version on four blocks says +0.31 and +0.55 bit per element). The reason is the pointer. The best trick in the campaign is pointing at an earlier similar token, and a pair of tokens rarely has a good earlier pair to point at. Adjacent tokens do share up to 0.29 bit per element raw at layers 7 and 11, but 0.02 or less once each has its own reference.

Which says something about [[fallen-apple]] similarity, the curve over the token distance $\vgap$ of [[#eq-idea-apple-curve]]. On 24 blocks, where do the reference links point? Within 8 tokens for 37 / 47 / 39 % of entries at layers 7 / 11 / 15, and for 9 / 7 / 12 % at layers 3 / 19 / 23. The middle layers build chains along the text; the first and last build hubs where many far-apart repeats of one token hang off one copy (largest degree 12 to 22 against 6 to 10). At layer 3 the adjacent token shares 0.058 bit per element. The apple fell near the tree only in the middle of the model. Elsewhere the right axis was never distance; it was "the same token again".

::: note warning What this page rests on
The 20-sequence comparison is encoded bytes on one window per sequence, not isolated-verified; the only ledger-grade split scores on five sequences, coder 102 at 0.63848 (layer) and 0.67015 (head), read different blocks and may not be subtracted. The reference-link shares rest on 24 blocks of two sequences, the shared bits on four. Token coders also received less work than layer coders.
:::

::: aside source Receipts
Same-window table and layer groupings: r24 iter-1-3 (20 windows of target 02). Cosine and distance correlation: r7 iter-1-1 (36 blocks). Shared bits: r9 iter-1-2 (4 blocks, bound). Adjacent tokens: r12-t0004 against its own layer score (`s-tok2-b4k-u`, `s-tok4-b4k-u`, `s-layer-b4k-u`); code-length version and lag-1 sharing: r9 iter-1-5. Layers given the rest: r9. Free model: r9 iter-1-6. Where references point: r6 iter-2-1 (24 blocks). Coder 129: r25-t0003, r25-t0004. Five-sequence ledger rows: r24-t0002.
:::

::: takeaway
- Adjacent tokens joined: +0.037 and +0.063. One pointer per token is the thing worth keeping.
- References point near only in the middle layers (37 to 47 % within 8 tokens); at layers 3, 19, 23 they point to repeats far away. The axis is repetition, not distance.
:::
