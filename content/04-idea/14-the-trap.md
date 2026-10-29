---
title: 'The trap: the exchange rate is harsh'
nav: 'The trap: the exchange rate is harsh'
lede: Suppose the cat-thread ladder is real and every rung explains a healthy share of an entry. How many bits does that buy? Run the numbers through Part II's exchange rate and the answer is sobering — with one escape hatch.
group: The cat-thread ladder
cards:
  - q: A predictor explains 75 % of an element's variance. How many bits per element does it save (Gaussian exchange rate)?
    a: 1 bit
    wrong: ["6 bits", "0.75 bit", "3 bits"]
    why: '$\tfrac12 \log_2 \frac{1}{1-\vRsq} = \tfrac12 \log_2 4 = 1$. Two bits need 94 %.'
    sec: budget
  - q: With the budget 30 % global, 20 % thread, 20 % block, 30 % noise, what is the block rung alone worth?
    a: About 0.37 bit per element
    wrong: ["About 1.6 bits — 20 % of 8", "About 2 bits", "Exactly 0.2 bit"]
    why: '$\tfrac12\log_2\frac{1}{0.3} - \tfrac12\log_2\frac{1}{0.5} \approx 0.87 - 0.50 = 0.37$. The whole ladder is worth about 0.87 bit.'
    sec: budget
  - q: To save one full bit per element from the block rung alone, how much of the variance left by the thread rung must the block explain?
    a: Three quarters of it
    wrong: ["One quarter", "Half", "All of it"]
    why: The rung saves ½ log₂ of the ratio of residual variances before and after it; one bit needs that ratio to be 4.
    sec: budget
  - q: Why can a few near-deterministic channels save more than their share suggests?
    a: The exchange rate rises steeply as R² approaches 1, so a channel with 2 % noise saves about 2.8 bits
    wrong: ["Because large channels are stored with more bits", "Because the noise floor does not apply to them", "Because they are never missed"]
    why: Bits per element are an average over channels. ½ log₂(1/0.02) ≈ 2.8 bits on a tenth of the channels adds about 0.28 bit to the average on its own.
    sec: escape
---

