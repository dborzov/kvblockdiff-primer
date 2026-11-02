---
title: The stack-distance curve behind every cache number
nav: The stack-distance curve
group: Two more bets
lede: In 1970 four IBM researchers noticed that one pass over a trace of asks gives the miss count of an LRU cache at every size at once. HiSparse's three miss rates are three points on such a curve, and its slope is what makes the two levers compound.
cards:
  - q: Why does one pass over a trace give LRU's misses at every cache size?
    a: An LRU cache of B slots always holds exactly the top B items of the recency stack, so each ask's depth in that stack says at once for which sizes it hits
    wrong: ["Because LRU never evicts anything", "Because the miss rate is the same at every size", "Because the trace is replayed once per size in parallel"]
    why: A smaller cache's contents sit inside a larger one's, Mattson's inclusion property. Misses at size B are the asks with stack distance at least B.
    sec: stack
  - q: 'On the asks 1 2 3 4 1 2 5 1 2 3 4 5, FIFO misses 9 times with 3 slots. With 4 slots it misses…'
    a: 10 times, more with a bigger cache (Bélády's anomaly)
    wrong: ["8 times", "9 times", "5 times"]
    why: FIFO's contents at 3 slots are not a subset of its contents at 4, so it has no single stack curve. LRU and Bélády's policy do.
    sec: stack
  - q: 'If the miss rate follows $\vm(\vB) \propto \vB^{-1.08}$, doubling the hot cache multiplies the misses by about…'
    a: 0.47
    wrong: ["0.92", "0.25", "0.5 exactly, always"]
    why: '$2^{-1.08} \approx 0.47$. HiSparse''s points: 30 % at 2048, 13.4 % at 4096, 6.7 % at 8192.'
    sec: curve
  - q: What does a replay of a pick trace give that HiSparse's three points do not?
    a: The whole stack-distance histogram in one pass, so every cache size, the victim tier and the dictionary shelf are read off directly
    wrong: ["Only the miss rate at B = 4096", "The Bélády miss rate at every size", "The hit rate of the indexer"]
    why: One pass gives the full curve; the same pass over stretch ids gives the shelf's curve.
    sec: verdict
---

How many misses would a cache of 3 slots have on a given stream of asks? Of 4 slots? Of 4096? The obvious way to find out is to replay the stream once per size. In 1970 Mattson, Gecsei, Slutz and Traiger, at IBM, showed that for LRU one replay answers every size at once. The object that does it is a single list, the **stack**.

## One stack, every size {#stack}

::: aside reminder LRU and reuse distance
[[lru|LRU]] evicts the item used longest ago ([[#school-caches]]). The [[reuse-distance]] of an ask is the number of distinct other items asked for since the same item was last asked for; under LRU with $\vB$ slots, an ask misses exactly when that distance is at least $\vB$ ([[#school-reuse-distance]]).
:::

Keep every item ever asked for in one list, ordered by last use, most recent on top. When an ask arrives, note the depth where its item sits (0 for the top), then move it to the top. The depth is its *stack distance*, the same number as its reuse distance.

The trick is a single observation. An LRU cache of $\vB$ slots always holds exactly the top $\vB$ items of this stack. So an ask found at depth 3 is a hit in every cache of 4 slots or more, and a miss in every smaller one. One pass, one list of depths, every cache size.

::: figure fig-hyp-stack mbStackDistance wide
**The LRU stack, and misses at every cache size.** *Top:* one column per ask (the item asked for, then its stack distance, ∞ for a first ask), and below it the stack after that ask, most recent on top. The dashed box marks the top $\vB$ rows, the contents of an LRU cache of $\vB$ slots. Green means a hit for this $\vB$, red a miss. *Bottom:* misses against cache size $\vB$: LRU read off the distances (line), FIFO and Bélády's clairvoyant policy simulated separately (dots). Type your own asks (letters or numbers, separated by spaces), pick a preset, or move the size slider.
:::

```python stack distances in one pass, and the misses at every size
asks = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]          # Bélády's string
stack, dist = [], []
for a in asks:
    dist.append(stack.index(a) if a in stack else float("inf"))   # depth before the ask
    if a in stack: stack.remove(a)
    stack.insert(0, a)                                             # most recent on top
print(dist)                                          # [inf, inf, inf, inf, 3, 3, inf, 2, 2, 4, 4, 4]
for B in (3, 4): print(B, sum(d >= B for d in dist))   # LRU misses: 10 at 3 slots, 8 at 4
```

::: try
1. On *Bélády's string* (1 2 3 4 1 2 5 1 2 3 4 5), FIFO misses 9 times with 3 slots and **10 times with 4**. A bigger cache, more misses: Bélády's anomaly (1969).
2. On *a loop of 5*, LRU misses every single ask until $\vB$ = 5: the item needed next is always the one just evicted. Bélády's policy, which can see the future, does much better.
3. On *a drifting set* (a few items in use, slowly replaced), LRU's misses fall steeply at $\vB$ = 3: a toy version of the Lucky Louis property.
:::

Why can FIFO misbehave while LRU cannot? Because LRU caches nest: what a cache of 3 slots holds is always inside what a cache of 4 slots holds. Mattson and colleagues called policies with this property *stack algorithms*, and proved that Bélády's optimal policy is one too. FIFO is not, and a policy without nesting has no single curve. <!-- old-words -->

::: takeaway
- LRU caches of all sizes nest inside one recency stack, so one pass yields the misses at every size.
- Policies without that nesting, like FIFO, can even get worse with more room.
:::

## Three points, one curve {#curve}

HiSparse measured LRU on one long prompt of GLM-5.1 (100 384 tokens, $\vk$ = 2048 picks per layer and step; [[#landscape-lucky-louis]]): 30 % misses at $\vB$ = 2048, 13.4 % at 4096, 6.7 % at 8192. On log–log axes those points lie close to a straight line ([[#landscape-reuse-curve]]):

$$
\vm(\vB) \;\propto\; \vB^{-1.08}
\qquad\Rightarrow\qquad
\frac{\vm(2\vB)}{\vm(\vB)} = \underbrace{2^{-1.08}}_{\text{double the cache}} \approx 0.47 .
$$ {#eq-hyp-power-law}

The exponent is the slope from the first point to the last: $\log_2(0.30 / 0.067) / 2 = 1.08$.

Now the payoff. [[lever|Lever 2]] stores hot-cache slots as deltas, so the same memory holds $1/\vrho$ times more picks. The misses then fall by $\vrho^{1.08}$ along the curve, and lever 1 makes each remaining miss $\vrho$ times smaller. Miss traffic falls by both factors together:

| delta share $\vrho$ | 0.85 | 0.75 | 0.65 | 0.5 |
|---|---:|---:|---:|---:|
| lever 1 alone: traffic × $\vrho$ | 0.85 | 0.75 | 0.65 | 0.50 |
| both levers: traffic × $\vrho^{2.08}$ | 0.71 | 0.55 | 0.41 | 0.24 |
| traffic cut, both levers | 1.4× | 1.8× | 2.4× | 4.2× |

That is "the two levers compound" of [[#app-two-levers]], with its arithmetic shown.

::: note warning How far to trust a three-point line
- The three points span only a factor of 4 in $\vB$, for one prompt on one LLM.
- The curve cannot stay a power law. Once the cache holds every position that is ever re-picked, only first-time asks miss, and the curve flattens onto that floor.
- Bélády's 8.2 % at 4096 sits only about 5 points below LRU's 13.4 %. Better eviction can buy little; that lever is nearly exhausted.
:::

::: theme which-vs-what
The curve is a property of the stream of asks alone, of *which* positions the indexer wants. It knows nothing about what the cherries contain. That is why it can price lever 2 without saying anything about whether the deltas will be small.
:::

::: takeaway
- HiSparse's three numbers are three points of one miss-rate curve, close to $\vm \propto \vB^{-1.08}$: double the cache, about halve the misses.
- Along that curve the two levers compound: traffic ∝ $\vrho^{2.08}$, a 2.4× cut at $\vrho$ = 0.65.
:::

## Verdict {#verdict}

On [[pin|the Pin]], their measurement: three LRU points and one Bélády point, for one prompt, from the HiSparse paper ([[#papers-hisparse]]), and nothing finer. On [[bench|the Bench]], nothing: no indexer ran, so there is no stream of asks to pass over ([[#landscape-reference-settings]]).

What a replay of a pick trace would give, in one pass each:

1. **The full stack-distance histogram** of the picks, per layer: the miss rate at every $\vB$, including the sizes lever 2 would buy and the [[victim-tier]]'s slots, as look-ups rather than extrapolations.
2. **The shelf's own curve.** The [[dictionary-shelf]] is itself an LRU-like cache whose items are stretches. Its miss rate at every $\vnD$ is the stack-distance curve of the asks' `stretch_id`s: one more pass over the same trace, and the heavy-stretch question of [[#hypotheses-heavy-stretches]] answered on the way.
3. **Where to stop optimising eviction.** With LRU within about 5 points of Bélády on the Pin, the design's effort goes to cheaper slots and cheaper misses, not to a better policy.

The trace comes from the stand-in indexer of [[#plan-queries-and-picks]]; the replay is [[#plan-hot-cache-replay]].

::: takeaway
- Measured: three points and a Bélády point on the Pin, from HiSparse; nothing on the Bench.
- One pass over a pick trace gives every cache size, the victim tier and the shelf's curve.
:::
