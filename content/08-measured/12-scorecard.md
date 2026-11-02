---
title: The scorecard
nav: The scorecard
group: What it means
lede: 'Parts V to VII wrote their guesses down so that the data could contradict them. Here is the ledger, line by line: what the site said, what the campaigns measured, the verdict. Two of the hypotheses come out changed, one new one is the strongest structure found, and the stage families finish in an order nobody predicted.'
cards:
  - q: 'The napkin expected most of the gain in a few pre-RoPE key furrows and about nothing in values. What did the campaigns measure?'
    a: Values compress to 0.63 at a stretch of 4096 and 0.62 at 16 384, about 1.1–1.3 bits below solo; keys compress like values
    wrong: ["Values stayed at solo; keys gave 1 bit", "Neither compressed below solo", "Only the outlier furrows compressed"]
    why: The prior was wrong on values. The gain came from repeated tokens (reference cherries) and the fixed geometry of the weights (linear prediction), neither of which is a furrow effect.
    sec: predictions
  - q: What was the verdict on the fixed rotations, the Compass?
    a: 'They lose by 0.28–0.32 bit per element; rotating then rounding pays a tax of about 0.25 bit, and prediction without rounding wins'
    wrong: ["They won by 0.5 bit", "They matched linear prediction exactly", "They were never tried"]
    why: Element numbers carry no neighbourhood, so a DCT has nothing to work with, and any rotation leaves the grid and pays the lattice constant on the way back.
    sec: predictions
  - q: Which of the hypotheses was untested by the campaigns?
    a: The Lucky Louis property; the campaigns measured bytes, never which picks an indexer names
    wrong: ["Fallen-apple similarity", "Upstairs similarity", "All of them were tested"]
    why: Deployment and the indexer were out of the campaign's scope. Which picks are wanted and what is inside them remain two different questions.
    sec: properties
  - q: How did fallen-apple similarity fare?
    a: Half wrong; repeats are the axis, with distance mattering only in the middle KV layers, and adjacent tokens are nearly useless at KV layers 0, 4 and 5
    wrong: ["Confirmed exactly as drawn", "Entirely wrong, no cherry predicts any other", "Untested"]
    why: Mutual information with the adjacent token is 0.058 bit per element at KV layer 0; the references that pay point at the same token again, often far away. Middle layers form chains along the text.
    sec: properties
---

A forecaster who writes the forecast down before looking out of the window has to show it afterwards. Part V's toolbox wrote its expectations for each stage family, and Part VII stated each hypothesis in bits. This page holds both against what came back, one line per prediction.

## Predictions, scored {#predictions}

Every measured number below is pinned on an earlier page of this Part; the verdicts are the Part's, and a reader who disagrees with one can follow the link and argue.

