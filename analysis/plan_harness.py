#!/usr/bin/env python3
"""
plan_harness.py -- the measurement harness of Part IX ("The plan"), small enough to read in one sitting.

Every code snippet and every harness number on the pages of Part IX comes from this file.
Run it (numpy only, about half a minute on a laptop):

    python3 analysis/plan_harness.py

It tests, in order:
  1. the E4M3 grid, rounding and index against a brute-force reference, and the INT8 alternative;
  2. the two rates on synthetic residuals whose answer is known in closed form;
  3. the loc dictionary's round trip: residual by residual, one entry alone, and as real packed bytes;
  4. the four controls on a tiny synthetic data set with known global / request / block structure;
and writes the numbers to figures/data/plan-harness.json (read by figures/plan.js).

Vocabulary (the site's): an *entry* is one token's vector of d 8-bit codes at one layer; a *channel*
is one position c inside the entry; a *block* is b consecutive entries; a *dictionary* D is fit on a
fitting set and shared; a *delta* rebuilds one entry exactly, given D. Scopes: global (D fit offline
on calibration data, free at serving time), request (one D per sequence), block (one D per block).
bpe = bits per element, every cost included; raw storage is 8.

Changes from the code in the source proposal (each one is a bug fix or a missing piece):
  * the DeltaCoder interface is real Python (the source's `def fit(self, X): -> ...` is not);
  * e4m3_round really maps -0 to +0 (the source promised it but returned -0.0 for tiny negatives);
  * entropy_rate asserts that residuals lie in the alphabet instead of silently clipping them;
  * fixed-length widths are fit on the fitting set, like the entropy model (the source fit them on
    the evaluated block itself, which flatters the global scope);
  * an escape is marked by the one field value the width rule never uses, so it costs 8 raw bits and
    no position (the source charged 8 + log2(rows): a bulk-stream layout, not a random-access one);
  * the coder's own settings (centre, scale, width) are charged to block/request dictionaries;
  * `nbytes` and the per-channel "predict or not" flag, mentioned but not written in the source;
  * the entropy rate uses a grid-aware model (a value-domain Laplace integrated over each code's
    grid cell): the source's index-space Laplace charges E4M3 solo coding 8.4 bits per element on
    our synthetic set, more than raw, because E4M3 codes of a zero-centred channel form two humps;
  * rung 0 (solo) is scored at global scope only: a narrower "solo" would be loc in disguise,
    because the coder's own model has a centre.
The decision rule of the source (page IX.9) has a hole; this script's synthetic set lands in it.
"""
import json
import os
import time
from collections import OrderedDict

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "figures", "data", "plan-harness.json")


# =====================================================================================
# 1. Step 0 -- the lossless target: 8-bit codes (FP8 E4M3, or INT8 with a scale)
# =====================================================================================

def e4m3_grid():
    """All non-negative E4M3 values, sorted: 0, 7 subnormals, 15 binades x 8 mantissas
    minus the one NaN pattern = 127 values, from 0 to 448."""
    sub = [m / 8 * 2.0 ** -6 for m in range(1, 8)]
    nor = [(1 + m / 8) * 2.0 ** (e - 7) for e in range(1, 16) for m in range(8)][:-1]
    return np.array([0.0] + sub + nor, dtype=np.float32)


GRID = e4m3_grid()


def e4m3_scale(x):
    """One power-of-two scale per tensor (one layer's keys, or its values): max|x| / scale <= 448."""
    return np.float32(2.0 ** np.ceil(np.log2(max(float(np.abs(x).max()), 1e-30) / 448.0)))


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


def int8_scale(x_calib):
    """The uniform-grid alternative: one scale per channel, fit once on calibration data."""
    return np.abs(x_calib.reshape(-1, x_calib.shape[-1])).max(axis=0) / 127.0


def int8_index(x, scale):
    """INT8 code of x: the nearest integer to x / scale, clipped to +-127."""
    return np.clip(np.rint(x / scale), -127, 127).astype(np.int16)


