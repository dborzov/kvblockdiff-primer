---
title: "Lifting: how a rotation becomes lossless"
nav: Lifting
group: Fields and tools to think with
lede: Rotate a grid of integers and round, and some points collide — information gone for good. Do the same rotation as three integer shears, and every point comes back. Each shear turns out to be a tiny predict-then-correct step.
cards:
  - q: Why is "rotate in floating point, then round to integers" not lossless?
    a: Rounding can send two different inputs to the same integer point, and then no decoder can tell which one it was
    wrong: ["Because floating-point rotations are not exact", "Because a rotation changes the variance of the data", "Because integers cannot be rotated at all"]
    why: In the figure, 12 of the 81 points vanish into collisions at 45°. A many-to-one step cannot be undone.
    sec: rounding
  - q: 'Why can the shear $\vx_1 \leftarrow \vx_1 - \mathrm{round}(a\,\vx_2)$, with a fixed slope a, be undone exactly?'
    a: 'It leaves $\vx_2$ unchanged, so the decoder can recompute the very same rounded shift and add it back'
    wrong: ["Because rounding errors cancel on average", "Because the slope is always an integer", "Because the decoder stores the rounding error separately"]
    why: The rounded amount depends only on the coordinate that did not move. Inverse — same step with the opposite sign.
    sec: shears
  - q: How many integer shears does a 2-D rotation need?
    a: Three — shear the first coordinate, then the second, then the first again
    wrong: ["One", "Two", "As many as the angle in degrees"]
    why: 'Rotation by θ = shear by −tan(θ/2), then by sin θ, then by −tan(θ/2) again.'
    sec: shears
  - q: Each lifting step is an instance of which running idea?
    a: Predict, then store only the surprise — predict one coordinate from the other and keep the exact residual
    wrong: ["Pay once, use many times", "Trust, but shuffle", "Which entries versus what is inside them"]
    why: '$\vx_1 - \mathrm{round}(a\,\vx_2)$ is literally "the value minus its prediction from the other coordinate".'
    sec: shears
  - q: Why does wave 1 not implement a lossless KLT?
    a: It computes the KLT's bound from the spectrum first; lifting is built only if that bound beats the light dictionaries by enough
    wrong: ["Because lifting cannot be used on GPUs", "Because a KLT is always lossy", "Because the KLT has already been ruled out"]
    why: A full lossless rotation is heavy (about d² multiply-adds per entry, a 2d-entry dictionary). The bound decides whether that cost can pay.
    sec: plan
---

Take the 81 integer points of a 9 × 9 patch of grid. Turn the patch by 45°. Round every point to the nearest integer point. You started with 81 different points. You end with 69.

Twelve points have vanished: each landed on a spot already taken by another. Whatever you do afterwards, you cannot tell those inputs apart again. A rotation — the most reversible thing in geometry — has become lossy, just by rounding.

::: note history What the first draft did not use
It listed the [[klt]] among the lossless dictionary types without saying how a rotation can be undone *exactly* on integers. The answer is an old trick of lossless image coding called [[lifting]]. Item 9 of the old list: *lifting factorizations turn any orthogonal transform into an integer-reversible one.*
:::

## Why rounding breaks a rotation {#rounding}

