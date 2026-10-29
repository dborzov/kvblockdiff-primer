---
title: Three numbers and a deadline
nav: Three numbers and a deadline
group: The numbers
lede: From the frozen table, three numbers fall out with a pencil. Together they say how many requests one GPU can serve with HiSparse, and which wall stops it. A fourth number, a deadline, says how fast anything placed on the miss path must be.
cards:
  - q: In the reference setting with $\vB = 4096$, how many misses does one layer have per decode step?
    a: About 274
    wrong: ["About 2048", "About 13", "About 4096"]
    why: '$\vm \times \vk = 0.134 \times 2048 \approx 274$, each a scattered read of 640 bytes.'
    sec: three
  - q: At $\vB = 4096$, about how many requests can a 50 GB/s link feed on misses alone?
    a: About 110
    wrong: ["About 11", "About 1,100", "About 7"]
    why: '274 misses × 78 layers × 640 B ≈ 13.7 MB per step; over 30 ms that is 0.46 GB/s per request; 50 ÷ 0.46 ≈ 110.'
    sec: three
  - q: At $\vB = 8192$, which wall binds, and at about how many requests?
    a: GPU memory, at about 73 requests
    wrong: ["The link, at about 219 requests", "The link, at about 110 requests", "Neither — the GPU can serve unlimited requests"]
    why: 'Each request then holds 78 × 8192 × 640 B ≈ 409 MB of hot cache, and 30 GB ÷ 409 MB ≈ 73. The link could feed about 219.'
    sec: which-wall
  - q: How long is one layer's share of a 30 ms decode step in the reference setting?
    a: About 0.38 ms
    wrong: ["About 30 ms", "About 3.8 ms", "About 38 µs"]
    why: '30 ms ÷ 78 layers ≈ 0.38 ms; each layer''s misses must arrive within that slice.'
    sec: deadline
  - q: Why must a decoder on the miss path run at least ten times faster than the link?
    a: So that decoding a layer's misses takes a small fraction of the 0.38 ms in which the link is already busy
    wrong: ["Because the link is ten times faster than the GPU", "Because decoding must happen ten times per step", "Because the decoder reads every entry ten times"]
    why: 'With 110 requests the link needs the whole 0.38 ms for 19 MB of misses. At 500 GB/s, decoding them takes 39 µs, a tenth of the window.'
    sec: deadline
---

