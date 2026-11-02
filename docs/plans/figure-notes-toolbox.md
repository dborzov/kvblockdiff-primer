# Figure notes for Part V (the toolbox)

Part V reuses builders from `figures/homework-a.js`, `figures/missed-a.js`, `figures/missed-b.js`,
`figures/plan.js` and `figures/measured.js` (loaded for the Part by `data/parts.yaml`). No JS was edited.
Every label change below is "what it says now → what it should say" in the site's words
(`docs/style/terminology.md`); a caption on the page already uses the new words, so the figure and its
caption disagree until the builder is retrofitted. Builder names stay.

## Builders used, by page

| page | figure id | builder (file) |
|---|---|---|
| V.1 toolbox-the-bill | fig-toolbox-shape | hwaShapeStepper (homework-a) |
| V.1 | fig-toolbox-bill | planBill (plan) |
| V.1 | fig-toolbox-budget | hwaBudgetBars (homework-a) |
| V.2 toolbox-solo | fig-toolbox-solo-drift | hwaSoloDrift (homework-a) |
| V.3 toolbox-furrow-statistics | fig-toolbox-decode-alone | planDecodeAlone (plan) |
| V.3 | fig-toolbox-loc-gain | hwaLocGain (homework-a) |
| V.4 toolbox-klt | fig-toolbox-klt-spectrum | hwaKltSpectrum (homework-a) |
| V.5 toolbox-vq | fig-toolbox-vq-check | hwaVqCheck (homework-a) |
| V.6 toolbox-reference-cherries | fig-toolbox-sib-twins | hwaSibTwins (homework-a) |
| V.6 | fig-toolbox-ladder-c1 | msrLadderC1 (measured) |
| V.7 toolbox-linear-prediction | fig-toolbox-ladder-c2 | msrLadderC2 (measured) |
| V.7 | fig-toolbox-shuffle | msrShuffle (measured) |
| V.8 toolbox-context-modelling | fig-toolbox-grid-ruler | mbGridRuler (missed-b) |
| V.8 | fig-toolbox-context-grid | mbContextGrid (missed-b) |
| V.9 toolbox-lifting | fig-toolbox-lifting-grid | mbLiftingGrid (missed-b) |
| V.10 toolbox-bit-fields | fig-toolbox-bit-flips | maBitFlips (missed-a) |
| V.10 | fig-toolbox-grid-curves | hwaGridCurves (homework-a) |
| V.10 | fig-toolbox-humps | planHumps (plan) |
| V.11 toolbox-two-rates | fig-toolbox-two-rates | hwaTwoRates (homework-a) |
| V.12 toolbox-exchange-rate | fig-toolbox-exchange | hwaExchange (homework-a) |
| V.12 | fig-toolbox-spread | maSpread (missed-a) |
| V.13 toolbox-bounds | fig-toolbox-bounds-spectrum | mbBoundsSpectrum (missed-b) |
| V.13 | fig-toolbox-memory | msrMemory (measured) |
| V.14 toolbox-rehearsal | fig-toolbox-controls | planControlsRun (plan) |

Not used: `hwbRehearsal` (`figures/homework-b.js`, the old VI.18 figure) is not in Part V's `figs:` list;
V.14 uses `planControlsRun` instead, which draws the same ladder-with-shuffle from `plan-harness.json`.
If the orchestrator prefers the old figure, add `homework-b` to Part V's `figs:` in `data/parts.yaml` (or
`figs:` on the page) and swap the directive; the caption would need the words below too.

## Label changes (retired words inside builders)

General substitutions that apply to every builder below: entry → cherry; entries → cherries;
block → punnet (the data) or stretch (the token range); block size b → stretch length / punnet size;
channel → furrow (a column) or element (an index); request → sequence; coder → compressor;
read budget → leash; entry split → cherry shape; model → the LLM (named) or "table"; prototype → centroid.

