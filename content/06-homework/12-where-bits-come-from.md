---
title: Where the bits would come from
nav: Where the bits would come from
group: Rates and grids
lede: 'Before measuring anything, write down where you expect the savings to be, so the data has something to contradict. Our prior: most of it in a few key channels, little in the values, and a real effect of the number format. Then a sober sum of what that prior could add up to.'
cards:
  - q: Why do we expect most dictionary gains in the keys, and why keys before RoPE?
    a: Keys are reported to have a few channels with very large, slowly varying values; RoPE's position-dependent rotation smears that per-channel structure
    wrong: ["Because values are always zero", "Because RoPE compresses the keys", "Because keys are stored in INT8"]
    why: Storing keys before RoPE and applying the rotation after decoding is cheap, and keeps the structure a loc dictionary can catch.
    sec: prior
  - q: In a model with MLA (as in the reference setting), what is different about the prior?
    a: An entry is one compressed latent vector (plus a small position part), not separate keys and values — so the keys-versus-values split does not apply directly
    wrong: ["Nothing — MLA stores keys and values separately", "MLA entries are lossless already", "MLA has no channels"]
    why: The K/V prior comes from models like the proxy (separate keys and values per head). For MLA latents it has to be measured afresh.
    sec: prior
  - q: 'If values compress no better than solo coding, and keys save 1 bit per element over a 7.24-bit fixed-length solo rate, what is the entry''s delta ratio?'
    a: About 0.84
    wrong: ["About 0.5", "About 0.1", "Exactly 1"]
    why: 'Keys 6.24 bits, values 7.24 bits, average 6.74 bits per element: ρ ≈ 6.74/8 = 0.84. That is the draft''s "ρ capped near 0.85".'
    sec: sum
  - q: '16 key channels out of a 640-element entry each save 3 bits. What does that add up to per element of the entry?'
    a: About 0.075 bit
    wrong: ["3 bits", "About 1.5 bits", "About 0.5 bit"]
    why: '16 × 3 = 48 bits per entry, over 640 elements. Outlier channels compress well but are few bytes.'
    sec: sum
---

A forecaster writes tomorrow's forecast down *before* looking out of the window, so that the window can prove her wrong. The same discipline applies here. Measurements of KV caches at 8 bits do not exist yet; [[#questions-q1]] asks for them. What follows is our prior: where we expect bits to come from, and how much they could add up to. It is meant to be replaced.

## A prior, written down before the data {#prior}

Three sources of structure, in the order we expect them to matter:

| part of the entry | what is reported (in our words) | who would catch it | our expectation |
|:---|:---|:---|:---|
| **keys, stored before RoPE** | a few channels with very large, slowly varying values; low rank across tokens | [[loc]] for the big channels (fit per request; per block for drift); [[klt]] if the low rank is sharp | most of the gain, concentrated in a few channels |
| **values** | weak per-channel structure; now and then a token with outsized values | little for loc; maybe [[vq]] or [[sib]] if tokens repeat | small gains |
| **number format** | the log grid favours coding alone; a uniform grid favours prediction | the per-channel flag; both grids scored | decides how much of any gain survives |

A few words on each row.

