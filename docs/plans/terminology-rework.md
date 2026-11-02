# Terminology rework: the proposal

Status: **proposed, awaiting Dima's approval** (2026-11-02). Nothing in `content/` or `data/` has been
renamed yet. Once approved, `docs/project/terminology.md` becomes the canonical word list and this file
becomes the record of why.

## 1. Why

The site was written in stages (proposal → corrections → measurements → design), and its words drifted
with it. The worst offenders, with where they bite:

| word | how many meanings it carries today | where it hurts |
|---|---|---|
| **block** | (a) $b$ consecutive tokens of one request at one layer; (b) the set of items one dictionary serves, "the thing we compress"; (c) "block floor", "block scope", "heavy block", "on-fire block" lean on (b) while $b$ is about (a) | XI.6 cuts entries as one head / one layer / one token across six layers, so "the block" is no longer "b tokens' entries of one layer"; XII.1's "half of the block is dictionary" mixes the two |
| **entry** | (a) the unit the indexer selects and HiSparse moves (one token, one layer, all heads, K and V); (b) the unit a coder codes (XI's "entry split": one head, one layer, one token across six layers, pairs of tokens); (c) on the Bench, "entry" is 512 B of values only | the whole of Part XI, where (b) ≠ (a) and the prose has to say "layer entry", "token entry" |
| **channel** | one element position across many vectors; also a paper word (KIVI's per-channel), also "side channel", also communication channels in information theory | School II.13, every dictionary page, KIVI, KVQuant |
| **model** | the LLM; a coder's probability model ("exact model", "entropy model", "grid-aware model"); the cost model; the proxy model; "model weights"; "the toy model" | 499 lines across 108 files |
| **request / sequence / conversation / thread** | the same thing, four words (HiSparse says request, Part XI says sequence, IV.11 says thread) | the scope names ("request scope") and Part XI |
| **KV cache** | the whole store, which is not a cache in the Part II sense; the site then introduces three real caches (hot cache, dictionary cache, victim tier) | III.3 has a warning box about it; the warning is the symptom |
| **reference** | reference setting (the Pin), reference entry, reference tree | Parts XI–XII against III.10 |
| **weight** | dictionary weight $w$; LLM weights; attention weights; linear-prediction weights | XI.5 ("weights rounded by what each rounding costs") next to "dictionary weight" |
| **ratio** | delta ratio $\rho$ (excludes the dictionary); MDL ratio (includes it); papers' "1.3×" (the inverse) | XI.1 and X.1 quote both conventions |
| **indexer / selection / index** | the selector; its output; codebook index; block index; array index; "index tax" | IV and VIII |
| **the primer / the proposal / the human / Dima** | Parts I–X vs the whole site; the author | Parts XI–XII |

The cure the site already uses for its best terms (Lucky Louis, fallen apple, upstairs, the Hive, the Twin)
is the cure to apply everywhere: **one concept, one odd word, introduced through code on real shapes.**

## 2. The design rules

1. **One word, one concept, one home page.** Every project word is defined once, through a Python
   expression on the Bench's real shapes (Qwen3.5-2B: 6 KV layers, 2 KV heads × 256 elements,
   FP8), and the expression travels with the word (`V[t, l, h, :]` is a strand's cross-section, not "a channel").
2. **Odd words for things that get confused.** A word that cannot appear in this context by accident
   (cherry, stanza, basket) is read as "a project word" on sight; a plain word (block, entry, model) is not.
3. **Plain words stay plain only when the outside meaning is the one we mean**: bit, entropy, cache
   (in Part II's sense), layer, head, token, position, dictionary, delta, hit, miss.
4. **Never "model".** Say LLM, forecast, tally, stand-in, weights, as below.
5. **Never "×".** Every compression number on the site is a fraction of raw (bytes out ÷ bytes in).
   A paper's "1.3×" is written as 0.77 of raw, with the paper's figure in brackets once.
6. **Python index names are the notation.** `K[token_pos_id, layer_id, head_id, elem_id]`; slices spell
   the concept (`V[0:4096, 3, :, :]` *is* a stanza of layer 3's values). Math subscripts follow the same
   order, $(\vt, \vl)$ not $(\vl, \vt)$.

## 3. The proposed cast

Renames are marked →. Nicknames in *italics* are kept or proposed for the badge gallery ("the cast").

### 3.1 The orchard family: what the LLM stores

| proposed word | replaces | definition (one line) | in code (Bench shapes) |
|---|---|---|---|
| **thread** | request, sequence, conversation | one served conversation: its tokens in order, and everything the LLM wrote down for them | `thread` is implicit: one `K`, `V` per thread |
| **position** $\vt$ | token position (kept), "token" when the slot is meant | the slot of one token in a thread; **token** stays the word for the vocabulary piece that sits there (the same token recurs at many positions, which is what XI found) | `token_pos_id = t` |
| **orchard** | KV cache | a thread's whole store of keys and values: every layer, every position; it only grows | `K.shape == V.shape == (225_000, 6, 2, 256)`, 1.38 GB at 8 bits |
| **cherry** *(the Tile → the Cherry)* | entry (meaning a) | one position's keys and values at one layer, all KV heads: the unit the picker names and HiSparse moves. $\ve$ bytes, $\vd$ elements | `cherry(t, l) = (K[t, l], V[t, l])` → 2 × 2 × 256 elements, 1024 B |
| **strand** | channel | one element position, followed along the thread: a column of the orchard | `V[:, 3, 0, 23]` is strand 23 of head 0, layer 3; `elem_id = c` |
| **stanza** | block (meaning a), "block size $\vb$" | $\vb$ consecutive positions of a thread, nothing else: a cut along the position axis only. **Stanza length** $\vb$, stanza index $\vj$ | `slice(j*b, (j+1)*b)` on axis 0 |
| **basket** *(the Row → the Basket)* | block (meaning b), "block dictionary" | the set of cherries (or morsels) that share one dictionary: the compression target. A **basket recipe** says which positions × layers × heads × (K, V or both) go in. The default basket is one stanza × one layer × both heads × K and V | `V[0:4096, 3, :, :]` is the values half of the default basket (4096 × 512 elements, 2.1 MB) |
| **morsel** | entry (meaning b), entry split | the item a coder encodes as one unit and a decoder rebuilds alone, given only the basket's dictionary: the grain of random access. Default morsel = one cherry. XI's cuts become **morsel cuts**: half-cherry (one head), cherry, token-wide morsel (all six layers of a position), pairs of positions | `V[t, 3, :, :]` (layer morsel), `V[t, :, :, :]` (token-wide morsel) |

Why both stanza and basket: a stanza is a place in the thread (positions 4096–8191); a basket is a set of
things to compress, which may be a stanza of one layer, a stanza of all layers, or a whole thread. The
data has stanzas; the coder has baskets; neither is a cherry.

### 3.2 The coder family: what we do to a basket

| proposed word | replaces | definition |
|---|---|---|
| **dictionary** *(the Almanac)* | kept | side information fitted on a basket, held by both ends, so each morsel can travel as a delta. (Never "Python dictionary": say dict or hash map) |
| **delta** *(the Remainder)* | kept | what rebuilds one morsel exactly given the dictionary |
| **heft** $\vw$ | dictionary weight | a dictionary's size in cherries' worth, $\vDsz = \vw\,\ve$. "Weight" is left to the LLM and to attention |
| **delta ratio** $\vrho$ | kept | delta bytes ÷ raw morsel bytes. Excludes the dictionary |
| **dictionary share** $\vw/\vb$ | kept | dictionary bytes per cherry ÷ raw cherry bytes |
| **MDL ratio** | kept | dictionary share + delta ratio: everything out ÷ everything in. The harness's score |
| **twin** *(the Twin)* | sib dictionary, reference entry, exemplar, anchor (repo) | an earlier cherry used, whole, as the prediction for another; the pointer to it is the side information |
| **twin tree** | reference tree, MST | the decodable set of twin links of a basket (its minimum spanning tree by distance) |
| **forecast** | entropy model, exact model, grid-aware model, probability model | the distribution a coder assigns to a value before seeing it; the entropy coder spends $-\log_2$ of it. **Forecast-only estimate** replaces "exact-model estimate" (a code length computed from the forecast, no coder built) |
| **solo** *(the Hermit)*, **loc** *(the Anchor)*, **KLT** *(the Compass)*, **VQ** *(the Hive)* | kept | the dictionary types |
| **scopes: global / thread / stanza** | global / request / block scope | how far one dictionary reaches; $\vgainreq \to g_{\text{thr}}$, $\vgainblk \to g_{\text{stz}}$ |

### 3.3 The machinery: the serving system

| proposed word | replaces | definition |
|---|---|---|
| **LLM** | model, the network, the transformer | the neural network being served (GLM-5.1 on the Pin, Qwen3.5-2B on the Bench). "Stand-in LLM" replaces "proxy model"; "LLM weights" replaces "model weights"; "the toy LLM" in listings |
| **picker** *(the Scout → the Picker)* | indexer, selector | the cheap scorer that, at every layer and step, names the $\vk$ cherries attention will read. It picks cherries |
| **pick** $\vS_{\vt}$, **pick size** $\vk$ | selection, selected set, top-k, selections per step | the set the picker names at one step and layer, and its size |
| **hot cache** *(the Hearth)* | kept | HiSparse's per-thread, per-layer GPU buffer of $\vB$ raw cherries, LRU. A real cache |
| **shelf** *(the Bookshelf)* | dictionary cache | the per-layer set of $\vnD$ basket dictionaries resident on the GPU |
| **δ-miss** *(the Feather)*, **raw miss** *(the Crate)*, **victim tier** *(the Lifebuoy)* | kept | |
| **heavy basket**, **popularity**, **on fire / ice / warming / cooling** | heavy block, … | kept, with basket |
| **rig** | reference setting (as a category) | a frozen set of numbers: **the Pin** (deployment side) and **the Bench** (data side) stay as names |
| **tally** | cost model, "the economics" | the site's arithmetic from bytes per miss to threads per GPU to dollars per million tokens |

### 3.4 Voice words

| proposed | replaces | why |
|---|---|---|
| **the proposal** (Parts I–X), **the measurements** (XI), **the design** (XII); **the primer** = the whole site | "the primer" for Parts I–X in Parts XI–XII | the site is the primer; Parts I–X are its proposal |
| **Dima** | the human, the author | one person, one name, as Part VII already does |
| **fraction of raw** (0.64) | "1.56×", "compression ratio" | one convention |

### 3.5 Kept as they are

bit, surprisal, entropy, side information, mutual information, redundancy, code, entropy coder, rANS,
fixed-length code, escape, random access, prediction, predictor, residual, codebook, centroid, index tax
(renamed? see §5), cache, hit, miss, eviction, LRU, reuse distance, miss-rate curve, layer, head, token,
attention, RoPE, MLA, sparse attention, Lucky Louis property, fallen-apple similarity, upstairs similarity,
neighbour similarity, cat-thread ladder, solo, loc, KLT, VQ, curve, roofline, harness, shuffle control,
campaign, screen, read budget, verified result, same-window comparison, shared table, lever 1 / lever 2.

## 4. Notation that travels with the words

```python
# the orchard of one thread on the Bench (Qwen3.5-2B, FP8 E4M3, one byte per element)
K.shape == V.shape == (225_000, 6, 2, 256)   # [token_pos_id, layer_id, head_id, elem_id]
cherry   = (K[t, l], V[t, l])                # one position, one layer, both heads: 1024 B
strand   = V[:, l, h, c]                     # one element position along the whole thread
stanza   = slice(j * b, (j + 1) * b)         # b positions; a cut of axis 0 only
basket   = V[stanza, l]                      # the default basket's values: b × 512 elements
morsel   = V[t, l]                           # what one delta rebuilds (default: one cherry's values)
```

- Index names are fixed: `token_pos_id` ($\vt$), `layer_id` ($\vl$), `head_id` ($\vh$), `elem_id` ($\vc$),
  `stanza_id` ($\vj$). Shapes are written in this order everywhere, including math subscripts.
- **Hover on code.** Inline code of the form `` `V[…]` `` gets a hover reminder with the slice's shape and
  bytes in the current rig (a small addition to `lib/markdown.js` and `theme/assets/js/core.js`; see §6).
- The cherry's symbol becomes $\vch_{\vt,\vl}$ (macro `\vch`), replacing $\vE_{\vl,\vt}$.

## 5. Open choices for Dima

Pick one per line, or write your own. Defaults in bold.

1. Unit the picker names: **cherry** (your word) — fine.
2. Coder's unit: **morsel** / bite / portion.
3. Position-axis segment: **stanza** / span / stretch.
4. Dictionary-sharing set: **basket** / bundle / punnet.
5. Element position along the thread: **strand** / lane / column.
6. Whole KV store of a thread: **orchard** / grove / hoard. (Or keep "KV cache" and only forbid "cache" alone.)
7. The selector: **picker** / keep "indexer".
8. Dictionary size in cherries' worth: **heft** / bulk / keep "weight".
9. Probability model of a coder: **forecast** / odds / keep "entropy model".
10. Cost arithmetic: **tally** / napkin / keep "cost model".
11. The author in prose: **Dima** / "the author".
12. Index tax (the bits to name a centroid): keep, or rename to **naming tax** to free "index".

## 6. What the rework touches (phase 2, after approval)

Scale, from a count of lines that use the overloaded words in `content/`: block ≈ 1 500 lines, entry ≈ 1 500,
channel ≈ 700, model ≈ 550, request ≈ 650, sequence ≈ 200. This is a rewrite of most pages, not a
find-and-replace, done Part by Part by parallel writers against `docs/project/terminology.md`, with a
`STRICT=1` build and the headless checker after each Part.

1. **Data first.** `data/terms/*.yaml`, `data/symbols/*.yaml`, `data/settings.yaml` (key names), `data/themes.yaml`
   (which-vs-what: "which cherries, versus what is inside them").
2. **Part III becomes "How the machinery works"**, the home of the orchard family: thread, position, orchard,
   cherry, strand, picker, pick, hot cache, each introduced by a listing on Bench shapes with the hover
   shapes. One new page, "The cuts: stanza, basket, morsel", defines the three cuts side by side with
   `::: compare` blocks, before Part IV uses them.
3. **Parts I, II, IV–XII**: rename and reword; equations re-subscripted $(\vt,\vl)$; every `::: define` of a
   renamed term rewritten around its code expression; flashcards updated; figure labels and captions
   (`figures/*.js`) updated where they print the old words.
4. **Reference Part moves to the end** (so the glossary stops warning about terms defined "later"); Part numbers
   shift by one from XI on; prose references like "III.7" are checked by grep.
5. **Home page "The cast"** regrouped into the four families of §3.
6. **Part V paper pages** get the "their words → our words" table on every page (template in
   `docs/workflows/new-paper-page.md`).
7. **Part VII** keeps its content; its title and ledes stop reading as a diary ("What Dima missed" → a
   neutral title, to be chosen), or its pages are moved into the Parts they correct (bigger job; ask).
8. `experiment_repos/…/PART-XI-SPEC.md` translation table updated to the new words (the repo's own words
   stay the repo's).
