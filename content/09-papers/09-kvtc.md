---
title: KVTC (2026)
nav: KVTC
group: Lossy KV compression
lede: The JPEG recipe applied to the orchard. Rotate to the data's own axes, give the big axes bits and the small ones none, then pack. Up to 20× smaller, lossy. Its lossless shadow is the KLT bound, and the two numbers grow at very different speeds.
cards:
  - q: In this site's vocabulary, what is the "PCA decorrelation" step of KVTC?
    a: A KLT, a rotation onto the axes along which the data spreads most, fitted once on calibration data
    wrong: ["A k-means codebook", "A per-cherry min–max ruler", "An entropy coder"]
    why: PCA and the KLT are the same mathematics. KVTC fits the axes once, offline, and reuses them for every orchard, a dictionary of global scope.
    sec: idea
  - q: What does KVTC's setup take as known about the orchard's statistics?
    a: That its variance is concentrated on a few directions, so a rotation makes most coordinates small
    wrong: ["That neighbouring tokens are alike", "That the mantissa is noise", "That keys repeat exactly"]
    why: Transform coding pays only on a steep spectrum. The paper assumes one, and its 20× says it found one, for a lossy purpose.
    sec: assume
  - q: How does a lossy transform compressor like KVTC reach ratios like 20×?
    a: It gives zero bits to the many small axes below a "water level" and drops them
    wrong: ["It codes every axis exactly with fewer bits", "It removes duplicate tokens", "It stores keys only"]
    why: Bits go to an axis in proportion to the log of its variance above the water level; below it, nothing is stored at all.
    sec: show
  - q: What does the same rotation save in a lossless compressor?
    a: The transform coding gain, ½ log₂ (AM/GM) of the variances, in bits per element, on standardized data
    wrong: ["The same ratio as the lossy compressor", "Nothing; rotations never help lossless coding", "log₂ of the number of axes dropped"]
    why: A lossless compressor cannot drop axes; every one still costs bits down to the stored grid. Only the uneven spread of variance is saved, and only logarithmically.
    sec: show
  - q: What did the campaigns find when they rotated the Bench's values and rounded?
    a: Fixed rotations lost 0.28–0.32 bit per element; rotating then rounding costs about 0.25 bit, and linear prediction, which never rounds the vector, won
    wrong: ["A KLT saved 2 bits per element", "Rotations tied with the reference tree", "Rotations were never tried"]
    why: On an 8-bit grid the rounding after a rotation is a tax the lossy recipe never pays. Prediction subtracts a guess and keeps the grid.
    sec: ours
  - q: KVTC's final DEFLATE step is which kind of stage on this site, and why is it wrong for the miss path?
    a: A stream entropy coder; a stream must be decoded from its start, and the miss path reads one cherry cold under the leash
    wrong: ["A lossy quantiser", "A per-furrow fixed-length code", "A dictionary of stretch scope"]
    why: Offloading a whole orchard reads it all anyway; a cold decode of one 512-byte cherry cannot wait for the stream before it.
    sec: words
---

A JPEG photo is not stored pixel by pixel. Each 8 × 8 patch is turned into a mix of patterns, from smooth to busy. The smooth patterns carry most of the picture and get many bits; the busy ones get few or none, because the eye does not miss them. Then a general-purpose compressor packs what is left. KVTC does the same to an [[orchard]]: turn each vector onto the axes the data prefers, spend bits where the spread is, drop the rest, pack. It reports up to **20× smaller orchards** with accuracy kept, and 40× or more in some cases. It is [[lossy]]. The question for us is what the same recipe is worth when nothing may be dropped.

## The idea, by example {#idea}

