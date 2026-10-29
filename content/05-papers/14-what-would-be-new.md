---
title: What would be new
lede: Lay every paper of this Part on one grid and one square stays empty — exact coding of 8-bit KV that uses its neighbours, measured with controls, on the scattered-read path of sparse decoding. Three claims, each with its evidence and its honest caveat.
group: The gap
cards:
  - q: Which kind of evidence do the lossy KV papers (KIVI, KVQuant, KVTC, Lexico, CacheGen) give us?
    a: Where structure lives and what the model tolerates — not how many bits an exact copy needs
    wrong: ["Exact bit counts for 8-bit KV", "Measurements with shuffle controls", "Nothing at all"]
    why: Their yardsticks are accuracy and perplexity at a memory budget. Lossless gains are set by variance explained, which none of them reports.
    sec: gap
  - q: Which published coder measures KV redundancy in bits at 8 bits — and what is missing from it?
    a: 'SplitZip — but only context-free (order-0): no neighbours, no dictionaries'
    wrong: ["KIVI — but only for values", "KVTC — but only for keys", "CacheGen — but only at 2 bits"]
    why: SplitZip's 6.19-bit order-0 bound on E5M2 is a bit count; it says nothing about how much a neighbour or a block dictionary would add.
    sec: gap
  - q: What is claim 1 of "what would be new"?
    a: A measurement of neighbour similarity in bits per number, at 8-bit precision, with controls
    wrong: ["A new attention kernel", "A lossy compressor with a higher ratio", "A new sparse-attention selector"]
    why: Fallen-apple and upstairs similarity in bits, with a shuffle control, a synthetic control and an exact round trip — publishable whether positive or negative.
    sec: claims
  - q: What is the honest caveat on claim 2, the random-access lossless delta store?
    a: Its parts are known; only the combination and the target are new — and it is worth building only if claim 1 comes out positive
    wrong: ["It cannot be made lossless", "It needs a new GPU", "It has already been published by HiSparse"]
    why: Fixed-length codes, escapes and block dictionaries all exist. If KV has no conditional structure at 8 bits, what remains is context-free coding on the miss path — useful, and less new.
    sec: claims
  - q: Why might the novelty claims be narrower than they look?
    a: We checked papers through abstracts and summaries, and saw newer related titles we have not read
    wrong: ["Because lossless coding is impossible", "Because HiSparse already uses dictionaries", "Because 8-bit KV is never used"]
    why: Being honest about the search is part of the claim. A measurement is still a result even if a neighbouring paper turns up.
    sec: wrong
---

Six papers on these pages, a few more on the neighbouring ones, and each answered a question near ours. Put them side by side on the questions that matter for kv-blockdiff, and look for the column nobody fills.

## Two kinds of evidence, one empty square {#gap}

