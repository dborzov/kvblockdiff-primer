# Figure notes for Part VI (slug `app`): labels to retrofit, one rename, one `figs:` problem

Written by the Part VI writer. The pages of `content/06-application/` reference the builders below by
name and describe their controls in the new words; the JS still carries the old words. Every change is a
UI string unless marked. Rule: `docs/style/terminology.md` §4.1 (entry → pick / cherry, block → stretch /
punnet, request → sequence, dictionary cache → dictionary shelf, kv-blockdiff → kvblockdiff, channel →
furrow, selection → pick, history → orchard, delta ratio → delta share, coder → compressor).

## `figs:` problem (data/parts.yaml)

- **VI.12 `app-victim-tier` uses `mbVictimTier`, which lives in `figures/missed-b.js`.** Part VI loads
  `[idea, homework-b, range]` only. Either add `missed-b` to Part VI's `figs:` or move `mbVictimTier` into
  `idea.js`/`range.js`. Until then the figure on that page reports "missing builder".

## Rename

- `figures/idea.js` `FIG.blockKnob` → `stretchKnob`. Part IV now uses `scnStretchKnob` from
  `figures/scenario.js`; Part VI does not use the old builder at all. It can be deleted from `idea.js`, or
  renamed and kept as a spare. Its strings: `'block size b'`, `'block size $\vb$'`, `'A history of 32
  tokens cut into blocks'`, `'place in its block'`, `'blocks in the history'`, and the brand colours
  `T('block')`, `T('entry')` (term ids that no longer exist: use `stretch`, `cherry`).

## Brand-colour variables that no longer resolve

The builders use `var(--t-<term-id>)` for colours. Retired ids used in the three files:
`--t-block` (→ `--t-stretch`), `--t-entry` (→ `--t-cherry` or `--t-pick`), `--t-dictionary-cache`
(→ `--t-dictionary-shelf`), `--t-kv-blockdiff` (→ `--t-kvblockdiff`), `--t-scope-request`
(→ `--t-scope-sequence`), `--t-scope-block` (→ `--t-scope-stretch`), `--t-heavy-block`
(→ `--t-heavy-stretch`). Grep each file for `T('` and `var(--t-`.

## `figures/idea.js`

