---
title: One curve behind every cache number
nav: The reuse curve
group: HiSparse and its hot cache
lede: HiSparse's three LRU miss rates look like three separate facts. They are three points on one curve, and the curve has a simple shape — double the cache, and the misses roughly halve.
cards:
  - q: 'Through HiSparse''s three LRU points, the miss rate falls roughly as $\vm(\vB) \propto \vB^{-1.08}$. What happens to the misses when the hot cache doubles?'
    a: They fall to about 47 % — roughly halved
    wrong: ["They fall to about 8 %", "They fall to about 92 %", "They do not change"]
    why: '$2^{-1.08} \approx 0.47$.'
    sec: power-law
  - q: Under LRU with $\vB$ slots, when does a selection miss?
    a: When its reuse distance is at least $\vB$
    wrong: ["When it was never selected before", "When its position is larger than $\\vB$", "When its attention weight is small"]
    why: 'The reuse distance counts the distinct other positions selected since its last selection; once $\vB$ of them have come in, it has been pushed out. So $\vm(\vB)$ is the share of selections with reuse distance $\ge \vB$.'
    sec: power-law
  - q: Clairvoyant Bélády eviction at 4096 slots misses 8.2 %. About how many LRU slots would give the same miss rate, according to the fitted curve?
    a: About 6,700 — some 60 % more slots
    wrong: ["About 4,100 — the same number", "About 65,000 — sixteen times more", "No number of slots could"]
    why: 'Solve $0.294\,(\vB/2048)^{-1.08} = 0.082$: $\vB \approx 6{,}700$. A perfect eviction policy is worth what 60 % more desk space buys.'
    sec: reading
  - q: Within HiSparse, what is the only way to cut misses much further?
    a: More hot-cache slots, each costing one raw entry of GPU memory
    wrong: ["A smarter eviction policy", "A faster indexer", "Fewer layers"]
    why: Eviction is within five points of the clairvoyant bound, so the remaining route is a bigger cache — paid in GPU memory, $\vB \times \ve$ per layer per request.
    sec: reading
---

Line up HiSparse's three LRU numbers from [[#landscape-lucky-louis/numbers]] by cache size:

| hot-cache slots $\vB$ | 2048 | 4096 | 8192 |
|---|---|---|---|
| miss rate $\vm$ | 30 % | 13.4 % | 6.7 % |
| ratio to the column before | | 0.45 | 0.50 |