[[#idea-what-is-right]] granted the ladder its direction: each narrower crowd can only make an entry cheaper. Now grant it more — suppose each rung explains a solid share of what an entry looks like. The question becomes arithmetic: how many bits does a solid share buy?

## The ladder as a variance budget {#budget}

Think of one element of an entry as a number that varies from token to token. Split its [[variance]] into four parts:

- a part explained by what all texts share (a **global** dictionary);
- a further part explained by the conversation (a **per-thread** dictionary);
- a further part explained by the neighbourhood (a **per-block** dictionary);
- and the rest — token identity, syntax, position, rounding — which no dictionary explains: **noise**.

Then price each rung with the exchange rate of Part II.

::: aside reminder The exchange rate
For bell-shaped data, a predictor that explains a fraction $\vRsq$ of a value's variance leaves a [[residual]] of variance $(1-\vRsq)\vsigma^2$ and saves $\tfrac12 \log_2 \frac{1}{1-\vRsq}$ bits per value: 75 % explained → 1 bit, 94 % → 2 bits ([[#school-exchange-rate]]).
:::

$$
\text{bits saved by a rung} \;=\; \underbrace{\tfrac12 \log_2 \frac{1}{1 - \vRsq_{\text{after}}}}_{\text{all rungs up to this one}} \;-\; \underbrace{\tfrac12 \log_2 \frac{1}{1 - \vRsq_{\text{before}}}}_{\text{the rungs above it}} \;=\; \tfrac12 \log_2 \frac{1 - \vRsq_{\text{before}}}{1 - \vRsq_{\text{after}}} .
$$ {#eq-idea-rung-bits}

::: figure fig-idea-budget varianceBudget
**The ladder as a variance budget.** Sliders: the share of a typical element's variance explained by the global rung, then additionally by the thread rung and by the block rung; the rest is noise (if the three add up to more than 99 %, the other sliders give way). The bar shows the four shares. The table prices each rung at the Gaussian exchange rate, cumulatively, and shows the bits left of the raw 8 (before any number-format effects). The plot draws the exchange rate — bits saved (vertical) against variance explained (horizontal) — with the three rungs as steps along it and the noise share shaded on the right, where no dictionary can reach. Bottom: the escape hatch — a share of channels whose variance is almost all explainable, with their own noise share; the tiles give the bits per element averaged over all channels. All shares are inputs to play with, not measurements.
:::

With the defaults — 30 % global, 20 % thread, 20 % block, 30 % noise — the global rung saves 0.26 bit per element, the thread rung another 0.24, and the block rung, the one kv-blockdiff is built on, 0.37. The whole ladder: 0.87 bit out of 8.

::: try
1. Try to get one full bit from the block rung alone. The table's note tells you what it takes: the block must explain three quarters of whatever the thread left.
2. Push all three rungs up until noise is 10 %. Even then the whole ladder saves about 1.7 bits.
3. Watch the shaded noise region: whatever you do with the rungs, the total cannot pass $\tfrac12\log_2\frac{1}{\text{noise}}$.
:::

Why is the rate so harsh? Because "about the same subject" is a small fraction of an entry. The subject of a paragraph — Maine Coon or Python — plausibly lives in a few directions of a 640-element entry. The other elements carry which token this is, its role in the sentence, its position, and plain rounding noise. A [[lossless]] code pays for every one of them.

::: theme noise-floor
The noise share is a hard floor. With 30 % of the variance unexplainable, no dictionary of any scope can save more than 0.87 bit per element — the shaded region of the plot is out of reach for every rung.
:::

::: takeaway
- Price the ladder as a variance budget: each rung saves $\tfrac12\log_2$ of the ratio of residual variances.
- Generous defaults (30/20/20, 30 % noise) give the block rung 0.37 bit and the whole ladder 0.87 bit per element.
- One bit from the block rung alone needs it to explain ¾ of what the thread left.
:::

## The escape hatch: concentrated structure {#escape}

There is one way out, and it comes from the shape of the exchange rate itself. Bits per element are an *average over [[channel|channels]]*. The exchange rate is gentle for modest $\vRsq$ and steep near $\vRsq = 1$: a channel whose variance is 98 % explainable saves $\tfrac12\log_2 50 \approx 2.8$ bits, more than three times what a typical channel saves under the default budget.

So the same total predictability, concentrated in a few channels, buys more bits than when it is spread evenly. In the calculator's lower part, give 10 % of the channels a noise share of 2 % and leave the rest at the default budget: the average rises from 0.87 to about 1.06 bits per element — the few near-deterministic channels add as much as the whole block rung.

Do KV caches have such channels? There are hints. Papers on KV quantization report that keys have a few channels whose values are much larger than the rest and change slowly from token to token ([[#papers-kivi]], [[#papers-kvquant]]). If those channels are near-deterministic at block scale, they are the escape hatch. But three things are unknown: whether they survive at 8-bit precision, how many of the entry's bytes they own, and how the 8-bit number grid treats a prediction ([[#homework-the-grid]] shows that a logarithmic grid can eat much of the gain).

:::: compare Two ways to explain 70 % of the variance
::: col Spread evenly
- Every channel: 70 % explained, 30 % noise.
- Every channel saves 0.87 bit.
- Average: **0.87 bit per element.**
:::
::: col Concentrated (toy)
- 10 % of channels: 98 % explained; the rest as before.
- Those channels save 2.8 bits each.
- Average: **about 1.06 bits per element.**
:::
::::

That is the honest position. The napkin does not offer a shortcut around measurement; it is the reason measurement is needed. Wave 1 measures, per layer, for keys and values separately, how much of an entry is near-deterministic at each scope ([[#plan-experiment-1b]]).

::: takeaway
- Bits are averaged over channels, and the exchange rate is steep near $\vRsq = 1$: a few near-deterministic channels can carry the gain.
- Keys reportedly have such channels; whether they survive at 8 bits, and how much they own, is unmeasured.
- The trap is not a refutation — it sets the expected size, and the size must be measured.
:::
