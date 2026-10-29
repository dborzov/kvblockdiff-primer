---
title: 'Step 0: the exact 8-bit target'
nav: 'Step 0: the 8-bit target'
group: 'Wave 1: one weekend'
lede: '"Lossless" needs an answer to "lossless compared with what?". Here it is the 8-bit copy of the KV cache, not the original — and the way those 8 bits are numbered turns out to matter for every coder downstream.'
cards:
  - q: What exactly must the store reproduce bit for bit?
    a: The 8-bit (E4M3 or INT8) codes of the KV cache, not the BF16 original
    wrong: ["The BF16 original", "The attention output", "The float32 values before any rounding"]
    why: The rounding to 8 bits is a separate, accepted step (where KV storage is heading anyway). The store's promise starts after it.
    sec: target
  - q: What is the E4M3 index of a value?
    a: Its position among the representable values, counted from zero, with a sign — from −126 to 126
    wrong: ["Its exponent field", "The value times 127 / 448", "Its rank among the values of the block"]
    why: 'In index space one step is one representable value, whatever its size. Conveniently, the index is the byte itself read as a sign-magnitude integer: 8 × exponent field + mantissa field.'
    sec: target
  - q: What bug did the source's e4m3_round have?
    a: It promised to turn −0 into +0, but returned −0.0 for tiny negative values
    wrong: ["It rounded ties away from zero", "It did not saturate at 448", "It produced NaN for zero"]
    why: 'sign(x) × 0 is −0.0 for negative x. The two compare equal in numpy, so the source''s own test passed; a bit-level comparison fails. Adding +0.0 fixes it.'
    sec: target
  - q: Why does a single Laplace bump in index space fit E4M3 codes badly?
    a: A zero-centred channel's E4M3 codes form two humps, one per sign, because the grid is dense near zero
    wrong: ["Because E4M3 has fewer codes than INT8", "Because the Laplace has no scale parameter", "Because E4M3 values are always positive"]
    why: On the log grid, values near zero spread over many tiny steps, so the codes pile up away from index 0 on both sides. On our synthetic set the index-space Laplace charges solo coding 8.4 bits — more than raw.
    sec: coder
  - q: On the synthetic set, how much of the scope gains survives in E4M3's fixed-length rate?
    a: 'About 0.22 bit, against 0.94 bit for INT8'
    wrong: ["All of it — the grid does not matter", "More than in INT8", "Exactly half"]
    why: 'With fixed-length fields, a residual counts grid steps; across zero the E4M3 grid is dense, so residuals are long. The entropy rate with a grid-aware model keeps ≈ 0.80 bit in both formats.'
    sec: coder
---

A photocopy of a contract is not the contract. If a copy shop promises "a perfect copy of your photocopy", it owes you every speck on the photocopy, but nothing about what the photocopy already lost.

Wave 1 makes the same kind of promise. The [[kv-cache|KV cache]] arrives in [[bf16|BF16]]. It is first rounded to 8 bits — a [[lossy]] step, accepted on its own merits, because 8 bits is where KV storage is heading. The [[lossless]] promise of [[kv-blockdiff]] starts *after* that rounding: **the 8-bit codes come back bit for bit**.

## The target is the rounded copy {#target}

The path from a BF16 number to the integer the [[harness]] codes has three steps.

1. **Scale.** Divide by one power of two per layer and per keys-or-values, chosen so that the largest value lands at or below 448, the largest [[fp8|E4M3]] number. A power of two changes only the exponent, so it costs no precision.
2. **Round** to the nearest E4M3 value: ties go to the even mantissa, values beyond 448 saturate, and −0 becomes +0.
3. **Number** the result: its position in the sorted list of representable values, with a sign. This is [[index-space|index space]], from −126 to 126. "One step" now means one representable value, whatever its size.

