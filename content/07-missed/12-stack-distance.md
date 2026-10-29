---
title: The stack-distance curve behind every cache number
nav: The stack-distance curve
group: Fields and tools to think with
lede: In 1970 four IBM researchers noticed that one pass over a request trace gives the miss count of an LRU cache at every size at once. HiSparse's three miss rates are three points on such a curve — and its slope is what makes the two levers compound.
cards:
  - q: Why does one pass over a trace give LRU's misses at every cache size?
    a: An LRU cache of B slots always holds exactly the top B items of the recency stack, so each request's depth in that stack says at once for which sizes it hits
    wrong: ["Because LRU never evicts anything", "Because the miss rate is the same at every size", "Because the trace is replayed once per size in parallel"]
    why: This nesting (a smaller cache's contents sit inside a larger one's) is Mattson's inclusion property. Misses at size B = requests with stack distance at least B.
    sec: stack
  - q: On the string 1 2 3 4 1 2 5 1 2 3 4 5, FIFO misses 9 times with 3 slots. With 4 slots it misses…
    a: 10 times — more, with a bigger cache (Bélády's anomaly)
    wrong: ["8 times", "9 times", "5 times"]
    why: FIFO's contents at 3 slots are not a subset of its contents at 4, so it has no single stack curve. LRU and Bélády's policy do.
    sec: stack
  - q: 'If the miss rate follows $\vm(\vB) \propto \vB^{-1.08}$, doubling the hot cache multiplies the misses by about…'
    a: 0.47
    wrong: ["0.92", "0.25", "0.5 exactly, always"]
    why: '$2^{-1.08} \approx 0.47$. HiSparse''s points: 30 % at 2048, 13.4 % at 4096, 6.7 % at 8192.'
    sec: curve
  - q: With the power law above, cheaper slots (lever 2) plus cheaper misses (lever 1) cut miss traffic by about what factor for ρ = 0.65?
    a: 2.4×
    wrong: ["1.5×", "1.08×", "10×"]
    why: 'The cache grows by 1/ρ at equal memory, so misses fall by ρ^1.08; each miss is ρ smaller. Traffic ∝ ρ^2.08 = 0.41.'
    sec: curve
  - q: What does wave 2 measure instead of extrapolating HiSparse's three points?
    a: The whole stack-distance histogram of the proxy trace, in one pass — every cache size, the victim tier and the dictionary cache read off directly
    wrong: ["Only the miss rate at B = 4096", "The Bélády miss rate at every size", "The hit rate of the indexer"]
    why: One pass gives the full curve; the same pass over block ids gives the dictionary cache's curve.
    sec: plan
---

How many misses would a cache of 3 slots have on a given stream of requests? Of 4 slots? Of 4,096? The obvious way to find out is to replay the stream once per size. In 1970 Mattson, Gecsei, Slutz and Traiger, at IBM, showed that for LRU one replay answers every size at once. The object that does it is a single list, the **stack**.

::: note history What the first draft did not use
It quoted HiSparse's miss rates — 30 %, 13.4 %, 6.7 %, and 8.2 % for Bélády — as four separate facts. They are points on one curve, and that curve does real work for the design. Item 11 of the old list: *the Mattson stack-distance curve is the one object behind every LRU number.*
:::

## One stack, every size {#stack}

::: aside reminder LRU and reuse distance
[[lru|LRU]] evicts the item used longest ago ([[#school-caches]]). The [[reuse-distance]] of a request is the number of distinct other items requested since the same item was last requested; under LRU with $\vB$ slots, a request misses exactly when that distance is at least $\vB$ ([[#school-reuse-distance]]).
:::

Keep every item ever requested in one list, ordered by last use, most recent on top. When a request arrives, note the depth where its item sits (0 for the top), then move it to the top. The depth is its *stack distance* — the same number as its reuse distance.

The trick is a single observation. An LRU cache of $\vB$ slots always holds exactly the top $\vB$ items of this stack. So a request found at depth 3 is a hit in every cache of 4 slots or more, and a miss in every smaller one. One pass, one list of depths, every cache size.

::: figure fig-missed-stack mbStackDistance wide
**The LRU stack, and misses at every cache size.** *Top:* one column per request (the item requested, then its stack distance, ∞ for a first request), and below it the stack after that request, most recent on top. The dashed box marks the top $\vB$ rows — the contents of an LRU cache of $\vB$ slots. Green means a hit for this $\vB$, red a miss. *Bottom:* misses against cache size $\vB$: LRU read off the distances (line), FIFO and Bélády's clairvoyant policy simulated separately (dots). Type your own requests (letters or numbers, separated by spaces), pick a preset, or move the size slider.
:::

::: try
1. On *Bélády's string* (1 2 3 4 1 2 5 1 2 3 4 5), FIFO misses 9 times with 3 slots and **10 times with 4**. A bigger cache, more misses: Bélády's anomaly (1969).
2. On *a loop of 5*, LRU misses every single request until $\vB$ = 5: the item needed next is always the one just evicted. Bélády's policy, which can see the future, does much better.
3. On *a drifting set* (a few items in use, slowly replaced), LRU's misses fall steeply at $\vB$ = 3 — a toy version of the Lucky Louis property.
:::

Why can FIFO misbehave while LRU cannot? Because LRU caches nest: what a cache of 3 slots holds is always inside what a cache of 4 slots holds. Mattson and colleagues called policies with this property **stack algorithms**, and proved that Bélády's optimal policy is one too. FIFO is not, and a policy without nesting has no single curve.

:::: compare Two eviction policies on the same desk
::: col LRU — a stack algorithm
- Contents at size $\vB$ ⊂ contents at size $\vB + 1$, always.
- Misses never increase with size.
- One pass gives the whole [[miss-rate-curve]].
:::
::: col FIFO — not a stack algorithm
- Contents at different sizes can disagree.
- Misses *can* increase with size.
- Each size must be simulated on its own.
:::
::::

::: takeaway
- LRU caches of all sizes nest inside one recency stack, so one pass yields the misses at every size.
- Policies without that nesting, like FIFO, can even get worse with more room.
:::

## Three points, one curve {#curve}

HiSparse measured LRU on one long prompt (GLM-5.1, 100,384 tokens, $\vk$ = 2048 selections per layer and step; [[#landscape-lucky-louis]]): 30 % misses at $\vB$ = 2048, 13.4 % at 4096, 6.7 % at 8192. On log–log axes those points lie close to a straight line ([[#landscape-reuse-curve]]):

$$
\vm(\vB) \;\propto\; \vB^{-1.08}
\qquad\Rightarrow\qquad
\frac{\vm(2\vB)}{\vm(\vB)} = \underbrace{2^{-1.08}}_{\text{double the cache}} \approx 0.47 .
$$ {#eq-missed-power-law}

The exponent is the slope from the first point to the last: $\log_2(0.30 / 0.067) / 2 = 1.08$.

Now the payoff. [[lever|Lever 2]] stores hot-cache slots as deltas, so the same memory holds $1/\vrho$ times more entries. The misses then fall by $\vrho^{1.08}$ along the curve, and [[lever|lever 1]] makes each remaining miss $\vrho$ times smaller. Miss traffic falls by both factors together:

| delta ratio $\vrho$ | 0.85 | 0.75 | 0.65 | 0.5 |
|---|---:|---:|---:|---:|
| lever 1 alone: traffic × $\vrho$ | 0.85 | 0.75 | 0.65 | 0.50 |
| both levers: traffic × $\vrho^{2.08}$ | 0.71 | 0.55 | 0.41 | 0.24 |
| traffic cut, both levers | 1.4× | 1.8× | 2.4× | 4.2× |

That is the old draft's "the two levers compound", with its arithmetic shown.

::: note warning How far to trust a three-point line
- The three points span only a factor of 4 in $\vB$, for one prompt on one model.
- The curve cannot stay a power law. Once the cache holds every position that is ever re-selected, only first-time requests miss, and the curve flattens onto that floor.
- Bélády's 8.2 % at 4096 sits only about 5 points below LRU's 13.4 %. Better eviction can buy little; that lever is nearly exhausted.
:::

::: theme which-vs-what
The curve is a property of the stream of requests alone — of *which* entries the indexer asks for. It knows nothing about what the entries contain. That is why it can price lever 2 without saying anything about whether the deltas will be small.
:::

::: takeaway
- HiSparse's three numbers are three points of one miss-rate curve, close to $\vm \propto \vB^{-1.08}$: double the cache, about halve the misses.
- Along that curve the two levers compound: traffic ∝ $\vrho^{2.08}$, a 2.4× cut at $\vrho$ = 0.65.
:::

## What changes in the plan {#plan}

- **Measure the curve, don't extrapolate it.** Wave 2 replays the proxy trace once and records every stack distance ([[#plan-wave2-measure]]). Every $\vB$, lever 2 and the [[victim-tier|victim tier]] ([[#missed-victim-tier]]) are then read off directly.
- **Use the same tool one level up.** The [[dictionary-cache]] is itself an LRU cache whose items are blocks. Its miss rate at every $\vnD$ is the stack-distance curve of block requests: one more pass over the same trace.
- **Stop optimising eviction.** With LRU within ~5 points of Bélády, the design spends its effort on cheaper slots and cheaper misses.

::: takeaway
- Wave 2 records the full stack-distance histogram; cache sizes, lever 2 and the victim tier become look-ups.
- The dictionary cache gets its own curve from the same pass.
:::
