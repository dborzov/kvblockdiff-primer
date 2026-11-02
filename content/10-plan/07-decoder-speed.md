---
title: How fast must the decoder be?
nav: Decoder speed
group: Next experiments
lede: The best compressor of Part VIII was scored in a fresh process per cherry on a CPU, which proves the contract and says nothing about speed. On the miss path a decoder has a budget of microseconds. This page states that budget as a subproblem and plans the one measurement that settles it.
cards:
  - q: Why must a decoder on the miss path run at least ten times faster than the link?
    a: 'So that decoding a layer''s misses takes a small fraction of the 0.38 ms in which the link is already busy delivering them'
    wrong: ["Because the GPU is ten times faster than the host", "Because each delta is decoded ten times", "Because ten sequences share one decoder"]
    why: 'At the Pin 110 sequences × 274 misses × 640 B ≈ 19 MB per layer per step; the link needs the whole 0.38 ms for that, and a 500 GB/s decoder adds 39 µs, a tenth.'
    sec: subproblem
  - q: Which two decoders does the speed test compare?
    a: 'A GPU decode of the frontier compressor (reference tree, linear prediction, entropy coder) and of a fixed-length variant with the same tree and prediction'
    wrong: ["The CPU harness and a Python script", "zstd and the frontier compressor", "Two different LLMs' decoders"]
    why: The entropy coder is serial within a cherry; the fixed-length variant trades bytes for parallelism. Which one clears 500 GB/s decides the delta format.
    sec: measure
  - q: What is measured, in which units?
    a: Cold-decoded cherries per second at the miss batch sizes, converted to bytes of rebuilt cherries per second, against the link's bytes per second
    wrong: ["The MDL ratio of the decoded punnet", "The number of CUDA cores used", "Seconds per punnet on the sender's side"]
    why: The decoder competes with the link for the same window; the only comparable unit is bytes per second of what it hands to attention.
    sec: measure
  - q: Which of the frontier compressor's three decode stages is the worry for a GPU?
    a: The entropy-coder stage, one rANS stream per cherry read symbol by symbol, 512 serial decodes per cherry
    wrong: ["The reference-tree walk, a gather", "The linear prediction, a small matrix-vector", "None: all three are parallel"]
    why: The gather and the prediction have known GPU shapes; the serial symbol decode is why the fixed-length variant is built as the control.
    sec: build
---

