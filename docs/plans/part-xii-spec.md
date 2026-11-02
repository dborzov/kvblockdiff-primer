# Part XII — "The interesting range", and the reference-setting switch: the specification

Written 2026-11-01 by the orchestrator. Every writer, the figure author and the engine maintainer work from
this sheet. Numbers come from Part XI's pinned sheet (`experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1)
and from the site's own frozen reference setting (III.10); the new ones are derived here, with the arithmetic shown.

## 0. What is being built

Two things.

**A. Part XII, "The interesting range"** (`content/12-range/`, id XII, slug `range`, emblem `flame`, colour
`--part-XII: var(--sage)`, figures `figures/range.js`). Seven pages that take two of the human's conjectures
seriously, correct them where the data says otherwise, and then design the mechanism that follows:

1. The human's conjecture that "about half the bits go to the dictionary, so about half the information in a KV
   entry is shared across the block" is examined with the information theory on the table. The verdict: the
   dictionary share of a tree coder is bookkeeping (the dictionary is made of entries), so it does not measure
   shared information; what measures it is the gain over solo coding, and that is about a fifth of the bits, with
   more reachable at sequence scope. A description length of a model is never a mutual information.
2. The human's point that the interesting range of designs is where block dictionaries are too large to keep
   resident by default and must live in host memory, with a cache mechanism at block level that promotes
   "popular" blocks ("on fire"), asynchronously loads their dictionary, then serves their misses as deltas, and
   demotes them ("ice") when the selector moves on. The two boring corners are named: tiny dictionaries (which
   reduce to per-entry coding, worth 1.1–1.3× and explained by order-0 entropy) and all-resident heavy
   dictionaries (which reduce to keeping half the history in GPU memory). The napkin for the on-fire mechanism is
   worked out with measured points on the compressibility curve, and it is honest: on the Pin a tree coder's
   dictionary (half the block) is expensive in GPU memory, so the mechanism pays only with few blocks on fire,
   or when the resident dictionary replaces hot-cache slots (lever 2), or with a lighter point on the curve.
3. The chain from bytes on the link to requests per GPU, to tokens per second, to dollars per million tokens,
   with every assumed number marked, so a research result can be read as an engineering impact.
4. A second reference setting, "the Bench" (the campaigns' Qwen3.5-2B on the author's RTX 5080), next to
   "the Pin", and a page explaining both.

**B. The reference-setting switch** (engine work in `data/`, `lib/`, `theme/`): a selector in the top bar that
chooses the current reference setting; hover reminders for terms and symbols that show the concrete sizes and
dimensions in the chosen setting; an inline macro `[[@key]]` that renders a setting-dependent number and
updates live; a `KV.settings` API for figures. Section 5.

## 1. Pinned numbers (receipts in Part XI's spec unless stated)

### 1.1 From the campaigns (values of Qwen3.5-2B, FP8 E4M3, 4096-token blocks unless stated)
- Solo ideal, six layers: 0.778 (6.22 bits per element); best real solo coder 0.804 (§1.3).
- Tree coder 121 on one layer's entries (512 B): ratio 0.6364 = dictionary share **0.525** + delta share **0.112**;
  about 80 % of deltas empty, the rest 0.5–0.75 of an entry; cold decode reads mean 120, worst 226 entries' worth (§1.5, §1.9).
- Light no-tree coder 129 on layer entries: ratio 0.6863 = **0.021** + **0.665** (§1.7); on token entries 0.6622 (0.042 dictionary).
- Block floors: ≈0.60 at 16,384 tokens (exact model), ≈0.57 for a whole sequence (extrapolation) (§1.10).
- The memory table (one window): model intact 1.35 bits/value; attention cut beyond 16K tokens 3.49; state reset and attention over the last 2,048 tokens 5.16; coder 102 5.13 (§1.10).
- Entry splits: joining the two heads saves 0.0322; joining all six layers a further 0.0043; given everything else,
  adjacent layers share 0.03–0.08 bit per element, further layers ≈0.01, the two heads 0.19–1.19 bits (§1.6, §1.10).
- Dictionary share does not predict the ratio: all good tree coders sit at 0.43–0.54; coder 91 at 0.56 and coder 101 (every delta
  empty, in-process test) differ by +0.00004; coder 109, the ledger's every-delta-empty coder on the same screen, sits at x = its ratio
  0.69–0.72, within 0.001 of 91; coder 129 at 0.02 scores 0.686 (§1.9).
