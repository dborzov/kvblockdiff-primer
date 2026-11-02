# State of knowledge

What the site holds as established, measured, assumed or open, with the page that carries the evidence.
Update this file whenever a page changes a verdict. Grades follow Part XI: **verified** (every item rebuilt
bit for bit by a separate decoder), **forecast-only** (a code length computed from a probability model, no
coder built; the site currently says "exact model"), **bound**, **assumed**, **toy**.

## Established (outside results we rely on)

| claim | grade | where |
|---|---|---|
| Sparse-attention decoding re-picks mostly the same positions step to step; an LRU cache of raw pieces at 2× the pick size hits ≈ 87 % (HiSparse) | published, one trace | III.8, III.9, V.2 |
| HiSparse's per-layer resolve step and its costs: a miss = one raw piece on the link, a slot = one raw piece of GPU memory | published | III.6 |
| Context-free coding of BF16 KV is worth ≈ 0.76 of raw (SplitZip, exponent code) | published, not re-run | V.4 |
| Keys have outlier element positions; values do not (KIVI, KVQuant) | published, lossy context | V.7, V.8 |

## Measured here (Part XI, Qwen3.5-2B values, FP8, coding-agent transcripts)

| claim | grade | where |
|---|---|---|
| Solo coding: 0.778 of raw ideal over six layers; 0.804 with a real two-number coder | verified | XI.4 |
| Best per-group coder: 0.636 at 4096 positions, 0.630 on five sequences, 0.618 at 16K | verified | XI.1, XI.5 |
| Two kinds of structure: repeats (pointer tree; collapses under shuffle) and geometry (linear rule across element positions; survives shuffle, transfers 91–96 % between texts) | verified + forecast-only | XI.5 |
| Joining the two heads of a layer into one coding unit saves 0.032; joining six layers a further 0.004; joining adjacent positions loses 0.04–0.06 | same-window, not verified | XI.6 |
| Adjacent positions share ≈ 0.06 bit/element at the outer layers, ≈ 0.3 in the middle; pointers go to repeats of the same token far away | analysis | XI.4, XI.6 |
| Bigger groups always won; a whole-thread pool is 0.26–0.45 bit below 16K | verified + bound | XI.9, XI.13 |
| A tree coder's dictionary is ≈ half the group and must be resident (100–300 pieces' worth read per cold decode) | verified | XI.9, XI.13 |
| Dictionary share does not track shared information (+0.00004 when every delta is emptied); block redundancy ≈ 18–23 % of solo bits | verified + forecast-only | XII.1 |
| Codebooks (VQ) and fixed rotations (KLT) lost, for stated reasons (blur vs real copies; rounding tax) | verified | XI.7 |
| Pre-RoPE keys compress like values (C1, one head) | verified, narrow | XI.4 |

## Assumed (used in the arithmetic, not measured)

| assumption | where it is used | where it is flagged |
|---|---|---|
| The Pin's numbers (78 layers, $k$ = 2048, 100K context, 640 B pieces, 30 ms, 50 GB/s, 30 GB) and that 8-bit storage leaves miss rates unchanged | every tally | III.10, III.11 |
| The δ-miss fraction $f_D$ and the dictionary load rate; residency of groups under a real picker | IV.4, VI.15–17, XII.5 | XI.13, VIII.7 |
| The fixed-length (GPU-decodable) rate sits ≈ 1 bit/element above the entropy rate | VI.10, XI.13 | XI.13 |
| Ratios measured on a 2B LLM's values transfer to GLM-5.1's MLA latents | XI.13, XII.6 | XII.7 |
| The Bench's link (50 GB/s) and KV memory (10 GB) | XII.6 | XII.7 |

## Open questions (what a next campaign measures first)

1. The memory table on many windows (does the text's long memory set the floor?) — XI.10, XI.13.
2. A fixed-length or GPU-decodable variant of the light coder; the two-rates gap on real residuals — XI.13.
3. The miss-path replay under a stand-in picker: $f_D$, load rate, popularity of groups — VIII.7, IX.10–11.
4. A shared table for the geometry rule (0.6407 → 0.6326 forecast-only) — XI.10.
5. Keys in C2's setting; other kinds of text; blocks past 32K and whole threads — XI.13.

## Verdicts on the proposal's hypotheses

| hypothesis | verdict | where |
|---|---|---|
| Lucky Louis (picks repeat) | established; per-group concentration still unmeasured | III.8, IV.10 |
| Fallen-apple similarity (closer positions are cheaper) | wrong axis at the outer layers; weak in the middle; the right axis is repetition | XI.6, XI.12 |
| Upstairs similarity (adjacent layers alike) | small and not by adjacency; layers group by kind | XI.6 |
| Light dictionaries first | partly: the light coder reaches 0.686; the heavy twin tree reaches 0.636 but must be resident | XI.7, XI.13 |
| Block scope beats thread scope | inverted: the whole thread is the best scope | XI.9, XI.13 |
