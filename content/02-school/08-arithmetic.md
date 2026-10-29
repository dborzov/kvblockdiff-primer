---
title: Arithmetic coding and rANS
nav: Arithmetic coding and rANS
lede: Code a whole message as one number and each report can cost a fraction of a bit. The price is a coder with a running state, which must be read from the start.
group: Coding
cards:
  - q: About how many bits does arithmetic coding need for a whole message?
    a: About the sum of the surprisals of its symbols
    wrong: ["One whole bit per symbol, at least", "The number of symbols times the entropy of the alphabet's largest symbol", "Exactly the Huffman length"]
    why: 'Each symbol shrinks the interval by its probability; naming a number in an interval of width $w$ takes about $\log_2(1/w)$ bits — the sum of the surprisals.'
    sec: interval
  - q: 'A summer fortnight of noon reports (12 sunny, 2 cloudy, 1 rain, 1 fog). Huffman needs 22 bits. Arithmetic coding with the summer model needs about…'
    a: 19 bits
    wrong: ["22 bits", "16 bits", "12 bits"]
    why: '12 × 0.415 + 2 × 3 + 4 + 4 ≈ 19.0 bits. The 12 sunny reports cost 5 bits instead of 12.'
    sec: interval
  - q: Summer data coded with the year's model costs 1.375 bits per report; summer's entropy is 1.19. What is the 1.375 called?
    a: The cross-entropy of summer data under the year model
    wrong: ["The conditional entropy", "The mutual information", "The perplexity"]
    why: Cross-entropy is the average cost when the data follow one distribution and the code another. It is never below the entropy.
    sec: model
  - q: Can a cross-entropy ever be smaller than the entropy of the data?
    a: No — a wrong model can only cost extra
    wrong: ["Yes, if the model is sharper than the data", "Yes, for very short messages", "Only for rANS"]
    why: The entropy is the floor for any code. The gap between the two is the price of the wrong model.
    sec: model
  - q: Why can't you decode report number 1,000 of an rANS stream without decoding the 999 before it?
    a: The coder carries a running state, and that state depends on every earlier report
    wrong: ["rANS writes the reports in reverse order", "rANS stores reports in fixed 4-bit slots", "rANS needs the model of the next report"]
    why: The state after report 999 is only known by decoding reports 1 to 999. Variable-length codes like Huffman hide the position of report 1,000 in the same way.
    sec: rans
---

Summer at Gull Rock: sunny three noon reports in four. The surprisal of a sunny summer report is $\log_2(4/3) \approx 0.415$ bits, and Huffman charges it a whole bit. Over a summer fortnight that waste adds up to 3 bits in 22.

Can a single report cost less than one bit? On its own, no — you cannot send 0.4 of a binary digit. But a *message* of many reports can. The trick is to stop giving each report its own codeword.

## A message as one shrinking interval {#interval}

Picture all the numbers from 0 to 1 as a ruler. Cut it into four slices whose widths are the summer probabilities: sunny gets the first ¾, cloudy the next ⅛, rain and fog 1/16 each.

1. The first report is sunny. Keep the sunny slice, $[0, ¾)$, and throw the rest away.
2. Cut *that* slice into the same four proportions. The second report is sunny again: keep its first ¾, $[0, 9/16)$.
3. Carry on. Every report keeps its own share of the current interval.

After the last report, the interval's width is the product of all the reports' probabilities. Any number inside the interval identifies the whole message, because no other message leads to the same interval. And naming a number inside an interval of width $w$ takes about $\log_2(1/w)$ binary digits — which is the sum of the reports' surprisals.

::: figure fig-arith-interval siArith wide
**Arithmetic coding, one report at a time.** Top row: the message, a summer fortnight of 16 noon reports (S = sunny, C = cloudy, R = rain, F = fog; 12, 2, 1 and 1 of them), each lit as it is coded. Middle: the current interval, drawn full width and cut into the four reports' slices in proportion to the model's probabilities; the slice of the report being coded is outlined. Bottom: that slice, zoomed to full width — the interval for the next report. The readout gives the interval's ends and width, and the binary digits that every number in the interval already shares. Tiles: bits so far for this model, $\log_2(1/\text{width})$, and for the Huffman code `0`, `10`, `110`, `111`. Switch between the summer model and the year model (sunny ½, cloudy ¼, rain and fog ⅛).
:::

