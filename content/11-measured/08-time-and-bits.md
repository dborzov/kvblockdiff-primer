---
title: Sound, time and bits
nav: Sound, time and bits
group: What lost
lede: 'Two instincts from the outside world went into the harness: that tokens are a time axis like the samples of a sound, and that an FP8 byte should be compressed field by field. Prediction survived, time did not, and the bit fields turned out to be a story rather than a loss.'
cards:
  - q: An order-8 filter along tokens, FLAC-style, saves up to 0.33 bit per element on its own. How much after a reference entry?
    a: At most 0.06 bit, and that is not a code that can exist
    wrong: ["Another 0.33 bit", "About 0.2 bit", "Exactly zero"]
    why: In the middle layers the reference very often is a token a few steps back, so it already collects what the filter would. The leftover needs the whole past, which no read budget allows.
    sec: along-tokens
  - q: Where do references point in the middle layers (L7, L11, L15), compared with L3, L19 and L23?
    a: 37–47 % within 8 tokens against 7–12 %; chains along the text against hubs on repeated tokens far apart
    wrong: ["Always to the adjacent token", "Uniformly over the block in every layer", "To the first token of the block"]
    why: Two kinds of tree. A pointer in a chain costs 6.6–7.4 bits; a pointer to a hub about 10.
    sec: along-tokens
  - q: At 512 tokens, what beat the best fully paid prediction rule?
    a: A rule the decoder learns from entries it has already decoded (0.68938 against 0.6960)
    wrong: ["A neural network stored in the dictionary", "A FLAC filter along tokens", "A bigger codebook"]
    why: 'At 512 tokens the block cannot pay for the rule: the amortization rule of VI.14, in action. At 4096 tokens the paid rule leads again.'
    sec: along-tokens
  - q: Which single measurement showed that the linear structure of the values is hidden by the FP8 grid?
    a: 'A shared-bits estimate on values matched real code lengths (0.278 against 0.263, r = 0.9993), while the same estimate on the FP8 code index read 0.104, three times too low'
    wrong: ["The mantissa kept 2.80 of its 3 bits", "The floor moved from 0.37 to 0.50", "The skew of the error was −0.03"]
    why: The structure is in the values. Counting in grid steps hides two thirds of it, which is exactly the worry of VI.11 and IX.5.
    sec: values-not-bits
  - q: The same prediction error, measured two ways. How skewed is it?
    a: '−0.03 in value, −1.60 in the code index'
    wrong: ["−1.60 in value, −0.03 in the code index", "Symmetric either way", "−13.4 in value"]
    why: FP8 cells narrow toward zero, so a symmetric error in value looks lopsided in grid steps. A logistic in value, integrated over the cell, inherits the skew for free.
    sec: values-not-bits
---

