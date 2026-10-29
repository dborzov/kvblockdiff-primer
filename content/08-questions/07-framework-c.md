---
title: "Framework C: where do misses land?"
nav: "C · where misses land"
lede: The indexer announces its picks before any bytes move. A recording of those picks can be replayed through any cache design, as often as we like, without opening a single entry. Framework C does that to answer Q3.
cards:
  - q: What does framework C need from the model, and what does it not need?
    a: It needs the selected positions at every step and layer; it does not need the contents of any entry
    wrong: ["It needs the compressed deltas of every entry", "It needs a working GPU decoder", "It needs BF16 and FP8 copies of every key"]
    why: Where misses land is a property of the selection trace — which entries — not of their bytes.
    sec: setup
  - q: Which of these is a sanity check in framework C, rather than its main output?
    a: The token miss rates at B = 2K, 4K, 8K, compared with HiSparse's 30 / 13.4 / 6.7 %
    wrong: ["The δ-miss fraction f_D for each number of resident dictionaries", "Dictionary loads per step", "The share of selections held by the heaviest blocks"]
    why: The miss rates calibrate the proxy indexer against a real one; f_D, loads and block heaviness answer Q3.
    sec: setup
  - q: 'In the toy replay, concentration is set to zero. The token miss rate stays near 15 %, but f_D drops. What does that show?'
    a: Re-selecting the same entries (Lucky Louis) does not by itself put the misses into few blocks
    wrong: ["That the hot cache is broken", "That fallen-apple similarity is absent", "That more dictionaries always fix the problem"]
    why: The toy indexer still re-selects most positions, so the hot cache works; but the selections are scattered, so misses touch many blocks.
    sec: toy
  - q: 'Replay gives f_D = 0.85 with 4 resident dictionaries but 0.6 loads per step per layer. With heavy dictionaries (w = 256), is that affordable?'
    a: No — 0.6 × 256 ≈ 154 entries' worth of loads per step, more than half the miss traffic it saves on
    wrong: ["Yes, f_D above 0.8 is all that matters", "Yes, loads are free because dictionaries are small", "It cannot be judged without knowing ρ exactly"]
    why: 'Loads must satisfy n_load · w ≪ 274. For w = 256 that means under about 0.1 per step per layer.'
    sec: outcomes
---

A piano roll records which keys are struck and when. It says nothing about how the piano sounds; you can feed the same roll to any piano. A selection trace is the piano roll of sparse attention. It records which positions the [[indexer]] picks at every step and layer, and nothing about what is stored there. Feed it to any cache design — HiSparse's, ours with 2 dictionaries, ours with 16 — and count what happens.

Part II already had a piano roll: the forecaster's storm morning of [[#school-caches]], 24 requests for 8 station logbooks, in order. Nothing in it says what a logbook contains, and yet [[#school-reuse-distance]] read a whole miss-rate curve off it, for every desk size at once.

::: dataset fig-questions-storm-roll storm-morning view=reuse,raster hl=lru metrics=curve,lru4,belady4
**The storm morning as a piano roll.** One row per logbook, one column per request, in order; each repeat is joined to the same logbook's previous request, and its reuse distance is written under the column. Red cells (the highlight) are the misses of an LRU desk of 4 slots; switch the highlight to compare FIFO, or to see first requests. *Numbers:* the miss-rate curve read off the reuse distances. Synthetic data from II.21.
:::

Framework C runs the same replay twice over, and bigger. For the hot cache, entries play the logbooks. For the [[dictionary-cache]], blocks play them: a block's reuse distance — how many other blocks are touched before it comes back — gives the dictionary cache's miss rate for every number of resident dictionaries in one curve.

## The set-up {#setup}

