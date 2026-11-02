---
title: Two localities, kept apart
nav: Two localities
group: Which, and what
lede: The first draft read HiSparse's cache hits as evidence that neighbouring cherries are alike. A hit says which position the indexer wants again; it never looks at the bytes stored there. One toy holds the picks fixed and shuffles the bytes, and the two numbers come apart completely.
cards:
  - q: HiSparse's LRU hot cache hits about 87 % of picks at B = 2k. What is that number evidence about?
    a: Which positions the indexer keeps picking from step to step
    wrong: ["How alike neighbouring cherries' bytes are", "How many bits a stretch dictionary would save", "How compressible the orchard is"]
    why: A hit means "picked again soon". It compares one step's query with the next step's query; it never compares one stored cherry with another.
    sec: which-what
  - q: In the toy, the stored bytes are shuffled across positions while the picks stay the same. What happens?
    a: The hit rate stays at 89 %; the bits saved by a neighbour fall from 1.61 to about 0
    wrong: ["Both fall to about zero", "The hit rate falls; the bits stay at 1.61", "Nothing changes at all"]
    why: Picks depend on the indexer's query, not on the bytes. Shuffling destroys neighbour similarity and leaves every pick where it was.
    sec: which-what
  - q: Which which-question does the shelf design genuinely need answered?
    a: Whether misses pile into a few heavy stretches that stay in use for many steps
    wrong: ["Whether the LRU hit rate is above 80 %", "Whether neighbouring cherries have similar bytes", "Whether the indexer is DSA or NSA"]
    why: Stretch dictionaries are cheap to keep on the GPU only if misses concentrate in a few long-lived stretches. That is a question about picks, answered from a pick trace.
    sec: where
  - q: Which side of the which/what split did the campaigns measure?
    a: 'The what side only: the bytes, in bits, with a shuffle control; no indexer ran on the Bench'
    wrong: ["Both sides", "The which side only", "Neither"]
    why: The Bench's dump has values and pre-RoPE keys but no queries and no picks. The which side on the Bench waits for a stand-in indexer.
    sec: verdict
---

At the harbour office of Part II the forecaster asks for the same five logbooks all morning. The lift to the archive hardly ever moves, and her small desk works beautifully.

Does that tell you whether logbook 31 reads like logbook 32? It does not. She could be re-reading five logbooks written in five different languages.

## Which picks, and what is inside them {#which-what}

The old draft used one word, *locality*, for two things.

