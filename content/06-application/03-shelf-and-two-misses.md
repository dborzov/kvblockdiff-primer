---
title: The shelf, and two kinds of miss
nav: The shelf and two misses
group: The mechanism
lede: HiSparse's resolve step is a dozen lines of Python. kvblockdiff adds one small shelf of dictionaries and one question per miss. Here is the whole mechanism, in code you can run, and the one number that says how often the question is answered yes.
cards:
  - q: What is the dictionary shelf?
    a: 'A per-sequence, per-layer set of $\vnD$ punnet dictionaries kept in GPU memory next to the hot cache'
    wrong: ["A second hot cache of raw picks", "The host-memory copy of every dictionary", "A cache of the indexer's picks"]
    why: The hot cache of raw picks stays exactly as in HiSparse; the shelf is the one structure kvblockdiff adds.
    sec: shelf
  - q: A pick is not in the hot cache, and its stretch's dictionary is on the shelf. What crosses the link?
    a: 'Only its delta, $\vrho\,\ve$ bytes on average: a δ-miss'
    wrong: ["The raw pick, e bytes", "The dictionary, w·e bytes", "Nothing; it counts as a hit"]
    why: The GPU rebuilds the pick from the delta and the resident dictionary, then places it in the hot cache as usual.
    sec: two-misses
  - q: When is a miss a raw miss?
    a: When its stretch's dictionary is not on the shelf
    wrong: ["When the pick has never been picked before", "When the hot cache is full", "When the delta is larger than the cherry"]
    why: Without the dictionary the delta cannot be decoded, so the raw pick is fetched, exactly as in HiSparse.
    sec: two-misses
  - q: 'With $\vfD = 0.85$ and $\vrho = 0.665$, what does an average miss move, for 640-byte cherries?'
    a: About 458 bytes
    wrong: ["About 426 bytes", "About 544 bytes", "Exactly 640 bytes"]
    why: '$\ve\,[\vfD\vrho + (1-\vfD)] = 640 \times (0.565 + 0.15) \approx 458$ bytes. Raw misses keep the average above $\vrho\,\ve = 426$.'
    sec: two-misses
  - q: What decides the δ-miss fraction $\vfD$?
    a: The residency policy for dictionaries and where the misses land
    wrong: ["The size of each delta", "The number of layers", "The number format of the cherries"]
    why: A miss is a δ-miss only if its stretch's dictionary is on the shelf, so f_D depends on which stretches the misses fall into and which dictionaries the policy keeps.
    sec: two-misses
---

