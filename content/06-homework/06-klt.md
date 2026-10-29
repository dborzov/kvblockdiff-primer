---
title: 'KLT: the Compass, at work'
nav: 'KLT: the Compass, at work'
group: Four dictionaries
lede: 'In Part II the KLT turned two thermometers into an average and a difference. As a dictionary for KV it does the same in 640 dimensions: it stores a rotation and codes each entry along the data''s own axes. It pays off only when a few axes hold almost everything — and its basis is heavy.'
cards:
  - q: How much does a full KLT basis weigh for entries of d elements, stored in BF16?
    a: 2d entries' worth (d × d numbers at 2 bytes each)
    wrong: ["2 entries' worth", "d entries' worth", "log₂ d bits per entry"]
    why: 'An entry is $\vd$ bytes at 8 bits per element; a $\vd \times \vd$ matrix in BF16 is $2\vd^2$ bytes $= 2\vd$ entries. For $\vd = 640$ that is $\vw = 1280$; a rank-16 partial basis is $\vw = 32$.'
    sec: dictionary
  - q: 'What does a KLT save per element on bell-shaped data, before costs?'
    a: '½ log₂ (AM/GM) of the eigenvalues of the standardized covariance'
    wrong: ["½ log₂ of the largest eigenvalue", "The number of eigenvalues above 1", "log₂ d bits"]
    why: The transform coding gain of II.16. AM/GM is 1 for a flat spectrum (no gain) and grows only when a few directions dominate.
    sec: gain
  - q: '64 standardized channels: 8 directions with variance 10, the other 56 with variance 1. The KLT gain is about…'
    a: 0.34 bit per element
    wrong: ["3 bits per element", "1 bit per element", "0.03 bit per element"]
    why: 'AM = (80 + 56)/64 = 2.125; GM = 10^(8/64) = 1.33; ½ log₂(2.125/1.33) = 0.34. "Low-rank-ish" is not enough.'
    sec: gain
  - q: 'On the synthetic low-rank world (d = 64, b = 4096), the KLT gained 0.51 bit but netted only 0.26. Why?'
    a: Its full basis, charged to one block, cost 0.25 bit per element
    wrong: ["Its per-entry tax ate the gain", "The rotation is lossy", "k-means overfitted"]
    why: '$8\vw/\vb$ with $\vw = 2\vd + 1 = 129$ and $\vb = 4096$ is 0.25. Fit once per request or globally, the same basis would cost almost nothing.'
    sec: gain
---

