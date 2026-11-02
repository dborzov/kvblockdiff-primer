---
title: How we read papers
nav: How we read papers
group: How to read
lede: Thirteen paper pages follow, every one cut to the same pattern. This page is the pattern, the rule for how much to trust each part of a paper, the one idea that sorts the papers into columns, and the map.
cards:
  - q: What does the "What it says about our scenario" section of a paper page contain?
    a: 'Three lists: what in Parts IV–VIII the paper supports, what it contradicts and who we believe, and what it suggests trying'
    wrong: ["A summary of the paper's abstract", "The paper's numbers converted to dollars", "A list of the paper's co-authors"]
    why: Builds on, conflicts with, suggests. Every item links to the scenario page, the stage, the hypothesis or the measurement it touches.
    sec: template
  - q: Which part of a paper does the trust rule rank highest?
    a: The background its introduction treats as known, and any result that is a formula or a count
    wrong: ["The headline ratio in the abstract", "The throughput on the authors' own rig", "The related-work section"]
    why: Background is what the field agrees on; a count can be redone. A ratio on a private rig can be checked by nobody.
    sec: trust
  - q: Which data path does this project live on?
    a: 'The miss path of sparse decoding: scattered single cherries that must each be rebuilt alone'
    wrong: ["The bulk transfer of a prompt's orchard from the prefill GPU to the decode GPU", "The network fetch of a stored prefix from another machine", "The orchard kept compressed in GPU memory and decoded inside attention"]
    why: On the Pin, per layer per decode step, about 274 scattered 640-byte picks cross the link, each rebuilt from its own delta and a dictionary already on the GPU.
    sec: data-path
  - q: Why can a compressor that is excellent for bulk transfer still be the wrong shape for the miss path?
    a: It may decode only a whole stream front to back, so one cherry cannot be rebuilt cold
    wrong: ["Bulk compressors are always lossy", "Bulk compressors cannot run on a GPU", "Bulk transfers move fewer bytes than the miss path"]
    why: The access pattern decides the form. A stream compressor carries state from one value to the next; the miss path needs one cherry, decoded cold, under the leash.
    sec: data-path
  - q: On the map, where does almost every lossless result sit?
    a: On the bulk-transfer path
    wrong: ["On the miss path", "On the GPU-memory path", "Spread evenly over every path"]
    why: SplitZip and the float compressors ship whole tensors once. The GPU-memory path is full of lossy work, and the miss path has a cache that moves raw bytes and no compressor yet.
    sec: map
---

Two sentences from two papers in this Part, retold faithfully. KVFetcher: "our stored prefixes shrink about 12×, with lossless accuracy." SplitZip: "our shipped orchards shrink about 1.3×, losslessly." Both say lossless. Only one means what this site means by [[lossless]]. KVFetcher first rounds every number to a coarse grid and then codes the rounded numbers exactly; "lossless accuracy" means the LLM's answers did not get worse. SplitZip gives every bit back. So 12× and 1.3× are not two scores on one scale: they answer different questions, about different bytes, travelling on different roads. This page is the key to reading the rest of the Part without being fooled that way.

## The template {#template}

Every paper page has the same seven parts, in the same order. Knowing the pattern lets a reader skip to the part they need.

| part | what it holds |
|---|---|
| the hook | the situation the paper is in, as a scene, and one sentence of what it does |
| **The idea, by example** | a worked toy in our words: a small tensor with its shape, the paper's trick applied step by step. Names the [[data-path]] the paper lives on |
| **What they assume** | the background the paper treats as known: which statistics of the [[orchard]] it takes for granted, which number format, which serving setup |
| **What they show** | their results, each marked by how verifiable it is, quoted as "their measurement" with the section or figure it comes from |
| **What it says about our scenario** | *builds on*, *conflicts with*, *suggests*: each item links to the page of Parts IV–VIII it touches |
| **Their words, ours** | the translation table: the paper's word, our term, where the meanings differ |
| **Receipts** | the citation, and where each number came from |

Two conventions run through all of it. A number from a paper is always "their measurement"; a number from the campaigns carries its grade (verified, quick, code-length estimate, bound) and links to Part VIII. And every outside word is translated the first time it appears, so a page never says "channel" where it means a [[furrow]], or "entry" where it means a [[cherry]] or a [[pick]]. <!-- old-words -->

::: takeaway
- Hook, idea by example, assumptions, results, what it says about our scenario, translation table, receipts: every paper page, in that order.
- "Their measurement" for a paper's number; a grade and a link for ours.
:::

## The trust rule {#trust}

Two rules, both about where in a paper a claim sits.

1. **Background beats results.** What a paper assumes in its introduction and setup is what the field already agrees on; it has been checked by every reader before. A result is one group's measurement, on one rig, with one choice of baseline. The most useful sentence in a lossy KV paper is often the one that says, in passing, which furrows of the keys are large.
2. **Verifiable beats not.** A formula or a count ("16 of 256 exponent values cover 99.8 % of the numbers") can be redone at a desk. A throughput on a private cluster cannot. Between the two sits a benchmark score on a public LLM, which someone could reproduce and usually nobody has.

