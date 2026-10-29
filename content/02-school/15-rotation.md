---
title: Turning the axes (KLT)
nav: Turning the axes (KLT)
lede: Instead of writing down "foot thermometer, top thermometer", write down "how warm the air is" and "how much the two disagree". The second number is tiny. Turning the axes to the data's own directions is the KLT, and it is the first big trick of this Part.
group: Vectors
cards:
  - q: When you rotate the axes of a 2-D cloud, what stays the same?
    a: The total spread — the sum of the variances along the two axes
    wrong: ["The variance along each axis", "The covariance between the two coordinates", "The number of bits needed per reading"]
    why: 'A rotation moves no point; it only changes which numbers we write down. The sum of the variances stays 5.94 °C² at every angle, while its split between the axes changes.'
    sec: turning
  - q: 'Why does a lopsided split of the same total spread cost fewer bits?'
    a: Bits grow with the logarithm of each variance, so one big and one tiny variance cost less than two medium ones
    wrong: ["Because the big variance is sent with fewer bits", "Because a rotation removes noise from the data", "Because lopsided data needs no sign bit"]
    why: 'By the Gaussian rule each number costs about ½ log₂ of its variance plus a constant, so the total depends on the product of the variances: 2.99 × 2.95 ≈ 8.8 before, 5.91 × 0.025 ≈ 0.15 after.'
    sec: turning
  - q: What is an eigenvalue of a covariance matrix?
    a: The variance of the data along one of its natural axes (an eigenvector)
    wrong: ["The largest entry of the matrix", "The correlation between two channels", "The mean of one channel"]
    why: 'Turned to the eigenvectors, the coordinates are uncorrelated, and the variance along each one is its eigenvalue $\vlambda$. For the thermometers: 5.91 and 0.025 °C².'
    sec: own-axes
  - q: How do the KLT and PCA differ?
    a: Not in their mathematics — both rotate to the eigenvectors; they differ in what is done next (PCA usually drops the small axes, the KLT for coding keeps them all)
    wrong: ["PCA rotates, the KLT scales", "The KLT works only in two dimensions", "PCA is lossless, the KLT is lossy"]
    why: Same eigenvectors, two traditions. Lossless coding cannot drop anything, so on this site we say KLT.
    sec: own-axes
  - q: Turning the thermometer axes to the KLT saves 2.95 bits per reading. What else gives exactly 2.95 bits?
    a: Predicting the top thermometer from the foot one with a straight line (the exchange rate at R² = 0.983)
    wrong: ["Subtracting each thermometer's mean", "Sending only the foot thermometer", "Rounding both thermometers to whole degrees"]
    why: In two dimensions the two are the same redundancy measured two ways. The difference coordinate is the residual of that prediction in disguise.
    sec: own-axes
---

Take the ten days of readings from the two thermometers on the Gull Rock mast (II.14) and subtract each thermometer's [[mean]], so the cloud of dots sits around zero. It is a cigar: long along the diagonal, very thin across it.

We describe each dot with two numbers: how far right (foot thermometer) and how far up (top thermometer). Both numbers swing over several degrees, so both cost bits. But nothing forces us to use *those* two directions. A dot is a dot; we can measure it along any pair of perpendicular axes we like.

So measure it *along the cigar* and *across the cigar*. Along: roughly the average of the two thermometers, which swings over several degrees. Across: roughly their difference, which hardly ever moves.

## Turning the axes {#turning}

::: define rotation
- **What it is:** describing the same points with a new pair (or set) of perpendicular axes. No point moves; only the numbers we write down change.
- **In two dimensions,** turning by an angle $\theta$ replaces $(\vx_0, \vx_1)$ by
  $\vx'_0 = \cos\theta\,\vx_0 + \sin\theta\,\vx_1$ and $\vx'_1 = -\sin\theta\,\vx_0 + \cos\theta\,\vx_1$.
- **At 45°** this is $\vx'_0 = (\vx_0 + \vx_1)/\sqrt2$ and $\vx'_1 = (\vx_1 - \vx_0)/\sqrt2$: the average and the difference, each scaled by $\sqrt2$ so that lengths stay the same.
- **Easy to confuse with:** any mixing of channels. A rotation keeps lengths and right angles; stretching or squashing is something else.
:::

Turn the axes yourself.

::: figure fig-sv-rotation svRotation
**The two-thermometer cloud: 480 readings, each thermometer minus its mean (°C), with a pair of perpendicular axes you can turn.** Axis 1 is purple, axis 2 is green; the thick pale bar on each axis spans ±2 standard deviations of the dots measured along that axis. *Drag* the handle at the end of axis 1, or use the slider (0–180°). *Snap to KLT* turns the axes to the cloud’s own directions. The tiles give the variance along each axis, their sum, and the bits per reading for a code that rounds each coordinate to 0.1 °C and is matched to its spread (the Gaussian rule of II.11: about $\tfrac12\log_2(2\pi e\,\text{variance}/0.1^2)$ bits per coordinate).
:::

::: try
1. Turn slowly from 0° to 45°. Watch the total in the third tile: it never changes (5.94 °C²).
2. Watch how the total is shared. At 0° it is split almost evenly (2.99 and 2.95). Near 45° nearly all of it lies on axis 1 (5.91) and axis 2 keeps 0.025.
3. Watch the bits: 12.31 per reading at 0°, 9.36 at the KLT angle. That is 2.95 bits saved per reading, about 1.5 per number.
4. Go past 45° towards 90°. The saving disappears again: at 90° the axes have simply swapped roles.
:::

