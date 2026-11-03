---
title: One cherry at a time
nav: One cherry at a time
group: The problem
lede: Strip the serving system away and one small problem is left, clean enough to study on its own. A sender holds a big tensor. A receiver asks for one small piece of it at a time, at random. How few bytes can cross between them?
cards:
  - q: In the compression scenario, what does the receiver ask for?
    a: One cherry at a time, at any position, in any order
    wrong: ["The whole orchard of a sequence, once", "One stretch at a time, in order", "The dictionary, then nothing else"]
    why: The scenario models the miss path of sparse decoding, where one scattered piece is wanted now. Everything about it follows from "one at a time, at random".
    sec: the-ask
  - q: Which of these is part of the compression scenario?
    a: A dictionary the receiver holds before it asks
    wrong: ["The hot cache and its LRU eviction", "The link's bandwidth in GB/s", "The indexer and its picks"]
    why: The scenario keeps only what decides how many bytes a cherry costs. Caches, links and indexers return in Part VI, when the scenario's numbers are mapped onto a serving system.
    sec: stripped
  - q: Why study the scenario apart from the application?
    a: Because it is a clean information-theory question whose answer the application needs, and which can be measured on data we already have
    wrong: ["Because the application is impossible to build", "Because compressors cannot run on a GPU", "Because the scenario is what HiSparse already does"]
    why: The scenario can be run today on a dump of Qwen3.5-2B's orchard, with no serving system. Its results then feed every application design.
    sec: stripped
---

Gull Rock's radio operator (Part I) sent one short message every half hour, and the mainland had to rebuild each one exactly. HiSparse's hot cache ([[#landscape-hisparse]]) asks host memory for one [[pick]] at a time, thousands of times per decode step, and the GPU must get every byte back. The same shape of problem, in two costumes.

This Part takes the costume off. What is left is the problem this whole project studies, and it fits on one card.

## The ask {#the-ask}

Two parties. A **sender** has a big tensor in its memory, one [[orchard]] of one [[sequence]]: `v.shape == (225_000, 6, 2, 256)` on [[bench|the Bench]]. A **receiver** needs small pieces of it, one at a time, at positions it does not know in advance, in an order nobody can predict. Each piece is a [[#scenario-cherry|cherry]]: the vectors of one token position, say one token's values at one layer, `v[token_pos_id, layer_id, :, :]`, 512 elements, 512 bytes.

The naive protocol is the one HiSparse uses today: the receiver asks for cherry `i`, the sender sends its 512 raw bytes. The scenario asks whether it can be done with fewer bytes per ask, under one strict rule: **the receiver must rebuild the cherry bit for bit**, every time, and it may hold something in advance.

::: define sender-receiver
- **What they are.** The sender holds the orchard and may prepare anything from it at leisure, offline, before the first ask. The receiver asks for one cherry at a time and must rebuild it exactly from what it receives for that cherry plus what it already holds.
- **What they stand for.** Host memory and the GPU, either side of the link. But the scenario does not name them: it only needs "one side that has everything and time" and "one side that asks for one piece now".
- **Easy to confuse with** an encoder and a decoder. The sender encodes once; the receiver decodes many times, each time for one cherry it cannot choose. That asymmetry is the whole problem.
:::

::: figure fig-scn-ask-answer scnAskAnswer
**One ask, one answer.** Left: the sender with one sequence's orchard, drawn as a box of `n_tokens × 6 × 2 × 256` elements; the highlighted cell is the cherry being asked for. Right: the receiver, holding a dictionary (the small book) it received before any ask. The arrow carries one delta. The readout counts the bytes of the raw cherry, the delta, and the running total over the asks so far. Click the box to ask for another cherry; the asks are random positions, as on the miss path. Illustrative sizes: a 512-byte cherry and an assumed delta of 0.11 of it, the campaigns' best delta share.
:::

::: takeaway
- A sender holds one sequence's orchard; a receiver asks for one cherry at a time, at random.
- The receiver must rebuild each cherry bit for bit from that cherry's own answer plus what it held in advance.
:::

## What was stripped away, and why {#stripped}

The serving system has a hot cache, an eviction policy, a link with a bandwidth, an indexer, a budget of milliseconds per step and gigabytes per GPU. None of that is in the scenario. Each was removed for a reason.

| removed | why it can wait |
|---|---|
| the hot cache and its hits | a hit costs no bytes; the scenario is about the asks that do cost bytes, the misses |
| the link's bandwidth and the step's deadline | they turn bytes into milliseconds; first count the bytes |
| the indexer and its picks | which cherries are asked for is the indexer's business; the scenario takes "random position" as the worst case and leaves the pattern of asks to Part VI |
| GPU memory | the dictionary's size is charged in bytes, which is enough to reason about residency later |

What remains is a question information theory can answer on data we already have: for one sequence's orchard, with a dictionary held in advance, **how many bytes per cherry must cross, if any cherry may be asked for next?**

::: define scenario
- **What it is.** One fully specified instance of the problem: which part of the orchard is in play (the [[#scenario-slice|slice]]), how it is cut into cherries (the [[#scenario-cherry|cherry shape]]), how long a [[#scenario-stretch|stretch]] is, how far a decode may reach into the dictionary (the [[#scenario-the-leash|leash]]), the number format, the LLM and the corpus. In Python, `Scenario(slice, cherry_shape, stretch_len, leash, fmt, llm, corpus)`.
- **Example.** `V at one KV layer, v[t, l, :, :] · stretch 4096 · leash 293 · fp8 · Qwen3.5-2B · agent transcripts` (512 elements per cherry, all six KV layers in play) is the scenario behind most numbers of Part VIII. `V of one token, v[t, :, :, :] · stretch 4096 · leash 293` (3072 elements) is one of the twelve scenarios in scope since 2026-11-03 ([[#scenario-why-vary]]).
- **Easy to confuse with** a compressor. A scenario is the problem; a compressor is one attempt at it. Many compressors are scored on one scenario; one compressor may be scored on many scenarios.
:::

The next pages build the scenario one object at a time: the stretch, the slice, the cherry and its shape, the punnet, the contract, the score, the leash. Each gets its Python name on the page that defines it, and the names are used unchanged for the rest of the site.

::: theme access-pattern
"One cherry at a time, at random" is the whole access pattern, and it decides everything downstream: no stream compressor, no decoding of neighbours first, a dictionary held in advance. Part I met the same pattern in Gull Rock's half-hourly messages.
:::

::: takeaway
- The scenario keeps only what decides bytes per cherry: a sender, a receiver, a dictionary held in advance, one ask at a time.
- A scenario is a fully specified instance of the problem; a compressor is one attempt at it.
:::
