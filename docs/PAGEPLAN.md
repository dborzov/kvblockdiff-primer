# Page plan

The table of contents with every page's **id** (used by `[[#id]]` references), file, and scope.
Ids are `<part slug>-<file name without its number>`. Writers: create exactly these files, so the
references others write to your pages resolve. If you must split or add a page, append it at the end of
your Part (next free number) and say so in your report; never renumber existing pages.

Scope notes say what each page must cover. Everything listed under **defines** is defined on that page
(`[[=id]]` or `::: define id`); the full term list with home pages is in `data/terms/core.yaml`.

## I. The tiny-file problem — `content/01-tiny-files/` (figures: `figures/tiny.js`)

| # | id | title | scope |
|---|---|---|---|
| I.1 | `tiny-files-notice-anything` | Notice anything? | DONE (exemplar). Gull Rock JSON messages; what repeats; lossless vs lossy; one message alone barely compresses. |
| I.2 | `tiny-files-one-at-a-time` | Why one message alone won't shrink | How a general compressor works in one picture: LZ matching (copy from earlier) plus entropy coding of the rest (just the intuition, details in Part II). With one small message there is nothing earlier to copy. Live: concatenating more messages, bytes per message fall. Defines `zstd`, `lz-match`. |
| I.3 | `tiny-files-trained-dictionary` | The trained dictionary | zstd's answer: train a dictionary on sample messages, ship it once, compress each message against it. Live pako demo with a dictionary (≈148 → ≈20 bytes). Defines `dictionary`, `delta`, `trained-dictionary`; symbols `D`, `delta`. |
| I.4 | `tiny-files-three-lessons` | Three lessons from the dictionary | (1) the redundancy was always there — the access pattern hid it; (2) the dictionary moves cost in time: pay once, profit per message — break-even figure; (3) the receiver must actually have the dictionary. Themes: amortize, side-info, access-pattern. |
| I.5 | `tiny-files-vectors-not-text` | Our files are lists of numbers | Swap text for numbers: readings as lists of numbers share no byte strings, yet share a shape. Matching becomes *predicting*; store only the leftover. First appearance of predict-then-correct. Plain words only (vectors/channels are defined in Part II). |
| I.6 | `tiny-files-profile` | The profile of a dictionary problem | The two conditions (an ensemble of alike items; tiny independent fetches). Where the site goes from here (map of Parts). The "loose words → our words" table from the first draft, each row linking to the page that defines our word. |

## II. Back to school — `content/02-school/` (figures: `figures/school-info.js`, `figures/school-vectors.js`)

Toy world for the whole Part (see II.1): the Gull Rock station (sky symbol: sunny ½, cloudy ¼, rain ⅛, fog ⅛;
four sensors; a second thermometer high on the mast; an 8-bit chip), the radio link paid by the bit, the
harbour office (a desk with room for a few logbooks; the archive downstairs; a slow lift).

