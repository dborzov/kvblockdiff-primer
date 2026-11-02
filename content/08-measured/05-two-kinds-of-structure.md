---
title: Two kinds of structure
nav: Two kinds of structure
lede: 'The second campaign found a second saving, unrelated to the repeats of Night one: an element of a cherry can be guessed from elements already decoded, by a weighted sum that is nearly the same in every punnet. Repeats belong to the text; this rule belongs to the LLM.'
group: What was found
cards:
  - q: What does linear prediction, as the campaign used it, guess a value from?
    a: Elements of the same cherry that the decoder has already read, as a weighted sum added to the reference cherry's value
    wrong: ["The same element of the adjacent token", "The punnet's per-furrow average", "A codebook of typical cherries"]
    why: The rule is a table of which earlier elements and which weights, stored once per punnet; the delta codes the exact correction to the guess.
    sec: the-rule
  - q: A rotation (the KLT) also mixes elements. Why did prediction win where fixed rotations lost?
    a: A rotation transforms the whole vector and then rounds it, costing about a quarter of a bit per element; prediction subtracts a guess from the original values and never rounds the vector
    wrong: ["Rotations cannot be stored in a dictionary", "Prediction uses more elements than a rotation", "The KLT needs the adjacent token"]
    why: The rounding tax is the cost the toolbox's KLT page warns about; prediction pays no such tax because the stored values stay on their original grid.
    sec: the-rule
  - q: On five sequences, compressor 121 against compressor 102 came out as…
    a: −0.0088 on every sequence, with a spread of about 0.0001
    wrong: ["−0.0088 on average, but better on only three of five", "−0.05 on every sequence", "The same score; 121 only reads less"]
    why: 0.62970 against 0.63848; per sequence −0.00883, −0.00887, −0.00861, −0.00874, −0.00886. The sequences themselves differ by ten times that.
    sec: the-rule
  - q: Tokens were shuffled so that each punnet became a random sample of a KV layer's tokens. What happened to the two gains?
    a: The reference-tree compressor's score worsened from 0.6907 to 0.7520; the linear-prediction gain stayed within 0.002
    wrong: ["Both gains vanished", "Both gains survived unchanged", "The prediction gain vanished and the tree gain survived"]
    why: Repeats live on the text and the shuffle destroys them. The rule lives on the LLM's weights, which the shuffle cannot touch.
    sec: the-shuffle
  - q: A prediction rule fit on another sequence recovers how much of the gain?
    a: 91 to 96 %
    wrong: ["About 50 %", "Nothing: the rule is specific to each punnet", "More than 100 %, because the other sequence is cleaner"]
    why: The weights carry over almost whole. What does not carry over is the choice of which terms to keep; refitting another sequence's pattern costs about 0.01 at KV layer 2.
    sec: whose-structure
  - q: Why might the rule one day cost nothing to store?
    a: It belongs to the LLM's weights, so a table prepared in advance and held by both sides could carry it for every punnet
    wrong: ["Because punnets will get smaller", "Because the rule has only a few terms", "Because the decoder can always guess it from the first cherry"]
    why: Storing the rule costs 0.013 to 0.021 at a stretch of 4096. A shared table was not allowed in the campaign; an estimate says it would take compressor 102 from 0.6407 to 0.6326.
    sec: whose-structure
---

The biggest single gain of the second campaign has a plain form:

```python the rule, in one line
cherry[57] ≈ 0.3 * cherry[12] + 0.2 * cherry[40] + ...
```

