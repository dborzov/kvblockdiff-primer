---
title: 'The leak: hit rate is about queries'
nav: The leak
group: The argument, sorted
lede: HiSparse's hot cache serves 87 % of picks. Does that mean the cherries are alike? Build a world where they provably are not, and watch the hot cache hit just as often.
cards:
  - q: What does a high hot-cache hit rate tell you?
    a: That the query ranks the orchard at step t+1 much as it did at step t
    wrong: ["That neighbouring cherries hold similar numbers", "That the cherries compress well", "That the LLM's keys are low-rank"]
    why: Hits need stable rankings, and stable rankings need a slowly moving query. Nothing about the keys resembling each other is required.
    sec: what-it-measures
  - q: In the live Monte Carlo the keys are drawn independently at random. How well does a key predict the next one?
    a: Not at all; R² ≈ 0.000, so a neighbour saves no bits
    wrong: ["Perfectly, R² = 1", "About half, R² ≈ 0.5", "It depends on the query drift"]
    why: Independent keys share nothing. Yet with a slowly drifting query, overlap and hit rate look like HiSparse's.
    sec: monte-carlo
  - q: 'What controls the hit rate in the toy: the query drift η or the similarity of neighbouring keys?'
    a: The query drift η
    wrong: ["The similarity of neighbouring keys", "Both equally", "Neither; it is fixed by k"]
    why: Switching to keys that are close copies of their neighbours (R² ≈ 0.9) leaves the hit-rate curve almost unchanged; moving η changes it completely.
    sec: monte-carlo
  - q: Can the leak be closed by a measurement?
    a: No; it is a demonstration that the inference is invalid, and the bytes must be measured on their own
    wrong: ["Yes, by measuring HiSparse's hit rate more precisely", "Yes, by a larger hot cache", "Yes, by a shuffle control on the hit rate"]
    why: The toy proves that hits do not imply alike bytes. The campaigns then measured the bytes directly, and found structure that came from echoes, not from the query.
    sec: verdict
---

