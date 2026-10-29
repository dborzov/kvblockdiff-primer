---
title: 'Wave 2: simulating the indexer'
nav: 'Wave 2: the indexer'
group: 'Wave 2'
lede: Our proxy model has no sparse indexer. For the statistics wave 2 needs, attention itself can play the part — and a recorded list of its choices can be replayed through any cache we like.
cards:
  - q: How does wave 2 get sparse selections from a model without a trained indexer?
    a: It takes the exact attention ranking — for each decode step and layer, the top-k positions by attention probability summed over heads
    wrong: ["It trains a DSA indexer on the proxy model", "It picks k random positions", "It selects the k most recent tokens"]
    why: The DSA indexer is trained to approximate attention's own ranking, so the exact ranking is a fair stand-in for block-level statistics.
    sec: exact
  - q: What is trace replay?
    a: Recording the selection of every decode step, then re-running the hot cache and the dictionary cache on that list
    wrong: ["Re-running the model's prefill", "Replaying the network traffic of a server", "Decoding the deltas a second time to check them"]
    why: Caches only need to know which entries are wanted, in which order. A recorded trace lets every cache size and policy be tried without a GPU kernel.
    sec: replay
  - q: In the replay, when is a miss counted as a δ-miss?
    a: When the dictionary of the missed entry's block is already resident at the moment of the miss
    wrong: ["When the entry was ever in the hot cache before", "When the block is among the heaviest after the step", "Always, if the block has a dictionary"]
    why: Dictionaries are loaded after the step's misses, for future steps. A miss is cheap only if its dictionary was already on the GPU.
    sec: replay
  - q: What did the source's replay code leave undefined?
    a: The residency policy — the function choosing which block dictionaries to keep (top_blocks_by_resident_count)
    wrong: ["The LRU eviction of entries", "The miss counter", "The block index of a position"]
    why: The harness implements two policies — the heaviest blocks in the hot cache, and an LRU of blocks hit by a miss — because the policy is what framework C compares.
    sec: replay
---

A flight simulator does not need a real aeroplane, only a faithful record of how one responds. Wave 2 needs something similar: a record of which [[entry|entries]] a sparse-attention model would select at every decode step. The [[proxy-model|proxy model]] has no trained [[indexer]], so we build the record from attention itself.

## Exact top-k as a stand-in {#exact}

The [[dsa|DSA]] indexer is trained to approximate attention's own ranking of past tokens. So for the *statistics* wave 2 needs — how selections cluster into blocks, how long a block stays wanted — the exact ranking is a fair stand-in.

