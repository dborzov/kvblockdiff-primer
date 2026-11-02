---
title: 'Solo: the Hermit'
nav: 'Solo: the Hermit'
group: Shape and baseline
lede: The first rung of every comparison is a compressor that never looks at a neighbour. It codes each element alone, with one table fit once, long ago, on other text. It is cheap, fast, already published, and every dictionary in this Part has to beat it.
cards:
  - q: What does a solo compressor use to code an element?
    a: One fixed table per furrow, fit once on a calibration corpus and shared by every sequence
    wrong: ["The punnet's own furrow statistics, charged to the punnet", "The previous cherry of the same furrow", "A table fit to each sequence at prefill"]
    why: The Hermit never looks at context. Its per-furrow tables are global, so they weigh nothing on the bill and nothing has to be loaded.
    sec: table
  - q: 'A punnet''s values sit around a typical value of their own, and the Hermit codes them with its global table. Averaged over punnets, how many extra bits per element does it pay?'
    a: '½ log₂ 1/(1 − R²), where R² is the share of variance the punnet locations explain'
    wrong: ["Nothing; a global table is always optimal", "One bit per element, whatever the drift", "log₂ of the number of punnets"]
    why: 'The extra cost of a wrong table is a cross-entropy penalty. Averaged over punnets it is the exchange-rate formula, exactly what a furrow-statistics dictionary could win back.'
    sec: blind
  - q: What did the campaigns measure as the solo floor on the Bench's values, and what did the best real solo compressor reach?
    a: 0.778 ideal over the six KV layers (0.7999 at layer 3, head 0), tables uncharged; 0.8039 with a two-number table per furrow
    wrong: ["0.636 ideal; 0.686 real", "1.0 ideal; 0.909 real", "0.5 ideal; 0.778 real"]
    why: 0.778 is the per-punnet, per-furrow order-0 entropy of the stored bytes over six layers. Compressor 09 stores a centre and a width per furrow and pays 0.004 of ratio for them. zlib on the punnet reached only 0.909.
    sec: measured
---

A lighthouse keeper on a rock writes the same kind of logbook line every hour. He has a fixed shorthand, agreed years ago with the harbour office: common words get short marks, rare words long ones. He never looks back at yesterday's page and never compares notes with the next lighthouse. Each line is coded alone, by the book.

