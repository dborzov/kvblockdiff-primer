---
title: Reuse distance
nav: Reuse distance
lede: Write one number under every request — how many other logbooks were used since this one was last needed — and you can read off how many misses an LRU desk of every size would make, without simulating any of them. A clairvoyant forecaster sets the bound no policy can beat.
group: Machines
cards:
  - q: 'In the requests G S H G, what is the reuse distance of the second G?'
    a: 2 — two other logbooks (S and H) were used since the first G
    wrong: ["3 — three requests have passed", "1 — one request separates them", "∞ — G was already used"]
    why: Reuse distance counts distinct other items since the previous use, not elapsed requests. Repeats of the same item count once.
    sec: reuse
  - q: 'Under LRU with $\vB$ slots, exactly when does a request miss?'
    a: When its reuse distance is at least $\vB$ (or it is a first request)
    wrong: ['When its reuse distance is at most $\vB$', 'When its reuse distance is exactly $\vB$', 'When more than $\vB$ requests have passed since its last use']
    why: 'LRU keeps the $\vB$ most recently used items. An item with distance $D$ sits at position $D + 1$ in recency order, so it is on the desk only if $D + 1 \le \vB$.'
    sec: reuse
  - q: What does the miss-rate curve m(B) give you?
    a: The LRU miss rate for every cache size at once, read off one histogram of reuse distances
    wrong: ["The miss rate of the best possible policy", "How the miss rate changes over time", "The miss rate of one cache size, measured very precisely"]
    why: 'm(B) is the fraction of requests whose reuse distance is at least B. One pass over the requests gives the whole curve.'
    sec: curve
  - q: 'On the round-robin sweep G S H L N G S H L N …, how many of 24 requests miss with 4 slots under LRU, and under Bélády?'
    a: LRU 24 (all of them), Bélády 9
    wrong: ["LRU 5, Bélády 5", "LRU 9, Bélády 24", "LRU 12, Bélády 12"]
    why: Every reuse distance is 4, so with 4 slots LRU always evicts exactly the logbook needed next. The clairvoyant policy keeps most of them.
    sec: belady
  - q: Why is Bélády's policy useful if it is impossible to run?
    a: It bounds what any eviction policy could achieve, so the gap to LRU shows how much a smarter policy could still win
    wrong: ["It is used by real caches with a small delay", "It is always twice as good as LRU", "It removes the first-time misses"]
    why: Bélády needs the future. Comparing it with LRU on recorded requests tells you whether to work on the policy or buy a bigger cache.
    sec: belady
---

The simulator of the last page answers one question at a time: *this* desk size, *this* policy, *this* list of requests. Move the slider and it runs the whole morning again. Is there a way to know, in one pass, how a desk of every size would do?

There is, for LRU. It rests on a single number written under every request.

## One number per request {#reuse}

Take the storm morning and, for each request, look back to the last time the same logbook was requested. Count how many **different** other logbooks were used in between.

```text the storm morning, with each request's reuse distance under it (∞ = first request)
G S G H G S L G S F G S H G N G S L G S M G S R
∞ ∞ 1 ∞ 1 2 ∞ 2 2 ∞ 2 2 4 2 ∞ 1 3 5 2 2 ∞ 2 2 ∞
```

The third request, G, has distance 1: only S was used since the first G. The thirteenth, H, has distance 4: G, S, L and F came in between.

::: define reuse-distance
- **What it is:** for a request, the number of distinct *other* items requested since this item's previous request. A first request has distance ∞. (In the caching literature: *stack distance*.)
- **The rule:** under LRU with $\vB$ slots, a request misses **exactly** when its reuse distance is at least $\vB$.
- **Easy to confuse with:** the number of requests in between. G S S S G gives the second G a distance of 1, not 3.
:::

Why the rule holds: keep the logbooks in a pile ordered by last use, most recent on top. A logbook with reuse distance $D$ has exactly $D$ others above it, so it sits at position $D + 1$. An LRU desk with $\vB$ slots holds exactly the top $\vB$ of the pile. So the logbook is on the desk if $D + 1 \le \vB$, that is $D < \vB$; it misses if $D \ge \vB$.

We write $\vB$ for the number of slots. In Part III the same letter counts the slots of the GPU's cache.

::: note warning An off-by-one in the first draft
The first draft said a request misses when its reuse distance *exceeds* $\vB$. With distance counted as above (distinct others), the correct statement is *at least* $\vB$: a logbook with distance 4 misses on a 4-slot desk. Off-by-ones like this are harmless at the scale of thousands of slots, but they are worth getting right once.
:::

