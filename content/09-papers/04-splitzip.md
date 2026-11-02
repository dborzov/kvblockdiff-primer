---
title: SplitZip (2026)
nav: SplitZip
group: Lossless, on the bulk road
lede: A lossless compressor for shipping a sequence's orchard between GPUs. It codes only the floating-point exponents, with a fixed 4-bit code and escapes. The cleanest published count of how much a stored number shrinks on its own.
cards:
  - q: Which part of each BF16 number does SplitZip store raw?
    a: The sign and the 7 mantissa bits, one raw byte per number
    wrong: ["The 8 exponent bits", "Only the sign bit", "Nothing: every bit goes through the 4-bit code"]
    why: The low mantissa bits are close to noise, so SplitZip keeps that byte as it is and codes only the exponent byte.
    sec: idea
  - q: What does SplitZip's introduction take as known about the numbers in an orchard?
    a: Their exponents are concentrated in a few values and their mantissas are close to uniform
    wrong: ["Neighbouring tokens have similar values", "Keys are harder than values", "The orchard repeats byte strings"]
    why: That is the physics every lossless float compressor cashes in. SplitZip adds nothing conditional on top of it.
    sec: assume
  - q: Escapes aside, what is the most a 4-bit exponent code can shrink BF16 numbers?
    a: 16 / 12 ≈ 1.33×
    wrong: ["2×, because half the bits are exponent", "1.5×, the ZipNN ratio", "4×, because 16 codes replace 256"]
    why: Each number keeps 8 raw bits and spends 4 on the exponent code, so 16 bits become at least 12. The measured 1.324× sits right under that ceiling.
    sec: show
  - q: Why does SplitZip's 3-bit code expand E4M3 data instead of shrinking it?
    a: It saves only 1 bit of the 4-bit exponent, and the escapes for uncovered values cost more than that
    wrong: ["E4M3 has no exponent field", "E4M3 values cannot be split into bit fields", "The mantissa grows when the exponent is coded"]
    why: Even at 96 % coverage, 4 % of values × several dozen bits per escape is more than the 1 bit per value the code saves.
    sec: show
  - q: The campaigns' solo compressor reaches 0.778 on E4M3 values where SplitZip's code expands them. What is the difference?
    a: Solo uses one entropy-coded table per furrow; SplitZip uses one fixed-length table for every element
    wrong: ["Solo is lossy", "Solo uses a dictionary per stretch", "The Bench's values are not E4M3"]
    why: Per-furrow tables see that each element position has its own spread; an entropy coder spends fractional bits. Both gains are gone in a single 3-bit code.
    sec: ours
  - q: SplitZip calls its table of the 16 most frequent exponents a "codebook". What is it on this site?
    a: A fixed-length code with escapes, fit once on calibration data and shared by every sequence
    wrong: ["A VQ codebook of centroids", "A dictionary per punnet", "A probability table an arithmetic-coding stage updates as it reads"]
    why: On this site "codebook" means VQ centroids only. SplitZip's table maps 16 exponent values to 4-bit codewords; everything else is escaped.
    sec: words
---

Here are eight numbers from an orchard, in BF16, written out bit by bit (illustrative values, but exactly representable).

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

Notice anything? The mantissa column looks like coin flips. The exponent column does not: six times out of eight it starts with `011111`, and its eight bits take just five values out of 256. Numbers of the size an LLM produces sit in a handful of [[exponent|binades]], so the exponent byte is mostly predictable before you read it. SplitZip is built on this observation and nothing more, which makes it the most useful calibration point in this Part.

## The idea, by example {#idea}

