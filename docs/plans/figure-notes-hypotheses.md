# Figure notes for Part VII (hypotheses)

Builders reused by `content/07-hypotheses/*.md`, with the UI labels that still use retired words, and two
new builders this Part would like. Part VII loads `figs: [idea, missed-a, questions]` (`data/parts.yaml`).

## Builders the Part needs that its `figs:` list does not load

Two pages reference builders that live in `figures/missed-b.js`, which Part VII does not load. Either add
`missed-b` to Part VII's `figs:` or move the two builders into a file it loads.

| page | figure id | builder | file |
|---|---|---|---|
| `hypotheses-keys-and-values` | `fig-hyp-rope` | `mbRopeSmear` | `figures/missed-b.js` |
| `hypotheses-stack-distance` | `fig-hyp-stack` | `mbStackDistance` | `figures/missed-b.js` |

## Label changes in reused builders

### `figures/idea.js`

| builder | used on | label now | should say |
|---|---|---|---|
| `kvAxes` | `hypotheses-neighbour-similarity` | "Click any entry to pick it." | "Click any cherry to choose it." |
| `kvAxes` | | diagram label "Entries of one request: layers up, tokens across" | "Cherries of one sequence: layers up, tokens across" |
| `kvAxes` | | annotation "inside one entry: its heads’ slices (not pursued)" | "inside one cherry: its two heads’ vectors (stereo similarity)" |
| `kvAxes` | | readout rows `['entry', E[l, t]]`, "the other heads’ slices of the same entry", "hypothesis: not pursued here", "fallen-apple (IV.8)", "upstairs (IV.9)" | `cherry` / `v[t, l]`; "the other head’s vector of the same cherry"; "stereo (VII.5)"; "fallen-apple (VII.3)"; "upstairs (VII.4)" |
| `threeProperties` | not used by Part VII | "Bits to store an entry given a neighbour" | "cherry" (if another Part reuses it) |
| `appleCurve` | `hypotheses-fallen-apple` | legend "a threshold claim: “alike within a block of b”" | "alike within a stretch of b" |
| `appleCurve` | | legend "tokens shuffled across conversations" | "tokens shuffled across sequences" |
| `appleCurve` | | plot label "Bits to store an entry exactly given a neighbour Δ tokens away" | "Bits to store a cherry exactly given a neighbour Δ tokens away" |
| `floors` | `hypotheses-upstairs` | "Click a window to move the entry." | "Click a window to move the cherry." |
| `floors` | | diagram label "A building of layers; each floor holds one layer’s entries" | "…one layer’s cherries" |
| `floors` | | readout `['entry', E[l, t]]`, "dictionaries per block of tokens" | `cherry` / `v[t, l]`; "dictionaries per stretch" |
| `heavyBlocks` | `hypotheses-heavy-stretches` | kpi "misses in the 4 busiest blocks"; axis "token position (32 blocks)"; "block j"; "Share of all misses that landed in each block"; tooltip "block ${i}"; controls "concentration", "topic lifetime" | "stretches" / "stretch j" / "…in each stretch"; colour token `T('heavy-block')` → `T('heavy-stretch')` |
| `catLadder` | `hypotheses-the-ladder` | step texts "Against everything a model could be asked…", "Against cat_thread…", "dog_thread", "cat_thread", bar labels `['all', 'thread', 'block']`, "so block dictionaries will work" | "everything the LLM could be asked…"; `cat_seq`, `dog_seq`; `['all', 'sequence', 'stretch']`; "so stretch dictionaries will work" |
| `ladderTheorem` | `hypotheses-the-ladder` | sliders "threads differ by (levels)", "blocks differ by (levels)", "noise inside a block, σ"; categories `['H(E)', 'H(E \| thread)', 'H(E \| block)']`; "bits per entry"; "value of the toy entry (16 levels)"; legend "cat thread", "one block of it", series "one Maine Coon block"; readout "I(E; thread)", "I(E; block \| thread)" | "sequences differ by", "stretches differ by", "noise inside a stretch"; `H(E \| sequence)`, `H(E \| stretch)`; "bits per cherry"; "value of the toy cherry"; "cat sequence", "one stretch of it", "one Maine Coon stretch"; "I(E; sequence)", "I(E; stretch \| sequence)" |
| `leakSim` | `hypotheses-the-leak` | no retired words found in its labels; the kpi for neighbour predictability may say "channels" (check) | "furrows" |
| `varianceBudget` | `hypotheses-the-trap` | names "+ thread rung", "+ block rung"; table rows "global channel model", "+ per-thread dictionary", "+ per-block dictionary"; sub-heading "a few channels that are almost fully predictable"; kpi subtitles "averaged over all channels", "typical channel", "near-deterministic channel"; note "A block rung worth 1 bit… (¾ of what the thread left)"; annotation "block rung" | "sequence rung", "stretch rung"; "global furrow statistics", "+ sequence-scope dictionary", "+ stretch-scope dictionary"; "furrows" throughout; "A stretch rung worth 1 bit… (¾ of what the sequence left)" |

