---
title: What "better than HiSparse" means
nav: What “better than HiSparse” means
group: What better means
lede: A vague "better" cannot be tested. Ours has a number, concurrent decoding sequences per GPU, two ceilings that cap it, and two levers that can lift them. And the levers compound.
cards:
  - q: How many concurrent decoding sequences can one GPU serve, in this site's arithmetic?
    a: '$\vN = \min(\vNlink, \vNhbm)$: the lower of what the link can feed and what GPU memory can hold'
    wrong: ["$\\vNlink + \\vNhbm$", "$\\max(\\vNlink, \\vNhbm)$", "$\\vNlink \\times \\vNhbm$"]
    why: Each sequence needs its misses delivered over the link and its hot cache held in GPU memory; whichever runs out first sets the count.
    sec: headline
  - q: On the Pin, which ceiling binds for HiSparse at B = 4096, and which at B = 8192?
    a: The link at 4096 (about 109 against 147); GPU memory at 8192 (about 73 against 219)
    wrong: ["GPU memory at both sizes", "The link at both sizes", "Memory at 4096, the link at 8192"]
    why: Doubling the hot cache halves the misses (link relief) but doubles the memory per sequence.
    sec: headline
  - q: What does lever 1 change, and which ceiling does it lift?
    a: 'Misses move $\vrho\,\ve$ instead of $\ve$ bytes, lifting the link ceiling by up to $1/\vrho$'
    wrong: ["Slots hold deltas, lifting the memory ceiling", "Fewer misses through better eviction", "More picks per step"]
    why: Lever 1 is the first variant of kvblockdiff, the δ-miss. Lever 2 stores hot-cache picks as deltas, which lifts the memory ceiling or buys a bigger cache.
    sec: levers
  - q: Why do the two levers compound to roughly ρ² in miss traffic?
    a: A cache of compressed slots holds 1/ρ times more picks, so about ρ times fewer misses; and each miss is ρ times smaller
    wrong: ["Because ρ is applied to keys and to values", "Because both levers use the same dictionary twice", "Because the link is used in both directions"]
    why: 'The miss rate falls roughly as $\vB^{-1.08}$, so growing $\vB$ by $1/\vrho$ cuts misses by about $\vrho$. For $\vrho = 0.65$: traffic falls about 2.4×.'
    sec: levers
  - q: Which number comes first, and which is the headline?
    a: Bits per element of the lossless compressor comes first; sequences per GPU against HiSparse is the headline
    wrong: ["Kernel latency comes first; perplexity is the headline", "Hit rate comes first; bits per element is the headline", "Sequences per GPU comes first; hit rate is the headline"]
    why: 'Bits per element ($8\vrho$ plus the dictionary share) is the scientific number; $\vfD$ and dictionary loads come from a replay of the hot cache; sequences per GPU is the engineering result.'
    sec: metrics
---

"Better than HiSparse" sounds like a goal. It is not one until it names a number that can go up. Hit rate? [[kvblockdiff]] does not change it. The MDL ratio? A ratio of what, paid where? The number that matters to whoever runs the GPUs is simpler: **how many conversations can one GPU decode at the same time?**

## One headline number, two ceilings {#headline}

Every concurrent [[sequence]] needs two things per decode step: its misses delivered over the [[link]], and its [[hot-cache]] held in GPU memory. Whichever runs out first caps the count.

