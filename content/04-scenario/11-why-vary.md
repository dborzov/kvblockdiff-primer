---
title: Why we vary the scenario
nav: Why vary it
group: The catalogue
lede: One scenario would do for one application. The project runs many, for two reasons that look different and turn out to be the same measurements read two ways.
cards:
  - q: What is the first reason to run many scenarios?
    a: 'Each best compressor, and each difference between scenarios, is a measurement of the orchard''s information: which axes share bits, and how many'
    wrong: ["To find the one scenario with the lowest ratio", "To make the harness run faster", "Because the LLM changes between scenarios"]
    why: The compressor is the instrument and its score is the reading. Comparing cherry shapes on the same elements measured how many bits the two heads share.
    sec: a-probe
  - q: Why do DeepSeek-V4 and GLM-5.1 call for different scenarios?
    a: V4's indexer picks per layer, GLM-5.1's picks once for a group of layers; one maps to one-layer cherries with a dictionary per layer, the other to multi-layer cherries or a shared dictionary
    wrong: ["They use different number formats", "GLM-5.1 has no orchard", "V4 does not use a hot cache"]
    why: What a pick covers decides what one ask must return, hence the cherry shape and what a dictionary must serve.
    sec: a-map
  - q: How is a scenario written on this site?
    a: 'As a line like `V · layers 0–5 · heads 0,1 · cherry (2, 256) · stretch 4096 · leash 293`'
    wrong: ["By the name of the compressor", "By the campaign's track id alone", "By the MDL ratio"]
    why: The line names slice, cherry shape, stretch length and leash; format, LLM and corpus are stated once per page when they do not vary.
    sec: a-map
---

If the only goal were one serving system, one scenario would do: the slice and cherry shape its picks need, the stretch length its shelf can hold, and the leash its decoder can afford. The project runs many scenarios instead, and it is worth being clear about why, because the reasons decide which experiments come first.

## As a probe of the orchard {#a-probe}

The first reason has nothing to do with any application. The [[orchard]] is a tensor of unknown statistics, and the question "how are its bits arranged?" has no direct instrument. Information theory offers an indirect one: **the best compressor you can find for a scenario is a measurement, and the difference between two scenarios is a measurement too.**

- Run the same compressor on `cherry (256,)` and on `cherry (2, 256)` over the same elements. The second may use head 0 to predict head 1 for free; the first may not. The gap, 0.032 of ratio on 20 sequences of 20, is a lower bound on the bits the two heads share. That is how [[#hypotheses-stereo|stereo similarity]] was found, under a cosine of 0.05 that said the heads had nothing in common ([[#measured-cutting-the-tensor]]).
- Dice two adjacent tokens into one cherry and the ratio gets *worse* by 0.037: adjacent tokens share little once each has its own reference cherry, which is a reading on [[#hypotheses-fallen-apple|fallen-apple similarity]].
- Compare keys and values as slices, FP8 and BF16 as formats, stretch 512 and 16 384, leash 137 and 1 103: each pair is a question about where the bits are, answered in bits.

For this purpose nobody cares whether the winning compressor could ever run on a GPU. It is the instrument; its score is the reading; the interpretation is the result.

::: theme bits-unit
A probe that reports cosines, correlations or "similarity scores" reports nothing this project can use. A probe that reports an MDL ratio under the contract reports bits, and bits are what a link carries.
:::

::: takeaway
- The best compressor per scenario, and the difference between scenarios, measure how the orchard's information is arranged along its axes.
- For this use the compressor's practicality is irrelevant.
:::

## As a map of applications {#a-map}

The second reason is that every real serving design *is* a scenario, and different designs are different scenarios.

| serving design | what one pick covers | the scenario it needs |
|---|---|---|
| DeepSeek-V3.2 / V4 (DSA) | one token at one layer | one-layer slices, `cherry (2, 256)`-style; one dictionary per layer per stretch |
| GLM-5.1 | one token for a group of layers, selected once | multi-layer cherries `(n, 2, 256)`, or one-layer cherries served by one dictionary shared across the group |
| DeepSeek-V4's squeezed picks | four tokens squeezed into one row | cherries of the squeezed row; the stretch counts rows |
| keys and values moved together | both halves of the orchard | a slice of `k` and `v`, or two scenarios whose deltas travel together |

Which scenario a design needs decides which measurements matter to it: a GLM-style design wants to know whether a dictionary shared across six layers beats six separate ones ([[#hypotheses-upstairs]]); a DSA-style design wants the per-layer numbers and nothing else. The experiments run across scenarios first; the application is chosen afterwards, on the numbers ([[#app-which-application]]).

::: note key Two purposes, one table of results
The probe and the map read the same table. Joining the heads saved 0.032: to the probe, 0.85 bit per element of stereo similarity; to the map, "a design whose picks cover both heads gets that saving for free, one whose picks cover one head must pay for it in the dictionary".
:::

### Writing a scenario down

Every number on the measurement pages names its scenario as one line, in a fixed order:

`V · layers 0–5 · heads 0,1 · cherry (2, 256) · stretch 4096 · leash 293`

Slice first (which half, which layers, which heads; elements only when not all), then cherry shape, stretch length, leash. The number format, the LLM and the corpus are stated once per page when they do not vary (on the measurement pages: FP8 E4M3, Qwen3.5-2B, the agent transcripts). A screen's name from the campaigns' ledger (`s-layer-b4k-r293`) appears only inside a `::: aside source` as a receipt.

### The catalogue

| scenario | status | what it measures |
|---|---|---|
| `V · layer 0 · head 0 · cherry (256,) · stretch 4096 · no leash` | run (C1) | the first ladder; where the trivial corner is |
| `V · all · cherry (256,) / (2, 256) / (6, 2, 256) · stretch 4096 · leash 293` | run (C2) | stereo and upstairs similarity, by cherry shape |
| `V · all · cherry = 2 or 4 adjacent tokens · stretch 4096` | run (C2, quick) | fallen-apple similarity at the cherry level |
| `V · all · cherry (2, 256) · stretch 512 / 16 384 / 32 768` | run (C2, partly) | the stretch-length curve; the punnet floor |
| `V · all · cherry (2, 256) · stretch 4096 · leash 137 / 1 103` | run (C2, partly) | what the leash costs |
| `K · all · cherry (2, 256) · stretch 4096 · leash 293` | one night (C1) | keys as a separate problem |
| `K+V · all · cherry (2, 2, 256)` | not run | what a hot-cache miss really moves |
| `V · all · cherry (2, 256) · stretch = sequence` | not run | sequence scope; $\vgainstr$ |
| any slice · global scope on a calibration corpus | not run | $\vgainseq$; whether structure is global |
| `V · all · cherry (2, 256)` on prose, on a second LLM | not run | whether the repeat-driven findings transfer |

Part X orders the unrun rows by how fast they return a result ([[#plan-next-in-the-harness]]).

::: takeaway
- Every serving design is a scenario; what a pick covers decides the cherry shape and what a dictionary must serve.
- A scenario is written as one line: slice · cherry shape · stretch · leash. The catalogue says what has been run and what has not.
:::
