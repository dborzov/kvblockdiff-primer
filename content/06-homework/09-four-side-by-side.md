---
title: The four dictionaries side by side
nav: The four side by side
group: Four dictionaries
lede: 'One table for the whole cast, with every column explained and every symbol defined; then the family resemblances that make the four easy to tell apart; then a measured portrait — the four types on five synthetic worlds, each charged for everything it uses.'
cards:
  - q: Which dictionary types charge a per-entry tax?
    a: VQ (log₂ C bits per entry) and sib (log₂ b bits per entry)
    wrong: ["loc and KLT", "All four", "None of them — taxes are paid per block"]
    why: loc and a full KLT predict every entry the same way, so nothing has to be said per entry. VQ must name a centroid, sib a sibling.
    sec: table
  - q: Which dictionary is the heaviest, and where can it therefore live?
    a: The full KLT basis (w = 2d) — it is affordable only when a whole request or all requests share it
    wrong: ["loc (w ≈ 2) — only globally", "sib — it stores the whole block", "VQ with C = 16 — only per block"]
    why: For d = 640, w = 1280 entries' worth costs 2.5 bits per element when one block of 4096 pays for it.
    sec: table
  - q: What do loc and the KLT have in common, and what separates them?
    a: Both make one guess for every entry with no tax; loc looks at each channel alone, the KLT uses the other channels too
    wrong: ["Both pay a tax per entry; loc's is smaller", "Both store centroids; the KLT's are rotated", "Nothing — they are unrelated"]
    why: The Compass contains an Anchor (it centres before it rotates); what it adds is the correlation between channels.
    sec: family
  - q: What do VQ and sib have in common, and what separates them?
    a: Both choose a prediction per entry and pay to name it; VQ's codebook is fit and paid for, sib's codebook is the block itself
    wrong: ["Both are taxless; VQ is larger", "Both rotate the data; sib uses a smaller basis", "Both need the sibling on the GPU"]
    why: The Twin is a Hive with a free but noisy codebook — and both are bound by the same rate–distortion limit.
    sec: family
  - q: On the five synthetic worlds, how many worlds did each dictionary type win?
    a: One each — drift for loc, low rank for KLT, clusters for VQ, twins for sib — and on pure noise only loc stayed above zero
    wrong: ["VQ won all five", "loc won all five", "KLT won four of five"]
    why: Each type is built to catch one kind of structure. Which kinds KV caches have is the measurement.
    sec: where
---

The first draft of this proposal compressed the four dictionary types into one dense table. Its rows said "loc", "KLT", "sib" without saying what they were, its tax column gave numbers without saying who pays them, and its formulas used symbols defined nowhere. The previous five pages took the cast apart one member at a time. Here is the table again, rebuilt.

## The table, rebuilt {#table}

