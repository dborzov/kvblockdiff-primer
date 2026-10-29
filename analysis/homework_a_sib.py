"""VI.8 (homework-sib): how much does choosing the NEAREST sibling soften the doubled noise?

World with no twins: inside a block, each entry = block part (shared, removed by any predictor) + its own
part, i.i.d. Gaussian per channel (unit variance), stored as integer codes (STEP codes per unit).
For dimension d and block size b, three predictors of an entry:
  loc     - the block's per-channel median (the Anchor)
  random  - a random other entry of the block (a sibling picked blindly)
  nearest - the nearest other entry of the block in squared distance (the Twin, leave-one-out)
Bits = order-0 histogram entropy of all residual codes pooled (channels are exchangeable here),
penalty = H(sib residual) - H(loc residual), in bits per element; the pointer tax log2(b)/d is reported apart.
Writes figures/data/homework-a-sib.json.
"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from homework_a_fp8 import hist_entropy

STEP = 4.0
DS = [16, 64, 256, 640, 1024]
BS = [16, 64, 256, 1024, 4096]
TARGET = 1 << 19                       # residual values pooled per (d, b) cell
rng = np.random.default_rng(808)

rows = []
for d in DS:
    for b in BS:
        reps = max(1, TARGET // (b * d))
        rl, rr, rn = [], [], []
        for _ in range(reps):
            X = np.rint(rng.standard_normal((b, d)) * STEP).astype(np.int64)
            rl.append(X - np.rint(np.median(X, 0)).astype(np.int64))
            perm = (np.arange(b) + rng.integers(1, b)) % b        # a random other entry
            rr.append(X - X[perm])
            Xf = X.astype(np.float64)
            sq = (Xf * Xf).sum(1)
            D2 = sq[:, None] - 2 * Xf @ Xf.T + sq[None, :]
            np.fill_diagonal(D2, np.inf)
            rn.append(X - X[np.argmin(D2, 1)])
        Hl, Hr, Hn = (hist_entropy(np.concatenate([a.ravel() for a in L])) for L in (rl, rr, rn))
        row = {"d": d, "b": b, "H_loc": Hl, "pen_random": Hr - Hl, "pen_nearest": Hn - Hl,
               "pointer": float(np.log2(b) / d)}
        rows.append(row)
        print(f"d={d:5d} b={b:5d}  random {Hr-Hl:+.3f}  nearest {Hn-Hl:+.3f}  pointer {np.log2(b)/d:.3f}", flush=True)

out = {"about": "Nearest-sibling vs random-sibling vs block-median prediction on i.i.d. Gaussian entries; "
                "seeded Monte Carlo. Script: analysis/homework_a_sib.py", "step_codes": STEP, "rows": rows}
with open(os.path.join(os.path.dirname(__file__), "..", "figures", "data", "homework-a-sib.json"), "w") as f:
    json.dump(out, f, indent=1)
