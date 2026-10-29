---
title: The block is a knob, not a property
lede: The first draft stated its hypothesis as "similar within a 128K-token block" and asked whether to start with 128K or 64K. The data's property is a curve over token distance. The block size is a choice, made by reading that curve against the dictionary's price.
cards:
  - q: HiSparse's trace has 100,384 tokens. What is a "128K-token block" of it?
    a: The whole request — one block, which is the request scope
    wrong: ["Two blocks of about 64K tokens", "50 blocks of 2048 tokens", "A block with 31K tokens of padding that compresses for free"]
    why: 131,072 > 100,384, so the "block" holds every token of the request. That is scope request, not scope block.
    sec: claim
  - q: How many blocks of b = 2048 tokens does a 100,384-token request have?
    a: 50 — the last one holds 32 tokens
    wrong: ["49", "32", "2048"]
    why: The count is ⌈t / b⌉ = 50. The first draft's "t % b" (here 32) is the size of the last, partial block, not the number of blocks.
    sec: claim
  - q: In the toy with a 2K-token drift length, which dictionary weight never pays at any block size?
    a: w = 256 (a codebook)
    wrong: ["w = 2 (loc)", "w = 32 (rank-16 basis)", "None — every dictionary pays at a large enough block"]
    why: At small blocks its cost 8w/b is huge; by the time b is large enough to amortize it, the blocks have outgrown the drift and the gain is gone.
    sec: curve
  - q: In the toy, what moves the best block size?
    a: Both the data's drift length and the dictionary's weight
    wrong: ["Only the dictionary's weight", "Only the data's drift length", "Neither — the best block is always 64K tokens"]
    why: Gain is set by the data (it fades as blocks outgrow the drift); cost 8w/b is set by the dictionary. The best b is where they balance — an output of the analysis.
    sec: curve
  - q: How does the plan choose the block size?
    a: It sweeps several sizes and reads b off the measured distance curve, capped by 8w/b
    wrong: ["It fixes b = 128K tokens as in the first draft", "It uses the hot-cache size B as the block size", "It picks the largest block that fits in HBM"]
    why: The hypothesis is a curve over token distance; the block size is a design knob tuned to it.
    sec: changes
---

The first draft asked a practical question: "should I start with 128K-token blocks or 64K?"

Here is a fact that answers half of it. The request in HiSparse's trace is 100,384 tokens long. A 128K-token block of that request is the whole request.

## What the first draft said {#claim}

Three related slips, as the earlier proposal recorded them.

- The hypothesis was stated as **"similar within a 128K block"**. The proposal's verdict: that "would have baked a design choice into the science".
- The first question was **"128K-token blocks or 64K?"**
- The block count was written **"t % b blocks of b tokens"**.

The arithmetic first, because it is quick.

```python counting blocks in HiSparse's trace
t = 100_384                          # tokens in the request
for b in (2_048, 65_536, 131_072):
    n_blocks = -(-t // b)            # ceil(t / b): how many blocks
    last = t - (n_blocks - 1) * b    # tokens in the last, partial block
    print(b, n_blocks, last)
# 2048 50 32
# 65536 2 34848
# 131072 1 100384
```

`t % b` is the size of the last block, not the number of blocks. And a 131,072-token block holds every token there is.

Why was a block in the hypothesis tempting? There are good reasons.

