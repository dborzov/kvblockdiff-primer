---
title: "Parked: free and shared dictionaries"
nav: "Parked · dictionaries"
lede: Ideas that came up along the way and deserve a page of their own, even though none is on the critical path. This one holds four about the dictionary itself — two that might cost nothing, two that might be smarter.
cards:
  - q: Why could the indexer's keys be a dictionary "at zero marginal cost"?
    a: They are already kept on the GPU for every token, because the indexer scores every past position at every step
    wrong: ["Because they are stored in BF16", "Because the indexer key is the same as the entry", "Because indexer keys are never read"]
    why: A predictor from indexer key to entry would be global (one per layer, shared by all requests); its input is already resident.
    sec: free
  - q: What makes a dictionary for a shared prompt prefix potentially free?
    a: It is fit once and shared by every request that uses the prefix, so its cost is spread over many requests
    wrong: ["Prefix blocks never miss", "Shared prefixes have no keys", "Prefix caching compresses KV losslessly already"]
    why: Amortization across requests instead of across entries. The open question is how many hot entries actually sit in shared blocks.
    sec: free
  - q: What is the main cost of using real "anchor" entries as the dictionary?
    a: The sibling tax — the residual is the difference of two noisy vectors, so its noise doubles
    wrong: ["Anchors must be fetched over the link on every miss", "Anchors make decoding non-deterministic", "Anchors cannot be stored raw"]
    why: Predicting one noisy entry from another adds both noises. The bonus is that anchors are real entries attention can use as hits.
    sec: smarter
  - q: For rate allocation across channels, what decides whether it is cheap?
    a: Whether the best allocation transfers across requests (then it is a global, free choice) or must be refit per block
    wrong: ["Whether the GPU supports per-channel widths", "Whether the model uses RoPE", "Whether keys and values have the same size"]
    why: A transferable allocation lives in a global dictionary; a per-block one costs dictionary bytes like any other block dictionary.
    sec: smarter
---

A research plan collects ideas faster than it can test them. Throwing them away loses them; testing them all loses the plan. So they go on a shelf, each written as a question with the experiment that would answer it, so that anyone can pick one up later without re-deriving the context. This page and the next two are that shelf.

We also say how much we would bet on each. Here is the whole shelf at a glance.

::: figure fig-questions-parked qParkedMap
**The parked shelf** (our judgement, not data). Each dot is one parked question. Horizontal axis: how costly it would be to test, from a hyperparameter sweep on the wave-1 data (cheap) to needing a different model or a production serving trace (costly). Vertical axis: our odds that it gives a useful answer, from long shot to likely. Colours: the page each question lives on. Hover or tap a dot for its name and page.
:::

## Dictionaries that might come for free {#free}

::: note question Can the indexer's own keys serve as a free, always-resident dictionary?
In [[dsa]], every token has a small indexer key at every layer — in DeepSeek-V3.2, 128 numbers stored in FP8, next to an entry of 576 numbers. The [[indexer]] scores every past position at every step, so these keys must sit on the GPU for every token, all the time.

- **Why it is interesting.** Indexer key and entry are both made from the same hidden state of the same token. A global linear predictor from one to the other would cost one matrix per layer, shared by all requests, and its input would already be resident for every token. Its residual would be the delta. If it worked, the whole residency question (Q3) would answer itself.
- **The experiment.** On a model with an indexer, regress each entry — keys before [[rope]] and values, or the latent vector of [[mla]] — on the indexer key, layer by layer. Report the share of variance explained ([[r-squared]]) per channel, and the bits it buys through the exchange rate.
- **Our odds: medium, and costly.** The indexer key is trained to *rank* positions, not to reconstruct anything, and it has 128 numbers against 576. A linear map from it can explain at most a 128-direction slice of the entry. And our wave-1 proxy model has no indexer, so this needs a large model.
:::

::: note question Do shared prefixes make heavy dictionaries free?
In production, many requests share long system prompts and documents, and serving systems already share their KV through prefix caching.

- **Why it is interesting.** A dictionary for a block of a shared prefix is fit once and kept once, for every request that uses it. Its cost is spread over requests, not just over entries — so even a heavy codebook could cost almost nothing per request. This is a way out if Q2 says "heavy dictionaries only".
- **The experiment.** On a serving trace with prefix sharing, count how many hot entries (and misses) belong to shared blocks. If most do, heavy dictionaries for those blocks are nearly free.
- **Our odds: plausible, but costly for us.** Prefix sharing is common; whether the *hot* entries live in the shared part is unknown. We have no such trace, and building one is a project of its own.
:::

::: takeaway
- Indexer keys: resident by necessity, possibly predictive; needs a model with an indexer, odds medium.
- Shared prefixes: amortize heavy dictionaries across requests; needs a production trace, odds plausible.
:::

## Dictionaries that might be smarter {#smarter}

::: note question Can the dictionary be data? (anchor entries)
Designate a few entries per block as anchors, stored raw. Code every other entry against its nearest anchor, or against a per-channel affine function of it.

- **Why it is interesting.** The "dictionary" is then made of real entries, which attention may select and use as hits. Its bytes are not pure overhead, and its residency is handled by the ordinary hot cache.
- **The cost.** The sibling tax: predicting a noisy entry from another noisy entry adds both noises, so the noise part of the residual doubles, about half a bit per element ([[#homework-sib]]).
- **The experiment.** The [[sib]] rung of the measuring program, with anchors chosen offline, compared with [[loc]] at equal dictionary weight.
- **Our odds: a long shot, but nearly free to test.** It wins only if entries in a block are near-duplicates. The rung exists anyway.
:::

::: note question Where should the dictionary's bytes go? (rate allocation across channels)
If a few key channels own most of the variance, a dictionary that spends its weight on those channels — a rank or a code width per channel — should beat one that spreads it evenly.

- **Why it is interesting.** The prior from the literature is exactly this: a few large, slowly varying key channels ([[#homework-where-bits-come-from]]). Spending bytes where the variance is, is the oldest trick in transform coding.
- **The experiment.** A hyperparameter sweep in the measuring program: per-channel widths and ranks, scored on the same curve ([[#questions-framework-b]]).
- **The real question.** Does the best allocation transfer across requests? Then it belongs in a global dictionary and costs nothing at serving time. Or must it be refit per block, paying dictionary bytes like everything else?
- **Our odds: likely a small win.** Cheap to test on wave-1 data; the size of the win is the unknown.
:::

::: takeaway
- Anchors: real entries as the dictionary; pay the sibling tax; cheap to test, long odds.
- Rate allocation: spend dictionary bytes on the channels that hold the variance; likely a small win; the question is whether it transfers.
:::
