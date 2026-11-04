---
title: The hot cache, replayed
nav: The hot cache
group: The hot cache
lede: The first reading of the replay was registered as a calibration. If the stand-in's miss rates came within a factor of two of HiSparse's, its other readings would be believed. They came within 1.2–1.5×, with the same slope and the same gap to a clairvoyant policy. Then the misses were counted per step and per layer.
cards:
  - q: 'At the Pin''s budget share (512 picks, about 2 %), what does the stand-in''s hot cache miss at B/k = 1 / 2 / 4?'
    a: 35 / 19 / 9.7 %
    wrong: ["30 / 13.4 / 6.7 %", "28 / 10 / 2.5 %", "13.4 / 6.7 / 3.4 %"]
    why: 'HiSparse measured 30 / 13.4 / 6.7 % on GLM-5.1: the stand-in is 1.2–1.5× higher, inside the pre-registered 2× rule. 28 / 10 / 2.5 % is pin-absolute, at four times the share.'
    sec: calibration
  - q: Why does pin-absolute (k = 2048 on the Bachelor) fail the 2× rule at B/k = 4?
    a: 'At 2048 of about 27K positions its budget share is 7.5 %, not 2 %, and miss rates follow the share'
    wrong: ["Because its hot cache is smaller", "Because it uses a resident window", "Because GLM-5.1 has more layers"]
    why: 'At B/k = 4 it misses 2.5 %, 0.37× HiSparse''s 6.7 %. The next page shows that the miss rate is a function of the share φ = k/t.'
    sec: calibration
  - q: What is the burst factor?
    a: The 99th percentile of one layer's misses per step divided by their mean
    wrong: ["The share of steps with more misses than the mean", "The ratio of LRU to Bélády misses", "The misses of the worst layer divided by the best layer's"]
    why: 'Pin-scaled at B/k = 2: mean 97 misses of 512 picks, p99 263, a burst factor of 2.9 (2.2–3.8 across layers).'
    sec: bursts
  - q: What does a resident window of 128 positions do to the miss rate at the Pin's share?
    a: It raises it by 13–20 %
    wrong: ["It lowers it by 13–20 %", "Nothing", "It halves it"]
    why: 'The window takes the easiest hits (recent positions that would hit anyway) and pushes the 512 picks to farther positions, which repeat less.'
    sec: bursts
  - q: 'HiSparse''s Pin has "274 misses per layer per step". What does the replay say about that number?'
    a: 'It is an average of unequal layers: per-layer miss rates span 11–29 % (p10–p90) at B/k = 2'
    wrong: ["Every layer misses exactly 274 times", "Only the first layer misses", "Layers alternate between 0 and 548 misses"]
    why: 'In layers 0–11 even layers miss about twice as often as odd ones (24 % against 13 %); layer 0 is local.'
    sec: layers
---

