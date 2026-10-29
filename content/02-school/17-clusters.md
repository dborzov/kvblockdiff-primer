---
title: Clusters and codebooks (VQ)
nav: Clusters and codebooks (VQ)
lede: Gull Rock's weather comes in moods — calm, fog, storm. Readings from one mood sit together in tight clusters. Name the cluster, then send how the reading differs from its typical member. That is vector quantization, and naming the cluster has a price.
group: Vectors
cards:
  - q: What is a centroid?
    a: The average point of a group of vectors
    wrong: ["The vector closest to zero", "The first vector of a group", "The median of one channel"]
    why: 'For the calm readings, the centroid is (7.7 kn, 69.9 %): the average wind and the average humidity of the calm group.'
    sec: regimes
  - q: What are the two steps that k-means repeats?
    a: Assign every vector to its nearest centroid; move every centroid to the average of its vectors
    wrong: ["Sort the vectors; split them in half", "Rotate the data; drop the smallest axis", "Pick the k largest vectors; delete the rest"]
    why: Each step can only reduce the total squared distance, so the loop settles down — though not always in the best possible place.
    sec: k-means
  - q: 'How many bits does naming one centroid out of a codebook of $\vC = 8$ cost?'
    a: 3 bits per vector
    wrong: ["8 bits per vector", "1 bit per vector", "0.375 bits per vector"]
    why: 'The index tax is $\log_2 \vC$ bits per vector. Spread over $\vd$ elements, it is $\log_2 \vC / \vd$ bits per element.'
    sec: index-tax
  - q: In lossless VQ, what plays the role of the prediction, and what is sent?
    a: The nearest centroid is the prediction; the index and the exact residual are sent
    wrong: ["The index is the prediction; only the centroid is sent", "The residual is the prediction; only the index is sent", "Nothing is predicted; the centroid replaces the vector"]
    why: Lossless VQ is predictive coding with a menu of C predictions. Plain (lossy) VQ would send only the index and accept the error.
    sec: index-tax
  - q: 'On the weather-regime data (wind and humidity, $\vd = 2$), what does a 3-centroid codebook net per element?'
    a: About 1.46 bits — 2.26 saved minus 0.79 of index tax
    wrong: ["About 2.26 bits — the tax is paid only once", "About 0.05 bits — the same as a rotation", "About −0.79 bits — the tax always wins"]
    why: 'The residual spread shrinks to about 0.04 of the original per channel, saving 2.26 bits per element; the index costs log₂ 3 / 2 = 0.79.'
    sec: index-tax
---

Here are eight readings from Gull Rock, wind speed and humidity only, in the order they arrived:

| wind (kn) | 30 | 12 | 3 | 13 | 36 | 2 | 9 | 38 |
|---|---|---|---|---|---|---|---|---|
| humidity (%) | 93 | 74 | 96 | 65 | 88 | 97 | 72 | 95 |

Notice anything? They come in three flavours. Light wind and moderate humidity: a **calm** day. Almost no wind and saturated air: **fog**. Strong wind and wet air: a **storm**. Plot 300 readings as dots and the flavours become three islands with empty sea between them.

Rotations (II.15) cannot see this. The correlation matrix of these readings is nearly flat, and a KLT saves just 0.05 bit per element. Yet a forecaster could describe each reading in two words: "a storm, a bit windier than usual". This page turns that sentence into a code.

## Weather regimes {#regimes}

Call each island a cluster, and describe each cluster by its middle point.

::: define centroid
- **What it is:** the average point of a group of vectors: the mean of each channel, taken over the group.
- **Example:** the calm readings average 7.7 kn and 69.9 %, so the calm centroid is $(7.7,\ 69.9)$. The fog centroid is $(3.7,\ 97.0)$ and the storm centroid $(34.6,\ 89.9)$.
- **Easy to confuse with:** a typical *member*. A centroid is usually not one of the readings; it is an average.
:::

::: define codebook
- **What it is:** the list of $\vC$ centroids, agreed by both ends of the link. Here, $\vC = 3$: calm, fog, storm.
- **On this site** "codebook" means only this list of centroids. The general word for anything both ends keep is [[dictionary]]; a codebook is one kind.
:::

The letter $\vC$ counts the centroids. Nobody told us there were three moods, though. The centroids have to be found from the data.

::: takeaway
- Some data is lumpy: it falls into clusters, and correlation does not see them.
- A centroid is the average point of a cluster; a codebook is the list of $\vC$ centroids both ends keep.
:::

## Finding the centroids: k-means {#k-means}

::: define k-means
- **What it is:** the standard recipe for fitting a codebook. Start with $\vC$ guesses, then repeat two steps until nothing changes:
  1. **assign** every vector to its nearest centroid;
  2. **update** every centroid to the average of the vectors assigned to it.
