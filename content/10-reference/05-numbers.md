---
title: Grounded numbers and their sources
nav: Grounded numbers
lede: Every outside number this site leans on, where it comes from, and how sure we are of it.
cards:
  - q: Which three LRU miss rates did HiSparse measure on its GLM-5.1 trace, at hot-cache sizes 2048 (top-k only), 4096 and 8192?
    a: 30 %, 13.4 % and 6.7 %
    wrong: ["3 %, 1.3 % and 0.7 %", "50 %, 40 % and 30 %", "13.4 %, 6.7 % and 3.3 %"]
    why: Bélády's clairvoyant policy at 4096 misses 8.2 %, so better eviction can win at most ~5 points.
    sec: papers
  - q: What compression ratio does lossless exponent coding (SplitZip) report on BF16 KV caches?
    a: About 1.32×
    wrong: ["About 4×", "About 10×", "About 1.01×"]
    why: The mantissa bits are close to noise; only the exponent carries the easy, context-free redundancy.
    sec: papers
---

::: note warning Read this first
The paper numbers below were collected for the first draft of this proposal. The Papers part (V) re-checks the most important ones where it could; anything not re-checked is marked so on its paper page. Verify against the sources before any external write-up.
:::

## From papers {#papers}

| fact | source |
|---|---|
| GLM-5.1: ~100 KB of KV per token over all layers (BF16); 200 MB per generated token at top-2048; ~7 GB/s per request at 30 ms per token; PCIe Gen5 ×16 ≈ 64 GB/s per direction. HiSparse says "a dozen requests" saturate the link; at 6.8 GB/s per request a 50 GB/s link is full at about 7 ([[#landscape-memory-wall]]) | HiSparse §2.3 → [[#papers-hisparse]] |
| Trace: a 100,384-token LongBench-V2 prompt, 1,799 decode steps, 78 sparse layers; miss rates: top-k only 30 %, LRU at 4096 slots 13.4 %, FIFO 17.2 %, random 16.1 %, Bélády 8.2 %, LRU at 8192 slots 6.7 %. One trace, averaged over its first 1,000 steps | HiSparse §4.3, Fig. 6 |
| Hot-cache memory at 4096 slots: ~0.4 GB per request vs 13.09 GB of history at 128K tokens (BF16); useful range 2k–4k slots, i.e. 4,096–8,192 (k = 2048); faster links shift it toward 4,096. *The 0.4 GB was not re-checked* | HiSparse §3.2–3.3, §4.5 |
| All HiSparse experiments serve BF16 KV; "FP8" in model names refers to weights | HiSparse §4.1 |
| ~240 GB of GPU memory left for KV over 8×H200 after weights; a full-KV baseline saturates at ~60 requests at 32K. *Not re-checked* | HiSparse §2.2 |
| Speculative cross-layer prefetch gave little gain; GLM-5.2 shares one indexer per 4 layers. *Not re-checked* | HiSparse §3.5, §4.6 |
| Lossless exponent coding of KV: **1.324×** on BF16 KV of one workload (Qwen3-32B) — the ceiling of any 4-bit exponent code is 16/12 = 1.333× (the "1.32×" in its abstract is a transfer speed-up); FP8 E5M2 up to 1.14× (ceiling 8/7); decode ≈ 2.2 TB/s on H200 (from public summaries). *Not re-checked:* E4M3 with a top-8 code 0.93×, the 6.19-bit order-0 bound for E5M2, per-channel codebooks adding 0.1 % coverage | SplitZip → [[#papers-splitzip]] |
| Other lossless float coders on BF16: ZipNN 1.52× (CPU), DFloat11 1.42× (decode 468 GB/s), Falcon 1.43×, ZipServ 1.24×, nvCOMP LZ4/Cascaded/Bitcomp ≤ 1.06×. ZipNN's figure is above what an exponent-only coder can reach on SplitZip's workload, so it probably comes from different data | SplitZip's comparison table → [[#papers-float-coders]] |
| Qwen3.5-2B: 24 layers, every 4th is full attention (6 layers), head dimension 256, hidden size 2048, 2 KV heads, hybrid Gated DeltaNet + gated attention, partial RoPE | model configuration → [[#plan-data]] |
| DeepSeek-V4: compressed sparse attention (4 tokens → 1 entry, top-512 entries = 2048 tokens) alternating with a 128×-compressed dense branch | release notes; HiSparse §4.1 → [[#papers-sparse-selectors]] |

::: takeaway
- The cache numbers (miss rates, sizes, link speeds) come from HiSparse's GLM-5.1 deployment, frozen as the reference setting.
- The lossless-coding calibration (≈1.1–1.3×) comes from SplitZip and the float-coder literature.
:::

## From our own checks {#ours}

These were computed for this site; the scripts are in the repository's `analysis/` folder and the figures recompute several of them live.

| check | result | where |
|---|---|---|
| Order-0 entropy of one Gaussian channel stored in E4M3 | ≈ 6.47 bits, whatever the channel's scale (≈ 7.04 bits on a uniform INT8 grid at σ = 32 codes) | [[#homework-the-budget]] |
| Block-mean prediction in E4M3 index space | net negative below R² ≈ 0.7 | [[#homework-the-grid]] |
| k-means codebooks vs a rotation on bell-shaped correlated data | VQ nets at most about +0.25 bit; the rotation +0.50, with no tax | [[#homework-vq]] |
| k-means codebooks on clustered data | VQ +1.5 bit vs the rotation +0.68 | [[#homework-vq]] |
| HiSparse's LRU points | fit $\vm(\vB) \propto \vB^{-1.08}$ (in effect a two-point fit) | [[#landscape-reuse-curve]] |
| Context modelling on the E4M3 grid (exact computation) | recovers the full exchange rate, and beats INT8-with-subtraction by about 0.5 bit at every $\vRsq$ | [[#missed-context-modeling]] |
| The synthetic dress rehearsal (planted structure, INT8) | loc is best at the true block length 2,048; $\vgainreq \approx 0.10$ and $\vgainblk \approx 0.16$ bit; both vanish under the shuffle control | [[#homework-rehearsal]] |
| Independent random keys with a slowly drifting query (our live toy: 4,096 keys of 32 numbers, top-64) | 63–80 % of each step's selections repeat for a drift between 0.2 and 0.4; hit rate 86 % at 0.25 — with nothing to compress ($\vRsq = 0.000$). The first draft's larger toy gave 63–84 % | [[#idea-the-leak]] |

::: takeaway
- Our own numbers come from small, seeded simulations; they check directions and orders of magnitude, not KV caches.
:::
