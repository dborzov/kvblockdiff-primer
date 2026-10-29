---
title: Lucky Louis, block by block
nav: Lucky Louis, block by block
lede: A dictionary cache with a handful of shelves works only if misses keep landing in the same few blocks, step after step. That is a second, stronger form of the Lucky Louis property — and, unlike the first, nobody has measured it.
group: What the idea bets on
cards:
  - q: What is a heavy block?
    a: A block that holds many of the current step's selections
    wrong: ["A block whose dictionary is large", "A block with many tokens", "A block whose entries have large values"]
    why: Heavy is about traffic, not size. If selections pile into a few heavy blocks for many steps, their dictionaries are cheap to keep on the GPU.
    sec: where
  - q: How does the block form of the Lucky Louis property differ from the ordinary one?
    a: The ordinary one says the same entries are re-selected; the block form says selections also crowd into a few blocks that stay busy for many steps
    wrong: ["They are the same statement", "The block form is about the bytes inside entries", "The block form is about the layer axis"]
    why: Selections can repeat while being scattered over the whole history. Then each miss tends to land in a different block, and a few resident dictionaries help little.
    sec: where
  - q: One dictionary load costs about as much link traffic as how many raw misses?
    a: w — its weight in entries' worth
    wrong: ["One", "b — the block size", "k — the number of selections"]
    why: 'A load moves $\vw\,\ve$ bytes, a raw miss $\ve$. Against about 274 misses per layer per step, loads × w must stay well below 274.'
    sec: residency
  - q: When does the heavy-block question stop mattering?
    a: When dictionaries are light enough to keep every block's dictionary resident
    wrong: ["When the hot cache is larger than 8192 slots", "When the indexer selects fewer entries", "Never — it always decides the outcome"]
    why: 'A 100K-token request in blocks of 4096 has 25 blocks per layer; at $\vw = 2$ all their dictionaries take 50 entries’ worth, about 1 % of a 4096-slot hot cache.'
    sec: residency
---

