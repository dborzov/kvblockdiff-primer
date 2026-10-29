---
title: 'The leak: hit rate is about queries'
nav: 'The leak: hit rate is about queries'
lede: HiSparse's hot cache serves 87 % of selections. Does that mean the entries are alike? Build a world where they provably are not — and watch the hot cache hit just as often.
group: The cat-thread ladder
cards:
  - q: What does a high hot-cache hit rate tell us?
    a: That the query ranks the history at step t+1 much as it did at step t
    wrong: ["That neighbouring entries hold similar numbers", "That the entries compress well", "That the model's keys are low-rank"]
    why: Hits need stable rankings, and stable rankings need a slowly moving query. Nothing about the keys resembling each other is required.
    sec: what-it-measures
  - q: In the live Monte Carlo, the keys are drawn independently at random. How well does a key predict the next one?
    a: Not at all — R² ≈ 0.000, so a neighbour saves no bits
    wrong: ["Perfectly — R² = 1", "About half — R² ≈ 0.5", "It depends on the query drift"]
    why: Independent keys share nothing. Yet with a slowly drifting query, overlap and hit rate look like HiSparse's.
    sec: monte-carlo
  - q: 'What controls the hit rate in the toy: the query drift η or the similarity of neighbouring keys?'
    a: The query drift η
    wrong: ["The similarity of neighbouring keys", "Both equally", "Neither — it is fixed by k"]
    why: Switching to keys that are close copies of their neighbours (R² ≈ 0.9) leaves the hit-rate curve almost unchanged; moving η changes it completely.
    sec: two-dials
  - q: Can a history compress well and still cache badly?
    a: Yes — near-identical keys with a fast-moving query
    wrong: ["No — compressible histories always cache well", "Only if the hot cache is tiny", "Only for values, not keys"]
    why: The two properties are produced by different things — the keys' statistics and the query's motion — and either can hold without the other.
    sec: two-dials
---

