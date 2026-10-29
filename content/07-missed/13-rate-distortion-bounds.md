---
title: Bounds before building
nav: Bounds before building
group: Fields and tools to think with
lede: Two numbers decide whether a dictionary type is worth writing — the KLT's coding gain and the codebook's break-even. Both follow from a spectrum and an index cost, in an hour, before any coder exists. The harness then confirms them instead of discovering them.
cards:
  - q: What is the KLT gain of a perfectly flat spectrum (all eigenvalues equal)?
    a: Zero — AM equals GM, so rotating buys nothing
    wrong: ["One bit per element", "Half a bit per element", "It depends on the number of dimensions"]
    why: 'The gain is ½ log₂(AM/GM), and for equal eigenvalues AM = GM. Rotation helps only when the spread is uneven.'
    sec: spectrum
  - q: 64 directions, 8 with variance 10 and 56 with variance 1. About how many bits per element can a rotation save?
    a: About 0.34
    wrong: ["About 2.4", "About 1.0", "About 0.05"]
    why: 'AM = 136/64 = 2.13, GM = 10^(8/64) = 1.33; ½ log₂(1.59) = 0.34. "Low-rank-ish" is not enough; the spectrum must be sharply spiky.'
    sec: spectrum
  - q: A codebook of 256 centroids for 64-element vectors pays what index tax per element?
    a: 0.125 bit
    wrong: ["8 bits", "1 bit", "0.0039 bit"]
    why: 'log₂ 256 = 8 bits per vector, spread over 64 elements. On Gaussian data that is also the most the centroid can save beyond a rotation.'
    sec: vq
  - q: When can vector quantization beat the rate–distortion bound computed for Gaussian data?
    a: When the data is genuinely clustered, which a Gaussian model cannot describe
    wrong: ["When the codebook is large enough", "When product quantization is used", "Never, under any data"]
    why: The bound is a statement about Gaussian data. In the old draft's Monte Carlo, 32 real clusters let VQ net +1.5 bits where a rotation got +0.68.
    sec: vq
  - q: What does the one-hour experiment 1a compute?
    a: Grid-free bounds from the float data — the distance curve's R² in bits, the location gain and the KLT gain — with a shuffle control
    wrong: ["The exact lossless rates on E4M3 codes", "Requests per GPU from a trace replay", "A trained VQ codebook per block"]
    why: Bounds first; the exact ladder (1b) follows either way, because the 8-bit grid can take back part of what floats promise.
    sec: plan
---

In 1824 Sadi Carnot worked out the best efficiency *any* heat engine could reach, from nothing but two temperatures. After that, an engineer did not build a steam engine to find out whether 90 % efficiency was possible. They checked the limit first.

Lossless coding has limits of the same kind, and they are cheap to compute. The first draft planned to build codebooks and see what they bought ("VQ, then entropy-code the error"). The limits could have told it the answer in advance.

