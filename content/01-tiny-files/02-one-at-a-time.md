---
title: Why one message alone won't shrink
nav: One message alone
lede: A general-purpose compressor saves bytes by pointing back at things it has already seen. A single small message has almost nothing behind it to point at.
vendor: [pako.min.js]
cards:
  - q: What does LZ matching write in place of a string of bytes that appeared earlier?
    a: A short instruction — copy this many bytes, starting that many bytes back
    wrong: ["A hash of the string", "Nothing — repeated strings are simply dropped", "A shorter synonym from a fixed word list"]
    why: The receiver has already rebuilt everything before this point, so it can follow the pointer and copy the bytes itself.
    sec: copy
  - q: Compressed alone, why does one Gull Rock message barely shrink?
    a: Inside one message there are only a few short repeats to copy from
    wrong: ["DEFLATE is a weak algorithm", "JSON text cannot be compressed", "The readings are random numbers"]
    why: Alone, only about a fifth of the message is covered by copies, all three to five bytes long. The long repeats are in the other messages, which the compressor never sees.
    sec: copy
  - q: How is the 15:00 message written when it follows the 14:30 message in the same file?
    a: Five copies of 149 bytes back plus seven literal characters
    wrong: ["As 148 literal characters", "As one copy of the whole message", "As the difference of every number"]
    why: Everything except a few digits (and the line break) is a copy from exactly one message back.
    sec: copy
  - q: Compressed as one log file, the 48 messages of a whole day cost about how much per message?
    a: About 13 bytes
    wrong: ["About 124 bytes, as when compressed alone", "About 60 bytes", "Less than 1 byte"]
    why: 642 bytes for 48 messages. The first message costs about 124 bytes; every later one finds its twin 149 bytes back and adds only about 11.
    sec: together
  - q: Why can't Gull Rock simply send its log in daily batches?
    a: Each message must arrive soon and be readable on its own
    wrong: ["Because a batch compresses worse than single messages", "Because DEFLATE accepts at most 148 bytes at a time", "Because the mainland cannot store a whole log"]
    why: A storm warning cannot wait a day, radio messages get lost, and a reader may want one old message without unpacking a whole day.
    sec: together
---

Take the 15:00 message from the last page and read it slowly, stopping at every stretch you already read in the 14:30 message. You barely get a word in. `{"station":"gull-rock","time":"2026-10-28T1` — seen it. `5:0` — new. `0Z","temp_c":11.` — seen it. Almost the whole message is a repeat.

A compressor reads the same way. The trouble is what it is allowed to read.

## Copy from earlier {#copy}

Nearly every general-purpose compressor — zip, gzip, the inside of PNG, and the modern [[zstd]] defined below — works in two stages.

