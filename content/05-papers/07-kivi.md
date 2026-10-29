---
title: KIVI (2024)
nav: KIVI
lede: Keys and values rounded to two bits each — with the rounding ruler shared along a different direction for each. Retold in our words, with the one question that matters to us — what does it say about bits for an exact copy?
group: Lossy KV compression
cards:
  - q: KIVI rounds keys "per channel". In this site's words, which numbers share one rounding ruler?
    a: One channel — one element position — across a run of tokens (a column)
    wrong: ["All the numbers of one token's key vector (a row)", "All keys of one layer at once", "One head's keys and values together"]
    why: A channel is one fixed element position looked at across many vectors. Per-channel rounding computes the ruler (smallest value and step) over tokens, separately for each position.
    sec: what
  - q: In the toy key table, why does a per-token ruler ruin the small channels?
    a: Each row's ruler must also span the two big channels, so its step is too coarse for the small numbers
    wrong: ["Because the small channels drift over time", "Because 2 bits cannot store negative numbers", "Because per-token rounding ignores the big channels"]
    why: A row holds values from about −9 to +12, so four marks are 6 to 7 apart and no mark sits near the small numbers. A column of small numbers gets a ruler of its own.
    sec: what
  - q: Counting a 16-bit smallest value and a 16-bit step per scale group of 32 numbers, what does "2-bit" KIVI cost per number?
    a: About 3 bits
    wrong: ["Exactly 2 bits", "About 2.1 bits", "About 4 bits"]
    why: 2 bits of code plus 32 bits of ruler shared by 32 numbers = 1 more bit each. This is our count, under the stated assumption about how the ruler is stored.
    sec: tells
  - q: KIVI shows that keys survive 2-bit rounding. What does that tell us about an exact (lossless) copy of 8-bit keys?
    a: Little — it is about what the model tolerates, not about how much of each number is predictable
    wrong: ["That 8-bit keys compress losslessly to about 2 bits", "That keys have no noise below the second bit", "That values are incompressible"]
    why: Rounding throws away the six low bits; a lossless coder must reproduce them, noise included. What it can save depends on the variance a predictor explains, which KIVI does not report.
    sec: tells
  - q: Which of our dictionaries is KIVI's per-channel key ruler a lossy cousin of?
    a: A per-channel location and scale shared by a block of tokens
    wrong: ["A VQ codebook of centroids", "A full KLT basis", "A pointer to the nearest sibling entry"]
    why: Per channel, per 32 tokens, KIVI keeps a smallest value and a step — a location and a scale. Our lightest dictionary keeps the same two numbers per channel, but uses them to predict, not to round.
    sec: connections
---

Here are the first six tokens of a toy [[kv-cache]], as eight numbers per token. On the left the keys, on the right the values, both from one [[head]] of one [[layer]]. The numbers are made up, but they have the shape the KIVI paper reports for real models.

| keys | c0 | c1 | c2 | c3 | c4 | c5 | c6 | c7 |
|---|---|---|---|---|---|---|---|---|
| t0 | 0.0 | 1.4 | **10.4** | −0.5 | −0.3 | **−8.4** | 0.6 | −0.1 |
| t1 | 0.7 | −1.8 | **10.8** | −0.1 | 0.7 | **−8.8** | −0.4 | 0.5 |
| t2 | 0.8 | −0.2 | **10.8** | 0.7 | −0.9 | **−8.2** | 0.4 | −0.7 |
| t3 | −1.9 | −0.8 | **10.9** | −1.2 | −1.5 | **−8.5** | 0.9 | −0.2 |
| t4 | −0.7 | 0.4 | **10.9** | −0.3 | 0.5 | **−8.2** | −0.2 | −0.8 |
| t5 | 0.3 | 0.2 | **11.3** | −1.3 | −0.7 | **−8.7** | −1.7 | 0.1 |

| values | c0 | c1 | c2 | c3 | c4 | c5 | c6 | c7 |
|---|---|---|---|---|---|---|---|---|
| t0 | 0.6 | −0.8 | −0.3 | −0.3 | 0.2 | 1.1 | 0.0 | 0.9 |
| t1 | −0.4 | 0.3 | −2.1 | −1.4 | 0.8 | −0.6 | 0.6 | 0.5 |
| t2 | 1.3 | 0.8 | 1.0 | −0.1 | −0.7 | −0.7 | −0.5 | −1.1 |
| **t3** | **−2.2** | **−0.4** | **1.0** | **−1.4** | **−7.7** | **−0.3** | **0.9** | **4.3** |
| t4 | 0.6 | −0.6 | −0.7 | 2.0 | 0.8 | 1.8 | 2.1 | −0.8 |
| t5 | 0.4 | 0.5 | 0.6 | 0.5 | 0.2 | 0.2 | −1.5 | −0.2 |

