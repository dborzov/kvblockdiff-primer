---
title: What "better than HiSparse" means
nav: What “better than HiSparse” means
lede: A vague "better" cannot be tested. Ours has a number — concurrent decode requests per GPU — two ceilings that cap it, and two levers that can lift them. And the levers compound.
group: What better means
cards:
  - q: How many concurrent decode requests can one GPU serve, in this site's model?
    a: $\vN = \min(\vNlink, \vNhbm)$ — the lower of what the link can feed and what GPU memory can hold
    wrong: ["$\\vNlink + \\vNhbm$", "$\\max(\\vNlink, \\vNhbm)$", "$\\vNlink \\times \\vNhbm$"]
    why: Each request needs its misses delivered over the link and its hot cache held in GPU memory; whichever runs out first sets the count.
    sec: headline
  - q: In the reference setting, which ceiling binds for HiSparse at B = 4096, and which at B = 8192?
    a: The link at 4096 (about 110 vs 146); GPU memory at 8192 (about 73 vs 219)
    wrong: ["GPU memory at both sizes", "The link at both sizes", "Memory at 4096, the link at 8192"]
    why: Doubling the hot cache halves the misses (link relief) but doubles the memory per request.
    sec: headline
  - q: What does lever 1 change, and which ceiling does it lift?
    a: Misses move ρ·e instead of e bytes, lifting the link ceiling by up to 1/ρ
    wrong: ["Slots hold deltas, lifting the memory ceiling", "Fewer misses through better eviction", "More selections per step"]
    why: Lever 1 is the first variant of kv-blockdiff — δ-misses. Lever 2 stores hot-cache entries as deltas, which lifts the memory ceiling or buys a bigger cache.
    sec: levers
  - q: Why do the two levers compound to roughly ρ² in miss traffic?
    a: A cache of compressed slots holds 1/ρ times more entries, so about ρ times fewer misses; and each miss is ρ times smaller
    wrong: ["Because ρ is applied to keys and to values", "Because both levers use the same dictionary twice", "Because the link is used in both directions"]
    why: 'The miss rate falls roughly as $\vB^{-1.08}$, so growing $\vB$ by $1/\vrho$ cuts misses by about $\vrho$. For $\vrho = 0.65$: traffic falls about 2.4×.'
    sec: levers
  - q: Which metric comes first in the plan, and which is the headline?
    a: Bits per element of the lossless code comes first; requests per GPU versus HiSparse is the headline
    wrong: ["Kernel latency comes first; perplexity is the headline", "Hit rate comes first; bits per element is the headline", "Requests per GPU comes first; hit rate is the headline"]
    why: 'Bits per element ($\vrho$ × 8) is the scientific number; f_D and dictionary loads come from trace replay; requests per GPU is the engineering result.'
    sec: metrics
---

"Better than HiSparse" sounds like a goal. It is not one until it names a number that can go up. Hit rate? kv-blockdiff does not change it. Compression ratio? A ratio of what, paid where? The number that matters to whoever runs the GPUs is simpler: **how many conversations can one GPU decode at the same time?**

## One headline number, two ceilings {#headline}

Every concurrent request needs two things per decode step: its misses delivered over the link, and its [[hot-cache]] held in GPU memory. Whichever runs out first caps the count.

