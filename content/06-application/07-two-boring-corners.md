---
title: The two boring corners
nav: The two boring corners
group: The design
lede: 'Walk the measured compressibility curve from one end to the other. At the left end the dictionary is so small that it can stay resident everywhere, and the design is solo coding with a per-punnet rule. At the right end it is half the punnet, and keeping it resident for every stretch means keeping half the orchard on the GPU. Both ends are settled. The design lives in between.'
cards:
  - q: Why does a dictionary of 2 % of the punnet reduce to coding each cherry on its own?
    a: It holds a location and a scale per furrow, a few cherry classes and a prediction table, so every miss still moves one delta of about two thirds of a cherry; it is solo coding with a per-punnet rule
    wrong: ["Because it is stored in host memory", "Because its deltas are empty", "Because it cannot be loaded asynchronously"]
    why: The light compressor 129 has no reference cherries. Its dictionary describes the punnet's distribution; the cherries are still coded one at a time against it.
    sec: tiny-dictionaries
  - q: What does the literature say per-cherry coding of 8-bit values is worth, and what bounds it?
    a: About 1.1–1.3×, bounded by the order-0 entropy of a furrow (6.47 bits for a bell-shaped E4M3 furrow)
    wrong: ["About 2×, bounded by the stretch length", "About 1.6×, bounded by the link", "Nothing, since 8-bit values are incompressible"]
    why: SplitZip's published numbers and the toolbox's budget page agree. The campaigns' light compressor reached 0.686, 0.09 past the solo ideal of 0.778, thanks to its per-punnet rule.
    sec: tiny-dictionaries
  - q: 'On the Pin, keep every stretch''s reference-tree dictionary resident. About how many sequences does one GPU serve?'
    a: About 11, against HiSparse's 109, bound by GPU memory
    wrong: ["About 147, bound by the link", "About 109, the same as HiSparse", "About 436, bound by the link"]
    why: 'Twenty-five dictionaries of 2 150 cherries'' worth per layer are about 13 hot caches; 78 layers of them take about 2.7 GB per sequence, and 30 GB holds eleven of those.'
    sec: all-resident
  - q: What makes the all-resident corner boring rather than wrong?
    a: It reduces to keeping half the orchard in GPU memory, which is the memory wall HiSparse was built to get around
    wrong: ["Its deltas are too large", "It needs a decoder that does not exist", "The link cannot carry the dictionaries"]
    why: The link side is fine, about 436 sequences' worth. GPU memory, the thing the host-memory design exists to save, is what runs out.
    sec: all-resident
  - q: What defines the interesting range of dictionaries?
    a: Large enough to carry the punnet's shared structure, too large to keep resident for every stretch, so kept in host memory and loaded for the stretches the indexer keeps wanting
    wrong: ["Any dictionary under 10 % of the punnet", "Any dictionary that passes the leash", "Dictionaries fit on the whole sequence"]
    why: It is the dictionary shelf of VI.3 with measured sizes on the curve, and the heavy-stretch bet of VI.8.
    sec: the-range-between
---

Part VIII left this site a measured [[curve|compressibility curve]]. Under a dictionary budget of 2 % of the punnet the best compressor reached a ratio of 0.753; at 10 %, 0.710; at 25 %, 0.691; unconstrained, 0.682 at a dictionary of 36 %. On another screen the reference-tree compressor put 52.5 % of the punnet in its dictionary and reached 0.636. The reading of that curve on this page is that its two ends are things everyone already knows how to build, and the design question is the stretch between them.

## The tiny-dictionary corner {#tiny-dictionaries}

