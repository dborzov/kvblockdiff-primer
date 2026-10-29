---
title: 'Dictionary scope: global, request, block'
nav: Dictionary scope
group: Scope and economics
lede: Every dictionary is fit on something and shared by whoever uses it. That one choice — its scope — decides how well it predicts and what it costs, and it turns the cat-thread ladder into three rows of one table.
cards:
  - q: Which scope's dictionary is fit once, offline, on a calibration corpus and shared by every request?
    a: Global scope (the Globe)
    wrong: ["Request scope (the Thread)", "Block scope (the Brick)", "None — every dictionary belongs to one request"]
    why: A global dictionary is like the almanac — written once for everyone. It costs nothing at serving time and captures only what all texts have in common.
    sec: three-notebooks
  - q: Request scope is the same thing as block scope with which block size?
    a: '$\vb = \vL$ — one block covering the whole request'
    wrong: ['$\vb = 1$ — one token per block', '$\vb = \vB$ — one block per hot cache', '$\vb = \vk$ — one block per selection']
    why: The scopes are nested. Stretch a block until it covers the whole request and its dictionary becomes the request's dictionary.
    sec: three-notebooks
  - q: In the reference setting, what does a request-scope dictionary of weight $\vw = 256$ cost on the link?
    a: About 12.8 MB, once, when the request is admitted
    wrong: ["About 12.8 MB at every decode step", "640 bytes per decode step", "Nothing — it lives in host memory"]
    why: '$\vw\,\ve\,\vNL = 256 \times 640\text{ B} \times 78 \approx 12.8$ MB — about one step''s worth of miss traffic, paid once per request.'
    sec: costs
  - q: Block scope, every dictionary kept on the GPU, $\vL = 100\text{K}$, $\vb = 4096$, $\vw = 256$. How much GPU memory do the dictionaries take per layer?
    a: 25 × 256 = 6400 entries' worth — more than the 4096-slot hot cache itself
    wrong: ["256 entries' worth", "About 2 entries' worth", "Nothing — dictionaries are stored in host memory"]
    why: There are ⌈100K/4096⌉ = 25 blocks, each with its own 256-entry dictionary. Heavy per-block dictionaries cannot all stay resident.
    sec: costs
  - q: What does the block-scope gain $\vgainblk$ measure?
    a: Bits per element saved by per-block dictionaries over a per-request one of the same type
    wrong: ["Bits saved by a global dictionary over no dictionary", "The hit-rate gain of a bigger hot cache", "The difference between two dictionary types at the same scope"]
    why: It is fallen-apple similarity at block scale, in bits — the number the whole proposal bets on.
    sec: scope-gains
---

The forecaster at the harbour office plays a game with Gull Rock. Before each pressure reading arrives, she writes down a guess. If the station makes the same guess, it only has to radio how wrong it was — and a small error is cheap to send. She keeps three notebooks for this.

- **The almanac.** Fifty years of averages for the whole coast. On 28 October the pressure is typically 1013 hPa. Printed once, owned by everybody, never rewritten.
- **The storm log.** Notes she started when this storm arrived two days ago. It sits low, around 1005, and keeps falling.
- **The hour sheet.** The last hour, reading by reading: 1001.2, 1001.0, 1000.9.

Each notebook is narrower than the one before, and each guesses better. Each is also more work. The almanac costs her nothing. A storm log must be written for every storm. The hour sheet is torn up and rewritten every hour. And the station has to keep identical copies of all of them, or its guesses will not match hers.

## Three notebooks, three scopes {#three-notebooks}

A KV dictionary faces the same choice. What it is fit on decides who can share it, and that choice is its [[=scope|dictionary scope]]. There are three, and they are exactly the three rungs of the [[cat-ladder]].

