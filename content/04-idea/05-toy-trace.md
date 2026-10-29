---
title: The same trace, with dictionaries
nav: The same trace, with dictionaries
lede: Replay the three steps of the HiSparse toy trace with a dictionary cache added. The picks, the hits and the evictions do not change at all. Only the price tag on each miss does — and the toy shows the catch, too.
group: The idea
cards:
  - q: Replaying the toy trace with kv-blockdiff, how do the hits and evictions compare with HiSparse?
    a: They are identical, step for step
    wrong: ["There are more hits", "There are fewer evictions", "Different entries are evicted"]
    why: kv-blockdiff changes only how a miss is served (delta or raw), not which entries are in the hot cache.
    sec: replay
  - q: In step 1 of the toy trace, why is the miss on entry 14 a raw miss?
    a: Its block (block 3) has no dictionary on the GPU at that moment
    wrong: ["Entry 14 was never selected before", "The hot cache was full", "Block 3 has no dictionary at all"]
    why: The shelf holds the dictionaries of blocks 0 and 2 before step 1. Block 3's dictionary is loaded only after the step.
    sec: replay
  - q: With a light dictionary ($\vw = 2$) and $\vrho = 0.75$, how many δ-misses must a loaded dictionary serve to pay for its own load?
    a: Eight
    wrong: ["Two", "One", "Seventy-five"]
    why: 'Each δ-miss saves $(1-\vrho)\ve$; the load costs $\vw\,\ve$. Break-even at $\vw/(1-\vrho) = 2/0.25 = 8$ δ-misses.'
    sec: lessons
  - q: Over the three toy steps, does kv-blockdiff move fewer bytes than HiSparse (ρ = 0.75, w = 2)?
    a: No — 2,880 against 1,920 bytes, because the one dictionary load is not yet paid back
    wrong: ["Yes — 1,280 against 1,920 bytes", "Yes — exactly a quarter less", "They move exactly the same"]
    why: 'One raw miss (640) + two δ-misses (960) + one load of 2 entries’ worth (1,280) = 2,880 bytes. A dictionary pays only over many steps.'
    sec: lessons
---

On [[#landscape-toy-trace]] we watched HiSparse's hot cache through three decode steps of a toy trace: one layer, 16 stored entries, a hot cache of $\vB = 6$ slots, $\vk = 4$ selections per step. Each step had three hits and one miss, and every miss cost a full entry on the link.

Now run the same trace through the resolve step of [[#idea-blockdiff-step-by-step]]. Cut the 16 entries into [[block|blocks]] of $\vb = 4$, and give the GPU a [[dictionary-cache]] with room for $\vnD = 2$ dictionaries.

## Replay {#replay}

::: figure fig-idea-toy-trace toyTraceBlockdiff
**The toy trace of Plate III.7, replayed with a dictionary cache.** Top row: the 16 entries of the history (positions 0–15) in four blocks of four; a tinted, labelled frame marks a block whose dictionary is on the GPU at the start of the step. Dark outlines mark the four entries the indexer selects; their fill shows what each cost: grey a hit (nothing crosses the link), green a [[delta-miss]] (the delta crosses), brown a [[raw-miss]] (the full entry crosses). Bottom row: the hot cache after the step, oldest entry on the left, with the evicted entry dashed; the arrow follows the miss into its slot. Step through with the buttons (or the arrow keys). The figure computes every step with the resolve rule of III.6 and the toy residency rule of IV.4, and checks the result against the expected values stored with the trace. The table below adds up the bytes on the link; the sliders set the assumed delta ratio $\vrho$ and dictionary weight $\vw$.
:::

::: try
1. Step through once and compare each step with Plate III.7: the same picks, the same hits, the same evictions.
2. Watch the frames in step 1. Block 3's dictionary is cold when entry 14 misses — so it is a raw miss. Afterwards blocks 2 and 3 own the most hot entries, so block 3's dictionary is loaded and block 0's dropped.
3. In steps 2 and 3 the misses land in blocks 2 and 3, whose dictionaries are now resident: two δ-misses.
4. Set $\vw = 1$ and slide $\vrho$ down. The toy beats HiSparse's 1,920 bytes only below $\vrho = 0.5$: three steps are too few to pay for a load.
:::

::: aside reminder The toy residency rule
After each step, keep the dictionaries of the $\vnD$ blocks that own the most entries in the hot cache; a newly kept dictionary is loaded over the link ($\vw\,\ve$ bytes), a dropped one is simply forgotten. From [[#idea-blockdiff-step-by-step]].
:::

::: takeaway
- Same picks, same hits, same evictions as HiSparse; only the bytes per miss change.
- Step 1 is a raw miss followed by a dictionary load; steps 2 and 3 are δ-misses.
:::

## What the toy shows, and what it hides {#lessons}

Add up the three steps with an assumed $\vrho = 0.75$ and a light dictionary of $\vw = 2$ entries' worth.

| | HiSparse | kv-blockdiff |
|---|---|---|
| misses | 3 raw | 1 raw + 2 δ |
| miss bytes | 3 × 640 = 1,920 B | 640 + 2 × 480 = 1,600 B |
| dictionary loads | — | 1 × 2 × 640 = 1,280 B |
| **total on the link** | **1,920 B** | **2,880 B** |

The misses got cheaper — and the total got *worse*. The one dictionary load cost more than the two δ-misses saved. That is not a flaw of the toy. It is the economics of every dictionary, in miniature:

$$
\text{a load pays for itself after}\quad \frac{\vw\,\ve}{(1-\vrho)\,\ve} \;=\; \frac{\vw}{1-\vrho} \quad \text{δ-misses in that block.}
$$ {#eq-idea-break-even}

At $\vw = 2$ and $\vrho = 0.75$ that is 8 δ-misses; the toy gives the dictionary only 2 before it ends. At $\vw = 256$ it would be 1,024. A dictionary is worth loading only if its block keeps attracting misses for a while.

::: theme amortize
The trained dictionary of Part I paid off over millions of messages. A block dictionary must pay off over the misses its block attracts while it sits on the shelf. Three steps are too few; many steps on a busy block are plenty.
:::

What the toy hides is the scale. In the [[reference-setting]] there are about 274 misses per layer per step, not one ([[#landscape-derived-numbers]]). Whether those misses keep landing in the same few blocks for many steps — so that a few dictionaries serve most of them, and loads are rare — is a property of real traces that nobody has measured. It gets its own name and its own page: [[#idea-heavy-blocks]].

There is also an escape that the toy does not show. A light enough dictionary need not be loaded at all: it can stay resident for every block of every request. Then there are no loads, every miss is a δ-miss, and the residency question disappears ([[#missed-light-dictionaries-first]]).

::: takeaway
- In the toy, kv-blockdiff moves *more* bytes than HiSparse: one dictionary load outweighs two δ-misses.
- A load pays off after $\vw/(1-\vrho)$ δ-misses in its block: 8 for a light dictionary, about a thousand for a heavy one.
- So the design needs misses that concentrate in a few long-lived blocks — or dictionaries light enough to keep resident everywhere.
:::
