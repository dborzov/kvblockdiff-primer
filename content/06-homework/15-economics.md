---
title: The economics, written out
nav: The economics
group: Scope and economics
lede: How many requests can one GPU serve once dictionaries are in the picture? Two budgets — bytes over the link per step, bytes of GPU memory per request — with every cost written out, and HiSparse falling out as the special case.
cards:
  - q: Which term of $\vTstep$ costs link bytes even if no miss ever happens?
    a: 'The dictionary loads, $\vnload\,\vNL\,\vw\,\ve$'
    wrong: ['The δ-miss traffic, $\vm\vk\vNL\ve\,\vfD\vrho$', 'The raw-miss traffic, $\vm\vk\vNL\ve\,(1-\vfD)$', 'The hot cache, $\vNL\ve\vB$']
    why: Loads are paid whenever a dictionary is brought onto the GPU, whatever the misses do. They are the price of keeping the right almanacs at hand.
    sec: two-budgets
  - q: 'What is $\vwres$ for block scope with a dictionary cache of $\vnD$ dictionaries, each of weight $\vw$?'
    a: '$\vnD\,\vw$ entries per layer'
    wrong: ['$\lceil \vL/\vb \rceil\,\vw$', '$\vw$', '0']
    why: 'Only the $\vnD$ cached dictionaries sit on the GPU. Keeping all of them would cost $\lceil \vL/\vb \rceil\,\vw$; request scope costs $\vw$.'
    sec: two-budgets
  - q: HiSparse is the special case of the cost model with which settings?
    a: '$\vrho = 1$, $\vnload = 0$, $\vwres = 0$'
    wrong: ['$\vrho = 0$, $\vfD = 1$', '$\vB = 0$, $\vm = 1$', '$\vw = \vb$']
    why: No deltas (every miss moves a full entry), no dictionaries to load, none to keep.
    sec: special-case
  - q: In the reference setting with $\vB = 4096$, HiSparse serves about 109 requests per GPU. What limits it?
    a: The link; GPU memory would allow about 147
    wrong: ["GPU memory; the link would allow about 147", "The decoder's speed", "The number of layers"]
    why: '13.7 MB per step per request against 1.5 GB per 30 ms step gives 109; 205 MB per request against 30 GB gives 147.'
    sec: special-case
  - q: A request-scope dictionary with $\vw = 256$ and an assumed $\vrho = 0.75$ lifts the reference setting from 109 to about…
    a: 138 requests per GPU, now limited by GPU memory
    wrong: ["146, still limited by the link", "436, limited by nothing", "73, limited by the decoder"]
    why: 'The link now allows 146, but each request needs 217 MB, and 30 GB holds 138. The binding constraint has flipped.'
    sec: special-case
---

