---
title: How we read papers
nav: How we read papers
lede: Thirteen pages of papers follow. First, a map that places each one — what it rebuilds exactly, and which road its bytes travel — and the short list of questions we ask every paper before we trust a number from it.
cards:
  - q: Which data path does this project care about?
    a: The sparse-decode miss path — scattered single entries that must each decode alone
    wrong: ["The bulk transfer of a whole prompt's KV from the prefill GPU to the decode GPU", "The network fetch of a stored prefix from another machine", "The KV cache kept compressed in GPU memory and decoded at every attention step"]
    why: Per layer per step the hot cache misses about 274 scattered 640-byte entries in the reference setting; each one must be rebuilt on its own, given only what is already on the GPU.
    sec: map
  - q: Why can a codec that is excellent for bulk transfer still be the wrong shape for the miss path?
    a: It may only decode a whole stream front to back, so one entry cannot be rebuilt alone
    wrong: ["Bulk codecs are always lossy", "Bulk codecs cannot run on a GPU", "Bulk transfers move fewer bytes than the miss path"]
    why: The access pattern decides the form. A stream coder carries state from one value to the next; the miss path needs random access to single entries.
    sec: map
  - q: A lossy paper shows that keys survive rounding to 2 bits. What does that tell us about lossless coding?
    a: Little — it is a statement about the model's tolerance, not about how predictable the stored bits are
    wrong: ["That keys can be stored losslessly in 2 bits", "That keys have an entropy of 2 bits per element", "That values cannot be compressed at all"]
    why: Lossless savings are set by how much of each number a predictor explains. A model can tolerate coarse rounding of numbers that are, bit for bit, unpredictable.
    sec: checklist
  - q: KV-Codec reports "lossless accuracy". What does that mean in this site's words?
    a: The model's answers did not get worse — the KV numbers were still rounded first, so the scheme is lossy
    wrong: ["Every bit of the BF16 cache comes back unchanged", "The video coder needs no prediction", "Accuracy goes up as compression goes up"]
    why: KV-Codec rounds KV to integers and then codes those integers losslessly. The integers come back exactly; the original BF16 numbers do not.
    sec: words
  - q: SplitZip calls its table of the 16 most frequent exponents a "codebook". What is it in this site's words?
    a: A fixed-length code with escapes, fit once on calibration data and shared by every request
    wrong: ["A VQ codebook of centroids", "A separate dictionary for every block of tokens", "A probability table that an arithmetic coder updates as it reads"]
    why: On this site "codebook" means VQ centroids only. SplitZip's table maps the 16 common exponent values to 4-bit codewords; everything else goes to the escape stream.
    sec: words
---

Here are two sentences from two of the papers in this Part, retold faithfully.

- *KV-Codec:* "our KV caches shrink about 12×, with lossless accuracy."
- *SplitZip:* "our KV caches shrink about 1.3×, losslessly."

Both say "lossless". Only one of them means what this site means by [[lossless]]. KV-Codec first rounds every number to a coarse grid and only then codes the rounded numbers exactly; "lossless accuracy" means the model's answers did not get worse. SplitZip gives back every bit. So the ×12 and the ×1.3 are not two scores on one scale. They answer different questions, about different bytes, travelling on different roads.

This page is the key to the rest of the Part. It places every paper on one map, and lists the questions we ask before we borrow a number.

## The map {#map}

Two questions sort every paper. The first is old: is the method [[lossless]] or [[lossy]]? The second is the one the first draft of this proposal kept forgetting.

::: define data-path
- **What it is:** the road a compressed KV cache travels, and how it is read at the other end. We meet four of them.
  1. **Bulk transfer.** A whole prompt's KV moves once, in one piece — from the GPU that read the prompt to the GPU that will write the answer, or to storage. Read front to back.
  2. **Network fetch.** A stored KV prefix is pulled from another machine to be reused. Also bulk, over a slower link.
  3. **GPU-memory footprint.** The cache is kept compressed in [[hbm|HBM]] and decoded whenever attention reads it. Read again and again, next to the attention kernel.
  4. **Miss path.** Our road. In the [[reference-setting]], per [[layer]] per decode step, about 274 scattered [[entry|entries]] of 640 bytes cross [[pcie|PCIe]] from host memory, and each must be rebuilt on its own.
