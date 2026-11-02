---
title: Fallen-apple similarity (token axis)
nav: Fallen-apple similarity
group: The hypotheses
lede: '"The apple does not fall far from the tree." The whole proposal was first bet on this: a cherry should be cheaper given a cherry a few tokens away. Here it is as a curve over the distance, with how a scenario measures it and what the measurement said.'
cards:
  - q: What does fallen-apple similarity claim?
    a: A cherry is cheaper to store exactly given a cherry of the same layer a small token distance away, and the closer, the cheaper
    wrong: ["Cherries inside one stretch are identical", "The indexer keeps picking nearby positions", "The LLM tolerates 2-bit keys without loss"]
    why: 'It is a statement about $\vH(\vE_{\vt} \mid \vE_{\vt-\vgap})$ as a function of the token distance $\vgap$: a curve, not a threshold.'
    sec: curve
  - q: Why is it defined as a curve over Δ rather than "alike within a stretch"?
    a: The stretch length is our knob; the data only has distances, and the right stretch length is read off the curve
    wrong: ["Because stretches are too short to measure", "Because curves are easier to plot", "Because the GPU cannot store stretches"]
    why: A threshold at the stretch length would bake a design choice into the hypothesis. The curve says which stretch length, if any, would pay.
    sec: curve
  - q: Which three readings does a scenario use to measure fallen-apple similarity?
    a: Joining adjacent tokens into one cherry, the length of the reference tree's links, and a filter along the token axis, each with a shuffle control
    wrong: ["The cosine between adjacent cherries", "HiSparse's hit rate at two cache sizes", "The dictionary share of the best compressor"]
    why: All three read the curve over Δ on the same slice; the shuffle destroys every neighbour relation, so a real fallen-apple gain must vanish under it.
    sec: measuring
  - q: Like for like, what did joining two and four adjacent tokens into one cherry cost?
    a: +0.037 and +0.063 of ratio against one layer's (2, 256) cherry
    wrong: ["−0.037 and −0.063, a saving", "Nothing: adjacent tokens share 0.29 bit", "It could not be measured under a leash"]
    why: The best stage points at an earlier similar token, one pointer per token; a pair of tokens rarely has a good earlier pair to point at.
    sec: verdict
  - q: Where do the reference tree's links point at the first and last KV layers?
    a: Mostly far away, to repeats of the same token; only 9, 7 and 12 % stay within 8 tokens
    wrong: ["To the adjacent token, as the hypothesis predicted", "Within 8 tokens about half the time at every layer", "To the first cherry of the punnet"]
    why: The middle layers build chains along the text (37 to 47 % within 8 tokens); the first and last build hubs of far-apart repeats. The axis that mattered was repetition.
    sec: verdict
---

Read a long document and pick two sentences next to each other. They are about the same thing, in the same register, often with the same names in them. Two sentences fifty pages apart share much less. A cherry is computed from the LLM's hidden state, and the hidden states of neighbouring tokens are, intuitively, neighbours too.

This page turns the proverb into a hypothesis precise enough to be wrong, and then reads off what happened to it.

## A curve over distance {#curve}

::: define fallen-apple
- **What it is.** For two cherries of the same layer of the same sequence, at token positions $\vt$ and $\vt - \vgap$, the bits needed to store $\vE_{\vt}$ exactly given $\vE_{\vt-\vgap}$ are, on average, *lower the smaller $\vgap$ is*. In Python: `v[t, l]` given `v[t - Δ, l]`.
- **Mnemonic.** The apple does not fall far from the tree. The word *apple* appears on this site in no other sense.
- **Status.** The first bet of the project; measured since, and weak except in the middle layers.
:::

$\vgap$ is the **token distance**, and on this site the letter means only that. The claim is about one curve:

