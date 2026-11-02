---
title: Where we stand
nav: Where we stand
group: Where we stand
lede: The plan on this site once asked for one weekend of measuring. What came back was two campaigns, 126 compressors and 387 ledger trials, all on one slice of one orchard. Before planning the next step, a ledger of what is known, what is not, and the three big questions in the new words.
cards:
  - q: Which of these did the campaigns answer with a measured number?
    a: How much joining the two KV heads of a layer into one cherry saves (0.032 of ratio on 20 of 20 sequences)
    wrong: ["How often a pick is a δ-miss on the Bench", "Whether keys and values share bits", "Whether prose compresses like coding transcripts"]
    why: Stereo similarity was measured by a same-window comparison of cherry shapes. The other three need a pick trace, a K+V scenario or a second corpus, none of which exists yet.
    sec: answered
  - q: Why is every application-side number (misses, popularity, δ-miss fraction) still unmeasured on the Bench?
    a: No indexer ever ran on the Bench; the dump holds keys and values of prefill tokens and nothing about which positions would be picked
    wrong: ["Because the Bench has no GPU", "Because the campaigns ran out of time", "Because HiSparse's numbers already cover it"]
    why: Picks come from queries scored against keys. The dump has no queries, so there is no pick, no miss and no popularity to count.
    sec: open
  - q: What is a big-picture question, on this site?
    a: An open-ended question the project exists to get closer to, too wide to settle with one experiment
    wrong: ["A question with a yes-or-no answer from one scenario", "A question about one compressor's score", "A question a paper has already answered"]
    why: Q1 to Q3 name the three big questions; each experiment of this Part is a small, decidable step towards one of them.
    sec: big-questions
---

In October 2026 the plan on this site asked for "one weekend": dump a small LLM's orchard, run a ladder of dictionaries through a harness, read three numbers. What came back was larger and narrower than that. Two [[campaign|campaigns]] of autonomous research agents wrote 126 [[compressor|compressors]] and ran 387 ledger trials ([[#measured-dispatch]]), almost all of them on one [[slice]] of one [[orchard]]: the values of Qwen3.5-2B, FP8, on coding-agent transcripts. The answers on that slice are sharp. Everything off it is still open.

## What the campaigns answered {#answered}

Five questions have a graded number next to them now. Every figure here traces to a ledger row or a same-window receipt in Part VIII.

