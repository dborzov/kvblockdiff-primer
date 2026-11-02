---
title: 'School’s out: a cheat sheet'
nav: Cheat sheet
group: Recap
lede: Every idea of this Part on one page, each in one line, with the places later on the site where it does real work. Then the whole course as one map, and an invitation to practise.
cards:
  - q: Which three moves recur through the whole primer?
    a: Predict then send the residual; use side information both ends already have; pay fixed costs once and share them
    wrong: ["Sort, search and merge", "Train, validate and test", "Quantize, prune and distil"]
    why: Residuals, codebooks and rotations are ways of predicting; dictionaries, almanacs and codebooks are side information; every one of them is a fixed cost to amortize.
    sec: sheet
  - q: 'Which of these is **not** measured in bits on this site?'
    a: Reuse distance
    wrong: ["Mutual information", "Transform coding gain", "Index tax"]
    why: Reuse distance counts distinct items between two asks for the same item. It describes which items are wanted, not what is inside them.
    sec: sheet
  - q: 'In Part III, what does the stack of readings `R` of II.13 become, and what does a furrow become?'
    a: 'The orchard `v` of shape `(n_tokens, n_kv_layers, n_kv_heads, head_dim)`; a furrow becomes `v[:, layer_id, head_id, elem_id]`'
    wrong: ["A list of tokens; a furrow becomes one token", "The dictionary; a furrow becomes one delta", "The hot cache; a furrow becomes one slot"]
    why: 'Same idea, two more axes: one element position followed along the token axis, with a layer and a head fixed.'
    sec: sheet
  - q: What links the exchange rate of II.12 to the KLT of II.15?
    a: 'Both convert explained variance into bits with the same Gaussian rule: for two thermometers they give the same 2.95 bits'
    wrong: ["Nothing; one is about prediction, the other about rotation", "The KLT is only defined when R² is below 0.5", "The exchange rate is the KLT applied to one furrow"]
    why: Bits ≈ ½ log₂ variance + constant. Prediction shrinks one variance; rotation reshuffles variances so their product shrinks. Same currency.
    sec: map
  - q: 'In the toy world, what do the desk, the lift and the archive become in Part III?'
    a: HBM next to the GPU, the PCIe link, and host DRAM
    wrong: ["The CPU, the radio and the disk", "The LLM, the tokens and the prompt", "The codebook, the index and the residual"]
    why: 'Small and fast, the link, big and slow: about a hundred times apart in speed.'
    sec: map
---

That was the whole course: twenty-three small pages, from a single yes/no answer to the wire between a GPU and its host. Nothing on the rest of the site uses an idea that is not on this page or defined where it is first used.

## The cheat sheet {#sheet}

One line per page, and where each idea does its real work later. Hover a link for the full page name.