::: takeaway
- Reuse distance = distinct other items since the previous request for the same item (∞ for a first request).
- LRU with $\vB$ slots misses exactly the requests with reuse distance $\ge \vB$.
:::

## The miss-rate curve {#curve}

The rule turns a list of distances into the miss rate of every desk size at once. Count how many requests have each distance (a [[histogram]]), then add up the tail.

$$
\vm(\vB) \;=\; \frac{\text{number of requests with reuse distance} \ge \vB}{\text{number of requests}}
$$ {#eq-sv-miss-rate}

::: define miss-rate-curve
- **What it is:** the miss rate $\vm$ of an LRU cache as a function of its size $\vB$.
- **How it is made:** one pass over the requests to compute reuse distances; then $\vm(\vB)$ is the fraction with distance $\ge \vB$, for every $\vB$ at once.
- **Why it is one curve:** a bigger LRU desk always holds everything a smaller one holds, so every request that hits on a small desk also hits on a bigger one. (This "stack" property is why the trick works for LRU and not for FIFO.)
:::

::: figure fig-sv-reuse svReuse
**Reuse distances, their histogram and the miss-rate curve.** Top: the 24 requests of the chosen list, each with its reuse distance below it; boxes are tinted red when the request misses with the chosen number of slots $\vB$ (distance $\ge \vB$) and green when it hits. Left: the histogram of reuse distances (∞ = first request), bars at or beyond $\vB$ in red. Right: the miss rate $\vm(\vB)$ for $\vB = 1 \dots 8$ — the blue line is read off the histogram; the blue dots come from actually simulating an LRU desk and land exactly on it; the dashed purple line is Bélády's clairvoyant policy; the yellow dots are FIFO. *Choose* a request list and *slide* $\vB$.
:::

For the storm morning the curve reads: $\vm(1) = 100\,\%$, $\vm(2) = 88\,\%$, then a cliff to $\vm(3) = 46\,\%$, $\vm(4) = 42\,\%$, $\vm(5) = 38\,\%$, and a floor of 33 % from 6 slots on. The cliff sits where the histogram has its big bar: ten requests have distance 2 (Gull Rock and Seal Point alternating around a third logbook). A desk of 3 catches all of them. The floor is the 8 first requests, which no desk can catch.

::: note intuition Reading a cache from its histogram
Where the reuse distances pile up, the curve drops. A cache sized just past a big bar of the histogram is a bargain; a cache sized in a gap between bars buys nothing. Part III reads a language model's cache numbers off exactly this kind of curve ([[#landscape-reuse-curve]]).
:::

::: takeaway
- $\vm(\vB)$ = share of requests with reuse distance $\ge \vB$: the LRU miss rate of every size, from one histogram.
- The curve drops where distances pile up and flattens at the share of first requests.
:::

## The clairvoyant forecaster {#belady}

LRU guesses the future from the past. Imagine a forecaster who *knows* the rest of the morning's list.

::: define belady
- **What it is:** Bélády's optimal policy (1966): when something must go, evict the item whose next request lies furthest in the future (or never comes).
- **Why it matters:** no policy can make fewer misses. It is impossible to run live, because it needs the future, but on a recorded list of requests it gives a hard bound.
- **Easy to confuse with:** LRU run backwards. LRU looks at the last use, Bélády at the next.
:::

On the storm morning Bélády is only a little better than LRU: 9 misses against 10 with 4 slots, and both reach the floor of 8 from 6 slots. LRU is already nearly as good as anything could be. To miss less, the forecaster needs a bigger desk, not a cleverer rule.

Now choose the *round-robin sweep* in the figure: G S H L N, over and over. Every reuse distance is 4. With 4 slots, LRU evicts, every single time, exactly the logbook that will be needed next: **24 misses out of 24**. Bélády, knowing the cycle, misses only 9. Add a fifth slot and both drop to the 5 first requests.

::: note key What the gap tells you
The distance between LRU and Bélády on recorded requests is the most any smarter eviction policy could win. A small gap says: stop tuning the policy, the only lever left is size. Part III measures this gap on a real language model's cache and draws exactly that kind of conclusion ([[#landscape-lucky-louis]]).
:::

::: takeaway
- Bélády evicts the item needed furthest in the future: the best any policy can do.
- On bursty requests LRU comes close (10 vs 9 misses); on a cycle just larger than the cache it fails completely (24 vs 9).
- The LRU–Bélády gap measures what policy tuning could still gain.
:::
