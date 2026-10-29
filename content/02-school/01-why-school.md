---
title: Why go back to school?
nav: Why go back to school?
lede: The rest of this site speaks a small language of bits, predictions, vectors, number formats and caches. This Part teaches that language from scratch, with a weather station instead of a language model.
cards:
  - q: Why does the "Back to school" Part use a weather station instead of a language model?
    a: So each idea can be learned on a toy whose behaviour is easy to picture, before it is applied to KV caches
    wrong: ["Because the project is about weather data", "Because language models do not use bits", "Because KV caches cannot be described with these ideas"]
    why: Every concept is introduced on a small, concrete toy first; the KV cache only arrives in Part III, when the vocabulary is ready.
    sec: plan
  - q: In the toy world, what plays the role of an expensive, slow link?
    a: The radio link from Gull Rock to the mainland, paid per byte
    wrong: ["The station's thermometer", "The harbour office's desk", "The sky camera"]
    why: Paying per byte is what makes bits worth counting; later the link becomes the wire between host memory and the GPU.
    sec: toy-world
  - q: Which five families of ideas does the primer cover?
    a: Information, coding, statistics & vectors, number formats, machines (memory and caches)
    wrong: ["Calculus, algebra, geometry, logic, probability", "Training, inference, quantization, pruning, distillation", "Keys, values, queries, heads, layers"]
    why: These are the five columns of the concept map on this page.
    sec: map
---

The first draft of this proposal was written in a hurry, in the dialect of the papers it had just read. Words like "channel", "codebook", "escape stream", "order-0 entropy" and "KLT" appeared without warning, each meaning whatever its source paper meant by it. If you had read those papers, the draft made sense. If you had not, it was a wall.

This Part is the cure. It is a short course — about twenty small pages — on every idea the rest of the site needs. There are no language models in it. Instead there is a weather station, a radio link, a harbour office and a few stubborn numbers, because ideas are easier to learn on things you can picture.

## The plan {#plan}

Each page of this Part teaches one idea, in the same rhythm:

1. **A toy situation** from the weather station that makes the idea necessary.
2. **The idea itself**, named and defined. Defined terms look like [[lossless]] (a plain term, tinted by its family) or like [[dictionary]] (a signature term with its own emblem) — both met in Part I. Hover either one, anywhere on the site, for a reminder.
3. **A small calculation or an interactive figure** you can play with.
4. **A takeaway card**, and a few flashcards you can add to your deck.

Nothing later on the site uses a term that is not defined here or on the page where it first appears. If you ever find one, that is a bug.

