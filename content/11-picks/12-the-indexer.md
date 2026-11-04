---
title: What the indexer can change
nav: The indexer
group: What it changes
lede: Exact attention is the ranking a trained indexer is taught to copy, and a trained one makes mistakes. Mistakes of one kind cut the hot cache's misses; mistakes of another kind multiply them. The same traces also say what a selection by fewer heads, or one selection shared by two layers, would change.
cards:
  - q: 'An indexer with recall 0.64 against exact attention: what does it do to the miss rate at B/k = 2?'
    a: 'It depends on the errors: drawn afresh each step they double it (×2.04); fixed per position they lower it (×0.85)'
    wrong: ["It always doubles it", "It always lowers it by a third", "Nothing; recall does not affect misses"]
    why: 'A persistent error keeps picking the same wrong positions, which then sit in the hot cache. A per-step error brings new positions at every step, and new positions miss.'
    sec: noise
  - q: What should a trained indexer for HiSparse-style serving be judged on, besides recall?
    a: How stable its picks are from step to step
    wrong: ["Only its recall", "Only its speed", "The number of its heads"]
    why: 'Two indexers with the same recall of 0.80 differ by a factor of 1.35 / 0.95 = 1.4 in misses. A plausible reason GLM-5.1 misses less than the stand-in is that its picks repeat more (70 % against 65 %).'
    sec: noise
  - q: How many of their top-512 picks do the Bachelor's two KV heads share?
    a: About 45 %
    wrong: ["About 95 %", "About 5 %", "All of them"]
    why: 'Each KV head''s own 6-query-head selection shares 71–74 % with the 12-head selection, and replayed it changes the miss rate by −1 to +6 %.'
    sec: heads-and-layers
  - q: GLM-5.1 picks once for a group of layers. How much of a layer's own top-512 does the selection of the layer below cover?
    a: About half (53 % of all picks; 44 % outside the sinks and the last 128 positions)
    wrong: ["All of it", "About 5 %", "About 90 %"]
    why: 'Adjacent layers share 53 % of their picks; layers two apart share 51 %. One selection for two layers covers about half of the second layer''s own choice.'
    sec: heads-and-layers
  - q: How do decode-like steps differ from the average step?
    a: They miss 1–9 % more, and their δ-miss fraction is 0.02–0.04 lower
    wrong: ["They never miss", "They miss twice as often", "They are identical"]
    why: 'Assistant text and tool calls are the tokens a server would generate; prefill queries stand in for decode queries everywhere else in this Part.'
    sec: decode-and-rows
---