Two thermometers on the Gull Rock mast read almost the same thing. In [[#school-rotation]] we turned their axes: one new axis along "both go up together" (their average), one along "they disagree" (their difference). Nearly all the spread lived on the first axis; the second carried a little noise. Coding the two new numbers cost less than coding the two old ones.

::: dataset fig-hwa-thermo thermo-axes view=cloud,timeline metrics=lambdas,bits
**The two thermometers, turned (from II.15).** *The cloud, turned:* each of the 480 readings of the ten days, centred and measured along the cloud's own axes: "how warm" (along, horizontal) against "how much they disagree" (across, vertical), in °C, with equal units. *Along and across:* the same two coordinates over the ten days. The Numbers tab gives the spread along each axis — the two eigenvalues — and the bits per reading before and after turning. Synthetic, seeded data.
:::

The cloud lies flat: one eigenvalue is about 235 times the other. Those two numbers are all the Compass needs to know. Their arithmetic average is 2.97 and their geometric average 0.38, and the formula of the next section turns that ratio into about 1.5 bits per element — the three bits per reading the card counts, shared by two thermometers.

A key vector of a language model has hundreds of channels instead of two. If some of them move together, the same trick applies — with a 640-by-640 rotation instead of a 2-by-2 one.

## The Compass as a dictionary {#dictionary}

::: aside reminder KLT, eigenvalues and lifting (II.15, II.16)
- [[klt]]: rotate the axes to the directions along which the data spreads most (the same as [[pca]]). The spread along each new axis is an [[eigenvalue]] $\vlambda$ of the [[covariance-matrix]] ([[#school-rotation]]).
- [[transform-coding-gain]]: the bits a rotation saves, $\tfrac12\log_2$ of [[am-gm|AM/GM]] of the eigenvalues ([[#school-coding-gain]]).
- [[lifting]]: a rotation in floating point followed by rounding is not lossless. Lifting splits it into integer steps that can be undone exactly.
:::

As a dictionary, the Compass is a rotation the receiver holds.

- **What it stores:** an orthogonal basis — a $\vd \times \vd$ matrix — plus each channel's location, since the data is centred before it is rotated. (So the Compass contains an Anchor.)
- **Weight:** in BF16 the basis is $2\vd^2$ bytes. An entry is $\vd$ bytes at 8 bits per element, so $\vw = 2\vd$. For our entries, $\vd = 640$ and $\vw = 1280$. The source draft's example, $\vd = 2048$, gives $\vw = 4096$.
- **A lighter version:** keep only the 16 strongest directions. Then $\vw = 2 \times 16 = 32$.
- **Per-entry tax:** none for the full basis — the $\vd$ rotated coordinates *replace* the entry. The partial basis pays one: the entry's 16 coefficients along the kept directions must be stored with it, on top of the residual of all $\vd$ elements.
- **Losslessness:** only through an integer-reversible (lifted) rotation. The first experiment ([[#plan-experiment-1a]]) does not build one. They compute what it could save from the spectrum, which decides whether building it is worth anything.

| version | weight $\vw$ ($\vd = 640$) | per-entry tax | dictionary cost at $\vb = 4096$ |
|:---|---:|:---|---:|
| full basis | 1280 | none | 2.5 bits per element |
| rank 16 | 32 | 16 coefficients | 0.06 bit per element (+ the coefficients) |

Look at the last column. Charged to a single block of 4096 entries, a full 640-dimensional basis costs **2.5 bits per element** — more than any plausible gain. A full KLT is only ever affordable when it is shared by a whole request or by all requests ([[#homework-amortization-rule]]).

::: theme amortize
Here the theme decides where a dictionary may live. The Compass's basis is the heaviest dictionary of the four. Spread over one block it costs more than it can save; spread over a request of 100K tokens, or fit once for all requests, it is nearly free. What the basis buys is the same in all three cases; only the number of entries sharing its price changes.
:::

::: takeaway
- The KLT stores a rotation (plus channel locations): $\vw = 2\vd$ in BF16, 1280 for $\vd = 640$; rank 16 is $\vw = 32$.
- A full basis has no per-entry tax; a partial one pays its coefficients on every entry.
- A full basis per block is unaffordable; per request or global, it is cheap.
:::

## What it buys: a spiky spectrum {#gain}

Two spectra of 64 standardized channels (each channel scaled to variance 1 first, so the spectrum has mean 1):

- **Mildly low-rank:** 8 directions with variance 10, the other 56 with variance 1. Gain: **0.34 bit** per element.
- **Sharply low-rank:** 8 directions with variance 50, the other 56 with 0.1. Gain: **2.43 bits** per element. (The source draft says "≈ 2.3"; the formula gives 2.43.)

The difference is not how many directions are strong; it is how *weak* the rest are. The formula says why:

$$
\vgain_{\text{KLT}} \;=\; \frac12 \log_2 \frac{\overbrace{\tfrac{1}{\vd}\textstyle\sum_{\vi} \vlambda_{\vi}}^{\text{AM: average spread}}}{\underbrace{\big(\textstyle\prod_{\vi} \vlambda_{\vi}\big)^{1/\vd}}_{\text{GM: geometric average}}}
$$ {#eq-hwa-klt}

The $\vlambda_{\vi}$ are the eigenvalues of the covariance of the **standardized** channels. Standardizing first matters: each channel's own spread is already paid for by the Hermit's per-channel code, so only correlation *between* channels counts. The geometric average is dragged down by the small eigenvalues, so the gain is large only when most directions carry almost nothing.

::: figure fig-hwa-klt hwaKltSpectrum
**The spectrum decides the KLT's gain.** Bars: the 64 eigenvalues of a toy standardized covariance, sorted, on a logarithmic axis — some strong directions (count and variance set by the sliders) and the rest weak (variance set by the third slider). Lines: the arithmetic average (AM) and the geometric average (GM). The tiles give the gain $\tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$ in bits per element, and the block size $\vb$ above which a full basis pays for itself ($8\vw/\vb$ below the gain), for $\vd = 64$ and for the same spectrum shape at $\vd = 640$. Illustrative spectra; Gaussian data assumed.
:::

::: try
1. Set 8 strong directions at variance 10 and the weak ones at 1: 0.34 bit.
2. Raise the strong variance to 50 and lower the weak one to 0.1: 2.43 bits.
3. Now keep the weak ones at 1 and push the strong ones to 100. The gain stops near 1.5 bits, below the 50-against-0.1 spectrum: strong directions alone do not make a spiky spectrum, weak ones do.
:::

**When the Compass wins:** when the standardized spectrum is sharply spiky — a few directions with almost all the spread, the rest near zero. Keys are often reported to look low-rank across tokens ([[#papers-kvtc]] builds lossy transform coding on it); whether they are *sharply* low-rank at 8 bits, after standardizing, is what the spectrum measurement of [[#plan-experiment-1a]] tests.

**When it loses:** on a flat spectrum (nothing to gain), and whenever its basis must be paid by too few entries. On the synthetic low-rank world of [[#homework-four-side-by-side]] (rank-8 signal, $\vd = 64$, $\vb = 4096$) the measured gain was **0.51 bit** per element; the basis charged to the block cost 0.25, leaving **0.26**. With the basis shared more widely it would net almost the full 0.51.

::: takeaway
- $\vgain_{\text{KLT}} = \tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$ of the standardized eigenvalues: large only for a sharply spiky spectrum.
- "Low-rank-ish" (8 directions at 10, the rest at 1) is worth 0.34 bit; sharply low-rank (50 against 0.1) is worth 2.4.
- The basis is heavy, so the KLT belongs to requests or the whole model, not to single blocks.
:::
