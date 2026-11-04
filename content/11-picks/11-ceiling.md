---
title: The ceiling of the miss path
nav: The ceiling
group: Bytes and the napkin
lede: A solo code makes every miss 20 % smaller, yet it adds only 12 % to the sequences a GPU serves. The rest of the gain goes into a smaller hot cache. That split follows from two lines of algebra, holds for any code that keeps no bytes per sequence, and puts a ceiling of +31 % on everything compression of the miss path can do at the Pin.
cards:
  - q: At 4096 slots HiSparse is bound by the link. What does it serve once its hot cache is resized so both bounds meet?
    a: 127 sequences per GPU at about 4740 slots, with no compression
    wrong: ["109.5, the same as before", "147, what memory held at 4096 slots", "141"]
    why: 'More slots mean fewer misses and more memory per sequence; the link bound rises and the memory bound falls until they cross. Every gain of kvblockdiff is quoted against 127.'
    sec: resized
  - q: What is the half-gain rule?
    a: 'For a code with no bytes per sequence and ratio ρ on every miss, sequences per GPU at the best hot-cache size grow as ρ^(−1/(1+α)) ≈ 1/√ρ'
    wrong: ["Sequences per GPU grow as 1/ρ", "Half of the misses become δ-misses", "A dictionary of half the punnet halves the misses"]
    why: 'Balancing the link bound (∝ B^α/ρ) against the memory bound (∝ 1/B) gives B* ∝ ρ^(1/(1+α)) and N* ∝ ρ^(−1/(1+α)). With α ≈ 1, about half of the gain in log terms goes into a smaller cache.'
    sec: half-gain
  - q: 'A solo code shrinks every miss to 0.804 of a pick (1.24× fewer link bytes). By how much does it raise sequences per GPU at the Pin?'
    a: 'About 1.11×: from 127 to 141'
    wrong: ["1.24×, from 127 to 157", "1.5×", "Not at all"]
    why: '0.804^(−0.48) ≈ 1.11. The other half of the gain lowers the best hot-cache size from about 4740 to about 4250 slots.'
    sec: half-gain
  - q: What is the most a global code could add at the Pin, at the whole-sequence floor of 0.57?
    a: '+31 %: 166 sequences per GPU against 127'
    wrong: ["+75 %, the inverse of 0.57", "+12 %", "+100 %"]
    why: 'The floor is an extrapolated code-length estimate that no compressor has met, and approaching it today needs a per-sequence dictionary, which the rule does not allow for.'
    sec: bound
---

A solo code makes each miss 0.804 of a raw pick: the link carries 1.24 times fewer bytes per miss. Yet at the Pin it raises the sequences a GPU serves from 127 to 141, 1.12 times. The previous page explained why dictionaries fall short. A solo code keeps no dictionary on the GPU, so the explanation must be somewhere else, and it is in the hot cache.

## The resized hot cache {#resized}

