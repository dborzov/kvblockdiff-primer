---
title: What it means for kvblockdiff
nav: What it means
group: What it means
lede: 'The scenario was varied as a probe; here the readings are mapped onto the application. This page holds the measured numbers against the gain the project needs, redraws the miss path with the two kinds of compressor the campaign actually produced, feeds a measured delta share into the site''s own economics, and ends with what to measure next.'
cards:
  - q: 'What do the measurements say about the gain the project needs?'
    a: 'Go, since the gain over solo is about 1.1–1.3 bits per element, far above a 0.75-bit line; but at sequence scope, because longer stretches always won and the stretch-scope gain the project bet on is negative in the old sense'
    wrong: ["No go, the gain is under 0.25 bit", "Go at stretch scope, as hoped", "The rule cannot be applied at all"]
    why: 'The whole sequence is the best scope found. The gain is real; where to fit the dictionary is the part the data changed.'
    sec: the-gain
  - q: Why does the two-rates gap of V.11 still have to be paid or avoided?
    a: Every compressor in the campaigns uses an entropy coder (rANS); the fixed-length rate the application wants for the miss path was never measured
    wrong: ["Because the deltas were measured in BF16", "Because the gap was measured at zero", "Because the campaign used INT8"]
    why: For Laplace-shaped residuals at 5–7 bits the fixed-length rate runs about one bit above the entropy rate. Whether these residuals behave the same is unmeasured.
    sec: the-gain
  - q: 'Feed the light no-tree compressor''s delta share, about 0.69, into the square-root rule of the application. What does lever 1 alone buy at each system''s best hot-cache size?'
    a: About 1.2×, in the "worth it only if it comes almost for free" band
    wrong: ["About 1.45×, the full 1/ρ", "About 2×", "Nothing, since ρ is above 0.5"]
    why: 'The square root of 1/0.69 is about 1.2. The assumed 0.75 gave 1.11×; the measured share moves it by a tenth, and an entropy-coded share is optimistic for a fixed-length store.'
    sec: the-miss-path
  - q: Why must a tree compressor's dictionary be resident on the GPU?
    a: 'A cold decode of one cherry reads about 100–300 cherries'' worth of dictionary; in GPU memory that is nothing, over the link it would be ruinous for a single miss'
    wrong: ["Because its dictionary is tiny", "Because all its deltas are empty", "Because the link is faster than GPU memory"]
    why: Half the punnet sits in the dictionary as the cherries themselves. That is a compressed orchard on the GPU, lever 2 territory, rather than a light dictionary loaded once.
    sec: the-miss-path
  - q: What single measurement did the campaign's supervisor most want repeated, and why does the next campaign start there?
    a: The memory table, on many windows; if it holds, it settles what any stretch-scope compressor can ever reach
    wrong: ["The 50-million-byte replay", "The shuffle test", "The leash recount"]
    why: It rests on one 2048-token window of one sequence. The whole reading of "the wall" depends on it.
    sec: next
---