Notice anything? In the keys, two **columns** stand out: [[channel|channels]] c2 and c5 are big, token after token, and they creep slowly. In the values no column stands out, but one **row** does: token t3 is loud everywhere.

KIVI is built on exactly this observation. In the paper's words, a few fixed channels of the keys have very large magnitudes, and the values show no such pattern. In ours: the keys have structure *along columns*, the values *along rows*.

## What KIVI does, in our words {#what}

KIVI ([[lossy]]) stores every key and value number in 2 bits instead of 16. Two bits give four marks on a ruler. To round a number, you lay the ruler from the smallest to the largest of some set of numbers, split it into three equal steps, and keep only which mark is nearest — this is plain [[quantization]] on a uniform grid.

The whole design question is: **which numbers share one ruler?**

::: define scale-group
- **What it is:** the set of numbers rounded with one shared ruler — one smallest value and one step size, stored next to the codes.
- **Per channel:** a scale group is one channel over a run of tokens — a column of the table. Its statistics are computed over tokens, separately for each element position.
- **Per token:** a scale group is one token's vector (or a piece of it) — a row. Its statistics are computed over the elements of that one vector.
- **Easy to confuse with:** a [[block]]. Our blocks are runs of tokens chosen for dictionaries; a scale group is whatever shares a ruler, and may run across tokens *or* across channels.
:::

KIVI's answer: keys share rulers **per channel** (columns, in runs of 32 tokens), values share rulers **per token** (rows). Try both answers on both tables.

::: figure fig-pb-kivi-axis pbKiviAxis
**The toy table of 12 tokens × 8 channels, rounded with min–max rulers.** Left: the numbers (vermilion positive, lapis negative, darker = larger in size). Right: the rounding error of each number after the round trip (darker = larger error). Outlines on the left show which numbers share one ruler. The read-out gives the typical (root-mean-square) error of the quiet part and of the loud part, each as a share of the typical size of the numbers in it, and the range of ruler steps. Hover or tap a cell for its number, rounded value and error. Toy numbers, made up to have the shape KIVI reports.
:::

::: try
1. Keys, one ruler per token, 2 bits. Each row must span about −9 to +12, so its step is 6 to 7 and the small numbers have no mark near them: the typical error is 249 % of their size.
2. Switch to one ruler per channel. The small columns get steps of about 1, the big ones under 0.6, and the error of the small channels falls to 27 %.
3. Now values. Per channel, the loud token t3 stretches the ruler of every column (c4 holds −7.7), and the quiet tokens pay: 57 %. Per token, each row gets its own ruler: 26 %.
4. Raise the bits to 4. Every error shrinks, but the ordering stays — the direction of the ruler matters at any width.
:::

The rule behind the picture: **share a ruler among numbers of similar size.** In keys the numbers of one column are alike; in values the numbers of one row are.

Per-channel rulers have a practical snag. A column's ruler needs several tokens before it can be laid, but tokens arrive one at a time during decoding. KIVI keeps the newest tokens unrounded until a full group of 32 has arrived; in its experiments a window of the most recent 128 tokens stays at 16 bits. (KIVI calls this window the "residual". On this site a [[residual]] is something else — the exact difference between a value and its prediction — so we say *full-precision tail*.)

::: takeaway
- KIVI rounds keys and values to 2 bits with min–max rulers.
- Keys share a ruler along each channel (a column over 32 tokens); values along each token (a row).
- The rule: put numbers of similar size under one ruler. The toy shows why each matrix wants its own direction.
:::

## What it tells us, and what it does not {#tells}

::: note numbers The numbers we use
| what | value | source |
|---|---|---|
| bits per stored number | 2 (a 4-bit variant too) | paper, README |
| scale group | 32 tokens per channel (keys); 32 and 64 work alike, 128 is clearly worse | paper's ablation, via search excerpts |
| full-precision tail | 128 most recent tokens | paper's ablation, via search excerpts |
| peak memory (model weights included) | 2.6× lower, "almost the same quality" | abstract (Llama-2, Falcon, Mistral) |
| batch size, throughput | up to 4× larger; 2.35–3.47× | abstract |

Liu, Yuan et al., ICML 2024 (arXiv:2402.02750). We could not open the PDF from here; the ablation rows come from search excerpts of it.
:::

