---
title: How an LLM writes
nav: How an LLM writes
group: The LLM
lede: An LLM writes one small piece of text at a time, and before every piece it looks back at everything written so far. This page names the pieces, the layers they pass through, the vector that carries them, and the clock that times each step.
cards:
  - q: What is a token?
    a: The unit of text an LLM reads and writes, a word or a piece of one; its position in the sequence is `token_pos_id`
    wrong: ["One letter of the alphabet", "One sentence", "One byte of the text file"]
    why: Common words are usually one token; rare words are split into pieces. An LLM produces exactly one token per decode step, at position `token_pos_id`.
    sec: tokens
  - q: What is a sequence on this site?
    a: One conversation's tokens as the LLM sees them, from its first token to now
    wrong: ["The order in which cherries are stored", "One decode step", "The LLM's list of layers"]
    why: A sequence is one LLM context. A serving system runs many sequences at once, and each grows its own orchard.
    sec: tokens
  - q: 'Qwen3.5-2B has 24 layers. How many of them are KV layers?'
    a: '6: only those keep keys and values for every token, and only they get a `layer_id` in the orchard'
    wrong: ["24", "12", "1"]
    why: 'The other 18 layers carry a fixed-size state and have nothing per token to store. `layer_id` counts KV layers only: 0 … 5.'
    sec: layers
  - q: What happens in prefill, and what in decode?
    a: Prefill reads the whole prompt at once; decode then writes the answer one token per step
    wrong: ["Prefill writes the answer; decode reads the prompt", "Both read the prompt one token at a time", "Prefill compresses the prompt; decode decompresses it"]
    why: Prefill can work on all prompt tokens in parallel. Decode is sequential, because each new token depends on the one before.
    sec: decode
  - q: 'With a time per output token of 30 ms, roughly how many tokens per second does one sequence get?'
    a: About 33
    wrong: ["About 3", "About 300", "About 30 000"]
    why: '1 s ÷ 0.030 s ≈ 33 tokens per second, for each sequence the machine serves.'
    sec: decode
---

Type "The weather on Gull Rock is" into your phone and it suggests a next word. *Foggy*, perhaps, or *grey*. Accept the suggestion and it suggests another. A large LLM does exactly this, with a far better sense of what comes next. It never writes a whole sentence at once. It writes one small piece, adds it to the text, and asks itself again what comes next.

Everything this project worries about comes from that loop. So this Part goes through it slowly, in Python, and fixes a word and a shape for each part as it goes.

## Tokens and the sequence {#tokens}

The pieces an LLM reads and writes are [[=token|tokens]]. A token is a word, or a piece of a word. Common words are one token each; rare words get split. Here is how a tokenizer might cut the sentence, with each token's position:

| `token_pos_id` | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| token | `The` | `␣weather` | `␣on` | `␣Gull` | `␣Rock` | `␣is` | `␣fog` | `gy` |

(The split is illustrative; every tokenizer cuts differently, and the space usually travels with the word that follows it.)

```python a sequence is a list of tokens; its length so far is n_tokens
tokens = ["The", " weather", " on", " Gull", " Rock", " is", " fog", "gy"]
n_tokens = len(tokens)                    # 8 so far; token_pos_id runs 0 … n_tokens-1
token_pos_id = 6                          # " fog"
```

