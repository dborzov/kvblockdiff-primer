# Proposal: one vocabulary and one structure for the kvblockdiff site

Written 2026-11-02 after reading every Part, the glossary, the symbol tables and the experiment-repo notes.
This is a proposal for approval, not yet the site's rule. Once approved, `docs/style/terminology.md`
becomes the rule and this file is deleted.

## 1. What is wrong today, in one paragraph

The site was written in stages (story → school → landscape → idea → papers → homework → corrections →
questions → plan → measurements → range), and each stage kept the words of the stage before it even when
the thing they named had changed. Three words carry most of the damage. **"Entry"** means one token's
keys and values at one layer in Parts III–IX (640 B on the Pin), but the campaigns of Part XI compressed
values only, one head, one layer or one token at a time, so "entry" there means three different shapes.
**"Block"** means both a range of token positions (a design knob) and the set of things one dictionary
serves (the data), and the two are not the same thing once only a slice of the tensor is compressed.
**"Channel"** means a position inside a vector, a column across many vectors, and, in the compression
scenario, the wire between sender and receiver. On top of that, "model" means the LLM, a probability
model, a stand-in LLM and an "exact model estimate"; "cache" means the KV store, the hot cache and the
dictionary cache; "request", "sequence" and "thread" all mean one conversation; and Parts VII–IX describe a
plan that the real harness replaced.

## 2. The rules behind every name

1. **Standard things keep their standard name** (token, layer, attention, softmax, entropy, Huffman, PCIe).
   We only pick the least overloaded standard word (so "sequence", not "request" or "thread").
2. **Project-specific things get a name that cannot be mistaken for anything else here.** Where a plain
   word would be overloaded, we use an out-of-place, vivid word whose image carries a structural property
   (cherry, punnet, furrow, leash). Seeing it, a reader knows it is ours.
3. **Related things that could be confused get deliberately different names** (stretch / slice / cherry
   shape / punnet / dictionary are five different objects and never share a word).
4. **Every name is bundled with the Python expression that pins it down.** The expression is introduced
   in the "how it works" listing and reused everywhere after: `v[token_pos_id, layer_id, head_id, :]`
   says more than any sentence. Index names stay spelled out so the reader sees which axis is which.
5. **Never the bare words "model", "channel", "entry", "block" (for data), "cache" (bare), "coder",
   "algorithm", "request", "thread", "chunk", "segment".** The site's linker will warn on them.

## 3. The vocabulary

### 3.1 The LLM side: how the data comes to exist

| name | Python | what it is | replaces |
|---|---|---|---|
| **token**, `token_pos_id` | `t` in listings | one unit of text; its position counted from 0 | — |
| **layer**, `layer_id`; **KV layer** | `l` | one transformer layer; a KV layer is one that keeps keys and values (in hybrid LLMs only some do) | — |
| **KV head**, `head_id` | `h` | one key/value head of a layer (GQA: several query heads share it) | "head" |
| **element**, `elem_id` | last axis | one stored number; its position inside a head vector (0…`head_dim`−1) | "channel" (the index sense) |
| **furrow** | `v[:, layer_id, head_id, elem_id]` | one element position followed along the token axis; "per-furrow statistics" (a location and a scale per furrow) | "channel" (the column sense), the repo's "elephant line" |
| **the orchard** | `k`, `v` with shape `(n_tokens, n_kv_layers, n_kv_heads, head_dim)` | everything one sequence has grown: all its keys and values at every KV layer, kept in host memory. Grows one row per token. Not a cache | "KV cache", "KV history" |
| **sequence** | — | one LLM context: one conversation's tokens, from its first token to now | "request", "thread", "conversation" |
| **the LLM** | — | the language model under study, always named (Qwen3.5-2B, GLM-5.1). A stand-in LLM is one measured in place of the target | "model", "proxy model" |
| **the indexer** (the Scout) | `indexer_topk(...)` | the sparse-attention selector that names positions before any bytes move | — (kept) |
| **a pick** | `(layer_id, token_pos_id)` | one unit of demand as the indexer names it: at one decode step, one position for one layer (DSA), for a group of layers (GLM-5.1) or one squeezed group of tokens (DeepSeek-V4). A pick is served with one or more cherries, by the scenario's cherry shape | "entry" (the selected thing), "selection" (noun) |
| **the link** | — | the PCIe wire between host memory and the GPU | "channel" (the communication sense), "the wire" |
| **hot cache** (the Hearth) | — | HiSparse's per-sequence, per-layer GPU buffer of raw picks, LRU | — (kept; it is a real cache) |

