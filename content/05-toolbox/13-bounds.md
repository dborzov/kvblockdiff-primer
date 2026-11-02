---
title: Bounds before building
nav: Bounds before building
group: Before building
lede: Two numbers decide whether a stage is worth writing, the gain a spectrum allows and the tax an index cannot avoid, and both follow from a covariance and a count in an hour, before any compressor exists. Below them sits a floor no stage can cross. The harness then confirms instead of discovering.
cards:
  - q: What is a code-length estimate?
    a: The code length a probability table would reach, computed exactly on the data without building the compressor; a lead, not a result
    wrong: ["A verified score from a separate decoder process", "The mean of a screen's punnets", "A compressor whose encoder rounds its weights exactly"]
    why: The campaigns' grades run from bound and code-length estimate, through quick, to verified. Only the last rebuilds every cherry in a separate process with its reads counted.
    sec: spectrum
  - q: In the memory table, what did the intact LLM pay per value, and what did it pay with far attention cut and the linear-attention state reset?
    a: 1.35 bits intact; 5.16 bits with both removed, about what a real compressor with no LLM pays (5.13)
    wrong: ["1.35 bits in both cases", "5.16 intact and 1.35 with memory removed", "8 bits in both cases"]
    why: What a punnet's dictionary can hold is roughly what the LLM knows from the last few thousand tokens; the rest of the value's bits are decided by memory the punnet does not contain.
    sec: floor
  - q: When can vector quantization beat the rate–distortion bound computed for Gaussian data?
    a: When the data is genuinely clustered, which a Gaussian table cannot describe
    wrong: ["When the codebook is large enough", "When product quantization is used", "Never, under any data"]
    why: The bound is a statement about Gaussian data. With 32 real clusters, VQ netted +1.45 bits where a rotation got +0.68; on the Bench, clusters existed only in a minority of cherries.
    sec: plan
---

In 1824 Sadi Carnot worked out the best efficiency *any* heat engine could reach, from nothing but two temperatures. After that an engineer did not build a steam engine to find out whether 90 % was possible. They checked the limit first.

Lossless coding has limits of the same kind, and they are cheap to compute. This page collects the ones the toolbox uses, the grade each kind of number carries, and the floor the campaigns measured under all of them.

## A spectrum in, a number out {#spectrum}

::: aside reminder The transform coding gain (II.16)
Rotating data to its [[klt|KLT]] axes makes the coordinates uncorrelated; their [[variance|variances]] are the [[eigenvalue|eigenvalues]] $\vlambda$. For bell-shaped data the bits a rotation saves are ½ log₂ of the eigenvalues' arithmetic mean over their geometric mean ([[#school-coding-gain]], [[#toolbox-klt]]).
:::

