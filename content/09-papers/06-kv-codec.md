---
title: KVFetcher (2026)
nav: KVFetcher
group: Lossy KV compression
lede: A stored prefix's orchard laid out as a video, so the GPU's video chips can compress it for the trip across a network. The closest thing in print to a fallen-apple measurement, and further from one than the first draft thought.
cards:
  - q: In KVFetcher's layout, what does the previous video frame hold, relative to the current one?
    a: The neighbouring token, so predicting from the previous frame is predicting a cherry from the token before it
    wrong: ["The layer below", "Another KV head of the same token", "A random earlier cherry"]
    why: Frames follow the token axis. A video compressor's favourite move, "same place, one frame back", becomes fallen-apple prediction at token distance 1.
    sec: idea
  - q: What does KVFetcher take as known about the orchard?
    a: That consecutive tokens have similar values within one furrow, enough for a video compressor's predictions to pay
    wrong: ["That the orchard compresses 12× losslessly", "That keys and values are identical", "That the mantissa is noise"]
    why: The whole design rests on the video analogy, and the analogy rests on neighbouring tokens looking alike. It is assumed, then exploited; not measured in bits.
    sec: assume
  - q: Which step of KVFetcher throws information away?
    a: Rounding the orchard's numbers to integers before the video compressor sees them
    wrong: ["The H.265 compressor in lossless mode", "Decoding on the GPU's video chip", "Cutting the orchard into frames"]
    why: The video compressor runs in its lossless mode, so the integers come back exactly; the original BF16 numbers do not. "Lossless accuracy" means the benchmark scores did not drop.
    sec: show
  - q: Swapping half of the numbers between KV heads made the ratio 2.4× worse. What does that show?
    a: Which numbers sit next to each other inside a frame decides how well a neighbour-predicting compressor works
    wrong: ["Heads are identical to each other", "Token order does not matter", "The video compressor is lossy"]
    why: The swap leaves the token order alone and scrambles each frame's picture, so much of the ratio must come from structure inside one token's numbers, not from its neighbour.
    sec: show
  - q: What did the campaigns measure about the token-distance-1 prediction KVFetcher leans on?
    a: Nearly useless at the Bench's layers 0, 4 and 5 (0.058 bit per element of mutual information at layer 0) and modest in the middle layers
    wrong: ["About 3 bits per element everywhere", "Nothing; it was never tried", "Stronger than any reference cherry"]
    why: Fallen-apple similarity came out weak except in the middle layers; the axis that mattered was repeats of the same token far away, not distance.
    sec: ours
  - q: KVFetcher's "frame" is which object on this site?
    a: One token's values at one or more layers, laid out as a small picture; close to one cherry
    wrong: ["A stretch of 10 000 tokens", "A punnet", "A furrow"]
    why: One frame holds one token's numbers; three layers are its colour planes. A run of thousands of frames must be decoded together, which no cherry on the miss path may require.
    sec: words
---

Film a harbour with a camera on a tripod. Frame after frame, almost every pixel is what it was a moment ago. A video compressor sends the first frame, then for every later frame only how it differs from the one before: [[predictive-coding]] with the previous frame as the prediction. That is why an hour of a quiet harbour fits in a small file. Replace the harbour with an [[orchard]], and the frames with tokens. That is the whole idea of KVFetcher (the system the first draft called KV-Codec). Its appeal is obvious: if consecutive tokens' cherries look alike, the video compressor will find it, and its ratio becomes a reading of [[fallen-apple|fallen-apple similarity]]. This page asks how good a reading it is. <!-- old-words -->

## The idea, by example {#idea}

