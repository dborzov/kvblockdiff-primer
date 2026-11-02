---
title: 'HiSparse: a library with a reading desk'
nav: HiSparse
group: HiSparse and its hot cache
lede: The production answer to the memory wall keeps every orchard in host memory and gives each sequence, at each layer, a small desk on the GPU managed least-recently-used. You have met this desk before. Its resolve step fits in twelve lines of Python.
cards:
  - q: Where does HiSparse keep each sequence's complete orchard?
    a: In host DRAM, on the CPU side of the link
    wrong: ["In the GPU's HBM", "On disk", "Nowhere; it recomputes old rows"]
    why: Host DRAM is big enough for every orchard. The GPU keeps only a small hot cache per sequence per layer.
    sec: two-tiers
  - q: 'What is $\vB$?'
    a: The number of pick slots in one hot cache, per sequence and per layer
    wrong: ["The number of picks per step", "The number of sequences per GPU", "The bytes of one pick"]
    why: 'With $\vk = 2048$ picks per step, HiSparse found $\vB$ between 4096 and 8192 most useful; its headline numbers use $\vB = 4096$.'
    sec: two-tiers
  - q: When the hot cache is full and a pick is missing, which pick does HiSparse evict?
    a: The least recently used pick that is not in this step's pick set
    wrong: ["The pick with the smallest attention weight", "A random pick", "The oldest token of the sequence"]
    why: 'It is LRU with one guard: nothing the current step needs may be thrown out. In the listing, `next(x for x in hot_cache if x not in S)`.'
    sec: resolve
  - q: Does HiSparse change what the LLM writes?
    a: No; attention reads exactly the same picks, only where they are kept changes
    wrong: ["Yes, slightly, because old rows are approximated", "Yes, it skips some picks to save time", "Only for prompts longer than 128K tokens"]
    why: Every pick is in the hot cache before attention runs, either because it was already there (a hit) or because it was just fetched (a miss).
    sec: resolve
  - q: What does one miss cost in HiSparse?
    a: 'One raw pick of $\ve$ bytes moved over the link'
    wrong: ["Nothing; misses are skipped", "A whole stretch of rows", "One byte per element of the sequence's context"]
    why: 'The hot cache holds raw picks, so a miss fetches the full $\ve$ bytes from host memory into a free or evicted slot.'
    sec: resolve
---