### `figures/missed-a.js`

| builder | used on | label now | should say |
|---|---|---|---|
| `maWhichWhat` | `hypotheses-two-localities` | kpi "given the previous entry"; "what they store: 8 channels"; file header "which entries are wanted" | "given the previous cherry"; "what they store: 8 furrows" |
| `maMiBars` | `hypotheses-bits-are-the-unit` | rows "thread known"; table header "one entry of a Maine Coon block", "thread known" | "sequence known"; "one cherry of a Maine Coon stretch" |
| `maSpread` | `hypotheses-the-trap` | any "channel" in tiles or legend | "furrow" |
| `maKnob` | not used (fallen-apple page uses `appleCurve`) | "block size b", "100K-token request", "per-block dictionary" | "stretch length b", "100K-token sequence", "stretch-scope dictionary" (if another Part reuses it) |

### `figures/questions.js`

Not used by Part VII in the end (`qDistance`, `qReplay` were candidates for the fallen-apple and
heavy-stretch pages). If Part X reuses them: `qDistance` has "request share", "per-request world",
"natural block scale", "per-request dictionaries, not block ones"; `qReplay` has "block size", "blocks",
"per-request dictionaries", "hot cache of 2k slots".

## New builders wanted

### `hypStereo` (file: `figures/idea.js` or a new `figures/hypotheses.js`), page `hypotheses-stereo`

A small two-panel figure of the measured facts, replacing the two tables on the page.

- **Panel A, "the same element in the two heads".** A scatter of `v[t, l, 0, c]` against `v[t, l, 1, c]`
  for one `elem_id` over one punnet (synthetic stand-in: the toy of the page's listing, two random
  projections of a 64-dimensional latent plus noise, seeded), with the cosine printed: near 0. A toggle
  "token-to-token distances" switches the scatter to the distance between two random tokens in head 0
  against the same pair's distance in head 1, with the correlation printed: high. Axes labelled with
  the Python forms; a note that the real data gave cosine 0.04–0.06 and distance correlation 0.25 (KV
  layer 0) to 0.92 (KV layer 4), 36 punnets.
- **Panel B, "bits the heads share".** Three bars, in bits per element: raw 0.85; after one reference
  cherry serves both heads 0.54; after each head has its own reference 0.21 (r9 iter-1-2, 4 punnets,
  code-length bound). Beside them the measured join: `(256,)` 0.6604 → `(2, 256)` 0.6281, −0.0322 ±
  0.0009, 20 of 20 sequences (r24 iter-1-3), drawn as 20 paired points if `figures/data/measured-splits.json`
  carries them, else as a bar with its spread.
- Colours: `T('stereo')` for the heads, `series()` for the bars; readout with the three bound numbers.

### `hypEcho` (same file), page `hypotheses-echo`

One panel, "where the reference tree's links point", by KV layer.

- Six small horizontal rows, one per KV layer (labelled "KV layer 0 (3)" … "KV layer 5 (23)"). Each row
  is a histogram of link distance `|t − t_ref|` on a log scale (1, 2–8, 9–64, 65–512, 513–4096) with the
  measured share within 8 tokens marked: 9 / 37 / 47 / 39 / 7 / 12 % (r6 iter-2-1, 24 punnets). The
  remaining mass may be drawn schematically (flagged as illustrative) unless the per-bin data exists.
- Right of each row, a tiny tree glyph: a hub (one node with 12–22 spokes) for KV layers 0, 4, 5 and a
  chain (a path of 6–10 nodes) for 1, 2, 3, with the largest degree and the coded link cost printed
  (14 / 8 / 6 / 10 / 22 / 12; 9.8 / 7.4 / 6.6 / 7.4 / 10.0 / 9.6 bits).
- A toggle "shuffle the tokens" that greys the histograms and prints the shuffle result for the tree
  compressor: 0.6907 → 0.7520 (r12 iter-1-2).
- Colours: `T('echo')` for the far bins and hubs, `T('fallen-apple')` for the within-8 bins and chains.
