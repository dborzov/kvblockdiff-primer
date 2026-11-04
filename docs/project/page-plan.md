# Page plan

The table of contents of the site with every page's **id** (the `[[#id]]` target), file and scope.
Ids are `<part slug>-<file name without its number>`. Every page listed here exists; a writer who must
split or add a page appends it at the end of its Part (next free number) and adds the row here.

**Defines** lists the glossary ids whose single definition (`[[=id]]` or `::: define id`) lives on that
page. Core terms are in `data/terms/core.yaml` with `home:` set to these pages; a Part's own terms go in
`data/terms/<slug>.yaml`. **Source** names the old pages (git history, `content/` before the 2026-11
rework) whose material the page reworks; writers reuse their figures, numbers and receipts, never their
words.

Reading order of Parts is dependency order: a term is defined before any page that uses it. The linker
warns when a page uses a term defined on a later page.

## I. The tiny-file problem — `content/01-tiny-files/`, slug `tiny-files`, figs `[tiny]`

| # | id | title | scope | defines |
|---|---|---|---|---|
| I.1 | `tiny-files-notice-anything` | Notice anything? | Gull Rock JSON messages; what repeats; lossless vs lossy; one message alone barely compresses. | `lossless`, `lossy` |
| I.2 | `tiny-files-one-at-a-time` | Why one message alone won't shrink | LZ matching + entropy coding in one picture; nothing earlier to copy. | `zstd`, `lz-match` |
| I.3 | `tiny-files-trained-dictionary` | The trained dictionary | zstd trains a dictionary, ships it once, compresses each message against it; the words dictionary and delta are born here. | `dictionary`, `delta`, `trained-dictionary` |
| I.4 | `tiny-files-three-lessons` | Three lessons from the dictionary | redundancy was always there; pay once, profit per message; the receiver must have it. | — |
| I.5 | `tiny-files-vectors-not-text` | Our files are lists of numbers | matching becomes predicting; store only the leftover. | — |
| I.6 | `tiny-files-profile` | The profile of a dictionary problem | the two conditions; the map of the site; the loose-words → our-words table (now the table of `docs/style/terminology.md` §4.1, every row linking to the defining page). | — |

## II. Back to school — `content/02-school/`, slug `school`, figs `[school-info, school-vectors]`

Pages II.1–II.12 (information theory) and II.19–II.25 (number formats, caches, wires, amortization, recap)
keep their ids, titles and scope from the old plan; the rework is vocabulary and the recap table. Pages
II.13–II.18 (vectors) are reworked around numpy listings with `.shape`.

| # | id | title | scope | defines |
|---|---|---|---|---|
| II.1 | `school-why-school` | Why go back to school? | the toy world, the plan, the concept map | — |
| II.2 | `school-bits` | Bits: twenty questions | | `bit` |
| II.3 | `school-surprise` | Surprise | | `probability`, `distribution`, `surprisal` |
| II.4 | `school-entropy` | Entropy: the average surprise | | `entropy`, `order-0-entropy`, `perplexity`, `histogram` |
| II.5 | `school-side-information` | Side information | | `side-information`, `conditional-entropy` |
| II.6 | `school-mutual-information` | Mutual information | | `mutual-information`, `redundancy` |
| II.7 | `school-codes` | Codes and Huffman | | `code`, `huffman` |
| II.8 | `school-arithmetic` | Arithmetic coding and rANS | | `entropy-coder`, `arithmetic-coding`, `rans`, `cross-entropy` |
| II.9 | `school-fixed-length` | Fixed-length codes and escapes | | `fixed-length-code`, `escape`, `random-access` |
| II.10 | `school-prediction` | Predict, then send the surprise | | `prediction`, `residual`, `predictive-coding` |
| II.11 | `school-residual-shapes` | The shape of a residual | | `mean`, `variance`, `standard-deviation`, `gaussian`, `laplace`, `monte-carlo` |
| II.12 | `school-exchange-rate` | The exchange rate: variance explained → bits | | `r-squared` |
| II.13 | `school-vectors` | Vectors, elements and furrows | a reading as a vector `r` of shape `(4,)`; an element and its `elem_id`; many readings stacked `R.shape == (n_readings, 4)`; a furrow `R[:, elem_id]`; per-furrow location and scale; standardizing. numpy throughout. | `vector`, `element`, `furrow`, `standardize` |
| II.14 | `school-correlation` | Furrows that move together | covariance, correlation, the two thermometers; `np.cov(R.T)`. | `covariance`, `covariance-matrix` |
| II.15 | `school-rotation` | Turning the axes (KLT) | | `rotation`, `eigenvalue`, `klt`, `pca` |
| II.16 | `school-coding-gain` | What the rotation buys | | `transform-coding-gain`, `am-gm`, `low-rank`, `lifting` |
| II.17 | `school-clusters` | Clusters and codebooks (VQ) | | `centroid`, `k-means`, `codebook`, `vq`, `index-tax` |
| II.18 | `school-vq-vs-klt` | Codebooks versus rotations | | `product-quantization`, `rate-distortion` |
| II.19 | `school-integers-floats` | Integers and floats | | `integer-grid`, `floating-point`, `exponent`, `bf16` |
| II.20 | `school-fp8` | Eight-bit floats and index space | | `fp8`, `quantization`, `index-space` |
| II.21 | `school-caches` | The forecaster's desk | | `cache`, `hit-miss`, `eviction`, `lru` |
| II.22 | `school-reuse-distance` | Reuse distance | | `reuse-distance`, `miss-rate-curve`, `belady` |
| II.23 | `school-wires` | Wires and memories | | `bandwidth`, `hbm`, `dram`, `pcie` |
| II.24 | `school-amortization` | Pay once, use many times | | `amortization` |
| II.25 | `school-recap` | School's out: a cheat sheet | the table idea → one line → where it is used later, with the new Part numbers | — |

