---
title: The access pattern decides the layout
nav: The access pattern decides the layout
group: The mechanism
lede: Run zstd over a whole orchard and it might compress nicely, and be useless, because the miss path never reads an orchard front to back. It reads a few hundred scattered picks per layer per step, each one alone. That one fact decides what the stored form must look like, and it is the same fact the leash wrote into the scenario.
cards:
  - q: Why is a bulk stream compressor like zstd the wrong form for the miss path?
    a: To decode one cherry it must decode everything before it in the stream
    wrong: ["It is lossy", "It cannot use a dictionary", "It compresses numbers worse than text"]
    why: A stream compressor carries state from symbol to symbol. The miss path wants a few hundred scattered cherries per layer per step, each decodable cold.
    sec: two-ways
  - q: Why are fixed-length deltas preferred within a punnet?
    a: The address of a cherry's delta is simply base + offset, so one read finds it
    wrong: ["They compress better than variable-length deltas", "They make dictionaries unnecessary", "They are required for lossless coding"]
    why: Variable-length deltas need a per-cherry offset table, 2 extra bytes and a second dependent read per miss.
    sec: rules
  - q: How does the leash of Part IV relate to the rules of the store?
    a: It is the independence rule written as a number, the most dictionary bytes one cold decode may touch, so that nothing like a stream decode can hide inside a dictionary
    wrong: ["It is the GPU memory budget of the shelf", "It limits the size of a delta", "It has no connection to the layout"]
    why: The leash keeps every cherry decodable alone within a bounded read of the dictionary. On the GPU that read is cheap; over the link it would be ruinous, which is why the dictionary must be resident.
    sec: rules
  - q: Which side of kvblockdiff may be slow, and which must be fast?
    a: Encoding may be slow (once, offline); decoding must be fast (on the GPU, at miss time)
    wrong: ["Both must be fast", "Encoding must be fast; decoding may be slow", "Both may be slow, since the link is the bottleneck"]
    why: 'Encoding happens once when the orchard is written to host memory. Decoding sits on the miss path, inside a step of about 0.38 ms per layer.'
    sec: rules
---