Why does a lopsided split save bits when the total is fixed? Because, by the Gaussian rule, each coordinate costs about $\tfrac12 \log_2$ of its variance plus a constant. Adding logarithms multiplies what is inside them, so the total cost depends on the *product* of the variances:

- at 0°: $2.99 \times 2.95 \approx 8.8$;
- at the KLT angle: $5.91 \times 0.025 \approx 0.15$.

Same sum, a product 60 times smaller, and $\tfrac12 \log_2 60 \approx 2.95$ bits saved. Any direction in which the cloud is thin is a direction where numbers are cheap.

::: note warning Rotated numbers are not yet lossless
In the figure, rotated numbers are rounded to 0.1 °C again. Rotated values are not whole numbers of sensor steps, and rounding them cannot always be undone exactly. For [[lossless]] coding that matters; [[#school-coding-gain/lifting]] shows how a rotation is done exactly on whole numbers.
:::

::: takeaway
- A rotation describes the same points along new perpendicular axes; the total spread stays the same.
- Bits depend on the product of the variances, so concentrating the spread on few axes makes the others cheap.
- For the thermometers: 12.31 → 9.36 bits per reading at the right angle.
:::

## The data's own axes {#own-axes}

There is one angle where something special happens: the two new coordinates stop being correlated. At that angle the product of the variances is smallest. These directions belong to the cloud itself, and linear algebra has a name for them.

::: define eigenvalue
- **Eigenvectors** of a covariance matrix $\vSigma$ are its natural axes: directions such that the data, measured along them, has uncorrelated coordinates.
- **The eigenvalue** $\vlambda$ of each eigenvector is the variance of the data along it. They are sorted largest first: $\vlambda_1 \ge \vlambda_2 \ge \dots$
- **The thermometers:** axis 1 at 44.8° (almost exactly the diagonal) with $\vlambda_1 = 5.91$ °C²; axis 2 across it with $\vlambda_2 = 0.025$ °C².
- **Easy to confuse with:** the diagonal of $\vSigma$. Those are the variances along the *original* axes (2.99 and 2.95); the eigenvalues are the variances along the *natural* ones.
:::

::: aside detail The one-line definition
An eigenvector $v$ of $\vSigma$ satisfies $\vSigma v = \vlambda v$: multiplying the covariance matrix by that direction gives back the same direction, stretched by $\vlambda$. Every symmetric matrix such as $\vSigma$ has $\vd$ perpendicular eigenvectors, and numerical libraries find them in microseconds (`numpy.linalg.eigh`).
:::

::: define klt
- **What it is:** the rotation that turns the axes onto the eigenvectors of the covariance matrix. After it, the coordinates are uncorrelated and the spread is packed into as few axes as possible.
- **Example:** for the two thermometers, the KLT is the 44.8° turn: "average" and "difference".
- **In $\vd$ dimensions:** the same recipe with the $\vd \times \vd$ matrix $\vSigma$. It works for any number of channels.
- **Easy to confuse with:** [[pca]] (same mathematics, below), and with dropping data. The KLT drops nothing.
:::

What does the KLT find in all five Gull Rock channels? We standardize the channels first (II.13), so that hectopascals and knots count the same, and turn to the eigenvectors of the correlation matrix. Each new axis is a recipe, a weighted mix of the old channels:

| axis | $\vlambda$ | recipe (foot, top, humidity, pressure, wind) | what it measures |
|---|---|---|---|
| 1 | 2.65 | 0.60, 0.60, −0.53, −0.02, 0.03 | warm and dry vs cold and damp |
| 2 | 1.63 | 0.02, 0.03, −0.01, 0.71, −0.71 | high and calm vs low and windy |
| 3 | 0.37 | −0.11, −0.10, −0.24, 0.68, 0.68 | pressure and wind off their usual relation |
| 4 | 0.35 | 0.36, 0.37, 0.81, 0.19, 0.21 | humidity that temperature does not explain |
| 5 | 0.008 | 0.71, −0.71, 0.00, 0.01, 0.00 | foot thermometer minus top thermometer |

The five eigenvalues add up to 5, the total spread of five standardized channels. The first two axes are the two blocks of II.14. The middle two are leftovers without a neat story. The last axis is the thermometers' disagreement, and its eigenvalue is almost zero. That one quiet direction will do most of the saving on the next page.

::::: compare The same rotation, two traditions
:::: col KLT (coding)
Named after Karhunen and Loève. Used to *code* data: keep every rotated coordinate and give each the bits its spread deserves. Nothing is dropped, so it can be lossless. This is the word we use on this site.
::::
:::: col PCA (statistics)
::: define pca
Principal component analysis: the same eigenvectors, found the same way. Statisticians usually keep the first few axes ("principal components") and drop the rest, which is a lossy summary. Same mathematics, different next step.
:::
::::
:::::

::: theme predict-correct
The difference coordinate *is* a residual. Predict the top thermometer from the foot one with a straight line, and what is left over is (almost exactly) the across-the-cigar coordinate. In two dimensions the saving is identical: the KLT saves 2.95 bits per reading, and predicting one thermometer from the other at $\vRsq = 0.983$ saves $\tfrac12\log_2\frac{1}{1-0.983} = 2.95$ bits too. Same redundancy, measured two ways.
:::

::: takeaway
- Eigenvectors of the covariance matrix are the data's own axes; eigenvalues are the variances along them.
- The KLT turns the axes onto the eigenvectors; the new coordinates are uncorrelated. PCA is the same rotation, used to summarize rather than to code.
- For Gull Rock the KLT finds "warmth", "storminess" and a nearly silent "thermometer disagreement".
:::
