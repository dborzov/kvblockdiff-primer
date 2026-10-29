---
title: Codes and Huffman
nav: Codes and Huffman
lede: How to turn sky reports into bits so that the average cost meets the entropy — Huffman's seventy-year-old recipe — and why whole bits sometimes fall short.
group: Coding
cards:
  - q: Which code does Huffman's recipe give for the Gull Rock sky (sunny ½, cloudy ¼, rain ⅛, fog ⅛)?
    a: sunny 0, cloudy 10, rain 110, fog 111
    wrong: ["sunny 00, cloudy 01, rain 10, fog 11", "sunny 1, cloudy 0, rain 01, fog 10", "sunny 0, cloudy 1, rain 10, fog 11"]
    why: Merge rain and fog (⅛ + ⅛), then that node with cloudy (¼ + ¼), then with sunny. Reading from the top gives lengths 1, 2, 3, 3 — the surprisals.
    sec: huffman
  - q: What does the prefix property of a code guarantee?
    a: A stream of codewords can be cut back into symbols without separators
    wrong: ["Every codeword has the same length", "The code reaches the entropy exactly", "Rare symbols get short codewords"]
    why: No codeword is the beginning of another, so the decoder knows a codeword has ended the moment it matches one.
    sec: prefix
  - q: In Huffman's recipe, which two items are merged at each step?
    a: The two least likely
    wrong: ["The two most likely", "The most likely with the least likely", "The two most recent"]
    why: The rarest items end up deepest in the tree and get the longest codewords.
    sec: huffman
  - q: In summer (sunny ¾, cloudy ⅛, rain and fog 1/16 each) the entropy is 1.19 bits. What does the Huffman code average?
    a: 1.375 bits
    wrong: ["1.19 bits", "1.75 bits", "1 bit"]
    why: 'Codeword lengths are whole bits (1, 2, 3, 3). Sunny''s surprisal is only 0.415 bits, but its codeword costs a whole bit.'
    sec: whole-bits
  - q: A codeword of length 3 bits implicitly assumes its symbol has probability…
    a: 1/8
    wrong: ["3/8", "1/3", "1/16"]
    why: 'A codeword of $\ell$ bits behaves as a bet on probability $2^{-\ell}$. When the true probability differs, the code pays extra.'
    sec: whole-bits
---

Here are two ways to radio the sky over the link from Gull Rock.

- **Plan A** gives every report two bits: sunny `00`, cloudy `01`, rain `10`, fog `11`.
- **Plan B** gives the reports different lengths: sunny `0`, cloudy `10`, rain `110`, fog `111`.

A morning's eight reports — sunny, sunny, cloudy, sunny, fog, sunny, rain, cloudy — come out like this:

```text the same eight reports under both plans
plan A   00 00 01 00 11 00 10 01          16 bits
plan B   0  0  10 0  111 0 110 10          14 bits
```

Plan B uses 14 bits, 1.75 per report — the [[entropy]] of the sky. Notice anything about its codeword lengths? They are 1, 2, 3 and 3: the surprisals of sunny, cloudy, rain and fog.

## Codewords and prefix codes {#prefix}

::: define code
- **What it is:** a rule that turns each symbol into a string of bits, its *codeword*, and back. A *prefix code* is one in which no codeword is the beginning of another.
- **Example:** plan B. No codeword starts with `0` except sunny's, and `10`, `110`, `111` never begin one another.
- **Easy to confuse with:** encryption. A code here hides nothing; both ends know it, like Morse code.
:::

On the radio, the spaces in the box above do not exist. Plan B's morning arrives as one run of bits: `00100111011010`. The office reads it from the left and stops each time the bits so far match a codeword:

1. `0` → sunny. `0` → sunny.
2. `1` matches nothing yet, `10` → cloudy. `0` → sunny.
3. `1`, `11`, `111` → fog. `0` → sunny. `110` → rain. `10` → cloudy.

There is never a doubt, because of the prefix property. Break it and trouble starts at once: with sunny `0`, cloudy `1`, rain `01`, fog `10`, the bits `01` could be rain, or sunny followed by cloudy.

A prefix code is easiest to picture as a tree. Start at the top; `0` goes left and `1` goes right; each codeword is a leaf. Short codewords sit near the top and use up room: once sunny owns `0`, every other codeword must start with `1`. That is the trade the code has to get right.

::: takeaway
- A code maps symbols to codewords; a prefix code can be read back without separators.
- Plan B (`0`, `10`, `110`, `111`) averages 1.75 bits per sky report, exactly the entropy.
- Short codewords are scarce: giving one symbol a short codeword forces longer ones on the others.
:::

## Huffman's recipe {#huffman}

In 1951 a student at MIT, David Huffman, was offered a choice: sit the final exam or find the best possible prefix code for given probabilities. He found it. His recipe fits in four lines:

