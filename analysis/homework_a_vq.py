"""VI.7 (homework-vq): can a k-means codebook win losslessly? The VQ-versus-KLT Monte Carlo.

One block of b = 16,384 vectors in d = 64 dimensions, two synthetic data sets (seeded):
  A. correlated Gaussian: a rank-8 signal (8 random orthonormal directions, variance SIG_A each) + unit noise;
  B. clustered: 32 cluster centres drawn N(0, SIG_B) per dimension, each vector = a random centre + unit noise.
Values are stored as integer codes on a uniform grid (noise standard deviation = STEP codes), so residuals
are exact integers and every rate is a real lossless rate.

For each codebook size C, k-means (k-means++ seeding, Lloyd iterations) is fit ON THE BLOCK ITSELF
(a block-scope dictionary), the centroids are rounded to integer codes, and each vector is coded as
(index of its nearest centroid, exact integer residual). Charged honestly, per element:
  gross = bits the residual saves  = mean over channels of [H(raw codes) - H(residual codes)]  (histograms)
  tax   = index log2(C)/d  +  codebook 8C/b  (C centroids of d one-byte codes, amortized over the block)
  net   = gross - tax
The rotation (KLT) is scored by the transform-coding-gain formula 1/2 log2(AM/GM) of the eigenvalues of the
standardized covariance (Gaussian bound, basis cost NOT charged), and, as a check, by actually rotating the
data and measuring histogram entropies of the rounded rotated coordinates.
Writes figures/data/homework-a-vq.json.
"""
import json, os, sys, time
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from homework_a_fp8 import hist_entropy

B, D = 16384, 64
CS = [16, 64, 256, 1024, 4096]
STEP = 4.0           # codes per unit of noise standard deviation
SIG_A = 16.0         # variance of each of the 8 signal directions (noise variance 1)
SIG_B = 9.0          # variance per dimension of the 32 cluster centres
ITERS = 25


def data_correlated(rng):
    Q, _ = np.linalg.qr(rng.standard_normal((D, 8)))
    return rng.standard_normal((B, 8)) * np.sqrt(SIG_A) @ Q.T + rng.standard_normal((B, D))


def data_clustered(rng):
    centres = rng.standard_normal((32, D)) * np.sqrt(SIG_B)
    return centres[rng.integers(0, 32, B)] + rng.standard_normal((B, D))


def sqdist(X, Cn):
    return (X * X).sum(1)[:, None] - 2 * X @ Cn.T + (Cn * Cn).sum(1)[None, :]


def kmeans(X, C, rng):
    # k-means++ seeding
    cent = np.empty((C, X.shape[1])); cent[0] = X[rng.integers(len(X))]
    d2 = ((X - cent[0]) ** 2).sum(1)
    for i in range(1, C):
        cent[i] = X[rng.choice(len(X), p=d2 / d2.sum())]
        d2 = np.minimum(d2, ((X - cent[i]) ** 2).sum(1))
    for _ in range(ITERS):
        a = np.argmin(sqdist(X, cent), 1)
        cnt = np.bincount(a, minlength=C)
        s = np.zeros_like(cent); np.add.at(s, a, X)
        keep = cnt > 0
        cent[keep] = s[keep] / cnt[keep, None]
    return cent, np.argmin(sqdist(X, cent), 1)


def per_channel_H(Xc):
    return np.array([hist_entropy(Xc[:, c]) for c in range(Xc.shape[1])])


def klt(Xf, Xc):
    Z = (Xf - Xf.mean(0)) / Xf.std(0)
    lam = np.linalg.eigvalsh(np.cov(Z.T))
    formula = 0.5 * np.log2(lam.mean() / np.exp(np.log(lam).mean()))
    # check: rotate the integer codes by the eigenvectors of their covariance, round, measure entropies
    _, U = np.linalg.eigh(np.cov(Xc.T.astype(float)))
    Y = np.rint((Xc - Xc.mean(0)) @ U).astype(np.int64)
    measured = per_channel_H(Xc).mean() - per_channel_H(Y).mean()
    return float(formula), float(measured), sorted(lam.tolist(), reverse=True)


def run(name, X, seed):
    rng = np.random.default_rng(seed)
    Xc = np.rint(X * STEP).astype(np.int64)            # the stored integer codes
    H_raw = per_channel_H(Xc)
    var_raw = Xc.var(0)
    k_formula, k_measured, lam = klt(X, Xc)
    rows = []
    for C in CS:
        t = time.time()
        cent, a = kmeans(Xc.astype(float), C, rng)
        centq = np.rint(cent).astype(np.int64)
        R = Xc - centq[a]                                # exact integer residual
        assert np.array_equal(R + centq[a], Xc)          # lossless round trip
        gross = float((H_raw - per_channel_H(R)).mean())
        gross_gauss = float((0.5 * np.log2(var_raw / R.var(0))).mean())
        idx = np.log2(C) / D
        book = 8 * C / B
        rows.append({"C": C, "gross": gross, "gross_gaussian_formula": gross_gauss,
                     "tax_index": idx, "tax_codebook": book, "tax": idx + book, "net": gross - idx - book,
                     "bound_gross": k_formula + idx})
        print(f"{name:10s} C={C:5d} gross={gross:.3f} (gauss {gross_gauss:.3f}) tax={idx+book:.3f} "
              f"net={gross-idx-book:+.3f}  [{time.time()-t:.1f}s]", flush=True)
    print(f"{name:10s} KLT formula={k_formula:.3f} measured={k_measured:.3f}  solo H={H_raw.mean():.3f}")
    return {"rows": rows, "klt_formula": k_formula, "klt_measured": k_measured,
            "solo_H": float(H_raw.mean()), "eigenvalues": lam,
            "klt_basis_cost": 8 * (2 * D * D) / (B * D)}   # a d x d basis in BF16 = 2d entries' worth


out = {
    "about": "k-means VQ vs KLT on one block of 16,384 vectors in 64 dimensions; seeded Monte Carlo. "
             "Script: analysis/homework_a_vq.py",
    "b": B, "d": D, "step_codes": STEP, "signal_variance_A": SIG_A, "centre_variance_B": SIG_B,
    "correlated": run("correlated", data_correlated(np.random.default_rng(11)), 1),
    "clustered": run("clustered", data_clustered(np.random.default_rng(12)), 2),
}
path = os.path.join(os.path.dirname(__file__), "..", "figures", "data", "homework-a-vq.json")
with open(path, "w") as f:
    json.dump(out, f, indent=1)
