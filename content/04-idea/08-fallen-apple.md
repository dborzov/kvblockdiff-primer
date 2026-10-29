---
title: Fallen-apple similarity
nav: Fallen-apple similarity
lede: '"The apple does not fall far from the tree": things that are close are alike. This is the property the whole proposal bets on — an entry should be cheaper to store when an entry a few tokens away is known. Here it is, defined as a curve, together with four things it is easily mistaken for.'
group: What the idea bets on
cards:
  - q: What does fallen-apple similarity claim?
    a: An entry is cheaper to store exactly given an entry of the same layer a small token distance away — and the closer, the cheaper
    wrong: ["Entries inside one block are identical", "The indexer keeps selecting nearby entries", "The model tolerates 2-bit keys without loss of accuracy"]
    why: 'It is a statement about the conditional entropy $\vH(\vE_{\vt} \mid \vE_{\vt-\vgap})$ as a function of the token distance $\vgap$.'
    sec: curve
  - q: Why is fallen-apple similarity defined as a curve over Δ rather than "similar within a block"?
    a: Because the block size is our knob; the data only has distances, and the right block size is read off the curve
    wrong: ["Because blocks are too small to measure", "Because curves are easier to plot than thresholds", "Because the GPU cannot store blocks"]
    why: A threshold at b would bake our design choice into the hypothesis. A curve over Δ tells us which b would pay.
    sec: curve
  - q: Is fallen-apple similarity established by HiSparse's high hit rate?
    a: No — the hit rate is about which entries are selected, not about their bytes
    wrong: ["Yes — a high hit rate means entries are alike", "Yes, but only for keys", "Yes, for blocks larger than 4096 tokens"]
    why: That is the Lucky Louis property. IV.13 shows hit rates like HiSparse's coming from keys that cannot be compressed by a single bit.
    sec: confusions
  - q: '"Keys can be quantized to 2 bits with little loss in accuracy." What does that say about fallen-apple similarity?'
    a: Nothing directly — it is about what the model tolerates, not about what is predictable
    wrong: ["That keys compress losslessly to 2 bits", "That neighbouring keys are identical", "That values are noise"]
    why: Lossy tolerance and lossless predictability are different questions. Lossless coding must reproduce every bit, including the ones the model would not miss.
    sec: confusions
  - q: Two 640-element entries share four huge channels and are independent elsewhere. Their cosine similarity is 0.86. How much does one help to store the other exactly?
    a: Almost nothing — 636 of the 640 elements are unpredictable from it
    wrong: ["About 86 % of the bits", "Half the bits", "All the bits — the entries are near-copies"]
    why: Cosine is dominated by the few large channels. Lossless coding pays for every element, and the neighbour explains none of the other 636.
    sec: confusions
---

Read a long document and pick two sentences next to each other. They are about the same thing, in the same register, often with the same names in them. Two sentences fifty pages apart share much less. A language model's [[entry|entries]] are computed from its hidden states, and the hidden states of neighbouring tokens are, intuitively, neighbours too.

The apple does not fall far from the tree. This page turns that proverb into a hypothesis precise enough to be wrong.

## A curve over distance {#curve}

::: define fallen-apple
- **What it is:** for two entries of the same layer (and head) of the same sequence, at token positions $\vt$ and $\vt - \vgap$, the bits needed to store $\vE_{\vt}$ exactly given $\vE_{\vt-\vgap}$ are, on average over the data, *lower the smaller $\vgap$ is*.
- **Mnemonic:** "the apple does not fall far from the tree". The word *apple* appears on this site in no other sense.
- **Status:** a hypothesis. Not measured anywhere at 8-bit precision.
:::

$\vgap$ is the **token distance** between the two entries, and on this site the letter means only that. In symbols, the claim is about one curve:

$$
\vgap \;\longmapsto\; \underbrace{\vH\big(\vE_{\vt} \mid \vE_{\vt - \vgap}\big)}_{\text{bits to store } \vE_{\vt} \text{ given a neighbour } \vgap \text{ tokens back}} \qquad \text{rising with } \vgap, \text{ towards } \vH(\vE_{\vt}) .
$$ {#eq-idea-apple-curve}

The definition says nothing about blocks, on purpose. A curve has a shape: how many bits the next-door neighbour saves, how fast the saving fades, and whether some saving never fades (because the whole conversation shares a subject). Each of those three numbers would steer a different design decision.

::: figure fig-idea-apple-curve appleCurve
**What fallen-apple similarity would look like — an illustration, not data.** Horizontal axis: token distance $\vgap$ to the known neighbour, 1 to 65,536 tokens, log scale. Vertical axis: bits per element to store an entry exactly. Dashed grey: no help from the neighbour, at an illustrative solo rate of 6.5 bits — also what must happen if tokens are shuffled across conversations, which destroys every neighbour relation. Red curve and band: a hypothetical fallen-apple curve, built from three knobs — the saving next door ($\vgap = 1$), the distance at which half of that saving is gone, and a part of the saving that never fades. The button overlays a *threshold* claim, "entries are alike within a block of 1,024 tokens and unrelated beyond", for contrast. Hover the plot to read values. Nobody has measured this curve at 8 bits; measuring it is the first experiment ([[#questions-framework-a]]).
:::

::: try
1. Turn on the threshold overlay. A cliff at exactly the block size is what "similar within a block" literally claims. Real data has no reason to know our block size.
2. Set the half-distance to 64 tokens. Then blocks of thousands of tokens would waste most of the saving — the block size should follow the curve, not the other way round.
3. Set the saving next door to zero but keep the part that never fades. Then neighbours help no more than any entry of the same conversation: a per-request dictionary would do, and block dictionaries would add nothing.
:::

What would a measurement of the curve look like? The toy history of [[#idea-mapping]] can be measured exactly, because it is small and made up. It was built with a slow wander shared by neighbours, so it should show a fallen-apple curve — and it does.

::: dataset fig-idea-toy-apple idea-history view=apple,heat metrics=apple1,apple8,apple32,shuf
**The fallen-apple curve of the toy history** ([[#fig-idea-toy-history]] again). *Neighbours, by distance:* horizontal axis, the token distance $\vgap$ to the known neighbour (1 to 64, log scale); vertical axis, the bits per element that knowing $\vE_{\vt-\vgap}$ saves when storing $\vE_{\vt}$, estimated from the $\vRsq$ of a straight-line guess at the exchange rate of II.12 and averaged over the 8 elements. Red: the history as built. Dashed grey: the same entries in a shuffled order. The vertical line is the toy's block size. *The entries:* the history itself. Synthetic, seeded; a toy built so that the hypothesis holds, not a measurement of a real cache.
:::

The curve has the shape the definition asks about. Next door the neighbour saves 0.86 bit per element; eight tokens back, 0.25; at the distance of one block, almost nothing. Shuffled, nothing at all. Real KV caches will draw their own curve — maybe higher, maybe flat — and measuring it is the point of [[#questions-framework-a]].

What makes the hypothesis plausible? Nearby tokens come from nearby hidden states. And the KV-quantization literature reports regular structure: keys have a few channels with large values that change slowly from token to token, and neighbouring tokens' values look alike ([[#papers-kivi]], [[#papers-kvquant]], [[#papers-cachegen]]). But all of it was observed at 16-bit or heavily quantized precision, and none of it was measured in bits. That a neighbour can never *hurt* on average is a theorem ([[#idea-what-is-right]]). That a closer neighbour helps *more*, and by how much, is the hypothesis.

::: takeaway
- Fallen-apple similarity: $\vH(\vE_{\vt} \mid \vE_{\vt-\vgap})$ rises with the token distance $\vgap$.
- It is a curve with a shape — next-door saving, fading distance, a floor — not a yes/no threshold.
- Plausible, partly supported at other precisions, unmeasured at 8 bits.
:::

## Easy to confuse with {#confusions}

Four look-alikes, each of which has been mistaken for this property at some point.

1. **"Similar within a block."** The block is a knob of our algorithm ([[#idea-dictionary-delta-block]]). A block dictionary is one way to *exploit* fallen-apple similarity; the right block size is read off the curve, not assumed.
2. **The [[lucky-louis]].** That is about *which* entries the indexer selects, not what is in them. [[#idea-the-leak]] builds a world with the first and none of the second.
3. **Lossy tolerance.** "Keys survive 2-bit quantization with little loss in accuracy" says what the model *tolerates*. It does not say what is *predictable*. [[lossless]] coding lives on the other side of that line: every bit must come back, wanted or not.
4. **Cosine similarity.** Two entries can point almost the same way and still be nearly useless for predicting each other. Here is one such pair:

```python cosine similarity can be high while the neighbour predicts almost nothing
import numpy as np
rng = np.random.default_rng(0)
d = 640
a = rng.standard_normal(d)            # two neighbours: unrelated in 636 channels...
b = rng.standard_normal(d)
a[:4] = b[:4] = 30.0                  # ...but they share four huge outlier channels
cos = a @ b / np.linalg.norm(a) / np.linalg.norm(b)
r2 = np.corrcoef(a[4:], b[4:])[0, 1] ** 2
print(f"cosine similarity: {cos:.2f}")
print(f"R² of the other {d-4} channels: {r2:.3f}")
```

It prints a cosine similarity of 0.86 and an [[r-squared|R²]] of 0.000 for the other 636 channels. The card below draws one such pair, so you can see where the cosine comes from.

::: dataset fig-idea-cosine-pair idea-cosine-pair view=strips,scatter,zoom hl=big metrics=cos,energy,cosrest,r2,bits
**Two entries with a cosine of 0.86.** *The two entries:* the 640 elements of each (vertical axis) by element number (horizontal axis); both have four spikes of 30 at elements 0–3 (highlighted) and small, unrelated numbers everywhere else. *b against a, all 640:* each element of b against the same element of a; the four spikes sit far out on the diagonal, the rest is a blob at the origin. *b against a, the 636:* a zoom on the blob — a round cloud, no diagonal. Drag a box to select points. *Numbers:* the cosine, how much of the vectors' length the four spikes own, and what a predicts of the rest. Synthetic, seeded (its own random numbers, same recipe as the snippet).
:::

Four channels own 86 % of each vector's squared length, so they decide the cosine. Zoom in and the other 636 elements form a round cloud: knowing a's element tells you nothing about b's. Those 636 must be stored at full price.

::: theme which-vs-what
Confusion 2 is the expensive one. HiSparse's hit rate is strong evidence about the indexer's queries and no evidence at all about fallen-apple similarity.
:::

::: takeaway
- Not "similar within a block": the block is a knob; the curve picks it.
- Not Lucky Louis, not lossy tolerance, not cosine similarity.
- Only bits saved, as a function of token distance, count.
:::
