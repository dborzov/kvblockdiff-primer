---
title: The orchard
nav: The orchard
group: The LLM
lede: Keys and values never change once computed, so the LLM keeps them. Stacked for a whole sequence they are two arrays with four named axes. This page gives the store its name, walks through its pieces one Python expression at a time, and sizes each piece at the Pin and at the Bench.
cards:
  - q: Why does an LLM store keys and values instead of recomputing them at every step?
    a: A token's key and value never change once computed, so recomputing them every step would waste work
    wrong: ["Because keys and values change at every step", "Because the LLM cannot compute them again", "Because storing them makes the output more accurate"]
    why: A key depends only on its own token and earlier ones. Later tokens cannot change it, so it is computed once and kept.
    sec: why
  - q: What is the orchard?
    a: 'Every key and every value one sequence has grown at every KV layer: `k`, `v` of shape `(n_tokens, n_kv_layers, n_kv_heads, head_dim)`, kept in host memory'
    wrong: ["The hot cache of recently used picks on the GPU", "The LLM's weights", "The prompt's tokens"]
    why: It grows one row per token at every KV layer and is never pruned. It is a store, not a cache, whatever its usual name says.
    sec: why
  - q: 'In the fixed index order, what does `v[t, l, h, :]` select?'
    a: 'One V vector: token `t`, KV layer `l`, KV head `h`, every element'
    wrong: ["One furrow", "One token's values at every layer", "One element"]
    why: 'The order is always `[token_pos_id, layer_id, head_id, elem_id]`. Fixing the first three and taking all elements is one head''s vector, `(head_dim,)`.'
    sec: pieces
  - q: 'How many bytes are one token''s values at one layer on the Bench, and across all its KV layers?'
    a: '512 B and 3 072 B'
    wrong: ["640 B and 50 KB", "256 B and 1 536 B", "1 024 B and 6 144 B"]
    why: '2 heads × 256 elements × 1 byte = 512 B per layer; × 6 KV layers = 3 072 B. On the Pin the same two numbers are ≈ 640 B and ≈ 50 KB.'
    sec: pieces
  - q: 'What is `v[:, layer_id, head_id, elem_id]`?'
    a: 'One furrow: one element position of one head, followed along every token of the sequence'
    wrong: ["One V vector", "One token's values at one layer", "The whole value half of the orchard"]
    why: 'Fixing everything but `token_pos_id` leaves a column of `n_tokens` numbers: 225 000 on the Bench.'
    sec: pieces
---