[[#landscape-hisparse]] wrote HiSparse's per-layer resolve step in a dozen lines: find the hits, evict for each miss, fetch each miss raw, promote the hits. The simplest variant of [[kvblockdiff]] keeps every one of those lines. It adds one structure and one question.

## One shelf next to the hot cache {#shelf}

The added structure lives in GPU memory, next to the [[hot-cache]], one per [[sequence]] per layer.

::: define dictionary-shelf
- **What it is.** The [[dictionary|dictionaries]] of $\vnD$ [[punnet|punnets]], kept in GPU memory for one sequence at one layer. $\vnD$ is a knob, like the hot cache's slot count $\vB$. A [[stretch]] whose dictionary is on the shelf is *on fire*; the rest are on ice ([[#app-on-fire]]).
- **Example.** In the toy trace of the next page, $\vnD = 2$: the shelf holds the dictionaries of two of the four stretches at any moment. On [[pin|the Pin]] a sequence of 100 384 tokens has 25 stretches of 4096 per layer; a shelf of four holds four of them.
- **Easy to confuse with** the hot cache. The hot cache holds raw picks (which positions are *wanted*); the shelf holds the side information needed to *decode* deltas. Both live on the GPU and answer different questions.
:::

Here is the resolve step with the shelf in it, the listing every page of this Part quotes:

```python the miss path with a dictionary shelf (docs/project/notation.md §5)
for p in misses:                                       # p is a pick (layer_id, token_pos_id)
    sid = p.token_pos_id // stretch_len
    if sid in shelf:                                   # the dictionary shelf: on-fire stretches
        for cherry_id in cherries_of(p, scenario):     # one pick -> one or more cherries
            hot_cache[p] += decompress(fetch_delta(cherry_id), shelf[sid])   # a δ-miss: ρ·e bytes
    else:
        hot_cache[p] = fetch(p)                        # a raw miss: e bytes, as HiSparse today
```

Two new expressions carry the mechanism. [[~shelf-lookup]] is the one question; [[~fetch-delta]] is what a yes costs. Which dictionaries go on the shelf is a residency policy, and it is a design choice to be studied ([[#app-on-fire]]). The toy policy used on these pages is deliberately simple: **after each step, keep the dictionaries of the $\vnD$ stretches that own the most picks in the hot cache.** Stretches that are busy now are likely to be busy next step. Here is the whole step, runnable; the last lines replay the toy trace of [[#landscape-toy-trace]], where a pick of one layer is written as its position.

```python HiSparse's resolve step plus a dictionary shelf, for one sequence and one layer
from collections import Counter

def kvblockdiff_resolve(S, hot_cache, shelf, B, n_D, stretch_len):
    """One layer, one step. hot_cache: positions, oldest first. shelf: set of stretch ids."""
    hits   = [p for p in S if p in hot_cache]
    misses = [p for p in S if p not in hot_cache]
    cost = {"raw": [], "delta": [], "loads": []}
    for p in misses:
        if len(hot_cache) >= B:                                  # evict the oldest pick not picked now
            hot_cache.remove(next(q for q in hot_cache if q not in S))
        kind = "delta" if p // stretch_len in shelf else "raw"   # is this stretch's dictionary on the shelf?
        cost[kind].append(p)                                     # delta: rho*e bytes; raw: e bytes
        hot_cache.append(p)
    for p in hits:                                               # hits move to the newest end
        hot_cache.remove(p); hot_cache.append(p)
    # toy residency policy: keep the dictionaries of the n_D stretches with most picks in the hot cache
    count = Counter(p // stretch_len for p in hot_cache)
    keep = sorted(count, key=lambda j: (-count[j], j not in shelf, j))[:n_D]
    cost["loads"] = sorted(set(keep) - shelf)                    # each load moves w*e bytes
    shelf.clear(); shelf.update(keep)
    return cost

hot_cache, shelf = [1, 10, 13, 2, 5, 9], {0, 2}                  # the toy trace of III.8
for S in [[2, 5, 9, 14], [2, 5, 9, 11], [2, 9, 11, 15]]:
    print(kvblockdiff_resolve(S, hot_cache, shelf, B=6, n_D=2, stretch_len=4), sorted(shelf))
```

It prints one line per step: `{'raw': [14], 'delta': [], 'loads': [3]} [2, 3]`, then `{'raw': [], 'delta': [11], 'loads': []} [2, 3]`, then `{'raw': [], 'delta': [15], 'loads': []} [2, 3]`. The next page animates exactly this.

::: aside reminder What HiSparse's resolve step does
For each layer of each sequence, at each decode step: the [[indexer]] hands over a set $\vS$ of $\vk$ picks. Picks already in the hot cache are hits. Each miss evicts the oldest resident pick that is not picked right now ([[lru]] with a guard) and is fetched from host memory. Hits then move to the newest end. See [[#landscape-hisparse]].
:::

::: takeaway
- kvblockdiff keeps HiSparse's resolve step line for line and adds a dictionary shelf of $\vnD$ dictionaries per layer.
- A residency policy decides which dictionaries sit on the shelf; the toy policy keeps the stretches with the most hot picks.
:::

## Two kinds of miss {#two-misses}

The one new question is asked once per miss: *is the dictionary of this pick's stretch on the shelf?*

```graph
id: app-miss-flow
columns: [A miss, The one question, What crosses the link]
nodes:
  - {id: miss, col: 1, row: 1, title: "Pick p misses", text: "The indexer picked it, and it is not among the hot cache's raw picks.", term: hot-cache}
  - {id: q, col: 2, row: 1, title: "Is its stretch's dictionary on the shelf?", text: "Look up stretch_id = token_pos_id // stretch_len in the shelf.", term: dictionary-shelf}
  - {id: dm, col: 3, row: 1, title: "Yes: a δ-miss", text: "Fetch the deltas of its cherries, rebuild the pick on the GPU, place it in the hot cache.", term: delta-miss}
  - {id: rm, col: 3, row: 2, title: "No: a raw miss", text: "Fetch the raw pick, exactly as HiSparse does today.", term: raw-miss}
edges:
  - [miss, q]
  - [q, dm, "yes"]
  - [q, rm, "no"]
```

::: define delta-miss
- **What it is.** A hot-cache miss whose stretch has its dictionary on the shelf. Only the delta of each of its cherries crosses the link, $\vdsz = \vrho\,\ve$ bytes on average. The GPU decodes it and places the raw pick in the hot cache as usual.
- **Example.** Step 2 of the toy trace: pick 11 misses, stretch 2's dictionary is on the shelf, so 426 bytes travel instead of 640 (at the light compressor's $\vrho = 0.665$); at the reference-tree point, 72 bytes on average, and nothing at all for the four cherries in five that sit inside the dictionary as references.
- **Easy to confuse with** a hit. A δ-miss still crosses the link and still costs a decode; it just carries fewer bytes.
:::

::: define raw-miss
- **What it is.** A hot-cache miss whose stretch's dictionary is *not* on the shelf. The raw pick crosses the link, $\ve$ bytes, exactly as in HiSparse.
- **Example.** Step 1 of the toy trace: pick 14 misses in stretch 3, whose dictionary is not on the shelf.
- **Easy to confuse with** a failure. A raw miss is never worse than today; it just does not profit.
:::

How many misses profit is one number, the [[=delta-miss-fraction|δ-miss fraction]] $\vfD$: the share of misses that are δ-misses. An average miss then moves

$$
\ve\,\Big[\underbrace{\vfD\,\vrho}_{\text{δ-misses: } \vrho\ve \text{ each}} + \underbrace{(1-\vfD)}_{\text{raw misses: } \ve \text{ each}}\Big] \quad \text{bytes, plus the occasional dictionary load.}
$$ {#eq-app-miss-bytes}

On the Pin, with $\vfD = 0.85$ (assumed) and the light point's $\vrho = 0.665$: $640 \times (0.565 + 0.15) \approx 458$ B per miss; with the tree point's $\vrho = 0.112$: $640 \times (0.095 + 0.15) \approx 157$ B.

::: note numbers What the replay measured for the δ-miss fraction
On the pick traces of a stand-in LLM (Qwen 2.5 1.5B, Part XI), a shelf of four dictionaries of 4096 positions catches 0.94 of the misses on a 27K-token context, where it spans 60 % of the positions, and 0.36–0.54 when carried to the Pin's 100K ([[#picks-shelf]]). The 0.85 on this page and in the figure below is the assumed value; the figure keeps $\vfD$ as an input.
:::

::: figure fig-app-miss-cost missCost
**What an average miss moves.** Horizontal axis: the δ-miss fraction $\vfD$, from no δ-misses (0 %) to all (100 %). Vertical axis: bytes per miss, for cherries of $\ve = 640$ bytes. The dashed line is HiSparse, where every miss is raw. The solid line is kvblockdiff at the chosen delta share $\vrho$; the handle marks the chosen $\vfD$ (drag it, or use the sliders). Tiles: the average bytes per miss, the bytes per layer per step at the Pin's 274 misses ([[#landscape-derived-numbers]]), and the traffic relative to HiSparse. Dictionary loads are not included here. $\vfD$ is an assumed input; set $\vrho$ to 0.665 or 0.112 for the two measured points.
:::

::: try
1. Set $\vfD$ to 50 %. Half the misses profit, and traffic drops by only half of what $\vrho$ promises.
2. Set $\vrho = 0.112$ and $\vfD = 0.5$. The raw half now dominates: 56 % of HiSparse's traffic, though a delta is a ninth of a cherry.
:::

So two numbers set the gain, and they come from different places. $\vrho$ comes from the *bytes*, how predictable cherries are from their punnet's dictionary, a scenario's number ([[#scenario-the-score]]). $\vfD$ comes from the *traffic*, where misses land and which dictionaries the policy keeps, a number of the pick trace ([[#hypotheses-heavy-stretches]], [[#plan-hot-cache-replay]]).

::: theme which-vs-what
$\vrho$ is about what is inside the cherries; $\vfD$ is about which stretches the indexer keeps wanting. Evidence for one says nothing about the other, and the product of the two is what the link sees.
:::

::: theme side-info
The third lesson of the trained dictionary ([[#tiny-files-three-lessons]]) becomes a branch in the code: "does the receiver have the dictionary?" is asked at every miss, and the answer decides between a delta and a raw pick.
:::

::: takeaway
- δ-miss: dictionary on the shelf, move $\vrho\,\ve$. Raw miss: dictionary absent, move $\ve$, as today.
- An average miss moves $\ve\,[\vfD\vrho + (1-\vfD)]$ bytes, plus dictionary loads.
- $\vrho$ is about the bytes; $\vfD$ is about where misses land. Both must be good.
:::