The human who ran the campaign asked for two things an audio engineer would ask for. First: do what FLAC does. FLAC walks along a sound, predicts each sample from the few before it, and codes the small correction ([[#school-prediction/family]]). Tokens look like time, so a filter along tokens was the first thing to try.

Second, in reply to a notebook from campaign C1 that split every [[fp8]] byte into sign, exponent and mantissa and called the mantissa noise: "FLAC doesn't do it by bit field, because the structure is in the underlying sounds these bit values represent." Both requests went through the harness, and the two verdicts are the two halves of this page.

## Along tokens {#along-tokens}

Values *are* smooth along tokens in the middle layers. One [[channel]] correlates 0.48 with the same channel of the next token at L7, L11 and L15, and the slowest directions of an entry up to 0.98. An order-8 filter along tokens, with nothing else, saves up to 0.33 bit per element (an [[exact-model]] number, four blocks per layer). After a [[reference-entry]] it saves at most 0.06 bit, and even that is not a code that can be built, because the [[reference-tree]] would loop back through the filter's own past. Coding a block serially in token order gains 0.02–0.05 bit, but then one entry needs the whole past to decode, which fails any [[read-budget]].

The reference already knows what the filter knows. Where the references point says why:

| | parent within 8 tokens | largest hub | a pointer costs |
|:--|--:|--:|--:|
| L7, L11, L15 | 37 / 47 / 39 % | 6–10 entries | 6.6–7.4 bits |
| L3, L19, L23 | 9 / 7 / 12 % | 12–22 entries | about 10 bits |

(24 blocks, two sequences.) Middle layers build **chains** along the text, where this token looks like the last one. The first and last layers build **hubs**, where many far-apart repeats of one token hang off one copy. The primer's [[#idea-fallen-apple]] comes out half right: nearness matters in the middle layers, and in the others the axis is repetition rather than distance.

::: figure fig-msr-time msrTime wide
**Two panels.** Left: bits per element at layer 7 with no reference entry, three bars: no prediction 6.435; a linear rule 5.804; a small neural network 5.636 (one run, exact model, fit on one sequence and tested on the other; in a control the network recovered only 45 % of a planted term, so read the last step as at most about 0.02). Right: the share of reference pointers that land within 8 tokens, by layer (24 blocks, two sequences). Hover a bar for the sample behind it. Data: `measured-time.json`.
:::

Three more audio ideas went the same way.

- **Adaptive filters** (as in the lossless audio format Monkey's Audio) relearn their weights as a sound's statistics drift. Inside a block of values the relation between channels is stable and only the entry's position changes: audio changes its weights, values change their state. A filter learning inside the entry reached about a tenth of a rule shared by the block.
- **A neural network** helps when there is no reference (left panel) and added about nothing once a reference and prediction were in place. Picking the nearest earlier entry is itself a nonlinear predictor; it takes the curvature out before the network sees it.
- **What did survive inside an entry.** Coder 126 lets each entry blend the prediction errors of its ancestors on the tree, working out the blend while decoding and sending no byte: 0.64074 against 0.64494 for coder 102, on 72 of 72 blocks, verified.

And one idea reverses at small blocks. At 512 tokens a rule *learned by the decoder* from entries it has already decoded beats the best stored one: 0.68938 (coder 113, verified, every entry counted) against 0.6960. This is [[#homework-amortization-rule]] in action. A stored rule costs $8\vw/\vb$ bits per element; at $\vb = 512$ the block cannot pay for it, so the decoder fits most of it from what it already holds. At 4096 tokens the paid rule leads again.

::: theme predict-correct
FLAC's shape, guess and then store only the surprise, won the day; its axis did not. Pointed across the channels of one entry instead of along tokens, the same linear algebra became the campaign's biggest gain ([[#measured-two-kinds-of-structure]]).
:::

::: takeaway
- Along tokens, prediction saves up to 0.33 bit alone and at most 0.06 after a reference; the reference already collects it.
- Middle layers form chains (37–47 % of parents within 8 tokens); the others form hubs on far-apart repeats.
- A reference is itself a nonlinear predictor, so networks and adaptive filters add about nothing after it. What survives is a free blend of ancestors (coder 126) and, at 512 tokens, a rule the decoder learns.
:::

## Values, not bits {#values-not-bits}

Campaign C1's notebook ended night one with a story: *the mantissa is noise; everything compressible sits in the sign and the exponent; the floor is 0.37.* Campaign C2 put a researcher on it as prosecutor, auditing 17 of C1's conclusions against the data. The ruling, in the campaign's words: guilty as an explanation, not guilty of losing bits.

- **The floor was false.** It assumed a perfect coder for the sign and [[exponent]]. A real model of one head from its token and local history pays about 0.50 (48 blocks); the old number was too low on most layers and too high at L3. Even 0.50 is a floor for that class of model only.
- **The framing cost almost nothing.** C1's best coders already predicted in value. The one truly bit-field design decision lost its re-test by at most 0.009 of ratio (exact model, 48 of 48 rows).

The decisive measurement is one pair of numbers. An estimate of how many bits the two heads of a layer share, made on the real *values*, agrees with real code lengths: 0.278 against 0.263, correlating 0.9993 over 66 pairs of cells. The same estimate made on the code index (the FP8 byte read as a whole number from 0 to 252) reads 0.104, three times too low.

::: pull
The linear structure is in the values, and the logarithmic grid hides it.
:::

This is the worry the primer wrote down before the data. [[#homework-the-grid]] showed that on E4M3 a small miss near zero becomes many grid steps, and [[#plan-fp8-target]] proposed the [[grid-aware-model]]: describe the value rather than the code number, and give each byte the area of a bump over its grid cell. The campaign's coders do exactly that, with a logistic curve (a bell-shaped cousin of the [[laplace]] bump) centred on the prediction in value and integrated over the FP8 cell. Two things fell out for free.

- **The skew.** The same prediction error has skew −0.03 measured in value and −1.60 counted in grid steps (−13.4 where the predicted value is large). FP8 cells narrow toward zero, so a symmetric error in value looks lopsided in steps. A coder that subtracts in value inherits the skew; one that subtracts code indices must model it.
- **The shape is finished.** Any change to the error curve (a skew, a shrink, a mixture, a scale that follows magnitude) gains at most 0.014 bit per element, unpaid and in-sample.

::: theme grid-matters
Here the grid decided what a measurement could *see*: two thirds of the shared bits between heads vanish when the estimate is made on code indices. The primer's grid-aware model was the right precaution, and the campaign's logistic over the FP8 cell is its working form.
:::

One footnote. The primer's own [[#missed-mantissa-and-grid]] said BF16's low mantissa bits behave like coin flips, and there C1 agreed (bf16 costs about half the fp8 ratio plus 0.25; the low four bits are noise). "Noise" was right; "a bit position is the boundary" was the mistake.

::: aside source Receipts
- FLAC-style filters and serial coding: r16 iter-1-1 to 1-3 (exact model, 4 blocks per series). Where references point: r6 iter-2-1 (24 blocks). Adaptive filters: r17 iter-1-1. Neural network: r21 iter-1-1 (one run, L7).
- Coder 126: r20-t0001 (0.64074) against r11-t0002 (0.64494), both isolated. Learned rule at 512 tokens: r21-t0001 (coder 113, 0.68938, every entry counted) against r17-t0002 (coder 106, 0.69602) and r21 iter-1-2 (0.6960).
- The audit: r13 iter-1-1 to 1-5 (floor 0.50 on 48 blocks; framing cost ≤ 0.009). Shared bits 0.278 / 0.263 / 0.104: r9 iter-1-1 to 1-3. Skew: r15 iter-1-1 (12 blocks, head 0). bf16 ≈ fp8/2 + 0.25: C1, spec §1.4.
- Notes: `notes/03-structure-and-method.md` §4, `notes/02-what-v-is-and-values-not-bits.md` §7; spec §1.8.
:::

::: takeaway
- C1's "mantissa is noise, floor 0.37" was a wrong story that cost at most 0.009; the real floor for a local one-head model is about 0.50.
- Shared bits estimated on values match real code lengths (0.278 against 0.263, r = 0.9993); on the code index the estimate is three times too low.
- Model in value and integrate over the FP8 cell: the skew comes free (−0.03 against −1.60), and no curve shape gains more than 0.014.
:::
