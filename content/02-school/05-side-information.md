---
title: Side information
lede: When both ends of the radio link own the same almanac, the station can send less. Conditional entropy says how much less — and why, on average, knowing more never costs more.
group: Information
cards:
  - q: With the season almanac at both ends, how many bits per sky report does the Gull Rock station need on average?
    a: About 1.59 bits
    wrong: ["1.75 bits", "1.19 bits", "0.16 bits"]
    why: 'The average of the four seasons'' entropies, ¼ × (1.42 + 1.19 + 1.76 + 1.98) ≈ 1.59. That is $\vH(\vX \mid \vY)$; it saves 0.16 bits against the 1.75 of the year.'
    sec: conditional
  - q: In winter, the sky's entropy is 1.98 bits — more than the 1.75 bits of the whole year. Does that contradict “conditioning never increases entropy”?
    a: No — the rule holds on average over the seasons, not in every season
    wrong: ["Yes — the almanac must be wrong", "Yes — so the almanac should not be used in winter", "No — winter is simply too rare to count"]
    why: Knowing that it is winter makes the sky harder to guess. Averaged over all four seasons, the almanac still saves 0.16 bits per report.
    sec: never-more
  - q: When does knowing the season save nothing at all, $\vH(\vX \mid \vY) = \vH(\vX)$?
    a: When every season's sky looks exactly like the whole year's
    wrong: ["When the seasons are equally long", "When the sky has four possible reports", "When the almanac is printed only once"]
    why: Then the season and the sky are independent. In the figure, this is almanac sharpness 0.
    sec: never-more
  - q: What must be true for side information to make the station's messages cheaper?
    a: The receiver must already have it when the message arrives
    wrong: ["It must be sent along with every message", "It must be exactly correct every day", "It must have more entropy than the message"]
    why: The office decodes a summer-coded report with its own copy of the almanac. Without that copy the cheap message is unreadable.
    sec: almanac
---

It is the 14th of July. Before the next sky report arrives, the forecaster opens the harbour office's almanac at *summer*: “Gull Rock: sunny three reports in four.” A copy of the same almanac sits in the station's memory on the rock.

She now knows more than the year's distribution told her. Shouldn't the station be able to say less?

## The almanac on both ends {#almanac}

The almanac is one table. It splits the station's reports by season — out of every 64 reports, 16 fall in each season:

| season | sunny | cloudy | rain | fog | reports |
|---|---:|---:|---:|---:|---:|
| spring | 10 | 4 | 1 | 1 | 16 |
| summer | 12 | 2 | 1 | 1 | 16 |
| autumn | 6 | 6 | 3 | 1 | 16 |
| winter | 4 | 4 | 3 | 5 | 16 |
| **whole year** | **32** | **16** | **8** | **8** | **64** |