The frontier compressor decodes one cherry by walking up its reference tree, applying a sparse linear prediction and reading a rANS stream, on a CPU, in a process forked for that one cherry ([[#measured-reading-one-cherry]]). That proved the [[contract]] for 5.3 million cherries. It says nothing about whether the same work fits between a miss and the attention call that is waiting for it.

## The subproblem, stated {#subproblem}

The project's goal is fewer bytes on the link and fewer GPU bytes per sequence than HiSparse, with outputs unchanged. Lever 1 ([[#app-two-levers]]) buys the first by sending a delta instead of a raw pick, and it is only real if the GPU can rebuild the pick before attention needs it. The bill of [[#app-the-napkin]] has no line for decode time because it assumes the decoder is invisible. This subproblem is the test of that assumption, and it can be studied apart from the others because it needs no trace and no new scenario: one compressor, one GPU, one cherry shape.

**Inputs and output.** A compressor's `decompress` and one of its dictionaries; a GPU; a cherry shape; a batch of `n` deltas to decode cold. The output is a rate:

```python what the speed test measures
cherries_per_s = n / time(decompress_gpu(deltas[:n], dictionary))   # cold, no cherry decoded before
bytes_per_s    = cherries_per_s * cherry_bytes                       # rebuilt bytes handed to attention
```

The rule the output is read against is the one of [[#landscape-derived-numbers]]: the decoder's bytes per second must be at least **ten times** the link's, so that decoding adds a tenth of the window the link already fills. At the Pin, 50 GB/s of link asks for 500 GB/s of decoder:

$$
\underbrace{\frac{n \cdot \ve}{\text{bytes per second of the decoder}}}_{\text{time to rebuild one layer's misses}}
\;\le\; \frac{1}{10}\,\underbrace{\frac{\vtpot}{\vNL}}_{\text{one layer's window, 0.38 ms at the Pin}}
$$ {#eq-plan-ten-times}

With $n$ = 110 sequences × 274 misses, $\ve$ = 640 B: 19 MB per layer per step; at 500 GB/s, 39 µs of the 385 µs window.

**Assumed and not charged.** The dictionary is already on the GPU (residency is Q3's business); the deltas have already arrived (the link's business); the GPU's own memory bandwidth, several TB/s, is not the limit; the batch is as large as a layer's misses, so the decoder may run thousands of cherries in parallel.

**Consumes and feeds.** It consumes the frontier compressor of [[#measured-scorecard]] and, as its control, the fixed-length variant of H5 on [[#plan-next-in-the-harness]]. Its result feeds [[#app-two-levers]] (whether lever 1 exists at all), [[#app-victim-tier]] (a decode on promotion needs far less speed) and [[#app-bits-to-dollars]].

::: takeaway
- In: a compressor, a GPU, a cherry shape, a cold batch. Out: cherries per second, as bytes per second against the link.
- The rule: ten times the link, 500 GB/s at the Pin, so that decoding costs a tenth of the 0.38 ms window.
:::

## What to build {#build}

The frontier compressor's decode has three [[stage|stages]], and each has a known GPU shape.

| stage | what one cold decode does | GPU shape | the worry |
|---|---|---|---|
| [[reference-tree]] walk | reads the cherry's root path: up to 226 cherries' worth of dictionary, mean 120 | a gather of a few hundred rows per cherry; thousands of cherries in parallel | scattered reads of the dictionary; the leash bounds them |
| [[linear-prediction]] | a sparse triangular table over 512 elements, applied in element order | a small matrix-vector per cherry; serial within the cherry | 512 dependent steps per cherry |
| [[entropy-coder]] (rANS) | one stream per cherry, read symbol by symbol under a logistic over the FP8 cell | one GPU lane per cherry, strictly serial | 512 serial symbol decodes per cherry; the table lookups |

The fixed-length variant (H5) keeps the first two stages and replaces the third with a fixed-width mantissa field and an escape list: a gather and an add per element, the shape [[#papers-splitzip]] decodes at 565 GB/s to 2.2 TB/s on an H200. The price is bytes: Part V's two rates are about one bit per element apart, 15–22 % at the 5-to-7-bit rates that matter ([[#toolbox-two-rates]]), and the FP8 grid may widen the gap.

The cheapest first version is a Triton kernel of the fixed-length variant (a day) and a CUDA kernel of the rANS stage (several days); the tree walk and the prediction are shared code.

::: takeaway
- Three stages: a gather along the tree path, a serial prediction, a serial entropy decode per cherry.
- The fixed-length variant drops the serial decode at the cost of bytes; it is the control and the fallback.
:::

## What to measure {#measure}

1. **Cherries per second at the miss batch sizes:** 274 (one sequence's misses at one layer), 2 048, 30 000 (a whole GPU's layer), each decoded cold, each checked bit for bit against the harness's reference decode.
2. **Bytes per second** of rebuilt cherries, against 50 GB/s of link: the 10× rule in one number.
3. **Dictionary bytes touched** per cherry on the GPU, which must match the harness's counted reads (mean 120, worst 226 for the frontier compressor at leash 293); a mismatch is a bug, not a speed-up.
4. **Latency of one cold decode** of a single cherry, for the victim tier's decode-on-promotion path, where one cherry at a time is the pattern.
5. **The same four for the fixed-length variant**, and for a plain copy of the raw bytes as the floor.

| reading (bytes per second, batch 30 000) | meaning | next |
|---|---|---|
| frontier compressor ≥ 500 GB/s | the entropy-coded delta fits the miss path | lever 1 on the frontier's ratio, 0.636 |
| frontier < 500 GB/s, fixed-length ≥ 500 GB/s | the delta format is fixed-length; the ratio is H5's | lever 1 on H5's ratio |
| both < 500 GB/s, single-cherry latency ≪ TPOT | decoding is affordable only off the miss path | the victim tier ([[#app-victim-tier]]), no lever 1 |
| both < 50 GB/s | the decoder is slower than the link | the result is Part VIII's measurement, not a system |

::: theme access-pattern
The leash was the scenario's way of saying "one cherry, cold, now". The speed test is the application's way of saying it in microseconds; a compressor that passes the first and fails the second was never on the miss path.
:::

::: takeaway
- Measure cherries per second cold at three batch sizes, bytes per second against the link, reads touched, single-cherry latency; twice, for both formats.
- Four readings, four next steps, written before the kernel exists.
:::
