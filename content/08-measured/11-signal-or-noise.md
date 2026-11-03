---
title: Signal or noise
nav: Signal or noise
group: The method
lede: 'Most of the campaign ran on two sequences. Whether that was enough came down to one trick, pairing, and to one trap the campaign fell into once. The page ends with the reporter''s part, how a day of twenty-odd researcher agents actually went, what broke, and where the campaign names its own thin spots.'
cards:
  - q: How much does one compressor's score move from one sequence to another, and how much does the paired difference of two compressors move?
    a: About 0.012 between sequences; 0.0001–0.001 for the paired difference
    wrong: ["Both about 0.012", "Both about 0.0001", "0.0001 between sequences, 0.012 paired"]
    why: Two compressors rise and fall together on the same punnets, so their difference is ten to a hundred times steadier than either score.
    sec: pairing
  - q: Why is "35 of 35 parts of a screen agree" weaker evidence than "5 of 5 sequences agree"?
    a: Punnets of one sequence are correlated; the campaign took sequences as its independent samples
    wrong: ["Parts of a screen are measured with a worse compressor", "It is stronger, since 35 is more than 5", "Parts of a screen are always shuffled"]
    why: Parts of the same text share its hardness. Only separate conversations are separate draws.
    sec: pairing
  - q: The layer screen read 0.6449 and the token screen 0.6461. What did the same-window comparison say?
    a: '`v[t, :, :, :]` cherries are better by 0.0043, on 20 of 20 sequences; the token screen simply held harder punnets'
    wrong: ["v[t, l, :, :] cherries are better by 0.0012", "The two are equal", "Neither can be ranked"]
    why: The token screen sampled punnets 0.0046 harder for every compressor. Scores from two different screens can never be subtracted.
    sec: the-trap
  - q: What single thing explains 97 % of how hard a punnet is to compress?
    a: One number per token window, shared by all KV layers and heads, that follows the share of repeated tokens (r = −0.91)
    wrong: ["Which KV layer the punnet comes from", "The compressor used", "The punnet's position in the sequence"]
    why: Hardness belongs to the text. A compressor's gain, by contrast, belongs to the layer (99 % of its variance is between layers).
    sec: the-trap
  - q: Which three decisions did the human make during and after the campaign?
    a: 'The leash limits every single cherry; delta lengths are not counted; a shared table is legitimate but no compressor may use one until an independent training dataset exists'
    wrong: ["Use fewer researchers; use BF16; stop at a stretch of 4096", "Charge delta lengths; sample 8 cherries per punnet; ban shared tables", "Verify nothing; count the mean reads; publish immediately"]
    why: Each decision changed the rules of scoring without changing any score; the first changed 4 of 19 winners and no headline.
    sec: how-the-day-ran
---

Run the best compressor of the day on two different conversations and its score moves by about 0.012. Run two different compressors on the same conversation and the difference between them moves by about 0.0001. Everything the campaign could claim from two sequences rests on the gap between those two numbers.

## Pairing {#pairing}

The campaign's unit of noise was the [[=paired-difference|paired difference]]: one compressor's score minus another's on exactly the same punnets, computed per sequence, with its spread over sequences as the noise that matters. It is the paired comparison that [[#scenario-the-score]] demands, with a number on its noise. Between sequences a single [[mdl-ratio|MDL ratio]] has a standard deviation of about 0.012. The paired difference of two compressors has 0.0001–0.001, "fifty times quieter" in the campaign's words. Both compressors rise and fall with the text, so the text cancels.

The campaign escalated in steps. Two sequences of target 03 on a [[screen]] (a tenth of the stretches), then 5, 10 and 20 sequences of target 02. Every ranking of refinements of one mechanism survived the trip.

