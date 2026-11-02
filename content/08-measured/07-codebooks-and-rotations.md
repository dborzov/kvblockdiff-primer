---
title: Codebooks and rotations
nav: Codebooks and rotations
group: What lost
lede: 'The Hive and the Compass of Part V went on trial as real compressors. Every stored codebook lost to pointing at an earlier cherry, every fixed rotation lost to predicting without rotating, and each loss has a reason that fits in one sentence.'
cards:
  - q: Stacked on a reference tree and linear prediction, how often did the encoder choose a codebook when it was free to pick one by exact bits?
    a: On 0 of 72 punnets
    wrong: ["On 72 of 72 punnets", "On about half the punnets", "Only on the KV layer 0 punnets"]
    why: A codeword is stored only to help others; a reference cherry is stored anyway, so it costs a pointer and nothing more. Offered codebooks of 4, 16 or 64 words or none, the encoder took none every time (r26-t0010).
    sec: codebooks
  - q: What is a code-length estimate?
    a: The code length a probability table would reach, computed on the data without building the compressor; a lead, not a result
    wrong: ["A verified score from the separate decoder", "The mean of a screen's punnets", "A compressor whose encoder rounds its weights exactly"]
    why: The campaign's grades run from bound and code-length estimate, through encoder bytes and quick, to verified. Only the last rebuilds every cherry in a separate process.
    sec: codebooks
  - q: By how much did the DCT, Hadamard and random rotations lose, and why?
    a: 'By 0.28–0.32 bit per element: rotating then rounding costs about a quarter of a bit, and element numbers carry no neighbourhood for a DCT to use'
    wrong: ["By 2.5 bits, the weight of a full basis", "They won by 0.25 bit on the middle layers", "By 0.0029, the same as RQ"]
    why: Rounding after a rotation costs the lattice constant, 0.2546 bit per coordinate (measured 0.29–0.32). Linear prediction subtracts a guess and never rounds the vector.
    sec: rotations
  - q: Compressor 129 has no reference tree. On the layer screen, how far behind the tree compressor 102 was it?
    a: 0.041 of ratio, on 14 of 14 parts of the screen
    wrong: ["0.0029", "It was ahead by 0.02", "0.25 bit per element"]
    why: 0.6863 against 0.6449. The gap is what the repeats in the text are worth once linear prediction has taken the geometry.
    sec: the-light-compressor
  - q: How much of the close-enough family of 62 techniques has a real compressor behind it?
    a: 21 techniques; 18 have only a bound, 16 are untried, 7 do not apply
    wrong: ["All 62", "None; the branch was closed on bounds alone", "21, and the other 41 were shown to lose"]
    why: The branch is not closed. By the human's rule, in this branch a bound is a lead and only a real compressor answers.
    sec: the-light-compressor
---

On 30 October an encoder was handed a gift. Alongside its [[reference-tree]] and its [[linear-prediction]] table it was offered a [[codebook]] of 4, 16 or 64 typical cherries, free to use or to ignore, and told to pick whatever cost the fewest bits. On 72 punnets out of 72 it picked nothing.

