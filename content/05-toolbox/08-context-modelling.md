---
title: Context modelling never loses
nav: Context modelling
group: Coding the residual
lede: Subtracting a prediction is one way to use it. Letting the prediction choose the probability table is another. On the 8-bit float grid the first can backfire badly; the second never does, it recovers the full exchange rate, and it is what every compressor of the campaigns did.
cards:
  - q: What does context modelling do with a prediction?
    a: It uses the prediction to choose the probability table for the value, instead of subtracting it
    wrong: ["It subtracts the prediction and codes the difference", "It stores the prediction next to the value", "It discards values that differ from the prediction"]
    why: The cost of a value becomes −log₂ p(x | x̂), averaging H(X | X̂), which is never more than H(X).
    sec: two-ways
  - q: In the exact toy, below roughly which share of variance explained is subtraction in E4M3 index space worse than no prediction at all?
    a: About 0.70
    wrong: ["About 0.05", "About 0.30", "It is never worse"]
    why: With one table for all residuals, the wide residuals of predictions near zero spoil the narrow ones. Context modelling stays below the no-prediction line at every R².
    sec: toy
  - q: Why can context modelling not replace a fixed-length miss path?
    a: Its code lengths depend on the context's table, so it needs an entropy coder; it serves the entropy-rate column
    wrong: ["Because it is lossy", "Because it needs a dictionary of hundreds of cherries", "Because it cannot use the punnet's prediction"]
    why: On E4M3, contexts near zero genuinely need wide codes; the gain lives in variable-length coding.
    sec: measured
---

