---
title: Mutual information
lede: The bits that side information saves have a name, mutual information. Redundancy, similarity and predictability turn out to be three more names for the same number of bits.
group: Information
cards:
  - q: 'The sky has $\vH(\vX) = 1.75$ bits and $\vH(\vX \mid \vY) = 1.59$ bits with the season almanac. What is the mutual information $\vI(\vX;\vY)$?'
    a: About 0.16 bits
    wrong: ["About 3.34 bits", "About 1.59 bits", "About 0.91 bits"]
    why: 'Mutual information is the saving: $\vI = \vH(\vX) - \vH(\vX \mid \vY) = 1.75 - 1.59$.'
    sec: bits-saved
  - q: How much does one sky report tell the harbour about the season?
    a: The same 0.16 bits that the season tells about the sky
    wrong: ["Nothing — information flows only from season to sky", "2 bits, the full entropy of the season", "1.75 bits, the full entropy of the sky"]
    why: 'Mutual information is symmetric: $\vH(\vY) - \vH(\vY \mid \vX) = 2 - 1.84 = 0.16$ bits.'
    sec: bits-saved
  - q: When is $\vI(\vX;\vY) = 0$?
    a: When knowing Y does not change the probabilities of X at all
    wrong: ["When X and Y are equal", "When Y has more entropy than X", "Never — it is always positive"]
    why: Then the two are independent, and the conditional entropy equals the plain entropy.
    sec: bits-saved
  - q: In the sticky-sky toy (stickiness 0.8), which side information saves more bits per sky report?
    a: The previous report, about 1 bit — six times the season's 0.16
    wrong: ["The season, about 1 bit", "Both save the same 0.16 bits", "Neither — side information cannot lower entropy"]
    why: Half an hour ago is a much closer neighbour than “it is summer”. The nearest neighbour usually knows the most.
    sec: three-names
  - q: As two things become more similar, what happens to the conditional entropy of one given the other?
    a: It goes down
    wrong: ["It goes up", "It stays the same", "It becomes negative"]
    why: Similarity is mutual information, the bits saved. More saved means fewer bits still needed, i.e. lower conditional entropy.
    sec: three-names
  - q: Which of these does “conditioning never hurts” NOT promise?
    a: That every single message gets cheaper
    wrong: ["That the average cost does not go up", "That independent side information leaves the cost unchanged", "That the saving is measured in bits"]
    why: The promise is about the average. In winter the sky report costs more with the almanac than the year's average does.
    sec: fine-print
---

The season almanac saved 0.16 bits per sky report. Now ask the question backwards. Suppose the harbour office lost its calendar and could only read the sky reports. How much would one report tell it about the season?

Exactly 0.16 bits.

That is no coincidence. It is a property of the number itself, and it is the first clue that this number is more fundamental than “what the almanac saves”.

## Bits saved by knowing {#bits-saved}

