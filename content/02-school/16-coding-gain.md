---
title: What the rotation buys
nav: What the rotation buys
lede: How many bits does turning the axes save? One ratio answers it — the ordinary average of the eigenvalues over their geometric average. It is large only when a few directions hold most of the spread. And a rotation can be made exactly reversible on whole numbers.
group: Vectors
cards:
  - q: 'What is the transform coding gain, per element, of a KLT on standardized data with eigenvalues $\vlambda_1 \dots \vlambda_{\vd}$?'
    a: '$\tfrac12 \log_2 \big(\mathrm{AM}/\mathrm{GM}\big)$ of the eigenvalues'
    wrong: ['$\log_2 \vlambda_1$, from the largest eigenvalue', '$\tfrac12 \log_2 \vd$', '$\tfrac12 \log_2 (\vlambda_1 / \vlambda_{\vd})$']
    why: 'Each coordinate costs about ½ log₂ of its variance. Before the rotation all variances are 1 (their average); after it they are the λ’s. The difference, averaged, is ½ log₂ AM/GM.'
    sec: gain
  - q: 'Which spectrum gives the larger coding gain on 64 standardized channels?'
    a: 8 directions at variance 50 and 56 at 0.1 — about 2.4 bits per element
    wrong: ["8 directions at variance 10 and 56 at 1 — about 2.4 bits per element", "64 directions all at variance 1 — about 1 bit per element", "Both give the same gain, since both have 8 strong directions"]
    why: 'The geometric mean is dragged down by the small eigenvalues. 10 vs 1 gives only 0.34 bit; 50 vs 0.1 gives 2.43 bits.'
    sec: spectra
  - q: 'What does "low rank" mean for a cloud of vectors?'
    a: Its spread lives mostly in a few directions — a few large eigenvalues, the rest small
    wrong: ["It has few vectors", "Its channels have small means", "It has been rounded to few bits"]
    why: The sharper the drop from the large eigenvalues to the small ones, the more a KLT saves.
    sec: spectra
  - q: Why can a KLT computed in floating point not simply be rounded to make it lossless?
    a: Rotated whole numbers are generally not whole numbers; rounding them cannot always be undone exactly
    wrong: ["Because a rotation changes the total spread", "Because floating point cannot store negative numbers", "Because the KLT is only defined for two channels"]
    why: Lifting fixes this by splitting the rotation into steps that each change one number by a rounded function of the others — undone by subtracting the same rounded amount.
    sec: lifting
  - q: In the integer average-and-difference transform, how is the original foot reading recovered from s and d?
    a: 'foot = s − ⌊d/2⌋, then top = foot + d'
    wrong: ["foot = s + d, then top = s − d", "foot = (s + d) / 2, rounded", "foot = s × 2 − d"]
    why: Each lifting step is undone by subtracting exactly what it added, in reverse order — no rounding error survives.
    sec: lifting
---

On the last page, turning the thermometer axes saved 2.95 bits per reading. Turning all five Gull Rock channels at once gave a table of eigenvalues: 2.65, 1.63, 0.37, 0.35 and 0.008. How many bits is *that* worth? There is a one-line answer, and it explains when rotations are a big deal and when they are not.

## The coding gain {#gain}

Follow the bits through a rotation, one step at a time.