- **Why it settles:** both steps can only shrink the total squared distance from vectors to their centroids.
- **Its weakness:** it can settle in a poor arrangement, depending on the start. In practice one runs it from several starts and keeps the best.
:::

Distances only make sense when both channels are on the same scale, so the figure [[standardize|standardizes]] wind and humidity first (II.13) and plots them back in their own units.

::: figure fig-sv-kmeans svKmeans
**k-means on 300 Gull Rock readings in the wind–humidity plane (synthetic: three weather regimes, 140 calm, 60 fog, 100 storm, from a fixed seed).** Each dot is a reading, coloured by the centroid it is currently assigned to; diamonds are the centroids. The centroids start on a small ring around the middle of the cloud. *One k-means step* does one assign-and-update round; *Run to the end* repeats until nothing moves; *New start* tries another set of starting centroids, picked among the readings. The slider sets the codebook size $\vC$ from 1 to 8. The tiles estimate, per element (two elements per reading), the bits saved by sending the residual from the centroid instead of the reading — the Gaussian rule of II.11 applied to each standardized channel, $\tfrac12\log_2(1/\text{residual variance})$ — the index tax $\log_2 \vC / 2$, and the net.
:::

::: try
1. With $\vC = 3$ the diamonds start on a small ring in the middle of the plot. Press *One k-means step* twice and watch them jump to the middle of the three islands. The net settles at 1.46 bits per element.
2. Set $\vC = 2$ and run to the end. One centroid has to cover two islands; the net drops to 0.65.
3. Set $\vC = 4$ or more and run to the end. The extra centroids split islands that did not need splitting. The bits saved creep up, the tax rises as fast or faster, and the net never beats $\vC = 3$: 1.45 at $\vC = 4$, between 1.23 and 1.34 from 5 to 8.
4. Press *New start* a few times at $\vC = 5$ or 6: k-means starts from spread-out random readings instead, and often settles in a different arrangement with a different net — its known weakness.
:::

::: takeaway
- k-means alternates "assign to the nearest centroid" and "move the centroid to the average" until it settles.
- On the regime data it finds the three moods: calm, fog and storm.
:::

## Lossless VQ and the index tax {#index-tax}

Now send readings over the radio with the codebook. For each reading:

1. find the nearest centroid and send its **index** (which of the $\vC$ it is);
2. send the exact [[residual]]: the reading minus that centroid.

The receiver looks up the centroid in its copy of the codebook and adds the residual back. Nothing is lost.

::: define vq
- **What it is:** vector quantization — describing each vector by the index of its nearest centroid in a codebook. Plain VQ stops there and accepts the error (it is [[lossy]]). **Lossless VQ** uses the centroid as a [[prediction]] of every element ($\vxhat$ in each channel) and also sends the exact residual $\vr = \vx - \vxhat$ of every element.
- **Example:** a storm reading of (36 kn, 88 %) becomes "index: storm" plus the residual (+1.4 kn, −1.9 %).
- **What it costs:** the codebook, sent once, and an index for every vector.
:::

::: define index-tax
- **What it is:** the bits spent on naming the centroid: $\log_2 \vC$ bits per vector, or $\log_2 \vC / \vd$ per element.
- **Example:** three centroids cost $\log_2 3 = 1.58$ bits per reading, $0.79$ bit per element with $\vd = 2$.
- **Why it matters:** a codebook helps only if the residual saves more than the tax.
:::

$$
\text{net bits saved per element} = \underbrace{\tfrac12 \log_2 \frac{\text{spread}^2\ \text{before}}{\text{spread}^2\ \text{of the residual}}}_{\text{what the centroid explains}} \;-\; \underbrace{\frac{\log_2 \vC}{\vd}}_{\text{index tax}}
$$ {#eq-sv-vq-net}

On the regime data with $\vC = 3$, the residual keeps about 4 % of each channel's spread² (0.040 and 0.048), so the first term is 2.26 bits. The tax is 0.79. The net is **1.46 bits per element**, against 0.05 for the rotation.

::: theme every-tax
The index is the codebook's tax collector: $\log_2 \vC$ bits on every single vector, whether its centroid helped much or not. Doubling $\vC$ costs exactly one more bit per vector, and only pays when it explains more than that.
:::

::: note connection Three familiar moves in one
Lossless VQ is [[predictive-coding]] (II.10) with a menu of $\vC$ guesses instead of one. The codebook is [[side-information]] both ends keep (II.5). And the codebook itself must cross the link once: 3 centroids × 2 numbers, a fixed cost shared by every reading that follows ([[#school-amortization]]).
:::

::: takeaway
- Lossless VQ: send the index of the nearest centroid plus the exact residual.
- The index tax is $\log_2 \vC$ bits per vector; the net gain is what the centroid explains minus that tax.
- On clustered data VQ wins clearly (1.46 bits per element on the regimes, where a rotation gets 0.05).
:::
