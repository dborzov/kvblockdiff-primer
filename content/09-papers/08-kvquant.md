---
title: KVQuant (2024)
nav: KVQuant
group: Lossy KV compression
lede: KIVI's rulers plus three refinements. Round the keys before RoPE turns them, place the marks where the numbers are, and let the few largest numbers escape. The first one is the most useful thing in this Part for a lossless compressor.
cards:
  - q: Why are keys easier to round per furrow before RoPE than after it?
    a: RoPE turns each pair of elements by an angle that grows with position, so a furrow with a steady large value starts to swing
    wrong: ["RoPE adds random noise to every key", "RoPE makes all furrows the same size", "RoPE only acts on values"]
    why: Before RoPE a furrow can sit near 9 token after token; after RoPE the same number is shared between the two elements of its pair in proportions that change with position.
    sec: idea
  - q: Which fact does KVQuant take over from KIVI as known?
    a: Keys have large persistent furrows and values do not, so keys get per-furrow rulers and values per-cherry rulers
    wrong: ["Keys repeat every 32 tokens", "Values are bell-shaped with no outliers", "RoPE can be undone exactly in floating point"]
    why: The ruler directions are inherited; KVQuant's contributions are pre-RoPE rounding, a fitted grid and escapes on top.
    sec: assume
  - q: According to KVQuant's appendix, if keys are rounded per cherry (not per furrow), is rounding before RoPE still better?
    a: No; with per-cherry rulers, rounding after RoPE did better
    wrong: ["Yes, always, by a wide margin", "It makes no difference at all", "The paper did not try per-cherry rulers"]
    why: 'LLaMA-7B, 3-bit uniform, per-token in their words: perplexity 10.87 after RoPE versus 14.68 before (16-bit: 5.68). Pre-RoPE pays off only together with per-furrow rulers.'
    sec: show
  - q: KVQuant's "dense-and-sparse" step stores the largest ~1 % of numbers separately. Which idea from this site is that?
    a: Escapes; rare values stored in full, with their positions, outside the fixed-width code
    wrong: ["Vector quantization with a codebook", "A KLT rotation", "Predictive coding with residuals"]
    why: The rest of the vector then needs a much narrower ruler. Fixed-length codes with an escape stream make the same trade, losslessly.
    sec: show
  - q: The Bench's dump stores keys before RoPE. What did the campaigns find about them?
    a: Pre-RoPE keys compress like values at the same depth, with the same compressor family and the same order of mechanisms
    wrong: ["Keys are incompressible", "Keys compress twice as well as values", "Keys were never measured"]
    why: One night of C1 on pre-RoPE keys, FP8 and BF16; C2 never touched keys. KVQuant's advice to store keys before RoPE is what made that night possible.
    sec: ours
  - q: KVQuant's "pre-RoPE quantization" means, on this site, that the exact target is which object?
    a: The 8-bit keys before RoPE, with the GPU applying RoPE after each cold decode
    wrong: ["The post-RoPE keys, re-encoded for free", "The values, which have no RoPE", "The indexer's keys"]
    why: In floating point a rotation is not bit-exactly undone, so "store pre-RoPE" is a design choice made up front about what the contract reproduces.
    sec: words
---

Here is one pair of key [[element|elements]], e8 and e9, for six consecutive tokens deep in a long text: `k[1000:1006, layer_id, head_id, 8:10]`. [[rope|RoPE]] turns this pair together, by about 0.56 radians per token. On the left the keys before RoPE, on the right after.

| position | e8 before | e9 before | e8 after | e9 after |
|---|---|---|---|---|
| 1000 | 9.1 | 0.6 | −9.1 | −0.6 |
| 1001 | 8.8 | 0.5 | −7.2 | −5.1 |
| 1002 | 9.2 | 0.7 | −3.4 | −8.6 |
| 1003 | 9.0 | 0.6 | 1.6 | −8.9 |
| 1004 | 8.9 | 0.4 | 5.9 | −6.7 |
| 1005 | 9.1 | 0.6 | 8.8 | −2.4 |

