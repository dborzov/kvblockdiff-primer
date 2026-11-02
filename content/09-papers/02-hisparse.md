---
title: HiSparse (2026)
group: The system we sit under
nav: HiSparse
lede: The system this whole proposal sits under, read as a paper — what it claims, the seven numbers we borrow from it, and the questions that one trace cannot answer.
cards:
  - q: What does HiSparse change about decoding?
    a: Where entries live — host memory or GPU memory — and nothing about their values
    wrong: ["The numbers stored in each entry", "Which entries the indexer selects", "How many entries attention reads per step"]
    why: HiSparse moves raw entries between host DRAM and a small LRU hot cache in HBM. Attention reads the same entries with the same bytes, so the model's outputs are unchanged.
    sec: what
  - q: At a hot cache of 4096 slots, LRU misses 13.4 % of selections and Bélády's clairvoyant policy 8.2 %. What does the gap tell us?
    a: A perfect eviction policy would remove only about 5 points of misses — the eviction lever is nearly used up
    wrong: ["LRU is a poor policy and should be replaced", "Doubling the cache would not reduce misses", "Bélády's policy can be built from the indexer's scores"]
    why: Bélády's policy knows the future, so no real policy can beat it. To cut misses much further you need a bigger cache, or cheaper misses.
    sec: numbers
  - q: How many traces are HiSparse's locality numbers (30 / 13.4 / 6.7 % misses) measured on?
    a: One — a single 100,384-token LongBenchV2 prompt on GLM-5.1, averaged over decode steps
    wrong: ["Six model families", "A thousand production requests", "The whole LongBenchV2 benchmark"]
    why: The trace is one request with 1,799 decode steps over 78 sparse layers. The means cover the first 1,000 steps.
    sec: numbers
  - q: The power law m(B) ∝ B^−1.08 through HiSparse's points rests on what?
    a: Three points at evenly spaced cache sizes — so the fitted slope is set by the two end points alone
    wrong: ["A thousand cache sizes simulated from the trace", "A theorem about LRU caches", "A fit over six different models"]
    why: For three evenly spaced points, the least-squares slope equals the slope between the first and the last. Through the two larger caches alone the exponent is 1.00.
    sec: doubts
  - q: Why may the 30 % point at B = k be fitted together with the LRU points?
    a: With exactly k slots, LRU must hold this step's k selections, so it is the same as keeping only the current top-k
    wrong: ["Because it was measured on a different model", "Because Bélády's policy equals LRU at that size", "It may not; it is a different policy"]
    why: When the cache has exactly k slots and all k selections must be resident, nothing else can stay. "LRU at B = k" and "top-k only" are one policy.
    sec: doubts
---

Count how many caching numbers on this site come from one experiment: the miss rate of a hot cache at three sizes; FIFO, random replacement and Bélády's clairvoyant policy; the "87 % hits" behind the [[lucky-louis]]; the power law of [[#landscape-reuse-curve]]. Every one was measured on **a single request** — one GLM-5.1 prompt of 100,384 tokens, decoding for 1,799 steps.

That request comes from the HiSparse paper. We use its numbers more than any other paper's, so it deserves the same sceptical reading as the rest.

::: note literature The paper
Zhiqiang Xie and co-authors (Stanford), *HiSparse: Scaling Sparse-Attention Decoding with Hierarchical KV Cache Management*, arXiv:2608.07009 (2026). The system is merged into SGLang and was announced on the LMSYS blog in April 2026. Title, authors and the headline numbers below were re-checked against the abstract and public summaries.
:::

## What it does, in our words {#what}

::: aside reminder The setting from Part III
Sparse attention reads only $\vk$ selected entries per layer per step, but every entry must stay available. [[hisparse]] keeps each request's full history in host [[dram|DRAM]] and a [[hot-cache]] of $\vB$ raw entries per request per layer in [[hbm|HBM]]. See [[#landscape-hisparse]].
:::

In this site's words, HiSparse is a two-tier library.

- **The archive.** Every [[entry]] of every request lives in host memory, in full, as raw BF16 bytes.
- **The desk.** Per request and per [[layer]], $\vB$ slots of GPU memory hold recently used entries, managed [[lru|least recently used]].
- **Each decode step.** The [[indexer]] announces its $\vk$ picks. Picks already on the desk are [[hit-miss|hits]] and are used in place. Every other pick is a miss: a GPU kernel reads that one raw entry from host memory over [[pcie|PCIe]] and overwrites the least recently used slot that is not needed now.
- **Outputs are unchanged by construction.** Attention reads exactly the same bytes as before; only their address changes.

The paper's headline claim is up to **4.7× higher peak generation throughput** on long contexts than keeping everything in GPU memory, with selectors of three families (DSA, NSA and Quest; see [[#papers-sparse-selectors]]) on H200, B200 and GH200 GPUs. The SGLang integration is narrower: it supports DSA models (DeepSeek-V3.2, GLM-5.1, DeepSeek-V4), runs only on the decode side of a deployment where prefill and decode use separate machines, and stores KV only in BF16.

The figure shows the evidence for why such a small desk works.

::: figure fig-papers-hisparse-points paHisparsePoints
**Seven numbers from one trace.** Horizontal axis: hot-cache size $\vB$ in entry slots per layer (log scale, base 2). Vertical axis: [[miss-rate-curve|miss rate]] — the share of each step's selections not found in the hot cache (log scale), averaged over the first 1,000 decode steps and 78 layers of HiSparse's GLM-5.1 trace. Dots: LRU at three sizes (the one at $\vB = \vk = 2048$ is "keep only the current picks"), FIFO, random replacement and Bélády's clairvoyant policy at 4096 (FIFO and random are nudged sideways so the dots do not overlap). Line: a power law $\vm(\vB) \propto \vB^{-\alpha}$ fitted in log space; it is solid where there are data and dashed beyond 8192, where it is a guess. The switch chooses which points the line is fitted through. Hover a dot for its source.
:::

