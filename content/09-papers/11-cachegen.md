---
title: CacheGen (2024)
nav: CacheGen
group: Lossy KV compression
lede: Ship a long context's orchard over the network instead of recomputing it, as differences from a reference token, rounded and arithmetic-coded. Lossy, but its starting observation is the closest thing in print to a measurement of fallen-apple similarity.
cards:
  - q: In CacheGen, what is each non-reference token stored as?
    a: Its difference from the first token of its stretch of 10, same layer and furrow
    wrong: ["Its difference from the immediately preceding token", "Its difference from the layer below", "Its index in a codebook"]
    why: Referencing one shared token lets all nine differences be computed and decoded in parallel. The first draft said "adjacent-token deltas"; that was not quite right.
    sec: idea
  - q: What does CacheGen's first insight take as known?
    a: That within one layer and one furrow, nearby tokens have similar values
    wrong: ["That the orchard repeats byte strings", "That keys are harder than values", "That the LLM tolerates any rounding"]
    why: Fallen-apple similarity, stated as a fact and measured as a variance ratio. It is the premise of the differencing step.
    sec: assume
  - q: Subtracting a neighbour that carries its own independent noise does what to the noise variance?
    a: Doubles it
    wrong: ["Halves it", "Leaves it unchanged", "Removes it"]
    why: The difference of two numbers with independent noise of variance σ² has noise variance 2σ². Differencing pays off only when slow drift dominates the fast noise.
    sec: show
  - q: If the differences' 2.4× smaller variance is measured against each furrow's own typical value, at least how much of a furrow's variance must be slow drift?
    a: About 79 %
    wrong: ["About 24 %", "About 50 %", "About 99 %"]
    why: The difference keeps at least twice the noise, so 2(1−f) ≤ 1/2.4, which gives f ≥ 0.79.
    sec: show
  - q: What did the campaigns measure about the token-distance prediction CacheGen relies on?
    a: Weak except in the middle layers; references pointed at far repeats of the same token, and joining two adjacent tokens into one cherry made the ratio worse by 0.037
    wrong: ["A variance ratio of 2.4× at every layer", "Nothing; the token axis was never tried", "That adjacent tokens are the best reference everywhere"]
    why: On the Bench, repetition mattered and distance mostly did not. CacheGen's premise holds, if at all, in the middle layers.
    sec: ours
  - q: CacheGen's "group of 10 tokens with an anchor" has the shape of which objects on this site?
    a: A stretch of 10 whose dictionary is one reference cherry, weight 1
    wrong: ["A hot cache of 10 slots", "A victim tier", "A global codebook"]
    why: Every token is rebuilt from the reference plus its own difference. Then the arithmetic coding turns each run of tokens into a stream, which breaks the cold decode.
    sec: words
---

A chatbot is asked about a 100-page contract it has seen before. Its orchard for those pages exists already, on a storage server. Fetching it over the network beats recomputing it, if the network is fast enough. CacheGen's job is to make the orchard small enough to fetch. Here is one [[furrow]] of a toy orchard, `v[0:10, layer_id, head_id, elem_id]`, for the ten tokens of one group:

| token | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| value | 2.31 | 2.45 | 2.38 | 2.52 | 2.60 | 2.49 | 2.66 | 2.71 | 2.63 | 2.80 |
| minus token 0 | 0 | 0.14 | 0.07 | 0.21 | 0.29 | 0.18 | 0.35 | 0.40 | 0.32 | 0.49 |
| minus the token before | — | 0.14 | −0.07 | 0.14 | 0.08 | −0.11 | 0.17 | 0.05 | −0.08 | 0.17 |

Notice anything? The values creep upward. Differences from the token just before stay small. Differences from token 0 grow with distance, but stay smaller than the values themselves. CacheGen's starting point is exactly this: within one layer and one furrow, nearby tokens have similar values.

## The idea, by example {#idea}

