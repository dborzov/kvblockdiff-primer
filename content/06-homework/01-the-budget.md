---
title: The bit budget
nav: The bit budget
group: Napkin information theory
lede: Before building anything, count what there is to win. One 8-bit number from the KV cache looks like it holds 8 bits. It holds fewer — and how many fewer sets the budget every dictionary has to work with.
cards:
  - q: 'A bell-shaped channel stored in FP8 E4M3 has an order-0 entropy of about…'
    a: 6.47 bits per element, whatever the channel's scale
    wrong: ["8 bits — every code is equally likely", "4 bits — half the codes are never used", "6.47 bits only for one particular scale"]
    why: 'The E4M3 grid is logarithmic: scaling the channel slides its histogram along the codes without changing its shape, so the entropy stays at 6.47 bits (our Monte Carlo and the exact calculation agree).'
    sec: codes
  - q: Where do the 6.47 bits of an E4M3 element live?
    a: About 1 bit of sign, 2.5 bits of exponent, 2.9 bits of mantissa
    wrong: ["Mostly in the exponent — the mantissa is nearly free", "8 bits spread evenly over all fields", "Mostly in the sign"]
    why: The exponent is the only field with easy, context-free redundancy (4 bits stored, 2.5 bits of information). The mantissa is close to noise.
    sec: codes
  - q: 'What does $\vbpe$ count?'
    a: Bits per 8-bit element of a lossless code, with every cost included
    wrong: ["Bytes per entry, residuals only", "Bits per entry, excluding the dictionary", "The number of codes a channel uses"]
    why: 'Residual bits, the per-entry side information and the dictionary spread over its block all count. Raw storage is 8, and $\vrho \approx \vbpe/8$.'
    sec: budget
  - q: Coding each element alone with a good fixed code can save at most about…
    a: 1.5–1.8 bits per element (to 6.47 or 6.19 bits)
    wrong: ["4 bits per element", "0.1 bit per element", "Nothing — 8-bit numbers are incompressible"]
    why: That is the gap between 8 bits and the order-0 entropy (6.47 for a Gaussian in E4M3, 6.19 measured by SplitZip on real E5M2 KV). A fixed-length code gets roughly 1 bit of it.
    sec: budget
  - q: Where must everything a dictionary adds beyond that come from?
    a: From conditional structure — other channels of the entry or other entries of the block making an element more predictable
    wrong: ["From a better entropy coder", "From storing fewer mantissa bits", "From a larger hot cache"]
    why: An element's own histogram is already used by the context-free code. Only information about the element that comes from elsewhere can lower its cost further.
    sec: budget
---

Here are ten numbers from one [[channel]] of a KV cache — or rather, from a stand-in: ten draws from a bell curve, scaled the way an 8-bit KV tensor is scaled, and rounded to [[fp8]] E4M3. The card shows each draw, the value actually stored, and the stored byte itself: one sign bit, four [[exponent]] bits, three mantissa bits.

::: dataset fig-hwa-ten-draws homework-ten-draws view=bytes,ladder metrics=patterns,expH,signs,mant
**Ten draws, stored as E4M3 bytes.** *The ten bytes:* one row per draw — the drawn value, the E4M3 value it rounds to, its 8 bits (grey: sign, red: exponent, blue: mantissa; a filled box is a 1), and its grid position, the rung number counted from zero. *On the E4M3 ladder:* the 253 values E4M3 can hold (grey, value against rung number) with the ten stored values on top (hover a dot). The highlights mark the draws whose exponent is `1110`, or the negative ones. The drawn values are illustrative; the rounding, bytes and positions are computed exactly from the format.
:::

Notice anything?

## 253 codes, used unevenly {#codes}

Look down the columns of bytes. The sign is a coin toss. The mantissa takes all sorts of values. But the exponent keeps landing on the same few patterns: `1010`, `1011`, `1100`, `1110`. Ten values use only four of the sixteen possible exponents (the Numbers tab).

Ten draws are a small sample, so we counted a million: five exponents carry about 90 % of the values. The byte has 8 bits of room, but its contents are far from random.

That is exactly what [[order-0-entropy]] measures: how many bits an element costs if each element is coded alone, with a code fit to how often each value occurs.

