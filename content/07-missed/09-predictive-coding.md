---
title: "The real home of the problem: predictive coding with side information"
nav: The real home of the problem
group: Fields and tools to think with
lede: The first draft looked for relatives among lossy KV papers and general-purpose compressors. The family that has solved this exact shape for seventy years is lossless predictive coding — and its theory of side information says, in one line, what a δ-miss is.
cards:
  - q: What do FLAC, PNG and JPEG-LS have in common with kv-blockdiff?
    a: Each predicts a value from things the decoder already has, stores the exact integer residual, and codes that residual with a simple code
    wrong: ["Each ships a trained dictionary of byte strings, like zstd", "Each throws away low-order bits it judges unimportant", "Each describes vectors by the nearest centroid of a codebook"]
    why: They are all lossless predictive coders (DPCM). Only what is predicted from what changes — samples, pixels, or a block's dictionary.
    sec: family
  - q: FLAC's order-1 predictor guesses "the same as the last sample". By how much does it multiply the variance of white noise in the residual?
    a: By 2
    wrong: ["By 1 — prediction never adds noise", "By 6", "By 20"]
    why: The residual is the difference of two noisy samples, and the variances of independent noises add. Order 2 multiplies by 6, order 3 by 20. The same arithmetic makes the sib dictionary's noise double.
    sec: family
  - q: What did Slepian and Wolf (1973) show?
    a: Lossless coding can reach H(X | Y) even when only the decoder knows Y
    wrong: ["Side information helps only when both ends have it", "Side information always halves the rate", "Lossless coding with side information needs a trained dictionary"]
    why: The surprise is that the encoder need not see Y. It only has to send which "bin" X falls in; the decoder picks the bin member that fits Y. Practical versions need long blocks.
    sec: side-info
  - q: In kv-blockdiff, where is the side information?
    a: At both ends — the encoder sees the whole block offline, and the GPU holds the block's dictionary when it decodes
    wrong: ["At the decoder only, as in Slepian–Wolf", "At the encoder only", "Nowhere; each entry is coded alone"]
    why: That is the easy, classical case; the rate is H(E | D). The catch is residency — a δ-miss exists only if the dictionary really is on the GPU.
    sec: side-info
  - q: Why does naming the "real home" of the problem change the plan?
    a: It imports finished tools and bounds — residual codes, context modelling, lifting, coding-gain bounds — instead of reinventing them
    wrong: ["It makes the KV papers irrelevant", "It proves that the idea works", "It replaces the need for measurements"]
    why: Lossless audio and image coding already solved most engineering sub-problems of this shape; what they cannot supply is the KV statistics.
    sec: plan
---

When a problem is new to you, the first job is to find out who solved it before, under another name. The first draft of this proposal looked in two neighbourhoods. One was the papers that shrink KV caches by quantizing them ([[lossy]]: they throw bits away, Part V). The other was general-purpose compressors like [[zstd]], built for long streams of text.

Both are neighbours. Neither is home.

::: note history What the first draft did not use
It described kv-blockdiff as a new kind of dictionary compression. It never named the field that has done exactly this since the early 1950s: **lossless predictive coding**, and the information theory of **side information** behind it. Item 8 of the old "What Dima missed" list: *the home of this problem is not KV quantization and not LZ.*
:::

## Same shape, older names {#family}

Record a steady musical note at 16 bits per sample. Neighbouring samples are nearly equal, so a coder can guess each sample from the ones before and store only the miss. That is [[predictive-coding]], the shape Part II taught on the Gull Rock thermometer. Write $\vx_{\vi}$ for sample number $\vi$. The FLAC audio format offers four fixed guesses $\vxhat_{\vi}$:

- **order 0:** guess 0 — store the sample itself;
- **order 1:** guess "the same as last time", $\vx_{\vi-1}$;
- **order 2:** guess "continue the straight line", $2\vx_{\vi-1} - \vx_{\vi-2}$;
- **order 3:** guess "continue the parabola", $3\vx_{\vi-1} - 3\vx_{\vi-2} + \vx_{\vi-3}$.

The residual is then written with a Rice code: a few fixed bits plus a short unary tail, a close cousin of a [[fixed-length-code]] with an [[escape]]. Try all four on a synthetic recording.

::: figure fig-missed-flac mbFlacOrders
**FLAC's four fixed predictors on a synthetic note.** *Left:* the first 240 of 1,024 integer samples, $3000\sin(2\pi \vi/100) + 800\sin(2\pi \vi/37 + 1)$ plus Gaussian noise of standard deviation σ (seeded, so the figure is the same every time). *Right:* the residual of the selected predictor, in sample counts (the axis rescales). *Bottom:* bits per sample when each residual is written with the best single Rice parameter, as FLAC does (without its per-partition refinements); the line marks raw 16-bit storage. The accent bar is the predictor drawn above; the darker blue bar is the best one. Slide the noise; pick the predictor whose residual is drawn.
:::