This page is the story of why, and of a cousin result: three rotations that lost by a quarter of a bit each. The two stage families of Part V that store a *fitted* object, the Hive's centroids ([[#toolbox-vq]]) and the Compass's basis ([[#toolbox-klt]]), both lost to things the punnet already had. The human had asked for exactly this trial, suspicions set aside.

## Codebooks on trial {#codebooks}

::: aside reminder The Hive, and the toolbox's bound (V.5)
[[vq]] names, for each cherry, the nearest of $\vC$ [[centroid|centroids]] stored in a [[codebook]], then codes the exact residual. The index costs $\log_2 \vC$ bits per cherry (the [[index-tax]]); the codebook costs $8\vC/\vb$ bits per element. On bell-shaped data the toolbox says VQ can save at most what a free rotation saves plus its own index tax, and ends with "whether cherries cluster is an open measurement".
:::

The measurement came in. Campaign C2 first computed bounds for this branch. Then the human ruled that here a bound is only a lead and a real compressor answers, so the whole family was built for real: VQ, [[product-quantization|PQ]], RQ (a codebook, then a second one for what the first leaves), OPQ (PQ after a learned rotation), binary codes and LSH (a few bits per cherry, taken from signs).

Each quantiser was stacked on linear prediction with no tree, on the layer [[screen]] (`V · all · cherry (2, 256) · stretch 4096 · leash 293`). RQ saved 0.0029 of [[mdl-ratio]] on all 14 parts of the screen and passed the separate decoder; PQ saved 0.0017 (quick). Both stayed about 0.05 behind a tree compressor on the same screen. Stacked on tree *and* prediction, the encoder chose no codebook on 72 of 72 punnets (quick). Why? Put the two things a cherry can be predicted from side by side.

:::: compare A codeword versus a reference cherry
::: col A codeword
- Fitted to the punnet and stored **only to help others**: its $\ve$ bytes are pure tax, $8\vC/\vb$ bits per element.
- Each cherry that uses it pays $\log_2 \vC$ bits to name it.
- The average of a cluster: close to many cherries, identical to none.
:::
::: col A reference cherry
- A real earlier cherry of the punnet, the [[reference-cherry]]. It **must be stored anyway**, so using it costs only a pointer, about 12 bits uncoded.
- When the text repeats, a near copy, where a centroid is only an average.
- The more references, the better: on one punnet per KV layer (compressor 102's probability table, real bytes, encoder bytes) the ratio fell at every step from 64 references to the whole tree.
:::
::::

| references per punnet | KV layer 0 (L3) | KV layer 1 (L7) | KV layer 4 (L19) |
|:--|--:|--:|--:|
| 64 | 0.6858 | 0.6838 | 0.7015 |
| 256 | 0.6518 | 0.6703 | 0.6841 |
| the whole tree | 0.5737 | 0.6275 | 0.6403 |

::: theme amortize
The Hive's codebook is this theme's classic fixed cost, paid by the $\vb$ cherries of its punnet. A reference tree's "codebook" is the punnet's own cherries, already paid for in full; what is left to amortize is one pointer per cherry.
:::

Do values cluster at all? In a minority of cherries. On one KV layer 0 punnet, RQ cut the mean delta from 360 to 348 bytes, and 42 % of that saving came from the top tenth of cherries: a codebook shrinks a few cherries a lot and leaves the rest alone. PCA, OPQ, binary codes and LSH left the distribution where it was: they act on no cluster.

::: takeaway
- Built as real compressors, the codebooks gained at most 0.0029 (RQ) on prediction alone; stacked on a tree, none was ever chosen (72 of 72 punnets).
- A codeword is stored only to help others; a reference cherry is stored anyway and costs a pointer. The toolbox's bound held, and the reason now has a name.
- Clusters exist, in a minority of cherries.
:::

## Rotations on trial {#rotations}

::: aside reminder The Compass (V.4, V.9)
The [[klt]] rotates the axes to the data's own directions and codes the coordinates one by one; its gain is large only for a sharply spiky spectrum. To be lossless it needs [[lifting]]: integer shears that can be undone exactly ([[#toolbox-lifting]]).
:::

The campaign tried the fixed rotations of transform coding (the DCT of JPEG, the Hadamard transform, a random rotation) as [[code-length-estimate|code-length estimates]] on two heads, KV layers 0 and 2 (the LLM's 3 and 11). All three behaved as one transform, agreeing within 0.002, and all three lost at every quantisation step, by **+0.28 to +0.32 bit per element** at best. Two reasons, each enough on its own.

1. **Rotating then rounding has a price.** Rotate a vector of integers and round, and the data sits on a new square grid in many dimensions. That rounding costs 0.2546 bit per coordinate, the lattice constant; the campaign measured 0.29–0.32. [[linear-prediction|Linear prediction]] subtracts a guess from each [[element]] and never rounds the vector, so it never pays.
2. **Element numbers carry no neighbourhood.** A DCT assumes that position 17 of a vector is related to position 18. In a value cherry the mean correlation between elements at the same index equals the mean over any pair (0.0734 at KV layer 2). Sorting the elements does not create what is not there.

[[#toolbox-klt]] leaves the lifted rotation as a question for the harness. Lifting makes a rotation reversible; it does not make the rounding free, and that tax, a quarter of a bit per element, is about the whole gain the Compass was expected to make on "low-rank-ish" data (0.34 bit).

::: takeaway
- DCT, Hadamard and random rotations lose +0.28–0.32 bit per element (code-length estimate, two heads).
- Rounding after a rotation costs about 0.25 bit per element; prediction never rounds the vector, so it never pays.
- Element numbers carry no neighbourhood, so a DCT has nothing to work with.
:::

## The light compressor {#the-light-compressor}

What does this branch look like done well, with no tree at all? Compressor 129: per furrow a mean and a scale, a sparse linear-prediction table over the whole cherry, one coded stream per cherry, and a dictionary share $\vxshare$ of only 0.01–0.04. Real and verified.

| cherry shape | compressor 129 | dictionary share |
|:--|--:|--:|
| one head, `(256,)` | 0.7348 | 0.010 |
| one KV layer, `(2, 256)` | 0.6863 | 0.021 |
| two KV layers | 0.6696 | |
| three KV layers by kind (0+4+5, 1+2+3) | 0.6667 | |
| three adjacent KV layers | 0.6652 | |
| one token, `(6, 2, 256)` | 0.6622 | 0.042 |

(Different screens, so read the shape; the campaign itself calls the comparison good to ±0.005.)

::: figure fig-measured-cast msrCast wide
**The cast on one screen.** Horizontal bars of [[mdl-ratio]] on the layer screen (cherry `(2, 256)`, 512 bytes, stretch 4096, leash 293); lower is better. The solo ideal, 0.778 (per-furrow entropy, tables uncharged); compressor 129, linear prediction alone, 0.6863; 129 with RQ stacked, 0.0029 lower; the tree compressor 102, 0.6449; tree with prediction, compressor 121, 0.6364. The hatched bar above 129 is the penalty a fixed rotation would add, +0.28 to +0.32 bit per element (+0.035 to +0.040 of ratio), a [[code-length-estimate]] on two heads and not a compressor. Hover a bar for the trial id and the grade. Data: `measured-splits.json`, `measured-ladders.json`.
:::

Against 102's 0.6449 on the same layer screen, 129 is **0.041 worse on all 14 parts of the screen**. That gap is what the text's repeats are worth once prediction has taken the geometry. Two trends sit behind the table. The tree adds less as cherries widen, because other parts of a wide cherry do the job a reference would. Stretch length runs the other way: from 4096 to 16 384 tokens the light compressor stops improving while the tree keeps going.

For [[kvblockdiff]]'s miss path, 129 is the compressor that matches the application's own picture ([[#app-sizes]]): a tiny [[dictionary]], and every miss a [[delta]] of about 0.66–0.69 of a raw cherry. The tree compressors look nothing like it; [[#measured-reading-one-cherry]] shows what they look like instead.

::: note warning The branch is not closed
Of the close-enough family's 62 techniques, 21 now have a real compressor, 18 only a bound, 16 are untried and 7 do not apply. Most quantiser rows are quick (only RQ without a tree passed the separate decoder), none exists at a stretch of 16 384 or on `(6, 2, 256)` cherries, where a codebook is cheaper per cherry, and all were stacked on one prediction design.
:::

::: aside source Receipts
- RQ on prediction alone: r26-t0011 (0.69421 against the control r26-t0002 at 0.69716, isolated, 14/14 segments); PQ: r26-t0008 (quick); no codebook chosen on tree + prediction: r26-t0010 (quick); cluster share and delta sizes: r26 iter-1-3.
- The 64 → 256 → whole-tree series: r25 iter-1-2 (one block per layer, sequence 0000, real bytes).
- Fixed rotations and the lattice constant: r11 iter-1-1 (exact model, L3 h0 and L11 h0).
- Coder 129 by split: r25-t0003, r25-t0004 (isolated); 0.041 against 102 (r11-t0002) on 14 of 14 segments: r25 iter-1-3.
- Coverage count: r25 iter-1-1. Notes: `notes/03-structure-and-method.md` §3; spec §1.7.
:::

::: takeaway
- Compressor 129, with no tree, runs from 0.7348 on `(256,)` to 0.6622 on `(6, 2, 256)` with a 1–4 % dictionary; it sits 0.041 behind the tree compressor on `(2, 256)` cherries.
- The tree matters less as cherries widen and more as stretches grow.
- 21 of 62 techniques have a real compressor; the rest are bounds or untried.
:::
