---
title: The napkin for on fire
nav: The napkin
group: The design
lede: 'Half a punnet of 4096 cherries at 640 bytes is 1.38 MB per layer. That is what one on-fire stretch costs before its first delta saves a byte, and it also sits in GPU memory for as long as the stretch burns. This page states the economics as a problem of its own, writes its two budgets, and runs them on the measured curve: on the Pin the heavy point is bound by GPU memory, with every assumed input marked.'
cards:
  - q: What does the economics subproblem take in, and from where?
    a: 'The delta share and dictionary weight from a scenario (Part IV, measured in Part VIII); misses, where they land and $\vfD$ from a pick trace and a hot-cache replay (Part X); the decoder''s speed (Part X); the rig from a reference setting'
    wrong: ["Only the MDL ratio", "Only HiSparse's miss rates", "The price of a GPU-hour and nothing else"]
    why: The napkin is arithmetic over four other subproblems' outputs. Its result carries the grade of its least-trusted input, and today the traffic inputs are assumptions.
    sec: subproblem
  - q: Which term of $\vTstep$ costs link bytes even if no miss ever happens?
    a: 'The dictionary loads, $\vnload\,\vNL\,\vw\,\ve$'
    wrong: ['The δ-miss traffic, $\vm\vk\vNL\ve\,\vfD\vrho$', 'The raw-miss traffic, $\vm\vk\vNL\ve\,(1-\vfD)$', 'The hot cache, $\vNL\ve\vB$']
    why: Loads are paid whenever a dictionary is brought onto the shelf, whatever the misses do. They are the price of keeping the right almanacs at hand.
    sec: two-budgets
  - q: HiSparse is the special case of the two budgets with which settings?
    a: '$\vrho = 1$, $\vnload = 0$, $\vwres = 0$'
    wrong: ['$\vrho = 0$, $\vfD = 1$', '$\vB = 0$, $\vm = 1$', '$\vw = \vb$']
    why: No deltas (every miss moves a full pick), no dictionaries to load, none to keep. The formulas then give 109 sequences at B = 4096, link-bound.
    sec: two-budgets
  - q: 'With the reference-tree point (dictionary 0.525 of the punnet, deltas 0.112), after how many δ-misses in its stretch has an on-fire dictionary paid for its load?'
    a: 'About 2 420: the load is 2 150 cherries'' worth and each δ-miss saves 0.888 of a cherry'
    wrong: ["About 4 096, one per cherry of the punnet", "About 274, one step's misses", "About 120, the reads of one cold decode"]
    why: '$\vw/(1-\vrho) = 0.525 \times 4096 / 0.888 \approx 2\,420$. Prefetching the whole stretch raw would need 4 096 misses to pay back.'
    sec: break-even
  - q: On the Pin, with four reference-tree dictionaries on fire per layer stacked on top of the hot cache, what limits sequences per GPU, and at how many?
    a: GPU memory, at about 47 (HiSparse serves 109); the link would allow about 170
    wrong: ["The link, at about 170", "Nothing changes; still 109", "GPU memory, at about 147"]
    why: 'Each on-fire dictionary is 107 MB per sequence over 78 layers; four of them plus a 205 MB hot cache is 634 MB, and 30 GB holds 47.'
    sec: memory-binds
  - q: What does the lever-2 variant of the napkin change?
    a: 'The resident dictionary replaces the hot-cache slots of its stretch, so memory is about $\vNL\,\ve\,[(1-\vfD)\vB + \vnD\,\vw]$; with one stretch on fire per layer ($\vfD = 0.3$, $\vnload = 0.01$) that gives about 120 sequences, 1.1× HiSparse'
    wrong: ["It doubles the link bandwidth", "It makes every miss a δ-miss", "It removes the need to load the dictionary"]
    why: A reference tree already holds half the punnet's cherries, so the hot cache only needs slots for stretches on ice. The 120 also needs a slow load rate; at 0.05 loads per step the link holds it at 97.
    sec: memory-binds