def _e4m3_brute(x):
    """Reference rounding by brute force: nearest grid value, ties to the even index (= even mantissa)."""
    ax = np.minimum(np.abs(x).astype(np.float64), 448.0)
    g = GRID.astype(np.float64)
    i = np.clip(np.searchsorted(g, ax), 1, len(g) - 1)        # g[i-1] < ax <= g[i]
    lo, hi = g[i - 1], g[i]
    pick_hi = (hi - ax < ax - lo) | ((hi - ax == ax - lo) & (i % 2 == 0))
    q = np.where(pick_hi, hi, lo)
    return np.where(x < 0, -q, q) + 0.0


def test_step0():
    rng = np.random.default_rng(0)
    x = rng.standard_normal(100_000).astype(np.float32) * 40
    xq = e4m3_round(x)
    assert np.array_equal(e4m3_from_index(e4m3_index(xq)), xq)                  # the source's test
    # harder: every grid point, every midpoint between neighbours (the ties), tiny and huge values
    g = GRID.astype(np.float64)
    mids = (g[1:] + g[:-1]) / 2
    probe = np.concatenate([g, mids, -g, -mids, rng.standard_normal(200_000) * 10.0 ** rng.uniform(-4, 3, 200_000),
                            [-1e-9, -0.0, 1e-9, 447.9, 448.0, 460.0, 1e6, -1e6]]).astype(np.float32)
    q = e4m3_round(probe)
    assert np.array_equal(q, _e4m3_brute(probe.astype(np.float64)).astype(np.float32)), "rounding differs"
    assert not np.any(np.signbit(q) & (q == 0)), "a -0 survived"
    assert np.array_equal(e4m3_from_index(e4m3_index(q)), q)
    assert np.array_equal(e4m3_from_index(e4m3_index(q)).view(np.uint32), q.view(np.uint32)), "not bit-exact"
    idx = e4m3_index(q)
    assert idx.min() >= -126 and idx.max() <= 126
    assert len(np.unique(idx)) == 253                                          # every code is reachable
    xs = rng.standard_normal((1000, 8)).astype(np.float32) * np.array([1, 2, 5, 10, 20, 50, 100, 300], np.float32)
    s8 = int8_scale(xs)
    c8 = int8_index(xs, s8)
    assert c8.min() >= -127 and c8.max() <= 127 and np.array_equal(int8_index(c8 * s8, s8), c8)
    return dict(grid_values=int(len(GRID)), codes=int(len(np.unique(idx))), probes=int(probe.size),
                max_value=float(GRID[-1]), smallest_subnormal=float(GRID[1]))


# =====================================================================================
# 2. The two rates, and the dictionary charge
# =====================================================================================

ALPHABET = np.arange(-255, 256)        # every difference of two 8-bit codes fits in here


def laplace_fit(r):
    """Per channel: an integer centre m and a scale beta of a Laplace model of residuals r (rows, d)."""
    m = np.round(np.median(r, axis=0))
    beta = np.maximum(np.abs(r - m).mean(axis=0), 0.25)
    return m, beta


def entropy_rate(r, m, beta):
    """Cross-entropy of residuals r under the per-channel discretized Laplace (m, beta), bits per element."""
    assert r.min() >= ALPHABET[0] and r.max() <= ALPHABET[-1], "residual outside the 8-bit alphabet"
    logp = -np.abs(ALPHABET[None, :] - m[:, None]) / beta[:, None]      # (d, 511), not yet normalized
    logp -= np.log(np.exp(logp).sum(axis=1, keepdims=True))               # normalize each channel
    idx = r.astype(np.int64) - ALPHABET[0]                                # residual value -> column
    return float(-logp[np.arange(r.shape[1])[None, :], idx].mean() / np.log(2))


def fl_widths(r, eps=0.005):
    """Per channel, the smallest width n with |r| < 2^(n-1) for all but a share eps of rows.
    n >= 1, because the field value -2^(n-1) (never used by a residual) marks an escape."""
    # eps caps the escapes: they are the decoder's slow path
    q = np.quantile(np.abs(r), 1 - eps, axis=0, method="higher")
    return np.maximum(np.ceil(np.log2(2 * q + 1)), 1).astype(np.int64)


