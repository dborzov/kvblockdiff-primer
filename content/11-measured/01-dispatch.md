---
title: A dispatch from the harness
nav: A dispatch from the harness
group: Setting the stage
lede: 'Parts I–X were written before any data existed. Then a harness was built, handed to teams of AI researcher agents, and run on real Qwen3.5-2B caches for one night and one day. This Part reports what came back: 8 raw bits became about 5, and the bytes turned out to be made of things the proposal had not named.'
cards:
  - q: What did the proposal of Parts I–X plan, and what actually happened?
    a: 'It planned one weekend of numpy on a 2 GB dump; what ran was a harness and two campaigns of AI researcher agents, 126 coders and about 390 recorded trials, in one night and one day'
    wrong: ["Exactly the planned weekend, by one person with numpy", "A GPU kernel benchmark on the serving system", "A literature review with no new measurements"]
    why: 'The harness of IX.1 was built, then turned into a loop that AI researcher agents drove: C1 on the night of 29–30 October 2026, C2 on 30 October.'
    sec: what-happened
  - q: What is a campaign, in this Part's sense?
    a: One run of the autonomous research loop, with several AI researcher agents writing and testing coders against one harness under one set of rules, every trial recorded
    wrong: ["One coder run over every block of the data", "The GPU job that captured the KV cache", "A round of questions put to the human"]
    why: 'Two campaigns ran: C1 with four researcher agents, C2 with about twenty-one. The harness, not an agent, kept the score.'
    sec: what-happened
  - q: 'The best verified result at 4096-token blocks was a ratio of about 0.636. In bits per element of a value, that is…'
    a: About 5.1 bits of 8
    wrong: ["About 6.4 bits", "About 0.64 bit", "About 2.5 bits"]
    why: 'Bits per element are 8 times the ratio: 8 × 0.636 ≈ 5.1. Solo coding sits at 6.22 (0.778), raw at 8.'
    sec: headline
  - q: By how much did the best coders beat solo coding (0.778)?
    a: 'By 1.1 to 1.3 bits per element: 0.636 at 4096 tokens, 0.618 at 16,384'
    wrong: ["By about 3 bits", "By nothing; solo coding was already the floor", "By about 0.1 bit"]
    why: '8 × (0.778 − 0.636) ≈ 1.1 bits; 8 × (0.778 − 0.618) ≈ 1.3 bits. The primer''s decision rule asked for 0.75.'
    sec: headline
  - q: Which statement about the data behind this Part is true?
    a: Values only, one model, one kind of text, FP8 E4M3, six layers, most results on two sequences
    wrong: ["Keys and values of several models on books, code and chat", "Values in BF16 on all 24 layers", "A random sample of 1000 sequences from the web"]
    why: 'The campaigns measured the value half of Qwen3.5-2B''s cache on the author''s own coding-agent transcripts. Every finding carries that qualification.'
    sec: how-to-read-this-part
  - q: 'A number in this Part is labelled "exact model". What does that mean?'
    a: A code length computed from a model on the data, without building the coder; a lead, not a verified result
    wrong: ["Every entry was rebuilt bit for bit in a separate process", "The number was confirmed on all 30 sequences", "The coder ran in exact integer arithmetic"]
    why: Three grades appear here. Verified means every entry came back bit-exactly from a separate decoder; exact model and bound are estimates of what a coder could reach.
    sec: how-to-read-this-part
---

The proposal that fills Parts I–X ends with a timetable: one evening of GPU time to dump a few long documents' [[kv-cache|KV cache]], then a weekend at a desk with numpy, four dictionary types, two rates and a decision rule ([[#plan-wave1-outputs]]). What happened instead took one night and one day, nobody at a keyboard wrote a coder, and the data answered a question the napkin had not quite asked.

This Part is the report from that night and day, written for a reader who has never heard of any of it. Stage first, then picture.

## What happened {#what-happened}

