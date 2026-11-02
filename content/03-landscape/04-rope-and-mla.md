---
title: 'Two wrinkles: RoPE and MLA'
nav: RoPE and MLA
group: The LLM
lede: Two details of real LLMs change what a row of the orchard looks like. RoPE turns a key before it is stored, which smears its elements. MLA stores one latent vector instead of separate keys and values. Neither changes the rule that every token leaves one fixed-size row per KV layer.
cards:
  - q: What does RoPE do to a key before it is stored?
    a: Turns each pair of its elements by an angle that grows with the token's position
    wrong: ["Rounds it to 8 bits", "Adds the position number to every element", "Shuffles its elements in a random order"]
    why: Because both query and key are turned, their dot product depends only on how far apart the two tokens are. Keys are more regular before the turn than after it.
    sec: rope
  - q: 'The orchard holds `rope(key, pos, theta)`. Can the key before the turn be recovered?'
    a: 'Yes, exactly: `rope(stored, -pos, theta)` undoes it, because the position is known'
    wrong: ["No, the turn loses information", "Only approximately", "Only for the first 64 tokens"]
    why: 'A rotation is reversible, and `token_pos_id` is known to both sides. A lossless compressor may therefore store keys before RoPE and turn them on the way out.'
    sec: rope
  - q: What does MLA store per token per layer?
    a: One latent vector, from which keys and values are rebuilt by a matrix multiplication
    wrong: ["Nothing; it recomputes keys and values", "Only the keys, never the values", "One key and one value per query head"]
    why: 'Multi-head latent attention keeps a single latent (576 elements in DeepSeek-V3, ≈ 640 on the Pin). For this site it is still one fixed-size row of the orchard per token per KV layer.'
    sec: mla
  - q: 'On the Pin, why is `v.shape` written `(100_384, 78, 1, 640)` although GLM-5.1 has no separate value heads?'
    a: Its one latent per token per layer is treated as one head of 640 elements, so the same four index names fit both settings
    wrong: ["Because GLM-5.1 has exactly one KV head", "Because the latent is 640 values and no keys", "Because the Pin stores BF16"]
    why: 'The latent holds keys and values together; writing it as `(1, 640)` keeps the orchard''s index order `[token_pos_id, layer_id, head_id, elem_id]` the same on both settings.'
    sec: mla
---

`decode_step` on [[#landscape-attention]] has no idea of order: a key scores the same against a query wherever its token sits. And it stores a key and a value for every KV head. Real LLMs amend both, and both amendments touch what the [[orchard]] holds.

## Where is a token? RoPE {#rope}

Most LLMs tell attention where a token sits with [[=rope|RoPE]], rotary position embedding. It takes the elements of a query, and of a key, in pairs `(2c, 2c+1)`, and turns each pair by an angle proportional to the token's position. Each pair has its own angle step, from large to tiny.

```python RoPE on one head vector; the key is turned BEFORE it is stored
head_dim = 16
theta = 10000.0 ** (-np.arange(head_dim // 2) * 2 / head_dim)   # one angle step per pair, large to tiny

def rope(vec, pos, theta):
    """Turn the pairs (2c, 2c+1) of one head vector by pos * theta[c]."""
    x, y = vec[0::2], vec[1::2]
    a = pos * theta
    return np.stack([x * np.cos(a) - y * np.sin(a),
                     x * np.sin(a) + y * np.cos(a)], axis=-1).reshape(-1)

stored = rope(key, pos, theta)                       # what k[layer_id].append(...) receives
print(np.allclose(rope(stored, -pos, theta), key))   # True: the turn is exactly reversible
```

Since both query and key are turned, their dot product depends only on how far apart the two tokens are: `rope(q, 12, theta) @ rope(key, 7, theta)` equals `rope(q, 112, theta) @ rope(key, 107, theta)`. That is the whole trick. What matters here is the last line of the listing: **the key is turned before it is stored**, and the turn can be undone exactly because `token_pos_id` is known.

::: figure fig-landscape-rope ropeSpin
**One pair of key elements for 64 tokens, before and after RoPE.** Each dot is one token's key, restricted to the two elements of one pair (horizontal and vertical axes, illustrative numbers); colour runs from early positions (blue) to late ones (red). Before RoPE the dots form one tight cluster. After RoPE, token `t` is turned by `t` times the angle on the slider, and the cluster smears around the dashed circle. The read-out gives the spread (standard deviation) of each of the two elements.
:::

::: try
1. Switch between *before* and *after*. Same keys, same information; after the turn each element's numbers vary six or seven times as much.
2. Set the angle to 0°. RoPE then does nothing (real LLMs use a different angle for every pair, some tiny, some large).
:::

A wider spread costs bits: in [[#school-residual-shapes]] halving the [[standard-deviation]] of bell-shaped data saved one bit per number. The turn is exactly reversible when the position is known, so a lossless compressor may store keys *before* RoPE and turn them on the way out. Some LLMs apply **partial RoPE**, turning only some of the elements and leaving the rest untouched; in DeepSeek-V3 the position lives in 64 elements beside a 512-element latent. [[#hypotheses-keys-and-values]] takes up what this means for compressing keys.

::: takeaway
- RoPE turns pairs of key elements by an angle that grows with `token_pos_id`, before the key is stored; the dot product then depends only on the distance between two tokens.
- Keys are more regular before the turn, and the turn is exactly reversible, so a compressor may undo it.
:::

## One latent per token per layer: MLA {#mla}

DeepSeek's LLMs, and GLM-5.x which builds on them, use [[=mla|MLA]], multi-head latent attention. Instead of a key and a value per KV head, each token stores **one compressed latent vector per layer**, and the keys and values of every head are rebuilt from it by a matrix multiplication when attention needs them.

```python MLA: the orchard row is one latent, keys and values are rebuilt from it
c_kv = x @ W.dkv[layer_id]                          # one latent per token: (d_latent,), 576 in DeepSeek-V3
latent[layer_id].append(c_kv)                       # the orchard grows by one row: no separate keys and values
C = np.stack(latent[layer_id])                      # (pos+1, d_latent)
K = (C @ W.uk[layer_id]).reshape(pos + 1, n_heads, head_dim)   # keys of every head, rebuilt
V = (C @ W.uv[layer_id]).reshape(pos + 1, n_heads, head_dim)   # values likewise
```

:::: compare What one row of the orchard holds
::: col GQA: the Bench (Qwen3.5-2B)
- Keys and values of 2 KV heads: [[~v-one-token-layer]] is `(2, 256)`, and `k[token_pos_id, layer_id]` the same.
- 512 B of values and 512 B of keys per token per layer at 8 bits.
:::
::: col MLA: the Pin (GLM-5.1)
- One latent vector: 512 + 64 elements in DeepSeek-V3 (the 64 carry the position); ≈ 640 on the Pin, derived from GLM-5.1's bytes per token.
- ≈ 640 B per token per layer at 8 bits, keys and values together. Written as `(1, 640)` so the four index names still fit.
:::
::::

For this project the difference is cosmetic. Either way there is **one fixed-size row per token per KV layer**, every row must be kept, and the four index names `[token_pos_id, layer_id, head_id, elem_id]` describe it. The Bench's row has two halves that can be studied apart (the campaigns compressed values alone); the Pin's row is one piece.

::: takeaway
- MLA stores one latent per token per KV layer instead of separate keys and values; attention rebuilds them when needed.
- On the Pin that latent is ≈ 640 elements, ≈ 640 B at 8 bits, treated as `(1, 640)`; on the Bench a row is `(2, 256)` of values plus the same of keys.
- Still one row per token per KV layer, and every row is kept.
:::
