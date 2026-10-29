---
title: The data behind the harness
nav: The data
group: The harness
lede: Wave 1 studies a photograph, not a moving system. One evening on a 16 GB GPU produces about 2 GB of 8-bit codes; everything after that is numpy on a laptop.
cards:
  - q: Which model's KV cache does wave 1 measure?
    a: The full-attention layers of a small open proxy model (Qwen3.5-2B), replicated on Qwen3-1.7B
    wrong: ["The real sparse-attention target model, on a cluster", "A randomly initialised transformer", "Synthetic Gaussian vectors only"]
    why: The real target does not fit the 16 GB GPU at hand. A small model with plain GQA attention is a clean place to measure neighbour similarity; whether it transfers is itself a risk (R6).
    sec: dump
  - q: Why are keys stored before RoPE?
    a: RoPE rotates channel pairs by a position-dependent angle, which smears the per-channel structure a dictionary would exploit; rotating after decoding is cheap
    wrong: ["Because RoPE makes keys lossy", "Because values have no position", "Because post-RoPE keys are larger"]
    why: Before the rotation, a channel's values sit around a stable location; after it, the same channel wobbles with position.
    sec: dump
  - q: Why must the calibration set be disjoint from the evaluation set?
    a: Otherwise the global dictionary has seen the test data, and global scope cheats
    wrong: ["Because calibration data is in BF16", "Because it saves disk space", "Because the calibration set is used for the shuffle control"]
    why: Global scope is supposed to capture only what all texts share. Fitting it on the very sequences it codes turns it into a request dictionary that nobody paid for.
    sec: dump
  - q: 'Roughly how much GPU memory does the Qwen3.5-2B dump need at 32K tokens?'
    a: About 5–6 GB — 4 GB of weights, 0.4 GB of KV, plus working memory
    wrong: ["About 40 GB", "About 16 GB exactly", "About 0.4 GB"]
    why: 'Only 6 of 24 layers keep a growing KV cache: $6 \times 32768 \times 1024 \times 2$ bytes ≈ 0.40 GB. The weights dominate.'
    sec: fit
  - q: How large is the whole wave-1 data set of 8-bit codes?
    a: About 2 GB — 10 sequences × 32K tokens × 6 layers × 1 KB
    wrong: ["About 2 TB", "About 20 MB", "About 200 GB"]
    why: 'An entry of the proxy model is 1024 elements, one byte each in 8 bits. $10 \times 32768 \times 6 \times 1024$ B ≈ 2.0 GB: it fits in RAM.'
    sec: dump
---

A photographer who wants to study how light falls on a street does not stand on the street for a year. She takes one good photograph and studies it at her desk. Wave 1 does the same with a language model's memory: one evening of GPU time writes the [[kv-cache|KV cache]] of a few long documents to disk, and the weekend is spent at the desk with numpy.

## What goes in the dump {#dump}

