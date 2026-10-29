---
title: Fixed choices and their assumptions
nav: Fixed choices
group: Honest edges
lede: A first experiment needs specific values, and every value rests on an assumption. Here is each choice, what it assumes, and how solid that is — including three the source called safe that the harness says are not.
cards:
  - q: Why does wave 1 target 8-bit storage rather than BF16?
    a: KV storage is converging on 8 bits, and BF16's low bits carry noise that makes lossless coding a different, less relevant problem
    wrong: ["Because BF16 cannot be coded losslessly", "Because 8-bit is the HiSparse default", "Because the GPU cannot read BF16"]
    why: The direction is solid; the format is not — E4M3 and INT8 behave differently under prediction, so both are scored.
    sec: choices
  - q: Why is exact top-k attention an acceptable stand-in for the DSA indexer?
    a: The indexer is trained to approximate attention's ranking, so block-level statistics should carry over, though exact miss rates will differ
    wrong: ["Because DSA is exact top-k", "Because the indexer does not affect misses", "Because HiSparse does not use an indexer"]
    why: Reasonable for concentration statistics; the miss rates are calibrated against HiSparse's published ones.
    sec: choices
  - q: The source rated the residual coders "safe". Why does the harness disagree on E4M3?
    a: The index-space Laplace model charges E4M3 solo coding more than raw (8.4 bits on synthetic data); a grid-aware model is needed
    wrong: ["Because fixed-length codes cannot escape", "Because Laplace models cannot be fit on 8-bit data", "Because entropy coders are too slow"]
    why: E4M3 codes of a zero-centred channel form two humps that one index-space bump cannot describe.
    sec: change
  - q: Which choice would we change first, before any real data?
    a: The number of calibration sequences — from 2 to at least 8, better 32
    wrong: ["The block sizes", "Storing keys after RoPE", "Dropping INT8"]
    why: With 2 calibration sequences the synthetic shuffle control shows a 0.22-bit calibration gap in the request gain; the dump cost of more is tiny.
    sec: change
---

Every experiment is a pile of decisions someone made on a Tuesday afternoon. That is fine. What is not fine is forgetting that they were decisions. This page lists the choices fixed for wave 1, the assumption behind each, and how solid it is. Rows marked ⚠ are the likeliest to need revisiting.

## The choices {#choices}

| choice | assumption behind it | how solid; what would change it |
|---|---|---|
| **8-bit storage** ([[fp8\|E4M3]] and [[integer-grid\|INT8]] with a scale) as the lossless target | KV storage is converging on 8 bits; BF16's low bits carry noise that makes lossless coding of BF16 a different, less relevant problem | Strong on direction, weaker on format ⚠: the two grids behave differently under prediction ([[#plan-fp8-target]]). Both are scored; BF16 rides along. |
| **[[proxy-model\|Proxy model]]** Qwen3.5-2B's full-attention layers; Qwen3-1.7B as replication | neighbour similarity is a property of transformer KV statistics, not of one indexer; a plain attention layer is a clean place to measure it, and it runs on a 16 GB GPU | Plausible, unproven across families ⚠. Two KV heads and partial RoPE are atypical. [[mla\|MLA]] latents, the real target, are already a learned low-rank projection, so the KLT rung may find less there. |
| **Exact top-k attention as the indexer** | the DSA indexer approximates attention's ranking, so block statistics carry over | Reasonable for concentration; exact miss rates will differ. Calibrated against HiSparse's. |
| **Keys before RoPE** | pre-RoPE keys keep their per-channel structure; rotating after decoding is cheap | Well supported ([[#papers-kvquant]]). A system storing post-RoPE keys would need the rotation in its decoder. |
| **One entry per layer; dictionaries per layer** | follows HiSparse's per-layer caches | Solid for a first variant; cross-layer dictionaries wait for [[upstairs\|upstairs similarity]]. |
| **Block sizes** $\vb \in \{512, 2\text{K}, 8\text{K}\}$ plus request scope | spans the amortization range of every type; the data's own scale is read off the distance curve | Safe: the sweep *is* the measurement. |
| **Residual coders:** a Laplace entropy model and fixed-length-with-escapes | they bracket what a real decoder achieves | The source said safe. ⚠ On E4M3 the index-space Laplace is the wrong shape; the harness uses a [[grid-aware-model\|grid-aware model]]. |
| **Calibration data:** 2 sequences | enough to fit a global dictionary | ⚠ Too few: a 0.22-bit calibration gap on synthetic data ([[#plan-controls/run]]). |
| **Reference setting** = HiSparse's GLM-5.1 deployment at 8 bits | a representative long-context sparse-attention rig with published cache numbers | The conclusions are ratios; the calculator exposes every input. |

The warnings on the residual coders and on the calibration data are this rewrite's; the rest of the table is the source's.

::: takeaway
- Most choices are safe because they are swept (block sizes) or cheap to revisit (keys before RoPE).
- The weakest are the proxy model and the 8-bit format — both are scored two ways for that reason.
:::

## The three we would change first {#change}

Building the harness turned three of the source's "fixed" choices into open ones.

:::: compare What the source fixed versus what the harness found
::: col The source's plan
- **2 calibration sequences**, disjoint from evaluation.
- **Residual coders "safe"**: a discretized Laplace per channel in index space, and fixed-length with escapes.
- **Solo coding** as rung 0 of every column.
:::
::: col What the synthetic run showed
- The shuffled request gain — pure calibration gap — is **0.22 bit** with 2 sequences, 0.12 with 8, 0.07 with 32.
- On E4M3 the index-space Laplace charges solo coding **8.375 bits**, more than raw; the grid-aware model charges 6.367.
- In the plain fixed-length format, solo coding is **exactly 8.0 bits**: a straw-man baseline for the engineering column.
:::
::::

All three are cheap to fix, and all three bias the result the same way — towards a "go":

1. **More calibration data** costs about 200 MB of codes per sequence; dump 8 to 32.
2. **The grid-aware model** is already in the harness ([[#plan-fp8-target/coder]]).
3. **An exponent-splitting solo format** (the [[#papers-splitzip|SplitZip]] idea) is a few dozen lines; it belongs in rung 0 of the fixed-length column.

::: theme grid-matters
Two of the three corrections are about the 8-bit grid: the entropy model must know the grid is logarithmic, and the fixed-length baseline must know where the exponent is.
:::

::: takeaway
- Three choices the source treated as settled are not: calibration size, the E4M3 entropy model, the fixed-length baseline.
- All three would flatter the dictionaries; all three are cheap to fix before the weekend.
:::
