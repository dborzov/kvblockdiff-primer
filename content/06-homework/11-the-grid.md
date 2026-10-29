---
title: The 8-bit grid gives and takes
nav: The 8-bit grid gives and takes
group: Rates and grids
lede: 'FP8''s logarithmic grid makes a bell-shaped channel cheap to code alone — and makes prediction expensive. On a uniform INT8 grid it is the other way round. One Monte Carlo run, and one live one, show the trade; a one-bit flag per channel keeps it from hurting.'
cards:
  - q: Why does E4M3 favour solo coding?
    a: Its logarithmic grid gives a bell-shaped channel an order-0 entropy of 6.47 bits at any scale, against 7.05 on a per-channel INT8 grid
    wrong: ["Because E4M3 has more codes than INT8", "Because E4M3 values are always smaller", "Because E4M3 has no sign bit"]
    why: The log grid packs codes near zero, where values are, and spends few on the big values — at the price of coarser precision for them.
    sec: grids
  - q: Why can a good prediction cost bits in E4M3 index space?
    a: A value and its prediction on opposite sides of zero are many grid steps apart, because the grid is dense near zero
    wrong: ["Because E4M3 cannot store negative numbers", "Because the residual is rounded", "Because index space has fewer values"]
    why: '−3 predicted by 6 is 144 E4M3 steps but only 5 INT8 steps. Small values near a non-zero prediction produce huge residuals.'
    sec: grids
  - q: 'In E4M3 index space, below what share of variance explained is a block-mean predictor net negative?'
    a: About R² = 0.7
    wrong: ["About R² = 0.1", "It is never negative", "About R² = 0.99"]
    why: Our Monte Carlo (n = 400,000) reproduces the source draft — −0.81 bit at R² = 0.3, zero near 0.7, and about 0.8 bit behind INT8 above it, at any channel scale.
    sec: live
  - q: What does the per-channel "predict or not" flag do?
    a: For each channel the coder stores either the raw codes or the residuals, whichever is cheaper, and spends one bit per channel saying which
    wrong: ["It switches the whole cache between E4M3 and INT8", "It marks escaped values", "It turns the dictionary off for a block"]
    why: The harness scores min(raw, residual) per channel. The flag costs one bit per channel per dictionary, almost nothing.
    sec: flag
  - q: Above roughly which R² does INT8 with a per-channel scale store fewer bits in total than E4M3 (solo coding included)?
    a: About 0.55
    wrong: ["About 0.05", "About 0.95", "Never"]
    why: E4M3 starts 0.58 bit lower (6.47 against 7.05) but gains less from prediction; the curves cross near 0.55, after which INT8 stores up to 0.3 bit less.
    sec: flag
---

A key's element sits at −3 (in the units of its tensor's scale). The block's dictionary predicts 6. How far off is the prediction?

On an evenly spaced [[integer-grid|INT8]] grid with a step of 2, the answer is **5 steps**. On the [[fp8]] E4M3 grid, counted in [[index-space]], it is **144 steps** — more than half of the whole grid. Same value, same prediction, same 8 bits per element.

## Two grids, two habits {#grids}

