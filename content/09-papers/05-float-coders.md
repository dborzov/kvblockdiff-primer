---
title: ZipNN, DFloat11 and friends
nav: Lossless float compressors
group: Lossless, on the bulk road
lede: Half a dozen lossless compressors for the numbers inside LLMs, from weights on a disk to orchards on a wire. They disagree about speed and agree about the physics. The exponent is predictable; the mantissa is noise.
cards:
  - q: Draw numbers from one bell curve and store them in BF16. About how many bits of information does the 8-bit exponent field carry?
    a: About 2.5 bits
    wrong: ["About 8 bits", "About 0.5 bits", "About 5 bits"]
    why: Most values fall in a few binades around the curve's width; the exponent's entropy works out to 2.54 bits. That leaves about 5.5 of its 8 bits as redundancy for an entropy coder to remove.
    sec: idea
  - q: What do all six compressors take as known about LLM numbers?
    a: They are roughly bell-shaped, so their exponents are skewed and their mantissas nearly uniform
    wrong: ["They repeat as byte strings", "Neighbouring weights are alike", "Their low bits carry most of the information"]
    why: One recipe fits all of them because the background is the same. A bell curve on a log grid is the whole explanation.
    sec: assume
  - q: Why does LZ4, a byte-string matcher, shrink BF16 tensors by only about 2 %?
    a: Floats almost never repeat as exact byte strings; their redundancy is in the uneven use of exponent values
    wrong: ["LZ4 is lossy", "LZ4 cannot run on a GPU", "BF16 tensors are already compressed"]
    why: LZ matching copies earlier byte strings. LLM numbers share a skewed exponent distribution, not repeated strings, so an entropy coder finds what LZ cannot.
    sec: show
  - q: ZipNN's 1.515× in SplitZip's comparison table is suspicious for which reason?
    a: It beats the ceiling of any exponent-only compressor on that workload (about 1.42× at 3.29 bits of exponent entropy)
    wrong: ["ZipNN is lossy", "1.515 is below SplitZip's ratio", "ZipNN does not code exponents at all"]
    why: With 8 raw bits of sign and mantissa, 3.29 bits of exponent gives 16 / 11.29 ≈ 1.42×. Either ZipNN squeezes the other byte too, or its row was measured on other data.
    sec: show
  - q: What does this family of papers say about the campaigns' choice to compress FP8 rather than BF16?
    a: It supports it; at BF16 the mantissa's seven noise bits cap lossless work near 1.5×, and the campaigns saw the low four BF16 bits behave as noise
    wrong: ["It contradicts it; BF16 compresses better", "It says nothing about formats", "It says FP8 cannot be compressed losslessly"]
    why: The float compressors stop near 1.3–1.5× on BF16 for one reason, the mantissa. Moving to 8-bit storage removes most of that noise before any dictionary is tried.
    sec: ours
  - q: At what granularity does DFloat11 decode the LLM's weights, in our words?
    a: Per layer
    wrong: ["Per stretch", "Per punnet", "Per cherry"]
    why: The paper names the unit with a word this site retires for data and token ranges; it is one transformer layer, whose weights are decoded together.
    sec: words
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

