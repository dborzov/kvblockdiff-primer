# kv-blockdiff in one screen

**The question.** While a language model (the LLM) writes, it keeps everything it has read in a store of
keys and values, one fixed-size piece per position per layer. With sparse attention, each decode step reads
only a few thousand of those pieces per layer, scattered over a history of 100K+ positions. Production
systems (HiSparse) keep the whole store in host memory and a small LRU cache of raw pieces per layer on the
GPU; every cache miss moves one raw piece over the host-to-GPU link. **Could those pieces travel as short
deltas against dictionaries the GPU already holds, and be rebuilt bit for bit?**

**The mechanism.** Cut the store into groups that share a dictionary; fit the dictionary offline when the
history is written; store each piece as a delta that decodes alone given its dictionary; keep a shelf of
dictionaries on the GPU; on a miss, move the delta if the dictionary is resident (a δ-miss), the raw piece
if not (a raw miss). Nothing the LLM computes changes. Two levers: cheaper misses (lever 1: fewer bytes
on the link) and cheaper slots (lever 2: a compressed history on the GPU, the victim tier first).

**The bet.** That a piece is much cheaper to code exactly given its neighbours or its group's statistics
than alone. The established fact that the selector keeps picking the same pieces (the Lucky Louis
property) is about *which* pieces are wanted, not about *what is inside them*; the project exists to
measure the second.

**What the napkin said (Parts VI–VIII).** Solo coding of 8-bit KV is worth about 0.78–0.88 of raw. One
bit per element saved needs a dictionary that explains 75 % of the remaining variance. Light dictionaries
first; VQ pays an index tax; the 8-bit grid is not neutral. Lever 1 alone buys about $\sqrt{1/\rho}$ in
threads per GPU, roughly 1.1–1.2×; the prize needs lever 2.

**What the data said (Part XI, Oct 2026).** Two campaigns of AI researcher agents ran 126 coders through a
harness on Qwen3.5-2B values (FP8, six KV layers, coding-agent transcripts). Solo: 0.778 of raw. Best
verified coder: 0.636 at 4096-position groups, 0.618 at 16K. The bits came from *repeats* (an earlier
near-copy of the same token, found by a minimum spanning tree of pointers) and from *geometry* (a
linear rule across element positions that belongs to the LLM's weights and transfers between texts).
Adjacent positions were nearly useless at the outer layers; bigger groups always won; the whole thread
is the best scope. Keys compress like values. Random access was cheap in bytes; no GPU decoder exists.

**What follows (Part XII).** A dictionary's size is a description length, not a measure of shared
information; the block redundancy is about a fifth of the bits. The interesting designs keep heavy
dictionaries in host memory and load one when a group gets popular ("on fire"): a prefetch of half the
group in compressed form. The chain from bytes on the link to dollars per million tokens is written out
for the Pin, with the unmeasured parts named.

**Open.** The fixed-length (GPU-decodable) rate of the measured coders; the δ-miss fraction and dictionary
load rate under a real picker (framework C); a shared table for the geometry rule; other texts; keys at scale.

Where the evidence lives, item by item: `docs/project/state-of-knowledge.md`. The words used above are
being reworked: `docs/plans/terminology-rework.md`.