### 3.2 The compression scenario: the standalone problem

| name | Python | what it is | replaces |
|---|---|---|---|
| **sender / receiver** | — | the host-memory side that holds the orchard, and the GPU side that asks for cherries | — |
| **stretch**, `stretch_len` | `stretch_id = token_pos_id // stretch_len` | `stretch_len` consecutive token positions of one sequence. A knob, not a fact. Says nothing about which tensor coordinates are in play | "block" (the token-range sense), `b` |
| **slice** | `v[stretch, [4, 6], 0, :]` | the rule naming which coordinates of the orchard are in play for a scenario: K or V or both, which layers, which heads, which elements; written as the Python slice it is | "entry split" (half of it), "which K/V we take" |
| **cherry**, `cherry.shape`, `cherry_bytes` | `cherry[i]` | one unit of request-and-delivery: the receiver asks for one cherry at a time; the sender answers with one delta. A fixed-shape sub-array of the slice, e.g. `(256,)`, `(2, 256)`, `(6, 2, 256)`. Its shape and size are known to both sides in advance | "entry" (the compressed thing) |
| **cherry shape** | `cherry_shape=(2, 256)` | the dicing rule: how the slice is cut into cherries. The other half of the old "entry split" | "entry split" |
| **punnet**, `punnet_size` | `punnet = cherries of one stretch under one slice and cherry shape` | the set of cherries one dictionary serves; the whole thing one compress call sees. `punnet_size` cherries, e.g. 4096 × 2 for a per-layer slice over two layers | "block" (the data sense), the repo's "entry set" |
| **scenario** | `Scenario(slice, cherry_shape, stretch_len, leash, fmt, llm, corpus)` | the full specification of one compression problem; two scenarios can share the same slice and differ only in cherry shape | "split", "track" |
| **dictionary** (the Almanac) | `deltas, dictionary = compress(punnet)` | any bytes the compressor shares across a punnet and the receiver holds before asking: furrow statistics, a basis, a codebook, an entropy-coder table, reference cherries, even weights of a small network. Opaque to the scenario | — (kept) |
| **delta** | `delta[i]` | the bytes sent for cherry `i`; with the dictionary they rebuild it exactly | — (kept) |
| **the contract** | `cherry[i] == decompress(delta[i], dictionary)` for every `i`, bit for bit, from cold | what "valid" means | "verified" (partly) |
| **MDL ratio** | `(dict_bytes + sum(delta_bytes)) / (punnet_size * cherry_bytes)` | the score; 1.0 is no compression. **dictionary share** `x` and **delta share** `y` are its two terms | — (kept) |
| **the leash** | `leash = 137 * cherry_bytes` | the cap on dictionary bytes one cold decode of one cherry may touch; keeps bulk stream compression of the punnet out of the game. Scenario variants use other primes | "read budget" |
| **reads** | `dict_reads[i]` | the dictionary bytes one cherry's decode actually touched; must stay under the leash for every cherry | "dict reads" |
| **compressor** | `compress`, `decompress` | one concrete pair of functions: a dataflow graph of stages from raw cherries to dictionary bytes and delta bytes | "coder", "codec", "algorithm", "dictionary algorithm" |
| **stage** | — | one node of a compressor's graph: a transform, a predictor, a bit-field split, a quantiser, an entropy coder | "component", "step" |
| **solo** (the Hermit) | `dictionary = b""` | a compressor with an empty dictionary: each cherry on its own | — (kept) |
| **sender-side cost** | — | ignored by the scenario: how the sender stores and catalogues deltas is free (host memory is plentiful) | — |

### 3.3 The application: kvblockdiff on HiSparse

| name | what it is | replaces |
|---|---|---|
| **kvblockdiff** | the project: serve picks as deltas against punnet dictionaries kept on the GPU | "kv-blockdiff" (one spelling only) |
| **dictionary shelf** (the Bookshelf) | the GPU-resident set of dictionaries, one per on-fire stretch | "dictionary cache" |
| **δ-miss / raw miss** (the Feather / the Crate) | a hot-cache miss served by a delta / by the raw pick | — (kept) |
| **on fire / ice**, **popularity** | a stretch whose dictionary is on the shelf / not; the miss count that decides it | — (kept) |
| **heavy stretch** (the Anvil) | a stretch that holds many of a step's picks | "heavy block" |
| **global / sequence / stretch scope** | what a dictionary is fit on and shared by | "global / request / block scope" |
| **the two levers** | cheaper misses; cheaper hot-cache slots | — (kept) |

