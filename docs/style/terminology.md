# The vocabulary of this site: the rule

This file is the rule. Every page, glossary entry, figure label, flashcard and doc uses these words and
no others for these things. `npm run check:words` flags the retired words. The glossary data
(`data/terms/*.yaml`) carries the same definitions in hover form; this file explains the system behind them.

## 1. Why the words are what they are

1. **Standard things keep their standard name**: token, layer, attention, softmax, entropy, Huffman, PCIe,
   k-means. Where the field has several names we pick the least overloaded one (*sequence*, not *request*
   or *thread*; *element*, not *channel*).
2. **Project-specific things get a name that cannot be mistaken for anything else here.** Where a plain word
   is overloaded we use an out-of-place, vivid word whose image carries a structural property: a *cherry* is
   picked one at a time; a *punnet* is the box cherries are sold in; a *furrow* runs the whole length of a
   field; a *leash* limits how far something may wander. Seeing one, a reader knows it is ours.
3. **Related things that could be confused get deliberately different names.** Stretch, slice, cherry shape,
   punnet and dictionary are five different objects and never share a word.
4. **Every name is bundled with the Python expression that pins it down.** The expression is introduced in a
   "how it works" listing and reused everywhere after: `v[token_pos_id, layer_id, head_id, :]` says more than
   a sentence. Index names are spelled out so the reader sees which axis is which
   (`docs/project/notation.md`).
5. **Overloaded words are banned outright**, even where the meaning would be clear: *model*, *channel*,
   *entry*, *block* (for data), *cache* (bare), *coder*, *codec*, *algorithm*, *request*, *thread*, *chunk*,
   *segment*, *entry split*, *read budget*, *proxy model*, *dictionary cache*, *kv-blockdiff* with a hyphen.
   The one allowed compound is *entropy coder* (a stage type with a standard name).
6. **Retired since the rulings of 2026-11-03** (the experiment repository's
   `docs/concepts/what-the-human-clarified.md`): *x* and *y* as names of the two shares (write *delta
   share* and *dictionary share*); "x is bookkeeping" and any statement that a share is bookkeeping;
   a bare shape tuple such as `(2, 256)` for a cherry (write the index expression and the element
   count, `v[t, l, :, :]`, 512 elements); *multi-token cherry* and any cherry that stacks several
   positions (out of scope); *Pareto front* for the roofline (the roofline is the lowest MDL ratio);
   *hyperparameter*, *slider* and *knob* for a compressor's setting (write *configuration parameter*);
   *training set* and *test set*, *training sequences* and *test sequences* (write *dev sequences* and
   *holdout sequences*). The human's rulings decide the scenario; this file records them and never
   overrides them.

## 2. The vocabulary

Term ids in parentheses are the glossary ids (`[[id]]`). Nicknames in quotes are the brand nicknames.

### 2.1 The LLM side: how the data comes to exist