::: define proxy-model
- **What it is:** a small open model whose KV cache stands in for the real target's during wave 1. Here: **Qwen3.5-2B**, only its full-attention [[layer|layers]], with **Qwen3-1.7B** as the replication.
- **Why a proxy:** the real target is a large sparse-attention model with [[mla|MLA]] latents; it does not fit the 16 GB GPU at hand. [[neighbour|Neighbour similarity]] is a property of transformer KV statistics, and a plain attention layer is a clean place to look for it.
- **Easy to confuse with:** a model of the indexer. The proxy has no trained indexer at all; wave 2 simulates one ([[#plan-wave2-indexer]]).
:::

Qwen3.5-2B mixes two kinds of layers. Every fourth of its 24 layers is a full-attention layer; the other 18 use a linear-attention state of fixed size, which keeps no per-token history and is irrelevant here. The 6 full-attention layers have 2 [[head|KV heads]] of 256 numbers each. So one [[entry]] — keys plus values of one token at one layer — is $2 \times 2 \times 256 = 1024$ elements: about 1 KB at 8 bits, close to the 640-element entry of the [[reference-setting|reference setting]]. (The every-fourth-layer layout matches Qwen3.5's published architecture; the head size and count are the source's and were not checked here.)

::: define calibration-set
- **What it is:** sequences kept apart from the evaluation data, on which every [[scope-global|global-scope]] dictionary and model is fit.
- **The two ways it goes wrong:** if it overlaps the evaluation data, global scope cheats; if it is too small, the global dictionary is poorly fit and the request gain looks bigger than it is (the calibration gap of [[#plan-controls]]).
:::

| item | choice for wave 1 | why |
|---|---|---|
| model | Qwen3.5-2B, its 6 full-attention layers; Qwen3-1.7B (28 layers, 8 KV heads of 128) for replication | plain grouped-query attention with partial [[rope\|RoPE]]; ≈ 1 KB entries; fits a 16 GB GPU |
| what to store | keys **before** RoPE, values as they are; scored separately; the entry's rate is their byte-weighted mean | RoPE smears per-channel structure; rotating after decoding is a cheap kernel |
| number format | [[fp8\|E4M3]] with one power-of-two scale per (layer, keys or values), round to nearest even, −0 → +0, codes in [[index-space\|index space]]; also [[integer-grid\|INT8]] with one scale per [[channel]] | 8 bits is where KV storage is heading; the two grids react differently to prediction |
| also report | [[bf16\|BF16]], the same code with a 16-bit alphabet | free; the precision HiSparse actually serves |
| sequences | ≥ 8 evaluation sequences × 32K tokens: 2 books, 2 code repositories, 2 long transcripts, 2 LongBench-V2 prompts; **2** calibration sequences of other documents | genre diversity; calibration disjoint from evaluation |
| also dump | query vectors and positions for the last 4K tokens of each sequence | wave 2 needs them; cheap to add now |
| volume | 10 × 32K × 6 layers × 1 KB ≈ 2 GB of 8-bit codes | fits in RAM; no GPU needed after the dump |

Two lines of this table deserve a sceptical look.

- **Two calibration sequences are too few.** The shuffle control on synthetic data showed a calibration gap of 0.22 bit with two calibration sequences, falling to 0.07 bit with 32 ([[#plan-controls/run]]). A calibration sequence costs about 200 MB of codes. Our read: dump at least 8, better 32.
- **The BF16 column is not free in the toy harness.** Its alphabet has 65,535 values per sign, so the index-space Laplace table of [[#plan-accounting]] would be enormous. The grid-aware model of [[#plan-fp8-target]] needs no table and handles it.

::: takeaway
- Wave 1 measures a proxy model: the 6 full-attention layers of Qwen3.5-2B, replicated on Qwen3-1.7B.
- Keys are stored before RoPE; both 8-bit grids are scored; BF16 rides along.
- Calibration data must be disjoint from evaluation data — and plentiful, or global scope is under-fit.
:::

## Does it fit a 16 GB GPU? {#fit}

The dump runs on one 16 GB GPU. A worked calculation, in three lines.

1. **Weights.** About 2 billion parameters in BF16, 2 bytes each: about 4 GB.
2. **KV cache.** Only the 6 full-attention layers keep a growing cache. At 32K tokens, in BF16:

$$
\underbrace{6}_{\text{layers}} \times \underbrace{32\,768}_{\text{tokens}} \times \underbrace{1024}_{\text{elements per entry}} \times \underbrace{2}_{\text{bytes (BF16)}} \approx 0.40\ \text{GB}
$$ {#eq-plan-kv-dump}

3. **Working memory.** Prefill runs in chunks of 2–4K tokens, so the activations stay small. We **assume** at most 1 GB with a fused attention kernel. The extra query vectors for the last 4K tokens are of the order of 0.1 GB.

Total: about 5.4 GB, with more than 10 GB to spare. The replication model is heavier where it matters: all 28 layers are full attention, with 8 KV heads of 128, so $28 \times 32\,768 \times 2048 \times 2$ bytes ≈ 3.76 GB of KV, plus about 3.4 GB of weights. Still under 16 GB at 32K tokens.

::: figure fig-plan-gpu-fit planGpuFit
**GPU memory needed for the dump.** Stacked bar in GB: weights in BF16 (lapis), the KV cache in BF16 of the layers that keep one (vermilion), and working memory (emerald, an **assumed** 1 GB for chunked prefill). The dashed red line is the 16 GB of the GPU. KV per token: Qwen3.5-2B 6 layers × 1024 elements × 2 bytes = 12 KiB; Qwen3-1.7B 28 layers × 2048 elements × 2 bytes = 112 KiB. Choose the model and the number of tokens dumped.
:::

::: try
1. Take Qwen3.5-2B up to 128K tokens. The KV grows to 1.6 GB; the weights still dominate.
2. Switch to Qwen3-1.7B and slide to 64K, then 128K. It stops fitting: the replication dumps 16K or 32K tokens instead.
:::

::: note numbers After the dump
Everything after the dump is numpy on a CPU: 2 GB of codes fit in the RAM of any laptop. Experiment 1a takes about an hour of compute; the slowest rung of 1b (k-means for VQ) runs overnight ([[#plan-wave1-outputs/timeline]]).
:::

::: takeaway
- Qwen3.5-2B needs about 4 GB of weights and 0.4 GB of KV at 32K tokens: it fits a 16 GB GPU easily.
- The 28-layer replication model fits at 32K, not at 128K.
- After one evening of dumping, the GPU is no longer needed.
:::
