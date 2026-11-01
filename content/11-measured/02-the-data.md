---
title: The data on the table
nav: The data on the table
group: Setting the stage
lede: 'Every number in this Part was computed from one pile of bytes: the values half of the KV cache that Qwen3.5-2B wrote while reading thirty very long coding-agent transcripts. Before any coder, a tour of the table: the model, the text, and the bytes.'
cards:
  - q: How many of Qwen3.5-2B's 24 layers keep a KV cache?
    a: 'Six: every fourth layer (3, 7, 11, 15, 19, 23). The other eighteen are linear-attention layers with a fixed-size state'
    wrong: ["All 24", "Twelve, every other layer", "One, the last"]
    why: The model is a hybrid. A linear-attention layer carries one fixed-size summary forward instead of a memory of every token, so it has nothing per token to store or compress.
    sec: the-model
  - q: How big is one value entry of one token at one layer, at 8 bits?
    a: '512 bytes: 2 KV heads × 256 elements'
    wrong: ["256 bytes", "1024 bytes", "3072 bytes"]
    why: 'One head is 256 elements; a layer has two KV heads. Across the six layers a token''s values are 3072 bytes; the plan''s 1024-element entry counted keys and values together.'
    sec: the-model
  - q: What text produced the caches?
    a: 'Thirty of the author''s own coding-agent transcripts, about 225K tokens each, read by the model (prefill) but not continued'
    wrong: ["Two books, two code repositories, two transcripts and two LongBench prompts", "Random token sequences", "The model's own generated answers"]
    why: 'The plan had asked for genre diversity. What was captured is one genre: 30 sequences of 219,678–229,360 tokens, prefill positions only, tool output 26–89 % of each.'
    sec: the-text
  - q: Why does "one kind of text" matter for reading this Part?
    a: Coding-agent transcripts are full of repeated tool output and tool calls; any gain that comes from repeats may be smaller on prose
    wrong: ["Because the model cannot read other text", "Because tool output is stored in a different number format", "It does not matter; KV caches are the same for any text"]
    why: A later page finds that a block's difficulty follows its share of repeated tokens. A novel repeats itself less than a transcript of file reads.
    sec: the-text
  - q: How was the FP8 copy of the values derived?
    a: From the BF16 capture, with one power-of-two scale per layer and tensor, rounded to the nearest E4M3 value
    wrong: ["One scale per channel", "Captured directly in FP8 by the model", "One absmax scale per block"]
    why: 'That is the recipe of IX.5. The INT8 variant uses one scale per channel instead; C2 coded the FP8 copy only.'
    sec: the-bytes
  - q: Why do the stored keys differ from the model's own keys by about one BF16 ulp in 64 of 256 channels?
    a: The cache held keys after RoPE; the rotation of the 64 rotary channels was inverted to recover the pre-RoPE keys the plan asked for, and BF16 rounding cannot be fully undone
    wrong: ["The keys were quantized to FP8 first", "The model uses a different RoPE for keys and queries", "The exporter dropped the sign bit"]
    why: 'Only 64 of the 256 channels are rotated (partial RoPE). The other 192 are bit-identical to the cache; for lossless coding the recovered keys are simply the data.'
    sec: the-bytes
---

Open the folder and there is one thing in it: 20.9 GB of bytes. They are the values half of a [[kv-cache|KV cache]], written by one small model while it read thirty very long conversations between a programmer and a coding agent. Every ratio in this Part is a statement about that pile and nothing else. So before the coders, a tour of the table: which model, which text, which bytes.

## The model {#the-model}

