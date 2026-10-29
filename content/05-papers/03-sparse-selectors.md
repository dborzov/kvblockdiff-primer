---
title: "Sparse-attention selectors: DSA, NSA, Quest, CSA"
nav: Sparse selectors
lede: Four ways to choose which past entries attention reads. They differ in what they score and in how coarse their picks are — and the second difference matters to us more than the first draft admitted.
cards:
  - q: What do DSA, NSA, Quest and CSA have in common that our design relies on?
    a: Each announces, per layer, which positions attention will read before any KV bytes are touched
    wrong: ["Each picks single tokens one by one", "Each must be trained together with the model", "Each stores the KV cache in compressed form"]
    why: That announcement is the demand signal a hot cache, or a delta store, serves. Everything else about the selectors can differ.
    sec: four
  - q: How does Quest score a page of positions without reading every key in it?
    a: It keeps each channel's smallest and largest key value in the page and computes an upper bound of the query–key score
    wrong: ["It reads one trained summary key per page", "It averages the keys of the page", "It reuses the previous step's attention weights"]
    why: For each channel, whichever end (min or max) gives the larger product with the query's element bounds every key in the page; summing over channels bounds the whole score.
    sec: four
  - q: Under DeepSeek-V4's CSA, what is one "entry" that attention reads?
    a: One learned compression of 4 consecutive tokens — fewer, larger units than tokens
    wrong: ["One token, exactly as in DSA", "The keys of one head only", "A block of 2048 tokens"]
    why: CSA merges every 4 tokens into one compressed entry and lets its indexer pick the top 512 (Flash) or 1024 (Pro) of those.
    sec: four
  - q: Why does a selector that picks pages or blocks help a design built on block dictionaries?
    a: Its picks come in runs of consecutive positions, so misses pile into fewer blocks
    wrong: ["It makes each entry smaller", "It removes misses entirely", "It makes neighbouring entries more alike"]
    why: Fewer distinct blocks per step means fewer dictionaries that must be resident on the GPU — the heavy-block question is partly answered by the selector's design.
    sec: indifferent
---

Here is one decode step at one layer, as a toy: 64 past positions, each with a relevance score — how much attention would want it. The budget is 8 positions. Four selectors from four papers each make their pick. Before reading anything else, look at *where* their picks land.

::: figure fig-papers-selectors paSelectors
**Four selectors, one step, the same budget.** Horizontal axis: past positions 0–63 of one layer (toy). Bars: each position's true relevance score (illustrative, from a fixed random seed; arbitrary units). Highlighted bars are the positions the chosen selector makes attention read; the faint vertical bands mark 16-position blocks, the unit a block dictionary would use. The switch picks the selector: DSA scores every position with a cheap separate scorer and takes the best 8 one by one; Quest and NSA score groups of 4 consecutive positions and take the best 2 groups; CSA first merges every 4 positions into one compressed entry and reads the best 2 of those. The readout counts what was read, how many 16-position blocks it touched, and how much of the true top 8 it caught.
:::

::: try
1. Start with DSA: its 8 picks catch 7 of the true top 8, but they are scattered — four runs, spread over all four blocks.
2. Switch to Quest or NSA: the same budget arrives as two runs of 4, inside two blocks. The price is precision: only 5 of the true top 8, and 90 % of the relevance DSA collects.
3. Switch to CSA: attention now reads 2 entries, not 8 — each a blend of 4 tokens. The thing a cache would store has changed.
:::

## Four ways to pick {#four}

All four replace "read every past [[entry]]" with "read $\vk$ of them". What differs is how they score, and what unit they pick.

| selector | how it scores the past | unit it picks | extra state kept per position | trained? |
|---|---|---|---|---|
| **[[dsa\|DSA]]** (DeepSeek-V3.2; GLM-5.x) | a small separate [[indexer]] with its own compact key per token, few heads, low precision | single tokens; top 2048 | one compact indexer key | yes, with the model |
| **NSA** (Yuan et al., ACL 2025) | the query against one learned summary key per block; plus a sliding window and a coarse summary branch | blocks of consecutive tokens | one summary key per block | yes, from pre-training |
| **Quest** (Tang et al., ICML 2024) | an upper bound of the query–key score, from each channel's min and max over a page | pages of consecutive tokens | min and max key per [[channel]] per page | no — works on existing models |
| **CSA** (DeepSeek-V4) | an indexer over compressed entries | entries that each merge 4 tokens; top 512 (Flash) or 1024 (Pro) | the compressed entries replace the tokens | yes |

