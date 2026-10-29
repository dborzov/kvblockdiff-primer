---
title: SplitZip (2026)
group: Lossless coders
nav: SplitZip
lede: A lossless coder for shipping KV caches between GPUs. It codes only the floating-point exponents, with a fixed 4-bit code and escapes — the cleanest published measurement of how much a KV number shrinks on its own.
cards:
  - q: Which part of each BF16 number does SplitZip store uncompressed?
    a: The sign and the 7 mantissa bits — one raw byte per number
    wrong: ["The 8 exponent bits", "Only the sign bit", "Nothing: every bit goes through the 4-bit code"]
    why: The mantissa's low bits are close to noise, so SplitZip keeps that byte as it is and codes only the exponent byte.
    sec: what
  - q: In SplitZip, what happens to an exponent that is not one of the 16 most frequent values?
    a: It is escaped — its position and raw value go to a separate escape stream
    wrong: ["It is rounded to the nearest frequent exponent", "The whole tensor falls back to raw BF16", "A new table is trained for that request"]
    why: Rounding would make the coder lossy. The escape stream patches the rare values back in, at a cost of several dozen bits each.
    sec: what
  - q: Escapes aside, what is the most a 4-bit exponent code can shrink BF16 numbers?
    a: 16 / 12 ≈ 1.33×
    wrong: ["2×, because half the bits are exponent", "1.5×, the ZipNN ratio", "4×, because 16 codes replace 256"]
    why: Each number keeps 8 raw bits (sign and mantissa) and spends 4 on the exponent code, so 16 bits become at least 12. SplitZip's measured 1.324× sits right under that ceiling.
    sec: numbers
  - q: Why does SplitZip's 3-bit top-8 code expand E4M3 data instead of shrinking it?
    a: It saves only 1 bit of the 4-bit exponent, and the escapes for uncovered values cost more than that
    wrong: ["E4M3 has no exponent field", "E4M3 values cannot be split into bytes", "The mantissa grows when the exponent is coded"]
    why: Even at 96 % coverage, 4 % of values × several dozen bits per escape is more than the 1 bit per value the code saves.
    sec: doubts
  - q: What actually stands between SplitZip's format and decoding one entry on its own?
    a: Its escape list — the 4-bit codes sit at known addresses, but you must look up whether an element was escaped
    wrong: ["Coder state carried from value to value, as in arithmetic coding", "Its lossy rounding step", "Its need for a per-request dictionary"]
    why: A fixed-length stream is addressable by construction. A small escape index per entry or per block would make the format random-access.
    sec: doubts
---

Here are eight numbers from a KV cache, in BF16, written out bit by bit (illustrative values, but exactly representable).

| value | sign | exponent (8 bits) | mantissa (7 bits) |
|---:|:---:|:---:|:---:|
| 0.8086 | 0 | `01111110` | `1001111` |
| −1.2656 | 1 | `01111111` | `0100010` |
| 0.4473 | 0 | `01111101` | `1100101` |
| 1.7344 | 0 | `01111111` | `1011110` |
| −0.6914 | 1 | `01111110` | `0110001` |
| 2.4688 | 0 | `10000000` | `0011110` |
| 0.0405 | 0 | `01111010` | `0100110` |
| −0.3770 | 1 | `01111101` | `1000001` |

Notice anything? The mantissa column looks like coin flips. The exponent column does not: six times out of eight it starts with `011111`, and its eight bits take just five different values out of 256. Numbers of the size a model produces sit in a handful of [[exponent|binades]], so the exponent byte is mostly predictable before you read it.

SplitZip is a paper built on exactly this observation, and nothing more. That makes it the most useful calibration point in this Part.

::: note literature The paper
Guo and Joshi, *SplitZip: Ultra Fast Lossless KV Compression for Disaggregated LLM Serving*, arXiv:2605.01708 (2026); listed as a NeurIPS 2026 poster. Re-checked against the abstract, the codec comparison table and public summaries.
:::

## What it does, in our words {#what}

SplitZip lives on the bulk-transfer [[data-path]] of one particular way of serving models.

::: define disaggregation
- **What it is:** prefill (reading the prompt) and decode (writing the answer) run on different GPUs. When prefill finishes, the prompt's whole KV cache is shipped to the decode GPU, once, in bulk.
- **Why it matters here:** that shipment sits between the prompt and the first answer token. Fewer bytes means an earlier first token.
- **Easy to confuse with:** the miss path, where single entries cross from host memory to the same GPU at every step.
:::

