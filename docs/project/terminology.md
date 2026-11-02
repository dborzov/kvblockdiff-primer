# Terminology: the canonical word list

**Status: the rework in `docs/plans/terminology-rework.md` is awaiting approval.** Until it is approved,
the *current* column is what the site says and what `data/terms/` defines; the *proposed* column is what
it will say. Writers working now use the current words. When the rework lands, this file keeps only one
column and becomes the single authority, and the glossary (`data/terms/`) is regenerated to match.

Rules that already hold: one concept, one word, one home page, one `[[=id]]`; project words are odd on
purpose (a word that cannot occur here by accident is read as ours on sight); plain words stay only when
the outside meaning is the one we mean; never "model"; never "×" for a compression figure.

## The store and its cuts

| concept | current | proposed | id (current → proposed) | home |
|---|---|---|---|---|
| one served conversation and everything written down for it | request, sequence, conversation | **thread** | (none) → `thread` | III.1 |
| the slot of one token in a thread, $t$ | token position | **position** (token = the vocabulary piece) | `token` stays | III.1 |
| a thread's whole store of keys and values | KV cache | **orchard** | `kv-cache` → `orchard` | III.3 |
| one position's K and V at one layer, all KV heads: the unit the selector names and HiSparse moves | entry (the Tile) | **cherry** (the Cherry) | `entry` → `cherry` | III.3 |
| one element position followed along the thread | channel | **strand** | `channel` → `strand` | II.13 |
| $b$ consecutive positions, a cut of the position axis only | block (meaning a), block size | **stanza**, stanza length $b$ | `block` → `stanza` | IV.2 |
| the set of cherries or morsels one dictionary serves; the compression target | block (meaning b), block dictionary | **basket**, basket recipe, basket dictionary | (new) `basket` | IV.2 (new page) |
| the item a coder encodes as one unit and rebuilds alone | entry (meaning b), entry split | **morsel**, morsel cut | `entry-split` → `morsel-cut` | IV.2 / XI.3 |

## The coder

| concept | current | proposed | id | home |
|---|---|---|---|---|
| side information shared by a basket | dictionary (the Almanac) | dictionary | `dictionary` | I.3 |
| what rebuilds one morsel given the dictionary | delta (the Remainder) | delta | `delta` | I.3 |
| a dictionary's size in cherries' worth, $w$ | dictionary weight | **heft** | `weight` → `heft` | IV.2 |
| delta bytes ÷ raw, $\rho$ | delta ratio | delta ratio | `delta-ratio` | IV.2 |
| dictionary + deltas ÷ raw | MDL ratio | MDL ratio | `mdl-ratio` | XI.3 |
| an earlier cherry used whole as the prediction for another | reference entry; sib dictionary (the Twin); exemplar | **twin** (the Twin) | `reference-entry`, `sib` → `twin` | VI.8 / XI.4 |
| the decodable set of twin links of a basket | reference tree | **twin tree** | `reference-tree` → `twin-tree` | XI.4 |
| the distribution a coder assigns before seeing a value | entropy model, exact model, probability model | **forecast**; forecast-only estimate | `exact-model` → `forecast-only` | II.10 / XI.1 |
| coding each item alone with one global code | solo (the Hermit) | solo | `solo` | VI.2 |
| per-strand location and scale dictionary | loc (the Anchor) | loc | `loc` | VI.5 |
| rotation to uncorrelated axes | KLT (the Compass) | KLT | `klt` | II.15 |
| codebook of centroids | VQ (the Hive) | VQ | `vq` | II.17 |
| how far one dictionary reaches | global / request / block scope | global / **thread** / **stanza** scope | `scope-request` → `scope-thread`, `scope-block` → `scope-stanza` | VI.13 |

## The machinery

| concept | current | proposed | id | home |
|---|---|---|---|---|
| the neural network being served | model, the network | **LLM**; stand-in LLM (for proxy model); LLM weights | `proxy-model` → `stand-in-llm` | III.1 |
| the sparse-attention selector | indexer (the Scout) | **picker** (the Picker) | `indexer` → `picker` | III.4 |
| the set it names at one step and layer; its size $k$ | selection, selected set $S_t$; selections per step | **pick**; pick size | (symbol `S`) | III.4 |
| HiSparse's per-thread, per-layer GPU buffer of raw cherries | hot cache (the Hearth) | hot cache | `hot-cache` | III.6 |
| the per-layer set of resident basket dictionaries on the GPU | dictionary cache (the Bookshelf) | **shelf** (the Bookshelf) | `dictionary-cache` → `shelf` | IV.4 |
| a miss served by a delta / by the raw cherry | δ-miss (the Feather) / raw miss (the Crate) | same | `delta-miss`, `raw-miss` | IV.4 |
| GPU tier of evicted cherries' deltas | victim tier (the Lifebuoy) | same | `victim-tier` | VII.16 |
| a basket holding many of the current pick | heavy block (the Anvil) | **heavy basket** | `heavy-block` → `heavy-basket` | IV.10 |
| recent misses per basket; the four states | popularity; ice / warming / on fire / cooling | same | `popularity`, `on-fire` | XII.4 |
| a frozen set of numbers for estimates | reference setting (the Pin); the Bench | **rig**: the Pin, the Bench | `reference-setting` → `rig-pin`, `bench-setting` → `rig-bench` | III.10, XII.7 |
| the site's cost arithmetic | cost model, the economics | **tally** | (none) | VI.15 |

## Properties, arguments and method words (unchanged)

Lucky Louis property · fallen-apple similarity · upstairs similarity · neighbour similarity · cat-thread
ladder · lever 1 / lever 2 · compressibility curve · roofline · harness · shuffle control · campaign ·
screen · read budget · verified result · same-window comparison · shared table · block redundancy (→
**basket redundancy**) · interesting range.

## Voice words

| current | proposed |
|---|---|
| "the primer" meaning Parts I–X | **the proposal** (I–X); the primer is the whole site; **the measurements** (XI); **the design** (XII) |
| "the human" | **Dima** |
| "1.3×", "compression ratio" | **0.77 of raw** (fraction out ÷ in); a paper's × figure once, in brackets |
