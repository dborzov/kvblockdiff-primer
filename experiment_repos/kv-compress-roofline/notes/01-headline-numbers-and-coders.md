# Headline numbers and coders of kv-compress-roofline, checked against the ledgers

Fact-check of the C1 (night of 2026-10-29/30) and C2 (2026-10-30) campaigns in `/attic/d/kv-compress-roofline`, done 2026-10-31 read-only. Every number below was read from the raw ledgers `research/agents/<id>/ledger.jsonl` (one JSON per line; 387 lines, 777 track-rows across 27 agents), from the iteration pages or from the coders' own `README.md` / `algorithm.toml`. Nothing was re-run.

Vocabulary (docs/concepts/terminology.md): an *entry* is what the receiver asks for (`head` = 256 bytes, one KV head of one token at one layer; `layer` = 512 bytes, both heads; `token` = 3072 bytes, all six recorded layers). A *block* is a range of 512 / 4096 / 16384 token positions of one sequence. The *MDL ratio* = (dictionary bytes + all delta bytes) / raw bytes; `x` = dictionary share, `y` = delta share. *Reads* = how many bytes of the dictionary one cold decode of one entry depends on, in units of one entry. A *screen* (prefix `s-`) is an evenly spaced tenth of the blocks on 2 sequences of `03_smoketest`; `st02n5-` is the same on 5 sequences of `02_qwen`.

How a ledger row says "verified": `tracks.<track>.verification = {"in_process": "full", "isolated": true}` means every entry of every block was decoded alone, bit-exactly, in a decoder-only subprocess from the stored bytes (`src/kvcr/harness/isolated.py`). `quick: true` rows skip that pass and get status `unmeasured`. Since the harness change of 2026-10-31 (`dict_reads.every_entry: true`) the read count is measured for every entry: a never-decoding template child is forked once per entry and the forked copy decodes cold and records the distinct dictionary bytes it touched; 8 entries per block (`cold_samples`) are additionally decoded cold in a fresh child, then again with every unread dictionary byte scrambled, and the two counts must agree. Older rows have `every_entry: null`: there the mean / max reads were over 8 sampled entries per block.

---

## A. "Where the day ended" table (articles/index.md; same table with reads in article 06)

Claim (research/agents/env/pages/articles/index.md, "Where the day ended"; article 06, "The table has every entry counted"):

| entry split, block | best verified MDL | coder | sequences |
|---|---|---|---|
| head, 4096 | 0.67408 | 126 | 2 of 03_smoketest |
| layer, 4096 | 0.63639 | 121 | 2 of 03_smoketest |
| layer, 4096 | 0.62970 | 121 | 5 of 02_qwen |
| token, 4096 | 0.63879 | 116 | 2 of 03_smoketest |
| token, 4096 | 0.62910 | 116 | 5 of 02_qwen |
| layer, 16384 | 0.61768 | 120 | 2 of 03_smoketest |
| layer, 512 | 0.68938 | 113 | 2 of 03_smoketest |

Evidence, all from `research/agents/env/ledger.jsonl`. The re-measurement rows (note: "the read budget limits every single entry: re-measured over every entry") are the ones the articles cite; each has an earlier, byte-identical original trial whose reads were sampled. All rows: `kind: eval`, `quick: false`, `status: ok`, `verification.in_process: "full"`, `verification.isolated: true`, `gates.ok: true`, `dict_reads.every_entry: true`.

| track | re-measured trial (time UTC) | score | x / y | blocks / entries | per-sequence ratio | reads mean / p99 / max (entries) | original trial, sampled max reads |
|---|---|---|---|---|---|---|---|
| `s-head-b4k-r293`, coder 126-path-factors | env-t0011 (10-31 01:46) | 0.6740774 | 0.5437 / 0.1304 | 120 / 491,520 | 0000: 0.67488, 0001: 0.67327 | 67.95 / 123 / 171.10 | r20-t0002 (10-30 20:00), same score, grade better-all-dev, sampled max 137.0 |
| `s-layer-b4k-r293`, 121-stack-rows | env-t0096 (10-31 06:12) | 0.6363904 | 0.5247 / 0.1116 | 72 / 294,912 | 0000: 0.64310, 0001: 0.62968 | 120.36 / 184 / 225.80 | env-t0007 (10-30 20:55), same score, better-all-dev vs r22-t0005 (115), sampled max 211.5 |
| `st02n5-layer-b4k-r293`, 121 | env-t0096 | 0.6296971 | 0.5170 / 0.1127 | 182 / 745,472 | 0000: 0.64140, 0001: 0.62464, 0002: 0.63118, 0003: 0.62817, 0004: 0.62310 | 119.71 / 182 / 247.23 | env-t0007, same score, grade better-t95 vs r24-t0002 (102), sampled max 235.9 |
| `s-token-b4k-r293`, 116-token-sets | env-t0093 (10-31 04:34) | 0.6387929 | 0.5172 / 0.1216 | 24 / 98,304 | 0000: 0.64409, 0001: 0.63349 | 88.72 / 114 / 132.29 | r18-t0001 (10-30 19:37), same score, better-all-dev, sampled max 111.9 |
| `st02n5-token-b4k-r293`, 116 | env-t0093 | 0.6291048 | 0.5059 / 0.1232 | 30 / 122,880 | 0000: 0.64194, 0001: 0.63021, 0002: 0.62079, 0003: 0.62524, 0004: 0.62734 | 90.41 / 120 / 135.65 | env-t0006 (10-30 20:51), same score, better-t95, sampled max 131.4 |
| `s-layer-b16k-r293`, 120-big-stack | env-t0097 (10-31 06:38) | 0.6176759 | 0.4939 / 0.1238 | 36 / 589,824 | 0000: 0.62206, 0001: 0.61329 | 141.03 / 190 / 229.35 | env-t0005 (10-30 20:38), same score, better-all-dev, sampled max 218.3 |
| `s-layer-b512-r293`, 113-free-stack | env-t0010 (10-31 01:34) | 0.6893768 | 0.4299 / 0.2595 | 180 / 92,160 | 0000: 0.69289, 0001: 0.68587 | 159.05 / 249 / 257.24 | r21-t0001 (10-30 19:01), same score, better-all-dev, sampled max 257.2 |

