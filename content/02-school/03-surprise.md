---
title: Surprise
lede: Some news tells you more than other news. Surprisal puts a number on it, in bits, computed from one thing only — how probable the news was.
group: Information
cards:
  - q: 'Fog has probability $\vp = 1/8$ at Gull Rock. What is the surprisal of a fog report?'
    a: 3 bits
    wrong: ["8 bits", "1/8 of a bit", "0.125 bits"]
    why: 'Surprisal is $\log_2(1/\vp) = \log_2 8 = 3$ — a one-in-eight event is like naming one of eight equally likely things.'
    sec: surprisal
  - q: What is the surprisal of an outcome that is certain ($\vp = 1$)?
    a: 0 bits
    wrong: ["1 bit", "Infinitely many bits", "It is undefined"]
    why: 'News you knew already tells you nothing: $\log_2(1/1) = 0$.'
    sec: surprisal
  - q: 'A sunny report on one day and a fog report on another, unrelated day. What is their total surprisal?'
    a: 4 bits
    wrong: ["3 bits", "1/16 of a bit", "16 bits"]
    why: 'Independent probabilities multiply (½ × ⅛ = 1/16) and their logarithms add: 1 + 3 = 4 bits.'
    sec: surprisal
  - q: What must the probabilities of a distribution add up to?
    a: '1'
    wrong: ["The number of outcomes", "0", "100 bits"]
    why: A distribution lists every possible outcome, and in the long run one of them always happens. Their shares add to one whole.
    sec: probability
  - q: If an outcome becomes half as likely, its surprisal…
    a: grows by exactly 1 bit
    wrong: ["doubles", "halves", "grows by 2 bits"]
    why: '$\log_2(2/\vp) = \log_2(1/\vp) + 1$. Each halving of the probability is one more fair yes/no question.'
    sec: surprisal
---

Two reports reach the harbour office from Gull Rock's sky camera, a day apart. One says *sunny*. The other says *fog*.

The forecaster barely looks up at the first. Half of all reports say sunny; she would have guessed it. The second one makes her reach for the logbook, because fog comes only about one report in eight. Both messages are one word long, yet one of them is clearly *more news* than the other.

This page turns that feeling into a number of bits.

## How often: probability and distribution {#probability}

The station has been sending sky reports for years, so we know how often each one comes up.

| sky report | share of all reports | one report in… |
|---|---:|---:|
| sunny | ½ | 2 |
| cloudy | ¼ | 4 |
| rain | ⅛ | 8 |
| fog | ⅛ | 8 |
| **all four** | **1** | |

These shares are probabilities, and the whole list is a distribution.

::: define probability
- **What it is:** a number $\vp$ between 0 and 1 that says how often an outcome happens in the long run. $\vp = 0$ means never, $\vp = 1$ means always.
- **Example:** a sunny report has $\vp = ½$: over many reports, about half say sunny.
- **Easy to confuse with:** the share in a small sample. Ten reports in a row can easily contain seven sunny ones. The probability is what the share settles to over a very long run.
:::

A [[=distribution]] is the full list: every possible outcome with its probability. Because one of the outcomes always happens, the probabilities of a distribution add up to exactly 1. From now on, *the sky distribution* means the table above: sunny ½, cloudy ¼, rain ⅛, fog ⅛.

::: note toy Where do these numbers come from?
From counting the station's archive. Counting is never perfect — a year of reports gives only an estimate. The next page, [[#school-entropy]], shows how good such an estimate is.
:::

::: takeaway
- A probability $\vp$ is the long-run share of an outcome, between 0 and 1.
- A distribution lists all outcomes with their probabilities; they add up to 1.
- The Gull Rock sky distribution is sunny ½, cloudy ¼, rain ⅛, fog ⅛.
:::

## Surprisal: rare news costs more bits {#surprisal}

Go back to twenty questions from [[#school-bits]]. Suppose the forecaster knows the sky distribution and must find out today's report with yes/no questions. Her best plan:

1. “Is it sunny?” — a fair 50/50 question, since sunny has probability ½. If yes, she is done after **1** question.
2. If not: “Is it cloudy?” — of the remaining half, cloudy is exactly half, so this is fair too. Done after **2**.
3. If not: “Is it rain?” — rain and fog are equally likely, fair again. Rain or fog: **3** questions.

::: aside reminder A bit
A [[bit]] is the answer to one fair yes/no question; $\log_2$ of a number counts how often you can halve it before one is left ([[#school-bits]]).
:::

Every question in this plan is a fair coin, so every answer is worth one full bit. A one-in-two event costs one question, a one-in-four event two, a one-in-eight event three. In general an outcome that happens “once in $1/\vp$” costs as many questions as naming one of $1/\vp$ equally likely things.

::: define surprisal
- **What it is:** how surprising one outcome is, in bits:

  $$
  \text{surprisal} = \underbrace{\log_2}_{\text{count the halvings}} \underbrace{\frac{1}{\vp}}_{\text{“once in …”}} = -\log_2 \vp \quad \text{bits}
  $$ {#eq-surprisal}

- **Example:** fog, $\vp = ⅛$: $\log_2 8 = 3$ bits. Sunny: 1 bit.
- **Easy to confuse with:** importance. A rare report is not more *important*; it is more *informative*, because you could not have guessed it.
:::

| sky report | $\vp$ | one in… | surprisal |
|---|---:|---:|---:|
| sunny | ½ | 2 | 1 bit |
| cloudy | ¼ | 4 | 2 bits |
| rain | ⅛ | 8 | 3 bits |
| fog | ⅛ | 8 | 3 bits |

The figure shows the whole curve. Rare outcomes sit on the left, where the curve shoots up; certain ones sit at the right end, where it touches zero.

::: figure fig-surprise-curve siSurprisal
**Surprisal against probability.** Horizontal axis: the probability $\vp$ of an outcome; vertical axis: its surprisal $\log_2(1/\vp)$ in bits (the curve is cut at 8 bits, $\vp = 1/256$). The coloured dots are the four sky reports (rain and fog share a dot). Drag the knob along the curve, or focus it and use the arrow keys (each press multiplies $\vp$ by about 1.19); the readout gives $\vp$, “once in …” and the surprisal. **Axis in halvings** switches to a logarithmic axis on which every step to the left halves $\vp$.
:::

::: try
1. Drag the knob to $\vp = 1$: the surprisal is 0. News you already knew carries no information.
2. Drag it to about 1/1000: about 10 bits, the same as naming one of 1,024 things.
3. Switch to the axis in halvings. The curve becomes a straight line: each halving of $\vp$ adds exactly one bit.
:::

Why a logarithm, and not simply $1/\vp$? Because of how independent events combine. Take a sunny report on one day and a fog report on another, unrelated day. The chance of that pair is $½ × ⅛ = 1/16$, and its surprisal is $\log_2 16 = 4$ bits — which is $1 + 3$. **Probabilities of independent events multiply; their surprisals add.** Bits sent over a radio link add up too, so this is exactly the bookkeeping we want.

::: note warning “Independent” is an assumption
Two noon reports on different days are close to independent. Two reports half an hour apart are not: fog lingers, and a sunny sky usually stays sunny. Surprisals of such neighbours do not simply add. [[#school-mutual-information]] measures how much the neighbour gives away.
:::

::: takeaway
- Surprisal $= \log_2(1/\vp)$ bits: the number of fair yes/no questions a one-in-$1/\vp$ outcome costs.
- Sunny costs 1 bit, cloudy 2, rain and fog 3; a certain outcome costs nothing.
- Each halving of the probability adds one bit, and surprisals of independent events add.
:::
