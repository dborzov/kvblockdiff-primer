---
title: Echo similarity (repeats)
nav: Echo similarity
group: The hypotheses
lede: A coding-agent transcript says the same file path, the same function name, the same error line, three hundred tokens apart and thirty thousand tokens apart. The same token in the same kind of context grows nearly the same value cherry, however far away. The reference tree lives on these echoes, and in the data this, not distance, was the axis that mattered.
cards:
  - q: In a punnet of KV layer 0 values, what is a cherry's nearest other cherry, most of the time?
    a: The same token again, 55 % of the time in 512-token punnets and 78 % in 4096-token punnets
    wrong: ["The adjacent token", "The punnet's per-furrow mean", "A random cherry: in 256 dimensions all cherries are equally far"]
    why: The text repeats, and a repeated token in a similar context gives nearly the same cherry. The adjacent token shares only 0.058 bit per element there.
    sec: same-token
  - q: Where do the reference tree's links point at KV layers 0, 4 and 5?
    a: 'Mostly far away: only 9, 7 and 12 % of links stay within 8 tokens, against 37 to 47 % in the middle layers'
    wrong: ["To the adjacent token", "Within 8 tokens about half the time", "To the punnet's first cherry"]
    why: The first and last KV layers build hubs where many far-apart repeats of one token hang off one copy (largest degree 12 to 22); the middle layers build chains (6 to 10).
    sec: same-token
  - q: Tokens were shuffled so each punnet became a random sample of a layer's tokens. What happened to the reference-tree compressor?
    a: Its ratio went from 0.6907 to 0.7520, about 70 % of its gain over solo gone
    wrong: ["Nothing changed", "It improved, because the shuffle spread the repeats", "It failed the contract"]
    why: The shuffle keeps every cherry and destroys its neighbourhood. A gain that lives on nearby repeats must vanish, and did.
    sec: distance
  - q: Why is the echo verdict stated with a caveat about the text?
    a: It was measured on coding-agent transcripts, which repeat unusually often; tool calls repeat about 1.4 times more than prose
    wrong: ["Because the shuffle control failed", "Because only one sequence was used", "Because echoes cannot exist in prose"]
    why: In-stretch repeat rates were 56 to 59 % for tool calls and outputs against 38 to 42 % for prose. Prose and a second LLM are unrun scenarios.
    sec: verdict
---