Read every paper as a source of ideas to try, never of facts to repeat. Where a claim bears on one of our hypotheses ([[#hypotheses-neighbour-similarity]] and its members), the page says which, and whether the claim is evidence or only a hint. The commonest trap is reading a lossy result as a lossless one: "keys survive rounding to 2 bits" is about what the LLM tolerates, and says nothing about how many of a key's bits a predictor can explain ([[#toolbox-exchange-rate]]).

::: note warning A note on our own sources
The first draft of this project quoted its paper numbers from memory. Every number on these pages was re-checked against what could be reached: abstracts, code listings, public summaries, and in a few cases the full text. A number that could not be re-checked says so in its Receipts.
:::

::: takeaway
- Background over results; a count over a throughput; a hint is not evidence.
- Tolerance to rounding is not predictability. Only predictability saves lossless bits.
:::

## The data path {#data-path}

Two questions sort every paper. The first is old: is the method [[lossless]] or [[lossy]]? The second is the one the first draft kept forgetting.

::: define data-path
- **What it is.** The road a compressed orchard travels, and how it is read at the other end. Four roads appear in this Part.
  1. **Bulk transfer.** A whole sequence's orchard moves once, in one piece: from the GPU that read the prompt to the GPU that will write the answer, or to storage. Read front to back.
  2. **Network fetch.** A stored prefix is pulled from another machine to be reused. Bulk too, over a slower wire.
  3. **GPU-memory footprint.** The orchard is kept compressed in [[hbm|HBM]] and decoded whenever attention reads it. Read again and again, next to the attention kernel.
  4. **The miss path.** Our road. On [[pin|the Pin]], per [[layer]] per decode step, about 274 scattered [[pick|picks]] of 640 bytes cross [[link|the link]] from host memory ([[#landscape-derived-numbers]]), and each must be rebuilt alone from its own [[delta]] and a [[dictionary]] already on the GPU.
- **Why it matters.** The path fixes the access pattern, and the access pattern fixes what a compressor may look like, before any statistics are measured. The [[leash]] of [[#scenario-the-leash]] is road 4 written as a rule.
- **Easy to confuse with** the number format. Two papers on the same format can sit on different roads and need compressors of different shapes.
:::

::: theme access-pattern
Every column of the map below is an access pattern. Bulk roads allow compressors that carry state across megabytes; the miss path allows only ones where any single cherry decodes cold. A paper's ratio reaches us only after its compressor survives the change of road.
:::

::: takeaway
- Lossless or lossy, and which road: two questions place a paper.
- The road decides the compressor's shape. Ratios do not travel between roads for free.
:::

## The map {#map}

Columns are data paths. Each card says what the method rebuilds exactly and links to its page.

```graph
id: papers-map
columns: [Bulk transfer & storage, Network fetch, GPU-memory footprint, Miss path (sparse decode), Old theory]
nodes:
  - {id: splitzip, col: 1, row: 1, title: "SplitZip", text: "Lossless. Exponents in a fixed 4-bit code.", link: papers-splitzip, emblem: zip, color: "var(--emerald)"}
  - {id: floats, col: 1, row: 2, title: "ZipNN, DFloat11 & friends", text: "Lossless. Mostly LLM weights.", link: papers-float-coders, emblem: loggrid, color: "var(--emerald)"}
  - {id: kvtc, col: 1, row: 3, title: "KVTC", text: "Lossy. Rotation, rounding, DEFLATE.", link: papers-kvtc, emblem: compass, color: "var(--vermilion)"}
  - {id: kvfetcher, col: 2, row: 1, title: "KVFetcher", text: "Lossy rounding, then a lossless video compressor.", link: papers-kv-codec, emblem: envelope, color: "var(--saffron)"}
  - {id: cachegen, col: 2, row: 2, title: "CacheGen", text: "Lossy. Differences from a reference token, arithmetic-coded.", link: papers-cachegen, emblem: telegraph, color: "var(--vermilion)"}
  - {id: kvcomp, col: 3, row: 1, title: "KVComp", text: "Lossy. Huffman decoding inside attention.", link: papers-kvcomp, emblem: chip, color: "var(--vermilion)"}
  - {id: kivi, col: 3, row: 2, title: "KIVI", text: "Lossy. 2-bit keys and values.", link: papers-kivi, emblem: gauge, color: "var(--vermilion)"}
  - {id: kvquant, col: 3, row: 3, title: "KVQuant", text: "Lossy. Keys before RoPE, outliers escaped.", link: papers-kvquant, emblem: sigma, color: "var(--vermilion)"}
  - {id: lexico, col: 3, row: 4, title: "Lexico", text: "Lossy. One dictionary per LLM.", link: papers-lexico, emblem: scroll, color: "var(--vermilion)"}
  - {id: new, col: 4, row: 1, title: "What would be new", text: "Lossless deltas on the miss path.", link: papers-what-would-be-new, term: kvblockdiff, color: "var(--emerald)"}
  - {id: hisparse, col: 4, row: 2, title: "HiSparse", text: "Exact. No compression: a cache that moves raw picks.", link: papers-hisparse, term: hisparse, color: "var(--lapis)"}
  - {id: selectors, col: 4, row: 3, title: "DSA, NSA, Quest, V4, GLM-5.1", text: "Exact. They decide what a pick covers.", link: papers-sparse-selectors, term: indexer, color: "var(--lapis)"}
  - {id: classics, col: 5, row: 1, title: "The classics", text: "Side information, stack distances, integer rotations.", link: papers-classics, emblem: quill, color: "var(--amethyst)"}
edges:
  - [splitzip, floats, "same trick"]
  - [kvfetcher, cachegen, "token axis"]
  - [splitzip, new, "decoder shape"]
  - [new, hisparse, "builds on"]
  - [hisparse, selectors, "serves"]
  - [new, classics, "leans on"]
```

Read it column by column. Almost everything lossless sits on the bulk road. Almost everything on the GPU-memory road is lossy. The miss path holds one system that moves raw bytes and the selectors that feed it. Nobody has put a lossless compressor there; the card at the top of that column is the subject of [[#papers-what-would-be-new]], and Part VIII is the first measurement of what it could save.

::: takeaway
- Lossless work lives on the bulk road; lossy work fills the GPU-memory road; the miss path has a cache and no compressor.
- The gap on the map is the project, and the campaigns of Part VIII are its first reading.
:::