### 3.4 Hypotheses about the orchard

| name | what it is | status after Part XI |
|---|---|---|
| **neighbour similarity** (umbrella) | a cherry is cheaper given a neighbour along some axis | — |
| **fallen-apple similarity** (token axis) | cheaper given a cherry a few tokens away; a curve over the distance | weak except in the middle layers |
| **upstairs similarity** (layer axis) | cheaper given the same token one layer up | small, and by kind of layer, not adjacency |
| **stereo similarity** (head axis) — NEW | the two KV heads of a layer at one token are two views of one vector: joining them saves 0.03 of ratio though their cosine is ≈ 0 | the strongest measured structure |
| **echo similarity** — NEW | an earlier repeat of the same token, however far away, predicts a cherry; the reference tree lives on echoes | the axis that actually mattered: repetition, not distance |
| **Lucky Louis**, **the leak**, **the trap**, **the cat-thread ladder** | kept as they are | — |

### 3.5 Symbols

Single letters stay for equations, with renamed meanings: `b` = stretch length, `e` = cherry bytes,
`d` = elements per cherry, `w` = dictionary weight in cherries' worth, `ρ` = delta share, `x`/`y` =
dictionary/delta share, `Δ` = token distance. The Python names above are the prose names; the letters
appear only inside equations.

## 4. The structure

Ten Parts instead of twelve, in dependency order. Pages move; their ids (`landscape-attention`,
`measured-the-data`, …) are kept wherever the page survives, so the experiment-repo notes still resolve.

| new Part | built from | what changes |
|---|---|---|
| I. The tiny-file problem | I | vocabulary retrofit only |
| II. Back to school | II | retrofit; "channel" → element / furrow; the vector pages get numpy listings with `.shape` |
| III. How an LLM reads its memory | III | reworked: every LLM-side term is introduced inside the attention listing, with `.shape` and bytes at the Pin and the Bench; the orchard and its index notation; picks; HiSparse; the memory wall; reference settings |
| IV. The compression scenario | new; absorbs IV.2, IV.6, IX.1–2, XI.3 | the standalone problem: sender/receiver, stretch, slice, cherry shape, punnet, dictionary, delta, the contract, the MDL ratio, the leash; the scenario catalogue and the two reasons to vary it; the compressor as a graph of stages; what is known in advance and what is not charged |
| V. The compressor's toolbox | VI.1–12, VII.5/7/9/10/11, XI.4/5/7 | one page per stage type with a gentle intro and pseudocode: solo, furrow statistics, KLT, VQ, sibling/reference tree, linear prediction, context modelling, lifting, bit-field split, fixed-length vs entropy coding |
| VI. kvblockdiff: the application | IV.1/4/5/15, VI.13–17, XII.3–6 | δ-miss, shelf, on fire, levers, economics, bits to dollars |
| VII. Hypotheses about the orchard | IV.7–14, VIII.2–4, VII.2/3/4/6/8/12–16 | each hypothesis stated, then its verdict linked to Part VIII |
| VIII. The measurements | XI, XII.1–2, XII.7 | retold in the new vocabulary; the Bench setting lives here |
| IX. Papers | V | retold; every page follows the critical-reading template (§5) |
| X. Reference | X | summary, glossary, notation, themes, numbers, FP8 facts, references, and the old-word → new-word table |

Dropped from the site (git history keeps them): the parts of VII (What Dima missed), VIII (frameworks
A–D, parked ideas) and IX (the weekend plan, waves, decision rule) that describe a plan the real harness
replaced. What is still true in them is folded into Parts IV, V and VII.

## 5. The paper-page template

Every paper page has the same sections, in this order: *The idea, by example* (a worked toy in our
vocabulary, enough to understand the paper from zero); *What they assume* (the background they treat as
known; usually the most reliable part); *What they show* (results, with how verifiable each is); *What it
says about our scenario* (builds on / conflicts with / suggests, with links); *Their words → ours* (a
table). Numbers from a paper are quoted with the grade "their measurement", never as ours.

## 6. Questions for the human

1. Approve the vocabulary of §3 (with any edits)?
2. Keep "dictionary" (overloaded by Python dicts and zstd dictionaries, but the project's core word), or
   promote the nickname "almanac" to the term itself?
3. Drop the superseded pages of Parts VII–IX as proposed, or keep them as a labelled archive Part?
4. Do the whole rewrite in one campaign (spine Parts III–IV written first, the rest in parallel), or the
   spine first and stop for review?