HiSparse measured its [[hot-cache|hot cache]] on one GLM-5.1 trace: 30, 13.4 and 6.7 % of picks missed with 2048, 4096 and 8192 slots for 2048 picks per layer per step ([[#landscape-lucky-louis]]). The plan wrote down, before any data, what a stand-in's numbers would have to look like to be believed: miss rates within a factor of two of these ([[#plan-decision-rules]]).

## Calibration against HiSparse {#calibration}

The replay ran HiSparse's [[lru|LRU]] with its guard on the stand-in's picks, for the three named configurations of [[#picks-carrying-numbers/configurations]], at the same ratios $\vB/\vk$ HiSparse used.

| configuration | $\vB/\vk$ = 1 | 2 | 4 | Bélády at 2 | consecutive-step overlap | grade |
|---|---|---|---|---|---|---|
| HiSparse, GLM-5.1 (2048 picks of 100K) | 30 % | 13.4 % | 6.7 % | 8.2 % | ≈ 70 % | their measurement |
| pin-scaled (512 picks, `W = 0`) | 35.1 [34.4–36.2] | 19.0 [18.2–20.2] | 9.7 [8.7–10.7] | 12.0 | 65 % | measured |
| pin-absolute (2048 picks, `W = 0`) | 28.1 | 10.0 | 2.5 | 5.5 | 72 % | measured |
| v4-scaled (128 squeezed rows of 4, `W = 32`) | 33.4 | 17.9 | 9.6 | 11.5 | 67 % | measured |

Read the pin-scaled row against HiSparse's.

1. **The 2× rule holds at every size**: 1.17, 1.41 and 1.45 times HiSparse's rates. Pin-absolute fails it at $\vB/\vk = 4$ (0.37×). That failure is what the next page predicts: 2048 of about 27K positions is a budget share of 7.5 %, not 2 % ([[#picks-share-carries]]).
2. **The same slope.** Over $\vB/\vk$ from 1 to 8 the miss rate falls as a power of the cache size, $\vm \propto \vB^{-\valpha}$, with $\valpha = 1.07$ [1.01–1.15] for pin-scaled against 1.08 for HiSparse's three points ([[#landscape-reuse-curve]]).
3. **The same gap to a clairvoyant policy.** [[belady|Bélády]] at $\vB = 2\vk$ misses 12.0 %; LRU over Bélády is 1.58, against HiSparse's 13.4 / 8.2 = 1.63.
4. **Slightly more churn.** The [[lucky-louis|Lucky Louis property]], read as the share of a step's picks that the previous step also picked: 65 % for pin-scaled, about 70 % for GLM-5.1. GLM-5.1's trained indexer re-picks more than exact attention does on Qwen 2.5 1.5B ([[#picks-the-indexer]] gives one reason this can happen).

::: figure fig-picks-reuse picksReuse
**The hot cache's miss rate against its size.** Horizontal axis: $\vB/\vk$, hot-cache slots per pick (1 to 32, log scale). Vertical axis: the LRU miss rate $\vm$, the share of picks that miss (log scale). One line per named configuration (pin-scaled, pin-absolute, v4-scaled), the chosen one with a band for the range over the five sequences and hollow circles for Bélády's clairvoyant policy at $\vB/\vk$ = 1, 2, 4. Filled diamonds: HiSparse's three LRU points on GLM-5.1; the hollow diamond is its Bélády point (their measurement); dashed line: the fit $0.294\,(\vB/\vk)^{-1.08}$ through the three points. The readout compares the chosen configuration with HiSparse: the three miss rates, their ratios, the slope over $\vB/\vk$ = 1 to 8, and LRU over Bélády. Means over 5 sequences × 28 layers, steps `t >= 8192`. Grade: measured (the fit is derived).
:::

::: try
1. Choose pin-scaled. The line runs just above HiSparse's diamonds, parallel to the grey fit.
2. Choose pin-absolute. Its line falls much more steeply: 2048 picks of about 27K positions are a share of 7.5 %, and the next page shows the slope rising with the share (0.63 at 64 picks, 2.2 at 2048).
:::

::: takeaway
- Pin-scaled misses 35 / 19 / 9.7 % at $\vB/\vk$ = 1 / 2 / 4 against HiSparse's 30 / 13.4 / 6.7 %: 1.2–1.5×, inside the 2× rule.
- Same slope (1.07 against 1.08) and the same LRU-to-Bélády gap (1.58 against 1.63).
- 65 % of picks repeat from step to step, against about 70 % on GLM-5.1.
:::

## Misses per layer per step, and bursts {#bursts}

The link sees misses per step, not a miss rate. Pin-scaled at $\vB/\vk = 2$ has, per layer per step, a mean of 97 [94–104] misses of its 512 picks, a median of 88, a 90th percentile of 170 and a 99th percentile of 263. Pin-absolute has a mean of 205, against the 274 that HiSparse's 13.4 % gives on the Pin ([[#landscape-derived-numbers]]), and a 99th percentile of 679.

::: define burst-factor
- **What it is.** The 99th percentile of one layer's misses per decode step, divided by their mean.
- **Example.** Pin-scaled at $\vB/\vk = 2$: 263 / 97 = 2.9 on average, 2.2 to 3.8 across layers. Pin-absolute: 3.5.
- **Easy to confuse with** the spread across layers (below) and with the miss rate. The burst factor is about steps: one step in a hundred has at least 2.9 times the mean misses. A link sized for the mean is late at such a step unless the fetches are prefetched or spread over earlier steps.
:::

Two settings move the mean:

- **The resident window.** Keeping the last 128 positions resident raises the miss rate by 13–20 %. The window takes the easiest hits, recent positions that would have hit anyway, and the 512 picks move to farther positions, which repeat less. At V4's ratio (`W = 32` of a budget of 512 positions) the rise is 6–7 %.
- **Decode-like steps.** Counted over assistant text and tool calls only ([[#picks-the-bachelor/the-dump]]), the miss rate is 1–9 % higher than over all steps.

::: takeaway
- Pin-scaled at $\vB/\vk = 2$: 97 misses per layer per step on average, 263 at the 99th percentile; burst factor 2.9.
- A resident window of 128 adds 13–20 % to the miss rate; decode-like steps add 1–9 %.
:::

## Layers {#layers}

The napkins of Part VI use one miss rate for all 78 layers of the Pin. The replay reports each of the Bachelor's 28 layers.

- **Layer 0 is local.** It puts 39 % of its attention on the token itself and has no sink.
- **Even and odd layers differ.** In layers 0 to 11, even layers miss about twice as often as odd ones: 24 % against 13 % at $\vB/\vk = 2$.
- **The spread is wide.** At $\vB/\vk = 2$ the per-layer miss rates span 11–29 % between the 10th and 90th percentile of layers (9–33 % from the lowest to the highest). The Pin's "274 misses per layer per step" is an average over layers that differ by a factor of about three.
- **Bursts differ by layer too.** The burst factor of pin-scaled ranges from 2.2 to 3.8 between the 10th and 90th percentile of layers.

::: figure fig-picks-layers picksLayers wide
**Miss rate and burst factor per layer.** Two panels with the same horizontal axis: relative depth `l / 28` of the Bachelor's layers. Top: the LRU miss rate at $\vB/\vk = 2$, one line per named configuration, with a band for the range over the five sequences; the dashed line is HiSparse's mean over 78 layers, 13.4 %. Bottom: the [[burst-factor|burst factor]], the 99th percentile over the mean of misses per layer per step, at $\vB/\vk = 2$. The readout gives each configuration's mean miss rate with its p10–p90 range over layers and its burst factor, and pin-scaled's misses per layer per step (mean, p50, p90, p99). Grade: measured.
:::

::: aside source Receipts
bachelor-kv at commit aa89697, `docs/results.md` §1 (the table, readings R1–R4, window, decode-like steps, layers). Detail and per-layer values: `results/summary/hotcache.json` (`R1_calibration`, `R2_overlap`, `R3_slope`, `R4_misses_per_step`), computed at commit d3c2b80; `docs/log.md` 2026-11-03 (ratios 1.17 / 1.41 / 1.45 and 0.94 / 0.75 / 0.37 to HiSparse; pin-absolute 205 misses, p99 679, burst 3.5; per-layer range 9–33 %). The slope 1.07 is the mean of per-pair fits over $\vB/\vk \in [1, 8]$ (1.065; the figure file `reuse_curve.png` prints it as 1.06). HiSparse: §4.3 of its paper, their measurement, as on [[#landscape-lucky-louis]].
:::

::: takeaway
- Per-layer miss rates span 11–29 % (p10–p90) at $\vB/\vk = 2$; layer 0 is local; in layers 0–11 even layers miss twice as often as odd ones.
- A single miss rate for all layers, as the Part VI napkins use, averages layers that differ by about 3×.
:::
