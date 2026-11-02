---
title: A what-if calculator
nav: What-if calculator
group: The design
lede: Every input of the napkin in one place, editable, with HiSparse alongside and eight designs recomputed live. The guesses are marked as guesses; the measured points of Part VIII can be typed in, and the traffic numbers wait for a replay.
cards:
  - q: Which inputs of the what-if calculator are assumptions waiting to be measured?
    a: 'The δ-miss fraction $\vfD$ and the load rate $\vnload$ always; the delta share $\vrho$ and the weight $\vw$ unless you type a measured point in'
    wrong: ['The context length $\vL$ and the picks $\vk$', 'The link speed and the step time', 'The number of layers $\vNL$']
    why: The rig and the miss rates come from HiSparse's deployment. The two traffic numbers come from a replay of the hot cache that has not been run; the two byte numbers are measured on the Bench for several points of the curve.
    sec: calculator
  - q: On the Pin with $\vB = 4096$, which constraint binds in every design that uses deltas?
    a: GPU memory
    wrong: ["The link", "The decoder's speed", "None, they are balanced"]
    why: Cheaper misses lift the link bound quickly. After that, the hot cache plus resident dictionaries decide how many sequences fit.
    sec: scenarios
  - q: 'With a hot cache of 4096 raw slots, what is the most lever 1 (cheaper misses) can ever give on the Pin?'
    a: About 147 sequences per GPU, 1.35× HiSparse
    wrong: ["About 436, 4×", "Unlimited, as ρ approaches 0", "About 109, no gain at all"]
    why: The hot cache alone takes 205 MB per sequence and 30 GB holds about 147 of them, however small the misses get.
    sec: scenarios
  - q: Per-punnet dictionaries of weight 256, all kept on the GPU ($\vb = 4096$), give about how many sequences per GPU?
    a: About 57, fewer than HiSparse's 109
    wrong: ["About 199", "About 147", "About 117"]
    why: 25 dictionaries of 256 cherries' worth per layer outweigh the hot cache itself, so memory per sequence more than doubles.
    sec: scenarios
  - q: 'What does an assumed $\vrho = 0.55$ mean in bits per element, and how does it compare with what was measured?'
    a: 'About 4.4 bits; the campaigns'' light dictionary reached 5.3 bits of delta ($\vrho = 0.665$) and only the reference tree, at the price of half a punnet resident, went lower'
    wrong: ["0.55 bit, better than anything measured", "5.5 bits, exactly the light point", "About 7 bits, just below raw"]
    why: '$\vbpe = 8\vrho = 4.4$. A delta that small with a dictionary of 256 cherries'' worth is not on the measured curve; the curve buys small deltas only with heavy dictionaries.'
    sec: scenarios
---

The napkin of the previous page could only show a few designs, each with one set of numbers. The honest thing is a calculator in which every input can be changed, in which the guesses are labelled as guesses, and in which the measured points of Part VIII can be typed in next to them. The experiments of Part X exist to replace the remaining guesses.

## The calculator {#calculator}

The inputs come in three groups.

