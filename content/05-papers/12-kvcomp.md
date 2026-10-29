---
title: KVComp (2025)
nav: KVComp
lede: Round the KV cache, Huffman-code it, and decode it inside the attention kernel itself at hundreds of gigabytes per second. Proof that GPU entropy decoding can keep up — and a pipeline with no prediction step, for reasons that do not all carry over to us.
group: Lossy KV compression
cards:
  - q: What does KVComp's "cache-resident decompression" mean, in plain words?
    a: Decoded numbers go straight from fast on-chip memory into the attention dot products, never written back to GPU main memory
    wrong: ["The cache is decompressed once at the start of decoding", "Decompression runs on the CPU", "Only the hot cache is compressed"]
    why: Writing decoded numbers back to GPU memory and reading them again would cost the very bandwidth compression saves.
    sec: what
  - q: Which of KVComp's choices are KIVI's ruler directions?
    a: Keys rounded with per-channel rulers in blocks of tokens, values with per-token rulers
    wrong: ["Keys per token, values per channel", "Both per layer", "Both per head"]
    why: Same observation — key channels have sizes of their own, values vary by token — used before a Huffman coder.
    sec: what
  - q: In the grid figure (R² = 75 %), how does a predictor's saving change from an 8-bit-like grid (σ = 32 steps) to a coarse one (σ = 1 step)?
    a: Fewer bits saved (1.00 → 0.69) but a larger share of the total (14 % → 33 %)
    wrong: ["More bits saved and a larger share", "No change at all", "It becomes negative"]
    why: A coarse grid shrinks every cost, the predictor's saving included, but the order-0 cost shrinks faster. The grid alone does not make predictors useless.
    sec: predictors
  - q: Why might a predictor really not pay in KVComp's setting?
    a: Its block-wise per-channel rulers already absorb the simplest predictable part, and a predictor would add work inside every attention step
    wrong: ["Because Huffman codes cannot code residuals", "Because KV caches have no structure", "Because GPUs cannot subtract"]
    why: A ruler per channel per block is a location and scale — exactly what the simplest predictor would supply. What is left must be explained by something else.
    sec: predictors
  - q: Which kv-blockdiff path needs the decoder speed KVComp demonstrates?
    a: Lever 2, decoding compressed entries inside the attention read; lever 1 decodes only on misses
    wrong: ["The indexer", "Prefill", "The host-memory copy"]
    why: Lever 1 decodes a miss once and needs about 50 GB/s; lever 2 reads compressed slots every step, which is KVComp's regime.
    sec: connections
---

Every compression scheme for a [[kv-cache]] that lives on the GPU runs into the same wall. The attention kernel reads the cache at every decode step, at full memory speed. If the numbers are compressed, something must uncompress them just as fast — or the GPU waits.

[[entropy-coder|Entropy coders]] have a reputation for being slow and sequential. KVComp is the counter-example we lean on: a [[huffman|Huffman]] decoder fused into attention, reported at hundreds of gigabytes per second.

## What KVComp does, in our words {#what}

KVComp ([[lossy]]) has three stages.

1. **Round, with a bound on the error.** Keys get one ruler per channel within each block of tokens; values one ruler per token — KIVI's directions ([[#papers-kivi]]), in [[scale-group|scale groups]]. Each ruler's step is set so that no number moves by more than a chosen bound.
2. **Huffman-code the rounded integers** on the GPU, with code tables per layer (as one summary puts it). The authors chose Huffman over arithmetic coding and rANS for its simplicity and speed.
3. **Decode inside attention.** Each GPU thread decodes its own short run of the bit stream (about 128–256 bits), walking the code table without branching; the table sits in fast on-chip memory. The decoded numbers go straight into the dot products with the query and are never written back to GPU main memory.

::: note numbers The numbers we use
| what | value | source |
|---|---|---|
| memory | "on average 47 % and up to 83 % higher memory reduction rate compared to existing methods", little or no accuracy loss | abstract |
| speed | decoding fused with attention; in some cases faster than a cuBLAS-based attention kernel | abstract |
| decode throughput | over 400 GB/s for keys in secondary summaries (one gives 420 GB/s for keys, 185 GB/s for values) | summaries only, not checked |

Bo Jiang, Taolue Yang, Youyuan Liu, Chengming Zhang, Xubin He and Sian Jin, arXiv:2509.00579 (August 2025). We read the abstract and summaries, not the PDF. "Higher memory reduction rate compared to existing methods" is the abstract's phrase; what it is relative to, we could not pin down.
:::

::: takeaway
- KVComp = KIVI-direction rounding + GPU Huffman coding + decoding fused into the attention read.
- It shows variable-length codes can be decoded on a GPU at attention speed — the question our decoder must answer too.
:::

## "Predictors are not worth it" — in whose setting? {#predictors}

The first draft of this proposal credited KVComp with judging that [[prediction|predictors]] are not worth it for its lossy, GPU-resident setting. We could not find that sentence in what we could read. What we can see is that the pipeline has no prediction step: round, then code.

A tempting explanation is the grid: after coarse rounding there are only a few bits per number left, so what could a predictor save? The figure tests that.