::: aside reminder Order-0 entropy and the E4M3 grid
- **Order-0 entropy** ([[#school-entropy]]): take the [[histogram]] of the values, turn counts into probabilities $\vp_{\vi}$, average the surprisal $\log_2(1/\vp_{\vi})$. No context, no neighbours — each value alone.
- **E4M3** ([[#school-fp8]]): 127 non-negative values (zero, 7 tiny "subnormal" values, then 15 binades of 8 values each, minus one pattern reserved for NaN), so 253 distinct values with the sign. Numbering them in order gives the **grid position** in the last column, the [[index-space]] of II.20.
:::

The figure computes it for one bell-shaped ([[gaussian]]) channel, exactly, from the probability that each grid point gets hit.

::: figure fig-hwa-codes hwaCodeUsage
**Which of the 8-bit codes a bell-shaped channel actually uses.** Top: the probability of each E4M3 grid position (−126 … 126) for a Gaussian channel of spread $\vsigma$, measured in E4M3's own units (the largest value is 448). Bottom: the same channel on an [[integer-grid|INT8]] grid (codes −127 … 127), either with one scale for the whole tensor (fit to its widest channel, $\vsigma = 64$, so one code step is 2 units) or with the channel's own scale ($4\vsigma$ ↦ code 127). Bars are exact probabilities (the Gaussian's mass between neighbouring grid midpoints); hover a bar for its cost in bits. In index space the bell curve becomes two humps: the logarithmic grid packs many positions near zero, where few values fall. The tiles give the order-0 entropy in bits per element and how many codes cover 99 % of the values. **Slide** the spread over eleven powers of two; **switch** the INT8 scaling.
:::

::: try
1. Slide $\vsigma$ from 2 to 128. The E4M3 histogram slides sideways along the grid and keeps its shape: the entropy stays at 6.47 bits.
2. Do the same with INT8 using one scale for the tensor. Narrow channels squeeze into a few codes: fewer bits, but also far less precision.
3. Switch INT8 to a per-channel scale. Now it is scale-free too, at 7.05 bits — the cost of a uniform grid spending its codes evenly on a bell curve.
4. Push $\vsigma$ below 1/4: E4M3 runs into its subnormals (the evenly spaced values next to zero) and its entropy starts to drop.
:::

Two numbers come out of this, and both were checked with a seeded [[monte-carlo]] run of a million draws (`analysis/homework_a_budget.py`):

- **E4M3: 6.47 bits**, the same (within 0.1 bit) for any spread from about 1/4 to 128 — nine powers of two. A logarithmic grid has no favourite size, so one scale per tensor is enough.
- **INT8 with a per-channel scale: 7.05 bits** at a spread of 32 codes. A uniform grid spends codes evenly on a bell curve that is not even.

The two grids do not store the same numbers, though. E4M3 is finer than INT8 for values below about 0.4σ and several times coarser near the top of the range. Part of its lower entropy is simply less precision on the big values. For a lossless coder the stored codes are given; which grid to store is a separate choice, and [[#homework-the-grid]] shows it matters for prediction too.

Where do the 6.47 bits sit inside the byte? Split the entropy field by field:

| field | stored | information | verdict |
|:---|---:|---:|:---|
| sign | 1 | 1.00 | a fair coin |
| exponent | 4 | 2.54 | lopsided: the easy saving |
| mantissa | 3 | 2.93 | nearly uniform: noise |
| **all 8 bits** | **8** | **6.47** | |

(Bits of information per element, from the same Monte Carlo; the mantissa's is counted given the sign and exponent.)

This is the picture every lossless float coder in [[#papers-float-coders]] reports: the exponent is redundant, the mantissa is noise.

::: takeaway
- An 8-bit E4M3 element is one of 253 values, and a bell-shaped channel uses them very unevenly.
- Its order-0 entropy is 6.47 bits, independent of the channel's scale; a per-channel-scaled INT8 grid gives 7.05.
- The redundancy is in the exponent. The mantissa is close to noise.
:::

## The budget {#budget}

We need one unit for every cost on the rest of this Part.

::: define bpe
- **What:** the rate of a lossless code in **bits per 8-bit element**, everything included: the residual bits, any side information sent with each entry, and the dictionary spread over the entries that share it.
- **Anchors:** raw storage is $\vbpe = 8$. The [[delta-ratio]] of IV.2 is $\vrho \approx \vbpe/8$ — exactly so once the dictionary's small share is set aside, since the dictionary is stored once per block and not inside each delta ([[#homework-dictionary-shape]]).
- **Not to confuse with** entropy alone: entropy counts only the residual bits. $\vbpe$ is the whole bill.
:::

Now the budget. Coding each element alone with a fixed, global code can bring 8 bits down to the order-0 entropy, and no further:

::: figure fig-hwa-budget hwaBudgetBars
**The bit budget of one 8-bit element.** Horizontal bars: bits per element ($\vbpe$) for raw storage and for codes that look at each element alone. "Ideal" rows are order-0 entropies (what an [[entropy-coder]] would reach); "fixed-length" rows use a [[fixed-length-code]] for the exponent with [[escape|escapes]], as GPU decoders do. E4M3 rows are our Gaussian Monte Carlo; E5M2 rows are SplitZip's measurements on real KV ([[#papers-splitzip]]). Hover a bar for its compression ratio. The fixed-length E4M3 row assumes 12 bits to locate each escape (a block of 4096 entries).
:::

Read the bars as a budget:

1. **Ceiling for context-free coding:** 1.5 bits per element (E4M3 toy) to 1.8 bits (real E5M2 KV). That is 1.24× to 1.29× smaller than raw.
2. **What a fast fixed-length decoder keeps of it:** about 0.8 to 1 bit (1.10× to 1.14×).
3. **Everything else must come from conditional structure.** Other channels of the same entry, or other entries of the same [[block]], must make an element more predictable than its own histogram does. That is the only thing a dictionary can add.

::: keycard The unit of this Part
$$\vbpe \approx 8\,\vrho \qquad \text{raw: } 8 \quad\cdot\quad \text{coded alone: } \approx 6.2\text{–}6.5$$
Every gain on the next pages is counted in bits per element, starting from the context-free rate, not from 8.
:::

::: theme bits-unit
Here the theme becomes a budget. An element is worth 6.2–6.5 bits, not 8, before any dictionary exists. A dictionary that "saves 2 bits" is measured against that floor of context-free coding, and $\vbpe$ converts straight into bytes on the link through $\vrho \approx \vbpe/8$.
:::

::: takeaway
- $\vbpe$ is the whole bill per element. Raw is 8, and $\vrho \approx \vbpe/8$.
- Coding elements alone can reach 6.2–6.5 bits (ideal) or about 7 bits (fixed-length). That part needs no dictionary at all.
- A dictionary earns its keep only through conditional structure, measured from the context-free rate.
:::
