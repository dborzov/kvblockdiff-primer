---
title: 'On fire and ice: a dictionary cache at block level'
nav: On fire and ice
group: The design
lede: 'A counter per block, four states, one asynchronous load. When the selector keeps coming back to a block, the block catches fire, its dictionary comes over the link once, and its misses shrink to deltas. When the selector moves on, the block cools and gives its slot to the next one. Here is the human''s mechanism in the site''s words, with what a miss costs in every state.'
cards:
  - q: What is a block's popularity?
    a: The running count of misses (or selections) it received over a window of recent decode steps
    wrong: ["The number of entries it holds in the hot cache right now", "Its dictionary's size in entries' worth", "The share of its deltas that are empty"]
    why: Popularity is heaviness smoothed over time. It is read off the selection trace, before any byte moves, and it decides which blocks are on fire.
    sec: the-mechanism
  - q: In which states does a miss move a raw entry?
    a: Ice and warming; a cooling block still serves deltas until a hotter block claims its slot, and then it is ice
    wrong: ["Only ice", "Ice and on fire", "Ice, warming and cooling"]
    why: The dictionary is resident from the moment the load lands until the slot is handed on. Warming is counting with nothing loaded; cooling keeps the dictionary and its deltas until a hotter block needs the space.
    sec: the-mechanism
  - q: With the tree coder resident, a miss lands on an entry that sits inside the dictionary. What crosses the link?
    a: Nothing; the entry is already on the GPU, and the decoder walks about 120 entries' worth of GPU memory to rebuild it
    wrong: ["640 bytes, the raw entry", "About 72 bytes, the mean delta", "The dictionary again"]
    why: Four in five of a tree coder's entries are reference entries living in the dictionary. Only leaves carry a delta, 0.5–0.75 of an entry each; the mean over all misses is 0.112 of an entry.
    sec: what-a-miss-costs
  - q: 'At the lighter measured point (dictionary 10 % of the block), what does a miss in an on-fire block move?'
    a: About 0.61 of an entry, 390 bytes, every time
    wrong: ["Nothing, as for the tree coder", "0.112 of an entry", "A full entry"]
    why: That coder has no reference entries, so every miss carries a delta of the same size. Its dictionary is five times lighter than the tree's and its saving per miss is less than half.
    sec: what-a-miss-costs
  - q: Against prefetching the whole block raw when it turns popular, what does setting it on fire change?
    a: The load is about half (0.525 of the block instead of all of it) and the following misses move small deltas instead of nothing
    wrong: ["The load is the same and the misses are free", "Nothing; the two are the same design", "The load is a tenth and the misses are free"]
    why: On fire is a prefetch of half the block in compressed form. It pays after about 2,420 δ-misses in its block; the raw prefetch pays after 4,096.
    sec: fire-is-prefetch
---

Watch one layer of one request on the Pin, cut into 25 [[block|blocks]] of 4,096 tokens. At step 400 the [[indexer]] picks sixty entries from block 7; nine miss the [[hot-cache]], and each miss pulls 640 bytes from host memory, as [[hisparse|HiSparse]] does today. The next steps bring more of the same, and a counter for block 7 climbs. At step 406 it crosses a line, and a transfer of block 7's dictionary starts, 1.38 MB, off to the side while misses are still served raw. By step 410 it has landed, and a miss in block 7 now moves a delta, 72 bytes on average. Around step 480 the indexer drifts to block 12, block 7's counter falls, and when block 12 catches fire block 7 gives up its slot. That is the whole mechanism; this page names its parts and prices each state.

## The mechanism {#the-mechanism}

