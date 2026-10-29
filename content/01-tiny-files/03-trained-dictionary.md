---
title: The trained dictionary
lede: The station cannot batch its messages. It can do the next best thing — give both ends the same stack of old messages in advance, and let every new message point into it.
vendor: [pako.min.js]
cards:
  - q: In compression, what is a dictionary?
    a: Information both ends hold in advance, shared by many items, so each item can travel short
    wrong: ["A list of words and their meanings", "The compressed form of one message", "A table the receiver rebuilds from every message"]
    why: The dictionary is sent (or installed) once. Every later item can then point into it, as if the compressor had already seen it.
    sec: ship-once
  - q: What does the receiver need to rebuild a message from its delta?
    a: The very same dictionary the sender used
    wrong: ["Nothing — a delta is self-contained", "The previous message's delta", "A copy of the raw message"]
    why: A delta is full of pointers into the dictionary. Only with the same dictionary do the pointers lead to the right bytes.
    sec: ship-once
  - q: With a dictionary of 24 messages from day one, a day-two message (147 bytes) compresses to about…
    a: 22 bytes on average, instead of 125 alone
    wrong: ["125 bytes — dictionaries do not help DEFLATE", "2 bytes", "75 bytes"]
    why: Measured live on all 48 day-two messages; the best is 14 bytes, the worst 27.
    sec: try-it
  - q: Why does a dictionary of just one sample message already do most of the work?
    a: That one message holds the skeleton every message shares — keys, quotes, station name, date
    wrong: ["Because DEFLATE only reads the first message of a dictionary", "Because one message contains every possible reading", "Because the dictionary is compressed first"]
    why: Alone, a message costs 125 bytes; with one sample it costs 30. More samples add only value strings such as "heavy rain", down to about 22.
    sec: try-it
  - q: Besides frequent fragments of sample text, what does a zstd trained dictionary carry?
    a: Ready-made statistics for the second stage, and an ID number
    wrong: ["The compressed messages of the last day", "A list of every possible message", "A password that encrypts the messages"]
    why: The statistics spare each tiny message from describing its own symbol frequencies; the ID lets the receiver check it holds the right dictionary.
    sec: zstd-train
---

Here is a trick worth real money on a radio link paid by the byte. Before the station sends anything, its engineers copy yesterday's messages into the compressor's memory, on the station *and* on the mainland. From then on both compressors behave as if those old messages had just gone over the air. A new message can say "copy 43 bytes from yesterday's 14:00 message" — and the mainland can follow the pointer, because it holds the very same old messages.

The station still sends one message at a time. Each message just has a long, shared past to point into.

## Ship the past once {#ship-once}

That shared past has a name.