The scores and the reads columns of article 06's table match the ledger to the last printed digit (the article rounds `max_entries`, which is a float, e.g. 171.10 to 171; the p99 values are histogram percentiles in whole entries). The `cold_samples` field is 8 per block (e.g. 1,920 for 240 blocks), the cross-check sample described above; `samples` equals `n_entries`, which is what `every_entry: true` means.

Verdict: **CONFIRMED** for every row.

Caveats:
- Every row is a *screen*: an evenly spaced subset of blocks (`max_blocks` 72 for `s-layer-b4k`, 182 for `st02n5-layer-b4k`: "1/9 of the blocks" per the track description in `research/campaign.toml`). None is a full track, none has a holdout score (C2 has no `kind: score` rows for these tracks).
- "2 of 03_smoketest" means sequences 0000 and 0001, the dev split; "5 of 02_qwen" means 0000 to 0004. Sequences are the independent samples; with 2 the spread cannot be estimated, with 5 the paired t-test is used.
- In the re-measured rows the grade is mostly `baseline` because the track hash changed with the rule change (a new hash has no incumbent). The 121 row on `s-layer-b4k-r293` grades `better-all-dev` against env-t0013 (coder 100-chain-path at 0.64879, which had been re-measured first).
- The true worst entry reads 1.0 to 1.25 times the sampled maximum used before 2026-10-31 (171 vs 137 for 126; 226 vs 212 for 121); all seven rows still fit `r293`. Coder 124 (r21-t0003) scored lower at 512 tokens (0.68526 `layer`, 0.70568 `head`) but its sampled max was already 389 / 402, so it never fit the rule; that is why 113 and 109 hold the 512 rows.
- `x` is around 0.5 for all tree coders: more than half of the bytes are in the dictionary. See F for why that is bookkeeping.

---

## B. The no-compression reference and the "solo" (order-0) baseline

### B1. 01-baseline scores exactly 1.0

Evidence: env-t0001 (`research/agents/env/ledger.jsonl`, 2026-10-30T02:35:37Z, campaign C1, `reference: true`, params `{"perc": 0}`): on all four C1 tracks (`v-l3h0-bf16-b512`, `v-l3h0-bf16-b4k`, `v-l3h0-fp8-b512`, `v-l3h0-fp8-b4k`) `score: 1.0`, `x: 0.0`, `y: 1.0`, both sequences 1.0, 890 / 110 blocks, 455,680 / 450,560 entries, isolated true. The coder (`algorithms/01-baseline/README.md`) copies the first `perc` % of each entry's bytes into the dictionary and the rest into the delta, so `x + y = 1` exactly by construction; `perc = 0` is "everything in the delta".

Verdict: **CONFIRMED.** Caveat: this is a self-test of the accounting, not a measurement of the data.

### B2. The solo / order-0 baseline: 0.804 vs 0.7999 at 4k

Where stated: `research/READER-2026-10-30.md` line 35 ("per-value statistics: order-0 rANS with per-block parametric (logistic) tables ... saturates at solo: 0.804 vs 0.7999 at 4k"); `research/MORNING.md` lines 65-66 ("solo (per-channel order-0) 0.7999; order-0 coder 0.8039"); `research/c1/KNOWLEDGE.md` [data/landmarks].

What "solo" means in this repo: the *landmark* `solo_ratio` recorded on every C1 ledger row is the mean per-elephant-line order-0 entropy of the stored bytes within each block divided by 8. It is an ideal, not a coder: the entropy of a per-block, per-line histogram with the histogram itself uncharged. On `v-l3h0-fp8-b4k` it is 0.79989 (h0 6.3991 bits), on `v-l3h0-fp8-b512` 0.79992 (`landmark` field of env-t0001). On the C2 six-layer screens it is lower: `s-layer-b4k-r293` / `s-head-b4k-r293` / `s-token-b4k-r293` solo_ratio 0.77811 (6.2249 bits), `st02n5-layer-b4k-r293` 0.77695.

