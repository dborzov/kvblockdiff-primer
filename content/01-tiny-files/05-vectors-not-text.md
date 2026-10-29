---
title: Our files are lists of numbers
nav: Lists of numbers
lede: The memory this site is about is not JSON text. It is long lists of numbers, stored compactly. Copying byte strings finds nothing to grab there — but guessing does.
vendor: [pako.min.js]
cards:
  - q: Why can't DEFLATE shrink the twelve rows of readings stored as binary numbers?
    a: Neighbouring numbers are close but almost never equal, and LZ matching only copies exact repeats
    wrong: ["Because twelve rows are too few bytes to compress", "Because DEFLATE only works on text", "Because the readings are random"]
    why: Only 2 of 44 numbers equal the one above, never two side by side. 108 bytes go in, 108 come out.
    sec: nothing-to-copy
  - q: When the items are lists of numbers, what can the dictionary be?
    a: A few numbers — for example, each column's typical value
    wrong: ["A stack of old rows to copy byte strings from", "The largest number ever measured", "Nothing — numbers cannot share a dictionary"]
    why: Four typical values, sent once, turn every row into small leftovers. Copying is replaced by guessing.
    sec: predict
  - q: Subtracting each column's typical value from the twelve rows cut the binary digits per row from 46 to…
    a: 29
    wrong: ["46 — subtraction changes nothing", "4", "12"]
    why: The leftovers are small (pressure within ±1.74 hPa, for instance), so each needs fewer binary digits than the full reading.
    sec: predict
  - q: Which part of the zstd picture does NOT carry over from text messages to lists of numbers?
    a: Copying exact byte strings
    wrong: ["Paying for the dictionary once and sharing it", "The receiver needing exactly the right dictionary", "Rebuilding every item exactly"]
    why: Matching turns into predicting. The economics and the need for the right dictionary stay the same.
    sec: carries-over
---

