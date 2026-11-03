---
title: 'The stretch: a knob, not a fact'
nav: The stretch
group: The objects
lede: Before anything is compressed, the sequence is cut into runs of consecutive token positions. The cut is ours to choose, and it says nothing yet about which numbers are in play.
cards:
  - q: 'Token position 13 in a sequence cut into stretches of `stretch_len = 4` belongs to which stretch?'
    a: Stretch 3
    wrong: ["Stretch 4", "Stretch 13", "Stretch 1"]
    why: '`stretch_id = token_pos_id // stretch_len = 13 // 4 = 3`; stretch 3 holds positions 12 to 15.'
    sec: the-cut
  - q: Why does this site call the stretch "a knob, not a fact"?
    a: Because we choose its length; nothing in the orchard marks where a stretch ends
    wrong: ["Because stretches are fixed by the LLM's architecture", "Because the indexer decides the stretches", "Because the GPU chooses the stretch length at run time"]
    why: 'Defining a hypothesis as "cherries are alike within a stretch" would bake our design choice into the science. The orchard has distances and repeats, not stretches.'
    sec: the-cut
  - q: What does a stretch say about which layers, heads or elements are in play?
    a: Nothing; a stretch is a range of token positions only
    wrong: ["It fixes one layer", "It fixes keys or values", "It fixes the cherry shape"]
    why: The stretch is one of three independent choices. Which coordinates are in play is the slice; how they are diced is the cherry shape.
    sec: what-it-is-not
---

"Should the first experiment use 128K-token blocks or 64K?" That was a real question in the first draft of this project. <!-- old-words -->
It sounds like a question about the data, as if the orchard came pre-cut and we only had to find out how long the pieces are.

It does not. The cut is ours. Getting that straight is the first object of the scenario, and the one with the most consequences.

## The cut {#the-cut}

Take one [[sequence]]. Its token positions run `token_pos_id = 0, 1, 2, …`. Now cut that line every `stretch_len` positions.

::: define stretch
- **What it is.** `stretch_len` consecutive token positions of one sequence. We number stretches `stretch_id = 0, 1, 2, …` and `stretch_len` is a knob we set.
- **Example.** With `stretch_len = 4`, stretch 3 holds positions 12, 13, 14 and 15. In the examples of this site `stretch_len = 4096`: a 225K-token sequence on [[bench|the Bench]] has 55 stretches; a 100K-token sequence on [[pin|the Pin]] has 25.
- **Easy to confuse with** a property of the data. Nothing in an orchard says "a stretch ends here". And with a [[#scenario-punnet|punnet]]: a stretch is a range of positions; a punnet is the set of cherries cut from it under a slice.
:::

Which stretch does a position live in? Integer division answers it:

```python which stretch a token position belongs to
stretch_id = token_pos_id // stretch_len          # 13 // 4 == 3
first, last = stretch_id * stretch_len, (stretch_id + 1) * stretch_len - 1   # 12, 15
```

$$
\vj \;=\; \Big\lfloor \underbrace{\vt / \vb}_{\text{position} \,\div\, \text{stretch length}} \Big\rfloor, \qquad \text{stretch } \vj \text{ holds positions } \vj\vb \;\dots\; (\vj+1)\vb - 1 .
$$ {#eq-scn-stretch-index}

::: figure fig-scn-stretch-knob scnStretchKnob
**One toy sequence of 32 token positions, cut into stretches.** Each small tile is one token position. Dashed frames are stretches; the solid, tinted frame is the stretch that holds the chosen position. Choose `stretch_len` with the buttons and the position with the slider (or click a tile); the readout shows `stretch_id = token_pos_id // stretch_len`, the position's place inside its stretch, and how many stretches the sequence has.
:::

::: try
1. Keep `token_pos_id = 13` and step `stretch_len` from 1 to 32. The position never moves; only the frame around it changes.
2. At `stretch_len = 32` the whole sequence is one stretch. That is "sequence scope" ([[#scenario-scope]]): one dictionary for the whole conversation.
:::

Why insist? Because the hypotheses this project tests ([[#hypotheses-fallen-apple]], [[#hypotheses-echo]]) are about *distance between tokens* and *repeats of tokens*. If they were phrased as "cherries are alike within a stretch", our choice of `stretch_len` would be smuggled into the science. Phrased as distance and repetition, the data can tell us which `stretch_len` to choose.

::: takeaway
- A stretch is `stretch_len` consecutive token positions; `stretch_id = token_pos_id // stretch_len`.
- The stretch length is a knob we set, not a fact we discover.
:::

## What a stretch is not {#what-it-is-not}

A stretch is a range along one axis of the orchard, the token axis, and nothing more. Three things it does not decide:

- **Which layers, heads or elements are in play.** That is the [[#scenario-slice|slice]] (next page). The same stretch can be in play for the values of one head, or for keys and values of every layer.
- **What one cherry is.** That is the [[#scenario-cherry|cherry shape]] ([[#scenario-cherry]]). One stretch of 4096 positions can yield 4096 cherries, or 8192, or 24 576.
- **What one dictionary serves.** That is the [[#scenario-punnet|punnet]] ([[#scenario-punnet]]): the cherries that fall out of one stretch under one slice and one cherry shape.

The old site used one word, "block", for the stretch and for the punnet, and the two drifted apart as soon as only part of the orchard was compressed. Hence two words. <!-- old-words -->

::: note warning The campaigns' stretch lengths
The campaigns of Part VIII cut their sequences at 512, 4096, 16 384 and 32 768 positions and found 4096 a good compromise between a dictionary's reach and its cost ([[#measured-reading-one-cherry]]). The site's examples use 4096. Nothing about the data makes it special. The scenarios in scope since 2026-11-03 use 512, 4096, 16 384 and the whole sequence, each stretch length with its own leash ([[#scenario-the-leash]]); the positions at the end of a sequence that do not fill a stretch are dropped, so every punnet of a scenario has the same number of cherries.
:::

::: takeaway
- A stretch decides nothing about layers, heads, elements, cherry shape or what a dictionary serves.
- Stretch (positions) and punnet (cherries) are two words for two things.
:::
