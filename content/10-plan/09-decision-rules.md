---
title: What each outcome would mean
nav: Decision rules
group: Decisions and risks
lede: A table written before the data, one row per experiment, mapping the readings to the next step. The thresholds are judgement calls; their value is that they are fixed now, while nobody knows which side of them the numbers will fall.
cards:
  - q: What is a decision rule, on this site?
    a: A table fixed before any data that maps an experiment's possible readings to what happens next
    wrong: ["The rule by which the harness ranks compressors", "A threshold learned from the data", "The leash"]
    why: Written afterwards, every reading means "promising"; written before, a reading is evidence for one row.
    sec: rules
  - q: 'The replay reads $\vfD \ge 0.8$ with 8 dictionaries on the shelf and 0.6 loads per step. Heavy dictionaries (w = 256): affordable?'
    a: 'No: 0.6 × 256 ≈ 154 cherries'' worth of loads per step, more than half the miss traffic the deltas save'
    wrong: ["Yes, f_D above 0.8 settles it", "Yes, loads are free", "It cannot be judged without ρ"]
    why: 'Loads must satisfy n_load × w ≪ the misses per step (274 at the Pin); for w = 256 that is under about 0.1 loads per step.'
    sec: rules
  - q: Which three numbers decide whether the project is worth a system?
    a: 'ρ on the miss path, f_D with n_load on the Bench, and the decoder''s bytes per second against the link'
    wrong: ["The MDL ratio, the dictionary share and the delta share", "Miss rate, hit rate and TPOT", "The stretch length, the leash and the cherry shape"]
    why: They are the three inputs of the napkin that are still assumed; each experiment of this Part supplies one of them.
    sec: three-numbers
---

Before a clinical trial starts, its authors register what they will measure and what each result will mean. The old plan did this once, with two scope gains and four rows, and found a gap in its own rule on synthetic data before any real data arrived. This page does it again for the experiments of this Part.

## The rules {#rules}

::: define decision-rule
- **What it is.** A table, fixed before any data, that maps an experiment's readings to what happens next. One row per reading, no row left for "it depends".
- **Example.** For the replay: $\vfD \ge 0.8$ at $\vnD \le 8$ with $\vnload \le 0.1$ means heavy stretch dictionaries are affordable; $\vfD < 0.5$ means only light ones, resident for every stretch, or one per sequence.
- **Easy to confuse with** a prediction. A rule does not say which row will be hit; it says what each row would make us do.
:::

| experiment | reading | meaning | next |
|---|---|---|---|
| H1 keys | within 0.03 of values on the same punnets | one compressor family serves both halves | H4 at once |
| | worse by more than 0.05 | keys need stages of their own (RoPE-aware, outlier furrows) | a keys-only ladder before H4 |
| H2 the stretch-and-leash pairs | the 16 384 · 1 103 point is under 0.005 below the 4096 · 293 point | the 4096 · 293 scenario is the one for the application | the 4096 · 293 pair everywhere |
| | the 512 · 137 point is within 0.01 of the 4096 · 293 point | short stretches lose little under their tighter leash | the 512 · 137 pair; the Pin's cold decode touches 88 KB |
| H3 group dictionary | gain over per-layer ≈ the prediction table's amortised share (≈ 0.01) | amortisation only; no upstairs structure | per-layer dictionaries; GLM shape by the trace alone |
| | gain > 0.02 | the group shares structure | the GLM-5.1 shelf: one dictionary per group |
| H4 keys + values | below the byte-weighted mean of the halves by > 0.005 | K and V share bits | a pick is one cherry of both halves |
| | at the mean | independent halves | two cherries, one dictionary each; scenarios stay per tensor |
| H5 bit-field split | within 15 % of the frontier's ratio | a fixed-length delta exists | H9 on the fixed-length variant first |
| | more than 25 % worse | the FP8 grid defeats fixed-length deltas | H9 on the entropy coder; INT8 storage as a scenario |
| H6 sequence scope | the whole-sequence point (leash 14 503) ≥ 0.03 below the 16 384 point (leash 1 103) | $\vgainstr$ is negative: one dictionary per sequence | the no-shelf design; Q3 is moot |
| | within 0.01 of the 16 384 point | stretches are enough | the shelf design; Q3 decides |
| H7 prose | frontier ratio worsens by > 0.05, no-tree compressor unchanged | echo is a property of tool-heavy text | quote two numbers everywhere: transcripts and prose |
| | both unchanged within 0.02 | the gain is general | one number |
| H8 second LLM | head-joining gain and shuffle gap of the same sign and size | stereo and echo are transformer properties | claim Part VIII beyond one LLM |
| | either vanishes | one LLM's quirk | the rented node of [[#plan-other-experiments]] moves up |
| replay | miss rates within 2× of HiSparse's 30 / 13.4 / 6.7 % | the stand-in is calibrated | believe its stretch statistics |
| | $\vfD \ge 0.8$ at $\vnD \le 8$, $\vnload \le 0.1$ | misses pile into few, long-lived stretches | heavy stretch dictionaries are affordable |
| | $0.5 \le \vfD < 0.8$ | partly | light dictionaries, or a few heavy ones for the heaviest stretches; the napkin decides |
| | $\vfD < 0.5$ | misses are spread | light all-resident dictionaries, or sequence scope |
| | missed cherries compress > 0.05 worse than the average | the miss path is harder | $\vrho$ of the napkin is the missed cherries' |
| H9 decoder | frontier ≥ 500 GB/s | the entropy-coded delta fits | lever 1 at 0.636 |
| | only fixed-length ≥ 500 GB/s | the delta format is fixed-length | lever 1 at H5's ratio |
| | neither, single-cherry latency ≪ TPOT | off the miss path only | the victim tier |

