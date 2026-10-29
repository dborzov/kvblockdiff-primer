---
title: Prior-art map
lede: Every related work on one table — lossy or lossless, which data path, which dictionary scope, and what we take from it.
cards:
  - q: Which of the related works is lossless AND targets the sparse-decode miss path with random access?
    a: None of them — that combination is what would be new
    wrong: ["SplitZip", "KVTC", "CacheGen"]
    why: SplitZip is lossless but bulk and context-free; KVTC and CacheGen are lossy; HiSparse moves raw entries.
    sec: map
---

## The map {#map}

| work | lossy or lossless | dictionary scope | data path it targets | what we take |
|---|---|---|---|---|
| [[#papers-hisparse\|HiSparse]] (2026) | exact (no compression) | — | sparse-decode miss path, GPU-memory residency | the system we sit under; trace numbers; per-layer caches |
| [[#papers-splitzip\|SplitZip]] (2026) | lossless | global (exponent histogram) | prefill→decode bulk transfer | solo coding; the fixed-length-with-escapes decoder shape; the 8-bit numbers |
| [[#papers-float-coders\|ZipNN, DFloat11, Huff-LLM]] | lossless | global | weights, storage | exponent redundancy; the mantissa is noise |
| [[#papers-kvcomp\|KVComp]] (2025) | lossy | global per layer | GPU-resident KV | GPU entropy decoding is feasible |
| [[#papers-kvtc\|KVTC]] (2026) | lossy | global (calibrated PCA) | KV storage and reuse | transform coding works on KV; our KLT bound is its lossless shadow |
| [[#papers-lexico\|Lexico]] (2024) | lossy | global (universal dictionary) | GPU-memory footprint | much KV structure is global |
| [[#papers-cachegen\|CacheGen]] (2024) | lossy | token-adjacent deltas | network transfer | token-adjacent similarity exists at quantized precision |
| [[#papers-kv-codec\|KV-Codec]] (2026) | lossless (video codec) | roughly per request | remote KV reuse | slicing along the token axis gives the most similarity between "frames" |
| [[#papers-kivi\|KIVI]] / [[#papers-kvquant\|KVQuant]] (2024) | lossy | — | GPU memory | per-channel key structure; keys before RoPE; outlier channels |
| **kv-blockdiff** | **lossless at 8 bits** | **global / request / block, measured as a ladder with controls** | **random-access miss path; dictionary residency; victim tier** | — |

::: takeaway
- Lossless KV coding exists only as bulk, context-free coding; lossy KV work shows structure but not how many bits it is worth.
- The empty cell — lossless, random-access, scope-aware, on the miss path — is this project. → [[#papers-what-would-be-new]]
:::
