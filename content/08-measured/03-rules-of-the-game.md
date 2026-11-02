---
title: The rules of the game, as scenarios
nav: The rules, as scenarios
group: Setting the stage
lede: 'Every score in this Part was produced under the contract, the score and the leash of Part IV, on a scenario the campaigns called a track. Here are the campaigns'' scenarios written in the site''s words, the cheap test called a screen, and the hours of 30 October 2026 in which the rules were born.'
cards:
  - q: 'The campaigns'' track `s-layer-b4k-r293`, in the site''s words, is which scenario?'
    a: 'V · all six KV layers · cherry (2, 256) · stretch 4096 · leash 293, on a screen'
    wrong: ["K · KV layer 0 · cherry (256,) · stretch 293", "V · all · cherry (6, 2, 256) · stretch 4096 · no leash", "V · head 0 · cherry (2, 256) · stretch 16 384 · leash 293"]
    why: '"layer" names the cherry shape (both heads of one KV layer), "b4k" the stretch length, "r293" the leash; the slice is always the values.'
    sec: the-scenarios
  - q: What is a screen?
    a: 'A fixed, cheap test: an evenly spaced tenth of the stretches of two (or five) sequences at one scenario'
    wrong: ["A full run over every stretch of every sequence", "The holdout set", "A trial whose reads were sampled"]
    why: A screen is cheap enough to run hundreds of times. Nearly every number in this Part is a screen, and two screens read different punnets.
    sec: the-scenarios
  - q: Why can the scores of two screens not be subtracted?
    a: They read different punnets; the token screen happened to sample punnets about 0.005 harder for every compressor than the layer screen did
    wrong: ["Because one is in bits and the other in bytes", "Because screens use different number formats", "They can, as long as both are verified"]
    why: The layer screen read 0.6449 and the token screen 0.6461, yet on the same elements `(6, 2, 256)` cherries beat `(2, 256)` cherries by 0.0043 on 20 of 20 sequences. Only a same-window comparison ranks cherry shapes.
    sec: the-scenarios
  - q: 'A ledger row says `verification: {isolated: true}` and `reads: {every_cherry: true}`. What has been proved?'
    a: Every cherry of every punnet came back bit for bit from a separate decoder-only process, and the leash was checked on every cherry, not a sample
    wrong: ["The dictionary is smaller than the deltas", "The compressor is faster than the link", "The score is better than solo"]
    why: That is a verified result with the leash proved. A row without the second flag may hide a worst cherry up to 26 % hungrier than its sample showed.
    sec: the-grades
  - q: Why did the leash not exist when the first night began?
    a: Nobody had written the one-cherry-at-a-time access pattern down as a rule; within the hour the search slid to "every cherry in the dictionary", 0.6705, which is stream compression of the punnet
    wrong: ["The harness could not count reads yet", "The human forgot to copy it from Part IV", "It existed but was set to 1 103"]
    why: 'At 10:15 UTC the goal was clarified, at 11:00 the corner was called what it was, and by 11:20 the leash existed. Since 31 October it is counted for every single cherry.'
    sec: the-hours
---

Here is one row of the campaigns' ledger, abridged into the site's words. Every field is a rule of Part IV.

```json one trial, as the ledger recorded it (env-t0096, 31 October 2026, 06:12 UTC)
{"id": "env-t0096", "compressor": "121-stack-rows",
 "scenario": "V · all · cherry (2, 256) · stretch 4096 · leash 293 (screen)",
 "mdl_ratio": 0.63639, "dictionary_share": 0.5247, "delta_share": 0.1116,
 "punnets": 72, "cherries": 294912,
 "verification": {"isolated": true},
 "reads": {"mean": 120.4, "p99": 184, "max": 225.8, "every_cherry": true}}
```

