---
title: 'The Bachelor: a dump with queries'
nav: The Bachelor
group: The setting
lede: The Bench has keys and values but no queries, so no indexer can run on it. A second, smaller dump kept the queries. This page describes that dump, writes the stand-in indexer as a Python function, and shows where one layer's attention goes before any pick is made.
cards:
  - q: What is the Bachelor?
    a: 'A dump of Qwen 2.5 1.5B Instruct over five coding-agent sequences of 24.5K to 30K tokens, with keys, values and queries of all 28 layers'
    wrong: ["A third reference setting next to the Pin and the Bench", "The Bench's orchard with queries added", "GLM-5.1's pick trace from the HiSparse paper"]
    why: 'It is a stand-in LLM''s dataset. Its numbers reach the Pin only through the scaling rules of the next page; the pill in the top bar does not switch to it.'
    sec: the-dump
  - q: Which tokens of the Bachelor are "decode-like"?
    a: Assistant text and tool calls (token kinds 3 and 4), the tokens a server would generate
    wrong: ["User messages and tool responses", "Only the last 8192 tokens of each sequence", "Every token after position 8192"]
    why: 'Qwen''s template puts tool responses in the user role (kind 2). Kinds 3 and 4 are 17–25 % of positions in four sequences and 69 % in sequence 3.'
    sec: the-dump
  - q: How does the stand-in indexer score a candidate position j at step t?
    a: By the LLM's own attention probability on j, averaged over the 12 query heads of the layer
    wrong: ["By the cosine between the key at j and the key at t", "By the sum of the values at j", "By a trained network's score"]
    why: 'The softmax is causal over j ≤ t; the self position is in the softmax but never a candidate; the 12-head mean gives one score per position, and the top k by that score are the picks.'
    sec: stand-in-rule
  - q: Why are smaller budgets prefixes of larger ones in the trace?
    a: The trace stores each step's candidates in rank order, not as a set, so the top 512 are the first 512 of the top 2048
    wrong: ["Because the indexer was run once per budget", "Because the hot cache keeps only the top 512", "Because the window removes the rest"]
    why: One ranking serves every budget from 64 to 2048, so the sweep of budgets needs no new pass over the dump.
    sec: stand-in-rule
  - q: 'With 512 picks per layer, what share of the attention mass (self excluded) do the picks hold on the Bachelor?'
    a: About 87 %
    wrong: ["About 24 %", "About 59 %", "About 99 %"]
    why: 'The top k positions hold 59 / 72 / 82 / 87 / 91 / 95 % at k = 16 / 64 / 256 / 512 / 1024 / 2048.'
    sec: mass
  - q: Where does most of a step's attention go, apart from the picks' tail?
    a: To four sink positions at the start (24 % of the non-self mass) and to the last 128 positions (40 %)
    wrong: ["Evenly over the whole context", "Mostly to the token itself", "To the stretch boundaries"]
    why: 'Misses come from what is left: the far, diffuse tail. Layers 0, 1 and 27 have almost no sink; layer 0 puts 39 % of its attention on the token itself.'
    sec: mass
---

