---
title: The cherry and its shape
nav: The cherry
group: The objects
lede: The unit the receiver asks for. Its shape is a choice that can turn one slice into several different problems, so the site spells it out every time.
cards:
  - q: What is a cherry?
    a: 'One unit of ask-and-answer: a fixed-shape sub-array of the slice that the receiver asks for and the sender answers with one delta'
    wrong: ["One token position of the sequence", "One stretch of the orchard", "The dictionary of one punnet"]
    why: The receiver asks for cherries one at a time. Every cherry of a scenario has the same shape, known in advance to both sides.
    sec: the-unit
  - q: 'A slice puts the values of KV layers 1 and 3, head 0, in play. With the cherries `v[t, 1, 0, :]` and `v[t, 3, 0, :]` (256 elements each), how many cherries does one token position yield, and of how many bytes?'
    a: Two cherries of 256 bytes each (one per layer)
    wrong: ["One cherry of 512 bytes", "Two cherries of 512 bytes", "One cherry of 256 bytes"]
    why: 'The slice gives 2 × 256 elements per position; each cherry takes one layer''s vector, so there are two per position. With `v[t, [1, 3], 0, :]` (512 elements) there would be one of 512 bytes.'
    sec: the-shape
  - q: 'Why are "two cherries `v[t, 1, 0, :]`, `v[t, 3, 0, :]` per token" and "one cherry `v[t, [1, 3], 0, :]` per token" different scenarios, though the same bytes are in play?'
    a: Because the receiver may ask for one layer's vector without the other in the first, and never in the second; and a compressor can use what is inside one cherry for free
    wrong: ["They are the same scenario written two ways", "Because the first has a bigger dictionary", "Because the second is lossy"]
    why: 'What one ask returns, and what a decode may use without paying, both change with the cherry shape. The campaigns measured the difference: joining the two heads into one cherry saved 0.032 of ratio.'
    sec: the-shape
---

