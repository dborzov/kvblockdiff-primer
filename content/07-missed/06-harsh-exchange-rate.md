---
title: Lossless is a game of variance explained
nav: The harsh exchange rate
lede: Two entries can be 95 % alike and still leave three quarters of the bill unpaid. Lossless coding converts explained variance into bits at a harsh rate, and the noise sets a ceiling. The one escape is unevenness, a few channels that are almost perfectly predictable.
cards:
  - q: Every element of an entry is correlated 0.95 with the same element of its neighbour. How many bits per element does the neighbour save, at most (bell-shaped data)?
    a: About 1.68 bits — still about 4.8 of 6.47 bits to pay
    wrong: ["About 6.1 bits — 95 % of the cost", "About 0.95 bits", "About 3.2 bits — half the cost"]
    why: 'The neighbour explains $0.95^2 = 90.25\%$ of the variance; $\tfrac12\log_2\tfrac{1}{0.0975} \approx 1.68$ bits.'
    sec: claim
  - q: How much of the remaining variance must a predictor explain to save 2 bits per element?
    a: 93.75 %
    wrong: ["50 %", "75 %", "99.9 %"]
    why: Each bit halves the standard deviation, which removes three quarters of the variance left. Two bits leave 1/16, so 15/16 must be explained.
    sec: claim
  - q: If 30 % of an entry's variance is pure noise, what is the most any dictionary can save per element?
    a: About 0.87 bit
    wrong: ["About 5.6 bits", "About 2.4 bits — 30 % of 8", "About 0.30 bit"]
    why: 'At best the dictionary explains the other 70 %: $\tfrac12\log_2\tfrac{1}{0.3} \approx 0.87$ bit, out of 6.47.'
    sec: budget
  - q: Sixteen channels, average R² = 30 %. Spread evenly they save 0.26 bit per element. Two channels at 99 %, the rest at 20 %, save…
    a: 0.56 bit — more than twice as much
    wrong: ["0.26 bit — only the average matters", "0.13 bit — half as much", "3.3 bits — the two giants dominate everything"]
    why: The exchange rate is gentle at low R² and steep near 100 %, so concentrated predictability buys more bits than the same amount spread thin.
    sec: escape
  - q: What does the plan measure because of the escape hatch?
    a: R² and bits saved for every channel, keys and values separately, not only the average
    wrong: ["Only the average R² over the whole entry", "Cosine similarity between neighbouring entries", "The hit rate per channel"]
    why: A few nearly predictable channels can carry most of the gain; an average hides them.
    sec: escape
---

Two KV entries sit side by side. Every element of one is correlated 0.95 with the same element of the other. To the eye they are near-twins.