```python step 0 in numpy (analysis/plan_harness.py)
def e4m3_grid():
    """All non-negative E4M3 values, sorted: 0, 7 subnormals, 15 binades x 8 mantissas
    minus the one NaN pattern = 127 values, from 0 to 448."""
    sub = [m / 8 * 2.0 ** -6 for m in range(1, 8)]
    nor = [(1 + m / 8) * 2.0 ** (e - 7) for e in range(1, 16) for m in range(8)][:-1]
    return np.array([0.0] + sub + nor, dtype=np.float32)


GRID = e4m3_grid()


def e4m3_round(x):
    """Nearest E4M3 value: ties to even, saturate at +-448, and -0 becomes +0."""
    ax = np.minimum(np.abs(x).astype(np.float32), np.float32(448.0))
    e = np.floor(np.log2(np.maximum(ax, np.float32(2.0 ** -6))))   # binade; subnormals share 2^-6
    step = np.float32(2.0) ** (e - 3)                               # 3 mantissa bits: 8 steps per binade
    q = np.minimum(np.rint(ax / step) * step, np.float32(448.0))   # np.rint sends ties to even
    return (np.sign(x) * q + np.float32(0.0)).astype(np.float32)   # adding +0.0 turns -0.0 into +0.0


def e4m3_index(xq):
    """Index space: the monotone integer position of an E4M3 value, in [-126, 126]."""
    r = np.searchsorted(GRID, np.abs(xq)).astype(np.int16)
    return np.where(xq < 0, -r, r).astype(np.int16)


def e4m3_from_index(r):
    return (np.sign(r) * GRID[np.abs(r)]).astype(np.float32)


def int8_index(x, scale):
    """INT8 code of x: the nearest integer to x / scale, clipped to +-127."""
    return np.clip(np.rint(x / scale), -127, 127).astype(np.int16)
```

The source's version of this code had one quiet bug. It promised "−0 → +0" but computed `sign(x) * q`, which is −0.0 for a tiny negative $\vx$. In numpy −0.0 equals +0.0, so the source's round-trip test passed; a bit-level comparison does not. Adding +0.0 fixes it.

The fixed code was tested against a brute-force rounding (nearest grid value, ties to the even index) on 200,514 probe values: every grid point, every midpoint between neighbours (the ties), values from 10⁻⁴ to 10³, and the edge cases −0, ±10⁻⁹, 448, 460 and ±10⁶. All agree, all 253 codes are reachable, and value → index → value is bit-exact.

::: figure fig-plan-e4m3 planE4m3
**One value through step 0.** Slide the scaled value $\lvert\vx\rvert$ (log scale) and pick its sign. Top: thirteen neighbouring E4M3 grid values (upper labels) and their indices (lower labels); the vermilion dot is $\vx$, the accent tick the value it rounds to. Middle: the byte of that value — sign, 4 exponent bits, 3 mantissa bits. Bottom: binade, grid step, rounded value, index, relative error, and what an INT8 grid with the same range (one step = 448/127 ≈ 3.53) would store instead. Computed in the browser with the same rounding as the Python.
:::

::: try
1. Slide from 0.02 up to 400. The grid step grows with the value, so the relative error stays at or below one sixteenth (6.25 %). Below $2^{-6} \approx 0.0156$ the subnormals take over and the step stops shrinking.
2. Read the byte as a sign and a 7-bit number. It *is* the index: 8 × exponent field + mantissa field. Index space costs nothing to compute.
3. Compare with the INT8 row at small values: a uniform grid with the same range stores everything below 1.8 as zero.
:::

::: takeaway
- The lossless target is the 8-bit copy: scale by a power of two, round to E4M3, number the grid.
- In index space one step is one representable value; the index is the byte read as sign and magnitude.
- The step-0 code is fixed (−0) and tested against brute force on 200,514 values.
:::

## What the index does to the coder {#coder}

Numbering the grid is free. Coding the numbers is not, and here the E4M3 grid bites twice.

**First bite: the entropy model.** The source prices residuals with one [[laplace|Laplace]] bump per channel *in index space*. Look at what a zero-centred channel's codes look like on a log grid.

::: figure fig-plan-humps planHumps
**The codes of one channel, and three entropy models.** Histogram (lapis bars) of the codes of 20,000 seeded Gaussian values with standard deviation 20 (in scaled units) and the chosen mean, in E4M3 or INT8 index space (INT8 scale = largest value / 127). Vermilion line: the best single Laplace bump in index space (centre = median code, scale = mean absolute deviation). The readout gives three prices in bits per element: the codes' own histogram (order-0 entropy), the index-space Laplace, and the grid-aware Laplace (below). Switch the format and move the mean away from zero.
:::