| builder | page | label now | should say |
|---|---|---|---|
| `ideaMapping` | VI.1 | column head `'kv-blockdiff and the KV cache'` | `kvblockdiff and the orchard` |
| | | row 1 `'One entry $\vE_{\vl,\vt}$'` / `'one token at one layer; $\ve = 640$ bytes in the reference setting'` | `One cherry $\vE_{\vi}$` / `one token's values at one layer; $\ve = 640$ B on the Pin` |
| | | row 1 diff `'an entry is a vector of 8-bit numbers'` | `a cherry is an array of 8-bit numbers` |
| | | row 2 `'The entries of one block'` / `'$\vb$ consecutive tokens of one request at one layer'` | `The punnet of one stretch` / `$\vb$ consecutive positions of one sequence at one layer` |
| | | row 2 diff `'the block size $\vb$ is a knob of our design (IV.2)'` | `the stretch length $\vb$ is a knob, not a fact (IV.2)` |
| | | row 3 `'The block dictionary $\vD_{\vj}$'` / `'per-channel means and scales, …'` | `The punnet's dictionary $\vD_{\vj}$` / `per-furrow locations and scales, a basis, a codebook, reference cherries` |
| | | row 4 `'Load $\vD_{\vj}$ into GPU memory once'` / `'and keep it while the block is in use'`; diff `(IV.4)` | `Load $\vD_{\vj}$ onto the shelf once` / `and keep it while the stretch is on fire`; `(VI.3, VI.8)` |
| | | row 5 `'The delta $\vdelta_{\vt}$'`; diff `(IV.6)` | `The delta $\vdelta_{\vi}$`; `(VI.5)` |
| | | row 6 `'$\vE_{\vt} = \mathrm{decode}(\vdelta_{\vt}, \vD_{\vj})$'` | `$\vE_{\vi} = \mathrm{decompress}(\vdelta_{\vi}, \vD_{\vj})$` |
| | | row 7 diff `'Whether KV entries have enough of it … (IV.7–IV.8)'` | `Whether cherries have enough of it is the bet (Parts VII–VIII)` |
| `ideaSystem` | VI.1 | seg `'kv-blockdiff'`; `'the whole history, entry by entry (e bytes each)'`; `'entry'` tiles; `'the same history, block by block'`; `'block'`; `'deltas δ: ρ·e bytes each, one per entry'`; `'hot cache: B raw entries (LRU)'`; `'dictionary cache: n_D dictionaries'`; `'attention reads the k entries'`; `'the indexer selects, as raw entries'`; `'raw miss (cold block): e'`; `'every miss: one raw entry, e'`; readout `'every hot-cache slot holds'` | `kvblockdiff`; `the whole orchard, cherry by cherry (e bytes each)`; `cherry`; `the same orchard, punnet by punnet`; `punnet`; `deltas δ: ρ·e bytes each, one per cherry`; `hot cache: B raw picks (LRU)`; `dictionary shelf: n_D dictionaries`; `attention reads the k picks`; `the indexer names picks, served raw`; `raw miss (stretch on ice): e`; `every miss: one raw pick, e`; unchanged |
| `blockBytes` | VI.2 | `'raw block'`, `'kv-blockdiff block'`, `'of the stored block'`, `'bytes per entry, all in'`, `'channel means & scales, $\vw = 2$'`, `'block size $\vb$'`, `'delta ratio $\vrho$'`, axis `'block size b (tokens, log scale)'`, aria `'Share of a block’s bytes taken by its dictionary, against block size'`, tooltip `'dictionary: ${w} entries’ worth'`, `'raw entries'` | `raw punnet`, `kvblockdiff punnet`, `of the stored punnet`, `bytes per cherry, all in`, `furrow statistics, $\vw = 2$`, `stretch length $\vb$`, `delta share $\vrho$`, `stretch length b (tokens, log scale)`, `Share of a punnet's bytes taken by its dictionary, against stretch length`, `dictionary: ${w} cherries' worth`, `raw cherries`. Suggested presets: $\vw = 2$ (furrow statistics), 86 (the light measured point), 2150 (the reference tree) instead of 2 / 32 / 256. |
| `missCost` | VI.3 | `'delta ratio $\vrho$'`; legend `'kv-blockdiff at the chosen ρ'`; kpi `'274 misses (III.11)'` | `delta share $\vrho$`; `kvblockdiff at the chosen ρ`; `274 misses (III.12)` |
| `toyTraceBlockdiff` | VI.4 | `'delta ratio $\vrho$'`; legend `'block whose dictionary is resident'`; aria `'…history, selections, hot cache and resident dictionaries'`; `'history of one layer (16 entries, 4 blocks of b = 4)'`, `'history'`; `'block ${j}'`; `'selected entries have a dark outline; colours show what each selection cost'`; readout `'hot cache of B = 6 raw entries'`, `'dictionary cache'`, `'indexer picks'` (fine); table `'kv-blockdiff'`; note `'$\vw$ entries’ worth'`, `'in that block'`; step labels `'blocks 0 and 2'`, `'entry 14 misses. Its block 3 …hot entries'`, `'entry 11 … block 2'`, `'entry 15 … block 3'` | `delta share $\vrho$`; `stretch whose dictionary is on the shelf`; `…orchard, picks, hot cache and the shelf`; `orchard of one layer (16 positions, 4 stretches of b = 4)`, `orchard`; `stretch ${j}`; `picked positions have a dark outline; colours show what each pick cost`; `hot cache of B = 6 raw picks`, `dictionary shelf`; `kvblockdiff`; `$\vw$ cherries' worth`, `in that stretch`; `stretches 0 and 2`, `pick 14 misses. Its stretch 3 … hot picks`, `pick 11 … stretch 2`, `pick 15 … stretch 3` |
| `layoutCompare` | VI.5 | `'wanted entry $\vt$'`; `'B · random-access delta store (kv-blockdiff): any entry decodes alone'`; aria `'A bulk stream: to read one entry, decode everything before it'`, `'A random-access delta store: one dictionary and one slot per entry'` | `wanted cherry $\vi$`; `B · random-access delta store (kvblockdiff): any cherry decodes alone`; `…to read one cherry…`; `…one slot per cherry` |
| `twoLevers` | VI.6 | `'delta ratio $\vrho$'`; seg `'lever 2 buys more requests'`; axis `'requests per GPU'`; tooltips `'requests'`; `'N_HBM'/'N_link'` fine | `delta share $\vrho$`; `lever 2 buys more sequences`; `sequences per GPU`; `sequences` |