[[#landscape-reference-setting]] froze a table of numbers. This page multiplies a few of them together. Nothing here is new information; it is the same table, read for what it implies.

## Three numbers {#three}

**1. Misses per layer per step.** With $\vB = 4096$ slots, 13.4 % of the $\vk$ selections miss:

$$
\underbrace{\vm}_{0.134} \times \underbrace{\vk}_{2048} \approx 274 \ \text{misses per layer per step},
$$ {#eq-landscape-misses}

each one a scattered read of one raw [[entry]], $\ve = 640$ bytes.

**2. Link traffic per request.** Over all 78 layers, and per second:

$$
\underbrace{274 \times \vNL \times \ve}_{274 \times 78 \times 640\ \text{B} \;\approx\; 13.7\ \text{MB per step}}
\div \underbrace{\vtpot}_{30\ \text{ms}} \approx 0.46\ \text{GB/s per request}
\quad\Longrightarrow\quad
\frac{\vWlink}{0.46\ \text{GB/s}} = \frac{50}{0.46} \approx 110\ \text{requests}
$$ {#eq-landscape-link-bound}

So a 50 GB/s link can feed about **110 requests** per GPU on misses alone.

**3. GPU memory per request.** Every slot of every layer's hot cache holds one raw entry:

$$
\underbrace{\vB \times \vNL \times \ve}_{4096 \times 78 \times 640\ \text{B} \;\approx\; 204\ \text{MB}}
\quad\Longrightarrow\quad
\frac{\vMhbm}{204\ \text{MB}} = \frac{30\ \text{GB}}{204\ \text{MB}} \approx 146\ \text{requests}
$$ {#eq-landscape-memory-bound}

So 30 GB of GPU memory holds the hot caches of about **146 requests**. With $\vB = 8192$ each request needs 409 MB, and only about 73 fit.

::: aside reminder Bandwidth (II.23)
[[bandwidth|Bandwidth]] is how many bytes per second a link carries once data flows. Dividing the link's bandwidth by what one request needs per second gives how many requests it can serve side by side.
:::

::: takeaway
- At $\vB = 4096$: about 274 misses per layer per step, 13.7 MB of misses per request per step, 0.46 GB/s per request.
- The link can feed about 110 requests per GPU; the GPU memory can hold about 146 (73 at $\vB = 8192$).
:::

## Which wall binds {#which-wall}

A GPU can serve only as many requests as *both* limits allow, so the smaller one decides. The two limits move in opposite directions as the hot cache grows: more slots mean fewer misses (the link can feed more requests) but more memory per request (fewer fit).

::: figure fig-landscape-walls derivedNumbers wide
**Requests per GPU against hot-cache size, in the reference setting.** Top: the two chains of arithmetic for the chosen $\vB$, from the table of III.10 to a request count. Bottom: horizontal axis, hot-cache slots $\vB$ (log scale, base 2); vertical axis, requests per GPU. The rising line is what the link can feed ($\vWlink \times \vtpot$ divided by each request's miss bytes per step, with the miss rate from the power-law fit of [[#fig-landscape-reuse]]); the falling line is what the GPU memory can hold ($\vMhbm \div \vB \vNL \ve$). Dots: the link limit at HiSparse's three measured miss rates. The shaded area under both lines is what is reachable; its peak is the best HiSparse can do here. Move the slider or drag the knob to change $\vB$.
:::

::: try
1. Start at 4096 slots: the link binds, at about 110 requests.
2. Go to 8192: now the memory binds, at about 73.
3. Find the peak, where the two lines cross: about 4,800 slots and about 125 requests per GPU. No choice of $\vB$ does better in this setting.
:::

| slots $\vB$ | miss rate | link can feed | memory can hold | binding wall |
|---|---|---|---|---|
| 2048 | 30 % | 49 | 293 | link, 49 |
| 4096 | 13.4 % | 110 | 146 | link, 110 |
| 8192 | 6.7 % | 219 | 73 | memory, 73 |

Read the table together with the reuse curve of [[#landscape-reuse-curve]]. Inside HiSparse, the only dial is $\vB$, and it trades one wall against the other. Any proposal to do better must say which of the two walls it moves. [[#idea-two-levers]] gives the two counts names and asks exactly that.

::: theme bits-unit
Here bits turn into requests. An 8-bit entry of 640 numbers is 640 bytes; saving one bit per number saves 80 bytes on every miss and in every slot, cutting both prices by an eighth. A similarity that cannot be priced in bits per number cannot be priced in requests per GPU either.
:::

::: takeaway
- Requests per GPU = the smaller of what the link can feed and what the memory can hold.
- At 4096 slots the link binds (≈ 110); at 8192 the memory binds (≈ 73). The best balance in this setting is about 125 requests, near 4,800 slots (from the fitted curve).
:::

## The 0.38 ms window {#deadline}

One more number, so that "fast enough" has a meaning. The layers of a decode step run one after another, so each layer gets a slice of the step:

$$
\frac{\vtpot}{\vNL} = \frac{30\ \text{ms}}{78} \approx 0.38\ \text{ms per layer}
$$ {#eq-landscape-window}

In that window, with 110 requests in the batch, the miss path has to bring up $110 \times 274 \times 640\ \text{B} \approx 19$ MB. At 50 GB/s that takes 0.39 ms — the whole window. Of course it does: 110 was computed as the number of requests that fills the link. So the link is busy all the time, and fetches must overlap with computation (HiSparse does this).

Now suppose something extra sits on the miss path: a decoder that turns fetched bytes back into entries before attention reads them. It must not become the new bottleneck.

::: figure fig-landscape-deadline deadlineWindow
**One layer's 0.38 ms window, with 110 requests at 4096 slots.** Horizontal axis: time within the window, in microseconds. Top bar: the link moving about 19 MB of misses at 50 GB/s; it fills the window. Bottom bar: a decoder on the GPU processing the same 19 MB at the speed set by the slider (in GB/s). The read-out gives the decoder's time and its share of the window. Illustrative: it assumes the decoder handles as many bytes as the link delivers.
:::

::: try
1. At 50 GB/s the decoder needs the whole window too: the miss path would take twice as long.
2. At 500 GB/s it needs 39 µs, a tenth of the window. At 2,000 GB/s, about 10 µs.
:::

Hence a rule of thumb used for the rest of the site: **a decoder on the miss path should run at least ten times faster than the link**, to stay in the noise. GPU decoders of simple fixed-length codes run at hundreds of GB/s to a few TB/s ([[#papers-splitzip]] reports 565 GB/s to 2.2 TB/s), so decoding *compute* is not the worry. The bandwidth of the link, and the latency of many small scattered reads, are.

::: takeaway
- Each layer's slice of a decode step is about 0.38 ms, and at the link-bound batch the link is busy for all of it.
- A decoder on the miss path should be at least 10× faster than the link: 500 GB/s takes a tenth of the window.
:::
