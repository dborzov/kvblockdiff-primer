# kvblockdiff in one screen

**The question.** A sparse-attention LLM keeps everything it has read as keys and values, one row per
token per KV layer, in host memory: its *orchard*. At every decode step an indexer names a few thousand
*picks* per layer, and the ones not in the GPU's small *hot cache* are fetched over the PCIe *link*, one
scattered row at a time (HiSparse, 2026). Could those fetches travel as short *deltas* against a
*dictionary* the GPU already holds, and be rebuilt bit for bit?

**The problem, cleanly.** Part IV strips the serving system away. A *sender* holds the orchard; a
*receiver* asks for one *cherry* at a time (a fixed-shape piece of a chosen *slice* of the orchard, e.g. one
token's values at one layer, 512 B on Qwen3.5-2B); one dictionary serves one *punnet* (all cherries of one
*stretch* of token positions); `decompress(delta[i], dictionary) == cherry[i]` for every cherry, decoded
cold; the score is the *MDL ratio* `(dict_bytes + Σ delta_bytes) / raw_bytes`; a *leash* caps the
dictionary bytes one cold decode may touch (137 cherries' worth), which keeps bulk stream compression
out. Varying the scenario (slice, cherry shape, stretch length, leash, scope) is both a probe of the
orchard's information and a map of possible serving designs. Details: `scenario.md`.

**What is known (Part VIII).** Two autonomous research campaigns (29–30 Oct 2026, 126 compressors, 387
trials) on the values of Qwen3.5-2B's six KV layers, FP8, over 30 coding-agent transcripts of ≈ 225K
tokens: solo coding (no dictionary) reaches 0.778; the best stretch-scope compressor (reference tree +
linear prediction + entropy coding) 0.636 with a 0.525 dictionary share, under a leash of 293; a light
no-tree compressor 0.686 with a 0.02 dictionary. Joining the two KV heads into one cherry saves 0.032
(*stereo similarity*, the strongest structure found, invisible to cosine); joining six layers a further
0.004 (*upstairs* is small); joining adjacent tokens costs (+0.037): the axis that mattered is a far
*echo* of the same token, not distance (*fallen-apple* is weak outside the middle layers). About a fifth
of the bits are shared within a punnet; more is reachable at sequence scope. Nothing on the application
side (picks, misses, popularity, decoder speed) has been measured on this data: no indexer ran.

**What is known (Part XI).** The plan's queries-and-picks experiment and hot-cache replay ran on
2026-11-03 on a different dump, *the Bachelor* (Qwen 2.5 1.5B, five coding-agent sequences of 24.5K–30K
tokens, queries kept; repository bachelor-kv). Exact top-k attention as a stand-in indexer, at the Pin's
share of the context (512 picks, 2 %), misses 35 / 19 / 9.7 % at B/k = 1 / 2 / 4 against HiSparse's
30 / 13.4 / 6.7 %, same slope and LRU-to-Bélády gap. Miss rates follow the share φ = k/t, not k. Misses
pile into stretches 3–5× above chance but spread as the context grows (f_D collapses on b / t^1.27): at the
Pin's 100K, extrapolated, a shelf of 4 × 4096 catches 36–54 % of misses (Part VI assumes 0.85), 0.10–0.13
loads per step. At equal GPU memory (each design at its best hot-cache size): HiSparse 109.5, resized to
≈ 4740 slots 127, tree shelf 88–108, light shelf 127–133, a solo code on every miss with no per-sequence
bytes 141; longer stretches make every shelf worse (a dictionary on the GPU is resident, not amortised),
and by the *half-gain rule* (N ∝ ρ^(−1/(1+α)) ≈ 1/√ρ) no global code can add more than +31 % (166 at the
floor 0.57). A dictionary on the GPU must save more link bytes than the hot-cache slots its memory would
hold (the *slot price*).

**What is next (Parts X, XI).** A GPU decode speed test, first: the solo code's 141 needs ≥ 500 GB/s.
Keys, and solo coding on keys and MLA latents; keys with values; sequence scope; the leash at 137; prose
text. Re-aim the compression search at zero or tiny per-sequence bytes and count a dictionary byte as GPU
memory (a proposal for the human). A pick trace of Qwen3.5-2B to 225K (the Bench's LLM), which turns the
Pin's f_D into an interpolation and allows scoring the missed cherries; a Qwen 2.5 size ladder.

**The Parts.** I the tiny-file story · II back to school (bits, vectors, caches) · III how an LLM reads
its memory (attention in Python, the orchard, picks, HiSparse, the two reference settings: the Pin, GLM-5.1
on 8 × H200; the Bench, Qwen3.5-2B on one RTX 5080) · IV the compression scenario · V the compressor's
toolbox (stages) · VI kvblockdiff, the application (shelf, δ-misses, on fire, dollars) · VII hypotheses ·
VIII the measurements · IX papers · X the research plan · XI the pick traces, measured on the Bachelor ·
XII reference.

**History.** The site was written in stages in October 2026 (story, school, landscape, idea, papers,
homework, corrections, questions, plan, measurements, range) and reworked in November 2026 into the
structure above with one vocabulary (`../style/terminology.md` §4.1 maps the old words). The experiments
repository `kv-compress-roofline` (not in this repo; its reading guide is `../../experiment_repos/`) holds
the harness, the compressors and the ledgers.