SplitZip lives on the bulk-transfer road of [[#papers-reading-guide/data-path]], in one particular way of serving.

::: define disaggregation
- **What it is.** Prefill (reading the prompt) and decode (writing the answer) run on different GPUs or machines. The prompt's finished [[orchard]] is shipped from the prefill side to the decode side once, in bulk, right before the first answer token.
- **Example.** A 32K-token prompt on a GLM-5.1-sized LLM: about 3.2 GB of BF16 orchard crosses between machines, front to back, once.
- **Easy to confuse with** the miss path, where single cherries cross from host memory to the same GPU at every step.
:::

The compressor, on the eight numbers above:

1. **Split.** Each BF16 number becomes two bytes in two streams: sign + mantissa (raw, treated as noise) and the 8-bit exponent. This is the [[bit-field-split]] of [[#toolbox-bit-fields]].
2. **Fit a table, once.** On calibration data, offline, find the 16 most frequent exponent values. In our words this is a [[dictionary]] of the lightest kind, fit once and shared by every sequence: [[scope-global|global scope]] ([[#scenario-scope]]). The paper calls it a codebook.
3. **Code.** Each exponent in the table becomes a 4-bit codeword, a [[fixed-length-code]] with $\vn = 4$; two codewords fill a byte. The five exponents of the toy all land in the table.
4. **Escape.** Any other exponent is an [[escape]]: its position and raw value go to a separate stream.
5. **Decode.** Look each 4-bit code up in the 16-row table, patch the escaped positions, glue the bytes back. Every bit returns.

The cost per number is arithmetic:

$$
\text{bits per number} = \underbrace{8}_{\text{raw byte}} + \underbrace{\vn}_{\text{code}} + \underbrace{\veps \times \text{escape cost}}_{\text{escapes}}
$$ {#eq-papers-splitzip-bits}

With $\vn = 4$, the 99.8 % coverage the paper reports for Qwen3-32B ($\veps = 0.002$) and 40 bits per escape (our assumption: a 32-bit position plus the raw exponent byte), that is $8 + 4 + 0.08 = 12.08$ bits, a ratio of $16 / 12.08 = 1.324$: the paper's measured ratio to the third digit. The figure runs the same arithmetic on a toy.

::: figure fig-papers-splitzip-escapes paEscapes wide
**The escape mechanism on a toy exponent histogram.** Bars: the share of numbers (vertical axis, per cent) with each raw exponent-field value of the chosen format (horizontal axis). Illustrative toy data: eight furrows of bell-shaped numbers whose widths spread over the number of binades set by the slider, plus one outlier furrow about 11 times wider; shares are computed exactly, not sampled. Teal bars are covered by the table and get a codeword; red bars are escaped (switch to the log scale to see the rare ones). The strip below codes 32 sample numbers drawn from the same toy (fixed seed): each cell shows the exponent field and its codeword, or ESC. The tiles compute [[#eq-papers-splitzip-bits]] and the ratio, next to the ratio an ideal [[entropy-coder]] would reach on the same exponents. For FP8 the numbers are first scaled so the widest furrow's extremes sit near 256.
:::

::: try
1. The default (BF16, 4-bit code, 40-bit escapes) covers 99.78 % of numbers: 12.09 bits each, **1.323×**, within a hair of the paper's 1.324× on real orchards. An ideal entropy coder on the same exponents would reach 1.414×.
2. Switch to a 3-bit code on BF16: coverage drops to 87.5 %, and the escapes eat the whole gain (0.999×).
3. Choose FP8 E4M3 with a 3-bit code: 12 bits per 8-bit number, **0.67×**; the data grows. Untick the outlier furrow: 96.5 % covered, still 0.95×.
4. Set the spread to 0 and untick the outlier: one plain bell curve, 2.54 bits of exponent entropy, an ideal ratio of 1.52×. That is the territory of [[#papers-float-coders]].
:::

::: takeaway
- Split each BF16 number into a raw byte and an exponent; code the exponent with one global 16-row table and 4-bit codewords; escape the rest.
- The ratio is almost pure arithmetic: 8 raw bits + 4 code bits + a sliver of escapes.
:::

## What they assume {#assume}

1. **Exponents are concentrated; mantissas are noise.** The introduction treats this as the known physics of LLM numbers, and it is: a bell curve on a logarithmic grid puts 95 % of values in six binades ([[#papers-float-coders]]).
2. **Serving is disaggregated and the orchard is BF16.** The whole orchard of a sequence moves once; transfer time, not decode time, is what the authors optimise.
3. **One table fits all.** A table fit on one LLM's calibration data covers other LLMs and datasets nearly as well (top 16 ≥ 99.3 % everywhere). The context-free part of the orchard's statistics is global.
4. **Nothing conditional.** No number is predicted from a neighbour, a layer or a furrow. The background makes no claim about the orchard's structure beyond its histogram.

::: takeaway
- Known: skewed exponents, random mantissas, BF16, one global table.
- Not claimed: any similarity between cherries.
:::

## What they show {#show}

| their measurement | value | where | verifiable? |
|---|---|---|---|
| ratio on BF16 orchards (Qwen3-32B, 256 M values) | 1.324× (ceiling of any 4-bit exponent code: 1.333×) | the compressor comparison table | arithmetic from the coverage; redone above |
| exponent entropy, Qwen3-32B | 3.29 bits; top 16 cover 99.8 %, top 8 cover 90.1 % | §4 | a count on their data |
| coverage over all evaluated LLMs | top 16 ≥ 99.3 %; top 8 between 83.5 % and 96.0 % | §4 | counts |
| encode / decode speed, BF16 | 613.3 / 2181.8 GB/s, counted in uncompressed bytes (an H200) | §5, via summaries | their rig |
| FP8 E5M2 orchard, 4-bit code | 1.14×; decode 564.9 GB/s | §5 | the 1.14 is the format's ceiling 8/7; the speed is their rig |
| E5M2 against its order-0 bound | 88 % of a 6.19-bit bound | as the first draft reported; not re-checked, but $1.14 / (8 / 6.19) = 0.88$ agrees | arithmetic |
| FP8 E4M3 orchard, 3-bit top-8 code | expands the data (0.93×) | §5 | expansion re-checked; the 0.93 not |
| end to end | up to 1.32× faster orchard transfer, 1.30× earlier first token, 1.23× more sequences per second | abstract | their rig |
| finer tables (per furrow or per token) | +0.1 % coverage at ~1000× lower speed | as the first draft reported; not re-checked | — |

Where the framing flatters: the abstract's 1.32× is a transfer *speed-up*; the ratio is 1.324×. They nearly coincide because the transfer is bandwidth-bound, and the first draft read the speed-up as a ratio "on six LLM families". The ratio was measured on one workload; only the coverage statistic spans several LLMs. And the headlines are ceilings of the format: a 4-bit code on an 8-bit exponent cannot beat 16/12, and on E5M2 a 4-bit code on a 5-bit exponent saves exactly one bit of eight, 8/7 = 1.143×, which is the reported 1.14×. The numbers say the escapes are cheap, not that orchards hold more structure.

::: theme grid-matters
The same table and escapes give 1.33× on BF16, 1.14× on E5M2 and less than 1× on E4M3, the commoner 8-bit format. Nothing about the orchard changed; only how many exponent bits the format spends.
:::

::: takeaway
- 1.324× on BF16, 1.14× on E5M2, expansion on E4M3; decode at hundreds of GB/s to 2 TB/s.
- Every headline is the format's ceiling; the escapes cost almost nothing.
:::

## What it says about our scenario {#ours}

**Builds on.**
- The bit-field split as a stage: route sign and exponent one way, mantissa another ([[#toolbox-bit-fields]]). SplitZip is the published proof that the mantissa byte of BF16 is noise; the campaigns saw the same on the Bench, where BF16 cost about half the FP8 ratio plus 0.25 (the low four BF16 bits are noise; [[#measured-the-data]]).
- The fixed-length rate of [[#toolbox-two-rates]]: a 4-bit code loses about 7 % against an entropy coder (1.324× vs 1.414× in the toy) and buys known addresses and 565 GB/s to 2.2 TB/s of decode. That is ten times the 50 GB/s link, so a decoder of this shape is never the bottleneck of the miss path ([[#landscape-derived-numbers]], [[#plan-decoder-speed]]).
- Global scope as a real rung: one table for every sequence, charged to nobody per punnet ([[#scenario-scope]]).

**Conflicts with.** Nothing in Part VIII, but one number needs reconciling. SplitZip's 3-bit code *expands* E4M3; the campaigns' [[solo]] compressor, one order-0 table per [[furrow]] with an entropy coder, reaches **0.778** on E4M3 values, 6.22 bits per element, verified ([[#toolbox-solo]], [[#measured-night-one]]). Same format, opposite sign. The difference is two stages SplitZip leaves out: per-furrow tables (each element position has its own spread) and fractional bits. We believe both numbers; they measure different compressors. SplitZip's E5M2 order-0 bound of 6.19 bits and solo's 6.22 bits on E4M3 are, by coincidence, the same floor.

**Suggests.**
- Measure a fixed-length rate for the campaigns' frontier compressor: every compressor of Part VIII uses rANS, and no fixed-length rate was measured ([[#measured-scorecard]], [[#plan-decoder-speed]]). SplitZip says the gap should be near 7–10 %.
- The random-access fix is small: SplitZip's main stream is fixed-length, so every codeword sits at a known address; only the escape list stops a cold decode of one cherry. A per-cherry escape count, or an escape index per punnet, makes the format obey the [[leash]]. The first draft called SplitZip a bulk stream; it is one escape index away from the miss path ([[#app-data-layout]]).

::: theme every-tax
Here the tax is the escape stream. At 99.8 % coverage it costs 0.08 bits per number; on E4M3 with a 3-bit code it costs more than the code saves. The same arithmetic decides every stage of Part V ([[#toolbox-the-bill]]).
:::

::: takeaway
- Builds on: the bit-field split, the fixed-length rate, global scope, the decoder-speed rule.
- Reconciles with solo: per-furrow entropy tables turn an expansion on E4M3 into 0.778.
- Suggests: a fixed-length rate for our frontier compressor, and an escape index for random access.
:::

## Their words, ours {#words}

| their word | ours | where the meanings differ |
|---|---|---|
| codebook (the 16 most frequent exponents) | a [[fixed-length-code]] with an [[escape]] stream, a [[dictionary]] of global scope | on this site "codebook" means VQ centroids only |
| KV cache | the [[orchard]] | one sequence's, shipped whole |
| request | [[sequence]] | — |
| disaggregated serving | [[disaggregation]] | defined above; the bulk road |
| codec, coder | [[compressor]] | — |
| channel-wise / token-wise codebook | per-[[furrow]] / per-[[cherry]] tables | their finer tables; ours are the solo family's default |
| outlier | [[escape|escaped]] exponent | a value outside the table, patched back in |
| compression ratio 1.32× | 1 / [[mdl-ratio]] = 1 / 0.755 | we quote the ratio as a fraction of raw; their 1.324× is our 0.755 |

::: aside source Receipts
Guo and Joshi, *SplitZip: Ultra Fast Lossless KV Compression for Disaggregated LLM Serving*, arXiv:2605.01708 (2026); listed as a NeurIPS 2026 poster. Ratio, exponent entropy and coverage: the codec comparison table and §4 (Qwen3-32B BF16 KV, 256 M values). Speeds and FP8 results: §5, via public summaries. The E5M2 order-0 bound (6.19 bits, 88 %) and the finer-table cost (+0.1 % at ~1000× slower) as the first draft reported them; not re-checked. The E4M3 expansion re-checked; the 0.93 not. The 40-bit escape cost is our assumption. The campaigns' solo number 0.778 (6.22 bits, all six layers, FP8 E4M3 values) and "bf16 ≈ fp8/2 + 0.25": `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1.3–1.4 (notes/01 B, notes/04 §3).
:::
