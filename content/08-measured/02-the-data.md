---
title: The data on the table
nav: The data on the table
group: Setting the stage
lede: 'Every number in this Part was computed from one pile of bytes: the values half of the orchard that Qwen3.5-2B grew while reading thirty very long coding-agent transcripts. Before any compressor, a tour of the table: the LLM, the text, and the bytes.'
cards:
  - q: How many of Qwen3.5-2B's 24 layers are KV layers?
    a: 'Six: every fourth layer (3, 7, 11, 15, 19, 23), which the orchard indexes as KV layers 0 to 5. The other eighteen are linear-attention layers with a fixed-size state'
    wrong: ["All 24", "Twelve, every other layer", "One, the last"]
    why: The LLM is a hybrid. A linear-attention layer carries one fixed-size summary forward instead of a memory of every token, so it has nothing per token to store or compress.
    sec: the-llm
  - q: How big is one token's values at one KV layer, at 8 bits?
    a: '512 bytes: 2 KV heads × 256 elements, the cherry `v[t, l, :, :]`'
    wrong: ["256 bytes", "1024 bytes", "3072 bytes"]
    why: 'One head is 256 elements; a layer has two KV heads. Across the six KV layers a token''s values are 3072 bytes.'
    sec: the-llm
  - q: What text produced the orchards?
    a: 'Thirty of the author''s own coding-agent transcripts, about 225K tokens each, read by the LLM (prefill) but not continued'
    wrong: ["Two books, two code repositories, two transcripts and two LongBench prompts", "Random token sequences", "The LLM's own generated answers"]
    why: 'The plan had asked for genre diversity. What was captured is one genre: 30 sequences of 219 678–229 360 tokens, prefill positions only, tool output 26–89 % of each.'
    sec: the-text
  - q: Why does "one kind of text" matter for reading this Part?
    a: Coding-agent transcripts are full of repeated tool output and tool calls; any gain that comes from repeats may be smaller on prose
    wrong: ["Because the LLM cannot read other text", "Because tool output is stored in a different number format", "It does not matter; orchards are the same for any text"]
    why: A later page finds that a punnet's difficulty follows its share of repeated tokens. A novel repeats itself less than a transcript of file reads.
    sec: the-text
  - q: How was the FP8 copy of the values derived?
    a: From the BF16 capture, with one power-of-two scale per layer and tensor, rounded to the nearest E4M3 value
    wrong: ["One scale per furrow", "Captured directly in FP8 by the LLM", "One absmax scale per punnet"]
    why: 'The INT8 variant uses one scale per furrow instead; C2 coded the FP8 copy only.'
    sec: the-bytes
  - q: Why do the stored keys differ from the LLM's own keys by about one BF16 ulp in 64 of 256 elements?
    a: The orchard held keys after RoPE; the rotation of the 64 rotary elements was inverted to recover the pre-RoPE keys, and BF16 rounding cannot be fully undone
    wrong: ["The keys were quantized to FP8 first", "The LLM uses a different RoPE for keys and queries", "The exporter dropped the sign bit"]
    why: 'Only 64 of the 256 elements are rotated (partial RoPE). The other 192 are bit-identical to the orchard; for lossless coding the recovered keys are simply the data.'
    sec: the-bytes
---

Open the folder and there is one thing in it: 20.9 GB of bytes. They are the values half of an [[orchard]], grown by one small LLM while it read thirty very long conversations between a programmer and a coding agent. Every ratio in this Part is a statement about that pile and nothing else. So before the compressors, a tour of the table: which LLM, which text, which bytes.

## The LLM {#the-llm}

The LLM is Qwen3.5-2B, [[bench|the Bench]]'s LLM ([[#landscape-reference-settings]]). It has 24 [[layer|layers]], but only every fourth (3, 7, 11, 15, 19 and 23) is an ordinary [[attention]] layer that keeps keys and values: a [[kv-layer|KV layer]]. The other eighteen are linear-attention layers with a state of fixed size: each carries one summary vector forward from token to token instead of a memory of every token, so there is nothing per token to store or compress. The whole orchard of this LLM lives in six layers, and the orchard's `layer_id` counts them 0 to 5. **KV layer 0 is the LLM's layer 3, KV layer 1 its layer 7, and so on to KV layer 5, its layer 23.** The campaigns' pages say "L3" and "L7"; this Part says both where it matters.