Each token has a position, `token_pos_id`, counted from 0; in equations it is $\vt$. The list of all tokens one conversation has seen, from its first token to the one being written now, is a [[=sequence]]. A serving system runs many sequences at once, and each one is its own context. (On this site "sequence" never means the order of anything else.) The number of tokens a sequence holds is its **context length**, $\vL$: the prompt counts, and so does everything the LLM has written since. In the setting selected now a sequence holds [[@L]] tokens; a chat message is a few hundred, an hour of a coding agent's work is tens of thousands, and the two sequences this site leans on are 100 384 tokens (GLM-5.1, HiSparse's trace) and about 225 000 tokens (Qwen3.5-2B, the campaigns' transcripts).

The thing doing the writing is [[=llm|the LLM]], and on this site it is always named, because two of them appear and their shapes differ at every turn: **GLM-5.1**, a large production LLM, and **Qwen3.5-2B**, a small open one that can be measured on a desk.

::: takeaway
- A token is a word or a piece of one; `token_pos_id` counts tokens from 0.
- A sequence is one conversation's tokens so far; its context length is $\vL$, about 100K and 225K tokens in the two settings.
- The LLM is always named: GLM-5.1 or Qwen3.5-2B.
:::

## Layers and the hidden state {#layers}

A token's list of numbers does not become a prediction in one go. It is refined in a stack of stages called [[=layer|layers]], each numbered by `layer_id`. Each layer reads the vector, adds a little understanding, and passes it up. The vector that climbs is the token's [[=hidden-state|hidden state]], `x`:

```python one token climbs the layers
x = embed(token) + position_signal(token_pos_id)   # the hidden state: shape (d_model,)
for layer_id in range(n_layers):
    x = layers[layer_id](x, ...)                      # each layer refines the hidden state
next_token = sample(x @ W_out)                        # the top layer's x becomes the guess
```

::: note intuition Floors of a building
Picture a building with one floor per layer. Each token is a visitor who enters at the ground floor and climbs. On every floor someone adds a note to the visitor's file. At the top the file is complete, and the LLM reads off its guess for the next token.
:::

The important part for us: **on every floor, a token leaves something behind.** Later tokens will come back to look at it (the next page says why and how). In most LLMs every layer does this. In *hybrid* LLMs only some layers do, and those are the [[=kv-layer|KV layers]]: the layers that keep a key and a value for every token. The other layers carry a fixed-size state and have nothing per token to store. The `layer_id` of the orchard counts KV layers only, and $\vNL$ is their number.

| the LLM | layers | KV layers $\vNL$ | role on this site |
|---|---|---|---|
| GLM-5.1 | 78 | 78 (every layer) | the deployment the numbers are pinned to ([[#landscape-reference-settings]]) |
| Qwen3.5-2B | 24 | 6 (its layers 3, 7, 11, 15, 19, 23 are `layer_id` 0 … 5) | the one the campaigns measured ([[#measured-the-data]]) |

So a sequence of $\vL$ tokens has left material in

$$
\underbrace{\vNL}_{\text{KV layers}} \times \underbrace{\vL}_{\text{tokens}} \quad \text{cells},
$$ {#eq-landscape-cells}

each cell a vector of a few hundred numbers. On the Pin, $78 \times 100\,384 \approx 7.8$ million cells; on the Bench, $6 \times 225\,000 \approx 1.35$ million. Hold on to those numbers.

::: takeaway
- The hidden state `x` is the vector a token carries between layers; each layer refines it.
- A KV layer keeps something per token; `layer_id` counts KV layers only: 78 on the Pin, 6 of Qwen3.5-2B's 24 on the Bench.
- A sequence has left $\vNL \times \vL$ cells behind: millions of them.
:::

## Prefill, then decode {#decode}

A sequence runs in two phases, [[=prefill-decode|prefill and decode]].

:::: compare Two phases of one sequence
::: col Prefill
- Reads the whole prompt **at once**.
- All prompt tokens climb the layers together, in parallel.
- Leaves the prompt's cells at every KV layer.
- Happens once per sequence.
:::
::: col Decode
- Writes the answer **one token per step**.
- Each step: one new token climbs all the layers, and at every KV layer it looks back at the cells of all earlier tokens.
- Adds one new cell per KV layer.
- Repeats until the answer is done: thousands of steps.
:::
::::

Decode is the phase this whole site is about. It is sequential: step $\vt + 1$ needs the token written at step $\vt$. And every step looks back at more material than the one before.

::: figure fig-landscape-decode decodeGrid wide
**Prefill and decode on a toy LLM with 4 KV layers.** Columns are token positions `token_pos_id` (the tokens are written underneath), rows are `layer_id` (layer 0 at the bottom). A filled cell is the material one token left at one layer. Step through: the first step is prefill, which fills the six prompt columns at once; each later step is one decode step, which adds one column (outlined in the accent colour). The cells the new token looks back at during that step are tinted. The read-out counts cells stored and cells looked at in the current step.
:::

::: try
1. Step to the end and compare the last two read-outs. How many more cells does the last step look at than the one before?
2. Imagine 100 384 columns and 78 rows. Each decode step looks at every cell to its left, on every row.
:::

How long may one step take? The time a sequence waits for each new token is the [[=tpot|time per output token]], $\vtpot$. In the deployment the Pin is built on it is 30 ms: about 33 tokens per second, a little faster than most people read. In the setting selected now it is [[@tpot]] (the Bench has no decode loop, so it has no step time).

::: keycard The clock of decoding
$$
\vtpot \approx 30\ \text{ms per decode step on the Pin}
$$

Everything one step needs, every number read and every byte moved, must fit into this window, for every sequence the machine serves at once.
:::

::: takeaway
- Prefill reads the prompt in one go; decode then writes one token per step.
- Every decode step looks back at what all earlier tokens left at every KV layer, so the pile it consults grows with every step.
- The step time $\vtpot$ (30 ms on the Pin) is the budget everything else must fit into.
:::
