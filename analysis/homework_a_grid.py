"""VI.11 (homework-the-grid): the 8-bit grid gives with one hand and takes with the other.

Monte Carlo, seeded. One Gaussian channel of n = 400,000 values in blocks of BLOCK values.
Each block j has a mean m_j ~ N(0, R2 * sigma^2); each value is x = m_j + noise, noise ~ N(0, (1 - R2) sigma^2),
so the block means explain a fraction R2 of the variance and the total variance stays sigma^2.
  * INT8: codes = round(x / scale) with sigma = 32 codes; the predictor is round(block mean of the codes).
  * E4M3: x is rounded to E4M3 and replaced by its monotone index (-126..126); three predictors are scored:
      'float'  - the index of the E4M3-rounded block mean of the values  (the "same predictor" as INT8)
      'mean'   - round(mean of the block's indices)
      'median' - the median of the block's indices (the best constant in index steps for a Laplace-like coder)
Bits are order-0 histogram entropies of one channel (one code for the whole channel).
saved = H(codes) - H(codes - prediction).  With the per-channel flag the stored rate is min(H(codes), H(resid)).
Writes figures/data/homework-a-grid.json.
"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from homework_a_fp8 import e4m3_round, e4m3_index, int8_codes, hist_entropy

N, BLOCK = 400_000, 256
NB = N // BLOCK
R2S = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.93, 0.95, 0.97, 0.98, 0.99]
E4M3_SIGMAS = [4.0, 40.0, 100.0]       # real units: the E4M3 result should not depend on the scale
INT8_SIGMA = 32.0                     # codes


def channel(R2, rng, sigma):
    m = rng.standard_normal(NB) * np.sqrt(R2) * sigma
    x = np.repeat(m, BLOCK) + rng.standard_normal(NB * BLOCK) * np.sqrt(1 - R2) * sigma
    return x


def block_pred(codes, how):
    c = codes.reshape(NB, BLOCK)
    if how == "mean":
        p = np.rint(c.mean(1))
    elif how == "median":
        p = np.rint(np.median(c, 1))
    return np.repeat(p.astype(np.int64), BLOCK)


rows = []
for i, R2 in enumerate(R2S):
    row = {"R2": R2, "float_formula": float(0.5 * np.log2(1 / (1 - R2))) if R2 < 1 else None}
    rng = np.random.default_rng(1000 + i)
    z = channel(R2, rng, 1.0)                 # same draw, rescaled per grid / scale
    # INT8
    ci = int8_codes(z * INT8_SIGMA, 1.0)
    Hi = hist_entropy(ci)
    Ri = ci - block_pred(ci, "mean")
    row["int8"] = {"H_raw": Hi, "H_resid": hist_entropy(Ri), "saved": Hi - hist_entropy(Ri)}
    # E4M3 at several scales
    row["e4m3"] = {}
    for s in E4M3_SIGMAS:
        x = z * s
        ce = e4m3_index(e4m3_round(x))
        He = hist_entropy(ce)
        res = {"H_raw": He}
        fm = x.reshape(NB, BLOCK).mean(1)
        pf = np.repeat(e4m3_index(e4m3_round(fm)), BLOCK)
        for how, p in (("float", pf), ("mean", block_pred(ce, "mean")), ("median", block_pred(ce, "median"))):
            Hr = hist_entropy(ce - p)
            res[how] = {"H_resid": Hr, "saved": He - Hr}
        row["e4m3"][str(int(s))] = res
    rows.append(row)
    e = row["e4m3"]["40"]
    print(f"R2={R2:.2f}  float formula {row['float_formula']:.3f} | INT8 H={Hi:.3f} saved={row['int8']['saved']:+.3f} | "
          f"E4M3(40) H={e['H_raw']:.3f} saved float={e['float']['saved']:+.3f} mean={e['mean']['saved']:+.3f} "
          f"median={e['median']['saved']:+.3f} | E4M3(4) float={row['e4m3']['4']['float']['saved']:+.3f} "
          f"E4M3(100) float={row['e4m3']['100']['float']['saved']:+.3f}", flush=True)

out = {"about": "Block-mean prediction on an INT8 grid vs in E4M3 index space; one Gaussian channel, n = 400,000, "
                f"blocks of {BLOCK}; seeded Monte Carlo. Script: analysis/homework_a_grid.py",
       "n": N, "block": BLOCK, "int8_sigma_codes": INT8_SIGMA, "e4m3_sigmas": E4M3_SIGMAS, "rows": rows}
path = os.path.join(os.path.dirname(__file__), "..", "figures", "data", "homework-a-grid.json")
with open(path, "w") as f:
    json.dump(out, f, indent=1)
