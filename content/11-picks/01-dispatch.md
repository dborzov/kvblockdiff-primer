---
title: The result on one page
nav: The result
group: The result
lede: 'On 3 November 2026 the plan''s queries-and-picks experiment and its hot-cache replay ran, on a smaller LLM than the Bench. The stand-in indexer reproduces HiSparse''s miss rates within 1.5×. Misses pile into stretches, but less as the context grows. With the measured counts, the design that serves the most sequences per GPU keeps no dictionary on the GPU at all.'
cards:
  - q: Which LLM produced the pick traces of this Part?
    a: Qwen 2.5 1.5B Instruct, over five coding-agent sequences of 24.5K to 30K tokens
    wrong: ["Qwen3.5-2B, the Bench's LLM", "GLM-5.1, the Pin's LLM", "DeepSeek-V4"]
    why: 'Its dump kept the queries; the Bench''s did not. Its numbers reach the Pin through scaling rules measured inside the dump.'
    sec: five-readings
  - q: 'At the Pin, extrapolated, what share of the misses does a shelf of 4 dictionaries of 4096 positions catch?'
    a: '36–54 %, not the 85 % Part VI assumed'
    wrong: ["85 %, as assumed", "94 %", "4 %"]
    why: 'On the Bachelor''s 27K context that shelf catches 94 %, but it spans 60 % of the context. Misses spread as the context grows (b / t^1.27), so at 100K it catches far less.'
    sec: five-readings
  - q: 'At the Pin, each design at its best hot-cache size, how many sequences per GPU does a solo code on every miss serve, against HiSparse resized?'
    a: 141 against 126
    wrong: ["109.5 against 141", "105 against 126", "126 against 141"]
    why: 'The solo code keeps no bytes per sequence on the GPU, so every byte it removes from a miss raises the link bound. It needs a GPU decoder of at least 500 GB/s.'
    sec: five-readings
  - q: What grade does a number of this Part carry when it is read at the Pin's 100K context?
    a: Extrapolated, carried from the Bachelor's 8K–30K by a fitted rule
    wrong: ["Measured", "Verified", "Their measurement"]
    why: 'Measured: an exact replay of the traces. Derived: arithmetic or a fit on measured numbers. Extrapolated: carried to the Pin by a rule. HiSparse''s own numbers are their measurement.'
    sec: how-to-read
---

Before November 2026, every count on the application side of this site was HiSparse's or an assumption: 274 misses per layer per step, a 13.4 % miss rate at 4096 slots, a δ-miss fraction of 0.85, 0.05 dictionary loads per step ([[#app-the-napkin]]). The plan proposed a stand-in indexer and a replay of the hot cache to measure them ([[#plan-queries-and-picks]], [[#plan-hot-cache-replay]]). On 3 November both ran, on a dump of Qwen 2.5 1.5B that, unlike the Bench, kept its queries. This page gives the result; the nine pages after it give the evidence.

## The result in five readings {#five-readings}

