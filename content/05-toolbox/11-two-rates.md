---
title: 'Two rates: entropy and fixed-length'
nav: Two rates
group: Coding the residual
lede: 'The same residuals can be billed two ways: by an ideal entropy coder, which reaches the information-theoretic price, or by a fixed-length code with escapes, which a GPU can decode at gather speed. The harness reports both, the gap between them is about a bit per element, and on the Bench only the first was ever measured.'
cards:
  - q: What does the entropy rate measure?
    a: What an ideal entropy coder (arithmetic coding, rANS) would pay for the residuals, plus the tax and the amortised dictionary
    wrong: ["The width of the fixed-length code", "The raw size of the cherry", "The size of the dictionary alone"]
    why: It is the scientific number, the floor any compressor with the same table could reach.
    sec: two
  - q: In the harness's fixed-length format, how is an escaped element marked?
    a: 'Its field holds the one value the width rule never uses, $-2^{\vn-1}$, and its raw code follows the cherry''s fields'
    wrong: ["By a separate list of positions in the punnet", "By setting the field to zero", "It is not marked; escapes are dropped"]
    why: The width rule allows residuals with magnitude below $2^{\vn-1}$, so the most negative field value is free to mean "escaped". An escape then costs its 8 raw bits and no position, and every delta stays decodable alone.
    sec: two
  - q: For Laplace-shaped residuals at 5 to 7 bits per element, how far apart are the two rates?
    a: About one bit per element with the best width, about 1.5 with the harness's 99.5 % coverage rule
    wrong: ["About 0.01 bit", "About 4 bits", "Exactly the same"]
    why: A fixed width rounds up to whole bits and must cover the tail. SplitZip's BF16 numbers show a gap of the same size in bits (0.9 to 1.5); it reads as 10 to 15 % only because a BF16 element has 16 bits to divide by.
    sec: gap
---

Sixteen residuals of one furrow, after some stage did its best:

`0  −1  2  0  1  −3  0  1  −1  0  2  −2  0  1  14  −1`

Two clerks are asked how many bits they need to store them. The first builds a table fit to how often each value occurs (0 five times, ±1 six times, and so on) and pays each value its [[surprisal]]: **41 bits**, 2.56 per value, with a table fit to these very sixteen, which is optimistic. The second gives every value the same 3-bit slot, enough for −3 … 3. The 14 does not fit: its slot holds the one 3-bit pattern the rule never needs, −4, and its raw byte follows the sixteen slots: $16 \times 3 + 8 =$ **56 bits**, 3.5 per value. The second bill is a third larger, and the second clerk is the one a GPU would hire.

## The scientific number and the engineering number {#two}

::: aside reminder Entropy coders, fixed-length codes, escapes (II.8, II.9)
An [[entropy-coder]] such as [[arithmetic-coding]] or [[rans]] spends fractions of a bit, close to each value's surprisal, but decodes a stream front to back. A [[fixed-length-code]] gives every value $\vn$ bits; rare values that do not fit are [[escape|escaped]], and any value can be found and decoded alone ([[random-access]]).
:::

