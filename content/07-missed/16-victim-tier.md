---
title: A victim tier of deltas
nav: The victim tier
group: Design changes
lede: Lever 2 without the hard kernel. When the hot cache evicts an entry, keep its small delta on the GPU for a while. If the indexer asks for the entry again, rebuild it there instead of fetching it over the link. How much that buys is read straight off the reuse-distance curve.
cards:
  - q: What does the victim tier hold?
    a: The deltas of entries recently evicted from the raw hot cache, whose block dictionaries are on the GPU
    wrong: ["Raw copies of the most-used entries", "The block dictionaries themselves", "Entries the indexer has not selected yet"]
    why: A delta is ρe bytes instead of e, so the tier keeps many more evicted entries within reach for the same memory.
    sec: idea
  - q: 'A hot cache of $\vB$ raw slots plus a victim tier of $\vBV$ deltas reaches how many entries without the link, at what GPU-memory cost?'
    a: '$\vB + \vBV$ entries, for about $\vB + \vrho\,\vBV$ slots'' worth of memory (plus the dictionaries)'
    wrong: ['$\vB$ entries, for $\vB + \vBV$ slots', '$\vBV$ entries, for $\vrho\,\vB$ slots', '$\vB + \vBV$ entries, for $\vB + \vBV$ slots']
    why: Each victim-tier slot holds a delta of ρe bytes; the raw slots are unchanged.
    sec: idea
  - q: Why can the victim tier's value be read off the reuse-distance curve?
    a: 'Under LRU, an entry sits in the victim tier exactly when its stack distance is between $\vB$ and $\vB + \vBV$, so the extra hits are $\vm(\vB) - \vm(\vB + \vBV)$'
    wrong: ["Because the victim tier never misses", "Because deltas are always smaller than half an entry", "It cannot; it must be simulated with a GPU kernel"]
    why: 'LRU is a stack algorithm; the tier is just the next $\vBV$ rows of the recency stack.'
    sec: curve
  - q: Where does the victim tier's decoding run, compared with the full lever 2?
    a: At promotion time, outside the attention kernel — the full lever 2 must decode inside the attention gather
    wrong: ["Inside the attention gather, like lever 2", "On the CPU", "Nowhere — entries in the tier are used as deltas"]
    why: That is why it needs only the lever-1 decoder, run on promotions, instead of a fused kernel at ~370 GB/s.
    sec: curve
  - q: What does wave 2 measure so the victim tier can be priced without extrapolation?
    a: The full reuse-distance distribution of the proxy trace
    wrong: ["Only the hit rate at B = 4096", "The size of the deltas of evicted entries", "The Bélády miss rate"]
    why: 'With the whole distribution, $\vm(\vB + \vBV)$ is a look-up for every $\vB$ and $\vBV$.'
    sec: plan
---

Your laptop already does this. When Linux runs short of memory it must push some pages out to disk. With zswap switched on, it first compresses them into a reserved corner of memory. If a page is wanted again soon, it is decompressed in microseconds instead of read back from disk in milliseconds. Processor designers have a similar trick from 1990: a small *victim cache* that catches the lines a cache has just thrown out (Jouppi). Things evicted recently are the things most likely to come back.