$$
\vgap \;\longmapsto\; \underbrace{\vH\big(\vE_{\vt} \mid \vE_{\vt-\vgap}\big)}_{\text{bits for } \vE_{\vt} \text{ given a neighbour } \vgap \text{ tokens back}} \qquad \text{rising with } \vgap \text{ towards } \vH(\vE_{\vt}) .
$$ {#eq-hyp-apple-curve}

The definition says nothing about stretches, on purpose. The [[stretch]] is a knob of ours ([[#scenario-stretch]]); the data only has distances. A curve has a shape: how many bits the next-door neighbour saves, how fast the saving fades, and whether some of it never fades because the whole sequence shares a subject. Each of those three numbers would steer a different design.

::: figure fig-hyp-apple-curve appleCurve
**What fallen-apple similarity would look like: an illustration, not data.** Horizontal axis: token distance $\vgap$ to the known neighbour, 1 to 65 536, log scale. Vertical axis: bits per element to store a cherry exactly. Dashed grey: no help from the neighbour, at an illustrative solo rate of 6.5 bits, which is also what must happen when tokens are shuffled across sequences. Red curve and band: a hypothetical curve built from three knobs, the saving next door ($\vgap = 1$), the distance at which half of it is gone, and the part that never fades. The button overlays a *threshold* claim, "alike within a stretch of 1 024 tokens and unrelated beyond", for contrast. Hover to read values.
:::

::: try
1. Turn on the threshold overlay. A cliff at exactly the stretch length is what "alike within a stretch" literally claims. Real data has no reason to know our knob.
2. Set the half-distance to 64 tokens. Then stretches of thousands of tokens would waste most of the saving; the stretch length should follow the curve.
3. Set the saving next door to zero but keep the part that never fades. Then a neighbour helps no more than any cherry of the same sequence: a sequence-scope dictionary would do, and stretch dictionaries would add nothing.
:::

Why believe it? Nearby tokens come from nearby hidden states, and the lossy literature reports slowly changing structure in keys ([[#papers-kivi]], [[#papers-kvquant]]). But all of that was seen at 16 bits or after heavy rounding, and none of it in bits. That a neighbour can never *hurt* on average is a theorem ([[#hypotheses-bits-are-the-unit]]). That a closer neighbour helps *more*, and by how much, is the hypothesis.

::: takeaway
- Fallen-apple similarity: $\vH(\vE_{\vt} \mid \vE_{\vt-\vgap})$ rises with $\vgap$; a curve with a next-door saving, a fading length and a floor.
- The stretch length is read off the curve, never assumed by it.
:::

## How a scenario measures it {#measuring}

Three readings, all on the same slice of values ([[#scenario-why-vary]]).

1. **Cherry shape.** Dice the same elements as one layer's `(2, 256)` cherries and as two adjacent tokens `(2, 2, 256)`. The wider cherry may use token $\vt$ to predict token $\vt+1$ for free; the gap between the two scores, on the same elements, bounds what adjacent tokens share given everything else the compressor knows.
2. **Where the references point.** A [[reference-tree]] stage lets every cherry hang off the cherry of the punnet nearest to it. If the apple falls near the tree, the links are short. Their length distribution is the curve read backwards.
3. **A stage along the token axis.** A linear filter that predicts a cherry from the few before it, the way FLAC predicts a sound sample, measures the next-door saving directly, before and after a reference cherry is allowed.

Each reading is paired with the [[shuffle-control]]: tokens drawn at random into punnets, so that every neighbour relation is destroyed and any real fallen-apple gain must vanish.

:::: compare Four things it is not
::: col Not these
- **"Alike within a stretch."** The stretch is our knob; the curve picks it.
- **The [[lucky-louis]].** About which picks, not their bytes ([[#hypotheses-two-localities]]).
:::
::: col Nor these
- **Lossy tolerance.** What the LLM survives is not what is predictable.
- **Cosine.** A few outlier elements can make strangers look like twins ([[#hypotheses-bits-are-the-unit]]).
:::
::::

::: takeaway
- Measured by cherry shape (adjacent tokens joined), by where reference links point, and by a filter along tokens, each with a shuffle control.
:::

## Verdict {#verdict}

Weak, except in the middle layers; and even there, the apple was not the point. Values of Qwen3.5-2B, FP8, stretch 4096 ([[#measured-cutting-the-tensor]], [[#measured-time-and-bits]]):

| reading | KV layers 1, 2, 3 (middle) | KV layers 0, 4, 5 (first and last) | grade |
|---|---|---|---|
| bits the adjacent token shares, raw | up to 0.29 per element (layers 1, 2) | 0.058 at layer 0 | code length, 4 punnets |
| the same, once each cherry has its own reference | 0.02 or less | | code length, 4 punnets |
| reference links within 8 tokens | 37 / 47 / 39 % | 9 / 7 / 12 % | 24 punnets |
| a filter along tokens, order 8 | up to 0.33 bit alone; ≤ 0.06 after a reference; +0.001 shuffled | | code length, bound |
| two / four adjacent tokens as one cherry | +0.037 / +0.063 of ratio against `(2, 256)` (one layer's cherry), 2 sequences, quick | | quick trial |

The shape is the interesting part. In the middle layers the reference tree builds *chains* along the text and a filter along tokens does save a third of a bit on its own; but the one thing the compressor does anyway, pointing at a similar earlier cherry, already captures it, and after the pointer the filter has at most 0.06 bit left. At the first and last layers the links jump far: to the same token again, wherever it last appeared. The apple fell near the tree only in the middle of the LLM, and even there the pointer, not the distance, was the mechanism. The axis that mattered is the next page, [[#hypotheses-echo]].

::: note warning Grades
The adjacent-token join is a quick trial on two sequences; the shared bits are code-length bounds on four punnets; the link shares rest on 24 punnets of two sequences. Nothing here is a verified ledger row on five sequences, and all of it is coding-agent text.
:::

::: aside source Receipts
Adjacent tokens: r12-t0004 against its own layer score (`s-tok2-b4k-u`, `s-tok4-b4k-u`, `s-layer-b4k-u`); code-length version and lag-1 sharing: r9 iter-1-5. Where references point: r6 iter-2-1 (24 blocks). Order-8 filter: r16 iter-1-1. Layer-0 adjacency: C1 `[sim/adjacency]`.
:::

::: takeaway
- Adjacent tokens share up to 0.29 bit raw in the middle layers, 0.02 after a reference; joining them into one cherry costs 0.037 and 0.063.
- Links point near only in the middle layers; elsewhere the right axis was never distance.
:::