- **Keys before RoPE.** [[rope|RoPE]] turns pairs of key channels by an angle that depends on the token's position, so a channel that sits still before RoPE wobbles after it. The papers that found the big, steady key channels found them before RoPE ([[#papers-kivi]], [[#papers-kvquant]]); storing keys that way and rotating after decoding is cheap ([[#missed-keys-before-rope]]). A loc dictionary fit on a calibration corpus captures the part of those channels that is the same for every request; a per-request or per-block one adds drift. Keys are also reported to be low-rank across tokens ([[#papers-kvtc]]); [[#homework-klt]] showed that only a *sharply* low-rank spectrum pays.
- **Values.** No paper we read reports channel structure in values comparable to keys. We expect small gains, and plan for none.
- **Number format.** [[#homework-the-grid]]: on E4M3, prediction must explain about 70 % of the variance before it saves anything; on INT8, every bit of variance explained counts.

::: note warning The reference setting has no keys and values
The prior above is about models that store separate keys and values per head, like the proxy model the harness starts with ([[#plan-data]]). The production model of the [[reference-setting]] uses [[mla]]: one compressed latent vector per token per layer, plus a small part that carries position. Its channels mix what keys and values are in other models. Whether the "big, steady channels" survive that compression is unknown; the prior has to be re-made for it, from data.
:::

::: theme controls
Here the theme is the reason a prior is written down at all. A measurement that confirms it must also pass the controls — shuffled tokens where every block-local gain must vanish, and synthetic data with a known answer ([[#homework-rehearsal]]) — or it confirms nothing.
:::

::: takeaway
- Prior: most gain in a few key channels (stored before RoPE), little in values, and a number format that decides how much survives.
- For MLA entries, as in the reference setting, there is no key/value split; the prior must be rebuilt from data.
:::

## A sober sum {#sum}

How much could the prior add up to? Two pieces of arithmetic keep it honest.

**Few channels are few bytes.** Say 16 key channels of a 640-element entry are big, steady and predicted almost perfectly: 3 bits saved each, 48 bits per entry. Per element of the entry that is $48/640 = 0.075$ bit. Outlier channels compress beautifully and still move the entry's [[delta-ratio]] by about one percent ([[#homework-exchange-rate]] made the same point).

**Half an entry at the solo rate caps the whole.** If values compress no better than [[solo]] coding, half of every entry stays at the solo rate, whatever happens to the keys. The entry's rate is the average of the two halves:

$$
\vbpe_{\text{entry}} = \tfrac12\big(\underbrace{\vbpe_{\vK}}_{\text{keys}} + \underbrace{\vbpe_{\vV}}_{\text{values}}\big), \qquad \vrho \approx \frac{\vbpe_{\text{entry}}}{8}
$$ {#eq-hwa-entry-split}

With a fixed-length solo rate of 7.24 bits and keys saving 1 bit, that is $\tfrac12(6.24 + 7.24) = 6.74$ bits, $\vrho \approx 0.84$ — the "$\vrho$ capped near 0.85" of the source draft, which reads best as this case. Play with the inputs:

::: figure fig-hwa-where hwaWhereBits
**A what-if sum for one entry.** Inputs: the solo rate (ideal entropy, 6.47 bits, or fixed-length, 7.24 bits — our E4M3 Gaussian numbers), the bits per element a dictionary saves on the key half and on the value half (net, after its tax and dictionary), and, on top, a number of "outlier" key channels with an extra saving each. Bars: bits per element of the key half, the value half and the whole entry; the dashed line is the solo rate. Tiles: the entry's $\vbpe$, its delta ratio $\vrho \approx \vbpe/8$ and its compression against raw. Equal key and value halves of a 640-element entry are assumed. Every input is an assumption, not a measurement.
:::

::: try
1. Set both savings to 0: the entry stays at the solo rate, $\vrho$ = 0.81 (ideal) or 0.91 (fixed-length).
2. Give the keys 1 bit and the values nothing, fixed-length: $\vrho \approx 0.84$.
3. Add 16 outlier channels at 3 bits: $\vrho$ moves by less than 0.01.
4. Find what it takes to reach $\vrho = 0.5$: both halves must save 2.5 (ideal) to 3.2 bits (fixed-length) per element — a predictor explaining 97–98 % of the variance everywhere.
:::

Point 4 is the sobering one. A delta half the size of a raw entry needs predictions that know almost everything about almost every element. Nothing in our prior promises that. What the prior does promise is cheap: a light dictionary, about one bit on the keys, a $\vrho$ around 0.75–0.85 — worth having if it costs almost nothing to load and keep ([[#homework-economics]]), and exactly the kind of number wave 1 can confirm or kill.

::: takeaway
- Outlier channels save many bits each but few bits per element of the entry.
- If values show nothing, the entry's $\vrho$ stays near 0.75 (ideal) to 0.85 (fixed-length) even with a good key dictionary.
- $\vrho = 0.5$ would need 2.5–3.2 bits saved on every element — far beyond the prior.
:::
