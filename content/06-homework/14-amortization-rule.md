---
title: The amortization rule
group: Scope and economics
lede: One line of arithmetic says how big a block must be before a dictionary stops eating its own gain — and it answers the first draft's question about 128K-token blocks.
cards:
  - q: 'A dictionary of weight $\vw = 256$ is shared by a block of $\vb = 4096$ entries. What does it cost per element?'
    a: 0.5 bit
    wrong: ["0.06 bit", "2 bits", "8 bits"]
    why: '$8\vw/\vb = 8 \times 256 / 4096 = 0.5$ bit per element — a large share of what a block dictionary can hope to save.'
    sec: rule
  - q: 'Why do neither the entry size $\ve$ nor the dimension $\vd$ appear in $8\vw/\vb$?'
    a: At 8 bits per element an entry of $\ve$ bytes has $\vd = \ve$ elements, so they cancel
    wrong: ["Because the dictionary is stored in host memory", "Because every dictionary has the same size", "Because 8w/b is only an approximation for large blocks"]
    why: 'The dictionary has $8\vw\ve$ bits; the block has $\vb\vd$ elements; with $\ve = \vd$ the ratio is $8\vw/\vb$.'
    sec: rule
  - q: Which limit on the block size does the amortization rule set?
    a: The smallest block a dictionary type can afford
    wrong: ["The largest useful block", "Both the smallest and the largest", "Neither: it only concerns the GPU memory"]
    why: '$8\vw/\vb$ falls as $\vb$ grows, so it puts a floor under $\vb$. The data (how fast statistics drift) sets the ceiling.'
    sec: which-end
  - q: In a 100K-token request, what is "a block of 128K tokens"?
    a: Not a block at all — it is request scope
    wrong: ["The ideal block for a 256-centroid codebook", "Two blocks of 64K", "Impossible to build"]
    why: A block longer than the request covers the whole request, so its dictionary is the request's dictionary.
    sec: which-end
  - q: With dictionary cost capped at 0.25 bit per element, what is the smallest block a 256-centroid VQ codebook can afford?
    a: About 8K tokens
    wrong: ["About 64 tokens", "About 1K tokens", "About 128K tokens"]
    why: '$\vb \ge 8 \times 256 / 0.25 = 8192$.'
    sec: which-end
---

The first draft of this proposal asked, in passing: *should the experiments start with 128K-token blocks, or 64K?* It sounds like a question for experiment. Most of it is settled by one line of arithmetic, and the rest by noticing what a 128K-token block actually is.

## Eight w over b {#rule}

::: aside reminder Weight and amortization (IV.2, II.24)
A dictionary's [[weight]] $\vw$ is its size counted in entries: it takes $\vDsz = \vw\,\ve$ bytes. [[amortization|Amortization]] spreads a fixed cost over everyone who shares it — the ferry ticket split among the passengers.
:::

A dictionary of weight $\vw$ is shared by the $\vb$ entries of its block. Its bits, spread over every element of the block, are