1. **The rig**, the reference setting ([[#landscape-reference-settings]]): context length, picks per layer, layers, cherry bytes, step time, link speed, GPU memory for orchards.
2. **The hot cache**: its size $\vB$ (2K, 4K or 8K slots) and HiSparse's measured miss rate at each size. The miss rates are editable too, in case another trace disagrees.
3. **The dictionary**: scope, $\vrho$, $\vw$, stretch length, resident count $\vnD$, $\vfD$, loads per step, and the decoder's speed. Assumed inputs carry a red "(assumed)".

The table compares the design with HiSparse at the same $\vB$, using the two budgets of [[#app-the-napkin]]. First the budgets taken apart, term by term, for five designs:

::: figure fig-app-anatomy hwbAnatomy
**The two budgets, term by term.** Choose a design. Top: $\vTstep$ and $\vMreq$ with the Pin's numbers substituted. Middle: the same as bars, the chosen design under HiSparse at $\vB = 4096$ (megabytes, decimal; hover a part of a bar for its size). Link bytes split into δ-misses (blue), raw misses (red) and dictionary loads (gold); GPU memory into the hot cache (teal) and resident dictionaries (purple). Bottom: the link-bound and memory-bound sequence counts and their minimum. All designs use $\vB = 4096$; counts are rounded to whole sequences. **Assumed, not measured:** $\vrho$ (0.75 for sequence scope, 0.65 for light and 0.55 for heavy punnet dictionaries), $\vw$, $\vfD = 0.85$ and $\vnload = 0.05$ for the shelf.
:::

::: figure fig-app-calculator hwbCalculator wide
**What-if calculator.** Edit any input; everything recomputes as you type. *Table:* bytes moved per sequence per step $\vTstep$ (MB, decimal), GPU memory per sequence $\vMreq$, the link-bound and memory-bound sequence counts and their minimum $\vN$, the resident dictionary weight $\vwres$, the one-off load at admission, and the decoder output the miss path needs (red when it exceeds the decoder speed you entered). Scopes: *global* is solo coding with one shared code; *sequence* loads one dictionary per sequence; *stretch, all resident* keeps all $\lceil \vL/\vb \rceil$ punnet dictionaries; *stretch, dictionary shelf* keeps $\vnD$ and pays $\vnload$ loads per step. *Chart:* for eight designs (rows), link-bound (blue) and memory-bound (red) sequences per GPU, recomputed from the rig and miss rates above; the black tick and the bold number are the smaller of the two; the dashed line is HiSparse at $\vB = 4096$; the bottom row is your design. Hover a row for details; "load a scenario" copies a design's dictionary settings into the inputs. Sequences per GPU are rounded. **Every preset $\vrho$, $\vw$, $\vfD$ and $\vnload$ is assumed;** type $\vrho = 0.665$, $\vw = 86$ or $\vrho = 0.112$, $\vw = 2150$ for the measured points.
:::

::: try
1. Load "sequence scope", then lower $\vrho$ to 0.3. The link bound soars; sequences per GPU stop at about 138. Memory is the wall.
2. Load "stretch scope, all resident, w = 256", then type the light measured point ($\vw = 86$, $\vrho = 0.665$): 96, under HiSparse. Now the tree point ($\vw = 2150$, $\vrho = 0.112$): about 10.
3. Switch the scope to "dictionary shelf" at the tree point with $\vnD = 4$, $\vfD = 0.85$, $\vnload = 0.05$: about 47. Drag $\vfD$ down to 0.5 and watch the link bound melt while memory holds the answer.
4. Set the link to 25 GB/s (a slower PCIe generation). Now the link binds HiSparse much harder, and every design that shrinks misses gains more.
5. Raise the GPU memory to 60 GB. Which designs gain, and which do not move?
:::

::: takeaway
- Every input is editable; the traffic numbers ($\vfD$, $\vnload$) are assumptions until a replay measures them, and the preset byte numbers ($\vrho$, $\vw$) are assumptions until you type a measured point in.
- The chart recomputes eight designs from the same rig, so a change to the rig shows its effect on every design at once.
:::

## What the designs say {#scenarios}

With the Pin's rig and the calculator's *assumed* dictionary numbers, the chart reads like this (sequences per GPU, rounded):

| design | link | memory | $\vN$ |
|:--|--:|--:|--:|
| HiSparse, $\vB$ = 2K | 49 | 293 | 49 |
| HiSparse, $\vB$ = 4K | 109 | 147 | **109** |
| HiSparse, $\vB$ = 8K | 219 | 73 | 73 |
| solo, a global code, $\vrho$ = 0.88 (assumed) | 124 | 147 | 124 |
| sequence scope, $\vw$ = 256, $\vrho$ = 0.75 (assumed) | 146 | 138 | **138** |
| stretch scope, all resident, $\vw$ = 32, $\vrho$ = 0.65 (assumed) | 168 | 123 | 123 |
| stretch scope, all resident, $\vw$ = 256, $\vrho$ = 0.55 (assumed) | 199 | 57 | 57 |
| dictionary shelf, $\vnD$ = 4, $\vw$ = 256, $\vrho$ = 0.55 (assumed) | 165 | 117 | 117 |

And with the measured points typed in (the Bench's values at `stretch 4096`, carried over to 640-byte cherries):

| design at a measured point | link | memory | $\vN$ |
|:--|--:|--:|--:|
| light, all resident, $\vw$ = 86, $\vrho$ = 0.665 | 165 | 96 | 96 |
| reference tree, all resident, $\vw$ = 2150, $\vrho$ = 0.112 | 977 | 10 | 10 |
| reference tree on a shelf, $\vnD$ = 4, $\vfD$ = 0.85, $\vnload$ = 0.05 (assumed traffic) | 170 | 47 | 47 |
| reference tree on a shelf, $\vnD$ = 1, $\vfD$ = 0.3, $\vnload$ = 0.01, lever 2 | 135 | 120 | 120 |

Five lessons, in order of how much they surprised us.

- **Memory binds as soon as misses get cheaper.** In every design with deltas the memory bound is the smaller one. And with 4096 raw slots per layer, memory can never hold more than about 147 sequences: **lever 1 alone is capped at about 1.35× on the Pin.** Going further needs cheaper slots ([[lever]] 2, [[#app-two-levers]]).
- **Solo coding sets the bar.** A single global code with no dictionaries at all ($\vrho \approx 0.88$, a fixed-length [[solo]] rate) already gives 124. Light punnet dictionaries kept on the GPU give 123 at the assumed $\vrho = 0.65$ and 96 at the measured 0.665 with their measured weight: they win on the link and lose it again in memory.
- **Weight and residency decide the outcome.** Heavy per-punnet dictionaries, all kept, cost more memory than the hot cache and *lose* (57 at the assumed point, 10 at the tree point).
- **A shelf rescues heavy dictionaries, conditionally.** With 4 of 25 kept, 85 % of misses served as deltas and a load every 20 steps per layer, the assumed point reaches 117; the tree point, 47, because its dictionary is eight times heavier. Both $\vfD$ and $\vnload$ come from a replay that has not been run ([[#plan-hot-cache-replay]]); drag $\vfD$ down and the rescue fails.
- **The assumed $\vrho$ values are optimistic.** $\vrho = 0.55$ is 4.4 [[bpe|bits per element]], about two bits better than solo coding; the measured curve buys deltas that small only with a dictionary of a quarter of the punnet or more ([[#app-two-boring-corners]]). $\vrho = 0.665$ with a light dictionary is what was measured.

::: aside source Receipts
Assumed-point rows: the `econ()` formulas of `figures/homework-b.js` with the Pin's rig (78 layers, $\vk = 2048$, $\ve = 640$ B, 30 ms, 50 GB/s, 30 GB; miss rates 0.30 / 0.134 / 0.067). Measured-point rows: the same formulas with $\vw = 0.021 \times 4096 = 86$, $\vrho = 0.665$ (compressor 129, r25-t0003) and $\vw = 0.525 \times 4096 = 2150$, $\vrho = 0.112$ (compressor 121, env-t0096); the lever-2 row is the napkin's ([[#app-the-napkin]]). Arithmetic for the light row: $\vTstep = 13.7 \times 0.665 = 9.1$ MB → 165; $\vMreq = 78 \times 640 \times (4096 + 25 \times 86) = 312$ MB → 96.
:::

::: note warning A number that changed
The first draft's chart gave 58 for the heavy all-resident design, counting 24.4 stretches per sequence. A 100K-token sequence has 25 stretches of 4096 tokens, the last one partial, but its dictionary is whole, which gives 57. The lesson does not change.
:::

::: takeaway
- On the Pin every delta design is memory-bound, and lever 1 alone tops out near 1.35× HiSparse.
- Solo coding (about 124) is the bar; a sequence-scope dictionary (about 138, assumed) clears it; light punnet dictionaries kept resident fall short (96 at the measured point); heavy ones lose.
- What decides the outcome, $\vrho$ and $\vw$ (measured for several points), $\vfD$ and $\vnload$ (not yet), is measurable, which is the point of Part X.
:::