::: note history What the first draft did not use
Item 12 of the old list: *rate–distortion gives bounds before building. The VQ break-even and the KLT gain are computed from spectra and index costs; the harness confirms rather than discovers them.* [[#missed-vq-then-code]] corrected the VQ plan itself; this page is about the habit.
:::

## A spectrum in, a number out {#spectrum}

::: aside reminder The transform coding gain
Rotating data to its [[klt|KLT]] axes makes the coordinates uncorrelated. Their [[variance|variances]] are the [[eigenvalue|eigenvalues]] $\vlambda$. For bell-shaped data the bits saved per element are ½ log₂ of the eigenvalues' arithmetic mean over their geometric mean ([[#school-coding-gain]]).
:::

$$
\underbrace{\tfrac12 \log_2 \frac{\mathrm{AM}(\vlambda)}{\mathrm{GM}(\vlambda)}}_{\text{bits per element a rotation saves}}
\;=\; -\tfrac12 \cdot \underbrace{\text{average of } \log_2 \vlambda}_{\text{after standardizing, so } \mathrm{AM} = 1}
$$ {#eq-missed-klt-bound}

The recipe has three steps. [[standardize|Standardize]] each [[channel]] of a block, compute the [[covariance-matrix]], and take its eigenvalues. No coder, no 8-bit grid, no rounding. The figure does the arithmetic for a family of spectra: a few strong directions holding a share of the variance, the rest sharing what is left.

::: figure fig-missed-spectrum mbBoundsSpectrum
**From a spectrum to a bound.** *Left:* the 64 eigenvalues of a standardized covariance (log scale; their average is 1), largest first: the chosen number of strong directions share the chosen fraction of the total variance equally, and the remaining directions share the rest. *Right:* the KLT gain ½ log₂(AM/GM) in bits per element as that fraction varies, for the current number of strong directions; the dot is the current spectrum. The two dashed lines are experiment 1a's thresholds ([[#plan-experiment-1a]]). The buttons load the old draft's two worked examples and a flat spectrum. Gaussian data assumed.
:::

::: try
1. Load *example A* (8 directions at 10, 56 at 1). The gain is 0.34 bit: just above 1a's "trouble" line, far below its "pulse" line.
2. Load *example B* (8 at 50, 56 at 0.1). Now 2.43 bits. Most of the variance in a few directions *and* almost nothing elsewhere: that is what "sharply low-rank" means.
3. Keep 8 strong directions and slide their share: 0.23 bit at 50 %, 0.76 at 80 %, 1.62 at 95 %. Each extra bit needs the weak directions squeezed much harder.
:::

The old draft rounded example B to "≈ 2.3"; the formula gives 2.43. The lesson does not change. A spectrum that merely *looks* low-rank on a plot is worth a few tenths of a bit; a gain worth building a lossless rotation for needs most of the variance in a few directions and almost none in the rest.

The recipe takes one look at real-looking data. The five channels of the ten days at Gull Rock ([[#school-correlation]]) give a five-number spectrum.

::: dataset fig-missed-tendays-spectrum missed-spectrum view=spectrum,bound,mix metrics=lambdas,top2,gain,last
**The spectrum of the ten days at Gull Rock.** Each channel (both thermometers, humidity, pressure, wind) is standardized, and the eigenvalues of their 5 × 5 covariance are the variances along the cloud's own axes. *Plot:* "The spectrum" shows the five eigenvalues, largest first, on a log scale; their average is 1. "What each adds to the bound" splits ½ log₂(AM/GM) into one term per direction, $-\tfrac12 \log_2 \vlambda / 5$. "Which channels each mixes" writes each direction as weights on the five channels (blue positive, red negative). *Table:* the five directions. *Numbers:* the spectrum and the bound. Synthetic, seeded data from II.14.
:::

Two directions hold 86 % of the variance, and the spectrum looks low-rank. Yet they count *against* the bound. The bound is 0.77 bit per element, and 0.69 of it comes from one direction that is almost empty: the two thermometers disagreeing. The ceiling is set by what is missing, not by what is there.

::: takeaway
- The most any rotation can save is read off the eigenvalues: ½ log₂(AM/GM), zero for a flat spectrum.
- "Low-rank-ish" buys tenths of a bit; only a sharply spiky spectrum buys bits.
:::

## The index tax, in one line {#vq}

A [[vq]] codebook gets its own one-line limit. [[rate-distortion|Rate–distortion]] theory says that for Gaussian data, each bit spent describing a $\vd$-element vector can shrink the residual variance by at most a factor $4^{1/\vd}$, which saves at most $1/\vd$ bit per element. Naming one of $\vC$ centroids costs $\log_2 \vC$ bits per vector:

$$
\underbrace{\vtax = \frac{\log_2 \vC}{\vd}}_{\text{index tax per element}}
\;\ge\;
\underbrace{\text{bits per element the centroid saves beyond a rotation}}_{\text{Gaussian data, ideal quantizer}}
$$ {#eq-missed-vq-bound}

For $\vC$ = 256 and $\vd$ = 64 the tax is 0.125 bit per element, and on Gaussian data the centroid can never save more than that beyond what an untaxed rotation already gets. Product quantization does not escape: the bound adds up over the pieces.

::: theme every-tax
The [[index-tax]] is a helper's fee in its purest form, and here the fee is provably at least the service on bell-shaped data.
:::

Bounds come with fine print. This one is about *Gaussian* data. Real data can beat it by being non-Gaussian in the one way that suits a codebook: tight clusters.

:::: compare When the bound binds, and when it does not
::: col Gaussian-like data
- The bound is tight: VQ cannot beat the rotation.
- In the old draft's Monte Carlo (correlated Gaussian vectors), VQ netted +0.17 to +0.25 bit; the rotation got +0.50 with no tax.
- Verdict: light dictionaries.
:::
::: col Clustered data
- The Gaussian bound does not apply.
- With 32 real clusters, VQ netted +1.5 bits; the rotation got +0.68.
- Verdict: codebooks earn their keep — if the data clusters.
:::
::::

Whether KV entries cluster is itself measurable: compare the k-means residual with what the Gaussian bound predicts for the same codebook size ([[#plan-wave1-outputs]]).

::: takeaway
- On Gaussian data a codebook's index tax is at least what its centroid saves beyond a rotation: net ≤ 0.
- The bound says nothing about clustered data — so measure whether the data clusters, and only then build codebooks.
:::

## What changes in the plan {#plan}

Experiment 1a ([[#plan-experiment-1a]]) is this page turned into an hour of computing. On float copies of the dumps, per layer and for keys and values:

1. the **distance curve**: the $\vRsq$ of predicting an entry from its neighbour $\vgap$ tokens back, converted to bits by the [[#homework-exchange-rate|exchange rate]];
2. the **location gain** $\tfrac12 \log_2 (\vsigma^2_{\text{global}} / \vsigma^2_{\text{within block}})$ — what [[loc]] can save;
3. the **KLT gain** from each block's spectrum — what any rotation can save;
4. all three again after the [[shuffle-control]].

On the Gull Rock temperatures, items 1, 2 and 4 are the two cards of [[#missed-block-is-a-knob]]: a distance curve with its shuffled twin, and the gain of block means against the block size.

Below 0.3 bit of location plus KLT gain at block scope, on both keys and values, the existence question is in trouble. Above 1 bit on keys, the project has a pulse. Either way the exact lossless ladder (1b) follows, because the 8-bit grid can take back part of what the floats promise ([[#missed-context-modeling]]).

The dress rehearsal on synthetic data ([[#homework-rehearsal]]) already showed the habit working. The codebook needed blocks of 8K entries just to pay for itself and then added nothing beyond loc, exactly as the bound said. The KLT bound flagged about 0.35 bit of further room before any rotation was coded.

::: takeaway
- Bounds first: an hour of spectra and variances decides how carefully the exact ladder must be run.
- The harness's job becomes confirmation — and spotting the one thing bounds cannot see, clustered data.
:::