With the summer model, the sixteen reports cost 18.98 bits; the Huffman code needs 22. The twelve sunny reports, which Huffman charges 12 bits, cost about 5. Switch to the year model and arithmetic coding also needs exactly 22 bits — with dyadic probabilities it and Huffman agree.

::: try
1. Step through the first two sunny reports with the summer model. The interval shrinks to ¾ and then 9/16 of the ruler, and no binary digit is settled yet. The third sunny report settles the first one: at 0.415 bits a report, a digit settles every two or three sunny reports.
2. Step to the cloudy report (step 5): its interval is an eighth of the previous one, and three more digits settle at once.
3. Switch to the year model at the end: 22 bits, the same as Huffman.
:::

The “settled digits” in the readout are how a real coder works. As the interval shrinks, the leading binary digits of every number inside it become identical; those digits are final, and the coder can send them right away. Real implementations do this with integers and a fixed precision, so they never need infinitely precise fractions.

::: define arithmetic-coding
- **What it is:** a coder that turns a whole message into one number inside a shrinking interval, so each symbol costs its surprisal, fractions of a bit included.
- **Example:** 16 summer reports in 18.98 bits, where Huffman needs 22.
- **Easy to confuse with:** a code with codewords. Arithmetic coding has no codeword per symbol; the bits of one report are smeared across its neighbours.
:::

Huffman, arithmetic coding and the coder in the last section of this page form one family.

