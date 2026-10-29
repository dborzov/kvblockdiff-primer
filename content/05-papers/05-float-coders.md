---
title: ZipNN, DFloat11 and friends
nav: Lossless float coders
lede: Half a dozen lossless coders for the numbers inside models, from weights on a disk to KV on a wire. They disagree about speed and agree about the physics — the exponent is predictable, the mantissa is noise.
cards:
  - q: Draw numbers from one bell curve and store them in BF16. About how many bits of information does the 8-bit exponent field carry?
    a: About 2.5 bits
    wrong: ["About 8 bits", "About 0.5 bits", "About 5 bits"]
    why: Most values fall in a few binades around the curve's width; the exponent's entropy works out to 2.54 bits. That leaves about 5.5 of its 8 bits as redundancy for a coder to remove.
    sec: what
  - q: Why does LZ4, a byte-string matcher, shrink BF16 tensors by only about 2 %?
    a: Floats almost never repeat as exact byte strings; their redundancy is in the uneven use of exponent values
    wrong: ["LZ4 is a lossy coder", "LZ4 cannot run on a GPU", "BF16 tensors are already compressed"]
    why: LZ matching copies earlier byte strings. Model numbers share a skewed exponent distribution, not repeated strings, so an entropy coder finds what LZ cannot.
    sec: numbers
  - q: DFloat11 reaches 1.42× on SplitZip's KV workload and SplitZip 1.32×. What explains most of the gap?
    a: DFloat11 entropy-codes the exponent (Huffman); SplitZip spends a fixed 4 bits on it for speed and simple addressing
    wrong: ["DFloat11 also compresses the mantissa", "SplitZip is lossy", "DFloat11 uses a dictionary per block of tokens"]
    why: Variable-length codewords approach the exponent's entropy; a fixed-length code pays a little more per value in exchange for parallel decoding and known addresses.
    sec: numbers
  - q: ZipNN's 1.515× in SplitZip's comparison table is suspicious for which reason?
    a: It beats the ceiling of any exponent-only coder on that workload (about 1.42× at 3.29 bits of exponent entropy)
    wrong: ["ZipNN is lossy", "1.515 is below SplitZip's ratio", "ZipNN does not code exponents at all"]
    why: With 8 raw bits of sign and mantissa, 3.29 bits of exponent gives 16 / 11.29 ≈ 1.42×. Either ZipNN squeezes the other byte too, or its number was measured on other data.
    sec: doubts
---

Draw a few million numbers from one [[gaussian|bell curve]], store them in [[bf16|BF16]], and count how often each value of the 8-bit exponent field appears.

