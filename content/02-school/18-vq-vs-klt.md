---
title: Codebooks versus rotations
nav: Codebooks vs rotations
lede: A rotation and a codebook are two ways to exploit the same kind of redundancy. On lumpy data the codebook wins easily. On bell-shaped data it cannot win at all — a result from rate–distortion theory that saves a lot of wasted engineering.
group: Vectors
cards:
  - q: Run k-means on the bell-shaped two-thermometer cloud. What does the codebook end up doing?
    a: Lining its centroids up along the cloud's long axis — rediscovering the rotation, but paying an index tax for it
    wrong: ["Finding three hidden weather regimes", "Placing all centroids at the mean", "Beating the rotation by about one bit per element"]
    why: 'Its best net, 1.36 bits per element at C = 64, stays below the 1.47 bits the KLT gets with no tax.'
    sec: two-ways
  - q: 'In rate–distortion terms, how much can each bit spent describing a bell-shaped (Gaussian) value shrink the error, at best?'
    a: It can at best halve the error's standard deviation
    wrong: ["It can at best divide the error by ten", "It can remove the error completely", "It can at best shrink it by one percent"]
    why: 'Each extra bit at best divides the error variance by 4. So log₂ C bits of index per vector save at most log₂ C / d bits per element — exactly the tax.'
    sec: rate-distortion
  - q: On which kind of data can a VQ codebook beat a rotation (KLT)?
    a: Clustered data, where the vectors fall into separate lumps
    wrong: ["Bell-shaped (Gaussian) data with strong correlation", "Data whose channels are all independent", "Any data, given a large enough codebook"]
    why: 'A rotation only sees straight-line structure. On the weather regimes VQ nets 1.46 bits per element; the KLT gets 0.05.'
    sec: two-ways
  - q: 'Product quantization splits a 64-element vector into $\vnsub = 8$ pieces with 256 centroids each. What is the index tax?'
    a: 64 bits per vector, 1 bit per element
    wrong: ["8 bits per vector", "256 bits per vector", "0.125 bits per element"]
    why: Each piece costs log₂ 256 = 8 bits; eight pieces cost 64 bits, spread over 64 elements.
    sec: pq
  - q: Does product quantization escape the bound that stops a codebook from beating a rotation on Gaussian data?
    a: No — the bound adds up piece by piece, so the same economics apply
    wrong: ["Yes — splitting removes the index tax", "Yes — the pieces are always clustered", "No — product quantization is lossy, so the bound does not apply"]
    why: Each sub-codebook is an ordinary VQ on its piece, facing the same bits-versus-error trade-off.
    sec: pq
---

Take the k-means of the last page and run it on the other cloud of this Part: the two thermometers, a single bell-shaped cigar with no clusters at all. With $\vC = 8$ it lays its eight centroids along the diagonal, like beads on a string. It has found the long axis of the cigar — the KLT direction of II.15. And it charges an index for every reading to say which bead is nearest.

So a codebook can do a rotation's job. Can it do it *better*? This page says when it can, when it cannot, and why.

## Two ways to use the same redundancy {#two-ways}

::::: compare Rotation versus codebook
:::: col KLT — the Compass
- **Keeps:** one rotation (a $\vd \times \vd$ table), sent once.
- **Per vector:** nothing extra. Every vector is rotated the same way.
- **Sees:** straight-line structure — correlation between channels.
- **Blind to:** clusters, curves, anything a covariance matrix does not record.
::::
:::: col VQ — the Hive
- **Keeps:** $\vC$ centroids, sent once.
- **Per vector:** an index, $\log_2 \vC$ bits — the index tax.
- **Sees:** any lumpy shape, clusters included.
- **Pays for:** every bit of structure it captures, one index at a time.
::::
:::::

The figure runs the contest on both clouds of this Part, for codebooks from 2 to 64 centroids.

::: figure fig-sv-vq-vs-klt svVqVsKlt
**Lossless VQ against the KLT on two clouds of Gull Rock readings ($\vd = 2$, both channels standardized).** For each codebook size $\vC$ (k-means, the best of five starts by total squared distance): teal, the bits per element the residual saves, estimated with the Gaussian rule of II.11 from the residual variance of each channel; red, the index tax $\log_2 \vC / 2$; green (or dark red when negative), the net. The purple dashed line is the KLT's transform coding gain, which pays no tax. Neither method is charged for sending its codebook or rotation once. *Switch* between the bell-shaped thermometer cloud (480 readings) and the clustered weather regimes (300 readings). *Hover* a bar for its value.
:::

What the bars say:

- **The thermometers (bell-shaped).** The rotation saves 1.47 bits per element for free. The codebook's net climbs with $\vC$ — 0.23 at $\vC = 2$, 0.73 at 4, 1.07 at 8, 1.36 at 64 — and never reaches the rotation. Each doubling of $\vC$ buys a little more saving and charges half a bit more tax.
- **The weather regimes (clustered).** The rotation saves 0.05 bit; it cannot see islands. The codebook nets 1.46 bits at $\vC = 3$ and stays around that level as $\vC$ grows.

