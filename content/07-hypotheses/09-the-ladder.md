---
title: The cat-sequence ladder
nav: The ladder
group: The argument, sorted
lede: Every proposal has an argument that made it feel obvious. This one has a story about cats, three rungs of a ladder, and a jump at the end. Here it is, told the way it was first told, sorted into what is right, what leaks, and what is a trap.
cards:
  - q: What are the three rungs of the ladder, from top to bottom?
    a: A cherry against everything, against its sequence, against its surrounding stretch
    wrong: ["Against its layer, its head, its element", "Against keys, values, queries", "Against the hot cache, host memory, the link"]
    why: Each rung narrows what the cherry is compared with, and so, intuitively, makes it less surprising. The rungs are the three dictionary scopes.
    sec: rungs
  - q: 'Why is $\vH(\vE) \ge \vH(\vE \mid \text{sequence}) \ge \vH(\vE \mid \text{stretch})$ guaranteed?'
    a: Conditioning never increases entropy on average, and knowing the stretch also tells you the sequence
    wrong: ["Because stretches are shorter than sequences", "Because HiSparse measured it", "It is not guaranteed; it is a hypothesis"]
    why: Side information can only help on average. The stretch rung refines the sequence rung, so it can only help further. What is not guaranteed is the size of each step.
    sec: right
  - q: What is "the jump" at the end of the argument?
    a: Concluding from HiSparse's high hit rate that the bottom rung is steep, so stretch dictionaries will work
    wrong: ["Concluding that cats and dogs need different LLMs", "Concluding that the sequence rung is useless", "Concluding that the hot cache should be larger"]
    why: The jump uses evidence about which picks are wanted as if it were evidence about how alike their bytes are. The leak page takes it apart.
    sec: right
  - q: How much had the stretch rung bought, measured, by the end of the campaigns?
    a: 1.14 bits per element over solo at stretch 4096, from 0.778 to 0.636
    wrong: ["0.37 bit, as the variance budget predicted", "Nothing: the ladder is flat", "8 bits, the whole cherry"]
    why: 8 × (0.778 − 0.636) = 1.14. The sequence rung above it is a bound so far (about 0.60 at 16K positions and 0.57 for a whole sequence), and the global rung is unmeasured.
    sec: verdict
---

Picture two very long sequences with the same LLM. In `cat_seq` it writes an overview of cat breeds: 100K tokens on the Maine Coon, then 10K on the Siamese, and so on. In `dog_seq` it does the same for dogs. Pick one [[cherry]], call it *R*, from the middle of the Maine Coon part, and ask: how surprising is *R*?

## Three rungs {#rungs}

The first draft answered with three rungs, each comparing *R* with a narrower crowd.

1. **Against everything** the LLM could ever be asked about, cats, helicopters, Python, tax law: *R* is one message out of an enormous set. Very surprising.
2. **Against the cherries of `cat_seq`.** The sequence is known to be about cats. The set of plausible messages is much smaller. Less surprising.
3. **Against the cherries of the surrounding 100K tokens**, all on the Maine Coon. Smaller still. Least surprising of all.

::: define cat-ladder the cat-sequence ladder
- **What it is.** The intuitive argument for this project: a cherry is less surprising against its own sequence than against everything, and least surprising against its own neighbourhood, so dictionaries fitted on narrower crowds should code it in fewer bits.
- **Mnemonic.** A cat climbing down a ladder, one rung per narrower crowd: everything, the sequence, the stretch.
- **Verdict, in advance.** Right in direction, leaky in its evidence, harsh in its exchange rate: this page and the next two.
:::

::: figure fig-hyp-cat-ladder catLadder
**The ladder as a story in four steps.** Left: nested crowds the cherry *R* (the dot) can be compared with: everything the LLM could be asked about, the `cat_seq` sequence next to an unrelated `dog_seq`, and the 100K-token Maine Coon passage around *R*. The highlighted crowd is the current rung. Right: how surprising *R* is against each crowd, as bars; the heights show only the intuition's direction (lower is less surprising) and are not measured or computed. Step 4 adds the jump the first draft made. Use the buttons or the arrow keys.
:::

