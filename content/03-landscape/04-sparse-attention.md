---
title: Sparse attention and the indexer
nav: Sparse attention
group: How a model reads its memory
lede: Most of the weight in attention lands on a few stored tokens. Sparse attention takes the hint — a cheap scout picks a few thousand entries per layer, and attention reads only those. The reading stops growing. The keeping does not.
cards:
  - q: In top-$\vk$ sparse attention, how many entries does one layer read at one decode step?
    a: $\vk$ — the ones the indexer selected (2048 in DSA)
    wrong: ["All stored entries, but faster", "One entry per head", "$\\vk$ per head, so $\\vk$ times the number of heads"]
    why: 'The indexer picks a set $\vS_{\vt}$ of $\vk$ positions per layer per step; attention scores and mixes only those.'
    sec: topk
  - q: What does the indexer do?
    a: Cheaply scores every stored position and picks the $\vk$ best, before attention touches any keys or values
    wrong: ["It compresses the KV cache", "It decides which layers to skip", "It sorts the tokens of the prompt alphabetically"]
    why: In DSA it uses its own tiny keys in a low-precision format, so scanning everything is cheap compared with full attention.
    sec: topk
  - q: Does sparse attention shrink the memory a request needs?
    a: No — every entry must still be kept, because any of them may be selected at a later step
    wrong: ["Yes, to $\\vk$ entries per layer", "Yes, by half", "Yes, unselected entries are deleted"]
    why: The selection drifts from step to step. An entry skipped now may be picked later, so nothing can be thrown away.
    sec: consequences
  - q: Which property of sparse attention does this project build on?
    a: At every layer of every step, the indexer announces exactly which entries attention will read, before they are read
    wrong: ["Sparse attention makes keys more compressible", "Sparse attention needs fewer layers", "Sparse attention reads entries in order of position"]
    why: That advance notice is a precise demand signal, which a cache (and a coder) can plan around.
    sec: consequences
---

