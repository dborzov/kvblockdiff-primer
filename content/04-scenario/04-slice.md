---
title: 'The slice: what is in play'
nav: The slice
group: The objects
lede: A scenario rarely compresses a whole orchard. It names the coordinates that are in play, keys or values, which layers, which heads, which elements, and writes that choice the way Python would.
cards:
  - q: What does a slice name?
    a: 'Which coordinates of the orchard are in play for a scenario: K and/or V, which layers, which heads, which elements'
    wrong: ["How many token positions are in a stretch", "How the data is cut into cherries", "Which compressor is used"]
    why: The slice is the "what is compressed" choice. The stretch is "which positions"; the cherry shape is "cut into what".
    sec: in-play
  - q: 'The campaigns of Part VIII compressed which slice of Qwen3.5-2B''s orchard?'
    a: 'The values only, `v[:, :, :, :]`, at every KV layer and both heads (C1 only layer 0, head 0)'
    wrong: ["Keys and values together", "The keys only", "One element of every value"]
    why: Values alone, so one token at one layer in play was 512 bytes, not the 1024 the old plan assumed for keys plus values.
    sec: examples
  - q: Why can keys and values be treated as separate scenarios?
    a: Because a slice may name either; the receiver may ask for a key cherry without a value cherry
    wrong: ["Because keys are never stored", "Because values are always compressed better", "Because the LLM reads keys at a different step"]
    why: Keys and values have different statistics (keys are rotated by RoPE, values are not). A slice of keys and a slice of values are two scenarios; a slice of both is a third.
    sec: examples
---

The campaigns of Part VIII compressed 20.9 GB of bytes, and not one of them was a key. The old plan had assumed "keys plus values of one token at one layer, 1024 elements". The data on the table was values only. Nobody had a word for that difference, and a 1024-element plan met 512-element results.

The word is the slice.

## What is in play {#in-play}

An [[orchard]] has two arrays, `k` and `v`, each of shape `(n_tokens, n_kv_layers, n_kv_heads, head_dim)`. A scenario names which of their coordinates are in play. Written as the Python slice it is, the choice cannot be misread:

::: define slice
- **What it is.** The rule naming which part of the orchard a scenario compresses: keys or values or both; which `layer_id`s; which `head_id`s; which `elem_id`s. The token axis is left open (`:`), because the [[stretch]] decides positions.
- **Example.** `v[:, [1, 3], 0, :]`: values, KV layers 1 and 3, head 0, every element. On [[bench|the Bench]] that is `(n_tokens, 2, 256)` elements in play per sequence, 512 bytes per token position.
- **Easy to confuse with** the cherry shape. The slice says what is in play; the cherry shape says how it is diced into units. The same slice can be diced several ways ([[#scenario-cherry]]).
:::

```python four slices of one orchard, with what each puts in play per token position
v[:, :, :, :]          # the whole value half: 6 layers × 2 heads × 256 = 3072 elements per token (the Bench)
v[:, 0, 0, :]          # values, KV layer 0, head 0: 256 elements per token (campaign C1)
v[:, [1, 3], 0, :]     # values, layers 1 and 3, head 0: 2 × 256 = 512 elements per token
k[:, :, :, :64]        # keys, every layer and head, the 64 rotated elements only: 6 × 2 × 64 = 768 per token
```

The index names keep the reader honest. `v[:, [1, 3], 0, :]` cannot be mistaken for "layers 1 and 3 of head 1" or "elements 1 and 3". The axis order is always `[token_pos_id, layer_id, head_id, elem_id]` ([[#landscape-orchard]]).

::: figure fig-scn-slice-dice scnSliceDice
**The orchard, a stretch, a slice, and three ways to dice it.** The box is one sequence's value half on the Bench: about 225K token positions along the long axis, 6 KV layers, 2 heads, 256 elements. The tinted band is one stretch of 4096 positions. The brighter region inside it is the slice (choose one with the buttons: all values; one layer and head; two layers of one head). The small outlined cell is one cherry under the chosen cherry shape; the readout counts `cherry_bytes`, cherries per stretch (the punnet size) and the punnet's raw bytes. Real sizes; one byte per element.
:::

::: takeaway
- A slice names which coordinates of `k` and `v` are in play, as a Python slice with the token axis open.
- Index order is always `[token_pos_id, layer_id, head_id, elem_id]`; the names are spelled out so no axis can be mistaken for another.
:::

## Slices worth naming {#examples}

A few slices come up again and again. Each is a different problem, with different statistics, and often a different application.

| slice | in play per token position (the Bench) | why anyone would choose it |
|---|---|---|
| `v[:, :, :, :]` | 3072 elements | the campaigns' main slice; values are easier than keys and every layer is in play |
| `v[:, l, :, :]` for one `l` | 512 | one KV layer at a time; a dictionary per layer, as a per-layer indexer (DSA) would want |
| `v[:, l, h, :]` | 256 | one head of one layer; campaign C1's slice |
| `k[:, :, :, :]` | 3072 | keys, recovered before RoPE; a separate problem with its own statistics ([[#hypotheses-keys-and-values]]) |
| `k` and `v` together | 6144 | what a hot-cache miss really moves; a slice of both halves |
| `v[:, :, :, :3]` with the bit-field split | 3 mantissa bits of each element | not a slice of coordinates but of bits; Part V treats it as a stage ([[#toolbox-bit-fields]]) |

Two consequences follow from writing the slice down.

- **Keys and values are separate problems** unless a slice names both. Keys are turned by [[rope|RoPE]] before storage and have different statistics; the campaigns' one night on keys found them harder ([[#hypotheses-keys-and-values]]). "The orchard compresses by 0.64" is meaningless without the slice; "`v[:, :, :, :]` on Qwen3.5-2B compresses by 0.64" is a statement.
- **A slice is not an application yet.** A serving system that serves one-layer picks needs the per-layer slice's numbers; one that serves a group of layers at once needs the multi-layer slice's. [[#scenario-why-vary]] draws that map.

::: note warning The old plan's 1024
The first plan of this project counted "an entry" as keys plus values of one token at one layer: 1024 elements on Qwen3.5-2B. The campaigns compressed `v` alone, 512 per token per layer. Every number on this site now names its slice, so that mismatch cannot happen silently again. <!-- old-words -->
:::

::: takeaway
- Named slices: all values, one layer, one head, keys, keys plus values. Each is its own problem.
- No number about compressibility means anything without its slice.
:::
