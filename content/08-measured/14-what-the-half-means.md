---
title: What the half says, and what it does not
nav: What the half says
group: In bits
lede: 'A tree compressor files about half of a punnet''s bytes under "dictionary", and the natural reading is that about half the information in a cherry is shared across the punnet. This page takes that reading seriously, shows what the dictionary share records (where the bytes were filed), and names the quantity that does measure sharing. Inside a punnet it comes to about a fifth of the bits.'
cards:
  - q: 'Compressor 121 scores 0.636 = dictionary share 0.525 + delta share 0.112. Why does the 0.525 look like a measure of shared information?'
    a: 'The score''s square drew the dictionary as the shared summary and the delta as the private remainder, so a big dictionary reads as a lot shared'
    wrong: ["Because 0.525 is close to one half", "Because the delta share is the mutual information", "Because the dictionary was trained on other sequences"]
    why: 'The square''s axes are the dictionary share and the delta share, two byte counts that sum to the score. The page shows that the dictionary share does not track information.'
    sec: the-conjecture
  - q: Moving every cherry of a tree compressor into its dictionary, so that every delta was empty, did what to the ratio?
    a: 'It moved by +0.00004'
    wrong: ["It rose by 0.44", "It fell to about 0.5", "It rose by 0.09"]
    why: A reference cherry costs the same per element inside the dictionary as outside (5.84 against 5.85 bits). The share records where the bytes were filed.
    sec: bookkeeping
  - q: The light compressor 129 has a dictionary of about 2 % of the punnet. What does that 2 % buy?
    a: 'About 0.09 of ratio, 0.686 against solo coding''s 0.778'
    wrong: ["Nothing; 2 % is too small to matter", "About 0.5 of ratio", "Exactly 0.02 of ratio"]
    why: 'A short summary (a mean and a scale per furrow and a prediction rule) carries most of what a per-punnet compressor knows. Dictionary size and information gained point in opposite directions here.'
    sec: bookkeeping
  - q: What is the punnet redundancy of a punnet of cherries?
    a: The sum of the cherries' solo entropies minus their joint entropy, per element; the most any per-punnet compressor can save over solo coding
    wrong: ["The dictionary share of the best tree compressor", "The delta share of the best tree compressor", "The entropy of the dictionary's bytes"]
    why: It is the redundancy of the punnet's elements, the mutual information among the cherries plus the fixed relations among a cherry's elements. A compressor's gain over solo is a lower bound on it; a dictionary's size says nothing about it.
    sec: what-measures-sharing
  - q: How much of a cherry's solo bits did the campaigns show to be shared across a punnet?
    a: About a fifth, between 18 % (the best verified compressor at a stretch of 4096) and 23 % (a code-length floor at 16 384)
    wrong: ["About half, as the dictionary share says", "About 2 %, as the light compressor's dictionary says", "None; the values are noise"]
    why: 'Solo is 6.22 bits per element; the tree compressor pays 5.09 (1.13 bits less) and the punnet floor is about 4.80 (1.4 bits less). Both are lower bounds on the punnet redundancy.'
    sec: what-measures-sharing
---

"About half the bits go to the dictionary, so about half the information in a cherry is shared across the punnet." That is how the human read this Part's best compressor, and it is a fair reading. Compressor 121 stores a 4096-token punnet at 0.636 of its raw size; 0.525 of the raw size is filed as [[dictionary]] and 0.112 as [[delta|deltas]] ([[#measured-reading-one-cherry]]). Per cherry, half a raw cherry's worth of bytes goes into the part the whole punnet shares. This page asks whether that half measures shared information, and if it does not, what does.

## The conjecture {#the-conjecture}

