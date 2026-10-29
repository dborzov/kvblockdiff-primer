---
title: 'Experiment 1a: the one-hour diagnostic'
nav: 'Experiment 1a'
group: 'Wave 1: one weekend'
lede: Before building any coder, take the patient's temperature. Three numbers computed on plain floats — no grid, no format, no coder — tell most of the story in about an hour of compute.
cards:
  - q: Which three numbers does experiment 1a compute?
    a: The distance curve (bits versus token distance), the location gain, and the KLT gain
    wrong: ["The entropy rate, the fixed-length rate and the solo rate", "The miss rate, the δ-miss fraction and the loads per step", "Keys, values and queries"]
    why: All three are float-domain, grid-free numbers that bound what cheap dictionaries could save, before any coder exists.
    sec: three
  - q: 'How does 1a turn the predictability of an entry from its neighbour at distance $\vgap$ into bits?'
    a: 'By the exchange rate $\tfrac12\log_2 \frac{1}{1-\vRsq}$, with $\vRsq$ the share of variance the best per-channel affine prediction explains'
    wrong: ["By counting equal bytes", "By the cosine similarity of the two entries", "By the ratio of their norms"]
    why: For Gaussian-like data, explaining a share R² of the variance leaves a residual of variance (1 − R²)σ², which saves exactly that many bits.
    sec: three
  - q: What does a distance curve that is flat but clearly above zero at every Δ mean?
    a: The structure is per-request or global, not local — informative for scope, but not fallen-apple similarity
    wrong: ["Strong fallen-apple similarity at small Δ", "A bug in the shuffle", "That values are incompressible"]
    why: Local similarity decays with distance. A level line says every entry of the sequence shares something, which a request or global dictionary already captures.
    sec: three
  - q: 'After 1a, what reading means "Q1 is in serious trouble"?'
    a: Location gain plus KLT gain at block scope below 0.3 bit, on both keys and values
    wrong: ["Any gain below 1 bit", "A distance curve that decays", "A KLT gain larger than the location gain"]
    why: Cheap dictionaries could then save at most a third of a bit, before the 8-bit grid takes its share. Above 1 bit on keys, the project has a pulse.
    sec: read
  - q: Why does experiment 1b follow even when 1a looks good?
    a: Because the 8-bit grid can take back part of what float-domain numbers promise
    wrong: ["Because 1a has no shuffle control", "Because 1a only looks at values", "Because 1a needs a GPU"]
    why: On the synthetic set, the same structure is worth 0.80 bit in the entropy rate but only 0.22 bit in E4M3's fixed-length rate.
    sec: read
---

A doctor does not start with surgery. She takes a temperature, listens to the chest, looks at a blood count — three cheap numbers that say whether surgery is even on the table.

Experiment 1a is that check-up for [[fallen-apple|fallen-apple similarity]]. It runs on the [[bf16|BF16]] dumps cast to plain floats: no 8-bit grid, no [[fixed-length-code|fixed-length]] format, no coder. It asks only how much a cheap prediction *could* explain.

## Three numbers before any coder {#three}

All three are computed per [[layer]] and separately for keys and values, with the [[shuffle-control|shuffle control]] run next to each, and broken down per [[channel]] (do a few key channels own the gain?).

