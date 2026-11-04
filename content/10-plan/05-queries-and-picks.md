---
title: 'Queries and picks: a stand-in indexer'
nav: Queries and picks
group: Next experiments
lede: The Bench has never had an indexer, so it has never had a pick. One forward pass that keeps the queries, and an exact top-k over them, gives a pick trace per sequence, and with it every application-side number this site has only ever estimated.
cards:
  - q: What is the output of the pick-trace subproblem?
    a: 'For each decode step and each KV layer, the set of `k` token positions attention would read: `picks[step][layer_id]`'
    wrong: ["The compressed bytes of each pick", "The hot cache's miss rate", "A trained indexer"]
    why: The trace records which positions are wanted and nothing about their bytes. Miss rates come later, from replaying it; a trained indexer is what the exact top-k stands in for.
    sec: subproblem
  - q: Why can the trace be computed inside the same forward pass that made the dump?
    a: Queries are a projection of the same hidden state as keys and values, and the pass applies RoPE itself, so the scores against pre-RoPE keys need no re-rotation
    wrong: ["Because the dump already contains queries", "Because top-k needs no keys", "Because RoPE does not apply to keys"]
    why: The pass computed `q` for every token and threw it away. Keeping it, or the scores, is a flag in the dump script.
    sec: compute
  - q: Why is an exact top-k only a stand-in for a trained indexer?
    a: 'A DSA indexer is a separate small network trained to approximate attention''s ranking, with its own keys and learned head weights, and GLM-5.1 selects once for a group of layers'
    wrong: ["Because exact top-k is lossy", "Because trained indexers pick fewer positions", "Because attention has no ranking"]
    why: The stand-in reproduces the ranking the indexer is trained to copy, so stretch-level statistics should carry over; exact miss rates are checked against HiSparse's published ones.
    sec: stand-in
---

Every number on the application side of this site, 274 misses per layer per step, a 13.4 % miss rate at 4096 slots, the δ-miss fraction of the napkin, comes from HiSparse's paper or from an assumption ([[#landscape-derived-numbers]], [[#app-the-napkin]]). None was measured on [[bench|the Bench]], because the Bench never had an [[indexer]]. This page is the cheapest way to give it one.

