---
title: Prior-art map
nav: Prior-art map
group: Facts and sources
lede: Every related work on one table, lossy or lossless, which data path it serves, what its dictionary is and what scope it has, and what we take from it now that the campaigns have run.
cards:
  - q: Which related work is lossless AND serves one-cherry-at-a-time random access on the sparse-decode miss path?
    a: None of them; that combination is what would be new
    wrong: ["SplitZip", "KVTC", "CacheGen"]
    why: SplitZip is lossless but bulk and solo; KVTC and CacheGen are lossy; HiSparse moves raw picks.
    sec: map
  - q: CacheGen codes nearby tokens as deltas against a group reference. What did the campaigns measure for that idea at 8 bits, lossless?
    a: Joining two or four adjacent tokens into one cherry costs +0.037 and +0.063 of ratio; the reference that pays is a far repeat of the same token
    wrong: ["A saving of 0.037 and 0.063", "Nothing could be measured under a leash", "The same gain CacheGen reports"]
    why: At quantized precision nearby values look close; counted in bits, the adjacent token shares 0.058 bit per element at KV layer 0. Echo, not distance.
    sec: changed
---

Every paper has its own page in Part IX, retold in this site's words with our doubts spelled out ([[#papers-reading-guide]]). This page is the index: one row per work, and the empty cell that is this project.

## The map {#map}

| work | lossy or lossless | dictionary and its scope | data path it targets | what we take |
|---|---|---|---|---|
| [[#papers-hisparse\|HiSparse]] (2026) | exact (no compression) | none | the sparse-decode miss path; GPU residency of raw picks | the system we sit under; the trace numbers; per-layer hot caches |
| [[#papers-splitzip\|SplitZip]] (2026) | lossless | global: an exponent histogram | prefill-to-decode bulk transfer ([[disaggregation]]) | solo coding at 1.32× on BF16; the fixed-length-with-escapes decoder shape (only its escape list stands in the way of decoding one cherry alone); the 8-bit numbers |
| [[#papers-float-coders\|ZipNN, DFloat11, Huff-LLM]] | lossless | global | weights, storage | exponent redundancy; the mantissa is close to noise <!-- old-words -->
| [[#papers-kvcomp\|KVComp]] (2025) | lossy | global, per layer | GPU-resident orchards | GPU entropy decoding is feasible |
| [[#papers-kvtc\|KVTC]] (2026) | lossy | global: a calibrated PCA basis | orchard storage and reuse | transform coding works on orchards; our KLT bound is its lossless shadow |
| [[#papers-lexico\|Lexico]] (2024) | lossy | global: a universal dictionary, [[sparse-coding]] | GPU memory footprint | much orchard structure is global |
| [[#papers-cachegen\|CacheGen]] (2024) | lossy | deltas against a reference per group of 10 tokens | network transfer | nearby tokens' values look close at quantized precision |
| [[#papers-kv-codec\|KV-Codec]] (2026) | lossless video coding after rounding to integers | roughly per sequence | remote orchard reuse | a hint that slicing along the token axis helps, without the controls that would make it evidence <!-- old-words -->
| [[#papers-kivi\|KIVI]] / [[#papers-kvquant\|KVQuant]] (2024) | lossy | per [[scale-group\|scale group]] / per furrow | GPU memory | per-furrow key structure; keys before RoPE; outlier furrows |
| **kvblockdiff** | **lossless at 8 bits** | **global / sequence / stretch scope, measured as a ladder with controls** | **the random-access miss path; dictionary residency; a victim tier** | |

::: takeaway
- Lossless orchard compression exists only as bulk, solo coding; lossy work shows where structure lives but not how many bits it is worth.
- The empty cell, lossless, random-access, scope-aware, on the miss path, is this project ([[#papers-what-would-be-new]]).
:::

## What changed since the map was drawn {#changed}

The map was drawn before the data. The campaigns settled some of what the lossy papers only hinted at ([[#measured-scorecard]]).

- **CacheGen's token-axis deltas.** Lossless, at 8 bits, with every byte charged, the adjacent token is nearly useless at the outer layers (0.058 bit per element at KV layer 0) and joining adjacent tokens into one cherry costs +0.037 and +0.063 of ratio. The reference that pays is a far repeat of the same token: [[echo]], not [[fallen-apple|fallen-apple]] similarity ([[#measured-cutting-the-tensor]]).
- **KVTC's calibrated basis.** Fixed rotations lose 0.28–0.32 bit per element against linear prediction, because rotating then rounding costs about 0.25 bit and a rotation has no neighbourhood to work with on element numbers; a prediction rule fit on another sequence does carry over, 91–96 % of its gain ([[#measured-codebooks-and-rotations]]).
- **Lexico's universal dictionary.** Codebooks lost to reference cherries: a codeword is stored only to help others, a reference cherry must be stored anyway. A global [[shared-table|shared table]] remains legitimate and untried, waiting for an independent training corpus ([[#measured-where-the-bits-come-from]]).
- **KIVI and KVQuant's keys.** Pre-RoPE keys compress like values at the same depth, same compressor family, same mechanism order ([[#hypotheses-keys-and-values]]).
- **SplitZip's solo floor.** Confirmed within 0.002: 0.778 ideal on the Bench's values ([[#toolbox-solo]]).
- **HiSparse's access pattern.** The leash turned out cheap: a cold decode within 293 cherries' worth costs nothing at 4096 tokens, and a layout along the reference tree's paths makes a dictionary of half the punnet readable one cherry at a time ([[#measured-reading-one-cherry]]).

::: aside source Receipts
MI 0.058 at layer 3, tok2 +0.037 / tok4 +0.063, rotations +0.28–0.32 bit, rule carry-over 91–96 %, codebooks "the encoder chose no codebook on 72 of 72 blocks", keys 0.660 vs 0.673, solo 0.778, read budget 293 "costs nothing at 4096": PART-XI-SPEC §1.4–§1.9.
:::

::: takeaway
- Distance lost, repeats and the head axis won; rotations and codebooks lost to prediction and reference cherries.
- The random-access constraint is cheaper than the first draft feared; the memory lever is where the prize moved.
:::
