---
title: 'Lifting: how a rotation becomes lossless'
nav: Lifting
group: Coding the residual
lede: Rotate a grid of integers and round, and some points collide, their information gone for good. Do the same rotation as three integer shears and every point comes back. Each shear is a tiny predict-then-correct step, and the stage it enables is the lossless form of the Compass.
cards:
  - q: Why is "rotate in floating point, then round to integers" not lossless?
    a: Rounding can send two different inputs to the same integer point, and then no decoder can tell which one it was
    wrong: ["Because floating-point rotations are not exact", "Because a rotation changes the variance of the data", "Because integers cannot be rotated at all"]
    why: In the figure, 12 of the 81 points vanish into collisions at 45°. A many-to-one step cannot be undone.
    sec: rounding
  - q: 'Why can the shear $\vx_1 \leftarrow \vx_1 - \mathrm{round}(a\,\vx_2)$, with a fixed slope $a$, be undone exactly?'
    a: 'It leaves $\vx_2$ unchanged, so the decoder recomputes the very same rounded shift and adds it back'
    wrong: ["Because rounding errors cancel on average", "Because the slope is always an integer", "Because the decoder stores the rounding error separately"]
    why: The rounded amount depends only on the coordinate that did not move. The inverse is the same step with the opposite sign.
    sec: shears
  - q: Why did the campaigns never build a lifted KLT?
    a: Code-length estimates showed every rotation losing 0.28 to 0.32 bit per element, about a quarter of it the price of rounding a rotated vector, which lifting makes reversible but not free
    wrong: ["Because lifting cannot run on GPUs", "Because a KLT is always lossy", "Because the basis would not fit in the leash"]
    why: Lifting answers "can it be undone?", not "does it pay?". Linear prediction took the same cross-element structure without rounding the vector.
    sec: cost
---

Take the 81 integer points of a 9 × 9 patch of grid. Turn the patch by 45°. Round every point to the nearest integer point. You started with 81 different points; you end with 69. Twelve have vanished, each onto a spot already taken by another, and nothing done afterwards can tell those inputs apart. A rotation, the most reversible thing in geometry, has become lossy by rounding alone.

## Why rounding breaks a rotation {#rounding}

::: aside reminder Rotations and the KLT (II.15, II.16)
A [[rotation]] turns the axes without stretching anything. The [[klt|KLT]] is the rotation that lines the axes up with the directions in which the data spreads most, so the new coordinates are uncorrelated. The bits it saves are the [[transform-coding-gain]], ½ log₂ of the eigenvalues' AM over GM ([[#toolbox-klt]]).
:::

On real numbers a rotation is perfectly reversible. Our numbers are 8-bit codes, and [[lossless]] means the same integers must come back, so after rotating we round, and rounding is many-to-one: the rotated grid is tilted against the integer grid, some cells catch two points and others none.

::: figure fig-toolbox-lifting-grid mbLiftingGrid
**Rotating 81 integer points, two ways.** Grey dots: the input, a 9 × 9 patch of the integer grid. Hollow circles: where an exact, real-valued rotation by θ would put each input. Blue dots: the integer outputs; red dots: outputs shared by two inputs (information lost). *Rotate, then round* rounds the exact rotation. *Shear 1, 2, 3* show the three lifting steps one at a time; thin lines join each point's position before and after. The readout counts distinct outputs, checks that the lifted points undo exactly, and gives the largest distance (in grid steps) between a lifted point and its exact rotation. Slide the angle.
:::

::: try
1. With *rotate, then round* at 45°, count the red dots: 12 inputs are lost.
2. Try 10° and 80°: fewer collisions, but never reliably zero. A lossless stage cannot rely on luck.
3. Step through *shear 1 → 2 → 3*. Each step slides points along one axis only, and no two points ever collide.
4. Compare *shear 3* with the hollow circles: the lifted points sit within 0.77 of a step of the exact rotation at 45°, a slightly wrong rotation, exactly undoable.
:::

::: takeaway
- Rounding after a rotation merges points, and merged points cannot be separated: a float KLT plus rounding is lossy.
- A lossless rotation must be a one-to-one map from integers to integers.
:::

## Three shears {#shears}

A **shear** slides every point along one axis by an amount that depends only on the other coordinate:

