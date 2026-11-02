---
title: Sparse attention and the indexer
nav: Sparse attention
group: Sparse attention
lede: Most of the weight in attention lands on a few stored tokens. Sparse attention takes the hint. A cheap scout names a few thousand positions per layer, attention reads only those, and each named position is a pick. The reading stops growing. The keeping does not.
cards:
  - q: 'In top-$\vk$ sparse attention, how many positions does one layer read at one decode step?'
    a: '$\vk$, the ones the indexer picked (2048 in DSA)'
    wrong: ["Every stored position, but faster", "One per KV head", "$\\vk$ per KV head, so $\\vk$ times the number of heads"]
    why: 'The indexer names a pick set $\vS$ of $\vk$ positions per layer per step; attention scores and mixes only those.'
    sec: topk
  - q: What does the indexer do?
    a: 'Cheaply scores every stored position and keeps the $\vk$ best, before attention touches any key or value'
    wrong: ["It compresses the orchard", "It decides which layers to skip", "It sorts the tokens of the prompt alphabetically"]
    why: In DSA it uses its own tiny keys in a low-precision format, so scanning everything is cheap compared with full attention.
    sec: topk
  - q: What is a pick?
    a: 'One `(layer_id, token_pos_id)` the indexer names at one decode step: one position wanted at one layer'
    wrong: ["One element of the orchard", "One stretch of token positions", "The whole pick set of a step"]
    why: 'A pick is the unit of demand. What it covers differs by LLM: one layer in DSA, a group of layers in GLM-5.1, four squeezed tokens in DeepSeek-V4.'
    sec: pick
  - q: Does sparse attention shrink the memory a sequence needs?
    a: No; every row of the orchard must still be kept, because any position may be picked at a later step
    wrong: ["Yes, to $\\vk$ rows per layer", "Yes, by half", "Yes, unpicked rows are deleted"]
    why: The picks drift from step to step. A position skipped now may be picked later, so nothing can be thrown away.
    sec: consequences
  - q: Which property of sparse attention does this project build on?
    a: At every layer of every step, the indexer announces exactly which positions attention will read, before their bytes are touched
    wrong: ["Sparse attention makes keys more compressible", "Sparse attention needs fewer layers", "Sparse attention reads positions in order"]
    why: That advance notice is a precise demand signal, which a cache (and a compressor) can plan around.
    sec: consequences
---