::: note intuition If you already know this material
Skim. The toy examples are quick, and the pages also fix *which* word and *which* letter we use for each idea, so that later parts can be precise. The [[#reference-notation|notation table]] and the [[#reference-glossary|glossary]] collect all of it in one place.
:::

::: takeaway
- One idea per page: toy situation, definition, something to play with, takeaway.
- Every term is defined before it is used, and remembered on hover afterwards.
:::

## The toy world {#toy-world}

You have already met the **Gull Rock weather station** in Part I. In this Part it gets a little world around it.

::::: cols
::: col The station on Gull Rock
Every 30 minutes it measures four things — temperature, humidity, air pressure and wind speed — and a camera classifies the sky as *sunny*, *cloudy*, *rain* or *fog*. A second thermometer sits higher up the mast. An 8-bit chip stores some readings in a compact form.
:::
::: col The radio link
The only way to the mainland. It is slow and **paid by the bit**, so every bit saved is money saved. Both ends can agree on things in advance — an almanac, a codebook — and keep them for years.
:::
::: col The harbour office
On the mainland a forecaster works at a desk with room for only a few logbooks. Everything else is in the archive downstairs, brought up by a slow lift. The desk is fast and small; the archive is big and slow.
:::
:::::

These three places will carry every idea of the course.

- The **station** produces data: symbols, numbers, vectors of readings.
- The **radio link** makes us count bits, and asks what the receiver already knows.
- The **harbour office** makes us think about what to keep close at hand and what to fetch.

When the language model arrives in Part III, each of them will have a counterpart. The station becomes the model producing its memory, the radio link becomes the wire between host memory and the GPU, and the harbour desk becomes the GPU's small, fast memory.

::: takeaway
- Station = where data comes from. Radio link = where bits cost money. Harbour office = where fast-but-small meets big-but-slow.
- Each of them maps onto part of the real system later on.
:::

## The map of what you will learn {#map}

The ideas of this course fall into five families. The map shows them as cards, with arrows from each idea to the ideas built on it. Hover a card to light up its connections; click it to go to its page.

```graph
id: school-map
columns: [Information, Coding, "Statistics & vectors", Number formats, Machines]
nodes:
  - {id: bits, col: 1, row: 1, title: "Bits", text: "Yes/no answers; what we count.", link: school-bits, term: bit}
  - {id: surprise, col: 1, row: 2, title: "Surprise", text: "Rare events carry more bits.", link: school-surprise, term: surprisal}
  - {id: entropy, col: 1, row: 3, title: "Entropy", text: "The average surprise of a source.", link: school-entropy, term: entropy}
  - {id: side, col: 1, row: 4, title: "Side information", text: "What the receiver already knows.", link: school-side-information, term: side-information}
  - {id: mi, col: 1, row: 5, title: "Mutual information", text: "Bits saved by knowing something.", link: school-mutual-information, term: mutual-information}
  - {id: codes, col: 2, row: 1, title: "Codes & Huffman", text: "Turning symbols into bits.", link: school-codes, term: huffman}
  - {id: arith, col: 2, row: 2, title: "Arithmetic coding & rANS", text: "Fractions of a bit.", link: school-arithmetic, term: entropy-coder}
  - {id: fixed, col: 2, row: 3, title: "Fixed-length codes & escapes", text: "Fast, parallel, random access.", link: school-fixed-length, term: fixed-length-code}
  - {id: pred, col: 2, row: 4, title: "Predict, then store the surprise", text: "Residuals instead of values.", link: school-prediction, term: predictive-coding}
  - {id: amort, col: 2, row: 5, title: "Amortization", text: "Pay once, share widely.", link: school-amortization, term: amortization}
  - {id: shapes, col: 3, row: 1, title: "Residual shapes", text: "Bell curves and pointy curves.", link: school-residual-shapes, term: gaussian}
  - {id: rate, col: 3, row: 2, title: "The exchange rate", text: "Variance explained → bits saved.", link: school-exchange-rate, term: r-squared}
  - {id: vectors, col: 3, row: 3, title: "Vectors & channels", text: "Readings as lists of numbers.", link: school-vectors, term: channel}
  - {id: corr, col: 3, row: 4, title: "Correlation", text: "Channels that move together.", link: school-correlation, term: covariance}
  - {id: klt, col: 3, row: 5, title: "Turning the axes (KLT)", text: "Rotate to the data's own axes.", link: school-rotation, term: klt}
  - {id: gain, col: 3, row: 6, title: "Transform coding gain", text: "What the rotation buys, in bits.", link: school-coding-gain, term: transform-coding-gain}
  - {id: vq, col: 3, row: 7, title: "Clusters & codebooks (VQ)", text: "Name the nearest prototype.", link: school-clusters, term: vq}
  - {id: ints, col: 4, row: 1, title: "Integers & floats", text: "Uniform grids and logarithmic grids.", link: school-integers-floats, term: floating-point}
  - {id: fp8, col: 4, row: 2, title: "FP8 and index space", text: "Eight bits, counted in grid steps.", link: school-fp8, term: fp8}
  - {id: caches, col: 5, row: 1, title: "Caches & LRU", text: "The desk and the archive.", link: school-caches, term: lru}
  - {id: reuse, col: 5, row: 2, title: "Reuse distance", text: "One curve for every cache size.", link: school-reuse-distance, term: reuse-distance}
  - {id: wires, col: 5, row: 3, title: "Wires & memories", text: "Bandwidth, latency, HBM, DRAM.", link: school-wires, term: bandwidth}
edges:
  - [bits, surprise]
  - [surprise, entropy]
  - [entropy, side, "condition on"]
  - [side, mi]
  - [entropy, codes, "sets the floor"]
  - [codes, arith]
  - [arith, fixed]
  - [mi, pred]
  - [pred, shapes]
  - [shapes, rate]
  - [rate, gain]
  - [vectors, corr]
  - [corr, klt]
  - [klt, gain]
  - [vectors, vq]
  - [ints, fp8]
  - [fp8, pred]
  - [caches, reuse]
  - [reuse, wires]
  - [side, amort]
```

Three threads run through the whole map, and you will see them called out wherever they appear.

::: theme predict-correct
Most of the course is variations on one move: guess, then send only how wrong the guess was. Huffman codes, residuals, rotations and codebooks are all different ways of guessing.
:::

::: theme side-info
A message is cheaper when the receiver already knows something useful. Conditional entropy and mutual information measure exactly how much cheaper.
:::

::: theme bits-unit
We always measure in bits. A bit saved on every value of a stream is money saved on the radio link — and, later, bytes saved on the wire to the GPU.
:::

::: takeaway
- Five families: information, coding, statistics & vectors, number formats, machines.
- Three threads tie them together: predict-then-correct, side information, and counting everything in bits.
- The next page starts at the very bottom: what a bit is.
:::