Picture the miss path of [[#landscape-derived-numbers]] in slow motion. At one layer, in one decode step of one [[sequence]], about 274 [[pick|picks]] are missing from the [[hot-cache]]. They sit at arbitrary positions of a 100K-token [[orchard]]. Each is 640 bytes on [[pin|the Pin]]. All of them must arrive, decoded, before attention at that layer can run, and the whole step at that layer lasts about 0.38 ms.

A compressor's statistics do not get a vote here. The *access pattern* has already decided what the stored form must look like. Part IV met the same fact as a rule, the [[leash]]; this page meets it as a layout.

## Two ways to read one cherry {#two-ways}

There are two families of compressed layout, and they behave very differently when you want one item from the middle.

::: figure fig-app-layout layoutCompare
**Reading one cherry from two layouts.** *A, bulk stream:* ten cherries' deltas packed back to back as variable-length pieces (widths to scale) and decoded front to back, as zstd or any stream [[entropy-coder]] does. To read the chosen cherry, every piece before it must be decoded too (shaded). *B, random-access store:* the punnet's dictionary $\vD_{\vj}$ and one slot per cherry. With fixed-length deltas the slot's address is computed; with variable-length deltas a small offset table (2 bytes per cherry, top row) must be read first. The slider picks the wanted cherry; the switch changes the delta layout; the button toggles whether $\vD_{\vj}$ is already on the GPU (if not, its bytes count too). Sizes are illustrative: deltas of about 480 bytes, a light dictionary of 2 cherries' worth.
:::

::: try
1. Pick cherry 9. Layout A decodes ten pieces to deliver one; layout B reads one slot.
2. Switch to variable-length deltas. B still decodes one cherry alone, but now needs two dependent reads.
3. Turn the dictionary off. The first miss in a stretch whose dictionary is absent also pays for the dictionary, the [[raw-miss]] versus [[delta-miss]] trade of [[#app-shelf-and-two-misses]].
:::

:::: compare Bulk stream versus random access
::: col Bulk stream (zstd, a streaming entropy coder)
- One decoder state runs through the whole punnet.
- Squeezes out every last bit; variable-length everything.
- Perfect for moving a 100 MB orchard in one go ([[#papers-splitzip]]).
- To read cherry $\vi$, decode cherries $0 \dots \vi$.
:::
::: col Random-access delta store (kvblockdiff)
- No state shared between cherries; only the punnet's dictionary.
- Gives up a little compression for [[random-access]].
- Perfect for 274 scattered 640-byte reads per layer per step.
- To read cherry $\vi$, read its slot (and the dictionary, if absent).
:::
::::

::: theme access-pattern
The redundancy between cherries may well be there; a bulk compressor run over the whole orchard would find it. But the miss path never reads an orchard as a whole. How the data is read sets the shape of the compressor before any statistics are looked at, exactly as for the Gull Rock messages, and exactly as the contract's cold decode says ([[#scenario-the-contract]]).
:::

::: takeaway
- The miss path reads a few hundred scattered picks per layer per step, each alone.
- A stream compressor must decode everything before the wanted cherry; a random-access store reads one slot.
- So the store gives up a little compression to make every cherry decodable on its own.
:::

## Four rules for the store {#rules}

The access pattern turns into four rules. Every dictionary type in Part V obeys them, and the [[harness]] of Part IV checks the first.

1. **Independence.** No decoder state is shared between cherries. Each delta $\vdelta_{\vi}$ decodes alone, given only its punnet's dictionary $\vD_{\vj}$. This is the [[cold-decode|cold decode]] of the contract, and the leash is its number: one cold decode may touch at most $\vleash\,\ve$ bytes of the dictionary, 137 cherries' worth in the baseline scenario ([[#scenario-the-leash]]). The campaigns' reference-tree compressor reads 120 cherries' worth on average and 226 at worst ([[#measured-reading-one-cherry]]). Those reads are harmless in GPU memory and ruinous over the link, which is why a dictionary must be on the shelf before its deltas are any use.
2. **Addressability.** Deltas are byte-aligned, and preferably of **fixed length** within a punnet, so that the address of cherry $\vi$'s delta is a base plus an offset. The length may differ from punnet to punnet (it is stored in the dictionary), not within one. Variable-length deltas need a 2-byte offset per cherry and a second, dependent read.
3. **Asymmetry.** Encoding happens once, offline, when the orchard is written to host memory; it may be slow. Decoding happens at miss time on the GPU and must be cheap: a gather, an add, perhaps a table lookup.
4. **Dictionaries are units.** A dictionary is loaded whole, kept whole and dropped whole. Its [[weight]] $\vw$ is what residency costs.

::: aside reminder Fixed-length codes and escapes
A [[fixed-length-code]] gives every value the same number of bits $\vn$, so any value's position is known in advance. Values too big for $\vn$ bits are marked and stored separately as [[escape|escapes]]. Slightly wasteful, but trivially parallel and randomly accessible ([[#school-fixed-length]]).
:::

Rule 2 is where fixed-length codes earn their place: a per-punnet width $\vn$ for the residuals, with rare large residuals escaped. The price is the gap between the [[entropy-rate]] and the [[fixed-length-rate]], roughly 10–15 % more bits ([[#toolbox-two-rates]]); every ratio the campaigns reported is an entropy-coded one, so the wire pays a little more than the ledger says.

Rule 3 has a number too. Every δ-miss is decoded on the GPU before attention can use it, and the decoder must emit raw cherries at the rate the link would have carried them: at 110 sequences per GPU with every miss a δ-miss, $110 \times 13.7\ \text{MB} / 30\ \text{ms} \approx 50$ GB/s, the link's own speed. [[#landscape-derived-numbers]] gave the rule of thumb that a decoder ten times faster than that, about 500 GB/s, disappears into the step. Published fixed-length GPU decoders run at 0.5–2 TB/s on long streams; entropy decoders at tens to a few hundred GB/s. Nobody has measured a decoder on 274 scattered reads per layer per step, and the reference tree's 120-cherry walk per cold decode has never run on a GPU at all; that measurement is the decode-speed subproblem of Part X ([[#plan-decoder-speed]]).

::: figure fig-app-decode hwbDecode
**Is the decoder fast enough?** Horizontal axis: decoder output in GB/s (log scale). Bars: reported throughputs of published decoders, fixed-length ones (teal: SplitZip at 2.2 TB/s for BF16 and 565 GB/s for FP8 E5M2 on an H200) and entropy-coded ones (gold: DFloat11's Huffman at 468 GB/s; the rANS range is dashed because it is only a rough range). Black line: what the miss path needs, $\vN\,\vm\,\vk\,\vNL\,\ve/\vtpot$ with every miss a δ-miss; the band up to ten times that is "too slow for comfort". Red dashed line: the full lever 2 of [[#app-two-levers]], where every one of the $\vk$ reads per layer decodes, about 370 GB/s. Controls: sequences per GPU $\vN$ and the hot-cache size $\vB$ (which sets the miss rate). All throughputs were measured on contiguous streams, not on scattered reads.
:::

::: aside detail How expensive is the offline encode? A Fermi estimate
Take the most expensive dictionary fit considered anywhere on this site: k-means with 256 centroids on punnets of 4096 cherries of 640 elements, 20 iterations. Per punnet per layer that is about $20 \times 4096 \times 256 \times 640 \times 2 \approx 2.7 \times 10^{10}$ operations. A 100K-token sequence has 25 punnets per layer and 78 layers: about $5 \times 10^{13}$ operations. Prefill of the same sequence on an LLM with about 30 billion active parameters costs about 2 × (active parameters) × (tokens) $\approx 6 \times 10^{15}$ operations. The heaviest encode is under 1 % of that; per-furrow statistics are 10–100× cheaper still. The encode side is not a cost worth optimizing. (Order-of-magnitude estimates from the first draft, re-computed here.)
:::

::: takeaway
- Independence, addressability, asymmetry, dictionaries as units: the store's four rules all follow from the access pattern, and the leash is the first rule as a number.
- Fixed-length deltas with escapes are the natural fit; the price is roughly 10–15 % more bits than an ideal entropy coder.
- Encoding may be slow, under 1 % of prefill even for the heaviest dictionary. Decoding must be fast, about 500 GB/s per GPU with headroom, and has not been measured on scattered reads.
:::