That is the whole of the first compressor family, [[solo]], defined on [[#scenario-compressors-and-stages]] and nicknamed the Hermit.

## The Hermit's table {#table}

Solo is the skeleton of [[#toolbox-the-bill]] with step 1 removed: the prediction is zero, the residual is the code itself, and the only thing both sides hold is a probability table per [[furrow]], fit on a [[calibration-set|calibration corpus]] in [[scope-global|global scope]], so it costs nothing on the bill.

```python solo: one fixed table per furrow, no dictionary, no tax
def fit_global(calibration):                       # once, offline, on other sequences
    return [histogram(calibration[:, elem_id])     # one probability table per furrow
            for elem_id in range(d)]

def compress(punnet, tables):
    dictionary = b""                               # the solo family: nothing shared across the punnet
    deltas = [rans_encode(cherry, tables) for cherry in punnet]   # each cherry: its own codes, one stream
    return deltas, dictionary

def decompress(delta, dictionary, tables):
    return rans_decode(delta, tables)              # tables are fixed constants, known to both sides
```

Here is the Hermit's table for the exponent field of one bell-shaped furrow stored as [[fp8]] E4M3, the field where [[#toolbox-the-bill]] found the easy redundancy. The shares come from a million draws at a spread of 64 (`analysis/homework_a_budget.py`).

| exponent pattern | share of values | ideal code length | 3-bit fixed code |
|:---:|---:|---:|:---|
| `1100` | 29.6 % | 1.8 bits | 3 bits |
| `1101` | 27.9 % | 1.8 bits | 3 bits |
| `1011` | 18.0 % | 2.5 bits | 3 bits |
| `1010` | 9.5 % | 3.4 bits | 3 bits |
| `1110` | 5.3 % | 4.2 bits | 3 bits |
| `1001` | 4.8 % | 4.4 bits | 3 bits |
| `1000` | 2.4 % | 5.4 bits | 3 bits |
| `0111` | 1.2 % | 6.4 bits | 3 bits |
| the other 8 | 1.2 % | 7 to 13 bits | escape: raw byte + 12-bit position |
| **average** | | **2.54 bits** | **3.24 bits** |

The ideal lengths are [[surprisal|surprisals]]; an [[entropy-coder]] reaches their average. The fixed column is what a GPU decoder likes, every element the same width, and it pays 0.7 bit more for the convenience ([[#toolbox-two-rates]]). Add the sign (1 bit) and the mantissa (3 bits, stored raw) and the toy element costs 6.47 bits ideal, 7.24 bits fixed-length: 1.24× and 1.10× smaller than raw. SplitZip's published numbers on real orchards agree in size: 1.14× on E5M2 values, and its top-8 exponent code on E4M3 *expanded* the data to 0.93× because too many values escaped ([[#papers-splitzip]]).

::: pull
Coding 8-bit orchards one element at a time is worth about 1.1 to 1.3×, and that is already published.
:::

The Hermit has three virtues no dictionary can match, and they make it the right baseline: nothing to load, nothing to keep resident, and perfect [[random-access]].

::: takeaway
- Solo: a fixed, global table per furrow; prediction zero; dictionary empty; no tax.
- Worth about 6.2 to 6.5 bits ideal, about 7.2 fixed-length, on 8-bit values; nothing to load or keep.
:::

## What the Hermit cannot see {#blind}

The Hermit's table is fit to the whole calibration corpus. Any one [[punnet]] may look different: its values may sit around a typical value of their own and spread less than the corpus does. The Hermit cannot know, keeps coding with the wide global table, and pays for the mismatch.

::: aside reminder Cross-entropy, in one line
Coding data whose true distribution is $\vp$ with a table built for another distribution costs the entropy of $\vp$ plus a penalty that grows with the gap between the two ([[#school-arithmetic]], [[cross-entropy]]). The penalty is zero only when the table matches the data.
:::

::: figure fig-toolbox-solo-drift hwaSoloDrift
**The Hermit's blind spot.** Grey: the global distribution of one furrow over the whole corpus (a bell curve of spread 1). Coloured: the values of one punnet, which sit around their own typical value (slider "offset", in units of the global spread) and spread less, because punnet-to-punnet shifts explain a share $\vRsq$ of the furrow's variance (slider). The tiles give, in bits per element, the extra cost of coding this punnet with the global table instead of a table fit to the punnet (the Gaussian cross-entropy penalty), and the same cost averaged over all punnets, $\tfrac12\log_2\frac{1}{1-\vRsq}$. Illustrative: Gaussian shapes, computed from the formulas.
:::

::: try
1. Set $\vRsq = 0$. The punnet looks like the corpus and the Hermit loses nothing.
2. Raise $\vRsq$ to 0.75 and keep the offset at 0. The punnet is narrow and centred: the penalty is about 0.46 bit; the average over punnets is 1 bit.
3. Move the offset to ±1.5. The punnet sits in the global tail, where the Hermit's codes are long: the penalty passes 2 bits.
:::

That average penalty is exactly what the next page's dictionary wins back. The other blind spots are bigger structures, and each has a page:

- **Furrows that move together** inside a cherry. The Hermit codes furrows one by one, so a correlation is invisible to it ([[#toolbox-klt]], [[#toolbox-linear-prediction]]).
- **Cherries that look alike**: clusters, or near-repeats of the same token inside a punnet ([[#toolbox-vq]], [[#toolbox-reference-cherries]]).

::: note key Count from the Hermit, not from raw
A dictionary that brings an element from 8 to 6.4 bits has won nothing: the Hermit reaches 6.2 for free. Counting from raw would credit a dictionary with savings it did not create. Every gain in this Part is measured against the solo rate.
:::

::: takeaway
- The Hermit pays a cross-entropy penalty wherever a punnet differs from the corpus; averaged over punnets it is $\tfrac12\log_2\frac{1}{1-\vRsq}$.
- Drift, correlated furrows and look-alike cherries are what the dictionaries of this Part go after.
:::

## What the campaigns found {#measured}

Before any dictionary, both campaigns measured the floor on the Bench's values ([[#measured-night-one]]). The ideal, per punnet and per furrow, with tables uncharged: **0.7999** of raw at layer 3, head 0, and **0.778** over the six KV layers, 6.22 bits per element. The best real solo compressor, number 09, fits a two-number table per furrow (a centre and a width) and codes each cherry as one [[rans]] stream: **0.8039** at `stretch 4096`, 0.8045 at 512; the 0.004 between it and the ideal is the price of shipping the two numbers. Literal histograms, charged, cost 0.818 and 0.907; zlib on the punnet, 0.909. Pre-RoPE keys coded alone came out a little lower, 0.776 to 0.786. The first plan had guessed 0.78 ideal to 0.88 fixed-length: confirmed, and every six-layer score of the second campaign is read against 0.778 ([[#measured-scorecard]]).

::: aside source Receipts
Solo: `solo_ratio` landmark of env-t0001 (0.79989) and of screen `s-layer-b4k-r293` (0.77811); coder 09 r1-t0005 (0.80385 at 4096, 0.8045 at 512); literal histograms and zlib: `research/c1/KNOWLEDGE.md`, r2-t0008; keys solo 0.776–0.786: C1 notes/04 §3; the primer's guess: PART-XI-SPEC §1.12.
:::

::: takeaway
- Measured floor: 0.778 ideal on the Bench's values over six layers; 0.804 with a real two-number table per furrow.
- Everything a dictionary claims is counted from here.
:::
