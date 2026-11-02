---
title: Furrows that move together
nav: Correlation
group: Vectors
lede: The two thermometers on the mast almost always agree. Covariance and correlation put a number on "these two furrows move together", and `np.cov(R.T)` collects that number for every pair of furrows at once.
cards:
  - q: 'For one reading, the foot thermometer is 2 °C above its mean and the top one is 1.5 °C above its own. What does this reading add to the covariance?'
    a: A positive product, +3 °C², pulling the covariance up
    wrong: ["A negative product, −3 °C²", "Nothing; only readings below the mean count", "+0.5 °C², the difference of the two"]
    why: Covariance is the average of (distance from mean) × (distance from mean). Both on the same side gives a positive product.
    sec: covariance
  - q: What is the correlation of the two Gull Rock thermometers over ten days?
    a: About 0.99
    wrong: ["About 0.5", "About −0.99", "Exactly 1"]
    why: 'The covariance 2.94 °C² divided by the two spreads, 1.73 × 1.72, gives 0.992. Not exactly 1: each sensor has its own small noise.'
    sec: covariance
  - q: 'A correlation of 0.992 means the best straight-line prediction of one thermometer from the other explains how much of its variance, and saves how many bits?'
    a: About 98 % of the variance, worth about 2.9 bits on that furrow
    wrong: ["About 99 % of the variance, worth about 0.5 bit", "About 50 % of the variance, worth about 1 bit", "All of it, worth an unlimited number of bits"]
    why: '$\vRsq$ is the correlation squared, 0.983, and the exchange rate of II.12 gives $\tfrac12\log_2 \frac{1}{1 - 0.983} \approx 2.95$ bits.'
    sec: covariance
  - q: '`R` holds 480 readings of 5 elements. What does `np.cov(R.T)` return, and what sits on its diagonal?'
    a: 'A `(5, 5)` array; the diagonal holds the variance of each furrow'
    wrong: ["A `(480, 480)` array; the diagonal holds each reading's length", "A `(5, 5)` array with zeros on the diagonal", "A `(5,)` array of correlations"]
    why: '`np.cov` wants one variable per row, so the furrows (the columns of `R`) are handed over transposed. The covariance of a furrow with itself is its variance $\vsigma_{\vc}^2$.'
    sec: matrix
  - q: Why is the covariance matrix of the raw Gull Rock readings hard to read at a glance?
    a: Its cells carry the furrows' own units, so pressure's big numbers dwarf humidity's tiny ones
    wrong: ["Because it is not symmetric", "Because covariances can only be positive", "Because it has more rows than furrows"]
    why: The pressure variance is about 29.5 hPa², the humidity variance about 0.002. The correlation matrix (standardized furrows) removes the units.
    sec: matrix
---

Here are six readings of the two thermometers on the Gull Rock mast, taken on six different days of a ten-day stretch of weather:

| reading | foot of mast (°C) | top of mast (°C) | top − foot |
|---|---|---|---|
| day 1, 20:00 | 12.1 | 11.7 | −0.4 |
| day 3, 12:00 | 10.0 | 9.7 | −0.3 |
| day 4, 08:00 | 9.6 | 8.9 | −0.7 |
| day 6, 20:00 | 11.0 | 10.6 | −0.4 |
| day 8, 12:00 | 13.5 | 12.9 | −0.6 |
| day 10, 04:00 | 12.3 | 11.2 | −1.1 |

Notice anything? The temperature wanders by four degrees. The *difference* between the two thermometers barely moves: the top of the mast is always about half a degree colder. Knowing one thermometer, you could write down the other to within a few tenths.

The two thermometers are two [[furrow|furrows]] of the stacked readings of II.13: `R[:, 0]` and `R[:, 1]`, with `R.shape == (480, 5)` for the ten days. This page measures how strongly furrows move together.

## Covariance: the average signed rectangle {#covariance}