### homework-a.js
- `hwaShapeStepper`: step labels "The entry: the first 8 of its 640 elements" → "The cherry: …"; "the receiver must be told which one — that is the per-entry tax" → "per-cherry tax"; "residual = entry − prediction" → "cherry − prediction"; "Pay the tax: N bits per entry" → "per cherry"; "C prototypes are C entries' worth, shared by a block of B" → "C centroids are C cherries' worth, shared by a punnet of B"; "prediction + residual = entry ✓" → "= cherry ✓"; row labels `entry` → `cherry`; diagram label "An entry, its prediction, its residual and the bill in bits" → "A cherry, …"; legend "per-entry tax" → "per-cherry tax". Also the text "prototype #37" → "centroid #37".
- `hwaBudgetBars`: note "order-0 entropy of a Gaussian channel" → "Gaussian furrow"; legend "E4M3, Gaussian channel (our Monte Carlo)" → "Gaussian furrow"; "E5M2, real KV (SplitZip)" → "E5M2, real orchard values (SplitZip)".
- `hwaSoloDrift`: slider "this block's offset (σ)" → "this punnet's offset (σ)"; slider "block means explain R²" → "punnet locations explain R²"; tiles "extra cost on this block" / "average over all blocks" → "this punnet" / "all punnets"; legend "this block's values" → "this punnet's values"; rule "block's typical value" → "punnet's typical value"; plot label "Global distribution and one block distribution" → "one punnet's distribution"; kpi notes "bits per element, this block" / "averaged over blocks" → punnet(s).
- `hwaLocGain`: tiles "all blocks together" / "average inside a block" → "all punnets together" / "inside a punnet"; legend "the Anchor: block median ± 1 within-block sd" → "punnet median ± 1 within-punnet sd"; xlabel "token position (8 blocks of 48)" → "(8 punnets of 48)"; plot label "One channel over eight blocks with block medians" → "One furrow over eight punnets with punnet medians"; slider for the drift share (if it says "block") → punnet.
- `hwaKltSpectrum`: kpi "entries per block, basis w = 1280" → "cherries per punnet, basis w = 1280" (and the d = 640 line should also mention the Bench's d = 512 if cheap).
- `hwaVqCheck`: plot label "VQ gross saving, tax and net against codebook size" is fine; legend/tips mentioning "per entry" → "per cherry", "block" → "punnet".
- `hwaSibTwins`: tiles "a twinned entry saves" → "a twinned cherry saves"; "whole block, net" → "whole punnet, net"; slider "entries with a twin" → "cherries with a twin"; legend "entry with a true twin" / "entry with no twin: random sibling" → cherry; "the Anchor (reference)" → "furrow locations (reference)".
- `hwaSibNearest` (not used by Part V, same file): xlabel "block size b (siblings to choose from)" → "punnet size b"; label "per entry length" → "per cherry length".
- `hwaTwoRates`: tile "entropy rate" fine; legend fine; the escape cost note "8 + 12 bits (a block of 4096 entries)" → "(a punnet of 4096 cherries)". The harness now charges escapes 8 bits with no position (reserved field value); a switch for that accounting would make the figure match V.11's listing.
- `hwaGridCurves`: slider/legend "block means explain R²" → "punnet locations explain R²"; xlabel "variance the block means explain (R²)" → "variance the punnet locations explain"; legend "INT8, per-channel scale" → "per-furrow scale"; plot label "Bits saved by block-mean prediction on INT8 and E4M3" → "punnet-location prediction".
- `hwaExchange`: switch labels "our Gaussian E4M3 channel (6.47 bits)" → "furrow"; "SplitZip's real E5M2 KV (6.19 bits)" → "real E5M2 values".
- `hwaCodeUsage`, `hwaWhereBits`, `hwaPortrait` (not used by Part V): channel → furrow, entry → cherry, block → punnet, "outlier key channels" → "outlier key furrows", "keys (320 el.)/values/whole entry" → "whole cherry".

### missed-a.js
- `maBitFlips`: readout text mentioning "channel" → "furrow"; otherwise fine.
- `maSpread`: tiles "average R² over channels" → "over furrows"; xlabel "channel" → "furrow"; plot label "Variance explained in each of 16 channels" → "furrows"; knob labels "channel i variance explained" → "furrow i"; hover "channel i" → "furrow i"; kpi note "numbers above the bars: bits per channel" → "per furrow". The starting rate constant SOLO = 6.47 is the Gaussian toy; V.12 says so in the caption.
- `maVqLedger`, `maGridLine`, `maAccess` (not used by Part V): entry → cherry, block → punnet, channel → furrow, request → sequence; `maAccess` legend "raw entries (HiSparse today)" → "raw picks", "entries per stream chunk" → "cherries coded together".

### missed-b.js
- `mbGridRuler`: fine (value, prediction, grid steps).
- `mbContextGrid`: legend "no prediction (solo)" fine; any "channel" in the readout → "furrow".
- `mbLiftingGrid`: fine.
- `mbBoundsSpectrum`: the two dashed thresholds are labelled after "experiment 1a" of the old plan; relabel "the first plan's trouble / pulse lines"; the button "the old draft's two worked examples" → "two worked spectra".
- `mbFlacOrders`, `mbStackDistance`, `mbResidency`, `mbRopeSmear`, `mbVictimTier`, `mbDecisionMap` (not used by Part V): request → sequence, block → stretch/punnet, channel → furrow/element, "requests per GPU" → "sequences per GPU".

### plan.js
- `planDecodeAlone`: note "Click an entry (a row) to decode it alone." → "Click a cherry"; table titles "the block (8-bit codes)" → "the punnet"; "D (one per block)" → "(one per punnet)"; row names "entry i" → "cherry i"; readout "entry N rebuilt" → "cherry N rebuilt"; column headers `c0 … c4` → `e0 … e4` (elem_id).
- `planBill`: slider "block size b" → "punnet size b"; its unit "entries" → "cherries"; legend "per-entry tax" → "per-cherry tax"; type names fine (loc → "furrow statistics", sib → "sibling"); hover "dictionary N entries' worth" → "cherries' worth"; readout "block" → "punnet"; the comment "elements per entry in the proxy model" → "elements per cherry (the figure's own setting, 1024)"; sideTxt "16 coefficients × 8 bits per entry" / "a log₂ b-bit pointer per entry" → per cherry.
- `planControlsRun`: segment labels "block scope / global scope / request scope" → "stretch scope / global scope / sequence scope"; xlabel "block size b (entries)" → "stretch length b (cherries)"; plot label "bits per element against block size, synthetic data" → "against stretch length"; rule "true block length" → "true stretch length"; tips "request scope (the whole sequence)" → "sequence scope"; "block of N" → "stretch of N"; readout macros `\vgainreq` / `\vgainblk` → the core symbols `\vgainseq` / `\vgainstr` (the old symbol ids no longer exist in `data/symbols/`; the readout should use `tex('\\vgainseq')` and `tex('\\vgainstr')`, or plain text "sequence-scope gain" / "stretch-scope gain").
- `planHumps`: legend/readout "codes of one channel" → "one furrow"; plot label "histogram of codes of one channel" → "of one furrow"; "three entropy models" → "three tables"; "index-space Laplace / grid-aware Laplace" fine.
- `planE4m3`, `planLadderGrid`, `planSelections`, `planReplaySweep`, `planFrontier`, `planRisks`, `planDecision`, `planTimeline` (not used by Part V): block → stretch/punnet, entry → cherry, request → sequence, "requests per GPU" → "sequences per GPU", "kv-blockdiff" → "kvblockdiff", "model" → the LLM.

### measured.js
- `msrLadderC1`: SHORT labels "nearest earlier entry" → "nearest earlier cherry"; "all in the dictionary" fine; legend "4096-token blocks" → "stretch 4096"; kpi "block size" → "stretch length"; "coder 34" → "compressor 34" everywhere ("coder N" appears in every tip and kpi of the file; a one-line rename of the word in the tip templates).
- `msrLadderC2`: tips "coder N" → "compressor N"; any "block" → "punnet"; "read budget" → "leash".
- `msrShuffle`: bar labels "real blocks / shuffled blocks" → "real punnets / shuffled punnets"; "the reference-tree coder" → "compressor".
- `msrMemory`: row labels "intact model (torch 2.11 rounding)" → "the LLM intact (torch 2.11 rounding)"; "delta-rule state reset" fine; "coder 102" → "compressor 102"; legend "model rows" → "LLM rows (code-length estimates)".
- `msrCast`, `msrHeadline`, `msrTensor`, `msrCurve`, `msrSplits`, `msrTime`, `msrReads`, `msrBlocks`, `msrNoise`, `msrEconomics` (not used by Part V): "entry split" → "cherry shape"; "entries per block" → "cherries per punnet"; "channels deep" → "elements deep"; "read budget" → "leash"; "coder" → "compressor"; "requests per GPU" → "sequences per GPU"; "exact model" → "code-length estimate".

## Wishes (no new builder required for Part V)

- A toy-punnet stepper would suit V.1 better than `hwaShapeStepper`: the 6 × 4 punnet of the page, two centroids, a 1-bit index per cherry, the bill in a punnet of 6 against 4096 (dictionary line 2.67 vs 0.004 bits per element). Spec: rows cherry / prediction / residual as in `hwaShapeStepper`, with a punnet-size toggle.
- `hwaTwoRates` with a switch "escape = raw byte (reserved field value)" vs "raw byte + 12-bit position", so that the figure reproduces the 5.44 / 7.00 pair of V.11's listing.
