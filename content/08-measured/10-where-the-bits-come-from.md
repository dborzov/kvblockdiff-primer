---
title: Where the bits come from
nav: Where the bits come from
group: What was found
lede: 'After a day of building compressors, one researcher asked the opposite question. Where do the bits that no compressor removes come from? The answer was to run the LLM again. The bytes turned out to be computed rather than noisy, and most of what a punnet cannot say about itself is what the LLM remembered from text tens of thousands of tokens earlier.'
cards:
  - q: Replaying Qwen3.5-2B with the same code, checkpoint, torch build and GPU reproduced how many value bytes exactly?
    a: 50 331 648, every one that was checked
    wrong: ["About 72 % of them", "None; floating-point arithmetic is never repeatable", "Only the first 2048 tokens"]
    why: 'Values are an exact function of the text and the weights. Same program, same machine, same libraries, same tokens: the same bytes.'
    sec: computed-not-noisy
  - q: What happens to the stored FP8 bytes when the LLM is replayed under a different torch build, or in float32?
    a: About 28 % of cells move one grid step, and 1.2–1.4 bits per value are left to pay (ratio 0.15–0.17)
    wrong: ["Nothing changes; the bytes are deterministic", "Every byte changes", "The ratio rises to 0.78"]
    why: A different arithmetic path orders the rounding differently. The wobble is about 1 % of the spread, but FP8 cells are narrow, so a quarter of the bytes land in a neighbouring cell.
    sec: computed-not-noisy
  - q: In the memory table, what did the intact LLM pay per value, and what did it pay with far attention cut and the linear-attention state reset?
    a: 1.35 bits intact; 5.16 bits with both removed, about what compressor 102 pays with no LLM at all (5.13)
    wrong: ["1.35 bits in both cases", "5.16 intact and 1.35 with memory removed", "8 bits in both cases"]
    why: What a punnet compressor cannot predict is what the LLM remembers from far earlier text. The equality holds for the six-layer mean on one window; per layer the two differ by about a bit.
    sec: the-memory-table
  - q: Of the 4.89 bits per value left after a good punnet compressor, how much did knowing the token id save?
    a: About 0.004 bit
    wrong: ["About 1 bit", "About 0.4 bit", "All of it"]
    why: Role saved 0.0003, the previous token 0.007, the other five KV layers 0.025. After a good compressor, the leftover looks the same whatever the token is.
    sec: the-memory-table
  - q: Why may no compressor use the prediction rule computed from the LLM's weights alone, although it would take compressor 102 from 0.6407 to 0.6326?
    a: It is a shared table, which the human ruled legitimate but allowed only once an independent training dataset exists
    wrong: ["It is lossy", "It needs more reads than the leash allows", "It was shown to fail on target 02"]
    why: Both sides would have to hold the weights in advance. The ruling is yes in principle and not yet in practice.
    sec: the-wall
---

By the evening of 30 October the best [[verified-result|verified]] compressor read 0.636 at a stretch of 4096 on the layer [[screen]] and 0.618 at 16 384, and each refinement bought a thousandth or two. One researcher agent stopped refining and did what no compressor is allowed to do. It loaded Qwen3.5-2B, fed it the same text, and asked the LLM itself to predict the bytes in its own orchard.

## The bytes are computed {#computed-not-noisy}

