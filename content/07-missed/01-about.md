---
title: The first draft, and why corrections are a gift
nav: About this Part
lede: Before this site there was a first draft of the idea, written fast and in the dialect of the papers it had just read. This Part goes through the sixteen things it got wrong, did not know, or did not use, one page each.
cards:
  - q: Which sentence of the first draft does this Part keep coming back to?
    a: '"HiSparse''s high hit rate shows that this ladder is steep at the bottom rung, so a block dictionary should work."'
    wrong: ['"A block dictionary is too heavy to keep on the GPU."', '"The KV cache cannot be compressed losslessly."', '"Sparse attention makes the cache unnecessary."']
    why: It sounds like measurement → conclusion → design, and every step of it needs a correction (VII.2, VII.3, VII.6).
    sec: first-draft
  - q: How many items does "What Dima missed" collect, and in which groups?
    a: Sixteen — 7 corrections, 5 fields and tools, 4 design changes
    wrong: ["Seven, all of them corrections", "Twelve — 6 corrections and 6 additions", "Sixteen — 8 corrections and 8 design changes"]
    why: Corrections are VII.2–VII.8, fields and tools VII.9–VII.13, design changes VII.14–VII.17.
    sec: map
  - q: Why does this site call the corrections a gift?
    a: Each one sharpened a question and changed the plan before any GPU time was spent
    wrong: ["They prove that the idea does not work", "They make the proposal shorter", "They are what reviewers ask for"]
    why: A wrong claim found on paper costs an afternoon. Found after a weekend of measuring the wrong thing, it costs the weekend.
    sec: gift
  - q: Did any of the seven corrections overturn the direction of the idea?
    a: No — each changes how the idea is measured or built, not where it points
    wrong: ["Yes — the VQ correction", "Yes — the access-pattern correction", "Yes — all seven together"]
    why: Dictionaries plus deltas on the miss path survive every item. What changes is the evidence, the default dictionary, the number format and the codec's shape.
    sec: gift
---

Here is one sentence from the first draft of this idea, exactly as the earlier version of this proposal recorded it:

> "HiSparse's high hit rate shows that this ladder is steep at the bottom rung, so a block dictionary should work."

Read it twice. It has the shape of a good argument: a measurement, a conclusion, a design. Every word in it sounds reasonable. And it took large parts of Parts III, IV and VI to take apart.

This Part collects every such place in one list, the way the original proposal did under the heading *What Dima missed*. Dima wrote the first draft. The list is long, and nothing in it is an embarrassment. It is the most useful page of the whole proposal.

## The first draft {#first-draft}

The first draft was a page of notes. It had three features worth knowing about before reading the corrections.

1. **It pointed in the right direction.** Store the KV history as [[dictionary|dictionaries]] plus small [[delta|deltas]], so that a cache miss moves fewer bytes and the GPU rebuilds the entry exactly. That is still the idea of [[kv-blockdiff]]. No item in this Part reverses it.
2. **It spoke the papers' dialect.** "LZ dictionaries", "VQ codebooks as dictionary compression", "lightningindex". [[#tiny-files-profile]] puts its loose words next to the words this site uses.
3. **It made a handful of claims that were wrong or incomplete.** These are the seven corrections.