Real coders with no dictionary structure beyond per-block per-line statistics (fp8, V L3 h0, 2 dev sequences, isolated true, from `research/c1/REPORT.md` and the r1/r2/r3 ledgers):

| coder | what the dictionary holds | trial | b=512 | b=4k | x at 4k |
|---|---|---|---|---|---|
| 09-blockstats-logistic-tail | 2 bytes per elephant line: a quantised logistic (location, scale); one rANS stream per entry; last line stored raw to avoid rANS warm-up | r1-t0005 | 0.80452 | **0.80385** | 0.0005 |
| 07-blockstats-logistic | same model, plain rANS | r1-t0002 | 0.80687 | 0.80633 | 0.0005 |
| 08-selfanchor-mixrans16, k=0 | per-line mixture tables, no anchors | r3-t0006 | 0.81370 | 0.81136 | 0.0007 |
| 05-se-split-rans | sign/exponent split with logistic tables | r2-t0013 | 0.81977 | 0.81551 | 0.0010 |
| 13-solo-rans-cached (= 03-solo-rans bytes) | the actual per-line histograms, log-quantised, as a model blob; one rANS stream per entry | r1-t0006 | 0.90720 | 0.81834 | 0.0195 (0.1368 at 512) |
| 02-stdlib-deflate | nothing (zlib on the deltas) | r2-t0008 | 0.90877 | 0.90877 | 0 |

So the "0.804" is coder 09 at 4k (0.80385, rounded 0.8039 in MORNING.md and READER.md, 0.804 in the table) against the 0.7999 landmark. The true per-block-histogram coder (03/13) is worse because the histograms cost 0.02 of raw at 4k and 0.14 at 512; the 2-byte parametric logistic nearly reaches the ideal. The coders named "solo-rans" (03, 13) are the literal order-0 rANS coders; 07 and 09 are the order-0 coders that actually come within 0.004 of the landmark.

Verdict: **CONFIRMED** (0.80385 vs 0.79989 at 4k; 0.80452 vs 0.79992 at 512).

### B3. The kv-blockdiff proposal's literature guess, 0.78 to 0.88

Where stated: in this primer repo, `content/08-questions/06-framework-b.md` and `content/08-questions/03-q2.md` ("solo coding at (0, ≈ 0.78) with an ideal coder, (0, ≈ 0.88) fixed-length"), `content/10-reference/01-summary.md`; the repo's own `algorithms/01-baseline/README.md` repeats it ("the solo-coding landmark near (0, 0.78) ideal / (0, 0.88) fixed-length").

Measured: the ideal (landmark) is 0.7999 on V L3 h0 and 0.778 on all six layers of V (the `s-*-b4k` screens); the best real order-0 coder is 0.804 on L3 h0. Both fall inside 0.78 to 0.88. The "0.88 fixed-length" end (a 7-bit code) was never built as a coder; the nearest thing, zlib on the raw bytes, scored 0.909. Layer 23 alone has a much lower solo (0.65, `research/c1/KNOWLEDGE.md` [data/landmarks]; MORNING.md line 98) and L15/L19 higher (0.814 / 0.819), so "0.78 ideal" is right for the whole V and a bit optimistic for a single early layer.

Verdict: **CONFIRMED** (0.78 ideal matches the six-layer landmark 0.778 almost exactly; 0.80 to 0.804 for L3 h0; all within the stated range).

---

## C. The C2 ladder on `s-layer-b4k-r293` (article 02)

Claim: the ladder 71 → 74 → 80 → 89 → 102 → 111 → 114 → (126) → 115 → 121 on one screen; "linear prediction moved the layer screen from 0.690 to about 0.645. A day of refinements then took it to 0.636"; "121 reads 0.62970 against 102's 0.63848: −0.0088 on every sequence, with a spread of about 0.0001. It pays with more reads, 120 against 103."

Evidence (all on track `s-layer-b4k-r293`, 72 blocks, 294,912 entries, sequences 0000 and 0001; `quick: false`, `isolated: true`, status ok unless noted). The figure `fig-02-ladder.svg` labels match these to four decimals:

