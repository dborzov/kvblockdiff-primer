---
title: Vectors and channels
nav: Vectors and channels
lede: A weather reading is a short list of numbers. Read the list across and you have a vector; read one position down many readings and you have a channel. This page fixes both words for the rest of the site.
group: Vectors
cards:
  - q: 'What is a **channel** on this site?'
    a: One fixed position inside a vector, looked at across many vectors — one column of the table
    wrong: ["One whole vector — one row of the table", "The radio link a message travels over", "A single number in one reading"]
    why: 'A row is a vector, a cell is an element, a column is a channel. "Per-channel" statistics are computed separately for each column.'
    sec: channel
  - q: 'The Gull Rock reading at 14:30 is $(11.4,\ 10.8,\ 0.82,\ 1012.6,\ 14)$. What are $\vd$ and $\vx_3$?'
    a: '$\vd = 5$ and $\vx_3 = 1012.6$ (the pressure)'
    wrong: ['$\vd = 4$ and $\vx_3 = 0.82$', '$\vd = 5$ and $\vx_3 = 0.82$', '$\vd = 14$ and $\vx_3 = 1012.6$']
    why: Five elements, counted from position 0. Position 3 is the barometer.
    sec: vector
  - q: Writing each reading with a fixed-length code, how many bits per reading did subtracting each channel's mean save on the day's twelve readings?
    a: From 45 to 21 bits per reading
    wrong: ["From 45 to 44 bits per reading", "From 45 to 63 bits per reading", "From 21 to 9 bits per reading"]
    why: The pressure column alone drops from 15 bits (10,126 steps of 0.1 hPa) to 6 bits once its mean is removed.
    sec: centring
  - q: Why does subtracting **one** mean of all the numbers make the code longer instead of shorter?
    a: The channels live at very different typical values, so one shared shift is wrong for every channel
    wrong: ["Because subtraction always adds a sign bit", "Because the global mean is not a whole number", "Because the radio cannot send negative numbers"]
    why: One shift of 210.1 turns a humidity of 0.82 into −209.32, which needs 16 bits. The typical value belongs to the channel, not to the reading.
    sec: centring
  - q: Does subtracting each channel's mean lower the entropy of the readings?
    a: No — shifting by a known constant never changes entropy; it shortens fixed-length codes and prepares the data for later tricks
    wrong: ["Yes — by about one bit per element", "Yes — it halves the entropy", "No — it raises the entropy by the size of the means"]
    why: An entropy coder that knows each channel's distribution gains nothing from a shift. A fixed-length code, and every method that assumes centred data, does.
    sec: centring
---

Strip the Gull Rock messages of Part I down to their numbers. The keys, quotes and commas go; both ends of the radio link agree once on the order of the values. Here are the first four half-hours, with one addition: the second thermometer, high on the mast.

| time | temperature, foot of mast (°C) | temperature, top of mast (°C) | humidity | pressure (hPa) | wind (kn) |
|---|---|---|---|---|---|
| 14:30 | 11.4 | 10.8 | 0.82 | 1012.6 | 14 |
| 15:00 | 11.8 | 11.4 | 0.83 | 1012.1 | 14 |
| 15:30 | 11.8 | 11.4 | 0.83 | 1011.8 | 14 |
| 16:00 | 12.0 | 11.3 | 0.85 | 1011.6 | 14 |

What is left of the 14:30 message is five numbers: `11.4 10.8 0.82 1012.6 14`. Everything in the rest of this Part — correlation, rotations, codebooks — is about lists of numbers like this one. So we need two words, and we need them to be exact.

## A reading is a vector {#vector}

Read the table across. Each row is one reading, a short list of numbers in a fixed order.

::: define vector
- **What it is:** an ordered list of $\vd$ numbers. Each number is an **element**. Its position in the list says what it means.
- **Example:** the 14:30 reading, $\vxvec = (11.4,\ 10.8,\ 0.82,\ 1012.6,\ 14)$, with $\vd = 5$.
- **Notation:** $\vx_{\vc}$ is the element at position $\vc$, counting from 0. So $\vx_0 = 11.4$ (the foot thermometer) and $\vx_3 = 1012.6$ (the barometer).
- **Easy to confuse with:** a set of numbers. Order matters: swap the humidity and the wind and you get a different vector that means nonsense.
:::

The letter $\vd$ (for *dimension*) is the length of the list. For Gull Rock it is 5. Later on the site it will be a few hundred.

::: note connection Where the skeleton went
In Part I the JSON keys were the part of every message that never changed. A vector is that skeleton agreed in advance: once both ends know that position 3 is the pressure, nobody needs to send the word `"pressure_hpa"` again.
:::

::: takeaway
- A vector is an ordered list of $\vd$ numbers; each number is an element.
- $\vx_{\vc}$ is the element at position $\vc$. One Gull Rock reading is a vector with $\vd = 5$.
:::

## A channel is a column {#channel}

Now stack a day's readings into a table, one row per half-hour, and read it *down* instead of across. The barometer's column — 1012.6, 1012.1, 1011.8, … — is one sensor's history. It has a character of its own. It always sits near 1011 and moves by tenths. The humidity column always sits near 0.85 and moves by hundredths.