## III. How an LLM reads its memory — `content/03-landscape/`, slug `landscape`, figs `[landscape]`

Every LLM-side term is introduced inside a listing from `docs/project/notation.md`, with `.shape` and
bytes at the Pin and the Bench. Source: old Part III, XII.7.

| # | id | title | scope | defines |
|---|---|---|---|---|
| III.1 | `landscape-tokens-and-decoding` | How an LLM writes | tokens and `token_pos_id`; a sequence; the LLM (always named: Qwen3.5-2B, GLM-5.1); layers, KV layers in hybrid LLMs, the hidden state; prefill vs decode; TPOT; context length. | `token`, `sequence`, `llm`, `layer`, `kv-layer`, `hidden-state`, `prefill-decode`, `tpot` |
| III.2 | `landscape-attention` | Attention: looking back | the soft lookup by hand; heads and GQA with `n_q_heads // n_kv_heads`; the full `decode_step` listing of notation.md §2 with shapes; the three lines that carry the story. | `attention`, `query`, `head` |
| III.3 | `landscape-orchard` | The orchard | why keys and values are kept; the orchard `k`, `v` of shape `(n_tokens, n_kv_layers, n_kv_heads, head_dim)`; the index names; one element, one V vector, one token's values at one layer, one furrow, with `[[~…]]` chips and bytes at both settings; "a store, not a cache"; sizes: 512 B / 3 072 B on the Bench, ≈ 640 B / 50 KB on the Pin. | `orchard` |
| III.4 | `landscape-rope-and-mla` | Two wrinkles: RoPE and MLA | RoPE before/after (figure `ropeSpin`), partial RoPE, keys recovered before RoPE; MLA's one latent per token per layer; what the orchard holds in each case. | `rope`, `mla` |
| III.5 | `landscape-sparse-attention` | Sparse attention and the indexer | top-k selection; the indexer listing; a pick `(layer_id, token_pos_id)`; what a pick is in DSA, GLM-5.1 (one selection for a group of layers) and DeepSeek-V4 (squeezed tokens); the three consequences; picks are announced before bytes move. | `sparse-attention`, `indexer`, `pick`, `dsa` |
| III.6 | `landscape-memory-wall` | Everything must be kept | 13 GB of BF16 at 128K; fetch-everything math; the link saturates with a dozen sequences. | `link` |
| III.7 | `landscape-hisparse` | HiSparse: a library with a reading desk | the orchard in host DRAM, the hot cache of `B` raw picks in HBM, LRU with a guard, the resolve step listing; a miss costs `e` bytes on the link, a slot `e` bytes of HBM. | `hisparse`, `hot-cache` |
| III.8 | `landscape-toy-trace` | Watching the hot cache work | interactive stepper (figure `toyTrace`): hits, misses, evictions. | — |
| III.9 | `landscape-lucky-louis` | The Lucky Louis property | why LRU hits so often; HiSparse's numbers; about which picks, not their bytes. | `lucky-louis` |
| III.10 | `landscape-reuse-curve` | One curve behind every cache number | `m(B) ∝ B^−1.08`; double the cache, halve the misses. | — |
| III.11 | `landscape-reference-settings` | Two reference settings: the Pin and the Bench | both frozen rigs side by side (table from `data/settings.yaml`), why we freeze, the pill in the top bar, what the Bench does not measure (no indexer ran: no `k`, no miss rates, no TPOT). Source: III.10 and XII.7. | `reference-setting`, `pin`, `bench`, `stand-in-llm` |
| III.12 | `landscape-derived-numbers` | Three numbers and a deadline | misses per layer per step (274 on the Pin), traffic per sequence, HBM per sequence, the 0.38 ms window, "decoder ≥ 10× faster than the link". | — |

