---
title: 'The trap: the exchange rate is harsh'
nav: The trap
group: The argument, sorted
lede: Suppose the ladder is real and every rung explains a healthy share of a cherry. How many bits does that buy? Run the numbers through the exchange rate of Part II and the answer is sobering, with one escape hatch that the data turned out to use.
cards:
  - q: A predictor explains 75 % of an element's variance. How many bits per element does it save, at the Gaussian exchange rate?
    a: 1 bit
    wrong: ["6 bits", "0.75 bit", "3 bits"]
    why: '$\tfrac12 \log_2 \frac{1}{1-\vRsq} = \tfrac12 \log_2 4 = 1$. Two bits need 94 %.'
    sec: budget
  - q: With the budget 30 % global, 20 % sequence, 20 % stretch, 30 % noise, what is the stretch rung alone worth?
    a: About 0.37 bit per element
    wrong: ["About 1.6 bits, 20 % of 8", "About 2 bits", "Exactly 0.2 bit"]
    why: '$\tfrac12\log_2\frac{1}{0.3} - \tfrac12\log_2\frac{1}{0.5} \approx 0.87 - 0.50 = 0.37$. The whole ladder is worth about 0.87 bit.'
    sec: budget
  - q: Why can a few near-deterministic furrows save more than their share suggests?
    a: The exchange rate rises steeply as R² approaches 1, so a furrow with 2 % noise saves about 2.8 bits
    wrong: ["Because large furrows are stored with more bits", "Because the noise floor does not apply to them", "Because they are never missed"]
    why: Bits per element are an average over furrows. ½ log₂(1/0.02) ≈ 2.8 bits on a tenth of the furrows adds about 0.28 bit to the average on its own.
    sec: escape
  - q: The best compressor won 1.14 bits per element over solo at stretch scope, more than the toy budget's 0.37. Why?
    a: 'The structure was concentrated, not spread: whole-cherry repeats and a linear map between the heads, which explain most of some cherries rather than a little of all of them'
    wrong: ["The exchange rate does not apply to FP8", "The budget forgot the global rung", "Solo was measured wrongly"]
    why: An echo explains almost all of a repeated cherry; head 0 explains 73 % of head 1's residual at KV layer 4. The escape hatch, not the even spread, is what the data used.
    sec: verdict
---

