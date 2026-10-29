---
title: 'Attention: looking back'
nav: Attention
group: How a model reads its memory
lede: Before writing each token, the model consults what earlier tokens left behind. The consultation is a soft lookup — every stored item gets a weight, and the answer is a weighted mix. This page builds it from three numbers up.
cards:
  - q: In attention, what is compared with what?
    a: The new token's query is compared with the key of every stored token
    wrong: ["The new token's value is compared with every stored value", "Each stored key is compared with every other stored key", "The query is compared with the values"]
    why: 'The score of stored token $\vt$ is the dot product $\vq \cdot \text{key}_{\vt}$. The values are only used afterwards, mixed by the weights.'
    sec: soft-lookup
  - q: Scores 1, 2 and 3 go into a softmax. Roughly what weights come out?
    a: 9 %, 24 % and 67 %
    wrong: ["17 %, 33 % and 50 %", "0 %, 0 % and 100 %", "33 %, 33 % and 33 %"]
    why: 'Softmax exponentiates and normalises: $e^1, e^2, e^3 = 2.7, 7.4, 20.1$, divided by their sum 30.2.'
    sec: soft-lookup
  - q: You double the length of the query, keeping its direction. What happens to the attention weights?
    a: They become more concentrated on the best-matching keys
    wrong: ["They stay exactly the same", "They all double", "They become more even"]
    why: All scores double, and softmax turns bigger score gaps into much bigger weight ratios. Scores 2, 4, 6 give 2 %, 12 %, 87 %.
    sec: soft-lookup
  - q: A layer has 8 query heads and 2 key/value heads (grouped-query attention). How many key vectors does one token store at that layer?
    a: 2 — one per key/value head
    wrong: ["8 — one per query head", "16 — one per query head and key/value head", "1 — one per layer"]
    why: With GQA, groups of query heads share one key/value head. Only the key/value heads are stored, so the cache is 4× smaller than with 8 of them.
    sec: heads
  - q: In the decode loop, which line makes the stored memory grow with every step?
    a: Appending the new token's key and value to the layer's lists
    wrong: ["The softmax", "Adding the layer's answer to the hidden state", "Splitting the query into heads"]
    why: Every step, at every layer, one more key and one more value are appended — and never removed.
    sec: loop
---

The model is about to write the next word of *"The weather on Gull Rock is foggy, and the …"*. Which earlier words should it think about? *Weather* and *foggy*, surely; perhaps *Gull Rock*. Hardly *on* or *The*.

[[=attention|Attention]] is the mechanism that decides, for every new token, which earlier tokens to consult and how much. It happens inside every [[layer]], at every step. It is also the reason the model must keep material from every earlier token around.

## A soft lookup {#soft-lookup}

Think of an ordinary lookup first. A Python dictionary maps a key to a value: ask for `"fog"`, get exactly the value stored under `"fog"`. Attention softens this in three ways.

1. **Every stored token has a key and a value.** Both are [[vector|vectors]]. The key is a label that says *what this token is about*; the value is *what it has to contribute*.
2. **The new token asks a question**, its query vector $\vq$. Every key gets a **score**: how well it matches the query, measured by the dot product (multiply element by element, add up).
3. **The scores become weights, and the answer is a weighted mix of all values.** Nothing is picked outright; everything contributes a little, the good matches a lot.

The function that turns scores into weights is the **softmax**: apply the exponential function to each score (raise Euler's number, 2.718…, to that power; the plain $e$ in these formulas is that number, not the entry size $\ve$), then divide by the total, so the weights are positive and add up to 1.

$$
\begin{aligned}
\text{score}_{\vt} &= \underbrace{\vq \cdot \text{key}_{\vt}}_{\text{how well it matches}} \\[4pt]
\text{weight}_{\vt} &= \frac{e^{\,\text{score}_{\vt}}}{\sum_{\vt'} e^{\,\text{score}_{\vt'}}} \\[4pt]
\text{output} &= \sum_{\vt} \underbrace{\text{weight}_{\vt}}_{\text{how much to listen}} \times \underbrace{\text{value}_{\vt}}_{\text{what } \vt \text{ says}}
\end{aligned}
$$ {#eq-landscape-attention}

The sums run over all stored positions $\vt'$ and $\vt$. (Real models also divide each score by the square root of the key's length, to keep scores in a sensible range. It changes nothing in the story.)

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

Now do it with your hands. The figure has eight stored tokens, each with a two-number key.

::: figure fig-landscape-attention attentionToy
**Attention as a soft lookup, in two dimensions.** Top: each coloured dot is the key of one stored token (labelled with its token), drawn as a point in the plane; the accent knob is the query $\vq$, and the line from the centre shows its direction and length. Bottom left: the score of each key, the dot product of query and key. Bottom right: the softmax weights, which add up to 100 %. The stacked bar shows the output as a mix of the eight values, in the same colours. Keys and query are illustrative numbers; real keys have a few hundred elements.
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

