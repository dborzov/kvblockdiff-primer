---
title: 'Solo coding: the Hermit'
nav: 'Solo coding: the Hermit'
group: Napkin information theory
lede: The first rung of every comparison is a coder that never looks at a neighbour. It codes each element alone, with one code fit once, long ago, on other data. It is cheap, fast and already published — and every dictionary on the following pages has to beat it.
cards:
  - q: What does solo coding use to code an element?
    a: Only one fixed, global code per channel, fit once on calibration data
    wrong: ["The entry's block dictionary", "The previous entry of the same channel", "A code fit to each request at prefill"]
    why: The Hermit never looks at context. Its per-channel histograms are fit offline on a calibration corpus and shared by every request.
    sec: method
  - q: Roughly how much does solo coding save on 8-bit KV?
    a: About 1.1–1.3× (0.8–1.8 bits per element)
    wrong: ["About 4×", "About 2×", "Nothing at all"]
    why: The order-0 entropy is 6.2–6.5 bits (1.24–1.29× ideal); fixed-length versions reach about 1.10–1.14×. SplitZip's top-8 code on real E4M3 even expanded the data (0.93×).
    sec: method
  - q: Why are all gains on this site counted from solo coding rather than from raw storage?
    a: Because solo coding needs no dictionary, no residency and no block structure — any dictionary must beat it to be worth its costs
    wrong: ["Because raw storage cannot be measured", "Because solo coding is lossy", "Because solo coding is the slowest option"]
    why: Solo coding is the free lunch already on the table. Counting from raw would credit a dictionary with savings it did not create.
    sec: blind
  - q: 'A block''s values sit around a typical value of their own. The Hermit codes them with the global code. On average over blocks, how many extra bits does it pay per element?'
    a: '½ log₂ 1/(1 − R²), where R² is the share of variance the block means explain'
    wrong: ["Nothing — a global code is always optimal", "One bit per element, whatever the drift", "log₂ of the number of blocks"]
    why: 'The extra cost of a wrong code is the gap between two distributions (a cross-entropy). Averaged over blocks it equals the exchange-rate formula — exactly what a location dictionary could win back.'
    sec: blind
---

A lighthouse keeper on a rock writes the same kind of logbook line every hour. He has a fixed shorthand, agreed years ago with the harbour office: common words get short marks, rare words get long ones. He never looks back at yesterday's page and never compares notes with the next lighthouse. Each line is coded alone, by the book.

That is the whole of the first coder in our story. We call it the Hermit.

## The Hermit's method {#method}

::: define solo
- **What:** code every element of every [[entry]] alone, with one fixed code per [[channel]]. The code is fit once on a calibration corpus (other documents, other requests) and never changes.
- **What it stores:** a small table per channel, global — shared by all requests and fit offline. No per-request or per-block information.
- **Example:** SplitZip's exponent coder ([[#papers-splitzip]]) — a fixed 4-bit code for the most common exponents of BF16 KV, plus [[escape|escapes]].
- **Not to confuse with** a dictionary coder: solo coding predicts nothing and needs nothing on the GPU but its code tables.
:::

Here is the Hermit's code book for the exponent field of one bell-shaped channel stored in [[fp8]] E4M3 — the field where [[#homework-the-budget]] found the easy redundancy. The shares come from a million draws at a spread of 64, where the largest values land near 256 (`analysis/homework_a_budget.py`). The 12-bit position of an escape assumes a block of 4096 entries.

| exponent pattern | share of values | ideal code length | 3-bit fixed code |
|:---:|---:|---:|:---|
| `1100` | 29.6 % | 1.8 bits | 3 bits |
| `1101` | 27.9 % | 1.8 bits | 3 bits |
| `1011` | 18.0 % | 2.5 bits | 3 bits |
| `1010` | 9.5 % | 3.4 bits | 3 bits |
| `1110` | 5.3 % | 4.2 bits | 3 bits |
| `1001` | 4.8 % | 4.4 bits | 3 bits |
| `1000` | 2.4 % | 5.4 bits | 3 bits |
| `0111` | 1.2 % | 6.4 bits | 3 bits |
| the other 8 | 1.2 % | 7–13 bits | escape: 8-bit raw value + 12-bit position |
| **average** | | **2.54 bits** | **3.24 bits** |

