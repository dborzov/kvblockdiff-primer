---
title: 'The shape of every compressor, and its bill'
nav: The bill
group: Shape and baseline
lede: Every stage in this toolbox does one of three things to a cherry, and every stage pays on one of three lines. This page fixes the skeleton the other thirteen pages fill in, and the unit every gain is counted in.
cards:
  - q: What are the three steps every lossless compressor on this site performs on a cherry?
    a: Predict it from the dictionary, take the exact integer residual, code the residual so that the delta decodes alone
    wrong: ["Quantise it, round it, store the rounded value", "Rotate it, drop the small coordinates, store the rest", "Sort the punnet, deduplicate it, compress it with zstd"]
    why: Predict, subtract exactly, code. Exact integer residuals in index space make the round trip bit for bit; how good the prediction is decides how small the residual is.
    sec: shape
  - q: What is the per-cherry tax?
    a: Whatever a stage makes every delta carry besides its residual, such as which centroid, which reference cherry, or a flag
    wrong: ["The dictionary's bytes divided by the punnet size", "The bits of the residual", "A fee for loading the dictionary onto the GPU"]
    why: The dictionary is paid once per punnet. The tax is paid again by every cherry and travels in every delta.
    sec: bill
  - q: 'A stage saves 0.40 bit per element on residuals, charges a 12-bit tax per 512-element cherry, and weighs 64 cherries over a punnet of 4096. Net saving?'
    a: About 0.25 bit per element
    wrong: ["0.40 bit per element", "About 0.11 bit per element", "It loses about 0.1 bit per element"]
    why: 'Tax 12/512 ≈ 0.023. Dictionary 8 × 64/4096 = 0.125. Net 0.40 − 0.023 − 0.125 ≈ 0.25.'
    sec: bill
  - q: How many bits of information does one 8-bit E4M3 value of the Bench's values hold when coded alone?
    a: About 6.2 bits, so a dictionary must earn its keep from the remaining structure, counted from 6.2 and never from 8
    wrong: ["8 bits; the codes are used evenly", "4 bits; half the codes are never used", "About 1 bit; the mantissa is all that matters"]
    why: 'Solo coding reaches 0.778 of raw on the Bench, 6.22 bits per element. A dictionary that brings an element from 8 to 6.4 bits has won nothing.'
    sec: budget
---

Here is a punnet small enough to read: six cherries of four elements each, one byte per element, on an INT8 grid so that the arithmetic is plain subtraction.

```python the toy punnet of this Part (6 cherries, 4 elements, 8-bit codes)
import numpy as np
punnet = np.array([
    [97, 12, -31, 40],     # cherry 0
    [97, 15,  22, 44],     # cherry 1
    [96, 10,   5, 38],     # cherry 2
    [98, 13, -14, 42],     # cherry 3
    [97, 15,  21, 45],     # cherry 4: nearly cherry 1 again
    [96, 11,   5, 39],     # cherry 5: nearly cherry 2 again
], dtype=np.int8)
punnet.shape                 # (6, 4): punnet_size = 6, cherry_shape = (4,)
```

Read it by columns and by rows. Element 0 sits at 97 in every cherry. Element 3 follows element 1 (twice it, plus about 15). Cherry 4 is cherry 1 again, give or take one step. Element 2 jumps around. Every page of this Part is a way of turning one of those observations into fewer bits, and every one of them is charged the same way.

## Predict, subtract, code {#shape}

