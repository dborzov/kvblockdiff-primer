---
title: The rules of the game
nav: The rules of the game
group: Setting the stage
lede: 'Every score in this Part was produced under one contract, drawn on one square, and fenced by one budget that did not exist when the first night began. Here are the rules, with the hour at which each was written down.'
cards:
  - q: What does the harness check about a coder's decompress?
    a: That every entry of every block comes back bit for bit from its own delta and the block's dictionary alone, in a separate decoder-only process
    wrong: ["That the mean error is below one FP8 step", "That a sample of eight entries per block decodes correctly", "That the dictionary is smaller than the deltas"]
    why: 'That is what "verified" means. A quick trial skips the separate process and can never hold a record.'
    sec: the-contract
  - q: 'A coder''s dictionary is 0.52 of the block''s raw bytes and its deltas average 0.11 of a raw entry. Its MDL ratio and its bits per element?'
    a: 0.63, about 5.1 bits
    wrong: ["0.41 and about 3.3 bits", "0.52 and about 4.2 bits", "1.63 and about 13 bits"]
    why: 'MDL ratio = dictionary share + delta share = 0.52 + 0.11 = 0.63; bits per element = 8 × 0.63 ≈ 5.1.'
    sec: the-contract
  - q: What is an entry split?
    a: 'Which elements form one entry: one head (256 B), one layer with both heads (512 B), or one token across all six layers (3072 B)'
    wrong: ["How a delta is cut into fixed-length fields", "The fraction of entries stored in the dictionary", "The split of sequences into development and holdout"]
    why: It is a setting of the test, fixed before the coder runs; every entry of a test has the same shape.
    sec: the-square
  - q: Why can the scores of two screens not be subtracted?
    a: They read different blocks; the token screen happened to sample blocks about 0.005 harder for every coder than the layer screen did
    wrong: ["Because one is in bits and the other in bytes", "Because screens use different number formats", "They can, as long as both are verified"]
    why: The layer screen read 0.6449 and the token screen 0.6461, yet on the same elements token entries beat layer entries by 0.0043 on 20 of 20 sequences. Only a same-window comparison ranks splits.
    sec: the-square
  - q: Why does the read budget exist?
    a: Without it the best score was reached by putting every entry in the dictionary, which is stream compression of the block, and the miss path cannot use that
    wrong: ["To keep dictionaries small enough for GPU memory", "To make encoding faster", "To limit the number of trials per agent"]
    why: 'C1''s optimum slid to 0.6705 at 4096 tokens with empty deltas; to read one entry you decoded the block. IV.6 had ruled that out before any data.'
    sec: the-budget
  - q: How has the read budget been counted since 31 October 2026?
    a: For every single entry, each decoded cold in a fresh process, with the distinct dictionary bytes it touched recorded
    wrong: ["As the mean over eight sampled entries per block", "As the size of the dictionary divided by the block size", "Only for the first entry of each block"]
    why: The first rule was stated on the mean; the human then set it on every entry. The old eight-entry samples had run up to 26 % below the true worst entry.
    sec: the-budget
---

Here is one row of the campaigns' ledger, abridged and in plain words. Every word in it is a rule.

```json one trial, as the ledger recorded it (env-t0096, 31 October 2026, 06:12 UTC)
{"id": "env-t0096", "algorithm": "121-stack-rows", "screen": "s-layer-b4k-r293",
 "score": 0.63639, "dictionary_share": 0.5247, "delta_share": 0.1116,
 "blocks": 72, "entries": 294912,
 "verification": {"isolated": true},
 "dict_reads": {"mean": 120.4, "p99": 184, "max": 225.8, "every_entry": true}}
```

A *trial* is one recorded test of one coder; the *ledger* is the machine-written list of every trial, which no agent may edit. Coder 121, on one layer's values per entry in 4096-token blocks, scored 0.63639 with more than half of it in the dictionary; all 294,912 entries came back from a separate process; the hungriest entry touched 226 entries' worth of dictionary. The contract is behind `score`, the square behind the two shares, the budget behind `dict_reads`.

## The contract {#the-contract}

Every coder in both campaigns implements two functions and nothing else.

```python the whole contract
deltas, dictionary = compress(entries)              # once, in advance; entries = all N entries of one block
entries[i] == decompress(deltas[i], dictionary)     # for every i, bit for bit, in a fresh process
```