Notice the bottom row: 32, 16, 8 and 8 out of 64 are exactly the sky distribution of [[#school-surprise]], ½, ¼, ⅛, ⅛. The almanac does not change the year. It only splits it into four seasons, each with a [[distribution]] of its own. Summer reads sunny ¾, cloudy ⅛, rain and fog 1/16 each; winter is foggy and much more mixed.

::: define side-information
- **What it is:** something the receiver already knows that is relevant to the message. Here it is the season, which both ends read off the calendar, together with the almanac that says what each season's sky is like. We write it $\vY$.
- **Example:** in summer, the station codes its report with summer's probabilities; the office decodes with the same page of the same almanac.
- **Easy to confuse with:** extra information sent along with the message. Side information is *not* in the message. It is already on both ends.
:::

Each season's sky has its own [[entropy]] — the average [[surprisal]] when you know the season:

| season | entropy of the sky in that season |
|---|---:|
| spring | 1.42 bits |
| summer | 1.19 bits |
| autumn | 1.76 bits |
| winter | 1.98 bits |
| *no almanac (whole year)* | *1.75 bits* |

::: theme side-info
The almanac is this theme's first appearance in Part II, and Part I's [[trained-dictionary]] was the same move: something agreed in advance, kept at both ends, that makes every message cheaper. The catch is the same too. If the office loses its almanac, the station's summer-coded reports cannot be read.
:::

::: takeaway
- Side information $\vY$ is something both ends already know; it is not sent with the message.
- The almanac splits the year's sky into four seasonal distributions whose average is the year.
- Some seasons are easier to predict than the year (summer: 1.19 bits), some harder (winter: 1.98 bits).
:::

## Conditional entropy {#conditional}

Every season lasts a quarter of the year. So with the almanac on both ends, the average cost per report is the average of the four seasons' entropies:

$$
\vH(\vX \mid \vY) = \sum_{\text{seasons}} \underbrace{\vp(\text{season})}_{\text{how often}} \cdot \underbrace{\vH(\vX \mid \vY = \text{season})}_{\text{bits per report in that season}}
$$ {#eq-conditional-entropy}

::: aside reminder Entropy
$\vH(\vX) = \sum_{\vi} \vp_{\vi} \log_2(1/\vp_{\vi})$: the average surprisal of the source $\vX$, here the next sky report ([[#school-entropy]]). The sky's entropy over the whole year is 1.75 bits.
:::

For Gull Rock:

$$
\vH(\vX \mid \vY) = \tfrac14\,(1.42 + 1.19 + 1.76 + 1.98) \approx 1.59 \text{ bits per report.}
$$

::: define conditional-entropy
- **What it is:** $\vH(\vX \mid \vY)$, read “the entropy of $\vX$ given $\vY$”: the average number of bits still needed to describe $\vX$ when $\vY$ is already known.
- **Example:** 1.59 bits per sky report when the season is known, against 1.75 without.
- **Easy to confuse with:** the entropy in one particular season, $\vH(\vX \mid \vY = \text{winter})$. The conditional entropy is the average over all seasons.
:::

The almanac saves 0.16 bits per report, about 9 %. The figure lets you make the almanac more or less informative and watch the saving.

::: figure fig-side-almanac siJointTable
**The season almanac as a table.** Rows: seasons; columns: sky reports; each cell counts reports out of 64, shaded by the sky's colour (darker = more). “Bits if known” is the entropy of the sky in that season; the bottom row is the whole year. Click a season to compare its sky (coloured bars) with the whole year's (grey bars) in the plot. **Almanac sharpness** blends between a useless almanac (0: every season looks like the year), Gull Rock's almanac (½, the table above) and the sharpest almanac these seasons allow (1). The bottom row never changes. Tiles: entropy without the almanac, conditional entropy with it, and the saving in bits per report.
:::

::: try
1. Set the sharpness to 0. Every season looks like the year, and the almanac saves nothing: 1.75 bits.
2. Set it to 1. Summer is always sunny, and the cost falls to 0.95 bits per report.
3. At Gull Rock's ½, click through the seasons. Which ones are *harder* to predict than the year?
:::

::: note intuition A sharp almanac about summer is still a vague almanac
“Sunny three times in four” sounds very informative, yet the whole almanac saves only a tenth of the cost. It is sharp about summer and vague about the rest of the year. Knowing the gist of a situation often buys surprisingly few bits — a pattern that will come back, in a much more expensive setting, in Part IV.
:::

::: takeaway
- $\vH(\vX \mid \vY)$ is the average, over the values of $\vY$, of the entropy of $\vX$ when that value is known.
- The Gull Rock almanac brings the sky from 1.75 to 1.59 bits per report, a saving of 0.16 bits.
- The sharper the almanac, the bigger the saving.
:::

## Never more, on average {#never-more}

Look at winter again: 1.98 bits, *more* than the 1.75 bits of the whole year. Knowing that it is winter makes the next report harder to guess. So can the almanac ever make things worse on average? No, and the reason fits in one table.

Suppose the station ignored the almanac and kept charging every report its year-round surprisal: 1 bit for sunny, 2 for cloudy, 3 for rain or fog. How much would that cost in each season?

| season | year-round prices, paid in that season | the season's own entropy |
|---|---:|---:|
| spring | 1.50 bits | 1.42 bits |
| summer | 1.375 bits | 1.19 bits |
| autumn | 1.875 bits | 1.76 bits |
| winter | 2.25 bits | 1.98 bits |
| **average** | **1.75 bits** | **1.59 bits** |

In winter the year-round prices cost 2.25 bits per report: winter's frequent fog is charged 3 bits every time. Winter's own entropy, 1.98 bits, is higher than the year's 1.75 but still *lower than what the year-round code pays in winter*. That holds in every season, because a season's entropy is the floor for any code used in that season. And the year-round prices average exactly 1.75 bits over the year. So the seasonal floors must average at most 1.75 bits too.

::: keycard Conditioning never increases entropy — on average
$$
\vH(\vX \mid \vY) \le \vH(\vX)
$$ {#eq-conditioning}

Equality holds only when $\vY$ tells nothing about $\vX$ — when every season looks like the year.
:::

The left column of the table — what a code built for the wrong distribution pays — has a name of its own, and it will matter again on [[#school-arithmetic]].

::: takeaway
- In a single season the entropy can exceed the year's (winter: 1.98 > 1.75).
- On average over the seasons it cannot: $\vH(\vX \mid \vY) \le \vH(\vX)$.
- The reason: in every season, a code built for that season does at least as well as the year-round code, and the year-round code averages $\vH(\vX)$.
:::