Each doubling of the desk roughly halves the trips in the lift. Three numbers with one pattern usually mean one cause. Here the cause has a name, from [[#school-reuse-distance]].

## Three points, one line {#power-law}

::: aside reminder Reuse distance and the miss-rate curve (II.22)
The [[reuse-distance]] of a request is the number of *distinct* other items requested since this item was last requested. An LRU cache with $\vB$ slots misses a request exactly when its reuse distance is at least $\vB$. So one histogram of reuse distances gives the [[miss-rate-curve]] $\vm(\vB)$ for every cache size at once: $\vm(\vB)$ is the share of requests whose reuse distance is $\vB$ or more.
:::

For the hot cache, the "requests" are the indexer's selections, and the reuse distance of a selection counts the distinct positions selected since that position was last selected. (HiSparse resolves a whole selection at once rather than one request at a time, so the rule holds up to how ties inside one step are broken.)

So HiSparse's three numbers are three readings of one curve: the share of selections whose reuse distance is at least 2048, at least 4096, at least 8192. Plotted on logarithmic axes, they fall almost exactly on a straight line. A straight line on log–log axes is a **power law**. Fitting one takes three lines of numpy:

```python a power law through HiSparse's three LRU points
import numpy as np
B = np.array([2048, 4096, 8192]); m = np.array([0.30, 0.134, 0.067])
# a straight line in log-log coordinates
slope, icpt = np.polyfit(np.log(B / 2048), np.log(m), 1)
print(round(slope, 2), round(np.exp(icpt), 3))          # -1.08 0.294
print(np.round(np.exp(icpt) * (B / 2048) ** slope, 3))  # [0.294 0.139 0.066]
```

$$
\vm(\vB) \approx \underbrace{0.294}_{\text{miss rate at } \vB = 2048} \times \Big(\frac{\vB}{2048}\Big)^{\underbrace{-1.08}_{\text{the slope}}}
$$ {#eq-landscape-power-law}

::: figure fig-landscape-reuse reuseCurve
**HiSparse's miss rates on logarithmic axes.** Horizontal: hot-cache slots $\vB$ per layer per request (log scale, base 2). Vertical: miss rate $\vm$ (log scale). Dots: HiSparse's three LRU measurements on the GLM-5.1 trace. Line: the power law fitted through them, solid between the measurements and dashed outside, where it is extrapolation and nothing more. Diamond: Bélády's clairvoyant policy at 4096 slots; small squares: FIFO and random eviction at 4096. Drag the knob along the curve (or use the slider) to read off the miss rate and what that cache size costs per request in the reference setting: misses per layer per step ($\vm \times 2048$), link bytes per step and GPU memory at 640 bytes per entry.
:::

::: try
1. Drag from 4096 to 8192 slots. The misses per step halve; the GPU memory per request doubles.
2. Find where the line crosses Bélády's 8.2 %: about 6,700 slots.
3. Drag past 8192 into the dashed part. The numbers keep falling, but nobody has measured them.
:::

::: takeaway
- HiSparse's three LRU miss rates are three points of one reuse-distance curve.
- They fit a power law, $\vm(\vB) \propto \vB^{-1.08}$, to within 4 %.
:::

## What the curve says {#reading}

**Double the cache, halve the misses.** $2^{-1.08} \approx 0.47$. That is the whole exchange rate of the hot cache, at least between 2048 and 8192 slots.

**Smarter eviction has little left to give.** At 4096 slots, the clairvoyant Bélády policy misses 8.2 % against LRU's 13.4 %. On the curve, LRU reaches 8.2 % at about 6,700 slots. So a perfect oracle for eviction is worth what about 60 % more slots would buy, and no real policy is a perfect oracle. FIFO (17.2 %) and random eviction (16.1 %) sit on the curve where LRU would have only about 3,400 and 3,600 slots: recency is worth something, but not a lot.

**What remains is buying slots, and slots cost memory.** Every slot holds one raw entry. Moving along the curve trades one of the two prices of [[#landscape-toy-trace/two-prices]] against the other:

| slots $\vB$ | miss rate $\vm$ | misses per layer per step | link bytes per step | GPU memory per request |
|---|---|---|---|---|
| 2048 | 30 % | 614 | 30.7 MB | 102 MB |
| 4096 | 13.4 % | 274 | 13.7 MB | 204 MB |
| 8192 | 6.7 % | 137 | 6.8 MB | 409 MB |
| 16384 (extrapolated) | ≈ 3.1 % | ≈ 64 | ≈ 3.2 MB | 818 MB |

(Per request, all 78 layers, $\vk = 2048$ selections per layer per step, 640 bytes per entry; [[#landscape-reference-setting]] fixes these numbers.)

::: keycard The exchange rate of the hot cache
$$
\vm(\vB) \propto \vB^{-1.08}
$$

Double the slots, roughly halve the misses: link bytes fall about as fast as GPU memory grows.
:::

::: note warning A curve through three points
Three averaged points are a thin basis for a law. The exponent could easily be 1.0 or 1.2, and nothing says the line stays straight beyond 8192 slots. We use the fit for what it is: a compact way to say "doubling roughly halves" inside the measured range, and to put Bélády's point on the same scale. [[#missed-stack-distance]] says what a real reuse-distance histogram would add.
:::

::: takeaway
- Doubling the hot cache roughly halves the misses, and doubles its memory.
- A clairvoyant eviction policy would be worth only about 60 % more slots: eviction is nearly exhausted as a way to save traffic.
- Within HiSparse, link traffic and GPU memory trade against each other along this one curve. Making either cheaper needs a smaller price per entry.
:::