Each KV layer has 2 KV [[head|heads]] of 256 elements (8 query heads share them). One token's values at one KV layer are therefore $2 \times 256 = 512$ elements, 512 bytes at 8 bits; across all six KV layers, 3072 bytes.

| | |
|---|---|
| layers | 24, of which 6 are KV layers: the LLM's 3, 7, 11, 15, 19, 23 = `layer_id` 0 … 5 |
| KV heads per layer | 2, of 256 elements each (8 query heads, grouped-query attention) |
| values of one token at one KV layer | 512 elements, 512 bytes at 8 bits: the cherry `v[t, l, :, :]` |
| values of one token, all six KV layers | 3072 bytes: the cherry `v[t, :, :, :]` |
| keys | same shape; recovered before RoPE (below) |

One note on the Pin's arithmetic. The Pin's cherry is one token's MLA latent at one layer, 640 bytes, keys and values in one ([[#landscape-orchard]]). The campaigns coded values alone on the Bench, so the natural cherry is one token's values at one KV layer, 512 bytes, and C1 began with one head of 256. Which elements make one cherry deserves a page of its own ([[#measured-cutting-the-tensor]]).

::: takeaway
- Qwen3.5-2B: 24 layers, six of them KV layers (`layer_id` 0–5 = the LLM's 3, 7, 11, 15, 19, 23). The linear-attention layers keep a fixed-size state and have nothing per token to compress.
- One KV layer's values for one token: 2 heads × 256 = 512 bytes at 8 bits; all six KV layers: 3072 bytes.
:::

## The text {#the-text}

The plan asked for genre diversity: books, code, transcripts, benchmark prompts. What was captured is one genre. The thirty [[sequence|sequences]] are the author's own transcripts of sessions with a coding agent, re-rendered into Qwen's chat template, each between 219 678 and 229 360 [[token|tokens]] long, 6 806 453 tokens in all. The LLM read them ([[prefill-decode|prefill]]) and wrote nothing; only the positions it read are stored.

These are not conversations in the usual sense. Tool output (files the agent read, commands it ran) makes up 26–89 % of a sequence and the agent's tool calls another 4–63 %; human and agent prose is the small remainder. The same file paths, JSON envelopes and error messages come round again and again.

Two sets were cut from this material. **Target 03**, the smoke test: 3 sequences, two for development and one held out; nearly every number in this Part comes from its two development sequences. **Target 02**, the full set: 30 sequences, 10 for development, 5 held out, the rest untouched; the best compressors were re-run on five of them at the very end. Since 2026-11-03 the split is fixed for every scenario and compressor: dev sequences `0000` to `0009` of target 02 and the three of target 03; holdout sequences `0010` to `0029` of target 02, read only for the reported measurement ([[#scenario-the-score]]).

::: note warning One kind of text
Whatever this Part says about repeats was found in text that repeats itself unusually often. A later page shows that a punnet's difficulty is set by its share of repeated tokens ([[#measured-signal-or-noise]]). A novel, a legal brief or a chat without tool calls would have a different share; nobody has measured them. The geometry findings ([[#measured-two-kinds-of-structure]]) have a reason to transfer; the repeat findings carry this caveat.
:::

::: takeaway
- 30 sequences of about 225K tokens each, prefill only, 6.8 M tokens: the author's own coding-agent transcripts.
- Tool output and tool calls dominate; the text repeats itself far more than prose.
- Target 03 (2 dev + 1 holdout) carried nearly every measurement; target 02 (30) checked the best compressors on five sequences.
:::

## The bytes {#the-bytes}

The orchard was captured in [[bf16|BF16]], as the LLM computes it. Two 8-bit copies were derived: an [[fp8|FP8 E4M3]] copy with one power-of-two scale per layer and tensor, rounded to the nearest representable value ([[#school-fp8]]), and an INT8 copy with one scale per [[furrow]]. C2 coded the FP8 values and nothing else. C1 also coded BF16 and found every compressor family landing at about half its FP8 ratio plus 0.25: the four low BF16 bits are noise no predictor reaches, so the FP8 copy carries all the structure there is.

::: aside source Receipts
Geometry, sequences, tool-output shares and the RoPE inversion: `targets/02-qwen3.5-2b-agent-long30/README.md` (spec §1.1). The scale rule: `docs/spec/target-writer.md` §1. BF16 ≈ FP8/2 + 0.25: coder 05 at 0.8198 (FP8) and 0.6599 (BF16), r2-t0013; the same relation along the C1 ladder within 0.0004 (notes/04 §3.3). Byte counts: one sequence 228,144 × 6 × 2 × 256 = 700,858,368 bytes; 6,806,453 × 3072 ≈ 20.9 GB. The repository writes the tensor `V[sequence][position][layer][head][channel]` with the layer named by its number in the model; the site's `layer_id` is that list's index.
:::

Keys got one extra step. The plan wanted keys *before* [[rope|RoPE]], where a furrow's values sit around a stable centre instead of wobbling with position ([[#landscape-rope-and-mla]]); the orchard holds them after. Only 64 of a head's 256 elements are rotated in this LLM, so the exporter inverted that rotation; the recovered keys agree with the LLM's own to about one BF16 ulp on those 64 elements and exactly on the rest. For a [[lossless]] compressor that is simply the data.

Here is the orchard of one sequence as the site indexes it, `[token_pos_id, layer_id, head_id, elem_id]`. One element is one byte, the FP8 bit pattern: `v[100, 1, 0, 32]` holds 68, which means 3.0.

```python the values of one sequence, as exported
v = values_of_sequence(0)                 # layer_id 0..5 = the LLM's layers 3, 7, 11, 15, 19, 23
v.shape                                   # (228144, 6, 2, 256): tokens, KV layers, KV heads, elements
v[100, 1, 0, :]                           # one V vector: token 100, KV layer 1 (L7), head 0: 256 bytes
v[100, 1]                                 # one token's values at KV layer 1, both heads: (2, 256), 512 bytes
v[100]                                    # one token's values at every KV layer: (6, 2, 256), 3072 bytes
v[:, 1, 0, 32]                            # one furrow: element 32 of KV layer 1, head 0, along the whole text
v.nbytes                                  # 700,858,368: about 700 MB per sequence; 30 sequences, 20.9 GB
```

The middle three lines are the three [[cherry-shape|cherry shapes]] the campaigns cut from this orchard: `v[t, l, h, :]`, one head, [[~v-one-head]]; `v[t, l, :, :]`, one KV layer with both heads, [[~v-one-token-layer]]; `v[t, :, :, :]`, one token across all six KV layers. The [[slice]] is always the values, `v[:, layers, :, :]`; only the dicing changes ([[#scenario-cherry]]). [[#measured-rules-of-the-game]] writes each campaign scenario out in full; [[#measured-cutting-the-tensor]] measures which shape is right.

::: figure fig-measured-tensor msrTensor
**One sequence's values, and the three cherry shapes.** The box is the value orchard of one sequence: about 228K token positions along the long axis, six KV layers, two heads, 256 elements deep. Highlighted: one head of one token at one KV layer, cherry `v[t, l, h, :]`, 256 bytes; both heads of one KV layer, cherry `v[t, l, :, :]`, 512 bytes; all six KV layers of one token, cherry `v[t, :, :, :]`, 3072 bytes. Readouts: bytes per cherry under each shape, cherries per punnet at a stretch of 4096 tokens, bytes of one sequence and of all thirty. Click a shape to highlight it. Real sizes; the FP8 copy has one byte per element.
:::

::: takeaway
- Captured in BF16; coded as FP8 E4M3 with one power-of-two scale per layer and tensor. BF16 behaves like FP8 plus four bits of noise.
- Keys were recovered before RoPE by inverting the partial rotation, to about one BF16 ulp.
- One sequence is a `(228144, 6, 2, 256)` byte tensor of about 700 MB; a cherry is a head, a KV layer or a token of it.
:::
