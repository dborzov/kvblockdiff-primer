---
title: kvblockdiff
layout: home.njk
lede: Small, similar things refuse to compress one at a time, unless the receiver already knows what they usually look like. A primer, a clean statement of one compression problem, the measurements so far, and the plan, for the working memory of a language model.
---

A weather station on a lonely rock sends the mainland a short message every half hour. Each message is almost identical to the one before it, yet compressing any one of them on its own saves almost nothing. The fix is old and clever: agree on a *dictionary* in advance, and from then on send only what is new.

A large language model has the same problem at a much bigger scale. While it writes, it keeps everything it has read in a growing store of keys and values, its **orchard**. Sparse-attention LLMs keep that orchard in the computer's main memory and fetch small pieces of it to the GPU at every step, thousands of tiny fetches per word. This site asks one question: **could those pieces travel as short deltas against a shared dictionary, and come back bit for bit identical?**

The question has a clean core, the **compression scenario** of Part IV: a sender holds the orchard, a receiver asks for one **cherry** at a time, a dictionary is shared in advance, and every cherry must come back exactly. Two autonomous research campaigns ran that scenario through a harness on real Qwen3.5-2B orchards (Part VIII). The plan for what to measure next is Part X.

## How to read this site {#how-to-read}

- **Short pages, one idea each.** Use the sidebar, the buttons at the bottom of every page, or the ← and → keys.
- **Coloured words are defined terms.** Hover or tap one for a reminder; click through to where it is defined. The signature ideas carry their own emblem and colour; meet them below in *The cast*.
- **Coloured letters are symbols, and dotted code is notation.** Every symbol has one meaning on the whole site; every Python expression like `v[token_pos_id, layer_id, head_id, :]` shows its shape and bytes on hover. Under each equation, *What's in this equation* lists its symbols.
- **Takeaway cards** close every section; **flashcards** let you keep what you learned. Add them as you read and practise them on the [practice page](/practice/).
- **Running themes**, a few ideas that keep coming back, are marked with dashed cards that link to each other.
- **Two reference settings.** Every estimate is quoted for one frozen rig. The pill in the top bar switches between the Pin (a production deployment) and the Bench (the campaigns' own data); hover reminders and the numbers marked with a dotted underline follow your choice. [[#landscape-reference-settings]] explains both.

::: note intuition Five ways in
- **The story first:** start with [[#tiny-files-notice-anything]] and read straight through.
- **Rusty on bits and vectors?** Start with [[#school-why-school]]; it assumes nothing.
- **Just the problem:** read Part IV from [[#scenario-one-cherry-at-a-time]]; it defines what it needs as it goes.
- **Just the results:** start with [[#measured-dispatch]] and read Part VIII straight through.
- **What to do next:** Part X, from [[#plan-where-we-stand]]. The one-page summary is [[#reference-summary]].
:::

## What this is, and what it is not {#scope}

**In scope:** how the orchard of a long sequence is stored in host memory and moved to the GPU during sparse-attention decoding, with the LLM's outputs unchanged, bit for bit. Everything here is [[lossless]].

**Out of scope:** anything that changes what the LLM computes: no approximate (lossy) compression of the orchard, no dropping tokens, no retraining. There is a large literature on lossy orchards; it shares keywords with this project and solves a different problem. We read it only for hints about where structure lives (Part IX).

::: pull
The LLM never notices. Only the bytes on the link get smaller, if the orchard is as alike as we hope.
:::
