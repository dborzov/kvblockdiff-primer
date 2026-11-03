---
title: From the scenario to the serving system
nav: From scenario to system
group: The idea
lede: Part IV priced one cherry. Part III counted picks, about 274 misses per layer per decode step on the Pin, each a scattered fetch over the link. Put the price and the count together and a proposal falls out, serve a miss with deltas instead of raw bytes.
cards:
  - q: How does a pick relate to the cherries of a scenario?
    a: The indexer names a pick; the scenario's cherry shape says how many cherries rebuild it, one on the Pin, one or two on the Bench
    wrong: ["A pick is always exactly one cherry", "A pick is a punnet", "Picks and cherries are the same word for the same thing"]
    why: 'A pick is `(layer_id, token_pos_id)`. Under `cherry v[t, l, :, :]` that is one cherry; under `v[t, l, h, :]` it is two; a design that moves keys and values together needs the cherries of two slices.'
    sec: picks-and-cherries
  - q: In the mapping between the tiny files of Part I and kvblockdiff, what plays the role of one tiny file?
    a: One cherry, the unit a miss fetches alone
    wrong: ["One stretch of 4096 positions", "The whole orchard of a sequence", "One dictionary"]
    why: A tiny file is compressed alone against a shared dictionary; a cherry is delivered alone as a delta against its punnet's dictionary. Same shape of problem.
    sec: picks-and-cherries
  - q: What does kvblockdiff change about a hot-cache miss?
    a: A miss whose punnet dictionary is on the GPU moves a delta instead of the raw pick, and the GPU rebuilds the pick bit for bit
    wrong: ["It makes misses rarer with a better eviction policy", "It moves a lower-precision copy of the pick", "It skips the missed pick and attends to the rest"]
    why: The indexer, the hot cache, every hit and every eviction stay as in HiSparse. Only the bytes per miss change, and the LLM's outputs do not change at all.
    sec: kvblockdiff
  - q: Which number of Part IV does a miss on the link care about?
    a: 'The delta share $\vrho$: a δ-miss moves $\vrho\,\ve$ bytes'
    wrong: ["The dictionary share", "The MDL ratio", "The leash"]
    why: The dictionary was moved earlier and sits on the GPU; what crosses the link at miss time is one delta per cherry of the pick.
    sec: kvblockdiff
---

