# The compression scenario: the standalone problem

This is the dense statement for agents. Part IV of the site teaches it slowly with examples; this file is
the contract every experiment and every page must agree with. Vocabulary: `docs/style/terminology.md`;
Python forms: `docs/project/notation.md` §4. The human's rulings that fixed each detail are numbered in the
experiment repository's `docs/concepts/what-the-human-clarified.md` (kv-compress-roofline), and that
repository's `docs/concepts/scenario.md`, `scenario-variants.md` and `measurement-protocol.md` are the
source of this statement; where this file and the human's rulings disagree, the rulings are right and
this file needs a fix. The present wording follows the rulings of 2026-11-03.

## 1. What is being asked

A **sender** holds the orchard of one sequence in host memory. A **receiver** on the GPU side asks for
**one cherry at a time**, in any order, at random positions. The sender answers each ask with that
cherry's **delta**. Before any ask, the receiver may hold one **dictionary** per punnet. The question is:
how few bytes, in total, must cross between them so that every cherry the receiver asks for is rebuilt
**bit for bit**?

The scenario is deliberately smaller than the serving application (Part VI): no hot cache, no misses, no
link bandwidth, no decode-time budget, no indexer. Those come back when a scenario's numbers are mapped
onto an application; the scenario itself is a clean information-theory question that can be studied on
its own. Nothing about deployment (residency, fetch cost, latency, GPU memory) is an argument for or
against a compressor inside the scenario.

## 2. The objects, in order of construction

1. **The orchard** of one sequence: `k`, `v` of shape `(n_tokens, n_kv_layers, n_kv_heads, head_dim)`,
   on the Bench `(n_tokens, 6, 2, 256)`, stored in `fp8_e4m3`, one byte per element. Every scenario in
   scope uses `fp8_e4m3`; `bf16` is out of scope for now.
2. **A stretch**: `stretch_len` consecutive token positions; `stretch_id = token_pos_id // stretch_len`.
   A knob with four values in scope: 512, 4096, 16 384 and the whole sequence (`n_tokens`). Nothing in
   the orchard marks where a stretch ends. The positions at the end of a sequence that do not fill a
   stretch are dropped, so every punnet of a scenario has the same number of cherries.
3. **A slice**: which coordinates of the orchard are in play: K, V or both; which layers; which heads;
   which elements. Written as a Python slice, e.g. `v[:, [1, 3], 0, :]` (values, KV layers 1 and 3,
   head 0, every element).
4. **A cherry shape**: how the slice is diced into cherries, written as the index expression of one
   cherry at position `t` together with its element count. Every cherry holds the chosen vectors of
   **one** token position; cherries that stack several positions are out of scope. The three shapes in
   scope:
   - `cherry(t) = v[t, :, :, :]`: all V vectors of position `t`, 6 KV layers × 2 heads × 256 elements,
     3072 elements, `cherry_bytes = 3072`;
   - `cherry(t) = v[t, 0, 0, :]`: one V vector, KV layer 0 (the LLM's layer 3), head 0, 256 elements,
     `cherry_bytes = 256`;
   - `cherry(t) = (k[t, :, :, :], v[t, :, :, :])`: all K (before RoPE) and V vectors of position `t`,
     6144 elements, `cherry_bytes = 6144`.

   A bare shape tuple such as `(2, 256)` is never used for a cherry: it does not say which axes it
   spans (two heads of one layer, two layers of one head, or two tokens). `cherry_bytes = cherry(t).size`
   at one byte per element; it is the same for every cherry of a scenario and known to both sides.
5. **A punnet**: all cherries of one stretch under the slice and cherry shape, in position order;
   `punnet_size` cherries (`punnet_size = stretch_len` for the three shapes above). One `compress` call
   sees exactly one punnet. A punnet is never a whole orchard, and need not contain every value of its
   stretch (it contains what the slice says).
6. **A scenario** = `(slice, cherry_shape, stretch_len, leash, fmt, llm, corpus)`. In prose: `V of one
   token, v[t, :, :, :] · stretch 4096 · leash 293 · fp8 · Qwen3.5-2B · target 02`.

Two scenarios with the same slice can differ in cherry shape alone, and they are different problems: with
`cherry(t) = v[t, 1, 0, :]` and a second series `v[t, 3, 0, :]` (256 elements each) over the slice
`v[:, [1, 3], 0, :]`, a token position yields two cherries and the receiver may ask for one without the
other; with `cherry(t) = v[t, [1, 3], 0, :]` (512 elements) it yields one. Keep the two levels (what is
in play; how it is diced) apart in every sentence.

The scenarios in scope are the three cherry shapes above crossed with the four stretch-and-leash pairs
of §5, twelve in all, every one at `fp8_e4m3` on targets 02 and 03 of the experiment repository.

## 3. The contract

```python
deltas, dictionary = compress(punnet, side_info)            # once, sender side, offline
decompress(deltas[i], dictionary, side_info) == punnet[i]   # for every i, bit for bit, decoded cold
```

- "Cold" means the decoder starts from nothing but `deltas[i]`, `dictionary` and the side information
  of §6; it has not decoded any other cherry first and keeps no state between asks.
- `deltas` has exactly `punnet_size` elements. A delta may be empty. Delta sizes may differ from cherry
  to cherry; how the compressor distributes bytes between deltas is its own choice, outside the
  harness's control.
- A dictionary may be empty (the solo family). What it holds is the compressor's choice (codebooks,
  bases, per-furrow tables, reference cherries, entropy-coder state); the harness never looks inside it.
