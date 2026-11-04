---
title: The slot price
nav: The slot price
group: Bytes and the napkin
lede: A dictionary on the GPU takes memory that could have held more hot-cache slots, and more slots also mean fewer misses. So a dictionary must save more link bytes than the slots its memory would hold. With the measured miss curve and shelf, tree dictionaries never do, light ones barely do, and longer stretches make every dictionary worse.
cards:
  - q: What is the slot price?
    a: 'The link bytes one more hot-cache slot saves per decode step: about α·m·k·e / B'
    wrong: ["The dollars one GPU-hour costs", "The bytes of one hot-cache slot", "The exchange rate from variance explained to bits"]
    why: 'With m ∝ B^−α, one more slot removes a share α/B of the misses, α·m·k/B misses per layer per step. At HiSparse''s resized cache that is about 0.05 misses, 32 bytes.'
    sec: inequality
  - q: When does one more dictionary on the shelf beat the same memory spent on hot-cache slots?
    a: 'When (1 − ρ) · [f_D gained by that dictionary] · B / w > α'
    wrong: ["Whenever its delta share is below 1", "Whenever f_D exceeds 0.5", "When w is less than B"]
    why: 'The dictionary saves (1 − ρ)·e on each extra δ-miss; its w cherries'' worth of memory would hold w slots, each saving α·m·k·e/B. Loads only make the dictionary''s side worse.'
    sec: inequality
  - q: 'Tree dictionaries (w ≈ 2150 per 4096 positions, ρ = 0.112) at B ≈ 4740: how much must each one raise f_D to beat the slots?'
    a: More than 0.5, which no shelf at the Pin reaches
    wrong: ["More than 0.06", "More than 0.015", "Any positive amount"]
    why: 'α·w / ((1 − ρ)·B) ≈ 2150 / (0.888 × 4740) ≈ 0.5. The first dictionary of 4096 positions catches 0.11–0.20 at the Pin.'
    sec: inequality
  - q: 'At the Pin, each design at its best hot-cache size: which serves the most sequences per GPU?'
    a: 'A solo code on every miss with no per-sequence bytes: 141 (ρ = 0.804, verified)'
    wrong: ["Tree dictionaries on a shelf: 88–108", "HiSparse as published: 109.5", "Light dictionaries on a shelf: 127–133"]
    why: 'It keeps no dictionary on the GPU, so every byte it removes from a miss raises the link bound. It needs a GPU decoder of at least 500 GB/s, unmeasured.'
    sec: napkin
  - q: 'Tree dictionaries on a shelf at the Pin: how do sequences per GPU change from stretches of 4096 to 16 384?'
    a: 'They fall, from 88–97 to 55–59'
    wrong: ["They rise, from 88–97 to 120–130, because the ratio improves", "They stay at 127", "They rise to 141"]
    why: 'The ratio improves only from 0.636 to 0.618, while each resident dictionary grows from 2150 to about 8090 slots'' worth per layer.'
    sec: stretch-length
  - q: 'Which dictionary loses least when the stretch grows from 4096 to 16 384 positions?'
    a: 'The light one (dictionary share 0.02): 127–132 at 4096, 126–130 at 16 384'
    wrong: ["The tree (0.5): it gains the most from longer stretches", "C1's 0.25 point", "They all lose the same share"]
    why: 'The memory a dictionary holds is its share times the stretch length; at 0.02 even 16 384 positions make only about 350 slots.'
    sec: stretch-length
---