Four predictions on the E4M3 grid of [[#school-fp8]]. In each the value $\vx$ and its prediction $\vxhat$ are close. Look at the last column.

| value $\vx$ | prediction $\vxhat$ | miss, in value | miss, in grid steps |
|---:|---:|---:|---:|
| 5.5 | 4.5 | 1.0 | 2 |
| 48 | 40 | 8 | 2 |
| 0.75 | 0.25 | 0.5 | 12 |
| −0.5 | 0.5 | −1.0 | −96 |

The same miss of 1.0 costs 2 steps far from zero and 96 steps across zero. A residual counted in grid steps, in [[index-space]], depends on *where* the prediction lands, not only on how good it is.

## Two ways to use a prediction {#two-ways}

::: figure fig-toolbox-grid-ruler mbGridRuler
**The same miss, two prices.** The ruler shows every E4M3 value between −6 and 6 as a tick; near zero the ticks merge into a dark band because the grid is logarithmic. Drag the knob for the value $\vx$ or for the prediction $\vxhat$ (they snap to grid points; arrow keys move one grid point). The shaded band spans the miss. The readout gives both indices, the miss in value and in grid steps, and how many steps the same value difference would take near 4.5. The buttons set three examples from the table.
:::

There are two ways to use $\vxhat$.

1. **Subtraction.** Code the [[residual]] $\vr = \mathrm{idx}(\vx) - \mathrm{idx}(\vxhat)$ with one table. This quietly assumes that the surprise has the same shape wherever the prediction lands.
2. **Context.** Code $\vx$ itself, but pick its probability table according to $\vxhat$: a wide table for a prediction near zero, a narrow one for a prediction near 5.

::: define context-modeling context modelling
- **What it is.** Coding a value with a probability table *chosen by* the prediction, rather than subtracting the prediction. Each value costs $-\log_2 \vp(\vx \mid \vxhat)$ bits.
- **Example.** JPEG-LS picks one of several hundred tables from the local gradients around each pixel; text compressors pick a table from the last few characters; the campaigns' compressors centre a bump in value units on the prediction and give each 8-bit code the bump's area over that code's grid cell.
- **Easy to confuse with** subtraction with a per-punnet table. The table must have the right *shape* of surprise for each context, not just the right width.
:::

```python context modelling: the prediction picks the table; nothing is subtracted
def encode(cherry, prediction, scale):                  # prediction and scale per element, in value units, from the dictionary
    stream = rans_encoder()
    for elem_id in range(d):
        table = cell_table(centre=value_of(prediction[elem_id]), width=scale[elem_id])   # p(code) = area of the bump over the code's cell
        stream.push(cherry[elem_id], table)             # the code itself, under a table only the decoder can also build
    return stream.bytes()

def decode(delta, prediction, scale):
    stream = rans_decoder(delta)
    return np.array([stream.pop(cell_table(value_of(prediction[e]), scale[e])) for e in range(d)], np.int8)
```

On the bill: no new dictionary line (the per-furrow scale of [[#toolbox-furrow-statistics]] is already there) and no tax; what grows is decoder arithmetic, one table per element per cherry. The guarantee comes straight from [[#school-side-information]]:

$$
\underbrace{\vH(\vX \mid \vxhat)}_{\text{context modelling}} \;\le\; \underbrace{\vH(\vX)}_{\text{no prediction}}
\qquad\text{but}\qquad
\underbrace{\vH\big(\mathrm{idx}(\vX) - \mathrm{idx}(\vxhat)\big)}_{\text{subtraction, one table}} \;\gtrless\; \vH(\vX).
$$ {#eq-toolbox-context}

Given the prediction, subtracting it is a relabelling and loses nothing; the damage comes from pooling all the relabelled residuals into *one* table.

::: takeaway
- Subtraction assumes the surprise looks the same wherever the prediction lands; on a logarithmic grid it does not.
- Context modelling lets the prediction pick the table and can never cost more on average than ignoring the prediction.
:::

## The toy where subtraction loses {#toy}

One bell-shaped furrow. A punnet location, known to both ends, explains a share $\vRsq$ of its variance; the rest is noise. Store the furrow on E4M3, or on INT8 with a step of 1/32 of the furrow's standard deviation, and count bits three ways, exactly, by integrating the bell over the grid cells.

::: figure fig-toolbox-context-grid mbContextGrid
**Subtraction versus context modelling, on two grids.** Horizontal axis: share of the furrow's variance explained by the prediction ($\vRsq$). Vertical axis: bits per element of an ideal entropy coder. Dashed: no prediction (solo coding). Solid blue: E4M3 with the prediction as context, $\vH(\vX \mid \mathrm{idx}(\vxhat))$. Vermilion: E4M3 with subtraction in index space and one residual table. Peacock: INT8, where subtraction and context give the same number. The furrow is Gaussian with $\vsigma = 16$ (E4M3 results do not depend on the scale); the prediction is Gaussian too. Slide $\vRsq$; the switch shows one grid or both. `analysis/missed-b-context.py`.
:::

::: try
1. Start at $\vRsq = 0.10$. Subtraction on E4M3 costs 7.65 bits, 1.2 bits *more* than no prediction (6.47).
2. Find the break-even: subtraction stops hurting only near $\vRsq \approx 0.70$.
3. Follow the blue line. At $\vRsq = 0.75$ it saves exactly one bit (6.47 → 5.48), as the exchange rate promises ([[#toolbox-exchange-rate]]).
4. Switch to INT8: subtraction and context coincide, at 6.05 bits for $\vRsq = 0.75$.
:::

Three readings. On E4M3, context modelling recovers the whole exchange rate at every $\vRsq$. So E4M3 with context beats INT8 with subtraction by about half a bit everywhere (0.57 at $\vRsq = 0.5$), keeping its head start for solo coding *and* the prediction's gain. On INT8, subtraction is already optimal, because a uniform grid is shift-invariant, which is exactly the assumption subtraction makes. And a per-punnet table is not enough on its own: a Laplace fitted to *index-space* residuals, context by context, costs 7.62 bits at $\vRsq = 0.5$, worse than no prediction. The table must be built in the value domain, a bump of the right width centred on $\vxhat$ and integrated over each cell: the grid-aware table of [[#toolbox-bit-fields]].

::: theme grid-matters
The number grid decides which way of using a prediction is safe. On a uniform grid subtraction is free of risk; on the logarithmic E4M3 grid only context modelling is.
:::

::: takeaway
- In the exact toy, E4M3 subtraction is worse than nothing below $\vRsq \approx 0.70$; context modelling saves the full exchange rate at every $\vRsq$.
- With context, E4M3 beats INT8-with-subtraction by about half a bit; the table must be computed in value units.
:::

## What the campaigns found {#measured}

Every compressor of both campaigns is an entropy coder, a [[rans]] stream per cherry, and every one of them is built in value: a logistic curve (a bell-shaped cousin of the Laplace bump) centred on the prediction in value units, with the furrow's scale as its width, integrated over the FP8 cell of each code. That is context modelling in the sense of this page, and two things fell out of it for free ([[#measured-time-and-bits]]). The same prediction error has skew −0.03 measured in value and −1.60 counted in grid steps (−13.4 where the predicted value is large), because FP8 cells narrow toward zero; a table built in value inherits the skew, one built on code indices must describe it. And the shape is finished: any change to the error curve (a skew, a shrink, a mixture, a scale that follows magnitude) gains at most 0.014 bit per element, unpaid and in-sample. The price is the one this page's title hides: a table that changes with every context is not a [[fixed-length-code]], so no campaign compressor has a fixed-length rate, and the engineering number of [[#toolbox-two-rates]] remains unmeasured on the Bench.

::: aside source Receipts
Skew −0.03 / −1.60 / −13.4: r15 iter-1-1 (12 blocks, head 0). Shape finished, ≤ 0.014: the same page. Logistic over the FP8 cell: spec §1.8, `notes/02-what-v-is-and-values-not-bits.md` §7. "Every coder here is an entropy coder (rANS); no fixed-length rate was measured": PART-XI-SPEC §1.12.
:::

::: takeaway
- The campaigns' compressors are context models in value, integrated over the FP8 cell; the skew of the error comes free and no curve shape gains more than 0.014.
- Variable-length by nature: the fixed-length rate stays unmeasured on the Bench.
:::