[[#scenario-why-vary]] gives the scenario two purposes: a probe of the orchard, and a map of applications. The pages before this one are the probe. This page is the map: the campaigns' numbers held against the gain [[kvblockdiff]] needs, then against the site's own economics ([[#app-the-napkin]]).

## The gain, applied {#the-gain}

::: aside reminder The two gains (IV.9)
[[#scenario-scope]] names two gains in bits per element over solo: $\vgainseq$, what a dictionary fit on the whole sequence saves, and $\vgainstr$, what per-stretch dictionaries save on top of it. The first draft of the project bet on the second, and set a line of 0.75 bit on their sum, net of what survives the shuffle.
:::

**The total.** The solo ideal for six KV layers is 0.778, or 6.22 bits per element. The best verified compressor reads 0.636 at a stretch of 4096 on the two-sequence screen, 0.630 on five sequences, and 0.618 at 16 384. That is a gain over solo of about 1.1 to 1.3 bits per element, on values, with every dictionary byte charged and every cherry decoded alone within its [[leash]]. The line was 0.75 bit. By the total, go.

**The split.** The data inverted the picture. The campaign found no stretch short enough to be the best one: 0.689, 0.636 and 0.618 at 512, 4096 and 16 384 on `v[t, l, :, :]` cherries, the tree still gaining 0.010–0.020 per doubling from 16 384 to 32 768, and a bound putting a whole-sequence punnet 0.26–0.45 bit below a 16 384 one ([[#measured-reading-one-cherry]]). The best "stretch" is the whole sequence. In the old sense $\vgainstr$ is negative and $\vgainseq$ carries all of the gain: a dictionary per sequence, [[scope-sequence|sequence scope]], a simpler system than one with a dictionary per stretch.

**What the application asked for and never got.** The **fixed-length rate**, the delta a miss would actually move: every compressor in both campaigns uses an [[entropy-coder|entropy coder]] with [[rans|rANS]] streams per cherry, and none was measured at the [[fixed-length-rate]]. For Laplace-shaped residuals at 5–7 bits the gap is about one bit per element ([[#toolbox-two-rates]]); whether these residuals behave the same way is unknown, and that bit still has to be paid, or avoided by a decoder that reads entropy-coded deltas at gather speed ([[#plan-decoder-speed]]). And each gain **net of its shuffled value**: the campaign's [[shuffle-control|shuffle]] rebuilt punnets from tokens drawn at random across a sequence, and the tree compressor worsened from 0.6907 to 0.7520 while the linear-prediction gain barely moved (−0.0337 to −0.0344). The repeats gain is real and local, as the control demands; the prediction gain survives because it belongs to the weights and to no neighbour, a case the "subtract what survives" rule did not foresee ([[#measured-two-kinds-of-structure]]).

::: takeaway
- Total gain over solo about 1.1–1.3 bits per element, against a line of 0.75: go.
- Longer stretches always won: the stretch-scope gain the project bet on is negative in the old sense, the sequence-scope gain carries everything.
- The fixed-length rate was never measured, so the two-rates gap of about one bit is still owed. The shuffle control held.
:::

## The miss path, redrawn {#the-miss-path}

What would a [[hot-cache|hot-cache]] miss move? The campaign produced two kinds of compressor, and they draw two different pictures of a [[delta-miss|δ-miss]] ([[#app-shelf-and-two-misses]]).

**The light compressor.** Compressor 129 has no tree. Its dictionary (a mean and a width per furrow, four cherry classes, a linear-prediction table) is 0.02–0.04 of the punnet, and every cherry carries a delta of about 0.66–0.69 of a raw cherry (`v[t, l, :, :]` cherries 0.6863, `v[t, :, :, :]` cherries 0.6622). This is the application's own picture ([[#app-sizes]]), a light dictionary loaded once and every miss a delta, with $\vrho \approx 0.69$ where the napkin assumed 0.75. Fed to the site's economics ([[#app-calculator]], [[#app-two-levers]]), the answer depends on where that dictionary lives. Kept per stretch, 2 % of a 4096-token punnet is about 82 cherries' worth, and twenty-five of them resident per sequence eat half a hot cache: by the site's arithmetic the light compressor then serves *fewer* sequences than HiSparse, about 0.88×, bound by GPU memory. Fitted once per sequence instead, which the rule's 91–96 % carry-over between sequences says it could be ([[#measured-two-kinds-of-structure]]), lever 1 alone buys about $\sqrt{1/\vrho} \approx 1.2\times$ at each system's best hot-cache size, against 1.11× for the assumed 0.75. Either way this is the "worth it only if it comes almost for free" band, and this $\vrho$ is entropy-coded, so a fixed-length store would do worse.

**The tree compressor.** Compressor 102 and its descendants keep about half the punnet in the dictionary (a share of 0.43–0.54), as the cherries themselves, laid out along the paths of the [[reference-tree]]. About 80 % of the deltas are empty, because the cherry sits in the dictionary; the rest are 0.5–0.75 of a raw cherry. A cold decode of one cherry reads about 100–300 cherries' worth of dictionary (means of 68–159 across screens, worst cherries 132–257). From GPU memory, that is nothing; over the link, one miss would cost a hundred raw cherries. So a tree compressor's dictionary must be resident: half of every sequence's orchard, compressed, on the GPU. That is lever 2 of [[#app-two-levers]], a compressed orchard with the [[victim-tier]] as its first form ([[#app-victim-tier]]), and no longer lever 1. The leash says the random access is cheap in bytes; nobody has measured a GPU decoder for it.

::: theme access-pattern
A path-laid tree compressor reads a hundred cherries' worth per cherry, which a GPU can afford and a link cannot. The light compressor reads a small dictionary once and then one delta per miss, the shape the link wants, at a smaller gain.
:::

The honest statement is short. Deployment was out of the campaign's scope by the human's ruling; the [[delta-miss-fraction|δ-miss fraction]] $\vfD$, the load rate $\vnload$ and the residency of stretches were never measured, so [[#plan-hot-cache-replay]] is still the way to close it. One worry did go away. In C1, pre-RoPE keys compressed like values at the same depth with the same compressor family (at a stretch of 4096 on head 0, 0.660 against 0.673 at KV layer 0, 0.692 against 0.712 at KV layer 1), so a cherry that holds keys and values together, as the Pin's does, is fine. C2 never touched keys.

::: figure fig-measured-economics msrEconomics wide
**Sequences per GPU with measured delta shares.** The site's two budgets ([[#app-the-napkin]]), bytes over the link per step and GPU memory per sequence, in the [[reference-setting]] selected, each design at its own best hot-cache size. Rows: [[hisparse|HiSparse]] ($\vrho = 1$); solo ideal ($\vrho = 0.78$); the light no-tree compressor ($\vrho \approx 0.69$ on `v[t, l, :, :]` cherries, dictionary share 0.02, all dictionaries resident); the tree compressor as a compressed orchard (dictionary share 0.52 resident, deltas 0.11 of raw on average); the code-length sequence-scope floor (0.60, hypothetical). Readouts give the link-bound and memory-bound sequence counts and their minimum. **Measured inputs:** the delta shares and dictionary shares, from the campaign's ledgers, entropy-coded. **Assumed inputs:** $\vfD$, $\vnload$, the miss-rate curve and every number of the reference setting; no fixed-length rate exists for any of these compressors.
:::

::: takeaway
- The light compressor is the application's picture with $\vrho \approx 0.69$: as a per-sequence dictionary, lever 1 alone about 1.2×; kept per stretch and all resident, below HiSparse. The "only if nearly free" band either way, before the fixed-length penalty.
- The tree compressor's dictionary is half the punnet and must be resident: lever 2, a compressed orchard on the GPU, where the prize always was.
- $\vfD$, $\vnload$ and residency were not measured. Keys compress like values.
:::

## Next {#next}

What a next campaign should do, from the supervisor's list and from what the site still needs; Part X turns this into scenarios ([[#plan-next-in-the-harness]]).

1. **Repeat the memory table** on many windows and on target 02 ([[#measured-where-the-bits-come-from]]); if it holds, it settles what any stretch-scope compressor can reach.
2. **Run the top compressors on full tracks** of target 02, and use the holdout once.
3. **Give `v[t, :, :, :]` cherries the refinements `v[t, l, :, :]` cherries got**; they win on the same bytes.
4. **Build the independent training dataset, then let a [[shared-table]] in**, starting with the weights-only rule (0.6407 → 0.6326 at a stretch of 4096, code-length estimate).
5. **Push stretches past 32 768 and to whole sequences**, and measure the whole-sequence punnet.
6. **Tune a compressor for its worst cherry**; the leash of 137 on `v[t, l, :, :]` cherries costs 0.0234 today.
7. **Another kind of text**; everything so far is coding-agent transcripts.
8. **Keys in C2's setting**, both heads and six KV layers under a leash.
9. **For the store:** a fixed-length or GPU-decodable variant of the light compressor, to measure the two-rates gap on real residuals, and the hot-cache replay, for $\vfD$ and $\vnload$ ([[#plan-hot-cache-replay]]).

::: keycard Next action
$$
\underbrace{0.618}_{\text{best verified, stretch 16 384}} \;\to\; \underbrace{\approx 0.60}_{\text{punnet floor, one window}} \;\to\; \underbrace{?}_{\text{whole sequence, shared table}}
$$
Repeat the memory table on many windows, run the full tracks and the holdout, then build the independent dataset and let a shared table in; for the store, measure a fixed-length delta and replay the hot cache before any more compressor work.
:::

::: aside source Receipts
Solo 0.778 and the C2 ladder: spec §1.3 and §1.5 (r1-t0005; env-t0096 0.63639 and, on five sequences, 0.62970; env-t0097 0.61768). Block sizes and the whole-sequence pool: §1.9 (env-t0010, env-t0096, env-t0097; r19 iter-1-1 and iter-1-2). Shuffle: §1.5 (r12 iter-1-2, iter-1-3). Coder 129: §1.7 (r25-t0003, r25-t0004); tree-coder dictionary shares, empty deltas and reads: §1.9 and the every-entry table (env-t0009…t0013, t0088…t0097). Weights rule: §1.10 (r23 iter-1-2). Keys: §1.4 (C1, 4k, head 0). Floors: §1.10. The square-root rule and the 147 cap are the site's own (Part VI), fed with the measured delta share; the next-campaign list is the campaign's article 09 plus the site's open items. Deployment ruling: `docs/concepts/what-the-human-clarified.md`.
:::

::: takeaway
- First the one-window memory table; then full tracks, the holdout, `v[t, :, :, :]` cherries, a training dataset and a shared table, longer stretches, worst-cherry tuning, another text, keys.
- For kvblockdiff: a fixed-length or GPU-decodable delta and the hot-cache replay, the two measurements the application asked for and the campaign did not make.
:::
