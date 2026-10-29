---
title: A what-if calculator
nav: What-if calculator
group: Scope and economics
lede: Every input of the cost model in one place, editable, with HiSparse alongside and eight designs recomputed live. The guesses are marked as guesses; replace them when the measurements arrive.
cards:
  - q: Which inputs of the what-if calculator are assumptions waiting to be measured?
    a: 'The delta ratio $\vrho$, the weight $\vw$, the δ-miss fraction $\vfD$ and the load rate $\vnload$'
    wrong: ['The context length $\vL$ and the selections $\vk$', 'The link speed and the step time', 'The number of layers $\vNL$']
    why: The rig and the miss rates come from HiSparse's deployment. The four dictionary numbers come from waves 1 and 2 of the plan; until then they are guesses.
    sec: calculator
  - q: In the reference setting with $\vB = 4096$, which constraint binds in every design that uses deltas?
    a: GPU memory
    wrong: ["The link", "The decoder's speed", "None — they are balanced"]
    why: Cheaper misses lift the link bound quickly. After that, the hot cache plus resident dictionaries decide how many requests fit.
    sec: scenarios
  - q: 'With a hot cache of 4096 raw slots, what is the most lever 1 (cheaper misses) can ever give in the reference setting?'
    a: About 146 requests per GPU, 1.34× HiSparse
    wrong: ["About 436, 4×", "Unlimited, as ρ approaches 0", "About 109, no gain at all"]
    why: The hot cache alone takes 205 MB per request and 30 GB holds 146 of them, however small the misses get.
    sec: scenarios
  - q: Per-block dictionaries of weight 256, all kept on the GPU ($\vb = 4096$), give about how many requests per GPU?
    a: About 57 — fewer than HiSparse's 109
    wrong: ["About 199", "About 146", "About 117"]
    why: 25 dictionaries of 256 entries per layer outweigh the hot cache itself, so memory per request more than doubles.
    sec: scenarios
  - q: 'What does an assumed $\vrho = 0.55$ mean in bits per element?'
    a: About 4.4 bits — roughly 2 bits better than solo coding, which is a lot to ask
    wrong: ["0.55 bit", "5.5 bits", "About 7 bits — just below raw"]
    why: '$\vbpe = 8\vrho = 4.4$. Saving two bits beyond solo coding needs a dictionary that explains about 94 % of the remaining variance.'
    sec: scenarios
---

The previous page could only show five designs, each with one set of numbers. Four of those numbers are guesses: the [[delta-ratio]] $\vrho$, the [[weight]] $\vw$, the [[delta-miss-fraction]] $\vfD$ and the load rate $\vnload$. The experiments in Part IX exist to replace them. Until then, the honest thing is a calculator in which every input can be changed, and in which the guesses are labelled as guesses.

## The calculator {#calculator}

The inputs come in three groups.

1. **The rig** — the [[reference-setting]]: context length, selections per layer, layers, entry size, step time, link speed, GPU memory for KV.
2. **The hot cache** — its size $\vB$ (2K, 4K or 8K slots) and HiSparse's measured miss rate at each size. The miss rates are editable too, in case another trace disagrees.
3. **The dictionary** — scope, $\vrho$, $\vw$, block size, resident count $\vnD$, $\vfD$, loads per step, and the decoder's speed. Assumed inputs carry a red "(assumed)".

