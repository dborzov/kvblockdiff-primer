---
title: The same trace, with dictionaries
nav: The same trace, with dictionaries
group: The mechanism
lede: Replay the three steps of the HiSparse toy trace with a dictionary shelf added. The picks, the hits and the evictions do not change at all. Only the price tag on each miss does, and the toy shows the catch too.
cards:
  - q: Replaying the toy trace with kvblockdiff, how do the hits and evictions compare with HiSparse?
    a: They are identical, step for step
    wrong: ["There are more hits", "There are fewer evictions", "Different picks are evicted"]
    why: kvblockdiff changes only how a miss is served (delta or raw), not which picks are in the hot cache.
    sec: replay
  - q: In step 1 of the toy trace, why is the miss on pick 14 a raw miss?
    a: Its stretch (stretch 3) has no dictionary on the shelf at that moment
    wrong: ["Pick 14 was never picked before", "The hot cache was full", "Stretch 3 has no dictionary at all"]
    why: The shelf holds the dictionaries of stretches 0 and 2 before step 1. Stretch 3's dictionary is loaded only after the step.
    sec: replay
  - q: 'With a light dictionary ($\vw = 2$) and $\vrho = 0.75$, how many δ-misses must a loaded dictionary serve to pay for its own load?'
    a: Eight
    wrong: ["Two", "One", "Seventy-five"]
    why: 'Each δ-miss saves $(1-\vrho)\ve$; the load costs $\vw\,\ve$. Break-even at $\vw/(1-\vrho) = 2/0.25 = 8$ δ-misses.'
    sec: lessons
  - q: Over the three toy steps, does kvblockdiff move fewer bytes than HiSparse (ρ = 0.75, w = 2)?
    a: 'No: 2 880 against 1 920 bytes, because the one dictionary load is not yet paid back'
    wrong: ["Yes: 1 280 against 1 920 bytes", "Yes: exactly a quarter less", "They move exactly the same"]
    why: 'One raw miss (640) + two δ-misses (960) + one load of 2 cherries'' worth (1 280) = 2 880 bytes. A dictionary pays only over many steps.'
    sec: lessons
---

