---
title: Two break-even conditions
nav: Two break-even conditions
group: Scope and economics
lede: A dictionary is a bet — paid for when it is loaded, repaid a little on every miss it serves. Two things turn it into a losing bet — loading too often, and decoding too slowly.
cards:
  - q: One load of a dictionary of weight $\vw$ moves as many bytes over the link as…
    a: '$\vw$ raw misses'
    wrong: ["One raw miss", "One δ-miss", '$\vb$ raw misses']
    why: 'A dictionary is $\vw\,\ve$ bytes; a raw miss is $\ve$ bytes.'
    sec: loads
  - q: 'With assumed $\vfD = 0.85$ and $\vrho = 0.65$ at $\vB = 4096$, how many entries'' worth of loads per layer per step can a dictionary cache afford before it loses to HiSparse?'
    a: About 82 — not the 274 of the rule of thumb
    wrong: ["About 274", "About 2048", "About 1"]
    why: 'Loads must cost less than what δ-misses save: $\vfD(1-\vrho)\vm\vk = 0.85 \times 0.35 \times 274 \approx 82$.'
    sec: loads
  - q: 'With 4 resident dictionaries of weight 256 (same assumptions), how long must each one stay useful just to break even?'
    a: At least about 13 decode steps
    wrong: ["At least 1 step", "At least about 1000 steps", "Any time at all — loads are free"]
    why: 'Break-even allows about 82/256 ≈ 0.32 loads per step per layer; 4 dictionaries replaced at that rate live about 4/0.32 ≈ 13 steps.'
    sec: loads
  - q: At 110 requests per GPU in the reference setting, how fast must the miss-path decoder emit raw-equivalent bytes?
    a: About 50 GB/s per GPU
    wrong: ["About 0.5 GB/s", "About 500 GB/s", "About 2.2 TB/s"]
    why: '110 requests × 13.7 MB per step ÷ 30 ms ≈ 50 GB/s — exactly what the link would have carried raw.'
    sec: decode
  - q: Why does the store want fixed-length deltas rather than an rANS-style entropy coder?
    a: Fixed-length GPU decoders run at 0.5–2 TB/s, an order of magnitude above the need; entropy decoders are borderline
    wrong: ["Fixed-length codes always compress better", "rANS cannot be lossless", "Entropy coders need a dictionary per element"]
    why: SplitZip's fixed-length decoder reaches 565 GB/s (E5M2) and 2.2 TB/s (BF16) on an H200; rANS-style decoders run at tens to a few hundred GB/s.
    sec: decode
---

