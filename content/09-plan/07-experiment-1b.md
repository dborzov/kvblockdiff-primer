---
title: 'Experiment 1b: the exact lossless ladder'
nav: 'Experiment 1b'
group: 'Wave 1: one weekend'
lede: 1a promised; 1b pays in real bits. Every dictionary type, at every scope, in both 8-bit grids, with both rates and every tax — and every entry rebuilt bit for bit along the way.
cards:
  - q: Which rungs does experiment 1b climb?
    a: loc, the KLT bound, a rank-16 partial KLT, VQ with 256 centroids on 64-element pieces, and sib
    wrong: ["Only loc and VQ", "BF16, FP8 and INT8", "Global, request and block"]
    why: Global, request and block are the scopes each rung is run at. The rungs are the dictionary types, from the lightest to the heaviest.
    sec: grid
  - q: 'Why is a 256-centroid VQ codebook pointless at $\vb = 512$ for 1024-element entries?'
    a: 'Its dictionary share $8\vw/\vb$ is about 4 bits per element, more than any plausible saving'
    wrong: ["Because k-means does not converge on 512 entries", "Because VQ cannot be lossless", "Because 512 is not a power of two"]
    why: '$8 \times 259 / 512 \approx 4$. The same codebook costs a quarter of a bit at 8K and 0.06 bit at request scope.'
    sec: grid
  - q: In the harness, what decides whether a dictionary is global, request or block scope?
    a: Which fitting set the harness hands to fit() — calibration codes, the whole sequence, or the block itself
    wrong: ["A scope flag inside each coder", "The block size alone", "Whether the coder is light or heavy"]
    why: Coders never choose their scope. The harness chooses what they may see and who pays for the result.
    sec: code
  - q: 'On the synthetic set, why is solo coding''s fixed-length rate exactly 8.0 bits?'
    a: The plain fixed-length format cannot shorten raw 8-bit codes that use the whole range — a straw-man baseline
    wrong: ["Because solo coding is broken", "Because the synthetic data is random", "Because the dictionary share is 8 bits"]
    why: A zero-centred channel spans nearly all 255 codes, so its field needs 8 bits. A real solo baseline must split off the exponent, as SplitZip does, or the fixed-length gains look larger than they are.
    sec: printed
---

