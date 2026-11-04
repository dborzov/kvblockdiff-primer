---
title: The other half of the bill
nav: The bytes side
group: Bytes and the napkin
lede: The replay counts misses, δ-misses and loads. To turn counts into link bytes and GPU bytes, the napkin needs what each compressor puts in its dictionary and in its deltas. Part VIII measured that. Read through the shelf, one fact of Part VIII matters more than any ratio. The score spreads a dictionary over its punnet, but serving keeps it in GPU memory whether its stretch is fetched or not.
cards:
  - q: Which compressor has the lowest MDL ratio the campaigns verified at stretches of 4096, and how does it split?
    a: 'The reference tree with linear prediction, compressor 121: 0.636 = dictionary share 0.525 + delta share 0.112'
    wrong: ["Solo coding: 0.804 with no dictionary", "The light compressor 129: 0.686 = 0.021 + 0.665", "The all-dictionary corner: 0.671 = 0.671 + 0"]
    why: 'About half of its bytes are reference cherries kept in the dictionary; each delta is about a ninth of a cherry on average.'
    sec: ladder
  - q: How does the MDL ratio of the best compressors change with the stretch length?
    a: 'It falls as the stretch grows (0.689, 0.636, 0.618 at 512, 4096, 16 384), with the dictionary share staying near 0.4–0.5'
    wrong: ["It rises with the stretch length", "It is the same at every stretch length", "It falls because the dictionary share falls to zero"]
    why: 'A longer stretch spreads the dictionary over more cherries and holds more repeats to point at; the best split keeps about half of the bytes in the dictionary throughout.'
    sec: stretch-ratio
  - q: What are the floors 0.60 and 0.57, and what grade do they carry?
    a: '0.60 is a code-length estimate inside a punnet of 16 384 positions; 0.57 extrapolates it to a whole sequence. Neither is a compressor'
    wrong: ["Two verified compressors", "The ratios of solo coding with and without escapes", "Holdout measurements with confidence intervals"]
    why: 'The 0.60 comes from four punnets of two sequences; the 0.57 continues a trend of about −0.007 per doubling for 3.8 more doublings. The best verified ratio at 16 384 is 0.618.'
    sec: floors
  - q: In the MDL ratio a dictionary is spread over its punnet. What is it in serving?
    a: 'Resident GPU memory: w cherries'' worth for as long as it is on the shelf, whether or not its stretch is fetched'
    wrong: ["Link bytes, spread over the misses of its stretch", "Host memory, which is free", "Nothing; only deltas cost anything in serving"]
    why: 'A tree dictionary of a 4096-position stretch is 2150 slots'' worth per layer, 45 % of a resized hot cache; at 16 384 positions it is 8090, more than the whole cache.'
    sec: amortised-or-resident
  - q: Why is the stretch length that is best for the MDL ratio the worst for the shelf?
    a: 'A longer stretch lowers the ratio by spreading the dictionary thinner, but the dictionary on the GPU grows with the stretch'
    wrong: ["Because long stretches have more misses", "Because long stretches break the leash", "Because the shelf cannot hold long stretches"]
    why: 'At a dictionary share near one half, the memory a shelf of one dictionary holds is half the stretch, whatever share of it is ever fetched.'
    sec: amortised-or-resident
---