1. Treat the last 4K tokens of each evaluation sequence as the decode window (their query vectors are in the dump, [[#plan-data]]).
2. For each decode position $\vt$ and each full-attention layer: compute each head's attention probabilities over all positions before $\vt$, and sum them over heads.
3. Take the top $\vk = 2048$ positions. That is the selection $\vS_{\vt}$ of this step and layer.

The real indexer also always keeps a sliding window of recent tokens and the first few tokens. Those are always resident, so they change neither the miss path nor the block statistics, and are left out.

```python the proxy indexer for one step (analysis/plan_harness.py)
def exact_topk(Q, K, k):
    """The proxy indexer for one decode step and layer: attention probabilities of each query head
    over all earlier positions, summed over heads; the k most-attended positions are the selection S.
    Q: (heads, dk) queries; K: (positions, dk) keys (one KV head shared, for brevity)."""
    s = Q @ K.T / np.sqrt(K.shape[1])
    p = np.exp(s - s.max(axis=1, keepdims=True))
    p /= p.sum(axis=1, keepdims=True)
    return np.argpartition(-p.sum(axis=0), k - 1)[:k]
```

The cost is modest: for a 32K context and 4K decode steps, the scores are a $4\text{K} \times 32\text{K}$ matrix per head and layer — seconds on a GPU, minutes on a CPU.

What a trace looks like depends on the keys. The figure plays the same game on synthetic keys that carry a "topic" per block.

::: figure fig-plan-selections planSelections
**Selections of an exact top-k indexer, step by step.** Synthetic: 4096 positions in 16 blocks of 256; each key is its block's topic vector (times the strength) plus noise, 16 dimensions; four query heads drift by the chosen amount per step; each of 300 steps selects the top $\vk = 128$ positions by attention probability summed over heads. Each cell shades how many selections fall into 64 positions × 5 steps (darker = more). Thin lines are block boundaries. The readout gives the average share of a step's selections held by its heaviest 1, 2 and 4 blocks, and how long the heaviest block stays heaviest. Seeded; the same generator feeds the next page.
:::

::: try
1. Set the topic strength to 0. No block is special, yet the top block still holds about 11 % of the selections (an even spread would give 6 %): random keys line up with the queries by chance.
2. Raise it to 2. Dark columns appear: the four heaviest blocks hold almost 90 % of the selections — [[heavy-block|heavy blocks]].
3. Change the drift. At 0.05 the heaviest block stays heaviest for about 75 steps; at 0.4, for under 6. Concentration and lifetime are different things.
:::

::: takeaway
- The proxy indexer is exact attention: per step and layer, the top-k positions by probability summed over heads.
- It is a stand-in for statistics, not for exact miss rates; those are calibrated against HiSparse's.
- Whether selections cluster into blocks depends on the keys — which is what wave 2 measures on real ones.
:::

## Replay {#replay}

::: define trace-replay
- **What it is:** record the selection $\vS_{\vt}$ of every decode step, then re-run the [[hot-cache|hot cache]] and the [[dictionary-cache|dictionary cache]] on that list.
- **Why it works:** a cache only needs to know which entries are wanted, in which order. Any size, any policy can be tried in seconds, without a GPU kernel.
- **What it cannot see:** timing. Replay counts misses and loads; how long they take is the cost model's job.
:::

Trace replay is the game of [[#school-caches]], played at a larger scale. There the forecaster's morning was a list of 24 requests for 8 logbooks, and a desk of 4 slots was run over it, request by request.

::: dataset fig-plan-storm-replay storm-morning view=raster,reuse hl=lru metrics=n,distinct,lru4,fifo4,belady4
**The storm morning: a trace, replayed.** The forecaster's 24 requests for 8 station logbooks, in order (II.21–II.22): one row per logbook, one column per request. Highlighted: the requests that miss on an LRU desk of 4 slots. *With reuse distances* joins each repeat to the previous request for the same logbook. *Numbers:* the misses of three replacement rules, replayed on the same list. Made-up data.
:::

Wave 2 plays it with the indexer's selections. A logbook becomes an entry, one request becomes one decode step's selection, and the desk becomes HiSparse's hot cache — with a second, smaller desk beside it for block dictionaries.

The source sketched the replay; the harness version runs. It keeps HiSparse's token cache — [[lru|LRU]], never evicting an entry the current step needs — and adds a per-layer LRU of $\vnD$ block dictionaries.

```python token LRU plus dictionary LRU (analysis/plan_harness.py)
def heaviest_blocks(cache, b, n_D):
    """Residency policy 1: the n_D blocks with the most entries in the hot cache right now."""
    counts = {}
    for p in cache:
        counts[p // b] = counts.get(p // b, 0) + 1
    return sorted(counts, key=lambda j: -counts[j])[:n_D]


def replay(selections, B, b, n_D, policy="heaviest"):
    """Token LRU of B entries (HiSparse's hot cache) plus an LRU of n_D block dictionaries per layer.
    Returns the miss rate m, the delta-miss fraction f_D and the dictionary loads per step n_load."""
    cache, dcache = OrderedDict(), OrderedDict()
    misses = total = dmisses = loads = 0
    for S in selections:
        S = set(int(p) for p in S)
        new = [p for p in S if p not in cache]
        for p in S.difference(new):
            cache.move_to_end(p)                         # hits become the most recently used
        for p in new:                                    # misses: evict the LRU entry not needed now
            if len(cache) >= B:
                del cache[next(v for v in cache if v not in S)]
            cache[p] = None
            if p // b in dcache:                         # its dictionary is on the GPU: a delta-miss
                dmisses += 1
                dcache.move_to_end(p // b)
        wanted = heaviest_blocks(cache, b, n_D) if policy == "heaviest" else [p // b for p in new]
        for j in dict.fromkeys(wanted):                  # policy 2 ("lru"): blocks touched by a miss
            if j in dcache:
                dcache.move_to_end(j)
                continue
            loads += 1
            if len(dcache) >= n_D:
                dcache.popitem(last=False)
            dcache[j] = None
        misses += len(new)
        total += len(S)
    return misses / total, dmisses / max(misses, 1), loads / len(selections)
```

What differs from the source's sketch:

- **The residency policy exists.** The source called `top_blocks_by_resident_count` without defining it. The harness has two policies, because comparing them is part of framework C: keep the **heaviest blocks** of the hot cache, or keep an **LRU of blocks hit by a miss**.
- **A δ-miss needs its dictionary already resident.** Loads happen after the step's misses and serve later steps — no free lunch for the step that triggered them.
- **Names follow the site:** the loads per step per layer are $\vnload$ (the source's $d_L$), the δ-miss fraction is $\vfD$.

Here is the synthetic trace of [[#fig-plan-selections]], at its default settings, replayed.

::: dataset fig-plan-trace-replay plan-trace view=heat,misses hl=switch metrics=n,top,life,miss,fd,nload
**The rehearsal trace, replayed.** *Blocks by step:* 300 decode steps (columns) by 16 blocks of 256 positions (rows); the shade counts how many of the step's 128 selections fall in the block. Thin grey bars mark the 4 block dictionaries resident after each step (heaviest-blocks policy); the highlight marks the steps where the heaviest block changes. Hover for the counts. *Misses per step:* token misses with a hot cache of 256 entries, and the δ-misses among them. *Table:* one row per step (the row number is the step): the heaviest block and its share, the share of the top 4 blocks, how many blocks the step touches, and the misses (hot cache of 256), δ-misses and dictionary loads. Topic strength 1.5, query drift 0.15; a seeded JavaScript twin of the harness's own test. Synthetic data: the shape of the measurement, not its result.
:::

On this trace the replay behaves as framework C expects. The token miss rate falls from 8.7 % to 2.6 % to 2.0 % as the hot cache grows from $\vk$ to $2\vk$ to $4\vk$. With $\vB = 2\vk$ the δ-miss fraction rises from 19 % with one resident dictionary to 52 % with four and 87 % with sixteen, at 0.04 loads per step with four. The harness's numpy run of the same recipe draws other random numbers and prints 8.8, 2.9 and 2.2 %, then 10, 41 and 88 % at 0.13 loads per step: the same shape. Synthetic numbers, a check that the code has the right shape — not a prediction.

::: theme which-vs-what
Replay is pure "which": it never looks inside an entry. Whether the entries it moves are compressible is wave 1's question; whether the right dictionaries are on the GPU when they are needed is this one.
:::

::: takeaway
- Trace replay re-runs HiSparse's token LRU plus a dictionary LRU on recorded selections.
- The harness implements the residency policy the source left undefined, in two variants to compare.
- A miss is a δ-miss only if its block's dictionary was already resident.
:::