- **Locality of use.** The [[indexer]] keeps naming the same positions from one decode step to the next. This is the [[lucky-louis]], it is why a small [[hot-cache]] [[hit-miss|hits]], and HiSparse measured it: 87 % of picks found in an LRU hot cache of $\vB = 2\vk = 4096$ slots ([[#landscape-lucky-louis]]).
- **Locality of content.** Cherries that sit close together hold similar numbers, so knowing one makes the other cheaper to store. This is [[neighbour]] similarity, and it is what a stretch [[dictionary]] needs.

Then it made a jump, in its own words: "HiSparse's high hit rate shows that this ladder is steep at the bottom rung, so a stretch dictionary should work." The number is real. It is evidence about the wrong thing. A hit compares this step's query $\vq$ with the last step's query; it never compares one stored cherry with another.

A toy holds one property fixed and changes the other. Its indexer scores 160 positions with its own small random keys, as DSA's indexer does with its own vectors, and picks 8 per step; a query that drifts by a set amount each step does the scoring; an LRU cache holds 16, twice the picks. Each position also stores a cherry of 8 elements whose furrows drift slowly along the sequence. A switch shuffles those stored cherries across positions: every cherry still exists, only the neighbours are no longer neighbours.

::: figure fig-hyp-which-what maWhichWhat
**Which positions are picked, and what they hold, at the same token positions.** *Top:* the positions picked at each of the last 26 decode steps (newest at the bottom), blue if found in the LRU cache (a hit), red if not (a miss). Dotted lines carry the newest step's picks down to the bytes they fetch. *Bottom:* the 8 stored furrows of every cherry as colour strips (teal above zero, saffron below, stronger for larger values). *Tiles:* the LRU hit rate over steps 10 to 90, and the bits per element saved by knowing the previous cherry, from the measured [[r-squared|R²]] of each furrow with its neighbour and the exchange rate $\tfrac12\log_2\frac{1}{1-\vRsq}$. *Controls:* the slider sets how far the query drifts per step; the switch puts the stored bytes in token order or shuffles them across positions. Synthetic data, seeded; 160 positions, 8 picks per step, 16 cache slots.
:::

::: try
1. Flip the switch to **bytes shuffled**. The picks and the hit rate (89 %) do not move. The bits saved fall from 1.61 to 0.01.
2. Put the bytes back in order and drag the drift to 2. The hit rate falls to 27 %. The bits saved stay at 1.61.
3. Find the corner where both numbers are high, then the corner where both are low.
:::

The two knobs move two different numbers, so all four combinations exist:

|  | stored bytes alike along the sequence | stored bytes unrelated |
|---|---|---|
| **slow query** | many hits, cheap misses: what kvblockdiff hopes for | many hits, no compression: the world of [[#hypotheses-the-leak]] |
| **fast query** | few hits, but each miss compresses well | neither |

One honest caveat. In a real LLM the indexer's vectors and the stored cherries are made from the same hidden states, so the two properties may well travel together. The toy shows only that one does not *imply* the other, which is enough to break the jump and not enough to predict the answer.

::: takeaway
- A cache hit is a fact about the queries; neighbour similarity is a fact about the stored bytes.
- Shuffling the bytes kills the compression and leaves the hit rate alone; speeding the query does the reverse.
:::

## Where each question belongs {#where}

:::: compare Two localities, side by side
::: col Lucky Louis (which)
- **About:** which positions the indexer picks.
- **Produced by:** a query that drifts slowly from step to step.
- **Measured as:** hit rate, [[reuse-distance]], the stack-distance curve ([[#hypotheses-stack-distance]]).
- **Destroyed by:** a fast-moving query.
- **Buys:** fewer misses.
- **Needed by the design in a stronger form:** misses piling into few, long-lived stretches ([[#hypotheses-heavy-stretches]]).
:::
::: col Neighbour similarity (what)
- **About:** what the picked cherries contain.
- **Produced by:** cherries that resemble a neighbour along some axis.
- **Measured as:** bits per element saved, by cherry shape or by a stage that sees the neighbour ([[#hypotheses-neighbour-similarity]]).
- **Destroyed by:** shuffling tokens across positions, the [[shuffle-control]].
- **Buys:** cheaper misses.
- **Needed by the design:** without it the deltas do not shrink.
:::
::::

::: theme which-vs-what
This is the page where the theme is made. One switch changes *what* is stored and leaves *which* positions are picked alone; the slider does the opposite. A number about one says nothing about the other, in either direction.
:::

The which-side question the design really needs is not the hit rate, which HiSparse already has. It is whether the misses, the picks that cost bytes, crowd into a few [[heavy-stretch|heavy stretches]] for many steps, so that a shelf of a few dictionaries catches most of them. That is a statistic of a pick trace, and the next page states it.

::: takeaway
- Ask the what-question of the bytes, in bits, with a shuffle control.
- Ask the which-question only where the design needs it: do misses concentrate in heavy stretches?
:::

## Verdict {#verdict}

Half measured. The what side is the whole of Part VIII: the bytes of Qwen3.5-2B's values, scored under the contract, with the shuffle control that separated the echo gain (0.6907 to 0.7520 when tokens are shuffled) from the geometric gain (unchanged within 0.002) ([[#measured-two-kinds-of-structure]]). Everything found there was found without a single pick.

The which side is unmeasured on [[bench|the Bench]]: no indexer ran, so the dump has no queries, no picks, no hit rate, no heavy-stretch statistic ([[#landscape-reference-settings]]). On [[pin|the Pin]] it is HiSparse's own measurement, 30 / 13.4 / 6.7 % misses at 2048 / 4096 / 8192 slots, with no per-stretch breakdown published. The step that fills the empty half is a stand-in indexer for the dump, exact top-$\vk$ attention from recomputed queries, which gives a pick trace to replay ([[#plan-queries-and-picks]], [[#plan-hot-cache-replay]]).

::: takeaway
- What: measured, in bits, shuffle-controlled. Which: HiSparse's hit rates on the Pin, nothing on the Bench.
- A stand-in indexer on the dump would fill the which side for the same data the what side was measured on.
:::
