---
title: Which application, which scenario
nav: Which application
group: Design choices
lede: Every serving design is a scenario of Part IV, and different designs are different scenarios. This page lays the designs out next to the scenarios they need, says what each one still has to measure, and says which of those measurements the campaigns have already made. The application is chosen afterwards, on the numbers.
cards:
  - q: Why do DeepSeek-V3.2 and GLM-5.1 call for different scenarios?
    a: V3.2's indexer picks per layer, GLM-5.1's picks once for a group of layers; one maps to one-layer cherries with a dictionary per layer, the other to multi-layer cherries or a shared dictionary for the group
    wrong: ["They use different number formats", "GLM-5.1 has no orchard", "V3.2 does not use a hot cache"]
    why: What a pick covers decides what one miss must return, hence the cherry shape, and what one dictionary must serve, hence the shelf.
    sec: designs
  - q: Which design's scenario have the campaigns already measured most directly?
    a: 'The per-layer design: `V at one KV layer, v[t, l, :, :] · stretch 4096 · leash 293` is one-layer cherries with one dictionary per layer per stretch'
    wrong: ["GLM-5.1's shared dictionary across a layer group", "DeepSeek-V4's squeezed rows", "The Pin's own MLA latents"]
    why: The C2 screens coded one token's values at one layer against a dictionary fit on that layer's punnet. The other designs need scenarios that have not been run, or data the Bench does not have.
    sec: what-to-measure
  - q: What did the campaigns say about joining several layers into one cherry?
    a: It saved 0.004 of ratio on top of joining the two heads, so layers share little once each has its own reference cherry
    wrong: ["It halved the ratio", "It was never tried", "It made the ratio much worse"]
    why: Joining the two heads saved 0.032; joining all six layers a further 0.0043. A group-shared dictionary would therefore mostly be the union of per-layer dictionaries, and its weight would not shrink.
    sec: what-to-measure
  - q: What is the rule for choosing the application?
    a: Run the scenarios first and choose the design on the numbers, because the design decides which scenario's numbers matter and no design is free
    wrong: ["Pick the design with the most picks per step", "Pick the design HiSparse already uses", "Pick the design with the lightest dictionary"]
    why: A design is a column of the table; its bill is the scenario's bytes times its picks, plus the replay's traffic. The table is read after the numbers are in, not before.
    sec: choosing
---

