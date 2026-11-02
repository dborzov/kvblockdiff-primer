---
title: The project, and its four subproblems
nav: The four subproblems
group: The problem
lede: 'kvblockdiff is one bill with four lines, and each line is answered by a different kind of knowledge. This page writes the bill down, shows why it falls apart into four problems that can be studied on their own, and says why the first of them, the compression scenario, is cut the way it is.'
cards:
  - q: What are the four subproblems of kvblockdiff?
    a: 'The compression scenario (bytes per cherry), the pick trace and the hot-cache replay (which picks miss and where they land), the decoder''s speed (does a cold decode fit the step), and the economics (sequences per GPU and dollars)'
    wrong: ["Keys, values, queries and the indexer", "Prefill, decode, eviction and residency", "Entropy, prediction, quantisation and caching"]
    why: Each supplies one factor of the application's bill, depends on different data, and has its own clean statement and its own measurement.
    sec: the-bill
  - q: Why is the compression scenario studied apart from the serving system?
    a: Because the bytes a cherry needs depend only on the orchard and the dictionary, not on the indexer, the cache or the link, so they can be measured on a dump of orchards with no serving system at all
    wrong: ["Because serving systems cannot be simulated", "Because the compression scenario is the whole project", "Because the indexer is secret"]
    why: The factor it supplies, the delta share against dictionary weight, is a property of the data. The traffic factors come from a different source, the indexer's picks.
    sec: why-four
  - q: Why does the scenario insist on one cherry at a time, decoded cold, under a leash?
    a: Because the miss path fetches one scattered pick now, with nothing decoded before it, and a dictionary that quietly contains the punnet would make the measurement answer a different question
    wrong: ["Because GPUs cannot decode streams", "Because the leash makes compressors faster", "Because the campaigns' harness could not do otherwise"]
    why: Every rule of the scenario is the access pattern of the application written down, so that its numbers mean what the bill needs them to mean.
    sec: why-this-cut
---

