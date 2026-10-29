---
title: The shape of a residual
nav: The shape of a residual
lede: How many bits a residual costs depends mostly on one number, its spread. Halve the spread and you save one bit per value — whichever of the two usual shapes the residuals take.
group: Prediction
cards:
  - q: What does the standard deviation σ of a set of residuals measure?
    a: Their typical distance from the mean
    wrong: ["Their largest value", "Their average value", "How many of them are zero"]
    why: 'It is the square root of the variance, the average squared distance from the mean $\vmu$.'
    sec: spread
  - q: The residuals' standard deviation is halved. Roughly how many bits per value does that save?
    a: One bit
    wrong: ["Half a bit", "Two bits", "Half of all the bits"]
    why: 'For a bell-shaped residual, bits ≈ $\log_2 \vsigma$ + a constant, and $\log_2(\vsigma/2) = \log_2 \vsigma - 1$.'
    sec: halve
  - q: About how many bits does a Gaussian residual with σ = 4 integer steps cost?
    a: About 4.05 bits
    wrong: ["About 2 bits", "About 8 bits", "Exactly 4 bits"]
    why: '$\log_2 4 + 2.05 = 4.05$; the figure''s exact sum and its Monte Carlo run agree to within 0.01 bit.'
    sec: halve
  - q: For a fixed standard deviation, which shape costs the most bits?
    a: The Gaussian
    wrong: ["The Laplace", "A shape with all values equal to the mean", "All shapes cost the same"]
    why: For a given spread the bell curve is the most unpredictable shape, so it is the honest worst case; the pointier Laplace costs about 0.1 bit less.
    sec: shapes
  - q: What is a Monte Carlo check?
    a: Testing a claim by simulating many random samples and measuring the result
    wrong: ["A proof with formulas", "A way of rounding residuals", "A gambling-based estimate of the mean"]
    why: The figure draws 20,000 random residuals of each shape, counts them, and compares their entropy with the formula.
    sec: shapes
  - q: Why can no predictor bring the Gull Rock temperature residuals down to zero bits?
    a: The sensor's own noise cannot be predicted from anything
    wrong: ["Because residuals are always at least 1 °C", "Because the entropy coder adds a bit per value", "Because the first reading is sent in full"]
    why: Even a perfect guess of the true temperature misses the noise of the reading itself, about 1 tenth of a degree here — roughly 2.1 bits per reading.
    sec: halve
---

On the previous page, two residual histograms told the whole story. Without prediction, the temperatures spread over several degrees and cost 6.53 bits per reading. With the previous reading as the guess, the residuals huddled within a few tenths and cost 3.63 bits. Same readings, same coder; only the *width* changed.

This page measures that width, meets the two shapes residuals usually take, and finds the exchange rate between width and bits.

## Centre and spread {#spread}

Take the eight residuals from the first night, in tenths of a degree: +2, −4, 0, +2, 0, −1, 0, −1. Two numbers summarise them.

::: define mean
- **What it is:** the average value, $\vmu$. Subtracting it is the simplest prediction of all.
- **Example:** $(2 - 4 + 0 + 2 + 0 - 1 + 0 - 1)/8 = -0.25$ tenths.
- **Easy to confuse with:** the typical value. A mean of −0.25 does not mean residuals are usually near −0.25; most of them here are 0 or ±2.
:::

::: define variance
- **What it is:** the average squared distance from the mean, $\vsigma^2$ — how spread out the values are.
- **Example:** the eight residuals have variance 3.19 (tenths squared).
- **Easy to confuse with:** the average distance from the mean. Squaring gives big misses much more weight than small ones.
:::

::: define standard-deviation
- **What it is:** the square root of the variance, $\vsigma$: the typical distance of a value from the mean, in the same units as the values.
- **Example:** $\sqrt{3.19} \approx 1.79$ tenths for the eight night-time residuals; over all four weeks the previous-value residual has $\vsigma = 3.05$ tenths.
- **Easy to confuse with:** the largest residual. About two values in three lie within one $\vsigma$ of the mean for bell-shaped data; the rest lie further out.
:::