[[#hypotheses-the-ladder]] granted the ladder its direction: each narrower crowd can only make a cherry cheaper. Now grant it more. Suppose each rung explains a solid share of what a cherry looks like. The question becomes arithmetic: how many bits does a solid share buy?

## The ladder as a variance budget {#budget}

::: define trap
- **What it is.** The exchange rate from variance explained to bits is harsh: 75 % of a value's variance explained saves one bit of eight, 94 % saves two. A lossless compressor is paid in variance explained, and the noise floor is paid in full.
- **Why it is a trap.** "This rung explains a healthy share" sounds like "this rung saves a healthy share of the bytes". It does not.
- **The escape hatch.** The rate is steep near $\vRsq = 1$: structure concentrated in a few furrows, or in a few nearly repeated cherries, buys far more than the same structure spread evenly.
:::

Think of one element of a cherry as a number that varies from token to token, and split its [[variance]] into four parts: a part explained by what all texts share (a global dictionary); a further part explained by the sequence; a further part explained by the neighbourhood (a stretch dictionary); and the rest, token identity, syntax, position, rounding, which no dictionary explains: **noise**. Then price each rung with the exchange rate.

::: aside reminder The exchange rate
For bell-shaped data, a predictor that explains a fraction $\vRsq$ of a value's variance leaves a [[residual]] of variance $(1-\vRsq)\vsigma^2$ and saves $\tfrac12 \log_2 \frac{1}{1-\vRsq}$ bits per value: 75 % explained → 1 bit, 94 % → 2 bits ([[#school-exchange-rate]], [[#toolbox-exchange-rate]]).
:::

$$
\text{bits saved by a rung} \;=\; \tfrac12 \log_2 \frac{\overbrace{1 - \vRsq_{\text{before}}}^{\text{residual share before it}}}{\underbrace{1 - \vRsq_{\text{after}}}_{\text{residual share after it}}}
$$ {#eq-hyp-rung-bits}

::: figure fig-hyp-budget varianceBudget
**The ladder as a variance budget.** Sliders: the share (%) of a typical element's variance explained by the global rung, then additionally by the sequence rung and by the stretch rung; the rest is noise (if the three add up to more than 99 %, the other sliders give way). The bar shows the four shares. The table prices each rung at the Gaussian exchange rate, cumulatively, and shows the bits left of the raw 8, before any effect of the number grid. The plot draws the exchange rate, bits saved (vertical) against variance explained (horizontal), with the three rungs as steps along it and the noise share shaded on the right, where no dictionary can reach. Bottom: the escape hatch, the share (%) of furrows that are near-deterministic and their own noise share (%); the tiles give the bits per element averaged over all furrows. All shares are inputs to play with, not measurements.
:::

With the defaults, 30 % global, 20 % sequence, 20 % stretch, 30 % noise: the global rung saves 0.26 bit per element, the sequence rung another 0.24, and the stretch rung, the one kvblockdiff is built on, 0.37. The whole ladder: 0.87 bit out of 8.

::: try
1. Try to get one full bit from the stretch rung alone. The table's note says what it takes: the stretch must explain three quarters of whatever the sequence left.
2. Push all three rungs up until noise is 10 %. Even then the whole ladder saves about 1.7 bits.
3. Watch the shaded noise region: whatever you do with the rungs, the total cannot pass $\tfrac12\log_2\frac{1}{\text{noise}}$.
:::

Why so harsh? Because "about the same subject" is a small fraction of a cherry. The subject of a passage plausibly lives in a few directions of a 512-element cherry. The other elements carry which token this is, its role in the sentence, its position, and plain rounding noise, and a [[lossless]] code pays for every one of them.

::: theme noise-floor
The noise share is a hard floor. With 30 % of the variance unexplainable, no dictionary of any scope can save more than 0.87 bit per element: the shaded region of the plot is out of reach for every rung.
:::

::: takeaway
- Price the ladder as a variance budget: each rung saves $\tfrac12\log_2$ of the ratio of residual variances.
- Generous defaults give the stretch rung 0.37 bit and the whole ladder 0.87 bit per element; one bit from the stretch rung alone needs ¾ of what the sequence left.
:::

## The escape hatch: concentrated structure {#escape}

There is one way out, and it comes from the shape of the exchange rate itself. Bits per element are an *average over furrows*. The rate is gentle for modest $\vRsq$ and steep near $\vRsq = 1$: a furrow whose variance is 98 % explainable saves $\tfrac12\log_2 50 \approx 2.8$ bits, more than three times what a typical furrow saves under the default budget. So the same total predictability, concentrated in a few furrows, buys more bits than when it is spread evenly.

::: figure fig-hyp-spread maSpread
**Sixteen furrows with the same average R², arranged differently.** Each bar is one furrow's variance explained; the number above it is the bits per element that furrow saves, $\tfrac12\log_2\frac{1}{1-\vRsq}$. The dashed line is the average R². *Tiles:* the average; the bits saved per element by these furrows, averaged over furrows (each coded on its own scale); and the bits the same average would save if spread evenly. *Controls:* drag a bar's top, or focus it and use the arrow keys; the buttons load three arrangements with the same 30 % average. R² is capped at 99.9 %.
:::

:::: compare Two ways to explain 70 % of the variance, on average
::: col Spread evenly
- Every furrow: 70 % explained, 30 % noise.
- Every furrow saves 0.87 bit.
- Average: **0.87 bit per element.**
:::
::: col Concentrated (toy)
- 10 % of furrows: 98 % explained (2.8 bits each).
- The other 90 %: 67 % explained (0.80 bit each).
- Average: **1.0 bit per element.**
:::
::::

The same arithmetic holds across *cherries* instead of furrows: a cherry that is a near-exact repeat of an earlier one has $\vRsq$ close to 1 on every element at once, and saves bits at the steep end of the curve, while its neighbours that repeat nothing save little. The old draft hoped for the hatch in a few outlier furrows of the keys, as the lossy papers report ([[#papers-kivi]], [[#papers-kvquant]]). The data used it elsewhere.

::: takeaway
- Bits are averaged over furrows and over cherries, and the rate is steep near $\vRsq = 1$: concentrated structure carries the gain.
- The trap is not a refutation; it sets the expected size of an evenly spread effect, and the data was not evenly spread.
:::

## Verdict {#verdict}

The trap was real and the hatch was used. At stretch 4096 the best verified compressor took the values of Qwen3.5-2B from [[solo]] 0.778 to 0.636, 1.14 bits per element, three times what the toy budget gives the stretch rung and more than it gives the whole ladder ([[#measured-scorecard]]). The bits did not come from an even 20 % of every element's variance:

- **Echoes.** A repeated token's cherry is predicted almost whole by its earlier copy; the first night's twin ladder, 0.8039 to 0.6731, was almost entirely such references ([[#hypotheses-echo]], [[#measured-night-one]]).
- **The stereo map.** At KV layer 4, head 0 explains 73 % of head 1's residual variance after the reference, $\tfrac12\log_2\frac{1}{0.27} \approx 0.94$ bit on half the elements, close to the 0.85-bit bound ([[#hypotheses-stereo]]).
- **The rule across elements.** A linear prediction of each element from elements already decoded, nearly the same in every punnet: 0.0337 of ratio for one such rule, untouched by the shuffle ([[#measured-two-kinds-of-structure]]).

And the floor is where the trap said it would be. A code-length floor for one head given its token and local history, elements treated as independent, sits at 0.27 to 0.62 of ratio by KV layer, 0.50 pooled: 73 % of the frontier's bits lie under it, and at most about one more bit per element is left to win at stretch scope ([[#measured-where-the-bits-come-from]], [[#measured-what-the-half-means]]).

::: aside source Receipts
Solo and frontier: `solo_ratio` of `s-layer-b4k-r293` (0.77811), env-t0096 (0.63639). Twin ladder: r1-t0005 to r1-t0042. Head 0 explains 73 %: r22 iter-1-2. Rule under shuffle: r12 iter-1-2. Floor by layer: r13 iter-1-5, `[value/floor]`.
:::

::: takeaway
- Measured: 1.14 bits per element over solo at stretch scope, from concentrated structure (repeats, the head map, the rule), not from an even spread.
- The floor under the frontier is about 0.50 of ratio: roughly one more bit per element to win at stretch scope, at most.
:::
