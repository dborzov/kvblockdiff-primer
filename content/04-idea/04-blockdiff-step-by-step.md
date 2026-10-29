---
title: kv-blockdiff, step by step
nav: kv-blockdiff, step by step
lede: HiSparse's resolve step is a dozen lines of Python. kv-blockdiff adds one small shelf of dictionaries and one question per miss. Here is the whole mechanism, in code you can run.
group: The idea
cards:
  - q: What is the dictionary cache?
    a: A per-layer set of n_D block dictionaries kept in GPU memory next to the hot cache
    wrong: ["A second hot cache of raw entries", "The host-memory copy of every dictionary", "A cache of the indexer's selections"]
    why: The hot cache of raw entries stays exactly as in HiSparse; the dictionary cache is the one structure kv-blockdiff adds.
    sec: shelf
  - q: A selected entry is not in the hot cache, and its block's dictionary is on the GPU. What crosses the link?
    a: Only its delta, ρ·e bytes — a δ-miss
    wrong: ["The raw entry, e bytes", "The dictionary, w·e bytes", "Nothing — it counts as a hit"]
    why: The GPU rebuilds the raw entry from the delta and the resident dictionary, then places it in the hot cache as usual.
    sec: two-misses
  - q: When is a miss a raw miss?
    a: When its block's dictionary is not resident on the GPU
    wrong: ["When the entry has never been selected before", "When the hot cache is full", "When the delta is larger than the entry"]
    why: Without the dictionary the delta cannot be decoded, so the raw entry is fetched, exactly as in HiSparse.
    sec: two-misses
  - q: 'With $\vfD = 0.85$ and $\vrho = 0.75$, what does an average miss move, for 640-byte entries?'
    a: About 504 bytes
    wrong: ["About 480 bytes", "About 408 bytes", "Exactly 640 bytes"]
    why: '$\ve\,[\vfD\vrho + (1-\vfD)] = 640 \times (0.6375 + 0.15) = 504$ bytes. Raw misses keep the average well above $\vrho\,\ve = 480$.'
    sec: two-misses
  - q: What decides the δ-miss fraction $\vfD$?
    a: The residency policy for dictionaries and where the misses land
    wrong: ["The size of each delta", "The number of layers", "The precision of the entries"]
    why: A miss is a δ-miss only if its block's dictionary is on the shelf, so f_D depends on which blocks the misses fall into and which dictionaries the policy keeps.
    sec: two-misses
---

