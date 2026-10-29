---
title: '"VQ, then entropy-code the error" cannot beat a rotation on Gaussian data'
nav: VQ cannot beat a rotation on a bell
lede: The first instinct behind the project was a codebook. Name the nearest centroid, then code the small leftover. On bell-shaped data that is a taxed copy of what a rotation gets for free. Codebooks earn their keep only when the data comes in clumps.
cards:
  - q: In lossless terms, what is "VQ, then entropy-code the error"?
    a: Predictive coding with the nearest centroid as the prediction, plus the centroid's index as per-entry side information
    wrong: ["Lossy quantization followed by rounding", "A rotation of the data to its KLT axes", "LZ matching against a codebook of byte strings"]
    why: The centroid is the guess, the exact residual is stored, and the index — log₂ C bits per entry — is the tax.
    sec: claim
  - q: On the smooth-hill toy (correlated bell), what is the best the codebook nets, and what does the rotation get?
    a: About 0.29 bit per element (C = 4) against 0.59 for the rotation
    wrong: ["1.30 bits against 0.59", "0.59 bits against 0.29", "Both about 0.59 bits"]
    why: The codebook narrows the leftover by 1.30 bits but pays 1.01 in index and codebook tax. The rotation pays nothing per entry.
    sec: ledger
  - q: On the 16-clumps toy, why does the rotation get almost nothing?
    a: The channels are already uncorrelated, so there is no better pair of axes to turn to
    wrong: ["Because rotations only work in high dimension", "Because the clumps make the variance infinite", "Because the rotation pays an index tax"]
    why: A rotation exploits correlation. Clumps scattered without a preferred direction have none; a codebook exploits the clumps themselves.
    sec: ledger
  - q: In a 640-element entry, the index of a 4-centroid codebook costs only 0.003 bits per element. Why does VQ still not win on bell-shaped data?
    a: On a bell, the narrowing beyond the rotation shrinks by the same factor as the tax
    wrong: ["Because 640-element codebooks cannot be fit", "Because the index must be stored in BF16", "It does win in high dimension"]
    why: 'Rate–distortion: $R$ bits per vector buy at most $R/\vd$ bits per element of narrowing beyond the transform — exactly the tax.'
    sec: ledger
  - q: What does the plan do with VQ after this correction?
    a: Starts with light dictionaries and measures VQ as one rung, to find out whether KV entries clump
    wrong: ["Drops VQ entirely", "Uses VQ as the default dictionary", "Replaces the rotation with product quantization"]
    why: Whether KV clumps (by token type, template position, sink tokens) is an empirical question the measurement answers directly.
    sec: changes
---

The first instinct behind kv-blockdiff fits into one line. The first draft wrote it as "VQ then Gaussian entropy encode the error". Find the nearest centroid, store which one it was, then code the small leftover with a bell-curve model.

It sounds like the obvious way to compress vectors. On bell-shaped data it is a taxed copy of something you can have for free.

## The first instinct {#claim}

In this site's words the recipe is [[predictive-coding]] with a particular prediction.

1. The [[dictionary]] is a [[codebook]] of $\vC$ [[centroid|centroids]].
2. The prediction of an entry is its nearest centroid.
3. The exact [[residual]] is stored and entropy-coded.
4. The centroid's number, its index, is stored too: $\log_2 \vC$ bits per entry. That is the [[index-tax]].

It was tempting for good reasons.

- **[[vq|VQ]] is the champion of *lossy* vector compression.** 2-bit KV quantizers and vector search both live on codebooks.
- **A codebook is a dictionary in the most literal sense:** a list of typical entries.
- **The leftover around a centroid really does look bell-shaped,** so a Gaussian model for it seems natural.
- **[[product-quantization|Product quantization]] makes huge codebooks cheap to store.**

Here is the ledger every codebook must balance, in bits per element of a $\vd$-element vector.

