---
title: 'Attention: looking back'
nav: Attention
group: The LLM
lede: Before writing each token, the LLM consults what earlier tokens left behind. The consultation is a soft lookup, and one decode step of it fits in twenty lines of numpy. Every shape in those lines is named here, for a toy and for the Bench.
cards:
  - q: In attention, what is compared with what?
    a: The new token's query is compared with the key of every stored token
    wrong: ["The new token's value is compared with every stored value", "Each stored key is compared with every other stored key", "The query is compared with the values"]
    why: 'The score of stored token $\vt$ is the dot product of the query and that token''s key. The values are only used afterwards, mixed by the weights.'
    sec: soft-lookup
  - q: Scores 1, 2 and 3 go into a softmax. Roughly what weights come out?
    a: 9 %, 24 % and 67 %
    wrong: ["17 %, 33 % and 50 %", "0 %, 0 % and 100 %", "33 %, 33 % and 33 %"]
    why: 'Softmax exponentiates and normalises: $e^1, e^2, e^3 = 2.7, 7.4, 20.1$, divided by their sum 30.2.'
    sec: soft-lookup
  - q: 'In `decode_step`, what is the shape of `key` on the Bench, and what is `K` after `np.stack`?'
    a: '`(2, 256)`, one vector per KV head; `K` is `(pos+1, 2, 256)`, every stored key of the layer'
    wrong: ["`(8, 256)` and `(pos+1, 8, 256)`", "`(256,)` and `(pos+1, 256)`", "`(2, 256)` and `(2, 256)`"]
    why: 'Qwen3.5-2B keeps 2 KV heads of 256 elements per layer. `K` stacks the `pos+1` stored keys of the layer along a new first axis.'
    sec: decode-step
  - q: A layer has 8 query heads and 2 KV heads (grouped-query attention). How many key vectors does one token store at that layer?
    a: 2, one per KV head
    wrong: ["8, one per query head", "16, one per query head and KV head", "1, one per layer"]
    why: 'With GQA, groups of query heads share one KV head: `head_id = qh // (n_q_heads // n_kv_heads)`. Only the KV heads are stored.'
    sec: decode-step
  - q: In the decode step, which line makes the stored memory grow with every step?
    a: '`k[layer_id].append(key); v[layer_id].append(val)`'
    wrong: ["`weights = softmax(scores)`", "`x = x + np.concatenate(out) @ W.o[layer_id]`", "`q = (x @ W.q[layer_id]).reshape(n_q_heads, head_dim)`"]
    why: Every step, at every KV layer, one more key and one more value are appended, and never removed.
    sec: decode-step
---

The LLM is about to write the next word of *"The weather on Gull Rock is foggy, and the …"*. Which earlier words should it think about? *Weather* and *foggy*, surely; perhaps *Gull Rock*. Hardly *on* or *The*.

[[=attention|Attention]] is the mechanism that decides, for every new token, which earlier tokens to consult and how much. It runs inside every [[kv-layer|KV layer]], at every step. It is also the reason the LLM must keep material from every earlier token around.

## A soft lookup {#soft-lookup}

Think of an ordinary lookup first. A Python dict maps a key to a value: ask for `"fog"`, get exactly the value stored under `"fog"`. Attention softens this in three ways.

1. **Every stored token has a key and a value.** Both are [[vector|vectors]]. The key is a label that says *what this token is about*; the value is *what it has to contribute*.
2. **The new token asks a question**, its query vector $\vq$. Every key gets a **score**: how well it matches the query, measured by the dot product (multiply element by element, add up).
3. **The scores become weights, and the answer is a weighted mix of all values.** Nothing is picked outright; everything contributes a little, the good matches a lot.

