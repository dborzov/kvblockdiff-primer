---
title: The KV cache and the entry
nav: The KV cache and the entry
group: How a model reads its memory
lede: Keys and values never change once computed, so the model keeps them. The pile it keeps is called the KV cache, and its unit — one token's keys and values at one layer — is the entry, the tile this whole project is about.
cards:
  - q: Why does a model store keys and values instead of recomputing them at every step?
    a: A token's key and value never change once computed, so recomputing them every step would waste work
    wrong: ["Because keys and values change at every step", "Because the model cannot compute them again", "Because storing them makes the output more accurate"]
    why: A key depends only on its own token and earlier ones. Later tokens cannot change it, so it is computed once and kept.
    sec: why
  - q: 'What is the entry $\vE_{\vl,\vt}$?'
    a: All key and value numbers of token $\vt$ at layer $\vl$, over all key/value heads
    wrong: ["All keys of token $\\vt$ over all layers", "One key/value head of one token at one layer", "The whole KV cache of layer $\\vl$"]
    why: The entry is the unit the selection picks, the hot cache moves and our coder must rebuild exactly.
    sec: entry
  - q: 'Qwen3.5-2B has 2 key/value heads of 256 numbers. How big is one entry at 8 bits per number?'
    a: 1024 numbers, about 1 KB
    wrong: ["256 numbers, 256 bytes", "512 numbers, 512 bytes", "2048 numbers, 2 KB"]
    why: '2 heads × 256 numbers × (key and value) = 1024 numbers, one byte each at 8 bits.'
    sec: entry
  - q: What does RoPE do to a stored key?
    a: Turns each pair of its channels by an angle that grows with the token's position
    wrong: ["Rounds it to 8 bits", "Adds the position number to every element", "Shuffles its channels in a random order"]
    why: Because both query and key are turned, their dot product depends only on how far apart the two tokens are. Keys are more regular before the turn than after it.
    sec: rope-mla
  - q: What does MLA store per token per layer?
    a: One compressed vector, from which keys and values are rebuilt
    wrong: ["Nothing — it recomputes keys and values", "Only the keys, never the values", "One key/value head per query head"]
    why: Multi-head latent attention keeps a single latent vector (576 numbers in DeepSeek-V3). For us it is still one fixed-size entry per position per layer.
    sec: rope-mla
---