[[#landscape-hisparse]] wrote HiSparse's per-layer resolve step in a dozen lines: find the hits, evict for each miss, fetch each miss raw, promote the hits. The simplest variant of kv-blockdiff keeps every one of those lines. It adds one structure and one question.

## One shelf next to the hot cache {#shelf}

The added structure lives in GPU memory, next to the [[hot-cache]], one per request per layer.

::: define dictionary-cache
- **What it is:** the [[dictionary|dictionaries]] of $\vnD$ [[block|blocks]], kept in GPU memory for one request at one layer. $\vnD$ is a knob, like the hot-cache size $\vB$.
- **Example:** in the toy trace of the next page, $\vnD = 2$: the shelf holds the dictionaries of two of the four blocks at any moment.
- **Easy to confuse with:** the hot cache. The hot cache holds raw [[entry|entries]] (which ones are *wanted*); the dictionary cache holds the side information needed to *decode* deltas. Both live on the GPU; they answer different questions.
:::

Which dictionaries go on the shelf? That is a residency policy, and it is a design choice to be studied. The toy policy used on these pages is deliberately simple: **after each step, keep the dictionaries of the $\vnD$ blocks that own the most entries in the hot cache.** Blocks that are busy now are likely to be busy next step.

Here is the whole resolve step. It runs as written; the last lines replay the toy trace of [[#landscape-toy-trace]].

```python HiSparse's resolve step plus a dictionary cache, for one request and one layer
from collections import Counter

def blockdiff_resolve(S, cache, dcache, B, n_D, b):
    """One layer, one step. cache: list of positions, oldest first. dcache: set of blocks."""
    hits   = [p for p in S if p in cache]
    misses = [p for p in S if p not in cache]
    cost = {"raw": [], "delta": [], "loads": []}
    for p in misses:
        if len(cache) >= B:                                   # evict the oldest entry not selected now
            cache.remove(next(v for v in cache if v not in S))
        kind = "delta" if p // b in dcache else "raw"        # is the dictionary of p's block resident?
        cost[kind].append(p)                                  # delta: rho*e bytes; raw: e bytes
        cache.append(p)
    for p in hits:                                            # hits move to the newest end
        cache.remove(p); cache.append(p)
    # toy residency policy: keep the dictionaries of the n_D blocks with most hot entries
    count = Counter(p // b for p in cache)
    keep = sorted(count, key=lambda j: (-count[j], j not in dcache, j))[:n_D]
    cost["loads"] = sorted(set(keep) - dcache)                # each load moves w*e bytes
    dcache.clear(); dcache.update(keep)
    return cost

cache, dcache = [1, 10, 13, 2, 5, 9], {0, 2}                 # the toy trace of III.7
for S in [[2, 5, 9, 14], [2, 5, 9, 11], [2, 9, 11, 15]]:
    print(blockdiff_resolve(S, cache, dcache, B=6, n_D=2, b=4), sorted(dcache))
```

It prints one line per step: `{'raw': [14], 'delta': [], 'loads': [3]} [2, 3]`, then `{'raw': [], 'delta': [11], 'loads': []} [2, 3]`, then `{'raw': [], 'delta': [15], 'loads': []} [2, 3]`. The next page animates exactly this.

::: aside reminder What HiSparse's resolve step does
For each layer of each request, at each decode step: the [[indexer]] hands over a set $\vS$ of $\vk$ positions. Positions already in the hot cache are hits. Each miss evicts the oldest resident entry that is not selected right now ([[lru]] with a guard) and is fetched from host memory. Hits then move to the newest end. See [[#landscape-hisparse]].
:::

::: takeaway
- kv-blockdiff keeps HiSparse's resolve step line for line and adds a dictionary cache of $\vnD$ dictionaries per layer.
- A residency policy decides which dictionaries sit on the shelf; the toy policy keeps the blocks with the most hot entries.
:::

## Two kinds of miss {#two-misses}

The one new question is asked once per miss: *is the dictionary of this entry's block on the shelf?*

```graph
id: idea-miss-flow
columns: [A miss, The one question, What crosses the link]
nodes:
  - {id: miss, col: 1, row: 1, title: "Entry t misses", text: "The indexer selected it, and it is not among the hot cache's raw entries.", term: hot-cache}
  - {id: q, col: 2, row: 1, title: "Is its block's dictionary on the GPU?", text: "Look up block j = t div b in the dictionary cache.", term: dictionary-cache}
  - {id: dm, col: 3, row: 1, title: "Yes: a δ-miss", text: "Fetch the delta, rebuild the entry on the GPU, place it in the hot cache.", term: delta-miss}
  - {id: rm, col: 3, row: 2, title: "No: a raw miss", text: "Fetch the raw entry, exactly as HiSparse does today.", term: raw-miss}
edges:
  - [miss, q]
  - [q, dm, "yes"]
  - [q, rm, "no"]
```

::: define delta-miss
- **What it is:** a hot-cache miss whose block dictionary is resident. Only the delta crosses the link: $\vdsz = \vrho\,\ve$ bytes. The GPU decodes it and places the raw entry in the hot cache as usual.
- **Example:** step 2 of the toy trace: entry 11 misses, block 2's dictionary is on the shelf, so 480 bytes travel instead of 640 (at an assumed $\vrho = 0.75$).
- **Easy to confuse with:** a hit. A δ-miss still crosses the link; it just carries fewer bytes.
:::

::: define raw-miss
- **What it is:** a hot-cache miss whose block dictionary is *not* resident (a "cold" block). The raw entry crosses the link, $\ve$ bytes, exactly as in HiSparse.
- **Example:** step 1 of the toy trace: entry 14 misses in block 3, whose dictionary is not on the shelf.
- **Easy to confuse with:** a failure. A raw miss is never worse than today; it just does not profit.
:::

How many misses profit is one number, the [[=delta-miss-fraction|δ-miss fraction]] $\vfD$: the share of misses that are δ-misses. An average miss then moves

$$
\ve\,\Big[\underbrace{\vfD\,\vrho}_{\text{δ-misses: } \vrho\ve \text{ each}} + \underbrace{(1-\vfD)}_{\text{raw misses: } \ve \text{ each}}\Big] \quad \text{bytes, plus the occasional dictionary load.}
$$ {#eq-idea-miss-bytes}

::: figure fig-idea-miss-cost missCost
**What an average miss moves.** Horizontal axis: the δ-miss fraction $\vfD$, from no δ-misses (0 %) to all (100 %). Vertical axis: bytes per miss, for entries of $\ve = 640$ bytes. The dashed line is HiSparse, where every miss is raw. The solid line is kv-blockdiff at the chosen delta ratio $\vrho$; the handle marks the chosen $\vfD$ (drag it, or use the sliders). Tiles: the average bytes per miss, the bytes per layer per step at the reference setting's 274 misses ([[#landscape-derived-numbers]]), and the traffic relative to HiSparse. Dictionary loads are not included here. $\vrho$ and $\vfD$ are assumed inputs.
:::

::: try
1. Set $\vfD$ to 50 %. Half the misses profit, and traffic drops by only half of what $\vrho$ promises.
2. Set $\vrho = 0.3$ and $\vfD = 0.5$. The raw half now dominates: 65 % of HiSparse's traffic, though a delta is under a third of an entry.
:::

So two numbers set the gain, and they come from different places. $\vrho$ comes from the *bytes* — how predictable entries are from their block's dictionary. $\vfD$ comes from the *traffic* — where misses land and which dictionaries the policy keeps. [[#idea-heavy-blocks]] is about the second.

::: theme side-info
The third lesson of the trained dictionary ([[#tiny-files-three-lessons]]) becomes a branch in the code: "does the receiver have the dictionary?" is asked at every miss, and the answer decides between a delta and a raw entry.
:::

::: takeaway
- δ-miss: dictionary resident, move $\vrho\,\ve$. Raw miss: dictionary cold, move $\ve$, as today.
- An average miss moves $\ve\,[\vfD\vrho + (1-\vfD)]$ bytes, plus dictionary loads.
- $\vrho$ is about the bytes; $\vfD$ is about where misses land. Both must be good.
:::
