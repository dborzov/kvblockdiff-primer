---
title: KV-Codec (2026)
nav: KV-Codec
lede: A KV cache laid out as a video, so that the GPU's video chips can compress it for the trip across a network. The closest thing in print to a fallen-apple measurement — and further from one than the first draft thought.
cards:
  - q: In KV-Codec's layout, what does the previous video frame hold, relative to the current one?
    a: The neighbouring token — so predicting from the previous frame is predicting an entry from the token before it
    wrong: ["The layer below", "Another attention head of the same token", "A random earlier entry"]
    why: Frames follow the token axis. A video coder's favourite move, "same place, one frame back", becomes fallen-apple prediction at token distance 1.
    sec: what
  - q: Which step of KV-Codec throws information away?
    a: Rounding the KV numbers to integers before the video coder sees them
    wrong: ["The H.265 coder in lossless mode", "Decoding on the GPU's video chip", "Cutting the cache into frames"]
    why: The video coder is run in its lossless mode, so the integers come back exactly; the original BF16 numbers do not. "Lossless accuracy" means the benchmark scores did not drop.
    sec: what
  - q: Swapping half of the numbers between attention heads made KV-Codec's ratio 2.4× worse. What does that show?
    a: Which numbers sit next to each other inside a frame decides how well a neighbour-predicting coder works
    wrong: ["Heads are identical to each other", "Token order does not matter", "The video coder is lossy"]
    why: The swap leaves the token order alone and scrambles each frame's picture, so much of the ratio must come from structure inside one token's numbers.
    sec: numbers
  - q: Why is KV-Codec only weak evidence for fallen-apple similarity?
    a: Its ratio mixes rounding with coding and does not separate prediction from the previous frame from prediction within a frame
    wrong: ["It measures the layer axis, not the token axis", "It reports no compression ratio at all", "It shuffles the tokens before coding"]
    why: To isolate the token axis you would turn off prediction from earlier frames, or shuffle the token order, and see how much the ratio falls. We found neither in what we could read.
    sec: doubts
---

Film a harbour with a camera on a tripod. Frame after frame, almost every pixel is what it was a moment ago. A video coder sends the first frame, then for every later frame only *how it differs* from the one before — [[predictive-coding]] with the previous frame as the prediction. That is why an hour of a quiet harbour fits in a small file.

Now replace the harbour with a KV cache, and the frames with tokens. That is the whole idea of KV-Codec. Its appeal for us is obvious: if consecutive tokens' entries look alike, the video coder will find it, and its compression ratio becomes a reading of [[fallen-apple]]. This page asks how good a reading it is.

::: note literature The paper
Liang Mi, Weijun Wang, Jinghan Chen, Ting Cao, Haipeng Dai and Yunxin Liu, *Efficient Remote KV Cache Reuse with GPU-native Video Codec*, arXiv:2602.09725, SIGCOMM 2026. An earlier version was titled *Efficient Remote Prefix Fetching with GPU-native Media ASICs* and called the system KVFetcher. Re-checked against the abstracts and public summaries; we could not read the full text.
:::

## What it does, in our words {#what}

KV-Codec lives on the network-fetch [[data-path]]. A long prefix — a document, a system prompt — was prefilled once and its KV cache stored on another machine. A new request that starts with the same prefix fetches that cache over the network instead of recomputing it. What matters is the time to the first answer token.

The codec, step by step:

1. **Round.** The KV numbers are rounded to small integers. This is the only [[lossy]] step, and the reason "lossless accuracy" in the paper does not mean [[lossless]] on this site.
2. **Lay out.** Each token's numbers become one small picture, and consecutive tokens become consecutive frames. Three [[layer|layers]] share a frame as its three colour planes. Numbers of different [[head|heads]] are never mixed, and the exact picture shape is found by an offline search. (For LWM-7B a summary gives an 8 × 512 picture — exactly the 4,096 key numbers of one token at one layer. The one-token-per-frame reading is our inference from that.)
3. **Code.** A standard H.265 video coder runs in its lossless mode. For each small block of pixels it predicts from the same place in the previous frame — the previous token — or from neighbouring pixels of the same frame — neighbouring [[channel|channels]] of the same token — and stores the exact [[residual]].
4. **Decode.** The GPU's built-in video-decoding chip, not its compute cores, decodes chunks of about 10,000 tokens, while the next chunk is still on the network.

::: figure fig-papers-kvcodec-layout paVideoLayout
**KV-Codec's pipeline, as we read it.** A toy KV cache of three layers (stacked sheets), 8 tokens (columns of a sheet) and 8 channels per token (rows), with illustrative values drawn as shades. Step through: the cache; the lossy rounding to a few integer levels; each token's numbers turned into one frame, three layers as its colour planes; the video coder's two predictions — from the previous frame (token distance 1, the token axis) and from neighbouring pixels in the same frame (the channel axis); and decoding, which rebuilds whole chunks. The layout follows the paper's description and summaries; the frame contents are our reading, not a verified detail.
:::

