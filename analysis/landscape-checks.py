"""Checks for Part III (Where things stand).

Runs the Python snippets printed on pages III.2, III.4, III.6 and III.9 and recomputes every
derived number quoted in Part III from the reference setting. Run from the repository root:

    python3 analysis/landscape-checks.py

It prints the numbers and fails with an AssertionError if any of them drifts from the prose.
"""
import json
from collections import OrderedDict
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------- III.2 decode_step
rng = np.random.default_rng(0)
WIDTH, N_LAYERS, N_Q, N_KV, HEAD_W = 64, 4, 8, 2, 16
Wq = rng.normal(0, WIDTH**-0.5, (N_LAYERS, WIDTH, N_Q * HEAD_W))
Wk = rng.normal(0, WIDTH**-0.5, (N_LAYERS, WIDTH, N_KV * HEAD_W))
Wv = rng.normal(0, WIDTH**-0.5, (N_LAYERS, WIDTH, N_KV * HEAD_W))
Wo = rng.normal(0, (N_Q * HEAD_W)**-0.5, (N_LAYERS, N_Q * HEAD_W, WIDTH))


def softmax(s):
    e = np.exp(s - s.max())
    return e / e.sum()


def decode_step(x, keys, values):
    for l in range(N_LAYERS):
        q = (x @ Wq[l]).reshape(N_Q, HEAD_W)
        key = (x @ Wk[l]).reshape(N_KV, HEAD_W)
        val = (x @ Wv[l]).reshape(N_KV, HEAD_W)
        keys[l].append(key); values[l].append(val)
        K, V = np.stack(keys[l]), np.stack(values[l])
        out = []
        for qh in range(N_Q):
            h = qh // (N_Q // N_KV)
            wts = softmax(K[:, h] @ q[qh] / np.sqrt(HEAD_W))
            out.append(wts @ V[:, h])
        x = x + np.concatenate(out) @ Wo[l]
    return x


keys = [[] for _ in range(N_LAYERS)]
values = [[] for _ in range(N_LAYERS)]
for t in range(5):
    x = decode_step(rng.normal(size=WIDTH), keys, values)
assert (len(keys[0]), keys[0][0].shape) == (5, (2, 16))
print("III.2 decode_step:", len(keys[0]), keys[0][0].shape)

# worked softmax example of III.2
w = softmax(np.array([1.0, 2.0, 3.0]))
assert np.allclose(np.round(w, 2), [0.09, 0.24, 0.67]) and round(float(w @ [10, 20, 30]), 1) == 25.8
w2 = softmax(np.array([2.0, 4.0, 6.0]))
assert np.allclose(np.round(w2, 2), [0.02, 0.12, 0.87]) and round(float(w2 @ [10, 20, 30]), 1) == 28.5
print("III.2 softmax example:", np.round(w, 3), round(float(w @ [10, 20, 30]), 2))

# ---------------------------------------------------------------- III.4 sparse attention
rng = np.random.default_rng(1)


def indexer_topk(q_idx, K_idx, k):
    scores = np.maximum(K_idx @ q_idx, 0)
    return np.argsort(scores)[-k:]


def sparse_attention(q, K, V, S):
    wts = softmax(K[S] @ q / np.sqrt(len(q)))
    return wts @ V[S]


n_stored, k = 100_000, 2048
K_idx = rng.normal(size=(n_stored, 16))
K, V = rng.normal(size=(2, n_stored, 64))
S = indexer_topk(rng.normal(size=16), K_idx, k)
out = sparse_attention(rng.normal(size=64), K, V, S)
assert len(S) == 2048 and out.shape == (64,)
print("III.4 sparse attention:", len(S), "of", n_stored, "read; output", out.shape)

# ---------------------------------------------------------------- III.6/III.7 resolve on the toy trace
def hisparse_resolve(S, cache, B, fetch):
    hits = [p for p in S if p in cache]
    misses = [p for p in S if p not in cache]
    for p in misses:
        if len(cache) >= B:
            victim = next(v for v in cache if v not in S)
            cache.pop(victim)
        cache[p] = fetch(p)
    for p in hits:
        cache.move_to_end(p)
    return [cache[p] for p in S]


