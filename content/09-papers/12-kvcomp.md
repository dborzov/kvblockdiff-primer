---
title: KVComp (2025)
nav: KVComp
group: Lossy KV compression
lede: Round the orchard, Huffman-code it, and decode it inside the attention kernel itself at hundreds of gigabytes per second. Proof that GPU entropy decoding can keep up, and a pipeline with no prediction stage, for reasons that do not all carry over to us.
cards:
  - q: What does KVComp's "cache-resident decompression" mean, in plain words?
    a: Decoded numbers go straight from fast on-chip memory into the attention dot products, never written back to GPU main memory
    wrong: ["The orchard is decompressed once at the start of decoding", "Decompression runs on the CPU", "Only the hot cache is compressed"]
    why: Writing decoded numbers back to GPU memory and reading them again would cost the very bandwidth compression saves.
    sec: idea
  - q: Which of KVComp's choices are KIVI's ruler directions?
    a: Keys rounded with per-furrow rulers in runs of tokens, values with per-cherry rulers
    wrong: ["Keys per cherry, values per furrow", "Both per layer", "Both per head"]
    why: The same background, key furrows have sizes of their own and values vary by token, used before a Huffman code.
    sec: assume
  - q: What does KVComp show that this project needs from it?
    a: That a variable-length code can be decoded on the GPU at attention speed, hundreds of GB/s
    wrong: ["That predictors never pay", "That the orchard has no structure", "That Huffman beats rANS in ratio"]
    why: Entropy coders have a reputation for being slow and sequential. KVComp is the counter-example; every compressor of Part VIII uses an entropy coder and none has been timed on a GPU.
    sec: show
  - q: In the grid figure (R² = 75 %), how does a predictor's saving change from an 8-bit-like grid (σ = 32 steps) to a coarse one (σ = 1 step)?
    a: Fewer bits saved (1.00 → 0.69) but a larger share of the total (14 % → 33 %)
    wrong: ["More bits saved and a larger share", "No change at all", "It becomes negative"]
    why: A coarse grid shrinks every cost, the predictor's saving included, but the order-0 cost shrinks faster. The grid alone does not make predictors useless.
    sec: show
  - q: What did the campaigns find that a predictor is worth on the Bench's 8-bit values?
    a: About 1.2–1.3 bits per element over solo at stretches of 4096–16 384 tokens, from reference cherries and linear prediction
    wrong: ["Nothing; rounding had absorbed it all", "About 6 bits per element", "Only the dictionary share changed"]
    why: Solo is 0.778; the best verified compressor reached 0.636 at 4096 and 0.618 at 16 384. The gap is prediction, which KVComp's pipeline leaves out.
    sec: ours
  - q: KVComp rounds keys with one ruler per element position within a run of tokens. What is that on this site?
    a: Per-furrow rounding with one scale group per furrow per run of tokens
    wrong: ["Per-punnet rounding", "Per-cherry rounding", "A dictionary per stretch"]
    why: One ruler per furrow within a run of tokens; the run is a scale group along the token axis, not a stretch of ours.
    sec: words
---

Every compression scheme for an [[orchard]] that lives on the GPU runs into the same wall. The attention kernel reads the orchard at every decode step, at full memory speed. If the numbers are compressed, something must uncompress them just as fast, or the GPU waits. [[entropy-coder|Entropy coders]] have a reputation for being slow and sequential. KVComp is the counter-example we lean on: a [[huffman|Huffman]] decoder fused into attention, reported at hundreds of gigabytes per second.

## The idea, by example {#idea}

