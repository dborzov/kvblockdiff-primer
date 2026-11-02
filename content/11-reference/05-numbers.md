---
title: Grounded numbers and their sources
nav: Grounded numbers
group: Facts and sources
lede: Every number this site leans on, in one place, with its grade and its source. The two frozen settings, the campaigns' headline results, the arithmetic of Parts III and VI, and the outside numbers from papers and from our own small checks.
cards:
  - q: Which quantities does the Bench lack that the Pin has?
    a: Picks per step, the miss rates and the time per output token; no indexer ever ran on it
    wrong: ["The cherry size and the number of KV layers", "The link bandwidth and the GPU memory", "The stretch length and the storage format"]
    why: The Bench is the data-side setting. It has shapes, bytes, stretch lengths and measured ratios; the miss side of the economics needs an indexer and a decode loop.
    sec: settings
  - q: 'The best verified compressor at 4096 tokens scored 0.636. In bits per element, that is about…'
    a: 5.1 bits of 8
    wrong: ["6.4 bits", "0.64 bit", "2.5 bits"]
    why: 'Bits per element are 8 × the MDL ratio: 8 × 0.636 ≈ 5.1. Solo sits at 6.22 (0.778), raw at 8.'
    sec: campaigns
  - q: 'A number on this page is graded "code-length estimate". What does that mean?'
    a: A code length computed from a probability table on the data without building the compressor; a lead, not a verified result
    wrong: ["Every cherry was rebuilt bit for bit in a separate process", "The number was confirmed on all 30 sequences", "The compressor ran in exact integer arithmetic"]
    why: 'Four grades appear here: verified, quick, code-length estimate and bound. Only a verified score can hold a record.'
    sec: campaigns
  - q: In the Pin at 4096 slots, how many misses does one layer have per decode step, and what does the link then feed?
    a: About 274 misses; about 110 sequences per GPU
    wrong: ["About 2048 misses; about 7 sequences", "About 13 misses; about 1 100 sequences", "About 4096 misses; about 73 sequences"]
    why: '0.134 × 2048 ≈ 274; 274 × 78 × 640 B ≈ 13.7 MB per step, 0.46 GB/s per sequence, and 50 ÷ 0.46 ≈ 110.'
    sec: derived
  - q: Which three LRU miss rates did HiSparse measure on its GLM-5.1 trace, at 2048, 4096 and 8192 slots?
    a: 30 %, 13.4 % and 6.7 %
    wrong: ["3 %, 1.3 % and 0.7 %", "50 %, 40 % and 30 %", "13.4 %, 6.7 % and 3.3 %"]
    why: "Bélády's clairvoyant policy at 4096 misses 8.2 %, so better eviction can win at most about 5 points."
    sec: outside
---

A number without a source is a rumour. This page is the ledger: what each number is, which [[reference-setting]] it belongs to, and how sure we are. Four grades apply to the campaigns' numbers: **verified** (every cherry rebuilt bit for bit in a separate process, [[verified-result]]), **quick** (encoded bytes counted, no separate decode), **code-length estimate** ([[code-length-estimate]]: a probability table's code length on the data, no compressor built) and **bound** (a limit computed from a probability table fit to the data). Outside numbers are *their measurement*; the rest is arithmetic or an assumption, and says so.

## The two settings {#settings}