| question | reading on [[bench|the Bench]] | grade | where |
|---|---|---|---|
| Do the two KV heads of a layer share bits? ([[stereo\|stereo similarity]]) | joining them into one `(2, 256)` cherry saves 0.032 of ratio, on 20 of 20 sequences; a bound says 0.85 bit per element is shared | same-window, encoded bytes | [[#measured-cutting-the-tensor]] |
| Where does the dictionary's gain come from? ([[echo\|echo similarity]]) | the reference tree lives on repeats of the same token: shuffling tokens across sequences moves the tree's score from 0.691 to 0.752 while the linear-prediction gain barely moves (0.034 → 0.034) | screen, 2 sequences | [[#measured-two-kinds-of-structure]] |
| What does the [[leash]] cost? | 293 cherries' worth for every cherry costs nothing at stretch 4096; 137 costs +0.023 (0.660 against 0.636); the best compressor's worst cherry reads 226 | verified, every cherry counted | [[#measured-reading-one-cherry]] |
| Where is the [[solo]] floor, and how far below it can a dictionary go? | solo 0.778 (ideal), 0.804 (real); the best stretch-scope compressor 0.636; a light no-tree compressor 0.686 | verified | [[#measured-scorecard]] |
| How does the score move with stretch length? | 0.689 / 0.636 / 0.618 at 512 / 4096 / 16 384 (different compressors on different screens); one compressor family, no leash, layer 0: 0.724 / 0.673 / 0.642 / 0.629 at 512 / 4K / 16K / 32K | verified; C1 | [[#measured-night-one]] |

Three smaller readings ride along: [[fallen-apple|fallen-apple similarity]] is weak at the cherry level (two adjacent tokens as one cherry cost +0.037), [[upstairs|upstairs similarity]] is small (joining all six layers saves a further 0.004), and pre-RoPE keys compress like values at the same depth, for one night, one head, no leash ([[#hypotheses-keys-and-values]]).

::: aside source Receipts
Stereo and layers: same-window comparison on 20 sequences of target 02 (notes/03 §1). Shuffle: r12 iter-1-2/1-3, tree coder 0.6907 → 0.7520, prediction −0.0337 → −0.0344. Leash: env-t0089 (`s-layer-b4k-r137`, 97, 0.65980) against env-t0096 (`s-layer-b4k-r293`, 121, 0.63639, reads 120 / 184 / 226). Solo: 0.778 (six-layer ideal), r1-t0005 (0.80385). Stretch lengths: env-t0010 (113, 512), env-t0096 (121, 4096), env-t0097 (120, 16384); C1 coder 50: r1-t0045, r1-t0042, r4-t0008. Keys: C1 r3 sessions 2–4, K vs V at 4K, head 0.
:::

::: takeaway
- Five graded readings: stereo (0.032, encoded bytes), echo (the tree's gain vanishes under the shuffle), the leash (293 is free, 137 costs 0.023), the solo floor (0.778 against a best of 0.636), the stretch-length curve.
- All of them are about values, FP8, one text genre, one LLM.
:::

## What they did not answer {#open}

The list of what is open is longer than the list of what is known, and most of it was never attempted rather than attempted and failed.

- **Keys.** C2 never touched them. C1 ran keys for one night, head 0 only, without the leash and without the stereo gain. There is no verified number for `K · all · cherry (2, 256) · stretch 4096 · leash 293`.
- **Keys and values together.** A hot-cache miss moves both halves of a [[pick]]. Nobody has coded a `(2, 2, 256)` cherry of one token's keys and values, so nobody knows whether the two halves share bits.
- **Sequence scope.** The stretch-length curve stops at 32K. A whole-sequence pool was estimated once as a bound (0.26–0.45 bit per element below a 16 384 pool, allowing cycles), never run under the [[contract]].
- **Global scope.** A linear-prediction table fit on another sequence recovered 91–96 % of its gain: a lead that a [[calibration-set|calibration set]] has not confirmed.
- **Other text, another LLM.** Every number is from coding-agent transcripts, 26–89 % tool output, on one [[stand-in-llm|stand-in LLM]]. The echo finding is about repetition in the text; prose repeats less.
- **The whole application side.** No [[indexer]] ran on the Bench. There is no pick trace, so no miss rate, no [[popularity]], no [[delta-miss-fraction|δ-miss fraction]], no dictionary loads, and no measurement of how fast any compressor decodes on a GPU.

::: theme which-vs-what
Every answered question is about *what* is inside the cherries. Every open application question is about *which* cherries are wanted, step after step. The second kind needs queries, and the dump has none ([[#plan-the-dataset-we-have]]).
:::

::: takeaway
- Open: keys under the leash, keys and values together, sequence and global scope, other genres, a second LLM.
- Open and never attempted: every number that needs a pick trace, and decoder speed.
:::

## The three big questions, restated {#big-questions}

The old plan named three big questions and four framework questions. The names change; the shape of the scaffolding does not.

::: define big-question
- **What it is.** An open-ended question the project exists to get closer to. Its answer space is wide: yes, no, only for keys, only in the middle layers.
- **The three.** **Q1**, the structure question: how are the orchard's bits arranged along its axes, in bits? **Q2**, the store question: can a dictionary-and-delta store beat solo on the one-cherry-at-a-time path, under the leash, at GPU speed? **Q3**, the residency question: do picks pile into a few stretches for many steps, so that their dictionaries can stay on the GPU?
- **Easy to confuse with** an experiment question ([[#plan-principles]]), which is one scenario, one control set and one decision, answerable in hours.
:::

| big question | status after the campaigns |
|---|---|
| Q1 structure | half-answered: values yes (stereo, echo, a little upstairs); keys, K+V, sequence scope and other genres open |
| Q2 the store | answered in bits (0.636 under a leash of 293, verified), not in time (no GPU decode exists) |
| Q3 residency | untouched: no pick trace on the Bench; the Pin's miss rates are HiSparse's measurement, not ours |

The map below is the whole plan on one card: what each big question still needs, and which page of this Part supplies the experiment.

```graph
id: plan-map-2026-11
columns: ["Big questions", "What is settled", "Next experiments"]
nodes:
  - {id: q1, col: 1, row: 1, title: "Q1 · structure", text: "How are the orchard's bits arranged, in bits?", link: plan-where-we-stand/big-questions, term: neighbour}
  - {id: q2, col: 1, row: 2, title: "Q2 · the store", text: "Does a dictionary-and-delta store beat solo on the miss path, under the leash, at GPU speed?", link: plan-where-we-stand/big-questions, term: delta}
  - {id: q3, col: 1, row: 3, title: "Q3 · residency", text: "Do picks pile into few stretches for many steps?", link: plan-where-we-stand/big-questions, term: heavy-stretch}
  - {id: s1, col: 2, row: 1, title: "Values: stereo, echo", text: "0.032 for joining heads; the tree lives on repeats.", link: measured-cutting-the-tensor, term: stereo}
  - {id: s2, col: 2, row: 2, title: "0.636 under leash 293", text: "Verified, every cherry counted; the solo floor is 0.778.", link: measured-scorecard, term: leash}
  - {id: s3, col: 2, row: 3, title: "Nothing yet", text: "No indexer ran on the Bench.", link: hypotheses-heavy-stretches, term: pick}
  - {id: n1, col: 3, row: 1, title: "More scenarios", text: "Keys, K+V, group dictionaries, sequence scope, prose, a second LLM.", link: plan-next-in-the-harness, term: scenario}
  - {id: n2, col: 3, row: 2, title: "A GPU decode", text: "Cherries per second against the link.", link: plan-decoder-speed, term: compressor}
  - {id: n3, col: 3, row: 3, title: "Queries, picks, replay", text: "Exact top-k as a stand-in indexer; the hot cache replayed.", link: plan-queries-and-picks, term: trace-replay}
edges:
  - [q1, s1]
  - [q2, s2]
  - [q3, s3]
  - [s1, n1]
  - [s2, n2]
  - [s3, n3]
```

::: takeaway
- Q1 is half-answered, Q2 answered in bits but not in time, Q3 untouched.
- The next experiments split the same way: scenarios for Q1, a GPU decode for Q2, queries and a replay for Q3.
:::