KVComp ([[lossy]]) lives on the GPU-memory road of [[#papers-reading-guide/data-path]] and has three stages. On the Bench's cherry `v[t, l]` of shape `(2, 256)`:

1. **Round, with a bound on the error.** Keys get one ruler per [[furrow]] within each run of tokens; values one ruler per [[cherry]]: KIVI's directions ([[#papers-kivi]]), in [[scale-group|scale groups]]. Each ruler's step is set so that no number moves by more than a chosen bound.
2. **Huffman-code the rounded integers** on the GPU, with code tables per layer (as one summary puts it). The authors chose Huffman over arithmetic coding and rANS for its simplicity and speed.
3. **Decode inside attention.** Each GPU lane decodes its own short run of the bit stream (about 128–256 bits), walking the code table without branching; the table sits in fast on-chip memory. The decoded numbers go straight into the dot products with the query and are never written back to GPU main memory.

In our words: a [[bit-field-split]]-free pipeline of two stages, a quantiser and an entropy coder, with no predictor between them. The "predict, then store the surprise" shape of [[#toolbox-the-bill]] with the predict step left out.

::: takeaway
- KVComp = KIVI-direction rounding + GPU Huffman coding + decoding fused into the attention read.
- Two stages, no predictor.
:::

## What they assume {#assume}

1. **KIVI's background:** key furrows have persistent sizes; values vary by token ([[#papers-kivi]]).
2. **An error bound per number is the right lossy contract.** Rather than a bit budget, a cap on how far any number may move.
3. **The decoder must run at attention speed**, every step, for every token read, because the orchard is read from HBM every step.
4. **Huffman decoding can be made parallel** by giving each lane a short, independently decodable run of bits. Known from GPU compression work; the paper engineers it.

::: takeaway
- Known: KIVI's directions, error-bounded rounding, the attention-speed requirement.
:::

## What they show {#show}

| their measurement | value | where | verifiable? |
|---|---|---|---|
| memory | "on average 47 % and up to 83 % higher memory reduction rate compared to existing methods", little or no accuracy loss | abstract | relative to what, we could not pin down |
| speed | decoding fused with attention; in some cases faster than a cuBLAS-based attention kernel | abstract | their rig |
| decode throughput | over 400 GB/s for keys in secondary summaries (one gives 420 GB/s for keys, 185 GB/s for values) | summaries only | not checked |

The first draft credited KVComp with judging that [[prediction|predictors]] are not worth it in its setting. We could not find that sentence in what we could read. What we can see is that the pipeline has no prediction step: round, then code. A tempting explanation is the grid: after coarse rounding there are only a few bits per number left, so what could a predictor save? The figure tests that.

::: figure fig-papers-kvcomp-grid pbKvcompGrid
**What a predictor saves, as the storage grid gets coarser.** Horizontal: the spread σ of a furrow measured in grid steps (log scale): left, a coarse lossy grid where the furrow spans a step or less; right, a fine grid (the dashed vertical line, σ = 32 steps, is our INT8 reference). Top: bits per number of the rounded furrow coded by itself (order-0 entropy, lapis), of the integer residual after a predictor that knows a share $\vRsq$ of the variance (vermilion), and their difference (peacock). The dashed line is the fine-grid limit $\tfrac12\log_2\frac{1}{1-\vRsq}$. Bottom: the saving as a share of the order-0 bits. The shaded band marks coarse grids of roughly 2–4 bits (σ ≈ 0.7–2.7 steps, assuming a ruler spanning ±3σ). Exact entropies for a bell-shaped furrow; the predictor's guess is rounded to the grid, as an integer residual must be. The slider sets $\vRsq$.
:::

::: try
1. $\vRsq$ = 75 %. On the fine grid (σ = 32) the predictor takes 7.05 bits to 6.05: one bit, as the exchange rate promises, a seventh of the bits.
2. Read σ = 1 step: 2.10 → 1.41 bits. Fewer bits saved (0.69), but a third of the total.
3. Raise $\vRsq$ to 90 %. The coarse grid now saves about half its bits; the fine grid saves 1.66 of 7.05.
:::

So the grid alone does not make predictors useless: as a share of the bits, a predictor is worth more on a coarse grid. If KVComp was right to leave it out, the reasons lie elsewhere: its rulers per furrow per run of tokens already supply a location and a scale, so a predictor must explain what is left after the ruler; and a predictor adds a dependency to each number inside the hottest loop of the GPU.

::: takeaway
- Verified in spirit, not by us: variable-length codes can be decoded on a GPU at attention speed.
- A coarse grid lowers a predictor's saving in bits but raises it as a share, so the grid is not the reason for leaving prediction out.
:::

## What it says about our scenario {#ours}

**Builds on.**
- The two rates of [[#toolbox-two-rates]] and the decoder-speed question of [[#plan-decoder-speed]]: every compressor of Part VIII uses rANS, an entropy coder, and none was timed on a GPU; KVComp says the entropy-coded side need not be slow.
- The two levers of [[#app-two-levers]]: lever 1 decodes once per miss and needs about 50 GB/s; lever 2 would read compressed hot-cache slots inside attention, which is KVComp's regime and needs all of its speed.

**Conflicts with.** "No predictor" against the campaigns' whole result. On the Bench's 8-bit values, solo (per-furrow tables, no predictor) reaches 0.778; the best verified compressor, reference cherries plus linear prediction across elements, reaches 0.636 at stretch 4096 and 0.618 at 16 384: about 1.2–1.3 bits per element of prediction over the ruler-like baseline ([[#measured-dispatch]], [[#measured-scorecard]]). We believe the campaigns for our setting and KVComp for its own: its rulers absorb the simplest predictable part and its decoder cannot afford a dependency chain; our decoder runs once per miss, with 0.38 ms of slack per layer ([[#landscape-derived-numbers]]).

| | KVComp | kvblockdiff |
|---|---|---|
| exactness | lossy, error-bounded | lossless at 8 bits |
| where the orchard lives | GPU memory | host memory; misses cross the link |
| when the decoder runs | every step, every token read | once per miss (lever 1) |
| speed it needs | attention speed | about 50 GB/s for lever 1 ([[#app-the-napkin]]) |
| what a predictor competes with | rulers per furrow per run | the solo tables, 0.778 |

**Suggests.**
- A GPU decode of the frontier compressor, timed, the way KVComp times its Huffman kernel ([[#plan-decoder-speed]]). KVComp's lane-per-short-run layout is a design to copy for the deltas.
- [[context-modeling|Context modelling]] instead of subtraction ([[#toolbox-context-modelling]]): a predictor used as the context of an entropy coder keeps KVComp's "round then code" shape and still collects the prediction's bits.

::: theme predict-correct
KVComp is the predict-correct shape with the predict step left out: round, then code. The guess in the middle pays only for variance that neither the ruler nor a per-furrow table has already taken, the same accounting every dictionary on this site must pass.
:::

::: takeaway
- Builds on: the two rates, lever 2's speed requirement.
- Conflicts with: no predictor; the Bench's values gave 1.2–1.3 bits to prediction.
- Suggests: time the frontier compressor on a GPU; context modelling keeps the round-then-code shape.
:::

## Their words, ours {#words}

| their word | ours | where the meanings differ |
|---|---|---|
| cache-resident decompression | decoding inside the attention read, lever 2's regime | ours decodes once per miss on lever 1 |
| block-wise per-channel quantization (keys) | per-[[furrow]] rounding, one [[scale-group]] per furrow per run of tokens | the run is a scale group, not a stretch |
| per-token quantization (values) | per-[[cherry]] rounding | — |
| error-bounded quantization | rounding with a cap on each number's error | lossy; ours rounds nothing |
| Huffman coding | an [[entropy-coder]] stage with a [[huffman]] code | the campaigns used rANS |
| KV cache | the [[orchard]] | — |
| memory reduction rate | 1 / [[mdl-ratio]], lossy | relative to an unknown baseline |
| model | the LLM | — |

::: aside source Receipts
Bo Jiang, Taolue Yang, Youyuan Liu, Chengming Zhang, Xubin He and Sian Jin, *KVComp: A High-Performance, LLM-Aware, Lossy Compression Framework for KV Cache*, arXiv:2509.00579 (August 2025). Memory and speed claims: abstract; "higher memory reduction rate compared to existing methods" is the abstract's phrase, and what it is relative to could not be pinned down. Decode throughput (420 / 185 GB/s): secondary summaries only. We read the abstract and summaries, not the PDF; the "predictors are not worth it" judgement of the first draft could not be found. The grid figure is our exact calculation. The campaigns' numbers: `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1.3 (solo 0.778), §1.9 (0.63639 at 4096, 0.61768 at 16384, isolated-verified), §1.12 (every coder is an entropy coder, rANS; no fixed-length rate measured).
:::
