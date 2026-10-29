---
title: The one-page summary
nav: Summary (TL;DR)
lede: The whole proposal on one page — the idea, what it rests on, what the homework says, and the plan. Every line links to the page that works it out.
cards:
  - q: In one sentence, what does kv-blockdiff propose?
    a: Store the KV history as per-block dictionaries plus tiny per-entry deltas, so a hot-cache miss moves a delta instead of a raw entry and the GPU rebuilds the entry exactly
    wrong: ["Quantize the KV cache to fewer bits per value", "Drop the least important tokens from the cache", "Retrain the model to need a smaller cache"]
    why: It is lossless and invisible to the model; only the bytes moved and stored change.
    sec: idea
  - q: Which property of KV caches must hold for the idea to pay off, and is it measured yet?
    a: Fallen-apple similarity — an entry is cheaper to code given nearby entries — and no, not at 8-bit precision
    wrong: ["The Lucky Louis property — and yes, HiSparse measured it", "Upstairs similarity — and yes, KVQuant measured it", "Perplexity — and yes, every model card reports it"]
    why: The Lucky Louis property (selections repeat) is established, but it is about which entries are wanted, not about their bytes.
    sec: rests-on
  - q: How much variance must a dictionary explain to save one bit per element (Gaussian exchange rate)?
    a: 75 % of the variance that remains after solo coding
    wrong: ["10 %", "50 %", "99.9 %"]
    why: Bits saved = ½ log₂ 1/(1−R²); R² = 0.75 gives exactly 1 bit; 94 % gives 2 bits.
    sec: homework
  - q: What is the go / no-go threshold of wave 1?
    a: Request-scope plus block-scope gain of at least 0.75 bit per element → go; under 0.25 bit everywhere → publish the negative and pivot
    wrong: ["A compression ratio of 10× → go", "Any positive gain → go", "Perplexity unchanged → go"]
    why: The split between the two gains then decides block-scope versus request-scope dictionaries.
    sec: plan
---

## The idea {#idea}

Under sparse-attention decoding, [[hisparse]] keeps each request's full KV history in host memory and a small [[hot-cache]] of raw entries per layer on the GPU. Every miss moves one raw [[entry]] over the link, and every slot holds one.

[[kv-blockdiff]] stores the history instead as per-[[block]] [[dictionary|dictionaries]] plus a short [[delta]] per entry. A miss in a block whose dictionary is already on the GPU — a [[delta-miss]] — moves only the delta, and the GPU rebuilds the entry bit for bit. The model's outputs do not change. Later, the same representation can shrink the hot cache itself: first through a [[victim-tier]] of deltas, then in full ([[#idea-two-levers|lever 2]]).

::: takeaway
- Same system as HiSparse, same hits and evictions; only the bytes per miss (and later per slot) shrink.
- Lossless: the GPU rebuilds every entry exactly.
:::

## What it rests on {#rests-on}

- **The [[lucky-louis]]** — selections repeat from step to step. *Established* (HiSparse: 87 % hits at twice the top-k size). The design also needs it per block: misses piling into a few long-lived [[heavy-block|heavy blocks]]. *Unmeasured*, and needed only if the dictionaries turn out heavy. → [[#landscape-lucky-louis]], [[#idea-heavy-blocks]]
- **[[fallen-apple]]** — an entry is cheaper to code given a neighbour a small token distance away. *Unmeasured at 8 bits, anywhere.* This is the existence question and it is measured first. HiSparse's hit rate is **not** evidence for it. → [[#idea-fallen-apple]], [[#idea-the-leak]]
- **[[upstairs]]** — the same across adjacent layers. Second priority; the proposal works without it. → [[#idea-upstairs]]

::: theme which-vs-what
The single most important distinction on the site: that the indexer keeps wanting the same entries says nothing about whether those entries resemble each other.
:::

::: takeaway
- One established property (selections repeat) and one unmeasured one (bytes are mutually predictable). The project exists to measure the second.
:::

## What the homework says {#homework}

- [[solo]] coding — each entry alone, with a fixed global code — is worth about 1.1–1.3× on 8-bit KV and is already published. Every gain here counts on top of it. → [[#homework-solo-coding]], [[#papers-splitzip]]
- **The exchange rate is harsh.** To save one bit per element a dictionary must explain 75 % of the remaining variance; two bits need 94 %. → [[#homework-exchange-rate]]
- **Light dictionaries first.** [[loc]] and a low-rank [[klt]] charge no per-entry tax; a [[vq]] codebook's index tax cancels its gain on bell-shaped data beyond what a rotation already gets, so VQ is measured, not assumed. → [[#homework-four-side-by-side]]
- **The 8-bit grid matters.** On E4M3's logarithmic grid a naive residual is worse than nothing below $\vRsq \approx 0.7$; INT8 with a per-channel scale is friendlier to prediction. Both are scored. → [[#homework-the-grid]]
- **Amortization caps block size:** a dictionary costs $8\vw/\vb$ bits per element. Light dictionaries are free at any block size; a 256-centroid codebook needs $\vb \ge 8\text{K}$. → [[#homework-amortization-rule]]
- **Economics:** in the [[reference-setting]] the link binds at $\vB = 4\text{K}$ and GPU memory at $\vB = 8\text{K}$. Light per-block or per-request dictionaries with $\vrho \approx 0.65$–$0.75$ move the binding constraint by about 1.3×; heavy, always-resident dictionaries lose. → [[#homework-calculator]]

::: takeaway
- Gains are plausible but modest unless the data has strong, concentrated structure (outlier channels in keys).
- Dictionary weight and residency decide the economics — and both are measurable.
:::

## The plan {#plan}

1. **Wave 1 (one weekend):** dump keys (before RoPE) and values from a small open model; round to E4M3 and INT8; build the [[harness]] with its four controls; run experiment 1a (grid-free bounds and distance curves, an hour of compute) and 1b (the exact lossless ladder, both rates, both formats). → [[#plan-experiment-1a]], [[#plan-experiment-1b]]
2. **Decision:** $\vgainreq + \vgainblk \ge 0.75$ bit → go; the split between them decides block-scope versus request-scope dictionaries; below 0.25 bit → publish the negative and pivot to context-free miss-path coding. → [[#plan-decision-rule]]
3. **Wave 2:** trace replay with exact top-k as the indexer ($\vfD$, $\vnload$, block concentration, the reuse-distance distribution), then the cost model with measured inputs. → [[#plan-wave2-measure]]
4. **Later:** the GPU decoder, the victim tier, the compressed hot cache, MLA latents, cross-layer dictionaries.

::: keycard Next action
Open the dumps, add the query vectors to the dump script, write the 8-bit rounding and the two rate functions, pass the four controls on synthetic data — then run 1a and read three numbers.
:::

::: takeaway
- A weekend decides whether the idea lives; either answer is a publishable measurement.
:::
