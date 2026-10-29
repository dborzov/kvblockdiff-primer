---
title: Keys before RoPE; keys and values as separate problems
nav: Keys before RoPE; K and V apart
group: Design changes
lede: RoPE spins pairs of key channels by an angle that grows with position, smearing a tidy cluster into a ring. Store keys before the spin. And treat keys and values as two problems — if values give nothing, that alone caps the delta ratio near 0.85.
cards:
  - q: A pair of key channels sits near the same point token after token. What does RoPE do to it?
    a: It rotates the pair by an angle that grows with position, smearing the tight cluster into an arc or a whole ring
    wrong: ["Nothing — RoPE only touches queries", "It adds random noise to every channel", "It shrinks the pair toward zero"]
    why: RoPE rotates each pair of key channels by position × that pair's frequency. A per-channel location (loc) can no longer predict a value that keeps turning.
    sec: ring
  - q: Within one block, which RoPE pairs does a block-scope loc dictionary still handle well?
    a: The slow pairs, whose angle changes by much less than a radian across the block
    wrong: ["The fast pairs, which turn once every few tokens", "All pairs equally", "None of them"]
    why: A slowly turning pair traces a short arc inside a block, close to a point. A fast pair traces whole circles.
    sec: ring
  - q: Why store keys before RoPE?
    a: Before the spin the structured channels are nearly constant and cheap to predict; the decoder rebuilds the pre-RoPE key exactly and applies the rotation for the known position
    wrong: ["Because RoPE is lossy", "Because attention never uses rotated keys", "Because pre-RoPE keys are smaller in bytes"]
    why: The rotation after decoding is a cheap element-wise operation. KVQuant also quantizes keys before RoPE.
    sec: ring
  - q: Values stay at their fixed-length solo rate (7 bits per element) and keys reach 6.6 bits. What is the entry's delta ratio?
    a: About 0.85
    wrong: ["About 0.41", "About 0.70", "Exactly 0.5"]
    why: 'The entry''s ρ is the byte-weighted mean of its halves: (6.6 + 7) / 16 = 0.85. Even free keys would leave ρ = 7/16.'
    sec: kv
  - q: If values show nothing beyond solo coding, how should they be stored?
    a: With a global, context-free code — no dictionary, no residency — while dictionaries are spent on keys only
    wrong: ["With the heaviest codebook available", "Raw, never coded", "With per-block dictionaries anyway, to be safe"]
    why: A dictionary that saves nothing still costs weight and residency. Solo coding is free at serving time.
    sec: plan
---

Picture two [[channel|channels]] of a key that sit almost still, token after token: near 5 in one, near 1 in the other. A [[loc]] dictionary predicts both almost perfectly, and the residuals are tiny. Now apply RoPE, the position code most models put into their keys. The pair starts to turn, a little more with every token. Plotted against each other, the tidy dot becomes a ring.

::: note history What the first draft did not plan for
It treated "the entry" as one bag of numbers. Item 14 of the old list splits it twice: *keys before RoPE* (RoPE rotates the structured channels into each other), and *keys and values as separate problems* (values may contribute nothing, which caps $\vrho$ near 0.85).
:::

## A ring where there was a dot {#ring}

