---
title: A measurement is a result
nav: A measurement is a result
group: Design changes
lede: The first weekend's curve is publishable whichever way it comes out — provided the instrument could have seen a positive. Here is why controls turn "we found nothing" into a finding, and the decision table drawn as a map, with the one hole it has.
cards:
  - q: Why was the Michelson–Morley null result convincing?
    a: Their instrument could clearly have seen the expected effect — they expected 0.4 of a fringe and saw less than a twentieth of that
    wrong: ["Because they repeated it a thousand times", "Because nobody expected an effect", "Because the result agreed with theory"]
    why: A null result means something only when the instrument was sensitive enough to see what the hypothesis predicts.
    sec: sensitivity
  - q: Which control shows that the harness could have seen fallen-apple similarity if it were there?
    a: The synthetic dress rehearsal — data with planted block structure, which the method must recover
    wrong: ["The shuffle control", "The round-trip check", "The BF16 column"]
    why: The rehearsal measures sensitivity (no false negatives); the shuffle control guards against false positives.
    sec: sensitivity
  - q: 'In the decision table, request-scope gain 0.5 bit and block-scope gain 0.3 bit fall where?'
    a: In a hole — the sum is 0.8 ≥ 0.75, but the block gain is between 0.15 and 0.4, a case the table does not name
    wrong: ["Go with block scope", "Request scope only", "Publish the negative"]
    why: 'The old table covers g_blk ≥ 0.4 and g_blk < 0.15 for sums above 0.75, not the band between. The plan fills it: run wave 2 with both scopes and let the trace replay decide (IX.9).'
    sec: map
  - q: If wave 1 is negative, what does the field get?
    a: A shuffle-controlled measurement that 8-bit KV has little conditional structure, and a pointer to context-free miss-path coding (about 1.1–1.3× for free)
    wrong: ["Nothing publishable", "A new quantization method", "A proof that the KV cache cannot be compressed at all"]
    why: Nobody has published that number at 8 bits; a negative redirects effort toward solo coding on the miss path.
    sec: plan
---

In 1887 Albert Michelson and Edward Morley floated a light interferometer on a pool of mercury and turned it slowly. If the Earth moved through an "aether", the interference fringes should shift by about 0.4 of a fringe as the instrument turned. They saw a shift of less than a twentieth of that, and probably less than a fortieth.

It is the most famous null result in physics. It was convincing for one reason: the instrument could easily have seen 0.4 of a fringe. Nothing was there to see.

::: note history What the first draft did not say
It framed the project as succeed-or-fail. Item 16 of the old list: *a measurement is a result. The shuffle-controlled distance curve at 8 bits is publishable whether it comes out positive or negative, and the negative result redirects the field.*
:::

## A null needs a sensitive instrument {#sensitivity}

"We looked and found nothing" is worth something only if three things are true. Line the old experiment up against wave 1:

| what a believable null needs | Michelson–Morley, 1887 | wave 1 |
|---|---|---|
| an effect size stated in advance | 0.4 of a fringe, from the Earth's orbital speed | the thresholds 0.25 and 0.75 bit per element, written before the data ([[#plan-decision-rule]]) |
| proof the instrument can see it | fringe shifts far smaller than 0.4 were readable | the synthetic dress rehearsal recovers planted structure of known size ([[#homework-rehearsal]]) |
| a guard against fake positives | turning the apparatus, repeating at different times | the [[shuffle-control]]: every block-local gain must vanish, up to about 0.1 bit of fitting advantage |
| a check that nothing broke in between | — | a real round trip that must rebuild every entry exactly |

The second row is the one people forget. A shuffle control proves that a *positive* is real. Only a planted-structure test proves that a *negative* is real, because it shows the method would have found the effect. Wave 1 has both.

::: theme controls
Here the controls do double duty. The shuffle makes a positive believable; the synthetic truth makes a negative believable. Without both, only one of the two outcomes would be publishable.
:::

::: takeaway
- A negative result counts when the effect size was fixed in advance and the instrument is shown to detect it.
- The shuffle control guards positives; the synthetic dress rehearsal guards negatives. Wave 1 runs both.
:::

## The decision table, drawn as a map {#map}

::: aside reminder The two scope gains
$\vgainreq$ is what a per-request dictionary saves over a global one; $\vgainblk$ is what per-block dictionaries save on top of that ([[#homework-scope]]). Both are in bits per element, for the cheapest dictionary type that reaches them.
:::

Wave 1 ends with two numbers, and the decision table maps them to a next step. Drawn as regions of a plane, it looks like this.

::: figure fig-missed-decision mbDecisionMap
**Wave 1's decision table as a map.** Horizontal: the request-scope gain $\vgainreq$; vertical: the block-scope gain $\vgainblk$; both in bits per element (keys and values weighted by bytes, the better of the two 8-bit formats). Regions follow the old draft's table ([[#plan-decision-rule]]): grey, total below 0.25 bit — negative; saffron, total 0.25–0.75 — marginal; peacock, total above 0.75 with block gain under 0.15 — per-request dictionaries; emerald, total above 0.75 with block gain at least 0.4 — per-block dictionaries. Hatched: a case the table does not name. The dashed line is the shuffle floor (about 0.1 bit of in-sample fitting advantage). Drag the knob (or focus it and use the arrow keys); the readout gives the reading, the next step and the paper that outcome would produce.
:::

::: try
1. Drag the knob into each colour. Every region ends in a paper, including the grey one.
2. Put it at (0.5, 0.3): the total is 0.8 bit, but the block gain falls between 0.15 and 0.4. The old table is silent here.
3. Put it just below the dashed line: a block gain under 0.1 bit cannot be told apart from fitting noise, whatever the total says.
:::

Point 2 is a real gap in the old draft's rule. With a total above 0.75 bit, it covers a block gain of at least 0.4 bit (go block-scale) and one below 0.15 (go request-scale), but not the band in between. The plan fills it ([[#plan-decision-rule]]): treat that band as *both scales* — run wave 2 with request and block scope, and let framework C ([[#questions-framework-c]]) and the cost model choose, because both scales contribute and the answer depends on what residency costs.

::: takeaway
- Every region of the map ends in a publishable paper; the decision is about *which* paper, not whether there is one.
- The old table has a hole (total ≥ 0.75, block gain 0.15–0.4); the plan fills it with "both scopes, the trace replay decides".
:::

## What changes in the plan {#plan}

- **The weekend is built to end with the curve.** Day 1: the 8-bit rounding functions, the two rate functions and the synthetic control; then the one-hour float diagnostic (1a). Day 2: the exact ladder (1b). Day 3: the table, the distance curve, the decision. Even if every rung is flat, the distance curve with its shuffle control exists by then.
- **The negative is a deliverable, not a fallback.** It would contain the distance curves with the shuffle control, the BF16 column, and the E4M3-versus-INT8 comparison. Its message: *8-bit KV has little conditional structure; code the miss path context-free.*
- **That pivot is worth having.** [[solo|Solo coding]] needs no dictionaries, no blocks and no residency, and is worth about 1.1–1.3× on 8-bit KV ([[#homework-solo-coding]]). In the reference setting it lifts HiSparse's link-bound 109 requests per GPU to roughly 120–142.
- **Write the rule before the data**, including what fills the hole above. That is what makes either answer believable.

What would the first result look like? Here is a distance curve with its shuffle control, measured on the one dataset this site can already measure: the Gull Rock temperatures of [[#missed-block-is-a-knob]].

::: dataset fig-missed-curve-result missed-distance view=curve metrics=g1,g48,shuf
**A distance curve with its control, as wave 1 will draw one.** *Plot:* bits per reading saved by knowing the reading $\vgap$ half-hours earlier (log scale), for the Gull Rock temperatures in time order (blue) and after a seeded shuffle (vermilion, the control); grey lines mark one day and one week. *Numbers:* two points of the curve and the largest value the control ever reaches. Synthetic, seeded data from II.10; for KV entries, the gap is in tokens and the values are 8-bit codes.
:::

Either answer reads off a plot like this. A blue curve far above its shuffled twin is a positive. A blue curve lying on top of it, from an instrument that has been shown to find a planted effect, is a negative worth publishing.

:::: compare Two attitudes to the same weekend
::: col A bet
- Success = a compression ratio.
- A flat curve is a failure, quietly dropped.
- Controls are optional extras.
:::
::: col A measurement
- Success = a believable number, either sign.
- A flat curve is a finding nobody has published at 8 bits.
- Controls are what make the number publishable.
:::
::::

::: takeaway
- Whatever wave 1 finds, the distance curve with its controls is the first result.
- A negative points to a free 1.1–1.3× (solo coding on the miss path); a positive points to wave 2.
:::
