---
title: The slot price
nav: The slot price
group: What it changes
lede: A dictionary on the GPU takes memory that could have held more hot-cache slots, and more slots also mean fewer misses. So a dictionary must save more link bytes than the slots its memory would hold. With the measured miss curve and the measured shelf, tree dictionaries never do, light ones barely do, and a global code that keeps no bytes per sequence comes first.
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
  - q: 'Tree dictionaries (w ≈ 2150 per 4096 positions, ρ = 0.112) at B ≈ 4750: how much must each one raise f_D to beat the slots?'
    a: More than 0.5, which no shelf at the Pin reaches
    wrong: ["More than 0.06", "More than 0.015", "Any positive amount"]
    why: 'α·w / ((1 − ρ)·B) ≈ 2150 / (0.888 × 4750) ≈ 0.5. The first dictionary of 4096 positions catches 0.11–0.20 at the Pin.'
    sec: inequality
  - q: 'At the Pin, each design at its best hot-cache size: which serves the most sequences per GPU?'
    a: 'A solo code on every miss with no per-sequence bytes: 141 (ρ = 0.804, verified)'
    wrong: ["Tree dictionaries on a shelf: 105–107", "HiSparse as published: 109.5", "Light dictionaries on a shelf: 127–132"]
    why: 'It keeps no dictionary on the GPU, so every byte it removes from a miss raises the link bound. It needs a GPU decoder of at least 500 GB/s, unmeasured.'
    sec: napkin
  - q: Against which HiSparse number should every kvblockdiff gain be quoted?
    a: '126 sequences per GPU, HiSparse with its hot cache resized to about 4750 slots'
    wrong: ["109.5, HiSparse as published at 4096 slots", "147, what GPU memory would hold at 4096 slots", "141, the solo code"]
    why: 'At 4096 slots HiSparse is link-bound with memory to spare. Growing the hot cache until both bounds meet gives 126 with no compression at all.'
    sec: resized
---

