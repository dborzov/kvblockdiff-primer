---
title: One accounting rule for every rung
nav: The accounting rule
group: The harness
lede: A restaurant bill has the dish, a service charge and a share of the table everyone sat at. Every dictionary coder's rate has the same three lines, and the harness charges all three, always.
cards:
  - q: 'What are the three parts of a coder''s rate in bits per element?'
    a: Residual bits, the per-entry tax, and the dictionary's bytes amortized over its block
    wrong: ["Keys, values and queries", "Exponent, mantissa and sign", "Fit time, encode time and decode time"]
    why: 'The dish, the service charge and the shared table: what the residual costs, what each entry pays for its own pointer or index, and $8\vw/\vb$ for the dictionary.'
    sec: bill
  - q: 'A VQ codebook weighs $\vw = 256$ entries'' worth. What does it cost per element at $\vb = 512$?'
    a: 4 bits — half of the raw 8
    wrong: ["0.5 bit", "0.0625 bit", "256 bits"]
    why: '$8\vw/\vb = 8 \cdot 256 / 512 = 4$. No residual saving can pay for that; VQ needs blocks of 8K entries or more.'
    sec: bill
  - q: Why does the harness report two rates for every point?
    a: The entropy rate is what an ideal coder would reach; the fixed-length rate is what a fast random-access GPU format reaches
    wrong: ["One is for keys and one is for values", "One is in bits and the other in bytes", "One includes the dictionary and the other does not"]
    why: Both include every tax. They differ only in how the residuals are coded, and the gap between them is the price of random access.
    sec: two-rates
  - q: In the harness's fixed-length format, how is an escaped element marked?
    a: 'Its field holds the one value the width rule never uses, $-2^{\vn-1}$, and its raw code follows the entry'
    wrong: ["By a separate list of positions in the block", "By setting the field to zero", "It is not marked; escapes are dropped"]
    why: The width rule allows residuals with magnitude below $2^{\vn-1}$, so the most negative field value is free to mean "escaped". An escape then costs its 8 raw bits and no position.
    sec: two-rates
  - q: 'Priced the harness''s two ways, the Gull Rock wind''s changes cost 3.46 bits (entropy rate) and 5.02 bits (fixed-length rate). What is the 1.56-bit gap?'
    a: The price of random access — a fixed-width field that lets any one delta be read without the others
    wrong: ["A bug in the Laplace model", "The dictionary share", "The cost of the three escapes alone"]
    why: 'The field spends 5 bits on every change, also on the many small ones an entropy coder would price at 2–3 bits. The three escapes add only 0.02 bit.'
    sec: two-rates
  - q: Which scope gets its dictionary for free?
    a: Global scope — it is fit once on separate calibration data and shared by every request
    wrong: ["Block scope, because blocks are small", "Request scope, because it is loaded once", "None — every scope pays the same"]
    why: A global dictionary costs nothing per request at serving time. Request and block dictionaries are paid by the entries that share them.
    sec: who-pays
---

At a restaurant the bill has three kinds of lines. The dish you ate. A service charge per guest. And, if you booked the private room, the room's rent divided among everyone at the table. Order a cheap dish in an expensive room with two friends, and the room is most of your bill.

A dictionary coder's rate has exactly these three lines. The harness writes every one of them on every bill.

## The bill {#bill}

The rate of a coder, in [[bpe|bits per element]], is

