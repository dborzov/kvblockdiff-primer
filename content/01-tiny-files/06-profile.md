---
title: The profile of a dictionary problem
nav: The profile
lede: Two conditions turn a pile of data into a dictionary problem. This page states them, maps the Gull Rock story onto the eleven Parts of the site, and puts the old words next to ours.
cards:
  - q: Which two conditions, together, make a dictionary the tool for the job?
    a: The items are alike, and they are fetched as tiny, independent pieces
    wrong: ["The files are large, and the link is fast", "The data is random, and the link is slow", "The data is text, and loss is acceptable"]
    why: Alike items give a dictionary something to capture; tiny independent fetches are what stop an ordinary compressor from capturing it by itself.
    sec: two-conditions
  - q: The items are alike, but they are always read as one big stream. What is the right tool?
    a: An ordinary compressor run over the whole stream
    wrong: ["A trained dictionary", "Nothing can help", "Lossy compression"]
    why: The day's log compresses to 13 bytes per message with plain DEFLATE. A dictionary only earns its cost when the pieces travel alone.
    sec: two-conditions
  - q: In the LLM version of the story, what plays the part of one tiny Gull Rock message?
    a: One small piece of the LLM's memory, fetched to the GPU on its own
    wrong: ["The whole conversation", "One word of the LLM's answer", "The LLM's weights"]
    why: Sparse attention fetches a few small pieces of memory per step, scattered over a long history — the access pattern of lesson 1.
    sec: map
  - q: On this site, "similarity", "redundancy" and "mutual information" between an item and a dictionary are…
    a: Names for one quantity, in bits — how much shorter the item's code gets when the dictionary is known
    wrong: ["Three different quantities that must be measured separately", "Measures of how random the item is", "Lossy quality scores"]
    why: More of it means the item is more predictable. Part II defines it as mutual information.
    sec: vocabulary
  - q: The old site used one word both for a run of token positions and for the set of data one dictionary serves. What does this site say?
    a: A stretch for a run of token positions, and a punnet for the set of cherries one dictionary serves
    wrong: ["A stretch for both", "A punnet for both", "A slice for the positions and a cherry for the data"]
    why: A run of positions is a knob we choose; the cherries cut from it under one slice are what one compress call sees. Two objects, two words.
    sec: vocabulary
  - q: The old site used one word both for what the indexer selects and for what the compressor shrinks. What does this site say?
    a: A pick when the indexer names it, a cherry when the receiver asks for it and the compressor shrinks it
    wrong: ["Always a cherry", "Always a pick", "A furrow"]
    why: The indexer selects positions; the scenario delivers fixed-shape sub-arrays. One old word hid two things.
    sec: vocabulary
---

Gull Rock taught us a recipe. Before following it into an LLM, write down exactly when it applies. Otherwise "use a dictionary" becomes a hammer, and everything starts looking like a nail.

## Two conditions {#two-conditions}

::: keycard The profile of a dictionary problem
$$
\begin{gathered}
\underbrace{\text{alike items}}_{\text{something to learn}} \;+\; \underbrace{\text{tiny fetches}}_{\text{no context in any one}} \\[2pt]
\Downarrow \\
\text{a dictionary is the tool}
\end{gathered}
$$

Both conditions must hold. Drop either one and something simpler wins.
:::

