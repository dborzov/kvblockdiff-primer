---
title: "Sparse-attention selectors: DSA, NSA, Quest, DeepSeek-V4, GLM-5.1"
nav: Sparse selectors
group: The serving side
lede: Five ways to choose which stored positions attention reads. They differ in how they score the past and, more important to us, in what one pick covers. The second difference decides the cherry shape of the scenario each design needs.
cards:
  - q: In the toy step, what changes when the selector is switched from DSA to Quest or NSA with the same budget?
    a: The picks arrive in runs of consecutive positions inside fewer stretches, at some cost in precision
    wrong: ["Attention reads twice as many positions", "The picks become single scattered tokens", "The relevance scores change"]
    why: Group selectors score runs of positions and take whole runs. The toy's readout shows fewer stretches touched and fewer of the true top 8 caught.
    sec: idea
  - q: What do all five selectors assume, and this project relies on?
    a: Each names, per layer, which positions attention will read before any orchard bytes are touched
    wrong: ["Each picks single tokens one by one", "Each must be trained together with the LLM", "Each stores the orchard in compressed form"]
    why: That announcement is the demand signal a hot cache, or a delta store, serves. Everything else about the selectors can differ.
    sec: assume
  - q: How does Quest score a stretch of 16 positions without reading every key in it?
    a: It keeps each element's smallest and largest key value over the stretch and computes an upper bound of the query–key score
    wrong: ["It reads one trained summary key per stretch", "It averages the keys of the stretch", "It reuses the previous step's attention weights"]
    why: For each element, whichever end (min or max) gives the larger product with the query's element bounds every key in the stretch; summing over elements bounds the whole score.
    sec: show
  - q: Under DeepSeek-V4, what does one pick cover?
    a: One row that squeezes 4 consecutive tokens into one; the indexer picks the top 512 or 1024 of those rows
    wrong: ["One token at one layer, as in DSA", "One token for a group of layers", "A stretch of 2048 tokens"]
    why: V4 first squeezes every 4 tokens into one row and then selects among the rows. The thing a cache or a delta store serves is the squeezed row.
    sec: show
  - q: Why does GLM-5.1's shared selection call for a different scenario from DSA's?
    a: One pick covers one position for a whole group of layers, so one ask must return several layers' cherries, served by one dictionary or by a multi-layer cherry
    wrong: ["GLM-5.1 has no orchard", "GLM-5.1 picks fewer positions", "GLM-5.1 stores keys only"]
    why: What a pick covers decides what one ask returns, hence the cherry shape and what a dictionary must serve. DSA's per-layer pick maps to one-layer cherries with a dictionary per layer.
    sec: ours
  - q: Quest's "page" is which object on this site?
    a: A stretch of 16 tokens
    wrong: ["A punnet", "A cherry of 16 elements", "A dictionary"]
    why: 'A page is 16 consecutive positions scored and picked together: a stretch, with the stretch length fixed at 16 by the selector rather than chosen by us.'
    sec: words
---

Here is one decode step at one layer, as a toy: 64 past positions, each with a relevance score, how much attention would want it. The budget is 8 positions. Four selectors from four papers each make their pick. Before reading anything else, look at *where* their picks land.

::: figure fig-papers-selectors paSelectors
**Four selectors, one step, the same budget.** Horizontal axis: past positions 0–63 of one layer (toy). Bars: each position's true relevance score (illustrative, from a fixed seed; arbitrary units). Highlighted bars are the positions the chosen selector makes attention read; the faint vertical bands mark stretches of 16 positions, the unit a punnet dictionary would use. The switch picks the selector: DSA scores every position with a cheap separate scorer and takes the best 8 one by one; Quest and NSA score runs of 4 consecutive positions and take the best 2 runs; the V4-style "CSA" first squeezes every 4 positions into one row and reads the best 2 rows. The readout counts what was read, how many 16-position stretches it touched, how many runs the picks form, and how much of the true top 8 was caught.
:::

::: try
1. Start with DSA: its 8 picks catch 7 of the true top 8, but they are scattered: four runs, spread over all four stretches.
2. Switch to Quest or NSA: the same budget arrives as two runs of 4, inside two stretches. The price is precision: 5 of the true top 8, and 90 % of the relevance DSA collects.
3. Switch to CSA: attention now reads 2 rows, not 8 positions, each a blend of 4 tokens. The thing a cache would store has changed.
:::

## The idea, by example {#idea}

