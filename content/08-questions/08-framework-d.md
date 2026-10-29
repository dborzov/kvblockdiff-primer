---
title: "Framework D: requests per GPU"
nav: "D · requests per GPU"
lede: Every measurement so far is in bits. A person who buys GPUs asks one question — how many conversations can one GPU serve at once? Framework D turns the measured bits into that number, and compares it with HiSparse fairly.
cards:
  - q: Where do the inputs ρ and f_D of the cost model come from?
    a: ρ from framework B (the best affordable coder), f_D and n_load from framework C (trace replay)
    wrong: ["Both from the reference setting", "Both from HiSparse's paper", "Both are free parameters chosen to look good"]
    why: Framework D has no measurement of its own; it combines B and C with the reference setting and sweeps the hardware.
    sec: setup
  - q: Why compare each system at its own best hot-cache size B instead of at B = 4096?
    a: HiSparse can also pick its B; a fixed-B comparison credits kv-blockdiff with gains HiSparse could get by retuning
    wrong: ["Because B = 4096 is not a power of two", "Because kv-blockdiff cannot use B = 4096", "It makes no difference to the result"]
    why: 'At B = 4096 the toy numbers give 109 versus 138 requests (1.26×); at each system''s own best B, 127 versus 141 (1.11×).'
    sec: frontier
  - q: Making misses cheaper by a factor 1/ρ (lever 1 alone) raises requests per GPU by roughly…
    a: The square root of 1/ρ, because the best B shrinks and the gain is shared between the link and the memory limits
    wrong: ["Exactly 1/ρ", "1/ρ squared", "Nothing at all"]
    why: 'N_link grows like B^1.08/ρ and N_HBM falls like 1/B; they meet at a B that scales like ρ^(1/2.08), so N scales like (1/ρ)^0.48.'
    sec: frontier
  - q: According to the framework's thresholds, what gain on the binding constraint is "not worth a system"?
    a: Under about 1.1×
    wrong: ["Under 2×", "Under 1.01×", "Any gain below 1/ρ"]
    why: 1.3–2× is a strong systems result; under 1.1× the complexity is not repaid.
    sec: outcomes
---

Bits per element is the scientist's number. It says how much structure there is. Requests per GPU is the engineer's number. It says whether anyone should care. The two are related by a few multiplications, and framework D is those multiplications, done carefully, with measured inputs instead of guesses.

## The set-up {#setup}

