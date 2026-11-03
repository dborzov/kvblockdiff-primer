---
title: 'Neighbour similarity: the family'
nav: Neighbour similarity
group: The hypotheses
lede: The orchard has four axes, so a cherry has four kinds of neighbour. Neighbour similarity is the family of bets that one of them makes the cherry cheaper. Here is the umbrella, the four members, and the one way a scenario can measure any of them.
cards:
  - q: Neighbour similarity along the token axis compares a cherry with…
    a: A cherry of the same layer a few tokens earlier
    wrong: ["The same token one layer down", "The other KV head of the same token and layer", "The query of the current step"]
    why: The token axis is the fallen-apple member; the layer axis is upstairs; the head axis is stereo; a repeat of the same token anywhere is an echo.
    sec: axes
  - q: Which member of the family is not an axis of the tensor at all?
    a: Echo similarity, which follows repeats of the same token wherever they are
    wrong: ["Fallen-apple similarity", "Upstairs similarity", "Stereo similarity"]
    why: The other three walk along token_pos_id, layer_id and head_id. An echo is found by the text, not by a coordinate.
    sec: axes
  - q: How does a scenario measure how many bits two heads share?
    a: Run the same compressor on the cherry shapes v[t, l, h, :] and v[t, l, :, :] over the same elements; the gap is a lower bound on what the heads share
    wrong: ["Compute the cosine between the heads", "Count how often the indexer picks both heads", "Compare two screens with different stretches"]
    why: A wider cherry can always run the narrower compressor inside, so the difference, on identical bytes, is bits the join made available.
    sec: in-bits
  - q: Which member turned out strongest in the campaigns?
    a: Stereo similarity, the two heads of a layer
    wrong: ["Fallen-apple similarity, adjacent tokens", "Upstairs similarity, adjacent layers", "None; all four were flat"]
    why: Joining the heads saved 0.032 of ratio; joining six layers 0.004; joining adjacent tokens cost 0.037 and 0.063. Echoes were where the reference tree's gain came from.
    sec: verdict
---

One sequence's values on [[bench|the Bench]] are [[~v-tensor]] with `v.shape == (225_000, 6, 2, 256)`. Four axes. Pick one cherry, say one token's values at one layer, [[~v-one-token-layer]]. It has a neighbour along each axis: the token before it, the layer below it, the other head, and, if the text repeats, the same token again somewhere far away. Each is a different bet.

## Four axes, four neighbours {#axes}

