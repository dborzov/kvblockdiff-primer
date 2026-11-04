---
title: 'Two reference settings: the Pin and the Bench'
nav: The Pin and the Bench
group: The numbers
lede: Napkin math needs numbers, and numbers need a concrete machine. This site freezes two. The Pin is HiSparse's GLM-5.1 deployment at 8-bit storage, where misses and milliseconds live. The Bench is the Qwen3.5-2B rig the campaigns measured, where shapes, bytes and ratios live. A pill in the top bar switches between them.
cards:
  - q: Why freeze a reference setting instead of using the best numbers for each question?
    a: So every estimate on the site is comparable, and conclusions can be stated as ratios that carry over to other machines
    wrong: ["Because GLM-5.1 is the best LLM", "Because the numbers are exact", "Because other machines do not use sparse attention"]
    why: The point is not this rig; the point is that all pages use the same one, and name it.
    sec: why
  - q: 'What is one token''s row at one layer on the Pin, and on the Bench?'
    a: '640 B on the Pin (one MLA latent, keys and values together); 512 B of values on the Bench, with keys another 512 B'
    wrong: ["640 B on both", "512 B on both", "50 KB and 3 072 B"]
    why: 'The Pin''s 640 B is derived from GLM-5.1''s 50 KB per token at 8 bits over 78 layers. The Bench''s 512 B is 2 heads × 256 elements, values alone; 50 KB and 3 072 B are the per-token totals over all KV layers.'
    sec: side-by-side
  - q: Which quantities does the Bench lack that the Pin has?
    a: 'Picks per step $\vk$, the miss rates and the time per output token: no indexer ever ran on it'
    wrong: ["The row size and the number of KV layers", "The link bandwidth and the GPU memory", "The stretch length and the storage format"]
    why: 'The Bench is the data-side setting. It has shapes, bytes and measured ratios; the miss side of the economics needs an indexer and a decode loop.'
    sec: side-by-side
  - q: What is a stand-in LLM?
    a: A small open LLM whose orchard is measured in place of the real sparse-attention target
    wrong: ["A smaller copy of GLM-5.1 with the same weights", "The LLM that runs the indexer", "A probability table used by an entropy coder"]
    why: Qwen3.5-2B on the Bench stands in for GLM-5.1. Whether its statistics transfer is itself a risk, and the site says so wherever a Bench number is carried to the Pin.
    sec: side-by-side
  - q: What does the setting switch in the top bar change?
    a: 'The hover reminders of terms and symbols, every live number written with the `[[@key]]` macro, and the figures that read the setting'
    wrong: ["Every number on every page", "Only the glossary page", "The miss rates of HiSparse's trace"]
    why: Prose typed for one setting keeps its numbers and names the setting; only what was written to follow the switch follows it.
    sec: the-switch
---

A recipe that says "add some flour, bake until done" cannot be followed, or checked, or compared with another recipe. Physicists have the same problem with gases, so they agree on *standard conditions*: one temperature, one pressure, and every number in the table is quoted there.

This site needs the same thing, twice over. Every page from here on estimates bytes, seconds and sequences per GPU, and every measurement page reports shapes and ratios. If one page assumed a 30 ms step and another 50 ms, or one a 512-byte row and another 640, nothing could be compared.

## Why freeze {#why}

