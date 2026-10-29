---
title: Predictability is mutual information, not its reverse
nav: Mutual information points up
lede: Similarity, redundancy and mutual information are one number of bits, the bits that side information saves. The first draft let that number run backwards. Here is a picture that cannot be read backwards, and the one subtlety that survives.
cards:
  - q: Knowing the dictionary D makes an entry E more predictable. What happens to I(E; D) and to H(E | D)?
    a: I(E; D) goes up and H(E | D) goes down
    wrong: ["Both go down", "I(E; D) goes down and H(E | D) goes up", "Both go up"]
    why: 'Mutual information is the bits saved, $\vI = \vH(\vE) - \vH(\vE \mid \vD)$. More predictable means fewer bits still to pay, so more bits saved.'
    sec: claim
  - q: In the cat-thread toy at strength 0.5, how many bits does knowing the breed save, on average?
    a: 0.45 bits (2.00 → 1.55)
    wrong: ["1.55 bits", "0.19 bits", "2.00 bits"]
    why: 'Nothing known costs 2 bits; knowing the breed leaves 1.55; the difference, 0.45 bits, is $\vI(\vX;\text{breed})$. The thread alone saves 0.19.'
    sec: bars
  - q: A rare value d turns up in a Maine Coon block. With the breed known, its code gets…
    a: Longer — 3 bits instead of 2
    wrong: ["Shorter — 1 bit instead of 2", "Exactly as long — 2 bits", "Free — 0 bits"]
    why: Conditioning never hurts on average, but a single unusual outcome can cost more once the context says it is unusual.
    sec: bars
  - q: The ladder H(E) ≥ H(E | thread) ≥ H(E | block) is a theorem. Why can a measured scope gain still come out negative?
    a: Real side information costs bits, and a dictionary fit on finite data is not the true distribution
    wrong: ["Because the theorem only holds for Gaussian data", "Because entropy can be negative", "It cannot: measured gains are always positive"]
    why: The theorem assumes free, perfect side information. A real dictionary has a price (8w/b) and a fitted model pays cross-entropy, not entropy.
    sec: changes
---

A quick quiz. You are about to store one KV entry, and a friend whispers: "this thread is about cats".

Did the entry just become more predictable, or less? More, obviously. Did the mutual information between the entry and what you know go up, or down? If you hesitated over the second question, you are in good company. The first draft got it backwards.

## What the first draft said {#claim}

The first draft used "similarity", "redundancy" and "mutual information" as loose names for one idea. The earlier proposal records that it "had this backwards": it wrote as if more mutual information meant *less* predictability. (The proposal kept the correction, not the sentence, so this is our paraphrase.)

The mistake is an easy one to make.

- **In everyday speech, "information" means news, and news means surprise.** An entry "carrying more information" sounds harder to predict.
- **Entropy is often called "information content",** and high [[entropy]] really does mean unpredictable. [[mutual-information|Mutual information]] sounds like a kind of entropy, so it seems to inherit the same direction.
- **The two quantities sit in one equation, one minus the other.** Swap them and every sentence flips its sign.