1. **zstd trains on "a corpus of similar files".** A block is the KV version of that corpus ([[#idea-mapping]]).
2. **Systems are built from blocks.** Memory is allocated, loaded and evicted in pages and blocks. A block is something you can build.
3. **A hypothesis with a block in it is easy to test.** Build the store, run it, read the ratio.

All three are reasons to *build* with blocks. None is a reason to *define the property* with one. If the measurement is defined at one block size, it can only answer "does this one design work?", never "how does similarity fade with distance?"

::: takeaway
- In a 100K-token request, a 128K-token block is the request.
- A block is a design unit. Putting one into the definition of the property hides the question the data can answer.
:::

## A curve and a dial {#curve}

::: aside reminder The property, as a curve
[[#idea-fallen-apple]]: [[fallen-apple]] says an entry costs fewer bits given a neighbour of the same layer at token distance $\vgap$, and the fewer the closer. It is a curve over $\vgap$, not a threshold.
:::

The property and the knob live on different axes. The figure puts them one above the other, for a toy channel.

- **The toy channel:** each value is a slow drift plus quick noise. The drift holds 60 % of the variance and forgets itself over a *drift length* that you set, in tokens. That length is a property of the data.
- **Panel A, the property:** how many bits a single neighbour at distance $\vgap$ saves.
- **Panel B, the knob:** a per-block dictionary that stores the block's local level, like [[loc]] does. You choose its block size $\vb$ and its [[weight]] $\vw$.

$$
\text{net}(\vb) \;=\; \underbrace{\text{gain}(\vb)}_{\text{set by the data}} \;-\; \underbrace{\frac{8\vw}{\vb}}_{\text{set by the dictionary}}
$$ {#eq-ma-knob}

The gain fades once blocks grow longer than the data's drift; the dictionary's cost shrinks as blocks grow. Somewhere in between they balance.

::: figure fig-ma-knob maKnob
**A property and a knob for one toy channel.** *Panel A:* bits per element saved by knowing one neighbour at token distance $\vgap$ (horizontal, tokens, log scale), from the exchange rate $\tfrac12\log_2\tfrac{1}{1-\vRsq}$ with the neighbour's $\vRsq$. The shaded part covers the distances that fit inside one block of the chosen size; the dashed line marks the drift length. *Panel B:* bits per element saved by a per-block dictionary that stores the block's level, against block size $\vb$ (tokens, log scale). Dashed: its gain. Solid: the net after paying $8\vw/\vb$ for the dictionary. Ring: the best block size; knob: your choice (drag it, or focus it and use the arrow keys). The grey band beyond the dotted line is longer than a 100K-token request. *Controls:* drift length of the data; dictionary weight $\vw$. Illustrative model: drift is a random process with exponentially fading memory holding 60 % of the variance, the rest is independent noise; exact formulas, no sampling.
:::

Read the best block size off panel B for a few settings:

| drift length | $\vw = 2$ | $\vw = 32$ | $\vw = 256$ |
|---|---|---|---|
| 2K tokens | 326 (0.56) | 1,700 (0.30) | never pays |
| 16K tokens | 875 (0.62) | 3,800 (0.52) | 13,600 (0.30) |

Each cell is the best block size in tokens, with the net bits saved per element in brackets. The columns are [[loc]] ($\vw = 2$), a rank-16 basis ($\vw = 32$) and a 256-centroid codebook ($\vw = 256$).

The best block size moves when the data changes, and it moves when the dictionary changes. It is the *output* of the analysis.

One more thing to notice. A single neighbour saves at most 0.32 bit here, while a block average saves up to 0.66. Averaging many neighbours cancels each neighbour's own noise. That is the same reason a sibling makes a noisier prediction than a location does ([[#homework-sib]]).

::: try
1. Pick $\vw = 256$ and slide the drift length from 2K up to 16K. The codebook starts to pay once the data's memory is long enough.
2. Drag the knob to the far right. Past the dotted line the "block" is longer than the request.
3. With $\vw = 2$ and a 2K drift length, the net stays within 0.06 bit of its best anywhere from 128 to 1,024 tokens. A light dictionary makes the choice forgiving.
:::

::: takeaway
- Panel A is about the data. Panel B is about our design. The best $\vb$ is where the data's gain meets the dictionary's price.
- Light dictionaries are affordable at almost any block size; heavy ones need data with long memory.
:::

## What changes in the plan {#changes}

- **The hypothesis is a curve.** Framework A measures bits versus token distance $\vgap$, with a shuffle control ([[#questions-framework-a]]).
- **Block sizes are swept, not picked.** The plan runs $\vb \in \{512, 2\text{K}, 8\text{K}\}$ plus the request scope ([[#plan-fixed-choices]]).
- **The block size is read off the curve and capped by amortization.** A dictionary of weight $\vw$ costs $8\vw/\vb$ bits per element ([[#homework-amortization-rule]]).
- **"128K-token blocks" is renamed.** In a 100K-token request it is the [[scope-request|request scope]].

:::: compare A property and a knob
::: col A property (fallen-apple)
- **Who sets it:** the model and the text.
- **Shape:** a curve over token distance $\vgap$.
- **Can be:** true, false, strong or weak.
- **Found by:** measuring, with controls.
:::
::: col A knob (block size b)
- **Who sets it:** us.
- **Shape:** one number per design.
- **Can be:** well or badly chosen, never false.
- **Found by:** reading the curve against the dictionary's price.
:::
::::

::: theme amortize
The dictionary's price $8\vw/\vb$ is the whole reason a block exists: it shares one fixed cost among $\vb$ entries. The data decides how far that sharing can stretch before the dictionary stops fitting.
:::

::: takeaway
- Measure the property as a curve; tune the knob to it.
- In a 100K-token request, "128K-token blocks" means one dictionary per request.
:::
