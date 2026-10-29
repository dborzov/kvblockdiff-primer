---
title: Two rates for everything
nav: Two rates for everything
group: Rates and grids
lede: 'The same residuals can be billed two ways: by an ideal entropy coder, which reaches the information-theoretic price, or by a fixed-length code with escapes, which a GPU can decode at gather speed. Every result in this project reports both — and the gap between them is about one bit per element.'
cards:
  - q: What does the entropy rate measure?
    a: What an ideal entropy coder (arithmetic coding, rANS) would pay for the residuals, plus the tax and the amortized dictionary
    wrong: ["The width of the fixed-length code", "The raw size of the entry", "The size of the dictionary alone"]
    why: It is the scientific number — the floor any coder with the same model could reach.
    sec: two
  - q: What does the fixed-length rate measure?
    a: The bits of a per-channel fixed-width code with escapes for the rare large residuals, plus the tax and the dictionary
    wrong: ["The entropy of the residuals", "The bits of a Huffman code", "The bits of the raw 8-bit values"]
    why: It is the engineering number — what a fast GPU decoder achieves, and directly the delta size of the store.
    sec: two
  - q: 'Why does the store use the fixed-length rate for its deltas, although it is larger?'
    a: Every element has the same width, so any entry decodes alone and at gather speed
    wrong: ["Because entropy coders are lossy", "Because fixed-length codes are always smaller", "Because rANS cannot code integers"]
    why: Random access and GPU throughput. A stream coder must decode front to back; the miss path reads scattered single entries.
    sec: two
  - q: For Laplace-shaped residuals at 5–7 bits per element, how far apart are the two rates?
    a: About one bit per element (15–20 % with the best width; more with a 99.5 % coverage rule)
    wrong: ["About 0.01 bit", "About 4 bits", "Exactly the same"]
    why: 'A fixed width rounds up to whole bits and must cover the tail, which costs about a bit over the entropy. SplitZip''s BF16 numbers show a gap of the same size in bits (0.9–1.5).'
    sec: gap
---

Here are sixteen residuals of one channel, after some dictionary did its best:

`0  −1  2  0  1  −3  0  1  −1  0  2  −2  0  1  14  −1`

Two clerks are asked how many bits they need to store them.

- **The first clerk** builds a code fit to how often each value occurs — 0 five times, ±1 six times, and so on — and pays each value its [[surprisal]]. Total: **41 bits**, 2.56 bits per value. (With a code fit to these very sixteen values; that is optimistic.)
- **The second clerk** gives every value the same 3-bit slot, enough for −3 … 3. The 14 does not fit: it becomes an [[escape]], stored as its raw 8-bit value plus a 4-bit note of where it was. Total: $16 \times 3 + 8 + 4 =$ **60 bits**, 3.75 per value.

The second bill is almost half again as large. And the second clerk is the one we will hire.

## The scientific number and the engineering number {#two}