::: define channel
- **What it is:** one fixed position $\vc$ inside a vector, looked at across many vectors: element $\vc$ of the first reading, element $\vc$ of the second, and so on. In a table of readings, one **column**.
- **Example:** channel 3 of the Gull Rock readings is the barometer's column.
- **"Per-channel"** means "computed separately for each column". A per-channel mean is five means, one per sensor.
- **Easy to confuse with:**
  - an *element* — one cell; a channel is the whole column;
  - a *vector* — a row;
  - a *communication channel*, the information-theory word for the path a message travels. On this site that path is always called the **link**, and "channel" only ever means a column.
:::

Play with the day's twelve readings below. Pick a column and you pick a channel; pick a time and you pick a vector.

::: figure fig-sv-channel-table svChannelTable
**The day’s twelve readings from Gull Rock (14:30 to 20:00), one row per reading.** Rows are vectors ($\vd = 5$); columns are channels $\vc = 0 \dots 4$. The first three rows are the JSON messages of Part I; the top-of-mast temperature is generated with the same seed every time. *Click* a column head or a time to select a channel or a vector; the first read-out describes it. The buttons change what the table shows: the readings as measured, each channel minus its own mean, everything minus one mean of all 60 numbers, or each channel standardized. The bottom row counts the bits a fixed-length code needs per value: every number is written as a whole number of sensor steps (0.1 °C, 0.01, 0.1 hPa, 1 kn), and the width is $1 + \lceil \log_2(\text{largest step count} + 1) \rceil$ bits, including a sign bit.
:::

::: aside reminder Mean and standard deviation (II.11)
The [[mean]] $\vmu$ is the ordinary average. The [[standard-deviation]] $\vsigma$ is the typical distance from the mean; its square is the [[variance]]. Here each channel gets its own: $\vmu_{\vc}$ and $\vsigma_{\vc}$.
:::

Pick each channel in turn and read its mean and spread off the figure:

| channel $\vc$ | sensor | mean $\vmu_{\vc}$ | spread $\vsigma_{\vc}$ |
|---|---|---|---|
| 0 | temperature, foot | 11.83 °C | 0.18 °C |
| 1 | temperature, top | 11.30 °C | 0.22 °C |
| 2 | humidity | 0.849 | 0.019 |
| 3 | pressure | 1010.83 hPa | 1.05 hPa |
| 4 | wind | 15.9 kn | 1.9 kn |

Down a column, the numbers are alike. Across a row, they have nothing in common: a temperature, a fraction, a four-digit pressure. Statistics live in channels.

::: takeaway
- A channel is one element position across many vectors — one column. A vector is a row.
- Each channel has its own typical value (location) and its own spread (scale).
- "Channel" never means the radio link on this site.
:::

## Subtract each channel's typical value {#centring}

The radio is paid by the bit, so look at the bottom row of the figure. As measured, the pressure 1012.6 hPa is 10,126 steps of 0.1 hPa, and a fixed-length code ([[#school-fixed-length]]) needs 15 bits for it. The whole reading needs 45 bits.

Now press *minus each channel's mean*. Every column shrinks to a few steps around zero.

| subtracted | foot | top | hum. | press. | wind | total |
|---|---|---|---|---|---|---|
| nothing | 8 | 8 | 8 | 15 | 6 | **45** |
| channel means | 4 | 4 | 4 | 6 | 3 | **21** |
| one mean, 210.1 | 12 | 12 | 16 | 14 | 9 | **63** |

*Bits per value of a fixed-length code, per channel, and per reading in total.*

The last row is the instructive one. One shared shift is wrong for every channel at once. A humidity of 0.82 becomes −209.32, which costs 16 bits instead of 8. The typical value belongs to the channel, never to the reading.

The five means are not free. They must reach the mainland once, which costs one reading's worth of bits (45). Spread over these twelve readings, that is under 4 bits each; over a month it is nothing. This is [[side-information]] in its humblest form: a small table both ends keep.

::: theme predict-correct
Subtracting a channel's mean is the simplest prediction there is: "the next pressure will be the usual pressure". What travels is the [[residual]]. Every later page replaces this guess with a better one.
:::

One more step is often useful. Divide each centred channel by its spread and every channel ends up with mean 0 and spread 1, whatever its units.

::: define standardize
- **What it is:** replace each value $\vx_{\vc}$ by $(\vx_{\vc} - \vmu_{\vc}) / \vsigma_{\vc}$, separately for each channel.
- **Why:** so that channels in °C, hPa and knots can be compared. The next page measures which channels move together, and that only makes sense on a common scale.
- **Easy to confuse with:** a way of sending numbers. Standardized values are not on any grid; the figure shows no bit count for them.
:::

::: note warning What centring does not do
An [[entropy-coder]] that knows each channel's [[distribution]] gains nothing from the shift: subtracting a known constant never changes [[entropy]]. Centring pays off for fixed-length codes, which must cover the largest value, and for every method on the next pages, which assumes centred data. The same per-channel table of means and spreads returns later as a real dictionary ([[#homework-loc]]).
:::

::: takeaway
- Subtracting each channel's own mean took the day's readings from 45 to 21 bits each with a fixed-length code; one global mean made it 63.
- The means are side information, sent once.
- Standardizing (also dividing by each channel's spread) puts all channels on one scale, ready to be compared.
:::
