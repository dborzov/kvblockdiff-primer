---
title: Shared across the stretch, in bits
nav: Shared across the stretch
group: In bits
lede: 'The same values coded eight ways, from raw bytes to the LLM that produced them, laid out as a ladder in bits per element. The rungs say how much a punnet shares with itself, what joining heads or layers adds, and how much of what a punnet cannot say about itself is shared with text far outside its stretch.'
cards:
  - q: 'Solo coding pays 6.22 bits per element and the best verified tree compressor 5.09. What share of solo''s bits is saved?'
    a: '1.13 bits, 18 %'
    wrong: ["2.9 bits, about half", "0.73 bit, 12 %", "4.87 bits, 78 %"]
    why: '6.22 − 5.09 = 1.13, and 1.13 / 6.22 ≈ 0.18. The light compressor saves 0.73 bit (12 %); only the intact LLM saves 4.87 (78 %).'
    sec: the-ladder
  - q: Which step of the ladder is not shared information at all?
    a: The 1.78 bits from raw 8 to solo 6.22, the uneven use of the FP8 codes by each furrow coded alone
    wrong: ["The tree compressor's 0.40 bit over the light compressor", "The punnet floor's 0.3 bit over the tree compressor", "The intact LLM's 4.87 bits over solo"]
    why: 'Solo coding knows nothing about other cherries. Its saving is the bit budget of V.1: a bell-shaped furrow uses 253 codes unevenly.'
    sec: the-ladder
  - q: Joining the two heads of a KV layer saved 0.0322 of ratio. Joining all six KV layers after that saved how much more?
    a: '0.0043, about 0.03 bit per element'
    wrong: ["Another 0.0322", "0.19 to 1.19 bits per element", "Nothing; it lost 0.037"]
    why: Given everything else, adjacent KV layers share 0.03 to 0.08 bit per element and distant layers about 0.01. Joining adjacent tokens is what loses 0.037.
    sec: the-entity
  - q: Why does a tower of adjacent KV layers add so little once each layer has its own reference cherry?
    a: The reference is a repeat of the same text, and the same pair of tokens repeats at every layer, so the layer above tells the reference little it did not already carry
    wrong: ["Because the layers are independent", "Because adjacent layers are rotated copies of each other", "Because the leash forbids joining layers"]
    why: Layers also group by kind (KV 0, 4, 5 against 1, 2, 3), so adjacency was the wrong axis for a cherry shape anyway.
    sec: the-entity
  - q: Of the 5.16 bits per value the LLM pays when it keeps only one 2 048-token window, how much is about text outside that window?
    a: About 3.8 bits; the intact LLM pays 1.35
    wrong: ["None; the rest is noise", "0.26 to 0.45 bit", "All 5.16 bits"]
    why: Cutting attention beyond 16 384 tokens alone costs 2.14 bits (1.35 → 3.49); with the running state reset as well and attention kept inside the 2 048-token window, 5.16, next to a punnet compressor's 5.13. One window, code-length estimate.
    sec: beyond-the-stretch
  - q: How much of that outside-the-stretch information can a compressor without the LLM recover at sequence scope?
    a: About 0.26 to 0.45 bit per element, the part that returns as literal repeats (a bound, one window)
    wrong: ["All 3.8 bits", "Nothing", "2.14 bits"]
    why: The rest is the LLM's memory of far text, reachable only by a receiver who holds the weights, which the human has ruled a shared table.
    sec: beyond-the-stretch
---

Eight bits per element is where every ladder starts. Below it stand the same values coded alone, then by a light compressor, then by a tree compressor, then two floors no punnet compressor has reached, and far below those the LLM that produced the values, predicting its own orchard. Each rung is one bill for the same bytes with the receiver allowed to know a little more, and the distance between two rungs is information, in bits. This page reads the ladder rung by rung, then asks where the shared bits live, in which cherry shape and in which stretch of the text.

## The ladder {#the-ladder}

::: figure fig-measured-entropy-ladder rngEntropyLadder wide
**The entropy ladder.** Horizontal bars in bits per element (one FP8 value; raw is 8), nested so that every bar starts at zero: raw 8; [[solo]] coding 6.22 (ratio 0.778, ideal); the light compressor 129 at 5.49 (0.686); the tree compressor 121 at 5.09 (0.636); the punnet floor near 4.80 (0.60, a [[code-length-estimate]] at a stretch of 16 384); the sequence floor near 4.56 (0.57, an extrapolation along the per-doubling trend); the LLM with its running state reset and its attention held inside one 2 048-token window at 5.16, and intact at 1.35. Each bar is labelled with its ratio, its bits, the share of solo's bits it saves and its grade; compressors keep their colours from this Part, estimates are dashed, the LLM's rows are in their own colour. Hover a bar for its receipt. Data: `measured-ladders.json`, `measured-memory.json`.
:::

