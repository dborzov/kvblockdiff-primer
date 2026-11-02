---
title: Lexico (2024)
nav: Lexico
group: Lossy KV compression
lede: One fixed alphabet of about 4 000 "atoms" per LLM, and every key or value vector spelled with a handful of them. It works across prompts and tasks, strong evidence that much of the orchard's structure is shared by all texts. Losslessly, every atom pays a tax.
cards:
  - q: What is sparse coding, in one sentence?
    a: Describing a vector as a weighted sum of a few atoms chosen from a large fixed dictionary, storing only which atoms and their weights
    wrong: ["Storing only the non-zero elements of a vector", "Rounding each element to 2 bits", "Rotating a vector onto its principal axes"]
    why: VQ is the special case of one atom with weight 1; a KLT uses every axis with a weight.
    sec: idea
  - q: What does Lexico take as known that makes one dictionary per LLM plausible?
    a: That the vectors an LLM produces lie near a few directions out of many, whatever the text
    wrong: ["That every text has its own alphabet", "That atoms must be refitted per sequence", "That keys and values share one alphabet"]
    why: The dictionary is trained once on Wikipedia text and never retrained; the bet is that the geometry belongs to the LLM, not to the prompt.
    sec: assume
  - q: With 8 atoms per vector, a dictionary of 4096 atoms and 8-bit weights, how many bits does one vector cost?
    a: 160 bits, 8 × (12 index bits + 8 weight bits)
    wrong: ["64 bits", "96 bits", "2048 bits"]
    why: Naming one of 4096 atoms takes log₂ 4096 = 12 bits. A 128-number vector at 16 bits is 2048 bits, so 160 bits is about 8 % of it.
    sec: show
  - q: For a lossless compressor using Lexico-like atoms (8 per vector, 4096 atoms, 8-bit weights, 128 elements per vector), what share of variance must the atoms explain just to break even?
    a: About 82 %
    wrong: ["About 25 %", "About 50 %", "About 99.9 %"]
    why: The tax is 160 bits / 128 elements = 1.25 bits per element; ½ log₂ 1/(1−R²) = 1.25 needs 1−R² = 2^−2.5 ≈ 0.18.
    sec: show
  - q: What did the campaigns find about structure that belongs to the LLM rather than to the text?
    a: A linear prediction rule fit on another sequence recovers 91–96 % of the gain, and the shuffle control barely moves it
    wrong: ["Nothing transfers between sequences", "Only the reference tree transfers", "A codebook of 4096 centroids beat every other stage"]
    why: Geometry belongs to the LLM; repeats belong to the text. That is Lexico's bet, measured in bits, for the prediction stage.
    sec: ours
  - q: Lexico's "universal dictionary" is, on this site, which kind of dictionary?
    a: A dictionary of global scope, one per LLM
    wrong: ["A dictionary per punnet", "A dictionary per sequence", "The solo family's fixed table"]
    why: Fit once on a calibration corpus and shared by every sequence; charged to nobody per punnet. "Universal" means across prompts and tasks, not across LLMs.
    sec: words
---

