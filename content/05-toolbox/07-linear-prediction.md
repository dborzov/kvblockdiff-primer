---
title: Linear prediction across elements
nav: Linear prediction
group: Predictor stages
lede: 'FLAC predicts a sample from the samples before it. Turn that sideways and predict an element from the elements of the same cherry the decoder has already read. The weights are a small table stored once per punnet, and on the Bench this stage was the biggest single gain of the second campaign.'
cards:
  - q: What does linear prediction, as the campaigns used it, guess a value from?
    a: Elements of the same cherry that the decoder has already read, as a weighted sum added to the reference cherry's value
    wrong: ["The same element of the adjacent token", "The punnet's per-furrow average", "A codebook of typical cherries"]
    why: The rule is a table of which earlier elements and which weights, stored once per punnet; the delta codes the exact correction to the guess.
    sec: rule
  - q: A rotation (the KLT) also mixes elements. Why did prediction win where fixed rotations lost?
    a: A rotation transforms the whole vector and rounds it, about a quarter of a bit per element; prediction subtracts a guess from the original values and never rounds the vector
    wrong: ["Rotations cannot be stored in a dictionary", "Prediction uses more elements than a rotation", "The KLT needs the adjacent token"]
    why: The rounding tax is the cost the KLT page of the first plan missed; prediction pays no such tax because the stored values stay on their original grid.
    sec: rule
  - q: 'At `stretch 512`, which linear-prediction rule scored best, and why?'
    a: 'A rule the decoder learns from cherries it has already decoded (0.6894), because a punnet of 512 cannot pay for a fully stored table (0.6960)'
    wrong: ["The fully stored rule, as at every stretch length", "No rule at all; prediction loses below 4096", "A rule fit on another sequence"]
    why: 'The stored table costs $8\vw/\vb$ bits per element, and at $\vb = 512$ that is too much; at 4096 the paid rule leads again.'
    sec: wins
  - q: Tokens were shuffled so that each punnet became a random sample of a layer's tokens. What happened to the two gains?
    a: The reference-tree compressor worsened from 0.6907 to 0.7520; the linear-prediction gain stayed within 0.002
    wrong: ["Both gains vanished", "Both gains survived unchanged", "The prediction gain vanished and the tree gain survived"]
    why: Repeats live on nearby text and the shuffle destroys them. The rule lives on the LLM's weights, which the shuffle cannot touch.
    sec: measured
---

