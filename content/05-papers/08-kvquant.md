---
title: KVQuant (2024)
nav: KVQuant
lede: KIVI's rulers, plus three refinements — round the keys before RoPE turns them, place the marks where the numbers are, and let the few largest numbers escape. The first one is the most useful thing in this whole Part for a lossless coder.
group: Lossy KV compression
cards:
  - q: Why are keys easier to round per channel before RoPE than after it?
    a: RoPE turns each pair of channels by an angle that grows with position, so a channel with a steady large value starts to swing
    wrong: ["RoPE adds random noise to every key", "RoPE makes all channels the same size", "RoPE only acts on values"]
    why: Before RoPE a channel can sit near 9 token after token; after RoPE the same number is shared between the two channels of its pair in proportions that change with position.
    sec: what
  - q: KVQuant's "dense-and-sparse" step stores the largest ~1 % of numbers separately. Which idea from this site is that?
    a: Escapes — rare values stored in full, with their positions, outside the fixed-width code
    wrong: ["Vector quantization with a codebook", "A KLT rotation", "Predictive coding with residuals"]
    why: The rest of the vector then needs a much narrower ruler. Fixed-length codes with an escape stream make the same trade.
    sec: what
  - q: According to KVQuant's appendix, if keys are rounded per token (not per channel), is rounding before RoPE still better?
    a: No — with per-token rulers, rounding after RoPE did better
    wrong: ["Yes, always, by a wide margin", "It makes no difference at all", "The paper did not try per-token rulers"]
    why: "LLaMA-7B, 3-bit uniform, per-token: perplexity 10.87 after RoPE versus 14.68 before (16-bit: 5.68). Pre-RoPE pays off only together with per-channel rulers."
    sec: what
  - q: If we store keys before RoPE, what changes for a lossless coder?
    a: The exact target becomes the 8-bit pre-RoPE keys, and the GPU must apply RoPE after reading them back
    wrong: ["Nothing at all; RoPE is exactly invertible in any number format", "The coder becomes lossy", "Values must also be stored before RoPE"]
    why: In floating point a rotation is not bit-exactly undone, so "store pre-RoPE" is a design choice made up front, not a free re-encoding of post-RoPE keys.
    sec: tells
  - q: Which running theme does KVQuant's non-uniform grid illustrate?
    a: The number grid is not neutral
    wrong: ["Pay once, use many times", "Which entries, versus what is inside them", "Trust, but shuffle"]
    why: Where the marks sit decides which numbers are cheap; for us the grid is fixed by the storage format (E4M3 or INT8), and it changes what prediction can save.
    sec: connections
---

Here is one pair of key [[channel|channels]], c8 and c9, for six consecutive tokens deep in a long text. [[rope|RoPE]] turns this pair together, by about 0.56 radians per token. On the left the keys before RoPE, on the right after.

| position | c8 before | c9 before | c8 after | c9 after |
|---|---|---|---|---|
| 1000 | 9.1 | 0.6 | −9.1 | −0.6 |
| 1001 | 8.8 | 0.5 | −7.2 | −5.1 |
| 1002 | 9.2 | 0.7 | −3.4 | −8.6 |
| 1003 | 9.0 | 0.6 | 1.6 | −8.9 |
| 1004 | 8.9 | 0.4 | 5.9 | −6.7 |
| 1005 | 9.1 | 0.6 | 8.8 | −2.4 |

Notice anything? Before RoPE, c8 sits at 9 like a lighthouse. After RoPE, the same 9 is shared out between c8 and c9 in proportions that change every token, and c8 swings from −9 to +9 within a few tokens. Nothing was lost — the pair still has the same length — but a ruler laid along c8 must now cover eighteen units instead of half a unit.

```python RoPE on one pair of channels (the numbers in the table)
import numpy as np
pos = np.arange(1000, 1006)                      # token positions
a = np.array([9.1, 8.8, 9.2, 9.0, 8.9, 9.1])     # channel c8 before RoPE
b = np.array([0.6, 0.5, 0.7, 0.6, 0.4, 0.6])     # channel c9 before RoPE
turn = 10000 ** (-2 * 4 / 128)                   # pair 4 of a 128-wide head
ang = pos * turn
a_rope = a * np.cos(ang) - b * np.sin(ang)       # channel c8 after RoPE
b_rope = a * np.sin(ang) + b * np.cos(ang)       # channel c9 after RoPE
print(round(turn, 2), a_rope.round(1), b_rope.round(1))
# 0.56 [-9.1 -7.2 -3.4  1.6  5.9  8.8] [-0.6 -5.1 -8.6 -8.9 -6.7 -2.4]
```

