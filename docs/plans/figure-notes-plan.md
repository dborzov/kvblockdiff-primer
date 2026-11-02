# Figure notes for Part X (the research plan)

Written by the Part X writer; `figures/*.js` were not edited. Part X loads `figures/plan.js` and
`figures/questions.js` (`data/parts.yaml`).

## Builders Part X uses, and the labels they still carry

| builder | file | used on | label now | should say |
|---|---|---|---|---|
| `planSelections` | `figures/plan.js` | X.5 `fig-plan-stand-in-raster` | x-axis `position (16 blocks of 256)` | `position (16 stretches of 256)` |
| | | | readout `top 1 block holds`, `top 2 blocks`, `top 4 blocks` | `heaviest stretch holds`, `heaviest 2 stretches`, `heaviest 4 stretches` |
| | | | readout `heaviest block stays heaviest` | `heaviest stretch stays heaviest` |
| | | | caption/label text `selected positions by decode step` | `picked positions by decode step` |
| `planReplaySweep` | `figures/plan.js` | X.6 `fig-plan-replay-sweep` | legend `heaviest blocks resident` / `LRU of blocks hit by a miss` | `heaviest stretches on fire` / `LRU of stretches hit by a miss` |
| | | | x-label `resident dictionaries n_D` (both plots) | `dictionaries on the shelf n_D` |
| | | | readout `token miss rate, B = k, 2k, 4k` | `miss rate, B = k, 2k, 4k` (fine as is; "token" is not retired) |
| | | | rule label `0.1 (heavy w break-even)` | `0.1 (break-even for w = 256)` |
| | | | shared generator comment `blocks of 256` (`TR.b`) | stretches |

Both captions on the pages say "the figure's own labels still say block" so the reader is warned until
the retrofit lands; delete that sentence from the two captions once it does.

## Builders in these files that Part X does NOT use, and why

- `planDecision` (plan.js): draws the old wave-1 rule over `\vgainreq` / `\vgainblk`, two macros that no
  longer exist (`data/symbols/core.yaml` now has `gainseq`, `gainstr`). It would throw in `texify`. If it is
  ever wanted again (X.9 could use it for H6, sequence scope), replace the macros with `\vgainseq` /
  `\vgainstr`, relabel the regions `stretch scope` / `sequence scope`, and drop the "request" wording.
- `planRisks` (plan.js): its content is the old twelve-risk register (wave 1 / wave 2 / proxy / request /
  block). X.10 uses a Markdown table instead. A generic replacement would take its cards from a data file.
- `planTimeline`, `planFrontier`, `planLadderGrid`, `planControlsRun`, `planE4m3`, `planHumps`,
  `planDistance`, `planGpuFit`, `planDecodeAlone`, `planBill`: old Part IX pages; some are reused by
  Parts IV/V. `planFrontier` labels "requests per GPU", "kv-blockdiff, request scope", "w_res (entries)":
  retired words, for whichever Part reuses it.
- `questions.js` (`qDecision`, `qBar`, `qDistance`, `qCurve`, `qReplay`, `qFrontier`, `qParkedMap`, `qAxes`,
  `qProbe`): every builder carries "block", "request", "entry" or "entries" in its labels and its content is
  the old frameworks A–D. Part X uses none of them. `qReplay` is the closest to X.6 and could replace
  `planReplaySweep` there after a relabel (legend `dictionary resident` → `dictionary on the shelf`,
  `block size` → `stretch length`, verdict strings). If nothing in Part VII uses questions.js either, it can
  be dropped from Part X's `figs:` in `data/parts.yaml`.

## New builders wanted (specs)

### `planQueue` (X.4, the queue)

A horizontal bar chart of the nine experiments H1–H9 ordered by hours to a first reading. One bar per
experiment, length = hours (log scale, 1 h to 200 h), split into two segments: writing (hatched) and
running (solid). Colour by the big question it serves (Q1 structure, Q2 the store, Q3 residency; use three
`series()` slots and a legend). Hover: the six-line card (question, scenario line, exists, signal, decision,
cost). Data inline in the builder (nine rows), or from `figures/data/plan-queue.json` so the hours can be
corrected after each run without touching JS. Labels: `hours to a first reading`, `writing`, `running`.

### `planBenchReplay` (X.6, once a trace exists)

The same two panels as `planReplaySweep` (f_D and n_load against n_D, both policies), but fed from
`figures/data/plan-replay-<sequence>.json` produced by the real replay on the Bench's trace, with a third
panel: miss rate against B at 2048 / 4096 / 8192 next to the Pin's 30 / 13.4 / 6.7 %. A `seg` control
picks the sequence and the stretch length (2048 / 4096 / 16384); a toggle shows the shuffled-trace twin
as a dashed series. Until the JSON exists the builder should fail loudly ("no trace yet"), not draw a toy.

### `planDecisionTable` (X.9, optional)

A filterable version of the decision table: a `seg` over experiments; each row shows reading → meaning →
next; a "mark as measured" state is out of scope (no runtime capability on this site). Low priority: the
Markdown table does the job.
