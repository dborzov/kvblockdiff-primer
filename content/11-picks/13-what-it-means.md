---
title: What it means, and what is next
nav: What it means
group: What it changes
lede: The counts side of the napkin is now measured on one stand-in LLM, with grades. It moves the project's target. The compression search should aim at codes that keep zero or very few bytes on the GPU per sequence, and a dictionary byte should be counted as GPU memory. This page lists the consequences, the open questions in the order in which they could change them, and the caveats every number carries.
cards:
  - q: What should be done to HiSparse before any compression is compared with it?
    a: Resize its hot cache to about 4740 slots, which raises it from 109.5 to 127 sequences per GPU on the Pin
    wrong: ["Remove its hot cache", "Shrink its hot cache to 2048 slots", "Nothing; 109.5 is the baseline"]
    why: 'At 4096 slots HiSparse is link-bound with memory to spare. Every kvblockdiff gain is quoted against 127.'
    sec: for-the-project
  - q: Why is the campaigns' best ratio (0.636) the wrong target for a GPU-resident application?
    a: Its dictionary is 52 % of the punnet, and as GPU memory it saves fewer link bytes than the same memory would as hot-cache slots
    wrong: ["Because 0.636 was never verified", "Because its deltas are too large", "Because it breaks the leash"]
    why: 'Each tree dictionary would have to raise f_D by more than 0.5 to beat the slots its memory would hold. A solo code, 0.804 with no dictionary, serves 141 sequences per GPU at the Pin.'
    sec: for-the-project
  - q: 'A compression search moves the ratio of a global code from 0.804 to 0.70, 13 % fewer bytes per miss. What does that add at the Pin?'
    a: 'About 7 % more sequences per GPU, 141 to 151'
    wrong: ["About 13 %, the same as the bytes", "About 30 %", "Nothing, the link is not the bottleneck"]
    why: 'By the half-gain rule sequences per GPU grow as about 1/√ρ; the hot cache shrinks to take the other half of the gain. The whole bytes side is bounded at +31 % (166 at 0.57).'
    sec: for-the-project
  - q: Which open question would change the conclusion first?
    a: Whether a GPU decodes a solo code at 500 GB/s or more; without it, the 141 is not reachable
    wrong: ["Whether keys compress like values", "Whether the leash should be 137", "Whether Qwen3.5-2B has more layers"]
    why: 'The solo code is the best design measured only if its deltas are decoded about ten times faster than the link delivers them.'
    sec: next
  - q: What would a pick trace of Qwen3.5-2B at 225K tokens add?
    a: It would put the Pin's 100K inside the measured contexts, turning the 4.4× extrapolation of f_D into an interpolation
    wrong: ["It would replace the Pin", "It would measure the decoder's speed", "Nothing; the share rule already settles f_D"]
    why: 'f_D at the Pin is read at 22.5K and carried by the b / t^1.27 rule. A 225K-token trace would measure it directly, on the LLM whose values the campaigns compressed.'
    sec: next
  - q: Which caveat sets the largest extrapolation in this Part?
    a: 'f_D at the Pin is carried 4.4× in context, from the Bachelor''s 22.5K to 100K'
    wrong: ["The stand-in indexer churns 1.2–1.5× more than GLM-5.1's", "Decode-like steps miss 1–9 % more", "There are five sequences"]
    why: 'The shelf''s catch is read at the 20K–24K bin and carried by the b / t^1.27 rule; a trace of Qwen3.5-2B to 225K would turn it into an interpolation.'
    sec: caveats
---

