# The Python notation: the canonical listings

Every term on the site is bundled with a Python expression, and every expression follows the conventions
here. Pages quote these listings (or a shortened form of them) rather than inventing their own. The
inline chip `[[~id]]` (entries in `data/notation/*.yaml`) renders an expression with a hover that shows
its `.shape` and bytes in the current reference setting.

## 1. Index names and axis order

Tensors are indexed `[token_pos_id, layer_id, head_id, elem_id]`, always in this order, matching the
experiment repository's export `(n_tokens, n_kv_layers, n_kv_heads, head_dim)`.

| index | ranges over | symbol |
|---|---|---|
| `token_pos_id` | `0 … n_tokens-1` (the sequence so far) | `t` |
| `layer_id` | `0 … n_kv_layers-1`, the KV layers in order (Qwen3.5-2B: model layers 3, 7, 11, 15, 19, 23 are KV layers 0 … 5) | `l` |
| `head_id` | `0 … n_kv_heads-1` | `h` |
| `elem_id` | `0 … head_dim-1` | — |

Sizes: `n_tokens` (the sequence length so far, `L` when frozen), `n_kv_layers` (`N_L`), `n_kv_heads`,
`head_dim`. Shapes in the two reference settings:

| | the Pin (GLM-5.1) | the Bench (Qwen3.5-2B) |
|---|---|---|
| `n_kv_layers` | 78 | 6 |
| `n_kv_heads × head_dim` | one MLA latent of ≈ 640 elements per token per layer (we treat it as `(1, 640)`) | `2 × 256` |
| one token's values at one layer, 8-bit | 640 B (keys and values are one latent) | 512 B |
| one token at all KV layers, 8-bit, values | ≈ 50 KB (latent) | 3 072 B |
| `v.shape` for one sequence | `(100_384, 78, 1, 640)` | `(225_000, 6, 2, 256)` |

Write `.shape` with the numbers of the setting the page is talking about; use `[[@key]]` only where a
sentence is true for both settings.

## 2. The decode step (Part III quotes this)

```python
def decode_step(x, k, v, W, pos):
    """One decode step of a GQA transformer, written to expose the orchard.
    x: the new token's hidden state, shape (d_model,)
    k, v: the orchard so far, lists per KV layer; k[l] has shape (pos, n_kv_heads, head_dim)
    pos: this token's token_pos_id"""
    for layer_id in range(n_kv_layers):
        q   = (x @ W.q[layer_id]).reshape(n_q_heads,  head_dim)   # queries, one per query head
        key = (x @ W.k[layer_id]).reshape(n_kv_heads, head_dim)   # this token's key, one per KV head
        val = (x @ W.v[layer_id]).reshape(n_kv_heads, head_dim)   # this token's value
        k[layer_id].append(key); v[layer_id].append(val)          # the orchard grows by one row
        K = np.stack(k[layer_id])        # (pos+1, n_kv_heads, head_dim)
        V = np.stack(v[layer_id])        # (pos+1, n_kv_heads, head_dim)
        out = []
        for qh in range(n_q_heads):
            head_id = qh // (n_q_heads // n_kv_heads)            # GQA: which KV head this query head reads
            scores  = K[:, head_id] @ q[qh] / np.sqrt(head_dim)   # one score per stored token
            weights = softmax(scores)
            out.append(weights @ V[:, head_id])                   # weighted mix of stored values
        x = x + np.concatenate(out) @ W.o[layer_id]
    return x
```

Stacked for a whole sequence, the orchard is two arrays:

```python
k.shape == v.shape == (n_tokens, n_kv_layers, n_kv_heads, head_dim)   # one 8-bit element each
v[token_pos_id, layer_id, head_id, elem_id]      # one element
v[token_pos_id, layer_id, head_id, :]            # one V vector: (head_dim,)
v[token_pos_id, layer_id]                        # one token's values at one layer: (n_kv_heads, head_dim)
v[token_pos_id]                                  # one token's values at every KV layer
v[:, layer_id, head_id, elem_id]                 # one furrow: (n_tokens,)
```

## 3. Sparse attention and picks

```python
S = indexer_topk(q_idx, K_idx, k)          # the indexer: k positions for this layer at this step
# a pick is one (layer_id, token_pos_id); S is this layer's picks
out = softmax(K[S, head_id] @ q[qh] / np.sqrt(head_dim)) @ V[S, head_id]
```

