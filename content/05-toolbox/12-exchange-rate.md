---
title: The exchange rate, applied
nav: The exchange rate, applied
group: Before building
lede: 'A stage helps only by predicting. How much prediction buys how many bits is fixed by one formula from Part II, and on 8-bit orchard numbers its rate is harsh: half the variance buys half a bit of six.'
cards:
  - q: 'A predictor explains R² = 75 % of an element''s variance. For bell-shaped data, how many bits per element does it save?'
    a: 1 bit
    wrong: ["6 bits, three quarters of 8", "0.75 bit", "3 bits"]
    why: '½ log₂ 1/(1 − 0.75) = ½ log₂ 4 = 1. Two bits need 94 %, three bits need 98.4 %.'
    sec: rate
  - q: 'Ten furrows of a 512-element cherry are predicted almost perfectly (R² = 0.99, 3.3 bits each); the rest not at all. What is saved per element of the cherry?'
    a: About 0.06 bit
    wrong: ["About 3.3 bits", "About 1 bit", "About 0.5 bit"]
    why: 'Bits add up per element: 10 × 3.3 = 33 bits spread over 512 elements is 0.06 bit each. Owning most of the variance is not owning most of the bytes.'
    sec: game
  - q: The two KV heads of a layer have cosine about 0.05 at the same element, yet share about 0.85 bit per element. How?
    a: Their distances between tokens correlate up to 0.92; they are two views of one vector, and bits count what one view says about the other, not the angle between same-index elements
    wrong: ["The cosine was measured wrongly", "They share no bits; 0.85 is the index tax", "Because head 1 is a copy of head 0"]
    why: 'A cosine is one number about one pair of elements; mutual information counts everything. Joining the two heads into one cherry saved 0.0322 of ratio on 20 of 20 sequences.'
    sec: measured
---

A dictionary predicts an element from what the receiver already holds. Suppose the prediction is good: it explains **half** of the element's variance. Does that halve the bits?

| explained, $\vRsq$ | bits saved | new rate, from 6.22 | extra compression |
|---:|---:|---:|---:|
| 50 % | 0.50 | 5.72 | 1.09× |
| 75 % | 1.00 | 5.22 | 1.19× |
| 90 % | 1.66 | 4.56 | 1.36× |
| 94 % | 2.03 | 4.19 | 1.48× |
| 99 % | 3.32 | 2.90 | 2.15× |

Half the variance buys half a bit, out of six. This page is about why the table looks like that and what it means for every stage of this Part.

## From R² to bits, on 8-bit numbers {#rate}

::: aside reminder The exchange rate (II.12)
A predictor that explains a share $\vRsq$ of a value's variance leaves a [[residual]] with variance $(1-\vRsq)\vsigma^2$. For a [[gaussian]] value the bits fall by $\log_2$ of the ratio of [[standard-deviation|standard deviations]]: halve the spread, save one bit ([[#school-exchange-rate]]).
:::

