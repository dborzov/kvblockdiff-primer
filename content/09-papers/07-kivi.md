---
title: KIVI (2024)
nav: KIVI
group: Lossy KV compression
lede: Keys and values rounded to two bits each, with the rounding ruler shared along a different axis for each. Retold in our words, with the one question that matters to us. What does it say about bits for an exact copy?
cards:
  - q: KIVI lays its key rulers along which numbers, in this site's words?
    a: One furrow over a run of 32 tokens, a column of the table
    wrong: ["All the numbers of one token's key vector (a row)", "All keys of one layer at once", "One head's keys and values together"]
    why: A furrow is one element position followed along the token axis. Per-furrow rounding computes the ruler (smallest value and step) over tokens, separately for each position.
    sec: idea
  - q: What does KIVI's introduction take as known about keys and values?
    a: A few fixed furrows of the keys are very large, token after token; the values show no such pattern
    wrong: ["Keys and values are both bell-shaped with equal spread", "Values drift slowly along tokens", "Keys repeat exactly every 32 tokens"]
    why: Magnitude plots of a few layers are the paper's background. The whole design, rulers along furrows for keys and along cherries for values, follows from it.
    sec: assume
  - q: Counting a 16-bit smallest value and a 16-bit step per scale group of 32 numbers, what does "2-bit" KIVI cost per number?
    a: About 3 bits
    wrong: ["Exactly 2 bits", "About 2.1 bits", "About 4 bits"]
    why: 2 bits of code plus 32 bits of ruler shared by 32 numbers = 1 more bit each. Our count, under a stated assumption about how the ruler is stored.
    sec: show
  - q: KIVI shows that keys survive 2-bit rounding. What does that tell us about an exact copy of 8-bit keys?
    a: Little; it is about what the LLM tolerates, not about how much of each number is predictable
    wrong: ["That 8-bit keys compress losslessly to about 2 bits", "That keys have no noise below the second bit", "That values are incompressible"]
    why: Rounding throws away the six low bits; a lossless compressor must reproduce them, noise included. What it can save depends on the variance a predictor explains, which KIVI does not report.
    sec: show
  - q: KIVI lays a fresh ruler every 32 tokens, as if a furrow's level drifted. What did the campaigns find about drift in the Bench's values?
    a: No drift ceiling; longer stretches kept winning up to 32 768 tokens, and a whole sequence is best
    wrong: ["A sharp ceiling at 32 tokens", "That values drift faster than keys", "That drift explains most of the bits"]
    why: Per-stretch dictionaries would beat long-scope ones only if furrow levels moved along the text. On the Bench they did not move enough to show.
    sec: ours
  - q: KIVI's "per-token quantization" of values is which rounding on this site?
    a: Per-cherry rounding, one ruler for one token's vector
    wrong: ["Per-furrow rounding", "Per-stretch rounding", "Per-layer rounding"]
    why: One token's values at one layer are one cherry; a ruler over that vector is a per-cherry ruler.
    sec: words
---

Here are the first six tokens of a toy orchard, as eight numbers per token, `v[:6, layer_id, head_id]` with `head_dim = 8`. On the left the keys, on the right the values, from one [[head|KV head]] of one [[layer]]. The numbers are made up, but they have the shape the KIVI paper reports for real LLMs.

| keys | e0 | e1 | e2 | e3 | e4 | e5 | e6 | e7 |
|---|---|---|---|---|---|---|---|---|
| t0 | 0.0 | 1.4 | **10.4** | −0.5 | −0.3 | **−8.4** | 0.6 | −0.1 |
| t1 | 0.7 | −1.8 | **10.8** | −0.1 | 0.7 | **−8.8** | −0.4 | 0.5 |
| t2 | 0.8 | −0.2 | **10.8** | 0.7 | −0.9 | **−8.2** | 0.4 | −0.7 |
| t3 | −1.9 | −0.8 | **10.9** | −1.2 | −1.5 | **−8.5** | 0.9 | −0.2 |
| t4 | −0.7 | 0.4 | **10.9** | −0.3 | 0.5 | **−8.2** | −0.2 | −0.8 |
| t5 | 0.3 | 0.2 | **11.3** | −1.3 | −0.7 | **−8.7** | −1.7 | 0.1 |

