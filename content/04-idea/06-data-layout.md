---
title: The access pattern decides the layout
nav: The access pattern decides the layout
lede: Run zstd over a whole KV history and it might compress nicely — and be useless, because the miss path never reads a history front to back. It reads a few hundred scattered entries per layer per step, each one alone. That one fact decides what the stored format must look like.
group: The idea
vendor: [pako.min.js]
cards:
  - q: Why is a bulk stream codec like zstd the wrong form for the miss path?
    a: To decode one entry it must decode everything before it in the chunk
    wrong: ["It is lossy", "It cannot use a dictionary", "It compresses numbers worse than text"]
    why: A stream coder carries state from symbol to symbol. The miss path wants a few hundred scattered entries per layer per step, each decodable alone.
    sec: two-ways
  - q: Why are fixed-length deltas preferred within a block?
    a: The address of delta t is simply base + offset, so one read finds it
    wrong: ["They compress better than variable-length deltas", "They make dictionaries unnecessary", "They are required for lossless coding"]
    why: Variable-length deltas need a per-entry offset table — 2 extra bytes and a second dependent read per miss.
    sec: rules
  - q: Which side of kv-blockdiff may be slow, and which must be fast?
    a: Encoding may be slow (once, offline); decoding must be fast (on the GPU, at miss time)
    wrong: ["Both must be fast", "Encoding must be fast; decoding may be slow", "Both may be slow, since the link is the bottleneck"]
    why: 'Encoding happens once when the history is written to host memory. Decoding sits on the miss path, inside a step of about 0.38 ms per layer.'
    sec: rules
  - q: Roughly how expensive is the costliest offline encode considered (k-means, 256 centroids, 4K-token blocks), compared with prefill?
    a: Under 1 % of the prefill compute
    wrong: ["About equal to prefill", "About 10× prefill", "About 30 % of prefill"]
    why: About 5×10¹³ FLOPs for all blocks and layers, against about 6×10¹⁵ for prefilling 100K tokens on a model with 30 B active parameters.
    sec: rules
---