A GPU decoding with sparse attention is a busy shop with two scarce things: the wire to host memory and its own fast memory. Every request it serves takes a slice of both. [[#idea-two-levers]] turned that into one headline number, the requests per GPU $\vN$. This page writes out the two slices with every cost a dictionary adds, so the number can be computed for any design.

## Two budgets per request {#two-budgets}

::: aside reminder Requests per GPU (IV.15)
$\vN = \min(\vNlink, \vNhbm)$: as many requests as the link can feed, or as many as fit in GPU memory, whichever is smaller. A design is better than [[hisparse]] only if it raises the smaller one.
:::

Per request, per decode step, two quantities decide everything. The first is the bytes moved over the link, $\vTstep$. The second is the GPU memory the request occupies, $\vMreq$.

$$
\vTstep = \underbrace{\vm\,\vk\,\vNL\,\ve}_{\text{raw bytes of all misses}}\Big[\underbrace{\vfD\,\vrho}_{\text{δ-misses, shrunk}} + \underbrace{(1-\vfD)}_{\text{raw misses}}\Big] + \underbrace{\vnload\,\vNL\,\vw\,\ve}_{\text{dictionary loads}}
$$ {#eq-hwb-tstep}

$$
\vMreq = \vNL\,\ve\,\big(\underbrace{\vB}_{\text{hot cache}} + \underbrace{\vwres}_{\text{resident dictionaries}}\big)
$$ {#eq-hwb-mreq}

Read the first one left to right.

- $\vm\,\vk$ misses per layer per step, each a full [[entry]] of $\ve$ bytes, in $\vNL$ layers: what HiSparse moves.
- A share $\vfD$ of them are [[delta-miss|δ-misses]], which move only $\vrho\,\ve$ bytes. The rest are [[raw-miss|raw misses]] and move $\ve$.
- $\vnload$ is the number of dictionaries **loaded** onto the GPU per step and per layer. Each load moves $\vw\,\ve$ bytes.

The second one has one new term. $\vwres$ is the **resident dictionary weight**: how many entries' worth of dictionaries this request keeps on the GPU, per layer. It depends on the scope ([[#homework-scope]]):

| scope | $\vwres$ | $\vnload$ |
|:--|--:|--:|
| request | $\vw$ | 0 (one load at admission) |
| block, all resident | $\lceil \vL/\vb \rceil\,\vw$ | 0 (loads at admission) |
| block, dictionary cache | $\vnD\,\vw$ | measured by trace replay |

The two budgets then give the two bounds, with the [[reference-setting]]'s link $\vWlink$, step time $\vtpot$ and GPU memory $\vMhbm$:

$$
\vNlink = \frac{\vWlink\,\vtpot}{\vTstep}, \qquad \vNhbm = \frac{\vMhbm}{\vMreq}, \qquad \vN = \min(\vNlink, \vNhbm)
$$ {#eq-hwb-nbounds}

::: theme every-tax
A dictionary adds two taxes to HiSparse's bill: link bytes for loading it ($\vnload\,\vNL\,\vw\,\ve$) and GPU bytes for keeping it ($\vNL\,\ve\,\vwres$). The deltas must save more than both, or the dictionary loses.
:::

::: takeaway
- $\vTstep$ = miss traffic (δ-misses shrunk by $\vrho$, raw misses not) + dictionary loads.
- $\vMreq$ = hot cache + resident dictionaries, $\vNL\,\ve\,(\vB + \vwres)$.
- Requests per GPU are the smaller of $\vWlink\vtpot/\vTstep$ and $\vMhbm/\vMreq$.
:::

## HiSparse as the special case {#special-case}

Set $\vrho = 1$, $\vnload = 0$ and $\vwres = 0$ — no deltas, nothing to load, nothing to keep — and the formulas become HiSparse's own arithmetic from [[#landscape-derived-numbers]]. With the reference setting at $\vB = 4096$ (miss rate $\vm = 13.4\,\%$):

- $\vTstep = 0.134 \times 2048 \times 78 \times 640\text{ B} \approx 13.7$ MB, so $\vNlink = 1.5\text{ GB} / 13.7\text{ MB} \approx 109$.
- $\vMreq = 78 \times 640\text{ B} \times 4096 \approx 205$ MB, so $\vNhbm = 30\text{ GB} / 205\text{ MB} \approx 147$.
- **109 requests per GPU, limited by the link.** At $\vB = 8192$ the misses halve (link allows 219) but the memory doubles: **73, limited by memory.**

Now add a request-scope dictionary with $\vw = 256$ and an **assumed** $\vrho = 0.75$. Each request loads it once, at admission (12.8 MB), so $\vnload = 0$ and $\vwres = 256$.

- $\vTstep = 13.7 \times 0.75 \approx 10.3$ MB, so the link now allows 146.
- $\vMreq = 78 \times 640\text{ B} \times (4096 + 256) \approx 217$ MB, so memory allows 138.
- **138 requests per GPU, 1.26× HiSparse — and now memory binds.**

That flip is the general pattern. Cheaper misses ([[lever]] 1) raise the link bound until GPU memory becomes the wall; past that point, only lighter or fewer resident dictionaries, or cheaper slots (lever 2), help. The figure lets you take the formula apart for five designs.

::: figure fig-hwb-anatomy hwbAnatomy
**The two budgets, term by term.** Choose a design. Top: $\vTstep$ and $\vMreq$ with the reference setting's numbers substituted. Middle: the same as bars, the chosen design under HiSparse at $\vB = 4096$ (megabytes, decimal; hover a segment for its size). Link bytes split into δ-misses (blue), raw misses (red) and dictionary loads (gold); GPU memory into the hot cache (teal) and resident dictionaries (purple). Bottom: the link-bound and memory-bound request counts and their minimum. All designs use $\vB = 4096$; counts are rounded to whole requests. **Assumed, not measured:** $\vrho$ (0.75 for request scope, 0.65 for light and 0.55 for heavy block dictionaries), $\vw$, $\vfD = 0.85$ and $\vnload = 0.05$ for the dictionary cache.
:::

::: try
1. Pick "block, w = 256". The link bar shrinks most of all — yet memory per request more than doubles, and requests per GPU fall below HiSparse.
2. Pick "dictionary cache". Only 4 of the 25 dictionaries stay; the loads are a thin gold sliver, and requests per GPU climb back above HiSparse.
3. Pick "request scope" and compare the two KPI tiles: which wall would you push next?
:::

::: note warning What this model leaves out
It counts bytes, not time: it assumes fetches overlap with compute (HiSparse does this) and that the decoder keeps up ([[#homework-break-even]]). It takes HiSparse's miss rates from a single 100K-token trace. It ignores the one-off load at admission, memory fragmentation and prefill. Good enough to rank designs; not a performance prediction.
:::

::: takeaway
- HiSparse is the case $\vrho = 1$, $\vnload = 0$, $\vwres = 0$: 109 requests per GPU at $\vB = 4096$ (link-bound), 73 at $\vB = 8192$ (memory-bound).
- A request-scope dictionary ($\vw = 256$, assumed $\vrho = 0.75$) gives about 138, and flips the limit to memory.
- Heavy dictionaries kept resident can lose; the next page lets you try every combination.
:::
