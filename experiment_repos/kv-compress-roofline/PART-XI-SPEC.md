# Part XI — "What the data said": the specification every writer and figure author works from

Status: the working sheet for Part XI of the primer (`content/11-measured/`), written 2026-10-31 by the
orchestrator after six verification passes over `/attic/d/kv-compress-roofline` (see `notes/00…05`).
Every number below is pinned with its receipt. Writers quote these numbers; the figure file draws the
same numbers from `figures/data/measured-*.json`; if the two disagree, the JSON (ledger-derived) wins and
the prose is corrected.

## 0. What the Part is

A journalist's dispatch, in the primer's own vocabulary, on what two autonomous research campaigns
(C1: the night of 29–30 Oct 2026, 4 researcher agents; C2: 30 Oct 2026, ~21 researcher agents plus a
supervisor agent) measured when they ran the kv-blockdiff question through a real harness on real
Qwen3.5-2B KV caches. Parts I–X are the proposal written *before* the data; Part XI is what came back.

The Part: `id: XI`, `dir: 11-measured`, `slug: measured`, title **"What the data said"**, short
"What the data said", emblem `roofline`, figs `[measured]`, colour `--part-XI: var(--sky)`.
Page ids are `measured-<file name without number>`.

Voice: a reporting journalist who first sets the stage for a reader who has never heard of any of this,
then paints the picture. House style of `docs/AUTHORING.md` applies in full (define before use, one idea
per page, example first, takeaways, flashcards, figures that explain themselves, honest and sceptical).
**Our words, not the repo's words.** The repo's terms are translated:

| repo says | we say |
|---|---|
| elephant line, channel | [[channel]] (one position inside an entry) |
| map, linear prediction | [[linear-prediction]] (defined in XI.5) |
| anchor (C1), reference | [[reference-entry]] (defined in XI.4) — never "anchor": "the Anchor" is loc's nickname |
| tree, MST | [[reference-tree]] (XI.4) |
| thread / sequence | sequence (a recorded run of the model over one long text) |
| MDL ratio | [[mdl-ratio]] (XI.3); also give bits per element, $\vbpe = 8 \times$ ratio |
| x, y | dictionary share $\vw/\vb$ and delta share (the mean [[delta-ratio]] $\vrho$ over all entries, empty deltas included) |
| track / screen | [[screen]] (XI.3) |
| trial, ledger | trial, ledger (plain words; explain once in XI.3) |
| read budget | [[read-budget]] (XI.3) |
| entry split (head / layer / token) | [[entry-split]] (XI.3); the three cuts are "one head", "one layer" (both heads), "one token" (all six layers) |
| exemplar | reference entry |
| isolated verification | [[verified-result]] (XI.3) |
| shared table | [[shared-table]] (XI.10) |
| the LLM, the network | the model (Qwen3.5-2B) |
| V, K | values, keys (the site's [[kv-cache]] words); "V values" → "value elements" |

Symbols: use the site's macros only ($\ve$, $\vb$, $\vw$, $\vrho$, $\vbpe$, $\vd$, $\vl$, $\vt$, $\vh$,
$\vc$, $\vH$, $\vgap$). **No new symbols.** Write "dictionary share" and "delta share" in words; in math,
$\vw/\vb$ and $\vrho$. MDL ratio $= \vw/\vb + \vrho$ (both in units of a raw entry).

## 1. Pinned facts (with receipts)

