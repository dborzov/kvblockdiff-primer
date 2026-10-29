---
title: 'Wave 2: what to measure'
nav: 'Wave 2: what to measure'
group: 'Wave 2'
lede: Wave 1 asks whether entries are alike. Wave 2 asks whether the right dictionaries are on the GPU when the misses arrive. Seven measurements, each with the number that would change the design.
cards:
  - q: Why does wave 2 first measure token miss rates at B = 2K, 4K and 8K?
    a: As a sanity check — they should land near HiSparse's 30 %, 13 % and 7 %; if not, the proxy indexer is more or less local than DSA's
    wrong: ["Because they decide the block size", "Because they measure fallen-apple similarity", "Because the cost model ignores them"]
    why: Exact top-k on a 2B model is a stand-in. Comparing its miss rates with HiSparse's published ones says how far to trust its block statistics.
    sec: seven
  - q: 'Which reading of framework C says heavy per-block dictionaries are affordable?'
    a: 'A δ-miss fraction of at least 0.8 with at most 8 resident dictionaries, and at most 0.1 loads per step'
    wrong: ["Any δ-miss fraction above zero", "A token miss rate below 7 %", "More than 16 resident dictionaries"]
    why: 'Most misses then find their dictionary on the GPU, and loading a 256-entry dictionary every ten steps or less stays small next to ~274 misses per layer per step.'
    sec: seven
  - q: When is framework C moot?
    a: When wave 1 says light dictionaries (w ≈ 2–4) suffice — they are all resident anyway
    wrong: ["When the hot cache is large", "When values are incompressible", "When the miss rate is above 30 %"]
    why: A dictionary a few entries' worth in size costs almost nothing to keep for every block, so where misses land no longer matters.
    sec: seven
  - q: In the synthetic replay sweep, what happens to f_D as more dictionaries are kept resident?
    a: It rises — more of the misses find their block's dictionary already on the GPU — while the loads per step change with the policy
    wrong: ["It falls, because the cache thrashes", "It stays exactly constant", "It becomes larger than 1"]
    why: f_D is the share of misses whose dictionary is resident; keeping more dictionaries can only help, at the price of HBM.
    sec: sweep
---

