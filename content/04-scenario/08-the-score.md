---
title: 'The score: the MDL ratio'
nav: The score
group: The rules
lede: One number per compressor per punnet, with two parts that add up. It is simple to compute and easy to misread; this page does both the computing and the reading.
cards:
  - q: 'A compressor''s dictionary is 0.52 of the punnet''s raw bytes and its deltas, summed, are 0.11 of them. Its MDL ratio and its bits per element?'
    a: 0.63, about 5.1 bits
    wrong: ["0.41 and about 3.3 bits", "0.52 and about 4.2 bits", "1.63 and about 13 bits"]
    why: 'MDL ratio = dictionary share + delta share = 0.52 + 0.11 = 0.63; bits per element = 8 × 0.63 ≈ 5.1.'
    sec: the-number
  - q: Which number does a miss on the link care about?
    a: The delta share, every delta of the punnet summed over the punnet's raw bytes
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
- **Example.** Compressor 121 on `V at one KV layer, v[t, l, :, :] · stretch 4096 · leash 293` (a dev screen of two sequences): dictionary share 0.5247, delta share 0.1116, ratio 0.6364, or 5.09 bits per element.
- **Easy to confuse with** a compression *factor* (its inverse: 0.6364 is "1.57×"), and with the delta share alone.
:::

```python the score of one compressor on one punnet
raw_bytes   = punnet_size * cherry_bytes
dict_bytes  = len(dictionary)
delta_bytes = sum(len(d) for d in deltas)

mdl_ratio        = (dict_bytes + delta_bytes) / raw_bytes
dictionary_share = dict_bytes  / raw_bytes          # the dictionary share
delta_share      = delta_bytes / raw_bytes          # the delta share: every delta summed, never averaged
assert abs(dictionary_share + delta_share - mdl_ratio) < 1e-12
bits_per_element = 8 * mdl_ratio                     # at 8-bit storage
```

$$
\text{MDL ratio} \;=\; \underbrace{\vxshare}_{\text{dictionary share } = \vw/\vb} \;+\; \underbrace{\vrho}_{\text{delta share}}, \qquad \vbpe = 8 \times \text{MDL ratio}.
$$ {#eq-scn-mdl-ratio}

The two parts have names because they are read differently.

- The [[=dictionary-share|dictionary share]] $\vxshare$ is the dictionary's bytes over the punnet's raw bytes; in cherries' worth it is the dictionary [[#scenario-scope|weight]] over the cherries it serves, $\vw/\vb$.
- The [[=delta-share|delta share]] $\vrho$ is the bytes of *every* delta of the punnet, summed, over the punnet's raw bytes, empty deltas included. Delta sizes are summed, never averaged; a mean delta size is a diagnostic, not a term of the score. The delta share is the number a miss on the link cares about: a δ-miss moves $\vrho\,\ve$ bytes on average ([[#app-shelf-and-two-misses]]).
- [[=bpe|Bits per element]] is the same ratio in the unit of Part II: at 8-bit storage, 8 × ratio.

::: aside reminder Weight and stretch length
A dictionary's [[#scenario-scope|weight]] $\vw$ is its size in cherries' worth, so $\vDsz = \vw\,\ve$; a punnet of one cherry per position has $\vb$ cherries ([[#scenario-scope]]). Then $\vxshare = \vw/\vb$.
:::

::: takeaway
- MDL ratio = dictionary share + delta share, the sum running over every delta of the punnet; bits per element = 8 × ratio at 8-bit storage.
- The two shares are written out in words; neither is a score on its own. The delta share is what a miss moves; the dictionary share is what the shelf must hold.
:::

## Reading the number {#reading}

The score draws a plane, and the campaigns filled it with real points.

::: figure fig-scn-score-square scnScoreSquare wide
**The square of scores, with real points.** Horizontal axis: dictionary share $\vxshare$. Vertical axis: delta share $\vrho$. Their sum is the MDL ratio, so the grey diagonals are lines of constant ratio: solid at 1.0 (no compression), dashed at 0.778 (solo coding on the Bench's values), below which a dictionary is useful. Dots: every verified score of both campaigns, coloured by cherry shape; hover for compressor, scenario, ratio and worst-cherry reads. Ringed: compressor 129, no reference cherries, dictionary share 0.02 (ratio 0.686); compressor 109, every cherry in the dictionary and empty deltas (0.719 at `stretch_len = 512`). Toggle C1 and C2. Data: `figures/data/measured-points.json`.
:::

Three things the figure teaches about reading a score.

**Neither share is a score on its own.** The best compressors sit at a dictionary share between 0.43 and 0.54 because they store reference cherries in the dictionary ([[#toolbox-reference-cherries]]); the same cherries filed in deltas would cost the same bytes. Moving every cherry of a punnet into the dictionary changed one compressor's ratio by 0.00004. So a point with a larger dictionary share and a smaller delta share is not better or worse for that reason; only the sum is the score, and two points on one diagonal compress equally well. A big dictionary share says where the bytes were filed, not how much the cherries share. What measures sharing is the gain over [[#scenario-compressors-and-stages|solo]] coding, and that is about a fifth of the bits ([[#measured-what-the-half-means]]). Where a compressor's lowest ratio falls, and at what split between the two shares, is a finding about the compressor and the data.

**Compare on the same punnets.** Two screens read different punnets, and what makes a punnet hard is its text: one screen read 0.6449 and another 0.6461 for what turned out to be the better cherry shape by 0.0043 on identical elements ([[#measured-signal-or-noise]]). Two compressors are compared by the paired difference per punnet on the same punnets, with its confidence interval; the spread per sequence is quoted beside it as the check ([[#measured-signal-or-noise]]). A scenario is measured on many punnets: since 2026-11-03 one full-stretch punnet of a holdout sequence is one sample, and the reported number is the mean over the samples with its Student-t confidence interval, after the compressor's configurations were chosen on the dev sequences (target 02 `0000`–`0009` and the three sequences of target 03; the holdout is target 02 `0010`–`0029`). A number from a dev screen is a lead, not a result.

**The curve, and its lowest point.** One compressor at several configurations gives several points (delta share, dictionary share); joined, they are its [[=curve|compressibility curve]] on the scenario. Three or four configurations draw it at first: the lowest point found on the dev sequences, a lighter and a heavier dictionary, and a natural extreme where one exists. What is read off the curve is the point of lowest MDL ratio with its interval, the split it falls at, and how fast the ratio rises on either side. The [[=roofline|roofline]] of a scenario is the lowest MDL ratio reached on it by any compressor at any configuration, with its confidence interval: a diagonal on the square. The older definition of the roofline as the lower envelope of the curves over the two shares is retired, because the shares are not scores. The campaigns' points sketch a convex curve: at a dictionary share of 0.02 the compressors reached 42 % of the gain over solo, at 0.10, 77 % ([[#app-two-boring-corners]]).

::: theme every-tax
A dictionary that is not paid for makes any compressor look good. The score charges every byte of it, always; a result quoted without its dictionary share is not a result on this site.
:::

::: takeaway
- Neither share is a score; the sum is. The dictionary share says where bytes were filed; the gain over solo says what is shared.
- Scores are compared only on the same punnets, as paired differences per punnet with a confidence interval; the reported number is a holdout mean with its interval.
- A compressor's configurations trace its curve; the roofline is the lowest MDL ratio of the scenario.
:::