::: aside reminder Fallen-apple similarity
The hypothesis that an [[entry]] costs fewer bits to store exactly when an entry of the same layer, a small token distance $\vgap$ away, is known. A curve over $\vgap$, not a threshold. See [[#idea-fallen-apple]].
:::

In our vocabulary, KV-Codec is lossless predictive coding of rounded entries with a borrowed predictor: "previous token, same place" plus "neighbouring channel, same token". The first is fallen-apple prediction at $\vgap = 1$. The second is structure inside a single entry.

::: takeaway
- Round to integers (lossy), lay each token out as a frame, let a hardware video coder predict from the previous token and from neighbouring channels, decode on the video chip.
- Its inter-frame prediction *is* fallen-apple prediction at token distance 1 — at rounded precision.
:::

## The numbers, and what they tell us {#numbers}

| number | value | where | checked |
|---|---|---|---|
| time to first token, against earlier methods | up to 3.51× shorter, "with lossless accuracy" | abstract | yes |
| compression ratio | 11.9× "while keeping high accuracy" — rounding and coding together | ablation, earlier version | from a summary |
| ratio against CacheGen | 2.17× higher | latest version | from a truncated summary |
| swapping 50 % of the numbers across 32 heads | ratio 2.4× worse | layout study | from a summary |
| rounding precision (bits per number) | not found | — | no |

:::: compare What KV-Codec tells us — and what it does not
::: col It tells us
- **Layout is half the codec.** The same numbers, with half of them swapped between heads, compress 2.4× worse. For a coder that predicts from neighbours, what sits next to what decides the outcome — the access-pattern lesson of [[#idea-data-layout]] from the other side.
- **Video chips are free decoders** for bulk paths: a serving stack otherwise leaves them unused, and they do not compete with attention for compute cores.
- **At rounded precision, neighbour prediction pays** enough that a stock video coder is worth running.
:::
::: col It does not tell us
- **How many bits the token axis saves.** The 11.9× mixes rounding with coding, and coding mixes prediction from the previous token with prediction inside one token.
- **Anything at BF16 or at exact 8-bit precision.** The numbers are rounded first; how coarsely, we could not find.
- **Anything about single entries.** A chunk of thousands of tokens is decoded as one video.
:::
::::

::: theme bits-unit
A ratio like 11.9× cannot be converted into "bits saved per element by the previous token" — it bundles three different savings. Until a paper reports bits per element for each predictor separately, it can only hint at fallen-apple similarity, not measure it.
:::

::: takeaway
- Strong lesson about layout: neighbour-predicting coders depend on which numbers are neighbours.
- No usable number for us: the headline ratio bundles lossy rounding, token-axis prediction and within-token prediction.
:::

## Where we are not convinced {#doubts}

1. **"Lossless accuracy" is not lossless.** Only the rounded integers are rebuilt exactly. Benchmark scores are the right test for their purpose and the wrong one for ours.
2. **The headline ratio hides its parts.** If the rounding went from 16 to 8 bits, it alone gives 2×, leaving about 6× to lossless coding of 8-bit integers — far more than anything else in this Part reaches. That suggests coarser rounding, but we could not find the bit width. Without it, 11.9× says nothing about predictability.
3. **No control on the token axis.** The head-swap experiment is a good control of the *channel* arrangement. Its twin is missing: shuffle the token order — the [[#homework-rehearsal|shuffle control]] — and see how much of the ratio survives. Since the swap left the token order untouched and still cost a factor 2.4, a large share of the gain may come from inside each token, not from its neighbours.
4. **The first draft over-read it, twice.** It said slicing along the token axis "gives the most inter-frame similarity" — we found the layout slices along tokens, but no comparison with other slicings. And it called KV-Codec "weak but direct evidence for fallen-apple similarity at BF16" — the evidence is at rounded precision, not BF16, and indirect.

::: theme controls
KV-Codec ran half of a control (scramble the channels) and not the other half (scramble the tokens). The half it ran is informative; the half it skipped is the one we needed.
:::

::: note connection Connections
The other network-path paper, with explicit neighbour differences: [[#papers-cachegen]]. What fallen-apple similarity would look like as a measured curve: [[#questions-framework-a]]. Why a bulk codec's shape does not carry over to the miss path: [[#papers-reading-guide/map]].
:::

::: takeaway
- Rounded first, so lossy for us; ratio not decomposed; token-axis control missing.
- Keep the layout lesson and the free video decoders; leave the ratio out of every estimate.
:::