## IV. The compression scenario — `content/04-scenario/`, slug `scenario`, figs `[scenario, plan]`

The standalone problem, taught slowly. Dense statement: `docs/project/scenario.md`. Source: IV.2, IV.6,
IX.1–IX.2, XI.3. New figures in `figures/scenario.js` (see §figures below).

| # | id | title | scope | defines |
|---|---|---|---|---|
| IV.1 | `scenario-the-project-and-its-subproblems` | The project, and its four subproblems | the bill of the application and its four factors; why each factor is a subproblem of its own (different data, tools, people; graded numbers the bill consumes); why the scenario is cut the way it is (each rule an access-pattern fact of the application); the other three subproblems in one line each with links to their pages (X.5, X.6, X.7, VI.9). Dense version for agents: `docs/project/subproblems.md`. | — |
| IV.2 | `scenario-one-cherry-at-a-time` | One cherry at a time | the hook: a receiver that asks for one small piece at random; sender and receiver; why we strip the application away (no hot cache, no link, no indexer) and what is left; the whole scenario on one card. | `sender-receiver`, `scenario` |
| IV.3 | `scenario-stretch` | The stretch: a knob, not a fact | `stretch_len` consecutive positions, `stretch_id = token_pos_id // stretch_len`; figure `blockKnob` (renamed `stretchKnob`); nothing in the orchard marks a stretch; sequence scope is one stretch as long as the sequence. | `stretch` |
| IV.4 | `scenario-slice` | The slice: what is in play | the slice as a Python slice of the orchard: K/V, layers, heads, elements; four worked slices with `.shape`; the campaigns' slice (values only); keys and values as separate problems. | `slice` |
| IV.5 | `scenario-cherry` | The cherry and its shape | one unit of ask-and-answer, the vectors of one position; `cherry(t)` as an index expression, `cherry_bytes`; the same slice diced three ways `v[t, l, h, :]` (256 elements), `v[t, l, :, :]` (512), `v[t, :, :, :]` (3072); two layers' V as two cherries `v[t, 1, 0, :]`, `v[t, 3, 0, :]` or as one `v[t, [1, 3], 0, :]` cherry: a different scenario; what the receiver may ask for differs. | `cherry`, `cherry-shape` |
| IV.6 | `scenario-punnet` | The punnet: what one dictionary serves | all cherries of one stretch under one slice and cherry shape; `punnet_size`; a punnet is not an orchard and not a stretch; figure of a stretch × slice → punnet. | `punnet` |
| IV.7 | `scenario-the-contract` | The contract | `deltas, dictionary = compress(punnet)`; `decompress(deltas[i], dictionary) == punnet[i]` bit for bit, cold; what the dictionary may be (statistics, a basis, a codebook, reference cherries, a small network's weights: opaque); what both sides know in advance; what is not charged (sender-side storage, delta lengths). | `contract`, `dictionary` is re-explained here with a reminder to I.3; `cold-decode` |
| IV.8 | `scenario-the-score` | The score: the MDL ratio | `(dict_bytes + Σ delta_bytes) / (punnet_size × cherry_bytes)`, the sum over every delta; the delta share and the dictionary share, written out; bits per element; the square (figure `msrCurve` moved here with the real points as decoration); neither share is a score, only the sum; paired comparison on the same punnets with a confidence interval; a compressor's curve and its lowest point; the roofline as the lowest MDL ratio of the scenario. | `mdl-ratio`, `dictionary-share`, `delta-share`, `bpe`, `curve`, `roofline` |
| IV.9 | `scenario-the-leash` | The leash | the trivial corner (whole punnet in the dictionary, empty deltas) and why it is useless for one-at-a-time asks; `reads ≤ leash × cherry_bytes` for every cherry, in the scenario's own cherry bytes; one leash per stretch length (512/137, 4096/293, 16 384/1103, whole sequence/14 503) because the share of the punnet one decode may read is what it limits; measured per cherry, cold, in a fresh process for the holdout measurement. | `leash`, `reads` |
| IV.10 | `scenario-scope` | Who pays for the dictionary: scope | stretch, sequence and global scope; the amortization rule `8w/b`; the calibration corpus; "sequence scope is a stretch as long as the sequence". Source: VI.13–14, IX.2 §who-pays, IX.4. | `scope`, `scope-stretch`, `scope-sequence`, `scope-global`, `weight`, `calibration-set` |
| IV.11 | `scenario-why-vary` | Why we vary the scenario | the two purposes: a probe of the orchard's information (the compressor is the instrument) and a map of applications (DeepSeek-V4 per-layer picks vs GLM-5.1 shared picks → cherry shapes and dictionary sharing); the scenario naming line; the catalogue table of scenarios run and worth running. | — |
| IV.12 | `scenario-compressors-and-stages` | Compressors: a graph of stages | `compress`/`decompress` as a dataflow graph; stage types in one picture (bit-field split, predictor, residual, entropy coder or fixed-length code, layout); the solo family; where Part V picks up. | `compressor`, `stage`, `solo` |
| IV.13 | `scenario-the-harness` | The harness: the referee | the three ways to compare unfairly (forgotten bill, peek at the answer, lost bit); what the harness checks: the contract per cherry in a fresh process, the leash per cherry, paired scores, the ledger; the campaigns' harness in one paragraph; the controls (shuffle, synthetic, round trip). Source: IX.1, IX.3, XI.3. | `harness`, `shuffle-control`, `verified-result` |
| IV.14 | `scenario-what-it-is-not` | What the scenario is not | not bulk compression of a sequence, not lossy, not a deployment model, not a GPU memory budget; the mapping to the application deferred to Part VI with one sentence on pick ↔ cherries. | — |

## V. The compressor's toolbox — `content/05-toolbox/`, slug `toolbox`, figs `[homework-a, missed-a, missed-b, plan, measured]`

One page per stage type: a gentle, example-first intro, numpy pseudocode, what it costs (dictionary
weight, per-cherry tax), when it wins, what the campaigns found with it (links to Part VIII). Source: VI.1–12,
VII.5, VII.7, VII.9–11, VII.13, XI.4, XI.5, XI.7, XI.8.

| # | id | title | scope | defines |
|---|---|---|---|---|
| V.1 | `toolbox-the-bill` | The shape of every compressor, and its bill | predict → exact residual → code; the bill: residual bits + per-cherry tax + dictionary share `8w/b`; the bit budget of an 8-bit element (order-0 entropy ≈ 6.2 bits on E4M3). Source: VI.1, VI.4, IX.2 §bill. | `cherry-tax`, `bill` |
| V.2 | `toolbox-solo` | Solo: the Hermit | per-furrow order-0 codes with a fixed table; 0.778 on the Bench's values; the baseline every dictionary must beat. Source: VI.2, XI.4. | — (`solo` is defined in IV.11) |
| V.3 | `toolbox-furrow-statistics` | Furrow statistics: the Anchor | a location and a scale per furrow; `w ≈ 2`; no tax; captures drift and outlier furrows. Source: VI.5. | `loc` |
| V.4 | `toolbox-klt` | KLT: the Compass, at work | a basis as a dictionary; full vs partial rank; needs a spiky spectrum; the campaigns' rotations. Source: VI.6, XI.7. | — |
| V.5 | `toolbox-vq` | VQ: the Hive, at work | index tax `log2 C`; cannot beat an untaxed rotation on Gaussian data; PQ; the campaigns' codebooks. Source: VI.7, VII.5, XI.7. | — |
| V.6 | `toolbox-reference-cherries` | Siblings and reference trees | predict from another cherry of the punnet: the sibling (the Twin); the reference tree (minimum spanning tree by distance); echoes; noise doubles. Source: VI.8, XI.4. | `sib`, `reference-cherry`, `reference-tree` |
| V.7 | `toolbox-linear-prediction` | Linear prediction across elements | predict an element from elements already decoded in the same cherry; the table stored once per punnet. Source: XI.5. | `linear-prediction` |
| V.8 | `toolbox-context-modelling` | Context modelling never loses | use the prediction as context instead of subtracting it. Source: VII.11. | `context-modeling` |
| V.9 | `toolbox-lifting` | Lifting: how a rotation becomes lossless | integer-reversible transforms; PLUS. Source: VII.10, V.13. | — |
| V.10 | `toolbox-bit-fields` | Splitting the bit fields | sign/exponent vs mantissa routed to different stages; the mantissa is noise; the 8-bit grid is not neutral (E4M3 vs INT8); index space. Source: VII.7, VI.11, IX.5, XI.10. | `bit-field-split`, `grid-aware-model` |
| V.11 | `toolbox-two-rates` | Two rates: entropy and fixed-length | the ideal rate vs the random-access rate; escapes; the 10–15 % gap; GPU decode. Source: VI.10, XI.8. | `entropy-rate`, `fixed-length-rate` |
| V.12 | `toolbox-exchange-rate` | The exchange rate, applied | variance explained → bits on KV numbers; 75 % → 1 bit; lossless is a game of variance explained. Source: VI.3, VII.6. | — |
| V.13 | `toolbox-bounds` | Bounds before building | rate–distortion and code-length bounds; the noise floor. Source: VII.13, XI.10 (the memory table). | `code-length-estimate` |
| V.14 | `toolbox-rehearsal` | A synthetic dress rehearsal | the method on synthetic punnets with known structure; what the plots must look like. Source: VI.18. | — |

## VI. kvblockdiff: the application — `content/06-application/`, slug `app`, figs `[idea, homework-b, range]`

Source: IV.1, IV.3–6, IV.15, VI.15–17, VII.16, XII.3–6.

| # | id | title | scope | defines |
|---|---|---|---|---|
| VI.1 | `app-mapping` | From the scenario to the serving system | picks ↔ cherries; the two pictures side by side (figure `ideaMapping`); kvblockdiff in one card. | `kvblockdiff` |
| VI.2 | `app-sizes` | How big is each piece? | `w·e + b·ρ·e` per punnet; deltas dominate; worked numbers at both settings. Source: IV.3. | — |
| VI.3 | `app-shelf-and-two-misses` | The shelf, and two kinds of miss | the dictionary shelf; δ-miss vs raw miss; `f_D`; the resolve listing of notation.md §5. | `dictionary-shelf`, `delta-miss`, `raw-miss`, `delta-miss-fraction` |
| VI.4 | `app-toy-trace` | The same trace, with dictionaries | stepper. Source: IV.5. | — |
| VI.5 | `app-data-layout` | The access pattern decides the layout | random access, addressability, encode offline; why the leash is the scenario's version of this. Source: IV.6. | — |
| VI.6 | `app-two-levers` | What "better than HiSparse" means | `N = min(N_link, N_HBM)`; lever 1, lever 2. Source: IV.15. | `lever` |
| VI.7 | `app-two-boring-corners` | The two boring corners | tiny dictionaries (solo) and all-resident heavy ones; the interesting range. Source: XII.3. | `interesting-range` |
| VI.8 | `app-on-fire` | On fire and ice: a shelf at stretch level | popularity, promotion, demotion, asynchronous loads. Source: XII.4. | `on-fire`, `popularity`, `heavy-stretch` |
| VI.9 | `app-the-napkin` | The napkin for on fire | break-even, memory binds, along the curve; the economics `T_step`, `M_req`, break-even conditions. Source: XII.5, VI.15, VI.17. | — |
| VI.10 | `app-calculator` | A what-if calculator | Source: VI.16. | — |
| VI.11 | `app-bits-to-dollars` | From bits to dollars | tokens per second, cost per million tokens. Source: XII.6. | `decode-throughput`, `cost-per-token` |
| VI.12 | `app-victim-tier` | A victim tier of deltas | Source: VII.16. | `victim-tier` |
| VI.13 | `app-which-application` | Which application, which scenario | DeepSeek-V4 per-layer picks vs GLM-5.1 shared picks; one dictionary per layer vs one for a group; which scenario measurements each design needs; the table. | — |

## VII. Hypotheses about the orchard — `content/07-hypotheses/`, slug `hypotheses`, figs `[idea, missed-a, questions]`

Each page: the hypothesis stated in bits; why one might believe it; how a scenario measures it; the verdict
so far with a link to Part VIII. Source: IV.7–14, VII.2–4, VII.6, VII.8, VII.12, VII.15, VIII.2–4.

| # | id | title | scope | defines |
|---|---|---|---|---|
| VII.1 | `hypotheses-bits-are-the-unit` | Bits are the unit | similarity that does not convert to bits does not count; predictability is mutual information; conditioning never hurts on average. Source: IV.12, VII.3. | — |
| VII.2 | `hypotheses-neighbour-similarity` | Neighbour similarity: the family | the umbrella; the axes of the orchard; the four members. Source: IV.7. | `neighbour` |
| VII.3 | `hypotheses-fallen-apple` | Fallen-apple similarity (token axis) | the curve over `Δ`; verdict: weak except in the middle layers. Source: IV.8, VIII.2. | `fallen-apple` |
| VII.4 | `hypotheses-upstairs` | Upstairs similarity (layer axis) | verdict: small, and by kind of layer. Source: IV.9. | `upstairs` |
| VII.5 | `hypotheses-stereo` | Stereo similarity (head axis) | two views of one vector; cosine ≈ 0 yet 0.85 bit per element shared; verdict: the strongest structure measured. New. | `stereo` |
| VII.6 | `hypotheses-echo` | Echo similarity (repeats) | a far repeat of the same token predicts a cherry; reference trees live on echoes; hubs vs chains; verdict: the axis that mattered. New. | `echo` |
| VII.7 | `hypotheses-two-localities` | Two localities, kept apart | which picks are wanted vs what is inside them. Source: VII.2, IV.10. | — |
| VII.8 | `hypotheses-heavy-stretches` | Lucky Louis, stretch by stretch | do picks pile into few stretches for many steps? unmeasured on the Bench (no indexer ran); what a pick trace would show. Source: IV.10, VIII.4. | — |
| VII.9 | `hypotheses-the-ladder` | The cat-sequence ladder | the intuitive argument and what it gets right. Source: IV.11–12. | `cat-ladder` |
| VII.10 | `hypotheses-the-leak` | The leak: hit rate is about queries | Monte Carlo with drifting queries and i.i.d. keys. Source: IV.13. | `leak` |
| VII.11 | `hypotheses-the-trap` | The trap: the exchange rate is harsh | variance budget per rung. Source: IV.14. | `trap` |
| VII.12 | `hypotheses-keys-and-values` | Keys before RoPE; keys and values apart | why keys are a separate problem; what C1 saw on keys. Source: VII.15, notes/04. | — |
| VII.13 | `hypotheses-stack-distance` | The stack-distance curve behind every cache number | Source: VII.12. | — |

## VIII. The measurements — `content/08-measured/`, slug `measured`, figs `[measured, range]`

The campaigns' dispatch, retold. Ids kept from old Part XI (the experiment-repo notes cite them).
Source: XI.1–13, XII.1–2.

| # | id | title | scope | defines |
|---|---|---|---|---|
| VIII.1 | `measured-dispatch` | A dispatch from the harness | | `campaign` |
| VIII.2 | `measured-the-data` | The data on the table | the LLM, the text, the bytes, the orchard as exported `(228144, 6, 2, 256)`. | — |
| VIII.3 | `measured-rules-of-the-game` | The rules of the game, as scenarios | the campaigns' tracks written as scenarios of Part IV; the screen; what "verified" meant; the leash's birth at 11:20 UTC. | `screen` |
| VIII.4 | `measured-night-one` | Night one: the twin ladder | | — |
| VIII.5 | `measured-two-kinds-of-structure` | Two kinds of structure | | — |
| VIII.6 | `measured-cutting-the-tensor` | Cutting the orchard: cherry shapes compared | heads joined (stereo), layers joined, adjacent tokens joined; same-window comparison. | `same-window` |
| VIII.7 | `measured-codebooks-and-rotations` | Codebooks and rotations | | — |
| VIII.8 | `measured-time-and-bits` | Sound, time and bits | | — |
| VIII.9 | `measured-reading-one-cherry` | Reading one cherry | the leash's cost. | — |
| VIII.10 | `measured-where-the-bits-come-from` | Where the bits come from | | `shared-table` |
| VIII.11 | `measured-signal-or-noise` | Signal or noise | | `paired-difference` |
| VIII.12 | `measured-scorecard` | The scorecard | | — |
| VIII.13 | `measured-what-it-means` | What it means for kvblockdiff | | — |
| VIII.14 | `measured-what-the-half-means` | What the half says, and what it does not | Source: XII.1. | `punnet-redundancy` |
| VIII.15 | `measured-shared-across-the-stretch` | Shared across the stretch, in bits | Source: XII.2. | — |

## IX. Papers — `content/09-papers/`, slug `papers`, figs `[papers-a, papers-b]`

Every page follows the template in `docs/papers/template.md`. Ids kept.

| # | id | title |
|---|---|---|
| IX.1 | `papers-reading-guide` | How we read papers (the template, the trust order, the concept map) |
| IX.2 | `papers-hisparse` | HiSparse (2026) |
| IX.3 | `papers-sparse-selectors` | Sparse-attention selectors: DSA, NSA, Quest, CSA, DeepSeek-V4 |
| IX.4 | `papers-splitzip` | SplitZip (2026) |
| IX.5 | `papers-float-coders` | ZipNN, DFloat11 and friends |
| IX.6 | `papers-kv-codec` | KVFetcher (2026) (the system the first draft called KV-Codec; id kept) |
| IX.7 | `papers-kivi` | KIVI (2024) |
| IX.8 | `papers-kvquant` | KVQuant (2024) |
| IX.9 | `papers-kvtc` | KVTC (2026) |
| IX.10 | `papers-lexico` | Lexico (2024) |
| IX.11 | `papers-cachegen` | CacheGen (2024) |
| IX.12 | `papers-kvcomp` | KVComp (2025) |
| IX.13 | `papers-classics` | The classics we lean on |
| IX.14 | `papers-what-would-be-new` | What would be new |

Defines: `data-path`, `disaggregation` (IX.4), `slepian-wolf`, `plus-factorization` (IX.13), `scale-group`
(IX.7), `sparse-coding` (IX.10).

## X. The research plan — `content/10-plan/`, slug `plan`, figs `[plan, questions]`

Refreshed from old Parts VIII and IX around what exists now: the Bench's orchard dump (values and
pre-RoPE keys of 30 sequences), the harness, and the campaigns' results. Priority: speed of getting the
next result. Source: VIII.1–11, IX.4–15, notes/05.

