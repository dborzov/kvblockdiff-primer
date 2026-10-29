---
title: The shape of every dictionary coder
nav: The shape of every dictionary coder
group: Four dictionaries
lede: 'A table of averages, a rotation, a codebook, a pointer to a neighbour: four tools that look nothing alike. Losslessly, they are one machine with three costs — and the one cost people forget is the tax paid on every single entry.'
cards:
  - q: What are the three steps every lossless dictionary coder performs on an entry?
    a: Predict it from the dictionary, take the exact integer residual, code the residual
    wrong: ["Quantize it, round it, store the rounded value", "Rotate it, drop the small coordinates, store the rest", "Sort it, deduplicate it, compress it with zstd"]
    why: Predict-then-correct. Exact integer residuals make the scheme lossless; how good the prediction is decides how small the residual is.
    sec: shape
  - q: What is the per-entry tax?
    a: Side information stored with every entry on top of its residual, such as which centroid or which sibling was used
    wrong: ["The dictionary's size divided by the block size", "The bits of the residual", "A fee for loading the dictionary onto the GPU"]
    why: The dictionary is paid once per block (8w/b per element). The tax is paid again by every entry and travels with every miss.
    sec: accounting
  - q: 'A dictionary saves 0.40 bit per element on residuals, charges a 12-bit tax per 640-element entry, and weighs w = 64 entries'' worth over a block of b = 4096. Net saving?'
    a: About 0.26 bit per element
    wrong: ["0.40 bit per element", "About 0.11 bit per element", "It loses about 0.1 bit per element"]
    why: 'Tax: 12/640 ≈ 0.019. Dictionary: 8 × 64 / 4096 = 0.125. Net: 0.40 − 0.019 − 0.125 ≈ 0.26.'
    sec: accounting
  - q: Which two costs travel with every miss on the link?
    a: The residual bits and the per-entry tax — together they are the delta
    wrong: ["The dictionary and the residual", "Only the dictionary", "Only the per-entry tax"]
    why: The delta of an entry must decode alone given its dictionary, so it carries the residual and the tax. The dictionary is stored once per block and loaded or kept resident separately.
    sec: accounting
  - q: Which of the four dictionary types charges no per-entry tax at all?
    a: loc, and the full KLT
    wrong: ["VQ", "sib", "None of them"]
    why: loc predicts every entry with the same per-channel values; a full rotation replaces the entry by its rotated coordinates. VQ pays an index, sib a pointer, a partial KLT its coefficients.
    sec: four
---

Here are four things a receiver might be handed before any entry arrives:

- a short table: for each channel, a typical value and a typical spread;
- a square matrix of numbers that turns the axes of the data;
- a book of 256 prototype vectors;
- nothing at all, but permission to look at the other entries of the same block.

They look like four different inventions. Losslessly, they are the same one.

## Predict, subtract, code {#shape}

Every lossless dictionary coder does three things to an entry, in this order:

1. **Predict** the entry from the dictionary (and possibly from a little side information that comes with the entry).
2. **Subtract**: take the exact integer [[residual]], entry minus prediction, element by element. Exact integers make the round trip lossless.
3. **Code** the residual. If the prediction was good, the residual is small, and small numbers have short codes.