Notice anything? Before RoPE, the [[furrow]] e8 sits at 9 like a lighthouse. After RoPE the same 9 is shared out between e8 and e9 in proportions that change every token, and e8 swings from −9 to +9 within a few tokens. Nothing was lost, the pair still has the same length, but a ruler laid along e8 must now cover eighteen units instead of half a unit.

```python RoPE on one pair of elements (the numbers in the table)
import numpy as np
pos = np.arange(1000, 1006)                      # token positions
a = np.array([9.1, 8.8, 9.2, 9.0, 8.9, 9.1])     # element 8 before RoPE
b = np.array([0.6, 0.5, 0.7, 0.6, 0.4, 0.6])     # element 9 before RoPE
turn = 10000 ** (-2 * 4 / 128)                   # pair 4 of a 128-wide head
ang = pos * turn
a_rope = a * np.cos(ang) - b * np.sin(ang)       # element 8 after RoPE
b_rope = a * np.sin(ang) + b * np.cos(ang)       # element 9 after RoPE
print(round(turn, 2), a_rope.round(1), b_rope.round(1))
# 0.56 [-9.1 -7.2 -3.4  1.6  5.9  8.8] [-0.6 -5.1 -8.6 -8.9 -6.7 -2.4]
```

## The idea, by example {#idea}