$$
\underbrace{\frac{8\,\vw\,\ve}{\vb\,\vd}}_{\text{dictionary bits} \;/\; \text{elements sharing them}}
\;=\; \underbrace{\frac{8\,\vw}{\vb}}_{\text{bits per element}}
\qquad \text{because } \ve = \vd \text{ bytes when elements are 8 bits.}
$$ {#eq-hwb-amortization}

::: keycard The amortization rule
$$ \text{dictionary cost} = \frac{8\,\vw}{\vb} \ \text{bits per element} $$
A dictionary worth $\vw$ entries, shared by $\vb$ entries, adds $8\vw/\vb$ bits to every element it serves.
:::

Put the four dictionary types of this Part into it, at a block of $\vb = 4096$ tokens.

- [[loc]], $\vw \approx 2$: $16/4096 \approx 0.004$ bit. Nothing.
- A rank-16 [[klt]] basis, $\vw = 32$: $0.06$ bit. Small.
- A [[vq]] codebook of 256 centroids, $\vw = 256$: $0.5$ bit. That is more than the whole block rung was worth in the illustrative budget of [[#homework-scope]] (0.37 bit).
- A full KLT basis for $\vd = 2048$, $\vw = 2\vd = 4096$: $8$ bits — the cost of storing every element raw, again.

::: figure fig-hwb-amortization hwbAmortization
**Dictionary cost per element, $8\vw/\vb$, against block size.** Horizontal axis: block size $\vb$ in tokens (log scale, 64 to 256K). Vertical axis: bits per element spent on the dictionary (log scale). One line per dictionary type: loc ($\vw = 2$), a rank-16 KLT basis ($\vw = 32$, bf16 numbers), a 256-centroid VQ codebook ($\vw = 256$) and a full $\vd \times \vd$ KLT basis for $\vd = 2048$ ($\vw = 4096$, dashed). The green band is "affordable" (set by the slider; 0.25 bit by default, as in the first draft); a dot marks where each line enters it. The grey band is longer than a 100K-token request. Drag the gold handle (or focus it and use the arrow keys, which double or halve $\vb$); the table below gives each type's cost at that $\vb$ and the smallest block it can afford. Exact arithmetic, no assumptions except the threshold.
:::

::: try
1. Drag $\vb$ down to 1K. loc and the rank-16 basis stay affordable; the codebook now costs 2 bits per element.
2. Lower the threshold to 0.1 bit. The codebook needs blocks of about 20K tokens.
3. Look at the dashed line. A full basis is affordable only from 128K tokens — longer than the whole request.
:::

::: takeaway
- A dictionary of weight $\vw$ shared by $\vb$ entries costs $8\vw/\vb$ bits per element.
- Light dictionaries (loc, a low-rank basis) are nearly free at any sensible block size; codebooks and full bases are not.
:::

## Which end of the block size this sets {#which-end}

Since $8\vw/\vb$ falls as $\vb$ grows, the rule puts a **floor** under the block size. Choose how much dictionary cost you can tolerate, and each type gets a smallest affordable block, $\vb \ge 8\vw / \text{(tolerated cost)}$. At a quarter of a bit:

| dictionary | $\vw$ | smallest block |
|:--|--:|--:|
| loc | 2 | 64 |
| rank-16 KLT basis | 32 | 1K |
| VQ, 256 centroids | 256 | 8K |
| full KLT basis, $\vd = 640$ | 1280 | 40K |
| full KLT basis, $\vd = 2048$ | 4096 | 128K |

The **ceiling** comes from the data. A block that spans two different stretches of text — a Maine Coon paragraph and then a Siamese one — gets a dictionary that fits neither. How fast the statistics drift is a property of KV caches, not of the coder. The dress rehearsal ([[#homework-rehearsal]]) shows the shape: on synthetic data whose true blocks are 2048 tokens long, the loc rate is best at $\vb = 2048$ and gets worse beyond it.

::: note warning A slip in the first draft
The first draft said this rule sets the *maximum* useful block size and the data the *minimum*. It is the other way round: the dictionary's price limits how *small* a block can be; the drift of the data limits how *large* it is worth making it.
:::

Now the 128K question answers itself.

- **With light dictionaries, any block size from a few hundred tokens up is affordable.** So the block size should be chosen by the data — from the distance curve of [[#questions-framework-a]] — and not guessed in advance.
- **In a 100K-token request, a 128K-token block is not a block.** It covers the whole request, so it is [[scope-request]]. A full basis, which needs 40K to 128K tokens to pay for itself, is therefore only ever a request-scope or global dictionary.

::: theme amortize
Here the fixed cost is the dictionary's $\vw$ entries and the passengers are the $\vb$ entries of its block. Light dictionaries fill the ferry with a handful of passengers; a codebook needs thousands.
:::

::: note connection Storage is not the whole story
$8\vw/\vb$ counts the dictionary against the entries it is *stored* with. On the miss path the dictionary is paid each time it is *loaded* onto the GPU, and then it serves only the misses that land in its block while it stays there. That second kind of amortization is the first break-even condition of [[#homework-break-even]].
:::

::: takeaway
- The amortization rule sets the smallest affordable block per type: 64 tokens for loc, 1K for a rank-16 basis, 8K for a 256-centroid codebook (at 0.25 bit).
- The data's drift sets the largest useful block. Neither is a matter of taste.
- A "block" longer than the request is request scope; full bases live only there or globally.
:::
