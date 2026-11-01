# Campaign C1 (night of 2026-10-29/30) and what was learned about keys

Sources, all read-only, under `/attic/d/kv-compress-roofline/`: `research/READER-2026-10-30.md`, `research/MORNING.md`,
`research/c1/{REPORT,KNOWLEDGE,DEADENDS,HYPOTHESES}.md`, `research/c1/campaign.toml`, `docs/spec/random-access.md`,
`research/agents/{r1,r2,r3,r4,env}/ledger.jsonl`, `research/agents/r3/{digests,journal}/`, `research/agents/env/journal/SUPERVISOR.md`,
`research/BRIEFING.md`, `research/KNOWLEDGE.md` (C2), `research/agents/r13/pages/iter-1-{1..5}.md`.

Numbers below are dev MDL ratios on target 03 (2 dev sequences, 1 holdout), fp8 E4M3, V layer 3 head 0, blocks of 4k tokens,
unless a line says otherwise. Trial ids are ledger rows (`research/agents/<agent>/ledger.jsonl`, field `tracks.<track>.score`).
C1 documents use retired words; this note uses the current ones from `docs/concepts/terminology.md` where a sentence is mine,
and keeps the old word in quotes where it is a quoted claim: "channel" = elephant line, "map" = linear prediction,
"thread" = sequence, "anchor" = an entry stored whole in the dictionary and used as a reference, "MST" = minimum spanning
tree of entries by L2 distance, "solo" = each entry coded alone with a per-block (per-elephant-line) order-0 histogram.

## 1. The story of C1 in 15 bullets

1. **Setup (02:35 UTC).** Four tracks on V L3 h0: `v-l3h0-{bf16,fp8}-b{512,4k}`; baseline 1.0 (`env-t0001`). Solo landmark
   (per-elephant-line order-0 entropy) fp8 0.7999, bf16 0.6488, equal on all three sequences
   (`c1/KNOWLEDGE.md` [data/landmarks]). Four researchers: r1 coders, r2 bits/scale/statistics, r3 similarity/depth/heads,
   r4 Rust speed; five rounds of 2–2.5 h, 01:00–11:05 UTC; supervisor `env`.
2. **Off-the-shelf and per-value statistics fail.** zlib/deflate 0.97 (fp8), LZMA2 per entry 1.016 (`r2-t0002`, `r2-t0009`);
   stored per-block histograms cost more than they save (`03-solo-rans` 0.907/0.818 at 512/4k, `r1-t0004`); parametric
   logistic tables + rANS + raw tail `09-blockstats-logistic-tail` **0.8045 / 0.8039** (`r1-t0005`): order-0 saturates at
   solo + overhead. Fixed-width bit packing ≥ 1.0 (`c1/DEADENDS.md` first entry).
3. **Bit structure (r2).** Sign+exponent carry 3.47 of the 6.40 fp8 bits; H(mantissa | se, elephant line) = 2.93 of 3; the
   low 4 bf16 bits have H = 3.9996; hence "bf16 = fp8/2 + 0.25" (05-se-split: fp8 0.8198 → bf16 0.6599 exactly,
   `r2-t0013`). [data/bits], [data/bf16=fp8]. (Challenged by C2: section 5.)
4. **Self-anchors (r3, 04-selfanchor-mixrans).** Every k-th entry in the dictionary, the rest coded with a logistic centred on the
   L2-nearest dictionary entry: **0.7698** at 4k, 0.7999 at 512 (`r3-t0002`, k = 4); ablation k = 0 0.8114 (`r3-t0006`).
   Rung "0.8039 → 0.7699" of the ladder. First sign that the structure is whole-vector repeats.
5. **Recursive anchors / anchors on anchors (r1, 15).** Dictionary entries coded on earlier dictionary entries: 0.7447
   (`r1-t0008`). **Along their spanning tree (17-recursive-anchors-mst):** **0.7373** (`r1-t0009`; 18 is the fast twin, `r1-t0013`).
6. **Per-entry match-quality ("scale") class (19), the largest single step:** **0.7043** at 4k, 0.7561 at 512 (`r1-t0014`). Eight
   classes widen or narrow the logistic per entry by how good its reference is.
7. **Shrink (21) and k-medoid anchors (23):** per-class shrink of the location toward the reference 0.6951 (`r1-t0018/t0021`);
   k-medoid anchor set instead of evenly spaced **0.6890** / 0.7460 (`r1-t0019`; medoids alone −0.0115, `r3-t0012`). One
   dictionary rANS stream per tree level (27-level-streams) 0.6850 (`r1-t0035`); two-sided "copy shrink" (30) **0.6815** /
   0.7347 (`r1-t0037`; ledger 0.6814). Holdout 30: 0.6703 / 0.7181 (`r1-t0041`). 31-fast-fit = 30 bit-identically (`r4-t0002`).
