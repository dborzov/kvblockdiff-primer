---
title: The share carries, not the budget
nav: The share carries
group: The hot cache
lede: There are two ways to carry HiSparse's 2048 picks to a 27K-token context. Keep the count, or keep the share of the context. The two predict very different miss rates for the Pin. Inside each sequence of the Bachelor the context grows from 8K to 30K tokens, and that growth decides between them.
cards:
  - q: 'Miss rates for budgets k = 64 … 2048, binned by context length t, fall on one curve when plotted against what?'
    a: The budget share φ = k / t
    wrong: ["The budget k", "The context length t", "The hot-cache size B"]
    why: 'If the count k carried, each budget''s line would be flat in t and the lines would stack by k. They lie on one curve in s instead; at fixed s, adding log k changes the fit by −0.05 [−0.17, 0.14] at B/k = 2.'
    sec: collapse
  - q: What miss rates does the share rule predict for the Pin at B/k = 1 / 2 / 4, and what did HiSparse measure?
    a: 36 / 21 / 12 % predicted, against 30 / 13.4 / 6.7 % measured on GLM-5.1
    wrong: ["30 / 12 / 3 % predicted, the same as measured", "13.4 / 6.7 / 3.4 % predicted", "50 / 40 / 30 % predicted"]
    why: 'The stand-in''s curve at φ = 2048 / 100 384 gives 36 / 21 / 12 %. The count rule (k = 2048) would give 30 / 12 / 3 %. GLM-5.1''s trained indexer churns less than exact attention on a 1.5B LLM.'
    sec: pin-prediction
  - q: How does the slope of the reuse curve change with the budget share?
    a: 'It rises: 0.63 at k = 64, 1.07 at k = 512, 2.2 at k = 2048 on the Bachelor'
    wrong: ["It stays at 1.08 for every budget", "It falls as the budget grows", "It is 0 for small budgets"]
    why: 'At a larger share the picks cover more of the context, so a few more slots catch a larger part of what repeats. HiSparse''s 1.08 sits at s ≈ 2 %, next to pin-scaled''s 1.07.'
    sec: slope
  - q: To read the stand-in's miss rate for another LLM's setting, which two quantities must match?
    a: The budget share φ = k·g / L and the hot-cache ratio B / k
    wrong: ["The number of layers and the head dimension", "The budget k and the hot-cache size B", "The context length and the stretch length"]
    why: 'The collapse says the miss rate is a function of s at fixed B/k. A different count of picks at the same share gives the same miss rate.'
    sec: carrying
---

HiSparse picks 2048 positions per layer from a 100K-token context. The Bachelor's sequences end between 24.5K and 30K tokens. Keeping 2048 picks there (pin-absolute) gives miss rates of 28 / 10 / 2.5 % at $\vB/\vk$ = 1 / 2 / 4. Keeping the share of the context, 2 %, means 512 picks (pin-scaled) and gives 35 / 19 / 9.7 % ([[#picks-hot-cache]]). Only one of the two rules can be the right way to carry a number between contexts, and the data decides which.

## The collapse {#collapse}

Within one sequence, the context at step $\vt$ holds $\vt$ positions, from 8K at the first counted step to 30K at the last. Cut the counted steps into five time bins (8K–12K, 12K–16K, 16K–20K, 20K–24K, 24K and on) and replay the sweep of budgets, $\vk$ = 64, 128, 256, 512, 1024, 2048, in each bin. That gives 30 miss rates per sequence for each $\vB/\vk$.

Two outcomes were possible.

1. **The count carries.** Then each budget's miss rate is the same in every bin, and plotted against the [[budget-share|budget share]] $\vshare = \vk/\vt$ each budget is a flat line, the lines stacked by $\vk$.
2. **The share carries.** Then the miss rate depends on $\vk/\vt$ alone, and the six budgets' lines continue one another along a single curve.

The second happened.

