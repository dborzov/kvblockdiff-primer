---
title: What would be new
nav: What would be new
group: The gap
lede: Lay every paper of this Part on one grid and one square stays empty. Exact coding of 8-bit orchards that uses what cherries share, measured with controls, on the scattered-read path of sparse decoding. Three claims, each with its evidence, its caveat, and what Part VIII has already delivered on it.
cards:
  - q: Which kind of evidence do the lossy papers (KIVI, KVQuant, KVTC, Lexico, CacheGen) give us?
    a: Where structure lives and what the LLM tolerates, not how many bits an exact copy needs
    wrong: ["Exact bit counts for 8-bit orchards", "Measurements with shuffle controls", "Nothing at all"]
    why: Their yardsticks are accuracy and perplexity at a memory budget. Lossless gains are set by variance explained, which none of them reports.
    sec: gap
  - q: Which published compressor counts bits for an exact copy at 8 bits, and what is missing from it?
    a: 'SplitZip, but only context-free: no neighbours, no dictionaries beyond one global table'
    wrong: ["KIVI, but only for values", "KVTC, but only for keys", "CacheGen, but only at 2 bits"]
    why: SplitZip's 6.19-bit order-0 bound on E5M2 is a bit count; it says nothing about what a reference cherry or a punnet dictionary would add.
    sec: gap
  - q: What did the campaigns deliver on claim 1, the measurement?
    a: 'Bits for an exact copy of 8-bit values on one LLM, with a shuffle control: stereo 0.85 bit per element, echo the axis that mattered, fallen-apple weak, upstairs small'
    wrong: ["Nothing yet; the measurement is still planned", "A new attention kernel", "A lossy compressor with a higher ratio"]
    why: Part VIII is claim 1 for values of Qwen3.5-2B on one kind of text. Keys, other text, a second LLM and the sequence scope are still open.
    sec: claims
  - q: What is the honest caveat on claim 2, the random-access lossless delta store?
    a: Its parts are known; only the combination and the target are new, and its worth depends on the leash's cost, which the campaigns found small at 4096
    wrong: ["It cannot be made lossless", "It needs a new GPU", "It has already been published by HiSparse"]
    why: Fixed-length codes, escapes, reference cherries and punnet dictionaries all exist. A cold decode within 293 cherries' worth cost nothing at stretch 4096; at 137 it cost 0.023 of ratio.
    sec: claims
  - q: Why might the novelty claims be narrower than they look?
    a: We checked papers through abstracts and summaries, and saw newer related titles we have not read
    wrong: ["Because lossless coding is impossible", "Because HiSparse already uses dictionaries", "Because 8-bit orchards are never used"]
    why: Being honest about the search is part of the claim. A measurement is still a result even if a neighbouring paper turns up.
    sec: wrong
---

Six papers on these pages, a few more on the neighbouring ones, and each answered a question near ours. Put them side by side on the questions that matter for [[kvblockdiff]], and look for the column nobody fills. Then look at what Part VIII already wrote into it.

## Two kinds of evidence, one empty square {#gap}

