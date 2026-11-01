---
title: The scorecard
nav: The scorecard
group: What it means
lede: 'Parts IV to IX wrote their guesses down so that the data could contradict them. Here is the ledger, line by line: what the primer said, what the campaigns measured, the verdict. Two of the three properties the idea bet on come out changed, and the dictionary cast finishes in an order nobody predicted.'
cards:
  - q: 'The primer expected most of the gain in a few pre-RoPE key channels and about nothing in values. What did the campaigns measure?'
    a: Values compress to 0.63 at 4k and 0.62 at 16k, about 1.1–1.3 bits below solo; keys compress like values
    wrong: ["Values stayed at solo; keys gave 1 bit", "Neither compressed below solo", "Only the outlier channels compressed"]
    why: The prior was wrong on values. The gain came from repeated tokens (reference entries) and the fixed geometry of the weights (linear prediction), neither of which is a channel effect.
    sec: predictions
  - q: What was the verdict on the fixed rotations the primer called the Compass?
    a: 'They lose by 0.28–0.32 bit per element; rotating then rounding pays a tax of about 0.25 bit that the primer missed, and prediction without rounding wins'
    wrong: ["They won by 0.5 bit", "They matched linear prediction exactly", "They were never tried"]
    why: Channel numbers carry no neighbourhood, so a DCT has nothing to work with, and any rotation leaves the grid and pays the lattice constant on the way back.
    sec: predictions
  - q: Which of the three properties the idea bet on was untested by the campaigns?
    a: The Lucky Louis property; the campaigns measured bytes, never which entries an indexer selects
    wrong: ["Fallen-apple similarity", "Upstairs similarity", "All three were tested"]
    why: Deployment and the indexer were out of the campaign's scope. Which entries are wanted and what is inside them remain two different questions.
    sec: properties
  - q: How did fallen-apple similarity fare?
    a: Half wrong; repeats are the axis, with distance mattering only in the middle layers, and adjacent tokens are nearly useless at layers 3, 19 and 23
    wrong: ["Confirmed exactly as drawn", "Entirely wrong, no entry predicts any other", "Untested"]
    why: Mutual information with the adjacent token is 0.058 bit per element at layer 3; the references that pay point at the same token again, often far away. Middle layers form chains along the text.
    sec: properties
---

