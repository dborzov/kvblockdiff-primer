---
title: School’s out — a cheat sheet
nav: Cheat sheet
lede: Every idea of this Part on one page, each in one line, with the places later on the site where it does real work. Then the whole course as one map, and an invitation to practise.
group: Recap
cards:
  - q: Which three moves recur through the whole primer?
    a: Predict then send the residual; use side information both ends already have; pay fixed costs once and share them
    wrong: ["Sort, search and merge", "Train, validate and test", "Quantize, prune and distil"]
    why: Residuals, codebooks and rotations are ways of predicting; dictionaries, almanacs and codebooks are side information; every one of them is a fixed cost to amortize.
    sec: sheet
  - q: 'Which of these is **not** measured in bits on this site?'
    a: Reuse distance
    wrong: ["Mutual information", "Transform coding gain", "Index tax"]
    why: Reuse distance counts distinct items between two requests for the same item. It describes which items are wanted, not what is inside them.
    sec: sheet
  - q: What links the exchange rate of II.12 to the KLT of II.15?
    a: Both convert explained variance into bits with the same Gaussian rule — for two thermometers they give the same 2.95 bits
    wrong: ["Nothing — one is about prediction, the other about rotation", "The KLT is only defined when R² is below 0.5", "The exchange rate is the KLT applied to one channel"]
    why: Bits ≈ ½ log₂ variance + constant. Prediction shrinks one variance; rotation reshuffles variances so their product shrinks. Same currency.
    sec: map
  - q: 'In the toy world, what do the desk, the lift and the archive become in Part III?'
    a: HBM next to the GPU, the PCIe link, and host DRAM
    wrong: ["The CPU, the radio and the disk", "The model, the tokens and the prompt", "The codebook, the index and the residual"]
    why: Small and fast, the link, big and slow — about a hundred times apart in speed.
    sec: map
---

That was the whole course: twenty-three small pages, from a single yes/no answer to the wire between a GPU and its host. Nothing on the rest of the site uses an idea that is not on this page or defined where it is first used.

## The cheat sheet {#sheet}

One line per page, and where each idea does its real work later. Hover a link for the full page name.

