---
title: The cost model, and the paper in every outcome
nav: Cost model and paper
group: 'Wave 2'
lede: The last step turns measured bits and measured residency into requests per GPU — and then into a paper. Every outcome has one, including the negative.
cards:
  - q: 'In the reference setting, how many requests per GPU does HiSparse serve at B = 4K, and what binds?'
    a: About 109, bound by the link
    wrong: ["About 146, bound by HBM", "About 73, bound by HBM", "About 1000, bound by compute"]
    why: '13.7 MB of misses per request per step against 1.5 GB per 30 ms step over a 50 GB/s link gives 109; HBM alone would allow 146.'
    sec: cost
  - q: 'A request-scope dictionary with ρ = 0.75 and w = 256: requests per GPU at 50 GB/s?'
    a: About 138 — now bound by HBM, a gain of about 1.26×
    wrong: ["About 146, still link-bound", "About 109, nothing changes", "About 218, twice as many"]
    why: Cheaper misses lift the link bound to 146, but the dictionaries add HBM, which now binds at 138.
    sec: cost
  - q: Which gain on the binding constraint does framework D call "not worth a system"?
    a: Under 1.1×
    wrong: ["Under 2×", "Under 1.5×", "Any gain below 10×"]
    why: A 1.3–2× gain on the binding constraint is a strong systems result; under 1.1× the engineering is not worth it.
    sec: cost
  - q: If Q1 comes out negative, what is the paper?
    a: '"How much conditional structure is left in 8-bit KV caches? (Not much.)" — a shuffle-controlled measurement with a BF16 column and an E4M3-versus-INT8 comparison'
    wrong: ["There is no paper", "The same systems paper with smaller numbers", "A paper on a new sparse-attention indexer"]
    why: No lossless number for KV neighbour similarity exists anywhere; a careful "no" redirects the field to context-free miss-path coding.
    sec: paper
---

A bakery that learns its new oven bakes 30 % faster has not yet learned whether it will sell more bread. That depends on what was holding it back — the oven, the shop counter, or the number of customers. Wave 1 and the first half of wave 2 measure the oven. The cost model asks what was holding the system back.

## The cost model, fed with measurements {#cost}

The cost model is framework D ([[#questions-framework-d]]) and the formulas of [[#homework-economics]], with the assumed numbers replaced by measured ones: $\vrho$ and $\vdsz$ from wave 1, $\vfD$ and $\vnload$ from wave 2, the [[reference-setting|reference setting]] for the rest.

::: aside reminder The two budgets
Per request and step, the bytes moved over the link and the bytes resident in HBM are
$\vTstep = \vm\,\vk\,\vNL\,\ve\,[\vfD\vrho + (1-\vfD)] + \vnload\,\vNL\,\vw\,\ve$ and $\vMreq = \vNL\,\ve\,(\vB + \vwres)$.
The GPU serves $\vN = \min(\vNlink, \vNhbm)$ requests, with $\vNlink = \vWlink \cdot \vtpot / \vTstep$ and $\vNhbm = \vMhbm / \vMreq$ ([[#idea-two-levers]]).
:::

The outputs are one table and one frontier plot: requests per GPU against link bandwidth and HBM budget, for HiSparse and for kv-blockdiff at request and block scope, with and without a victim tier. Here is the frontier for the simplest case, request scope.

::: figure fig-plan-frontier planFrontier
**Requests per GPU against link bandwidth.** Vermilion: HiSparse; lapis: kv-blockdiff with one request-scope dictionary per layer ($\vfD = 1$, no loads). Each curve is $\min(\vNlink, \vNhbm)$: it rises with bandwidth while the link binds and goes flat where HBM binds. Reference setting: $\vk = 2048$, $\vNL = 78$, $\ve = 640$ bytes, TPOT 30 ms, 30 GB of HBM for KV, HiSparse's miss rates 30 / 13.4 / 6.7 % at $\vB$ = 2K / 4K / 8K. Choose the hot-cache size, the delta ratio $\vrho$ and the resident dictionary weight $\vwres$. Dotted lines: 50 GB/s (PCIe Gen5 ×16, the reference) and about 450 GB/s (NVLink-C2C in one direction). Bandwidth on a log scale. The $\vrho$ and $\vwres$ are **assumed** until wave 1 measures them.
:::

At the defaults ($\vB = 4\text{K}$, $\vrho = 0.75$, $\vwres = 256$), at 50 GB/s:

- **HiSparse** serves about 109 requests per GPU, bound by the link (HBM alone would allow 146).
- **kv-blockdiff** lifts the link bound to 146, but its dictionaries add HBM, which now binds at **138**: a gain of about **1.26×**.

::: try
1. Slide $\vrho$ down to 0.5. The link bound soars, but the curve stops at the HBM ceiling: cheaper misses alone cannot beat memory.
2. Set $\vwres$ to 0 (a light dictionary). The HBM ceiling returns to HiSparse's, and the gain grows.
3. Move to $\vB = 8\text{K}$. HiSparse is now HBM-bound (about 73) at the reference link; cheaper misses buy nothing, and the dictionaries even cost a little HBM, until the second [[lever]] shrinks the slots.
:::

What the result would mean, by framework D's yardstick: **under 1.1×** on the binding constraint is not worth a system; **1.3–2×** is a strong systems result. The HBM lever can be projected from the same numbers before any kernel exists.

::: takeaway
- The cost model feeds measured $\vrho$, $\vfD$ and $\vnload$ into the two budgets of the reference setting.
- At the defaults: 109 requests per GPU for HiSparse (link-bound), 138 for a request-scope dictionary (HBM-bound), about 1.26×.
- Cheaper misses help only while the link binds; then memory decides.
:::

## The paper in every outcome {#paper}

A plan is honest when every outcome has a write-up. Here are the three, in the source's words translated into ours.

:::: cols
::: col Positive on Q1–Q3
**"Lossless, scope-aware dictionary coding of 8-bit KV caches."** Per-block dictionaries cut sparse-decode miss traffic by X× and hot-cache HBM by Y×, at zero accuracy cost, with a GPU-decodable fixed-length format.

*Contributions:* the neighbour-similarity measurement; the random-access coder and its compressibility curve; the block-residency statistics; the cost model.
:::
::: col Positive on Q1, negative on Q3
**The same, at request scope** — "requestdiff", or light dictionaries that are all resident.

A simpler system, plus a clean negative on block scale. Still three new measurements: neighbour similarity at 8 bits, the curve, and where misses land.
:::
::: col Negative on Q1
**"How much conditional structure is left in 8-bit KV caches? (Not much.)"**

A shuffle-controlled measurement with a BF16 column and an E4M3-versus-INT8 comparison, pointing the field to context-free miss-path coding.
:::
::::

Our read: the third paper is not a consolation prize. No lossless number for KV neighbour similarity exists anywhere ([[#papers-what-would-be-new]]). A careful "no", with its controls, saves the next group a year.

What would make reviewers nod, in any outcome:

- **the distance curves with their shuffled twins** — the method is the result;
- **the fixed-length rate next to the entropy rate** — engineering honesty;
- **the HiSparse-calibrated replay** — not a toy workload;
- **the cost model with every assumed number marked** — like the plot above.

::: theme controls
In every one of the three papers, the controls are part of the claim. A positive result without its shuffled twin is an anecdote; a negative result without it is an accusation of a bug.
:::

::: takeaway
- Three outcomes, three papers: blockdiff, requestdiff, and a well-controlled negative.
- The negative is publishable because no lossless measurement exists yet.
- Reviewers will look for the shuffled curves, both rates, a calibrated replay, and marked assumptions.
:::
