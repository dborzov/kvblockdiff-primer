---
title: The one-page summary
nav: Summary (TL;DR)
group: Summary
lede: The whole site on one page in its own words. The problem in five sentences, the application, every hypothesis with its verdict and its number, the economics without flinching, and the plan. Every line links to the page that works it out.
cards:
  - q: In one sentence, what is the compression scenario?
    a: A sender holds one sequence's orchard; a receiver asks for one cherry at a time, at random, and must rebuild it bit for bit from that cherry's delta plus a dictionary it held in advance
    wrong: ["Compress a whole orchard with zstd and ship it once", "Quantize the orchard to fewer bits per element", "Keep the most-used picks in a bigger hot cache"]
    why: One ask at a time, at random, decoded cold. Everything else (the leash, the score, the punnet) follows from that access pattern.
    sec: problem
  - q: What does kvblockdiff change in HiSparse, and what does it leave alone?
    a: It serves a hot-cache miss as a delta against a dictionary kept on the GPU; hits, evictions and the LLM's outputs are untouched
    wrong: ["It replaces the indexer with a cheaper one", "It drops the least-used tokens from the orchard", "It retrains the LLM to need fewer KV layers"]
    why: The δ-miss moves fewer bytes over the link and the GPU rebuilds the pick exactly. Lossless and invisible to the LLM.
    sec: application
  - q: Which hypothesis turned out to be the strongest structure the campaigns measured?
    a: Stereo similarity; the two KV heads of a layer share about 0.85 bit per element though their cosine is near zero
    wrong: ["Fallen-apple similarity, cheaper the closer the neighbour", "Upstairs similarity across adjacent layers", "The Lucky Louis property"]
    why: Joining the two heads into one cherry saved 0.032 of ratio on 20 of 20 sequences. Distance lost; repeats and the head axis won.
    sec: verdicts
  - q: On the Pin, why must a tree compressor's dictionary sit on the GPU rather than be loaded per miss?
    a: One cold decode reads about 120 cherries' worth of dictionary; cheap from GPU memory, ruinous over the link for one miss
    wrong: ["Because its deltas are all empty", "Because the link is faster than GPU memory", "Because the dictionary is only 2 % of the punnet"]
    why: Half the punnet sits in the dictionary as reference cherries. Resident, it is lever 2, a compressed orchard on the GPU, and GPU memory is what the Pin runs out of first.
    sec: economics
  - q: Which three measurements come first in the plan, in order of how fast they return a result?
    a: More scenarios in the harness; queries and a stand-in indexer for the dump we have; a replay of the hot cache
    wrong: ["A GPU decoder, then a paper, then a product", "Retrain Qwen3.5-2B, then dump GLM-5.1", "A new harness, then new text, then keys"]
    why: Each uses the data that exists today. The replay is what turns the assumed δ-miss fraction and load rate into measured ones.
    sec: plan
---

Parts I to X build one idea from a story about tiny files; Part VIII reports what two research [[campaign|campaigns]] measured when the idea met real data. This page is the short version, in the site's vocabulary. Every claim has a number, and every number has a page.

## The problem, in five sentences {#problem}

