---
title: 'On fire and ice: a shelf at stretch level'
nav: On fire and ice
group: The design
lede: 'A counter per stretch, four states, one asynchronous load. When the indexer keeps coming back to a stretch, the stretch catches fire, its dictionary comes over the link once, and its misses shrink to deltas. When the indexer moves on, the stretch cools and gives its slot to the next one. Here is the mechanism, with what a miss costs in every state.'
cards:
  - q: What is a stretch's popularity?
    a: The running count of misses (or picks) it received over a window of recent decode steps
    wrong: ["The number of picks it holds in the hot cache right now", "Its dictionary's size in cherries' worth", "The share of its deltas that are empty"]
    why: Popularity is heaviness smoothed over time. It is read off the pick trace, before any byte moves, and it decides which stretches are on fire.
    sec: the-mechanism
  - q: What is a heavy stretch?
    a: A stretch that holds many of the current step's picks
    wrong: ["A stretch whose dictionary is large", "A stretch with many tokens", "A stretch whose cherries have large values"]
    why: Heavy is about traffic, not size. If picks pile into a few heavy stretches for many steps, their dictionaries are cheap to keep on the shelf.
    sec: the-mechanism
  - q: In which states does a miss move a raw pick?
    a: Ice and warming; a cooling stretch still serves deltas until a hotter stretch claims its slot, and then it is ice
    wrong: ["Only ice", "Ice and on fire", "Ice, warming and cooling"]
    why: The dictionary is on the shelf from the moment the load lands until the slot is handed on. Warming is counting with nothing loaded; cooling keeps the dictionary until a hotter stretch needs the space.
    sec: the-mechanism
  - q: With the reference-tree dictionary on the shelf, a miss lands on a cherry that sits inside the dictionary. What crosses the link?
    a: Nothing; the cherry is already on the GPU, and the decoder walks about 120 cherries' worth of GPU memory to rebuild it
    wrong: ["640 bytes, the raw pick", "About 72 bytes, the mean delta", "The dictionary again"]
    why: Four in five of a reference tree's cherries are reference cherries living in the dictionary. Only leaves carry a delta, 0.5–0.75 of a cherry each; the mean over all misses is 0.112 of a cherry.
    sec: what-a-miss-costs
  - q: Against prefetching the whole stretch raw when it turns popular, what does setting it on fire change?
    a: The load is about half (0.525 of the punnet instead of all of it) and the following misses move small deltas instead of nothing
    wrong: ["The load is the same and the misses are free", "Nothing; the two are the same design", "The load is a tenth and the misses are free"]
    why: On fire is a prefetch of half the punnet in compressed form. It pays after about 2 420 δ-misses in its stretch; the raw prefetch pays after 4 096.
    sec: fire-is-prefetch
---

Watch one layer of one [[sequence]] on [[pin|the Pin]], cut into 25 [[stretch|stretches]] of 4096 tokens. At step 400 the [[indexer]] picks sixty positions from stretch 7; nine miss the [[hot-cache]], and each miss pulls 640 bytes from host memory, as HiSparse does today. The next steps bring more of the same, and a counter for stretch 7 climbs. At step 406 it crosses a line, and a transfer of stretch 7's dictionary starts, 1.38 MB, off to the side while misses are still served raw. By step 410 it has landed, and a miss in stretch 7 now moves a delta, 72 bytes on average. Around step 480 the indexer drifts to stretch 12, stretch 7's counter falls, and when stretch 12 catches fire stretch 7 gives up its slot. That is the whole mechanism; this page names its parts and prices each state.

## The mechanism {#the-mechanism}

