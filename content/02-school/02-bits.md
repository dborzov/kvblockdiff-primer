---
title: 'Bits: twenty questions'
nav: 'Bits: twenty questions'
lede: The unit everything on this site is measured in. A bit is the answer to one yes/no question, and a handful of them can single out one thing among millions.
group: Information
cards:
  - q: How many yes/no questions does it take to pin down one of 16 equally likely wind directions?
    a: 4
    wrong: ["8", "16", "2"]
    why: 'Each halving question cuts the candidates in two: 16 → 8 → 4 → 2 → 1. That is $\log_2 16 = 4$ questions.'
    sec: one-question
  - q: Why is “Is it north?” a poor first question about the wind direction?
    a: Its answer is almost always “no”, so it rules out only one direction of sixteen
    wrong: ["It cannot be answered with yes or no", "Its answer takes two bits to write down", "North is the most common wind at Gull Rock"]
    why: A good question is one whose answer you cannot guess in advance. A 50/50 question halves the candidates; a lopsided one barely dents them.
    sec: one-question
  - q: How many different things can 10 bits tell apart?
    a: '1,024'
    wrong: ["10", "20", "100"]
    why: 'Every extra bit doubles the count: $2^{10} = 1024$.'
    sec: powers
  - q: When many decimal digits are sent together, about how many bits does each digit cost?
    a: About 3.32 bits
    wrong: ["Exactly 4 bits", "10 bits", "1 bit"]
    why: 'Three digits have 1,000 possibilities and fit in 10 bits (1,024), so 3.33 bits each. In the limit it is $\log_2 10 \approx 3.32$. One digit alone needs 4.'
    sec: powers
  - q: 'Gull Rock sends 48 wind directions a day. Sent as 4 bits each instead of the JSON text "wind_dir":"WSW", a day costs…'
    a: 192 bits instead of 6,144
    wrong: ["48 bits instead of 768", "4 bits instead of 128", "1,536 bits instead of 6,144"]
    why: The JSON text is 16 characters, 128 bits. Four bits a report × 48 reports = 192 bits.
    sec: paying
---

On top of the Gull Rock mast spins a wind vane. It knows sixteen directions — N, NNE, NE, ENE and so on round the compass — and every half hour the station tells the mainland which one it points to. In Part I that took the text `"wind_dir":"WSW"`: sixteen characters, which is 128 binary digits on the radio link.

How few could it be? Before any formula, let us play a party game.

## One question, one bit {#one-question}

In *twenty questions*, one player thinks of something and the others may only ask yes/no questions. Here the station thinks of a wind direction and you ask. The figure keeps the score.

::: figure fig-bits-questions siQuestions
**Twenty questions with the wind vane.** Each tile is one of the possible directions (16 by default; switch to 2–64 possibilities at the top; above 16 they are bearings in degrees). The small digits under each tile are its *address*: its position in the list, written in binary. A secret direction is chosen at random. **Ask a halving question** asks whether the secret lies in the second half of the directions still possible; **Ask “is it …?”** asks about the first one still possible. Each answer is written as 1 (yes) or 0 (no). Ruled-out tiles fade. **New secret** starts again.
:::

Play a few rounds with halving questions only. Whatever the secret, you finish in exactly four questions.

- The first question splits the sixteen into two groups of eight: “Is it one of S … NNW?” Whatever the answer, eight remain.
- The second leaves four, the third two, the fourth one.
- Write each *yes* as 1 and each *no* as 0, and the four answers spell the secret's address. If the vane points WSW, the answers are 1, 0, 1, 1.

::: define bit
- **What it is:** the answer to one yes/no question whose answer you could not guess in advance. We write *yes* as 1 and *no* as 0. It is the unit of information on this whole site.
- **Example:** four bits, `1011`, single out WSW among sixteen directions.
- **Easy to confuse with:** a binary digit stored in memory. The two coincide when every stored digit answers a fair 50/50 question. On later pages we will meet stored digits that carry less than one bit of information each — that gap is exactly what compression removes.
:::

