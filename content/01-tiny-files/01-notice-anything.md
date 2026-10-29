---
title: Notice anything?
lede: A weather station on a rock in the sea sends the mainland a short message every half hour. Before any explanation, have a look at a few of them.
vendor: [pako.min.js]
cards:
  - q: In the Gull Rock messages, what changes from one message to the next?
    a: Only a few values, and only by a little
    wrong: ["The order of the keys", "The names of the keys", "Almost every character"]
    why: The skeleton — keys, quotes, colons, commas — is identical every time; the values drift slowly. So each message is mostly predictable from the one before.
    sec: notice
  - q: Roughly what share of a Gull Rock message is new compared with the message just before it?
    a: About 4 % — a handful of digits out of 148 bytes
    wrong: ["About half of it", "Nearly all of it", "None of it — messages repeat exactly"]
    why: The highlighter figure counts it — typically three to eight changed characters per 148-byte message.
    sec: notice
  - q: What does *lossless* compression promise?
    a: The original is rebuilt exactly, bit for bit
    wrong: ["The original is rebuilt approximately, but looks the same", "The data always becomes at least twice as small", "Only the important parts are kept"]
    why: Lossless means exact reconstruction. Lossy compression (JPEG, 2-bit KV quantization) keeps only an approximation. This site is only about lossless.
    sec: compress
  - q: A 148-byte Gull Rock message, compressed by itself with DEFLATE, comes out at about…
    a: 124 bytes — a saving of about one sixth
    wrong: ["15 bytes — ten times smaller", "74 bytes — half the size", "300 bytes — it doubles"]
    why: Run the compression figure. Even though about 96 % of each message repeats the one before, one message alone barely shrinks.
    sec: compress
  - q: Where is the redundancy that DEFLATE misses when it compresses one message at a time?
    a: Between messages — each is predictable from its predecessors
    wrong: ["Inside each message — it repeats its own words", "In the radio link", "Nowhere — the messages are random"]
    why: Each message has few internal repeats; what repeats is the skeleton shared by all messages, which a one-message compressor never sees.
    sec: compress
---

On a rock off a stormy coast — let us call it Gull Rock — stands an automatic weather station. It has a thermometer, a humidity sensor, a barometer, a wind vane and a little camera that looks at the sky. Every thirty minutes it measures everything once and sends one short message to the mainland over a radio link.

The messages are written in JSON, the plain-text format most web services use for small records. Here is the message the station sent at half past two in the afternoon:

```json the 14:30 message
{
  "station": "gull-rock",
  "time": "2026-10-28T14:30Z",
  "temp_c": 11.4,
  "humidity": 0.82,
  "pressure_hpa": 1012.6,
  "wind_kn": 14,
  "wind_dir": "SW",
  "sky": "overcast"
}
```

Here is the one from three o’clock:

```json the 15:00 message
{
  "station": "gull-rock",
  "time": "2026-10-28T15:00Z",
  "temp_c": 11.8,
  "humidity": 0.83,
  "pressure_hpa": 1012.1,
  "wind_kn": 14,
  "wind_dir": "SW",
  "sky": "overcast"
}
```

And here is half past three:

```json the 15:30 message
{
  "station": "gull-rock",
  "time": "2026-10-28T15:30Z",
  "temp_c": 11.8,
  "humidity": 0.83,
  "pressure_hpa": 1011.8,
  "wind_kn": 14,
  "wind_dir": "SW",
  "sky": "overcast"
}
```

Notice anything?

## What there is to notice {#notice}

Take a moment with the three messages before reading on. Then compare your list with this one.

- **The skeleton never changes.** The same eight keys, in the same order, with the same quotes, colons and commas. Only the values move.
- **The values barely move.** The temperature drifts by a few tenths of a degree. The pressure falls by a few tenths of a hectopascal (a storm is coming). The station’s name, the wind direction and the sky do not change at all.
- **Even what changes is predictable.** The time goes up by exactly thirty minutes, every time. Knowing the 15:00 message, you could write most of the 15:30 message before it arrives — and you would get almost every character right.

Those three messages are the start of a longer story. Here are the first two days of the station's archive: 96 messages, drawn as a weather chart and listed exactly as the mainland received them.

