---
title: Two kinds of questions
lede: '"Is kv-blockdiff a good idea?" is the question behind this whole site, and no experiment can answer it as asked. This page shows how to break it into questions that a weekend of measuring can.'
cards:
  - q: Which of these is an experiment-framework question rather than a big-picture question?
    a: 'For Δ = 1, 2, 4 … 32K tokens, how many bits per element does a neighbour at distance Δ save, charged by one fixed rule?'
    wrong: ["Is kv-blockdiff a good idea?", "What is KV's fallen-apple similarity like?", "Can a dictionary + delta store beat raw storage?"]
    why: It names what is varied (Δ), what is measured (bits saved) and how it is charged. The other three are open-ended — the reasons the project exists.
    sec: two-levels
  - q: What must a framework question state before any data is taken?
    a: Its possible outcomes, what each would mean, and what we would do next in each case
    wrong: ["The answer it expects to get", "Which model the paper will use", "Only the hardware it runs on"]
    why: Writing the outcome shapes down first stops every curve from being read as "promising" after the fact.
    sec: two-levels
  - q: Which big-picture question is the existence question, without which the other two do not matter?
    a: Q1 — what is KV's fallen-apple similarity like, in bits?
    wrong: ["Q2 — can a dictionary + delta store beat raw storage?", "Q3 — do misses concentrate in few blocks?", "Framework D — requests per GPU"]
    why: If entries are not cheaper to code given their neighbours, there is nothing for a dictionary to store and nothing for residency to protect.
    sec: map
  - q: Which framework answers Q3, the residency question?
    a: C — where misses land (replaying the indexer's selections)
    wrong: ["A — bits versus distance", "B — the compressibility curve", "None: Q3 cannot be measured before a kernel exists"]
    why: Q3 is about which entries are selected and how they group into blocks; replaying selection traces measures that directly.
    sec: map
  - q: A clean "no" on Q3 would mean…
    a: Use one dictionary per request, or light dictionaries kept resident for every block, instead of a cache of block dictionaries
    wrong: ["The project is dead", "Fallen-apple similarity does not exist", "HiSparse's published hit rates are wrong"]
    why: Every negative answer is informative. A "no" on Q3 changes the design, not the existence of the gain.
    sec: map
---

A prospector walks into a valley with a rumour: *there is gold in these hills*. She cannot test a rumour. So she does something smaller. She picks twelve streams and pans a bucket of gravel from each, at fixed distances from the ridge: 10 metres, 100 metres, a kilometre. She weighs what is left in grams per tonne. And before she lifts the first bucket, she writes down what each result would mean.

- **The grade falls with distance from the ridge.** There is a vein up there. Dig at the ridge.
- **The grade is the same everywhere.** The river spread dust along the whole valley. Pan; do not dig.
- **There is nothing anywhere.** Go home, and tell the next prospector.

The rumour is the reason she came. The bucket-and-scale routine is what she actually does all day. Notice that each written-down outcome comes with an action.

This Part does the same with kv-blockdiff. The site so far has a rumour (the [[cat-ladder]] made it feel obvious), napkin maths that says how big the prize could be, and a list of things that might go wrong. Here the rumour becomes questions, and the questions become measurements.

## A big question and a protocol {#two-levels}

We use two levels of question and keep them apart.

:::: compare Two levels of question
::: col Big-picture question
- Open-ended. The project exists to get closer to its answer.
- Its answer space is wide: yes, no, partly, "only for keys", "only in some layers".
- Choosing them is about recognising what matters.
- Example: *what is KV's fallen-apple similarity like?*
:::
::: col Framework question
- Comes with a measuring set-up: what is varied, what is held fixed, how every byte is charged.
- Lists its possible outcomes, and what each would make us do, **before** the data.
- Answering it is one clear step towards a big question.
- Example: *bits saved by a neighbour, against token distance Δ.*
:::
::::

A [[=big-question]] is the gold in the hills. We have three of them, Q1 to Q3. A [[=framework-question]] is the bucket, the scale and the written list of outcomes. We have four, A to D. Each framework question has three parts.

1. **A machine** that runs every candidate the same way. For this project it is a small measuring program with one interface for every coder ([[#plan-harness-interface]]).
2. **An accounting rule** that charges every byte the same way, so two results can be compared without argument. Ours counts [[bpe|bits per element]], everything included.
3. **Predicted outcome shapes**: the curves the measurement could produce, each with its meaning and the action it triggers.

Together they do *divide and conquer on the space of what we do not know*. Each framework cuts the unknown into a few labelled regions, and one measurement tells us which region we are in.

::: note key Write the outcomes down first
If you look at a curve first and decide afterwards what it means, every curve means "promising". Writing the outcome shapes down in advance (it is called pre-registration in medicine) is what turns a plot into evidence. Every framework page in this Part draws its outcome shapes as schematic figures, clearly marked "no data yet".
:::

::: pull
A big question is why we came. A framework question is what we do on Monday morning.
:::

::: takeaway
- Big-picture questions (Q1–Q3) are open-ended; they are the reason the project exists.
- Framework questions (A–D) fix a machine, an accounting rule and a list of outcomes with their meanings, before any data.
- Answering a framework question is one clear step towards a big question.
:::

## The map: three questions, four frameworks, two waves {#map}

Here is the whole scaffolding on one card. Read it from left to right: the big questions feed the frameworks, and the frameworks are answered by specific experiments in the plan of Part IX. Hover a card to light up its connections; click it to go to its page.

```graph
id: questions-map
columns: ["Big-picture questions", "Framework questions", "Experiments (Part IX)"]
nodes:
  - {id: q1, col: 1, row: 1, title: "Q1 · Fallen-apple similarity", text: "Is an entry cheaper to store exactly given a neighbour? How much, how far?", link: questions-q1, term: fallen-apple}
  - {id: q2, col: 1, row: 2, title: "Q2 · Dictionary + delta store", text: "Does a random-access lossless store beat solo coding on the miss path?", link: questions-q2, term: delta}
  - {id: q3, col: 1, row: 3, title: "Q3 · Heavy blocks", text: "Do misses pile into few blocks, for many steps?", link: questions-q3, term: heavy-block}
  - {id: a, col: 2, row: 1, title: "A · Bits versus distance", text: "Bits a neighbour saves, for Δ = 1 … 32K.", link: questions-framework-a, term: neighbour}
  - {id: b, col: 2, row: 2, title: "B · The compressibility curve", text: "Delta size against dictionary cost, for every coder.", link: questions-framework-b, term: curve}
  - {id: c, col: 2, row: 3, title: "C · Where misses land", text: "Replay selections; count δ-misses and loads.", link: questions-framework-c, term: dictionary-cache}
  - {id: d, col: 2, row: 4, title: "D · Requests per GPU", text: "Everything measured, turned into one number.", link: questions-framework-d, term: lever}
  - {id: e1a, col: 3, row: 1, title: "Experiment 1a", text: "The one-hour float-domain diagnostic.", link: plan-experiment-1a, cat: project}
  - {id: e1b, col: 3, row: 2, title: "Experiment 1b", text: "The exact lossless ladder.", link: plan-experiment-1b, cat: project}
  - {id: w2, col: 3, row: 3, title: "Wave 2 · trace replay", text: "Where misses land, measured.", link: plan-wave2-measure, cat: project}
  - {id: cm, col: 3, row: 4, title: "The cost model and the paper", text: "Requests per GPU with measured inputs.", link: plan-cost-model-and-paper, cat: project}
edges:
  - [q1, a]
  - [q1, b]
  - [q2, b]
  - [q2, d]
  - [q3, c]
  - [q3, d]
  - [a, e1a]
  - [a, e1b]
  - [b, e1a]
  - [b, e1b]
  - [c, w2]
  - [d, cm]
```

Each big question has a job.

- **Q1 is the existence question.** Is an [[entry]] cheaper to store exactly when a nearby entry is known? Without a yes, nothing else matters. Framework A measures it most directly; B measures it in the units the system cares about.
- **Q2 is the coding question.** Given the real access pattern, can a store of [[dictionary|dictionaries]] and [[delta|deltas]] turn those bits into smaller misses? Framework B finds the best coder; D checks that the saving survives into requests per GPU.
- **Q3 is the residency question.** Do misses pile into a few [[heavy-block|heavy blocks]] for many steps, so that their dictionaries can stay on the GPU? Framework C replays the indexer's selections to find out; D prices the answer.

The experiments come in two waves. Wave 1 (experiments 1a and 1b: one weekend, a small open model, one 16 GB GPU) answers A and B. Wave 2 (trace replay and the cost model) answers C and D, and runs only if wave 1 says go.

Every big question can come out negative, and every negative teaches something.

| question | asks | a clean "no" would mean |
|---|---|---|
| Q1 | does the similarity exist, in bits, at 8-bit precision? | a measurement nobody has published; the field turns to coding the miss path without dictionaries |
| Q2 | can a random-access store turn it into smaller misses? | the similarity is real but too costly to exploit; the paper is the measurement |
| Q3 | do misses pile into few blocks, for long? | dictionaries per request, or light ones resident for every block, instead of a cache of block dictionaries |

::: note intuition How to read the rest of this Part
Each **question page** gives the question in one plain sentence, says why it matters, and shows what a yes, a no and a partly would look like and what each would make us do. Each **framework page** says what is varied, what is held fixed and what is measured, and draws the predicted outcome shapes. The last three pages are a shelf of **parked questions**: good ideas that are not on the critical path.
:::

::: takeaway
- Q1 asks whether the similarity exists, Q2 whether a store can use it, Q3 whether its dictionaries can stay on the GPU.
- A and B answer Q1 and Q2 in wave 1; C and D answer Q3 and the economics in wave 2.
- Each "no" is informative: it changes the design or becomes the result.
:::