The receiver on [[#scenario-one-cherry-at-a-time]] asked for "one small piece". How small, and what piece exactly? The answer is the one object of the scenario that both sides must agree on before the first ask, and the one whose old name quietly changed its meaning three times. <!-- old-words -->

## The unit of ask-and-answer {#the-unit}

::: define cherry
- **What it is.** One unit of ask-and-answer: the receiver asks for one cherry; the sender answers with one [[delta]]. A cherry is the chosen vectors of **one** token position of the [[slice]], written as the index expression of that position's cherry together with its element count. In Python, `cherry(t)`, and `cherry_bytes = cherry(t).size` at 8 bits per element. Cherries that stack several positions are out of scope.
- **Example.** On [[bench|the Bench]], with the slice `v[:, l, :, :]` and `cherry(t) = v[t, l, :, :]`, a cherry is one token's values at one layer, [[~v-one-token-layer]], 512 elements, 512 bytes. That is the cherry of most numbers in Part VIII. The three shapes in scope since 2026-11-03 are `v[t, :, :, :]` (3072 elements), `v[t, 0, 0, :]` (256) and `(k[t, :, :, :], v[t, :, :, :])` (6144) ([[#scenario-why-vary]]).
- **Easy to confuse with** a [[pick]], which is what the *indexer* names on the serving side: one `(layer_id, token_pos_id)`. A pick is served with one or more cherries, depending on the scenario ([[#app-mapping]]). And with a stretch or a punnet, which are many cherries.
:::

Two facts about cherries are fixed by the scenario and known to both sides in advance, so they are never charged: **every cherry has the same shape**, and **both sides know which cherry is being asked for** (its `i`, hence its position in the orchard). The receiver does not pay to learn what a cherry looks like; it pays only for what is inside it.

$$
\vE_{\vi} \in \{\text{8-bit codes}\}^{\vd}, \qquad \vd = \texttt{cherry(t).size}, \qquad \ve = \vd \text{ bytes at 8 bits.}
$$ {#eq-scn-cherry}

::: aside reminder Elements and vectors (II.13)
A [[vector]] is an ordered list of $\vd$ numbers; each number is an [[element]] with a position `elem_id`. A cherry `v[t, l, :, :]` is 512 elements; flattened, it is one vector $\vE_{\vi}$ of $\vd = 512$.
:::

::: takeaway
- A cherry is the unit the receiver asks for and the sender answers: the vectors of one position of the slice, `cherry(t)`, `cherry_bytes` bytes.
- Its shape and its identity are known in advance; only its contents cost bytes.
:::

## The shape is a choice {#the-shape}

Here is where one slice becomes several problems. Take the slice `v[:, [1, 3], 0, :]`: the values of KV layers 1 and 3, head 0. Per token position, 2 × 256 elements are in play. How are they cut into cherries?

::: define cherry-shape
- **What it is.** The dicing rule of a scenario: which vectors of a position form one cherry, hence how many cherries one token position yields. Written as the index expression of one cherry with its element count: `cherry(t) = v[t, [1, 3], 0, :]`, 512 elements. A bare shape tuple such as `v[t, l, :, :]` is not used, because it does not say which axes it spans (two layers of one head, two heads of one layer, or two tokens).
- **Example.** The slice above diced as `v[t, 1, 0, :]` and `v[t, 3, 0, :]` gives two cherries per position, one per layer, 256 elements each; diced as `v[t, [1, 3], 0, :]` it gives one cherry per position of 512 elements. Same bytes in play, two scenarios.
- **Easy to confuse with** the slice. The slice says *what* is in play; the shape says *how it is diced*. Together they replace the campaigns' single word "entry split". <!-- old-words -->
:::

```python one slice, two cherry shapes, two scenarios
stretch = range(3 * 4096, 4 * 4096)                                  # one stretch of 4096 positions
sl = v[stretch][:, [1, 3], 0, :]                                     # the slice for it: (4096, 2, 256) elements in play

# scenario A: cherry(t) = v[t, 1, 0, :] and v[t, 3, 0, :], 256 elements each -> two cherries per position
cherries_A = [v[t, l, 0, :] for t in stretch for l in (1, 3)]        # 8192 cherries of 256 B
# scenario B: cherry(t) = v[t, [1, 3], 0, :], 512 elements -> one cherry per position, both layers stacked
cherries_B = [v[t, [1, 3], 0, :] for t in stretch]                   # 4096 cherries of 512 B
```

Why does the dicing matter, if the same bytes are in play? Two reasons, and both change the numbers.

1. **What one ask returns.** In scenario A the receiver can ask for layer 1's vector of token 7 without layer 3's. In scenario B it cannot: it gets both or neither. A serving design that selects one layer at a time needs A; one that selects a group of layers at once can use B.
2. **What a decode may use for free.** Inside one cherry, a compressor may use any element to predict any other without paying for the privilege (it is all one answer). Across cherries it may not, unless the [[dictionary]] carries the information. So the gap between B's score and A's score, on the same elements, is a lower bound on how many bits the two layers share. The campaigns turned this into an instrument: joining the two heads of a layer into one cherry saved 0.032 of ratio, 20 sequences of 20 ([[#measured-cutting-the-tensor]]); that is [[#hypotheses-stereo|stereo similarity]].

::: figure fig-scn-cherry-shapes scnCherryShapes
**Three cherry shapes for one token position of the Bench's values.** Left to right: `v[t, l, h, :]`, one head's vector, 256 elements; `v[t, l, :, :]`, one layer with both heads, 512 elements; `v[t, :, :, :]`, every KV layer, 3072 elements. Under each: `cherry_bytes`, cherries per token position, cherries per stretch of 4096 positions, and the campaigns' best verified MDL ratio on that shape where one exists (0.670 / 0.636 / 0.638 on their screens; different screens read different punnets, so the three cannot be subtracted: the like-for-like gaps are on [[#measured-cutting-the-tensor]]). Click a shape to highlight the elements one ask returns.
:::

::: try
1. Compare `v[t, l, h, :]` and `v[t, l, :, :]`. The same 512 bytes per token and layer; one ask returns half or all of them.
2. Note that `v[t, :, :, :]` has 4096 cherries per stretch but 3072 bytes each: a punnet of 12.6 MB raw.
:::

::: theme bits-unit
The difference between two cherry shapes on the same elements is measured in bits per element, and nothing else counts: a cosine of 0.05 between the two heads hid 0.85 bit per element of shared information.
:::

::: takeaway
- The cherry shape dices a slice into units, each the vectors of one position; `v[t, 1, 0, :]` (two cherries per position) and `v[t, [1, 3], 0, :]` (one) on the same slice are different scenarios.
- It decides what one ask returns and what a decode may use for free, so it is a measuring instrument for shared bits.
:::