All five replace "read every stored position" with "read $\vk$ of them". In the toy, the orchard of one layer is `v[:64, layer_id]`, 64 cherries of shape `(2, 256)` on [[bench|the Bench]]; the indexer returns a set $\vS$ of positions, and attention runs over `v[S, layer_id]` only ([[#landscape-sparse-attention]]). What differs is how they score, and what unit one [[pick]] covers.

| selector | how it scores the past | what one pick covers | extra state kept | trained? |
|---|---|---|---|---|
| **[[dsa\|DSA]]** (DeepSeek-V3.2) | a small separate [[indexer]] with its own compact key per token, few heads, low precision | one position at one layer; top 2048 per layer | one compact indexer key per token | with the LLM |
| **NSA** (Yuan et al., ACL 2025) | the query against one learned summary key per run of consecutive tokens; plus a sliding window and a coarse branch | one run of consecutive positions at one layer | one summary key per run | from pre-training |
| **Quest** (Tang et al., ICML 2024) | an upper bound of the query–key score from each element's min and max over a stretch of 16 tokens | one stretch of 16 positions at one layer | min and max key per [[element]] per stretch | no; works on existing LLMs |
| **DeepSeek-V4** | an indexer over squeezed rows | one row that squeezes 4 consecutive tokens; top 512 (Flash) or 1024 (Pro) | the squeezed rows replace the tokens | with the LLM |
| **GLM-5.1** | a DSA-style indexer, run once for a group of layers | one position for a whole group of layers | one indexer key per token per group | with the LLM |

The last two rows are the ones that matter to the scenario, because a pick is served with one or more [[cherry|cherries]] by the [[cherry-shape|cherry shape]], and these two change what a pick is. Under DSA a pick is `(layer_id, token_pos_id)` and one `(2, 256)` cherry serves it. Under GLM-5.1 a pick is one position for, say, $n$ layers at once: served by one `(n, 2, 256)` cherry, or by $n$ one-layer cherries whose dictionaries may be shared. Under V4 a pick is a squeezed row, and the stretch counts rows, not tokens. All five live on the miss path of [[#papers-reading-guide/data-path]]: every one still keeps the whole orchard and reads a little of it.

::: takeaway
- DSA picks single positions per layer; NSA and Quest pick runs; V4 picks squeezed rows; GLM-5.1 picks a position for a group of layers.
- What a pick covers decides the cherry shape; how the selector scores does not.
:::

## What they assume {#assume}

Three things, shared by all five and taken for granted in every introduction.

1. **Attention weight is concentrated.** A few stored positions take most of the softmax mass, so reading only those changes the output little. This is the reason sparse attention exists at all ([[#landscape-attention]]).
2. **Everything must still be kept.** The selection drifts from step to step, so a position skipped now may be picked later. None of the five shrinks the [[orchard]]; they shrink what is read. The miss path exists for all of them.
3. **The picks are announced before any orchard bytes move.** Each selector scores from its own small state (indexer keys, summary keys, per-element bounds) and only then touches keys and values. That advance notice is the demand signal a [[hot-cache]] or a [[dictionary-shelf]] serves.

A fourth, implicit in V4 and in NSA's coarse branch: a row that blends 4 tokens is a different object from a raw cherry, with statistics of its own. Nobody measures them; they are simply what the LLM learned to read.

::: takeaway
- Concentrated attention, everything kept, picks announced first: the three shared assumptions.
- Squeezed rows are new objects whose statistics no paper reports.
:::

## What they show {#show}

Quest's bound is the one result worth redoing at a desk, because it is pure bookkeeping. For a stretch of positions, keep for each element $\vc$ the smallest and largest key value. Then for the query $\vq$ of this step,

$$
\text{score bound of a stretch} = \sum_{\vc} \max\Big(\vq_{\vc} \cdot \underbrace{\min_{\vt} \vK_{\vt,\vc}}_{\text{smallest key in the stretch}},\; \vq_{\vc} \cdot \underbrace{\max_{\vt} \vK_{\vt,\vc}}_{\text{largest key in the stretch}}\Big)
$$ {#eq-papers-quest-bound}

For each element one of the two ends gives the largest possible product with $\vq_{\vc}$, whatever its sign, so no key in the stretch can score above the bound, and stretches with a low bound can be skipped safely. A toy of 4 elements and a stretch of 3 keys makes it exact by hand.

The rest of what they show is harder to check:

| their measurement | value | where | verifiable? |
|---|---|---|---|
| DSA keeps the top 2048 positions per layer; indexer keys in low precision | design constants | DeepSeek-V3.2 documentation | stated, not measured |
| NSA trained from pre-training matches or beats full attention on their benchmarks | quality claims | NSA paper, abstract | their rig and benchmarks |
| Quest needs no retraining and keeps accuracy at a fraction of the reads | quality claims | Quest paper, abstract | their rig |
| V4 squeezes 4 tokens per row and picks 512 (Flash) or 1024 (Pro) rows; a second branch squeezes 128 tokens per row and reads all of them | design constants | V4 technical report and release notes | stated |
| GLM-5.1 selects once for a group of layers; prefetching those picks hides about half of the remaining miss time | design and a timing | HiSparse abstract | the timing is their rig |

The exact run lengths of NSA and the group size of GLM-5.1 could not be confirmed; the toy uses runs of 4.

::: takeaway
- Quest's bound is exact arithmetic and worth redoing; the quality claims are their measurements on their rigs.
- Design constants (2048; 4 per row; 512 or 1024 rows) are stated facts, not results.
:::

## What it says about our scenario {#ours}

**Builds on.**
- The definition of a pick as "one unit of demand, served by one or more cherries", and the three designs it lists ([[#landscape-sparse-attention]]).
- The map of applications in [[#scenario-why-vary]] and [[#app-which-application]]: DSA → one-layer cherries, one dictionary per layer per stretch; GLM-5.1 → multi-layer cherries `(n, 2, 256)` or one-layer cherries under a dictionary shared across the group; V4 → cherries of the squeezed row, stretches counted in rows.
- The campaigns' reading on shapes: joining the two heads of a layer into one cherry saved 0.032 of ratio, joining all six layers a further 0.004, on 20 of 20 sequences (encoded bytes on one window per sequence, not verified in a separate process; [[#measured-cutting-the-tensor]]). A GLM-style design gets the second saving for free; a DSA-style design must pay for it in the dictionary.

**Conflicts with.** The first draft's claim that the project is "indifferent to which indexer is used". Half holds: the interface is a set of positions per layer, and HiSparse itself runs DSA, NSA and Quest. Half does not: group picks (NSA, Quest) pile misses into few stretches by construction, which answers part of [[#hypotheses-heavy-stretches]] by design rather than by measurement; and a run of consecutive picks arrives together, so a short stream over the run becomes legal where the [[leash]] forbade it. Token picks and group picks are different access patterns and need different scenarios.

**Suggests.**
- A stand-in indexer for the Bench (exact top-$\vk$ attention per layer) to produce a pick trace, since no selector ran there ([[#plan-queries-and-picks]]).
- A scenario whose cherry is a V4-style squeezed row, with every neighbour measurement repeated on rows: the campaigns' adjacent-token result (joining 2 tokens into one cherry cost +0.037) is about raw tokens, not blended ones ([[#plan-next-in-the-harness]]).
- For GLM-5.1: a scenario with one-layer cherries and one dictionary shared across the group, against multi-layer cherries, on the same punnets ([[#hypotheses-upstairs]] says the shared bits are small, 0.03–0.08 bit per element between adjacent layers, so the dictionary sharing is the lever, not the cherry).

::: theme access-pattern
The selector's granularity is an access pattern. Single-position picks force a compressor where every cherry decodes cold; run picks allow a compressor that decodes a short run at once. Same orchard, same hot cache, different compressor shape.
:::

::: takeaway
- Indifferent to how a selector scores; not indifferent to what a pick covers.
- Each design is a scenario: cherry shape and dictionary sharing follow from the pick.
:::

## Their words, ours {#words}

| their word | ours | where the meanings differ |
|---|---|---|
| selector, sparse attention mechanism | the [[indexer]] | ours names the cheap scorer only; attention itself stays attention |
| selected tokens, top-k | the pick set $\vS$, $\vk$ [[pick\|picks]] | a pick is a unit of demand `(layer_id, token_pos_id)`, or a position for a group of layers, or a squeezed row |
| page (Quest) | a [[stretch]] of 16 tokens | a page's length is fixed by the selector; our stretch length is a knob |
| block (NSA) | a run of consecutive positions | the same object as a short stretch, chosen by the LLM's training |
| compressed KV, compressed entry (V4) | a squeezed row | a new object with its own statistics; a cherry of the scenario built on it |
| channel (Quest's min/max) | [[element]] | one position inside a head vector |
| KV cache | the [[orchard]] | never pruned by any of the five |

::: aside source Receipts
DSA: DeepSeek-V3.2 model documentation (top 2048 per query; indexer keys in low precision). NSA: Yuan et al., *Native Sparse Attention: Hardware-Aligned and Natively Trainable Sparse Attention*, ACL 2025. Quest: Tang et al., *Quest: Query-Aware Sparsity for Efficient Long-Context LLM Inference*, ICML 2024 (page size 16; the bound of Eq. IX.3·1 is their §3). DeepSeek-V4: the technical report and release notes (4 tokens per compressed entry; top 512 for Flash, 1024 for Pro; a second branch compresses 128 tokens into one and reads all of them). GLM-5.1's shared selection and the prefetch timing: the HiSparse abstract ([[#papers-hisparse]]). Re-checked against abstracts and documentation; the exact block size of NSA and the layer-group size of GLM-5.1 could not be confirmed. The campaigns' shape numbers: [[#measured-cutting-the-tensor]] (same-window comparison, 20 sequences of target 02, encoded bytes).
:::
