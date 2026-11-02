---
title: What the scenario is not
nav: What it is not
group: The catalogue
lede: A short page of fences. Four things the scenario is often mistaken for, and the one sentence that connects it to the serving system of Part VI.
cards:
  - q: Why is "compress the whole sequence's orchard with zstd" not a scenario?
    a: Because one ask must return one cherry decoded cold; a stream compressor must decode everything before it
    wrong: ["Because zstd is lossy", "Because the orchard is too large for zstd", "Because zstd has no dictionary"]
    why: The scenario's access pattern is one cherry at a time, at random. Bulk compression answers a different question (bulk transfer between machines) and is read about in Part IX.
    sec: fences
  - q: Does the scenario account for GPU memory?
    a: No; it charges a dictionary's bytes and measures reads, and leaves residency to the application
    wrong: ["Yes, through the leash", "Yes, through the stretch length", "Yes, through the dictionary share"]
    why: The leash keeps the search out of the trivial corner; it is not a memory budget. Whether a dictionary fits on a shelf is Part VI's question.
    sec: fences
  - q: How does a pick relate to cherries?
    a: One pick asks for one or more cherries, depending on the scenario's cherry shape
    wrong: ["A pick is a cherry", "A pick is a punnet", "Picks and cherries are unrelated"]
    why: The indexer names picks; the scenario delivers cherries. The mapping between them is the first page of Part VI.
    sec: the-bridge
---

Every clean problem attracts neighbours that look like it. Four of them, each with the sentence that keeps it out.

## Four fences {#fences}

**Not bulk compression.** "Run zstd over the sequence's orchard and ship it" is a fine thing to do when a whole orchard moves between machines at once (the disaggregated-serving path of [[#papers-splitzip]]). It is not the scenario: a stream compressor decodes cherry 2000 only after 1999 others, and the contract's cold decode forbids that. The leash exists to keep this neighbour out even when it wears a dictionary as a disguise ([[#scenario-the-leash]]).

**Not lossy.** Quantizing the orchard to fewer bits (the KIVI and KVQuant family of [[#papers-kivi]]) changes what the LLM computes. The scenario starts *after* the storage format is chosen: the 8-bit codes are the data, and every one comes back. The literature on lossy orchards is read for hints about where structure lives, never for numbers to compare with ours.

**Not a deployment calculation.** The scenario has no link bandwidth, no decode deadline, no hot cache, no indexer. A ratio of 0.64 says how many bytes a cherry needs; it says nothing yet about milliseconds, sequences per GPU or dollars. That chain is Part VI, and every number in it is marked assumed or derived.

**Not a GPU memory budget.** The leash caps what one decode may *touch*, not what the receiver may *hold*. A reference-tree dictionary is half the punnet and passes a leash of 293; whether a shelf can hold it next to the hot cache is a question about residency and popularity ([[#app-the-napkin]]).

::: note warning What the campaigns' corner taught
All four fences were drawn before the first campaign; the first night crossed the first one anyway, because the goal had been stated without the leash ([[#scenario-the-leash]]). Fences are not decoration. Each one has a number on it now.
:::

::: takeaway
- Not bulk compression (cold decode), not lossy (the codes are the data), not a deployment calculation (bytes only), not a memory budget (reads, not residency).
:::

## The bridge to the serving system {#the-bridge}

One sentence connects the scenario to kvblockdiff: **the indexer names picks, and a pick is served with one or more cherries.** A [[pick]] is `(layer_id, token_pos_id)` as the indexer names it; under the scenario `V · layer l · cherry (2, 256)` that pick is one cherry; under `cherry (256,)` it is two; if the design moves keys and values together it is the cherries of two slices. The shelf holds the dictionaries of the punnets those cherries belong to, and a miss becomes a δ-miss when the right dictionary is there.

Everything else about the serving system, hits, misses, loads, levers, fire and ice, is Part VI, and every one of its numbers is a scenario's number multiplied by a count of picks.

::: takeaway
- The indexer names picks; a pick is served with one or more cherries; the shelf holds their punnets' dictionaries.
- Part VI multiplies the scenario's bytes by the picks of a serving system.
:::
