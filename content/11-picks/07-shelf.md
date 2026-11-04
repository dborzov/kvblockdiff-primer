---
title: The shelf, replayed
nav: The shelf
group: Stretches and the shelf
lede: 'Part VI assumed that a shelf of four dictionaries of 4096 positions catches 85 % of the misses, with 0.05 loads per step. On the Bachelor''s 27K-token context that shelf catches 94 %, because it spans 60 % of the context. Carried to the Pin''s 100K by a rule the data forced, it catches 36–54 %.'
cards:
  - q: What is the shelf coverage?
    a: 'n_D · stretch_len / t: the positions the stretches on the shelf hold, over the context so far'
    wrong: ["The share of misses that are δ-misses", "The share of the hot cache taken by dictionaries", "The number of dictionaries per layer"]
    why: 'If misses landed evenly, f_D would equal the coverage. The shuffled twin gives exactly that value, so f_D is always read next to the twin''s.'
    sec: coverage
  - q: 'On the Bachelor, with the popular policy, what does a shelf of 4 dictionaries of 4096 positions catch, and why is that not the Pin''s number?'
    a: 'f_D 0.94, but the shelf spans 60 % of the 27K-token context; the twin catches 0.60'
    wrong: ["f_D 0.94, and it carries to the Pin unchanged", "f_D 0.57, because the stretches are too short", "f_D 0.85, as Part VI assumed"]
    why: 'At 100K tokens four stretches of 4096 span 16 % of the context. What a stretch catches must be carried at its share of the context, and faster than that.'
    sec: coverage
  - q: 'At a fixed budget share, f_D at a fixed (n_D, stretch length) collapses on which quantity?'
    a: 'The stretch length over t to the power 1.27, b / t^1.27'
    wrong: ["The stretch length b itself", "The budget k", "The hot-cache size B"]
    why: 'Absolute b leaves a logit residual of 0.42, plain b / t 0.15, b / t^1.27 0.12. Misses spread over more of the context as it grows, faster than the context itself.'
    sec: scaling
  - q: 'Extrapolated to the Pin''s 100K, what does a shelf of 4 dictionaries of 4096 positions catch, and at how many loads per step?'
    a: 'f_D 0.36–0.54, at 0.10–0.13 net loads per step'
    wrong: ["f_D 0.85 at 0.05 loads per step", "f_D 0.94 at 0.018 loads per step", "f_D 0.04 at no loads"]
    why: 'The range comes from the two ends of the fitted exponent, 0.93 and 1.44. 0.85 is outside it.'
    sec: pin
  - q: Read with the pre-registered decision rule of X.9, what does the shelf say at the Pin?
    a: '"Partly" at best (0.54 at 4 × 4096, with loads at the 0.1 limit), "spread" at worst'
    wrong: ['"Affordable": f_D above 0.8 with n_D ≤ 8', '"Spread" in every case', "The rule cannot be read without a GPU"]
    why: 'f_D ≥ 0.8 at n_D ≤ 8 with n_load ≤ 0.1 was "affordable"; 0.5 ≤ f_D < 0.8 "partly"; below 0.5 "spread". At the Pin only the upper end of 4 × 4096 reaches 0.5.'
    sec: pin
---

