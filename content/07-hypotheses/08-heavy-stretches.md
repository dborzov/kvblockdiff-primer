---
title: Lucky Louis, stretch by stretch
nav: Heavy stretches
group: Which, and what
lede: A dictionary shelf with a handful of slots works only if misses keep landing in the same few stretches, step after step. That is a second, stronger form of the Lucky Louis property, about stretches rather than picks, and nobody has measured it.
cards:
  - q: Misses spread evenly over 25 stretches, and the shelf holds 4 dictionaries. Roughly what is the δ-miss fraction?
    a: About 16 %
    wrong: ["About 85 %", "About 4 %", "100 %, every miss has a dictionary somewhere"]
    why: 'Only misses that land in one of the 4 on-fire stretches are δ-misses: 4 / 25 = 0.16.'
    sec: where
  - q: How does the stretch form of the Lucky Louis property differ from the ordinary one?
    a: The ordinary one says the same positions are re-picked; the stretch form says the misses also crowd into a few stretches that stay busy for many steps
    wrong: ["They are the same statement", "The stretch form is about the bytes inside cherries", "The stretch form is about the layer axis"]
    why: Picks can repeat while being scattered over the whole sequence. Then each miss lands in a different stretch, and a few shelved dictionaries help little.
    sec: where
  - q: One dictionary load costs about as much link traffic as how many raw misses?
    a: w, its weight in cherries' worth
    wrong: ["One", "b, the stretch length", "k, the picks per step"]
    why: 'A load moves $\vw\,\ve$ bytes, a raw miss $\ve$. Against about 274 misses per layer per step on the Pin, loads × w must stay well below 274.'
    sec: residency
  - q: Why is the heavy-stretch question unmeasured on the Bench?
    a: No indexer ran; the dump has values and keys but no queries and no picks
    wrong: ["Because the stretch length was never fixed", "Because the campaigns ran out of time", "Because HiSparse already published it"]
    why: The question is a statistic of a pick trace. A stand-in indexer built from recomputed queries would produce one.
    sec: verdict
---

