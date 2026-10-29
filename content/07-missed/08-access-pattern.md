---
title: The access pattern decides the codec's shape
nav: The access pattern
lede: The first draft reached for the tools of bulk compression and asked which statistics they would find. The miss path asks a different question first. It reads a few hundred scattered entries per layer and step, each needed alone, and that rules out whole families of coders before any statistics are considered.
cards:
  - q: What does the miss path read per layer per decode step in the reference setting (B = 4096)?
    a: About 274 scattered entries of 640 bytes, each needed on its own
    wrong: ["One contiguous 100 MB stream", "All 2048 selected entries, in order", "About 274 entries, read front to back from position 0"]
    why: 13.4 % of 2048 selections miss, at arbitrary positions among 100K, and each must be rebuilt without its neighbours.
    sec: claim
  - q: The history is stream-coded in chunks of 64 entries. Roughly how many bytes does one request move per layer and step on the miss path?
    a: About 7.2 MB, against 140 KB for fixed-length deltas
    wrong: ["About 140 KB — the same", "About 120 KB — streams are smaller", "About 35 MB"]
    why: About 251 chunks are touched, and each must be read and decoded whole to reach one entry.
    sec: toy
  - q: Stream coding is 0.70 of raw and fixed-length 0.80. From what chunk size does the stream lose on bytes moved?
    a: Already at 2 entries per chunk
    wrong: ["Only above 64 entries", "Only above 1024 entries", "Never — it is always smaller"]
    why: Two entries at 0.70 each cost 1.40 entries' worth to deliver one; a fixed-length delta costs 0.80.
    sec: toy
  - q: What exactly does random access forbid?
    a: Coder state shared between entries
    wrong: ["Entropy coding of any kind", "Dictionaries", "Encoding offline"]
    why: A per-entry entropy code is allowed; it needs an offset table and a second read. Fixed-length deltas are preferred for simple addressing and fast decoding.
    sec: shape
  - q: In the toy, why is a per-entry variable-length code (one entry per chunk) not the default even though it moves fewer bytes?
    a: It needs a per-entry offset and a second dependent read, and decodes each entry serially
    wrong: ["Because it is lossy", "Because it moves more bytes than raw entries", "Because it needs the whole block decoded"]
    why: Fixed-length deltas give address = base + offset in one read and a decode that is a gather and an add. The 10–15 % gap between the two rates is the price of random access.
    sec: shape
---

Picture a 900-page novel stored as one compressed file, and you need one sentence from page 612. To read it, you decompress the 611 pages in front of it. Fine if you wanted the whole novel. Absurd if you wanted one sentence, and then another one from page 47, and another from page 803, all within the next fraction of a millisecond.

That second situation is the miss path.

## What the first draft reached for {#claim}

The first draft reached for the tools of bulk compression: [[zstd]]-style "LZ dictionaries", and an [[entropy-coder]] run over the error. Then it asked which statistics they would find. It did not first ask how the bytes would be read. (This is our paraphrase. The earlier proposal recorded the correction: "the access pattern decides the codec's shape, not the statistics".)

The reach was natural.

- **zstd with a [[trained-dictionary]] is the hero of Part I.** It is the picture the whole idea started from.
- **Entropy coders reach the entropy.** If you want the fewest bits, you use one.
- **The published lossless KV coders are bulk coders.** SplitZip's exponent stream, KV-Codec and CacheGen all move or store big contiguous pieces of KV ([[#papers-splitzip]], [[#papers-kv-codec]], [[#papers-cachegen]]).
- **Statistics set the compression ratio,** so they seem like the first thing to study.