1. **[[standardize|Standardize]] every channel** (II.13). Each channel now has variance 1.
2. **Cost before rotating.** By the Gaussian rule ([[#school-residual-shapes]]), a number costs about $\tfrac12\log_2$ of its variance plus a constant. All variances are 1, so all cost the same.
3. **Rotate to the KLT axes** (II.15). The variances become the eigenvalues $\vlambda_1, \dots, \vlambda_{\vd}$. A rotation keeps the total spread, so the eigenvalues still add up to $\vd$: their ordinary average (the arithmetic mean, AM) is still 1.
4. **Cost after rotating.** Each axis costs $\tfrac12\log_2 \vlambda_i$ plus the same constant. On average that is $\tfrac12\log_2$ of the *geometric* mean of the eigenvalues (GM: multiply all $\vd$ of them, take the $\vd$-th root).
5. **The saving** is the difference, $\tfrac12\log_2 \mathrm{AM} - \tfrac12\log_2 \mathrm{GM}$, per element.

::: keycard The transform coding gain
$$
\text{bits saved per element} \;=\; \frac12 \log_2 \frac{\overbrace{\tfrac{1}{\vd}\textstyle\sum_i \vlambda_i}^{\mathrm{AM}:\ \text{ordinary average}}}{\underbrace{\big(\textstyle\prod_i \vlambda_i\big)^{1/\vd}}_{\mathrm{GM}:\ \text{geometric average}}}
$$ {#eq-sv-coding-gain}
It is zero when all eigenvalues are equal and grows when a few dominate.
:::

::: define transform-coding-gain
- **What it is:** the bits per element saved by rotating data to its KLT axes and coding each coordinate on its own, compared with coding the original channels on their own.
- **Example:** the two thermometers, standardized, have eigenvalues 1.9915 and 0.0085. AM = 1, GM = $\sqrt{1.9915 \times 0.0085} = 0.130$, gain $= \tfrac12 \log_2 (1/0.130) = 1.47$ bits per element — the 2.95 bits per reading of II.15.
- **Fine print:** exact for bell-shaped ([[gaussian]]) data, a guide otherwise. It counts what the rotation saves, not the cost of telling the receiver which rotation was used.
:::

::: define am-gm
- **What it is:** the ratio of the ordinary average of the eigenvalues to their geometric average. It is never below 1, and equals 1 only when all eigenvalues are equal.
- **Why the geometric mean:** bits add up logarithms, and adding logarithms is multiplying. A single tiny eigenvalue drags the product, and so the GM, far down.
:::

Here is the same arithmetic for all five Gull Rock channels:

```python the transform coding gain of Gull Rock's five channels
import numpy as np
lam = np.array([2.64553, 1.62947, 0.37158, 0.34498, 0.00844])   # eigenvalues, standardized channels
am, gm = lam.mean(), np.exp(np.log(lam).mean())                  # arithmetic and geometric mean
print(round(am, 3), round(gm, 3), round(0.5 * np.log2(am / gm), 2))   # 1.0 0.342 0.77
```

0.77 bit per element, so about 3.9 bits per five-number reading. Most of it comes from one place: the thermometers' disagreement, the axis with $\vlambda = 0.008$.

::: takeaway
- Transform coding gain $= \tfrac12 \log_2(\mathrm{AM}/\mathrm{GM})$ of the eigenvalues, per element.
- On standardized data AM is 1, so the gain is decided by the geometric mean — by how small the small eigenvalues are.
- Gull Rock: 1.47 bits per element for the two thermometers, 0.77 for all five channels.
:::

## Spiky and flat spectra {#spectra}

The list of eigenvalues, sorted from largest to smallest, is called the **spectrum** of the data. Its shape decides everything.

::: figure fig-sv-spectrum svSpectrum
**Eigenvalue spectra and the coding gain they allow.** Each bar is one KLT axis; its height is the eigenvalue $\vlambda$ (the variance along that axis) on a logarithmic scale, after rescaling so that the eigenvalues average 1, as standardized data would. The blue dashed line is their arithmetic mean (AM), the red dashed line their geometric mean (GM); the tiles give both, the gain $\tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$ per element, and the total per vector. *Choose* a spectrum with the buttons: the Gull Rock data of the last two pages, a flat one, and the two 64-channel examples of the first draft. *Your own* builds a 64-channel spectrum from the two sliders: how many directions are strong, and how much stronger they are than the quiet ones.
:::

::: try
1. *Flat (64)*: AM = GM, and the gain is zero. A rotation cannot help data that spreads equally in every direction.
2. *8 strong ×10*: eight directions hold most of the spread, yet the gain is only 0.34 bit per element. The quiet directions are not quiet enough.
3. *8 strong, 56 quiet*: the strong directions sit at 50 and the 56 quiet ones at 0.1, five hundred times lower. The gain jumps to 2.43 bits.
4. *Your own*: keep 8 strong directions and slide the ratio from 1× to 1000×. The gain grows with the logarithm of the ratio, and only once the quiet directions are really quiet.
:::

::: define low-rank
- **What it is:** data whose spread lives mostly in a few directions — a few large eigenvalues, the rest small. ("Rank" counts the directions that matter.)
- **What matters for coding:** not *how few* the strong directions are but *how quiet* the rest are. "Low-rank-ish" data (example 2) gains little; sharply low-rank data (example 3) gains a lot.
- **Easy to confuse with:** having few vectors, or few channels.
:::

::: note warning A small correction to the first draft
The first draft of this proposal quoted the second example as "≈ 2.3 bits". The arithmetic gives 2.43 bits ($\mathrm{AM} = 6.34$, $\mathrm{GM} = 0.217$). The conclusion stands: only sharply low-rank data pays.
:::

The lesson has a sceptical edge. A plot of eigenvalues that "falls off nicely" proves little. What matters is how far the *small* eigenvalues fall, and a single noisy channel can keep them from falling far. The bits live in the quiet directions.

::: takeaway
- A flat spectrum gives no gain; a spiky one gives a lot.
- The gain is controlled by the quiet directions: 8 strong axes over a floor of 1 give 0.34 bit, over a floor of 0.1 they give 2.43 bits.
- "Low rank" helps only when it is sharp.
:::

## Rotating whole numbers exactly {#lifting}

There is a catch for [[lossless]] coding. The thermometers report whole numbers of tenths of a degree. Rotate them by 45° and you get numbers like $(114 + 108)/\sqrt2 = 156.98\ldots$. Round that, and the original pair can no longer always be recovered. A rotation in floating point is not lossless.

The fix is a trick called lifting. Break the rotation into steps that each change **one** number by an amount computed from the **other** numbers, rounded. Each step can be undone exactly: compute the same rounded amount again and subtract it.

For the two thermometers, the average-and-difference rotation becomes two lifting steps, applied to whole numbers of tenths:

```python an exactly reversible "average and difference" for the two thermometers
import numpy as np
foot = np.array([114, 118, 118, 120, 121, 121, 119, 118, 117, 118, 118, 117])  # tenths of a degree
top  = np.array([108, 114, 114, 113, 114, 117, 116, 112, 111, 113, 112, 112])
d = top - foot                       # step 1: the difference, exact
s = foot + np.floor_divide(d, 2)     # step 2: foot plus half the difference, rounded down
foot2 = s - np.floor_divide(d, 2)    # undo step 2 ...
top2 = foot2 + d                     # ... then step 1
assert (foot2 == foot).all() and (top2 == top).all()
print(s[:4], d[:4])                  # [111 116 116 116] [-6 -4 -4 -7]
```

The pair $(s, d)$ is "roughly the average, exactly the difference", and it takes the original twelve readings back with no error at all. The difference column is a narrow band of small numbers, which is where the coding gain lives.

::: define lifting
- **What it is:** writing a rotation as a short sequence of steps, each adding to one number a rounded function of the others. Every step is undone by subtracting the same amount, so the whole transform maps whole numbers to whole numbers, reversibly.
- **Any 2-D rotation** by an angle $\theta$ needs three such steps (with $a = -\tan(\theta/2)$ and $b = \sin\theta$): add $\mathrm{round}(a \cdot \vx_1)$ to $\vx_0$, then $\mathrm{round}(b \cdot \vx_0)$ to $\vx_1$, then $\mathrm{round}(a \cdot \vx_1)$ to $\vx_0$ again. Larger rotations are factorized the same way (the "PLUS" factorization of Hao and Shi, 2001).
- **Where it is used:** the lossless mode of JPEG 2000 codes images with an integer wavelet built from lifting steps.
- **The price:** each rounding adds a little noise to the transformed values, so the integer version saves slightly less than the ideal gain.
:::

Whether implementing a lifted KLT is worth the effort is a question the bound answers first: compute $\tfrac12 \log_2(\mathrm{AM}/\mathrm{GM})$ from the spectrum, and build only if it is big. Part VII returns to this ([[#missed-lifting]]).

::: takeaway
- Rounding a rotated vector breaks losslessness; lifting repairs it by splitting the rotation into exactly reversible integer steps.
- The thermometers' average-and-difference becomes two lifting steps: $d = $ top − foot, $s = $ foot $+ \lfloor d/2 \rfloor$.
- First compute the gain from the spectrum; build the lossless transform only if the gain is worth it.
:::