Plot every reading of the ten days as a dot, with the foot thermometer across and the top thermometer up. The dots line up on a thin diagonal streak. Now draw a cross through the two [[mean|means]] and look at each dot from there.

- A dot to the upper right is warm on both thermometers. A dot to the lower left is cold on both.
- For any dot, draw the rectangle from the cross to the dot. Its width is how far the foot thermometer is from its mean; its height is how far the top one is from its own.
- Call the area **positive** when the dot is on the same side of both means (upper right, lower left) and **negative** otherwise.

The average of these signed areas over all readings is the covariance.

::: figure fig-sv-cov-scatter svCovScatter
**Two furrows of 480 Gull Rock readings (ten days, one every 30 minutes; synthetic, generated from a fixed seed).** Each dot is one reading. The dashed lines are the two furrows' means. Blue dots sit on the same side of both means, so their rectangle counts as positive; red dots sit on opposite sides and count as negative. The outlined rectangle belongs to the picked reading; its signed area is printed next to it. *Hover or tap* near any dot to pick it. The buttons switch to other pairs of furrows. The read-out gives the two spreads, the covariance (the average signed area), the correlation, and what the exchange rate of II.12 makes of it.
:::

::: aside reminder The exchange rate (II.12)
A predictor that explains a share $\vRsq$ of a value's variance leaves a residual with variance $(1 - \vRsq)\vsigma^2$, and saves $\tfrac12 \log_2 \frac{1}{1 - \vRsq}$ bits per value on bell-shaped data.
:::

In symbols, for furrows 0 and 1, averaging over all readings:

