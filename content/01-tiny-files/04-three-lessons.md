---
title: Three lessons from the dictionary
nav: Three lessons
lede: The dictionary trick works. Before we carry it anywhere else, here is what it teaches — the rest of the site stands on these three lessons.
vendor: [pako.min.js]
cards:
  - q: The same 48 messages cost 124 bytes each compressed one by one, but 13 bytes each compressed as one log. What explains the difference?
    a: Only how the data is cut up and read — one by one, or as one stream
    wrong: ["The log is compressed with a stronger algorithm", "The log throws away repeated values", "Single messages contain more information than the log"]
    why: Same bytes, same compressor. One by one, each message has nothing earlier to copy from; in the log, each finds its twin 149 bytes back.
    sec: always-there
  - q: A 3,522-byte dictionary saves about 103 bytes per message. After how many messages has it paid for itself?
    a: About 34 messages — some 17 hours of Gull Rock
    wrong: ["After the very first message", "After 3,522 messages", "Never — the dictionary always costs more than it saves"]
    why: Break-even = dictionary bytes ÷ bytes saved per message = 3,522 ÷ (124.7 − 22.1) ≈ 34.
    sec: pay-once
  - q: A bigger dictionary gives smaller deltas but pays off later. What decides the best size?
    a: How many messages will share it
    wrong: ["Nothing — bigger is always better", "The size of one message", "The speed of the radio link"]
    why: Per message, you pay dictionary bytes ÷ messages sharing it, plus the delta. Few messages favour a small dictionary; many favour a large one.
    sec: pay-once
  - q: What happens when a delta is decoded with an almost-right dictionary?
    a: Out comes a plausible message with wrong values, and nothing complains
    wrong: ["Decoding stops with an error", "The right message comes out, since the dictionaries nearly match", "The output is empty"]
    why: The pointers land on slightly different bytes. Raw DEFLATE has no check; zstd writes the dictionary's ID into every message to catch this.
    sec: must-have
  - q: Using the previous message as the dictionary compresses well. What is the catch?
    a: Every message then depends on the one before; lose or skip one and the chain breaks
    wrong: ["It compresses far worse than a trained dictionary", "A previous message is too short to be a dictionary", "DEFLATE forbids dictionaries that change"]
    why: It averages 21 bytes, as good as the trained dictionary — but to read one message you need all the messages before it.
    sec: must-have
---

On the last page a 147-byte message became a 22-byte [[delta]]. It is tempting to call that a clever trick and move on. Slow down instead: three things happened there, and each comes back, much bigger, in a language model's memory.

## Lesson 1: the redundancy was always there {#always-there}

Here are the 48 messages of day one, sent three ways. The compressor is DEFLATE every time.

| how the 48 messages travel | bytes in total | per message |
|---|---:|---:|
| raw | 7,090 | 147.7 |
| each compressed alone | 5,966 | 124.3 |
| all compressed together, as one log | 642 | 13.4 |

The data is the same in every row. So is the compressor. The only thing that changes is how the data is cut up and read — and that alone is worth a factor of nine.

:::: compare One stream, or many tiny pieces?
::: col One big stream
- The day's log, read front to back.
- Every message finds its twin one line back: **13 bytes** each.
- Good for an archive or a backup.
- Bad for reading one message: you unpack everything in front of it.
:::
::: col Many tiny, independent pieces
- Each message on its own.
- Nothing earlier to copy from: **124 bytes** each.
- Good for sending at once, reading any one message, and surviving a lost one.
- Bad for compression — unless a [[dictionary]] brings the context along.
:::
::::

