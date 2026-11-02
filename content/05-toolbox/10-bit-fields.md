---
title: Splitting the bit fields
nav: Bit fields and the grid
group: Coding the residual
lede: 'An FP8 byte is three fields, and they are not equally predictable: the exponent is lopsided, the mantissa close to noise. Routing them to different stages is a cheap trick. The grid the byte numbers is a deeper matter: on a logarithmic grid, a prediction that subtracts in index space can cost bits, and the campaigns found that the structure of the values hides from anyone who counts in grid steps.'
cards:
  - q: For a bell-shaped furrow stored in E4M3 with no predictor, what do sign, exponent and mantissa cost?
    a: About 1.00 + 2.54 + 2.93 = 6.47 bits
    wrong: ["1 + 1 + 1 = 3 bits", "8 bits; nothing is predictable", "About 4 bits, mostly in the sign"]
    why: The exponent is the only field with easy, context-free redundancy (4 bits stored, 2.5 of information). The mantissa is nearly uniform.
    sec: split
  - q: A value −3 is predicted as 6. How far apart are they on an INT8 grid with a step of 2, and on the E4M3 grid in index space?
    a: 5 steps on INT8, 144 steps on E4M3
    wrong: ["5 steps on both", "144 steps on both", "1 step on E4M3, 5 on INT8"]
    why: E4M3's grid is dense near zero, so a residual that crosses zero walks past every tiny value in between. INT8's grid is even.
    sec: grid
  - q: Which single measurement showed that the linear structure of the values is hidden by the FP8 grid?
    a: 'A shared-bits estimate on values matched real code lengths (0.278 against 0.263, r = 0.9993), while the same estimate on the FP8 code index read 0.104, three times too low'
    wrong: ["The mantissa kept 2.80 of its 3 bits", "The floor moved from 0.37 to 0.50", "The skew of the error was −0.03"]
    why: The structure is in the values. Counting in grid steps hides two thirds of it; the campaigns' tables are built in value units and integrated over each code's cell.
    sec: measured
---

Four values of one furrow, drawn from a bell curve, scaled the way an 8-bit orchard is scaled, rounded to [[fp8]] E4M3. The third column is the byte that is stored: one sign bit, four [[exponent]] bits, three mantissa bits; the last is the byte's place on the grid, its [[index-space|index]].

| drawn | stored | byte: sign · exponent · mantissa | index |
|---:|---:|:---:|---:|
| +130.62 | +128 | `0 1110 000` | +112 |
| −163.56 | −160 | `1 1110 010` | −114 |
| +26.76 | +26 | `0 1011 101` | +93 |
| −36.34 | −36 | `1 1100 001` | −97 |

The sign is a coin toss. The mantissa takes all sorts of values. The exponent keeps landing on the same few patterns: over a million draws, five of the sixteen carry 90 % of the values.

## Split the byte {#split}

::: define bit-field-split
- **What it is.** A stage that separates the bit fields of each FP8 element and routes them to different parts of the compressor's graph: the predictable sign and exponent to a predictor and an entropy coder, the noisy mantissa to a cheaper path, often stored raw.
- **Dictionary.** A table for the exponent (global, or per punnet at a few bytes per furrow). **Tax.** None.
- **Easy to confuse with** a statement about where the *information* is. The split follows the byte's layout; the structure of the values does not stop at a bit boundary (below).
:::

```python the bit-field split: route sign and exponent one way, the mantissa another
def encode(cherry_bytes, exp_table):
    b = cherry_bytes.view(np.uint8)
    sign, exponent, mantissa = b >> 7, (b >> 3) & 0xF, b & 0x7
    return (rans_encode(exponent, exp_table),        # lopsided: 2.5 bits of information in 4
            pack_bits(sign, 1), pack_bits(mantissa, 3))   # a fair coin and near-noise, stored raw

def decode(delta, exp_table):
    exponent = rans_decode(delta[0], exp_table); sign = unpack_bits(delta[1], 1); mantissa = unpack_bits(delta[2], 3)
    return ((sign << 7) | (exponent << 3) | mantissa).astype(np.uint8).view(np.int8)
```

