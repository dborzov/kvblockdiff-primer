---
title: The contract
nav: The contract
group: The rules
lede: Two functions and one equality. Everything a compressor is allowed to do, and everything it must deliver, fits in three lines of Python.
cards:
  - q: What are the two functions of the contract?
    a: '`deltas, dictionary = compress(punnet)` once, and `decompress(deltas[i], dictionary)` for any cherry `i`'
    wrong: ["fit, encode, decode", "train, predict, score", "load, store, evict"]
    why: The sender compresses a whole punnet once; the receiver decompresses one cherry at a time. The harness supplies everything else.
    sec: two-functions
  - q: What does "decoded cold" mean?
    a: The receiver rebuilds a cherry from nothing but its own delta, the dictionary and the scenario's constants, without having decoded any other cherry first
    wrong: ["The decoder runs on the CPU instead of the GPU", "The dictionary is reloaded before every cherry", "The cherry is decoded twice and compared"]
    why: One cherry at a time, at random, means no neighbour has been decoded before. A compressor that needs the previous cherry first breaks the contract.
    sec: two-functions
  - q: Which of these may a dictionary contain?
    a: 'Anything at all: statistics, a basis, a codebook, an entropy-coder table, reference cherries, the weights of a small network'
    wrong: ["Only per-furrow means and scales", "Only a codebook of centroids", "Only bytes copied from the punnet"]
    why: The dictionary is opaque to the scenario. The scenario counts its bytes and checks the leash; what a compressor does with it is the compressor's business.
    sec: the-dictionary
  - q: Which of these is charged by the scenario?
    a: The bytes of the dictionary
    wrong: ["How the sender stores and catalogues the deltas", "The length field of each delta", "The shape of a cherry"]
    why: Sender-side bookkeeping is free (host memory is not the bottleneck), delta lengths are not counted by ruling, and the scenario's constants are known to both sides in advance.
    sec: known-in-advance
---

Here is the whole contract. Every compressor the campaigns wrote, all 126 of them, implements these two functions and nothing else, and every score on this site was produced under this equality.

```python the contract
deltas, dictionary = compress(punnet)                 # once, on the sender's side, as slowly as it likes
decompress(deltas[i], dictionary) == punnet[i]        # for every i, bit for bit, decoded cold
```

## Two functions, one equality {#two-functions}

::: define contract
- **What it is.** `compress` takes one [[punnet]] and returns one [[dictionary]] (bytes) and one [[delta]] per [[cherry]] (bytes). `decompress` takes one delta and the dictionary and must return that cherry exactly. Both outputs are opaque bytes; the scenario never looks inside them.
- **Example.** Compressor 121 of campaign C2 on a punnet of 4096 cherries of 512 bytes: a dictionary of 1.1 MB and 4096 deltas averaging 57 bytes, about 80 % of them empty. Every one of the 294 912 cherries of its screen came back bit for bit from a separate process ([[#measured-rules-of-the-game]]).
- **Easy to confuse with** "almost exact". A single element off by one grid step, once, breaks the contract; the compressor is [[lossy]] and its score is not a result.
:::

The word **cold** carries the access pattern. On the miss path one scattered cherry is wanted now; nothing says its neighbours were wanted before it. So:

::: define cold-decode
- **What it is.** Rebuilding cherry `i` from its own delta, the dictionary and the scenario's constants, in a decoder that has decoded nothing else. The harness enforces it literally: a fresh process per cherry ([[#scenario-the-harness]]).
- **Why it matters.** A stream compressor (zstd over the punnet, arithmetic coding front to back) decodes cherry 2000 only after cherries 0 to 1999. It cannot answer a cold ask for cherry 2000 without decoding 2000 cherries first, so it is out, however good its ratio.
- **Easy to confuse with** "the dictionary is reloaded". The dictionary is held by the receiver throughout; cold refers to deltas, not to the dictionary. How much of the dictionary one cold decode may touch is the [[leash]] ([[#scenario-the-leash]]).
:::

::: figure fig-scn-contract scnContract
**One punnet, one dictionary, one cherry decoded cold.** First table: a toy punnet of six cherries with five elements each (8-bit codes). Second: a dictionary of the lightest kind, one location per furrow (the median down each column). Third: the deltas, each cherry's codes minus the locations. Click a cherry: it is rebuilt from the dictionary and its own delta only (highlighted); no other delta is read. The meter under the dictionary counts the dictionary bytes this decode touched, against a leash drawn at a toy value. Illustrative numbers.
:::

::: try
1. Click cherry 0, then cherry 5. The dictionary lights up every time; only one delta row does.
2. Look at the furrow with the outlier near +97. Its deltas are as small as the others': the location absorbed the big constant.
:::

::: takeaway
- `compress` once per punnet; `decompress` once per ask; the result must equal the cherry bit for bit.
- Cold means no other cherry was decoded first. Stream compressors are out by construction.
:::

## The dictionary is opaque {#the-dictionary}

What goes into the dictionary is the compressor's business. The scenario counts its bytes and checks the leash; it does not ask what the bytes mean. The campaigns' dictionaries held, variously:

- per-[[furrow]] locations and scales ([[#toolbox-furrow-statistics]]);
- a handful of directions, a partial [[klt|KLT]] basis ([[#toolbox-klt]]);
- a [[codebook]] of centroids ([[#toolbox-vq]]);
- tables for the [[entropy-coder]]: which 8-bit code is how likely, per furrow;
- a table of which elements predict which, with weights ([[#toolbox-linear-prediction]]);
- whole **reference cherries**: earlier cherries of the punnet stored in full, for others to be coded as differences against them ([[#toolbox-reference-cherries]]).

Down the line the dictionary may hold the weights of a small neural network that predicts a cherry from its context, or a large shared table trained on other sequences ([[#measured-where-the-bits-come-from]]). All of it is "the dictionary" to the scenario: bytes the receiver holds before it asks.

::: aside reminder Dictionary and delta (I.3)
On [[#tiny-files-trained-dictionary]] a [[dictionary]] was side information shared by many items and sent once, and a [[delta]] what remained to send per item. Here the items are cherries and the dictionary serves one punnet.
:::

::: takeaway
- A dictionary may hold statistics, bases, codebooks, tables, reference cherries or network weights; the scenario only counts its bytes.
:::

## Known in advance, and not charged {#known-in-advance}

Both sides know the scenario before the first ask, so none of this costs bytes: the stretch length, the slice, the cherry shape, `cherry_bytes`, `punnet_size`, the number format, and which cherry is being asked for. The compressor's own code, and any fixed table that depends on no data, are known too.

Three more things are not charged, by decision:

| not charged | why |
|---|---|
| how the sender stores, indexes and catalogues its deltas | host memory is plentiful and is not the bottleneck under study; only what crosses to the receiver counts |
| each delta's own length field | ruled out by the human on 30 October 2026; worth 0.0003 to 0.0024 of ratio and no change of winner |
| the time `compress` takes | it runs once, offline; only `decompress` is on the miss path, and its speed is measured separately ([[#plan-decoder-speed]]) |

One thing that looks free and is not: a dictionary fit on data it is later scored on, in global scope. That is a peek at the answer, and [[#scenario-scope]] says who pays for it.

::: takeaway
- The scenario's constants and the identity of the asked cherry are free; the dictionary's bytes and every delta's bytes are charged.
- Sender-side bookkeeping, delta length fields and compression time are not charged.
:::