| step | coder | trial (agent ledger) | score | x / y | per-seq 0000 / 0001 | grade at the time | reads mean (sampled) |
|---|---|---|---|---|---|---|---|
| no prediction | 71-xhead-phased, `xmap_k=0` (control) | r7-t0002 | 0.69018 | 0.441 / 0.249 | 0.69644 / 0.68392 | baseline | 39.0 |
| 71 | 71, `xmap_k=16` | r7-t0001 | 0.67746 | 0.434 / 0.243 | 0.68376 / 0.67115 | baseline | 54.4 |
| 74 | 74-xhead-omp | r7-t0003 | 0.66641 | 0.429 / 0.238 | 0.67296 / 0.65986 | better-all-dev vs r7-t0001 | 67.4 |
| 80 | 80-sparse-rows-ols | r11-t0001 | 0.65620 | 0.425 / 0.231 | 0.66278 / 0.64961 | better-all-dev | 97.3 |
| 89 | 89-rows-gaps | r11-t0003 | 0.64704 | 0.420 / 0.228 | 0.65372 / 0.64036 | better-all-dev | 102.2 |
| 102 | 102-path-rows | r11-t0002 | 0.64494 | 0.528 / 0.117 | 0.65165 / 0.63823 | better-all-dev vs r11-t0001 | 100.9 |
| 111 | 111-metric-rows | r22-t0001 | 0.64352 | 0.519 / 0.124 | 0.65030 / 0.63674 | below-mdi vs r11-t0002 | 99.3 |
| 114 | 114-rdo-rows | r22-t0003 | 0.64167 | 0.517 / 0.125 | 0.64846 / 0.63488 | better-all-dev vs r11-t0002 | 89.9 |
| 126 | 126-path-factors | r20-t0001 | 0.64074 | 0.524 / 0.117 | 0.64755 / 0.63393 | below-mdi vs r22-t0003 | 101.0 |
| 115 | 115-order-rows | r22-t0005 | 0.64003 | 0.516 / 0.125 | 0.64680 / 0.63327 | better-all-dev vs r11-t0002 | 87.2 |
| 121 | 121-stack-rows | env-t0007, env-t0096 | 0.63639 | 0.525 / 0.112 | 0.64310 / 0.62968 | better-all-dev vs r22-t0005 | 120.7 (every entry: 120.4, max 225.8) |

Notes on the ladder's provenance: 115's first trial r22-t0002 came back `lossy` (`isolated: false`: the isolated pass failed); r22-t0005 is the clean re-run with the identical score. 121's own trial r22-t0004 was `quick: true` (status `unmeasured`, same score); the supervisor verified it as env-t0007 at 20:55 UTC and re-measured it as env-t0096. The grades `below-mdi` on 111 and 126 come from the C1-style fixed detection limit (0.002) that was still in force when they ran; `research/campaign.toml` now sets `mdi = 0.0`.

"0.690 to about 0.645": 0.69018 (71 with the map off) to 0.64494 (102). "Then to 0.636": 0.63639 (121). Confirmed.

121 vs 102 on `st02n5-layer-b4k-r293` (182 blocks, 745,472 entries, 5 sequences): 121 = env-t0096 0.6296971 (per sequence 0.64140, 0.62464, 0.63118, 0.62817, 0.62310); 102 = r24-t0002 (2026-10-30T18:32, isolated true, grade better-t95 vs r12-t0007 coder 89) 0.6384805 (per sequence 0.65023, 0.63351, 0.63979, 0.63691, 0.63196). Paired differences from the `per_sequence` fields: −0.00883, −0.00887, −0.00861, −0.00874, −0.00886; mean −0.00878, sample SD 0.00011. Reads: 121 mean 119.7 (every entry), 102 mean 102.9 (sampled, r24-t0002).

Verdict: **CONFIRMED** in full.

Caveats: the ladder is on 2 sequences, 72 blocks, and each step was measured on top of the previous one in historical order (article 02 says so itself). 126 is a side branch off 102, not a rung under 115/121. The ladder's scores are pre-rule rows with sampled reads; only 121 has an every-entry read count.

---

## D. C1 progression: 0.8039 → 0.6731 at 4k, and 0.7237 / 0.6731 / 0.6416 / 0.6294 at 512 / 4k / 16k / 32k

Where stated: `research/READER-2026-10-30.md` line 37 and line 70; `research/MORNING.md` lines 25, 55-58, 80; `research/c1/KNOWLEDGE.md` [sim/scale] table and the frontier section; `algorithms/50-fast-lean-big/README.md`.

Evidence (campaign C1, fp8 V layer 3 head 0 only, `head` entries of 256 bytes, dev sequences 0000 and 0001 of `03_smoketest`, isolated true, `quick: false`, status ok):