Quest's trick is worth seeing once, because it is pure bookkeeping. For a page of positions, store for each channel $\vc$ the smallest and largest key value. Then, for the query $\vq$ of this step,

$$
\text{score bound of a page} = \sum_{\vc} \max\Big(\vq_{\vc} \cdot \underbrace{\min_{\vt} \vK_{\vt,\vc}}_{\text{smallest key in the page}},\; \vq_{\vc} \cdot \underbrace{\max_{\vt} \vK_{\vt,\vc}}_{\text{largest key in the page}}\Big)
$$ {#eq-papers-quest-bound}

For each channel, one of the two ends gives the biggest possible product with $\vq_{\vc}$, whatever the sign of $\vq_{\vc}$. So no key in the page can score above the bound, and pages with a low bound can be skipped safely.

::: note literature Sources and checks
DSA: DeepSeek-V3.2 model documentation (top 2048 per query; indexer keys kept in low precision). NSA: Yuan et al., *Native Sparse Attention*, ACL 2025. Quest: Tang et al., *Quest: Query-Aware Sparsity for Efficient Long-Context LLM Inference*, ICML 2024. CSA: the DeepSeek-V4 technical report and release notes (4 tokens per entry; top 512 or 1024; it alternates with a branch that compresses 128 tokens into one and reads all of them). Re-checked against abstracts and documentation; the exact block and page sizes we could not confirm, so the toy uses 4.
:::

::: takeaway
- DSA picks single tokens with a trained side-scorer; NSA and Quest pick groups of consecutive positions; CSA changes the unit itself.
- All four announce their picks before attention reads any KV bytes.
:::

## Why we are (mostly) indifferent {#indifferent}

The first draft said our work "is indifferent to which indexer is used". Half of that holds up.

The half that holds:

- **The interface is the same.** Every selector emits a set of positions per layer before attention touches the KV. A [[hot-cache]], and a delta store behind it, serve that set without knowing how it was chosen. HiSparse itself runs with DSA, NSA and Quest ([[#papers-hisparse]]).
- **Everything must still be kept.** None of them shrinks the history; they shrink what is *read*. The miss path exists for all four.
- **Merged entries change the unit, not the problem.** CSA, and NSA's summary branch, store fewer, larger entries. There is still one fixed-size entry per (merged) position that must be available.

The half that does not:

:::: compare Token picks versus group picks
::: col Token picks (DSA)
- Misses can land anywhere in the history, one by one.
- Whether they concentrate into a few blocks is a property of the model's queries — the open [[heavy-block]] question.
- Each miss is one entry, decoded alone.
:::
::: col Group picks (NSA, Quest)
- Picks come in runs of consecutive positions, so misses pile into few blocks *by construction* — at some cost in precision (the toy above).
- A run arrives together, so the neighbour of an entry arrives with it — a natural place to use [[fallen-apple]].
- A whole run could be one small stream: coder state within a run becomes allowed.
:::
::::

And for merged entries (CSA): an entry that blends 4 tokens has different statistics from a raw one, and its neighbours are 4 tokens apart. Every measurement of [[neighbour]] would have to be repeated on them.

::: theme access-pattern
The selector's granularity is an access pattern. Token-level picks force a codec where every entry decodes alone; group-level picks allow a codec that decodes a short run at once. Same model family, same cache, different codec shape.
:::

::: takeaway
- Indifferent to *how* a selector scores: the cache and the store see only a set of positions.
- Not indifferent to *what unit* it picks: groups of consecutive positions make dictionary residency easier and allow per-run decoding; merged entries need their statistics measured afresh.
:::