The ideal lengths are surprisals, $\log_2(1/\vp)$ ([[#school-surprise]]); an [[entropy-coder]] would reach their average, 2.54 bits. The fixed-length column is what a GPU decoder likes: every element has the same width, so any one can be found and decoded alone. It pays 0.7 bit more for that convenience.

Add the sign (1 bit, a coin toss) and the mantissa (3 bits stored raw — it is noise) and an element costs:

- **ideal:** 6.47 bits per element, 1.24× smaller than raw;
- **fixed-length:** 7.24 bits per element, 1.10× smaller.

::: figure fig-hwa-byte-split hwaByteSplit
**Where the Hermit saves, field by field.** Each bar is the cost of one E4M3 element in bits, split into its sign (grey), exponent (red) and mantissa (blue). *Stored byte:* 1 + 4 + 3 = 8. *Fixed-length code:* sign and mantissa raw, the exponent in the 3-bit code of the table above, with escapes. *Ideal:* the entropy of each field — the exponent's 2.54 bits, and the mantissa's information given the sign and exponent, 2.93 bits (VI.1's split). Hover a segment for its size. From the seeded Monte Carlo of a million Gaussian draws at spread 64 (`analysis/homework_a_budget.py`).
:::

Almost all of the saving is in the red segment. The sign never shrinks, and the mantissa gives up only 0.07 bit even to an ideal coder: it is noise, and noise cannot be squeezed.

The published numbers on real KV agree in size. SplitZip reaches 1.14× on E5M2 KV (88 % of its 6.19-bit order-0 bound) and 1.32× on BF16, where the exponent is a bigger share of the bits. Its top-8 exponent code on E4M3 even *expanded* the data, to 0.93×: too many values escaped. We read all of this as one sentence.

::: pull
Coding 8-bit KV one element at a time is worth about 1.1–1.3×, and that is already published.
:::

The Hermit has three virtues that no dictionary can match, and they make it the right baseline:

1. **Nothing to load.** Its tables are global: no per-request fitting, no dictionary bytes on the link.
2. **Nothing to keep resident.** A few kilobytes of tables per layer, shared by every request on the GPU.
3. **Perfect [[random-access]].** Any element of any entry decodes alone.

::: takeaway
- Solo coding codes each element alone with a fixed, global, per-channel code fit offline.
- It is worth about 1.1–1.3× on 8-bit KV: 6.2–6.5 bits ideal, about 7 bits fixed-length.
- It costs nothing to load or keep resident, so it is the baseline every dictionary must beat.
:::

## What the Hermit cannot see {#blind}

The Hermit's code is fit to the *whole* calibration corpus. Any one [[block]] of entries may look different: its values may sit around a typical value of their own, and spread less than the corpus does. The Hermit cannot know. It keeps coding with the wide, global code — and pays for the mismatch.

How much? The price of coding with the wrong distribution is the [[cross-entropy]] of II.8: the bits of the right code plus a penalty for the gap between the two. The figure puts one block next to the corpus.

::: aside reminder Cross-entropy, in one line
Coding data whose true distribution is $\vp$ with a code built for another distribution costs the entropy of $\vp$ plus a penalty that grows with how different the two are ([[#school-arithmetic]]). The penalty is zero only when the code matches the data.
:::

::: figure fig-hwa-solo-drift hwaSoloDrift
**The Hermit's blind spot.** Grey: the global distribution of one channel over the whole corpus (a bell curve of spread 1). Coloured: the values of one block, which sit around their own typical value (slider "this block's offset", in units of the global spread) and spread less, because block-to-block shifts explain a share $\vRsq$ of the channel's variance (slider). The tiles give, in bits per element, the extra cost of coding this block with the global code instead of a code fit to the block (the Gaussian cross-entropy penalty), and the same extra cost averaged over all blocks, $\tfrac12\log_2\frac{1}{1-\vRsq}$. Illustrative: Gaussian shapes, computed from the formulas.
:::

::: try
1. Set $\vRsq = 0$. The block looks like the corpus, and the Hermit loses nothing.
2. Raise $\vRsq$ to 0.75 and move the offset to 0. The block is narrow and centred: the penalty is about 0.46 bit. The average over all blocks is 1 bit.
3. Move the offset to ±1.5. The block now sits in the global tail, where the Hermit's code is long: the penalty passes 2 bits.
:::

That average penalty is exactly what a dictionary holding each block's typical value and spread could win back. It is the formula of the next-but-one page, the exchange rate between variance explained and bits, and the gain of the Anchor ([[#homework-loc]]). The other blind spots are bigger structures:

- **Channels that move together** inside an entry. The Hermit codes channels one by one, so it cannot use a correlation ([[#homework-klt]]).
- **Entries that look alike** — clusters or near-duplicates inside a block ([[#homework-vq]], [[#homework-sib]]).

::: note key Count from the Hermit, not from raw
Every gain on the next pages is measured against solo coding, not against 8 bits. A dictionary that brings an element from 8 to 6.4 bits has won 0.07 bit, not 1.6: the Hermit gets to 6.47 for free. Counting from raw would credit the dictionary with savings it did not create.
:::

::: takeaway
- The Hermit pays a cross-entropy penalty whenever a block differs from the corpus. Averaged over blocks it is $\tfrac12\log_2\frac{1}{1-\vRsq}$.
- That penalty, and correlations and look-alike entries, are what dictionaries can go after.
- All gains are counted from the solo rate, never from raw.
:::