The table compares the design with HiSparse at the same $\vB$, using the formulas of [[#homework-economics]].

::: figure fig-hwb-calculator hwbCalculator wide
**What-if calculator.** Edit any input; everything recomputes as you type. *Table:* bytes moved per request per step $\vTstep$ (MB, decimal), GPU memory per request $\vMreq$, the link-bound and memory-bound request counts and their minimum $\vN$, the resident dictionary weight $\vwres$, the one-off load at admission, and the decoder output the miss path needs (red when it exceeds the decoder speed you entered). Scopes: *global* is solo coding with one shared code; *request* loads one dictionary per request; *block, all resident* keeps all $\lceil \vL/\vb \rceil$ block dictionaries; *block, dictionary cache* keeps $\vnD$ and pays $\vnload$ loads per step. *Chart:* for eight designs (rows), link-bound (blue) and memory-bound (red) requests per GPU, recomputed from the rig and miss rates above; the black tick and the bold number are the smaller of the two; the dashed line is HiSparse at $\vB = 4096$; the bottom row is your design. Hover a row for details; "load a scenario" copies a design's dictionary settings into the inputs. Requests per GPU are rounded to whole requests. **Every $\vrho$, $\vw$, $\vfD$ and $\vnload$ is assumed.**
:::

::: try
1. Load "request scope", then lower $\vrho$ to 0.3. The link bound soars; requests per GPU stop at about 138. Memory is the wall.
2. Load "block scope … w = 256" and switch the scope to "dictionary cache". Then drag $\vfD$ down from 0.85 to 0.5 and watch the gain melt.
3. Set the link to 25 GB/s (a slower PCIe generation). Now the link binds HiSparse much harder, and every design that shrinks misses gains more.
4. Raise the GPU memory to 60 GB. Which designs gain, and which do not move?
:::

::: takeaway
- Every input is editable; the four dictionary numbers ($\vrho$, $\vw$, $\vfD$, $\vnload$) are assumptions until waves 1 and 2 measure them.
- The chart recomputes eight designs from the same rig, so a change to the rig shows its effect on every design at once.
:::

## What the scenarios say {#scenarios}

With the reference setting and the assumed dictionary numbers, the chart reads like this (requests per GPU, rounded):

| design | link | memory | $\vN$ |
|:--|--:|--:|--:|
| HiSparse, $\vB$ = 2K | 49 | 293 | 49 |
| HiSparse, $\vB$ = 4K | 109 | 146 | **109** |
| HiSparse, $\vB$ = 8K | 219 | 73 | 73 |
| solo, $\vrho$ = .88 | 124 | 146 | 124 |
| request, $\vw$ = 256, $\vrho$ = .75 | 146 | 138 | **138** |
| block, $\vw$ = 32, $\vrho$ = .65 | 168 | 123 | 123 |
| block, $\vw$ = 256, $\vrho$ = .55 | 199 | 57 | 57 |
| cache, $\vnD$ = 4, $\vw$ = 256 | 165 | 117 | 117 |

Five lessons, in order of how much they surprised us.

- **Memory binds as soon as misses get cheaper.** In every design with deltas the memory bound is the smaller one. And with 4096 raw slots per layer, memory can never hold more than 146 requests: **lever 1 alone is capped at about 1.34× in this setting.** Going further needs cheaper slots ([[lever]] 2) — see [[#idea-two-levers]].
- **Solo coding sets the bar.** A single global code with no dictionaries at all ($\vrho \approx 0.88$, the fixed-length [[solo]] rate) already gives 124. Light block dictionaries kept on the GPU give 123: they win on the link and lose it again in memory.
- **Weight and residency decide the outcome.** Light dictionaries are harmless anywhere. Heavy per-block dictionaries, all kept, cost more memory than the hot cache and *lose* (57).
- **A dictionary cache rescues heavy dictionaries — conditionally.** With 4 of 25 kept, 85 % of misses served as deltas and a load every 20 steps per layer, it reaches 117. Both numbers come from trace replay ([[#questions-framework-c]]); drag $\vfD$ down and the rescue fails.
- **The assumed $\vrho$ values are optimistic.** $\vrho = 0.55$ is 4.4 [[bpe]], about two bits better than solo coding; by the exchange rate that needs a dictionary explaining about 94 % of the remaining variance. $\vrho = 0.75$ (6 bits) is the more modest bet.

::: note warning A number that changed
The first draft's chart gave 58 for the heavy all-resident design, counting 24.4 blocks per request. A 100K-token request has 25 blocks of 4096 tokens — the last one partial, but its dictionary is whole — which gives 57. The lesson does not change.
:::

::: takeaway
- In the reference setting every delta design is memory-bound, and lever 1 alone tops out near 1.34× HiSparse.
- Solo coding (about 124) is the bar; a request-scope dictionary (about 138) clears it, light block dictionaries kept resident barely match it, heavy ones lose.
- What decides the outcome — $\vrho$, $\vw$, $\vfD$, $\vnload$ — is measurable, which is the point of Part IX.
:::