$$
\vx_1 \leftarrow \vx_1 - \mathrm{round}\big(\underbrace{\tan\tfrac{\theta}{2}}_{\text{slope}}\;\vx_2\big)
\qquad\text{is undone by}\qquad
\vx_1 \leftarrow \vx_1 + \mathrm{round}\big(\tan\tfrac{\theta}{2}\;\vx_2\big),
$$ {#eq-toolbox-shear}

because the decoder knows $\vx_2$, which did not move, and so computes exactly the same rounded amount. Three shears make a rotation: by $-\tan\frac{\theta}{2}$ on $\vx_1$, by $\sin\theta$ on $\vx_2$, by $-\tan\frac{\theta}{2}$ on $\vx_1$ again. Here $\theta$ is only the toy's angle. Rounding inside each step makes the result a slightly wrong rotation, but a one-to-one map of integers, undone by running the steps backwards with the signs flipped.

Look at one shear again. "$\vx_1$ minus a rounded multiple of $\vx_2$" is a [[prediction]] of one coordinate from the other, and what is kept is the exact [[residual]]. [[lifting|Lifting]] is [[predictive-coding]] applied three times in a row; wavelet people call the steps *predict* and *update*. As a stage, the encode half is the forward shears and the decode half is the backward shears, with the basis (the slopes) in the dictionary and nothing in the delta.

```python the lifting stage on two furrows: a rotation by theta as three integer shears
import numpy as np

def encode(x1, x2, theta):                         # forward: three shears, each rounding what the decoder can recompute
    t, s = np.tan(theta / 2), np.sin(theta)
    x1 = x1 - np.round(t * x2)
    x2 = x2 + np.round(s * x1)
    x1 = x1 - np.round(t * x2)
    return x1, x2                                  # the rotated integer coordinates: what gets coded

def decode(x1, x2, theta):                         # backward: the same steps, reversed, signs flipped
    t, s = np.tan(theta / 2), np.sin(theta)
    x1 = x1 + np.round(t * x2)
    x2 = x2 - np.round(s * x1)
    x1 = x1 + np.round(t * x2)
    return x1, x2

def bits(v):                                       # order-0 entropy of an integer stream
    _, n = np.unique(v, return_counts=True); p = n / n.sum()
    return -(p * np.log2(p)).sum()

rng = np.random.default_rng(1)
low  = np.round(rng.normal(115, 30, 20000))         # a mast thermometer, tenths of a degree
high = np.round(low - 8 + rng.normal(0, 4, 20000))   # the one higher up: same weather, small offset
a, d = encode(low, high, -np.pi / 4)                 # turn the axes by 45 degrees
assert all(np.array_equal(u, v) for u, v in zip(decode(a, d, -np.pi / 4), (low, high)))
print(f"as measured: {(bits(low) + bits(high)) / 2:.2f} bits per value")   # 6.94
print(f"lifted:      {(bits(a) + bits(d)) / 2:.2f} bits per value")        # 5.49
```

The round trip is exact, and the saving is 1.45 bits per value. The transform coding gain of this pair, from its two eigenvalues (about 1808 and 8), is ½ log₂(908 / 120) ≈ 1.46 bits: here the rounding inside the shears cost almost nothing, because both spreads are many grid steps wide. For a $\vd \times \vd$ rotation, Hao and Shi (2001) and the later PLUS factorization do the same with a few triangular steps ([[#papers-classics]]).

::: theme predict-correct
A lossless rotation is a chain of predict-then-correct steps, each predicting one coordinate from the ones that stay put.
:::

::: takeaway
- A shear moves one coordinate by a rounded amount computed from the other; the decoder recomputes it and undoes it exactly.
- Three shears make a 2-D rotation; the thermometer toy keeps 1.45 of the 1.46 bits the formula promises.
:::

## What it costs, and what the campaigns found {#cost}

Lifting makes the KLT stage *legitimate*: a lossless compressor may use it. It does not make it cheap, and it does not make it free of rounding.

| cost | full KLT, $\vd = 512$ | rank-16 basis | furrow statistics |
|---|---|---|---|
| dictionary weight $\vw$ | $2\vd = 1024$ cherries' worth | 32 | about 2 |
| arithmetic per decoded cherry | about $\vd^2 \approx 262\,000$ multiply-adds | about $16\vd \approx 8\,000$ | 512 additions |
| affordable scope | sequence or global ([[#scenario-scope]]) | stretch, from $\vb \approx 1\,000$ | any |

Two smaller catches. Rotated integers need a little more room than the inputs (two 8-bit codes can rotate into a 9-bit range; per-coordinate widths absorb it). And on E4M3 codes a lifted rotation rotates *indices* of a logarithmic grid: still exact, but what it decorrelates is the indices, not the values ([[#toolbox-bit-fields]]).

The campaigns never built a lifted rotation, and the reason is on [[#measured-codebooks-and-rotations]]. Before any shears were written, code-length estimates of three fixed rotations (DCT, Hadamard, random) on two heads of the Bench's values lost **0.28 to 0.32 bit per element** at every quantisation step. About a quarter of that is the price of rounding a rotated vector at all: the lattice constant, 0.2546 bit per coordinate, measured 0.29 to 0.32. Lifting makes that rounding reversible; it does not make it free, and on values whose residuals are a few grid steps wide it is paid in full, unlike in the thermometer toy. The cross-element structure the rotation was meant to catch went to [[#toolbox-linear-prediction]], which subtracts a guess and never rounds the vector. So the stage stays on the shelf, with a clear condition for taking it down: a spectrum, at a scope that can afford the basis, whose gain beats the light predictors by more than a quarter of a bit ([[#toolbox-bounds]]).

::: aside source Receipts
Fixed rotations and the lattice constant: r11 iter-1-1 (exact model, L3 h0 and L11 h0); PART-XI-SPEC §1.7 and the scorecard row "the rounding tax was missed" (§1.12). The thermometer numbers: the listing above, seeded.
:::

::: takeaway
- A full lossless KLT costs about $\vd^2$ arithmetic per decoded cherry and a $2\vd$-cherry dictionary: sequence scope only.
- On the Bench every rotation lost by more than the rounding tax; lifting is built only if a spectrum says it will pay.
:::