## `figures/homework-b.js`

| builder | page | label now | should say |
|---|---|---|---|
| `econ()` scopes (shared) | VI.9–10 | scope ids `'request'`, `'block-all'`, `'block-cache'` (internal; fine) and their display names in `SCEN`: `'request scope: w = 256, ρ = 0.75'`, `'block scope, all resident: b = 4K, w = 32, ρ = 0.65'`, `'block, w 32'`, `'block scope, all resident: … w = 256 …'`, `'block, w 256'`, `'dictionary cache: n_D = 4, w = 256, ρ = 0.55, f_D = 0.85, 0.05 loads'`, `'dict. cache'`, `'solo coding, a global code: ρ = 0.88'` | `sequence scope: w = 256, ρ = 0.75 (assumed)`, `stretch scope, all resident: b = 4K, w = 32, ρ = 0.65 (assumed)`, `stretch, w 32`, `stretch scope, all resident: … w = 256 …`, `stretch, w 256`, `dictionary shelf: n_D = 4, w = 256, ρ = 0.55, f_D = 0.85, 0.05 loads`, `shelf`, `solo coding, a global code: ρ = 0.88 (assumed)`. Suggested two extra presets at the measured points: `light, all resident: w = 86, ρ = 0.665 (measured)` and `reference tree on a shelf: w = 2150, ρ = 0.112, n_D = 4` (VI.10's second table). |
| `hwbAnatomy` | VI.10 | design names `'request scope'`, `'block, w = 32'`, `'block, w = 256'`, `'dictionary cache'`; bar labels `'bytes moved over the link per step, per request'`, `'GPU memory per request'` | `sequence scope`, `stretch, w = 32`, `stretch, w = 256`, `dictionary shelf`; `…per sequence`, `GPU memory per sequence` |
| `hwbCalculator` | VI.10 | aria `'selections k'`, `'entry size e'`, `'delta ratio'`, `'block size'`, `'resident dictionaries'`; labels `` `selections ${T('\\vk')}` ``, `` `entry size ${T('\\ve')}` ``, `` `delta ratio ${T('\\vrho')}` ``, unit `'entries'`, `` `block size ${T('\\vb')}` ``; scope options `'request'`, `'block, all resident'`, `'block, dictionary cache'`; kpis `'kv-blockdiff'`, `'requests per GPU'`, `'requests per GPU vs HiSparse'`; legend `'link-bound requests per GPU'`, `'memory-bound requests per GPU'`, `'requests per GPU (the smaller)'`; axis `'concurrent decode requests per GPU'`; aria `'Link-bound and memory-bound requests per GPU for each scenario'`; table row `'requests per GPU'`, `'resident weight … entries'`; notes `'one code shared by every request'`, `'Request scope ignores b … (one dictionary per request, loaded at admission)'`, `'every block dictionary of the request …'`, `'Dictionary cache: n_D dictionaries per layer stay resident; f_D and the load rate are what trace replay will measure.'`, `'Requests per GPU are rounded to the nearest whole request.'`; fieldset legends `'The rig (reference setting, III.10)'`, `'The dictionary (assumed until measured)'` | `picks k`, `cherry bytes e`, `delta share`, `stretch length`, `dictionaries on the shelf`; `picks`, `cherry bytes`, `delta share`, `cherries`, `stretch length`; `sequence`, `stretch, all resident`, `stretch, dictionary shelf`; `kvblockdiff`, `sequences per GPU`, `sequences per GPU vs HiSparse`; `…sequences…`; `concurrent decoding sequences per GPU`; `…sequences… for each design`; `sequences per GPU`, `… cherries`; `every sequence`, `Sequence scope ignores b … (one dictionary per sequence, loaded at admission)`, `every punnet dictionary of the sequence …`, `Dictionary shelf: n_D dictionaries per layer stay resident; f_D and the load rate are what a replay of the hot cache will measure.`, `Sequences per GPU are rounded.`; `The rig (the Pin, III.11)`, `The dictionary (assumed until typed from Part VIII)` |
| `hwbLoads` | VI.9 | `WS` names `'loc'`, `'rank-16 KLT'`, `'VQ-256'`, `'full basis'`; table head `'min. lifetime, steps'` fine; `` `break-even ${T('\\vnload')}` `` fine | `furrow statistics`, `rank-16 KLT`, `VQ-256`, `full basis`. Suggested: add the two measured weights, 86 (`light, measured`) and 2150 (`reference tree, measured`). |
| `hwbDecode` | VI.5 | legend `'needed: lever 2 (every read decodes)'` fine; control `'requests per GPU N'` | `sequences per GPU N` |

## `figures/range.js`

| builder | page | label now | should say |
|---|---|---|---|
| PIN/BENCH fallback (`switchNote`, key names) | all | `'layers with a KV cache'`, `'elements per entry'`, `'entry size'`, `'selections per layer per step'`, `'block size used in examples'`; note `'… 640 B entries, 2048 selections …'`; reference `(III.10)` | `KV layers`, `elements per cherry`, `cherry bytes`, `picks per layer per step`, `stretch length used in examples`; `… 640 B cherries, 2048 picks …`; `(III.11)` |
| `POINTS` (shared) | VI.7–9 | `'tree coder'`, `'tree coder 121: x = 0.525, y = 0.112 (env-t0096, layer entries)'`, `'curve point x ≤ 0.10: … (r1-t0036, coder 30, layer 3 head 0)'` | `reference tree`, `reference-tree compressor 121: x = 0.525, y = 0.112 (env-t0096, cherry (2, 256))`, `curve point x ≤ 0.10: … (r1-t0036, compressor 30, layer 3 head 0)` |
| `rngCorners` | VI.7 | legend `'the measured curve: coder 30 at each budget (C1, layer 3 head 0)'`, `'the C2 tree point, layer entries'`, `'every entry in the dictionary (y = 0)'`, `'later best coder per budget'`, `'baseline x + y = 1, ending at (1, 0): the whole block resident, raw'`; corner labels `'half the history\nresident'`, `'per-entry coding'`, `'whole block\nresident, raw'`; tooltip `'the whole block resident, raw … every entry kept as it is'`, `'x b = … entries’ worth of a 4096 block'`; aria `'… with the two boring corners shaded'` fine | `the measured curve: compressor 30 at each budget (C1, layer 3 head 0)`, `the C2 reference-tree point, cherry (2, 256)`, `every cherry in the dictionary (y = 0)`, `later best compressor per budget`, `… the whole punnet resident, raw`; `half the orchard\nresident`, `tiny dictionaries:\nsolo with a rule`, `whole punnet\nresident, raw`; `the whole punnet resident, raw … every cherry kept as it is`, `x b = … cherries' worth of a 4096 punnet` |
| `rngFireStates` | VI.8 | seg `'tree coder: x 0.525 · y 0.112'`, aria `'coder point'`; aria `'The four states of a block in the dictionary cache, …'`; arrow `'slot claimed by\na hotter block'`; `'one block’s dictionary'` | `reference tree: x 0.525 · y 0.112`, `curve point`; `The four states of a stretch on the dictionary shelf, …`; `slot claimed by\na hotter stretch`; `one punnet's dictionary` |
| `rngFireTrace` | VI.8 | sliders `'concentration (share of misses in the hot blocks)'`, `'$\vnD$ (resident dictionaries, and hot blocks)'`; seg `'tree coder: …'`; legend `'whole-block prefetch when popular'`; aria `'… toy selector whose hot blocks drift'`; policy key `block` (internal) | `concentration (share of misses in the hot stretches)`, `$\vnD$ (dictionaries on the shelf, and hot stretches)`; `reference tree: …`; `whole-stretch prefetch when popular`; `… toy indexer whose hot stretches drift` |
| `rngFireNapkin` | VI.9 | curve legend `'tree coder 121 (C2, layer entries)'`, `'every entry in the dictionary (coder 43)'`, `'coder 30, unconstrained'`; tiles `'link bytes per step, per request'`, `'GPU memory per request'`, `'requests per GPU'`, `'δ-misses per loaded block'`; toggle `'lever 2: the dictionary replaces the hot-cache slots of its block'`; legend `'link-bound requests per GPU'` etc.; axis `'concurrent decode requests per GPU'`; rows `'HiSparse at B = …: raw misses, no dictionary'` fine; `'memory ${…}'` fine | `reference-tree compressor 121 (C2, cherry (2, 256))`, `every cherry in the dictionary (compressor 43)`, `compressor 30, unconstrained`; `… per sequence`, `GPU memory per sequence`, `sequences per GPU`, `δ-misses per loaded stretch`; `lever 2: the dictionary replaces the hot-cache slots of its stretch`; `…sequences…`; `concurrent decoding sequences per GPU` |
| `rngDollars` | VI.11 | designs `'HiSparse, B = 4K (VI.15)'`, `'solo coding, ρ = 0.88 (VI.16, assumed ρ)'`, `'request scope, w = 256, ρ = 0.75 (VI.16, assumed)'`, short `'request scope'`, `'on-fire dictionaries, lever 2, n_D = 1 (XII.5)'`; src strings `'the Pin, …'` fine; axis `'USD per million output tokens (at the assumed price)'` fine; tiles `'requests per GPU'` | `HiSparse, B = 4K (VI.9)`, `solo coding, ρ = 0.88 (VI.10, assumed ρ)`, `sequence scope, w = 256, ρ = 0.75 (VI.10, assumed)`, `sequence scope`, `on-fire dictionaries, lever 2, n_D = 1 (VI.9)`; `sequences per GPU` |
| `rngSettings` | not used by Part VI (III.11 may use it) | — | — |

## `figures/missed-b.js` (`mbVictimTier`, VI.12; see the `figs:` problem above)

| label now | should say |
|---|---|
| `'block size b'`, `'per request'`, `'block size'`, `'GPU memory per request'`, `'requests per GPU'`, `'requests per GPU N'`; memory note about `loc dictionaries for every block ($\vb$ = 2,048, 98 slots' worth per layer)` | `stretch length b`, `per sequence`, `stretch length`, `GPU memory per sequence`, `sequences per GPU`, `sequences per GPU N`; `furrow-statistics dictionaries for every stretch` |

## Cross-reference numbers inside figure strings

Several strings cite old Part numbers in parentheses (`III.10`, `III.11`, `IV.2`, `IV.4`, `IV.6`, `IV.7–IV.8`, `VI.15`, `VI.16`, `XII.5`). New homes: the Pin is III.11, the derived numbers III.12, the stretch IV.2, the shelf VI.3, the layout VI.5, the napkin VI.9, the calculator VI.10, the hypotheses Part VII.
