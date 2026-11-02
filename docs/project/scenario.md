# The compression scenario: the standalone problem

This is the dense statement for agents. Part IV of the site teaches it slowly with examples; this file is
the contract every experiment and every page must agree with. Vocabulary: `docs/style/terminology.md`;
Python forms: `docs/project/notation.md` §4.

## 1. What is being asked

A **sender** holds the orchard of one sequence in host memory. A **receiver** on the GPU side asks for
**one cherry at a time**, in any order, at random positions. The sender answers each ask with that
cherry's **delta**. Before any ask, the receiver may hold one **dictionary** per punnet. The question is:
how few bytes, in total, must cross between them so that every cherry the receiver asks for is rebuilt
**bit for bit**?

The scenario is deliberately smaller than the serving application (Part VI): no hot cache, no misses, no
link bandwidth, no decode-time budget, no indexer. Those come back when a scenario's numbers are mapped
onto an application; the scenario itself is a clean information-theory question that can be studied on
its own.

## 2. The objects, in order of construction

1. **The orchard** of one sequence: `k`, `v` of shape `(n_tokens, n_kv_layers, n_kv_heads, head_dim)`,
   stored in a fixed number format (`fmt`: `fp8_e4m3`, `int8`, `bf16`).
2. **A stretch**: `stretch_len` consecutive token positions; `stretch_id = token_pos_id // stretch_len`.
   A knob. Nothing in the orchard marks where a stretch ends.
3. **A slice**: which coordinates of the orchard are in play: K, V or both; which layers; which heads;
   which elements. Written as a Python slice, e.g. `v[:, [1, 3], 0, :]` (values, KV layers 1 and 3,
   head 0, every element).