**Read on 2026-11-03.** The replay rows were read on the pick traces of Qwen 2.5 1.5B, a stand-in LLM, with numbers carried to the Pin ([[#picks-shelf]]). Calibration: hit, with miss rates 1.2–1.5× HiSparse's at the Pin's share of the context ([[#picks-hot-cache]]). The δ-miss fraction: on the stand-in's own 27K context, "affordable" only with a shelf spanning 73 % of the context, and "partly" (0.52 at 4 × 1024) within the Pin's coverage; carried to the Pin, "partly" at best (0.54 at 4 × 4096, with 0.10–0.13 loads per step, at the 0.1 limit) and "spread" at worst. The row on missed cherries is not read yet. The table above stays as registered.

Three rows deserve a note on where their numbers come from. The 0.1 loads per step is the Pin's break-even for a 256-cherry dictionary against 274 misses per layer per step ([[#app-the-napkin]]). The 0.8 and 0.5 on $\vfD$ are the old plan's, kept because nothing measured since argues with them. The 500 GB/s is ten times the link ([[#landscape-derived-numbers]]).

::: theme controls
A decision rule is a control on the experimenter, not on the data. It removes the freedom to reinterpret a result after seeing it, and it is the one control that costs nothing to run.
:::

::: takeaway
- One row per reading; the next step is written in the row.
- The thresholds are judgement calls, fixed now; the numbers behind them are the Pin's break-even, the old plan's $\vfD$ bands and the 10× rule.
:::

## The three numbers {#three-numbers}

Every row above feeds one of three inputs of the napkin that are still assumed on this site, and the go/no-go of the project is the three together.

| number | today | supplied by | "worth a system" |
|---|---|---|---|
| $\vrho$ on the miss path | 0.636 on values at stretch scope, Part VIII; assumed for keys, for misses, for prose | H1, H4, H7, reading 7 of the replay | $\vrho \le 0.75$ keeps lever 1 above 1.1× at the Pin ([[#app-two-levers]]) |
| $\vfD$ and $\vnload$ | assumed 0.85 and 0.05 on every Part VI page | the replay | $\vfD \ge 0.8$ at $\vnD \le 8$, $\vnload \le 0.1$, or sequence scope |
| decoder bytes per second | unmeasured | H9 | $\ge$ 500 GB/s, or a victim tier only |

::: pull
Three assumed numbers stand between Part VIII's 0.636 and a claim about a serving system; every experiment of this Part replaces one of them.
:::

::: takeaway
- $\vrho$, ($\vfD$, $\vnload$) and decoder speed are the three inputs still assumed; each experiment supplies one.
- The project is worth a system when all three clear their line; any one failing names its pivot ([[#plan-risks]]).
:::