Back to the harbour office of [[#school-caches]]. The forecaster's desk has room for a handful of logbooks; the archive downstairs has them all. She does not fetch her whole archive every morning. She keeps on the desk the logbooks she used most recently. When she needs one that is not there, the lift brings it up, and the logbook she has not touched for longest goes back down.

That was a [[cache]] managed by [[lru|LRU]]. The production system this project builds on is the same desk, built into a GPU.

## Two tiers {#two-tiers}

::: define hisparse
- **What it is.** A system for serving sparse-attention LLMs with long contexts (Xie et al., 2026; part of the SGLang serving software). It keeps each sequence's full [[orchard]] in [[dram|host DRAM]] and a small cache of recently used picks in [[hbm|HBM]].
- **What it promises.** The LLM's outputs are unchanged: attention reads exactly the picks the [[indexer]] named. Only *where rows live* changes. The authors report up to 4.7× more throughput on long contexts (their measurement).
- **What it works with.** Any indexer that names positions per layer per step: DSA, NSA, Quest.
- **Its nickname.** The Two-tier Library: the archive below, the reading desk above.
:::

The desk is the part that matters most to us.

::: define hot-cache
- **What it is.** For each sequence and each KV layer, $\vB$ slots in HBM, each holding one raw [[pick]]: in Python, `hot_cache[(layer_id, token_pos_id)]`, a row of $\ve$ bytes. Picks found there are [[hit-miss|hits]] and are read in place; the others are misses and are fetched from host DRAM over the [[link]].
- **How it is managed.** Least-recently-used, with one guard: a pick named at the current step is never evicted.
- **Typical size.** HiSparse found $\vB$ between $2\vk$ and $4\vk$ (4096 to 8192 slots, with $\vk = 2048$) most useful; its headline numbers use $\vB = 4096$. For GLM-5.1 in BF16 that is $78 \times 4096 \times 1.28$ KB $\approx 0.4$ GB per sequence, instead of 13 GB of orchard at 128K tokens.
- **Easy to confuse with** the orchard, which is the complete store ([[#landscape-orchard/why]]). The hot cache is a small, real cache in front of it, and it keeps the word.
:::

::: figure fig-landscape-system hisparseSystem wide
**HiSparse for one sequence at one layer.** Left: host DRAM holds the full orchard, one raw row of $\ve$ bytes per position. Right: GPU memory holds the indexer, the hot cache of $\vB$ slots, and attention. At each step the indexer names the pick set $\vS$; picks already in the hot cache are hits; each miss is fetched over the link (the arrow) into the slot of an evicted pick. The italic labels give the harbour-office counterpart of each part. Hover any box for details.
:::

::: takeaway
- HiSparse keeps every orchard in host DRAM and, per sequence and per layer, a hot cache of $\vB$ raw picks in HBM, managed by LRU.
- Outputs are unchanged; only where rows live changes.
- In the harbour office: the archive is host DRAM, the desk is the hot cache, the lift is the link.
:::

## The resolve step {#resolve}

At every layer of every decode step, before attention runs, HiSparse makes sure all $\vk$ picks are in the hot cache. In the real system this is one fused GPU routine. In Python it reads like this, with `S` from `indexer_topk` on [[#landscape-sparse-attention]]:

```python HiSparse's resolve step, per sequence, per layer, per decode step
from collections import OrderedDict

def hisparse_resolve(S, hot_cache, B, fetch):
    """S: this layer's picks at this step.
    hot_cache: OrderedDict pick -> raw bytes, least recently used first."""
    hits   = [p for p in S if p in hot_cache]
    misses = [p for p in S if p not in hot_cache]
    for p in misses:
        if len(hot_cache) >= B:                        # full: evict the oldest pick that is NOT wanted now
            victim = next(x for x in hot_cache if x not in S)
            hot_cache.pop(victim)
        hot_cache[p] = fetch(p)                        # one pick over the link: raw, e bytes
    for p in hits:                                     # hits move to the newest end, after the misses
        hot_cache.move_to_end(p)
    return [hot_cache[p] for p in S]                   # the k picks attention will read

# the toy trace of the next page: 16 positions, B = 6 slots, k = 4 picks per step
hot_cache = OrderedDict((p, f"raw{p}") for p in [1, 10, 13, 2, 5, 9])
for S in [[2, 5, 9, 14], [2, 5, 9, 11], [2, 9, 11, 15]]:
    before = list(hot_cache)
    hisparse_resolve(S, hot_cache, B=6, fetch=lambda p: f"raw{p}")
    print(S, "misses:", [p for p in S if p not in before], "hot cache:", list(hot_cache))
# [2, 5, 9, 14] misses: [14] hot cache: [10, 13, 14, 2, 5, 9]
# [2, 5, 9, 11] misses: [11] hot cache: [13, 14, 11, 2, 5, 9]
# [2, 9, 11, 15] misses: [15] hot cache: [14, 5, 15, 2, 9, 11]
```

(The toy keys its hot cache by `token_pos_id` alone, because it is one layer; the real one is keyed by the pick `(layer_id, token_pos_id)`.) In words, each step does four things:

1. **Sort the pick set** into hits (already on the desk) and misses.
2. **Make room** for each miss: if all $\vB$ slots are taken, evict the least recently used pick that this step does not need.
3. **Fetch** each miss from host DRAM: one raw row, $\ve$ bytes, over the link.
4. **Refresh** the hits: move them to the "recently used" end, so they are the last to go.

:::: compare The desk of Part II, and HiSparse's desk
::: col LRU at the harbour office ([[#school-caches]])
- One ask at a time.
- Evict whatever was used longest ago.
:::
::: col HiSparse's resolve step
- A whole pick set of $\vk$ asks at once.
- Evict the oldest pick *not in this set*; the set's misses are fetched first, then its hits are refreshed.
:::
::::

Three details of the real system matter later.

- **One hot cache per sequence *and per layer*.** HiSparse found that coordinating the layers' caches adds little.
- **Misses are read straight from host memory by the GPU itself, one small scattered read per miss.** Even thousands of small scattered reads then run close to the link's full [[bandwidth]].
- **New rows are always present.** Each new token's row is written into a reserved slot on the GPU and copied down to host memory in the background.

So the whole bill of a step is easy to state. A hit costs nothing extra. **A miss costs one raw pick, $\ve$ bytes, on the link.** And every slot of the hot cache costs one raw pick, $\ve$ bytes, of GPU memory: [[@e]] per miss and per slot in the setting selected now. The next page watches these two prices at work on a toy trace.

::: takeaway
- Resolve: split the pick set into hits and misses, evict the least recently used unwanted picks, fetch each miss raw over the link, refresh the hits.
- A miss costs $\ve$ bytes on the link; a slot costs $\ve$ bytes of GPU memory.
:::