def fixed_length_rate(r, n):
    """n[c] bits per field, plus 8 bits for every escaped element (its raw code)."""
    return float((n[None, :] + 8 * (np.abs(r) >= 2.0 ** (n - 1))).mean())


def fl_bits(r, n):
    """The same, per channel (used to choose the predict-or-not flag)."""
    return n + 8 * (np.abs(r) >= 2.0 ** (n - 1)).mean(axis=0)


def side_bits(dict_bytes, b, d):
    """A dictionary's bytes, spread over the b entries x d elements that share it: 8 w / b."""
    return dict_bytes * 8.0 / (b * d)


def test_rates():
    """Closed-form checks: a discretized Laplace of scale beta, coded with its own model, costs its
    entropy; a residual that never exceeds 3 in size needs 3-bit fields and no escapes."""
    rng = np.random.default_rng(1)
    beta = 3.0
    r = np.rint(rng.laplace(0, beta, (200_000, 4))).astype(np.int64)
    p = np.exp(-np.abs(ALPHABET) / beta)
    p /= p.sum()
    h_true = float(-(p * np.log2(p)).sum())                                   # entropy of the true model
    h_fit = entropy_rate(r, *laplace_fit(r))
    h_hist = float(np.mean([_hist_entropy(r[:, c]) for c in range(4)]))       # plug-in histogram entropy
    assert abs(h_fit - h_hist) < 0.03, (h_fit, h_hist)
    u = rng.integers(-3, 4, (10_000, 4))                                      # uniform on -3..3
    n = fl_widths(u)
    assert list(n) == [3, 3, 3, 3] and fixed_length_rate(u, n) == 3.0
    z = np.zeros((1000, 4), np.int64)
    z[0, 0] = 9                                                               # one big outlier
    nz = fl_widths(z)
    assert nz[0] == 1 and abs(fixed_length_rate(z, nz) - (1 + 8 / 4000)) < 1e-12
    # on the uniform grid, the grid-aware model and the index-space model agree
    rc = np.clip(r, -127, 127)
    vals, off = grid_values("int8")
    h_grid = float(grid_bits(rc, np.zeros_like(rc), *grid_fit(rc, np.zeros_like(rc), vals, off), vals, off).mean())
    assert abs(h_grid - entropy_rate(rc, *laplace_fit(rc))) < 0.02, h_grid
    return dict(laplace_beta=beta, laplace_entropy_true=round(h_true, 3), laplace_entropy_fit=round(h_fit, 3),
                laplace_entropy_hist=round(h_hist, 3), grid_model_int8=round(h_grid, 3))


# ---- the grid-aware entropy model (needed for E4M3; identical in spirit on INT8)
# The source's model above is one Laplace per channel *in index space*. On INT8's uniform grid
# that is the right shape. On E4M3's logarithmic grid it is not: a zero-centred channel's codes
# pile up in two humps (one per sign), and a single-peaked model in index space overcharges them
# (8.4 bits for solo coding on our synthetic set, more than raw). The fix is to model the *value*:
# a Laplace in the value domain, centred on the prediction, integrated over each code's grid cell.

def grid_values(fmt):
    """The format's representable values, in code order; codes are offsets into this table."""
    if fmt == "e4m3":
        return e4m3_from_index(np.arange(-126, 127)).astype(np.float64), 126
    return np.arange(-127, 128, dtype=np.float64), 127          # INT8: one step = one unit


def grid_fit(X, P, vals, off):
    """Per channel, in the value domain: centre m and scale beta of (value of X - value of P)."""
    u = vals[X + off] - vals[P + off]
    m = np.median(u, axis=0)
    return m, np.maximum(np.abs(u - m).mean(axis=0), 1e-6)


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


def _hist_entropy(v):
    _, c = np.unique(v, return_counts=True)
    p = c / c.sum()
    return float(-(p * np.log2(p)).sum())


# =====================================================================================
# 3. The interface every dictionary algorithm implements, and two of them
# =====================================================================================