## Many heads at once {#heads}

One lookup per layer would be a narrow view. So each layer runs several lookups side by side, called [[=head|heads]]. Each head has its own query and works on its own slice of the keys and values. One head might follow the subject of the sentence; another, the last number mentioned. (Such stories about individual heads are mostly guesses; what matters here is that there are several.)

Keys and values are what the model keeps, so they are what costs memory. Modern models save memory by letting several query heads **share** one key/value head. This is **grouped-query attention (GQA)**. We number the key/value heads of a layer by $\vh$.

:::: compare One key/value head per query head, versus shared ones
::: col Classic: 8 query heads, 8 key/value heads
- Each query head has its own keys and values.
- Per token per layer: 8 keys and 8 values stored.
:::
::: col GQA: 8 query heads, 2 key/value heads
- Query heads 0–3 read key/value head $\vh = 0$; heads 4–7 read $\vh = 1$.
- Per token per layer: 2 keys and 2 values stored — **4× less memory**.
:::
::::

Qwen3.5-2B, the small model this project plans to measure, uses exactly 2 key/value heads per layer, each 256 numbers wide.

::: takeaway
- A layer runs several attention heads in parallel; with GQA, groups of query heads share one key/value head $\vh$.
- Only key/value heads are stored, so GQA shrinks the stored memory by the sharing factor.
:::

## The decode loop in Python {#loop}

Here is one decode step of a toy model, written to show where memory is kept and read. It runs as printed (with the toy weights in the sidebar), using numpy.

::: aside detail The toy model's weights
```python setup for the decode step below
import numpy as np
rng = np.random.default_rng(0)
# hidden width, layers, query heads, key/value heads, head width
WIDTH, N_LAYERS, N_Q, N_KV, HEAD_W = 64, 4, 8, 2, 16
Wq = rng.normal(0, WIDTH**-0.5, (N_LAYERS, WIDTH, N_Q * HEAD_W))
Wk = rng.normal(0, WIDTH**-0.5, (N_LAYERS, WIDTH, N_KV * HEAD_W))
Wv = rng.normal(0, WIDTH**-0.5, (N_LAYERS, WIDTH, N_KV * HEAD_W))
Wo = rng.normal(0, (N_Q * HEAD_W)**-0.5, (N_LAYERS, N_Q * HEAD_W, WIDTH))

def softmax(s):
    e = np.exp(s - s.max())
    return e / e.sum()
```
:::

```python one decode step of a toy GQA model, written to expose the stored keys and values
def decode_step(x, keys, values):
    """x: the new token's hidden state.
    keys[l], values[l]: what earlier tokens left at layer l."""
    for l in range(N_LAYERS):
        # this token's queries (one per query head), key and value
        q = (x @ Wq[l]).reshape(N_Q, HEAD_W)
        key = (x @ Wk[l]).reshape(N_KV, HEAD_W)
        val = (x @ Wv[l]).reshape(N_KV, HEAD_W)
        # the stored memory grows by one token per layer
        keys[l].append(key); values[l].append(val)
        K, V = np.stack(keys[l]), np.stack(values[l])  # [tokens, N_KV, HEAD_W]
        out = []
        for qh in range(N_Q):
            h = qh // (N_Q // N_KV)  # GQA: heads 0-3 -> KV head 0, 4-7 -> 1
            # one weight per stored token: this reads EVERY stored key
            wts = softmax(K[:, h] @ q[qh] / np.sqrt(HEAD_W))
            out.append(wts @ V[:, h])      # weighted mix of the stored values
        # the layer's answer is added to the hidden state
        x = x + np.concatenate(out) @ Wo[l]
        # (a feed-forward block follows; it never looks back, so we skip it)
    return x

keys = [[] for _ in range(N_LAYERS)]
values = [[] for _ in range(N_LAYERS)]
for t in range(5):            # five steps; random vectors stand in for tokens
    x = decode_step(rng.normal(size=WIDTH), keys, values)
print(len(keys[0]), keys[0][0].shape)
# 5 (2, 16): five tokens stored, each key 2 heads x 16 numbers
```

Three lines carry the whole story of this site.

- **`keys[l].append(key); values[l].append(val)`** — at every layer, every step adds one more key and one more value, and nothing is ever removed.
- **`K[:, h] @ q[qh]`** — the query is scored against *every* stored key of the layer. The work of a step grows with the number of tokens stored.
- **`wts @ V[:, h]`** — every stored value is read too, if only to be multiplied by a tiny weight.

The next page gives this ever-growing store its name and looks inside one of its pieces.

::: takeaway
- Each decode step, at each layer: compute this token's query, key and value; store the key and value; score the query against all stored keys; mix all stored values.
- Storage grows by one key and one value per layer per token; the reading work grows with everything stored.
:::
