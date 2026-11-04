---
title: Where misses land
nav: Where misses land
group: Stretches and the shelf
lede: A dictionary shelf with a few slots helps only if a step's misses crowd into a few stretches, and keep crowding into them. The replay counted where every miss landed, against a twin trace whose positions were shuffled. Then it compared three rules for choosing which stretches' dictionaries sit on the shelf.
cards:
  - q: 'With stretches of 1024 positions at the Pin''s budget share and B/k = 2, what share of a step''s misses does its heaviest stretch hold?'
    a: '31 %, against 9 % in the shuffled twin'
    wrong: ["9 %, the same as the twin", "71 %", "85 %, as Part VI assumed"]
    why: 'The heaviest four hold 71 % against 31 %. Misses do pile into stretches, about 3× above what an even spread gives.'
    sec: heavy
  - q: What does the shuffled twin of a trace keep, and what does it destroy?
    a: It keeps which picks repeat (the hot cache's misses are unchanged) and destroys where they sit (every stretch becomes an even slice)
    wrong: ["It keeps where misses sit and destroys which repeat", "It keeps nothing; it is a random trace", "It shuffles tokens across sequences"]
    why: One fixed permutation of the positions of each sequence relabels every pick. Any concentration into stretches that survives it is chance.
    sec: heavy
  - q: Which shelf policy had the highest δ-miss fraction in every cell of the replay?
    a: Popularity over the last 32 steps, with hysteresis
    wrong: ["An LRU of stretches touched by a miss", "The stretches with the most picks in the hot cache", "Popularity over the last 8 steps"]
    why: 'It also loaded 2–4× fewer dictionaries than popularity over 8 steps. The LRU of touched stretches, the loop of X.6, was the worst: lift ≤ 2.7 and 0.5–9 loads per step.'
    sec: policies
  - q: Why does the replay count net loads rather than gross loads?
    a: A dictionary loaded and dropped within the same step would never be shipped by any implementation
    wrong: ["Because gross loads are always zero", "Because loads are free", "Because net loads are larger"]
    why: 'Net loads count the dictionaries that are still on the shelf after the step. For the heaviest and popularity policies gross equals net; for the touched LRU it does not.'
    sec: policies
---

Hypothesis [[#hypotheses-heavy-stretches]] asked a question no hit rate can answer. The [[lucky-louis|Lucky Louis property]] says the indexer re-picks the same positions, but those positions could be scattered over the whole context. A [[dictionary-shelf|dictionary shelf]] of a few dictionaries needs more: a step's misses crowding into a few [[heavy-stretch|heavy stretches]], and the same stretches staying heavy for many steps. The toy of that page could produce either world with one slider. The replay on [[bachelor|the Bachelor]] measured which world the traces are in.

## Heavy stretches against the shuffled twin {#heavy}

Each step's misses were grouped by `stretch_id = token_pos_id // stretch_len` and sorted by count. The share held by the heaviest 1, 2, 4 and 8 stretches was averaged over the steps, then over 140 (sequence, layer) pairs.

A share alone means little: with 24 to 29 stretches of 1024 positions in a sequence, even random misses give some stretch more than an even share. The control is the **shuffled twin**, the [[shuffle-control|shuffle control]] of [[#plan-hot-cache-replay/readings]] applied to the trace. One fixed random permutation of each sequence's positions (seed 0, applied after the resident window is removed) relabels every pick. The hot cache's hits and misses are unchanged by construction, since the same picks repeat. Where they sit is destroyed: every stretch becomes an even slice of the picks.

Pin-scaled, stretches of 1024 positions, $\vB/\vk = 2$, measured:

| share of a step's misses in its heaviest… | 1 stretch | 4 stretches |
|---|---|---|
| the trace | 31 % [29–32] | 71 % |
| the shuffled twin | 9 % | 31 % |

For a step's picks, rather than its misses, the heaviest stretch holds 44 % against the twin's 6 %. Across layers the heaviest stretch's share of the misses runs from 22 % to 41 %, with no trend in depth. Misses do pile into stretches: the heaviest one holds 3.3 times the even-spread share, and the shelves of [[#picks-shelf]] catch 3–5 times what the twin catches at small coverage.

::: figure fig-picks-heavy picksHeavy wide
**How much of a step's misses its heaviest stretches hold.** Horizontal axis: the heaviest $n$ stretches of a step, $n$ = 1, 2, 4, 8. Vertical axis: their share of the step's misses, at $\vB/\vk = 2$, averaged over steps `t >= 8192` and 140 (sequence, layer) pairs. Solid lines with filled points: the trace, one per named configuration; dashed lines with hollow points: the shuffled twin of the same trace. The chooser sets the stretch length, 256 to 4096 positions (1024 by default). The readout gives, per configuration, the heaviest stretch's share against the twin's and their ratio, the heaviest four's, and how many stretches a step's misses touch. Grade: measured.
:::

::: try
1. Compare solid and dashed lines at $n = 1$. The gap is the concentration a shelf can use; the dashed line is what an even spread gives.
2. Switch the stretch length to 4096. The trace and the twin both rise: each stretch is now a larger slice of the context.
:::

::: takeaway
- Stretches of 1024 at the Pin's share: the heaviest stretch holds 31 % of a step's misses (twin 9 %), the heaviest four 71 % (twin 31 %).
- No trend with depth (22–41 % by layer).
- The shuffled twin keeps the hot cache's misses and destroys their placement; it is the even-spread baseline.
:::

## Three ways to choose the shelf {#policies}

Concentration within one step is necessary, not sufficient. The shelf must also hold the right stretches *before* their misses arrive, since a miss is a [[delta-miss|δ-miss]] only if its stretch's dictionary was already on the shelf ([[#app-shelf-and-two-misses]]). Three policies were replayed, each deciding the shelf for the next step after the current step's misses are classified:

1. **Touched**: an LRU of the stretches touched by this step's misses. This is the loop of [[#plan-hot-cache-replay/loop]].
2. **Heaviest**: the $\vnD$ stretches with the most positions in the hot cache after the step. This is the toy policy of [[#app-shelf-and-two-misses]].
3. **Popular**, over `P` steps: the [[popularity]] of a stretch is its misses over the last `P` steps (`P` = 8 or 32); the shelf holds the $\vnD$ most popular, and a member is replaced only by a strictly more popular stretch (hysteresis, as [[#app-on-fire]] proposed).

```python the popular shelf, one layer: popularity over the last P steps, with hysteresis
from collections import Counter, deque

def popular_shelf(misses_per_step, stretch_len, n_D, P=32):
    """misses_per_step: the token_pos_id of each step's hot-cache misses.
    Returns f_D and net loads per step."""
    shelf, recent, popularity = set(), deque(), Counter()
    misses = d_misses = loads = 0
    for step_misses in misses_per_step:
        sids = Counter(p // stretch_len for p in step_misses)
        d_misses += sum(n for j, n in sids.items() if j in shelf)  # against the shelf as it was
        misses += sum(sids.values())
        recent.append(sids); popularity.update(sids)                # misses in the last P steps
        if len(recent) > P:
            popularity.subtract(recent.popleft())
        for j in sorted(popularity, key=lambda j: -popularity[j]):  # most popular first
            if j in shelf or popularity[j] <= 0:
                continue
            if len(shelf) < n_D:
                shelf.add(j); loads += 1; continue
            weakest = min(shelf, key=lambda m: (popularity[m], -m)) # ties: higher stretch id first
            if popularity[j] <= popularity[weakest]:
                break                                               # only a strictly more popular one
            shelf.remove(weakest); shelf.add(j); loads += 1
    return round(d_misses / misses, 3), round(loads / len(misses_per_step), 3)

trace = [[1, 9, 30]] * 3 + [[25, 26, 9]] * 3      # stretches of 8: busy 0, 1, 3, then 3 and 1
print(popular_shelf(trace, stretch_len=8, n_D=2, P=4))   # (0.611, 0.5)
```

In the toy, the shelf takes stretches 0 and 1 at the first step. At the fourth step stretch 3 has had five misses in four steps against stretch 0's three, and it replaces stretch 0. Three loads in six steps; 11 of 18 misses found their dictionary.

On the Bachelor, measured:

- **Popular, `P = 32`, wins in every cell.** It has the highest $\vfD$ at every $\vnD$ and stretch length with coverage below 1, in all three configurations, at 2–4 times fewer loads than `P = 8`.
- **Heaviest**, and popularity over 8 steps, lie between the two.
- **Touched is the worst.** Its $\vfD$ is at most 2.7 times the twin's, and it makes 0.5 to 9 net loads per step, above the 0.1 per step the decision rule of [[#plan-decision-rules]] allows.

Popularity over 32 steps changes the shelf only when a stretch has been busier than a member for a while, so a stretch that is busy for one step does not trigger a load. The touched LRU loads the dictionary of every stretch a miss lands in.

Loads are counted **net**: dictionaries still on the shelf after the step. The loop of [[#plan-hot-cache-replay/loop]] counts a dictionary loaded and dropped within the same step as a load (gross); no implementation would ship a dictionary it is about to drop. For the heaviest and popular policies gross equals net.

::: aside source Receipts
bachelor-kv at commit aa89697: `docs/results.md` §3 (heavy stretches R5; policies); `docs/design.md` §3.1 (replay semantics of the three policies, the shuffled twin, net and gross loads); `docs/log.md` 2026-11-03 (heaviest 31 % [29–32], picks 44 % against 6 %, per-layer 0.22–0.41; gross = net for heaviest and popular). Tables: `results/summary/shelf.json` (`R5`, `R6`), computed at commit d3c2b80; grade measured. The ratio 3.3 is 0.308 / 0.094 before rounding (derived). The listing is a re-statement of `bachelor/replay.py`'s popular policy, simplified to one pass.
:::

::: takeaway
- Popularity over the last 32 steps with hysteresis has the highest $\vfD$ everywhere and 2–4× fewer loads than over 8 steps.
- The touched LRU of the plan's loop is the worst: lift at most 2.7, 0.5–9 net loads per step.
- Loads are counted net, the dictionaries that stay on the shelf after the step.
:::
