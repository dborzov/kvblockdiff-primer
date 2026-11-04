---
title: The result on one page
nav: The result
group: The result
lede: 'Part VI estimated what kvblockdiff gains with a traffic column it had to assume. On 3 November 2026 the plan''s stand-in indexer and its hot-cache replay ran, on a smaller LLM than the Bench, and filled that column with measured counts. The stand-in reproduces HiSparse''s miss rates within 1.5×. Misses pile into stretches, but less as the context grows. With the measured counts, the design that serves the most sequences per GPU keeps no dictionary on the GPU at all.'
cards:
  - q: In what order does this Part build its numbers?
    a: 'A dump with queries, a stand-in indexer, a pick trace, a replay of the hot cache and the shelf, a rule that carries the counts to the Pin, then the napkin at equal GPU memory'
    wrong: ["A compressor, a punnet, an MDL ratio, then a trace", "A trained indexer, a GPU kernel, then a benchmark", "The napkin first, then the trace that confirms it"]
    why: 'Each step uses only the one before it. Bytes enter at the very end, from the campaigns of Part VIII; everything before that counts which picks are wanted.'
    sec: how-this-part-runs
  - q: Which LLM produced the pick traces of this Part?
    a: Qwen 2.5 1.5B Instruct, over five coding-agent sequences of 24.5K to 30K tokens
    wrong: ["Qwen3.5-2B, the Bench's LLM", "GLM-5.1, the Pin's LLM", "DeepSeek-V4"]
    why: 'Its dump kept the queries; the Bench''s did not. Its numbers reach the Pin through scaling rules measured inside the dump.'
    sec: how-this-part-runs
  - q: 'At the Pin, extrapolated, what share of the misses does a shelf of 4 dictionaries of 4096 positions catch?'
    a: '36–54 %, not the 85 % Part VI assumed'
    wrong: ["85 %, as assumed", "94 %", "4 %"]
    why: 'On the Bachelor''s 27K context that shelf catches 94 %, but it spans 60 % of the context. Misses spread as the context grows (b / t^1.27), so at 100K it catches far less.'
    sec: five-readings
  - q: 'At the Pin, each design at its best hot-cache size, how many sequences per GPU does a solo code on every miss serve, against HiSparse resized?'
    a: 141 against 127
    wrong: ["109.5 against 141", "105 against 127", "127 against 141"]
    why: 'The solo code keeps no bytes per sequence on the GPU, so every byte it removes from a miss raises the link bound. It needs a GPU decoder of at least 500 GB/s.'
    sec: five-readings
  - q: What is the most any compression of the miss path can add at the Pin, with this miss curve and rig?
    a: 'About +31 %: 166 sequences per GPU for a global code at the whole-sequence floor of 0.57, against 127'
    wrong: ["A factor of 1 / 0.57 ≈ 1.75", "Nothing; the link is not the bottleneck", "A factor of 2"]
    why: 'The hot cache turns about half of any compression gain into a smaller cache: sequences per GPU grow as about 1 / √r, not 1 / r.'
    sec: potential
  - q: What grade does a number of this Part carry when it is read at the Pin's 100K context?
    a: Extrapolated, carried from the Bachelor's 8K–30K by a fitted rule
    wrong: ["Measured", "Verified", "Their measurement"]
    why: 'Measured: an exact replay of the traces. Derived: arithmetic or a fit on measured numbers. Extrapolated: carried to the Pin by a rule. HiSparse''s own numbers are their measurement.'
    sec: how-to-read
  - q: After this Part, which application-side number on the site is still unmeasured on the Bench?
    a: Its miss rates, because the pick traces ran on another LLM
    wrong: ["Its MDL ratios", "Its cherry bytes", "Its number of KV layers"]
    why: 'The traces come from Qwen 2.5 1.5B, the Bachelor. The Bench (Qwen3.5-2B) kept no queries, so its pill still reads "not measured" for miss rates.'
    sec: what-changed
---

