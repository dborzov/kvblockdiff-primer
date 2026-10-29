---
title: KVTC (2026)
nav: KVTC
lede: The JPEG recipe applied to KV caches — rotate to the data's own axes, give the big axes bits and the small ones none, then pack. Up to 20× smaller, lossy. Its lossless shadow is the KLT bound, and the two numbers grow at very different speeds.
group: Lossy KV compression
cards:
  - q: In this site's vocabulary, what is the "PCA decorrelation" step of KVTC?
    a: A KLT — a rotation onto the axes along which the data spreads most, fitted once on calibration data
    wrong: ["A k-means codebook", "A per-token min–max ruler", "An entropy coder"]
    why: PCA and the KLT are the same mathematics. KVTC fits the axes once, offline, and reuses them for every cache — a global-scope dictionary.
    sec: what
  - q: How does a lossy transform coder like KVTC reach ratios like 20×?
    a: It gives zero bits to the many small components below a "water level" and drops them
    wrong: ["It codes every component exactly with fewer bits", "It removes duplicate tokens", "It stores keys only"]
    why: Bits go to a component in proportion to the log of its variance above the water level; below it, nothing is stored at all.
    sec: shadow
  - q: What does the same rotation save in a lossless coder?
    a: The transform coding gain, ½ log₂ (AM/GM) of the variances, in bits per number
    wrong: ["The same ratio as the lossy coder", "Nothing — rotations never help lossless coding", "log₂ of the number of components dropped"]
    why: A lossless coder cannot drop components; every one still costs bits down to the stored grid. Only the uneven spread of variance is saved, and only logarithmically.
    sec: shadow
  - q: Why can a steep raw spectrum overstate what a rotation adds for us?
    a: Part of the steepness is just channels of different sizes, which a per-channel code already prices in
    wrong: ["Because PCA is inaccurate on GPUs", "Because DEFLATE adds overhead", "Because the spectrum is measured on values only"]
    why: Big channels (KIVI's observation) make a few raw variances large. A per-channel location and scale capture that without rotating; the rotation's own gain is measured on standardized data.
    sec: shadow
  - q: Why is KVTC's final packing step (DEFLATE) fine for KVTC and wrong for our miss path?
    a: DEFLATE is a stream coder; KVTC compresses whole caches, we read single scattered entries
    wrong: ["DEFLATE is lossy", "DEFLATE cannot run on GPUs", "DEFLATE needs a trained dictionary"]
    why: A stream must be decoded from its start. Offloading a whole cache reads it all anyway; the sparse-decode miss path reads a few hundred bytes from anywhere.
    sec: connections
---

A JPEG photo is not stored pixel by pixel. Each 8×8 patch is turned into a mix of patterns, from smooth to busy. The smooth patterns carry most of the picture and get many bits; the busy ones get few or none, because the eye does not miss them. Then a general-purpose coder packs what is left.

KVTC does the same to a [[kv-cache]]: turn each vector onto the axes the data prefers, spend bits where the spread is, drop the rest, pack. It reports up to **20× smaller caches** with accuracy kept on reasoning and long-context tests, and 40× or more in some cases. It is [[lossy]]. The question for us is what the same recipe is worth when nothing may be dropped.

## What KVTC does, in our words {#what}

1. **Fit the axes once.** On a short calibration run, collect key and value vectors, stack them, and compute the axes of greatest spread — a [[klt|KLT]] (the paper says PCA; same thing). The axes are computed once per model and reused for every cache: a dictionary shared by every request, which our ladder calls global scope ([[#homework-scope]]).
2. **Rotate.** Each vector is described by its coordinates along those axes.
3. **Spend bits where the spread is.** A dynamic program decides how many bits each axis gets for a given budget. Axes with little spread get zero bits: they are dropped.
4. **Round and pack.** The coordinates are rounded and the bytes packed with DEFLATE (the zip algorithm), run on the GPU through NVIDIA's nvCOMP library.

Here is the pipeline, with its lossless shadow underneath — the same idea, with "drop" forbidden.

```graph
id: pb-kvtc-pipeline
columns: ["Fit once", "Rotate", "Spend bits", "Pack"]
nodes:
  - {id: pca, col: 1, row: 1, title: "PCA on calibration data", text: "The axes of greatest spread, per model.", color: "var(--lapis)"}
  - {id: rot, col: 2, row: 1, title: "Project each vector", text: "Coordinates along the axes.", color: "var(--lapis)"}
  - {id: alloc, col: 3, row: 1, title: "Bits per axis, many get 0", text: "A dynamic program at a bit budget.", color: "var(--lapis)"}
  - {id: pack, col: 4, row: 1, title: "Round, then DEFLATE", text: "A stream of bytes, GPU-packed.", color: "var(--lapis)"}
  - {id: klt, col: 1, row: 2, title: "The same KLT axes", text: "A dictionary of global scope.", link: school-rotation, term: klt}
  - {id: lift, col: 2, row: 2, title: "Rotate exactly", text: "Integer lifting steps, undone bit for bit.", link: school-coding-gain, term: lifting}
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

::: note numbers The numbers we use
| what | value | source |
|---|---|---|
| compression | up to 20× (40× or more for some uses), accuracy kept | abstract |
| models | Llama 3, Mistral NeMo, R1-Qwen 2.5 | abstract |
| tests | including GSM8K, MMLU, LongBench, RULER | abstract, via search |
| beats | token eviction, plain quantization, SVD-based methods, at high ratios | abstract |
| packing | DEFLATE via nvCOMP on the GPU | paper, via search excerpts |

Staniszewski and Łańcucki (NVIDIA), ICLR 2026 (arXiv:2511.01815). Two details we read only in secondary summaries and could not check: that RoPE is undone before the PCA, and that the first few and the most recent tokens are handled separately.
:::

::: takeaway
- KVTC = KLT fitted once + bit allocation that drops small axes + rounding + DEFLATE.
- The axes are a global dictionary, free at serving time.
- 20× is a lossy number: it counts what the model can do without.
:::

## One spectrum, two stories {#shadow}

Both coders start from the same list: the [[eigenvalue|variances]] $\vlambda$ along the KLT axes, largest first. They do very different things with it.

A lossy coder pours a "water level" over the list. Each axis above the water gets bits in proportion to the log of how far it sticks out; each axis below gets none:

$$
\text{bits for axis } \vi = \max\!\Big(0,\ \tfrac12 \log_2 \frac{\vlambda_{\vi}}{\text{water level}}\Big)
$$ {#eq-pb-water}

A lossless coder may not drop anything. Every axis still costs bits down to the stored grid, including the grid's own rounding noise $\vnu$, which sits on every axis. The rotation saves only the unevenness of the spread:

::: aside reminder The transform coding gain (II.16)
Rotating to the KLT axes and coding each axis on its own saves $\tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$ bits per number, where AM and GM are the ordinary and geometric averages of the variances — measured on data where every channel has first been scaled to the same spread. Equal variances give 0. See [[#school-coding-gain]].
:::

$$
\underbrace{\tfrac12 \log_2 \frac{\mathrm{AM}(\vlambda + \vnu)}{\mathrm{GM}(\vlambda + \vnu)}}_{\text{bits saved per number, nothing dropped}}
$$ {#eq-pb-shadow}

The smallest spectrum we own has two numbers. In [[#school-rotation]] we turned the two thermometers of Gull Rock onto the axes of their own cloud: one axis for "how warm", one for "how much the two disagree". Here they are again.

::: dataset fig-pb-kvtc-thermo thermo-axes view=cloud,timeline hl=disagree metrics=lambdas,total,bits
**The two thermometers of the ten days, on their KLT axes.** *The cloud, turned:* each dot is one half-hourly reading (480 in all), placed by its coordinate along the cloud (horizontal, °C, roughly the average of the two thermometers) and across it (vertical, °C, roughly their difference), both centred; the axes are drawn to the same scale. Vermilion: readings whose thermometers disagree by more than usual. *Along and across, over ten days:* the same two coordinates in time order. The Numbers tab gives the two variances $\vlambda_1, \vlambda_2$ — this cloud's whole spectrum. Synthetic, seeded data, the same as on [[#school-rotation]].
:::

Run both stories on it. The spectrum is 5.91 and 0.025 °C², a step of more than 200 to 1.

- **Lossy.** Allow an error of 1 % of the average variance and the water level rises above 0.025: the "disagree" axis gets zero bits. KVTC's recipe would keep how warm it was and drop the disagreement altogether — typically 0.16 °C along that axis, the square root of 0.025.
- **Lossless.** Nothing may be dropped, so both axes are coded, each to its own spread. The averages of the two variances are $\mathrm{AM} = 2.97$ and $\mathrm{GM} = 0.39$, and [[#eq-pb-shadow]] gives $\tfrac12\log_2 (2.97 / 0.39) \approx 1.47$ bits per number — the 2.95 bits per reading of the card's last line, for its two numbers.

The two thermometers already have the same spread, so standardizing them first changes nothing: this gain is all correlation, none of it channel sizes. With 64 axes the lossy story gets much more dramatic. The lossless one does not.

::: figure fig-pb-kvtc-spectrum pbKvtcSpectrum
**One toy spectrum, two coders.** Horizontal: the 64 KLT axes, largest variance first. Vertical: variance (log scale; the average is 1). The variances follow $\vi^{-a}$ with the steepness $a$ set by the first slider. Lapis: the part of each axis above the water level, which gets bits; grey: below, dropped by the lossy coder. The second slider sets the allowed error (the average variance left unexplained); the water level follows from it (reverse water-filling, rate–distortion theory for Gaussian axes). The buttons add the rounding noise of a stored grid (INT8 at σ = 32 steps: 8·10⁻⁵; E4M3: about 7·10⁻⁴, our estimate; or 1 %). Left tile: the lossy rate in bits per number and the ratio against 16-bit numbers (an ideal coder; real ones need more). Right tile: the lossless shadow, [[#eq-pb-shadow]]. Illustrative spectrum, not measured.
:::

::: try
1. Steepness 2.0, error 5 %: the lossy coder keeps 20 of the 64 axes at 0.40 bits per number on average — 40×. The same rotation, losslessly, saves 1.98 bits per number.
2. Steepness 1.5: lossy 15×, lossless 1.09 bits. Steepness 2.5: lossy 91×, lossless 2.99 bits. The lossy number grows like a ratio, the lossless one like a logarithm.
3. At steepness 2.5, switch the grid noise to 1 %: the lossless gain falls to 2.37 bits. The lossy coder does not care — it dropped those axes anyway.
:::

::: note warning Where we are not convinced
- **Steep is not the same as useful to us.** Part of any raw KV spectrum is just channels of different sizes — KIVI's big key channels. A per-channel location and scale already price that in, without rotating. The rotation's *own* gain is measured on standardized data, and nobody has published that spectrum for 8-bit KV.
- **The headline mixes things.** We could not check what the 20× counts: whether tokens kept at full precision, the stored axes and the DEFLATE framing are all inside it.
- **Accuracy, not bits.** Like every lossy paper, KVTC measures what the model tolerates. It tells us transform coding is the right *shape* for KV; it does not give the AM/GM of anything.
:::

::: takeaway
- Lossy: drop the axes below the water level — ratios grow fast with a steep spectrum.
- Lossless: keep every axis; save only $\tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$, on standardized data, with the grid's noise on every axis.
- The 20× says KV spectra are steep; it does not say how much of that a per-channel code has not already taken.
:::

## Connections {#connections}

::: theme access-pattern
KVTC compresses whole caches for storage and offload, where everything is read back together. A stream coder like DEFLATE is the natural packer there. On the sparse-decode miss path — single entries of a few hundred bytes, from anywhere — the same packer would force decoding from the start of a stream. The [[data-path]] decides the packer before the statistics do.
:::

:::: compare Two global dictionaries for KV
::: col KVTC
- A set of **axes** (a KLT), fitted once per model.
- Every vector uses *all* axes, with real-valued coordinates; small ones are dropped.
- Lossless shadow: the KLT bound, no per-vector tax.
:::
::: col Lexico
- A list of ~4,000 **atoms**, fitted once per model.
- Every vector uses a *few* atoms, named by index, with a weight each.
- Lossless shadow: pays an index tax per atom — see [[#papers-lexico]].
:::
::::

- Our KLT dictionary at work, with its weights and its need for a sharply spiky spectrum, is in [[#homework-klt]]; the exact (lifting) version of a rotation is in [[#missed-lifting]].

::: takeaway
- KVTC confirms that transform coding fits KV; our KLT bound is its lossless shadow.
- Its packer suits whole-cache transfers, not scattered single-entry reads.
:::