::: aside reminder The cat-thread ladder (IV.11)
Take one entry from the Maine Coon part of a long `cat_thread`. Judged against everything a model could ever be asked, it is very surprising. Against the rest of `cat_thread` it is less so. Against the surrounding Maine Coon tokens it is least surprising of all. Global ⊃ thread ⊃ neighbourhood. See [[#idea-cat-thread-ladder]].
:::

::: define scope-global
- **Fit on:** a calibration corpus, once, offline. **Shared by:** every request the GPU ever serves.
- **In the toy world:** the almanac. **On the ladder:** rung 1, "everything a model could be asked".
- **Cost:** nothing at serving time. **Catch:** it knows only what all texts have in common.
:::

::: define scope-request
- **Fit on:** one request's own history (after prefill; refreshed now and then). **Shared by:** every entry of that request, at one layer.
- **In the toy world:** the storm log. **On the ladder:** rung 2, "this is `cat_thread`".
- **Cost:** one load per request, when it is admitted.
:::

::: define scope-block
- **Fit on:** one [[block]] of $\vb$ consecutive tokens. **Shared by:** those $\vb$ entries.
- **In the toy world:** the hour sheet. **On the ladder:** rung 3, "the Maine Coon paragraphs around this entry".
- **Cost:** many dictionaries per request, which must sit on the GPU to be useful.
- **Easy to confuse with:** request scope with a long block. A block as long as the request *is* the request.
:::

The scopes are nested: global ⊃ request ⊃ block. Every entry sits in exactly one block, inside one request, inside the world. So every entry has three dictionaries that could predict it — slide the token in the figure and watch which ones change.

::: figure fig-hwb-scopes hwbScopes
**Three nested scopes.** The outer frame is the global scope: one dictionary (dark blue pill) for every request. Inside are two requests (plum frames), the second one shorter, each with its own request dictionary. Each request is cut into blocks of $\vb$ tokens (orange cells), each with its own block dictionary. The black mark is one token of request 1; its block is filled in. Sliders: request length $\vL$, block size $\vb$ (powers of two) and the token's position. Click a block of request 1 to move the token there. Lengths are illustrative; request 2 is drawn at 55 % of request 1.
:::

::: try
1. Move the token across request 1. The global and request dictionaries stay the same; the block dictionary changes at every boundary.
2. Raise $\vb$ until it reaches $\vL$. Request 1 becomes one block: block scope has collapsed into request scope.
3. Shrink $\vb$ to 1K with $\vL = 128\text{K}$. That is 125 block dictionaries per request per layer. Hold on to that number for the next section.
:::

::: takeaway
- A dictionary's scope is what it is fit on, and therefore who shares it: global (the Globe), request (the Thread) or block (the Brick).
- The scopes are nested, global ⊃ request ⊃ block, and they are the three rungs of the cat-thread ladder.
- Request scope is block scope with $\vb = \vL$.
:::

## What each scope costs {#costs}

Narrower scope fits better, but it costs more dictionary bytes to store, to load and to keep on the GPU. The table counts those costs per request and per [[layer]]; memory is in entries' worth, so $\vw$ means "as much as $\vw$ entries". The last row keeps only $\vnD$ dictionaries on the GPU, in a [[dictionary-cache]].

| scope | dictionaries | crosses the link | GPU memory |
|:--|--:|:--|--:|
| global | 0 (one shared copy) | never | 0 |
| request | 1 | once, at admission | $\vw$ |
| block, all resident | $\lceil \vL/\vb \rceil$ | once, at admission | $\lceil \vL/\vb \rceil\,\vw$ |
| block, cache | $\lceil \vL/\vb \rceil$ | when a block turns busy | $\vnD\,\vw$ |

Plug in the [[reference-setting]] ($\vL = 100\text{K}$ tokens, $\ve = 640$ bytes, $\vNL = 78$ layers), with weights that are **assumed** for illustration.

- **Request scope, $\vw = 256$:** the load is $256 \times 640\text{ B} \times 78 \approx 12.8$ MB. That is about one step's worth of miss traffic (13.7 MB at $\vB = 4096$, see [[#landscape-derived-numbers]]), paid once per request.
- **Block scope, all on the GPU, $\vb = 4096$:** there are $\lceil 100\text{K}/4096 \rceil = 25$ blocks. With $\vw = 32$ that is 800 entries' worth per layer. With $\vw = 256$ it is 6400 — more than the 4096 slots of the [[hot-cache]] itself.
- **Block scope with a dictionary cache:** only $\vnD$ dictionaries stay, so memory is small. The price moves to the link: every newly busy block must have its dictionary loaded while it is busy.

::: theme side-info
A dictionary helps only if the GPU actually holds it when a miss arrives. Global scope gets that for free. Request scope pays once. Block scope pays again and again, either in GPU memory or in loads — the receiver must *have* the almanac, and narrow almanacs are many.
:::

::: takeaway
- Global costs nothing. Request costs one load per request (about 12.8 MB for $\vw = 256$).
- Block scope costs $\lceil \vL/\vb \rceil$ dictionaries per request per layer: in GPU memory if all stay, in loads if only a few do.
- Heavy block dictionaries cannot all stay resident; [[#homework-economics]] works out what that does to requests per GPU.
:::

## Scope gains {#scope-gains}

The bits a narrower scope buys get their own names. Measure the rate in [[bpe]] for one dictionary type at each scope. A [[=scope-gain]] is the drop from one rung to the next:

$$
\vgainreq = \underbrace{\vbpe_{\text{global}} - \vbpe_{\text{request}}}_{\text{what this conversation adds}}, \qquad
\vgainblk = \underbrace{\vbpe_{\text{request}} - \vbpe_{\text{block}}}_{\text{what the neighbourhood adds}}
$$ {#eq-hwb-scope-gains}

Both compare the *same* type ([[loc]] against loc, [[klt]] against KLT), so the difference is due to scope alone. Two facts frame them.

- **Their sign is a theorem; their size is not.** Conditioning never increases entropy ([[#idea-what-is-right]]), so before paying for the dictionary both gains are at least zero. How large they are is exactly what nobody has measured.
- **$\vgainblk$ is the number this project bets on.** It is [[fallen-apple]] similarity at block scale, in bits. The distance curve of [[#questions-framework-a]] is its finer-grained form.

::: aside reminder The exchange rate (II.12)
A predictor that explains a share $\vRsq$ of the variance saves $\tfrac12 \log_2 \frac{1}{1-\vRsq}$ bits per element, for bell-shaped data.
:::

Here is the variance budget of [[#idea-the-trap]] (30 % global, 20 % thread, 20 % block, 30 % noise — **illustrative**), run through the exchange rate:

| rung | variance explained so far | bits saved so far | gain of this rung |
|---|---|---|---|
| global | 30 % | 0.26 | — |
| request | 50 % | 0.50 | $\vgainreq \approx 0.24$ |
| block | 70 % | 0.87 | $\vgainblk \approx 0.37$ |

Two fifths of a bit per element, from a block rung that explains a fifth of all the variance. The synthetic dress rehearsal ([[#homework-rehearsal]]) measures the same two gains on data with a known recipe and finds about 0.10 and 0.16 bit — close to what the exchange rate predicts for that recipe.

::: takeaway
- $\vgainreq$ and $\vgainblk$ are the bits per element saved by narrowing the scope one rung, for the same dictionary type.
- They cannot be negative before the dictionary is paid for; after paying, they can.
- $\vgainblk$ is fallen-apple similarity in bits. The next page asks how much of it the dictionary's own size eats.
:::