Picture the miss path of [[#landscape-derived-numbers]] in slow motion. At one layer, in one decode step of one request, about 274 [[entry|entries]] are missing from the [[hot-cache]]. They sit at arbitrary positions of a 100K-token history. Each is 640 bytes. All of them must arrive, decoded, before attention at that layer can run — and the whole step at that layer lasts about 0.38 ms.

A compressor's statistics do not get a vote here. The *access pattern* has already decided what the stored form must look like.

## Two ways to read one entry {#two-ways}

There are two families of compressed layout, and they behave very differently when you want one item from the middle.

::: figure fig-idea-layout layoutCompare
**Reading one entry from two layouts.** *A, bulk stream:* ten entries' deltas packed back to back as variable-length pieces (widths to scale) and decoded front to back, as zstd or any stream [[entropy-coder]] does. To read the chosen entry, every piece before it must be decoded too (shaded). *B, random-access store:* the block's dictionary $\vD_{\vj}$ and one slot per entry. With fixed-length deltas the slot's address is computed; with variable-length deltas a small offset table (2 bytes per entry, top row) must be read first. The slider picks the wanted entry; the switch changes the delta layout; the button toggles whether $\vD_{\vj}$ is already on the GPU (if not, its bytes count too). Sizes are illustrative: deltas of about 480 bytes, a light dictionary of 2 entries' worth.
:::

::: try
1. Pick entry 9. Layout A decodes ten pieces to deliver one; layout B reads one slot.
2. Switch to variable-length deltas. B still decodes one entry alone, but now needs two dependent reads.
3. Turn the dictionary off. The first miss in a cold block also pays for the dictionary — the [[raw-miss]] versus [[delta-miss]] trade of [[#idea-blockdiff-step-by-step]].
:::

:::: compare Bulk stream versus random access
::: col Bulk stream (zstd, a streaming entropy coder)
- One coder state runs through the whole chunk.
- Squeezes out every last bit; variable-length everything.
- Perfect for moving a 100 MB history in one go.
- To read entry $\vt$, decode entries $0 \dots \vt$.
:::
::: col Random-access delta store (kv-blockdiff)
- No state shared between entries; only the block's dictionary.
- Gives up a little compression for [[random-access]].
- Perfect for 274 scattered 640-byte reads per layer per step.
- To read entry $\vt$, read its slot (and the dictionary, if cold).
:::
::::

The Gull Rock messages of Part I already priced this choice, three ways, on the same 96 messages.

::: dataset fig-idea-layout-gull message-sizes view=chain,log metrics=loglater,chain,dict,alone
**Three layouts for the Gull Rock messages** ([[#fig-tiny-deltas]] again). *Day two, three ways:* one column per day-two message; pale bar, the message compressed alone; solid bar, compressed against the shared dictionary of 24 day-one messages; short violet tick, compressed against the message just before it. *Added to the log:* what each message adds when appended to one compressed log (solid) against its size alone (pale). DEFLATE (pako, level 9), computed live, in bytes. Hover a column for its sizes; drag to select a stretch.
:::

Line the three layouts up against the miss path's one demand, *decode this item alone*:

| layout | bytes per message | to decode message $\vt$ you need |
|---|---|---|
| one compressed log (bulk stream) | 10.3 | every message before it |
| against the message before (a chain) | 21.1 | the message before, decoded — and so on back |
| against a shared dictionary | 22.1 | the dictionary only |
| alone | 124.5 | nothing |

The log is the most compact and the least usable. The dictionary layout gives up a factor of two in size and buys random access. kv-blockdiff makes the same trade, with a block dictionary in place of the shared one.

::: theme access-pattern
The redundancy between entries may well be there; a bulk codec run over the whole history would find it. But the miss path never reads a history as a whole. How the data is read sets the shape of the coder before any statistics are looked at — exactly as for the Gull Rock messages.
:::

::: takeaway
- The miss path reads a few hundred scattered entries per layer per step, each alone.
- A stream codec must decode everything before the wanted entry; a random-access store reads one slot.
- So the store gives up a little compression to make every entry decodable on its own.
:::

## Four rules for the store {#rules}

The access pattern turns into four rules. Every dictionary type in Part VI must obey them.

1. **Independence.** No coder state is shared between entries. Each delta $\vdelta_{\vt}$ decodes alone, given only its block's dictionary $\vD_{\vj}$.
2. **Addressability.** Deltas are byte-aligned, and preferably of **fixed length** within a block, so that the address of delta $\vt$ is a base plus an offset. The length may differ from block to block (it is stored in the dictionary), not within one. Variable-length deltas need a 2-byte offset per entry and a second, dependent read.
3. **Asymmetry.** Encoding happens once, offline, when the history is written to host memory; it may be slow. Decoding happens at miss time on the GPU and must be cheap: a gather, an add, perhaps a table lookup.
4. **Dictionaries are units.** A dictionary is loaded whole, kept whole and dropped whole. Its weight $\vw$ is what residency costs.

::: aside reminder Fixed-length codes and escapes
A [[fixed-length-code]] gives every value the same number of bits $\vn$, so any value's position is known in advance. Values too big for $\vn$ bits are marked and stored separately as [[escape|escapes]]. Slightly wasteful, but trivially parallel and randomly accessible ([[#school-fixed-length]]).
:::

Rule 2 is where Part II's [[fixed-length-code|fixed-length codes]] earn their place: a per-block width $\vn$ for the residuals, with rare large residuals escaped. The price, judging by the published GPU coders, is roughly 10–15 % more bits than an ideal entropy coder would spend ([[#homework-two-rates]]). Rule 3 is affordable because decoding speed has slack: [[#landscape-derived-numbers]] showed that a decoder about ten times faster than the link disappears into the noise of the step.

::: aside detail How expensive is the offline encode? A Fermi estimate
Take the most expensive dictionary considered anywhere on this site: k-means with 256 centroids on blocks of 4096 entries of 640 elements, 20 iterations. Per block per layer that is about $20 \times 4096 \times 256 \times 640 \times 2 \approx 2.7 \times 10^{10}$ operations. A 100K-token request has 25 such blocks per layer and 78 layers: about $5 \times 10^{13}$ operations.

Prefill of the same request on a model with about 30 billion active parameters costs about 2 × (active parameters) × (tokens) $\approx 6 \times 10^{15}$ operations. The heaviest encode is under 1 % of that; a per-channel location-and-scale dictionary is 10–100× cheaper still. The encode side is not a cost worth optimizing in this proposal. (Both counts are order-of-magnitude estimates from the first draft, re-computed here.)
:::

::: takeaway
- Independence, addressability, asymmetry, dictionaries as units: the store's four rules all follow from the access pattern.
- Fixed-length deltas with escapes are the natural fit; the price is roughly 10–15 % more bits than an ideal entropy coder.
- Encoding may be slow — even the heaviest dictionary costs under 1 % of prefill. Decoding must be fast.
:::
