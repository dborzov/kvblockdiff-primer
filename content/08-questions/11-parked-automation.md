---
title: "Parked: automated search and compressibility as a probe"
nav: "Parked · search and probes"
lede: Two ideas that are less about KV caches than about the measuring machine itself. Could it run unattended and find better coders? And could its by-products say something about what each layer of a model stores?
cards:
  - q: What makes an automated search over coders possible at all?
    a: The measuring program has one interface, one score and fixed controls, so any proposed coder can be scored without a human
    wrong: ["A large language model that knows the answer", "A faster GPU", "A bigger calibration set"]
    why: A proposer writes a coder, the program scores it and draws its curve, a reviewer reads the curve and proposes the next one.
    sec: search
  - q: An automated search reports a coder whose block-local gain survives shuffling. What is the most likely explanation?
    a: A bug or a leak — block-local gains must vanish when neighbours are no longer neighbours
    wrong: ["A genuine discovery", "The coder found upstairs similarity", "The shuffle was too weak to matter"]
    why: That is exactly the cheat the shuffle control exists to catch.
    sec: search
  - q: What would the per-layer distance curves tell us as a by-product?
    a: Which layers hold slowly varying state and which hold token-by-token detail
    wrong: ["Which layers can be removed from the model", "The accuracy of each layer", "Which heads the indexer prefers"]
    why: A layer whose bits fade over thousands of tokens carries slow state; one whose bits vanish after a few tokens carries detail. Interpretability data, for free.
    sec: probe
---

The two questions on this page are about the machine, not the cache. Framework B ([[#questions-framework-b]]) built a measuring program strict enough that two coders can be compared without argument. Strict machines invite two thoughts: let it run by itself, and look at what falls out of it on the side.

## Can a machine find the roofline? {#search}

::: note question Can an automated search find the roofline?
The program has one interface, one score and four controls. So the search over coders can run as a loop.

1. A **proposer** — a person, or a language-model agent that reads papers — writes a new coder: fit a dictionary, encode, decode.
2. The **program** scores it: every byte charged, every control run, one cloud of points on the [[curve]].
3. A **reviewer** reads the curve and the per-channel diagnostics, and proposes the next variant.

- **Why it is interesting.** The space of coders is large: codebooks, rotations, rate allocations, residual coders and their combinations. A loop explores it without fatigue.
- **The real question.** Does such a loop find anything the napkin did not predict? For bell-shaped data, [[rate-distortion]] bounds say where the [[roofline]] cannot go; a search can only discover structure the bounds do not assume, such as clusters.
- **Our odds: a long shot as a discovery tool, a sure win as a test bench.** Even if it finds nothing new, it checks the napkin's predictions at a scale no person would.
:::

An automated search is a very diligent student who will find every loophole in the grading. The controls of the measuring program ([[#plan-controls]]) are the grading rules that close them.

| how a search could cheat | what it would look like | what catches it |
|---|---|---|
| fit a "global" dictionary on the data it is scored on | a global dictionary that looks as good as per-block ones | calibration data kept apart from evaluation data |
| forget to count dictionary bytes or per-entry side information | huge codebooks that look free | one accounting rule: every byte is serialised and counted |
| rebuild entries almost, but not exactly | gains from silently lossy coding | a real round trip, checked bit for bit |
| leak information between neighbours through a bug | a block-local gain that survives shuffling | the [[shuffle-control]] |
| tune itself to a quirk of the test data | shapes that come out wrong on data with a known answer | synthetic data with known structure |

::: theme controls
Here the controls stop being a scientist's good manners and become the referee of a game. A human might cheat by accident; an optimiser will cheat by design, because cheating scores well. Every row of the table is a loophole an optimiser would find.
:::

::: takeaway
- The fixed interface and score let a proposer–program–reviewer loop search over coders by itself.
- Its interesting outcome is a coder the napkin did not predict; the likely outcome is a confirmed napkin.
- The controls are what make an automated search trustworthy: each closes a loophole an optimiser would exploit.
:::

## Is compressibility a probe of what layers store? {#probe}

::: note question Do the per-layer distance curves say what each layer keeps?
Framework A produces one curve of bits against distance per layer, for keys and values. Read side by side, they form a map.

- **Why it is interesting.** A layer whose bits fade over thousands of tokens holds slowly varying state — the topic, the speaker, the document. A layer whose bits vanish after a few tokens holds token-by-token detail. That is interpretability data, obtained for free.
- **What it could change.** It may say where in the stack a cache should spend its GPU memory, and which layers deserve long blocks, short blocks, or no dictionary at all.
- **Our odds: the map comes for free; reading it is the risk.** "Slow in bits" is not the same as "carries meaning". The curves describe the statistics of numbers, and a story about what the model *thinks* would need other evidence.
:::

The figure shows what such a map could look like, under three invented patterns. None of them is a prediction.

::: figure fig-questions-probe qProbe
**What a per-layer probe could look like** (schematic: three invented patterns, no data). Rows are layers (0 at the bottom, 11 at the top); columns are token distances $\vgap$ from 1 to 32K on a log scale. The colour of a cell is the number of bits per element a neighbour at that distance saves, from none (pale) to about one bit (deep). Switch between three made-up worlds: memory that lasts longer in deeper layers, all layers alike, and a few layers that carry slow state while the rest carry detail. Hover or tap a cell for its value; the readout says how we would read the pattern.
:::

::: try
1. In "graded with depth", follow one column upwards: at $\vgap$ = 256 the bottom layers are pale and the top ones deep. A cache designer would give the deep layers long blocks.
2. Switch to "a few layers". Three bright rows stand out: those are where dictionaries — and memory — would go.
3. Switch to "all layers alike". The map is boring, and that is an answer too: one block size for the whole stack.
:::

::: takeaway
- The per-layer distance curves of framework A double as a map of slow state versus detail across layers.
- It could steer where a cache spends memory and which block sizes to use per layer.
- It describes number statistics, not meaning; reading it as interpretability needs care.
:::