The design needs one statistic per stretch, and it comes free. The indexer announces its picks at every step before any byte moves ([[#landscape-sparse-attention]]), so counting how often each stretch is wanted costs nothing. Two words for the two time scales:

::: define heavy-stretch
- **What it is.** A stretch that holds many of the *current* step's picks; its opposite is a light stretch. A step whose $\vk = 2048$ picks fall mostly into three or four stretches has three or four heavy ones.
- **The property the design needs.** The [[lucky-louis|Lucky Louis property]] at stretch granularity: picks concentrate in a few heavy stretches, and those stretches stay heavy for many steps. The ordinary hit rate does not reveal it; it must be measured on its own ([[#hypotheses-heavy-stretches]]).
- **Easy to confuse with** a stretch whose dictionary is heavy (that is the dictionary's weight $\vw$), and with cherries being alike along the token axis (that is about the bytes; this is about the traffic).
:::

::: define popularity stretch popularity
- **What it is.** The running count of misses (or picks) a stretch has received over a window of recent decode steps. The window, and whether misses or picks are counted, are design knobs.
- **Example.** Stretch 7 above, with about nine misses per step over a window of eight steps, has a popularity near 70; a stretch untouched for a window has zero.
- **Easy to confuse with** a heavy stretch, which is about the current step alone. Popularity is heaviness smoothed over time, so a stretch that flickers does not trip the mechanism.
:::

Popularity moves each stretch through four states. Two of them are HiSparse's behaviour under another name.

| state | what is on the shelf | what one miss moves | leaves the state when |
|:--|:--|:--|:--|
| **ice** | nothing | a raw pick, $\ve$ | popularity starts rising |
| **warming** | nothing yet | a raw pick, $\ve$ | popularity crosses the threshold: a load begins |
| **on fire** | the punnet's dictionary, $\vw\,\ve$ bytes | a delta, $\vrho\,\ve$ on average | popularity falls under the threshold |
| **cooling** | the dictionary, until a hotter stretch wants its slot | a delta while the dictionary is still there; a raw pick once the slot is given up (ice again) | the slot is taken, back to ice |

::: define on-fire an on-fire stretch
- **What it is.** A stretch whose popularity crossed the threshold, so its dictionary has been loaded onto the [[dictionary-shelf]] and its misses travel as deltas. The opposite state is ice.
- **Example.** Stretch 7 from step 410 to about step 480. A sequence has at most $\vnD$ stretches on fire per layer, the size of its shelf.
- **Easy to confuse with** a stretch whose picks are in the hot cache. The hot cache holds raw picks the indexer asked for; fire means the stretch's *dictionary* is at hand, which turns the next miss into a [[delta-miss|δ-miss]].
:::

Two details carry the design. The load is **asynchronous**, one contiguous transfer of $\vw\,\ve$ bytes that runs beside the decode steps, the way HiSparse already overlaps fetches with compute ([[#papers-hisparse]]); misses that arrive before it lands are served raw. Demotion is **by need**, so a cooling stretch keeps its dictionary until a hotter stretch has crossed the line and the $\vnD$ slots are full. The toy policy of [[#app-shelf-and-two-misses]] re-ranked the shelf every step by who holds the most hot picks right now, which can swap a dictionary on a single noisy step. Popularity over a window, with a line to cross going up and a line to fall under going down, is the same idea with hysteresis.

::: figure fig-app-fire-states rngFireStates
**The four states and what a miss costs in each.** A diagram of ice → warming → on fire → cooling → ice. Arrows are labelled with the event that moves a stretch along: popularity rising, the threshold crossed (a dictionary load begins), popularity falling, the slot claimed by a hotter stretch. Under each state: the bytes one miss moves over the link (a raw pick $\ve$ in ice and warming; in fire, and in cooling while the dictionary is still resident, 0 for a cherry inside the dictionary or 0.5–0.75 $\ve$ for a leaf, mean $\vrho\,\ve$) and whether a load is in flight. The switch chooses the point on the measured curve: the reference tree (dictionary 0.525 of the punnet, mean delta 0.112) or the lighter point (dictionary 0.10, every delta 0.61). Bytes are for the Pin's 640-byte cherries.
:::

::: takeaway
- A heavy stretch holds many of one step's picks; popularity is that heaviness counted over a window, read off the pick trace for free.
- Ice and warming are HiSparse; on fire has the dictionary on the shelf and serves deltas; cooling keeps both until a hotter stretch claims the slot.
- The load runs beside decoding; demotion waits until a hotter stretch needs the space.
:::

## What a miss costs {#what-a-miss-costs}

The curve gives two measured points to price fire with, and they price very differently.

**The reference tree** ([[#measured-reading-one-cherry]]). Its dictionary is half the punnet, made of the punnet's own cherries laid along a [[reference-tree]]. About four misses in five land on a cherry that sits inside the dictionary as somebody's reference. Such a miss moves **nothing** over the link; the cherry is already on the GPU, and the decoder walks its path to the root, about 120 cherries' worth of GPU-memory reads, 226 for the worst cherry. The fifth miss lands on a leaf and moves a delta of 0.5 to 0.75 of a cherry. Averaged over an on-fire stretch's misses, $0.112\,\ve$, about 72 bytes on the Pin.

**The lighter point**, a dictionary of a tenth of the punnet (campaign C1, [[#app-two-boring-corners]]). No reference cherries, so every miss moves a delta of the same size, $0.61\,\ve$, about 390 bytes. The dictionary is five times lighter than the tree's; the saving per miss, $0.39\,\ve$ against $0.89\,\ve$, is less than half.

| | ice and warming | on fire, reference tree | on fire, lighter point |
|:--|--:|--:|--:|
| bytes per miss | $\ve$ = 640 | 0 for 80 %, 320–480 for 20 %; mean 72 | 390 |
| saving per miss | 0 | $0.89\,\ve$ | $0.39\,\ve$ |
| dictionary to load, per layer | none | 2 150 cherries' worth, 1.38 MB | 410 cherries' worth, 0.26 MB |
| GPU memory, as a share of a 4096-slot hot cache | none | 0.525 | 0.10 |

Across all states, an average miss moves what [[#app-shelf-and-two-misses]] wrote down, $\ve\,[\vfD\,\vrho + (1 - \vfD)]$, with $\vfD$ the share of misses that land in on-fire stretches. With $\vfD = 0.85$ (assumed) that is 157 bytes at the tree point and 428 at the lighter one, before the loads. The loads are the next page.

::: note numbers What the replay measured for the on-fire rule
On the pick traces of a stand-in LLM (Qwen 2.5 1.5B, Part XI), popularity over the last 32 steps, with a member replaced only by a strictly more popular stretch, was the best of three shelf policies; an LRU of stretches touched by a miss was the worst, with 0.5–9 loads per step ([[#picks-heavy-stretches/policies]]). Carried to the Pin's 100K, four on-fire stretches of 4096 positions catch 36–54 % of the misses at 0.10–0.13 loads per step, against the 0.85 assumed here ([[#picks-shelf]]).
:::

::: note warning The decoder nobody has built
The 120 cherries' worth per cold decode are reads of GPU memory, which is why the dictionary must be resident. Every compressor of both campaigns is entropy-coded, and no one has measured a GPU decoder that walks a reference tree for one scattered cherry ([[#plan-decoder-speed]]). The bytes on this page are the ledger's bytes.
:::

::: takeaway
- Reference tree on fire: four misses in five move nothing, the rest 0.5–0.75 of a cherry; the mean is 0.112 of a cherry, 72 bytes.
- Lighter point on fire: every miss moves 0.61 of a cherry, 390 bytes; the dictionary is a fifth of the size.
- Averaged over states, a miss moves $\ve\,[\vfD\,\vrho + (1 - \vfD)]$ plus the loads.
:::

## Fire is a prefetch {#fire-is-prefetch}

The honest name for the mechanism is a prefetch. Setting a stretch on fire moves $\vw\,\ve$ bytes before any miss has saved anything, on the bet that enough misses will follow in that stretch. With the reference tree the prefetch is half the punnet, compressed. A simpler design would prefetch the whole stretch raw, and the comparison defines both.

:::: compare Two prefetches of a popular stretch
::: col Whole stretch, raw
- Load $\vb\,\ve$: 4 096 cherries' worth, 2.6 MB per layer on the Pin.
- Afterwards every pick in the stretch is a hit; a miss moves nothing.
- Holds $\vb$ slots of GPU memory per stretch: a whole hot cache's worth.
- Pays for itself after 4 096 misses in that stretch.
- Needs no compressor and no decoder.
:::
::: col Half the punnet, as a dictionary
- Load $\vw\,\ve$: 2 150 cherries' worth, 1.38 MB per layer (tree point).
- Afterwards a miss moves $0.112\,\ve$ on average; a leaf still crosses the link.
- Holds $0.525\,\vb$ of GPU memory per stretch: half a hot cache.
- Pays for itself after $\vw/(1 - \vrho) \approx 2\,420$ δ-misses in that stretch.
- Needs the tree decoder to run at gather speed.
:::
::::

Against HiSparse the trade is one line. HiSparse never prefetches; every miss is a scattered read of one raw pick. Fire turns part of that traffic into one sequential load of $\vw\,\ve$ bytes and then saves $(1 - \vrho)\,\ve$ on every δ-miss. [[#app-toy-trace]] wrote the condition with toy weights; [[#app-the-napkin]] fills in the measured ones.

::: pull
Setting a stretch on fire is a prefetch of half the punnet, in compressed form.
:::

::: figure fig-app-fire-trace rngFireTrace wide
**A toy replay of three policies.** A seeded toy, labelled as such in the figure, and not a trace. One layer of a 100K-token sequence in 25 stretches of 4096; 274 misses per layer per step as on the Pin; 300 steps. The toy indexer concentrates its misses on a few stretches (the *concentration* slider sets the share of misses that land in the hot set) and moves the hot set every 60 steps or so. Horizontal axis: decode step. Vertical axis: bytes over the link in that step, for one layer, three lines: HiSparse (every miss raw), whole-stretch prefetch when a stretch's popularity crosses the threshold, and on-fire dictionaries (the load of $\vw\,\ve$ spread over a few steps, then δ-misses at $\vrho\,\ve$). Readouts: cumulative bytes for each policy, the number of loads, and GPU memory in use. Sliders: the popularity threshold, the shelf size $\vnD$, and the point on the curve (tree or the 10 % point). Every number comes from this seeded toy, run live.
:::

::: try
1. Set concentration high and watch the on-fire line: a spike at each load, then a floor far under HiSparse until the hot set moves and the spikes return.
2. Lower the threshold until stretches catch fire on a single busy step. The spikes multiply and the cumulative readout climbs past HiSparse; loads that are not amortized are pure loss.
3. Switch to the 10 % point. The spikes shrink fivefold and the floor rises; with a drifting hot set, this point can win where the tree point loses.
4. Set concentration to zero and keep the threshold at 20. No stretch gets more than 14 misses a step, none crosses the line, and the three lines coincide. Now lower the threshold to 5: stretches catch fire with nothing to gain, each spike is a load, and the readout shows the raw prefetch above HiSparse and on fire only 3 % under it, since a dictionary fed 13 misses a step needs about 190 steps to pay back.
:::

::: theme amortize
A load is amortized over the δ-misses that follow it in the same stretch. The threshold is the bet that enough will follow; too short a window loads for stretches that will not stay, too long a window leaves popular stretches on ice.
:::

::: theme side-info
The receiver must have the dictionary when the miss arrives. Fire gets it there just in time, and the asynchronous load keeps "in time" from costing a stalled step.
:::

::: aside source Receipts
- Tree point: compressor 121 on one layer's entries (`s-layer-b4k-r293`), env-t0096, 0.63639 = dictionary 0.525 + deltas 0.112; about 80 % of deltas empty, the rest 0.5–0.75 of an entry (r24, r25 delta-size analyses); cold reads mean 120, worst 226, every entry counted ([[#measured-reading-one-cherry]]).
- Lighter point: campaign C1, layer 3, head 0, coder 30 under a dictionary budget of 0.10: ratio 0.7095, deltas 0.610 (ledger trial r1-t0036, isolated-verified; `figures/data/range-curve.json`).
- 274 misses per layer per step, 640-byte entries, 25 blocks: the Pin ([[#landscape-derived-numbers]]). Overlapped fetches: HiSparse §4 ([[#papers-hisparse]]).
- The toy's generator and its seed are in `figures/range.js` (builder `rngFireTrace`).
:::

::: takeaway
- Fire is a prefetch of $\vw\,\ve$ bytes against $(1 - \vrho)\,\ve$ saved per δ-miss; the raw alternative prefetches $\vb\,\ve$ against $\ve$ per miss.
- Tree point: half the load of a raw prefetch, half the memory, small deltas afterwards; break-even after about 2 420 δ-misses in the stretch.
- Whether stretches stay popular that long is the unmeasured half; the toy shows the shape, a replay of the hot cache would give the number ([[#plan-hot-cache-replay]]).
:::