A forecaster who writes the forecast down before looking out of the window has to show it afterwards. [[#homework-where-bits-come-from]] wrote this project's forecast; [[#plan-decision-rule]] fixed what each outcome would mean. This page holds both against what came back, one line per prediction.

## Predictions, scored {#predictions}

Every measured number below is pinned on an earlier page of this Part; the verdicts are the Part's, and a reader who disagrees with one can follow the link and argue.

| what the primer said | what was measured | verdict |
|:--|:--|:--|
| [[solo\|Solo]] coding ≈ 0.78 ideal to 0.88 fixed-length ([[#homework-solo-coding]]) | 0.778 ideal for six layers (6.22 bits); 0.804 for the best real solo coder | **confirmed** |
| most gain in a few pre-RoPE key channels; values ≈ nothing; $\vrho$ ≈ 0.75–0.85 ([[#homework-where-bits-come-from]]) | values 0.63 at 4k, 0.62 at 16k (≈1.1–1.3 bits below solo); keys compress like values | **wrong on values**; keys fine; $\vrho$ far below 0.85 |
| $\vrho = 0.5$ would need 2.5–3.2 bits saved per element ([[#homework-where-bits-come-from]]) | best verified 0.618 = 1.3 bits saved; the exact-model floor inside a block ≈ 0.60 | arithmetic stands; 0.5 **not reached** inside a block |
| light dictionaries first; [[loc]] captures most ([[#homework-four-side-by-side]]) | per-channel statistics are the solo baseline (0.80); the gain came from [[reference-entry\|reference entries]] and [[linear-prediction]] | loc alone: **nothing** beyond solo |
| [[klt\|KLT]]: rotate, then round ([[#homework-klt]]) | fixed rotations lose 0.28–0.32 bit; rounding after a rotation costs ≈ 0.25 bit; prediction without rounding wins | the **rounding tax was missed** |
| [[vq\|VQ]] bounded by KLT plus $\log_2 \vC/\vd$; whether entries cluster "an open measurement" ([[#homework-vq]]) | codebooks lose to reference entries; RQ saves 0.0029 only; clusters in a minority of entries | **confirmed**, and the reason named |
| [[sib]]: nearest sibling 0.37–0.5 bit *worse* than loc unless true twins exist ([[#homework-sib]]) | true twins exist: the same token again is the nearest neighbour 55–78 % of the time at layer 3; the twin ladder 0.80 → 0.67 | the **twins world is the real one** |
| [[fallen-apple]]: cheaper the *closer* the neighbour; a curve over $\vgap$ ([[#idea-fallen-apple]]) | adjacent tokens nearly useless at layers 3, 19, 23 (0.058 bit of [[mutual-information]]); references point to repeats far away; middle layers 37–47 % within 8 tokens | **half wrong**: repeats are the axis |
| [[upstairs]]: adjacent layers share ([[#idea-upstairs]]) | joining six layers saves 0.0043; given everything else adjacent layers share 0.03–0.08 bit; layers group by kind (3, 19, 23 against 7, 11, 15) | **small**, and by kind rather than nearness |
| the grid matters; E4M3 index-space prediction loses below $\vRsq \approx 0.7$ ([[#homework-the-grid]], [[#plan-fp8-target]]) | the shared-bits estimate reads 3× too low in index space; coders model in value and integrate over the cell | **confirmed** |
| block size: amortization floor $8\vw/\vb$, drift sets a ceiling ([[#homework-amortization-rule]]) | bigger blocks always win, ever more slowly; no ceiling up to 32k; a whole sequence is best | **no drift ceiling** in this text |
| decision rule: $\vgainreq + \vgainblk \ge 0.75$ bit → go ([[#plan-decision-rule]]) | gain over solo ≈1.1–1.3 bits at 4k–16k; the split between request and block scope inverted | **go, with the scopes reread** ([[#measured-what-it-means]]) |
| two rates ≈ 1 bit apart; fixed-length is the engineering number ([[#homework-two-rates]]) | every coder here is an entropy coder (rANS); no fixed-length rate was measured | **unmeasured** |
| random access is the hard constraint ([[#idea-data-layout]]) | a cold decode within 293 entries' worth costs nothing at 4k; a path layout made a dictionary share of 1 cheap to read | **easier than feared** |
| economics: lever 1 alone ≈ 1.11× at $\vrho = 0.75$; the prize is lever 2 ([[#questions-framework-d]]) | deployment out of the campaign's scope; the light coder gives $\vrho$ ≈ 0.66–0.69 with a 2–4 % dictionary; tree coders need half the block resident | **to be computed**: [[#measured-what-it-means]] |

Count the verdicts. Four confirmed, one of them with its reason supplied by the data. Two wrong, one half wrong, one small. Three turned out easier or larger than the primer feared. Two remain open because the campaign measured something adjacent to what the primer asked for: it compressed with entropy coders when the store wants fixed-length deltas, and it never ran an indexer.

::: aside source Receipts
The table is spec §1.12, built from notes/05 §1.6 (the primer's ten numbers) and the measured sections it points to: solo §1.3; keys, same-token neighbours and mutual information §1.4 (C1, layer 3, head 0); shuffle §1.5; entry splits §1.6; codebooks, rotations and coder 129 §1.7; where references point §1.8; reads and block sizes §1.9; floors §1.10. Each measured number is pinned with its trial or page on the page of this Part that reports it.
:::

::: takeaway
- Solo, the grid, the VQ bound and random access came out as predicted; the value prior, the rotation plan and the fallen-apple curve did not.
- The gains are real and larger than the plan's threshold, in values the primer wrote off, from mechanisms (repeats, weight geometry) the primer did not name.
- Two of the primer's engineering numbers, the fixed-length rate and the miss path, were never measured.
:::

## The three properties and the cast {#properties}

The idea rested on three properties ([[#reference-summary]]). Each gets its verdict, then the dictionary cast gets its curtain call.

**[[lucky-louis|The Lucky Louis property]], the Gambler: untested here.** The campaigns measured bytes. They never ran an indexer, never recorded a selection, never asked which entries a decode step wants. Whether selections repeat, and whether misses pile into a few [[heavy-block|heavy blocks]], stands exactly where HiSparse left it ([[#landscape-lucky-louis]]).

**[[fallen-apple|Fallen-apple similarity]], the Apple: half wrong.** The primer drew a curve over token distance $\vgap$, cheapest next door and fading with distance. In the data, the adjacent token is nearly useless at layers 3, 19 and 23 (0.058 bit of mutual information per element at layer 3, against 0.31 at layers 7 and 11), and the reference entries that pay are the same token again, often far away in the block. The axis is repetition. Distance does matter in the middle layers, where 37–47 % of references sit within 8 tokens against 7–12 % elsewhere, and where values are smooth along the text ([[#measured-time-and-bits]]). The term the primer called "a floor that never fades" turned out to be the main one.

**[[upstairs|Upstairs similarity]], the Staircase: small, and by kind.** Joining all six layers into one entry saves 0.0043 beyond joining the two heads. Given everything else, adjacent layers share 0.03–0.08 bit per element. And the layers that help each other are of the same kind, 3, 19 and 23 together, 7, 11 and 15 together, a grouping that beat nearest-neighbour grouping by 0.0015 on 7 of 7 sequences. The staircase has landings, and they are grouped by what the layer does rather than by which floor it is on.

Then the cast, one line each.

- **The Twin ([[sib]]) won.** A [[reference-tree]] is a sibling dictionary with the pointer made cheap and the siblings chosen well; the twin ladder of [[#measured-night-one]] runs from 0.80 to 0.67 on one head.
- **The Hive ([[vq]]) lost.** A codeword is stored only to help others, while a reference entry must be stored anyway, so a codebook can only add a tax; stacked on a tree the encoder chose no codebook on 72 of 72 blocks ([[#measured-codebooks-and-rotations]]).
- **The Compass ([[klt]]) lost.** Rotating leaves the grid, and rounding back costs about 0.25 bit per element; linear prediction gets the same geometry without rounding anything.
- **The Anchor ([[loc]]) is the floor.** Per-channel statistics are the solo baseline every gain is counted from, and nothing more.

:::: compare What we guessed, what we measured
::: col What we guessed
Light dictionaries first; most of the gain in a few key channels; a curve that fades with distance; VQ to be measured before it is trusted; $\vrho$ around 0.75–0.85, with values adding little.
:::
::: col What we measured
The heaviest "dictionary" won, half the block, made of the entries themselves; values alone compress to 0.62–0.63; repeats beat distance; codebooks lose to real entries; the light coder gives $\vrho$ ≈ 0.66–0.69 and the tree coder goes far lower.
:::
::::

::: theme which-vs-what
The campaigns answered "what is inside the entries" and left "which entries are wanted" untouched. The distinction that opened this site is exactly the line along which the campaign's scope was drawn.
:::

::: takeaway
- Lucky Louis untested, fallen-apple half wrong (repeats, with distance only in the middle layers), upstairs small and grouped by kind.
- The Twin won, the Hive and the Compass lost for reasons the data names, the Anchor is the floor.
- The bet on bytes paid, in a way the bet did not foresee.
:::