::: note history What the first draft parked
It had two levers ([[#idea-two-levers]]). [[lever|Lever 2]] makes hot-cache slots cheaper by storing them as deltas. In full, every attention read must decode inside the attention gather, at about 370 GB/s per GPU — a hard fused kernel. So it parked lever 2 as "later". Item 15 of the old list found a gentler form that gets most of the benefit: *a victim tier of deltas.*
:::

## The idea {#idea}

::: define victim-tier
- **What it is:** a second tier in GPU memory that holds the [[delta|deltas]] of entries just evicted from the raw [[hot-cache]]. If the [[indexer]] selects one of them again, the GPU rebuilds the [[entry]] from its delta and its block's [[dictionary]] — one gather and an add — and puts it back into the hot cache. Nothing crosses the link.
- **Size:** $\vBV$ deltas per layer per request, each $\vrho\,\ve$ bytes.
- **Example:** with $\vB$ = 2,048 raw slots and $\vBV$ = 3,200 deltas, an entry evicted a few steps ago is still on the GPU, at 0.65 of the bytes (assumed $\vrho$).
- **Easy to confuse with:** the [[dictionary-cache]], which holds dictionaries, not deltas; and the full lever 2, which stores even the entries attention is reading as deltas.
:::

Its life cycle has three steps:

1. **Evict.** The hot cache stays LRU, unchanged. The evicted entry's delta goes into the victim tier, if its dictionary is resident. With light dictionaries it always is ([[#missed-light-dictionaries-first]]). For loc, re-encoding at eviction is a single subtraction.
2. **Promote.** A selected entry found in the tier is rebuilt and moved into the hot cache. The decode happens here, at promotion time, outside the attention kernel.
3. **Drop.** When the tier is full, its oldest delta is dropped. The entry still lives in host memory.

$$
\underbrace{\vB + \vBV}_{\text{entries reachable without the link}}
\quad\text{for the GPU memory of}\quad
\underbrace{\vB + \vrho\,\vBV}_{\text{slots' worth, plus the dictionaries}}
$$ {#eq-missed-victim}

::: takeaway
- The victim tier keeps recently evicted entries on the GPU as deltas; a repeat selection is rebuilt there, not fetched.
- It reaches $\vB + \vBV$ entries for $\vB + \vrho\,\vBV$ slots' worth of memory, and needs only the lever-1 decoder.
:::

## Reading it off the curve {#curve}

::: aside reminder The stack-distance curve
Under LRU, a cache of $\vB$ slots holds exactly the top $\vB$ rows of the recency stack, so its miss rate $\vm(\vB)$ is the share of requests with stack distance at least $\vB$ ([[#missed-stack-distance]]). HiSparse's points sit close to $\vm \propto \vB^{-1.08}$.
:::

The victim tier is simply the next $\vBV$ rows of the stack. A selection whose stack distance falls between $\vB$ and $\vB + \vBV$ was a miss and is now a promotion. Its value is $\vm(\vB) - \vm(\vB + \vBV)$, read off the curve.

::: figure fig-missed-victim mbVictimTier wide
**The victim tier on the reuse-distance curve, in the reference setting.** *Left:* miss rate against cache size (both axes logarithmic). Grey line: a power law through HiSparse's measured LRU points (vermilion dots; anchored at 13.4 % for 4,096 slots); peacock dot: Bélády's 8.2 % at 4,096. Blue band: stack distances served by the raw hot cache of $\vB$ slots; red band: those served by the victim tier. Accent dot: the miss rate with the tier; grey dot: a plain raw cache using the same GPU memory. *Right:* requests per GPU, $\vN = \min(\vNlink, \vNhbm)$, as the tier grows; the lines mark HiSparse at 4,096 slots and the best plain raw cache of any size. Memory includes loc dictionaries for every block ($\vb$ = 2,048, 98 slots' worth per layer). Tiles: miss rate over the link, GPU memory per request, requests per GPU, and the decode rate needed on promotions (raw-equivalent bytes per second per GPU). $\vrho$ is **assumed**. Choose $\vB$, slide $\vBV$ and $\vrho$; the button makes misses move deltas too (lever 1).
:::

::: try
1. The default: $\vB$ = 2,048 (just the current selection), $\vBV$ = 3,200, $\vrho$ = 0.65. The link now sees 10.3 % misses for 4,226 slots' worth of memory — about HiSparse's own 4,096 — and a GPU serves about 142 requests. The best plain raw cache of *any* size serves 127; HiSparse at 4,096 slots, 109.
2. Press *misses move deltas too*, then set $\vBV$ to 2,176: both levers together reach about 169 requests per GPU.
3. Watch the decode tile: around 90 GB/s per GPU on promotions for the victim tier alone, about 160 with lever 1 as well. That is a fraction of the ~370 GB/s the full lever 2 needs, and well inside what fixed-length decoders do ([[#papers-splitzip]]).
4. Choose $\vB$ = 8,192: memory binds at once, and every delta added only lowers the count.
:::

Three ways to cut misses, side by side:

:::: cols
::: col Better eviction
Same memory, smarter choices. Bélády, who knows the future, gets 8.2 % at 4,096 slots against LRU's 13.4 %. That is the ceiling, and no real policy reaches it.
:::
::: col A bigger raw cache
More memory per request, and the miss rate slides down the curve. In the reference setting memory soon binds, and the count of requests falls.
:::
::: col A victim tier
The same LRU, but the tail of the stack is stored at $\vrho$ of the price. More of the curve for the same memory.
:::
::::

::: note warning How solid are these numbers?
- $\vrho$ is assumed; wave 1 measures it.
- The configurations above reach 4,200–5,300 entries, *between* HiSparse's measured points at 4,096 and 8,192. That is interpolation, not extrapolation, but it rests on one prompt and one model.
- Rebuilding needs the block's dictionary on the GPU. With heavy dictionaries the tier would inherit the whole residency problem.
:::

::: theme which-vs-what
This design cashes in both properties at once. Its value comes from *which* entries come back (the reuse curve, a property of the queries). Its cost comes from *what* they contain ($\vrho$, a property of the bytes). Measure them apart; multiply them here.
:::

::: takeaway
- In the reference setting, with an assumed $\vrho$ = 0.65, a victim tier lifts requests per GPU from the best raw cache's ~127 to ~142, and to ~169 with lever 1.
- Its decode runs at promotion, at roughly 90–160 GB/s per GPU: a fixed-length lever-1 decoder suffices.
:::

## What changes in the plan {#plan}

:::: compare Two ways to make slots cheaper
::: col Victim tier
- Raw hot cache unchanged; deltas only for the evicted tail.
- Decode at promotion, outside attention.
- Needs: the lever-1 decoder, light dictionaries.
:::
::: col Full lever 2
- Hot-cache entries of heavy blocks stored as deltas too.
- Decode inside the attention gather, every read.
- Needs: a fused kernel at ~370 GB/s per GPU, fixed-length deltas.
:::
::::

- **Wave 2 measures the whole reuse-distance distribution** of the proxy trace, so the tier's value is a look-up for every $\vB$ and $\vBV$ ([[#plan-wave2-measure]]).
- **The cost model gets a victim-tier column** ([[#questions-framework-d]]), next to lever 1 alone.
- **The build order becomes:** lever-1 decoder → victim tier (the same decoder, at promotion) → full lever 2 only if still needed. If the decoder cannot run at gather speed (risk R8 of [[#plan-risks]]), the victim tier is the fallback.

::: takeaway
- The victim tier is the cheap first step of lever 2: same decoder, no fused kernel.
- Its value comes from the reuse-distance distribution that wave 2 records anyway.
:::