- Both sides know in advance and are not charged for: the scenario itself (stretch length, slice, cherry
  shape, `cherry_bytes`, `punnet_size`, the format and its per-layer scales), which cherry is being
  asked for, and the side information of §6.
- Not charged, by ruling: each delta's own length field (the MDL ratio has no length term); anything
  about how the sender stores, indexes or catalogues deltas (host memory is plentiful and is not the
  bottleneck under study). The distribution of delta sizes is reported anyway.

## 4. The score: the MDL ratio of one punnet

$$\text{MDL ratio} = \frac{\text{size}(\text{dictionary}) + \sum_{i} \text{size}(\text{delta}_i)}{\sum_{i} \text{size}(\text{cherry}_i)}$$

with `i` running over every cherry of the punnet. The numerator is the total size of every artifact the
receiver needs to rebuild the whole punnet; the denominator is the raw size of the punnet,
`punnet_size * cherry_bytes`.

```python
raw              = punnet_size * cherry_bytes
mdl_ratio        = (len(dictionary) + sum(len(d) for d in deltas)) / raw
delta_share      = sum(len(d) for d in deltas) / raw
dictionary_share = len(dictionary) / raw            # delta_share + dictionary_share == mdl_ratio
```

- 1.0 is no compression. At 8-bit storage, bits per element = 8 × ratio.
- The two terms are the **delta share** (every delta of the punnet summed, over the raw bytes) and the
  **dictionary share** (the dictionary's bytes over the raw bytes). They are written out in words; the
  letters x and y are not names of anything. Delta sizes are summed, never averaged; a mean delta size
  is a diagnostic in a report, not a term of the score.
- Neither share is a score on its own. A point with a larger dictionary share and a smaller delta share
  is not better or worse for that reason; only the sum is the score. Where a compressor's lowest ratio
  falls, and at what split between the two shares, is itself a finding about the compressor and the
  data. The dictionary share does not measure how much the cherries of a punnet share: a compressor may
  store its reference cherries in the dictionary or in the deltas and the ratio barely moves (0.00004
  in one measurement); what measures sharing is the gain over solo coding (Part VIII).

### 4.1 How a scenario is measured

- **The split.** The sequences of the experiment repository are divided by sequence id, once, for every
  scenario and every compressor: **dev** = target 02 `0000`–`0009` and the three sequences of target 03
  (13 sequences); **holdout** = target 02 `0010`–`0029` (20 sequences). Configurations are chosen and
  shared tables fitted on dev sequences only; a holdout sequence is never read before the configuration
  is frozen.
- **The sample.** One full-stretch punnet of one holdout sequence is one sample (an approximation the
  human accepts; punnets of one sequence are correlated).
- **The reported number** for one configuration is the mean MDL ratio over the samples with its standard
  deviation, standard error, sample count and Student-t 95 % confidence interval; the delta share and the
  dictionary share with their standard errors; and the distribution of delta sizes.
- **Two compressors** on one scenario are compared by the paired difference per punnet (the same
  punnets), with its mean, standard error and Student-t interval. There is no fixed threshold below
  which a difference does not count; the interval is the statement. The mean per holdout sequence and its
  standard error over the 20 sequences are quoted beside it as the check on the independence
  approximation.
- **Grades.** *Verified*: holdout sequences, every cherry rebuilt bit for bit in a separate decoder-only
  process with its reads counted cold. *Measured in process*: dev screens, every cherry rebuilt and its
  reads counted inside the running process. *Estimate*: a code-length estimate, a bound or a reasoned
  approximation. Only verified holdout measurements enter a roofline; numbers of different grades, screens
  or sequence sets are never subtracted.

### 4.2 The curve and the roofline

One plot per scenario: the delta share on the horizontal axis, the dictionary share on the vertical, the
MDL ratio read off the diagonal through a point. A compressor at several configurations (three or four at
first: its lowest point on the dev sequences, a lighter and a heavier dictionary, a natural extreme where
one exists) gives several points, its **curve**; what is read off the curve is the point of lowest MDL
ratio, its configuration, its ratio with its interval, and the split it falls at. The **roofline** of a
scenario is the lowest MDL ratio reached on it by any compressor at any configuration, with its
confidence interval. It is not a lower envelope over the two shares: the shares are not scores, so a
"Pareto front" over them ranks nothing. The older rooflines of the campaigns were computed that way and
are read as history.

## 5. The leash

Without a limit the best score is reached by putting the whole punnet into the dictionary and sending
empty deltas: ordinary stream compression, where fetching one cherry means decoding the punnet. That corner
is valid and well studied, and is not the question here. The leash keeps it out:

```python
dict_reads(deltas[i], dictionary) <= leash * cherry_bytes      # for every cherry i; distinct bytes, re-reads free
```

- `dict_reads` counts the distinct dictionary bytes one cold decode of cherry `i` reads. A byte read
  twice counts once; the delta itself is read in full and never counted; `len(dictionary)` is free.
- The cap is counted in **cherries' worth of the scenario's own cherry**, so it scales with
  `cherry_bytes`: leash 293 allows 293 × 3072 = 900 096 bytes per decode for `v[t, :, :, :]` and
  293 × 256 = 75 008 bytes for `v[t, 0, 0, :]`.
- It holds for **every** cherry, not on average. The worst cherry of a punnet decides. A result measured
  on a sample of cherries does not show that it keeps the leash (sampled maxima ran up to 26 % low in
  the campaigns).
- How strict a leash is depends on how many cherries the punnet holds, so each stretch length in scope
  has its own leash, and the pair is one scenario axis:

| stretch length | leash (cherries' worth) | share of the punnet one decode may read |
|---|---|---|
| 512 | 137 | 26.8 % |
| 4096 | 293 | 7.2 % |
| 16 384 | 1103 | 6.7 % |
| the whole sequence (215 391 to 229 360 positions) | 14 503 | 6.3 % to 6.7 % |

The values are primes, so a reads figure cannot be mistaken for a power-of-two design constant. The
whole-sequence leash is the 16 384 share of the shortest sequence, rounded up to a prime. Other pairs may
be added later; these four are the scenarios in scope.

- The leash is measured for every cherry, decoded cold in a fresh process, recording the distinct
  dictionary bytes touched, for the holdout measurement; during dev tuning the reads are counted in
  process (the human allows reasoned approximations where an exhaustive check would cost too much).
- The leash models no GPU memory budget and no bandwidth; it only keeps the search in the interesting part
  of the design space.

## 6. Side information, and dictionary scope

Everything below is known to `compress` and `decompress` before any sequence is seen and is never charged:

1. **The scenario's constants**: the cherry shape and `cherry_bytes`, `stretch_len` and `punnet_size`,
   which tensors, layers and heads a cherry holds, the number format and its per-layer scales, and which
   cherry is being asked for.
2. **The compressor's code and configuration**: its parameters, each with a type and a range, chosen per
   scenario on the dev sequences.
3. **A shared table**: any data structure specific to the LLM and the scenario but to no sequence, of
   any size: a VQ codebook for this LLM's values, a basis, a rule computed from the LLM's weights, the
   weights of a small neural network (an autoencoder, a predictor from token ids). It must be fitted on
   dev sequences or on a separate training corpus the human will provide, never on a holdout sequence.
   Allowed by ruling, free, and deferred to a later step: the compressors of the current step use none,
   and the rule against data-derived constants in their code stands.
4. **The token ids and token kinds** of the stretch's positions (the receiver knows the text). Allowed,
   free, and deferred: the compressors of the current step do not use them.

What is not side information: anything derived from the sequence being compressed, other than what the
dictionary and the deltas carry. A table fitted on the holdout sequences, or a configuration chosen on
them, is a hidden dictionary and is forbidden.

In the site's terms the three dictionary scopes are:

| scope | the dictionary is fit on | shared by | charged |
|---|---|---|---|
| stretch | the punnet itself | its `punnet_size` cherries | in full, in the dictionary share |
| sequence | the whole sequence's slice | every punnet of the sequence | in full, in the dictionary share of the one punnet the sequence is (the `stretch_len = n_tokens` scenario) |
| global | dev sequences or a separate training corpus | every sequence | not at all: a shared table is side information (item 3 above) |

Sequence scope is stretch scope with `stretch_len = n_tokens`; it is in scope as the fourth stretch
length. A global dictionary fit on holdout sequences is cheating.

### 6.1 Practical limits on compress and decompress

- `compress` may use at most 10 CPU-seconds per MB of raw punnet: about 15 minutes on the 16 threads of
  the research machine for the largest punnet in scope (a whole sequence of
  `(k[t, :, :, :], v[t, :, :, :])`, 1.38 GB), 130 CPU-seconds for a 4096-position punnet of
  `v[t, :, :, :]`, 10 CPU-seconds for one of `v[t, 0, 0, :]`.
- `decompress` of one cherry may take at most 2 ms per 256 raw bytes of the cherry, single-threaded.
- These limits are practical, not scenario fields: a result over the limit is reported with its time and
  is not an incumbent.

## 7. Why the scenario is varied (the two purposes)

1. **As a probe of the orchard's information.** The best compressor found for each scenario, and the
   difference between scenarios, is a measurement: how many bits per element the two KV heads share
   (compare `v[t, l, h, :]` with `v[t, l, :, :]` on the same elements), what the other eleven vectors
   of a position add to one (compare `v[t, 0, 0, :]` with the layer-0, head-0 part of `v[t, :, :, :]`),
   what the keys add (compare `v[t, :, :, :]` with `(k[t, :, :, :], v[t, :, :, :])`), what a longer
   stretch adds, whether keys are harder than values. The compressor is the instrument; its score is the
   reading. No application has to follow.
2. **As a map of possible applications.** Each real serving design is a scenario: DeepSeek-V3.2's
   per-layer picks map to one-layer cherries with a dictionary per layer (V4 squeezes four tokens into one
   row first); GLM-5.1's shared selection across layers maps to cherries of several layers, or one-layer
   cherries served by a dictionary shared across layers. Which scenario a design needs decides which
   measurements matter to it. Experiments run across scenarios first; the application is chosen
   afterwards, on the numbers.

## 8. Compressors as dataflow graphs

A compressor is a graph of stages from the raw bytes of a punnet to two outputs, the dictionary bytes and
the delta bytes. Typical stages: a predictor (furrow statistics, a reference cherry, a linear prediction
across elements, a KLT basis, a VQ codebook), the exact residual, a quantiser (only on the dictionary side;
deltas are lossless), an entropy coder or a fixed-length code with escapes, and the layout that keeps every
delta decodable alone. A cherry is a vector of real numbers, not a bit field: a compressor fits a
probability table to the values and codes an exact correction; splitting sign, exponent and mantissa (a
bit-field split) is a diagnostic at most. Part V is the catalogue of stages with pseudocode; the
experiment repository's taxonomy (`research/taxonomy/`) indexes every stage the campaigns tried by role.

The compressor contract will be reworked in a later step: each compressor exposes a configuration API
(every parameter with a type, a range and a note on how to adapt it to the cherry shape, the stretch
length and the leash), and one compressor serves every scenario in scope.

## 9. What the campaigns of Part VIII ran, in these words

| campaign track | scenario |
|---|---|
| C1 (29–30 Oct 2026) | V · cherry `v[t, 0, 0, :]` (256 elements; KV layer 0, the LLM's layer 3, head 0) · stretch 4096 (and others) · no leash until 11:20 UTC · fp8_e4m3 (and bf16) |
| C2 `s-head-b4k-r293` | V · cherry `v[t, l, h, :]` (256 elements; all six KV layers, one head vector per cherry) · stretch 4096 · leash 293 |
| C2 `s-layer-b4k-r293` | V · cherry `v[t, l, :, :]` (512 elements; one KV layer, both heads) · stretch 4096 · leash 293 |
| C2 `s-token-b4k-r293` | V · cherry `v[t, :, :, :]` (3072 elements; all six KV layers) · stretch 4096 · leash 293 |
| C2 `s-tok2-…`, `s-tok4-…` | V · cherry `v[t:t+2, l, :, :]`, `v[t:t+4, l, :, :]` (2 or 4 adjacent positions of one layer; stacked positions, out of scope since 2026-11-03) |
| screens `s-` / `st02n5-` | one in ten stretches of 2 dev sequences of target 03 / one in nine of 5 dev sequences of target 02 |

Of these, only `s-token-b4k-r293` is a scenario in scope today (`v[t, :, :, :] · stretch 4096 · leash
293`); `v[t, l, h, :]` and `v[t, l, :, :]` cherries, the stacked positions and the no-leash C1 runs are
history, kept as reference lines.

Headline numbers (values of Qwen3.5-2B, fp8, stretch 4096): solo 0.778; best stretch-scope compressor on
`v[t, l, :, :]` cherries 0.636 (dictionary share 0.525, delta share 0.112, worst reads 226 cherries'
worth); light no-tree compressor 0.686 (dictionary share 0.021); joining the two heads saves 0.032 of
ratio; joining all six layers a further 0.004; adjacent tokens as one cherry cost +0.037 (two) and +0.063
(four). Their grade: dev screens of two sequences of target 03 (five of target 02 for the re-runs), every
cherry rebuilt in a separate process, no holdout measurement and no confidence interval. They predate the
measurement protocol of §4.1 and are leads for choosing configurations, not results under it; every cell
of the twelve scenarios in scope is empty under the protocol.