Part IV ended on one sentence: the [[indexer]] names [[pick|picks]], a pick is served with one or more [[cherry|cherries]], and a shelf on the GPU holds the dictionaries of their punnets ([[#scenario-what-it-is-not/the-bridge]]). Part I ended on another: a 148-byte Gull Rock message shrank to about 20 bytes once both ends held a [[trained-dictionary]] ([[#tiny-files-trained-dictionary]]). Both are about small things fetched one at a time. This Part is where they meet, and every number in it is a scenario's number multiplied by a count of picks.

## Picks and cherries {#picks-and-cherries}

Start on the serving system's side. At every decode step, for every layer of every [[sequence]], the indexer hands HiSparse a set $\vS$ of $\vk$ picks ([[#landscape-sparse-attention]]). Each pick is a `(layer_id, token_pos_id)`. Those already in the [[hot-cache]] are hits. The rest are misses, and today each miss fetches the raw pick from host memory, $\ve$ bytes over the [[link]] ([[#landscape-hisparse]]). On [[pin|the Pin]] that is one MLA latent of one token at one layer, 640 B; about 274 misses per layer per step at 4096 hot-cache slots ([[#landscape-derived-numbers]]).

Now the scenario's side. The [[sender-receiver|receiver]] asks for one cherry; the sender answers with its [[delta]]. A cherry is whatever the [[scenario]]'s [[slice]] and [[cherry-shape|cherry shape]] say it is. The two sides meet in one function, [[~cherries-of]]:

```python what one pick asks the scenario for
def cherries_of(p, scenario):
    """The cherries that rebuild pick p = (layer_id, token_pos_id)."""
    # the Pin, GLM-5.1: one MLA latent per token per layer; slice latent[:, layer_id], cherry (640,)
    #   -> one cherry of 640 B
    # the Bench, Qwen3.5-2B: slice v[:, layer_id], cherry v[t, l, :, :]
    #   -> one cherry of 512 B: both KV heads of that token at that layer
    # the Bench with cherry v[t, l, h, :]
    #   -> two cherries of 256 B, one per KV head
    # a design that moves keys and values together
    #   -> the cherries of two slices, one of k and one of v
    sid = p.token_pos_id // scenario.stretch_len
    return [c for c in cherries(sid, scenario) if c.token_pos_id == p.token_pos_id and c.layer_id == p.layer_id]
```

| the serving system has | the scenario has | on the Pin |
|---|---|---|
| a pick `(layer_id, token_pos_id)` | one or more cherries | one cherry of shape `(640,)`, 640 B |
| a hot-cache miss | one ask per cherry of the pick | one ask, one delta |
| what a miss moves today | `cherry_bytes` per cherry | 640 B |
| what a miss could move | one delta per cherry, $\vrho\,\ve$ on average | 72 B to 426 B, by the point on the curve ([[#scenario-the-score]]) |
| one sequence's orchard in host memory, per layer | stretches of 4096 positions, each a [[punnet]] with its [[dictionary]] | 25 stretches for 100 384 tokens |

The last column uses the delta shares the campaigns measured on the Bench, 0.112 for the heaviest dictionary and 0.665 for the lightest, carried over to 640-byte cherries. Whether they carry over is an assumption, marked wherever it is used.

[[#tiny-files-profile]] named the two conditions of a dictionary problem: an ensemble of alike items, and tiny independent fetches. The misses meet the second by construction. The first is what Parts VII and VIII are about; suppose for now that it holds. Then every piece of the zstd picture has a counterpart.

::: figure fig-app-mapping ideaMapping
**The two worlds, row by row.** Left (on a phone, the upper card of each pair): zstd with a trained dictionary, as in Part I. Right (the lower card): the same role in kvblockdiff. Read the right-hand cards in this site's words: *one cherry* (a token's values at one layer, $\ve$ bytes), *the punnet of one stretch* ($\vb$ consecutive positions of one sequence at one layer), *the punnet's dictionary* $\vD_{\vj}$ (per-furrow locations and scales, a basis, a codebook, reference cherries), *load $\vD_{\vj}$ onto the shelf once*, *the delta* $\vdelta$, *a gather-and-add on the GPU*, and *what repeats* (a statistical shape, not byte strings). Click a row for what carries over from the left world and what changes in the right one; the button opens every note.
:::

Three rows deserve a second look.

- **What repeats.** zstd's dictionary matches byte strings. Two cherries almost never share a byte string; what they can share is a shape, a typical value per [[furrow]], a common direction, a cluster, or a near-copy of an earlier cherry. So a dictionary here is a small set of numbers and "matching" becomes [[prediction|predicting]], the swap [[#tiny-files-vectors-not-text]] prepared.
- **Ship the dictionary once.** Gull Rock's almanac stayed on both ends for years. GPU memory is small, so here dictionaries come and go, and at every miss the system must know whether the right one is on the GPU.
- **The decompressor.** zstd may take its time. Here decoding happens inside a decode step of 30 ms, shared by 78 layers, at a random position of a 100K-token orchard.

The mapping also says what the project is as a piece of work. Its goal is one number, more sequences per GPU than HiSparse at unchanged outputs, and that number is one bill with four lines. Each line is supplied by a subproblem with its own clean framing and its own page: the bytes per cherry, from the compression scenario ([[#scenario-one-cherry-at-a-time]]); which picks miss and where they land, from a pick trace and a replay of the hot cache ([[#plan-queries-and-picks]], [[#plan-hot-cache-replay]]); how fast a delta can be rebuilt, from the decoder's speed ([[#plan-decoder-speed]]); and the arithmetic that adds the lines up, the economics of this Part ([[#app-the-napkin]]). A result on one line is a result; the bill is only as good as its least-trusted line.

::: takeaway
- The indexer names picks; the scenario delivers cherries; `cherries_of` joins them. On the Pin a pick is one cherry of 640 B.
- Every piece of the zstd picture has a counterpart: cherry ↔ tiny file, punnet ↔ the station's messages, punnet dictionary ↔ trained dictionary, delta ↔ compressed file.
- What repeats is a statistical shape, not byte strings. Whether there is enough of it is the bet of Parts VII and VIII.
- The project is one bill with four lines, each from its own subproblem: the scenario, the pick trace and replay, the decoder's speed, the economics.
:::

## kvblockdiff in one card {#kvblockdiff}

HiSparse reduces *how many* misses there are by caching well. It leaves two prices untouched: a miss moves $\ve$ bytes, and a slot of the hot cache holds $\ve$ bytes. The proposal goes after those two prices and nothing else.

::: define kvblockdiff
- **What it is.** Keep each sequence's [[orchard]] in host memory as, per stretch and per layer, one dictionary for the punnet plus one delta per cherry. A miss whose punnet dictionary is already on the GPU moves only the deltas of its cherries; the GPU rebuilds the pick bit for bit under the [[contract]] of Part IV.
- **What stays the same.** The indexer, the hot cache, its least-recently-used [[eviction]], every hit and every eviction. The LLM's outputs, because the coding is [[lossless]].
- **What changes.** The bytes per miss, and later the bytes per slot ([[#app-two-levers]]).
- **Easy to confuse with** KV quantization, which stores fewer bits approximately ([[lossy]]); better eviction, which reduces the *number* of misses; and zstd over the whole orchard, which compresses well and cannot decode one cherry alone ([[#app-data-layout]]).
:::

::: figure fig-app-system ideaSystem
**Where the bytes live, and what crosses the link.** Left box: host memory, holding the orchard of one layer of one sequence. Right box: GPU memory. Arrows: what one miss moves over the link. *HiSparse today:* the orchard is raw cherries; every miss moves one raw pick of $\ve = 640$ bytes. *kvblockdiff:* the orchard is stored stretch by stretch, each punnet a dictionary plus one delta per cherry; the GPU keeps a few dictionaries next to the unchanged hot cache. A miss in a stretch whose dictionary is on the GPU moves a delta; a miss in any other stretch moves the raw pick; a dictionary moves now and then. The byte counts use an assumed delta of 0.75 $\ve$ and an assumed dictionary of 32 cherries' worth, illustrative, not measured. Use the switch to compare.
:::

::: theme side-info
The dictionary on the GPU is [[side-information]] in the exact sense of Part II: something the receiver already holds that makes each message cheaper. The catch is the same as on the radio link. A delta is useless unless its dictionary is at hand.
:::

::: takeaway
- kvblockdiff = punnet dictionaries + per-cherry deltas, decoded on the GPU at miss time, bit for bit.
- It keeps HiSparse's indexer, cache and evictions; it changes only what a miss (and later a slot) costs.
- The next pages make each piece precise: the sizes ([[#app-sizes]]), the shelf and the two kinds of miss ([[#app-shelf-and-two-misses]]), the trace ([[#app-toy-trace]]).
:::
