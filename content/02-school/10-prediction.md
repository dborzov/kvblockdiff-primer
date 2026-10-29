---
title: 'Predict, then send the surprise'
nav: 'Predict, then send the surprise'
lede: Temperatures change slowly, so the last reading is a good guess for the next one. Send only the error of the guess, exactly, and the receiver rebuilds every value — at less than 60 % of the cost.
group: Prediction
cards:
  - q: What is a residual?
    a: The exact difference between a value and its prediction, $\vr = \vx - \vxhat$
    wrong: ["The part of a value that is thrown away", "The average of the last few values", "The prediction made by the receiver"]
    why: The receiver makes the same prediction and adds the residual back, $\vx = \vxhat + \vr$, so nothing is lost.
    sec: guess
  - q: What may a prediction use?
    a: Only things the receiver already knows, such as earlier readings
    wrong: ["Anything the sender knows, including the current reading", "Only the current reading", "Future readings, if they are available"]
    why: The receiver must be able to make exactly the same guess, or it cannot add the residual back.
    sec: guess
  - q: Predicting every temperature with the 28-day average leaves the entropy at 6.53 bits — unchanged. Why?
    a: Subtracting a constant moves the histogram but does not narrow it
    wrong: ["The average is computed wrongly", "Residuals are always more expensive than values", "The average is not known to the receiver"]
    why: Entropy depends on the spread of the values, not on where they sit. A guess has to follow the ups and downs to save bits.
    sec: which-guess
  - q: How many bits per reading does the “previous value” predictor save on the Gull Rock temperatures?
    a: About 2.9 bits (6.53 → 3.63)
    wrong: ["About 0.3 bits", "About 6.5 bits", "Nothing — it only moves the histogram"]
    why: The residuals spread over about ±0.3 °C instead of ±2.4 °C, which is three halvings of the spread, about 2.9 bits.
    sec: which-guess
  - q: What do DPCM, FLAC and PNG have in common?
    a: They predict each value from its neighbours and code the exact residual
    wrong: ["They all store values in fixed 8-bit slots", "They all throw away small details", "They all use a trained dictionary of byte strings"]
    why: They are all lossless predictive coders — predict, take the exact integer residual, entropy-code it.
    sec: family
---

Here are the first eight temperature readings Gull Rock sent one night, at 00:00, 00:30, and so on:

| time | 00:00 | 00:30 | 01:00 | 01:30 | 02:00 | 02:30 | 03:00 | 03:30 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| °C | 11.8 | 12.0 | 11.6 | 11.6 | 11.8 | 11.8 | 11.7 | 11.7 |

Notice anything? Each reading is within a few tenths of the one before. A forecaster who knows the last reading can guess the next one almost exactly. So why send the whole number again? Send how far it moved: +0.2, −0.4, 0.0, +0.2, 0.0, −0.1, 0.0.

## Guess, then send how wrong {#guess}

The station measures in tenths of a degree, so every reading is really a whole number: 118, 120, 116, … tenths. Here is the plan, in three moves.

1. Both ends make the same guess for the next reading — here, “the same as last time”.
2. The station sends only the difference between the reading and the guess.
3. The office adds the difference to its own copy of the guess and gets the reading back, exactly.

::: define prediction
- **What it is:** a guess $\vxhat$ of the next value $\vx$, made only from things the receiver also knows. The rule that makes the guess is the *predictor*.
- **Example:** “the previous reading”: $\vxhat_{\vi} = \vx_{\vi-1}$.
- **Easy to confuse with:** a forecast that may use anything. A prediction for coding may use only what the receiver already has — earlier readings, an almanac — never the reading being sent.
:::

