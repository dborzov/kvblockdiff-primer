---
title: Context modelling never loses
nav: Context modelling
group: Fields and tools to think with
lede: Subtracting a prediction is one way to use it. Letting the prediction choose the probability table is another. On the 8-bit float grid the first can backfire badly; the second never does — and it recovers the full exchange rate.
cards:
  - q: What does context modelling do with a prediction?
    a: It uses the prediction to choose the probability table for the value, instead of subtracting it
    wrong: ["It subtracts the prediction and codes the difference", "It stores the prediction next to the value", "It discards values that differ from the prediction"]
    why: The cost of a value becomes −log₂ p(x | x̂), averaging H(X | X̂), which is never more than H(X).
    sec: two-ways
  - q: On the E4M3 grid, a value of −0.5 is predicted as +0.5. How many grid steps apart are they?
    a: 96
    wrong: ["1", "2", "8"]
    why: The grid is densest near zero, so this small miss crosses dozens of codes. A miss of the same size between 4.5 and 5.5 is only 2 steps.
    sec: two-ways
  - q: In the exact toy, below roughly which share of variance explained is subtraction in E4M3 index space worse than no prediction at all?
    a: About 0.70
    wrong: ["About 0.05", "About 0.30", "It is never worse"]
    why: With one table for all residuals, the wide residuals of predictions near zero spoil the narrow ones. Context modelling stays below the no-prediction line at every R².
    sec: toy
  - q: Why does subtraction work as well as context modelling on INT8?
    a: On a uniform grid the surprise has the same shape wherever the prediction lands, so one residual table fits every context
    wrong: ["Because INT8 has fewer codes than E4M3", "Because INT8 values are never near zero", "Because subtraction is always optimal"]
    why: Subtraction silently assumes shift-invariance. A uniform grid has it; a logarithmic grid does not.
    sec: toy
  - q: Why can context modelling not replace the fixed-length miss path?
    a: Its code lengths depend on the context's table, so it needs an entropy coder; it serves the entropy-rate column
    wrong: ["Because it is lossy", "Because it needs a dictionary of hundreds of entries", "Because it cannot use the block's prediction"]
    why: On E4M3, contexts near zero genuinely need wide codes; the gain lives in variable-length coding.
    sec: plan
---

