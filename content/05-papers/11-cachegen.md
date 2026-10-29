---
title: CacheGen (2024)
nav: CacheGen
lede: Ship a long context's KV cache over the network instead of recomputing it — as differences from an anchor token, rounded and arithmetic-coded. Lossy, but its starting observation is the closest thing in print to a measurement of fallen-apple similarity.
group: Lossy KV compression
cards:
  - q: In CacheGen, what is each non-anchor token stored as?
    a: Its difference from the first token of its group of 10 (the anchor), same layer and channel
    wrong: ["Its difference from the immediately preceding token", "Its difference from the layer below", "Its index in a codebook"]
    why: Referencing one shared anchor lets all nine differences be computed and decoded in parallel. The first draft of this proposal said "adjacent-token deltas"; that was not quite right.
    sec: what
  - q: CacheGen's arithmetic coder uses a separate probability table per (layer, channel). In this site's words, what is that?
    a: Per-channel histograms — the context-free per-channel code
    wrong: ["A block dictionary", "A KLT basis", "A VQ codebook"]
    why: CacheGen found that grouping numbers by channel and layer lowers entropy more than grouping by token position — the same reason a global per-channel code is our baseline.
    sec: what
  - q: Subtracting a neighbour that carries its own independent noise does what to the noise variance?
    a: Doubles it
    wrong: ["Halves it", "Leaves it unchanged", "Removes it"]
    why: The difference of two numbers with independent noise of variance σ² has noise variance 2σ². Differencing pays off only when slow drift dominates the fast noise.
    sec: ratio
  - q: If the deltas' 2.4× smaller variance is measured against each channel's own typical value, at least how much of a channel's variance must be slow drift?
    a: About 79 %
    wrong: ["About 24 %", "About 50 %", "About 99 %"]
    why: The difference keeps at least twice the noise, so 2(1−f) ≤ 1/2.4, which gives f ≥ 0.79.
    sec: ratio
  - q: CacheGen's anchor groups have the shape of which kv-blockdiff object?
    a: A block of 10 tokens whose dictionary is one entry (the anchor)
    wrong: ["A hot cache of 10 slots", "A victim tier", "A global codebook"]
    why: Every token is rebuilt from the anchor plus its own difference — a block dictionary of weight 1 with b = 10. The arithmetic coder then turns each chunk into a stream.
    sec: connections
---

A chatbot is asked about a 100-page contract it has seen before. Its KV cache for those pages exists already, on a storage server. Fetching the cache over the network beats recomputing it — if the network is fast enough. CacheGen's job is to make the cache small enough to fetch.

Here is one [[channel]] of a toy cache, for the ten tokens of one group:

| token | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| value | 2.31 | 2.45 | 2.38 | 2.52 | 2.60 | 2.49 | 2.66 | 2.71 | 2.63 | 2.80 |
| minus token 0 | 0 | 0.14 | 0.07 | 0.21 | 0.29 | 0.18 | 0.35 | 0.40 | 0.32 | 0.49 |
| minus the token before | — | 0.14 | −0.07 | 0.14 | 0.08 | −0.11 | 0.17 | 0.05 | −0.08 | 0.17 |

Notice anything? The values creep upward. Differences from the token just before stay small. Differences from token 0 grow with distance — but stay smaller than the values themselves. CacheGen's starting point is exactly this: within one layer and one channel, nearby tokens have similar values.

## What CacheGen does, in our words {#what}

CacheGen ([[lossy]]) encodes a cache in four moves.