KVTC lives on the bulk road of [[#papers-reading-guide/data-path]]: whole orchards compressed for storage and offload, read back together. On a toy vector of 64 elements, `v[t, l, h, :]` with `head_dim = 64`:

1. **Fit the axes once.** On a short calibration run, collect key and value vectors, stack them, `X.shape == (n, 64)`, and compute the axes of greatest spread, `np.linalg.eigh(np.cov(X.T))`: a [[klt|KLT]] (the paper says PCA; same thing). Computed once per LLM and reused for every orchard: a [[dictionary]] of [[scope-global|global scope]] ([[#scenario-scope]]).
2. **Rotate.** Each vector is described by its 64 coordinates along those axes.
3. **Spend bits where the spread is.** A dynamic program decides how many bits each axis gets for a given budget. Axes with little spread get zero: they are dropped.
4. **Round and pack.** The coordinates are rounded and the bytes packed with DEFLATE (the zip format), run on the GPU through NVIDIA's nvCOMP library.

Here is the pipeline with its lossless shadow underneath: the same idea, with "drop" forbidden.

```graph
id: papers-kvtc-pipeline
columns: ["Fit once", "Rotate", "Spend bits", "Pack"]
nodes:
  - {id: pca, col: 1, row: 1, title: "PCA on calibration data", text: "The axes of greatest spread, per LLM.", color: "var(--lapis)"}
  - {id: rot, col: 2, row: 1, title: "Project each vector", text: "Coordinates along the axes.", color: "var(--lapis)"}
  - {id: alloc, col: 3, row: 1, title: "Bits per axis, many get 0", text: "A dynamic program at a bit budget.", color: "var(--lapis)"}
  - {id: pack, col: 4, row: 1, title: "Round, then DEFLATE", text: "A stream of bytes, GPU-packed.", color: "var(--lapis)"}
  - {id: klt, col: 1, row: 2, title: "The same KLT axes", text: "A dictionary of global scope.", link: toolbox-klt, term: klt}
  - {id: lift, col: 2, row: 2, title: "Rotate exactly", text: "Integer lifting steps, undone bit for bit.", link: toolbox-lifting, term: lifting}
  - {id: gain, col: 3, row: 2, title: "Every axis keeps its bits", text: "Saved: ½ log₂ AM/GM, nothing dropped.", link: school-coding-gain, term: transform-coding-gain}
  - {id: code, col: 4, row: 2, title: "Entropy-code each axis", text: "With its own spread; random access is another matter.", link: school-arithmetic, term: entropy-coder}
edges:
  - [pca, rot]
  - [rot, alloc]
  - [alloc, pack]
  - [klt, lift]
  - [lift, gain]
  - [gain, code]
  - [pca, klt, "same axes"]
```

::: takeaway
- KVTC = a KLT fitted once + bit allocation that drops small axes + rounding + DEFLATE.
- The axes are a global dictionary, free at serving time; the packer is a stream.
:::

## What they assume {#assume}

1. **The orchard's spectrum is steep.** Transform coding pays only when a few axes hold most of the variance; the paper assumes it and the 20× confirms it for a lossy purpose.
2. **A global basis suffices.** Axes fit once per LLM on a calibration run serve every orchard. The same bet as Lexico's one dictionary per LLM ([[#papers-lexico]]).
3. **Accuracy is the yardstick.** GSM8K, MMLU, LongBench, RULER: what the LLM can do without.
4. **The road is bulk.** Whole orchards for storage and offload, where a stream packer is natural.

Two details we could read only in secondary summaries: that RoPE is undone before the PCA (the KVQuant lesson, [[#papers-kvquant]]), and that the first few and most recent tokens are handled separately.

::: takeaway
- Known: steep spectra, a global basis, accuracy as the measure, bulk reads.
:::

## What they show {#show}

| their measurement | value | where | verifiable? |
|---|---|---|---|
| compression | up to 20× (40× or more for some uses), accuracy kept | abstract | public LLMs and tests; not reproduced by us |
| LLMs | Llama 3, Mistral NeMo, R1-Qwen 2.5 | abstract | — |
| tests | including GSM8K, MMLU, LongBench, RULER | abstract, via search | — |
| beats | token eviction, plain rounding, SVD-based methods, at high ratios | abstract | their comparison |
| packing | DEFLATE via nvCOMP on the GPU | paper, via search excerpts | a design fact |

Both the lossy compressor and its lossless shadow start from the same list: the [[eigenvalue|variances]] $\vlambda$ along the KLT axes, largest first. They do different things with it. A lossy compressor pours a "water level" over the list. Each axis above the water gets bits in proportion to the log of how far it sticks out; each axis below gets none:

$$
\text{bits for axis } \vi = \max\!\Big(0,\ \tfrac12 \log_2 \frac{\vlambda_{\vi}}{\text{water level}}\Big)
$$ {#eq-papers-kvtc-water}

A lossless compressor may not drop anything. Every axis still costs bits down to the stored grid, including the grid's own rounding noise $\vnu$, which sits on every axis. The rotation saves only the unevenness of the spread:

::: aside reminder The transform coding gain (II.16)
Rotating to the KLT axes and coding each axis on its own saves $\tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$ bits per number, where AM and GM are the ordinary and geometric averages of the variances, measured on data where every furrow has first been scaled to the same spread. Equal variances give 0. See [[#school-coding-gain]].
:::

$$
\underbrace{\tfrac12 \log_2 \frac{\mathrm{AM}(\vlambda + \vnu)}{\mathrm{GM}(\vlambda + \vnu)}}_{\text{bits saved per number, nothing dropped}}
$$ {#eq-papers-kvtc-shadow}

::: figure fig-papers-kvtc-spectrum pbKvtcSpectrum
**One toy spectrum, two compressors.** Horizontal: the 64 KLT axes, largest variance first. Vertical: variance (log scale; the average is 1). The variances follow $\vi^{-a}$ with the steepness $a$ set by the first slider. Lapis: the part of each axis above the water level, which gets bits; grey: below, dropped by the lossy compressor. The second slider sets the allowed error (the average variance left unexplained); the water level follows from it (reverse water-filling, [[rate-distortion]] theory for Gaussian axes). The buttons add the rounding noise of a stored grid (INT8 at σ = 32 steps: 8·10⁻⁵; E4M3: about 7·10⁻⁴, our estimate; or 1 %). Left tile: the lossy rate in bits per number and the ratio against 16-bit numbers (an ideal entropy coder; real ones need more). Right tile: the lossless shadow, [[#eq-papers-kvtc-shadow]]. Illustrative spectrum, not measured.
:::

::: try
1. Steepness 2.0, error 5 %: the lossy compressor keeps 20 of the 64 axes at 0.40 bits per number on average, 40×. The same rotation, losslessly, saves 1.98 bits per number.
2. Steepness 1.5: lossy 15×, lossless 1.09 bits. Steepness 2.5: lossy 91×, lossless 2.99 bits. The lossy number grows like a ratio, the lossless one like a logarithm.
3. At steepness 2.5, switch the grid noise to 1 %: the lossless gain falls to 2.37 bits. The lossy compressor does not care; it dropped those axes anyway.
:::

Where the framing flatters: a raw spectrum is steep partly because furrows have different sizes (KIVI's big key furrows). Per-[[furrow]] statistics price that in without rotating; the rotation's *own* gain is measured on standardized data, and nobody has published that spectrum for 8-bit orchards. We could not check what the 20× counts, whether tokens kept at full precision, the stored axes and the DEFLATE framing are all inside it.

::: takeaway
- Lossy: drop the axes below the water level; ratios grow fast with a steep spectrum.
- Lossless: keep every axis; save only $\tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$ on standardized data, with the grid's noise on every axis.
:::

## What it says about our scenario {#ours}

**Builds on.**
- The KLT as a dictionary, with its need for a spiky spectrum ([[#toolbox-klt]], [[#school-coding-gain]]), and the bound-before-building rule of [[#toolbox-bounds]]: compute the AM/GM on standardized data first.
- The grid noise $\vnu$ on every axis ([[#toolbox-bit-fields]]): a lossless compressor must reproduce it.

**Conflicts with.** The campaigns tried rotations on the Bench's values and they lost. Fixed rotations (DCT, Hadamard, random) cost +0.28 to +0.32 bit per element against no rotation (code-length estimate, two heads); rotating and then rounding costs about 0.25 bit per element, close to the lattice constant 0.2546; and the same-index correlation across elements (0.07 at one middle layer) gave a DCT nothing to work with ([[#measured-codebooks-and-rotations]]). What won was [[linear-prediction]] across elements, which subtracts a guess and never rounds the vector. We believe the campaigns for lossless coding on an 8-bit grid: KVTC's recipe pays a rounding tax after the rotation that the lossy version never has to count. KVTC's steep spectrum can still be real; it is spent on dropping axes, which we may not do.

**Suggests.**
- The standardized spectrum of the Bench's values, per layer, as a desk bound: $\tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$ with $\vnu$ added, against the 0.25-bit rounding tax. If the bound is under the tax, no lossless rotation can pay ([[#toolbox-bounds]]).
- If it is over: [[lifting]] turns the rotation into an integer-reversible one with no rounding tax ([[#toolbox-lifting]], [[#papers-classics/lifting]]); the campaigns did not try lifted rotations.

::: theme access-pattern
KVTC compresses whole orchards for storage and offload, where everything is read back together, and a stream packer like DEFLATE is natural. On the miss path, one cherry of 512 bytes decoded cold under the [[leash]], the same packer would force decoding from the start of a stream. The road decides the packer before the statistics do.
:::

::: takeaway
- Builds on: the KLT bound, the grid noise.
- Conflicts with: rotations lost on the Bench by 0.25–0.32 bit; prediction without rounding won. We believe the exact bits.
- Suggests: the standardized spectrum as a bound, and lifting if it clears the tax.
:::

## Their words, ours {#words}

| their word | ours | where the meanings differ |
|---|---|---|
| PCA decorrelation | a [[klt|KLT]], a dictionary of [[scope-global\|global scope]] | same mathematics; ours names what it costs |
| bit allocation, rate–distortion | the water level ([[#eq-papers-kvtc-water]]); our lossless twin is the [[transform-coding-gain]] | we may drop nothing |
| quantization | rounding to the stored grid | ours is the storage format itself |
| DEFLATE, nvCOMP | a stream [[entropy-coder]] | fine on the bulk road; breaks the [[leash]] |
| KV cache | the [[orchard]] | — |
| offloading | the orchard kept outside HBM | — |
| channel | [[element]] / [[furrow]] | — |
| model (Llama 3, Mistral NeMo) | the LLM, named | — |

::: aside source Receipts
Staniszewski and Łańcucki (NVIDIA), *KV Cache Transform Coding for Compact Storage in LLM Inference*, ICLR 2026, arXiv:2511.01815. Compression (20×, 40×), LLMs and comparison: abstract. Tests: abstract, via search. DEFLATE via nvCOMP, RoPE undone before PCA, and the separate handling of first and recent tokens: search excerpts and secondary summaries; the last two could not be checked. The spectrum figure is a toy. The campaigns' numbers: `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1.7 (fixed rotations +0.28 to +0.32 bit, exact-model bounds, two heads, r11 iter-1-1; rounding after rotation ≈ 0.25 bit, lattice constant 0.2546; same-index correlation 0.0734 at L11).
:::