| # | id | title | scope | defines |
|---|---|---|---|---|
| X.1 | `plan-where-we-stand` | Where we stand | what the campaigns answered (stereo, echo, the leash's cost, solo's floor), what they did not (keys, sequence scope, other text, the application side), the three big questions restated. | `big-question` |
| X.2 | `plan-principles` | Principles: speed first | use the data we have; paired comparisons; controls before conclusions; one scenario per question; write the decision before the data. | `framework-question` |
| X.3 | `plan-the-dataset-we-have` | The dataset we have, and what to add cheaply | the Bench dump: what is captured (V, K pre-RoPE, BF16, token kinds), what is one script away: queries `q` per token per layer, hidden states, a prose corpus, a second LLM. | — |
| X.4 | `plan-next-in-the-harness` | Next in the harness | a prioritised list of scenarios: keys; K+V cherries; stereo across layers; sequence-scope dictionaries; the leash at 137 vs 293; the bit-field split as a stage; prose text; a GPU-speed test of the frontier compressor. Each with the question, the scenario line, the expected signal and the decision it informs. | — |
| X.5 | `plan-queries-and-picks` | Queries and picks: a stand-in indexer | compute `q` for the dump; exact top-k attention as a stand-in indexer per layer; a pick trace per sequence; what it costs (one pass of the LLM); what it unlocks. Source: IX.10. | `trace-replay` |
| X.6 | `plan-hot-cache-replay` | Replaying the hot cache | miss rates, where misses land, stretch popularity, the on-fire simulation, `f_D` on the Bench; the controls (shuffled traces). Source: IX.10–11, VIII.7. | — |
| X.7 | `plan-decoder-speed` | How fast must the decoder be? | the 10× rule; a GPU decode of the frontier compressor; what to measure. | — |
| X.8 | `plan-other-experiments` | Beyond the harness | a sparse-attention LLM with a real indexer (which open ones exist); synthetic controls; a victim-tier replay. | — |
| X.9 | `plan-decision-rules` | What each outcome would mean | the table written before the data: per experiment, the readings and the next step. Source: IX.9, IX.12. | `decision-rule` |
| X.10 | `plan-risks` | Weak spots, risks and pivots | Source: IX.13–15. | — |

