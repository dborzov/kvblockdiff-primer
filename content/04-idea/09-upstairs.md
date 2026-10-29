---
title: Upstairs similarity
nav: Upstairs similarity
lede: Picture the KV cache as a building. Each floor is a layer; along each floor's corridor, one window per token. Upstairs similarity asks whether the window directly above looks like the one below. It is a second hypothesis — useful if true, not needed to start.
group: What the idea bets on
cards:
  - q: What does upstairs similarity claim?
    a: The entry of the same token one layer up is partly predictable from the entry below it
    wrong: ["Later tokens are predictable from earlier tokens of the same layer", "The indexer selects the same positions in adjacent layers", "Upper layers have smaller entries"]
    why: '$\vH(\vE_{\vl+1,\vt} \mid \vE_{\vl,\vt}) < \vH(\vE_{\vl+1,\vt})$ — the neighbour is along the layer axis, same token.'
    sec: floors
  - q: In the building picture, what are the floors and what are the windows?
    a: Floors are layers; windows along each floor are token positions
    wrong: ["Floors are tokens; windows are layers", "Floors are heads; windows are channels", "Floors are blocks; windows are requests"]
    why: Upstairs = same window, next floor up. Fallen-apple = same floor, a few windows along.
    sec: floors
  - q: What would strong upstairs similarity allow?
    a: One dictionary shared by a group of adjacent layers, so fewer dictionaries to store, load and keep resident
    wrong: ["Skipping the indexer at every second layer", "Dropping the upper layers' entries entirely", "A larger hot cache at no cost"]
    why: With groups of g layers sharing a dictionary, a block needs about 78/g dictionaries instead of 78 in the reference setting.
    sec: why-wait
  - q: Why is upstairs similarity second priority?
    a: The proposal works without it; it would only make dictionaries cheaper to share
    wrong: ["It has already been disproved", "It cannot be measured", "HiSparse already exploits it"]
    why: Per-layer block dictionaries need only fallen-apple similarity. Cross-layer sharing is an optimisation on top.
    sec: why-wait
---

Stand in front of a tall building at night. Each floor is one [[layer]] of the model; along each floor, one lit window per [[token]]. The [[entry]] $\vE_{\vl,\vt}$ is the window on floor $\vl$ at position $\vt$.

[[#idea-fallen-apple]] looked *along a corridor*: does a window resemble the windows a few doors down? This page looks *up the façade*: does a window resemble the one directly below it?

## One floor up {#floors}

::: define upstairs
- **What it is:** for the same token position $\vt$, the entry one layer up is partly predictable from the entry below it: $\vH(\vE_{\vl+1,\vt} \mid \vE_{\vl,\vt}) < \vH(\vE_{\vl+1,\vt})$.
- **Mnemonic:** layers are the floors of a building; tokens run along each floor. Upstairs = same window, next floor.
- **Status:** a hypothesis, second priority. Measured with the same tools as [[fallen-apple]] similarity, with the neighbour taken one floor down instead of a few doors along.
:::

::: figure fig-idea-floors floors
**The KV cache of one request as a building.** Each row of windows is one layer (8 floors shown; the reference model has 78); each window is one entry, at one token position. The filled window is the chosen entry (click any window to move it); the window below it, tinted blue, is the neighbour that upstairs similarity uses to predict it, and the arrow points from the known entry to the one being predicted. The gold tabs on the right are dictionaries: choose whether each floor has its own or whether groups of 2 or 4 floors share one. The readout counts the dictionaries one block of tokens would need across all 78 layers.
:::

::: aside reminder What changes from layer to layer
A token's hidden state passes up through the layers; each layer adds its own update to it and computes its own keys and values from it, with its own weights ([[#landscape-tokens-and-decoding]], [[#landscape-kv-cache]]).
:::

Is it plausible? Partly. The hidden state that enters layer $\vl+1$ is the one that left layer $\vl$, plus a correction. So the *inputs* of adjacent layers are closely related. But each layer turns its input into keys and values with its own, different weight matrices, and nothing forces two different projections of related inputs to look alike. Our read: some upstairs similarity in the hidden states is very likely; how much survives into the stored keys and values is anyone's guess. The proposal does not depend on the answer.

::: takeaway
- Upstairs similarity: same token, adjacent layers, $\vH(\vE_{\vl+1,\vt} \mid \vE_{\vl,\vt}) < \vH(\vE_{\vl+1,\vt})$.
- Plausible for hidden states; open for keys and values, which each layer computes with its own weights.
:::

## Why it matters, and why it waits {#why-wait}

If upstairs similarity were strong, a [[dictionary]] could be shared by a group of adjacent layers. In the [[reference-setting]] a block needs one dictionary per layer: 78 of them. Shared by groups of 4 floors, it would need 20. Fewer dictionaries means less to store, fewer loads over the link and less GPU memory spent on the [[dictionary-cache]]. Grouping by four is not arbitrary: GLM-5.2 already shares one indexer selection across groups of 4 layers, so its *selections* are grouped that way ([[#papers-hisparse]]).

It would also answer a second question: whether a delta could ever be taken against the entry one floor down, instead of against a dictionary.

:::: compare Two neighbours of one entry
::: col Fallen-apple neighbour
- Same floor (layer), a few windows (tokens) along.
- Exploited by per-block dictionaries along the token axis.
- **First priority:** without it, the deltas do not shrink.
:::
::: col Upstairs neighbour
- Same window (token), one floor down.
- Would allow dictionaries shared across layers.
- **Second priority:** an optimisation on top.
:::
::::

Two observations from [[hisparse]] point the same way — and, true to this Part, they are about *which* entries are wanted, not about their bytes. HiSparse keeps a separate cache per layer and found that coordinating them across layers adds little; using one layer's selection as a hint for the next helped little too. Neither says anything about whether adjacent layers' *entries* are alike. That remains a measurement to make, after the token axis ([[#questions-parked-measurements]]).

::: takeaway
- Strong upstairs similarity would let groups of layers share one dictionary — 78 per block could become 20.
- The proposal works without it, so it is measured second, with the same tools.
- HiSparse's cross-layer findings concern selections, not bytes.
:::