Framework D has no measurement of its own. It is the cost model of [[#homework-economics]], fed with the outputs of the other frameworks.

| input | symbol | comes from |
|---|---|---|
| delta ratio | $\vrho$ | framework B: the best affordable coder, fixed-length rate |
| δ-miss fraction, dictionary loads | $\vfD$, $\vnload$ | framework C: trace replay |
| dictionary weight, resident weight | $\vw$, $\vwres$ | the chosen coder and [[scope]] |
| everything else | $\vk, \vNL, \ve, \vtpot, \vWlink, \vMhbm$ | the [[reference-setting]] |
| miss rate at hot-cache size $\vB$ | $\vm(\vB)$ | HiSparse's three points, $\vm \propto \vB^{-1.08}$ ([[#landscape-reuse-curve]]) |

What is varied: the link bandwidth (PCIe Gen5's 50 GB/s and faster links), the GPU memory left for KV, and the hot-cache size $\vB$. What comes out: requests per GPU, for HiSparse and for kv-blockdiff at request and block scope, with and without a [[victim-tier]].

::: aside reminder The two limits
A GPU serves $\vN = \min(\vNlink, \vNhbm)$ requests: as many as the link can feed, and as many as fit in memory ([[#idea-two-levers]]). HiSparse is the special case $\vrho = 1$, $\vwres = 0$, $\vnload = 0$.
:::

$$
\vNlink = \frac{\vWlink\,\vtpot}{\vTstep}, \qquad
\vTstep = \underbrace{\vm(\vB)\,\vk\,\vNL\,\ve\,\big[\vfD\,\vrho + (1-\vfD)\big]}_{\text{miss traffic: δ-misses and raw misses}} + \underbrace{\vnload\,\vNL\,\vw\,\ve}_{\text{dictionary loads}}
$$ {#eq-questions-nlink}

$$
\vNhbm = \frac{\vMhbm}{\vMreq}, \qquad
\vMreq = \vNL\,\ve\,\big(\underbrace{\vB}_{\text{hot cache}} + \underbrace{\vwres}_{\text{resident dictionaries}}\big)
$$ {#eq-questions-nhbm}

::: takeaway
- Framework D combines $\vrho$ (from B), $\vfD$ and $\vnload$ (from C) with the reference setting.
- It sweeps link speed, GPU memory and hot-cache size, and reports requests per GPU against HiSparse.
:::

## The frontier {#frontier}

One choice makes the comparison fair. HiSparse is free to pick its own hot-cache size. A bigger $\vB$ means fewer misses but more memory per request, so for every system there is a best $\vB$, where the link limit and the memory limit meet. We compare **each system at its own best $\vB$**.

::: figure fig-questions-frontier qFrontier wide
**Requests per GPU against hot-cache size** (schematic: assumed $\vrho$ and $\vfD$; reference setting otherwise). Horizontal axis: hot-cache slots per layer $\vB$, from $\vk$ = 2,048 (the minimum: the current selection must fit) to 16K, log scale; the shaded region beyond 8K extrapolates HiSparse's miss-rate points. Vertical axis: requests per GPU, $\vN = \min(\vNlink, \vNhbm)$ from the two equations above, with $\vm(\vB) = 0.134\,(\vB/4096)^{-1.08}$. Lines: HiSparse; lever 1 with one dictionary per request ($\vw = 256$); lever 1 with block dictionaries, 4 resident of $\vw = 32$, $\vnload = 0.1$; lever 1 plus a victim tier of the best size; levers 1 and 2 (hot-cache entries stored as deltas, $\vrho\,\ve$ per slot). Dots mark each line's best $\vB$; the table lists them. Sliders set link bandwidth, GPU memory, $\vrho$ and $\vfD$; the button shows or hides the victim tier.
:::

::: try
1. At the defaults (50 GB/s, 30 GB, $\vrho = 0.75$), HiSparse peaks at about 127 requests, at $\vB \approx$ 4.7K. One dictionary per request reaches about 141: **1.11×**, not the 1.33× that $1/\vrho$ suggests.
2. Hover at $\vB$ = 4,096. There HiSparse serves 109 requests and the per-request line 138: 1.26×. A comparison at a fixed $\vB$ flatters lever 1, because HiSparse could close part of the gap by retuning.
3. Slide the link to 450 GB/s. HiSparse is now memory-bound at the smallest allowed cache and serves 293. Lever 1 alone *loses* (0.89×): its dictionaries take memory and the link no longer matters. Levers 1 + 2 still win by 14 %.
4. Back at 50 GB/s, set $\vrho = 0.5$. Lever 1 reaches 1.34×, a victim tier 1.50×, and both levers 1.89×.
:::

Why only 1.11×? When misses get cheaper, the link limit rises, so the best cache shrinks, so each request needs less memory too. The gain is shared between the two limits, and it comes out close to the square root of $1/\vrho$.

::: aside detail The square-root rule
With $\vm \propto \vB^{-1.08}$, the link limit grows like $\vB^{1.08}/\vrho$ and the memory limit falls like $1/\vB$. They meet where $\vB^{2.08} \propto \vrho$, so at the best $\vB$, $\vN \propto \vrho^{-1/2.08} \approx (1/\vrho)^{0.48}$. Lever 2 also divides the memory per slot by $1/\vrho$; then both limits scale together and $\vN \propto 1/\vrho$ — the full factor.
:::

::: theme every-tax
Dictionaries are not free on the GPU either. On a fast link, where memory binds, a per-request dictionary of 256 entries' worth per layer is pure cost, and lever 1 alone falls below HiSparse.
:::

::: takeaway
- Compare each system at its own best $\vB$; fixed-$\vB$ comparisons overstate the gain.
- Lever 1 alone buys roughly $\sqrt{1/\vrho}$ in requests per GPU; levers 1 + 2 together buy up to $1/\vrho$.
- On fast links lever 1 alone can lose: memory binds, and dictionaries take memory.
:::

## What the numbers would mean {#outcomes}

This is the engineering claim of any paper, so its bar is written down now.

| gain on the binding limit | reading |
|---|---|
| under 1.1× | not worth a system |
| 1.1–1.3× | worth it only if it comes almost for free |
| 1.3–2× | a strong systems result |

Our read, from the model above, is sobering. A fixed-length $\vrho = 0.75$ is already about one bit per element below solo coding; by the exchange rate that means explaining about three quarters of the variance solo coding leaves. Even so, lever 1 alone lands right at the 1.1× line. To reach 1.3× on its own it needs $\vrho$ near 0.5: some two and a half bits below solo, well over 90 % of the variance explained. Levers 1 + 2 together reach about 1.28× at $\vrho = 0.75$ and 1.47× at $\vrho = 0.65$. The useful corollary: lever 2 can be projected from the same measured numbers before any decoding kernel exists.

::: note warning What this frontier is and is not
The inputs $\vrho$, $\vw$ and $\vfD$ are assumed, and the miss-rate curve beyond 8K is an extrapolation of three points. The figure shows *which regime wins*, not that we are in it. Waves 1 and 2 replace the assumptions with measurements ([[#plan-cost-model-and-paper]]).
:::

::: takeaway
- Under 1.1× is not worth a system; 1.3–2× is a strong result.
- With plausible $\vrho$, lever 1 alone is modest; the prize is lever 2 or the victim tier.
- Every input is marked as assumed until waves 1 and 2 measure it.
:::