| rung | bits per element | ratio | of solo's 6.22 saved | grade |
|:--|--:|--:|--:|:--|
| raw | 8 | 1.000 | | by definition |
| solo (each element from its furrow's histogram) | 6.22 | 0.778 | | ideal, ledger landmark |
| light compressor 129 (mean, scale, prediction rule) | 5.49 | 0.686 | 0.73 bit, 12 % | verified |
| tree compressor 121 | 5.09 | 0.636 | 1.13 bit, 18 % | verified |
| punnet floor, stretch 16 384 | ≈4.80 | ≈0.60 | ≈1.4 bit, 23 % | code-length estimate, 4 punnets |
| sequence floor | ≈4.56 | ≈0.57 | ≈1.7 bit, 27 % | extrapolation |
| the LLM, state reset, attention inside the 2 048-token window | 5.16 | 0.645 | 1.06 bit, 17 % | code-length estimate, one window |
| the LLM, intact | 1.35 | 0.169 | 4.87 bit, 78 % | code-length estimate, one window |

Read it from the top. The first 1.78 bits, from 8 down to 6.22, are no sharing at all. They are the uneven use of FP8's 253 codes by a bell-shaped [[furrow]], the bit budget of [[#toolbox-the-bill]], and a receiver who knows only the furrow's histogram collects them. Everything below that line is what a punnet tells a compressor about its own cherries, the [[punnet-redundancy]] of [[#measured-what-the-half-means]]. The light compressor's 0.73 bit is a per-punnet rule, a mean, a scale and a [[linear-prediction]] rule learnt from the punnet; the tree adds 0.40 bit by pointing each cherry at a repeat of the same text. A code-length estimate that pays nothing for its rule finds about 0.3 bit more in a punnet of 16 384 tokens (the verified compressor at that stretch, 4.94 bits, already has half of it), and the per-doubling trend continued to a whole sequence adds about 0.24 bit. From 6.22 down to about 4.6 is a fifth to a quarter of the solo bits.

Then the two rungs that stand apart. With its running state reset and its attention held inside one 2 048-token window, the LLM itself pays 5.16 bits per value, next to compressor 102's 5.13 with no LLM at all ([[#measured-where-the-bits-come-from]]). Intact, it pays 1.35. Between those two numbers lie 3.8 bits that no punnet holds, and the last two sections are about where they are.

::: theme noise-floor
Inside a punnet the floor near 4.8 bits looks like noise: no predictor built from the punnet's own bytes gets below it. The memory table says it is memory, the LLM's knowledge of text tens of thousands of tokens away. The floor that really is noise sits near 1.3 bits, and it is arithmetic, two programs disagreeing about rounding.
:::

::: takeaway
- Raw 8, solo 6.22, light compressor 5.49, tree compressor 5.09, punnet floor about 4.80, sequence floor about 4.56; the LLM confined to one 2 048-token window 5.16, intact 1.35.
- The first 1.78 bits are the histogram of each furrow alone, no sharing. The shared part inside a punnet is 1.13 bits verified and about 1.4 by a code-length estimate: a fifth.
- The 3.8 bits between the window-bound and the intact LLM are what no punnet holds.
:::

## The cherry shape {#the-entity}

The human's second question was about the shape. If one cherry were several adjacent KV layers' values of the same token instead of one layer's, would more become shared? That is the [[upstairs]] bet of [[#hypotheses-upstairs]], and the second campaign measured it directly by dicing the same values different ways ([[#measured-cutting-the-tensor]]).

On one 4096-token window of each of 20 sequences, joining the two [[head|heads]] of a KV layer into one cherry, `(256,)` to `(2, 256)`, saves 0.0322 of ratio, about 0.26 bit per element; joining all six KV layers after that, `(2, 256)` to `(6, 2, 256)`, saves a further 0.0043, about 0.03 bit. Given everything else a compressor knows, adjacent KV layers share 0.03 to 0.08 bit per element, distant layers about 0.01, the two heads 0.19 to 1.19 bits.

:::: compare What joining buys
::: col The two heads of a KV layer
- 0.0322 of ratio, 20 of 20 sequences; 0.19 to 1.19 bit per element given everything else. [[stereo|Stereo similarity]].
- Two projections of one [[hidden-state]], taken at the same moment. The same element position looks unrelated across heads (cosine 0.05), yet the distances between tokens correlate up to 0.92: two views of one vector.
- One [[reference-cherry]] serves both. 0.85 bit per element shared raw, 0.54 still shared with one reference for both heads, 0.21 with a separate reference per head.
:::
::: col Six KV layers of a token
- A further 0.0043 of ratio; adjacent KV layers 0.03 to 0.08 bit, distant ones about 0.01. [[upstairs|Upstairs similarity]], small.
- Each layer's reference is a repeat of the same text, and the pair of tokens that repeats at KV layer 1 is the pair that repeats at KV layer 0. The layer above tells the reference little it did not already carry.
- Layers group by kind (KV layers 0, 4, 5 against 1, 2, 3; the LLM's 3, 19, 23 against 7, 11, 15), so adjacency is the wrong axis for a cherry shape in any case.
:::
::::

In plain words, a tower of adjacent KV layers as the cherry buys almost nothing beyond the heads, because what a layer's cherry needs most is a good reference, a reference is a repeat of the text, and every layer sees the same repeat. The heads differ because they are two readings of one vector made at the same instant, and one reference lines them both up. The natural cherry is one KV layer with both heads, `(2, 256)`, 512 bytes, where the campaign's best compressors already stood; which cherry shape an application needs is a separate question ([[#app-which-application]]).

::: takeaway
- Joining the two heads saves 0.0322 (0.26 bit per element); joining all six KV layers a further 0.0043 (0.03 bit). Adjacent layers share 0.03 to 0.08 bit given the rest, the heads 0.19 to 1.19.
- Layers group by kind (KV 0, 4, 5 against 1, 2, 3), so adjacency is the wrong axis.
- The thing to join is the two heads; a tower of layers adds almost nothing once each layer has its reference.
:::

## Beyond the stretch {#beyond-the-stretch}

The last question is where the 3.8 bits are. Two measurements answer it from opposite sides.

From the compressor's side, a nearest-neighbour bound puts a punnet of a whole sequence 0.26 to 0.45 bit per element below a punnet of 16 384 tokens, with more than half of that arriving between 32 768 and 65 536 tokens (one window; the bound allows cycles and charges no pointers). That is repeated text coming into view as the punnet widens; punnet redundancy keeps growing as the stretch grows into the sequence, which is the sequence floor's 4.56.

From the LLM's side, the memory table of [[#measured-where-the-bits-come-from/the-memory-table]] blinds the LLM one way at a time and counts what its own prediction leaves per stored value.

$$
\underbrace{\vH(\vV \mid \text{this 2{,}048-token window alone: no running state, no attention past its edge})}_{5.16\text{ bits; compressor 102 pays }5.13} \;>\; \underbrace{\vH(\vV \mid \text{attention over the last } 16{,}384 \text{ tokens, running state intact})}_{3.49} \;>\; \underbrace{\vH(\vV \mid \text{everything the LLM read})}_{1.35}
$$ {#eq-measured-memory}

Of the 5.16 bits the LLM pays per value when it keeps only this 2 048-token window, 3.8 are about text outside it, and most of that is far outside it: forbidding attention beyond the last 16 384 tokens, with the running state intact, costs 2.14 bits on its own. A compressor with no LLM recovers only the part that returns as literal repeats, the 0.26 to 0.45 bit above. The rest is the LLM's memory of what the text said long ago, and it is reachable only by a receiver who holds the weights, which the human has ruled a [[shared-table]].

The two sides agree on the direction. Most of what is left in a punnet after a good compressor is shared with text far away, so the right scope for a dictionary is the sequence, [[scope-sequence|sequence scope]] of [[#scenario-scope]]; the application's shelf stays at stretch scope for a reason of GPU memory rather than information ([[#app-on-fire]]). The caveats are this Part's: one window of one sequence for the memory table, a code-length estimate with scales fitted on the window, and a sequence floor that is arithmetic on two points.

::: theme side-info
Each rung of the ladder is the same message with a richer receiver: a furrow's histogram, a punnet's rule, a punnet's reference cherries, a sequence's repeats, the LLM's memory. The catch is unchanged. A receiver that holds the sequence is sequence scope; one that holds the weights is a shared table, legitimate by ruling and not yet allowed.
:::

::: aside source Receipts
- Ladder: solo 0.778 (6.22 bits) from the `solo_ratio` landmark of the `s-*-b4k` screens ([[#measured-night-one]]; Part XI spec §1.3); coder 129 at 0.6863, r25-t0003 ([[#measured-codebooks-and-rotations]]; §1.7); coder 121 at 0.63639, env-t0096, and coder 120 at 0.61768, env-t0097 ([[#measured-reading-one-cherry]]; §1.9); block floor ≈0.60 and sequence floor ≈0.57, r9 iter-1-6 and r23 iter-1-3 ([[#measured-where-the-bits-come-from]]; §1.10).
- Memory table: r23 iter-1-3, journal 18:31 (sequence 0, tokens 40,960 to 43,008; intact 1.35; attention only over the last 16,384 tokens, running state intact, 3.49; state reset and attention only over the last 2,048 tokens 5.16); coder 102's 5.13 = 8 × 0.6407, r23 iter-1-2, 12 blocks (§1.10).
- The entity: same-window table and the layer groupings, r24 iter-1-3 (20 windows of target 02; 7 sequences for regime against triple); shared bits of the heads, r9 iter-1-2 (4 blocks, bound); layers given the rest, r9; cosine and distance correlation, r7 iter-1-1 (36 blocks) ([[#measured-cutting-the-tensor]]; §1.6).
- Whole-sequence pool bound 0.26–0.45 bit: r19 iter-1-1 to 1-3, one window (§1.9).
:::

::: takeaway
- A whole-sequence punnet is 0.26 to 0.45 bit per element below a 16 384-token punnet (a bound, one window): repeats keep arriving from far away.
- Of the 5.16 bits the LLM pays inside one 2 048-token window, 3.8 are about text outside it; 2.14 of them lie beyond the last 16 384 tokens.
- Most of what a punnet cannot say about itself is shared with the sequence. The right scope is sequence scope; the application's shelf stays at stretch scope for memory's sake.
:::