| the first draft | what we say now | page |
|---|---|---|
| "HiSparse's high hit rate shows that this ladder is steep … so a block dictionary should work" | hits are about *which* entries are wanted, not *what* is inside them | [[#missed-two-localities\|VII.2]] |
| "similarity, redundancy, mutual information", with the direction reversed | mutual information is the bits saved; it rises with similarity | [[#missed-mutual-information-direction\|VII.3]] |
| "should I start with 128K-token blocks or 64K?" | the block size is a knob, read off a curve | [[#missed-block-is-a-knob\|VII.4]] |
| "VQ then Gaussian entropy encode the error" | on bell-shaped data a codebook cannot beat a rotation | [[#missed-vq-then-code\|VII.5]] |
| *a napkin estimate that "the same subject" buys many bits* | one bit per element needs 75 % of the variance explained | [[#missed-harsh-exchange-rate\|VII.6]] |
| *reasoning in BF16, and subtracting on any grid* | 8 bits is the target, and the grid shapes prediction | [[#missed-mantissa-and-grid\|VII.7]] |
| *reaching for bulk compressors* | scattered single reads decide the codec's shape | [[#missed-access-pattern\|VII.8]] |

Words in quotation marks are the draft's own, as the earlier proposal recorded them. Words in italics are our paraphrase: the proposal recorded the correction there, not the sentence.

::: takeaway
- The first draft got the direction right and several steps wrong.
- Seven of its claims are corrected on pages VII.2–VII.8. Quotes are the draft's words; italics are paraphrases.
:::

## Why corrections are a gift {#gift}

A correction found early is cheap, and it improves the question.

- **It is cheap now and expensive later.** A wrong claim caught on paper costs an afternoon. Caught after a weekend of GPU time spent measuring the wrong thing, it costs the weekend. Caught by a reviewer, it costs the paper.
- **The wrong version shows which distinction matters.** Merging two kinds of "locality" (VII.2) is what forced us to name them, the [[lucky-louis]] and [[fallen-apple]], and to build a control that tells them apart.
- **Every correction left a mark on the plan.** None of them is only a footnote.

| correction | what the plan does because of it |
|---|---|
| VII.2 two localities | measures the bytes directly, in bits, with a [[shuffle-control]]; never cites the hit rate as evidence |
| VII.3 direction of mutual information | tests the *size* of the ladder; its direction is a theorem |
| VII.4 the block is a knob | sweeps block sizes and reads $\vb$ off a distance curve |
| VII.5 VQ then code | starts with light dictionaries; measures VQ as one rung |
| VII.6 harsh exchange rate | reports [[r-squared\|R²]] per channel and hunts for a few dominant channels |
| VII.7 mantissa and grid | scores E4M3 and INT8 side by side, with a per-channel "predict or not" flag |
| VII.8 access pattern | stores fixed-length deltas with no coder state between entries |

::: note intuition The red pen
A draft with red ink on it is worth more than a clean one. The red marks are where the thinking happened. This Part is the red ink, collected and explained.
:::

::: takeaway
- Corrections are cheapest on paper, before any measurement is built.
- Each one sharpened a question and changed the plan; none of them reversed the idea.
:::

## The map of this Part {#map}

The original list had sixteen items in three groups. Here they are as cards, with arrows where one item leads to another. Hover a card to light up its neighbours; click it to open its page.

```graph
id: missed-map
columns: [Corrections, Fields and tools, Design changes]
nodes:
  - {id: loc2, col: 1, row: 1, title: "Two localities", text: "Hits say which entries; bits say what is inside.", link: missed-two-localities, term: lucky-louis}
  - {id: mi, col: 1, row: 2, title: "Mutual information points up", text: "It is the bits saved, and grows with similarity.", link: missed-mutual-information-direction, term: mutual-information}
  - {id: knob, col: 1, row: 3, title: "The block is a knob", text: "A property is a curve; a block size is a choice.", link: missed-block-is-a-knob, term: block}
  - {id: vq, col: 1, row: 4, title: "VQ cannot beat a rotation", text: "On bell-shaped data the index tax eats the gain.", link: missed-vq-then-code, term: vq}
  - {id: rate, col: 1, row: 5, title: "A harsh exchange rate", text: "One bit needs 75 % of the variance explained.", link: missed-harsh-exchange-rate, term: r-squared}
  - {id: grid, col: 1, row: 6, title: "Mantissa and grid", text: "BF16's low bits are noise; the 8-bit grid is not neutral.", link: missed-mantissa-and-grid, term: fp8}
  - {id: access, col: 1, row: 7, title: "The access pattern", text: "Scattered single reads rule out stream codecs.", link: missed-access-pattern, term: random-access}
  - {id: stack, col: 2, row: 1, title: "The stack-distance curve", text: "One curve behind every cache number.", link: missed-stack-distance, term: reuse-distance}
  - {id: pc, col: 2, row: 2, title: "Predictive coding", text: "The real home: predict, keep the residual, side information at both ends.", link: missed-predictive-coding, term: predictive-coding}
  - {id: lift, col: 2, row: 3, title: "Lifting", text: "How a rotation becomes exactly reversible.", link: missed-lifting, term: lifting}
  - {id: bounds, col: 2, row: 4, title: "Bounds before building", text: "Compute the ceiling before the coder.", link: missed-rate-distortion-bounds, term: rate-distortion}
  - {id: ctx, col: 2, row: 6, title: "Context modelling", text: "Use the prediction as context: it never loses.", link: missed-context-modeling, cat: coding}
  - {id: victim, col: 3, row: 1, title: "A victim tier of deltas", text: "Keep evicted entries as deltas on the GPU.", link: missed-victim-tier, term: victim-tier}
  - {id: result, col: 3, row: 3, title: "A measurement is a result", text: "The distance curve is worth publishing either way.", link: missed-a-measurement-is-a-result, term: shuffle-control}
  - {id: light, col: 3, row: 4, title: "Light dictionaries first", text: "Location and scale, resident for every block.", link: missed-light-dictionaries-first, term: loc}
  - {id: rope, col: 3, row: 5, title: "Keys before RoPE", text: "Keys and values as two problems.", link: missed-keys-before-rope, term: rope}
edges:
  - [loc2, stack, "which entries"]
  - [stack, victim, "read off the curve"]
  - [mi, pc, "formal home"]
  - [pc, lift, "lossless rotation"]
  - [knob, result, "the distance curve"]
  - [vq, bounds, "a bound"]
  - [bounds, light, "so: light first"]
  - [rate, rope, "dominant channels"]
  - [grid, ctx, "never loses"]
  - [access, ctx, "off the GPU path"]
```

Every page in this Part has the same five steps.

1. **What the first draft said**, quoted where the earlier proposal kept the words, paraphrased where it did not.
2. **Why it was tempting.** The strongest version of the wrong idea, because a weak version teaches nothing.
3. **A slower look.** A new toy, figure or small experiment. The pages of Parts II, IV and VI that worked the idea out first are linked, not repeated.
4. **What changes in the plan.**
5. **Connections.** The running themes that show up, and a side-by-side comparison of two things that are easy to confuse.

These pages come after Parts I–VI, so they use that vocabulary freely. Hover any term for a reminder.

::: takeaway
- Sixteen items: seven corrections (VII.2–VII.8), five fields and tools (VII.9–VII.13), four design changes (VII.14–VII.17).
- Each page: the claim, why it tempted, a slow look, what changes, how it connects.
:::