At 4096 slots, HiSparse on the Pin is bound by the link (109.5 sequences) while GPU memory would hold 147 ([[#landscape-derived-numbers]]). Those are the two bounds of [[#app-two-levers]]. Growing the hot cache lowers the misses, which raises the link bound, and raises the memory per sequence, which lowers the memory bound. The two meet at about 4740 slots, at 127 sequences per GPU (126.7), with no compression at all: 16 % more than as published. [[#app-victim-tier]] reaches about the same, 127, by spending the spare memory on deltas of evicted picks instead.

Every gain of kvblockdiff is therefore quoted against 127, not 109.5. Against 127, the light shelf adds 0–5 % on the extrapolated $\vfD$, and nothing once a solo code serves the misses underneath it ([[#picks-slot-price/napkin]]).

::: takeaway
- HiSparse with about 4740 slots serves 127 sequences per GPU instead of 109.5, with no compression; gains are quoted against 127.
:::

## Half of any gain goes into a smaller cache {#half-gain}

Take a code that keeps no bytes per sequence on the GPU and shrinks every miss to a share $\vrho$ of a pick: a [[solo]] code, or any table fixed for the LLM. The two budgets of [[#app-the-napkin]] become, with $\vfD = 1$ and no loads,

$$
\vNlink = \frac{\vWlink\,\vtpot}{\vm(\vB)\,\vk\,\vNL\,\ve\,\vrho} \;\propto\; \frac{\vB^{\valpha}}{\vrho}, \qquad \vNhbm = \frac{\vMhbm}{\vNL\,\ve\,\vB} \;\propto\; \frac{1}{\vB},
$$ {#eq-picks-ceiling-bounds}

using $\vm \propto \vB^{-\valpha}$ from the reuse curve ([[#landscape-reuse-curve]], [[#picks-hot-cache/calibration]]). The best hot cache is where the rising bound meets the falling one, $\vB^{1+\valpha} \propto \vrho$:

$$
\vB^{*} \;\propto\; \vrho^{\,1/(1+\valpha)}, \qquad \vN^{*} \;\propto\; \frac{1}{\vB^{*}} \;\propto\; \vrho^{\,-1/(1+\valpha)} \;\approx\; \frac{1}{\sqrt{\vrho}} \quad (\valpha \approx 1).
$$ {#eq-picks-half-gain}

::: define half-gain-rule
- **What it is.** For a code with no bytes per sequence and ratio $\vrho$ on every miss, sequences per GPU at the best hot-cache size grow as $\vrho^{-1/(1+\valpha)} \approx 1/\sqrt{\vrho}$, not as $1/\vrho$. In log terms about half of the compression gain raises the sequence count and half lowers the best hot-cache size.
- **Example.** Solo at 0.804: $0.804^{-0.48} \approx 1.11$, so 127 sequences per GPU become 141, and the best hot cache shrinks from about 4740 slots to about 4250.
- **Easy to confuse with** the gain at a fixed hot cache. At 4096 slots a link-bound design does gain $1/\vrho$, until the memory bound stops it. And with the [[slot-price|slot price]]: that compares a dictionary with slots; this rule holds with no dictionary at all.
:::

[[#measured-what-it-means/the-miss-path]] used the same square root for the light compressor fitted once per sequence. On the Pin's rig, with HiSparse's measured miss curve:

| ratio $\vrho$ of every miss | 1 | 0.90 | 0.804 (solo, verified) | 0.778 (solo, ideal) | 0.70 | 0.60 (floor at 16 384) | 0.57 (floor, whole sequence) | 0.50 |
|---|---|---|---|---|---|---|---|---|
| sequences per GPU | 127 | 134 | 141 | 144 | 151 | 162 | 166 | 177 |

The first column is the resized HiSparse cache of the previous section, 126.7 at about 4740 slots.

::: figure fig-picks-ceiling picksCeiling wide
**Where the two bounds meet, and how the meeting point moves with the ratio.** The slider sets the ratio $\vrho$ of a global code on every miss. Left: sequences per GPU against the hot-cache size $\vB$ on the Pin's rig (log scale). The link bound $\vNlink$ rises with $\vB$ (fewer misses; dashed, the same bound with raw misses), the memory bound $\vNhbm$ falls (more memory per sequence), and their crossing, the best $\vB$, is marked with its value. Right: the best sequences per GPU against $\vrho$ (from 1 down to 0.4), computed point by point on HiSparse's measured miss curve, with the law $\vrho^{-1/(1+\valpha)}$ at $\valpha$ = 1.08 dashed, marks at solo (verified and ideal) and the floors, and resized HiSparse (127) as a line. The readout gives the best $\vN$ and $\vB$, the gain over the resized cache, and what the law predicts. Grade: derived.
:::

::: try
1. Drag the ratio from 1 to 0.804. Read the best $\vB$ before and after: about 4740 and 4250 slots.
2. Keep going to 0.57. The crossing reaches 166 sequences per GPU; a gain of $1/\vrho$ would have given 222.
3. Compare the computed points with the dashed law on the right. They nearly coincide: the slope of HiSparse's miss curve near the crossing is close to 1, so the exponent is close to −1/2.
:::

::: pull
A solo code cuts the bytes of every miss by 20 % and raises sequences per GPU by 12 %; the rest of the gain goes into a hot cache 10 % smaller.
:::

::: takeaway
- Half-gain rule: $\vN^* \propto \vrho^{-1/(1+\valpha)} \approx 1/\sqrt{\vrho}$ for a code with no bytes per sequence.
- At the Pin: 127 at $\vrho$ = 1, 141 at 0.804, 144 at 0.778, 162 at 0.60, 166 at 0.57.
:::

## What the bytes side can be worth at the Pin {#bound}

The floors of [[#picks-bytes-side/floors]] give a bound. A global code at the whole-sequence floor of 0.57 would serve 166 sequences per GPU, +31 % over the resized cache. That number is generous in three ways.

1. **No compressor has reached 0.57.** It is an extrapolated code-length estimate; the best verified ratio at 16 384 positions is 0.618.
2. **Approaching it needs a dictionary per punnet or per sequence today.** The rule above assumes no bytes per sequence on the GPU; with a dictionary the slot price applies and the gain is smaller ([[#picks-slot-price/inequality]]).
3. **It needs a fast decoder.** A miss rebuilt on the GPU must be decoded about ten times faster than the link delivers it, about 500 GB/s ([[#landscape-derived-numbers]]); nobody has measured a decoder for these codes ([[#plan-decoder-speed]]).

Within that bound, each step down the ratio is worth about half its size. From solo's 0.804 to 0.70 is 13 % fewer bytes per miss and 7 % more sequences (141 to 151); from 0.70 to the floor of 0.60 is 14 % fewer bytes and 7 % more sequences (151 to 162).

::: theme side-info
A table both sides hold before any sequence is seen costs no GPU memory per sequence and nothing in the score ([[#scenario-scope]]). That is why a global code is the only kind of compression the half-gain rule applies to in full.
:::

::: takeaway
- The bytes side is worth at most +31 % at the Pin (166 against 127), at a floor no compressor has met.
- Solo, verified at 0.804, gives +12 % (141) if a GPU decodes it at about 500 GB/s.
- Each further step of the ratio is worth about half its size in sequences per GPU.
:::

::: aside source Receipts
bachelor-kv at commit 8f5a471: `docs/results.md` §4b (the ceiling $\vN \propto r^{-1/(1+\valpha)} \approx 1/\sqrt{r}$ and its table, +31 %) and §5 (the resized cache; the light shelf's 0–5 %). Values: `results/summary/napkin_grid.json` (`global`: $\vrho$ = 1 → 126.7 at $\vB$ = 4741; 0.8034 → 141.4 at 4250; 0.77811 → 143.7; 0.6 → 162.3 at 3703; 0.57 → 166.2 at 3616; 0.5 → 176.6; `law`: exponent −0.48 at $\valpha$ = 1.08) and `results/summary/napkin.json` (`curves.hisparse_measured`: 126.7 at $\vB$ = 4741, the exact crossing of the two bounds; 109.5 at 4096 with a memory bound of 146.7). The exponent and the worked steps are derived: $0.804^{-0.48} = 1.110$; 141.4 / 126.7 = 1.12; 166.2 / 126.7 = 1.31; 126.7 / 109.5 = 1.16.
:::
