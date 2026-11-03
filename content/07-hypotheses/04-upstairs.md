---
title: Upstairs similarity (layer axis)
nav: Upstairs similarity
group: The hypotheses
lede: Picture the orchard of one sequence as a building. Each floor is a KV layer; along each corridor, one window per token. Upstairs similarity asks whether the window directly above looks like the one below. Measured, the floors came in two kinds instead.
cards:
  - q: What does upstairs similarity claim?
    a: The cherry of the same token one layer up is partly predictable from the cherry below it
    wrong: ["Later tokens are predictable from earlier tokens of the same layer", "The indexer picks the same positions in adjacent layers", "Upper layers have smaller cherries"]
    why: '$\vH(\vE_{\vl+1,\vt} \mid \vE_{\vl,\vt}) < \vH(\vE_{\vl+1,\vt})$: the neighbour is along the layer axis, same token.'
    sec: floors
  - q: What would strong upstairs similarity allow?
    a: One dictionary shared by a group of layers, so fewer dictionaries to store, load and keep on the shelf
    wrong: ["Skipping the indexer at every second layer", "Dropping the upper layers' cherries entirely", "A larger hot cache at no cost"]
    why: With groups of g layers sharing a dictionary, a stretch on the Pin needs about 78/g dictionaries instead of 78.
    sec: measuring
  - q: After the heads, what did joining all six KV layers into one cherry save, and how do the layers group?
    a: A further 0.0043 of ratio (20 of 20); KV layers 0, 4, 5 behave alike and 1, 2, 3 behave alike, by kind, not by nearness
    wrong: ["A further 0.03; adjacent layers group together", "Nothing at all", "0.0043, and only adjacent layers may be joined"]
    why: Grouping 0+4+5 and 1+2+3 beat grouping 0+1+2 and 3+4+5 by 0.0015 on 7 of 7 sequences, although the second joins neighbours.
    sec: verdict
  - q: Given everything else a compressor knows, how much do adjacent KV layers share?
    a: 0.03 to 0.08 bit per element; distant layers about 0.01
    wrong: ["About 0.85 bit per element", "Nothing", "Unmeasured"]
    why: Against 0.19 to 1.19 bit for the two heads. The floor directly above is barely more alike than a floor far away.
    sec: verdict
---

Stand in front of a tall building at night. Each floor is one [[kv-layer|KV layer]]; along each floor, one lit window per [[token]]. The cherry [[~v-one-token-layer|v[t, l]]] is the window on floor $\vl$ at position $\vt$.