8. **Why not "every entry on its nearest neighbour"?** r3's ceiling 0.68 (sibceiling) was not decodable: 51 % of entries are
   mutual nearest neighbours whose shared information it counts twice (a30; [sim/tree], DEADENDS). The decodable optimum of
   single-reference coding is the block's MST: internal nodes in the dictionary coded along the tree, leaves as deltas on
   their parent. **34-mst-anchors k = 1: 0.6731 / 0.7278** (`r1-t0042`), x 0.406 / y 0.267, better-all-dev 14/14 vs 30.
   Holdout 0.6623 / 0.7111 (`r1-t0048`, `r1-t0047`). This is the 4k number quoted everywhere (0.8039 → 0.6731).
9. **Lean tables (37 = 34 + rANS-coded parameter tables):** **0.7237** at 512 (better-all-dev), 0.6725 at 4k (below the MDI of 0.002)
   (`r1-t0045`); holdout 0.7070 / 0.6617 (`r1-t0049`). `43-fast-lean` is the byte-identical Rust twin (`r4-t0005`).
   Target 02 (10 dev sequences): 0.7054 / 0.6514 (`r1-t0052`), holdout 0.6873 / 0.6326 (`r2-t0053`).
10. **Block-size scaling (r2, r4).** 24 = 23 swept 512 → 16k (`r2-t0040`), 32k (`r2-t0042`); 36/46 = 31 at 1k–32k
    (`r2-t0049`, `r2-t0048`); 43 at 1k/2k/8k (`r2-t0050`); `50-fast-lean-big` (= 43 with on-demand exact Prim, 0.75–1.25 GB per
    block) **0.6416 @16k, 0.6294 @32k** (`r4-t0008`), holdout 0.6413 / 0.6336 (`r4-t0013`). Shuffle controls split the gain
    into a block-local part that peaks at 0.075 around 4–8k and a "global" vocabulary part that grows +0.021 per doubling
    ([sim/scale]). Exact-model whole-sequence bound ≈ 0.594–0.600 ([sim/whole-thread]).
11. **Dictionary budgets (r1 sessions 2 and 4; x ≤ 0.02 / 0.10 / 0.25 tracks).** Prototypes chosen by facility location in
    code-length units (49-facility-codelen): x ≤ 0.10 0.6957 / 0.7416 / 0.6667 at 4k / 512 / 16k (`r1-t0056`, `r1-t0057`),
    x ≤ 0.02 0.7459 (`r1-t0058`); the in-stream prefix (57) −0.0028 more (`r1-t0066/67`). Squared-L2 scoring under-rewards
    near-exact repeats (−0.007…−0.017 from the switch, [budget/gain]). This whole end was later declared least interesting.
12. **Depth, the other head, pre-RoPE K (r3 sessions 2–4).** Tracks for V L7/11/15/19/23, V L3 h1, K L3/7/11/15/19/23.
    Two regimes: token layers (V 3, 19, 23; K 3) where the nearest in-block entry is the same token 74–82 %, and context
    layers (7–15; K also 19, 23) where it is position-adjacent 18–42 % ([gen/regimes]). Coders: 43 in token layers,
    38/47 (+ a free neighbour term, the mean of the position-adjacent dictionary entries) in context layers
    (`r3-t0024`, `r3-t0035`, `r3-t0039`, `r3-t0040`). Section 3 has the K numbers.
13. **Both KV heads in one entry (r3 session 4–5).** 48 (= 43 at d = 512) 0.6422 on V L3 both heads vs 0.6450 for the heads
    coded alone (`r3-t0042`); in context layers a per-block sparse head-0 → head-1 linear prediction (53-cross-head-map)
    −0.0131 / −0.0114 / −0.0081 / −0.0065 on V L7 / V L11 / K L11 / V L15 (`r3-t0044`, `r3-t0048`, `r3-t0053`), holdout-better
    7/7 (`r3-t0046`, `r3-t0051`); target 02 −0.0121, 70/70 segments (`r2-t0064`). Cross-head R² 0.70 at V L11 vs 0.35 at V L3.
14. **Statistics on target 02 (r2 sessions 3–5).** Per-sequence ratios spread SD 0.016–0.022, paired differences between coders
    of one family SD 0.0003–0.0008; 49 of 53 target-03 paired gains reproduce within 2·SD ([t02/confirmed]); target 03 is a
    mildly hard sample (+1 SD) ([t02/03-typical]).
15. **Round 5 and the collapse into x → 1 (10:15–11:00).** After the human said "explore the whole split range", r1 found the
    MDL falls monotonically to y = 0: every entry in the dictionary along the MST (`43 select=even k=1`): **0.6705 / 0.7210**
    (`r1-t0068`), holdout 0.6597 / 0.7043 (`r1-t0069`), target 02 0.6493 / 0.7026 (`r1-t0070`); 16k / 32k 0.6384 / 0.6264
    (`r4-t0019`); joint heads 62 x = 1 (`r3-t0056`, `r3-t0057`). At 11:00 the human called this serialized block compression and
    the random-access rule followed (section 4). The REPORT's incumbents on the unlimited tracks are therefore these y = 0 rows,
    not the 0.6731 ladder top.

