---
title: Replaying the hot cache
nav: Replaying the hot cache
group: Next experiments
lede: With a pick trace in hand, HiSparse's hot cache and kvblockdiff's dictionary shelf can be run on the Bench a thousand times over, in a loop of a few dozen lines that never touches a byte of the orchard. Seven readings come out, each with the number that would change the design.
cards:
  - q: What does the replay subproblem take in and give out?
    a: 'A pick trace, a cache size `B`, a policy and a stretch length; out come counts: miss rate, misses per stretch, popularity, the δ-miss fraction and dictionary loads'
    wrong: ["A compressor and a punnet; out comes an MDL ratio", "The orchard's bytes; out comes a dictionary", "A GPU and a kernel; out come cherries per second"]
    why: The replay only counts which positions are wanted. Bytes enter only afterwards, when the counts are multiplied by cherry and delta sizes in the napkin.
    sec: subproblem
  - q: In the replay, when does a miss count as a δ-miss?
    a: When the dictionary of the missed pick's stretch was already on the shelf at the moment of the miss
    wrong: ["Whenever the stretch has a dictionary somewhere on the host", "When the pick was in the hot cache at some earlier step", "Always, after the first step"]
    why: Dictionaries are loaded after a step's misses, for later steps. A miss is cheap only if its dictionary was already on the GPU.
    sec: readings
  - q: What must happen to the δ-miss fraction when the trace's positions are relabelled by a random permutation?
    a: It must fall to about the share of stretches on the shelf, because every stretch is now an even slice of the picks
    wrong: ["It must rise, because the hot cache warms faster", "It must stay the same, because hits are unchanged", "It must become exactly zero"]
    why: 'The relabelling keeps which picks repeat (the hot cache''s hits are untouched) and destroys where they sit, so any concentration into stretches that survives is a bug.'
    sec: readings
  - q: Why does the replay drop its first thousand steps from every count?
    a: Until the hot cache has filled, every pick misses; counting those steps would report a miss rate no serving system sees
    wrong: ["Because the trace's first steps are corrupt", "Because the shelf is empty only then", "To save memory"]
    why: The counts describe a steady state. A warm-up of `warm` steps is dropped in the loop before misses, δ-misses and loads are tallied.
    sec: loop
---