On [[#landscape-toy-trace]] we watched HiSparse's hot cache through three decode steps of a toy trace: one layer, 16 stored positions, a [[hot-cache]] of $\vB = 6$ slots, $\vk = 4$ picks per step. Each step had three hits and one miss, and every miss cost a full cherry on the link.

Now run the same trace through the resolve step of [[#app-shelf-and-two-misses]]. Cut the 16 positions into [[stretch|stretches]] of $\vb = 4$, so each stretch's four cherries form one [[punnet]] with one dictionary, and give the GPU a [[dictionary-shelf]] with room for $\vnD = 2$ dictionaries.

## Replay {#replay}

::: figure fig-app-toy-trace toyTraceBlockdiff
**The toy trace of Part III, replayed with a dictionary shelf.** Top row: the 16 positions of one layer's orchard (0–15) in four stretches of four; a tinted, labelled frame marks a stretch whose dictionary is on the shelf at the start of the step. Dark outlines mark the four picks of the indexer; their fill shows what each cost: grey a hit (nothing crosses the link), green a [[delta-miss]] (the delta crosses), brown a [[raw-miss]] (the full cherry crosses). Bottom row: the hot cache after the step, oldest pick on the left, with the evicted pick dashed; the arrow follows the miss into its slot. Step through with the buttons (or the arrow keys). The figure computes every step with HiSparse's resolve rule and the toy residency rule of the previous page, and checks the result against the expected values stored with the trace. The table below adds up the bytes on the link; the sliders set the assumed delta share $\vrho$ and dictionary weight $\vw$ (in cherries' worth).
:::

::: try
1. Step through once and compare each step with the plate of [[#landscape-toy-trace]]: the same picks, the same hits, the same evictions.
2. Watch the frames in step 1. Stretch 3's dictionary is absent when pick 14 misses, so it is a raw miss. Afterwards stretches 2 and 3 own the most hot picks, so stretch 3's dictionary is loaded and stretch 0's dropped.
3. In steps 2 and 3 the misses land in stretches 2 and 3, whose dictionaries are now on the shelf: two δ-misses.
4. Set $\vw = 1$ and slide $\vrho$ down. The toy beats HiSparse's 1 920 bytes only below $\vrho = 0.5$: three steps are too few to pay for a load.
:::

::: aside reminder The toy residency rule
After each step, keep the dictionaries of the $\vnD$ stretches that own the most picks in the hot cache; a newly kept dictionary is loaded over the link ($\vw\,\ve$ bytes), a dropped one is simply forgotten. From [[#app-shelf-and-two-misses]].
:::

::: takeaway
- Same picks, same hits, same evictions as HiSparse; only the bytes per miss change.
- Step 1 is a raw miss followed by a dictionary load; steps 2 and 3 are δ-misses.
:::

## What the toy shows, and what it hides {#lessons}

Add up the three steps with an assumed $\vrho = 0.75$ and a light dictionary of $\vw = 2$ cherries' worth, with 640-byte cherries.

| | HiSparse | kvblockdiff |
|---|---|---|
| misses | 3 raw | 1 raw + 2 δ |
| miss bytes | 3 × 640 = 1 920 B | 640 + 2 × 480 = 1 600 B |
| dictionary loads | none | 1 × 2 × 640 = 1 280 B |
| **total on the link** | **1 920 B** | **2 880 B** |

The misses got cheaper, and the total got *worse*. The one dictionary load cost more than the two δ-misses saved. That is not a flaw of the toy. It is the economics of every dictionary, in miniature:

$$
\text{a load pays for itself after}\quad \frac{\vw\,\ve}{(1-\vrho)\,\ve} \;=\; \frac{\vw}{1-\vrho} \quad \text{δ-misses in that stretch.}
$$ {#eq-app-break-even}

At $\vw = 2$ and $\vrho = 0.75$ that is 8 δ-misses; the toy gives the dictionary only 2 before it ends. At the measured points of Part VIII the numbers are far larger: the light compressor's dictionary ($\vw \approx 86$, $\vrho = 0.665$) needs about 260 δ-misses, the reference tree's ($\vw \approx 2150$, $\vrho = 0.112$) about 2 420. A dictionary is worth loading only if its stretch keeps attracting misses for a while.

::: theme amortize
The trained dictionary of Part I paid off over millions of messages. A punnet dictionary must pay off over the misses its stretch attracts while it sits on the shelf. Three steps are too few; many steps on a busy stretch are plenty.
:::

What the toy hides is the scale. On [[pin|the Pin]] there are about 274 misses per layer per step, not one ([[#landscape-derived-numbers]]). Whether those misses keep landing in the same few stretches for many steps, so that a few dictionaries serve most of them and loads are rare, is a property of real pick traces that nobody has measured. It gets its own name, the heavy stretch, its own mechanism ([[#app-on-fire]]) and its own hypothesis page ([[#hypotheses-heavy-stretches]]).

There is also an escape the toy does not show. A light enough dictionary need not be loaded at all: it can stay resident for every stretch of every sequence. Then there are no loads, every miss is a δ-miss, and the residency question disappears. That corner, and the opposite one, are the next-but-one page ([[#app-two-boring-corners]]).

::: takeaway
- In the toy, kvblockdiff moves *more* bytes than HiSparse: one dictionary load outweighs two δ-misses.
- A load pays off after $\vw/(1-\vrho)$ δ-misses in its stretch: 8 for a toy dictionary, about 260 for the light measured point, about 2 420 for the reference tree.
- So the design needs misses that concentrate in a few long-lived stretches, or dictionaries light enough to keep resident everywhere.
:::