$$
\vmu = \operatorname{average}(\vr_{\vi}), \qquad \vsigma^2 = \operatorname{average}\big((\vr_{\vi} - \vmu)^2\big)
$$ {#eq-mean-variance}

```python the eight night-time residuals
import numpy as np
r = np.array([2, -4, 0, 2, 0, -1, 0, -1])     # tenths of a degree
print(r.mean(), r.var(), r.std())             # -0.25 3.1875 1.785...
```

::: takeaway
- The mean $\vmu$ is the centre of the residuals; subtracting it is the simplest prediction.
- The variance $\vsigma^2$ is the average squared distance from the mean; the standard deviation $\vsigma$ is its square root, the typical distance.
- The first night's eight residuals: $\vmu = -0.25$, $\vsigma \approx 1.79$ tenths.
:::

## Two famous shapes {#shapes}

Residual histograms come in many shapes, but two of them cover most of what we will meet.

::: define gaussian
- **What it is:** the bell curve, also called the normal distribution. It appears whenever many small, independent nudges add up.
- **Example:** sensor noise; the sum of many small weather influences.
- **Easy to confuse with:** “any hump-shaped histogram”. For a given $\vsigma$ the Gaussian is the most unpredictable shape there is, which makes it the honest worst case for coding.
:::

::: define laplace
- **What it is:** a sharper, pointier cousin of the bell curve, with fatter tails. Its width is set by the scale $\vbeta$, the average distance from the centre; its standard deviation is $\vsigma = \sqrt2\,\vbeta$.
- **Example:** prediction residuals. Most of the time the guess is very good (a tall, narrow peak); now and then a front passes and the guess misses badly (the fat tails).
- **Easy to confuse with:** a Gaussian with a smaller $\vsigma$. With the same $\vsigma$, a Laplace has more values very close to the centre *and* more far out.
:::

::: aside detail The two formulas
For a residual $\vr$ with mean 0, the Gaussian has density $\frac{1}{\vsigma\sqrt{2\pi}}\, e^{-\vr^2/2\vsigma^2}$ and the Laplace has density $\frac{1}{2\vbeta}\, e^{-\lvert \vr \rvert/\vbeta}$. The figure turns each into probabilities of whole-number residuals by taking the area between $\vr - ½$ and $\vr + ½$.
:::

How many bits does each shape cost? There is a formula (next section), but formulas have assumptions. So the figure also checks it the blunt way.

::: define monte-carlo
- **What it is:** checking a claim by simulating many random samples on a computer and measuring, instead of (or as well as) deriving it with formulas.
- **Example:** draw 20,000 random residuals of a given shape and $\vsigma$, round them to whole numbers, count them in a [[histogram]], and compute its entropy.
- **Easy to confuse with:** a proof. A Monte Carlo run shows what happens for the cases simulated, with some random wobble.
:::

::: figure fig-shapes-bits siShapes wide
**Gaussian versus Laplace, and what each costs.** Left: probability of each whole-number residual (horizontal axis, in integer steps) for a Gaussian (blue) and a Laplace (red) with the same standard deviation $\vsigma$, set by the slider (0.25 to 32 steps, doubling scale). Right: bits per value against $\vsigma$ on a doubling axis. Solid curves: the exact entropy of each whole-number distribution; dashed lines: the formula $\log_2\vsigma$ + constant; black dots: Monte Carlo estimates, each from 20,000 seeded random draws, rounded and counted. The vertical accent line marks the current $\vsigma$. The table gives the three numbers at the current $\vsigma$.
:::

::: try
1. At $\vsigma = 4$ the Gaussian costs 4.05 bits and the Laplace 3.95: same width, but the pointy shape is a tenth of a bit cheaper.
2. Double $\vsigma$ to 8: both costs rise by exactly one bit.
3. Shrink $\vsigma$ to 0.5: the formula says 1.05 bits for the Gaussian, the true cost is 1.24. Below about one step the straight line fails.
:::

::: takeaway
- The Gaussian (bell) is the worst case for a given spread; the Laplace (pointy, fat tails) is typical of prediction residuals.
- At the same $\vsigma$ the Laplace costs about 0.1 bit less than the Gaussian.
- A Monte Carlo run — simulate, count, measure — checks the formula without trusting it.
:::

## Halve σ, save a bit {#halve}

On the right-hand plot, both cost curves are straight lines with the same slope: every doubling of $\vsigma$ adds one bit. Written out,

::: keycard Bits of a bell-shaped residual
$$
\text{bits per value} \approx \log_2 \vsigma + \underbrace{\tfrac12 \log_2 (2\pi e)}_{\approx\, 2.05 \text{ (Gaussian)}}
$$ {#eq-gauss-bits}

with $\vsigma$ in integer steps. For a Laplace of the same $\vsigma$ the constant is $\log_2(\sqrt2\, e) \approx 1.94$. **Halve $\vsigma$, save one bit.**
:::

Check it on the temperatures of [[#school-prediction]]. The previous-value residual has $\vsigma = 3.05$ tenths: $\log_2 3.05 + 2.05 \approx 3.66$ bits, and the measured cost was 3.63. Without prediction, $\vsigma = 24.2$ tenths and the formula says 6.64 bits; the measured 6.53 is a little lower. Part of the gap is the shape: the raw temperatures are not bell-shaped (the daily swing piles them up near its highs and lows), and any shape other than the Gaussian costs less. Part is the counting: 1,344 readings spread over 119 different values make the histogram's estimate a few hundredths of a bit low, as on [[#school-entropy]].

Two warnings come with the formula.

- **It needs $\vsigma$ of a few steps or more.** Below about one step the true cost flattens out towards zero; the formula would even go negative.
- **It is about the shape, not the values.** Only the width counts. A residual that sits far from zero but is narrow is cheap, which is why subtracting the average saved nothing on the previous page.

::: theme noise-floor
Every reading carries the sensor's own noise — about one tenth of a degree in this toy. No predictor can guess it, because nothing the receiver knows depends on it. So even a perfect forecast of the true temperature leaves residuals with $\vsigma$ of about one step, which costs about 2.1 bits per reading. Today's predictor pays 3.63; the most any cleverer predictor could still save is about 1.5 bits.
:::

::: takeaway
- Bits per value ≈ $\log_2\vsigma$ + 2.05 for a Gaussian residual (+1.94 for a Laplace of the same $\vsigma$).
- Halving $\vsigma$ saves one bit; the formula holds once $\vsigma$ is a few integer steps wide.
- Noise that nothing can predict sets a floor: about 2.1 bits per Gull Rock temperature reading.
:::