[[#scenario-why-vary]] gave two reasons to run many scenarios, and the second was that every real serving design *is* a scenario. This Part has priced one design throughout, the one [[pin|the Pin]] runs: a pick is one token's latent at one layer, served by one cherry, with one dictionary per layer per stretch. Other LLMs name their picks differently, and each way of naming a pick is a different column of the table below.

## The designs, as scenarios {#designs}

A [[pick]] is whatever the [[indexer]] names at one decode step ([[#landscape-sparse-attention]]). Four designs name it four ways, and the [[cherry-shape|cherry shape]] follows.

| serving design | what one pick covers | the scenario it needs | what sits on the shelf | what a miss moves |
|---|---|---|---|---|
| **DeepSeek-V3.2 (DSA), per-layer picks** | one token at one layer | one-layer slice; `v[t, l, 0, :]` (640 elements, the MLA latent) on the Pin, `v[t, l, :, :]` (512) on a GQA LLM; one dictionary per layer per stretch | $\vnD$ dictionaries per layer, 78 shelves per sequence on the Pin | one delta |
| **GLM-5.1, shared picks** | one token for a group of layers, selected once | either multi-layer cherries `(n, 640)` with one dictionary per group per stretch, or one-layer cherries served by a dictionary fit on the group's slice | $\vnD$ dictionaries per group, not per layer | one multi-layer delta, or $n$ one-layer deltas against one dictionary |
| **DeepSeek-V4, squeezed picks** | four tokens squeezed into one row | the squeezed row is the cherry; the stretch counts rows, not tokens | per layer, as DSA | one delta of a squeezed row |
| **keys and values moved together** (GQA, no MLA) | both halves of the orchard at one layer | a slice of `k` and `v`, as one `(k[t, l, :, :], v[t, l, :, :])` cherry (1024 elements) or two scenarios whose deltas travel together | one dictionary serving both, or two | two deltas, or one |

Two of the columns are not alternatives to the others: squeezing and moving keys with values are properties of the LLM, and the per-layer-versus-group choice is made on top of them. Where the choice is open, it is a question about bits:

- **One dictionary per layer per stretch.** The dictionary is fit on exactly the cherries it serves; the shelf has $\vNL$ times as many dictionaries per sequence; each miss touches one.
- **One dictionary per layer group per stretch.** The dictionary is fit on $n$ layers' cherries at once. It is worth it if the layers share bits (then one dictionary is lighter than $n$), and it costs if they do not (then it is $n$ dictionaries glued together, loaded and kept as a unit even when only one layer's picks are hot).

::: takeaway
- What a pick covers decides the cherry shape; the cherry shape decides what one dictionary serves; that decides what the shelf holds.
- Per-layer picks map to one dictionary per layer per stretch; shared picks map to multi-layer cherries or a dictionary per layer group.
:::

## What each design needs measured {#what-to-measure}

Each column needs a scenario run and a traffic replay. The scenario side has partly been done.

| design | scenario measurement it needs | status | traffic measurement it needs |
|---|---|---|---|
| per-layer picks (DSA) | the per-layer curve: `V at one KV layer, v[t, l, :, :] · stretch 4096 · leash 293` | **run**: 0.636 (tree) and 0.686 (light) on the Bench's values ([[#measured-scorecard]]); keys one night only ([[#hypotheses-keys-and-values]]) | per-layer popularity, $\vfD$ and loads from a replay |
| shared picks (GLM-5.1) | the same slice with `cherry v[t, :, :, :]`, and the unrun one: one-layer cherries against a dictionary fit on the group | **half run**: joining all six layers into one cherry saved 0.0043 over `v[t, l, :, :]` ([[#measured-cutting-the-tensor]]); the group-dictionary scenario is not run ([[#plan-next-in-the-harness]]) | one popularity per group; whether a group's picks are hot together |
| squeezed picks (V4) | a scenario on squeezed rows | **not possible on the Bench**: no squeezing; two adjacent tokens as one cherry cost +0.037, a hint that the squeezed row is a different object ([[#hypotheses-fallen-apple]]) | as DSA |
| keys and values together | `(k[t, l, :, :], v[t, l, :, :]) · stretch 4096 · leash 293`; in scope since 2026-11-03 as `(k[t, :, :, :], v[t, :, :, :])` (6144 elements) at the four stretch-and-leash pairs | **not run**; keys pre-RoPE are in the dump ([[#plan-the-dataset-we-have]]) | as DSA |
| the Pin itself (GLM-5.1 on MLA latents) | `latent · layer l · cherry (640,)` | **not measurable on the Bench**: Qwen3.5-2B is GQA; a stand-in LLM with MLA is needed ([[#plan-other-experiments]]) | HiSparse's own traces, if shared |

The 0.0043 is the number that decides most. If layers shared many bits, a GLM-style group dictionary would be the natural win, lighter than $n$ per-layer ones for the same deltas. They share almost none once each layer has its reference cherry ([[#hypotheses-upstairs]]), so a group dictionary is close to the union of the per-layer ones. The group design then pays the shelf in units of $n$ dictionaries at a time, which only pays if the group's picks are hot together, a traffic question the replay would answer. The other measured number, the 0.032 from joining the two heads ([[#hypotheses-stereo]]), favours every design whose cherry covers both heads, which all four do on a GQA LLM.

::: note warning What transfers and what does not
Every measured ratio is on Qwen3.5-2B's values, 256- or 512-byte cherries, FP8 E4M3, agent transcripts. Carrying 0.636 to the Pin's 640-byte MLA latents assumes the latent has the same structure as a pair of GQA heads, which nothing has checked; the latent mixes keys and values into one vector and may compress differently in either direction. The ratio is the Bench's; the design table is the Pin's; the arrow between them is the weakest link of this Part.
:::

::: takeaway
- The per-layer design's scenario is run; the group-dictionary scenario, the K+V scenario and anything on squeezed rows or MLA latents are not.
- Joining layers saved 0.004: a group dictionary would be the union of per-layer ones, so GLM-style sharing is a traffic question, not a bits question.
- Every ratio is the Bench's; its transfer to 640-byte latents is assumed.
:::

## Choose on the numbers {#choosing}

The variety of scenarios in [[#scenario-why-vary]]'s catalogue maps onto a variety of applications, and the mapping runs one way. A design does not pick a scenario; it is one, and its bill is that scenario's bytes times its picks, plus the traffic terms only a replay can supply ([[#app-the-napkin]]). So the order of work is the one Part X follows: run the scenarios that distinguish the designs, replay the traffic, then read the table.

What the table says today, with the campaigns' numbers and the napkin's assumptions:

1. A **per-layer design** with a light dictionary resident everywhere is a measured 0.686 of a cherry per miss and no residency question; on the Pin it is 0.88× HiSparse, because memory binds ([[#app-calculator]]). The same design with the reference tree on a shelf is 1.1× HiSparse with one stretch on fire per layer and lever 2, on assumed traffic ([[#app-the-napkin]]).
2. A **group design** inherits the per-layer numbers and adds one bet, that a group's picks are hot together. Nothing measured speaks against it; nothing measured speaks for it.
3. **Squeezed rows and MLA latents** need data the Bench does not have. Until a stand-in LLM with those properties is dumped, the Pin's own design is priced by analogy.

::: theme which-vs-what
A design is a "what" (its cherry shape and dictionary) and a "which" (how its picks fall into stretches). The scenarios of Part IV and the campaigns of Part VIII answer the first for several designs at once; only a pick trace answers the second, and no design can be chosen on half the answer.
:::

::: takeaway
- The application is chosen after the scenarios are run and the traffic is replayed, on the numbers, never before.
- Today the per-layer design is the only one with a measured byte count; its best priced variant is about 1.1× HiSparse on assumed traffic.
:::
