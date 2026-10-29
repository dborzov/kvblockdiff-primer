"""VI.9 (homework-four-side-by-side): the four dictionaries on five synthetic worlds, charged honestly.

Each world is 32 blocks of b = 4096 entries in d = 64 dimensions (unit noise, stored as integer codes with
STEP codes per unit of noise), built to contain ONE kind of structure:
  drift    - each block shifts every channel's mean (block means explain 60 % of the variance)
  lowrank  - a rank-8 correlated signal (variance 16 per direction) + noise, the same in every block
  clusters - 32 cluster centres (variance 9 per dimension) + noise
  twins    - 2048 random vectors (variance 9 per dimension), each appearing twice, + noise
  noise    - nothing but independent noise (variance 4 per channel)
Solo coding (the Hermit) = one per-channel code fit to all 32 blocks pooled (a global, context-free code).
Each dictionary is fit on the block it codes (four blocks scored and averaged) and charged in full:
  loc  - per-channel median as the prediction; dictionary = location + scale = 2 entries' worth (8*2/b)
  KLT  - median + rotation to the block's eigenvectors (rounded); basis d x d in BF16 = 2d entries' worth,
         plus the location (8*(2d+1)/b); reported with and without the basis charge
  VQ   - k-means, C = 64 centroids; index log2(C)/d per element + codebook 8C/b
  sib  - nearest other entry of the block (leave-one-out: an optimistic version, see VI.8);
         pointer log2(b)/d per element
net = (solo bits) - (residual bits + per-entry tax + dictionary bits), bits per element.
Writes figures/data/homework-a-portrait.json.
"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from homework_a_fp8 import hist_entropy

B, D, NBLK, STEP, C = 4096, 64, 32, 4.0, 64


def world(name, rng):
    if name == "drift":
        mu = rng.standard_normal((NBLK, 1, D)) * np.sqrt(1.5)
        X = mu + rng.standard_normal((NBLK, B, D))
    elif name == "lowrank":
        Q, _ = np.linalg.qr(rng.standard_normal((D, 8)))
        X = (rng.standard_normal((NBLK * B, 8)) * 4.0 @ Q.T + rng.standard_normal((NBLK * B, D))).reshape(NBLK, B, D)
    elif name == "clusters":
        cen = rng.standard_normal((32, D)) * 3.0
        X = (cen[rng.integers(0, 32, NBLK * B)] + rng.standard_normal((NBLK * B, D))).reshape(NBLK, B, D)
    elif name == "twins":
        base = rng.standard_normal((NBLK, B // 2, D)) * 3.0
        X = np.concatenate([base, base], 1) + rng.standard_normal((NBLK, B, D))
        X = X[:, rng.permutation(B)]
    elif name == "noise":
        X = rng.standard_normal((NBLK, B, D)) * 2.0
    return np.rint(X * STEP).astype(np.int64)


def chanH(R):
    return float(np.mean([hist_entropy(R[:, c]) for c in range(R.shape[1])]))


def sqd(X, Y):
    return (X * X).sum(1)[:, None] - 2 * X @ Y.T + (Y * Y).sum(1)[None, :]


def kmeans(X, k, rng, iters=25):
    cent = np.empty((k, X.shape[1])); cent[0] = X[rng.integers(len(X))]
    d2 = ((X - cent[0]) ** 2).sum(1)
    for i in range(1, k):
        cent[i] = X[rng.choice(len(X), p=d2 / d2.sum())]
        d2 = np.minimum(d2, ((X - cent[i]) ** 2).sum(1))
    for _ in range(iters):
        a = np.argmin(sqd(X, cent), 1)
        cnt = np.bincount(a, minlength=k); s = np.zeros_like(cent); np.add.at(s, a, X)
        cent[cnt > 0] = s[cnt > 0] / cnt[cnt > 0, None]
    return cent, np.argmin(sqd(X, cent), 1)


def score(X, rng):
    out = {}
    med = np.rint(np.median(X, 0)).astype(np.int64)
    Rl = X - med
    out["loc"] = {"resid": chanH(Rl), "tax": 0.0, "dict": 8 * 2 / B}
    _, U = np.linalg.eigh(np.cov(Rl.T.astype(float)))
    Rk = np.rint(Rl @ U).astype(np.int64)            # rotated coordinates (an orthogonal, volume-preserving map)
    out["klt"] = {"resid": chanH(Rk), "tax": 0.0, "dict": 8 * (2 * D + 1) / B, "dict_free": 8 * 1 / B}
    cent, a = kmeans(X.astype(float), C, rng)
    cq = np.rint(cent).astype(np.int64)
    out["vq"] = {"resid": chanH(X - cq[a]), "tax": np.log2(C) / D, "dict": 8 * C / B}
    Xf = X.astype(float); D2 = sqd(Xf, Xf); np.fill_diagonal(D2, np.inf)
    out["sib"] = {"resid": chanH(X - X[np.argmin(D2, 1)]), "tax": np.log2(B) / D, "dict": 0.0}
    return out


res = {}
for i, name in enumerate(["drift", "lowrank", "clusters", "twins", "noise"]):
    rng = np.random.default_rng(500 + i)
    W = world(name, rng)
    solo = chanH(W.reshape(-1, D))
    per = [score(W[j], rng) for j in range(4)]
    row = {"solo": solo}
    for t in ["loc", "klt", "vq", "sib"]:
        resid = float(np.mean([p[t]["resid"] for p in per]))
        tax, dic = float(per[0][t]["tax"]), float(per[0][t]["dict"])
        row[t] = {"resid": resid, "gain": solo - resid, "tax": tax, "dict": dic, "net": solo - resid - tax - dic}
        if t == "klt":
            row[t]["net_basis_free"] = solo - resid - per[0][t]["dict_free"]
    res[name] = row
    print(f"{name:9s} solo={solo:.3f}  " + "  ".join(
        f"{t}: gain {row[t]['gain']:+.3f} net {row[t]['net']:+.3f}" for t in ["loc", "klt", "vq", "sib"]),
        f" (klt basis-free {row['klt']['net_basis_free']:+.3f})", flush=True)

out = {"about": "Four dictionary types on five synthetic worlds (b = 4096, d = 64), every cost charged; "
                "seeded Monte Carlo. Script: analysis/homework_a_portrait.py",
       "b": B, "d": D, "C": C, "worlds": res}
with open(os.path.join(os.path.dirname(__file__), "..", "figures", "data", "homework-a-portrait.json"), "w") as f:
    json.dump(out, f, indent=1)