Ladder at 4k, one line (coder → MDL, trial): 09 0.8039 `r1-t0005` → 04 self-anchors 0.7698 `r3-t0002` → 15 recursive 0.7447
`r1-t0008` → 17 along the tree 0.7373 `r1-t0009` → 19 class 0.7043 `r1-t0014` → 21 shrink 0.6951 `r1-t0018` → 23 medoids 0.6890
`r1-t0019` → 27 level streams 0.6850 `r1-t0035` → 30 copy shrink 0.6815 `r1-t0037` → **34 MST anchors 0.6731 `r1-t0042`** → 37 lean
0.6725 `r1-t0045` → 43 y = 0 0.6705 `r1-t0068`. Each step better-all-dev 14/14 except the last two at 4k (below-mdi, better at 512).

## 2. Spot-checks of C1 claims

| claim | where found | verdict |
|---|---|---|
| solo order-0 rANS saturates at 0.804 vs solo 0.7999 at 4k | `r1-t0005` 09: 0.8045 @512 / 0.8039 @4k; solo 0.79992 / 0.79989 (`c1/REPORT.md` scaling table); [family/order0] | **CONFIRMED** |
| block-size scaling 0.7237 / 0.6731 / 0.6416 / 0.6294 at 512 / 4k / 16k / 32k | `r1-t0045` (37, 512), `r1-t0042` (34, 4k), `r4-t0008` (50, 16k and 32k) | **CONFIRMED**; note these are the 09:55 frontier; the later y = 0 rows are 0.7210 / 0.6705 / 0.6384 / 0.6264 (`r1-t0068`, `r4-t0019`) and are what REPORT.md shows as incumbents |
| at layer 3 the nearest in-block entry is the same token 55 % (512) to 78 % (4k) | [sim/repeats] (r3 tokensim.py); [gen/regimes] 0.78 at 4k; r3 journal SESSION-002 | **CONFIRMED** (analysis, not a ledger trial) |
| neighbouring positions nearly useless, MI 0.058 bit/element | [sim/adjacency]: per-elephant-line MI at Δ = 1 net 0.058 (fp8), 0.007 @Δ16; r3 journal 0.056 | **CONFIRMED** for V L3 only; at V L7/L11 MI is 0.31 bit/element ([gen/regimes], r3 SESSION-002) |
| tool calls and tool outputs repeat ~2× more than prose | [sim/repeats]: in-block repeat rate tool_call/tool_response 56–59 % vs prose 38–42 % (1.4×); anchor gain per entry −36 / −30 B vs user −19 / assistant −17 B of 205 (1.6–2.1×) | **PARTLY**: the ~2× is the gain from references, not the repeat rate |
| 51 % of entries are mutual nearest neighbours | [sim/tree], DEADENDS "every entry on its nearest other entry" (r1 a30, 6 dev 512 blocks) | **CONFIRMED** (exact-model analysis at b = 512) |
| centroids lose to exemplars 0.780 vs 0.753 | DEADENDS Rung 6 (r1 a06, 11 dev 4k blocks: k-means K = 64–256 0.780 vs self-anchors k = 2–4 0.753); [sim/accounting] | **CONFIRMED** (bound, not a graded trial) |
| KLT/PCA ≤ 0.025 before paying for coefficients | DEADENDS: out-of-sample 0.19 bit/element = ≤ 0.013 bf16 / 0.025 fp8 (r2 klt_gain.py); [data/linear] | **CONFIRMED** on V L3 h0; C2 reopened it elsewhere (section 5) |
| gain vs solo is U-shaped in depth; token layers (3, 19, 23) vs context (7–15) | [gen/frontier]: V −0.127 L3, −0.064 L11, −0.092 L19; K −0.117 / −0.078 / −0.098; [gen/regimes]; r3 DIGEST-003 | **CONFIRMED**; for K the regime split is 3 vs 7–23 (K L19, L23 still gain from the neighbour term) |
| layer 23's low solo 0.65 comes from ~10 % one-signed offset channels | [gen/bits]: V L23 solo 0.651 = ~10 % offset elephant lines with |μ|/σ > 9; r3 SESSION-002: ~40 of 256 lines with H < 3 bits, sign entropy 0.59; REPORT solo 0.65122 | **CONFIRMED** |
| cross-head R² 0.70 at L11 vs 0.35 at L3 | [gen/cross-head]; r3 SESSION-004 08:35 (L3 0.33–0.38) | **CONFIRMED** (raw R², dev) |
| a thread's difficulty is its token-repeat fraction, r = 0.94–0.99 | [t02/one-number]: per-sequence ratios correlate r = 0.94–0.99 *between regimes* (V L3 512/4k, K L3, V L11); the correlation with the in-block token-repeat fraction is r = −0.76…−0.82 | **PARTLY**: the 0.94–0.99 is the cross-regime correlation, not the correlation with repeat fraction. (C2 [noise/hardness] later found r = −0.91 per block window.) |
| 49 of 53 target-03 claims reproduce on target 02 within ±15 % | [t02/confirmed] table: 49/53 paired Δs within 2·SD(Δ)·√(1/2 + 1/10); 21 of 25 between two real coders | **CONFIRMED**; "±15 %" is the notebook's own rounding of that band |
| "bigger always wins, ever more slowly" | [sim/scale] −0.020…−0.015 per doubling to 16k, −0.010 from 16k to 32k; whole-sequence 0.594–0.600 | CONFIRMED |