Look at the weights in [[#fig-landscape-attention]] again: two of the eight tokens took about two thirds of the attention. Now imagine 100,000 stored tokens. The decode loop of [[#landscape-attention]] still scores all 100,000 keys and mixes all 100,000 values, at every layer, at every step. Almost all of them get weights so small they change nothing.

That is a lot of reading for nothing. Newer models stop doing it.

## Read only what matters {#topk}

[[=sparse-attention|Sparse attention]] adds one step in front of attention: a quick pass that decides which few stored entries are worth reading. Attention then runs over those alone.

::: define indexer
- **What it is.** A cheap scorer that runs at every layer of every decode step. It gives every stored position a rough relevance score and keeps the $\vk$ best: the selected set $\vS_{\vt}$.
- **Why it is cheap.** It keeps its own, much smaller key per position, in a low-precision format, and uses only a few heads. Scanning everything with it costs far less than real attention over everything.
- **Its nickname.** The Scout: it runs ahead and reports which entries are needed *before* any of their bytes are touched.
- **Easy to confuse with** attention itself. The indexer only *chooses*; attention still does the real lookup, on the chosen entries.
:::

The best-known design is [[=dsa|DSA]], the sparse attention of DeepSeek-V3.2, also used by GLM-5.x. Its "lightning indexer" scores each stored position with a few small dot products, clips negative ones to zero and adds them up. It then keeps the top $\vk = 2048$ positions per layer. Here is the idea in numpy:

```python an indexer and sparse attention for one head
import numpy as np
rng = np.random.default_rng(1)

def softmax(s):
    e = np.exp(s - s.max())
    return e / e.sum()

def indexer_topk(q_idx, K_idx, k):
    """The indexer: a cheap score for every stored position, then keep the k best."""
    scores = np.maximum(K_idx @ q_idx, 0)        # DSA-style: tiny keys, dot products clipped at zero
    return np.argsort(scores)[-k:]               # S: the k selected positions

def sparse_attention(q, K, V, S):
    """Attention for one head that reads only the selected positions S."""
    wts = softmax(K[S] @ q / np.sqrt(len(q)))     # k scores instead of one per stored token
    return wts @ V[S]                             # weighted mix of k values

n_stored, k = 100_000, 2048
K_idx = rng.normal(size=(n_stored, 16))           # the indexer's own small key per position
K, V = rng.normal(size=(2, n_stored, 64))         # the stored keys and values of one head
S = indexer_topk(rng.normal(size=16), K_idx, k)
out = sparse_attention(rng.normal(size=64), K, V, S)
print(len(S), "of", n_stored, "entries read; output has", out.shape[0], "numbers")
# 2048 of 100000 entries read; output has 64 numbers
```

In symbols, attention at layer $\vl$ and step $\vt$ becomes

$$
\text{output} = \sum_{\vt' \in \vS_{\vt}} \text{weight}_{\vt'} \times \text{value}_{\vt'},
\qquad \underbrace{\vS_{\vt}}_{\text{chosen by the indexer}} \text{ has } \underbrace{\vk}_{2048} \text{ positions,}
$$ {#eq-landscape-sparse}

with the softmax taken over the $\vk$ selected scores only. (Random numbers stand in for real keys in the snippet, so its output means nothing; the point is the shape of the computation.)

::: aside reminder The soft lookup (III.2)
Score each stored key against the query, turn the scores into weights with a softmax, mix the stored values with those weights. Sparse attention does exactly this, on $\vk$ entries instead of all of them.
:::

::: takeaway
- An indexer scores every stored position cheaply and picks $\vk$ of them per layer per step: the set $\vS_{\vt}$.
- Attention then reads only those $\vk$ entries. In DSA, $\vk = 2048$.
:::

## What changes, and what does not {#consequences}

The figure shows a toy model with 6 layers. Slide through the decode steps and switch between dense and sparse reading.

::: figure fig-landscape-reading readingGrid wide
**Which entries one decode step reads.** Top: the stored entries of a toy model, one row per layer $\vl$ (6 layers, layer 0 at the bottom) and one column per position (up to 48). Pale cells are stored; dark cells are read at the current step. In *dense* mode every stored cell is read; in *sparse* mode each layer reads only the $\vk = 6$ positions its indexer picked (illustrative picks from a seeded generator). Bottom: entries stored and entries read per step, against the step number; the accent line marks the current step. Use the slider to move through the steps and the switch to change mode.
:::

::: try
1. In sparse mode, move the step slider slowly. The picks of each layer change only a little from step to step — remember this for [[#landscape-lucky-louis]].
2. Compare the two curves in the lower plot. In dense mode, reading grows with every step. In sparse mode it stays flat at $6 \times 6 = 36$ entries per step, while the stored count keeps climbing.
:::

Three consequences, in order of how much they matter to us.

1. **The reading per step stops growing.** Attention reads $\vk$ entries per layer, whatever the context length. The indexer still scans everything, but its scan is cheap.
2. **Everything must still be kept.** The selection drifts from step to step, and an entry skipped now may be picked later. So all entries stay available. A 128K-token GLM-5.1 request holds about 13 GB of keys and values in BF16, and sparse attention does not remove a byte of it. It changes what is *read*, not what is *kept*.
3. **The indexer announces demand in advance.** At every layer of every step, the selected set $\vS_{\vt}$ is known before any key or value is touched. Dense attention never had such a signal: it simply needed everything. Everything in this project is built on it.

::: theme access-pattern
Dense attention reads a layer's whole store in one sweep. Sparse attention reads $\vk$ entries scattered over 100,000 positions — thousands of tiny, independent fetches per step. That is the tiny-file problem of [[#tiny-files-notice-anything]] in a new setting, and it decides what any storage scheme for these entries is allowed to look like.
:::

::: aside detail Other sparse-attention designs
| design | what the selector keeps per position | what it selects |
|---|---|---|
| DSA (DeepSeek-V3.2, GLM-5.x) | one small indexer key per token | single tokens |
| NSA | one summary key per small run of tokens | runs of tokens |
| Quest (no retraining) | smallest and largest key values per page of tokens | pages of tokens |
| DeepSeek-V4 | first squeezes 4 tokens into 1 entry, then selects 512 entries (2048 tokens) | squeezed entries |

All of them name a set of positions per layer before attention touches any key or value, and all of them still need every entry kept. Designs that squeeze several tokens into one entry change what an entry is (fewer, bigger ones), not the problem. [[#papers-sparse-selectors]] looks at each.
:::

::: takeaway
- Sparse attention caps the reading per step at $\vk$ entries per layer; the storage still grows with every token.
- The indexer's picks are known before any entry is read — a precise, per-layer, per-step demand signal.
- Reading becomes thousands of small, scattered fetches: the access pattern of the tiny-file problem.
:::
