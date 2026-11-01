---
title: 'Night one: the twin ladder'
nav: 'Night one: the twin ladder'
lede: 'Four researcher agents, one night, one slice of a real KV cache. By morning the ratio had fallen from 0.80 to 0.67, and the mechanism that did it was the dictionary type this primer had rated noisiest: a real earlier entry as the guess, the Twin of VI.8, with the twins supplied by the text.'
group: What was found
cards:
  - q: At layer 3, head 0, what did the campaign measure as the solo floor, and what did the best real solo coder reach?
    a: 0.7999 ideal (per-channel statistics, tables uncharged); 0.8039 with a two-number curve per channel
    wrong: ["0.778 ideal; 0.909 coded", "1.0 ideal; 0.97 coded", "0.6731 ideal; 0.6705 coded"]
    why: 0.7999 is the per-block, per-channel order-0 entropy of that one head; 0.8039 is coder 09, which stores a centre and a width per channel. The six-layer ideal is the lower 0.778.
    sec: the-floor
  - q: In a block of layer-3 values, what is an entry's nearest other entry, most of the time?
    a: The same token again, 55 % of the time in 512-token blocks and 78 % in 4,096-token blocks
    wrong: ["The adjacent token", "The block's per-channel average", "A random entry: in 256 dimensions all entries are equally far"]
    why: 'Coding-agent transcripts repeat tokens, and the same token in the same kind of context gives nearly the same value entry. The adjacent token shares only $\vI$ = 0.058 bit per element at layer 3.'
    sec: the-ladder
  - q: Why not predict every entry from its nearest other entry in the block?
    a: 51 % of entries are mutual nearest neighbours; two entries that point at each other can never be decoded
    wrong: ["Searching for the nearest entry is too slow", "The nearest entry is usually in another block", "The nearest entry is a centroid, not a real entry"]
    why: The decodable optimum for one reference per entry is the block's minimum spanning tree, which connects everything without a cycle. That is the reference tree.
    sec: the-ladder
  - q: How did pre-RoPE keys compress, compared with values at the same layer?
    a: About the same, with the same coder family and the same mechanisms in the same order; slightly lower ratios at every layer but 23
    wrong: ["Keys did not compress at all", "Keys compressed twice as well as values", "Keys needed a completely different coder"]
    why: 'Keys against values at 4,096 tokens: 0.660 against 0.673 at layer 3, 0.701 against 0.740 at layer 11. Only layer 23 flips, because its values are unusually easy.'
    sec: the-ladder
  - q: The lowest ratio of the night, 0.6705, was set aside. Why?
    a: Every entry sat in the dictionary, so rebuilding one entry meant decoding about 1,490 entries' worth of it, which is stream compression of the block
    wrong: ["It failed the exact round trip", "It was measured on the wrong layer", "It used a centroid codebook, which the rules forbade"]
    why: 'The human called it serialized block compression: technically valid, useless when one entry at a time is wanted. The read budget was written the same morning.'
    sec: the-corner
---

