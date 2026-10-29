---
title: FP8 E4M3 facts used by the coder
nav: FP8 facts
lede: The exact 8-bit format our lossless coder must reproduce, in one place.
cards:
  - q: How many distinct non-negative values does FP8 E4M3 (the "fn" variant) represent?
    a: 127 — zero, 7 subnormals and 15 binades of 8 values, minus the one NaN pattern
    wrong: ["128", "255", "256"]
    why: With the sign, that is 253 distinct values plus −0, which we canonicalize to +0.
    sec: layout
  - q: Why does the coder work in "index space"?
    a: So that a residual of 1 means one representable step, whatever the size of the step
    wrong: ["Because indices are always smaller than values", "Because E4M3 has no negative numbers", "Because KaTeX cannot draw floats"]
    why: On a logarithmic grid, equal value differences are very different numbers of steps near zero and far from it.
    sec: index
---

## The layout {#layout}

- 1 sign bit, 4 exponent bits (bias 7), 3 mantissa bits. The "fn" variant has no infinities and one NaN pattern (S.1111.111).
- Largest finite value 448; smallest normal $2^{-6}$; subnormals down to $2^{-9}$.
- Non-negative representable values: 0, 7 subnormals, and 15 binades × 8 − 1 = **127**. With the sign: 253 distinct values plus −0, which we canonicalize to +0 when rounding (attention cannot tell them apart).
- Within a binade the spacing is $2^{-3}$ of the binade's start: rounding error is at most 1/16 of the value for normal numbers.

::: takeaway
- E4M3 is a logarithmic grid with 253 useful values; the coder's job is to reproduce one of them exactly per element.
:::

## Index space and scaling {#index}

- **Index space:** sort the 127 non-negative values; a value's index is its position, with the sign of the value. A residual of ±1 is one mantissa step; a residual across a binade boundary is a relative step. This is the "logarithmic delta" effect, and it is why subtracting a prediction in index space only makes sense far from zero ([[#homework-the-grid]]).
- **Scaling:** one power-of-two scale per (layer, keys-or-values), chosen so that the 99.99th percentile of $|x|$ maps near 256, leaving headroom up to 448. Power-of-two scales are exact.
- **Cross-check:** PyTorch's `torch.tensor(x).to(torch.float8_e4m3fn)` must agree element by element with our `e4m3_round` (both round to nearest, ties to even). → [[#plan-fp8-target]]
- **The INT8 alternative:** one scale per channel (or per channel per block, stored in the dictionary), $x \mapsto \mathrm{round}(x/\text{scale})$ clipped to ±127. A uniform grid, on which prediction behaves as in ordinary arithmetic.

::: takeaway
- Residuals are counted in grid steps; E4M3 and INT8 are both scored because they treat prediction differently.
:::