The jump at the end of [[#idea-cat-thread-ladder]] went like this: HiSparse hits 87 % of the time, so the entries must be alike, so block dictionaries will work. It borrows a real, measured number. The question is what that number is evidence *of*.

## What a hit rate measures {#what-it-measures}

A hit happens when the [[indexer]] selects, at step $\vt+1$, an entry it selected recently. The indexer selects by scoring every past position against the current step's query $\vq$ and keeping the top $\vk$ (see [[#landscape-sparse-attention]]). So a high hit rate means:

- the query at step $\vt+1$ **ranks** the history much as the query at step $\vt$ did;
- which happens when the query **moves slowly** — when the token being written now is about the same thing as the token a moment ago.

Nothing in that chain requires the stored keys to resemble *each other*. A slowly turning searchlight lights up mostly the same trees from one second to the next, whether the forest is a tidy plantation or a random tangle.

::: aside reminder The Lucky Louis property
From one decode step to the next, the indexer re-selects mostly the same positions, so a cache that bets on last round's winners keeps winning. HiSparse measured it on GLM-5.1: an LRU hot cache of 4,096 slots ($\vB = 2\vk$) misses 13.4 % of selections; keeping only the current top-$\vk$ misses 30 % ([[#landscape-lucky-louis]]). It is about *which* entries are wanted.
:::

::: takeaway
- A hit rate measures how stable the indexer's ranking is from step to step.
- Stable ranking needs a slowly moving query, not alike keys.
:::

## A world with nothing to compress {#monte-carlo}

Make that exact with a [[monte-carlo]] experiment. Draw 4,096 keys of $\vd = 32$ elements, every element an independent [[gaussian]] number. No key says anything about its neighbour: [[fallen-apple]] similarity is exactly zero, by construction. Then let a query wander. At each step it takes a small random step on the unit sphere — the step's size is the **query drift** $\veta$ — and selects its top 64 keys. A HiSparse-style hot cache of $\vB = 128 = 2\vk$ slots serves the selections.

::: figure fig-idea-leak leakSim wide
**The leak, live.** A [[monte-carlo]] run in your browser: 4,096 keys of 32 independent Gaussian elements, a query doing a random walk on the unit sphere with step $\veta$ (slider, log scale), top-64 selection per step, an LRU hot cache of 128 slots resolved as in HiSparse; 260 steps, the first 60 discarded as warm-up. Left: the positions selected over 80 steps — a horizontal streak is a key selected again and again. Right: consecutive-selection overlap (green) and hot-cache hit rate (orange) against $\veta$, one run per marked point; the vertical line is the slider's $\veta$; grey dashed lines are the same curves for the other kind of keys; the horizontal rules are HiSparse's measured numbers. Tiles: overlap and hit rate at the chosen $\veta$, and the keys' neighbour predictability — the [[r-squared|R²]] of each element from the same element of the previous key, averaged over the 32 channels — with the bits per element a neighbour could save at the exchange rate of II.12. The switch replaces the keys by keys that are each a close copy of the one before. Seeded, so the numbers repeat; "computing…" shows while runs are in progress.
:::

::: try
1. Leave $\veta$ at 0.25. The overlap (76 %) and the hit rate (86 %) sit near HiSparse's 70 % and 87 % — from keys whose neighbour R² is 0.000.
2. Slide $\veta$ down to 0.05: 95 % of selections repeat. Up to 1: the hit rate falls to 37 %. The query's speed is the dial.
3. Switch to keys that are close copies of their neighbours. R² jumps to 0.90 — about 1.66 bits per element a neighbour could save — and the hit-rate curve barely moves.
:::

The same experiment fits in a few lines of numpy:

```python HiSparse-like hit rates from keys with nothing to compress
import numpy as np
rng = np.random.default_rng(1)
d, n, k, B, eta = 32, 4096, 64, 128, 0.25
keys = rng.standard_normal((n, d))                  # i.i.d.: no key says anything about its neighbour
q = rng.standard_normal(d); q /= np.linalg.norm(q)
cache, prev, overlap, hits = [], set(), [], []
for step in range(260):
    q += eta * rng.standard_normal(d) / np.sqrt(d); q /= np.linalg.norm(q)   # the query drifts
    S = set(np.argpartition(-(keys @ q), k)[:k].tolist())                  # top-k selection
    hit = S & set(cache)
    if step >= 60: overlap.append(len(S & prev) / k); hits.append(len(hit) / k)
    for p in S - hit:                                                        # HiSparse-style LRU
        if len(cache) >= B: cache.remove(next(v for v in cache if v not in S))
        cache.append(p)
    for p in hit: cache.remove(p); cache.append(p)
    prev = S
r2 = np.mean([np.corrcoef(keys[:-1, c], keys[1:, c])[0, 1] ** 2 for c in range(d)])
print(f"overlap {np.mean(overlap):.2f}  LRU hit rate {np.mean(hits):.2f}  neighbour R² {r2:.4f}")
```

It prints `overlap 0.75  LRU hit rate 0.86  neighbour R² 0.0003` — HiSparse-like caching from keys that cannot be compressed by a single bit. (Its random numbers differ from the figure's, so the last digit can differ too.) Across the figure's runs, any drift between 0.2 and 0.4 gives an overlap of 63–80 % and a hit rate of 74–90 %.

::: takeaway
- Independent random keys plus a slowly drifting query give HiSparse-like overlap and hit rates.
- The keys' neighbour predictability is R² ≈ 0: nothing to compress.
- So the hit rate is no evidence for fallen-apple similarity.
:::

## Two dials, two properties {#two-dials}

The switch in the figure shows the converse too. Make every key a close copy of the one before it, and the history becomes very compressible — yet the hit-rate curve hardly changes. Turn the query drift up on that compressible history, and it caches badly.

:::: compare Two properties, two causes
::: col Lucky Louis (caching)
- Produced by the **query's motion** from step to step.
- Dial: the drift $\veta$.
- Measured by HiSparse on a real trace.
:::
::: col Fallen-apple similarity (compression)
- Produced by the **keys' and values' statistics**.
- Dial: how well an entry predicts its neighbour.
- Not measured by anyone at 8 bits.
:::
::::

::: theme which-vs-what
Here the theme is a simulation you can run. Which entries are wanted (the dial $\veta$) and what is inside them (the keys' R²) move independently. Evidence for one is no evidence for the other.
:::

Two caveats keep this honest. Real keys are not independent Gaussians, so the toy proves only that the inference is *invalid*, not that real entries are incompressible. And the toy's query drift is a free knob; for a real model it is set by how fast the hidden state turns. Neither caveat rescues the jump. The project's prior must come from somewhere else — from the reports of structure in keys ([[#idea-fallen-apple]]) — and the project exists to replace that prior with a measurement.

::: takeaway
- Caching is set by the query's drift; compression by the entries' statistics. Either can hold without the other.
- The jump in the cat-thread argument does not hold: HiSparse measured the first property, not the second.
- The second must be measured on its own — that is wave 1 ([[#plan-experiment-1a]]).
:::