| # | id | title | scope |
|---|---|---|---|
| II.1 | `school-why-school` | Why go back to school? | DONE (exemplar). Plan, toy world, concept map. |
| II.2 | `school-bits` | Bits: twenty questions | A bit as one yes/no answer; n bits tell 2ⁿ things apart; log₂; telegraph cost per bit. Defines `bit`. |
| II.3 | `school-surprise` | Surprise | Probability, distributions, surprisal −log₂ p; why rare = more bits; the sky symbol. Defines `probability`, `distribution`, `surprisal`; symbol `p`. |
| II.4 | `school-entropy` | Entropy: the average surprise | H = average surprisal (1.75 bits for the sky); interactive bars; histogram as an estimate; order-0 entropy (ignores context); perplexity as 2^H and why we use bits. Defines `entropy`, `order-0-entropy`, `perplexity`, `histogram`; symbols `H`, `X`, `i`. |
| II.5 | `school-side-information` | Side information | The season almanac on both ends; H(X\|Y); joint table season×sky; never more on average. Defines `side-information`, `conditional-entropy`; symbol `Y`. |
| II.6 | `school-mutual-information` | Mutual information | I(X;Y) = H(X) − H(X\|Y); redundancy, similarity, predictability = the same bits; "conditioning never hurts (on average)". Defines `mutual-information`, `redundancy`; symbol `I`. |
| II.7 | `school-codes` | Codes and Huffman | Codewords, prefix codes, Huffman for the sky (0, 10, 110, 111) — average 1.75 bits; code length ≈ surprisal; whole bits only. Defines `code`, `huffman`. |
| II.8 | `school-arithmetic` | Arithmetic coding and rANS | Fractions of a bit; coding with a model; cross-entropy = price of a wrong model; streams decode front to back. Defines `entropy-coder`, `arithmetic-coding`, `rans`, `cross-entropy`. |
| II.9 | `school-fixed-length` | Fixed-length codes and escapes | Wind speeds in n bits; rare gales escape into an escape stream; random access; the speed-vs-bits trade. Defines `fixed-length-code`, `escape`, `random-access`; symbols `n`, `eps`. |
| II.10 | `school-prediction` | Predict, then send the surprise | Temperature now ≈ temperature 30 minutes ago; residuals; exact integer residuals; DPCM / FLAC / PNG. Defines `prediction`, `residual`, `predictive-coding`; symbols `x`, `xhat`, `r`. |
| II.11 | `school-residual-shapes` | The shape of a residual | Mean, variance, standard deviation; Gaussian and Laplace shapes; bits of a Gaussian ≈ log₂ σ + const (halve σ, save a bit); Monte Carlo. Defines `mean`, `variance`, `standard-deviation`, `gaussian`, `laplace`, `monte-carlo`; symbols `mu`, `sigma`, `beta`. |
| II.12 | `school-exchange-rate` | The exchange rate: variance explained → bits | R²; residual variance (1−R²)σ²; bits saved ½log₂ 1/(1−R²); 75 % → 1 bit, 94 % → 2 bits; interactive. Defines `r-squared`; symbol `Rsq`. |
| II.13 | `school-vectors` | Vectors and channels | A reading as a vector of d numbers; a channel = one position across many vectors (one sensor's column); per-channel location and scale; subtracting each channel's typical value. Defines `vector`, `channel`; symbols `d`, `c`. |
| II.14 | `school-correlation` | Channels that move together | Covariance, correlation, the two thermometers on the mast; the covariance matrix. Defines `covariance`, `covariance-matrix`. |
| II.15 | `school-rotation` | Turning the axes (KLT) | Rotate the two-thermometer cloud: average + difference; eigenvectors/eigenvalues as natural axes and their variances; KLT = PCA. Defines `rotation`, `eigenvalue`, `klt`, `pca`; symbol `lambda`. |
| II.16 | `school-coding-gain` | What the rotation buys | Transform coding gain ½log₂(AM/GM); spiky vs flat spectra; low rank; lossless rotations need integer lifting. Defines `transform-coding-gain`, `am-gm`, `low-rank`, `lifting`. |
| II.17 | `school-clusters` | Clusters and codebooks (VQ) | Weather regimes as clusters; centroids; k-means; VQ; naming a centroid costs log₂ C bits (the index tax); lossless VQ = centroid as prediction + residual. Defines `centroid`, `k-means`, `codebook`, `vq`, `index-tax`; symbol `C`. |
| II.18 | `school-vq-vs-klt` | Codebooks versus rotations | When VQ beats a rotation (clustered data) and when it cannot (Gaussian data: rate–distortion bound); product quantization. Compare block. Defines `product-quantization`, `rate-distortion`; symbol `nsub`. |
| II.19 | `school-integers-floats` | Integers and floats | INT8 with a scale (uniform grid); floating point (sign, exponent, mantissa); BF16; relative precision; the mantissa's low bits look like noise. Defines `integer-grid`, `floating-point`, `exponent`, `bf16`. |
| II.20 | `school-fp8` | Eight-bit floats and index space | FP8 E4M3/E5M2; the logarithmic grid; quantization; numbering grid points (index space); why a residual near zero is many steps. Defines `fp8`, `quantization`, `index-space`. |
| II.21 | `school-caches` | The forecaster's desk | Caches, hits and misses, eviction, LRU on the harbour desk; simulator. Defines `cache`, `hit-miss`, `eviction`, `lru`. |
| II.22 | `school-reuse-distance` | Reuse distance | Stack distance; misses iff distance ≥ B; the miss-rate curve m(B); Bélády. Defines `reuse-distance`, `miss-rate-curve`, `belady`; symbol `m`. |
| II.23 | `school-wires` | Wires and memories | Bandwidth vs latency; the real names: HBM, host DRAM, PCIe; GPU; scattered small reads; ~100× gap. Defines `bandwidth`, `hbm`, `dram`, `pcie`. |
| II.24 | `school-amortization` | Pay once, use many times | Amortization: a fixed cost over many users; break-even; the almanac and the ferry ticket; 8w/b preview in toy units. Defines `amortization`. |
| II.25 | `school-recap` | School’s out: a cheat sheet | One table: idea → one line → where it is used later; the concept map again; invitation to practise flashcards. |

## III. Where things stand — `content/03-landscape/` (figures: `figures/landscape.js`)

| # | id | title | scope |
|---|---|---|---|
| III.1 | `landscape-tokens-and-decoding` | How a language model writes | Tokens, layers, hidden state, prefill vs decode, one token per step, TPOT, context length L, N_L. Defines `token`, `prefill-decode`, `layer`, `tpot`; symbols `t`, `l`, `L`, `NL`, `tpot`. |
| III.2 | `landscape-attention` | Attention: looking back | Query/key/value as a soft lookup; scores, softmax; heads and GQA; the decode loop in Python. Defines `attention`, `head`; symbols `q`, `h`. |
| III.3 | `landscape-kv-cache` | The KV cache and the entry | Why keys/values are stored; the entry E[l,t] and its size e; RoPE (keys before vs after); MLA. Defines `kv-cache`, `entry`, `rope`, `mla`; symbols `e`, `E`, `K`, `V`. |
| III.4 | `landscape-sparse-attention` | Sparse attention and the indexer | Top-k selection per layer per step; DSA's lightning indexer; compute stops growing, storage does not; the indexer announces demand in advance. Defines `sparse-attention`, `indexer`, `dsa`; symbols `k`, `S`. |
| III.5 | `landscape-memory-wall` | Everything must be kept | 13 GB of BF16 KV at 128K; naive fetch-everything-per-step math; ~7 GB/s per request; a dozen requests saturate PCIe. |
| III.6 | `landscape-hisparse` | HiSparse: a library with a reading desk | History in host DRAM, hot cache of B slots in HBM, LRU, the resolve step in Python; outputs unchanged. Defines `hisparse`, `hot-cache`; symbol `B`. |
| III.7 | `landscape-toy-trace` | Watching the hot cache work | Interactive stepper of the toy trace (16 entries, B = 6, k = 4): hits, misses, evictions; a miss costs e bytes on the link and a slot costs e bytes of HBM. |
| III.8 | `landscape-lucky-louis` | The Lucky Louis property | Why LRU hits so often: queries drift slowly; HiSparse's numbers (30 / 13.4 / 6.7 %; Bélády 8.2 %). It is about which entries, not their bytes. Defines `lucky-louis`. |
| III.9 | `landscape-reuse-curve` | One curve behind every cache number | m(B) ∝ B^−1.08 through HiSparse's points; double the cache, halve the misses; the eviction lever is nearly exhausted. |
| III.10 | `landscape-reference-setting` | The reference setting | The frozen numbers table and why we freeze them. Defines `reference-setting`; symbols `Wlink`, `Mhbm`. |
| III.11 | `landscape-derived-numbers` | Three numbers and a deadline | Misses per layer per step, miss traffic per request, HBM per request, link-bound vs memory-bound request counts, the 0.38 ms window, "decoder ≥ 10× faster than the link". |

## IV. The idea — `content/04-idea/` (figures: `figures/idea.js`)

| # | id | title | scope |
|---|---|---|---|
| IV.1 | `idea-mapping` | The idea, mapped onto the tiny files | Side-by-side mapping zstd ↔ kv-blockdiff (tiny file → entry, corpus → block, dictionary → D_j, delta …). Defines `kv-blockdiff`. |
| IV.2 | `idea-dictionary-delta-block` | Dictionary, delta, block — precisely | Definitions with sizes: block of b tokens; dictionary weight w; delta ratio ρ; the block is a knob. Defines `block`, `weight`, `delta-ratio`; symbols `b`, `w`, `rho`, `j`, `dsz`, `Dsz`. |
| IV.3 | `idea-size-relations` | How big is each piece? | w e + b ρ e per block; deltas dominate; the dictionary is a small tax; a worked example with numbers. |
| IV.4 | `idea-blockdiff-step-by-step` | kv-blockdiff, step by step | Dictionary cache of n_D dictionaries; δ-miss vs raw miss; f_D; resolve step in Python. Defines `dictionary-cache`, `delta-miss`, `raw-miss`, `delta-miss-fraction`; symbols `nD`, `fD`. |
| IV.5 | `idea-toy-trace` | The same trace, with dictionaries | Interactive stepper: same hits and evictions as III.7, only the bytes per miss change. |
| IV.6 | `idea-data-layout` | The access pattern decides the layout | Random-access store: independence, addressability, asymmetry, dictionaries as units; bulk stream vs random access; encode cost Fermi estimate. |
| IV.7 | `idea-neighbour-similarity` | Neighbour similarity | The umbrella hypothesis; measured in bits; axes of the KV tensor. Defines `neighbour`. |
| IV.8 | `idea-fallen-apple` | Fallen-apple similarity | Token-axis neighbours; a curve over Δ, not a threshold; easy confusions. Defines `fallen-apple`; symbol `gap`. |
| IV.9 | `idea-upstairs` | Upstairs similarity | Layer-axis neighbours; why it matters; second priority. Defines `upstairs`. |
| IV.10 | `idea-heavy-blocks` | Lucky Louis, block by block | Selections concentrating into heavy blocks for many steps; why residency needs it. Defines `heavy-block`. |
| IV.11 | `idea-cat-thread-ladder` | The cat-thread ladder | The intuitive argument (three rungs) told as a story. Defines `cat-ladder`. |
| IV.12 | `idea-what-is-right` | What the ladder gets right | Conditioning never increases entropy (direction is a theorem); bits are the unit; sameness of subject is real. |
| IV.13 | `idea-the-leak` | The leak: hit rate is about queries | Live Monte Carlo: i.i.d. keys, drifting query (η slider) → HiSparse-like hit rates with zero compressibility. Symbol `eta`. |
| IV.14 | `idea-the-trap` | The trap: the exchange rate is harsh | Variance budget calculator: global / thread / block / noise → bits per rung; outlier channels as the escape hatch. |
| IV.15 | `idea-two-levers` | What "better than HiSparse" means | N = min(N_link, N_HBM); lever 1 cheaper misses, lever 2 cheaper slots; compounding ρ²; the metrics. Defines `lever`; symbols `N`, `Nlink`, `Nhbm`. |

## V. Papers — `content/05-papers/` (figures: `figures/papers-a.js`, `figures/papers-b.js`)

| # | id | title | scope |
|---|---|---|---|
| V.1 | `papers-reading-guide` | How we read papers | What we look for in each paper (lossy/lossless, which path, dictionary scope, what it measures, what transfers); a concept map of all papers; the rule: their words → our words. |
| V.2 | `papers-hisparse` | HiSparse (2026) | The system we sit under, as a paper: claims, evidence, numbers we reuse, what it does not show. |
| V.3 | `papers-sparse-selectors` | Sparse-attention selectors: DSA, NSA, Quest, CSA | What each selects and keeps; why our work is indifferent to the selector. |
| V.4 | `papers-splitzip` | SplitZip (2026) | Lossless exponent coding of KV for transfer: fixed 4-bit codes + escapes; 1.32× BF16, 1.14× E5M2; our solo-coding baseline; what it cannot tell us. |
| V.5 | `papers-float-coders` | ZipNN, DFloat11 and friends | Lossless float coders: exponent redundancy, mantissa is noise; numbers; relevance. |
| V.6 | `papers-kv-codec` | KV-Codec (2026) | Video-codec ideas for remote KV reuse; token-axis slicing; weak evidence for fallen-apple at BF16. |
| V.7 | `papers-kivi` | KIVI (2024) | 2-bit KV quantization; keys per channel, values per token — translated: which statistics, along which axis; what it says about structure and what it does not. |
| V.8 | `papers-kvquant` | KVQuant (2024) | Pre-RoPE keys, non-uniform quantization, outliers; what it suggests for us (store K pre-RoPE). |
| V.9 | `papers-kvtc` | KVTC (2026) | Transform coding of KV (PCA + adaptive quantization + entropy coding), lossy; our KLT bound as its lossless shadow. |
| V.10 | `papers-lexico` | Lexico (2024) | Sparse coding over a universal dictionary; evidence that structure is global; why global scope is a real rung. |
| V.11 | `papers-cachegen` | CacheGen (2024) | Adjacent-token deltas + arithmetic coding for network transfer; lossy; token-adjacent similarity at quantized precision. |
| V.12 | `papers-kvcomp` | KVComp (2025) | GPU Huffman decoding of quantized KV; their judgement that predictors are not worth it, and why their setting differs from ours. |
| V.13 | `papers-classics` | The classics we lean on | Slepian–Wolf / Wyner–Ziv (side information at the decoder), Mattson stack distance, Bélády, PLUS/lifting factorizations, lossless JPEG 2000 — each in one page section. |
| V.14 | `papers-what-would-be-new` | What would be new | The gap all these leave open, in three bullets, with the evidence for each. |

## VI. Homework — `content/06-homework/` (figures: `figures/homework-a.js`, `figures/homework-b.js`)

| # | id | title | scope |
|---|---|---|---|
| VI.1 | `homework-the-budget` | The bit budget | An 8-bit KV element is one of ~254 codes used unevenly; order-0 entropy ≈ 6.5 bits (E4M3 Gaussian), 6.19 (SplitZip E5M2); what is left for dictionaries. Defines `bpe`; symbol `bpe`. |
| VI.2 | `homework-solo-coding` | Solo coding: the Hermit | Rung 0: a global context-free code per channel; ~1.1–1.3×; the baseline every dictionary must beat. Defines `solo`. |
| VI.3 | `homework-exchange-rate` | The exchange rate, applied | II.12's formula on KV numbers; the R² figure (75 % → 1 bit, 94 % → 2 bits); "lossless is a game of variance explained". |
| VI.4 | `homework-dictionary-shape` | The shape of every dictionary coder | Predict, exact integer residual, code the residual; the per-entry side channel is the tax; four types preview. |
| VI.5 | `homework-loc` | loc: the Anchor | Per-channel location + scale; w ≈ 2; no tax; ½log₂(σ²_total/σ²_within); captures drift and outlier channels. Defines `loc`. |
| VI.6 | `homework-klt` | KLT: the Compass, at work | The KLT as a dictionary: full basis w = 2d vs rank-16 w = 32; gain ½log₂ AM/GM on standardized data; needs a sharply spiky spectrum. |
| VI.7 | `homework-vq` | VQ: the Hive, at work | Index tax log₂ C; cannot beat the untaxed rotation on Gaussian data; the Monte Carlo check (correlated vs clustered). |
| VI.8 | `homework-sib` | sib: the Twin | Predict from the nearest sibling; noise doubles; residency tie-in. Defines `sib`. |
| VI.9 | `homework-four-side-by-side` | The four dictionaries side by side | The comparison table, fully explained, with every symbol defined; when each wins; the cast as a family. |
| VI.10 | `homework-two-rates` | Two rates for everything | Entropy rate (scientific) vs fixed-length rate (engineering); the 10–15 % gap. Defines `entropy-rate`, `fixed-length-rate`. |
| VI.11 | `homework-the-grid` | The 8-bit grid gives and takes | E4M3 log grid vs INT8 uniform: solo coding favours E4M3, prediction favours INT8; live Monte Carlo; the per-channel "predict or not" flag. |
| VI.12 | `homework-where-bits-come-from` | Where the bits would come from | The prior: keys pre-RoPE (outlier channels), values (weak), number format; to be replaced by data. |
| VI.13 | `homework-scope` | Dictionary scope: global, request, block | The three scopes, nested; the cost table; scope gains. Defines `scope`, `scope-global`, `scope-request`, `scope-block`, `scope-gain`; symbols `gainreq`, `gainblk`. |
| VI.14 | `homework-amortization-rule` | The amortization rule | 8w/b bits per element; max useful block size per type; "128K-token blocks" is scope request. Interactive plot. |
| VI.15 | `homework-economics` | The economics, written out | T_step and M_req with every cost; HiSparse as the special case. Symbols `Tstep`, `Mreq`, `nload`, `wres`. |
| VI.16 | `homework-calculator` | A what-if calculator | The calculator (all inputs editable) + the bar chart of scenarios. |
| VI.17 | `homework-break-even` | Two break-even conditions | Dictionary loads (n_load w ≪ 274) and decode throughput (≥ ~50 GB/s; fixed-length decoders have headroom). |
| VI.18 | `homework-rehearsal` | A synthetic dress rehearsal | The method run on synthetic data with known structure; the shuffle control; what the plots must look like. Defines `shuffle-control`. |

## VII. What Dima missed — `content/07-missed/` (figures: `figures/missed-a.js`, `figures/missed-b.js`)

Each page: what the first draft said (quote it), why that is wrong or incomplete, a slow primer with
examples and a figure or worked example, what changes in the plan, links to where it is worked out.

| # | id | title |
|---|---|---|
| VII.1 | `missed-about` | About this Part: the first draft, and why corrections are a gift |
| VII.2 | `missed-two-localities` | Two localities were merged |
| VII.3 | `missed-mutual-information-direction` | Predictability is mutual information, not its reverse |
| VII.4 | `missed-block-is-a-knob` | The block is a knob, not a property |
| VII.5 | `missed-vq-then-code` | "VQ, then entropy-code the error" cannot beat a rotation on Gaussian data |
| VII.6 | `missed-harsh-exchange-rate` | Lossless is a game of variance explained |
| VII.7 | `missed-mantissa-and-grid` | The mantissa is noise, and the 8-bit grid is not neutral |
| VII.8 | `missed-access-pattern` | The access pattern decides the codec's shape |
| VII.9 | `missed-predictive-coding` | The real home of the problem: predictive coding with side information |
| VII.10 | `missed-lifting` | Lifting: how a rotation becomes lossless |
| VII.11 | `missed-context-modeling` | Context modelling never loses (defines `context-modeling`) |
| VII.12 | `missed-stack-distance` | The stack-distance curve behind every cache number |
| VII.13 | `missed-rate-distortion-bounds` | Bounds before building |
| VII.14 | `missed-light-dictionaries-first` | Light dictionaries first |
| VII.15 | `missed-keys-before-rope` | Keys before RoPE; keys and values as separate problems |
| VII.16 | `missed-victim-tier` | A victim tier of deltas (defines `victim-tier`; symbol `BV`) |
| VII.17 | `missed-a-measurement-is-a-result` | A measurement is a result |

## VIII. The questions — `content/08-questions/` (figures: `figures/questions.js`)

| # | id | title |
|---|---|---|
| VIII.1 | `questions-two-kinds` | Two kinds of questions (big-picture vs experiment-framework; the map Q1–Q3 → A–D → waves) |
| VIII.2 | `questions-q1` | Q1: what is KV's fallen-apple similarity like? |
| VIII.3 | `questions-q2` | Q2: can a dictionary + delta store beat raw storage? |
| VIII.4 | `questions-q3` | Q3: do misses concentrate in few, long-lived blocks? |
| VIII.5 | `questions-framework-a` | Framework A: bits versus distance |
| VIII.6 | `questions-framework-b` | Framework B: the compressibility curve and its roofline (defines `curve`, `roofline`) |
| VIII.7 | `questions-framework-c` | Framework C: where do misses land? |
| VIII.8 | `questions-framework-d` | Framework D: requests per GPU |
| VIII.9 | `questions-parked-dictionaries` | Parked: free and shared dictionaries (indexer keys, anchors, shared prefixes, rate allocation) |
| VIII.10 | `questions-parked-measurements` | Parked: other neighbours and other splits (upstairs groups, GQA heads, prefill vs generated, surprising misses) |
| VIII.11 | `questions-parked-automation` | Parked: automated search and compressibility as a probe |

## IX. The plan — `content/09-plan/` (figures: `figures/plan.js`)

| # | id | title |
|---|---|---|
| IX.1 | `plan-harness-interface` | The harness: one interface (defines `harness`) |
| IX.2 | `plan-accounting` | One accounting rule for every rung |
| IX.3 | `plan-controls` | Four controls, built before any real data |
| IX.4 | `plan-data` | The data behind the harness |
| IX.5 | `plan-fp8-target` | Step 0: the exact 8-bit target |
| IX.6 | `plan-experiment-1a` | Experiment 1a: the one-hour diagnostic |
| IX.7 | `plan-experiment-1b` | Experiment 1b: the exact lossless ladder |
| IX.8 | `plan-wave1-outputs` | What wave 1 produces |
| IX.9 | `plan-decision-rule` | The decision rule |
| IX.10 | `plan-wave2-indexer` | Wave 2: simulating the indexer |
| IX.11 | `plan-wave2-measure` | Wave 2: what to measure |
| IX.12 | `plan-cost-model-and-paper` | The cost model, and the paper in every outcome |
| IX.13 | `plan-fixed-choices` | Fixed choices and their assumptions |
| IX.14 | `plan-ignored` | Ignored on purpose |
| IX.15 | `plan-risks` | Weak spots, risks and pivots |

## X. Summary and reference — `content/10-reference/`

| # | id | title |
|---|---|---|
| X.1 | `reference-summary` | The one-page summary |
| X.2 | `reference-glossary` | Glossary (generated) |
| X.3 | `reference-notation` | Notation and its colours (generated) |
| X.4 | `reference-themes` | Running themes (generated) |
| X.5 | `reference-numbers` | Grounded numbers and their sources |
| X.6 | `reference-fp8-facts` | FP8 E4M3 facts used by the coder |
| X.7 | `reference-prior-art-map` | Prior-art map |
| X.8 | `reference-references` | References |
