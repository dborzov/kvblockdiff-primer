---
title: The leash
nav: The leash
group: The rules
lede: Without one more rule the best score is reached by a trick that helps nobody. The leash is that rule, with a prime number on it.
cards:
  - q: Without the leash, where does the best MDL ratio end up?
    a: With every cherry stored in the dictionary and every delta empty, which is stream compression of the punnet
    wrong: ["With an empty dictionary", "With a dictionary of exactly half the punnet", "It does not change"]
    why: 'Campaign C1 watched the optimum slide to that corner within a day: 0.6705 at 4096 positions with empty deltas. To hand over one cherry the receiver had to decode the punnet.'
    sec: the-corner
  - q: What does the leash limit?
    a: 'The distinct dictionary bytes one cold decode of one cherry may touch: at most 137 cherries'' worth in the baseline scenario'
    wrong: ["The total size of the dictionary", "The number of cherries per punnet", "The GPU memory a shelf may use"]
    why: It is a cap on reads per cherry, checked for every cherry. The dictionary itself may be large; a decode may not wander through it.
    sec: the-rule
  - q: Why is the leash the same at every stretch length?
    a: A leash proportional to the stretch would let two serially compressed halves pass as "half the punnet"
    wrong: ["Because stretches are always 4096 positions", "Because the GPU has a fixed memory", "It is not; it doubles with the stretch"]
    why: The leash is a bound on how far one ask may reach, and that bound should not grow just because the punnet did.
    sec: the-rule
  - q: How is the leash checked?
    a: For every single cherry, decoded cold in a fresh process, recording the distinct dictionary bytes it touched; a sample of cherries is not enough
    wrong: ["On the mean over eight sampled cherries per punnet", "By comparing the dictionary size with the leash", "Only on the first cherry of each punnet"]
    why: The rule was first stated on the mean; the human then set it on every cherry, and the old eight-cherry samples had run up to 26 % below the true worst cherry.
    sec: the-rule
---

The first night of the campaigns began without this rule, and the search found the hole within the hour.

## The corner {#the-corner}

At 10:15 UTC on 30 October 2026 the goal was clarified: explore the whole range of dictionary-versus-delta splits and find where the ratio is lowest. The ratio fell as cherries moved into the dictionary, and kept falling, to the corner where *every* cherry is in the dictionary and every delta is empty: 0.6705 at `stretch_len = 4096`, the best number of the night.

That corner is ordinary stream compression of the punnet. The "dictionary" is the whole punnet, compressed front to back by a sequential compressor; to hand over one cherry, the receiver decompresses the punnet and throws away all but one cherry. Valid under the contract of [[#scenario-the-contract]], because every cherry does come back bit for bit. Useless for one-cherry-at-a-time asks, because every ask costs a whole punnet's decode. The frontier compressors of that night already read half their dictionary for one cold cherry; the all-dictionary one read about 1 490 cherries' worth.

At 11:00 UTC the corner was called what it was, valid and useless, and by 11:20 the rule existed.

::: theme access-pattern
This is the third lesson of Gull Rock ([[#tiny-files-three-lessons]]) in reverse: the receiver *has* the dictionary, and the trick is to hide the whole message in it. The access pattern, one cherry at a time, is what makes the trick a cheat, and the leash writes the access pattern down as a number.
:::

::: takeaway
- Unfenced, the best score is "everything in the dictionary, empty deltas": stream compression of the punnet, useless for cold asks.
:::

## The rule {#the-rule}

::: define leash
- **What it is.** The most dictionary bytes a cold decode of one cherry may depend on, in cherries' worth: `reads(i) <= leash * cherry_bytes` for every cherry `i`. The baseline scenario uses **137**; variants use **293** and **1 103** (the last only at 4096 positions and above). It limits the *worst* cherry, not the mean; re-reads count once; the cherry's own delta is free.
- **Why these numbers.** Primes, so that a number cannot be mistaken for a power-of-two design constant. 137 is "a 128-cherry codebook plus pointers": room for real shared structure, no room to unpack the punnet.
- **Easy to confuse with** a GPU memory budget. The leash models no deployment; it keeps the search out of the trivial corner. And with the dictionary's size: a dictionary may be far larger than the leash, as long as no single decode walks through more than the leash allows.
:::

```python the leash, as the harness checks it
for i in range(punnet_size):
    touched = dict_reads(deltas[i], dictionary)       # distinct dictionary bytes a cold decode of i read
    assert touched <= leash * cherry_bytes             # 137 × 512 = 70 144 bytes on the Bench's (2, 256) cherries
```

Three properties of the rule, each with a reason.

1. **The same at every stretch length.** A leash proportional to the stretch would let two serially compressed halves of a punnet pass as "half the punnet each". The reach of one ask should not grow because the punnet did.
2. **Checked for every cherry, cold, in a fresh process.** The rule was first stated on the mean over a sample of eight cherries per punnet; the human then set it on every cherry. The eight-cherry samples had run up to 26 % below the true worst cherry. Since 31 October the harness forks a decoder per cherry, decodes it from nothing, records the distinct dictionary bytes it touched, then re-decodes a sample with every untouched byte scrambled, which must change nothing ([[#scenario-the-harness]]).
3. **Measured as reads, in cherries' worth.** The quantity a decode actually touched is its [[=reads]]: for compressor 121 above, a mean of 120 and a worst cherry of 226 cherries' worth under a leash of 293 ([[#measured-reading-one-cherry]]).

::: figure fig-scn-leash scnLeash
**Reads against the leash, for every cherry of one punnet.** Horizontal axis: cherries of one punnet in position order (4096). Vertical axis: the distinct dictionary bytes each cold decode touched, in cherries' worth. The dashed line is the leash (choose 137, 293 or 1 103). Three compressors to switch between, drawn from the campaigns' reads records: a reference-tree compressor (mean 120, worst 226), a light no-tree compressor (reads under 5), and the all-dictionary corner (about 1 490 for every cherry). Cherries above the line fail the scenario. Data: `figures/data/measured-reads.json`.
:::

::: try
1. Set the leash to 137 with the tree compressor. Its worst cherries cross the line: that compressor needs the 293 scenario.
2. Switch to the all-dictionary corner. Every cherry is far above every leash, as it should be.
:::

What the leash costs the best compressors is a measured answer: nothing at 4096 positions and above, once the layout keeps each cherry's path through the dictionary short ([[#measured-reading-one-cherry]]).

::: takeaway
- Leash: every cold decode of one cherry touches at most 137 (or 293, or 1 103) cherries' worth of dictionary; the same at every stretch length; checked per cherry.
- Reads are the measured quantity; the leash is the cap on them.
:::
