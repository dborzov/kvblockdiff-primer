"""missed-b (VII.11): subtraction versus context modelling on the E4M3 and INT8 grids — exact, no sampling.

One Gaussian channel x = mu + noise. The prediction mu (a block mean, known to both ends) explains a share R2
of the variance: mu ~ N(0, R2 s^2), noise ~ N(0, (1-R2) s^2), s = 16 (inside E4M3's normal range, so the
result does not depend on s). x is rounded to E4M3 (nearest) or to INT8 with step s/32 (+-127 steps = +-4s).
Printed, in bits per element:
  solo      H(X)                                  no prediction
  sub       H(idx X - idx mu)                     subtraction in index space, one table for all contexts
  ctx       H(X | idx mu)                         context modelling: the prediction's code picks the table
  ctxLap    per-context Laplace fit on index residuals (what a per-block location+scale on residuals gives)
The figure FIG.mbContextGrid (figures/missed-b.js) computes solo, sub and ctx the same way in the browser.
Run: python3 analysis/missed-b-context.py   (numpy only)
"""
import numpy as np
from math import erf, sqrt

_verf = np.vectorize(erf)
def Phi(z):
    return 0.5 * (1 + _verf(np.clip(np.asarray(z, float), -40, 40) / np.sqrt(2)))

def e4m3_grid():
    sub = [m / 8 * 2.0 ** -6 for m in range(1, 8)]
    nor = [(1 + m / 8) * 2.0 ** (e - 7) for e in range(1, 16) for m in range(8)][:-1]
    return np.array([0.0] + sub + nor)

G = e4m3_grid()
FULL = np.concatenate([-G[:0:-1], G])                    # index -126 .. 126
E4_BOUNDS = np.concatenate([[-np.inf], (FULL[1:] + FULL[:-1]) / 2, [np.inf]])

def H(p):
    p = p[p > 0] / p.sum()
    return float(-(p * np.log2(p)).sum())

def mu_points(sm, sn, bounds, nq=150):
    """quadrature over the prediction: every prediction cell cut into pieces of width <= h, exact weights"""
    h = min(12 * sm / nq, sn / 6)
    mus, ws, cs = [], [], []
    for c in range(len(bounds) - 1):
        lo, hi = max(bounds[c], -6 * sm), min(bounds[c + 1], 6 * sm)
        if hi <= lo:
            continue
        n = max(1, int(np.ceil((hi - lo) / h)))
        e = np.linspace(lo, hi, n + 1)
        mus += list((e[1:] + e[:-1]) / 2); ws += list(Phi(e[1:] / sm) - Phi(e[:-1] / sm)); cs += [c] * n
    ws = np.array(ws)
    return np.array(mus), ws / ws.sum(), np.array(cs)

def rates(R2, bounds, s=16.0):
    sm, sn = sqrt(R2) * s, sqrt(1 - R2) * s
    nc = len(bounds) - 1
    mus, w, cs = mu_points(sm, sn, bounds)
    P = Phi((bounds[None, 1:] - mus[:, None]) / sn) - Phi((bounds[None, :-1] - mus[:, None]) / sn)
    px = (w[:, None] * P).sum(0)
    pool, ctx, lap = np.zeros(2 * nc + 1), 0.0, 0.0
    R = np.arange(-nc, nc + 1)
    for c in np.unique(cs):
        sel = cs == c
        pc = (w[sel, None] * P[sel]).sum(0); wc = w[sel].sum(); q = pc / wc
        ctx += wc * H(q)
        r = np.arange(nc) - c                                   # residual in grid steps
        np.add.at(pool, r + nc, pc)
        med = r[np.searchsorted(np.cumsum(q), 0.5)]
        beta = max((q * np.abs(r - med)).sum(), 0.25)
        logp = -np.abs(R - med) / beta; logp -= np.log(np.exp(logp).sum())
        lap += wc * float(-(q * logp[r + nc]).sum() / np.log(2))
    return H(px), H(pool), ctx, lap

if __name__ == "__main__":
    k = np.arange(-127, 127)
    I8_BOUNDS = np.concatenate([[-np.inf], (k + 0.5) * (16.0 / 32), [np.inf]])
    print(" R2   | E4M3: solo   sub    ctx  ctxLap | INT8: solo   sub    ctx | formula")
    for R2 in [0.0001, 0.1, 0.3, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 0.94, 0.97, 0.99]:
        e = rates(R2, E4_BOUNDS); i = rates(R2, I8_BOUNDS)
        print(f" {R2:.2f} |   " + " ".join(f"{v:6.3f}" for v in e) + " |  " + " ".join(f"{v:6.3f}" for v in i[:3])
              + f" | {-0.5 * np.log2(1 - R2):5.3f}")