Every decode step, at every layer, about 274 picks miss the [[hot-cache]] on [[pin|the Pin]] ([[#landscape-derived-numbers]]). A 100K-token sequence falls into 25 [[stretch|stretches]] of 4096. The GPU keeps the dictionaries of a few stretches, say $\vnD = 4$, on its [[dictionary-shelf]]. Where do the 274 misses land?

Two worlds with the same miss count, at an assumed delta share $\vrho = 0.65$:

| | misses spread evenly | misses piled into 4 heavy stretches |
|---|---|---|
| misses per layer per step | 274 | 274 |
| stretches they land in | all 25 | mostly the same 4 |
| δ-miss fraction $\vfD$ with 4 dictionaries on the shelf | 4 / 25 = 16 % | 85 % (assumed) |
| link bytes, in raw cherries' worth | 274 × (0.16 × 0.65 + 0.84) ≈ 259 | 274 × (0.85 × 0.65 + 0.15) ≈ 192 |
| saving on miss traffic | about 6 % | about 30 % |

Same bytes, same compressor, same $\vrho$. The only difference is where the misses land, and it is worth five times more saving.

## Where do the misses land? {#where}

The [[lucky-louis]] says that from one step to the next the [[indexer]] re-picks mostly the same positions. That is why the hot cache hits. But the positions could be scattered: a few in every stretch of a 100K-token sequence. Then each miss tends to fall in a different stretch, and a shelf of $\vnD$ dictionaries catches few of them.

The shelf needs more. A [[heavy-stretch]] is one that holds many of the current step's picks ([[#app-on-fire]]), and the property the design needs is the Lucky Louis property *at stretch granularity*: picks concentrate into a few heavy stretches, and those stretches stay heavy for many steps. Stated as a hypothesis in the units of the shelf: for some small $\vnD$ and some stretch length $\vb$, most misses are δ-misses and dictionary loads are rare.

::: figure fig-hyp-heavy heavyBlocks wide
**A toy indexer, with and without heavy stretches.** One layer of a toy sequence: 4096 positions in 32 stretches of 128 (alternate stretches shaded), $\vk = 64$ picks per step, a hot cache of $\vB = 128$ slots managed as in HiSparse, and a shelf of $\vnD$ dictionaries with a simple popularity rule. At each step the toy indexer keeps 85 % of its previous picks (the Lucky Louis part). Its new picks come, with probability *concentration*, from three "topic" stretches, and otherwise from anywhere; each topic stretch is replaced by a random one after a *topic lifetime* on average. Top: 120 steps after a warm-up of 50, one mark per pick, grey a hit, green a [[delta-miss|δ-miss]], brown a [[raw-miss|raw miss]]. Tiles: $\vfD$, dictionary loads per step, the share of misses in the four busiest stretches, and the miss rate. Bottom: the share of all misses that landed in each stretch. Every number comes from this seeded toy, run live; it is a toy, not a trace.
:::

::: try
1. Set concentration to 0. The hot cache still hits about 85 % of picks, Lucky Louis is intact, yet only 13 % of misses are δ-misses and the shelf changes most steps (0.66 loads per step).
2. Back to 80 %, the default: 77 % of misses are δ-misses, with 0.14 loads per step, one load every seven steps.
3. Keep 80 % and shorten the topic lifetime to 3 steps. Heavy stretches that do not *stay* heavy are almost as bad as none: $\vfD$ falls to 29 % and loads triple.
4. Set $\vnD = 1$, then 8: $\vfD$ goes from 25 % to 81 %. More shelf catches more misses, at the price of GPU memory.
:::

Notice what the hit rate does while you move the concentration slider: almost nothing. The per-pick property and the per-stretch property are different statistics, and only the second decides $\vfD$.

::: takeaway
- A heavy stretch holds many of the current step's picks; the design needs picks crowding into few stretches that stay busy for many steps.
- The ordinary hit rate does not reveal it; it must be measured on its own.
:::

## Why the shelf needs it {#residency}

Count a dictionary load in misses. A load moves $\vw\,\ve$ bytes; a raw miss moves $\ve$. One load costs as much link traffic as $\vw$ raw misses, so against the Pin's 274 misses per layer per step:

$$
\underbrace{\vnload}_{\text{loads per step per layer}} \times \underbrace{\vw}_{\text{cherries' worth each}} \;\ll\; \underbrace{274}_{\text{misses per layer per step}} .
$$ {#eq-hyp-load-budget}

How heavy are real dictionaries? The campaigns give three sizes, all for `(2, 256)` cherries at stretch 4096 on the values of Qwen3.5-2B, so $\vw = \vxshare \times 4096$ cherries' worth per punnet ([[#scenario-scope]]). Put them on a Pin-sized sequence of 25 stretches and compare with a hot cache of $\vB = 4096$ slots, as an illustration:

| dictionary | $\vxshare$ | $\vw$ per punnet | all 25 stretches, per layer | in hot caches | what the shelf must do |
|---|---|---|---|---|---|
| furrow statistics, the lightest real one ([[#toolbox-furrow-statistics]]) | ≈ 0.001 | ≈ 4 | ≈ 100 cherries' worth | 2 % of one | keep every stretch's dictionary; $\vfD = 1$, no loads, the question disappears |
| the light no-tree compressor, ratio 0.686 | 0.021 | ≈ 86 | ≈ 2 150 | half of one | plausibly all resident; a few loads per sequence |
| the best compressor, ratio 0.636 | 0.525 | ≈ 2 150 | ≈ 54 000 | 13 hot caches | shelve a few by popularity; everything hangs on heavy stretches, and a load costs as much as 2 150 misses |

So the heavy-stretch question matters exactly as much as dictionaries are heavy. The best compressor's dictionary is half the punnet, because its reference tree stores real cherries; for it, fewer than about 0.1 loads per step per layer is the budget, and each dictionary must stay useful for well over ten steps. The light compressor can nearly skip the question. Which of the two the application wants is the trade of [[#app-the-napkin]].

:::: compare Two forms of the Lucky Louis property
::: col Per pick (measured on the Pin)
- The same *positions* are re-picked from step to step.
- HiSparse: 87 % hits at $\vB = 4096$.
- Decides the **hit rate**.
:::
::: col Per stretch (unmeasured)
- Misses crowd into the same few *stretches* for many steps.
- Measurable from a pick trace, with no cherry opened.
- Decides **$\vfD$ and the dictionary loads**.
:::
::::

::: takeaway
- One load costs $\vw$ raw misses; keep $\vnload \times \vw$ far below 274 per layer per step.
- Heavy dictionaries ($\vw ≈ 2 150$) need heavy, long-lived stretches; light ones (≈ 4 to 86) can stay resident.
:::

## Verdict {#verdict}

Unmeasured. On [[bench|the Bench]] no indexer ran: the dump holds values and pre-RoPE keys of 30 sequences and nothing about picks, so there is no $\vk$, no miss rate and no per-stretch count ([[#landscape-reference-settings]]). On the Pin, HiSparse's trace is not ours, and its paper reports hit rates, not where the misses land.

What a pick trace would show, per sequence, per layer, per step:

1. **Concentration.** Group the step's picks and misses by `stretch_id = token_pos_id // stretch_len`; read the share in the four busiest stretches, for `stretch_len` 512, 4096 and 16 384.
2. **Lifetime.** For each stretch, the steps between one miss in it and the next: a stretch's own [[reuse-distance]], which is the shelf's stack-distance curve ([[#hypotheses-stack-distance]]).
3. **The shelf's numbers.** Replay the shelf rule of [[#app-on-fire]] on the trace: $\vfD$ and $\vnload$ against $\vnD$ and $\vb$, for the three dictionary weights above.

The trace comes from a stand-in indexer: recompute the queries for the dump with one pass of Qwen3.5-2B and take exact top-$\vk$ attention per layer as the picks ([[#plan-queries-and-picks]]); the replay is [[#plan-hot-cache-replay]]. The readings are written down before the data: $\vfD \ge 0.8$ with $\vnD \le 8$ and $\vnload \le 0.1$ reads as "heavy dictionaries affordable"; $\vfD < 0.5$ reads as "light, all-resident dictionaries or sequence scope only" ([[#plan-decision-rules]]).

::: theme which-vs-what
Entirely a which-question. It can be answered from positions alone, and its answer is independent of everything Part VIII measured about the bytes. The four combinations of the two answers point at four different systems.
:::

::: takeaway
- Verdict: unmeasured; no pick trace exists for the Bench, and the Pin's is HiSparse's.
- A stand-in indexer on the dump gives concentration, lifetime and the shelf's $\vfD$ and $\vnload$ in one replay.
:::