::: note key Run on 2026-11-03, on a smaller LLM
This experiment was run on Qwen 2.5 1.5B, not on the Bench: a dump of five coding-agent sequences of 24.5K–30K tokens that kept its queries ([[#picks-the-bachelor]]). The stand-in rule as run differs from the listing below in three details: one selection per layer from the mean of all 12 query heads, not one per KV head; a resident window of 0 or 32 positions; and squeezed rows of 4 positions for DeepSeek-V4-style layers ([[#picks-the-bachelor/stand-in-rule]]). The results are Part XI ([[#picks-dispatch]]). The Bench itself still has no trace.
:::

## The subproblem, stated {#subproblem}

The project's goal is to serve a sparse-attention LLM with fewer bytes on the [[link]] and fewer GPU bytes per [[sequence]] than HiSparse, with the LLM's outputs unchanged. The bill of that goal ([[#app-the-napkin]]) has two kinds of term: how many bytes a miss costs, which the compression scenario supplies, and how many misses there are and where they land, which only a record of *which* positions are picked can supply. The second kind can be studied apart from the first, because a cache never looks inside what it holds ([[#hypotheses-two-localities]]).

**Inputs and output.** An LLM with its weights, one sequence of tokens, and its orchard `k` as the LLM grows it. The output is a pick trace:

```python the pick trace
picks[step][layer_id]  # a set of token_pos_id, of size k, for every decode step and every KV layer
```

A trace is valid when, for every step, every set holds exactly `k` positions earlier than that step's token, chosen by one fixed rule applied to the LLM's own queries and keys. The rule is the indexer. The Bench's LLM has none, so the rule here is **exact top-k attention**: the `k` positions with the largest attention probability, summed over the query heads of one KV head. That is the ranking a trained indexer is taught to copy, and it is a stand-in, not the thing itself (below).

**Assumed and not charged.** The forward pass itself (it ran once already for the dump); the positions a real indexer always keeps (the first tokens and a sliding window), which are resident anyway and change no miss; the choice of `k`, which the trace stores as a ranked list so that 512 and 1024 are prefixes of 2048.

**Consumes and feeds.** It consumes nothing from Part VIII; it needs only the dump of [[#plan-the-dataset-we-have]] plus one script. Its result feeds [[#plan-hot-cache-replay]], and through it [[#app-shelf-and-two-misses]], [[#app-on-fire]] and [[#app-victim-tier]], which today run on assumed numbers.

::: takeaway
- Input: an LLM, a sequence, its keys. Output: [[~pick-trace]], `k` positions per step and layer.
- No bytes of the orchard are involved; the trace is about which, not what.
:::

## Computing the queries {#compute}

In the decode-step listing of [[#landscape-attention]], the three projections sit on adjacent lines:

```python the three lines that matter (from decode_step)
q   = (x @ W.q[layer_id]).reshape(n_q_heads,  head_dim)   # 8 query heads on the Bench
key = (x @ W.k[layer_id]).reshape(n_kv_heads, head_dim)   # 2 KV heads
val = (x @ W.v[layer_id]).reshape(n_kv_heads, head_dim)
head_id = qh // (n_q_heads // n_kv_heads)                  # GQA: 4 query heads share each KV head
```

The dump kept `key` and `val` and discarded `q`. Keeping it is a flag. Two practical points:

- **Scores, not queries, are the cheap thing to keep.** The dumped keys are stored before [[rope|RoPE]]; attention needs them after it. The pass rotates both `q` and `key` itself, so recording the top-k *inside* the pass avoids re-rotating 20 GB of keys. Keep `q` as well for the last 8192 positions (24 KB per token in BF16, ≈ 200 MB per sequence) so that other selection rules can be tried later.
- **Prefill tokens as decode steps.** The dump is prefill only, so position `t` scores every earlier position exactly as decode would, but the token at `t` was shown, not written. The trace is "what full attention would have picked at prefill"; the caveat is carried to [[#plan-risks]].

Cost: one forward pass per sequence of 225K tokens, in pieces of 2048, the same job that produced the dump. The scores for 8192 steps against 225K positions, 8 query heads, 6 layers, are a few hundred GFLOP per sequence: seconds on the RTX 5080.

::: takeaway
- One flag in the dump script; record the top-k inside the pass, keep `q` for the last 8192 positions.
- One pass per sequence, seconds of scoring, 200 MB of queries per sequence.
:::

## Exact top-k as a stand-in indexer {#stand-in}

```python the stand-in indexer, one step, one KV head
def exact_topk(q, K, k):
    """q: (4, 256) the queries of the 4 query heads that share this KV head, after RoPE;
    K: (pos, 256) this KV head's keys so far, after RoPE. Returns k positions."""
    s = q @ K.T / np.sqrt(256)                       # (4, pos) scores
    p = np.exp(s - s.max(axis=1, keepdims=True))
    p /= p.sum(axis=1, keepdims=True)                # attention probabilities per query head
    return np.argsort(-p.sum(axis=0))[:k]            # ranked, so k = 512, 1024 are prefixes of 2048
```

Per KV head, because that is the unit the orchard stores and a cherry covers; the DSA indexer also aggregates over heads, with learned weights where this sums ([[#papers-sparse-selectors]]). Stored as `int32`, 8192 steps × 6 layers × 2 heads × 2048 picks is about 800 MB per sequence; 2048 steps, enough for a first replay, is 200 MB.

::: define trace-replay
- **What it is.** Recording `picks[step][layer_id]` once, then re-running any cache, HiSparse's hot cache, a dictionary shelf, a victim tier, on that list, as often as needed, with no GPU and no bytes of the orchard.
- **Why it works.** A cache only needs to know which items are wanted, in which order. The trace *is* that order; a replay is a loop over it ([[#plan-hot-cache-replay]]).
- **Easy to confuse with** re-running the LLM. The LLM runs once, to make the trace; the replay runs a thousand times, on the trace.
:::

::: figure fig-plan-stand-in-raster planSelections
**What a trace of an exact top-k looks like, on synthetic keys.** 4096 positions in 16 stretches of 256; each key is its stretch's topic vector (times the strength) plus noise, in 16 elements; four query heads drift by the chosen amount per step; each of 300 steps selects the top $\vk = 128$ positions by attention probability summed over the four heads. Horizontal axis: position; vertical axis: decode step; a cell shades how many picks fall into 64 positions × 5 steps (darker is more). Thin lines are stretch boundaries. The readout gives the share of a step's picks held by its heaviest 1, 2 and 4 stretches, and how long the heaviest stretch stays heaviest.
:::

::: try
1. Set the topic strength to 0. No stretch is special, yet the heaviest one still holds about 11 % of the picks (an even spread would give 6 %): random keys line up with the queries by chance.
2. Raise it to 2. Dark columns appear: four stretches hold almost 90 % of the picks, [[heavy-stretch|heavy stretches]].
3. Change the drift. At 0.05 the heaviest stretch stays heaviest for about 75 steps; at 0.4 for under 6. Concentration and lifetime are different things.
:::

Three caveats keep the stand-in honest.

- **A trained indexer is not attention.** DSA's indexer is a separate small network with its own compact keys, trained to approximate attention's ranking; it ranks a little differently, and it is cheaper precisely because it is not exact ([[#papers-sparse-selectors]]). The stretch-level statistics should carry over; exact miss rates will not, which is why the first replay reading is a comparison with HiSparse's 30 / 13.4 / 6.7 % at 2048 / 4096 / 8192 slots ([[#landscape-lucky-louis]]).
- **GLM-5.1 selects once for a group of layers.** The trace above is per layer; a grouped selection is a derived trace (the union, or the top-k of the summed scores) and is one of the experiments of [[#plan-other-experiments]].
- **The queries are prefill queries.** Tokens the LLM writes itself may look back differently; generated tokens are an addition on [[#plan-the-dataset-we-have/one-script]].

::: takeaway
- Exact top-k per KV head, summed over its four query heads, ranked so that smaller `k` are prefixes.
- A stand-in for stretch statistics, calibrated against HiSparse's miss rates; not a trained indexer.
:::