Field by field, the 6.47 bits of a bell-shaped E4M3 element are 1.00 of sign, 2.54 of exponent and 2.93 of mantissa (the mantissa's counted given the other two). In BF16 the same furrow costs about 1.0 + 2.5 + 7.0 = 10.5 bits of 16, which caps lossless BF16 near 1.5× and is the whole business of the float compressors of [[#papers-float-coders]]. How much a prediction can tell about each bit is a measurement too.

::: figure fig-toolbox-bit-flips maBitFlips
**Which bits a prediction cannot tell you.** Each cell is one bit position of the format, coloured by field (sign, exponent, mantissa). Its filled height and the number under it give how often that bit of the true value differs from the same bit of the prediction, in per cent; 50 means a coin flip. *Top row:* BF16. *Bottom row:* E4M3, for the same values scaled to its range. *Slider:* the share of the value's variance the prediction explains, $\vRsq$. *Readout:* how many bits are within 10 points of a coin flip, and the [[order-0-entropy]] of the three BF16 fields of these values with no predictor. 20 000 bell-shaped values, seeded.
:::

A prediction that explains 90 % of the variance still leaves 8 of the 16 BF16 bits as coin flips. Eight-bit storage has already thrown most of that noise away, which is why the scenario is posed on 8-bit codes ([[#scenario-the-contract]]).

::: takeaway
- Sign 1.00, exponent 2.54, mantissa 2.93: the exponent is the redundant field, the mantissa is close to noise, in E4M3 as in BF16.
- The split is a routing trick with no tax; it says where the byte's easy bits are, not where the values' structure is.
:::

## The grid is not neutral {#grid}

A furrow's element sits at −3 (in its tensor's scaled units). The punnet's dictionary predicts 6. On an evenly spaced [[integer-grid|INT8]] grid with a step of 2 the miss is **5 steps**. On the E4M3 grid, counted in index space, it is **144 steps**, more than half the grid, because crossing zero means walking past every tiny value in between.

| value | prediction | INT8 residual (steps) | E4M3 residual (steps) |
|---:|---:|---:|---:|
| 104 | 96 | +4 | +1 |
| 40 | 44 | −2 | −1 |
| 10 | 2 | +4 | +18 |
| −3 | 6 | −5 | −144 |

Two habits follow. **Coding alone, the log grid wins:** 6.47 bits for a bell-shaped furrow at any scale, against 7.05 on a per-furrow INT8 grid. **Predicting by subtraction, the uniform grid wins:** on INT8 the exchange rate of [[#toolbox-exchange-rate]] applies as is; in E4M3 index space a punnet-location predictor is net *negative* below $\vRsq \approx 0.7$ and stays about 0.8 bit behind INT8 above it, at any furrow scale (`analysis/homework_a_grid.py`, 400 000 values per point).

::: figure fig-toolbox-grid-curves hwaGridCurves
**What the grid takes back.** Panel A, bits per element saved by a punnet-location predictor against $\vRsq$: the textbook formula $\tfrac12\log_2\frac{1}{1-\vRsq}$ (grey), INT8 with a per-furrow scale, and E4M3 index space at three furrow spreads (4, 40, 100). Panel B, total bits per element with solo coding included: INT8 stores its residuals; E4M3 stores whichever is cheaper, raw codes or residuals (the flag below). **Switch** panels; hover for values. Seeded Monte Carlo, one Gaussian furrow, punnets of 256.
:::

Two cheap consequences, both in the plan's harness: a one-bit flag per furrow, "predict or not", so that a prediction is used only where it helps (the `PredictOrNot` wrapper of `analysis/plan_harness.py`); and INT8 with a per-furrow scale scored next to E4M3, since both are 8-bit formats a serving system may choose (E4M3 is cheaper below $\vRsq \approx 0.55$, INT8 above). The clean fix is a table that knows the grid.

::: define grid-aware-model grid-aware table 
- **What it is.** A probability table that describes the *value*, not the code number: a bump in value units (Laplace or logistic), centred on the prediction, giving each 8-bit code the bump's area over that code's grid cell. On a uniform grid it reduces to the index-space bump; on E4M3 a value near zero sits in a narrow cell and gets a small probability, exactly the extra bits it really costs.
- **Why it is needed.** A zero-centred furrow's E4M3 codes form two humps, one per sign; a single bump in index space fits them so badly that on the plan's synthetic set it charges solo coding 8.375 bits, more than raw, where the codes' own histogram says 6.128 and the grid-aware table 6.367.
- **Easy to confuse with** [[context-modeling|context modelling]], which it serves: the context picks the centre, the grid-aware table turns it into a probability per code ([[#toolbox-context-modelling]]).
:::

```python the grid-aware table, from analysis/plan_harness.py (shortened)
def grid_bits(X, P, m, beta, vals, off):
    """Bits an ideal entropy coder spends on codes X given predictions P, when its table is a
    value-domain Laplace (centre value(P) + m, scale beta) integrated over each code's grid cell."""
    mid = (vals[1:] + vals[:-1]) / 2
    lo, hi = np.concatenate([[-np.inf], mid]), np.concatenate([mid, [np.inf]])   # cell edges, in value units
    c = vals[P + off] + m                                                        # the bump's centre
    zl, zh = (lo[X + off] - c) / beta, (hi[X + off] - c) / beta                  # the cell, in units of the scale
    logp = laplace_mass_between(zl, zh)                                          # log of the area over the cell
    return -logp.mean(axis=0) / np.log(2)
```

::: figure fig-toolbox-humps planHumps
**The codes of one furrow, and three tables.** Histogram (lapis bars) of the codes of 20 000 seeded Gaussian values with standard deviation 20 (scaled units) and the chosen mean, in E4M3 or INT8 index space. Vermilion line: the best single Laplace bump in index space. The readout gives three prices in bits per element: the codes' own histogram (order-0 entropy), the index-space Laplace, and the grid-aware Laplace. Switch the format and move the mean away from zero.
:::

::: theme grid-matters
The same predictor saves 1.13 bits per element on INT8 and 0.31 on E4M3 at $\vRsq = 0.8$. A result about "how compressible the orchard is" means little until it names the grid and the table.
:::

::: takeaway
- E4M3 makes solo coding cheap (6.47) and subtraction risky; INT8 costs more alone (7.05) and turns variance into bits at the textbook rate.
- A flag per furrow stops prediction from ever losing; a grid-aware table in value units is the fix that keeps the gain.
:::

## What the campaigns found {#measured}

The first campaign ended its night with a story built on the split: *the mantissa is noise, everything compressible sits in the sign and the exponent, the floor is 0.37.* The second campaign audited 17 of those conclusions ([[#measured-time-and-bits]]). The floor was false: it assumed a perfect code for sign and exponent, and a real table for one head from its token and local history pays about 0.50 (48 punnets). The framing cost almost nothing, because the first campaign's compressors already predicted in value; the one truly bit-field design decision lost its re-test by at most 0.009 of ratio. The decisive measurement is one pair of numbers: an estimate of how many bits the two heads of a layer share, made on the real *values*, agrees with real code lengths (0.278 against 0.263, correlating 0.9993 over 66 pairs of cells), while the same estimate made on the code index, the byte read as a number from 0 to 252, reads 0.104, three times too low. The linear structure is in the values, and the logarithmic grid hides it from anyone who counts in steps. The campaigns' answer is the grid-aware table of the previous section, a logistic in value integrated over the FP8 cell ([[#toolbox-context-modelling]]); "noise" was right about BF16's low mantissa bits (bf16 costs about half the fp8 ratio plus 0.25), and "a bit position is the boundary" was the mistake.

::: aside source Receipts
The audit: r13 iter-1-1 to 1-5 (floor 0.50 on 48 blocks; framing cost ≤ 0.009). Shared bits 0.278 / 0.263 / 0.104: r9 iter-1-1 to 1-3. bf16 ≈ fp8/2 + 0.25: C1, spec §1.4. Synthetic solo 8.375 / 6.128 / 6.367: `figures/data/plan-harness.json`, `solo.e4m3`. Notes: `notes/02-what-v-is-and-values-not-bits.md` §7; PART-XI-SPEC §1.8.
:::

::: takeaway
- "Mantissa is noise, floor 0.37" was a wrong story that cost at most 0.009; the real floor for a local one-head table is about 0.50.
- Shared bits estimated on values match real code lengths; on the code index the estimate is three times too low. Build the table in value, integrate over the cell.
:::
