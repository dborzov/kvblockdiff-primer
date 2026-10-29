---
title: The mantissa is noise, and the 8-bit grid is not neutral
nav: Mantissa and grid
lede: The first draft thought in BF16, where seven bits of every number behave like coin flips that no dictionary can call. And it treated "subtract the prediction" as if every number grid were a ruler with even marks. Neither holds, and both change what gets measured.
cards:
  - q: For a bell-shaped channel stored in BF16 with no predictor, what do sign, exponent and mantissa cost?
    a: About 1.0 + 2.5 + 7.0 ≈ 10.5 bits, so at most about 1.5× smaller
    wrong: ["About 1 + 1 + 1 = 3 bits, so about 5× smaller", "16 bits — BF16 cannot be compressed", "About 8 bits, so 2× smaller"]
    why: The exponent is predictable, the mantissa is not. Published lossless coders get 1.3–1.5× on BF16 for this reason.
    sec: mantissa
  - q: A prediction explains 90 % of a channel's variance. How many of the 16 BF16 bits are still close to coin flips?
    a: 8 of 16 — the 7 mantissa bits and the lowest exponent bit
    wrong: ["None — 90 % is a very good prediction", "2 of 16", "All 16"]
    why: The residual's spread is about a third of the value's, far wider than the mantissa's step, so every mantissa bit stays unknown.
    sec: mantissa
  - q: A value 0.40 is predicted as −0.10. How far apart are they on the E4M3 grid and on the INT8 grid (scale 4/127)?
    a: 74 steps on E4M3, 16 steps on INT8
    wrong: ["16 steps on both", "1 step on E4M3, 16 on INT8", "74 steps on both"]
    why: E4M3's grid is dense near zero, so a residual that crosses zero spans many grid points. INT8's grid is even.
    sec: grid
  - q: What does the E4M3 grid do to prediction and to solo coding?
    a: It helps solo coding (6.47 vs 7.04 bits) and hurts prediction in index space
    wrong: ["It helps both", "It hurts both", "It hurts solo coding and helps prediction"]
    why: A logarithmic grid makes a bell-shaped channel cheap on its own, but turns small differences near zero into many steps.
    sec: grid
  - q: What does the plan do about the grid?
    a: Scores both E4M3 and INT8 with a scale, and gives every channel a one-bit "predict or not" flag
    wrong: ["Stores everything in BF16 instead", "Uses E4M3 only and ignores the effect", "Rounds all residuals to zero"]
    why: Both are 8-bit storage formats an inference system may choose; the flag stops prediction from making a channel worse.
    sec: grid
---

Here are six consecutive values of one well-behaved channel, written out as the 16 bits of BF16: sign, exponent, mantissa. (Synthetic numbers, drawn around 1.3 with a small spread.)

```text one channel, six tokens, in BF16
 1.2188   0 01111111 0011100
 1.2812   0 01111111 0100100
 1.5000   0 01111111 1000000
 1.3828   0 01111111 0110001
 1.1016   0 01111111 0001101
 1.2969   0 01111111 0100110
```

Notice anything? The first nine bits never change. The last seven change every time, and in no pattern you could guess.