Both rates use the bill of [[#toolbox-the-bill]] ($\vbpe$ = residual + $\vtax$ + $8\vw/\vb$) and differ only in how the residual line is priced.

::: define entropy-rate
- **What it is.** The residual billed by an ideal entropy coder: the [[cross-entropy]] of the exact integer residuals under a per-furrow table (a discretised [[laplace|Laplace]] or a grid-aware bump, fit on the data the dictionary was fit on), plus tax and dictionary.
- **Meaning.** The scientific number. It says how much structure the stage found.
- **Easy to confuse with** what a GPU will move: no stream compressor fits a one-cherry-at-a-time ask.
:::

::: define fixed-length-rate
- **What it is.** The residual billed by a per-furrow fixed-width code: the smallest width $\vn$ with $\lvert \vr \rvert < 2^{\vn-1}$ for all but a share $\veps$ of the cherries, plus every escape at 8 bits for its raw code; plus tax and dictionary. The widths, one byte per furrow, go into the dictionary.
- **Meaning.** The engineering number: what a SplitZip-style GPU decoder achieves, and directly the delta size on the link.
:::

The harness's functions, as `analysis/plan_harness.py` writes them. `r` is a punnet of integer residuals, one row per cherry, one column per furrow; the tables and widths are always fit on the **fitting set** and charged on the punnet being coded.

```python the two rates and the dictionary line (analysis/plan_harness.py)
ALPHABET = np.arange(-255, 256)        # every difference of two 8-bit codes fits in here

def laplace_fit(r):
    """Per furrow: an integer centre m and a scale beta of a Laplace table of residuals r (rows, d)."""
    m = np.round(np.median(r, axis=0))
    beta = np.maximum(np.abs(r - m).mean(axis=0), 0.25)
    return m, beta

def entropy_rate(r, m, beta):
    """Cross-entropy of residuals r under the per-furrow discretised Laplace (m, beta), bits per element."""
    assert r.min() >= ALPHABET[0] and r.max() <= ALPHABET[-1], "residual outside the 8-bit alphabet"
    logp = -np.abs(ALPHABET[None, :] - m[:, None]) / beta[:, None]      # (d, 511), not yet normalised
    logp -= np.log(np.exp(logp).sum(axis=1, keepdims=True))               # normalise each furrow
    idx = r.astype(np.int64) - ALPHABET[0]                                # residual value -> column
    return float(-logp[np.arange(r.shape[1])[None, :], idx].mean() / np.log(2))

def fl_widths(r, eps=0.005):
    """Per furrow, the smallest width n with |r| < 2^(n-1) for all but a share eps of rows.
    n >= 1, because the field value -2^(n-1) (never used by a residual) marks an escape."""
    q = np.quantile(np.abs(r), 1 - eps, axis=0, method="higher")
    return np.maximum(np.ceil(np.log2(2 * q + 1)), 1).astype(np.int64)

def fixed_length_rate(r, n):
    """n[c] bits per field, plus 8 bits for every escaped element (its raw code)."""
    return float((n[None, :] + 8 * (np.abs(r) >= 2.0 ** (n - 1))).mean())

def side_bits(dict_bytes, b, d):
    """A dictionary's bytes, spread over the b cherries x d elements that share it: 8 w / b."""
    return dict_bytes * 8.0 / (b * d)
```

Three details are deliberate. Widths are fit on the fitting set, like the table; fitting them on the coded punnet would flatter the global scope. Escapes cost 8 bits and no position, because the reserved field value marks them, so each delta carries its own escapes and stays decodable alone. Out-of-range residuals fail loudly instead of being clipped. The functions were tested against closed forms before touching data: residuals drawn from a Laplace of scale $\vbeta = 3$ have an entropy of 4.015 bits, the fitted table charges 4.035 and a histogram 4.034; residuals spread evenly over −3 … 3 get 3-bit fields and a rate of exactly 3.000.

::: takeaway
- Entropy rate: the ideal, the scientific number. Fixed-length rate: a width per furrow plus escapes, the engineering number and the delta's size.
- Both include every tax; escapes are marked by the one field value the rule never uses.
:::

## The price of random access {#gap}

Run the functions on Laplace residuals of scale 8 (4096 cherries, 64 furrows, seeded): **5.44** bits entropy against **7.00** fixed-length. At scales 2, 4, 8 and 16 the pairs are 3.46 / 5.0, 4.45 / 6.0, 5.44 / 7.0 and 6.44 / 8.0: the coverage rule sits about 1.5 bits above the entropy. Where does the gap come from?

::: figure fig-toolbox-two-rates hwaTwoRates
**Entropy rate against fixed-length rate for Laplace-shaped residuals.** Horizontal axis: the residual's Laplace scale $\vbeta$ in grid steps (log scale); vertical axis: bits per element. Curves: the entropy of the discretised Laplace (the entropy rate's residual line), the fixed-length rate with the width chosen to cover all but $\veps$ of the residuals (the harness's rule), and the fixed-length rate with the best width (the one minimising width plus escapes). Escapes here cost 8 + 12 bits, an older accounting with a position. **Slide** $\vbeta$ and $\veps$; the tiles give the three rates and the gaps at the current $\vbeta$. Exact sums over the distribution, no sampling.
:::

::: try
1. At $\vbeta = 8$ (entropy 5.44) the coverage rule pays 7.01, the best width 6.39: about one bit above the entropy.
2. Move $\vbeta$ from 4 to 16. The gap in bits barely changes; the percentage shrinks as the rate grows.
3. Raise $\veps$ to 3 %. The coverage rule picks a narrower code and pays more escapes; watch it approach the best width.
:::

Two structural causes: a width is a whole number of bits and the entropy is not (about half a bit on average), and a Laplace tail must be covered or escaped. The honest summary is **about one bit per element** with a well-chosen width, 15 to 22 % at the 5-to-7-bit rates that matter, and 1.5 bits with the plain coverage rule. SplitZip's BF16 numbers say the same in other units: 1.32× fixed-length against 1.42 to 1.5× for entropy coders is 12.1 against 10.7 to 11.3 bits per element, a gap of 0.9 to 1.5 bits; it looks like 10 to 15 % only because a BF16 element has 16 bits to divide by.

What the gap buys is the access pattern ([[#app-data-layout]]). Each ask reads one cherry, alone, from an arbitrary place, and must decode it well inside the 0.38 ms a layer's step lasts on the Pin ([[#landscape-derived-numbers]]); a fixed width makes that a gather, an add and an escape fix-up. A middle ground, a few widths per furrow or a small shared table per punnet, could recover part of the bit; it is an option, not an assumption.

::: theme access-pattern
The fixed-length rate is not a failure of engineering; it is the price of one-at-a-time asks, and the leash is the same theme written as a rule.
:::

::: takeaway
- The fixed-length rate sits about one bit per element above the entropy rate for Laplace residuals: whole bits plus the tail.
- That is 15 to 22 % at 8-bit rates, more than the 10 to 15 % one reads off BF16 results.
:::

## What the campaigns found {#measured}

Nothing, on purpose and by accident. Every compressor of both campaigns is an entropy coder, one rANS stream per cherry under a table built in value and integrated over the FP8 cell ([[#toolbox-context-modelling]]); not one fixed-length rate was measured, and the scorecard lists the two-rates prediction as *unmeasured* ([[#measured-scorecard]]). What the campaigns did measure is the other half of random access: under a leash of 293 cherries' worth, a cold decode cost nothing of the ratio at `stretch 4096` and above, the best compressor's worst cherry read 226 cherries' worth (120 on average), and laying the dictionary out along tree paths made even "every cherry in the dictionary" cheap to read ([[#measured-reading-one-cherry]]). So the Bench's best numbers, 0.636 at 4096 and 0.618 at 16 384, are entropy rates. A fixed-length version of the same stages, and a GPU decode timed against the 10× rule, are the next experiments in [[#plan-decoder-speed]] and [[#plan-next-in-the-harness]]; a one-bit gap would put the engineering number near 0.76.

::: aside source Receipts
"Every coder here is an entropy coder (rANS); no fixed-length rate was measured": PART-XI-SPEC §1.12. Reads: env-t0096 (mean 120.4, p99 184, max 225.8, every entry counted cold); "a budget of 293 for every entry costs nothing at 4096 and above": spec §1.9. Closed-form checks: `figures/data/plan-harness.json`, `rates_check`.
:::

::: takeaway
- The Bench's numbers are entropy rates; the fixed-length rate, and a timed GPU decode, are still to be measured.
- The leash's cost was measured and was small; the width's cost was not.
:::