| number | trial | coder, params | track | score | x / y | blocks / entries | per-seq |
|---|---|---|---|---|---|---|---|
| 0.8039 | r1-t0005 | 09-blockstats-logistic-tail | v-l3h0-fp8-b4k | 0.80385 | 0.0005 / 0.8034 | 110 / 450,560 | 0.80405 / 0.80365 |
| 0.6731 | r1-t0042 | 34-mst-anchors, k=1 | v-l3h0-fp8-b4k | 0.67309 | 0.4061 / 0.2670 | 110 / 450,560 | 0.67404 / 0.67213 (grade better-all-dev vs 30) |
| 0.7237 | r1-t0045 | 37-lean-tables, k=1 | v-l3h0-fp8-b512 | 0.72372 | 0.3987 / 0.3251 | 890 / 455,680 | 0.72631 / 0.72114 (better-all-dev vs 34's 0.72780) |
| 0.6416 | r4-t0008 | 50-fast-lean-big, k=1, select=mst | v-l3h0-fp8-b16k | 0.64157 | 0.3979 / 0.2437 | 26 / 425,984 | 0.64111 / 0.64204 (better-all-dev vs 36 k=2) |
| 0.6294 | r4-t0008 | same | v-l3h0-fp8-b32k | 0.62939 | 0.3918 / 0.2376 | 12 / 393,216 | 0.62706 / 0.63173 (better-all-dev vs 46 k=2) |

Holdout (sequence 0002, `kind: score`): r4-t0013 0.64127 at 16k and 0.63360 at 32k (holdout-better); r1-t0069 (coder 43) 0.70430 / 0.65965 at 512 / 4k.

Verdict: **CONFIRMED.** Every quoted number has a ledger row, isolated-verified, within rounding.

Caveats, and one thing a reader should know:
- These four are the *MST-anchor family at x ≈ 0.40* (coders 34 / 37 / 50 with `select = mst`), chosen in the notebook because the family spans all block sizes. They are **not** C1's final incumbents. The C1 report (`research/c1/REPORT.md`, generated from the ledgers) lists lower incumbents on the same tracks: 43-fast-lean `select=even, k=1` at 0.72095 (512) and 0.67048 (4k), r1-t0068; 50-fast-lean-big `select=even` at 0.63842 (16k) and 0.62642 (32k), r4-t0019. Those put every entry in the dictionary (x = MDL, y = 0.0000), which C1 then regarded as serialized whole-block coding needing about 1,490 reads per entry; C2's path layouts later made that end legal (see F). So "0.6731 at 4k" is the honest end of the C1 *story*, and 0.6705 is the lowest C1 ledger number on that track.
- At 4k the 512-token winner 37 scores 0.67253, slightly below 34's 0.67309 (grade below-mdi at the time); the notebooks quote 34 for 4k and 37 for 512.
- No C1 track in this list had a read budget; C1's campaign file kept `read_limit = "mean"` and its budgeted tracks (`-r137` etc.) never got an incumbent. The C1 `mdi = 0.002` detection limit applied to grades.
- 16k and 32k rest on 26 and 12 blocks (full blocks only; a 228k-token sequence yields 13 / 6 blocks of 16k / 32k).
- One layer, one head: the C2 articles' numbers for `head` at 4k (0.674, six layers) are not comparable to 0.6731 (layer 3 only, which is the easiest "token" layer besides L23).

---

## E. What the top coders actually do, in plain words

Sources: each coder's `algorithms/NN-*/README.md` and `algorithm.toml` (the `description` fields chain back through the forks), plus `research/READER-2026-10-30.md` §3 and the terminology file. The repo's own words for the pieces: a **reference** is an earlier entry of the same block that a coder predicts the current entry from; the **tree** is the set of links from every entry to its reference; **linear prediction** (the retired word "map") guesses a value from values already decoded in the same entry as a weighted sum; **rANS** is the entropy coder (it turns a sequence of symbols with known probabilities into close to the ideal number of bits, like arithmetic coding, and can be read back one symbol at a time); **logistic** is the bell-shaped probability curve the coders put over the predicted value, so values near the prediction cost few bits and far values cost many.

**01-baseline.** Not a compressor. It cuts every entry at a fixed fraction: the first `perc` % of its bytes go into the dictionary, the rest into the delta, byte for byte. Dictionary plus deltas always equal the raw size exactly, so it draws the line `x + y = 1` that any real coder must get under. It is in the ledger (env-t0001) to prove the accounting adds up.

**The solo / order-0 coders (03/13-solo-rans, 07/09-blockstats-logistic).** No references, no tree, nothing shared between entries except statistics. For each of the 256 (or 512) positions in an entry, the encoder looks at all 4096 values at that position in the block and summarises how they are distributed; the dictionary is that summary, the delta is the entry's own rANS stream with each byte coded under the summary for its position. 03 and 13 store the literal histogram of each position (log-quantised), which is expensive at small blocks (14 % of raw at 512 tokens) and still 2 % at 4k, so they lose. 07 and 09 instead fit a two-number logistic curve per position (a centre and a width, one byte each), which costs almost nothing and comes within 0.004 of the ideal per-position entropy (0.80385 vs 0.7999). 09 adds one trick: the last position of the entry is stored raw inside the rANS start state, which removes the coder's start-up waste. Everything these coders achieve is "per-value statistics"; the rest of the campaign is about what they miss, which is that whole entries repeat.

**50-fast-lean-big (= 43 = 37 = 34 at any block size: the C1 frontier).** The idea: in a block of 4096 tokens many V vectors are near-copies of earlier ones (the same token or phrase again). The encoder measures the distance between every pair of entries and builds the block's minimum spanning tree: a tree in which every entry hangs off the entry it is most similar to. Entries that have children in that tree ("anchors", the internal nodes, about 56-59 % of the entries at L3) go into the dictionary; they are coded one after another, each predicted from its own parent, as rANS streams grouped by tree level. Every other entry (a leaf) gets a delta: a small header naming its parent and a "match quality" class (8 classes), then an rANS stream in which each of its 256 bytes is coded under a logistic curve centred on the parent's value at that position, pulled a bit toward the block mean or toward an exact copy depending on the class, with a per-position width scaled by the class. The per-position parameters (centre, slope, widths) are 4 small tables, themselves rANS-coded ("lean tables"). 50 is 43's byte-identical twin that computes the tree row by row so 16k and 32k blocks fit in memory. Its deltas are about 0.27 of the raw size, its dictionary 0.40.

**62-xhead-big (C1's best for both heads of a layer, 512 bytes per entry).** The same tree coder, on entries that join both KV heads of a token, plus two additions. "Neighbour": the mean of the anchors adjacent in position is a second, free input to the prediction. "Cross-head map": for each position in head 1, the encoder chooses the 32 positions of head 0 whose deviations from the reference best predict head 1's deviation, and stores those indices and weights per block (65 bytes per head-1 position); the decoder decodes head 0 first and uses it to sharpen the prediction of head 1. The block is encoded with and without the map and the smaller is kept (one flag byte). 62 is a speed twin (certified fast tree building at width 512). This was the first coder to show that one head predicts the other.

**102-path-rows (C2's workhorse; the parent of 111, 114, 115, 121, 126, 112, 116).** Three things on top of the tree coder. (1) *Path streams* (from r6's 72/78): instead of grouping anchors by tree level, the anchors along one path from the root share one rANS stream, written root-end first; to decode one entry the receiver reads only the streams on its own root path, which is why one cold decode touches about 100 entries' worth of dictionary instead of 870 (`[ra/path]`). (2) *Sparse triangular linear prediction* (from r11's 89): the positions of the entry are put in an order (Chow-Liu, a statistical ordering), and for each position the encoder picks a handful of earlier positions and weights such that `value[j] ≈ reference[j] + Σ w · (value[i] − reference[i])`; the choice stops when another term no longer saves more bits than it costs to store. The table of chosen terms and weights is in the dictionary and is read whole by every decode; it is this table that article 02 calls "the geometry the LLM's weights fix". (3) Parents coded as Rice-coded gaps. Each anchor's prediction error is coded under a logistic over the FP8 cell. About 80 % of entries are anchors inside the dictionary and have an empty delta; the rest have deltas of 0.5 to 0.75 of an entry (see F).

**116-token-sets (best on `token` entries, 3072 bytes = all six layers of a token).** Built from 102 by way of 94 and 112. The six layers are not given one tree each: r8 found that grouping layers 7-11-15 and 19-23 into shared trees (and layer 3 alone) is better, because the middle layers repeat along the text in the same places. Each tree is coded like 102, with one linear-prediction table over all the positions of its group, so a value in layer 15 can be predicted from decoded values of layers 7 and 11 of the same token as well as from its reference. 116's own contribution is making the table cheaper to store: parent pointers are coded with an adaptive binary code whose contexts come from the layout (4.5 bits a term instead of 5.4), weights are rounded by the bits each rounding costs (from 114) and coded under one shared table, and positions stay in their natural order. Its deltas are extreme: median 9 bytes, 90th percentile 1,106 bytes of 3,072 (ledger `delta_size` of env-t0093), because an entry's delta holds whichever of its three trees' parts are leaves.

**121-stack-rows (best on `layer` entries at 4k; r22).** 102 with every decision refit jointly. The tree is no longer built on raw distance but on distance *after* linear prediction, scaled by the predicted width (111), and chosen as a minimum arborescence priced in exact bits rather than a plain spanning tree (118). Positions are coded in natural order, all of head 0 first and then head 1, so no ordering table is stored, unless Chow-Liu order wins on real bytes (115). Every earlier position is a candidate term; rate-aware rounding of the weights decides how many survive, then the slopes and widths are refit to the rounded table and rounded again (114, 121). The slope that pulls a prediction toward the reference is refit by generalised least squares using the prediction's own precision ("gls"). Parent and class fields use r6's Huffman records. On `s-layer-b4k-r293` it is 0.0088 below 102 on every sequence of `02_qwen`; its price is reads (mean 120 vs 103) and about 55 CPU seconds of encoding per block.

**120-big-stack (best at 16k; r19).** 115's model (the jointly fitted tree and prediction table, without 121's last refinements) on 110's layout, which is 103's: the tree is rooted at its median node so chains are shorter, parents and classes are Huffman-coded, and the tree is built by a certified fast Prim's algorithm so a 16k block does not take three minutes. The 16k score 0.61768 on 36 blocks is the lowest verified number of the campaign and comes from block size, not from a new model: `[big/anatomy]` says everything other than the values themselves is about 2 % of the ratio at 16k.