---

One on-fire [[stretch]] at the reference-tree point costs $0.525 \times 4096 \times 640$ bytes, about 1.38 MB, per layer, and 107 MB per [[sequence]] once all 78 layers have set the same stretch on fire. Those bytes cross the link once and then sit in GPU memory for as long as the stretch burns. Everything on this page follows from that number, the measured deltas, and [[pin|the Pin]]'s rig. The traffic side ($\vfD$, $\vnload$, how many stretches burn) is assumed, and marked.

## The subproblem, stated {#subproblem}

Strip the napkin down the way Part IV stripped the scenario ([[#scenario-one-cherry-at-a-time]]), and it is a clean problem of its own.

**Why it exists.** The project's goal is one number: more concurrent sequences per GPU than HiSparse, at unchanged outputs ([[#app-two-levers]]). HiSparse pays two bills per sequence, link bytes per step and GPU bytes held. kvblockdiff changes both, and every change is a product of a byte count and a pick count. The economics is the arithmetic that adds the products up and says which bill binds.

**Its inputs**, each a named quantity with a home:

| input | symbol | comes from | grade today |
|---|---|---|---|
| delta share and dictionary weight | $\vrho$, $\vw$ | a scenario of Part IV, measured by the harness in Part VIII | measured on the Bench's values, several points of the curve |
| misses per layer per step | $\vm\,\vk$ | HiSparse's published miss rates; a hot-cache replay of a pick trace ([[#plan-queries-and-picks]], [[#plan-hot-cache-replay]]) | the Pin's trace only; none on the Bench |
| where misses land: $\vfD$, stretches on fire, loads | $\vfD$, $\vnD$, $\vnload$ | the same replay, with a shelf policy | **assumed** |
| the decoder keeps up | a condition | the decode-speed subproblem ([[#plan-decoder-speed]]) | **unmeasured** |
| the rig | $\vNL$, $\ve$, $\vk$, $\vB$, $\vtpot$, $\vWlink$, $\vMhbm$ | a reference setting ([[#landscape-reference-settings]]) | frozen |

**Its outputs.** Link bytes per sequence per step, $\vTstep$; GPU memory per sequence, $\vMreq$; the two ceilings and their minimum, $\vN = \min(\vNlink, \vNhbm)$; and, one page on, tokens per second and dollars per million tokens ([[#app-bits-to-dollars]]).

**What it assumes.** Fetches overlap with compute, as HiSparse's do; the decoder keeps up; a ratio measured on 512-byte cherries carries over to 640-byte latents; one trace of one LLM gives the miss rates. Each is marked where it is used.

**The rule.** The napkin is arithmetic, and arithmetic adds no trust. A result of the napkin carries the grade of its least-trusted input. Today that is the traffic column, so every "1.1×" on this page is an assumed number multiplied by a measured one, and reads as such.

::: note numbers What the replay measured for the traffic inputs
Since 2026-11-03 the traffic column has values measured on a stand-in LLM (Qwen 2.5 1.5B) and carried to the Pin (Part XI). Misses: 35 / 19 / 9.7 % at 1, 2 and 4 slots per pick, against HiSparse's 30 / 13.4 / 6.7 % ([[#picks-hot-cache]]). Four dictionaries of 4096 positions: $\vfD$ 0.36–0.54 at 0.10–0.13 loads per step, not 0.85 and 0.05 ([[#picks-shelf]]). Run with every design at its best hot-cache size, this napkin gives 56 sequences per GPU for four tree dictionaries at the assumed 0.85, 105–107 for the best tree shelf on the measured counts, and 126 for HiSparse with its hot cache resized to about 4750 slots ([[#picks-slot-price]]). The equations and figures on this page keep the assumed inputs.
:::

::: takeaway
- The economics is one subproblem among five: it takes $\vrho$ and $\vw$ from the scenario, the misses and $\vfD$ from a replay, the decoder's speed from its own test, the rig from a setting.
- It outputs $\vTstep$, $\vMreq$, $\vN$, then tokens per second and dollars.
- A napkin result is only as good as its least-trusted input; today that is the traffic, which is assumed.
:::

## Two budgets per sequence {#two-budgets}

Per sequence, per decode step, two quantities decide everything. The first is the bytes moved over the link, $\vTstep$. The second is the GPU memory the sequence occupies, $\vMreq$.

$$
\vTstep = \underbrace{\vm\,\vk\,\vNL\,\ve}_{\text{raw bytes of all misses}}\Big[\underbrace{\vfD\,\vrho}_{\text{δ-misses, shrunk}} + \underbrace{(1-\vfD)}_{\text{raw misses}}\Big] + \underbrace{\vnload\,\vNL\,\vw\,\ve}_{\text{dictionary loads}}
$$ {#eq-app-tstep}

$$
\vMreq = \vNL\,\ve\,\big(\underbrace{\vB}_{\text{hot cache}} + \underbrace{\vwres}_{\text{resident dictionaries}}\big)
$$ {#eq-app-mreq}

Read the first one left to right. $\vm\,\vk$ misses per layer per step, each a full pick of $\ve$ bytes, in $\vNL$ layers: what HiSparse moves. A share $\vfD$ of them are [[delta-miss|δ-misses]] and move only $\vrho\,\ve$; the rest are [[raw-miss|raw misses]] and move $\ve$. $\vnload$ is the number of dictionaries **loaded** onto the shelf per step and per layer; each load moves $\vw\,\ve$ bytes. The second one has one new letter. $\vwres$ is the **resident dictionary weight**: how many cherries' worth of dictionaries this sequence keeps on the GPU, per layer. It depends on the [[scope]] ([[#scenario-scope]]):

| scope | $\vwres$ | $\vnload$ |
|:--|--:|--:|
| sequence | $\vw$ | 0 (one load at admission) |
| stretch, all resident | $\lceil \vL/\vb \rceil\,\vw$ | 0 (loads at admission) |
| stretch, dictionary shelf | $\vnD\,\vw$ | what the replay measures |

The two budgets give the two ceilings of [[#app-two-levers]], with the rig's link $\vWlink$, step time $\vtpot$ and GPU memory $\vMhbm$:

$$
\vNlink = \frac{\vWlink\,\vtpot}{\vTstep}, \qquad \vNhbm = \frac{\vMhbm}{\vMreq}, \qquad \vN = \min(\vNlink, \vNhbm)
$$ {#eq-app-nbounds}

Set $\vrho = 1$, $\vnload = 0$ and $\vwres = 0$, no deltas, nothing to load, nothing to keep, and the formulas become HiSparse's own arithmetic ([[#landscape-derived-numbers]]). On the Pin at $\vB = 4096$ (miss rate $\vm = 13.4\,\%$): $\vTstep = 0.134 \times 2048 \times 78 \times 640\ \text{B} \approx 13.7$ MB, so $\vNlink = 1.5\ \text{GB} / 13.7\ \text{MB} \approx 109$; $\vMreq = 78 \times 640\ \text{B} \times 4096 \approx 205$ MB, so $\vNhbm = 30\ \text{GB} / 205\ \text{MB} \approx 147$. **109 sequences per GPU, limited by the link.**

::: theme every-tax
A dictionary adds two taxes to HiSparse's bill: link bytes for loading it ($\vnload\,\vNL\,\vw\,\ve$) and GPU bytes for keeping it ($\vNL\,\ve\,\vwres$). The deltas must save more than both, or the dictionary loses.
:::

::: takeaway
- $\vTstep$ = miss traffic (δ-misses shrunk by $\vrho$, raw misses not) + dictionary loads; $\vMreq$ = hot cache + resident dictionaries.
- Sequences per GPU are the smaller of $\vWlink\vtpot/\vTstep$ and $\vMhbm/\vMreq$.
- HiSparse is $\vrho = 1$, $\vnload = 0$, $\vwres = 0$: 109 at $\vB = 4096$, link-bound.
:::

## Break-even {#break-even}

Write the dictionary's size in cherries' worth and the delta's size as a share of a cherry, both read off the curve of [[#app-two-boring-corners]]. The dictionary share is $\vw/\vb$ and the delta share is $\vrho$; at the tree point they are 0.525 and 0.112.

$$
\vDsz \;=\; \vw\,\ve \;=\; \underbrace{\frac{\vw}{\vb}}_{0.525}\,\underbrace{\vb}_{4096}\,\underbrace{\ve}_{640\ \text{B}} \;\approx\; 1.38\ \text{MB per layer}, \qquad \times\,\vNL = 78 \;\approx\; 107\ \text{MB per sequence}.
$$ {#eq-app-load}

Each δ-miss in the stretch then saves $(1 - \vrho)\,\ve$ against a raw miss, so the load is repaid after

$$
\underbrace{\frac{\vw}{1 - \vrho}}_{\text{δ-misses to break even}} \;=\; \frac{0.525 \times 4096}{1 - 0.112} \;\approx\; 2\,420 \quad \text{δ-misses in that stretch},
$$ {#eq-app-breakeven-fire}

against $\vb = 4\,096$ misses for prefetching the whole stretch raw ([[#app-on-fire/fire-is-prefetch]]). This is the formula of [[#app-toy-trace]], with the toy weights replaced by measured ones.

How many steps is that? The Pin has $\vm\,\vk \approx 274$ misses per layer per step at $\vB = 4096$. If a share $\vfD$ of them land in $\vnD$ on-fire stretches, each on-fire stretch receives $\vfD\,\vm\,\vk/\vnD$ misses per step, and

$$
\text{steps to break even} \;=\; \frac{\vw}{1 - \vrho} \cdot \frac{\vnD}{\vfD\,\vm\,\vk}
\;=\; \begin{cases} 2\,420 \times 4 / (0.85 \times 274) \approx 42 & \vnD = 4,\ \vfD = 0.85 \\[2pt] 2\,420 \times 1 / (0.30 \times 274) \approx 30 & \vnD = 1,\ \vfD = 0.30 \end{cases}
$$ {#eq-app-steps}

The pairs of $\vnD$ and $\vfD$ are assumed. HiSparse's trace has 1 799 steps, so a stretch must stay on fire for a few per cent of a sequence's decode to pay for its dictionary, and longer to profit.

The same condition from the other side: loads must cost less than what the deltas save, per layer and per step,

$$
\underbrace{\vnload\,\vw}_{\text{cherries' worth loaded}} \;<\; \underbrace{\vfD\,(1-\vrho)\,\vm\,\vk}_{\text{cherries' worth saved by δ-misses}} .
$$ {#eq-app-load-breakeven}

At the tree point with $\vfD = 0.85$ the right side is $0.85 \times 0.888 \times 274 \approx 207$ cherries' worth; with $\vw = 2\,150$ that allows $\vnload < 0.096$, four dictionaries each living about 42 steps. At the light point ($\vw \approx 86$, $\vrho = 0.665$) the right side is 78 and the rule allows 0.9 loads per step per layer: a light dictionary can be reloaded almost at will, which is why that corner has no residency question.

::: figure fig-app-loads hwbLoads
**When do dictionary loads eat the gain?** Horizontal axis: dictionary loads per step per layer, $\vnload$ (log scale). Vertical axis: link bytes per step relative to HiSparse at $\vB = 4096$ (1 = break-even, red band = losing). Each line is one dictionary weight: furrow statistics ($\vw = 2$), a rank-16 KLT basis ($\vw = 32$), a 256-centroid codebook ($\vw = 256$) and a full basis ($\vw = 4096$, dashed); all start at the green floor $\vfD\vrho + 1 - \vfD$ (no loads) and rise by $\vnload\vw/(\vm\vk)$. Sliders: the **assumed** $\vrho$ and $\vfD$, and the resident count $\vnD$ (used in the table's last column). Drag the gold handle along the axis (arrow keys move it by √2, Shift by 10×); the table gives each weight's traffic there, its break-even load rate and how many steps each of the $\vnD$ dictionaries must then stay useful. The measured points sit between the lines: set $\vrho = 0.112$ and read the $\vw = 4096$ line as a stand-in for the tree's 2 150.
:::

::: try
1. Set $\vfD$ to 1 and $\vrho$ to 0.112, the tree's delta share with every miss a δ-miss. Even the full-basis line tolerates about 0.06 loads per step per layer.
2. Set $\vrho$ to 0.9. Every line starts just under 1, and even rare loads of a codebook push it over.
3. Raise $\vnD$ to 16 at the default settings. Each codebook must now live about 50 steps: more residents means more loads to pay for.
:::

::: takeaway
- One on-fire dictionary at the tree point is 1.38 MB per layer, 107 MB per sequence; it is repaid after about 2 420 δ-misses in its stretch, against 4 096 for a raw prefetch.
- With the Pin's 274 misses per layer per step, that is about 42 steps at $\vnD = 4$, $\vfD = 0.85$, or 30 at $\vnD = 1$, $\vfD = 0.3$ (assumed pairs).
- Loads must satisfy $\vnload\,\vw < \vfD(1-\vrho)\,\vm\,\vk$: under 0.096 per step per layer at the tree point, under 0.9 at the light point.
:::

## Memory binds, along the curve {#memory-binds}

Now the two budgets with the tree point and $\vnD$ stretches on fire per layer. The link side first:

$$
\vTstep \;=\; \underbrace{\vm\,\vk\,\vNL\,\ve}_{13.7\ \text{MB}}\,\big[\vfD\,\vrho + (1 - \vfD)\big] \;+\; \underbrace{\vnload\,\vNL\,\vw\,\ve}_{\text{loads}}
\;=\; 13.7 \times 0.245 \;+\; \vnload \times 78 \times 1.38\ \text{MB} \;\approx\; 3.4\ \text{MB} + \begin{cases} 5.4\ \text{MB} & \vnload = 0.05 \\ 1.1\ \text{MB} & \vnload = 0.01 \end{cases}
$$ {#eq-app-tstep-fire}

at $\vfD = 0.85$. The link would feed 170 to 340 sequences. The memory side:

$$
\vMreq \;=\; \vNL\,\ve\,\big(\underbrace{\vB}_{\text{hot cache}} + \underbrace{\vnD\,\vw}_{\text{on-fire dictionaries}}\big) \;=\; 205\ \text{MB} + \vnD \times 107\ \text{MB}
\;=\; \begin{cases} 634\ \text{MB} \;\to\; \vNhbm \approx 47 & \vnD = 4 \\ 312\ \text{MB} \;\to\; \vNhbm \approx 96 & \vnD = 1 \end{cases}
$$ {#eq-app-mreq-fire}

Both are under HiSparse's 109. One on-fire dictionary is 0.525 of a hot cache per layer, and the hot cache is the thing GPU memory on the Pin can hold only 147 of. **On the Pin, heavy on-fire dictionaries are bound by GPU memory, and no reduction of link traffic moves that bound.** The link side was never the problem; at $\vnD = 1$, $\vfD = 0.3$ and $\vnload = 0.01$ it allows 135 while memory allows 96.

::: pull
A dictionary that is half the punnet costs as much GPU memory as half a hot cache, and the hot cache is what GPU memory on the Pin already cannot afford more of.
:::

The way out is the one the all-resident corner pointed at. A reference tree already holds half the punnet's cherries verbatim, so while a stretch is on fire its hot-cache slots are redundant, and the hot cache only needs room for the misses of stretches on ice, about $(1 - \vfD)\,\vB$ slots. That is [[lever|lever 2]] ([[#app-two-levers]]), with the dictionary as the compressed slots:

$$
\vMreq \;\approx\; \vNL\,\ve\,\big[(1 - \vfD)\,\vB + \vnD\,\vw\big]
\;=\; \begin{cases} 78 \times 640\ \text{B} \times 5\,020 \approx 250\ \text{MB} \;\to\; \vN \approx 120,\ 1.1\times & \vnD = 1,\ \vfD = 0.3,\ \vnload = 0.01 \\ 78 \times 640\ \text{B} \times 9\,216 \approx 460\ \text{MB} \;\to\; \vN \approx 65 & \vnD = 4,\ \vfD = 0.85 \end{cases}
$$ {#eq-app-lever2}

The 120 assumes $\vnload = 0.01$, each dictionary living about 100 steps, three times its break-even; at the break-even rate of one load per 30 steps the link allows 110 and the gain is 1 %. The napkin drops the leaf deltas that would also have to be kept (0.11 of a cherry each on average) and treats $(1 - \vfD)\,\vB$ as enough room for the ice; both are approximations. With one stretch on fire per layer the design edges past HiSparse; with four, the dictionaries alone are more than two hot caches and memory binds again.

The curve is convex, so a lighter point trades saving per miss for a smaller load and a smaller footprint. The same arithmetic at each measured point, with $\vb = 4096$ and the Pin's cherries:

| dictionary share, delta share | dictionary per layer | saving per δ-miss | δ-misses to break even | steps at $\vnD = 4$, $\vfD = 0.85$ | four on fire, share of a hot cache |
|:--|--:|--:|--:|--:|--:|
| 0.02, 0.733 | 82 cherries, 0.05 MB | $0.27\,\ve$ | 310 | 5 | 8 % |
| 0.10, 0.610 | 410 cherries, 0.26 MB | $0.39\,\ve$ | 1 050 | 18 | 40 % |
| 0.25, 0.443 | 1 024 cherries, 0.66 MB | $0.56\,\ve$ | 1 840 | 32 | 100 % |
| 0.36, 0.325 | 1 475 cherries, 0.94 MB | $0.68\,\ve$ | 2 180 | 37 | 144 % |
| 0.525, 0.112 (tree) | 2 150 cherries, 1.38 MB | $0.89\,\ve$ | 2 420 | 42 | 210 % |

At the 10 % point a dictionary is a tenth of a hot cache and pays for itself after about 1 050 δ-misses, but four of them cost 40 % of a hot cache, which leaves memory at about 105 sequences, under HiSparse. One or two on fire per layer, catching 30–50 % of the misses (assumed), give about 120, the 1.1× the tree point reaches only with lever 2, and without a tree decoder. The 2 % point loads almost for free and saves almost nothing per miss; it is the tiny-dictionary corner, where everything can stay resident and fire is not needed.

::: figure fig-app-fire-napkin rngFireNapkin wide
**The on-fire calculator.** Inputs, left: a slider along the measured curve that snaps to its points and shows the dictionary share and delta share; $\vnD$, the stretches on fire per layer; $\vfD$, the share of misses that land in them; $\vnload$, loads per step per layer; a toggle for the lever-2 variant (the dictionary replaces its stretch's hot-cache slots); and the hot-cache size $\vB$ (2K, 4K or 8K), which sets the miss rate from HiSparse's curve. Outputs, as tiles: $\vTstep$ in MB, $\vMreq$ in MB, $\vNlink$, $\vNhbm$, $\vN$ and its ratio to HiSparse at the same $\vB$, and the break-even in δ-misses and in steps. Below, a table splits $\vTstep$ into δ-misses, raw misses and loads and $\vMreq$ into hot cache and dictionaries, for HiSparse, the chosen point and the same point with lever 2; the bars under it show each one's link-bound and memory-bound sequence counts side by side, the smaller marked. The rig comes from the reference-setting switch in the top bar; on the Bench the miss-side outputs read "not measured", since no indexer ran there ([[#landscape-reference-settings]]). Measured: the curve points, HiSparse's rig and miss rates. Assumed: $\vfD$, $\vnD$, $\vnload$, the lever-2 approximation, and the transfer of ratios measured on 256- and 512-byte cherries to 640-byte ones.
:::

::: try
1. Start at the tree point with $\vnD = 4$, $\vfD = 0.85$. Memory binds at 47. Drag $\vnload$ from 0.01 to 0.2: the link bound moves, $\vN$ does not.
2. Set $\vnD = 1$, $\vfD = 0.3$ and $\vnload = 0.01$ (each dictionary living about 100 steps), then switch lever 2 on. $\vN$ goes from 96 to about 120, past HiSparse's 109, and the table shows $\vMreq$ falling from 312 MB to 250 MB. Leave $\vnload$ at 0.05 and the link holds $\vN$ at 97 instead: a dictionary that is reloaded every 20 steps never pays.
3. Slide to the 10 % point with $\vnD = 2$, $\vfD = 0.5$. About 120 again, no lever 2 needed. Then $\vnD = 4$: back under HiSparse.
4. Choose $\vB = 8192$. HiSparse is memory-bound there, and every dictionary added only lowers the count, as in [[#app-victim-tier]].
:::

::: note numbers A machine with more GPU memory per link byte
The memory bound scales with $\vMhbm$; the link bound does not. Give the same rig 60 GB for orchards: HiSparse stays link-bound at 109, while one on-fire tree dictionary per layer ($\vfD = 0.3$, $\vnload = 0.01$) becomes link-bound at about 135, 1.24×. A what-if, since the Pin is frozen; the design pays sooner wherever GPU memory is cheap relative to link bytes.
:::

::: theme access-pattern
The reference tree reads about 120 cherries' worth per cold decode. That read pattern is harmless in GPU memory and ruinous over a link, which is why the dictionary must be resident, and residency is what the memory budget charges for. The access pattern of the decoder fixes which budget binds.
:::

::: aside source Receipts
- Curve points: C1, layer 3, head 0, coder 30 under a dictionary budget, ledger trials r1-t0030 / r1-t0036 / r1-t0031 / r1-t0037 (isolated-verified; `figures/data/range-curve.json`; the delta shares in the table are ratio minus the ledger's dictionary share); tree point env-t0096 (0.525 + 0.112); the rig and 274 misses: [[#landscape-reference-settings]], [[#landscape-derived-numbers]]; 1 799 steps: HiSparse §4.3.
- Formulas: `econ()` of `figures/homework-b.js`, with $\vwres = \vnD\,\vw$ for the stacked case and $\vB \to (1 - \vfD)\vB$ for lever 2; the figure recomputes every number live. Request counts are rounded; 2 420 is 2 422 with the rounded shares 0.525 and 0.112, 2 419 with the ledger's 0.5247 and 0.1116 (which the figure uses), and 30 steps is 29.4. The light point's load rule: $0.85 \times 0.335 \times 274 = 78$; $78 / 86 = 0.9$.
- The assumed pairs $(\vnD, \vfD)$ of (4, 0.85) and (1, 0.3) follow the toy of [[#hypotheses-heavy-stretches]], where one shelf caught a quarter of the misses and four caught three quarters.
:::

::: takeaway
- Tree point, stacked on the hot cache: $\vnD = 4$ → 47 sequences, $\vnD = 1$ → 96; both under HiSparse's 109. GPU memory binds; the link would allow 135–340.
- Lever 2, the dictionary replacing its stretch's hot-cache slots: about 120 at $\vnD = 1$, $\vfD = 0.3$, $\vnload = 0.01$ (1.1×); 65 at $\vnD = 4$.
- Lighter points load less and save less per miss; at 10 % one or two on fire reach about 1.1× without lever 2. Measured: the curve and the rig. Assumed: $\vfD$, $\vnD$, $\vnload$.
:::