- **Measured points on the compressibility curve under a dictionary budget** (campaign C1, values of layer 3, head 0, coder 30,
  4096-token blocks, no read budget; `research/ASK_HUMAN.md` r1.Q1 and `research/c1/KNOWLEDGE.md` budget/*; to be
  re-verified from the ledgers by the data task below): dictionary share ≤ 0.02 → ratio 0.7532; ≤ 0.10 → 0.7095;
  ≤ 0.25 → 0.6906; unconstrained (share 0.36) → 0.6815; solo 0.804. The curve is convex: 2 % of dictionary buys 42 % of
  the gain, 10 % buys 77 %. Delta share = ratio − dictionary share: 0.733 / 0.610 / 0.441 / 0.322.
  Plus the C2 tree point on layer entries (0.525, 0.112) and the all-dictionary point (1.0, 0).

### 1.2 The Pin (III.10, unchanged) and derived numbers (III.11, VI.15)
N_L = 78 layers, k = 2048, L = 100,384 tokens, d ≈ 640, e = 640 B, m = 30 / 13.4 / 6.7 % at B = 2048 / 4096 / 8192,
TPOT = 30 ms, W_link = 50 GB/s, M_HBM = 30 GB. Misses per layer per step at B = 4096: 0.134 × 2048 ≈ 274.
HiSparse at B = 4096: T_step ≈ 13.7 MB, M_req ≈ 205 MB, N = 109 (link-bound; memory would allow 147).
Formulas: `figures/homework-b.js` `econ()` (T_step, M_req, N_link, N_HBM, N).

### 1.3 The on-fire napkin (derived here; the figure recomputes it live)
With a block of b = 4096 tokens and the tree coder's point (x = 0.525, y = 0.112):
- one block's dictionary = x · b · e = 0.525 × 4096 × 640 B ≈ **1.38 MB per layer**, ≈ 107 MB over 78 layers; that is 0.525 of a 4096-slot hot cache per layer.
- a δ-miss saves (1 − y) e ≈ 0.89 e; a load costs x b e; so a dictionary pays for itself after **x b / (1 − y) ≈ 2,420 δ-misses** in its block (versus b = 4,096 for prefetching the whole block raw).
- if a share f_D of the 274 misses per layer per step land in n_D on-fire blocks, each gets f_D · 274 / n_D misses per step, so break-even takes 2,420 · n_D / (f_D · 274) steps: 42 steps at n_D = 4, f_D = 0.85; 30 steps at n_D = 1, f_D = 0.3. The trace has 1,799 steps.
- link bytes per step: 13.7 MB × [f_D · y + (1 − f_D)] + n_load · 78 · 1.38 MB. At f_D = 0.85: 3.4 MB of misses plus loads (0.05 loads per step per layer → 5.4 MB; 0.01 → 1.1 MB).
- GPU memory per request: 205 MB (hot cache) + n_D × 107 MB. n_D = 4 → 633 MB → **memory allows only 47 requests**, below HiSparse's 109; n_D = 1 → 312 MB → 96. **On the Pin, heavy on-fire dictionaries are bound by GPU memory, not by the link.**
- Lever 2 variant ("the dictionary replaces the hot-cache slots of its block"): the hot cache needs about (1 − f_D) · B slots for cold blocks, so memory ≈ N_L e [(1 − f_D) B + n_D x b]. At n_D = 1, f_D = 0.3: ≈ 5,000 entries' worth per layer → ≈ 250 MB → about 120 requests, 1.1×. At n_D = 4, f_D = 0.85: 460 MB → 65.
- A lighter point on the curve changes the picture: at x = 0.10 (y = 0.61) a dictionary is 410 entries' worth (0.26 MB per layer, a tenth of a hot cache), pays for itself after ≈1,050 δ-misses, and four of them cost 40 % of a hot cache; the saving per δ-miss is 0.39 e instead of 0.89 e. The figure lets the reader slide along the measured curve.

### 1.4 From bits to dollars (derived; the price is an assumption)
- Decode batch per GPU = N concurrent requests (VI.15). Tokens per second per GPU: TPS = N / TPOT. Pin, HiSparse: 109 / 0.030 s ≈ **3,630 tokens per second per GPU**; at N = 138 (request-scope dictionary, VI.16): ≈ 4,600.
- Cost per million output tokens = (price per GPU-hour) / (TPS × 3600) × 10⁶. At an **assumed** USD 3 per H200-hour: 3 / (3,630 × 3,600) × 10⁶ ≈ **USD 0.23 per million tokens** at N = 109; ≈ USD 0.18 at N = 138. The ratio of costs is the inverse ratio of N; the price cancels out of every comparison.
- Throughput scales with N only while the GPU is bound by the link or by memory, which is the regime of III.5; it does not model compute, prefill, or batching limits of the kernel.

### 1.5 The Bench (the second reference setting; the campaigns' rig)
Model Qwen3.5-2B (24 layers, 6 with a KV cache; 2 KV heads × 256; GQA with 8 query heads; partial RoPE); entry per layer:
values 512 elements = 512 B at 8 bits, keys the same, so keys + values 1,024 B (the plan's entry) — the campaigns coded
values alone (512 B); one token over six layers 3,072 B of values; sequences 219,678–229,360 tokens (use L = 225K);
block sizes measured 512 / 4,096 / 16,384 / 32,768; FP8 E4M3 with one power-of-two scale per layer and tensor;
the machine: one NVIDIA RTX 5080, 16 GB of GDDR7, PCIe 5.0 ×16 (64 GB/s nominal; use W_link = 50 GB/s like the Pin
until measured), weights ≈ 4 GB in bf16 → M_HBM ≈ 10 GB for KV (assumed headroom); Ryzen 7 9700X host.
No sparse-attention selector was run, so k, the miss rates and TPOT are **not measured** on the Bench; the Bench is the
data-side setting (shapes, bytes, block sizes, measured ratios), the Pin is the deployment-side one. The Bench's
measured delta ratios: tree coder 0.636 (0.525 + 0.112), light coder 0.686 (0.021 + 0.665), solo 0.778.

## 2. The pages (content/12-range/)

House style in full (docs/style/house-style.md). 600–1100 words of prose each; takeaways after every section; cards per section;
figures explain themselves; `::: aside source Receipts` where numbers appear; our words (the Part XI translation table).

| file | id | title | group | sections | figures | defines |
|---|---|---|---|---|---|---|
| 01-what-the-half-means.md | range-what-the-half-means | What the half says, and what it does not | Information | the-conjecture, bookkeeping, what-measures-sharing | rngShareVsRatio | block-redundancy |
| 02-shared-across-the-block.md | range-shared-across-the-block | Shared across the block, in bits | Information | the-ladder, the-entity, beyond-the-block | rngEntropyLadder | — |
| 03-two-boring-corners.md | range-two-boring-corners | The two boring corners | The design | tiny-dictionaries, all-resident, the-range-between | rngCorners | interesting-range |
| 04-on-fire.md | range-on-fire | On fire and ice: a dictionary cache at block level | The design | the-mechanism, what-a-miss-costs, fire-is-prefetch | rngFireStates, rngFireTrace | on-fire, popularity |
| 05-the-napkin-for-fire.md | range-the-napkin-for-fire | The napkin for on fire | The design | break-even, memory-binds, along-the-curve | rngFireNapkin | — |
| 06-from-bits-to-dollars.md | range-from-bits-to-dollars | From bits to dollars | Economics | the-chain, the-calculator, what-it-does-not-say | rngDollars | decode-throughput, cost-per-token |
| 07-two-settings.md | range-two-settings | Two reference settings: the Pin and the Bench | Settings | the-bench, side-by-side, the-switch | rngSettings | bench-setting |

Page briefs:

**XII.1 What the half says.** Hook: the human's sentence, quoted as a conjecture: "about half the bits go to the dictionary, so
about half the information in a KV entry is shared across the block." Section the-conjecture: why it is a natural reading
(the compressibility curve of VIII.6 drew x as "dictionary cost" and y as "delta", as if x measured what is shared).
Section bookkeeping: the tree coder's dictionary is made of entries (XI.9): moving every entry into it costs +0.00004;
a reference entry costs the same per element inside or outside; so x is where the bytes were filed, and the campaign's points
sit at x from 0.02 to 1.00 with ratios 0.64 to 0.72 (figure `rngShareVsRatio`: dictionary share against ratio for every verified
point of XI, showing no relation; data from `measured-points.json`). The light coder makes the opposite case: a dictionary of
2 % that buys 0.09 of ratio. A dictionary's size is the description length of a model, not a mutual information. Section
what-measures-sharing: define [[=block-redundancy]] (the bits per element the entries of a block share: the sum of their
solo entropies minus their joint entropy, divided by the elements; the most any per-block coder can save over solo). Link
[[mutual-information]], [[conditional-entropy]], [[redundancy]] (II). What the campaign measured are *lower bounds* on it:
solo 6.22 → best coder 5.09 bits (1.13 bits, 18 %) → exact-model block floor ≈4.8 (1.4 bits, 23 %). So "about a fifth", not
a half; and the deeper point the human reached for is right: there is an information quantity behind the curve, and the
roofline is its lower envelope. Math: $\vH$ of the block versus the sum, with the site's macros only; one display equation.

**XII.2 Shared across the block.** Section the-ladder (figure `rngEntropyLadder`: nested bars in bits per element: raw 8;
solo 6.22; the light coder 5.49 (0.686); the tree coder 5.09 (0.636); the block floor ≈4.8 (0.60, exact model); the sequence
floor ≈4.56 (0.57, extrapolation); the model with its memory cut 5.16 and intact 1.35 (one window); each labelled with its
grade; data from `measured-memory.json`, `measured-ladders.json`). Section the-entity: the human's second question, what
changes when the entity is several adjacent layers: the measured answer (joining the heads 0.032, joining all six layers
0.004; adjacent layers share 0.03–0.08 bit given the rest, the heads 0.19–1.19; layers group by kind): the thing to join is the
two heads, and a tower of layers adds almost nothing once each layer has its reference; link [[#measured-cutting-the-tensor]],
[[upstairs]]. Section beyond-the-block: what is shared with the *sequence* rather than the block (the whole-sequence pool
bound, 0.26–0.45 bit below 16K; the memory table's 3.49 → 5.16): most of what is left in a block is shared with text far away,
which is why the right scope is the sequence; connect to [[scope-request]] and [[#measured-where-the-bits-come-from]].

**XII.3 The two boring corners.** Section tiny-dictionaries: the per-entry corner: a dictionary so small it is always resident is
the solo coder plus a per-block rule; per-entry coding is the first thing anyone tries, the literature's answer is 1.1–1.3×
([[#homework-solo-coding]], [[#papers-splitzip]]), the order-0 entropy of a bell-shaped E4M3 channel is 6.47 bits
([[#homework-the-budget]]), and the campaigns' light coder tops out at 0.686 on layer entries: the information theory says why
there is no more there. Section all-resident: the other corner: keep every block's dictionary resident; with a tree coder that
is half the history in GPU memory, and the calculator of XI.13 shows what happens (11 requests per GPU against 109); it reduces
to "keep the history in HBM", the thing HiSparse exists to avoid. Section the-range-between: define [[=interesting-range]]:
dictionaries large enough to carry the block's shared structure, too large to keep resident for every block, kept in host
memory and brought to the GPU only for blocks the selector keeps wanting; this is the [[dictionary-cache]] of IV.4 and the
[[heavy-block]] bet of IV.10, now with measured sizes; the compressibility curve (VIII.6) is the map of this range: figure
`rngCorners` marks the two corners and the range on the measured curve (points of §1.1).

**XII.4 On fire and ice.** Section the-mechanism: the design as the human described it, in our words: a counter per block
(define [[=popularity]]: the running count of misses, or selections, a block receives over a window of recent steps); states:
ice (nothing resident; misses move raw entries, as HiSparse), warming (popularity rising; still raw), on fire (define
[[=on-fire]]: the block's dictionary is being loaded asynchronously, then is resident; its misses move deltas), cooling
(popularity falling; the dictionary is dropped when a hotter block needs the space). Figure `rngFireStates`: a Diagram of the
state machine with the byte cost of a miss in each state. Section what-a-miss-costs: with the tree coder resident, a miss on
an entry that sits inside the dictionary moves nothing (it is already on the GPU; the decoder reads ~120 entries' worth of
dictionary from GPU memory), a miss on a leaf moves 0.5–0.75 e; averaged, 0.112 e; with a light point on the curve
(x = 0.10) every miss moves 0.61 e. Section fire-is-prefetch: the honest comparison: setting a block on fire is a prefetch
of half the block in compressed form; against prefetching the whole block raw it halves the load and adds small deltas;
against HiSparse it trades a load of x b e against (1 − y) e per δ-miss. Figure `rngFireTrace`: a seeded toy trace (like
III.7 and VIII.7): a selector whose popularity concentrates on a few blocks that drift over time; three policies replayed
(HiSparse raw misses; whole-block prefetch when popular; on-fire dictionaries), bytes over the link per step plotted, with
sliders for the popularity threshold and n_D; clearly labelled as a toy, not a trace. Themes: `access-pattern`,
`amortize`, `side-info`.

**XII.5 The napkin for on fire.** Section break-even: the arithmetic of §1.3, as display equations with the site's macros
($\vw/\vb$ or x in words, $\vrho$ for the delta share, $\ve$, $\vb$, $\vfD$, $\vnD$, $\vnload$, $\vm$, $\vk$); 2,420
δ-misses; 30–42 steps; the load-rate condition of VI.17 restated with measured numbers. Section memory-binds: the
GPU-memory side: one on-fire dictionary is 0.525 of a hot cache per layer; n_D = 4 → 47 requests per GPU; the lever-2 variant
(the dictionary replaces the hot-cache slots of its block) and its numbers; the conclusion that on the Pin the heavy point is
memory-bound and the mechanism pays with few blocks on fire or with lever 2; on a machine with more HBM per link byte it
pays sooner. Section along-the-curve: the measured convex curve (§1.1) and what each point implies for load, saving per miss and
memory; figure `rngFireNapkin`: sliders for the point on the curve (snapping to the measured points), n_D, f_D, n_load, the
lever-2 toggle; outputs T_step, M_req, N_link, N_HBM, N, break-even steps; compared with HiSparse at the same B; uses
`KV.settings` for the rig (the Pin by default; the Bench shows "no selector measured" for the miss-side numbers).

**XII.6 From bits to dollars.** Section the-chain: the metric chain, one definition per link: bytes per miss (ρ e) → bytes per
step per request (T_step) → requests per GPU (N, the decode batch) → tokens per second per GPU (define [[=decode-throughput]],
symbol $\vtps = \vN / \vtpot$) → cost per million output tokens (define [[=cost-per-token]], symbol $\vcost = \vprice / (\vtps
\cdot 3600) \cdot 10^6$ with $\vprice$ the price of one GPU-hour, **assumed**). Worked example of §1.4 with the Pin.
Section the-calculator: figure `rngDollars`: inputs N (or a scenario from VI.16: HiSparse 109, solo 124, request scope 138,
the on-fire napkin's result), TPOT, price per GPU-hour (slider, default USD 3, marked assumed); outputs TPS and cost per
million tokens, and the ratio against HiSparse. Section what-it-does-not-say: the model counts bytes and memory only;
compute, prefill, kernel batching limits, latency targets and the price of host memory are outside it; the ratio against
HiSparse is the number that transfers, the dollar figure is not. Theme `bits-unit` or `every-tax` if real. Correct the human
where needed: "bigger decode batch because the link binds less" is right in the link-bound regime; once memory binds, batch
is set by GPU memory and only lever 2 moves it (VI.16's lesson).

**XII.7 Two reference settings.** Section the-bench: define [[=bench-setting]] (brand, nick "the Bench", emblem `flask`,
colour ["#5f8a52", "#a5cf8f"]): the campaigns' rig as a second frozen setting, with its table (§1.5) and what is not measured
on it. Section side-by-side: the two settings in one table (figure `rngSettings`: a card table driven by `KV.settings`, with
the chosen one highlighted and the differences outlined; the derived numbers per setting where defined). Section the-switch:
how the selector in the top bar works, what follows it (hover reminders of terms and symbols, `[[@key]]` numbers, the
figures of this Part), what does not (prose written for the Pin stays the Pin's), and the rule for writers (new pages use
`[[@key]]` for setting-dependent numbers). Link [[#landscape-reference-setting]] and [[#measured-the-data]].

Terms (data/terms/range.yaml, one file, written by the writers in turn — W-A creates it with its terms, W-B and W-C append;
coordinate by appending only):
| id | label | name | cat | home | short |
|---|---|---|---|---|---|
| block-redundancy | block redundancy | block redundancy (shared information per element) | info | range-what-the-half-means | The bits per element that the entries of a block share: the sum of their solo entropies minus their joint entropy, per element. The most any per-block coder can save over solo coding. |
| interesting-range | the interesting range | the interesting range of dictionaries | project | range-two-boring-corners | Dictionaries large enough to carry a block's shared structure and too large to keep resident for every block: kept in host memory, brought to the GPU for the blocks the selector keeps wanting. |
| on-fire | on fire | an on-fire block | project | range-on-fire | A block whose popularity crossed the threshold, so its dictionary has been loaded into GPU memory and its misses travel as deltas; the opposite state is ice. |
| popularity | popularity | block popularity | systems | range-on-fire | The running count of misses (or selections) a block has received over a window of recent decode steps; the statistic that decides which blocks are on fire. |
| decode-throughput | tokens per second | decode throughput per GPU | systems | range-from-bits-to-dollars | Output tokens one GPU produces per second across all its concurrent requests: the requests it serves divided by the time per output token. |
| cost-per-token | cost per million tokens | cost per million output tokens | project | range-from-bits-to-dollars | The price of one GPU-hour divided by the tokens that hour produces, scaled to a million; the price is an assumption, the ratio between two designs is not. |
| bench-setting | the Bench | the Bench (the campaigns' reference setting) | project | range-two-settings | The second frozen setting: Qwen3.5-2B's six KV layers, 2 heads × 256, 512-byte value entries, 225K-token coding-agent transcripts, FP8, on one RTX 5080 with a 50 GB/s link; the data-side twin of the Pin. brand: true, nick "the Bench", emblem flask, color ["#5f8a52", "#a5cf8f"] |

Symbols (data/symbols/range.yaml): `tps` { tex: "\\mathrm{TPS}", fam: resource, name: tokens per second per GPU, unit: "tokens/s", home: range-from-bits-to-dollars };
`price` { tex: "P", fam: resource, name: price of one GPU-hour, unit: USD/hour, home: range-from-bits-to-dollars };
`cost` { tex: "\\mathrm{cost}_{1\\mathrm{M}}", fam: resource, name: cost per million output tokens, unit: USD, home: range-from-bits-to-dollars }.
(P is free: the taken letters are listed in Part XI's notes/05 §3. Run `node scripts/validate-data.mjs`.)

## 3. Figures (figures/range.js, builders `FIG.rng*`, data from figures/data/measured-*.json and figures/data/range-curve.json)

| builder | page | what it draws |
|---|---|---|
| rngShareVsRatio | XII.1 | scatter: dictionary share (x, 0–1) against MDL ratio (y) for every verified point of `measured-points.json` (C2 incumbents and C1 ladder), colour by entry split; annotate 129 (0.02, 0.686), 91 → 101/109 (0.56 → 1.00, same ratio); a dashed horizontal band for "all good tree coders 0.63–0.69"; readout: the correlation between share and ratio among tree coders (compute it). Bits axis on the right. |
| rngEntropyLadder | XII.2 | nested horizontal bars in bits per element: raw 8 · solo 6.22 · light coder 5.49 · tree coder 5.09 · block floor 4.80 (exact model) · sequence floor 4.56 (extrapolation) · model, memory cut 5.16 · model intact 1.35 (one window); each bar labelled with ratio, bits, "share of solo saved" and its grade; hover for receipts. |
| rngCorners | XII.3 | the measured compressibility curve (points of §1.1 from `range-curve.json`: (0.02, 0.733), (0.10, 0.610), (0.25, 0.441), (0.36, 0.322), the C2 tree point (0.525, 0.112), and (1.0, 0)), the baseline x + y = 1, solo at y = 0.778 (and 0.804 coded for layer 3), with the two corners shaded ("per-entry coding", "half the history resident") and the interesting range between; hover for the campaign receipt of each point. |
| rngFireStates | XII.4 | a Diagram of the four states (ice → warming → on fire → cooling → ice) with transitions labelled by the popularity threshold, and under each state the bytes a miss moves (raw e; raw e; 0 or 0.5–0.75 e, mean y e; raw e) and whether a dictionary load is in flight; a `seg` to switch between the tree point and the x = 0.10 point. |
| rngFireTrace | XII.4 | a seeded toy replay (300 steps): L/b = 25 blocks; a selector whose 274 misses per layer per step concentrate on a few blocks with a concentration slider (share of misses in the top blocks) and slow drift (the hot set moves every ~60 steps); three policies: HiSparse (raw), whole-block prefetch when a block's popularity crosses the threshold, on-fire dictionaries (load x b e asynchronously over a few steps, then δ-misses at y e); plot link bytes per step for the three, cumulative bytes as readouts, the number of loads, and GPU memory in use; sliders: threshold, n_D, the point on the curve (tree or x = 0.10); caption text by the writer, but the builder shows "toy, not a trace" in a fig-note. |
| rngFireNapkin | XII.5 | the calculator of §1.3: a slider along the measured curve (snapping to its points, showing x, y), n_D, f_D, n_load sliders, a lever-2 toggle ("the dictionary replaces the hot-cache slots of its block"), B seg (2K/4K/8K); outputs as kpis: T_step, M_req, N_link, N_HBM, N and the ratio to HiSparse at the same B, break-even δ-misses and steps; a bar chart like `hwbCalculator`'s rows; uses `KV.settings` for the rig (and `KV.setting`; on the Bench, show the miss-side outputs as "not measured on the Bench"). Copy `econ()` from homework-b.js; do not import across files. |
| rngDollars | XII.6 | the chain as a row of kpis: N → TPS → cost per 1M tokens; inputs: a scenario seg (HiSparse 109 · solo 124 · request scope 138 · on-fire napkin's current N if available, else 120) or a free N slider, TPOT, price per GPU-hour (default 3, marked assumed); outputs with the ratio to HiSparse; a small bar chart of cost per million tokens per scenario. Uses `KV.settings` for TPOT (the Bench: TPOT not measured → say so). |
| rngSettings | XII.7 | a two-column card table of both settings from `KV.settings` (every key with its unit and "not measured" where null), the chosen setting highlighted, rows that differ outlined; a button that switches the setting (calls the engine's `KV.setSetting(id)`), so the page demonstrates the switch. |

Rules: colours via CSS variables; `series(i)` by entity; legends; readouts; mark toys, exact models and assumptions in a fig-note; fail loudly on missing data; phone width and dark mode.

## 4. Data task (analysis + JSON)
- `figures/data/range-curve.json`: the budgeted points of §1.1 re-read from the C1 ledgers (`research/agents/r1/ledger.jsonl`, coder 30-copy-shrink and the `x_max` tracks; KNOWLEDGE budget/*), with trial ids, plus the C2 tree point (env-t0096) and 129 (r25-t0003), written by a small addition to `analysis/measured_extract.py` or a new `analysis/range_extract.py` (stdlib only, KVCR_REPO env, read-only on the experiments repo). If a budget point cannot be found in a ledger row, keep the ASK_HUMAN number and mark `grade: "page"`.

## 5. The reference-setting switch (engine; maintainer work)

Files: `data/settings.yaml` (new), `lib/data.js` (load + validate), `lib/markdown.js` (the `[[@key]]` inline), `eleventy.config.js`
(expose settings in `siteDataJs` as `KV.settings`, `KV.settingDefault`), `theme/layouts/base.njk` (the selector in the top bar, next to the
theme button), `theme/assets/js/core.js` (state, event, live updates, the extra line in term and symbol reminders), `theme/assets/css/site.css`
(selector and `.refv` styles, tokens only), `docs/style/house-style.md` and `docs/site/figures.md` (how to use it), `scripts/validate-data.mjs` (validate settings).

`data/settings.yaml`:
```yaml
# The frozen reference settings. Every setting has the same keys; null = not measured in that setting.
default: pin
keys:                      # key: {name, unit, fmt}   fmt: int | bytes | pct | ms | gbps | gb | text
  model: {name: model, fmt: text}
  NL: {name: layers with a KV cache, unit: layers, fmt: int}
  heads: {name: KV heads per layer, fmt: int}
  headdim: {name: elements per head, fmt: int}
  d: {name: elements per entry, unit: elements, fmt: int}
  e: {name: entry size, unit: bytes, fmt: bytes}
  k: {name: selections per layer per step, fmt: int}
  L: {name: context length, unit: tokens, fmt: int}
  b: {name: block size used in examples, unit: tokens, fmt: int}
  m2: {name: miss rate at 2048 slots, fmt: pct}
  m4: {name: miss rate at 4096 slots, fmt: pct}
  m8: {name: miss rate at 8192 slots, fmt: pct}
  tpot: {name: time per output token, unit: ms, fmt: ms}
  Wlink: {name: link bandwidth, unit: GB/s, fmt: gbps}
  Mhbm: {name: GPU memory for KV, unit: GB, fmt: gb}
  gpu: {name: GPU, fmt: text}
  format: {name: storage format, fmt: text}
settings:
  pin:
    label: the Pin
    name: GLM-5.1 on 8 × H200, as HiSparse serves it, at 8-bit storage
    home: landscape-reference-setting
    values: {model: GLM-5.1, NL: 78, heads: null, headdim: null, d: 640, e: 640, k: 2048, L: 100384, b: 4096, m2: 0.30, m4: 0.134, m8: 0.067, tpot: 30, Wlink: 50, Mhbm: 30, gpu: "H200 (141 GB)", format: "8-bit (E4M3)"}
  bench:
    label: the Bench
    name: Qwen3.5-2B on one RTX 5080, the campaigns' data
    home: range-two-settings
    values: {model: Qwen3.5-2B, NL: 6, heads: 2, headdim: 256, d: 512, e: 512, k: null, L: 225000, b: 4096, m2: null, m4: null, m8: null, tpot: null, Wlink: 50, Mhbm: 10, gpu: "RTX 5080 (16 GB)", format: "FP8 E4M3, values"}
```
Behaviour:
- `[[@e]]` in Markdown renders `<span class="refv" data-key="e">640 B</span>` with the default setting's formatted value at build time; `[[@e|…]]` is not needed. An unknown key is a build error. The client updates every `.refv` on `kv:setting`. Null renders as "not measured (the Bench)".
- Terms may carry `ref:` in their YAML: a template with `{key}` placeholders, e.g. for `entry`: `ref: "{d} elements, {e} per entry; {NL} layers keep one per token"`; the reminder popover gets a last line "In {label}: …" filled from the current setting, and "not measured" for nulls. Symbols may carry `ref: <key>`: the popover shows "In the Pin: 640 B · in the Bench: 512 B" (both settings, current first). Add `ref:` to the core terms `entry`, `block`, `kv-cache`, `hot-cache`, `reference-setting`, `head`, `layer` and to the symbols `e`, `d`, `NL`, `k`, `L`, `b`, `tpot`, `Wlink`, `Mhbm`, `m`, `B` (B: "2048 / 4096 / 8192 slots in the examples").
- The selector: a small pill in the top bar, right of the deck count, showing the current label with a pin/flask emblem; click cycles or opens a two-item menu; keyboard accessible; state in `localStorage` `kvp.setting` via `KV.store`; `KV.setting`, `KV.settings`, `KV.ref(key)` (value in the current setting), `KV.refFmt(key)` (formatted), `KV.setSetting(id)`; event `kv:setting` on `document` with `{detail: id}`. Figures that care subscribe to the event.
- Nothing else changes: existing prose keeps its numbers; the glossary and notation pages render as before (the popovers gain the line).
- Tests: `STRICT=1 npm run build` clean; `node scripts/validate-data.mjs` clean; `NODE_PATH=/attic/olde-llm-maths/tests/node_modules node scripts/check.mjs _site --pages landscape/reference-setting,landscape/kv-cache,homework/economics,reference/glossary,reference/notation,measured/the-data --shots --out .cache/shots-settings` clean at both widths and `--dark`; a tiny Playwright script of your own that switches the setting and asserts a `.refv` text changed and a popover shows the "In the Bench" line.

## 6. Site edits (orchestrator)
- parts.yaml, `--part-XII`, "Twelve parts" (done). `content/index.md`: mention the switch in "How to read this site". `content/03-landscape/10-reference-setting.md`: a `::: note connection` to XII.7 and the switch. `content/10-reference/01-summary.md`: one bullet under "What was measured" pointing to XII.4/5. `docs/site/page-plan.md`: XII. README: the switch.