::: define mutual-information
- **What it is:** the number of bits that knowing $\vY$ saves when describing $\vX$:

  $$
  \vI(\vX;\vY) = \underbrace{\vH(\vX)}_{\text{bits without } \vY} - \underbrace{\vH(\vX \mid \vY)}_{\text{bits with } \vY}
  $$ {#eq-mutual-information}

- **Example:** for the sky and the season, $1.75 - 1.59 = 0.16$ bits per report.
- **Easy to confuse with:** correlation. Mutual information is measured in bits, works for symbols as well as numbers, and catches any kind of dependence.
:::

::: aside reminder Conditional entropy
$\vH(\vX \mid \vY)$ is the average number of bits still needed for $\vX$ when $\vY$ is known; it is never more than $\vH(\vX)$ on average ([[#school-side-information]]).
:::

Now run it the other way. The season, one of four equally likely, has $\vH(\vY) = 2$ bits. After seeing one sky report, the season is still uncertain. The archive shows by how much: turn the almanac's question around and ask, for each kind of sky, which seasons its reports came from.

::: dataset fig-mi-sky-backwards sky view=bysky,seasons hl=fog metrics=seasonGivenSky,mi,condH
**The sky archive, read backwards.** *Season by sky:* for each sky report, the share of its reports that fell in spring, summer, autumn and winter (bars); the dashed ticks are what the almanac implies. Click a sky to select its reports. *Sky by season:* the forward view of [[#school-side-information]]. *Numbers:* how much of the season is left uncertain after one report, and the bits saved in each direction. Synthetic, seeded data.
:::

A fog report points at winter: five fog reports in eight fall there. A sunny report leans to summer and spring. But every bar group still holds all four seasons, so a report only hints. On average $\vH(\vY \mid \vX) = 1.84$ bits of the season remain. The difference is $2 - 1.84 = 0.16$ bits — the same number. **Mutual information is symmetric:** what the season tells about the sky equals what the sky tells about the season.

The figure draws this as two overlapping bars, and lets you swap the season for other kinds of side information.

::: figure fig-mi-bars siInfoBars
**Two overlapping bars.** Top bar: the entropy of the sky report $\vH(\vX)$, 1.75 bits. Bottom bar: the entropy of what the receiver knows, $\vH(\vY)$. Their overlap (violet) is the mutual information $\vI(\vX;\vY)$; the rest of the top bar is what must still be sent, $\vH(\vX \mid \vY)$; the rest of the bottom bar is $\vH(\vY \mid \vX)$. All lengths are drawn to one scale in bits. Choose what the receiver knows: the season (Gull Rock's almanac), the previous report (with a **stickiness** slider: the chance that the sky simply carries on from half an hour before; otherwise the next report is drawn afresh from the sky distribution — an illustrative model, not measured data), nothing, or the report itself.
:::

::: try
1. **Nothing:** the bottom bar vanishes and all 1.75 bits must be sent.
2. **The report itself:** the bars coincide. Knowing $\vX$ saves all of $\vH(\vX)$.
3. **The previous report**, stickiness 0: no overlap. Stickiness 0.8: about 1 bit saved. 0.95: nearly 1.5.
:::

::: takeaway
- Mutual information $\vI(\vX;\vY) = \vH(\vX) - \vH(\vX \mid \vY)$ is the number of bits that knowing $\vY$ saves.
- It is symmetric: $\vH(\vY) - \vH(\vY \mid \vX)$ gives the same number.
- It is 0 exactly when $\vX$ and $\vY$ are independent, and at most the entropy of either.
:::

## Three names, one number {#three-names}

People describe the same saving in at least three everyday ways. On this site all three mean mutual information, in bits.

::: define redundancy
- **What it is:** the bits a message spends on things the receiver could have predicted.
- **Example:** a sky report coded with the year-round code spends 0.16 bits per report on what the season already said, for a receiver who knows the season.
- **Easy to confuse with:** repetition. Redundancy need not look like repeated bytes; any predictability counts.
:::

| everyday phrase | what it means here | in bits |
|---|---|---|
| “the reports are redundant given the season” | the reports spend bits on what the season predicts | $\vI(\vX;\vY)$ |
| “today's sky is similar to the last report” | knowing one makes the other cheaper to send | $\vI(\vX;\vY)$ |
| “the sky is predictable from the season” | the season narrows down the sky | $\vI(\vX;\vY)$ |

::: aside reminder Order-0 entropy
The entropy computed from symbol frequencies alone, ignoring which symbols came before. For the sky it is 1.75 bits.
:::

The figure's second example makes the point sharper. With an assumed stickiness of 0.8, the **previous report** saves 1.01 bits per sky report — six times what the season saves. The sticky sky of [[#school-entropy]] is four weeks of exactly this model; here it is again, with a table of what follows what.

::: dataset fig-mi-sticky sticky view=transitions,mosaic hl=changes metrics=order0,condH,saved,repeats
**The sticky sky, neighbour by neighbour.** *What follows what:* each row is the sky of one report, each column the sky of the next; a cell gives the share of the row, shaded in the next report's colour, and the outlined diagonal is “the sky carries on”. *Four weeks, in order:* the reports one row per day, with every change of sky highlighted. *Numbers:* the order-0 entropy, the entropy left when the previous report is known, and the difference. An illustrative model (stickiness 0.8), seeded.
:::

Every row of the table is dominated by its diagonal cell: whatever the sky did half an hour ago, it most likely does again. Each row is therefore a sharp distribution, far sharper than any season's. Averaged over the rows, the next report costs 0.74 bits instead of 1.75, and the 1.01 bits between them are the mutual information. Half an hour ago is a much closer neighbour than “it is summer”. The [[order-0-entropy]] of [[#school-entropy]] ignores order, so it leaves this whole bit on the table.

Watch the direction of the arrows, because it is easy to get backwards:

:::: compare When the side information becomes more useful…
::: col …these go up
- mutual information $\vI(\vX;\vY)$
- redundancy, similarity, predictability (the same bits by other names)
:::
::: col …these go down
- conditional entropy $\vH(\vX \mid \vY)$
- the bits per report on the radio link
:::
::::

The first draft of this project mixed up exactly these two columns (the story is told in [[#missed-mutual-information-direction]]).

::: takeaway
- Redundancy, similarity and predictability are mutual information under other names, and are measured in bits.
- More of them means less conditional entropy, and fewer bits on the wire.
- The closest neighbour (the previous report) knows far more than a broad context (the season).
:::

## What “never hurts” does not promise {#fine-print}

[[#school-side-information]] showed that conditioning never increases entropy on average. That is a theorem. It is also easy to over-read. Four pieces of fine print:

1. **On average, not every time.** In winter the almanac makes the sky harder to guess (1.98 bits against 1.75). Only the average over seasons is guaranteed to fall.
2. **Only if the receiver really has $\vY$.** A summer-coded report is gibberish to an office without the almanac.
3. **Only for the true probabilities.** A coder working with wrong numbers can lose bits; [[#school-arithmetic]] prices that mistake.
4. **Delivering $\vY$ is not free.** The almanac had to be printed, shipped and kept.

::: theme every-tax
Point 4 is this theme in miniature. The almanac saves 0.16 bits per report, but it costs something to get it to both ends. Here it is printed once and used for years, so its cost per report is tiny. That will not always be the case — Part I's [[trained-dictionary]] had to be shipped too, and the question “is the saving bigger than the tax?” will follow every kind of side information on this site.
:::

::: takeaway
- Conditioning lowers entropy on average, not in every case.
- The guarantee needs the side information at the receiver and correct probabilities.
- Getting side information to the receiver has its own cost, which the saving must beat.
:::