$$
\underbrace{\tfrac12 \log_2 \frac{\mathrm{AM}(\vlambda)}{\mathrm{GM}(\vlambda)}}_{\text{bits per element any rotation can save}}
\;=\; -\tfrac12 \cdot \underbrace{\text{average of } \log_2 \vlambda}_{\text{after standardising, so } \mathrm{AM} = 1}
$$ {#eq-toolbox-klt-bound}

Three steps, no compressor: [[standardize|standardise]] each furrow of a punnet, compute the [[covariance-matrix]], take its eigenvalues. The index tax gets its own one-liner from [[rate-distortion]] theory: on Gaussian data, naming one of $\vC$ centroids costs $\log_2 \vC / \vd$ bits per element and can save at most that beyond a rotation ([[#toolbox-vq]]). Product quantization does not escape; clustered data does.

::: figure fig-toolbox-bounds-spectrum mbBoundsSpectrum
**From a spectrum to a bound.** *Left:* the 64 eigenvalues of a standardised covariance (log scale; their average is 1), largest first: the chosen number of strong directions share the chosen fraction of the total variance equally, the remaining directions share the rest. *Right:* the KLT gain ½ log₂(AM/GM) in bits per element as that fraction varies, for the current number of strong directions; the dot is the current spectrum. The two dashed lines are the first plan's "trouble" and "pulse" thresholds. The buttons load two worked spectra and a flat one. Gaussian data assumed.
:::

::: try
1. Load *example A* (8 directions at 10, 56 at 1): 0.34 bit.
2. Load *example B* (8 at 50, 56 at 0.1): 2.43 bits. Most of the variance in a few directions *and* almost nothing elsewhere.
3. Keep 8 strong directions and slide their share: 0.23 bit at 50 %, 0.76 at 80 %, 1.62 at 95 %.
:::

Numbers like these come in grades, and the site names the grade of every number it quotes.

::: define code-length-estimate
- **What it is.** The code length a probability table *would* reach, computed exactly on the data (the probabilities a compressor would assign, summed as bits) without building the compressor. The campaigns' `exact model` numbers.
- **Example.** "A fixed rotation loses 0.28 to 0.32 bit per element" is a code-length estimate: two heads, one curve per quantisation step, no trial ([[#toolbox-klt]]).
- **Easy to confuse with** a [[verified-result]], where every cherry was rebuilt bit for bit by a separate process with its reads counted. The ladder of grades runs: a **bound** (a formula over a spectrum or a variance), a **code-length estimate** (a table priced on the data), a **quick** trial (a real encoder's bytes, bit-exact in process, reads uncounted), a **verified** result ([[#scenario-the-harness]]).
:::

::: takeaway
- The most any rotation can save is read off the eigenvalues; a codebook's index tax is at least what its centroid saves beyond a rotation, on Gaussian data.
- Every number carries a grade: bound, code-length estimate, quick, verified.
:::

## The noise floor {#floor}

Below every bound there is the share of a value that no predictor the dictionary can hold will ever explain, and a lossless compressor pays for all of it. On the Bench the campaigns measured where that floor is and what sets it, with the LLM itself as the predictor ([[#measured-where-the-bits-come-from]]).

Values are an exact function of the text and the weights, `v = W · h` per layer with `h` the token's [[hidden-state]]. Replaying the LLM with the capture's own code and GPU reproduced 50 331 648 value bytes exactly; with the text costing about 2.6 bits per token, the ratio could in principle be 0.0001. Any other arithmetic path changed the rounding in about 28 % of FP8 cells, and telling which cell costs 1.2 to 1.4 bits per value (a ratio of 0.15 to 0.17): the arithmetic noise floor, between two programs that disagree about rounding. Then the LLM was blinded one way at a time, on one 2048-token window, and the bits it could no longer predict were counted with a grid-aware table:

::: figure fig-toolbox-memory msrMemory
**The memory table.** Horizontal bars, in bits per stored FP8 value, show what the LLM's own prediction leaves for one 2048-token window of sequence 0 (tokens 40 960 to 43 008) as it is blinded one way at a time; the last bar is compressor 102's real MDL ratio on 12 punnets of 4096 tokens at the same position, times 8. The LLM rows are code-length estimates: a logistic curve centred on the LLM's value, integrated over the FP8 cell, with one scale per furrow fitted on the window. Hover a bar for its per-layer values. One window, one sequence, one torch build.
:::

| what the LLM may use | bits per value |
|---|---:|
| everything (intact) | 1.35 |
| attention cut beyond the last 16 384 tokens | 3.49 |
| beyond the last 2 048 | 4.22 |
| beyond the last 256 | 4.76 |
| the linear-attention state reset as well | 5.16 |
| compressor 102, no LLM at all, 12 punnets | 5.13 |

Read the last two rows together. A real compressor working inside a punnet lands where the LLM lands once it may not remember beyond the punnet. What a punnet's dictionary can hold is roughly what the LLM knows from the last few thousand tokens; the rest of a value's bits are set by memory the punnet does not contain. The estimate of the floor inside a punnet is about 0.60 at 16 384 tokens and about 0.57 for a whole sequence, as a direction rather than a measurement (one window; the "removal" masks only the final 2048 tokens' attention; per layer the match is within about one bit).

::: theme noise-floor
Here the floor is measured rather than assumed: about 5.1 bits per value stay once the LLM's long memory is taken away, and a compressor that may know only the punnet cannot go below what the punnet knows.
:::

::: takeaway
- The LLM intact leaves 1.35 bits per value; blinded to everything beyond the punnet it leaves about 5.2, where a real punnet-scope compressor sits (5.13).
- Inside a punnet the floor is near 0.60 of raw; below it, what the decoder may know decides, and that is a ruling, not a stage.
:::

## Bounds first, then the harness {#plan}

The habit this page recommends was used twice on the Bench, and the second time it was overruled. Before building any rotation, the campaign priced the DCT, the Hadamard and a random rotation as code-length estimates and found them 0.28 to 0.32 bit per element *worse* than prediction without rotation, so no lifted rotation was ever written ([[#toolbox-lifting]]). For codebooks it first computed bounds too; then the human ruled that in that branch a bound is only a lead and a real compressor answers, and the whole family was built: RQ saved 0.0029 of ratio on prediction alone, verified, and nothing once a reference tree was present ([[#measured-codebooks-and-rotations]]). The bounds had said as much; the receipts said it louder. The dress rehearsal of [[#toolbox-rehearsal]] shows the same habit on synthetic data, where a codebook needed punnets of 8K cherries to pay for itself and the KLT bound flagged about half a bit of room before any rotation was coded. What bounds cannot see is the one thing that most helped on the Bench: a real earlier copy of the same token, which no Gaussian spectrum describes ([[#toolbox-reference-cherries]]).

::: aside source Receipts
Replay and arithmetic floor: r23 (50 331 648 bytes exact; 28 % of cells, 1.2–1.4 bits). Memory table: r23 iter-1-3 and journal SESSION-001 18:31 (one window of sequence 0000 of target 03, tokens 40960–43008); compressor 102 at the same position: 12 blocks, spec §1.10. Floors 0.60 / 0.57: spec §1.10. Rotations: r11 iter-1-1. Codebooks: r26-t0011, r26-t0010; the human's ruling on bounds: `notes/03-structure-and-method.md` §3.
:::

::: takeaway
- An hour of spectra and variances decides how carefully the exact ladder must be run; the harness then confirms.
- Bounds miss clustered data and repeated text; a real compressor is the answer where the data might be either.
:::
