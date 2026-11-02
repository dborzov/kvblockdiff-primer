# Pitfalls: the confusions this project is prone to

An explicit list of the ways this project's words and concepts get confused, each with the sentence
that resolves it. Read it before writing about the compression scenario or the measurements. The
general philosophy is in `philosophy.md`; the vocabulary in `terminology.md`.

## A. The five objects of the scenario

1. **A stretch is positions; a punnet is cherries.** "The block" used to mean both. A stretch of 4096
   token positions yields a punnet of 4096 cherries only when the cherry is one token's worth of the
   slice; with `(256,)` cherries over two layers the same stretch yields 8192. Never say "the stretch's
   bytes" or "compress the stretch"; a stretch has no bytes.
2. **A punnet is not the whole stretch's values.** It contains what the slice puts in play, which can
   be one head of one layer. "The dictionary serves the block" used to hide this.
3. **The slice says what is in play; the cherry shape says how it is diced.** Both together replaced
   "entry split". The same slice with two cherry shapes is two scenarios with different scores, because
   what one ask returns and what a decode may use for free both change.
4. **A cherry is what the receiver asks for; a pick is what the indexer names.** They coincide in one
   scenario (`V · layer l · cherry (2, 256)`) and not in others; a pick is served with one or more
   cherries. "Entry" used to mean both, and also the compressed thing, and also one token's keys plus
   values (1024 elements), which the campaigns never compressed.
5. **A dictionary is the shared bytes, not the punnet, not the codebook.** Any bytes the receiver holds
   before asking: statistics, a basis, a codebook, tables, reference cherries, weights. "Codebook" means
   only VQ's centroid list. A Python `dict` is never called a dictionary on the site.

## B. The score and its parts

6. **The dictionary share is bookkeeping, not a measure of sharing.** A reference-tree compressor
   files half the punnet in the dictionary; moving every cherry there changed one ratio by 0.00004.
   "Half the bits are in the dictionary, so half the information is shared" is the specific wrong
   inference the site had to retract. What measures sharing is the gain over solo.
7. **MDL ratio = dictionary share + delta share; bits per element = 8 × ratio; the delta share alone
   is what a miss moves.** Do not call the ratio a "compression ratio" (its inverse) and do not quote a
   delta share as if it were the whole bill.
8. **Scores from different screens are never subtracted.** What makes a punnet hard is its text; two
   screens sample different punnets. The one reversal in the campaigns' history came from exactly this.
   Compare paired, on the same punnets, per sequence.
9. **Solo is the baseline, not raw bytes.** Solo already compresses by 1.1 to 1.3×; a dictionary earns
   its keep only against 0.778, not against 1.0.
10. **Verified has one meaning.** Every cherry rebuilt bit for bit in a separate process, reads
    counted for every cherry. "Encoded bytes on a window", "quick trial", "code-length estimate" and
    "bound" are other grades and must be named as such.

## C. The leash and the access pattern

11. **The leash caps what one cold decode may touch, not what the dictionary may be.** A dictionary of
    half the punnet is fine under a leash of 293 if no single decode walks through more than 293 cherries'
    worth. The leash is not a GPU memory budget and not a bandwidth; residency is Part VI's question.
12. **"Cold" is about deltas, not the dictionary.** The receiver holds the dictionary throughout; cold
    means no other cherry was decoded first. A stream compressor violates cold decode however good its
    ratio; the unfenced optimum of the first campaign was that stream compressor in disguise.
13. **Sequence scope is stretch scope with one stretch as long as the sequence**, not a different
    mechanism, and a global dictionary fit on evaluation data is a peek at the answer.

## D. The orchard and its axes

14. **The orchard is a store, not a cache.** Nothing is ever evicted from it; "cache" on this site
    stands alone only for the hot cache and the dictionary shelf.
15. **Axis order is fixed: `[token_pos_id, layer_id, head_id, elem_id]`.** The old `K[l, h, t, c]`
    had the token axis third; the campaigns' export has it first. `v[:, :, :, :3]` selects elements 0–2,
    not mantissa bits; bit fields are a stage, not a slice.
16. **`layer_id` counts KV layers, not model layers.** On the Bench, KV layer 0 is the LLM's layer 3;
    hybrid LLMs keep an orchard at some layers only. Say both the first time a page needs the model's
    numbering.
17. **An element is a position; a furrow is that position followed along tokens.** "Channel" meant
    both, and also the wire. Per-furrow statistics are per element position, computed across cherries.
18. **Keys and values are separate problems unless a slice names both.** Keys are turned by RoPE
    before storage; the campaigns compressed values; the old plan's 1024-element "entry" counted both.
19. **The Pin and the Bench have different shapes.** One MLA latent of ≈ 640 treated as `(1, 640)` on
    the Pin; `(2, 256)` GQA heads on the Bench; a one-token-one-layer cherry is 640 B or 512 B. Use
    `[[@key]]` only where a sentence is true for both.

## E. Hypotheses and their verdicts

20. **"Which picks are wanted" and "what is inside them" are different questions.** HiSparse's hit
    rates are evidence about the indexer's drift, not about the cherries' bytes; a Monte Carlo with
    i.i.d. keys reproduces the hit rates with zero compressibility (the leak).
21. **A cosine is not a bit count.** The two KV heads have a cosine near zero and share 0.85 bit per
    element; adjacent tokens share up to 0.29 bit raw and 0.02 once each has a reference cherry.
    Similarity that does not convert to bits does not count.
22. **Distance and repetition are different axes.** Fallen-apple (near in position) was weak outside
    the middle layers; echo (a far repeat of the same token) carried the reference trees. Do not call
    an echo result a fallen-apple result.
23. **Stereo is about heads, upstairs about layers, and layers group by kind, not adjacency.** Joining
    heads saved 0.032; joining six layers 0.004; layers 0, 4, 5 behave alike against 1, 2, 3.
24. **The campaigns' text repeats itself unusually often.** Every repeat-driven finding (echo, hubs)
    carries that caveat; geometry findings (stereo) have a reason to transfer.

## F. Numbers and settings

25. **N = 109 or 110 sequences per GPU is a rounding, not two results** (109.7); the Pin's napkin.
26. **Three solo numbers exist** (0.800 one head, 0.778 six layers ideal, 0.804 best real); C2 results
    compare with 0.778.
27. **Weights scale with the cherry**: a dictionary's weight `w` is in cherries' worth, so the same
    bytes are a different `w` for a different cherry shape; always say which cherry.
28. **Bits per element vs bits per cherry vs bytes**: the bill is in bits per element; a delta is bytes
    per cherry; the link counts bytes per step. Convert explicitly.

## G. Words that look innocent

29. "selection" as a noun (use pick); "request" (sequence, or ask); "thread" (sequence; also a GPU
    word); "chunk", "segment", "window", "page" (stretch, or say what it is); "codec", "coder",
    "algorithm", "method", "scheme" (compressor or stage); "exact model" (code-length estimate);
    "proxy model" (stand-in LLM); "KV cache", "KV history" (orchard); "dictionary cache" (dictionary
    shelf); "read budget" (leash); "entry split" (slice and cherry shape); "kv-blockdiff" (kvblockdiff).
30. "The model" in any sense. Name the LLM; say probability table; say napkin or calculation for a
    cost model; say stand-in LLM.
