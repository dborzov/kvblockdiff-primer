---
title: Stereo similarity (head axis)
nav: Stereo similarity
group: The hypotheses
lede: Hold a stereo pair of photographs. Pixel for pixel the two pictures disagree; object for object they agree completely. The two KV heads of a layer are that pair. Element for element they share a cosine of 0.05, yet joining them into one cherry was the strongest structure the campaigns measured.
cards:
  - q: The same element in the two KV heads of a layer has a cosine of about 0.05, and copying head 0 onto head 1 is worse than guessing the mean. Do the heads share information?
    a: Yes, 0.85 bit per element raw; token-to-token distances correlate up to 0.92 across heads, so they are two views of one vector
    wrong: ["No, a cosine of 0.05 means independent", "Only at the first KV layer", "Only after a rotation aligns them"]
    why: Cosine compares element c with element c. A linear picture of head 1 from all of head 0 is what the bits count, and it is a property of the LLM's weights.
    sec: two-views
  - q: What did joining the two heads into one v[t, l, :, :] cherry save, on the same window?
    a: 0.0322 ± 0.0009 of ratio, 20 of 20 sequences
    wrong: ["0.0043 of ratio", "0.85 of ratio", "Nothing verified"]
    why: About 37 times its spread over sequences; 0.26 bit per element of ratio, from a bound of 0.85 bit shared.
    sec: in-bits
  - q: Why does the shared information fall from 0.85 to 0.21 bit when each head gets its own reference cherry?
    a: Two different earlier tokens no longer line up, so the heads' residuals stop sharing what the references already explained
    wrong: ["Because the second reference costs 0.64 bit", "Because head 1 is noise after a reference", "Because the bound only holds for one head"]
    why: One reference serving both heads keeps 0.54 bit in common; separate references keep 0.21. One reference per token per layer is the natural unit.
    sec: in-bits
  - q: A serving design fetches each KV head of a layer as its own pick. What does stereo similarity say about it?
    a: It pays for the 0.85 bit the heads share unless its dictionary carries the other head; a design whose picks cover both heads gets the saving for free
    wrong: ["Nothing, picks are about the indexer", "It saves more, because cherries are smaller", "It must use a cosine threshold"]
    why: The saving exists only inside a cherry or a dictionary that holds both views. The cherry shape decides who gets it.
    sec: in-bits
  - q: Which stereo questions are still unmeasured?
    a: 'Stereo on keys, their two heads joined under the frontier compressor, and stereo across layers, a map from one layer''s cherry into another''s'
    wrong: ["Whether the two heads share anything at all", "Whether the join holds on more than one sequence", "Whether the cosine between the heads is really near zero"]
    why: 'The join is 20 of 20 sequences and the cosine rests on 36 punnets; what is open is keys, whose heads were coded jointly for one night only, and the cross-layer map.'
    sec: verdict
---

