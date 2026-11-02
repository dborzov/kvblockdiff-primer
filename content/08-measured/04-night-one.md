---
title: 'Night one: the twin ladder'
nav: 'Night one: the twin ladder'
lede: 'Four researcher agents, one night, one slice of a real orchard. By morning the ratio had fallen from 0.80 to 0.67, and the mechanism that did it was the stage this site had rated noisiest: a real earlier cherry as the guess, the sibling of Part V, with the twins supplied by the text.'
group: What was found
cards:
  - q: At KV layer 0 (the LLM's layer 3), head 0, what did the campaign measure as the solo floor, and what did the best real solo compressor reach?
    a: 0.7999 ideal (per-furrow statistics, tables uncharged); 0.8039 with a two-number curve per furrow
    wrong: ["0.778 ideal; 0.909 coded", "1.0 ideal; 0.97 coded", "0.6731 ideal; 0.6705 coded"]
    why: 0.7999 is the per-punnet, per-furrow order-0 entropy of that one head; 0.8039 is compressor 09, which stores a centre and a width per furrow. The six-layer ideal is the lower 0.778.
    sec: the-floor
  - q: In a punnet of KV layer 0 values, what is a cherry's nearest other cherry, most of the time?
    a: The same token again, 55 % of the time at a stretch of 512 tokens and 78 % at 4096
    wrong: ["The adjacent token", "The punnet's per-furrow average", "A random cherry: in 256 dimensions all cherries are equally far"]
    why: 'Coding-agent transcripts repeat tokens, and the same token in the same kind of context gives nearly the same value cherry. The adjacent token shares only $\vI$ = 0.058 bit per element at KV layer 0.'
    sec: the-ladder
  - q: Why not predict every cherry from its nearest other cherry in the punnet?
    a: 51 % of cherries are mutual nearest neighbours; two cherries that point at each other can never be decoded
    wrong: ["Searching for the nearest cherry is too slow", "The nearest cherry is usually in another punnet", "The nearest cherry is a centroid, not a real cherry"]
    why: The decodable optimum for one reference per cherry is the punnet's minimum spanning tree, which connects everything without a cycle. That is the reference tree.
    sec: the-ladder
  - q: How did pre-RoPE keys compress, compared with values at the same KV layer?
    a: About the same, with the same compressor family and the same mechanisms in the same order; slightly lower ratios at every KV layer but the last
    wrong: ["Keys did not compress at all", "Keys compressed twice as well as values", "Keys needed a completely different compressor"]
    why: 'Keys against values at a stretch of 4096: 0.660 against 0.673 at KV layer 0, 0.701 against 0.740 at KV layer 2. Only KV layer 5 flips, because its values are unusually easy.'
    sec: the-ladder
  - q: The lowest ratio of the night, 0.6705, was set aside. Why?
    a: Every cherry sat in the dictionary, so rebuilding one cherry meant decoding about 1 490 cherries' worth of it, which is stream compression of the punnet
    wrong: ["It failed the exact round trip", "It was measured on the wrong layer", "It used a centroid codebook, which the rules forbade"]
    why: 'The human called it serialized compression of the punnet: technically valid, useless when one cherry at a time is wanted. The leash was written the same morning.'
    sec: the-corner
---

In the small hours of 30 October 2026, four researcher agents and a supervisor sat down with one slice of a real [[orchard]]: the values of KV layer 0 (the LLM's layer 3), head 0, of Qwen3.5-2B over two long coding-agent transcripts. The scenario, in the site's words: `V · KV layer 0 · head 0 · cherry (256,) · stretch 4096 · no leash · FP8`. One [[cherry]] is one V vector, [[~v-one-head]], 256 bytes; one [[punnet]] is the 4096 cherries of one [[stretch]]. The instrument was the [[harness]]: a compressor hands back a [[dictionary]] and one [[delta]] per cherry, every cherry must come back bit for bit, and the score is the [[mdl-ratio]], bytes out over bytes in. Here is what came back.

## The floor {#the-floor}

Before any dictionary, the campaign measured what coding each element on its own is worth, the [[solo]] family of [[#toolbox-solo]]. Two numbers:

- **The ideal.** Per punnet and per [[furrow]], the [[order-0-entropy|order-0 entropy]] of the stored bytes, tables uncharged: **0.7999** of raw at KV layer 0 head 0; **0.778** (6.22 bits per element) over the six KV layers.
- **The best real compressor.** Compressor 09 fits a two-number bell curve per furrow (a centre and a width, the [[loc|furrow statistics]] of [[#toolbox-furrow-statistics]]) and codes each cherry as one [[rans]] stream under it: **0.8039** at a stretch of 4096 tokens, 0.8045 at 512.

The 0.004 between them is the price of knowing the statistics. For comparison, zlib on the punnet: 0.909.

The toolbox had guessed 0.78 with an ideal entropy coder and 0.88 with a fixed-length code. Confirmed.

::: takeaway
- Solo coding: 0.7999 ideal at KV layer 0 head 0, 0.778 over six KV layers; 0.8039 with a real two-number compressor.
- The toolbox's 0.78 to 0.88 guess held. Everything else in Part VIII is counted from this floor.
:::

## The ladder {#the-ladder}

The first real step: predict each cherry from the cherry nearest to it in the punnet, by plain Euclidean distance, and store the exact difference. Every fourth cherry went into the dictionary whole; the rest were coded as a bell curve centred on their nearest dictionary cherry: **0.7698**. This is the [[sib|sibling]] of [[#toolbox-reference-cherries]] with a dictionary of real cherries, and the night never left it. The stored cherry is a [[reference-cherry]]: a real cherry of the punnet, not an invented average.

::: figure fig-measured-ladder-c1 msrLadderC1 wide
**The twin ladder of Night one.** Bars: MDL ratio at a stretch of 4096 tokens of each compressor in the ladder (values of KV layer 0, head 0, cherry `(256,)`, FP8, two dev sequences), with rules at the solo ideal 0.7999 and at 1.0; hover for the trial id. Toggle: the same family at stretches of 512 to 32 768 tokens, 0.7237 / 0.6731 / 0.6416 / 0.6294. All verified ledger rows; data from `figures/data/measured-ladders.json`.
:::

| step, in our words | compressor | ratio |
|---|---|---:|
| per-furrow statistics only (the floor) | 09 | 0.8039 |
| each cherry predicted from its nearest earlier cherry | 04 | 0.7698 |
| dictionary cherries predicted from earlier ones, along a tree | 17 | 0.7373 |
| a match-quality class per cherry (8 classes): the biggest step | 19 | 0.7043 |
| references chosen by clustering (k-medoids) | 23 | 0.6890 |
| references = inner nodes of the punnet's minimum spanning tree | 34 | **0.6731** |
| every cherry in the dictionary, every delta empty | 43 | 0.6705 |

Two rungs need a word. The **k-medoid detour** chose which real cherries to store by clustering, and settled a question from [[#toolbox-vq]]: invented average cherries, the Hive's [[centroid|centroids]], lost to real ones in an early estimate, 0.780 against 0.753 on eleven punnets. A centroid is a blur; a real earlier copy is the better guess when the text repeats.

The **tree** came from a failure. "Every cherry on its nearest other cherry" looked like a ceiling of 0.68 until it proved undecodable: 51 % of cherries are mutual nearest neighbours, pairs pointing at each other, the trap [[#toolbox-reference-cherries]] names. The decodable optimum is the punnet's minimum spanning tree by distance, the [[reference-tree]]: cherries with children sit in the dictionary, coded from their parent; leaves are deltas on their parent. At a stretch of 4096: dictionary share 0.41, delta share 0.27.

What *is* the nearest cherry? At KV layer 0, the same token again: 55 % of the time at a stretch of 512 tokens, 78 % at 4096. That is [[echo]] similarity, not distance. The adjacent token is nearly useless there, [[mutual-information]] $\vI$ = 0.058 bit per element (0.31 at KV layers 1 and 2), which is the first blow to [[fallen-apple]] similarity. The toolbox had computed that a nearest sibling in 640 dimensions costs 0.37 bit *more* than furrow statistics unless true twins exist. They exist, and the text supplies them. Longer stretches hold more: 0.7237 / 0.6731 / 0.6416 / 0.6294 at 512 / 4096 / 16 384 / 32 768 tokens.

Keys, recovered before the rotary position encoding, compressed like values, with the same compressor family in the same order (stretch 4096, head 0):

| KV layer (the LLM's layer) | keys | values |
|---|---:|---:|
| 0 (3) | 0.660 | 0.673 |
| 1 (7) | 0.692 | 0.712 |
| 2 (11) | 0.701 | 0.740 |
| 3 (15) | 0.695 | 0.744 |
| 4 (19) | 0.681 | 0.728 |
| 5 (23) | 0.687 | 0.572 |

KV layer 5's values are unusually easy: a tenth of its furrows are one-signed offsets. The second campaign never touched keys, so this table is all there is ([[#hypotheses-keys-and-values]]).

::: takeaway
- One night: 0.8039 to 0.6731, almost all of it from real earlier cherries as the guess, linked by the punnet's minimum spanning tree.
- The twin is the same token again (55 to 78 % at KV layer 0): an echo, not a neighbour. The adjacent token is nearly useless there. Pre-RoPE keys compress like values.
:::

## The corner {#the-corner}

At 10:15 UTC the human clarified the goal: deployment is out of scope; explore the whole range of dictionary share and find where the ratio is lowest. The agents pushed the share up and the ratio kept falling, to **0.6705** at the far corner, every cherry in the dictionary and every delta empty. The last 0.0026 was per-delta overhead, not better references.

At 11:00 the second clarification. With every cherry in the dictionary the scheme is ordinary stream compression of the punnet: to read one cherry you decode the punnet, which [[#scenario-the-leash]] rules out. Measured, every frontier compressor read 52 to 56 % of its dictionary to rebuild one cherry, about 1 490 cherries' worth at the corner.

::: theme access-pattern
Built with no rule about reading, the ladder slid to the one layout a one-cherry-at-a-time store cannot use. The rule had to come before the statistics.
:::

The answer was the [[leash]] of [[#measured-rules-of-the-game]]: at most 137, 293 or 1 103 cherries' worth of dictionary per cold decode, counted for every single cherry. Night one's ladder has no leash; the second campaign started again under one, and found the corner cheaper than feared once bytes were laid out along tree paths ([[#measured-reading-one-cherry]]).

::: aside source Receipts
Solo: `solo_ratio` landmark of env-t0001 (0.79989) and of screen `s-layer-b4k-r293` (0.77811); coder 09 r1-t0005; zlib r2-t0008. Ladder: r1-t0005, r3-t0002, r1-t0008, r1-t0009, r1-t0014, r1-t0021, r1-t0019, r1-t0035, r1-t0037, r1-t0042, r1-t0045, r1-t0068; block sizes r1-t0045, r1-t0042, r4-t0008. Same-token rate, adjacent-token information, the 51 % and the centroid estimate: C1 analysis results, not ledger trials (`research/c1/KNOWLEDGE.md` [sim/repeats], [sim/adjacency], [sim/tree]). Keys: r3-t0036, r3-t0040, r3-t0024, r3-t0035. Clarifications and reads: `research/MORNING.md` Parts 2 to 4; `docs/spec/random-access.md`. Track: `v-l3h0-fp8-b4k`.
:::

::: takeaway
- Pushed to the corner, the ratio reached 0.6705 with every cherry in the dictionary, which is stream compression of the punnet.
- Reading one cherry took about 1 490 cherries' worth; the leash followed that morning.
:::
