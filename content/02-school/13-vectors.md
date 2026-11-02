---
title: Vectors, elements and furrows
nav: Vectors and furrows
group: Vectors
lede: Strip a Gull Rock message to its numbers and you hold a vector. Stack a day of them and each sensor's column runs down the stack like a furrow down a field. This page fixes vector, element and furrow in numpy, with the shapes the rest of the site reuses.
cards:
  - q: 'The 14:30 reading with the mast thermometer is `r = np.array([11.4, 10.8, 0.82, 1012.6, 14.0])`. What are `r.shape` and `r[3]`?'
    a: '`(5,)` and `1012.6`, the pressure'
    wrong: ['`(4,)` and `0.82`', '`(5,)` and `0.82`', '`(1, 5)` and `1012.6`']
    why: 'Five elements in a one-dimensional array; `elem_id` counts from 0, so position 3 is the barometer.'
    sec: vector
  - q: What is a furrow on this site?
    a: 'One element position followed across many vectors: one column of the stacked table, `R[:, elem_id]`'
    wrong: ["One whole reading: one row of the table, `R[i]`", "The radio wire a message travels over", "A single number in one reading"]
    why: 'A row is a vector, a cell is an element, a column is a furrow. Per-furrow statistics are computed separately for each column.'
    sec: furrow
  - q: 'Twelve readings of five elements are stacked into `R`. What is `R.shape`, and what is `R.mean(axis=0).shape`?'
    a: '`(12, 5)` and `(5,)`: one mean per furrow'
    wrong: ['`(5, 12)` and `(12,)`', '`(60,)` and `(1,)`', '`(12, 5)` and `(12,)`: one mean per reading']
    why: '`axis=0` averages down the rows, so one number survives per column, which is per furrow.'
    sec: furrow
  - q: Writing each reading with a fixed-length code, how many bits per reading did subtracting each furrow's mean save on the afternoon's twelve readings?
    a: From 45 to 21 bits per reading
    wrong: ["From 45 to 44 bits per reading", "From 45 to 63 bits per reading", "From 21 to 9 bits per reading"]
    why: 'The pressure furrow alone drops from 15 bits (10 126 steps of 0.1 hPa) to 6 bits once its mean is removed.'
    sec: standardize
  - q: Why does subtracting one mean of all 60 numbers make the code longer instead of shorter?
    a: The furrows live at very different typical values, so one shared shift is wrong for every furrow
    wrong: ["Because subtraction always adds a sign bit", "Because the global mean is not a whole number", "Because the radio cannot send negative numbers"]
    why: 'One shift of 210.1 turns a humidity of 0.82 into −209.32, which needs 16 bits. The typical value belongs to the furrow, never to the reading.'
    sec: standardize
  - q: Does subtracting each furrow's mean lower the entropy of the readings?
    a: 'No. Shifting by a known constant never changes entropy; it shortens fixed-length codes and prepares the data for later tricks'
    wrong: ["Yes, by about one bit per element", "Yes, it halves the entropy", "No, it raises the entropy by the size of the means"]
    why: An entropy coder that knows each furrow's distribution gains nothing from a shift. A fixed-length code, and every method that assumes centred data, does.
    sec: standardize
---

