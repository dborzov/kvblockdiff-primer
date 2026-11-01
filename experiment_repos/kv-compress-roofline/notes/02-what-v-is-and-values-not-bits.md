# Fact-check: "What V really is" (article 08) and "Values, not bits" (article 03)

Checked 2026-10-31 against the campaign's own records in `/attic/d/kv-compress-roofline`
(read-only). Sources: `docs/concepts/terminology.md`; `research/agents/env/pages/articles/08-what-v-really-is.md`,
`03-values-not-bits.md`, `04-codebooks-and-transforms.md`, `09-what-it-all-says.md`;
r23 pages `research/agents/r23/pages/iter-1-{1,2,3,4}.md`, r23 journal `research/agents/r23/journal/SESSION-001.md`,
r23 code `research/agents/r23/analysis/*.py`; r9 pages `iter-1-1..6`; r13 pages `iter-1-1..5`; r15 `iter-1-1`;
r11 `iter-1-1`; `research/KNOWLEDGE.md` tags `[net/*]`, `[map/*]`, `[value/*]`, `[pdf/skew]`, `[transform/*]`;
the scoring library `research/agents/r6/analysis/clen.py`; target READMEs.

**One fact that frames everything below: the raw outputs are gone.** Every r23 script writes to
`/var/tmp/kvcr-r23/` and `research/agents/r23/analysis/out/`; neither exists any more. The numbers survive
only in the pages, the journal and KNOWLEDGE.md (which agree with each other). Re-deriving them means
re-running the GPU replays. I have therefore checked (a) that each number is stated consistently across
page, journal and KNOWLEDGE, (b) that the code does what the page says it does, and (c) the arithmetic
that links numbers to each other.

## 0. Four words, and how "bits" were measured

**Plain-English glossary.**

- **Hidden state h.** At each layer the LLM carries, for every token, a list of 2048 numbers that summarises
  what it currently "thinks" about that token in context. Just before the V projection this list is
  normalised (RMSNorm with a learned per-number gain), so its overall size is almost always the same
  (rms 1.0 to 1.2).
- **The V projection W.** A fixed 512 × 2048 matrix of learned weights, one per full-attention layer, with no
  bias. V = W · h. The 512 outputs are cut into two KV heads of 256. So V is 512 fixed weighted sums of the
  2048 hidden numbers: a partial, fixed "view" of h.
- **Attention memory.** The six full-attention layers keep K and V for every earlier token; a new token can
  look back at any of them. This is the memory the cache itself *is*.
- **Gated DeltaNet state.** The 18 other layers are linear-attention layers. Each keeps a running matrix
  memory (16 heads × 128 × 128 numbers, about 4.7 million numbers per position across layers) that is
  updated at every token with learned forgetting rates and carried along the whole sequence. It is not
  stored in the KV cache; it is the LLM's other long memory.

**How every "the LLM predicts the stored byte at X bits" number was computed** (`clen.fit_scale`, called
from `a16_memory.py`, `a10_numerics.py`, `a13_bits.py`, `a11_pred.py`, `a14c_stack.py`):