[[#idea-toy-trace]] ended with a debt. A dictionary load costs $\vw\,\ve$ bytes on the link, and it is paid back only after $\vw/(1-\vrho)$ δ-misses in its block. The three-step toy never got there. Whether a real trace gets there depends on one thing: do the misses keep coming back to the same blocks?

## Where do the misses land? {#where}

The [[lucky-louis]] says that from one step to the next the [[indexer]] re-selects mostly the same positions. That is why the [[hot-cache]] hits. But the positions could be scattered all over a 100K-token history: a few in every [[block]]. Then each miss tends to fall in a different block, and a shelf of $\vnD$ dictionaries catches few of them.

The [[dictionary-cache]] needs more: selections should crowd into **few blocks at a time**, and those blocks should **stay busy for many steps**.

::: define heavy-block
- **What it is:** a block that holds many of the current step's selections. Its opposite is a light block.
- **The property the design needs:** the Lucky Louis property *at block granularity* — selections concentrate in a few heavy blocks, and those blocks stay heavy for many steps.
- **Easy to confuse with:** a block with a heavy dictionary (that is the dictionary's weight $\vw$), or fallen-apple similarity (that is about the bytes; this is about the traffic). Both kinds of locality must hold for the full design, and they are measured separately.
:::

How much does concentration matter? A toy indexer makes it visible.

::: figure fig-idea-heavy heavyBlocks wide
**A toy indexer, with and without heavy blocks.** One layer of a toy request: 4,096 positions in 32 blocks of 128 (alternate blocks shaded), $\vk = 64$ selections per step, a hot cache of $\vB = 128$ slots managed as in HiSparse, and a dictionary cache of $\vnD$ shelves with the toy residency rule of [[#idea-blockdiff-step-by-step]]. At each step the toy indexer keeps 85 % of its previous picks (the Lucky Louis part). Its new picks come, with probability *concentration*, from three "topic" blocks, and otherwise from anywhere; each topic block is replaced by a random one after a *topic lifetime* on average. Top: 120 steps after a warm-up of 50, one mark per selection — grey a hit, green a δ-miss, brown a raw miss. Tiles: the δ-miss fraction $\vfD$, dictionary loads per step, the share of misses in the four busiest blocks, and the miss rate. Bottom: the share of all misses that landed in each block. Every number comes from this seeded toy, run live; it is a toy, not a trace.
:::

::: try
1. Set concentration to 0. The hot cache still hits about 85 % of selections — Lucky Louis is intact — yet only 13 % of misses are δ-misses, and the shelf changes most steps (0.66 loads per step).
2. Back to 80 % (the default): 77 % of misses are δ-misses, with 0.14 dictionary loads per step — one load every seven steps.
3. Keep 80 % and shorten the topic lifetime to 3 steps. Heavy blocks that do not *stay* heavy are almost as bad as none: $\vfD$ falls to 29 % and loads triple.
4. Set $\vnD = 1$, then 8: $\vfD$ goes from 25 % to 81 %. More shelves catch more misses, at the price of GPU memory.
:::

Notice what the hit rate does while you move the concentration slider: almost nothing. The per-entry property and the per-block property are different statistics, and only the second decides $\vfD$.

The card below freezes two runs of the same toy, every step recorded: the default world with heavy blocks (concentration 80 %), and a world without them (concentration 0). Both keep 85 % of their picks from step to step.

::: dataset fig-idea-heavy-worlds idea-heavy view=shares,raster,blocks metrics=hit,fD,loads,top4,misses
**Two worlds, one Lucky Louis.** *Two shares, step by step:* top, the hit rate; bottom, the δ-miss fraction $\vfD$; each a rolling share over 10 steps, for the world with heavy blocks (solid) and without (dashed). *Where the selections land:* every selection of the 270 recorded steps, one panel per world, coloured as in the plate above. *Misses per block:* the share of all misses that landed in each of the 32 blocks, both worlds. Drag across a plot to select steps; the highlight marks steps with a dictionary load. *Table:* one row per step and world. Synthetic, seeded; the same simulator as the plate above.
:::

The top panel is the whole lesson. Two hit-rate lines, 87 % and 85 %, almost on top of each other; two $\vfD$ lines, 77 % and 13 %, far apart. A trace that shows a fine hit rate has told you nothing yet about $\vfD$.

::: takeaway
- A heavy block holds many of the current step's selections.
- The design needs Lucky Louis *per block*: selections crowding into a few blocks that stay busy for many steps.
- The ordinary hit rate does not reveal it; it must be measured on its own.
:::

## Why residency needs it {#residency}

Count the cost of a dictionary load in misses. A load moves $\vw\,\ve$ bytes; a raw miss moves $\ve$. So one load costs as much link traffic as $\vw$ raw misses. Against the reference setting's ~274 misses per layer per step ([[#landscape-derived-numbers]]):

$$
\underbrace{\text{loads per step per layer}}_{\text{how often the shelf changes}} \times \underbrace{\vw}_{\text{entries' worth each}} \;\ll\; \underbrace{274}_{\text{misses per layer per step}} .
$$ {#eq-idea-load-budget}

- A heavy dictionary, $\vw = 256$: well under one load every ten steps per layer. Each dictionary must stay useful for many tens of steps.
- A medium dictionary, $\vw = 32$: under about one load per step per layer.
- A light dictionary, $\vw = 2$: no loads at all — keep every block's dictionary resident. A 100K-token request in blocks of 4,096 has 25 blocks per layer; their dictionaries take 50 entries' worth, about 1 % of a 4,096-slot hot cache.

So heavy blocks matter exactly as much as dictionaries are heavy. If the data rewards light dictionaries, the question disappears ([[#missed-light-dictionaries-first]]). If it rewards heavy ones, everything hangs on it.

:::: compare Two forms of the Lucky Louis property
::: col Per entry (established)
- The same *positions* are re-selected from step to step.
- Measured by HiSparse: 87 % hits at $\vB = 4096$.
- Decides the **hit rate**.
:::
::: col Per block (unmeasured)
- Selections crowd into the same few *blocks* for many steps.
- Measurable from the same traces HiSparse replays.
- Decides **$\vfD$ and the dictionary loads**.
:::
::::

Whether real traces have heavy blocks is a statistic of the very traces HiSparse already replays: where misses land, block by block, and how long a block stays busy ([[#questions-q3]], [[#questions-framework-c]]). It is a different question from fallen-apple similarity. The full design needs both answers to be yes — or light dictionaries.

::: takeaway
- One load costs $\vw$ raw misses; keep loads × $\vw$ far below ~274 per layer per step.
- Heavy dictionaries need heavy, long-lived blocks; light dictionaries can simply stay resident.
- Block concentration is measurable from existing traces — and has not been measured.
:::
