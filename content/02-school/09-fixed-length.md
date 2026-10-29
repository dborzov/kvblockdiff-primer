---
title: Fixed-length codes and escapes
nav: Fixed-length codes and escapes
lede: Give every value the same number of bits, park the rare giants in a side stream, and any single value can be read on its own. It costs a bit more than an entropy coder — and buys speed.
group: Coding
cards:
  - q: How many different values can an $\vn$-bit fixed-length slot hold, if one code is reserved as the escape marker?
    a: '$2^{\vn} - 1$ values (0 to $2^{\vn} - 2$)'
    wrong: ['$2^{\vn}$ values', '$\vn$ values', '$2\vn$ values']
    why: 'An $\vn$-bit slot has $2^{\vn}$ codes. The top one, all ones, means “look in the escape stream”, which leaves the rest for ordinary values: 0 to 30 in a 5-bit slot.'
    sec: escapes
  - q: For the 1,024 Gull Rock wind readings, which width gives the fewest bits in total, escapes included?
    a: 5 bits, about 5.54 bits per reading
    wrong: ["4 bits, about 4.0 bits per reading", "6 bits, exactly 6 bits per reading", "8 bits, exactly 8 bits per reading"]
    why: 'At 5 bits only the 31 gales escape (ε = 3.0 %), adding 0.54 bits per reading. At 4 bits, 201 ordinary breezes escape as well (232 escapes in all), and the escapes cost more than the bit saved.'
    sec: escapes
  - q: What is random access?
    a: Being able to decode any single item without decoding the items before it
    wrong: ["Reading the items in a random order to improve compression", "Choosing the code width at random", "Storing the items at random positions"]
    why: With $\vn$-bit slots, item $k$ starts at bit $k\vn$. With an entropy-coded stream, you must decode from the start to find it.
    sec: fixed
  - q: 'With $\vn = 5$, ε = 3.0 % and 18 bits per escape, what is the cost per reading?'
    a: About 5.54 bits
    wrong: ["5.03 bits", "5.18 bits", "23 bits"]
    why: '$\vn + \veps \times 18 = 5 + 0.030 \times 18 \approx 5.54$.'
    sec: escapes
  - q: Compared with an entropy coder, what does the fixed-length code with escapes buy for the extra bit per wind reading?
    a: Random access and decoding every reading independently, in parallel
    wrong: ["A smaller archive", "Protection against transmission errors", "No need for any side information"]
    why: The entropy coder gets 4.54 bits per reading, the fixed-length code 5.54. The extra bit pays for knowing where every reading starts.
    sec: trade
---

A phone call reaches the harbour office: “What was the wind at three in the morning on the 12th?” The archive holds a whole month of half-hourly readings, compressed.

If the month was coded with an [[entropy-coder]], the clerk must decode it from the first reading of the month, because the coder's state ([[#school-arithmetic]]) depends on everything before. If every reading has a slot of the same size, she can jump straight to it. This page is about the second way, and what it costs.

## Every value in n bits {#fixed}

Here are three weeks of wind speeds from Gull Rock: 1,024 half-hourly readings, in whole knots. Most of the time a breeze blows — the median is 9 knots, and 95 % of the readings are 22 knots or less. But 31 of them are gales between 40 and 59 knots.

The station's 8-bit chip stores each reading in one byte, which holds 0 to 255. That is generous. Five bits hold 0 to 31, and nearly every reading fits.

