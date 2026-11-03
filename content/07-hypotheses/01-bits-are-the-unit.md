---
title: Bits are the unit
nav: Bits are the unit
group: The rule of the Part
lede: Every hypothesis in this Part says that some cherry is cheaper given something else. "Cheaper" has one meaning here, bits, and this page fixes it before any hypothesis is stated, because the first draft of the project got the direction of the number wrong and later trusted a similarity score that pointed the wrong way.
cards:
  - q: Knowing a dictionary makes a cherry more predictable. What happens to the mutual information and to the conditional entropy?
    a: The mutual information goes up and the conditional entropy goes down
    wrong: ["Both go down", "The mutual information goes down and the conditional entropy goes up", "Both go up"]
    why: Mutual information is the bits saved; conditional entropy is the bits still paid. The two halves of the bar always add up to the cost with nothing known.
    sec: one-number
  - q: In the cat toy at strength 0.5, how many bits does knowing the breed save, on average?
    a: 0.45 bit (2.00 to 1.55)
    wrong: ["1.55 bits", "0.19 bit", "2.00 bits"]
    why: Nothing known costs 2 bits; the breed known leaves 1.55; the difference is the mutual information. The sequence alone (cats or dogs) saves 0.19.
    sec: one-number
  - q: Two 512-element cherries share four huge elements and are unrelated elsewhere. Their cosine is 0.89. How much does one help to store the other exactly?
    a: Almost nothing; 508 of the 512 elements are unpredictable from it
    wrong: ["About 89 % of the bits", "Half the bits", "All the bits, they are near-copies"]
    why: Cosine is dominated by the four large elements. Lossless coding pays for every element, and the neighbour explains none of the other 508.
    sec: not-cosine
  - q: The same element in the two KV heads of a layer has a cosine of about 0.05. What did joining the two heads into one cherry save?
    a: 0.032 of ratio on 20 of 20 sequences, with a code-length bound of 0.85 bit per element shared
    wrong: ["Nothing, a cosine near zero means independent", "0.05 bit per element", "It cost 0.032 of ratio"]
    why: Cosine compares one element with the same element; a linear map compares all 256 with all 256. Only the bits settled it.
    sec: verdict
---

A quick quiz. You are about to store one [[cherry]] of the [[orchard]], and a friend whispers: "this sequence is about cats."

Did the cherry just become more predictable, or less? More, obviously. Did the mutual information between the cherry and what you know go up, or down? If you hesitated, you are in good company. The first draft of this project wrote the second answer backwards, and this Part exists partly to make that impossible to repeat.

## Three words, one number {#one-number}

"Similar", "redundant", "predictable": the proposal used all three about neighbouring cherries, as if they were three things. On this site they are one number, the [[mutual-information]] between a cherry $\vE$ and whatever the receiver already knows, $\vY$:

$$
\underbrace{\vI(\vE;\vY)}_{\text{bits saved}} \;=\; \underbrace{\vH(\vE)}_{\text{cost with nothing known}} \;-\; \underbrace{\vH(\vE \mid \vY)}_{\text{cost once } \vY \text{ is known}} .
$$ {#eq-hyp-mi}

::: aside reminder Conditional entropy and mutual information
$\vH(\vE \mid \vY)$, the [[conditional-entropy]], is the average number of bits still needed for $\vE$ once $\vY$ is known; it is never more than $\vH(\vE)$ on average ([[#school-side-information]]). The difference is the mutual information, the bits that knowing $\vY$ saves ([[#school-mutual-information]]).
:::

The mistake is easy to make. In everyday speech "information" means news, and news means surprise, so a cherry "carrying more information" sounds harder to predict. [[entropy|Entropy]] really does mean unpredictable, and mutual information sounds like a kind of entropy. The two sit in one equation, one minus the other; swap them and every sentence flips its sign. A picture that cannot be read backwards helps.

Take a toy. One element of a cherry takes one of four levels, *a*, *b*, *c* or *d*, each a quarter of the time overall: 2 bits. Sequences are about cats or about dogs. Inside each sequence, a stretch is about one breed, Maine Coon, Siamese, beagle or poodle, and each breed favours one level with a strength you set.

::: figure fig-hyp-mi-bars maMiBars
**The cat toy as three bars of the same length.** Each bar is the 2 bits that one element costs with nothing known. The red part is what is still paid at that rung, the conditional entropy $\vH(\vX \mid \cdot)$; the hatched green part is what the knowledge saved, the mutual information $\vI(\vX;\cdot)$. Rungs: nothing known; the sequence (cats or dogs) known; the breed (the stretch's subject) known. *Slider:* how strongly each breed sets the level; at 0 the breed says nothing, at 1 it settles the level. *Table:* the cost of two single outcomes inside a Maine Coon stretch, the breed's own level *a* and a rare level *d*, as surprisal $-\log_2 \vp$; the last row is the average. Exact calculation, no sampling.
:::

```python the cat toy at strength 0.5
import numpy as np
H = lambda p: -(p[p > 0] * np.log2(p[p > 0])).sum()
s = 0.5                                          # how strongly a breed sets the level
breed = (1 - s) / 4 + s * np.eye(4)              # rows: Maine Coon, Siamese, beagle, poodle (one stretch each)
seq = np.array([breed[:2].mean(0), breed[2:].mean(0)])   # cats, dogs (one sequence each)
HX = H(breed.mean(0))                            # nothing known
Hs = np.mean([H(p) for p in seq])                # the sequence known
Hb = np.mean([H(p) for p in breed])              # the breed known
print(f"cost: {HX:.2f} {Hs:.2f} {Hb:.2f}")      # cost: 2.00 1.81 1.55
print(f"saved: {HX - Hs:.2f} {HX - Hb:.2f}")    # saved: 0.19 0.45
```

The two parts of every bar always add up to the same 2 bits. A longer green part means a more predictable element. Now look at the table under the bars: the breed's own level *a* gets cheaper as you learn more (2 bits, then 1.42, then 0.68), but a rare level *d* inside a Maine Coon stretch gets *more* expensive, 2 bits with nothing known and 3 bits once the breed is known. The context says "*d* is unusual here", and an unusual outcome costs more [[surprisal]].

So the theorem has a precise shape: **knowing more never costs more on average**, and only on average. A single cherry can cost more against its punnet's dictionary than against none; the punnet as a whole cannot.

::: try
1. Slide the strength to 0. The green parts vanish: knowledge of a breed that sets nothing is worth nothing.
2. Slide it to 1. The breed settles the level (0 bits still paid), yet the sequence saves exactly 1 bit: it narrows four levels to two.
3. Watch the rare level *d* as the strength grows. Its cost climbs past 5 bits at strength 0.9.
:::

::: takeaway
- Similarity, redundancy and predictability are one number: the mutual information, the green part of the bar.
- Conditioning never hurts on average; a single unusual cherry can still cost more.
:::

## Why not cosine, why not perplexity {#not-cosine}

Papers about keys and values report cosine similarities, correlations and perplexities. None of them is a number of bits, and the project needs bits for one reason: bits per element times elements per cherry is bytes per cherry, and bytes per cherry is what crosses the [[link]] on every miss.

- **Perplexity** is $2^{\vH}$ over tokens of text. It is the right unit for what the LLM predicts, and says nothing about the numbers it stores.
- **Lossy tolerance** ("keys survive 2-bit rounding with little loss in accuracy") says what the LLM *tolerates*, not what is *predictable*. [[lossless|Lossless]] coding must bring every bit back, wanted or not.
- **Cosine similarity** can be fooled in both directions. Here is the first direction:

```python a cosine near 1 can hide a useless neighbour
import numpy as np
rng = np.random.default_rng(0)
d = 512
a = rng.standard_normal(d)             # two cherries: unrelated in 508 elements...
b = rng.standard_normal(d)
a[:4] = b[:4] = 30.0                   # ...but they share four huge outlier elements
cos = a @ b / np.linalg.norm(a) / np.linalg.norm(b)
r2 = np.corrcoef(a[4:], b[4:])[0, 1] ** 2
print(f"cosine similarity: {cos:.2f}  R² of the other {d - 4} elements: {r2:.3f}")
```

It prints a cosine of 0.89 and an [[r-squared|R²]] of 0.002 for the other 508 elements. Four elements make the two vectors look like near-copies; the other 508 must be stored at full price. The second direction is the surprise of the campaigns, and it is on [[#hypotheses-stereo]]: a cosine near *zero* that hid most of a bit per element.

::: theme bits-unit
This is the page where the theme is laid down. Every hypothesis of Part VII is a claim about $\vI(\vE;\,\cdot)$ per element, so that a measurement of it converts straight into a delta share $\vrho$ and from there into bytes on the link.
:::

::: takeaway
- Bits × cherry size = bytes on the link; cosine, correlation and perplexity do not convert.
- A high cosine can hide a useless neighbour, and a cosine near zero can hide a useful one.
:::

## Verdict {#verdict}

The campaigns scored everything in one unit, the [[mdl-ratio]] under the contract of Part IV, and the unit held up where similarity scores failed. Three readings:

| what was compared | a similarity score said | the bits said |
|---|---|---|
| the same element in the two KV heads of a layer | cosine ≈ 0.05: unrelated | joining the heads into one `v[t, l, :, :]` cherry saves 0.0322 ± 0.0009 of ratio, 20 of 20 sequences; a code-length bound puts 0.85 bit per element in common ([[#hypotheses-stereo]], [[#measured-cutting-the-tensor]]) |
| a value and its successor, middle layers | one value correlates 0.48 with the next | up to 0.29 bit per element raw, 0.02 or less once each has its own reference cherry ([[#hypotheses-fallen-apple]]) |
| the whole ladder of the project at stretch scope | | solo 0.778 (6.22 bits per element) to the best verified compressor 0.636 (5.09 bits): 1.14 bits per element won, every one of them counted under the contract ([[#measured-scorecard]]) |

::: aside source Receipts
Head cosine and the 20-sequence join: r7 iter-1-1, r24 iter-1-3; shared bits: r9 iter-1-2 (bound, 4 blocks). Successor correlation and lag-1 sharing: r16 iter-1-1, r9 iter-1-5. Solo and frontier: `solo_ratio` of screen `s-layer-b4k-r293` (0.77811), env-t0096 (0.63639).
:::

::: takeaway
- Measured in bits, the strongest structure in the orchard was one a cosine called absent.
- 1.14 bits per element is what every stage of Part VIII, together, won over solo at stretch scope.
:::