::: define reference-setting
- **What it is.** One fixed set of numbers that every estimate on the site is quoted for: an LLM and its shapes, a machine, and what was measured on it. The numbers live in one file, `data/settings.yaml`, and every hover reminder reads them from there.
- **Why two.** The deployment the project aims at (GLM-5.1 on HiSparse's server) and the data the project could measure (Qwen3.5-2B's orchard on a desk) are different rigs with different shapes. Each gets a card, a name and an emblem; a sentence that gives a number names its setting.
- **What it is not.** A claim that either machine is the right one, or the best. The job of a reference setting is to make every page use the *same* numbers.
- **Easy to confuse with** a scenario ([[#scenario-one-cherry-at-a-time]]), which fixes what is compressed and how; a setting fixes the LLM, the machine and the measured facts a scenario is run on.
:::

Freezing has a second benefit. Most conclusions on this site come out as **ratios**: "a miss that moves 60 % of a row moves 60 % of the bytes". Ratios carry over to other machines far better than absolute numbers do. If your link is twice as fast, every sequence count doubles, and every comparison between methods stays the same.

::: takeaway
- A reference setting is a frozen rig every number is quoted for, so pages can be compared.
- There are two, because the deployment and the measurable data are different rigs; conclusions are stated as ratios, which travel.
:::

## The Pin and the Bench {#side-by-side}

::: define pin
- **What it is.** HiSparse's GLM-5.1 deployment, eight H200 GPUs, with the orchard converted from BF16 to 8-bit storage: 78 KV layers, one MLA latent of ≈ 640 elements per token per layer, $\vk = 2048$ picks per layer per step, the 100 384-token trace, miss rates 30 / 13.4 / 6.7 % at 2048 / 4096 / 8192 slots, 30 ms per token, a 50 GB/s link, 30 GB of GPU memory per GPU for orchards.
- **What it is for.** The deployment side: misses, link traffic, GPU memory, sequences per GPU, the decode-step deadline. Everything that needs an indexer and a decode loop.
- **Why 8 bits.** HiSparse serves BF16, but 8-bit storage is where serving is heading, and it is the format a compressor on this site must reproduce bit for bit ([[#school-fp8]]). We assume the format changes bytes, not which positions the indexer picks.
- **Its nickname.** The Pin: it pins every estimate to one place.
:::

::: define bench
- **What it is.** The campaigns' rig as a second frozen set of numbers: Qwen3.5-2B's six KV layers, 2 KV heads × 256 elements, 512-byte rows of values (keys another 512 B), 225K-token coding-agent transcripts, FP8 E4M3, stretches of 512 to 32 768 tokens measured, one RTX 5080 with 16 GB, a PCIe 5.0 link taken as 50 GB/s, about 10 GB of GPU memory for orchards.
- **What it is for.** The data side: shapes, bytes, stretch lengths and measured ratios. Every ratio of Part VIII was measured here and nowhere else.
- **What it does not measure.** No indexer ran on it, so there are no picks: $\vk$, the miss rates and $\vtpot$ are not measured, and the chain from bytes to sequences per GPU stops at bytes. The link bandwidth and the 10 GB are assumptions.
- **Its nickname.** The Bench, after the lab table the data was made on.
:::

The LLM on the Bench is a [[=stand-in-llm|stand-in LLM]]: a small open LLM whose orchard is measured in place of the real sparse-attention target. Qwen3.5-2B stands in for GLM-5.1 because its orchard can be dumped on one desk and GLM-5.1's cannot. Whether a ratio measured on a 2B-parameter LLM's values holds for GLM-5.1's latents is an assumption, and every page that carries a Bench number onto the Pin says so ([[#measured-what-it-means]]).

| quantity | symbol | the Pin | the Bench |
|---|---|---|---|
| the LLM | | GLM-5.1 | Qwen3.5-2B, a stand-in |
| what it is for | | deployment: misses, link, memory, sequences per GPU | data: shapes, bytes, stretch lengths, measured ratios |
| KV layers | $\vNL$ | 78 | 6 (of 24; the other 18 are linear attention) |
| one row of the orchard | | one MLA latent, `(1, 640)` | 2 heads × 256 elements of values, `v[t, l, :, :]`, and keys the same |
| elements per row | $\vd$ | ≈ 640, derived from bytes per token | 512 (values), a real layout |
| bytes per row, 8-bit | $\ve$ | **640 B**, keys and values together | **512 B** of values; 1 024 B with keys |
| one token at every KV layer | | ≈ 50 KB | 3 072 B of values |
| storage format | | 8-bit, assumed | FP8 E4M3, one power-of-two scale per layer and tensor, measured |
| context length | $\vL$ | 100 384 tokens (HiSparse's LongBench-V2 prompt) | 225K (219 678 to 229 360 tokens, 30 transcripts, prefill only) |
| stretch length in examples | $\vb$ | 4 096 | 4 096 (512 to 32 768 measured) |
| picks per layer per step | $\vk$ | 2 048 | not measured |
| miss rates at 2K / 4K / 8K slots | $\vm$ | 30 / 13.4 / 6.7 % (Bélády 8.2 % at 4K) | not measured |
| time per output token | $\vtpot$ | 30 ms | not measured |
| the link | $\vWlink$ | 50 GB/s (PCIe Gen5 ×16; 64 on paper) | 50 GB/s, assumed, same slot generation |
| GPU memory for orchards | $\vMhbm$ | 30 GB of 141 (about 240 GB left on 8 × H200 after the weights) | ≈ 10 GB of 16, assumed |
| GPU, host | | 8 × H200 | RTX 5080; Ryzen 7 9700X |

Two symbols come with the machine side. $\vWlink$ is the **link bandwidth**, the bytes per second the link actually carries. $\vMhbm$ is the **GPU memory available for orchards**, per GPU, after the LLM's weights have taken their share: hot caches, and later the dictionaries of Part VI, must fit in it.

Three numbers fall out of the Bench's column the way [[#landscape-derived-numbers]] draws three from the Pin's. One token's values over the six layers are $6 \times 512 = 3\,072$ B, so a 225 000-token sequence holds about 691 MB of values, 1.38 GB with keys, and the 10 GB would hold about seven such orchards whole. One layer's values over a 4 096-token stretch are 2.1 MB. The fourth number, sequences per GPU, needs misses and a step time, and the Bench has neither.

::: figure fig-landscape-settings refSettings wide
**The two settings, side by side.** Left card the Pin, right card the Bench, every key of `data/settings.yaml` on one row: the LLM, KV layers, heads and elements, cherry bytes, picks per step, context length, the stretch length of the examples, miss rates, TPOT, the link, the GPU memory for orchards, the GPU, the format. "Not measured" marks what the Bench never ran. The highlighted card is the setting the pill in the top bar has selected; switch it and the highlight follows.
:::

::: figure fig-landscape-pin refSetting
**The Pin as a pinboard.** Each card is one frozen number of the Pin: its symbol, its value, and (on hover or tap) where it comes from. Cards are grouped into the LLM, the cache and the machine; the last group holds three numbers derived from the others. The switch converts the rows between 8-bit storage (the Pin) and BF16 (what HiSparse actually serves); cards whose value changes are outlined. All values are from the table above; the derived ones are computed live.
:::

::: try
1. Switch to BF16. Only byte counts change: the row, the bytes per token, and what is derived from them.
2. Nothing about *which* positions are picked changes, so the miss rates stay put.
:::

Read the two columns as a division of labour. The Pin owns the miss side of the economics, everything that needs an indexer and a decode loop: $\vk$, $\vm$, $\vtpot$, and so the sequences per GPU. The Bench owns the byte side: what a row is, what a stretch's worth of values weighs, what a compressor saves. A ratio of bytes to bytes may travel from the Bench to the Pin, with a flag; the miss rates cannot travel at all, since the Bench has none.

::: aside source Receipts
- Pin: HiSparse (Xie et al., 2026) as the first draft of this proposal recorded it: 78 sparse layers, top-2048, the 100,384-token LongBench-V2 prompt, 1,799 decode steps, miss rates 30 / 13.4 / 6.7 % (LRU), 17.2 % FIFO, 16.1 % random, 8.2 % Bélády at 4096; 30 ms per token; about 240 GB of KV memory left on 8 × H200; PCIe Gen5 ×16 at 64 GB/s nominal, 50 practical. The 640 B entry is 100 KB of BF16 per token ÷ 78 layers ÷ 2.
- Bench: model geometry, sequences, tool-output shares and the FP8 recipe from `targets/02-qwen3.5-2b-agent-long30/README.md` (the campaigns' spec, `PART-XI-SPEC.md`, §1.1); block sizes 512 to 32,768 from the reading-cost sweep; the machine is one RTX 5080 (16 GB GDDR7) in a PCIe 5.0 ×16 slot with a Ryzen 7 9700X host. 50 GB/s and about 10 GB for KV are assumptions: the link is the Pin's practical figure for the same slot generation; the memory is 16 GB less about 4 GB of BF16 weights for a 2B-parameter model, less headroom.
- Derived: 6 × 512 = 3,072 B per token; 225,000 × 3,072 ≈ 691 MB; × 2 for keys ≈ 1.38 GB; 10 GB ÷ 1.38 GB ≈ 7; 4,096 × 512 B ≈ 2.1 MB; 78 × 640 B = 49,920 B ≈ 50 KB.
- The switch's keys and behaviour: `data/settings.yaml` and `docs/AUTHORING.md` §3.
:::

::: takeaway
- The Pin: GLM-5.1, 78 KV layers, 640 B rows, $\vk = 2048$, 100 384 tokens, 30 / 13.4 / 6.7 % misses, 30 ms, 50 GB/s, 30 GB. The deployment side.
- The Bench: Qwen3.5-2B as a stand-in, 6 KV layers, rows `v[t, l, :, :]` of 2 × 256 elements, 512 B, 225K tokens, FP8, one RTX 5080. The data side; no indexer ran, so no picks, no miss rates, no step time.
- Ratios of bytes may travel between them, flagged; miss rates and step times cannot.
:::

## The switch {#the-switch}

The pill in the top bar shows the current setting with its emblem, a pin or a flask. Click it to change the setting; the choice is kept in your browser and follows you from page to page. Three things follow it.

1. **Hover reminders.** The reminder of a term or symbol that has a size in the setting ([[orchard]], [[pick]], [[hot-cache]], [[head]], [[layer]], $\ve$, $\vNL$, $\vL$) ends with a line "In the Pin: …" or "In the Bench: …", the current setting first.
2. **Live numbers.** A number written with the macro `[[@key]]` renders as a small marked value and updates in place. Read the next paragraph, flip the pill, and read it again.
3. **Figures that read the setting.** Where a setting has no value for what a figure needs, the figure says "not measured" instead of inventing one.

In the setting selected now the LLM is [[@llm]] on an [[@gpu]]. One token's row at one layer is [[@e]], over [[@NL]] KV layers, in sequences of [[@L]] tokens stored as [[@format]]. The link carries [[@Wlink]] and the GPU keeps [[@Mhbm]] for orchards. The indexer names [[@k]] picks per layer per step, misses [[@m4]] of them at 4096 slots, and a step takes [[@tpot]].

What does not follow the switch is every number typed into a sentence. The 274 misses of [[#landscape-derived-numbers]], the 13.7 MB and the 110 sequences were computed for the Pin and stay the Pin's whatever the pill says; the 0.636 of [[#measured-scorecard]] was measured on the Bench and stays the Bench's.

For writers, one rule in two halves. A setting-dependent number in new prose goes through the macro, so that it follows the switch. A number that belongs to one setting by design is typed out and its setting is named, "on the Pin" or "on the Bench". Never mix the two in one piece of arithmetic: "`[[@e]]` × 274 misses" would be right on the Pin and wrong on the Bench, where nobody counted misses; a sentence is either all live or all named.

::: takeaway
- The pill changes hover reminders, live `[[@key]]` numbers and the figures that read the setting; it leaves every number typed for one setting alone.
- New prose writes setting-dependent numbers with the macro and names the setting for numbers that belong to one of them; never mix live and fixed numbers in one calculation.
:::