1. **Anchors and differences.** The tokens are cut into groups of 10. The first token of each group, the *anchor*, is stored on its own. Every other token is stored as its difference from the anchor — same [[layer]], same channel, at token distances $\vgap$ from 1 to 9. Because every difference refers to the same anchor, all nine can be computed and decoded in parallel.
2. **Round the differences**, more coarsely in some layers than in others: layers differ in how much rounding the model tolerates.
3. **Arithmetic-code** the rounded numbers, with a separate probability table for every (layer, channel) pair. CacheGen observed that grouping numbers by channel and layer lowers their entropy much more than grouping them by token position. In our words, these are per-channel histograms — the same idea as the context-free per-channel code that is our baseline ([[#homework-solo-coding]]).
4. **Adapt to the network.** The context is cut into chunks, each encoded at several quality levels; for each chunk the sender picks the level that fits the bandwidth, or sends the text to be recomputed.

::: note numbers The numbers we use
| what | value | source |
|---|---|---|
| differences vs values | variance of the deltas 2.4–2.9× lower than that of the original values | paper's first insight, via search excerpts |
| cache size | 3.5–4.3× smaller than recent KV-reuse systems that use quantization | abstract |
| delay | 3.2–3.7× less time to fetch and process the context | abstract |
| group size | 10 tokens per anchor | paper, via search excerpts |

Yuhan Liu, Junchen Jiang and twelve co-authors (University of Chicago, Microsoft, Stanford), SIGCOMM 2024, arXiv:2310.07240.
:::

::: takeaway
- CacheGen stores anchors plus differences from the anchor (not from the previous token), rounds them, and arithmetic-codes them per (layer, channel).
- Its first observation — nearby tokens are alike within a channel — is fallen-apple similarity, measured as variance.
:::

## What a 2.4× smaller variance could mean {#ratio}

The 2.4–2.9× sounds like [[fallen-apple]] similarity measured at last. In bits, if the differences were bell-shaped, it would be worth $\tfrac12\log_2 2.4 \approx 0.63$ to $\tfrac12\log_2 2.9 \approx 0.77$ bits per number. But "lower than the original values" hides the question that decides everything: **lower than the values measured how?**

- If the variance of the original values is pooled over all channels, much of it is just channels sitting at different levels — something a per-channel code prices in without looking at any neighbour. Then the ratio says nothing about neighbours.
- If it is each channel's spread around its *own* typical value, the ratio is real evidence — and it tells us something strong about the drift, because a difference carries the noise of *both* tokens:

$$
\underbrace{\vsigma^2_{\text{diff}}}_{\text{difference to a neighbour}} \;\geq\; 2\,\underbrace{\vsigma^2_{\text{fast}}}_{\text{token-to-token noise}}
\quad\Rightarrow\quad
\text{ratio of } 2.4 \text{ needs } \frac{\vsigma^2_{\text{fast}}}{\vsigma^2} \leq \frac{1}{2 \times 2.4} \approx 21\,\%
$$ {#eq-pb-cachegen-bound}

So at least 79 % of each channel's variance (83 % for 2.9×) would have to be slow drift. Play with that trade below.

::: figure fig-pb-cachegen-delta pbCachegenDelta
**One channel of a toy cache, and three ways to predict it.** Top: 60 tokens of one channel (lapis), made of a slow random drift plus independent token-to-token noise around a typical value of 2 (dashed line). Dotted lines mark groups of 10; vermilion dots are the anchors. Bottom: the variance of three residuals as a share of the channel's own variance — around the typical value (what a per-channel dictionary leaves), minus the previous token, and minus the group's anchor (CacheGen), averaged over distances 1 to 9. The bars are exact for this model of drift plus noise; the top series is one seeded sample of it. The slider sets the share of the variance that is slow drift; the buttons set how slowly the drift moves (its correlation time in tokens). The read-out converts the variances into bits per number with $\tfrac12\log_2$ of the ratio, as for bell-shaped residuals.
:::

::: try
1. Drift 85 %, 100 tokens: the anchor residual keeps 0.38 of the variance — a ratio of 2.6×, inside CacheGen's range.
2. Lower the drift share to 50 %. Both differences now cost *more* than the distance to the typical value: subtracting a noisy neighbour doubles its noise.
3. Drift 85 % but moving fast (10 tokens): the anchor drifts away from later tokens of its group, and the previous token wins.
:::

::: note warning Where we are not convinced
- **The baseline of the 2.4–2.9× is not clear** from what we could read — pooled or per channel, 16-bit or rounded.
- **No shuffle control.** The comparison that would make the observation a measurement is the same statistic on tokens shuffled across texts.
- **Three steps, one number.** The 3.5–4.3× mixes differences, layer-wise rounding and arithmetic coding against other lossy systems. We did not find, in what we could read, an ablation that isolates what the differences alone buy.
:::

::: takeaway
- Per channel, a difference to a neighbour beats the channel's typical value only if slow drift dominates the fast noise.
- If CacheGen's ratio is per channel, 79–83 % of the variance would be slow drift — strong, checkable, and not yet checked at 8 bits.
:::

## Connections {#connections}

::: theme access-pattern
CacheGen's anchor groups have exactly the shape a random-access store wants: any token is rebuilt from two things, its group's anchor and its own difference. In kv-blockdiff's words that is a [[block]] of $\vb = 10$ whose dictionary is one entry ([[weight]] $\vw = 1$). Then the arithmetic coder strings each chunk into a stream that must be decoded from its start — right for a network fetch of a whole context, wrong for scattered single-entry reads.
:::

:::: compare Two network-path coders that exploit the token axis
::: col CacheGen
- Lossy: differences rounded per layer.
- Prediction: the anchor of a group of 10.
- Coder: arithmetic coding per (layer, channel).
:::
::: col KV-Codec
- Lossy too: rounds to integers first, then codes them exactly.
- Prediction: the previous token (a video coder's previous frame) and neighbouring channels.
- Coder: a hardware H.265 video coder. See [[#papers-kv-codec]].
:::
::::

- Predicting a token by another token is our sibling dictionary — cheap side information, but the noise doubles: [[#homework-sib]].
- The measurement CacheGen's insight calls for — bits versus token distance, at 8 bits, with a shuffle control — is framework A of the plan: [[#questions-framework-a]].

::: takeaway
- CacheGen's layout is kv-blockdiff-shaped (block of 10, dictionary of one entry); its coder is a stream.
- Its insight is the strongest published hint of fallen-apple similarity — and needs a shuffle control and an 8-bit grid before it counts.
:::
