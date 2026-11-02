---
title: HiSparse (2026)
nav: HiSparse
group: The serving side
lede: The system this project sits under, read as a paper. It moves raw picks between host memory and a small GPU desk and never changes a byte; seven of this site's caching numbers come from its one trace.
cards:
  - q: What does HiSparse change about decoding?
    a: Where picks live, host memory or GPU memory, and nothing about their bytes
    wrong: ["The numbers stored in each cherry", "Which picks the indexer names", "How many picks attention reads per step"]
    why: HiSparse keeps the orchard in host DRAM and a hot cache of raw picks in HBM. Attention reads the same bytes as before, so the LLM's outputs are unchanged.
    sec: idea
  - q: Which fact does HiSparse's introduction treat as known, and which we lean on most?
    a: Sparse attention reads a few thousand picks per layer per step, but every cherry of the orchard must stay available
    wrong: ["Neighbouring cherries have similar bytes", "The orchard compresses 2× losslessly", "Picks arrive in order of position"]
    why: Everything must be kept, and only a little is read. That is the background of the paper, and the premise of the whole scenario.
    sec: assume
  - q: At 4096 slots, LRU misses 13.4 % of picks and Bélády's clairvoyant policy 8.2 %. What does the gap tell us?
    a: A perfect eviction policy would remove only about 5 points of misses; the eviction lever is nearly used up
    wrong: ["LRU is a poor policy and should be replaced", "Doubling the cache would not reduce misses", "Bélády's policy can be built from the indexer's scores"]
    why: Bélády's policy knows the future, so no real policy can beat it. To cut misses much further you need a bigger cache, or cheaper misses.
    sec: show
  - q: How many traces are HiSparse's locality numbers (30 / 13.4 / 6.7 % misses) measured on?
    a: 'One: a single 100 384-token LongBenchV2 prompt on GLM-5.1, averaged over decode steps'
    wrong: ["Six LLM families", "A thousand production sequences", "The whole LongBenchV2 benchmark"]
    why: The trace is one sequence with 1 799 decode steps over 78 sparse layers; the means cover the first 1 000 steps.
    sec: show
  - q: Which of our open questions does HiSparse leave unanswered, by design?
    a: Where the misses land, spread over the orchard or piled into a few heavy stretches, and what is inside the picks
    wrong: ["Whether LRU beats FIFO", "Whether the hot cache can hold 4096 slots", "Whether GLM-5.1 uses sparse attention"]
    why: Every number it reports is about which picks are wanted. None is about their bytes, and none is broken down by stretch.
    sec: ours
  - q: HiSparse's "hot device buffer" is which object on this site?
    a: The hot cache
    wrong: ["The dictionary shelf", "The orchard", "The victim tier"]
    why: Its per-sequence, per-layer GPU buffer of raw picks, managed LRU, is the hot cache of Part III. The dictionary shelf is ours and does not exist in HiSparse.
    sec: words
---

Count how many caching numbers on this site come from one experiment: the miss rate of a hot cache at three sizes; FIFO, random replacement and Bélády's clairvoyant policy; the "87 % hits" behind the [[lucky-louis|Lucky Louis property]]; the power law of [[#landscape-reuse-curve]]. Every one was measured on a single [[sequence]]: one GLM-5.1 prompt of 100 384 tokens, decoding for 1 799 steps. That sequence comes from the HiSparse paper. We use its numbers more than any other paper's, so it deserves the same sceptical reading as the rest.

## The idea, by example {#idea}

Take [[pin|the Pin]]: GLM-5.1, 78 KV layers, one latent of 640 elements per token per layer, so one pick is `v[token_pos_id, layer_id]` of 640 bytes at 8 bits. A sequence of 100 384 tokens has grown an [[orchard]] of 78 × 100 384 picks, about 5 GB at 8 bits (13.09 GB in BF16, their measurement, §2.3). HiSparse's idea is a two-tier library.

- **The archive.** The whole orchard of every sequence lives in host [[dram|DRAM]], raw.
- **The desk.** Per sequence and per [[layer]], a [[hot-cache]] of $\vB$ slots in [[hbm|HBM]] holds raw picks, managed [[lru|least recently used]].
- **Each decode step, each layer.** The [[indexer]] names its $\vk = 2048$ picks. Those on the desk are hits. Each other pick is a miss: one raw 640-byte read over [[link|the link]] into the least recently used slot that is not needed now.

```python HiSparse's resolve step, per sequence, per layer, per decode step
hits   = [p for p in S if p in hot_cache]       # S: this layer's 2048 picks
misses = [p for p in S if p not in hot_cache]
for p in misses:
    evict_lru_not_in(S)                         # LRU with one guard
    hot_cache[p] = fetch(p)                     # one pick over the link: raw, 640 B
```