Look again at the decode loop of [[#landscape-attention]]. At step 100,000, every layer needs the keys and values of 100,000 earlier tokens. Where do they come from?

The model could recompute them: run all earlier tokens through all layers again, at every step. But a token's key depends only on that token and the tokens before it. Nothing written later can change it. So the model computes each key and value once, when its token passes through, and keeps it.

## Compute once, keep forever {#why}

The kept keys and values of all earlier tokens, at all layers, are the [[=kv-cache|KV cache]]. It grows by one token's keys and values per layer at every step, and nothing is ever thrown away.

:::: compare Two ways to have the keys at step t
::: col Recompute
- Rerun all $\vt$ earlier tokens through every layer, at every step.
- Costs compute that grows with $\vt$, every step.
- Needs no memory.
:::
::: col Keep (the KV cache)
- Compute each key and value once; store it.
- Costs memory that grows with $\vt$, for the whole life of the request.
- Every model in practice does this.
:::
::::

We write the stored numbers with four indices: $\vK[\vl, \vh, \vt, \vc]$ is [[channel]] $\vc$ of the key of token $\vt$, key/value head $\vh$, layer $\vl$. The values $\vV[\vl, \vh, \vt, \vc]$ are laid out the same way.

::: note warning A cache that is not a cache
In [[#school-caches]] a [[cache]] was a small, fast copy of a few items from a big, slow store, with [[hit-miss|hits and misses]]. The "KV cache" is not that. It is the *complete* store of keys and values, and the name is a historical accident. On this site the *KV cache* means the whole store. The small, fast, real cache arrives with HiSparse in [[#landscape-hisparse]].
:::

::: takeaway
- A token's keys and values never change, so they are computed once and kept: that store is the KV cache.
- It grows by one token per layer at every step. $\vK[\vl,\vh,\vt,\vc]$ and $\vV[\vl,\vh,\vt,\vc]$ name its numbers.
:::

## The entry {#entry}

The cells of the grid in [[#fig-landscape-decode]] now get their proper name.

::: define entry
- **What it is.** All key and value numbers of one token at one layer, over all key/value heads, written as one [[vector]] $\vE_{\vl,\vt}$. Its size in bytes is $\ve$.
- **Why it is the unit.** The selection of the next page picks entries; the system of [[#landscape-hisparse]] moves entries; the coder this site proposes must rebuild entries bit for bit.
- **Why per layer.** Each layer looks back separately and is managed separately. Nothing on this site ties layers together unless it says so.
- **Easy to confuse with** a *token* (an entry is one token at *one* layer; a token has $\vNL$ entries) and a *head* (an entry holds all heads of its layer).
:::

$$
\begin{aligned}
\vE_{\vl,\vt} &= \big(\underbrace{\vK[\vl, \vh, \vt, \cdot\,]}_{\text{keys, every head } \vh},\ \underbrace{\vV[\vl, \vh, \vt, \cdot\,]}_{\text{values, every head } \vh}\big) \\[4pt]
\ve &= \underbrace{\vd}_{\text{numbers}} \times \text{bytes per number}
\end{aligned}
$$ {#eq-landscape-entry}

::: aside reminder Vectors and channels (II.13)
A [[vector]] is an ordered list of $\vd$ numbers; a [[channel]] is one fixed position $\vc$ in it, looked at across many vectors — like one sensor's column in a table of weather readings. Here, each entry is one row of that table.
:::

::: figure fig-landscape-entry entryAnatomy
**What one entry holds.** The strip is one entry, split into its parts and drawn to scale (blue: keys; red: values; brown: a compressed vector). Choose a model and a number format; the tiles count the numbers in one entry ($\vd$), its bytes $\ve$, the entries one token leaves (one per layer that keeps entries) and the bytes per token. Toy and Qwen3.5-2B sizes follow from their published shapes; the GLM-5.1-class size (≈ 640 numbers, 0.64 KB at 8 bits) is the one the reference setting uses.
:::

The numbers worth remembering:

- **Qwen3.5-2B**: 1024 numbers per entry, about 1 KB at 8 bits.
- **GLM-5.1-class**: about 640 numbers, so $\ve \approx 0.64$ KB at 8 bits; times 78 layers, about 50 KB per token (100 KB in the 16-bit format it is served in today).

::: takeaway
- The entry $\vE_{\vl,\vt}$ is one token's keys and values at one layer; it has $\vd$ numbers and $\ve$ bytes.
- It is the unit that is selected, moved and — in this project — coded. About 0.64 KB at 8 bits in our reference numbers.
:::

## Two wrinkles: RoPE and MLA {#rope-mla}

**Where is a token?** Attention as described so far has no idea of order: a key scores the same wherever it sits. Most models fix this with [[=rope|RoPE]] (rotary position embedding). It takes the channels of the query and of the key in pairs, and turns each pair by an angle proportional to the token's position. Since both are turned, their dot product depends only on how far apart the two tokens are.

The key is turned *before* it is stored. That matters for compression.

::: figure fig-landscape-rope ropeSpin
**One pair of key channels for 64 tokens, before and after RoPE.** Each dot is one token's key, restricted to two channels (horizontal and vertical axes, illustrative numbers); colour runs from early positions (blue) to late ones (red). Before RoPE the dots form one tight cluster. After RoPE, token $\vt$ is turned by $\vt$ times the angle on the slider, and the cluster smears around the dashed circle. The read-out gives the spread (standard deviation) of each channel.
:::

::: try
1. Switch between *before* and *after*. Same keys, same information — but after the turn each channel's numbers vary six or seven times as much.
2. Set the angle to 0°. RoPE then does nothing (real models use a different angle for every pair, some tiny, some large).
:::

A wider spread costs bits: in [[#school-residual-shapes]] halving the [[standard-deviation]] of bell-shaped data saved one bit per number. The turn is exactly reversible when the position is known, so a lossless coder may store keys *before* RoPE and turn them on the way out. [[#missed-keys-before-rope]] makes that case.

**Another way to save memory.** DeepSeek's models, and GLM-5.x which builds on them, use [[=mla|MLA]] (multi-head latent attention). Instead of separate keys and values per head, each token stores **one compressed vector per layer**, and the keys and values are rebuilt from it by a matrix multiplication when needed.

:::: compare What one entry looks like
::: col GQA (Qwen3.5-2B)
Keys and values of 2 key/value heads, $2 \times 256 \times 2 = 1024$ numbers.
:::
::: col MLA (DeepSeek-V3, GLM-5.x)
One latent vector: 512 + 64 = 576 numbers in DeepSeek-V3 (the 64 carry the position); about 640 in the GLM-5.1-class numbers we use.
:::
::::

For this project the difference is cosmetic. Either way there is **one fixed-size entry per position per layer**, and every one must be kept.

::: takeaway
- RoPE turns pairs of key channels by a position-dependent angle before the key is stored; keys are more regular before the turn, and the turn is exactly reversible.
- MLA stores one compressed vector per token per layer instead of separate keys and values. Still one entry per position per layer.
:::