::: define entropy-coder
- **What it is:** any coder that spends about $\log_2(1/\vp)$ bits on a symbol of probability $\vp$, so that its average approaches the [[entropy]].
- **Example:** Huffman ([[#school-codes]]), arithmetic coding, rANS.
- **Easy to confuse with:** a whole compressor such as zip. A compressor usually first finds structure (repeats, predictions) and *then* hands the leftovers to an entropy coder.
:::

::: takeaway
- Arithmetic coding narrows an interval report by report; the final width is the product of the probabilities.
- Its cost is about the sum of the surprisals, so a sunny summer report costs 0.415 bits, not 1.
- Huffman and arithmetic coding are both entropy coders; only arithmetic coding escapes whole bits.
:::

## Coding with a model, and the price of a wrong one {#model}

Arithmetic coding needs the probabilities at both ends: the coder to cut the ruler, the decoder to cut it identically. That set of probabilities is the *model*, and it is [[side-information]] once again. What if the model is wrong — say, the station codes a summer day with the year's probabilities?

Write $\vphat_{\vi}$ for the probability the model gives outcome $\vi$ and $\vp_{\vi}$ for how often it really happens. Each report costs $\log_2(1/\vphat_{\vi})$, and it happens with frequency $\vp_{\vi}$:

$$
\text{cross-entropy} = \sum_{\vi} \underbrace{\vp_{\vi}}_{\text{how often it happens}} \; \underbrace{\log_2 \frac{1}{\vphat_{\vi}}}_{\text{what the model charges}} \;\ge\; \vH(\vX)
$$ {#eq-cross-entropy}

::: define cross-entropy
- **What it is:** the average number of bits per symbol when data with distribution $\vp$ are coded with a model $\vphat$. It is never below the entropy; the gap is the price of the wrong model.
- **Example:** summer reports coded with the year's model cost 1.375 bits each, against summer's entropy of 1.19.
- **Easy to confuse with:** [[conditional-entropy]]. Conditional entropy is what you pay with the *right* model for each situation; cross-entropy is what you pay with a model that does not fit.
:::

| the data | the model used | bits per report |
|---|---|---:|
| summer reports | summer's own probabilities | 1.19 (the entropy) |
| summer reports | the year's probabilities | 1.375 |
| winter reports | winter's own probabilities | 1.98 (the entropy) |
| winter reports | the year's probabilities | 2.25 |

Two old friends hide in this table. The 2.25 bits of winter is the “year-round prices, paid in winter” column of [[#school-side-information]] — it was a cross-entropy all along. And Huffman's summer code (`0`, `10`, `110`, `111`) costs 1.375 bits per report, exactly the cross-entropy under the year's model. That is no accident: its codeword lengths bet on ½, ¼, ⅛, ⅛. **Huffman's whole-bit loss is a wrong-model loss.**

::: takeaway
- Every entropy coder works with a model, kept at both ends.
- Coding data with a model that does not fit costs the cross-entropy, never less than the entropy.
- Summer coded with the year's model: 1.375 bits instead of 1.19 — the same cost as Huffman's whole bits.
:::

## rANS, and why streams decode front to back {#rans}

Arithmetic coding reaches the entropy, but for decades it had a reputation for being slow: a division or two per symbol, careful bookkeeping of the interval's ends. Around 2013 Jarek Duda found a faster member of the family, the asymmetric numeral systems. Its range variant, rANS, keeps one integer as its whole state.

::: define rans
- **What it is:** an entropy coder with arithmetic coding's near-ideal cost and much faster decoding. Its state is one integer, which grows by a factor of about $1/\vp$ for each symbol coded.
- **Example:** the snippet below codes the summer fortnight in 20 bits (18.98 bits of surprisal plus a little start-up overhead) and decodes it back exactly.
- **Easy to confuse with:** arithmetic coding with a different name. The cost is the same; the mechanics differ. rANS works like a stack, so the encoder runs over the message backwards and the decoder runs forwards.
:::

```python rANS with the summer model: counts out of 16
freq  = {'sunny': 12, 'cloudy': 2, 'rain': 1, 'fog': 1}
start = {'sunny': 0, 'cloudy': 12, 'rain': 14, 'fog': 15}
M = 16

def encode(msg):
    x = 1
    for s in reversed(msg):                    # encode backwards ...
        x = (x // freq[s]) * M + start[s] + x % freq[s]
    return x

def decode(x, n):
    out = []
    for _ in range(n):                         # ... so that decoding runs forwards
        slot = x % M
        s = next(k for k in freq if start[k] <= slot < start[k] + freq[k])
        x = freq[s] * (x // M) + slot - start[s]
        out.append(s)
    return out

msg = ['sunny'] * 3 + ['cloudy'] + ['sunny'] * 4 + ['rain'] + ['sunny'] * 2 + ['cloudy'] + ['sunny'] * 3 + ['fog']
x = encode(msg)
print(x.bit_length(), decode(x, len(msg)) == msg)   # 20 True
```

This version keeps the whole state as one big Python integer. Production coders keep it in a machine word and push settled bits out as they go. The ANS family now sits inside widely used formats such as zstd and JPEG XL.

Now look at what both coders have in common. The interval, or the state, carries everything coded so far. To read the 1,000th report you must first decode the 999 before it. Huffman has the same problem for a different reason: with codewords of different lengths, nobody knows where the 1,000th codeword starts.

:::: compare Two kinds of entropy coder
::: col Huffman
- one whole-bit codeword per symbol
- simple table lookups
- loses up to about a bit per symbol on lopsided sources
- variable lengths: positions unknown until you decode
:::
::: col Arithmetic coding and rANS
- no codewords; one shared interval or state
- fractions of a bit per symbol, close to the entropy
- rANS decodes fast; classic arithmetic coding is slower
- a running state: decode from the start
:::
::::

When the harbour office wants just one reading from a month's archive, both are awkward. [[#school-fixed-length]] trades a few bits for the ability to jump straight to it.

::: takeaway
- rANS matches arithmetic coding's cost with one integer of state and fast decoding.
- Every entropy coder here is sequential: a running state, or variable lengths, means decoding from the start.
- That is the price of near-entropy rates, and the next page pays a few bits to avoid it.
:::