The estimate is rough in one way that favours the rotation: the Gaussian rule slightly overstates the cost of the flat-topped residuals that VQ leaves behind. The next section shows that no fairer accounting changes the verdict on bell-shaped data.

::: takeaway
- A codebook can rediscover a rotation, but it pays an index for every vector to do so.
- On the bell-shaped thermometer cloud the KLT wins (1.47 against at most 1.36 bits per element).
- On the clustered regimes VQ wins (1.46 against 0.05).
:::

## Why a codebook cannot win on bell-shaped data {#rate-distortion}

There is a branch of information theory about exactly this trade-off: how many bits you spend against how much error you leave.

::: define rate-distortion
- **What it is:** the theory of the best possible trade-off between the bits spent describing data (the *rate*) and the error left over (the *distortion*).
- **Its key result for bell-shaped data:** describing a [[gaussian]] value of variance $\vsigma^2$ with a given number of bits leaves an error variance of at least $\vsigma^2 \cdot 2^{-2 \times \text{bits}}$. Each bit can, at best, halve the error's standard deviation.
- **Why we care:** it gives bounds *before* building anything.
:::

Apply it to a codebook. The index is $\log_2 \vC$ bits per vector, which is $\log_2 \vC / \vd$ bits per element. At best, it shrinks each element's error standard deviation by $2^{\log_2 \vC / \vd}$, so the residual saves at most $\log_2 \vC / \vd$ bits per element:

$$
\underbrace{\tfrac12 \log_2 \frac{\vsigma^2}{\text{residual variance}}}_{\text{what the centroid saves (beyond the rotation)}} \;\le\; \underbrace{\frac{\log_2 \vC}{\vd}}_{\text{index tax}}
$$ {#eq-sv-vq-bound}

On Gaussian data the gain beyond what the rotation already gets is at most the tax. The net is at most zero, with equality only for an ideal codebook; k-means is not ideal. That is the gap in the figure.

::: aside detail The same verdict, from a counting argument
The index is computed from the reading, so it contains nothing the reading did not. Sending the index and then the residual therefore costs at least as many bits as the reading's own [[entropy]], $\vH(\vX)$. For bell-shaped data, a rotation followed by coding each axis on its own already gets down to $\vH(\vX)$. A codebook can at best tie. On clustered data a rotation stays well above $\vH(\vX)$, and that is the room a codebook can win.
:::

The first draft of this proposal checked the same thing by [[monte-carlo]] in a harder setting: 64 elements per vector, one block of 16,384 vectors, k-means codebooks charged for both the index and the codebook itself. On correlated Gaussian data, VQ netted +0.17 to +0.25 bit per element against +0.50 for the rotation. On data with 32 real clusters, VQ netted +1.5 bits against +0.68. The same verdict as our two-dimensional toy, in more dimensions.

::: note warning What this does *not* say
It does not say codebooks are useless. It says they earn their keep only where the data is lumpy. Whether a particular kind of data is lumpy is a question for measurement, not for instinct. Part VII returns to the first draft's instinct "VQ, then entropy-code the error" ([[#missed-vq-then-code]]).
:::

::: takeaway
- Rate–distortion: each bit can at best halve a Gaussian error's standard deviation.
- So on bell-shaped data a codebook's extra saving is at most its index tax: it cannot beat the untaxed rotation.
- Only lumpy (clustered) data gives a codebook room to win.
:::

## Product quantization {#pq}

Big codebooks are expensive to store and slow to search. With 64 elements per vector, an index budget of 64 bits would mean $2^{64}$ centroids. The standard escape is to split the vector.

::: define product-quantization
- **What it is:** cut each vector into $\vnsub$ pieces and give each piece its own small codebook. A vector is described by $\vnsub$ indices, one per piece.
- **Example:** 64 elements, $\vnsub = 8$ pieces of 8 elements, 256 centroids per piece. The index tax is $8 \times \log_2 256 = 64$ bits per vector, 1 bit per element. The codebooks hold $8 \times 256 \times 8 = 16{,}384$ numbers, while the combinations act like $256^8 = 2^{64}$ centroids.
- **Same economics:** each piece is an ordinary codebook facing the same bound. Product quantization makes VQ affordable; it does not make it beat a rotation on bell-shaped data.
:::

::: note connection The family bill
Every member of the codebook family pays per vector: plain VQ pays $\log_2 \vC$, product quantization pays $\vnsub \log_2 256$. The rotation pays once, for its table, and nothing per vector. Only data the rotation cannot describe justifies the per-vector tax.
:::

::: takeaway
- Product quantization splits a vector into $\vnsub$ pieces, each with its own small codebook.
- It makes huge effective codebooks cheap to store, but the index tax and the bound apply piece by piece.
:::
