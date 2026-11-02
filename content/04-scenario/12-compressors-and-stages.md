---
title: 'Compressors: a graph of stages'
nav: Compressors and stages
group: The catalogue
lede: A compressor is not one named trick. It is a small dataflow graph that turns a punnet into dictionary bytes and delta bytes, and each node of the graph is a stage that can be swapped.
cards:
  - q: What is a compressor on this site?
    a: One concrete compress/decompress pair, built as a dataflow graph of stages from raw cherries to dictionary bytes and delta bytes
    wrong: ["The harness that scores it", "The scenario it runs on", "Any program that reduces file size"]
    why: The scenario is the problem; the compressor is one attempt. The campaigns wrote 126 of them, mostly by swapping or adding one stage to an earlier one.
    sec: the-graph
  - q: Which stage does every lossless compressor on this site end with?
    a: An entropy coder or a fixed-length code with escapes, on exact integer residuals
    wrong: ["A quantiser on the deltas", "A matrix multiplication", "A sort of the cherries"]
    why: Predict, take the exact residual, code it. A quantiser may appear only on the dictionary side; deltas are never rounded.
    sec: the-graph
  - q: What is the solo family?
    a: 'Compressors with an empty dictionary: each cherry coded on its own with a fixed table'
    wrong: ["Compressors that use one reference cherry", "Compressors without an entropy coder", "The best compressors of the campaigns"]
    why: 'Solo is the baseline every dictionary must beat: 0.778 on the Bench''s values, from per-furrow order-0 tables fit on a calibration corpus.'
    sec: solo
---

Ask a compression engineer what a compressor is and you get a name: zstd, FLAC, JPEG 2000. Ask what it *does* and you get a diagram: bytes go in, pass through a few boxes, bits come out. The boxes are the useful level of description, because that is where the design choices are, and because the campaigns' 126 compressors differ from each other by one or two boxes at a time.

## The graph {#the-graph}

::: define compressor
- **What it is.** One concrete pair `compress(punnet) -> (deltas, dictionary)` and `decompress(delta, dictionary) -> cherry`, built as a dataflow graph of [[stage|stages]]. The raw bytes of a punnet enter; dictionary bytes and delta bytes leave.
- **Example.** Compressor 121 of campaign C2: a bit-field split, a reference tree over the punnet, a linear prediction across elements, exact residuals, an entropy coder per furrow, and a layout that keeps each cherry's path through the dictionary short.
- **Easy to confuse with** the [[#scenario-the-harness|harness]] (which scores compressors and codes nothing), with the [[scenario]] (the problem), and with a stage (one node of the graph).
:::

::: define stage
- **What it is.** One node of a compressor's graph: a transform of the data, a predictor, a splitter of bit fields, a quantiser (dictionary side only), an entropy coder, a layout. Each stage may put bytes into the dictionary, into every delta (a per-cherry tax), or neither.
- **Example.** "Per-furrow locations" is a stage: it puts 512 bytes into the dictionary and subtracts a location from every element. "Reference tree" is a stage: it puts whole cherries into the dictionary and a pointer into every delta.
- **Easy to confuse with** a whole compressor. Part V catalogues stages; compressors are built by chaining them.
:::

```graph
id: scn-compressor-graph
columns: [Raw punnet, Split and predict, Residual and code, Outputs]
nodes:
  - {id: raw, col: 1, row: 1, title: "punnet", text: "(punnet_size, *cherry_shape) of 8-bit codes.", term: punnet}
  - {id: split, col: 2, row: 1, title: "Bit-field split", text: "Sign and exponent one way, mantissa another.", term: bit-field-split}
  - {id: pred, col: 2, row: 2, title: "Predictor", text: "Furrow statistics, a reference cherry, a linear prediction, a basis, a codebook.", term: prediction}
  - {id: res, col: 3, row: 1, title: "Exact residual", text: "Value minus prediction, as an integer in index space.", term: residual}
  - {id: code, col: 3, row: 2, title: "Entropy coder or fixed-length code", text: "Per furrow, with escapes if fixed-length.", term: entropy-coder}
  - {id: dict, col: 4, row: 1, title: "dictionary", text: "Everything the predictor and the coder share across the punnet.", term: dictionary}
  - {id: delta, col: 4, row: 2, title: "deltas[i]", text: "The coded residual of cherry i, plus its per-cherry tax.", term: delta}
edges:
  - [raw, split]
  - [split, pred]
  - [pred, res, "guess"]
  - [res, code]
  - [pred, dict, "tables, references"]
  - [code, dict, "probability tables"]
  - [code, delta]
  - [pred, delta, "pointers, indices"]
```

Three shapes recur in every compressor of this project, and Part V takes each apart:

1. **Predict, then take the exact residual.** Every stage that "knows" something about a cherry turns it into a guess; what is coded is the integer difference, in [[index-space]] of the number format, so that the sum rebuilds the exact 8-bit code ([[#toolbox-the-bill]]).
2. **Split the bits before predicting.** The sign and exponent of an FP8 element are predictable; the low mantissa bits are close to noise. Routing them to different paths saves effort where there is nothing to predict ([[#toolbox-bit-fields]]).
3. **End with a code that decodes alone.** An [[entropy-coder]] per cherry, or a [[fixed-length-code]] with [[escape|escapes]]; never a stream across cherries, because of the contract's cold decode ([[#toolbox-two-rates]]).

The dictionary and the deltas are the two outputs, and every stage must say which of them it writes to. That is the [[#toolbox-the-bill|bill]] of the next Part: residual bits, plus whatever each delta carries, plus the dictionary spread over the punnet.

::: theme predict-correct
Every box in the middle of the graph is a predictor of some kind, and every compressor on this site has the same silhouette: guess, subtract, code the surprise.
:::

::: takeaway
- A compressor is a dataflow graph of stages from a punnet to dictionary bytes and delta bytes.
- Stages predict, split bits, take exact residuals and code them; each stage writes to the dictionary, to every delta, or neither.
:::

## The solo family {#solo}

The simplest graph has no dictionary at all.

::: define solo
- **What it is.** The family of compressors whose dictionary is empty: each cherry is coded on its own with a fixed table, typically one order-0 probability table per furrow, fit once on a [[calibration-set|calibration corpus]] and known to both sides.
- **Example.** On the Bench's values, the ideal solo rate is an MDL ratio of 0.778 (6.22 bits per element) over six layers; the best real solo compressor reached 0.804 ([[#toolbox-solo]]).
- **Easy to confuse with** "no compression". Solo compresses, by about 1.1 to 1.3×, because 8-bit codes are used unevenly. It is the baseline every dictionary must beat, not the raw rate.
:::

Solo is where the whole design space starts. Any compressor with a dictionary must save more on its deltas than the dictionary costs, *compared with solo*, or it has not earned its keep. The square of [[#scenario-the-score]] draws that line at 0.778.

::: takeaway
- Solo: empty dictionary, one fixed table per furrow; 0.778 on the Bench's values.
- Every dictionary is judged against solo, not against raw bytes.
:::