That is [[predictive-coding]] from [[#school-prediction]], with the dictionary as the thing both ends know. Step through it on one toy entry.

::: figure fig-hwa-shape hwaShapeStepper
**One entry through a dictionary coder, step by step.** The boxes show the first 8 of the entry's 640 elements as [[integer-grid|INT8]] codes (illustrative numbers, drawn from a bell curve of spread 32 codes; the prediction is drawn to leave a residual of spread 16, so it explains 75 % of the variance). The bar on the right adds up the bill in bits per element: solo coding of the raw codes (grey) against the dictionary coder's residual bits, per-entry tax and amortized dictionary. Costs are Gaussian ideal rates: $\log_2 \vsigma + 2.05$ bits for spread $\vsigma$. **Step** with the buttons or the arrow keys.
:::

::: theme predict-correct
Here the theme is the whole skeleton of Part VI. The four dictionaries differ only in step 1 — *how* they predict and what the receiver must hold to repeat the prediction. Steps 2 and 3 never change.
:::

::: takeaway
- Predict from the dictionary, subtract exactly, code the residual: every lossless dictionary coder has this shape.
- The dictionary types differ only in how they predict.
:::

## Three costs, one equation {#accounting}

The toy's bill had three lines. Every dictionary coder pays the same three, and only these three:

::: define entry-tax
- **What:** side information that must be stored with **each entry**, on top of its residual, so the receiver can repeat the prediction. Which centroid ($\log_2 \vC$ bits), which sibling ($\log_2 \vb$ bits), a flag.
- **Why it matters:** it is paid again for every entry, and it travels with every miss. Spread over an entry's $\vd$ elements, we write it $\vtax$ (bits per element).
- **Not to confuse with** the dictionary's own size: that is paid once per [[block]] and shared by all its entries.
:::

::: aside reminder Dictionary weight and the block (IV.2)
A [[block]] is $\vb$ consecutive entries. A dictionary of [[weight]] $\vw$ is $\vw$ entries' worth of bytes, $\vDsz = \vw\,\ve$ ([[#idea-dictionary-delta-block]]). At 8 bits per element an entry of $\vd$ elements is $\ve = \vd$ bytes, so the dictionary costs $8\vw\vd$ bits shared by $\vb\vd$ elements: $8\vw/\vb$ bits per element. [[#homework-amortization-rule]] turns this into the amortization rule.
:::

$$
\vbpe \;=\; \underbrace{\vH(\vr)}_{\text{residual bits}} \;+\; \underbrace{\vtax}_{\text{per-entry tax}} \;+\; \underbrace{\frac{8\,\vw}{\vb}}_{\text{dictionary, amortized}}
$$ {#eq-hwa-accounting}

Here $\vH(\vr)$ is the [[entropy]] of the residual per element — what an ideal coder pays for it ([[#homework-two-rates]] adds the realistic, fixed-length version). Subtract this bill from the solo rate $\vH(\vx)$, the cost of coding the element alone, and give the first difference a name, the $\vgain$:

$$
\text{saved against solo} \;=\; \underbrace{\vH(\vx) - \vH(\vr)}_{\vgain:\ \text{what the prediction buys}} \;-\; \underbrace{\vtax}_{\text{per entry}} \;-\; \underbrace{\frac{8\,\vw}{\vb}}_{\text{per block}}
$$ {#eq-hwa-net}

For bell-shaped data the gain is the exchange rate of [[#homework-exchange-rate]]: $\vgain = \tfrac12\log_2\frac{1}{1-\vRsq}$. In the toy: gain 1.00, tax 0.009, dictionary 0.125, so 0.87 bit saved per element.

The three costs live in different places of the system, and that is why they are kept apart:

| cost | paid | stored | on the link |
|:---|:---|:---|:---|
| residual $\vH(\vr)$ | per element | in the entry's [[delta]] | with every miss |
| tax $\vtax$ | per entry | in the entry's delta | with every miss |
| dictionary $8\vw/\vb$ | per block | once, as the block's [[dictionary]] | at load time |

So the [[delta-ratio]] is $\vrho = (\vH(\vr) + \vtax)/8$, and the dictionary is the separate weight $\vw$ of IV.2. Whether $\vw$ is cheap depends on how often the dictionary must be loaded and how long it stays on the GPU ([[#homework-economics]]).

::: theme every-tax
Here the theme gets its equation. Every helper a dictionary uses — an index, a pointer, a basis, a codebook — shows up as $\vtax$ or as $8\vw/\vb$. A dictionary type wins only where its gain exceeds both.
:::

::: takeaway
- $\vbpe$ = residual bits + per-entry tax + dictionary spread over the block.
- Net saving against solo = gain − tax − $8\vw/\vb$.
- Residual and tax form the delta and ride on every miss; the dictionary is stored and loaded once per block.
:::

## Four ways to predict {#four}

The next four pages take one dictionary type each. Each has a nickname and an emblem that will follow it around the site. Here they are against the Hermit, the baseline from [[#homework-solo-coding]]; click a card to go to its page.

```graph
id: hwa-four-preview
columns: ["Baseline", "One guess for every entry", "A guess chosen per entry"]
nodes:
  - {id: solo, col: 1, row: 1, title: "solo — the Hermit", text: "No prediction. One global code per channel.", link: homework-solo-coding, term: solo}
  - {id: loc, col: 2, row: 1, title: "loc — the Anchor", text: "Each channel's typical value and spread. $\\vw \\approx 2$, no tax.", link: homework-loc, emblem: anchor, color: "var(--t-loc)"}
  - {id: klt, col: 2, row: 2, title: "KLT — the Compass", text: "A rotation of the axes. $\\vw$ up to $2\\vd$, no tax (full basis).", link: homework-klt, term: klt}
  - {id: vq, col: 3, row: 1, title: "VQ — the Hive", text: "$\\vC$ prototype entries. $\\vw = \\vC$, tax $\\log_2 \\vC$ bits per entry.", link: homework-vq, term: vq}
  - {id: sib, col: 3, row: 2, title: "sib — the Twin", text: "Another entry of the same block. $\\vw = 0$, tax $\\log_2 \\vb$ bits per entry.", link: homework-sib, emblem: twins, color: "var(--t-sib)"}
edges:
  - [solo, loc, "+ location"]
  - [loc, klt, "+ rotation"]
  - [loc, vq, "+ a choice per entry"]
  - [vq, sib, "codebook = the block"]
```

[[#homework-four-side-by-side]] puts all four in one table, with the Hermit of [[#homework-solo-coding]] as the baseline they all have to beat.

::: takeaway
- loc and the full KLT predict without a per-entry tax; VQ and sib pay one on every entry.
- Their weights range from about 2 entries' worth (loc) to $2\vd$ (a full KLT basis).
:::