A dictionary on the GPU is a bet. You pay up front to bring it over the link. It pays you back a few hundred bytes at a time, on every miss in its block that arrives as a delta instead of a raw entry. The cost model of [[#homework-economics]] already contains both sides of the bet; this page pulls out the two conditions under which it is a losing one.

## Loads must be rare {#loads}

::: aside reminder δ-misses and the dictionary cache (IV.4)
A miss whose block has its dictionary on the GPU is a [[delta-miss|δ-miss]] and moves $\vrho\,\ve$ bytes; otherwise it is a [[raw-miss|raw miss]] and moves $\ve$. The [[dictionary-cache]] keeps $\vnD$ dictionaries per layer; $\vfD$ is the share of misses that are δ-misses.
:::

One load of a dictionary of weight $\vw$ moves $\vw\,\ve$ bytes — as much as $\vw$ raw misses. In the [[reference-setting]] at $\vB = 4096$ a layer sees $\vm\,\vk = 0.134 \times 2048 \approx 274$ misses per step. The first draft's rule of thumb was therefore $\vnload\,\vw \ll 274$.

That rule is generous. Loads do not compete with *all* miss traffic, only with what the deltas *save*:

$$
\underbrace{\vnload\,\vw}_{\text{entries' worth loaded}} \;<\; \underbrace{\vfD\,(1-\vrho)\,\vm\,\vk}_{\text{entries' worth saved by δ-misses}}
\qquad \text{per layer, per step}
$$ {#eq-hwb-load-breakeven}

With the **assumed** $\vfD = 0.85$ and $\vrho = 0.65$, the right side is $0.85 \times 0.35 \times 274 \approx 82$ entries' worth — about a third of the rule of thumb.

- **$\vw = 256$:** at most $82/256 \approx 0.32$ loads per step per layer. With 4 dictionaries resident, each must stay useful for at least about 13 steps just to break even, and for about 125 steps to keep loads below a tenth of the savings.
- **$\vw = 32$:** up to 2.6 loads per step per layer. Only a cache that thrashes could lose.
- **$\vw = 2$ ([[loc]]):** loads never matter.

Whether blocks stay busy that long is a property of the selections, not of the bytes: it is the lifetime of [[heavy-block|heavy blocks]], which question C measures ([[#questions-framework-c]]).

::: figure fig-hwb-loads hwbLoads
**When do dictionary loads eat the gain?** Horizontal axis: dictionary loads per step per layer, $\vnload$ (log scale). Vertical axis: link bytes per step relative to HiSparse at $\vB = 4096$ (1 = break-even, red band = losing). Each line is one dictionary weight: loc ($\vw = 2$), rank-16 KLT ($\vw = 32$), 256-centroid VQ ($\vw = 256$) and a full basis ($\vw = 4096$, dashed); all start at the green floor $\vfD\vrho + 1 - \vfD$ (no loads) and rise by $\vnload\vw/(\vm\vk)$. Sliders: the **assumed** $\vrho$ and $\vfD$, and the resident count $\vnD$ (used in the table's last column). Drag the gold handle along the axis (arrow keys move it by √2, Shift by 10×); the table gives each weight's traffic there, its break-even load rate and how many steps each of the $\vnD$ dictionaries must then stay useful.
:::

::: try
1. Set $\vfD$ to 1 and $\vrho$ to 0.3 — a very good dictionary. The 256-weight codebook now tolerates about 0.75 loads per step per layer, more than twice as many as before.
2. Set $\vrho$ to 0.9. Every line starts just under 1, and even rare loads of a codebook push it over.
3. Raise $\vnD$ to 16 at the default settings. Each codebook must now live about 50 steps: more residents means more loads to pay for.
:::

::: theme side-info
The receiver must actually *have* the almanac, and getting it there is not free. Block scope pays this price over and over; the break-even says how often it can afford to.
:::

::: takeaway
- A load costs $\vw$ raw misses. It must cost less than what δ-misses save: $\vnload\vw < \vfD(1-\vrho)\vm\vk$, about 82 entries' worth per layer per step with the assumed numbers.
- Light dictionaries can be loaded freely; a 256-weight codebook must stay useful for tens of steps.
:::

## The decoder must keep up {#decode}

Every δ-miss is decoded on the GPU before attention can use it, and the decoder must emit the raw entries at the rate the link would have carried them. Per GPU, that is $\vN \cdot \vfD \cdot \vm\,\vk\,\vNL\,\ve / \vtpot$ bytes per second. At $\vN = 110$ with every miss a δ-miss:

$$
110 \times \frac{13.7\ \text{MB}}{30\ \text{ms}} \approx 50\ \text{GB/s}
$$

— the speed of the link itself, as it must be. [[#landscape-derived-numbers]] gave the rule of thumb: the decoder should run at least **10× faster** than that, so that it eats no more than a tenth of the 0.38 ms each layer has per step. That means about 500 GB/s.

| decoder | output | source |
|:--|--:|:--|
| SplitZip, fixed-length, BF16 | 2.2 TB/s | H200 |
| SplitZip, fixed-length, FP8 E5M2 | 565 GB/s | H200 |
| DFloat11, Huffman | 468 GB/s | via SplitZip's table |
| rANS-style decoders | tens to a few hundred GB/s | rough |

Fixed-length decoders clear the bar by an order of magnitude; entropy decoders are borderline. That is why the [[fixed-length-rate]] is the engineering number. Lever 2 in its full form is harsher still: it decodes *every* read, not only misses, which needs $110 \times 2048 \times 78 \times 640\text{ B} / 30\text{ ms} \approx 370$ GB/s.

::: figure fig-hwb-decode hwbDecode
**Is the decoder fast enough?** Horizontal axis: decoder output in GB/s (log scale). Bars: reported throughputs — fixed-length decoders (teal) and entropy-coded ones (gold; the rANS range is dashed because it is only a rough range). Black line: what the miss path needs, $\vN\,\vm\,\vk\,\vNL\,\ve/\vtpot$ with every miss a δ-miss; the gold band up to ten times that is "too slow for comfort". Red dashed line: lever 2, where every one of the $\vk$ reads per layer decodes. Controls: requests per GPU $\vN$ and the hot-cache size $\vB$ (which sets the miss rate). Hover a bar for its headroom.
:::

::: note warning Bulk numbers, scattered reads
Every throughput in the table was measured on long, contiguous streams. The miss path gathers about 274 scattered 640-byte deltas per layer per step, which is a different and probably slower access pattern. Nobody has measured a random-access delta decoder yet; it is part of the later engineering phase.
:::

::: takeaway
- The miss path needs about 50 GB/s of decoder output per GPU at 110 requests; with 10× headroom, about 500 GB/s.
- Fixed-length decoders (0.5–2 TB/s) have that headroom; entropy decoders are borderline; lever 2 needs about 370 GB/s and so fixed-length deltas.
:::