| term | Python | definition | retires |
|---|---|---|---|
| **token** (`token`), `token_pos_id` | `t` in listings | one unit of text; its position in the sequence, counted from 0 | — |
| **sequence** (`sequence`) | — | one LLM context: one conversation's tokens from its first token to now. A serving system runs many sequences at once | request, thread, conversation, context (as a noun for this) |
| **the LLM** (`llm`) | — | the language model under study, always named (Qwen3.5-2B, GLM-5.1). A **stand-in LLM** (`stand-in-llm`) is one measured in place of the target | model, proxy model, the network |
| **layer** (`layer`), `layer_id`; **KV layer** (`kv-layer`) | `l` | one transformer layer; a KV layer is one that keeps keys and values (in hybrid LLMs only some do: 6 of Qwen3.5-2B's 24) | — |
| **KV head** (`head`), `head_id` | `h` | one key/value head of a layer; with GQA several query heads share it | head (unqualified) |
| **element** (`element`), `elem_id` | last axis | one stored number, and its position inside a head vector, 0 … `head_dim`−1 | channel (the index sense), dimension |
| **furrow** (`furrow`) | `v[:, layer_id, head_id, elem_id]` | one element position followed along the token axis; "per-furrow statistics" means a location and a scale for each `elem_id` | channel (the column sense), "elephant line" (experiment repo) |
| **the orchard** (`orchard`) | `k`, `v`, shape `(n_tokens, n_kv_layers, n_kv_heads, head_dim)` | everything one sequence has grown: all its keys and all its values at every KV layer, kept in host memory. It grows one row per token and is never pruned. It is a store, not a cache | KV cache, KV history, KV store |
| **hidden state** (`hidden-state`) | `x` | the vector a token carries between layers; keys, values and queries are linear projections of it | — |
| **query** (`query`) | `q` | the vector the current token scores against stored keys | — |
| **attention** (`attention`) | `softmax(q · k) @ v` | the soft lookup of stored keys and values | — |
| **prefill / decode** (`prefill-decode`), **TPOT** (`tpot`) | — | reading the prompt at once / writing one token per step; the time one decode step takes | — |
| **sparse attention** (`sparse-attention`), **the indexer** (`indexer`, "the Scout") | `indexer_topk(...)` | attention over a selected few positions; the cheap selector that names them before any bytes move | selector (as a noun) |
| **a pick** (`pick`) | `(layer_id, token_pos_id)` | one unit of demand as the indexer names it at one decode step: one position for one layer (DSA), one position for a group of layers (GLM-5.1), one squeezed group of tokens (DeepSeek-V4). A pick is served with one or more cherries, by the scenario's cherry shape. The set of a layer's picks at one step is `S`, of size `k` | entry (the selected thing), selection (noun), the indexer's choice |
| **the link** (`link`) | — | the PCIe wire between host memory and the GPU; `W_link` is its bandwidth | channel (the wire sense), the bus |
| **HiSparse** (`hisparse`, "the Two-tier Library"), **hot cache** (`hot-cache`, "the Hearth") | — | the serving system we build on; its per-sequence, per-layer GPU buffer of raw picks, managed LRU. The hot cache is a real cache and keeps the word | — |
| **Lucky Louis property** (`lucky-louis`) | — | the indexer re-picks mostly the same positions step after step (a property of *which* picks, not of their bytes) | — |
| **reference setting** (`reference-setting`): **the Pin** (`pin`), **the Bench** (`bench`) | `data/settings.yaml` | the two frozen rigs every number is quoted for: GLM-5.1 on 8 × H200 as HiSparse serves it; Qwen3.5-2B on one RTX 5080, the campaigns' data | — |

### 2.2 The compression scenario: the standalone problem (`docs/project/scenario.md`)

| term | Python | definition | retires |
|---|---|---|---|
| **sender / receiver** (`sender-receiver`) | — | the host-memory side that holds the orchard and prepares deltas; the GPU side that asks for one cherry at a time | encoder/decoder side |
| **sequence** (`sequence`), `sequence_id` | `"0000"`, `"0001"`, … | one recorded run of the LLM over one long text (target 02 has 30, target 03 has 3). The unit the dev/holdout split is made of | thread, request, conversation |
| **stretch** (`stretch`), `stretch_len` | `stretch_id = token_pos_id // stretch_len` | `stretch_len` consecutive token positions of one sequence. A knob of ours, not a fact of the data, with four values in scope: 512, 4096, 16 384 and `n_tokens` (the whole sequence). Says nothing about which tensor coordinates are in play. Positions that do not fill a stretch are dropped | block (the token-range sense), chunk, segment, window |
| **slice** (`slice`) | `v[stretch, [4, 6], 0, :]` | the rule naming which coordinates of the orchard are in play in a scenario: K or V or both, which layers, which heads, which elements. Written as the Python slice it is | entry split (half of it), "which K/V we take" |
| **cherry** (`cherry`), `cherry(t)`, `cherry_bytes` | `cherry(t) = v[t, :, :, :]` | one unit of request-and-delivery: the receiver asks for one cherry; the sender answers with one delta. The chosen K and V vectors of **one** token position, written as the index expression of that position's cherry with its element count: `v[t, :, :, :]` (3072 elements), `v[t, 0, 0, :]` (256), `(k[t, :, :, :], v[t, :, :, :])` (6144). Every cherry of a scenario has the same size, known to both sides in advance | entry (the compressed thing), item, vector (when it means this); a bare shape tuple `(2, 256)`; multi-token cherry |
| **cherry shape** (`cherry-shape`) | `cherry(t) = v[t, [1, 3], 0, :]` | the dicing rule: how the slice is cut into cherries, written as the index expression of one cherry and its element count. The other half of the old "entry split". Two scenarios can share a slice and differ only here. Cherries that stack several positions are out of scope | entry split; `cherry_shape=(2, 256)` |
| **punnet** (`punnet`), `punnet_size` | `punnet = [cherry(t) for t in stretch]` | the set of all cherries of one stretch under one slice and cherry shape, in position order: what one `compress` call sees, what one dictionary serves, and the dataset over which one MDL ratio is computed. `punnet_size` cherries | block (the data sense), entry set, the block's entries, box of cherries |
| **scenario** (`scenario`) | `Scenario(slice, cherry_shape, stretch_len, leash, fmt, llm, corpus)` | the full specification of one compression problem. Written in prose as `V of one token, v[t, :, :, :] · stretch 4096 · leash 293 · fp8 · Qwen3.5-2B · target 02`. Twelve are in scope: the three cherry shapes above crossed with the four stretch-and-leash pairs, all `fp8_e4m3` | split, track, test |
| **dictionary** (`dictionary`, "the Almanac") | `deltas, dictionary = compress(punnet)` | any bytes the compressor shares across a punnet and the receiver holds before asking: furrow statistics, a basis, a codebook, an entropy-coder table, reference cherries, even the weights of a small network. Opaque to the scenario. Its **weight** `w` is its size in cherries' worth | side-information structure, codebook (when it means this) |
| **delta** (`delta`, "the Remainder") | `deltas[i]` | the bytes sent for cherry `i`; with the dictionary they rebuild it exactly. Opaque; sizes may differ from cherry to cherry and are the compressor's choice; a delta may be empty | residual bytes, payload |
| **the contract** (`contract`) | `decompress(deltas[i], dictionary, side_info) == punnet[i]` for every `i`, bit for bit, decoded cold | what makes a compression valid | verified (as the rule), round trip |
| **MDL ratio** (`mdl-ratio`) | `(len(dictionary) + sum(len(d) for d in deltas)) / (punnet_size * cherry_bytes)` | the score of a compressor on one punnet: every byte needed to rebuild the punnet over its raw bytes, the sum running over every delta. 1.0 is no compression; **bits per element** = 8 × ratio at 8-bit storage | compression ratio (inverse), rate (bare) |
| **delta share** (`delta-share`), **dictionary share** (`dictionary-share`) | `sum(len(d) for d in deltas) / raw`, `len(dictionary) / raw` | the two terms of the MDL ratio, `delta share + dictionary share == MDL ratio`, and the axes of the curve plot. Always written out; the letters x and y are not names. Neither share is a score on its own: only the sum is | x, y; "x is bookkeeping" |
| **the leash** (`leash`), **reads** (`reads`) | `dict_reads(deltas[i], dictionary) <= leash * cherry_bytes` | the cap on the distinct dictionary bytes one cold decode of one cherry may read, counted in the scenario's own cherries' worth, for **every** cherry. One value per stretch length: 137 at 512, 293 at 4096, 1103 at 16 384, 14 503 for the whole sequence (primes). It keeps bulk stream compression of a punnet out of the game. The reads are the measured quantity | read budget, dictionary budget, random-access rule, read limit |
| **side information** (`side-information`), **shared table** (`shared-table`) | `decompress(delta, dictionary, side_info)` | what both sides hold before any sequence is seen, never charged: the scenario's constants, the compressor's code and configuration, the token ids and kinds, and a shared table (any data structure specific to the LLM and the scenario, of any size, fitted on dev sequences or a separate training corpus, never on a holdout sequence). Shared tables and token ids are allowed and deferred to a later step | global dictionary (when it means this), calibration data (for the table) |
| **configuration**, **configuration parameter** (no glossary id yet) | `params` | a compressor's settings, each with a type and a range, chosen per scenario on the dev sequences. A compressor at several configurations gives several points on its curve | hyperparameter, slider, knob (of a compressor), settings (bare) |
| **dev sequences**, **holdout sequences** (no glossary id yet) | `dev`, `holdout` | the sequences on which configurations are chosen and shared tables fitted (target 02 `0000`–`0009` and target 03's three); the sequences on which the reported number is measured, never read before the configuration is frozen (target 02 `0010`–`0029`). One full-stretch punnet of a holdout sequence is one sample; the reported number is the mean with its Student-t confidence interval | training set, test set, training/test sequences, tuning set, calibration set (for this) |
| **compressor** (`compressor`) | `compress`, `decompress` | one concrete pair of functions: a dataflow graph of stages from raw cherries to dictionary bytes and delta bytes | coder, codec, algorithm, method, scheme |
| **stage** (`stage`) | — | one node of a compressor's graph: a transform, a predictor, a quantiser, an entropy coder (a bit-field split is a diagnostic at most) | component, step, module |
| **solo** (`solo`, "the Hermit") | `dictionary = b""` | the compressor family with an empty dictionary: each cherry coded on its own with a fixed table. A reference line, not a research target | per-entry coding, context-free coding |
| **the harness** (`harness`) | — | the referee program that runs every compressor through the contract, counts bytes, checks the leash for every cherry and records every trial | the framework, the test bench |
| **the curve**, **the roofline** (`curve`, `roofline`) | — | a compressor's configurations placed by (delta share, dictionary share), with its point of lowest MDL ratio and the split it falls at; the lowest MDL ratio reached on a scenario by any compressor at any configuration, with its confidence interval | Pareto front, lower envelope over the shares |

### 2.3 The application: kvblockdiff on HiSparse

| term | definition | retires |
|---|---|---|
| **kvblockdiff** (`kvblockdiff`, "the Delta Store") | the project: serve picks as deltas against punnet dictionaries kept on the GPU, rebuilt bit for bit | kv-blockdiff, blockdiff |
| **dictionary shelf** (`dictionary-shelf`, "the Bookshelf") | the GPU-resident set of dictionaries, one per on-fire stretch | dictionary cache |
| **δ-miss** (`delta-miss`, "the Feather") / **raw miss** (`raw-miss`, "the Crate") | a hot-cache miss served by a delta / by the raw pick | — |
| **δ-miss fraction** `f_D` (`delta-miss-fraction`) | the share of misses that are δ-misses | — |
| **on fire / ice** (`on-fire`), **popularity** (`popularity`) | a stretch whose dictionary is on the shelf / not; the running miss count that decides it | hot block |
| **heavy stretch** (`heavy-stretch`, "the Anvil") | a stretch that holds many of a step's picks | heavy block |
| **victim tier** (`victim-tier`, "the Lifebuoy") | a GPU tier holding the deltas of just-evicted picks | — |
| **global / sequence / stretch scope** (`scope-global`, `scope-sequence`, `scope-stretch`) | what a dictionary is fit on and shared by: all sequences; one sequence; one stretch | request scope, block scope |
| **the two levers** (`lever`) | cheaper misses; cheaper hot-cache slots | — |

### 2.4 Hypotheses about the orchard

| term | definition |
|---|---|
| **neighbour similarity** (`neighbour`, "the Neighbours") | umbrella: a cherry costs fewer bits given a neighbour along some axis of the orchard |
| **fallen-apple similarity** (`fallen-apple`, "the Apple") | token axis: cheaper given a cherry a few tokens away; a curve over the distance `Δ` |
| **upstairs similarity** (`upstairs`, "the Staircase") | layer axis: cheaper given the same token one layer up |
| **stereo similarity** (`stereo`, "the Stereo") | head axis: the two KV heads of a layer at one token are two views of one vector; joining them saves bits though their cosine is near zero |
| **echo similarity** (`echo`, "the Echo") | an earlier repeat of the same token, however far away, predicts a cherry; the reference tree lives on echoes. The axis that mattered in the data: repetition, not distance |
| **the leak** (`leak`), **the trap** (`trap`), **the cat-sequence ladder** (`cat-ladder`) | hit rate is about queries, not bytes; the harsh exchange rate from variance explained to bits; the intuitive three-rung argument |

### 2.5 Compressor stages (Part V)

Stage names are standard and stay: **furrow statistics** (`loc`, "the Anchor": a location and a scale per furrow), **KLT** (`klt`, "the Compass"), **VQ** (`vq`, "the Hive") and **product quantization**, **sibling** (`sib`, "the Twin") and **reference tree** (`reference-tree`), **linear prediction** across elements (`linear-prediction`), **context modelling** (`context-modeling`), **lifting** (`lifting`), **bit-field split** (`bit-field-split`: sign/exponent and mantissa routed to different stages), **fixed-length code** with **escapes**, **entropy coder** (Huffman, arithmetic, rANS). The **per-cherry tax** (`cherry-tax`) is whatever a stage makes every delta carry besides its residual (an index, a pointer, a flag).

## 3. Symbols

Single letters stay for equations (`data/symbols/*.yaml`) with renamed meanings: `b` stretch length,
`e` cherry bytes, `d` elements per cherry, `w` dictionary weight in cherries' worth, `ρ` the delta share
and `x_D` the dictionary share inside KaTeX only, `Δ` token distance, `k` picks per layer per step,
`B` hot-cache slots, `S` the pick set. The Python names are the prose names; letters appear inside
equations and in symbol reminders. In prose the two shares are always written out as *delta share* and
*dictionary share*; the bare letters x and y are not names of them.

## 4. Translation tables

### 4.1 The old site's words → ours

| old | now |
|---|---|
| KV cache, KV history | the orchard |
| entry (selected) / entry (compressed) | pick / cherry |
| entry split | slice + cherry shape |
| block (token range) / block (data) / block size `b` | stretch / punnet / stretch length |
| channel (index) / channel (column) / channel (wire) | element / furrow / the link |
| request, thread | sequence |
| model, proxy model | the LLM (named), stand-in LLM |
| coder, codec, algorithm | compressor |
| read budget, dict reads | the leash, reads |
| dictionary cache | dictionary shelf |
| heavy block | heavy stretch |
| request scope, block scope | sequence scope, stretch scope |
| kv-blockdiff | kvblockdiff |
| exact-model estimate | code-length estimate |

### 4.2 The experiment repository's words (kv-compress-roofline) → ours

| theirs | ours |
|---|---|
| entry, entry set | cherry, punnet |
| block (positions) / block (data) | stretch / punnet |
| entry split: head / layer / token / tok2 … | cherry shape `v[t, l, h, :]` (256 elements) / `v[t, l, :, :]` (512) / `v[t, :, :, :]` (3072) / `v[t:t+2, l, :, :]` (stacked positions, out of scope) … |
| channel, elephant line | element, furrow |
| sequence, thread | sequence |
| read budget `r137`, `dict_read_max`, read limit | leash 137; the reads |
| coder, algorithm `NN-slug` | compressor `NN-slug` |
| map, linear prediction | linear prediction |
| anchor, exemplar, reference | reference cherry |
| tree, reference tree | reference tree |
| track `s-layer-b4k-r293` | scenario on a screen: V at one KV layer, `v[t, l, :, :]` · stretch 4096 · leash 293 · fp8 · target 03 (2 dev sequences) |
| `dict_cost`, `delta_ratio`, `total_ratio`; x, y, w in older pages | dictionary share, delta share, MDL ratio; dictionary share, delta share, dictionary weight |
| `params`, sliders, hyperparameters | configuration, configuration parameters |
| `[splits] dev` / `holdout`; training / test sequences | dev sequences / holdout sequences |
| Pareto front (older rooflines) | the roofline: the lowest MDL ratio of the scenario |
| solo | solo |

### 4.3 The papers' words → ours

Every paper page carries its own table. Common ones: token-wise / per-token quantisation → per-cherry
rounding; channel-wise / per-channel → per-furrow; page (Quest) → a stretch of 16 tokens; group → a
scale group; codebook (when it means the whole side information) → dictionary; KV cache → the orchard.

## 5. How to coin a new term

1. Check it is not already in `data/terms/` (`grep -rn "^<id>:" data/terms/`).
2. If it names a standard thing, use the standard word and define it on first use.
3. If it names a project thing, pick a word by rule 2 above and ask the human (brand terms need an
   emblem and a colour; `docs/style/voice.md` §brand).
4. Add it to the Part's own `data/terms/<part>.yaml`, define it once with `[[=id]]` or `::: define`,
   add its Python form to `data/notation/` if it has one, and add a row to §2 of this file.
5. If it replaces an old word, add the old word to `data/banned-words.yaml` and a row to §4.