class DeltaCoder:
    """One dictionary algorithm. It sees 8-bit codes as int16 arrays of shape (rows, d)."""
    name = "?"

    def fit(self, F):            # F: the fitting set (a block, a request, or calibration codes)
        raise NotImplementedError  # -> the dictionary D: a numpy array, or a tuple of them

    def encode(self, X, D):      # -> integer residuals, one row per entry, each decodable alone given D
        raise NotImplementedError

    def decode(self, r, D):      # -> the codes again, bit for bit
        raise NotImplementedError


def nbytes(D):
    """The dictionary's size in bytes, as it would be stored."""
    return sum(a.nbytes for a in (D if isinstance(D, tuple) else (D,)))


class Solo(DeltaCoder):
    """Rung 0: no dictionary at all; the residual is the code itself."""
    name = "solo"

    def fit(self, F):
        return np.zeros(0, np.int8)

    def encode(self, X, D):
        return X.astype(np.int16)

    def decode(self, r, D):
        return r.astype(np.int16)


class Loc(DeltaCoder):
    """The lightest dictionary: one location per channel (d bytes), the median of the fitting set."""
    name = "loc"

    def fit(self, F):
        return np.round(np.median(F, axis=0)).astype(np.int8)

    def encode(self, X, D):
        return X.astype(np.int16) - D      # int16: an int8 difference would wrap around

    def decode(self, r, D):
        return (r + D).astype(np.int16)


class PredictOrNot(DeltaCoder):
    """Wraps a coder with a per-channel flag: subtract the prediction, or store the raw code.
    The flag lives in the stored (fixed-length) format, so it is chosen on the fitting set by the
    fixed-length cost; it costs 1 bit per channel. On the E4M3 grid it keeps a weak prediction
    from costing more than no prediction at all."""

    def __init__(self, inner):
        self.inner, self.name = inner, inner.name + "+flag"

    def fit(self, F):
        D = self.inner.fit(F)
        r, x = self.inner.encode(F, D), F.astype(np.int16)
        use = fl_bits(r, fl_widths(r)) < fl_bits(x, fl_widths(x))
        return (D, np.packbits(use))

    def _use(self, D, d):
        return np.unpackbits(D[1])[:d].astype(bool)

    def encode(self, X, D):
        return np.where(self._use(D, X.shape[-1]), self.inner.encode(X, D[0]), X.astype(np.int16))

    def decode(self, r, D):
        return np.where(self._use(D, r.shape[-1]), self.inner.decode(r, D[0]), r).astype(np.int16)


# =====================================================================================
# 4. A delta as real bytes (the round-trip control packs and unpacks these)
# =====================================================================================

def pack_delta(r_row, x_row, n):
    """One entry's fixed-length delta: d two's-complement fields of n[c] bits, then one raw byte
    per escaped element, in channel order. Decodable alone, given n (part of the dictionary)."""
    esc = np.abs(r_row) >= 2 ** (n - 1)
    field = np.where(esc, -(2 ** (n - 1)), r_row)                   # the reserved value marks an escape
    bits = [(int(v) >> (k - 1 - i)) & 1 for v, k in zip(field, n) for i in range(int(k))]
    return np.packbits(np.array(bits, np.uint8)).tobytes() + x_row[esc].astype(np.int8).tobytes(), len(bits) + 8 * int(esc.sum())


