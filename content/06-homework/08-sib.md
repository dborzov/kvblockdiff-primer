---
title: 'sib: the Twin'
nav: 'sib: the Twin'
group: Four dictionaries
lede: 'Why build a dictionary at all, when the block is full of entries? The Twin predicts an entry by a sibling from the same block and stores a pointer to it. It is the cheapest dictionary to write down and the noisiest to use: the residual carries the noise of both siblings.'
cards:
  - q: What does a sib dictionary store, and what does it charge per entry?
    a: Nothing beyond the block's own entries; a pointer to the sibling, log₂ b bits per entry
    wrong: ["C centroids; log₂ C bits per entry", "A rotation; no tax", "One location per channel; no tax"]
    why: 'The "dictionary" is the block itself. The pointer is cheap per element on long entries: 12 bits over 640 elements is 0.019.'
    sec: twin
  - q: Why does predicting an entry from a random sibling cost about half a bit per element more than predicting it from the block's per-channel location?
    a: The residual is the difference of two independent noises, so its variance doubles
    wrong: ["Because the pointer costs half a bit", "Because siblings are stored in E4M3", "Because the sibling is from another block"]
    why: 'Variances of independent parts add: 2σ² instead of σ². ½ log₂ 2 = 0.5 bit per element.'
    sec: noise
  - q: When does the Twin beat the Anchor on an entry?
    a: When the entry has a near-duplicate whose shared part is bigger than the noise left in each
    wrong: ["Whenever the block is large", "Whenever channels drift between blocks", "Never"]
    why: 'With a true twin the residual is only the two noises, variance 2σ²_noise, against the Anchor''s σ²_own + σ²_noise. That is smaller only when σ²_own > σ²_noise.'
    sec: noise
  - q: 'With d = 640 and b = 4096, choosing the *nearest* sibling instead of a random one brings the penalty against loc from +0.50 down to about…'
    a: +0.37 bit per element — still a loss
    wrong: ["0 — nearest-sibling search removes the doubling", "−0.5 — it beats loc by half a bit", "+0.9 bit — searching makes it worse"]
    why: In 640 dimensions all siblings are nearly equally far away, so the best of 4095 is only a little closer than a random one (our Monte Carlo).
    sec: noise
  - q: What does the Twin need on the GPU at decode time that the other dictionaries do not?
    a: The sibling entry itself, already decoded
    wrong: ["A rotation matrix", "A codebook", "Nothing at all"]
    why: Its prediction is another entry. That ties sib to residency — and two entries pointing at each other could never be decoded, so real schemes point at a few anchor entries.
    sec: twin
---

Two entries from the same block, first 8 elements of each, as [[integer-grid|INT8]] codes (illustrative numbers):

| element | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|:---|---:|---:|---:|---:|---:|---:|---:|---:|
| entry 1307 | 42 | −23 | 63 | 11 | −53 | 18 | 29 | −7 |
| entry 2954 | 39 | −20 | 65 | 6 | −51 | 14 | 31 | −9 |
| difference | 3 | −3 | −2 | 5 | −2 | 4 | −2 | 2 |

They are near-duplicates: the same token in the same kind of context, perhaps. If the receiver already has entry 2954, it could send entry 1307 as the bottom row plus a note saying "like 2954". That is the fourth dictionary.

## Borrow a sibling {#twin}

::: define sib
- **What:** predict an entry by another entry of the same [[block]] — its nearest "sibling" — and store the exact difference plus a pointer to the sibling.
- **Weight:** nothing extra. The siblings are entries the store keeps anyway. Its codebook is the block itself.
- **Per-entry tax:** the pointer, $\log_2 \vb$ bits per entry. For $\vb = 4096$ and $\vd = 640$: 12 bits, 0.019 bit per element.
- **Not to confuse with** [[vq]]: a codebook is fit and stored; the Twin's "codebook" is the raw, noisy data, free of charge.
:::

The Twin looks almost free: zero weight, a tiny pointer. Its costs hide in two places.

