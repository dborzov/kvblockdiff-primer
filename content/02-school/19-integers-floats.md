---
title: Integers and floats
nav: Integers and floats
lede: An 8-bit chip has 256 patterns to give out. Spread them evenly and you get an integer grid, perfect for temperatures. Spread them so they are dense near zero and sparse far away and you get floating point, perfect for rainfall. Bigger floats, like the BF16 numbers of language models, carry low bits that look like pure noise.
group: Numbers
cards:
  - q: 'In INT8 with a scale of 0.25 °C, what values can be stored, and how far off can a temperature be?'
    a: 'Multiples of 0.25 °C from −31.75 to +31.75; at most 0.125 °C off'
    wrong: ["Any value from −128 to 127 °C, exactly", "Multiples of 0.25 °C from 0 to 63.75; at most 0.25 °C off", "Values within 6 % of any temperature"]
    why: 'INT8 stores a whole number k between −127 and 127 and means k × scale. The grid is even, so the rounding error is at most half a step everywhere.'
    sec: int8
  - q: Why does a uniform 8-bit grid suit rainfall rate (0.1 to 100 mm/h) so badly?
    a: 'Its step, about 0.8 mm/h, is bigger than a whole drizzle — every light rain rounds to 0 or 0.8'
    wrong: ["Because rain needs negative numbers", "Because 100 mm/h does not fit in 8 bits", "Because rain changes too slowly"]
    why: 'With 127 steps up to 100 mm/h, the step is 100/127 ≈ 0.79 mm/h. Drizzle (0.1–0.5 mm/h) is lost entirely; the top of the range is measured far more finely than anyone needs.'
    sec: int8
  - q: 'What do the exponent and the mantissa of a floating-point number do?'
    a: The exponent picks the power of two (the binade); the mantissa picks the position inside it
    wrong: ["The exponent stores the sign; the mantissa stores the value", "The exponent stores the digits; the mantissa the decimal point", "Both store halves of an ordinary integer"]
    why: 'Value = sign × (1 + fraction) × 2^exponent. Inside one binade the steps are equal; each binade up, they double.'
    sec: float
  - q: 'What does BF16 look like, bit by bit?'
    a: 1 sign bit, 8 exponent bits, 7 mantissa bits
    wrong: ["1 sign bit, 5 exponent bits, 10 mantissa bits", "1 sign bit, 4 exponent bits, 11 mantissa bits", "16 mantissa bits and no exponent"]
    why: 'BF16 keeps the 8-bit exponent of a 32-bit float, so it has the same range, but only 7 mantissa bits: 11.4 becomes 11.375.'
    sec: float
  - q: 'In ten days of BF16 temperatures from Gull Rock, how much information do the 8 exponent bits carry together?'
    a: About 0.22 bits — only two exponents ever occur
    wrong: ["About 8 bits — one per exponent bit", "About 4 bits — half of the field", "Exactly 0 bits — the exponent never changes"]
    why: 'All temperatures lie between 4 and 16 °C, so only the binades [4, 8) and [8, 16) appear. The mantissa bits, by contrast, look like coin flips.'
    sec: noise
---

The Gull Rock station has a small chip that stores readings in **8 bits** each. That gives it 256 different patterns, and every pattern must stand for one number. Which 256 numbers should they be?

Two readings make the question sharp.

- **Temperature** lives between about −20 and +35 °C, and every tenth of a degree matters about equally. A forecaster cares as much about 24.6 versus 24.8 as about 0.6 versus 0.8.
- **Rainfall rate** runs from a drizzle of 0.1 mm/h to a cloudburst of 100 mm/h. Here what matters is *relative*: 0.1 versus 0.3 mm/h is the difference between damp and wet, while 90 versus 92 mm/h is the same downpour.

One quantity wants evenly spaced values, the other wants values that are dense near zero and sparse far away. There is a number format for each.

## A ruler with even marks: INT8 {#int8}

::: define integer-grid
- **What it is:** store a whole number $k$ between −127 and 127, and let it mean $k \times \text{scale}$. The representable values are evenly spaced, one scale apart.
- **Example:** temperature with a scale of 0.25 °C covers −31.75 … +31.75 °C, and any temperature in that range is at most 0.125 °C off.
- **The scale is per channel.** Each sensor gets its own (II.13): what suits a thermometer is useless for a barometer.
- **Easy to confuse with:** plain integers. Without the scale, INT8 could only hold whole numbers up to 127.
:::

The even grid is perfect for temperature and hopeless for rain. To reach 100 mm/h with 127 steps, the step must be $100/127 \approx 0.79$ mm/h. Every drizzle rounds to 0 or to 0.79. Meanwhile the steps near 100 mm/h are finer than any rain gauge. (Rain is never negative, so half the codes are wasted too; even with all 255 codes the step would be 0.39 mm/h, still a whole drizzle wide.)

::: takeaway
- INT8 with a scale stores $k \times$ scale for $k$ from −127 to 127: an even grid, with the same absolute error everywhere.
- Even grids suit quantities whose every step matters equally, like temperature.
:::

## A ruler with stretching marks: floating point {#float}

The other way to hand out 256 patterns: make the marks spread out as numbers grow, so that the *relative* error stays the same.

::: define floating-point
- **What it is:** a number stored as $\text{sign} \times (1 + \text{fraction}) \times 2^{\text{exponent}}$. The spacing between neighbouring values grows with their size, so the relative precision is constant and the grid is logarithmic.
- **Example:** an 8-bit float with 3 fraction bits keeps every value from about 0.016 up to 448 within 1/16 = 6.25 % of the truth (the few values below that are coarser).
- **Easy to confuse with:** decimal scientific notation. Same idea, but in powers of two.
:::

