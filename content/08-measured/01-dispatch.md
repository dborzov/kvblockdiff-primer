---
title: A dispatch from the harness
nav: A dispatch from the harness
group: Setting the stage
lede: 'Parts I–VII describe a problem, a toolbox and a set of bets. Then a harness was built, handed to teams of AI researcher agents, and run on real Qwen3.5-2B orchards for one night and one day. This Part reports what came back: 8 raw bits became about 5, and the bytes turned out to be made of things the bets had not named.'
cards:
  - q: What is a campaign, in this Part's sense?
    a: One run of the autonomous research loop, with several AI researcher agents writing and testing compressors against one harness under one set of rules, every trial recorded
    wrong: ["One compressor run over every punnet of the data", "The GPU job that captured the orchard", "A round of questions put to the human"]
    why: 'Two campaigns ran: C1 with four researcher agents, C2 with about twenty-one. The harness, not an agent, kept the score.'
    sec: what-happened
  - q: How many compressors and trials did the two campaigns leave behind?
    a: 126 compressors and about 390 recorded trials, in one night and one day
    wrong: ["Four compressors and a dozen trials", "One compressor, tuned 390 times", "About 2 000 compressors, none recorded"]
    why: 'C1 recorded 218 trials and left 62 compressors; C2 recorded 169 trials; 126 compressors exist in all, with 36 Rust components.'
    sec: what-happened
  - q: 'The best verified result at a stretch of 4096 tokens was a ratio of about 0.636. In bits per element of a value, that is…'
    a: About 5.1 bits of 8
    wrong: ["About 6.4 bits", "About 0.64 bit", "About 2.5 bits"]
    why: 'Bits per element are 8 times the ratio: 8 × 0.636 ≈ 5.1. Solo coding sits at 6.22 (0.778), raw at 8.'
    sec: headline
  - q: By how much did the best compressors beat solo coding (0.778)?
    a: 'By 1.1 to 1.3 bits per element: 0.636 at a stretch of 4096 tokens, 0.618 at 16 384'
    wrong: ["By about 3 bits", "By nothing; solo coding was already the floor", "By about 0.1 bit"]
    why: '8 × (0.778 − 0.636) ≈ 1.1 bits; 8 × (0.778 − 0.618) ≈ 1.3 bits.'
    sec: headline
  - q: Which statement about the data behind this Part is true?
    a: Values only, one LLM, one kind of text, FP8 E4M3, six KV layers, most results on two sequences
    wrong: ["Keys and values of several LLMs on books, code and chat", "Values in BF16 on all 24 layers", "A random sample of 1000 sequences from the web"]
    why: 'The campaigns measured the value half of Qwen3.5-2B''s orchard on the author''s own coding-agent transcripts. Every finding carries that qualification.'
    sec: how-to-read-this-part
  - q: 'A number in this Part is labelled "code-length estimate". What does that mean?'
    a: A code length computed from a probability table on the data, without building the compressor; a lead, not a verified result
    wrong: ["Every cherry was rebuilt bit for bit in a separate process", "The number was confirmed on all 30 sequences", "The compressor ran in exact integer arithmetic"]
    why: Three grades appear here. Verified means every cherry came back bit-exactly from a separate decoder; a code-length estimate and a bound are what a compressor could reach.
    sec: how-to-read-this-part
---

