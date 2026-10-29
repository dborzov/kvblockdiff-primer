---
title: Four controls, built before any real data
nav: Four controls
group: The harness
lede: A new thermometer goes into ice water and boiling water before it goes near a patient. The harness gets four such tests, each designed to expose one specific way the measurement could lie — and they were all run, on synthetic data, for this page.
cards:
  - q: What does the synthetic-truth control check?
    a: That the harness recovers structure planted in generated data with a known answer
    wrong: ["That real KV data is compressible", "That the GPU decoder is fast enough", "That the dictionary fits in HBM"]
    why: If the gain does not peak at the planted block length, or does not match the float-domain measurement of the same sample, the method is broken before any real data arrives.
    sec: four
  - q: After the shuffle control, which gain must vanish?
    a: Every block-local gain — on the synthetic set, g_blk fell from 0.342 to −0.004 bit
    wrong: ["The global solo rate", "Every gain, including the request-scope gain", "Only the gain of VQ"]
    why: 'Shuffling entries across sequences destroys neighbourhoods. A block dictionary has nothing local left to exploit; any block gain that survives is a bug or overfitting.'
    sec: four
  - q: 'On the synthetic set, the shuffled request gain stayed at about 0.13 bit. Why?'
    a: The global dictionary was fit on too few calibration sequences, so the evaluation data as a whole differs from it — a calibration gap, not request structure
    wrong: ["The shuffle was not random enough", "Request scope always gains 0.13 bit by definition", "The round trip failed"]
    why: 'After the shuffle every "request" is a sample of the whole evaluation pool, and the pool''s average differs from the calibration data''s. More calibration sequences shrink the gap (0.22 → 0.12 → 0.07 bit for 2, 8, 32 sequences).'
    sec: run
  - q: What bug does the round-trip control catch that the rate numbers never would?
    a: 'A lossy step: e.g. residuals computed in int8 wrap around (120 − (−100) becomes −36), so decoding gives the wrong code'
    wrong: ["A dictionary that is too big", "A block size that is too small", "Keys and values being mixed up"]
    why: Rates are computed from the residuals; a wrapped residual is small and looks cheap. Only rebuilding the entry and comparing it bit by bit reveals that it is wrong.
    sec: four
  - q: What does the scope-consistency control compare?
    a: Request scope against block scope with b equal to the whole sequence — they must agree to the bit
    wrong: ["Keys against values", "E4M3 against INT8", "The entropy rate against the fixed-length rate"]
    why: The two code paths must describe the same thing. A dropped partial block or a different amortization denominator shows up as a difference.
    sec: four
---

A new clinical thermometer is not first tried on a patient. It goes into ice water, where it must read 0 °C, and into boiling water, where it must read 100 °C. Only a thermometer that passes both is trusted on a fever.

The [[harness]] is a thermometer for "how alike are KV entries". Before it sees a single real entry, it gets four tests with known readings. Each one is aimed at one specific way the measurement could fool us.

## Four ways to be fooled {#four}

| control | what it does | the failure it catches | passing looks like |
|---|---|---|---|
| **1. Synthetic truth** | run on generated data with planted global, request and block structure | a method that cannot see structure, or sees it at the wrong scale | the block gain peaks at the planted block length and matches the float-domain gain of the same sample |
| **2. Shuffle** | permute entries across all evaluation sequences, rerun | in-sample overfitting, leaks from the test data, any "local" gain that is not local | every block-local gain vanishes |
| **3. Scope consistency** | request scope versus block scope with $\vb = \vL$ | two code paths that silently disagree | equal to the bit |
| **4. Round trip** | rebuild every entry from its dictionary and delta; for one block, from real packed bytes | any lossy step hidden in the pipeline | bit-exact, every time |

Each failure deserves an example.

1. **Synthetic truth.** Suppose the block loop had an off-by-one and every "block" straddled two true blocks. The gain would still be positive — just smaller, and peaking at the wrong size. Without a planted answer, nobody would notice.
2. **Shuffle.** A dictionary fit on 512 entries always explains a little of those 512 entries by chance. That is not [[fallen-apple|fallen-apple similarity]]; it is the fit memorizing its own data. After the [[shuffle-control|shuffle]] no neighbourhood is left, so whatever gain remains is exactly this artefact (or a bug).
3. **Scope consistency.** In a real system the per-request dictionary is fit at admission, by different code than the per-block ones. If the block path drops a partial last block, or divides the dictionary's bytes by the wrong count, the two paths disagree. The harness refuses a sequence length that is not a multiple of $\vb$ for this reason.
4. **Round trip.** The quietest bug of all. Store residuals in 8-bit integers and $120 - (-100)$ wraps around to $-36$. The residual looks small and cheap; the rate improves; and the entry that comes back is wrong. Rates are computed from residuals, so only rebuilding the entry catches it.