| page | the idea in one line | used later in |
|---|---|---|
| [[#school-bits]] | A [[bit]] is one yes/no answer; $n$ bits tell $2^n$ things apart. | everywhere; [[#homework-the-budget\|VI.1 the bit budget]] |
| [[#school-surprise]] | Rare outcomes carry more bits: [[surprisal]] $= -\log_2 \vp$. | [[#homework-the-budget\|VI.1]] |
| [[#school-entropy]] | [[entropy\|Entropy]] is the average surprise — the floor for any lossless code. | [[#homework-the-budget\|VI.1]], [[#homework-solo-coding\|VI.2 solo coding]] |
| [[#school-side-information]] | What the receiver already knows makes messages cheaper. | [[#idea-mapping\|IV.1]], [[#missed-predictive-coding\|VII.9]] |
| [[#school-mutual-information]] | The bits saved by knowing something: $\vH(\vX) - \vH(\vX \mid \vY)$. | [[#idea-what-is-right\|IV.12]], [[#missed-mutual-information-direction\|VII.3]] |
| [[#school-codes]] | Prefix codes; Huffman gives each symbol about its surprisal in whole bits. | [[#papers-kvcomp\|V.12 KVComp]] |
| [[#school-arithmetic]] | Arithmetic coding and rANS reach fractions of a bit; a wrong model costs cross-entropy. | [[#homework-two-rates\|VI.10 two rates]] |
| [[#school-fixed-length]] | Fixed-length codes with escapes: fast, parallel, random access, a few bits dearer. | [[#papers-splitzip\|V.4 SplitZip]], [[#homework-two-rates\|VI.10]] |
| [[#school-prediction]] | Predict, then send only the exact residual. | [[#homework-dictionary-shape\|VI.4]] |
| [[#school-residual-shapes]] | A bell-shaped residual costs about $\log_2 \vsigma$ + constant bits: halve $\vsigma$, save a bit. | [[#homework-two-rates\|VI.10]] |
| [[#school-exchange-rate]] | Explaining a share $\vRsq$ of the variance saves $\tfrac12\log_2 \frac{1}{1-\vRsq}$ bits: 75 % → 1 bit, 94 % → 2. | [[#homework-exchange-rate\|VI.3]], [[#idea-the-trap\|IV.14 the trap]] |
| [[#school-vectors]] | A [[vector]] is a row of $\vd$ numbers; a [[channel]] is one position across many vectors — a column. | [[#landscape-kv-cache\|III.3]], [[#homework-loc\|VI.5 loc]] |
| [[#school-correlation]] | Covariance: the average signed rectangle. The covariance matrix holds every pair. | [[#homework-klt\|VI.6]] |
| [[#school-rotation]] | The [[klt\|KLT]] turns the axes to the data's own directions; coordinates become uncorrelated. | [[#homework-klt\|VI.6]], [[#papers-kvtc\|V.9 KVTC]] |
| [[#school-coding-gain]] | A rotation saves $\tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$ per element; only sharp low rank pays; lifting makes it lossless. | [[#homework-klt\|VI.6]], [[#missed-lifting\|VII.10]] |
| [[#school-clusters]] | [[vq\|VQ]]: name the nearest centroid, send the residual; the index costs $\log_2 \vC$ bits. | [[#homework-vq\|VI.7]] |
| [[#school-vq-vs-klt]] | On bell-shaped data a codebook cannot beat a rotation; only clusters let it win. | [[#missed-vq-then-code\|VII.5]], [[#missed-rate-distortion-bounds\|VII.13]] |
| [[#school-integers-floats]] | INT8 is an even grid; floats are logarithmic; BF16's low mantissa bits are noise. | [[#papers-float-coders\|V.5]], [[#missed-mantissa-and-grid\|VII.7]] |
| [[#school-fp8]] | FP8 E4M3: 253 values up to 448. In index space, 0.1 and −0.1 are 58 steps apart. | [[#plan-fp8-target\|IX.5]], [[#homework-the-grid\|VI.11]] |
| [[#school-caches]] | A cache keeps a few items close; LRU evicts the least recently used. | [[#landscape-hisparse\|III.6]], [[#landscape-toy-trace\|III.7]] |
| [[#school-reuse-distance]] | Reuse distance $\ge \vB$ means an LRU miss; one histogram gives $\vm(\vB)$ for every size; Bélády bounds all policies. | [[#landscape-reuse-curve\|III.9]], [[#missed-stack-distance\|VII.12]] |
| [[#school-wires]] | Bandwidth vs latency; HBM is about 100× faster to reach than host DRAM over PCIe. | [[#landscape-memory-wall\|III.5]], [[#landscape-reference-setting\|III.10]] |
| [[#school-amortization]] | A fixed cost per item is fixed ÷ items; a dictionary costs $8\vw/\vb$ bits per number. | [[#homework-amortization-rule\|VI.14]], [[#homework-scope\|VI.13]] |

::: theme side-info
Look down the middle column and the same move keeps coming back: something both ends agree on in advance — the order of a vector's elements, a table of channel means, a rotation, a codebook, a grid — makes every later message shorter. That is side information, and the rest of the site is about which side information is worth keeping where.
:::

::: takeaway
- Information: bits, surprise, entropy, side information, mutual information.
- Coding: codes, entropy coders, fixed-length codes, prediction and residuals, the exchange rate.
- Vectors: channels, correlation, rotations (KLT) and codebooks (VQ), and when each one wins.
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
  - {id: vectors, col: 3, row: 3, title: "Vectors & channels", text: "Rows and columns.", link: school-vectors, term: channel}
  - {id: corr, col: 3, row: 4, title: "Correlation", text: "Channels moving together.", link: school-correlation, term: covariance}
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
  - [amort, vq, "codebook sent once"]
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

Part III leaves the weather station behind. A language model writes text one token at a time, keeps a growing memory of numbers, and reads it back through exactly the kind of desk, lift and archive met here.

::: takeaway
- Five families, one map; the links between families matter as much as the families.
- Rotation ≈ prediction; codebook = taxed rotation on bells; the grid decides whether prediction pays.
- Next: the real system, in Part III.
:::
