---
title: Everything must be kept
nav: Everything must be kept
group: Sparse attention
lede: A long sequence's orchard does not fit where the GPU can read it fast, and fetching every pick of every step from the big, slow memory saturates the wire after a handful of sequences. Two walls, both easy to compute.
cards:
  - q: How big is the orchard of one 128K-token sequence of GLM-5.1, in BF16?
    a: About 13 GB
    wrong: ["About 13 MB", "About 130 GB", "About 1.3 GB"]
    why: '131 072 tokens × about 100 KB per token (78 KV layers × 1.28 KB) ≈ 13.1 GB. At 8 bits, half of that.'
    sec: size
  - q: In the harbour office of Part II, what plays the role of the GPU's HBM?
    a: The forecaster's desk, small, fast, close at hand
    wrong: ["The archive downstairs", "The lift", "The radio link to Gull Rock"]
    why: The archive is host DRAM (big, slow to reach) and the lift is the link between them.
    sec: size
  - q: 'Keeping the orchard in host memory and fetching every pick at every step: how many bytes per step for one GLM-5.1 sequence (BF16)?'
    a: About 204 MB
    wrong: ["About 205 KB", "About 2 MB", "About 20 GB"]
    why: '$\vk \times \vNL \times \ve = 2048 \times 78 \times 1.28$ KB ≈ 204 MB per step.'
    sec: naive
  - q: At 30 ms per step, what link bandwidth does that plan need per sequence, and how many sequences fill a 50 GB/s link?
    a: About 6.8 GB/s per sequence, so about 7 sequences
    wrong: ["About 0.7 GB/s, so about 70 sequences", "About 68 GB/s, so less than one", "About 6.8 GB/s, so about 700 sequences"]
    why: 204 MB ÷ 0.030 s ≈ 6.8 GB/s; 50 ÷ 6.8 ≈ 7 (about 9 at the nominal 64 GB/s). HiSparse's paper says "a dozen".
    sec: naive
---

Here is a number to sit with: **13 GB**. That is the [[orchard]] of a single 128K-token sequence of GLM-5.1, in the 16-bit format it is served in today. One sequence; one long conversation or document.

## How big the orchard gets {#size}

The arithmetic is short. Every token leaves one row at each of the $\vNL$ KV layers, and each row has $\ve$ bytes:

$$
\text{orchard bytes} = \underbrace{\vL}_{\text{tokens}} \times \underbrace{\vNL}_{\text{KV layers}} \times \underbrace{\ve}_{\text{bytes per row}}
$$ {#eq-landscape-orchard-bytes}

For GLM-5.1, $\vNL \times \ve$ is about 100 KB per token in BF16 (78 layers of 1.28 KB), or 50 KB at 8 bits per element. In Python, `k.nbytes + v.nbytes` for the GQA case, or the latent's `nbytes` for MLA.

| context $\vL$ | orchard in BF16 | orchard at 8 bits | sequences in 30 GB (BF16) |
|---|---|---|---|
| 8K tokens | 0.8 GB | 0.4 GB | 36 |
| 32K | 3.3 GB | 1.6 GB | 9 |
| 100K | 10 GB | 5 GB | 3 |
| 128K | 13.1 GB | 6.6 GB | 2 |
| 1M | 100 GB | 50 GB | 0 |

The last column is the wall. In the deployment HiSparse describes (eight H200 GPUs serving GLM-5.1), about 240 GB of GPU memory is left over after the LLM's weights: **about 30 GB per GPU** for orchards. At 128K tokens that holds two sequences per GPU. The GPU's arithmetic could serve far more at once; its memory cannot hold them. (HiSparse reports that keeping everything on the GPUs tops out at about 60 sequences on the whole server already at 32K tokens; their measurement.)

The obvious move is to keep the orchard somewhere bigger. The machine has such a place, and you have met it before.

::: aside reminder Wires and memories (II.23)
[[hbm|HBM]] is the GPU's own memory: very fast, small (tens of GB) and expensive. [[dram|Host DRAM]] is the CPU's main memory: much bigger, and far from the GPU. Between them runs a [[pcie|PCIe]] wire, about 64 GB/s each way on paper and about 50 in practice, roughly a hundred times less [[bandwidth]] than HBM.
:::

That wire is [[=link|the link]]: the PCIe connection between the host memory that holds the orchards and the GPU. Its practical bandwidth is $\vWlink$, [[@Wlink]] in both settings. Every byte of the orchard the GPU ever reads from host memory crosses it.

| harbour office (Part II) | the real machine | what it is like |
|---|---|---|
| the forecaster's desk | HBM on the GPU | small, fast; attention can only read what is here |
| the archive downstairs | host DRAM | big enough for every orchard; slow to reach |
| the slow lift | the link | everything brought up must ride it |
| a logbook | one row of the orchard, one pick | the unit that is fetched and kept |

::: takeaway
- A sequence's orchard is $\vL \times \vNL \times \ve$ bytes: about 13 GB for 128K GLM-5.1 tokens in BF16, 6.6 GB at 8 bits.
- About 30 GB of GPU memory per GPU is left for orchards, so long sequences run out of room after two or three.
- Host DRAM is big enough. It sits at the other end of the link: desk, archive, lift.
:::

## Fetch every pick, every step? {#naive}

So keep each sequence's whole orchard in host DRAM, and at every step bring up over the link the picks the [[indexer]] named, $\vk$ per layer. Attention reads only those anyway. How much rides the lift?

$$
\begin{aligned}
\text{per step} &= \underbrace{\vk}_{2048} \times \underbrace{\vNL}_{78} \times \underbrace{\ve}_{1.28\ \text{KB}} \approx 204\ \text{MB} \\[4pt]
\text{per second} &= \frac{204\ \text{MB}}{\underbrace{\vtpot}_{30\ \text{ms}}} \approx 6.8\ \text{GB/s}
\end{aligned}
$$ {#eq-landscape-naive}

The link carries about 50 GB/s in practice (64 on paper). It is full at **about seven sequences** (nine on paper). HiSparse's paper puts it at "a dozen"; we could not reproduce that number from the figures it gives, but whether the limit is seven or twelve, it is a small fraction of what the GPU could compute.

Try it with other settings.

::: figure fig-landscape-wall memoryWall
**Two walls, computed.** Top bar: GPU memory needed if every sequence kept its whole orchard on the GPU ($\vL \times \vNL \times \ve$ per sequence), against the 30 GB available per GPU (the line). Bottom bar: link traffic if every step fetched every pick from host memory ($\vk \times \vNL \times \ve \div \vtpot$ per sequence), against the 50 GB/s practical bandwidth of the link (the line; 64 GB/s nominal). A bar turns red when it crosses its line. Sliders set the context length, the number of sequences per GPU, and $\vk$; the switch sets the number format. Fixed: 78 KV layers, 640 elements per row, 30 ms per step (the Pin's numbers, [[#landscape-reference-settings]]). The figure's labels still say "requests" for sequences and "KV" for the orchard. <!-- old-words -->
:::

::: try
1. Set 128K tokens and 10 sequences. Both walls are crossed: the memory by a factor of four, the link by a little.
2. Switch to 8 bits. Everything halves. Useful, and no escape.
3. Move the context slider to 8K. The memory wall vanishes; the link wall does not move at all. The link traffic depends on $\vk$, not on the context length.
:::

Neither plan works. The desk cannot hold every orchard, and the lift cannot bring up every pick at every step. The way out has to use the one thing left: most of what a step needs, the step before needed too. The next page shows the system that bets on that.

::: takeaway
- Fetching all $\vk$ picks of every layer at every step moves about 204 MB per step, 6.8 GB/s per sequence in BF16.
- A 50 GB/s link is then full at about seven sequences (HiSparse says about a dozen).
- The link traffic grows with $\vk$ and the number of sequences, not with the context length.
:::