1. **The stand-in indexer is calibrated.** At the Pin's share of the context (512 picks of about 25K positions, 2 %), the hot cache misses 35 / 19 / 9.7 % with 1, 2 and 4 slots per pick, against HiSparse's 30 / 13.4 / 6.7 % on GLM-5.1. That is 1.2–1.5× higher, inside the 2× rule registered in advance, with the same slope (1.07 against 1.08) and the same gap to a clairvoyant policy (1.58 against 1.63) ([[#picks-hot-cache]]).
2. **The share of the context picked carries across contexts; the count of picks does not.** Miss rates for 64 to 2048 picks per step fall on one curve in the share of the context picked. Numbers move to another LLM's setting at equal share and equal slots per pick ([[#picks-share-carries]]).
3. **Misses pile into stretches, 3–5× above chance, and the pile spreads as the context grows.** At the Pin's 100K, extrapolated, a shelf of 4 dictionaries of 4096 positions catches 36–54 % of the misses, not the 85 % Part VI assumed, at 0.10–0.13 loads per step ([[#picks-heavy-stretches]], [[#picks-shelf]]).
4. **A dictionary on the GPU takes memory that could hold hot-cache slots.** It must save more link bytes than those slots would. With the measured numbers, tree dictionaries (the campaigns' best ratio) never do; light ones barely do ([[#picks-slot-price]]).
5. **The best design measured keeps no dictionary per sequence.** At the Pin, each design at its best hot-cache size: HiSparse as published 109.5 sequences per GPU; HiSparse with a resized hot cache 126; light dictionaries on a shelf 127–132; tree dictionaries on a shelf 105–107; a solo code for every miss, with no bytes per sequence, 141 ([[#picks-slot-price/napkin]]).

::: figure fig-picks-napkin-headline picksNapkin wide
**Sequences per GPU at the Pin, each design at its best hot-cache size.** Horizontal axis: sequences per GPU on the Pin's rig (GLM-5.1, 78 layers, 640-byte picks, 30 ms per step, a 50 GB/s link, 30 GB for orchards). One row per design, in three groups: HiSparse with no compression (as published at 4096 slots, and with its hot cache resized to about 4750); dictionaries kept per sequence, on a shelf or all resident (light, mid and tree, from the campaigns' compressors); a global code with no bytes per sequence (solo, ratio 0.804). A bar spans the two ends of the extrapolated δ-miss fraction; open circles mark Part VI's assumption (4 × 4096, 0.85). Dashed: HiSparse resized, 126. A static view of [[#fig-picks-napkin]]. Grades: derived and extrapolated.
:::

::: takeaway
- Stand-in calibrated: 35 / 19 / 9.7 % against HiSparse's 30 / 13.4 / 6.7 %.
- Miss rates follow the share of the context picked; a shelf's catch follows the stretch length over the context to the power 1.27.
- At the Pin: 4 × 4096 catches 36–54 % of misses; a solo code on every miss serves 141 sequences per GPU against 126 for HiSparse resized.
:::

## What changed elsewhere on the site {#what-changed}

- **Part VI.** The napkin pages keep $\vfD$ = 0.85 and $\vnload$ = 0.05 as the assumed values of their figures; a note on each gives what the replay measured ([[#app-shelf-and-two-misses]], [[#app-on-fire]], [[#app-the-napkin]]).
- **Part VII.** The heavy-stretch hypothesis has a verdict ([[#hypotheses-heavy-stretches]]).
- **Part X.** The queries-and-picks experiment and the replay are marked as run ([[#plan-queries-and-picks]], [[#plan-hot-cache-replay]]); the decision rules are read ([[#plan-decision-rules]]).
- **Part XII.** The summary and the grounded numbers carry the headline numbers ([[#reference-summary]], [[#reference-numbers]]).

What did not change. The Bench's pill still reads "not measured" for miss rates: the traces ran on another LLM. The compression scenario, its scores and Part VIII are untouched; this Part measures *which* picks are wanted, not what is inside them ([[#hypotheses-two-localities]]).

::: takeaway
- Part VI's assumed values stay in its figures, with notes giving the measured ones; VII.8 has a verdict; X.5, X.6 and X.9 are marked as run and read.
- The Bench's miss rates are still unmeasured; nothing about bytes changed.
:::

## How to read this Part {#how-to-read}

```graph
id: picks-map
columns: [The setting, The hot cache, Stretches and the shelf, What it changes]
nodes:
  - {id: bach, col: 1, row: 1, title: "The Bachelor", text: "Qwen 2.5 1.5B with queries; the stand-in rule; where attention goes.", link: picks-the-bachelor, cat: llm}
  - {id: carry, col: 1, row: 2, title: "Carrying numbers", text: "Every setting scaled by what it serves; the named configurations.", link: picks-carrying-numbers, cat: systems}
  - {id: hot, col: 2, row: 1, title: "The hot cache", text: "Calibrated against HiSparse; bursts; layers.", link: picks-hot-cache, term: hot-cache}
  - {id: share, col: 2, row: 2, title: "The share carries", text: "Miss rates on one curve in k / t.", link: picks-share-carries, cat: systems}
  - {id: heavy, col: 3, row: 1, title: "Where misses land", text: "Heavy stretches against the shuffled twin; three policies.", link: picks-heavy-stretches, term: heavy-stretch}
  - {id: shelf, col: 3, row: 2, title: "The shelf", text: "f_D against coverage; b / t^1.27; the Pin.", link: picks-shelf, term: dictionary-shelf}
  - {id: price, col: 4, row: 1, title: "The slot price", text: "A dictionary against hot-cache slots; the napkin.", link: picks-slot-price, cat: systems}
  - {id: idx, col: 4, row: 2, title: "The indexer", text: "Stable errors help, jitter hurts; heads; layer groups.", link: picks-the-indexer, term: indexer}
  - {id: means, col: 4, row: 3, title: "What it means", text: "Resize, aim at zero bytes per sequence; what is next.", link: picks-what-it-means, cat: project}
edges:
  - [bach, carry]
  - [carry, hot]
  - [hot, share]
  - [share, shelf]
  - [heavy, shelf]
  - [hot, price]
  - [shelf, price]
  - [price, means]
  - [idx, means]
```

Every number on these pages has one of four grades, and says which.

1. **Measured**: an exact replay of the stored traces, every step from position 8192 on counted. Means over 140 (sequence, layer) pairs, with the range of the five per-sequence means in brackets.
2. **Derived**: arithmetic or a fit on measured numbers, with the formula.
3. **Extrapolated**: carried to the Pin's 100K context by a rule fitted inside the dump.
4. **Their measurement**: HiSparse's numbers on its one GLM-5.1 trace.

The caveats that travel with every number are listed on [[#picks-what-it-means/caveats]]: a stand-in indexer, one 1.5B LLM, contexts of 24.5K–30K tokens, prefill queries, squeezed scores for V4's rows, the campaigns' ratios carried to the Pin's latents, one genre of text.

::: aside source Receipts
The experiment repository is bachelor-kv (private, `dborzov/bachelor-kv`), read at commit aa89697 (3 November 2026). `docs/results.md` "The answer in five lines" and §4 are the source of every number on this page; the summaries it reads (`results/summary/{hotcache,attention,shelf,napkin}.json`) were computed at commit d3c2b80, and each holds its own receipt (script hash, input hashes, date). The method is `docs/design.md`; the next experiments are `docs/next-steps.md`.
:::

::: takeaway
- Read in order: the setting (XI.2–3), the hot cache (XI.4–5), stretches and the shelf (XI.6–7), consequences (XI.8–10).
- Grades: measured, derived, extrapolated, their measurement.
:::