KVFetcher lives on the network-fetch road of [[#papers-reading-guide/data-path]]. A long prefix, a document or a system prompt, was prefilled once and its orchard stored on another machine. A new sequence that starts with the same prefix fetches that orchard over the network instead of recomputing it. What matters is the time to the first answer token.

Take a toy orchard of three layers, 8 tokens and 8 elements per token, `v.shape == (8, 3, 1, 8)`. The compressor, step by step:

1. **Round.** Every number is rounded to a small integer. The only [[lossy]] step, and the reason "lossless accuracy" in the paper does not mean [[lossless]] on this site.
2. **Lay out.** Each token's 8 numbers become one small picture, a 4 × 2 frame; consecutive tokens become consecutive frames; the three layers are the frame's three colour planes. Numbers of different [[head|KV heads]] are never mixed, and the exact picture shape is found by an offline search. (For LWM-7B a summary gives an 8 × 512 picture, exactly the 4 096 key numbers of one token at one layer; the one-token-per-frame reading is our inference.)
3. **Code.** A standard H.265 video compressor runs in its lossless mode. For each small patch of pixels it predicts from the same place in the previous frame (the previous token) or from neighbouring pixels of the same frame (neighbouring [[element|elements]] of the same token) and stores the exact [[residual]].
4. **Decode.** The GPU's video-decoding chip, not its compute cores, decodes runs of about 10 000 tokens while the next run is still on the network.

::: figure fig-papers-kvfetcher-layout paVideoLayout
**KVFetcher's pipeline, as we read it.** A toy orchard of three layers (stacked sheets), 8 tokens (columns of a sheet) and 8 elements per token (rows), with illustrative values drawn as shades. Step through: the orchard; the lossy rounding to a few integer levels; each token's numbers turned into one frame, three layers as its colour planes; the video compressor's two predictions, from the previous frame (token distance 1, the token axis) and from neighbouring pixels in the same frame (the element axis); and decoding, which rebuilds whole runs of tokens. The layout follows the paper's description and summaries; the frame contents are our reading, not a verified detail.
:::

In our words: lossless predictive coding of rounded cherries with a borrowed predictor, "previous token, same element" plus "neighbouring element, same token". The first is fallen-apple prediction at $\vgap = 1$. The second is structure inside one cherry, the territory of [[#toolbox-linear-prediction]].

::: takeaway
- Round to integers (lossy), lay each token out as a frame, let a hardware video compressor predict from the previous token and from neighbouring elements, decode on the video chip.
- Its inter-frame prediction is fallen-apple prediction at token distance 1, at rounded precision.
:::

## What they assume {#assume}

1. **Consecutive tokens are alike within a furrow.** Stated as the motivation for the video analogy; never measured in bits. This is the hypothesis of [[#hypotheses-fallen-apple]], assumed true.
2. **The LLM tolerates coarse rounding.** Benchmark accuracy is the yardstick, as in every lossy page of this Part.
3. **The road is a network fetch, read in bulk.** A run of thousands of tokens is decoded as one video; nobody asks for one token.
4. **The video chip is idle.** A serving stack leaves the GPU's media engines unused, so decoding there is free of compute-core contention.

::: takeaway
- Assumed, not measured: fallen-apple similarity at distance 1.
- Known: a bulk road, a tolerant LLM, an idle video chip.
:::

## What they show {#show}

| their measurement | value | where | verifiable? |
|---|---|---|---|
| time to first token, against earlier methods | up to 3.51× shorter, "with lossless accuracy" | abstract | their rig |
| compression ratio | 11.9× "while keeping high accuracy", rounding and coding together | ablation, earlier version, via a summary | not decomposable from what we could read |
| ratio against CacheGen | 2.17× higher | latest version, via a truncated summary | — |
| swapping 50 % of the numbers across 32 heads | ratio 2.4× worse | layout study, via a summary | a control; informative |
| rounding precision (bits per number) | not found | — | — |

Where the framing flatters: "lossless accuracy" is not lossless; only the rounded integers are rebuilt exactly. And the headline ratio hides its parts. If the rounding went from 16 to 8 bits, it alone gives 2×, leaving about 6× to lossless coding of 8-bit integers, far more than anything else in this Part reaches; that suggests coarser rounding, but the bit width could not be found. Without it, 11.9× says nothing about predictability.

The head-swap study is the one result we keep. It is a control of the *element* arrangement, and it shows that layout is half the compressor. Its twin is missing: shuffle the token order and see how much of the ratio survives. Since the swap left the token order untouched and still cost a factor 2.4, a large share of the gain may come from inside each token, not from its neighbour.

::: theme controls
KVFetcher ran half of a control (scramble the elements) and not the other half (scramble the tokens). The half it ran is informative; the half it skipped is the one we needed, and the one the harness runs as its [[shuffle-control]] ([[#scenario-the-harness]]).
:::

::: takeaway
- Rounded first, so lossy for us; the ratio bundles rounding, token-axis prediction and within-token prediction.
- Keep the layout lesson; leave the ratio out of every estimate.
:::

## What it says about our scenario {#ours}

**Builds on.**
- Layout decides the compressor: what sits next to what is the first design choice, before any statistics ([[#app-data-layout]]). The 2.4× under a head swap is a published instance.
- Prediction across elements inside one cherry is real: the campaigns' linear prediction across elements, head 0 predicting head 1, saved 0.013–0.034 of ratio on top of a reference tree, and survived the shuffle control ([[#measured-two-kinds-of-structure]], [[#toolbox-linear-prediction]]). KVFetcher's within-frame prediction is the lossy cousin.

**Conflicts with.** The token-axis bet. The campaigns measured fallen-apple similarity on the Bench's values and found it weak except in the middle layers: the adjacent token carries 0.058 bit per element of mutual information at KV layer 0, 0.31 at layers 1 and 2; joining two adjacent tokens into one cherry made the ratio *worse* by 0.037; and the reference trees pointed at far repeats of the same token, not at neighbours ([[#hypotheses-fallen-apple]], [[#hypotheses-echo]], [[#measured-time-and-bits]]). We believe the campaigns: they count exact bits on an 8-bit grid with a shuffle control, where KVFetcher reports a bundled ratio at an unknown rounding. The two can both be right if KVFetcher's gain comes mostly from inside the frame and from rounding, which its own head-swap control hints at.

**Suggests.**
- The missing control, run on their data: the same pipeline with the token order shuffled across texts. If the 11.9× survives, the token axis was never the source.
- A video-chip decoder is a free decoder for bulk roads only; on the miss path one cherry decoded cold cannot wait for a run of 10 000 frames ([[#scenario-the-leash]]). Nothing to borrow there.
- A curve of bits saved over $\vgap$ per layer, which the campaigns measured only at a few distances, would say whether KVFetcher's frames would do better in the middle layers ([[#plan-next-in-the-harness]]).

::: theme bits-unit
A ratio like 11.9× cannot be converted into "bits saved per element by the previous token". Until a paper reports bits per element for each predictor separately, it can only hint at fallen-apple similarity, not measure it. The campaigns' 0.058 and 0.31 bit per element are the measurement.
:::

::: takeaway
- Builds on: layout first; within-cherry prediction is real.
- Conflicts with: the token-axis bet, which the Bench measured as weak; we believe the exact bits.
- Suggests: the shuffle control they skipped.
:::

## Their words, ours {#words}

| their word | ours | where the meanings differ |
|---|---|---|
| KV cache, stored prefix | the [[orchard]] of a prefix | one sequence's, stored and fetched whole |
| frame | one token's numbers, laid out as a picture; close to one [[cherry]] | a frame cannot be decoded without the frame before it; a cherry must decode cold |
| chunk | a run of about 10 000 tokens, decoded as one video | far longer than any stretch, and read front to back |
| channel | [[element]] | one position inside a head vector |
| lossless accuracy | [[lossy]], with benchmark scores unchanged | the rounded integers come back exactly; the BF16 numbers do not |
| codec, video codec | the video [[compressor]] (H.265 in lossless mode) | — |
| inter-frame prediction | [[fallen-apple]] prediction at $\vgap = 1$ | at rounded precision |
| intra-frame prediction | prediction across elements inside one cherry | the lossy cousin of [[linear-prediction]] |

::: aside source Receipts
Liang Mi, Weijun Wang, Jinghan Chen, Ting Cao, Haipeng Dai and Yunxin Liu, arXiv:2602.09725 (2026), SIGCOMM 2026. The arXiv listing now carries the title *Efficient Remote Prefix Fetching with GPU-native Media ASICs*; an earlier version was titled *Efficient Remote KV Cache Reuse with GPU-native Video Codec*. The system is named KVFetcher in the abstract; the first draft of this site called the page KV-Codec, and the page id keeps that name. Time to first token (3.51×) and "lossless accuracy": abstract. The 11.9× ratio and the 2.4× head-swap result: the ablation and layout study of the earlier version, via public summaries. The 2.17× against CacheGen: a truncated summary of the latest version. The full text could not be read; the frame layout is our reading. The campaigns' numbers: `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1.4 (adjacent-token mutual information 0.058 bit/element at L3, 0.31 at L7/L11; the Bench's KV layers 0, 1, 2), §1.5 (linear prediction and the shuffle test), §1.6 (tok2 +0.037).
:::