Here are four predictions on the E4M3 grid, the 8-bit float format of [[#school-fp8]]. In each, the value $\vx$ and its prediction $\vxhat$ are close. Look at the last column.

| value $\vx$ | prediction $\vxhat$ | miss, in value | miss, in grid steps |
|---:|---:|---:|---:|
| 5.5 | 4.5 | 1.0 | 2 |
| 48 | 40 | 8 | 2 |
| 0.75 | 0.25 | 0.5 | 12 |
| −0.5 | 0.5 | −1.0 | −96 |

Notice anything? The same miss of 1.0 costs 2 steps far from zero and 96 steps across zero. A residual counted in grid steps (in [[index-space]]) depends on *where* the prediction lands, not only on how good it is.

::: note history What the first draft did not use
It took "predict, subtract, code the residual" as the only way to use a prediction. Item 10 of the old list names the alternative: *context modelling (coding X with the prediction as context) never loses, unlike subtraction on a log grid.* VII.7 showed the problem ([[#missed-mantissa-and-grid]]); this page is the cure, and its price.
:::

## Two ways to use a prediction {#two-ways}

Drag the two knobs along the grid below and watch the step count.

::: figure fig-missed-grid-ruler mbGridRuler
**The same miss, two prices.** The ruler shows every E4M3 value between −6 and 6 as a tick; near zero the ticks merge into a dark band because the grid is logarithmic. Drag the knob for the value $\vx$ or for the prediction $\vxhat$ (they snap to grid points; arrow keys move one grid point). The shaded band spans the miss. The readout gives both indices, the miss in value and in grid steps, and how many steps the same value difference would take near 4.5. The buttons set three examples from the table.
:::

There are two ways to use $\vxhat$.

1. **Subtraction.** Store the [[residual]] $\vr = \mathrm{idx}(\vx) - \mathrm{idx}(\vxhat)$ and code all residuals with one table. This quietly assumes that the surprise has the same shape wherever the prediction lands.
2. **Context.** Store $\vx$ itself, but pick its probability table according to $\vxhat$. A prediction near zero gets a wide table; a prediction near 5 a narrow one.

::: define context-modeling
- **What it is:** coding a value with a probability table *chosen by* the prediction, rather than subtracting the prediction. Each value costs $-\log_2 \vp(\vx \mid \vxhat)$ bits.
- **Example:** JPEG-LS picks one of several hundred code tables from the local gradients around each pixel; arithmetic coders in text compressors pick a table from the last few characters.
- **Easy to confuse with:** subtraction with a per-block table. The table must come from the right *shape* of the surprise, not just its width (see the note below).
:::

::: aside reminder Conditioning never hurts
Knowing $\vY$ never raises the average cost of $\vX$: $\vH(\vX \mid \vY) \le \vH(\vX)$ ([[#school-mutual-information]], [[#missed-mutual-information-direction]]).
:::

The guarantee comes straight from Part II:

$$
\underbrace{\vH(\vX \mid \vxhat)}_{\text{context modelling}} \;\le\; \underbrace{\vH(\vX)}_{\text{no prediction}}
\qquad\text{but}\qquad
\underbrace{\vH\big(\mathrm{idx}(\vX) - \mathrm{idx}(\vxhat)\big)}_{\text{subtraction, one table}} \;\gtrless\; \vH(\vX).
$$ {#eq-missed-context}

Subtraction has no such promise. Given the prediction, subtracting it is a relabeling and loses nothing. The damage comes from pooling all the relabeled residuals into *one* table.

::: takeaway
- Subtraction assumes the surprise looks the same wherever the prediction lands; on a logarithmic grid it does not.
- Context modelling lets the prediction pick the table, and so can never cost more on average than ignoring the prediction.
:::

## The toy where subtraction loses {#toy}

One bell-shaped channel. A block mean, known to both ends, explains a share $\vRsq$ of its [[variance]], so the rest is noise. Store the channel on E4M3, or on INT8 with a step of 1/32 of the channel's [[standard-deviation]] (±127 steps cover ±4$\vsigma$). Then count bits three ways. The figure computes every number exactly, by integrating the bell curve over the grid cells, with no sampling.

::: figure fig-missed-context mbContextGrid
**Subtraction versus context modelling, on two grids.** Horizontal axis: share of the channel's variance explained by the prediction ($\vRsq$). Vertical axis: bits per element of an ideal entropy coder. Dashed: no prediction ([[solo]] coding). Solid blue: E4M3 with the prediction as context, $\vH(\vX \mid \mathrm{idx}(\vxhat))$. Vermilion: E4M3 with subtraction in index space and one residual table. Peacock: INT8, where subtraction and context give the same number. The channel is Gaussian with $\vsigma$ = 16 (E4M3 results do not depend on the scale); the prediction is Gaussian too. Slide $\vRsq$ to read all six numbers; the switch shows one grid or both. Same computation: `analysis/missed-b-context.py`.
:::

::: try
1. Start at $\vRsq$ = 0.10. Subtraction on E4M3 costs 7.65 bits — 1.2 bits *more* than no prediction (6.47).
2. Find the break-even: subtraction stops hurting only near $\vRsq$ ≈ 0.70.
3. Now follow the blue line. At $\vRsq$ = 0.75 it saves exactly one bit (6.47 → 5.48), just as the exchange rate of [[#school-exchange-rate]] promises.
4. Switch to INT8: subtraction and context coincide, at 6.05 bits for $\vRsq$ = 0.75.
:::

Read off what the old draft missed:

- On E4M3, **context modelling recovers the whole exchange rate**, about $\tfrac12 \log_2 \tfrac{1}{1-\vRsq}$, at every $\vRsq$.
- So **E4M3 with context beats INT8 with subtraction by about half a bit** everywhere: 0.57 bit at $\vRsq$ = 0.5, 0.50 at 0.99. E4M3 keeps its head start for solo coding (6.47 against 7.05 bits) *and* the prediction's gain.
- On INT8, subtraction is already optimal. A uniform grid is shift-invariant; that is exactly the assumption subtraction makes.

::: theme grid-matters
The number grid decides which way of using a prediction is safe. On a uniform grid, subtraction is free of risk; on the logarithmic E4M3 grid only context modelling is.
:::

::: note warning A per-block table is not enough
Could the harness just fit a separate residual table per block and channel? Only if the table has the right shape. A Laplace curve fitted to *index-space* residuals, context by context, costs 7.62 bits at $\vRsq$ = 0.5 — worse than no prediction (our check, same script). The table must be computed in the value domain: a bell of the right width centred on $\vxhat$, integrated over each grid cell. The plan's entropy model on E4M3 does exactly this ([[#plan-fp8-target]]).
:::

::: takeaway
- In the exact toy, E4M3 subtraction is worse than nothing below $\vRsq$ ≈ 0.70; context modelling saves the full exchange rate at every $\vRsq$.
- With context, E4M3 beats INT8-with-subtraction by about half a bit; the format question of VII.7 partly dissolves.
:::


## What changes in the plan {#plan}

:::: compare Two ways to use the same prediction
::: col Subtraction
- Stores an index-space residual; one table for all.
- Safe on uniform grids; can lose on E4M3.
- **Fixed-length friendly:** one width per channel and block.
- The GPU miss path's shape.
:::
::: col Context modelling
- Stores the value; the prediction picks the table.
- Never loses on average, on any grid.
- **Variable-length:** needs an arithmetic or rANS coder.
- The entropy-rate column's shape.
:::
::::

- **The entropy-rate column gets the context model.** Rung by rung, the [[entropy-rate]] (the scientific number, [[#homework-two-rates]]) should be computed as $\vH(\vX \mid \vxhat)$ with a value-domain table. Otherwise E4M3 is under-scored by up to ~0.8 bit.
- **The fixed-length miss path keeps subtraction** plus the per-channel "predict or not" flag of [[#missed-mantissa-and-grid]]. Near zero the E4M3 grid genuinely needs wide codes, and no fixed width can follow a table that changes with every context.
- **The table costs no extra dictionary weight.** If the surprise is modelled as a bell of known width around $\vxhat$, the decoder computes the table from [[loc]]'s location and scale. The [[weight|dictionary weight]] stays near 2; the cost moves into decode arithmetic. This is our read and untested on KV data.
- **The format comparison becomes fairer.** Score E4M3-with-context against INT8-with-subtraction, not E4M3-with-subtraction against INT8.

::: takeaway
- Context modelling belongs in the entropy-rate column; the GPU path stays fixed-length with subtraction and a flag.
- A value-domain table built from loc's location and scale adds no dictionary weight — only decoder work.
:::