[[#app-the-napkin]] found that heavy dictionaries stacked on the [[hot-cache|hot cache]] are bound by GPU memory on [[pin|the Pin]]: four tree dictionaries per layer leave room for 47 sequences per GPU against HiSparse's 109. That page fixed the hot cache at 4096 slots and treated the dictionary's memory as an addition. This page compares the dictionary with the other use of the same memory: more slots.

## One more slot against one more dictionary {#inequality}

The hot cache's miss rate falls as a power of its size, $\vm \propto \vB^{-\valpha}$ ([[#picks-hot-cache/calibration]]). Differentiate: one more slot changes the miss rate by $-\valpha\,\vm/\vB$, so it removes $\valpha\,\vm\,\vk/\vB$ of the layer's $\vm\,\vk$ misses per step.

::: define slot-price
- **What it is.** The link bytes one more hot-cache slot saves per layer per decode step: about $\valpha\,\vm\,\vk\,\ve/\vB$. It is set by the slope $\valpha$ of the reuse curve and by where on the curve the cache sits.
- **Example.** HiSparse's measured curve on GLM-5.1 has a slope of 1.0 between 4096 and 8192 slots (13.4 % halves to 6.7 %). At the resized cache of about 4756 slots below, $\vm$ = 11.5 %, so one more slot removes $1.0 \times 0.115 \times 2048 / 4756 \approx 0.050$ misses per step: about 32 bytes at 640 bytes per pick (derived).
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

The dictionary's loads ([[#picks-shelf]]) are left out; they only add to its side of the link. Plug in the campaigns' dictionaries, at $\vB$ ≈ 4750:

| dictionary | $\vw$ per stretch | $\vrho$ | each dictionary must raise $\vfD$ by more than | at the Pin |
|---|---|---|---|---|
| tree (reference tree + linear prediction, ratio 0.636) | ≈ 2 150 per 4096 positions | 0.112 | ≈ 0.5 | impossible: the first catches 0.11–0.20 |
| light (no tree, ratio 0.686) | ≈ 86 per 4096 positions | 0.665 | ≈ 0.06 | the first four or so clear it, later ones do not |
| light, stretches of 1024 | ≈ 22 | 0.665 | ≈ 0.015 | up to about sixteen clear it |

A code that keeps no bytes on the GPU per sequence, a [[solo]] code or any global table fixed for the LLM ([[#scenario-scope]]), has $\vw = 0$. It takes no slots, so every byte it removes from a miss is a saving with nothing set against it.

::: takeaway
- Slot price: one more slot saves about $\valpha\,\vm\,\vk\,\ve/\vB$ link bytes per layer per step; 0.05 misses, 32 bytes at HiSparse's resized cache.
- A dictionary beats its memory as slots only if $(1-\vrho)\,[\vfD(\vnD{+}1) - \vfD(\vnD)]\,\vB/\vw > \valpha \approx 1$.
- Tree dictionaries would need each to raise $\vfD$ by 0.5; light ones by 0.06 (0.015 at stretches of 1024).
:::

## The napkin at equal GPU memory {#napkin}

The same comparison, run through Part VI's whole bill. The napkin of [[#app-the-napkin]] (its formulas ported line for line) evaluates each design at the hot-cache size $\vB$ that maximises $\vN = \min(\vNlink, \vNhbm)$, with HiSparse's own measured miss curve (log-log through its three points), the shelf's extrapolated $\vfD$ and loads of [[#picks-shelf]], and three of the campaigns' dictionaries: light ($\vw$ ≈ 2 % of the stretch, $\vrho$ = 0.665), mid ($\vw$ ≈ 10 %, $\vrho$ = 0.61) and tree ($\vw$ ≈ 52 %, $\vrho$ = 0.112). Solo has no dictionary and a ratio of 0.804 (verified; 0.778 as a code-length estimate).

| design, at the Pin | sequences per GPU | grade |
|---|---|---|
| HiSparse as published ($\vB$ = 4096) | 109.5 | derived (reproduces Part VI) |
| tree dictionaries on a shelf, best shelf | 105–107 (56 with Part VI's 4 × 4096 and $\vfD$ = 0.85) | extrapolated |
| light dictionaries for every stretch, all resident | 116 | derived |
| mid dictionaries on a shelf, best shelf | 123 | extrapolated |
| HiSparse with its hot cache resized ($\vB$ ≈ 4750) | 126 | derived |
| light dictionaries on a shelf, best shelf | 127–132 (141 with $\vfD$ = 0.85) | extrapolated |
| solo code for misses, plus a light shelf | 140–141 | extrapolated |
| **solo code for every miss, no bytes per sequence** | **141** (143 at the code length 0.778) | derived |

Ranges come from the two ends of the shelf's extrapolation. Part VI's napkin gives 47 for four tree dictionaries at $\vB$ = 4096; letting $\vB$ shrink to its best value raises that to 56 with the same assumed $\vfD$. With the stand-in's own miss curve ([[#picks-share-carries/pin-prediction]]) in place of HiSparse's, every design at its best $\vB$ drops by 8–11 %, HiSparse at its fixed 4096 slots by 22 %, and the order does not change.

::: figure fig-picks-napkin picksNapkin wide
**Sequences per GPU at the Pin, each design at its best hot-cache size.** Horizontal axis: sequences per GPU, $\vN = \min(\vNlink, \vNhbm)$, on the Pin's rig (78 layers, 640-byte picks, 2048 picks per step, 30 ms per step, a 50 GB/s link, 30 GB for orchards). One row per design. Colours: HiSparse with no compression; dictionaries kept per sequence (on a shelf or all resident); a global code with no bytes per sequence. A bar spans the two ends of the extrapolated $\vfD$; open circles mark Part VI's assumption (4 × 4096, $\vfD$ = 0.85). The dashed line is HiSparse with its hot cache resized. Switches: the miss curve (HiSparse's measured one, or the stand-in's prediction for the Pin) and the shelf's $\vfD$ (the low or the high end). Grades: derived and extrapolated; $\vrho$ and $\vw$ are the campaigns' values on Qwen3.5-2B, assumed for the Pin.
:::

::: try
1. Switch the miss curve to the stand-in's. Every row moves left by about a tenth; the order stays.
2. Switch the shelf to the low end of $\vfD$. The light shelf drops to the resized HiSparse line; the solo rows hardly move.
:::

::: takeaway
- At equal GPU memory: tree shelf 105–107, HiSparse 109.5, light all resident 116, mid shelf 123, resized HiSparse 126, light shelf 127–132, solo plus light shelf 140–141, solo alone 141.
- The order of the designs at their best $\vB$ holds with the stand-in's own miss curve (each 8–11 % lower); only HiSparse at its fixed 4096 slots, the one design not re-optimised, drops further (22 %).
:::

## The resized hot cache {#resized}

At 4096 slots, HiSparse on the Pin is bound by the link (109.5 sequences) while GPU memory would hold 147. Growing the hot cache lowers the misses and raises the memory per sequence; the two bounds meet at about 4756 slots, at 126 sequences per GPU, with no compression. [[#app-victim-tier]] reaches about 127 by spending the same spare memory on deltas of evicted picks. Every gain of kvblockdiff is therefore quoted against 126, not 109.5.

Against 126, the light shelf adds 1–5 % on the extrapolated $\vfD$, and nothing once a solo code serves the misses underneath it. The solo code adds 12 % (141). That number holds only if the GPU decodes solo deltas at least ten times faster than the link delivers them, about 500 GB/s ([[#landscape-derived-numbers]]), which nobody has measured ([[#plan-decoder-speed]]).

::: aside source Receipts
bachelor-kv at commit aa89697: `docs/results.md` §4 (the inequality, the bars 0.5 / 0.06 / 0.015, the table of designs, the stand-in sensitivity) and §5 (the resized cache; the 1–5 %); `analysis/napkin.py` (a port of Part VI's `econ()`, best $\vB$ per design) and `analysis/fig_napkin.py` (the assumed $\vfD$ = 0.85, $\vnload$ = 0.05 rows). Values: `results/summary/napkin.json` (`curves.hisparse_measured`: $\vB$ = 4756, $\vm$ = 0.1154, $\vN$ = 126.4; solo at $\vB$ = 4248, 141.2; `curves.stand_in_prediction`), computed at commit d3c2b80. The slot price example is derived: $1.0 \times 0.1154 \times 2048 / 4756 = 0.0497$ misses, × 640 B ≈ 32 B. The slope 1.0 is $\log_2(13.4 / 6.7)$ on HiSparse's measured points. Dictionary kinds: compressor 129 (light, 0.686 = 0.021 + 0.665), compressor 121 (tree, 0.636 = 0.525 + 0.112) and C1's point at a dictionary share of 0.10 (mid, delta share 0.610), as listed on [[#reference-numbers]].
:::

::: takeaway
- HiSparse with about 4750 slots serves 126 sequences per GPU instead of 109.5, with no compression; gains are quoted against 126.
- The light shelf adds 1–5 % to that; a solo code on every miss adds 12 %, if a GPU decoder reaches about 500 GB/s.
:::