You have watched this happen before. [[#school-integers-floats]] stored the foot thermometer of the ten days at Gull Rock in BF16, 480 readings, and counted every bit.

::: dataset fig-ma-bf16-again ten-days-bf16 view=raster,entropy hl=low metrics=range,exp,man,all
**The Gull Rock thermometer in BF16, bit by bit (II.19).** *Plot:* "All 7,680 bits" draws one thin column per reading (480, in time order) and one row per bit position: sign (grey) at the top, then the 8 exponent bits (blue) and the 7 mantissa bits (red); a filled cell is a 1, and the number at the right of each row is that bit's entropy over the ten days. "Entropy of each bit" shows the same entropies as bars, from 0 (always the same) to 1 (a fair coin). The highlight marks the few readings below 8 °C, the only ones with a different exponent. *Table:* every reading with its 16 bits. *Numbers:* the information in each field. Derived from synthetic, seeded data.
:::

Nine stored bits of sign and exponent carry 0.22 bit of information. Seven mantissa bits carry 5.91, close to a coin flip each. The top of the number is nearly free; the bottom is nearly noise, exactly as in the six values above.

## What the first draft took for granted {#claim}

Two quiet assumptions sat under the first draft. This is our paraphrase; the earlier proposal recorded the correction, not the sentences.

1. **It thought about the KV cache in BF16,** the format HiSparse stores and moves.
2. **It treated "predict, subtract, code the difference" as independent of the number format,** as if every value sat on a ruler with evenly spaced marks.

Both were natural.

- **BF16 is where the bytes are today.** HiSparse serves BF16 KV: about 200 MB per generated token if nothing were cached ([[#landscape-memory-wall]]).
- **There is a working literature.** Lossless float coders report 1.3–1.5× on BF16 ([[#papers-float-coders]], [[#papers-splitzip]]).
- **Subtraction is the most natural operation there is.** In ordinary arithmetic a small difference is a small number.

::: takeaway
- The draft framed the problem in BF16 and assumed the grid did not matter.
- Both assumptions shape what can be won, so both had to be checked.
:::

## The mantissa is noise {#mantissa}

::: aside reminder BF16 and floating point
[[#school-integers-floats]]: a [[floating-point]] number is sign × mantissa × 2^exponent. [[bf16|BF16]] has 1 sign bit, 8 [[exponent]] bits and 7 mantissa bits. The exponent picks the power of two; the mantissa picks the position inside it.
:::

The exponent of a well-behaved channel hardly moves, so it is cheap. The mantissa is the opposite. To call its last bit you would need to know the value to within about half a per cent. No dictionary predicts KV values that well.

The figure measures this directly. It draws a value and a prediction that explains a chosen share of its variance, writes both in bits, and counts how often each bit differs.

::: figure fig-ma-bitflips maBitFlips
**Which bits a prediction cannot tell you.** Each cell is one bit position of the format, coloured by field (sign, exponent, mantissa). Its filled height and the number under it give how often that bit of the true value differs from the same bit of the prediction, in per cent; 50 means a coin flip, so the prediction says nothing about that bit. *Top row:* BF16. *Bottom row:* [[fp8|E4M3]], for the same values scaled to use its range. *Slider:* the share of the value's variance the prediction explains, [[r-squared|R²]]. *Readout:* how many bits are within 10 points of a coin flip, and the [[order-0-entropy]] of the three BF16 fields of these values (no predictor). 20,000 bell-shaped values, seeded.
:::

- With no predictor, the BF16 fields cost about 1.00 + 2.55 + 6.97 = 10.5 bits. That caps lossless BF16 near 1.5× for this channel. SplitZip's exponent coder gets 1.32× on real KV.
- A prediction that explains 90 % of the variance still leaves 8 of the 16 BF16 bits as coin flips. At 99 %, 6 remain.
- Consequence: a dictionary that saves one bit per element takes BF16 from 10.5 to 9.5 bits (×1.11), and an 8-bit E4M3 element from 6.47 to 5.47 bits (×1.18). The noise in the low bits dilutes every gain.

8-bit storage has already rounded most of that noise away, and it is where KV storage is heading ([[#plan-fixed-choices]]). So the earlier proposal concluded: "8-bit is where the question is interesting."

::: note warning Our read: "no matter what" is a little too strong
The earlier proposal wrote that BF16 lossless "caps near 1.3× no matter what". Strictly, a predictor that made the sign and the exponent free would leave only the 7 mantissa bits, a ceiling near 16/7 ≈ 2.3×. No realistic KV predictor gets close: in the figure, even R² = 99 % leaves 6 coin-flip bits. In practice 1.3–1.5× is the ceiling.
:::

::: takeaway
- In BF16, seven bits of every number behave like noise for any realistic predictor.
- 8-bit storage throws most of that noise away first, so it is where dictionaries could matter.
:::

## The grid is not neutral {#grid}

::: aside reminder E4M3 and index space
[[#school-fp8]]: E4M3 has 1 sign, 4 exponent and 3 mantissa bits. Its representable values are dense near zero and sparse far out: a logarithmic grid. In [[index-space]] we number the grid points in order and count residuals in steps. A small extra fact: for a positive E4M3 number, the 7-bit pattern *is* its index.
:::

::: figure fig-ma-gridline maGridLine
**One channel, two 8-bit grids, one residual.** *Top lane:* the E4M3 grid points (blue ticks); near zero they pack into a solid band. *Bottom lane:* the INT8 grid with one scale per channel, 4/127, so ±4 standard deviations fill the range (teal ticks, evenly spaced). The brown knob is the value, the purple knob its prediction; dashed lines drop them through both grids. The shaded bars and labels give the residual, counted in grid steps, on each grid. *Controls:* drag either knob, or focus it and use the arrow keys; switch between the whole channel and a close-up near zero. The channel's standard deviation is 1.
:::

- Value 0.40, prediction −0.10: **74 steps** apart on E4M3, **16** on INT8. The residual crosses zero, where E4M3 is densest.
- Value 1.00, prediction 0.90: 2 steps on E4M3, 3 on INT8. Away from zero the log grid is coarse and kind.
- Value 0.05, prediction −0.05: 42 steps on E4M3, 4 on INT8.

Averaged over a whole channel, [[#homework-the-grid]] measures the result. Predicting from a block mean in E4M3 index space is *worse than not predicting* when the mean explains less than about 70 % of the variance, and stays about 0.8 bit behind INT8 above that. But E4M3 has the cheaper start: 6.47 bits per element for solo coding against 7.04 for INT8. The grid gives with one hand and takes with the other.

What changes in the plan:

- **Both formats are scored:** E4M3, and INT8 with one scale per channel. Both are 8-bit formats an inference system can legitimately choose.
- **Every channel carries a one-bit flag, "predict or not".** A prediction is used only where it helps.
- **The clean fix is noted for the entropy-rate column only.** Using the prediction as *context* rather than subtracting it never loses, but it is not fixed-length ([[#missed-context-modeling]]).

:::: compare Two 8-bit grids
::: col E4M3 (logarithmic)
- **Spacing:** proportional to the value's size.
- **Solo coding, bell-shaped channel:** 6.47 bits.
- **Residuals near zero:** many steps.
- **Good for:** coding each value on its own.
:::
::: col INT8 with a scale (even)
- **Spacing:** the same everywhere.
- **Solo coding, same channel:** 7.04 bits.
- **Residuals near zero:** as many steps as anywhere.
- **Good for:** prediction, which behaves like ordinary subtraction.
:::
::::

::: theme grid-matters
The same prediction, 0.40 guessed as −0.10, is 74 steps on one grid and 16 on the other. How numbers are stored decides whether a dictionary helps at all.
:::

::: takeaway
- A log grid helps solo coding and hurts subtraction near zero.
- The plan scores E4M3 and INT8, and lets each channel switch prediction off.
:::