1. **The residual** (next section): a sibling is a noisy prediction.
2. **The decode path.** To rebuild entry 1307, the receiver must already hold entry 2954, decoded. The other three dictionaries are small tables the GPU can keep; the Twin's prediction is another entry, which may itself be a miss. Two practical consequences:
   - Two entries that point at each other can never be decoded. Measurements that pick each entry's nearest *other* entry (leave-one-out) are an optimistic bound. A real store points at a few designated **anchor entries** per block, stored without a sibling and kept resident — an idea parked in [[#questions-parked-dictionaries]].
   - Whether the sibling is on the GPU when it is needed is a residency question of the kind [[#idea-heavy-blocks]] and the [[dictionary-cache]] of IV.4 are about.

::: theme side-info
Here the theme bites hardest. Every dictionary only helps if the receiver really has it; for the Twin, "it" is another KV entry — exactly the kind of thing the hot cache may have evicted. A pointer to a sibling that has to be fetched is not a saving, it is a second miss.
:::

::: takeaway
- sib predicts an entry by a sibling from its block: weight 0, tax $\log_2 \vb$ bits per entry.
- The sibling must be decoded and on the GPU first; pointers must lead back to anchor entries, not in circles.
:::

## Why the noise doubles {#noise}

Write each element of an entry as three parts: what the whole block shares, what this token brings of its own (variance $\vsigma^2_{\text{own}}$), and noise (variance $\vsigma^2_{\text{noise}}$). Then the predictors leave these residuals:

- **the Anchor** ([[#homework-loc]]): own part + noise, variance $\vsigma^2_{\text{own}} + \vsigma^2_{\text{noise}}$;
- **a random sibling:** (own₁ − own₂) + (noise₁ − noise₂), variance $2(\vsigma^2_{\text{own}} + \vsigma^2_{\text{noise}})$;
- **a true twin**, whose own part is the same: noise₁ − noise₂, variance $2\vsigma^2_{\text{noise}}$.

Independent variances add, so a random sibling doubles the residual's variance — half a bit per element *worse* than the Anchor, by the exchange rate of [[#homework-exchange-rate]]:

$$
\text{random sibling:}\quad \tfrac12 \log_2 \frac{2(\vsigma^2_{\text{own}}+\vsigma^2_{\text{noise}})}{\vsigma^2_{\text{own}}+\vsigma^2_{\text{noise}}} = \tfrac12 \text{ bit lost}
$$ {#eq-hwa-sib}

$$
\text{true twin:}\quad \tfrac12 \log_2 \frac{\vsigma^2_{\text{own}}+\vsigma^2_{\text{noise}}}{2\,\vsigma^2_{\text{noise}}} \text{ saved}
$$ {#eq-hwa-twin}

The second is positive only when $\vsigma^2_{\text{own}} > \vsigma^2_{\text{noise}}$: a twin helps only when what the two entries share is bigger than the noise each one carries.

::: figure fig-hwa-sib-twins hwaSibTwins
**When does the Twin beat the Anchor?** Horizontal axis: the noise share of what is left after the block's shared part, $\vsigma^2_{\text{noise}}/(\vsigma^2_{\text{own}}+\vsigma^2_{\text{noise}})$. Curves, in bits per element against the Anchor: an entry with a true twin in its block (solid), and an entry with no twin, predicted from a random sibling (dashed, a flat half-bit loss). **Slide** the share of entries that have a twin and the noise share. The tiles give the net saving per element against the Anchor for the whole block, when each entry may choose the Anchor or the Twin (one flag bit per entry) and twinned entries pay the 12-bit pointer ($\vb = 4096$, $\vd = 640$). Illustrative: Gaussian parts, formulas only.
:::

::: try
1. Set the twin share to 0. Every entry falls back to the Anchor; the Twin's net is just minus its flag bit.
2. Set the twin share to 30 % and the noise share to 10 %. Twinned entries save 1.16 bits each before the pointer; the block saves about 0.34 bit per element.
3. Raise the noise share past 50 %: even true twins stop helping.
:::

Searching for the *nearest* sibling, rather than taking a random one, buys some of the half bit back — but less than one might hope, and less the longer the entries are.

::: figure fig-hwa-sib-nearest hwaSibNearest
**Nearest sibling against the Anchor, on data with no twins at all.** Each line is one entry length $\vd$; horizontal axis: block size $\vb$ (siblings to choose from, log scale); vertical axis: the extra bits per element of the nearest-sibling residual over the Anchor's residual (positive = the Twin loses). Dashed: a random sibling, +0.5. Every entry is independent bell-shaped noise around the block's location, stored as integer codes; bits are measured histogram entropies. **Tick** "add the pointer" to include the $\log_2 \vb/\vd$ tax. Seeded Monte Carlo, `analysis/homework_a_sib.py`.
:::

::: try
1. Find $\vd = 640$, $\vb = 4096$: +0.37. Picking the best of 4095 siblings recovers only a quarter of the half bit.
2. Look at $\vd = 16$: there the nearest sibling beats the Anchor outright. Now tick "add the pointer": the gain is gone. A pointer of $\log_2 \vb$ bits never buys more than $\log_2 \vb$ bits — the same bound as the Hive's index.
:::

That last point is worth keeping: **the Twin is a Hive whose codebook is the block itself** — free to store, but made of noisy entries, and bound by the same rate–distortion limit ([[#homework-vq]]).

On the synthetic worlds of [[#homework-four-side-by-side]] the Twin won exactly one: the world built of near-duplicate pairs, **+0.98 bit** per element, where every other type gained almost nothing. It also did well on clustered data (+1.19, close to the Hive's +1.36), and lost 0.22 bit on pure noise.

::: takeaway
- A sibling's residual carries two noises: a random sibling costs half a bit more than the Anchor.
- A true twin helps only when the shared part beats the noise; nearest-sibling search helps little in 640 dimensions.
- The Twin is the dictionary for near-duplicates — and only if the sibling is on the GPU when needed.
:::