Now try the other button. “Is it N?” is a perfectly legal question, but its answer is almost always *no*, and a *no* rules out a single direction. With bad luck you need fifteen of them. The lesson is worth keeping: **a question earns a full bit only when its two answers are equally likely.** A lopsided question earns less. The next page, [[#school-surprise]], measures exactly how much less.

::: try
1. Use only halving questions with 16 possibilities. Every game ends after 4 questions, and your answers equal the address under the secret tile.
2. Use only “is it …?” questions. Count how many you need on average over a few secrets.
3. Switch to 2 possibilities (one question) and to 64 (six questions).
4. Ask one “is it …?” question first, then only halving questions. You still win, but the answers no longer spell the address.
:::

::: takeaway
- A bit is the answer to one fair yes/no question.
- Halving questions single out one of 16 equally likely directions in 4 questions; the answers, written as 1s and 0s, are its binary address.
- Lopsided questions (“is it north?”) are legal but earn less than a bit each.
:::

## n bits tell 2ⁿ things apart {#powers}

Every extra question doubles the number of things you can tell apart. With $n$ questions (here $n$ is just a count of questions) you can single out one of $2^n$ equally likely possibilities.

| questions | possibilities | for example |
|---:|---:|---|
| 1 | 2 | heads or tails |
| 2 | 4 | the four sky reports: sunny, cloudy, rain, fog |
| 4 | 16 | the wind vane's directions |
| 8 | 256 | one byte — every value the station's 8-bit chip can hold |
| 10 | 1,024 | about a thousand |
| 20 | 1,048,576 | twenty questions: one thing in a million |

Read the table backwards and you get the logarithm. $\log_2$ of a number counts how many times you can halve it before one is left: $\log_2 16 = 4$, $\log_2 1024 = 10$.

$$
\text{bits needed} = \log_2(\text{number of equally likely possibilities})
$$ {#eq-bits-log}

What if the count is not a power of two? The ten decimal digits need $\log_2 10 \approx 3.32$ bits, and you cannot ask a third of a question. One digit alone costs four questions. But send several digits together and the waste shrinks:

```python several digits at once: the cost per digit falls towards log2(10)
import math
for k in [1, 2, 3, 6, 9]:
    n = math.ceil(math.log2(10 ** k))      # questions for k digits at once
    print(k, n, round(n / k, 3))            # digits, questions, questions per digit
# 1 4 4.0
# 2 7 3.5
# 3 10 3.333
# 6 20 3.333
# 9 30 3.333
```

Three digits have 1,000 possibilities, and 1,000 fits under $2^{10} = 1024$. So three digits cost 10 bits, 3.33 bits each. **Fractions of a bit are real — on average, over many symbols.** Keep that in mind; [[#school-arithmetic]] builds a coder that does exactly this.

::: takeaway
- $n$ bits tell $2^n$ equally likely things apart; one byte (8 bits) tells 256 apart.
- Going the other way, $\log_2$ of the number of possibilities is the number of bits needed.
- When the count is not a power of two, grouping symbols brings the average cost down to the logarithm, fractions included.
:::

## Paying by the bit {#paying}

The radio link from Gull Rock is paid by the bit. So the game has a price list.

| how the direction is sent | bits per report | per day (48 reports) | per year |
|---|---:|---:|---:|
| as JSON text, `"wind_dir":"WSW"` | 128 | 6,144 | 2,242,560 |
| as a 4-bit address | 4 | 192 | 70,080 |

The same information, thirty-two times cheaper. Nothing clever has happened yet: we only stopped paying for letters, quotes and a key name that the mainland already knows.

::: theme bits-unit
This is the theme in its simplest form. Whatever we measure later — surprise, similarity, what a dictionary saves — will be counted in bits, because bits are what the radio link charges for. Bits per value × number of values = the size on the wire.
:::

There is a hidden assumption in the 4 bits: all sixteen directions are equally likely. At Gull Rock they are not. Here are three weeks of the vane's readings, 1,024 of them, drawn as a *wind rose*: one petal per direction, its area proportional to how many readings came from there.

::: dataset fig-bits-wind-rose wind view=rose,timeline hl=northeast metrics=dirTop,dirSW,dirNE,dirBits
**Where the Gull Rock wind comes from.** *Rose:* one petal per compass direction; a petal's area is proportional to the number of readings from that direction (dashed rings: 25 %, 50 % and 100 % of the largest petal). Hover a petal for its count and its 4-bit address from the game above; click it to select those readings. The highlight marks the north-easterlies. *Three weeks:* the wind speed over time, with the same readings marked. *Table:* every reading with its direction. *Numbers:* how lopsided the vane is. Synthetic, seeded data; the same readings come back on [[#school-fixed-length]] for their speeds.
:::

The south-west petals dwarf the rest: SSW, SW and WSW together bring more than half of all readings, while the opposite three bring under 5 %, almost all of them in two short spells. A question like “Is it one of SSW, SW, WSW?” is nearly a fair coin here, and that is the trick. When some answers are more likely than others, a clever questioner asks about the likely ones first and averages fewer than 4 questions — about 3.4 for this vane. Measuring that takes two more ideas, probability and surprise. They are the subject of the next page.

::: takeaway
- On a link paid by the bit, sending a 4-bit address instead of text cuts the wind direction's cost 32-fold.
- 4 bits per direction assumes all sixteen are equally likely. The Gull Rock vane points south-west half the time, and uneven odds like these allow fewer bits on average: about 3.4.
:::