CacheGen ([[lossy]]) lives on the network-fetch road of [[#papers-reading-guide/data-path]] and encodes an orchard in four moves.

1. **References and differences.** The tokens are cut into groups of 10. The first token of each group, the paper's *anchor*, is stored on its own. Every other token is stored as its difference from it, same [[layer]], same furrow, at token distances $\vgap$ from 1 to 9. Because every difference refers to the same token, all nine can be computed and decoded in parallel. In our words: a [[stretch]] of 10 whose [[dictionary]] is one [[reference-cherry]], of [[weight]] $\vw = 1$ ([[#toolbox-reference-cherries]]).
2. **Round the differences**, more coarsely in some layers than in others: layers differ in how much rounding the LLM tolerates.
3. **Arithmetic-code** the rounded numbers, with a separate probability table for every (layer, furrow) pair. CacheGen observed that grouping numbers by furrow and layer lowers their entropy much more than grouping them by token position. In our words these are per-furrow histograms, the [[solo]] family's tables ([[#toolbox-solo]]).
4. **Adapt to the network.** The context is cut into runs of tokens, each encoded at several quality levels; for each run the sender picks the level that fits the bandwidth, or sends the text to be recomputed.

::: takeaway
- CacheGen stores a reference token per stretch of 10 plus differences from it (not from the previous token), rounds them, and arithmetic-codes them per (layer, furrow).
- Its first observation, nearby tokens are alike within a furrow, is fallen-apple similarity, measured as variance.
:::

## What they assume {#assume}

1. **Nearby tokens are alike within a furrow.** The paper's first insight, presented as an observation about the orchards of its LLMs and the premise of the differencing step. This is [[#hypotheses-fallen-apple]], assumed and then measured as a variance ratio.
2. **Furrow histograms differ, token histograms do not.** Grouping by (layer, furrow) lowers entropy more than grouping by position: the per-furrow table is the right unit of side information. Reliable, and the same reason per-furrow tables are the solo baseline.
3. **Layers differ in sensitivity.** Some tolerate coarser rounding than others.
4. **The road is a network fetch** of a whole context, with a bandwidth that varies.

::: takeaway
- Reliable: per-furrow histograms are the unit.
- Assumed: fallen-apple similarity, measured only as a variance ratio.
:::

## What they show {#show}

| their measurement | value | where | verifiable? |
|---|---|---|---|
| differences vs values | variance of the differences 2.4–2.9× lower than that of the original values | the paper's first insight, via search excerpts | a count, but its baseline is unclear |
| orchard size | 3.5–4.3× smaller than recent orchard-reuse systems that use rounding | abstract | their comparison |
| delay | 3.2–3.7× less time to fetch and process the context | abstract | their rig |
| group size | 10 tokens per reference | paper, via search excerpts | a design fact |

The 2.4–2.9× sounds like [[fallen-apple]] similarity measured at last. In bits, if the differences were bell-shaped, it would be worth $\tfrac12\log_2 2.4 \approx 0.63$ to $\tfrac12\log_2 2.9 \approx 0.77$ bits per element. But "lower than the original values" hides the question that decides everything: lower than the values measured how? If the variance of the originals is pooled over all furrows, much of it is furrows sitting at different levels, which a per-furrow table prices in without looking at any neighbour. If it is each furrow's spread around its own typical value, the ratio is real evidence, and it says something strong about drift, because a difference carries the noise of *both* tokens:

$$
\underbrace{\vsigma^2_{\text{diff}}}_{\text{difference to a neighbour}} \;\geq\; 2\,\underbrace{\vsigma^2_{\text{fast}}}_{\text{token-to-token noise}}
\quad\Rightarrow\quad
\text{ratio of } 2.4 \text{ needs } \frac{\vsigma^2_{\text{fast}}}{\vsigma^2} \leq \frac{1}{2 \times 2.4} \approx 21\,\%
$$ {#eq-papers-cachegen-bound}

So at least 79 % of each furrow's variance (83 % for 2.9×) would have to be slow drift.

::: figure fig-papers-cachegen-delta pbCachegenDelta
**One furrow of a toy orchard, and three ways to predict it.** Top: 60 tokens of one furrow (lapis), made of a slow random drift plus independent token-to-token noise around a typical value of 2 (dashed line). Dotted lines mark stretches of 10; vermilion dots are the reference tokens. Bottom: the variance of three residuals as a share of the furrow's own variance: around the typical value (what per-furrow statistics leave), minus the previous token, and minus the stretch's reference (CacheGen), averaged over distances 1 to 9. The bars are exact for this toy of drift plus noise; the top series is one seeded sample of it. The slider sets the share of the variance that is slow drift; the buttons set how slowly the drift moves (its correlation time in tokens). The readout converts the variances into bits per element with $\tfrac12\log_2$ of the ratio, as for bell-shaped residuals.
:::

::: try
1. Drift 85 %, 100 tokens: the reference residual keeps 0.38 of the variance, a ratio of 2.6×, inside CacheGen's range.
2. Lower the drift share to 50 %. Both differences now cost *more* than the distance to the typical value: subtracting a noisy neighbour doubles its noise.
3. Drift 85 % but moving fast (10 tokens): the reference drifts away from later tokens of its stretch, and the previous token wins.
:::

Where it is hard to check: the baseline of the 2.4–2.9× (pooled or per furrow, 16-bit or rounded); no shuffle control; and the 3.5–4.3× mixes differences, layer-wise rounding and arithmetic coding against other lossy systems, with no ablation we could find that isolates what the differences alone buy.

::: takeaway
- Per furrow, a difference to a neighbour beats the furrow's typical value only if slow drift dominates the fast noise.
- If CacheGen's ratio is per furrow, 79–83 % of the variance would be slow drift: strong, checkable, and not checked at 8 bits by them.
:::

## What it says about our scenario {#ours}

**Builds on.**
- The sibling stage and the reference tree ([[#toolbox-reference-cherries]]): a token predicted from another token of the same punnet is exactly CacheGen's difference, and the campaigns' best compressors are built on it. The noise-doubling rule above is the reason a reference must be a true twin to pay.
- Per-furrow tables as the baseline ([[#toolbox-solo]]): CacheGen's (layer, furrow) tables are solo's tables.
- The stretch as a knob ([[#scenario-stretch]]): CacheGen's stretch is 10 with a dictionary of weight 1; the campaigns' is 4096 with a dictionary of about half the punnet.

**Conflicts with.** The premise, on the Bench's values. The campaigns found [[fallen-apple]] similarity weak except in the middle layers: the adjacent token carries 0.058 bit per element of mutual information at KV layer 0 and 0.31 at layers 1 and 2; joining two adjacent tokens into one cherry cost +0.037 of ratio, four tokens +0.063; and where reference trees pointed, the parent was within 8 tokens for 37–47 % of cherries in the middle layers but only 7–12 % elsewhere, where references were far repeats of the same token ([[#hypotheses-fallen-apple]], [[#hypotheses-echo]], [[#measured-time-and-bits]]). We believe the campaigns: exact bits on an 8-bit grid, same-window comparisons, a shuffle control, against a variance ratio with an unknown baseline. The two can both hold if CacheGen's LLMs or texts drift more, or if its ratio is pooled over furrows. CacheGen's layer-dependence (some layers tolerate coarser rounding) is consistent with the campaigns' finding that the token axis matters in the middle layers only.

**Suggests.**
- The shuffle control on CacheGen's own statistic: the same variance ratio with tokens shuffled across texts ([[#scenario-the-harness]]).
- A curve of bits saved over $\vgap$, per layer, on the Bench, with the reference tree's far repeats as the comparison ([[#plan-next-in-the-harness]]). CacheGen's 10-token stretch would be the right scenario for the middle layers only.
- For the application: a reference token per short stretch is a dictionary of weight 1 that fits any [[leash]]. Its arithmetic coding does not: a run of tokens strung into one stream must be decoded from its start ([[#app-data-layout]]).

::: theme controls
CacheGen's insight is one shuffle away from a measurement. If the 2.4× survives shuffling tokens across texts, it was never about neighbours; the harness runs that control on every gain.
:::

::: takeaway
- Builds on: references and siblings, per-furrow tables, the stretch as a knob.
- Conflicts with: fallen-apple similarity measured weak on the Bench outside the middle layers; we believe the exact bits.
- Suggests: the shuffle control, and the curve over $\vgap$ per layer.
:::

## Their words, ours {#words}

| their word | ours | where the meanings differ |
|---|---|---|
| anchor token | the [[reference-cherry]] of a stretch of 10 | "the Anchor" is the nickname of per-furrow statistics on this site, so we never say anchor for a reference |
| group (of 10 tokens) | a [[stretch]] of 10 | with a dictionary of weight 1 |
| delta (from the anchor) | the difference from the reference; our [[delta]] is the bytes sent after any prediction | theirs is a quantity; ours is a byte string |
| channel | [[furrow]] | one element position along the tokens |
| per-(layer, channel) arithmetic coding | per-furrow tables with an [[entropy-coder]], the [[solo]] family's tables | — |
| chunk | a run of tokens encoded as one stream | breaks the cold decode |
| KV cache, KV features | the [[orchard]] | — |
| quantization levels | rounding, layer by layer | lossy; ours rounds nothing |

::: aside source Receipts
Yuhan Liu, Junchen Jiang and twelve co-authors (University of Chicago, Microsoft, Stanford), *CacheGen: KV Cache Compression and Streaming for Fast Large Language Model Serving*, SIGCOMM 2024, arXiv:2310.07240. Variance ratio (2.4–2.9×) and group size (10): the paper's first insight and design, via search excerpts; the baseline of the ratio could not be read. Size (3.5–4.3×) and delay (3.2–3.7×): abstract. The toy furrow and the figure are ours. The campaigns' numbers: `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1.4 (adjacent-token MI 0.058 at L3, 0.31 at L7/L11), §1.6 (tok2 +0.037, tok4 +0.063), §1.8 (parents within 8 tokens: 37 / 47 / 39 % at L7 / L11 / L15 vs 9 / 7 / 12 % at L3 / L19 / L23).
:::
