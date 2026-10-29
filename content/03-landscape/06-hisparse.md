---
title: 'HiSparse: a library with a reading desk'
nav: HiSparse
group: HiSparse and its hot cache
lede: The production answer to the memory wall keeps every history in host memory and gives each request, at each layer, a small desk on the GPU managed least-recently-used. You have met this desk before.
cards:
  - q: Where does HiSparse keep each request's complete KV history?
    a: In host DRAM, on the CPU side of the link
    wrong: ["In the GPU's HBM", "On disk", "Nowhere — it recomputes old entries"]
    why: Host DRAM is big enough for every history. The GPU keeps only a small hot cache per request per layer.
    sec: two-tiers
  - q: 'What is $\vB$?'
    a: The number of entry slots in one hot cache, per request and per layer
    wrong: ["The number of selections per step", "The number of requests per GPU", "The bytes of one entry"]
    why: 'With $\vk = 2048$ selections per step, HiSparse found $\vB$ between 4096 and 8192 most useful; its headline numbers use $\vB = 4096$.'
    sec: two-tiers
  - q: When the hot cache is full and a selected entry is missing, which entry does HiSparse evict?
    a: The least recently used entry that is not selected at this step
    wrong: ["The entry with the smallest attention weight", "A random entry", "The oldest token of the request"]
    why: 'It is LRU with one guard: nothing the current step needs may be thrown out.'
    sec: resolve
  - q: Does HiSparse change what the model writes?
    a: No — attention reads exactly the same entries; only where they are kept changes
    wrong: ["Yes, slightly, because old entries are approximated", "Yes, it skips some selections to save time", "Only for prompts longer than 128K tokens"]
    why: Every selected entry is in the hot cache before attention runs, either because it was already there (a hit) or because it was just fetched (a miss).
    sec: resolve
  - q: 'What does one miss cost in HiSparse?'
    a: 'One raw entry of $\ve$ bytes moved over the link'
    wrong: ["Nothing — misses are skipped", "A whole block of entries", "One byte per number of the request's context"]
    why: 'The hot cache holds raw entries, so a miss fetches the full $\ve$ bytes from host memory into a free or evicted slot.'
    sec: resolve
---