::: aside reminder Entropy coders, fixed-length codes, escapes (II.8, II.9)
- An [[entropy-coder]] such as [[arithmetic-coding]] or [[rans]] spends fractions of a bit, close to each value's surprisal, but it decodes a stream front to back ([[#school-arithmetic]]).
- A [[fixed-length-code]] gives every value $\vn$ bits; rare values that do not fit are [[escape|escaped]]. Any value can be found and decoded alone: [[random-access]] ([[#school-fixed-length]]).
:::

Every rung of the measurement reports two numbers, built on the same accounting ($\vbpe$ = residual + $\vtax$ + $8\vw/\vb$ of [[#homework-dictionary-shape]]); they differ only in how the residual is billed.

::: define entropy-rate
- **What:** the residual billed by an ideal entropy coder: the [[cross-entropy]] of the exact integer residuals under a per-channel model (a discretized [[laplace]] shape, fit on the data the dictionary was fit on), plus tax and dictionary.
- **Meaning:** the scientific number. It says how much structure the dictionary found.
- **Not to confuse with** what a GPU will actually move: no stream coder fits the miss path.
:::

::: define fixed-length-rate
- **What:** the residual billed by a per-channel fixed-width code: the smallest width $\vn$ with $\lvert \vr \rvert < 2^{\vn-1}$ for all but a fraction $\veps$ of the entries, plus every escape at 8 bits for the raw value and $\log_2 \vb$ bits for its position; plus tax and dictionary.
- **Meaning:** the engineering number — what a SplitZip-style GPU decoder achieves, and directly the delta size $\vdsz$ of the store.
:::

The two functions, as the harness computes them (from the source draft, shortened; `r` is a block of integer residuals, one row per entry, one column per channel):

```python the two rates of one block of residuals
import numpy as np
R = np.arange(-255, 256)                       # residual alphabet in 8-bit code space

def entropy_rate(r):                           # per-channel discretized Laplace model, bits/element
    m = np.round(np.median(r, 0)); beta = np.maximum(np.abs(r - m).mean(0), 0.25)
    logp = -np.abs(R[None, :] - m[:, None]) / beta[:, None]
    logp -= np.log(np.exp(logp).sum(1, keepdims=True))
    return (-logp[np.arange(r.shape[1]), r - R[0]] / np.log(2)).mean()

def fixed_length_rate(r, eps=0.005):           # per-channel width + escapes (raw byte + position)
    a = np.abs(r); n = np.ceil(np.log2(2 * np.quantile(a, 1 - eps, axis=0) + 1))
    esc = (a >= 2.0 ** (n - 1)).mean(0)
    return (n + esc * (8 + np.log2(r.shape[0]))).mean()

r = np.rint(np.random.default_rng(1).laplace(0, 8, (4096, 64))).astype(int)  # 4096 entries, 64 channels
print(f"{entropy_rate(r):.2f} vs {fixed_length_rate(r):.2f} bits per element")   # 5.44 vs 7.01
```

::: takeaway
- Entropy rate: what an ideal coder would pay — the scientific number.
- Fixed-length rate: fixed width per channel plus escapes — the engineering number, and the store's delta size.
- Both include the per-entry tax and the amortized dictionary.
:::

## The price of random access {#gap}

On the Laplace residuals of the snippet the two rates are 5.44 and 7.01 bits per element — a gap of 1.6 bits, 29 %. That is much more than the "about 10–15 %" the source draft expected from SplitZip's experience. Where does the gap come from, and which number is right?

::: figure fig-hwa-two-rates hwaTwoRates
**Entropy rate against fixed-length rate for Laplace-shaped residuals.** Horizontal axis: the residual's Laplace scale $\vbeta$ in grid steps (log scale); vertical axis: bits per element. Curves: the entropy of the discretized Laplace distribution (the entropy rate's residual part), the fixed-length rate with the width chosen to cover all but $\veps$ of the residuals (the harness's rule), and the fixed-length rate with the best width (the one minimizing width + escapes). Escapes cost 8 + 12 bits (a block of 4096 entries). **Slide** $\vbeta$ and $\veps$; the tiles give the three rates and the gaps at the current $\vbeta$. Exact sums over the distribution, no sampling.
:::

::: try
1. At $\vbeta = 8$ (entropy 5.44 bits) the coverage rule pays 7.01 bits, the best width 6.39: about one bit above the entropy.
2. Move $\vbeta$ from 4 to 16. The gap in bits barely changes; the percentage shrinks as the rate grows.
3. Raise $\veps$ to 3 %. The coverage rule picks a narrower code and pays more escapes; watch it approach the best width.
:::

The gap has two causes, and both are structural:

1. **Whole bits.** A width is an integer; the entropy is not. On average that rounding costs about half a bit.
2. **The tail.** A Laplace residual has a long tail, and the width must cover almost all of it; escaping more is expensive at 20 bits per escape.

So the honest summary is **about one bit per element** with a well-chosen width — 15–22 % at the 5–7-bit rates that matter — and 1.5 bits with the plain coverage rule. SplitZip's BF16 numbers say the same thing in other units: 1.32× fixed-length against 1.42–1.5× for entropy coders is 12.1 against 10.7–11.3 bits per element, a gap of 0.9–1.5 bits. It looks like 10–15 % only because a BF16 element has 16 bits to divide by. For 8-bit elements, plan on 15–20 %.

::: note practice What the gap buys
The fixed-length rate is not a failure of engineering; it is the price of the access pattern ([[#idea-data-layout]]). Each miss reads one entry, alone, from an arbitrary place, and must decode it in a fraction of the 0.38 ms a layer's step lasts. A fixed width makes decoding a gather, an add and an escape fix-up. A smarter middle ground — a few widths per channel, or a small shared code table per block — could recover part of the bit; it is noted as an option, not assumed.
:::

::: takeaway
- The fixed-length rate sits about one bit per element above the entropy rate for Laplace residuals: whole bits plus the tail.
- That is 15–20 % at 8-bit rates, more than the draft's 10–15 % (which came from 16-bit elements).
- Report both; the store's deltas are billed at the fixed-length rate.
:::