| values | e0 | e1 | e2 | e3 | e4 | e5 | e6 | e7 |
|---|---|---|---|---|---|---|---|---|
| t0 | 0.6 | −0.8 | −0.3 | −0.3 | 0.2 | 1.1 | 0.0 | 0.9 |
| t1 | −0.4 | 0.3 | −2.1 | −1.4 | 0.8 | −0.6 | 0.6 | 0.5 |
| t2 | 1.3 | 0.8 | 1.0 | −0.1 | −0.7 | −0.7 | −0.5 | −1.1 |
| **t3** | **−2.2** | **−0.4** | **1.0** | **−1.4** | **−7.7** | **−0.3** | **0.9** | **4.3** |
| t4 | 0.6 | −0.6 | −0.7 | 2.0 | 0.8 | 1.8 | 2.1 | −0.8 |
| t5 | 0.4 | 0.5 | 0.6 | 0.5 | 0.2 | 0.2 | −1.5 | −0.2 |

Notice anything? In the keys, two **columns** stand out: the [[furrow|furrows]] `k[:, l, h, 2]` and `k[:, l, h, 5]` are big, token after token, and they creep slowly. In the values no column stands out, but one **row** does: token t3 is loud everywhere. KIVI is built on exactly this observation. In ours: the keys have structure along furrows, the values along cherries.

## The idea, by example {#idea}