Element 3 of the toy punnet of [[#toolbox-the-bill]] is `[40, 44, 38, 42, 45, 39]`, and element 1 is `[12, 15, 10, 13, 15, 11]`. Twice element 1, plus 15, gives `[39, 45, 35, 41, 45, 37]`; the leftovers are `[1, −1, 3, 1, 0, 2]`. A furrow whose raw spread needed a 7-bit field now fits in 3 bits, and the rule that did it is two numbers the receiver can hold: "element 3 ≈ 2 × element 1 + 15".

The second campaign found the same shape on the Bench, in one line:

```python the rule, as the campaign wrote it
cherry[57] ≈ 0.3 * cherry[12] + 0.2 * cherry[40] + ...
```

## Predict an element from elements already decoded {#rule}

::: define linear-prediction
- **What it is.** Guessing an element's value from elements already decoded in the same cherry, as a weighted sum. The table of which elements and which weights is stored once per punnet; the delta codes the exact correction.
- **In the campaigns' compressors.** The guess sits on top of the [[reference-cherry]]: value ≈ the reference's value + Σ weight × (decoded element − the reference's value there).
- **Easy to confuse with** the [[klt]], the Compass: a rotation also mixes elements, but it rounds the whole rotated vector, about a quarter of a bit per element. Prediction subtracts a guess and never rounds.
:::

```python linear prediction across elements: a table in the dictionary, nothing in the delta
def fit(punnet, ref, max_terms):                          # ref[i]: each cherry's reference (zeros if none)
    table = {}                                            # elem_id -> (earlier elem_ids, integer weights)
    X = punnet.astype(np.float32) - ref                   # what is left after the reference
    for elem_id in range(1, d):                           # element 0 has nothing earlier to lean on
        terms, w = sparse_least_squares(X[:, :elem_id], X[:, elem_id], max_terms)   # cost-aware: a term must pay its bytes
        table[elem_id] = (terms, round_weights(w))        # weights rounded by what each rounding costs in bits
    return table                                          # 0.013 to 0.021 of ratio at stretch 4096, measured

def encode(cherry, ref, table):
    x = cherry.astype(np.int16); residual = np.empty(d, np.int16)
    for elem_id in range(d):
        terms, w = table.get(elem_id, ((), ()))
        guess = ref[elem_id] + round(sum(wk * (x[t] - ref[t]) for t, wk in zip(terms, w)))
        residual[elem_id] = x[elem_id] - guess            # exact; the decoder has x[t] for every t < elem_id
    return residual

def decode(residual, ref, table):                         # element by element, in order: each guess uses only decoded elements
    x = np.empty(d, np.int16)
    for elem_id in range(d):
        terms, w = table.get(elem_id, ((), ()))
        x[elem_id] = residual[elem_id] + ref[elem_id] + round(sum(wk * (x[t] - ref[t]) for t, wk in zip(terms, w)))
    return x.astype(np.int8)
```

On the bill: the dictionary carries the table, a few bytes per element of the cherry (the campaigns paid 0.013 to 0.021 of ratio for it at `stretch 4096`); the delta carries nothing extra. The guess is computed from values the decoder already has, so there is no tax at all. That is the whole difference from the Compass: the same linear algebra, applied as a prediction to integers that stay on their grid, pays no rounding ([[#toolbox-klt]]).

::: theme predict-correct
[[predictive-coding|Predictive coding]] turned sideways: FLAC predicts a sample from earlier samples in time; here an element is predicted from earlier elements of the same cherry, and the "time" axis is the element index.
:::

::: takeaway
- Linear prediction guesses each element from decoded elements of the same cherry, with weights stored once per punnet.
- No tax, a small dictionary line, and no rounding of the vector: the Compass's gain without the Compass's two costs.
:::

## When it wins, and when it cannot {#wins}

The stage needs three things.

1. **A linear relation between elements, in value.** A value cherry is a fixed projection of the token's hidden state, `v = W · h`, so elements share the geometry of `W` ([[#measured-where-the-bits-come-from]]). The relation must be fit in *value* units: fit in E4M3 index space, the same structure reads three times smaller ([[#toolbox-bit-fields]]).
2. **Enough cherries to pay for the table.** At `stretch 512` the punnet could not pay for a fully stored rule, and a rule the decoder *learns* from cherries it has already decoded beat the best stored one, 0.68938 against 0.6960; at 4096 the paid rule leads again. The amortization rule of [[#scenario-scope]] in action.
3. **Something the reference did not already take.** A reference cherry is itself a nonlinear predictor; after it, a small neural network added about nothing, and so did FLAC-style filters along tokens (at most 0.06 bit after a reference, and not as a code that can exist under a leash; [[#measured-time-and-bits]]).

It cannot help on elements that carry no linear trace of the others, and it cannot beat the noise floor of [[#toolbox-bounds]]: what no element predicts stays at its solo rate.

::: takeaway
- Wins on cross-element geometry fit in value units, with a punnet large enough to pay for the table.
- Adds little after a reference cherry has taken the nonlinear part; nothing on elements with no linear trace.
:::

## What the campaigns found {#measured}

On the layer screen (`V · all layers · cherry (2, 256) · stretch 4096 · leash 293`, 72 punnets of two development sequences) the stage was added to the first campaign's tree compressor rung by rung, every row verified ([[#measured-two-kinds-of-structure]]): prediction off, 0.6902; 16 terms per element from the other head only, 0.6775; terms added one at a time until the next stops paying, 0.6664; any earlier element as a term, in either head, 0.6562; cheaper storage of the term positions, 0.6470; bytes laid out along tree paths, 0.6449; the tree refit on distances *after* prediction, 0.6435; weights rounded by bit cost, 0.6417; head 0 first, then head 1, 0.6400; slopes and tree refit together, **0.6364**. On five sequences of the larger dataset the last rung beat the path layout by −0.0088 on every sequence (spread 0.0001), at a price in reads of 120 against 103 cherries' worth. Under the shuffle the tree gain collapsed (0.6907 → 0.7520) while the prediction gain moved by 0.002 or less; the two gains overlap by only 0.024 to 0.042 of ratio. A rule fit on *another* sequence recovers 91 to 96 % of the gain and the pattern of what is shared correlates 0.9995 between datasets: the weights travel, the choice of terms does not. With no tree at all, compressor 129, a mean and a scale per furrow plus a sparse rule over the whole cherry, reached 0.7348 on `(256,)` cherries, 0.6863 on `(2, 256)` and 0.6622 on `(6, 2, 256)` with a dictionary share of only 0.01 to 0.04, and sat 0.041 behind the tree compressor on the layer screen ([[#measured-codebooks-and-rotations]]). A rule the weights imply might one day need no storing: a code-length estimate says a shared table prepared in advance would take 0.6407 to 0.6326.

::: figure fig-toolbox-ladder-c2 msrLadderC2
**From 0.690 to 0.636 on one screen.** Bars: MDL ratio of each compressor on the layer screen (one layer's `(2, 256)` cherry, stretch 4096, leash 293, two development sequences), every bar verified by a separate decoder process. Right: 121 against 102 on five sequences as five paired points, −0.0088 on each; the sequences themselves differ by ten times as much. Hover for trial ids; data from `figures/data/measured-ladders.json`.
:::

::: figure fig-toolbox-shuffle msrShuffle
**Trust, but shuffle.** Left: MDL ratio of the reference-tree compressor on real punnets (0.6907) and on shuffled punnets (0.7520), each shuffled punnet a random sample of a layer's tokens with both heads of a token kept together. Right: two linear-prediction gains on real and on shuffled punnets (−0.0337 to −0.0344; −0.0232 to −0.0210). Encoder bytes, 8 to 41 windows of two sequences, not verified in a separate process. Data: `figures/data/measured-splits.json`.
:::

::: aside source Receipts
Ladder: r7-t0002, r7-t0001, r7-t0003, r11-t0001, r11-t0003, r11-t0002, r22-t0001, r22-t0003, r22-t0005, env-t0096, all on `s-layer-b4k-r293`; five sequences: env-t0096 against r24-t0002 on `st02n5-layer-b4k-r293`. Rule cost: r22 iter-1-1. Overlap: r11 iter-1-2. Shuffle: r12 iter-1-2, iter-1-3. Portability: r7 iter-1-2; the 0.9995: r9 iter-1-3. Coder 129 by split: r25-t0003, r25-t0004; 0.041 against 102: r25 iter-1-3. Learned rule at 512: r21-t0001 (coder 113) against r17-t0002 / r21 iter-1-2. Shared-table estimate: r23 iter-1-2.
:::

::: takeaway
- Linear prediction across elements took the layer screen from 0.690 to 0.636, beat the previous rung on every one of five sequences, and survived the shuffle.
- The weights belong to the LLM, so they travel between sequences; storing them costs 0.013 to 0.021 at stretch 4096.
:::
