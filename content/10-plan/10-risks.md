---
title: Weak spots, risks and pivots
nav: Risks and pivots
group: Decisions and risks
lede: A plan that cannot fail cannot teach anything. Five ways this one could, how each would show up, and what we would do instead. Most pivots are still results.
cards:
  - q: How would we find out that the Bench's results do not transfer to the Pin?
    a: From H8 on a second LLM, and from a rented trace or orchard of an MLA LLM; the Pin keeps one latent per token and has no head axis, so stereo cannot even be asked there
    wrong: ["From the shuffle control", "From the leash's cost", "From the miss rate at 4096 slots"]
    why: Transfer is a question about another LLM, and only another LLM answers it. Stereo is the one finding that has no counterpart in an MLA orchard.
    sec: risks
  - q: The exact top-k gives miss rates far below HiSparse's. What does that mean, and what is the pivot?
    a: The stand-in is more local than a trained indexer; scale the stretch statistics by the ratio and move the small trained indexer up the queue
    wrong: ["The hot cache is broken", "Lucky Louis is false", "Keys are incompressible"]
    why: A trained indexer approximates attention's ranking with errors; the calibration reading exists to catch exactly this.
    sec: risks
  - q: What is the pivot if no decoder clears 500 GB/s?
    a: Decode off the miss path, on promotion into a victim tier, where one cherry's latency is the constraint instead of a layer's throughput
    wrong: ["Abandon lossless coding", "Use a faster link", "Decode on the host"]
    why: The victim tier rebuilds a re-picked cherry from its delta already on the GPU; it needs latency well under a step, not 500 GB/s.
    sec: risks
  - q: What is the next action of the plan?
    a: Add the query flag to the dump script, run keys through the harness, replay the first trace
    wrong: ["Rent a multi-GPU node", "Write the CUDA decoder", "Dump a prose corpus"]
    why: Each of the three is hours of work on data that exists; together they fill the first rows of the decision table.
    sec: next
---

A bridge engineer's most useful drawing is the list of ways the bridge could fall, each with the test that would show it and the brace that would hold. The old plan listed twelve risks; nine were about a measurement that has since been made. Here are the five that remain, written against what the campaigns found.

## Five risks {#risks}

| risk | how we would know | pivot |
|---|---|---|
| **R1 · The stand-in LLM is not the target.** Qwen3.5-2B has two KV heads and partial RoPE; GLM-5.1 keeps one [[mla|MLA]] latent per token per layer, already a learned low-rank projection, with no head axis and no K/V split. Stereo, the strongest finding, has no counterpart there; echo should, since repeats are in the text. | H8 on Qwen3-1.7B (eight heads, no MLA); a rented orchard of an MLA LLM ([[#plan-other-experiments]]); the linear-prediction table's gain, 0.04–0.05 of ratio, re-measured on a latent | report every number with its LLM named; for the Pin, carry only the echo-driven part and the prediction part measured on a latent, and say so on [[#app-the-napkin]] |
| **R2 · One genre.** Tool output is 26–89 % of every sequence; echoes are repeats; prose repeats less. | the token-kind split inside the existing sequences (free), then H7 | two headline numbers, transcripts and prose; if prose loses the tree entirely, the no-tree compressor's 0.686 is the general claim |
| **R3 · The exact top-k is not a trained indexer.** It is more exact, has no sliding window, and in GLM-5.1 selection is per group. | the replay's first reading against HiSparse's 30 / 13.4 / 6.7 %; the grouped trace of [[#plan-other-experiments]] | scale stretch statistics by the calibration ratio; train the small DSA-style indexer; rent the real one only if a decision hinges on it |
| **R4 · Decoder speed.** The frontier compressor decodes one cherry by a serial walk and a serial rANS stream; nobody has timed it on a GPU. | H9: bytes per second against 500 GB/s | the fixed-length variant (H5); failing that, decode on promotion into a [[victim-tier]] only, and lever 1 is dropped |
| **R5 · Dictionary residency on the Pin.** The frontier's dictionary share is 0.525: at stretch 4096 and 640 B cherries that is 1.4 MB per stretch per layer, 78 layers, 25 stretches per 100K sequence; all of it resident is 2.7 GB per sequence, more than the hot cache it is meant to shrink. | the replay's $\vfD$ and $\vnload$ at $\vnD \le 8$; H6 on sequence scope | a shelf of few dictionaries if misses concentrate; a light no-tree dictionary (share 0.02–0.04, ratio 0.686) resident for every stretch if they do not; one dictionary per sequence if H6 says so |

::: aside source Receipts
Dictionary share of 121: 0.5247 (env-t0096). No-tree compressor 129: 0.6863, dictionary share 0.02–0.04 (r25-t0003). Prediction-table gain and transfer: r7 iter-1-2 (91–96 % recovered on another sequence). Tool-output share: target 02 README. MLA at the Pin: `data/settings.yaml`.
:::

Two patterns, as in the old list. Every pivot is still a result: two headline numbers instead of one, a no-tree dictionary resident everywhere, a victim tier instead of lever 1. And every risk has a test that is already in the queue; a risk without a measurement that could reveal it is a worry, not a risk.

::: theme noise-floor
R1 hides a floor the Bench cannot see: an MLA latent has already been projected to few directions by training, so the linear-prediction stage, which earned 0.04–0.05 on the Bench by finding directions the heads share, may find less there. The ladder does not change; its reading might.
:::

::: takeaway
- Five risks: transfer, genre, the stand-in indexer, decoder speed, residency on the Pin.
- Each has a test in the queue and a pivot that is still a result.
:::

## The next action {#next}

::: keycard Next action
**Add the query flag to the dump script, run keys through the harness tonight, replay the first trace tomorrow.**

H1 needs one changed line and two CPU hours. The trace needs one forward pass per sequence and a 40-line loop. By the end of the week the Bench's `null` cells, its miss rate, its $\vfD$, its loads per step, are numbers, and the decision table of [[#plan-decision-rules]] has its first rows filled in.
:::

::: takeaway
- Tonight: keys. Tomorrow: the trace and the replay. The decision table fills from the top.
:::