$$
\text{net} \;=\; \underbrace{\text{narrowing}}_{\text{what the centroid buys}} \;-\; \underbrace{\frac{\log_2 \vC}{\vd}}_{\text{the index}} \;-\; \underbrace{\frac{8\vC}{\vb}}_{\text{the codebook}}
$$ {#eq-ma-vq-ledger}

The narrowing is the exchange rate applied to the leftover: $\tfrac12\log_2$ of the variance before, over the variance of the residual. The index is paid by every entry. The codebook is paid once per block of $\vb$ entries.

::: aside reminder Index tax and rate–distortion
[[#school-clusters]]: naming one of $\vC$ centroids costs $\log_2 \vC$ bits. [[#school-vq-vs-klt]]: [[rate-distortion]] theory says that on Gaussian data, spending $R$ bits per vector shrinks the leftover's variance by at most a factor $2^{-2R/\vd}$ per element beyond what a rotation already gets.
:::

::: takeaway
- "VQ, then code the error" is predictive coding with a centroid as the guess and an index as the tax.
- It wins only where its narrowing beats its index tax plus its codebook.
:::

## Hills and clumps {#ledger}

The figure runs the ledger on two clouds of 4,096 two-element vectors. Two elements are few, but you can see them, and the bits come out the same way in more dimensions.

- **A smooth hill:** a bell-shaped cloud whose two elements are correlated 0.9.
- **Clumps:** 16 tight groups scattered over an oval.

::: figure fig-ma-vq-ledger maVqLedger
**A codebook and a rotation on the same cloud.** *Top:* 900 of the 4,096 vectors (grey dots), the k-means centroids (brown), the rotation's axes ([[klt|KLT]], purple, ±2 standard deviations) and the residuals of a few points (red lines to their centroid). *Bottom, the ledger in bits per element:* how much the codebook narrows the residual, $\tfrac12\log_2$ of the variance ratio averaged over the two elements; its tax, $\log_2\vC/2$ for the index plus $8\vC/4096$ for the codebook; the net; and the rotation's gain, $\tfrac12\log_2$ of the ratio of geometric means of the variances before and after, with no per-entry tax. Bell-shaped coding models are assumed throughout (the exchange rate of [[#school-exchange-rate]]). *Controls:* the cloud; the codebook size $\vC$; a new random sample. k-means++ with 30 rounds, best of three starts; seeded.
:::

What the default sample shows:

| cloud | $\vC$ | narrowing | tax | codebook net | rotation |
|---|---|---|---|---|---|
| smooth hill | 2 | 0.68 | 0.50 | 0.17 | **0.59** |
| smooth hill | 4 | 1.30 | 1.01 | 0.29 | **0.59** |
| smooth hill | 64 | 3.19 | 3.13 | 0.06 | **0.59** |
| clumps | 4 | 0.96 | 1.01 | −0.04 | 0.00 |
| clumps | 16 | 2.69 | 2.03 | **0.66** | 0.00 |

On the hill, every codebook narrows the leftover a lot and pays almost all of it back as tax. The best one nets half of what the rotation gets. The rotation is free per entry because its axes are stored once, in the dictionary.

On the clumps, the rotation finds nothing: the two elements are not correlated, so there is no better pair of axes. The codebook with one centroid per clump removes the whole spread between clumps, and its index is worth more than it costs.

::: note numbers What changes with more dimensions
In this 2-D toy the index costs $\tfrac12\log_2\vC$ bits per element, 1 bit for $\vC = 4$. In an entry of $\vd = 640$ elements it would cost $\log_2 4/640 \approx 0.003$ bits. Almost free! But on a bell-shaped cloud the most a codebook can narrow *beyond the rotation* shrinks by exactly the same factor $1/\vd$. That is the rate–distortion bound. Clumps escape it: the spread between clumps does not shrink as the dimension grows.
:::

::: aside detail Why a bell-curve model per coordinate?
The ledger prices every coordinate with a bell-shaped model, the way the napkin math of Part VI does. With measured histograms instead, the 2-D clumps cast visible shadows on each axis, and coding each element alone would already exploit some of them. In hundreds of dimensions those shadows blur into a bell, and the toy's ledger becomes the honest one.
:::

::: try
1. On the hill, step through $\vC$ = 2, 4, 16, 64. The narrowing grows by about half a bit per doubling of $\vC$, and the index tax grows by exactly half a bit.
2. Switch to the clumps with $\vC = 4$: four centroids cannot name sixteen clumps, and the net is negative.
3. Press **New sample** a few times on the clumps at $\vC = 16$. The net moves between about 0.66 and 0.83 bit: a toy is one sample, not a law.
:::

::: takeaway
- On a smooth hill, a codebook's extra narrowing is eaten by its index; a rotation keeps it all.
- On clumps, a codebook wins and a rotation sees nothing. The data's shape decides.
:::

## What changes in the plan {#changes}

- **The default dictionary is light:** per-channel location and scale ([[loc]], $\vw \approx 2$), then a low-rank basis. Neither pays a per-entry tax.
- **VQ becomes a rung to measure, not a plan to assume** ([[#homework-vq]]). If it beats loc plus the rotation by a clear margin, the data clumps, and the plan has a pivot ready: heavy dictionaries, with residency deciding their cost ([[#plan-risks]]).
- **The open question is empirical: does KV clump?** Candidates are entries grouped by token type, by position in a chat template, or the few "sink" tokens that attract attention whatever is asked. Nobody has measured it in bits.

:::: compare Codebook and rotation
::: col VQ (codebook)
- **Exploits:** clumps.
- **Per-entry tax:** $\log_2\vC$ bits for the index.
- **Dictionary weight:** $\vw = \vC$ entries' worth.
- **On a bell:** never beats the rotation.
- **On clumps:** can win big.
:::
::: col KLT (rotation)
- **Exploits:** correlation between channels.
- **Per-entry tax:** none.
- **Dictionary weight:** $2\vd$ for a full basis, $32$ for rank 16.
- **On a bell:** the best any linear method can do.
- **On clumps:** sees only their overall spread.
:::
::::

::: theme every-tax
The index is the tax here, and on a bell-shaped cloud it is set by theory to swallow the whole extra gain. A rotation charges once, per dictionary, which is why it wins there.
:::

::: takeaway
- Light dictionaries first; VQ as a measured rung.
- The question "does KV clump?" decides whether codebooks ever pay.
:::
