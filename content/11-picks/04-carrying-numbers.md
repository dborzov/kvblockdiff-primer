---
title: Carrying numbers from a small LLM
nav: Carrying numbers
group: The setting
lede: Qwen 2.5 1.5B at 27K tokens is far from GLM-5.1 at 100K. Every setting of the replay is scaled by the quantity it exists to serve, the scalings that argument cannot settle are measured inside the dump, and what cannot be measured is stated. This page lists each setting, how it scales, and the named configurations built from them.
cards:
  - q: What is the budget share φ?
    a: 'The share of the context one layer''s picks cover at step t: φ = k / t (k·g / t for squeezed rows)'
    wrong: ["The share of misses that are δ-misses", "The share of the hot cache taken by dictionaries", "The share of the attention mass the picks hold"]
    why: 'On the Pin it is 2048 of 100 384, 2.0 %. The pin-scaled configuration keeps it: 512 of about 25K on the Bachelor.'
    sec: knobs
  - q: Why does the hot-cache size scale with the budget k, as B/k?
    a: The hot cache exists to hold picks that repeat, and there are k picks per step
    wrong: ["Because GPU memory is proportional to k", "Because the link moves k picks per step", "Because B and k are both powers of two"]
    why: 'HiSparse quotes its sizes as 2048, 4096 and 8192 slots for k = 2048: B/k = 1, 2 and 4. The replay uses the same ratios.'
    sec: knobs
  - q: 'What does the "pin-absolute" configuration test?'
    a: 'HiSparse''s literal numbers, k = 2048, on a context about four times shorter, so a budget share of 7–8 % instead of 2 %'
    wrong: ["The Pin's budget share on the Bachelor", "DeepSeek-V4's squeezed rows", "A hot cache with no guard"]
    why: 'Pin-scaled keeps the share (k = 512); pin-absolute keeps the count. Which one reproduces HiSparse''s miss rates says which quantity carries.'
    sec: configurations
  - q: Which difference between the Bachelor and GLM-5.1 cannot be measured inside the dump?
    a: The size and training of the LLM, a 1.5B dense LLM against a frontier LLM trained with sparse attention
    wrong: ["The context length", "The number of query heads in the selection", "The resident window"]
    why: 'Context, heads, window, indexer error and depth all vary inside the dump. LLM size needs a size ladder or a second LLM; neither has run.'
    sec: inside-and-outside
---

GLM-5.1 has 78 layers, one MLA latent per token per layer, roughly 750B parameters and, on the Pin, a 100K-token context. DeepSeek-V4 has 43 layers and 64 indexer heads and serves up to 1M tokens. [[bachelor|The Bachelor]] is a 1.5B-parameter LLM with 28 layers at 25K–30K tokens. No number crosses that gap by default. The replay was therefore designed around one rule: **every setting is scaled by the quantity it exists to serve; a scaling that argument cannot settle is measured inside the dump; what cannot be measured is stated.**

## Every setting scaled by what it serves {#knobs}

The first setting is the budget, the picks per layer per step. It exists so that attention reads enough of the context, so it scales with the context.

