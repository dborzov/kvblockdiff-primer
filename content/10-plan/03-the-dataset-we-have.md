---
title: The dataset we have, and what to add cheaply
nav: The dataset we have
group: Where we stand
lede: Thirty sequences of keys and values sit on disk already. Most of the next experiments need nothing more. The few that do need something are one script away, and this page prices each addition.
cards:
  - q: What does the Bench dump hold for each token?
    a: 'Its values and its pre-RoPE keys at each of the six KV layers, two heads of 256 elements, in BF16, plus its token kind'
    wrong: ["Its hidden state at every layer", "Its queries and the indexer's picks", "Only the values, in FP8"]
    why: 'The dump is `k` and `v` of shape `(n_tokens, 6, 2, 256)` as captured in BF16; FP8 is derived on read with one power-of-two scale per layer and tensor. Nothing about queries was kept.'
    sec: holds
  - q: Why is "prefill only" a limit of the dump?
    a: Every token was shown to the LLM, none was written by it; tokens the LLM writes itself might grow different keys and values
    wrong: ["Because prefill tokens have no keys", "Because prefill is lossy", "Because the hot cache only holds decode tokens"]
    why: The orchard of a serving sequence is mostly prompt, so prefill is the right first measurement, but the newest stretch, the one attention reads most, is written during decode and is not in the dump.
    sec: limits
  - q: What does computing the queries for the dump cost?
    a: One forward pass per sequence, the same pass that produced the dump, plus about 200 MB per sequence to store the queries of the last 8192 positions
    wrong: ["Training a new indexer", "A second GPU", "Nothing, they are already in the dump"]
    why: Queries are a linear projection of the same hidden state as keys and values; the pass that computed one computed the other and threw it away.
    sec: one-script
---

Here is one sequence of the Bench, as a Python session would see it after loading the dump.

```python one sequence of target 02, as stored
v.shape == (225_000, 6, 2, 256)      # values: bf16 as captured, one row per prefill token
k.shape == (225_000, 6, 2, 256)      # keys, recovered before RoPE (64 of 256 elements rotated back)
token_kind.shape == (225_000,)       # template / system / user / assistant / tool_call / tool_response
v_fp8 = fp8_e4m3(v, scale=pow2_per_layer)   # derived on read: one power-of-two scale per layer and tensor
```

That is the whole asset, thirty times over. It cost one evening on an RTX 5080, and every number of Part VIII came out of it.

## What the dump holds {#holds}