Now the access pattern, in the numbers of the [[reference-setting]] ([[#landscape-derived-numbers]]):

- per layer per step, about **274 misses** at $\vB = 4096$, each an [[entry]] of $\ve = 640$ bytes;
- at **arbitrary positions** among 100,384, each needed **on its own**;
- inside a window of about **0.38 ms** per layer, shared by about 110 requests on one link.

::: takeaway
- The draft asked "which statistics?" before "how is it read?"
- The miss path reads a few hundred scattered single entries, each alone, under a tight deadline.
:::

## Bulk stream versus single reads {#toy}

Suppose the history of one layer is stream-coded in chunks, so that the entries of a chunk share coder state. To rebuild one entry, the GPU must fetch and decode its whole chunk. In exchange, stream coding is a little more compact. Say a stream costs 0.70 of raw and a fixed-length delta 0.80 — a gap of about 12 %, inside the 10–15 % range of [[#homework-two-rates]]. Both numbers are illustrative.

::: figure fig-ma-access maAccess
**Bytes one request moves per layer and step on the miss path, against how many entries share one stream.** Horizontal: entries coded together in one stream chunk (log scale). Vertical: bytes moved (log scale). Red: stream-coded chunks; every chunk that holds at least one miss is fetched and decoded whole, so the bytes are (expected chunks touched) × (chunk size) × 0.70 × 640 B. With one entry per chunk, a 2-byte offset per entry is added. Blue: fixed-length deltas, one read of 0.80 × 640 B per miss. Grey dashed: raw entries, as HiSparse moves them. *Tiles:* bytes for the stream and the fixed-length store, and the time 110 such requests need on a 50 GB/s link, against the 0.38 ms window. *Controls:* chunk size (slider, or drag the knob); whether the 274 misses fall anywhere in the 100,384-entry history or inside 8 heavy blocks of 2,048 entries. Compression ratios illustrative; expected counts computed exactly.
:::

- **Chunks of 64 entries:** about 251 chunks are touched, so one request moves **7.2 MB** per layer per step instead of **140 KB**. For 110 requests the link needs 15.9 ms, against a window of 0.38 ms. The fixed-length store needs 0.31 ms.
- **Chunks of 2 entries:** already worse than fixed-length, 245 KB against 140 KB. Fetching one wanted entry drags along an unwanted one at 0.70, and 1.40 > 0.80.
- **Misses inside 8 heavy blocks:** concentration helps less than you might hope. With chunks of 64, about 168 chunks are touched and the request still moves 4.8 MB.
- **One entry per chunk:** 123 KB, fewer bytes than fixed-length. This design is legal, and it is the subject of the next section.

::: try
1. Drag the knob from 4096 down to 1. The curve falls almost in proportion: bytes moved track the chunk size.
2. Switch to **inside 8 heavy blocks**. Large chunks get cheaper, but nothing beats fixed-length except one entry per chunk.
3. Compare the link time with the 0.38 ms window. Which chunk sizes fit at all?
:::

The same arithmetic works on the toy world. The clerk of [[#school-fixed-length]] answered phone calls about single Gull Rock wind readings. Suppose twenty calls come in one day, each for one reading at a random time.

::: dataset fig-ma-wind-calls missed-wind-reads view=reads metrics=H,fixed,c2,c32,c1024,c1
**Twenty calls for single wind readings.** *Plot:* bits the office must read to answer 20 calls, each for one of the 1,024 readings of [[#fig-wind-data|the wind archive]] chosen at random, against the number of readings per stream chunk (both axes log scale). Vermilion: the archive is entropy-coded in chunks at 4.54 bits a reading, and every chunk that holds a wanted reading is decoded whole. Blue: the 5-bit slots with escapes of II.9, one slot read per call (5.54 bits on average). Dashed: one raw byte per reading. Hover a point for the chunks touched. *Table:* every chunk size. *Numbers:* the two rates and four chunk sizes. Expected values, computed exactly; the wind data is synthetic and seeded.
:::

Per reading, the slots cost 22 % more than the stream. Yet chunks of two already read 180 bits against the slots' 111, chunks of 32 read twenty times as much, and a single chunk means decoding the whole archive for every call. Only one reading per chunk reads fewer bits than the slots, and then every reading needs an address of its own. The shape of the store comes from how it is read.

::: takeaway
- A coder that shares state across entries makes every miss drag its neighbours along.
- With a 10–15 % rate gap, a chunk of two entries already loses.
:::

## The shape that follows {#shape}

The access pattern forces four rules on the store, worked out in [[#idea-data-layout]].

1. **Independence.** No coder state shared between entries. Each delta decodes alone, given its block's dictionary.
2. **Addressability.** Deltas are fixed-length within a block, so the address of entry $\vt$ is a base plus an offset. The length may differ from block to block.
3. **Asymmetry.** Encoding runs offline and may be slow. Decoding is a gather, an add and perhaps a table lookup.
4. **Dictionaries are units.** Loaded whole, cached whole, evicted whole.

The precise culprit is rule 1. Entropy coding itself is not forbidden; state *across* entries is. The figure's leftmost point is a per-entry entropy code, and it moves the fewest bytes. Its costs show up elsewhere: a 2-byte offset per entry, a second read that must wait for the first, and a decoder that walks each entry's bits in order. Fixed-length deltas avoid all three. That is why the plan reports both a [[fixed-length-rate]] (the engineering number, and directly the [[delta]] size) and an [[entropy-rate]] (the scientific number). The gap between them is the price of [[random-access]].

:::: compare Two ways to store a history
::: col Bulk stream codec
- **Reads:** a whole chunk, front to back.
- **Coder state:** carried across entries.
- **Rate:** closest to the entropy.
- **Fits:** one big transfer (prefill to decode, disk, network).
- **On the miss path:** drags neighbours along with every miss.
:::
::: col Random-access delta store
- **Reads:** one delta of known size at a known address.
- **Coder state:** none between entries.
- **Rate:** 10–15 % above the entropy rate.
- **Fits:** a few hundred scattered single reads per step.
- **On the miss path:** moves only what was asked for.
:::
::::

::: theme access-pattern
Part I's first lesson returns: the redundancy of the tiny files was always there, and the way they were read hid it. Here the way the cache is read decides what a coder may look like, before any statistic of the KV values is known.
:::

::: takeaway
- Random access forbids coder state across entries, not entropy coding as such.
- Fixed-length deltas, escapes for the rare large residual, decode = gather + add: the shape comes from the access pattern.
:::
