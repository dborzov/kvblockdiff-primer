---
title: Neighbour similarity
nav: Neighbour similarity
lede: The idea is only as good as a property of KV caches that nobody has measured at 8 bits. Before measuring it, name it carefully — an imprecise name already caused one real mistake in the first draft.
group: What the idea bets on
cards:
  - q: Which of the three named properties is about WHICH entries are wanted rather than WHAT is inside them?
    a: The Lucky Louis property
    wrong: ["Fallen-apple similarity", "Upstairs similarity", "Neighbour similarity"]
    why: Lucky Louis says the indexer keeps re-selecting the same positions. The other two are hypotheses about the bytes inside entries.
    sec: three
  - q: Which property is established, and which are hypotheses?
    a: Lucky Louis is established (HiSparse measured it); fallen-apple and upstairs similarity are hypotheses
    wrong: ["All three are established", "All three are hypotheses", "Fallen-apple is established; Lucky Louis is a hypothesis"]
    why: HiSparse measured selection reuse on a real trace. Nobody has measured how many bits a neighbouring entry saves at 8-bit precision.
    sec: three
  - q: Neighbour similarity along the token axis compares entry E[l, t] with…
    a: An entry of the same layer, some tokens earlier, E[l, t − Δ]
    wrong: ["The same token one layer down, E[l − 1, t]", "Another head's slice of the same entry", "The query of the current step"]
    why: The token axis is the fallen-apple member of the family; the layer axis is the upstairs member.
    sec: umbrella
  - q: In what unit is neighbour similarity measured on this site?
    a: Bits per element saved when the neighbour is known, H(E) − H(E | neighbour)
    wrong: ["Cosine similarity between the two entries", "Perplexity of the model", "Percentage of identical bytes"]
    why: Bits × entry size = bytes on the link, which is what the proposal must save. Cosine and perplexity do not convert to bytes.
    sec: bits
  - q: Why is cosine similarity not a good measure for this project?
    a: Two entries can point the same way and still cost almost full price to store exactly given each other
    wrong: ["Cosine similarity is always close to zero for KV entries", "Cosine similarity cannot be computed for 8-bit numbers", "Cosine similarity ignores the first channel"]
    why: Cosine can be dominated by a few large channels; lossless coding pays for every element, including the many that the neighbour does not predict (IV.8 has an example).
    sec: bits
---