## 3. Keys: everything C1 measured about pre-RoPE K

C2 compressed V only (`docs/concepts/terminology.md` §2: "K has the same shape as V. This campaign compresses V only"); the
C2 `research/KNOWLEDGE.md` has no K fact. Everything about K is C1, r3 sessions 2–4 plus r2's target-02 rows, fp8, b = 4k,
head 0 unless said. K in targets 02 and 03 is pre-RoPE (the generator inverted the rotation; channels 0–63 within one bf16 ulp,
`docs/concepts/rope-and-keys.md`); no post-RoPE K was ever coded.

### 3.1 K MDL numbers vs V at the same layer (dev, 4k, fp8)

| layer | K solo | K best coder (trial) | V h0 solo → best (trial) | K − V gain vs solo |
|---|---|---|---|---|
| 3 (token) | 0.7760 | 23 0.6774 `r3-t0018` → 31 0.6683 `r1-t0038` → **34 k=1 0.6600 `r3-t0036`** → 43 0.6595 `r3-t0039` (below-mdi) | 0.7999 → 0.6731 `r1-t0042` / 0.6725 | K −0.116, V −0.127 |
| 7 (context) | 0.7810 | 38 0.6928 `r3-t0035` → **47 0.6924 `r3-t0040`** | 0.7985 → 0.7121 `r3-t0024` / 0.7117 | K −0.089, V −0.087 |
| 11 (context) | 0.7791 | 23 0.7150 `r3-t0018` → 31 0.7106 `r3-t0019` → 33 0.7066 `r3-t0021` → 34 0.7032 `r3-t0026` → **38 0.7015 `r3-t0024`** → 47 0.7011 `r3-t0040`; holdout 38 0.6997 `r3-t0032`, 33 0.7049 `r3-t0034`, 31 0.7088 `r3-t0025` | 0.8042 → 0.7404 `r3-t0024` / 0.7399 | K −0.078, V −0.064 |
| 15 (context) | 0.7855 | 38 0.6958 `r3-t0035` → **47 0.6954 `r3-t0040`** | 0.8138 → 0.7444 / 0.7439 | K −0.090, V −0.070 |
| 19 (K context, V token) | 0.7800 | 38 0.6818 `r3-t0035` → **47 0.6814 `r3-t0040`**; 43 (no neighbour term) 0.6836 is worse, 0/14 segments `r3-t0039` | 0.8191 → 0.7282 `r3-t0035` / 0.7276 `r3-t0039` | K −0.098, V −0.092 |
| 23 (K context-ish, V token) | 0.7839 | 38 0.6874 `r3-t0035` → **47 0.6870 `r3-t0040`**; 43 0.6885 | 0.6512 → 0.5721 `r3-t0036` / 0.5717 | K −0.097, V −0.080 |
| 11, both heads (d = 512) | 0.7804 | 48 0.6990 `r3-t0047` → 53 cross-head map 0.6910 `r3-t0048` → 56 0.6886 `r3-t0055` → 62 x = 1 0.6863 `r3-t0056`; holdout 48 0.6957 `r3-t0050`, 53 0.6876 `r3-t0051` | V L11 both heads 0.8074 → 48 0.7394, 53 0.7280, 62 0.7239 | map on K L11 −0.0081 vs V L11 −0.0114 |
| 3, target 02 (10 dev seq) | 0.7742 | 23 0.6568 `r2-t0057` → 31 0.6485 `r2-t0055` → **43 k=1 0.6397 `r2-t0052`** (0.6392 `r2-t0058` quick); 38 0.6400 `r2-t0060` (neighbour term +0.0003: useless at K L3) | V L3 t02 0.7985 → 0.6514 `r1-t0052` | K −0.135, V −0.147 |

