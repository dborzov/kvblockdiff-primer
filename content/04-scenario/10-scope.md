---
title: 'Who pays for the dictionary: scope'
nav: Scope
group: The rules
lede: A dictionary can be fit on the punnet it serves, on the whole sequence, or on other texts entirely. Each choice decides whether its bytes enter the score, and what it can know.
cards:
  - q: 'A dictionary weighs `w = 256` cherries'' worth. How many bits per element does it add in a punnet of `b = 512` cherries?'
    a: 4 bits, half of the raw 8
    wrong: ["0.5 bit", "0.0625 bit", "256 bits"]
    why: '$8\vw/\vb = 8 \cdot 256 / 512 = 4$. No residual saving is that large; a codebook that size needs punnets of 8K cherries or more.'
    sec: three-scopes
  - q: Which scope's dictionary adds nothing to the score?
    a: Global scope, a shared table fitted on dev sequences or a separate training corpus and shared by every sequence
    wrong: ["Stretch scope, because punnets are small", "Sequence scope, because it is loaded once", "None; every scope pays the same"]
    why: A shared table is side information, held by both sides before any sequence is seen, so no byte of it enters the score. It must be fitted on dev sequences or a separate corpus, never on a holdout sequence.
    sec: three-scopes
  - q: How does sequence scope relate to stretch scope?
    a: It is stretch scope with one stretch as long as the sequence
    wrong: ["It uses a different compressor", "It needs no dictionary", "It charges the dictionary twice"]
    why: 'The same `compress` call on a punnet of the whole sequence''s slice. One control checks this to the bit.'
    sec: three-scopes
  - q: What is a calibration corpus for?
    a: Fitting shared tables and solo tables on the dev sequences or a separate training corpus, never on a holdout sequence
    wrong: ["Measuring the leash", "Choosing the stretch length", "Training the LLM"]
    why: A shared table fitted on the holdout sequences would be a hidden dictionary; fitting it on dev sequences or a separate corpus rules that out.
    sec: three-scopes
---

A dictionary is fitted on some data and shared by some set of cherries. The set it is shared by decides how its bytes enter the score: charged in full to one punnet, charged in full to the one punnet a whole sequence is, or not charged at all because both sides held it before any sequence was seen. That set is the scope.

## Three scopes {#three-scopes}

::: define scope
- **What it is.** What a [[dictionary]] is fit on and shared by. Three rungs: **global** (every sequence), **sequence** (one conversation), **stretch** (one punnet). A narrower scope knows more about its cherries, and its bytes are spread over fewer of them.
- **Example.** Per-[[furrow]] locations fit on a calibration corpus (global), on one 225K-token transcript (sequence), or on one punnet of 4096 cherries (stretch) are three dictionaries of the same kind: the first is free side information, the second is charged in full to the one punnet the sequence is, the third is charged in full to each punnet of 4096 cherries.
- **Easy to confuse with** the stretch length. Sequence scope is not a different mechanism: it is stretch scope with `stretch_len = n_tokens`.
:::

| scope | the dictionary is fit on | shared by | charged |
|---|---|---|---|
| [[=scope-stretch\|stretch]] | the punnet itself | its `punnet_size` cherries | in full, in the dictionary share $\vxshare$ |
| [[=scope-sequence\|sequence]] | the whole sequence's slice | the one punnet the whole sequence is | in full, in the dictionary share of that punnet: the whole-sequence stretch of the scenarios in scope, with leash 14 503 |
| [[=scope-global\|global]] | a [[=calibration-set\|calibration corpus]]: the dev sequences, or a separate training corpus, never a holdout sequence | every sequence | not at all: a [[shared-table\|shared table]] is side information, held by both sides before any sequence is seen |

The bits per element a dictionary adds follow the amortization rule of [[#school-amortization]], with the dictionary's [[=weight]] $\vw$ (its size in cherries' worth, so $\vDsz = \vw\,\ve$) spread over the $\vb$ cherries that share it:

$$
\underbrace{\frac{8\,\vDsz}{\vb\,\vd}}_{\text{dictionary bytes over the elements that share them}} \;=\; \underbrace{\frac{8\vw}{\vb}}_{\text{bits per element}}, \qquad \vxshare = \frac{\vw}{\vb}.
$$ {#eq-scn-amortization}

```python what a dictionary costs per element, by scope
w, b, d = 256, 512, 512                  # a 256-cherry codebook, a punnet of 512 cherries, 512 elements each
stretch_scope  = 8 * w / b               # 4.0 bits per element: half the raw 8
b_seq = 225_000                          # sequence scope: one punnet as long as the sequence
sequence_scope = 8 * w / b_seq           # 0.009 bits per element
global_scope   = 0.0                     # one copy per GPU, shared by every sequence
```

::: figure fig-scn-scope-cost scnScopeCost
**What a dictionary costs per element, against its weight and the cherries that share it.** Horizontal axis: dictionary weight $\vw$ in cherries' worth, 1 to 4096 (log scale). Vertical axis: $8\vw/\vb$, bits per element. One line per punnet size $\vb$ (512, 4096, 16 384 and a whole 225K-token sequence); the dashed line is the raw 8 bits. Marks: the campaigns' dictionaries (a light one of 2 % at $\vxshare = 0.02$; a reference-tree one at 0.52). Hover a mark for its weight, punnet size and bits per element.
:::

::: try
1. Find $\vw = 256$ on the $\vb = 512$ line: 4 bits, half the raw rate. Then on the sequence line: a few thousandths of a bit.
2. Follow the 0.52 mark: a tree dictionary is half the punnet at every stretch length, because it is made of cherries. Its cost does not amortize; its benefit is on the delta side.
:::

Two consequences.

- **Sequence scope is stretch scope stretched.** The same `compress` call on a punnet of the whole sequence's slice. One of the harness's controls checks this identity to the bit ([[#scenario-the-harness]]). Since 2026-11-03 the whole sequence is one of the four stretch lengths in scope, with leash 14 503, so a sequence-scope dictionary is measured like any other: charged in full to its one punnet. The old plan's "128K-token blocks" were this scope under another name. <!-- old-words -->
- **A dictionary's fitted tables are part of the dictionary.** A narrow-scope dictionary ships what it fitted on its punnet: per furrow a centre, a scale and a code width, which the campaigns' harness charged like any other byte. The compressor's configuration, chosen on the dev sequences, is side information and is not charged. The lightest real dictionary weighed $\vw \approx 4$, not 2 ([[#toolbox-furrow-statistics]]).

The scope gains are the two numbers the old plan wanted first and the campaigns have measured only one of: $\vgainstr$, what per-punnet dictionaries save over a per-sequence one (the campaigns worked at stretch scope throughout; their punnet floors sit at 0.60 for 16K positions and about 0.57 for a whole sequence, so there is more to win at sequence scope, [[#measured-shared-across-the-stretch]]), and $\vgainseq$, what a per-sequence dictionary saves over a global one, still unmeasured ([[#plan-next-in-the-harness]]).

::: theme amortize
A 256-cherry codebook in a 512-cherry punnet adds 4 bits per element, half the raw rate; the same codebook spread over a 225K-cherry sequence adds 0.009 bit; as a shared table it adds nothing. The scope sets how many cherries share a dictionary's bytes.
:::

::: takeaway
- Stretch scope charges the dictionary in full to each punnet; sequence scope charges it in full to the one punnet the whole sequence is; a global dictionary is a shared table, not charged, fitted on dev sequences or a separate corpus.
- A dictionary costs $8\vw/\vb$ bits per element; sequence scope is stretch scope with one stretch as long as the sequence.
:::
