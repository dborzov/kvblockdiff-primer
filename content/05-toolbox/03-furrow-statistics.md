---
title: 'Furrow statistics: the Anchor'
nav: 'Furrow statistics: the Anchor'
group: Predictor stages
lede: 'The lightest dictionary there is: for each furrow of a punnet, one typical value and one spread. It charges no tax on any cherry, weighs about two cherries, and goes after exactly what the Hermit cannot see, values that drift from punnet to punnet.'
cards:
  - q: What does the furrow-statistics stage write into the dictionary, and into each delta?
    a: A location and a scale per furrow into the dictionary; nothing into the deltas beyond the residual
    wrong: ["A rotation matrix into the dictionary; its coefficients into each delta", "A codebook into the dictionary; an index into each delta", "Nothing into the dictionary; a pointer into each delta"]
    why: 'Two numbers per furrow, so about two cherries'' worth. Every cherry of the punnet is predicted by the same locations, so nothing needs to be said per cherry.'
    sec: anchor
  - q: 'A furrow''s values have total variance 4 across punnets and variance 1 inside each punnet. What does the Anchor save on it, for an ideal entropy coder?'
    a: 1 bit per element
    wrong: ["2 bits per element", "0.5 bit per element", "Nothing; subtracting a constant never helps"]
    why: '½ log₂(4/1) = 1 bit. Punnet locations explain 75 % of the variance. A single global location would save nothing, because entropy depends on the shape of a histogram and not on where it sits.'
    sec: gain
  - q: What did the campaigns find when per-furrow statistics were fit per punnet and charged?
    a: They are the solo baseline itself, 0.804 against the uncharged ideal 0.800; on their own they added nothing beyond solo
    wrong: ["They halved the ratio to 0.40", "They lost to zlib", "They could not be made to decode cold"]
    why: 'Compressor 09 is a centre and a width per furrow per punnet. The gain the campaigns found came from reference cherries and linear prediction stacked on top of those statistics.'
    sec: measured
---