With $\vB = 4096$ and the trace's miss rate of 13.4 %, a step at one layer fetches about 274 picks, 175 KB, scattered over the whole orchard. The LLM's output is unchanged by construction: attention reads the same bytes, only their address differs. HiSparse lives on the miss path, road 4 of [[#papers-reading-guide/data-path]], and it is the only paper in this Part that does.

::: figure fig-papers-hisparse-points paHisparsePoints
**Seven numbers from one trace.** Horizontal axis: hot-cache size $\vB$ in pick slots per layer (log scale, base 2). Vertical axis: [[miss-rate-curve|miss rate]], the share of each step's picks not found in the hot cache (log scale), averaged over the first 1 000 decode steps and 78 layers of HiSparse's GLM-5.1 trace. Dots: LRU at three sizes (the one at $\vB = \vk = 2048$ is "keep only the current picks"), FIFO, random replacement and Bélády's clairvoyant policy at 4096 (FIFO and random are nudged sideways so the dots do not overlap). Line: a power law $\vm(\vB) \propto \vB^{-\alpha}$ fitted in log space; solid where there are data, dashed beyond 8192, where it is a guess. The switch chooses which points the line is fitted through. Hover a dot for its source. All dots are their measurement (§4.3, Fig. 6).
:::

::: try
1. Fit through all three LRU points: $\alpha \approx 1.08$. Fit through the two larger caches only: $\alpha = 1.00$ exactly, because 13.4 % → 6.7 % is a clean halving.
2. Read the extrapolation at 16 384 slots in both fits: 3.1 % against 3.3 %. Both are guesses.
3. Compare the dots at 4096: random replacement (16.1 %) is only 2.7 points worse than LRU. Recency helps a little; most of the work is done by the picks themselves repeating.
:::

::: takeaway
- HiSparse keeps the orchard in host memory and a small LRU desk of raw picks on the GPU; it never changes their bytes.
- A miss costs one raw pick on the link and a slot one raw pick of HBM. HiSparse makes misses rarer and leaves both prices alone.
:::

## What they assume {#assume}

The introduction and setup take four things as known, and they are the most reliable part of the paper.

1. **Sparse attention reads little and keeps everything.** The indexer names $\vk$ picks per layer per step; any cherry may be picked at a later step, so none can be dropped ([[#landscape-sparse-attention]]). This is the premise of the whole scenario.
2. **Everything does not fit.** One 128K-token sequence holds 13.09 GB of keys and values in BF16 (§2.3); fetching every pick every step would move about 200 MB per generated token over the link (§2.3). Part III's [[#landscape-memory-wall]] is this arithmetic.
3. **Prefill and decode are separate machines.** The SGLang integration runs on the decode side of a disaggregated deployment ([[#papers-splitzip]] defines the term), with DSA LLMs only, and stores the orchard in BF16.
4. **Picks repeat from step to step.** Treated as an empirical fact to be measured, then measured: the Lucky Louis property.

What it does not assume, anywhere: anything about the bytes inside a pick. Whether neighbouring cherries are alike was never its question.

::: takeaway
- Known in advance: few picks read, all kept, too big for the GPU, BF16, disaggregated serving.
- Assumed about nothing: the bytes inside the picks.
:::

## What they show {#show}

| their measurement | value | where | verifiable? |
|---|---|---|---|
| the trace | GLM-5.1, one LongBenchV2 prompt of 100 384 tokens, 1 799 decode steps, 78 sparse layers, $\vk = 2048$; means over the first 1 000 steps | §4.3 | the setup is stated; the trace is theirs |
| miss rate, keep only the current picks ($\vB = 2048$) | 30 % | §4.3 | a count on one trace |
| miss rate at $\vB = 4096$: LRU / FIFO / random / Bélády | 13.4 / 17.2 / 16.1 / 8.2 % | §4.3, Fig. 6 | counts on one trace |
| miss rate, LRU at $\vB = 8192$ | 6.7 % | §4.3 | a count on one trace |
| BF16 orchard of one 128K-token sequence | 13.09 GB | §2.3 | arithmetic from the LLM's shape; redone |
| traffic if every pick were fetched | ≈ 200 MB per generated token | §2.3 | arithmetic; redone |
| HBM left for orchards on 8 × H200; hot cache per sequence at $\vB = 4096$ | ≈ 240 GB; ≈ 0.4 GB | §2.2, §3.2 | as reported in the first draft; not re-checked |
| peak throughput gain over keeping everything on the GPU | up to 4.7× | abstract | their rig (H200, B200, GH200); not reproducible from here |
| prefetching known picks for LLMs that share one selection across layers | hides about half of the remaining miss time | abstract | their rig |

Where the framing flatters: the 4.7× compares against a baseline that keeps whole orchards in HBM and so runs few sequences at once. The locality numbers are means over 1 000 steps and 78 layers; if a few layers miss far more than the rest, they set the per-layer fetch budget, and "274 misses per layer per step" is an average of unequal things. And the power law is a two-point line: for three evenly spaced points in log space, the least-squares slope is the slope between the ends, $\log_2(30/6.7)/2 = 1.08$. Anything beyond 8192 slots is extrapolation.

One reassurance: the 30 % point is not a different policy. With exactly $\vk$ slots, LRU must hold this step's $\vk$ picks and nothing else, so all three dots belong to one policy.

::: takeaway
- Solid for what they measure: picks repeat (87 % hits at twice $\vk$), and LRU is within 5 points of clairvoyant.
- Narrow in where they were measured: one trace, means only, BF16 only.
:::

## What it says about our scenario {#ours}

**Builds on.**
- The miss path exists and is scattered: 274 picks per layer per step, each decoded alone, is the access pattern that [[#scenario-one-cherry-at-a-time]] strips down to and [[#scenario-the-leash]] writes as a rule.
- The prices it leaves alone are our two levers: cheaper misses and cheaper slots ([[#app-two-levers]]). Bélády at 8.2 % says the third lever, better eviction, is nearly used up.
- The 0.38 ms window per layer and the "decoder ten times faster than the link" rule of [[#landscape-derived-numbers]] both start from its 13.4 % and 30 ms.

**Conflicts with.** Nothing measured in Part VIII, because the campaigns ran no indexer: [[bench|the Bench]] has no pick trace, no miss rate and no $\vk$ ([[#landscape-reference-settings]]). The one tension is of scope: HiSparse's numbers are about *which* picks, and every byte count of Part VIII is about *what* is inside them. Neither can stand in for the other ([[#hypotheses-two-localities]]).

**Suggests.**
- Replay a pick trace against a hot cache and a [[dictionary-shelf]] to find where misses land by stretch, the unmeasured question of [[#hypotheses-heavy-stretches]]; the plan does it with a stand-in indexer ([[#plan-queries-and-picks]], [[#plan-hot-cache-replay]]).
- Their prefetch result for LLMs with one selection per group of layers says that *knowing* the next picks works where *guessing* them did not; a [[victim-tier]] of deltas is the same bet on known picks ([[#app-victim-tier]]).
- Miss rates should not depend on the format; miss bytes halve at 8 bits. That is our assumption behind the Pin's 640-byte pick, not their measurement.

::: theme which-vs-what
Every number HiSparse reports is about which picks the indexer wants. None is about what is inside them. Its 87 % hit rate is strong evidence for the Lucky Louis property and no evidence at all for [[fallen-apple]] or [[echo]] similarity.
:::

::: takeaway
- Builds on: the scattered miss path, the two levers, the 0.38 ms window.
- Conflicts with nothing measured; the Bench has no indexer.
- Suggests: a trace replay by stretch, and a victim tier on known picks.
:::

## Their words, ours {#words}

| their word | ours | where the meanings differ |
|---|---|---|
| KV cache | [[orchard]] | theirs is a cache in name only; it is never pruned, so we call it a store |
| entry, token's KV | [[pick]] (as named by the indexer) / [[cherry]] (as asked for) | one word for two roles; the cherry shape decides how many cherries serve one pick |
| hot device buffer | [[hot-cache]] | the same object; the one real cache in the system |
| request | [[sequence]] | one LLM context from its first token to now |
| offloading | the orchard kept in host memory | nothing is "off"; host memory is where the orchard lives |
| top-k selection, selected tokens | the pick set $\vS$ of $\vk$ picks per layer per step | ours is a set of `(layer_id, token_pos_id)` pairs |
| hit rate 87 % | 1 − miss rate at $\vB = 2\vk$ | the same number, quoted as misses on this site |

::: aside source Receipts
Zhiqiang Xie and co-authors (Stanford), *HiSparse: Scaling Sparse-Attention Decoding with Hierarchical KV Cache Management*, arXiv:2608.07009 (2026). Merged into SGLang; announced on the LMSYS blog in April 2026. Miss rates and policies: §4.3 and Fig. 6 (GLM-5.1 trace, means over the first 1 000 decode steps). Sizes: §2.3 (13.09 GB, ≈ 200 MB per token). HBM budget and hot-cache size per request: §2.2, §3.2, as the first draft reported them, not re-checked. Throughput and the prefetch finding: abstract. Title, authors and headline numbers re-checked against the abstract and public summaries. The 274 misses per layer per step and the 0.38 ms window are our arithmetic ([[#landscape-derived-numbers]]).
:::
