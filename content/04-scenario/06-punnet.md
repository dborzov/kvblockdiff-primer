---
title: 'The punnet: what one dictionary serves'
nav: The punnet
group: The objects
lede: A stretch, a slice and a cherry shape together produce a set of cherries. That set is what one compress call sees and what one dictionary serves. It needed its own name.
cards:
  - q: What is a punnet?
    a: All the cherries of one stretch under one slice and one cherry shape; what one compress call sees and one dictionary serves
    wrong: ["A range of consecutive token positions", "The whole orchard of one sequence", "The dictionary itself"]
    why: A stretch is positions; a punnet is cherries. The punnet is the unit of compression; the cherry is the unit of delivery.
    sec: the-set
  - q: 'Slice `v[:, [1, 3], 0, :]`, `stretch_len = 4096`, `cherry_shape = (256,)`. How many cherries are in one punnet, and how many raw bytes?'
    a: '8192 cherries, 2 097 152 bytes'
    wrong: ["4096 cherries, 1 048 576 bytes", "4096 cherries, 2 097 152 bytes", "8192 cherries, 4 194 304 bytes"]
    why: 'Two cherries of 256 bytes per token position × 4096 positions = 8192 cherries × 256 B = 2 MiB.'
    sec: the-set
  - q: Which statement about a punnet is false?
    a: A punnet contains every value of its stretch
    wrong: ["A punnet is served by exactly one dictionary", "Two scenarios can cut the same stretch into punnets of different sizes", "A punnet is never a whole orchard"]
    why: A punnet contains what the slice puts in play, which may be one head of one layer. The rest of the stretch's values are not in the punnet.
    sec: not-a-stretch
---

Gull Rock's trained dictionary (Part I) was fit on a sample of messages and then served every message that came after. In the scenario a dictionary serves a fixed set of cherries, and the set is decided before the first ask: it is everything one stretch yields under the slice and the cherry shape. A box of cherries. A punnet.

## The set {#the-set}

::: define punnet
- **What it is.** All cherries of one [[stretch]] under one [[slice]] and one [[cherry-shape|cherry shape]]: `punnet_size` of them, each of `cherry_bytes`. One `compress` call sees exactly one punnet and produces exactly one [[dictionary]] for it, plus one [[delta]] per cherry.
- **Example.** Slice `v[:, l, :, :]`, `stretch_len = 4096`, `cherry_shape = (2, 256)` on [[bench|the Bench]]: a punnet of 4096 cherries of 512 bytes, 2 MiB raw. The same stretch and slice with `cherry_shape = (256,)`: 8192 cherries of 256 bytes, the same 2 MiB.
- **Easy to confuse with** a stretch (positions, not cherries), with the orchard (a punnet is one stretch's worth of one slice), and with the dictionary (the punnet is the data; the dictionary is what the compressor shares across it).
:::

```python from stretch, slice and cherry shape to a punnet
def cherries(stretch_id, scenario):
    lo, hi = stretch_id * scenario.stretch_len, (stretch_id + 1) * scenario.stretch_len
    sl = v[lo:hi][:, [1, 3], 0, :]                       # the slice, for this stretch: (4096, 2, 256)
    return sl.reshape(-1, *scenario.cherry_shape)        # (punnet_size, *cherry_shape)

punnet = cherries(3, scenario)
punnet.shape          # (4096, 2, 256) for cherry_shape (2, 256); (8192, 256) for (256,)
punnet_size  = punnet.shape[0]
cherry_bytes = punnet[0].nbytes                           # 512 or 256
raw_bytes    = punnet.nbytes                              # 2 097 152 either way
```

The raw size of a punnet does not depend on the cherry shape; the number of cherries does. Both matter later: the raw bytes are the denominator of the score ([[#scenario-the-score]]); the cherry count is what the dictionary's cost is spread over ([[#scenario-scope]]).

::: figure fig-scn-punnet scnPunnet
**From one stretch to one punnet.** Top: the slice `v[:, [1, 3], 0, :]` of one stretch of 4096 positions, drawn as two rows (the two layers) of 4096 cells (the positions), each cell a 256-element vector. Bottom: the same elements re-boxed as cherries under the chosen shape, `(256,)` (8192 small boxes) or `(2, 256)` (4096 taller ones). The readout gives `punnet_size`, `cherry_bytes` and the punnet's raw bytes. Switch the shape to watch the boxes merge or split while the bytes stay put.
:::

::: takeaway
- A punnet is the set of cherries one stretch yields under one slice and one cherry shape; one dictionary serves one punnet.
- Its raw bytes depend on stretch and slice only; its cherry count depends on the cherry shape too.
:::

## Not a stretch, not an orchard {#not-a-stretch}

Three sentences that the old vocabulary could not say, and that are now plain:

- **A punnet need not contain every value of its stretch.** Under the slice `v[:, 0, 0, :]` the punnet of stretch 3 holds one head of one layer; the other eleven head-vectors of each position are not in play at all.
- **A punnet is never an orchard.** Sequence scope ([[#scenario-scope]]) makes one stretch as long as the sequence, and the punnet is then the whole *slice* of the sequence, still not the orchard, unless the slice is everything.
- **Two scenarios can cut one stretch into punnets of different sizes** (4096 or 8192 cherries above), and they are different problems with different scores.

::: aside reminder The three independent choices
Stretch: which token positions (a range). Slice: which coordinates of `k` and `v` (layers, heads, elements). Cherry shape: how the slice is diced into units. Any combination is a scenario; the punnet is what falls out.
:::

::: theme amortize
The dictionary is paid once per punnet and shared by `punnet_size` cherries. Spread over the punnet's raw bytes it costs the dictionary share of the score; spread over cherries it is the $8\vw/\vb$ bits per element of [[#school-amortization]].
:::

::: takeaway
- A punnet holds what the slice puts in play, which can be a small part of a stretch's values.
- The three choices (stretch, slice, cherry shape) are independent; the punnet is their product.
:::