| | [[solo]] | [[loc]] | [[klt]] | [[vq]] | [[sib]] |
|:---|:---|:---|:---|:---|:---|
| nickname | the Hermit | the Anchor | the Compass | the Hive | the Twin |
| predicts an element by | nothing | its channel's location | the other channels, through a rotation | the nearest centroid | the nearest sibling |
| dictionary holds | global code tables | location + scale per channel | a $\vd \times \vd$ basis + locations | $\vC$ centroids | nothing extra: the block itself |
| weight $\vw$ | ≈ 0 per request | ≈ 2 | $2\vd$ (rank 16: 32) | $\vC$ | 0 |
| [[entry-tax\|per-entry tax]] | none | none | none (rank 16: its coefficients) | $\log_2 \vC$ bits | $\log_2 \vb$ bits |
| gain on bell-shaped data | 0: the baseline | $\tfrac12\log_2 \frac{\vsigma^2_{\text{total}}}{\vsigma^2_{\text{within}}}$ | $\tfrac12\log_2 \frac{\mathrm{AM}}{\mathrm{GM}}$ | at most KLT + $\frac{\log_2 \vC}{\vd}$ | ½ bit *worse* than loc (random sibling) |
| wins when | always there | values drift between blocks | the spectrum is sharply spiky | entries cluster | entries come in near-duplicates |
| loses when | — | hardly ever (costs $16/\vb$) | one block pays for the basis | data is bell-shaped | no twins, or the sibling is not on the GPU |
| page | [[#homework-solo-coding\|VI.2]] | [[#homework-loc\|VI.5]] | [[#homework-klt\|VI.6]] | [[#homework-vq\|VI.7]] | [[#homework-sib\|VI.8]] |

Every symbol in the table, in one place:

- $\vd$ — elements per entry (640 in the [[reference-setting]]); $\vb$ — entries per [[block]].
- $\vw$ — the dictionary's [[weight]] in entries' worth; spread over a block it costs $8\vw/\vb$ bits per element.
- $\vtax$ — the per-entry tax spread over the entry: an index of $\log_2 \vC$ bits costs $\log_2 \vC/\vd$ per element.
- $\vsigma^2_{\text{total}}$, $\vsigma^2_{\text{within}}$ — a channel's [[variance]] over all blocks, and inside one block.
- $\mathrm{AM}$, $\mathrm{GM}$ — the arithmetic and geometric averages of the [[eigenvalue|eigenvalues]] $\vlambda$ of the standardized covariance ([[am-gm]]).
- $\vC$ — centroids in the [[codebook]].

::: note warning The gain row is not one ruler
Each gain in the table is measured from a different starting point: loc's from solo coding, the KLT's from per-channel coding of the same (centred) data, VQ's as a bound on top of the KLT, sib's against loc. Do not rank the types by that row. The portrait at the bottom of this page measures all four from the same baseline — solo — with every cost charged.
:::

::: takeaway
- loc and a full KLT predict without a tax; VQ and sib pay $\log_2 \vC$ and $\log_2 \vb$ bits per entry.
- Weights run from about 2 entries (loc) to $2\vd$ (a full KLT basis).
- Each type has its own gain formula, from its own baseline; compare them only on a common ruler.
:::

## One family, four guesses {#family}

The cast splits into two pairs, and each pair is best understood by what separates its two members.

:::: compare One guess for every entry
::: col The Anchor
Predicts each channel **by itself**: one location per channel. Catches drift. Light ($\vw \approx 2$), no tax, no way to use correlations between channels.
:::
::: col The Compass
Predicts each coordinate **from the others**, through a rotation; it centres the data first, so it contains an Anchor. Catches correlated channels. Heavy ($\vw = 2\vd$), no tax.
:::
::::

:::: compare A guess chosen per entry
::: col The Hive
Names the nearest of $\vC$ prototypes **fit to the data** and stored in the dictionary. Catches clusters. Pays the index and the codebook.
:::
::: col The Twin
Names the nearest **real entry** of the block. Its codebook is free, but every prototype is noisy, so the residual carries two noises. Pays a pointer, and needs the sibling on the GPU.
:::
::::

The family portrait shows where each member comes from in Part II and what it catches in data. Click a card to go to its page.

```graph
id: hwa-family
columns: ["Part II idea", "Dictionary", "What it catches"]
nodes:
  - {id: rate, col: 1, row: 2, title: "The exchange rate", text: "Variance explained → bits.", link: school-exchange-rate, term: r-squared}
  - {id: tcg, col: 1, row: 3, title: "Transform coding gain", text: "½ log₂ AM/GM.", link: school-coding-gain, term: transform-coding-gain}
  - {id: rd, col: 1, row: 4, title: "Rate–distortion", text: "R bits buy at most R bits.", link: school-vq-vs-klt, term: rate-distortion}
  - {id: hist, col: 1, row: 1, title: "Order-0 entropy", text: "Each value alone.", link: school-entropy, term: order-0-entropy}
  - {id: solo, col: 2, row: 1, title: "solo — the Hermit", text: "The baseline.", link: homework-solo-coding, term: solo}
  - {id: loc, col: 2, row: 2, title: "loc — the Anchor", text: "$\\vw \\approx 2$, no tax.", link: homework-loc, term: loc}
  - {id: klt, col: 2, row: 3, title: "KLT — the Compass", text: "$\\vw = 2\\vd$, no tax.", link: homework-klt, term: klt}
  - {id: vq, col: 2, row: 4, title: "VQ — the Hive", text: "$\\vw = \\vC$, tax $\\log_2 \\vC$.", link: homework-vq, term: vq}
  - {id: sib, col: 2, row: 5, title: "sib — the Twin", text: "$\\vw = 0$, tax $\\log_2 \\vb$.", link: homework-sib, term: sib}
  - {id: c0, col: 3, row: 1, title: "Uneven histograms", text: "The exponent's lopsided use."}
  - {id: c1, col: 3, row: 2, title: "Drift", text: "Values that move from block to block."}
  - {id: c2, col: 3, row: 3, title: "Correlated channels", text: "A sharply spiky spectrum."}
  - {id: c3, col: 3, row: 4, title: "Clusters", text: "Entries that fall into a few kinds."}
  - {id: c4, col: 3, row: 5, title: "Near-duplicates", text: "Twins inside one block."}
edges:
  - [hist, solo]
  - [rate, loc, "gain formula"]
  - [tcg, klt, "gain formula"]
  - [rd, vq, "the bound"]
  - [rd, sib, "the bound"]
  - [solo, c0]
  - [loc, c1]
  - [klt, c2]
  - [vq, c3]
  - [sib, c4]
```

::: takeaway
- loc vs KLT: the same no-tax guess for every entry, per channel against across channels.
- VQ vs sib: a guess chosen per entry, from a fitted codebook against from the block itself.
- Each type catches one kind of structure: drift, correlation, clusters, near-duplicates.
:::

## Who wins where {#where}

To put the four on one ruler we built five synthetic worlds, each with exactly one kind of structure, and ran every type through the same honest accounting: residual bits measured as [[histogram]] entropies of exact integer codes, plus the per-entry tax, plus the dictionary spread over its block — all counted from solo coding.

::: figure fig-hwa-portrait hwaPortrait
**The four dictionaries on five synthetic worlds.** Each cell is the net saving in bits per element against solo coding (positive = the dictionary pays for itself; tinted green, red when it loses), with residual, tax and dictionary charged. Worlds: *drift* (each block shifts every channel's mean; block means explain 60 % of the variance), *low rank* (a rank-8 correlated signal), *clusters* (32 cluster centres), *twins* (every entry has a near-duplicate in its block), *noise* (nothing at all). Blocks of $\vb = 4096$ entries of $\vd = 64$ elements; VQ uses $\vC = 64$; sib takes the nearest other entry (leave-one-out, optimistic). Hover a cell for the breakdown. **Switch** whether the KLT's basis is charged to the block or shared (as a per-request or global dictionary would be). Seeded Monte Carlo, `analysis/homework_a_portrait.py`.
:::

::: try
1. Read the diagonal: every world has its own winner, and every type wins exactly one world.
2. Look at the noise row: only loc stays (barely) above zero. Every other helper pays a tax for nothing.
3. Switch the KLT's basis to "shared": its low-rank cell doubles. Where a dictionary lives matters as much as what it is.
4. Compare clusters for VQ and sib: the Twin comes close, because in clustered data a sibling from the same cluster is almost a centroid.
:::

Two cautions before reading too much into the numbers. These worlds have $\vd = 64$, so per-entry taxes are ten times bigger per element than on 640-element entries (sib's pointer costs 0.19 bit here, 0.02 there), while a full KLT basis would be ten times heavier per element at $\vd = 640$. And the worlds are pure: real KV caches will mix all four kinds of structure, in amounts nobody has measured at 8 bits.

::: takeaway
- On one ruler, each type wins the one world built for it: loc +0.64 on drift, KLT +0.26 (0.51 with a shared basis) on low rank, VQ +1.36 on clusters, sib +0.98 on twins.
- On pure noise every dictionary but loc loses — the tax is real.
- Which worlds KV caches resemble, and in what mix, is exactly what wave 1 measures.
:::
