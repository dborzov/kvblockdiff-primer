#!/usr/bin/env python3
"""Synthetic dress rehearsal of the scope-ladder measurement (page VI.18, homework-rehearsal).

What it does
------------
Builds synthetic "KV-like" vectors whose structure is KNOWN, quantizes them to an 8-bit integer
grid, and runs the measurement the real harness will run on real KV caches:

  * four dictionary types       loc (per-channel location + scale), KLT bound (basis cost excluded),
                                VQ (256 k-means centroids + an 8-bit index), sib (nearest earlier
                                sibling in the block + a pointer);
  * three scopes                global (fit on separate calibration requests), request (fit on the
                                whole request), block (fit on b consecutive tokens, b = 128 ... 8K);
  * one control                 the shuffle control: tokens are permuted across sequences, which
                                destroys every request- and block-local structure on purpose.

Every rate is in bits per 8-bit element (bpe), everything included: residual bits under a
per-channel discretized Laplace model fit on the scope's own data (the global model is fit on the
calibration requests and charged as a cross-entropy on the test requests), the per-entry side
channel (VQ index, sib pointer), and the dictionary amortized over its block (8 w / b).

The synthetic recipe (variance shares are of each channel's total variance, sigma_total = 30 codes):
  global rank-8 subspace 40 %, per-request mean offset 10 %, per-block mean offset 20 %,
  per-block rank-2 subspace 10 %, white noise 20 %. True blocks are 2048 tokens long and aligned
  with the block grid. Values are rounded to integers and clipped to [-127, 127] (an INT8 grid).

It is a check of the METHOD (do the curves have the right shapes, does the control work),
not a result about KV caches.

Run:  python3 analysis/homework_b_rehearsal.py      (numpy only, about half a minute on a laptop)
Out:  figures/data/homework-b-rehearsal.json
"""
import json
import pathlib
import time

import numpy as np

SEED = 20261029
D = 64                      # elements per entry (channels)
L_REQ = 16384               # tokens per request
N_CAL, N_TEST = 32, 4       # calibration requests (global fit) and test requests (measured)
N_POOL = 32                 # shuffle control: tokens of this many requests (the test ones included) are pooled
TRUE_BLOCK = 2048           # length of the true per-block segments
SIGMA_TOTAL = 30.0          # per-channel standard deviation, in INT8 codes
SHARES = {                  # share of each channel's variance
    "global_rank8": 0.40,
    "request_mean": 0.10,
    "block_mean": 0.20,
    "block_rank2": 0.10,
    "noise": 0.20,
}
BLOCKS = [128, 256, 512, 1024, 2048, 4096, 8192]
VQ_C, VQ_ITERS = 256, 12
SIB_TARGETS = 512           # sib: residuals measured on up to this many random entries per block
W_LOC = 2                   # loc dictionary weight (entries' worth): location + scale per channel
W_VQ = VQ_C                 # 256 centroids of one entry each


# ------------------------------------------------------------------ data
def orthonormal(rng, d, r):
    q, _ = np.linalg.qr(rng.standard_normal((d, r)))
    return q


def make_requests(rng, n_req, U_g, mu_g):
    V = SIGMA_TOTAL ** 2
    out = []
    for _ in range(n_req):
        x = np.tile(mu_g, (L_REQ, 1))
        x += rng.normal(0, np.sqrt(SHARES["request_mean"] * V), D)                    # request offset
        z = rng.normal(0, np.sqrt(SHARES["global_rank8"] * V * D / 8), (L_REQ, 8))
        x += z @ U_g.T                                                                  # global subspace
        for s in range(0, L_REQ, TRUE_BLOCK):
            x[s:s + TRUE_BLOCK] += rng.normal(0, np.sqrt(SHARES["block_mean"] * V), D)  # block offset
            U_b = orthonormal(rng, D, 2)
            zb = rng.normal(0, np.sqrt(SHARES["block_rank2"] * V * D / 2), (TRUE_BLOCK, 2))
            x[s:s + TRUE_BLOCK] += zb @ U_b.T                                           # block subspace
        x += rng.normal(0, np.sqrt(SHARES["noise"] * V), (L_REQ, D))                    # white noise
        out.append(np.clip(np.rint(x), -127, 127).astype(np.int32))
    return np.stack(out)                                     # (n_req, L_REQ, D) integer codes