| comparison | 2 sequences, screen | 5 sequences of target 02 | spread over sequences |
|:--|--:|--:|--:|
| 102 against 89 | −0.00210 | −0.00212 | 0.00006 |
| 89 against 71 | −0.0304 | −0.0315 | 0.0005 |
| 100 against 89 | +0.0017 | +0.0019 | 0.00014 |
| 121 against 102 | −0.0086 | −0.0088 | 0.0001 |

First, punnets of one sequence share its text, so they are correlated: the campaign took sequences as its independent samples, and "35 of 35 parts of a screen agree" is weaker evidence than it sounds while "5 of 5 sequences agree" is stronger. The measurement protocol of 2026-11-03 takes every full-stretch punnet of a holdout sequence as one sample, an approximation the human accepts, reports the mean with its Student-t confidence interval, and quotes the spread per sequence beside it as the check ([[#scenario-the-score]]). Second, a fixed detection limit is the wrong tool. C1 graded any difference under 0.002 as nothing; paired, that limit is 5–30 times the noise, and it hid real effects (a term worth −0.0006 with a spread of 0.00007 was recorded as indistinguishable). C2 dropped the number and compares each difference with its own spread, as the human asked.

The trick has limits the campaign names. The paired spread was measured for a few pairs of compressors, a change of mechanism may spread more than a refinement, and two of the newest compressors (115 and 126) have only two sequences behind them.

::: takeaway
- A score moves by about 0.012 between sequences; the paired difference of two compressors on the same punnets by 0.0001–0.001.
- Every two-sequence ranking of refinements held at five sequences, within 0.001.
- Punnets of one sequence are correlated; the campaign took sequences as its samples, the current protocol takes punnets with the per-sequence spread as the check. A fixed detection limit hid real effects and was dropped.
:::

## The trap {#the-trap}

On the afternoon of 30 October the layer screen read 0.6449 (compressor 102) and the token screen 0.6461 (compressor 94). A [[cherry-shape|cherry]] of one KV layer, `v[t, l, :, :]`, 512 bytes, looked better than one of a whole token, `v[t, :, :, :]`, 3072 bytes. Then a [[same-window|same-window comparison]] ran both on the same values of 20 sequences, and token cherries won by 0.0043, on 20 of 20. The token screen had happened to sample punnets 0.0046 harder than the layer screen, for every compressor, within 0.0001. Each screen reads different punnets and carries its own offset, so **scores from two screens can never be subtracted.** [[#measured-cutting-the-tensor]] ranks the cherry shapes with same-window comparisons only, for this reason.

What makes a punnet hard turned out to be simple. One number per 4096-token window explains 97 % of the punnet-to-punnet variance, shared by all KV layers and heads (punnet scores correlate 0.99 between the two heads of a layer and 0.96 between KV layers 0 and 5, the LLM's layers 3 and 23), and it follows the share of repeated token ids in the window, r = −0.91. A compressor's *gain* behaves differently: 99 % of a prediction rule's per-punnet gain lies between layers. Hardness belongs to the text; gain belongs to the layer.

::: figure fig-measured-noise msrNoise
**Pairing, drawn.** Left panel: the five sequences of the five-sequence layer screen along the horizontal axis; vertical axis, the MDL ratio of compressor 102 (mean 0.6385) and of compressor 121 (mean 0.6297), one line each. The lines stay parallel: the per-sequence differences are −0.00883, −0.00887, −0.00861, −0.00874 and −0.00886. Right panel: two bars on one axis, the standard deviation of a single score between sequences (0.012) and of the paired difference (0.0001). Both compressors are verified, every cherry decoded cold within the leash of 293.
:::

::: theme controls
The same-window comparison is a control on the experimenter, like the harness's shuffle. It exists because two numbers that looked comparable were not, and the only way to find out was to run both compressors on identical bytes. [[#hypotheses-the-trap]] is about reading a variance budget too hopefully; this one was plainer, two samples of different text.
:::

::: takeaway
- Two screens read different punnets and differ by a fixed offset (0.0046 here); their scores cannot be subtracted. Only a same-window comparison ranks cherry shapes.
- Punnet hardness is one number per token window, shared by all KV layers and heads, tracking repeated tokens (r = −0.91).
- A compressor's gain belongs to the layer; a punnet's hardness belongs to the text.
:::

## How the day ran {#how-the-day-ran}

The reporter's part. C1 was four researcher agents through the night of 29–30 October, on one head of one KV layer. C2 was about 21 researcher agents and one supervisor agent on 30 October, 147 iteration commits and 61 pages in one day, with the human reading and answering as it went ([[#measured-dispatch]]). The supervisor's own review lists what broke.

- **A crash at 12:35 UTC** left 14 empty git objects; nothing was lost.
- **Twelve researchers saturated the machine.** Its 16 cores and one hard disk stalled; verification took 50 minutes where it needed 10. The supervisor cut the number to about seven.
- **The status loop hung** on a slow disk walk, so nothing reached GitHub for 55 minutes while the supervisor reported that it was running.
- **A commit landed with 9 failing tests.** Commits are now gated on tests.
- **Two good compressors were recorded `lossy`** when their check had only timed out. A time-out is now `unverified`; both passed on rerun (115 at 0.64003, 110 at 0.62105), and the old rows stay on the ledger.
- **74 duplicate ledger rows** came from a bug in the supervisor's script. They stay, since receipts are never rewritten.

Words did damage too. Four of the campaign's words caused most of the human's confusion, and some of the supervisor's: the one for a position inside a vector, the one for the prediction rule, the one for a run of token positions, and "detection limit". The campaign's terminology file was written afterwards, from the tensor itself; the supervisor says it should have been written first. This site inherits the lesson and uses its own words throughout ([[#reference-old-words]]): a position in a cherry is an [[element]], the rule is [[linear-prediction]], a run of token positions is a [[stretch]] and the cherries it yields are a [[punnet]].

The campaign also names its own thin spots, and this Part repeats them wherever a number appears.

- **One kind of text.** Every sequence is a coding-agent transcript, with tool output making up 26–89 % of it.
- **Two sequences for most results**, which the campaign itself calls smoke-test grade. The best compressors (116, 121) reached five sequences at the very end.
- **No holdout used in C2.** Researchers looked at results and chose what to try next; the holdout sequences were kept out, so that check is still available.
- **Whole-sequence punnets unknown; keys untouched in C2.**

Three decisions were the human's: the [[leash]] limits every single cherry, which changed 4 of 19 winners and no headline; delta lengths are not counted (worth 0.0003–0.0024 of ratio, changing no winner); a [[shared-table]] is legitimate but waits for an independent training dataset.

::: aside source Receipts
Noise: r12 iter-1-1 and iter-1-2, r24 iter-1-3; KNOWLEDGE tags [noise/threads], [noise/three], [noise/MDI], [noise/hardness]; the r = −0.91 is in r12's journal only. Escalation table recomputed from the ledgers: 102 r24-t0002, 89 r12-t0007, 71 r24-t0003, 100 r24-t0001, 121 env-t0096, on `st02n5-layer-b4k-r293`, all isolated-verified. The trap: r11-t0002 (102, layer screen), r8-t0003 (94, token screen), r24 iter-1-3 for the 20-sequence reversal. Day and incidents: `research/agents/env/pages/retro-review.md` and article 07; the 21 / 147 / 61 counts were not re-counted by the fact-check. Thin spots: article 07, "What we might have missed". The four words: "channel", "map", "block", "detection limit". Spec §1.11.
:::

::: takeaway
- About 21 researcher agents and a supervisor, 147 iteration commits and 61 pages in one day; a crash, a saturated machine, a hung status loop, a bad commit and two false `lossy` grades, all recorded.
- Four words caused most of the confusion; the terminology was written from the tensor afterwards.
- One kind of text, mostly two sequences, no holdout used, keys untouched: the campaign's own list, carried through this Part.
:::