Store the second exactly, given the first. If the elements are bell-shaped, the twin saves about 1.68 bits per element. An 8-bit E4M3 element of such a channel costs 6.47 bits on its own ([[#homework-the-budget]]), so about 4.8 bits are still to pay. Ninety-five per cent alike, three quarters of the bill still due.

## What the first draft hoped {#claim}

The [[cat-ladder]] says an entry is less surprising among entries "about the same subject". The first draft hoped this would be a big effect, worth many bits. The earlier proposal's verdict: "about the same subject" is a small fraction of an entry's variance, and "the napkin that the first draft hoped for is not a shortcut around measurement; it is the reason measurement is needed."

The hope was natural.

- **Similarity feels like a share of the bill.** 95 % alike sounds like 95 % saved.
- **Lossy quantization suggests plenty of slack.** Keys and values survive 2-bit rounding with little loss of accuracy ([[#papers-kivi]]). But that measures what the model *tolerates*, not what is predictable.
- **Neighbouring entries often look alike** by cosine similarity, a number that does not convert into bits.

Lossless coding converts at a fixed exchange rate, from [[#school-exchange-rate]]:

$$
\Delta\text{bits} \;=\; \tfrac12 \log_2 \frac{1}{\underbrace{1 - \vRsq}_{\text{variance left}}} \quad \text{per element}
$$ {#eq-ma-exchange}

| bits saved per element | variance the predictor must explain |
|---|---|
| 0.5 | 50 % |
| 1 | 75 % |
| 1.68 | 90.25 % (correlation 0.95) |
| 2 | 93.75 % |
| 3 | 98.4 % |

Each extra bit costs three quarters of whatever variance is still left.

::: takeaway
- "Alike" to the eye is not "cheap" to a lossless coder.
- One bit needs 75 % of the variance explained, two bits need 94 %.
:::

## The budget after noise {#budget}

Part of every entry no dictionary can predict: rounding noise, token identity, the quirks of one word in one sentence. Lossless coding must pay for all of it. That share sets a ceiling on what any dictionary can win.

::: figure fig-ma-budget maBudgetBar
**One element's bits, from 0 to the raw 8.** Grey: what [[solo]] coding already saves on a bell-shaped E4M3 channel (8 → 6.47 bits, [[#homework-the-budget]]). Green: what this dictionary wins, from the exchange rate with the chosen variance explained. Pale gold: still winnable by a perfect dictionary. Red: the noise floor, paid no matter what: a perfect dictionary explains everything but the noise share and saves $\tfrac12\log_2\tfrac{1}{\text{noise share}}$. *Controls:* the noise share of the variance; the variance this dictionary explains (it cannot exceed 100 % minus the noise). Bell-shaped model, before any effect of the number grid (VII.7).
:::

With 30 % noise, a perfect dictionary saves at most 0.87 bit of the 6.47. A good but imperfect one that explains 50 % saves 0.50 bit, and the element still costs 5.97 bits: 1.34× smaller than raw.

::: aside reminder The ladder as a variance budget
[[#idea-the-trap]] splits an entry's variance into rungs: 30 % explained by global statistics, 20 % more by the thread, 20 % more by the block, 30 % noise. The whole ladder is then worth about 0.9 bit per element, and the block rung alone about 0.4.
:::

::: try
1. Push the noise share down to 10 %. The ceiling rises to 1.66 bits. At 1 % it is 3.32.
2. Set the dictionary to explain 75 % with noise at 10 %. It wins exactly one bit.
3. Find the noise share at which even a perfect dictionary cannot reach 1.5× smaller than raw.
:::

::: theme noise-floor
The red block does not shrink, whatever the dictionary. A lossless code pays for every last digit, so the share of the variance that nothing can predict decides how much there is to play for.
:::

::: takeaway
- The noise share caps the winnable bits at $\tfrac12\log_2(1/\text{noise share})$.
- At realistic noise shares the winnable part is a sliver of the 6.47-bit bar.
:::

## The escape hatch: uneven channels {#escape}

There is one way out, and it comes from the shape of the exchange rate. The curve is gentle at low [[r-squared|R²]] and very steep near 100 %. So *where* the explained variance sits matters, not only how much there is.

::: figure fig-ma-spread maSpread
**Sixteen channels with the same average R², arranged differently.** Each bar is one [[channel]]'s variance explained; the number above it is the bits per element that channel saves, $\tfrac12\log_2\tfrac{1}{1-\vRsq}$. The dashed line is the average R². *Tiles:* the average; the bits saved per element by these channels, averaged over channels (each channel is coded on its own scale); and the bits the same average would save if spread evenly. *Controls:* drag a bar's top, or focus it and use the arrow keys; the buttons load three arrangements with the same 30 % average. R² is capped at 99.9 %.
:::

With the same 30 % average:

- spread evenly over 16 channels: 0.26 bit per element;
- two "slow giants" at 99 %, the rest at 20 %: 0.56 bit, more than twice as much;
- one giant at 99.9 %, the rest at 25 %: 0.51 bit.

Real-looking data does this too. Take the five channels of the ten days at Gull Rock ([[#school-correlation]]) and predict each one from its own reading half an hour before.

::: dataset fig-ma-channels missed-channels view=bars hl=giants metrics=avg,even,bits,flag
**Five Gull Rock channels, predicted from half an hour before.** *Plot:* one bar per channel: the share of its variance explained by the guess "the same as last time", $\vRsq = 1 - \text{var(change)}/\text{var(channel)}$; the label above each bar is the bits per reading this saves, $\tfrac12\log_2\tfrac{1}{1-\vRsq}$. A channel whose previous reading is a worse guess than its mean is not predicted and counts as zero. The dashed line is the average. The highlight marks the slow channels. *Table:* the five channels. *Numbers:* the average, what it would buy if spread evenly, and what it buys as it is. Synthetic, seeded data from II.14.
:::

The average is 57 %, which spread evenly would buy 0.61 bit per element. Concentrated in three slow channels — both thermometers and the pressure — it buys 1.29, about twice as much. The wind's previous reading is a worse guess than its average, so the wind is not predicted at all: the per-channel "predict or not" flag of [[#missed-mantissa-and-grid]], at work on a toy.

This is the escape hatch the earlier proposal named: a few channels with huge, slowly drifting values, which "compress like a dream". The literature on keys reports exactly such channels ([[#papers-kvquant]]). Values may not have them. If values show nothing, half of every entry stays at the solo rate, and the [[delta-ratio]] is capped near 0.85 ([[#homework-where-bits-come-from]]).

So the plan changes in three ways.

- **R² and bits are reported per channel,** as a distribution, not as one average.
- **Keys and values are measured separately,** and keys before [[rope|RoPE]], where the giants are expected ([[#missed-keys-before-rope]]).
- **The napkin math is a reason to measure, not a substitute.** It says how much variance would have to be explained; only the data says whether it is.

::: takeaway
- For the same average R², predictability concentrated in a few channels buys about twice the bits.
- Measure channel by channel, keys apart from values.
:::
