---
title: Two localities were merged
lede: The first draft read HiSparse's cache hits as evidence that neighbouring KV entries are alike. Hits are evidence about which entries the model wants, not about what is stored inside them, and a toy shows the two coming apart completely.
group: Corrections
cards:
  - q: HiSparse's LRU hot cache hits about 87 % of selections at B = 2k. What does that number tell you about?
    a: Which entries the indexer keeps selecting from step to step
    wrong: ["How alike neighbouring entries' bytes are", "How many bits a block dictionary would save", "How compressible the KV history is"]
    why: A hit means "selected again soon". It compares one step's query with the next step's query; it never compares one stored entry with another.
    sec: claim
  - q: In the toy, the stored bytes are shuffled across positions while the selections stay the same. What happens?
    a: The hit rate stays at 89 %; the bits saved by a neighbour fall from 1.61 to about 0
    wrong: ["Both fall to about zero", "The hit rate falls; the bits stay at 1.61", "Nothing changes at all"]
    why: Selections depend on the indexer's query, not on the bytes. Shuffling destroys neighbour similarity but leaves every selection where it was.
    sec: toy
  - q: Which corner of the 2 × 2 does the first leak toy of IV.13 occupy?
    a: Slow query, unrelated bytes — HiSparse-like hits, zero compression
    wrong: ["Fast query, alike bytes", "Slow query, alike bytes", "Fast query, unrelated bytes"]
    why: IV.13 draws keys independently, so no neighbour helps, and drifts the query slowly, so the cache hits anyway.
    sec: toy
  - q: Which question about "which entries" does the block design genuinely need answered?
    a: Whether misses pile into a few heavy blocks that stay in use for many steps
    wrong: ["Whether the LRU hit rate is above 80 %", "Whether neighbouring entries have similar bytes", "Whether the indexer is DSA or NSA"]
    why: Block dictionaries are cheap to keep on the GPU only if misses concentrate in a few long-lived blocks (IV.10, question Q3).
    sec: changes
  - q: How does the plan test fallen-apple similarity directly?
    a: Bits per element of an entry given a neighbour, at 8 bits, with a shuffle control
    wrong: ["By replaying HiSparse's trace and reading the hit rate", "By measuring cosine similarity of neighbouring keys", "By checking that 2-bit quantization works"]
    why: The quantity is about bytes, so it is measured on bytes, in bits, and must vanish when tokens are shuffled.
    sec: changes
---

At the harbour office of Part II, the forecaster asks for the same five logbooks all morning. The lift to the archive hardly ever moves, and her small desk works beautifully.

Does that tell you whether logbook 31 reads like logbook 32? It does not. She could be re-reading five logbooks written in five different languages.

## What the first draft said {#claim}

The draft climbed the [[cat-ladder]] and then made a jump. In its own words:

> "HiSparse's high hit rate shows that this ladder is steep at the bottom rung, so a block dictionary should work."

The number behind the jump is real. On [[hisparse|HiSparse]]'s trace, an LRU [[hot-cache]] with twice as many slots as selections ($\vB = 2\vk = 4096$) misses 13.4 % of each step's selections. So 87 % of them hit.

The draft used one word, *locality*, for two different things.

- **Locality of use.** The [[indexer]] keeps choosing the same positions from one decode step to the next. This is the [[lucky-louis]], and it is why a small cache [[hit-miss|hits]].
- **Locality of content.** Entries that sit close together in the sequence hold similar numbers, so knowing one makes the other cheaper to store. This is [[fallen-apple]], and it is what a block [[dictionary]] needs.

Why merge them? The jump has a strong version, and it deserves a hearing.

1. **Both are "nearness in time".** One word for both felt natural.
2. **There is a plausible causal chain.** The hidden state drifts slowly. Queries and keys are both made from hidden states. So if the query drifts slowly, perhaps the stored keys drift slowly too.
3. **It was the only number in hand.** A measured number feels better than an intuition.