Imagine writing every word of a language with one fixed set of syllables. A long word needs a few of them; you never invent a new syllable for a new text. Lexico treats the vectors of an [[orchard]] that way. For each LLM it learns, once, a list of about 4 000 reference vectors, *atoms*. Every key or value vector the LLM produces is then written as a weighted sum of a handful of atoms (the published code's example uses 8). In the toy of this page, one 32-element vector `v[t, l, h, :]` is almost exactly

$$
2.5 \cdot \text{atom}_{5} \;-\; 1.8 \cdot \text{atom}_{40} \;+\; 1.2 \cdot \text{atom}_{97} \;+\; \text{a little noise}
$$

and the store keeps three atom numbers and three weights instead of 32 numbers. The surprise is how far this goes in real LLMs: the same atoms, trained on Wikipedia articles, serve math problems and long documents alike.

## The idea, by example {#idea}

::: define sparse-coding
- **What it is.** Describe a [[vector]] as a weighted sum of a few vectors ("atoms") picked from a large, fixed [[dictionary]] of $\vnatoms$ atoms, and store only which $\vs$ atoms and their weights.
- **Example.** The toy vector above: three atoms out of 128.
- **Easy to confuse with** [[vq|VQ]] (exactly one atom, weight 1, a [[codebook]] of centroids) and a [[klt|KLT]] (every axis of a basis, each with a weight). Sparse coding sits between them: a few atoms from *more* atoms than the vector has elements.
:::

:::: cols
::: col KLT
$\vd$ axes, all used. Each vector: $\vd$ weights. No naming needed; every axis is always there.
:::
::: col VQ
$\vC$ centroids, one used. Each vector: one index of $\log_2 \vC$ bits, the [[index-tax]].
:::
::: col Sparse coding
$\vnatoms$ atoms, $\vs$ used. Each vector: $\vs$ indices of $\log_2 \vnatoms$ bits, and $\vs$ weights.
:::
::::

Lexico lives on the GPU-memory road of [[#papers-reading-guide/data-path]]. The steps:

1. **Learn the dictionary once per LLM**, on WikiText-103. It is never retrained and does not grow with the number of sequences.
2. **Pick atoms greedily for each new vector** (orthogonal matching pursuit): take the atom that best matches what is still unexplained, refit the weights of all atoms chosen so far, repeat until $\vs$ atoms are used.
3. **Store indices and 8-bit weights.** Lexico keeps the weights in 8 bits instead of 16 with little loss.

What one vector costs, with $\vs = 8$ atoms out of $\vnatoms = 4096$:

$$
\vs \,(\underbrace{\log_2 \vnatoms}_{\text{which atom}} + \underbrace{8}_{\text{its weight}}) = 8 \times (12 + 8) = 160 \text{ bits}
$$ {#eq-papers-lexico-cost}

A 128-element vector in 16 bits is 2 048 bits, so that is about 8 % (our arithmetic, for an assumed head of 128 elements; the paper's memory figures also include parts kept uncompressed).

::: takeaway
- Sparse coding writes a vector as a few atoms of a large fixed dictionary: between VQ (one centroid) and a KLT (every axis).
- Lexico's dictionary is fitted once per LLM on generic text; each atom costs an index and a weight, 20 bits in its setting.
:::

## What they assume {#assume}

1. **The vectors lie near a few directions out of many.** The whole method rests on it; the introduction treats it as the usual low-dimensional-structure background of representation learning.
2. **The structure belongs to the LLM, not to the text.** A dictionary trained on Wikipedia is expected to serve math and long-document tasks. Stated as a hypothesis and then supported by results.
3. **Accuracy at a memory budget is the yardstick**, as on every lossy page.
4. **Encoding may be slow-ish.** Matching pursuit runs for every new vector at every layer during decoding; the paper treats the serving system as memory-bound enough to afford it.

::: takeaway
- Known: low-dimensional structure; the geometry is the LLM's.
- The cost of encoding per vector is accepted rather than measured for us.
:::

## What they show {#show}

| their measurement | value | where | verifiable? |
|---|---|---|---|
| dictionary | about 4 000 atoms (the code's example: 4096), one per LLM, trained once on WikiText-103 | abstract, README | a design fact |
| quality | 90–95 % of the original GSM8K score at 15–25 % of the full orchard memory (Mistral, Llama 3, Qwen2.5) | abstract | public LLMs and tests; not reproduced by us |
| low-memory regime | works where 2-bit rounding fails; up to 1.7× better compression on LongBench and GSM8K | abstract | their comparison |

Losslessly, the atoms become a [[prediction]]: rebuild the vector from its atoms, then store the exact [[residual]]. The prediction saves bits at the usual exchange rate, and the atom names and weights are paid on top:

$$
\text{net bits saved per element} = \underbrace{\tfrac12 \log_2 \frac{1}{1-\vRsq}}_{\text{the prediction}} \;-\; \underbrace{\frac{\vs\,(\log_2 \vnatoms + 8)}{\vd}}_{\text{the tax}}
$$ {#eq-papers-lexico-net}

With Lexico's numbers and $\vd = 128$, the tax is 160 / 128 = 1.25 bits per element. Breaking even needs $\tfrac12\log_2\frac{1}{1-\vRsq} = 1.25$, so $1-\vRsq = 2^{-2.5}$:

::: keycard Break-even for a Lexico-like lossless dictionary
$\vRsq \geq 82\,\%$ of every vector's variance, before a single bit is won.
:::

::: figure fig-papers-lexico-sparse pbLexicoSparse
**Sparse coding of one toy vector, and what it would be worth losslessly.** Top: the 32 elements of the vector (lapis bars) and its approximation from the chosen atoms (vermilion dots). Bottom: bits per element against the number of atoms used, saved by the prediction (peacock, the first term of [[#eq-papers-lexico-net]], using the share of the vector's energy explained), the tax of 7 index bits + 8 weight bits per atom spread over 32 elements (saffron, dashed), and the net (lapis, bold). Atoms are chosen by orthogonal matching pursuit. The slider sets the number of atoms; the buttons set how much noise (that no atom can explain) the vector carries. Seeded random toy; the 128 atoms are random directions, not learned.
:::

::: try
1. Some noise, 3 atoms: the three true atoms (#5, #40, #97) are found and explain 95 % of the variance. Saved 2.10 bits per element, tax 1.41, net +0.69.
2. Add atoms one by one: net +0.40 with 4 atoms, +0.04 with 5, −0.27 with 6. Each extra atom explains a sliver of noise and pays 15 bits.
3. Much noise: the same three atoms are found but explain only 80 %, and the net never rises above zero. What no atom can explain sets the floor.
4. Little noise: 3 atoms net +1.93 bits per element. Lossless sparse coding pays only on nearly noiseless data.
:::

What Lexico shows is that a dictionary fitted once on generic text describes the vectors of quite different tasks well enough for the LLM: much of the structure in an orchard is global, shared by all texts of one LLM. What it does not show is the share of variance the atoms explain on an 8-bit grid, and whether what is left is noise. "Universal" means one dictionary per LLM, not across LLMs; the encoding cost per vector is not reported in what we could read.

::: takeaway
- Losslessly, sparse coding is a prediction plus a per-vector tax of $\vs(\log_2\vnatoms + 8)$ bits; break-even in Lexico's setting is 82 % of the variance.
- The lossy result is evidence of global structure, not a bit count.
:::

## What it says about our scenario {#ours}

**Builds on.**
- Global scope as a real rung ([[#scenario-scope]]): a dictionary fit once on a calibration corpus and shared by every sequence is charged to nobody per punnet. The campaigns measured the lossless version of Lexico's bet for the prediction stage: a linear-prediction rule fit on *another* sequence recovers 91–96 % of the gain, the pattern of which elements predict which correlates 0.9995 between two datasets, and the shuffle control barely moves the prediction gain. Geometry belongs to the LLM; repeats belong to the text ([[#measured-two-kinds-of-structure]], [[#measured-shared-across-the-stretch]]).
- The index tax ([[#school-clusters]], [[#toolbox-vq]]): every atom has a name and a weight, paid per vector. Lexico multiplies VQ's tax by $\vs$.

**Conflicts with.** Codebooks lost on the Bench. Stacked on linear prediction, residual quantization saved 0.0029 of ratio and product quantization 0.0017; stacked on a reference tree, the encoder chose no codebook on 72 of 72 punnets; clusters exist only in a minority of cherries, and k-means centroids lost to real cherries as references (0.780 vs 0.753) ([[#measured-codebooks-and-rotations]]). We believe the campaigns for lossless coding: on nearly Gaussian data an untaxed rotation or prediction beats any taxed codebook ([[#school-vq-vs-klt]]), and sparse coding inherits that with $\vs$ times the tax. Lexico's win is a lossy one at 2–3 bits, where the tax is a smaller share of the budget.

**Suggests.**
- A global-scope scenario with a calibration corpus, `V · all · cherry (2, 256) · global dictionary on held-out sequences`, to measure $\vgainseq$ properly ([[#plan-next-in-the-harness]]); the human's ruling allows a [[shared-table]] once such a corpus exists ([[#measured-where-the-bits-come-from]]).
- Lexico's atoms as a prediction stage, with the exact residual coded after: the break-even of 82 % variance explained is the number to beat, and the campaigns' linear prediction reaches its gain with no index tax at all.

::: theme every-tax
Every atom has a name and a weight, and both are paid per vector. That is the index tax of VQ, multiplied by the number of atoms. A dictionary of axes or a prediction rule pays no such per-vector tax, which is why, on data without real clusters, they are the cheaper way to use the same structure.
:::

::: takeaway
- Builds on: global scope is real; the campaigns found 91–96 % of the prediction gain transfers between sequences.
- Conflicts with: taxed codebooks lost to untaxed prediction and references on the Bench.
- Suggests: a global-scope scenario with a calibration corpus.
:::

## Their words, ours {#words}

| their word | ours | where the meanings differ |
|---|---|---|
| universal dictionary | a [[dictionary]] of [[scope-global\|global scope]], one per LLM | "universal" is across prompts and tasks, not across LLMs |
| atom | a reference direction in the dictionary | not a [[reference-cherry]]: an atom is learned, a reference cherry is a real cherry of the punnet |
| sparse coding, sparsity $\vs$ | [[sparse-coding]], atoms per vector | — |
| OMP (orthogonal matching pursuit) | the greedy atom picker | an encoder-side cost |
| KV cache | the [[orchard]] | — |
| model (Mistral, Llama 3, Qwen2.5) | the LLM, named | — |
| compression ratio, memory budget | 1 / [[mdl-ratio]], lossy | ours counts every byte of the exact copy |

::: aside source Receipts
Kim, Park, Cho and Papailiopoulos, *Lexico: Extreme KV Cache Compression via Sparse Coding over Universal Dictionaries*, arXiv:2412.08890 (December 2024); ICML 2025. Dictionary size and training corpus: abstract and README. Quality and low-memory numbers: abstract. The 160-bit cost and the 82 % break-even are our arithmetic for an assumed head of 128 elements. The figure is a seeded toy with random atoms. The campaigns' numbers: `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1.5 (a rule fit on another sequence recovers 91–96 %, r7 iter-1-2; correlation 0.9995, r9 iter-1-3; shuffle test r12), §1.7 (RQ +0.0029, PQ +0.0017; no codebook on 72 of 72 blocks, r26-t0010; k-means centroids 0.780 vs real entries 0.753), §1.10 (the shared-table ruling).
:::
