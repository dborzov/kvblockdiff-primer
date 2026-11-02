---
title: Lexico (2024)
nav: Lexico
lede: One fixed alphabet of about 4,000 "atoms" per model, and every key or value vector spelled with a handful of them. It works across prompts and tasks — strong evidence that much KV structure is shared by all texts. Losslessly, every atom pays a tax.
group: Lossy KV compression
cards:
  - q: What is sparse coding, in one sentence?
    a: Describing a vector as a weighted sum of a few atoms chosen from a large fixed dictionary, storing only which atoms and their weights
    wrong: ["Storing only the non-zero elements of a vector", "Rounding each element to 2 bits", "Rotating a vector onto its principal axes"]
    why: VQ is the special case of one atom with weight 1; a KLT uses every axis with a weight.
    sec: what
  - q: With 8 atoms per vector, a dictionary of 4096 atoms and 8-bit weights, how many bits does one vector cost?
    a: 160 bits — 8 × (12 index bits + 8 weight bits)
    wrong: ["64 bits", "96 bits", "2048 bits"]
    why: Naming one of 4096 atoms takes log₂ 4096 = 12 bits. A 128-number vector at 16 bits is 2048 bits, so 160 bits is about 8 % of it.
    sec: what
  - q: For a lossless coder using Lexico-like atoms (8 per vector, 4096 in the dictionary, 8-bit weights, 128 numbers per vector), what share of variance must the atoms explain just to break even?
    a: About 82 %
    wrong: ["About 25 %", "About 50 %", "About 99.9 %"]
    why: The tax is 160 bits / 128 numbers = 1.25 bits per number; ½ log₂ 1/(1−R²) = 1.25 needs 1−R² = 2^−2.5 ≈ 0.18.
    sec: shadow
  - q: In the toy, why does the net lossless gain fall after the third atom?
    a: Later atoms only fit noise — they explain little variance but each still pays the full tax
    wrong: ["Because the dictionary runs out of atoms", "Because the weights overflow 8 bits", "Because OMP picks atoms at random"]
    why: The vector was built from three atoms plus noise. Once those are found, more atoms add a few percent of explained variance and 15 bits of tax each.
    sec: shadow
  - q: What does Lexico's success with one dictionary per model suggest for kv-blockdiff?
    a: That a global dictionary, fitted once and shared by every request, is a real rung of the ladder — free at serving time
    wrong: ["That per-block dictionaries are unnecessary", "That KV caches are incompressible", "That VQ beats every rotation"]
    why: It is evidence that much structure is shared by all texts. It cannot say how much a request's or a block's own dictionary adds on top.
    sec: connections
---

Imagine writing every word of a language with one fixed set of syllables. A long word needs a few of them; you never invent a new syllable for a new text. Lexico treats KV vectors that way.