HiSparse ([[#landscape-hisparse]]) charges two prices per sequence: bytes over the link per decode step, and bytes of GPU memory. kvblockdiff proposes to lower both by serving picks as deltas against dictionaries. Whether it does is one bill, and the bill has four lines that nobody can measure with one experiment.

## The bill {#the-bill}

For one sequence at one layer, with a hot cache of $\vB$ slots and a dictionary shelf of $\vnD$ dictionaries, one decode step moves over the link

$$
\vTstep \;=\; \underbrace{\text{misses}}_{\text{how many picks miss}} \times \ve \Big[\underbrace{\vfD\,\vrho}_{\text{δ-misses}} + \underbrace{(1-\vfD)}_{\text{raw misses}}\Big] \;+\; \underbrace{\vnload \, \vw \, \ve}_{\text{dictionaries loaded}},
$$ {#eq-scn-the-bill}

and it occupies in GPU memory the hot cache plus the shelf, $\vMreq = \vNL\,\ve\,(\vB + \vnD\,\vw)$ bytes, with $\vB$ and $\vw$ counted in cherries' worth. The number of sequences a GPU can serve, and the dollars per million tokens, follow from these two ([[#app-two-levers]], [[#app-bits-to-dollars]]).

Look at where each factor comes from.

| factor | what it is | what it depends on | the subproblem that supplies it |
|---|---|---|---|
| $\vrho$, $\vw$ | delta share and dictionary weight: how many bytes a cherry needs given a dictionary of a given size | the orchard's bytes and the compressor; nothing else | **the compression scenario** (this Part) |
| misses, where they land, $\vfD$, $\vnload$ | which picks are wanted, how often they miss, how they pile into stretches | the indexer's behaviour on real sequences; nothing about bytes | **the pick trace and the hot-cache replay** ([[#plan-queries-and-picks]], [[#plan-hot-cache-replay]]) |
| "fits the step" | whether a cold decode of a delta is faster than fetching the raw pick | the compressor's decode path and the GPU; nothing about the data's statistics | **the decoder's speed** ([[#plan-decoder-speed]]) |
| $\vN$, dollars | sequences per GPU, tokens per second, cost | all of the above and a reference setting | **the economics** ([[#app-the-napkin]]) |

::: theme which-vs-what
The first line is about *what is inside* the picks; the second about *which* picks are wanted. The bill multiplies them, but no experiment measures both at once, and evidence for one is never evidence for the other.
:::

::: takeaway
- kvblockdiff's bill: link bytes per step and GPU bytes per sequence, each a product of a bytes factor, a traffic factor and a time condition.
- Each factor comes from a different kind of knowledge, and that is why there are four subproblems.
:::

## Why four problems, not one {#why-four}

Three reasons, and each is practical.

1. **Different data.** The bytes factor is measured on a dump of orchards; the campaigns of Part VIII measured it on 30 sequences of Qwen3.5-2B's values with no indexer in sight. The traffic factor needs picks, which need queries and a selector; it can be measured on the same dump once queries are recomputed ([[#plan-the-dataset-we-have]]). The time condition needs a GPU and a kernel. Tying them together would mean waiting for the slowest.
2. **Different tools, different people.** Information theory and compressor design for the first; cache simulation for the second; kernel engineering for the third; napkin arithmetic for the fourth. The autonomous campaigns could run twenty agents on the first subproblem precisely because its contract fits in three lines of Python.
3. **A number with a grade, consumed by the bill.** Each subproblem returns numbers the bill can take as inputs: a curve of $\vrho$ against $\vw$ per scenario; a miss rate and a popularity curve per cache size; a decode rate in cherries per second. The economics page takes them with their grades ([[#scenario-the-harness]]) and marks every assumption that fills a gap.

Each subproblem gets the same treatment on this site: a clean statement (inputs and outputs as Python-shaped objects, what is assumed, what is charged, what is out of scope), then the experiments that measure it. This Part is that treatment for the first; the pages linked in the table are it for the other three.

::: takeaway
- The subproblems use different data, different tools and different people, and each returns graded numbers the bill consumes.
- Every subproblem gets a clean statement before its experiments.
:::

## Why the scenario is cut the way it is {#why-this-cut}

The compression scenario of the next pages is deliberately narrower than "compress the orchard". Each of its rules is a feature of the application, written down so that the scenario's numbers mean what the bill needs them to mean.

- **One cherry at a time, at random, decoded cold** ([[#scenario-the-contract]]): because a hot-cache miss fetches one scattered pick now, with nothing decoded before it. A compressor that needs its neighbours decoded first would be measuring a different data path (bulk transfer, [[#papers-splitzip]]).
- **A dictionary held in advance, and charged** ([[#scenario-the-score]]): because the shelf must hold it in GPU memory and load it over the link; its weight is the $\vw$ of the bill.
- **The leash** ([[#scenario-the-leash]]): because a dictionary that quietly contains the punnet turns a cold decode into a decode of the punnet; the measurement would then answer "how well does the punnet compress as a stream", which the bill cannot use.
- **Scenarios varied along slice, cherry shape, stretch length, leash and scope** ([[#scenario-why-vary]]): because what a pick covers differs between serving designs (one layer in DSA, a group of layers in GLM-5.1), and because the differences between scenarios are themselves measurements of where the orchard's bits are.
- **No link, no hot cache, no indexer, no milliseconds**: because none of them changes the bytes a cherry needs, and each belongs to another subproblem.

What the scenario hands to the bill is a curve, not a point: for each scenario, the delta share reachable at each dictionary weight, with the leash respected and every cherry verified. The bill then chooses the point it can afford.

::: note key The other three, in one line each
A **pick trace** is the list of pick sets per layer per decode step that a selector names on a sequence; a **hot-cache replay** runs a cache policy over a trace and counts misses, where they land and how long stretches stay popular, with no bytes involved; the **decoder's speed** is cold-decoded cherries per second on a GPU against the link's bytes per second; the **economics** multiplies the four factors for a reference setting and marks every assumption. Each has its page.
:::

::: takeaway
- Every rule of the scenario is an access-pattern fact of the application written as a rule a harness can check.
- The scenario returns curves of delta share against dictionary weight per scenario; the bill picks the affordable point.
:::
