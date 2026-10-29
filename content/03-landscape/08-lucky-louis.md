---
title: The Lucky Louis property
nav: Lucky Louis
group: HiSparse and its hot cache
lede: Why does a desk of a few thousand slots catch most of what a 100,000-entry history is asked for? Because the indexer keeps asking for the same entries. We give that habit a name — and we are careful about what it does not say.
cards:
  - q: What does the Lucky Louis property say?
    a: From one decode step to the next, the indexer re-selects mostly the same positions
    wrong: ["Neighbouring entries have similar contents", "The indexer always selects the newest tokens", "Entries selected once are never selected again"]
    why: It is a statement about which entries are wanted, step after step. That is why a cache betting on recent picks keeps winning.
    sec: why
  - q: Keeping only the current top-$\vk$ on the GPU misses 30 % of each step's selections. What does that say?
    a: On average, 70 % of a step's selections were also selected at the step before
    wrong: ["30 % of the entries are never selected", "The indexer is wrong 30 % of the time", "70 % of the history is in the cache"]
    why: A cache that holds exactly the previous step's picks hits exactly the re-selected ones.
    sec: numbers
  - q: 'On HiSparse''s trace, what miss rate does LRU reach with $\vB = 4096$ slots, and what does the clairvoyant Bélády policy reach?'
    a: 13.4 % for LRU, 8.2 % for Bélády
    wrong: ["30 % and 13.4 %", "6.7 % and 1 %", "13.4 % and 0 %"]
    why: Even a policy that knows the future still misses 8.2 %; LRU is within about 5 points of it.
    sec: numbers
  - q: The indexer stably re-selects the same positions. What does that tell us about the bytes stored in those entries?
    a: Nothing — it is about which entries are wanted, not about what they contain
    wrong: ["That neighbouring entries are nearly identical", "That the entries compress well", "That the entries are all zeros"]
    why: In the figure the keys are pure random numbers, and the selections still repeat. Similar contents would be a separate property, to be measured on its own.
    sec: which-not-what
---

Louis plays roulette. His system is simple: bet on whatever won last round. On a fair wheel this is no better than any other bet. But suppose the wheel is sticky, and the ball tends to land near where it landed before. Then Louis wins again and again, and the other players start to think he is lucky.

The hot cache is Louis. It keeps whatever was selected recently, and bets that it will be selected again. It wins most rounds.

## Why the desk keeps winning {#why}

The token the model writes now is about the same thing as the token it wrote a moment ago. Its working vector moves a little from step to step; so does the [[indexer]]'s query; so the indexer picks mostly the same past positions. We give this regularity a name, because the whole project depends on keeping it apart from a different property introduced in Part IV.