::: aside reminder Conditional entropy and mutual information
[[#school-side-information]]: $\vH(\vX \mid \vY)$ is the average number of bits still needed for $\vX$ once $\vY$ is known. [[#school-mutual-information]]: $\vI(\vX;\vY)$ is the number of bits that knowing $\vY$ saves. Here the message is an entry $\vE$ and the side information is its dictionary $\vD$.
:::

::: keycard What the receiver's knowledge is worth
$$
\underbrace{\vI(\vE;\vD)}_{\text{bits saved}} \;=\; \underbrace{\vH(\vE)}_{\text{cost without } \vD} \;-\; \underbrace{\vH(\vE \mid \vD)}_{\text{cost with } \vD}
$$ {#eq-ma-mi}
The better the dictionary predicts the entry, the smaller the cost with it and the *larger* the mutual information. Similarity, redundancy and predictability are all this one number of bits.
:::

::: takeaway
- Mutual information is the bits *saved*. It goes up as the entry becomes more predictable.
- Conditional entropy is the bits *still paid*. It goes down.
:::

## A bar that cannot be read backwards {#bars}

Take a toy version of the [[cat-ladder]]. One element $\vX$ of an entry takes one of four levels, *a*, *b*, *c* or *d*, each a quarter of the time overall: 2 bits. Threads are about cats or dogs. Inside each thread, blocks are about one breed: Maine Coon, Siamese, beagle or poodle. Each breed favours one level, with a strength you set.

::: figure fig-ma-mi-bars maMiBars
**The cat-thread toy as three bars of the same length.** Each bar is the 2 bits that one element costs with nothing known. The red part is what is still paid at that rung, the [[conditional-entropy]] $\vH(\vX \mid \cdot)$; the hatched green part is what the knowledge saved, the mutual information $\vI(\vX;\cdot)$. Rungs: nothing known; the thread (cats or dogs) known; the breed known. *Slider:* how strongly each breed sets the value; at 0 the breed says nothing, at 1 it settles the value. *Table:* the cost of two single outcomes inside a Maine Coon block, the breed's own level *a* and a rare level *d*, as surprisal $-\log_2 \vp$; the last row is the average, the entropy. Exact calculation, no sampling.
:::

At strength 0.5:

- nothing known: 2.00 bits;
- thread known: 1.81 bits, so the thread saved 0.19;
- breed known: 1.55 bits, so the breed saved 0.45.

The two parts of every bar always add up to the same 2 bits. A longer green part means a more predictable value. There is no way to read the picture backwards.

```python the cat-thread toy at strength 0.5
import numpy as np
H = lambda p: -(p[p > 0] * np.log2(p[p > 0])).sum()
s = 0.5                                    # how strongly the breed sets the value
breed = (1 - s) / 4 + s * np.eye(4)        # rows: Maine Coon, Siamese, beagle, poodle
thread = np.array([breed[:2].mean(0), breed[2:].mean(0)])   # cats, dogs
HX = H(breed.mean(0))                      # nothing known
Ht = np.mean([H(p) for p in thread])       # thread known
Hb = np.mean([H(p) for p in breed])        # breed known
print(f"cost: {HX:.2f} {Ht:.2f} {Hb:.2f}")            # cost: 2.00 1.81 1.55
print(f"saved: {HX - Ht:.2f} {HX - Hb:.2f}")          # saved: 0.19 0.45
```

Now look at the table under the bars. The breed's own level *a* gets cheaper as you learn more: 2 bits, then 1.42, then 0.68. But a rare level *d* inside a Maine Coon block gets *more* expensive: 2 bits with nothing known, 3 bits once you know the thread or the breed. The context says "*d* is unusual here", and an unusual outcome costs more [[surprisal]].

So the theorem has a precise shape. Knowing more never costs more **on average**. A single entry can cost more against its block's dictionary than against no dictionary at all, and only the average over the block is guaranteed to improve.

::: try
1. Slide the strength to 0. The green parts vanish: knowledge of a breed that sets nothing is worth nothing.
2. Slide it to 1. The breed settles the value (0 bits still paid), yet the thread saves exactly 1 bit: it narrows four levels to two.
3. Watch the rare value *d* as the strength grows. Its cost climbs past 5 bits at strength 0.9.
:::

::: takeaway
- Red is paid, green is saved, and together they are always the whole bar.
- Knowing more never hurts on average; a single unusual entry can still cost more.
:::

## What changes in the plan {#changes}

- **The direction of the ladder is not tested.** $\vH(\vE) \ge \vH(\vE \mid \text{thread}) \ge \vH(\vE \mid \text{block})$ always holds; [[#idea-what-is-right]] calls it what it is, a theorem.
- **Its size is the hypothesis, and it is reported in bits.** The plan measures each rung as bits per element saved, the [[scope-gain|scope gains]] $\vgainreq$ and $\vgainblk$ of [[#homework-scope]].
- **A measured gain can still come out negative,** for two honest reasons.
  1. Real side information is not free. A dictionary costs $8\vw/\vb$ bits per element. The theorem prices the receiver's knowledge at zero.
  2. A dictionary fit on finite data is not the true distribution. Coding with a wrong model costs [[cross-entropy]], which is never less than the entropy. Fit and score on the same data, and the gain can also look *better* than it is. That is what held-out data and the [[shuffle-control]] are for.

:::: compare Two halves of one bar
::: col Conditional entropy H(X | Y)
- **Measures:** the bits still needed for $\vX$ once $\vY$ is known.
- **As $\vY$ predicts $\vX$ better:** goes down.
- **When $\vY$ says nothing:** equals $\vH(\vX)$.
- **When $\vY$ settles $\vX$:** 0.
- **Plays the role of:** the size of the delta.
:::
::: col Mutual information I(X; Y)
- **Measures:** the bits that knowing $\vY$ saves.
- **As $\vY$ predicts $\vX$ better:** goes up.
- **When $\vY$ says nothing:** 0.
- **When $\vY$ settles $\vX$:** equals $\vH(\vX)$.
- **Plays the role of:** what the dictionary is worth.
:::
::::

::: theme bits-unit
"Similar", "redundant" and "predictable" only become one idea when each is turned into bits. Then they are the same number, the green part of the bar, and that number times the entry size is bytes off the wire.
:::

::: takeaway
- The ladder's direction is free; the plan measures its size, rung by rung, in bits per element.
- A negative measured gain means a tax or a misfit model, never a broken theorem.
:::