Point 2 is a fair reason to *hope* for fallen-apple similarity; [[#idea-fallen-apple]] gives it as such. But it is not evidence. The hit rate compares this step's query with the last step's query. It never compares one stored entry with another.

::: takeaway
- A cache hit means "selected again soon". It is a fact about the queries.
- Fallen-apple similarity is a fact about the stored bytes. The draft's evidence was for the wrong one.
:::

## Same selections, different bytes {#toy}

A toy can hold one property fixed and change the other. Its indexer scores 160 positions with its own small random keys, as DSA's indexer does with its own vectors, and selects 8 per step. A query that drifts by a set amount each step does the scoring. An LRU cache holds 16 entries, twice the selection.

Each position also stores an entry of 8 channels. In token order, each channel's value drifts slowly along the sequence. A switch shuffles those stored entries across positions. Every entry still exists and every value is still there; only the neighbours are no longer neighbours.

::: figure fig-ma-which-what maWhichWhat
**Which entries are selected, and what they hold, at the same token positions.** *Top:* the positions selected at each of the last 26 decode steps (newest at the bottom), blue if found in the LRU cache (a hit), red if not (a miss). Dotted lines carry the newest step's selections down to the bytes they fetch. *Bottom:* the 8 stored channels of every entry as colour strips (teal above zero, saffron below, stronger for larger values). *Tiles:* the LRU hit rate over steps 10–90, and the bits per element saved by knowing the previous entry, from the measured [[r-squared|R²]] of each channel with its neighbour and the exchange rate $\tfrac12\log_2 \tfrac{1}{1-\vRsq}$. *Controls:* the slider sets how far the query drifts per step; the switch puts the stored bytes in token order or shuffles them across positions. Synthetic data, seeded; 160 positions, 8 selections per step, 16 cache slots.
:::

::: try
1. Flip the switch to **bytes shuffled**. The selections and the hit rate (89 %) do not move. The bits saved fall from 1.61 to 0.01.
2. Put the bytes back in order and drag the drift to 2. The hit rate falls to 27 %. The bits saved stay at 1.61.
3. Find the corner where both numbers are high, then the corner where both are low.
:::

The two knobs move two different numbers. So all four combinations exist:

|  | stored bytes alike along the sequence | stored bytes unrelated |
|---|---|---|
| **slow query** | many hits, cheap misses: what kv-blockdiff hopes for | many hits, no compression: the toy of [[#idea-the-leak]] |
| **fast query** | few hits, but each miss compresses well | neither |

::: aside reminder Where have I seen the leak toy?
[[#idea-the-leak]] draws its keys independently, so no neighbour helps at all, and lets a query drift slowly over them. In that page's live run (4,096 keys, top-64) the cache still hits about 86 % of the time at a gentle drift; the earlier proposal's larger run (16,384 keys) gave 73–93 %. This page adds the second axis: the bytes can be made alike, or shuffled, without touching the selections.
:::

One honest caveat. In a real model, the indexer's vectors and the stored entries are made from the same hidden states, so the two properties may well travel together. The toy shows only that one does not *imply* the other. That is enough to break the draft's argument, and not enough to predict the answer.

::: takeaway
- Shuffling the bytes kills the compression and leaves the hit rate untouched.
- Speeding up the query kills the hit rate and leaves the compression untouched.
- So a hit rate is no evidence about bytes, in either direction.
:::

## What changes in the plan {#changes}

- **The hit rate is no longer quoted as evidence for compression.** Not in the proposal, not in a paper.
- **Fallen-apple similarity is measured on the bytes.** The plan measures the bits per element of an entry given a neighbour at token distance $\vgap$, at 8-bit precision, as a curve ([[#questions-framework-a]]). The "bytes shuffled" switch above is the [[shuffle-control]]: a real effect must vanish when it is flipped.
- **The which-question goes where the design really needs it.** Block dictionaries are cheap to keep on the GPU only if misses pile into a few [[heavy-block|heavy blocks]] for many steps ([[#idea-heavy-blocks]]). That is a question about which entries, and traces like HiSparse's answer it ([[#questions-q3]]).

:::: compare Two localities, side by side
::: col Lucky Louis property
- **About:** which positions the indexer selects.
- **Produced by:** a query that drifts slowly from step to step.
- **Measured as:** hit rate, [[reuse-distance]].
- **Destroyed by:** a fast-moving query.
- **Buys:** fewer misses.
- **Status:** measured by HiSparse (87 % hits at $\vB = 2\vk$).
:::
::: col Fallen-apple similarity
- **About:** what the selected entries contain.
- **Produced by:** stored entries that resemble their neighbours.
- **Measured as:** bits per element saved by a neighbour at distance $\vgap$.
- **Destroyed by:** shuffling tokens across positions.
- **Buys:** cheaper misses.
- **Status:** not measured at 8 bits by anyone.
:::
::::

::: theme which-vs-what
Here the theme is at its sharpest. One switch changes *what* is stored and leaves *which* entries are selected alone, and the slider does the opposite. A number about one says nothing about the other.
:::

::: takeaway
- Measure the bytes directly, in bits, with a shuffle control.
- Ask the which-question only where the design needs it: do misses concentrate in heavy blocks?
:::