1. Write down each symbol with its probability.
2. Merge the two least likely items into one node whose probability is their sum.
3. Repeat until one node is left — the top of the tree.
4. Read each codeword off the path from the top: left branch `0`, right branch `1`.

::: define huffman
- **What it is:** the prefix code built by the recipe above. Among all prefix codes for known probabilities, none has a shorter average codeword.
- **Example:** for the Gull Rock sky it gives plan B: `0`, `10`, `110`, `111`.
- **Easy to confuse with:** the best code of any kind. Huffman is the best code with *whole-bit* codewords, one per symbol; the next section shows what that restriction costs.
:::

Step through it in the figure, then change the counts.

::: figure fig-codes-huffman siHuffman
**Building a Huffman code.** Leaves (bottom) are the four sky reports with their probabilities; each merge adds a node (small circle, its probability beside it) above the two items it joins, and the newest merge is outlined in the accent colour. Step through with **Next** or the dots; the last step reads off the codewords (left branch 0, right branch 1, heavier side on the left). Presets: the Gull Rock year, summer, a lopsided sky (sunny 29 of 32 reports) and all equal; or set the four counts with the sliders (probability = count ÷ total). The table lists probabilities, surprisals and codeword lengths; the tiles compare the average codeword length with the entropy.
:::

::: try
1. **Gull Rock year:** the average codeword is 1.75 bits, exactly the entropy.
2. **All equal:** every codeword gets 2 bits — plan A is the Huffman code when nothing is more likely than anything else.
3. **Summer:** the same tree as the year, but now the average (1.375 bits) sits 16 % above the entropy (1.19 bits).
4. **Lopsided:** 1.16 bits against an entropy of 0.60.
:::

The recipe is short in code too:

```python Huffman codeword lengths with a priority queue
import heapq

def huffman_lengths(p):
    heap = [(q, i, {s: 0}) for i, (s, q) in enumerate(p.items())]
    heapq.heapify(heap)
    i = len(heap)
    while len(heap) > 1:
        q1, _, a = heapq.heappop(heap)          # the two least likely groups ...
        q2, _, b = heapq.heappop(heap)
        merged = {s: d + 1 for s, d in (a | b).items()}   # ... merge: one bit deeper
        heapq.heappush(heap, (q1 + q2, i, merged)); i += 1
    return heap[0][2]

sky = {'sunny': 1/2, 'cloudy': 1/4, 'rain': 1/8, 'fog': 1/8}
L = huffman_lengths(sky)
print(L)                                     # {'sunny': 1, 'cloudy': 2, 'rain': 3, 'fog': 3}
print(sum(sky[s] * L[s] for s in sky))       # 1.75
```

::: takeaway
- Huffman: keep merging the two least likely items; read codewords off the tree.
- It gives the shortest average of any prefix code with one whole-bit codeword per symbol.
- For the Gull Rock sky it gives `0`, `10`, `110`, `111` and reaches the entropy, 1.75 bits.
:::

## Whole bits only {#whole-bits}

The sky's year-round probabilities are all powers of ½, so every surprisal is a whole number and Huffman hits the entropy exactly. That is luck. In summer, sunny comes three times in four. Its surprisal is $\log_2(4/3) \approx 0.415$ bits — but no codeword can be shorter than one bit.

| source | entropy | Huffman average | overhead |
|---|---:|---:|---:|
| Gull Rock, whole year | 1.75 | 1.75 | 0 % |
| Gull Rock, summer | 1.19 | 1.375 | 16 % |
| lopsided sky (sunny 29 of 32) | 0.60 | 1.16 | 93 % |

The more lopsided the source, the worse the rounding. A source that says the same thing 99 times in 100 has an entropy of 0.08 bits, yet Huffman still charges at least 1 bit per symbol.

There is a neater way to see the loss. A codeword of $\ell$ bits behaves like a bet that its symbol has probability $2^{-\ell}$: 1 bit bets on ½, 2 bits on ¼, 3 bits on ⅛. Huffman's summer code is `0`, `10`, `110`, `111` — the same as the year's — so it bets that summer looks like the year, with sunny at ½. Summer's sunny is really ¾. The wrong bet is what costs the extra 0.19 bits per report.

::: theme predict-correct
A code is a guess about the source: each codeword length is a bet on how likely its symbol is. When the bets match the true probabilities, the average cost meets the entropy. When they do not, every report pays for the gap.
:::

There are two ways out. Code several reports together, like the digits of [[#school-bits]], so that the rounding is shared out. Or drop whole-bit codewords altogether, which is what the next page does.

::: takeaway
- Huffman codewords are whole bits, so a symbol with surprisal below 1 bit still costs 1 bit.
- Summer: 1.375 bits against an entropy of 1.19; a lopsided sky loses almost twice its entropy.
- A codeword of $\ell$ bits is a bet on probability $2^{-\ell}$; wrong bets cost bits.
:::
