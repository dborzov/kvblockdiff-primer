---
title: References
nav: References
group: Facts and sources
lede: The papers, the classics and the experiment repository this site cites, with the page that discusses each.
cards:
  - q: Which classic results formalize "the receiver already has side information"?
    a: Slepian–Wolf (1973) and Wyner–Ziv (1976)
    wrong: ["Mattson et al. (1970)", "Bélády (1966)", "Huffman (1952)"]
    why: Mattson's stack distances and Bélády's policy are about caches; Huffman is about prefix codes.
    sec: list
  - q: Where do the trial ids quoted in the receipts of Part VIII (env-t0096, r25-t0003) come from?
    a: The ledgers of the experiment repository kv-compress-roofline, one JSON line per trial, which no agent may edit
    wrong: ["HiSparse's appendix", "SplitZip's benchmark table", "The site's own figure data, made up for illustration"]
    why: The harness wrote them during the campaigns of 29–30 October 2026; the site's figure data is extracted from those ledgers.
    sec: list
---

## The list {#list}

1. Xie et al., *HiSparse: Scaling Sparse-Attention Decoding with Hierarchical KV Cache Management*, arXiv:2608.07009 (2026); SGLang blog, April 2026. → [[#papers-hisparse]], [[#landscape-hisparse]] <!-- old-words -->
2. Guo & Joshi, *SplitZip: Ultra Fast Lossless KV Compression for Disaggregated LLM Serving*, arXiv:2605.01708 (2026). → [[#papers-splitzip]] <!-- old-words -->
3. Staniszewski & Łańcucki (NVIDIA), *KV Cache Transform Coding for Compact Storage in LLM Inference* (KVTC), ICLR 2026, arXiv:2511.01815. → [[#papers-kvtc]] <!-- old-words -->
4. Jiang, Yang, Liu, Zhang, He & Jin, *KVComp: A High-Performance, LLM-Aware, Lossy Compression Framework for KV Cache*, arXiv:2509.00579 (2025). → [[#papers-kvcomp]] <!-- old-words -->
5. Mi et al., *Efficient Remote Prefix Fetching with GPU-native Media ASICs* (KVFetcher; an earlier version was titled *Efficient Remote KV Cache Reuse with GPU-native Video Codec*, the first draft's KV-Codec), arXiv:2602.09725 (2026), SIGCOMM 2026. → [[#papers-kv-codec]] <!-- old-words -->
6. Liu et al., *CacheGen*, SIGCOMM 2024, arXiv:2310.07240. → [[#papers-cachegen]]
7. Kim, Park, Cho & Papailiopoulos, *Lexico: Extreme KV Cache Compression via Sparse Coding over Universal Dictionaries*, arXiv:2412.08890; ICML 2025. → [[#papers-lexico]] <!-- old-words -->
8. Hooper et al., *KVQuant*, NeurIPS 2024, arXiv:2401.18079; Liu et al., *KIVI*, ICML 2024, arXiv:2402.02750. → [[#papers-kvquant]], [[#papers-kivi]]
9. Hershcovitch et al., *ZipNN*, arXiv:2411.05239; Zhang et al., *DFloat11*, NeurIPS 2025. → [[#papers-float-coders]] <!-- old-words -->
10. Tang et al., *Quest*, ICML 2024, arXiv:2406.10774; Yuan et al., *Native Sparse Attention* (NSA), ACL 2025. → [[#papers-sparse-selectors]]
11. DeepSeek-V3.2 (DSA) and DeepSeek-V4 release notes; Qwen3.5 configuration (full-attention interval 4, head dimension 256, 2 KV heads). → [[#papers-sparse-selectors]], [[#measured-the-data]]
12. Micikevicius et al., *FP8 Formats for Deep Learning*, arXiv:2209.05433 (2022): the E4M3 and E5M2 definitions. → [[#reference-fp8-facts]], [[#school-fp8]]
13. Hao & Shi, *Matrix factorizations for reversible integer mapping*, IEEE Trans. Signal Processing, 2001 (triangular elementary reversible matrices); Hao (2004), the PLUS factorization. → [[#papers-classics]], [[#toolbox-lifting]]
14. Slepian & Wolf (1973), Wyner & Ziv (1976), coding with side information; Mattson et al. (1970), stack distances and LRU; Bélády (1966), optimal replacement; Huffman (1952); Duda (2009), rANS. → [[#papers-classics]], [[#school-codes]], [[#school-arithmetic]]
15. **The experiment repository**, `kv-compress-roofline` (snapshotted under `experiment_repos/` beside this site): the harness `kvcr`, the two research campaigns of 29–30 October 2026 (C1: 4 researcher agents, 218 ledger trials; C2: about 21 agents, 169 trials), 126 compressors, the ledgers, the verification notes `notes/00…05` and the pinned-number sheet `PART-XI-SPEC.md`, and the target `02-qwen3.5-2b-agent-long30` (30 sequences of Qwen3.5-2B's orchard, 20.9 GB of values). Every trial id in a receipt on this site is a row of its ledgers. → [[#measured-dispatch]], [[#scenario-the-harness]], [[#reference-numbers]]

::: note practice How to cite a number from this site
Quote the page, the grade and the receipt: "0.636, verified, compressor 121 on `V · all · cherry v[t, l, :, :] · stretch 4096 · leash 293`, two development sequences, ledger trial env-t0096 (Part VIII)". A ratio from a different screen is a different sample and cannot be subtracted from it ([[#measured-signal-or-noise]]).
:::

::: takeaway
- Each paper has its own page in Part IX, retold in this site's vocabulary with our doubts spelled out.
- The experiment repository is the source of every campaign number; its ledgers are the receipts.
:::
