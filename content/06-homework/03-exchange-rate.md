---
title: The exchange rate, applied
nav: The exchange rate, applied
group: Napkin information theory
lede: 'A dictionary helps only by predicting. How much prediction buys how many bits is fixed by one formula from Part II — and on 8-bit KV numbers its rate is harsh.'
cards:
  - q: 'A predictor explains R² = 75 % of an element''s variance. For bell-shaped data, how many bits per element does it save?'
    a: 1 bit
    wrong: ["6 bits — three quarters of 8", "0.75 bit", "3 bits"]
    why: '½ log₂ 1/(1 − 0.75) = ½ log₂ 4 = 1. Two bits need 94 %, three bits need 98.4 %.'
    sec: rate
  - q: 'Starting from a context-free rate of 6.2 bits, what extra compression does a 75 % predictor give?'
    a: About 1.19×
    wrong: ["4×", "1.75×", "1.01×"]
    why: '6.2 / (6.2 − 1) ≈ 1.19. Lossless gains stay modest unless the predictor explains nearly everything.'
    sec: rate
  - q: Which variance does R² refer to here?
    a: The variance that remains after the context-free code, element by element
    wrong: ["The variance of the whole cache", "The variance of the attention scores", "The variance of the dictionary"]
    why: Bits are counted per element against the solo rate. A predictor must explain variance that the element's own histogram does not already account for.
    sec: game
  - q: 'Ten channels of a 640-element entry are predicted almost perfectly (R² = 0.99, 3.3 bits each); the rest not at all. What is saved per element of the entry?'
    a: About 0.05 bit
    wrong: ["About 3.3 bits", "About 1 bit", "About 0.5 bit"]
    why: 'Bits add up per element: 10 × 3.3 = 33 bits spread over 640 elements is 0.05 bit each. Owning most of the variance is not owning most of the bytes.'
    sec: game
---

A dictionary predicts an element from what the receiver already holds. Suppose the prediction is good: it explains **half** of the element's variance. Sounds like a halving of the bits?

| explained, $\vRsq$ | bits saved | new rate, from 6.2 | extra compression |
|---:|---:|---:|---:|
| 50 % | 0.50 | 5.70 | 1.09× |
| 75 % | 1.00 | 5.20 | 1.19× |
| 90 % | 1.66 | 4.54 | 1.37× |
| 94 % | 2.03 | 4.17 | 1.49× |
| 99 % | 3.32 | 2.88 | 2.15× |

Half the variance buys half a bit, out of six. This page is about why the table looks like that, and what it means for a dictionary on KV.

## From R² to bits, on 8-bit numbers {#rate}

::: aside reminder The exchange rate (II.12)
A predictor that explains a share $\vRsq$ of a value's variance leaves a [[residual]] with variance $(1-\vRsq)\vsigma^2$. For a [[gaussian]] value, the bits needed fall by $\log_2$ of the ratio of [[standard-deviation|standard deviations]]: halve the spread, save one bit ([[#school-residual-shapes]], [[#school-exchange-rate]]).
:::

