---
title: "Framework A: bits versus distance"
nav: "A · bits versus distance"
lede: The prospector's routine for Q1. Hand the coder a neighbour Δ tokens back, count the bits it saves, and repeat for every Δ from 1 to 32K. One curve per layer, for keys and for values.
cards:
  - q: In framework A, what is varied?
    a: The token distance Δ to the neighbour (and, in a second pass, the neighbour's axis — one layer down)
    wrong: ["The block size b", "The number of resident dictionaries", "The link bandwidth"]
    why: Framework A holds the data, format, predictor and accounting fixed, and sweeps Δ = 1, 2, 4 … 32K.
    sec: setup
  - q: Why is the curve framework A measures a lower bound on the information a neighbour carries?
    a: It uses a cheap (affine or low-rank) predictor; a cleverer one could extract more
    wrong: ["Because it uses the fixed-length rate", "Because the shuffle control subtracts from it", "Because 8-bit codes are lossy"]
    why: 'Bits saved by a particular predictor ≤ the mutual information per element. A flat curve says a cheap dictionary cannot use the neighbour, not that the neighbour is useless to every coder.'
    sec: setup
  - q: The bits-saved curve decays with Δ and halves around Δ ≈ 350 tokens. What does that suggest?
    a: Fallen-apple similarity, with a natural block scale of a few hundred tokens
    wrong: ["Per-request structure only", "No usable structure", "That the shuffle control failed"]
    why: A curve that fades with distance is the signature of local similarity; where it fades sets the block size.
    sec: shapes
  - q: What must happen to the distance curve after tokens are shuffled across sequences?
    a: It must drop to (nearly) zero at every Δ
    wrong: ["It must stay the same", "It must rise, because shuffling adds noise", "It must decay faster"]
    why: Shuffling destroys every neighbour relationship. A gain that survives the shuffle is a bug, not similarity.
    sec: shapes
---

On [[#questions-two-kinds]] a prospector panned gravel at 10 metres, 100 metres and a kilometre from the ridge, and read the grade against distance. Framework A is the same routine for KV entries. The "grade" is bits saved, and the "distance" is how many tokens back the neighbour sits.

## The set-up {#setup}

::::: cols
::: col Varied
- the token distance $\vgap$ = 1, 2, 4, … 32K
- in a second pass, the neighbour's axis: the same token one [[layer]] down ([[upstairs]])
- the layer, and keys versus values
:::
::: col Held fixed
- the dataset and its 8-bit format
- the predictor: per-channel affine, then low-rank linear
- the accounting: exact integer residual, entropy rate, minus the [[solo]] rate
:::
::: col Measured
- bits saved per element at each $\vgap$
- one curve per (layer, keys or values)
- the same curve after a [[shuffle-control|shuffle]]
:::
:::::

For each $\vgap$, fit the best cheap [[prediction|predictor]] of entry $\vE_{\vt}$ from entry $\vE_{\vt-\vgap}$, take the exact [[residual]], and ask how much cheaper it is than coding $\vE_{\vt}$ alone:

$$
\underbrace{\text{rate}_{\text{solo}} - \text{rate}\big(\vE_{\vt} \text{ given } \vE_{\vt-\vgap}\big)}_{\text{bits saved per element, measured}} \;\le\; \underbrace{\tfrac{1}{\vd}\, \vI\big(\vE_{\vt};\, \vE_{\vt-\vgap}\big)}_{\text{all the neighbour could ever save}}
$$ {#eq-questions-distance}

The inequality is honest bookkeeping. The measured curve uses a cheap predictor, so it is a lower bound on the [[mutual-information]]. A flat curve tells us that a cheap dictionary cannot use the neighbour. It does not prove that no coder could. That is the right question anyway: the miss path can only afford cheap dictionaries.

::: aside reminder The exchange rate
For bell-shaped data, a predictor that explains a fraction $\vRsq$ of the variance saves $\tfrac12\log_2\frac{1}{1-\vRsq}$ bits per element ([[#school-exchange-rate]]). For a single neighbour and an affine predictor, $\vRsq$ is the squared correlation.
:::

Here is the measurement in miniature: one toy channel, 64 toy requests of 4,096 tokens. Each value is a per-request mean (10 % of the variance), a slowly drifting local part (75 %, forgetting with a length of 512 tokens) and noise (15 %).

```python framework A on one toy channel (numpy)
import numpy as np
rng = np.random.default_rng(0)
R, T, lam = 64, 4096, 512                 # requests, tokens per request, decay length
s_req, s_loc, s_noise = 0.10, 0.75, 0.15  # shares of one channel's variance
phi = np.exp(-1 / lam)

def local_part(n):                        # AR(1): variance 1, correlation exp(-gap/lam)
    a = np.empty(n); a[0] = rng.standard_normal()
    for t in range(1, n):
        a[t] = phi * a[t - 1] + np.sqrt(1 - phi**2) * rng.standard_normal()
    return a

x = np.stack([np.sqrt(s_req) * rng.standard_normal()          # this request's own mean
              + np.sqrt(s_loc) * local_part(T)                # slowly drifting local part
              + np.sqrt(s_noise) * rng.standard_normal(T)     # noise nobody can predict
              for _ in range(R)])

def bits_saved(x, gap):                   # best affine predictor from the neighbour gap tokens back
    r = np.corrcoef(x[:, gap:].ravel(), x[:, :-gap].ravel())[0, 1]
    return 0.5 * np.log2(1 / (1 - r**2))  # the exchange rate of II.12

shuffled = rng.permutation(x.ravel()).reshape(x.shape)        # the shuffle control
for gap in (1, 16, 256, 2048):
    print(f"gap {gap:5d}: {bits_saved(x, gap):.2f} bit   shuffled: {bits_saved(shuffled, gap):.2f} bit")
```

It prints 0.94, 0.85, 0.29 and 0.01 bit for gaps of 1, 16, 256 and 2048 tokens, and 0.00 at every gap after shuffling. The figure below draws the same model from its formula (0.92 bit at $\vgap = 1$); the simulation lands within a few hundredths of it. The real measurement does this per channel on exact 8-bit codes and averages; the float-domain shortcut of [[#plan-experiment-1a]] does exactly this computation on real KV in about an hour.

::: takeaway
- Vary $\vgap$; hold data, format, predictor and accounting fixed; measure bits saved per element.
- The curve is a lower bound on the mutual information: what a *cheap* dictionary could use.
- Ten lines of numpy reproduce the method on a toy channel.
:::

## Three shapes, three meanings {#shapes}

Before any real data, here are the three shapes the curve could take, each from a toy world built to produce it.

::: figure fig-questions-distance qDistance
**Bits saved by a neighbour against token distance** (schematic: a toy channel model, no KV data). Horizontal axis: token distance $\vgap$ to the neighbour, log scale from 1 to 32K. Vertical axis: bits saved per element by the best affine predictor, $\tfrac12\log_2\frac{1}{1-c^2}$, where the correlation is $c$ = (request share) + (local share) × $e^{-\vgap/\text{decay length}}$. Dashed: three preset worlds — fallen-apple (10 % request, 75 % local, decay length 512), per-request (60 % request, nothing local) and nothing (all noise). Dotted at zero: every world after shuffling tokens across sequences. Bold: the world set by the sliders. Choose a preset, then move the sliders; the vertical rule marks where the local part has halved, and the readout names the shape.
:::

::: try
1. Start in the fallen-apple world. The curve starts near 0.9 bit and has almost vanished by 4K tokens. The rule marks the half-way point, about 355 tokens: a natural block size.
2. Switch to the per-request world. The curve is flat: a neighbour 30,000 tokens back helps as much as the token next door. Per-request dictionaries, not block ones.
3. In the fallen-apple world, drag the local share down to 30 %. The curve sinks to about 0.1 bit: the harsh exchange rate at work. Neighbour similarity has to be strong to be worth much.
:::

The three shapes, and what each would mean:

- **Fading, high at small $\vgap$** — [[fallen-apple]] similarity. Its fading length is the natural block scale, read off the data instead of assumed ([[#missed-block-is-a-knob]]).
- **Flat but positive** — structure that the whole request shares, or that all requests share. Informative for [[scope]]: per-request or global dictionaries.
- **Flat at zero** — entries are not mutually predictable at 8 bits, for a cheap predictor. A negative Q1, and a publishable one.

::: theme controls
The dotted line at zero is the shuffle control. After permuting tokens across all sequences, any gain that depends on neighbours being neighbours must vanish. A real curve must stand clearly above it; a gain that survives the shuffle is a bug.
:::

Two limits to keep in mind.

- **It is not the system measurement.** It charges no dictionary bytes and ignores the access pattern. That is framework B's job ([[#questions-framework-b]]).
- **It is cheap, and that is its point.** It is the fastest and most direct look at Q1, and it runs before any coder exists.

The same machine with the neighbour one floor down measures upstairs similarity; other neighbours and splits are parked on [[#questions-parked-measurements]].

::: takeaway
- Fading curve: fallen-apple similarity, and the block size to use. Flat positive: request-wide structure. Flat zero: no usable similarity.
- The shuffled curve must sit at zero; the real one must stand above it.
- Framework A answers Q1 directly; it charges no dictionary costs.
:::