Part VI computed its shelf with assumed numbers: four dictionaries of 4096 positions per layer, catching $\vfD = 0.85$ of the misses, with $\vnload = 0.05$ loads per step ([[#app-the-napkin]]). The replay measured both on [[bachelor|the Bachelor]], with the popular policy of [[#picks-heavy-stretches/policies]] (`P = 32`), at the Pin's [[budget-share|budget share]] and $\vB/\vk = 2$.

## The δ-miss fraction against coverage {#coverage}

A shelf of $\vnD$ dictionaries of stretches of $\vb$ positions holds $\vnD \vb$ positions' worth of dictionaries. On a short context that can be most of it.

::: define shelf-coverage
- **What it is.** `n_D * stretch_len / t`: the positions the stretches on the shelf hold, over the context at step $\vt$.
- **Example.** Four stretches of 4096 positions span 60 % of a 27K-token context on the Bachelor and 16 % of the Pin's 100K.
- **Easy to confuse with** the [[delta-miss-fraction|δ-miss fraction]]. If misses landed evenly, $\vfD$ would equal the coverage; the shuffled twin of [[#picks-heavy-stretches/heavy]] gives exactly that value. A shelf is useful by the amount $\vfD$ exceeds its coverage, read as the lift $\vfD$ / twin.
:::

Measured on the Bachelor (popular, `P = 32`, means over the whole sequence from `t = 8192`):

| $\vnD$ × $\vb$ | coverage | $\vfD$ | twin | lift | net loads per step |
|---|---|---|---|---|---|
| 1 × 1024 | 0.04 | 0.21 | 0.04 | 5.1 | 0.035 |
| 4 × 1024 | 0.15 | 0.57 [0.54–0.60] | 0.16 | 3.6 | 0.089 |
| 8 × 1024 | 0.30 | 0.81 | 0.31 | 2.6 | 0.118 |
| 1 × 4096 | 0.15 | 0.46 | 0.15 | 3.0 | 0.017 |
| 4 × 4096 | 0.60 | 0.94 [0.93–0.96] | 0.60 | 1.6 | 0.018 |

Part VI's shelf, 4 × 4096, catches 0.94 of the misses here, above the assumed 0.85. It also spans 60 % of the context, and the twin, with no concentration at all, catches 0.60. At equal coverage, more and shorter stretches catch more: with $\vnD \vb = 4096$ positions on the shelf, one stretch catches 0.46 and sixteen stretches of 256 catch 0.64.

::: figure fig-picks-shelf picksShelf wide
**The δ-miss fraction against the shelf's coverage.** Horizontal axis: [[shelf-coverage|shelf coverage]] $\vnD \vb / \vt$ (log scale). Vertical axis: $\vfD$. One line per shelf size $\vnD$ = 1, 2, 4, 8, 16, each through stretch lengths 256 to 4096; grey points: the shuffled twin of the same shelves, which sit on the even-spread line $\vfD$ = coverage. Dashed lines at 0.8 ("affordable" if $\vnD \le 8$ and $\vnload \le 0.1$) and 0.5 (below it, misses are spread), the readings of [[#plan-decision-rules]]. The star is Part VI's assumed 0.85 for 4 × 4096. Bars: the extrapolated range at the Pin's 100K for each $\vnD$, placed at the Pin's coverage, for stretches of 4096 or 1024 (switch). Choosers: the configuration (pin-scaled by default) and the shelf policy (touched, heaviest, popular over 8 or 32 steps; popular over 32 by default). Coverage is computed over the whole sequence. Grades: measured on the Bachelor; the Pin's bars extrapolated.
:::

::: try
1. Find the star and the Bachelor's 4 × 4096 point. The Bachelor reaches 0.85 only with a shelf spanning over a third of its context.
2. Switch the policy to touched. Every line drops toward the twin's.
3. Switch the Pin's cells to $\vb$ = 1024. The bars move left and down: at 100K, four stretches of 1024 catch 0.13–0.24.
:::

::: takeaway
- On the Bachelor, 4 × 4096 catches 0.94 of the misses at 0.018 loads per step, but spans 60 % of the context (twin 0.60).
- At small coverage the shelf catches 3–5× the twin's share; at equal coverage, shorter stretches catch more.
:::

## The rule that overturned "the stretch length is absolute" {#scaling}

The design first kept $\vb$ in absolute tokens, on the argument that what a dictionary is meant to catch, a file read or a tool output, has a length that does not grow with the context ([[#picks-carrying-numbers/knobs]]). If that were so, $\vfD$ at a fixed $(\vnD, \vb)$ would be the same in every time bin of a sequence.

It is not. At the Pin's budget share, held fixed by choosing $\vk = 0.02\,\vt$ in each bin, $\vfD$ at a fixed shelf falls as the context grows: for 4 dictionaries of 1024 positions, from 0.80 at about 10K to 0.48 at about 27K (derived, the budget interpolated to the share in each bin). Three rules were fitted to all bins, shelves and sequences, and their residuals compared (logit of $\vfD$, derived):

| rule | $\vfD$ depends on | residual |
|---|---|---|
| absolute | $\vnD$ and $\vb$ | 0.42 |
| share | $\vnD$ and $\vb/\vt$ | 0.15 |
| fitted | $\vnD$ and $\vb/\vt^{1.27}$ (exponent 0.93–1.44 over the five sequences) | 0.12 |

Fitted on the bins before 20K and used to predict the later ones, the absolute rule is off by +0.13 in $\vfD$ and the share rule by +0.03. Loads collapse in the same way, with an exponent of 1.24 [1.04–1.46]. Misses spread over more of the context as it grows, slightly faster than the context itself. A larger budget share spreads them as well: at a fixed context, $\vfD$ falls with the budget as $\vk^{-0.47}$ (1 × 1024), while the twin's stays flat.

::: figure fig-picks-shelf-scaling picksShelfScaling wide
**What a stretch catches as the context grows.** Vertical axis: $\vfD$ for one shelf of $\vnD$ dictionaries (chooser, 1 to 16), at the Pin's budget share (the budget interpolated to 2 % of $\vt$ in each bin), with the popular policy over 32 steps or the heaviest (chooser). One line per time bin, $\vt$ ≈ 10.2K, 14.3K, 18.4K, 22.5K and 26.5K. The first switch sets the horizontal axis: the stretch length $\vb$; $\vb/\vt$; or $\vb/\vt^{1.27}$, drawn as the stretch length at the Pin's 100K that a cell of the Bachelor stands for, $\vb\,(100\text{K}/\vt)^{1.27}$. Against $\vb$ the bins stack, later bins lower; against the last they fall on one line. Dashed lines: the Pin's stretches of 1024 and 4096, with the extrapolated ranges as bars. The readout gives the three rules' residuals and the fitted exponents. Grade: measured (the rules are derived).
:::

::: takeaway
- At a fixed share, $\vfD$ at a fixed shelf falls as the context grows; it collapses on $\vb/\vt^{1.27}$ (residual 0.12; absolute $\vb$ 0.42; plain $\vb/\vt$ 0.15).
- A Pin stretch is carried by rescaling it, not by keeping its length; loads follow the same rule.
:::

## At the Pin, and the decision rule read {#pin}

To carry a shelf to the Pin, read the Bachelor at the time bin 20K–24K ($\vt$ ≈ 22.5K) with the stretch length rescaled to $\vb \times (22.5\text{K} / 100\text{K})^{0.93 \dots 1.44}$, the two ends of the fitted exponent, after shifting the bin's share to the Pin's 2.04 % along the budget sweep. A Pin stretch of 4096 positions then behaves like a Bachelor stretch of about 480 to 1020 positions. Extrapolated, popular `P = 32`:

| $\vnD$ | $\vfD$, $\vb$ = 4096 | net loads | $\vfD$, $\vb$ = 1024 | net loads |
|---|---|---|---|---|
| 1 | 0.11–0.20 | 0.04–0.06 | 0.04–0.07 | 0.09–0.14 |
| 4 | 0.36–0.54 | 0.10–0.13 | 0.13–0.24 | 0.19–0.29 |
| 8 | 0.56–0.76 | 0.14–0.20 | 0.23–0.40 | 0.27–0.38 |
| 16 | 0.78–0.95 | 0.15–0.29 | 0.35–0.60 | 0.40–0.61 |

The decision rule of [[#plan-decision-rules]] was registered before the data: $\vfD \ge 0.8$ at $\vnD \le 8$ with $\vnload \le 0.1$ reads "affordable"; $0.5 \le \vfD < 0.8$ "partly"; $\vfD < 0.5$ "spread". On this replay it is read on the best cell with $\vnD \le 8$ and $\vnload \le 0.1$, and on the lift over the twin as well, because of coverage.

1. **The Bachelor, measured.** "Affordable" only with a shelf spanning 73 % of the context (4 × 4096 in the bin 20K–24K: $\vfD$ 0.90, 0.035 loads per step). Restricted to the Pin's coverage (at most 0.33), "partly": 0.52 at 4 × 1024, 0.098 loads per step.
2. **The Pin, extrapolated.** "Partly" at best: 0.54 at 4 × 4096, with 0.10–0.13 loads per step, at the 0.1 limit. "Spread" at the other end of the exponent's range. Part VI's 0.85 at 4 × 4096 lies outside the range.

::: aside source Receipts
bachelor-kv at commit aa89697: `docs/results.md` §3 (the measured table, the scaling rule, the Pin table, the decision rule); `docs/design.md` §4.1 (the note of 2026-11-03: `b` does not carry as an absolute count). Details: `results/summary/shelf.json` (`bachelor_measured`, `R6`, `R6_time_bins_fixed_share`, `scaling_rule`, `pin_rule`, `pin_extrapolation`, `decision_rule`), computed at commit d3c2b80; `docs/log.md` 2026-11-03 (out-of-sample bias +0.13 against +0.03; loads exponent 1.24 [1.04–1.46]; `d ln f_D / d ln k = -0.47`; the bin 20K–24K reading 0.90 at coverage 0.73). The 0.80 and 0.48 of 4 × 1024 at 10K and 27K: `R6_time_bins_fixed_share` (popular `P = 32`; derived, the budget interpolated to 2 % of $\vt$). The rescaled lengths 480–1020 are $4096 \times 0.2245^{1.44}$ and $4096 \times 0.2245^{0.93}$ (derived). Grades: measured (Bachelor tables), derived (rules), extrapolated (Pin table).
:::

::: takeaway
- At the Pin's 100K, 4 × 4096 extrapolates to $\vfD$ 0.36–0.54 at 0.10–0.13 loads per step; 0.85 is outside the range.
- The decision rule reads "partly" at best at the Pin, "spread" at worst; on the Bachelor "affordable" only with a shelf spanning 73 % of the context.
:::
