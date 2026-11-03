---
title: Keys before RoPE; keys and values apart
nav: Keys and values
group: Two more bets
lede: RoPE spins pairs of key elements by an angle that grows with position, smearing a tidy cluster into a ring. Store keys before the spin. And treat keys and values as two problems, with their own slice, their own reference tree and their own verdict, because one night of measurement says they are alike in mechanism and different in detail.
cards:
  - q: A pair of key furrows sits near the same point token after token. What does RoPE do to it?
    a: It rotates the pair by an angle that grows with position, smearing the tight cluster into an arc or a whole ring
    wrong: ["Nothing; RoPE only touches queries", "It adds random noise to every element", "It shrinks the pair toward zero"]
    why: RoPE rotates each pair of key elements by position × that pair's speed. A location per furrow can no longer predict a value that keeps turning.
    sec: before-rope
  - q: Why store keys before RoPE?
    a: Before the spin the structured furrows are nearly constant and cheap to predict; the receiver rebuilds the pre-RoPE key exactly and applies the rotation for the known position
    wrong: ["Because RoPE is lossy", "Because attention never uses rotated keys", "Because pre-RoPE keys are smaller in bytes"]
    why: The rotation after decoding is a cheap element-wise step. The Bench's dump already holds keys with the rotation inverted.
    sec: before-rope
  - q: How did pre-RoPE keys compress, compared with values at the same layer, in the first campaign?
    a: About the same, with the same compressor family and the same stages in the same order; slightly lower ratios at every KV layer but the last
    wrong: ["Keys did not compress at all", "Keys compressed twice as well as values", "Keys needed a completely different compressor"]
    why: 'Keys against values at stretch 4096, head 0: 0.660 against 0.673 at KV layer 0, 0.701 against 0.740 at KV layer 2. Only KV layer 5 flips, because its values are unusually easy.'
    sec: verdict
  - q: Why are keys a separate scenario rather than half of a K+V cherry?
    a: Keys want their own reference tree (coding them on the values' tree costs +0.0024), their shared structure with values needs a global-scope table, and a K+V cherry is a third scenario with its own numbers
    wrong: ["Because keys are stored on a different GPU", "Because keys cannot be compressed under a leash", "Because values are noise"]
    why: 'The slice is the first axis of a scenario: `k[...]` and `v[...]` are different problems, and what they share (0.19 to 0.40 bit of the key) is not learnable per punnet.'
    sec: two-problems
---

Picture two [[furrow|furrows]] of a key that sit almost still, token after token: near 5 in one, near 1 in the other. A location per furrow predicts both almost perfectly, and the residuals are tiny. Now apply [[rope|RoPE]], the position code most LLMs put into their keys. The pair starts to turn, a little more with every token. Plotted against each other, the tidy dot becomes a ring.

## Keys before RoPE {#before-rope}

::: aside reminder RoPE
RoPE tells attention where a token sits by rotating each pair of key (and query) elements by an angle proportional to the position $\vt$ ([[#landscape-rope-and-mla]]). Each pair has its own speed θ, spread geometrically: the fastest pair turns about 1 radian per token, the slowest once in tens of thousands of tokens.
:::

A stretch-scope dictionary of furrow statistics predicts the stretch's mean. How much does the spin cost it? A few lines of numpy on one slow pair:

```python one pair of key furrows, before and after RoPE, in extra bits per element
import numpy as np
rng = np.random.default_rng(0)
t = np.arange(2048)
pair = np.array([5.0, 1.0]) + 0.25 * rng.standard_normal((2048, 2))      # a slow pair: near (5, 1) at every token
def extra_bits(theta, stretch_len):
    c, s = np.cos(t * theta), np.sin(t * theta)
    spun = np.stack([pair[:, 0] * c - pair[:, 1] * s, pair[:, 0] * s + pair[:, 1] * c], 1)   # RoPE: rotate by t·θ
    spread = lambda a: np.sqrt(np.mean([a[j:j + stretch_len].var(0).mean() for j in range(0, 2048, stretch_len)]))
    return np.log2(spread(spun) / spread(pair))     # bell-shaped residuals: log2 of the ratio of spreads around the stretch mean
for theta, b in [(0.001, 64), (0.01, 64), (0.1, 64), (0.01, 16), (0.01, 1024)]:
    print(f"theta {theta}  stretch {b}: {extra_bits(theta, b):.2f} extra bits per element")
```

| pair speed θ (radians per token) | stretch length | extra bits per element |
|---|---|---|
| 0.001 | 64 | 0.04 |
| 0.01 | 64 | 1.50 |
| 0.1 | 64 | 3.87 |
| 0.01 | 16 | 0.28 |
| 0.01 | 1024 | 3.83 |

::: figure fig-hyp-rope mbRopeSmear
**One pair of key furrows, before and after RoPE.** 2048 tokens of a toy pair that sits near (5, 1) with small noise (standard deviation 0.25, seeded). Grey: the pre-RoPE values of one stretch of $\vb$ tokens. Vermilion: the same tokens after RoPE, rotated by $\vt\,\theta$; faint vermilion: all 2048 tokens after RoPE. Blue dots: each version's stretch mean, exactly what a stretch-scope dictionary of furrow statistics predicts. The readout gives the spread around the stretch mean before and after, and the extra bits per element this costs, estimated as $\log_2$ of the ratio of spreads. Slide the pair's speed θ and the stretch length.
:::

The damage is uneven: what matters is θ times the stretch length. Fast pairs are scrambled at any stretch length; slow pairs survive in short stretches and fail in long ones. Either way the fix is the same and cheap: **store the key as it was before RoPE**. The receiver rebuilds the pre-RoPE key bit for bit, then applies the rotation for the known position, a handful of multiplications per element outside the hard part of the pipeline. KVQuant rounds keys before RoPE for the same reason ([[#papers-kvquant]]). The Bench's dump was made this way: the generator inverted the rotation, and elements 0 to 63 match the un-rotated key within one bf16 step.

::: note warning What "lossless" is relative to
A system that stores 8-bit keys *after* RoPE and one that stores them *before* and rotates later do not feed attention bit-identical numbers. Switching is a small change in numerics, made once, and any comparison with HiSparse must use the same choice on both sides.
:::

::: takeaway
- RoPE turns a nearly constant pair of key furrows into an arc or a ring; the cost grows with θ × stretch length.
- Store keys before RoPE and rotate after decoding; the Bench's dump already does.
:::

## Keys and values are two problems {#two-problems}

The [[slice]] is the first axis of a scenario ([[#scenario-slice]]), and `k[...]` and `v[...]` are different slices for good reasons. The first campaign's one night on keys found these, all at stretch 4096, FP8, head 0, two sequences:

- **Keys are Gaussian with a nearly constant norm**, because Qwen3.5-2B normalises them before RoPE (norm spread 2 to 3 %, kurtosis 3.0 to 3.1). Their solo rate is lower than the values' (0.776 to 0.786 against 0.799 to 0.819), and no key-specific in-stretch structure beyond the reference tree was found.
- **Keys drift slowly.** Stretch means explain 5 % (KV layer 0) and 12 % (KV layer 2) of a key's variance, against 1.6 % and 4 % for values.
- **Keys stay a chain layer deeper.** The nearest cherry is the same token again for 74 % of key cherries at KV layer 0 but 42 % at layer 2 and 33 % at layer 3; position-adjacent neighbours reach 41 % at KV layer 3. Values flip to hubs at KV layers 4 and 5; keys only at 5 ([[#hypotheses-echo]]).
- **Keys share information with values beyond any reference.** A key predicted from the same token's value: R² 0.40 (KV layer 0) and 0.62 (layer 2) raw; 0.26 and 0.44 after each has its own in-punnet reference; worth 0.19 and 0.40 bit per element of the key, but only through a map fit on *other* sequences, since a per-punnet fit scores about zero. That is a global-scope table ([[#scenario-scope]]), not a stretch dictionary.
- **Keys want their own tree.** Coding keys on the values' reference tree, with the links shared for free, is +0.0024 worse than keys on their own tree with the links paid for.
- **The rule across elements is largest on keys**: 0.236 bit per element at KV layer 2 after the reference, against 0.107 and 0.171 for values at layers 0 and 2.

A K+V cherry, `(k[t, l, :, :], v[t, l, :, :])` (1024 elements) with keys and values of one token at one layer, is therefore a third scenario, and its ratio is the byte-weighted mean of its halves:

$$
\vrho_{\text{K+V}} \;=\; \tfrac12\big(\vrho_{\vK} + \vrho_{\vV}\big) \;=\; \frac{\vbpe_{\vK} + \vbpe_{\vV}}{16}.
$$ {#eq-hyp-kv-rho}

At the first campaign's numbers for KV layer 2, 0.701 and 0.740, that is 0.72. What a hot-cache miss really moves is this cherry, and it has not been run ([[#plan-next-in-the-harness]]). On [[pin|the Pin]] the question has a different shape: GLM-5.1 keeps one MLA latent per token per layer, keys and values together, and RoPE lives in a small separate part of it ([[#landscape-rope-and-mla]]).

::: takeaway
- Keys: Gaussian, constant norm, slow drift, chains one layer deeper, 0.19 to 0.40 bit shared with values but only at global scope, and their own tree.
- A K+V cherry is a third scenario; its ratio is the mean of its halves, about 0.72 at the first campaign's numbers.
:::

## Verdict {#verdict}

One night of measurement, and it says: same mechanisms, same order, slightly better ratios. The first campaign ran its compressor family on pre-RoPE keys at every KV layer, stretch 4096, FP8, head 0, two development sequences, before the leash existed ([[#measured-night-one]]):

| KV layer (transformer layer) | keys: solo → best | values: solo → best | gain over solo, keys / values |
|---|---|---|---|
| 0 (3) | 0.776 → 0.660 | 0.800 → 0.673 | −0.116 / −0.127 |
| 1 (7) | 0.781 → 0.692 | 0.799 → 0.712 | −0.089 / −0.087 |
| 2 (11) | 0.779 → 0.701 | 0.804 → 0.740 | −0.078 / −0.064 |
| 3 (15) | 0.786 → 0.695 | 0.814 → 0.744 | −0.090 / −0.070 |
| 4 (19) | 0.780 → 0.681 | 0.819 → 0.728 | −0.098 / −0.092 |
| 5 (23) | 0.784 → 0.687 | 0.651 → 0.572 | −0.097 / −0.080 |

The same stages won on keys in the same order: reference cherries along the punnet's minimum spanning tree, then a match-quality class per cherry, with a neighbour term paying only in the chain layers. On ten sequences the tree step on keys at KV layer 0 reproduced at −0.0088 against −0.0083 on the two development sequences. KV layer 5's values are the one flip: a tenth of its furrows are one-signed offsets and its solo rate is unusually low.

Grades and gaps: every key number is dev-only on two sequences (ten for KV layer 0), head 0, with no leash, no isolated verification, and no second campaign; the second campaign compressed values only. Unmeasured: keys under the leash with the frontier compressor, keys' two heads joined (stereo on keys), the K+V cherry, and a global-scope key-from-value table. All four are rows of [[#plan-next-in-the-harness]].

::: aside source Receipts
Key and value ladders: r3-t0036, r3-t0040, r3-t0024, r3-t0035, r1-t0042; target 02: r2-t0052, r2-t0060. Solo landmarks: `c1/REPORT.md` scaling table. Norm, kurtosis, drift, same-token and adjacency rates: r3 journal SESSION-002, SESSION-003; `[gen/regimes]`, `[gen/bits]`. Keys from values: r3.H8 (kvjoint3.py, kvrank.py), `[relax/table]`. Keys on the values' tree: r1 a33 run_k. Cross-element rule on keys: `[gen/scopeG]`, xchan.py. Pre-RoPE dump: `docs/concepts/rope-and-keys.md`.
:::

::: takeaway
- Verdict: keys compress like values, with the same stages in the same order, 0.01 to 0.05 lower in ratio; one night, two sequences, no leash.
- Open: keys under the leash, keys' heads, the K+V cherry, the global key-from-value table.
:::