A **sender** holds the [[orchard]] of one [[sequence]], `v.shape == (225_000, 6, 2, 256)` on [[bench|the Bench]], and a **receiver** asks for one [[cherry]] at a time, at random positions, in an order nobody can predict ([[#scenario-one-cherry-at-a-time]]). Before any ask, the receiver may hold one [[dictionary]] per [[punnet]], the set of all cherries of one [[stretch]] under one [[slice]] and one [[cherry-shape|cherry shape]] ([[#scenario-punnet]]). Each ask is answered with a [[delta]], and the cherry must come back bit for bit, decoded cold: `decompress(deltas[i], dictionary) == punnet[i]` ([[#scenario-the-contract]]). The score is the [[mdl-ratio|MDL ratio]], dictionary bytes plus delta bytes over the punnet's raw bytes, so a dictionary is never free ([[#scenario-the-score]]). The [[leash]] caps the dictionary bytes one cold decode may touch, 137 cherries' worth in the baseline scenario, so that stream compression of the whole punnet cannot win by hiding in the dictionary ([[#scenario-the-leash]]).

A [[scenario]] is one full specification, `Scenario(slice, cherry_shape, stretch_len, leash, fmt, llm, corpus)`, and a [[compressor]] is one attempt at it. The [[harness]] is the referee that charges every byte, checks every cherry in a fresh process and pairs scores on the same punnets ([[#scenario-the-harness]]).

::: takeaway
- One cherry at a time, at random, decoded cold, with a dictionary held in advance; the score charges the dictionary; the leash keeps stream compression out.
- Scenario = the problem; compressor = one attempt; harness = the referee.
:::

## The application {#application}

[[hisparse|HiSparse]] keeps each sequence's orchard in host memory and a [[hot-cache|hot cache]] of raw [[pick|picks]] per layer on the GPU; every miss moves one raw pick over the [[link]], 640 B on [[pin|the Pin]] ([[#landscape-hisparse]]). [[kvblockdiff]] maps the scenario onto that system: a pick is one or more cherries, a stretch's dictionary lives on the [[dictionary-shelf|dictionary shelf]], and a miss whose stretch is [[on-fire|on fire]] is a [[delta-miss|δ-miss]] that moves $\vrho\,\ve$ bytes instead of $\ve$ ([[#app-mapping]], [[#app-shelf-and-two-misses]]). Hits, evictions and the LLM's outputs do not change.

Two [[lever|levers]] decide whether it pays: cheaper misses raise what the link can feed; cheaper hot-cache slots raise what GPU memory can hold; the smaller of the two is the number of sequences per GPU ([[#app-two-levers]]). Which scenario an application needs depends on how its indexer picks: DeepSeek-V4's per-layer picks map to one-layer cherries, GLM-5.1's shared selection to multi-layer cherries or a dictionary shared across layers ([[#app-which-application]]).

::: takeaway
- A δ-miss moves a delta; the dictionary waits on the shelf; nothing the LLM sees changes.
- Sequences per GPU = min(what the link can feed, what GPU memory can hold); the two levers move one each.
:::

## The hypotheses and their verdicts {#verdicts}

Every number below is on values of Qwen3.5-2B in FP8, stretches of 4096 tokens, unless the row says otherwise ([[#measured-rules-of-the-game]]). The floor every dictionary must beat is [[solo]] coding, 0.778 ([[#toolbox-solo]]).

| hypothesis | verdict | the number |
|---|---|---|
| [[stereo]] (head axis) | **the strongest structure measured** | the same `elem_id` in the two heads has cosine ≈ 0.05, yet joining the heads into one `v[t, l, :, :]` cherry saves 0.032 of ratio on 20 of 20 sequences; a bound puts the shared information at 0.85 bit per element ([[#hypotheses-stereo]], [[#measured-cutting-the-tensor]]) |
| [[echo]] (repeats) | **the axis that mattered** | the nearest cherry in a punnet is the same token again 55–78 % of the time at KV layer 0; reference trees live on these; shuffling tokens across sequences worsens the tree compressor from 0.691 to 0.752 ([[#hypotheses-echo]], [[#measured-two-kinds-of-structure]]) |
| [[fallen-apple]] (token axis) | **weak, except in the middle layers** | the adjacent token shares 0.058 bit per element at KV layer 0, 0.31 at KV layers 1 and 2; parents within 8 tokens 37–47 % in the middle layers, 7–12 % at the outer ones; joining adjacent tokens into one cherry *costs* +0.037 (two) and +0.063 (four) ([[#hypotheses-fallen-apple]]) |
| [[upstairs]] (layer axis) | **small, and by kind of layer** | joining all six layers saves a further 0.004; given everything else, adjacent layers share 0.03–0.08 bit; layers group by kind, not nearness ([[#hypotheses-upstairs]]) |
| [[lucky-louis]] | established for picks; per stretch, measured on a stand-in LLM | HiSparse: 13.4 % misses at 4096 slots, twice the top-$\vk$. On Qwen 2.5 1.5B, misses pile into [[heavy-stretch\|heavy stretches]] 3–5× above chance but spread as the context grows ([[#hypotheses-heavy-stretches]], [[#picks-heavy-stretches]]) |
| [[leak]], [[trap]] | stand | hit rate is about queries, not bytes; 75 % of variance buys one bit ([[#hypotheses-the-leak]], [[#hypotheses-the-trap]]) |
| keys apart from values | keys compress like values | pre-RoPE keys at KV layer 0, head 0: 0.660 against 0.673 for values ([[#hypotheses-keys-and-values]]) |

The headline: the best stretch-scope compressor on `v[t, l, :, :]` cherries scores **0.636** (dictionary share 0.525, delta share 0.112, worst cold decode 226 cherries' worth of reads), the light no-tree compressor **0.686** with a dictionary of 0.021, and bigger stretches always won: 0.689, 0.636, 0.618 at 512, 4096, 16 384 tokens, no ceiling in sight ([[#measured-scorecard]], [[#measured-reading-one-cherry]]). The dictionary share does not measure sharing; what is shared inside a punnet is about a fifth of the bits ([[#measured-what-the-half-means]]).

::: theme which-vs-what
That the indexer keeps wanting the same picks says nothing about whether their bytes are alike. The campaigns measured the second thing and found it true for reasons the proposal had not named: repeats of the same token, and a geometry fixed by the LLM's weights.
:::

::: takeaway
- Stereo strongest, echo the axis that mattered, fallen-apple weak outside the middle layers, upstairs small.
- Solo 0.778; best 0.636 at 4096 tokens; light 0.686; stretch length keeps paying.
:::

## The economics, honestly {#economics}

::: note warning What the numbers say on the Pin
HiSparse serves about **109 sequences per GPU** at $\vB = 4096$ slots, bound by the link; GPU memory would hold 147 ([[#landscape-derived-numbers]]).

- **The light compressor** ($\vrho \approx 0.69$, dictionary 2 % of the punnet) is the proposal's own picture. Fit once per sequence, lever 1 alone buys about $\sqrt{1/\vrho} \approx 1.2\times$ at each system's best cache size. Kept per stretch with every dictionary resident, it serves *fewer* sequences than HiSparse, about 0.88×, bound by memory ([[#measured-what-it-means]], [[#app-calculator]]).
- **The tree compressor** ($\vrho = 0.112$, dictionary 0.525) keeps half the punnet on the GPU as reference cherries; a cold decode reads about 120 cherries' worth, so the dictionary must be resident. Stacked on the hot cache it loses: 47 sequences with four stretches on fire per layer, 96 with one. As lever 2, the dictionary standing in for its stretch's slots, about **120, or 1.1×**, with one stretch on fire, an assumed δ-miss share of 0.3 and one load per 100 steps ([[#app-the-napkin]]).
- **In dollars:** at an assumed USD 3 per GPU-hour, HiSparse costs about USD 0.23 per million output tokens; 138 sequences would cost 0.18; the ratio, 0.79, holds at any price ([[#app-bits-to-dollars]]).

Every ratio here is entropy-coded; the [[fixed-length-rate|fixed-length rate]] a GPU decoder would want was never measured, and the gap is about one bit per element ([[#toolbox-two-rates]]). The δ-miss share $\vfD$, the load rate $\vnload$ and how long a stretch stays on fire are assumed in the bullets above. And the ratios come from 512-byte value cherries of a 2B-parameter LLM, carried to the 640-byte MLA latents of GLM-5.1 ([[#landscape-rope-and-mla]]).
:::

**The pick traces, measured on 2026-11-03** ([[#picks-dispatch]]). Exact top-$\vk$ attention of Qwen 2.5 1.5B over five coding-agent sequences stood in for the indexer, and HiSparse's hot cache and a dictionary shelf were replayed on its picks. At the Pin's share of the context the stand-in misses 35 / 19 / 9.7 % with 1, 2 and 4 slots per pick, against HiSparse's 30 / 13.4 / 6.7 %. Misses pile into stretches above chance (a shelf catches 3–5× what an even spread gives), but spread as the context grows: at the Pin's 100K, extrapolated, four dictionaries of 4096 positions catch 36–54 % of the misses, not 0.85. With every design at its best hot-cache size, HiSparse resized to about 4740 slots serves 127 sequences per GPU, light dictionaries on a shelf 127–133, tree dictionaries on a shelf 88–108, and a solo code on every miss, with no bytes per sequence on the GPU, 141, if a GPU decodes it at 500 GB/s or more ([[#picks-slot-price]]). Longer stretches make every dictionary shelf worse, because a dictionary on the GPU is resident memory ([[#picks-bytes-side]]). And by the half-gain rule no code of the miss path can add more than about +31 % at the Pin: 166 sequences per GPU at the extrapolated floor of 0.57 ([[#picks-ceiling]]).

So the project pays only if the memory lever is built, and only in the band where the heavy dictionary replaces the slots it duplicates. The light compressor is worth it if it comes almost for free. Both statements rested on assumed traffic; the replay above replaced it with measured counts, and with them the best design measured keeps no dictionary per sequence.

::: takeaway
- Lever 1 alone: about 1.2× at best, before the fixed-length penalty. Lever 2 with the tree compressor: about 1.1× on the Pin, more where GPU memory is cheap relative to link bytes.
- Assumed, not measured: the δ-miss share, the load rate, the fixed-length rate, the transfer to GLM-5.1.
:::

## The plan {#plan}

In order of how fast each returns a result, using the data that exists ([[#plan-where-we-stand]], [[#plan-principles]]).

1. **More scenarios in the harness** ([[#plan-next-in-the-harness]]): keys under a leash; K+V cherries; stereo across layers; sequence-scope dictionaries; the leash at 137 against 293; the [[bit-field-split|bit-field split]] as a stage; prose text; a GPU-speed test of the frontier compressor.
2. **Queries and a stand-in indexer** ([[#plan-queries-and-picks]]): compute `q` for the Bench's dump in one pass of the LLM, run exact top-$\vk$ attention as the indexer, and record a pick trace per sequence. This is what the Bench lacks ([[#plan-the-dataset-we-have]]).
3. **Replay the hot cache** ([[#plan-hot-cache-replay]]): miss rates, where misses land, stretch [[popularity]], the on-fire simulation, $\vfD$ and $\vnload$ measured instead of assumed, with shuffled traces as the control.
4. **How fast must the decoder be** ([[#plan-decoder-speed]]): the 10× rule and a GPU decode of the frontier compressor; then a sparse-attention LLM with a real indexer and a victim-tier replay ([[#plan-other-experiments]]).

The readings and the next step for each outcome are written before the data ([[#plan-decision-rules]]); the weak spots are listed ([[#plan-risks]]).

::: keycard Next action
Compute the queries for the dump, run the stand-in indexer, replay the hot cache with the measured 0.686 and 0.636 points, and read $\vfD$, $\vnload$ and the lifetime of a stretch on fire. Those three numbers turn the napkin above into a measurement.
:::

::: aside source Receipts
Headline ratios: `docs/project/scenario.md` §9 and `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1.3, §1.5, §1.7, §1.9 (solo 0.778; 121 at 0.63639, dictionary share 0.5247, delta share 0.1116, worst reads 226, env-t0096; 129 at 0.6863, r25-t0003; stretch lengths env-t0010 / env-t0096 / env-t0097). Heads, layers, adjacent tokens: spec §1.6 (20 sequences, same window; r12-t0004 for tok2/tok4). Cosine 0.05, distances 0.92, 0.85 bit: spec §1.6 (r7 iter-1-1, r9 iter-1-2). Same token 55–78 %, MI 0.058 / 0.31, parents within 8 tokens: spec §1.4 and §1.8. Shuffle 0.6907 → 0.7520: spec §1.5 (r12 iter-1-2). Keys 0.660 vs 0.673: spec §1.4. Adjacent layers 0.03–0.08 bit, regime vs triple: spec §1.6 and §1.10. HiSparse miss rates and the Pin: `data/settings.yaml`, HiSparse §4.3. Economics: the old pages XII.5 (the napkin: 47 / 96 / 120), XI.13 (1.2×, 0.88×), XII.6 (USD 0.23 / 0.18), all computed with the site's `econ()` on the Pin; 109 is 1.5 GB ÷ 13.7 MB, 147 is 30 GB ÷ 205 MB.
:::

::: takeaway
- Harness scenarios first, then queries and a stand-in indexer, then the hot-cache replay; the decoder's speed after that.
- Either outcome of the replay is a result: it decides whether lever 2 is worth building.
:::