A *trial* is one recorded test of one [[compressor]]; the *ledger* is the machine-written list of every trial, which no agent may edit. Compressor 121, on one KV layer's values per cherry in stretches of 4096 tokens, scored 0.63639 with more than half of it in the dictionary; all 294 912 cherries came back from a separate process; the hungriest cherry touched 226 cherries' worth of dictionary. The [[contract]] is behind the equality every cherry passed ([[#scenario-the-contract]]), the [[mdl-ratio]] and its two shares are the score ([[#scenario-the-score]]), `reads` is the [[leash]] being checked ([[#scenario-the-leash]]), and the whole row is the [[harness]] at work ([[#scenario-the-harness]]).

## The scenarios {#the-scenarios}

The campaigns did not have Part IV's words. They had *tracks*, named by a code: `s-layer-b4k-r293` is a screen (`s-`), one KV layer's values per cherry (`layer`), stretches of 4096 tokens (`b4k`), a leash of 293 (`r293`). Each track is a [[scenario]] of [[#scenario-why-vary]], and this Part writes it as one.

| the campaigns' track | the scenario |
|---|---|
| C1's first track | V · KV layer 0 (the LLM's layer 3) · head 0 · cherry `(256,)` · stretch 4096 (and 512, 16 384, 32 768) · no leash until 11:20 UTC · FP8 (and BF16) |
| the head screen | V · all six KV layers · cherry `(256,)` · stretch 4096 · leash 293 (screen) |
| the layer screen | V · all six KV layers · cherry `(2, 256)` · stretch 4096 · leash 293 (screen) |
| the token screen | V · all six KV layers · cherry `(6, 2, 256)` · stretch 4096 · leash 293 (screen) |
| the pair and quad tracks | V · one KV layer · cherry = 2 or 4 adjacent tokens `(2, 2, 256)`, `(4, 2, 256)` · stretch 4096 |
| the 137 and 1 103 tracks | the layer screen with the leash at 137; the 16 384 tracks with the leash at 1 103 |

Three things change between rows and nothing else: the [[cherry-shape|cherry shape]], the [[stretch|stretch length]] and the leash. The [[slice]] is always the values; the LLM, the corpus and the format are fixed. That is what makes the rows comparable at all, and it is why a score always travels with its scenario line.

::: define screen
- **What it is.** A fixed, cheap test: an evenly spaced tenth of the stretches of the two development sequences of target 03 (track names beginning `s-`), or one in nine of five sequences of target 02 (`st02n5-`), at one scenario. Cheap enough to run hundreds of times; nearly every number in this Part is a screen.
- **Example.** The layer screen above: 72 punnets of 4096 cherries of 512 bytes, two sequences.
- **Easy to confuse with** a full run (every stretch of every sequence, which the campaigns never did), and with another screen. Two screens read different punnets, and what makes a punnet hard is its text, so **their scores cannot be subtracted**.
:::

::: note warning Two screens read different punnets
The layer screen read 0.6449 and the token screen 0.6461, so `(2, 256)` cherries looked better; on exactly the same elements, `(6, 2, 256)` cherries win by 0.0043 on 20 of 20 sequences, because the token screen had drawn punnets about 0.005 harder for every compressor. Compare scores within one screen only. [[#measured-signal-or-noise]] tells the story; [[#measured-cutting-the-tensor]] ranks the shapes properly.
:::

::: figure fig-measured-square msrCurve wide
**Every verified record of both campaigns, placed on the score's square.** Horizontal axis: [[dictionary-share|dictionary share]] $\vxshare$, the dictionary's bytes over the punnet's raw bytes. Vertical axis: [[delta-share|delta share]] $\vrho$, the mean delta over a raw cherry. Their sum is the MDL ratio, so the grey diagonals are lines of constant ratio: solid at 1.0 (no compression), dashed at 0.778 (solo coding on the Bench's values). Dots: one per verified record, coloured by cherry shape, `(256,)`, `(2, 256)`, `(6, 2, 256)` and the rest; hover for compressor, scenario line, ratio and worst-cherry reads. Ringed: compressor 129, no reference cherries and a dictionary share of 0.01–0.04 (0.6863 on the layer screen), and compressor 109, every cherry in the dictionary and empty deltas (0.7188 at a stretch of 512 on the head screen). Toggle C1 and C2; C1's points are KV layer 0, head 0 only. Data: `figures/data/measured-points.json`.
:::

::: takeaway
- A track is a scenario: the slice is always the values; cherry shape, stretch length and leash vary.
- A screen is a tenth of the stretches of two (or five) sequences at one scenario; two screens read different punnets, so never subtract their scores.
:::

## The grades {#the-grades}

The ledger carries four kinds of number, and the pages of this Part name the grade of every one.

- **Verified.** A [[verified-result|verified result]] is a score whose every cherry of every punnet was rebuilt bit for bit by a separate decoder-only process from the stored bytes alone (`isolated: true`). Only a verified trial can hold a record. With `every_cherry: true` the leash is proved as well: each cherry decoded cold in a fresh process, its distinct dictionary bytes recorded, then a sample re-decoded with every untouched byte scrambled, which must change nothing. Before 31 October the harness sampled eight cherries per punnet, and the sampled maxima had run up to 26 % below the true worst cherry.
- **Quick.** Bit-exact in process, reads uncounted. A quick row can lead but never hold a record.
- **Encoder bytes.** A real compressor's output counted, never put through the separate decoder. The same-window comparisons of [[#measured-cutting-the-tensor]] are this grade.
- **Code-length estimate, and bound.** The code length a probability table would reach, computed on the data without building the compressor ([[code-length-estimate]], [[#toolbox-bounds]]); or a limit on a whole family. A lead, never a result.

Never charged, because both sides know them in advance: the stretch length, the punnet size, the cherry shape, which cherry is asked for. Also not charged, by the human's decision on 30 October: each delta's *length*, worth about 0.0003–0.0024 of ratio and no change of winner.

::: theme controls
The round trip is the control nobody can argue with. Compressor 01 only moves a fixed fraction of each cherry into the dictionary, so its two shares must sum to 1.0000 exactly, and did (env-t0001). Every record above it passed the same separate decoder.
:::

::: takeaway
- Verified means every cherry rebuilt in a separate process; `every_cherry: true` adds the leash proved per cherry. Quick, encoder-bytes and code-length numbers are leads.
- Delta lengths are not charged; the baseline sits exactly on dictionary share + delta share = 1.
:::

## The hours of 30 October {#the-hours}

Part IV states the rules as if they had always existed. They were written in a morning, and the order matters.

- **The contract and the score** existed before the first night: `compress` and `decompress`, every cherry back bit for bit, bytes out over bytes in.
- **10:15 UTC.** The human clarified the goal: deployment is out of scope; explore the whole range of dictionary-versus-delta splits and find where the ratio is lowest. The agents pushed cherries into the dictionary and the ratio kept falling, to the corner where *every* cherry is in the dictionary and every delta is empty: 0.6705 at a stretch of 4096, the best number of the night ([[#measured-night-one]]).
- **11:00 UTC.** The human called that corner what it was: ordinary stream compression of the punnet, valid under the contract and useless for one-cherry-at-a-time asks. The frontier compressors already read half their dictionary for one cold cherry; the all-dictionary one read about 1 490 cherries' worth.
- **11:20 UTC.** The third rule existed: the leash, at 137, 293 or 1 103 cherries' worth per cold decode, primes chosen by the human, the same at every stretch length. C2 started again under it.
- **31 October.** The leash was first stated on the mean over a sample; the human then set it on every single cherry, and the supervisor re-decoded 5.3 million cherries cold to check ([[#measured-reading-one-cherry]]).

::: aside source Receipts
Compressor 121: env-t0096. Baseline 1.0000: env-t0001. Coder 129 (no reference entries, dictionary share 0.01–0.04): 0.6863 on the layer screen, r25-t0003. Coder 109 (everything in the dictionary): 0.71884 on the head screen at 512 tokens, env-t0009. The trap: layer screen 0.6449 (coder 102, r11-t0002) against token screen 0.6461; token better by 0.0043 on 20 of 20 same-window sequences (spec §1.11, §1.6). Delta lengths 0.0003–0.0024: retro-review. All-dictionary 0.6705 with ≈1,490 reads: r1-t0068 (notes/04 §4). Budgets and their origin: `docs/spec/random-access.md` v1.1; clarifications: `research/MORNING.md` Parts 2 to 4. Sampled maxima up to 26 % low: notes/01. Track names: `s-head-b4k-r293`, `s-layer-b4k-r293`, `s-token-b4k-r293`, `s-tok2-b4k-u`, `s-tok4-b4k-u`, `s-layer-b4k-r137`, `s-layer-b16k-r1103`, `st02n5-layer-b4k-r293`.
:::

::: theme access-pattern
The leash is the access pattern of the serving system's miss path written as a rule a harness can check: one scattered cherry, decoded cold, may lean on a bounded piece of the dictionary. It had to come *before* the statistics; built without it, the search slid straight to the one layout a one-cherry-at-a-time store cannot use.
:::

::: takeaway
- Contract and score first; at 10:15 the goal, at 11:00 the corner named, at 11:20 the leash; on 31 October the leash on every cherry.
- What the leash cost the best compressors, nothing at a stretch of 4096 and above, is the question of [[#measured-reading-one-cherry]].
:::