Look again at `decode_step` on [[#landscape-attention]]. At step 100 000, every KV layer needs the keys and values of 100 000 earlier tokens. Where do they come from?

The LLM could recompute them: run all earlier tokens through all layers again, at every step. But a token's key depends only on that token and the tokens before it. Nothing written later can change it. So the LLM computes each key and value once, when its token passes through, and keeps it.

## Compute once, keep forever {#why}

:::: compare Two ways to have the keys at step t
::: col Recompute
- Rerun all $\vt$ earlier tokens through every layer, at every step.
- Costs compute that grows with $\vt$, every step.
- Needs no memory.
:::
::: col Keep
- Compute each key and value once; `k[layer_id].append(key)`.
- Costs memory that grows with $\vt$, for the whole life of the sequence.
- Every LLM in practice does this.
:::
::::

In `decode_step` the kept keys and values were lists, one per KV layer, each growing by one row per token. Stacked for a whole sequence they are two arrays:

```python the orchard of one sequence, stacked
k = np.stack([np.stack(k[l]) for l in range(n_kv_layers)], axis=1)
v = np.stack([np.stack(v[l]) for l in range(n_kv_layers)], axis=1)
k.shape == v.shape == (n_tokens, n_kv_layers, n_kv_heads, head_dim)   # one 8-bit element each
# the Bench: (225_000, 6, 2, 256)      the Pin: (100_384, 78, 1, 640)
```

This growing store is the orchard.

::: define orchard
- **What it is.** Everything one sequence has grown: all its keys and all its values at every KV layer, kept in host memory. Two arrays, [[~k-tensor]] and [[~v-tensor]], of shape `(n_tokens, n_kv_layers, n_kv_heads, head_dim)`, indexed always in the order `[token_pos_id, layer_id, head_id, elem_id]`. It grows one row per token at every KV layer and is never pruned.
- **Example.** On the Bench, `v.shape == (225_000, 6, 2, 256)`: 225 000 tokens, 6 KV layers, 2 KV heads, 256 elements; the keys the same again. On the Pin, `(100_384, 78, 1, 640)`, where the one "head" of 640 is an MLA latent that holds keys and values together ([[#landscape-rope-and-mla]]).
- **Easy to confuse with** the hot cache of [[#landscape-hisparse]], which is a small real cache of recently used rows on the GPU; and with the LLM's weights, which do not grow.
:::

The four index names are fixed for the whole site, in this order:

| axis | index | ranges over | symbol |
|---|---|---|---|
| 0 | `token_pos_id` | `0 … n_tokens-1`, the sequence so far | $\vt$ |
| 1 | `layer_id` | `0 … n_kv_layers-1`, the KV layers in order | $\vl$ |
| 2 | `head_id` | `0 … n_kv_heads-1` | $\vh$ |
| 3 | `elem_id` | `0 … head_dim-1` | $\vc$ |

In equations the two halves are $\vK$ and $\vV$. Write `.shape` with the numbers of the setting a sentence is about; in the setting selected now the orchard of one sequence is [[@L]] tokens × [[@NL]] KV layers × [[@heads]] × [[@headdim]] elements, for keys and again for values.

::: note warning A store, not a cache
In [[#school-caches]] a [[cache]] was a small, fast copy of a few items from a big, slow store, with [[hit-miss|hits and misses]]. The orchard is not that. It is the *complete* store of keys and values; nothing is ever evicted from it. The thing usually goes by a name with "cache" in it, and that name is a historical accident. On this site the orchard is the whole store, and the small, fast, real cache arrives with HiSparse on [[#landscape-hisparse]].
:::

::: takeaway
- A token's keys and values never change, so they are computed once and kept: that store is the orchard, `k` and `v` of shape `(n_tokens, n_kv_layers, n_kv_heads, head_dim)`.
- The index order is always `[token_pos_id, layer_id, head_id, elem_id]`; $\vt, \vl, \vh, \vc$ in equations.
- It grows one row per token per KV layer and is never pruned. A store, not a cache.
:::

## One element, one vector, one furrow {#pieces}

Every later page points at a piece of the orchard with a Python expression. Here are the five that recur, in the order of their size, each with its shape and bytes at both settings.

```python the pieces of the orchard, by one Python expression each
v[token_pos_id, layer_id, head_id, elem_id]      # one element
v[token_pos_id, layer_id, head_id, :]            # one V vector: (head_dim,)
v[token_pos_id, layer_id]                        # one token's values at one layer: (n_kv_heads, head_dim)
v[token_pos_id]                                  # one token's values at every KV layer
v[:, layer_id, head_id, elem_id]                 # one furrow: (n_tokens,)
```

| expression | what it is | the Bench | the Pin |
|---|---|---|---|
| [[~v-element]] | one [[element]], one stored number | `()`, 1 B | `()`, 1 B |
| [[~v-one-head]] | one V vector, one KV head's values for one token at one layer | `(256,)`, 256 B | `(640,)`, 640 B |
| [[~v-one-token-layer]] | one token's values at one layer, every head | `(2, 256)`, **512 B** | `(1, 640)`, **≈ 640 B** |
| [[~v-one-token]] | one token's values at every KV layer | `(6, 2, 256)`, **3 072 B** | `(78, 1, 640)`, **≈ 50 KB** |
| [[~v-furrow]] | one [[furrow]]: one element position along the token axis | `(225_000,)`, 225 KB | `(100_384,)`, 100 KB |

The keys have the same five pieces, [[~k-one-head]] and so on, with the same shapes. On the Pin the one latent already holds keys and values, so its ≈ 640 B per token per layer is the whole row; on the Bench the keys are another 512 B beside the values' 512 B. The row of one token at one layer, `v[token_pos_id, layer_id]`, is the unit the rest of the site prices everything in, and its byte count gets a letter, $\ve$: 512 B on the Bench, 640 B on the Pin; [[@e]] in the setting selected now.

::: aside reminder Vectors, elements and furrows (II.13)
A [[vector]] is an ordered list of $\vd$ numbers; each number is an [[element]] with a position `elem_id`. A [[furrow]] is one `elem_id` followed across many vectors, like one sensor's column in a table of readings. Here each row of the orchard is one reading, and `v[:, layer_id, head_id, elem_id]` is one column of the table.
:::

::: figure fig-landscape-row entryAnatomy
**What one token leaves at one layer.** The strip is one row of the orchard, `k[token_pos_id, layer_id]` and `v[token_pos_id, layer_id]` side by side, split into its parts and drawn to scale (blue: keys; red: values; brown: an MLA latent). Choose an LLM and a number format; the tiles count the elements in the row, its bytes, the rows one token leaves (one per KV layer) and the bytes per token. The toy and Qwen3.5-2B sizes follow from their shapes; the GLM-5.1-class size (≈ 640 elements, 640 B at 8 bits) is the Pin's.
:::

::: try
1. Pick Qwen3.5-2B at 8 bits: 1 024 elements, 1 KB per row with keys and values, 6 KB per token. The values alone are half: 512 B and 3 072 B.
2. Pick GLM-5.1-class: one latent of ≈ 640 elements, 640 B, times 78 layers ≈ 50 KB per token. Switch to BF16 and watch every byte count double.
:::

Two whole-orchard sizes to remember, at 8 bits per element. On the Bench, one 225 000-token sequence holds $225\,000 \times 3\,072\ \text{B} \approx 691$ MB of values, and as much again of keys. On the Pin, one 100 384-token sequence holds $100\,384 \times 78 \times 640\ \text{B} \approx 5.0$ GB, keys and values in one latent.

::: takeaway
- Five expressions name the pieces: one element, one V vector `(head_dim,)`, one token's values at one layer `(n_kv_heads, head_dim)`, one token at every KV layer, one furrow `(n_tokens,)`.
- One token's values at one layer are 512 B on the Bench and ≈ 640 B on the Pin ($\ve$); at every KV layer, 3 072 B and ≈ 50 KB.
- One sequence's orchard is about 0.7 GB of values on the Bench and 5 GB on the Pin, at 8 bits.
:::