::: define neighbour
- **What it is.** The family of hypotheses that a cherry costs fewer bits to store *exactly* when a neighbouring cherry along some axis of the orchard is already known.
- **Members.** Four, one page each: the token axis ([[#hypotheses-fallen-apple]]), the layer axis ([[#hypotheses-upstairs]]), the head axis ([[#hypotheses-stereo]]) and repeats of the same token, which is an axis of the text rather than of the tensor ([[#hypotheses-echo]]).
- **Easy to confuse with** the [[lucky-louis]], which is about *which* positions the indexer picks, never about what is stored at them ([[#hypotheses-two-localities]]).
:::

| axis | the cherry | its neighbour | the member | emblem |
|---|---|---|---|---|
| `token_pos_id` | `v[t, l]` | `v[t - Δ, l]`, a few tokens back | fallen-apple similarity | the Apple |
| `layer_id` | `v[t, l]` | `v[t, l - 1]`, the same token one layer down | upstairs similarity | the Staircase |
| `head_id` | `v[t, l, 0, :]` | `v[t, l, 1, :]`, the other KV head | stereo similarity | the Stereo |
| the text | `v[t, l]` | `v[t', l]` where token `t'` is the same token as `t`, any distance away | echo similarity | the Echo |

::: figure fig-hyp-axes kvAxes
**Which cherries count as neighbours.** Each tile is one cherry of one sequence, one token's values at one layer: layers run upwards (5 shown), token positions to the right (14 shown). The filled tile is the chosen cherry (click any tile to choose another). *Token axis:* cherries of the same layer at earlier positions, darker the closer they are, labelled with their token distance $\vgap$. *Layer axis:* the same token one floor down and one floor up. *Head axis:* the chosen cherry split into its two heads' vectors, `v[t, l, h, :]`, 256 elements each. The readout names the neighbours and the hypothesis that concerns them. Echoes are not drawn: they sit at whatever distance the text put them.
:::

The old draft had two members and dismissed the head axis as "slices inside one cherry, not pursued". The campaigns found the head axis to be the strongest of the four and the text's repeats to be where the reference tree's gain came from. The umbrella widened.

::: takeaway
- A cherry has a neighbour along each axis of the orchard, and one more along the text.
- Four members: fallen-apple (token), upstairs (layer), stereo (head), echo (repeats).
:::

## Stated in bits {#in-bits}

"Similar" means one thing here ([[#hypotheses-bits-are-the-unit]]): the bits per element that knowing the neighbour saves,

$$
\frac{1}{\vd}\Big[\underbrace{\vH(\vE)}_{\text{bits for the cherry alone}} \;-\; \underbrace{\vH(\vE \mid \text{neighbour})}_{\text{bits once the neighbour is known}}\Big] ,
$$ {#eq-hyp-neighbour-bits}

with $\vd$ the elements per cherry. The hypothesis of each member is that this number is clearly above zero for its neighbour, and the measurement says by how much.

How does a scenario measure it? Two ways, and both are the compressor used as an instrument ([[#scenario-why-vary]]).

1. **By cherry shape.** Dice the same slice two ways and run the same compressor on the same elements. With `cherry(t) = v[t, l, h, :]` (256 elements) head 1 is coded without head 0; with `v[t, l, :, :]` the compressor may use head 0 for free. A wider cherry can always run the narrower compressor inside, so the gap between the two scores is a lower bound on the bits the joined parts share. The same trick joins layers, `v[t, :, :, :]`, and adjacent tokens, `v[t:t+2, l, :, :]` (stacked positions, out of scope since 2026-11-03).
2. **By a stage that may see the neighbour.** A [[reference-cherry]] stage lets a cherry be predicted from another cherry of the punnet. Which cherry it chooses, and how far away, is a reading on where the bits are; the [[shuffle-control]] certifies it. This is how echoes were found.

```python two scenarios on one slice, differing in cherry shape only
slice_ = "v[stretch, layer_id, :, :]"       # both heads of one layer
Scenario(slice_, cherry="v[t, l, h, :]",  stretch_len=4096, leash=293, fmt="fp8_e4m3", llm="Qwen3.5-2B", corpus="agent-long30")
Scenario(slice_, cherry="v[t, l, :, :]",  stretch_len=4096, leash=293, fmt="fp8_e4m3", llm="Qwen3.5-2B", corpus="agent-long30")
# same elements, same compressor: the second may use head 0 to predict head 1; the gap is bits the heads share
```

::: theme which-vs-what
Every member of the family is a claim about the bytes. The property that makes HiSparse's hot cache hit is a claim about the queries. [[#hypotheses-two-localities]] keeps them apart.
:::

::: takeaway
- Neighbour similarity is bits saved per element, $\vH(\vE) - \vH(\vE \mid \text{neighbour})$.
- A scenario measures it by comparing cherry shapes on the same elements, or by a stage that may use the neighbour, with a shuffle control.
:::

## Verdict {#verdict}

Measured on the values of Qwen3.5-2B, FP8, stretch 4096; each member's page has the detail and the grades.

| member | what a scenario compared | the reading | page |
|---|---|---|---|
| stereo (heads) | `v[t, l, h, :]` against `v[t, l, :, :]`, same window, 20 sequences | the join saves 0.0322 ± 0.0009, 20 of 20; bound 0.85 bit per element raw | [[#hypotheses-stereo]] |
| echo (repeats) | where a reference tree's links point; shuffle | links point to far repeats at KV layers 0, 4, 5; the tree compressor goes from 0.6907 to 0.7520 when tokens are shuffled | [[#hypotheses-echo]] |
| fallen-apple (tokens) | `v[t, l, :, :]` against two and four adjacent tokens as one cherry | the join *costs* 0.037 and 0.063; adjacent tokens share ≤ 0.02 bit once each has its own reference | [[#hypotheses-fallen-apple]] |
| upstairs (layers) | `v[t, l, :, :]` against `v[t, :, :, :]`, same window | a further 0.0043 ± 0.0014, 20 of 20; layers group by kind, not by nearness | [[#hypotheses-upstairs]] |

The order of the four was the reverse of the old draft's priorities. The measurement pages: [[#measured-cutting-the-tensor]] for the shapes, [[#measured-night-one]] and [[#measured-two-kinds-of-structure]] for the echoes and the shuffle.

::: takeaway
- Strongest to weakest: stereo, echo, fallen-apple, upstairs.
- The two members the old draft had not named carried the gain.
:::