| what the site said | what was measured | verdict |
|:--|:--|:--|
| [[solo\|Solo]] coding ≈ 0.78 ideal to 0.88 fixed-length ([[#toolbox-solo]]) | 0.778 ideal for six KV layers (6.22 bits); 0.804 for the best real solo compressor | **confirmed** |
| most gain in a few pre-RoPE key furrows; values ≈ nothing; $\vrho$ ≈ 0.75–0.85 ([[#toolbox-the-bill]]) | values 0.63 at a stretch of 4096, 0.62 at 16 384 (≈1.1–1.3 bits below solo); keys compress like values | **wrong on values**; keys fine; $\vrho$ far below 0.85 |
| $\vrho = 0.5$ would need 2.5–3.2 bits saved per element ([[#toolbox-exchange-rate]]) | best verified 0.618 = 1.3 bits saved; the code-length floor inside a punnet ≈ 0.60 | arithmetic stands; 0.5 **not reached** inside a punnet |
| light dictionaries first; [[loc\|furrow statistics]] capture most ([[#toolbox-furrow-statistics]]) | per-furrow statistics are the solo baseline (0.80); the gain came from [[reference-cherry\|reference cherries]] and [[linear-prediction]] | furrow statistics alone: **nothing** beyond solo |
| [[klt\|KLT]]: rotate, then round ([[#toolbox-klt]]) | fixed rotations lose 0.28–0.32 bit; rounding after a rotation costs ≈ 0.25 bit; prediction without rounding wins | the **rounding tax was missed** |
| [[vq\|VQ]] bounded by KLT plus $\log_2 \vC/\vd$; whether cherries cluster "an open measurement" ([[#toolbox-vq]]) | codebooks lose to reference cherries; RQ saves 0.0029 only; clusters in a minority of cherries | **confirmed**, and the reason named |
| [[sib]]: nearest sibling 0.37–0.5 bit *worse* than furrow statistics unless true twins exist ([[#toolbox-reference-cherries]]) | true twins exist: the same token again is the nearest neighbour 55–78 % of the time at KV layer 0; the twin ladder 0.80 → 0.67 | the **twins world is the real one** |
| [[fallen-apple]]: cheaper the *closer* the neighbour; a curve over $\vgap$ ([[#hypotheses-fallen-apple]]) | adjacent tokens nearly useless at KV layers 0, 4, 5 (0.058 bit of [[mutual-information]]); references point to repeats far away; middle layers 37–47 % within 8 tokens | **half wrong**: repeats are the axis |
| [[upstairs]]: adjacent layers share ([[#hypotheses-upstairs]]) | joining six KV layers saves 0.0043; given everything else adjacent layers share 0.03–0.08 bit; layers group by kind (KV 0, 4, 5 against 1, 2, 3) | **small**, and by kind rather than nearness |
| [[stereo]]: the two heads are two views of one vector ([[#hypotheses-stereo]]) | joining the heads saves 0.0322 (20 of 20); 0.85 bit per element shared raw at a cosine of 0.05 | **confirmed**: the strongest structure measured |
| [[echo]]: a far repeat predicts a cherry ([[#hypotheses-echo]]) | the nearest cherry is the same token again 55–78 % of the time; hubs of far-apart repeats at KV layers 0, 4, 5 | **confirmed**: the axis that mattered |
| the grid matters; E4M3 index-space prediction loses below $\vRsq \approx 0.7$ ([[#toolbox-bit-fields]]) | the shared-bits estimate reads 3× too low in index space; compressors predict in value and integrate over the cell | **confirmed** |
| stretch length: amortization floor $8\vw/\vb$, drift sets a ceiling ([[#school-amortization]]) | longer stretches always win, ever more slowly; no ceiling up to 32 768; a whole sequence is best | **no drift ceiling** in this text |
| two rates ≈ 1 bit apart; fixed-length is the engineering number ([[#toolbox-two-rates]]) | every compressor here uses an entropy coder (rANS); no fixed-length rate was measured | **unmeasured** |
| the leash is the hard constraint ([[#scenario-the-leash]], [[#app-data-layout]]) | a cold decode within 293 cherries' worth costs nothing at a stretch of 4096; a path layout made "every cherry in the dictionary" cheap to read | **easier than feared** |
| economics: lever 1 alone ≈ 1.11× at $\vrho = 0.75$; the prize is lever 2 ([[#app-two-levers]]) | deployment out of the campaign's scope; the light compressor gives $\vrho$ ≈ 0.66–0.69 with a 2–4 % dictionary; tree compressors need half the punnet resident | **to be computed**: [[#measured-what-it-means]] |

Count the verdicts. Six confirmed, one of them with its reason supplied by the data and two of them the new hypotheses of Part VII. Two wrong, one half wrong, one small. Three turned out easier or larger than the site feared. Two remain open because the campaign measured something adjacent to what the application asks for: it compressed with entropy coders when the store wants fixed-length deltas, and it never ran an indexer.

::: aside source Receipts
The table is spec §1.12 extended by the stereo and echo rows, built from notes/05 §1.6 (the primer's ten numbers) and the measured sections it points to: solo §1.3; keys, same-token neighbours and mutual information §1.4 (C1, layer 3, head 0); shuffle §1.5; entry splits §1.6; codebooks, rotations and coder 129 §1.7; where references point §1.8; reads and block sizes §1.9; floors §1.10. Each measured number is pinned with its trial or page on the page of this Part that reports it.
:::

::: takeaway
- Solo, the grid, the VQ bound, stereo, echo and the leash came out as predicted; the value prior, the rotation plan and the fallen-apple curve did not.
- The gains are real, in values the napkin wrote off, from mechanisms (repeats, weight geometry) the first draft did not name.
- Two of the application's engineering numbers, the fixed-length rate and the miss path, were never measured.
:::

## The hypotheses and the cast {#properties}

Part VII's hypotheses each get their verdict, then the stage families get their curtain call.

**[[lucky-louis|The Lucky Louis property]]: untested here.** The campaigns measured bytes. They never ran an [[indexer]], never recorded a [[pick]], never asked which positions a decode step wants. Whether picks repeat, and whether misses pile into a few [[heavy-stretch|heavy stretches]], stands exactly where HiSparse left it ([[#landscape-lucky-louis]], [[#hypotheses-heavy-stretches]]).

**[[fallen-apple|Fallen-apple similarity]]: half wrong.** The hypothesis drew a curve over token distance $\vgap$, cheapest next door and fading with distance. In the data, the adjacent token is nearly useless at KV layers 0, 4 and 5 (0.058 bit of mutual information per element at KV layer 0, against 0.31 at KV layers 1 and 2), and the reference cherries that pay are the same token again, often far away in the punnet. Distance does matter in the middle KV layers, where 37–47 % of references sit within 8 tokens against 7–12 % elsewhere, and where values are smooth along the text ([[#measured-time-and-bits]]).

**[[echo|Echo similarity]]: the axis that mattered.** The term the first draft called "a floor that never fades" turned out to be the main one. Hubs of far-apart repeats at the first and last KV layers, chains in the middle; the reference tree lives on echoes.

**[[stereo|Stereo similarity]]: the strongest structure measured.** Joining the two heads of a KV layer saves 0.0322 of ratio on 20 of 20 sequences, 0.85 bit per element shared raw, at a cosine near zero ([[#measured-cutting-the-tensor]]).

**[[upstairs|Upstairs similarity]]: small, and by kind.** Joining all six KV layers into one cherry saves 0.0043 beyond joining the two heads. Given everything else, adjacent layers share 0.03–0.08 bit per element. And the layers that help each other are of the same kind, KV layers 0, 4 and 5 together (the LLM's 3, 19, 23), 1, 2 and 3 together (7, 11, 15), a grouping that beat nearest-neighbour grouping by 0.0015 on 7 of 7 sequences. The staircase has landings, and they are grouped by what the layer does rather than by which floor it is on.

Then the cast, one line each.

- **The Twin ([[sib]]) won.** A [[reference-tree]] is a sibling dictionary with the pointer made cheap and the siblings chosen well; the twin ladder of [[#measured-night-one]] runs from 0.80 to 0.67 on one head.
- **The Hive ([[vq]]) lost.** A codeword is stored only to help others, while a reference cherry must be stored anyway, so a codebook can only add a tax; stacked on a tree the encoder chose no codebook on 72 of 72 punnets ([[#measured-codebooks-and-rotations]]).
- **The Compass ([[klt]]) lost.** Rotating leaves the grid, and rounding back costs about 0.25 bit per element; linear prediction gets the same geometry without rounding anything.
- **The Anchor ([[loc]]) is the floor.** Per-furrow statistics are the solo baseline every gain is counted from, and nothing more.

:::: compare What we guessed, what we measured
::: col What we guessed
Light dictionaries first; most of the gain in a few key furrows; a curve that fades with distance; VQ to be measured before it is trusted; $\vrho$ around 0.75–0.85, with values adding little.
:::
::: col What we measured
The heaviest "dictionary" won, half the punnet, made of the cherries themselves; values alone compress to 0.62–0.63; repeats beat distance; codebooks lose to real cherries; the light compressor gives $\vrho$ ≈ 0.66–0.69 and the tree compressor goes far lower.
:::
::::

::: theme which-vs-what
The campaigns answered "what is inside the cherries" and left "which picks are wanted" untouched. The distinction that opened this site is exactly the line along which the campaign's scope was drawn.
:::

::: takeaway
- Lucky Louis untested, fallen-apple half wrong (repeats, with distance only in the middle layers), echo and stereo confirmed, upstairs small and grouped by kind.
- The Twin won, the Hive and the Compass lost for reasons the data names, the Anchor is the floor.
- The bet on bytes paid, in a way the bet did not foresee.
:::