::: figure fig-picks-collapse picksCollapse wide
**The miss rate against the share of the context picked.** Horizontal axis: the budget share $\vshare = \vk/\vt$ (log scale, about 0.2 % to 20 %). Vertical axis: the LRU miss rate $\vm$ (log scale). One line per budget $\vk$ from 64 to 2048, each through its five time bins (the context growing from 8K to 30K moves a line to the left); faint points are single sequences. The switch sets $\vB/\vk$ to 1, 2 or 4. The filled diamond is HiSparse's point at $\vshare = 2048/100\,384 = 2.0\,\%$ (their measurement); the hollow diamond is the stand-in's fitted curve at the same share (derived, extrapolated in context); the dashed vertical line marks the Pin's share. The readout gives the exponent of $\vk$ at a fixed share, how much better a curve in $\vshare$ fits than one in $\vk$, and the two miss rates at the Pin's share. Means over 28 layers and five sequences. Grade: measured.
:::

::: try
1. At $\vB/\vk = 2$, follow the line of $\vk = 512$ from right to left as the context grows. It rises, and it runs into the line of $\vk = 256$ where the shares meet.
2. Switch to $\vB/\vk = 1$. The lines barely move with $\vt$: with no spare slots, neither the count nor the share matters much.
3. Find HiSparse's diamond. At every $\vB/\vk$ it sits below the curve at the same share.
:::

A fit gives the same result in numbers. Per sequence, the 30 values of $\log \vm$ (6 budgets × 5 bins) were fitted as a constant, plus one exponent times $\log \vk$, plus another times $\log \vt$:

| $\vB/\vk$ | exponent of $\vk$ | exponent of $\vt$ | what it says |
|---|---|---|---|
| 1 | −0.08 | +0.06 | neither matters much |
| 2 | −0.25 | +0.27 [0.14–0.44] | the miss rate grows with the context at a fixed budget |
| 4 | −0.58 | +0.80 [0.46–1.05] | the same, more strongly |

Two more checks, both derived. At $\vB/\vk$ = 2 and 4, a smooth curve in $\log \vshare$ fits the binned miss rates 1.8 and 2.6 times better (in root-mean-square error of $\log \vm$) than the same curve in $\log \vk$; at $\vB/\vk$ = 1, where both fit well, the ratio is 1.2. And at a fixed share, adding $\log \vk$ to the fit changes the miss rate with an exponent of −0.05 [−0.17, 0.14] at $\vB/\vk = 2$ and +0.01 at 4: the count adds nothing once the share is known.

::: pull
Budgets of 64 to 2048 picks over contexts of 8K to 30K tokens give one curve of miss rate against the share of the context picked.
:::

::: takeaway
- Miss rates of budgets 64 to 2048 over contexts of 8K to 30K lie on one curve in $\vshare = \vk/\vt$.
- At a fixed budget the miss rate grows with the context: exponent +0.27 at $\vB/\vk = 2$, +0.80 at 4.
- At a fixed share the budget adds nothing (exponent −0.05 [−0.17, 0.14]).
:::

## The Pin's miss rates, predicted from the share {#pin-prediction}

The Pin's share is $2048/100\,384 = 2.04\,\%$, inside the range of shares the dump covers; its context is 3.3 to 4 times longer than the dump's. Reading the stand-in's curve at that share is an interpolation in $\vshare$ and an extrapolation in $\vt$.

| $\vB/\vk$ | 1 | 2 | 4 | grade |
|---|---|---|---|---|
| the share rule (stand-in curve at $\vshare$ = 2.04 %) | 36 % | 21 % | 12 % | derived, extrapolated in context |
| the count rule (stand-in at $\vk$ = 2048) | 30 % | 12 % | 3 % | derived |
| HiSparse on GLM-5.1 | 30 % | 13.4 % | 6.7 % | their measurement |

