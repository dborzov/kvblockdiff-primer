---
title: 'The exchange rate: variance explained → bits'
nav: The exchange rate
lede: A predictor that explains three quarters of the variance saves one bit per value; two bits need 94 %. This page derives that exchange rate from the last page's rule — and shows why it is harsh.
group: Prediction
cards:
  - q: A predictor explains 75 % of the variance of bell-shaped values. How many bits per value does it save?
    a: 1 bit
    wrong: ["0.75 bits", "2 bits", "3 bits"]
    why: '½ log₂(1/(1 − 0.75)) = ½ log₂ 4 = 1. The residual''s σ is half the original.'
    sec: formula
  - q: About what share of the variance must a predictor explain to save 2 bits per value?
    a: About 94 %
    wrong: ["About 50 %", "About 80 %", "About 99.9 %"]
    why: 'Two bits means the residual''s σ is a quarter of the original, so its variance is 1/16: R² = 15/16 ≈ 93.75 %.'
    sec: formula
  - q: 'A predictor explains a share $\vRsq$ of the variance $\vsigma^2$. What variance does the residual keep?'
    a: '$(1 - \vRsq)\,\vsigma^2$'
    wrong: ['$\vRsq\,\vsigma^2$', '$(1 - \vRsq)\,\vsigma$', '$\vsigma^2 / \vRsq$']
    why: R² is the share explained; the rest, 1 − R², stays in the residual.
    sec: r-squared
  - q: Predicting every temperature with the 28-day average gives which R²?
    a: '0'
    wrong: ["0.5", "0.98", "1"]
    why: The average is a constant; the residual has exactly the spread of the values. No variance explained, no bits saved.
    sec: r-squared
  - q: Going from one bit saved to two bits saved, by how much must the unexplained variance shrink?
    a: By a factor of 4
    wrong: ["By a factor of 2", "By 25 percentage points", "It must vanish completely"]
    why: Each bit halves σ, and halving σ quarters the variance. So 25 % unexplained becomes 6.25 %.
    sec: harsh
---

“My predictor is 90 % right.” It sounds like a triumph. In bits, if “90 % right” means it explains 90 % of the variance, it saves 1.66 bits per value. A predictor that explains *half* the variance — still a respectable model by most standards — saves half a bit.

This page derives that exchange rate in three lines, and explains why it is so stingy.

## Variance explained {#r-squared}

Any predictor splits the [[variance]] of the values into two parts: the part it explains and the part left in the residual.