T = json.loads((ROOT / "figures/data/toy-trace.json").read_text())
cache = OrderedDict((p, p) for p in T["initialCache"])
for S, exp in zip(T["steps"], T["expected"]["hisparse"]):
    before = list(cache)
    hisparse_resolve(S, cache, T["B"], lambda p: p)
    got = dict(hits=[p for p in S if p in before], misses=[p for p in S if p not in before],
               evicted=[p for p in before if p not in cache], cacheAfter=list(cache))
    assert got == exp, (got, exp)
print("III.7 toy trace: resolve rule matches expected.hisparse")

# ---------------------------------------------------------------- reference setting and derived numbers
NL, k, L, e, e16, tpot, Wlink, Mhbm = 78, 2048, 100_384, 640, 1280, 0.030, 50e9, 30e9
miss = {2048: 0.30, 4096: 0.134, 8192: 0.067}

# III.5 memory wall
kv128 = 131_072 * NL * e16
naive_step = k * NL * e16
naive_bw = naive_step / tpot
assert round(kv128 / 1e9, 1) == 13.1 and round(naive_step / 1e6) == 204 and round(naive_bw / 1e9, 1) == 6.8
print(f"III.5 KV at 128K (BF16) {kv128/1e9:.1f} GB; naive {naive_step/1e6:.1f} MB/step, {naive_bw/1e9:.2f} GB/s;"
      f" link full at {Wlink/naive_bw:.1f} (practical) / {64e9/naive_bw:.1f} (nominal) requests")

# III.9 power law
B = np.array([2048, 4096, 8192]); m = np.array([miss[b] for b in B])
slope, icpt = np.polyfit(np.log(B / 2048), np.log(m), 1)
a = np.exp(icpt)
assert round(slope, 2) == -1.08 and round(a, 3) == 0.294
fit = lambda b: a * (b / 2048) ** slope
belady_equiv = 2048 * (a / 0.082) ** (1 / -slope)
print(f"III.9 fit: m(B) = {a:.3f} (B/2048)^{slope:.3f}; doubling factor {2**slope:.3f};"
      f" Belady 8.2% ~ LRU at {belady_equiv:.0f} slots; FIFO ~ {2048*(a/0.172)**(1/-slope):.0f}, random ~ {2048*(a/0.161)**(1/-slope):.0f}")
assert 6600 < belady_equiv < 6800

# III.11 derived numbers
for b in (2048, 4096, 8192):
    misses = round(miss[b] * k)
    step = misses * NL * e
    n_link = Wlink * tpot / step
    n_mem = Mhbm / (b * NL * e)
    print(f"III.11 B={b}: {misses} misses/layer/step, {step/1e6:.2f} MB/step, {step/tpot/1e9:.3f} GB/s,"
          f" link feeds {n_link:.0f}, memory holds {n_mem:.0f} (hot cache {b*NL*e/1e6:.0f} MB)")
assert round(Wlink * tpot / (274 * NL * e)) == 110 and round(Mhbm / (4096 * NL * e)) == 147
Bs = np.exp(np.linspace(np.log(2048), np.log(16384), 20001))
best = np.minimum(Wlink * tpot / (fit(Bs) * k * NL * e), Mhbm / (Bs * NL * e))
i = best.argmax()
print(f"III.11 best balance: {best[i]:.0f} requests at {Bs[i]:.0f} slots")
window = tpot / NL
batch = 110 * 274 * e
print(f"III.11 window {window*1e3:.3f} ms; {batch/1e6:.2f} MB per layer slice; link {batch/Wlink*1e6:.0f} us;"
      f" decoder 500 GB/s {batch/500e9*1e6:.1f} us, 2 TB/s {batch/2e12*1e6:.1f} us")
print("all Part III checks passed")