| page | the idea in one line | used later in |
|---|---|---|
| [[#school-bits]] | A [[bit]] is one yes/no answer; $n$ bits tell $2^n$ things apart. | everywhere; [[#toolbox-the-bill\|V.1 the bill]] |
| [[#school-surprise]] | Rare outcomes carry more bits: [[surprisal]] $= -\log_2 \vp$. | [[#toolbox-the-bill\|V.1]] |
| [[#school-entropy]] | [[entropy\|Entropy]] is the average surprise, the floor for any lossless code. | [[#toolbox-the-bill\|V.1]], [[#toolbox-solo\|V.2 solo]] |
| [[#school-side-information]] | What the receiver already knows makes messages cheaper. | [[#scenario-the-contract\|IV.7 the contract]], [[#scenario-scope\|IV.10 scope]] |
| [[#school-mutual-information]] | The bits saved by knowing something: $\vH(\vX) - \vH(\vX \mid \vY)$. | [[#hypotheses-bits-are-the-unit\|VII.1]], [[#measured-shared-across-the-stretch\|VIII.15]] |
| [[#school-codes]] | Prefix codes; Huffman gives each symbol about its surprisal in whole bits. | [[#papers-kvcomp\|IX.12 KVComp]] |
| [[#school-arithmetic]] | Arithmetic coding and rANS reach fractions of a bit; a wrong probability table costs cross-entropy. | [[#toolbox-two-rates\|V.11 two rates]] |
| [[#school-fixed-length]] | Fixed-length codes with escapes: fast, parallel, random access, a few bits dearer. | [[#papers-splitzip\|IX.4 SplitZip]], [[#toolbox-two-rates\|V.11]] |
| [[#school-prediction]] | Predict, then send only the exact residual. | [[#toolbox-the-bill\|V.1]], [[#toolbox-reference-cherries\|V.6 reference cherries]] |
| [[#school-residual-shapes]] | A bell-shaped residual costs about $\log_2 \vsigma$ + constant bits: halve $\vsigma$, save a bit. | [[#toolbox-two-rates\|V.11]], [[#toolbox-bounds\|V.13 bounds]] |
| [[#school-exchange-rate]] | Explaining a share $\vRsq$ of the variance saves $\tfrac12\log_2 \frac{1}{1-\vRsq}$ bits: 75 % → 1 bit, 94 % → 2. | [[#toolbox-exchange-rate\|V.12]], [[#hypotheses-the-trap\|VII.11 the trap]] |
| [[#school-vectors]] | A [[vector]] is a row of $\vd$ [[element\|elements]]; a [[furrow]] is one `elem_id` across many vectors, a column `R[:, elem_id]`. | [[#landscape-orchard\|III.3 the orchard]], [[#toolbox-furrow-statistics\|V.3 furrow statistics]] |
| [[#school-correlation]] | Covariance: the average signed rectangle. `np.cov(R.T)` holds every pair of furrows. | [[#toolbox-klt\|V.4]], [[#hypotheses-stereo\|VII.5 stereo]] |
| [[#school-rotation]] | The [[klt\|KLT]] turns the axes to the data's own directions; coordinates become uncorrelated. | [[#toolbox-klt\|V.4]], [[#papers-kvtc\|IX.9 KVTC]] |
| [[#school-coding-gain]] | A rotation saves $\tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$ per element; only sharp low rank pays; lifting makes it lossless. | [[#toolbox-klt\|V.4]], [[#toolbox-lifting\|V.9 lifting]] |
| [[#school-clusters]] | [[vq\|VQ]]: name the nearest centroid, send the residual; the index costs $\log_2 \vC$ bits. | [[#toolbox-vq\|V.5]] |
| [[#school-vq-vs-klt]] | On bell-shaped data a codebook cannot beat a rotation; only clusters let it win. | [[#toolbox-vq\|V.5]], [[#toolbox-bounds\|V.13]], [[#measured-codebooks-and-rotations\|VIII.7]] |
| [[#school-integers-floats]] | INT8 is an even grid; floats are logarithmic; BF16's low mantissa bits are noise. | [[#papers-float-coders\|IX.5]], [[#toolbox-bit-fields\|V.10 bit fields]] | <!-- old-words -->
| [[#school-fp8]] | FP8 E4M3: 253 values up to 448. In index space, 0.1 and −0.1 are 58 steps apart. | [[#toolbox-bit-fields\|V.10]], [[#reference-fp8-facts\|XI.6]] |
| [[#school-caches]] | A cache keeps a few items close; LRU evicts the least recently used. | [[#landscape-hisparse\|III.7 HiSparse]], [[#landscape-toy-trace\|III.8]] |
| [[#school-reuse-distance]] | Reuse distance $\ge \vB$ means an LRU miss; one histogram gives $\vm(\vB)$ for every size; Bélády bounds all policies. | [[#landscape-reuse-curve\|III.10]], [[#hypotheses-stack-distance\|VII.13]] |
| [[#school-wires]] | Bandwidth vs latency; HBM is about 100× faster to reach than host DRAM over PCIe. | [[#landscape-memory-wall\|III.6]], [[#landscape-reference-settings\|III.11]] |
| [[#school-amortization]] | A fixed cost per item is fixed ÷ items; a dictionary costs $8\vw/\vb$ bits per number. | [[#scenario-scope\|IV.10 scope]], [[#app-the-napkin\|VI.9 the napkin]] |

::: theme side-info
Look down the middle column and the same move keeps coming back: something both ends agree on in advance, the order of a vector's elements, a table of furrow means, a rotation, a codebook, a grid, makes every later message shorter. That is side information, and the rest of the site is about which side information is worth keeping where.
:::

::: takeaway
- Information: bits, surprise, entropy, side information, mutual information.
- Coding: codes, entropy coders, fixed-length codes, prediction and residuals, the exchange rate.
- Vectors: elements and furrows, correlation, rotations (KLT) and codebooks (VQ), and when each one wins.
- Numbers and machines: even and logarithmic grids, index space, caches, reuse distance, wires, amortization.
:::

## The map, filled in {#map}

The map from the first page of this Part, now with every page on it and the links between families that the pages uncovered. Hover a card to light up its connections; click it to revisit the page.

```graph
id: school-recap-map
columns: [Information, Coding, "Statistics & vectors", Number formats, Machines]
nodes:
  - {id: bits, col: 1, row: 1, title: "Bits", text: "One yes/no answer.", link: school-bits, term: bit}
  - {id: surprise, col: 1, row: 2, title: "Surprise", text: "−log₂ p bits.", link: school-surprise, term: surprisal}
  - {id: entropy, col: 1, row: 3, title: "Entropy", text: "Average surprise; the floor.", link: school-entropy, term: entropy}
  - {id: side, col: 1, row: 4, title: "Side information", text: "What both ends already know.", link: school-side-information, term: side-information}
  - {id: mi, col: 1, row: 5, title: "Mutual information", text: "Bits saved by knowing.", link: school-mutual-information, term: mutual-information}
  - {id: codes, col: 2, row: 1, title: "Codes & Huffman", text: "Whole bits per symbol.", link: school-codes, term: huffman}
  - {id: arith, col: 2, row: 2, title: "Arithmetic & rANS", text: "Fractions of a bit.", link: school-arithmetic, term: entropy-coder}
  - {id: fixed, col: 2, row: 3, title: "Fixed-length & escapes", text: "Fast, random access.", link: school-fixed-length, term: fixed-length-code}
  - {id: pred, col: 2, row: 4, title: "Predict, then correct", text: "Send the residual.", link: school-prediction, term: predictive-coding}
  - {id: amort, col: 2, row: 5, title: "Amortization", text: "Fixed cost ÷ items.", link: school-amortization, term: amortization}
  - {id: shapes, col: 3, row: 1, title: "Residual shapes", text: "Halve σ, save a bit.", link: school-residual-shapes, term: gaussian}
  - {id: rate, col: 3, row: 2, title: "Exchange rate", text: "R² → bits.", link: school-exchange-rate, term: r-squared}
  - {id: vectors, col: 3, row: 3, title: "Vectors & furrows", text: "Rows, elements, columns.", link: school-vectors, term: furrow}
  - {id: corr, col: 3, row: 4, title: "Correlation", text: "Furrows moving together.", link: school-correlation, term: covariance}
  - {id: klt, col: 3, row: 5, title: "KLT", text: "Turn to the data's axes.", link: school-rotation, term: klt}
  - {id: gain, col: 3, row: 6, title: "Coding gain & lifting", text: "½ log₂ AM/GM, exactly.", link: school-coding-gain, term: transform-coding-gain}
  - {id: vq, col: 3, row: 7, title: "VQ & the index tax", text: "Nearest centroid + residual.", link: school-clusters, term: vq}
  - {id: vqklt, col: 3, row: 8, title: "VQ versus KLT", text: "Clusters vs bells.", link: school-vq-vs-klt, term: rate-distortion}
  - {id: ints, col: 4, row: 1, title: "Integers & floats", text: "Even vs logarithmic grids.", link: school-integers-floats, term: floating-point}
  - {id: fp8, col: 4, row: 2, title: "FP8 & index space", text: "Residuals in grid steps.", link: school-fp8, term: index-space}
  - {id: caches, col: 5, row: 1, title: "Caches & LRU", text: "The desk and the archive.", link: school-caches, term: lru}
  - {id: reuse, col: 5, row: 2, title: "Reuse distance", text: "One curve, every size.", link: school-reuse-distance, term: reuse-distance}
  - {id: wires, col: 5, row: 3, title: "Wires & memories", text: "HBM, DRAM, PCIe.", link: school-wires, term: bandwidth}
edges:
  - [bits, surprise]
  - [surprise, entropy]
  - [entropy, side, "condition on"]
  - [side, mi]
  - [entropy, codes, "sets the floor"]
  - [codes, arith]
  - [arith, fixed]
  - [mi, pred]
  - [pred, shapes]
  - [shapes, rate]
  - [rate, gain, "same currency"]
  - [vectors, corr]
  - [corr, klt]
  - [klt, gain]
  - [vectors, vq]
  - [pred, vq, "centroid as guess"]
  - [klt, vqklt]
  - [vq, vqklt]
  - [side, amort]
  - [amort, vq]
  - [ints, fp8]
  - [fp8, pred, "grid matters"]
  - [caches, reuse]
  - [reuse, wires]
```

Three connections are worth saying out loud, because each was a small surprise on its page.

- **Rotation and prediction are the same redundancy.** For the two thermometers, turning the axes and predicting one thermometer from the other both save 2.95 bits per reading (II.15).
- **A codebook is a taxed rotation on bell-shaped data.** It can find the same structure, but it pays $\log_2 \vC$ bits per vector for it (II.18).
- **The grid decides whether prediction pays.** The same error in value is 1 step or 58 steps of FP8, depending on where it falls (II.20).

::: note practice Keep what you learned
Every page of this Part has flashcards. Add the ones you want from the takeaway boxes, then practise them on the [flashcard practice page](/practice/): a few minutes a day, the weakest cards first.
:::

Part III leaves the weather station behind. An LLM writes text one token at a time, grows a store of numbers with every token, and reads it back through exactly the kind of desk, lift and archive met here. The stack `R` of II.13 gains two axes and becomes the orchard; a furrow keeps its name.

::: takeaway
- Five families, one map; the links between families matter as much as the families.
- Rotation ≈ prediction; codebook = taxed rotation on bells; the grid decides whether prediction pays.
- Next: the real system, in Part III.
:::