A piano roll records which keys are struck and when, and nothing about how the piano sounds. The pick trace of [[#plan-queries-and-picks]] is the piano roll of sparse attention. Feed it to HiSparse's [[hot-cache]], to a [[dictionary-shelf]] of four dictionaries, to one of sixteen, and count what happens. That counting is this page.

::: note key Run on 2026-11-03, on a smaller LLM
This replay was run on the pick traces of Qwen 2.5 1.5B ([[#picks-the-bachelor]]), not on the Bench. Reading 1 is a calibration and passed: 35 / 19 / 9.7 % at 1, 2 and 4 slots per pick against HiSparse's 30 / 13.4 / 6.7 % ([[#picks-hot-cache]]). Readings 2, 4, 5 and 6 are measured, with the shuffled control, and carried to the Pin ([[#picks-heavy-stretches]], [[#picks-shelf]]); the lifetime of popularity (reading 3) enters only through the shelf policies; reading 7 needs a trace of the LLM whose cherries were compressed and is open. Two details differ from the loop below: the best shelf policy was popularity over the last 32 steps, and loads are counted net. The results are Part XI ([[#picks-dispatch]]).
:::

## The subproblem, stated {#subproblem}

The bill of the application ([[#app-the-napkin]]) multiplies two kinds of number: bytes per miss, from the compression scenario, and counts, how many picks miss, how many of those land in a stretch whose dictionary is on the shelf, and how often a dictionary must be loaded. The counts are a property of the trace alone. They can be studied apart from any compressor because a cache decides on identities, never on contents; and apart from any kernel because the replay keeps no time, only order ([[#hypotheses-two-localities]]).

**Inputs and outputs.** A pick trace [[~pick-trace]]; a hot-cache size $\vB$ in slots; a stretch length $\vb$; a shelf size $\vnD$ and a shelf policy (which stretches are [[on-fire|on fire]]). Out come counts, per sequence and per layer:

```python what the replay returns, per layer
m        # miss rate: misses / picks over the steady-state steps
by_stretch[stretch_id]   # how many misses landed in each stretch
popularity[step][stretch_id]   # the running miss count that decides on fire / on ice
f_D      # δ-misses / misses: the share whose dictionary was on the shelf when they missed
n_load   # dictionaries loaded onto the shelf per step
```

The one rule: **no bytes are involved**. A δ-miss is counted as a δ-miss whether its delta is 57 bytes or 400; the replay reports how many, the napkin multiplies by what.

**Assumed and not charged.** HiSparse's eviction rule, LRU with the guard that a currently picked position is never evicted, taken as given ([[#landscape-hisparse]]); the time a load takes (the replay counts loads, the napkin prices them); the first steps, until the hot cache has warmed up, which are dropped from the counts.

**Consumes and feeds.** It consumes the trace of [[#plan-queries-and-picks]] and the stretch lengths of Part IV. Its results feed the two kinds of miss of [[#app-shelf-and-two-misses]], the on-fire rule of [[#app-on-fire]], the napkin and calculator of [[#app-the-napkin]] and [[#app-calculator]], and the victim tier of [[#app-victim-tier]], all of which carry assumed $\vfD$, $\vnload$ and $\vm(\vB)$ today.

::: takeaway
- In: a trace, $\vB$, $\vb$, $\vnD$, a policy. Out: counts only, $\vm$, misses per stretch, popularity, $\vfD$, $\vnload$.
- Bytes come in afterwards, in the napkin.
:::

## The loop {#loop}

The replay is the resolve listing of [[#landscape-hisparse]] with the shelf of [[#app-shelf-and-two-misses]] folded in. Here it is in full, for one layer.

```python the replay, one layer (a numpy-free loop)
from collections import OrderedDict

def replay(trace, B, stretch_len, n_D, policy="heaviest", warm=1024):
    """trace: one set of picks per decode step, for one layer.
    Hot cache of B slots (LRU, never evicting a pick of this step) plus a shelf of n_D dictionaries.
    Returns the miss rate, the delta-miss fraction f_D and the dictionary loads per step."""
    hot, shelf = OrderedDict(), OrderedDict()
    misses = picks = d_misses = loads = 0
    for step, S in enumerate(trace):
        S = set(S)
        new = [p for p in S if p not in hot]
        for p in S - set(new):
            hot.move_to_end(p)                          # hits become the most recently used
        for p in new:                                   # misses
            if len(hot) >= B:
                del hot[next(v for v in hot if v not in S)]   # evict the LRU pick not wanted now
            hot[p] = None
            if p // stretch_len in shelf:               # its dictionary is on the shelf: a delta-miss
                d_misses += step >= warm
                shelf.move_to_end(p // stretch_len)
        if policy == "heaviest":                        # on fire: the n_D stretches with most hot picks
            count = {}
            for p in hot: count[p // stretch_len] = count.get(p // stretch_len, 0) + 1
            wanted = sorted(count, key=lambda j: -count[j])[:n_D]
        else:                                           # "touched": the stretches hit by a miss, LRU
            wanted = dict.fromkeys(p // stretch_len for p in new)
        for j in wanted:
            if j in shelf: shelf.move_to_end(j); continue
            loads += step >= warm
            if len(shelf) >= n_D: shelf.popitem(last=False)
            shelf[j] = None
        if step >= warm:
            misses += len(new); picks += len(S)
    return misses / picks, d_misses / max(misses, 1), loads / max(len(trace) - warm, 1)
```

Two rules inside it carry the design. A miss is a [[delta-miss|δ-miss]] only if its stretch's dictionary was *already* on the shelf; loads happen after the step's misses and serve later steps. And the policy is a parameter, because which stretches to keep on fire is one of the things the replay compares: the heaviest stretches of the hot cache, or an LRU of stretches touched by a miss ([[#app-on-fire]]).

::: figure fig-plan-replay-sweep planReplaySweep wide
**δ-miss fraction and dictionary loads against the shelf size, on the synthetic trace of [[#fig-plan-stand-in-raster]].** 300 steps, $\vk = 128$ of 4096 positions, stretches of 256, query drift 0.15, through a hot cache of $\vB = 256$ slots and a shelf of $\vnD$ dictionaries (log scale). Solid: keep the heaviest stretches of the hot cache on fire; dashed: an LRU of stretches hit by a miss. Left: $\vfD$ with the 0.8 and 0.5 readings of [[#plan-decision-rules]]. Right: $\vnload$, loads per step, with the 0.1 break-even of a heavy dictionary. The readout gives the miss rates for $\vB = \vk, 2\vk, 4\vk$, about 9, 3 and 2 %, far more local than HiSparse's real trace.
:::

::: try
1. Set the topic strength to 0. With four dictionaries on the shelf only about a quarter of the misses find theirs, and the heaviest policy loads 0.27 dictionaries per step.
2. Back at 1.5: about half the misses are δ-misses with four dictionaries, at 0.04 loads per step, under the 0.1 break-even.
3. At the right end, 16 dictionaries cover every stretch of this toy, so $\vfD$ nears 1 whatever the keys. A 225K-token sequence in stretches of 4096 has 55; the question is whether far fewer suffice.
:::

::: takeaway
- Forty lines: HiSparse's LRU with its guard, plus a shelf with a policy.
- δ-miss only if the dictionary was already there; loads serve the future, not the step that caused them.
:::

## Seven readings, and the control {#readings}

In the order they are read, each with the design question it answers.

1. **Miss rate against $\vB$**, at 2048, 4096 and 8192 slots, per layer. The first reading is a calibration: HiSparse measured 30 / 13.4 / 6.7 % on GLM-5.1 ([[#landscape-lucky-louis]]). If the stand-in's rates differ by a factor of two, every later reading is scaled by that factor before it is believed, and the stand-in is more or less local than a trained indexer.
2. **Where misses land**, per stretch and per layer, at $\vb$ = 2048, 4096, 16 384. The share of a step's misses held by its heaviest 1, 2, 4 and 8 stretches: the [[heavy-stretch|heavy-stretch]] hypothesis of [[#hypotheses-heavy-stretches]] in numbers.
3. **Popularity and how long it lasts.** For each stretch, the running miss count of [[#app-on-fire]]; for the on-fire set, how many steps a stretch stays in it. This is the stretch-level [[reuse-distance|reuse distance]] of [[#hypotheses-stack-distance]], and it gives the shelf's own miss rate at every $\vnD$ in one curve.
4. **The on-fire simulation and $\vfD$.** $\vfD(\vnD, \vb)$ for $\vnD \in \{2, 4, 8, 16\}$ under both policies, with promotion and demotion thresholds swept.
5. **Dictionary loads per step**, $\vnload$, for the same grid. The budget is $\vnload \cdot \vw \ll$ the misses per step; at the Pin's 274 misses and $\vw = 256$, under 0.1 loads per step ([[#app-the-napkin]]).
6. **The full reuse-distance curve** of picks, which prices a [[victim-tier|victim tier]] of $\vBV$ deltas without a second replay ([[#plan-other-experiments]]).
7. **Are missed cherries harder to compress?** Take the picks that missed and score them with the frontier compressor against the punnet's average. If misses are surprising in time and in content both, $\vrho$ on the miss path is worse than Part VIII's average ([[#hypotheses-two-localities]]).

**The control: shuffle the trace.** Relabel every position by one fixed random permutation and replay again. Hits and misses of the hot cache are unchanged (the same positions repeat), but the stretches are now even slices of the picks, so $\vfD$ must fall to about $\vnD \cdot \vb / \vL$ and the heaviest stretch must hold about $\vb / \vL$ of the picks. Any concentration that survives the relabelling is a bug in the loop.

::: note numbers What HiSparse's numbers would look like on the Bench
At the Pin, HiSparse's 13.4 % at 4096 slots and $\vk = 2048$ mean 274 misses per layer per step, and the [[lucky-louis|Lucky Louis property]] is that the next step re-picks most of this step's positions. On the Bench the same three measurements, miss rate at three cache sizes, the overlap of consecutive pick sets, and the slope of $\vm(\vB)$ (the Pin's is $\vB^{-1.08}$, [[#landscape-reuse-curve]]), fill in the `null` cells of `data/settings.yaml`, so that the Bench's pill on every page finally shows a miss rate instead of "not measured".
:::

::: theme controls
A replay that reports $\vfD = 0.9$ without its shuffled twin reports nothing. The twin costs one more loop and turns a number into a measurement.
:::

::: takeaway
- Calibrate against HiSparse first; then concentration, popularity, $\vfD$, $\vnload$, the reuse curve, and whether misses are harder to compress.
- The shuffled trace must flatten every stretch-level number to its even-spread value.
:::