# ------------------------------------------------------------------ rates
def theta_of(A):
    """Two-sided geometric (discretized Laplace) parameter from the mean absolute residual."""
    A = np.maximum(A, 1e-6)
    return (np.sqrt(1 + A * A) - 1) / A


def geo_bits(A, theta):
    """Bits per value of residuals with mean |r| = A under a two-sided geometric model theta."""
    return -np.log2((1 - theta) / (1 + theta)) - A * np.log2(theta)


def self_rate(r):
    """r: (n, D) integer residuals of one scope unit. Model fit on r itself. Mean bits per element."""
    A = np.abs(r).mean(axis=0)
    return float(geo_bits(A, theta_of(A)).mean())


# ------------------------------------------------------------------ dictionary types on one block
def loc_resid(X):
    return X - np.rint(X.mean(axis=0)).astype(np.int32)


def klt_resid(X):
    Xf = X.astype(np.float64)
    m = Xf.mean(axis=0)
    _, vecs = np.linalg.eigh(np.cov(Xf, rowvar=False))
    return np.rint((Xf - m) @ vecs).astype(np.int64)        # rotated, re-rounded: lossless-transform proxy


def vq_resid(X, rng):
    Xf = X.astype(np.float32)
    C = Xf[rng.choice(len(Xf), VQ_C, replace=False)].copy()
    x2 = (Xf * Xf).sum(1)[:, None]
    for _ in range(VQ_ITERS):
        idx = np.argmin(x2 - 2 * Xf @ C.T + (C * C).sum(1)[None, :], axis=1)
        onehot = np.zeros((len(Xf), VQ_C), np.float32)
        onehot[np.arange(len(Xf)), idx] = 1
        cnt, sums = onehot.sum(0), onehot.T @ Xf
        keep = cnt > 0
        C[keep] = sums[keep] / cnt[keep, None]
    idx = np.argmin(x2 - 2 * Xf @ C.T + (C * C).sum(1)[None, :], axis=1)
    return X - np.rint(C).astype(np.int32)[idx]


def sib_resid(X, rng):
    """Nearest EARLIER entry of the block as the prediction (so the block decodes in order)."""
    n = len(X)
    tg = np.sort(rng.choice(np.arange(1, n), min(SIB_TARGETS, n - 1), replace=False))
    Xf = X.astype(np.float32)
    d2 = (Xf[tg] ** 2).sum(1)[:, None] - 2 * Xf[tg] @ Xf.T + (Xf ** 2).sum(1)[None, :]
    d2[np.arange(n)[None, :] >= tg[:, None]] = np.inf
    return X[tg] - X[np.argmin(d2, axis=1)]


def block_curve(data, b, rng):
    """data: (n_req, L, D). Returns bpe per type at block size b (None where a type cannot run)."""
    res = {k: [] for k in ("loc", "klt", "vq", "sib")}
    for req in data:
        for s in range(0, len(req), b):
            X = req[s:s + b]
            res["loc"].append(self_rate(loc_resid(X)))
            res["klt"].append(self_rate(klt_resid(X)))
            if b > VQ_C:
                res["vq"].append(self_rate(vq_resid(X, rng)))
            res["sib"].append(self_rate(sib_resid(X, rng)))
    amort = 8 / b
    out = {
        "loc": {"resid": np.mean(res["loc"]), "side": 0.0, "dict": amort * W_LOC},
        "klt": {"resid": np.mean(res["klt"]), "side": 0.0, "dict": amort * W_LOC},   # basis excluded
        "sib": {"resid": np.mean(res["sib"]), "side": np.log2(b) / D, "dict": amort * W_LOC},
        "vq": None,
    }
    if res["vq"]:
        out["vq"] = {"resid": np.mean(res["vq"]), "side": np.log2(VQ_C) / D, "dict": amort * (W_VQ + 1)}
    return out


def global_rates(cal, test):
    """Global scope: location, scale and KLT basis fit on the calibration requests only."""
    Xc = cal.reshape(-1, D).astype(np.float64)
    Xt = test.reshape(-1, D).astype(np.float64)
    m = np.rint(Xc.mean(axis=0))
    th_loc = theta_of(np.abs(Xc - m).mean(axis=0))
    loc = float(geo_bits(np.abs(Xt - m).mean(axis=0), th_loc).mean())
    mf = Xc.mean(axis=0)
    _, vecs = np.linalg.eigh(np.cov(Xc, rowvar=False))
    yc, yt = np.rint((Xc - mf) @ vecs), np.rint((Xt - mf) @ vecs)
    klt = float(geo_bits(np.abs(yt).mean(axis=0), theta_of(np.abs(yc).mean(axis=0))).mean())
    return {"loc": loc, "klt": klt}