| work | exact copy? | 8-bit target? | shared bits measured? | controls? | single-cherry reads? | miss path? |
|---|---|---|---|---|---|---|
| [[#papers-kivi\|KIVI]], [[#papers-kvquant\|KVQuant]] | no | no (2–3 bits) | no | no | yes (fixed-width codes) | no |
| [[#papers-kvtc\|KVTC]] | no | no | no | no | no (DEFLATE stream) | no |
| [[#papers-lexico\|Lexico]] | no | no | no | no | yes (per-vector atoms) | no |
| [[#papers-cachegen\|CacheGen]] | no | no | as variance, not bits | no | no (streams) | no |
| [[#papers-kvcomp\|KVComp]] | no | no | no | no | in short runs of bits | no |
| [[#papers-kv-codec\|KVFetcher]] | of rounded integers | no | no | half (a head swap) | no (video runs) | no |
| [[#papers-splitzip\|SplitZip]] | yes | yes (E5M2) | no; order-0 only | no | almost (fixed-width) | no |
| [[#papers-hisparse\|HiSparse]] | nothing compressed | — | — | — | yes (raw picks) | yes |
| **the campaigns** ([[#measured-dispatch\|Part VIII]]) | **yes** | **yes (E4M3)** | **yes, in bits** | **shuffle, synthetic, round trip** | **yes, under the leash** | **no indexer ran** |
| **kvblockdiff** | **yes** | **yes** | **the question** | **built in** | **yes** | **yes** |

Read the table by columns. Two kinds of evidence exist in the literature, and they do not meet.

- **Lossy papers** show *where structure lives*: key furrows with sizes of their own (KIVI, KVQuant), a few dominant directions (KVTC), atoms shared by all texts (Lexico), neighbours alike within a furrow (CacheGen), and what the LLM *tolerates*. Their yardstick is accuracy at a memory budget.
- **Lossless compressors** count bits, but without context: SplitZip prices each number by its own histogram (an order-0 bound of 6.19 bits on E5M2), and the float compressors do the same for exponents.

Nobody in print converts "where structure lives" into "bits saved for an exact 8-bit copy". The conversion needs one number per predictor, the variance it explains on the stored grid, and the exchange rate is harsh: 75 % for one bit, 94 % for two ([[#toolbox-exchange-rate]]). The campaigns' row is the first with every column filled but the last, and the last is filled by HiSparse's row above it.

::: theme which-vs-what
The same confusion three times over. HiSparse's hit rate says *which* picks will be wanted, not what is inside them. Lossy papers say what the LLM *tolerates*, not what is *predictable*. Only a measurement of bits for an exact copy says what is inside, and Part VIII is the first.
:::

::: takeaway
- Lossy work locates structure; lossless work counts bits without context. The two never meet in print.
- The empty square: shared bits of 8-bit orchards, with controls, on the scattered-read path. Part VIII filled it for values of one LLM.
:::

## Three claims {#claims}

### 1. A measurement: shared bits at 8 bits, with controls

- **Claim.** How many bits per element a cherry saves given what it shares with the rest of its punnet, along each axis of the orchard: tokens ([[fallen-apple]]), layers ([[upstairs]]), heads ([[stereo]]), repeats ([[echo]]), measured on the stored 8-bit grid with a shuffle control, a synthetic control and an exact round trip.
- **Evidence it was missing.** CacheGen's 2.4–2.9× variance ratio was the closest thing in print, with an unclear baseline. KVFetcher's ratio bundles rounding with coding. SplitZip stops at order-0.
- **What Part VIII delivered.** On the Bench's values (Qwen3.5-2B, FP8 E4M3, agent transcripts): solo 0.778; the best verified compressor 0.636 at stretch 4096, 1.1 bits per element over solo; the two heads share 0.85 bit per element at a cosine of 0.05 ([[#hypotheses-stereo]]); far repeats of the same token, not neighbours, are what references point at ([[#hypotheses-echo]]); adjacent layers share 0.03–0.08 bit ([[#hypotheses-upstairs]]); the shuffle control separated the text's repeats from the LLM's geometry ([[#measured-two-kinds-of-structure]]).
- **Honest caveat.** One LLM, one kind of text, values only, mostly 2–5 sequences. Keys, prose, a second LLM and the sequence scope are open ([[#plan-where-we-stand]]). A small or negative result on any of them is still a result.

### 2. A data path: an exact, random-access delta store for the miss path

- **Claim.** Keep the orchard as punnet dictionaries plus deltas, so a miss moves a delta and the GPU rebuilds the cherry bit for bit, cold, under the [[leash]] ([[#app-mapping]]).
- **Evidence it is missing.** Every lossless orchard compressor we found is built for bulk transfers or streams: SplitZip (prefill to decode), KVFetcher and CacheGen (network fetch), KVTC (offload with DEFLATE). HiSparse moves raw picks.
- **What Part VIII delivered.** The leash is cheaper than feared: a cold decode within 293 cherries' worth cost nothing at stretch 4096 and above; at 137 it cost 0.023 of ratio; the worst cherry reads 1.1–3.7× the mean ([[#measured-reading-one-cherry]]). A layout along reference-tree paths made a dictionary share of 0.5 cheap to read.
- **Honest caveat.** The parts are known: fixed-length codes, escapes, reference cherries, punnet dictionaries, even CacheGen's reference-per-stretch layout. Only the combination and the target are new. No fixed-length rate and no GPU decode time have been measured ([[#plan-decoder-speed]]).

### 3. Economics: where misses land, and what residency costs

- **Claim.** Whether the indexer's misses pile into a few long-lived [[heavy-stretch|heavy stretches]], and what dictionaries do to sequences per GPU once their loads and their HBM are paid ([[#app-the-napkin]], [[#app-on-fire]]).
- **Evidence it is missing.** HiSparse reports miss rates per pick (30 / 13.4 / 6.7 %), not where the misses fall by stretch. No paper prices dictionary residency.
- **What Part VIII delivered.** Nothing: no indexer ran on the Bench ([[#hypotheses-heavy-stretches]]). The light no-tree compressor (0.686, dictionary share 0.021) and the tree compressors (dictionary share 0.43–0.54) give the two ends of the residency question numbers to plug in ([[#app-two-boring-corners]], [[#measured-what-it-means]]).
- **Honest caveat.** It depends on the selector, the LLM and the trace; the plan simulates the indexer with exact top-$\vk$ ([[#plan-queries-and-picks]]). If light dictionaries suffice, residency hardly matters.

::: takeaway
- Claim 1 is partly delivered, for values of one LLM; it carries the other two and is publishable either way.
- Claim 2 is new as a combination; the leash's cost is now known to be small.
- Claim 3 is unmeasured and matters only if dictionaries turn out heavy.
:::

## What could make us wrong {#wrong}

We checked every paper of this Part through abstracts, code repositories and search summaries, and a few full texts; arxiv.org itself was mostly out of reach. So the empty square is empty *as far as we could see*. While checking facts, search results also showed newer titles that sit close to ours and that we have **not read**:

::: note literature Five unread titles
- *DeltaKV: Residual-Based KV Cache Compression via Long-Range Similarity* (arXiv:2602.08005, 2026). By its title and summary, predicts tokens from similar distant tokens and stores residuals. Close to claim 1 and to [[echo|echo similarity]], which the campaigns found to be the axis that mattered.
- *KV Cache Compression Through the Lens of Transform Coding* (arXiv:2608.14191, 2026). Close to the KVTC page and the KLT bound.
- *A JoLT for the KV cache: Near-Lossless KV Cache Compression via Joint Rank-bit Allocation* (arXiv:2607.12550, 2026). "Near-lossless" is the phrase to check.
- *PackKV* (arXiv:2512.24449, 2025) and *Codec-Gauge* (arXiv:2607.20538, 2026). Lossy, by their titles.
:::

Any of them could narrow claim 1 or 2. Reading them is the first item of homework before any write-up.

```graph
id: papers-gap-map
columns: ["What the papers show", "What was missing", "Our claim", "What Part VIII delivered"]
nodes:
  - {id: lossy, col: 1, row: 1, title: "Lossy KV papers", text: "Where structure lives; what the LLM tolerates.", term: lossy}
  - {id: lossless, col: 1, row: 2, title: "Lossless compressors", text: "Bits, but order-0 and in bulk.", term: lossless}
  - {id: hisparse, col: 1, row: 3, title: "HiSparse", text: "Which picks are wanted; raw misses.", link: papers-hisparse, term: hisparse}
  - {id: m1, col: 2, row: 1, title: "Bits for an exact copy", text: "Variance explained on the 8-bit grid, with controls."}
  - {id: m2, col: 2, row: 2, title: "Random access, with context", text: "Single-cherry reads that use a dictionary."}
  - {id: m3, col: 2, row: 3, title: "Misses by stretch", text: "Concentration and residency cost."}
  - {id: c1, col: 3, row: 1, title: "1. The measurement", text: "Shared bits along each axis.", link: hypotheses-neighbour-similarity, term: neighbour}
  - {id: c2, col: 3, row: 2, title: "2. The data path", text: "An exact delta store for misses.", link: app-mapping, term: kvblockdiff}
  - {id: c3, col: 3, row: 3, title: "3. The economics", text: "Sequences per GPU with dictionaries.", link: app-the-napkin, term: heavy-stretch}
  - {id: d1, col: 4, row: 1, title: "Stereo, echo, fallen-apple, upstairs", text: "0.85 bit; repeats; weak; small. Values of one LLM.", link: measured-scorecard, term: stereo}
  - {id: d2, col: 4, row: 2, title: "The leash costs little", text: "Nothing at 293; 0.023 at 137.", link: measured-reading-one-cherry, term: leash}
  - {id: d3, col: 4, row: 3, title: "Not measured", text: "No indexer ran on the Bench.", link: plan-hot-cache-replay, term: bench}
edges:
  - [lossy, m1]
  - [lossless, m1]
  - [lossless, m2]
  - [hisparse, m3]
  - [m1, c1]
  - [m2, c2]
  - [m3, c3]
  - [c1, c2, "if positive"]
  - [c1, d1]
  - [c2, d2]
  - [c3, d3]
```

::: theme controls
A claim of "nobody has measured this" is only as good as the measurement that follows it. The shuffle control is what turned CacheGen-style observations into a number on the Bench: the reference-tree gain fell from 0.69 to 0.75 of ratio when tokens were shuffled across texts, and the prediction gain did not move.
:::

::: takeaway
- The gap is real as far as abstracts, code and summaries show; five newer titles need reading before any claim of novelty goes out.
- The measurement is the claim that survives every outcome, and Part VIII is its first instalment.
:::
