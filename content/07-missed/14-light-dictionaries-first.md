---
title: Light dictionaries first
nav: Light dictionaries first
group: Design changes
lede: A per-channel location-and-scale dictionary weighs about two entries. Kept on the GPU for every block of every request, it costs a few percent of the hot cache — and the hardest question of the design, which dictionaries to keep resident, goes away.
cards:
  - q: About how much does the loc dictionary weigh, in entries' worth?
    a: About 2 — one location and one scale per channel
    wrong: ["About 256", "About 32", "About 1,280"]
    why: An entry has one 8-bit number per channel; a location and a scale per channel are about two entries' worth.
    sec: weight
  - q: In the reference setting with blocks of 2,048 tokens, what does keeping a loc dictionary for every block cost, per layer?
    a: About 98 entries' worth — 2.4 % of a 4,096-slot hot cache
    wrong: ["About 4,096 entries' worth — as much as the hot cache", "About 12,500 entries' worth", "Nothing at all"]
    why: '100,000 / 2,048 ≈ 49 blocks × w = 2 ≈ 98. Per request, across 78 layers, that is about 4.9 MB against a 205 MB hot cache.'
    sec: weight
  - q: If every block's dictionary is resident, what are the δ-miss fraction and the dictionary-load rate?
    a: 'Every miss is a δ-miss ($\vfD = 1$), and no dictionaries are loaded during decoding ($\vnload = 0$)'
    wrong: ["Half the misses are δ-misses, with one load per step", "It depends on the residency policy", "None — light dictionaries cannot serve misses"]
    why: Every miss finds its dictionary on the GPU; there is no residency policy to tune and no dictionary traffic.
    sec: residency
  - q: 'With ρ = 0.75 assumed, blocks of 2,048 and every dictionary resident, which type gains on HiSparse''s 109 requests per GPU?'
    a: loc (about 143, 1.31×); a rank-16 basis already loses a little (106)
    wrong: ["Only the 256-centroid codebook", "All types gain equally", "None — residency always costs too much"]
    why: The light dictionary costs 2.4 % of the hot cache; the rank-16 basis costs 38 %, and the codebook three times the hot cache.
    sec: residency
  - q: When does framework C (where misses land) become necessary?
    a: Only if wave 1 shows that heavy dictionaries are needed — that is, if the data is clustered
    wrong: ["Always, before anything else", "Never — it was dropped", "Only for values, never for keys"]
    why: With light dictionaries all resident, f_D = 1 by construction; residency matters only for dictionaries too heavy to keep everywhere.
    sec: plan
---

Two travellers set off through fifty countries. One carries a pocket phrasebook for each; together they fit in a coat pocket. The other carries one heavy encyclopaedia at a time, posting it home at every border and ordering the next. The second traveller knows more words. The first never has to plan.

kv-blockdiff faces the same choice for its dictionaries. A light one can travel with every block. A heavy one has to be fetched, cached and evicted — and that machinery is the hardest part of the design.

::: note history What the first draft did not see
It pictured heavy per-block dictionaries (codebooks of hundreds of centroids) and a [[dictionary-cache]] with a residency policy at the heart of the system. Item 13 of the old list: *a per-channel location/scale dictionary weighs w ≈ 2: it can be kept resident for every block of every request. Residency then stops mattering for lever 1.*
:::

## How light is light? {#weight}

::: aside reminder Weight and amortization
A dictionary of [[weight]] $\vw$ takes $\vw$ entries' worth of memory. Shared by a [[block]] of $\vb$ entries, it costs $8\vw/\vb$ bits per element ([[#homework-amortization-rule]]).
:::

Line up the four dictionary types of Part VI at the block size wave 1 uses most, $\vb$ = 2,048 tokens. A request of $\vL$ = 100,000 tokens then has about 49 blocks per [[layer]].

| type | weight $\vw$ | all blocks resident, per layer | share of a 4,096-slot [[hot-cache]] | amortized, bits per element |
|---|---:|---:|---:|---:|
| [[loc]] (location + scale) | 2 | 98 | 2.4 % | 0.008 |
| rank-16 basis ([[klt]]) | 32 | 1,563 | 38 % | 0.13 |
| 256-centroid codebook ([[vq]]) | 256 | 12,500 | 305 % | 1.0 |
| full basis, $\vd$ = 640 | 1,280 | 62,500 | 1,526 % | 5.0 |

Notice the jump. The first row is a rounding error. The second already costs a third of the hot cache; the last two cost more than the hot cache itself.

Per request, across all $\vNL$ = 78 layers of the [[reference-setting]], the loc row is about 4.9 MB, next to a 205 MB hot cache. Each block's loc dictionary takes two slots' worth of GPU memory. The old list said "smaller than one hot-cache slot per block"; with $\vw$ ≈ 2 it is two, and the conclusion stands.

::: takeaway
- loc weighs about 2 entries; for every block of a 100K-token request it costs ~2.4 % of the hot cache.
- A rank-16 basis already costs 38 %, a codebook three hot caches: heavy dictionaries cannot travel with every block.
:::