**126-path-factors (best on `head` entries at 4k; r20).** 102 plus a free second-stage prediction. After the linear prediction, an entry's remaining error at each position is predicted from the remaining errors of its nearest ancestors on the tree path, which the decoder has already read; the blending coefficients are not stored but inferred on the fly, position by position, by recursive least squares inside the decoder, in both encoder and decoder identically. Nothing is added to the dictionary or the delta; it saves 0.0042 on the layer screen against 102 (r20-t0001) and holds the head screen at 0.67408 (r20-t0002, env-t0011).

**129-pure-wls (the control: no tree; r25).** The "wire codec" of the user's close-enough site rebuilt as a real coder. Dictionary: per position a mean and an innovation width, four entry classes, and a sparse triangular linear-prediction table over the whole entry (forward selection with an MDL stop, refit with class weights). Delta: one range-coded stream per entry, each value coded under a logistic centred on `mean + Σ w · (decoded earlier values − their means)`. No reference, no tree: `x` is only 0.02 to 0.04. It reaches 0.6863 on `s-layer-b4k` against 102's 0.6449 (paired 0.041 worse, 14 of 14 segments), and is the incumbent only on the `triple` and `column` splits where nobody ran a tree coder. It shows how much of the gain is linear prediction alone (from the six-layer solo ideal 0.778 to 0.7348 on `head` and 0.6863 on `layer`, r25-t0003) and how much needs the repeats (the tree: a further 0.041 to 0.057 on the same screens).