Take the 14:30 message from Gull Rock ([[#tiny-files-notice-anything]]) and throw away everything both ends of the radio already agree on: the keys, the quotes, the commas, the station's name. Four numbers are left, in an order fixed once and for all.

```python the 14:30 message, stripped to its numbers
import numpy as np
r = np.array([11.4, 0.82, 1012.6, 14.0])   # temperature °C, humidity, pressure hPa, wind kn
r.shape        # (4,)
r[2]           # 1012.6: the pressure
```

That short list is the object of the whole second half of this Part. Correlation, rotations and codebooks are all about lists of numbers like `r`. Two words pin the list down, and a third pins down what happens when many such lists are stacked.

## A reading is a vector {#vector}

::: define vector
- **What it is.** An ordered list of $\vd$ numbers; in numpy, a one-dimensional array `r` with `r.shape == (d,)`. The position of a number in the list says what it means.
- **Example.** The 14:30 reading, $\vxvec = (11.4,\ 0.82,\ 1012.6,\ 14)$, with `r.shape == (4,)`, so $\vd = 4$.
- **Easy to confuse with** a set of numbers. Order matters: swap the humidity and the wind and the vector means nonsense.
:::

::: define element
- **What it is.** One number inside a vector, together with its position, `elem_id`, counted from 0 to `d - 1`. In numpy, `r[elem_id]`; in math, $\vx_{\vc}$, with $\vc$ the element index.
- **Example.** `r[0] == 11.4` is the thermometer and `r[2] == 1012.6` the barometer: $\vx_0 = 11.4$, $\vx_2 = 1012.6$.
- **Easy to confuse with** a *furrow*, defined below, which is the same `elem_id` across many vectors.
:::

The letter $\vd$ counts the elements. For Gull Rock it is 4; later on the site it is a few hundred, and `d = r.shape[0]` reads it off whatever the vector is.

This Part adds one sensor Part I did not have: a second thermometer, high on the mast. It matters on the next page, because two thermometers a few metres apart almost always agree. From here on a reading has five elements.

```python a reading with the mast thermometer
r = np.array([11.4, 10.8, 0.82, 1012.6, 14.0])   # foot °C, top °C, humidity, pressure hPa, wind kn
d = r.shape[0]                                   # 5
```

::: note connection Where the skeleton went
In Part I the JSON keys were the part of every message that never changed. A vector is that skeleton agreed in advance: once both ends know that `elem_id == 3` is the pressure, nobody sends the word `"pressure_hpa"` again.
:::

::: takeaway
- A vector is an ordered list of $\vd$ numbers, `r.shape == (d,)`; one Gull Rock reading has $\vd = 5$ once the mast thermometer is in.
- An element is one number and its position: `r[elem_id]`, $\vx_{\vc}$.
:::

## A furrow is a column {#furrow}

Now stack the afternoon's twelve readings, one row per half-hour.

```python twelve readings stacked
R = np.array([
    [11.4, 10.8, 0.82, 1012.6, 14],   # 14:30
    [11.8, 11.4, 0.83, 1012.1, 14],   # 15:00
    [11.8, 11.4, 0.83, 1011.8, 14],   # 15:30
    [12.0, 11.3, 0.85, 1011.6, 14],   # 16:00
    [12.1, 11.4, 0.85, 1011.2, 14],
    [12.1, 11.7, 0.85, 1011.1, 15],
    [11.9, 11.6, 0.85, 1010.7, 16],
    [11.8, 11.2, 0.84, 1010.5, 17],
    [11.7, 11.1, 0.85, 1010.1, 18],
    [11.8, 11.3, 0.86, 1009.8, 18],
    [11.8, 11.2, 0.86, 1009.4, 18],
    [11.7, 11.2, 0.90, 1009.1, 19],   # 20:00
])
R.shape          # (12, 5): (n_readings, d)
R[3]             # the 16:00 reading, a vector of shape (5,)
R[3, 3]          # 1011.6: one element
R[:, 3]          # the barometer's column, shape (12,): a furrow
```

Read `R` across and you get readings. Read it *down* and you get something with a character of its own. The barometer's column, 1012.6, 1012.1, 1011.8, …, always sits near 1011 and moves by tenths. The humidity column sits near 0.85 and moves by hundredths.

::: define furrow
- **What it is.** One fixed `elem_id`, followed through every vector of the stack: `R[:, elem_id]`, of shape `(n_readings,)`. One column of the table; one sensor's history.
- **Example.** `R[:, 3]` is the barometer's furrow. In math, element $\vc$ of every reading, for one fixed $\vc$.
- **"Per-furrow"** means computed separately for each column. `R.mean(axis=0)` gives five means, one per sensor.
- **Easy to confuse with** an element (one cell, `R[i, elem_id]`) and a vector (one row, `R[i]`). Also with the wire a message travels over, which information theory gives a name of its own; on this site that wire is only ever called the link, and a furrow is only ever a column.
:::

Play with the day's twelve readings below. Pick a column and you pick a furrow; pick a time and you pick a vector.

::: figure fig-sv-furrow-table svChannelTable
**The day's twelve readings from Gull Rock (14:30 to 20:00), one row per reading: the array `R` above.** Rows are vectors ($\vd = 5$); columns are furrows, `R[:, elem_id]` for `elem_id` 0 … 4. The first three rows are the JSON messages of Part I; the top-of-mast temperature is generated with the same seed every time. *Click* a column head or a time to select a furrow or a vector; the first read-out describes it. The buttons change what the table shows: the readings as measured, each furrow minus its own mean, everything minus one mean of all 60 numbers, or each furrow standardized. The bottom row counts the bits a fixed-length code needs per value: every number is written as a whole number of sensor steps (0.1 °C, 0.01, 0.1 hPa, 1 kn), and the width is $1 + \lceil \log_2(\text{largest step count} + 1) \rceil$ bits, including a sign bit.
:::

::: aside reminder Mean and standard deviation (II.11)
The [[mean]] $\vmu$ is the ordinary average. The [[standard-deviation]] $\vsigma$ is the typical distance from the mean; its square is the [[variance]]. Here each furrow gets its own: $\vmu_{\vc}$ and $\vsigma_{\vc}$.
:::

Each furrow has a typical value (a location) and a typical distance from it (a scale), and numpy computes all five of each in one line.

```python per-furrow location and scale
mu = R.mean(axis=0)   # [11.825, 11.300, 0.849, 1010.833, 15.917]
sd = R.std(axis=0)    # [ 0.183,  0.224, 0.019,    1.051,  1.891]
mu.shape              # (5,): one number per furrow
```

| `elem_id` | sensor | location $\vmu_{\vc}$ | scale $\vsigma_{\vc}$ |
|---|---|---|---|
| 0 | temperature, foot | 11.83 °C | 0.18 °C |
| 1 | temperature, top | 11.30 °C | 0.22 °C |
| 2 | humidity | 0.849 | 0.019 |
| 3 | pressure | 1010.83 hPa | 1.05 hPa |
| 4 | wind | 15.9 kn | 1.9 kn |

Down a furrow, the numbers are alike. Across a reading, they have nothing in common: a temperature, a fraction, a four-digit pressure. Statistics live in furrows.

In Part III the stack of readings becomes the orchard of an LLM, an array `v` of shape `(n_tokens, n_kv_layers, n_kv_heads, head_dim)`, and a furrow becomes `v[:, layer_id, head_id, elem_id]`: one element position followed along the token axis.

::: takeaway
- Stacked readings are a two-dimensional array, `R.shape == (n_readings, d)`: a row `R[i]` is a vector, a cell `R[i, elem_id]` an element, a column `R[:, elem_id]` a furrow.
- Each furrow has its own location and scale: `R.mean(axis=0)`, `R.std(axis=0)`, one number per furrow.
- "Furrow" never means the wire on this site; the wire is the link.
:::

## Subtract each furrow's typical value {#standardize}

The radio is paid by the bit, so look at the bottom row of the figure. As measured, the pressure 1012.6 hPa is 10 126 steps of 0.1 hPa, and a fixed-length code ([[#school-fixed-length]]) needs 15 bits for it. The whole reading needs 45 bits.

Now press *minus each furrow's mean*. Every column shrinks to a few steps around zero.

```python centre each furrow, then standardize it
Rc = R - mu            # each furrow minus its own mean; numpy broadcasts mu across the rows
Z  = (R - mu) / sd     # standardized: every furrow now has mean 0 and spread 1
Rc[0]                  # [-0.4, -0.5, -0.03, 1.8, -2]    (mu rounded to the sensor step first)
Z[0]                   # [-2.32, -2.24, -1.51, 1.68, -1.01]
```

| subtracted | foot | top | hum. | press. | wind | total |
|---|---|---|---|---|---|---|
| nothing | 8 | 8 | 8 | 15 | 6 | **45** |
| each furrow's mean | 4 | 4 | 4 | 6 | 3 | **21** |
| one mean of everything, 210.1 | 12 | 12 | 16 | 14 | 9 | **63** |

*Bits per value of a fixed-length code, per furrow, and per reading in total.*

The last row is the instructive one. One shared shift is wrong for every furrow at once. A humidity of 0.82 becomes −209.32, which costs 16 bits instead of 8. The typical value belongs to the furrow, never to the reading.

The five means are not free. They must reach the mainland once, which costs one reading's worth of bits (45). Spread over these twelve readings, that is under 4 bits each; over a month it is nothing. This is [[side-information]] in its humblest form: a small table both ends keep.

::: theme predict-correct
Subtracting a furrow's mean is the simplest prediction there is: "the next pressure will be the usual pressure". What travels is the [[residual]]. Every later page replaces this guess with a better one.
:::

One more step is often useful. Divide each centred furrow by its scale and every furrow ends up with mean 0 and spread 1, whatever its units. That is the array `Z` above.

::: define standardize
- **What it is.** Replace each value $\vx_{\vc}$ by $(\vx_{\vc} - \vmu_{\vc}) / \vsigma_{\vc}$, separately for each furrow: `Z = (R - R.mean(axis=0)) / R.std(axis=0)`.
- **Why.** So that furrows in °C, hPa and knots can be compared. The next page measures which furrows move together, and that only makes sense on a common scale.
- **Easy to confuse with** a way of sending numbers. Standardized values are not on any grid; the figure shows no bit count for them.
:::

::: note warning What centring does not do
An [[entropy-coder]] that knows each furrow's [[distribution]] gains nothing from the shift: subtracting a known constant never changes [[entropy]]. Centring pays off for fixed-length codes, which must cover the largest value, and for every method on the next pages, which assumes centred data. The same per-furrow table of locations and scales returns in Part V as the lightest real dictionary, furrow statistics ([[#toolbox-furrow-statistics]]).
:::

::: takeaway
- Subtracting each furrow's own mean took the day's readings from 45 to 21 bits each with a fixed-length code; one global mean made it 63.
- The means are side information, sent once: `mu`, five numbers.
- Standardizing, `(R - mu) / sd`, puts all furrows on one scale, ready to be compared.
:::