The stand-in of [[#picks-the-bachelor/stand-in-rule]] ranks positions by the LLM's exact attention. A trained [[indexer]], DSA's lightning indexer or GLM-5.1's, is a separate small network trained to approximate that ranking ([[#papers-sparse-selectors]]), and it gets some picks wrong. Its recall, the share of the exact top-$\vk$ it finds, is the usual measure of its quality. For the [[hot-cache|hot cache]], recall is not enough.

## Two kinds of indexer error {#noise}

The replay simulated a noisy indexer by re-ranking each step's exact candidates with noise added to the log of their rank. Two brackets bound what a trained indexer could do.

1. **Per-step errors** (pessimistic): the noise of each position is drawn afresh at every step. The indexer's mistakes jitter.
2. **Persistent errors** (optimistic): the noise is drawn once per position and kept. The indexer makes the same mistakes every time.

```python a noisy indexer: the same recall, two kinds of error
import numpy as np

def noisy_picks(ranked, k, sigma, noise):
    """ranked: one step's candidate positions in exact rank order, best first.
    noise[j]: the error added to position j. Returns the noisy indexer's k picks."""
    r = np.arange(len(ranked))                                  # the exact rank of each candidate
    key = np.log(r + 1) + sigma * noise[ranked]
    return ranked[np.argsort(key, kind="stable")][:k]

rng = np.random.default_rng(0)
ranked, k, sigma = np.arange(64)[::-1], 8, 1.0     # toy: 64 candidates, exact order 63, 62, ...
fixed = rng.standard_normal(64)                    # persistent: drawn once per position
for step in range(2):
    fresh = rng.standard_normal(64)                # per step: drawn afresh at every step
    persistent = noisy_picks(ranked, k, sigma, fixed)
    per_step = noisy_picks(ranked, k, sigma, fresh)
    print(sorted(persistent.tolist()), sorted(per_step.tolist()))
# [12, 51, 54, 58, 59, 60, 61, 63] [41, 44, 51, 59, 60, 61, 62, 63]
# [12, 51, 54, 58, 59, 60, 61, 63] [31, 48, 50, 53, 58, 61, 62, 63]
```

In the toy the exact top 8 are positions 56 to 63. The persistent indexer picks 12, 51 and 54 wrongly at both steps; the per-step indexer picks 41 and 44 wrongly at the first step and 31, 48, 50 and 53 at the second. A wrong pick that recurs is a hit after its first step. A wrong pick that changes every step is a miss every time.

On the Bachelor, pin-scaled at $\vB/\vk = 2$, measured:

| recall of the noisy indexer (noise $\vsigma$) | 0.80 (0.5) | 0.64 (1) | 0.46 (2) |
|---|---|---|---|
| per-step errors: miss rate × | 1.35 | 2.04 | 2.83 |
| persistent errors: miss rate × | 0.95 | 0.85 | 0.71 |

A trained indexer whose mistakes are stable is friendlier to the hot cache than exact attention; one whose mistakes jitter is much worse. This is a plausible reason for GLM-5.1's lower miss rate: its picks repeat 70 % from step to step against the stand-in's 65 % ([[#picks-hot-cache/calibration]]).

::: figure fig-picks-noise picksNoise wide
**The miss rate of a noisy indexer against its recall.** Horizontal axis: recall, the share of the exact top-$\vk$ the noisy indexer picks (100 % at the left, falling to about 46 %). Vertical axis: the LRU miss rate relative to the exact stand-in's, pin-scaled ($\vk$ = 512). Two lines from the same dot (exact attention, 1×): errors drawn afresh at every step (rising) and errors fixed per position (falling), with the noise $\vsigma$ = 0.5, 1 and 2 marked. The dashed line is HiSparse's measured miss rate at the same $\vB/\vk$, relative to the stand-in's. The chooser sets $\vB/\vk$ to 1, 2 or 4; the readout gives the multipliers. Grade: measured.
:::

::: try
1. At $\vB/\vk = 2$, follow the falling line to $\vsigma = 2$. The persistent indexer, at recall 0.46, reaches HiSparse's line: 0.71 times the stand-in's 19.0 %, about 13.4 %.
2. Switch to $\vB/\vk = 4$. The two lines spread further apart.
:::

::: pull
At a recall of 0.64, errors fixed per position multiply the hot cache's misses by 0.85, and errors drawn afresh at every step multiply them by 2.04.
:::

::: takeaway
- At equal recall, per-step errors multiply the miss rate (×1.35 / 2.04 / 2.83 at recall 0.80 / 0.64 / 0.46) and persistent errors lower it (×0.95 / 0.85 / 0.71).
- For HiSparse-style serving a trained indexer is judged on recall and on stability.
:::

## Heads and layer groups {#heads-and-layers}

The stand-in averages the attention of all 12 query heads of a layer. The traces also ranked each layer by one KV head's 6 query heads alone, and compared the selections of adjacent layers. At $\vk$ = 512, `W = 0`, measured:

- **The two KV heads pick differently.** They share 45 % of their top-512 picks (233 [224–243] positions on average; 120 to 360 by layer).
- **Fewer heads change the misses little.** One KV head's 6-head selection shares 74 % (KV head 0) and 71 % (KV head 1) of the 12-head selection. Replayed, it changes the miss rate by +5–6 % (KV head 0) and −1–0 % (KV head 1). Ranking by the maximum over the 12 heads instead of the mean shares 87 % of the picks. More heads in the selection, as in V4's 64 indexer heads, need not mean more churn.
- **One selection for two layers covers half.** Adjacent layers share 53 % of their picks: 44 % outside the four sink positions and the last 128 positions. Layers two apart share 51 %. GLM-5.1 picks once for a group of layers ([[#landscape-sparse-attention]]): on the Bachelor, the selection of one layer covers about half of the next layer's own top-$\vk$.

::: takeaway
- The two KV heads share 45 % of their picks; a 6-head selection changes misses by −1 to +6 %.
- Adjacent layers share 53 % (44 % beyond sinks and recent positions): a shared selection covers about half of a layer's own.
:::

## Decode-like steps and squeezed rows {#decode-and-rows}

Two more checks on the stand-in's assumptions.

1. **Decode-like steps.** Every position of the dump is treated as a decode step, though most were shown to the LLM, not written by it. Counted over assistant text and tool calls only, the tokens a server would generate ([[#picks-the-bachelor/the-dump]]), the miss rate is 1–9 % higher than the average step's, and the δ-miss fraction of the shelf is 0.02–0.04 lower. Pin-absolute at $\vB/\vk = 4$ is the exception, with 32 % more misses.
2. **Squeezed rows.** The v4-scaled configuration picks 128 rows of 4 positions with a resident window of 32. Its miss rates, 33.4 / 17.9 / 9.6 % at $\vB/\vk$ = 1 / 2 / 4, are within 2 points of pin-scaled's, and 67 % of its picks repeat from step to step. These rows are squeezed scores; DeepSeek-V4 learns its row compression, and its rows may behave differently.

::: aside source Receipts
bachelor-kv at commit 8f5a471: `docs/results.md` §1 (decode-like steps, the v4-scaled row) and §2 (indexer errors R8, heads, layer groups); `docs/design.md` §3.1 (the noise brackets: re-rank the stored top candidates by `log(r + 1) + sigma * N(0, 1)` with `r` the exact rank, iid or persistent; recall = `len(noisy & exact) / k`). Details: `results/summary/hotcache.json` `R8c_probes` (6-head replays: ratios 1.051 / 1.060 / 1.062 for KV head 0) and `results/summary/attention.json` `R8a_aggregator_and_heads`, `R8b_adjacent_layers`, computed at commit d3c2b80; `docs/log.md` 2026-11-03 (233 [224–243], 120–360 by layer; pin-absolute decode-like +32 %). The listing is a toy; the replay re-ranks the stored top candidates of each step.
:::

::: takeaway
- Decode-like steps miss 1–9 % more and catch 0.02–0.04 less on the shelf.
- Squeezed rows of 4 miss within 2 points of single positions at the same share; they are squeezed scores, not V4's learned rows.
:::