$$
\vN \;=\; \min\big(\vNlink,\; \vNhbm\big), \qquad
\vNlink = \frac{\vWlink \times \vtpot}{\underbrace{\text{bytes moved per sequence per step}}_{\text{misses + dictionary loads}}}, \qquad
\vNhbm = \frac{\vMhbm}{\underbrace{\text{GPU memory per sequence}}_{\text{hot cache + resident dictionaries}}} .
$$ {#eq-app-sequences}

$\vN$ is the number of **sequences per GPU**; $\vNlink$ is how many the link can feed and $\vNhbm$ how many fit in GPU memory. A proposal is better exactly when it raises the *smaller* of the two. The two denominators get their own letters on the napkin ([[#app-the-napkin]]).

::: aside reminder The Pin's three numbers
$\vWlink = 50$ GB/s, $\vtpot = 30$ ms, $\vMhbm = 30$ GB; 78 KV layers, $\vk = 2048$, cherries of 640 bytes. At $\vB = 4096$: misses move about 13.7 MB per sequence per step, so the link feeds about 109 sequences; the hot cache takes about 205 MB per sequence, so memory holds about 147. At $\vB = 8192$: about 219 on the link, 73 in memory ([[#landscape-derived-numbers]], [[#landscape-reference-settings]]).
:::

So HiSparse sits on a seesaw. At $\vB = 4096$ the link binds (about 109 sequences). Double the cache and the misses halve, the link relaxes to about 219, but memory now binds at 73. Any proposal must say which ceiling it lifts.

::: takeaway
- The headline is $\vN = \min(\vNlink, \vNhbm)$, concurrent sequences per GPU.
- HiSparse is link-bound at $\vB = 4096$ (≈ 109) and memory-bound at $\vB = 8192$ (≈ 73).
- Better means raising whichever ceiling is lower.
:::

## Two levers {#levers}

kvblockdiff has [[=lever|two levers]], one for each ceiling, both turned by the same delta store.

| lever | what changes | which ceiling it lifts | what it needs |
|---|---|---|---|
| **1. cheaper misses** | a [[delta-miss]] moves $\vrho\,\ve$ instead of $\ve$ | $\vNlink$, by up to $1/\vrho$ (minus dictionary loads) | small $\vrho$; high $\vfD$; few loads ([[#app-on-fire]]) |
| **2. cheaper slots** | hot-cache picks stored as deltas, $\vrho\,\ve$ each | $\vNhbm$ by up to $1/\vrho$, or a bigger cache at equal memory and fewer misses | a decoder where picks are read, about 370 GB/s per GPU in its full form, so fixed-length deltas |

Lever 1 is the variant of the previous pages, and the one the campaigns' numbers speak to directly. Lever 2 is real and, in the long run, the bigger prize: once misses are cheap, memory becomes the binding ceiling, exactly what HiSparse reports on faster host links ([[#papers-hisparse]]). But every number it needs comes from lever 1's measurements, and its full form needs decoding inside attention's gather. A gentler form keeps evicted picks' deltas on the GPU in a second tier ([[#app-victim-tier]]), and a reference-tree dictionary, which already holds half its punnet's cherries, turns out to be lever 2 in disguise ([[#app-the-napkin]]).

::: figure fig-app-levers twoLevers
**Sequences per GPU for HiSparse and the two levers, on the Pin.** For each configuration, two bars: $\vNlink$ (blue), the sequences the 50 GB/s link can feed, and $\vNhbm$ (teal), the sequences that fit in 30 GB of GPU memory; the label on top is $\vN$, the lower of the two. *Lever 1:* a fraction $\vfD$ of misses move $\vrho\,\ve$. *Lever 2:* hot-cache slots hold deltas of $\vrho\,\ve$, spent either on a cache $1/\vrho$ times bigger at equal memory (misses then fall along HiSparse's curve, $\vm \propto \vB^{-1.08}$) or on $1/\vrho$ times more sequences. Miss rates at 4096 and 8192 slots are HiSparse's (13.4 %, 6.7 %). Simplifications: dictionary loads and dictionary memory are ignored, and lever 2 assumes every slot holds a delta. $\vrho$ and $\vfD$ are inputs; the default $\vrho = 0.65$ is close to the light measured point (0.665), [[#app-calculator]] has the full arithmetic.
:::

::: try
1. Defaults ($\vB = 4096$, $\vrho = 0.65$): lever 1 alone lifts the link ceiling past the memory ceiling, so $\vN$ rises from 109 only to 147, and now memory binds.
2. Switch lever 2 to "buys more sequences". Now both ceilings rise and $\vN$ reaches 168, about 1.5× HiSparse.
3. Switch to $\vB = 8192$. HiSparse is now memory-bound: lever 1 alone changes nothing, and lever 2 helps only when it buys more sequences.
4. Back at $\vB = 4096$, set $\vfD = 50$ %. Lever 1's gain shrinks from 1.35× to about 1.2×; lever 2 does not depend on $\vfD$ in this simple arithmetic.
:::

Why do the levers **compound**? Spend lever 2 on a bigger cache: slots of $\vrho\,\ve$ let the same memory hold $1/\vrho$ times more picks. HiSparse's miss curve falls roughly as $\vB^{-1.08}$, so that cuts the miss rate by about a factor $\vrho$. Each remaining miss is then a delta, $\vrho$ times smaller. Miss traffic falls by about $\vrho \times \vrho$:

$$
\frac{\text{miss traffic with both levers}}{\text{miss traffic of HiSparse}} \;\approx\; \underbrace{\vrho^{1.08}}_{\text{fewer misses}} \times \underbrace{\vrho}_{\text{smaller misses}} \;\approx\; \vrho^{2}, \qquad \vrho = 0.65 \;\Rightarrow\; 0.41,\ \text{about } 2.4\times \text{ less}.
$$ {#eq-app-compound}

::: aside reminder The miss-rate curve
Under LRU, the miss rate at every cache size is one curve $\vm(\vB)$; through HiSparse's points it is close to $\vm \propto \vB^{-1.08}$, "double the cache, halve the misses" ([[#landscape-reuse-curve]]).
:::

::: takeaway
- Lever 1 (cheaper misses) lifts the link ceiling; lever 2 (cheaper slots) lifts the memory ceiling or buys a bigger cache.
- Which lever helps depends on which ceiling binds; on the Pin both matter.
- Together they cut miss traffic by about $\vrho^2$, 2.4× at $\vrho = 0.65$.
:::

## The numbers, in order of appearance {#metrics}

The proposal produces numbers in this order, each feeding the next; the first exists, the others do not yet.

1. **Bits per element** of the lossless compressor, everything included: residuals, per-cherry tax, the dictionary's share. The scientific number, the [[mdl-ratio|MDL ratio]] of a scenario, produced by the harness and measured in Part VIII: 0.636 and 0.686 on the Bench's values at `stretch 4096`.
2. **$\vfD$ and dictionary loads per step per layer**, from replaying real pick traces through the resolve step of [[#app-shelf-and-two-misses]]. No pick trace exists for the Bench yet; the stand-in indexer and the replay are the first items of Part X ([[#plan-queries-and-picks]], [[#plan-hot-cache-replay]]).
3. **Sequences per GPU and GPU memory per sequence against HiSparse**, from the napkin ([[#app-the-napkin]]) and the calculator ([[#app-calculator]]), with a sweep over link speed and memory. The engineering number, and the headline.

Everything else, kernel throughput, latency per step, is downstream and belongs to a later phase ([[#plan-decoder-speed]]).

::: note metric The one sentence
kvblockdiff is better than HiSparse if, at equal hardware and identical outputs, $\min(\vNlink, \vNhbm)$ is higher, and the first two numbers say whether it can be.
:::

::: takeaway
- First bits per element (and $\vrho$), then $\vfD$ and loads, then sequences per GPU.
- Speed of kernels comes later; the headline is $\vN$ against HiSparse at identical outputs.
:::