The story is good because it is concrete. And each rung is something one could build: rung 1 is one dictionary for every sequence, fitted once on a large sample of text; rung 2 is one dictionary per sequence, fitted on its own orchard; rung 3 is one dictionary per stretch. Those are the three [[scope|scopes]] of a dictionary, [[scope-global|global]], [[scope-sequence|sequence]] and [[scope-stretch|stretch]], of [[#scenario-scope]].

::: aside reminder Surprise is measured in bits
The [[surprisal]] of an outcome with probability $\vp$ is $-\log_2 \vp$ bits; the [[entropy]] $\vH$ is its average, the fewest bits per symbol any lossless code can average ([[#school-surprise]], [[#school-entropy]]). "Less surprising" means "codable in fewer bits".
:::

::: takeaway
- Three rungs: a cherry against everything, against its sequence, against its stretch.
- Each rung is a dictionary scope: global, sequence, stretch.
:::

## What it gets right, and the jump {#right}

Before the criticism, credit. The ladder says, in symbols,

$$
\underbrace{\vH(\vE)}_{\text{against everything}} \;\ge\; \underbrace{\vH(\vE \mid \text{sequence})}_{\text{against its sequence}} \;\ge\; \underbrace{\vH(\vE \mid \text{stretch})}_{\text{against its neighbourhood}} ,
$$ {#eq-hyp-ladder}

and this is not a hypothesis. **Conditioning never increases entropy on average** ([[#hypotheses-bits-are-the-unit]]); and knowing the stretch also tells you the sequence, so the bottom rung knows at least as much as the middle one. What the theorem does *not* say is how big the steps are. They can be zero.

::: figure fig-hyp-ladder-theorem ladderTheorem
**The ladder's direction, computed.** A toy cherry takes one of 16 values. There are three sequences (think cats, dogs, tax law), each split into four stretches; inside a stretch the value follows a bell shape around a centre. The sliders set how far apart the sequences' centres are, how far apart the stretches' centres are within a sequence, and the spread inside a stretch. Left: the three rungs in bits, the entropy of all values together, the average entropy within a sequence, and the average entropy within a stretch. Right: the distributions behind them for the cat sequence and one of its stretches. The readout gives the two steps down as mutual informations. Everything is computed exactly from the distributions; the toy is not orchard data.
:::

::: try
1. Set both "differ by" sliders to 0. All three rungs are equal: the ladder is flat, and no dictionary at any scope saves a bit.
2. Raise only the sequences' spread. The top step grows, the bottom step stays at zero: sequence-scope dictionaries would help, stretch-scope ones would not.
3. Raise the noise inside a stretch. Every step shrinks: noise that no rung can explain dilutes them all.
:::

With the defaults the toy's rungs read 3.17, 2.60 and 2.43 bits: steps of 0.57 and 0.17 bit. The theorem guarantees the order; the sliders set the gaps; only data gives the sizes. Two more things the argument gets right: its unit is bits, which convert to bytes on the link; and sameness of subject is real, since cherries about one passage do have typical values that sit closer together, which is exactly what the lightest dictionary, a location per [[furrow]], captures ([[#toolbox-furrow-statistics]]).

Then came the step that made the argument feel finished: *"HiSparse's high hit rate shows that this ladder is steep at the bottom rung, so a stretch dictionary should work."* It points at a real number, 87 % of picks hitting the hot cache, and attaches it to the rung we care about most. There are three different things in it.

| piece of the argument | verdict | page |
|---|---|---|
| narrower crowds can only help | right: a theorem | this page |
| surprise is measured in bits | right: our unit | [[#hypotheses-bits-are-the-unit]] |
| cherries of one subject share something | right: a location per furrow captures it | [[#toolbox-furrow-statistics]] |
| HiSparse's hit rate shows the bottom rung is steep | a leak: the hit rate is about queries | [[#hypotheses-the-leak]] |
| a steep rung means a big saving | a trap: the exchange rate is harsh | [[#hypotheses-the-trap]] |

::: note intuition Why keep a story we are about to take apart?
Because it is not taken apart, it is sorted. The parts that are right became the measurement plan: three rungs, three scopes, three numbers in bits. The parts that are wrong say which evidence not to trust and how big a result to expect.
:::

::: takeaway
- Direction: a theorem. Unit: bits. Subject: real. Size: not guaranteed, can be zero.
- The jump borrows a which-number for a what-claim; the next two pages price it.
:::

## Verdict {#verdict}

The rungs, measured so far, on the values of Qwen3.5-2B, FP8, `v[t, l, :, :]` cherries:

| rung | dictionary scope | reading | grade |
|---|---|---|---|
| bottom: the stretch | stretch 4096 | [[solo]] 0.778 (6.22 bits per element) to the best verified compressor 0.636 (5.09 bits): **1.14 bits per element** won by the punnet's own dictionary | verified, every cherry, on the two-sequence screen; 0.630 on five sequences ([[#measured-scorecard]], [[#measured-signal-or-noise]]) |
| middle: the sequence | stretch 16 384, and a whole sequence | 0.618 at 16 384 positions; a pool over the whole sequence is a bound 0.26 to 0.45 bit per element below that; the punnet floors sit near 0.60 and 0.57 | verified at 16K; the whole sequence is an optimistic bound ([[#measured-shared-across-the-stretch]]) |
| top: everything | global, a calibration corpus | unmeasured: $\vgainseq$, what a sequence-scope dictionary saves over a global one, has never been run; the one hint is that the linear rule across elements carries over between sequences at 91 to 96 % | [[#plan-next-in-the-harness]] |

The ladder does go down, and the bottom rung alone bought more than the variance budget of [[#hypotheses-the-trap]] predicted for it. The reason is the shape of the structure, echoes and the stereo map, and that is where the next two pages end up.

::: aside source Receipts
Solo and frontier: `solo_ratio` of screen `s-layer-b4k-r293` (0.77811); env-t0096 (0.63639). 16K: env-t0097 (0.61768). Whole-sequence pool: r19 iter-1-1 (one window, bound). Rule carried between sequences: r7 iter-1-2.
:::

::: takeaway
- Stretch rung: 1.14 bits per element, verified. Sequence rung: a bound so far. Global rung: unmeasured.
- The order held; the sizes were not what the toy budget expected, in the project's favour.
:::