Strip the JSON away from the Gull Rock messages and keep only what the instruments measured: four numbers every half hour. Better still, keep them as the instruments measured them. The thermometer resolves a hundredth of a degree; the message rounds that to a tenth. Here are the same twelve half-hours as on page [[#tiny-files-notice-anything]], as plain rows of numbers.

## Nothing to copy {#nothing-to-copy}

::: figure fig-tiny-rows numberRows
**The twelve readings of 28 October, 14:30–20:00, as rows of numbers.** Columns: temperature (°C, to 0.01), relative humidity (%, to 0.1), air pressure (hPa, to 0.01), wind speed (knots, to 0.1). The finer digits are illustrative: generated from a fixed seed so that each value rounds to the one in the message. **As measured** marks numbers equal to the one just above them (shaded). **Minus each column's typical value** subtracts the column's average over the twelve rows — the gold *typical* row — and shows the leftovers. **Minus the row above** subtracts the previous row instead (the first row is sent in full, in grey). The bottom rows give the binary digits needed per number in each column: *raw*, enough for the largest value as measured; *now*, enough for the largest leftover plus a sign. The readout compresses the rows stored as binary numbers (9 bytes per row) with DEFLATE (pako, level 9).
:::

Look at the *as measured* view the way a copy-from-earlier compressor would.

- **Exact repeats are rare.** Only 2 of the 44 numbers equal the one above them, and never two side by side. The temperature drifts by hundredths; the pressure falls a little every half hour; the last digits jitter.
- **The compressor agrees.** Stored as binary numbers, the twelve rows are 108 bytes. DEFLATE turns them into 108 bytes. Nothing to copy, nothing gained.

The rows are obviously alike — anyone can see that. But they are alike in *value*, not in *bytes*. Close is not equal, and [[lz-match|LZ matching]] only knows equal.

::: note warning Then why did the JSON compress at all?
As text, numbers like `1012.58` and `1012.09` do share characters (`1012.`), and the keys and quotes repeat exactly. Stored as compact binary numbers, the shared part shrinks to a few bits inside a byte — and a byte-copying compressor cannot point at a few bits.
:::

This is the situation of a language model's memory, which Part III introduces properly ([[#landscape-kv-cache]]). It is made of long lists of numbers — hundreds to thousands per piece — stored in a compact 8-bit form, one byte per number. Neighbouring pieces may well be close in value; that is the hope this whole site examines. But we expect them to share almost no exact byte strings, just like the rows above.

::: takeaway
- Rows of measured numbers are alike in value but rarely equal, so they share almost no byte strings.
- LZ matching, the heart of zip and zstd, finds nothing to copy: 108 bytes in, 108 out.
- A language model's memory is lists of numbers too, so byte matching is the wrong tool there.
:::

## Predict, then send the leftover {#predict}

Switch the figure to **minus each column's typical value**. The gold row holds four numbers — 11.82 °C, 84.7 %, 1010.84 hPa, 15.9 knots — the typical value of each column. Every row now sends only how far it is from those values.

- The temperature leftovers stay between −0.45 and +0.30 °C.
- The pressure leftovers stay within ±1.74 hPa, where the full reading needed to count up past a thousand.
- Written in binary digits, a row needs **29** instead of **46**.

Notice what the four typical values are. They are information both ends hold, sent once, shared by every row — a [[dictionary]], in exactly the sense of page [[#tiny-files-trained-dictionary]]. And each row's leftovers are its [[delta]]: what is needed, given the dictionary, to rebuild the row exactly.

Now try **minus the row above**. This guess knows the weather drifts slowly, and it does a little better: **26** digits per row. But it is the chain of the last page again — each row needs the one before it.

```python the dictionary is four numbers; each row sends only its leftovers
import numpy as np

# the twelve rows of the figure, in steps of 0.01 °C, 0.1 %, 0.01 hPa and 0.1 kn
rows = np.array([
    [1137, 817, 101258, 138], [1179, 829, 101209, 138], [1178, 826, 101181, 136],
    [1201, 852, 101164, 140], [1212, 846, 101124, 143], [1212, 848, 101111, 146],
    [1188, 846, 101066, 161], [1178, 839, 101047, 168], [1171, 848, 101013, 182],
    [1181, 858, 100983, 180], [1183, 856, 100936, 182], [1168, 896, 100912, 189]])

def digits(m):                      # binary digits needed for 0..m
    return np.ceil(np.log2(m + 1)).astype(int)

typical = np.round(rows.mean(axis=0)).astype(int)   # the dictionary: 4 numbers
left = rows - typical                               # what each row still has to send
print(typical)                                      # [  1182    847 101084    159]
print(digits(rows.max(axis=0)).sum(), "bits per row as measured")              # 46
print((1 + digits(np.abs(left).max(axis=0))).sum(), "bits per row as leftovers")  # 29
```

Copying has become guessing. A copy says "these bytes again"; a guess says "about this much", and the leftover says how wrong the guess was. Exactness is not lost: guess plus leftover gives back every digit.

::: theme predict-correct
Here the guess is a column's typical value (or the row above), and only the miss travels. A better guess means smaller leftovers and fewer bits — the pressure's steady fall, for instance, is a guess these rows still leave on the table.
:::

::: takeaway
- For numbers, the dictionary is a few numbers (here, each column's typical value), and "matching" becomes predicting.
- Each row sends only its leftovers: 46 binary digits per row become 29.
- The leftovers plus the dictionary rebuild every row exactly — still lossless.
:::

## What carries over {#carries-over}

So the zstd story survives the move from text to numbers, with one part replaced.

| | text messages (zstd) | lists of numbers (this site) |
|---|---|---|
| the dictionary $\vD$ | sample fragments and code tables | a few numbers that describe the items: typical values for now; later also shared directions and prototypes |
| how an item uses it | copy byte strings from $\vD$ | predict the item from $\vD$ |
| the delta $\vdelta$ | copy instructions plus literal characters | the exact leftovers of the prediction, compactly coded |
| the economics | $\vD$ paid once, shared by many | the same |
| the catch | the receiver must hold the right $\vD$ | the same |

Part II teaches the tools that the right column needs: what a list of numbers is as a mathematical object ([[#school-vectors]]), how to predict and code the leftover ([[#school-prediction]]), and how many bits a good guess saves ([[#school-exchange-rate]]).

::: takeaway
- Matching byte strings does not carry over to numbers; everything else in the dictionary picture does.
- The dictionary becomes a description of what the items have in common; the delta becomes the exact leftover of a prediction.
:::
