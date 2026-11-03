---
title: 'Principles: speed first'
nav: Principles
group: Where we stand
lede: Six rules for the next round of experiments, chosen for one reason, the time from "let's try it" to a reading we would act on. They are short because the campaigns already paid for the lessons behind them.
cards:
  - q: Two compressors score 0.636 and 0.629 on two different screens. What can be said about which is better?
    a: 'Nothing: two screens read different punnets, so the scores cannot be subtracted; only a paired run on the same punnets ranks them'
    wrong: ["The second is better by 0.007", "The first is better, because its screen was harder", "They are equal within noise"]
    why: The campaigns learned this the hard way. The frontier compressor beat its parent by 0.0088 on every one of 5 sequences with a spread of 0.0001, and only a paired comparison could show it.
    sec: rules
  - q: What is an experiment question, on this site?
    a: A question asked together with its scenario line, its controls and the meaning of each possible reading, all written down before any data
    wrong: ["Any question an experiment could answer", "A question about the harness's code", "One of the three big questions"]
    why: The scenario line fixes what is measured, the controls fix what would expose a mistake, and the pre-written readings stop every curve from meaning "promising".
    sec: rules
  - q: Why does every experiment of this Part carry a rough cost in hours?
    a: Because the experiments are ordered by speed to a result, and an hour estimate is what makes that ordering checkable
    wrong: ["To bill the GPU time", "Because the harness refuses jobs without one", "To compare compressors by their run time"]
    why: Speed first is the ruling principle of this plan; an experiment that cannot say how long it takes cannot be placed in the queue.
    sec: card
---

The frontier compressor of Part VIII, number 121, beat its parent by 0.0088 of ratio. That is a small number, and it was believed at once, because it held on every one of five sequences with a spread of 0.0001 ([[#measured-signal-or-noise]]). A day earlier, two compressors 0.02 apart on different [[screen|screens]] could not be ranked at all. The difference between those two situations is the whole method of this Part.

## Six rules {#rules}

1. **Speed first.** The experiments are ordered by the time from "let's try it" to a reading we would act on, not by how interesting they are. A two-hour run that settles one line of the decision table beats a two-week study that settles three.
2. **Use the Bench dump.** Thirty sequences of values and pre-RoPE keys already exist ([[#plan-the-dataset-we-have]]). Anything that can be measured on them is measured on them first; dumping new data is itself an experiment with a cost.
3. **Paired comparisons on the same punnets.** Two compressors, or two cherry shapes, are compared on exactly the same [[punnet|punnets]]: the [[paired-difference|paired difference]] per punnet is reported with its Student-t confidence interval, and the spread per sequence is quoted beside it as the check. Under the protocol of 2026-11-03 every full-stretch punnet of a holdout sequence is one sample, and a compressor's configurations are chosen on the dev sequences before the holdout is read ([[#scenario-the-score]]). Scores from two screens are never subtracted ([[#measured-signal-or-noise]]).
4. **Controls before conclusions.** The [[shuffle-control|shuffle control]] runs next to every neighbour-dependent claim; a shuffled trace runs next to every residency claim; synthetic data with a planted answer runs before either ([[#scenario-the-harness]]). A reading without its control is a lead.
5. **One scenario per question.** Each experiment is one line, `cherry (as an index expression) · stretch · leash`, and one change against a line already run. Two changes at once produce a number nobody can attribute.
6. **Write the decision rule before the data.** Every experiment states, on [[#plan-decision-rules]], what each reading would make us do. Thresholds are judgement calls; their value is that they are fixed in advance.

::: define framework-question
- **What it is.** A question asked together with everything needed to answer it: the scenario line (or the trace) it runs on, what exists and what must be written, the expected signal and its controls, the decision it informs, and a rough cost in hours. All of it written before the run.
- **Example.** "Does `K at one KV layer, k[t, l, :, :] · stretch 4096 · leash 293` land within 0.03 of the same line on values?" with the paired same-window control and the reading "yes: one compressor serves both halves; no: keys need their own stages".
- **Easy to confuse with** a [[big-question|big-picture question]], which it serves but never settles alone.
:::

::: theme controls
The campaigns' sharpest result, that the tree's gain vanishes under the shuffle while the prediction's gain stays, came from a control, not from a new compressor. Rule 4 is where the next such result will come from.
:::

::: takeaway
- Speed first; the Bench dump first; paired scores on the same punnets; controls next to every claim; one scenario per question; the decision rule before the data.
- An experiment question bundles the question with its scenario, its controls, its reading and its cost.
:::

## The card every experiment carries {#card}

Each experiment on the next pages is written on the same card, six lines long, so that two experiments can be compared for priority the way two compressors are compared for score.

```text the experiment card, as every entry of this Part fills it in
question   which hypothesis of Part VII, or which scenario difference of Part IV, it reads
scenario   the line it runs on: slice · cherry shape · stretch · leash  (or: the trace it needs)
exists     what already runs in the harness, and what is one script away
signal     the expected reading, with the control that could destroy it
decision   the line of the decision table it settles
cost       hours to the first reading, split into writing and running
```

The cost line is deliberately rough. It is derived from two measured numbers: the frontier compressor encodes one 4096-token punnet in about 55 CPU seconds, and a screen is 72 punnets, so one screen of the frontier compressor is about one CPU hour, and a full sequence (55 punnets) about the same ([[#measured-the-data]]). A new scenario that only changes the slice costs an hour of running plus whatever it costs to write; a new corpus costs a dump as well.

::: note warning What the card does not promise
An hour estimate is not a measurement. It is there to order the queue and to be corrected after the first run. The campaigns' own estimate for a loc ladder was "a few hours of single-core numpy"; the real harness forked a decoder per cherry and took a day.
:::

::: takeaway
- Six lines per experiment: question, scenario, what exists, signal and control, decision, cost.
- Costs come from 55 CPU seconds per punnet for the frontier compressor and 72 punnets per screen.
:::
