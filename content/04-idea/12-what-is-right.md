---
title: What the ladder gets right
nav: What the ladder gets right
lede: Before the criticism, credit. Three things in the cat-thread argument are simply true — one of them is a theorem — and together they turn the story into a measurement plan.
group: The cat-thread ladder
cards:
  - q: Why is $\vH(\vE) \ge \vH(\vE \mid \text{thread}) \ge \vH(\vE \mid \text{block})$ guaranteed?
    a: Conditioning never increases entropy on average, and knowing the block also tells you the thread
    wrong: ["Because blocks are smaller than threads", "Because HiSparse measured it", "It is not guaranteed; it is a hypothesis"]
    why: Side information can only help on average (II.5). The block rung refines the thread rung, so it can only help further.
    sec: theorem
  - q: The ladder's direction is a theorem. What is NOT guaranteed?
    a: How big each step down is — it can be zero
    wrong: ["That the bottom rung is lower than the top", "That bits are the right unit", "That the thread rung exists"]
    why: 'In the toy, set both "differ by" sliders to zero: all three rungs are equal. The theorem gives the direction; only data gives the size.'
    sec: theorem
  - q: '"Redundancy", "similarity" and "predictability" — how many different quantities are these on this site?'
    a: One — the mutual information, in bits
    wrong: ["Three different quantities", "Two: one in bits, one as a percentage", "None of them can be measured"]
    why: 'All three are $\vH(\vE) - \vH(\vE \mid \cdot)$, the bits saved by knowing something — and bits × entry size = bytes on the link.'
    sec: bits-and-subject
  - q: What kind of dictionary captures "sameness of subject" between entries of the same passage?
    a: A location dictionary — the typical value of each channel in that passage
    wrong: ["A list of repeated byte strings", "A copy of the hot cache", "The indexer's selections"]
    why: Entries about the same subject have typical values that sit closer together; storing those typical values once lets each entry be stored as a smaller difference.
    sec: bits-and-subject
---

[[#idea-cat-thread-ladder]] ended with a table: three parts of the argument are right, one is a leak, one is a trap. This page is about the three that are right. They matter more than they seem: they are what turns a story into an experiment.

## The direction is a theorem {#theorem}

The ladder says: an entry is least surprising against its block, more against its thread, most against everything. In symbols,

$$
\underbrace{\vH(\vE)}_{\text{against everything}} \;\ge\; \underbrace{\vH(\vE \mid \text{thread})}_{\text{against its conversation}} \;\ge\; \underbrace{\vH(\vE \mid \text{block})}_{\text{against its neighbourhood}} .
$$ {#eq-idea-ladder}

This is not a hypothesis. **Conditioning never increases entropy on average**: knowing something relevant can only make a message cheaper, and knowing something irrelevant costs nothing. The second inequality needs one more observation — knowing the block also tells you the thread, so the bottom rung knows at least as much as the middle one.

::: aside reminder Conditional entropy and side information
$\vH(\vX \mid \vY)$ is the average number of bits still needed for $\vX$ once $\vY$ is known. It is never more than $\vH(\vX)$, on average; the difference is the [[mutual-information]] $\vI(\vX;\vY)$ ([[#school-side-information]], [[#school-mutual-information]]).
:::

What the theorem does *not* say is how big the steps are. They can be zero. The toy below has every number computed, so you can watch both facts at once.

::: figure fig-idea-ladder-theorem ladderTheorem
**The ladder's direction, computed.** A toy "entry" takes one of 16 values. There are three threads (think cats, dogs, tax law), each split into four blocks; inside a block the value follows a bell shape around a centre. The sliders set how far apart the threads' centres are, how far apart the blocks' centres are within a thread, and the spread inside a block. Left: the three rungs in bits — the entropy of all values together, the average entropy within a thread, and the average entropy within a block. Right: the distributions behind them for the cat thread and one of its blocks. The readout gives the two steps down as mutual informations. Everything is computed exactly from the distributions; the toy is not KV data.
:::

::: try
1. Set both "differ by" sliders to 0. All three rungs are equal: the ladder is flat, and no dictionary at any scope saves a bit.
2. Raise only the threads' spread. The top step grows, the bottom step stays at zero — per-conversation dictionaries would help, per-block ones would not.
3. Raise the noise inside a block. Every step shrinks: noise that no rung can explain dilutes them all.
4. Try any combination: the bars never go up.
:::

With the defaults, the toy's rungs read 3.17, 2.60 and 2.43 bits: steps of 0.57 and 0.17 bit. The theorem guarantees the order; the sliders set the gaps. For KV caches, nobody has measured the gaps at 8 bits.

This is why the ladder becomes the plan. The three rungs are exactly the three dictionary scopes — one dictionary for everything, one per request, one per block ([[#homework-scope]]) — and measuring each rung in bits is the core of the first experiment ([[#plan-experiment-1b]]). The intuitive argument was, all along, a measurement plan in disguise.

::: takeaway
- $\vH(\vE) \ge \vH(\vE \mid \text{thread}) \ge \vH(\vE \mid \text{block})$ always holds: the direction is a theorem.
- The size of each step is not guaranteed and can be zero; only data can tell.
- The rungs are the three dictionary scopes; measuring them is the plan.
:::

## Bits are the unit, and the subject is real {#bits-and-subject}

The second thing the argument gets right is its currency. "Surprise", "redundancy", "similarity" — the story used everyday words, and every one of them has an exact meaning in [[bit|bits]].

| everyday word | what it is | formula |
|---|---|---|
| how surprising an entry is | its [[surprisal]] | $-\log_2 \vp$ |
| how surprising, on average | the [[entropy]] | $\vH(\vE)$ |
| redundancy, similarity, predictability | the [[mutual-information]] with what is known | $\vH(\vE) - \vH(\vE \mid \cdot)$ |
| bytes on the link per entry | bits per element × elements | $\vrho\,\ve$ for a delta |

The last row is why bits, and not cosine similarity or perplexity, are the unit everywhere on this site: bits times the entry size *is* the traffic.

::: theme bits-unit
The ladder was told in words, but every rung is a number of bits per element, and the difference between two rungs is a [[delta-ratio]] change waiting to happen.
:::

The third thing is the plainest: **sameness of subject is real**. Two paragraphs about the Maine Coon do produce entries whose typical values sit closer together than entries from a paragraph of Python. Storing each [[channel]]'s typical value for the passage once, and each entry as a difference from it, captures exactly that — the lightest dictionary of Part VI ([[#homework-loc]]). The open question is not *whether* this effect exists. It is how much of an entry it accounts for, and [[#idea-the-trap]] shows why the answer is likely to be "less than it feels".

::: takeaway
- Surprise, redundancy, similarity and predictability are all bits; bits × entry size = bytes on the link.
- Entries about the same subject really do share typical values, and a light dictionary captures it.
- What remains open is the size — measured, not argued.
:::