::: aside reminder Dictionary weight and block size
A dictionary's size in entries' worth is its [[weight|weight]] $\vw$, so $\vDsz = \vw\,\ve$ bytes ([[#idea-dictionary-delta-block]]). A [[block]] holds $\vb$ entries. An 8-bit entry has $\vd$ elements of one byte each, so $\ve = \vd$ bytes.
:::

$$
\vbpe = \underbrace{\text{residual bits}}_{\text{the dish: entropy or fixed-length}}
+ \underbrace{\vtax}_{\text{per-entry tax: } \log_2 \vC \text{ for VQ},\ \log_2 \vb \text{ for sib}}
+ \underbrace{\frac{8\,\vDsz}{\vb\,\vd}}_{\text{the room: } = 8\vw/\vb}
$$ {#eq-plan-bill}

- **Residual bits.** What the exact integer [[residual|residuals]] cost, coded one of two ways (next section).
- **The [[entry-tax|per-entry tax]] $\vtax$.** Whatever each entry must carry besides its residual, spread over its $\vd$ elements: a [[vq|VQ]] index of $\log_2 \vC$ bits, a [[sib]] pointer of $\log_2 \vb$ bits, the coefficients of a partial transform.
- **Dictionary share.** The dictionary's bytes divided among the $\vb\,\vd$ elements that share it. With $\vDsz = \vw\,\ve$ and $\ve = \vd$ bytes, this is the [[amortization]] rule $8\vw/\vb$ of [[#homework-amortization-rule]].

The figure puts four bills side by side, for an entry of $\vd = 1024$ elements — the entry size of the model we will measure ([[#plan-data]]).

::: figure fig-plan-bill planBill
**Four bills at one block size.** Each bar is the rate of one dictionary type in bits per element: residual (lapis), per-entry tax (vermilion), dictionary share $8\vw/\vb$ (saffron). The dashed line marks raw storage, 8 bits. Weights include 3 bytes per channel of coder settings that the harness also charges (centre, scale and width): loc $\vw = 4$; KLT rank 16 $\vw = 35$ (16 basis vectors in BF16); VQ $\vw = 259$ (16 sub-codebooks of 256 centroids on 64-element pieces); sib $\vw = 3$. Per-entry taxes: KLT 16 coefficients per entry at an **assumed** 8 bits each; VQ one byte per 64 elements; sib $\log_2 \vb$ bits per entry. The residual is **one assumed value for all four**, so that only the taxes differ — the real residuals are what wave 1 measures. Slide the block size and the residual; hover a bar for its lines.
:::

::: try
1. Set $\vb = 256$. VQ's dictionary share alone is about 8 bits: the room costs more than the raw meal.
2. Slide $\vb$ up to 8K. VQ's share falls to a quarter of a bit; loc's was never visible.
3. Set the residual to 7.5 bits. Now even loc's tiny share decides whether the bill beats raw.
:::

::: takeaway
- Rate = residual bits + per-entry tax + dictionary share $8\vw/\vb$.
- Heavy dictionaries are not wrong, only expensive: their room must be shared by thousands of entries.
:::

## Two rates, always both {#two-rates}

The residual line of the bill can be priced two ways, and the harness always prints both ([[#homework-two-rates]]).

- The [[entropy-rate|entropy rate]] prices the residuals as an ideal [[entropy-coder|entropy coder]] would: by their [[cross-entropy]] under a fitted model. It is the scientific number.
- The [[fixed-length-rate|fixed-length rate]] prices them as a fast GPU format would: every channel gets a fixed width $\vn$, and rare outliers [[escape]]. It is the engineering number, and directly the size of a delta.

Here are the source's four functions, made runnable. The models are always fit on the **fitting set** and evaluated on the block being coded.

```python the two rates and the dictionary share (analysis/plan_harness.py)
ALPHABET = np.arange(-255, 256)        # every difference of two 8-bit codes fits in here

def laplace_fit(r):
    """Per channel: an integer centre m and a scale beta of a Laplace model of residuals r (rows, d)."""
    m = np.round(np.median(r, axis=0))
    beta = np.maximum(np.abs(r - m).mean(axis=0), 0.25)
    return m, beta

def entropy_rate(r, m, beta):
    """Cross-entropy of residuals r under the per-channel discretized Laplace (m, beta), bits per element."""
    assert r.min() >= ALPHABET[0] and r.max() <= ALPHABET[-1], "residual outside the 8-bit alphabet"
    logp = -np.abs(ALPHABET[None, :] - m[:, None]) / beta[:, None]      # (d, 511), not yet normalized
    logp -= np.log(np.exp(logp).sum(axis=1, keepdims=True))               # normalize each channel
    idx = r.astype(np.int64) - ALPHABET[0]                                # residual value -> column
    return float(-logp[np.arange(r.shape[1])[None, :], idx].mean() / np.log(2))

def fl_widths(r, eps=0.005):
    """Per channel, the smallest width n with |r| < 2^(n-1) for all but a share eps of rows.
    n >= 1, because the field value -2^(n-1) (never used by a residual) marks an escape."""
    # eps caps the escapes: they are the decoder's slow path
    q = np.quantile(np.abs(r), 1 - eps, axis=0, method="higher")
    return np.maximum(np.ceil(np.log2(2 * q + 1)), 1).astype(np.int64)

def fixed_length_rate(r, n):
    """n[c] bits per field, plus 8 bits for every escaped element (its raw code)."""
    return float((n[None, :] + 8 * (np.abs(r) >= 2.0 ** (n - 1))).mean())

def side_bits(dict_bytes, b, d):
    """A dictionary's bytes, spread over the b entries x d elements that share it: 8 w / b."""
    return dict_bytes * 8.0 / (b * d)
```

Three details differ from the source, and each one matters.

1. **Widths are fit on the fitting set.** The source fit them on the coded block itself, which quietly flatters the global scope: its dictionary was supposed to see only other documents.
2. **Escapes cost 8 bits, not 8 plus a position.** A width $\vn$ allows residuals of size below $2^{\vn-1}$, so the field value $-2^{\vn-1}$ is never needed and can mean "escaped; the raw code follows". Each entry carries its own escapes and stays decodable alone.
3. **Out-of-range residuals fail loudly.** The source clipped them into the alphabet, which would hide a bug.

The rate functions were tested against answers known in closed form. Residuals drawn from a [[laplace|Laplace]] distribution of scale $\vbeta = 3$ have an entropy of 4.015 bits; the fitted model charges 4.035 bits, and a histogram of the same residuals gives 4.034. Residuals spread evenly over −3…3 get 3-bit fields and a fixed-length rate of exactly 3.000.

Closed forms check the code. Data you have met shows what the two numbers mean. Here is the Gull Rock wind of [[#school-fixed-length]], predicted by "the same as last time" as on [[#school-exchange-rate]]: each reading's change since the one before, run through the four functions above.

::: dataset fig-plan-wind-rates plan-wind-rates view=histogram,cost hl=esc metrics=fit,entropy,width,escapes,fixed,gap
**The wind's changes, priced the harness's two ways.** *The changes and the field:* how often each change in knots occurs (bars), the fitted Laplace model scaled to the 1,023 changes (curve), and the range a 5-bit field holds (green band); the three escapes fall outside it and are marked. Hover a bar for its price both ways; click it to select those readings. *Bits, reading by reading:* each change's price under the model (lapis) and in the fixed-width field (peacock, with a raw byte added at each escape), over the three weeks. *Numbers:* both rates and what they are made of. The changes are their own fitting set here (one block). Synthetic data, seeded; the readings of II.9.
:::

Three things to notice.

- **The model is good enough.** It charges 3.46 bits per reading, a few hundredths above the 3.39 of the changes' own histogram.
- **The field is not free.** Five bits hold every change but three, so the fixed-length rate is 5.02 bits: 1.56 bits above the ideal. That gap is the price of reading any one delta without the others.
- **Escapes are rare by design.** The three that escape are the storms' steepest jumps, 17 to 20 knots in half an hour. Each costs 8 extra bits, and none breaks the rule that a delta decodes alone.

::: takeaway
- The entropy rate is the ideal; the fixed-length rate is what a fast random-access decoder pays. Both include every tax.
- Escapes are marked by the one field value the width rule never uses, so each delta stays self-contained.
- The rate code is tested against closed-form answers before it touches data.
- On the Gull Rock wind the two rates differ by 1.56 bits: what random access costs there.
:::

## Who pays for the dictionary {#who-pays}

The third line of the bill depends on the scope, and the rule is short.

| scope | fit on | who pays the dictionary | amortized over |
|---|---|---|---|
| [[scope-global\|global]] | separate calibration sequences, offline | nobody (one copy per GPU) | — |
| [[scope-request\|request]] | the whole sequence | the request's own entries | its $\vL$ entries |
| [[scope-block\|block]] | the block itself | the block's entries | its $\vb$ entries |

Two consequences follow.

- **Request scope is block scope with $\vb = \vL$.** The same code path, with the block stretched to the whole sequence. One of the controls checks this to the bit ([[#plan-controls]]).
- **The coder's own settings are part of the dictionary.** A narrow-scope dictionary must also ship its coder's model: per channel a centre, a scale and a width, which the harness charges at 3 bytes per channel, plus a one-bit "predict or not" flag when the coder uses one. That makes loc weigh $\vw = 4$ instead of the $\vw \approx 2$ of [[#homework-loc]] — still under 0.07 bit per element at $\vb = 512$.

::: theme every-tax
Even the coder's own model is a tax. A narrow scope must ship it with every dictionary, and the harness charges it like any other byte.
:::

::: takeaway
- Global scope is free at serving time; request and block scopes pay for their dictionaries in full.
- Request scope is block scope with $\vb = \vL$.
- Every byte a decoder needs is on the bill — including the coder's settings.
:::
