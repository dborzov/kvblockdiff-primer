---
title: The decision rule
nav: The decision rule
group: 'Wave 1: one weekend'
lede: Write down what you will do with each possible result before you see any result. Four rows turn wave 1's two scope gains into the next step — and, as the sliders show, the four rows leave a gap.
cards:
  - q: What does the decision rule take as input?
    a: 'The two scope gains $\vgainreq$ and $\vgainblk$ of the best cheap dictionary type, keys and values byte-weighted, best of the two 8-bit grids'
    wrong: ["The miss rate of the hot cache", "The compression ratio of zstd", "The KLT bound alone"]
    why: Wave 1's Table 1 boils down to these two numbers; the rule maps them to what happens next.
    sec: rows
  - q: 'Which outcome sends wave 2 to block scope?'
    a: '$\vgainreq + \vgainblk \ge 0.75$ bit and $\vgainblk \ge 0.4$ bit'
    wrong: ["Any total above 0.25 bit", "$\vgainblk < 0.15$", "$\vgainreq \ge 0.75$ alone"]
    why: A large total, a good part of it local: fallen-apple similarity that is real and block-scale.
    sec: rows
  - q: 'What does the source''s rule say for $\vgainreq = 0.5$, $\vgainblk = 0.3$?'
    a: Nothing — the total is above 0.75 but the block gain lies between 0.15 and 0.4, a case no row covers
    wrong: ["Wave 2 with block scope", "Publish the negative", "Marginal: run framework C"]
    why: The first two rows need g_blk ≥ 0.4 or g_blk < 0.15. The band in between has no row. Our synthetic set lands in it.
    sec: hole
  - q: Which rate should the rule be applied to, in our reading?
    a: The fixed-length rate, with the entropy rate as the ceiling a better format could reach
    wrong: ["Only the entropy rate", "The BF16 rate", "Whichever rate is larger"]
    why: The fixed-length rate is the size of the delta a miss would actually move. The source's rule does not say which rate it means.
    sec: hole
---

Before a clinical trial starts, its authors register what they will measure and what each result will mean. It is a promise to their future selves: no reading the tea leaves once the data is in. Wave 1 makes the same promise, in four rows.

## Four rows, written in advance {#rows}

::: define decision-rule
- **What it is:** a table, fixed before any data, that maps wave 1's two [[scope-gain|scope gains]] to what happens next.
- **Its inputs:** $\vgainreq$ and $\vgainblk$ of the best *cheap* dictionary type, keys and values weighted by bytes, the better of the two 8-bit grids.
- **Why in advance:** so that a disappointing number cannot be talked into a "go", nor a good one into an endless polish.
:::

::: aside reminder The two scope gains
$\vgainreq = \vbpe_{\text{global}} - \vbpe_{\text{request}}$: what a per-request dictionary saves over a global one. $\vgainblk = \vbpe_{\text{request}} - \vbpe_{\text{block}}$: what per-block dictionaries save on top — fallen-apple similarity at block scale ([[#homework-scope]]).
:::

| outcome | reading | next |
|---|---|---|
| $\vgainreq + \vgainblk \ge 0.75$ bit and $\vgainblk \ge 0.4$ | [[fallen-apple\|fallen-apple similarity]] is real and block-scale | wave 2 with block scope |
| $\vgainreq + \vgainblk \ge 0.75$ but $\vgainblk < 0.15$ | real, but per request ("requestdiff") | wave 2 with request scope; framework C optional; a simpler system, still a paper |
| $0.25$ to $0.75$ bit | marginal; hinges on $\vw$, on the [[victim-tier\|victim tier]] and on the second [[lever]] | run framework C; decide on the cost model |
| below $0.25$ bit everywhere | 8-bit KV has no usable conditional structure | publish the negative (with the shuffle control and the BF16 column); pivot to a global fixed-length miss-path coder |

Where do the thresholds come from? The source does not derive them; our reading of them:

- **0.75 bit** on top of solo coding (about 6.8 bits) brings the [[delta-ratio|delta ratio]] to about 0.76. In the reference setting, $\vrho = 0.75$ with a request-scope dictionary gives about 1.26× more requests per GPU ([[#plan-cost-model-and-paper]]) — the low end of a result worth a system. Below 0.25 bit, the gain is no bigger than the taxes and the calibration gap we have already met.
- **0.4 bit of block gain** is enough to pay for dictionaries that must be cached per block; **under 0.15** it is not, and a per-request dictionary does the job without a dictionary cache.

They are judgement calls, which is fine — as long as they are made now.

::: takeaway
- Two numbers in, one of four next steps out, decided before the data.
- Block scope needs both a large total and a large local part; request scope needs only the total.
- The thresholds are judgement calls, fixed in advance on purpose.
:::

## Try it {#try}

::: figure fig-plan-decision planDecision wide
**The decision rule as a map.** Horizontal axis: $\vgainreq$; vertical axis: $\vgainblk$, both in bits per element, from 0 to 1.5. Coloured regions are the rows of the rule: lapis = block scope, peacock = request scope, saffron = marginal, vermilion = negative; the amethyst band is the **gap** that no row of the source covers. Drag the knob (or use the sliders, or the arrow keys on the knob); the matching row lights up on the right and the readout gives the next step. The three buttons place the knob on results of our synthetic run ([[#plan-controls]]); they are a method check, not KV data.
:::

::: try
1. Press "synthetic, INT8, entropy". The total is 0.80 bit, the block part 0.34 — the knob sits in the gap.
2. Press "synthetic, E4M3, fixed-length". Same data, other grid and rate: 0.22 bit, the "negative" row.
3. Drag along the line $\vgainreq + \vgainblk = 0.75$ from top left to bottom right. The verdict flips from block scope, through the gap, to request scope.
:::

::: takeaway
- The same synthetic data gives "the gap" in INT8's entropy rate and "negative" in E4M3's fixed-length rate.
- Which grid and which rate the rule reads matters as much as the thresholds.
:::

## The hole in the rule, and how to fill it {#hole}

Three things are missing from the source's rule, and the synthetic run found all three.

1. **The gap.** A total above 0.75 with $0.15 \le \vgainblk < 0.4$ has no row. Our synthetic set lands there: 0.459 + 0.342 bit. Our proposal: treat it as **"both scales"** — run wave 2 with request *and* block scope, and let framework C ([[#questions-framework-c]]) decide whether blocks are concentrated enough to keep their dictionaries resident.
2. **Which rate.** The rule does not say. The [[fixed-length-rate|fixed-length rate]] is what a miss would move, so we propose to apply the rule to it, and to read the [[entropy-rate|entropy rate]] as the ceiling a better format could reach. On the synthetic set that moves E4M3 from "the gap" to "negative", and leaves INT8 in the gap (0.570 + 0.371).
3. **The calibration gap.** The shuffled $\vgainreq$ was 0.13 bit on the synthetic set — structure that is not there. We propose to subtract each gain's shuffled value before reading the table.

::: note question Is a pre-registered rule with a hole still worth having?
Yes. Its job is to make the decision before the data, and a hole found on synthetic data, before the weekend, is the rule working: the fix can be written down now, while nobody knows which side of it the real data will fall.
:::

::: theme controls
The decision rule is a control on the experimenter, not on the data: it removes the freedom to reinterpret a result after seeing it. Testing it on synthetic data is how its own bugs were found.
:::

::: takeaway
- The source's rule has a gap ($0.15 \le \vgainblk < 0.4$ with a large total); we propose "both scopes, framework C decides".
- Apply the rule to the fixed-length rate, after subtracting each gain's shuffled value.
- These fixes are written before the data, which is the whole point of a rule.
:::