The function that turns scores into weights is the **softmax**: apply the exponential function to each score (raise Euler's number 2.718… to that power; the plain $e$ in this formula is that number, never the byte count $\ve$ of later pages), then divide by the total, so the weights are positive and add up to 1.

$$
\begin{aligned}
\text{score}_{\vt} &= \underbrace{\vq \cdot \text{key}_{\vt}}_{\text{how well it matches}} \\[4pt]
\text{weight}_{\vt} &= \frac{e^{\,\text{score}_{\vt}}}{\sum_{\vt'} e^{\,\text{score}_{\vt'}}} \\[4pt]
\text{output} &= \sum_{\vt} \underbrace{\text{weight}_{\vt}}_{\text{how much to listen}} \times \underbrace{\text{value}_{\vt}}_{\text{what } \vt \text{ says}}
\end{aligned}
$$ {#eq-landscape-attention}

The sums run over all stored positions. (Real LLMs also divide each score by the square root of the key's length, to keep scores in a sensible range. It changes nothing in the story.)

::: note example Three keys, by hand
Three stored tokens have scores 1, 2 and 3 against the query, and values 10, 20 and 30 (one number each, to keep it small).

| stored token | score | $e^{\text{score}}$ | weight | weight × value |
|---|---|---|---|---|
| A | 1 | 2.72 | 9 % | 0.9 |
| B | 2 | 7.39 | 24 % | 4.9 |
| C | 3 | 20.09 | 67 % | 20.0 |
| **total** | | 30.19 | 100 % | **25.8** |

The answer, 25.8, is mostly C's value, with a little of B and a pinch of A. Double the query and the scores become 2, 4, 6: the weights sharpen to 2 %, 12 % and 87 %, and the answer moves to 28.5.
:::

Now do it with your hands. The figure has eight stored tokens, each with a two-element key.

::: figure fig-landscape-attention attentionToy
**Attention as a soft lookup, in two dimensions.** Top: each coloured dot is the key of one stored token (labelled with its token), drawn as a point in the plane of its two elements; the accent knob is the query $\vq$, and the line from the centre shows its direction and length. Bottom left: the score of each key, the dot product of query and key. Bottom right: the softmax weights, which add up to 100 %. The stacked bar shows the output as a mix of the eight values, in the same colours. Keys and query are illustrative numbers; real keys have a few hundred elements.
:::

::: try
1. Drag the query towards *fog*. Its weight climbs and the others shrink, though none reaches zero.
2. Keep the direction, but drag the query far out, then close to the centre. Long queries focus; short queries spread the weight almost evenly.
3. Point the query between *Gull* and *Rock*. Two tokens can share the attention.
:::

::: takeaway
- Attention is a soft lookup: the query is scored against every stored key, softmax turns the scores into weights, the output is the weighted mix of the stored values.
- Every stored token gets *some* weight, so every stored key is read at every step.
:::

## The decode step in Python {#decode-step}

Here is one decode step, written to show where memory is kept and read. It runs as printed, with the toy shapes of the sidebar, and it is the listing every later page quotes from.

::: aside detail The toy's weights
```python setup for the decode step below
import numpy as np
from types import SimpleNamespace
rng = np.random.default_rng(0)
# the toy's shapes: hidden width, KV layers, query heads, KV heads, elements per head vector
d_model, n_kv_layers, n_q_heads, n_kv_heads, head_dim = 64, 4, 8, 2, 16
W = SimpleNamespace(
    q=rng.normal(0, d_model**-0.5, (n_kv_layers, d_model, n_q_heads * head_dim)),
    k=rng.normal(0, d_model**-0.5, (n_kv_layers, d_model, n_kv_heads * head_dim)),
    v=rng.normal(0, d_model**-0.5, (n_kv_layers, d_model, n_kv_heads * head_dim)),
    o=rng.normal(0, (n_q_heads * head_dim)**-0.5, (n_kv_layers, n_q_heads * head_dim, d_model)),
)
def softmax(s):
    e = np.exp(s - s.max())
    return e / e.sum()
```
:::

```python one decode step of a GQA transformer, written to expose the orchard
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

k = [[] for _ in range(n_kv_layers)]
v = [[] for _ in range(n_kv_layers)]
for pos in range(5):                       # five decode steps; random vectors stand in for tokens
    x = decode_step(rng.normal(size=d_model), k, v, W, pos)
print(len(k[0]), k[0][0].shape, np.stack(v[0]).shape)
# 5 (2, 16) (5, 2, 16): five tokens stored; each key is 2 KV heads × 16 elements
```

Read it line by line, with the shapes.

- **`q = (x @ W.q[layer_id]).reshape(n_q_heads, head_dim)`.** The [[=query]] is the vector the current token scores every stored key with. There is one per *query head*, so `q.shape` is `(8, 16)` in the toy and `(8, 256)` on the Bench. Queries are computed, used and dropped; nothing stores them.
- **`key = (x @ W.k[layer_id]).reshape(n_kv_heads, head_dim)`**, and `val` the same way. One layer runs several lookups side by side, and each is a [[=head|KV head]], `head_id`. A token leaves one key vector and one value vector *per KV head*: [[~new-key|key]] has shape `(2, 16)` in the toy and `(2, 256)` on the Bench. With **grouped-query attention (GQA)** several query heads share one KV head, and `head_id = qh // (n_q_heads // n_kv_heads)` says which: in the toy and on the Bench, query heads 0 … 3 read KV head 0 and 4 … 7 read KV head 1. Only KV heads are stored, so GQA shrinks the stored memory by the sharing factor, 4× here.
- **`k[layer_id].append(key); v[layer_id].append(val)`.** At every KV layer, every step adds one more key and one more value, and nothing is ever removed. The next page names this growing store.
- **`K = np.stack(k[layer_id])`.** Every stored key of the layer as one array: [[~k-stack]] has shape `(pos+1, 2, 16)` in the toy and `(pos+1, 2, 256)` on the Bench; `V` likewise. Then `K[:, head_id] @ q[qh]` scores the query against *every* stored key of its KV head, and `weights @ V[:, head_id]` reads *every* stored value, if only to multiply it by a tiny weight. The work of a step grows with the number of tokens stored.

| in `decode_step` | the toy | the Bench (Qwen3.5-2B) |
|---|---|---|
| `x` | `(64,)` | `(d_model,)` |
| `q` | `(8, 16)` | `(8, 256)` |
| `key`, `val` | `(2, 16)` | `(2, 256)` |
| `K`, `V` | `(pos+1, 2, 16)` | `(pos+1, 2, 256)` |
| `K[:, head_id] @ q[qh]` | `(pos+1,)` | `(pos+1,)` |

:::: compare One KV head per query head, versus shared ones
::: col Classic: 8 query heads, 8 KV heads
- Each query head has its own keys and values.
- Per token per layer: 8 keys and 8 values stored.
:::
::: col GQA: 8 query heads, 2 KV heads
- Query heads 0–3 read `head_id = 0`; heads 4–7 read `head_id = 1`.
- Per token per layer: 2 keys and 2 values stored, **4× less memory**.
:::
::::

The Pin's LLM, GLM-5.1, stores its keys and values differently (one latent vector per token per layer, [[#landscape-rope-and-mla]]); the listing still describes what its attention computes, with `K` and `V` rebuilt from the latent, and this site treats its row as `(1, 640)`.

::: takeaway
- Each decode step, at each KV layer: compute this token's queries, key and value; append the key and value; score the query against all stored keys; mix all stored values.
- `q` is `(n_q_heads, head_dim)`, `key` and `val` are `(n_kv_heads, head_dim)`, `K` and `V` are `(pos+1, n_kv_heads, head_dim)`: `(pos+1, 2, 256)` on the Bench.
- Storage grows by one key and one value per KV layer per token; the reading work grows with everything stored.
:::
