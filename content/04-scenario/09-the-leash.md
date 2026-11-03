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
    a: 'The distinct dictionary bytes one cold decode of one cherry may touch: at most the leash of the stretch length, 293 cherries'' worth at 4096 positions'
    wrong: ["The total size of the dictionary", "The number of cherries per punnet", "The GPU memory a shelf may use"]
    why: It is a cap on reads per cherry, checked for every cherry. The dictionary itself may be large; a decode may not wander through it.
    sec: the-rule
  - q: Why does each stretch length have its own leash?
    a: 'Because how strict a leash is depends on how many cherries the punnet holds: 137 of 512 cherries is 26.8 % of the punnet, 293 of 4096 is 7.2 %'
    wrong: ["It does not; the leash is the same at every stretch length", "Because the GPU has a fixed memory", "Because the leash doubles with the stretch"]
    why: 'The leash is counted in the scenario''s own cherry bytes and limits the share of the punnet one decode may read, so the pair (stretch length, leash) is one scenario axis: 512/137, 4096/293, 16 384/1103, whole sequence/14 503.'
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
- **What it is.** The most distinct dictionary bytes a cold decode of one cherry may read, counted in cherries' worth of the scenario's own cherry: `reads(i) <= leash * cherry_bytes` for every cherry `i`. One leash per stretch length: **137** at 512 positions, **293** at 4096, **1 103** at 16 384, **14 503** for the whole sequence. It limits the *worst* cherry, not the mean; re-reads count once; the cherry's own delta is free.
- **Why these numbers.** Primes, so that a reads figure cannot be mistaken for a power-of-two design constant. Each is a small share of its punnet (26.8 %, 7.2 %, 6.7 %, 6.3 to 6.7 %): room for shared structure, no room to unpack the punnet. The whole-sequence leash is the 16 384 share of the shortest sequence, rounded up to a prime.
- **Easy to confuse with** a GPU memory budget. The leash models no deployment; it keeps the search out of the trivial corner. And with the dictionary's size: a dictionary may be far larger than the leash, as long as no single decode walks through more than the leash allows.
:::

```python the leash, as the harness checks it
for i in range(punnet_size):
    touched = dict_reads(deltas[i], dictionary)       # distinct dictionary bytes a cold decode of i read
    assert touched <= leash * cherry_bytes             # 293 × 512 = 150 016 bytes for v[t, l, :, :] at stretch 4096; 293 × 3072 = 900 096 for v[t, :, :, :]
```

Three properties of the rule, each with a reason.

1. **One leash per stretch length, counted in the scenario's own cherry.** How strict a leash is depends on how many cherries the punnet holds, so each stretch length in scope has its own value and the pair is one scenario axis:

   | stretch length | leash (cherries' worth) | share of the punnet one decode may read |
   |---|---|---|
   | 512 | 137 | 26.8 % |
   | 4096 | 293 | 7.2 % |
   | 16 384 | 1 103 | 6.7 % |
   | the whole sequence | 14 503 | 6.3 % to 6.7 % |

   The cap scales with the cherry: leash 293 is 75 008 bytes per decode for `v[t, 0, 0, :]` and 900 096 for `v[t, :, :, :]`. The campaigns ran one value at several stretch lengths; those rows are history ([[#measured-rules-of-the-game]]).
2. **Checked for every cherry, cold, in a fresh process.** The rule was first stated on the mean over a sample of eight cherries per punnet; the human then set it on every cherry. The eight-cherry samples had run up to 26 % below the true worst cherry. Since 31 October the harness forks a decoder per cherry, decodes it from nothing, records the distinct dictionary bytes it touched, then re-decodes a sample with every untouched byte scrambled, which must change nothing ([[#scenario-the-harness]]). Under the protocol of 2026-11-03 this forked check is run for the holdout measurement; during tuning on the dev sequences the reads are counted in process.
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
- Leash: every cold decode of one cherry reads at most the stretch length's leash, 137, 293, 1 103 or 14 503 cherries' worth of dictionary at 512, 4096, 16 384 positions or the whole sequence; counted in the scenario's own cherry; checked per cherry.
- Reads are the measured quantity; the leash is the cap on them.
:::