Wave 1 settles the question about bytes: are neighbouring entries alike enough to code against a shared dictionary? Wave 2 settles the question about timing. A dictionary helps a miss only if it is on the GPU when the miss happens. That is a property of *which* entries the indexer wants, step after step — framework C of [[#questions-framework-c]] — and it is measured on the recorded selections with [[trace-replay|trace replay]].

Wave 2 runs only on a "go" from the [[decision-rule|decision rule]].

## Seven measurements {#seven}

1. **Sanity: token miss rates** $\vm(\vB)$ for $\vB \in \{2\text{K}, 4\text{K}, 8\text{K}\}$. Expect HiSparse's ballpark — 30, 13 and 7 % ([[#landscape-lucky-louis]]). If the proxy's selections are much more or much less local than DSA's, say so and recalibrate expectations.
2. **Block concentration per step.** For $\vb \in \{2\text{K}, 8\text{K}\}$: how selections spread over blocks, and the share held by the heaviest 1, 2, 4 and 8 blocks. The [[heavy-block|heavy-block]] claim, in numbers.
3. **Block reuse distance.** How long until a block is wanted again — the [[reuse-distance|reuse distance]] at block granularity, which gives the dictionary cache's miss rate at any size $\vnD$ directly.
4. **$\vfD(\vnD, \vb)$ and $\vnload$** for $\vnD \in \{2, 4, 8, 16\}$, under both residency policies of [[#plan-wave2-indexer/replay]].
5. **Victim-tier value.** The full reuse-distance distribution of the trace, so that the gain of a [[victim-tier|victim tier]] of $\vBV$ deltas is read off rather than extrapolated ([[#missed-victim-tier]]).
6. **Sibling residency** (only if [[sib]] did well in wave 1): how often an entry's chosen sibling is in the hot cache when the entry misses.
7. **Content of the residual misses.** Are the entries that miss — surprising in *time* — also harder to code — surprising in *content*? Compare the rate of missed entries with the rate of all entries. If they are harder, $\vrho$ on the miss path is worse than wave 1's average.

Measurement 3 needs no new tool. On [[#school-reuse-distance]] the LRU miss rate of every desk size was read straight off the reuse distances of the forecaster's morning. Wave 2 reads the dictionary cache's miss rate off the reuse distances of *blocks* in the same way.

::: dataset fig-plan-storm-reuse storm-morning view=reuse,dists metrics=dist2,curve,belady4
**Reuse distances of the forecaster's morning.** *With reuse distances:* each repeat request joined to the previous request for the same logbook, with the number of other logbooks asked for in between written under it. *Reuse distances:* how often each distance occurs. *Numbers:* the LRU miss rate for every desk size, read off the distances. In wave 2 the requests are a step's blocks and the desk holds $\vnD$ dictionaries. Made-up data (II.21–II.22).
:::

What would change the design, from framework C:

| reading | meaning | design |
|---|---|---|
| $\vfD \ge 0.8$ at $\vnD \le 8$, $\vnload \le 0.1$ | misses pile into few, long-lived blocks | heavy per-block dictionaries are affordable |
| $0.5 \le \vfD < 0.8$ | partly concentrated | depends on $\vw$: the cost model decides |
| $\vfD < 0.5$ | misses are spread out | only light all-resident dictionaries, or request scope |

::: aside reminder Why 0.1 loads per step?
A dictionary load costs $\vw$ raw-miss equivalents, against about 274 misses per layer per step in the reference setting. For $\vw = 256$, staying well below that budget means fewer than about 0.1 loads per step per layer ([[#homework-break-even]]).
:::

And one shortcut: if wave 1 finds that **light** dictionaries (a few entries' worth, like loc) capture the gain, framework C is moot. Every block's dictionary can stay resident, and where misses land no longer matters.

::: takeaway
- First check that the proxy's miss rates look like HiSparse's; then measure concentration, block reuse, $\vfD$ and $\vnload$.
- $\vfD \ge 0.8$ with at most 8 dictionaries and $\vnload \le 0.1$ makes heavy dictionaries affordable; below 0.5 only light ones survive.
- With light dictionaries, framework C is moot.
:::

## A synthetic replay {#sweep}

What the curves of measurement 4 look like can be seen on the synthetic trace of the previous page.

::: figure fig-plan-replay-sweep planReplaySweep wide
**δ-miss fraction and dictionary loads against the number of resident dictionaries**, from replaying the synthetic trace of [[#fig-plan-selections]] (300 steps, $\vk = 128$ of 4096 positions, blocks of 256, query drift 0.15) through a hot cache of $\vB = 256$ entries and a dictionary cache of $\vnD$ dictionaries (log scale). Lapis: keep the heaviest blocks of the hot cache resident; vermilion dashed: keep an LRU of blocks hit by a miss. Left: $\vfD$, with the 0.8 and 0.5 readings of framework C. Right: $\vnload$, loads per step, with the 0.1 break-even for a heavy dictionary. The readout gives the token miss rates for $\vB = \vk, 2\vk, 4\vk$ — about 9, 3 and 2 %, far more local than HiSparse's real trace. Seeded, synthetic: the shape of the measurement, not its result.
:::

::: try
1. Set the topic strength to 0. With four dictionaries resident, only about a quarter of the misses find theirs, and the heaviest-block policy loads 0.27 dictionaries per step.
2. Back to 1.5: about half the misses are δ-misses with four dictionaries, at 0.04 loads per step — well under the 0.1 break-even.
3. Look at the right end. With 16 dictionaries every block of this toy is resident, so $\vfD$ nears 1 whatever the keys. A 32K context in 2K blocks also has only 16 blocks per layer: the real question is whether far fewer suffice.
4. Compare the policies on the right: chasing every miss loads more than one dictionary per step when few fit; keeping the heaviest blocks loads rarely.
:::

::: takeaway
- The replay turns a recorded trace into $\vfD$ and $\vnload$ curves for any cache size and policy.
- Concentration depends on the keys; the synthetic curves show the shape, the real dump the answer.
:::
