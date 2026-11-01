---
title: The napkin for on fire
nav: The napkin for on fire
group: The design
lede: 'Half a block of 4,096 entries at 640 bytes is 1.38 MB per layer. That is what one on-fire block costs before its first delta saves a byte, and it also sits in GPU memory for as long as the block burns. This page runs the two budgets of VI.15 on the measured curve, and finds that on the Pin the heavy point is bound by GPU memory, with every assumed input marked.'
cards:
  - q: 'With the tree coder''s point (dictionary 0.525 of the block, deltas 0.112), after how many δ-misses in its block has an on-fire dictionary paid for its load?'
    a: 'About 2,420: the load is 2,150 entries'' worth and each δ-miss saves 0.888 of an entry'
    wrong: ["About 4,096, one per entry of the block", "About 274, one step's misses", "About 120, the reads of one cold decode"]
    why: '$\vw/(1-\vrho) = 0.525 \times 4096 / 0.888 \approx 2{,}420$. Prefetching the whole block raw would need 4,096 misses to pay back.'
    sec: break-even
  - q: 'Four blocks on fire per layer catch 85 % of the Pin''s 274 misses per layer per step (assumed). How long must each stay on fire to break even?'
    a: About 42 decode steps
    wrong: ["About 9 steps", "About 420 steps", "One step"]
    why: 'Each on-fire block receives $0.85 \times 274 / 4 \approx 58$ misses per step, and $2{,}420 / 58 \approx 42$. The same number falls out of VI.17''s load-rate condition.'
    sec: break-even
  - q: On the Pin, with four tree-coder dictionaries on fire per layer stacked on top of the hot cache, what limits requests per GPU, and at how many?
    a: GPU memory, at about 47 (HiSparse serves 109); the link would allow about 170
    wrong: ["The link, at about 170", "Nothing changes; still 109", "GPU memory, at about 147"]
    why: 'Each on-fire dictionary is 107 MB per request over 78 layers; four of them plus a 205 MB hot cache is 634 MB, and 30 GB holds 47.'
    sec: memory-binds
  - q: What does the lever-2 variant of the napkin change?
    a: The resident dictionary replaces the hot-cache slots of its block, so memory is about $\vNL\,\ve\,[(1-\vfD)\vB + \vnD\,\vw]$; with one block on fire per layer ($\vfD = 0.3$, $\vnload = 0.01$) that gives about 120 requests, 1.1× HiSparse
    wrong: ["It doubles the link bandwidth", "It makes every miss a δ-miss", "It removes the need to load the dictionary"]
    why: A tree coder's dictionary already holds half the block's entries, so the hot cache only needs slots for cold blocks. The 120 also needs a slow load rate; at 0.05 loads per step the link holds it at 97. With four on fire the saving is not enough and memory binds at about 65.
    sec: memory-binds
  - q: Which inputs of the napkin are measured, and which are assumed?
    a: 'Measured: the points on the curve (dictionary share, delta share) and HiSparse''s rig and miss rates. Assumed: $\vfD$, $\vnD$, $\vnload$, the popularity model, and carrying ratios measured on 256- and 512-byte entries over to 640-byte ones'
    wrong: ["Everything is measured", "Only the price per GPU-hour is assumed", "Only the block size is assumed"]
    why: Framework C is the measurement that would replace the assumed traffic numbers with replayed ones.
    sec: along-the-curve
---

One on-fire block at the tree coder's point costs $0.525 \times 4096 \times 640$ bytes, about 1.38 MB, per layer, and 107 MB per request once all 78 layers have set the same block on fire. Those bytes cross the link once and then sit in GPU memory for as long as the block burns. Everything on this page follows from that number, the measured deltas, and the Pin's rig. The traffic side ($\vfD$, $\vnload$, how many blocks burn) is assumed, and marked.

## Break-even {#break-even}

Write the dictionary's size in entries' worth and the delta's size as a share of an entry, both read off the curve of [[#range-two-boring-corners]]. The dictionary share is $\vw/\vb$ and the delta share is $\vrho$; at the tree point they are 0.525 and 0.112.