::: define residual
- **What it is:** the exact difference between a value and its prediction, sent instead of the value:

  $$
  \vr_{\vi} = \underbrace{\vx_{\vi}}_{\text{reading}} - \underbrace{\vxhat_{\vi}}_{\text{guess}}, \qquad \vx_{\vi} = \vxhat_{\vi} + \vr_{\vi}
  $$ {#eq-residual}

- **Example:** at 00:30, $\vx = 120$ tenths, $\vxhat = 118$, so $\vr = +2$.
- **Easy to confuse with:** a rounding error. In lossless coding the residual is an exact whole number and nothing is thrown away.
:::

| time | reading $\vx$ | guess $\vxhat$ (previous) | residual $\vr$ |
|---|---:|---:|---:|
| 00:00 | 118 | — | 118 (sent in full) |
| 00:30 | 120 | 118 | +2 |
| 01:00 | 116 | 120 | −4 |
| 01:30 | 116 | 116 | 0 |
| 02:00 | 118 | 116 | +2 |
| 02:30 | 118 | 118 | 0 |
| 03:00 | 117 | 118 | −1 |
| 03:30 | 117 | 117 | 0 |

The round trip in a few lines of numpy:

```python send residuals, rebuild the readings exactly
import numpy as np
x = np.array([118, 120, 116, 116, 118, 118, 117, 117])   # tenths of a degree
r = np.diff(x, prepend=0)        # first reading in full, then x[i] - x[i-1]
back = np.cumsum(r)              # receiver: add each residual to its guess
print(r, (back == x).all())      # [118   2  -4   0   2   0  -1   0] True
```

Because the residuals are whole numbers, the receiver's sum is exact. A predictor may even use fractions inside — an average of two readings, say — as long as both ends round its result to a whole number in the same way.

::: takeaway
- Predict the next value from what both ends know, send the exact residual $\vr = \vx - \vxhat$, add it back at the other end.
- With whole-number values and residuals, the round trip is exact: lossless.
- The prediction may only use what the receiver already has.
:::

## Which guess? {#which-guess}

“The previous reading” is one guess among many. To compare guesses we need more than one night. Here are all four weeks the station sent; the night above is the first eight rows of the table.

::: dataset fig-predict-temp-data temp view=timeline,histogram hl=fronts marks=mean metrics=n,mean,sd,distinct,entropy,width
**Four weeks of Gull Rock temperatures.** *Four weeks:* the temperature every 30 minutes for 28 days (°C against the day; drag across it to select a stretch), with the readings taken while one of the five fronts passed marked in red and the four-week mean as a grey line. *How often each temperature:* the histogram, in half-degree bins. *Table:* every reading, in tenths of a degree and in °C. *Numbers:* what the readings cost before any prediction. Synthetic, seeded data: a daily cycle, a slow weather wander, five fronts and sensor noise.
:::

The daily swing is the loudest thing on the timeline, about five degrees from the small hours to mid-afternoon, and the fronts shift the whole wave up or down within a few hours. Sent as they are, the readings cover 112 different values and cost 6.53 bits each. Every reading, though, sits close to the one before. The figure runs four predictors over the same four weeks and measures what each residual costs.

::: figure fig-predict-temperature siPredict wide
**Four predictors on four weeks of temperatures.** Top: the temperatures of [[#fig-predict-temp-data]] (blue; 1,344 readings in tenths of a degree) and the prediction (red dashed). Bottom left: the residual, reading minus prediction, over time. Bottom right: histogram of the residuals (share of readings per value, one bar per tenth of a degree). Tiles: the residual's standard deviation (its typical size, defined on [[#school-residual-shapes]]), the bits per reading — the order-0 entropy of the residuals, what an entropy coder would need — and the fixed width that holds every residual. Predictors: **no prediction** (send the reading itself), **the average** (the 28-day mean, 11.0 °C, known to both ends), **previous value**, and **previous + trend** (extend the last step: $2\vx_{\vi-1} - \vx_{\vi-2}$). **One day** zooms in on day 9.
:::

| predictor | typical size of a residual | bits per reading | fixed width |
|---|---:|---:|---:|
| no prediction | 2.4 °C | 6.53 | 7 bits |
| the average | 2.4 °C | 6.53 | 7 bits |
| previous value | 0.30 °C | 3.63 | 5 bits |
| previous + trend | 0.30 °C | 3.62 | 5 bits |

Three lessons hide in this table.

1. **A constant guess saves nothing.** Subtracting the average moves the histogram to zero without making it any narrower, so the [[entropy]] stays at 6.53 bits. Only a guess that follows the ups and downs helps.
2. **Following the ups and downs helps a lot.** The previous reading cuts the spread about eight-fold and saves 2.9 bits per reading — the radio bill drops to 56 %.
3. **Cleverer is not automatically better.** Extending the trend uses two readings, so the sensor noise of both leaks into the guess. Here the trend's gain and the extra noise cancel out almost exactly.

::: try
1. Switch between **no prediction** and **the average**: the histogram moves, its shape does not, the bits stay at 6.53.
2. Pick **previous value** and zoom to **one day**: the red guess is the blue line, shifted by one step.
3. Look for the five fronts in the top plot: sudden drops or rises over a few hours. The largest residual of all, −1.1 °C, comes as the fourth front passes, on day 17.
:::

::: takeaway
- Bits depend on the spread of the residuals, not on where they sit: a constant guess saves nothing.
- The previous reading shrinks the typical residual from 2.4 °C to 0.3 °C and saves 2.9 bits per reading.
- A more elaborate predictor can lose as much to noise as it gains in accuracy.
:::

## An old trick: DPCM, FLAC, PNG {#family}

Sending differences instead of values is one of the oldest ideas in data compression. Engineers at Bell Labs used it around 1950 for telephone and television signals, under the name *differential pulse-code modulation*, DPCM. Today it runs inside formats you use every day.

- **FLAC**, lossless audio: predicts each sample from the few before it with a short linear formula, then codes the residuals with a simple entropy code.
- **PNG**, lossless images: before compressing a row of pixels, it may replace each pixel by its difference from the pixel to the left, the pixel above, their average, or a cleverer pick of the three (the “Paeth” filter).
- **This page:** temperature minus the previous temperature.

::: define predictive-coding
- **What it is:** lossless predictive coding, also called DPCM: predict each value from what is already known, take the exact integer residual, entropy-code the residual.
- **Example:** FLAC, PNG's filters, Gull Rock's temperatures.
- **Easy to confuse with:** lossy prediction (in video or speech codecs), which also rounds the residual coarsely and so cannot rebuild the original exactly.
:::

```graph
id: si-predictive-coding
columns: [Known at both ends, Computed by the sender, Sent on the link]
nodes:
  - {id: past, col: 1, row: 1, title: "What both ends know", text: "Earlier readings, an almanac.", term: side-information, link: school-side-information}
  - {id: pred, col: 1, row: 2, title: "Prediction", text: "The same guess, made at both ends.", term: prediction}
  - {id: res, col: 2, row: 2, title: "Residual", text: "Reading minus guess: an exact integer.", term: residual}
  - {id: code, col: 3, row: 2, title: "Entropy coder or fixed width", text: "Small residuals, few bits.", term: entropy-coder, link: school-arithmetic}
edges:
  - [past, pred, "feeds"]
  - [pred, res]
  - [res, code]
```

::: theme predict-correct
This is the theme in its purest form: guess from what both ends know, then send only how wrong the guess was. The better the guess, the narrower the residuals and the fewer bits they cost. What the guess saves is, in the language of [[#school-mutual-information]], the mutual information between a reading and its past.
:::

Two questions are still open. How exactly does the *width* of the residuals turn into bits? And how much better must a predictor be to save one more bit? The next two pages answer them. (Later, when the language model arrives, its stored numbers will be coded in exactly this shape: predict, exact residual, code the residual.)

::: takeaway
- Predict, take the exact residual, entropy-code it: that is lossless predictive coding (DPCM).
- FLAC and PNG work this way; so does every coder in the rest of this site.
- What a predictor saves is the mutual information between a value and what both ends already know.
:::