4. **A cherry shape**: how the slice is diced into cherries, e.g. `(256,)` (one head's vector), `(2, 256)`
   (two layers' vectors of one token stacked), `(6, 2, 256)` (one token's values at every KV layer),
   `(2, 2, 256)` (two adjacent tokens). Every cherry of a scenario has this shape; `cherry_bytes` is its
   size at the storage format's bits per element.
5. **A punnet**: all cherries of one stretch under the slice and cherry shape; `punnet_size` cherries.
   One `compress` call sees exactly one punnet. A punnet is never a whole orchard, and need not contain
   every value of its stretch (it contains what the slice says).
6. **A scenario** = `(slice, cherry_shape, stretch_len, leash, fmt, llm, corpus)`.

Two scenarios with the same slice can differ in cherry shape alone, and they are different problems: with
`(256,)` cherries over two layers, a token position yields two cherries and the receiver may ask for one
without the other; with `(2, 256)` it yields one. Keep the two levels (what is in play; how it is diced)
apart in every sentence.

## 3. The contract

```python
deltas, dictionary = compress(punnet)                # once, sender side, offline, as slow as it likes
decompress(deltas[i], dictionary) == punnet[i]       # for every i, bit for bit, decoded cold
```

- "Cold" means the decoder starts from nothing but `deltas[i]`, `dictionary` and the scenario's known
  constants; it has not decoded any other cherry first.
- Both sides know in advance and are not charged for: the scenario itself (stretch length, slice, cherry
  shape, `cherry_bytes`, `punnet_size`, the format), which cherry is being asked for, and the compressor's
  own code and fixed tables that depend on no data (a global dictionary fit on a separate calibration
  corpus is charged as a dictionary in a global-scope scenario, see §6).
- Not charged, by ruling: each delta's own length field; anything about how the sender stores, indexes or
  catalogues deltas (host memory is plentiful and is not the bottleneck under study).
- A delta may be empty. A dictionary may be empty (the solo family).

## 4. The score

```python
mdl_ratio = (len(dictionary) + sum(len(d) for d in deltas)) / (punnet_size * cherry_bytes)
x = len(dictionary) / (punnet_size * cherry_bytes)         # dictionary share
y = sum(len(d) for d in deltas) / (punnet_size * cherry_bytes)   # delta share;  x + y == mdl_ratio
```

- 1.0 is no compression. At 8-bit storage, bits per element = 8 × ratio.
- The score of a compressor on a corpus is the mean ratio over the punnets of the chosen stretches,
  reported per sequence; two compressors are compared on **the same punnets** (paired), never across
  different samples of stretches.
- `x` is bookkeeping: a compressor may file reference cherries in the dictionary or in deltas and the
  ratio barely moves. `x` does not measure shared information; the gain over solo does (Part VIII).

## 5. The leash

Without a limit the best score is reached by putting the whole punnet into the dictionary and sending
empty deltas: ordinary stream compression, where fetching one cherry means decoding the punnet. That corner
is valid and useless for the application. The leash forbids it:

```python
dict_reads(deltas[i], dictionary) <= leash * cherry_bytes      # for every cherry i; distinct bytes, re-reads free
```

- `leash` is a count in cherries' worth; the baseline scenario uses **137**; variants use 293 and 1103
  (primes, so a number cannot be mistaken for a power-of-two design constant). 137 is "a 128-cherry codebook
  plus pointers": room for shared structure, no room for the punnet.
- The same leash at every stretch length by design (a leash proportional to the stretch would let two
  serially compressed halves pass).
- It is measured for **every** cherry, decoded cold in a fresh process, recording the distinct dictionary
  bytes touched; a sample of cherries is not enough (sampled maxima ran up to 26 % low in the campaigns).
- The leash models no GPU memory budget and no bandwidth; it only keeps the search in the interesting part
  of the design space.

## 6. Dictionary scope (a scenario axis that changes who pays)

| scope | the dictionary is fit on | shared by | charged |
|---|---|---|---|
| stretch | the punnet itself | its `punnet_size` cherries | in full, in `x` |
| sequence | the whole sequence's slice | every punnet of the sequence | once per sequence, amortised over its stretches |
| global | a calibration corpus disjoint from the evaluation data | every sequence | not per punnet (one copy on the receiver), but it must be fit on data it is not scored on |

Sequence scope is stretch scope with `stretch_len = n_tokens`. A global dictionary fit on evaluation data
is cheating.

## 7. Why the scenario is varied (the two purposes)

1. **As a probe of the orchard's information.** The best compressor found for each scenario, and the
   difference between scenarios, is a measurement: how many bits per element the two KV heads share
   (compare cherry `(256,)` with `(2, 256)` on the same elements), whether adjacent tokens share more than
   far repeats, how much a sequence-scope dictionary buys over stretch scope, whether keys are harder than
   values, where the exponent bits' information sits. The compressor is the instrument; its score is the
   reading. No application has to follow.
2. **As a map of possible applications.** Each real serving design is a scenario: DeepSeek-V4 picks per
   layer map to one-layer cherries with a dictionary per layer; GLM-5.1's shared selection across layers
   maps to multi-layer cherries, or one-layer cherries served by a dictionary shared across layers. Which
   scenario a design needs decides which measurements matter to it. Experiments run across scenarios first;
   the application is chosen afterwards, on the numbers.

## 8. Compressors as dataflow graphs

A compressor is a graph of stages from the raw bytes of a punnet to two outputs, the dictionary bytes and
the delta bytes. Typical stages: a bit-field split (sign and exponent one way, mantissa another), a
predictor (furrow statistics, a reference cherry, a linear prediction across elements, a KLT basis, a VQ
codebook), the exact residual, a quantiser (only on the dictionary side; deltas are lossless), an entropy
coder or a fixed-length code with escapes, and the layout that keeps every delta decodable alone. Part V is
the catalogue of stages with pseudocode; the experiment repository's taxonomy (`research/taxonomy/`) indexes
every stage the campaigns tried by role.

## 9. What the campaigns of Part VIII ran, in these words

| campaign track | scenario |
|---|---|
| C1 (29–30 Oct 2026) | V · KV layer 0 (model layer 3) · head 0 · cherry `(256,)` · stretch 4096 (and others) · no leash until 11:20 UTC · fp8_e4m3 (and bf16) |
| C2 `s-head-b4k-r293` | V · all six KV layers · cherry `(256,)` · stretch 4096 · leash 293 |
| C2 `s-layer-b4k-r293` | V · all six KV layers · cherry `(2, 256)` · stretch 4096 · leash 293 |
| C2 `s-token-b4k-r293` | V · all six KV layers · cherry `(6, 2, 256)` · stretch 4096 · leash 293 |
| C2 `s-tok2-…`, `s-tok4-…` | V · cherry = 2 or 4 adjacent tokens of one layer |
| screens `s-` / `st02n5-` | one in ten stretches of 2 development sequences of target 03 / one in nine of 5 sequences of target 02 |

Headline numbers (values of Qwen3.5-2B, fp8, stretch 4096): solo 0.778; best stretch-scope compressor on
`(2, 256)` cherries 0.636 (x 0.525, y 0.112, worst reads 226 cherries' worth); light no-tree compressor
0.686 (x 0.021); joining the two heads saves 0.032 of ratio; joining all six layers a further 0.004;
adjacent tokens as one cherry cost +0.037 (two) and +0.063 (four).