The first night of the campaigns began with the obvious stage: predict each cherry from the cherry nearest to it in the punnet, by plain Euclidean distance, and store the exact difference ([[#measured-night-one]]). Then someone asked *which* cherry was nearest. At KV layer 0 it was the same token again, 55 % of the time in punnets of 512 tokens and 78 % in punnets of 4096. Not the token before. The same token, from somewhere else in the text.

## The same token again {#same-token}

::: define echo
- **What it is.** An earlier occurrence of the same token, in a similar context, grows nearly the same cherry, however far away it is: `v[t, l]` is cheap given `v[t', l]` when token `t'` is a repeat of token `t`. The neighbour is found by the text, not by a coordinate of the tensor.
- **Mnemonic.** An echo: the same sound coming back from far away.
- **Status.** Measured: the [[reference-tree]] of the best compressors is built of echoes, and the shuffle control kills its gain.
:::

A reference tree links every cherry of a punnet to the cherry it is predicted from, and the best trees are minimum spanning trees by distance: each cherry hangs off its closest relative ([[#toolbox-reference-cherries]]). So the tree is a map of who is close to whom, and reading it answers the fallen-apple question and the echo question at once. On 24 punnets of two sequences:

| KV layer (transformer layer) | links within 8 tokens | largest degree of one cherry | cost of a link, coded | the tree's shape |
|---|---|---|---|---|
| 0 (3) | 9 % | 14 | 9.8 bits | hubs: far repeats hang off one copy |
| 1 (7) | 37 % | 8 | 7.4 bits | chains along the text |
| 2 (11) | 47 % | 6 | 6.6 bits | chains |
| 3 (15) | 39 % | 10 | 7.4 bits | chains |
| 4 (19) | 7 % | 22 | 10.0 bits | hubs |
| 5 (23) | 12 % | 12 | 9.6 bits | hubs |

Two kinds of layer. In the middle of the LLM a cherry's closest relative is usually nearby, and the tree runs along the text like a chain: the next token looks like this one. At the first and last KV layers the closest relative is a *repeat*, wherever it last occurred, and the tree is a set of **hubs**: one copy of a token with a dozen or two far-apart echoes hanging off it. A link in a hub layer costs about 10 bits to write down, because it points anywhere in the punnet; a link in a chain layer costs 7, because it mostly points next door.

A figure for this page is still to be built; meanwhile the table is the figure ([[#measured-cutting-the-tensor]]).

::: takeaway
- At KV layer 0 the nearest cherry is the same token again in 78 % of 4096-token punnets.
- Hub layers (0, 4, 5): links point far, degree 12 to 22. Chain layers (1, 2, 3): links point near, degree 6 to 10.
:::

## Repetition, not distance {#distance}

[[#hypotheses-fallen-apple]] bet on distance. Echoes explain why the bet looked half right and was not. In the chain layers adjacent tokens do share up to 0.29 bit per element raw, but once each cherry has its own reference, 0.02 or less remains: the reference, usually a nearby one there, had already taken it. In the hub layers the adjacent token shares 0.058 bit at KV layer 0 and the reference is far away. Either way the mechanism is "point at the most similar earlier cherry", and the pointer finds a repeat.

Three readings pin this down, all on the values of Qwen3.5-2B at stretch 4096 ([[#scenario-why-vary]]).

1. **The shuffle.** A layer's tokens drawn at random from two sequences into punnets of 4096, both heads of a token kept together, the real compressor run on the result. The reference-tree compressor went from 0.6907 to 0.7520, about 70 % of its gain over [[solo]] gone (0.711 to 0.773 on another slice). The shuffle keeps every cherry and only destroys who is near whom; a gain made of echoes must vanish, and did. A gain made of the LLM's geometry, the linear prediction across elements, stayed within 0.002 ([[#measured-two-kinds-of-structure]]).
2. **Longer stretches keep paying.** More tokens in a punnet, more echoes to point at: the same compressor family reached 0.7237 / 0.6731 / 0.6416 / 0.6294 at stretch 512 / 4096 / 16 384 / 32 768, and the tree alone still gains 0.010 to 0.020 per doubling from 16K to 32K while the prediction rule has long saturated. A bound puts a whole-sequence pool 0.26 to 0.45 bit per element below a 16K punnet.
3. **Hardness is repetition.** How hard a punnet is to compress is one number shared by every layer and head, and it correlates −0.91 with the share of repeated token ids in the window. Repeat more, compress more.

::: theme controls
The shuffle is the control that made the echo a result. Two gains had been added in one score; shuffling the tokens took one of them away and left the other, and only then could each be named.
:::

::: takeaway
- Adjacent tokens share up to 0.29 bit raw in chain layers and 0.02 after a reference; the reference is the mechanism, and it finds repeats.
- Shuffle the tokens and the tree loses 70 % of its gain; lengthen the stretch and it keeps gaining.
:::

## Verdict {#verdict}

The axis that mattered. Every reference-tree number of Part VIII is an echo number: the twin ladder of [[#measured-night-one]] (0.8039 to 0.6731 in one night, almost all of it from real earlier cherries as the guess), the two kinds of structure of [[#measured-two-kinds-of-structure]], and the two kinds of tree of [[#measured-cutting-the-tensor]]. The reading on the old draft's question is blunt: the right neighbour was never a few tokens back; it was the same token again, and a stretch is worth lengthening because it holds more of them.

One caveat carries the whole verdict. The corpus is coding-agent transcripts, which repeat unusually often: in-stretch repeat rates of 56 to 59 % for tool calls and tool outputs against 38 to 42 % for prose, and the gain from references is 1.6 to 2.1 times larger on the tool turns. How much echo similarity prose has, and whether a second LLM's orchard echoes the same way, are unrun scenarios at the top of [[#plan-next-in-the-harness]].

::: note warning Grades
The link shares and degrees are 24 punnets of two sequences; the shuffle is 8 to 41 windows of encoded bytes, not verified; the stretch-length series are verified ledger rows but different screens; the whole-sequence pool is an optimistic bound that allows cycles. The same-token rates are analysis results of the first campaign, not ledger trials.
:::

::: aside source Receipts
Where references point, degrees, link costs: r6 iter-2-1 (24 blocks, value-space L2 tree). Same-token rate: C1 `[sim/repeats]`, `[gen/regimes]`. Lag-1 sharing: r9 iter-1-5; C1 `[sim/adjacency]`. Shuffle: r12 iter-1-2, iter-1-3. Stretch lengths: r1-t0045, r1-t0042, r4-t0008; per-doubling and the pool: r19 iter-1-1, iter-1-2. Hardness r = −0.91: r12 journal SESSION-001. Tool-call repeat rates: C1 `[sim/repeats]`.
:::

::: takeaway
- Verdict: the reference tree lives on echoes, with hubs at KV layers 0, 4, 5 and chains at 1, 2, 3; repetition, not distance.
- Caveat: coding-agent transcripts repeat unusually often; prose and a second LLM are unmeasured.
:::