def unpack_delta(buf, n):
    """Inverse of pack_delta: (field values, escape mask, raw codes of the escaped elements)."""
    nbits = int(n.sum())
    bits = np.unpackbits(np.frombuffer(buf, np.uint8))[:nbits]
    vals, pos = [], 0
    for k in n:
        u = int("".join(map(str, bits[pos:pos + k])), 2)
        vals.append(u - (1 << k) if u >= 1 << (k - 1) else u)       # sign-extend
        pos += k
    vals = np.array(vals, np.int16)
    esc = vals == -(2 ** (n - 1))
    raw = np.frombuffer(buf[(nbits + 7) // 8:], np.int8).astype(np.int16)
    assert len(raw) == esc.sum()
    return vals, esc, raw


def rebuild_entry(buf, coder, D, n):
    """Decode one entry alone: its delta bytes plus the dictionary -- nothing else."""
    r, esc, raw = unpack_delta(buf, n)
    x = coder.decode(np.where(esc, 0, r)[None, :], D)[0]           # escaped fields: placeholder residual
    x[esc] = raw                                                    # ...then the raw codes overwrite them
    return x


# =====================================================================================
# 5. Scoring one coder at one scope (the accounting rule)
# =====================================================================================

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


def shuffle_tokens(X_eval, seed=0):
    """The shuffle control's input: entries permuted across all evaluation sequences (each entry intact)."""
    n_seq, T, d = X_eval.shape
    flat = X_eval.reshape(-1, d)
    return flat[np.random.default_rng(seed).permutation(n_seq * T)].reshape(X_eval.shape)


# =====================================================================================
# 6. A tiny synthetic data set with a known answer
# =====================================================================================

def synthetic_kv(n_eval=4, n_calib=8, T=8192, d=64, true_b=2048, var_req=1.0, var_blk=1.0, seed=0):
    """Float 'KV' with known structure. Channel c of entry t in sequence s:
         x = mu_c + s_c * (request offset[s, c] + block offset[s, t // true_b, c] + noise),
       offsets ~ N(0, var_req) and N(0, var_blk), noise ~ N(0, 1). One channel in 16 has a large,
       constant mean (like the outlier channels of pre-RoPE keys). Returns (calibration, evaluation)."""
    rng = np.random.default_rng(seed)
    mu = rng.normal(0, 0.5, d)
    k = max(1, d // 16)
    mu[:k] = rng.choice([-1.0, 1.0], k) * rng.uniform(4, 8, k)
    sc = rng.uniform(0.5, 1.5, d)

    def seqs(n):
        req = rng.normal(0, np.sqrt(var_req), (n, 1, d))
        blk = rng.normal(0, np.sqrt(var_blk), (n, T // true_b, d)).repeat(true_b, axis=1)
        return (mu + sc * (req + blk + rng.normal(0, 1, (n, T, d)))).astype(np.float32)

    return seqs(n_calib), seqs(n_eval)


def location_gains(calib_f, eval_f, bs):
    """Experiment 1a's location gain, in the float domain (no grid): per channel,
    1/2 log2(variance around the wider scope's location / variance around the narrower one's),
    averaged over channels. Returns gainreq and, for each block size b, gainblk."""
    n_seq, T, d = eval_f.shape
    x = eval_f.astype(np.float64)
    var_global = ((x - calib_f.reshape(-1, d).mean(axis=0)) ** 2).mean(axis=(0, 1))
    var_request = x.var(axis=1).mean(axis=0)
    var_block = {b: x.reshape(n_seq, T // b, b, d).var(axis=2).mean(axis=(0, 1)) for b in bs}
    half_log = lambda a, z: float(np.mean(0.5 * np.log2(a / z)))
    return dict(gainreq=half_log(var_global, var_request),
                gainblk={b: half_log(var_request, v) for b, v in var_block.items()})


def to_codes(calib, ev, fmt):
    """Both sets as 8-bit codes in index space, with the format's scale fit on calibration only."""
    if fmt == "e4m3":
        s = e4m3_scale(calib)
        return e4m3_index(e4m3_round(calib / s)), e4m3_index(e4m3_round(ev / s))
    s = int8_scale(calib)
    return int8_index(calib, s), int8_index(ev, s)


# =====================================================================================
# 7. Wave 2: the proxy indexer and the trace replay
# =====================================================================================

def exact_topk(Q, K, k):
    """The proxy indexer for one decode step and layer: attention probabilities of each query head
    over all earlier positions, summed over heads; the k most-attended positions are the selection S.
    Q: (heads, dk) queries; K: (positions, dk) keys (one KV head shared, for brevity)."""
    s = Q @ K.T / np.sqrt(K.shape[1])
    p = np.exp(s - s.max(axis=1, keepdims=True))
    p /= p.sum(axis=1, keepdims=True)
    return np.argpartition(-p.sum(axis=0), k - 1)[:k]


def heaviest_blocks(cache, b, n_D):
    """Residency policy 1: the n_D blocks with the most entries in the hot cache right now."""
    counts = {}
    for p in cache:
        counts[p // b] = counts.get(p // b, 0) + 1
    return sorted(counts, key=lambda j: -counts[j])[:n_D]


def replay(selections, B, b, n_D, policy="heaviest"):
    """Token LRU of B entries (HiSparse's hot cache) plus an LRU of n_D block dictionaries per layer.
    Returns the miss rate m, the delta-miss fraction f_D and the dictionary loads per step n_load."""
    cache, dcache = OrderedDict(), OrderedDict()
    misses = total = dmisses = loads = 0
    for S in selections:
        S = set(int(p) for p in S)
        new = [p for p in S if p not in cache]
        for p in S.difference(new):
            cache.move_to_end(p)                         # hits become the most recently used
        for p in new:                                    # misses: evict the LRU entry not needed now
            if len(cache) >= B:
                del cache[next(v for v in cache if v not in S)]
            cache[p] = None
            if p // b in dcache:                         # its dictionary is on the GPU: a delta-miss
                dmisses += 1
                dcache.move_to_end(p // b)
        wanted = heaviest_blocks(cache, b, n_D) if policy == "heaviest" else [p // b for p in new]
        for j in dict.fromkeys(wanted):                  # policy 2 ("lru"): blocks touched by a miss
            if j in dcache:
                dcache.move_to_end(j)
                continue
            loads += 1
            if len(dcache) >= n_D:
                dcache.popitem(last=False)
            dcache[j] = None
        misses += len(new)
        total += len(S)
    return misses / total, dmisses / max(misses, 1), loads / len(selections)


def test_wave2(seed=3):
    """A drifting query over keys with block 'topics': selections concentrate in a few blocks that
    change slowly. Checks the shapes framework C expects, and that exact_topk runs."""
    rng = np.random.default_rng(seed)
    n_pos, b, dk, k, steps = 4096, 256, 16, 128, 300
    topics = rng.normal(0, 1, (n_pos // b, dk))
    K = 1.5 * topics.repeat(b, axis=0) + rng.normal(0, 1, (n_pos, dk))
    q = rng.normal(0, 1, (4, dk))
    sel = []
    for _ in range(steps):
        q = q + 0.15 * rng.normal(0, 1, q.shape)
        sel.append(exact_topk(q, K, k))
    ms = [replay(sel, B, b, 4)[0] for B in (k, 2 * k, 4 * k)]
    assert ms[0] >= ms[1] >= ms[2], ms                   # a bigger hot cache never misses more here
    fds = [replay(sel, 2 * k, b, n)[1] for n in (1, 2, 4, 8, 16)]
    assert fds[-1] >= fds[0], fds
    m, fD, nload = replay(sel, 2 * k, b, 4)
    return dict(miss_rates=[round(x, 3) for x in ms], fD_by_nD=[round(x, 3) for x in fds],
                nload_at_nD4=round(nload, 3))


# =====================================================================================
# 8. Run everything
# =====================================================================================

def main():
    t0 = time.time()
    out = {"generated_by": "analysis/plan_harness.py"}
    out["step0"] = test_step0()
    out["rates_check"] = test_rates()
    print("step 0 and rate checks passed:", out["step0"], out["rates_check"])
    out["wave2_check"] = test_wave2()
    print("wave-2 replay check passed:", out["wave2_check"])

    TRUE_B, VREQ, VBLK = 2048, 1.0, 1.0
    calib_f, eval_f = synthetic_kv(true_b=TRUE_B, var_req=VREQ, var_blk=VBLK)
    n_seq, T, d = eval_f.shape
    truth = dict(gainreq=0.5 * np.log2((VREQ + VBLK + 1) / (VBLK + 1)), gainblk=0.5 * np.log2(VBLK + 1))
    out["synthetic"] = dict(n_eval=n_seq, n_calib=calib_f.shape[0], T=T, d=d, true_b=TRUE_B,
                            var_req=VREQ, var_blk=VBLK, truth={k: round(float(v), 3) for k, v in truth.items()})
    bs = [256, 512, 1024, 2048, 4096]
    out["bs"] = bs
    fl = location_gains(calib_f, eval_f, bs)
    fl_shuf = location_gains(calib_f, shuffle_tokens(eval_f), bs)
    out["float_gains"] = dict(orig=dict(gainreq=round(fl["gainreq"], 3), gainblk={str(b): round(v, 3) for b, v in fl["gainblk"].items()}),
                              shuf=dict(gainreq=round(fl_shuf["gainreq"], 3), gainblk={str(b): round(v, 3) for b, v in fl_shuf["gainblk"].items()}))
    print("float-domain location gains (experiment 1a):", out["float_gains"])

    # ---- control 4 at byte level: pack, unpack and rebuild real deltas, one entry alone
    calib8, eval8 = to_codes(calib_f, eval_f, "int8")
    X = eval8[0, :2048]
    coder = Loc()
    D = coder.fit(X)
    r = coder.encode(X, D)
    n = fl_widths(r)
    packed_bits = 0
    for t in range(X.shape[0]):
        buf, nb = pack_delta(r[t], X[t], n)
        assert np.array_equal(rebuild_entry(buf, coder, D, n), X[t])          # one entry, decoded alone
        packed_bits += nb
    assert abs(packed_bits / X.size - fixed_length_rate(r, n)) < 1e-12        # the rate IS the byte count
    out["roundtrip"] = dict(entries=int(X.shape[0]), d=int(d), loc_dict_bytes=int(nbytes(D)),
                            mean_delta_bytes=round(packed_bits / 8 / X.shape[0], 2),
                            raw_entry_bytes=int(d), fixed_bits_per_element=round(packed_bits / X.size, 3))
    # the int8 wrap-around bug the round trip exists to catch
    Xw = np.array([[120, -120]], np.int8)
    bad = (Xw - np.array([-100, 100], np.int8)).astype(np.int8)               # residuals computed in int8
    out["roundtrip"]["int8_wraparound_example"] = dict(codes=[120, -120], location=[-100, 100],
                                                       int8_residual=bad[0].tolist(), true_residual=[220, -220])
    print("round trip (bytes) passed:", out["roundtrip"])

    # ---- the ladder: formats x coders x scopes x {original, shuffled}
    res = {}
    for fmt in ("int8", "e4m3"):
        calib, ev = to_codes(calib_f, eval_f, fmt)
        shuf = shuffle_tokens(ev)
        res[fmt] = {}
        # rung 0 (solo) is global by definition; the source's index-space Laplace shown for comparison
        solo = score(ev, calib, Solo(), "global", fmt=fmt).tolist()
        F = calib.reshape(-1, d)
        src = np.mean([entropy_rate(ev[s], *laplace_fit(F)) for s in range(n_seq)])
        out.setdefault("solo", {})[fmt] = dict(entropy=round(solo[0], 3), fixed=round(solo[1], 3),
                                               entropy_index_space_laplace=round(float(src), 3),
                                               order0_hist=round(float(np.mean([_hist_entropy(ev[..., c]) for c in range(d)])), 3))
        for coder in (Loc(), PredictOrNot(Loc())):
            res[fmt][coder.name] = {}
            for tag, data in (("orig", ev), ("shuf", shuf)):
                row = {"global": score(data, calib, coder, "global", fmt=fmt).tolist(),
                       "request": score(data, calib, coder, "request", fmt=fmt).tolist(),
                       "block": {b: score(data, calib, coder, "block", b, fmt=fmt).tolist() for b in bs}}
                # control 3: scope request must equal scope block with b = T, to the bit
                assert np.array_equal(score(data, calib, coder, "block", T, fmt=fmt), np.array(row["request"]))
                res[fmt][coder.name][tag] = row
        print(f"[{fmt}] done ({time.time() - t0:.1f}s)")

    def rnd(v):
        return [round(x, 4) for x in v]

    ladder = {}
    gains = {}
    for fmt, coders in res.items():
        ladder[fmt] = {}
        gains[fmt] = {}
        for name, tags in coders.items():
            ladder[fmt][name] = {tag: {"global": rnd(row["global"]), "request": rnd(row["request"]),
                                       "block": {str(b): rnd(v) for b, v in row["block"].items()}}
                                 for tag, row in tags.items()}
            gains[fmt][name] = {}
            for tag, row in tags.items():
                g = {}
                for i, rate in enumerate(("entropy", "fixed")):
                    best_b = min(bs, key=lambda b: row["block"][b][i])
                    g[rate] = dict(gainreq=round(row["global"][i] - row["request"][i], 3),
                                   gainblk=round(row["request"][i] - row["block"][best_b][i], 3),
                                   best_b=best_b, bpe_global=round(row["global"][i], 3),
                                   bpe_best=round(row["block"][best_b][i], 3))
                gains[fmt][name][tag] = g
    out["ladder"] = ladder
    out["gains"] = gains

    # ---- control 1 (synthetic truth) and control 2 (shuffle), as assertions
    g8 = gains["int8"]["loc"]["orig"]["entropy"]
    assert g8["best_b"] == TRUE_B, "the block gain should peak at the true block length"
    assert abs(g8["gainblk"] - fl["gainblk"][TRUE_B]) < 0.1, (g8, fl)       # 1b (INT8) tracks 1a (float)
    assert abs(g8["gainreq"] - fl["gainreq"]) < 0.1, (g8, fl)
    for fmt in gains:
        for name in ("loc", "loc+flag"):
            for rate in ("entropy", "fixed"):
                s = gains[fmt][name]["shuf"][rate]
                # block-local gains must vanish; the request gain falls only to the calibration gap
                assert s["gainblk"] < 0.05, ("shuffle control failed", fmt, name, rate, s)
    out["controls"] = dict(
        synthetic_truth=dict(best_b=g8["best_b"], gainblk=g8["gainblk"], gainreq=g8["gainreq"],
                             float_gainblk=round(fl["gainblk"][TRUE_B], 3), float_gainreq=round(fl["gainreq"], 3),
                             population_gainblk=round(truth["gainblk"], 3), population_gainreq=round(truth["gainreq"], 3)),
        shuffle={fmt: {name: gains[fmt][name]["shuf"]["entropy"] for name in ("loc", "loc+flag")} for fmt in gains},
        scope_consistency="request == block(b = T) for every coder, format and data set, to the bit",
        roundtrip="every block (residuals) + 2048 entries packed to bytes and rebuilt one at a time")
    # how the shuffled request gain (the calibration gap) shrinks with more calibration sequences
    gap = {}
    for n_cal in (2, 8, 32):
        c_f, e_f = synthetic_kv(n_eval=8, n_calib=n_cal, T=4096, true_b=TRUE_B, var_req=VREQ, var_blk=VBLK, seed=5)
        gap[str(n_cal)] = round(location_gains(c_f, shuffle_tokens(e_f), [TRUE_B])["gainreq"], 3)
    out["controls"]["calibration_gap_float"] = dict(n_eval=8, by_n_calib=gap)
    print("calibration gap (float, shuffled request gain) by number of calibration sequences:", gap)
    out["seconds"] = round(time.time() - t0, 1)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(out, f, indent=1)
    print(f"\n{'format':7}{'coder':10}{'data':6}{'rate':9}{'global':>8}{'request':>9}{'best b':>8}{'bpe':>7}{'g_req':>7}{'g_blk':>7}")
    for fmt in gains:
        for name in gains[fmt]:
            for tag in ("orig", "shuf"):
                for rate in ("entropy", "fixed"):
                    g = gains[fmt][name][tag][rate]
                    req = ladder[fmt][name][tag]["request"][0 if rate == "entropy" else 1]
                    print(f"{fmt:7}{name:10}{tag:6}{rate:9}{g['bpe_global']:8.3f}{req:9.3f}{g['best_b']:8d}"
                          f"{g['bpe_best']:7.3f}{g['gainreq']:7.3f}{g['gainblk']:7.3f}")
    print("solo (global): " + " · ".join(f"{f} entropy {v['entropy']:.3f}, fixed {v['fixed']:.1f}" for f, v in out["solo"].items()))
    print(f"\nall controls passed in {out['seconds']} s -> {os.path.relpath(OUT)}")


if __name__ == "__main__":
    main()
