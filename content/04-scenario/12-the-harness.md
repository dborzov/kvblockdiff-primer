---
title: 'The harness: the referee'
nav: The harness
group: The catalogue
lede: Two engineers each report that their compressor shrinks the orchard by 1.4×, and the numbers mean nothing next to each other. The harness is the referee that makes them mean the same thing.
cards:
  - q: Two people report "1.4× on 8-bit orchards". Which difference makes the claims impossible to compare?
    a: One charged the dictionary's bytes to the cherries that use it, the other did not
    wrong: ["One used Python, the other Rust", "One ran on keys first, the other on values first", "One printed the ratio, the other the bits per element"]
    why: A dictionary that is not paid for makes any compressor look good. The harness charges every byte by one rule, so the numbers mean the same thing.
    sec: unfair
  - q: What does the harness check about a compressor's decompress?
    a: That every cherry of every punnet comes back bit for bit from its own delta and the dictionary alone, in a separate decoder-only process, with its reads counted
    wrong: ["That the mean error is below one FP8 step", "That a sample of eight cherries per punnet decodes correctly", "That the dictionary is smaller than the deltas"]
    why: That is what "verified" means. A quick trial skips the separate process and can never hold a record.
    sec: what-it-checks
  - q: What must happen to a gain under the shuffle control?
    a: It must vanish, if it came from neighbours being neighbours
    wrong: ["It must double", "It must stay the same", "It must become negative"]
    why: Shuffling tokens across sequences destroys every neighbourhood. A gain that survives the shuffle was never about neighbours; it is a bug or a global property.
    sec: controls
---

Over coffee it comes out that the first engineer counted the bytes of her dictionary and the second forgot his; that the first fit her dictionary on one punnet and scored the same punnet, while the second fit his on a separate corpus; that the first rebuilt every cherry and compared it bit by bit, and the second "checked a few, they looked right". Both numbers are honest. Neither means anything next to the other.

## Three ways to win unfairly {#unfair}

Every comparison of compressors can go wrong in three ways, and the two engineers show all of them.

1. **Forget a bill.** A dictionary, a codebook index, an escape list: every piece of [[side-information|side information]] costs bytes. Leave one out and the rate looks better than it is.
2. **Peek at the answer.** A dictionary fit on the very punnet it then codes has a head start it is entitled to only in stretch scope, where it is charged in full. A global dictionary fit on the evaluation sequences is cheating outright.
3. **Lose a bit.** A compressor that rebuilds "almost" the original is [[lossy]], however small the error.

::: define harness
- **What it is.** The program every compressor runs through. It owns the contract check, the byte counting, the leash measurement, the pairing of scores on the same punnets, the controls, and the ledger of every trial. Compressors own only their own two functions.
- **Example.** The campaigns' harness (`kvcr`, in the experiment repository): a daemon that queues jobs, forks a fresh decoder per cherry, records every trial as a JSON line no agent may edit, and grades each trial against the incumbent on the same punnets.
- **Easy to confuse with** a compressor (the harness codes nothing) and with the serving system (it never touches a GPU after the orchard is dumped).
:::

::: takeaway
- Compressors are compared unfairly in three ways: a forgotten bill, a peek at the answer, a lost bit.
- The harness rules out all three, once, for every compressor.
:::

## What it checks {#what-it-checks}

Here is one row of the campaigns' ledger, abridged into plain words. Every field is a rule.

```json one trial, as the ledger recorded it (env-t0096, 31 October 2026, 06:12 UTC)
{"id": "env-t0096", "compressor": "121-stack-rows",
 "scenario": "V · all · cherry (2, 256) · stretch 4096 · leash 293 (screen)",
 "mdl_ratio": 0.63639, "dictionary_share": 0.5247, "delta_share": 0.1116,
 "punnets": 72, "cherries": 294912,
 "verification": {"isolated": true},
 "reads": {"mean": 120.4, "p99": 184, "max": 225.8, "every_cherry": true}}
```

- **The contract, per cherry, in a fresh process.** A score is a [[=verified-result|verified result]] only if every cherry of every punnet was rebuilt bit for bit by a separate decoder-only process from the stored bytes alone. A trial that skipped this pass is a *quick* trial and can never hold a record; a number computed from a probability table without building the compressor is a [[code-length-estimate]]; a bound is a bound.
- **The leash, per cherry.** Each cold decode's distinct dictionary reads are recorded; a sample with every untouched byte scrambled must decode identically. Only rows with `every_cherry: true` prove a compressor keeps its leash ([[#scenario-the-leash]]).
- **The bill, by one rule.** Dictionary bytes plus delta bytes over raw bytes, nothing else, for everyone ([[#scenario-the-score]]).
- **Paired scores.** A trial is graded against the incumbent on exactly the same punnets, per sequence; a new record needs to win on all of them or pass a paired test on five or more sequences ([[#measured-signal-or-noise]]).
- **The ledger.** One append-only line per trial, machine-written. Everything in Part VIII traces to a ledger row or says what grade it has instead.

The first plan of this project sketched a harness of three methods (`fit`, `encode`, `decode`) that let the harness choose the fitting set to control scope ([[#scenario-scope]]). The real harness has one contract, `compress` and `decompress`, with scope fixed at the stretch and the dictionary opaque; sequence scope is a stretch as long as the sequence, and global scope is a separate calibration run. The sketch survives as `analysis/plan_harness.py`, a few hundred lines of numpy that Part V quotes.

::: takeaway
- Verified means every cherry rebuilt in a separate process with its reads counted; everything else carries a lesser grade.
- One bill, paired scores, an append-only ledger.
:::

## Controls {#controls}

A referee also runs the tests that would expose a mistake before anyone believes a result.

- **The round trip** is the control nobody can argue with: the baseline compressor (number 01) only moves a fixed share of each cherry into the dictionary, so its two shares must sum to 1.0000 exactly, and did.
- **The [[=shuffle-control|shuffle control]]**: rerun the measurement after shuffling tokens across sequences. Any gain that depends on neighbours being neighbours must vanish; a gain that survives was never about neighbours. The campaigns' echo-driven compressors lose almost everything under the shuffle, as they should ([[#measured-two-kinds-of-structure]]).
- **Synthetic punnets with a known answer**: data generated with a planted structure and a known entropy; the compressor must find the structure and no more ([[#toolbox-rehearsal]]).
- **The scope identity**: sequence scope run as one long stretch must equal stretch scope with `stretch_len = n_tokens`, to the bit.

::: theme controls
The harness is where "trust, but shuffle" becomes a program. Every finding of Part VIII that lacks one of these controls says so on its page.
:::

::: takeaway
- Round trip, shuffle, synthetic punnets, the scope identity: built before any real data, run on every claim.
:::