::::: cols
::: col Varied
- the block size $\vb$
- the number of resident dictionaries $\vnD$
- the residency policy: the heaviest blocks, or plain LRU of touched blocks
:::
::: col Held fixed
- the selection trace, one per layer
- the token [[hot-cache]]: LRU, $\vB$ slots, as in HiSparse
- top-$\vk$ with $\vk = 2048$
:::
::: col Measured
- selections per block per step
- the block reuse distance
- $\vfD(\vnD, \vb)$ and $\vnload$ per step
- token miss rates, as a sanity check
:::
:::::

Our proxy model has no trained indexer, so the trace comes from exact attention: for each decode position and layer, sum the attention weights over heads and take the top 2,048 ([[#plan-wave2-indexer]]). A trained indexer approximates exactly this ranking, so block statistics should transfer; exact miss rates will not, which is why the first output is a sanity check against HiSparse's 30 / 13.4 / 6.7 % ([[#landscape-lucky-louis]]).

The full list of measurements ([[#plan-wave2-measure]]):

1. **Sanity:** token miss rates $\vm(\vB)$ at $\vB$ = 2K, 4K, 8K.
2. **Block concentration:** per step, the share of selections held by the top 1, 2, 4 and 8 blocks — the [[heavy-block]] claim in numbers.
3. **Block reuse distance:** how many steps pass before a block is touched again. It gives the dictionary cache's miss rate at every $\vnD$ in one curve, as [[reuse-distance]] does for entries.
4. **$\vfD(\vnD, \vb)$ and $\vnload$**, for $\vnD$ = 2, 4, 8, 16 and both residency policies.
5. **Extras, cheap to add:** the full reuse-distance curve (it prices a [[victim-tier]]), and whether missed entries are also harder to code (parked on [[#questions-parked-measurements]]).

The heart of it is a short loop: HiSparse's resolve step, plus a shelf of dictionaries that follows the heaviest blocks.

```python framework C in miniature: replay a selection trace
from collections import OrderedDict

def replay(trace, B, b, n_D):
    """trace: one list of selected positions per decode step (one layer).
    Token LRU of B slots, as in HiSparse, plus the dictionaries of the n_D blocks
    holding most hot-cache entries. Returns miss rate, f_D and loads per step."""
    cache, resident = OrderedDict(), set()
    misses = delta_misses = loads = selected = 0
    for S in trace:
        keep = set(S)
        for p in S:
            if p in cache: continue
            misses += 1
            delta_misses += (p // b) in resident           # δ-miss: dictionary already on the GPU
            if len(cache) >= B:                             # evict the oldest entry not selected now
                cache.pop(next(v for v in cache if v not in keep))
            cache[p] = True
        for p in S: cache.move_to_end(p)                    # selected entries are now the most recent
        count = {}
        for p in cache: count[p // b] = count.get(p // b, 0) + 1
        heavy = sorted(count, key=lambda j: (-count[j], j))[:n_D]
        heavy = set(heavy + [j for j in resident if j not in heavy][:n_D - len(heavy)])  # keep old ones while there is room
        loads += len(heavy - resident)                      # dictionaries that must be fetched
        resident, selected = heavy, selected + len(S)
    return misses / selected, delta_misses / max(misses, 1), loads / len(trace)

import random
random.seed(1)
spots, trace = [300, 900, 1500], []                         # three slowly drifting hot spots
for t in range(400):
    spots = [min(2000, max(40, s + random.randint(-3, 3))) for s in spots]
    trace.append(sorted({random.choice(spots) + random.randint(-40, 40) for _ in range(40)})[:32])
m, f_D, n_load = replay(trace, B=64, b=128, n_D=4)
print(f"miss rate {m:.2f}   f_D {f_D:.2f}   loads per step {n_load:.2f}")
```

It prints `miss rate 0.72   f_D 0.96   loads per step 0.09`. This made-up trace draws fresh positions around three hot spots at every step, so hardly any entry is picked twice and most selections miss. Yet the misses land in the few blocks under the hot spots, so almost all of them would be δ-misses. Which entries repeat and which blocks are hot are two different statistics.

::: takeaway
- Vary the block size, the number of resident dictionaries and the policy; replay a fixed selection trace.
- Measure block heaviness, block reuse distance, $\vfD$ and $\vnload$; check token miss rates against HiSparse.
- No entry is ever opened: Q3 is a question about the trace.
:::

## A toy replay {#toy}

The figure replays a made-up trace through the loop above. Its indexer has two habits you can mix: re-selecting the same positions from step to step (the [[lucky-louis]]), and crowding its picks around a few slowly drifting hot spots.

::: figure fig-questions-replay qReplay
**A toy trace replay** (a made-up indexer, not a real one). Top: 48 decode steps (left to right) of one layer of a 2,048-token history (top to bottom). Each step selects $\vk = 32$ positions; the hot cache has $\vB = 64$ slots (2$\vk$, as in HiSparse's middle setting). Small grey ticks are hits; green dots are [[delta-miss|δ-misses]] (the block's dictionary was resident); brown dots are [[raw-miss|raw misses]]; violet bands show which blocks had their dictionary resident at that step; alternate blocks are faintly shaded. Tiles: token miss rate, δ-miss fraction $\vfD$ and dictionary loads per step, measured over 80 steps after a 30-step warm-up. Bottom: $\vfD$ against the number of resident dictionaries $\vnD$ at the current block size, with the thresholds 0.8 and 0.5. The concentration slider mixes the scattered habit (0) and the hot-spot habit (1); "New trace" draws another seed.
:::

::: try
1. At the defaults (concentration 60 %, blocks of 256, 4 dictionaries), $\vfD$ is about 86 % with 0.05 loads per step: heavy dictionaries would be affordable here.
2. Drag the concentration to 0. The token miss rate barely moves (about 15 %): the hot cache still works. But $\vfD$ falls to about half and loads rise ninefold. Lucky Louis is intact; heavy blocks are gone.
3. Still at concentration 0, switch to blocks of 64. Now 32 blocks share the misses, and 4 dictionaries catch about one miss in nine.
4. Go back to blocks of 256 and set $\vnD = 8$: there is now a slot for every block. $\vfD$ jumps to 100 % with no loads at all — the "light dictionaries, all resident" regime, where Q3 stops mattering.
:::

::: takeaway
- Token-level reuse and block-level concentration are different habits; the toy can have either without the other.
- $\vfD$ climbs with $\vnD$ and saturates when the heavy blocks keep changing; loads tell how often they change.
:::

## What the numbers would mean {#outcomes}

Written down before the data:

| replay shows | reading | next |
|---|---|---|
| $\vfD \ge 0.8$ at $\vnD \le 8$, with $\vnload \le 0.1$ | misses concentrate and blocks stay heavy | heavy block dictionaries are affordable |
| $\vfD \ge 0.8$ but $\vnload$ well above 0.1 | the heavy blocks change too often | only light dictionaries; loads of heavy ones would eat the saving |
| $\vfD < 0.5$ | misses are spread | light dictionaries for every block, or one per request |

::: theme amortize
Here the dictionary is amortized over *time* instead of over entries. A dictionary loaded once and used for 50 steps costs $\vw/50$ entries' worth per step. The budget is $\vnload\,\vw \ll 274$ misses per layer per step, so a heavy dictionary ($\vw = 256$) must stay useful for well over ten steps, while a light one ($\vw = 32$) can be swapped almost every step.
:::

Two notes keep framework C in proportion.

- **It is conditional.** For light dictionaries ($\vw \approx 2$) everything is resident and C is moot. It matters only if wave 1 says heavy dictionaries are needed.
- **It is independent of Q1.** A strong Q1 with a negative C is a perfectly good outcome: one dictionary per request, a simpler system ([[#questions-q3/links]]).

::: takeaway
- Yes: $\vfD \ge 0.8$ at $\vnD \le 8$ and $\vnload \le 0.1$. No: $\vfD < 0.5$.
- Loads amortize a dictionary over the steps it stays useful.
- C matters only for heavy dictionaries, and its inputs feed framework D.
:::