So the low compression on page [[#tiny-files-notice-anything]] was never a property of the data. The redundancy was there all along. The *access pattern* — tiny, independent pieces — hid it from the compressor.

::: theme access-pattern
Here the same bytes and the same compressor land a factor of nine apart, only because the messages are read one at a time instead of as a stream. Later, a language model's memory is fetched in exactly this way: small pieces, scattered, each needed on its own ([[#idea-data-layout]]).
:::

::: takeaway
- The stream of messages is highly compressible; each message alone is not.
- What differs is the access pattern: one big stream versus many tiny independent pieces.
- A dictionary is a way to bring a stream's context to a tiny piece.
:::

## Lesson 2: pay once, profit on every message {#pay-once}

Now count everything. The dictionary is not free. Its 3,522 bytes are as much as 28 messages compressed alone. For the very first message, dictionary plus delta is 3,536 bytes — 28 times worse than just compressing that message alone.

The dictionary is a fixed cost, so it wins only by being shared. Per message, the bill is the dictionary's bytes divided among the messages that share it, plus the message's own delta:

$$
\frac{\text{bytes}}{\text{message}} \;=\; \underbrace{\frac{\text{dictionary}}{\text{messages}}}_{\text{paid once, shared}} \;+\; \underbrace{\text{delta}}_{\text{paid by each}}
$$ {#eq-tiny-per-message}

With the 24-message dictionary of the last page:

- shared by two days of messages (96): 3,522 / 96 + 22.1 = **58.8 bytes** per message;
- shared by a year of messages (17,520): 3,522 / 17,520 + 22.1 = **22.3 bytes** per message.

Compressing alone costs 124.7 bytes per message. The dictionary breaks even when its cost is spread thin enough: 3,522 / (124.7 − 22.1) ≈ **34 messages**, about 17 hours of Gull Rock. The figure shows the race.

::: figure fig-tiny-break-even breakEven
**The dictionary's fixed cost against its saving per message.** Horizontal axis: number of messages sent. Vertical axis: total bytes over the radio, in thousands. Vermilion: every message compressed alone (124.7 bytes each, the day-two average). Gold: the dictionary, sent once, then one delta per message (the day-two average delta for that dictionary). Dashed grey: raw messages (147 bytes each). The dot marks break-even, where the solid lines cross. The slider sets how many sample messages make the dictionary; the switch sends the dictionary itself raw or compressed. Averages measured with DEFLATE (pako, level 9) on the 48 day-two messages, extended as straight lines.
:::

::: try
1. Slide down to **1** sample message. The dictionary is tiny (148 bytes) and pays off after two messages — but every delta is about 30 bytes.
2. Slide up to **48**. Deltas shrink to 21.8 bytes, but break-even moves out to 69 messages.
3. Switch to **sent compressed**: the 24-message dictionary shrinks to 390 bytes and pays off after 4 messages. The mainland still has to *keep* all 3,522 bytes, though. Compression cheapens the trip, not the storage.
:::

So "how big should a dictionary be?" has no answer until you know how many items will share it. That question comes back later as a rule with numbers in it ([[#homework-amortization-rule]]).

::: theme amortize
Here the dictionary's 3,522 bytes are paid once and divided among every message that uses it. Below about 34 messages the dictionary is a loss; over a year it costs a fifth of a byte per message.
:::

::: takeaway
- A dictionary is a fixed cost; per message it costs (dictionary bytes) ÷ (messages sharing it).
- It pays off only after enough messages: about 34 for Gull Rock's 24-message dictionary.
- The best dictionary size depends on how many items will share it.
:::

## Lesson 3: the receiver must have the dictionary {#must-have}

A delta is mostly a list of pointers into the dictionary: "copy 43 bytes from 600 bytes back". Without the dictionary those pointers point at nothing. With the wrong dictionary they point at the wrong thing — which is worse.

::: figure fig-tiny-decode decodeCheck
**One delta, decoded with four different dictionaries.** *Sent*: the day-two message of 29 October 14:30 (148 bytes). *Delta*: its 14 bytes, made with the right dictionary (the last 24 messages of day one), shown as hexadecimal numbers. *Rebuilt*: what DEFLATE (pako) gives back when the receiver decodes the delta with the dictionary you choose; characters that differ from the sent message are marked. **An older dictionary** is the first 24 messages of day one; **almost the right one** holds the same 24 messages as the right one, with the last two in swapped order.
:::

- **No dictionary:** DEFLATE refuses ("invalid distance too far back"). The delta asks to copy bytes that the receiver does not have.
- **An older dictionary:** gibberish. Annoying, but at least you notice.
- **Almost the right one:** a perfectly plausible message, with the wrong time, the wrong pressure and the wrong wind speed. Four characters wrong, and nothing complains. A weather service would broadcast it.

That is why a zstd message carries its dictionary's ID (see [[#tiny-files-trained-dictionary/zstd-train]]), and why any system built on dictionaries must answer one question at every single read: *is the right dictionary here?*

::: note question Why not use the previous message as the dictionary?
It is free (both ends already have it) and it works: messages 2 to 96, each compressed against the one before, average 21.1 bytes — as good as the 24-message dictionary.

The catch is the chain: every message depends on the one before. Lose one radio message and the next cannot be decoded. Want the 15:30 reading from three weeks ago? Decode three weeks of messages first. A shared dictionary keeps every message independent: each needs only $\vD$.
:::

In the language-model version of this story, the "receiver" is the GPU, and it can keep only a few dictionaries close at hand at a time. Making sure the right one is there when a delta arrives becomes a part of the design ([[#idea-blockdiff-step-by-step]]).

::: theme side-info
Here the dictionary is what the receiver already knows. The delta is cheap only because of it — and worthless, or quietly wrong, without exactly the right one.
:::

::: takeaway
- A delta is decodable only with the very same dictionary.
- Without it decoding fails; with a slightly wrong one it can succeed and lie. Real formats tag messages with a dictionary ID.
- A shared dictionary keeps items independent; chaining each item to the previous one does not.
:::
