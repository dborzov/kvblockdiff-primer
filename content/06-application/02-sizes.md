---
title: How big is each piece?
nav: How big is each piece?
group: The idea
lede: A punnet of kvblockdiff is one dictionary plus one delta per cherry. Put it on the scales with the measured points of Part VIII, and two very different pictures appear, a light dictionary that is almost nothing next to its deltas, and a heavy one that is most of the stored bytes.
cards:
  - q: How many bytes does one punnet of kvblockdiff occupy in host memory?
    a: '$\vw\,\ve + \vb\,\vrho\,\ve$: one dictionary plus $\vb$ deltas'
    wrong: ["$\\vb\\,\\ve$, the same as raw", "$\\vw\\,\\vb\\,\\ve$, a dictionary per cherry", "$\\vrho\\,\\vw\\,\\ve$, the dictionary only"]
    why: The dictionary is stored once per punnet; each of the b cherries adds its delta of ρe bytes on average.
    sec: weigh
  - q: 'With $\vb = 4096$ and the light compressor of Part VIII ($\vw \approx 86$, $\vrho = 0.665$), what share of the stored punnet is dictionary?'
    a: About 3 %
    wrong: ["About 50 %", "About 0.1 %", "About 25 %"]
    why: '$\vw/(\vw + \vb\vrho) = 86/(86 + 2724) \approx 3$ %. At the reference-tree point ($\vw \approx 2150$, $\vrho = 0.112$) it is about 82 %.'
    sec: weigh
  - q: All costs included, what is a cherry of kvblockdiff worth, as a fraction of a raw cherry?
    a: '$\vrho + \vw/\vb$'
    wrong: ["$\\vrho$ exactly", "$\\vrho \\times \\vw$", "$1 - \\vrho$"]
    why: 'Divide the punnet''s bytes $\vw\ve + \vb\vrho\ve$ by its $\vb$ cherries and by $\ve$. The dictionary adds $\vw/\vb$, the dictionary share of Part IV.'
    sec: tax
  - q: Why does the dictionary's share of a cherry shrink as the stretch grows?
    a: The dictionary is paid once per punnet, so it is shared by more cherries
    wrong: ["Longer stretches need smaller dictionaries", "Deltas get larger and hide it", "The GPU caches long stretches for free"]
    why: That is amortization, a fixed cost divided by the number of items sharing it. The data, not the formula, limits how long a useful stretch can be.
    sec: tax
---

The first draft of this project wrote its size relations as "$k \ll c \ll k \cdot b$ and $\delta \ll k$". Those letters mean other things on this site ($\vk$, for one, is the number of picks per layer per step), so here they are again in our letters, each a claim with a number in it:

- a [[cherry]] is $\ve$ bytes, 640 on [[pin|the Pin]], 512 on [[bench|the Bench]];
- a [[dictionary]] is $\vw\,\ve$ bytes, its [[weight]] $\vw$ counted in cherries' worth;
- a [[delta]] is $\vrho\,\ve$ bytes on average, with the [[delta-share|delta share]] $\vrho < 1$.

This page puts the three on one set of scales.

## One punnet on the scales {#weigh}

A [[punnet]] of $\vb$ cherries (one cherry per token position, the shape of every example in this Part) is stored as one dictionary and $\vb$ deltas:

