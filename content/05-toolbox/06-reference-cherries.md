---
title: Siblings and reference trees
nav: Siblings and reference trees
group: Predictor stages
lede: 'Why build a dictionary at all, when the punnet is full of cherries? The sibling stage predicts a cherry by another cherry of the same punnet and stores a pointer. On paper it is the noisiest predictor in this Part, because the residual carries the noise of both. On the Bench it was the one that worked, once the punnet''s repeats supplied true twins and a tree kept the pointers decodable.'
cards:
  - q: What does the sibling stage write into the dictionary, and into each delta?
    a: Nothing beyond real cherries of the punnet; a pointer to the reference, log₂ b bits, into each delta
    wrong: ["C centroids; log₂ C bits per cherry", "A rotation; no tax", "One location per furrow; no tax"]
    why: 'The "codebook" is the punnet itself. The pointer is cheap per element on long cherries: 12 bits over 512 elements is 0.023.'
    sec: sibling
  - q: Why does predicting a cherry from a random sibling cost about half a bit per element more than predicting it from its furrow locations?
    a: The residual is the difference of two independent noises, so its variance doubles
    wrong: ["Because the pointer costs half a bit", "Because siblings are stored in E4M3", "Because the sibling is from another punnet"]
    why: 'Variances of independent parts add: 2σ² instead of σ², and ½ log₂ 2 = 0.5 bit per element. A true twin, whose own part is the same, is the only sibling that helps.'
    sec: noise
  - q: Why not predict every cherry from its nearest other cherry in the punnet?
    a: 51 % of cherries are mutual nearest neighbours; two cherries that point at each other can never be decoded
    wrong: ["Searching for the nearest cherry is too slow", "The nearest cherry is usually in another punnet", "The nearest cherry is a centroid, not a real cherry"]
    why: The decodable optimum for one reference per cherry is the punnet's minimum spanning tree, which connects everything without a cycle. That is the reference tree.
    sec: measured
---

