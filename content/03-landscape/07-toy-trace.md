---
title: Watching the hot cache work
nav: The toy trace
group: HiSparse and its hot cache
lede: Sixteen entries, six slots, four selections per step, three steps. Small enough to follow every entry by hand, and big enough to show the whole economy of HiSparse — what it saves, and the two prices it leaves alone.
cards:
  - q: 'At step 1 of the toy trace the hot cache holds 1, 10, 13, 2, 5, 9 (oldest first) and the indexer selects 2, 5, 9, 14. Which entry is evicted?'
    a: '1 — the least recently used entry that is not selected'
    wrong: ["14", "9 — the newest entry", "13"]
    why: '14 is the only miss and needs a slot. The oldest resident entry not selected now is 1.'
    sec: three-steps
  - q: At step 3, entry 5 is not selected, yet it stays and 13 is evicted. Why?
    a: 5 was used at step 2, so it is more recent than 13
    wrong: ["5 is a smaller number", "13 was selected at step 3", "Evictions are random"]
    why: 'LRU evicts by last use: 13 was last used before step 1; 5 was last used at step 2.'
    sec: three-steps
  - q: In the toy trace, what share of all selections are hits?
    a: 9 of 12, so 75 %
    wrong: ["3 of 12, so 25 %", "12 of 12, so 100 %", "6 of 12, so 50 %"]
    why: Every step has three hits and one miss.
    sec: three-steps
  - q: Which two prices does HiSparse leave untouched?
    a: 'A miss costs one raw entry ($\ve$ bytes) on the link; a slot costs one raw entry ($\ve$ bytes) of GPU memory'
    wrong: ["The number of misses and the number of hits", "The time of attention and the time of the indexer", "The size of the prompt and the size of the answer"]
    why: HiSparse lowers how many misses there are by caching well; what each miss and each slot costs stays at the raw entry size.
    sec: two-prices
---

The previous page described HiSparse's resolve step in Python. Here it is at work, on a trace small enough to follow every entry with a finger.

## Three steps {#three-steps}

The setting is one [[layer]] of one request.

- The history holds **16 entries**, at positions 0 to 15.
- The [[hot-cache]] has **$\vB = 6$ slots**. Before the first step it holds 1, 10, 13, 2, 5 and 9, from least to most recently used.
- The [[indexer]] selects **$\vk = 4$ positions per step**: first 2, 5, 9, 14; then 2, 5, 9, 11; then 2, 9, 11, 15.

Before you press *Next*: which entry do you think goes at step 1?

::: figure fig-landscape-trace toyTrace wide
**The toy trace, one layer, three decode steps.** Top row: the history in host DRAM, one box per position; outlined boxes are selected at the current step, tinted boxes are also in the hot cache. Bottom row: the hot cache's $\vB = 6$ slots, least recently used on the left; green slots are hits, orange slots are misses just fetched (the arrow shows the fetch over the link), and the dashed box on the right is the entry evicted to make room. Each decode step has two frames: the selection, then the resolved cache. The tiles count hits, misses and bytes moved so far, in units of the entry size $\ve$ (and in bytes at 640 B per entry). The trace is the hand-made example of the original proposal; the figure runs HiSparse's resolve rule on it and checks the result against the expected trace stored with it.
:::

::: try
1. Step 2: entry 10 is evicted, though it sits next to 13 in the cache. Which of the two was used less recently?
2. Step 3: 5 is not selected, yet it survives and 13 goes. Follow 5 back to the step where it was last used.
3. Watch the history row. From one step to the next, three of the four selected positions repeat.
:::

The whole trace in one table:

| step | selected $\vS_{\vt}$ | hits | miss | evicted | hot cache after (oldest → newest) |
|---|---|---|---|---|---|
| 1 | 2, 5, 9, 14 | 2, 5, 9 | 14 | 1 | 10, 13, 14, 2, 5, 9 |
| 2 | 2, 5, 9, 11 | 2, 5, 9 | 11 | 10 | 13, 14, 11, 2, 5, 9 |
| 3 | 2, 9, 11, 15 | 2, 9, 11 | 15 | 13 | 14, 5, 15, 2, 9, 11 |

Nine of the twelve selections are hits. The hits come from a regularity in the selections: each step re-selects most of what the step before selected. That regularity gets a name of its own on [[#landscape-lucky-louis]].

::: takeaway
- Each miss evicts the least recently used entry that the current step does not need, and is fetched from host memory.
- In the toy trace every step has three hits and one miss, because consecutive selections overlap in three of four positions.
:::

## Two prices {#two-prices}

Now count what the three steps cost.

- **Link traffic.** Three misses, each one raw entry: $3\ve$ bytes. At $\ve = 640$ bytes, 1,920 bytes. The nine hits cost nothing on the link.
- **GPU memory.** Six slots, each one raw entry: $6\ve$ bytes, 3,840 bytes, whether the slots are used or not.

::: keycard The economy of HiSparse, per request and per layer
$$
\begin{aligned}
\underbrace{\text{link bytes per step}}_{\text{the lift}} &= \text{misses} \times \ve \\[4pt]
\underbrace{\text{GPU bytes}}_{\text{the desk}} &= \vB \times \ve
\end{aligned}
$$

HiSparse makes the number of misses small by caching well. It does not change what a miss costs, or what a slot costs: both are one raw entry.
:::

Read the keycard as the plan of attack for everything after this Part. There are three numbers on its right-hand sides. The number of misses depends on how well the cache guesses, and HiSparse already guesses well (the next two pages measure how well, and how little room is left). The slot count $\vB$ is a choice. That leaves the entry size $\ve$, which appears in both prices and which HiSparse never touches. [[#idea-mapping]] takes aim at exactly that number.

::: note connection Each miss is a tiny file
A miss fetches one entry, alone, from somewhere in a long history: a few hundred bytes with nothing around it to compress against. That is the lonely Gull Rock message of [[#tiny-files-notice-anything]] all over again — and it is why a dictionary, kept at the receiving end, is the tool this site reaches for.
:::

::: takeaway
- A miss costs one raw entry, $\ve$ bytes, on the link; a slot costs one raw entry, $\ve$ bytes, of GPU memory.
- HiSparse lowers the number of misses; it leaves both prices at the full entry size.
:::