[[bench|The Bench]] holds the values and pre-RoPE keys of Qwen3.5-2B over thirty transcripts, and no queries ([[#plan-the-dataset-we-have]]). Without queries no [[indexer]] can run, so the Bench has no [[pick|picks]] and no miss rates. The plan of [[#plan-queries-and-picks]] proposed one more forward pass of Qwen3.5-2B that keeps them. Before that pass was run, a second dump turned up on the research machine: five sequences through a smaller LLM, with the queries kept. The experiments of this Part ran on it.

## The dump {#the-dump}

The dump was made with the same export tool as the Bench, from a different LLM and different settings.

::: define bachelor
- **What it is.** Qwen 2.5 1.5B Instruct run over five Claude Code sessions, re-rendered in Qwen's chat template: 24 507 to 30 075 tokens each, 75–92 % of the LLM's 32K window. All 28 layers are full attention and keep an orchard. Keys and queries are stored after [[rope|RoPE]], values as they are, in bf16, for the prefill positions only. 14.8 GiB in all.
- **Example.** For sequence 0, `k.shape == v.shape == (24_507, 28, 2, 128)` (2 KV heads of 128 elements per layer) and `q.shape == (24_507, 28, 12, 128)`: 12 query heads, query head `qh` reading KV head `qh // 6`.
- **Easy to confuse with** [[bench|the Bench]], which is Qwen3.5-2B with 6 KV layers among 24 and 225K-token sequences, and with a [[reference-setting|reference setting]]. The Bachelor is a [[stand-in-llm|stand-in LLM]]'s dataset. Its numbers are carried to [[pin|the Pin]] by the rules of [[#picks-carrying-numbers]]; the pill in the top bar does not switch to it.
:::

| | the Bachelor | the Bench | the Pin |
|---|---|---|---|
| the LLM | Qwen 2.5 1.5B Instruct | Qwen3.5-2B | GLM-5.1 |
| layers that keep an orchard | 28 of 28 | 6 of 24 | 78 |
| KV heads × elements; query heads | 2 × 128; 12 | 2 × 256; 8 | one MLA latent of ≈ 640 |
| sequences, tokens each | 5, 24 507–30 075 | 30, 219 678–229 360 | 1 trace, 100 384 (HiSparse's) |
| stored | K and Q after RoPE, V, bf16 | V and K before RoPE | not ours |
| what was measured on it | picks, hot cache, shelf (this Part) | MDL ratios (Part VIII) | HiSparse's miss rates |

Every position of the dump also carries a token kind. Kind 2 is the user role, which in Qwen's template includes the tool responses. Kind 3 is assistant text and kind 4 is a tool call (assistant-written, for example the file contents of a write). Kinds 3 and 4 are what a server would generate token by token, so this Part calls their positions **decode-like steps**. They are 17.2, 23.4, 17.5, 69.4 and 24.8 % of the positions of sequences 0 to 4.

::: takeaway
- The Bachelor: Qwen 2.5 1.5B, 28 full-attention layers, 2 KV heads × 128, 12 query heads, five sequences of 24.5K–30K tokens, K, Q and V kept.
- Decode-like steps (assistant text and tool calls) are 17–25 % of positions in four sequences and 69 % in the fifth.
- A stand-in LLM's dataset, not a reference setting.
:::

## The stand-in rule {#stand-in-rule}

The indexer is replaced by the LLM's own attention, ranked. The listing is the attention step of [[#landscape-attention]] with the weighted sum of values replaced by a ranking, and with the softmax averaged over the 12 query heads instead of applied per head. At step `t` and one layer, every query head scores every earlier key, the scores go through the causal softmax, and the 12 heads' probabilities are averaged into one score per position. The picks are the `k` best-scored positions before `t`.

```python the stand-in indexer, one layer of the Bachelor at step t
import numpy as np

def stand_in_picks(Q, K, t, k, W=0, g=1):
    """Q: (n_tokens, 12, 128) queries, K: (n_tokens, 2, 128) keys, both after RoPE.
    Returns this layer's picks at step t, best first."""
    K12 = K[:t + 1].repeat(6, axis=1)                  # query head qh reads KV head qh // 6
    s = np.einsum("hd,jhd->hj", Q[t], K12) / np.sqrt(128)
    p = np.exp(s - s.max(axis=1, keepdims=True))
    p /= p.sum(axis=1, keepdims=True)                  # causal softmax over j <= t, per head
    score = p.mean(axis=0)                             # one score per position: the 12-head mean
    last = t - W                                       # j <= t - 1, minus the window
    if g == 1:
        cand = np.arange(last)
        return cand[np.argsort(-score[cand], kind="stable")][:k]
    rows = np.arange(last // g)                        # complete rows [4i, 4i + 4) before the window
    row_score = score[:g * len(rows)].reshape(-1, g).sum(axis=1)
    return rows[np.argsort(-row_score, kind="stable")][:k]

rng = np.random.default_rng(0)
Q, K = rng.standard_normal((40, 12, 128)), rng.standard_normal((40, 2, 128))
print(stand_in_picks(Q, K, t=39, k=5))               # [18 13  3 16 36]
print(stand_in_picks(Q, K, t=39, k=5, W=8))          # [18 13  3 16 11]: 36 is in the window
print(stand_in_picks(Q, K, t=39, k=3, W=8, g=4))     # [4 5 0]: squeezed rows 4, 5 and 0
```

The rule has five parts, each a choice recorded before the replay ran.

1. **One selection per layer.** A pick is `(layer_id, token_pos_id)` and serves both KV heads, as in DSA ([[#landscape-sparse-attention]]). The cherry it maps to is `v[t, l, :, :]`, 256 elements here (2 heads × 128). A selection per KV head is measured only as an overlap ([[#picks-the-indexer]]).
2. **Candidates are `j <= t - 1`.** The current token's own row is computed on the GPU during the step and is never a pick. Its probability stays in the softmax, so the scores of the candidates sum to less than 1.
3. **Ranked.** The trace stores each step's candidates in rank order, up to 2304 of them, so the top 512 are the first 512 of the top 2048, and one trace serves every budget from 64 to 2048.
4. **The resident window `W`.** The last `W` positions are always on the GPU, are never picks and never touch the [[hot-cache|hot cache]]. `W = 0` for DSA-style configurations (HiSparse keeps only the newest row resident) and `W = 32` for DeepSeek-V4-style ones; 128 is a sensitivity check.
5. **Squeezed rows, `g = 4`.** For DeepSeek-V4's compressed layers a pick is a row of 4 aligned positions `[4i, 4i + 4)`, scored by the sum of its members' scores; only complete rows count. The stand-in squeezes scores, not keys: it asks which 4-position rows hold the attention, which a trained V4 indexer is taught to answer.

Every position of a sequence is a step: prefill queries stand in for decode queries, since the LLM's attention at `t` is the same whether the token at `t` was written or shown. The hot cache runs from `t = 0`; counts start at `t = 8192`, so the counted context runs from 8K to 30K tokens. This is the [[trace-replay|trace replay]] of [[#plan-queries-and-picks]], with the trace kept as rankings.

::: takeaway
- Score = the 12-head mean of the causal softmax; candidates `j <= t - 1`; the top `k` are the picks, stored ranked up to 2304.
- `W` resident positions are excluded (0 or 32); squeezed rows of `g = 4` are scored by the sum of their members.
- Counts are taken over steps `t >= 8192`, on a hot cache that has run since `t = 0`.
:::

## Where one step's attention goes {#mass}

Before replaying anything, the traces show how concentrated the attention is. Shares below are of the non-self mass, the attention left after the token's own position, averaged over steps `t >= 8192` and over 140 (sequence, layer) pairs.

| what holds the mass | share of the non-self mass |
|---|---|
| the top 16 / 64 / 256 picks | 59 / 72 / 82 % |
| the top 512 / 1024 / 2048 picks | 87 / 91 / 95 % |
| the four sink positions `j < 4` | 24 % (almost none in layers 0, 1 and 27) |
| the last 128 positions | 40 % |

The token's own position takes 8 % of the total mass on average and 39 % in layer 0. Layers 0 and 1 have no sink and are local: the last 128 positions hold 37 % and 64 % of their total mass. In layers 2 to 26 the four sink positions take 12–42 % of the total mass, so with `W = 0` every top-`k` contains them; a position picked at every step stays in the hot cache. **Misses come from the rest: the far, diffuse tail** that the top 512 holds only partly.

::: figure fig-picks-mass picksMass
**How much of one step's attention the picks hold.** Horizontal axis: the budget `k`, picks per layer per step (16 to 2048, log scale). Vertical axis: the share of the non-self attention mass held by the top-`k` positions under the stand-in rule (`W = 0`, `g = 1`), averaged over steps `t >= 8192` of the five sequences. Faint lines: each of the 28 layers. The switch shows the mean of the 28 layers (band: the range over the five sequences) or one layer, chosen with the slider. The dashed line marks `k = 512`, the pin-scaled budget. The readout gives, for the mean or the chosen layer, the shares of the top 64, 512 and 2048, the token's own share of all attention, and the shares of the first four positions and of the last 128 positions. Grade: measured on the Bachelor's traces.
:::

::: try
1. Switch to one layer and set the slider to 0. The readout's self share is large and its share for the first four positions near zero: a local layer.
2. Move the slider to a middle layer, then to 27. The first four positions hold a large share in the first and almost none in the second.
:::

::: aside source Receipts
bachelor-kv (private repository `dborzov/bachelor-kv`) at commit 8f5a471: `docs/design.md` §2 (the dump, token kinds), §3 (the stand-in rule, `W`, `g`), §5 (steps, `t_count = 8192`); `docs/traces.md` (ranked to `K1 = 2304`); `docs/log.md` 2026-11-03 (decode-like shares 17.2 / 23.4 / 17.5 / 69.4 / 24.8 %, per-layer sink and self). Mass shares: `results/summary/attention.json`, `R7_attention_mass` (`captured_g1_W0`, `shares_of_nonself`, `shares_of_total`), computed at commit d3c2b80; grade measured. `docs/results.md` §2.
:::

::: takeaway
- The top 512 picks hold 87 % of the non-self attention; 2048 hold 95 %.
- Four sink positions hold 24 % and the last 128 positions 40 %; the misses come from the far tail.
- Layer 0 is local (39 % on the token itself); layers 0, 1 and 27 have almost no sink.
:::