The [[harness]] of [[#plan-harness-interface]] was built roughly as sketched: one interface every coder passes through, one accounting rule, a round trip that must be exact. Then it was turned into a loop. An AI researcher agent reads what is known so far, writes a coder and submits it; the harness scores it and records the trial; the agent reads the score and tries the next idea. A supervisor agent runs the environment and writes the briefs. The human steps in only to clarify the goal.

A [[=campaign]] is one run of that loop: several researcher agents, one harness, one set of rules, every trial recorded in a ledger nobody edits by hand. Two campaigns ran.

| | C1 | C2 |
|---|---|---|
| when | the night of 29–30 October 2026 | 30 October 2026 |
| researcher agents | four, in five rounds of 2–2.5 hours | about twenty-one, in four rounds |
| data | values of layer 3, one head, then deeper layers, both heads and keys; FP8 and BF16 | values of all six layers, both heads; FP8 only |
| recorded trials | 218 | 169 |
| coders left behind | 62 | 126 in all, with 36 Rust components |

The data was real: the value half of Qwen3.5-2B's cache over thirty long coding-agent transcripts, 20.9 GB of bytes ([[#measured-the-data]]). The rules were real too, and the human clarified them twice during the first night, the second time to close a loophole the search had found ([[#measured-rules-of-the-game]]).

::: takeaway
- The plan was a weekend of numpy. What ran was a harness driving two campaigns of AI researcher agents: 126 coders, about 390 trials.
- A campaign is one run of the loop: agents propose coders, the harness scores them, the ledger remembers.
- C1 measured one layer and one head through the night; C2 measured all six layers the next day.
:::

## The headline {#headline}

A raw value is 8 bits. Coding every element alone with the best statistics a block can offer, the ideal is 0.778 of that, about 6.22 bits ([[solo|solo coding]], which [[#homework-solo-coding]] guessed within 0.002). The best verified coder with a per-block [[dictionary]] reached 0.636 at blocks of 4096 tokens on the two development sequences, 0.630 on five sequences of the larger set, and 0.618 at blocks of 16,384 tokens. In the site's unit, [[bpe|bits per element]]: 8, then 6.2, then 5.1, then 4.9.

::: aside source Receipts
Throughout this Part, "notes" and "spec" name the verification notes and the pinned-number sheet kept with the site's source under `experiment_repos/kv-compress-roofline/`; trial ids such as env-t0096 are rows of the campaigns' ledgers. Solo ideal 0.77811 is the landmark of the layer screen at 4096 tokens (notes/01 §B2). Best real solo coder 0.8039: coder 09, r1-t0005. C1's ladder top 0.6731: coder 34, r1-t0042 (layer 3, head 0, no read budget). C2: 0.63639 and 0.62970, coder 121, env-t0096 (two sequences of target 03; five of target 02); 0.61768 at 16,384 tokens, coder 120, env-t0097 (two sequences). The block floor ≈0.60 is an exact-model extrapolation, not a coder (spec §1.10). Counts: 387 ledger trials (C1 218, C2 169), 126 coders (notes/00).
:::

::: figure fig-msr-headline msrHeadline
**From 8 bits to 5.** Horizontal bars in bits per element of one value (8 is raw; the ratio in brackets). Raw 8. Solo ideal 6.22 (0.778): a block's per-channel statistics, nothing shared between entries, all six layers. C1's ladder top 5.38 (0.6731): layer 3, head 0 only, 4096-token blocks, no read budget, two sequences. C2 at 4096 tokens: 5.09 (0.6364) on two sequences, 5.04 (0.6297) on five sequences of the larger set. C2 at 16,384 tokens: 4.94 (0.6177), two sequences. Dashed: the block floor ≈4.8 bits (≈0.60), an **estimate** from a model's code length, not a coder. Thin rule: the primer's go-threshold, solo minus 0.75 bit ([[#plan-decision-rule]]). Hover a bar for coder, screen and trial id; every solid bar is verified.
:::

In the primer's words: the proposal priced storage per entry as the dictionary's cost $\vw/\vb$ plus the [[delta-ratio|delta ratio]] $\vrho$, and the campaigns' score is exactly that sum ([[#measured-rules-of-the-game]]). The napkin of [[#homework-where-bits-come-from]] expected values to end near $\vrho \approx 0.75$–$0.85$, with any gain coming from keys. The sum came in at 0.636 for values: 1.1 to 1.3 bits below solo, well past the 0.75 bit the [[decision-rule|decision rule]] asked for. How it splits between dictionary and delta turned out to be mostly bookkeeping; [[#measured-reading-one-entry]] explains why.

Where did the bits go? Three places, each with its own page. **Repeats:** in a block of 4096 tokens many value entries are near-copies of an earlier entry, usually the same token appearing again, and the best coders store the earlier one and point at it ([[#measured-night-one]]). **Geometry:** within one entry the channels predict each other through a rule fixed by the model's own weights, a rule that transfers from one text to another ([[#measured-two-kinds-of-structure]]). **A remainder** that no per-block coder reaches, because it is the text's long memory, what the model was attending to thousands of tokens back ([[#measured-where-the-bits-come-from]]).

::: pull
Repeats belong to the text; geometry belongs to the model.
:::

::: takeaway
- Raw 8 bits → solo 6.2 → 5.1 at 4096-token blocks → 4.9 at 16K; ratios 1 → 0.778 → 0.636 → 0.618.
- That is 1.1–1.3 bits below solo, on values, where the napkin expected almost nothing.
- The bits came from repeats of earlier tokens, from geometry set by the weights, and from a remainder that is the text's memory.
:::

## How to read this Part {#how-to-read-this-part}

This page and two more set the stage, eight paint the picture, two say what it means.

```graph
id: measured-map
columns: [Setting the stage, What was found, What lost, Method and meaning]
nodes:
  - {id: data, col: 1, row: 1, title: "The data on the table", text: "One model, one kind of text, 20.9 GB.", link: measured-the-data, cat: llm}
  - {id: rules, col: 1, row: 2, title: "The rules of the game", text: "The contract, the square, the budget.", link: measured-rules-of-the-game, term: mdl-ratio}
  - {id: night, col: 2, row: 1, title: "Night one", text: "The twin ladder, 0.80 → 0.67.", link: measured-night-one, cat: coding}
  - {id: two, col: 2, row: 2, title: "Two kinds of structure", text: "Repeats and geometry; the shuffle.", link: measured-two-kinds-of-structure, cat: coding}
  - {id: cut, col: 2, row: 3, title: "How to cut the tensor", text: "Heads, layers, tokens.", link: measured-cutting-the-tensor, cat: stats}
  - {id: read, col: 2, row: 4, title: "Reading one entry", text: "The budget's price; block size.", link: measured-reading-one-entry, term: read-budget}
  - {id: bits, col: 2, row: 5, title: "Where the bits come from", text: "Computed, not noisy; the memory table.", link: measured-where-the-bits-come-from, cat: llm}
  - {id: cb, col: 3, row: 1, title: "Codebooks and rotations", text: "Why VQ and KLT lost.", link: measured-codebooks-and-rotations, cat: coding}
  - {id: time, col: 3, row: 2, title: "Sound, time and bits", text: "Prediction along tokens; values, not bits.", link: measured-time-and-bits, cat: coding}
  - {id: noise, col: 4, row: 1, title: "Signal or noise", text: "Pairing; the trap; how the day ran.", link: measured-signal-or-noise, cat: stats}
  - {id: score, col: 4, row: 2, title: "The scorecard", text: "The primer's predictions, graded.", link: measured-scorecard, cat: project}
  - {id: means, col: 4, row: 3, title: "What it means", text: "The decision rule, the miss path, next.", link: measured-what-it-means, cat: project}
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
```

::: note warning What these numbers are, and are not
- **Values only.** C2 never touched keys; C1 coded keys for one head of each layer and found they compress like values ([[#measured-night-one]]).
- **One model**, Qwen3.5-2B, and **one kind of text**: the author's own coding-agent transcripts, which repeat themselves more than prose does.
- **One number format**, FP8 E4M3, on the **six layers** that keep a KV cache.
- **Mostly two sequences.** Nearly every result comes from the two development sequences of a three-sequence set; the best coders reached five sequences at the very end. C2 recorded no holdout score.
- **Three grades of number.** *Verified*: every entry rebuilt bit for bit by a separate decoder process from the stored bytes alone ([[#measured-rules-of-the-game]]). *Exact model*: a model's code length computed on the data, no coder built. *Bound*: a limit on a whole family. Each page says which is which, and names one-window and two-sequence numbers as such.
:::

::: takeaway
- Three pages of stage, eight of picture, two of meaning; the map links them in reading order.
- Every number here is values only, one model, one kind of text, FP8, six layers, mostly two sequences.
- Verified, exact model and bound are three different kinds of number; the pages say which is which.
:::