Here are the first four cherries of two punnets of the same sequence, two furrows each, as 8-bit codes on an INT8 grid (illustrative numbers; the first punnet is the toy of [[#toolbox-the-bill]]).

| | punnet of stretch 0, tokens 0 to 3 | punnet of stretch 1, tokens 4096 to 4099 |
|:---|:---:|:---:|
| furrow `[:, 0]` | 97 · 97 · 96 · 98 | 88 · 89 · 87 · 88 |
| furrow `[:, 1]` | 12 · 15 · 10 · 13 | −20 · −17 · −22 · −19 |
| furrow `[:, 2]` | −31 · 22 · 5 · −14 | 18 · −40 · 3 · 27 |

Inside one punnet, two of the three furrows hardly move. Furrow 0 sits near 97 in the first punnet and near 88 in the second; furrow 1 near 12, then near −20. Only furrow 2 jumps around everywhere. The Hermit of [[#toolbox-solo]] codes each furrow with one global table and must be ready for every value it ever takes. If the punnet told it "this time, expect about 97", the leftover would be tiny.

## Drop anchor on every furrow {#anchor}

::: define loc furrow statistics
- **What it is.** A dictionary holding, for each [[furrow]] of a [[punnet]], a **location** (a typical value, the median) and a **scale** (a typical spread, which sets the width or the table of the residual code). Every element is predicted by its furrow's location; the exact difference is coded.
- **Dictionary.** Two numbers per furrow, about two cherries' worth: $\vw \approx 2$. The harness also charges the compressor's own settings, 3 bytes per furrow, which makes it $\vw = 4$ in the plan's accounting.
- **Per-cherry tax.** None. Every cherry of the punnet uses the same prediction.
- **Easy to confuse with** the Hermit's tables: those are global and fixed; the Anchor's statistics belong to one punnet (or one sequence) and follow its drift.
:::

The stage, as `analysis/plan_harness.py` writes it (the `Loc` class, on INT8 codes):

```python furrow statistics: fit, encode, decode (analysis/plan_harness.py)
class Loc(DeltaCoder):
    """The lightest dictionary: one location per furrow (d bytes), the median of the fitting set."""
    def fit(self, F):                          # F: the punnet (stretch scope) or the whole sequence
        return np.round(np.median(F, axis=0)).astype(np.int8)
    def encode(self, X, D):
        return X.astype(np.int16) - D          # int16: an int8 difference would wrap around
    def decode(self, r, D):
        return (r + D).astype(np.int16)
```

The `int16` is not pedantry. Codes `[120, −120]` minus locations `[−100, 100]` computed in `int8` give `[−36, 36]`; the true residuals are `[220, −220]`, and the round trip is the control that catches it ([[#toolbox-rehearsal]]). On the toy punnet the locations are `[97, 12, 5, 41]` and the residuals of cherries 0 to 2 are `[0, 0, −36, −1]`, `[0, 3, 17, 3]`, `[−1, −2, 0, −3]`: two furrows collapse to a few small integers, furrow 2 stays wide. An anchor cannot predict what does not stay put.

::: figure fig-toolbox-decode-alone planDecodeAlone
**One cherry decoded alone against a furrow-statistics dictionary.** Left: a punnet of six cherries of five elements, 8-bit codes (seeded illustrative numbers). Middle: the dictionary, one location per furrow, the median of the punnet. Right: the deltas, each cherry's exact residual. Click a cherry: the readout rebuilds it from its own delta and the dictionary only, bit for bit, reports what was read from memory (the dictionary and that one delta, the other five untouched), and compares the delta's size in fixed-length bits with the 40 raw bits.
:::

::: takeaway
- Furrow statistics: a location and a scale per furrow per punnet; $\vw \approx 2$, no tax.
- Each element is predicted by its furrow's location; the residual is the exact difference, computed in a wider integer type.
:::

## What the Anchor buys, and when nothing {#gain}

The residual's spread is the spread *within* a punnet, $\vsigma_{\text{within}}$; the Hermit faces the spread over all punnets, $\vsigma_{\text{total}}$. For bell-shaped values the exchange rate ([[#toolbox-exchange-rate]]) gives, per element,

$$
\vgain_{\text{loc}} \;=\; \frac12 \log_2 \frac{\vsigma^2_{\text{total}}}{\vsigma^2_{\text{within}}}
\;=\; \frac12 \log_2 \frac{1}{1 - \underbrace{\vRsq}_{\text{explained by punnet locations}}}
$$ {#eq-toolbox-loc}

The cherry's saving is this gain averaged over its $\vd$ furrows; the cost is $8 \times 2/\vb$ per element for the dictionary and nothing per cherry.

::: figure fig-toolbox-loc-gain hwaLocGain
**One furrow over eight punnets.** Dots: 48 values per punnet of one furrow (seeded illustrative data: each punnet has its own typical value, plus noise). Grey band: what the Hermit sees, the global mean ± one global standard deviation. Coloured bars: the Anchor's prediction, each punnet's median, with ± one within-punnet standard deviation. **Slide** the share of the furrow's variance that comes from punnet-to-punnet drift. The tiles give the measured variances and the gain $\tfrac12\log_2(\vsigma^2_{\text{total}}/\vsigma^2_{\text{within}})$ in bits per element, before the dictionary's $16/\vb$.
:::

::: try
1. Set the drift share to 0. The bars sit on the global mean and the Anchor saves nothing (a few hundredths, from fitting noise).
2. Set it to 75 %. The within-punnet spread halves: one bit per element.
3. Go to 95 %. The furrow is nearly constant inside each punnet: over two bits.
:::

Three things decide whether the Anchor is worth its two cherries.

- **A fixed global location saves nothing for an ideal entropy coder.** Entropy depends on the shape of a histogram, not on where it sits. The gain comes from locations that *change*, from punnet to punnet or sequence to sequence. A [[fixed-length-code]] is different: centring a furrow is what lets its width be narrow, so even a global anchor helps there, and the harness charges the plan's solo rung at global scope for exactly this reason ([[#toolbox-two-rates]]).
- **The grid can turn the gain negative.** On the E4M3 grid, subtracting a location in [[index-space]] can cost bits unless the location explains most of the variance; [[#toolbox-bit-fields]] measures it and adds a one-bit "predict or not" flag per furrow, and [[#toolbox-context-modelling]] shows the fix that never loses.
- **The dictionary is almost free, not free.** $16/\vb$ bits per element: 0.06 at $\vb = 256$, 0.004 at 4096, a full bit at $\vb = 16$.

On a synthetic "drift" punnet where punnet locations explain 60 % of the variance (formula gain 0.66), the measured saving was +0.64 bit per element after paying for the dictionary, the best of the four classic dictionary types there ([[#toolbox-rehearsal]]).

::: takeaway
- The Anchor saves $\tfrac12\log_2(\vsigma^2_{\text{total}}/\vsigma^2_{\text{within}})$ per furrow: 75 % of the variance in punnet locations buys one bit.
- It wins on drift; it gains nothing on furrows that do not drift, and can lose on a logarithmic grid without a flag.
:::

## What the campaigns found {#measured}

On the Bench the Anchor turned out to be the floor rather than a step above it. The campaigns' solo ideal, 0.7999 at layer 3 head 0, is itself computed per punnet and per furrow with the tables uncharged, so whatever drift there is between punnets already sits inside that number. Compressor 09, the best real solo compressor of [[#toolbox-solo]], *is* furrow statistics fit per punnet and charged: a centre and a width per furrow, one rANS stream per cherry, **0.8039** at `stretch 4096`. The 0.004 between the two is the price of shipping the statistics, and the scorecard's verdict reads "loc alone: nothing beyond solo" ([[#measured-scorecard]]). The statistics did not disappear, though: every later compressor keeps a mean and a scale per furrow underneath its reference cherries and its linear prediction (compressor 129 begins exactly so, [[#toolbox-linear-prediction]]). One layer showed the Anchor's natural prey: the values of the LLM's layer 23, where about a tenth of the furrows are one-signed offsets, coded to 0.572 at 4096 tokens while every other layer sat between 0.67 and 0.74 ([[#measured-night-one]]). And punnet size ran the wrong way for a drift story: bigger punnets always won, ever more slowly, with no drift ceiling up to 32 768 tokens ([[#measured-reading-one-cherry]]).

::: aside source Receipts
Coder 09: r1-t0005 (0.80385 at 4096, 0.8045 at 512); solo ideal landmark env-t0001 (0.79989). Layer 23 values 0.572 and the one-signed furrows: r3-t0036/r3-t0040 (C1 notes/04 §3). Block-size series: r1-t0045, r1-t0042, r4-t0008. Scorecard row "loc alone": PART-XI-SPEC §1.12.
:::

::: takeaway
- On the Bench, charged per-furrow statistics are the solo baseline (0.804); they added no drift gain of their own.
- They survive under every stronger stage, and they alone catch a layer whose furrows are one-signed offsets.
:::
