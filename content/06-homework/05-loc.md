---
title: 'loc: the Anchor'
nav: 'loc: the Anchor'
group: Four dictionaries
lede: 'The lightest dictionary there is: for each channel of a block, one typical value and one spread. It charges no tax on any entry, costs about two entries'' worth per block, and goes after exactly what the Hermit cannot see — values that drift from block to block.'
cards:
  - q: What does a loc dictionary store?
    a: For each channel, a location (typical value) and a scale (typical spread)
    wrong: ["A rotation matrix for the block", "A codebook of prototype entries", "A pointer to the most similar entry"]
    why: 'Two numbers per channel, so about 2 entries'' worth: $\vw \approx 2$. Every entry is predicted by the same per-channel locations.'
    sec: anchor
  - q: What per-entry tax does loc charge?
    a: None
    wrong: ["log₂ C bits per entry", "log₂ b bits per entry", "One byte per element"]
    why: The prediction is the same for every entry of the block, so nothing needs to be said per entry.
    sec: anchor
  - q: 'A channel''s values have total variance 4 across all blocks and variance 1 inside each block. What does loc save on it?'
    a: 1 bit per element
    wrong: ["2 bits per element", "0.5 bit per element", "Nothing — subtracting a constant never helps"]
    why: '½ log₂(σ²_total / σ²_within) = ½ log₂ 4 = 1 bit. Block means explain 75 % of the variance.'
    sec: gain
  - q: Why does subtracting one fixed, global location per channel save nothing for an ideal entropy coder?
    a: Entropy does not depend on where a histogram sits, only on its shape
    wrong: ["Because the location costs too many bytes", "Because subtracting is not lossless", "Because channels are independent"]
    why: 'Shifting every value by the same constant leaves every probability unchanged. The Anchor''s gain comes from locations that change from block to block — drift. (A fixed-length code is different: there, centring narrows the code.)'
    sec: gain
  - q: When does loc lose bits compared with solo coding?
    a: Only by its own small dictionary cost (8 × 2 / b bits per element), or on the E4M3 grid when the prediction is poor
    wrong: ["Whenever the data has no clusters", "Whenever the block is longer than 1024 entries", "Always, because it pays a per-entry tax"]
    why: 'With no drift it gains nothing and pays 16/b bits per element — 0.004 bit at b = 4096. In E4M3 index space a poor prediction can cost more, which the per-channel flag of VI.11 catches.'
    sec: gain
---

Here are the first four entries of two blocks of the same request, three channels each, as [[integer-grid|INT8]] codes: block A holds tokens 0–3, block B tokens 4096–4099. (Illustrative numbers; the Table tab has them all.)

::: dataset fig-hwa-two-blocks homework-two-blocks view=values,resid metrics=anchors,r2,gain,avg
**Two blocks, three channels.** *Values and anchors:* each channel's codes (dots joined by lines) for the four entries of block A (left) and block B (right), with the grey gap between the blocks; the dashed segments are each block's anchor for that channel, its median rounded down, with its value. *Residuals:* each code minus its block's anchor, on one shared scale. Hover a token for its three values and residuals. Hand-made toy numbers.
:::

Notice anything?

## Drop anchor on every channel {#anchor}

Inside one block, two of the three channels hardly move. The "big" channel sits near 97 in block A and near 88 in block B. The "drifter" sits near 12, then near −20. Only the "noisy" channel jumps around everywhere.