## XI. The Bachelor: picks and misses, measured — `content/11-picks/`, slug `picks`, figs `[picks]`

The plan's experiments X.5 and X.6, run on 2026-11-03 in the research repository bachelor-kv (private,
`dborzov/bachelor-kv`) on a dump of Qwen 2.5 1.5B with queries. Source of every number: its
`docs/results.md` (grades measured / derived / extrapolated; HiSparse's are their measurement), method in
`docs/design.md`. Figures in `figures/picks.js`, data in `figures/data/picks-*.json`.

| # | id | title | scope | defines |
|---|---|---|---|---|
| XI.1 | `picks-dispatch` | The result on one page | how this Part runs (the chain from a dump with queries to the napkin, cross-referencing the primer's pages; `fig-picks-pipeline`); the five readings of results.md with the one plot (`fig-picks-napkin-headline`); the potential of each approach at a glance (sequences per GPU and what limits it); what changed elsewhere on the site; how to read the Part (grades, caveats). | — |
| XI.2 | `picks-the-bachelor` | The Bachelor: a dump with queries | Qwen 2.5 1.5B Instruct, five coding-agent sequences of 24.5K–30K tokens, K/V/Q post-RoPE, token kinds (decode-like steps); the stand-in rule as a Python listing (per layer, 12-head mean of the causal softmax, candidates `j <= t - 1`, ranked, resident window `W`, squeezed rows `g = 4`); where the attention mass goes (top-k, sinks, window, self), `fig-picks-mass`. | `bachelor` |
| XI.3 | `picks-a-trace` | A trace, up close | the intuition page: 600 real steps of one layer (sequence 2, layer 9, steps 19 300–19 899, pin-scaled, shelf 4 × 1024 popular over 32 steps) on `fig-picks-raster`; what to look for: positions picked at every step, the band that appears when the assistant starts writing, misses where picks are thin, heavy stretches and how long they stay on the shelf; every claim checked against `raster_excerpt.json`. | — |
| XI.4 | `picks-carrying-numbers` | Carrying numbers from a small LLM | every setting scaled by what it serves (share of the context, `B/k`, window share, stretch); the named configurations (pin-scaled, pin-absolute, v4-scaled, sweep); grades; what is measured inside the dump (context, heads, window, indexer error, depth) and what cannot be carried (LLM size; the size ladder and Qwen3.5-2B are next). | `budget-share` |
| XI.5 | `picks-hot-cache` | The hot cache, replayed | calibration against HiSparse (the pre-registered 2× rule), Bélády, the consecutive-step overlap (Lucky Louis), misses per layer per step and bursts, the resident window, decode-like steps, layers; `fig-picks-reuse`, `fig-picks-layers`. | `burst-factor` |
| XI.6 | `picks-share-carries` | The share carries, not the budget | the collapse in `φ = k/t` (`fig-picks-collapse`), the fit, the Pin prediction 36 / 21 / 12 % against 30 / 13.4 / 6.7 %, the slope rising with `s`, how every number moves to another LLM. | — |
| XI.7 | `picks-heavy-stretches` | Where misses land | heavy stretches against the shuffled twin (`fig-picks-heavy`); the three shelf policies (touched, heaviest, popular) as a listing; why popularity over 32 steps wins; net and gross loads. | — |
| XI.8 | `picks-shelf` | The shelf, replayed | `f_D` against coverage with the twin (`fig-picks-shelf`), the `b / t^1.27` rule that overturned "b is absolute" (`fig-picks-shelf-scaling`), the Pin extrapolation on the grid of stretch lengths the Bachelor measured (2048 … 16 384; 1024 refused), the decision rule of X.9 read at both contexts and against GPU memory. | `shelf-coverage` |
| XI.9 | `picks-bytes-side` | The other half of the bill | what the campaigns' compressors give, read through the shelf: the MDL ladder with its split (`fig-picks-ladder`); the ratio against stretch length with the dictionary share at 0.4–0.5 throughout (`fig-picks-stretch-ratio`); the floors 0.60 / 0.57 and their grades; a dictionary is spread over its punnet in the score and resident in GPU memory in serving. | — |
| XI.10 | `picks-slot-price` | The slot price | GPU memory against hot-cache slots: the inequality `(1 − ρ)·Δf_D·B/w > α`; tree dictionaries lose, light ones barely win, a global solo code comes first; the equal-memory napkin (`fig-picks-napkin`); stretch length against residency (`fig-picks-stretch-n`) and the napkin explorer (`fig-picks-explorer`). | `slot-price` |
| XI.11 | `picks-ceiling` | The ceiling of the miss path | split from XI.10: the resized HiSparse cache (127); the half-gain rule N* ∝ ρ^(−1/(1+α)) ≈ 1/√ρ derived in two lines, with its table and `fig-picks-ceiling`; the bound of the bytes side at the Pin (+31 % at the floor 0.57). | `half-gain-rule` |
| XI.12 | `picks-the-indexer` | What the indexer can change | the two noise brackets (`fig-picks-noise`): persistent errors lower misses, per-step jitter raises them; heads (two KV heads share 45 %); layer groups (adjacent layers share 53 %); decode-like steps; squeezed rows. | — |
| XI.13 | `picks-what-it-means` | What it means, and what is next | results.md §5–§6: resize the hot cache; expect at most +31 % from compression (the half-gain rule); aim the compression search at zero or tiny per-sequence bytes and count dictionary bytes as GPU memory; bursts; indexer stability; next: decoder speed, keys and latents, Qwen3.5-2B to 225K, missed-cherry compression; caveats. | — |

## XII. Summary and reference — `content/12-reference/`, slug `reference`, figs `[]`

| # | id | title |
|---|---|---|
| XII.1 | `reference-summary` | The one-page summary |
| XII.2 | `reference-glossary` | Glossary (generated) |
| XII.3 | `reference-notation` | Notation: symbols and Python expressions (generated) |
| XII.4 | `reference-themes` | Running themes (generated) |
| XII.5 | `reference-numbers` | Grounded numbers and their sources |
| XII.6 | `reference-fp8-facts` | FP8 E4M3 facts used by compressors |
| XII.7 | `reference-prior-art-map` | Prior-art map |
| XII.8 | `reference-references` | References |
| XII.9 | `reference-old-words` | Old words, new words (the tables of `docs/style/terminology.md` §4) |

## Figures

Figure files keep their names; builders keep their names unless renamed below. Every UI label inside a
builder uses the new words (`figures/*.js` are retrofitted by the figure task).

- `figures/scenario.js` (new): `scnAskAnswer` (sender, receiver, one cherry asked, one delta answered),
  `scnSliceDice` (the orchard box; a stretch; a slice; three cherry shapes; the punnet count),
  `scnContract` (compress/decompress with the leash meter), `scnScoreSquare` (the MDL square with the
  measured points, moved from `msrCurve`).
- `idea.js`: `blockKnob` → `stretchKnob`; `ideaMapping`, `ideaSystem`, `missCost`, `toyTrace2` keep names.
- `plan.js`: `planDecodeAlone`, `planBill`, `planHarness…` reused by Parts IV, V, X.
- `questions.js`, `missed-*.js`, `homework-*.js`, `measured.js`, `range.js`, `landscape.js`,
  `school-*.js`, `tiny.js`, `papers-*.js`: labels retrofitted, builders unchanged.