[[#hypotheses-fallen-apple]] looked *along a corridor*. This page looks *up the façade*: does a window resemble the one directly below it?

## One floor up {#floors}

::: define upstairs
- **What it is.** For the same token position $\vt$, the cherry one layer up is partly predictable from the cherry below it: $\vH(\vE_{\vl+1,\vt} \mid \vE_{\vl,\vt}) < \vH(\vE_{\vl+1,\vt})$. In Python: `v[t, l + 1]` given `v[t, l]`.
- **Mnemonic.** Layers are floors; tokens run along each floor. Upstairs = same window, next floor.
- **Status.** Second bet of the old draft; measured since: small, and by kind of layer rather than by adjacency.
:::

::: figure fig-hyp-floors floors
**The orchard of one sequence as a building.** Each row of windows is one KV layer (8 floors shown; the Pin has 78, the Bench 6); each window is one cherry, one token's values at one layer. The filled window is the chosen cherry (click any window to move it); the window below it, tinted blue, is the neighbour that upstairs similarity uses to predict it, and the arrow points from the known cherry to the one being predicted. The gold tabs on the right are dictionaries: choose whether each floor has its own or whether groups of 2 or 4 floors share one. The readout counts the dictionaries one stretch would need across all 78 layers of the Pin.
:::

::: aside reminder What changes from layer to layer
A token's [[hidden-state]] passes up through the layers; each layer adds its own update to it and computes its own keys and values from it with its own weights, `(x @ W.v[layer_id]).reshape(n_kv_heads, head_dim)` in the `decode_step` listing of [[#landscape-attention]].
:::

Is it plausible? Partly. The hidden state that enters layer $\vl+1$ is the one that left layer $\vl$, plus a correction, so the *inputs* of adjacent layers are closely related. But each layer turns its input into values with a different matrix `W.v[layer_id]`, and nothing forces two different projections of related inputs to look alike. Some upstairs similarity in the hidden states is very likely; how much survives into the stored values was anyone's guess. And on a hybrid LLM like Qwen3.5-2B only 6 of 24 layers keep keys and values at all, so "one floor up" on the Bench means four transformer layers up.

::: takeaway
- Upstairs similarity: same token, adjacent KV layers, $\vH(\vE_{\vl+1,\vt} \mid \vE_{\vl,\vt}) < \vH(\vE_{\vl+1,\vt})$.
- Plausible for hidden states; open for values, which each layer projects with its own weights.
:::

## What it would buy, and how a scenario measures it {#measuring}

If upstairs similarity were strong, a [[dictionary]] could be shared by a group of adjacent layers. On [[pin|the Pin]] a stretch needs one dictionary per layer, 78 of them; shared by groups of four, 20. Fewer dictionaries means less to store, fewer loads over the link and less GPU memory on the [[dictionary-shelf]]. Groups of layers are not an arbitrary idea: GLM-5.1 already makes one indexer selection for a group of layers, so its *picks* come grouped ([[#app-which-application]]).

Two scenarios measure it, on the same elements ([[#scenario-why-vary]]):

1. **Cherry shape.** `v[t, l, :, :]`, one layer's values of one token, against `v[t, :, :, :]`, the same token at every KV layer. The wider cherry may predict each layer from the others; the gap bounds what the layers share. And which layers to group is a question the same instrument answers: join three and three, by nearness or by some other rule, and compare.
2. **A dictionary shared across layers.** Keep `v[t, l, :, :]` cherries and let one dictionary serve the cherries of several layers. This is the scenario a GLM-style design needs, and it has not been run ([[#plan-next-in-the-harness]]).

::: takeaway
- Strong upstairs similarity would let groups of layers share one dictionary: 78 per stretch could become 20 on the Pin.
- Measured by cherry shape `v[t, l, :, :]` against `v[t, :, :, :]` on the same window, and by how layers group.
:::

## Verdict {#verdict}

Small, and not along the staircase. Values of Qwen3.5-2B, FP8, stretch 4096, same-window comparison on 20 sequences ([[#measured-cutting-the-tensor]]):

| comparison | reading | grade |
|---|---|---|
| all six KV layers as one cherry, after the two heads are already joined | a further 0.0043 ± 0.0014 of ratio, 20 of 20 sequences (understated by about 0.002: the six-layer compressor lacked the two-layer one's layout) | encoded bytes, one window per sequence |
| grouping KV layers 0, 4, 5 and 1, 2, 3 against 0, 1, 2 and 3, 4, 5 | the first grouping wins by 0.0015, 7 of 7 sequences, although the second joins neighbours | encoded bytes, 7 sequences |
| bits shared, given everything else the compressor knows | adjacent KV layers 0.03 to 0.08 bit per element; distant layers about 0.01; the two heads, for comparison, 0.19 to 1.19 | code length, bound |

The floor directly above is barely more alike than a floor far away. What the layers have instead is *kinds*: the first and last KV layers (transformer layers 3, 19, 23) build hub-shaped reference trees out of far repeats, and the middle ones (7, 11, 15) build chains along the text ([[#hypotheses-echo]]). Layers of one kind go together; adjacency has nothing to do with it.

The two HiSparse observations the old draft leaned on, that coordinating hot caches across layers adds little and that one layer's picks are a weak hint for the next, are about picks, not bytes, and say nothing either way ([[#hypotheses-two-localities]]).

::: aside source Receipts
Same-window table and layer groupings: r24 iter-1-3 (20 windows of target 02; triple against regime 7 of 7). Layers given the rest: r9 iter-1-2, iter-1-3 (the uncorrected 0.19 for five layers apart is 0.12 once facts are counted once).
:::

::: takeaway
- Joining six layers: 0.0043, against 0.0322 for joining two heads. Adjacent layers share 0.03 to 0.08 bit given the rest.
- Layers group by kind (0, 4, 5 against 1, 2, 3), not by nearness; a dictionary shared across `v[t, l, :, :]` cherries of several layers is still unrun.
:::