## Residency stops mattering {#residency}

If every block's dictionary is on the GPU, the [[dictionary-cache]] has nothing to decide.

- Every miss is a [[delta-miss]]: the [[delta-miss-fraction]] is $\vfD$ = 1.
- No dictionaries are loaded during decoding: $\vnload$ = 0.
- There is no residency policy to design and no block-level trace replay to run for lever 1.

What remains is a clean trade: less link traffic per miss against a little more GPU memory per request. The figure prices it for every type at once.

::: aside reminder Requests per GPU
A GPU serves $\vN = \min(\vNlink, \vNhbm)$ requests: the link bound shrinks as each step moves more bytes, the memory bound as each request occupies more GPU memory ([[#idea-two-levers]], [[#homework-economics]]).
:::

::: figure fig-missed-residency mbResidency
**What it costs to keep a dictionary for every block.** Bars: requests per GPU, $\vN = \min(\vNlink, \vNhbm)$, in the [[reference-setting]] (hot cache of 4,096 slots, 13.4 % misses, 50 GB/s link, 30 ms per token, 30 GB of GPU memory for KV, 100,000-token requests). For each type, every block's dictionary is resident and every miss moves a delta of $\vrho\,\ve$ bytes; the delta ratio $\vrho$ is **assumed**, the same for all types, so that only the memory cost differs. Grey: HiSparse; green: better than HiSparse; red: worse. The table gives each type's resident memory. Slide the block size and the assumed $\vrho$.
:::

::: try
1. At the defaults ($\vb$ = 2,048, $\vrho$ = 0.75): loc reaches 143 requests per GPU against HiSparse's 109 (1.31×), and is now limited by memory, not the link.
2. The rank-16 basis lands at 106 — slightly *worse* than HiSparse. The 256-centroid codebook falls to 36.
3. Set $\vrho$ = 0.85: loc still gains (129, 1.18×). Slide $\vb$ down to 512: loc barely moves, while every heavier type collapses.
:::

::: theme amortize
At $\vw$ ≈ 2 the fixed cost is so small that it hardly matters how many entries share it. For heavy dictionaries the same $8\vw/\vb$ decides everything — and keeping them for every block is out of reach.
:::

::: takeaway
- With light dictionaries resident everywhere, $\vfD$ = 1 and $\vnload$ = 0: lever 1 needs no residency policy.
- In the reference setting loc turns HiSparse's 109 requests into ~143 at an assumed $\vrho$ = 0.75; the heavy types lose.
:::

## What changes in the plan {#plan}

The default design becomes: **light dictionaries, all resident**. That means loc at block or request [[scope]], possibly with a global basis (scope global costs nothing per request). Heavy dictionaries become a branch that only the data can open.

```graph
id: missed-light-first
columns: [Wave 1 asks, Then, So]
nodes:
  - {id: q, col: 1, row: 1, title: "Do loc and the KLT bound capture the gain?", text: "Compare them with VQ on the same blocks.", link: plan-experiment-1b}
  - {id: light, col: 2, row: 1, title: "Yes: light dictionaries", text: "All resident; every miss a δ-miss; no loads.", link: missed-light-dictionaries-first/residency, term: loc}
  - {id: lever1, col: 3, row: 1, title: "Lever 1, then the victim tier", text: "Same decoder, no residency policy.", link: missed-victim-tier}
  - {id: heavy, col: 2, row: 2, title: "No: the data clusters", text: "Codebooks beat loc + KLT by a margin.", link: missed-rate-distortion-bounds/vq, term: vq}
  - {id: c, col: 3, row: 2, title: "Framework C decides", text: "Where misses land; δ-miss share and loads per step.", link: questions-framework-c, term: dictionary-cache}
edges:
  - [q, light, "yes"]
  - [q, heavy, "no"]
  - [light, lever1]
  - [heavy, c]
```

:::: compare Light versus heavy dictionaries
::: col Light (loc, a global basis)
- Weight ≈ 2 per block; free at global scope.
- Resident everywhere: $\vfD$ = 1, no loads.
- Catches drifting means and the few channels with large, slowly varying values.
:::
::: col Heavy (codebooks, per-block bases)
- Weight 32–1,280 per block.
- Must be cached and fetched: $\vfD$ and $\vnload$ depend on where misses land.
- Worth it only if the data clusters ([[#missed-rate-distortion-bounds]]).
:::
::::

Risks R4 and R7 of the plan ([[#plan-risks]]) shrink accordingly. The question "do misses pile into a few heavy blocks?" ([[#questions-q3]]) still matters for the science, but lever 1 no longer waits for its answer.

::: takeaway
- Default: loc everywhere, always resident. Framework C runs only if wave 1 says the data needs heavy dictionaries.
- All-resident light dictionaries are also what makes the victim tier possible ([[#missed-victim-tier]]).
:::