One [[dictionary]] per [[block]], one [[delta]] per [[entry]]. Both are opaque bytes: the [[harness]] never looks inside them or asks what the dictionary "contains". It checks that every entry comes back exactly, and it counts bytes.

::: define mdl-ratio MDL ratio
- **What it is:** (dictionary bytes + all delta bytes) ÷ raw bytes of the block; in the primer's two numbers, both in units of a raw entry,

$$
\text{MDL ratio} \;=\; \underbrace{\frac{\vw}{\vb}}_{\text{dictionary share}} \;+\; \underbrace{\vrho}_{\text{delta share}}, \qquad \vbpe = 8 \times \text{MDL ratio}.
$$ {#eq-msr-mdl-ratio}

- **Example:** coder 121 above, $0.5247 + 0.1116 = 0.6364$, or $5.09$ [[bpe|bits per element]]; 1.0 means no compression.
- **Easy to confuse with:** the [[delta-ratio|delta ratio]] alone. Here $\vrho$ is the mean delta over *all* entries, empty ones included, and the dictionary is always on the bill.
:::

Never charged, because both sides know them in advance: the block size $\vb$, the number of entries, an entry's shape, which entry is asked for. Also not charged, by the human's decision on 30 October: each delta's *length*, worth about 0.0003–0.0024 of ratio and no change of winner.

A score is a [[=verified-result]] only if every entry of every block was rebuilt bit for bit by a separate decoder-only process from the stored bytes alone. A trial that skipped this pass can never hold a record; anything else is called a block test, an exact model or a bound.

::: theme controls
The round trip is the control nobody can argue with. The baseline is the self-test of the bill: coder 01 only moves a fixed fraction of each entry into the dictionary, so its two shares must sum to 1.0000 exactly, and did (env-t0001).
:::

Against the sketch of [[#plan-harness-interface]] and [[#plan-accounting]]: the sketch had three methods (fit, encode, decode) and let the harness choose the fitting set to control scope, while the real harness has one contract, compress and decompress, scope fixed at the block, dictionary and delta opaque. The sketch was a few hundred lines of numpy on a laptop; the real harness is a daemon, one per repository, that queues jobs, verifies in isolation and counts reads, and its users are AI researcher agents.

::: takeaway
- Compress a block into one dictionary and one delta per entry; decompress every entry alone, bit for bit. MDL ratio = $\vw/\vb + \vrho$; bits per element = 8 × ratio.
- Verified means every entry rebuilt in a separate process. Delta lengths are not charged. The baseline sits exactly on dictionary share + delta share = 1.
:::

## The square {#the-square}

[[#questions-framework-b]] drew a plane before any data: dictionary cost per entry across, delta size per entry up, their sum the storage per entry, every coder a point. The campaigns drew it as a plain square from 0 to 1, because the dictionaries turned out heavy. The baseline runs along the diagonal where the shares sum to 1; [[solo|solo coding]] sits on the left edge at 0.778; a coder earns its keep only below the dashed line where the sum equals solo.

::: aside source Receipts
Coder 121: env-t0096. Baseline 1.0000: env-t0001. Coder 129 (no reference entries, dictionary share 0.01–0.04): 0.6863 on the layer screen, r25-t0003. Coder 109 (everything in the dictionary): 0.71884 on the head screen at 512 tokens, env-t0009. The trap: layer screen 0.6449 (coder 102, r11-t0002) against token screen 0.6461; token better by 0.0043 on 20 of 20 same-window sequences (spec §1.11, §1.6). Delta lengths 0.0003–0.0024: retro-review. All-dictionary 0.6705 with ≈1,490 reads: r1-t0068 (notes/04 §4). Budgets and their origin: `docs/spec/random-access.md` v1.1. Sampled maxima up to 26 % low: notes/01.
:::

::: figure fig-msr-curve msrCurve wide
**The compressibility square, with real points.** Horizontal axis: dictionary share, the dictionary's bytes over the block's raw bytes ($\vw/\vb$). Vertical axis: delta share, the mean delta over a raw entry ($\vrho$). The coordinates sum to the MDL ratio, so the grey diagonals are lines of constant ratio: solid at 1.0 the baseline, dashed at 0.778 solo coding, below which a dictionary pays. Dots: every verified record of both campaigns, coloured by entry split; hover for coder, screen, ratio and worst-entry reads. Ringed: coder 129, no reference entries and a dictionary of 1–4 % (0.6863 on the layer screen), and coder 109, every entry in the dictionary and empty deltas (0.7188 at 512 tokens on the head screen). Toggle C1 and C2; C1's points are layer 3, head 0 only.
:::

Two words label every point. The [[=entry-split]] is which elements of the tensor of [[#measured-the-data]] form one entry: **one head** (256 bytes), **one layer** with both heads (512 bytes), or **one token** across all six layers (3072 bytes); a setting of the test, not of the coder. A [[=screen]] is a fixed test cheap enough to run hundreds of times: an evenly spaced tenth of the blocks of the two development sequences of target 03 (names beginning `s-`), or of five sequences of target 02 (`st02n5-`), at one entry split, block size and read budget. Nearly every number in this Part is a screen.

::: note warning Two screens read different blocks
The layer screen read 0.6449 and the token screen 0.6461, so one-layer entries looked better; on exactly the same elements, one-token entries win by 0.0043 on 20 of 20 sequences, because the token screen had drawn blocks about 0.005 harder for every coder. Compare scores within one screen only. [[#measured-signal-or-noise]] tells the story; [[#measured-cutting-the-tensor]] ranks the splits properly.
:::

::: takeaway
- Dictionary share across, delta share up, sum = MDL ratio; baseline on the diagonal at 1, solo at 0.778, every verified record a dot.
- An entry split (head, layer or token) and a screen (a tenth of the blocks at one split, block size and budget) label every point. Never subtract two screens' scores.
:::

## The budget {#the-budget}

The first night began without the third rule, and the search found the hole within the hour.

At 10:15 UTC on 30 October the human clarified the goal: deployment is out of scope; explore the whole range of dictionary-versus-delta splits and find where the ratio is lowest. The ratio fell as entries moved into the dictionary and kept falling to the corner where *every* entry is in the dictionary and every delta is empty: 0.6705 at 4096 tokens, the best number of the night. That corner is ordinary stream compression of the block: to hand over one entry, the receiver decodes the block. The frontier coders already read half their dictionary for one cold entry, the all-dictionary coder about 1,490 entries' worth. [[#idea-data-layout]] had ruled exactly this out before any data existed.

At 11:00 UTC the human called the corner what it was, valid and useless for the scenario, and by 11:20 the third rule existed.

::: define read-budget read budget
- **What it is:** the most dictionary bytes a decoder may depend on, starting from nothing, to rebuild one entry, in units of a raw entry: **137**, **293** or **1103** entries' worth (the last only at 4096 tokens and above). It limits the *worst* entry, not the mean; re-reads count once; the entry's own delta is free.
- **Why these numbers:** primes the human chose; 137 is "a 128-entry codebook plus pointers", room for real shared structure and too small to unpack the block. The same at every block size by design, since a budget proportional to the block would let two serially compressed halves pass as "half the block".
- **Easy to confuse with:** a GPU memory budget. It models no deployment; it keeps the search out of the trivial corner.
:::

The rule was first stated on the mean; the human then set it on every single entry. Since 31 October the harness forks a fresh decoder for each entry, decodes it cold and records the distinct dictionary bytes it touched, then re-decodes a sample with every untouched byte scrambled, which must change nothing. The eight-entry samples used before had run up to 26 % below the true worst entry. Only rows carrying `every_entry: true`, like the one at the top of this page, prove that a coder keeps its budget.

::: theme access-pattern
The read budget is the access pattern of the miss path written as a rule a harness can check: one scattered entry, decoded cold, may lean on a bounded piece of the dictionary. It is the constraint that made [[#idea-data-layout]] reject stream codecs, with a number on it. What it cost the best coders, nothing at 4096 tokens and above, is the question of [[#measured-reading-one-entry]].
:::

::: takeaway
- Unfenced, the optimum slid to "every entry in the dictionary", 0.6705 at 4096 tokens: stream compression of the block, which the miss path cannot use.
- The read budget: to rebuild any one entry cold, touch at most 137, 293 or 1103 entries' worth of dictionary; primes, the same at every block size, counted for every single entry since 31 October.
:::
