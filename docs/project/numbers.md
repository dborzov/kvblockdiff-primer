# The pinned numbers

Where every number on the site comes from. A page quotes a number with its receipt (`::: aside source`);
this file is the index of receipts. The reader-facing version is `content/11-reference/05-numbers.md`.

## 1. The two reference settings (`data/settings.yaml`)

| key | the Pin (GLM-5.1, 8 × H200, HiSparse) | the Bench (Qwen3.5-2B, RTX 5080, the campaigns) | source |
|---|---|---|---|
| KV layers `NL` | 78 | 6 (model layers 3, 7, 11, 15, 19, 23 of 24) | HiSparse paper; Qwen3.5-2B config |
| KV heads × head_dim | one MLA latent, ≈ 640 | 2 × 256 (GQA, 8 query heads) | model configs |
| cherry bytes `e` (one token, one layer, 8-bit) | 640 | 512 (values; keys the same) | derived |
| picks per layer per step `k` | 2048 | not measured (no indexer ran) | DSA |
| context length `L` | 100 384 | 225 000 (sequences 219 678–229 360) | HiSparse eval; target 02 README |
| stretch length in examples `b` | 4096 | 4096 | our choice |
| miss rate at 2048 / 4096 / 8192 slots | 30 / 13.4 / 6.7 % | not measured | HiSparse paper (Bélády 8.2 % at 4096) |
| TPOT | 30 ms | not measured | HiSparse deployment |
| link bandwidth `Wlink` | 50 GB/s (PCIe Gen5 ×16 practical) | 50 GB/s (assumed, same link) | spec sheets |
| GPU memory for orchards `Mhbm` | 30 GB | ≈ 10 GB (16 GB minus ≈ 4 GB weights, assumed) | assumption |

Derived on the Pin (III.12, VI.9): misses per layer per step at 4096 slots ≈ 0.134 × 2048 ≈ 274; HiSparse
link bytes per step per sequence ≈ 13.7 MB; GPU memory per sequence ≈ 205 MB; sequences per GPU N ≈ 110 (109.7, link-bound; the
napkin pages round it to 109 or 110; memory would allow 147); tokens per second per GPU ≈ 3 630; cost per million output tokens
≈ USD 0.23 at an assumed USD 3 per H200-hour. Formulas: `figures/homework-b.js` `econ()`.

## 2. The campaigns (values of Qwen3.5-2B, FP8 E4M3, stretch 4096 unless stated)

Receipts: `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1 (every number with its ledger trial
id); figure data in `figures/data/measured-*.json` (ledger-derived; it wins over prose); hand-entered
page numbers with receipts in `analysis/measured_pages.json`.

| number | value | grade |
|---|---|---|
| solo, ideal, six layers / best real solo compressor | 0.778 (6.22 bits per element) / 0.804 | code-length estimate / verified |
| compressor 121 on cherry `(2, 256)`, leash 293 (screen) | 0.6364 = 0.5247 + 0.1116; ≈ 80 % of deltas empty; reads mean 120, worst 226 | verified, every cherry |
| compressor 129 (no reference tree) on cherry `(2, 256)` | 0.6863 = 0.021 + 0.665 | verified |
| compressor 102 on five sequences of target 02 | 0.63848 (`(2, 256)`), 0.67015 (`(256,)`) | verified; different punnets, not subtractable |
| all-dictionary corner, no leash | 0.6705 at 4096 positions; reads ≈ 1 490 | verified (C1) |
| joining the two heads (same window, 20 sequences) | −0.0322 ± 0.0009, 20 of 20 | encoded bytes, not isolated-verified |
| joining the six layers after that | −0.0043 ± 0.0014, 20 of 20 | same |
| two / four adjacent tokens as one cherry (like for like) | +0.037 / +0.063 | quick trial |
| bits shared, code-length bounds (four punnets) | heads 0.85 raw, 0.54 after one reference, 0.21 with separate references; adjacent layers 0.03–0.08, distant ≈ 0.01; adjacent tokens ≤ 0.29 raw, ≤ 0.02 after references | bound |
| reference links within 8 tokens | 37 / 47 / 39 % at KV layers 1–3; 9 / 7 / 12 % at KV layers 0, 4, 5 | 24 punnets |
| punnet floors | ≈ 0.60 at 16 384 positions (code-length estimate); ≈ 0.57 for a whole sequence (extrapolation) | estimate |
| BF16 vs FP8 | BF16 ratio ≈ FP8 ratio / 2 + 0.25 along the whole C1 ladder (within 0.0004) | verified (C1) |
| dictionary-budget curve (C1, layer 0 head 0, compressor 30) | share ≤ 0.02 → 0.7532; ≤ 0.10 → 0.7095; ≤ 0.25 → 0.6906; free (0.36) → 0.6815; solo 0.804 | verified (C1) |
| the memory table (one window) | LLM intact 1.35 bits per value; attention cut beyond 16K 3.49; reset + last 2 048 tokens 5.16; compressor 102 5.13 | estimate |

Campaign C1 (night of 29–30 Oct 2026): values of KV layer 0, head 0; 4 agents, 218 trials; the leash did
not exist until 11:20 UTC on 30 Oct. C2 (30 Oct): six layers, several cherry shapes; 21 agents + a
supervisor, 169 trials; the leash measured for every cherry since 31 Oct.

## 3. Information-theory constants used in napkin math

Order-0 entropy of an E4M3 element from Gaussian data ≈ 6.5 bits; SplitZip's E5M2 figure 6.19; the
exchange rate from variance explained to bits: ½ log₂ 1/(1−R²) (75 % → 1 bit, 94 % → 2 bits); the
amortization rule 8w/b bits per element.