Element 57 of a value cherry is guessed from elements 12 and 40 of the same cherry, which the decoder has already read. The weights are the same for every cherry of a [[punnet]], stored once in its [[dictionary]], and, it turned out, nearly the same in every punnet of every sequence. This page is about that rule, and about telling its gain apart from the repeats of [[#measured-night-one]].

## The rule {#the-rule}

The stage is [[linear-prediction]] across elements, the one [[#toolbox-linear-prediction]] describes: guess an element from elements already decoded in the same cherry, as a weighted sum; store the table of which elements and which weights once per punnet; code the exact correction. In the campaign's compressors the guess sits on top of the [[reference-cherry]]: value ≈ the reference's value + Σ weight × (decoded element − the reference's value there). It is not the [[klt]] of [[#toolbox-klt]]: a rotation also mixes elements, but it rounds the whole rotated vector, about a quarter of a bit per element. Prediction subtracts a guess and never rounds.

::: theme predict-correct
The [[predictive-coding]] of [[#school-prediction]] turned sideways: FLAC predicts a sample from earlier samples in time; here an element is predicted from earlier elements of the same cherry.
:::

The ladder below is one [[screen]]: `V · all · cherry (2, 256) · stretch 4096 · leash 293 (screen)`, two dev sequences, 72 punnets. Every row is a [[verified-result]].

| compressor | what changed | ratio |
|---|---|---:|
| 71, prediction off | Night one's tree compressor, on both heads of a KV layer | 0.6902 |
| 71 | 16 terms per element, from the other head only | 0.6775 |
| 74 | terms added one at a time until the next stops paying | 0.6664 |
| 80 | any earlier element may be a term, in either head | 0.6562 |
| 89 | the positions of the terms stored more cheaply | 0.6470 |
| 102 | bytes laid out along tree paths: one cherry reads one path, not whole levels | 0.6449 |
| 111 | the tree built on distance *after* prediction | 0.6435 |
| 114 | weights rounded by what each rounding costs in bits | 0.6417 |
| 126, a side branch off 102 | the decoder blends in its ancestors' errors; no byte sent | 0.6407 |
| 115 | head 0 first, then head 1; no stored order | 0.6400 |
| 121 | 115 with slopes and tree refit together | **0.6364** |

::: figure fig-measured-ladder-c2 msrLadderC2
**From 0.690 to 0.636 on one screen.** Bars: MDL ratio of each compressor on the layer screen (cherry `(2, 256)`, stretch 4096, leash 293, two dev sequences), every bar verified by a separate decoder process. Right: 121 against 102 on five sequences as five paired points, −0.0088 on each; the sequences themselves differ by ten times as much. Hover for trial ids; data from `figures/data/measured-ladders.json`.
:::

The last rung held up best. On five sequences of the larger dataset, 121 scores 0.62970 against 102's 0.63848: −0.0088 on every sequence (−0.00883, −0.00887, −0.00861, −0.00874, −0.00886), a spread of 0.0001. Its price is [[reads]], 120 against 103 cherries' worth per cold decode.

The rule is not free. Storing it costs 0.013 to 0.021 of ratio at a stretch of 4096, and that price shaped it: offered every earlier element, with the bit cost of each weight deciding, the compressor kept more terms at fewer bits each and saved more (three single punnets). Sparsity was a price, not a fact about the values.

::: takeaway
- Linear prediction across elements, on top of a reference cherry, took the layer screen from 0.690 to 0.636; 121 beats 102 by 0.0088 on every one of five sequences.
- The rule costs 0.013 to 0.021 to store at a stretch of 4096; terms are sparse because terms cost bytes.
:::

## The shuffle {#the-shuffle}

The site's own control is the [[shuffle-control]] of [[#scenario-the-harness]]: destroy the neighbourhoods and every gain that lived on them must vanish. The campaign's version: a KV layer's tokens drawn at random from both sequences into punnets of 4096, both heads of a token kept together, real compressors on the result.

The tree compressor collapsed, 0.6907 to 0.7520, about 70 % of its gain over solo gone (0.711 to 0.773 on another slice). The prediction gain did not move: −0.0337 to −0.0344 for one rule, −0.0232 to −0.0210 for another. Eight to forty-one windows of two sequences, encoder bytes.

::: figure fig-measured-shuffle msrShuffle
**Trust, but shuffle.** Grouped bars. Left: MDL ratio of the reference-tree compressor on real punnets (0.6907) and on shuffled punnets (0.7520), each shuffled punnet a random sample of a KV layer's tokens with both heads of a token kept together. Right: two linear-prediction gains on real and on shuffled punnets (−0.0337 to −0.0344; −0.0232 to −0.0210). Encoder bytes, 8 to 41 windows of two sequences, not verified in a separate process. Data: `figures/data/measured-splits.json`.
:::

::: theme controls
The shuffle did what the harness page asked of it: it separated two gains that one score had added together. One vanished, one stayed.
:::

The two gains also barely overlap: on one punnet per KV layer, the tree alone saves 0.064 to 0.142, prediction alone 0.055 to 0.095, the overlap 0.024 to 0.042. At KV layers 1 and 2 (the LLM's layers 7 and 11) prediction alone beats the tree.

::: takeaway
- Shuffle the tokens and the tree compressor loses 70 % of its gain; the prediction gain stays within 0.002.
- Two gains, overlapping by only 0.024 to 0.042: repeats and geometry are different structure.
:::

## Whose structure {#whose-structure}

Repeats belong to the text. The geometry belongs to the LLM, mostly:

- A rule fit on *another* sequence recovers 91 to 96 % of the gain (one test punnet per KV layer, a code-length calculation without a compressor).
- The pattern of which elements share correlates 0.9995 between the two datasets (10 sequences, a Gaussian estimate).
- The catch: the weights carry over, the choice of terms does not. Refitting another sequence's pattern costs +0.0095 at KV layer 2, and a fully paid rule fit on its own punnet beat a free rule from another sequence on four of six KV layers (0.61239 against 0.6132).

One more thing the rule revealed. At KV layer 4 (the LLM's layer 19), one tree over a whole token keeps 4 103 terms inside head 0 and 29 835 from head 0 into head 1: head 1 is largely an image of head 0 (one punnet). That is why coding head 0 first, then head 1, beat a clever order, and it is the first clue to [[stereo]] similarity, which [[#measured-cutting-the-tensor]] measures.

And an open door. The expensive part of this mechanism is writing the rule down in every punnet. A rule the weights already imply might not need storing: a table prepared in advance, specific to no sequence, held by both sides. The campaign did not yet allow one; a [[code-length-estimate]] says it would take compressor 102 from 0.6407 to 0.6326 at a stretch of 4096 (12 punnets). That is the shared-table question of [[#measured-where-the-bits-come-from]].

::: aside source Receipts
Ladder: r7-t0002, r7-t0001, r7-t0003, r11-t0001, r11-t0003, r11-t0002, r22-t0001, r22-t0003, r20-t0001, r22-t0005, env-t0096, all on `s-layer-b4k-r293`; five sequences: env-t0096 against r24-t0002 on `st02n5-layer-b4k-r293`. Rule cost: r22 iter-1-1. Sparsity and head 1: r22 iter-1-2. Overlap: r11 iter-1-2. Shuffle: r12 iter-1-2, iter-1-3. Portability: r7 iter-1-2. The 0.9995: r9 iter-1-3. Shared-table estimate: r23 iter-1-2.
:::

::: takeaway
- A rule fit elsewhere recovers 91 to 96 %; the shared pattern correlates 0.9995 across datasets. The weights travel, the choice of terms does not.
- Head 1 is largely an image of head 0. A rule the weights imply might not need storing at all.
:::