The scenario of Part IV ends with a referee ([[#scenario-the-harness]]) and the toolbox of Part V ends with a dress rehearsal on synthetic punnets ([[#toolbox-rehearsal]]). Between them sat a plan: one evening of GPU time to dump a few long documents' [[orchard|orchards]], then a weekend at a desk with numpy. What happened instead took one night and one day, nobody at a keyboard wrote a compressor, and the data answered a question the napkin had not quite asked.

This Part is the report from that night and day, written for a reader who has never heard of any of it. Stage first, then picture.

## What happened {#what-happened}

The [[harness]] was built roughly as sketched: one contract every [[compressor]] passes through, one accounting rule, a round trip that must be exact. Then it was turned into a loop. An AI researcher agent reads what is known so far, writes a compressor and submits it; the harness scores it and records the trial; the agent reads the score and tries the next idea. A supervisor agent runs the environment and writes the briefs. The human steps in only to clarify the goal.

::: define campaign
- **What it is.** One run of that loop: several researcher agents, one harness, one set of rules, every trial recorded in a ledger nobody edits by hand. The harness, not an agent, keeps the score.
- **Example.** C1, the night of 29–30 October 2026: four agents, one head of one KV layer, no leash yet. C2, 30 October: about twenty-one agents, all six KV layers, the leash in force.
- **Easy to confuse with** a *trial* (one recorded test of one compressor on one scenario) and with the harness itself (the referee the campaign runs through).
:::

| | C1 | C2 |
|---|---|---|
| when | the night of 29–30 October 2026 | 30 October 2026 |
| researcher agents | four, in five rounds of 2–2.5 hours | about twenty-one, in four rounds |
| slice | values of KV layer 0 (the LLM's layer 3), head 0; then deeper layers, both heads, and keys; FP8 and BF16 | values of all six KV layers, both heads; FP8 only |
| recorded trials | 218 | 169 |
| compressors left behind | 62 | 126 in all, with 36 Rust components |

The data was real: the value half of Qwen3.5-2B's orchard over thirty long coding-agent transcripts, 20.9 GB of bytes ([[#measured-the-data]]). The rules were real too, and the human clarified them twice during the first night, the second time to close a loophole the search had found ([[#measured-rules-of-the-game]]).

::: takeaway
- The plan was a weekend of numpy. What ran was a harness driving two campaigns of AI researcher agents: 126 compressors, about 390 trials.
- A campaign is one run of the loop: agents propose compressors, the harness scores them, the ledger remembers.
- C1 measured one head of one KV layer through the night; C2 measured all six KV layers the next day.
:::

## The headline {#headline}

A raw value is 8 bits. Coding every element alone with the best per-furrow statistics a punnet can offer, the ideal is 0.778 of that, about 6.22 bits ([[solo]] coding, which [[#toolbox-solo]] guessed within 0.002). The best verified compressor with a per-punnet [[dictionary]] reached 0.636 at a stretch of 4096 tokens on the two development sequences, 0.630 on five sequences of the larger set, and 0.618 at a stretch of 16 384 tokens. In the site's unit, [[bpe|bits per element]]: 8, then 6.2, then 5.1, then 4.9.

::: aside source Receipts
Throughout this Part, "notes" and "spec" name the verification notes and the pinned-number sheet kept with the site's source under `experiment_repos/kv-compress-roofline/`; trial ids such as env-t0096 are rows of the campaigns' ledgers. Solo ideal 0.77811 is the landmark of the layer screen at 4096 tokens (notes/01 §B2). Best real solo coder 0.8039: coder 09, r1-t0005. C1's ladder top 0.6731: coder 34, r1-t0042 (layer 3, head 0, no read budget). C2: 0.63639 and 0.62970, coder 121, env-t0096 (two sequences of target 03; five of target 02); 0.61768 at 16,384 tokens, coder 120, env-t0097 (two sequences). The block floor ≈0.60 is an exact-model extrapolation, not a coder (spec §1.10). Counts: 387 ledger trials (C1 218, C2 169), 126 coders (notes/00).
:::

::: figure fig-measured-headline msrHeadline
**From 8 bits to 5.** Horizontal bars in bits per element of one value (8 is raw; the MDL ratio in brackets). Raw 8. Solo ideal 6.22 (0.778): a punnet's per-furrow statistics, nothing shared between cherries, all six KV layers. C1's ladder top 5.38 (0.6731): KV layer 0 (the LLM's layer 3), head 0 only, cherry `v[t, 0, 0, :]`, stretch 4096, no leash, two sequences. C2 at stretch 4096: 5.09 (0.6364) on two sequences, 5.04 (0.6297) on five sequences of the larger set, cherry `v[t, l, :, :]`. C2 at stretch 16 384: 4.94 (0.6177), two sequences. Dashed: the punnet floor ≈4.8 bits (≈0.60), a [[code-length-estimate]], not a compressor. Thin rule: solo minus 0.75 bit, the go line of the old decision rule. Hover a bar for compressor, screen and trial id; every solid bar is verified.
:::

In the scenario's words: the score is the [[mdl-ratio]], [[dictionary-share|dictionary share]] plus [[delta-share|delta share]] ([[#scenario-the-score]]). The napkin of Part V expected values to end near a delta share of 0.75–0.85, with any gain coming from keys. The sum came in at 0.636 for values: 1.1 to 1.3 bits below solo. How it splits between dictionary share and delta share turned out to say where the bytes were filed rather than how much the cherries share; [[#measured-reading-one-cherry]] explains why.

Where did the bits go? Three places, each with its own page. **Repeats:** in a stretch of 4096 tokens many value cherries are near-copies of an earlier cherry, usually the same token appearing again, and the best compressors store the earlier one and point at it ([[#measured-night-one]]). **Geometry:** within one cherry the elements predict each other through a rule fixed by the LLM's own weights, a rule that transfers from one text to another ([[#measured-two-kinds-of-structure]]). **A remainder** that no per-punnet compressor reaches, because it is the text's long memory, what the LLM was attending to thousands of tokens back ([[#measured-where-the-bits-come-from]]).

::: pull
Repeats belong to the text; geometry belongs to the LLM.
:::

::: takeaway
- Raw 8 bits → solo 6.2 → 5.1 at a stretch of 4096 tokens → 4.9 at 16 384; ratios 1 → 0.778 → 0.636 → 0.618.
- That is 1.1–1.3 bits below solo, on values, where the napkin expected almost nothing.
- The bits came from repeats of earlier tokens, from geometry set by the weights, and from a remainder that is the text's memory.
:::

## How to read this Part {#how-to-read-this-part}

This page and two more set the stage, eight paint the picture, two say what it means, and two read the whole thing in bits.

```graph
id: measured-map
columns: [Setting the stage, What was found, What lost, Method and meaning, In bits]
nodes:
  - {id: data, col: 1, row: 1, title: "The data on the table", text: "One LLM, one kind of text, 20.9 GB.", link: measured-the-data, cat: llm}
  - {id: rules, col: 1, row: 2, title: "The rules, as scenarios", text: "Contract, score, leash; the screen.", link: measured-rules-of-the-game, term: screen}
  - {id: night, col: 2, row: 1, title: "Night one", text: "The twin ladder, 0.80 → 0.67.", link: measured-night-one, cat: coding}
  - {id: two, col: 2, row: 2, title: "Two kinds of structure", text: "Repeats and geometry; the shuffle.", link: measured-two-kinds-of-structure, cat: coding}
  - {id: cut, col: 2, row: 3, title: "Cutting the orchard", text: "Heads, layers, tokens.", link: measured-cutting-the-tensor, term: stereo}
  - {id: read, col: 2, row: 4, title: "Reading one cherry", text: "The leash's price; stretch length.", link: measured-reading-one-cherry, term: leash}
  - {id: bits, col: 2, row: 5, title: "Where the bits come from", text: "Computed, not noisy; the memory table.", link: measured-where-the-bits-come-from, cat: llm}
  - {id: cb, col: 3, row: 1, title: "Codebooks and rotations", text: "Why VQ and KLT lost.", link: measured-codebooks-and-rotations, cat: coding}
  - {id: time, col: 3, row: 2, title: "Sound, time and bits", text: "Prediction along tokens; values, not bits.", link: measured-time-and-bits, cat: coding}
  - {id: noise, col: 4, row: 1, title: "Signal or noise", text: "Pairing; the trap; how the day ran.", link: measured-signal-or-noise, cat: stats}
  - {id: score, col: 4, row: 2, title: "The scorecard", text: "The hypotheses, graded.", link: measured-scorecard, cat: project}
  - {id: means, col: 4, row: 3, title: "What it means", text: "Two kinds of compressor; next.", link: measured-what-it-means, cat: project}
  - {id: half, col: 5, row: 1, title: "What the half means", text: "The dictionary share does not measure sharing.", link: measured-what-the-half-means, term: punnet-redundancy}
  - {id: ladder, col: 5, row: 2, title: "Shared across the stretch", text: "The entropy ladder.", link: measured-shared-across-the-stretch, cat: info}
edges:
  - [data, rules]
  - [rules, night]
  - [night, two]
  - [two, cut]
  - [cut, read]
  - [read, bits]
  - [two, cb, "controls"]
  - [two, time]
  - [bits, noise]
  - [noise, score]
  - [score, means]
  - [means, half]
  - [half, ladder]
```

::: note warning What these numbers are, and are not
- **Values only.** C2 never touched keys; C1 coded keys for one head of each KV layer and found they compress like values ([[#measured-night-one]]).
- **One LLM**, Qwen3.5-2B, and **one kind of text**: the author's own coding-agent transcripts, which repeat themselves more than prose does.
- **One number format**, FP8 E4M3, on the **six KV layers** of a hybrid LLM.
- **Mostly two sequences.** Nearly every result comes from the two development sequences of a three-sequence set; the best compressors reached five sequences at the very end. C2 recorded no holdout score.
- **Three grades of number.** *Verified*: every cherry rebuilt bit for bit by a separate decoder process from the stored bytes alone ([[verified-result]]). *Code-length estimate*: a probability table's code length computed on the data, no compressor built ([[code-length-estimate]]). *Bound*: a limit on a whole family. Each page says which is which, and names one-window and two-sequence numbers as such.
:::

::: takeaway
- Three pages of stage, eight of picture, two of meaning, two in bits; the map links them in reading order.
- Every number here is values only, one LLM, one kind of text, FP8, six KV layers, mostly two sequences.
- Verified, code-length estimate and bound are three different kinds of number; the pages say which is which.
:::
