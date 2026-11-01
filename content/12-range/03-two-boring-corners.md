---
title: The two boring corners
nav: The two boring corners
group: The design
lede: 'Walk the measured compressibility curve from one end to the other. At the left end the dictionary is so small that it is always resident, and the design is per-entry coding. At the right end it is half the block, and keeping it resident for every block means keeping half the history on the GPU. Both ends are settled. The design lives in between.'
cards:
  - q: Why does a dictionary of 2 % of the block reduce to per-entry coding?
    a: It holds a mean and a width per channel, a few entry classes and a prediction table, so every miss still moves one delta of about two thirds of an entry; it is a solo coder with a per-block rule
    wrong: ["Because it is stored in host memory", "Because its deltas are empty", "Because it cannot be loaded asynchronously"]
    why: The light coder 129 has no reference entries. Its dictionary describes the block's distribution; the entries are still coded one at a time against it.
    sec: tiny-dictionaries
  - q: What does the literature say per-entry coding of 8-bit KV is worth, and what bounds it?
    a: About 1.1–1.3×, bounded by the order-0 entropy of the channel (6.47 bits for a bell-shaped E4M3 channel)
    wrong: ["About 2×, bounded by the block size", "About 1.6×, bounded by the link", "Nothing, since 8-bit values are incompressible"]
    why: SplitZip's published numbers and the primer's own budget page agree. The campaigns' light coder reached 0.686 on layer entries, 0.09 past the solo ideal of 0.778 thanks to its per-block rule.
    sec: tiny-dictionaries
  - q: 'On the Pin, keep every block''s tree-coder dictionary resident. About how many requests does one GPU serve?'
    a: About 11, against HiSparse's 109, bound by GPU memory
    wrong: ["About 147, bound by the link", "About 109, the same as HiSparse", "About 436, bound by the link"]
    why: 'Twenty-five dictionaries of 2,150 entries'' worth per layer are about 13 hot caches; 78 layers of them take about 2.7 GB per request, and 30 GB holds eleven of those.'
    sec: all-resident
  - q: What makes the all-resident corner boring rather than wrong?
    a: It reduces to keeping (half) the history in GPU memory, which is the memory wall HiSparse was built to get around
    wrong: ["Its deltas are too large", "It needs a decoder that does not exist", "The link cannot carry the dictionaries"]
    why: The link side is fine, about 436 requests' worth at 2K slots. GPU memory, the thing the whole host-memory design exists to save, is what runs out.
    sec: all-resident
  - q: What defines the interesting range of dictionaries?
    a: Large enough to carry the block's shared structure, too large to keep resident for every block, so kept in host memory and loaded for the blocks the selector keeps wanting
    wrong: ["Any dictionary under 10 % of the block", "Any dictionary that fits the read budget", "Dictionaries fit on the whole request"]
    why: It is the dictionary cache of IV.4 and the heavy-block bet of IV.10, now with measured sizes on the curve.
    sec: the-range-between
---

Part XI left the primer a measured [[curve|compressibility curve]]. Under a dictionary budget of 2 % of the block the best coder reached a ratio of 0.753; at 10 %, 0.710; at 25 %, 0.691; unconstrained, 0.682 at a dictionary of 36 %. On another screen the tree coder put 52.5 % of the block in its dictionary and reached 0.636. The human's reading of that curve, retold here, is that its two ends are things everyone already knows how to build, and the design question is the stretch between them.

## The tiny-dictionary corner {#tiny-dictionaries}