::: aside reminder Index space and the two grids (II.19, II.20)
- INT8 with a scale stores $\mathrm{round}(\vx/\text{scale})$: the grid points are evenly spaced, and a difference of codes is a difference of values ([[#school-integers-floats]]).
- E4M3 is a [[floating-point]] grid: 8 values per power of two, so the spacing grows with the size. Numbering its 253 values in order gives index space; a residual there counts grid steps ([[#school-fp8]]).
:::

Five value–prediction pairs, both ways (E4M3 values in their own units; INT8 with a step of 2, the per-channel scale of a channel with spread 64):

| value | prediction | INT8 residual (steps) | E4M3 residual (steps) |
|---:|---:|---:|---:|
| 104 | 96 | +4 | +1 |
| 40 | 44 | −2 | −1 |
| −60 | −52 | −4 | −2 |
| 10 | 2 | +4 | +18 |
| −3 | 6 | −5 | −144 |

Far from zero, E4M3's steps are coarse, so its residuals are *smaller* than INT8's. Near zero, its steps are tiny, so a small miss becomes a huge number of steps — and crossing zero means walking past every tiny value in between.

That is the whole story of this page, in two habits:

- **Coding alone, the log grid wins.** [[#homework-the-budget]] found 6.47 bits for a bell-shaped channel in E4M3, at any scale, against 7.05 on a per-channel INT8 grid.
- **Predicting, the uniform grid wins.** Residuals on INT8 behave like ordinary arithmetic, so the exchange rate of [[#homework-exchange-rate]] applies as is. In E4M3 index space, any value near zero next to a non-zero prediction blows up.

(Remember that the grids do not store the same numbers: E4M3 is coarser for big values and finer for small ones. Which one to store is a choice of the system; the coder must reproduce whichever is chosen.)

::: takeaway
- E4M3's log grid makes solo coding cheap (6.47 bits) and prediction risky: near zero, small misses are many steps.
- INT8's uniform grid costs more alone (7.05 bits) but turns variance explained into bits at the textbook rate.
:::

## The live check {#live}

Take one bell-shaped channel. Give each block of 256 values its own mean, drawn so that the block means explain a share $\vRsq$ of the channel's variance. Predict every value by its block's mean, and count bits on both grids.

::: figure fig-hwa-grid-live hwaGridLive
**Block-mean prediction on two grids, live.** One channel of 51,200 values (200 blocks of 256), drawn in your browser from a seeded generator: block means explain a share $\vRsq$ of the variance (slider), the rest is noise. Top: the histogram of E4M3 residuals in index steps (value's grid position minus the prediction's); bottom: INT8 residuals in codes (spread 32 codes). The prediction is each block's mean of the real values, rounded to the grid. Tiles: order-0 entropy of the raw codes (coding alone) and of the residuals, in bits per element, and the difference. **Slide** $\vRsq$ and the channel's spread (E4M3 units): the E4M3 numbers do not care about the spread.
:::

::: try
1. At $\vRsq = 0.3$, INT8 saves a quarter of a bit; E4M3 *loses* about 0.8. Look at the E4M3 histogram: two far-off humps of values that sit on the other side of zero.
2. Find where E4M3's saving crosses zero: near $\vRsq = 0.7$.
3. Change the spread from 8 to 100: the E4M3 numbers stay put. The log grid has no favourite scale, for better and for worse.
:::

The same experiment with 400,000 values per point (`analysis/homework_a_grid.py`) gives the full curves:

::: figure fig-hwa-grid-curves hwaGridCurves
**What the grid takes back.** Panel A, bits per element saved by the block-mean predictor against $\vRsq$: the textbook formula $\tfrac12\log_2\frac{1}{1-\vRsq}$ (grey), INT8 with a per-channel scale, and E4M3 index space at three channel spreads (4, 40, 100). Panel B, total bits per element with solo coding included: INT8 stores its residuals; E4M3 stores whichever is cheaper, raw codes or residuals (the flag of the next section). **Switch** panels; hover for values. Seeded Monte Carlo, one Gaussian channel, blocks of 256.
:::

Our numbers match the source draft's to a few hundredths: E4M3's saving is −0.81 bit at $\vRsq = 0.3$, about zero at 0.7, +0.31 at 0.8, +0.87 at 0.9, and stays about 0.8 bit behind INT8 above 0.7, at all three spreads. INT8 follows the formula within a few hundredths everywhere.

::: takeaway
- In E4M3 index space a block-mean predictor is net negative below $\vRsq \approx 0.7$, and about 0.8 bit behind INT8 above it — at any channel scale.
- On INT8 the same predictor saves what the exchange rate promises.
:::

## The flag, and the format choice {#flag}

Two cheap consequences follow, both now part of the harness ([[#plan-accounting]]).

1. **A one-bit flag per channel.** Each dictionary says, for each channel, "use the prediction" or "store raw". The harness scores $\min(\text{raw}, \text{residual})$ per channel and charges the bit. In E4M3 that turns every negative saving into zero; panel B's E4M3 curve is flat at 6.47 until prediction starts to pay.
2. **INT8 with a per-channel scale is scored next to E4M3.** Both are 8 bits; which one the store keeps is an infrastructure choice. From panel B: E4M3 is cheaper while $\vRsq$ is below about 0.55; above it, INT8 stores less — 0.2–0.3 bit for $\vRsq$ between 0.7 and 0.93 (as the source draft says), shrinking to 0.1 near 0.98.

There is also a clean fix that never loses: code each element with the prediction as **context** — a separate code for "values predicted near 6", another for "values predicted near 96" — instead of subtracting in index space. Conditioning can only lower the entropy ([[#school-side-information]]), so it never does worse than coding alone. But a code that changes with the context is not a fixed-length code, so it is reported in the entropy-rate column only ([[#homework-two-rates]]; [[#missed-context-modeling]] has more).

::: theme grid-matters
Here the theme has numbers. The same block-mean predictor saves 1.13 bits per element on an INT8 grid and 0.31 on E4M3 at $\vRsq = 0.8$; at $\vRsq = 0.5$ it saves half a bit on one and costs half a bit on the other. A result about "how compressible KV is" means little until it names the grid.
:::

::: takeaway
- A one-bit flag per channel stops prediction from ever costing bits.
- E4M3 is cheaper below $\vRsq \approx 0.55$, INT8 above; both are scored.
- Coding with the prediction as context never loses, but is not fixed-length.
:::
