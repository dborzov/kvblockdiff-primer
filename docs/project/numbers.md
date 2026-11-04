# The pinned numbers

Where every number on the site comes from. A page quotes a number with its receipt (`::: aside source`);
this file is the index of receipts. The reader-facing version is `content/12-reference/05-numbers.md`.

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

Every campaign number below is a dev-screen number: two dev sequences of target 03 (five of target 02
where stated), no holdout measurement, no confidence interval. They predate the measurement protocol of
2026-11-03 (`docs/project/scenario.md` §4.1) and are leads for choosing configurations, not results under
it. "Verified" below means every cherry rebuilt in a separate process on that screen. Cherry shapes are
written as index expressions: `v[t, l, :, :]` is one KV layer with both heads (512 elements),
`v[t, l, h, :]` one head vector (256), `v[t, :, :, :]` one token across six KV layers (3072).

| number | value | grade |
|---|---|---|
| solo, ideal, six layers / best real solo compressor | 0.778 (6.22 bits per element) / 0.804 | code-length estimate / verified |
| compressor 121 on cherry `v[t, l, :, :]`, leash 293 (screen) | 0.6364 = dictionary share 0.5247 + delta share 0.1116; ≈ 80 % of deltas empty; reads mean 120, worst 226 | verified, every cherry |
| compressor 129 (no reference tree) on cherry `v[t, l, :, :]` | 0.6863 = dictionary share 0.021 + delta share 0.665 | verified |
| compressor 102 on five sequences of target 02 | 0.63848 (`v[t, l, :, :]`), 0.67015 (`v[t, l, h, :]`) | verified; different punnets, not subtractable |
| all-dictionary corner, no leash | 0.6705 at 4096 positions; reads ≈ 1 490 | verified (C1) |
| joining the two heads (same window, 20 sequences) | −0.0322 ± 0.0009, 20 of 20 | encoded bytes, not isolated-verified |
| joining the six layers after that | −0.0043 ± 0.0014, 20 of 20 | same |
| two / four adjacent tokens as one cherry, `v[t:t+2, l, :, :]` / `v[t:t+4, l, :, :]` (like for like; stacked positions, out of scope since 2026-11-03) | +0.037 / +0.063 | quick trial |
| bits shared, code-length bounds (four punnets) | heads 0.85 raw, 0.54 after one reference, 0.21 with separate references; adjacent layers 0.03–0.08, distant ≈ 0.01; adjacent tokens ≤ 0.29 raw, ≤ 0.02 after references | bound |
| reference links within 8 tokens | 37 / 47 / 39 % at KV layers 1–3; 9 / 7 / 12 % at KV layers 0, 4, 5 | 24 punnets |
| punnet floors | ≈ 0.60 at 16 384 positions (code-length estimate); ≈ 0.57 for a whole sequence (extrapolation) | estimate |
| BF16 vs FP8 (bf16 is out of scope since 2026-11-03; a C1 reading) | BF16 ratio ≈ FP8 ratio / 2 + 0.25 along the whole C1 ladder (within 0.0004) | verified (C1) |
| dictionary-budget curve (C1, layer 0 head 0, compressor 30) | share ≤ 0.02 → 0.7532; ≤ 0.10 → 0.7095; ≤ 0.25 → 0.6906; free (0.36) → 0.6815; solo 0.804 | verified (C1) |
| the memory table (one window) | LLM intact 1.35 bits per value; attention cut beyond 16K 3.49; reset + last 2 048 tokens 5.16; compressor 102 5.13 | estimate |

Campaign C1 (night of 29–30 Oct 2026): values of KV layer 0, head 0; 4 agents, 218 trials; the leash did
not exist until 11:20 UTC on 30 Oct. C2 (30 Oct): six layers, several cherry shapes; 21 agents + a
supervisor, 169 trials; the leash measured for every cherry since 31 Oct.

## 3. The pick traces (Part XI; the Bachelor: Qwen 2.5 1.5B, five coding-agent sequences of 24.5K–30K tokens)