$$
\vDsz \;=\; \vw\,\ve \;=\; \underbrace{\frac{\vw}{\vb}}_{0.525}\,\underbrace{\vb}_{4096}\,\underbrace{\ve}_{640\ \text{B}} \;\approx\; 1.38\ \text{MB per layer}, \qquad \times\,\vNL = 78 \;\approx\; 107\ \text{MB per request}.
$$ {#eq-rng-load}

Each [[delta-miss|δ-miss]] in the block then saves $(1 - \vrho)\,\ve$ against a raw miss, so the load is repaid after

$$
\underbrace{\frac{\vw}{1 - \vrho}}_{\text{δ-misses to break even}} \;=\; \frac{0.525 \times 4096}{1 - 0.112} \;\approx\; 2{,}420 \quad \text{δ-misses in that block},
$$ {#eq-rng-breakeven}

against $\vb = 4{,}096$ misses for prefetching the whole block raw ([[#range-on-fire/fire-is-prefetch]]). This is the formula of [[#idea-heavy-blocks]], with the assumed weights replaced by measured ones.

How many steps is that? The Pin has $\vm\,\vk \approx 274$ misses per layer per step at $\vB = 4096$ ([[#landscape-derived-numbers]]). If a share $\vfD$ of them land in $\vnD$ on-fire blocks, each on-fire block receives $\vfD\,\vm\,\vk/\vnD$ misses per step, and

$$
\text{steps to break even} \;=\; \frac{\vw}{1 - \vrho} \cdot \frac{\vnD}{\vfD\,\vm\,\vk}
\;=\; \begin{cases} 2{,}420 \times 4 / (0.85 \times 274) \approx 42 & \vnD = 4,\ \vfD = 0.85 \\[2pt] 2{,}420 \times 1 / (0.30 \times 274) \approx 30 & \vnD = 1,\ \vfD = 0.30 \end{cases}
$$ {#eq-rng-steps}

The pairs of $\vnD$ and $\vfD$ are assumed, in line with the toy of [[#idea-heavy-blocks]], where one shelf caught a quarter of the misses and four caught three quarters. HiSparse's trace has 1,799 steps, so a block must stay on fire for a few per cent of a request's decode to pay for its dictionary, and longer to profit.

The load-rate condition of [[#homework-break-even]], $\vnload\,\vw < \vfD\,(1 - \vrho)\,\vm\,\vk$, says the same thing from the other side. Its right side is now $0.85 \times 0.888 \times 274 \approx 207$ entries' worth per layer per step; with $\vw = 2{,}150$ that allows $\vnload < 0.096$, four dictionaries each living about 42 steps.

::: takeaway
- One on-fire dictionary at the tree point is 1.38 MB per layer, 107 MB per request; it is repaid after about 2,420 δ-misses in its block, against 4,096 for a raw prefetch.
- With the Pin's 274 misses per layer per step, that is about 42 steps at $\vnD = 4$, $\vfD = 0.85$, or 30 at $\vnD = 1$, $\vfD = 0.3$ (assumed pairs).
- The same number comes out of VI.17's load-rate condition: under 0.096 loads per step per layer.
:::

## Memory binds {#memory-binds}

::: aside reminder The two budgets (VI.15)
Per request, per step, $\vTstep$ is the bytes over the link (misses plus loads) and $\vMreq$ the GPU memory held (hot cache plus resident dictionaries). $\vNlink = \vWlink\,\vtpot/\vTstep$, $\vNhbm = \vMhbm/\vMreq$, and $\vN = \min(\vNlink, \vNhbm)$. HiSparse at $\vB = 4096$: 13.7 MB, 205 MB, 109 requests, link-bound ([[#homework-economics]]).
:::

Now the two budgets with the tree point and $\vnD$ blocks on fire per layer. The link side first:

$$
\vTstep \;=\; \underbrace{\vm\,\vk\,\vNL\,\ve}_{13.7\ \text{MB}}\,\big[\vfD\,\vrho + (1 - \vfD)\big] \;+\; \underbrace{\vnload\,\vNL\,\vw\,\ve}_{\text{loads}}
\;=\; 13.7 \times 0.245 \;+\; \vnload \times 78 \times 1.38\ \text{MB} \;\approx\; 3.4\ \text{MB} + \begin{cases} 5.4\ \text{MB} & \vnload = 0.05 \\ 1.1\ \text{MB} & \vnload = 0.01 \end{cases}
$$ {#eq-rng-tstep}

at $\vfD = 0.85$. The link would feed 170 to 340 requests. The memory side:

$$
\vMreq \;=\; \vNL\,\ve\,\big(\underbrace{\vB}_{\text{hot cache}} + \underbrace{\vnD\,\vw}_{\text{on-fire dictionaries}}\big) \;=\; 205\ \text{MB} + \vnD \times 107\ \text{MB}
\;=\; \begin{cases} 634\ \text{MB} \;\to\; \vNhbm \approx 47 & \vnD = 4 \\ 312\ \text{MB} \;\to\; \vNhbm \approx 96 & \vnD = 1 \end{cases}
$$ {#eq-rng-mreq}

Both are under HiSparse's 109. One on-fire dictionary is 0.525 of a hot cache per layer, and the hot cache is the thing GPU memory on the Pin can hold only 147 of. **On the Pin, heavy on-fire dictionaries are bound by GPU memory, and no reduction of link traffic moves that bound.** The link side was never the problem; at $\vnD = 1$, $\vfD = 0.3$ and $\vnload = 0.01$ it allows 135 while memory allows 96.

::: pull
A dictionary that is half the block costs as much GPU memory as half a hot cache, and the hot cache is what GPU memory on the Pin already cannot afford more of.
:::

The way out is the one the all-resident corner pointed at. A tree coder's dictionary already holds half the block's entries verbatim, so while a block is on fire its hot-cache slots are redundant, and the hot cache only needs room for the misses of cold blocks, about $(1 - \vfD)\,\vB$ slots. That is the primer's [[lever|lever 2]] ([[#idea-two-levers]]), with the dictionary as the compressed slots:

$$
\vMreq \;\approx\; \vNL\,\ve\,\big[(1 - \vfD)\,\vB + \vnD\,\vw\big]
\;=\; \begin{cases} 78 \times 640\ \text{B} \times 5{,}020 \approx 250\ \text{MB} \;\to\; \vN \approx 120,\ 1.1\times & \vnD = 1,\ \vfD = 0.3,\ \vnload = 0.01 \\ 78 \times 640\ \text{B} \times 9{,}216 \approx 460\ \text{MB} \;\to\; \vN \approx 65 & \vnD = 4,\ \vfD = 0.85 \end{cases}
$$ {#eq-rng-lever2}

The 120 assumes $\vnload = 0.01$, each dictionary living about 100 steps, three times its break-even; at the break-even rate of one load per 30 steps the link allows 110 and the gain is 1 %.

The napkin drops the leaf deltas that would also have to be kept (0.11 of an entry each on average) and treats $(1 - \vfD)\,\vB$ as enough cold-block room; both are approximations. With one block on fire per layer the design edges past HiSparse; with four, the dictionaries alone are more than two hot caches and memory binds again. On the Pin the mechanism pays with few blocks on fire and the dictionary standing in for its block's slots, and in that regime it is a compressed history on the GPU as much as a cheaper miss path.

::: note numbers A machine with more GPU memory per link byte
The memory bound scales with $\vMhbm$; the link bound does not. Give the same rig 60 GB for KV: HiSparse stays link-bound at 109, while one on-fire tree dictionary per layer ($\vfD = 0.3$, $\vnload = 0.01$) becomes link-bound at about 135, 1.24×. A what-if, since the Pin is frozen; the design pays sooner wherever GPU memory is cheap relative to link bytes.
:::

::: theme access-pattern
The tree coder reads about 120 entries' worth per cold decode. That read pattern is harmless in GPU memory and ruinous over a link, which is why the dictionary must be resident, and residency is what the memory budget charges for. The access pattern of the decoder fixes which budget binds.
:::

::: takeaway
- Tree point, stacked on the hot cache: $\vnD = 4$ → 47 requests, $\vnD = 1$ → 96; both under HiSparse's 109. GPU memory binds; the link would allow 135–340.
- Lever 2, the dictionary replacing its block's hot-cache slots: about 120 at $\vnD = 1$, $\vfD = 0.3$, $\vnload = 0.01$ (1.1×); 65 at $\vnD = 4$.
- On the Pin the heavy point pays only with few blocks on fire and lever 2; with more GPU memory per link byte it pays sooner.
:::

## Along the curve {#along-the-curve}

The curve is convex, so a lighter point trades saving per miss for a smaller load and a smaller footprint. The same arithmetic at each measured point, with $\vb = 4096$ and the Pin's entries:

| dictionary share, delta share | dictionary per layer | saving per δ-miss | δ-misses to break even | steps at $\vnD = 4$, $\vfD = 0.85$ | four on fire, share of a hot cache |
|:--|--:|--:|--:|--:|--:|
| 0.02, 0.733 | 82 entries, 0.05 MB | $0.27\,\ve$ | 310 | 5 | 8 % |
| 0.10, 0.610 | 410 entries, 0.26 MB | $0.39\,\ve$ | 1,050 | 18 | 40 % |
| 0.25, 0.443 | 1,024 entries, 0.66 MB | $0.56\,\ve$ | 1,840 | 32 | 100 % |
| 0.36, 0.325 | 1,475 entries, 0.94 MB | $0.68\,\ve$ | 2,180 | 37 | 144 % |
| 0.525, 0.112 (tree) | 2,150 entries, 1.38 MB | $0.89\,\ve$ | 2,420 | 42 | 210 % |

At the 10 % point a dictionary is a tenth of a hot cache and pays for itself after about 1,050 δ-misses, but four of them cost 40 % of a hot cache, which leaves memory at about 105 requests, under HiSparse. One or two on fire per layer, catching 30–50 % of the misses (assumed), give about 120, the 1.1× the tree point reaches only with lever 2, and without a tree decoder. The 2 % point loads almost for free and saves almost nothing per miss; it is the per-entry corner, where everything can stay resident and fire is not needed.

::: figure fig-rng-fire-napkin rngFireNapkin wide
**The on-fire calculator.** Inputs, left: a slider along the measured curve that snaps to its points and shows the dictionary share and delta share; $\vnD$, the blocks on fire per layer; $\vfD$, the share of misses that land in them; $\vnload$, loads per step per layer; a toggle for the lever-2 variant (the dictionary replaces its block's hot-cache slots); and the hot-cache size $\vB$ (2K, 4K or 8K), which sets the miss rate from HiSparse's curve. Outputs, as tiles: $\vTstep$ in MB, $\vMreq$ in MB, $\vNlink$, $\vNhbm$, $\vN$ and its ratio to HiSparse at the same $\vB$, and the break-even in δ-misses and in steps. Below, a table splits $\vTstep$ into δ-misses, raw misses and loads and $\vMreq$ into hot cache and dictionaries, for HiSparse, the chosen point and the same point with lever 2; the bars under it show each one's link-bound and memory-bound request counts side by side, the smaller marked. The rig comes from the reference-setting switch in the top bar; on the Bench the miss-side outputs read "not measured on the Bench", since no selector was run there ([[#range-two-settings]]). Measured: the curve points, HiSparse's rig and miss rates. Assumed: $\vfD$, $\vnD$, $\vnload$, the lever-2 approximation, and the transfer of ratios measured on 256- and 512-byte entries to 640-byte ones.
:::

::: try
1. Start at the tree point with $\vnD = 4$, $\vfD = 0.85$. Memory binds at 47. Drag $\vnload$ from 0.01 to 0.2: the link bound moves, $\vN$ does not.
2. Set $\vnD = 1$, $\vfD = 0.3$ and $\vnload = 0.01$ (each dictionary living about 100 steps), then switch lever 2 on. $\vN$ goes from 96 to about 120, past HiSparse's 109, and the table shows $\vMreq$ falling from 312 MB to 250 MB. Leave $\vnload$ at 0.05 and the link holds $\vN$ at 97 instead: a dictionary that is reloaded every 20 steps never pays.
3. Slide to the 10 % point with $\vnD = 2$, $\vfD = 0.5$. About 120 again, no lever 2 needed. Then $\vnD = 4$: back under HiSparse.
4. Choose $\vB = 8192$. HiSparse is memory-bound there, and every dictionary added only lowers the count, as in [[#missed-victim-tier]].
:::

::: note warning What is measured and what is assumed
**Measured:** the curve points, entropy-coded, on the Bench's data (the C1 points on the values of layer 3, head 0, 256-byte entries; the tree point on one layer's entries, 512 bytes), and the Pin's rig and miss rates, from HiSparse's one trace. **Assumed:** $\vfD$, $\vnD$ and $\vnload$, which the popularity model would produce and nobody has replayed; the lever-2 approximation; and that ratios carry over to 640-byte entries. [[#questions-framework-c]] would measure the first group from the selection traces HiSparse already replays. [[#range-from-bits-to-dollars]] turns $\vN$ into tokens per second and a price.
:::

::: theme every-tax
The on-fire dictionary charges two taxes, the load on the link and the residency in GPU memory, and on the Pin the second is the one that bites. A lighter point pays less of both and saves less per miss; the table above is the whole trade.
:::

::: aside source Receipts
- Curve points: C1, layer 3, head 0, coder 30 under a dictionary budget, ledger trials r1-t0030 / r1-t0036 / r1-t0031 / r1-t0037 (isolated-verified; `figures/data/range-curve.json` via `analysis/range_extract.py`; the delta shares in the table are ratio minus the ledger's dictionary share); tree point env-t0096 (0.525 + 0.112); the rig and 274 misses: [[#landscape-reference-setting]], [[#landscape-derived-numbers]]; 1,799 steps: HiSparse §4.3.
- Formulas: `econ()` of `figures/homework-b.js` ([[#homework-economics]]), with $\vwres = \vnD\,\vw$ for the stacked case and $\vB \to (1 - \vfD)\vB$ for lever 2; the figure recomputes every number live. Request counts are rounded; 2,420 is 2,422 with the rounded shares 0.525 and 0.112, 2,419 with the ledger's 0.5247 and 0.1116 (which the figure uses), and 30 steps is 29.4.
- The assumed pairs $(\vnD, \vfD)$ of (4, 0.85) and (1, 0.3) follow the toy of [[#idea-heavy-blocks]] and the assumed 0.85 of [[#homework-economics]].
:::

::: takeaway
- Lighter points load less and save less per miss; at 10 % a dictionary is a tenth of a hot cache and pays after about 1,050 δ-misses, but four of them still leave memory under HiSparse.
- One or two on fire per layer reach about 1.1× at the 10 % point without lever 2, and at the tree point only with it.
- Measured: the curve and the Pin's rig. Assumed: $\vfD$, $\vnD$, $\vnload$ and the popularity model. Framework C would measure them.
:::