### 1.1 The data (notes/00, 04; `targets/02-qwen3.5-2b-agent-long30/README.md`)
- Model: Qwen3.5-2B, a hybrid: 24 layers, of which only every fourth (3, 7, 11, 15, 19, 23) is full attention
  and keeps a KV cache; the others are Gated DeltaNet (linear-attention) layers with a fixed-size state.
  2 KV heads × 256 elements per head (8 query heads, GQA). One layer's value entry = 512 elements = 512 bytes at 8 bits;
  one token across six layers = 3072 bytes. (The primer's plan page `plan-data` fixed exactly this proxy model.)
- Text: 30 sequences of 219,678–229,360 tokens each (6,806,453 tokens), prefill only, of the user's own
  Claude Code coding-agent transcripts rendered into Qwen's chat template; tool output 26–89 % of a sequence,
  tool calls 4–63 %. Target 03 is 3 such sequences (2 "dev", 1 holdout); target 02 is 30 (10 dev, 5 holdout, rest untouched).
- Format: bf16 as captured; FP8 E4M3 derived with one power-of-two scale per layer and tensor (`docs/spec/target-writer.md` §1);
  INT8 per channel also derived. C2 compressed **values only**, FP8 E4M3. C1 did values and pre-RoPE keys, FP8 and bf16.
- Keys were recovered *before* RoPE by inverting the partial rotation (64 of 256 channels), to about one bf16 ulp.
- One sequence's values: ~228K × 6 × 2 × 256 ≈ 700 M bytes. Whole target 02: ≈ 20.9 GB of value bytes.

### 1.2 The rules (notes/00, 01; `docs/concepts/terminology.md`, `what-the-human-clarified.md`)
- `delta[0..N-1], dictionary = compress(entries)`; `entries[i] == decompress(delta[i], dictionary)` for every i, bit for bit.
- MDL ratio = (dictionary bytes + Σ delta bytes) / raw bytes; 1.0 = no compression; bits per element = 8 × ratio.
- Known in advance, not charged: block size, N, entry shape, which entry is requested. Delta *lengths* not charged
  (the human's decision, 2026-10-30; worth ≈ 0.0003–0.0024 of ratio; changes no winner — retro-review).
- Baseline `01-baseline` moves a fixed fraction of each entry into the dictionary: exactly on x + y = 1 (env-t0001, 1.0000).
- Verified = every entry decoded in a separate process from the stored bytes only, bit-exact (`verification.isolated: true`).
- Read budget (every single entry, counted cold, since 2026-10-31): a decoder may touch at most 137 / 293 / 1103 entries'
  worth of distinct dictionary bytes to rebuild one entry. Why it exists: without it the optimum slid to "every entry in
  the dictionary" (C1: 0.6705 at 4k, r1-t0068 family), which is ordinary stream compression of the block — to read one
  entry you decode the block. The primer's `idea-data-layout` ruled that out from the start. The budgets are primes
  the human chose; ≈137 fits "a 128-entry codebook plus pointers".
- Entry splits: `head` (256 B), `layer` (512 B), `token` (3072 B), plus pair/triple/regime/column/tok2…tok32.
- Screens: a tenth of the blocks of 2 dev sequences of target 03 (`s-`), or of 5 sequences of target 02 (`st02n5-`).
  Scores from two different screens/splits read different blocks and **cannot be subtracted**.
- Scale of the campaigns: C1 218 ledger trials, 62 coders, 16 Rust crates; C2 169 trials (ledger-graded), 21 researcher
  agents, 147 iteration commits, 61 pages; 126 coders exist in all (ids 01–129 with gaps), 36 Rust components.

### 1.3 Solo coding, the floor every dictionary must beat (notes/01 B)
- Ideal per-channel order-0 entropy of values: 0.7999 at layer 3 head 0; **0.778 for all six layers** (6.22 bits).
- Best real solo coder (two-number logistic per channel, coder 09): **0.8039** at 4k, 0.8045 at 512 (r1-t0005).
  Literal histograms cost 0.818 / 0.907 because the tables are charged. zlib on the block: 0.909.
- The primer's literature guess for solo was 0.78 (ideal) – 0.88 (fixed-length) → **confirmed**.
- All C2 six-layer scores are compared with 0.778, not 0.7999.

### 1.4 Night one, C1's ladder (notes/04 §1; V, layer 3, head 0, blocks of 4096, no read budget, 2 dev sequences)
| step | coder | ratio at 4k | trial |
|---|---|---|---|
| per-channel statistics only (solo) | 09 | 0.8039 | r1-t0005 |
| each entry predicted from its nearest earlier entry ("self-anchors") | 04 | 0.7698 | r3-t0002 |
| references chosen recursively | 15 | 0.7447 | r1-t0008 |
| references coded along their own tree | 17 | 0.7373 | r1-t0009 |
| a per-entry match-quality class (8 classes) — the biggest single step | 19 | 0.7043 | r1-t0014 |
| shrink toward the reference | 21 | 0.6951 | r1-t0021 (r1-t0018 is the same score, gate-failed) |
| k-medoid references | 23 | 0.6890 | r1-t0019 |
| one stream per tree level | 27 | 0.6850 | r1-t0035 |
| copy-shrink | 30 | 0.6815 | r1-t0037 |
| references = internal nodes of the block's minimum spanning tree | 34 | **0.6731** | r1-t0042 |
| lean tables | 37 | 0.6725 (0.7237 at 512) | r1-t0045 |
| every entry in the dictionary (y = 0) | 43 | 0.6705 | r1-t0068 (set aside: ≈1,490 reads) |
Block size (coder 50 = 34's big-block twin): 0.7237 / 0.6731 / 0.6416 / 0.6294 at 512 / 4k / 16k / 32k (r1-t0045, r1-t0042, r4-t0008).
Other C1 facts (notes/04 §2): at layer 3 the nearest in-block entry is the *same token* 55 % (512) – 78 % (4k) of the time;
the adjacent token is nearly useless there (mutual information 0.058 bit/element at L3; 0.31 at L7/L11); 51 % of entries
are mutual nearest neighbours (why a tree beats "each on its nearest"); k-means centroids lose to real entries
(0.780 vs 0.753); cross-head R² 0.70 at L11 vs 0.35 at L3; 49 of 53 claims from target 03 reproduced on target 02 within ±15 %.
Keys (notes/04 §3): pre-RoPE keys compress like values at the same depth, same coder family, same mechanism order;
K vs V at 4k, head 0: L3 0.660 vs 0.673; L7 0.692 vs 0.712; L11 0.701 vs 0.740; L15 0.695 vs 0.744; L19 0.681 vs 0.728;
L23 0.687 vs 0.572 (values at L23 are unusually easy: ≈10 % of channels are one-signed offsets). K solo is lower (0.776–0.786).
bf16 ≈ fp8/2 + 0.25 on every family (the low 4 bf16 bits are noise). C2 never touched keys.
C1's goal was clarified twice by the human (10:15 UTC: deployment out of scope, explore the whole dictionary/delta
range; 11:00 UTC: the all-dictionary corner is stream compression → the read budget).

### 1.5 Two kinds of structure, C2 (notes/01 C, 03 §2; screen s-layer-b4k-r293 = one layer's entry, 512 B, blocks of 4096, budget 293)
Ladder (every row isolated-verified):
| coder | what changed | ratio |
|---|---|---|
| 71 (no linear prediction) | the tree coder of C1 on both heads | 0.69018 (r7-t0002) |
| 71 + prediction from the other head, 16 terms per channel | | 0.67746 (r7-t0001) |
| 74 | terms chosen one at a time until a term stops paying | 0.66641 (r7-t0003) |
| 80 | any earlier channel may be a term, either head | 0.65620 (r11-t0001) |
| 89 | positions stored more cheaply | 0.64704 (r11-t0003) |
| 102 | laid out along tree paths (reads one path, not whole levels) | 0.64494 (r11-t0002) |
| 111 | tree built on distance *after* prediction | 0.64352 (r22-t0001) |
| 114 | weights rounded by what each rounding costs in bits | 0.64167 (r22-t0003) |
| 126 | decoder blends ancestors' errors, no byte sent (on 102) | 0.64074 (r20-t0001) |
| 115 | head 0 first then head 1, no stored order | 0.64003 (r22-t0005) |
| 121 | 115 + refit slopes and tree | **0.63639** (env-t0096) |
On 5 sequences of target 02: 121 = **0.62970** vs 102 = 0.63848, difference −0.00878 on every sequence
(−0.00883/−0.00887/−0.00861/−0.00874/−0.00886), SD 0.0001; 121 reads 120 vs 103 entries' worth per cold decode.
- Overlap of the two gains (r11 iter-1-2, one block per layer): tree saves 0.064–0.142, prediction 0.055–0.095, the overlap is only 0.024–0.042.
- **Shuffle test** (r12 iter-1-2/1-3; blocks rebuilt from a layer's tokens drawn at random across both sequences, both heads of a token kept together): the tree coder's
  score worsens 0.6907 → 0.7520 (and 0.711 → 0.773 on another slice); the prediction gain barely moves
  (−0.0337 → −0.0344; −0.0232 → −0.0210). Repeats belong to the text; geometry belongs to the model.
- A prediction rule fit on *another* sequence recovers 91–96 % of the gain (r7 iter-1-2); the pattern of what is shared
  correlates 0.9995 between the two datasets (r9 iter-1-3, 10 sequences, Gaussian estimate).
- Storing the rule costs 0.013–0.021 of ratio at 4096 tokens (r22 iter-1-1). "Sparsity was a price": when every earlier
  channel is offered and bit-cost decides, more terms survive at fewer bits each (r22 iter-1-2). At L19 one tree over the
  token uses 4,103 terms inside head 0 and 29,835 from head 0 into head 1: head 1 is largely an image of head 0 (single blocks).

### 1.6 Cutting the tensor (notes/03 §1)
- Same-window comparison, 20 sequences of target 02, one 4096-token window each, encoded bytes (not isolated-verified):
  joining the two heads of a layer saves **0.0322** of ratio (spread over sequences 0.0009, 20 of 20);
  joining all six layers after that saves **0.0043** more (spread 0.0014, 20 of 20); coder 102 at head/layer, 94 at token,
  so the second gap is understated by ≈0.002.
- Heads: the same channel in the two heads has cosine ≈ 0.05 (unrelated), but the *distances* between tokens correlate up to 0.92
  across heads (r7 iter-1-1, 36 blocks): two views of one vector. Shared bits (r9 iter-1-2, 4 blocks, bound): 0.85 bit/element raw,
  0.54 after one reference serving both heads, 0.21 with separate references.
- Joining adjacent tokens loses: like-for-like, tok2 +0.037 and tok4 +0.063 of ratio against the same coder on layer entries (r12-t0004 vs its own layer score 0.6896).
- `regime` (layers 3+19+23, 7+11+15) beats `triple` (3+7+11, 15+19+23) by 0.0015 on 7 of 7 sequences: layers group by kind, not nearness.
- Free (unpaid) model reaches ≈0.677 / 0.641 / 0.618 at head / layer / token; real coders collected ≈90 % of the head→layer gap and ≈19 % of layer→token.

### 1.7 Codebooks and rotations (notes/03 §3; the primer's VQ and KLT rungs)
- Real coders, same screen, each stacked on linear prediction without a tree: RQ saves 0.0029 (r26-t0011, 14/14 segments, isolated),
  PQ 0.0017 (quick); both stay ≈0.05 behind a tree coder. Stacked on tree + prediction, the encoder chose no codebook on 72 of 72 blocks (r26-t0010).
- Why: a codeword is stored only to help others; a reference entry must be stored anyway, so using it costs a pointer (≈12 bits).
  On one block per layer the ratio falls at every step from 64 references to the whole tree (L3 0.6858 → 0.5737; L7 0.6838 → 0.6275; L19 0.7015 → 0.6403).
- Fixed rotations (DCT, Hadamard, random) lose by +0.28 to +0.32 bit per element (exact-model bounds, two heads, r11 iter-1-1):
  rotating then rounding costs ≈0.25 bit per element (the lattice constant 0.2546; measured 0.29–0.32). Linear prediction subtracts a guess and never rounds the vector.
  Channel numbers carry no neighbourhood: mean correlation at the same index equals any pair (0.0734 at L11), so a DCT has nothing to work with.
- Coder 129, the no-tree "pure vector codec" (mean, scale, linear prediction, one stream per entry; dictionary share 0.01–0.04):
  head 0.7348, layer 0.6863, pair 0.6696, regime 0.6667, triple 0.6652, token 0.6622 (r25-t0003/t0004, isolated).
  Against 102's 0.6449 on the layer screen it is 0.041 worse on 14 of 14 segments. The tree adds less as entries widen; block size does the opposite.
- Clusters exist in a minority of entries: on one L3 block RQ's saving comes 42 % from the top tenth of entries. PCA, OPQ, binary and LSH act on no cluster.
- Coverage of the close-enough family: 62 techniques, 21 with a real coder, 18 bound only, 16 untried, 7 do not apply (r25 iter-1-1). Not closed.

### 1.8 Time and bits (notes/03 §4, notes/02 §7)
- FLAC-style prediction along tokens (r16, bound, 4 blocks per series): an order-8 filter saves up to 0.33 bit alone, ≤ 0.06 after a reference;
  values are smooth along tokens in middle layers (one channel correlates 0.48 with the next token at L7/11/15; slowest directions up to 0.98),
  and the reference already collects it. Serial coding in time order gains 0.02–0.05 bit but needs the whole past: fails any read budget.
- Where references point (r6 iter-2-1, 24 blocks): parent within 8 tokens 37 / 47 / 39 % at L7 / L11 / L15 vs 9 / 7 / 12 % at L3 / L19 / L23;
  largest degree 6–10 vs 12–22; a pointer costs 6.6–7.4 vs ≈10 bits. Middle layers form chains along the text; the others form hubs on repeated tokens far apart.
- Adaptive filters (Monkey's Audio style) reach about a tenth of a block-shared rule: V changes its *state*, not its *weights* (r17).
- Neural network at L7 with no reference: 6.435 (no prediction) → 5.804 (linear) → 5.636 bits (network), one run, 45 % recovery in a control; with a reference it adds ≈ nothing (r21).
- Coder 126 (each entry blends its tree ancestors' errors while decoding, no byte sent): 0.64074 vs 0.64494, 72 of 72 blocks.
- At 512 tokens a rule *learned by the decoder* from already-decoded entries beats a stored one: 0.68938 (113, isolated, every entry counted) vs 0.6960 best fully paid.
- Values, not bits (r13 audit of C1's "mantissa is noise, floor 0.37"): the floor was false (a real one-head model from local history pays ≈0.50, 48 blocks),
  but C1's coders already modelled values; the framing cost at most 0.009 (exact model). Shared-bits estimate on values agrees with real code lengths
  (0.278 vs 0.263, r = 0.9993); on the FP8 code index it reads 0.104, three times too low: **the linear structure is in the values and the log grid hides it**
  — the primer's `homework-the-grid` and `plan-fp8-target` were right that the grid matters, and the campaign's answer was to model in value and integrate over the FP8 cell.
  Skew of the error: −0.03 in value, −1.60 in code index (r15). Any error-curve shape gains at most 0.014.

### 1.9 Reading one entry (notes/03 §5, notes/01 A, F; every entry counted cold, 5.3 M entries)
| screen | coder | ratio | reads mean / p99 / worst |
|---|---|---|---|
| head, 4096, budget 293 | 126 | 0.67408 | 68 / 123 / 171 |
| layer, 4096, 293 | 121 | 0.63639 | 120 / 184 / 226 |
| token, 4096, 293 | 116 | 0.63879 | 89 / 114 / 132 |
| layer, 4096, 293, 5 seq of target 02 | 121 | 0.62970 | 120 / 182 / 247 |
| token, 4096, 293, 5 seq of target 02 | 116 | 0.62910 | 90 / 120 / 136 |
| layer, 16384, 293 | 120 | 0.61768 | 141 / 190 / 229 |
| layer, 512, 293 | 113 | 0.68938 | 159 / 249 / 257 |
| head, 512, 293 | 109 | 0.71884 | 51 / 142 / 187 |
| layer, 4096, 137 | 97 | 0.65980 | 64 / 101 / 129 |
- A budget of 293 for every entry costs nothing at 4096 and above. Counting every entry (instead of 8 sampled per block) changed 4 of 19 winners
  and no headline; sampled maxima had run up to 26 % low; the worst entry reads 1.1–3.7× the mean (long chains). At 137 on layer entries the
  rule costs 0.0234 (121 does not fit, 97 does); no coder was tuned for its worst entry.
- **The dictionary share stopped mattering for tree coders.** 101 vs 91: x from 0.56 to 1.00 for +0.00004 (12 blocks, in-process); 109 at x = 1 is
  the incumbent on two screens. A reference entry costs the same per element inside the dictionary as outside (5.84 vs 5.85 bits at L11);
  the real price is a pointer. ≈80 % of coder 102's deltas are empty (the entry sits in the dictionary); the rest are 0.5–0.75 of a raw entry.
  All good tree coders sit at x ≈ 0.43–0.54. For no-tree coders (129) x = 0.02–0.04 is meaningful.
- Block size: 0.68938 / 0.63639 / 0.61768 at 512 / 4096 / 16384 (different screens; shape solid, third decimal not). The tree keeps gaining
  0.010–0.020 per doubling at 16k → 32k while the prediction's net gain has stopped by 32k; a nearest-neighbour bound says a pool of a whole
  sequence is 0.26–0.45 bit/element below a pool of 16384, with more than half of it arriving between 32k and 64k (one window). No saturating block size appeared.
- At 16k, everything other than the values themselves is ≈2 % of the ratio (prediction 0.005–0.007, parents 0.003, classes/flags/tables ≈0.003).

### 1.10 Where the bits come from (notes/02; r23, r9, r13; bounds and exact models, not coders; mostly 1–2 sequences, one window)
- Values are an exact function of the text and the weights: `V = W · h` per layer (h = normalised hidden state, W fixed 512 × 2048). Replaying the model
  with the capture's own code, checkpoint, torch 2.8 and GPU reproduced 50,331,648 value bytes exactly (first 8192 tokens of seq 0 + two 4096-token tails);
  the text costs ≈2.6 bits per token under the model, so with the same binary the ratio could be ≈0.0001.
- Any other arithmetic path (torch 2.11 + a stand-in loader, or float32) changes rounding in ≈28 % of FP8 cells: 1.2–1.4 bits per value remain
  (ratio 0.15–0.17). One window; the torch-version attribution is a reading, the control never finished.
- **The memory table** (seq 0, tokens 40960–43008, one window, logistic over the FP8 cell with per-channel scale fit in-sample):
  intact model 1.35 bits/value; attention cut beyond the last 16384 tokens 3.49; delta-rule state reset as well 5.16;
  intermediate rows 4.22 / 4.76 / 4.97. Coder 102 with no model at all: 5.13 (mean of 12 blocks over both sequences).
  **Caveats to state:** one window; "removal" masks only the final 2048-token chunk's attention; equality with 102 holds for the six-layer mean only
  (per layer ±1 bit: L3 3.86 vs 4.85, L11 5.97 vs 5.50). Strongest reason to think the block scope is nearly exhausted; also the result the supervisor
  "would most want repeated".
- A rule computed from the weights alone (Cholesky chain from W·diag(1+gain)) gets 72 % of the gain of a rule fit on the whole sequence (89 % at L19, 49 % at L3);
  under a smaller paid rule it would take 102 from 0.6407 to 0.6326 at 4096 and 0.7015 to 0.6723 at 512 (12 blocks, exact model). Illegal today: it is a shared table.
- A layer's values keep 30–38 % of that layer's hidden-state variance; all 12 views together 62–73 % (r23). Given all other parts, only the two heads share much
  (0.19–1.19 bits), adjacent layers 0.03–0.08, further ones ≈0.01 (r9).
- Metadata does not help: of the 4.89 bits left after a good coder, token id saves 0.004, role 0.0003, previous token 0.007, other layers 0.025 (24 blocks).
  74 % of a sequence's entries are new text and hold 75 % of the bits; re-read text costs 0.2–0.45 bit/value less.
- Block floor ≈0.60 at 16384 (unpaid dense model + reference, 4 blocks) and ≈0.57 for a whole sequence (extrapolation): direction, not measurement.
- The human's three decisions (2026-10-30/31): read budget for every single entry; delta lengths not counted; a shared table is legitimate
  (`decompress(delta, dictionary, shared_table)`, trained on an independent dataset) but no coder may use one until that dataset exists.

### 1.11 Signal or noise (notes/03 §6; the method)
- Between sequences a score moves by SD ≈0.012; the paired difference of two coders on the same blocks has SD 0.0001–0.001: 50 times quieter.
- Escalation held: 102 vs 89 −0.00210 (screen) → −0.00212 (5 seq, SD 0.00006); 89 vs 71 −0.0304 → −0.0315 (SD 0.0005); 100 vs 89 +0.0017 → +0.0019; 121 vs 102 −0.0086 → −0.0088 (SD 0.0001).
- **The trap:** the layer screen read 0.6449 and the token screen 0.6461, so layer looked better; on the same values token is better by 0.0043 on 20 of 20 sequences.
  The token screen happens to sample blocks 0.0046 harder for every coder. Scores from two screens can never be subtracted.
- C1 used a fixed detection limit of 0.002; paired, that is 5–30× the noise and hid real effects (a −0.0006 term with SD 0.00007 was graded as nothing). Dropped in C2.
- What makes a block hard is the text: one number per token window explains 97 % of block-to-block variance, shared by all layers and heads (r = 0.99 between heads,
  0.96 between L3 and L23), and it follows the share of repeated tokens (r = −0.91). A coder's *gain* belongs to the layer (99 % of its variance between layers).
- How the day ran (retro-review, SUPERVISOR.md): a crash at 12:35 UTC left 14 empty git objects, nothing lost; twelve researchers saturated 16 threads and one hard
  disk, verification took 50 minutes instead of 10, cut to seven; the status loop hung 55 minutes; a commit landed with 9 failing tests (commits now gated);
  two good coders were recorded `lossy` when their check only timed out (now `unverified`); 74 duplicate ledger rows from a script bug kept on the ledger.
  "Channel", "map", "block" and "detection limit" caused most of the human's confusion; the terminology file was written from the tensor afterwards.
- Thin spots the campaign names itself: all text is coding-agent prefills; most results are 2 sequences; the best coders reached 5 sequences at the very end;
  no holdout score in C2; whole-sequence blocks unknown; keys untouched in C2.

### 1.12 The primer's predictions, scored (notes/05 §1.6 → results above)
| primer said (page) | measured | verdict |
|---|---|---|
| solo ≈ 0.78 ideal – 0.88 fixed-length (`homework-solo-coding`) | 0.778 ideal six layers; 0.804 coded | confirmed |
| most gain in a few pre-RoPE key channels; values ≈ nothing; ρ ≈ 0.75–0.85 (`homework-where-bits-come-from`) | values: 0.63 at 4k, 0.62 at 16k (≈1.2–1.3 bits over solo); keys compress like values | wrong on values; keys fine; ρ far below 0.85 |
| ρ = 0.5 would need 2.5–3.2 bits saved per element (`homework-where-bits-come-from`) | best 0.618 = 1.3 bits saved; the exact-model floor inside a block ≈0.60 | arithmetic stands; 0.5 not reached inside a block |
| light dictionaries first; loc captures most (`homework-four-side-by-side`) | loc-like per-channel statistics are the solo baseline (0.80); the gain came from reference entries + linear prediction | loc alone: nothing beyond solo |
| KLT/rotation then round (`homework-klt`) | fixed rotations lose +0.28–0.32 bit; rounding costs 0.25 bit; prediction without rounding wins | the rounding tax was missed |
| VQ bounded by KLT + log₂C/d; "whether entries cluster is an open measurement" (`homework-vq`) | codebooks lose to reference entries; RQ +0.0029 only; clusters in a minority of entries | confirmed, and the reason named |
| sib: nearest sibling +0.37–0.5 bit *worse* than loc unless true twins exist (`homework-sib`) | true twins exist: the same token again, 55–78 % of nearest neighbours at L3; the twin ladder 0.80 → 0.67 | the "twins world" is the real one |
| fallen-apple: cheaper the *closer* the neighbour; curve over Δ (`idea-fallen-apple`) | adjacent tokens nearly useless at L3/19/23 (MI 0.058); references point to repeats far away; middle layers 37–47 % within 8 tokens | half wrong: distance is not the axis; repeats are |
| upstairs: adjacent layers share (`idea-upstairs`) | joining six layers saves 0.0043; given everything else adjacent layers share 0.03–0.08 bit; layers group by kind (3/19/23 vs 7/11/15) | small, and not by nearness |
| the grid matters; E4M3 index-space prediction loses below R² ≈ 0.7 (`homework-the-grid`) | shared-bits estimate 3× too low in index space; coders model in value and integrate over the cell | confirmed |
| block size: amortization floor 8w/b, drift sets a ceiling (`homework-amortization-rule`) | bigger blocks always win, ever more slowly; no ceiling appeared up to 32k; a whole sequence is best | no drift ceiling in this text |
| decision rule: g_req + g_blk ≥ 0.75 bit → go (`plan-decision-rule`) | gain over solo ≈1.2–1.3 bits at 4k–16k, all of it "scope" gain; but the split between request and block scope is inverted: the whole sequence beats any block | go, with the scopes reread |
| two rates ≈ 1 bit apart; fixed-length is the engineering number (`homework-two-rates`) | every coder here is an entropy coder (rANS); no fixed-length rate was measured | unmeasured |
| random access is the hard constraint (`idea-data-layout`) | a cold decode within 293 entries' worth costs nothing at 4k; a path layout made x = 1 cheap | easier than feared |
| economics: lever 1 alone ≈ 1.11× at ρ = 0.75; the prize is lever 2 (`questions-framework-d`) | deployment out of the campaign's scope; the light coder gives ρ ≈ 0.66–0.69 with a 2–4 % dictionary; tree coders need half the block resident | to be computed; see XI.13 |

## 2. The pages (content/11-measured/)

Each page: 600–1100 words, 1–3 `##` sections with ids, every section ends in `::: takeaway`, flashcards (≥1 per section),
at least one figure (builder names below) or table, numbers from §1 only (with receipts in an `::: aside source`).
Group labels for the sidebar are given.

| file | id | title | group | sections (ids) | figures | defines |
|---|---|---|---|---|---|---|
| 01-dispatch.md | measured-dispatch | A dispatch from the harness | Setting the stage | what-happened, headline, how-to-read-this-part | msrHeadline | campaign |
| 02-the-data.md | measured-the-data | The data on the table | Setting the stage | the-model, the-text, the-bytes | msrTensor | — |
| 03-rules-of-the-game.md | measured-rules-of-the-game | The rules of the game | Setting the stage | the-contract, the-square, the-budget | msrCurve | mdl-ratio, verified-result, entry-split, screen, read-budget |
| 04-night-one.md | measured-night-one | Night one: the twin ladder | What was found | the-floor, the-ladder, the-corner | msrLadderC1 | reference-entry, reference-tree |
| 05-two-kinds-of-structure.md | measured-two-kinds-of-structure | Two kinds of structure | What was found | the-rule, the-shuffle, whose-structure | msrLadderC2, msrShuffle | linear-prediction |
| 06-cutting-the-tensor.md | measured-cutting-the-tensor | How to cut the tensor | What was found | heads, layers, tokens | msrSplits | same-window |
| 07-codebooks-and-rotations.md | measured-codebooks-and-rotations | Codebooks and rotations | What lost | codebooks, rotations, the-pure-codec | msrCast | exact-model |
| 08-time-and-bits.md | measured-time-and-bits | Sound, time and bits | What lost | along-tokens, values-not-bits | msrTime | — |
| 09-reading-one-entry.md | measured-reading-one-entry | Reading one entry | What was found | the-budget-cost, x-stopped-mattering, block-size | msrReads, msrBlocks | — |
| 10-where-the-bits-come-from.md | measured-where-the-bits-come-from | Where the bits come from | What was found | computed-not-noisy, the-memory-table, the-wall | msrMemory | hidden-state, shared-table |
| 11-signal-or-noise.md | measured-signal-or-noise | Signal or noise | The method | pairing, the-trap, how-the-day-ran | msrNoise | paired-difference |
| 12-scorecard.md | measured-scorecard | The scorecard | What it means | predictions, properties | table (no figure) + msrScorecard optional | — |
| 13-what-it-means.md | measured-what-it-means | What it means for kv-blockdiff | What it means | the-decision-rule, the-miss-path, next | msrEconomics | — |

Cross-links writers must make: to `plan-harness-interface`, `plan-experiment-1b`, `plan-decision-rule`, `plan-data`, `plan-fp8-target`,
`questions-framework-b`, `questions-framework-a`, `idea-fallen-apple`, `idea-upstairs`, `idea-data-layout`, `idea-the-trap`,
`homework-solo-coding`, `homework-sib`, `homework-vq`, `homework-klt`, `homework-loc`, `homework-the-grid`, `homework-amortization-rule`,
`homework-economics`, `homework-calculator`, `homework-break-even`, `homework-scope`, `tiny-files-trained-dictionary`, `school-prediction`,
`school-mutual-information`, `landscape-kv-cache`, `papers-splitzip`. Themes to use where real: `predict-correct`, `side-info`, `amortize`,
`access-pattern`, `which-vs-what`, `bits-unit`, `noise-floor`, `every-tax`, `controls`, `grid-matters` (check `data/themes.yaml` for exact ids).

## 3. New terms (data/terms/measured-<writer>.yaml; cat and home as given; `[[=id]]` exactly once, on the home page)

| id | label | name | cat | home | short (1–2 sentences) |
|---|---|---|---|---|---|
| campaign | campaign | research campaign | project | measured-dispatch | One run of the autonomous research loop: several AI researcher agents writing and testing coders against one harness, under one set of rules, with every trial recorded. |
| mdl-ratio | MDL ratio | MDL ratio | info | measured-rules-of-the-game | (dictionary bytes + all delta bytes) ÷ raw bytes of a block; 1.0 means no compression; 8 × the ratio is bits per element. |
| verified-result | verified | verified result | project | measured-rules-of-the-game | A score whose every entry was rebuilt bit for bit by a separate decoder process from the stored bytes alone. Anything else is a block test, an exact model or a bound. |
| entry-split | entry split | entry split | project | measured-rules-of-the-game | Which elements form one entry: one KV head (256 B), one layer with both heads (512 B), or one token across all six layers (3072 B). |
| screen | screen | screen | project | measured-rules-of-the-game | A fixed test: a tenth of the blocks of two (or five) sequences at one entry split, block size and read budget. Two screens read different blocks, so their scores cannot be subtracted. |
| read-budget | read budget | read budget | systems | measured-rules-of-the-game | The most dictionary bytes a decoder may touch, starting cold, to rebuild one entry — counted for every single entry, in units of an entry. It keeps a coder from hiding the whole block in the dictionary. |
| reference-entry | reference entry | reference entry | coding | measured-night-one | An earlier entry of the same block, stored in the dictionary, that a coder uses as the prediction for another entry; the delta then codes the exact difference. |
| reference-tree | reference tree | reference tree | coding | measured-night-one | The links from every entry of a block to its reference entry; the best coders use the block's minimum spanning tree by distance, so each entry hangs off its closest relative. |
| linear-prediction | linear prediction | linear prediction across channels | coding | measured-two-kinds-of-structure | Guessing a channel's value from channels already decoded in the same entry, as a weighted sum; the table of which channels and which weights is stored once per block. |
| same-window | same-window comparison | same-window comparison | stats | measured-cutting-the-tensor | Two coders or two entry splits run on exactly the same elements; the only fair way to rank entry splits. |
| exact-model | exact model | exact-model estimate | info | measured-codebooks-and-rotations | The code length a model would reach, computed exactly on the data without building the coder; a lead, not a result. |
| hidden-state | hidden state | hidden state | llm | measured-where-the-bits-come-from | The vector a transformer carries for each token between layers; keys and values are fixed linear projections of it. |
| shared-table | shared table | shared table | project | measured-where-the-bits-come-from | A large data structure specific to no sequence and no block, prepared in advance and held by both sides, trained on an independent dataset; legitimate by the human's ruling, used by no coder yet. |
| paired-difference | paired difference | paired difference | stats | measured-signal-or-noise | One coder's score minus another's on exactly the same blocks, per sequence; its spread over sequences is the noise that matters. |

Writers: W1 owns `data/terms/measured-a.yaml` (campaign, mdl-ratio, verified-result, entry-split, screen, read-budget);
W2 owns `measured-b.yaml` (reference-entry, reference-tree, linear-prediction, same-window); W3 owns `measured-c.yaml` (exact-model);
W4 owns `measured-d.yaml` (hidden-state, shared-table, paired-difference). Before adding, `grep -rn "^<id>:" data/terms/`.

## 4. Figures (figures/measured.js, builders `FIG.msr*`; data in figures/data/measured-*.json)

Data files (produced by `analysis/measured_extract.py` from the ledgers where possible, else hand-entered with receipts in `analysis/measured_pages.json`):
- `measured-points.json`: every incumbent of STATUS.md and the C1 ladder rows: `{track, split, b, budget, coder, name, ratio, x, y, reads:{mean,p99,max}|null, trial, verified:bool, campaign}`.
- `measured-ladders.json`: `c1` rows (§1.4 table) and `c2` rows (§1.5 table) with `per_sequence` where the ledger has it; `blocks`: C1 512/4k/16k/32k and C2 512/4k/16k.
- `measured-splits.json`: same-window means and spreads (§1.6), 129 by split (§1.7), shuffle numbers (§1.5), free-model numbers.
- `measured-reads.json`: the every-entry table (§1.9) and the reads-vs-ratio curve from `research/agents/env/pages/reads-recheck.json` / article 06 if recoverable.
- `measured-memory.json`: the memory table (§1.10) and the 102 yardstick; the floors.
- `measured-noise.json`: per-sequence ratios of 102 (r24-t0002) and 121 (env-t0096) on the 5 sequences; the escalation table.
- `measured-time.json`: FLAC/NN numbers and the where-references-point table (§1.8).

Builders:
| builder | page | what it draws |
|---|---|---|
| msrHeadline | XI.1 | horizontal bars in bits per element: raw 8; solo ideal 6.22 (0.778); C1 twin ladder 5.38 (0.6731, L3 h0); C2 4k 5.09 (0.6364) and 5.04 (0.6297, 5 seq); 16k 4.94 (0.6177); the exact-model block floor ≈4.8 (0.60, dashed, "estimate"); the primer's go-threshold rule at solo − 0.75 bit. |
| msrTensor | XI.2 | a Diagram: the value tensor of one sequence as (tokens × 6 layers × 2 heads × 256) with the three entry splits outlined; readouts of bytes per entry and per sequence. |
| msrCurve | XI.3 | the compressibility square: x = dictionary share, y = delta share, baseline line x + y = 1, dashed solo line at 0.778, iso-lines of constant ratio; verified points from measured-points.json coloured by entry split (`series`), hover = coder, screen, ratio, reads; toggle C1 / C2; a highlighted point for 129 (tiny x) and 109 (x = 1). |
| msrLadderC1 | XI.4 | horizontal bars of §1.4 with rules for solo ideal (0.7999) and baseline (1.0); hover = trial id; a second panel or toggle for block size 512/4k/16k/32k. |
| msrLadderC2 | XI.5 | the §1.5 ladder as bars; 121 vs 102 on 5 sequences as five paired points. |
| msrShuffle | XI.5 | grouped bars: tree coder original vs shuffled (0.6907 → 0.7520), prediction gain original vs shuffled (−0.0337 → −0.0344, −0.0232 → −0.0210). |
| msrSplits | XI.6 | two panels: (a) same-window gains with spreads (heads −0.0322 ± 0.0009; layers −0.0043 ± 0.0014; tok2 +0.037; tok4 +0.063); (b) coder 129 by entry split. |
| msrCast | XI.7 | bars on the layer screen: solo ideal 0.778; 129 prediction only 0.6863; 129 + RQ 0.6834 (derived: RQ's −0.0029 was measured on coder 128's own prediction-only control, r26-t0002 → r26-t0011; mark as derived); tree 102 0.6449; tree+prediction 121 0.6364; with the fixed-rotation penalty (+0.28–0.32 bit) as a hatched bar above 129. |
| msrTime | XI.8 | (a) bits at L7 without a reference: 6.435 / 5.804 / 5.636; (b) where references point: within-8-tokens share by layer. |
| msrReads | XI.9 | the every-entry table as a dot plot: ratio vs worst-entry reads, with the 137 / 293 budgets as rules; hover = coder, screen. |
| msrBlocks | XI.9 | ratio vs block size (log2): C1 line (512…32k, L3 h0) and C2 line (512…16k, layer entries); the exact-model whole-sequence floor dashed. |
| msrMemory | XI.10 | bars: 1.35 / 3.49 / 4.22 / 4.76 / 4.97 / 5.16 and coder 102 at 5.13, with the caveat in the KPI subtitle ("one window"). |
| msrNoise | XI.9/11 | five sequences on the x axis, ratio of 102 and 121 as two lines (parallel), and a bar pair: between-sequence SD 0.012 vs paired SD 0.0001. |
| msrEconomics | XI.13 | the site's requests-per-GPU formulas (copy from figures/homework-b.js, hwbCalculator / anatomy) with selectable ρ from the measurements: HiSparse (ρ = 1); solo ideal 0.78; the light no-tree coder (ρ ≈ 0.69 layer, w/b = 0.02, all resident); the tree coder as "half the block resident" (w/b = 0.52, deltas 0.11 of raw on average); request-scope exact-model floor 0.60 (hypothetical). Caption must say which numbers are measured and which are assumed (f_D, n_load). |

Rules: colours via CSS variables; `series(i)` by entity; legends; readouts for key numbers; mark exact-model and one-window numbers as such in captions; data files fetched from `KV.prefix + 'assets/figs/data/…'`; fail loudly.

## 5. Site edits outside the Part (orchestrator does these)
- `data/parts.yaml`: append Part XI. `theme/assets/css/tokens.css`: `--part-XI: var(--sky)`. `theme/layouts/home.njk`: "Ten parts" → "Eleven parts".
- `content/index.md`: "nobody has measured yet" → point to XI; a fourth way in: "Just the results".
- `content/10-reference/01-summary.md`: a `## What was measured {#measured}` pointer section; soften the "Unmeasured at 8 bits" line with a forward link; fix the card.
- `content/04-idea/08-fallen-apple.md`, `content/06-homework/12-where-bits-come-from.md`, `content/09-plan/15-risks.md`: one `::: note connection` each pointing forward.
- `docs/PAGEPLAN.md`: add XI's plan. README: mention Part XI and `experiment_repos/`.

## 6. Corrections after data extraction (2026-10-31)
- Escalation screen-side numbers: 89 vs 71 is −0.0304 on the screen (not −0.0305); 100 vs 89 is +0.0017 on the screen and +0.0019 on five sequences.
- Coder 21's status-ok trial is r1-t0021; r1-t0018 carries the same score but failed the (then mistimed) decode gate.
- Between-sequence SD ≈0.012 is a 20-sequence page figure (r12 iter-1-2); the ledger's 5-sequence SDs are ≈0.007 (121, 102) and 0.015 (94, 10 sequences).
- `129 + RQ 0.6834` is derived; the ledger pair is coder 128 with and without RQ, 0.69716 → 0.69421.
- The data files are in figures/data/measured-*.json, produced by analysis/measured_extract.py (ledger commit f455ef9); hand-entered page numbers with receipts in analysis/measured_pages.json.
