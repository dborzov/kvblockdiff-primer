---
title: "Parked: other neighbours and other splits"
nav: "Parked · measurements"
lede: Framework A measures one kind of neighbour along one axis. The same machine can be pointed in other directions, and the same data can be cut in other ways. Four parked measurements, each cheap, each with a reason to care.
cards:
  - q: If upstairs similarity is strong and selections are shared across groups of 4 layers, what could be gained?
    a: One dictionary per layer group instead of per layer — about 4× less residency
    wrong: ["4× fewer misses", "Exact top-k selection for free", "Nothing: layers are always independent"]
    why: Layers that share both a selection and a dictionary need only one resident dictionary per group.
    sec: neighbours
  - q: Why may the GQA-heads question not transfer to the real target models?
    a: MLA models store one latent vector per token and layer — there is no head axis in the cache
    wrong: ["Because GQA heads are always identical", "Because heads are stored in BF16", "Because the indexer ignores heads"]
    why: The head axis exists in GQA caches like our proxy's (2 key/value heads) but not in MLA caches.
    sec: neighbours
  - q: What would it mean if missed entries compress worse than entries on average?
    a: The miss path sees a harder distribution, so ρ on the miss path is worse than ρ measured on the whole history
    wrong: ["The hot cache is too small", "Fallen-apple similarity is absent", "The shuffle control failed"]
    why: Entries that are surprising in time (they escape LRU) might also be surprising in content; the delta ratio that matters is the one of the missed entries.
    sec: splits
  - q: Why is "prefill versus generated" slightly harder to measure than it looks with the wave-1 data?
    a: The wave-1 dumps run the model over existing text; generated tokens need the model to actually write
    wrong: ["Because generated tokens have no keys", "Because prefill tokens are not cached", "Because it needs a production trace"]
    why: Treating the last part of a document as "decode" gives teacher-forced tokens, not tokens the model chose itself.
    sec: splits
---

An entry sits at a crossing of axes: which token, which layer, which head. Framework A ([[#questions-framework-a]]) walks along one axis — back along the tokens — and counts bits. Nothing stops us from walking along the others, or from cutting the data in two and walking each half. The figure shows the four directions this page parks.

::: figure fig-questions-axes qAxes
**Neighbours along the axes of the KV cache** (diagram). One request at a glance: columns are tokens, rows are layers, and a second sheet behind the first is a second key/value head. The accent cell $\vE$ is the entry being coded. Choose a question to highlight what it would use as side information: earlier tokens of the same layer (fallen-apple, $\vgap$ = 1, 2, 4), the same token one layer down (upstairs), the same token and layer in the other head, or — not a neighbour at all — a split of the tokens into the prompt and the tokens the model wrote.
:::

## Other neighbours {#neighbours}

::: note question Is upstairs similarity strong enough to share dictionaries across layer groups?
GLM-5.2 is reported to share one indexer selection across groups of 4 layers (we have not checked this ourselves).

- **Why it is interesting.** If the entry one floor up is much cheaper to code given the one below — if $\vH(\vE_{\vl+1,\vt} \mid \vE_{\vl,\vt})$ is markedly below $\vH(\vE_{\vl+1,\vt})$ — then layers that share a selection could also share a dictionary, or carry cross-layer deltas. Residency would drop by about 4×.
- **The experiment.** Framework A with the neighbour one floor down ([[upstairs]]); then the measuring program with blocks that span a layer group.
- **Our odds: a long shot.** Each layer transforms its input substantially, and keys and values are projections chosen per layer. But the second step is cheap once the first is done.
:::

::: note question Do the key/value heads of one layer resemble each other?
A possible third member of [[neighbour]] similarity, along the head axis.

- **Why it is interesting.** If the heads of a layer share a basis, a dictionary per layer shrinks by the number of heads.
- **The experiment.** Framework A with the neighbour in the other head, at $\vgap = 0$. Same tools, an afternoon.
- **Our odds: low, and limited.** [[head|Heads]] are trained to look for different things. And the question does not transfer to [[mla]] models, which store one latent vector per token and layer: there is no head axis in their cache.
:::

::: takeaway
- Upstairs: could cut residency ~4× where layers share selections; a long shot, cheap to check.
- Heads: cheap to measure on our proxy, but MLA caches have no head axis.
:::

## Other splits {#splits}

::: note question Do generated tokens compress differently from prompt tokens?
The newest block is written during decoding, and it is the one the model attends to most.

- **Why it is interesting.** If its entries are more (or less) compressible than [[prefill-decode|prefill]] entries, the policy that refits the live block's dictionary should know it.
- **The experiment.** Split the distance curves of framework A by prompt versus generated positions.
- **The catch.** The wave-1 dumps run the model over existing text. The last 4K tokens of a document are not *generated* tokens; they are text the model was shown. Real generated tokens need the model to write, which is slower but still small.
- **Our odds: some difference is likely.** Whether it matters for the design is less clear.
:::

::: note question Are the entries that are surprising in time also surprising in content?
HiSparse's remaining misses are the selections that LRU and cross-layer hints fail to predict ([[#papers-hisparse]]).

- **Why it is interesting.** If those same entries also compress worst, the miss path sees a harder distribution than the average, and the delta ratio $\vrho$ that matters — the missed entries' — is worse than the one measured on the whole history. That would quietly shrink lever 1.
- **The experiment.** In wave 2, compare the coding rate of the missed entries with the rate of all entries ([[#plan-wave2-measure]]).
- **Our odds: a coin toss.** It is a risk check more than an opportunity, and it is cheap to add to the replay — so it is already on the wave-2 list.
:::

::: theme which-vs-what
This last question is the one place where "which" and "what" might be *linked* rather than independent: entries that escape the cache might be the odd ones out in content too. Everywhere else on the site we keep the two apart; here we measure whether they touch.
:::

::: takeaway
- Prompt versus generated: a split of framework A's curves; generated tokens need the model to write.
- Surprising in time versus in content: a risk check on $\vrho$, already planned for wave 2.
:::
