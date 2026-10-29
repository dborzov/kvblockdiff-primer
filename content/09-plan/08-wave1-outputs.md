---
title: What wave 1 produces
nav: What wave 1 produces
group: 'Wave 1: one weekend'
lede: At the end of the weekend there should be two figures, one table and a page of diagnostics on the desk — and one number fed forward to the cost model. Here is the pipeline that makes them, and the schedule.
cards:
  - q: Which wave-1 output answers Q1 most directly?
    a: Figure A — bits saved against token distance, with its shuffled twin
    wrong: ["Table 1 of scope gains", "Figure B, the compressibility curve", "The BF16 column"]
    why: The distance curve measures fallen-apple similarity itself; Table 1 and Figure B measure what coders make of it.
    sec: outputs
  - q: What are the cells of Table 1?
    a: Entropy rate and fixed-length rate of each dictionary type at global, request and best block scope
    wrong: ["Miss rates at three hot-cache sizes", "Compression ratios of zstd and gzip", "Run times of each coder"]
    why: 'From those cells come the two scope gains $\vgainreq$ and $\vgainblk$ for the cheapest type that achieves them — the inputs of the decision rule.'
    sec: outputs
  - q: Which wave-1 number feeds the cost model of wave 2?
    a: 'The delta ratio $\vrho$ (and delta size) of the fixed-length coder at the best affordable block size and dictionary weight'
    wrong: ["The entropy rate of solo coding", "The KLT bound", "The order-0 entropy of BF16"]
    why: The fixed-length rate is the size of a real delta, so $\vrho \approx \vbpe/8$ of that coder is what a miss would move.
    sec: outputs
  - q: How long is "one weekend" really, in the source's own schedule?
    a: Three days of work, plus an evening of dumping before
    wrong: ["Exactly two days", "One afternoon", "A month"]
    why: Day 1 builds and runs 1a, Day 2 runs 1b with VQ overnight, Day 3 reads and decides. Call it a long weekend.
    sec: timeline
  - q: Why do the four controls sit in front of experiment 1b in the pipeline, not after it?
    a: Because a control run after the results are known invites explaining a failure away
    wrong: ["Because the controls need the 1b results as input", "Because the controls run on the GPU", "Because 1b is too slow to repeat"]
    why: The controls must pass on synthetic data before real data enters the harness; they gate the measurement.
    sec: pipeline
---