**113-free-stack (best at 512 tokens on `layer`; r21).** At 512 tokens a block cannot pay for a full prediction table, so 113 pays for a small one and learns the rest. Stage one: 102's sparse paid rows, fit on all coded rows, stored in the dictionary. Stage two: a dense ridge-regression predictor that *both* encoder and decoder fit on the already-decoded anchors (in tiers: a quarter of the anchors trains the model for the next quarter, and so on), applied to the residuals of stage one; no weights and no scale table are sent. The entry's own width adapts as it is decoded. On `s-layer-b512-r293` it scores 0.68938 against 0.6960 for the best fully paid model (r21 page iter-1-2). Its worst entry reads 257 of the 293 budget, the tightest fit in table A.

---

## F. "x stopped mattering for tree coders" and "about 80 % of coder 102's deltas are empty"

Where stated: article 06 ("moving more entries into the dictionary took x from 0.56 to 1.00 for +0.00004 (coder 101 against 91) ... It also explains why about 80 % of coder 102's deltas are empty"); `research/KNOWLEDGE.md` [ra/split], [ra/delta-sizes], [ra/free-length], [pure/delta-sizes]; article 01's table "entries with an empty delta".

### F1. 101 vs 91: x from 0.56 to 1.00 for +0.00004

Evidence: `research/agents/r6/pages/iter-2-2.md` (16:05 UTC) result table: 91 path streams x 0.56, MDL 0.70461, 39 reads; 101 every entry a tree row x 1.00, MDL 0.70465, 52 reads; 109 connected subtrees x 1.00, 0.70382 at 106 reads. `research/agents/r6/journal/SESSION-002.md` line 42: "12 blocks at 4k: 0.70465 at 52 reads vs 91's 0.70461 at 39: Δ +0.00004. I predicted −0.0013." Same numbers in `research/agents/r6/digests/DIGEST-002.md` and KNOWLEDGE [ra/split]. The mechanism in 101: a leaf of the tree is written as a row directly after its parent inside the parent's stream instead of as a delta, so every entry sits in the dictionary and every delta is empty; it costs about 2 bits per entry of index and count fields, which eats what the leaf's cheap record saved.

These are **block tests, not ledger trials**: 12 blocks of 4k, `head` entries, both dev sequences, all six layers, the value model of coder 50, measured in-process under the r137 budget and before the every-entry rule; the page itself says "Smoke-test grade ... They need the ledger and target 02 before they become findings." Coder 101 has **no ledger trial at all**. Coder 91 has one: r6-t0003 on `s-head-b4k-r293` 0.69167 (x 0.5566, y 0.1351, 120 blocks, isolated true). The x = 1 claim does reach the ledger through 109-subtree-streams: r6-t0004 on `s-head-b4k-u` 0.69090 with x = 0.6909, y = 0.0000 (every delta empty), graded below-mdi against 91's 0.69167 (−0.0008), and 109 is the standing incumbent at x = 1 on `s-head-b4k-u` (STATUS.md) and on `s-head-b512-r293` (env-t0009, 0.71884, x = 0.7188, y = 0, every entry counted, max reads 187). Minor inconsistency: 91's reads are given as 39 in the iter-2-2 table and journal, 36 in iter-2-1's table and in KNOWLEDGE [ra/path]; the difference is the sampled read count's noise, not a score.

Verdict: **CONFIRMED as a block test; PARTLY as a ledger fact.** The exact "+0.00004" is a 12-block in-process comparison; the ledger shows the same thing more loosely (109 at x = 1 within 0.001 of 91 at x = 0.56, and x = 1 as the incumbent on two tracks).

### F2. About 80 % of 102's deltas are empty

Evidence: KNOWLEDGE [pure/delta-sizes] (r25, `research/agents/r25/analysis/dsize.py`): "102: 80 to 83 % empty, the rest 0.5 to 0.75. One block per layer, thread 0000." KNOWLEDGE [ra/free-length] (r24, `research/agents/r24/analysis/dlen.py`, one window): "head 102 20 % of entries have a delta ... layer 102 19 %". Article 01's table repeats "102, head or layer: about 80 %; the rest 0.5 to 0.75 of a raw entry". Ledger support: 102's own rows carry no `delta_size` field, but its descendant 121 does: env-t0096 on `st02n5-layer-b4k-r293` has `delta_size {p10: 0, p50: 0, p90: 311.3, max: 416}` bytes of 512, so more than half of 121's deltas are empty over 745,472 entries. The reason is structural: in 102 every internal node of the tree is an anchor whose bytes live in the dictionary, with an empty delta; only leaves carry a delta, and 78's `extend` round pulls each leaf's closest dependent into the dictionary as well, so the dictionary holds about four entries in five.