Both rigs are frozen in `data/settings.yaml` ([[#landscape-reference-settings]]). The pill in the top bar chooses one; in the setting selected now the LLM is [[@model]], one cherry of one token's values at one layer is [[@e]], [[@NL]] KV layers keep an orchard, and a sequence holds [[@L]] tokens. <!-- old-words -->

| quantity | key | [[pin\|the Pin]] | [[bench\|the Bench]] | source |
|---|---|---|---|---|
| the LLM | `model` | GLM-5.1 | Qwen3.5-2B | HiSparse §4.1; the campaigns' target README |
| KV layers $\vNL$ | `NL` | 78 | 6 of 24 (the other 18 are linear attention) | HiSparse §4.3; Qwen3.5 configuration |
| KV heads × elements | `heads`, `headdim` | 1 × 640 (one MLA latent, treated as `(1, 640)`) | 2 × 256 (8 query heads share them) | 100 KB of BF16 per token ÷ 78 ÷ 2 B; the export's shape `(228144, 6, 2, 256)` |
| cherry bytes $\ve$, 8-bit | `e` | 640 B | 512 B of values (1 024 B with keys) | one byte per element |
| picks per layer per step $\vk$ | `k` | 2048 | not measured | DSA's top-$\vk$; no indexer ran on the Bench |
| context length $\vL$ | `L` | 100 384 tokens | 225 000 (219 678 to 229 360) | HiSparse's LongBench-V2 prompt; 30 transcripts |
| stretch length in examples $\vb$ | `b` | 4096 | 4096 (512 to 32 768 measured) | a knob; [[#scenario-stretch]] |
| miss rate at 2048 / 4096 / 8192 slots | `m2`, `m4`, `m8` | 30 % / 13.4 % / 6.7 % | not measured | HiSparse §4.3, Fig. 6 (Bélády 8.2 % at 4096) |
| time per output token | `tpot` | 30 ms | not measured | HiSparse's deployment |
| link $\vWlink$ | `Wlink` | 50 GB/s | 50 GB/s, **assumed** | PCIe Gen5 ×16, 64 GB/s on paper; the Bench borrows the Pin's figure |
| GPU memory for orchards $\vMhbm$ | `Mhbm` | 30 GB of 141 | ≈ 10 GB of 16, **assumed** | about 240 GB left on 8 × H200 after weights; 16 GB less about 4 GB of weights and headroom |
| storage format | `format` | 8-bit E4M3, **assumed** (HiSparse serves BF16) | FP8 E4M3, one power-of-two scale per layer and tensor | [[#reference-fp8-facts]] |
| measured delta shares | | assumed in Part VI (0.55 to 0.88) | measured (0.112 to 0.778) | the next section |

Both settings are assumptions about one machine each, and ratios travel between them better than absolute numbers: a ratio of bytes to bytes may cross from the Bench to the Pin with a flag; a miss rate cannot, because the Bench has none.

::: takeaway
- The Pin owns the miss side (picks, miss rates, step time); the Bench owns the byte side (shapes, formats, measured ratios).
- Two Bench numbers are assumed: the link at 50 GB/s and 10 GB for orchards. The Pin's 8-bit storage is assumed too.
:::

## The campaigns' headline numbers {#campaigns}

Values of Qwen3.5-2B, FP8 E4M3, coding-agent transcripts, stretches of 4096 tokens unless noted; ratios are [[mdl-ratio|MDL ratios]], bits per element are 8 × ratio ([[#measured-dispatch]]).

| number | value | grade | scenario, receipt |
|---|---|---|---|
| raw | 1.0 (8 bits) | definition | |
| solo, ideal, all six layers | 0.778 (6.22 bits) | code-length estimate | per-furrow order-0 entropy; §1.3 |
| best real solo compressor | 0.804 | verified | compressor 09, `(256,)` cherries, KV layer 0; r1-t0005 |
| best stretch-scope compressor, `(2, 256)` | **0.636** (5.09 bits); dictionary share 0.525, delta share 0.112 | verified | compressor 121, leash 293, 2 sequences; env-t0096 |
| the same on 5 sequences | 0.630 | verified | env-t0096; paired difference to compressor 102 of −0.0088, SD 0.0001 |
| light no-tree compressor, `(2, 256)` | 0.686; dictionary share 0.021 | verified | compressor 129; r25-t0003 |
| the same, `(6, 2, 256)` cherries | 0.662 | verified | r25-t0004 |
| joining the two heads, `(256,)` → `(2, 256)` | saves 0.032 of ratio, spread 0.0009, 20 of 20 sequences | quick (same window) | §1.6 |
| joining all six layers after that | saves a further 0.004, spread 0.0014, 20 of 20 | quick (same window) | §1.6 |
| two / four adjacent tokens as one cherry | costs +0.037 / +0.063 | verified against its own `(2, 256)` score | r12-t0004 |
| stretch length 512 / 4096 / 16 384 | 0.689 / 0.636 / 0.618 | verified (different screens) | compressors 113 / 121 / 120 |
| leash 137 on `(2, 256)` cherries | costs 0.023 (0.660 against 0.636) | verified | compressor 97; §1.9 |
| worst cold decode, compressor 121 | 226 cherries' worth (mean 120, p99 184) | every cherry counted | §1.9 |
| shuffle control, tree compressor | 0.691 → 0.752 | quick | r12 iter-1-2 |
| shuffle control, linear-prediction gain | −0.034 → −0.034 | quick | r12 iter-1-2 |
| stereo: shared bits of the two heads | 0.85 bit per element | bound | r9 iter-1-2, 4 punnets |
| fixed rotations (DCT, Hadamard, random) | lose 0.28–0.32 bit per element | code-length estimate | r11 iter-1-1 |
| whole-sequence pool against a 16 384 pool | 0.26–0.45 bit per element lower | bound | r19, one window |
| the memory table: intact LLM / attention cut past 16 384 tokens / state reset | 1.35 / 3.49 / 5.16 bits per value | code-length estimate, **one window** | §1.10 |
| scale of the campaigns | C1 218 trials, C2 169; 126 compressors; 5.3 M cherries decoded cold | counts | notes/00 |

::: aside source Receipts
Section numbers refer to `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md`; trial ids (env-t0096, r25-t0003, r12-t0004) are rows of the campaigns' ledgers; "r12 iter-1-2" names a researcher agent's page. The screens were `s-layer-b4k-r293` (one layer's entry, 4096-token blocks, read budget 293) and its head and token twins; "block" and "entry" are the ledger's words for stretch and cherry. The tok2/tok4 penalties are r12-t0004 against the same coder's own layer score 0.6896. The leash-137 cost is coder 97 at 0.65980 against 121 at 0.63639. Every "same window" row is encoded bytes on 20 sequences of target 02, not isolated-verified.
:::

::: takeaway
- Raw 8 bits → solo 6.2 → 5.1 at 4096 tokens → 4.9 at 16 384; ratios 1 → 0.778 → 0.636 → 0.618.
- Verified beats quick beats estimate beats bound; the memory table is one window and says so.
:::

## Derived numbers {#derived}

Nothing here is new information; it is the settings table multiplied out, on the Pin unless the row says the Bench ([[#landscape-derived-numbers]], [[#app-the-napkin]]).

| number | value | arithmetic |
|---|---|---|
| misses per layer per step, $\vB = 4096$ | ≈ 274 | $\vm\,\vk = 0.134 \times 2048$ |
| link bytes per sequence per step | ≈ 13.7 MB | $274 \times 78 \times 640$ B |
| link bytes per sequence per second | ≈ 0.46 GB/s | 13.7 MB ÷ 30 ms |
| sequences the link can feed | ≈ 110 (109 with the unrounded 1.5 GB ÷ 13.7 MB) | 50 ÷ 0.46 |
| GPU memory per sequence, hot cache | ≈ 205 MB | $4096 \times 78 \times 640$ B |
| sequences GPU memory can hold | ≈ 147 (73 at $\vB = 8192$) | 30 GB ÷ 205 MB |
| one layer's share of a decode step | ≈ 0.38 ms | 30 ms ÷ 78 |
| decoder speed on the miss path | ≥ 500 GB/s (10× the link) | 19 MB in a tenth of 0.38 ms |
| one on-fire dictionary at the tree point | 1.38 MB per layer, 107 MB per sequence | $0.525 \times 4096 \times 640$ B; × 78 |
| δ-misses to repay that load | ≈ 2 420 | $\vw / (1 - \vrho) = 2150 / 0.888$ |
| steps to break even | ≈ 42 at $\vnD = 4$, $\vfD = 0.85$; ≈ 30 at $\vnD = 1$, $\vfD = 0.3$ | $2420\,\vnD / (\vfD \times 274)$; the pairs are assumed |
| sequences per GPU, tree point stacked on the hot cache | 47 ($\vnD = 4$) / 96 ($\vnD = 1$) | memory binds: 205 MB + $\vnD$ × 107 MB |
| the same as lever 2 | ≈ 120 (1.1×) at $\vnD = 1$, $\vfD = 0.3$, $\vnload = 0.01$ | $\vNL\,\ve\,[(1-\vfD)\vB + \vnD\vw]$ ≈ 250 MB |
| Bench: one token's values at all six layers | 3 072 B | 6 × 512 |
| Bench: one sequence's values | ≈ 691 MB (1.38 GB with keys) | 225 000 × 3 072 B |
| Bench: one punnet of one layer's values, `(2, 256)` cherries | 2.1 MB; its tree dictionary 1.1 MB | 4096 × 512 B; × 0.525 |

::: takeaway
- On the Pin at 4096 slots: 274 misses per layer per step, 13.7 MB per step, 109–110 sequences by the link, 147 by memory, 0.38 ms per layer.
- A tree-point dictionary is half a hot cache per layer; it repays its load after about 2 420 δ-misses and pays on the Pin only as lever 2.
:::

## From papers, and from our own checks {#outside}

Paper numbers are *their measurement*, collected for the first draft and re-checked where the paper pages could ([[#papers-reading-guide]]). Our own checks are small seeded simulations that test directions and orders of magnitude, never orchards.

| fact | source |
|---|---|
| GLM-5.1: ≈ 100 KB of KV per token over all layers in BF16; 200 MB per generated token at top-2048; a 50 GB/s link is full at about 7 sequences fetching everything | HiSparse §2.3 → [[#landscape-memory-wall]], [[#papers-hisparse]] |
| HiSparse's trace: a 100 384-token prompt, 1 799 decode steps, 78 sparse layers; LRU 13.4 % at 4096 slots, FIFO 17.2 %, random 16.1 %, Bélády 8.2 %; one trace, first 1 000 steps | HiSparse §4.3, Fig. 6 |
| hot cache ≈ 0.4 GB per sequence at 4096 slots against 13.09 GB of orchard at 128K tokens in BF16; *not re-checked* | HiSparse §3.2–3.3 |
| lossless exponent coding of BF16 orchards: 1.324× (ceiling of any 4-bit exponent code 1.333×); FP8 E5M2 up to 1.14×; decode ≈ 2.2 TB/s on H200 | SplitZip → [[#papers-splitzip]] |
| other lossless float compressors on BF16: ZipNN 1.52×, DFloat11 1.42× (468 GB/s), Falcon 1.43×, nvCOMP ≤ 1.06× | SplitZip's table → [[#papers-float-coders]] <!-- old-words -->
| Qwen3.5-2B: 24 layers, every fourth full attention, head dimension 256, 2 KV heads, partial RoPE on 64 of 256 elements | the configuration → [[#measured-the-data]] |
| DeepSeek-V4: 4 tokens squeezed into one pick, top-512 picks = 2048 tokens | release notes → [[#papers-sparse-selectors]] |
| order-0 entropy of one Gaussian furrow stored in E4M3 | ≈ 6.47 bits whatever its scale (≈ 7.05 on INT8 at σ = 32 codes) → [[#toolbox-the-bill]] |
| subtracting a stretch mean in E4M3 index space | net negative below $\vRsq \approx 0.7$ → [[#toolbox-bit-fields]] |
| k-means codebooks against a rotation on bell-shaped data | VQ ≤ +0.22 bit, rotation +0.50; on clustered data VQ +1.45 against +0.68 → [[#toolbox-vq]] |
| HiSparse's three LRU points | fit $\vm(\vB) \propto \vB^{-1.08}$ → [[#landscape-reuse-curve]] |
| context modelling on the E4M3 grid | recovers the full exchange rate; about 0.5 bit better than INT8 with subtraction → [[#toolbox-context-modelling]] |
| entropy rate against fixed-length rate on the same residuals | about 1 bit per element apart, 15–22 % at 8-bit rates → [[#toolbox-two-rates]] |
| the synthetic dress rehearsal | furrow statistics best at the planted stretch length; both gains vanish under the shuffle → [[#toolbox-rehearsal]] |
| i.i.d. keys with a drifting query (4096 keys of 32 numbers, top-64) | 63–80 % of picks repeat step to step, hit rate 86 % at drift 0.25, with nothing to compress → [[#hypotheses-the-leak]] |

::: takeaway
- The cache numbers come from one GLM-5.1 trace; the lossless-float calibration (1.1–1.5×) from SplitZip and its table.
- Our own checks are toys with seeds; they check the direction of an effect, not its size on real orchards.
:::