::: aside reminder Rotations and the KLT
A [[rotation]] turns the axes without stretching anything. The KLT is the rotation that lines the axes up with the directions in which the data spreads most, so the new coordinates are uncorrelated ([[#school-rotation]]). The bits it saves are the [[transform-coding-gain]], ½ log₂ of the eigenvalues' AM over GM ([[#school-coding-gain]]).
:::

On real numbers a rotation is perfectly reversible: rotate back by the same angle. Our numbers are not real, though. They are 8-bit codes, and [[lossless]] means we must give back the same integers. So after rotating we round, and rounding is many-to-one. The grid of rotated points is tilted against the integer grid. Some integer cells catch two rotated points, others catch none.

::: figure fig-missed-lifting mbLiftingGrid
**Rotating 81 integer points, two ways.** Grey dots: the input, a 9 × 9 patch of the integer grid (faint dots mark every integer point). Hollow circles: where an exact, real-valued rotation by θ would put each input. Blue dots: the integer outputs; red dots: outputs shared by two inputs (information lost). *Rotate, then round* rounds the exact rotation. *Shear 1, 2, 3* show the three lifting steps one at a time; the thin lines join each point's position before and after the step. The readout counts distinct outputs, checks that the lifted points undo exactly, and gives the largest distance (in grid steps) between a lifted point and its exact rotation. Slide the angle.
:::

::: try
1. With *rotate, then round* at 45°, count the red dots: 12 inputs are lost.
2. Try 10° and 80°: fewer collisions, but never reliably zero. A lossless coder cannot rely on luck.
3. Step through *shear 1 → 2 → 3*. Each step slides points along one axis only, and no two points ever collide.
4. Compare *shear 3* with the hollow circles. The lifted points sit within 0.77 of a step of the exact rotation at 45° — a slightly wrong rotation, exactly undoable.
:::

::: takeaway
- Rounding after a rotation merges points, and merged points cannot be separated: a float KLT plus rounding is lossy.
- A lossless rotation must be a one-to-one map from integers to integers.
:::

## Three shears {#shears}

A **shear** slides every point along one axis by an amount that depends only on the other coordinate. Write the two coordinates as $\vx_1, \vx_2$:

$$
\vx_1 \leftarrow \vx_1 - \mathrm{round}\big(\underbrace{\tan\tfrac{\theta}{2}}_{\text{slope}}\;\vx_2\big)
\qquad\text{is undone by}\qquad
\vx_1 \leftarrow \vx_1 + \mathrm{round}\big(\tan\tfrac{\theta}{2}\;\vx_2\big).
$$ {#eq-missed-shear}

Rounding is harmless here. The decoder knows $\vx_2$ — it did not move — so it computes exactly the same rounded amount and adds it back. And three shears make a rotation:

$$
\begin{pmatrix}\cos\theta & -\sin\theta\\ \sin\theta & \cos\theta\end{pmatrix}
=
\underbrace{\begin{pmatrix}1 & -\tan\frac\theta2\\ 0 & 1\end{pmatrix}}_{\text{shear 3: move } \vx_1}
\underbrace{\begin{pmatrix}1 & 0\\ \sin\theta & 1\end{pmatrix}}_{\text{shear 2: move } \vx_2}
\underbrace{\begin{pmatrix}1 & -\tan\frac\theta2\\ 0 & 1\end{pmatrix}}_{\text{shear 1: move } \vx_1}
$$ {#eq-missed-three-shears}

Here θ is just the toy's angle. Rounding inside every step makes the result a slightly wrong rotation. But it is a *one-to-one* map of integers, and undoing it means running the steps backwards with the signs flipped.

Now look at one shear again. "$\vx_1$ minus a rounded multiple of $\vx_2$" is a [[prediction]] of one coordinate from the other, and what is kept is the exact [[residual]]. Lifting is [[predictive-coding]] applied three times in a row. Wavelet people even call the steps *predict* and *update*.

::: theme predict-correct
Here the theme hides inside linear algebra. A lossless rotation is a chain of predict-then-correct steps, each predicting one coordinate from the ones that stay put.
:::

Does the slight wrongness cost anything? Try it on the two mast thermometers of Part II. They read the same weather in tenths of a degree, one about 0.8 °C cooler. Turning their axes by 45° gives roughly their average and their difference.

```python lifting the two thermometers by 45°, exactly
import numpy as np

def lift(x1, x2, theta):                 # rotation by theta as three integer shears
    t, s = np.tan(theta / 2), np.sin(theta)
    x1 = x1 - np.round(t * x2)
    x2 = x2 + np.round(s * x1)
    x1 = x1 - np.round(t * x2)
    return x1, x2

def unlift(x1, x2, theta):               # the same three steps, backwards, signs flipped
    t, s = np.tan(theta / 2), np.sin(theta)
    x1 = x1 + np.round(t * x2)
    x2 = x2 - np.round(s * x1)
    x1 = x1 + np.round(t * x2)
    return x1, x2

def bits(v):                             # order-0 entropy of an integer stream
    _, n = np.unique(v, return_counts=True); p = n / n.sum()
    return -(p * np.log2(p)).sum()

rng = np.random.default_rng(1)
low = np.round(rng.normal(115, 30, 20000))          # mast thermometer, tenths of a degree
high = np.round(low - 8 + rng.normal(0, 4, 20000))   # the one higher up: same weather, small offset
a, d = lift(low, high, -np.pi / 4)                   # turn the axes by 45 degrees
assert all(np.array_equal(u, v) for u, v in zip(unlift(a, d, -np.pi / 4), (low, high)))
print(f"as measured: {(bits(low) + bits(high)) / 2:.2f} bits per value")   # 6.94
print(f"lifted:      {(bits(a) + bits(d)) / 2:.2f} bits per value")        # 5.49
```

The round trip is exact, and the saving is 1.45 bits per value. The transform coding gain of this pair, from its two eigenvalues (about 1808 and 8), is ½ log₂(908 / 120) ≈ 1.46 bits. The rounding inside the shears cost almost nothing.

::: takeaway
- A shear moves one coordinate by a rounded amount computed from the other; the decoder recomputes it and undoes it exactly.
- Three shears make a 2-D rotation; Hao and Shi (2001) factor any d × d rotation into a few triangular steps of the same kind ([[#papers-classics]]).
- On the thermometer toy the lifted rotation keeps 1.45 of the 1.46 bits the formula promises.
:::

## What it costs, and what changes in the plan {#plan}

Lifting makes the KLT rung *legitimate*: a lossless coder may use it. It does not make it cheap.

:::: compare Two ways to rotate KV data
::: col Rotate, then quantize (lossy)
- Rotate in floating point, round the coefficients coarsely, entropy-code them.
- The rounding loss is the point: it is where the compression comes from.
- KVTC does this for KV caches ([[#papers-kvtc]]); JPEG does it for photos.
:::
::: col Lift (lossless)
- Rotate with integer shears; every rounding is undone on the way back.
- Saves only what decorrelation buys: the transform coding gain.
- Lossless JPEG 2000 does this with its integer wavelet; our KLT bound is this column's ceiling.
:::
::::

The bill for a full lossless KLT on our entries:

| cost | full KLT ($\vd$ = 640) | rank-16 basis | [[loc]] |
|---|---|---|---|
| dictionary weight [[weight\|w]] | $2\vd$ = 1,280 entries' worth | 32 | about 2 |
| arithmetic per decoded entry | about $\vd^2$ ≈ 400,000 multiply-adds | about 16 $\vd$ ≈ 10,000 | about 640 additions |
| affordable [[scope]] | request only ([[#homework-amortization-rule]]) | block, from $\vb$ ≈ 1K | any |

Two smaller catches:

- **Range.** Rotated integers need a little more room than the inputs: two 8-bit codes can rotate into a 9-bit range. Fixed-length widths per coefficient absorb this.
- **Grid.** On INT8 codes (a uniform grid) a lifted rotation really is a rotation of the values. On E4M3 codes it rotates *indices* of a logarithmic grid. It is still exact, but what it decorrelates is the indices, not the values ([[#missed-mantissa-and-grid]]).

So the plan stays as the old list put it. Wave 1 does **not** implement lifting. It computes the KLT bound from each block's spectrum ([[#missed-rate-distortion-bounds]]). The rank-16 basis with explicit coefficients stands in as an upper-cost proxy. Lifting gets built only if the bound, at a scope that can afford the basis, beats the light dictionaries by a clear margin.

::: takeaway
- Lifting turns "the KLT bound" from a theoretical number into something a lossless coder could reach.
- A full lossless KLT costs ~$\vd^2$ arithmetic per decoded entry and a 1,280-entry dictionary: per-request scope only.
- Wave 1 computes the bound; the shears are written only if the bound says they will pay.
:::