The rule of [[#school-exchange-rate]], written for one element:

$$
\begin{aligned}
\text{saved per element} &= \tfrac12 \log_2 \frac{\vsigma^2}{\underbrace{(1-\vRsq)\,\vsigma^2}_{\text{residual}}} \\
&= \tfrac12 \log_2 \frac{1}{1-\vRsq}
\end{aligned}
$$ {#eq-hwa-exchange}

Three things about it matter for KV.

- **It is logarithmic.** Each extra bit needs the leftover variance divided by four. 75 % buys 1 bit; 94 % buys 2; 98.4 % buys 3.
- **It is per element.** Every one of an entry's elements pays its own bits, so the savings average over elements, not over variance.
- **It starts from the solo rate.** The context-free code of [[#homework-solo-coding]] already brought the element to 6.2–6.5 bits. The predictor has to explain variance that the element's own histogram cannot.

How good is a predictor that buys three bits? Part II met one: the Gull Rock thermometer, guessed by its own reading half an hour earlier ([[#school-exchange-rate]]). Here it is again.

::: dataset fig-hwa-temp-lag temp view=lag metrics=r2,exch,saved
**The Gull Rock temperatures, against the reading before (from II.12).** Each reading (vertical axis, °C) against the reading half an hour earlier (horizontal axis); each small square is one pair of values, darker where more readings share it. The dashed diagonal is the guess "the same as last time". The Numbers tab gives the share of variance that guess explains and the bits it saves, by formula and by counting. Synthetic, seeded data (four weeks, one reading every half hour).
:::

The cloud is a thin streak: the guess explains 98.4 % of the variance, and it saves about three bits. That is the bar for three bits on a KV element — a guess as good as "the same as half an hour ago" on a slowly changing thermometer, for every element of every entry.

::: figure fig-hwa-exchange hwaExchange
**The exchange rate on 8-bit KV.** Curve: bits saved per element, $\tfrac12\log_2\frac{1}{1-\vRsq}$, against the share of the element's variance the dictionary predicts ($\vRsq$, after solo coding). Dots mark the rows of the table above. **Drag** the knob (or focus it and use the arrow keys); **switch** the starting rate between our Gaussian E4M3 channel (6.47 bits) and SplitZip's real E5M2 KV (6.19 bits). The tiles give the new rate, the extra compression on top of solo coding, and the total compression against raw 8-bit storage. Gaussian residuals assumed; no dictionary costs charged yet.
:::

::: try
1. Drag to 50 %. The curve is still nearly flat: half a bit.
2. Find where one full bit is saved (75 %) and where two are (94 %).
3. Drag towards 99 %. The curve shoots up — but only a predictor that knows almost everything gets there.
:::

::: takeaway
- Bits saved per element $= \tfrac12\log_2\frac{1}{1-\vRsq}$: 75 % buys 1 bit, 94 % buys 2.
- On top of a 6.2-bit solo rate, one bit is only 1.19× extra compression.
- Lossless gains are modest unless the data is nearly predictable.
:::

## Lossless is a game of variance explained {#game}

The [[cat-ladder]] of [[#idea-cat-thread-ladder]] said: entries of the same paragraph are "about the same thing", so they should compress against each other. [[#idea-the-trap]] turned that into a variance budget. Here it is again with the exchange rate applied, for an illustrative entry whose variance splits like this:

| rung | of all variance | of what is left | bits saved |
|:---|---:|---:|---:|
| global (any request) | 30 % | 30 % | 0.26 |
| thread (this request) | 20 % | 29 % | 0.24 |
| block | 20 % | 40 % | 0.37 |
| noise | 30 % | — | — |
| **all three** | **70 %** | | **0.87** |

(Illustrative shares, the defaults of IV.14. Each rung's $\vRsq$ is its share of the variance left after the rungs above it.)

::: figure fig-hwa-ladder hwaLadder
**The variance ladder in bits.** Top bar: the entry's variance split into what each rung explains — global (any request), request (this thread), block — and the noise no rung explains, in per cent. Bottom bar: the bits per element each rung saves, by the exchange rate applied to its share of *what the rungs above it left*. **Slide** the three shares (the noise is the rest, at least 5 %). The tiles give the total, the block rung's own saving, and how much of all the variance the block rung would need to save one bit by itself. Illustrative shares; bell-shaped data assumed.
:::

::: try
1. Move variance from the global rung to the block rung, keeping the noise at 30 %. The bars change places; the total stays at 0.87 bit.
2. Lower the noise to 10 %. Only now does the total pass 1.6 bits.
3. Read the last tile at the defaults: the block rung would need 37.5 % of all the variance for one bit — three quarters of the 50 % the upper rungs left.
:::

The second experiment is the important one. The total is $\tfrac12\log_2$ of one over the noise share, however the explained part is split among the rungs. Dictionaries decide *who* earns the bits; the noise decides how many there are.

To get **one** bit from the block rung alone, the block would have to explain three quarters of what the global and thread rungs left. "About the same subject" is a much weaker statement than that.

::: theme noise-floor
Here the floor is the 30 % of the variance that no rung explains. However clever the dictionaries, that share caps the whole ladder at $\tfrac12\log_2\frac{1}{0.3} = 0.87$ bit per element, because a lossless code must reproduce the noise exactly.
:::

There is one escape hatch, and it needs care: **heterogeneity**. Real key vectors have a few [[channel|channels]] with very large, slowly varying values ([[#papers-kivi]]). Those channels can hold most of an entry's variance and be predicted almost perfectly. But bits are counted per element, not per unit of variance:

::: note numbers Owning the variance is not owning the bytes
An entry of $\vd = 640$ elements. Ten channels are predicted with $\vRsq = 0.99$ and save 3.3 bits each; the other 630 are not predicted at all.

- Saved per entry: $10 \times 3.3 = 33$ bits.
- Saved per element: $33 / 640 \approx 0.05$ bit.

If those ten channels carried 90 % of the entry's variance, a variance-weighted $\vRsq$ would read 89 % — and promise 1.6 bits per element. The true saving is thirty times smaller. Outlier channels compress beautifully, but they are a few bytes of a 640-byte entry. How many bytes they own is a measurement, not an assumption ([[#homework-where-bits-come-from]]).
:::

::: takeaway
- A ladder of plausible variance shares buys under one bit per element in total; the noise share caps it.
- $\vRsq$ must be read per element. A few perfectly predicted channels save little per element of the whole entry.
- Whether KV has enough predictable variance, in enough elements, is the question to measure.
:::