KIVI ([[lossy]]) stores every key and value number in 2 bits instead of 16. Two bits give four marks on a ruler. To round a number, lay the ruler from the smallest to the largest of some set of numbers, split it into three equal steps, and keep only which mark is nearest: plain [[quantization]] on a uniform grid. The whole design question is **which numbers share one ruler**. KIVI lives on the GPU-memory road of [[#papers-reading-guide/data-path]]: the rounded orchard stays in HBM and is read by attention every step.

::: define scale-group
- **What it is.** The set of numbers rounded with one shared ruler: one smallest value and one step size, stored next to the codes. Its size is $\vngrp$; KIVI uses 32.
- **Per furrow.** A scale group is one furrow over a run of tokens, a column of the table: `k[t0:t0+32, l, h, e]`. Its statistics are computed over tokens, separately for each element position.
- **Per cherry.** A scale group is one token's vector (or a piece of it), a row: `v[t, l, h, :]`. Its statistics are computed over the elements of that one cherry.
- **Easy to confuse with** a [[stretch]]. A stretch is a run of token positions we choose for dictionaries; a scale group is whatever shares a ruler, and may run along tokens or along elements.
:::

KIVI's answer: keys share rulers per furrow (columns, in runs of 32 tokens), values share rulers per cherry (rows). Try both answers on both tables.

::: figure fig-papers-kivi-axis pbKiviAxis
**The toy table of 12 tokens × 8 elements, rounded with min–max rulers.** Left: the numbers (vermilion positive, lapis negative, stronger colour = larger in size). Right: the rounding error of each number after the round trip (stronger colour = larger error). Outlines on the left show which numbers share one ruler: a column is one furrow over the tokens, a row is one cherry. The readout gives the typical (root-mean-square) error of the quiet part and of the loud part, each as a share of the typical size of the numbers in it, and the range of ruler steps. Hover or tap a cell for its number, rounded value and error. Toy numbers, made up to have the shape KIVI reports.
:::

::: try
1. Keys, one ruler per cherry, 2 bits. Each row must span about −9 to +12, so its step is 6 to 7 and the small numbers have no mark near them: the typical error is 249 % of their size.
2. Switch to one ruler per furrow. The small furrows get steps of about 1, the big ones under 0.6, and the error of the small furrows falls to 27 %.
3. Now values. Per furrow, the loud token t3 stretches the ruler of every column (e4 holds −7.7), and the quiet tokens pay: 57 %. Per cherry, each row gets its own ruler: 26 %.
4. Raise the bits to 4. Every error shrinks, but the ordering stays: the direction of the ruler matters at any width.
:::

The rule behind the picture: **share a ruler among numbers of similar size.** In keys the numbers of one furrow are alike; in values the numbers of one cherry are. Per-furrow rulers have a snag: a column's ruler needs several tokens, but decoding adds one token at a time. KIVI keeps the newest tokens at 16 bits until a group of 32 is complete, in its experiments the latest 128. (KIVI calls this window the "residual"; on this site a [[residual]] is the exact difference from a prediction, so we say *full-precision tail*.)

::: takeaway
- KIVI rounds keys and values to 2 bits with min–max rulers; keys share a ruler along each furrow (32 tokens), values along each cherry.
- The rule: put numbers of similar size under one ruler.
:::

## What they assume {#assume}

1. **A few key furrows are very large and persist.** Stated with magnitude plots of a few layers of Llama-2-era LLMs. This is the reliable part, and it is also the premise of per-[[furrow]] statistics ([[#toolbox-furrow-statistics]]).
2. **Values show no per-furrow pattern.** An absence in a plot, and the paper picks per-cherry rulers for values by reasoning about how errors reach the attention output. That does not show value furrows are unpredictable.
3. **Attention tolerates coarse rounding** when the ruler follows the structure. Benchmark accuracy is the yardstick.
4. **Furrow levels drift,** or at least might: KIVI lays a fresh ruler every 32 tokens because it does no calibration, and never compares that with one fixed ruler per furrow for the whole text.

::: takeaway
- Reliable: big, persistent key furrows.
- Thin: "values have no per-furrow structure", and drift, which is assumed rather than shown.
:::

## What they show {#show}

| their measurement | value | where | verifiable? |
|---|---|---|---|
| bits per stored number | 2 (a 4-bit variant too) | paper, README | a design constant |
| scale group | 32 tokens per furrow (keys); 32 and 64 work alike, 128 is clearly worse | ablation, via search excerpts | their rig |
| full-precision tail | 128 most recent tokens | ablation, via search excerpts | their rig |
| peak memory (LLM weights included) | 2.6× lower, "almost the same quality" | abstract (Llama-2, Falcon, Mistral) | their rig, public LLMs |
| batch size, throughput | up to 4× larger; 2.35–3.47× | abstract | their rig |

"Two bits" is the size of the code, not the cost of a number. The ruler is side information too. Assuming a 16-bit smallest value and a 16-bit step per scale group of $\vngrp = 32$ numbers (our assumption; we did not check how KIVI stores them):

$$
\underbrace{\vn}_{\text{bits of code}} + \underbrace{\frac{2 \times 16}{\vngrp}}_{\text{ruler, shared by } \vngrp \text{ numbers}} = 2 + \frac{32}{32} = 3 \ \text{bits per number}
$$ {#eq-papers-kivi-cost}

So by our count "2-bit" KIVI is about 5× smaller than 16 bits, not 8×, before the tail. Every helper charges a tax ([[#toolbox-the-bill]]). What KIVI shows, then, is *where structure lives*: each key furrow has a typical size of its own that persists over tokens; value furrows do not. What it does not show is how many bits an *exact* copy needs. Rounding throws away everything below the step; a lossless compressor keeps all of it, and its only currency is variance explained:

::: aside reminder The exchange rate (II.12)
A predictor that explains a share $\vRsq$ of a number's variance leaves a residual with variance $(1-\vRsq)\vsigma^2$. For bell-shaped data that saves $\tfrac12\log_2\frac{1}{1-\vRsq}$ bits per number: 75 % explained buys 1 bit, 94 % buys 2. See [[#school-exchange-rate]] and [[#toolbox-exchange-rate]].
:::

::: keycard What a lossless compressor can take from KIVI
$\tfrac12\log_2 \dfrac{1}{1-\vRsq}$ bits per number, and KIVI reports no $\vRsq$.
:::

::: takeaway
- KIVI shows where structure lives and what attention tolerates, not how much is predictable.
- By our count, "2-bit" is about 3 bits once the shared rulers are paid for.
:::

## What it says about our scenario {#ours}

**Builds on.**
- Per-furrow statistics as the lightest dictionary ([[#toolbox-furrow-statistics]]): KIVI's key ruler is a location and a scale per furrow per 32 tokens, used to round; ours uses the same two numbers to predict and stores the exact difference.
- Keys and values as separate problems ([[#hypotheses-keys-and-values]], [[#scenario-slice]]): KIVI is the published reason to treat the two slices apart.

**Conflicts with.**
- *Drift.* KIVI's fresh ruler every 32 tokens presumes furrow levels move along the text. The campaigns found no drift ceiling in the Bench's values: longer stretches kept winning up to 32 768 tokens, 0.010–0.020 of ratio per doubling, and a bound says a whole sequence is better still ([[#measured-reading-one-cherry]], [[#scenario-scope]]). We believe the campaigns for values on this text; for keys, and for other text, the question is open.
- *"Values have no per-furrow structure."* On the Bench, per-furrow order-0 tables on values are the solo baseline at 0.778 (1.8 bits per element below raw), and about 10 % of the furrows at the last KV layer are one-signed offsets ([[#toolbox-solo]], [[#measured-night-one]]). Values have per-furrow histograms worth bits; what they lack is a per-furrow *level* that a location captures beyond the histogram. Both statements can be true; KIVI's is the coarser one.

**Suggests.**
- A keys scenario, `K at one KV layer, k[t, l, :, :] · stretch 4096 · leash 293`, with per-furrow statistics measured within a stretch and across the text, which says whether KIVI's 32-token rulers would beat one global ruler per furrow for an exact copy ([[#plan-next-in-the-harness]]). C1's one night on pre-RoPE keys found them compressing like values at the same depth ([[#measured-the-data]]).

::: theme noise-floor
KIVI keeps 2 bits of every number and drops the rest; the LLM barely notices. An exact copy drops nothing: whatever below the ruler's step no predictor can explain is paid in full. "Survives 2 bits" says almost nothing about lossless size.
:::

::: takeaway
- Builds on: per-furrow statistics, keys apart from values.
- Conflicts with: drift (not seen on the Bench) and "values have no furrow structure" (they have histograms, not levels).
- Suggests: the keys scenario, with per-furrow spreads within and across stretches.
:::

## Their words, ours {#words}

| their word | ours | where the meanings differ |
|---|---|---|
| channel | [[furrow]] (the column sense) or [[element]] (the index sense) | KIVI's "per-channel" is per furrow over a run of tokens |
| per-channel quantization | per-furrow rounding, one ruler per [[scale-group]] of 32 tokens | — |
| per-token quantization | per-cherry rounding, one ruler per [[cherry]] | one token's values at one layer is one cherry |
| group (of 32 tokens) | a [[scale-group]] | not a stretch: a stretch is our dictionary unit |
| residual (the full-precision window) | the full-precision tail | on this site a [[residual]] is the exact difference from a prediction |
| KV cache | the [[orchard]] | — |
| outlier channels | large furrows | the furrows whose level persists |
| model (Llama-2, Falcon, Mistral) | the LLM, named | — |

::: aside source Receipts
Liu, Yuan et al., *KIVI: A Tuning-Free Asymmetric 2bit Quantization for KV Cache*, ICML 2024, arXiv:2402.02750. Bits per number: paper and README. Scale group (32; 64 alike; 128 worse) and the 128-token full-precision tail: the paper's ablation, via search excerpts; the PDF could not be opened from here. Memory (2.6×), batch (4×) and throughput (2.35–3.47×): abstract. The 3-bit count is ours, under the stated assumption about ruler storage. The campaigns' numbers: `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1.3 (solo 0.778), §1.4 (keys pre-RoPE compress like values; ≈10 % of channels at L23 are one-signed offsets), §1.9 (block size: 0.010–0.020 per doubling at 16k → 32k, no saturating block size).
:::