::: try
1. At the default noise (σ = 4) the order-3 guess wins: 6.3 bits per sample instead of 16, and order 0 needs 13.4.
2. Raise the noise to 10. Now order 2 wins (7.1 bits) and order 3 falls behind (7.7): it multiplies the noise variance by 20.
3. Push it to about 100: order 1 overtakes order 2. The more past samples a guess combines, the more of their noise it drags in.
:::

Points 2 and 3 are worth a second look. A residual is a *difference*, and the variances of independent noises add. Order 1 doubles the noise variance; order 2 multiplies it by 6; order 3 by 20. This is exactly why the [[sib]] dictionary, which predicts an entry from a noisy sibling, starts with doubled noise ([[#homework-sib]]).

The Gull Rock thermometer of [[#school-prediction]] takes the same test. Its four weeks of readings are slow and smooth, with a tenth of a degree of sensor noise on each.

::: dataset fig-missed-temp-orders missed-orders view=bits,hist,day hl=fronts metrics=h0,h1,h2,h3,sd
**FLAC's four guesses on the Gull Rock temperatures.** *Plot:* "Bits per reading" is the entropy of each guess's residual histogram, the bits an ideal coder pays per reading (the line marks the readings' fixed width of 7 bits). "Residual shapes" overlays how often each residual occurs for orders 1, 2 and 3. "One day with a front" shows day 4: the temperature on top, the three residuals below; the highlight marks readings taken while a front passes. *Table:* every reading with its three residuals, in tenths of a degree. *Numbers:* the four costs and the residuals' spreads. Synthetic, seeded data from II.10.
:::

Order 1, the guess of II.10, takes a reading from 6.54 bits to 3.62. Order 2 ties it at 3.61: the straight line follows the slow daily swing, and pays for that in noise. Order 3 is worse by almost a bit, 4.42. A slow, noisy channel wants a short memory.

Now line up the family.

| codec | predicts each value from | stores | codes the residual with |
|---|---|---|---|
| FLAC (audio) | the previous 1–4 samples, or a fitted filter of up to 32 | exact integer residual | Rice codes |
| PNG (images) | the left or upper pixel, their average, or the "Paeth" pick among three neighbours — chosen per row | exact residual | DEFLATE |
| JPEG-LS (images) | a median of three candidates built from neighbours, then a per-context bias correction | exact residual | Golomb codes, one per context |
| lossless JPEG 2000 | an integer wavelet built from [[lifting]] steps | exact coefficients | arithmetic coding |
| [[kv-blockdiff]] | the block's [[dictionary]] (location, basis, centroid or sibling) | exact residual in 8-bit code space | fixed-length codes with escapes |

Notice anything? The bottom row is not a new species. Only the thing predicted from is new: a dictionary fitted to a [[block]], where the others use neighbouring samples or pixels.

::: takeaway
- kv-blockdiff has the exact shape of lossless audio and image coders: predict, store an exact integer residual, code it simply.
- Predictors that subtract noisy neighbours multiply the noise — order 1 by 2, order 2 by 6. The sib dictionary inherits the same penalty.
:::

## Side information, said precisely {#side-info}

::: aside reminder Conditional entropy and mutual information
$\vH(\vX \mid \vY)$ is the average number of bits needed to describe $\vX$ when the receiver already knows $\vY$ — the season almanac of [[#school-side-information]]. It is never larger than $\vH(\vX)$, and the difference is the [[mutual-information]] $\vI(\vX;\vY)$ ([[#school-mutual-information]]).
:::

The theory behind the table above is one line long.

$$
\underbrace{\vH(\vX \mid \vY)}_{\text{bits per item when both ends know } \vY} \;=\; \underbrace{\vH(\vX)}_{\text{bits alone}} \;-\; \underbrace{\vI(\vX;\vY)}_{\text{what } \vY \text{ already says}}
$$ {#eq-missed-side-info}

For us, $\vX$ is an [[entry]] and $\vY$ its block's dictionary $\vD_{\vj}$. A [[delta-miss]] is this equation in hardware. The link carries about $\vH(\vX \mid \vY)$ bits per element because the GPU already holds $\vY$.

Information theory also has a second, stranger version of the story.

:::: compare Who holds the side information?
::: col At both ends
- The encoder sees $\vY$, subtracts its prediction, and sends the residual.
- Rate: $\vH(\vX \mid \vY)$.
- Examples: DPCM, FLAC, a zstd [[trained-dictionary]], kv-blockdiff (the block is in hand when it is encoded offline).
:::
::: col At the decoder only
- The encoder never sees $\vY$. It sends a short "hash" saying which bin $\vX$ fell into; the decoder picks the bin member that fits its $\vY$.
- [[slepian-wolf|Slepian and Wolf]] (1973) proved the rate is *still* $\vH(\vX \mid \vY)$ for lossless coding, given long enough blocks. Wyner and Ziv (1976) did the lossy version: for Gaussian data with squared error, nothing is lost at all.
- Decoding is a search, not a subtraction.
:::
::::

We are in the easy column. The second column would matter only if the decoder's side information were unknown at encode time. One example would be "decode against whichever sibling happens to sit in the [[hot-cache]]". Our read: such a code must be sized for the least helpful neighbour it might meet. Practical versions also need long codewords and iterative decoding, which is far from a gather and an add. It is a curiosity to park, not a tool for wave 1.

::: theme side-info
Here the theme is at its most literal. The δ-miss costs $\vH(\vX \mid \vY)$ only because the dictionary is on the GPU, and "the receiver must really have it" is the whole residency question of [[#idea-blockdiff-step-by-step]].
:::

::: takeaway
- A δ-miss is conditional coding with side information at both ends; its ideal rate is $\vH(\vE \mid \vD)$.
- Slepian–Wolf shows the decoder alone can hold the side information — elegant, but not needed here, and not GPU-friendly.
:::

## What changes in the plan {#plan}

Knowing the family's name turns open questions into look-ups.

1. **Residual codes.** Rice and Golomb codes are the audio and image world's fixed-length-with-escapes, with parameters chosen per partition or context, like our per-block widths ([[#homework-two-rates]]).
2. **Using a prediction without subtracting it.** JPEG-LS chooses its code by context. On a logarithmic grid that is the safe way to use a prediction ([[#missed-context-modeling]]).
3. **Lossless rotations.** Lossless JPEG 2000 rotates integers exactly with lifting ([[#missed-lifting]]).
4. **Bounds.** Transform coding gain and rate–distortion bounds say what a predictor can win before anyone writes it ([[#missed-rate-distortion-bounds]]).
5. **A warning.** Any predictor built from noisy neighbours pays for their noise.

The measuring harness of Part IX ([[#plan-harness-interface]]) is, in this light, a predictive-coding test bench, and the literature to mine includes lossless audio and image coding. What the family cannot supply is how much the KV statistics actually let a dictionary predict.

```graph
id: missed-home-map
columns: [The classic idea, Its exact or practical form, Its job in kv-blockdiff]
nodes:
  - {id: pc, col: 1, row: 1, title: "Predictive coding", text: "Guess, then keep the exact miss.", link: school-prediction, term: predictive-coding}
  - {id: fam, col: 2, row: 1, title: "FLAC, PNG, JPEG-LS", text: "Lossless audio and images.", link: missed-predictive-coding/family}
  - {id: dl, col: 3, row: 1, title: "The delta", text: "An entry's exact residual against its dictionary.", link: idea-dictionary-delta-block, term: delta}
  - {id: ce, col: 1, row: 2, title: "Conditional entropy", text: "Pay only for the news.", link: school-side-information, term: conditional-entropy}
  - {id: cm, col: 2, row: 2, title: "Context modelling", text: "The prediction picks the table.", link: missed-context-modeling, term: context-modeling}
  - {id: er, col: 3, row: 2, title: "The entropy-rate column", text: "The scientific number of every rung.", link: homework-two-rates, term: entropy-rate}
  - {id: klt, col: 1, row: 3, title: "KLT and coding gain", text: "Turn to the data's own axes.", link: school-coding-gain, term: klt}
  - {id: lift, col: 2, row: 3, title: "Lifting", text: "Rotations on integers, exactly.", link: missed-lifting, term: lifting}
  - {id: kr, col: 3, row: 3, title: "A lossless KLT rung", text: "Built only if the bound says so.", link: homework-klt}
  - {id: si, col: 1, row: 4, title: "Side information", text: "What the receiver already holds.", link: papers-classics, term: side-information}
  - {id: td, col: 2, row: 4, title: "Trained dictionaries", text: "Ship the side information once.", link: tiny-files-trained-dictionary, term: trained-dictionary}
  - {id: dm, col: 3, row: 4, title: "The δ-miss", text: "Possible only if the dictionary is resident.", link: idea-blockdiff-step-by-step, term: delta-miss}
edges:
  - [pc, fam]
  - [fam, dl, "same shape"]
  - [ce, cm, "H(X given X̂)"]
  - [cm, er]
  - [klt, lift, "made exact"]
  - [lift, kr]
  - [si, td]
  - [td, dm, "resident"]
```

::: takeaway
- The harness is a predictive-coding test bench; the field supplies its codes, tools and bounds.
- Only the KV statistics are new — and those are what wave 1 measures.
:::