In the first drafts of this proposal one word, "locality", was used for two different things. One was that the [[indexer]] keeps choosing the same past positions. The other was that nearby entries hold similar numbers. Evidence for the first was then quoted as evidence for the second. [[#idea-the-leak]] shows why that does not work. This page and the next three give the two things different names, so that the mistake cannot happen again.

## Three properties, two kinds {#three}

The idea leans on three properties. One is about **which** entries are wanted. Two are about **what** is inside them.

::: figure fig-idea-three-props threeProperties
**The three named properties, side by side.** ① *[[lucky-louis]]* (green frame): positions selected at three consecutive decode steps of one layer; most marks repeat (re-selected: a cache hit), a few are new (vermilion: a miss). Measured on a real trace by HiSparse. ② *Fallen-apple similarity* (red frame): the hypothesised bits needed to store an entry exactly when an entry of the same layer some tokens away is known, against that token distance (log scale); the dashed line is "no help". The curve's shape is a guess, drawn for illustration. ③ *Upstairs similarity* (blue frame): entries arranged as floors (layers) and windows (tokens); the arrow asks whether an entry helps predict the same token's entry one floor up. Hover the marks in ① for details.
:::

- **① The Lucky Louis property** — established. The cache bets on last round's winners and keeps winning ([[#landscape-lucky-louis]]).
- **② Fallen-apple similarity** — a hypothesis, and the one the project exists to measure first ([[#idea-fallen-apple]]).
- **③ Upstairs similarity** — a hypothesis, second priority ([[#idea-upstairs]]).

The design needs ① in a stronger, per-block form as well ([[#idea-heavy-blocks]]). It needs ② for its deltas to be small at all.

::: theme which-vs-what
This is the page where the distinction is made. ① lives in the *queries*: how the hidden state moves from one step to the next. ② and ③ live in the *stored bytes*. One can hold without the others, in both directions.
:::

::: takeaway
- One established property about which entries are wanted (Lucky Louis).
- Two hypotheses about what is inside them (fallen-apple, upstairs).
- Never quote evidence for one kind as evidence for the other.
:::

## The umbrella: neighbours along an axis {#umbrella}

The [[kv-cache]] of one request is a tensor with four axes: [[layer]] $\vl$, [[head]] $\vh$, [[token]] position $\vt$ and [[channel]] $\vc$ — as in $\vK[\vl, \vh, \vt, \vc]$. An [[entry]] $\vE_{\vl,\vt}$ takes everything at one layer and one token: all heads, all channels, keys and values. So two entries can be neighbours in two directions, along the token axis or along the layer axis.

::: define neighbour
- **What it is:** the family of hypotheses that an entry costs fewer bits to store *exactly* when a neighbouring entry along some axis of the KV tensor is already known.
- **Members:** fallen-apple similarity — neighbours along the **token** axis, same layer ([[#idea-fallen-apple]]); and upstairs similarity — neighbours along the **layer** axis, same token ([[#idea-upstairs]]). A third member, along the head axis, would compare slices *inside* one entry; we do not pursue it.
- **Easy to confuse with:** the [[lucky-louis]], which is about which entries the indexer selects, not about their contents.
:::

::: figure fig-idea-kv-axes kvAxes
**Which entries count as neighbours.** Each tile is one entry of one request: layers run upwards (5 shown), token positions to the right (14 shown). The filled tile is the chosen entry (click any tile to choose another). *Token axis:* entries of the same layer at earlier positions, darker the closer they are, labelled with their token distance. *Layer axis:* the same token one floor down and one floor up. *Head axis:* the chosen entry split into its heads' slices — a possible third member, not pursued. The readout names the neighbours and the hypothesis that concerns them.
:::

::: takeaway
- Neighbour similarity is an umbrella: "a neighbour along some axis makes an entry cheaper to store exactly".
- Token axis → fallen-apple similarity. Layer axis → upstairs similarity.
:::

## Measured in bits {#bits}

"Similar" is a vague word. On this site it has one precise meaning: the number of [[bit|bits]] per element that knowing the neighbour saves. That is the [[mutual-information]] between an entry and its neighbour,

$$
\vI(\vE;\, \text{neighbour}) \;=\; \underbrace{\vH(\vE)}_{\text{bits to store } \vE \text{ alone}} \;-\; \underbrace{\vH(\vE \mid \text{neighbour})}_{\text{bits once the neighbour is known}} ,
$$ {#eq-idea-neighbour-bits}

estimated in practice as the drop in lossless code length when the coder is allowed to see the neighbour.

::: aside reminder Mutual information
$\vH(\vX \mid \vY)$, the [[conditional-entropy]], is the average number of bits still needed for $\vX$ once $\vY$ is known; it is never more than $\vH(\vX)$ on average. The difference is the mutual information $\vI(\vX; \vY)$ — redundancy, similarity and predictability are three names for this same number of bits ([[#school-mutual-information]]).
:::

Why bits, and not the measures that papers often report?

- **Cosine similarity** says two vectors point the same way. It can be close to 1 while most elements of the two entries are unrelated — a few large channels can dominate it. Lossless coding pays for every element. [[#idea-fallen-apple]] shows a concrete case.
- **Perplexity** is $2^{\vH}$ over tokens of text. It is the right unit for a language model's predictions, not for the numbers stored in its cache.
- **Bits** convert directly: bits per element × elements per entry = bytes per entry, and bytes per entry is what crosses the link on every miss.

::: theme bits-unit
The property the project bets on is defined as a number of bits, so that a measurement of it converts directly into $\vrho$ — the [[delta-ratio]] — and from there into bytes on the link.
:::

::: takeaway
- Neighbour similarity is measured as bits saved: $\vH(\vE) - \vH(\vE \mid \text{neighbour})$, per element.
- Cosine similarity and perplexity do not convert into bytes; bits do.
:::