A good weekend project ends with something on the desk you can point at. For wave 1 that is a short list: two figures, one table, a page of diagnostics, and one number handed forward to [[#plan-cost-model-and-paper]]. This page shows how the data flows into them, and when.

## The pipeline {#pipeline}

The dump happens once, on the GPU. Everything to its right is numpy on a CPU, and nothing enters the harness before the four controls have passed. Hover a card to see what feeds it; click it to go to its page.

```graph
id: plan-wave1-pipeline
columns: ["Dump (GPU, one evening)", "Step 0: 8-bit codes", "Measure (CPU)", "Outputs"]
nodes:
  - {id: dump, col: 1, row: 1, title: "K before RoPE, and V", text: "6 full-attention layers, 10 sequences × 32K tokens, BF16.", link: plan-data, term: proxy-model}
  - {id: qry, col: 1, row: 3, title: "Queries of the last 4K tokens", text: "Kept for wave 2.", link: plan-wave2-indexer, term: indexer}
  - {id: e4, col: 2, row: 1, title: "E4M3 codes", text: "Power-of-two scale, round, index −126…126.", link: plan-fp8-target, term: fp8}
  - {id: i8, col: 2, row: 2, title: "INT8 codes", text: "One scale per channel.", link: plan-fp8-target, term: integer-grid}
  - {id: split, col: 2, row: 3, title: "Calibration | evaluation", text: "Disjoint sets; global scope fits on the first.", link: plan-data, term: calibration-set}
  - {id: e1a, col: 3, row: 1, title: "1a: float diagnostic", text: "Distance curve, location and KLT gains.", link: plan-experiment-1a, term: fallen-apple}
  - {id: e1b, col: 3, row: 2, title: "1b: the ladder", text: "Type × scope × grid; predict, exact residual, two rates.", link: plan-experiment-1b, term: harness}
  - {id: ctl, col: 3, row: 3, title: "Four controls", text: "Synthetic truth, shuffle, scope consistency, round trip.", link: plan-controls, term: shuffle-control}
  - {id: figA, col: 4, row: 1, title: "Figure A", text: "Bits saved against token distance.", link: questions-framework-a, term: fallen-apple}
  - {id: tab1, col: 4, row: 2, title: "Table 1", text: "Scope gains per type, grid and rate.", link: plan-decision-rule, term: scope-gain}
  - {id: figB, col: 4, row: 3, title: "Figure B", text: "The compressibility curve and its roofline.", link: questions-framework-b, term: curve}
  - {id: rho, col: 4, row: 4, title: "ρ for wave 2", text: "Delta ratio of the fixed-length coder.", link: plan-cost-model-and-paper, term: delta-ratio}
edges:
  - [dump, e4]
  - [dump, i8]
  - [dump, e1a, "floats"]
  - [e4, split]
  - [i8, split]
  - [split, e1b]
  - [ctl, e1b, "gate"]
  - [e1a, figA]
  - [e1b, tab1]
  - [e1b, figB]
  - [e1b, rho]
```

Two things about the shape are deliberate.

- **1a skips step 0.** It reads the floats directly, so its numbers say what the data offers before any grid takes its share. Comparing 1a with 1b *is* one of the diagnostics.
- **The controls sit in front of 1b, not behind it.** A control run after the results are in is a temptation to explain away a failure.

::: takeaway
- One GPU evening produces the dump; everything else is CPU work.
- 1a reads floats, 1b reads 8-bit codes; the controls gate the harness before real data enters.
:::

## The outputs {#outputs}

1. **Figure A — bits against distance.** Bits saved against token distance $\vgap$ (and against layer gap), per layer, for keys and values, each with its shuffled curve. The direct answer to Q1 ([[#questions-q1]]).
2. **Table 1 — the scope table.** Rows: dictionary types. Columns: global, request, block at its best $\vb$. Cells: [[entropy-rate|entropy rate]] and [[fixed-length-rate|fixed-length rate]]. Keys and values apart; E4M3 and INT8 apart; per layer and averaged. The numbers that matter are the [[scope-gain|scope gains]] $\vgainreq$ and $\vgainblk$ of the *cheapest* type that achieves them.
3. **Figure B — the compressibility curve.** Every (type, setting, $\vb$) as a point of dictionary cost against delta size, the lower envelope drawn as the [[roofline]], with the solo and raw lines as landmarks ([[#questions-framework-b]]).
4. **Diagnostics.** The per-channel breakdown (expect a few key channels to dominate); the k-means residual against the Gaussian bound (does the data cluster?); the BF16 column; float gains against 8-bit gains (how much the grid takes back).
5. **Derived.** The [[delta-ratio|delta ratio]] $\vrho$ and the delta size $\vdsz$ of the fixed-length coder at the best affordable $(\vb, \vw)$ — the inputs of [[#questions-framework-d]].

To make Table 1 concrete, here it is filled in for the synthetic set of [[#plan-controls]] — one type, two grids. **Synthetic; a method check, not a result about KV caches.**

| type and grid | global | request | best block ($\vb$ = 2048) | $\vgainreq$ | $\vgainblk$ |
|---|---|---|---|---|---|
| loc, INT8 | 7.073 / 7.953 | 6.614 / 7.383 | 6.272 / 7.012 | 0.459 / 0.570 | 0.342 / 0.371 |
| loc + flag, E4M3 | 6.367 / 7.907 | 5.906 / 7.848 | 5.566 / 7.687 | 0.461 / 0.058 | 0.340 / 0.161 |
| shuffled: loc, INT8 | 7.073 / 7.953 | 6.943 / 7.835 | 6.946 / 7.835 | 0.131 / 0.118 | −0.004 / −0.000 |

Each cell is entropy rate / fixed-length rate in bits per element. The derived number for wave 2 would be read from the INT8 row: $\vrho = 7.012/8 \approx 0.88$, a delta of about 56 bytes for a 64-byte entry.

We would add two things to the source's list. **Every gain next to its shuffled twin** (the third row), because the shuffled request gain is the calibration gap. And **the fixed-length rate of an exponent-splitting solo coder**, so that the fixed-length column has a fair baseline ([[#plan-experiment-1b/printed]]).

::: takeaway
- Figure A answers Q1; Table 1 gives the scope gains; Figure B gives the curve; the diagnostics say why.
- $\vrho$ of the fixed-length coder is handed to the cost model.
- Every gain should be printed next to its shuffled twin.
:::

## The weekend, slot by slot {#timeline}

::: figure fig-plan-timeline planTimeline
**The wave-1 schedule.** Columns are days; cards are working slots, coloured by kind: building code (lapis), computing (peacock), reading and thinking (amethyst), deciding (vermilion). Click or hover a card for what happens in that slot and which page explains it. Day 0 is our addition: the source's "next action" asks to add query vectors to the dump script, which means re-running the dump first.
:::

The source calls this "one weekend". Counted honestly, it is three days of work and an evening before:

- **Day 0** is the dump with query vectors added.
- **Day 1** is mostly done already: the step-0 functions, both rates, the interface and the synthetic controls run in `analysis/plan_harness.py`. What remains is plugging in the real dumps and running 1a.
- **Day 2** is the long one; VQ is left running overnight because k-means is slow.
- **Day 3** ends with the [[#plan-decision-rule|decision]], made by a rule written down before the data was seen.

::: takeaway
- A long weekend: an evening of dumping, then build-and-diagnose, the ladder, and the decision.
- Day 1's code already exists and passes its controls on synthetic data.
:::
