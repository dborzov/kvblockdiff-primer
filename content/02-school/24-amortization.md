---
title: Pay once, use many times
nav: Amortization
lede: A season ticket for the ferry costs as much as 25 single trips. Whether it pays depends only on how many trips it is shared by. The same arithmetic decides whether any dictionary, codebook or table of means is worth sending.
group: Machines
cards:
  - q: 'A season ticket costs 300 crowns; a single trip costs 12. After how many trips does the season ticket pay off?'
    a: 25 trips
    wrong: ["12 trips", "300 trips", "2 trips"]
    why: 'Break-even = fixed cost ÷ saving per item = 300 ÷ 12 = 25.'
    sec: rule
  - q: What is the per-item cost of a fixed cost shared by n items?
    a: The fixed cost divided by n
    wrong: ["The fixed cost times n", "The fixed cost, whatever n is", "The fixed cost divided by its square root"]
    why: That is all amortization is. It falls as 1/n — a straight line of slope −1 on log–log axes.
    sec: rule
  - q: 'The regime codebook of II.17 costs 96 bits to send once and saves about 2.9 bits per reading. When does it break even?'
    a: After about 33 readings
    wrong: ["After about 3 readings", "After about 96 readings", "Never — a codebook always costs more than it saves"]
    why: '96 ÷ 2.92 ≈ 33. Beyond that, every reading is profit; before it, the codebook is a loss.'
    sec: radio
  - q: 'A dictionary weighs as much as $\vw$ items and is shared by $\vb$ items, with every number stored in 8 bits. What does it cost per number?'
    a: '$8\vw/\vb$ bits'
    wrong: ['$8\vb/\vw$ bits', '$\vw \vb / 8$ bits', '$8\vw$ bits, whatever $\vb$ is']
    why: 'It is $\vw/\vb$ items’ worth per item, and an item’s worth is 8 bits per number.'
    sec: preview
---

The ferry from the harbour to the islands sells two kinds of ticket. A single trip costs 12 crowns. A season ticket costs 300 crowns and covers every trip until spring. Should the forecaster, who visits the island stations now and then, buy one?

Nobody can answer that without one more number: *how many trips?* Three trips, and the season ticket is a waste of 264 crowns. Fifty trips, and it saved 300. The ticket itself never changes. Only the number of trips that share its price does.

## The rule {#rule}

::: define amortization
- **What it is:** spreading a one-time cost over everything that shares it. Per item, the fixed cost becomes $\text{fixed cost} \div \text{number of items}$.
- **Break-even:** the shared thing pays for itself once the number of items exceeds $\text{fixed cost} \div \text{saving per item}$.
- **Example:** the season ticket: $300 \div 12 = 25$ trips to break even.
- **Easy to confuse with:** a discount. Amortization is not cheaper per se; it is a bet on volume.
:::

::: keycard The amortization rule
$$
\text{cost per item} = \frac{\text{fixed cost}}{\text{number of items sharing it}},
\qquad
\text{break-even} = \frac{\text{fixed cost}}{\text{saving per item}}
$$ {#eq-sv-amortization}
A fixed cost is worth paying only if enough items share it.
:::

You have met this already, without the name. A zstd [[trained-dictionary]] is big compared with one message and tiny compared with a million ([[#tiny-files-three-lessons]]). The per-channel means of II.13 cost one reading's worth to send and saved 24 bits on every reading after. The codebook of II.17 had to cross the link once before any index meant anything.

::: takeaway
- Per-item cost of a shared fixed cost = fixed cost ÷ number of items.
- Break-even = fixed cost ÷ saving per item. Below it, the shared thing is a loss; above it, profit.
:::

## Amortization on the radio {#radio}

On the Gull Rock radio link the "ticket" is a table both ends keep, and it is paid in bits. Plot the two numbers that matter against the number of readings that share the table: its cost per reading falls as $1/n$; its saving per reading stays flat. Where the lines cross is break-even.

::: figure fig-sv-amortize svAmortize
**A fixed cost shared by more and more items.** Red: the fixed cost per item, fixed cost ÷ number of items — a straight line of slope −1 on these logarithmic axes. Green dashed: the saving per item. To the right of their crossing (the break-even point, marked) the shaded region is profit. *Choose* an example: the ferry season ticket (300 crowns, saving 12 per trip); the per-channel means of II.13 (45 bits once, saving 24 bits per reading); the weather-regime codebook of II.17 (3 centroids × 2 numbers × 16 bits = 96 bits once, saving 2.92 bits per reading after its index tax; illustrative). *Slide* the fixed cost and the saving to make your own; the read-out gives the break-even point and the net after 10 and after 1000 items.
:::

| shared thing | fixed cost | saving per item | break-even | per item, over a day of 48 readings |
|---|---|---|---|---|
| ferry season ticket | 300 crowns | 12 crowns | 25 trips | — |
| channel means (II.13) | 45 bits | 24 bits | 2 readings | 0.9 bits |
| regime codebook (II.17) | 96 bits | 2.92 bits | 33 readings | 2.0 bits |

Two things are easy to forget.

- **Break-even moves with the saving, not just the cost.** The codebook is cheap to send, but its saving per reading is small, so it needs 33 readings to pay. The means are just as cheap and save a lot, so they pay almost at once.
- **The fixed cost comes back whenever the shared thing changes.** If the weather regimes drift and the codebook must be refitted and resent every few hours, each new copy has to earn its 96 bits again.

::: theme amortize
Every helper on this site — a trained dictionary, a table of means, a rotation, a codebook — is a fixed cost waiting to be shared. Its price per item is fixed cost ÷ items. Whether it pays is decided by how many items share it, which is a property of how the system is used, not of the helper.
:::

::: takeaway
- Plot fixed cost per item (falling as $1/n$) against saving per item (flat): break-even is where they cross.
- A small saving per item needs many items: the regime codebook needs 33 readings, the channel means 2.
- Each refit is a new fixed cost to earn back.
:::

## A preview: the 8w/b rule {#preview}

Later Parts measure dictionaries not in bits but in *items' worth*: how many readings' worth of numbers the dictionary holds. Write $\vw$ for that weight and $\vb$ for the number of items that share it. Part IV gives these two letters their permanent jobs ([[#idea-dictionary-delta-block]]); here they keep their toy meaning.

A dictionary of weight $\vw$, shared by $\vb$ items, costs $\vw/\vb$ items' worth per item. If every number is stored in 8 bits (II.19), an item's worth is 8 bits per number, so:

$$
\text{dictionary cost per number} = \frac{8\,\vw}{\vb}\ \text{bits}
$$ {#eq-sv-8wb}

| dictionary | weight $\vw$ (readings' worth) | shared by a day, $\vb = 48$ | shared by an hour, $\vb = 2$ |
|---|---|---|---|
| per-channel means and spreads | 2 | 0.33 bit per number | 8 bits per number |
| regime codebook, 3 centroids | 3 | 0.5 bit per number | 12 bits per number |

A light dictionary is affordable at almost any sharing; a heavy one only when shared widely. Part VI turns this one line into the rule that limits how small a dictionary's group of items can be ([[#homework-amortization-rule]]). And it adds the tension this toy leaves out: a dictionary fitted to fewer items fits each of them better, so narrowing the group raises the saving while raising the cost ([[#homework-scope]]).

::: takeaway
- In items' worth: a dictionary of weight $\vw$ shared by $\vb$ items costs $\vw/\vb$ per item, or $8\vw/\vb$ bits per 8-bit number.
- Light dictionaries are cheap at any sharing; heavy ones need wide sharing.
:::