On a log grid, values near zero are spread over many tiny steps, so the codes pile up in **two humps**, one per sign, with a hollow in between. A single bump fits that badly. On the synthetic set of [[#plan-controls]] the source's model charges solo coding of the E4M3 codes **8.375 bits per element — more than raw** — while the codes' histogram says 6.128. On INT8, where the codes form one bell, the same model is fine (7.074 against the grid-aware 7.073).

The rehearsal set of [[#plan-controls]] shows the humps in the very codes the harness coded. Its channel 24 is centred almost exactly on zero.

::: dataset fig-plan-synth-codes plan-synth view=codes,int8 hl=nearzero metrics=h4,l4,g4,h8,l8
**The rehearsal set's codes.** Histograms of the 32,768 codes of channel 24 ([[#fig-plan-synth-data]]): its E4M3 index (two humps) or its INT8 code (one bell). Highlight: the values within ±0.25 of zero, about one entry in six. Click a bar to select its entries. *Numbers:* three prices for coding the codes one at a time, averaged over all 64 channels, each model fit on the codes themselves; the harness fits on the calibration set, so its numbers (quoted in each note) differ a little. Synthetic data, seeded.
:::

Switch on the highlight. In E4M3 the values within a quarter of zero are spread over 132 codes, from −72 to 72; in INT8 they share 11. That spread is the hollow between the humps. A single bump in index space puts its peak right in it: exactly one of the 32,768 codes is 0.

::: define grid-aware-model
- **What it is:** an entropy model of the *value*, not of the code number. A Laplace bump in value units, centred on the prediction, gives each 8-bit code the probability of the bump's area over that code's grid cell.
- **Why it works:** on a log grid a value near zero sits in a narrow cell and gets a small probability — exactly the extra bits it really costs. On a uniform grid it reduces to the index-space Laplace.
- **Its price:** on the synthetic set, 6.367 bits for E4M3 solo coding — 0.24 bit above the histogram, a fair cost for a two-number model.
:::

```python the grid-aware model: a value-domain Laplace, integrated over each code's cell
def grid_bits(X, P, m, beta, vals, off):
    """Per channel: bits an ideal entropy coder spends on codes X given predictions P, when its
    model is a value-domain Laplace (centre value(P) + m, scale beta) integrated over each code's
    grid cell. On a log grid, a value near zero sits in a narrow cell and costs more bits."""
    mid = (vals[1:] + vals[:-1]) / 2
    lo, hi = np.concatenate([[-np.inf], mid]), np.concatenate([mid, [np.inf]])   # cell edges
    c = vals[P + off] + m
    zl, zh = (lo[X + off] - c) / beta, (hi[X + off] - c) / beta
    with np.errstate(over="ignore", invalid="ignore", divide="ignore"):
        tail = np.log1p(-np.exp(-(zh - zl)))                     # log(1 - e^-(width))
        right = np.log(0.5) - zl + tail                          # cell wholly right of the centre
        left = np.log(0.5) + zh + tail                           # wholly left
        both = np.log1p(-0.5 * np.exp(np.minimum(zl, 0)) - 0.5 * np.exp(-np.maximum(zh, 0)))
        logp = np.where(zl >= 0, right, np.where(zh <= 0, left, both))
    return -logp.mean(axis=0) / np.log(2)
```

**Second bite: the fixed-length format.** A fixed-length field stores a residual counted in grid steps. Subtract a location that sits across zero from the value, and the residual counts all the dense steps near zero ([[#homework-the-grid]]). On the synthetic set:

:::: compare Scope gains of loc on the synthetic set, by format
::: col INT8 (uniform grid)
- entropy rate: $\vgainreq + \vgainblk$ = 0.459 + 0.342 = **0.80 bit**
- fixed-length rate: 0.570 + 0.371 = **0.94 bit**
- the per-channel flag never matters
:::
::: col E4M3 (log grid)
- entropy rate, grid-aware: 0.461 + 0.340 = **0.80 bit**
- fixed-length rate: global loc costs 8.847 bits, *worse than raw*; with the per-channel predict-or-not flag 7.907, and gains 0.058 + 0.161 = **0.22 bit**
:::
::::

The structure is the same in both formats — the entropy rate says so. What differs is how much of it a simple, fast format can cash in. That is why wave 1 scores both grids and treats INT8 with a per-channel scale as an equal storage choice.

::: theme grid-matters
Here the grid decides twice: which entropy model is even sane (two humps versus one bell), and how much of the same structure a fixed-length format can keep (0.22 versus 0.94 bit on identical data).
:::

::: takeaway
- E4M3 codes of a zero-centred channel form two humps; a single index-space Laplace overcharges them (8.4 bits for solo coding on our synthetic set).
- The grid-aware model prices the value over its grid cell and fixes the entropy column.
- Fixed-length residuals in E4M3 index space keep only a quarter of the gain that INT8 keeps; both grids must be scored.
:::
