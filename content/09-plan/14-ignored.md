---
title: Ignored on purpose
nav: Ignored on purpose
group: Honest edges
lede: A map that shows everything is as big as the country and just as useless. Here is what the plan leaves off its map, why that is safe for now, and what would make it unsafe.
cards:
  - q: Why can wave 1 ignore speculative decoding and multi-token prediction?
    a: They change how many selections happen per step, not what one miss costs
    wrong: ["Because they make KV caches smaller", "Because they disable sparse attention", "Because they are lossy"]
    why: The coder works per entry; more selections per step scale the traffic, not the delta size.
    sec: list
  - q: Why is a block-scaled number format (shared exponents per block) not a new problem?
    a: A per-block scale is just another tiny dictionary — about two bytes per block
    wrong: ["Because it is always lossy", "Because GPUs do not support it", "Because it removes all redundancy"]
    why: The same accounting applies; the scale is charged like any other dictionary byte.
    sec: list
  - q: Why are better eviction policies left out?
    a: They are bounded — Bélády's optimum is only a few points better than LRU — and orthogonal to coding
    wrong: ["Because LRU is optimal", "Because eviction does not affect misses", "Because they need a GPU kernel"]
    why: Even a perfect eviction policy would leave most misses; cheaper misses help whichever policy is used.
    sec: list
  - q: Which ignored item is the riskiest, in our reading?
    a: MLA latents — the real target — which are already a learned low-rank projection, so the transform rungs may find less there
    wrong: ["Sink tokens", "The parallelism layout", "Speculative decoding"]
    why: The ladder applies unchanged, but the statistics may not transfer. That is a measurement, scheduled for later.
    sec: list
---

In a story by Borges, the cartographers of an empire draw a map at the scale of one mile to the mile. It covers the empire exactly, and is abandoned. A useful plan is a map with most things left off — on purpose, and with a note saying why each omission is safe.

## The list {#list}

Grouped by the reason each omission is safe:

| why it is safe | ignored | the reason, and what would break it |
|---|---|---|
| **same shape, maybe other statistics** | [[mla\|MLA]]; the CSA, HCA and NSA forms of compressed attention | The cached unit is still a fixed-size vector per layer per (compressed) position, so the ladder applies unchanged. Only the statistics may differ — a transfer check, later. |
| | block-scaled formats (NVFP4-style shared exponents) | A per-block scale is just another two-byte dictionary, charged by the same rule. |
| **changes how many, not how much** | speculative decoding, multi-token prediction | More selections per step, not a different cost per miss. |
| | sink tokens and the sliding window | Always resident under DSA; they change neither the miss path nor the block statistics. |
| | better eviction policies | Bounded: [[belady\|Bélády]] beats LRU by only about 5 points of miss rate ([[#landscape-lucky-louis]]); orthogonal to what a miss costs. |
| **accounting simplifications** | the parallelism layout | Per-GPU accounting with one link per GPU. |
| | hardware beyond three numbers | Link bandwidth, HBM for KV, decoder throughput. Everything else is noise at this stage. |
| **later phases** | kernels | Phase 2. The fixed-length format fixes the decoder's shape in advance: a gather, an add, an escape fix-up. |

Our read on the riskiest line: **MLA**. It is the real target, and its latents are already a learned low-rank projection of the hidden state. The [[klt|KLT]] rung may find much less there than in a plain attention layer, and [[loc]] might be all that is left. The ladder does not change; its answer might.

::: theme access-pattern
Every item on this list was judged by one question: does it change what a single miss must fetch and decode? If not, it can wait.
:::

::: takeaway
- Omissions are safe when they change the count of misses, not the cost of one; or the statistics, not the method.
- MLA is the omission most likely to change the answer, though not the method.
:::

## Explicitly later {#later}

Some things are not ignored but postponed, each waiting on a specific result.

```graph
id: plan-later
columns: ["Needs wave 1 + 2", "Needs a decoder", "Needs more data"]
nodes:
  - {id: kern, col: 1, row: 1, title: "CUDA decode kernel", text: "Measured throughput of the fixed-length format: gather, add, escape fix-up.", link: homework-break-even, term: fixed-length-rate}
  - {id: refresh, col: 1, row: 2, title: "Dictionary refresh", text: "Generated tokens join the newest block: refit every b tokens, or inherit.", term: block}
  - {id: victim, col: 2, row: 1, title: "Victim tier", text: "Evicted entries kept as deltas on the GPU.", link: missed-victim-tier, term: victim-tier}
  - {id: lever2, col: 2, row: 2, title: "Lever 2 proper", text: "The decoder fused into the attention gather; the hot cache itself holds deltas.", link: idea-two-levers, term: lever}
  - {id: mla, col: 3, row: 1, title: "MLA latents", text: "Does the ladder's answer transfer to the real target?", term: mla}
  - {id: xl, col: 3, row: 2, title: "Cross-layer dictionaries", text: "Only if upstairs similarity is real.", link: idea-upstairs, term: upstairs}
edges:
  - [kern, victim, "enables"]
  - [victim, lever2, "then"]
  - [refresh, lever2]
  - [mla, xl]
```

- **A CUDA decode kernel** and its measured throughput. The fixed-length format makes it a gather, an add and an escape fix-up — the shape of SplitZip's decoder.
- **The [[victim-tier|victim tier]]**, then **the second [[lever]] proper**: the decoder fused into the attention gather, so the hot cache itself can hold deltas.
- **Dictionary refresh for generated tokens.** New tokens join the newest block during decoding; its dictionary is refit every $\vb$ tokens, or inherits the previous block's. Wave 1 measures prefill tokens only.
- **Transfer to MLA latents** and to **cross-layer dictionaries**, the latter only if [[upstairs|upstairs similarity]] is real.

::: takeaway
- Kernels, the victim tier and lever 2 wait for a "go" and a measured $\vrho$.
- Refresh, MLA and cross-layer dictionaries wait for data the first waves do not collect.
:::