The codec, step by step:

1. **Split.** Each BF16 number becomes two bytes in two streams: sign + mantissa (stored raw — treated as noise) and the 8-bit exponent.
2. **Fit a table, once.** On calibration data, offline, find the 16 most frequent exponent values. In our words this is a [[dictionary]] of the lightest kind, fit once and shared by every request — a *global* dictionary, in the language of [[#homework-scope|Part VI]]. The paper calls it a "codebook"; on this site that word is reserved for VQ.
3. **Code.** Each exponent in the table becomes a 4-bit codeword — a [[fixed-length-code]] with $\vn = 4$; two codewords fill a byte.
4. **Escape.** Any other exponent is an [[escape]]: its position and raw value go to a separate escape stream.
5. **Decode.** Look each 4-bit code up in the 16-entry table, patch the escaped positions, glue the bytes back. Every bit returns.

::: aside reminder Fixed-length codes and escapes
A [[fixed-length-code]] spends exactly $\vn$ bits on every value; values that do not fit are escaped, a fraction $\veps$ of them. See [[#school-fixed-length]].
:::

The cost per number is easy to write down:

$$
\text{bits per number} = \underbrace{8}_{\text{raw byte}} + \underbrace{\vn}_{\text{code}} + \underbrace{\veps \times \text{escape cost}}_{\text{escapes}}
$$ {#eq-papers-splitzip-bits}

With $\vn = 4$, the 99.8 % coverage the paper reports for Qwen3-32B ($\veps = 0.002$), and 40 bits per escape (our assumption: a 32-bit position plus the raw exponent byte), that is $8 + 4 + 0.08 = 12.08$ bits, a ratio of $16 / 12.08 = 1.324$ — the paper's measured ratio to the third digit. The figure lets you run the same arithmetic on a toy.

::: figure fig-papers-splitzip-escapes paEscapes wide
**The escape mechanism on a toy exponent histogram.** Bars: the share of numbers with each exponent-field value (horizontal axis: the raw field value of the chosen format; vertical axis: per cent of all numbers). The toy data are illustrative: eight [[channel|channels]] of bell-shaped numbers whose widths are spread over the number of binades (powers of two) set by the slider, plus one outlier channel about 11 times wider than the widest of them; shares are computed exactly from the bell curve, not sampled. Teal bars are covered by the table and get a codeword; red bars are escaped (switch to the log scale to see the rare ones). The strip below codes 32 sample numbers drawn from the same toy (fixed seed): each cell shows the exponent field and its codeword, or ESC. The tiles compute [[#eq-papers-splitzip-bits]] and the ratio, next to the ratio an ideal [[entropy-coder]] would reach on the same exponents. For FP8 the numbers are first scaled so the widest channel's extremes sit near 256.
:::

::: try
1. The default (BF16, 4-bit code, 40-bit escapes) covers 99.78 % of numbers: 12.09 bits each, **1.323×** — within a hair of the paper's 1.324× on real KV. An ideal entropy coder on the same exponents would reach 1.414×.
2. Switch to a 3-bit code on BF16: coverage drops to 87.5 %, and the escapes eat the whole gain (1.00×).
3. Choose FP8 E4M3 with a 3-bit code: 12 bits per 8-bit number, **0.67×** — the data grows. Untick the outlier channel: 96.5 % covered, still 0.95×. Switch the bars to a log scale to see the escaped values at all.
4. Set the spread to 0 and untick the outlier: one plain bell curve, 2.54 bits of exponent entropy, an ideal ratio of 1.52×. That is the territory of [[#papers-float-coders]].
:::

::: takeaway
- SplitZip codes each BF16 exponent with one global 16-entry table and 4-bit codewords; rare exponents escape; sign and mantissa travel raw.
- Its ratio is almost pure arithmetic: 8 raw bits + 4 code bits + a sliver of escapes.
:::

## The numbers we use {#numbers}

| number | value | checked |
|---|---|---|
| ratio on BF16 KV (Qwen3-32B KV, 256 M values) | 1.324× (ceiling of any 4-bit exponent code: 1.333×) | yes |
| exponent entropy, Qwen3-32B | 3.29 bits; top 16 cover 99.8 %, top 8 cover 90.1 % | yes |
| coverage over all evaluated models | top 16 ≥ 99.3 %; top 8 between 83.5 % and 96.0 % | yes |
| encode / decode speed, BF16 | 613.3 / 2181.8 GB/s, counted in uncompressed bytes (an H200, per summaries) | yes |
| FP8 E5M2 KV, 4-bit code | 1.14×; decode 564.9 GB/s | yes |
| E5M2 against its order-0 bound | 88 % of a 6.19-bit bound | as reported in the first draft; not re-checked (but $1.14 / (8 / 6.19) = 0.88$, so the two figures agree) |
| FP8 E4M3 KV, 3-bit top-8 code | expands the data (0.93×) | expansion: yes; the 0.93: not re-checked |
| end to end | up to 1.32× faster KV transfer, 1.30× earlier first token, 1.23× more requests per second | yes |
| finer tables (per channel or per token) | +0.1 % coverage at ~1000× lower speed | as reported in the first draft; not re-checked |

:::: compare What SplitZip tells us — and what it does not
::: col It tells us
- Coding a KV number on its own, with one global table, is worth about **1.1–1.3×**. That bar is published; every dictionary in this proposal must clear it ([[#homework-solo-coding]]).
- A fixed-length code with escapes decodes at **565 GB/s to 2.2 TB/s** — more than ten times the ≈ 50 GB/s link. A decoder of that shape will not be the bottleneck of the miss path ([[#landscape-derived-numbers]]).
- One table generalises across layers and datasets; finer tables buy almost nothing for the context-free part.
:::
::: col It does not tell us
- Anything conditional. No number is predicted from a neighbour, so SplitZip is silent on [[fallen-apple]] and [[upstairs]] similarity.
- Anything about E4M3, the more common 8-bit KV format: there its trick fails.
- How single entries decode: it was built and measured for one bulk transfer per request.
:::
::::

::: theme every-tax
Here the tax is the escape stream. At 99.8 % coverage it costs 0.08 bits per number; on E4M3 with a 3-bit code it costs more than the code saves. The same arithmetic will decide every dictionary in Part VI.
:::

::: takeaway
- 1.324× on BF16, 1.14× on E5M2, expansion on E4M3; decode at hundreds of GB/s or more.
- It is the context-free baseline, measured. It says nothing about neighbours.
:::

## Where we are not convinced {#doubts}

1. **Two different "1.32×".** The abstract's 1.32× is a *speed-up of the transfer*; the codec table's 1.324× is the *compression ratio*. They nearly coincide because the transfer is limited by bandwidth. The first draft quoted "1.32× on six model families" as a ratio; we found the ratio measured on one workload (Qwen3-32B), and only the coverage statistic over several models.
2. **The headlines are ceilings of the format.** A 4-bit code on an 8-bit exponent cannot beat 16/12 = 1.333×; SplitZip reaches 99.3 % of that. On E5M2, a 4-bit code on a 5-bit exponent saves exactly 1 bit of 8, a ceiling of 8/7 = 1.143× — and the reported 1.14× is that ceiling. The numbers tell us the escapes are cheap, not that KV holds more structure.
3. **Our own first draft was too harsh.** It called SplitZip a "bulk stream" coder, the wrong shape for the miss path. Its main stream is fixed-length, so every element's codeword sits at a known address. Only the escape list stops random access: to rebuild one element you must know whether it was escaped. A per-entry escape count or a small escape index per block would fix that. The gap between SplitZip and a miss-path coder is escape bookkeeping, not coder state.
4. **E5M2 is the unusual FP8 format for KV.** The positive FP8 result is on E5M2; the format most KV stores use, E4M3, is the one where it fails.

::: theme grid-matters
The same table and the same escapes give 1.33× on BF16, 1.14× on E5M2 and less than 1× on E4M3. Nothing about the KV cache changed; only how many exponent bits the format spends.
:::

::: note connection Connections
Fixed-length codes and escapes: [[#school-fixed-length]]. Floats, exponents and BF16: [[#school-integers-floats]], [[#school-fp8]]. The same exponent trick on model weights: [[#papers-float-coders]]. The bit budget of an 8-bit element: [[#homework-the-budget]]. Entropy-coded versus fixed-length rates: [[#homework-two-rates]].
:::

::: takeaway
- Its 1.32× headline is a speed-up; its ratio is 1.324×, at the ceiling of its own format.
- The format is closer to random access than our first draft claimed: only the escapes need an index.
:::