::: define exponent
- **The exponent** picks the power of two. All numbers that share an exponent form a **binade**: [1, 2), [2, 4), [4, 8), …
- **The mantissa** (the fraction bits) picks the position inside the binade, in equal steps. Each binade up, the steps double.
- **In data:** the exponent of a quantity that stays in a narrow range is very predictable, while the lowest mantissa bits are close to noise.
:::

Put both grids on one number line and drag a value along it.

::: figure fig-sv-grids svGrids
**Two ways to spend 8 bits, on one number line.** Top row (blue): the INT8 grid, $k \times \text{scale}$ for $k = -127 \dots 127$; the scale is 100/127 mm/h for rain and 0.25 °C for temperature. Bottom row (red): an 8-bit float grid with 4 exponent bits and 3 fraction bits (the format of the next page). Each tick is one representable value. *Drag* the handle to choose a value; the big dots mark the nearest point of each grid, and the tiles give the stored value and how far off it is. The buttons switch the quantity (rainfall rate 0–100 mm/h, temperature −30…+30 °C) and, for rain, between an even and a logarithmic axis.
:::

::: try
1. Rain, even axis: the red ticks pile up near zero, the blue ones are evenly spread. Drag to 0.3 mm/h: INT8 stores 0 (100 % off), the float stores 0.3125 (4 % off).
2. Switch to the logarithmic axis. Now the float grid looks even and the INT8 grid is a few lonely ticks at the left and a crowd at the right.
3. Temperature, drag to 25 °C: INT8 stores 25.00 exactly; the float stores 24, a whole degree off, while it resolves values near 0 °C to a thousandth of a degree that nobody needs.
:::

Language models usually keep their numbers in a 16-bit float.

::: define bf16
- **What it is:** bfloat16, a 16-bit float with 1 sign bit, 8 exponent bits and 7 mantissa bits. It keeps the exponent of the common 32-bit float, so it covers the same enormous range, but only about 2–3 significant decimal digits.
- **Example:** 11.4 °C becomes 11.375 in BF16: sign `0`, exponent `10000010` (the binade [8, 16)), mantissa `0110110`.
- **Where it is used:** the usual working format of language models — their weights, activations and memory.
:::

::: theme grid-matters
A grid is a choice about where precision goes. The even grid spends it uniformly; the floating-point grid spends it near zero. Temperature and rainfall need opposite choices, and so do the coding tricks of later pages: the next page shows that predictions behave very differently on the two grids.
:::

::: takeaway
- Floating point stores sign × (1 + fraction) × 2^exponent: steps grow with size, relative error stays constant.
- The exponent picks the binade, the mantissa the position inside it.
- BF16 = 1 + 8 + 7 bits: huge range, few digits.
:::

## The low bits look like noise {#noise}

Take the foot thermometer of the ten days at Gull Rock ([[#fig-sv-tendays-data]]), store every reading in BF16, and look at the bits — all 480 × 16 of them.

::: dataset fig-sv-bf16-data ten-days-bf16 view=raster,entropy,hist metrics=range,exp,man,all,low
**Ten days of temperatures as BF16 bit patterns.** *Plot:* "All 7,680 bits" draws one thin column per reading (480, in time order) and one row per bit position, sign (grey) at the top, then the 8 exponent bits (blue) and the 7 mantissa bits (red); a filled cell is a 1, and the number at the right of each row is that bit's entropy over the ten days. "Entropy of each bit" shows the same entropies as bars, from 0 (always the same) to 1 (a fair coin); hover a bar for its value. "Temperatures" is the histogram of the readings, with the boundary between the binades [4, 8) and [8, 16). *Table:* every reading with its BF16 value and its 16 bits. *Numbers:* the entropy of the exponent field, of the mantissa field and of the whole pattern, each counted together. Derived from synthetic, seeded data.
:::

::: aside reminder Entropy (II.4)
[[entropy|Entropy]] is the average surprise, in bits. A bit that is always 0 carries 0 bits; a bit that is 0 or 1 with equal odds carries 1 bit.
:::

Three things stand out.

- **The sign bit and six of the eight exponent bits never change.** All temperatures lie between 6.4 and 15.3 °C, so only two binades ever occur, and only 17 of the 480 readings fall in the lower one, [4, 8). Together the sign and exponent carries **0.22 bits**, out of 8 stored.
- **The mantissa bits look like coin flips.** Each carries 0.88 to 1.00 bits, and the seven together carry 5.91. The lowest ones encode sixteenths of a degree — finer than the thermometer's own noise (about 0.15 °C).
- **The whole 16-bit pattern carries 5.97 bits.** A coder could save 10 bits per value here, most of them in the sign and exponent.

This pattern — predictable exponent, noisy mantissa — is what lossless coders of model numbers find too ([[#papers-float-coders]]). The exponent is easy to squeeze; the mantissa is not, because its low bits really are noise. That caps lossless compression of 16-bit model data at a modest ratio, and it is one reason this site works with 8-bit numbers, where the noisy bits have already been rounded away.

::: theme noise-floor
The mantissa's low bits are the noise floor made visible: about one bit of genuine randomness per bit stored. No predictor and no dictionary can remove it, because there is nothing there to predict. A lossless code has to pay for every one of them.
:::

::: takeaway
- In BF16 temperatures, the 8 exponent bits carry 0.22 bits; the 7 mantissa bits carry 5.91.
- The low mantissa bits are close to noise and cannot be compressed away.
- Lossless coders of model numbers squeeze the exponent and pay in full for the mantissa.
:::