::: theme controls
Every control here exists because a specific mistake would otherwise produce a plausible, publishable number. A gain is only believable next to the control that could have destroyed it.
:::

::: takeaway
- Synthetic truth checks that structure is found at the right scale.
- The shuffle checks that a "local" gain is really local.
- Scope consistency checks that two code paths agree; the round trip checks that nothing is lost.
:::

## The controls, run {#run}

The harness was run on a tiny synthetic set, so these controls are not a promise but a result. The set has:

- 4 evaluation sequences and 8 calibration sequences of 8192 entries, $\vd = 64$ channels;
- per channel, a request offset, a block offset (true block length 2048) and noise, each with variance 1 in units of the channel's scale;
- one channel in sixteen with a large constant mean, like the outlier channels of keys before [[rope|RoPE]];
- codes in [[integer-grid|INT8]] (one scale per channel) and in [[fp8|E4M3]] (one power-of-two scale), both fit on calibration only.

::: figure fig-plan-controls-run planControlsRun
**The harness on synthetic data, with the shuffle control.** Rate of the [[loc]] dictionary (with its per-channel predict-or-not flag) in bits per element, against block size $\vb$ (log scale). Solid lapis: block scope on the original data; dashed vermilion: the same after shuffling entries across sequences. The last point, $\vb$ = 8192 (the whole sequence), is request scope. Dashed peacock lines: global scope (fit on calibration). Grey line: solo coding, rung 0. Dotted vertical line: the planted block length. Computed by `analysis/plan_harness.py`; 4 sequences × 8192 entries × 64 channels. Switch the number format, the rate and the data shown.
:::

What the run printed, for INT8 and the entropy rate:

- **Synthetic truth: passed.** The block gain peaks at $\vb = 2048$, the planted length. The harness measures $\vgainreq = 0.459$ and $\vgainblk = 0.342$ bit; the float-domain location gains of the same sample ([[#plan-experiment-1a]]) are 0.407 and 0.368. The small differences are the Laplace model's misfit and the dictionary charges.
- **Shuffle: passed, with a surprise.** $\vgainblk$ falls to −0.004 bit. But $\vgainreq$ only falls to 0.131.
- **Scope consistency: passed**, to the bit, for every coder, format and data set.
- **Round trip: passed.** Every block's residuals decode exactly. One block of 2048 entries was also packed into real bytes and each entry rebuilt alone: a delta averages 56.05 bytes against 64 raw, and the fixed-length rate (7.006 bits per element) equals the packed bit count exactly.

::: note warning The surprise: a calibration gap
Why does the request gain survive the shuffle? After shuffling, every "request" is a random sample of the whole evaluation pool. The global dictionary was fit on different sequences, so the pool's average differs from it, and a per-request dictionary picks that difference up. It is not request structure; it is a **calibration gap**. More calibration data shrinks it (float domain, 8 evaluation sequences):

| calibration sequences | 2 | 8 | 32 |
|---|---|---|---|
| shuffled $\vgainreq$ (bit) | 0.217 | 0.115 | 0.069 |

The source plans **two** calibration sequences. Our read: dump many more (each costs about 200 MB), and always report $\vgainreq$ next to its shuffled value.
:::

::: aside detail Why not compare with the generator's "true" values?
The generator's textbook gains are $\tfrac12\log_2 \tfrac{3}{2} = 0.29$ bit (request) and $\tfrac12\log_2 2 = 0.50$ bit (block). With only four true blocks per sequence, a request's own location already absorbs a quarter of the block offsets, and the calibration gap adds to the request side. The fair yardstick is the float-domain measurement of the very same sample, which is what the control uses.
:::

::: try
1. Switch to E4M3 and the fixed-length rate. The solid curve barely dips: the grid takes most of the gain back ([[#plan-fp8-target]]).
2. Show "shuffled" only. The curve is flat and sits on its global line minus the calibration gap.
3. Compare $\vb = 256$ with $\vb = 2048$ on the original data: the small blocks pay more dictionary for no extra structure.
:::

::: takeaway
- All four controls pass on synthetic data; block-local gains vanish under the shuffle (0.342 → −0.004 bit).
- The shuffle exposes a calibration gap of 0.13 bit in the request gain: two calibration sequences are too few.
- Report every gain next to its shuffled twin.
:::