HiSparse's resolve step, per sequence, per layer, per decode step:

```python
hits   = [p for p in S if p in hot_cache]
misses = [p for p in S if p not in hot_cache]
for p in misses:
    evict_lru_not_in(S)                    # LRU with one guard
    hot_cache[p] = fetch(p)                # one pick over the link: raw, e bytes
```

## 4. The compression scenario (Part IV quotes this)

```python
Scenario(
    slice        = "v[:, [1, 3], 0, :]",   # which coordinates of the orchard are in play
    cherry       = "v[t, [1, 3], 0, :]",   # the cherry shape, as the index expression of position t's cherry: 512 elements
    stretch_len  = 4096,                   # token positions per stretch: 512, 4096, 16 384 or n_tokens
    leash        = 293,                    # distinct dictionary bytes one cold decode may read, in cherry_bytes; 293 is the leash of stretch 4096
    fmt          = "fp8_e4m3",             # the number format the orchard is stored in; the only one in scope
    llm          = "Qwen3.5-2B",
    corpus       = "agent-long30",
)

stretch      = range(stretch_id * stretch_len, (stretch_id + 1) * stretch_len)
cherry       = lambda t: v[t, [1, 3], 0, :]        # every cherry holds the vectors of one position
punnet       = [cherry(t) for t in stretch]         # all cherries of one stretch, in position order
cherry_bytes = cherry(stretch[0]).size              # 512 here, at 8 bits per element
punnet_size  = len(punnet)                          # 4096 here: one cherry per token

deltas, dictionary = compress(punnet, side_info)    # once, on the sender's side, within the compress time limit
for i in range(punnet_size):
    assert decompress(deltas[i], dictionary, side_info) == punnet[i]   # bit for bit, from cold
    assert dict_reads(deltas[i], dictionary) <= leash * cherry_bytes   # for every cherry, the worst one decides

raw              = punnet_size * cherry_bytes
mdl_ratio        = (len(dictionary) + sum(map(len, deltas))) / raw     # every delta summed, never averaged
delta_share      = sum(map(len, deltas)) / raw
dictionary_share = len(dictionary) / raw            # delta_share + dictionary_share == mdl_ratio
```

The same slice with a different cherry shape is a different scenario:

```python
# slice: values of KV layers 1 and 3, head 0, for one stretch
# cherry(t) = v[t, 1, 0, :] and v[t, 3, 0, :]  -> two cherries of 256 elements per token, punnet_size = 2 * 4096, cherry_bytes = 256
# cherry(t) = v[t, [1, 3], 0, :]               -> one cherry of 512 elements per token,   punnet_size = 4096,     cherry_bytes = 512
```

The three cherry shapes in scope, each the vectors of one position:

```python
cherry(t) = v[t, :, :, :]                       # all V of position t: 6 KV layers x 2 heads x 256 elements = 3072
cherry(t) = v[t, 0, 0, :]                       # one V vector, KV layer 0 (the LLM's layer 3), head 0: 256 elements
cherry(t) = (k[t, :, :, :], v[t, :, :, :])      # all K and V of position t: 6144 elements
```

A bare shape tuple such as `(2, 256)` is not a cherry shape: it does not say which axes it spans.

## 5. The serving application (Part VI quotes this)

```python
for p in misses:                                       # p is a pick (layer_id, token_pos_id)
    sid = p.token_pos_id // stretch_len
    if sid in shelf:                                   # the dictionary shelf: on-fire stretches
        for cherry_id in cherries_of(p, scenario):     # one pick -> one or more cherries
            hot_cache[p] += decompress(fetch_delta(cherry_id), shelf[sid])   # a δ-miss: ρ·e bytes
    else:
        hot_cache[p] = fetch(p)                        # a raw miss: e bytes, as HiSparse today
```

## 6. Naming in prose

- Write the index names in code font when they name an axis: "along `token_pos_id`", "a fixed `elem_id`".
- Write a scenario as `V of one token, v[t, :, :, :] · stretch 4096 · leash 293 · fp8 · target 02`, the
  cherry as its index expression (with the element count the first time on a page), never as a tuple.
- Write sizes with units: `cherry_bytes = 512 B`, `stretch_len = 4096 tokens`, `punnet_size = 4096 cherries`.
- Say "the orchard of one sequence" for the tensors, "the orchard" for the concept.
- Never write `K[l, h, t, c]`: the old axis order and the letter `c` are retired.
