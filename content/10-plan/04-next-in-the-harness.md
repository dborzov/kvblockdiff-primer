---
title: Next in the harness
nav: Next in the harness
group: Next experiments
lede: Nine scenarios the harness can run as it stands, or one script away from it, ordered by hours to a first reading. Each one is a row of the catalogue of Part IV marked "not run", written on the six-line card of the principles page.
cards:
  - q: Which scenario comes first in the queue, and why?
    a: 'Keys, `K · all · cherry (2, 256) · stretch 4096 · leash 293`: the harness only needs to read `k` instead of `v`, and C1''s one-night keys result predicts the reading within 0.03'
    wrong: ["Sequence scope, because it promises the biggest gain", "A second LLM, because transfer is the biggest risk", "The GPU decode, because speed decides everything"]
    why: Speed first. Keys need no new data and almost no new code; the others need a corpus, a tree over 225K cherries, or a kernel.
    sec: queue
  - q: 'What would a `K+V · cherry (2, 2, 256)` score below the byte-weighted mean of the K-only and V-only scores mean?'
    a: That one token's keys and values share bits, a new axis of neighbour similarity, and that a pick should be coded as one cherry
    wrong: ["That the leash was exceeded", "That keys are harder than values", "That the dictionary share doubled"]
    why: The two halves alone are the control; any saving beyond their mean can only come from predicting one half from the other.
    sec: cards
  - q: Why is the whole-sequence scenario not simply run with the frontier compressor as it is?
    a: Its reference tree is built from pairwise distances, which grow with the square of the punnet size; 225K cherries is 3 000 times the work of 4096
    wrong: ["Because sequence scope is not a scenario", "Because the leash forbids it", "Because the harness cannot read a whole sequence"]
    why: At 55 CPU seconds per 4096-token punnet, a quadratic tree over a whole sequence is days; a nearest-neighbour index or a 32K-then-64K extrapolation is the cheap road.
    sec: cards
---

