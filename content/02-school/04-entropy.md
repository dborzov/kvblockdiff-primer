---
title: 'Entropy: the average surprise'
nav: 'Entropy: the average surprise'
lede: Average the surprisal over everything a source might say and you get its entropy — the fewest bits per symbol that any lossless code can average. For the Gull Rock sky it is 1.75 bits.
group: Information
cards:
  - q: What is the entropy of the Gull Rock sky (sunny ½, cloudy ¼, rain ⅛, fog ⅛)?
    a: 1.75 bits per report
    wrong: ["2 bits per report", "1 bit per report", "3.36 bits per report"]
    why: '½·1 + ¼·2 + ⅛·3 + ⅛·3 = 1.75: the surprisals, weighted by how often each report comes.'
    sec: average
  - q: For a source with four possible outcomes, when is the entropy highest, and how high?
    a: When all four are equally likely — 2 bits
    wrong: ["When one outcome is certain — 2 bits", "When all four are equally likely — 4 bits", "When the probabilities are ½, ¼, ⅛, ⅛ — 1.75 bits"]
    why: 'Equal odds leave nothing to exploit: $\log_2 4 = 2$ bits. Any imbalance lowers the entropy; a certain outcome brings it to 0.'
    sec: average
  - q: What does order-0 entropy ignore?
    a: The context — which symbols came before
    wrong: ["The rare symbols", "The most common symbol", "Symbols with surprisal above 3 bits"]
    why: It is computed from symbol frequencies alone. Shuffle the reports and it does not change, so it cannot see that fog tends to follow fog.
    sec: histogram
  - q: Entropy estimated from the histogram of a small sample tends to be…
    a: too low
    wrong: ["too high", "exactly right", "always zero"]
    why: A small sample often misses or under-counts rare outcomes, so it looks more predictable than the source really is.
    sec: histogram
  - q: The sky's entropy is 1.75 bits. What is its perplexity?
    a: About 3.36
    wrong: ["1.75", "3.5", "0.30"]
    why: 'Perplexity is $2^{\vH} = 2^{1.75} \approx 3.36$: as unpredictable as a fair die with 3.36 faces.'
    sec: perplexity
---

Here are the noon sky reports of sixteen days, picked at random from the archive, with the surprisal of each (S = sunny, C = cloudy, R = rain, F = fog):

```text sixteen noon reports and their surprisal in bits
report    S  S  C  S  R  S  C  S  S  F  S  C  S  R  F  C
bits      1  1  2  1  3  1  2  1  1  3  1  2  1  3  3  2
```