"Two bits" is the size of the code, not the cost of a number. The ruler is side information too. Assuming a 16-bit smallest value and a 16-bit step per scale group of $\vngrp = 32$ numbers (our assumption — we did not check how KIVI stores them):

$$
\underbrace{\vn}_{\text{bits of code}} + \underbrace{\frac{2 \times 16}{\vngrp}}_{\text{ruler, shared by } \vngrp \text{ numbers}} = 2 + \frac{32}{32} = 3 \ \text{bits per number}
$$ {#eq-pb-kivi-cost}

So by our count "2-bit" KIVI is about 5× smaller than 16 bits, not 8×, before the tail. Nothing wrong with that — every helper charges a tax — but it is the number to compare.

**What KIVI tells us.** It tells us *where structure lives*. If one ruler per column works for keys, each key channel must have a typical size of its own that persists over tokens. If it fails for values, value channels do not; their size varies by token instead. It also tells us that attention tolerates very coarse rounding when the ruler follows that structure.

**What it does not tell us.** How many bits an *exact* copy needs. Rounding to four marks throws away everything below the step, and a [[lossless]] coder must keep all of it, noise included. For an exact copy the only currency is variance explained:

::: aside reminder The exchange rate (II.12)
A predictor that explains a share $\vRsq$ of a number's variance leaves a residual with variance $(1-\vRsq)\vsigma^2$. For bell-shaped data that saves $\tfrac12\log_2\frac{1}{1-\vRsq}$ bits per number: 75 % explained buys 1 bit, 94 % buys 2. See [[#school-exchange-rate]].
:::

::: keycard What a lossless coder can take from KIVI
$\tfrac12\log_2 \dfrac{1}{1-\vRsq}$ bits per number — and KIVI reports no $\vRsq$.
:::

The predictor KIVI points to is "each channel's typical value". Its gain on 8-bit keys is set by how much of a key's spread is *between* channels versus *within* one — our lightest dictionary, worked out in [[#homework-loc]]. KIVI measures neither spread on any grid.

::: note warning Where we are not convinced
- **"Values have no per-channel structure" is an absence in a plot.** The paper reports no obvious pattern in values and chooses per-token rulers by reasoning about how rounding errors reach the attention output. That is not a measurement that value channels are unpredictable.
- **Drift is assumed, not shown.** KIVI lays a fresh ruler every 32 tokens because it must (it does no offline calibration). It never compares that with one fixed ruler per channel for the whole text. So it cannot tell us whether a channel's typical value *moves* — and only movement makes per-block dictionaries beat global ones.
- **Older models.** The evidence is magnitude plots of a few layers of Llama-2-era models. Newer models (grouped heads, partial RoPE, latent caches) may differ.
:::

::: takeaway
- KIVI shows *where* structure lives: keys along channels, values along tokens.
- It shows what attention *tolerates*, not how much is *predictable*; lossless gains need a variance-explained number it does not report.
- By our count, "2-bit" is about 3 bits once the shared rulers are paid for.
:::

## Connections {#connections}

- **A lossy cousin of our lightest dictionary.** Per channel, per 32 tokens, KIVI keeps a smallest value and a step: a location and a scale. Our per-channel location-and-scale dictionary ([[#homework-loc]]) keeps the same two numbers per channel — but uses them to *predict* each number and store the exact difference. KIVI's 32-token groups are a block size; whether such blocks beat one global dictionary is the scope question of [[#homework-scope]].
- **Keys and values are separate problems.** If even KIVI needs two different rulers, a lossless coder should expect two different dictionaries — see [[#missed-keys-before-rope]].

::: theme noise-floor
KIVI keeps 2 bits of every number and drops the rest; the model barely notices. An exact copy cannot drop anything. Whatever in the six low bits no predictor can explain is paid in full — which is why "survives 2 bits" says almost nothing about lossless size.
:::

:::: compare KIVI and its neighbour KVQuant
::: col KIVI
- Rulers per channel for keys, per token for values.
- Uniform marks, min–max rulers, laid online every 32 tokens; no calibration.
- 2 bits; full-precision tail of recent tokens.
:::
::: col KVQuant
- Same ruler directions, but keys are rounded **before** RoPE.
- Marks placed non-uniformly, fitted offline; the largest ~1 % of numbers escape the ruler.
- 3 bits for its headline result. See [[#papers-kvquant]].
:::
::::

::: takeaway
- KIVI's key ruler is a per-block location and scale used for rounding; ours would use the same numbers for prediction.
- Its next of kin, KVQuant, adds RoPE, non-uniform marks and escapes.
:::