- **Why it matters:** the path fixes the access pattern, and the access pattern fixes what a codec may look like — before any statistics are measured.
- **Easy to confuse with:** the *format* of the data (BF16, FP8). Two papers on the same format can sit on different paths and need different codecs.
:::

The map below places every page of this Part. Columns are data paths. The label on each card says what the method rebuilds exactly.

```graph
id: papers-map
columns: [Bulk transfer & storage, Network fetch, GPU-memory footprint, Miss path (sparse decode), Old theory]
nodes:
  - {id: splitzip, col: 1, row: 1, title: "SplitZip", text: "Lossless. Exponents in a fixed 4-bit code.", link: papers-splitzip, emblem: zip, color: "var(--emerald)"}
  - {id: floats, col: 1, row: 2, title: "ZipNN, DFloat11 & friends", text: "Lossless. Mostly model weights.", link: papers-float-coders, emblem: loggrid, color: "var(--emerald)"}
  - {id: kvtc, col: 1, row: 3, title: "KVTC", text: "Lossy. Rotation, rounding, entropy coding.", link: papers-kvtc, emblem: compass, color: "var(--vermilion)"}
  - {id: kvcodec, col: 2, row: 1, title: "KV-Codec", text: "Lossy rounding, then a lossless video coder.", link: papers-kv-codec, emblem: envelope, color: "var(--saffron)"}
  - {id: cachegen, col: 2, row: 2, title: "CacheGen", text: "Lossy. Neighbour differences, arithmetic coding.", link: papers-cachegen, emblem: telegraph, color: "var(--vermilion)"}
  - {id: kvcomp, col: 3, row: 1, title: "KVComp", text: "Lossy. Huffman decoding on the GPU.", link: papers-kvcomp, emblem: chip, color: "var(--vermilion)"}
  - {id: kivi, col: 3, row: 2, title: "KIVI", text: "Lossy. 2-bit keys and values.", link: papers-kivi, emblem: gauge, color: "var(--vermilion)"}
  - {id: kvquant, col: 3, row: 3, title: "KVQuant", text: "Lossy. Keys before RoPE, outliers apart.", link: papers-kvquant, emblem: sigma, color: "var(--vermilion)"}
  - {id: lexico, col: 3, row: 4, title: "Lexico", text: "Lossy. One universal dictionary.", link: papers-lexico, emblem: scroll, color: "var(--vermilion)"}
  - {id: new, col: 4, row: 1, title: "What would be new", text: "Lossless deltas on the miss path.", link: papers-what-would-be-new, term: kv-blockdiff, color: "var(--emerald)"}
  - {id: hisparse, col: 4, row: 2, title: "HiSparse", text: "Exact. No coding: a cache that moves raw entries.", link: papers-hisparse, term: hisparse, color: "var(--lapis)"}
  - {id: selectors, col: 4, row: 3, title: "DSA, NSA, Quest, CSA", text: "Exact. They decide which entries are read.", link: papers-sparse-selectors, term: indexer, color: "var(--lapis)"}
  - {id: classics, col: 5, row: 1, title: "The classics", text: "Side information, stack distances, integer rotations.", link: papers-classics, emblem: quill, color: "var(--amethyst)"}
edges:
  - [splitzip, floats, "same trick"]
  - [kvcodec, cachegen, "token axis"]
  - [splitzip, new, "decoder shape"]
  - [new, hisparse, "builds on"]
  - [hisparse, selectors, "serves"]
  - [new, classics, "leans on"]
```