Start at the left end. A dictionary of 2 % of a 4096-cherry [[punnet]] is about 86 cherries' worth. All twenty-five stretches of a 100K-token sequence on [[pin|the Pin]] could keep theirs on the GPU for half a [[hot-cache]], and nothing would ever need loading. The campaigns' light compressor 129 shows what such a dictionary holds: a location and a scale per [[furrow]], four cherry classes and a small table for [[linear-prediction]], with no reference cherries ([[#toolbox-furrow-statistics]]). Every cherry is coded on its own against that description, and every miss moves a delta of about two thirds of a raw cherry.

That is [[solo|solo coding]] with a per-punnet rule. It is the first thing anyone tries, and the literature has already priced it. Coding 8-bit values one element at a time is worth about 1.1–1.3× ([[#toolbox-solo]], [[#papers-splitzip]]). The information theory says why there is no more to find there. A compressor that looks at one element alone can do no better than the [[order-0-entropy]] of its furrow, which for a bell-shaped E4M3 furrow is 6.47 bits of 8 ([[#toolbox-the-bill]]). The campaigns' solo ideal over six layers was 6.22 bits, a ratio of 0.778; their light compressor, with its per-punnet locations and classes, reached 0.686 on `cherry (2, 256)`, or 5.49 bits. The per-punnet rule buys about 0.7 bit on top of solo. Everything a punnet's cherries share beyond their common distribution stays on the table, and [[#measured-what-the-half-means]] measured that remainder at about a fifth of the bits.

::: note warning An entropy-coded number
The 0.686 is an rANS stream. The miss path wants fixed-length deltas, and at this depth the fixed-length rate runs about a bit above the entropy rate ([[#toolbox-two-rates]]). The corner is less attractive on the wire than on the ledger.
:::

Boring does not mean useless. All-resident light dictionaries cost no loads, no counter and no residency question, and the calculator of [[#app-calculator]] shows what they buy: at $\vrho = 0.665$ with 86 cherries' worth per stretch resident everywhere, about 96 sequences per GPU against HiSparse's 109, 0.88×, because even half a hot cache of dictionaries per layer costs more memory than the cheaper misses give back on the Pin.

::: takeaway
- A dictionary of 2 % is a description of the punnet's distribution; coding against it is solo coding with a per-punnet rule.
- The literature prices per-cherry coding at 1.1–1.3×, bounded by the order-0 entropy (6.47 bits for E4M3); the campaigns' light compressor reached 0.686.
- The corner is already published and holds no design question; on the Pin, all resident, it is 0.88× HiSparse.
:::

## The all-resident corner {#all-resident}

Now the right end. The reference-tree compressor's dictionary is half the punnet, made of the punnet's own cherries laid along a [[reference-tree]] ([[#toolbox-reference-cherries]]). A cold decode of one cherry walks its path to the root and reads about 120 cherries' worth ([[#measured-reading-one-cherry]]), so the dictionary has to be in GPU memory before a miss can be served as a delta. The simplest way to arrange that is to keep every stretch's dictionary resident for the whole sequence.

Count what that costs on the Pin. One dictionary is $0.525 \times 4096 \approx 2\,150$ cherries' worth per layer; a 100K-token sequence has 25 stretches, so about 53 800 cherries' worth per layer, about thirteen hot caches of 4096 slots, or 2.7 GB of dictionaries per sequence over 78 layers before the hot cache itself. The result is about **11 sequences per GPU** against [[hisparse|HiSparse's]] 109, with GPU memory binding and the link idle (it could feed about 436, since every miss is a ninth of a cherry).

The corner reduces to a sentence. Keep half of every orchard in GPU memory, compressed. That is a respectable design, this site's [[lever|lever 2]] with the victim tier as its gentle first form ([[#app-victim-tier]]). It is also the thing [[#landscape-memory-wall]] says a GPU cannot afford and [[#landscape-hisparse]] exists to avoid. HiSparse moved the orchard to host memory so that the GPU could hold a small desk per sequence; filling the GPU back up with dictionaries undoes the move.

::: note numbers The same corner for lighter dictionaries
All-resident fails well before the tree point. At 10 % of the punnet, twenty-five dictionaries of 410 cherries' worth are two and a half hot caches per layer, about 42 sequences per GPU at 4096 slots. Even the 2 % dictionaries, all resident, cost half a hot cache and leave the GPU at 0.88× HiSparse. On the Pin, "resident for every stretch" is affordable only for dictionaries of a few cherries' worth, the furrow statistics of [[#toolbox-furrow-statistics]].
:::

::: aside source Receipts
- All-resident arithmetic (the `econ()` formulas of `figures/homework-b.js`, [[#app-the-napkin]]): tree point, resident weight $25 \times 2\,150 = 53\,750$ cherries' worth per layer; GPU memory $78 \times 640\ \text{B} \times (2\,048 + 53\,750) \approx 2.79$ GB per sequence at $\vB = 2048$ (the best of the three cache sizes), $30\ \text{GB} / 2.79\ \text{GB} \approx 10.8$; link bytes $0.30 \times 2048 \times 78 \times 640\ \text{B} \times 0.112 \approx 3.4$ MB, $1.5\ \text{GB} / 3.4\ \text{MB} \approx 436$. The 10 % point: $25 \times 410 = 10\,250$; $78 \times 640 \times (4\,096 + 10\,250) \approx 716$ MB, 41.9. The 2 % point: $25 \times 86 = 2\,150$; $78 \times 640 \times 6\,246 \approx 312$ MB, 96.2; the link would feed $1.5\ \text{GB} / (13.7\ \text{MB} \times 0.665) \approx 165$.
- Curve points and shares: C1, layer 3, head 0, compressor 30 at `stretch 4096`, dictionary share ≤ 0.02 / ≤ 0.10 / ≤ 0.25 / unconstrained → 0.7532 / 0.7095 / 0.6906 / 0.6815, solo 0.804 on that screen; ledger trials r1-t0030, r1-t0036, r1-t0031, r1-t0037 (`figures/data/range-curve.json`). Shares of the gain are these differences over 0.804 − 0.6815.
- Tree point: compressor 121, env-t0096, 0.63639 = 0.525 + 0.112; cold reads mean 120, worst 226. Light compressor 129: r25-t0003, 0.6863, dictionary share 0.021. Solo ideal 0.778: `solo_ratio` landmark of `s-layer-b4k-r293` (0.77811); 0.804 on the C1 screen: r1-t0005. 6.47 bits: `analysis/homework_a_budget.py`. 1.1–1.3×: SplitZip.
:::

::: takeaway
- A reference-tree dictionary is 2 150 cherries' worth per stretch per layer; all 25 resident is 13 hot caches, about 2.7 GB per sequence.
- On the Pin that serves about 11 sequences per GPU against 109. GPU memory binds; the link is idle.
- The corner is "keep half the orchard in HBM", the memory wall that HiSparse was built to get around.
:::

## The range between {#the-range-between}

Between the two ends the curve is convex. Two per cent of dictionary buys 42 % of the gain the unconstrained compressor reaches on that screen, ten per cent buys 77 %, a quarter buys 93 %. Each step to the right buys less delta for more dictionary. The dictionaries that carry most of the gain start at about a tenth of the punnet, and those are already too large to keep for every stretch. They have to live in host memory, like the orchard itself, and come to the GPU only when their stretch is wanted.

::: define interesting-range the interesting range
- **What it is.** The dictionaries that are large enough to carry a punnet's shared structure and too large to keep resident for every stretch. They sit in host memory and are brought to the GPU for the stretches the [[indexer]] keeps wanting.
- **Where it is on the curve.** From about a tenth of the punnet (410 cherries' worth at $\vb = 4096$) up to the tree point (half the punnet). The measured points at 10 %, 25 %, 36 % and 52.5 % all lie in it.
- **Easy to confuse with** the [[dictionary-shelf]], the mechanism that serves this range; and with the old draft's "heavy" dictionaries of 256 cherries' worth. Here a dictionary is heavy when it is a sizeable share of its punnet.
:::

This is the site's own bet, with sizes filled in. [[#app-shelf-and-two-misses]] added a shelf of $\vnD$ dictionaries next to the hot cache; [[#app-toy-trace]] showed that the shelf pays only if misses crowd into a few stretches that stay busy. The old draft priced it with assumed weights of 32 and 256 cherries' worth. The curve replaces those with 410 to 2 150, and with the saving each one buys per miss. <!-- old-words -->

::: figure fig-app-corners rngCorners wide
**The two corners on the measured curve.** Horizontal axis: dictionary share, the dictionary's bytes over the punnet's raw bytes ($\vw/\vb$, 0 to 1). Vertical axis: delta share, the mean delta over a raw cherry ($\vrho$). The two coordinates add up to the [[mdl-ratio]], so diagonals are lines of constant ratio. Dots: the C1 points under a dictionary budget, (0.02, 0.733), (0.10, 0.610), (0.25, 0.443) and (0.36, 0.325), all from the values of layer 3, head 0 with compressor 30 on `cherry (256,)` at `stretch 4096` and no leash; the C2 tree point (0.525, 0.112), compressor 121 on `cherry (2, 256)` under a leash of 293; and the right end of the baseline, (1, 0), the whole punnet resident raw. Solid diagonal: the baseline $\vw/\vb + \vrho = 1$, no compression. Dashed: solo coding, at 0.778 over six layers and at 0.804 on the C1 screen. Shaded left: the tiny-dictionary corner. Shaded right: half the orchard resident. Between them, the interesting range. Smaller marks: the best compressor at each budget by the end of C1 (hollow), compressor 129, and compressor 43 with every cherry in the dictionary at (0.67, 0). Hover a dot for its campaign receipt. Two screens share one plot, so the shape is solid and the third decimal is not.
:::

::: try
1. Compare the drop from the 2 % point to the 10 % point with the drop from 36 % to 52.5 %. The first buys 0.12 of delta for 0.08 of dictionary; the second, across two screens, buys 0.21 for 0.17, and most of that is bookkeeping, since a tree's dictionary is made of cherries ([[#measured-what-the-half-means]]).
2. Follow the solo line to the baseline. Every dot below it has paid for its dictionary on the ledger. None of them has yet paid for loading it, which is the next two pages.
:::

::: pull
The interesting range is where a dictionary is worth loading and too heavy to leave loaded.
:::

Two facts must hold for the range to pay. The bytes are measured now; the curve says what each dictionary saves per miss. The traffic is not; whether misses crowd into few stretches for long enough to amortize a load is the heavy-stretch property, never replayed ([[#hypotheses-heavy-stretches]], [[#plan-hot-cache-replay]]). [[#app-on-fire]] designs the mechanism; [[#app-the-napkin]] prices it with measured bytes and assumed traffic.

::: theme which-vs-what
The curve is a "what" measurement. It says how alike the cherries of a punnet are, in bits. Whether the indexer keeps returning to the same stretch is a "which" question, and the interesting range stands or falls on it.
:::

::: takeaway
- The curve is convex: 2 % of dictionary buys 42 % of the gain, 10 % buys 77 %, a quarter buys 93 %.
- The interesting range is the dictionaries from about a tenth of the punnet to half of it: worth loading, too heavy to keep for every stretch, so kept in host memory and brought in for the stretches the indexer keeps wanting.
- Its bytes are measured; its traffic is not. The next two pages design and price it.
:::