::: dataset fig-tiny-messages station-messages view=weather,messages hl=changes metrics=n,bytes,skeleton,new,words,pressure,windmax
**Two days of Gull Rock messages, 28 October 14:30 to 30 October 14:00.** *Plot:* **The weather** draws what the messages report, one column per message: the sky (top band, darker for heavier rain), the air pressure (hPa), the wind speed (knots; the label says where the wind blows from whenever that changes) and the temperature (°C). Hover or tap to read a message, or use the arrow keys; drag across to select a stretch. Red dots mark the five messages in which a word changes. **The messages** lists all 96 as sent, keys and punctuation dimmed, values coloured; click one to select it. *Table:* every message's values, its length in bytes, and how many characters differ from the message before. *Numbers:* what stays fixed and what moves, with what each number means. *Code:* recomputes the numbers from the CSV. Synthetic data from a fixed seed.
:::

A storm comes in over the two days. The pressure falls from 1012.6 to 978.2 hPa, the wind rises from 14 to 51 knots and swings round from south-west to west, and the overcast sky turns to heavy rain. Now switch to **The messages**. Every line has the same shape. The 88 bytes of keys and punctuation never change, and in two days a word changes only five times.

The figure below zooms in on the first twelve messages. They are printed the way they actually travel over the radio: compact, without the spaces and line breaks. Every character that is the same as in the message just above it is faded out. Only what is new stays bright.

::: figure fig-repeats recordRepeats
**Twelve consecutive messages from Gull Rock, one per line**, in the compact form sent over the radio. Faded characters are identical to the same character of the previous message; bright, highlighted characters are new. The right column counts the new bytes in each message. Click a line to select it; the readout below compares it with the message before. Untick the switch to see the messages plain.
:::

Only a handful of characters per message are new — about one byte in twenty-five here, and one in twenty-seven over the whole two days (the *Numbers* tab of [[#fig-tiny-messages]]). The other twenty-four say nothing that the mainland could not have guessed from the previous message.

::: note intuition A familiar feeling
This is the feeling of reading a pile of near-identical forms: after the second one your eyes skip straight to the few boxes that differ. A good compressor should do exactly what your eyes do — send only the boxes that differ.
:::

::: takeaway
- Each message, looked at alone, is ordinary text.
- Side by side, the messages are nearly identical: a fixed skeleton with slowly drifting values.
- So most of every message is predictable from the messages before it.
:::

## The obvious move: compress each message {#compress}

The radio link from Gull Rock is slow and is paid for by the byte. So the station’s software does the obvious thing. Before it sends a message, it runs the message through a compressor — a program that rewrites data into fewer bytes, from which the receiver rebuilds the original.

There are two kinds of compression, and the difference matters for everything that follows.

- [[=lossless|Lossless compression]] rebuilds the original *exactly*, bit for bit. Zip files work like this. A weather service cannot accept "roughly 1011.8 hPa", so the station uses it.
- [[=lossy|Lossy compression]] keeps only an approximation and throws the rest away for good. JPEG photos work like this.

On this site we only ever consider **lossless** compression. Hold on to that; it will matter a great deal when we get to language models.

You would expect a message that is almost entirely predictable to shrink a lot. Try it. The figure runs DEFLATE — the compression algorithm inside zip and gzip — right here in your browser, on one message at a time.

::: figure fig-compress-one compressOne
**One message, compressed by itself.** The selected message is compressed with DEFLATE (the algorithm of zip and gzip; here the pako library at its strongest setting, level 9), live in your browser. The bars show the size of the message before and after, in bytes. Choose another message from the list to try again.
:::

About one sixth disappears. The rest stays. The card below runs the same experiment on all 96 messages of the archive.

::: dataset fig-tiny-alone message-sizes view=alone marks=alone metrics=alone,saved
**Every message, compressed alone.** One column per message of [[#fig-tiny-messages]], in the order sent: the pale bar is the raw message, the solid bar the same message compressed by itself with DEFLATE (pako, level 9, computed live in your browser), in bytes. The grey line is the average. Hover or tap a column for its sizes; drag across to select a stretch. *Numbers:* the average and the share saved.
:::

The solid bars form a flat wall at about 124 bytes. Calm or storm, overcast or rain, the compressor gives back almost all of the bytes we just agreed were predictable.

::: pull
The stream of messages is wildly redundant. Yet each message, compressed alone, barely shrinks.
:::

This contradiction is the whole subject of Part I. Once we swap weather messages for the working memory of a language model, it becomes the subject of the whole site. The next page explains where the missing compression went.

::: takeaway
- Lossless compression rebuilds the original exactly. It is the only kind this site considers.
- One small message, compressed alone, shrinks by only about a sixth — even though about 96 % of it repeats the message before.
- The predictability lives *between* messages, and a compressor that sees one message at a time cannot use it.
:::