Add up the bottom row: 28 bits for 16 reports, 1.75 bits per report. Notice anything? The cheap sunny reports come often, the expensive rare ones come seldom, and the average lands well below the 2 bits of the plain sky code from [[#school-bits]] (four reports, two questions each).

## Average surprise {#average}

This sample happens to contain the four reports in exactly their long-run proportions: 8 sunny, 4 cloudy, 2 rain, 2 fog. So its average is the long-run average. In the long run, half the reports cost 1 bit, a quarter cost 2, an eighth cost 3 and another eighth cost 3.

::: define entropy
- **What it is:** the average [[surprisal]] of a source — the expected number of bits per symbol.
- **Example:** the Gull Rock sky has an entropy of 1.75 bits per report.
- **Easy to confuse with:** the size of a file. Entropy belongs to a *source*, the process that produces symbols, together with the probabilities we assign to it.
:::

We call the source $\vX$ (here: the next sky report) and number its possible outcomes with $\vi$. Outcome $\vi$ has probability $\vp_{\vi}$. Then

$$
\vH(\vX) = \sum_{\vi} \underbrace{\vp_{\vi}}_{\text{how often}} \; \underbrace{\log_2 \frac{1}{\vp_{\vi}}}_{\text{surprisal of outcome } \vi}
$$ {#eq-entropy}

and for the sky,

$$
\vH(\vX) = \tfrac12 \cdot 1 + \tfrac14 \cdot 2 + \tfrac18 \cdot 3 + \tfrac18 \cdot 3 = 1.75 \text{ bits}.
$$

::: keycard Shannon's floor (1948)
$\vH(\vX)$ is the fewest bits per symbol that any lossless code can average.

No code for the Gull Rock sky averages below 1.75 bits per report; the code on [[#school-codes]] reaches it exactly.
:::

The figure lets you reshape the distribution and watch the entropy move.

::: figure fig-entropy-bars siEntropyBars
**Entropy of the sky, live.** Each bar is the probability of one sky report (vertical axis, 0 to 1); the label above it gives the probability and the surprisal in bits (“b”). Drag the top of a bar up or down; the other three rescale so that the four still add up to 1. Keyboard: focus a knob and use ↑ ↓. The strip below the plot is 2 bits wide and stacks each report's contribution $\vp_{\vi}\log_2(1/\vp_{\vi})$; its filled length is the entropy $\vH$, shown again in the left tile. Presets: the Gull Rock year, a summer month (sunny ¾, cloudy ⅛, rain and fog 1/16 each), all equal, always sunny.
:::

::: try
1. Pick **all equal**: 2 bits, the most four outcomes can ever cost.
2. Pick **always sunny**: 0 bits. A source that always says the same thing tells you nothing.
3. Pick **summer**: 1.19 bits. The sky is more predictable in summer than over the year.
4. Drag fog up until it equals sunny. Where is the entropy largest?
:::

::: takeaway
- Entropy is the average surprisal, $\vH(\vX) = \sum_{\vi} \vp_{\vi} \log_2(1/\vp_{\vi})$, in bits per symbol.
- The Gull Rock sky: 1.75 bits per report. Four equally likely outcomes: 2 bits, the maximum. A certain outcome: 0.
- It is a floor: no lossless code can average fewer bits.
:::

## Counting the archive {#histogram}

Nobody hands us the true probabilities. We count. A [[=histogram]] is that count: how many times each outcome (or each range of values) occurs in a sample. Divide by the sample size and you have an estimate of the distribution — and from it an estimate of the entropy.

How good is the estimate? The figure counts the first few reports of a long, randomly ordered archive.

::: figure fig-entropy-histogram siHistogram
**Estimating the entropy by counting.** The archive is 4,096 noon reports drawn at random from the sky distribution (seeded, so it is the same every time). Left: the histogram of the first $n$ reports, as shares of $n$ (bars, with the count on top); dashed ticks mark the true probabilities. Right: the entropy computed from that histogram, against $n$ on a doubling axis (violet line and dots; the knob marks the current $n$); the dashed green line is the average estimate over 200 independent archives of the same size; the grey dashed line is the true 1.75 bits. Move the slider to change $n$ from 8 to 4,096.
:::

With 16 reports the counts are 9, 3, 3, 1 and the estimate is 1.62 bits. With 64 it drops to 1.51 bits — this archive's early stretch is unusually sunny. Only after a thousand reports or so does the estimate settle within a few hundredths of 1.75. Notice that the dashed average curve stays *below* 1.75 for small samples: a short sample tends to miss rare outcomes, so it looks more predictable than the sky really is.

The number we just computed has a name, because it ignores something important.

::: define order-0-entropy
- **What it is:** the entropy computed from symbol frequencies alone, with no context — each symbol is treated as if it had no neighbours.
- **Example:** the 1.75 bits of the sky. Shuffle the archive into any order and the order-0 entropy stays exactly the same.
- **Easy to confuse with:** the true information content of a sequence. Real sky reports half an hour apart are sticky: fog tends to follow fog. Order-0 entropy cannot see that, so it overstates what a smarter code must pay. [[#school-mutual-information]] measures the difference.
:::

::: takeaway
- A histogram counts outcomes in a sample; divided by the sample size, it estimates the distribution.
- Small samples misestimate the entropy, usually on the low side.
- Order-0 entropy uses frequencies only and ignores the order of the symbols.
:::

## Perplexity, and why we count in bits {#perplexity}

Language-model papers often report [[=perplexity]] instead of entropy. It is the same number in different clothes: $2^{\vH}$.

| source | entropy $\vH$ (bits) | perplexity $2^{\vH}$ |
|---|---:|---:|
| a fair coin | 1 | 2 |
| the Gull Rock sky, summer | 1.19 | 2.28 |
| the Gull Rock sky, whole year | 1.75 | 3.36 |
| the wind vane, 16 directions all equally likely | 4 | 16 |

Perplexity reads as “an effective number of equally likely choices”. The sky over a year is as unpredictable as a fair die with 3.36 faces.

We stick to bits anyway. Bits add up — per report, per day, per message — and bits × number of values is the size on the wire. Perplexities multiply instead, and they never tell you how many bytes to expect.

::: theme bits-unit
Entropy, the average surprise, is already a price: 1.75 bits per sky report means 84 bits for a day of 48 reports, if a code reaches the floor. Perplexity is a fine description, but only bits can be added up on a bill.
:::

::: takeaway
- Perplexity is $2^{\vH}$, “the effective number of equally likely choices”: 3.36 for the sky.
- This site uses bits because they add up and convert straight into bytes on a wire.
:::