Back to the harbour office of [[#school-caches]]. The forecaster's desk has room for a handful of logbooks; the archive downstairs has them all. She does not fetch her whole archive every morning. She keeps on the desk the logbooks she used most recently. When she needs one that is not there, the lift brings it up, and the logbook she has not touched for longest goes back down.

::: dataset fig-landscape-storm storm-morning view=raster hl=lru metrics=n,distinct,lru4,fifo4
**The storm morning of II.21, once more.** *Plot:* one row per logbook, one column per request, in the order the forecaster asked; the highlighted requests are the misses of a 4-slot desk under LRU (switch the highlight to FIFO to compare, or to the first requests). *Table:* every request, with whether it hits under each policy. *Numbers:* the morning's size and the misses of each policy. Hand-made toy data.
:::

Ten trips of the lift for 24 requests, and eight of them were first fetches that no desk could avoid. Keep the picture in mind: on the next page HiSparse's toy trace is drawn the same way, with stored positions in place of logbooks.

That was a [[cache]] managed by [[lru|LRU]]. The production system this project builds on is the same desk, built into a GPU.

## Two tiers {#two-tiers}

::: define hisparse
- **What it is.** A system for serving sparse-attention models with long contexts (Xie et al., 2026; part of the SGLang serving software). It keeps each request's full KV history in [[dram|host DRAM]] and a small cache of recently used entries in [[hbm|HBM]].
- **What it promises.** Model outputs are unchanged: attention reads exactly the entries the [[indexer]] selected. Only *where entries live* changes. The authors report up to 4.7× more throughput on long contexts.
- **What it works with.** Any selector that names positions per layer per step — DSA, NSA, Quest.
- **Its nickname.** The Two-tier Library: the archive below, the reading desk above.
:::

The desk is the part that matters most to us.

::: define hot-cache
- **What it is.** For each request and each [[layer]], $\vB$ slots in HBM, each holding one raw [[entry]]. Selected entries found there are [[hit-miss|hits]] and are read in place; the others are misses and are fetched from host DRAM.
- **How it is managed.** Least-recently-used, with one guard: an entry selected at the current step is never evicted.
- **Typical size.** HiSparse found $\vB$ between $2\vk$ and $4\vk$ (4096 to 8192 slots, with $\vk = 2048$) most useful; its headline numbers use $\vB = 4096$. For GLM-5.1 in BF16 that is $78 \times 4096 \times 1.28$ KB $\approx 0.4$ GB per request — instead of 13 GB of history at 128K tokens.
- **Easy to confuse with** the *KV cache*, which on this site means the complete store (see [[#landscape-kv-cache/why]]). The hot cache is a small, real cache in front of it.
:::

::: figure fig-landscape-system hisparseSystem wide
**HiSparse for one request at one layer.** Left: host DRAM holds the full history, one raw entry of $\ve$ bytes per position. Right: GPU memory holds the indexer, the hot cache of $\vB$ entry slots, and attention. At each step the indexer names the set $\vS_{\vt}$; selected entries already in the hot cache are hits; each miss is fetched over the PCIe link (the arrow) into the slot of an evicted entry. The italic labels give the harbour-office counterpart of each part. Hover any box for details.
:::

::: takeaway
- HiSparse keeps every history in host DRAM and, per request and per layer, a hot cache of $\vB$ raw entries in HBM, managed by LRU.
- Outputs are unchanged; only where entries live changes.
- In the harbour office: the archive is host DRAM, the desk is the hot cache, the lift is the PCIe link.
:::

## The resolve step {#resolve}

At every layer of every decode step, before attention runs, HiSparse makes sure all $\vk$ selected entries are in the hot cache. In the real system this is one fused GPU routine. In Python it reads like this:

```python HiSparse's resolve step, per request, per layer, per decode step
from collections import OrderedDict

def hisparse_resolve(S, cache, B, fetch):
    """S: the indexer's selection for this step.
    cache: OrderedDict position -> entry, least recently used first."""
    hits   = [p for p in S if p in cache]
    misses = [p for p in S if p not in cache]
    for p in misses:
        if len(cache) >= B:
            # full: evict the oldest entry that is NOT selected now
            victim = next(v for v in cache if v not in S)
            cache.pop(victim)
        cache[p] = fetch(p)      # e bytes over the link, one scattered read
    for p in hits:               # hits move to the newest end, after the misses
        cache.move_to_end(p)
    return [cache[p] for p in S] # the k entries attention will read

# the toy trace of the next page: 16 positions, B = 6 slots, k = 4 per step
cache = OrderedDict((p, f"E{p}") for p in [1, 10, 13, 2, 5, 9])
for S in [[2, 5, 9, 14], [2, 5, 9, 11], [2, 9, 11, 15]]:
    before = list(cache)
    hisparse_resolve(S, cache, B=6, fetch=lambda p: f"E{p}")
    print(S, "misses:", [p for p in S if p not in before],
          "cache:", list(cache))
# [2, 5, 9, 14] misses: [14] cache: [10, 13, 14, 2, 5, 9]
# [2, 5, 9, 11] misses: [11] cache: [13, 14, 11, 2, 5, 9]
# [2, 9, 11, 15] misses: [15] cache: [14, 5, 15, 2, 9, 11]
```

In words, each step does four things:

1. **Sort the selection** into hits (already on the desk) and misses.
2. **Make room** for each miss: if all $\vB$ slots are taken, evict the least recently used entry that this step does not need.
3. **Fetch** each miss from host DRAM: one raw entry, $\ve$ bytes, over the link.
4. **Refresh** the hits: move them to the "recently used" end, so they are the last to go.

:::: compare The desk of Part II, and HiSparse's desk
::: col LRU at the harbour office ([[#school-caches]])
- One request at a time.
- Evict whatever was used longest ago.
:::
::: col HiSparse's resolve step
- A whole batch of $\vk$ requests (the selection) at once.
- Evict the oldest entry *not in this batch*; the batch's misses are fetched first, then its hits are refreshed.
:::
::::

Three details of the real system matter later.

- **One hot cache per request *and per layer*.** HiSparse found that coordinating the layers' caches adds little.
- **Misses are read straight from host memory by the GPU's own threads.** Even thousands of small scattered reads then run close to the link's full [[bandwidth]].
- **New entries are always present.** Each new token's entry is written into a reserved slot on the GPU and copied down to host memory in the background.

So the whole bill of a step is easy to state. A hit costs nothing extra. **A miss costs one raw entry, $\ve$ bytes, on the link.** And every slot of the hot cache costs one raw entry, $\ve$ bytes, of GPU memory. The next page watches these two prices at work on a toy trace.

::: takeaway
- Resolve: split the selection into hits and misses, evict the least recently used unselected entries, fetch each miss raw over the link, refresh the hits.
- A miss costs $\ve$ bytes on the link; a slot costs $\ve$ bytes of GPU memory.
:::