def request_rates(test):
    loc = np.mean([self_rate(loc_resid(r)) for r in test]) + 8 * W_LOC / L_REQ
    klt = np.mean([self_rate(klt_resid(r)) for r in test]) + 8 * W_LOC / L_REQ
    return {"loc": float(loc), "klt": float(klt)}


def run(test, cal, rng):
    curves = {k: [] for k in ("loc", "klt", "vq", "sib")}
    parts = {k: [] for k in ("loc", "klt", "vq", "sib")}
    for b in BLOCKS:
        t = time.time()
        c = block_curve(test, b, rng)
        print(f"  b={b}: {time.time() - t:.1f}s", flush=True)
        for k in curves:
            if c[k] is None:
                curves[k].append(None)
                parts[k].append(None)
            else:
                tot = c[k]["resid"] + c[k]["side"] + c[k]["dict"]
                curves[k].append(round(float(tot), 4))
                parts[k].append({p: round(float(v), 4) for p, v in c[k].items()})
    return {"block": curves, "parts": parts,
            "global": {k: round(v, 4) for k, v in global_rates(cal, test).items()},
            "request": {k: round(v, 4) for k, v in request_rates(test).items()}}


def main():
    t0 = time.time()
    rng = np.random.default_rng(SEED)
    U_g = orthonormal(rng, D, 8)
    mu_g = rng.normal(0, 6, D)
    cal = make_requests(rng, N_CAL, U_g, mu_g)
    test = make_requests(rng, N_TEST, U_g, mu_g)
    clipped = float(np.mean(np.abs(test) == 127))

    original = run(test, cal, np.random.default_rng(SEED + 1))
    # shuffle control: pool the test requests with fresh ones, permute every token across sequences,
    # and measure the first N_TEST sequences of the shuffled pool
    pool = np.concatenate([test, make_requests(rng, N_POOL - N_TEST, U_g, mu_g)]).reshape(-1, D)
    perm = np.random.default_rng(SEED + 2).permutation(len(pool))
    shuffled_test = pool[perm][:N_TEST * L_REQ].reshape(N_TEST, L_REQ, D)
    del pool
    shuffled = run(shuffled_test, cal, np.random.default_rng(SEED + 1))

    def gains(r):
        best_loc = min(r["block"]["loc"])
        return {"g_req_loc": round(r["global"]["loc"] - r["request"]["loc"], 3),
                "g_blk_loc": round(r["request"]["loc"] - best_loc, 3),
                "best_b_loc": BLOCKS[r["block"]["loc"].index(best_loc)]}

    out = {
        "meta": {
            "script": "analysis/homework_b_rehearsal.py",
            "seed": SEED, "d": D, "tokens_per_request": L_REQ,
            "calibration_requests": N_CAL, "test_requests": N_TEST, "shuffle_pool_requests": N_POOL,
            "true_block": TRUE_BLOCK, "sigma_total_codes": SIGMA_TOTAL, "shares": SHARES,
            "grid": "integers clipped to [-127, 127] (INT8)",
            "rate_model": "per-channel two-sided geometric (discretized Laplace) fit on the scope's own data",
            "vq": {"centroids": VQ_C, "kmeans_iterations": VQ_ITERS, "w": W_VQ + 1},
            "sib": {"targets_per_block": SIB_TARGETS, "prediction": "nearest earlier entry of the block (L2)"},
            "klt": "rotated by the block's covariance eigenbasis and re-rounded; basis cost excluded",
            "clipped_fraction": round(clipped, 6),
            "runtime_s": None,
        },
        "b": BLOCKS,
        "original": original,
        "shuffled": shuffled,
        "gains": {"original": gains(original), "shuffled": gains(shuffled)},
    }
    out["meta"]["runtime_s"] = round(time.time() - t0, 1)
    path = pathlib.Path(__file__).resolve().parent.parent / "figures" / "data" / "homework-b-rehearsal.json"
    path.write_text(json.dumps(out, indent=1))
    print(json.dumps({k: out[k] for k in ("original", "shuffled", "gains")}, indent=1)[:6000])
    print("runtime", out["meta"]["runtime_s"], "s; clipped", clipped, "->", path)


if __name__ == "__main__":
    main()