Read the map column by column. Almost everything lossless sits on the bulk path. Almost everything on the GPU-memory path is lossy. The miss path holds one system that moves raw bytes and the selectors that feed it. Nobody has put a lossless coder there yet; the card at the top of that column — the gap — is the subject of [[#papers-what-would-be-new]].

::: theme access-pattern
Every column of the map is an access pattern. Bulk paths allow coders that carry state across megabytes; the miss path allows only coders where any single entry decodes alone. A paper's ratio transfers to us only after its codec survives that change of road.
:::

::: takeaway
- Two questions place a paper: does it rebuild the numbers exactly, and on which data path do its bytes travel?
- Lossless work so far lives on the bulk path; lossy work fills the GPU-memory path; the miss path has no coder yet.
- A codec's shape is set by its path. Ratios do not travel between columns for free.
:::

## How we read a paper {#checklist}

Every paper page in this Part has the same skeleton: a hook, *what it does in our words*, *the numbers we use* (each with its source), *what it tells us and what it does not*, and *where we are not convinced*. Behind the skeleton is this checklist.

1. **What is rebuilt exactly?** If the method is lossy, separate statements about the model's *tolerance* ("accuracy holds at 2 bits") from statements about *predictability* ("a neighbour explains 80 % of the variance"). Only the second kind converts into lossless savings.
2. **Which data path?** And so: may the decoder keep state, or must one entry decode alone?
3. **What is the dictionary, and who shares it?** One table fit offline for every request, one per conversation, or one per small group of tokens? (These are the three scopes of [[#homework-scope]].)
4. **What is measured, in which unit?** Can it be converted into bits per element? A similarity score that does not convert into bits is not evidence for us.
5. **At which precision?** BF16 results do not transfer to 8-bit storage for free: the low mantissa bits of BF16 are close to noise, and an 8-bit grid has none of them.
6. **Which controls?** One trace or many? Would the effect vanish if the tokens were shuffled? Is the baseline sensible?
7. **Whose number is it?** Measured by the authors, or copied from another paper into a comparison table?

::: note warning A note on our own sources
The first draft of this proposal quoted its paper numbers from memory. On every page of this Part we re-checked titles, authors and headline numbers against what we could reach (abstracts, listings and summaries; not every full text). A number we could not re-check is marked *as reported in the first draft; not re-checked*.
:::

::: takeaway
- Seven questions: exactness, path, dictionary, unit, precision, controls, provenance.
- Tolerance to rounding is not predictability. Only predictability saves lossless bits.
:::

## Their words, our words {#words}

Papers coin their own vocabulary, and the same word often means different things in two papers. We translate every one of them before using it. A sample of what is ahead:

| the paper says | in this site's words | where |
|---|---|---|
| "codebook" of the 16 most frequent exponents (SplitZip) | a [[fixed-length-code]] over exponent values, with an [[escape]] stream, fit once offline and shared by every request | [[#papers-splitzip]] |
| "lossless accuracy" (KV-Codec) | [[lossy]]: rounded first, then the rounded integers are coded exactly | [[#papers-kv-codec]] |
| "frame" (KV-Codec) | a slice of the KV cache covering a run of consecutive [[token\|tokens]] | [[#papers-kv-codec]] |
| "page" (Quest) | a group of consecutive positions that the selector scores and picks together | [[#papers-sparse-selectors]] |
| "hot device buffer" (HiSparse) | the [[hot-cache]] | [[#papers-hisparse]] |
| "per-channel" (KIVI) | statistics of one [[channel]] — one element position across many entries | [[#papers-kivi]] |

::: note connection The rule
If a page in this Part uses a word that is not defined on this site, that is a bug. Words we need from these papers get defined first; words we do not need get retold in plain language and dropped.
:::

::: takeaway
- Translate before borrowing: "codebook", "frame", "page" and "lossless accuracy" all mean something specific, and none means what a newcomer would guess.
- On this site "codebook" means VQ centroids only.
:::
