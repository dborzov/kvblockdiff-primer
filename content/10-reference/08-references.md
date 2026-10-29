---
title: References
lede: The papers and classics this site cites, with the page that discusses each.
cards:
  - q: Which classic results formalize "the receiver already has side information"?
    a: Slepian–Wolf (1973) and Wyner–Ziv (1976)
    wrong: ["Mattson et al. (1970)", "Bélády (1966)", "Huffman (1952)"]
    why: Mattson's stack distances and Bélády's policy are about caches; Huffman is about prefix codes.
    sec: list
---

## The list {#list}

1. Xie et al., *HiSparse: Scaling Sparse-Attention Decoding with Hierarchical KV Cache Management*, arXiv:2608.07009 (2026); SGLang blog, April 2026. → [[#papers-hisparse]]
2. Guo & Joshi, *SplitZip: Ultra Fast Lossless KV Compression for Disaggregated LLM Serving*, arXiv:2605.01708 (2026). → [[#papers-splitzip]]
3. *KV Cache Transform Coding for Compact Storage in LLM Inference* (KVTC), ICLR 2026, arXiv:2511.01815. → [[#papers-kvtc]]
4. *KVComp: A High-Performance, LLM-Aware, Lossy Compression Framework for KV Cache*, arXiv:2509.00579 (2025). → [[#papers-kvcomp]]
5. *Efficient Remote KV Cache Reuse with GPU-native Video Codec* (KV-Codec), arXiv:2602.09725 (2026). → [[#papers-kv-codec]]
6. Liu et al., *CacheGen*, SIGCOMM 2024, arXiv:2310.07240. → [[#papers-cachegen]]
7. Kim et al., *Lexico: Extreme KV Cache Compression via Sparse Coding over Universal Dictionaries* (2024). → [[#papers-lexico]]
8. Hooper et al., *KVQuant*, NeurIPS 2024, arXiv:2401.18079; Liu et al., *KIVI*, ICML 2024, arXiv:2402.02750. → [[#papers-kvquant]], [[#papers-kivi]]
9. Hershcovitch et al., *ZipNN*, arXiv:2411.05239; Zhang et al., *DFloat11*, NeurIPS 2025. → [[#papers-float-coders]]
10. Tang et al., *Quest*, ICML 2024, arXiv:2406.10774. → [[#papers-sparse-selectors]]
11. DeepSeek-V3.2 (DSA) and DeepSeek-V4 release notes; Qwen3.5 model configuration (full-attention interval 4, head dimension 256). → [[#papers-sparse-selectors]], [[#plan-data]]
12. Hao & Shi, *Matrix factorizations for reversible integer mapping* (PLUS factorization), IEEE Trans. Signal Processing, 2001. → [[#missed-lifting]]
13. Slepian & Wolf (1973), Wyner & Ziv (1976) — coding with side information; Mattson et al. (1970) — stack distances and LRU; Bélády (1966) — optimal replacement. → [[#papers-classics]]

::: takeaway
- Each paper has its own page in Part V, retold in this site's vocabulary with our doubts spelled out.
:::