In the small hours of 30 October 2026, four researcher agents and a supervisor sat down with one slice of a real [[kv-cache]]: the values of layer 3, head 0, of Qwen3.5-2B over two long coding-agent transcripts, cut into [[block|blocks]] of $\vb$ = 4,096 tokens and stored as 8-bit [[fp8]] E4M3. The instrument was the [[harness]] of [[#measured-rules-of-the-game]]: a coder hands back a [[dictionary]] and one [[delta]] per [[entry]], every entry must come back bit for bit, and the score is the [[mdl-ratio]], bytes out over bytes in. Here is what came back.

## The floor {#the-floor}

Before any dictionary, the campaign measured what coding each element on its own is worth, the primer's [[solo]] rung. Two numbers:

- **The ideal.** Per block and per [[channel]], the order-0 entropy of the stored bytes, tables uncharged: **0.7999** of raw at layer 3 head 0; **0.778** (6.22 bits per element) over the six layers that keep a cache.
- **The best real coder.** Coder 09 fits a two-number bell curve per channel (a centre and a width) and codes each entry as one [[rans]] stream under it: **0.8039** at 4,096 tokens, 0.8045 at 512.

The 0.004 between them is the price of knowing the statistics. For comparison, zlib on the block: 0.909.

The primer had guessed 0.78 with an ideal coder and 0.88 fixed-length ([[#homework-solo-coding]]). Confirmed.

::: takeaway
- Solo coding: 0.7999 ideal at layer 3 head 0, 0.778 over six layers; 0.8039 with a real two-number coder.
- The primer's 0.78 to 0.88 guess held. Everything else in Part XI is counted from this floor.
:::

## The ladder {#the-ladder}

The first real step: predict each entry from the entry nearest to it in the block, by plain Euclidean distance, and store the exact difference. Every fourth entry went into the dictionary whole; the rest were coded as a bell curve centred on their nearest dictionary entry: **0.7698**. This is the Twin of [[#homework-sib]] with a dictionary of real entries, and the night never left it.

::: define reference-entry
- **What:** an earlier entry of the same block, stored whole in the dictionary, that a coder uses as its prediction for another entry. The delta then codes the exact difference.
- **Not to confuse with** [[loc]], the Anchor: a location is a per-channel average, invented from many entries. A reference entry is one real entry; nothing is invented.
:::

::: figure fig-msr-ladder-c1 msrLadderC1 wide
**The twin ladder of Night one.** Bars: MDL ratio at 4,096 tokens of each coder in the ladder (values of layer 3 head 0, FP8, two dev sequences), with rules at the solo ideal 0.7999 and at 1.0; hover for the trial id. Toggle: the same family at 512 to 32,768 tokens, 0.7237 / 0.6731 / 0.6416 / 0.6294. All verified ledger rows; data from `figures/data/measured-ladders.json`.
:::

| step, in our words | coder | ratio |
|---|---|---:|
| per-channel statistics only (the floor) | 09 | 0.8039 |
| each entry predicted from its nearest earlier entry | 04 | 0.7698 |
| dictionary entries predicted from earlier ones, along a tree | 17 | 0.7373 |
| a match-quality class per entry (8 classes): the biggest step | 19 | 0.7043 |
| references chosen by clustering (k-medoids) | 23 | 0.6890 |
| references = inner nodes of the block's minimum spanning tree | 34 | **0.6731** |
| every entry in the dictionary, every delta empty | 43 | 0.6705 |

Two rungs need a word. The **k-medoid detour** chose which real entries to store by clustering, and settled a question from [[#homework-vq]]: invented average entries, the Hive's [[centroid|centroids]], lost to real ones in an early estimate, 0.780 against 0.753 on eleven blocks. A centroid is a blur; a real earlier copy is the better guess when the text repeats.

The **tree** came from a failure. "Every entry on its nearest other entry" looked like a ceiling of 0.68 until it proved undecodable: 51 % of entries are mutual nearest neighbours, pairs pointing at each other, the trap [[#homework-sib]] had named. The decodable optimum is the minimum spanning tree.

::: define reference-tree
- **What:** the links from every entry of a block to its reference entry. The best coders use the block's minimum spanning tree by distance: the links that connect all entries with the least total distance, so each entry hangs off its closest relative and nothing points in a circle.
- **How it is read:** entries with children sit in the dictionary, coded from their parent; leaves are deltas on their parent. At 4,096 tokens: dictionary share 0.41, delta share 0.27.
:::

What *is* the nearest entry? At layer 3, the same token again: 55 % of the time in 512-token blocks, 78 % in 4,096-token blocks. The adjacent token is nearly useless there, [[mutual-information]] $\vI$ = 0.058 bit per element (0.31 at layers 7 and 11). The primer had computed that a nearest sibling in 640 dimensions costs 0.37 bit *more* than the Anchor unless true twins exist. They exist, and the text supplies them. Bigger blocks hold more: 0.7237 / 0.6731 / 0.6416 / 0.6294 at 512 / 4,096 / 16,384 / 32,768 tokens.

Keys, recovered before the rotary position encoding, compressed like values, with the same coder family in the same order (4,096 tokens, head 0):

| layer | keys | values |
|---|---:|---:|
| 3 | 0.660 | 0.673 |
| 7 | 0.692 | 0.712 |
| 11 | 0.701 | 0.740 |
| 15 | 0.695 | 0.744 |
| 19 | 0.681 | 0.728 |
| 23 | 0.687 | 0.572 |

Layer 23's values are unusually easy: a tenth of its channels are one-signed offsets. The second campaign never touched keys, so this table is all there is.

::: takeaway
- One night: 0.8039 to 0.6731, almost all of it from real earlier entries as the guess, linked by the block's minimum spanning tree.
- The twin is the same token again (55 to 78 % at layer 3); the adjacent token is nearly useless there. Pre-RoPE keys compress like values.
:::

## The corner {#the-corner}

At 10:15 UTC the human clarified the goal: deployment is out of scope; explore the whole range of dictionary share and find where the ratio is lowest. The agents pushed the share up and the ratio kept falling, to **0.6705** at the far corner, every entry in the dictionary and every delta empty. The last 0.0026 was per-delta overhead, not better references.

At 11:00 the second clarification. With every entry in the dictionary the scheme is ordinary stream compression of the block: to read one entry you decode the block, which the primer had ruled out on day one ([[#idea-data-layout]]). Measured, every frontier coder read 52 to 56 % of its dictionary to rebuild one entry, about 1,490 entries' worth at the corner.

::: theme access-pattern
Built with no rule about reading, the ladder slid to the one layout a one-entry-at-a-time store cannot use. The rule had to come before the statistics.
:::

The answer was the [[read-budget]] of [[#measured-rules-of-the-game]]: at most 137, 293 or 1,103 entries' worth of dictionary per cold decode, counted for every single entry. Night one's ladder has no budget; the second campaign started again under one, and found the corner cheaper than feared once bytes were laid out along tree paths ([[#measured-reading-one-entry]]).

::: aside source Receipts
Solo: `solo_ratio` landmark of env-t0001 (0.79989) and of screen `s-layer-b4k-r293` (0.77811); coder 09 r1-t0005; zlib r2-t0008. Ladder: r1-t0005, r3-t0002, r1-t0008, r1-t0009, r1-t0014, r1-t0021, r1-t0019, r1-t0035, r1-t0037, r1-t0042, r1-t0045, r1-t0068; block sizes r1-t0045, r1-t0042, r4-t0008. Same-token rate, adjacent-token information, the 51 % and the centroid estimate: C1 analysis results, not ledger trials (`research/c1/KNOWLEDGE.md` [sim/repeats], [sim/adjacency], [sim/tree]). Keys: r3-t0036, r3-t0040, r3-t0024, r3-t0035. Clarifications and reads: `research/MORNING.md` Parts 2 to 4; `docs/spec/random-access.md`.
:::

::: takeaway
- Pushed to the corner, the ratio reached 0.6705 with every entry in the dictionary, which is stream compression of the block.
- Reading one entry took about 1,490 entries' worth; the read budget followed that morning.
:::