A [[compressor]] is a graph of [[stage|stages]] ([[#scenario-compressors-and-stages]]). Whatever the graph, the data path through it has one silhouette:

1. **Predict** the cherry from the [[dictionary]], and perhaps from a few bits that travel with the cherry.
2. **Subtract** exactly: the [[residual]] is cherry minus prediction, element by element, as integers in [[index-space]]. Nothing is rounded, so nothing is lost.
3. **Code** the residual, so that the [[delta]] decodes on its own given the dictionary ([[cold-decode]]).

```python the skeleton every stage of this Part plugs into
def compress(punnet):                                    # sender side, offline, as slow as it likes
    dictionary = fit(punnet)                             # what the punnet's cherries will share
    deltas = []
    for i, cherry in enumerate(punnet):
        prediction, tax = predict(i, cherry, dictionary) # a guess, and what the receiver must be told to repeat it
        residual = cherry.astype(np.int16) - prediction  # exact, in index space; int16 holds any difference of two bytes
        deltas.append(tax + code(residual, dictionary))  # one self-contained delta
    return deltas, dictionary

def decompress(delta, dictionary):                       # receiver side, one cherry, from cold
    tax, residual = decode(delta, dictionary)
    prediction = repredict(tax, dictionary)              # the same guess, from the dictionary and the tax alone
    return (prediction + residual).astype(np.int8)       # cherry == punnet[i], bit for bit
```

Run the toy through the simplest stage that has a tax. Let the dictionary hold two prototype cherries, `[97, 12, -9, 40]` and `[97, 15, 22, 45]`, and let each delta begin with one bit saying which prototype is the guess. Cherries 1 and 4 pick the second; the rest pick the first.

| cherry | prototype | residual |
|---|---|---|
| 0 | first | `[0, 0, −22, 0]` |
| 1 | second | `[0, 0, 0, −1]` |
| 2 | first | `[−1, −2, 14, −2]` |
| 4 | second | `[0, 0, −1, 0]` |

Cherries 1 and 4 come out nearly all zeros; cherry 0's element 2 is still 22 steps off, because no prototype predicts a furrow that does not stay put. The figure walks the same steps on a longer cherry, with the bill growing beside it.

::: figure fig-toolbox-shape hwaShapeStepper
**One cherry through a compressor, step by step.** The boxes show the first 8 of a cherry's 640 elements as INT8 codes (illustrative numbers, drawn from a bell curve of spread 32 codes; the prediction leaves a residual of spread 16, so it explains 75 % of the variance). The bar on the right adds up the bill in bits per element: solo coding of the raw codes (grey) against the residual bits, the per-cherry tax and the amortised dictionary. Costs are Gaussian ideal rates, $\log_2 \vsigma + 2.05$ bits for spread $\vsigma$. **Step** with the buttons or the arrow keys.
:::

::: theme predict-correct
Every stage of this Part is a way to make step 1 guess better, or step 3 code cheaper. Step 2 never changes.
:::

::: takeaway
- Predict from the dictionary, subtract exactly in index space, code the residual: every stage lives inside this skeleton.
- The stages differ in how they predict and in what they make the receiver hold or carry.
:::

## The three lines {#bill}

The toy's prototypes cost two things: one bit in every delta, and two cherries' worth of dictionary. That is the whole accounting.

::: define bill
- **What it is.** The rate of a compressor in [[bpe|bits per element]], written as three lines: the residual bits, the per-cherry tax spread over the cherry's elements, and the dictionary's bytes spread over the punnet that shares it.
- **Example.** Compressor 121 on `V · all layers · cherry (2, 256) · stretch 4096 · leash 293`: dictionary share 0.5247, delta share 0.1116, MDL ratio 0.6364, which is 5.09 bits per element against 6.22 for solo coding ([[#measured-scorecard]]).
- **Easy to confuse with** the residual bits alone. A rate quoted without its tax and its dictionary is a guess, and the [[harness]] refuses it.
:::

::: define cherry-tax per-cherry tax
- **What it is.** Whatever a stage writes into every delta besides the residual, so that the receiver can repeat the prediction: which centroid ($\log_2 \vC$ bits), which reference cherry ($\log_2 \vb$ bits), a flag, a class. Spread over the cherry's $\vd$ elements it is $\vtax$ bits per element.
- **Example.** The toy's one prototype bit over 4 elements is 0.25 bit per element; a 12-bit pointer over a 512-element cherry is 0.023.
- **Easy to confuse with** the dictionary's own size, which is paid once per punnet and shared by every cherry in it.
:::

::: aside reminder Dictionary weight and the punnet
A dictionary's [[weight]] $\vw$ is its size in cherries' worth, $\vDsz = \vw\,\ve$ ([[#scenario-scope]]). In the examples a punnet holds one cherry per token position, so it has $\vb$ cherries, and the dictionary share of the score is $\vxshare = \vw/\vb$ ([[#scenario-the-score]]). At 8 bits per element, $\ve = \vd$ bytes.
:::

$$
\vbpe \;=\; \underbrace{\vH(\vr)}_{\text{residual bits}} \;+\; \underbrace{\vtax}_{\text{per-cherry tax, per element}} \;+\; \underbrace{\frac{8\,\vw}{\vb}}_{\text{dictionary share, in bits}}
$$ {#eq-toolbox-bill}

For the toy prototypes: residual bits are whatever the code of [[#toolbox-two-rates]] charges; the tax is $1/4 = 0.25$; the dictionary is $8 \times 2/6 = 2.67$ bits per element. In a punnet of six, the room costs more than the meal. In a punnet of 4096 the same two cherries cost $16/4096 = 0.004$ bit. That is why every stage page states its weight and its tax separately, and why [[#scenario-scope]] matters so much.

Subtract the bill from the solo rate $\vH(\vx)$, the cost of the element coded alone, and name the first difference:

$$
\text{saved against solo} \;=\; \underbrace{\vH(\vx) - \vH(\vr)}_{\vgain:\ \text{what the prediction buys}} \;-\; \vtax \;-\; \frac{8\,\vw}{\vb}
$$ {#eq-toolbox-net}

The three lines live in different places, and that is why they are kept apart:

| line | paid | stored | moves on the link |
|---|---|---|---|
| residual $\vH(\vr)$ | per element | in the cherry's delta | with every ask |
| tax $\vtax$ | per cherry | in the cherry's delta | with every ask |
| dictionary $8\vw/\vb$ | per punnet | once, as the punnet's dictionary | when the dictionary is loaded |

So the [[delta-share|delta share]] is $\vrho = (\vH(\vr) + \vtax)/8$ and the [[dictionary-share|dictionary share]] is $\vw/\vb$; their sum is the [[mdl-ratio|MDL ratio]].

::: figure fig-toolbox-bill planBill
**Four bills at one punnet size.** Each bar is the rate of one dictionary type in bits per element: residual (lapis), per-cherry tax (vermilion), dictionary share $8\vw/\vb$ (saffron); the dashed line is raw storage, 8 bits. Weights include 3 bytes per furrow of compressor settings that the harness also charges (centre, scale and width): furrow statistics $\vw = 4$; KLT rank 16 $\vw = 35$; VQ $\vw = 259$ (16 sub-codebooks of 256 centroids); sibling $\vw = 3$. Taxes: 16 coefficients at an **assumed** 8 bits for the partial KLT (0.25 bit per element); one byte per 32 elements for VQ (0.25 bit per element); $\log_2 \vb$ bits for a sibling pointer. The residual is **one assumed value for all four**, so only the taxes differ. Slide the punnet size and the residual; hover a bar for its lines. Elements per cherry: 512, the Bench's one-token-one-layer cherry.
:::

::: theme every-tax
Here the theme gets its equation. Every helper a stage uses, an index, a pointer, a basis, a codebook, a flag, shows up as $\vtax$ or as $8\vw/\vb$. A stage wins only where its gain exceeds both.
:::

::: takeaway
- Rate = residual bits + per-cherry tax + $8\vw/\vb$; net saving against solo = gain − tax − $8\vw/\vb$.
- Residual and tax form the delta and move with every ask; the dictionary is paid once per punnet.
:::

## The budget of an 8-bit element {#budget}

An 8-bit code looks like 8 bits of information. It holds fewer. A bell-shaped furrow stored as [[fp8]] E4M3 uses its 253 codes unevenly: the sign is a coin toss (1.00 bit), the exponent lands on five patterns nine times in ten (2.54 bits of its 4), the three mantissa bits are close to noise (2.93 bits). Its [[order-0-entropy]] is 6.47 bits at any scale of the furrow, a Monte Carlo on a Gaussian toy; the Bench's real values came out lower, 6.22 bits per element ([[#toolbox-solo]]).

::: figure fig-toolbox-budget hwaBudgetBars
**The bit budget of one 8-bit element.** Horizontal bars: bits per element for raw storage and for codes that look at each element alone. "Ideal" rows are order-0 entropies, what an [[entropy-coder]] reaches; "fixed-length" rows use a [[fixed-length-code]] for the exponent with [[escape|escapes]], as GPU decoders do. E4M3 rows are the Gaussian Monte Carlo; E5M2 rows are SplitZip's measurements on real orchards ([[#papers-splitzip]]). Hover a bar for its compression factor. The fixed-length E4M3 row assumes 12 bits to locate each escape.
:::

Read the bars as a budget.

1. **Coding each element alone** brings 8 bits to 6.2 (measured) or 6.5 (toy): about 1.3× smaller, with no dictionary at all.
2. **A fast fixed-length decoder** keeps about 1 bit of that ([[#toolbox-two-rates]]).
3. **Everything else must come from conditional structure**: other elements of the same cherry, or other cherries of the same punnet, making an element more predictable than its own histogram does. That is the only thing a dictionary can add, and it is what the next twelve pages are about.

::: keycard The unit of this Part
$$\vbpe \approx 8\,\vrho \qquad \text{raw: } 8 \quad\cdot\quad \text{coded alone, the Bench's values: } 6.22$$
Every gain in the toolbox is counted from the solo rate, never from 8.
:::

::: takeaway
- An E4M3 element is worth about 6.2 to 6.5 bits before any dictionary exists; the redundancy sits in the exponent, the mantissa is close to noise.
- A dictionary earns its keep only through conditional structure, measured from the solo rate.
:::