The model is Qwen3.5-2B, the [[proxy-model|proxy model]] the plan fixed on [[#plan-data]]. It has 24 [[layer|layers]], but only every fourth (3, 7, 11, 15, 19 and 23) is an ordinary [[attention]] layer with a KV cache. The other eighteen are linear-attention layers with a state of fixed size: each carries one summary vector forward from token to token instead of a memory of every token, so there is nothing per token to store or compress. The whole KV cache of this model lives in six layers.

Each of those layers has 2 KV [[head|heads]] of 256 elements (8 query heads share them). One token's values at one layer are therefore $2 \times 256 = 512$ elements, 512 bytes at 8 bits; across all six layers, 3072 bytes.

| | |
|---|---|
| layers | 24, of which 6 keep a KV cache: 3, 7, 11, 15, 19, 23 |
| KV heads per layer | 2, of 256 elements each (8 query heads, grouped-query attention) |
| values of one token at one layer | 512 elements, 512 bytes at 8 bits |
| values of one token, all six layers | 3072 bytes |
| keys | same shape; recovered before RoPE (below) |

One correction to the plan's arithmetic. [[#plan-data]] called an [[entry]] "keys plus values of one token at one layer", 1024 elements. The campaigns coded values alone, so the natural entry is half that, and C1 began with one head of 256. Which elements make one entry deserves a page of its own ([[#measured-cutting-the-tensor]]).

::: takeaway
- Qwen3.5-2B: 24 layers, six with a KV cache. The linear-attention layers keep a fixed-size state and have nothing per token to compress.
- One layer's values for one token: 2 heads × 256 = 512 bytes at 8 bits; all six layers: 3072 bytes.
- The plan's 1024-element entry counted keys and values; the campaigns coded values alone.
:::

## The text {#the-text}

The plan asked for genre diversity: books, code, transcripts, benchmark prompts. What was captured is one genre. The thirty sequences are the author's own transcripts of sessions with a coding agent, re-rendered into Qwen's chat template, each between 219,678 and 229,360 [[token|tokens]] long, 6,806,453 tokens in all. The model read them ([[prefill-decode|prefill]]) and wrote nothing; only the positions it read are stored.

These are not conversations in the usual sense. Tool output (files the agent read, commands it ran) makes up 26–89 % of a sequence and the agent's tool calls another 4–63 %; human and agent prose is the small remainder. The same file paths, JSON envelopes and error messages come round again and again.

Two sets were cut from this material. **Target 03**, the smoke test: 3 sequences, two for development and one held out; nearly every number in this Part comes from its two development sequences. **Target 02**, the full set: 30 sequences, 10 for development, 5 held out, the rest untouched; the best coders were re-run on five of them at the very end.

::: note warning One kind of text
Whatever this Part says about repeats was found in text that repeats itself unusually often. A later page shows that a block's difficulty is set by its share of repeated tokens ([[#measured-signal-or-noise]]). A novel, a legal brief or a chat without tool calls would have a different share; nobody has measured them. The geometry findings ([[#measured-two-kinds-of-structure]]) have a reason to transfer; the repeat findings carry this caveat.
:::

::: takeaway
- 30 sequences of about 225K tokens each, prefill only, 6.8 M tokens: the author's own coding-agent transcripts.
- Tool output and tool calls dominate; the text repeats itself far more than prose.
- Target 03 (2 dev + 1 holdout) carried nearly every measurement; target 02 (30) checked the best coders on five sequences.
:::

## The bytes {#the-bytes}

The cache was captured in [[bf16|BF16]], as the model computes it. Two 8-bit copies were derived exactly as [[#plan-fp8-target]] prescribed: an [[fp8|FP8 E4M3]] copy with one power-of-two scale per layer and tensor, rounded to the nearest representable value, and an INT8 copy with one scale per [[channel]]. C2 coded the FP8 values and nothing else. C1 also coded BF16 and found every coder family landing at about half its FP8 ratio plus 0.25: the four low BF16 bits are noise no model reaches, so the FP8 copy carries all the structure there is.

::: aside source Receipts
Geometry, sequences, tool-output shares and the RoPE inversion: `targets/02-qwen3.5-2b-agent-long30/README.md` (spec §1.1). The scale rule: `docs/spec/target-writer.md` §1. BF16 ≈ FP8/2 + 0.25: coder 05 at 0.8198 (FP8) and 0.6599 (BF16), r2-t0013; the same relation along the C1 ladder within 0.0004 (notes/04 §3.3). Byte counts: one sequence 228,144 × 6 × 2 × 256 = 700,858,368 bytes; 6,806,453 × 3072 ≈ 20.9 GB.
:::

Keys got one extra step. The plan wanted keys *before* [[rope|RoPE]], where a channel's values sit around a stable centre instead of wobbling with position; the cache holds them after. Only 64 of a head's 256 channels are rotated in this model, so the exporter inverted that rotation; the recovered keys agree with the model's own to about one BF16 ulp on those 64 channels and exactly on the rest. For a [[lossless]] coder that is simply the data.

Here is the tensor as the campaigns indexed it. The repository writes it `V[sequence][position][layer][head][channel]`, naming the layer by its number in the model; in the array below the layer axis is by position, so layer 7 is index 1. One element is one byte, the FP8 bit pattern: the repository's `V[0][100][7][0][32]` holds 68, which means 3.0.

```python the value tensor of one sequence, as the campaigns indexed it
V = values_of_sequence(0)                 # layer axis by position: (3, 7, 11, 15, 19, 23).index(layer)
V.shape                                   # (228144, 6, 2, 256): tokens, KV layers, KV heads, channels
V[100, 1, 0]                              # one token's values at layer 7, head 0: 256 bytes
V[100, 1].reshape(-1)                     # both heads at layer 7: 512 bytes
V[100].reshape(-1)                        # all six layers of token 100: 3072 bytes
V[:, 1, 0, 32]                            # channel 32 of layer 7, head 0, along the whole text
V.nbytes                                  # 700,858,368: about 700 MB per sequence; 30 sequences, 20.9 GB
```

The middle three slices are the three ways the campaigns cut an entry out of this tensor: one head (256 bytes), one layer with both heads (512 bytes), one token across all six layers (3072 bytes). [[#measured-rules-of-the-game]] names the cut; [[#measured-cutting-the-tensor]] measures which one is right.

::: figure fig-msr-tensor msrTensor
**One sequence's values, and the three ways to cut an entry.** The box is the value tensor of one sequence: about 228K token positions along the long axis, six KV layers, two heads, 256 channels. Highlighted slices: one head of one token at one layer (256 bytes), both heads of one layer (512 bytes), all six layers of one token (3072 bytes). Readouts: bytes per entry under each cut, entries per 4096-token block, bytes of one sequence and of all thirty. Click a cut to highlight it. Real sizes; the FP8 copy has one byte per element.
:::

::: takeaway
- Captured in BF16; coded as FP8 E4M3 with one power-of-two scale per layer and tensor, the recipe of IX.5. BF16 behaves like FP8 plus four bits of noise.
- Keys were recovered before RoPE by inverting the partial rotation, to about one BF16 ulp.
- One sequence is a (tokens, 6, 2, 256) byte tensor of about 700 MB; an entry is a head, a layer or a token of it.
:::
