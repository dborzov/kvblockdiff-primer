---
title: Dictionary, delta, block — precisely
nav: Dictionary, delta, block
lede: Three objects carry the whole proposal. This page pins each one down with a size in bytes, so that every later argument can be done with arithmetic instead of adjectives.
group: The idea
cards:
  - q: 'Token $\vt = 13$ in a history cut into blocks of $\vb = 4$ tokens belongs to which block?'
    a: Block 3
    wrong: ["Block 4", "Block 13", "Block 1"]
    why: 'Block $\vj$ holds tokens $\vj\vb$ to $(\vj+1)\vb - 1$, so $\vj = \lfloor 13/4 \rfloor = 3$ (tokens 12–15).'
    sec: block
  - q: Why does this site call the block "a knob, not a property"?
    a: Because we choose its size b; the data only tells us which sizes would work well
    wrong: ["Because blocks are fixed by the model architecture", "Because blocks only exist in the indexer", "Because the GPU decides the block size at run time"]
    why: 'Defining the hypothesis as "entries are similar within a block" would bake our design choice into the science. The data has distances, not blocks.'
    sec: block
  - q: 'A dictionary has weight $\vw = 32$ and entries are $\ve = 640$ bytes. How big is it?'
    a: 20,480 bytes (20 KiB)
    wrong: ["32 bytes", "640 bytes", "2,048 bytes"]
    why: 'Weight is size in entries’ worth: $\vDsz = \vw\,\ve = 32 \times 640$ bytes.'
    sec: dictionary-weight
  - q: 'For 8-bit storage, a delta ratio $\vrho = 0.75$ means…'
    a: A miss moves 480 instead of 640 bytes — 6 bits per element instead of 8
    wrong: ["Each entry loses 25 % of its precision", "75 % of misses become hits", "The dictionary is 75 % of the block"]
    why: '$\vrho = \vdsz/\ve$, and for 8-bit elements $\vrho$ = (bits per element) / 8. The coding is lossless, so nothing is lost.'
    sec: delta-ratio
  - q: Where are dictionaries and deltas made, and where are they decoded?
    a: Made once, offline, when the history is written to host memory; decoded on the GPU at miss time
    wrong: ["Made on the GPU at every step; decoded on the CPU", "Made during training; decoded at prefill", "Made by the indexer; decoded by the hot cache"]
    why: Encoding may be slow (it happens once per block); decoding must be fast, because it sits on the miss path of every decode step.
    sec: delta-ratio
---

"Should the first experiment use 128K-token blocks or 64K?" That was a real question in the first draft of this idea. It sounds like a question about the data, as if the history came pre-cut into blocks and we only had to find out how long they are.

It does not. A block is something we cut, with a size we pick. Getting that straight is the first of three definitions on this page, and the one with the most consequences.

## The block: a knob, not a fact {#block}

Take one request and one [[layer]]. Its history is a row of [[entry|entries]], one per [[token]], numbered by position $\vt = 0, 1, 2, \dots$ Now cut the row every $\vb$ tokens.

::: define block
- **What it is:** $\vb$ consecutive entries of one request at one layer. We call $\vb$ the **block size** and number the blocks $\vj = 0, 1, 2, \dots$
- **Example:** with $\vb = 4$, block 3 holds tokens 12, 13, 14 and 15. In the [[reference-setting]], a 100K-token request cut into blocks of $\vb = 4096$ has 25 blocks per layer.
- **Easy to confuse with:** a property of the data. Nothing in a KV cache says "a block ends here". The block is a knob of *our algorithm*; the data can only tell us which settings of the knob would pay off.
:::

Which block does token $\vt$ live in? Integer division answers it:

$$
\vj \;=\; \Big\lfloor \underbrace{\vt / \vb}_{\text{position} \,\div\, \text{block size}} \Big\rfloor, \qquad \text{block } \vj \text{ holds tokens } \vj\vb \;\dots\; (\vj+1)\vb - 1 .
$$ {#eq-idea-block-index}

::: figure fig-idea-block-knob blockKnob
**One toy history of 32 tokens, cut into blocks.** Each small tile is one entry (one token at one layer), numbered by its position $\vt$. Dashed frames are blocks; the solid, tinted frame is the block that holds the chosen token. Choose the block size $\vb$ with the buttons and the token with the slider (or click a tile); the readout shows the block index $\vj = \lfloor \vt / \vb \rfloor$, the token's place inside its block, and how many blocks the history has.
:::

::: try
1. Keep $\vt = 13$ and step $\vb$ from 1 to 32. The token never moves; only the frame around it changes.
2. At $\vb = 32$ the whole history is one block. That is the case of the first draft's "128K-token block" in a 100K-token request: it is not a block at all, it is the request ([[#homework-scope]] gives that case its own name).
:::

Why insist? Because the hypothesis this project tests ([[#idea-fallen-apple]]) is about *distance between tokens*. If it were phrased as "entries are alike within a block", our choice of $\vb$ would be smuggled into the science. Phrased as distance, the data can tell us which $\vb$ to choose.

::: takeaway
- A block is $\vb$ consecutive entries of one request at one layer; token $\vt$ lives in block $\vj = \lfloor \vt/\vb \rfloor$.
- The block size is a knob we set, not a fact we discover.
:::

## The dictionary and its weight {#dictionary-weight}

Each block $\vj$ gets its own [[dictionary]], $\vD_{\vj}$: a small set of numbers fitted on that block's entries. What kind of numbers is the subject of Part VI. Three kinds will do for now:

- the typical value and spread of each [[channel]] in the block — two numbers per channel;
- a handful of directions in which the block's entries vary most (a partial [[klt]] basis);
- a few hundred representative entries ([[centroid|centroids]] of a [[codebook]]).

To compare dictionaries with entries, we measure them in entries' worth. That number is the [[=weight|dictionary weight]], $\vw$:

$$
\vDsz \;=\; \underbrace{\vw}_{\text{weight: entries' worth}} \times \underbrace{\ve}_{\text{bytes per entry}} .
$$ {#eq-idea-dict-size}

The typical-value-and-spread dictionary has two numbers per channel, as big as two entries: $\vw = 2$. A 16-direction basis stored in 16-bit numbers weighs $\vw = 32$. A 256-centroid codebook weighs $\vw = 256$. In the reference setting, where $\ve = 640$ bytes, those are 1.25 KiB, 20 KiB and 160 KiB.

::: aside reminder Entry size and the reference setting
An [[entry]] $\vE_{\vl,\vt}$ is all the key and value numbers of token $\vt$ at layer $\vl$. In the [[reference-setting]] it holds $\vd = 640$ numbers of 8 bits each, so $\ve = 640$ bytes ([[#landscape-kv-cache]], [[#landscape-reference-setting]]).
:::

::: takeaway
- $\vD_{\vj}$ is block $\vj$'s dictionary; its weight $\vw$ is its size in entries' worth: $\vDsz = \vw\,\ve$.
- Light dictionaries weigh a couple of entries; heavy ones, hundreds.
:::

## The delta and its ratio {#delta-ratio}

Given $\vD_{\vj}$, each entry $\vt$ of the block is stored as its [[delta]] $\vdelta_{\vt}$: the bytes needed to rebuild $\vE_{\vt}$ exactly. In the language of Part II, it is the coded [[residual]] after a [[prediction]] made from the dictionary, plus any small per-entry extras. The one number that says how much a miss shrinks is the [[=delta-ratio|delta ratio]]:

$$
\vrho \;=\; \frac{\vdsz}{\ve} \;=\; \frac{\text{bits per element after coding}}{8} \qquad \text{(8-bit storage)} .
$$ {#eq-idea-rho}

$\vrho = 1$ is no gain at all. $\vrho = 0.75$ means a delta of 480 bytes instead of a 640-byte entry, or 6 bits per element instead of 8. Smaller is better, and nothing is lost either way: the GPU rebuilds the original bit for bit.

All three objects can be seen at work on the toy history of [[#idea-mapping]], cut into blocks of $\vb = 32$. Its dictionary is the lightest kind of the list above: per element, a typical value and the width of the deltas.

::: dataset fig-idea-toy-dict idea-history view=leftovers,heat hl=b2 metrics=dict,widths,rho,shape
**One block dictionary and its deltas, on the toy history** ([[#fig-idea-toy-history]] again). *Dictionary and deltas:* four of the eight elements over the 128 entries (dots); the gold line in each block is that element's typical value in $\vD_{\vj}$; each stick is an entry's leftover from it, which the delta stores; the label over each block is the fixed width of those leftovers, in bits. *The entries:* the whole history as a grid (colour = stored number). The highlight marks block 2. *Numbers:* block 0's dictionary, the delta size block by block, and $\vrho$. Synthetic, seeded; built so that neighbours are alike.
:::

Read it as the three definitions in action.

- **The block** is just where the dashed lines fall. Move them and the gold lines move with them; the dots stay put.
- **The dictionary** $\vD_0$ holds 8 typical values and 8 widths: 16 bytes, two entries' worth, so $\vw = 2$.
- **The delta** of an entry in block 0 is its 8 leftovers at those widths: 44 bits instead of 64. Over the four blocks the toy's $\vrho$ is 0.68.

The large element c0 needs only 3 or 4 bits per delta, the others 5 to 7: a steady channel is cheap once its typical value is known. The toy was built to make the bet come true, so its 0.68 shows how $\vrho$ is computed, not what real caches would give.

| object | symbol | size in bytes | example, $\ve = 640$ B |
|---|---|---|---|
| entry | $\vE_{\vt}$ | $\ve$ | 640 B |
| dictionary of block $\vj$ | $\vD_{\vj}$ | $\vDsz = \vw\,\ve$ | 1.25 KiB at $\vw = 2$; 160 KiB at $\vw = 256$ |
| delta of entry $\vt$ | $\vdelta_{\vt}$ | $\vdsz = \vrho\,\ve$ | 480 B at $\vrho = 0.75$ (assumed) |

Where do these objects come from? Blocks, dictionaries and deltas are made **once, offline**, when a request's history is written to host memory — after [[prefill-decode|prefill]], or as generated tokens are written through. That step may be slow. Decoding happens **on the GPU, at miss time**, inside a decode step, and must be fast. This asymmetry shapes everything in [[#idea-data-layout]].

::: note warning Assumed, not measured
Every $\vrho$ on these pages is an assumption chosen to make the arithmetic concrete. The only published anchor is context-free coding of 8-bit KV, worth about 1.1–1.3× ([[#papers-splitzip]]). Whether dictionaries push $\vrho$ much lower is exactly what nobody knows yet.
:::

::: takeaway
- $\vdelta_{\vt}$ rebuilds entry $\vt$ exactly given $\vD_{\vj}$; it is $\vdsz = \vrho\,\ve$ bytes.
- $\vrho$ = bits per element ÷ 8 for 8-bit storage. Smaller is better; lossless either way.
- Encode once, offline and possibly slowly; decode on the GPU at miss time, fast.
:::