The catalogue on [[#scenario-why-vary/a-map]] ends with five rows marked "not run". Here they are, split into nine runnable scenarios and sorted by the only criterion of this Part: how soon a reading comes back. Every card names the hypothesis it reads, the line it runs on, what exists, the signal with its control, the decision it settles, and a cost.

## The queue {#queue}

| # | scenario (what changes against the frontier line) | reads | first reading in |
|---|---|---|---|
| H1 | `K · all · cherry (2, 256) · stretch 4096 · leash 293` | keys as a separate problem | ≈ 3 h |
| H2 | `V · all · cherry (2, 256) · stretch 4096 · leash 137 / 293 / 1103`, frontier compressor | what the leash costs at the frontier | ≈ 4 h |
| H3 | `V · layers {0, 4, 5} · cherry (2, 256) · stretch 4096 · leash 293`, one dictionary for the group | stereo across layers; the GLM-5.1 question | ≈ 5 h |
| H4 | `K+V · all · cherry (2, 2, 256) · stretch 4096 · leash 293` | what a miss really moves | ≈ 6 h |
| H5 | `V · all · cherry (2, 256) · stretch 4096 · leash 293`, the bit-field split as a stage | whether a fixed-length delta exists | ≈ 1 day |
| H6 | `V · all · cherry (2, 256) · stretch 32 768 → sequence · leash 293` | sequence scope, $\vgainstr$ | ≈ 2 days |
| H7 | the frontier line on prose | whether echo survives another genre | 1 evening + ≈ 1 day |
| H8 | the frontier line on Qwen3-1.7B | transfer across LLMs | 1 evening + ≈ 2 days |
| H9 | a GPU decode of the frontier compressor | the 10× rule | ≈ 1 week ([[#plan-decoder-speed]]) |

The "frontier line" throughout is `V · all · cherry (2, 256) · stretch 4096 · leash 293` with compressor 121, the best verified score of Part VIII, 0.636 ([[#measured-scorecard]]). Costs use the yardstick of [[#plan-principles/card]]: about 55 CPU seconds per punnet, 72 punnets per screen.

::: takeaway
- Nine scenarios; the first four need no new data and less than a day each.
- Everything is one change against the frontier line, so every reading is a paired difference.
:::

## The cards {#cards}

::: note practice H1 · Keys under the leash
- **Question.** Are keys a separate problem? [[#hypotheses-keys-and-values]]. C1 found pre-RoPE keys within 0.03 of values at every layer (K 0.660–0.701 against V 0.572–0.744 at 4K, head 0, no leash) and a lower solo floor (0.776–0.786); C2 never touched them.
- **Scenario.** `K · all · cherry (2, 256) · stretch 4096 · leash 293`, FP8, same screen as the frontier line.
- **Exists.** The dump holds `k` pre-RoPE; the FP8 scale rule exists for `v` and is one function call for `k`. The harness reads a tensor name: one line changes.
- **Signal.** A ratio within 0.03 of 0.636 on the same punnets says one compressor family serves both halves. Control: the shuffle; the stereo check (cherry `(256,)` against `(2, 256)` on keys, same window).
- **Decision.** Whether keys need their own stages before any K+V scenario; whether the Pin's one MLA latent (keys and values in one vector) is a fair target for the same compressor.
- **Cost.** 1 h to wire, 1–2 h of CPU for a screen.
:::

::: note practice H2 · The leash at 137, 293 and 1103 on the frontier compressor
- **Question.** What does the leash cost at the frontier, not at the compressor that happened to fit it? [[#scenario-the-leash]]. At 137 the winner was a different compressor (97, 0.660); the frontier compressor's worst cherry reads 226 and was never made legal at 137, nor run at 1103.
- **Scenario.** The frontier line at leash 137, 293 and 1103, compressor 121 with its tree depth capped to fit.
- **Exists.** The harness counts reads for every cherry; capping the tree depth is a parameter of the layout stage.
- **Signal.** Expected from the tree family's history: about 0.0005 of ratio per doubling of reads, so 1103 buys under 0.002 and 137 costs about 0.02. Control: the same punnets at 293.
- **Decision.** Which leash the application pays for: at the Pin a cold decode touching 137 cherries' worth is 88 KB of dictionary per miss ([[#app-data-layout]]).
- **Cost.** 1 h to parametrise, 3 screens × 1 h of CPU.
:::

::: note practice H3 · One dictionary for a group of layers
- **Question.** Can layers that select together ([[#app-which-application]], the GLM-5.1 shape) share one dictionary without losing what per-layer dictionaries give? [[#hypotheses-upstairs]]. Joining six layers into one cherry saved 0.004; grouping by kind (layers 0, 4, 5 and 1, 2, 3) beat grouping by nearness by 0.0015 on 7 of 7 sequences.
- **Scenario.** `V · layers {0, 4, 5} · cherry (2, 256) · stretch 4096 · leash 293`: one punnet of 3 × 4096 cherries, one dictionary, each cherry still one layer's values of one token.
- **Exists.** The harness takes a punnet; building one from three layers is a punnet constructor. The reference tree and the linear-prediction table work on any cherry set.
- **Signal.** The paired difference against three per-layer dictionaries. The prediction table's share (0.013–0.021 per punnet) is paid once instead of three times, so a gain near 0.01 is expected from bookkeeping alone; a gain beyond it is upstairs structure. Control: a group of unrelated layers.
- **Decision.** Whether a shelf keeps one dictionary per layer group (3× fewer on the GPU) or one per layer ([[#app-shelf-and-two-misses]]).
- **Cost.** 2 h to write the constructor, 2 h of CPU.
:::

::: note practice H4 · Keys and values as one cherry
- **Question.** Do one token's keys and values at one layer share bits? A miss moves both halves, 1 KB on the Bench. Not a hypothesis of Part VII yet; its answer would add a fifth member to [[neighbour|neighbour similarity]].
- **Scenario.** `K+V · all · cherry (2, 2, 256) · stretch 4096 · leash 293`.
- **Exists.** After H1, both halves are scored alone; the harness needs a slice spanning two tensors, one script.
- **Signal.** The ratio against the byte-weighted mean of H1 and the frontier line on the same punnets. Below the mean by more than 0.005: shared bits. Control: the same cherry with values from a different token (the shuffle on one half).
- **Decision.** Whether a pick is coded as one cherry of both halves, or as two cherries with one dictionary each ([[#app-mapping]]).
- **Cost.** 2 h to write, 2–4 h of CPU (1 KB cherries double the work).
:::

::: note practice H5 · The bit-field split as a stage
- **Question.** Does a delta exist that a fixed-length decoder can read? [[#toolbox-bit-fields]], [[#toolbox-two-rates]]. The frontier compressor models values and integrates over the FP8 cell; the campaigns found that modelling the code index instead reads the shared bits three times too low.
- **Scenario.** The frontier line, with the sign and exponent routed through the reference tree and a fixed-length mantissa field with escapes in place of the entropy coder.
- **Exists.** The stages exist separately; the routing is a new graph. An exponent-splitting solo stage (the SplitZip shape, [[#papers-splitzip]]) is the fair floor and does not exist yet.
- **Signal.** The gap to 0.636: the campaigns' bound says 10–15 % at best; on the FP8 grid it may be twice that. Control: the exponent-splitting solo at the same scenario.
- **Decision.** Which delta format H9 decodes: entropy-coded (small, serial per cherry) or fixed-length (larger, parallel).
- **Cost.** 1 day to write, 2 h of CPU.
:::

::: note practice H6 · Sequence scope
- **Question.** How much does one dictionary per sequence buy over one per stretch, $\vgainstr$ with the sign reversed? [[#scenario-scope]]. The tree kept gaining 0.010–0.020 per doubling from 16K to 32K while the prediction table saturated; a whole-sequence pool was bounded at 0.26–0.45 bit per element below a 16 384 pool, allowing cycles.
- **Scenario.** `V · all · cherry (2, 256) · stretch 32 768, 65 536, then = sequence · leash 293`.
- **Exists.** The harness accepts any stretch length. The frontier compressor's tree is built from all pairwise distances; at 225K cherries that is 3 000 times the work of 4096 (55 s), so the sequence run needs a nearest-neighbour index or the row-by-row tree of C1's big-stretch twin.
- **Signal.** The curve 0.636 → 0.618 → ? extended two doublings, then the sequence point. Control: the leash, which the tree must still keep (reads measured for every cherry), and the scope identity (a sequence as one stretch equals stretch scope with `stretch_len = n_tokens`).
- **Decision.** Whether the application is "one dictionary per sequence, loaded at admission, no shelf" ([[#app-on-fire]] becomes moot) or a shelf of stretch dictionaries.
- **Cost.** 4 h to add the index, 1–2 days of CPU for 5 sequences.
:::

::: note practice H7 · Prose
- **Question.** Does the echo-driven gain survive text that repeats less? [[#hypotheses-echo]]. Under the shuffle the tree's score moved 0.691 → 0.752 and the prediction's did not; prose is a milder shuffle that nature supplies.
- **Scenario.** The frontier line on 10 prose sequences ([[#plan-the-dataset-we-have/one-script]]).
- **Exists.** The dump script; a corpus must be chosen and dumped (one evening).
- **Signal.** Two numbers: the no-tree compressor's ratio (expected near 0.686, the linear part belongs to the LLM) and the frontier compressor's (expected worse than 0.636 by whatever the lost repeats were worth). Control: the token-kind split inside the existing sequences (tool responses against assistant turns), which costs nothing and comes first.
- **Decision.** Whether kvblockdiff's headline depends on tool-heavy transcripts; which number goes into the Pin's napkin ([[#app-the-napkin]]).
- **Cost.** 1 evening of GPU, 1 h to wire, 1 day of CPU.
:::

::: note practice H8 · A second LLM
- **Question.** Are stereo and echo properties of transformers or of Qwen3.5-2B? [[#plan-risks]]. Qwen3-1.7B has 28 KV layers and 8 KV heads of 128 elements, so its stereo question is eight views instead of two.
- **Scenario.** `V · all · cherry (8, 128) · stretch 4096 · leash 293` against `cherry (128,)`, same window; and the frontier line's stages unchanged.
- **Exists.** The dump script with the LLM name changed; the harness is shape-agnostic.
- **Signal.** The head-joining gain (0.032 on the Bench) and the shuffle gap, on the new LLM. Control: solo on the new LLM, its own floor.
- **Decision.** How much of Part VIII to claim beyond one LLM; whether to spend on a real-indexer LLM ([[#plan-other-experiments]]).
- **Cost.** 1 evening of GPU, 2 days of CPU for the pair of screens.
:::

::: note practice H9 · A GPU decode of the frontier compressor
- **Question.** Does the frontier compressor decode fast enough to sit on the miss path? [[#landscape-derived-numbers]] asks for ten times the link. Its own page: [[#plan-decoder-speed]].
- **Scenario.** The frontier line; the decoder, not the ratio, is measured.
- **Exists.** A CPU decoder in Rust that forks per cherry; no GPU code.
- **Signal.** Cold-decoded cherries per second against 50 GB/s of link. Control: a fixed-length variant (H5) and a plain memcpy of the same bytes.
- **Decision.** Whether lever 1 is built on entropy-coded deltas, on fixed-length deltas, or only through a victim tier ([[#app-victim-tier]]).
- **Cost.** About a week.
:::

::: theme controls
Every card names a control that would destroy its reading: the shuffle for H1 and H7, the two halves alone for H4, unrelated layers for H3, the scope identity for H6, a memcpy for H9. A card without one would not be on this page.
:::

::: takeaway
- H1 to H4 change one thing each against the frontier line and return within a day.
- H5 and H9 decide the delta format; H6 decides whether a shelf is needed at all; H7 and H8 decide how far Part VIII travels.
:::
