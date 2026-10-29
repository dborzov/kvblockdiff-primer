---
title: A synthetic dress rehearsal
nav: Dress rehearsal
group: A dress rehearsal
lede: Before measuring real KV caches, run the whole measurement on made-up data whose answer is known. If the method cannot find what was planted, or finds what was not, it is broken — and a shuffle shows which.
cards:
  - q: Why rehearse the measurement on synthetic data before touching a real KV cache?
    a: Its structure is known, so the method must recover what was planted — and find nothing where nothing was planted
    wrong: ["Synthetic data compresses better, so the results look good", "Real KV caches cannot be read from a GPU", "It replaces the real measurement"]
    why: A known answer turns the data itself into a test of the code. It says nothing about KV caches.
    sec: recipe
  - q: What does the shuffle control do?
    a: Permutes tokens across sequences and reruns everything; every gain that depends on neighbours must vanish
    wrong: ["Reorders the channels of each entry", "Shuffles the dictionary types", "Drops a random half of the tokens"]
    why: After shuffling, a block's tokens are strangers to each other. A block-local gain that survives is a bug or a bias.
    sec: recipe
  - q: In the rehearsal, at which block size is the loc rate lowest, and why?
    a: At 2048 tokens — the true length of the planted blocks
    wrong: ["At 128 tokens — smaller blocks always fit better", "At 8192 tokens — the dictionary is cheapest there", "It does not depend on the block size"]
    why: Smaller blocks pay more for their dictionaries and fit noisier; larger blocks straddle two planted blocks and fit neither.
    sec: shapes
  - q: What does the 256-centroid VQ do in the rehearsal?
    a: It needs blocks of 8K just to pay for its codebook, and then is no better than loc
    wrong: ["It beats every other type at every block size", "It matches the KLT bound", "It wins only at small blocks"]
    why: On bell-shaped data a codebook only recovers, with a tax, what cheaper dictionaries get anyway — as VI.7's napkin predicted.
    sec: shapes
  - q: In the shuffled run, the KLT bound still dips below the global KLT line at small blocks. What does that reveal?
    a: The bound fits its own noise there — read it only at blocks much longer than d, and against its own shuffled value
    wrong: ["Shuffling failed to remove the structure", "The data has real token-level structure", "The global line was computed wrongly"]
    why: A 64×64 covariance estimated from 128 tokens fits those very tokens. The shuffle control exposes the bias, which is exactly its job.
    sec: shapes
---

An orchestra rehearses in an empty hall before it plays for an audience. A measurement deserves the same courtesy. Wave 1 of the plan will measure, on real KV caches, how many bits each dictionary type saves at each scope. Before that, the whole pipeline was run on data invented for the purpose — data whose answer we know, because we planted it.

::: note warning What this is not
Nothing on this page is a result about KV caches. It checks that the **method** produces the right shapes and that its control works. The numbers belong to the recipe below, not to any model.
:::

## A world with a known answer {#recipe}

The synthetic entries have $\vd = 64$ elements. Each element is a sum of five planted parts, each with its own [[scope]]:

| planted part | share of variance | who should capture it |
|:--|--:|:--|
| a global rank-8 subspace | 40 % | a global rotation |
| a per-request offset | 10 % | request loc |
| a per-block offset | 20 % | block loc, best at $\vb$ = 2048 |
| a per-block rank-2 subspace | 10 % | a block rotation |
| white noise | 20 % | nothing at all |

The true blocks are 2048 tokens long and line up with the block grid — kinder than real data will be. Values are rounded to integers on an 8-bit grid (±127; standard deviation 30 steps, 0.007 % clipped). Four test requests of 16,384 tokens are measured; 32 other requests serve as the calibration corpus for the global dictionaries.

Every rate is in [[bpe]] with everything included, as the harness will count it:

- **residual bits** under a per-channel discretized [[laplace]] model fitted on the scope's own data (for global scope, fitted on the calibration requests and charged on the test requests);
- **per-entry tax**: [[vq]]'s 8-bit index, [[sib]]'s pointer to the nearest *earlier* entry of its block (so the block decodes in order);
- **dictionary**, amortized as $8\vw/\vb$: [[loc]] $\vw = 2$, VQ $\vw = 257$. The [[klt]] line is a **bound**: its basis is not charged.

The control is the most important part of the design.

::: define shuffle-control
- **What:** pool the tokens of many requests (here 32), permute them at random across sequences, and rerun every measurement.
- **What must happen:** every gain that depends on neighbours being neighbours vanishes. Request and block dictionaries fall back to the global rate.
- **What it catches:** a bug, a leak of future tokens, or a method that fits its own noise. A gain that survives shuffling is not about the data.
:::

Here is the whole idea in a dozen lines: a block offset is planted, the block gain is measured, the tokens are shuffled, the gain is measured again.

```python the shuffle control on a toy with planted block offsets
import numpy as np
rng = np.random.default_rng(0)
offsets = rng.normal(0, 14, (32, 1, 64))                  # 32 true blocks: one offset per channel
x = np.rint(offsets + rng.normal(0, 20, (32, 2048, 64)))   # 2048 tokens each, plus white noise

def bits(r):                     # Gaussian estimate of bits per element, channel by channel
    return np.mean(0.5 * np.log2(2 * np.pi * np.e * r.var(axis=0)))

def gain(x):                     # global loc minus block loc (each block subtracts its own mean)
    flat = x.reshape(-1, 64)
    return bits(flat - flat.mean(0)) - np.mean([bits(b - b.mean(0)) for b in x])

shuffled = rng.permutation(x.reshape(-1, 64)).reshape(x.shape)   # tokens across blocks
print(f"block gain {gain(x):.3f} bit, after shuffling {gain(shuffled):.3f} bit")
# block gain 0.281 bit, after shuffling 0.001 bit
```