Verdict: **CONFIRMED** on the strength of two independent analyses (r24 and r25, one block per layer, sequence 0000) plus the structural argument and the ledger delta-size distribution of 121; **not** a number over a whole track. Caveat: KNOWLEDGE [ra/delta-sizes] quotes 102's delta sizes as "10 % / median / 90 %: head 141 / 180 / 201 of 256" — those percentiles are over the *non-empty* deltas only (article 01's figure caption says so); read side by side with "80 % empty" they look contradictory and are not.

### F3. "x is not a useful axis for tree coders"

Supporting ledger facts: all seven table-A coders sit at x 0.43 to 0.54, and 109 wins two tracks at x = 1; [ra/split] adds that anchors and deltas cost the same per value (5.84 vs 5.85 bits at L11), a block-test measurement. The claim is about tree coders; for coders without a tree (129, x = 0.02 to 0.04) x stays meaningful.

Verdict: **CONFIRMED** as the authors state it (bookkeeping under the random-access rule), with the caveat that the sharpest numbers are block tests.

---

## Pitfalls for a reader

1. **Do not subtract rows of the "Where the day ended" table.** Each entry split reads different blocks (72 blocks for `layer`, 24 for `token`, 120 for `head` at 4k) and the tenth of blocks sampled differs, so 0.63879 (token) vs 0.63639 (layer) is not a ranking. Only a same-window comparison ranks splits (article 01; r24's pages): there, on the same bytes, `token` leads `layer` by about 0.005.
2. **"Verified" has a precise meaning:** `verification.isolated: true` on a non-quick ledger row. Numbers from iteration pages marked "block tests", "real bytes", "exact model" or "bound" (the 101-vs-91 result, the 80 % figure, the C1 relaxation table) are not on the ledger and never had the isolated pass.
3. **Two sequences are not a sample.** All `s-` screens and all C1 tracks use sequences 0000 and 0001; the grade `better-all-dev` only says both agreed. The `st02n5-` screens (5 sequences) and C1's `t02-` tracks (10 sequences) are where a spread exists. Even there, the two `02_qwen` sets are dev splits; C2 has no holdout score rows.
4. **Three different "solo" numbers.** 0.7999 is the per-position order-0 entropy of V layer 3 head 0 (an ideal); 0.778 is the same ideal for all six layers; 0.804 is the best real order-0 coder on layer 3 head 0. The articles' C2 scores (0.63 to 0.69) are six-layer numbers and should be set against 0.778, not 0.7999.
5. **C1 and C2 numbers are different slices.** C1 is V layer 3 head 0 only, `head` entries, no read budget, `mdi = 0.002`, `read_limit = mean`. C2 is six layers, several entry splits, read budgets on every entry since 2026-10-31. 0.6731 (C1, 4k) and 0.674 (C2 `head`, 4k) look alike by coincidence.
6. **The C1 story's endpoint is not the C1 ledger minimum.** 0.6731 / 0.6416 / 0.6294 are the MST-anchor family at x ≈ 0.40; the ledger incumbents with every entry in the dictionary are 0.6705 / 0.6384 / 0.6264 (r1-t0068, r4-t0019). C1 set those aside as needing about 1,490 reads; C2 showed path layouts make x = 1 cheap to read.
7. **Reads before 2026-10-31 were sampled** (8 entries per block): maxima ran up to 26 % low (137 sampled vs 171 true for coder 126). Rows with `dict_reads.every_entry: true` are the only ones that prove a budget on every entry. Coder 124's 512-token scores (0.68526, 0.70568) are better than the table's but were never legal.
8. **Grades are relative to the incumbent at the time and to the detection rule then in force.** `below-mdi` on 111 and 126 does not mean "no gain"; C2 later removed the fixed limit. The incumbent replay (`research/c1/REPORT.md`, STATUS.md) is the authoritative order.
9. **`x` is about half for every good tree coder and that is bookkeeping**, not a statement about the data; do not read "x = 0.52" as "the dictionary is half the cost of the data" in the sense of the kv-blockdiff proposal's dictionary budget. For coders without a tree (129) x is tiny and meaningful.
10. **Block size is the biggest lever and the least compared.** 512 / 4k / 16k rows are different screens with 180 / 72 / 36 blocks; the shape (0.689 → 0.636 → 0.618) is solid, the third decimal is not (article 06 says so).
11. **Retired words appear in older files.** "channel" = elephant line (position in the entry), "thread" = sequence, "map" = linear prediction, "series" = which layer/head; `research/c1/*` and the coders' READMEs use the old words.
12. **Delta lengths are not charged** (the human's decision, [ra/free-length]); a receiver that must know the length pays about 0.0003 to 0.0006 more. `mdl_with_length` in run records is the side note for that.