Readings. (a) K's solo is lower than V's at every layer but 23 (0.776–0.786 vs 0.799–0.819): the QK-norm makes K Gaussian
with a nearly constant entry norm, so its order-0 histograms are narrower. (b) The *same* coder family wins on K with the same
mechanisms in the same order: MST anchors (34 − 31) −0.0083 at K L3, −0.0074 at K L11; copy shrink (31 − 23) −0.0091 / −0.0044;
the neighbour term pays only in context layers (K L11 −0.0017, K L19 −0.0024, K L23 −0.0015; K L3 ≈ 0) ([gen/mechanisms],
[gen/frontier]). On target 02 the paired differences match 03 within the ±15 % band: MST anchors on K L3 −0.0088 (SD 0.0007)
vs −0.0083 on 03 ([t02/confirmed]). (c) Absolute K ratios are 0.01–0.05 below V's at the same layer; the gain vs solo is the
same size (K −0.078…−0.117 vs V −0.064…−0.127). (d) No K holdout score exists for K L3 single head on target 03 (only K L11,
`r3-t0025/29/32/34`, and K L11 both heads `r3-t0050/51`); the K L3 confirmation is target 02's dev rows.

### 3.2 What makes K different (all from r3; `research/agents/r3/journal/SESSION-002.md`, `SESSION-003.md`, c1/KNOWLEDGE [gen/*])

- **QK-normed and Gaussian.** Pre-RoPE K = g ⊙ h / rms(h): entry norm cv 0.02–0.03 (plain) and 0.008–0.010 when weighted by
  1/g² (the fp8 rounding floor); kurtosis 3.0–3.1; elephant-line scales heterogeneous (std cv 0.40–0.45). r3.H16 (knorm.py,
  kdrift.py) shows the norm constraint is worth ≤ 3 bits per entry ≈ 0.0015 of ratio, and local locations after the reference
  lose at K L3; "no K-specific in-block structure beyond 34/38" (closed-by-bound, `c1/HYPOTHESES.md` r3.H16; DEADENDS).
- **K drifts slowly.** 4k-block means explain 5 % / 12 % of K's variance at L3 / L11 vs 1.6 % / 4 % for V ([gen/bits]).
- **K stays a context layer deeper than V.** Same-token rate of the in-block nearest neighbour @4k: K L3 0.74, K L7 0.54, K L11
  0.42, K L15 0.33, K L19 0.57, K L23 0.74 (V L19 0.82, V L23 0.79). Position-adjacent nearest neighbour: K L7 25 %, **K L15
  41 %**, K L19 18 %, K L23 9 % vs V L19 2 % (gen.py nnpos, r3 SESSION-003 07:44; [gen/regimes]). Hence the regime table:
  V token layers 3/19/23, K token layer 3 only.
- **K shares information with V beyond any in-block reference** (r3.H8, kvjoint3.py, kvrank.py). K from V of the same token:
  raw R² 0.40 (L3) / 0.62 (L11); after each tensor's in-block reference the residuals still share R² 0.26 / 0.44; coded as a
  joint entry with a ridge map fit on the *other* dev sequence this saves **0.19 (L3) / 0.40 (L11) bit/element** of K
  = −0.023 / −0.050 of K's ratio (≈ half that on a joint K+V entry). The map is full-rank (rank 16 keeps 40 % / 25 %) and a
  per-block rank-16 fit scores ≈ 0 at L3, 0.08 bit at L11: not learnable per block, "scope G" (shared table) only
  (DEADENDS "per-block cross-tensor maps"; [relax/table] row "K L3 given V: 0.6600 → 0.6366"). Never built as a coder: scope G
  needs an independent training dataset (terminology §11 "shared table").
- **K wants its own tree.** K coded on V's MST with a free shared index is +0.0024 worse than K on its own tree with the index
  charged (r1 a33 run_k; DEADENDS). A joint K+V entry should keep K's references.
- **Cross-channel residual structure is largest on K.** A 256×256 lower-triangular linear prediction fit on the other sequence
  removes 0.107 (V L3) / 0.171 (V L11) / **0.236 (K L11)** bit/element after the in-block reference; per block only K L11 shows a
  little (+0.004 Gaussian before stream overhead) ([gen/scopeG], xchan.py).
- **Joint K+V of one head** (L11, d = 512, block tests): the per-block map from one tensor to the other −0.0032 at 4k (bound
  −0.005), x = 1 another −0.0016: a third of the cross-head map ([gen/joint-kv]).

### 3.3 bf16 vs fp8 (r2 session 1; r1 session 3; all V L3 h0)

- Low 4 bf16 mantissa bits: H = 3.9996 of 4, 3.9985 given the top 12 bits, 1/16 match with the nearest entry (low4.py); coding
  the full value gains 0.0004 over "12 bits + 4 raw" (`r2-t0017` vs `r2-t0016`). The byte split is wrong (+0.009: the exponent
  LSB is in the low byte, `r2-t0012` vs `r2-t0013`).