Experiment 1a measured how much a cheap prediction *could* explain, in floats. Experiment 1b takes the same data, rounds it to 8 bits ([[#plan-fp8-target]]), and runs every dictionary type through the [[harness]]. Each number that comes out is a real, exact, fully charged rate.

## The rungs and the scopes {#grid}

The ladder has five rungs, from the lightest dictionary to the heaviest ([[#homework-four-side-by-side]]).

1. **[[loc]]** — a location per [[channel]]. The cheapest; no per-entry tax.
2. **The [[klt|KLT]] bound** — computed from the eigenvalue spectrum, not coded. It says whether a lossless rotation would be worth building at all.
3. **KLT, rank 16, with explicit coefficients** — an upper-cost stand-in for a lossless transform: 16 basis vectors in the dictionary, 16 coefficients in every delta.
4. **[[vq|VQ]]** — 256 [[centroid|centroids]] on 64-element pieces of the entry (a [[product-quantization|product quantizer]]). The heaviest dictionary.
5. **[[sib]]** — predict an entry from its nearest sibling in the same block, leave-one-out. Almost no dictionary, but the noise doubles.

Each rung runs at [[scope-global|global]] scope, [[scope-request|request]] scope and [[scope-block|block]] scope with $\vb \in \{512, 2\text{K}, 8\text{K}\}$; in [[fp8|E4M3]] and [[integer-grid|INT8]]; with both rates; for keys and values of all six layers; and once more on shuffled data. Before running anything, it pays to see what each cell will cost in taxes alone.

::: figure fig-plan-ladder-grid planLadderGrid wide
**What each rung pays at each scope, before it saves anything.** Rows: the five rungs; columns: the scopes (request = a 32K-token sequence). Cells: bits per element for an entry of $\vd = 1024$ elements — the dictionary share $8\vw/\vb$, the per-entry side channel, or their sum. Weights include 3 bytes per channel of coder settings: loc $\vw = 4$, KLT rank 16 $\vw = 35$, VQ $\vw = 259$, sib $\vw = 3$. Side channels: KLT 16 coefficients at an **assumed** 8 bits; VQ one byte per 64 elements; sib $\log_2 \vb$ bits per entry. Global scope is charged nothing; sib has no global form. Green: under 0.1 bit; saffron: 0.1–0.5; red: over 0.5, which likely eats the whole gain. Switch what is shown.
:::

::: try
1. Switch to "dictionary share" and read the VQ row from right to left: 4.05, 1.01, 0.25, 0.06 bits. VQ at $\vb = 512$ is not worth running.
2. Switch to "side channel". KLT and VQ pay 0.125 bit per element at *every* scope — a tax that no block size amortizes.
3. Find the loc row. Green everywhere: this is why loc goes first.
:::

::: takeaway
- Five rungs × five scopes × two grids × two rates × keys and values × six layers — plus the shuffled twin.
- The taxes alone rule out some cells (VQ at 512) before any data is touched.
- Light dictionaries are free at every scope; heavy ones only at request scope or very large blocks.
:::

## The code {#code}

The source sketched 1b as two functions, `rung` and `ladder`. The harness keeps their shape and fixes what they left open. Scoring one block is one function; scoring a scope is another.

```python scoring a coder at one scope (analysis/plan_harness.py)
MODEL_BYTES_PER_CHANNEL = 3   # the coder's own settings: centre m, scale beta, width n (a byte each)


def rate_of(coder, X, F, charge, grid):
    """bpe (entropy rate, fixed-length rate) of block X, with the dictionary and the coder model fit
    on F. charge=True: X pays for its dictionary (scopes request and block); global scope is free.
    grid = grid_values(fmt). Our coders are additive, so the prediction is P = X - r."""
    D = coder.fit(F)
    r = coder.encode(X, D)
    assert np.array_equal(coder.decode(r, D), X)                    # control 4, on every block
    rF = coder.encode(F, D)                                         # models see the fitting set only
    m, beta = grid_fit(F, F - rF, *grid)
    n = fl_widths(rF)
    side = side_bits(nbytes(D) + MODEL_BYTES_PER_CHANNEL * X.shape[1], *X.shape) if charge else 0.0
    return float(grid_bits(X, X - r, m, beta, *grid).mean()) + side, fixed_length_rate(r, n) + side


def score(X_eval, X_calib, coder, scope, b=None, fmt="int8"):
    """Mean bpe (entropy, fixed-length) of one coder at one scope, over all evaluation sequences."""
    n_seq, T, d = X_eval.shape
    if scope == "global":            # one dictionary, fit offline on the calibration sequences
        F = X_calib.reshape(-1, d)
        units = [(X_eval[s], F, False) for s in range(n_seq)]
    elif scope == "request":         # one dictionary per sequence, fit on the whole sequence
        units = [(X_eval[s], X_eval[s], True) for s in range(n_seq)]
    elif scope == "block":           # one dictionary per block of b entries
        assert T % b == 0, "a partial last block would be dropped silently"
        blocks = [X_eval[s, j * b:(j + 1) * b] for s in range(n_seq) for j in range(T // b)]
        units = [(X, X, True) for X in blocks]
    else:
        raise ValueError(scope)
    grid = grid_values(fmt)
    return np.array([rate_of(coder, X, F, charge, grid) for X, F, charge in units]).mean(axis=0)
```

What changed against the source's sketch, and why:

- **The fitting set decides the scope.** A coder never knows its scope; the harness hands it calibration codes, a whole sequence or a block.
- **Every model is fit on the fitting set.** The entropy model and the fixed-length widths see only what the dictionary saw.
- **Request scope has its own code path**, so the scope-consistency control has something to compare ([[#plan-controls]]).
- **The entropy model is grid-aware** ([[grid-aware-model]]), so the E4M3 column is not overcharged.
- **The predict-or-not flag is a coder of its own**, `PredictOrNot(Loc())`: a wrapper that stores one bit per channel and passes the same round trip as everything else.
- **Solo coding is scored at global scope only.** A "solo" fit per block would be loc in disguise, because the coder's own model has a centre.

The shuffle control is one more function: entries are permuted across all evaluation sequences, each entry kept intact.

```python the shuffle control's input
def shuffle_tokens(X_eval, seed=0):
    """The shuffle control's input: entries permuted across all evaluation sequences (each entry intact)."""
    n_seq, T, d = X_eval.shape
    flat = X_eval.reshape(-1, d)
    return flat[np.random.default_rng(seed).permutation(n_seq * T)].reshape(X_eval.shape)
```

::: takeaway
- One function scores a block, one scores a scope; the fitting set is the only thing that makes scopes differ.
- Every model is fit on the fitting set, every block is round-tripped, partial blocks are refused.
- A rung is a small class; the harness does the rest.
:::

## What the run printed {#printed}

On the synthetic set of [[#plan-controls]] the harness prints one row per format, coder, data set and rate. Here are six of the rows for the loc dictionary with its flag, and the solo line:

```text analysis/plan_harness.py, synthetic set (4 × 8192 entries × 64 channels)
format coder     data  rate       global  request  best b    bpe  g_req  g_blk
int8   loc+flag  orig  entropy     7.073    6.614    2048  6.272  0.459  0.342
int8   loc+flag  orig  fixed       7.953    7.383    2048  7.012  0.570  0.371
int8   loc+flag  shuf  entropy     7.073    6.943    4096  6.947  0.131 -0.004
e4m3   loc+flag  orig  entropy     6.367    5.906    2048  5.566  0.461  0.340
e4m3   loc+flag  orig  fixed       7.907    7.848    2048  7.687  0.058  0.161
e4m3   loc+flag  shuf  fixed       7.907    7.879    4096  7.883  0.027 -0.004
solo (global): int8 entropy 7.073, fixed 8.0 · e4m3 entropy 6.367, fixed 8.0
```

How to read it:

- **`g_req` and `g_blk`** are the [[scope-gain|scope gains]] $\vgainreq$ and $\vgainblk$: global minus request, and request minus the best block.
- **The best block is 2048**, the planted length, in every original row; after the shuffle the best "block" is the largest one and $\vgainblk$ is zero.
- **E4M3 starts lower** (6.367 bits for solo coding against INT8's 7.073 in the entropy rate): the log grid suits context-free coding. **INT8 keeps more of the gain** in the fixed-length rate. Both effects were predicted on paper ([[#homework-the-grid]]).

And one honest flaw. **Solo coding's fixed-length rate is exactly 8.0 bits** in both formats. The plain fixed-length format cannot shorten raw codes that use the whole range, so against this baseline every dictionary looks good. A fair rung 0 for the fixed-length column splits off the exponent, as [[#papers-splitzip|SplitZip]] does, and saves about a bit on its own. The harness does not have that rung yet; until it does, fixed-length gains over "solo" overstate what dictionaries add.

::: note numbers How long will the real ladder take?
The synthetic ladder (two coders, eight scope settings, original and shuffled, two formats) took 35–45 seconds on one CPU core. The real data is about 770 times larger per scope setting. Scaled linearly, a loc ladder is a few hours of single-core numpy — an estimate, not a measurement. VQ's k-means is the slow rung and runs overnight.
:::

::: takeaway
- On synthetic data the harness finds the planted block length and nothing after the shuffle.
- E4M3 wins solo coding; INT8 keeps more of the dictionary gain in the fixed-length format.
- The fixed-length column still lacks a fair solo baseline (exponent splitting); until then its gains are overstated.
:::
