---
title: The idea, mapped onto the tiny files
nav: The idea, mapped
lede: Part I ended with a dictionary that shrank a weather message from 148 bytes to about 20. Part III ended with a hot cache whose every miss moves a full 640-byte entry. This page puts the two pictures side by side — and the proposal falls out.
group: The idea
vendor: [pako.min.js]
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
  - q: In the toy KV history of IV.1, what repeats from one entry to the next?
    a: A shape — neighbouring entries hold similar numbers, but almost never the same bytes
    wrong: ["A fixed skeleton of identical bytes, as in the radio messages", "Nothing at all — every entry is random", "Whole entries, copied exactly"]
    why: The radio messages repeat 88 bytes of keys and punctuation exactly. The entries only wander slowly, so the dictionary holds typical values and the delta is a leftover.
    sec: side-by-side
  - q: In the toy, an entry of 8 bytes costs about 6.6 bytes coded alone and about 5.4 bytes as a delta. Why is the gain smaller than on the radio link?
    a: Numbers that wander share a shape, not exact bytes, so the delta still has to carry the leftover of every element
    wrong: ["Because the toy dictionary is too heavy", "Because the entries are compressed lossily", "Because the block size is too large"]
    why: A radio message was 96 % copies of the one before. A toy entry is close to its neighbours in value, and each element's small leftover still costs bits.
    sec: side-by-side
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

## Two streams, side by side {#side-by-side}

The mapping is easier to believe when both streams are on the table. First the familiar one: the Gull Rock radio archive of Part I, exactly as the mainland received it.

::: dataset fig-idea-gull-messages station-messages view=messages,weather hl=changes metrics=n,bytes,skeleton,new
**The tiny files: two days of Gull Rock messages** ([[#fig-tiny-messages]] again). *The messages* lists all 96 as sent, keys and punctuation dimmed, values coloured; click one to select it. *The weather* draws what they report. Red marks the five messages in which a word changes. *Numbers:* what stays fixed from message to message and what moves. Synthetic data from a fixed seed.
:::

Every message repeats the one before almost byte for byte. Now the twin on the KV side. Nobody has published the numbers of a real 8-bit KV history in a form we could show here, so this is a made-up one: one [[layer]] of one request, 128 [[entry|entries]] of 8 elements each, every element an 8-bit whole number. We built it so that the bet holds — neighbouring entries are alike — to show the mechanics. It says nothing about whether real entries behave this way.

::: dataset fig-idea-toy-history idea-history view=heat,leftovers metrics=shape,c0,solo,dict
**The tiny files of a KV cache: a toy history.** *The entries:* one column per entry (token position $\vt$ = 0 to 127), one row per element; the colour is the stored number (blue negative, red positive, darker = further from zero). Dashed lines cut the history into blocks of 32 entries (the next page defines blocks properly). Hover a cell for its value; drag across to select entries. *Dictionary and deltas:* four of the eight elements over the 128 entries (dots), each block's typical value (gold line) and each entry's leftover from it (sticks); the label over each block is the fixed width of that element's deltas. *Numbers:* sizes, the cost of an entry coded alone, and block 0's dictionary. Synthetic, seeded: each element is a typical value plus a slow wander shared by neighbours plus token noise.
:::

Look at the colours along a row. They drift slowly, so neighbouring entries are alike. But no two columns are equal: there is no fixed skeleton to copy, as there was on the radio. The first row, c0, is large and nearly constant — a stand-in for the few large, slowly changing key [[channel|channels]] that papers on KV quantization report.

So what repeats is a *shape*, and the dictionary changes with it. On the radio it was a pile of sample messages. Here it is each element's typical value in the block. On the radio the delta was a list of copy instructions; here it is a leftover, a small number per element.

Now the bill. The two cards below put the sizes side by side: on the left of each pair a message, or an entry, compressed alone; on the right, against a dictionary.

::: dataset fig-idea-gull-sizes message-sizes view=dictionary,alone marks=dict metrics=alone,dict,dsize
**The tiny files on the link** ([[#fig-tiny-deltas]] again). *Day two, with a dictionary:* one column per day-two message; pale bar, the message compressed alone; solid bar, its delta against the dictionary of 24 day-one messages (DEFLATE, pako level 9, computed live, in bytes); the grey line is the average delta. *Each alone:* all 96 messages, raw and compressed alone. Hover a column for its sizes; drag to select a stretch.
:::

::: dataset fig-idea-toy-sizes idea-entry-sizes view=delta,alone marks=delta metrics=raw,solo,delta,dictb,allin
**The toy entries on the link.** *With the block dictionary:* one column per entry of [[#fig-idea-toy-history]]; pale bar, the entry coded alone (an ideal context-free code: each number costs $-\log_2$ of its frequency in the history); solid bar, its [[delta]] against its block's dictionary (fixed-length leftovers), in bytes; the grey line is the average delta; dashed lines are block boundaries. *Each alone:* raw (8 bytes) and coded alone. Hover a column for its sizes; drag to select. Computed from the toy history.
:::

Read the two cards as one table.

- **Alone, both barely shrink.** A radio message keeps 124.5 of its 147.4 bytes on average; a toy entry keeps 6.61 of its 8. The redundancy lives *between* items, out of reach of an item coded alone.
- **With a dictionary, both shrink — by very different amounts.** A radio message falls from 124.5 bytes alone to 22.1 as a delta. A toy entry falls only to 5.44 bytes, 0.68 of its raw size. Wandering numbers never repeat exactly, so every element still pays for its leftover.
- **The dictionary is paid once and shared.** On the radio, 3,522 bytes serve every later message. In the toy, 16 bytes serve one block of 32 entries, which adds half a byte to each.

That second point is the honest summary of the whole proposal. The redundancy that real KV entries share is a statistical shape, and its exchange rate into bytes is far harsher than for text. How much of it there is in real 8-bit caches is unmeasured ([[#idea-the-trap]] prices the possibilities).

::: takeaway
- The radio messages repeat bytes; the toy entries repeat a shape — similar values, never equal ones.
- In both, an item alone barely shrinks, and a dictionary on both ends makes each item cheaper.
- For numbers the gain is smaller: in the toy, 6.61 bytes alone and 5.44 as a delta, out of 8.
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