Start at the left end. A dictionary of 2 % of a 4,096-token block is about 82 entries' worth. All twenty-five of a 100K-token request's blocks could keep theirs on the GPU for half a [[hot-cache]], and nothing would ever need loading. The [[campaign|campaigns']] light coder 129 shows what such a dictionary holds, a mean and a width per [[channel]], four entry classes and a small table for [[linear-prediction]], with no [[reference-entry|reference entries]]. Every entry is coded on its own against that description, and every miss moves a delta of about two thirds of a raw entry.

That is [[solo|solo coding]] with a per-block rule. It is the first thing anyone tries, and the literature has already priced it. Coding 8-bit KV one element at a time is worth about 1.1–1.3× ([[#homework-solo-coding]], [[#papers-splitzip]]). The information theory says why there is no more to find there. A coder that looks at one element alone can do no better than the [[order-0-entropy]] of its channel, which for a bell-shaped E4M3 channel is 6.47 bits of 8 ([[#homework-the-budget]]). The campaigns' solo ideal over six layers was 6.22 bits, a ratio of 0.778; their light coder, with its per-block means and classes, reached 0.686 on layer entries, or 5.49 bits. The per-block rule buys about 0.7 bit on top of solo. Everything a block's entries share beyond their common distribution stays on the table, and [[#range-what-the-half-means]] measured that remainder at about a fifth of the bits.

::: note warning An entropy-coded number
The 0.686 is an rANS stream. The miss path wants fixed-length deltas, and at this depth the fixed-length rate runs about a bit above the entropy rate ([[#homework-two-rates]]). The corner is less attractive on the wire than on the ledger.
:::

Boring does not mean useless. The primer counts every gain from this corner ([[#homework-solo-coding/blind]]) and [[#missed-light-dictionaries-first]] made it the fallback. It contains no new mechanism, no residency question, no load and no counter.

::: takeaway
- A dictionary of 2 % is a description of the block's distribution; coding against it is solo coding with a per-block rule.
- The literature prices per-entry coding at 1.1–1.3×, bounded by the order-0 entropy (6.47 bits for E4M3); the campaigns' light coder reached 0.686 on layer entries.
- The corner is already published and already the primer's baseline; it holds no design question.
:::

## The all-resident corner {#all-resident}

Now the right end. The tree coder's dictionary is half the block, made of the block's own entries laid along a [[reference-tree]] ([[#measured-reading-one-entry]]). A cold decode of one entry walks its path to the root and reads about 120 entries' worth, so the dictionary has to be in GPU memory before a miss can be served as a delta. The simplest way to arrange that is to keep every block's dictionary resident for the whole request.

Count what that costs on the [[reference-setting|Pin]]. One dictionary is $0.525 \times 4096 \approx 2{,}150$ entries' worth per layer; a 100K-token request has 25 blocks, so about 53,800 entries' worth per layer, about thirteen hot caches of 4,096 slots, or 2.7 GB of dictionaries per request over 78 layers before the hot cache itself. The calculator of [[#measured-what-it-means]] puts the result at about **11 requests per GPU** against [[hisparse|HiSparse's]] 109, with GPU memory binding and the link idle (it could feed about 436, since every miss is a tenth of an entry).

The corner reduces to a sentence. Keep half of every history in GPU memory, compressed. That is a respectable design, the primer's [[lever|lever 2]] with the [[victim-tier]] as its gentle first form ([[#measured-what-it-means]]). It is also the thing [[#landscape-memory-wall]] says a GPU cannot afford and [[#landscape-hisparse]] exists to avoid. HiSparse moved the history to host memory so that the GPU could hold a small desk per request; filling the GPU back up with dictionaries undoes the move.

::: note numbers The same corner for lighter dictionaries
All-resident fails well before the tree point. At 10 % of the block, twenty-five dictionaries of 410 entries' worth are two and a half hot caches per layer, about 42 requests per GPU at 4,096 slots. Even the light coder's 2 % dictionaries, all resident, cost half a hot cache and leave the GPU at about 0.88× HiSparse ([[#measured-what-it-means/the-miss-path]]). On the Pin, "resident for every block" is affordable only for dictionaries of a few entries' worth, the [[loc]] of [[#homework-loc]].
:::

::: takeaway
- A tree coder's dictionary is 2,150 entries' worth per block per layer; all 25 resident is 13 hot caches, about 2.7 GB per request.
- On the Pin that serves about 11 requests per GPU against 109. GPU memory binds; the link is idle.
- The corner is "keep half the history in HBM", the memory wall that HiSparse was built to get around.
:::

## The range between {#the-range-between}

Between the two ends the curve is convex. Two per cent of dictionary buys 42 % of the gain the unconstrained coder reaches on that screen, ten per cent buys 77 %, a quarter buys 93 %. Each step to the right buys less delta for more dictionary. The dictionaries that carry most of the gain start at about a tenth of the block, and those are already too large to keep for every block. They have to live in host memory, like the history itself, and come to the GPU only when their block is wanted.

::: define interesting-range the interesting range
- **What it is:** the dictionaries that are large enough to carry a block's shared structure and too large to keep resident for every block. They sit in host memory and are brought to the GPU for the blocks the selector keeps wanting.
- **Where it is on the curve:** from about a tenth of the block (410 entries' worth at $\vb = 4096$) up to the tree point (half the block). The measured points at 10 %, 25 %, 36 % and 52.5 % all lie in it.
- **Easy to confuse with:** the [[dictionary-cache]], the mechanism that serves this range; and Part VI's "heavy" dictionaries of 256 entries' worth. Here a dictionary is heavy when it is a sizeable share of its block.
:::

This is the primer's own bet, with sizes filled in. [[#idea-blockdiff-step-by-step]] added a shelf of $\vnD$ dictionaries next to the hot cache; [[#idea-heavy-blocks]] said the shelf pays only if misses crowd into a few blocks that stay busy. Part VI priced it with assumed weights of 32 and 256 entries' worth. The curve replaces those with 410 to 2,150, and with the saving each one buys per miss.

::: figure fig-rng-corners rngCorners wide
**The two corners on the measured curve.** Horizontal axis: dictionary share, the dictionary's bytes over the block's raw bytes ($\vw/\vb$, 0 to 1). Vertical axis: delta share, the mean delta over a raw entry ($\vrho$). The two coordinates add up to the [[mdl-ratio]], so diagonals are lines of constant ratio. Dots: the C1 points under a dictionary budget, (0.02, 0.733), (0.10, 0.610), (0.25, 0.443) and (0.36, 0.325), all from the values of layer 3, head 0 with coder 30 at 4,096 tokens and no read budget; the C2 tree point (0.525, 0.112), coder 121 on one layer's entries under a read budget of 293; and the right end of the baseline, (1, 0), the whole block resident raw. Solid diagonal: the baseline $\vw/\vb + \vrho = 1$, no compression. Dashed: solo coding, at 0.778 over six layers and at 0.804 on the C1 screen. Shaded left: the per-entry corner. Shaded right: half the history resident. Between them, the interesting range. Smaller marks: the best coder at each budget by the end of C1 (hollow), coder 129, and coder 43 with every entry in the dictionary at (0.67, 0); the curve starts at the solo-coded point. Hover a dot for its campaign receipt. Two screens share one plot, so the shape is solid and the third decimal is not.
:::

::: try
1. Compare the drop from the 2 % point to the 10 % point with the drop from 36 % to 52.5 %. The first buys 0.12 of delta for 0.08 of dictionary; the second, across two screens, buys 0.21 for 0.17, and most of that is bookkeeping, since a tree's dictionary is made of entries ([[#range-what-the-half-means]]).
2. Follow the solo line to the baseline. Every dot below it has paid for its dictionary on the ledger. None of them has yet paid for loading it, which is the next two pages.
:::

::: pull
The interesting range is where a dictionary is worth loading and too heavy to leave loaded.
:::

Two facts must hold for the range to pay. The bytes are measured now; the curve says what each dictionary saves per miss. The traffic is not; whether misses crowd into few blocks for long enough to amortize a load is the [[heavy-block]] property, never replayed ([[#questions-q3]], [[#questions-framework-c]]). [[#range-on-fire]] designs the mechanism; [[#range-the-napkin-for-fire]] prices it with measured bytes and assumed traffic.

::: theme which-vs-what
The curve is a "what" measurement. It says how alike the entries of a block are, in bits. Whether the selector keeps returning to the same block is a "which" question, and the interesting range stands or falls on it.
:::

::: aside source Receipts
- Budgeted points: campaign C1, layer 3, head 0, coder 30 (copy-shrink) at 4,096 tokens, dictionary share ≤ 0.02 / ≤ 0.10 / ≤ 0.25 / unconstrained → 0.7532 / 0.7095 / 0.6906 / 0.6815, solo 0.804 on that screen: ledger trials r1-t0030, r1-t0036, r1-t0031, r1-t0037 (isolated-verified; the ledger's dictionary shares are 0.020, 0.099, 0.248 and 0.356), re-read by `analysis/range_extract.py` into `figures/data/range-curve.json`; also `research/ASK_HUMAN.md` r1.Q1 and `research/c1/KNOWLEDGE.md` budget/*. Shares of the gain are these differences over 0.804 − 0.6815.
- Tree point: coder 121, env-t0096, 0.63639 = 0.525 + 0.112; cold reads mean 120, worst 226 ([[#measured-reading-one-entry]]). Light coder 129: r25-t0003, 0.6863, dictionary 0.01–0.04. Solo ideal 0.778: r1-t0005.
- 6.47 bits: `analysis/homework_a_budget.py` ([[#homework-the-budget]]). 1.1–1.3×: SplitZip, [[#papers-splitzip]].
- All-resident requests: the `msrEconomics` calculator of [[#measured-what-it-means]] with 25 dictionaries of 0.525 × 4096 entries' worth resident, best at $\vB = 2048$; the 10 % and 2 % variants use the same formulas ([[#homework-economics]]).
:::

::: takeaway
- The curve is convex: 2 % of dictionary buys 42 % of the gain, 10 % buys 77 %, a quarter buys 93 %.
- The interesting range is the dictionaries from about a tenth of the block to half of it: worth loading, too heavy to keep for every block, so kept in host memory and brought in for the blocks the selector keeps wanting.
- Its bytes are measured; its traffic is not. The next two pages design and price it.
:::