1. **Copy from earlier.** The compressor reads the data from the front. Whenever the next few bytes already appeared somewhere behind it, it writes a short instruction, "copy 21 bytes, starting 149 bytes back", instead of the bytes. This is [[=lz-match|LZ matching]], after Abraham Lempel and Jacob Ziv, who published the idea in 1977.
2. **Spend fewer bits on common things.** What is left — the characters that were not copies, and the copy instructions themselves — is written with short codes for frequent symbols and long codes for rare ones, the way Morse code gives the common E a single dot. This second stage is called *entropy coding*. [[#school-codes]] and [[#school-arithmetic]] show how it works and how far it can go.

The receiver undoes both stages from the front. When it meets "copy 21 bytes from 149 back", it has already rebuilt those 149 bytes, so it copies them itself. Nothing is approximated: the result is [[lossless]].

The first stage is where most of the saving happens, and it has one need: there must be an earlier copy. The figure shows what it finds. It runs a simple LZ parse on the station's log — one message, then two, then three, one per line.

::: figure fig-tiny-lz lzCopies
**What "copy from earlier" finds in the Gull Rock log.** The text is the first one, two or three messages, one per line (↵ marks a line break). **Bold** characters have to be written out (literals); shaded stretches are copies of something earlier. Hover or tap a copy to see its instruction ("copy n bytes from k bytes back") and to light up the earlier text it copies (green-blue). *What gets written* shows the same text as the compressor emits it. The parse is a simple greedy one (at each position, the longest earlier match of at least 3 bytes), close to but not identical with DEFLATE's; the DEFLATE size in the readout is real, computed live with pako at level 9.
:::

::: try
1. Choose **one message**. Only nine copies, each three to five bytes long (`":"`, `","t`, `wind_`). About a fifth of the message is covered; the rest has to be written out.
2. Choose **two**. The second message becomes five long copies, all from exactly 149 bytes back — one message plus a line break.
3. Switch to **what gets written** and look at the second line. Then add a third message: it needs no new literal characters at all — even its changed digits appeared somewhere earlier.
:::

Written out, the 15:00 message shrinks to this:

```text what the compressor writes for the 15:00 message, after the 14:30 one
↵ [copy 43, 149 back] 5:0 [copy 16, 149 back] 8 [copy 15, 149 back] 3 [copy 21, 149 back] 1 [copy 47, 149 back]
```

Seven literal characters and five copy instructions, instead of 148 characters. Alone, the same message has nothing 149 bytes back. That is the whole story of page [[#tiny-files-notice-anything]] in one picture.

::: takeaway
- A general compressor copies from earlier (LZ matching), then codes what is left with short codes for common symbols.
- A copy needs something earlier to copy. Inside one message there are only a few short repeats.
- Across messages almost everything repeats — but a compressor that sees one message at a time never looks there.
:::

## More messages, smaller messages {#together}

So give the compressor something to look back at. Instead of one message, compress the station's log file: the first n messages, one per line, in one go.

::: figure fig-tiny-per-message perMessage
**Bytes per message against how many messages are compressed together.** Horizontal axis: number of consecutive messages in the log, from 1 to 96 (two days), on a doubling (log) scale. Vertical axis: compressed size of the whole log divided by the number of messages, in bytes. The solid line is DEFLATE (pako, level 9, computed live in your browser for every n); the dashed line is the raw size per message. Move the slider to pick n; the readout gives the whole log before and after.
:::

Some points on the curve:

| messages compressed together | compressed log | per message |
|---:|---:|---:|
| 1 | 124 B | 124 B |
| 2 | 147 B | 73.5 B |
| 8 (four hours) | 218 B | 27.3 B |
| 48 (a day) | 642 B | 13.4 B |
| 96 (two days) | 1,106 B | 11.5 B |

The compressor did not get any smarter. It got context. To see where the context pays, take the log apart again, message by message: how many bytes does each message add when it is appended to the log? The card brings back the archive of [[#fig-tiny-messages]].

::: dataset fig-tiny-log message-sizes view=log hl=first marks=loglater metrics=logfirst,loglater,logday,log96
**What each message adds to the log.** One column per message, in the order sent. Pale bar: the message compressed alone. Solid bar: how much the compressed log grows when this message is appended (compressed size of messages 1 to i, minus that of messages 1 to i − 1). DEFLATE, pako level 9, computed live, in bytes. The red dot marks the first message; the grey line is the average added by the later ones. Hover or tap a column for its sizes; drag across to select a stretch.
:::

One tall column, then a floor. The first message still costs about 124 bytes. Every later message finds its near-twin 149 bytes back and adds only 10 or 11. The second message adds a little more (23 bytes), because the log has only one line to copy from yet.

You can check the start of the curve in Python, whose `zlib` module speaks the same raw DEFLATE:

```python the three messages of page I.1, alone and as one log
import zlib

msgs = [  # the 14:30, 15:00 and 15:30 messages, as sent
    '{"station":"gull-rock","time":"2026-10-28T14:30Z","temp_c":11.4,"humidity":0.82,"pressure_hpa":1012.6,"wind_kn":14,"wind_dir":"SW","sky":"overcast"}',
    '{"station":"gull-rock","time":"2026-10-28T15:00Z","temp_c":11.8,"humidity":0.83,"pressure_hpa":1012.1,"wind_kn":14,"wind_dir":"SW","sky":"overcast"}',
    '{"station":"gull-rock","time":"2026-10-28T15:30Z","temp_c":11.8,"humidity":0.83,"pressure_hpa":1011.8,"wind_kn":14,"wind_dir":"SW","sky":"overcast"}',
]

def deflate(data: bytes) -> bytes:
    z = zlib.compressobj(level=9, wbits=-15)   # raw DEFLATE, as in the figures
    return z.compress(data) + z.flush()

print([len(deflate(m.encode())) for m in msgs])  # each alone:   [125, 125, 125]
print(len(deflate("\n".join(msgs).encode())))    # as one log:   159
```

Python's zlib and the page's pako make slightly different choices, so they disagree by a byte or two (125 versus 124, 159 versus 157). The story is the same.

::: define zstd
- **What it is:** Zstandard, a lossless compressor released by Facebook in 2016 and now built into Linux, databases and web browsers. It has the same two stages as DEFLATE, with a longer look-back and a faster, finer second stage.
- **Why it matters here:** it can be given a *dictionary* ahead of time — the subject of the next page.
- **In the figures:** zstd does not run in this page, so the figures use DEFLATE through pako. We expect zstd's byte counts on these messages to differ by a few bytes and the story not at all, but we have not measured them.
:::

::: note question Then why not just send the log?
Because Gull Rock's messages have to travel one at a time.

- **Freshness.** A storm warning cannot wait for tomorrow's batch. Each reading must leave within minutes.
- **Lost messages.** Radio messages get lost. If a message is written as copies of the one before, losing the one before ruins it.
- **Reading one.** Someone on the mainland may want just the 15:30 reading from three weeks ago. Inside one big compressed log, they would first have to unpack everything in front of it.

Each message must travel, and be readable, *on its own*. That is the tiny-file problem. [[#tiny-files-three-lessons]] comes back to it.
:::

::: takeaway
- Compressed together, messages get far cheaper: 124 bytes alone, 27 in a batch of eight, 13 in a day's log.
- The compressor did not change; it was given earlier messages to copy from.
- But the station must send each message on its own, and the mainland must be able to read each one on its own.
:::