::: define budget-share
- **What it is.** The share of the context one layer's picks cover at step $\vt$: $\vshare = \vk/\vt$, or `share = k * g / t` when one pick is a squeezed row of `g` positions.
- **Example.** The Pin picks 2048 of 100 384 positions: $\vshare = 2.0\,\%$. The pin-scaled configuration below picks 512 of about 25 000 on the Bachelor, the same 2 %.
- **Easy to confuse with** the share of the attention mass the picks hold (87 % for 512 picks, [[#picks-the-bachelor/mass]]) and with the hot-cache ratio $\vB/\vk$. The budget share counts positions, not mass and not slots.
:::

$$
\vshare = \frac{\vk}{\vt}: \qquad \underbrace{\frac{2048}{100\,384} = 2.0\,\%}_{\text{the Pin}}, \qquad \underbrace{\frac{512}{25\,000} \approx 2\,\%}_{\text{the Bachelor, pin-scaled}}
$$ {#eq-picks-share}

When a pick is a squeezed row, the budget counts positions, `k * g`. DeepSeek-V4 picks 512 rows of 4 positions, 2048 positions in all: 1.6 % of a 128K context and 0.2 % of a 1M one.

The other settings follow the same rule:

| setting | what it serves | scales with | the Pin | DeepSeek-V4, compressed layers | the Bachelor |
|---|---|---|---|---|---|
| budget `k * g` | reading enough of the context | the context: `share = k * g / t` | 2048 of 100 384 (2.0 %) | 512 rows × 4 = 2048 (1.6 % at 128K, 0.2 % at 1M) | 512 at ≈ 25K (2 %) |
| hot cache $\vB$ | holding the picks that repeat | the budget: $\vB/\vk$ | 1, 2, 4 | not published | 1, 2, 4, 8 |
| resident window `W` | local fluency, always on the GPU | the budget: `W / (k * g)` | 0 (the newest row only) | 128 of 2048 (1/16) | 0, and 32 for V4-style |
| squeezed rows `g` | what one pick covers | fixed by the design | 1 | 4 | 1 and 4 |
| stretch length $\vb$ | what one dictionary serves | **measured**: $\vb/\vt^{1.27}$ at fixed $\vshare$ ([[#picks-shelf]]) | 4096 (a choice) | counted in rows | 256 to 4096 |
| shelf size $\vnD$ | dictionaries on the GPU | the shelf's coverage of the context | 4 (assumed in Part VI) | — | 1 to 16 |

The stretch length was first kept in absolute tokens: a file read or a tool output has a length that does not grow with the context, and a dictionary is amortised over $\vb$ cherries ([[#scenario-scope]]). The replay rejected that for the shelf's counts; [[#picks-shelf]] gives the measurement.

::: takeaway
- Budget share $\vshare = \vk/\vt$ (`k * g / t` for squeezed rows): 2.0 % on the Pin; pin-scaled keeps it with 512 picks on the Bachelor.
- The hot cache scales as $\vB/\vk$, the resident window as `W / (k * g)`.
- The stretch length carries as $\vb/\vt^{1.27}$, measured, not in absolute tokens as first assumed.
:::

## The named configurations {#configurations}

Four configurations of the replay recur on every page of this Part.

| name | `g` | `k` | `W` | $\vB/\vk$ | stands for |
|---|---|---|---|---|---|
| **pin-scaled** | 1 | 512 | 0 | 1, 2, 4 | the Pin at the same budget share |
| **pin-absolute** | 1 | 2048 | 0 | 1, 2, 4 | HiSparse's literal numbers on a context about 4× shorter (share 7–8 %) |
| **v4-scaled** | 4 | 128 rows | 32 | 1, 2, 4 | DeepSeek-V4's compressed layers at the same share and window ratio |
| **sweep** | 1 and 4 | `k * g` from 64 to 2048 | 0, 32, 128 | 1 to 8 | the scaling fits and the full reuse curve |

The hot cache is HiSparse's: [[lru|LRU]] with the guard that a pick of the current step is never evicted ([[#landscape-hisparse]]). Within a step the picks enter at the newest end in reverse rank order, so one stack-distance pass gives the exact LRU miss count at every $\vB \ge \vk$. Every number is a mean over 140 (sequence, layer) pairs, 5 sequences × 28 layers, with the range of the five per-sequence means in brackets. Each carries one of three grades:

1. **measured**: an exact replay of the stored traces, every step from `t = 8192` on counted;
2. **derived**: arithmetic or a fit on measured numbers, with the formula given;
3. **extrapolated**: carried to the Pin's 100K context by a fitted rule.

HiSparse's own numbers are their measurement, on one GLM-5.1 trace ([[#landscape-lucky-louis]]).

::: takeaway
- Pin-scaled (512 picks, 2 % share), pin-absolute (2048 picks, 7–8 %), v4-scaled (128 squeezed rows of 4, `W = 32`), and a sweep from 64 to 2048.
- Means over 140 (sequence, layer) pairs, brackets for the per-sequence range; grades measured, derived, extrapolated.
:::

## What is measured inside the dump, and what is only stated {#inside-and-outside}

Five differences between the Bachelor and the targets vary inside the dump, so each has a reading instead of an assumption.

1. **Context length.** Within one sequence the context grows from 8K to 30K. Whether miss rates follow the budget $\vk$ or the share $\vshare$ is read from steps binned by $\vt$ ([[#picks-share-carries]]).
2. **Head count.** The Bachelor averages 12 query heads per layer; V4's indexer has 64 heads and GLM-5.1's MLA 128. The traces also rank by one KV head's 6 query heads alone, the only internal handle on "more heads" ([[#picks-the-indexer]]).
3. **The resident window.** `W` of 0, 32 and 128 on every configuration ([[#picks-hot-cache]]).
4. **Indexer error.** Exact attention is the ideal a trained indexer approximates; two brackets of noise bound what a trained one would do ([[#picks-the-indexer]]).
5. **Depth.** 28 layers against 78 or 43: every reading is reported per layer against relative depth `l / 28`, and the napkin uses the mean over layers ([[#picks-hot-cache/layers]]).

Three differences cannot be carried and travel with every number as caveats:

- **LLM size and training.** A 1.5B dense LLM against frontier LLMs trained with sparse attention, whose attention may be sharper or shaped differently.
- **MLA's single latent** against the Bachelor's 2 KV heads.
- **V4's learned row compression** against the stand-in's squeezed scores.

Two experiments would turn the first caveat into a measurement. A size ladder on the same five texts (Qwen 2.5 0.5B, 1.5B, 3B, and 7B if it fits on one GPU) is proposed and not run. A second LLM, Qwen3.5-2B, the Bench's LLM, with sequences up to 225K, is the next planned point ([[#picks-what-it-means/next]]).

::: aside source Receipts
bachelor-kv at commit 8f5a471: `docs/design.md` §4.1 (the table of settings and their scaling; the note of 2026-11-03 rejecting absolute `b`), §4.2 (what is measured inside the dump), §4.3 (what cannot be carried; the size ladder), §4.4 (the named configurations), §3.1 (replay semantics: LRU with the guard, reverse rank order, one stack-distance pass), §8 (grades); `docs/next-steps.md` §1 (Qwen3.5-2B). DeepSeek-V4-Flash constants (43 layers, `index_topk` 512, `sliding_window` 128): `docs/log.md` 2026-11-03, from its `config.json`.
:::

::: takeaway
- Measured inside the dump: context length, head count, window, indexer error, depth.
- Stated, not carried: LLM size and training, MLA against GQA, learned against squeezed rows.
- A size ladder and Qwen3.5-2B to 225K are the experiments that would measure the first.
:::
