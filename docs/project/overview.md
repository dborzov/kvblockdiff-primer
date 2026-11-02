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

**What is next (Part X).** Keys; keys with values; sequence scope; the leash at 137; prose text and a
second LLM; computing queries for the dataset and running an exact top-k as a stand-in indexer to get a
pick trace, then replaying the hot cache and the dictionary shelf on it; a GPU decode speed test.

**The Parts.** I the tiny-file story · II back to school (bits, vectors, caches) · III how an LLM reads
its memory (attention in Python, the orchard, picks, HiSparse, the two reference settings: the Pin, GLM-5.1
on 8 × H200; the Bench, Qwen3.5-2B on one RTX 5080) · IV the compression scenario · V the compressor's
toolbox (stages) · VI kvblockdiff, the application (shelf, δ-misses, on fire, dollars) · VII hypotheses ·
VIII the measurements · IX papers · X the research plan · XI reference.

**History.** The site was written in stages in October 2026 (story, school, landscape, idea, papers,
homework, corrections, questions, plan, measurements, range) and reworked in November 2026 into the
structure above with one vocabulary (`../style/terminology.md` §4.1 maps the old words). The experiments
repository `kv-compress-roofline` (not in this repo; its reading guide is `../../experiment_repos/`) holds
the harness, the compressors and the ledgers.