- The predicted value (the replayed V, or a linear prediction) is the *centre* `loc` of a **logistic**
  distribution in value space (not Gaussian; logistic scale = sd · √3/π, the coders' own model since coder 18).
- Its probability mass is **integrated over the real width of the stored FP8 cell** (cell edges = midpoints
  between adjacent FP8 grid values, 253 symbols). Bits = −log2 of that mass, with the coder's +1-count
  table quantisation at 16-bit precision (`exact=False`, within ~1e-4 bit of the Rust coder).
- One scale per elephant line (512 per layer entry) is **fitted in-sample on the window**, and each entry
  picks the best of **8 per-entry scale classes** (×2^(k/2)) in-sample. Neither is charged. Their price
  would be ~512 bytes + 3 bits per entry ≈ 0.01 bit/value on a 2048-token window: negligible, but the
  numbers are strictly "model" numbers, not real bytes.
- The rANS stream overhead (14.5 bits per entry, ~0.03 bit/value for 512-wide entries) **is** included.

So "predicts to 1.35 bits" means: the cross-entropy of the stored FP8 byte under a logistic centred on the
replayed value, integrated over the byte's FP8 cell, with the best per-line scale.

---

## Claim 1 — "V is an exact function of the text"

**Claim (article 08).** Replaying the LLM reproduced 50,331,648 V values byte for byte; the text costs ~2.6
bits/token under the LLM; so MDL ≈ 0.0001 would be possible with the same weights and the same binary.

**Where stated.** r23 `iter-1-1.md` (table "check / values compared / identical"), journal 17:21 and 17:30,
KNOWLEDGE `[net/replay]`.

**Evidence found.**

- `a03_replay.py` runs the capture's *own* standalone PyTorch model code
  (`/attic/fast-kvcache/hg-transformers-clean/standalone/llms/qwen3_5_2b/variants/baseline`, commit `625b996`
  per the target README), the capture's checkpoint (`.../qwen3_5_2b/safetensors`), in the **capture's own venv**
  (`/attic/fast-kvcache/benchmarks-kv/.venv`, which holds `torch-2.8.0+cu129`), with the capture's 2048-token
  prefill chunks, and compares `cache.value_cache[l]` (bf16) with the export's bf16 `kv` tensor by exact `==`.
- **Same machine:** the capture was on host `kalkan`, RTX 5080 (target README); the replay ran on `kalkan`
  (hostname checked), same GPU.
- **Windows:** first 8192 tokens of sequence `0000` (6 layers × 2 heads × 256 × 8192 = 25,165,824 values);
  the last 4096 tokens of an 81,920-token prefix of `0000` (12,582,912) and of `0001` (12,582,912).
  25,165,824 + 2 × 12,582,912 = **50,331,648**. Arithmetic checks. The second and third rows depend on
  everything before them, so they prove the checkpoint and the determinism. Whole sequences (228K) were not
  replayed; 82K of 228K on 2 of 30+3 sequences.
- bf16 equality implies FP8 equality (FP8 is a deterministic rounding of bf16/scale; `a10_numerics.py`
  checks `fmt.from_float(V/scale) == stored fp8` on the stored bf16).
- `a04b_check.py`: multiplying the *captured* h by W and rounding through bf16 reproduces 99.99 % of stored
  FP8 cells (float32 rounding straight to FP8 gives exactly 31/32 because of ties).
- **Text cost:** `run()` computes −log2 p(token_{t+1} | prefix) from the model's own logits over the
  81,920-token prefixes: 2.48 bits/token on `0000`, 2.73 on `0001` (journal 17:21). Tool calls 1.2–1.3,
  tool output 3.7–4.1; order-0 entropy of ids 9.74.
- **The 0.0001:** a token has 3072 FP8 values = 24,576 bits; 2.6 / 24,576 = 1.06 × 10⁻⁴. It is pure
  arithmetic from the two measurements, and it charges nothing for the weights or the binary (both are a
  "shared table", not allowed today).

**Verdict: CONFIRMED** as a measurement and as arithmetic. The page itself (`iter-1-3`) corrects the
claim to require *the same arithmetic*, and article 08 carries that correction.

**Strength.** Exact equality, so no statistics needed; but 2 sequences, 82K-token prefixes, one capture
environment. The bits/token are prefix means on those 2 sequences. Raw NLL arrays are gone.

**Mechanism, plainly.** The KV cache is not a recording of anything noisy; it is the output of a
deterministic computer program (the LLM) run on the text. Run the same program, on the same machine,
with the same libraries, on the same tokens, and you get the same bytes, all 50 million of them. So a
decoder that *owned* the program would need only the text, which the LLM itself can compress to about
2.6 bits per token — against 24,576 bits of V per token. That is a floor for a decoder with the whole LLM,
and a useless coder, because decoding would mean running the LLM.

---

## Claim 2 — "The noise is in the arithmetic"

**Claim.** A different binary/torch version changes rounding and leaves 1.2–1.4 bits/value (ratio 0.15–0.17).

**Where stated.** r23 `iter-1-3.md` (table "computation path"), journal 18:03/18:11/18:30, KNOWLEDGE
`[net/rounding]`.

**Evidence found.**

- `a09_gpu3.py` ("numerics") runs the same model code and checkpoint in **this project's venv**
  (`torch-2.11.0+cu128`), with a stand-in `safetensors` loader (`w.py`, reads the same bytes in stored dtype)
  and a stub `tokenizers` module, on the first 8192 tokens of `0000` at chunk 2048 / 4096 / 1000 / 512 / 256,
  plus the whole model in float32 at chunk 2048. `a10_numerics.py` scores the stored FP8 against each path
  on tokens 2048–6144 (4096 entries per layer; the first 2048 skipped as shared template).
- Table (page = journal): torch 2.11 chunk 2048: 16 % of bf16 values identical, 28 % of FP8 cells changed,
  **1.39** bits/value (logistic), 1.24 (plug-in table, no pdf); chunks 4096/1000/512/256: 1.39/1.41/1.41/1.44;
  float32: 0 % bf16 identical, 27 % cells changed, **1.35** / 1.19. By layer 1.16 (L3) to 1.61 (L19).
  Rms difference 0.7–1.8 % of V's SD. 8 × 0.15 = 1.2, 8 × 0.17 = 1.36: the ratio range checks.
- Within torch 2.8 itself, changing only the prefill chunk size already changes bf16 V (78 % identical at
  chunk 4096, 14 % at chunk 1000; `iter-1-1`, journal 17:21), which shows the arithmetic path matters even
  inside one binary (and contradicts the capture code's docstring).
- `a10c_joint.py`: a chain across elephant lines does not reduce this (1.26 vs 1.18 at L3; worse everywhere).

**What differed, exactly.** torch 2.8.0+cu129 (capture) vs torch 2.11.0+cu128 (project venv), *and*
a stand-in weight loader, *and* module stubs. **Is the cause explained? No, and it is slightly weaker than
"unexplained":** the journal (18:03) says "Needs the loader ruled out: the same stand-in loader under the
capture's torch 2.8 is running"; that control job stalled in page faults and was **killed at 18:20 without
running** (journal 18:17–18:20, DIGEST "r23.H7"). So the attribution to the torch build is the researcher's
reading; the loader has not been excluded (it is an unlikely culprit, since it reads identical bytes, but it
was not tested). The float32 run, which shares no bf16 kernel with either build, lands at the same level,
which supports "any different arithmetic path costs ~1.3 bits" without proving which component differs.

**Verdict: CONFIRMED (numbers), PARTLY (explanation).** Article 08 does say the cause was not proved.

**Strength.** One window (tokens 2048–6144) of one sequence; 6 arithmetic paths that all agree with each
other within 0.1 bit. Exact-model bits, in-sample scale.

**Mechanism, plainly.** The LLM does billions of bf16 multiplications, each rounded to 8 significant bits.
A different library version, or a different batch shape, orders those operations differently, so the
rounding errors differ and propagate through 24 layers. The resulting wobble is tiny in size (about 1 % of
V's spread), but FP8 cells are narrow, so 27–31 % of the stored bytes land in a neighbouring cell, and
telling which costs about 1.3 bits each. Halving an error only saves one bit, which is why a 1 % wobble
still costs a quarter of the coder's bits.

---

## Claim 3 — The memory-removal table (the "central measurement")

**Claim.** Intact LLM 1.35 bits/value; attention cut beyond 16384 tokens → 3.49; delta-rule state reset too →
5.16; coder 102 with no LLM pays 5.13. One 2048-token window of one sequence.

**Where stated.** r23 `iter-1-3.md` (table "what the network is missing"), journal 18:31, KNOWLEDGE
`[net/memory]`, `fig-08-memory.svg`.

**Exact numbers (journal 18:31, by layer L3 L7 L11 L15 L19 L23 = mean):**

| row | L3 | L7 | L11 | L15 | L19 | L23 | mean |
|---|---|---|---|---|---|---|---|
| nothing removed (torch 2.11 rounding) | 1.148 | 1.278 | 1.419 | 1.495 | 1.566 | 1.167 | **1.345** |
| attention limited to last 16,384 | 1.15 | 3.30 | 4.58 | 4.44 | 4.13 | 3.36 | **3.494** |
| attention limited to last 2,048 | 1.15 | 4.26 | 5.47 | 5.32 | 4.96 | 4.17 | 4.221 |
| attention limited to last 256 | 1.15 | 4.88 | 6.04 | 5.96 | 5.64 | 4.88 | 4.759 |
| delta-rule state reset at T | 3.86 | 5.45 | 5.80 | 5.39 | 5.13 | 4.19 | 4.970 |
| both: reset + attention 2,048 | 3.86 | 5.39 | 5.97 | 5.71 | 5.43 | 4.62 | **5.164** |

**The window.** Sequence `0000` of `03_smoketest`, tokens **40,960 to 43,008** (T = 40960, S = 2048).

**How the removal was done** (`a09_gpu3.py`, branch `"memory"`):

1. Prefill tokens 0..40959 at chunk 2048 **under torch 2.11** (so the "nothing" row already carries the
   claim-2 rounding; "each row sits on top of the 1.35", page's words).
2. Save the KV caches and the DeltaNet recurrent and conv states at T.
3. Run the next 2048 tokens as one chunk, six ways:
   - `exact`: nothing changed.
   - `cutL`: the causal attention mask has `m[..., :T−L] = False`, so the new chunk's queries cannot attend
     to tokens earlier than T−L. **Only the new chunk is affected**: the K/V of tokens 0..T−1 (which the chunk
     still attends to within the window) and the DeltaNet state at T were computed with full memory.
   - `rec0`: the DeltaNet recurrent states are zeroed at T (conv states kept); attention still sees all
     40,960 earlier K/V, which were themselves computed with the full state.
   - `rec0cut2048`: both.
4. `a16_memory.py` scores each variant's V as the logistic centre for the stored FP8 bytes (see §0):
   `clen.fit_scale(codes, loc = V_variant/scale, classes=8)`, per layer, 2048 × 512 values. Not Gaussian:
   a logistic, one fitted scale per elephant line, 8 per-entry classes, integrated over the FP8 cell.

**The coder yardstick.** 5.13 = 8 × 0.6407, coder 102's real MDL (dictionary included) averaged over the
**12 blocks** of `a06_resid.py`: 6 layers × **both** dev sequences, b = 4096, block start 40960
(`iter-1-2` table, column "102, paid map"; DIGEST). So the LLM row is one sequence × 2048 tokens while the
coder row is two sequences × 4096 tokens.

**A layer-by-layer look the article does not give.** Coder 102 per layer (8 × `iter-1-2` column 1):
L3 4.85, L7 5.16, L11 5.50, L15 5.69, L19 5.22, L23 4.32. Against the "both removed" row: at **L3 the
memory-less LLM is a full bit better than the coder (3.86 vs 4.85)**; at L7–L23 the coder is 0.2–0.5 bit
better (e.g. L11 5.50 vs 5.97). The headline "5.16 ≈ 5.13" holds for the six-layer mean only; the layers
differ by about ±1 bit in opposite directions. The page notes that L3 does not move under attention cuts
(V at L3 is formed before any full-attention layer has run), which is a good internal check.

**Verdict: CONFIRMED** (numbers, window, scoring, and the article's own caveats).

**Strength.** This is the campaign's most important and least sampled number: **one window, one sequence,
2048 tokens, one torch build**, exact-model bits with in-sample scales. The "memory removed" rows are
*perturbations of the final chunk*, not a clean "LLM that only ever saw the last L tokens" — that clean
experiment (the cold-start curve, `a15_window.py` / `a09 window`) stalled and never produced numbers. The
attention-cut rows still carry full memory in the DeltaNet state and in the earlier K/V; the reset rows
still see fully-informed K/V. Both r23 and articles 08/09 say it should be repeated on many windows and on
`02_qwen`; nothing in the repo shows that it was.

**Mechanism, plainly.** Take the real LLM and let it re-compute the cache for a stretch of text, but blind it
in one way at a time: forbid looking back more than 16,384 tokens, or wipe the running matrix memory the
linear-attention layers carry. The more memory you take away, the worse its guess of the stored bytes gets:
1.3 bits with everything, 3.5 without far look-back, 5.2 without look-back and with the running memory
wiped. A plain compressor that knows nothing about the LLM, only the bytes in a 4096-token block, pays
about 5.1. The reading: what the compressor cannot predict is precisely what the LLM remembers from text
tens of thousands of tokens earlier, and no block of 4096 tokens contains that.

---

## Claim 4 — "A rule computed from the weights W alone gets 72 % of the gain"

**Claim.** 72 % of the gain of a rule fit on the whole sequence (89 % L19, 49 % L3); would take coder 102
from 0.6407 to 0.6326 at 4k and from 0.7015 to 0.6723 at 512.

**Where stated.** r23 `iter-1-2.md` (both tables), `iter-1-4.md` (b = 512), KNOWLEDGE `[net/nodata]`,
`[net/stack]`, DIGEST.

**How the weights-only rule was derived** (`a13_bits.py`, `a14c_stack.py`, `a08_nodata.py`):

- Build the covariance V *would* have if the hidden state were white after the norm gain:
  `Cm = M Mᵀ` with `M = vstack_l( W_l · diag(1 + w_l) / scale_l )` (V projection times the RMSNorm gain,
  per layer FP8 scale). This is "W D Wᵀ" on the page. No forward pass, no data. It is **not** derived from
  GQA head sharing as such; the two heads' overlap (`W_a W_bᵀ`, `[net/overlap]`) is simply the cross-head
  block of this matrix.
- Turn `Cm` (plus a ridge, best of {0.1, 0.01, 0.001}) into a **chain**: the unit lower-triangular Cholesky
  factor gives, for each elephant line, a linear prediction from the lines decoded before it in the same
  entry (`P = I − T`). Location: `loc_i = m_i + a_i · Σ_{j<i} P_ij (x_j − m_j)`, with `m` the block mean and
  `a_i` one free gain per line fitted on the block (free in `a13`; charged 1 byte per line in `a14c`).
- Bits via the same logistic-over-FP8-cell machinery (§0). Compared with chains from: random-token
  covariance, the LLM's own "dream", the other sequence's real covariance, and the same sequence's real
  covariance (in-sample ceiling).

**Numbers and arithmetic.** Layer entries, no reference, 12 blocks (6 layers × 2 sequences, tokens
40960–45056): none 0.7797, weights 0.7269, random 0.7389, dream 0.7245, other seq 0.7109, same seq 0.7066.
Share = (0.7797 − 0.7269)/(0.7797 − 0.7066) = 0.0528/0.0731 = **72 %**. L19: 0.0911/0.1021 = **89 %**.
L3: 0.0268/0.0548 = **49 %**. All check. The no-reference gain was also replicated on 5 dev sequences of
`02_qwen` (L7 0.0536, L11 0.0539, L19 0.0766 vs 0.0522, 0.0531, 0.0760 on `03`; `a13b_t02.py`).

**Under coder 102.** `a14c_stack.py` takes 102's real reference and rows on the 12 real blocks, puts the
weights chain under 102's own sparse-map selector (`_fit_rows`/`pack_map`) in **one** causal order (the
first attempt `a14b` mixed two orders and was not a valid code; caught and kept as a warning): 0.6407 →
0.6326 (Δ −0.0081, 12/12 blocks, range −0.0055 to −0.0140, sequences within 0.0008 per layer); map 0.0161 →
0.0103 of raw. At b = 512: 0.7015 → 0.6723 chain alone (Δ −0.0292, 12/12). Exact model; no coder built;
"illegal today" (a shared table needs the independent training set the human asked for).

**Verdict: CONFIRMED.**

**Strength.** 12 blocks, 2 sequences, one block position; exact model, not real bytes; paired on the same
bytes so the sign is solid. Two things flatter both sides equally: the per-line gain is fit on the block and
the ridge is the best of a small grid (later shown flat). The "whole-sequence rule" ceiling is in-sample.
The first, variance-based version of the 72 % figure was *withdrawn* and the exact-bits version happened to
land at the same number — the page says so.

**Mechanism, plainly.** Because V = W · h, the way the 512 numbers of V co-vary is largely dictated by the
fixed matrix W: two output lines whose rows of W point in similar directions will always move together,
whatever the text. So you can write down a decent "guess line i from lines decoded earlier" rule using only
W — no data — and it recovers about three quarters of what a rule fitted on a whole 228K-token sequence
recovers (almost all of it at layer 19, where the two heads' rows of W overlap most; half at layer 3,
whose heads are nearly as different as random). The catch: a decoder is not allowed to carry W today.

---

## Claim 5 — "A layer's V keeps only 30–38 % of hidden variance; all 12 views 62–73 %"; conditional sharing

**Claim.** (a) 30–38 % / 62–73 %; (b) given all other parts, only the heads keep much (0.19–1.19 bits),
adjacent layers 0.03–0.08, further ≈0.01.

**Where stated.** (a) r23 `iter-1-2.md` ("The other limit on V is what it can see"), KNOWLEDGE `[net/view]`
— **not r9**; article 08 blurs the attribution. (b) r9 `iter-1-1.md` ("The direct links"), KNOWLEDGE
`[map/depth]`.

**Evidence found.**

- (a) `a12_rank.py`: Cov(h_l) from replayed hidden states of ~80K tokens of each dev sequence (`a09 covh`,
  12288 × 12288, first 2048 tokens skipped). `see = tr(Q Qᵀ C)/tr(C)` with Q an orthonormal basis of W_l's
  row space (512 of 2048 dims): 30–38 % (random W would give 25 %). "All 12 views": held-out linear R² of
  h_l from `[W_j h_j]` for all 12 (layer, head) cells, fit on `0000`, tested on `0001`, ridge 1e-4: 62–73 %
  (one head 27–48 %, both heads 51–61 %). Also: h at the next attention layer is only 46–67 % linearly
  predictable from all of h.
- (b) r9 `iter-1-1`: Gaussian mutual information, fit on one sequence (227,840 tokens), evaluated on the
  other, divided by 256; "direct links" = MI conditional on the other ten cells. Heads 0.19–1.19; adjacent
  0.03–0.08; two apart 0.01–0.03; further ≈0.01. Shuffle control ±0.001. r9 `iter-1-3` validates the
  Gaussian estimator against exact chain-rule code lengths (unconditional: 0.278 vs 0.263, r = 0.9993) and
  shows the *raw* matrix is stable across 10 sequences of `02_qwen` (SD 0.011–0.049); the *conditional*
  numbers were computed on the 2 `03` sequences only.

**Verdict: CONFIRMED** (with attribution of (a) to r23, not r9).

**Strength.** (a) 2 sequences, fit/test split, Gaussian/linear quantities on 80K-token covariances.
(b) 2 sequences, Gaussian estimator (neither an upper nor lower bound on true MI, as r9 says), validated
in level against exact code lengths on 4 blocks.

**Mechanism, plainly.** V is 512 fixed weighted sums of a 2048-number hidden state, so it sees only a slice
of it: about a third of the hidden state's variation at that layer, and even all twelve slices (six layers ×
two heads) together see about two thirds. Across depth the picture is a chain: once you know the neighbouring
layers' V, a far layer tells you almost nothing new, because information flows layer to layer. The two heads
of one layer are different: they are two views of the *same* h through two halves of the same W, so given
everything else they still share up to 1.19 bits per value (at layer 19).

---

## Claim 6 — "Metadata does not help"

**Claim.** Of 4.89 bits, token id saves 0.004, role 0.0003, previous token 0.007; 74 % of entries are new
text holding 75 % of bits; re-read text costs only 0.2–0.45 bit/value less.

**Where stated.** r23 `iter-1-3.md` ("What predicts what the frontier leaves"), KNOWLEDGE `[net/residual]`;
r13 `iter-1-2.md` ("Where the frontier's 5.46 bits go"), KNOWLEDGE `[value/new-text]`.

**Evidence found.**

- `a06_resid.py` runs coder 102 (`102-path-rows`, params of trial `r11-t0002`) in process on real `layer`
  blocks of `03` dev at b = 4k and records, for every coded row, the location the coder used and the stored
  code. `a11_pred.py` then adds each candidate as a correction to that location with one gain per line
  (clipped 0–1, fit with error-energy weights on the test block, "not charged, ~0.0002 of MDL") and refits
  the scale model (§0); the saving is the difference in bits. Candidate tables (mean residual per token id,
  per id pair, per role, per chunk phase, first-vs-later reading) are built on the **other** sequence's
  blocks; the dense "previous token" and "other five layers" ridge maps are fit on the other sequence too.
  24 test blocks (start-16384 blocks skipped "to fit the session"); base 4.89 bits/value (the coded rows'
  cost, excluding dictionary). Results: id 0.004, id pair 0.002, role 0.0003, first reading 0.0004, chunk
  phase 0.0002, previous token 0.007, other layers 0.025 (L15 0.044). Metadata does predict *hardness*
  weakly (held-out R² of log error energy 0.05–0.23 from id frequency, LLM surprise, first reading).
- `a12_reading.py` (r13): suffix array over token ids; `Lbefore` = longest history a token shares with any
  earlier position; new text = `Lbefore < 8`. Bits per entry from `clen.fit_ref` (coder 50's frontier model
  on the full MST parent, tables not charged), 4k blocks, **head entries, head 0**, both dev sequences of
  `03`: 74 % of entries new, 75 % of bits; re-read text L3 5.03 vs 5.47, L11 5.68 vs 5.89 (0.2–0.45 less).

**Verdict: CONFIRMED.**

**Strength.** 24 blocks / 2 sequences (r23), exact model, candidates limited to the listed hand-made
features (no learned model of the text; r21's flexible network found 0.002–0.005, per the page). The gain
per line is fit on the test block, so the tiny numbers are if anything slightly optimistic. r13's new-text
split is on head-0 entries with coder 50's model, not coder 102.

**Mechanism, plainly.** After a good block compressor has done its work, what is left looks the same
whether the token is "def" or a comma, whether it is a tool call or user text, and whether it has been read
before. Knowing those facts about a token saves hundredths or thousandths of a bit of about five. Even
knowing the compressor's leftover error at the previous token, or at the five other layers of the same
token, saves little. Three quarters of the text in these transcripts is being read for the first time, and
even text the model re-reads is only 0.2–0.45 bit cheaper, because the earlier reading usually lies outside
the block, and when it is inside, the two readings still differ by a plateau that does not shrink.

---

## Claim 7 — The values-not-bits audit

**Claims (article 03).** C1: "mantissa is noise, all compressible info in sign+exponent, floor 0.37"; r13:
floor false (true ≈0.50), framing cost at most 0.009; r9's shared bits on values 0.278 vs real code 0.263
(r = 0.9993) but 0.104 on code index; skew −0.03 (value) vs −1.60 (code index); rotating then rounding
costs ≈0.25 bit/value.

**Where stated and how measured.**

- **C1's 0.37.** r13 `iter-1-3` reads the C1 script: order-0, per-channel bit fields, V L3 h0 only;
  H(mantissa | sign, exponent, channel) = 2.93 of 3 bits; 2.93/8 = 0.366 → "0.37". It conditions on no
  prediction and assumes a perfect (oracle) sign+exponent coder.
- **r13's replacement floor ≈0.50** (`a03_floor.py`, `iter-1-2`, `[value/floor]`): pairs of entries with
  the same token and exactly the same last L tokens of history (suffix array over ids); their bf16
  difference d gives σ(L) = rms(d)/√2 per elephant line plus a per-entry scale τ; the "floor at level L" is
  the cost on the FP8 grid of coding Q(s + n) when s (the conditional mean) is known for free and n is
  logistic with σ(L)·τ. Lowest rung of the history ladder: 2.18, 4.17, 4.94, 4.70, 4.36, 3.50 bits →
  **0.27, 0.52, 0.62, 0.59, 0.54, 0.44; pooled 3.97 bits = 0.50**. Calibrated to ±0.1 bit (`a03e`:
  returns the frontier's own bits within −0.04 to −0.09). 48 blocks, 12 parts, 2 dev sequences. The
  like-for-like mantissa term is 0.20–0.34 (pooled 0.30). Of the frontier's 5.46 bits, 73 % lie under this
  floor (43 % L3, 84 % L11). **Important qualifier the article compresses away:** this is a floor for *a
  model of one head from its token and local history with independent channels*. r13's own page says it
  "is not noise" (the other head sees 66–70 % of it at L7/L11/L19; a `layer` floor would be ≈0.46), and
  r23's ladder puts the LLM-with-memory floor at 0.15–0.17 and the same-binary floor at 0.0001. So "the
  true figure is about 0.50" is true only for that class of model.
- **"Cost at most 0.009"** (`iter-1-5`, `a06_protoquant.py`, `[value/prototype]`): the one truly bit-field
  design decision (sign+exponent / 1-mantissa-bit prototypes at low x) loses to a prototype grid uniform in
  value by −0.0011 to −0.0086 of MDL on 48/48 paired rows at x ≤ 0.10, and by 0 at the frontier's x ≈ 0.43.
  Exact model with D²-seeded prototypes; no coder built. So "0.009" is the largest row of a bound.
- **Value model vs field model** (`a09_duel.py`): same elements, same MST-parent reference, tables fit on
  the other sequence and unpaid: value 5.46 vs field 5.61 pooled, value wins on all six layers by 0.09–0.29.
  Falsifier: adding the exponent to H(m | σ/binade, position) changes it by ≤ 0.0016 bit, held out.
  2 blocks per sequence, both heads, six layers.
- **r9's estimator check** (`iter-1-3`, `[map/estimator]`): Gaussian log-det on float values, fit on one
  sequence and tested on the other, mean over 66 cell pairs = 0.278 (all 227,840 tokens); exact chain-rule
  code length = 0.263 (4 blocks, b = 4k); correlation over the 66 pairs 0.9993. Gaussian on the FP8 **code
  index** = 0.104 (`iter-1-1`/`iter-1-2`). Different samples (whole sequence vs 4 blocks), so the agreement
  is of level and ranking. Robustness: Gaussian copula 0.233, unit-norm 0.264, Spearman ≈ Pearson within
  0.03, kurtosis 3–5.
- **Skew table.** This is **r15's** measurement (`research/agents/r15/pages/iter-1-1.md`, KNOWLEDGE
  `[pdf/skew]`), not r13's; r13 `iter-1-4`/`iter-1-5` cite r15. Same elements, same MST-parent prediction
  (coders 50/64), 12 blocks away from sequence start, head 0; skew of the error signed negative toward zero:
  all −0.03 (value) / −1.60 (code index); prediction ≥ 4 scales: −0.07 / −13.36. Any shape change gains at
  most 0.0139 bit/value unpaid and in-sample (skew 0.0018, shrink 0.0023, mixture 0.0015, scale by
  magnitude 0.0046); the logistic beats Laplace, Gauss and Student t. Article 03's "0.014" matches.
- **Rotating then rounding ≈0.25 bit/value** (r11 `iter-1-1`, `[transform/grid]`, article 04): the 0.254 is
  the *theoretical* cubic-lattice penalty (½·log2(2πe/12) = 0.2546 bit per coordinate for rounding to a
  square grid in many dimensions); r11 **measured +0.29 to +0.32** bit/value at the best quantisation step
  for DCT / Hadamard / random rotation on V L11 h0 and L3 h0, exact-model curves, per block, no trial. The
  lifting figure (+0.029 of +0.351) is one part, V L11 h0, 16-term rows, no reference.

**Verdict: CONFIRMED** for every number; **PARTLY** for two phrasings: "the true figure is about 0.50"
(a class-specific floor, by r13's own account), and the skew table's attribution to r13 (it is r15's).

**Strength.** All exact-model bounds on 2 dev sequences of `03`; 48 blocks for the floor; 12 blocks, head 0
for the skew; 2 parts for the rotation cost; 1 part for lifting. The "prosecutor" framing is a strength
(r13 argued against its own hypothesis and lost: "73 % lie under the floor, not within reach").

**Mechanism, plainly.** An FP8 byte is a sign, a 4-bit exponent (which power-of-two band the number is in)
and a 3-bit mantissa (where inside that band). C1 looked at the bits and saw the mantissa was almost random,
so it declared those 3 bits a floor. r13 showed the real boundary is a *size*, not a bit position: whatever
your predictor's error is, finer detail than that error is unpredictable, wherever it falls in the byte —
inside the mantissa for big values, inside the exponent for values near zero (45 % of values). A predictor
working in real numbers, integrating a smooth symmetric curve over each FP8 cell, handles this automatically,
and also inherits the right skew: because FP8 cells get narrower near zero, a symmetric error in value looks
strongly skewed when counted in grid steps. Rotating a vector before rounding, as transform codecs do,
pays a fixed ≈¼ bit per number for leaving the grid; predicting without rounding never pays it.

---

## Claim 8 — Block floor ≈0.60 at 16384 tokens, ≈0.57 for a whole sequence

**Claim (articles 08/09).** "r23's estimate of the block floor at 16384 is about 0.60"; "perhaps 0.57 for a
whole sequence in one block".

**Where stated.** r23 `iter-1-3.md` ("What a block-scoped coder could ever reach", ladder row "the same,
free of the map's price, at 16k (r9's `token` row): 4.80 bit, 0.600"), KNOWLEDGE `[net/scope]`; r9
`iter-1-6.md` (table "Bigger blocks").

**What they are based on.**

- **0.60** is r9's `iter-1-6` number for the `token` split at b = 16k with **reference + triangular model**:
  a dense linear model **fit on the other sequence and not paid for**, one reference per cell (12-bit index
  charged), exact code lengths, **4 blocks of 2 sequences**. r9 says stream/table overhead would add ≈0.005.
  r23 adopts it as "a ceiling for block scope" on the argument that (i) a block holds no far memory, so all
  it can exploit is repeats and geometry, (ii) r9's free linear rows bound the linear class, and (iii) r21
  (flexible network: 0.002–0.005 bit after the map) and claim 6's table find almost nothing outside that
  class. It is therefore a bound for *one-reference linear* coders with free models, promoted to a floor by
  argument, not a measured floor. Real coders at 16k: `layer` 0.632 (r9 quotes r7), 0.618 best verified
  (article 09).
- **0.57** is an extrapolation: r9's `token` row improves 0.614 → 0.600 from 4k to 16k (two doublings,
  ≈−0.007 per doubling); from 16k to a whole ≈225K-token sequence is ≈3.8 doublings: 0.600 − 0.027 ≈ 0.573.
  r23 writes "not a measurement".

**Verdict: PARTLY.** The 0.60 is a real exact-model bound on 4 blocks / 2 sequences for a specific model
class; both articles call it an estimate, and article 08 lists it under "what we might have missed". The
0.57 is arithmetic on a two-point trend.

**Strength.** 4 blocks, 2 sequences, unpaid model fit on the other sequence; the step from "bound for
linear one-reference coders" to "block floor" rests on the memory table (claim 3, one window) and on the
small residual-prediction results (claim 6).

**Mechanism, plainly.** Inside a block, a compressor has two things to work with: earlier similar tokens to
point at, and the fixed geometry of V (claim 4/5). Give a compressor the best possible linear use of both,
for free, and it reaches about 0.60 at 16K-token blocks, which real coders already approach (0.618). The
rest of the bits, by the memory table, are what the LLM remembered from far earlier text, and more block
does not help much: doubling the block has been buying only ≈0.007.

---

## Summary table

| # | claim | verdict | sample behind it |
|---|---|---|---|
| 1 | V exact function of text; 50,331,648 values replayed; 2.6 bit/token; 0.0001 | CONFIRMED | exact equality; 2 seq × 82K-token prefixes; same machine, same venv (torch 2.8.0+cu129) |
| 2 | different arithmetic leaves 1.2–1.4 bit (0.15–0.17) | CONFIRMED numbers; PARTLY cause | 1 window (tokens 2048–6144 of `0000`); torch-vs-loader control never ran |
| 3 | memory table 1.35 / 3.49 / 5.16 vs coder 5.13 | CONFIRMED | 1 window, 1 seq, 2048 tokens, torch 2.11; perturbation of final chunk; mean-level equality only |
| 4 | weights-only rule 72 % (89 / 49); 0.6407→0.6326; 0.7015→0.6723 | CONFIRMED | 12 blocks, 2 seq, exact model; replicated on 5 seq of `02` (no-reference gain) |
| 5 | 30–38 % / 62–73 % hidden variance; conditional sharing | CONFIRMED (attribution: r23, not r9) | 2 seq, fit/test; Gaussian estimator |
| 6 | metadata saves 0.004 / 0.0003 / 0.007 of 4.89; 74 % / 75 %; 0.2–0.45 | CONFIRMED | 24 blocks, 2 seq, exact model; r13 part on head-0 entries |
| 7 | 0.37 false → 0.50; cost ≤ 0.009; 0.278/0.263/0.104; skew; 0.25 bit | CONFIRMED numbers; PARTLY phrasing | 48 blocks for the floor; skew is r15's, 12 blocks head 0; rotation 2 parts |
| 8 | block floor 0.60 at 16k, 0.57 whole sequence | PARTLY | 4 blocks, 2 seq, unpaid linear model; 0.57 extrapolated |

## What is weaker than the articles make it sound

1. **The central measurement is one window, one sequence, and a perturbation, not a deprivation.** The
   attention cuts leave the DeltaNet state and the earlier K/V fully informed; the state reset leaves
   attention over fully informed K/V. The clean cold-start experiment never finished. Layer by layer, the
   memory-less LLM and coder 102 differ by about ±1 bit in opposite directions (L3 3.86 vs 4.85; L11 5.97
   vs 5.50); only the six-layer mean agrees (5.16 vs 5.13), and the coder figure averages two sequences.
2. **The "torch version" explanation of the 1.3-bit rounding floor was never tested.** The control (same
   stand-in loader under torch 2.8) was killed before loading. Float32 landing at the same level supports
   "a different arithmetic path costs ≈1.3 bits" but does not identify the component.
3. **Nothing can be recomputed without a GPU replay:** `/var/tmp/kvcr-r23` and
   `research/agents/r23/analysis/out/` are gone. Pages, journal and KNOWLEDGE agree with each other, and
   the code matches the pages' descriptions, but no raw array survives.
4. **"The true floor is about 0.50"** is r13's floor for one head from local history with independent
   channels. r13 itself says it is not noise and that a `layer` floor is ≈0.46; r23's ladder goes to 0.17
   and 0.0001 with more knowledge. The article's sentence is true only with that qualifier.
5. **Attributions:** the skew table is r15's (article 03 and the brief say r13); the hidden-variance figures
   are r23's (article 08 reads as if r9's).
6. **The 0.25-bit rotation cost** is a theoretical lattice constant; measured values are 0.29–0.32 on two
   (layer, head) parts. The lifting comparison is one part.
7. **All "bits" are exact-model numbers with scales fitted in-sample on the window and unpaid** (≈0.01
   bit/value) — fine for the conclusions, but none of claims 2–8 is a real coder's bytes except the 102
   yardsticks (0.6407, 0.7015, 5.13).
8. **The 72 % share** is the second attempt at that figure; the first (variance-based, 46–89 %) was
   withdrawn, and the exact-bits version coincidentally returned 72 % again. Both the weights rule and the
   "whole-sequence" ceiling get a free per-line gain fit on the block.
9. **Sample sizes:** everything except the replay's cross-check on `02` (claim 4) and r9's raw-matrix
   stability (claim 5) is on the 2 dev sequences of `03_smoketest`; the 30 sequences of `02_qwen` were
   barely touched here.