::: define r-squared
- **What it is:** the share of a value's variance that a predictor accounts for, $\vRsq$, between 0 and 1. The residual keeps the rest:

  $$
  \vRsq = 1 - \frac{\text{variance of the residual}}{\text{variance of the value}}, \qquad \text{variance of the residual} = (1 - \vRsq)\,\vsigma^2
  $$ {#eq-r-squared}

- **Example:** the previous-value predictor on the Gull Rock temperatures leaves residuals with $\vsigma = 3.05$ tenths, against 24.2 tenths for the readings themselves. $\vRsq = 1 - (3.05/24.2)^2 \approx 0.984$: 98.4 % of the variance explained.
- **Easy to confuse with:** the share of values guessed exactly right. A predictor can explain 98 % of the variance and still be off on almost every reading — by a little.
:::

::: aside reminder Variance and standard deviation
The variance $\vsigma^2$ is the average squared distance from the mean; the standard deviation $\vsigma$ is its square root, the typical distance ([[#school-residual-shapes]]).
:::

The other predictors of [[#school-prediction]] fit the same scale. The 28-day average explains nothing: $\vRsq = 0$, since its residual is just the values moved down by a constant. No prediction at all also has $\vRsq = 0$ by this measure, and costs the same bits.

::: takeaway
- $\vRsq$ is the share of the variance a predictor explains; the residual keeps $(1 - \vRsq)\vsigma^2$.
- The previous-value predictor on the temperatures: $\vRsq \approx 98.4\,\%$. The average: $\vRsq = 0$.
:::

## From R² to bits {#formula}

Combine this with the rule of [[#school-residual-shapes]]: bits per value ≈ $\log_2\vsigma$ + a constant.

1. Before prediction, the values cost $\log_2 \vsigma + c$ bits.
2. After, the residual's standard deviation is $\vsigma\sqrt{1 - \vRsq}$, so it costs $\log_2 \vsigma + \log_2\sqrt{1-\vRsq} + c$ bits.
3. The constant and $\log_2\vsigma$ cancel. What is left is the saving.

::: keycard The exchange rate
$$
\text{bits saved per value} = \tfrac12 \log_2 \frac{1}{\underbrace{1 - \vRsq}_{\text{share left unexplained}}}
$$ {#eq-exchange-rate}

Variance explained buys bits at a logarithmic rate: 75 % buys one bit, 94 % buys two.
:::

| $\vRsq$ | residual $\vsigma$, as a share of the original | bits saved per value |
|---:|---:|---:|
| 0 | 100 % | 0 |
| 50 % | 71 % | 0.50 |
| 75 % | 50 % | 1.00 |
| 90 % | 32 % | 1.66 |
| 93.75 % | 25 % | 2.00 |
| 98.4 % (temperatures, previous value) | 13 % | 2.99 |
| 99 % | 10 % | 3.32 |

::: figure fig-exchange-rate siExchange wide
**The exchange rate between variance explained and bits.** Left: bits saved per value, $\tfrac12\log_2(1/(1-\vRsq))$, against the share of variance explained $\vRsq$ (violet curve; grey dots at 50, 75, 90, 94 and 99 %; dashed lines at 1 and 2 bits). Drag the knob along the curve or use the slider. Right: the spread of the values before prediction (blue bell, standard deviation 1) and of the residual after (green bell, standard deviation $\sqrt{1-\vRsq}$), drawn as Gaussian densities. Tiles: $\vRsq$, the residual's spread as a share of the original, the bits saved, and the $\vRsq$ needed for one more bit.
:::

::: try
1. Drag from 0 to 50 %: half the variance gone, and only half a bit saved.
2. Drag to 75 %: the green bell is exactly half as wide as the blue one. One bit.
3. Watch the “next bit needs” tile as you go: 75 % → 93.8 % → 98.4 % → 99.6 %.
:::

Check it against the measurement of [[#school-prediction]]. The formula says the previous-value predictor, at 98.4 %, saves 2.99 bits per reading; the histograms measured 6.53 − 3.63 = 2.91. Close, and the small gap has a known cause: the raw temperatures are not quite bell-shaped, so their own cost was already a little below the formula's.

::: note connection The same number as mutual information
For bell-shaped values and a straight-line predictor, $\tfrac12\log_2\frac{1}{1-\vRsq}$ is exactly the [[mutual-information]] between a value and its prediction. The exchange rate is not a new idea; it is [[#school-mutual-information]] written in the language of variances.
:::

::: takeaway
- Bits saved per value $= \tfrac12\log_2\frac{1}{1-\vRsq}$, for bell-shaped residuals.
- 50 % → 0.5 bit, 75 % → 1 bit, 94 % → 2 bits, 99 % → 3.3 bits.
- On the temperatures: 98.4 % explained, 2.99 bits predicted, 2.91 measured.
:::

## Why the rate is harsh {#harsh}

Each extra bit halves the residual's $\vsigma$, which means cutting the *unexplained* variance by four. The first bit needs 75 % explained. The second needs 93.75 %, the third 98.4 %, the fourth 99.6 %. Every bit asks you to remove three quarters of whatever is still unexplained.

The flip side is just as important. A predictor that gets the gist right — the season, the general trend, “it's roughly like yesterday” — often explains a modest share of the variance, and a modest share is worth little: 30 % explained saves a quarter of a bit. Big savings come only from predictors that capture almost everything.

::: theme noise-floor
The last few percent are usually not available at any price. At Gull Rock the sensor's noise — about one tenth of a degree, assumed in this toy — makes up roughly 0.2 % of the readings' variance, and no predictor can explain it. So $\vRsq$ cannot pass about 99.8 %, and no predictor can save much more than 4.5 bits on these readings. Lossless coding must pay for the noise in full.
:::

When the language model arrives, the same question will come back in a far more expensive setting: how much of the variance of its stored numbers could a [[dictionary]] explain? [[#idea-the-trap]] and [[#homework-exchange-rate]] put numbers on it. Keep this curve in mind; it is the reason those numbers turn out modest.

::: note warning What the formula assumes
It assumes the residual keeps the same shape as it narrows (bell-shaped before and after) and stays several integer steps wide. For fat-tailed residuals, or residuals squeezed below one step, it is only a guide — measure instead, as [[#school-residual-shapes]] does with Monte Carlo.
:::

::: takeaway
- Every extra bit requires cutting the unexplained variance by a factor of four.
- Getting the gist right explains little variance, and little variance buys little: 30 % → a quarter of a bit.
- Unpredictable noise caps $\vRsq$, and with it the bits any predictor can save.
:::