$$
\text{saved per element} \;=\; \tfrac12 \log_2 \frac{\vsigma^2}{\underbrace{(1-\vRsq)\,\vsigma^2}_{\text{residual}}} \;=\; \tfrac12 \log_2 \frac{1}{1-\vRsq}
$$ {#eq-toolbox-exchange}

Three things about it matter for the orchard.

- **It is logarithmic.** Each extra bit needs the leftover variance divided by four: 75 % buys 1 bit, 94 % buys 2, 98.4 % buys 3.
- **It is per element.** Every element pays its own bits, so savings average over elements, not over variance.
- **It starts from the solo rate.** The fixed table of [[#toolbox-solo]] already brought the element to 6.22 bits on the Bench; a predictor has to explain variance that the element's own histogram cannot.

::: figure fig-toolbox-exchange hwaExchange
**The exchange rate on 8-bit orchard numbers.** Curve: bits saved per element, $\tfrac12\log_2\frac{1}{1-\vRsq}$, against the share of the element's variance the dictionary predicts ($\vRsq$, after solo coding). Dots mark the rows of the table above. **Drag** the knob (or focus it and use the arrow keys); **switch** the starting rate between the Gaussian E4M3 furrow (6.47 bits) and SplitZip's real E5M2 values (6.19 bits). The tiles give the new rate, the extra compression on top of solo coding, and the total against raw 8-bit storage. Gaussian residuals assumed; no dictionary costs charged.
:::

::: try
1. Drag to 50 %. The curve is still nearly flat: half a bit.
2. Find where one full bit is saved (75 %) and where two are (94 %).
3. Drag towards 99 %. The curve shoots up, but only a predictor that knows almost everything gets there.
:::

::: takeaway
- Bits saved per element $= \tfrac12\log_2\frac{1}{1-\vRsq}$: 75 % buys 1 bit, 94 % buys 2.
- On top of a 6.2-bit solo rate, one bit is only 1.19× of extra compression.
:::

## Lossless is a game of variance explained {#game}

The intuitive argument for the project said that cherries of the same text are "about the same thing" and should compress against each other ([[#hypotheses-the-ladder]]); [[#hypotheses-the-trap]] turns that into a variance budget. Here it is with the exchange rate applied, for an illustrative cherry whose variance splits like this:

| rung | of all variance | of what is left | bits saved |
|:---|---:|---:|---:|
| global (any sequence) | 30 % | 30 % | 0.26 |
| this sequence | 20 % | 29 % | 0.24 |
| this punnet | 20 % | 40 % | 0.37 |
| noise | 30 % | | |
| **all three** | **70 %** | | **0.87** |

Illustrative shares; each rung's $\vRsq$ is its share of the variance left after the rungs above it. To get **one** bit from the punnet rung alone, the punnet would have to explain three quarters of what the global and sequence rungs left.

::: theme noise-floor
The 30 % that no rung explains caps the whole ladder at $\tfrac12\log_2\frac{1}{0.3} = 0.87$ bit per element, because a lossless compressor must reproduce the noise exactly ([[#toolbox-bounds]]).
:::

There is one escape hatch, and it needs care: **heterogeneity**. A few furrows with very large, slowly varying values can hold most of a cherry's variance and be predicted almost perfectly. But bits are counted per element:

::: figure fig-toolbox-spread maSpread
**The same average R², spread two ways.** Bars: the share of variance a predictor explains in each of 16 furrows; drag a bar to change it. Tiles: the average $\vRsq$ over furrows, what a single summary number would promise in bits, and the bits actually saved, summed furrow by furrow with the exchange rate. Starting rate 6.47 bits per element (the Gaussian E4M3 furrow). Illustrative.
:::

::: note numbers Owning the variance is not owning the bytes
A cherry of $\vd = 512$ elements. Ten furrows are predicted with $\vRsq = 0.99$ and save 3.3 bits each; the other 502 are not predicted at all. Saved per cherry: 33 bits. Saved per element: $33/512 \approx 0.06$ bit. If those ten furrows carried 90 % of the cherry's variance, a variance-weighted $\vRsq$ would read 89 % and promise 1.6 bits per element; the true saving is thirty times smaller.
:::

::: takeaway
- A ladder of plausible variance shares buys under one bit per element in total; the noise share caps it.
- $\vRsq$ must be read per element. A few perfectly predicted furrows save little per element of the whole cherry.
:::

## What the campaigns found {#measured}

Read the Bench's headline numbers through the formula. Solo is 0.778, 6.22 bits; the best verified compressor at `stretch 4096` is 0.636, 5.09 bits, a saving of 1.14 bits per element; at 16 384 tokens, 0.618, 1.28 bits. By the exchange rate those are the savings of a predictor that explains 79 % and 83 % of the variance left after solo, on every element at once, which is what a real earlier copy of the same token plus a linear rule across elements amounts to ([[#measured-scorecard]]). The sharpest lesson in the formula's favour is the head axis ([[#measured-cutting-the-tensor]], [[#hypotheses-stereo]]). The same element in the two KV heads of a layer has a cosine of about 0.05, unrelated by any per-element summary, yet the distances between tokens correlate up to 0.92 across the heads, and a bound on 4 punnets says the heads share 0.85 bit per element raw, 0.54 after one reference serves both, 0.21 with separate references. Joining the two heads into one `v[t, l, :, :]` cherry saved 0.0322 of ratio, about a quarter of a bit, on 20 of 20 sequences; joining all six layers after that saved 0.0043 more. Bits counted what a cosine could not. And the formula says why the deltas did not reach 0.5: a delta half the size of a raw cherry needs 2.5 bits saved on every element, a predictor explaining 97 % of what solo leaves, and nothing on the Bench, inside a punnet, predicts that well; the code-length floor inside a punnet sits near 0.60 ([[#measured-what-the-half-means]]).

::: aside source Receipts
Headlines: env-t0096 (0.63639 at 4096), the 16k row (coder 120, 0.61768), solo 0.77811 on `s-layer-b4k-r293`. Heads: cosine ≈ 0.05 and distance correlation 0.92, r7 iter-1-1 (36 blocks); shared bits 0.85 / 0.54 / 0.21, r9 iter-1-2 (4 blocks, bound); same-window joins −0.0322 (spread 0.0009, 20/20) and −0.0043 (spread 0.0014), r24 iter-1-3. Block floor ≈ 0.60 at 16k: r23, spec §1.10.
:::

::: takeaway
- The Bench's best savings, 1.14 to 1.28 bits over solo, are what a predictor explaining about 80 % of the leftover variance buys.
- Two heads with cosine 0.05 share 0.85 bit per element: count bits, not angles.
:::