The Hermit of [[#homework-solo-coding]] codes each channel with one global code, fit to all blocks of all requests. For "big" and "drifter" it must be ready for every value the channel ever takes. If the block told it "this time, expect about 97", the leftover would be tiny. That is the whole idea of the first dictionary.

::: define loc
- **What:** a dictionary holding, for each [[channel]] of a [[block]], a **location** (a typical value, e.g. the median) and a **scale** (a typical spread, which sets the width of the residual code). Every element is predicted by its channel's location; the exact difference is stored.
- **Weight:** two numbers per channel, so about two entries' worth: $\vw \approx 2$.
- **Per-entry tax:** none. Every entry of the block uses the same prediction.
- **Not to confuse with** the Hermit's code tables: those are global and fixed; the Anchor's locations belong to one block (or one request) and follow its drift.
:::

Run the toy through it, with each block's median (rounded down) as its anchor. Block A's anchors are (97, 12, −5), block B's are (88, −20, 10), and the residuals are:

| | block A residuals | block B residuals |
|:---|:---:|:---:|
| "big" | 0 · 0 · −1 · +1 | 0 · +1 · −1 · 0 |
| "drifter" | 0 · +3 · −2 · +1 | 0 · +3 · −2 · +1 |
| "noisy" | −26 · +27 · +10 · −9 | +8 · −50 · −7 · +17 |

Two channels collapse to a few small integers. The noisy one stays noisy: an anchor cannot predict what does not stay put.

::: aside reminder Mean, variance, and the channel (II.11, II.13)
A [[channel]] is one position $\vc$ across many vectors — one sensor's column ([[#school-vectors]]). Its [[variance]] $\vsigma^2$ is the average squared distance from its [[mean]] ([[#school-residual-shapes]]). The variance *inside* a block, around the block's own mean, is never larger than the variance around the global mean.
:::

Switch the card above to *Residuals* to see it: two flat lines hugging zero and one zigzag. Its Numbers tab puts a size on it. Block means explain about 98 % of the variance of "big" and "drifter", and 2 % of "noisy". By the exchange rate of [[#homework-exchange-rate]] that is about three bits per element for the first two and nothing for the third — and the entry's saving is the plain average over its channels, about two bits.

::: takeaway
- loc stores one location and one scale per channel per block: $\vw \approx 2$, no per-entry tax.
- Each element is predicted by its channel's location; the residual is the exact difference.
- It shrinks channels that sit still inside a block, and leaves noisy channels alone.
:::

## What the Anchor buys {#gain}

How many bits does an anchor save on a channel? The residual's spread is the spread *within* a block, $\vsigma_{\text{within}}$; the Hermit faces the spread over all blocks, $\vsigma_{\text{total}}$. For bell-shaped values the exchange rate of [[#homework-exchange-rate]] gives, per element:

$$
\begin{aligned}
\vgain_{\text{loc}} &= \frac12 \log_2 \frac{\vsigma^2_{\text{total}}}{\vsigma^2_{\text{within}}} \\
&= \frac12 \log_2 \frac{1}{1 - \underbrace{\vRsq}_{\text{explained by block means}}}
\end{aligned}
$$ {#eq-hwa-loc}

The two forms are the same statement: block means explain the share $\vRsq = 1 - \vsigma^2_{\text{within}}/\vsigma^2_{\text{total}}$ of the channel's variance. The entry's saving is this gain averaged over its $\vd$ channels; the cost is 0 per entry plus $8 \times 2/\vb$ per element for the dictionary.

::: figure fig-hwa-loc hwaLocGain
**One channel over eight blocks.** Dots: 48 values per block of one channel (seeded illustrative data: each block has its own typical value, plus noise). Grey band: what the Hermit sees, the global mean ± one global standard deviation. Coloured segments: the Anchor's prediction, each block's median, with ± one within-block standard deviation. **Slide** the share of the channel's variance that comes from block-to-block drift. The tiles give the measured variances and the gain $\tfrac12\log_2(\vsigma^2_{\text{total}}/\vsigma^2_{\text{within}})$ in bits per element, before the dictionary's $8 \times 2/\vb$.
:::

::: try
1. Set the drift share to 0. The segments sit on the global mean: the Anchor saves nothing (a few hundredths of a bit, from fitting noise).
2. Set it to 75 %. The within-block spread halves: one bit per element.
3. Go to 95 %. The channel is nearly constant inside each block: over two bits.
:::

Three things to keep in mind about this gain.

- **A fixed global location saves nothing for an ideal entropy coder.** Entropy depends on the shape of a histogram, not on where it sits. The Anchor's gain over the Hermit comes from locations that *change* — from block to block, or from request to request. (For a fixed-length code it is different: centring a channel is what lets its code be narrow, so even a global anchor helps there.)
- **Outlier channels are the Anchor's best customers** — channels with very large, slowly drifting values, reported for keys before [[rope|RoPE]] is applied ([[#papers-kivi]]). But [[#homework-exchange-rate]] warned: a few channels saving many bits are a few bytes of a 640-byte entry.
- **The dictionary is almost free, not free.** $8 \times 2/\vb$ bits per element: 0.06 at $\vb = 256$, 0.004 at $\vb = 4096$, but a full bit at $\vb = 16$.

On the synthetic "drift" world of [[#homework-four-side-by-side]] — block means explaining 60 % of the variance, so a formula gain of 0.66 — the measured loc saving was **+0.64 bit per element** after paying for its dictionary, the best of all four types there.

::: note warning The Anchor on the E4M3 grid
All of this assumes residuals are counted on a uniform grid. On the logarithmic E4M3 grid, subtracting a location in [[index-space]] can cost bits instead of saving them, unless the location explains most of the variance. [[#homework-the-grid]] measures it and adds a one-bit "predict or not" flag per channel.
:::

::: takeaway
- loc saves $\tfrac12\log_2(\vsigma^2_{\text{total}}/\vsigma^2_{\text{within}})$ per channel: 75 % of the variance in block means buys one bit.
- It wins on drift and on slowly drifting outlier channels; it gains nothing on channels that do not drift.
- It costs $16/\vb$ bits per element and no tax, so it is the first dictionary to try.
:::
