---
title: The idea, mapped onto the tiny files
nav: The idea, mapped
lede: Part I ended with a dictionary that shrank a weather message from 148 bytes to about 20. Part III ended with a hot cache whose every miss moves a full 640-byte entry. This page puts the two pictures side by side — and the proposal falls out.
group: The idea
cards:
  - q: In the mapping between zstd and kv-blockdiff, what plays the role of one tiny file?
    a: One entry — the keys and values of one token at one layer
    wrong: ["One block of many tokens", "The whole history of a request", "One layer across all tokens"]
    why: The entry is the unit that is fetched alone on a miss, just as a tiny file is the unit that is compressed alone.
    sec: two-pictures
  - q: In the mapping, what plays the role of zstd's trained dictionary?
    a: A dictionary per block, fitted on that block's entries and kept on the GPU while the block is in use
    wrong: ["The hot cache of raw entries", "The indexer's compact keys", "A list of byte strings copied from earlier entries"]
    why: Like the trained dictionary, it is side information shared by many items, sent to the receiver once.
    sec: two-pictures
  - q: What does a KV dictionary capture that zstd's dictionary does not?
    a: Statistical shape — typical values, common directions, clusters — instead of repeated byte strings
    wrong: ["Repeated byte strings, exactly like zstd", "The order of tokens in the prompt", "Which entries the indexer will select next"]
    why: Two KV entries almost never share a byte string; what they can share is a shape, so matching becomes predicting (I.5).
    sec: two-pictures
  - q: What does kv-blockdiff change about a hot-cache miss?
    a: The miss can move a short delta instead of the raw entry; the GPU rebuilds the entry exactly
    wrong: ["It makes misses rarer with a better eviction policy", "It moves a lower-precision copy of the entry", "It skips the missed entry and attends to the rest"]
    why: Hits, evictions and the indexer stay exactly as in HiSparse; only the bytes per miss shrink. It is lossless, so outputs are unchanged.
    sec: kv-blockdiff
  - q: Which of HiSparse's two "prices" does kv-blockdiff attack first?
    a: The bytes a miss moves over the link
    wrong: ["The number of layers", "The number of entries the indexer selects", "The time attention spends on hits"]
    why: HiSparse charges e bytes per miss and e bytes per slot. kv-blockdiff first shrinks the first price; the second is lever 2 (IV.15).
    sec: kv-blockdiff
---

Two pages of this site, many pages apart, describe the same problem without knowing it.