The reading comes straight from how the scenario draws its score. The square of [[#scenario-the-score]] has two axes, [[dictionary-share|dictionary share]] $\vxshare$ and [[delta-share|delta share]] $\vrho$, and it came with a story. The dictionary was a small fitted summary of what the punnet's cherries have in common (a location, a basis, a codebook), and the delta was what a cherry still had to say for itself. On that picture, a compressor that spends half its bytes on the dictionary has found a punnet whose cherries are half common property.

Information theory seems to agree. [[side-information|Side information]] that both ends hold makes a message cheaper by exactly the [[mutual-information]] between them ([[#school-mutual-information]]), and a punnet dictionary is side information for every cherry in the punnet. So it is natural to read the dictionary share as that mutual information, scaled to a raw cherry. Half the bytes shared, about half the information shared.

The instinct behind the sentence is sound, and this Part keeps it. There is a quantity of information behind the [[curve|compressibility curve]], and the [[roofline]], the lowest MDL ratio any compressor has reached on the scenario, approaches it from above. What does not survive is the number, and the reason is what a tree compressor's dictionary is made of.

::: takeaway
- The square drew the dictionary as the shared summary and the delta as the private remainder, so a 0.525 dictionary share reads as "half shared".
- Side information saves exactly the mutual information, which is why the reading sounds like information theory.
- The instinct is right (an information quantity behind the curve, which the roofline approaches from above); the number needs checking.
:::

## Where the bytes are filed {#bookkeeping}

A tree compressor's dictionary is made of cherries. Its inner nodes are [[reference-cherry|reference cherries]], whole cherries of the punnet stored once so that other cherries can be coded as differences from them ([[#measured-night-one]]). When the campaign moved every cherry of one such compressor into the dictionary, so that every stored byte was filed as dictionary and every delta was empty, the ratio moved by **+0.00004** ([[#measured-reading-one-cherry/x-stopped-mattering]]). A reference cherry costs 5.84 bits per element inside the dictionary and 5.85 outside. The share records where the bytes were filed, and filing is free.

::: figure fig-measured-share-vs-ratio rngShareVsRatio wide
**Dictionary share against ratio, for every verified point of this Part.** Horizontal axis, the dictionary share $\vxshare$: dictionary bytes per cherry in units of a raw cherry, from 0 to 1. Vertical axis, the [[mdl-ratio]] (dictionary plus deltas over raw); the right-hand axis gives the same in bits per element, $\vbpe = 8 \times$ ratio. One dot per [[verified-result|verified]] compressor on its screen (the C2 incumbents and C1's ladder), coloured by cherry shape. Annotated: the light compressor 129 at a share near 0.02 and a ratio of 0.686; the tree compressor 91 and compressor 109, the same tree with every byte filed as dictionary, at the same ratio within 0.001 on the same screen (the +0.00004 of the text is 91 against 101, an in-process test with no ledger row); 109 is the incumbent on two screens. The dashed band marks where every good tree compressor sits, 0.63 to 0.69. The readout computes the correlation between share and ratio among the tree compressors. Data: `measured-points.json`.
:::

Read across the figure. Good tree compressors sit at dictionary shares of 0.43 to 0.54, the no-tree compressor at 0.02 to 0.04, one compressor has filed everything as dictionary, and their ratios run from about 0.63 to 0.72 with no slope; the correlation the readout computes is small and changes sign with the set of compressors counted. The light compressor makes the opposite case. Its dictionary is 2 % of the punnet, a mean and a scale per [[furrow]] and a [[linear-prediction]] rule, and it buys 0.09 of ratio, 0.686 against [[solo]] coding's 0.778 ([[#measured-codebooks-and-rotations]]). The smallest dictionary on the plot carries most of what a per-punnet compressor knows; the largest holds bytes that would have been stored anyway.

::: theme side-info
The receiver's side information here is other cherries of the punnet, and its value is what it predicts. The almanac of Part II made the same point in miniature: the saving was 0.16 bit per report whatever the almanac weighed. A thick dictionary is a thick almanac.
:::

What a dictionary's size does measure is the description length of a predictor, the bytes it takes to write down the thing both ends use to predict. A predictor can be short and say a lot (a prediction rule), or long and say little (a shelf of cherries kept where the deltas can point at them). The tree's shelf is half the punnet and must sit on the GPU to serve a miss, which matters for memory ([[#app-the-napkin]]) and says nothing about how much the cherries have in common. The 2 % corner has a page of its own ([[#app-two-boring-corners]]).

::: pull
A dictionary's size is the description length of a predictor, and a description length is never a mutual information.
:::

::: takeaway
- A tree compressor's dictionary is cherries. Moving all of them in cost +0.00004; a reference cherry costs 5.84 bits inside and 5.85 outside. The share is where the bytes were filed.
- Verified points run from a 2 % dictionary to an all-dictionary punnet at ratios of 0.63 to 0.72, with no slope; the 2 % dictionary buys 0.09 of ratio.
- A dictionary's size is a description length. It can be short and say a lot, or long and say little.
:::

## What measures sharing {#what-measures-sharing}

The quantity the sentence reached for exists, and the site has the words for it. Take one [[punnet]] of $\vb$ cherries with $\vd$ elements each. Code every cherry alone and the bill is the sum of their solo entropies. Code them together, each allowed to know all the others, and the bill is their joint entropy. The gap is what the cherries tell each other: [[redundancy]] in the sense of [[#school-mutual-information]], spread over the punnet's elements.

::: define punnet-redundancy
- **What it is.** The bits per element that the cherries of a punnet share, the sum of their solo entropies minus their joint entropy, divided by the $\vb\,\vd$ elements of the punnet. Solo entropy is the site's [[solo]] rate: each element coded from its own furrow's statistics.
- **Why it matters.** It is the most any per-punnet compressor can save over solo coding, whatever its dictionary looks like. Every compressor's gain over solo is a lower bound on it.
- **Easy to confuse with** the dictionary share, which counts bytes filed under "dictionary"; and with the [[conditional-entropy]] of one cherry given one other, which is a single term where the punnet has $\vb$.
:::

$$
\text{punnet redundancy} \;=\; \frac{1}{\vb\,\vd}\Bigg(\underbrace{\sum_{\vi=1}^{\vb}\sum_{\vc=1}^{\vd} \vH(\vE_{\vi,\vc})}_{\text{every element coded from its furrow alone}} \;-\; \underbrace{\vH(\vE_{1}, \ldots, \vE_{\vb})}_{\text{the punnet coded as one thing}}\Bigg)
$$ {#eq-measured-punnet-redundancy}

::: aside reminder Mutual information and conditional entropy
$\vI(\vX;\vY) = \vH(\vX) - \vH(\vX \mid \vY)$ is the bits that knowing $\vY$ saves when describing $\vX$ ([[#school-mutual-information]]). With two cherries, each taken as one vector, [[#eq-measured-punnet-redundancy]] is their mutual information per element; coded element by element, as solo does, the gap also counts what a cherry's own elements tell each other, which the note below separates.
:::

Nobody can compute the joint entropy of 4096 cherries of 512 elements directly. What the campaigns produced are lower bounds on it, because a compressor is a predictor and a predictor's gain over solo can never exceed the redundancy that is there.

| what was measured | bits per element | saved against solo | grade |
|:--|--:|--:|:--|
| solo, six KV layers | 6.22 | | ideal, ledger landmark |
| best verified tree compressor (121, stretch 4096) | 5.09 | 1.13 (18 %) | verified |
| punnet floor (stretch 16 384) | ≈4.80 | ≈1.4 (23 %) | [[code-length-estimate]], 4 punnets |

So the punnet redundancy of these values is at least 1.13 bits per element and probably about 1.4, out of 6.22. About a fifth of the bits, where the sentence said half. The deeper point the sentence reached for stands: the quantity is real, the compressors are climbing towards it, and the roofline of [[#scenario-the-score]] is the lowest MDL ratio their attempts have reached.

::: note warning What "shared" counts here
Solo codes each element from its own furrow's histogram, so the gap between solo and a punnet compressor also holds the fixed relations among a cherry's elements, which a per-punnet [[linear-prediction]] rule learns and the LLM's weights own ([[#measured-where-the-bits-come-from]]). This Part measured the split ([[#measured-two-kinds-of-structure]]): the [[reference-tree]] saves 0.064 to 0.142 of ratio, prediction 0.055 to 0.095, overlap 0.024 to 0.042. Strictly between cherries, the shared part is 0.5 to 1.1 bit per element by KV layer; counted as what a punnet lets a compressor save, it is a fifth.
:::

::: theme bits-unit
Punnet redundancy is in bits per element, so it converts to bytes on the link through $\vrho \approx \vbpe/8$: a fifth of 6.22 bits is about 1.2 bits per element, 0.16 of a raw cherry. The dictionary share is also in bits, which is why it looked like information; the unit alone does not make a byte count a measure of sharing.
:::

::: aside source Receipts
- Coder 121 at 0.63639 = 0.525 + 0.112: env-t0096 ([[#measured-reading-one-cherry]]; Part XI spec §1.5, §1.9). Every delta empty for +0.00004 and 5.84 against 5.85 bits: r6 iter-2-2 (12 blocks, in process; the ledger's dictionary share is bytes over raw, so a coder with empty deltas sits at a share equal to its ratio). Coder 109 with every byte in the dictionary: r6-t0004, env-t0009. Good tree coders at 0.43–0.54: spec §1.9.
- Light coder 129 at 0.6863 with a dictionary share of 0.021: r25-t0003 ([[#measured-codebooks-and-rotations]]; spec §1.7). Solo 0.778 (6.22 bits): the `solo_ratio` landmark of the `s-*-b4k` screens ([[#measured-night-one]]; spec §1.3).
- Block floor ≈0.60 at 16,384 tokens: r9 iter-1-6 and r23 iter-1-3, exact model on 4 blocks ([[#measured-where-the-bits-come-from]]; spec §1.10). Tree and prediction gains and their overlap: r11 iter-1-2 ([[#measured-two-kinds-of-structure]]; spec §1.5).
- The scatter: every verified point of `figures/data/measured-points.json`, as extracted from the ledgers by `analysis/measured_extract.py`.
:::

::: takeaway
- Punnet redundancy is the sum of the cherries' solo entropies minus their joint entropy, per element: the most any per-punnet compressor can save over solo.
- The campaigns measured lower bounds on it: 1.13 bits (18 %) from a verified compressor, about 1.4 bits (23 %) from a code-length floor. About a fifth of the bits, inside a punnet.
- The conjecture's instinct was right. There is an information quantity behind the curve, and the roofline, the lowest MDL ratio reached, approaches it from above.
:::
