---
title: Beyond the harness
nav: Beyond the harness
group: Next experiments
lede: Four experiments that do not fit the compress/decompress contract or the replay loop as they stand, a real indexer, synthetic controls, a victim-tier replay, a GLM-style shared selection, each priced honestly, including the ones that need hardware we do not have.
cards:
  - q: Why is a dump from DeepSeek-V3.2-Exp's own indexer not simply the next step?
    a: It has hundreds of billions of parameters and needs a multi-GPU node; only a rented node for a few hours could produce its pick trace on our transcripts
    wrong: ["Because its indexer is not open", "Because it has no orchard", "Because its picks cannot be replayed"]
    why: The weights are open and the indexer is exactly the real thing; what is missing is the machine. The trace itself would be small, about a gigabyte per sequence.
    sec: real-indexer
  - q: What is the cheapest way to get a trained indexer's picks on the Bench?
    a: Train a small DSA-style indexer on Qwen3.5-2B's own attention, the way DSA trains its indexer, then record its picks
    wrong: ["Download GLM-5.1's indexer and attach it to Qwen3.5-2B", "Use the exact top-k and call it trained", "Train a new LLM from scratch"]
    why: DSA's indexer is trained to match attention's distribution. Doing that on the Bench's attention costs hours on one GPU and yields a selector that ranks like a real one, with its errors.
    sec: real-indexer
  - q: What does the shared-selection simulation change about the trace?
    a: One pick set serves a group of KV layers, built from the summed scores of the group, as GLM-5.1 selects once for a group of layers
    wrong: ["Every layer gets the same k random picks", "Picks are shared across sequences", "The stretch length is doubled"]
    why: The grouped trace is derived from the per-layer one and replayed the same way; its hit rate against the per-layer trace and its f_D are the readings.
    sec: shared
  - q: What must a synthetic trace with planted concentration show under the replay?
    a: The planted δ-miss fraction and loads per step, and their collapse to the even-spread values once the trace is shuffled
    wrong: ["A miss rate of exactly zero", "The same f_D before and after the shuffle", "HiSparse's 13.4 %"]
    why: A control has a known answer; recovering it, and losing it under the shuffle, is what makes the real replay's numbers believable.
    sec: synthetic
  - q: Where does the victim tier's value come from without a second replay?
    a: 'From the reuse-distance curve of the trace: the share of misses whose reuse distance lies between B and B + B_V'
    wrong: ["From the MDL ratio", "From the dictionary share", "From the leash"]
    why: A victim tier catches re-picks that fell just out of the hot cache; the reuse-distance curve counts exactly those.
    sec: victim
---

The harness scores compressors; the replay counts misses. Four questions fall outside both, and two of them need hardware the Bench does not have. They are here so that nobody mistakes the exact top-k for the last word on the indexer.

## A sparse-attention LLM with a real indexer {#real-indexer}

The stand-in indexer of [[#plan-queries-and-picks]] reproduces the ranking a trained [[indexer]] copies. A real one ranks a little differently, keeps a sliding window, and in GLM-5.1 selects once for a group of layers. Three honest options, from the real thing down.

| option | what it gives | what it costs | odds |
|---|---|---|---|
| **DeepSeek-V3.2-Exp**, open weights, the [[dsa|DSA]] indexer itself, [[mla|MLA]] latents | a pick trace from a trained indexer on our own transcripts; and an MLA orchard, the Pin's shape, to compress | hundreds of billions of parameters: a rented multi-GPU node for a few hours; the trace is small (≈ 1 GB per sequence), the orchard is not | the trace is the prize; worth a rented day once the replay runs on the stand-in |
| **GLM-5.1**, the Pin itself | HiSparse's own LLM, so the replay's miss rates can be compared with the paper's directly | 8 × H200 as HiSparse serves it; the same rented node | the comparison that would settle the stand-in's calibration |
| **a small DSA-style indexer trained on Qwen3.5-2B** | a selector that ranks like a real one, with a real one's errors, on the Bench | hours on the RTX 5080: train a small scorer to match attention's distribution, as DSA does ([[#papers-sparse-selectors]]), then record its picks | the cheapest trained selector; its faithfulness to a production indexer is unknown |

The order is the reverse of the table: the small trained indexer first (an evening, no new hardware), then the rented node, and only if the replay on the stand-in has produced a decision rule worth calibrating.

::: note warning What a rented trace would not give
A trace from DeepSeek-V3.2-Exp says where *its* picks land on *our* transcripts. Its orchard is one MLA latent per token per layer; compressing that is a new scenario with no head axis and no K/V split, so none of Part VIII's stereo and K+V readings apply to it unchanged ([[#plan-risks]]).
:::

::: takeaway
- The real thing exists in the open and needs a rented node; the trace it would yield is small.
- A small indexer trained on the Bench's own attention is the cheap middle road.
:::

## Synthetic controls {#synthetic}

Two generators with a planted answer, run before any real trace is believed ([[#scenario-the-harness]], [[#toolbox-rehearsal]]).

- **For the harness:** punnets with planted structure, a per-furrow location, a few repeats of earlier cherries at known distances, a known linear dependence between heads, and a known noise floor; the frontier compressor must find each planted part and no more, and the shuffle must remove exactly the repeats.
- **For the replay:** a synthetic trace with a known concentration into stretches and a known per-pick reuse, the generator behind [[#fig-plan-stand-in-raster]]; the replay's $\vfD$ and $\vnload$ must match the planted values, and the shuffled trace must flatten them.

Both exist as toys in this site's figures; promoting them to tests in the harness is a day's work and precedes every reading of [[#plan-hot-cache-replay]].

::: takeaway
- Planted structure for the harness, planted concentration for the replay; the shuffle must remove exactly what was planted.
:::

## A victim-tier replay {#victim}

The [[victim-tier]] of [[#app-victim-tier]] keeps the deltas of picks just evicted from the hot cache, so a re-pick is rebuilt on the GPU instead of fetched. Its value is the share of misses whose [[reuse-distance|reuse distance]] falls between $\vB$ and $\vB + \vBV$, which the full reuse-distance curve of the trace gives directly (reading 6 of [[#plan-hot-cache-replay/readings]]). One more pass over the trace with a second LRU of $\vBV$ slots confirms it. Its cost is one afternoon once the trace exists; its decision is how much of lever 2 a victim tier delivers without decoding on the miss path.

::: takeaway
- The reuse-distance curve prices the victim tier; a second LRU confirms it; one afternoon.
:::

## GLM-style shared selection {#shared}

GLM-5.1 selects once for a group of layers ([[#landscape-sparse-attention]], [[#app-which-application]]). From the per-layer trace, a grouped trace is derived two ways: the union of the group's pick sets, or the top-$\vk$ of the group's summed scores. Replay both and read: the hit rate each layer loses against its own trace (what the LLM pays for sharing), and $\vfD$ with one dictionary per group instead of per layer (what the shelf gains). Together with H3 of [[#plan-next-in-the-harness]], which measures what a group dictionary costs in bits, this is the whole case for or against the GLM-5.1 shape of kvblockdiff.

::: takeaway
- Derive a grouped trace, replay it, read the lost hits and the gained δ-misses.
- With H3, it decides between one dictionary per layer and one per group.
:::
