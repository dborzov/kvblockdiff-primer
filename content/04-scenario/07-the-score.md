---
title: 'The score: the MDL ratio'
nav: The score
group: The rules
lede: One number per compressor per punnet, with two parts that add up. It is simple to compute and easy to misread; this page does both the computing and the reading.
cards:
  - q: 'A compressor''s dictionary is 0.52 of the punnet''s raw bytes and its deltas average 0.11 of a raw cherry. Its MDL ratio and its bits per element?'
    a: 0.63, about 5.1 bits
    wrong: ["0.41 and about 3.3 bits", "0.52 and about 4.2 bits", "1.63 and about 13 bits"]
    why: 'MDL ratio = dictionary share + delta share = 0.52 + 0.11 = 0.63; bits per element = 8 × 0.63 ≈ 5.1.'
    sec: the-number
  - q: Which number does a miss on the link care about?
    a: The delta share, the mean delta over a raw cherry
    wrong: ["The dictionary share", "The MDL ratio", "The bits per element"]
    why: A δ-miss moves one delta. The dictionary was moved earlier and is on the shelf; its cost is paid differently (Part VI).
    sec: the-number
  - q: Why does the dictionary share not measure how much the cherries of a punnet share?
    a: Because a compressor may file reference cherries in the dictionary or in deltas and the ratio barely moves; the share is where bytes were filed, not what is shared
    wrong: ["Because the dictionary is never charged", "Because it does measure it, exactly", "Because deltas are always empty"]
    why: Moving every cherry into the dictionary changed one compressor's ratio by 0.00004. What measures sharing is the gain over solo coding (Part VIII).
    sec: reading
  - q: Two compressors score 0.6449 and 0.6461 on two different screens. Which is better?
    a: Unknown; scores from different samples of punnets cannot be subtracted
    wrong: ["The first, by 0.0012", "The second, because its screen was harder", "Whichever has the smaller dictionary share"]
    why: What makes a punnet hard is its text. Compare compressors only on the same punnets, as a paired difference.
    sec: reading
---

Every score in Part VIII is this one number. It is the total bytes the receiver needs, divided by the raw bytes it would have needed without any compressor.

## The number {#the-number}

::: define mdl-ratio MDL ratio
- **What it is.** (dictionary bytes + all delta bytes) ÷ raw bytes of the [[punnet]]. 1.0 is no compression; 0.5 is half the bytes. "MDL" is for *minimum description length*: the dictionary is the description of the regularities, the deltas are the data given that description, and both are on the bill.
- **Example.** Compressor 121 on `V · all layers · cherry (2, 256) · stretch 4096 · leash 293`: dictionary 0.5247 of the raw bytes, deltas 0.1116, ratio 0.6364, or 5.09 bits per element.
- **Easy to confuse with** a compression *factor* (its inverse: 0.6364 is "1.57×"), and with the delta share alone.
:::

```python the score of one compressor on one punnet
raw_bytes   = punnet_size * cherry_bytes
dict_bytes  = len(dictionary)
delta_bytes = sum(len(d) for d in deltas)

mdl_ratio        = (dict_bytes + delta_bytes) / raw_bytes
dictionary_share = dict_bytes  / raw_bytes          # x
delta_share      = delta_bytes / raw_bytes          # ρ
assert abs(dictionary_share + delta_share - mdl_ratio) < 1e-12
bits_per_element = 8 * mdl_ratio                     # at 8-bit storage
```

$$
\text{MDL ratio} \;=\; \underbrace{\vxshare}_{\text{dictionary share } = \vw/\vb} \;+\; \underbrace{\vrho}_{\text{delta share}}, \qquad \vbpe = 8 \times \text{MDL ratio}.
$$ {#eq-scn-mdl-ratio}

The two parts have names because they are read differently.

- The [[=dictionary-share|dictionary share]] $\vxshare$ is the dictionary's bytes over the punnet's raw bytes; in cherries' worth it is the dictionary [[weight]] over the cherries it serves, $\vw/\vb$.
- The [[=delta-share|delta share]] $\vrho$ is the mean delta over a raw cherry, averaged over *every* cherry of the punnet, empty deltas included. It is the number a miss on the link cares about: a δ-miss moves $\vrho\,\ve$ bytes ([[#app-shelf-and-two-misses]]).
- [[=bpe|Bits per element]] is the same ratio in the unit of Part II: at 8-bit storage, 8 × ratio.

::: aside reminder Weight and stretch length
A dictionary's [[weight]] $\vw$ is its size in cherries' worth, so $\vDsz = \vw\,\ve$; a punnet of one cherry per position has $\vb$ cherries ([[#scenario-scope]]). Then $\vxshare = \vw/\vb$.
:::

::: takeaway
- MDL ratio = dictionary share + delta share; bits per element = 8 × ratio at 8-bit storage.
- The delta share is what a miss moves; the dictionary share is what the shelf must hold.
:::

## Reading the number {#reading}

The score draws a plane, and the campaigns filled it with real points.

::: figure fig-scn-score-square scnScoreSquare wide
**The square of scores, with real points.** Horizontal axis: dictionary share $\vxshare$. Vertical axis: delta share $\vrho$. Their sum is the MDL ratio, so the grey diagonals are lines of constant ratio: solid at 1.0 (no compression), dashed at 0.778 (solo coding on the Bench's values), below which a dictionary pays for itself. Dots: every verified score of both campaigns, coloured by cherry shape; hover for compressor, scenario, ratio and worst-cherry reads. Ringed: compressor 129, no reference cherries, dictionary share 0.02 (ratio 0.686); compressor 109, every cherry in the dictionary and empty deltas (0.719 at `stretch_len = 512`). Toggle C1 and C2. Data: `figures/data/measured-points.json`.
:::

Three things the figure teaches about reading a score.

**The dictionary share is bookkeeping.** The best compressors sit at $\vxshare$ between 0.43 and 0.54 because they store reference cherries in the dictionary ([[#toolbox-reference-cherries]]); the same cherries filed in deltas would cost the same bytes. Moving every cherry of a punnet into the dictionary changed one compressor's ratio by 0.00004. A big dictionary share says where the bytes were filed, not how much the cherries share. What measures sharing is the gain over [[solo]] coding, and that is about a fifth of the bits ([[#measured-what-the-half-means]]).

**Compare on the same punnets.** Two screens read different punnets, and what makes a punnet hard is its text: one screen read 0.6449 and another 0.6461 for what turned out to be the better cherry shape by 0.0043 on identical elements ([[#measured-signal-or-noise]]). A score is a paired difference on the same punnets, per sequence, or it is nothing.

**The curve, not the point.** One compressor family, as its settings vary, traces a [[=curve|compressibility curve]] of (dictionary share, delta share) points; the lower envelope of all families is the [[=roofline|roofline]] the data allows. The campaigns' points sketch a convex curve: 2 % of dictionary buys 42 % of the gain over solo, 10 % buys 77 % ([[#app-two-boring-corners]]).

::: theme every-tax
A dictionary that is not paid for makes any compressor look good. The score charges every byte of it, always; a result quoted without its dictionary share is not a result on this site.
:::

::: takeaway
- The dictionary share says where bytes were filed; the gain over solo says what is shared.
- Scores are compared only on the same punnets, as paired differences per sequence.
- Families trace curves; the roofline is their lower envelope.
:::
