---
title: What it means for kv-blockdiff
nav: What it means
group: What it means
lede: 'The plan ended with a rule and a next action. This page applies the rule to the measured numbers without flinching, redraws the miss path with the two kinds of coder the campaign actually produced, feeds a measured delta ratio into the site''s own economics, and replaces the plan''s next action with a new one.'
cards:
  - q: 'Applied to the measurements, what does the decision rule of IX.9 say?'
    a: 'Go, since the gain over solo is about 1.1–1.3 bits per element, far above the 0.75-bit line; but at request scope, because bigger blocks always won and the block-scope gain the project bet on is negative in the primer''s sense'
    wrong: ["No go, the gain is under 0.25 bit", "Go at block scope, as hoped", "The rule cannot be applied at all"]
    why: 'The rule''s second row (large total, small block gain) is the one that fires. The whole sequence is the best scope found.'
    sec: the-decision-rule
  - q: Why does the two-rates gap of VI.10 still have to be paid or avoided?
    a: Every coder in the campaigns is an entropy coder (rANS); the fixed-length rate the primer wanted for the miss path was never measured
    wrong: ["Because the deltas were measured in bf16", "Because the gap was measured at zero", "Because the campaign used INT8"]
    why: For Laplace-shaped residuals at 5–7 bits the fixed-length rate runs about one bit above the entropy rate. Whether these residuals behave the same is unmeasured.
    sec: the-decision-rule
  - q: 'Feed the light no-tree coder''s delta ratio, about 0.69, into the square-root rule of VIII.8. What does lever 1 alone buy at each system''s best cache size?'
    a: About 1.2×, in the "worth it only if it comes almost for free" band
    wrong: ["About 1.45×, the full 1/ρ", "About 2×", "Nothing, since ρ is above 0.5"]
    why: 'The square root of 1/0.69 is about 1.2. The assumed 0.75 gave 1.11×; the measured ratio moves it by a tenth, and an entropy-coded ratio is optimistic for a fixed-length store.'
    sec: the-miss-path
  - q: Why must a tree coder's dictionary be resident on the GPU?
    a: 'A cold decode of one entry reads about 100–300 entries'' worth of dictionary; in GPU memory that is nothing, over the link it would be ruinous for a single miss'
    wrong: ["Because its dictionary is tiny", "Because all its deltas are empty", "Because the link is faster than GPU memory"]
    why: Half the block sits in the dictionary as the entries themselves. That is a compressed history on the GPU, lever 2 territory, rather than a light dictionary loaded once.
    sec: the-miss-path
  - q: What single measurement did the campaign's supervisor most want repeated, and why does the next campaign start there?
    a: The memory table, on many windows; if it holds, it settles what any block-scope coder can ever reach
    wrong: ["The 50-million-byte replay", "The shuffle test", "The read-budget recount"]
    why: It rests on one 2048-token window of one sequence. The whole reading of "the wall" depends on it.
    sec: next
---

The plan's last page ended with a keycard: open the dumps, pass the four controls, run experiment 1a, read three numbers. The campaigns ran their own [[harness]] instead of the plan's, measured values only, used entropy coders throughout, and read a great many numbers. This page holds those numbers against the plan's own rule, then against the plan's own economics.

## The decision rule, applied {#the-decision-rule}

::: aside reminder The rule (IX.9)
Inputs: $\vgainreq$ and $\vgainblk$ of the best cheap dictionary type, on the fixed-length rate, with each gain's shuffled value subtracted. Total ≥ 0.75 bit and $\vgainblk \ge 0.4$ → wave 2 at block scope. Total ≥ 0.75 and $\vgainblk < 0.15$ → wave 2 at request scope. 0.25–0.75 → marginal, run framework C. Below 0.25 everywhere → publish the negative.
:::

**The total.** The solo ideal for six layers is 0.778, or 6.22 bits per element. The best verified coder reads 0.636 at 4k on the two-sequence screen, 0.630 on five sequences, and 0.618 at 16k. That is a gain over solo of about 1.1 to 1.3 bits per element, on values, with every dictionary byte charged and every entry decoded alone within its [[read-budget]]. The rule's line was 0.75 bit. By the total, the rule says go.

