---
title: The profile of a dictionary problem
nav: The profile
lede: Two conditions turn a pile of data into a dictionary problem. This page states them, maps the Gull Rock story onto the rest of the site, and swaps the first draft's loose words for ours.
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
  - q: In the language-model version of the story, what plays the part of one tiny Gull Rock message?
    a: One small piece of the model's memory, fetched to the GPU on its own
    wrong: ["The whole conversation", "One word of the model's answer", "The model's weights"]
    why: Sparse attention fetches a few small pieces of memory per step, scattered over a long history — the access pattern of lesson 1.
    sec: map
  - q: On this site, "similarity", "redundancy" and "mutual information" between an item and a dictionary are…
    a: Names for one quantity, in bits — how much shorter the item's code gets when the dictionary is known
    wrong: ["Three different quantities that must be measured separately", "Measures of how random the item is", "Lossy quality scores"]
    why: More of it means the item is more predictable. Part II defines it as mutual information.
    sec: vocabulary
  - q: On this site, what is a codebook?
    a: One kind of dictionary — a set of prototype items, each item naming its nearest
    wrong: ["Any dictionary at all", "The code tables inside a zstd dictionary", "The compressed data itself"]
    why: We reserve "codebook" for that special case and use "dictionary" for the general idea.
    sec: vocabulary
---

Gull Rock taught us a recipe. Before following it into a language model, write down exactly when it applies. Otherwise "use a dictionary" becomes a hammer, and everything starts looking like a nail.

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