[[#app-the-napkin]] found that heavy dictionaries stacked on the [[hot-cache|hot cache]] are bound by GPU memory on [[pin|the Pin]]: four tree dictionaries per layer leave room for 47 sequences per GPU against HiSparse's 109. That page fixed the hot cache at 4096 slots and treated the dictionary's memory as an addition. [[#picks-bytes-side]] showed why the memory is the issue: on the GPU a dictionary is resident, not spread over its punnet. This page compares the dictionary with the other use of the same memory, more hot-cache slots, then runs the comparison over every design and every stretch length.

## One more slot against one more dictionary {#inequality}

The hot cache's miss rate falls as a power of its size, $\vm \propto \vB^{-\valpha}$ ([[#picks-hot-cache/calibration]]). Differentiate: one more slot changes the miss rate by $-\valpha\,\vm/\vB$, so it removes $\valpha\,\vm\,\vk/\vB$ of the layer's $\vm\,\vk$ misses per step.

::: define slot-price
- **What it is.** The link bytes one more hot-cache slot saves per layer per decode step: about $\valpha\,\vm\,\vk\,\ve/\vB$. It is set by the slope $\valpha$ of the reuse curve and by where on the curve the cache sits.
- **Example.** HiSparse's measured curve on GLM-5.1 has a slope of 1.0 between 4096 and 8192 slots (13.4 % halves to 6.7 %). At the resized cache of about 4740 slots ([[#picks-ceiling/resized]]), $\vm$ = 11.6 %, so one more slot removes $1.0 \times 0.116 \times 2048 / 4741 \approx 0.050$ misses per step: about 32 bytes at 640 bytes per pick (derived).
- **Easy to confuse with** the exchange rate of [[#school-exchange-rate]], which converts variance explained into bits. The slot price converts GPU memory into link bytes.
:::

Now put a shelf of dictionaries next to the cache. One more dictionary of weight $\vw$ cherries' worth takes the memory of $\vw$ slots. It turns a share $\vfD(\vnD + 1) - \vfD(\vnD)$ of the misses from raw into δ-misses, and each of those moves $\vrho\,\ve$ bytes instead of $\ve$. Compare the link bytes saved per layer per step:

$$
\underbrace{\vm\,\vk\,\big[\vfD(\vnD{+}1) - \vfD(\vnD)\big]\,(1 - \vrho)\,\ve}_{\text{saved by one more dictionary}} \;>\; \underbrace{\vw \cdot \valpha\,\vm\,\vk\,\ve / \vB}_{\text{saved by } \vw \text{ more slots}}
$$ {#eq-picks-slot-compare}

Divide both sides by $\vm\,\vk\,\ve\,\vw/\vB$:

$$
(1 - \vrho)\,\big[\vfD(\vnD{+}1) - \vfD(\vnD)\big]\,\frac{\vB}{\vw} \;>\; \valpha \;\approx\; 1 .
$$ {#eq-picks-slot-price}

The dictionary's loads ([[#picks-shelf]]) are left out; they only add to its side of the link. Plug in the campaigns' dictionaries, at $\vB$ ≈ 4740:

| dictionary | $\vw$ per stretch | $\vrho$ | each dictionary must raise $\vfD$ by more than | at the Pin |
|---|---|---|---|---|
| tree (reference tree + linear prediction, ratio 0.636) | ≈ 2 150 per 4096 positions | 0.112 | ≈ 0.5 | impossible: the first catches 0.11–0.20 |
| light (no tree, ratio 0.686) | ≈ 86 per 4096 positions | 0.665 | ≈ 0.06 | the first four or so clear it, later ones do not |
| light, stretches of 2048 | ≈ 43 | 0.665 | ≈ 0.03 | a reading at the favourable end only ([[#picks-shelf/pin]]) |

A code that keeps no bytes on the GPU per sequence, a [[solo]] code or any global table fixed for the LLM ([[#scenario-scope]]), has $\vw = 0$. It takes no slots, so every byte it removes from a miss is a saving with nothing set against it.

::: takeaway
- Slot price: one more slot saves about $\valpha\,\vm\,\vk\,\ve/\vB$ link bytes per layer per step; 0.05 misses, 32 bytes at HiSparse's resized cache.
- A dictionary beats its memory as slots only if $(1-\vrho)\,[\vfD(\vnD{+}1) - \vfD(\vnD)]\,\vB/\vw > \valpha \approx 1$.
- Tree dictionaries would need each to raise $\vfD$ by 0.5; light ones by 0.06, which the first four or so do at the Pin.
:::

## The napkin at equal GPU memory {#napkin}

The same comparison, run through Part VI's whole bill. The napkin of [[#app-the-napkin]] (its formulas ported line for line) evaluates each design at the hot-cache size $\vB$ that maximises $\vN = \min(\vNlink, \vNhbm)$, with HiSparse's own measured miss curve (log-log through its three points), the shelf's extrapolated $\vfD$ and loads of [[#picks-shelf/pin]], and three of the campaigns' dictionaries from [[#picks-bytes-side/ladder]]: light (dictionary share 0.02, delta share 0.665), mid (0.10, 0.61) and tree (0.525, 0.112). Solo has no per-sequence dictionary and a ratio of 0.804 (verified; 0.778 as a code-length estimate).

| design, at the Pin | sequences per GPU | grade |
|---|---|---|
| HiSparse as published ($\vB$ = 4096) | 109.5 | derived (reproduces Part VI) |
| tree dictionaries on a shelf, best shelf | 88–108 (56 with Part VI's 4 × 4096 and $\vfD$ = 0.85) | extrapolated |
| light dictionaries for every stretch, all resident | 116 | derived |
| mid dictionaries on a shelf, best shelf | 118–124 | extrapolated |
| HiSparse with its hot cache resized ($\vB$ ≈ 4740) | 127 | derived |
| light dictionaries on a shelf, best shelf | 127–133 (142 with $\vfD$ = 0.85) | extrapolated |
| solo code for misses, plus a light shelf | 140–141 | extrapolated |
| **solo code for every miss, no bytes per sequence** | **141** (144 at the code length 0.778) | derived |

A range pairs the best shelf at each end of the shelf's extrapolation, over the stretch lengths where the extrapolation lands inside what the Bachelor measured: 2048 to 16 384 positions at the Pin, 2048 only at the favourable end. The best of every design falls at the shortest of them. Part VI's napkin gives 47 for four tree dictionaries at $\vB$ = 4096; letting $\vB$ shrink to its best value raises that to 56 with the same assumed $\vfD$.

With the stand-in's own miss curve ([[#picks-share-carries/pin-prediction]]) in place of HiSparse's, every design at its best $\vB$ drops by 7.6–11.2 % and keeps its place in the order. Only HiSparse at its fixed 4096 slots, the one design not re-optimised, drops further, by 22 % to 85.6.

::: figure fig-picks-napkin picksNapkin wide
**Sequences per GPU at the Pin, each design at its best hot-cache size.** Horizontal axis: sequences per GPU, $\vN = \min(\vNlink, \vNhbm)$, on the Pin's rig (78 layers, 640-byte picks, 2048 picks per step, 30 ms per step, a 50 GB/s link, 30 GB for orchards). One row per design. Colours: HiSparse with no compression; dictionaries kept per sequence (on a shelf or all resident); a global code with no bytes per sequence. A bar spans the two ends of the extrapolated $\vfD$; open circles mark Part VI's assumption (4 × 4096, $\vfD$ = 0.85). The dashed line is HiSparse with its hot cache resized. Switches: the miss curve (HiSparse's measured one, or the stand-in's prediction for the Pin) and the shelf's $\vfD$ (the low or the high end). Grades: derived and extrapolated; $\vrho$ and $\vw$ are the campaigns' values on Qwen3.5-2B, assumed for the Pin.
:::

::: try
1. Switch the miss curve to the stand-in's. Every row moves left by about a tenth; HiSparse as published, not re-optimised, moves by a fifth.
2. Switch the shelf to the low end of $\vfD$. The light shelf drops to the resized HiSparse line; the solo rows hardly move.
:::

::: takeaway
- At equal GPU memory: tree shelf 88–108, HiSparse 109.5, light all resident 116, mid shelf 118–124, resized HiSparse 127, light shelf 127–133, solo plus light shelf 140–141, solo alone 141.
- The order of the designs at their best $\vB$ holds with the stand-in's own miss curve (7.6–11.2 % lower each).
:::

## Stretch length against residency {#stretch-length}

[[#picks-bytes-side/stretch-ratio]] showed the MDL ratio improving with every doubling of the stretch. On the shelf the same doubling does two other things. It raises $\vfD$, because each stretch covers more of the context ([[#picks-shelf]]), and it doubles the memory each dictionary holds, because that memory is the dictionary share times the stretch length. Which effect wins depends on the dictionary share.

Best sequences per GPU at the Pin, best shelf size, each design at its best $\vB$ (low and high end of the extrapolated $\vfD$):

| dictionary | $\vb$ = 4096 | 8192 | 16 384 |
|---|---|---|---|
| light, dictionary share 0.02 | 127–132 | 127–131 | 126–130 |
| C1, dictionary share 0.10 | 118–122 | 114–118 | 105–109 |
| C1, dictionary share 0.25 | 105–112 | 95–101 | 79–83 |
| tree, dictionary share 0.5 | 88–97 | 74–81 | 55–59 |

A worked example for the tree. At 4096 positions one dictionary holds 0.525 × 4096 ≈ 2150 slots' worth per layer and its MDL ratio is 0.636. At 16 384 positions it holds 0.494 × 16 384 ≈ 8090 slots' worth, more than a whole resized hot cache, for a ratio of 0.618. The ratio improved by 0.018; the memory per dictionary grew 3.8 times. The best shelf at 16 384 holds a single dictionary and serves 55–59 sequences per GPU. The light dictionary at 16 384 positions holds about 350 slots' worth and barely notices the change.

::: figure fig-picks-stretch-n picksStretchN wide
**Sequences per GPU against the stretch length.** Horizontal axis: stretch length at the Pin, 2048 to 16 384 positions (log scale). Vertical axis: sequences per GPU, each design at its best shelf size and its best hot-cache size. One band per compressor point (light; the C1 points at dictionary shares 0.10 and 0.25; the tree), spanning the low and high end of the extrapolated $\vfD$; at 2048 only the high end exists (open circles). A switch sends the raw misses raw or through a solo code. Dashed lines: a solo code on every miss (141) and HiSparse resized (127). Points measured only at 4096 are assumed to keep their shares at other stretch lengths; the tree's shares at 2048 and 8192 are interpolated between its measured 512, 4096 and 16 384. Grades: derived and extrapolated.
:::

::: try
1. Follow the tree band from 4096 to 16 384: it falls from 88–97 to 55–59.
2. Follow the light band: it stays between 127 and 132, at or just above the resized HiSparse line.
3. Switch the raw misses to the solo code. Every band rises; the light band reaches the solo line and stops there.
:::

The explorer below puts every choice in one place: a compressor point, a stretch length, a shelf size, the end of $\vfD$, and a solo code underneath the shelf or none. For each choice it draws both bounds of [[#app-two-levers]] against the hot-cache size, with their crossing, and splits each sequence's link bytes and GPU bytes into their parts.

::: figure fig-picks-explorer picksExplorer wide
**The napkin, one design at a time.** Controls: the compressor point (light, the C1 points under a budget of 0.02, 0.10 and 0.25 or none, the tree), the stretch length (2048 to 32 768), the shelf size $\vnD$ (1 to 32, with a button for the best one), the end of the extrapolated $\vfD$ (low or high), and whether the raw misses are sent raw or solo-coded. Tiles: sequences per GPU and which bound binds, the best hot-cache size, the change against HiSparse resized. Plot: sequences per GPU against the hot-cache size $\vB$ (log scale), the link bound $\vNlink$ rising with $\vB$, the memory bound $\vNhbm$ falling, $\vN$ the smaller of the two, the best $\vB$ marked and HiSparse resized as a dashed line. Below: bars of one sequence's link bytes per step (δ-misses, raw misses, dictionary loads) and its GPU memory (hot cache, dictionaries), for HiSparse resized and for the chosen design. Cells outside the shelf's measured range say so. Grades as in the table above.
:::

::: try
1. Choose the tree at 4096 positions with one dictionary and the low end of $\vfD$. The bounds cross at about 88 sequences per GPU; read the dictionary's part of the GPU memory bar.
2. Change the stretch to 16.4K. The dictionary's part of the memory bar outgrows the hot cache's, and the crossing falls to about 55.
3. Choose the light point at 4096 with four dictionaries and the high end: about 132. Switch the raw misses to solo-coded and press the best-$\vnD$ button: about 141, with a single dictionary left on the shelf.
:::

::: takeaway
- Longer stretches lower the MDL ratio and enlarge every resident dictionary; for any dictionary share above a few per cent the second wins.
- Tree shelf: 88–97 at 4096, 74–81 at 8192, 55–59 at 16 384. Light shelf: 127–132, 127–131, 126–130.
- The shortest stretch the shelf's extrapolation allows is the best stretch for every dictionary.
:::

::: aside source Receipts
bachelor-kv at commit 8f5a471: `docs/results.md` §4 (the inequality, the bars 0.5 / 0.06 / 0.03, the table of designs, the stand-in sensitivity, the range rule and the refused stretch of 1024) and §4b (sequences per GPU against stretch length); `analysis/napkin.py` (a port of Part VI's `econ()`, best $\vB$ per design) and `analysis/fig_napkin.py` (the assumed $\vfD$ = 0.85, $\vnload$ = 0.05 rows); `analysis/napkin_grid.py` (every compressor point × stretch length × shelf size). Values: `results/summary/napkin.json` (`curves.hisparse_measured`, `curves.stand_in_prediction`) and `results/summary/napkin_grid.json` (`best_per_point_and_b`; the tree at 16 384: 55.3–58.7 with one dictionary). The slot price example is derived: $1.0 \times 0.1158 \times 2048 / 4741 = 0.0500$ misses, × 640 B = 32 B. The slope 1.0 is $\log_2(13.4 / 6.7)$ on HiSparse's measured points. Dictionary kinds: [[#picks-bytes-side/ladder]].
:::