| exponent field | range of $\lvert \vx \rvert$ (in units of the curve's width $\vsigma$) | share of numbers |
|---:|:---:|---:|
| 126 | ½ – 1 | 30.0 % |
| 127 | 1 – 2 | 27.2 % |
| 125 | ¼ – ½ | 18.6 % |
| 124 | ⅛ – ¼ | 9.8 % |
| 123 | 1/16 – ⅛ | 5.0 % |
| 128 | 2 – 4 | 4.5 % |
| all other 250 values | | 5.0 % |

Six values out of 256 hold 95 % of the numbers. The [[entropy]] of the exponent is 2.54 bits; it is stored in 8. The mantissa, on the other hand, is spread almost evenly over its 128 values. (These shares are exact for a bell curve; our calculation, the same one behind the toy in [[#papers-splitzip]].)

Every coder on this page is a different way of cashing in those 5.5 spare exponent bits. None of them finds much anywhere else.

## What they do, in our words {#what}

All of them follow one recipe: split each number into exponent and the rest, code the exponent, keep sign and mantissa as they are. They differ in how they code the exponent, where the decoder runs, and which data they were built for.

| coder | data and [[data-path]] | the exponent is coded with | decode speed |
|---|---|---|---|
| **ZipNN** (Hershcovitch et al., IBM, 2024) | model weights, on disk and in downloads | a [[huffman]] code, after regrouping bytes into streams | 1.7 GB/s (CPU; its own paper) |
| **DFloat11** (Zhang et al., Rice, 2025) | model weights kept compressed in GPU memory, decoded per transformer block | a Huffman code with small lookup tables in fast on-chip memory | 468 GB/s |
| **Falcon** (Li et al., PVLDB 2025) | general floating-point data, e.g. time series | adaptive bit-planes, on the GPU | — |
| **ZipServ** (ASPLOS 2026) | weights, decoded inside the matrix-multiply kernel | a [[fixed-length-code]] with a bitmap | 1261 GB/s |
| **SplitZip** (2026) | KV, one bulk transfer per request | a 4-bit fixed-length code with [[escape\|escapes]] | 2182 GB/s |
| **nvCOMP LZ4** (NVIDIA) | any bytes | [[lz-match\|LZ matching]] | — |

In our vocabulary, ZipNN and DFloat11 are [[entropy-coder|entropy coders]] with one table per tensor or model; ZipServ and SplitZip are fixed-length coders, chosen for parallel decoding and known addresses; LZ4 is the tool from Part I that looks for repeated byte strings. All of them are context-free: each number is coded as if it had no neighbours.

::: figure fig-papers-float-ratios paFloatRatios
**Six lossless coders on one KV workload, and two bell curves.** Each bar is a compression ratio (original size ÷ compressed size; 1 = no gain) on the BF16 KV tensors SplitZip's authors used for their comparison (Qwen3-32B, 256 million values); colours group coders by how they code the exponent. The two pale, dashed-outline bars are our own exact calculations: an ideal entropy coder on the exponents of one bell curve, and on the toy KV mixture of [[#papers-splitzip]], with sign and mantissa kept raw. Dashed lines: no compression (1×), the ceiling of any 4-bit exponent code (16/12 = 1.33×) and the ceiling of any exponent-only coder at the measured 3.29 bits of exponent entropy (16/11.29 = 1.42×). The switch shows bits per BF16 number instead; the bars then show the bits saved below 16. Hover a bar for its source and speed.
:::

::: try
1. Find the two ceilings. SplitZip sits just under the 4-bit line; DFloat11 and Falcon sit on the exponent-entropy line.
2. Look at ZipNN: it is above the exponent-only ceiling. Keep that in mind for the last section.
3. Compare the pale "one bell curve" bar (1.52×) with the KV bars: a plain bell curve is *more* compressible than real KV, because real KV channels have different widths and so spread over more binades.
:::

::: takeaway
- One recipe: split, entropy-code or fixed-length-code the exponent, keep the mantissa raw.
- They differ in speed and in data path, not in where the redundancy is.
:::

## What they tell us — and what they do not {#numbers}

- **The redundancy is the bell curve on a logarithmic grid.** One plain bell curve already gives 2.54 bits of exponent entropy and an ideal 1.52×. ZipNN reports BF16 models shrinking to about two thirds of their size, DFloat11 about 11 bits per weight (≈ 1.45×). Weights are roughly bell-shaped, so nothing model-specific is needed to explain these numbers.
- **The mantissa is noise.** No coder here gets anything useful from it. At BF16 that caps lossless coding near 1.3–1.5×, however clever the coder.
- **LZ finds nothing.** LZ4's 1.02× is the Gull Rock lesson inside out: matching needs repeated byte strings, and floats almost never repeat exactly. Their redundancy is a skewed distribution, which only an entropy coder or a short code can use.
- **Speed costs about 7 %.** DFloat11's Huffman code reaches 1.423×; SplitZip's fixed 4 bits reach 1.324× at about four and a half times the decode speed. That gap is the price of fixed-length codes — the same gap Part VI measures between its two rates ([[#homework-two-rates]]).

What they do not tell us:

- **Nothing conditional.** Every coder here sees each number alone. None measures whether a neighbouring entry, a block's statistics or a learned basis would predict anything.
- **Weights are not KV.** Weights are fixed, shared by every request and read in bulk; KV is made per request and, on our path, read one entry at a time.
- **Little about 8 bits.** In FP8 the exponent has 4 or 5 bits and the mantissa 2 or 3, so there are far fewer spare exponent bits to cash in ([[#homework-the-budget]]).

::: theme noise-floor
The mantissa is the noise floor of float coding: seven bits per BF16 number that every lossless coder must carry untouched. It is why BF16 lossless results stop near 1.5×, and why this proposal moves to 8-bit storage before asking for more.
:::

::: takeaway
- A bell curve on a log grid explains the whole effect; KV's spread of channel widths makes it a little smaller.
- Entropy-coded exponents: ≈ 1.42–1.5×. Fixed-length: ≈ 1.24–1.33×. LZ: nothing.
:::

## Where we are not convinced {#doubts}

1. **A comparison table with mixed sources.** The ratios come from SplitZip's table, but ZipNN's speed comes from ZipNN's own paper, and its 1.515× beats the ceiling of any exponent-only coder on that workload (1.42×). Either ZipNN also squeezes the sign-and-mantissa byte, or its row was measured on other data (its own paper reports ≈ 1.5× on BF16 *weights*). We could not tell which from what we could read.
2. **DFloat11 is a hair above the line too.** 1.423× means 3.24 bits per exponent, slightly below the 3.29-bit entropy SplitZip reports. A Huffman code cannot beat the entropy of what it codes — unless its tables are fit per tensor (a finer dictionary), or the 3.29 bits were measured on other tensors. Small, but it says the rows of the table were not all measured the same way.
3. **Falcon is not a model-data coder.** It was built and evaluated for general floating-point data such as time series; its row is a useful reference, not evidence about KV.
4. **Speeds are counted in uncompressed bytes per second** (SplitZip says so for its own numbers). Fair, as long as every row counts the same way — which we cannot check for the borrowed rows.

::: note connection Connections
Floats, exponents and binades: [[#school-integers-floats]]. Why matching fails on numbers: [[#tiny-files-vectors-not-text]]. The same trick on KV, measured carefully: [[#papers-splitzip]]. Why the mantissa forces 8-bit storage: [[#missed-mantissa-and-grid]].
:::

::: takeaway
- Treat cross-paper comparison tables as approximate: rows can come from different data.
- The robust lesson survives the doubts: context-free coding of BF16 stops near 1.3–1.5×.
:::