::: aside reminder RoPE
[[rope|RoPE]] tells attention where a token sits by rotating each pair of key (and query) channels by an angle proportional to the position $\vt$ ([[#landscape-kv-cache]]). Each pair has its own speed θ. In the original RoFormer recipe the speeds are spread geometrically: for 128-channel heads, the fastest pair turns 1 radian per token (a full turn every 6.3 tokens), the slowest about 0.00012 radian per token (a full turn every ~55,000 tokens).
:::

::: figure fig-missed-rope mbRopeSmear
**One pair of key channels, before and after RoPE.** 2,048 tokens of a toy pair that sits near (5, 1) with small noise (standard deviation 0.25, seeded). Grey: the pre-RoPE values of one block of $\vb$ tokens. Vermilion: the same tokens after RoPE, rotated by $\vt\,\theta$; faint vermilion: all 2,048 tokens after RoPE. Blue dots: each version's block mean — exactly what a block-scope loc dictionary predicts. The readout gives the spread around the block mean (averaged over all blocks and both channels), before and after, and the extra bits per element this costs, estimated as log₂ of the ratio of spreads (bell-shaped residuals). Slide the pair's speed θ and the block size.
:::

::: try
1. At the default speed (0.001 radian per token) and blocks of 64, each block traces a tiny arc: RoPE costs 0.06 bit per element.
2. Slide θ to 0.01. A block now spans 0.64 radian of turning, and the cost jumps to 1.55 bits per element.
3. At θ = 0.1 or 1 (the fast pairs) each block covers the whole ring and the loc prediction is useless: 3.89 bits.
4. Back at θ = 0.01, shrink the block to 16 tokens (0.29 bit), then grow it to 1,024 (3.86 bits). What matters is θ times $\vb$.
:::

So RoPE's damage is uneven. Fast pairs are scrambled at any block size. Slow pairs survive in small blocks and fail in large ones. Either way the fix is the same and cheap: **store the key as it was before RoPE**. The decoder rebuilds the pre-RoPE key bit for bit, then applies the rotation for the known position $\vt$. That is a handful of multiplications per element, outside the hard part of the pipeline. KVQuant quantizes keys before RoPE for the same reason ([[#papers-kvquant]]).

::: note warning What "lossless" is relative to
Lossless means "the stored numbers come back exactly". A system whose baseline stores 8-bit keys *after* RoPE and one that stores 8-bit keys *before* RoPE and rotates them later do not feed attention bit-identical numbers. Switching is a small change in numerics, made once, and the comparison with HiSparse must use the same choice on both sides. An idea of ours, untested: on an integer grid, RoPE itself can be done as three lifting shears ([[#missed-lifting]]). "Un-rotate, code, re-rotate" would then return the post-RoPE codes exactly.
:::

::: takeaway
- RoPE turns a nearly constant pair of key channels into an arc or a ring, and a location prediction stops working.
- The damage grows with the pair's speed times the block size; storing keys before RoPE removes it for every pair.
:::

## Keys and values are two problems {#kv}

The lossy papers agree on a pattern ([[#papers-kivi]], [[#papers-kvquant]]). In our words: before RoPE, a few key channels carry large values that change slowly from token to token. Value channels show much less of this; their surprises come token by token instead. For a coder that means keys are where dictionaries can win and values are where they may not.

The Gull Rock channels of [[#missed-harsh-exchange-rate]] split the same way, and show what such a split does to an average.

::: dataset fig-missed-channels-split missed-channels view=bars hl=giants metrics=split,bits,flag
**Ten days at Gull Rock: a slow half and a quick half.** *Plot:* one bar per channel, the share of its variance explained by its own reading half an hour before; the label above each bar is the bits per reading this saves. The highlight marks the three slow channels. *Numbers:* the saving in each half, and over the whole vector. Synthetic, seeded data from II.14.
:::

The slow three save 2.14 bits per element, the quick two nothing. The whole vector averages 1.29: the quick half holds it down however well the slow half does. Keys and values could split exactly like this.

The entry's [[delta-ratio|delta ratio]] is the byte-weighted mean of its two halves. With equal bytes of keys and values:

$$
\vrho \;=\; \tfrac12\big(\vrho_{\vK} + \vrho_{\vV}\big) \;=\; \frac{\vbpe_{\vK} + \vbpe_{\vV}}{16}.
$$ {#eq-missed-kv-rho}

Suppose values give nothing beyond [[solo]] coding. With the fixed-length coder of the GPU path that is about 7 bits per element ([[#homework-solo-coding]]). Then:

| keys, bits per element | 7.0 (no gain) | 6.6 | 6.0 | 5.0 | 4.0 | 0 (free) |
|---|---:|---:|---:|---:|---:|---:|
| entry $\vrho$ | 0.88 | **0.85** | 0.81 | 0.75 | 0.69 | 0.44 |
| link gain of lever 1, $1/\vrho$ | 1.14× | 1.18× | 1.23× | 1.33× | 1.45× | 2.29× |

The old list's "ρ capped near 0.85" corresponds to keys gaining about 0.4 bit over their solo rate. Even perfect keys could not push the entry below 0.44. Whatever the values do sets half of the answer.

::: theme noise-floor
Values may be mostly the part no predictor can explain. A lossless code still pays for every bit of it, and that floor holds the entry's ratio up however well the keys compress.
:::

::: takeaway
- Before RoPE, keys are expected to carry the predictable structure; values may carry little.
- If values stay at solo, the entry's $\vrho$ is at least 0.44 and realistically near 0.85: lever 1 alone then buys about 1.18× on the link.
:::

## What changes in the plan {#plan}

- **Dump keys before RoPE**, values as they are, and report keys and values separately in every table ([[#plan-data]], [[#plan-fixed-choices]]).
- **Use different coders for the two halves** if the data says so. When values show nothing beyond solo, code them with a global, context-free table: no dictionary, no residency. Spend dictionaries on keys only.
- **Plan for $\vrho$ ≈ 0.85.** Then lever 1 alone moves the link bound by under 1.2×, and the case must also rest on cheaper slots: lever 2 or the victim tier of [[#missed-victim-tier]]. This is risk R2 of [[#plan-risks]].
- **Models without separate keys and values.** With MLA ([[mla]]) an entry is one latent vector, not K and V. The same rule applies to whatever parts the entry has: measure each part's $\vrho$ separately, and average by bytes.

::: takeaway
- Keys pre-RoPE, values as is, always reported apart.
- A value half that will not compress is a design input, not a failure: solo-code it and plan the economics around ρ ≈ 0.85.
:::