Look at the weights in [[#fig-landscape-attention]] again: two of the eight tokens took about two thirds of the attention. Now imagine 100 384 stored tokens. `decode_step` on [[#landscape-attention]] still scores all 100 384 keys and mixes all 100 384 values, at every KV layer, at every step. Almost all of them get weights so small they change nothing.

That is a lot of reading for nothing. Newer LLMs stop doing it.

## Read only the picks {#topk}

[[=sparse-attention|Sparse attention]] adds one step in front of attention: a quick pass that decides which few stored positions are worth reading. Attention then runs over those alone.

::: define indexer
- **What it is.** A cheap scorer that runs at every KV layer of every decode step. It gives every stored position a rough relevance score and keeps the $\vk$ best: the pick set `S`.
- **Why it is cheap.** It keeps its own, much smaller key per position, in a low-precision format, and uses only a few heads. Scanning everything with it costs far less than real attention over everything.
- **Its nickname.** The Scout: it runs ahead and reports which positions are needed *before* any of their bytes are touched.
- **Easy to confuse with** attention itself. The indexer only *chooses*; attention still does the real lookup, on the chosen positions.
:::

The best-known design is [[=dsa|DSA]], the sparse attention of DeepSeek-V3.2, also used by GLM-5.x. Its "lightning indexer" scores each stored position with a few small dot products, clips the negative ones to zero and adds them up with learned weights. It then keeps the top $\vk = 2048$ positions per layer. Here is the idea in numpy, on one layer's `K` and `V` from `decode_step`:

```python the indexer and sparse attention for one query head
def indexer_topk(q_idx, K_idx, k):
    """The indexer: a cheap score for every stored position; keep the k best."""
    scores = np.maximum(K_idx @ q_idx, 0)          # DSA-style: tiny keys, dot products clipped at zero
    return np.argsort(scores)[-k:]                 # S: the k picks of this layer at this step

def sparse_attention(q, K, V, S, head_id):
    """Attention for one query head that reads only the picks S."""
    weights = softmax(K[S, head_id] @ q / np.sqrt(K.shape[-1]))   # k scores, not one per stored token
    return weights @ V[S, head_id]                                 # weighted mix of k values

n_tokens, n_kv_heads, head_dim, k = 100_384, 2, 256, 2048
K_idx = rng.normal(size=(n_tokens, 16))                # the indexer's own small keys
K = rng.normal(size=(n_tokens, n_kv_heads, head_dim))  # one layer's keys, (pos+1, n_kv_heads, head_dim)
V = rng.normal(size=(n_tokens, n_kv_heads, head_dim))
S = indexer_topk(rng.normal(size=16), K_idx, k)
out = sparse_attention(rng.normal(size=head_dim), K, V, S, head_id=0)
print(S.shape, "of", n_tokens, "stored positions read; output", out.shape)
# (2048,) of 100384 stored positions read; output (256,)
```

In symbols, attention at layer $\vl$ and step $\vt$ becomes

$$
\begin{aligned}
\text{output} &= \sum_{\vt' \in \vS} \text{weight}_{\vt'} \times \text{value}_{\vt'} \\[4pt]
\underbrace{\vS}_{\text{the pick set}} &: \ \underbrace{\vk}_{2048 \text{ on the Pin}} \text{ positions per layer per step}
\end{aligned}
$$ {#eq-landscape-sparse}

with the softmax taken over the $\vk$ picked scores only. (Random numbers stand in for real keys in the snippet, so its output means nothing; the point is the shape of the computation.)

::: aside reminder The soft lookup (III.2)
Score each stored key against the query, turn the scores into weights with a softmax, mix the stored values with those weights. Sparse attention does exactly this, on $\vk$ positions instead of all of them.
:::

::: takeaway
- An indexer scores every stored position cheaply and picks $\vk$ of them per layer per step: the pick set [[~pick-set]].
- Attention then reads only those $\vk$ positions. In DSA, $\vk = 2048$.
:::

## What a pick is {#pick}

Each element of `S` names one position for one layer at one step. That unit gets a name, because the hot cache holds it, a miss fetches it, and the application serves it.

::: define pick
- **What it is.** One unit of demand as the indexer names it at one decode step: one `(layer_id, token_pos_id)`, [[~pick-tuple]]. The set of a layer's picks at one step is `S`, of size $\vk$; in the setting selected now, [[@k]] picks per layer per step.
- **What it covers.** Depends on the LLM. In DSA each layer's indexer picks for that layer alone, so a pick is one token's row at one layer. In GLM-5.1 one selection is shared by a group of layers, so one pick names a position for all of them at once. In DeepSeek-V4 four tokens are first squeezed into one row and the indexer picks among the squeezed rows, so a pick is four tokens' worth.
- **What it costs.** Fetched raw, a pick is its row's bytes: [[@e]] when a pick is one token's values at one layer, the case the examples use.
- **Easy to confuse with** the unit of compression in Part IV, a cherry ([[#scenario-cherry]]), which is cut to a shape the scenario chooses; a pick is served with one or more cherries. And with a stretch, a run of consecutive positions ([[#scenario-stretch]]): a pick is one position.
:::

| design | what the indexer keeps per position | what one pick is | picks per layer per step |
|---|---|---|---|
| DSA (DeepSeek-V3.2) | one small indexer key per token | one token's row at one layer | 2048 |
| GLM-5.1 | one small indexer key per token, one selection per group of layers | one token's row at each layer of the group | 2048, shared by the group |
| DeepSeek-V4 | one key per squeezed row of 4 tokens | four tokens' rows at one layer, as one | 512 squeezed rows, 2048 tokens' worth |

The Pin follows HiSparse's trace of GLM-5.1 and counts $\vk = 2048$ picks per layer per step; what a GLM-5.1 pick shares across layers is taken up on [[#scenario-why-vary]] and [[#app-which-application]], where it decides what the compression unit should be.

::: takeaway
- A pick is one `(layer_id, token_pos_id)` the indexer names; `S` is one layer's pick set at one step, $\vk$ of them.
- What a pick covers is the LLM's business: one layer (DSA), a group of layers (GLM-5.1), four squeezed tokens (DeepSeek-V4).
:::

## What changes, and what does not {#consequences}

The figure shows a toy LLM with 6 KV layers. Slide through the decode steps and switch between dense and sparse reading.

::: figure fig-landscape-reading readingGrid wide
**Which rows one decode step reads.** Top: the stored rows of a toy LLM, one row per `layer_id` (6 layers, layer 0 at the bottom) and one column per position (up to 48). Pale cells are stored; dark cells are read at the current step. In *dense* mode every stored cell is read; in *sparse* mode each layer reads only the $\vk = 6$ picks its indexer named (illustrative picks from a seeded generator). Bottom: rows stored and rows read per step, against the step number; the accent line marks the current step. Use the slider to move through the steps and the switch to change mode. The figure's legend still says "entries" for what this page calls rows or picks. <!-- old-words -->
:::

::: try
1. In sparse mode, move the step slider slowly. The picks of each layer change only a little from step to step; remember this for [[#landscape-lucky-louis]].
2. Compare the two curves in the lower plot. In dense mode, reading grows with every step. In sparse mode it stays flat at $6 \times 6 = 36$ rows per step, while the stored count keeps climbing.
:::

Three consequences, in order of how much they matter to us.

1. **The reading per step stops growing.** Attention reads $\vk$ picks per layer, whatever the context length. The indexer still scans everything, but its scan is cheap.
2. **Everything must still be kept.** The picks drift from step to step, and a position skipped now may be picked later. So the whole orchard stays available. A 128K-token sequence of GLM-5.1 holds about 13 GB of keys and values in BF16, and sparse attention does not remove a byte of it. It changes what is *read*, not what is *kept*.
3. **The indexer announces demand in advance.** At every layer of every step, the pick set `S` is known before any key or value is touched. Dense attention never had such a signal: it simply needed everything. Everything in this project is built on it.

::: theme access-pattern
Dense attention reads a layer's whole store in one sweep. Sparse attention reads $\vk$ picks scattered over 100 384 positions: thousands of tiny, independent fetches per step. That is the tiny-file problem of [[#tiny-files-notice-anything]] in a new setting, and it decides what any storage scheme for these rows is allowed to look like.
:::

::: aside detail Other sparse-attention designs
| design | what the indexer keeps per position | what it picks |
|---|---|---|
| DSA (DeepSeek-V3.2, GLM-5.x) | one small indexer key per token | single tokens |
| NSA | one summary key per small run of tokens | runs of tokens |
| Quest (no retraining) | smallest and largest key values per page of 16 tokens | pages of tokens |
| DeepSeek-V4 | first squeezes 4 tokens into one row, then picks 512 rows (2048 tokens) | squeezed rows |

All of them name a set of positions per layer before attention touches any key or value, and all of them still need every row kept. Designs that squeeze several tokens into one row change what a pick is (fewer, bigger ones), not the problem. [[#papers-sparse-selectors]] looks at each.
:::

::: takeaway
- Sparse attention caps the reading per step at $\vk$ picks per layer; the orchard still grows with every token.
- The picks are known before any row is read: a precise, per-layer, per-step demand signal.
- Reading becomes thousands of small, scattered fetches: the access pattern of the tiny-file problem.
:::