::: try
1. Fit through all three LRU points: $\alpha \approx 1.08$. Now fit through the two larger caches only: $\alpha = 1.00$ exactly, because 13.4 % → 6.7 % is a clean halving.
2. Read the extrapolation at 16384 slots in both fits: 3.1 % against 3.3 %. Small difference — and both are guesses.
3. Compare the dots at 4096: random replacement (16.1 %) is only 2.7 points worse than LRU. Recency helps, but most of the work is done by the selections themselves repeating.
:::

::: takeaway
- HiSparse moves raw entries between host memory and a small LRU desk in GPU memory; it never changes their bytes.
- A miss costs one raw entry on the link and a slot costs one raw entry of GPU memory. HiSparse makes misses rarer; it leaves both prices alone.
:::

## The numbers we use {#numbers}

| number | value | where it comes from | checked |
|---|---|---|---|
| the trace | GLM-5.1, one LongBenchV2 prompt of 100,384 tokens, 1,799 decode steps, 78 sparse layers, $\vk = 2048$; means over the first 1,000 steps | §4.3 | yes |
| miss rate, keep only the current picks ($\vB = 2048$) | 30 % | §4.3 | yes |
| miss rate at $\vB = 4096$: LRU / FIFO / random / Bélády | 13.4 / 17.2 / 16.1 / 8.2 % | §4.3, Fig. 6 | yes |
| miss rate, LRU at $\vB = 8192$ | 6.7 % | §4.3 | yes |
| BF16 KV of one 128K-token request | 13.09 GB | §2.3 | yes |
| traffic if every pick were fetched | ≈ 200 MB per generated token ($\vk = 2048$ × ≈ 100 KB per token over all layers) | §2.3 | yes |
| HBM left for KV on 8 × H200; hot cache per request at $\vB = 4096$ | ≈ 240 GB; ≈ 0.4 GB | §2.2, §3.2 | as reported in the first draft; not re-checked |
| peak throughput gain | up to 4.7× | abstract | yes |

:::: compare What HiSparse tells us — and what it does not
::: col It tells us
- Selections repeat from step to step: at twice $\vk$, 87 % of picks are hits. That is the [[lucky-louis]], measured.
- LRU is near the best any online policy could do: Bélády is only 5.2 points better at 4096. The eviction lever is nearly used up.
- The design works in production, at BF16, inside a real serving stack.
:::
::: col It does not tell us
- Anything about the *bytes* inside entries — whether neighbours are alike, whether they compress. That was never its question.
- Where the misses land: spread over the whole history, or piled into a few [[heavy-block|heavy blocks]] for many steps?
- How the miss rate varies between layers, steps and requests: only means are reported.
:::
::::

::: theme which-vs-what
Every number HiSparse reports is about *which* entries the indexer wants. None is about *what* is inside them. Its 87 % hit rate is strong evidence for the Lucky Louis property and no evidence at all for [[fallen-apple]].
:::

::: takeaway
- We borrow seven caching numbers from one trace, plus the byte sizes of GLM-5.1's KV.
- The numbers support "selections repeat" and "LRU is near-optimal". They are silent on compressibility and on where misses land.
:::

## Where we are not convinced {#doubts}

1. **One trace.** All locality numbers come from one prompt of one benchmark — a long document followed by a question. A chat that wanders, or code that jumps between files, might repeat its selections less. A referee-style summary of the paper raises the same point. Until more traces are replayed, "87 % hits" is one data point.
2. **Means hide the tail.** The miss rates are averaged over 1,000 steps and 78 layers. If a few layers miss far more than the rest, they set the per-layer fetch budget, and our "274 misses per layer per step" ([[#landscape-derived-numbers]]) is an average of unequal things.
3. **The power law is really a two-point line.** For three points at evenly spaced log sizes, the least-squares slope is the slope between the end points. The exponent 1.08 is $\log_2(30/6.7)/2$. Anything beyond 8192 slots is extrapolation (play with the switch above).
4. **BF16 only.** HiSparse stores and moves BF16. Our [[reference-setting]] assumes 8-bit storage. Miss *rates* are about which entries are wanted, so they should not care about the format; miss *bytes* halve. That is our assumption, not their measurement.
5. **Two prefetch findings that sound opposite.** Guessing layer $\vl + 1$'s picks from layer $\vl$'s gave little (as reported in the first draft; not re-checked). For models that share one selection across several layers, prefetching the known picks hides about half of the remaining miss time (abstract). They agree once translated: guessing fails, knowing works.

One reassurance: the 30 % point ("keep only the current picks") is not a different policy. With exactly $\vk$ slots, LRU must hold this step's $\vk$ picks and nothing else, so all three dots on the line belong to one policy.

::: note connection Where HiSparse appears on this site
The system: [[#landscape-hisparse]]. Its locality: [[#landscape-lucky-louis]]. The two prices it leaves alone: [[#idea-two-levers]]. What a cache-size curve can and cannot say: [[#papers-classics/stack]].
:::

::: takeaway
- One trace, means only, BF16 only: the numbers are solid for what they measure and narrow in where they were measured.
- The power law is a two-point line; treat extrapolations as guesses.
- What we most need and HiSparse does not report: where the misses land, and what is inside the entries.
:::
