---
title: Weak spots, risks and pivots
nav: Risks and pivots
group: Honest edges
lede: A plan that cannot fail cannot teach anything. Here is every way this one could fail, how we would find out, and what we would do instead — nine risks from the source, three more found while building the harness, and the next action.
cards:
  - q: What is the pivot if 8-bit KV turns out to have no usable conditional structure (R1)?
    a: Publish the negative with the BF16 column, and build a global fixed-length coder for the miss path — solo coding for sparse decode
    wrong: ["Switch to lossy 2-bit quantization", "Abandon sparse attention", "Use bigger blocks until a gain appears"]
    why: Solo coding is worth ~1.1–1.3× for free and needs no residency; the negative measurement is new on its own.
    sec: risks
  - q: 'How would we know that gains exist only at request scope (R3)?'
    a: 'From Table 1: $\vgainblk$ is small while $\vgainreq$ is not'
    wrong: ["From the token miss rate", "From the round-trip control", "From the GPU memory bar"]
    why: The pivot is "requestdiff": one dictionary per request per layer, no dictionary cache. Simpler, still new.
    sec: risks
  - q: Which risk can only be checked in phase 2, not in wave 1 or 2?
    a: R8 — that the decoder cannot run at gather speed
    wrong: ["R1 — no conditional structure", "R3 — gains only at request scope", "R10 — too few calibration sequences"]
    why: Throughput needs a kernel. Until then, the fixed-length rate predicts the format a fast decoder would read.
    sec: risks
  - q: Where is the argument thinnest, according to the source?
    a: The prior on fallen-apple similarity (intuition plus lossy-literature hints), and the economics built on assumed ρ, w and f_D
    wrong: ["The E4M3 rounding code", "The HiSparse miss rates", "The size of the dump"]
    why: There is no lossless number anywhere — which is both the risk and the reason the measurement is worth publishing either way.
    sec: thinnest
  - q: What third thin spot did building the harness add?
    a: The engineering number — on synthetic data the E4M3 fixed-length rate kept 0.22 bit of a 0.80-bit structure, against a straw-man solo baseline
    wrong: ["The entropy rate is always optimistic by 2 bits", "The shuffle control never works", "INT8 is lossy"]
    why: What a fast format can cash in may be much less than what the data contains, and the fixed-length column still lacks a fair baseline.
    sec: thinnest
---

A bridge engineer's most useful drawing is not the bridge; it is the list of ways it could fall down, each with the test that would show it and the brace that would fix it. This page is that list for the plan.

## Twelve risks {#risks}

Each card says how we would find out and what we would do instead. The first nine come from the source. The last three were found while building the [[harness]] for this site; they are marked "added here".

::: figure fig-plan-risks planRisks wide
**Risk cards.** Each card: a risk, when it would show up (wave 1, wave 2, phase 2, or by reading the literature), which big-picture question it threatens (Q1 neighbour similarity, Q2 the coder, Q3 residency; [[#questions-two-kinds]]), how we would know, and the pivot. Saffron, dashed cards are the risks added by this rewrite. Filter by when a risk would be detected.
:::

::: try
1. Filter "found in wave 1". Nine of the twelve risks are settled by one long weekend of numpy.
2. Filter "added here". All three are about the measurement itself, not about KV caches — and all three would flatter the dictionaries if left alone.
3. Read R5 and R11 together. One grid, two separate traps: one in the fixed-length format, one in the entropy model.
:::

Two patterns stand out.

- **Most risks have a pivot that is still a result.** "Requestdiff" (R3), light all-resident dictionaries (R7), INT8 as an equal storage format (R5), and the negative paper (R1) are all publishable. Only R9 — prior art already covering it — would end the project, and the papers of Part V say it does not ([[#papers-what-would-be-new]]).
- **The added risks are cheap to remove.** More calibration data, the grid-aware model (already done) and an exponent-splitting baseline cost a day between them.

::: theme controls
Every risk card names how we would *know*. A risk without a measurement that could reveal it is a worry, not a risk — and the controls are what make the measurements trustworthy.
:::

::: takeaway
- Nine of twelve risks are settled in wave 1; R7 needs wave 2; R8 needs a kernel.
- Almost every pivot still leads to a publishable result.
- The three risks found while building the harness all bias towards "go", and all are cheap to fix.
:::

## Where the argument is thinnest {#thinnest}

The source names two thin places. Building the harness adds a third.

1. **The prior on [[fallen-apple|fallen-apple similarity]]** is intuition plus hints from [[lossy]] papers. There is no lossless number anywhere. That is both the risk and the reason the measurement is worth publishing either way.
2. **The economics** use assumed $\vrho$, $\vw$ and $\vfD$. They show which regime wins, not that we are in it ([[#plan-cost-model-and-paper]]).
3. **The engineering number may keep little of the scientific one.** On synthetic data with 0.80 bit of real structure, E4M3's fixed-length rate kept 0.22 bit — and that against a solo baseline of exactly 8 bits, which a fair exponent-splitting format would beat by itself. If real KV behaves like this, INT8 storage or a better format is not an option but a necessity.

Wave 1 replaces the first and third with measurements; wave 2 replaces the second.

::: keycard Next action
**Open the dumps, add the query vectors, run 1a, read three numbers.**

Most of the source's "next action" is already done on this site: `analysis/plan_harness.py` contains `e4m3_round`, `e4m3_index`, `int8_index`, both rates and the `DeltaCoder` interface, and passes all four controls on synthetic data. What remains is the real data — plus the three cheap fixes above.
:::

::: takeaway
- Thinnest: the prior on fallen-apple similarity, the assumed economics, and how much a fast 8-bit format can cash in.
- The harness is written and controlled; the next step is the dump.
:::