**The split.** The data inverted the rule's picture. The primer defined $\vgainblk$ as what per-block dictionaries save on top of a per-request one, and called it "the number this project bets on" ([[#homework-scope]]). The campaign found no block small enough to be the best one: 0.689, 0.636 and 0.618 at 512, 4k and 16k on layer entries, the tree still gaining 0.010–0.020 per doubling from 16k to 32k, and a bound putting a whole-sequence pool 0.26–0.45 bit below a 16k pool ([[#measured-reading-one-entry]]). The best "block" is the whole sequence. In the primer's sense $\vgainblk$ is negative and $\vgainreq$ carries all of the gain, so the row that fires is the second one: wave 2 at request scope, the "requestdiff" of [[#plan-decision-rule]], a simpler system.

**What the rule asked for and never got.** The **fixed-length rate**, the delta a miss would actually move: every coder in both campaigns is an entropy coder with [[rans|rANS]] streams per entry, and none was measured. For Laplace-shaped residuals at 5–7 bits the gap is about one bit per element ([[#homework-two-rates]]); whether these residuals behave the same way is unknown, and that bit still has to be paid, or avoided by a decoder that reads entropy-coded deltas at gather speed. And each gain **net of its shuffled value**: the campaign's [[shuffle-control|shuffle]] rebuilt blocks from tokens drawn at random across a sequence, and the tree coder worsened from 0.6907 to 0.7520 while the linear-prediction gain barely moved (−0.0337 to −0.0344). The repeats gain is real and local, as the plan's control demands; the prediction gain survives because it belongs to the weights and to no neighbour, a case the plan's "subtract what survives" rule did not foresee ([[#measured-two-kinds-of-structure]]).

::: takeaway
- Total gain over solo about 1.1–1.3 bits per element, against a go line of 0.75: go.
- Bigger blocks always won: the block-scope gain the project bet on is negative in the primer's sense, the request-scope gain carries everything, and the rule's request-scope row fires.
- The fixed-length rate was never measured, so the two-rates gap of about one bit is still owed. The shuffle control held.
:::

## The miss path, redrawn {#the-miss-path}

What would a hot-cache miss move? The campaign produced two kinds of coder, and they draw two different pictures.

**The light coder.** Coder 129 has no tree. Its dictionary (a mean and a width per channel, four entry classes, a linear-prediction table) is 0.02–0.04 of the block, and every entry carries a delta of about 0.66–0.69 of a raw entry (layer entries 0.6863, token entries 0.6622). This is the proposal's own picture, a light dictionary loaded once and every miss a delta, with $\vrho \approx 0.69$ where the primer assumed 0.75. Fed to the site's economics ([[#homework-calculator]], [[#questions-framework-d]]), the answer depends on where that dictionary lives. Kept per block, 2 % of a 4,096-token block is about 82 entries' worth, and twenty-five of them resident per request eat half a hot cache: by the site's model the light coder then serves *fewer* requests than HiSparse, about 0.88×, bound by GPU memory. Fitted once per request instead, which the rule's 91–96 % carry-over between sequences says it could be ([[#measured-two-kinds-of-structure]]), lever 1 alone buys about $\sqrt{1/\vrho} \approx 1.2\times$ at each system's best cache size, against 1.11× for the assumed 0.75. Either way this is the "worth it only if it comes almost for free" band, and this $\vrho$ is entropy-coded, so a fixed-length store would do worse.

**The tree coder.** Coder 102 and its descendants keep about half the block in the dictionary (a share of 0.43–0.54), as the entries themselves, laid out along the paths of the [[reference-tree]]. About 80 % of the deltas are empty, because the entry sits in the dictionary; the rest are 0.5–0.75 of a raw entry. A cold decode of one entry reads about 100–300 entries' worth of dictionary (means of 68–159 across screens, worst entries 132–257). From GPU memory, that is nothing; over the link, one miss would cost a hundred raw entries. So a tree coder's dictionary must be resident: half of every request's history, compressed, on the GPU. That is the primer's lever 2 ([[#idea-two-levers]]), a compressed history with the [[victim-tier]] as its first form ([[#missed-victim-tier]]), and no longer lever 1. The read budget says the random access is cheap in bytes; nobody has measured a GPU decoder for it.

::: theme access-pattern
A path-laid tree coder reads a hundred entries' worth per entry, which a GPU can afford and a link cannot. The light coder reads a small dictionary once and then one delta per miss, the shape the link wants, at a smaller gain.
:::

The honest statement is short. Deployment was out of the campaign's scope by the human's ruling; the [[delta-miss-fraction|δ-miss fraction]] $\vfD$, the load rate $\vnload$ and the residency of blocks were never measured, so [[#questions-framework-c]] is still open and [[#plan-wave2-measure]] is still the way to close it. One worry did go away. In C1, pre-RoPE keys compressed like values at the same depth with the same coder family (at 4k on head 0, 0.660 against 0.673 at layer 3, 0.692 against 0.712 at layer 7), so the byte-weighted entry of [[#plan-data]] is fine. C2 never touched keys.

::: figure fig-msr-economics msrEconomics wide
**Requests per GPU with measured delta ratios.** The site's two budgets ([[#homework-economics]]), bytes over the link per step and GPU memory per request, in the [[reference-setting]], each design at its own best hot-cache size. Rows: [[hisparse|HiSparse]] ($\vrho = 1$); solo ideal ($\vrho = 0.78$); the light no-tree coder ($\vrho \approx 0.69$ on layer entries, dictionary share 0.02, all dictionaries resident); the tree coder as a compressed history (dictionary share 0.52 resident, deltas 0.11 of raw on average); the exact-model request-scope floor (0.60, hypothetical). Readouts give the link-bound and memory-bound request counts and their minimum. **Measured inputs:** the delta ratios and dictionary shares, from the campaign's ledgers, entropy-coded. **Assumed inputs:** $\vfD$, $\vnload$, the miss-rate curve and every number of the reference setting; no fixed-length rate exists for any of these coders.
:::

::: takeaway
- The light coder is the proposal's picture with $\vrho \approx 0.69$: as a per-request dictionary, lever 1 alone about 1.2×; kept per block and all resident, below HiSparse. The "only if nearly free" band either way, before the fixed-length penalty.
- The tree coder's dictionary is half the block and must be resident: lever 2, a compressed history on the GPU, where the prize always was.
- $\vfD$, $\vnload$ and residency were not measured; framework C is open. Keys compress like values.
:::

## Next {#next}

What a next campaign should do, from the supervisor's list and from what the primer still needs.

1. **Repeat the memory table** on many windows and on target 02 ([[#measured-where-the-bits-come-from]]); if it holds, it settles what any block-scope coder can reach.
2. **Run the top coders on full tracks** of target 02, and use the holdout once.
3. **Give token entries the refinements layer entries got**; they win on the same bytes.
4. **Build the independent training dataset, then let a [[shared-table]] in**, starting with the weights-only rule (0.6407 → 0.6326 at 4k, exact model).
5. **Push blocks past 32k and to whole sequences**, and measure the whole-sequence pool.
6. **Tune a coder for its worst entry**; the 137-entry budget on layer entries costs 0.0234 today.
7. **Another kind of text**; everything so far is coding-agent transcripts.
8. **Keys in C2's setting**, both heads and six layers under a read budget.
9. **For the store:** a fixed-length or GPU-decodable variant of the light coder, to measure the two-rates gap on real residuals, and the miss-path replay of wave 2, for $\vfD$ and $\vnload$.

::: keycard Next action
$$
\underbrace{0.618}_{\text{best verified, 16k}} \;\to\; \underbrace{\approx 0.60}_{\text{block floor, one window}} \;\to\; \underbrace{?}_{\text{whole sequence, shared table}}
$$
Repeat the memory table on many windows, run the full tracks and the holdout, then build the independent dataset and let a shared table in; for the store, measure a fixed-length delta and replay the miss path before any more coder work.
:::

::: aside source Receipts
Solo 0.778 and the C2 ladder: spec §1.3 and §1.5 (r1-t0005; env-t0096 0.63639 and, on five sequences, 0.62970; env-t0097 0.61768). Block sizes and the whole-sequence pool: §1.9 (env-t0010, env-t0096, env-t0097; r19 iter-1-1 and iter-1-2). Shuffle: §1.5 (r12 iter-1-2, iter-1-3). Coder 129: §1.7 (r25-t0003, r25-t0004); tree-coder dictionary shares, empty deltas and reads: §1.9 and the every-entry table (env-t0009…t0013, t0088…t0097). Weights rule: §1.10 (r23 iter-1-2). Keys: §1.4 (C1, 4k, head 0). Floors: §1.10. The square-root rule and the 147 cap are the site's own ([[#questions-framework-d]], [[#homework-calculator]]), fed with the measured $\vrho$; the next-campaign list is the campaign's article 09 plus the primer's open items. Deployment ruling: `docs/concepts/what-the-human-clarified.md`.
:::

::: takeaway
- First the one-window memory table; then full tracks, the holdout, token entries, a training dataset and a shared table, bigger blocks, worst-entry tuning, another text, keys.
- For kv-blockdiff: a fixed-length or GPU-decodable delta and the miss-path replay, the two measurements the primer asked for and the campaign did not make.
:::