The share rule puts the stand-in 1.2–1.8 times above GLM-5.1, the same direction as the calibration of [[#picks-hot-cache]]. The count rule comes closer to HiSparse's numbers at $\vB/\vk$ = 1 and 2 but predicts 3 % at 4, where HiSparse measured 6.7 %, and it is the rule the collapse rejects. GLM-5.1's trained indexer churns less than exact attention on Qwen 2.5 1.5B: its picks repeat 70 % from step to step against 65 % ([[#picks-the-indexer]]).

::: takeaway
- At the Pin's share the stand-in predicts 36 / 21 / 12 %, against HiSparse's measured 30 / 13.4 / 6.7 %.
- The count rule would predict 30 / 12 / 3 %; it fails at $\vB/\vk = 4$.
:::

## The slope rises with the share {#slope}

The [[miss-rate-curve|miss-rate curve]] of each budget, over $\vB/\vk$ from 1 to 8, is close to a power law $\vm \propto \vB^{-\valpha}$. Its slope depends on the share:

| budget $\vk$ (share at 27.6K) | 64 (0.2 %) | 512 (1.9 %) | 2048 (7.4 %) |
|---|---|---|---|
| slope $\valpha$ over $\vB/\vk$ = 1 to 8 | 0.63 | 1.07 | 2.2 |

At a larger share the picks cover more of the context, and a few more slots per pick catch a larger part of what comes back. HiSparse's 1.08 sits at its share of 2 %, next to pin-scaled's 1.07. The slope is what [[#picks-slot-price]] uses to compare a dictionary with hot-cache slots.

One reading points the other way and does not decide the question. The budget that holds 90 % of the attention mass grows slower than the context ($\vk_{0.9} \propto \vt^{0.30}$ on average over layers), but the per-sequence exponents range from −0.25 to 0.83: the content of a sequence drifts more than the 8K–30K lever arm can separate. The mass is held by a budget that grows slowly; the identities of the picks, which the hot cache sees, spread with the share.

::: takeaway
- The reuse-curve slope rises with the share: 0.63, 1.07 and 2.2 at 64, 512 and 2048 picks.
- The attention-mass budget does not settle the scaling (exponents −0.25 to 0.83 by sequence); the miss rates do.
:::

## Carrying a miss rate to another LLM: equal share, equal B/k {#carrying}

The collapse turns into a rule for every number of this Part. To read the stand-in for another LLM's setting:

1. compute that setting's share, `share = k * g / L`, and its hot-cache ratio $\vB/\vk$;
2. read the stand-in's curve at that share and ratio;
3. state that the context was extrapolated if $\vL$ lies outside 8K–30K.

Examples. The Pin: $\vshare$ = 2.0 %, inside the dump's range of shares (0.2 % at 64 picks of 30K to 20 % at 2048 of 10K). DeepSeek-V4's compressed layers at 128K: 2048 positions, $\vshare$ = 1.6 %, inside. The same at 1M: 0.2 %, at the bottom edge of the range, with the context 30 times longer than the dump's.

For the dictionary shelf the same question has a different result. What a stretch catches depends on the stretch length relative to the context, and it falls faster than the share alone predicts ([[#picks-shelf]]).

::: aside source Receipts
bachelor-kv at commit 8f5a471: `docs/results.md` §1 (the scaling rule R3: exponents, the cubic in $\log \vshare$, the Pin prediction 36 / 21 / 12 %, slopes 0.63 / 1.07 / 2.2). Fit details: `results/summary/hotcache.json`, `R3_collapse_fit` (per $\vB/\vk$: `a`, `b`, `flexible.rms_cubic_s` against `rms_cubic_k`, ratios 1.79 at $\vB/\vk = 2$ and 2.64 at 4; `beta_k_at_fixed_s`; `pin_pred_cubic_s` 0.360 / 0.207 / 0.121; `pin_pred_k_only` 0.299 / 0.116 / 0.030) and `R3_slope`, computed at commit d3c2b80. Attention-mass budget: `docs/log.md` R7 ($\vk_x \propto \vt^{0.11 / 0.20 / 0.30}$ for 70 / 80 / 90 % of the mass, per-sequence −0.25 to 0.83). The share range of the dump is arithmetic: 64 / 30 075 and 2048 / 10 240.
:::

::: takeaway
- Carry a miss rate at equal $\vshare$ and equal $\vB/\vk$; mark the context extrapolation.
- The Pin and V4 at 128K are inside the dump's range of shares; V4 at 1M is at its edge.
:::