::: figure fig-pb-kvcomp-grid pbKvcompGrid
**What a predictor saves, as the storage grid gets coarser.** Horizontal: the spread σ of a channel measured in grid steps (log scale): left, a coarse lossy grid where the channel spans a step or less; right, a fine grid (the dashed vertical line, σ = 32 steps, is our INT8 reference). Top: bits per number of the rounded channel coded by itself (order-0 entropy, lapis), of the integer residual after a predictor that knows a share $\vRsq$ of the variance (vermilion), and their difference (peacock). The dashed line is the fine-grid limit $\tfrac12\log_2\frac{1}{1-\vRsq}$. Bottom: the saving as a share of the order-0 bits. The shaded band marks coarse grids of roughly 2–4 bits (σ ≈ 0.7–2.7 steps, assuming a ruler spanning ±3σ). Exact entropies for a bell-shaped channel; the predictor's guess is rounded to the grid, as an integer residual must be. The slider sets $\vRsq$.
:::

::: try
1. $\vRsq$ = 75 %. On the fine grid (σ = 32) the predictor takes 7.05 bits to 6.05: one bit, as the exchange rate promises — a seventh of the bits.
2. Read σ = 1 step: 2.10 → 1.41 bits. Fewer bits saved (0.69), but a third of the total.
3. Raise $\vRsq$ to 90 %. The coarse grid now saves about half its bits; the fine grid saves 1.66 of 7.05.
:::

The same happens on data. Take the Gull Rock temperatures once more — the channel whose anchors we measured on [[#papers-cachegen]] — and store them twice: in tenths of a degree, as in Part II, and in whole degrees. The predictor is "the same as last time", which explains 98.4 % of their variance ([[#school-exchange-rate]]).

::: dataset fig-pb-kvcomp-temp papers-temp-recipes view=staircase,bill metrics=steps,fine,coarse
**The Gull Rock temperatures on a fine and a coarse grid.** *One day, two grids:* day 3, half-hour by half-hour (horizontal), in °C (vertical): the readings in tenths of a degree (lapis, with dots) and the same readings rounded to whole degrees (saffron staircase). *Bits on two grids:* entropy of the histogram in bits per reading, for each reading alone (lapis) and for its difference from the reading before (peacock), on each grid, over all 1,344 readings; the label above each pair gives the saving, in bits and as a share of the reading alone. Synthetic, seeded data: the temperatures of [[#school-prediction]].
:::

On tenths the channel spreads over 24 grid steps, and the predictor takes 6.53 bits to 3.63: it saves 2.91 bits, 44 % of the bill. On whole degrees it spreads over 2.4 steps, inside the coarse band of the figure, and the predictor takes 3.30 bits to 1.09: it saves only 2.21 bits, but 67 % of the bill.

So the grid alone does not make predictors useless: in *share of the bits*, a predictor is worth more on a coarse grid. If KVComp was right to leave it out, the reasons lie elsewhere.

- **Its rulers already did the predicting.** A ruler per channel per block of tokens *is* a location and a scale — exactly what the simplest predictor would supply. Whatever such a predictor explains, the rounding has already absorbed. A predictor must explain what is left *after* the ruler.
- **Work inside the hot loop.** Its decoder runs inside attention, for every token read, every step. A predictor adds a dependency to each number there.

Neither reason transfers whole to us:

| | KVComp | kv-blockdiff |
|---|---|---|
| exactness | lossy, error-bounded | lossless at 8 bits |
| where the cache lives | GPU memory | host memory; misses cross PCIe |
| when the decoder runs | every step, every token read | once per miss (lever 1) |
| speed it needs | attention speed | about 50 GB/s for lever 1 ([[#homework-break-even]]) |
| what a predictor competes with | block-wise rulers | a global per-channel code |

::: takeaway
- We could not verify the "predictors are not worth it" judgement; the pipeline simply has none.
- A coarse grid lowers a predictor's saving in bits but raises it as a share — so the grid is not the reason.
- In KVComp the rulers already absorb the simplest predictable part; in our setting, a global per-channel code plays that role, and the predictor must beat it.
:::

## Connections {#connections}

::: theme predict-correct
KVComp is the predict-correct shape with the "predict" step left out: round, then code. The guess in the middle pays only for variance that neither the ruler nor a per-channel table has already taken — the same accounting every dictionary on this site must pass.
:::

:::: compare Two GPU entropy decoders for KV
::: col KVComp
- Variable-length Huffman codes; tables per layer.
- Parallel by giving each thread a short run of bits.
- Lossy input; decoding fused into attention.
:::
::: col SplitZip
- Fixed-length codes for the exponent, with escapes.
- Parallel because every value's position is known in advance.
- Lossless; bulk transfer between machines. See [[#papers-splitzip]].
:::
::::

- The trade between the two shapes — entropy rate versus fixed-length rate — is [[#homework-two-rates]]. KVComp shows the entropy-coded side need not be slow.
- Lever 1 decodes on misses; lever 2 ([[lever]]) would read compressed slots inside attention, which is KVComp's regime.

::: takeaway
- KVComp and SplitZip bracket the GPU decoder design space: variable-length and fused, or fixed-length and simple.
- Our miss path needs far less speed than KVComp's; lever 2 would need all of it.
:::