In the `decode_step` listing of [[#landscape-attention]] one token's values at one layer are made in one line, `val = (x @ W.v[layer_id]).reshape(n_kv_heads, head_dim)`: one hidden state, one matrix, then cut into `n_kv_heads` pieces. On [[bench|the Bench]] that is two pieces of 256, [[~v-one-head|v[t, l, 0, :]]] and [[~v-one-head|v[t, l, 1, :]]]. They come from the same `x`. Do they share anything a compressor can use?

The first campaign looked at the obvious statistic and said no. The second looked at the bits and found the strongest structure in the orchard.

## Two views of one vector {#two-views}

::: define stereo
- **What it is.** The two KV heads of a layer at one token are two views of one vector: `v[t, l, 0, :]` and `v[t, l, 1, :]` are two linear pictures of the same hidden state, so each predicts the other through a fixed linear map, though element for element they look unrelated. A hypothesis about the `head_id` axis.
- **Mnemonic.** A stereo pair: pixel for pixel different, object for object the same scene.
- **Status.** Measured: joining the heads into one cherry saves 0.0322 of ratio, with a bound of 0.85 bit per element in common. The strongest structure the campaigns found.
:::

Three measured facts, values of Qwen3.5-2B, 36 punnets of two sequences, that look like a contradiction:

| statistic | reading |
|---|---|
| cosine between element $\vc$ of head 0 and element $\vc$ of head 1, median over elements | 0.04 to 0.06 at every KV layer |
| [[r-squared|R²]] of copying head 0 onto head 1 as a prediction | −0.74 to −1.30: worse than guessing the mean |
| correlation of token-to-token distances: are two tokens far apart in head 0 also far apart in head 1? | 0.25 at KV layer 0, rising to 0.92 at KV layer 4 |

Element 32 of head 0 has nothing to do with element 32 of head 1. But the *geometry* agrees: whatever makes two tokens distant in one head makes them distant in the other. That is what two projections of one vector look like. A toy makes it exact:

```python two random pictures of one hidden vector, with noise
import numpy as np
rng = np.random.default_rng(0)
n, dz, d = 4096, 64, 256
z  = rng.standard_normal((n, dz))                       # one hidden vector per token (toy: 64 dimensions)
A, B = rng.standard_normal((dz, d)), rng.standard_normal((dz, d))
h0 = z @ A + 2 * rng.standard_normal((n, d))            # head 0: one projection, plus noise
h1 = z @ B + 2 * rng.standard_normal((n, d))            # head 1: another projection of the same z
cos = np.mean([h0[:, c] @ h1[:, c] / np.linalg.norm(h0[:, c]) / np.linalg.norm(h1[:, c]) for c in range(d)])
r2_copy = 1 - ((h1 - h0) ** 2).sum() / ((h1 - h1.mean(0)) ** 2).sum()
i = rng.integers(0, n, (2000, 2))                        # 2000 random token pairs
d0 = np.linalg.norm(h0[i[:, 0]] - h0[i[:, 1]], axis=1); d1 = np.linalg.norm(h1[i[:, 0]] - h1[i[:, 1]], axis=1)
corr = np.corrcoef(d0, d1)[0, 1]
M, *_ = np.linalg.lstsq(h0[:2048], h1[:2048], rcond=None)   # a linear picture of head 1 from head 0, fit on half
r2_map = 1 - ((h1[2048:] - h0[2048:] @ M) ** 2).sum() / ((h1[2048:] - h1[2048:].mean(0)) ** 2).sum()
print(f"cosine per element {cos:.2f}  R² of copying {r2_copy:.2f}  distance correlation {corr:.2f}  R² of the map {r2_map:.2f}")
```

It prints `cosine per element 0.01  R² of copying -0.98  distance correlation 0.80  R² of the map 0.91`. Same three symptoms as the data, and a cure: a map from all of head 0 to all of head 1 explains 91 % of head 1, worth $\tfrac12\log_2\frac{1}{1-0.91} \approx 1.7$ bits per element at the exchange rate of [[#school-exchange-rate]]. The toy's numbers are the toy's; the shape is the point.

The real map is not a toy's. At KV layer 4 the campaign's linear prediction across elements ([[#toolbox-linear-prediction]]), offered every element of a token as a possible term, kept 4 103 terms inside head 0 and 29 835 from head 0 into head 1: head 0 explains 73 % of head 1's residual variance there, and a map fit on *another* sequence recovers 91 to 96 % of the gain. The link between the heads is a property of `W.v[layer_id]`, not of the text.

::: takeaway
- Element for element the heads are strangers (cosine 0.05, copying worse than the mean); token for token they agree (distances correlate up to 0.92).
- Two projections of one hidden state behave exactly so; a linear map, not a copy, is what connects them.
:::

## In bits {#in-bits}

::: figure fig-hypotheses-stereo hypStereo wide
**Two views of one vector.** Left: a seeded toy of the two heads' elements for one `elem_id` (slider), drawn as element against element: the cosine is near zero; and as token-to-token distances in head 0 against head 1, which line up. Right: the three code-length bounds on four punnets, bits per element shared by the two heads (0.85 raw; 0.54 after one reference cherry serves both; 0.21 with a reference per head), and the measured join on the same window of 20 sequences: cherry `v[t, l, h, :]` at 0.6604 against `v[t, l, :, :]` at 0.6281 ± 0.0009. Data: `figures/data/measured-splits.json`.
:::

Why does a cosine near zero hide bits? Because cosine compares element $\vc$ with element $\vc$, one furrow against one furrow, and the information runs *across* furrows: element 57 of head 1 is a weighted sum of many elements of head 0 ([[#hypotheses-bits-are-the-unit]]). A lossless compressor that may see head 0 while coding head 1 can use that sum; a cosine never looks for it.

How a scenario measures it ([[#scenario-why-vary]]): the same slice, two cherry shapes, the same compressor, the same elements. With `cherry(t) = v[t, l, h, :]` (256 elements) the receiver may ask for head 1 without head 0, so head 1 must be coded alone. With `v[t, l, :, :]` the compressor codes head 0 first and may predict head 1 from it. A wider cherry can always run the narrower compressor inside, so the gap is a lower bound on what the heads share.

| what was measured | reading | grade |
|---|---|---|
| ratio with `v[t, l, h, :]` cherries, compressor 102, 20 windows | 0.6604 | encoded bytes, one window per sequence |
| ratio with `v[t, l, :, :]` cherries, same compressor, same elements | 0.6281 | encoded bytes |
| the join saves | 0.0322 ± 0.0009 of ratio, 20 of 20 sequences, about 37 times its spread | paired, 20 sequences |
| bits the heads share, raw | 0.85 per element | code length, 4 punnets |
| after one reference cherry serves both heads | 0.54 | code length, 4 punnets |
| after each head gets its own reference cherry | 0.21 | code length, 4 punnets |
| of head 1's plateau after its reference, visible in head 0 at KV layers 1, 2, 4 | 66 to 70 % | code length |

The three bound numbers tell the story of the join. Raw, the heads share 0.85 bit per element. A [[reference-cherry]], an earlier token that both heads are predicted from, explains part of what they had in common, leaving 0.54. Give each head its own reference and only 0.21 remains, because two different earlier tokens no longer line up. So the natural unit is one reference per token per layer, serving both heads, and a `v[t, l, :, :]` cherry is where that unit lives.

::: theme bits-unit
The warning of the old draft was that a high cosine can hide a useless neighbour. Here it cut the other way: a cosine near zero hid 0.85 bit per element. Only the bits settled it.
:::

### What it implies

For cherry shapes: **join the heads, always**. A cherry of one head throws away the cheapest bits in the orchard; whether to join layers or tokens as well is a separate and much weaker question ([[#hypotheses-upstairs]], [[#hypotheses-fallen-apple]]). For serving designs ([[#app-which-application]]): a pick in DSA or GLM-5.1 names a position for a layer, and attention at that layer reads every KV head of that position, so both views travel together and the saving comes free inside the `v[t, l, :, :]` cherry. A design whose picks covered one head at a time would pay for it, in a dictionary that carries the other head's picture or in raw bytes. On [[pin|the Pin]] there is no second head: GLM-5.1 keeps one MLA latent per token per layer, and what that latent shares with itself across its 640 elements is the same question asked of one vector ([[#toolbox-linear-prediction]]).

::: takeaway
- Joining the heads: 0.0322 ± 0.0009 of ratio on 20 of 20 sequences, 0.26 bit per element of the 0.85 the bound allows.
- One reference per token per layer serves both heads (0.54 bit kept in common); a cherry holds both heads, and picks per layer get the saving free.
:::

## Verdict {#verdict}

The strongest structure measured, and the one the old draft had declined to pursue. Values of Qwen3.5-2B, FP8, stretch 4096: 0.0322 ± 0.0009 of ratio on 20 of 20 sequences for the join, a bound of 0.85 bit per element shared raw, 0.54 after one reference, 0.21 after two, 66 to 70 % of head 1's plateau visible in head 0, and 91 to 96 % of the map's gain recoverable from a map fit on another sequence ([[#measured-cutting-the-tensor]], [[#measured-two-kinds-of-structure]]).

Grades: the 20-sequence join is encoded bytes on one window per sequence, not a verified ledger row; the bounds are four punnets of two sequences; the only verified split scores on five sequences (0.6385 for `v[t, l, :, :]`, 0.6702 for `v[t, l, h, :]`) read different punnets and may not be subtracted. Unmeasured: the same question on keys, whose two heads were coded jointly for one night only ([[#hypotheses-keys-and-values]]), and stereo across layers, a map from one layer's cherry into another's ([[#plan-next-in-the-harness]]).

::: aside source Receipts
Cosine, copying R² and distance correlation: r7 iter-1-1 (36 blocks). Same-window join: r24 iter-1-3 (20 windows of target 02). Shared bits 0.85 / 0.54 / 0.21: r9 iter-1-2 (4 blocks, exact code lengths). Terms inside and across heads at L19, 73 %: r22 iter-1-2. Map fit elsewhere 91–96 %: r7 iter-1-2. Plateau 66–70 %: `[value/shared]`. Five-sequence ledger rows: r24-t0002 on `st02n5-layer-b4k-r293` and `st02n5-head-b4k-r293`.
:::

::: takeaway
- Verdict: two views of one vector; 0.0322 of ratio for the join, 0.85 bit per element shared; the strongest structure found.
- Open: keys' heads, and whether the same linear link exists between layers.
:::