[[#app-the-napkin]] ended Part VI with two budgets per sequence, link bytes and GPU bytes, and a table of inputs. The bytes column was measured: the campaigns of Part VIII had given $\vrho$ and $\vw$ at several points of the curve. The traffic column was not. How many picks miss, how many of those misses find their stretch's dictionary on the shelf, and how often a dictionary must be loaded were HiSparse's numbers or guesses: 274 misses per layer per step, $\vfD$ = 0.85, $\vnload$ = 0.05. The plan proposed to measure them with a stand-in indexer and a replay ([[#plan-queries-and-picks]], [[#plan-hot-cache-replay]]). On 3 November both ran. This Part reports what they found.

## How this Part runs {#how-this-part-runs}

Every object on these pages has been met before. The [[orchard]] is the store of keys and values ([[#landscape-orchard]]). The [[indexer]] names $\vk$ [[pick|picks]] per layer per step ([[#landscape-sparse-attention]]). HiSparse keeps recent picks in its [[hot-cache|hot cache]] and fetches the rest over the link ([[#landscape-hisparse]]); the [[lucky-louis|Lucky Louis property]] is why that works ([[#landscape-lucky-louis]]). kvblockdiff adds a [[dictionary-shelf|dictionary shelf]], so that a miss whose stretch is [[on-fire|on fire]] travels as a delta ([[#app-shelf-and-two-misses]], [[#app-on-fire]]). What is new here is the data and the chain of steps that turns it into the napkin's missing column.

::: figure fig-picks-pipeline picksPipeline wide
**How the counts of this Part are made.** Seven boxes in four columns, read from left to right: the picks (the Bachelor's queries; the stand-in indexer), the trace and the cache (the pick trace; the hot cache), the misses' bytes (the dictionary shelf; the bytes of a miss) and the bill (the napkin). Each box carries its key number (87 % of the attention mass in the top 512 picks; 65 % of picks repeated from step to step; 19.0 % of picks missing at $\vB = 2\vk$; $\vfD$ 0.36–0.54 at the Pin; ratios 0.804, 0.686, 0.636; 141 and 127 sequences per GPU) and links to the page that reports it; the labels on the arrows say what passes from one step to the next. The rules that carry the counts from 27K tokens to the Pin's 100K sit inside the shelf and hot-cache boxes ([[#picks-share-carries]], [[#picks-shelf/scaling]]).
:::

In words:

1. **A dump with queries.** The Bench kept keys and values but no queries, so no indexer could run on it. A smaller dump, [[#picks-the-bachelor]], kept them.
2. **A stand-in indexer and its trace.** The LLM's own attention, ranked, names the picks of every layer at every step. [[#picks-a-trace]] shows 600 real steps of one layer, with every miss and every shelf change.
3. **The replay.** HiSparse's LRU runs over the trace and counts misses ([[#picks-hot-cache]]); a shelf runs beside it and counts δ-misses and loads ([[#picks-heavy-stretches]], [[#picks-shelf]]). No byte of the orchard is opened: this is the [[trace-replay|trace replay]] of the plan.
4. **Carrying the counts.** The Bachelor's sequences are 27K tokens long and the Pin's is 100K. Two rules measured inside the dump carry the counts across ([[#picks-carrying-numbers]], [[#picks-share-carries]], [[#picks-shelf/scaling]]).
5. **The bytes side and the napkin.** Only at the end do bytes enter: the campaigns' MDL ratios, and their split between dictionary and deltas ([[#picks-bytes-side]]). The napkin then compares every design at equal GPU memory ([[#picks-slot-price]], [[#picks-ceiling]]).

A worked example of what the replay counts, from the trace of [[#picks-a-trace]]. At every step of layer 9 of sequence 2 the stand-in names 512 positions. Over the 600 steps shown there, 98 of the 512 miss the hot cache on average (19 %), and 58 % of those misses find their stretch's dictionary on a shelf of four. At the step just after the assistant starts writing, 220 miss, and 190 of them are δ-misses.

::: takeaway
- The chain: a dump with queries, a stand-in indexer, a pick trace, a replay of the hot cache and the shelf, rules that carry the counts to the Pin, then the napkin with the campaigns' bytes.
- Everything before the napkin counts which picks are wanted; no byte of the orchard is read.
:::

## The result in five readings {#five-readings}

1. **The stand-in indexer is calibrated.** At the Pin's share of the context (512 picks of about 25K positions, 2 %), the hot cache misses 35 / 19 / 9.7 % with 1, 2 and 4 slots per pick, against HiSparse's 30 / 13.4 / 6.7 % on GLM-5.1. That is 1.2–1.5× higher, inside the 2× rule registered in advance, with the same slope (1.07 against 1.08) and the same gap to a clairvoyant policy (1.58 against 1.63) ([[#picks-hot-cache]]).
2. **The share of the context picked carries across contexts; the count of picks does not.** Miss rates for 64 to 2048 picks per step fall on one curve in the share of the context picked. Numbers move to another LLM's setting at equal share and equal slots per pick ([[#picks-share-carries]]).
3. **Misses pile into stretches, and the pile spreads as the context grows.** A step's heaviest stretch holds 3.3 times its shuffled twin's share of the misses; a shelf catches 3–5 times what the twin catches at equal coverage. At the Pin's 100K, extrapolated, a shelf of 4 dictionaries of 4096 positions catches 36–54 % of the misses, not the 85 % Part VI assumed, at 0.10–0.13 loads per step ([[#picks-heavy-stretches]], [[#picks-shelf]]).
4. **A dictionary on the GPU takes memory that could hold hot-cache slots.** In the MDL ratio a dictionary is spread over its punnet; in serving it sits in GPU memory whether or not its stretch is fetched. It must save more link bytes than the slots its memory would hold. Tree dictionaries (the campaigns' best ratio) never do; light ones barely do ([[#picks-bytes-side]], [[#picks-slot-price]]).
5. **The best design measured keeps no dictionary per sequence.** At the Pin, each design at its best hot-cache size: HiSparse as published 109.5 sequences per GPU; HiSparse with a resized hot cache 127; light dictionaries on a shelf 127–133; tree dictionaries on a shelf 88–108; a solo code for every miss, with no bytes per sequence, 141 ([[#picks-slot-price/napkin]]).

::: figure fig-picks-napkin-headline picksNapkin wide
**Sequences per GPU at the Pin, each design at its best hot-cache size.** Horizontal axis: sequences per GPU on the Pin's rig (GLM-5.1, 78 layers, 640-byte picks, 30 ms per step, a 50 GB/s link, 30 GB for orchards). One row per design, in three groups: HiSparse with no compression (as published at 4096 slots, and with its hot cache resized to about 4740); dictionaries kept per sequence, on a shelf or all resident (light, mid and tree, from the campaigns' compressors); a global code with no bytes per sequence (solo, ratio 0.804). A bar spans the two ends of the extrapolated δ-miss fraction; open circles mark Part VI's assumption (4 × 4096, 0.85). Dashed: HiSparse resized, 127. A static view of [[#fig-picks-napkin]]. Grades: derived and extrapolated.
:::

::: pull
At the Pin, four dictionaries of 4096 positions catch 36–54 % of the misses, not 85 %, and a code with no dictionary serves more sequences than any shelf.
:::

::: takeaway
- Stand-in calibrated: 35 / 19 / 9.7 % against HiSparse's 30 / 13.4 / 6.7 %.
- Miss rates follow the share of the context picked; a shelf's catch follows the stretch length over the context to the power 1.27.
- At the Pin: 4 × 4096 catches 36–54 % of misses; a solo code on every miss serves 141 sequences per GPU against 127 for HiSparse resized.
:::

## The potential of each approach, at a glance {#potential}

Sequences per GPU at the Pin, each design at the hot-cache size that suits it best, next to what limits it. The [[lever|two levers]] of [[#app-two-levers]] are both in play: a design wins by shrinking misses (the link bound) or by freeing GPU memory (the memory bound).

| approach | sequences per GPU | what limits it | evidence |
|---|---|---|---|
| HiSparse as published, 4096 slots | 109.5 | the link; GPU memory would hold 147 | [[#picks-ceiling/resized]] |
| HiSparse, hot cache resized to ≈ 4740 slots | 127 | both bounds meet; the baseline for every gain | [[#picks-ceiling/resized]] |
| tree dictionaries on a shelf | 88–108 | each dictionary is half a punnet of resident memory; worse with longer stretches (55–59 at 16 384) | [[#picks-slot-price/stretch-length]] |
| mid dictionaries (dictionary share 0.10) on a shelf | 118–124 | the same, ten times lighter | [[#picks-slot-price/napkin]] |
| light dictionaries (0.02) on a shelf | 127–133 | 0–5 % over the resized cache; $\vfD$ at the Pin | [[#picks-slot-price/napkin]] |
| solo code on every miss, no bytes per sequence | 141 (144 ideal) | a GPU decoder of ≥ 500 GB/s, not yet built | [[#picks-ceiling/half-gain]] |
| any global code at the floors 0.60 / 0.57 | 162 / 166 | the ceiling: +31 % over the resized cache | [[#picks-ceiling/half-gain]] |

The last row is a bound, not a design: no compressor has reached 0.57, and today reaching it takes a per-sequence dictionary ([[#picks-bytes-side/floors]]).

::: takeaway
- Resized HiSparse 127 is the baseline; light shelf 127–133; solo on every miss 141; tree shelf 88–108.
- The ceiling of the miss path at the Pin is 166 sequences per GPU, +31 %, at the whole-sequence floor of 0.57.
:::

## What changed elsewhere on the site {#what-changed}

- **Part VI.** The napkin pages keep $\vfD$ = 0.85 and $\vnload$ = 0.05 as the assumed values of their figures; a note on each gives what the replay measured ([[#app-shelf-and-two-misses]], [[#app-on-fire]], [[#app-the-napkin]]).
- **Part VII.** The heavy-stretch hypothesis has a verdict ([[#hypotheses-heavy-stretches]]).
- **Part X.** The queries-and-picks experiment and the replay are marked as run ([[#plan-queries-and-picks]], [[#plan-hot-cache-replay]]); the decision rules are read ([[#plan-decision-rules]]).
- **Part XII.** The summary and the grounded numbers carry the headline numbers ([[#reference-summary]], [[#reference-numbers]]).

What did not change. The Bench's pill still reads "not measured" for miss rates: the traces ran on another LLM. The compression scenario, its scores and Part VIII are untouched; this Part measures *which* picks are wanted, and borrows *what is inside them* from Part VIII only at the napkin.

::: theme which-vs-what
The replay never opens a cherry. Every count up to [[#picks-shelf]] is a statement about which positions the indexer wants; the bytes those positions hold come from Part VIII, and the two meet only in the napkin.
:::

::: takeaway
- Part VI's assumed values stay in its figures, with notes giving the measured ones; VII.8 has a verdict; X.5, X.6 and X.9 are marked as run and read.
- The Bench's miss rates are still unmeasured; nothing about bytes changed.
:::

## How to read this Part {#how-to-read}

The pages follow the chain of the diagram above: the setting (XI.2–4), the hot cache (XI.5–6), stretches and the shelf (XI.7–8), the bytes and the napkin (XI.9–11), the indexer (XI.12) and the consequences (XI.13).

Every number on these pages has one of four grades, and says which.

1. **Measured**: an exact replay of the stored traces, every step from position 8192 on counted. Means over 140 (sequence, layer) pairs, with the range of the five per-sequence means in brackets.
2. **Derived**: arithmetic or a fit on measured numbers, with the formula.
3. **Extrapolated**: carried to the Pin's 100K context by a rule fitted inside the dump.
4. **Their measurement**: HiSparse's numbers on its one GLM-5.1 trace.

The campaigns' MDL ratios keep their own grades (verified, code-length estimate, extrapolation; [[#measured-dispatch]]). The caveats that travel with every number are listed on [[#picks-what-it-means/caveats]]: a stand-in indexer, one 1.5B LLM, contexts of 24.5K–30K tokens, prefill queries, squeezed scores for V4's rows, the campaigns' ratios carried to the Pin's latents, one genre of text.

::: aside source Receipts
The experiment repository is bachelor-kv (private, `dborzov/bachelor-kv`), read at commit 8f5a471 (3 November 2026). `docs/results.md` "The answer in five lines", §4 and §4b are the source of every number on this page; each summary it reads (`results/summary/{hotcache,attention,shelf,napkin,napkin_grid,raster_excerpt}.json`) holds its own receipt (script hash, input hashes, commit, date). The worked example: `raster_excerpt.json` (sequence 2, layer 9, steps 19 300 to 19 899; 97.7 misses per step, $\vfD$ 0.579; step 19 490: 220 misses, 190 δ-misses). The method is `docs/design.md`; the next experiments are `docs/next-steps.md`.
:::

::: takeaway
- Read in order: the setting (XI.2–4), the hot cache (XI.5–6), stretches and the shelf (XI.7–8), bytes and the napkin (XI.9–11), the indexer (XI.12), consequences (XI.13).
- Grades: measured, derived, extrapolated, their measurement.
:::