$$
\vN \;=\; \min\big(\vNlink,\; \vNhbm\big), \qquad
\vNlink = \frac{\vWlink \times \vtpot}{\underbrace{\text{bytes moved per request per step}}_{\text{misses + dictionary loads}}}, \qquad
\vNhbm = \frac{\vMhbm}{\underbrace{\text{GPU memory per request}}_{\text{hot cache + resident dictionaries}}} .
$$ {#eq-idea-requests}

$\vN$ is the number of **requests per GPU**; $\vNlink$ is how many the link can feed and $\vNhbm$ how many fit in GPU memory. A proposal is better exactly when it raises the *smaller* of the two.

::: aside reminder The reference setting's three numbers
$\vWlink = 50$ GB/s, $\vtpot = 30$ ms, $\vMhbm = 30$ GB; 78 layers, $\vk = 2048$, entries of 640 bytes. At $\vB = 4096$: misses move about 13.7 MB per request per step → about 110 requests on the link; the hot cache takes about 205 MB per request → about 146 in memory. At $\vB = 8192$: about 219 on the link, 73 in memory ([[#landscape-derived-numbers]], [[#landscape-reference-setting]]).
:::

So HiSparse sits on a seesaw. At $\vB = 4096$ the link binds (about 110 requests). Double the cache and the misses halve — the link relaxes to about 219 — but memory now binds at 73. Any proposal must say which ceiling it lifts.

::: takeaway
- The headline is $\vN = \min(\vNlink, \vNhbm)$, concurrent requests per GPU.
- HiSparse is link-bound at $\vB = 4096$ (≈ 110) and memory-bound at $\vB = 8192$ (≈ 73).
- Better means raising whichever ceiling is lower.
:::

## Two levers {#levers}

kv-blockdiff has [[=lever|two levers]], one for each ceiling — both turned by the same delta store.

| lever | what changes | which ceiling it lifts | what it needs |
|---|---|---|---|
| **1. cheaper misses** | a [[delta-miss]] moves $\vrho\,\ve$ instead of $\ve$ | $\vNlink$, by up to $1/\vrho$ (minus dictionary loads) | small $\vrho$; high $\vfD$; few loads ([[#idea-heavy-blocks]]) |
| **2. cheaper slots** | hot-cache entries stored as deltas, $\vrho\,\ve$ each | $\vNhbm$ by up to $1/\vrho$ — or a bigger cache at equal memory, and fewer misses | a decoder where entries are used — about 370 GB/s per GPU in its full form, so fixed-length deltas |

Lever 1 is the variant of the previous pages, and the one the first experiments are designed around. Lever 2 is real and, in the long run, the bigger prize: once misses are cheap, memory becomes the binding ceiling — exactly what HiSparse reports on faster host links ([[#papers-hisparse]]). But every number it needs comes from lever 1's measurements, and its full form needs decoding inside attention's gather. A gentler form keeps evicted entries' deltas on the GPU in a second tier ([[#missed-victim-tier]]).

::: figure fig-idea-levers twoLevers
**Requests per GPU for HiSparse and the two levers, in the reference setting.** For each configuration, two bars: $\vNlink$ (blue), the requests the 50 GB/s link can feed, and $\vNhbm$ (teal), the requests that fit in 30 GB of GPU memory; the label on top is $\vN$, the lower of the two. *Lever 1:* a fraction $\vfD$ of misses move $\vrho\,\ve$. *Lever 2:* hot-cache slots hold deltas of $\vrho\,\ve$ — spent either on a cache $1/\vrho$ times bigger at equal memory (misses then fall along HiSparse's curve, $\vm \propto \vB^{-1.08}$) or on $1/\vrho$ times more requests. Miss rates at 4,096 and 8,192 slots are HiSparse's (13.4 %, 6.7 %). Simplifications: dictionary loads and dictionary memory are ignored, and lever 2 assumes every slot holds a delta. $\vrho$ and $\vfD$ are inputs, not measurements; [[#homework-calculator]] has the full model.
:::

::: try
1. Defaults ($\vB = 4096$, $\vrho = 0.65$): lever 1 alone lifts the link ceiling past the memory ceiling, so $\vN$ rises from 109 only to 147 — now memory binds.
2. Switch lever 2 to "buys more requests". Now both ceilings rise and $\vN$ reaches 168, about 1.5× HiSparse.
3. Switch to $\vB = 8192$. HiSparse is now memory-bound: lever 1 alone changes nothing, and lever 2 helps only when it buys more requests.
4. Back at $\vB = 4096$, set $\vfD = 50$ %. Lever 1's gain shrinks from 1.34× to about 1.2×; lever 2 does not depend on $\vfD$ in this simple model.
:::

Why do the levers **compound**? Spend lever 2 on a bigger cache: slots of $\vrho\,\ve$ let the same memory hold $1/\vrho$ times more entries. HiSparse's miss curve falls roughly as $\vB^{-1.08}$, so that cuts the miss rate by about a factor $\vrho$. Each remaining miss is then a delta, $\vrho$ times smaller. Miss traffic falls by about $\vrho \times \vrho$:

$$
\frac{\text{miss traffic with both levers}}{\text{miss traffic of HiSparse}} \;\approx\; \underbrace{\vrho^{1.08}}_{\text{fewer misses}} \times \underbrace{\vrho}_{\text{smaller misses}} \;\approx\; \vrho^{2}, \qquad \vrho = 0.65 \;\Rightarrow\; 0.41,\ \text{about } 2.4\times \text{ less}.
$$ {#eq-idea-compound}

::: aside reminder The miss-rate curve
Under LRU, the miss rate at every cache size is one curve $\vm(\vB)$; through HiSparse's points it is close to $\vm \propto \vB^{-1.08}$ — "double the cache, halve the misses" ([[#landscape-reuse-curve]]).
:::

::: takeaway
- Lever 1 (cheaper misses) lifts the link ceiling; lever 2 (cheaper slots) lifts the memory ceiling or buys a bigger cache.
- Which lever helps depends on which ceiling binds; in the reference setting both matter.
- Together they cut miss traffic by about $\vrho^2$ — 2.4× at $\vrho = 0.65$.
:::

## The metrics, in order of appearance {#metrics}

The proposal will produce numbers in this order, each feeding the next.

1. **Bits per element** of the lossless code, everything included — residuals, per-entry extras, the dictionary's share. Equivalently $\vrho$ = bits per element ÷ 8. The scientific number, produced by the measurement harness of Part IX ([[#plan-harness-interface]]).
2. **$\vfD$ and dictionary loads per step per layer**, from replaying real selection traces through the resolve step ([[#plan-wave2-measure]]).
3. **Requests per GPU and GPU memory per request versus HiSparse**, from the cost model, with a sweep over link speed and memory budget. The engineering number, and the headline of any paper ([[#plan-cost-model-and-paper]]).

Everything else — kernel throughput, latency per step — is downstream and belongs to a later phase.

::: note metric The one sentence
kv-blockdiff is better than HiSparse if, at equal hardware and identical outputs, $\min(\vNlink, \vNhbm)$ is higher — and the first two metrics say whether it can be.
:::

::: takeaway
- First bits per element (and $\vrho$), then $\vfD$ and loads, then requests per GPU.
- Speed of kernels comes later; the headline is $\vN$ versus HiSparse at identical outputs.
:::