::: define lucky-louis
- **What it is.** From one decode step to the next, the indexer re-selects mostly the same positions. In the words of [[#school-reuse-distance]]: the [[reuse-distance|reuse distances]] of selections are short, so a small [[lru|LRU]] cache has a high hit rate.
- **The mnemonic.** Louis bets on last round's winners and keeps winning. Luck, from the cache's point of view; a property of the model, from ours.
- **What it is about.** *Which* entries are wanted. It is a statement about the queries — about the model's working vector changing slowly — and says nothing about the bytes stored in the entries.
- **Easy to confuse with** neighbouring entries having similar *contents* (Part IV calls that [[#idea-fallen-apple|fallen-apple similarity]]). A set of positions can be stably re-selected while their contents have nothing in common, and the other way round.
:::

The figure shows the property on a toy. Each row is one decode step of one layer; each dot is a selected position.

::: figure fig-landscape-louis louisRaster wide
**Selections over 36 decode steps of one layer (toy).** Each row is one step, earliest at the top; each column is one of 96 stored positions. A cell is coloured when the indexer selects that position at that step ($\vk = 8$ per step): green if it was also selected at the step before (a hit even for a cache that keeps only the last step's picks), orange if it is a new pick; the first step is grey, having nothing before it. Toy model: 96 random keys of 12 numbers each, and a query that takes a small random step at every decode step; the indexer picks the 8 keys with the largest dot products. The slider sets how far the query moves per step. The read-out gives the share of re-selected picks and the hit rate of an LRU hot cache with $2\vk = 16$ slots under HiSparse's resolve rule.
:::

::: try
1. At the default drift (0.3) the picks form vertical streaks: the same positions, step after step. The read-out lands near HiSparse's numbers below — a coincidence of the toy's settings, not a model of GLM-5.1.
2. Drag the drift down to 0.02, then up to 1.5. The streaks break into confetti and the hit rates collapse.
3. Note that the LRU cache with twice the slots always beats "keep the last step's picks": some positions drop out for a step or two and come back.
:::

::: takeaway
- Lucky Louis: consecutive steps select mostly the same positions, so a small LRU cache keeps hitting.
- It holds because the query drifts slowly. Fast-moving queries would break it.
:::

## HiSparse's numbers {#numbers}

HiSparse measured the property on a real trace: GLM-5.1 answering a 100,384-token prompt from the LongBench-V2 benchmark, 1,799 decode steps, 78 sparse layers, $\vk = 2048$ selections per layer per step. The miss rates, averaged over layers and steps:

::: dataset fig-landscape-misses landscape-misses view=policies,bysize metrics=overlap,lru4096,fifo,belady,gap,lru8192
**HiSparse's six miss rates.** *Plot:* "Policies" has one bar per measurement: the miss rate $\vm$ (the share of selections fetched over the link) of each eviction policy, with the hot-cache size in slots per layer per request; blue bars are LRU (keeping only the current top-$\vk$ is LRU with $\vk$ slots), red bars FIFO and random eviction, the purple bar Bélády's clairvoyant policy. "LRU by cache size" puts the three LRU points against the number of slots. *Table:* the six measurements with their hit rates. *Numbers:* what each measurement tells us. Measured by HiSparse on one GLM-5.1 request, as recorded in the first draft of this proposal.
:::

Three readings.

1. **The top bar is the overlap itself.** Keeping only the current picks means a step hits exactly the picks it shares with the step before. So on average **70 % of a step's selections repeat** from the previous step. (The toy trace of [[#landscape-toy-trace]] repeated 3 of 4.)
2. **Recency is the right bet.** LRU beats evicting the oldest fetch (FIFO) or a random entry. What was *used* recently, not what was *fetched* recently, predicts the next selection. The storm morning ([[#fig-landscape-storm]]) gave the same verdict on 24 requests: 10 misses for LRU, 14 for FIFO.
3. **Little is left for cleverer eviction.** Even [[belady|Bélády's]] clairvoyant policy misses 8.2 % at 4096 slots. LRU is within about five points of the best any policy could do.

::: aside reminder Bélády (II.22)
[[belady|Bélády's policy]] evicts the item whose next use is furthest in the future. Nobody can run it live, because nobody knows the future; replayed on a recorded trace, it shows the best any eviction policy could have done with that many slots.
:::

::: note warning What these numbers rest on
One model, one prompt, one benchmark. The rates are averages over 78 layers and 1,799 steps; how much they vary from layer to layer is not reported in what we have read. They are quoted as the first draft of this proposal recorded them from the HiSparse paper and were not re-checked against it for this version ([[#reference-numbers]]). They are good enough to set the scale; they are not a law of nature.
:::

::: takeaway
- On HiSparse's GLM-5.1 trace, 70 % of each step's selections repeat from the step before.
- LRU with 4096 slots misses 13.4 %; with 8192, 6.7 %. A clairvoyant policy at 4096 would still miss 8.2 %.
:::

## Which, not what {#which-not-what}

It is tempting to slide from "the same entries are wanted again and again" to "the entries are alike". Those are two different properties, and the evidence for the first says nothing about the second.

:::: compare Two properties that are easy to merge
::: col Lucky Louis (this page)
- **About:** which positions the indexer selects, step after step.
- **Comes from:** the query moving slowly.
- **Pays for:** a high hit rate in a small cache.
- **Established:** yes, by HiSparse's trace.
:::
::: col Similar contents (Part IV)
- **About:** the numbers stored inside neighbouring entries.
- **Would come from:** the keys and values themselves being predictable from each other.
- **Would pay for:** cheaper misses and cheaper slots, through compression.
- **Established:** no — it is the hypothesis this site sets out to measure.
:::
::::

The toy above makes the point without any argument. Its keys are independent random numbers: no entry tells you anything about any other. And still the selections repeat, step after step. [[#idea-the-leak]] turns this into a measurement.

::: theme which-vs-what
Here the theme appears in its purest form. A trace of *which* entries are selected says nothing about *what* is inside them. HiSparse's high hit rates are evidence for Lucky Louis, and for nothing else.
:::

::: takeaway
- Lucky Louis is about which entries are wanted; it says nothing about their contents.
- A cache built on it lowers the number of misses. It does not make any entry smaller.
:::