1. **An ensemble of alike items.** The items share structure that a compressor could learn: the same skeleton, the same typical values, the same habits. Measured properly, "alike" means the items together carry far fewer bits than each one separately ([[#school-mutual-information]] makes this precise).
2. **Tiny, independent fetches.** Each item is written, sent or read on its own, so no single fetch carries enough context for ordinary compression ([[#tiny-files-three-lessons/always-there]]).

The four combinations, with examples:

| | read as one big stream | fetched as tiny, independent pieces |
|---|---|---|
| **items alike** | an ordinary compressor on the stream does it — Gull Rock's daily log: 13 bytes per message | **a dictionary problem** — Gull Rock's radio: 125 bytes per message alone, 22 with a dictionary |
| **items unrelated** | little helps — already-compressed photos, encrypted files | nothing helps — no dictionary can describe what the items do not share |

The rest of this site asks whether the memory of a sparse-attention LLM (Part III calls it the orchard) sits in the bold cell. Condition 2 is a plain fact about how such an LLM reads its memory: small pieces, scattered, a few at every step ([[#landscape-sparse-attention]]). Condition 1 was the open question when this project began: nobody had measured how alike those pieces are in bits. Part VIII reports what two measurement campaigns found ([[#measured-dispatch]]).

::: theme access-pattern
Here the access pattern is one of the two conditions. The same alike items call for an ordinary compressor when read as a stream, and for a dictionary when fetched one by one.
:::

::: takeaway
- A dictionary is the tool when items are alike *and* fetched as tiny, independent pieces.
- Alike but streamed: use an ordinary compressor. Not alike: nothing helps.
- For an LLM's memory, condition 2 is known; condition 1 had to be measured, and Part VIII reports the result.
:::

## From Gull Rock to the GPU {#map}

Every piece of the Gull Rock story has a counterpart later on. The map shows where each one goes: Part II turns it into a general tool, and Parts III to VI apply that tool to an LLM. Hover a card to light up its connections; click it to go to its page.

```graph
id: tiny-files-map
columns: ["At Gull Rock (Part I)", "The general tool (Part II)", "In an LLM (Parts III–VI)"]
nodes:
  - {id: msg, col: 1, row: 1, title: "A tiny message", text: "148 bytes, sent and read on its own.", link: tiny-files-notice-anything, cat: coding}
  - {id: lz, col: 1, row: 2, title: "Copy from earlier", text: "Needs context that one message lacks.", link: tiny-files-one-at-a-time, term: lz-match}
  - {id: dict, col: 1, row: 3, title: "The trained dictionary", text: "Held by both ends, sent once.", link: tiny-files-trained-dictionary, term: dictionary}
  - {id: delta, col: 1, row: 4, title: "The delta", text: "About 22 bytes, exact, useless without D.", link: tiny-files-trained-dictionary, term: delta}
  - {id: even, col: 1, row: 5, title: "Break-even", text: "The dictionary pays off after enough messages.", link: tiny-files-three-lessons/pay-once, cat: project}
  - {id: nums, col: 1, row: 6, title: "Lists of numbers", text: "Guess, then send the leftover.", link: tiny-files-vectors-not-text, cat: coding}
  - {id: cache, col: 2, row: 1, title: "Caches", text: "A small fast desk, a big slow archive.", link: school-caches, term: cache}
  - {id: side, col: 2, row: 3, title: "Side information", text: "What the receiver already knows, in bits.", link: school-side-information, term: side-information}
  - {id: pred, col: 2, row: 4, title: "Predict, then correct", text: "Store the residual, not the value.", link: school-prediction, term: predictive-coding}
  - {id: amort, col: 2, row: 5, title: "Amortization", text: "A fixed cost shared by many.", link: school-amortization, term: amortization}
  - {id: vec, col: 2, row: 6, title: "Vectors, elements, furrows", text: "Rows of numbers, column by column.", link: school-vectors, term: furrow}
  - {id: piece, col: 3, row: 1, title: "A cherry of the orchard", text: "A few hundred bytes of numbers, asked for on its own.", link: scenario-cherry, term: cherry}
  - {id: fetch, col: 3, row: 2, title: "Tiny scattered fetches", text: "A few picks per step, from host memory.", link: landscape-hisparse, term: hot-cache}
  - {id: idea, col: 3, row: 3, title: "kvblockdiff", text: "Fetch a delta, rebuild the cherry exactly.", link: app-mapping, term: kvblockdiff}
  - {id: punnet, col: 3, row: 4, title: "A dictionary per punnet", text: "Shared by the cherries of one stretch.", link: scenario-punnet, term: punnet}
  - {id: pay, col: 3, row: 5, title: "Does it pay?", text: "Bits saved against dictionary costs.", link: app-the-napkin, cat: project}
  - {id: alike, col: 3, row: 6, title: "Are the cherries alike?", text: "The hypotheses, and what was measured.", link: hypotheses-neighbour-similarity, cat: project}
edges:
  - [msg, piece, "becomes"]
  - [msg, lz]
  - [lz, dict, "too little context"]
  - [dict, side]
  - [cache, fetch]
  - [piece, fetch]
  - [side, idea]
  - [delta, pred]
  - [pred, punnet]
  - [even, amort]
  - [amort, pay]
  - [nums, vec]
  - [vec, alike]
  - [idea, punnet]
```

Read across a row and the story repeats itself. The radio message becomes a small piece of an LLM's memory; the radio link becomes the wire between the computer's main memory and the GPU; the mainland's copy of the dictionary becomes a dictionary kept on the GPU. What does *not* carry over is the copying of byte strings — page [[#tiny-files-vectors-not-text]] replaced it with prediction.

Here is where the site goes from here, Part by Part. Each line says what the Gull Rock story turns into there.

| Part | | what Gull Rock becomes there |
|---|---|---|
| I | The tiny-file problem | this Part: the recipe, learned on weather messages |
| II | [[#school-why-school\|Back to school]] | the general tools: bits, entropy, side information, prediction, vectors, codebooks, number formats, caches, wires |
| III | [[#landscape-tokens-and-decoding\|How an LLM reads its memory]] | the station becomes an LLM; its memory is the orchard; the radio becomes the wire to the GPU; the forecaster's desk becomes the GPU's small fast memory |
| IV | [[#scenario-one-cherry-at-a-time\|The compression scenario]] | the tiny message becomes a cherry; the stack of old messages becomes a punnet; the rules of the game (the contract, the score, the leash) are written down |
| V | [[#toolbox-the-bill\|The compressor's toolbox]] | the ways to guess a cherry from a dictionary, one stage at a time, each with its bill |
| VI | [[#app-mapping\|kvblockdiff: the application]] | the mainland's copy of the dictionary becomes a shelf of dictionaries on the GPU; does it pay, in bytes and in dollars? |
| VII | [[#hypotheses-bits-are-the-unit\|Hypotheses about the orchard]] | "are the pieces alike?", asked axis by axis, in bits |
| VIII | [[#measured-dispatch\|The measurements]] | what two campaigns measured on real orchards: which hypotheses held |
| IX | [[#papers-reading-guide\|Papers]] | what others have done, retold in this site's words |
| X | [[#plan-where-we-stand\|The research plan]] | what is still open, and the next experiments in order of speed |
| XI | [[#reference-summary\|Summary and reference]] | the one-page summary, the glossary, the notation, the old words next to the new |

::: takeaway
- Each Gull Rock idea has a general form in Part II and an LLM form in Parts III–VI; Parts VII–XI test it, read around it and plan.
- Message → cherry of the orchard; radio → the wire to the GPU; dictionary → a dictionary per punnet of neighbouring cherries.
:::

## Our words {#vocabulary}

The first draft of this site used words loosely, each meaning whatever its source paper meant by it, and several of them meant two things at once. Here is each old word next to what we say instead, and where our word is defined. Almost all of these pages lie ahead; this table is a promise that every word will be explained before it is leaned on, and a place to come back to when a hover reminder is not enough. (The full tables, including the experiment repository's words and the papers' words, are on [[#reference-old-words]].)

| their words (and the old site's) | our word | defined in |
|---|---|---|
| KV cache, KV history | [[orchard\|the orchard]] | [[#landscape-orchard]] | <!-- old-words -->
| entry (the selected thing) / entry (the compressed thing) | [[pick\|a pick]] / [[cherry\|a cherry]] | [[#landscape-sparse-attention]] / [[#scenario-cherry]] | <!-- old-words -->
| entry split | [[slice\|the slice]] + [[cherry-shape\|the cherry shape]] | [[#scenario-slice]], [[#scenario-cherry]] | <!-- old-words -->
| block (a range of tokens) / block (the data) / block size *b* | [[stretch\|a stretch]] / [[punnet\|a punnet]] / the stretch length | [[#scenario-stretch]], [[#scenario-punnet]] | <!-- old-words -->
| channel (the index) / channel (the column) / channel (the wire) | [[element\|an element]] / [[furrow\|a furrow]] / [[link\|the link]] | [[#school-vectors]], [[#landscape-memory-wall]] | <!-- old-words -->
| request, thread | [[sequence\|a sequence]] | [[#landscape-tokens-and-decoding]] | <!-- old-words -->
| model, proxy model | [[llm\|the LLM]] (always named), [[stand-in-llm\|a stand-in LLM]] | [[#landscape-tokens-and-decoding]], [[#landscape-reference-settings]] | <!-- old-words -->
| coder, codec, algorithm | [[compressor\|a compressor]] | [[#scenario-compressors-and-stages]] | <!-- old-words -->
| read budget, dict reads | [[leash\|the leash]], [[reads\|reads]] | [[#scenario-the-leash]] | <!-- old-words -->
| dictionary cache | [[dictionary-shelf\|the dictionary shelf]] | [[#app-shelf-and-two-misses]] | <!-- old-words -->
| heavy block | [[heavy-stretch\|a heavy stretch]] | [[#app-on-fire]] | <!-- old-words -->
| request scope, block scope | [[scope-sequence\|sequence scope]], [[scope-stretch\|stretch scope]] | [[#scenario-scope]] | <!-- old-words -->
| kv-blockdiff | [[kvblockdiff]] (one spelling, no hyphen) | [[#app-mapping]] | <!-- old-words -->
| exact-model estimate | [[code-length-estimate\|a code-length estimate]] | [[#toolbox-bounds]] | <!-- old-words -->

Two words on this page already have their meaning: [[dictionary]] is anything both ends hold in advance (a zstd dictionary, a few typical values, later a codebook or a set of reference cherries are all kinds of it), and [[delta]] is what one item travels as, given the dictionary. Two more things the first draft got wrong were ideas, not words. "Similarity", "redundancy" and "mutual information" are one quantity, in bits, and more of it means *more* predictable; the draft had the direction backwards ([[#school-mutual-information]], [[#hypotheses-bits-are-the-unit]]). And the length of a stretch is a knob we choose, not a property of the data ([[#scenario-stretch]]).

::: note warning Why fuss over words?
Because two of the rows above hide conclusions, not just style. One old word, "entry", stood for what the indexer selects *and* for what the compressor shrinks; those are different objects, with different sizes, and a bit count for one is not a bit count for the other. Another, "block", was a range of tokens in one sentence and a box of data in the next, which hid the fact that the range is ours to choose. Part IV gives each object its own word and its own line of Python. <!-- old-words -->
:::

::: takeaway
- Every old word gets one precise replacement here, with a page that defines it.
- *Dictionary* is the general idea; a codebook, a set of typical values and a zstd dictionary are kinds of it.
- Similarity, redundancy and mutual information are one quantity, measured in bits.
:::
