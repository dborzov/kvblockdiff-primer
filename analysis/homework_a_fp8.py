"""Shared helpers for the homework-a scripts (Part VI, pages VI.1-VI.12).

The 8-bit grids the site talks about, written out in numpy:
  * FP8 E4M3 ("fn" variant): 127 non-negative values (0, 7 subnormals, 15 binades x 8, minus NaN),
    253 distinct values with the sign; we work in its monotone *index space* (-126..126).
  * INT8 with one scale per channel: a uniform grid of 255 codes (-127..127).
These are the same functions as the source proposal's wave-1 code (re-typed, re-tested here).
"""
import numpy as np


def e4m3_grid():
    """All non-negative E4M3 values, sorted: 0, 7 subnormals, 15 binades x 8 (minus NaN) = 127 values."""
    sub = [m / 8 * 2.0 ** -6 for m in range(1, 8)]
    nor = [(1 + m / 8) * 2.0 ** (e - 7) for e in range(1, 16) for m in range(8)][:-1]
    return np.array([0.0] + sub + nor, dtype=np.float64)


GRID = e4m3_grid()
assert len(GRID) == 127 and GRID[-1] == 448.0


def e4m3_round(x):
    """Nearest E4M3 value (ties to even), saturating at 448; -0 becomes +0."""
    ax = np.minimum(np.abs(x).astype(np.float64), 448.0)
    e = np.floor(np.log2(np.maximum(ax, 2.0 ** -6)))     # binade; subnormals share 2^-6
    step = 2.0 ** (e - 3)                                   # 3 mantissa bits
    q = np.minimum(np.rint(ax / step) * step, 448.0)
    return np.sign(x) * q


def e4m3_index(xq):
    """Monotone integer index of an E4M3 value, in [-126, 126]."""
    r = np.searchsorted(GRID, np.abs(xq)).astype(np.int64)
    return np.where(xq < 0, -r, r)


def e4m3_from_index(r):
    return np.sign(r) * GRID[np.abs(r)]


def int8_codes(x, scale):
    """The uniform alternative: one scale per channel, codes clipped to +-127."""
    return np.clip(np.rint(x / scale), -127, 127).astype(np.int64)


def hist_entropy(codes):
    """Plug-in order-0 entropy (bits) of an integer array: the ideal rate of a code fit to its histogram."""
    _, counts = np.unique(np.asarray(codes).ravel(), return_counts=True)
    p = counts / counts.sum()
    return float(-(p * np.log2(p)).sum())


def _selftest():
    x = np.random.default_rng(0).standard_normal(100000) * 40
    xq = e4m3_round(x)
    assert np.array_equal(e4m3_from_index(e4m3_index(xq)), xq)
    assert set(np.unique(np.abs(xq))) <= set(GRID)


_selftest()