::: define fixed-length-code
- **What it is:** a code that gives every value the same number of bits, $\vn$. An $\vn$-bit slot holds $2^{\vn}$ different codes — the same $2^{\vn}$ as the $\vn$ questions of [[#school-bits]].
- **Example:** the byte of the station's chip is an 8-bit fixed-length code; 5-bit slots would hold wind speeds 0 to 31.
- **Easy to confuse with:** an entropy coder. A fixed-length code ignores which values are common: a calm 9 knots and a rare 30 knots cost the same.
:::

Because every slot has the same width, the position of any reading is known in advance. Reading number $k$ (counting from 0) starts at bit $k\vn$. With 5-bit slots, reading 500 starts at bit 2,500 — no need to look at the 500 readings before it.

::: define random-access
- **What it is:** being able to decode any single item on its own, without decoding what comes before it.
- **Example:** reading 500 of a 5-bit archive is bits 2,500 to 2,504.
- **Easy to confuse with:** fast decoding in general. A stream coder can be fast and still lack random access; it is the *jump* that matters.
:::

::: takeaway
- A fixed-length code gives every value $\vn$ bits; an $\vn$-bit slot holds $2^{\vn}$ codes.
- Item $k$ starts at bit $k\vn$, so any item can be read on its own: random access.
- It ignores which values are common, so it cannot reach the entropy.
:::

## Escapes for the rare gales {#escapes}

Five bits cannot hold a 47-knot gale. One answer is to widen every slot to 6 bits for the sake of 31 readings out of 1,024. The better answer is to let the gales *escape*.

1. Reserve the top 5-bit code, 31 (`11111`), as a marker meaning “look elsewhere”. Ordinary readings 0–30 go in their slots as usual.
2. For each gale, write the marker in its slot and append a pair (position, value) to a separate **escape stream**: a 10-bit position (enough for 1,024 readings) and the raw 8-bit value.
3. To read reading $k$: read its slot. If it holds the marker, look $k$ up in the escape stream, which is sorted by position.

::: define escape
- **What it is:** a value too big for the fixed width is marked in its slot and stored in full, with its position, in a separate escape stream. The share of escaped values is written $\veps$.
- **Example:** at 5 bits, the 31 gales escape: $\veps = 31/1024 \approx 3.0\,\%$, at 18 bits each.
- **Easy to confuse with:** an error or a dropped value. Nothing is lost; escaped values are stored exactly, just elsewhere.
:::

The bill per reading is the slot plus each reading's share of the escape stream:

$$
\text{bits per reading} = \underbrace{\vn}_{\text{slot}} + \underbrace{\veps}_{\text{share escaped}} \cdot (\underbrace{10}_{\text{position}} + \underbrace{8}_{\text{raw value}})
$$ {#eq-escape-cost}

At $\vn = 5$: $5 + 0.030 × 18 \approx 5.54$ bits per reading. Try the other widths in the figure.

::: figure fig-fixed-escapes siFixedWidth
**Choosing a width for 1,024 wind readings.** Top: histogram of the readings in knots (one bar per knot). Bars that fit in an $\vn$-bit slot are green; values above $2^{\vn} - 2$ escape and are red; the dashed line marks the cut-off. Tiles: the number of escapes and $\veps$, the bits per reading (slot + escape stream, each escape costing a 10-bit position and an 8-bit raw value), and the size of the whole archive against one raw byte per reading. Bottom: bits per reading for every width from 3 to 8, split into slots (green) and the escape stream (red); dashed lines mark the raw byte (8 bits) and the entropy of the histogram (4.54 bits), the floor for any code that treats readings one at a time. The readout lists the start of the escape stream. Synthetic, seeded data: a breeze (Rayleigh-shaped, scale 8 knots) plus 2.5 % gales of 40–60 knots.
:::

| width $\vn$ | slots hold | escapes | bits per reading |
|---:|---|---:|---:|
| 3 | 0–6 knots | 736 | 15.94 |
| 4 | 0–14 knots | 232 | 8.08 |
| **5** | **0–30 knots** | **31** | **5.54** |
| 6 | 0–62 knots | 0 | 6.00 |
| 8 | 0–254 knots | 0 | 8.00 |

::: try
1. Start at 5 bits: only the gales escape, and the whole archive takes 710 bytes instead of 1,024.
2. Go down to 4 bits: 201 ordinary readings of 15–30 knots now escape along with the gales, 232 in all, and the escape stream outweighs the bit saved.
3. Go up to 6 bits: no escapes at all, but every one of the 1,024 readings pays an extra bit for the sake of 31 gales.
:::

::: theme every-tax
Every escape pays an 18-bit tax, more than three times its slot. Escapes are worth it only while they are rare: at 5 bits the tax adds 0.54 bits per reading, at 4 bits it adds 4.08 and swamps the saving.
:::

::: takeaway
- Escapes keep the common case narrow: rare large values go to a side stream as (position, raw value).
- Bits per reading $= \vn + \veps \times$ (position bits + raw bits).
- For the wind, 5 bits is best: 5.54 bits per reading against 8 raw.
:::

## Speed versus bits {#trade}

How far is 5.54 bits from the best possible? The order-0 entropy of the wind histogram is 4.54 bits per reading: an entropy coder that treats readings one at a time could get close to that. So the fixed-length code pays about one extra bit per reading, 22 % more. What does the extra bit buy?

:::: compare Two ways to store the wind archive
::: col Entropy coder (Huffman, rANS)
- about 4.54 bits per reading
- one long stream with a running state
- reading 500 needs readings 0–499 decoded first
- one decoder works through the stream in order
:::
::: col Fixed-length slots + escapes
- 5.54 bits per reading
- every reading in a known place
- reading 500 is bits 2,500–2,504, plus a lookup if it escaped
- a thousand workers can decode a thousand readings at once, each on its own
:::
::::

Which one is right depends on how the archive will be read. A clerk who replays a whole month in order should pick the entropy coder. A clerk who answers a stream of scattered one-reading questions should pick the slots, and gladly pay the bit.

::: theme access-pattern
Here the theme shows up before any statistics: the *way* the archive is read — one long replay, or many single readings scattered across the month — decides which code is even allowed.
:::

The choice is not all or nothing. An entropy-coded stream can be cut into chunks of, say, 256 readings, each restarting the coder. A single reading then costs decoding at most one chunk, and each restart costs a few bits. Many real formats sit somewhere on this line. Part V meets one that uses exactly this page's shape — fixed 4-bit slots plus escapes — on a modern problem: [[#papers-splitzip]].

::: takeaway
- An entropy coder gets 4.54 bits per wind reading; fixed slots with escapes get 5.54.
- The extra bit buys random access and independent, parallel decoding.
- How the data will be read decides which trade is right; chunked streams sit in between.
:::
