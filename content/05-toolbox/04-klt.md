---
title: 'KLT: the Compass, at work'
nav: 'KLT: the Compass, at work'
group: Predictor stages
lede: 'In Part II the KLT turned two thermometers into an average and a difference. As a dictionary stage it does the same in hundreds of dimensions: it stores a rotation and codes each cherry along the data''s own axes. It pays off only when a few axes hold almost everything, its basis is heavy, and on 8-bit codes it carries a rounding tax the first plan missed.'
cards:
  - q: How much does a full KLT basis weigh for cherries of d elements, stored in BF16?
    a: 2d cherries' worth (d × d numbers at 2 bytes each)
    wrong: ["2 cherries' worth", "d cherries' worth", "log₂ d bits per cherry"]
    why: 'A cherry is $\vd$ bytes at 8 bits per element; a $\vd \times \vd$ matrix in BF16 is $2\vd^2$ bytes, $2\vd$ cherries. For the Bench''s 512-element cherry that is $\vw = 1024$; a rank-16 partial basis is 32.'
    sec: dictionary
  - q: '64 standardised furrows: 8 directions with variance 10, the other 56 with variance 1. The KLT gain is about…'
    a: 0.34 bit per element
    wrong: ["3 bits per element", "1 bit per element", "0.03 bit per element"]
    why: 'AM = (80 + 56)/64 = 2.125; GM = 10^(8/64) = 1.33; ½ log₂(2.125/1.33) = 0.34. "Low-rank-ish" is not enough; the weak directions must be nearly empty.'
    sec: gain
  - q: By how much did fixed rotations (DCT, Hadamard, random) lose on the Bench's values, and why?
    a: 'By 0.28 to 0.32 bit per element: rotating then rounding costs about a quarter of a bit, and element numbers carry no neighbourhood for a DCT to use'
    wrong: ["By 2.5 bits, the weight of a full basis", "They won by 0.25 bit on the middle layers", "By 0.004, the same as joining the layers"]
    why: Rounding after a rotation costs the lattice constant, 0.2546 bit per coordinate (measured 0.29 to 0.32). Linear prediction subtracts a guess and never rounds the vector, so it never pays.
    sec: measured
---