The jump at the end of [[#hypotheses-the-ladder]] went like this: HiSparse hits 87 % of the time, so the cherries must be alike, so stretch dictionaries will work. It borrows a real, measured number. The question is what that number is evidence *of*.

## What a hit rate measures {#what-it-measures}

::: define leak
- **What it is.** The flaw in the intuitive argument: HiSparse's high hit rates follow from slowly drifting queries and say nothing about whether the picked cherries' bytes are alike. A Monte Carlo with independent keys reproduces the hit rates with zero compressibility.
- **Mnemonic.** The argument held water up to this point and leaks here.
- **Easy to confuse with** a claim that the orchard is incompressible. The leak says only that the hit rate is not the evidence; the bytes had to be measured on their own, and were.
:::

A hit happens when the [[indexer]] names, at step $\vt+1$, a position it named recently. The indexer scores every past position against the current query $\vq$ and keeps the top $\vk$, `S = indexer_topk(q_idx, K_idx, k)` ([[#landscape-sparse-attention]]). So a high hit rate means the query at step $\vt+1$ **ranks** the orchard much as the query at step $\vt$ did, which happens when the query **moves slowly**: the token being written now is about the same thing as the token a moment ago.

Nothing in that chain requires the stored keys to resemble *each other*. A slowly turning searchlight lights up mostly the same trees from one second to the next, whether the forest is a tidy plantation or a random tangle.

::: aside reminder The Lucky Louis property
From one decode step to the next, the indexer re-picks mostly the same positions, so a cache that bets on last round's winners keeps winning. HiSparse measured it on GLM-5.1: an LRU hot cache of 4096 slots ($\vB = 2\vk$) misses 13.4 % of picks; keeping only the current top-$\vk$ misses 30 % ([[#landscape-lucky-louis]]). It is about *which* picks are wanted.
:::

::: takeaway
- A hit rate measures how stable the indexer's ranking is from step to step.
- Stable ranking needs a slowly moving query, not alike keys.
:::

## A world with nothing to compress {#monte-carlo}

Make that exact with a [[monte-carlo]] experiment. Draw 4096 keys of $\vd = 32$ elements, every element an independent [[gaussian]] number. No key says anything about its neighbour: [[fallen-apple]] similarity is exactly zero, by construction. Then let a query wander. At each step it takes a small random step on the unit sphere, of size $\veta$, the **query drift**, and picks its top 64 keys. A HiSparse-style hot cache of $\vB = 128 = 2\vk$ slots serves the picks.

::: figure fig-hyp-leak leakSim wide
**The leak, live.** A Monte Carlo run in your browser: 4096 keys of 32 independent Gaussian elements, a query doing a random walk on the unit sphere with step $\veta$ (slider, log scale), top-64 picks per step, an LRU hot cache of 128 slots resolved as in HiSparse; 260 steps, the first 60 discarded as warm-up. Left: the positions picked over 80 steps; a horizontal streak is a key picked again and again. Right: consecutive-pick overlap (green) and hot-cache hit rate (orange) against $\veta$, one run per marked point; the vertical line is the slider's $\veta$; thin dark dashed lines are the same curves for the other kind of keys (they nearly coincide); the dotted horizontal rules are HiSparse's measured numbers, 87 % hits and 70 % overlap. Tiles: overlap and hit rate at the chosen $\veta$, and the keys' neighbour predictability, the [[r-squared|R²]] of each element from the same element of the previous key, averaged over the 32 furrows, with the bits per element a neighbour could save at the exchange rate of [[#school-exchange-rate]]. The switch replaces the keys by keys that are each a close copy of the one before. Seeded, so the numbers repeat.
:::

::: try
1. Leave $\veta$ at 0.25. The overlap (76 %) and the hit rate (86 %) sit near HiSparse's 70 % and 87 %, from keys whose neighbour R² is 0.000.
2. Slide $\veta$ down to 0.05: 95 % of picks repeat. Up to 1: the hit rate falls to 37 %. The query's speed is the dial.
3. Switch to keys that are close copies of their neighbours. R² jumps to 0.90, about 1.66 bits per element a neighbour could save, and the hit-rate curve barely moves.
:::

```python HiSparse-like hit rates from keys with nothing to compress
import numpy as np
rng = np.random.default_rng(1)
d, n, k, B, eta = 32, 4096, 64, 128, 0.25
keys = rng.standard_normal((n, d))                  # independent: no key says anything about its neighbour
q = rng.standard_normal(d); q /= np.linalg.norm(q)
cache, prev, overlap, hits = [], set(), [], []
for step in range(260):
    q += eta * rng.standard_normal(d) / np.sqrt(d); q /= np.linalg.norm(q)   # the query drifts
    S = set(np.argpartition(-(keys @ q), k)[:k].tolist())                  # the indexer: top-k picks
    hit = S & set(cache)
    if step >= 60: overlap.append(len(S & prev) / k); hits.append(len(hit) / k)
    for p in S - hit:                                                        # HiSparse-style LRU with a guard
        if len(cache) >= B: cache.remove(next(v for v in cache if v not in S))
        cache.append(p)
    for p in hit: cache.remove(p); cache.append(p)
    prev = S
r2 = np.mean([np.corrcoef(keys[:-1, c], keys[1:, c])[0, 1] ** 2 for c in range(d)])
print(f"overlap {np.mean(overlap):.2f}  LRU hit rate {np.mean(hits):.2f}  neighbour R² {r2:.4f}")
```

It prints `overlap 0.75  LRU hit rate 0.86  neighbour R² 0.0003`: HiSparse-like caching from keys that cannot be compressed by a single bit. Across the figure's runs, any drift between 0.2 and 0.4 gives an overlap of 63 to 80 % and a hit rate of 74 to 90 %.

The switch in the figure shows the converse too. Make every key a close copy of the one before it, and the orchard becomes very compressible, yet the hit-rate curve hardly changes. Turn the drift up on that compressible orchard, and it caches badly.

:::: compare Two dials, two properties
::: col Lucky Louis (caching)
- Produced by the **query's motion** from step to step.
- Dial: the drift $\veta$.
- Measured by HiSparse on a real trace.
:::
::: col Neighbour similarity (compression)
- Produced by the **stored bytes' statistics**.
- Dial: how well a cherry predicts its neighbour.
- Measured by the campaigns on real values, with a shuffle control.
:::
::::

::: theme which-vs-what
Here the theme is a simulation you can run. Which positions are picked (the dial $\veta$) and what is stored at them (the keys' R²) move independently.
:::

Two caveats keep this honest. Real keys are not independent Gaussians, so the toy proves only that the inference is *invalid*, not that real cherries are incompressible. And the toy's drift is a free knob; for a real LLM it is set by how fast the hidden state turns. Neither caveat rescues the jump.

::: takeaway
- Independent keys plus a slowly drifting query give HiSparse-like overlap and hit rates with R² ≈ 0: nothing to compress.
- Caching is set by the query's drift, compression by the bytes' statistics; either can hold without the other.
:::

## Verdict {#verdict}

The leak is not a hypothesis and no measurement closes it: it is a demonstration that one inference is invalid, and it stands. What it demanded was done. The campaigns measured the bytes directly, with no indexer and no hit rate in sight, and found 1.14 bits per element over solo at stretch scope, made of echoes and the stereo map ([[#hypotheses-echo]], [[#hypotheses-stereo]]), each certified by the [[shuffle-control]] rather than by any cache statistic ([[#measured-two-kinds-of-structure]]).

The one thing a pick trace on the same data could add is the other corner of the table: whether the slow query of a real sequence lands its misses on the cherries that happen to be cheap. That is the replay of [[#plan-queries-and-picks]] and [[#plan-hot-cache-replay]], and it is unmeasured on the Bench.

::: takeaway
- The jump does not hold; HiSparse measured the first property, not the second.
- The second was measured on its own, and the structure found came from repeats, not from the query.
:::
