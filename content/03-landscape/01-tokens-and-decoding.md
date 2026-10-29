---
title: How a language model writes
nav: How a model writes
group: How a model reads its memory
lede: A language model writes a small piece of text at a time, and before every piece it looks back at everything written so far. This page names the pieces, the floors they pass through and the clock that times each step.
cards:
  - q: What is a token?
    a: The unit of text a language model reads and writes — a word or a piece of a word
    wrong: ["One letter of the alphabet", "One sentence", "One byte of the text file"]
    why: Common words are usually one token; rare words are split into several pieces. The model produces exactly one token per decode step.
    sec: tokens
  - q: 'A request holds a context of $\vL = 100{,}000$ tokens in a model with $\vNL = 78$ layers. How many (token, layer) cells has it stored?'
    a: 7.8 million
    wrong: ["100,000", "178,000", "78"]
    why: 'Every token leaves something behind at every layer: $\vNL \times \vL = 78 \times 100{,}000 = 7.8$ million cells.'
    sec: layers
  - q: What happens in prefill, and what in decode?
    a: Prefill reads the whole prompt at once; decode then writes the answer one token per step
    wrong: ["Prefill writes the answer; decode reads the prompt", "Both read the prompt one token at a time", "Prefill compresses the prompt; decode decompresses it"]
    why: Prefill can work on all prompt tokens in parallel. Decode is sequential, because each new token depends on the one before.
    sec: decode
  - q: 'With a time per output token ($\vtpot$) of 30 ms, roughly how many tokens per second does one request get?'
    a: About 33
    wrong: ["About 3", "About 300", "About 30,000"]
    why: '1 s ÷ 0.030 s ≈ 33 tokens per second, for each request.'
    sec: decode
  - q: In decode, what does each new step have to look back at?
    a: What every earlier token left behind, at every layer
    wrong: ["Only the token just before it", "Only the prompt, not the answer so far", "Nothing — each step starts fresh"]
    why: That growing pile of stored material is the subject of the next three pages, where it gets its proper name (the KV cache).
    sec: decode
---

Type "The weather on Gull Rock is" into your phone and it will suggest a next word. *Foggy*, perhaps, or *grey*. Accept the suggestion and it suggests another. A large language model does exactly this, with a far better sense of what comes next. It never writes a whole sentence at once. It writes one small piece, adds it to the text, and asks itself again: what comes next?

Everything this project worries about comes from that loop. So we go through it slowly, and fix a word for each part as we go.

## Tokens {#tokens}

The pieces a model reads and writes are called [[=token|tokens]]. A token is a word, or a piece of a word. Common words are one token each; rare words get split. Here is how a tokenizer might cut our sentence:

| position $\vt$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| token | `The` | `␣weather` | `␣on` | `␣Gull` | `␣Rock` | `␣is` | `␣fog` | `gy` |

(The split is illustrative; every model has its own tokenizer, and the space usually travels with the word that follows it.)

Each token has a **position** $\vt$, counted from 0. The model's [[vector]] for a token (its working list of numbers) is built from two things: which token it is, and where it sits.

The number of tokens a request holds is its **context length** $\vL$. The prompt counts, and so does everything the model has written so far. Real requests are long:

- a chat message: a few hundred tokens;
- a long document, or an hour of a coding agent's work: tens of thousands;
- the trace this site leans on later: $\vL \approx 100{,}000$ tokens, roughly a 300-page book.

::: takeaway
- A token is a word or a piece of a word; position $\vt$ counts tokens from 0.
- The context length $\vL$ is how many tokens one request holds. In our reference numbers it is about 100,000.
:::

## Layers {#layers}

A token's vector does not become a prediction in one go. It is refined in a stack of identical-looking stages called [[=layer|layers]]. Each layer reads the vector, adds a little understanding to it, and passes it up. There are $\vNL$ layers, numbered by $\vl$ from 0 to $\vNL - 1$.

::: note intuition Floors of a building
Picture a building with $\vNL$ floors. Each token is a visitor who enters at the ground floor and climbs. On every floor someone adds a note to the visitor's file. At the top the file is complete, and the model reads off its guess for the next token.
:::

The important part for us: **on every floor, each token leaves something behind.** Later tokens will come back to look at it (the next page says why and how). So a request with $\vL$ tokens has left material in

$$
\underbrace{\vNL}_{\text{floors}} \times \underbrace{\vL}_{\text{tokens}} \quad \text{cells}
$$ {#eq-landscape-cells}

and each cell is a vector of a few hundred numbers. Two models will keep coming back on this site:

| model | layers $\vNL$ | role on this site |
|---|---|---|
| GLM-5.1, a large production model | 78 | source of the [[#landscape-reference-setting\|reference numbers]] |
| Qwen3.5-2B, a small open model | 24 (6 of them look back at every token) | the stand-in we can measure ([[#plan-data]]) |

With $\vNL = 78$ and $\vL = 100{,}000$, one request has left behind 7.8 million cells. Hold on to that number.

::: takeaway
- A model is a stack of $\vNL$ layers; layer $\vl$ refines each token's vector and passes it up.
- Every token leaves something at every layer, so a request accumulates $\vNL \times \vL$ cells — millions of them.
:::

## Prefill, then decode {#decode}

A request runs in two phases, called [[=prefill-decode|prefill and decode]].

:::: compare Two phases of one request
::: col Prefill
- Reads the whole prompt **at once**.
- All prompt tokens climb the floors together, in parallel.
- Leaves the prompt's cells at every layer.
- Happens once per request.
:::
::: col Decode
- Writes the answer **one token per step**.
- Each step: one new token climbs all $\vNL$ floors, and on every floor it looks back at the cells of all earlier tokens.
- Adds one new cell per layer.
- Repeats until the answer is done — thousands of steps.
:::
::::

Decode is the phase this whole site is about. It is sequential: step $\vt + 1$ needs the token written at step $\vt$. And every step looks back at more material than the one before.

::: figure fig-landscape-decode decodeGrid wide
**Prefill and decode on a toy model with 4 layers.** Columns are token positions $\vt$ (the tokens are written underneath), rows are layers $\vl$ (layer 0 at the bottom). A filled cell is the material one token left at one layer. Step through: the first step is prefill, which fills the six prompt columns at once; each later step is one decode step, which adds one column (outlined in the accent colour). The cells the new token looks back at during that step are tinted. The read-out counts cells stored and cells looked at in the current step.
:::

::: try
1. Step to the end and compare the last two read-outs. How many more cells does the last step look at than the one before?
2. Imagine 100,000 columns and 78 rows. Each decode step looks at every cell to its left, on every row.
:::

How long may one step take? The time a request waits for each new token is the [[=tpot|time per output token]], written $\vtpot$. In the deployment we use for reference numbers it is 30 ms: about 33 tokens per second, a little faster than most people read.

::: keycard The clock of decoding
$$
\vtpot \approx 30\ \text{ms per decode step}
$$

Everything one step needs — every number read, every byte moved — must fit into this window, for every request the machine serves at once.
:::

::: takeaway
- Prefill reads the prompt in one go; decode then writes one token per step.
- Every decode step looks back at what all earlier tokens left on every layer, so the pile it consults grows with every step.
- The step time $\vtpot$ (30 ms in our reference numbers) is the budget everything else must fit into.
:::
