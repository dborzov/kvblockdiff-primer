---
title: How big is each piece?
nav: How big is each piece?
lede: A block of kv-blockdiff is one dictionary plus one delta per entry. Put it on the scales and one fact jumps out — the deltas are almost all of it, and the dictionary is a small tax.
group: The idea
cards:
  - q: How many bytes does one block of kv-blockdiff occupy in host memory?
    a: $\vw\,\ve + \vb\,\vrho\,\ve$ — one dictionary plus b deltas
    wrong: ["$\\vb\\,\\ve$ — the same as raw", "$\\vw\\,\\vb\\,\\ve$ — a dictionary per entry", "$\\vrho\\,\\vw\\,\\ve$ — the dictionary only"]
    why: The dictionary is stored once per block; each of the b entries adds its delta of ρe bytes.
    sec: weigh
  - q: With $\vb = 4096$, $\vrho = 0.75$ and a 256-centroid codebook ($\vw = 256$), what share of the stored block is dictionary?
    a: About 8 %
    wrong: ["About 50 %", "About 0.1 %", "About 25 %"]
    why: '$\vw/(\vw + \vb\vrho) = 256/(256 + 3072) \approx 7.7$ %. With a light dictionary ($\vw = 2$) it is under 0.1 %.'
    sec: weigh
  - q: All costs included, what is a kv-blockdiff entry worth, as a fraction of a raw entry?
    a: $\vrho + \vw/\vb$
    wrong: ["$\\vrho$ exactly", "$\\vrho \\times \\vw$", "$1 - \\vrho$"]
    why: 'Divide the block’s bytes $\vw\ve + \vb\vrho\ve$ by its $\vb$ entries and by $\ve$. The dictionary adds $\vw/\vb$, i.e. $8\vw/\vb$ bits per 8-bit element.'
    sec: tax
  - q: Why does the dictionary tax shrink as the block grows?
    a: The dictionary is paid once per block, so it is shared by more entries
    wrong: ["Bigger blocks need smaller dictionaries", "Deltas get larger and hide it", "The GPU caches big blocks for free"]
    why: That is amortization — a fixed cost divided by the number of items sharing it. The data, not the formula, limits how big a useful block can be.
    sec: tax
---

The first draft wrote the size relations of this idea as "$k \ll c \ll k \cdot b$ and $\delta \ll k$". Those letters mean other things on this site ($\vk$, for one, is the number of entries the indexer selects), so here they are again in our own letters:

- an [[entry]] is $\ve$ bytes;
- a [[dictionary]] is $\vw\,\ve$ bytes, with $1 \lesssim \vw \ll \vb$;
- a [[delta]] is $\vrho\,\ve$ bytes, with $\vrho < 1$.

Each line is a claim with a number in it. This page puts the three on one set of scales.

## One block on the scales {#weigh}

A [[block]] of $\vb$ entries is stored as one dictionary and $\vb$ deltas. Its bytes:

$$
\underbrace{\vw\,\ve}_{\text{one dictionary}} \;+\; \underbrace{\vb\,\vrho\,\ve}_{\vb \text{ deltas}} \qquad \text{instead of} \qquad \underbrace{\vb\,\ve}_{\vb \text{ raw entries}} .
$$ {#eq-idea-block-bytes}

::: aside reminder The three sizes
$\ve$: bytes of one entry (640 in the [[reference-setting]]). $\vw$: the dictionary's [[weight]] in entries' worth. $\vrho$: the [[delta-ratio]], delta bytes over entry bytes. All three are on [[#idea-dictionary-delta-block]].
:::

Plug in numbers. Take a block of $\vb = 4096$ tokens, entries of 640 bytes, an assumed $\vrho = 0.75$, and the three dictionary weights met on the previous page.

::: note numbers A worked example (ρ assumed)
| | light: $\vw = 2$ | medium: $\vw = 32$ | heavy: $\vw = 256$ |
|---|---|---|---|
| raw block, $\vb\,\ve$ | 2,621,440 B | 2,621,440 B | 2,621,440 B |
| deltas, $\vb\,\vrho\,\ve$ | 1,966,080 B | 1,966,080 B | 1,966,080 B |
| dictionary, $\vw\,\ve$ | 1,280 B | 20,480 B | 163,840 B |
| dictionary share of the block | 0.07 % | 1.0 % | 7.7 % |
| bytes per entry, all in | 480.3 B | 485.0 B | 520.0 B |
| as a fraction of raw, $\vrho + \vw/\vb$ | 0.7505 | 0.7578 | 0.8125 |
:::

Read the table by rows, not columns.

- The **deltas are almost everything**. Even the heavy dictionary is under a tenth of the block.
- The dictionary still **adds** something to every entry: $\vw/\vb$ of an entry's size, spread evenly over the block. At $\vw = 256$ that turns a 0.75 into a 0.81.

The same scales work on the toy history of [[#idea-mapping]], where every byte is computed rather than assumed. Its blocks are tiny, only $\vb = 32$ entries, so the tax shows.

::: dataset fig-idea-toy-blocks idea-entry-sizes view=blocks,delta metrics=dictb,delta,share,allin
**The toy history's blocks on the scales** ([[#fig-idea-toy-sizes]] again). *Block by block:* for each of the four blocks, the raw block (grey: 32 entries of 8 bytes) and the stored block, split into its dictionary (gold, 16 bytes) and its 32 deltas, bars to scale; the label gives the stored total and its share of raw. *With the block dictionary:* each entry coded alone (pale) and as a delta (solid), in bytes. *Numbers:* the dictionary, the average delta, the dictionary's share and the all-in cost per entry. Computed from the synthetic, seeded toy history.
:::

In the toy, the dictionary is 8 % of a stored block, and it lifts the all-in cost of an entry from $\vrho = 0.680$ to $\vrho + \vw/\vb = 0.680 + 2/32 = 0.742$ of raw. The same dictionary on a block of 4,096 entries would add 0.0005. Small blocks pay a real tax.

So the question "how big should the dictionary be?" becomes a trade. A heavier dictionary can predict better and push $\vrho$ down, but it charges a larger $\vw/\vb$. Part VI does that trade with information theory ([[#homework-amortization-rule]]).

::: takeaway
- A block costs $\vw\,\ve + \vb\,\vrho\,\ve$ bytes instead of $\vb\,\ve$.
- Because $\vw \ll \vb$, the deltas dominate; the dictionary is a small per-block tax.
- All in, an entry costs $\vrho + \vw/\vb$ of a raw one.
:::

## The dictionary is a small tax {#tax}

Divide the block's bytes by its $\vb$ entries, and the price of one entry, everything included, is $\ve\,(\vrho + \vw/\vb)$. In bits per 8-bit element that is $8\vrho + 8\vw/\vb$: the delta's bits plus the dictionary's share. The second term is the [[amortization]] rule from Part II, now with real names.

::: figure fig-idea-block-bytes blockBytes
**The bytes of one block.** Top bars: a raw block ($\vb$ entries of $\ve = 640$ bytes) and the same block in kv-blockdiff, split into its dictionary ($\vw\,\ve$, gold) and its deltas ($\vb\,\vrho\,\ve$, rose); bar lengths are to scale. Tiles: the two totals, the dictionary's share of the stored block, and the bytes per entry with everything included. Bottom plot: the dictionary's share (vertical axis, %) against the block size (horizontal axis, tokens, log scale) for the chosen $\vw$ and $\vrho$; the dot marks the current $\vb$. Sliders set $\vb$, $\vw$ and $\vrho$; the buttons pick the weights of three dictionary types from Part VI. $\vrho$ is an input here, not a measurement.
:::

::: try
1. Pick the 256-centroid dictionary and slide $\vb$ down to 256 tokens. The dictionary is now half the block — the tax has eaten the gain.
2. Pick the light dictionary ($\vw = 2$). At any block size above a few dozen tokens its share is invisible.
3. Set $\vrho = 1$ (no gain from coding). kv-blockdiff is now strictly bigger than raw, by exactly the dictionary.
:::

::: theme amortize
Here the fixed cost is the dictionary and the items sharing it are the block's entries: $\vw\,\ve$ bytes paid once, $\vw/\vb$ of an entry charged to each. Light dictionaries are cheap at any block size; heavy ones need big blocks.
:::

Two honest caveats. Host memory is plentiful, so storage is not where the shoe pinches. The tax matters elsewhere: a dictionary must also *cross the link* when it is loaded and *sit in GPU memory* while it is in use. Those costs depend on how often dictionaries move, which is the subject of [[#idea-heavy-blocks]]. And a block cannot grow forever: the bigger it is, the less alike its first and last entries may be. That limit comes from the data ([[#idea-fallen-apple]]).

::: takeaway
- Per entry, all in: $\vrho + \vw/\vb$ of a raw entry, or $8\vrho + 8\vw/\vb$ bits per element.
- The tax $8\vw/\vb$ is negligible for light dictionaries and real for heavy ones on small blocks.
- The heavier cost of a dictionary is moving it and keeping it on the GPU — counted later.
:::