Receipts: the research repository bachelor-kv (private, `dborzov/bachelor-kv`) at commit aa89697,
`docs/results.md` (the source of every number and its grade); method `docs/design.md`; summaries
`results/summary/{hotcache,attention,shelf,napkin}.json` computed at commit d3c2b80, each with its own
receipt (script and input hashes). Grades: measured (exact replay of stored traces, means over 140
(sequence, layer) pairs, [range of the five per-sequence means]), derived (arithmetic or fits), extrapolated
(carried to the Pin's 100K by a fitted rule); HiSparse's numbers are their measurement. Figure data:
`figures/data/picks-*.json`.

| number | value | grade |
|---|---|---|
| miss rate at B/k = 1 / 2 / 4, pin-scaled (k = 512, W = 0, share ≈ 2 %) | 35.1 [34.4–36.2] / 19.0 [18.2–20.2] / 9.7 [8.7–10.7] %; HiSparse 30 / 13.4 / 6.7 % | measured |
| the same, pin-absolute (k = 2048) / v4-scaled (128 rows of 4, W = 32) | 28.1 / 10.0 / 2.5 % / 33.4 / 17.9 / 9.6 % | measured |
| Bélády at B/k = 2; LRU / Bélády | 12.0 % (HiSparse 8.2 %); 1.58 (HiSparse 1.63) | measured |
| consecutive-step overlap of picks | 65 % pin-scaled, 72 % pin-absolute, 67 % v4-scaled (HiSparse ≈ 70 %) | measured |
| reuse-curve slope over B/k ∈ [1, 8] | 0.63 (k = 64), 1.07 [1.01–1.15] (k = 512), 2.2 (k = 2048); HiSparse 1.08 | derived |
| misses per layer per step, pin-scaled, B/k = 2 | mean 97 [94–104], p50 88, p90 170, p99 263; burst factor 2.9 (2.2–3.8 by layer); pin-absolute mean 205, p99 679 | measured |
| per-layer miss rate at B/k = 2 | 11–29 % (p10–p90 of layers); in layers 0–11 even 24 %, odd 13 % | measured |
| resident window 128 / 32 | +13–20 % / +6–7 % on the miss rate | measured |
| decode-like steps (token kinds 3, 4) | miss rate +1–9 %; f_D −0.02 to −0.04 | measured |
| scaling of the miss rate | follows s = k/t: at fixed s, log k adds −0.05 [−0.17, 0.14] (B/k = 2); a curve in s fits 1.8–2.6× better than in k | derived |
| the Pin's miss rates read at s = 2.04 % | 36 / 21 / 12 % (the count rule: 30 / 12 / 3 %) | derived, extrapolated |
| attention mass held by the top k (k = 16 / 64 / 256 / 512 / 1024 / 2048) | 59 / 72 / 82 / 87 / 91 / 95 % of the non-self mass; 4 sink positions 24 %; last 128 positions 40 %; self 8 % of all | measured |
| indexer noise at recall 0.80 / 0.64 / 0.46, B/k = 2 | per step × 1.35 / 2.04 / 2.83; persistent × 0.95 / 0.85 / 0.71 | measured |
| heads; layer groups (k = 512) | KV heads share 45 % of picks; one KV head's 6-head selection 71–74 % of the 12-head one, m −1 to +6 %; adjacent layers share 53 % (44 % outside sinks and the last 128) | measured |
| heavy stretches, b = 1024, pin-scaled, B/k = 2 | heaviest 31 % [29–32] of a step's misses (twin 9 %); heaviest four 71 % (twin 31 %) | measured |
| shelf, popular P = 32, on the Bachelor | 1 × 1024: f_D 0.21 (twin 0.04), 0.035 loads; 4 × 1024: 0.57 [0.54–0.60] (0.16), 0.089; 8 × 1024: 0.81 (0.31), 0.118; 1 × 4096: 0.46 (0.15), 0.017; 4 × 4096: 0.94 [0.93–0.96] (0.60), 0.018 | measured |
| scaling of f_D at s = 2 % | collapses on b / t^β, β = 1.27 [0.93–1.44] (logit residual 0.12; absolute b 0.42; b / t 0.15); loads β 1.24; d ln f_D / d ln k = −0.47 | derived |
| shelf at the Pin, popular P = 32 | n_D 1 / 4 / 8 / 16 at b = 4096: f_D 0.11–0.20 / 0.36–0.54 / 0.56–0.76 / 0.78–0.95, loads 0.04–0.06 / 0.10–0.13 / 0.14–0.20 / 0.15–0.29 | extrapolated |
| decision rule X.9 | the Bachelor: "affordable" only at coverage 0.73, "partly" (0.52 at 4 × 1024) within the Pin's coverage; the Pin: "partly" at best, "spread" at worst | derived |
| sequences per GPU at the Pin, best B per design | HiSparse 109.5 (B = 4096), resized 126 (B ≈ 4756); tree shelf 105–107 (56 at 4 × 4096, f_D 0.85); light all resident 116; mid shelf 123; light shelf 127–132 (141 at f_D 0.85); solo + light shelf 140–141; solo on every miss 141 (143 at 0.778); with the stand-in's miss curve every design −8–11 % | derived / extrapolated |
| slot price: a dictionary beats its memory as slots iff | (1 − ρ)·Δf_D·B/w > α ≈ 1: tree needs Δf_D > 0.5, light > 0.06 (0.015 at b = 1024) | derived |

## 4. Information-theory constants used in napkin math

Order-0 entropy of an E4M3 element from Gaussian data ≈ 6.5 bits; SplitZip's E5M2 figure 6.19; the
exchange rate from variance explained to bits: ½ log₂ 1/(1−R²) (75 % → 1 bit, 94 % → 2 bits); the
amortization rule 8w/b bits per element.