Six values out of 256 hold 95 % of the numbers. The [[entropy]] of the exponent is 2.54 bits; it is stored in 8. The mantissa is spread almost evenly over its 128 values. (Exact for a bell curve; our calculation, the same one behind the toy of [[#papers-splitzip]].) Every compressor on this page is a different way of cashing in those 5.5 spare exponent bits. None finds much anywhere else.

## The idea, by example {#idea}

Take a tensor of LLM weights, `W.shape == (4096, 4096)`, BF16, 32 MB. One recipe, six times over: split each number into its exponent and the rest, code the exponent, keep sign and mantissa as they are ([[bit-field-split]], [[#toolbox-bit-fields]]). They differ in how they code the exponent, where the decoder runs, and which road they were built for.

| compressor | data and [[data-path]] | the exponent is coded with | decode speed (their measurement) |
|---|---|---|---|
| **ZipNN** (Hershcovitch et al., IBM, 2024) | LLM weights, on disk and in downloads | a [[huffman]] code, after regrouping bytes into streams | 1.7 GB/s (CPU; its own paper) |
| **DFloat11** (Zhang et al., Rice, 2025) | LLM weights kept compressed in GPU memory, decoded per layer | a Huffman code with small lookup tables in fast on-chip memory | 468 GB/s |
| **Falcon** (Li et al., PVLDB 2025) | general floating-point data, e.g. time series | adaptive bit-planes, on the GPU | — |
| **ZipServ** (ASPLOS 2026) | weights, decoded inside the matrix-multiply kernel | a [[fixed-length-code]] with a bitmap | 1261 GB/s |
| **SplitZip** (2026) | orchards, one bulk transfer per sequence | a 4-bit fixed-length code with [[escape\|escapes]] | 2182 GB/s |
| **nvCOMP LZ4** (NVIDIA) | any bytes | [[lz-match\|LZ matching]] | — |

In our words ZipNN and DFloat11 are [[entropy-coder|entropy coders]] with one table per tensor or per LLM; ZipServ and SplitZip are fixed-length codes, chosen for parallel decoding and known addresses; LZ4 is the tool from Part I that looks for repeated byte strings. All six are context-free: each number is coded as if it had no neighbours, which makes every one of them a member of the [[solo]] family of [[#toolbox-solo]], with a global table.

::: figure fig-papers-float-ratios paFloatRatios
**Six lossless compressors on one orchard workload, and two bell curves.** Each bar is a compression ratio (original size ÷ compressed size; 1 = no gain) on the BF16 orchard tensors SplitZip's authors used for their comparison (Qwen3-32B, 256 million values); colours group compressors by how they code the exponent. The two pale, dashed-outline bars are our own exact calculations: an ideal entropy coder on the exponents of one bell curve, and on the toy orchard mixture of [[#papers-splitzip]], with sign and mantissa kept raw. Dashed lines: no compression (1×), the ceiling of any 4-bit exponent code (16/12 = 1.33×) and the ceiling of any exponent-only compressor at the measured 3.29 bits of exponent entropy (16/11.29 = 1.42×). The switch shows bits per BF16 number instead; the bars then show the bits saved below 16. Hover a bar for its source and speed.
:::

::: try
1. Find the two ceilings. SplitZip sits just under the 4-bit line; DFloat11 and Falcon sit on the exponent-entropy line.
2. Look at ZipNN: it is above the exponent-only ceiling. Keep that in mind for the results section.
3. Compare the pale "one bell curve" bar (1.52×) with the orchard bars: a plain bell curve is *more* compressible than a real orchard, because real furrows have different widths and so spread over more binades.
:::

::: takeaway
- One recipe: split, entropy-code or fixed-length-code the exponent, keep the mantissa raw.
- They differ in speed and in road, not in where the redundancy is. All are solo compressors with a global table.
:::

## What they assume {#assume}

1. **LLM numbers are roughly bell-shaped.** Weights and activations alike; the introductions cite it, nobody measures it afresh. A bell curve on a logarithmic grid explains the whole effect: 2.54 bits of exponent entropy, an ideal 1.52×.
2. **The mantissa is noise.** No paper here claims a bit from it, and none tries.
3. **Weights are read in bulk, shared by every sequence, and never change.** The road is disk-to-GPU or GPU-memory-to-kernel; decode is per tensor or per layer. Only SplitZip is about an orchard, and then on the bulk road ([[#papers-splitzip]]).
4. **Nothing conditional.** Each number alone. No paper asks whether a neighbouring value, a furrow's statistics or a learned basis would predict anything.

::: takeaway
- Known: bell-shaped numbers, noisy mantissas, bulk reads of shared weights.
- Silent on: any structure between numbers, and on orchards read one cherry at a time.
:::

## What they show {#show}

The robust results, each a count that could be redone:

- **ZipNN:** BF16 LLM weights shrink to about two thirds of their size (their measurement, ZipNN's own paper); **DFloat11:** about 11 bits per weight, ≈ 1.45× (their measurement, DFloat11 abstract). Both are what a bell curve predicts; nothing LLM-specific is needed.
- **LZ4 finds nothing:** 1.02× on the orchard workload (SplitZip's table). The Gull Rock lesson inside out: matching needs repeated byte strings, and floats almost never repeat exactly ([[#tiny-files-vectors-not-text]]).
- **Speed costs about 7 %.** DFloat11's Huffman code reaches 1.423× on the orchard workload; SplitZip's fixed 4 bits reach 1.324× at about four and a half times the decode speed (SplitZip's table). That gap is the price of fixed-length codes, the same gap [[#toolbox-two-rates]] names.

Where it is hard to check:

1. **A comparison table with mixed sources.** The ratios come from SplitZip's table, but ZipNN's speed comes from ZipNN's own paper, and its 1.515× beats the ceiling of any exponent-only compressor on that workload (1.42×). Either ZipNN also squeezes the sign-and-mantissa byte, or its row was measured on other data (its own paper reports ≈ 1.5× on BF16 *weights*). We could not tell which.
2. **DFloat11 is a hair above the line too.** 1.423× means 3.24 bits per exponent, slightly below the 3.29-bit entropy SplitZip reports. A Huffman code cannot beat the entropy of what it codes, unless its tables are fit per tensor (a finer dictionary) or the 3.29 bits were measured on other tensors. Small, but it says the rows were not all measured the same way.
3. **Falcon is not an LLM-data compressor.** It was built for general floating-point data such as time series; its row is a reference, not evidence about orchards.
4. **Speeds are counted in uncompressed bytes per second** (SplitZip says so for its own numbers). Fair, as long as every row counts the same way, which we cannot check for the borrowed rows.

::: takeaway
- Entropy-coded exponents: ≈ 1.42–1.5×. Fixed-length: ≈ 1.24–1.33×. LZ: nothing.
- Treat cross-paper tables as approximate: rows can come from different data.
:::

## What it says about our scenario {#ours}

**Builds on.**
- The noise floor of [[#toolbox-bit-fields]]: at BF16, seven mantissa bits per number must be carried untouched, which is why lossless results stop near 1.5× and why the scenario stores the orchard at 8 bits. The campaigns confirmed it on the Bench: BF16 ratios ran at about half the FP8 ratio plus 0.25, with the low four BF16 bits behaving as noise ([[#measured-the-data]]).
- The solo baseline of [[#toolbox-solo]]: these compressors are solo with a global table, and their ceilings are the ceilings of context-free coding. Our solo, with one table per furrow, reaches 0.778 on E4M3 values.
- The two rates of [[#toolbox-two-rates]]: the 7 % gap between DFloat11 and SplitZip is a published instance of entropy rate versus fixed-length rate.

**Conflicts with.** Nothing. The family claims nothing about orchards beyond their histogram, and that claim holds on the Bench.

**Suggests.**
- Nothing to run in the harness; the bell-curve arithmetic is a desk check. One cheap cross-check: the exponent entropy of the Bench's BF16 dump against SplitZip's 3.29 bits, to see whether Qwen3.5-2B's values are more or less spread than Qwen3-32B's ([[#plan-the-dataset-we-have]]).
- On FP8 the exponent has 4 or 5 bits and the mantissa 2 or 3, so there are far fewer spare exponent bits to cash in; the solo family already takes them. Every further bit on the Bench must come from a dictionary, which is Part V's whole programme.

::: theme noise-floor
The mantissa is the noise floor of float coding: seven bits per BF16 number that every lossless compressor must carry. It is why BF16 results stop near 1.5×, and why this project moved to 8-bit storage before asking for more.
:::

::: takeaway
- Builds on: the noise floor, the solo baseline, the two rates.
- Conflicts with nothing; suggests one desk check on the Bench's dump.
:::

## Their words, ours {#words}

| their word | ours | where the meanings differ |
|---|---|---|
| model weights | the LLM's weights | fixed, shared by every sequence; not the orchard |
| transformer block (DFloat11) | a [[layer]] | "block" is retired on this site for data and token ranges |
| codec, float coder | [[compressor]] | — |
| exponent coding, byte grouping | the [[bit-field-split]] stage | ours routes fields to different stages; theirs is one stage with the mantissa left raw |
| compression ratio | 1 / [[mdl-ratio]] | their 1.42× is our 0.70 |
| per-tensor table | a [[dictionary]] of global scope | fit once, shared by every sequence; no per-punnet cost |
| lossless | [[lossless]] | the same meaning here, unlike on some lossy pages |

::: aside source Receipts
ZipNN: Hershcovitch et al., *ZipNN: Lossless Compression for AI Models*, 2024 (ratios on BF16 weights and the 1.7 GB/s CPU speed from its own paper). DFloat11: Zhang et al., *70 % Size, 100 % Accuracy: Lossless LLM Compression for Efficient GPU Inference via Dynamic-Length Float*, 2025 (≈ 11 bits per weight, 468 GB/s). Falcon: Li et al., PVLDB 2025. ZipServ: ASPLOS 2026. nvCOMP LZ4: NVIDIA. The orchard-workload ratios (ZipNN 1.515×, DFloat11 1.423×, Falcon, ZipServ, SplitZip 1.324×, LZ4 1.02×) and the 3.29-bit exponent entropy: SplitZip's codec comparison table (Qwen3-32B BF16 KV, 256 M values; [[#papers-splitzip]]). The bell-curve shares and the 2.54-bit entropy are our exact calculation. "bf16 ≈ fp8/2 + 0.25": `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1.4.
:::