$$
\operatorname{cov}(\vx_0, \vx_1) = \operatorname{mean}\Big[\underbrace{(\vx_0 - \vmu_0)}_{\text{width}}\;\underbrace{(\vx_1 - \vmu_1)}_{\text{height}}\Big],
\qquad
\operatorname{corr}(\vx_0, \vx_1) = \frac{\operatorname{cov}(\vx_0, \vx_1)}{\vsigma_0\,\vsigma_1}
$$ {#eq-sv-covariance}

The same two lines in numpy, on the two thermometer furrows:

```python covariance and correlation of the two thermometers
x0, x1 = R[:, 0], R[:, 1]                                 # two furrows, shape (480,) each
cov  = np.mean((x0 - x0.mean()) * (x1 - x1.mean()))       # 2.94 °C²: the average signed rectangle
corr = cov / (x0.std() * x1.std())                        # 2.94 / (1.73 × 1.72) = 0.992
```

::: define covariance
- **Covariance** is the average product of two furrows' distances from their means. It is positive when they rise and fall together, negative when one rises as the other falls, near zero when they ignore each other. Its unit is the product of the two units (°C × °C here).
- **Correlation** divides the covariance by the two spreads. It has no unit and always lies between −1 and +1.
- **Example.** The thermometers have covariance 2.94 °C², spreads 1.73 and 1.72 °C, correlation **0.992**.
- **Easy to confuse with** "the values are close". Correlation measures moving *together*; the top thermometer is always colder, yet the correlation is nearly 1.
:::

The other pairs in the figure tell their own small stories:

- **temperature · humidity: −0.73.** Warm air at Gull Rock is drier air, so the dots lean the other way.
- **pressure · wind: −0.63.** Falling pressure brings wind; a storm is a low.
- **temperature · pressure: −0.01.** In this data the two ignore each other, and the positive and negative rectangles cancel.

Here is the link to bits. The correlation squared is exactly the $\vRsq$ of the best straight-line prediction of one furrow from the other. For the thermometers that is $0.992^2 = 0.983$, so predicting the top thermometer from the foot one saves about $\tfrac12 \log_2 \frac{1}{1-0.983} \approx 2.95$ bits on that furrow. A correlation of 0.73 (temperature and humidity) gives only $\vRsq = 0.54$ and about 0.55 bit.

::: note warning Correlation only sees straight lines
A cloud shaped like a ring or like three separate blobs can have correlation zero and still be very predictable. Correlation measures one kind of togetherness: the straight-line kind. Clusters get their own tool in [[#school-clusters]].
:::

::: takeaway
- Covariance is the average of (distance from one mean) × (distance from the other); correlation rescales it to −1 … +1.
- The two thermometers correlate at 0.992; temperature and humidity at −0.73; pressure and wind at −0.63.
- Correlation squared is the $\vRsq$ of a straight-line prediction, so it converts straight into bits.
:::

## The covariance matrix {#matrix}

With five furrows there are ten pairs. Rather than ten scatter plots, write all the covariances into one table: row $\vc$, column $\vc'$ holds the covariance of furrow $\vc$ with furrow $\vc'$. numpy does it in one call.

```python every pair at once
Sigma = np.cov(R.T, bias=True)   # shape (5, 5); bias=True divides by the 480 readings, as above
Sigma[0, 1]                      # 2.94: foot thermometer with top thermometer
Sigma[3, 3]                      # 29.5: the pressure variance, in hPa²
Corr = np.corrcoef(R.T)          # the same table for the standardized furrows: ones on the diagonal
```

Why `R.T`? `np.cov` expects one variable per *row*, and our variables are the furrows, the *columns* of `R`. Transposing hands it the furrows one per row.

::: define covariance-matrix
- **What it is.** The $\vd \times \vd$ table $\vSigma$ of covariances between every pair of furrows: `np.cov(R.T)`, shape `(d, d)`.
- **Its diagonal** holds each furrow's covariance with itself, which is its variance $\vsigma_{\vc}^2$.
- **It is symmetric.** The covariance of 0 with 1 equals the covariance of 1 with 0.
- **Its correlation version** is the covariance matrix of the [[standardize|standardized]] furrows (II.13), `np.corrcoef(R.T)`: ones on the diagonal, correlations elsewhere.
:::

| `Corr` | foot | top | humidity | pressure | wind |
|---|---|---|---|---|---|
| foot | 1 | 0.99 | −0.73 | −0.01 | 0.01 |
| top | 0.99 | 1 | −0.73 | −0.01 | 0.01 |
| humidity | −0.73 | −0.73 | 1 | 0.02 | −0.03 |
| pressure | −0.01 | −0.01 | 0.02 | 1 | −0.63 |
| wind | 0.01 | 0.01 | −0.03 | −0.63 | 1 |

*The correlation matrix of the ten days, `np.corrcoef(R.T)`, rounded to two decimals.*

::: figure fig-sv-cov-matrix svCovMatrix
**The covariance matrix $\vSigma$ of the ten days of Gull Rock readings ($\vd = 5$), and its correlation version.** Each cell is one pair of furrows; blue cells are positive, red cells negative, and the stronger the colour, the larger the value compared with the largest one in the table. *Hover or focus* a cell for its meaning. The buttons switch between covariances in the furrows' own units and correlations of the standardized furrows.
:::

In covariance mode the colours are useless: the pressure variance (about 29.5 hPa²) dwarfs everything, and the humidity variance (0.002) is invisible. That is the unit problem of II.13 again. Switch to correlation and the structure appears:

- a **warm group** of three furrows: the two thermometers (0.99) and humidity (−0.73 with each);
- a **weather group** of two: pressure and wind (−0.63);
- and almost nothing between the groups.

::: note intuition What the matrix knows, and what it does not
The matrix is the complete record of the straight-line relationships between furrows, all pairs at once. It is also all that a rotation (next page) is allowed to use. Anything else, clusters, curves, rare events, is invisible to it.
:::

::: takeaway
- The covariance matrix $\vSigma$ = `np.cov(R.T)` holds every pairwise covariance; its diagonal holds the variances.
- Standardize first, or the furrow with the biggest numbers drowns out the rest.
- Gull Rock's five furrows fall into two groups that move together: warmth (two thermometers + humidity) and weather (pressure + wind).
:::