- **bf16 ≈ fp8/2 + 0.25** held for every family: 05 0.8198 → 0.6599 exactly (`r2-t0013`); the 23 ladder within 0.0004
  (26 0.6228 / 0.5941 vs predicted 0.6230 / 0.5945, `r2-t0038`); MST anchors 35 **0.6173 / 0.5899** (`r1-t0044`, = fp8/2
  exactly in Δ) and 40 **0.6136 / 0.5883** (`r1-t0050`) vs fp8 37 0.7237 / 0.6725 → predicted 0.6119 / 0.5863. Holdout 35 0.6087
  / 0.5843 (`r1-t0053/54`), 40 0.6052 / 0.5828 (`r1-t0055`). REPORT incumbents: `v-l3h0-bf16-b512` r1-t0050 0.61355,
  `v-l3h0-bf16-b4k` r1-t0044 0.58988.
- Consequence drawn: do all context research on fp8 and port by appending the 4 raw bits (r2.Q1: "the bf16 tracks are
  redundant"). C2's audit (r13 iter-1-3) rules "4 low bf16 bits are pure noise" **stands for every reachable model**: the smallest
  within-sequence σ measured is 1.8 fp8 grid units, 16× above those bits.
- Not measured: bf16 for K or any layer but V L3 h0.

## 4. The goal clarifications and what C1 got wrong by its own account

- **Before 10:15 UTC** (`research/MORNING.md` Part 1, written 09:55 and kept verbatim): the supervisor and researchers had read
  the x_max budget tracks as a "sparse-fetch frontier", computed fetch break-evens (φ* = x / (1 − y)), adopted a self-imposed
  ≤ 50 % anchors cap (r1.Q1), and treated a per-sequence resident dictionary ("pool", worth −0.058 at 4k, −0.093 at 512, exact
  model `relax/table`) as a deployment decision for the human. SUPERVISOR.md ~10:15: "Supervisor's own error: I had framed the
  budget tracks as a practical frontier".
- **10:15 UTC, first clarification** (MORNING Part 2): application and deployment design are out of scope (residency, HBM, fetch
  latency, memory); the goal is the lowest MDL ratio with a dictionary and the information-theoretic structure of KV data;
  the budgets were a misunderstanding: explore the whole dictionary/delta split and find where the MDL is best; the solo /
  small-dictionary end is the least interesting. Researchers were told to stop low-x work and map x from 0.4 to 1.
  At ~10:45 the human added: the correction does not make the earlier work wrong after the fact; keep every note as written
  and record the correction as a dated event (the supervisor had told agents to delete deployment framing and had rewritten
  MORNING.md in place; this was countermanded and MORNING.md restructured chronologically).
- **The drift into x → 1** (MORNING Part 3; [heavy/curve], [curve/whole]): the y(x) curve at 4k, 0.8039 (x 0.0005) · 0.7430
  (0.02) · 0.6941 (0.10) · 0.6860 (0.25) · 0.6795 (0.34) · 0.6731 (0.41) · **0.6705 (x = 1, y = 0)**, is steep to x ≈ 0.35 and
  nearly flat after; the last −0.0026 is per-delta overhead (16-bit reference prefix + ~1 B stream flush), not better
  references. By 10:58 every regime had been pushed to y = 0 (`r1-t0068/69/70`, `r4-t0019/20/21`, `r3-t0056/57`).
- **11:00 UTC, second clarification** (MORNING Part 4): with every entry in the dictionary the scheme is plain serialized block
  compression: to serve one entry you decode the block. Technically valid, useless for the scenarios in mind, well-researched.
  Decoding one entry must not need most of the dictionary. The human's first formalisation idea: at most half the block's
  bytes per entry. The researchers then measured cold-start reads: every frontier coder reads **52–56 % of its dictionary**
  for one entry (43 at 4k: 860 of 1650 raw entries; y = 0: 1490 of 2851; r1 a44, r3 cold.py, r4 p31), because dictionary entries
  share one rANS stream per tree level (≤ 128 per stream) and the header is read whole; the entry's own chain is only 13–18
  entries (V L3) / 46–57 (V L11 both heads), so one stream per anchor would need ≈ 7–53 raw entries for ≈ +0.004 of MDL
  ([access/coldstart], [cold/start]; r4's later measurement: streams=entry 21.8 mean / 31 max at 4k for +0.0045…+0.0054).
- **The random-access rule** (`docs/spec/random-access.md` v1.1; human ~11:20): to rebuild any one entry from a cold start the
  decoder may depend on at most **N × E distinct dictionary bytes**, E = one raw entry (256 B fp8 one head, 512 B bf16 or two
  heads); re-reads count once; the delta is free. **Where 137 / 293 / 1103 come from:** they are *arbitrary primes* chosen by
  the human (the supervisor had proposed A = 16 / 64 / 256): "generous enough for real shared structure (a 128-vector codebook
  plus pointers fits in 137), small enough that a decoder cannot decompress the block. Primes make accidental factors in later
  results easy to spot." N = 1103 exists only for blocks ≥ 4k because it exceeds a 512-block's entry count. The budget is
  fixed per entry and the same at every block size *by design*: a budget proportional to the block would let a dictionary
  split into two serially compressed halves pass "half the block" and be the trivial solution again at b/2. Later (~12:30, by
  the human's leave) scaled variants were added for big blocks: r1103 is 0.269 of a 4k block; the same share at 16k / 32k,
  4 × 1103 and 8 × 1103 rounded up to the next prime, gives **4421** and **8831**. The rule exists "so the search does not reduce
  to that trivial case, not to model a deployment". Measurement: a counting `DictionaryReader`, a cold fork per entry, a
  re-import check, and a proof decode with every unread byte scrambled; statuses `skipped` / `unmeasured` / `over_read`.
  **C1 stated the rule on the mean** (`campaign.toml` `read_limit = "mean"`; SUPERVISOR.md: "so r1103 admits the 4k tree coders as
  the human intended (mean 754–860; p90 ≈ 1,400 would fail a per-entry max)"); the human later set it to **every single entry**,
  and C2 found the 8-entry sample maximum ran up to 26 % low (`research/KNOWLEDGE.md` top). So no C1 coder is an incumbent
  on a `-r*` track; the 23 read-budget tracks start empty.
- **What C1 got wrong, per its own retrospective** (`READER-2026-10-30.md` §5, SUPERVISOR.md): drifting into deployment framing
  and adopting a self-imposed cap; optimising into the trivial all-dictionary corner before a rule existed; proxies used for small
  increments (a Gaussian pair-reference proxy predicted −0.006…−0.010, the real coder gave +0.001: [method/proxy], r1.H23);
  Python encoders at big blocks until the Rust twins existed; saturating a 16-core machine with a laptop HDD (fixed with job and
  I/O limits); KNOWLEDGE.md growing to ~580 lines; the supervisor's own listed mistakes (changing the campaign schema under a
  running daemon, rewriting history at 10:20, a harness race, a notebook write without the lock, 74 duplicate `env-t0014…t0087`
  rows from a `recheck_reads.py` bug, a false `lossy` alarm `env-t0008` from a warm read count). Also the night started with a
  wrong ceiling (the non-decodable nearest-neighbour ceiling, MORNING "What surprised us" 3).

## 5. What C2 overturned or qualified (so C1 documents are not read uncritically)

Source: the human's 14:10 UTC challenge (`research/BRIEFING.md` Part 1), r13 "the prosecutor" (`research/agents/r13/pages/iter-1-1…5.md`),
`research/KNOWLEDGE.md` tags `[value/*]`, `[quant/*]`, `[net/*]`, `[noise/*]`, `[ra/*]`.

1. **"The mantissa is noise; all compressible information is in sign+exponent; floor ≥ 0.37" — overturned as an explanation,
   kept as an order-0 description.** [value/scale]: given the MST parent, 5.457 bits = se 2.653 + mantissa 2.804 (solo 6.251 =
   3.353 + 2.898), so 88 % of a reference's gain does land in se at today's prediction quality; but H(mantissa) falls below 3 bits
   whenever the predicted error σ is under 0.7 of a binade (33 % of elements, mean 2.51 bits), and adding the exponent to
   H(m | σ/binade, position) moves it by ≤ 0.0016 bit on all six layers held out. The boundary is a scale, not a bit position.
   [value/near-zero]: for |x| < σ (45 % of elements, 55 % of bits) the *exponent* is close to noise. [value/floor]: the 0.37 floor
   needed an oracle; the floor that replaces it (one head given its token and local history, channels independent) is 0.27 (L3,
   still falling), 0.52, 0.62, 0.59, 0.54, 0.44 by layer, pooled 0.50; 73 % of the frontier's 5.46 bits lie under it. r13's verdict
   (iter-1-5): "guilty as an explanation, not guilty of losing bits": the framing cost at most 0.009 of MDL at the sparse end
   and ~0 at the frontier, because C1's coders were value-domain all along. The "4 low bf16 bits are noise" claim stands.
2. **"Never subtract a reference" ([sim/context-not-difference]) — mis-stated.** True of code indices (the logarithmic grid);
   the frontier subtracts in value and integrates the pdf over the FP8 cell. Rule should read "never subtract code indices".
3. **"Prototype precision: sign+exponent prototypes at x ≤ 0.02, 1 mantissa bit at x ≤ 0.10" ([budget/precision]) — lost its
   re-test.** A quantiser uniform in value at equal entropy wins 48 of 48 paired rows, −0.0011…−0.0086 (r13 a06, exact model;
   [value/prototype]).
4. **KLT/PCA and cross-channel linear prediction "do not pay" — reopened outside V L3 h0, and the closure was about scope.**
   r11: held-out Gaussian gain 0.19–0.63 bit/element by head, 0.57–1.09 by layer in value (0.26–0.36 if measured on the code
   index, which hides it: [map/estimator]). Real coders: r11's 80 (sparse triangular rows per block) −0.0213 vs 71 on
   `s-layer-b4k-r293`; r14's 77 (rank-64 latent inferred along the channels) −0.0110 at head; C2's frontier 102/121/126 are
   tree + per-block linear prediction ([info/rows], [family/vector], [family/path-factors]). C1's own relax table already had a
   global cross-channel map at −0.016; the "flat spectrum" was V L3 h0 with one head per entry.
5. **"The residual after the reference is flat noise" (r1 a17) — challenged.** [quant/residual]: 40–50 eigenvalues above the
   noise edge per head, 80 per layer; [info/local]: subtrees have their own correlation and an entry's blend of its tree
   ancestors is worth −0.0042 of MDL with no byte sent (126).
6. **"Cross-head maps do not work" — true at L3 only, and C1's text said so.** r12: −0.0001 at L3, −0.0184 at L19;
   [split/head-layer] head → layer −0.0134 on 20 sequences of 02, the map part −0.0102. [heads/views]: the two heads are two
   views of one vector (R² after removing token means 0.45–0.76); [heads/model]: the link is fixed by the LLM (a map from the
   other sequence recovers 91–96 %). The plateau that looks like noise is 66–70 % visible in the other head at L7/L11/L19
   ([value/shared]).
7. **"Second references ≤ 0.0034", "L2-nearest is the right reference", "in-block token ids worthless", "8 scale classes
   suffice", "k-means centroids lose to exemplars" — stand**, re-tested on six layers (r13 a07, a05b; [quant/real]: no quantiser
   reaches the tree, RQ on the map alone −0.003 at best; [pure/why]). "Metric does not matter" is qualified: a Mahalanobis
   tree in the residual's metric gains −0.0012 on every layer ([quant/metric]; C1 tested diagonal metrics only).
8. **The slice error.** r13 iter-1-3: "the larger error in C1 is not about bits at all. It is slice: closures measured on L3 h0
   with one head per entry were read as general, and L3 is the least typical layer on every measure taken today" (no plateau,
   weakest cross-head map, hub-shaped tree). C2 then found that entry width matters most: `layer` (both heads) beats `head` by
   −0.032 on 20 sequences of 02, `token` by a further −0.004 ([split/same-bytes]); "join the two heads always" ([split/ranking]).