The rest of this site asks whether the memory of a sparse-attention language model sits in the bold cell. Condition 2 is a plain fact about how such a model reads its memory: small pieces, scattered, a few at every step ([[#landscape-sparse-attention]]). Condition 1 is the open question. Nobody has measured how alike those pieces are in bits — and that is what the experiments in Part IX are for.

::: theme access-pattern
Here the access pattern is one of the two conditions. The same alike items call for an ordinary compressor when read as a stream, and for a dictionary when fetched one by one.
:::

::: takeaway
- A dictionary is the tool when items are alike *and* fetched as tiny, independent pieces.
- Alike but streamed: use an ordinary compressor. Not alike: nothing helps.
- For a language model's memory, condition 2 is known; condition 1 is what must be measured.
:::

## From Gull Rock to the GPU {#map}

Every piece of the Gull Rock story has a counterpart later on. The map shows where each one goes: Part II turns it into a general tool, and Parts III and IV apply that tool to a language model. Hover a card to light up its connections; click it to go to its page.

```graph
id: tiny-files-map
columns: ["At Gull Rock (Part I)", "The general tool (Part II)", "In a language model (Parts III–IV)"]
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
  - {id: vec, col: 2, row: 6, title: "Vectors & channels", text: "Rows of numbers, column by column.", link: school-vectors, term: channel}
  - {id: piece, col: 3, row: 1, title: "A piece of model memory", text: "A few hundred bytes to 2 KB of numbers.", link: landscape-kv-cache, term: entry}
  - {id: fetch, col: 3, row: 2, title: "Tiny scattered fetches", text: "A few pieces per step, from host memory.", link: landscape-hisparse, term: hot-cache}
  - {id: idea, col: 3, row: 3, title: "kv-blockdiff", text: "Fetch a delta, rebuild the piece exactly.", link: idea-mapping, term: kv-blockdiff}
  - {id: block, col: 3, row: 4, title: "A dictionary per block", text: "Shared by neighbouring pieces.", link: idea-dictionary-delta-block, term: block}
  - {id: pay, col: 3, row: 5, title: "Does it pay?", text: "Bits saved against dictionary costs.", link: homework-economics, cat: project}
  - {id: alike, col: 3, row: 6, title: "Are the pieces alike?", text: "The open question, to be measured.", link: questions-q1, cat: project}
edges:
  - [msg, piece, "becomes"]
  - [msg, lz]
  - [lz, dict, "too little context"]
  - [dict, side]
  - [cache, fetch]
  - [piece, fetch]
  - [side, idea]
  - [delta, pred]
  - [pred, block]
  - [even, amort]
  - [amort, pay]
  - [nums, vec]
  - [vec, alike]
  - [idea, block]
```

Read across a row and the story repeats itself. The radio message becomes a piece of model memory; the radio link becomes the wire between the computer's main memory and the GPU; the mainland's copy of the dictionary becomes a dictionary kept on the GPU. What does *not* carry over is the copying of byte strings — page [[#tiny-files-vectors-not-text]] replaced it with prediction.

::: takeaway
- Each Gull Rock idea has a general form in Part II and a language-model form in Parts III–IV.
- Message → piece of model memory; radio → the wire to the GPU; dictionary → a dictionary per block of neighbouring pieces.
:::

## Our words {#vocabulary}

The first draft of this proposal used words loosely, each meaning whatever its source paper meant by it. Here is each loose phrase next to what we say instead, and where our word is defined. Many of these pages lie ahead; this table is a promise that every word will be explained before it is leaned on.

| the first draft said | what we mean, in our words | defined in |
|---|---|---|
| "dictionary compression" | coding with side information: something many items share and the receiver holds in advance. Our general word is [[dictionary]]. | [[#tiny-files-trained-dictionary]], [[#school-side-information]] |
| "LZ dictionaries" | zstd's dictionary is sample fragments to copy from plus ready-made code tables. The copying does not carry over to numbers; the tables, in spirit, do. | [[#tiny-files-trained-dictionary/zstd-train]], [[#tiny-files-vectors-not-text]] |
| "VQ codebooks as dictionary compression" | right: a codebook — a set of prototype items, each item naming its nearest — is one kind of dictionary. We say *codebook* only for that kind. | [[#school-clusters]] |
| "additive VQ + product quantization" | codebooks with structure (several small codebooks, combined). The same economics as one codebook: a short name per item, a codebook per group. | [[#school-vq-vs-klt]] |
| "VQ, then Gaussian entropy-encode the error" | lossless predictive coding: predict, keep the exact leftover, code it with a model of its shape. A prototype is one possible prediction among many. | [[#school-prediction]], [[#missed-vq-then-code]] |
| "the delta" | kept: the bytes that rebuild one item exactly, given its dictionary. | [[#tiny-files-trained-dictionary]], [[#idea-dictionary-delta-block]] |
| "similarity", "redundancy", "mutual information" | one quantity, in bits: how much shorter an item's code gets when the dictionary is known. More of it means *more* predictable (the first draft had this backwards). | [[#school-mutual-information]], [[#missed-mutual-information-direction]] |
| "perplexity" | 2 raised to the entropy. Fine for words; we count bits, because bits times item size gives bytes on the wire. | [[#school-entropy]] |
| "t % b blocks of b tokens" | t ÷ b blocks, rounded up — and the block size is a knob we choose, not a property of the data. | [[#idea-dictionary-delta-block]], [[#missed-block-is-a-knob]] |
| "128K-token blocks" | in a 100K-token conversation, that is one dictionary for the whole conversation: a question of *scope*, not of blocks. | [[#homework-scope]] |
| "lightningindex", "DSA came with DeepSeek-V4" | the lightning indexer of DeepSeek Sparse Attention (DSA), which first shipped in DeepSeek-V3.2 in late 2025. | [[#landscape-sparse-attention]], [[#papers-sparse-selectors]] |

::: note warning Why fuss over words?
Because two of the corrections in this table change conclusions, not just style. Read backwards, mutual information would make every measurement point the wrong way; and treating the block as a property of the data hides a choice we get to make. Part VII tells each of these stories in full ([[#missed-about]]).
:::

::: takeaway
- Every loose phrase of the first draft gets one precise meaning here, with a page that defines it.
- *Dictionary* is the general idea; a codebook, a set of typical values and a zstd dictionary are kinds of it.
- Similarity, redundancy and mutual information are one quantity, measured in bits.
:::