KVQuant ([[lossy]], on the GPU-memory road of [[#papers-reading-guide/data-path]]) starts where [[#papers-kivi|KIVI]] stops: keys rounded with one ruler per furrow, values with one ruler per [[cherry]]. Then it makes four changes.

1. **Round the keys before RoPE.** The per-furrow rulers are laid on the keys as they come out of the layer, before the position-dependent turn. RoPE is applied after the keys are read back.
2. **Put the marks where the numbers are.** Each layer gets its own 3-bit grid, fitted offline by a one-dimensional k-means that weights each number by how much it matters to the LLM's output: a tiny one-dimensional [[codebook]] per layer.
3. **Let the largest numbers escape.** In every vector the largest ~1 % are stored in full precision with their positions, the paper's "dense-and-sparse quantization", our [[escape|escapes]]. The cut-off is per furrow for keys (fixed offline) and per cherry for values (computed on the fly).
4. **Smaller things.** A grid normalisation for 2-bit runs and, in the later code, the first few tokens kept at full precision.

The first change is easiest to see by sliding along RoPE's pairs. Each pair turns at its own speed, from one radian per token for the first pair to one full turn every ~54 000 tokens for the last.

::: figure fig-papers-kvq-rope pbKvqRope
**One pair of key elements, before and after RoPE, over a window of 64 tokens.** Horizontal: tokens into the window. Vertical: the key value. Lapis: the first element of the pair before RoPE (a steady value near 9 plus a little noise, illustrative). Vermilion: the same element after RoPE (solid) and its partner (dashed). Shaded bands: the range a per-furrow ruler must cover, before (lapis) and after (vermilion). The slider picks the pair (0 turns fastest, 63 slowest, for a head of 128 elements and the usual base of 10 000); the buttons pick where in the text the window starts. The readout gives the turn per token, the furrow's level (mean) and spread (standard deviation) before and after, the step of a 3-bit min–max ruler, and a rough count of the extra bits an exact per-furrow code would need: $\log_2$ of the ratio of spreads.
:::

::: try
1. Pair 4, window at 1K. After RoPE the furrow swings over its whole range every 11 tokens; its level averages out to 0.2 and its spread grows from 0.31 to 6.46, roughly 4.4 more bits per number for an exact copy.
2. Slide to pair 40. The turn is slow (a full turn every ~2 000 tokens), and inside the window the furrow stays steady (spread 0.31 → 0.35). Now try the start buttons: its level is +8.9 at 0, −8.9 at 1K, +8.4 at 10K and −5.6 at 100K. After RoPE this furrow looks *large and slowly varying*, and wanders between +9 and −9 across the text.
3. Slide to pair 63. RoPE barely moves anything over 64 tokens; before and after look alike.
:::

The third change, escapes, is a trade you can count.

::: figure fig-papers-kvq-escape pbKvqEscape
**The 128 numbers of one vector and a 3-bit ruler.** Horizontal: value. Dots are jittered vertically only for legibility. Lapis dots are rounded to the nearest of the eight marks (dashed lines), which span the smallest to the largest kept number. Vermilion dots are escaped: stored exactly, with their position. The buttons choose the share escaped. The readout gives the ruler step, the typical (root-mean-square) error of the kept numbers, and the cost of the escapes, counted as 16 bits of value plus 7 bits of position each, spread over 128 numbers. Illustrative data: a Laplace-shaped vector with three planted large numbers.
:::

::: try
1. No escapes: three planted numbers stretch the ruler to a step of 3.43, and the typical error of the rest is 0.85.
2. Escape 1 % (one number): the step shrinks to 2.64. Escape 2 % (three numbers): step 1.22, error 0.37, for 0.54 extra bits per number.
3. Escape 5 %: step 0.98 and error 0.28, but the escapes now cost 1.08 bits per number. The first few escapes buy the most.
:::

::: takeaway
- KVQuant keeps KIVI's ruler directions and adds keys rounded before RoPE, a fitted non-uniform grid per layer, and ~1 % escapes per vector.
- RoPE turns a steady large furrow into a swinging one; rounding before RoPE keeps the steady version.
:::

## What they assume {#assume}

1. **KIVI's background:** large persistent key furrows; values without them ([[#papers-kivi]]).
2. **RoPE is a rotation of element pairs by a position-dependent angle,** applied to keys after they are computed and before attention ([[#landscape-rope-and-mla]]). Known, and the lever of the paper.
3. **The numbers have heavy tails.** A few per vector stretch any ruler; the setting [[escape|escapes]] exist for ([[#school-fixed-length]]).
4. **Per-furrow key ranges are stable across texts,** enough that the cut-offs for escapes can be fixed offline on calibration data. A quiet hint that a global per-furrow table captures much of the keys' structure ([[#toolbox-solo]]).

::: takeaway
- Known: KIVI's furrows, RoPE's geometry, heavy tails, key ranges stable across texts.
:::

## What they show {#show}

| their measurement | value | where | verifiable? |
|---|---|---|---|
| headline | 3 bits with ~1 % escapes: under 0.1 perplexity increase on Wikitext-2 and C4 (LLaMA, Llama-2, Llama-3, Mistral) | abstract | public LLMs and datasets; reproducible, not reproduced by us |
| capacity | LLaMA-7B with 1M tokens of context on one 80 GB A100; 10M on 8 GPUs | abstract, README | a capacity claim: it fits, not that it reads well at that length |
| kernels | about 1.7× faster than the 16-bit matrix–vector product (LLaMA-7B) | abstract | their rig |
| per-cherry rulers, 3-bit uniform, LLaMA-7B, Wikitext-2 | perplexity 10.87 if keys are rounded after RoPE, 14.68 before (16-bit: 5.68) | appendix table, via search excerpts | — |

The last row is the subtle one, and the most useful. With per-cherry rulers, rounding *after* RoPE is better. Pre-RoPE helps only when the ruler runs along the furrow, because that is exactly where RoPE does its damage. Pair 40 of the figure adds a warning for our own measurement: after RoPE, a slow pair makes a steady furrow *drift* with position. A per-stretch dictionary would follow it; a global one would not. Measured on post-RoPE keys, part of a stretch-scope gain would be RoPE, predictable from the position alone, and not neighbours being alike. Measuring before RoPE keeps the two apart.

What it does not show: how many bits the steady furrow costs exactly. The figure's "extra bits" is our rule of thumb from [[#school-residual-shapes]] (halve the spread, save a bit) on a toy.

::: takeaway
- Transferable: keys are steadier per furrow before RoPE, and heavy tails call for escapes.
- Not transferable: any number of bits. Perplexity measures tolerance, not predictability.
:::

## What it says about our scenario {#ours}

**Builds on.**
- Keys before RoPE as a separate problem ([[#hypotheses-keys-and-values]]). The Bench's dump stores keys recovered before RoPE by inverting the partial rotation (64 of 256 elements on Qwen3.5-2B), to about one BF16 ulp ([[#measured-the-data]]). C1's one night on them found pre-RoPE keys compressing like values at the same depth, with the same compressor family and the same order of mechanisms: K vs V at stretch 4096, head 0, KV layer 0: 0.660 vs 0.673 (quick, not verified).
- Escapes as a stage: a fixed-length code with an escape stream is the lossless twin of dense-and-sparse ([[#toolbox-two-rates]], [[#school-fixed-length]]).
- The grid is not neutral ([[#toolbox-bit-fields]]): KVQuant fits its grid; we inherit ours (E4M3 or INT8), and the campaigns found that modelling in value space and integrating over the FP8 cell was worth three times what index-space modelling read ([[#measured-time-and-bits]]).

**Conflicts with.** Nothing measured. Two cautions instead. Storing keys pre-RoPE changes what "exact" means: the [[contract]] then reproduces the pre-RoPE 8-bit keys, and the GPU applies RoPE after every cold decode; a floating-point rotation is not undone bit for bit, so this is a design choice made up front, not a free re-encoding. And partial RoPE (Qwen3.5-2B turns 64 of 256 elements) means the pre-/post-RoPE difference lives in fewer furrows than in LLaMA.

**Suggests.**
- The keys scenario, `K at one KV layer, k[t, l, :, :] · stretch 4096 · leash 293`, first in the harness queue ([[#plan-next-in-the-harness]]): C2 never touched keys.
- Per-furrow key statistics at two scopes, global and stretch, to separate the stable range KVQuant fixes offline from any drift along the text ([[#scenario-scope]]).

::: theme grid-matters
KVQuant spends real effort choosing its grid: marks where the numbers are dense, fitted per layer. We do not get to choose; the stored format is the grid. The same lesson cuts the other way: the grid decides which predictions save bits.
:::

::: takeaway
- Builds on: pre-RoPE keys (the Bench stores them so), escapes, the grid.
- Conflicts with nothing; "exact" moves to the pre-RoPE keys, by design.
- Suggests: the keys scenario, and per-furrow statistics at two scopes.
:::

## Their words, ours {#words}

| their word | ours | where the meanings differ |
|---|---|---|
| per-channel quantization | per-[[furrow]] rounding | one ruler per furrow over a run of tokens |
| per-token quantization | per-[[cherry]] rounding | one ruler per token's vector |
| pre-RoPE quantization | rounding the keys before RoPE; for us, the pre-RoPE keys are the exact target | RoPE is applied after every decode |
| dense-and-sparse quantization | a narrow ruler plus [[escape\|escapes]] | theirs are lossy escapes of ~1 %; ours are exact |
| non-uniform quantization, sensitivity-weighted k-means | a fitted 1-D [[codebook]] per layer | we inherit the grid instead |
| outliers | the escaped numbers | — |
| KV cache | the [[orchard]] | — |
| model (LLaMA, Mistral) | the LLM, named | — |

::: aside source Receipts
Hooper, Kim, Mohammadzadeh, Mahoney, Shao, Keutzer and Gholami, *KVQuant: Towards 10 Million Context Length LLM Inference with KV Cache Quantization*, NeurIPS 2024, arXiv:2401.18079. Headline, capacity and kernel numbers: abstract and README. The per-token pre-/post-RoPE perplexities (10.87 / 14.68 / 5.68): the appendix table, read only in search excerpts. The RoPE table and figure are our toys. The campaigns' numbers: `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1.1 (keys recovered before RoPE, 64 of 256 channels, to about one bf16 ulp), §1.4 (K vs V at 4k, head 0: L3 0.660 vs 0.673; C2 never touched keys), §1.8 (value-space modelling vs the FP8 code index).
:::