The exchange rate predicts $\tfrac12\log_2(596/400) \approx 0.29$ bit for this toy; the code finds 0.28, and nothing once the tokens are shuffled.

Here is what that looks like, for one channel of the same recipe — 32 blocks again, but only their first 64 tokens, generated in your browser.

::: dataset fig-hwb-planted homework-planted view=original,shuffled metrics=pred,gain,shuf
**The shuffle control, seen.** *In order:* one channel of the toy, 32 blocks of 64 tokens (thin grey lines separate the blocks); each dot is a value in codes, each red segment the block's mean — the prediction a block loc dictionary would store. *Shuffled:* the same 2,048 values dealt at random across the blocks, with the new block means. The Numbers tab gives the gain the recipe predicts and the block gain measured on each version. Synthetic, seeded (planted offsets of spread 14, noise of spread 20, rounded to whole codes).
:::

In order, the red segments step up and down by tens of codes, and the measured gain is close to the predicted 0.29 bit. Shuffled, every segment lies on zero, and the gain is gone. Nothing about the values changed, only which values are neighbours.

::: takeaway
- Synthetic data with planted structure at known scopes makes the method testable: it must find what was planted, at the right scope, and nothing else.
- The shuffle control reruns everything on tokens permuted across sequences; block and request gains must vanish.
:::

## What the plots must look like {#shapes}

::: figure fig-hwb-rehearsal hwbRehearsal wide
**The scope ladder on synthetic data.** Horizontal axis: block size $\vb$ in tokens (log scale, 128 to 8K). Vertical axis: lossless rate in bits per element, everything included (lower is better; raw is 8). Curves with dots: the four dictionary types at block scope — loc (teal), the KLT bound (purple, dashed; basis not charged), VQ with 256 centroids (amber; arrows mark points off the top of the chart) and sib (rose). Flat lines: the same type at global scope (dark blue) and at request scope (plum, dotted), for loc and KLT. The vertical line is the planted block length. Toggle between the original data and the shuffle control (tokens permuted across 32 requests); buttons show or hide each type. Hover a dot for its split into residual, per-entry tax and dictionary. Computed by `analysis/homework_b_rehearsal.py` (numpy, seeded; about half a minute on four idle cores). **Synthetic data: a check of the method, not a result about KV caches.**
:::

Read the original data first.

1. **The ladder has the right order.** For loc: global 7.01, request 6.91, best block 6.75 bits. So $\vgainreq \approx 0.10$ and $\vgainblk \approx 0.16$ bit — close to the 0.08 and 0.18 that the exchange rate predicts for 10 % and 20 % of planted variance.
2. **loc bottoms out at the planted block length.** Shorter blocks pay more for their dictionaries and estimate them from fewer tokens; longer ones straddle two planted blocks and fit neither. On real data, the position of this minimum is the drift scale of the KV cache.
3. **sib matches loc** (6.71 against 6.75 at 2048): the nearest sibling brings the block's offset for free but doubles the noise.
4. **VQ needs 8K-token blocks just to pay for its codebook** (9.6 bits at 512), and then reaches 6.74 — no better than loc at 2K. That is the rate–distortion napkin of [[#homework-vq]], reproduced.
5. **The KLT bound sits 0.55–0.8 bit below loc.** That is the room a rotation could add on top, if a lossless one could be built and paid for.

Now switch to the shuffle control.

- **loc collapses onto its global line** (7.01 at 8K): $\vgainreq$ and $\vgainblk$ fall to 0.006 and −0.001. sib and VQ end up above it. The control works.
- **The KLT bound does not quite collapse.** It sits 0.06 bit under its global line at large blocks and 0.16 bit under at 128 tokens. A 64×64 covariance estimated from 128 tokens fits those very tokens; and a pool of 32 requests is still a finite world with its own quirks. That is a bias of the bound, not structure in the data — exactly what the control is for.

The lesson for wave 1: compare each curve with *its own* shuffled value at the same $\vb$, not with the global line. For the KLT bound at 2048 that gap is 0.60 bit; for loc it is 0.26.

::: theme controls
Here the control earned its keep twice: it showed the planted gains vanish when they should, and it caught a bound that looked better than it was at small blocks. Without the shuffle, that 0.16 bit would have read as a discovery.
:::

::: note practice What wave 1 must reproduce
On real KV the same three plots come out per layer, for keys and values separately: the original curves, the shuffled curves, and their gap. The gap at the best $\vb$ is $\vgainblk$ — fallen-apple similarity in bits. The script is the seed of the [[#plan-harness-interface|harness]] and its [[#plan-controls|controls]].
:::

::: takeaway
- On planted data the method finds the ladder (global > request > block), the planted block length, sib ≈ loc, and a codebook that does not pay.
- The shuffle control erases the block and request gains — and exposes the KLT bound's optimism at small blocks.
- Real gains are read against the shuffled curve at the same block size.
:::