Two cherries of the toy punnet of [[#toolbox-the-bill]], cherry 1 and cherry 4:

| element | 0 | 1 | 2 | 3 |
|:---|---:|---:|---:|---:|
| cherry 1 | 97 | 15 | 22 | 44 |
| cherry 4 | 97 | 15 | 21 | 45 |
| difference | 0 | 0 | −1 | 1 |

They are near-duplicates: the same token in the same kind of context, perhaps. If the receiver already holds cherry 1, cherry 4 can be sent as the bottom row plus a note saying "like cherry 1". That note and that row are the whole of this stage.

## Borrow a sibling {#sibling}

::: define sib sibling prediction
- **What it is.** Predict a cherry by another cherry of the same [[punnet]], its nearest "sibling", and code the exact difference plus a pointer to the sibling.
- **Dictionary.** Nothing extra in principle: the siblings are cherries the sender keeps anyway. In practice the siblings that others point at must be decodable first, so they are filed in the dictionary, and that is where the dictionary share of every tree compressor comes from.
- **Per-cherry tax.** The pointer, $\log_2 \vb$ bits per cherry: 12 bits at $\vb = 4096$, 0.023 bit per element of a 512-element cherry.
- **Easy to confuse with** [[vq]]: a codebook is invented and stored; the Twin's codebook is the punnet's own raw, noisy cherries.
:::

The stage has a catch that the toy hides. To rebuild cherry 4 the receiver must already hold cherry 1, decoded. If cherry 1 in turn points at cherry 4, neither can ever be decoded. So the references are chosen so that the pointers never form a cycle, and the cherries pointed at are stored where a cold decode can reach them within the [[leash]].

::: define reference-cherry
- **What it is.** A cherry of the punnet, stored in the dictionary (whole, or as its own delta against *its* reference), that a compressor uses as the prediction for another cherry. The delta of the predicted cherry codes the exact difference plus the pointer.
- **Easy to confuse with** a furrow location ([[loc]]): a location is a per-furrow average invented from many cherries; a reference cherry is one real cherry, nothing invented.
:::

::: define reference-tree
- **What it is.** The links from every cherry of a punnet to its reference cherry. The best compressors use the punnet's minimum spanning tree by distance: the links that connect every cherry with the least total distance, so each cherry hangs off its closest relative and nothing points in a circle.
- **How it is read.** Cherries with children sit in the dictionary, each coded against its parent; leaves are deltas on their parent. A cold decode of a leaf reads the path from its parent to the root, which is what the leash counts.
:::

```python the sibling stage, grown into a reference tree
def fit(punnet):
    tree = minimum_spanning_tree(pairwise_distance(punnet))   # parent[i]: the closest relative; no cycles
    dictionary = {}
    for i in order_from_root(tree):                           # parents before children
        if has_children(tree, i):                             # inner node: filed in the dictionary
            ref = rebuild(tree.parent[i], tree, dictionary) if tree.parent[i] is not None else 0
            dictionary[i] = code(punnet[i].astype(np.int16) - ref)   # its own delta against its parent
    return tree, dictionary                                   # laid out along root-to-leaf paths

def encode(i, cherry, tree, dictionary):
    parent = tree.parent[i]                                   # the pointer: log2(b) bits, the per-cherry tax
    return parent, cherry.astype(np.int16) - rebuild(parent, tree, dictionary)   # empty if i is itself an inner node

def decode(parent, residual, tree, dictionary):
    return (rebuild(parent, tree, dictionary) + residual).astype(np.int8)

def rebuild(i, tree, dictionary):                             # walk one path towards the root: the reads of a cold decode
    ref = rebuild(tree.parent[i], tree, dictionary) if tree.parent[i] is not None else 0
    return ref + decode_delta(dictionary[i])
```

::: takeaway
- The sibling stage predicts a cherry by a real cherry of its punnet: nothing invented, a $\log_2 \vb$-bit pointer per cherry.
- Pointers must never form a cycle and must stay reachable from cold: the reference tree is the decodable optimum.
:::

## Why the noise doubles, and when a twin wins {#noise}

Write each element of a cherry as three parts: what the whole punnet shares, what this token brings of its own (variance $\vsigma^2_{\text{own}}$), and noise (variance $\vsigma^2_{\text{noise}}$). The predictors leave these residuals:

- **furrow locations** ([[#toolbox-furrow-statistics]]): own + noise, variance $\vsigma^2_{\text{own}} + \vsigma^2_{\text{noise}}$;
- **a random sibling:** (own₁ − own₂) + (noise₁ − noise₂), variance $2(\vsigma^2_{\text{own}} + \vsigma^2_{\text{noise}})$;
- **a true twin**, whose own part is the same: noise₁ − noise₂, variance $2\,\vsigma^2_{\text{noise}}$.

Independent variances add, so by the exchange rate ([[#toolbox-exchange-rate]]) a random sibling costs half a bit per element *more* than the locations, and a twin saves

$$
\tfrac12 \log_2 \frac{\vsigma^2_{\text{own}}+\vsigma^2_{\text{noise}}}{2\,\vsigma^2_{\text{noise}}}\ \text{bits per element,}
$$ {#eq-toolbox-twin}

which is positive only when $\vsigma^2_{\text{own}} > \vsigma^2_{\text{noise}}$: a twin helps only when what the two cherries share is bigger than the noise each one carries.

::: figure fig-toolbox-sib-twins hwaSibTwins
**When does the Twin beat the Anchor?** Horizontal axis: the noise share of what is left after the punnet's shared part, $\vsigma^2_{\text{noise}}/(\vsigma^2_{\text{own}}+\vsigma^2_{\text{noise}})$. Curves, in bits per element against furrow locations: a cherry with a true twin in its punnet (solid), and a cherry with no twin, predicted from a random sibling (dashed, a flat half-bit loss). **Slide** the share of cherries that have a twin and the noise share. The tiles give the net saving for the whole punnet when each cherry may choose the locations or the Twin (one flag bit per cherry) and twinned cherries pay a 12-bit pointer ($\vb = 4096$, $\vd = 640$). Illustrative: Gaussian parts, formulas only.
:::

::: try
1. Set the twin share to 0. Every cherry falls back to its furrow locations; the Twin's net is minus its flag bit.
2. Set the twin share to 30 % and the noise share to 10 %. Twinned cherries save 1.16 bits each before the pointer; the punnet saves about 0.34 bit per element.
3. Raise the noise share past 50 %: even true twins stop helping.
:::

Searching for the *nearest* sibling instead of a random one buys some of the half bit back, and less the longer the cherry: on data with no twins at all, the best of 4095 siblings in 640 dimensions still costs +0.37 bit per element against the locations (`analysis/homework_a_sib.py`). The Twin is a Hive whose codebook is the punnet itself: free to store, made of noisy cherries, and bound by the same rate–distortion limit, since a pointer of $\log_2 \vb$ bits never buys more than $\log_2 \vb$ bits on bell-shaped data ([[#toolbox-vq]]). It wins on exactly one kind of data: near-duplicates inside the punnet.

::: takeaway
- A sibling's residual carries two noises: a random sibling costs half a bit more than furrow locations; nearest-sibling search recovers little in hundreds of dimensions.
- A true twin helps when the shared part beats the noise. The stage is for near-duplicates, and only if the twin is reachable.
:::

## What the campaigns found {#measured}

The near-duplicates exist, and the text supplies them ([[#measured-night-one]]). On the values of layer 3, head 0, cut into punnets of 4096 tokens, the first campaign's ladder ran entirely on this stage: every fourth cherry filed whole in the dictionary and the rest predicted from their nearest dictionary cherry, **0.7698** from the solo 0.8039; the dictionary cherries themselves coded along a tree, 0.7373; a match-quality class per cherry (8 classes, the biggest single step), 0.7043; references chosen by k-medoids, 0.6890; references set to the inner nodes of the punnet's minimum spanning tree, **0.6731**. The nearest cherry is the *same token again* 55 % of the time in 512-token punnets and 78 % in 4096-token ones; the adjacent token is nearly useless at that layer, sharing 0.058 bit per element (0.31 at layers 7 and 11); 51 % of cherries are mutual nearest neighbours, which is why "each on its nearest" was undecodable and the tree was the answer. Bigger punnets hold more twins: 0.7237 / 0.6731 / 0.6416 / 0.6294 at 512 / 4096 / 16 384 / 32 768 tokens. Shuffle the tokens so that a punnet is a random sample of a layer and the tree compressor falls from 0.6907 to 0.7520 ([[#measured-two-kinds-of-structure]]). Where the pointers go differs by layer: in the middle layers 37 to 47 % of parents sit within 8 tokens, chains along the text; in the first and last layers 7 to 12 %, hubs of far-apart repeats of one token ([[#measured-time-and-bits]]). Part VII names the axis that mattered, repetition rather than distance ([[#hypotheses-echo]], [[#hypotheses-fallen-apple]]). The stage's bill looks nothing like the other predictors': every good tree compressor files 43 to 54 % of the raw bytes in the dictionary, about 80 % of its deltas are empty, a reference cherry costs the same per element inside the dictionary as outside (5.84 against 5.85 bits at layer 11), and a cold decode of the best one reads 120 cherries' worth on average and 226 at worst under a leash of 293 ([[#measured-reading-one-cherry]]).

::: figure fig-toolbox-ladder-c1 msrLadderC1 wide
**The twin ladder of night one.** Bars: MDL ratio at 4096 tokens of each compressor in the first campaign's ladder (values of layer 3, head 0, FP8, two development sequences), with rules at the solo ideal 0.7999 and at 1.0; hover for the trial id. Toggle: the same family at 512 to 32 768 tokens, 0.7237 / 0.6731 / 0.6416 / 0.6294. All verified ledger rows; data from `figures/data/measured-ladders.json`.
:::

::: aside source Receipts
Ladder: r1-t0005, r3-t0002, r1-t0009, r1-t0014, r1-t0019, r1-t0042 on track `v-l3h0-fp8-b4k`; block sizes r1-t0045, r1-t0042, r4-t0008. Same-token rate, adjacency information, the 51 %: C1 analysis, `research/c1/KNOWLEDGE.md` [sim/repeats], [sim/adjacency], [sim/tree]. Shuffle: r12 iter-1-2, iter-1-3. Where references point: r6 iter-2-1 (24 blocks). Dictionary share and empty deltas, reference cost inside vs outside: PART-XI-SPEC §1.9 (101 vs 91; L11 5.84 vs 5.85). Reads: env-t0096 (mean 120.4, p99 184, max 225.8, every entry).
:::

::: takeaway
- Real cherries as references, linked by a minimum spanning tree, carried the first campaign from 0.804 to 0.673; the twin is the same token again.
- The stage files about half the bytes in the dictionary and empties most deltas; its price is reads along a path, kept short by the leash.
:::
