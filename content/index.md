---
title: kv-blockdiff
layout: home.njk
lede: Small, similar things refuse to compress one at a time — unless the receiver already knows what they usually look like. A story, a primer, and a research proposal about doing exactly that for the working memory of a language model.
---

A weather station on a lonely rock sends the mainland a short message every half hour. Each message is almost identical to the one before it, yet compressing any one of them on its own saves almost nothing. The fix is old and clever: agree on a *dictionary* in advance, and from then on send only what is new.

A large language model has the same problem, at a much bigger scale. While it writes, it keeps a working memory of everything it has read — its **KV cache**. Modern models with sparse attention keep that memory in the computer's main memory and fetch small pieces of it to the GPU at every step, thousands of tiny fetches per word. This site asks one question: **could those tiny pieces travel as short deltas against a shared dictionary — and come back bit for bit identical?**

The answer depends on one property of KV caches that nobody has measured yet. The site names that property, does the homework around it, and plans a weekend-sized first experiment.

## How to read this site {#how-to-read}

- **Short pages, one idea each.** Use the sidebar, the buttons at the bottom of every page, or the ← and → keys.
- **Coloured words are defined terms.** Hover or tap one for a reminder; click through to where it is defined. The signature ideas carry their own emblem and colour — meet them below in *The cast*.
- **Coloured letters are symbols.** Every symbol has one meaning on the whole site, and its colour tells you what kind of quantity it is. Under each equation, *What's in this equation* lists them all.
- **Takeaway cards** close every section; **flashcards** let you keep what you learned. Add them as you read and practise them on the [practice page](/practice/).
- **Running themes** — a few ideas that keep coming back — are marked with dashed cards that link to each other.

::: note intuition Three ways in
- **The story first:** start with [[#tiny-files-notice-anything]] and read straight through.
- **Rusty on bits and vectors?** Start with [[#school-why-school]]; it assumes nothing.
- **Just the proposal:** read [[#reference-summary]], then dip into the Parts it points to.
:::

## What this is, and what it is not {#scope}

**In scope:** how the KV history of a long conversation is stored in host memory and moved to the GPU during sparse-attention decoding — with the model's outputs unchanged, bit for bit. Everything here is [[lossless]].

**Out of scope:** anything that changes what the model computes — no approximate (lossy) compression of the cache, no dropping tokens, no retraining. There is a large literature on lossy KV compression; it shares keywords with this project and solves a different problem. We read it only for hints about where structure lives (Part V).

::: pull
The model never notices. Only the bytes on the wire get smaller — if the KV cache is as alike as we hope.
:::
