---
title: "Framework B: the compressibility curve and its roofline"
nav: "B · the curve and its roofline"
lede: Comparing coders by a single compression ratio is like comparing cars by top speed. Framework B compares them by a trade-off curve — delta size against dictionary cost — and asks how low the best of them can go.
cards:
  - q: What are the two coordinates of a point on the compressibility curve?
    a: Dictionary cost per entry (w/b, in entries' worth) and delta size per entry (the delta ratio ρ)
    wrong: ["Compression ratio and decode speed", "Block size and miss rate", "Bits per element and token distance"]
    why: Each setting of each algorithm, at one block size, lands at one (w/b, ρ) point. Their sum is the total storage per entry.
    sec: curve
  - q: Where do HiSparse today and solo coding sit on the curve's plane?
    a: 'HiSparse at (0, 1); solo coding at (0, ≈ 0.78) with an ideal coder, (0, ≈ 0.88) fixed-length'
    wrong: ["Both at (1, 0)", "HiSparse at (0, 0.78), solo at (0, 1)", "They cannot be placed: they have no dictionary"]
    why: Neither has a dictionary (x = 0). Raw entries are ρ = 1; a global context-free code is about 6.2 bits of 8 ideally, about 7 fixed-length.
    sec: curve
  - q: What is the roofline?
    a: The lower envelope of all the curves — the smallest delta any tried coder reaches at each dictionary budget
    wrong: ["The upper bound on the miss rate", "The fastest coder's curve", "The line ρ = 1"]
    why: It is the practical, operational form of fallen-apple similarity at block scale. Theory says where it cannot go; the measurement says where it does go.
    sec: roofline
  - q: The roofline hugs the solo line everywhere. What is the verdict?
    a: The block idea is dead; report the negative measurement and use context-free coding on the miss path
    wrong: ["Heavy dictionaries are needed", "Lever 1 is alive with light dictionaries", "Q3 decides everything"]
    why: No coder, at any dictionary cost, does better than coding each entry alone.
    sec: roofline
  - q: Why is framework B a machine for searching rather than a single experiment?
    a: The space of coders is large, and a fixed interface and score let any new coder be placed on the same plot
    wrong: ["Because the answer is already known from theory", "Because only one coder can be lossless", "Because it measures requests per GPU"]
    why: VQ variants, transforms, rate allocation, residual coders — nobody can pick the winner from an armchair. One interface, one score, four controls.
    sec: machine
---

Imagine a contest of coders, each claiming a compression ratio. One says 1.6×; it turns out it used a codebook of 4,096 centroids and did not count it. Another says 1.3× with a dictionary of two numbers per channel. Which is better? It depends on the block the dictionary is shared by, on whether the dictionary must sit on the GPU, on whether its deltas are fixed-length. A single ratio hides all of that.

Framework B replaces the single number by a curve.

## The curve {#curve}

::: define curve
- **What it is.** For one dictionary algorithm at one [[block]] size $\vb$, the set of points (dictionary cost per entry, delta size per entry) it reaches as its settings vary — the number of centroids, the rank of a basis, the width of a fixed-length code.
- **The axes.** Horizontal: dictionary cost per entry, $\vw/\vb$ in entries' worth ($8\vw/\vb$ in bits per element). Vertical: the [[delta-ratio]] $\vrho = \vdsz/\ve$. Their sum is total storage per entry.
- **The trade.** A bigger dictionary buys smaller deltas, up to a point. Left is cheaper dictionaries; down is smaller deltas.
- **Easy to confuse with** a single number. The number we report is the curve's best point *under the system's constraints*, and that point moves with the hardware.
:::

Two points on the plane need no experiment, because they have no dictionary.

- **HiSparse today** is $(0, 1)$: raw entries.
- **[[solo|Solo coding]]** is $(0, \approx 0.78)$ with an ideal coder, $(0, \approx 0.88)$ with a fixed-length code ([[#homework-solo-coding]]).

A dictionary pays for itself only where its total, dictionary plus delta, is below solo: under the line $\vrho = \vrho_{\text{solo}} - \vw/\vb$. On a log axis that line is almost flat for light dictionaries and plunges as the dictionary cost approaches the whole solo budget.

::: aside reminder Amortization
A dictionary of [[weight]] $\vw$ entries shared by $\vb$ entries costs $\vw/\vb$ of an entry each, or $8\vw/\vb$ bits per element ([[#homework-amortization-rule]]). Bigger blocks slide every dictionary to the left.
:::

::: figure fig-questions-curve qCurve wide
**The compressibility curve** (schematic: invented point clouds, no data yet). Horizontal axis: dictionary cost per entry $\vw/\vb$ in entries' worth, log scale, with "0" (no dictionary) drawn left of the break. Vertical axis: delta ratio $\vrho$. Dots: settings of four dictionary families at block size $\vb$ — [[loc]] (location, location + scale), [[klt]] (rank 4–64, and the full basis as a bound), [[vq]] (16–4,096 centroids; its index is charged to the delta) and [[sib]] (no dictionary bytes; a pointer in the delta). Their positions come from a made-up model loosely shaped after the Monte Carlo of [[#homework-vq]]. Dashed rules: raw entries ($\vrho = 1$) and solo coding. Green band: points whose dictionary + delta beats solo. Gold staircase: the roofline, the best $\vrho$ reached at each dictionary budget. Switch the kind of data, the rate (fixed-length = ideal + 13 %, assumed), and the block size; hover a dot for its numbers.
:::

::: try
1. In the correlated world, look for the lowest dot. It is a rank-64 or full KLT; VQ never gets below it, because on bell-shaped data a codebook is a taxed way to get what a rotation gets for free.
2. Switch to clustered data. Now the big codebooks drop far below everything else — but only at large dictionary cost. Shrink the block to 512 and watch them slide right, past the edge of the green band.
3. Switch to "no structure". Every dictionary sits on or above the solo line; sib rises well above it, because the difference of two noisy entries is twice as noisy. The roofline is a flat line at solo.
:::

::: takeaway
- The curve plots, for each coder and setting, delta size $\vrho$ against dictionary cost $\vw/\vb$; their sum is total storage.
- Landmarks: HiSparse $(0, 1)$, solo $(0, \approx 0.78)$ ideal or $(0, \approx 0.88)$ fixed-length.
- A dictionary pays only below the line $\vrho_{\text{solo}} - \vw/\vb$.
:::

## The roofline {#roofline}

Draw every coder, every setting and every block size on one plane. Then, at each dictionary budget, take the lowest delta any of them reaches. That staircase is the [[=roofline]]: the best trade-off between dictionary cost and delta size that the data allows *any* coder we have tried.

The name is borrowed from performance engineering, where a roofline bounds what a program can achieve. Here smaller is better, so our roofline is a floor. It is the practical, operational form of [[fallen-apple]] similarity at block scale. Theory says where it cannot go: the codebook break-even and the rotation bound of [[#homework-four-side-by-side]]. The measurement says where it does go.

Three shapes, written down before the data:

| roofline shape | reading | next |
|---|---|---|
| well below solo at small dictionary cost | cheap types (loc, low rank) capture the gain | lever 1 is alive with light dictionaries; residency is easy |
| below solo only at large dictionary cost | the data is clustered; only heavy dictionaries help | the outcome hinges on Q3 ([[#questions-q3]]) |
| hugging the solo line | no usable conditional structure for any coder tried | the block idea is dead: a negative measurement, and context-free coding on the miss path |

::: theme amortize
The horizontal axis *is* amortization: dictionary bytes divided by the entries that share them. Doubling the block halves every dictionary's cost and slides its whole cloud left — until the block outgrows the stretch of tokens over which entries are alike.
:::

::: takeaway
- The roofline is the lower envelope of all curves: the best delta at each dictionary budget.
- Its shape answers Q2: cheap and low, heavy only, or nothing.
- It is a floor, despite the name; theory bounds it, the measurement finds it.
:::

## A machine, not an answer {#machine}

Framework B is built as a machine because the space of coders is large: codebooks and product codebooks, rotations and learned decorrelations, rate allocation across channels, different residual coders. Nobody can pick the winner from an armchair. The machine is the measuring program of [[#plan-harness-interface]], and it is deliberately strict.

1. **One interface.** An algorithm takes all entries of one block at one layer, returns one dictionary and one delta per entry, and must rebuild every entry bit-exactly from (dictionary, delta).
2. **One accounting rule.** Every byte of dictionary, side channel and residual is charged, by the same rule for every rung ([[#plan-accounting]]).
3. **Four controls.** Synthetic data with a known answer, the shuffle, scope consistency, and a real round trip ([[#plan-controls]]).
4. **One plot.** Every algorithm becomes a cloud of points on the same plane.

Because the interface and the score are fixed, the search can even be automated: propose a coder, score it, read the curve, propose the next. Whether that would find anything the napkin did not predict is parked on [[#questions-parked-automation]].

::: takeaway
- Framework B is the measuring program: one interface, one accounting rule, four controls, one plot.
- Coders are compared by their curves, never by a ratio at an arbitrary setting.
- The fixed interface makes an automated search possible.
:::