## What KVQuant does, in our words {#what}

KVQuant ([[lossy]]) starts where [[#papers-kivi|KIVI]] stops: keys rounded with one ruler per channel, values with one ruler per token. Then it makes four changes.

1. **Round the keys before RoPE.** The per-channel rulers are laid on the keys as they come out of the layer, before the position-dependent turn. RoPE is applied after the keys are read back.
2. **Put the marks where the numbers are.** Instead of evenly spaced marks, each layer gets its own 3-bit grid, fitted offline on calibration text: a one-dimensional k-means whose eight centroids are weighted by how much each number matters to the model's output. In our words, it is a tiny one-dimensional [[codebook]] per layer.
3. **Let the largest numbers escape.** In every vector, the largest ~1 % of numbers are taken out and stored in full precision with their positions. The paper calls it dense-and-sparse quantization; we know it as [[escape|escapes]]. The cut-off is per channel for keys (fixed offline) and per token for values (computed on the fly).
4. **Smaller things.** A normalisation of the grid for 2-bit runs, and — added later in the code — the first few tokens (for example 5) kept at full precision, because attention leans on them heavily.

The first change is easiest to see by sliding along RoPE's pairs. Each pair turns at its own speed, from one radian per token for the first pair to one full turn every ~54,000 tokens for the last.

::: figure fig-pb-kvq-rope pbKvqRope
**One pair of key channels, before and after RoPE, over a window of 64 tokens.** Horizontal: tokens into the window. Vertical: the key value. Lapis: the first channel of the pair before RoPE (a steady value near 9 plus a little noise, illustrative). Vermilion: the same channel after RoPE (solid) and its partner (dashed). Shaded bands: the range a per-channel ruler must cover, before (lapis) and after (vermilion). The slider picks the pair (0 turns fastest, 63 slowest, for a head of 128 channels and the usual base of 10,000); the buttons pick where in the text the window starts. The read-out gives the turn per token, the spread (standard deviation) of the channel before and after, the step of a 3-bit min–max ruler, and a rough count of the extra bits an exact per-channel code would need, $\log_2$ of the ratio of spreads.
:::

::: try
1. Pair 4, window at 1K. After RoPE the channel swings over its whole range every 11 tokens; its level averages out to 0.2 and its spread grows from 0.31 to 6.46 — roughly 4.4 more bits per number for an exact copy.
2. Slide to pair 40. The turn is slow (a full turn every ~2,000 tokens), and inside the window the channel stays steady (spread 0.31 → 0.35). Now try the start buttons: its level is +8.9 at 0, −8.9 at 1K, +8.4 at 10K and −5.6 at 100K. After RoPE this channel looks *large and slowly varying* — and wanders between +9 and −9 across the text.
3. Slide to pair 63. RoPE barely moves anything over 64 tokens; before and after look alike.
:::

The third change, escapes, is a trade you can count.

::: figure fig-pb-kvq-escape pbKvqEscape
**The 128 numbers of one vector and a 3-bit ruler.** Horizontal: value. Dots are jittered vertically only for legibility. Lapis dots are rounded to the nearest of the eight marks (dashed lines), which span the smallest to the largest kept number. Vermilion dots are escaped: stored exactly, with their position. The buttons choose the share escaped. The read-out gives the ruler step, the typical (root-mean-square) error of the kept numbers, and the cost of the escapes, counted as 16 bits of value plus 7 bits of position each, spread over 128 numbers. Illustrative data: a Laplace-shaped vector with three planted large numbers.
:::

::: try
1. No escapes: three planted numbers stretch the ruler to a step of 3.43, and the typical error of the rest is 0.85.
2. Escape 1 % (one number): the step shrinks to 2.64. Escape 2 % (three numbers): step 1.22, error 0.37, for 0.54 extra bits per number.
3. Escape 5 %: step 0.98 and error 0.28, but the escapes now cost 1.08 bits per number. The first few escapes buy the most.
:::

::: takeaway
- KVQuant keeps KIVI's ruler directions and adds: keys rounded before RoPE, a fitted non-uniform grid per layer, and ~1 % escapes per vector.
- RoPE turns a steady large channel into a swinging one; rounding before RoPE keeps the steady version.
- Escapes buy a much finer ruler for the many at the cost of storing the few in full.
:::

## What it tells us, and what it does not {#tells}

::: note numbers The numbers we use
| what | value | source |
|---|---|---|
| headline | 3 bits with ~1 % escapes: under 0.1 perplexity increase on Wikitext-2 and C4 (LLaMA, Llama-2, Llama-3, Mistral) | abstract |
| capacity | LLaMA-7B with 1M tokens of context on one 80 GB A100; 10M on 8 GPUs | abstract, README |
| kernels | about 1.7× faster than the 16-bit matrix–vector product (LLaMA-7B) | abstract |
| per-token rulers, 3-bit uniform, LLaMA-7B, Wikitext-2 | perplexity 10.87 if keys are rounded after RoPE, 14.68 before (16-bit: 5.68) | appendix table, via search excerpts |

Hooper, Kim, Mohammadzadeh, Mahoney, Shao, Keutzer and Gholami, NeurIPS 2024 (arXiv:2401.18079). The last row we could read only in search excerpts of the appendix.
:::

The last row is the subtle one. With per-token rulers, rounding *after* RoPE is better. Pre-RoPE helps only when the ruler runs along the channel — because that is exactly where RoPE does its damage.

**What it tells us.** Keys have per-channel structure that is *cleaner before RoPE*. For a lossless coder this is the single most transferable piece of advice in the lossy literature: store K before RoPE, so the simplest per-channel dictionary sees a steady channel instead of a swinging one. It also tells us that key and value numbers have heavy tails: a few numbers per vector stretch any ruler, which is the situation [[escape|escapes]] exist for.

Pair 40 of the figure adds a warning for our own measurement. After RoPE, a slow pair makes a steady channel *drift* with position: a per-block dictionary would follow it, a global one would not. Measured on post-RoPE keys, part of a block-scope gain would be RoPE — predictable from the position alone — and not neighbours being alike. Measuring before RoPE keeps the two apart.

**What it does not tell us.** How many bits the steady channel costs to store exactly. The figure's "extra bits" is our rule of thumb from [[#school-residual-shapes]] (halve the spread, save a bit), applied to a toy. The real number needs the spread of each channel *within* a block and *across* the whole text, on the 8-bit grid — measured, not inferred from perplexity.

::: note warning Where we are not convinced — and what it costs us
- **"Exact" moves.** If we store keys before RoPE, the GPU must apply RoPE after reading each key back, every step. In floating point a rotation is not undone bit for bit, so this is a choice of what the stored, exactly reproduced thing *is* — made once, up front — not a free re-encoding of post-RoPE keys. Details in [[#missed-keys-before-rope]].
- **Partial RoPE.** Many newer models turn only some channels (our proxy model among them), and latent caches keep a separate small RoPE part. The pre-/post-RoPE difference may live in fewer channels than in LLaMA.
- **"10M tokens" is a capacity claim.** It says the cache fits, not how well the model reads it at that length.
:::

::: takeaway
- Transferable: keys are steadier per channel before RoPE; store K pre-RoPE and treat keys and values separately.
- Not transferable: any number of bits. Perplexity measures tolerance, not predictability.
- Storing pre-RoPE changes what "exact" means; that cost is real and small.
:::

## Connections {#connections}

::: theme grid-matters
KVQuant spends real effort *choosing* its grid: marks where the numbers are dense, fitted per layer. We do not get to choose — the stored format (E4M3 or INT8) is the grid — but the same lesson cuts the other way: the grid decides which predictions save bits.
:::

:::: compare Two kinds of escape
::: col KVQuant's escapes
- Lossy: the kept numbers are rounded to 3 bits; escapes keep ~1 % in full.
- Cut-off per channel (keys, offline) or per token (values, online).
- Purpose: a narrower ruler, so less rounding error.
:::
::: col Escapes in a lossless fixed-length code
- Exact: every number is reproduced bit for bit.
- A value too wide for the fixed width goes to an escape stream with its position.
- Purpose: a short width for the common case. SplitZip's exponent coder works this way — see [[#papers-splitzip]].
:::
::::

- **KIVI** ([[#papers-kivi]]) gave the ruler directions; KVQuant explains part of *why* the key direction works — RoPE leaves per-channel structure intact only before it turns the pairs.
- The offline per-channel cut-offs hint that a key channel's range is stable across texts, which is what a global per-channel code captures — the baseline every dictionary must beat ([[#homework-solo-coding]]).

::: takeaway
- KVQuant's escapes are lossy cousins of the escapes in fixed-length lossless codes.
- Its grid fitting is the lossy face of "the grid is not neutral".
:::