::: define dictionary
- **What it is:** information that sender and receiver both hold in advance, shared by many items, so that each item can travel as a short delta (next box). We write it $\vD$.
- **Here:** the last 24 messages of day one (28 October 14:30 to 29 October 14:00), 3,522 bytes, loaded into DEFLATE's look-back window at both ends.
- **Not to be confused with** a book of words and meanings. In compression, a dictionary is anything both ends agree on beforehand. Later on this site it will be a handful of numbers ([[#tiny-files-vectors-not-text]]).
:::

::: define delta
- **What it is:** the bytes needed to rebuild one item exactly, *given its dictionary* — and useless without it. We write it $\vdelta$.
- **Here:** a compressed day-two message, 14 to 27 bytes.
- **Not to be confused with** "the difference between two numbers". A delta can be a difference, but in general it is whatever the item compresses to against $\vD$: copy instructions plus a few literal characters.
:::

Put together, the receiver's job is one line:

$$
\underbrace{\text{message}}_{147\text{ B, exact}} \;=\; \operatorname{decode}\big(\underbrace{\vdelta}_{\approx 22\text{ B, each}},\;\underbrace{\vD}_{3{,}522\text{ B, once}}\big)
$$ {#eq-tiny-decode}

The dictionary is big — 24 times bigger than one message. That is fine, because it travels once and then serves every message after it. The figure plays it out.

::: figure fig-tiny-pipeline dictPipeline
**One dictionary, shipped once; then one small delta per message.** Left column: the station (sender); right column: the mainland (receiver); middle: what crosses the radio. The top row is the dictionary $\vD$ (the last 24 messages of day one), sent once over the dashed arrow. Each row below is one day-two message: its raw size, the size of its delta $\vdelta$ (DEFLATE with $\vD$ as preset dictionary, pako level 9, computed live), and the receiver's check that decoding with $\vD$ gives back the identical message. Press **Send the next message** to send more; the readout keeps a running total of bytes over the radio, against the same messages compressed alone.
:::

After three messages, the dictionary still dominates the bill. After forty, it does not. Exactly when it pays for itself is the second of the [[#tiny-files-three-lessons|three lessons]] on the next page.

::: takeaway
- A [[dictionary]] $\vD$ is information that sender and receiver share in advance, sent once.
- Each message then travels as a [[delta]] $\vdelta$: about 22 bytes instead of 125.
- The receiver rebuilds every message exactly, from $\vdelta$ and $\vD$ together.
:::

## Try it {#try-it}

How many sample messages should go into the dictionary? The figure lets you choose, and compresses live.

::: figure fig-tiny-dict-live dictLive
**Compressing a new message against a dictionary of old ones, live.** The slider sets how many sample messages make the dictionary: the most recent ones of day one, from 0 (no dictionary) to 48 (all of day one). The list picks a new message from day two. Bars: the raw message, the message compressed alone, and compressed with the dictionary — all DEFLATE (pako, level 9) with the dictionary as preset dictionary, in bytes. Plot: horizontal axis, number of sample messages; vertical axis, the average compressed size of all 48 day-two messages, in bytes; dots mark the sizes we precomputed, the accent dot the current slider value.
:::

What the numbers say:

| sample messages in $\vD$ | dictionary size | day-two message, average |
|---:|---:|---:|
| 0 (none) | 0 B | 124.7 B |
| 1 | 148 B | 29.9 B |
| 8 | 1,184 B | 25.7 B |
| 24 | 3,522 B | 22.1 B |
| 48 | 7,090 B | 21.8 B |

- **The first sample does most of the work.** One old message already holds the skeleton every message shares: the keys, the quotes and colons, `gull-rock`, the date. That alone takes a message from 125 bytes to 30.
- **More samples help less and less.** They add the *values* that recur — `"heavy rain"`, `"W"`, recent pressures. From 24 samples to 48 the average barely moves.
- **Dictionaries go stale.** With 24 samples, the first message of day two costs 14 bytes; the last one, a day later, costs 23. The storm has moved on from what the samples saw. Real systems retrain their dictionaries from time to time.

::: try
1. Set the slider to **0**, then **1**. Watch the third bar fall from about 125 to about 30 bytes.
2. Keep it at **24** and step through the list from the first to the last day-two message. The bar creeps up as the weather drifts away from the samples.
3. Find where the plot flattens. Past that point a bigger dictionary costs more to ship and buys almost nothing.
:::

Here is every day-two message, in the order sent, against the 24-message dictionary. It is the same archive as on page [[#tiny-files-notice-anything]].

::: dataset fig-tiny-deltas message-sizes view=dictionary marks=dict metrics=dsize,dict,stale
**Day two, with a dictionary.** One column per day-two message (29 October 14:30 to 30 October 14:00). Pale bar: the message compressed alone. Solid bar: its delta $\vdelta$, the message compressed with the dictionary $\vD$ of the last 24 day-one messages. DEFLATE with a preset dictionary, pako level 9, computed live, in bytes; the grey line is the average delta. Hover or tap a column for its sizes; drag across to select a stretch.
:::

Look at the solid bars from left to right. They climb from 14 bytes to the mid-20s as the storm moves away from what the samples saw. That is the dictionary going stale, one message at a time.

The same thing in a few lines of Python, with the two messages before 15:30 as the whole dictionary:

```python a dictionary of two earlier messages, at both ends
import zlib

m1430, m1500, m1530 = (  # the three messages of page I.1, as sent
    '{"station":"gull-rock","time":"2026-10-28T14:30Z","temp_c":11.4,"humidity":0.82,"pressure_hpa":1012.6,"wind_kn":14,"wind_dir":"SW","sky":"overcast"}',
    '{"station":"gull-rock","time":"2026-10-28T15:00Z","temp_c":11.8,"humidity":0.83,"pressure_hpa":1012.1,"wind_kn":14,"wind_dir":"SW","sky":"overcast"}',
    '{"station":"gull-rock","time":"2026-10-28T15:30Z","temp_c":11.8,"humidity":0.83,"pressure_hpa":1011.8,"wind_kn":14,"wind_dir":"SW","sky":"overcast"}',
)
D = (m1430 + m1500).encode()                  # the dictionary, held by both ends

z = zlib.compressobj(level=9, wbits=-15, zdict=D)
delta = z.compress(m1530.encode()) + z.flush()

u = zlib.decompressobj(wbits=-15, zdict=D)    # the receiver, with the same D
assert u.decompress(delta).decode() == m1530  # rebuilt exactly
print(len(m1530), "->", len(delta), "bytes")  # 148 -> 13 bytes
```

::: takeaway
- With 24 sample messages as the dictionary, a new message shrinks from 147 to about 22 bytes; alone it shrinks only to 125.
- One sample captures the shared skeleton; more samples add recurring values, with fast-diminishing returns.
- A dictionary describes the past. As the data drifts, deltas grow, and the dictionary has to be renewed.
:::

## What zstd actually does {#zstd-train}

The demo above is the simplest possible dictionary: raw sample text in the look-back window at both ends. DEFLATE calls it a *preset dictionary*, and [[zstd]] supports it too. But zstd's real strength is a [[=trained-dictionary|trained dictionary]], built from many samples by a training step.

```bash train once, then compress every message against the dictionary
zstd --train samples/*.json -o gull.dict   # build a dictionary from many sample messages
zstd -19 -D gull.dict msg-1530.json        # compress one message against it
zstd -d  -D gull.dict msg-1530.json.zst    # the receiver needs the very same gull.dict
```

:::: compare Two ways to make a dictionary
::: col Raw sample text (this page's demo)
- $\vD$ = a few recent messages, exactly as sent.
- The second stage (short codes for common symbols) starts from nothing.
- Nothing checks that both ends hold the same $\vD$.
:::
::: col A zstd trained dictionary
- $\vD$ = the fragments that occur most often across many samples, packed into a budget: about 110 KB by default, best trained on about a hundred times that much sample data.
- Plus ready-made code tables, so a tiny message need not describe its own symbol frequencies.
- Plus an ID, written into every compressed message, so the receiver can check it holds the right $\vD$. The next page shows why that matters.
:::
::::

We could not run zstd in this page, so we quote no zstd numbers for Gull Rock. Both columns do the same thing: they move what all messages share out of the messages, into something both ends keep.

::: takeaway
- A [[trained-dictionary]] is built by `zstd --train` from many samples: frequent fragments, ready-made statistics, and an ID.
- This page's raw-sample dictionary is the crude version of the same idea, and it already takes a message from 147 bytes to about 22.
- Either way, what every message shares moves into $\vD$, and each message carries only its own news.
:::