For each model it learns, once, a list of about 4,000 reference vectors — *atoms*. Every key or value vector the model produces is then written as a weighted sum of a handful of atoms (the published code's example uses 8). In the toy of this page, one 32-number vector is almost exactly

$$
2.5 \cdot \text{atom}_{5} \;-\; 1.8 \cdot \text{atom}_{40} \;+\; 1.2 \cdot \text{atom}_{97} \;+\; \text{a little noise}
$$

and the store keeps three atom numbers and three weights instead of 32 numbers. The surprise is how far this goes in real models: the same atoms, trained on Wikipedia articles, serve math problems and long documents alike.

## What Lexico does, in our words {#what}

::: define sparse-coding
- **What it is:** describe a [[vector]] as a weighted sum of a few vectors ("atoms") picked from a large, fixed [[dictionary]], and store only which atoms and their weights.
- **Example:** the toy vector above — three atoms out of 128.
- **Easy to confuse with:** [[vq|VQ]] (exactly one atom, weight 1, a [[codebook]] of centroids) and a [[klt|KLT]] (every axis of a basis, each with a weight). Sparse coding sits between them: a few atoms from *more* atoms than the vector has numbers.
:::

:::: cols
::: col KLT
$\vd$ axes, all used. Each vector: $\vd$ weights. No naming needed — every axis is always there.
:::
::: col VQ
$\vC$ centroids, one used. Each vector: one index of $\log_2 \vC$ bits. The [[index-tax]].
:::
::: col Sparse coding
$\vnatoms$ atoms, $\vs$ used. Each vector: $\vs$ indices of $\log_2 \vnatoms$ bits, and $\vs$ weights.
:::
::::

The steps:

1. **Learn the dictionary once per model**, on WikiText-103 (Wikipedia text). It is never retrained and does not grow with the number of requests.
2. **Pick atoms greedily for each new vector** (orthogonal matching pursuit): take the atom that best matches what is still unexplained, refit the weights of all atoms chosen so far, repeat until $\vs$ atoms are used.
3. **Store indices and 8-bit weights.** Lexico keeps the weights in 8 bits instead of 16 with little loss.

What one vector costs, with $\vs = 8$ atoms out of $\vnatoms = 4096$:

$$
\vs \,(\underbrace{\log_2 \vnatoms}_{\text{which atom}} + \underbrace{8}_{\text{its weight}}) = 8 \times (12 + 8) = 160 \text{ bits}
$$ {#eq-pb-lexico-cost}

A 128-number vector in 16 bits is 2,048 bits, so that is about 8 % (our arithmetic, for an assumed head of 128 numbers; the paper's memory figures also include parts kept uncompressed).

::: note numbers The numbers we use
| what | value | source |
|---|---|---|
| dictionary | about 4,000 atoms (the code's example: 4096), one per model, trained once on WikiText-103 | abstract, README |
| quality | 90–95 % of the original GSM8K score at 15–25 % of the full KV memory (Mistral, Llama 3, Qwen2.5) | abstract |
| low-memory regime | works where 2-bit quantization fails; up to 1.7× better compression on LongBench and GSM8K | abstract |

Kim, Park, Cho and Papailiopoulos, arXiv:2412.08890 (December 2024); ICML 2025. The first draft of this proposal dated it 2024 without a venue.
:::

::: takeaway
- Sparse coding writes a vector as a few atoms of a large fixed dictionary: between VQ (one centroid) and a KLT (every axis).
- Lexico's dictionary is fitted once per model on generic text and reused for every prompt.
- Each atom costs an index and a weight: 20 bits in Lexico's setting.
:::

## The lossless shadow: every atom pays a tax {#shadow}

Losslessly, the atoms become a [[prediction]]: rebuild the vector from its atoms, then store the exact [[residual]]. The prediction saves bits at the usual exchange rate, and the atom names and weights are paid on top:

::: aside reminder The exchange rate (II.12)
A prediction that explains a share $\vRsq$ of the variance saves about $\tfrac12\log_2\frac{1}{1-\vRsq}$ bits per number for bell-shaped residuals. See [[#school-exchange-rate]].
:::

$$
\text{net bits saved per number} = \underbrace{\tfrac12 \log_2 \frac{1}{1-\vRsq}}_{\text{the prediction}} \;-\; \underbrace{\frac{\vs\,(\log_2 \vnatoms + 8)}{\vd}}_{\text{the tax}}
$$ {#eq-pb-lexico-net}

With Lexico's numbers and $\vd = 128$, the tax is 160 / 128 = 1.25 bits per number. Breaking even needs $\tfrac12\log_2\frac{1}{1-\vRsq} = 1.25$, so $1-\vRsq = 2^{-2.5}$:

::: keycard Break-even for a Lexico-like lossless dictionary
$\vRsq \geq 82\,\%$ of every vector's variance, before a single bit is won.
:::

The figure plays this out on a toy: 128 random atoms in 32 dimensions, and one vector built from three of them plus noise.

::: figure fig-pb-lexico-sparse pbLexicoSparse
**Sparse coding of one toy vector, and what it would be worth losslessly.** Top: the 32 numbers of the vector (lapis bars) and its approximation from the chosen atoms (vermilion dots). Bottom: bits per number against the number of atoms used — saved by the prediction (peacock, the first term of [[#eq-pb-lexico-net]], using the share of the vector's energy explained), the tax of 7 index bits + 8 weight bits per atom spread over 32 numbers (saffron, dashed), and the net (lapis, bold). Atoms are chosen by orthogonal matching pursuit. The slider sets the number of atoms; the buttons set how much noise (that no atom can explain) the vector carries. Seeded random toy; the 128 atoms are random directions, not learned.
:::

::: try
1. Some noise, 3 atoms: the three true atoms (#5, #40, #97) are found and explain 95 % of the variance. Saved 2.10 bits per number, tax 1.41, net +0.69.
2. Add atoms one by one: net +0.40 with 4 atoms, +0.04 with 5, −0.27 with 6. Each extra atom explains a sliver of noise and pays 15 bits.
3. Much noise: the same three atoms are found but explain only 80 %, and the net never rises above zero. What no atom can explain sets the floor.
4. Little noise: 3 atoms net +1.93 bits per number. Lossless sparse coding pays only on nearly noiseless data.
:::

**What Lexico tells us.** A dictionary fitted once, on generic text, describes the KV vectors of quite different tasks well enough for the model. Much of the structure in KV is therefore *global* — shared by all texts of a model — not special to one conversation.

**What it does not tell us.** The share of variance the atoms explain on an 8-bit grid, and whether what is left is noise. Without that number the lossless value of the dictionary is unknown — and the break-even above is steep.

::: note warning Where we are not convinced
- **"Universal" means one dictionary per model**, used across prompts and tasks. It is not one dictionary across models.
- **The quality yardstick is task accuracy** at a memory budget. It cannot be turned into bits per number for an exact copy.
- **Encoding cost.** Matching pursuit runs for every new vector at every layer during decoding. Fine for a memory-bound system; for a write path it is a cost to count, and we did not find it reported in what we could read.
:::

::: takeaway
- Losslessly, sparse coding is a prediction plus a per-vector tax of $\vs(\log_2\vnatoms + 8)$ bits.
- In Lexico's setting the atoms must explain about 82 % of the variance just to break even.
- The lossy result is evidence of global structure, not a bit count.
:::

## Connections {#connections}

::: theme every-tax
Every atom has a name and a weight, and both are paid per vector. That is the [[index-tax]] of VQ, multiplied by the number of atoms. A dictionary of axes (a KLT) pays no such per-vector tax — which is why, on data without real clusters, rotations are the cheaper way to use the same structure.
:::

- **Global scope is a real rung.** If one dictionary per model goes this far lossily, a global dictionary — fitted once, shared by every request, free at serving time — deserves its own rung in our measurements, not a footnote. Scopes are worked out in [[#homework-scope]].
- **Taxed versus untaxed.** On Gaussian-like data a codebook cannot beat an untaxed rotation ([[#school-vq-vs-klt]], [[#homework-vq]]). Sparse coding inherits that argument with $\vs$ times the tax. It wins only if KV vectors really sit near a few directions out of many — a measurable question.
- **Its neighbour on the other side**: [[#papers-kvtc|KVTC]] uses all axes of one rotation instead of a few atoms of many.

::: takeaway
- Lexico is the best evidence we have that KV structure is largely global.
- For an exact copy, its atoms are a taxed prediction; the rotation is the untaxed rival.
:::
