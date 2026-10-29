"""VI.1 / VI.2 (homework-the-budget, homework-solo-coding): the bit budget of one 8-bit KV element.

Monte Carlo, seeded. One Gaussian channel (mean 0, standard deviation sigma), n values:
  * E4M3: round to FP8 E4M3, take the monotone index, measure its order-0 entropy (histogram).
    Repeated over many scales sigma: the entropy should not depend on sigma (logarithmic grid).
  * INT8: codes = round(x / scale) clipped to +-127; sigma is measured in codes.
    At sigma = 32 codes (4 sigma at the top of the range) the entropy is about 7.04 bits.
  * A fixed-length solo code for E4M3 in the style of SplitZip: sign (1 bit) + mantissa (3 bits) stored
    as is, the 4-bit exponent coded with a fixed 2- or 3-bit code for its most common values, the rest
    escaped (raw byte 8 bits + its position, 12 bits: a block of 4096 entries is ASSUMED).
Writes figures/data/homework-a-budget.json.
"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from homework_a_fp8 import e4m3_round, e4m3_index, int8_codes, hist_entropy, GRID

N = 1_000_000
rng = np.random.default_rng(20261029)
z = rng.standard_normal(N)

# ---- E4M3 entropy against scale (sigma in real units; the grid spans 2^-9 .. 448)
e4m3_scales = [float(s) for s in 2.0 ** np.arange(-6, 7.01, 0.5)]
e4m3_H = [hist_entropy(e4m3_index(e4m3_round(z * s))) for s in e4m3_scales]

# ---- INT8 entropy against sigma (in codes)
int8_sigmas = [float(s) for s in 2.0 ** np.arange(0, 6.01, 0.25)]
int8_H = [hist_entropy(int8_codes(z * s, 1.0)) for s in int8_sigmas]
H_int8_32 = hist_entropy(int8_codes(z * 32, 1.0))
H_gauss_32 = 0.5 * np.log2(2 * np.pi * np.e * 32 ** 2)   # differential-entropy formula, step 1

# ---- the reference E4M3 channel: sigma = 64, so the 99.99th percentile of |x| lands near 256 (the site's
#      scaling rule for E4M3, see the FP8 facts page); code usage for the figure
REF = 64
ref = e4m3_index(e4m3_round(z * REF))
H_ref = hist_entropy(ref)
codes, counts = np.unique(ref, return_counts=True)
used_99 = int(np.searchsorted(np.cumsum(np.sort(counts)[::-1]) / N, 0.99) + 1)

# ---- a fixed-length solo code for E4M3 (exponent split, SplitZip-style)
xq = e4m3_round(z * REF)
ax = np.abs(xq)
expo = np.where(ax < 2.0 ** -6, 0, np.floor(np.log2(np.maximum(ax, 2.0 ** -6))) + 7).astype(int)  # 4-bit field
ev, ec = np.unique(expo, return_counts=True)
order = np.argsort(ec)[::-1]
POS_BITS = 12                      # position of an escape inside a block of 4096 entries (assumed)
fixed = {}
for k in (2, 3):
    esc = 1 - ec[order[: 2 ** k]].sum() / N
    fixed[f"top{2**k}"] = {"bits": float(1 + 3 + k + esc * (8 + POS_BITS)), "escape_fraction": float(esc)}
H_exp = hist_entropy(expo)
# decomposition of the index entropy: sign + exponent + mantissa given exponent
sign = (xq < 0).astype(int)
H_sign = hist_entropy(sign)
H_se = hist_entropy(sign * 16 + expo)
H_mant_given = H_ref - H_se

out = {
    "about": "Order-0 entropy of one Gaussian channel in 8-bit codes; seeded Monte Carlo, n = 1,000,000. "
             "Script: analysis/homework_a_budget.py",
    "n": N,
    "e4m3": {"sigma": e4m3_scales, "H": e4m3_H},
    "int8": {"sigma_codes": int8_sigmas, "H": int8_H},
    "ref": {
        "e4m3_sigma": REF, "exponent_shares": {f"{int(v):04b}": float(c / N) for v, c in zip(ev, ec)}, "H_e4m3": H_ref, "H_int8_sigma32": H_int8_32, "H_int8_formula": H_gauss_32,
        "codes_used": int(len(codes)), "codes_for_99pct": used_99,
        "H_exponent": H_exp, "H_sign": H_sign, "H_mantissa_given_sign_exponent": H_mant_given,
        "fixed_length": fixed, "escape_position_bits": POS_BITS,
        "e4m3_mid_range": [min(h for s, h in zip(e4m3_scales, e4m3_H) if 0.25 <= s <= 64),
                           max(h for s, h in zip(e4m3_scales, e4m3_H) if 0.25 <= s <= 64)],
    },
}
path = os.path.join(os.path.dirname(__file__), "..", "figures", "data", "homework-a-budget.json")
with open(path, "w") as f:
    json.dump(out, f, indent=1)
print(json.dumps(out["ref"], indent=1))
for s, h in zip(e4m3_scales, e4m3_H):
    print(f"E4M3 sigma={s:8.3f}  H={h:.3f}")
for s, h in zip(int8_sigmas, int8_H):
    print(f"INT8 sigma={s:8.3f}  H={h:.3f}")
