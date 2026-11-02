---
title: 'Who pays for the dictionary: scope'
nav: Scope
group: The rules
lede: A dictionary can be fit on the punnet it serves, on the whole sequence, or on other texts entirely. Each choice decides who pays for it and what it can know. One axis organizes the whole design space.
cards:
  - q: 'A dictionary weighs `w = 256` cherries'' worth. What does it cost per element in a punnet of `b = 512` cherries?'
    a: 4 bits, half of the raw 8
    wrong: ["0.5 bit", "0.0625 bit", "256 bits"]
    why: '$8\vw/\vb = 8 \cdot 256 / 512 = 4$. No residual saving can pay for that; a codebook that size needs punnets of 8K cherries or more.'
    sec: three-scopes
  - q: Which scope gets its dictionary for free at serving time?
    a: Global scope, fit once on a separate calibration corpus and shared by every sequence
    wrong: ["Stretch scope, because punnets are small", "Sequence scope, because it is loaded once", "None; every scope pays the same"]
    why: One copy per GPU, shared by every sequence, costs nothing per punnet. It must be fit on data it is never scored on, or it cheats.
    sec: three-scopes
  - q: How does sequence scope relate to stretch scope?
    a: It is stretch scope with one stretch as long as the sequence
    wrong: ["It uses a different compressor", "It needs no dictionary", "It charges the dictionary twice"]
    why: 'The same `compress` call on a punnet of the whole sequence''s slice. One control checks this to the bit.'
    sec: three-scopes
  - q: What is a calibration corpus for?
    a: Fitting global-scope dictionaries and solo tables on sequences that are never scored, so the global scope cannot peek at the answer
    wrong: ["Measuring the leash", "Choosing the stretch length", "Training the LLM"]
    why: A global dictionary fit on the evaluation data has an unfair head start; the corpus keeps it honest.
    sec: three-scopes
---

The restaurant bill has the dish, a service charge per guest, and, if you booked the private room, the room's rent divided among everyone at the table. A dictionary is the room. Who sits at the table is the scope.

## Three scopes {#three-scopes}

::: define scope
- **What it is.** What a [[dictionary]] is fit on and shared by. Three rungs: **global** (every sequence), **sequence** (one conversation), **stretch** (one punnet). Narrower scope knows more about its cherries and is paid by fewer of them.
- **Example.** Per-[[furrow]] locations fit on a calibration corpus (global), on one 225K-token transcript (sequence), or on one punnet of 4096 cherries (stretch) are three dictionaries of the same kind with three different bills.
- **Easy to confuse with** the stretch length. Sequence scope is not a different mechanism: it is stretch scope with `stretch_len = n_tokens`.
:::

| scope | the dictionary is fit on | shared by | charged |
|---|---|---|---|
| [[=scope-stretch\|stretch]] | the punnet itself | its `punnet_size` cherries | in full, in the dictionary share $\vxshare$ |
| [[=scope-sequence\|sequence]] | the whole sequence's slice | every punnet of the sequence | once per sequence, amortized over all its stretches |
| [[=scope-global\|global]] | a [[=calibration-set\|calibration corpus]] disjoint from the evaluation data | every sequence | not per punnet (one copy on the receiver); must be fit on data it is never scored on |

The price of a dictionary per element is the amortization rule of [[#school-amortization]], with the dictionary's [[=weight]] $\vw$ (its size in cherries' worth, so $\vDsz = \vw\,\ve$) spread over the $\vb$ cherries that share it:

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

- **Sequence scope is stretch scope stretched.** The same `compress` call on a punnet of the whole sequence's slice. One of the harness's controls checks this identity to the bit ([[#scenario-the-harness]]). The old plan's "128K-token blocks" were this scope under another name. <!-- old-words -->
- **The compressor's own settings are part of the dictionary.** A narrow-scope dictionary must ship its tables: per furrow a centre, a scale and a code width, which the campaigns' harness charged like any other byte. The lightest real dictionary weighed $\vw \approx 4$, not 2 ([[#toolbox-furrow-statistics]]).

The scope gains are the two numbers the old plan wanted first and the campaigns have measured only one of: $\vgainstr$, what per-punnet dictionaries save over a per-sequence one (the campaigns worked at stretch scope throughout; their punnet floors sit at 0.60 for 16K positions and about 0.57 for a whole sequence, so there is more to win at sequence scope, [[#measured-shared-across-the-stretch]]), and $\vgainseq$, what a per-sequence dictionary saves over a global one, still unmeasured ([[#plan-next-in-the-harness]]).

::: theme amortize
The room is worth booking only if enough guests share it. A 256-cherry codebook in a 512-cherry punnet costs more than the meal; the same codebook per sequence costs nothing worth mentioning. Scope is the knob that sets the number of guests.
:::

::: takeaway
- Stretch scope pays the dictionary in full per punnet; sequence scope amortizes it over the sequence; global scope is free per punnet but must be fit on a calibration corpus.
- A dictionary costs $8\vw/\vb$ bits per element; sequence scope is stretch scope with one stretch as long as the sequence.
:::