The design needs one statistic per block, and it comes free. The indexer announces its picks at every step before any byte moves ([[#questions-framework-c]]), so counting how often each block is wanted costs nothing.

::: define popularity block popularity
- **What it is:** the running count of misses (or selections) a block has received over a window of recent decode steps. The window, and whether misses or selections are counted, are design knobs.
- **Example:** block 7 above, with about nine misses per step over a window of eight steps, has a popularity near 70; a block untouched for a window has zero.
- **Easy to confuse with:** a [[heavy-block]], which is about the current step alone. Popularity is heaviness smoothed over time, so a block that flickers does not trip the mechanism.
:::

Popularity moves each block through four states. Two of them are HiSparse's behaviour under another name.

| state | what is resident | what one miss moves | leaves the state when |
|:--|:--|:--|:--|
| **ice** | nothing | a raw entry, $\ve$ | popularity starts rising |
| **warming** | nothing yet | a raw entry, $\ve$ | popularity crosses the threshold: a load begins |
| **on fire** | the block's dictionary, $\vw\,\ve$ bytes | a delta, $\vrho\,\ve$ on average | popularity falls under the threshold |
| **cooling** | the dictionary, until a hotter block wants its slot | a delta, $\vrho\,\ve$, while the dictionary is still there; a raw entry once the slot is given up (the block is ice again) | the slot is taken, back to ice |

::: define on-fire an on-fire block
- **What it is:** a block whose popularity crossed the threshold, so its dictionary has been loaded into GPU memory and its misses travel as deltas. The opposite state is ice.
- **Example:** block 7 from step 410 to about step 480. A request has at most $\vnD$ blocks on fire per layer, the shelf of the [[dictionary-cache]].
- **Easy to confuse with:** a block whose entries are in the hot cache. The hot cache holds raw entries the indexer asked for; fire means the block's *dictionary* is at hand, which turns the next miss into a [[delta-miss|δ-miss]].
:::

Two details carry the design. The load is **asynchronous**, one contiguous transfer of $\vw\,\ve$ bytes that runs beside the decode steps, the way HiSparse already overlaps fetches with compute ([[#papers-hisparse]]); misses that arrive before it lands are served raw. Demotion is **by need**, so a cooling block keeps its dictionary until a hotter block has crossed the line and the $\vnD$ slots are full. The toy policy of [[#idea-blockdiff-step-by-step]] re-ranked the shelf every step by who holds the most hot entries right now, which can swap a dictionary on a single noisy step. Popularity over a window, with a line to cross going up and a line to fall under going down, is the same idea with hysteresis.

::: figure fig-rng-fire-states rngFireStates
**The four states and what a miss costs in each.** A diagram of ice → warming → on fire → cooling → ice. Arrows are labelled with the event that moves a block along: popularity rising, the threshold crossed (a dictionary load begins), popularity falling, the slot claimed by a hotter block. Under each state: the bytes one miss moves over the link (a raw entry $\ve$ in ice and warming; in fire, and in cooling while the dictionary is still resident, 0 for an entry inside the dictionary or 0.5–0.75 $\ve$ for a leaf, mean $\vrho\,\ve$) and whether a load is in flight. The switch chooses the point on the measured curve: the tree coder (dictionary 0.525 of the block, mean delta 0.112) or the lighter point (dictionary 0.10, every delta 0.61). Bytes are for the Pin's 640-byte entries.
:::

::: takeaway
- Popularity is a per-block count of recent misses or selections, read off the selection trace for free.
- Ice and warming are HiSparse; on fire has the dictionary resident and serves deltas; cooling keeps both until a hotter block claims the slot.
- The load runs beside decoding; demotion waits until a hotter block needs the space.
:::

## What a miss costs {#what-a-miss-costs}

The curve gives two measured points to price fire with, and they price very differently.

**The tree coder** ([[#measured-reading-one-entry]]). Its dictionary is half the block, made of the block's own entries laid along a [[reference-tree]]. About four misses in five land on an entry that sits inside the dictionary as somebody's reference. Such a miss moves **nothing** over the link; the entry is already on the GPU, and the decoder walks its path to the root, about 120 entries' worth of GPU-memory reads, 226 for the worst entry. The fifth miss lands on a leaf and moves a delta of 0.5 to 0.75 of an entry. Averaged over an on-fire block's misses, $0.112\,\ve$, about 72 bytes on the Pin.

**The lighter point**, a dictionary of a tenth of the block (campaign C1, [[#range-two-boring-corners]]). No reference entries, so every miss moves a delta of the same size, $0.61\,\ve$, about 390 bytes. The dictionary is five times lighter than the tree's; the saving per miss, $0.39\,\ve$ against $0.89\,\ve$, is less than half.

| | ice and warming | on fire, tree coder | on fire, lighter point |
|:--|--:|--:|--:|
| bytes per miss | $\ve$ = 640 | 0 for 80 %, 320–480 for 20 %; mean 72 | 390 |
| saving per miss | 0 | $0.89\,\ve$ | $0.39\,\ve$ |
| dictionary to load, per layer | — | 2,150 entries' worth, 1.38 MB | 410 entries' worth, 0.26 MB |
| GPU memory, as a share of a 4,096-slot hot cache | — | 0.525 | 0.10 |

Across all states, an average miss moves what [[#idea-blockdiff-step-by-step]] wrote down, $\ve\,[\vfD\,\vrho + (1 - \vfD)]$, with $\vfD$ the share of misses that land in on-fire blocks. With $\vfD = 0.85$ (assumed) that is 157 bytes at the tree point and 428 at the lighter one, before the loads. The loads are the next page.

::: note warning The decoder nobody has built
The 120 entries' worth per cold decode are reads of GPU memory, which is why the dictionary must be resident ([[#measured-what-it-means/the-miss-path]]). Every coder of both campaigns is an entropy coder, and no one has measured a GPU decoder that walks a reference tree for one scattered entry. The bytes on this page are the ledger's bytes.
:::

::: takeaway
- Tree coder on fire: four misses in five move nothing, the rest 0.5–0.75 of an entry; the mean is 0.112 of an entry, 72 bytes.
- Lighter point on fire: every miss moves 0.61 of an entry, 390 bytes; the dictionary is a fifth of the size.
- Averaged over states, a miss moves $\ve\,[\vfD\,\vrho + (1 - \vfD)]$ plus the loads.
:::

## Fire is a prefetch {#fire-is-prefetch}

The honest name for the mechanism is a prefetch. Setting a block on fire moves $\vw\,\ve$ bytes before any miss has saved anything, on the bet that enough misses will follow in that block. With the tree coder the prefetch is half the block, compressed. A simpler design would prefetch the whole block raw, and the comparison defines both.

:::: compare Two prefetches of a popular block
::: col Whole block, raw
- Load $\vb\,\ve$: 4,096 entries' worth, 2.6 MB per layer on the Pin.
- Afterwards every selection in the block is a hit; a miss moves nothing.
- Holds $\vb$ slots of GPU memory per block: a whole hot cache's worth.
- Pays for itself after 4,096 misses in that block.
- Needs no coder and no decoder.
:::
::: col Half the block, as a dictionary
- Load $\vw\,\ve$: 2,150 entries' worth, 1.38 MB per layer (tree point).
- Afterwards a miss moves $0.112\,\ve$ on average; a leaf still crosses the link.
- Holds $0.525\,\vb$ of GPU memory per block: half a hot cache.
- Pays for itself after $\vw/(1 - \vrho) \approx 2{,}420$ δ-misses in that block.
- Needs the tree decoder to run at gather speed.
:::
::::

Against HiSparse the trade is one line. HiSparse never prefetches; every miss is a scattered read of one raw entry. Fire turns part of that traffic into one sequential load of $\vw\,\ve$ bytes and then saves $(1 - \vrho)\,\ve$ on every δ-miss. [[#homework-break-even]] wrote the condition with assumed weights; [[#range-the-napkin-for-fire]] fills in the measured ones.

::: pull
Setting a block on fire is a prefetch of half the block, in compressed form.
:::

::: figure fig-rng-fire-trace rngFireTrace wide
**A toy replay of three policies.** A seeded toy, labelled as such in the figure, and not a trace. One layer of a 100K-token request in 25 blocks of 4,096; 274 misses per layer per step as on the Pin; 300 steps. The toy indexer concentrates its misses on a few blocks (the *concentration* slider sets the share of misses that land in the hot set) and moves the hot set every 60 steps or so. Horizontal axis: decode step. Vertical axis: bytes over the link in that step, for one layer, three lines: HiSparse (every miss raw), whole-block prefetch when a block's popularity crosses the threshold, and on-fire dictionaries (the load of $\vw\,\ve$ spread over a few steps, then δ-misses at $\vrho\,\ve$). Readouts: cumulative bytes for each policy, the number of loads, and GPU memory in use. Sliders: the popularity threshold, the shelf size $\vnD$, and the point on the curve (tree or the 10 % point). Every number comes from this seeded toy, run live.
:::

::: try
1. Set concentration high and watch the on-fire line: a spike at each load, then a floor far under HiSparse until the hot set moves and the spikes return.
2. Lower the threshold until blocks catch fire on a single busy step. The spikes multiply and the cumulative readout climbs past HiSparse; loads that are not amortized are pure loss.
3. Switch to the 10 % point. The spikes shrink fivefold and the floor rises; with a drifting hot set, this point can win where the tree point loses.
4. Set concentration to zero and keep the threshold at 20. No block gets more than 14 misses a step, none crosses the line, and the three lines coincide. Now lower the threshold to 5: blocks catch fire with nothing to gain, each spike is a load, and the readout shows the raw prefetch above HiSparse and on fire only 3 % under it, since a dictionary fed 13 misses a step needs about 190 steps to pay back.
:::

::: theme amortize
A load is amortized over the δ-misses that follow it in the same block. The threshold is the bet that enough will follow; too short a window loads for blocks that will not stay, too long a window leaves popular blocks on ice.
:::

::: theme side-info
The receiver must have the dictionary when the miss arrives. Fire gets it there just in time, and the asynchronous load keeps "in time" from costing a stalled step.
:::

::: aside source Receipts
- Tree point: coder 121 on one layer's entries, env-t0096, 0.63639 = dictionary 0.525 + deltas 0.112; about 80 % of deltas empty, the rest 0.5–0.75 of an entry (r24, r25 delta-size analyses; 121's delta sizes in env-t0096); cold reads mean 120, worst 226, every entry counted ([[#measured-reading-one-entry]]).
- Lighter point: campaign C1, layer 3, head 0, coder 30 under a dictionary budget of 0.10: ratio 0.7095, deltas 0.610 (ledger trial r1-t0036, isolated-verified; `figures/data/range-curve.json`).
- 274 misses per layer per step, 640-byte entries, 25 blocks: the Pin ([[#landscape-derived-numbers]]). Overlapped fetches: HiSparse §4 ([[#papers-hisparse]]).
- The toy's generator and its seed are in `figures/range.js` (builder `rngFireTrace`).
:::

::: takeaway
- Fire is a prefetch of $\vw\,\ve$ bytes against $(1 - \vrho)\,\ve$ saved per δ-miss; the raw alternative prefetches $\vb\,\ve$ against $\ve$ per miss.
- Tree point: half the load of a raw prefetch, half the memory, small deltas afterwards; break-even after about 2,420 δ-misses in the block.
- Whether blocks stay popular that long is the unmeasured half; the toy shows the shape, framework C would give the number.
:::