Look at furrows 1 and 3 of the toy punnet of [[#toolbox-the-bill]]: `[12, 15, 10, 13, 15, 11]` and `[40, 44, 38, 42, 45, 39]`. When one goes up, so does the other. Their covariance has eigenvalues 12.08 and 0.06: nearly all the spread of the pair lies along one direction. Turn the axes to that direction and its partner, and the second coordinate is almost always zero. That is the Compass, [[klt]], from [[#school-rotation]], and as a stage it is a rotation the receiver holds.

## The Compass as a dictionary {#dictionary}

::: aside reminder KLT, eigenvalues and lifting (II.15, II.16)
- The [[klt|KLT]] rotates the axes to the directions along which the data spreads most ([[pca]]). The spread along each new axis is an [[eigenvalue]] $\vlambda$ of the [[covariance-matrix]].
- The [[transform-coding-gain]] is the bits a rotation saves: $\tfrac12\log_2$ of [[am-gm|AM/GM]] of the eigenvalues.
- [[lifting]]: a rotation in floating point followed by rounding is not lossless; lifting splits it into integer steps that undo exactly ([[#toolbox-lifting]]).
:::

```python the KLT stage: fit a basis, rotate exactly, code coordinate by coordinate
def fit(punnet):                                           # or a whole sequence, or a calibration corpus
    X = standardize(punnet)                                # centre and scale each furrow first (the Compass contains an Anchor)
    lam, basis = np.linalg.eigh(np.cov(X.T))               # eigenvalues and eigenvectors of the (d, d) covariance
    return basis[:, ::-1].astype(np.float16), loc_scale    # strongest axis first; 2 d^2 bytes (BF16 in the store)

def encode(cherry, dictionary):
    basis, loc_scale = dictionary
    return lift_rotate(cherry, basis)                      # integer coordinates along the new axes, undoable exactly

def decode(coords, dictionary):
    basis, loc_scale = dictionary
    return unlift_rotate(coords, basis)                    # the same integer shears, backwards
```

- **Dictionary.** An orthogonal basis, a $\vd \times \vd$ matrix, plus the furrow locations the data is centred by. In BF16 the basis is $2\vd^2$ bytes, so $\vw = 2\vd$: 1024 cherries' worth for the Bench's `(2, 256)` cherry, 1280 for the Pin's 640 elements. A **partial** basis keeps only the 16 strongest directions: $\vw = 32$.
- **Per-cherry tax.** None for the full basis: the $\vd$ rotated coordinates *replace* the cherry. The partial basis pays one: the cherry's 16 coefficients along the kept directions must travel in the delta, on top of the residual of all $\vd$ elements.
- **Losslessness.** Only through a lifted rotation ([[#toolbox-lifting]]). The campaigns never built one; they computed what it could save and found a tax even lifting cannot remove (below).

| version | weight $\vw$, $\vd = 512$ | per-cherry tax | dictionary line at $\vb = 4096$ |
|:---|---:|:---|---:|
| full basis | 1024 | none | 2.0 bits per element |
| rank 16 | 32 | 16 coefficients | 0.06 bit per element, plus the coefficients |

Charged to a single punnet of 4096, a full basis costs more than any plausible gain. A full KLT is affordable only when a whole sequence shares it, or when it is fit once on a calibration corpus and never charged per punnet ([[#scenario-scope]]).

::: theme amortize
The basis is the heaviest dictionary in this Part. Spread over one punnet it costs more than it can save; spread over a sequence of 100K tokens, or fit once for every sequence, it is nearly free. What it buys is the same in all three cases; only the number of cherries sharing its price changes.
:::

::: takeaway
- The KLT stores a rotation plus furrow locations: $\vw = 2\vd$ in BF16; rank 16 is $\vw = 32$ with a coefficient tax per cherry.
- A full basis per punnet is unaffordable; per sequence or global, it is cheap.
:::

## What it buys: a spiky spectrum {#gain}

Two spectra of 64 standardised furrows (each scaled to variance 1 first, so the spectrum averages 1):

- **Mildly low-rank:** 8 directions with variance 10, the other 56 with variance 1. Gain **0.34 bit** per element.
- **Sharply low-rank:** 8 directions with variance 50, the other 56 with 0.1. Gain **2.43 bits** per element.

The difference is not how many directions are strong; it is how *weak* the rest are:

$$
\vgain_{\text{KLT}} \;=\; \frac12 \log_2 \frac{\overbrace{\tfrac{1}{\vd}\textstyle\sum_{\vi} \vlambda_{\vi}}^{\text{AM: average spread}}}{\underbrace{\big(\textstyle\prod_{\vi} \vlambda_{\vi}\big)^{1/\vd}}_{\text{GM: geometric average}}}
$$ {#eq-toolbox-klt}

Standardising first matters: each furrow's own spread is already paid for by the solo table, so only correlation *between* furrows counts. The geometric average is dragged down by the small eigenvalues, so the gain is large only when most directions carry almost nothing. On the toy pair the formula gives 1.43 bits per element, but six cherries make a spectrum of two points, so treat that as the mechanism, not a measurement.

::: figure fig-toolbox-klt-spectrum hwaKltSpectrum
**The spectrum decides the KLT's gain.** Bars: the 64 eigenvalues of a toy standardised covariance, sorted, on a logarithmic axis: some strong directions (count and variance set by the sliders) and the rest weak (variance set by the third slider). Lines: the arithmetic average (AM) and the geometric average (GM). The tiles give the gain $\tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$ in bits per element, and the punnet size $\vb$ above which a full basis pays for itself ($8\vw/\vb$ below the gain), for $\vd = 64$ and for the same spectrum shape at $\vd = 640$. Illustrative spectra; Gaussian data assumed.
:::

::: try
1. Set 8 strong directions at variance 10 and the weak ones at 1: 0.34 bit.
2. Raise the strong variance to 50 and lower the weak one to 0.1: 2.43 bits.
3. Keep the weak ones at 1 and push the strong ones to 100. The gain stops near 1.5 bits, below the 50-against-0.1 spectrum: strong directions alone do not make a spiky spectrum, weak ones do.
:::

**When the Compass wins:** a sharply spiky standardised spectrum, and a scope wide enough to pay for the basis. **When it cannot:** a flat spectrum (nothing to gain), one punnet paying for the basis, and, on integer codes, the rounding tax of the next section.

::: takeaway
- $\vgain_{\text{KLT}} = \tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$ of the standardised eigenvalues: large only for a sharply spiky spectrum.
- Low-rank-ish is worth tenths of a bit; sharply low-rank is worth bits; the basis belongs to sequences or to the whole LLM, not to single punnets.
:::

## What the campaigns found {#measured}

The second campaign tried the fixed rotations of transform coding, the DCT of JPEG, the Hadamard transform and a random rotation, as code-length estimates on two heads of the Bench's values (layers 3 and 11). All three behaved as one transform, agreeing within 0.002, and all three *lost*, by **+0.28 to +0.32 bit per element** at best ([[#measured-codebooks-and-rotations]]). Two reasons, each enough on its own. First, rotating a vector of integers and rounding puts the data on a new square grid in many dimensions, and that rounding costs the lattice constant, 0.2546 bit per coordinate (measured 0.29 to 0.32); a lifted rotation makes the step reversible, it does not make the rounding free. Second, a DCT assumes position 17 of a vector is related to position 18, and in a value cherry the mean correlation between elements at the same index equals the mean over any pair (0.0734 at layer 11): element numbers carry no neighbourhood. The cross-element geometry the Compass was meant to catch was caught instead by [[#toolbox-linear-prediction]], which subtracts a guess from each element and never rounds the vector; it took one screen from 0.690 to 0.636. PCA and OPQ, tried alongside the codebooks, moved the distribution of delta sizes not at all. Of the 62 techniques in the campaign's close-enough family, 21 have a real compressor and 18 only a bound, so the branch is thinner than it is closed.

::: aside source Receipts
Fixed rotations and the lattice constant: r11 iter-1-1 (exact model, L3 h0 and L11 h0). Same-index correlation 0.0734: the same page. PCA, OPQ, binary codes and LSH: r26 iter-1-3. Coverage count 62 / 21 / 18 / 16 / 7: r25 iter-1-1. Notes: `notes/03-structure-and-method.md` §3; PART-XI-SPEC §1.7 and §1.12 ("the rounding tax was missed").
:::

::: takeaway
- Fixed rotations lost 0.28 to 0.32 bit per element on the Bench's values; a quarter of that is the price of rounding a rotated vector.
- The correlation between elements is real, and a stage that predicts without rotating collects it.
:::