**1. The distance curve** ([[#questions-framework-a]]). For each token distance $\vgap \in \{1, 2, 4, \dots, 4096\}$, fit the best per-channel affine prediction of an entry from its neighbour $\vgap$ tokens back, and convert the share of variance it explains into bits with the exchange rate of [[#school-exchange-rate]]:

::: aside reminder The exchange rate
For Gaussian-like data, a predictor explaining a share $\vRsq$ of the variance leaves $(1-\vRsq)\vsigma^2$ and saves $\tfrac12\log_2 \frac{1}{1-\vRsq}$ bits per element: 75 % buys one bit, 94 % two ([[#school-exchange-rate]]).
:::

$$
\text{bits}(\vgap) = \tfrac12 \log_2 \frac{1}{1 - \underbrace{\vRsq(\vgap)}_{\text{variance explained by the neighbour } \vgap \text{ back}}}
$$ {#eq-plan-distance}

The same curve is drawn with the neighbour one layer down instead, for [[upstairs|upstairs similarity]].

**2. The location gain.** Per channel, how much smaller the spread becomes around a narrower scope's location — exactly what a [[loc]] dictionary saves:

$$
\text{location gain} = \frac{1}{\vd} \sum_{\vc} \tfrac12 \log_2 \frac{\vsigma^2_{\text{around the wider scope's location}}}{\vsigma^2_{\text{around the narrower scope's location}}}
$$ {#eq-plan-locgain}

computed for request scope against global, and for block scope ($\vb$ from 256 to 8K) against request.

**3. The KLT gain.** Standardize each channel within the block, take the [[eigenvalue|eigenvalues]] $\vlambda_{\vi}$ of the [[covariance-matrix|covariance matrix]], and compute the [[transform-coding-gain|transform coding gain]] $\tfrac12 \log_2 (\mathrm{AM}/\mathrm{GM})$ of the $\vlambda_{\vi}$ ([[#school-coding-gain]]). That is what *any* linear transform could save at most — for global scope (fit on calibration), request and block.

The location gain is the easiest to read in code. This is the version the harness uses as its float-domain yardstick:

```python experiment 1a's location gain, grid-free (analysis/plan_harness.py)
def location_gains(calib_f, eval_f, bs):
    """Experiment 1a's location gain, in the float domain (no grid): per channel,
    1/2 log2(variance around the wider scope's location / variance around the narrower one's),
    averaged over channels. Returns gainreq and, for each block size b, gainblk."""
    n_seq, T, d = eval_f.shape
    x = eval_f.astype(np.float64)
    var_global = ((x - calib_f.reshape(-1, d).mean(axis=0)) ** 2).mean(axis=(0, 1))
    var_request = x.var(axis=1).mean(axis=0)
    var_block = {b: x.reshape(n_seq, T // b, b, d).var(axis=2).mean(axis=(0, 1)) for b in bs}
    half_log = lambda a, z: float(np.mean(0.5 * np.log2(a / z)))
    return dict(gainreq=half_log(var_global, var_request),
                gainblk={b: half_log(var_request, v) for b, v in var_block.items()})
```

On the synthetic set of [[#plan-controls]] (true block length 2048) it gives a request gain of 0.407 bit and a block gain of 0.368–0.370 bit for any $\vb$ up to 2048, dropping to 0.114 at 4096, where every block straddles two true blocks. After the shuffle: 0.000–0.003 for the blocks and 0.105 for the request (the calibration gap).

The card runs the same function in your browser, on its own draw of the rehearsal set of [[#plan-controls]]. The plot shows why the gain collapses at 4,096.

::: dataset fig-plan-synth-gains plan-synth view=sequences,shuffled metrics=gainreq,gainblk,shufreq,shufblk tab=numbers
**Experiment 1a's location gains on the rehearsal set.** *Numbers:* the request gain and the block gains for $\vb$ = 256 to 4,096, averaged over the 64 channels, then the same after the shuffle; each note quotes the harness's numpy draw next to this one. *Plot:* channel 24 with its planted level as vermilion steps; drag across 4,096 entries and the stretch always spans two steps. Synthetic data, seeded.
:::

Up to 2,048 entries a block sits on one step of the planted level, and a location per block removes it. A block of 4,096 spans two steps, and its single location fits neither. The knee is at the planted length — the same knee the distance curve below shows from another angle.

The distance curve is easiest to understand by playing with one.

::: figure fig-plan-distance planDistance
**A distance curve, live.** One channel of 16,384 tokens, built from piecewise-constant block offsets (the chosen block length and variance share) plus independent noise (seeded). Each point: bits saved per element by the best affine prediction of the value at $\vt$ from the value at $\vt - \vgap$, computed from the sample with [[#eq-plan-distance]]. Lapis: the sequence as it is; vermilion dashed: after shuffling its tokens; emerald dotted: the theoretical curve for this model, $\vRsq(\vgap) = (\text{share} \cdot \max(0, 1 - \vgap/\text{block length}))^2$. The dotted vertical line is the true block length. Token distance on a log scale. Synthetic, one channel; real curves have one line per layer, keys and values.
:::

::: try
1. Set the block share to 50 %. The curve starts near 0.2 bit and dies close to the true block length: its **decay length is the natural block size**.
2. Move the block length. The knee moves with it; the shuffled curve stays on zero.
3. Set the share to 0. Everything is noise: the original curve sits on the shuffled one. That is what a negative Q1 looks like.
4. At a share of 50 %, compare the readout's location gain (0.5 bit) with the curve at $\vgap = 1$ (about 0.21 bit). One noisy neighbour predicts worse than the average of a whole block.
:::

Real data draws curves with more texture than one planted block length. The Gull Rock temperatures of [[#questions-framework-a]] are a toy with a daily rhythm, and their curve is what a Figure A from wave 1 will look like on the page.

::: dataset fig-plan-temp-distance questions-temp-distance metrics=b1,half,b48,shuf
**A distance curve with texture: the Gull Rock temperatures.** Horizontal axis: distance $\vgap$ in half-hours, log scale up to a week (dotted rules at whole days). Vertical axis: bits per reading saved by the best straight-line predictor from the reading $\vgap$ back. Blue: the exchange-rate formula; green: measured on exact whole-tenth residuals; dashed grey: the shuffle control. Hover for values. Derived from the synthetic, seeded temperatures of II.10.
:::

It fades within a couple of hours — a decay length, as above — and then climbs again a day back. On KV entries a bump like that would point to a neighbour of a special kind, such as a passage that repeats; 1a reports it as found, without forcing it into one of the three readings below.

::: takeaway
- 1a computes three grid-free numbers: the distance curve, the location gain and the KLT gain, each with its shuffled twin.
- The distance curve's decay length suggests the block size; a level curve means request or global structure.
- On synthetic data the float location gains are 0.41 bit (request) and 0.37 bit (block), and vanish after the shuffle.
:::

## Reading the result {#read}

1a ends with a reading, written down before the data arrives.

| after 1a (location + KLT gain, block scope) | reading | what follows |
|---|---|---|
| below 0.3 bit on both keys and values | Q1 is in serious trouble | 1b runs for completeness only |
| in between *(our filling of the middle)* | something is there; the grid will decide | 1b, with attention to the E4M3/INT8 split |
| above 1 bit on keys | the project has a pulse | 1b, then the decision rule |

Whatever the reading, 1b follows. Float-domain numbers are promises, and the 8-bit grid can break them: on the synthetic set the same structure is worth 0.80 bit in the entropy rate and 0.22 bit in E4M3's fixed-length rate ([[#plan-fp8-target/coder]]).

Three cautions about the numbers themselves.

- **The exchange rate assumes Gaussian-like data.** Heavy-tailed channels save less (or more) than $\tfrac12\log_2\frac{1}{1-\vRsq}$ says. 1b replaces the formula with real bits.
- **The KLT gain is a bound**, not a coder: an exact integer rotation ([[lifting]]) and its basis cost are not included.
- **A one-neighbour predictor is a narrow probe.** A block dictionary sees all its entries at once and may do better than any single neighbour. The curve answers "how fast does similarity fade", not "how much can a block save".

::: theme access-pattern
1a is allowed to ignore the access pattern — it predicts from any neighbour, in floats. 1b is not: every delta must decode alone, in 8 bits. The gap between the two numbers is the price of the miss path.
:::

::: takeaway
- Below 0.3 bit on both keys and values: serious trouble. Above 1 bit on keys: a pulse.
- 1b always follows, because the grid and the format can take back what floats promise.
- The distance curve says how fast similarity fades; it does not say how much a block can save.
:::