9. **"The data has no run-to-run noise" (r13 [value/no-noise]) — itself corrected by [net/rounding]:** runs repeat only on one
   binary; another torch build or prefill chunk size changes 1.35–1.44 bit/element. (A C2-internal correction; C1 never made
   the claim.)
10. **The random-access split is bookkeeping.** C1's "x → 1 needs 1,490 reads" came from the level-stream layout; under the rule,
    with connected subtrees as streams, x = 1 is legal and the best known at r137 (109: 0.7039 @ 83 reads on the six-layer
    `head` screen at 4k, so not comparable to C1's V L3 numbers; [ra/split], [ra/path]). C1's "+0.004 for one stream per anchor" became +0.0023 against the best no-budget layout at 4k.
11. **Thread hardness.** C2 [noise/hardness] refines [t02/one-number]: a block window's hardness is one number shared by all
    layers and heads (97 % of variance on one component, r = −0.91 with the share of repeated token ids), while a *coder's gain*
    belongs to the layer (74–99 % of the variance of a paired Δ is between layers).

Not overturned, and still the only measurements of their kind: everything about pre-RoPE K in section 3, the block-size and
dictionary-scope curves (section 1, bullets 10 and 15), the target-02 reproduction statistics, and the ladder itself.

## Things I could not find

- No ledger row for a K holdout score on target 03 at L3 (single head), nor any K bf16 run: K is dev-only at L3/7/15/19/23 and
  holdout-scored only at K L11 (`r3-t0025/29/32/34`) and K L11 both heads (`r3-t0050/51`).
- The "55 % at 512" same-token rate and the "0.780 vs 0.753" centroid number are analysis-script results (r3 tokensim.py, r1
  a06) with no ledger trial; I did not open `research/agents/*/analysis/` to re-run them.
- The READER's "Gaussian" for K traces to r3 journal SESSION-002 (kurtosis 3.0–3.1) only; it is a one-session measurement at
  L3 and L11, never written into KNOWLEDGE as a tagged fact.
- MORNING.md's ladder lists "shrink + k-medoid anchors 0.6890" as one step; the ledger has them as two (21 0.6951 `r1-t0018`,
  then 23 0.6890 `r1-t0019`), which is how I wrote it above.