A transformer carries one long vector per token between its layers, the [[hidden-state]] of [[#landscape-tokens-and-decoding]]: in Qwen3.5-2B, 2048 numbers that summarise what the LLM currently makes of the token in context. To grow a KV layer's values it normalises that vector and multiplies it by a fixed matrix of learned weights, 512 rows by 2048 columns, with no bias term. Nothing else goes in; that is the `val = (x @ W.v[layer_id])` line of the decode step ([[#landscape-attention]]).

$$
\vV \;=\; \underbrace{\text{weights}}_{\text{fixed, } 512 \times 2048} \times \underbrace{\text{hidden state}}_{2048 \text{ numbers, normalised}}
$$ {#eq-measured-values}

So the values are a deterministic function of the text and the weights, and that is testable. The researcher re-ran the capture's own code, checkpoint, torch build (2.8) and GPU over the first 8192 tokens of sequence 0 and two 4096-token tails. **All 50 331 648 value bytes came back identical.** Under the LLM the text costs about 2.6 bits per token (2.48 and 2.73 on the two sequences), against 24 576 bits of stored values per token, so a decoder that owned the same binary could rebuild the orchard from the text for a ratio near 0.0001.

That floor is useless as a compressor, since decoding means running the LLM, and it is fragile. Replayed under torch 2.11 with a stand-in weight loader, or in float32, about 28 % of the FP8 cells landed one grid step away. The wobble is about 1 % of the values' spread, but FP8 cells are narrow, and telling which cell costs 1.2–1.4 bits per value, a ratio of 0.15–0.17. One window; the control for *which* component differed never finished.

::: theme noise-floor
The "noise" here is arithmetic: none with the same binary, about 1.3 bits per value across binaries. The floor exists only between two programs that disagree about rounding.
:::

::: takeaway
- Values are a fixed linear projection of the hidden state; the same program on the same text gives the same 50 million bytes.
- With the same binary the ratio could be about 0.0001; any other arithmetic path leaves 1.2–1.4 bits per value (ratio 0.15–0.17), on one window.
:::

## The memory table {#the-memory-table}

The next experiment is the one the campaign's supervisor "would most want repeated". Take one window of 2048 tokens (sequence 0, tokens 40 960 to 43 008), let the LLM compute its values for it, and blind the LLM one way at a time: forbid attention further back than 16 384 tokens; wipe the running state of its 18 linear-attention layers at the window's start; do both. Each time, count the bits the LLM's prediction leaves per stored FP8 value.

| what the LLM could use | bits per value |
|:--|--:|
| everything (intact) | 1.35 |
| attention only over the last 16 384 tokens | 3.49 |
| attention only over the last 2 048 tokens | 4.22 |
| attention only over the last 256 tokens | 4.76 |
| linear-attention state reset, attention intact | 4.97 |
| state reset and attention over the last 2 048 | 5.16 |
| **compressor 102, no LLM at all** | **5.13** |

The last row is a real compressor's bytes, the best punnet compressor of the day, on stretches of 4096 tokens of the same region of both sequences. The reading: what a punnet compressor cannot predict is what the LLM remembered from far earlier text, and no stretch of 4096 tokens contains that.

::: figure fig-measured-memory msrMemory
**The memory table.** Horizontal bars, in bits per stored FP8 value, show what the LLM's own prediction leaves for one 2048-token window of sequence 0 (tokens 40 960–43 008) as the LLM is blinded one way at a time; the last bar is compressor 102's real [[mdl-ratio|MDL ratio]] on 12 punnets of 4096 tokens at the same position, times 8. The LLM rows are [[code-length-estimate|code-length estimates]]: a logistic curve centred on the LLM's value, integrated over the FP8 cell, with one scale per [[furrow]] fitted on the window. Hover a bar for its per-layer values. One window, one sequence, one torch build.
:::

The caveats are the campaign's own, and they are heavy.

- **One window** of one sequence, never repeated on target 02.
- **A perturbation of the last window only.** The masks touch only the final 2048 tokens' attention; the earlier keys, values and state kept their full memory. The cleaner experiment, an LLM that never had it, stalled.
- **Agreement in the mean only.** At KV layer 0 (the LLM's layer 3) the blinded LLM beats the compressor by a full bit (3.86 against 4.85); at KV layer 2 (layer 11) it loses (5.97 against 5.50). Only the six-layer average reads 5.16 against 5.13.
- **Estimated bits.** Every LLM row is a code-length estimate with scales fitted on the window, and the intact row already carries the arithmetic floor above; only the compressor row is real bytes.

Metadata does not help either. Of the 4.89 bits per value left after a good compressor (24 punnets), knowing the token's id saves 0.004; its role 0.0003; the compressor's leftover error at the previous token 0.007; at the five other KV layers 0.025. In these transcripts 74 % of cherries are text read for the first time, holding 75 % of the bits; re-read text costs 0.2–0.45 bit less per value.

::: pull
What a punnet cannot say about itself is what the LLM remembered from text tens of thousands of tokens earlier.
:::

::: takeaway
- Intact, the LLM predicts its own values to 1.35 bits; cut off from far text and its running state, 5.16; compressor 102 with no LLM, 5.13.
- One window, a masked final window, agreement in the six-layer mean only, code-length estimates; the supervisor named it the result most worth repeating.
:::

## The wall {#the-wall}

Put the day's findings in one table and each kind of structure has an owner.

| structure | owner | who captures it | what is left |
|:--|:--|:--|:--|
| **repeats**: this token resembles an earlier one | the text | a [[reference-tree]] ([[echo]] similarity) | keeps paying as stretches grow |
| **geometry**: elements relate in fixed ways | the LLM's weights | [[linear-prediction]] | saturated by 32K tokens |
| **long memory**: what the text said long ago | the text, through the LLM's state | nothing inside a punnet | most of the remaining bits |

The middle row has a corollary. Since values are weights times hidden state, how the 512 elements co-vary is largely fixed by the weight matrix, whatever the text. A prediction rule computed from the weights alone, with no data, recovers 72 % of the gain of a rule fitted on a whole sequence (89 % at KV layer 4, 49 % at KV layer 0). Under compressor 102 it would take 0.6407 to 0.6326 at a stretch of 4096 and 0.7015 to 0.6723 at 512 (12 punnets, code-length estimate). It is illegal today, because it is a shared table.

::: define shared-table
- **What it is.** A large data structure specific to no sequence and no punnet, prepared in advance and held by both sides: `cherry[i] == decompress(delta[i], dictionary, shared_table)`.
- **The ruling** (the human, 2026-10-30): legitimate, if trained on a sizable independent dataset. Until that dataset exists no compressor uses one, and an estimate of its gain is a lead, never a result.
- **Examples.** A prediction rule trained on other text; the LLM's weights. The weights rule needs no data, yet both sides would hold it in advance, so it counts.
- **Easy to confuse with** [[scope-global|global scope]] of [[#scenario-scope]], the same idea under a stricter rule about where it may be trained and how it is charged.
:::

How far can a punnet go without one? With the best linear use of repeats and geometry, for free, a code-length estimate reaches about 0.60 at a stretch of 16 384 (4 punnets of 2 sequences); continuing the per-doubling trend to a whole sequence gives about 0.57. Both are a direction, a bound on four punnets and arithmetic on two points. The best verified compressor at 16 384, 0.618, is already close.

So the answer to "how compressible are these values" runs from 0.63 for a decoder that knows only the punnet's own bytes, through 0.15–0.17 for one that holds the weights, to 0.0001 for one that holds the very binary. Where a system lands depends on what the decoder is allowed to know, and that choice belongs to whoever sets the rules; no compressor can make it.

::: theme side-info
A receiver that knows more pays less, from a punnet's reference cherries, to a table trained elsewhere, to the LLM itself. The usual catch applies: the receiver must really hold it, and the human has ruled on what it may hold.
:::

::: aside source Receipts
Replay and arithmetic paths: researcher r23, pages iter-1-1 and iter-1-3, journal 17:21 and 18:03 (50,331,648 values; 2.48 and 2.73 bits per token; 28 % of cells; 1.39 and 1.35 bits). Memory table: r23 iter-1-3, journal 18:31, per layer. Coder 102 yardstick 5.13 = 8 × 0.6407, r23 iter-1-2, 12 blocks starting at token 40,960. Weights-only rule: r23 iter-1-2 and iter-1-4. Metadata: r23 iter-1-3, 24 blocks; new text 74 % / 75 %: r13 iter-1-2. Floors 0.60 and 0.57: r9 iter-1-6, r23 iter-1-3. Rulings: `docs/concepts/what-the-human-clarified.md`. All as pinned in the Part XI spec, §1.10; r23's raw arrays no longer exist, only its pages and journal.
:::

::: takeaway
- Repeats belong to the text (the tree), geometry to the weights (prediction), long memory to the text through the LLM's state (nothing inside a punnet).
- A rule from the weights alone gets 72 % of a fitted rule's gain; it is a shared table, legitimate by ruling and not yet allowed.
- Inside a punnet the floor is about 0.60 at 16 384, as a direction. Below that, what the decoder may know decides, and that is a ruling rather than a compressor.
:::