- On [[#tiny-files-trained-dictionary]], a 148-byte weather message from Gull Rock barely shrank on its own. With a [[trained-dictionary]] on both ends, it shrank to about 20 bytes.
- On [[#landscape-toy-trace]], the [[hot-cache]] of [[hisparse]] missed one [[entry]] per step, and every miss moved the full entry — $\ve = 640$ bytes in the [[reference-setting]] — over the link.

Both are streams of small items fetched one at a time. Both pay full price per item. The first one found a way out. This Part asks whether the second can take the same way.

## Two pictures, one shape {#two-pictures}

[[#tiny-files-profile]] named the profile of a dictionary problem. Two conditions, both required:

1. **An ensemble of alike items.** The items resemble each other in a way a compressor could learn.
2. **Tiny, independent fetches.** No single fetch carries enough context for ordinary compression.

The hot cache's misses meet the second condition by construction. [[#landscape-derived-numbers]] counted about 274 misses per layer per decode step, each a scattered read of 640 bytes. Whether they meet the first condition is the open question of this whole project. Suppose for now that they do. Then every piece of the zstd picture has a counterpart.

::: figure fig-idea-mapping ideaMapping
**The two worlds, row by row.** Left (on a phone, the upper card of each pair): zstd with a trained dictionary, as in Part I. Right (the lower card): the same role in kv-blockdiff. $\vD_{\vj}$ is the dictionary of block $\vj$ (block and $\vj$ are defined on the next page). Click a row to open a note on what carries over from the left world and what changes in the right one; the button opens every note at once.
:::

Three rows deserve a second look.

- **"What repeats."** zstd's dictionary works by matching byte strings. Two KV entries almost never share a byte string. What they can share is a *shape*: similar typical values per [[channel]], similar directions, similar clusters. So a KV dictionary is a small set of numbers, and "matching" becomes [[prediction|predicting]]. This is the swap [[#tiny-files-vectors-not-text]] prepared.
- **"Ship the dictionary once."** Both ends of the Gull Rock link keep the almanac for years. GPU memory is tiny, so here dictionaries come and go, and the system must know at every miss whether the right one is on the GPU.
- **"The decompressor."** zstd may take its time. Here, decoding happens inside a decode step that lasts a fraction of a millisecond, at a random position in the history.

::: aside reminder The three lessons of the dictionary
From [[#tiny-files-three-lessons]]: (1) the redundancy was always there; the access pattern hid it. (2) A dictionary moves cost in time: pay once, profit per item. (3) The receiver must actually have the dictionary. All three come back in this Part: (1) in [[#idea-data-layout]], (2) in [[#idea-size-relations]], (3) in [[#idea-blockdiff-step-by-step]].
:::

::: takeaway
- Hot-cache misses are tiny, scattered, independent fetches: half of the dictionary profile holds by construction.
- Every piece of the zstd picture has a KV counterpart: entry ↔ tiny file, block ↔ corpus, block dictionary ↔ trained dictionary, delta ↔ compressed file.
- What repeats is different: a statistical shape, not byte strings. Whether there is enough of it is the bet.
:::

## kv-blockdiff in one picture {#kv-blockdiff}

HiSparse reduces *how many* misses there are by caching well. As [[#landscape-toy-trace]] showed, it leaves two prices untouched: a miss moves $\ve$ bytes, and a slot in the hot cache holds $\ve$ bytes. The proposal goes after those two prices and nothing else.

::: define kv-blockdiff
- **What it is:** store each request's KV history in host memory as a dictionary per block of consecutive tokens plus one short [[delta]] per entry. A miss whose block dictionary is already on the GPU moves only the delta; the GPU rebuilds the entry bit for bit.
- **What stays the same:** the [[indexer]], the hot cache, its least-recently-used [[eviction]], every hit and every eviction. The model's outputs, because the coding is [[lossless]].
- **What changes:** the bytes per miss — and, later, the bytes per slot ([[#idea-two-levers]]).
- **Easy to confuse with:** KV quantization, which stores fewer bits *approximately* (lossy); better eviction, which reduces the *number* of misses; running zstd over the whole history, which compresses well but cannot decode one entry alone ([[#idea-data-layout]]).
:::

::: figure fig-idea-system ideaSystem
**Where the bytes live, and what crosses the link.** Left box: host memory, holding the full history of one layer of one request. Right box: GPU memory. Arrows: what one miss moves over the link. *HiSparse today:* the history is raw entries; every miss moves one raw entry of $\ve = 640$ bytes. *kv-blockdiff:* the history is stored block by block, each block a dictionary plus one delta per entry; the GPU keeps a few dictionaries next to the unchanged hot cache. A miss in a block whose dictionary is on the GPU moves a delta; a miss in any other block moves the raw entry; a dictionary moves now and then. The byte counts use an assumed delta of 0.75 $\ve$ and an assumed dictionary of 32 entries' worth — illustrative, not measured. Use the switch to compare.
:::

::: theme side-info
The dictionary on the GPU is [[side-information]] in the exact sense of Part II: something the receiver already holds that makes each message cheaper. The catch is the same as on the radio link — a delta is useless unless its dictionary is on hand.
:::

::: takeaway
- kv-blockdiff = per-block dictionaries + per-entry deltas, decoded on the GPU at miss time, bit for bit.
- It keeps HiSparse's indexer, cache and evictions; it changes only what a miss (and later a slot) costs.
- The next pages make each piece precise: [[#idea-dictionary-delta-block]], then [[#idea-size-relations]], then the mechanism in [[#idea-blockdiff-step-by-step]].
:::