| item | the Bench dump (target 02) | source |
|---|---|---|
| the LLM | Qwen3.5-2B, 24 layers, of which 6 are [[kv-layer|KV layers]] (layers 3, 7, 11, 15, 19, 23 of the 24); 2 KV heads × 256, 8 query heads | [[#measured-the-data]] |
| sequences | 30, of 219 678 to 229 360 tokens each, 6.8 M tokens in all; since 2026-11-03: 13 dev sequences (`0000`–`0009` here and the three of target 03) and 20 holdout sequences (`0010`–`0029`), read only for the reported measurement | target 02 README |
| text | the user's own coding-agent transcripts, rendered into Qwen's chat template; tool output 26–89 % of a sequence | target 02 README |
| tensors | `v` as projected; `k` before RoPE, inverted to about one BF16 ulp on the 64 rotated elements | [[#landscape-rope-and-mla]] |
| format | BF16 as captured; FP8 E4M3 derived with one power-of-two scale per layer and tensor, chosen so the 99.99th percentile of magnitudes lands near 256, round to nearest even; INT8 per furrow also derived; every scenario in scope uses the FP8 copy, and BF16 and INT8 are out of scope since 2026-11-03 | target-writer spec §1 |
| token kinds | one label per token: template, system, user, assistant, tool call, tool response | `target.json` |
| size | one sequence's values ≈ 700 MB at 8 bits (1.4 GB in BF16); all 30 sequences ≈ 20.9 GB of value bytes, and the same again for keys | [[#measured-the-data]] |
| a smaller twin | target 03: 3 sequences of the same family (all three dev sequences since 2026-11-03), the campaigns' screens | [[#measured-rules-of-the-game]] |

The token kinds are the one metadata the campaigns barely used. They make a cheap split available for free: tool responses (the repetitive part, where echoes live) against assistant turns (prose-like), inside the same sequence, with the same compressor.

::: aside source Receipts
`targets/02-qwen3.5-2b-agent-long30/README.md` and `target.json` (`extra.fast_kvcache.token_kinds`); FP8 rule in `docs/spec/target-writer.md` §1; sizes from PART-XI-SPEC §1.1 (≈ 228K × 6 × 2 × 256 B per sequence).
:::

::: takeaway
- Thirty sequences, 225K tokens each, values and pre-RoPE keys at six KV layers, BF16 with FP8 and INT8 derived, one token kind per token.
- The token kinds give a free genre split inside each sequence.
:::

## Its limits {#limits}

Four limits, each the reason for one experiment later in this Part.

1. **One genre.** Coding-agent transcripts repeat themselves: file listings, tool outputs, the same identifiers. [[echo|Echo similarity]] is the axis that mattered, and echoes are a property of this text ([[#plan-next-in-the-harness]], prose).
2. **Prefill only.** Every token was shown to the LLM in 2048-token pieces; none was written by it. The newest stretch of a serving sequence is written during decode, and the dump has no such tokens.
3. **No queries, so no indexer.** The forward pass that produced the dump computed `q` for every token and kept only `k` and `v`. Without queries there is no top-k, no [[pick]], no [[hot-cache]] miss to count ([[#plan-queries-and-picks]]).
4. **One LLM.** Qwen3.5-2B is a [[stand-in-llm|stand-in LLM]]. Its two KV heads and partial [[rope|RoPE]] are its own; the Pin's GLM-5.1 keeps one [[mla|MLA]] latent per token and has no head axis ([[#plan-risks]]).

::: theme which-vs-what
Limits 1, 2 and 4 are about *what* is stored. Limit 3 is the only one about *which* positions are wanted, and it is the one that holds back every application-side number.
:::

::: takeaway
- One genre, prefill only, no queries, one LLM.
- The third limit is the one to remove first: it unblocks all of Q3.
:::

## One script away {#one-script}

Each addition below reuses the dump script, so the cost is mostly running time and disk.

| addition | how | cost (estimate) | what it unlocks |
|---|---|---|---|
| **queries** [[~q-tensor]] per token, per KV layer, per query head | the same forward pass; keep `q` instead of discarding it. GQA: 8 query heads share 2 KV heads, so `q[t, l]` has shape `(8, 256)`; store the last 8192 positions of each sequence as the decode window | one pass per sequence; 8 × 256 × 6 × 2 B = 24 KB per token, ≈ 200 MB per sequence, ≈ 6 GB for 30 | exact top-k as a stand-in indexer, the pick trace, every replay of [[#plan-hot-cache-replay]] |
| **hidden states `x`** per token at the six KV layers | the same pass; keep the input of each KV layer's projections | one vector per token per KV layer, BF16; a few GB per sequence, so keep 8192 positions | a predictor of keys and values from the state they came from; whether the indexer's own key could serve as a free dictionary |
| **a prose corpus** | 10 sequences of long prose (books, long documents) through the same dump script | one evening; ≈ 1.4 GB per sequence in BF16 | whether echo-driven gains survive without tool output ([[#plan-next-in-the-harness]]) |
| **a second LLM** | Qwen3-1.7B: 28 layers, all KV layers, 8 KV heads × 128; fits the 16 GB GPU at 32K tokens | one evening; 28 × 32 768 × 8 × 128 × 2 B ≈ 1.9 GB of values per sequence | whether stereo and echo are properties of transformers or of one LLM |
| **generated tokens** | let the LLM write 4K tokens after each prompt and dump those too | slower than prefill; hours for 30 sequences | the newest stretch's statistics against prefill's |

Two notes on the queries, because they matter most. First, the dumped keys are stored before RoPE, and attention scores need keys after it; the forward pass applies the rotation itself, so recording scores inside the pass costs nothing and avoids re-rotating 20 GB of keys. Second, 8192 decode positions per sequence is a choice: enough steps for a hot cache of 4096 slots to warm up and show its steady state, small enough to keep the trace under a gigabyte per sequence ([[#plan-queries-and-picks]]).

::: takeaway
- Queries are the first addition: one pass, 200 MB per sequence, and all of Q3 opens.
- Hidden states, a prose corpus, a second LLM and generated tokens each cost about an evening.
:::