Before this Part, every count in the napkin of [[#app-the-napkin]] (misses per step, the δ-miss fraction, dictionary loads) was either HiSparse's or assumed. Now each has a measured value on [[bachelor|the Bachelor]] and an extrapolated value for [[pin|the Pin]], with a grade. The pages before this one report them. This page says what follows for the project.

## What follows for the project {#for-the-project}

1. **Keep the hot cache, and resize it before compressing anything.** On the Pin's rig HiSparse at 4096 slots is link-bound with memory to spare. At about 4740 slots it serves 127 sequences per GPU instead of 109.5, with no compression ([[#picks-ceiling/resized]]). [[#app-victim-tier]] already finds about 127 with a different use of the same memory. Every gain of [[kvblockdiff]] is quoted against 127.
2. **Aim the compression search at zero or very few bytes per sequence.** The campaigns' best ratio, 0.636 (reference tree and linear prediction, [[dictionary-share|dictionary share]] 0.525), is the wrong target for an application whose dictionaries live on the GPU: each tree dictionary would have to raise $\vfD$ by more than 0.5 to save more link bytes than its memory would as hot-cache slots ([[#picks-slot-price/inequality]]). What reaches the most sequences is the ratio on the miss path with no memory per sequence: [[solo]] coding (0.804 verified, 0.778 as a code-length estimate) and global stages, tables fixed per LLM and per layer, which the scenario already counts as side information ([[#scenario-scope]]). Next come dictionaries of at most 2 % of the stretch, kept at the shortest stretch length the shelf allows: longer stretches lower the MDL ratio and enlarge every resident dictionary ([[#picks-slot-price/stretch-length]]). The bachelor-kv write-up proposes that the scenario's score count a dictionary byte as GPU memory, at the [[slot-price|slot price]], rather than as one link byte spread over the punnet ([[#scenario-the-score]]); that change is the human's decision and is not made here.
3. **Expect at most a third more sequences from compression.** By the [[half-gain-rule|half-gain rule]], a code with no bytes per sequence raises sequences per GPU as about $1/\sqrt{\vrho}$: 141 at solo's verified 0.804, 151 at 0.70, 162 at the floor of 0.60 inside a punnet of 16 384, 166 at the extrapolated whole-sequence floor of 0.57 ([[#picks-ceiling/half-gain]]). The floors bound the gain of the whole bytes side at the Pin at +31 % over the resized cache, and each further step of the ratio is worth about half its size. A compression search that moves the ratio from 0.804 to 0.70 adds 7 % to the serving system.
4. **Stretch dictionaries are small, if they are used at all.** A shelf of light dictionaries adds 0–5 % to the resized cache on the extrapolated $\vfD$, and nothing when a solo code serves the misses underneath it. A shelf is worth building only if $\vfD$ at the Pin turns out near the upper end of its range, or if dictionaries shrink further ([[#picks-shelf/pin]]).
5. **Size the link for bursts.** Per layer, the step at the 99th percentile misses 2.9 times the mean, the [[burst-factor|burst factor]] ([[#picks-hot-cache/bursts]]).
6. **Judge an indexer on stability as well as recall.** At equal recall, errors fixed per position lower the misses and errors drawn afresh at every step multiply them ([[#picks-the-indexer/noise]]).

::: pull
The bytes side of kvblockdiff is worth at most +31 % at the Pin, 166 sequences per GPU against 127, and only for a code that keeps no bytes per sequence on the GPU.
:::

::: keycard The measured order at the Pin, each design at its best hot-cache size
Solo code on every miss 141 · solo plus a light shelf 140–141 · light shelf 127–133 · HiSparse resized 127 · mid shelf 118–124 · light dictionaries all resident 116 · HiSparse as published 109.5 · tree shelf 88–108. The ceiling for any global code: 166 at the floor of 0.57. Derived and extrapolated; [[#picks-slot-price/napkin]], [[#picks-ceiling/half-gain]].
:::

::: takeaway
- Resize HiSparse's hot cache first: 127 sequences per GPU, the baseline for every gain.
- The best design measured keeps no bytes per sequence: a solo code on every miss, 141; the ceiling of the bytes side is 166 (+31 %), and each step of the ratio is worth about half its size.
- Stretch dictionaries add 0–5 % at most; the link needs room for bursts of 2.9× the mean; indexers are judged on stability too.
:::

## What is open, in the order it could change the conclusion {#next}

1. **The decoder's speed** ([[#plan-decoder-speed]]). A solo code must decode at 500 GB/s or more on the GPU, ten times the link, or the 141 is not reachable. Unmeasured.
2. **Solo coding on keys and on an MLA latent.** A miss fetches a pick's keys as well as its values, and the Pin stores one latent per token per layer. The campaigns' solo ratio is for values of Qwen3.5-2B ([[#hypotheses-keys-and-values]], [[#plan-next-in-the-harness]]).
3. **A second LLM with a long context: Qwen3.5-2B to 225K**, the Bench's LLM. Its 225K-token sequences put the Pin's 100K inside the measured range and turn the 4.4× extrapolation of $\vfD$ into an interpolation. It is a hybrid (6 full-attention layers among 24), and its values are the ones Part VIII compressed, so both sides of the napkin would come from one orchard. Two text sets are planned: the same five sessions cut to about 27K tokens (a different LLM, the same text) and five of the 30 long transcripts (the same LLM, a longer context). One more forward pass that keeps the queries, about 8 GB per 225K-token sequence ([[#plan-queries-and-picks]]).
4. **Are missed cherries harder to compress?** Reading 7 of the replay: score the cherries that missed against the punnet's average ([[#plan-hot-cache-replay/readings]]). It needs the trace and the compressed orchard of the same LLM, which item 3 provides.

A size ladder of Qwen 2.5 (0.5B, 1.5B, 3B, and 7B if it fits) on the same five texts would turn "a 1.5B LLM is not a frontier LLM" from a caveat into a trend ([[#picks-carrying-numbers/inside-and-outside]]).

::: takeaway
- First: a GPU decoder for a solo code at 500 GB/s or more. Then solo on keys and on MLA latents.
- Then Qwen3.5-2B to 225K, which turns the Pin's $\vfD$ into an interpolation and enables reading 7.
:::

## Caveats that travel with every number {#caveats}

1. Exact attention stands in for a trained indexer, and it churns 1.2–1.5 times more than GLM-5.1's.
2. One LLM of 1.5B parameters, dense, with 2 KV heads, at 24.5K–30K tokens. $\vfD$ at the Pin is a 4.4× extrapolation in context.
3. Prefill queries stand in for decode queries; decode-like steps are 1–9 % worse.
4. Squeezed rows are squeezed scores, not V4's learned compression.
5. The napkin's $\vrho$ and $\vw$ are the campaigns' values for Qwen3.5-2B, measured at stretches of 4096, assumed to keep their dictionary share at 1024 and assumed for the Pin's 640-byte latents. Its rig (30 ms per step, 30 GB for orchards) is the Pin's.
6. Five sequences of one genre, coding-agent transcripts.

::: aside source Receipts
bachelor-kv at commit 8f5a471: `docs/results.md` §5 (what it means for the project; the open questions in order), §6 (caveats); `docs/next-steps.md` §1 (Qwen3.5-2B: why, the two text sets, the cost of ≈ 8 GB per 225K-token sequence) and §2 (the size ladder); `docs/design.md` §7. The proposal to count a dictionary byte as GPU memory is results.md §5, second bullet.
:::

::: takeaway
- Every number of this Part carries: a stand-in indexer, one 1.5B LLM, short contexts, prefill queries, squeezed scores, the campaigns' ratios, one genre of text.
:::
