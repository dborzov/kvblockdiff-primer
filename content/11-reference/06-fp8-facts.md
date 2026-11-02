---
title: FP8 E4M3 facts used by compressors
nav: FP8 facts
group: Facts and sources
lede: The exact 8-bit format every lossless compressor on this site must reproduce, element by element, in one place. The layout, the index space, the scaling recipe of the campaigns, and the one thing the data taught about the grid.
cards:
  - q: How many distinct non-negative values does FP8 E4M3 (the "fn" variant) represent?
    a: 127, zero, 7 subnormals and 15 binades of 8 values, minus the one NaN pattern
    wrong: ["128", "255", "256"]
    why: With the sign, that is 253 distinct values plus −0, which the dump canonicalizes to +0.
    sec: layout
  - q: Why do compressors reason in index space?
    a: So that a residual of 1 means one representable step, whatever the size of the step
    wrong: ["Because indices are always smaller than values", "Because E4M3 has no negative numbers", "Because KaTeX cannot draw floats"]
    why: On a logarithmic grid, equal value differences are very different numbers of steps near zero and far from it.
    sec: index
  - q: What did the campaigns find when they estimated shared bits on the FP8 code index instead of on the values?
    a: The estimate read 0.104 against 0.278 on the values, three times too low; the linear structure is in the values and the log grid hides it
    wrong: ["The two estimates agreed", "The index-space estimate was three times too high", "Neither could be computed"]
    why: The winning compressors predict in value and integrate the probability over the FP8 cell; subtracting a prediction in index space throws the structure away.
    sec: grid
---

A [[lossless]] compressor's job on this site is small and strict: for every [[element]] of a [[cherry]], hand back the exact 8-bit code it was stored as. This page is the card of that code. Part II explains the format gently ([[#school-fp8]]); here are the facts a compressor's author needs.

## The layout {#layout}

- 1 sign bit, 4 exponent bits (bias 7), 3 mantissa bits. The "fn" variant has no infinities and one NaN pattern (S.1111.111).
- Largest finite value 448; smallest normal $2^{-6}$; subnormals down to $2^{-9}$.
- Non-negative representable values: 0, 7 subnormals, and 15 binades × 8 − 1 = **127**. With the sign: 253 distinct values plus −0, which the dump canonicalizes to +0 when rounding ([[attention]] cannot tell them apart).
- Within a binade the spacing is $2^{-3}$ of the binade's start: the rounding error is at most 1/16 of the value for normal numbers.

```python the 127 non-negative E4M3 values, in order
import numpy as np
subnormals = [m * 2**-9 for m in range(1, 8)]                      # 7 values below 2**-6
normals    = [2**(x - 7) * (1 + m / 8) for x in range(1, 16)        # 15 binades …
                                        for m in range(8)]        # … of 8 values each
normals.pop()                                                       # S.1111.111 is NaN
grid = np.array([0.0] + subnormals + normals)                       # 127 values, 448 is the last
```

::: takeaway
- E4M3 is a logarithmic grid with 253 useful values; a compressor reproduces one of them exactly per element.
:::

## Index space and scaling {#index}

- **Index space.** Sort the 127 non-negative values; a value's index is its position, with the sign of the value ([[index-space]]). A residual of ±1 is one mantissa step; a residual across a binade boundary is a relative step. This is why subtracting a prediction in index space only makes sense far from zero ([[#toolbox-bit-fields]]).
- **Scaling, as the campaigns did it.** One power-of-two scale per KV layer and per tensor (keys or values), so that the large values map near 256 and leave headroom up to 448. Power-of-two scales are exact and cost nothing to store ([[#measured-the-data]]).
- **Cross-check.** PyTorch's `torch.tensor(x).to(torch.float8_e4m3fn)` must agree element by element with the dump's own rounding (both round to nearest, ties to even). The Bench's dump captured BF16 and derived FP8 this way; a second LLM would go through the same check ([[#plan-the-dataset-we-have]]).
- **The INT8 alternative.** One scale per [[furrow]] (or per furrow per punnet, stored in the dictionary), $x \mapsto \mathrm{round}(x/\text{scale})$ clipped to ±127. A uniform grid, on which prediction behaves as in ordinary arithmetic ([[integer-grid]]).

::: takeaway
- Residuals are counted in grid steps; E4M3 and INT8 are both worth scoring because they treat prediction differently.
- The campaigns' recipe: one power-of-two scale per layer and tensor, round to nearest even, −0 → +0.
:::

## What the data taught about the grid {#grid}

The first draft said the grid matters and feared that E4M3's log spacing would spoil prediction. The campaigns confirmed the first half and found the way round the second. The winning compressors never subtract in index space: they predict in **value**, then integrate the predicted probability over the FP8 cell that the true code occupies, and feed that probability to the entropy coder ([[grid-aware-model]], [[#toolbox-bit-fields]]). <!-- old-words -->

| estimate of shared bits per element | on the values | on the FP8 code index |
|---|---|---|
| Gaussian estimate | 0.278 | 0.104 |
| real code lengths of the compressor | 0.263 | |
| skew of the prediction error | −0.03 | −1.60 |

The index-space estimate reads three times too low, because the linear structure of the values is straight in value and bent on the log grid. The old worry about "the mantissa is noise" was an artefact of the same lens: a real probability table of one head's values from local history pays about 0.50 bit on the mantissa, not the 0.37 floor first claimed, and the framing cost the compressors at most 0.009 of ratio ([[#measured-time-and-bits]]).

::: theme grid-matters
The same prediction saves bits in value space and loses them on the code index. The fix was not a different grid but a compressor that models the value and sums over the cell.
:::

::: aside source Receipts
Layout: the E4M3fn definition (Micikevicius et al. 2022) and `torch.float8_e4m3fn`. Scaling recipe: `docs/spec/target-writer.md` §1 of the experiment repository, via PART-XI-SPEC §1.1. Shared-bits estimates 0.278 / 0.263 / 0.104 and skews −0.03 / −1.60: PART-XI-SPEC §1.8 (r13 audit, r15); "mantissa floor 0.37 was false, a real one-head model pays ≈ 0.50" and "framing cost at most 0.009": the same section.
:::

::: takeaway
- Predict in value, integrate over the FP8 cell: the structure is in the values and the log grid hides it.
- Estimates made on the code index undercount shared bits by about 3×.
:::