The napkin of [[#app-the-napkin]] multiplies counts by bytes. The pages before this one replaced its assumed counts with measured ones. Its bytes are the campaigns' ([[#measured-dispatch]]). This page re-reads Part VIII's results with one question in mind. For each compressor, how many bytes does it keep in a dictionary that must sit on the GPU, and how many bytes does each miss still carry?

::: aside reminder The score, in one line
The [[mdl-ratio|MDL ratio]] of one punnet is the [[dictionary-share|dictionary share]] (the dictionary's bytes over the punnet's raw bytes, $\vxshare = \vw/\vb$) plus the [[delta-share|delta share]] (every delta summed, over the same raw bytes, $\vrho$). Neither share is a score on its own; only the sum is ([[#scenario-the-score]]).
:::

## The ladder of the MDL ratio {#ladder}

The values of Qwen3.5-2B, in FP8, as the campaigns measured them. Every row is a dev-screen number, verified on its screen unless the grade says otherwise ([[#reference-numbers/campaigns]]).

| compressor | MDL ratio | dictionary share | delta share | grade |
|---|---|---|---|---|
| none (HiSparse) | 1 | 0 | 1 | — |
| [[solo]]: per-furrow codes, one table for all sequences | 0.804 / 0.778 | ≈ 0 | 0.80 / 0.78 | verified / code-length estimate |
| C1 under a dictionary budget of 0.02 | 0.753 | 0.020 | 0.733 | verified (one head of one KV layer) |
| light, no reference tree (compressor 129) | 0.686 | 0.021 | 0.665 | verified |
| C1 under a budget of 0.10 / 0.25 / no budget | 0.710 / 0.691 / 0.682 | 0.10 / 0.25 / 0.36 | 0.61 / 0.44 / 0.33 | verified |
| reference tree with linear prediction (compressor 121) | 0.636 | 0.525 | 0.112 | verified |
| everything in the dictionary (C1, before the leash) | 0.671 | 0.671 | 0 | verified |
| floor at stretches of 16 384 / of a whole sequence | 0.60 / 0.57 | — | — | code-length estimate / extrapolation |

Two numbers per row matter to the shelf. The delta share is what a δ-miss carries: 0.112 of a 640-byte pick is 72 bytes for the tree, 0.665 is 426 bytes for the light compressor. The dictionary share times the stretch length is what sits on the GPU: 0.525 × 4096 ≈ 2150 cherries' worth per layer for the tree, 0.021 × 4096 ≈ 86 for the light one. A solo code keeps one table for every sequence, so its per-sequence dictionary is empty; it is a [[shared-table|shared table]], side information in the scenario's terms ([[#scenario-scope]]).

::: figure fig-picks-ladder picksLadder wide
**The ladder of the MDL ratio, split into its two shares.** Horizontal axis: MDL ratio, 0 to 1. One bar per compressor, from HiSparse's raw bytes (1.0) through solo (verified and ideal), the C1 points under a dictionary budget, the light compressor and the tree (0.636) to everything in the dictionary (0.671); each bar is split into its dictionary share (the bytes kept on the GPU per punnet) and its delta share (the bytes sent per cherry), and labelled with its ratio and split. The floors 0.60 and 0.57 are dashed lines, not bars, because no compressor reaches them. Hover a bar for its grade, screen, ledger trial and compressor. The readout notes that the tree keeps 82 % of its bytes in the dictionary. Values of Qwen3.5-2B, FP8, stretches of 4096.
:::

::: takeaway
- The ladder runs from 1 (no compression) through solo 0.804 and the light 0.686 to the tree's 0.636; the floors are 0.60 and 0.57.
- What a δ-miss carries is the delta share (72 bytes for the tree, 426 for the light compressor); what sits on the GPU is the dictionary share times the stretch length.
:::

## The ratio against the stretch length {#stretch-ratio}

The campaigns ran the best compressors at several stretch lengths ([[#measured-reading-one-cherry/stretch-length]]):

| stretch length | C2 frontier, cherry `v[t, l, :, :]`, leash 293 | C1, cherry `v[t, 0, 0, :]`, no leash |
|---|---|---|
| 512 | 0.689 = 0.43 + 0.26 | 0.724 (dictionary share 0.40) |
| 4096 | 0.636 = 0.52 + 0.11 | 0.673 (0.41) |
| 16 384 | 0.618 = 0.49 + 0.12 | 0.642 (0.40) |
| 32 768 | — | 0.629 (0.39) |

Two facts sit in this table. The ratio falls with every doubling: a longer stretch spreads the dictionary over more cherries ([[#scenario-scope]], $8\vw/\vb$ bits per element) and holds more repeats to point at. And the best split does not move. At every stretch length the lowest ratio keeps 0.4 to 0.5 of the raw bytes in the dictionary, because a reference tree's dictionary is made of cherries ([[#measured-what-the-half-means]]). The two lines come from different screens, so the table is read along each column, never across.

::: figure fig-picks-stretch-ratio picksStretchRatio
**The MDL ratio against the stretch length, with its split.** Two panels: C2's frontier (cherry `v[t, l, :, :]`, six KV layers, leash 293) and C1's ladder (one head of KV layer 0, the LLM's layer 3, no leash). Horizontal axis: stretch length, 512 to 32 768 positions (log scale). Vertical axis: the share of the punnet's raw bytes. Each stacked bar is one measured stretch length: the lower part is the dictionary share, the upper part the delta share, and the line through the tops is the MDL ratio. The dictionary share stays near 0.4–0.5 while the total falls. Dashed lines: the floors 0.60 and 0.57. Grade: verified on dev screens; floors as marked.
:::

::: takeaway
- The ratio falls with the stretch length: 0.689, 0.636, 0.618 at 512, 4096, 16 384 (C2), 0.724 to 0.629 from 512 to 32 768 (C1).
- The dictionary share of the best point stays at 0.4–0.5 throughout.
:::

## The floors, and what they are {#floors}

Below the verified ratios the campaigns left two estimates ([[#measured-where-the-bits-come-from/the-wall]]):

1. **0.60 at stretches of 16 384** is a code-length estimate: the best linear use of repeats and geometry inside a punnet, its rule counted as free, on four punnets of two sequences. The best verified compressor at that length, 0.618, is already close to it.
2. **0.57 for a whole sequence** is an extrapolation of the same estimate, about −0.007 per doubling of the stretch, carried 3.8 doublings from 16 384 to 225K positions.

Neither is a compressor, and both need a dictionary per punnet or per sequence to approach. They bound what the bytes side can give: [[#picks-ceiling]] turns them into a ceiling on sequences per GPU.

::: theme noise-floor
The floors are what no predictor inside a punnet explains. Whatever the dictionary holds, each miss still carries at least that much of its cherry.
:::

::: takeaway
- 0.60 (stretches of 16 384) is a code-length estimate; 0.57 (a whole sequence) is an extrapolation; no compressor reaches either.
:::

## Spread over the punnet in the score, resident in serving {#amortised-or-resident}

In the scenario, a dictionary is a cost spread over the cherries that share it. A dictionary of weight $\vw$ adds $8\vw/\vb$ bits to each element of its punnet, and the longer the stretch, the thinner the spread ([[#school-amortization]]). That is why the ratio improves with the stretch length.

In serving, the same dictionary is GPU memory. On the [[dictionary-shelf|shelf]] it holds $\vw\,\ve$ bytes per layer, the memory of $\vw$ hot-cache slots, for as long as its stretch is [[on-fire|on fire]]. The memory is held whether the stretch's cherries are fetched or not, and only the few misses that land in that stretch use it.

:::: compare A dictionary in the score and on the GPU
::: col In the MDL ratio
- The dictionary is charged once per punnet, as the dictionary share $\vw/\vb$.
- A longer stretch spreads it over more cherries: the ratio improves.
- Tree at $\vb$ = 4096: 0.525 of the punnet's raw bytes, part of 0.636.
:::
::: col On the GPU
- The dictionary is held as $\vw$ slots' worth of memory per layer while it is on the shelf.
- A longer stretch makes it bigger: 0.525 × $\vb$ slots.
- Tree at $\vb$ = 4096: 2150 slots per layer, 45 % of a hot cache of 4740; at 16 384: 8090 slots, more than the whole cache.
:::
::::

A worked example at the Pin. Keep every stretch's dictionary on the GPU at once, so that no load is ever needed. The memory is the dictionary share times the context, per layer: 0.02 × 100 000 ≈ 2000 slots' worth for light dictionaries, and 0.5 × 100 000 ≈ 50 000 for tree dictionaries, ten hot caches. At their best hot-cache sizes the first serves 115–116 sequences per GPU and the second 11. These are the two corners of [[#app-two-boring-corners]], now with every input measured.

So the stretch length that is best for the MDL ratio is the worst for the shelf. Each doubling of $\vb$ lowers the ratio by about 0.01–0.02 and doubles the memory each dictionary holds. [[#picks-slot-price/stretch-length]] runs the napkin over stretch length: the tree shelf falls from 88–97 sequences per GPU at 4096 to 55–59 at 16 384.

::: theme amortize
Pay once, use many times holds for link bytes: a dictionary crosses the link once per load, and every δ-miss after that uses it. GPU memory works differently. It is held for as long as the dictionary is on the shelf, and the misses that use it are a handful per step.
:::

::: pull
The tree's dictionary for a stretch of 4096 positions is 0.525 of the punnet in the score, and 2150 slots of resident GPU memory per layer in serving.
:::

::: takeaway
- A dictionary on the shelf holds $\vw$ slots' worth of GPU memory per layer: 2150 for the tree at 4096 positions, 86 for the light compressor.
- All stretches resident at the Pin: about 2000 slots per layer for light dictionaries (115–116 sequences per GPU), about 50 000 for tree dictionaries (11).
- Longer stretches lower the ratio and enlarge every resident dictionary; for the shelf they are worse.
:::

::: aside source Receipts
bachelor-kv at commit 8f5a471: `docs/results.md` §4b (the ladder, the split by stretch length, the resident corners 115–116 and 11); `results/inputs/compression_points.json` (written by `analysis/compression_points.py` from this site's receipted figure data). Ledger trials: solo r1-t0005 (compressor 9, 0.80385) and the C2 landmark 0.77811; budget curve r1-t0030 / r1-t0036 / r1-t0031 / r1-t0037 (compressor 30, 0.75321 / 0.70954 / 0.69062 / 0.68145); light r25-t0003 (compressor 129, 0.68629 = 0.0212 + 0.665); tree env-t0096 (compressor 121, 0.63639 = 0.5247 + 0.1116); the all-dictionary corner r1-t0068 (compressor 43, 0.67048); C2 frontier env-t0010 / env-t0096 / env-t0097 (compressors 113 / 121 / 120); C1 r1-t0045 / r1-t0042 / r4-t0008 (compressors 37 / 34 / 50). Floors: [[#measured-where-the-bits-come-from]]. All are dev-screen numbers of Qwen3.5-2B's values, FP8; keys unmeasured; C1 and C2 are different screens and are never subtracted. The resident corners: `results/summary/napkin_grid.json` (`resident`: 114.6 for C1's 0.02 point, 116.4 for compressor 129, 11.0 for the tree).
:::