| work | exact copy? | 8-bit target? | neighbours measured in bits? | controls? | single-entry reads? | sparse-decode miss path? |
|---|---|---|---|---|---|---|
| [[#papers-kivi\|KIVI]], [[#papers-kvquant\|KVQuant]] | no | no (2–3 bits) | no | no | yes (fixed-width codes) | no |
| [[#papers-kvtc\|KVTC]] | no | no | no | no | no (DEFLATE stream) | no |
| [[#papers-lexico\|Lexico]] | no | no | no | no | yes (per-vector atoms) | no |
| [[#papers-cachegen\|CacheGen]] | no | no | as variance, not bits | no | no (coded chunks) | no |
| [[#papers-kvcomp\|KVComp]] | no | no | no | no | in chunks of bits | no |
| [[#papers-kv-codec\|KV-Codec]] | of rounded integers | no | no | no | no (video stream) | no |
| [[#papers-splitzip\|SplitZip]] | yes | yes (E5M2) | no — order-0 only | no | almost (fixed-width) | no |
| [[#papers-hisparse\|HiSparse]] | nothing compressed | — | — | — | yes (raw entries) | yes |
| **kv-blockdiff** | **yes** | **yes** | **the question** | **built in** | **yes** | **yes** |

Read the table by columns. Two kinds of evidence exist, and they do not meet.

- **Lossy papers** show *where structure lives* — key channels with sizes of their own (KIVI, KVQuant), a few dominant directions (KVTC), atoms shared by all texts (Lexico), neighbours alike within a channel (CacheGen) — and what the model *tolerates*. Their yardstick is accuracy at a memory budget.
- **Lossless coders** count bits, but without context: SplitZip prices each number by its own histogram (an order-0 bound of 6.19 bits on E5M2 KV), and the float coders do the same for exponents.

Nobody converts "where structure lives" into "bits saved for an exact 8-bit copy". The conversion needs one number per predictor, the variance it explains on the stored grid — and the exchange rate is harsh: 75 % for one bit, 94 % for two.

::: theme which-vs-what
The same confusion three times over. HiSparse's hit rate says *which* entries will be wanted, not what is inside them. Lossy papers say what the model *tolerates*, not what is *predictable*. Only a measurement of bits for an exact copy says what is inside.
:::

::: takeaway
- Lossy work locates structure; lossless work counts bits without context. The two never meet.
- The empty square: conditional structure of 8-bit KV, in bits, with controls, on the scattered-read path.
:::

## Three claims {#claims}

### 1. A measurement: neighbour similarity in bits, at 8 bits, with controls

- **Claim.** How many bits per number an entry saves given a neighbour — at token distance $\vgap$ ([[fallen-apple]]) and one layer down ([[upstairs]]) — measured on the stored 8-bit grid, with a shuffle control, a synthetic control with a known answer, and an exact round trip.
- **Evidence it is missing.** CacheGen's 2.4–2.9× variance ratio is the closest thing in print, and its baseline is unclear ([[#papers-cachegen]]). KV-Codec's ratio bundles rounding with coding ([[#papers-kv-codec]]). SplitZip stops at order-0.
- **Honest caveat.** It may come out small or negative. That is still a result: it would tell the field that context-free coding of the miss path is all there is ([[#missed-a-measurement-is-a-result]]).

### 2. A data path: an exact, random-access delta store for the miss path

- **Claim.** Store the history as block dictionaries plus fixed-width deltas, so a miss moves a delta and the GPU rebuilds the entry bit for bit.
- **Evidence it is missing.** Every lossless KV coder we found is built for bulk transfers or streams: SplitZip (prefill to decode), KV-Codec and CacheGen (network fetch), KVTC (offload with DEFLATE). HiSparse moves raw entries.
- **Honest caveat.** The parts are known — fixed-length codes, escapes, block dictionaries, even CacheGen's anchor layout. Only the combination and the target are new. And it is worth building only if claim 1 is positive; otherwise it shrinks to "SplitZip for sparse decode", useful and less new.

### 3. Economics: where misses land, and what residency costs

- **Claim.** Whether the indexer's misses pile into a few long-lived [[heavy-block|heavy blocks]], and what dictionaries do to requests per GPU once their loads and their GPU memory are paid.
- **Evidence it is missing.** HiSparse reports miss rates per entry (30 / 13.4 / 6.7 %), not where the misses fall by block. No paper prices dictionary residency.
- **Honest caveat.** It depends on the selector, the model and the trace; the plan simulates the indexer with exact top-k ([[#plan-wave2-indexer]]). And if light dictionaries suffice, residency hardly matters ([[#missed-light-dictionaries-first]]).

::: takeaway
- Claim 1 (a measurement) carries the other two and is publishable either way.
- Claim 2 (the data path) is new as a combination, not in its parts.
- Claim 3 (the economics) matters only if dictionaries turn out heavy.
:::

## What could make us wrong {#wrong}

We checked every paper of this Part through abstracts, code repositories and search summaries; arxiv.org itself was out of reach. So the empty square is empty *as far as we could see*. While checking facts, search results also showed newer titles that sit close to ours and that we have **not read**:

- *DeltaKV: Residual-Based KV Cache Compression via Long-Range Similarity* (arXiv:2602.08005, 2026) — by its title and summary, predicts tokens from similar distant tokens and stores residuals. Close to claim 1 and to our sibling dictionary.
- *KV Cache Compression Through the Lens of Transform Coding* (arXiv:2608.14191, 2026) — close to the KVTC page and the KLT bound.
- *A JoLT for the KV cache: Near-Lossless KV Cache Compression via Joint Rank-bit Allocation* (arXiv:2607.12550, 2026) — "near-lossless" is the phrase to check.
- *PackKV* (arXiv:2512.24449, 2025) and *Codec-Gauge* (arXiv:2607.20538, 2026) — lossy, by their titles.

Any of them could narrow claim 1 or 2. Reading them is the first item of homework before any write-up.

```graph
id: pb-gap-map
columns: ["What the papers show", "What is missing", "Our claim"]
nodes:
  - {id: lossy, col: 1, row: 1, title: "Lossy KV papers", text: "Where structure lives; what the model tolerates.", term: lossy}
  - {id: lossless, col: 1, row: 2, title: "Lossless coders", text: "Bits, but order-0 and in bulk.", term: lossless}
  - {id: hisparse, col: 1, row: 3, title: "HiSparse", text: "Which entries are wanted; raw misses.", link: papers-hisparse, term: hisparse}
  - {id: m1, col: 2, row: 1, title: "Bits for an exact copy", text: "Variance explained on the 8-bit grid, with controls."}
  - {id: m2, col: 2, row: 2, title: "Random access, with context", text: "Single-entry reads that use a dictionary."}
  - {id: m3, col: 2, row: 3, title: "Misses by block", text: "Concentration and residency cost."}
  - {id: c1, col: 3, row: 1, title: "1. The measurement", text: "Neighbour similarity in bits.", link: questions-framework-a, term: fallen-apple}
  - {id: c2, col: 3, row: 2, title: "2. The data path", text: "An exact delta store for misses.", link: idea-blockdiff-step-by-step, term: kv-blockdiff}
  - {id: c3, col: 3, row: 3, title: "3. The economics", text: "Requests per GPU with dictionaries.", link: questions-framework-d, term: heavy-block}
edges:
  - [lossy, m1, "tolerance ≠ bits"]
  - [lossless, m1, "no context"]
  - [lossless, m2, "streams"]
  - [hisparse, m3]
  - [m1, c1]
  - [m2, c2]
  - [m3, c3]
  - [c1, c2, "if positive"]
```

::: theme controls
A claim of "nobody has measured this" is only as good as the measurement that follows it. The shuffle control is what turns CacheGen-style observations into a number: if the gain survives shuffling tokens across texts, it was never about neighbours.
:::

::: takeaway
- The gap is real as far as abstracts, code and summaries show; five newer titles need reading before any claim of novelty goes out.
- The measurement is the claim that survives every outcome.
:::