$$
\underbrace{\vw\,\ve}_{\text{one dictionary}} \;+\; \underbrace{\vb\,\vrho\,\ve}_{\vb \text{ deltas}} \qquad \text{instead of} \qquad \underbrace{\vb\,\ve}_{\vb \text{ raw cherries}} .
$$ {#eq-app-punnet-bytes}

::: aside reminder The two shares
Part IV's score splits into a [[dictionary-share|dictionary share]] $\vxshare = \vw/\vb$ and a delta share $\vrho$, and their sum is the [[mdl-ratio|MDL ratio]] ([[#scenario-the-score]]). Everything on this page is that split, written in bytes.
:::

Plug in measured numbers. Take a stretch of $\vb = 4096$ positions and the two ends of the measured curve of Part VIII, both on the Bench's values at `stretch 4096`: the light compressor with no reference cherries (dictionary share 0.021, delta share 0.665, ratio 0.686) and the reference-tree compressor (0.525, 0.112, ratio 0.636). The weights follow: $\vw = 0.021 \times 4096 \approx 86$ and $\vw = 0.525 \times 4096 \approx 2150$ cherries' worth.

::: note numbers The same punnet at both settings
| | light, $\vw \approx 86$, $\vrho = 0.665$ | reference tree, $\vw \approx 2150$, $\vrho = 0.112$ |
|---|---|---|
| raw punnet, $\vb\,\ve$ (Pin / Bench) | 2 621 440 B / 2 097 152 B | the same |
| deltas, $\vb\,\vrho\,\ve$ | 1 743 258 B / 1 394 606 B | 293 601 B / 234 881 B |
| dictionary, $\vw\,\ve$ | 55 040 B / 44 032 B | 1 376 000 B / 1 100 800 B |
| dictionary's share of the stored punnet | 3 % | 82 % |
| bytes per cherry, all in | 439 B / 351 B | 408 B / 326 B |
| as a fraction of raw, $\vrho + \vw/\vb$ | 0.686 | 0.637 |
:::

Read the table by columns.

- With a **light dictionary the deltas are almost everything**. The dictionary is 3 % of the stored punnet; per cherry it adds 0.021 to a delta of 0.665.
- With the **reference tree the dictionary is most of the bytes**, because it is made of the punnet's own cherries filed as references ([[#toolbox-reference-cherries]]). The deltas are tiny, four in five of them empty. The ratio is still the sum, and it is lower.

So "the deltas dominate" is true for one end of the curve and false for the other, and the number that does not lie is the sum. What the two columns differ in is *where the bytes sit*, and that is exactly what the serving system cares about: a delta crosses the link at miss time, a dictionary must be on the GPU before it. The old draft's rule $\vw \ll \vb$ holds for the light column (86 against 4096) and fails for the tree (2150 against 4096). <!-- old-words -->

::: aside source Receipts
Light compressor 129: ledger trial r25-t0003, ratio 0.6863 = 0.021 + 0.665, `s-layer-b4k-r293` (values, cherry `v[t, l, :, :]`, stretch 4096, leash 293). Tree compressor 121: env-t0096, 0.63639 = 0.5247 + 0.1116, same screen; about 80 % of its deltas are empty, the rest 0.5–0.75 of a cherry. Bytes in the table: $\vw$ rounded to 86 and 2150; Pin $\ve = 640$, Bench $\ve = 512$; per-cherry bytes are the stored punnet over 4096.
:::

::: takeaway
- A punnet costs $\vw\,\ve + \vb\,\vrho\,\ve$ bytes instead of $\vb\,\ve$; per cherry, $\vrho + \vw/\vb$ of a raw cherry.
- Light dictionary: 3 % of the bytes, deltas of 0.665. Reference tree: 82 % of the bytes, deltas of 0.112. Same sum to within 0.05.
- Where the bytes sit decides what crosses the link and what must be resident. That is the rest of this Part.
:::

## The dictionary is a tax per cherry {#tax}

Divide the punnet's bytes by its $\vb$ cherries and the price of one cherry, everything included, is $\ve\,(\vrho + \vw/\vb)$. In bits per 8-bit element that is $8\vrho + 8\vw/\vb$: the delta's bits plus the dictionary's share, the [[amortization]] rule of [[#school-amortization]] and the bill of [[#toolbox-the-bill]], now with real names.

::: figure fig-app-punnet-bytes blockBytes
**The bytes of one punnet.** Top bars: a raw punnet ($\vb$ cherries of $\ve = 640$ bytes) and the same punnet in kvblockdiff, split into its dictionary ($\vw\,\ve$, gold) and its deltas ($\vb\,\vrho\,\ve$, rose); bar lengths are to scale. Tiles: the two totals, the dictionary's share of the stored punnet, and the bytes per cherry with everything included. Bottom plot: the dictionary's share (vertical axis, %) against the stretch length (horizontal axis, tokens, log scale) for the chosen $\vw$ and $\vrho$; the dot marks the current $\vb$. Sliders set $\vb$, $\vw$ and $\vrho$; the three buttons preset a dictionary weight. $\vrho$ is an input here; set it to 0.665 with $\vw = 86$ or to 0.112 with $\vw = 2150$ to reproduce the table above.
:::

::: try
1. Set $\vw = 2150$ and $\vrho = 0.112$, then slide $\vb$ down to 512. The dictionary is now four times the raw punnet: a reference tree is made of cherries, so its weight scales with the punnet and never amortizes.
2. Set $\vw = 86$ and $\vrho = 0.665$. At any stretch above a few hundred positions the dictionary's share is a few per cent.
3. Set $\vrho = 1$. kvblockdiff is now strictly bigger than raw, by exactly the dictionary.
:::

::: theme amortize
Here the fixed cost is the dictionary and the items sharing it are the punnet's cherries: $\vw\,\ve$ bytes paid once, $\vw/\vb$ of a cherry charged to each. Light dictionaries are cheap at any stretch length. A dictionary of reference cherries is a different animal: it is a share of the punnet, and the stretch length does not dilute it.
:::

Two honest caveats. Host memory is plentiful, so storage is not where the shoe pinches; the scenario does not even charge it ([[#scenario-the-contract]]). The tax matters elsewhere: a dictionary must *cross the link* when it is loaded and *sit in GPU memory* while it is in use, and both costs depend on how often dictionaries move ([[#app-the-napkin]]). And a stretch cannot grow forever: the campaigns' punnet floors fall from 4096 to 16 384 positions and flatten ([[#measured-shared-across-the-stretch]]).

::: takeaway
- Per cherry, all in: $\vrho + \vw/\vb$ of a raw cherry, or $8\vrho + 8\vw/\vb$ bits per element.
- The tax $8\vw/\vb$ is negligible for light dictionaries and is the main cost for a reference tree.
- The heavier costs of a dictionary are moving it and keeping it on the GPU, counted on the napkin.
:::
