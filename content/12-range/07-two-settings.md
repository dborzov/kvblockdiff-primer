---
title: 'Two reference settings: the Pin and the Bench'
nav: The Pin and the Bench
group: Settings
lede: 'Every estimate on this site was pinned to one machine, HiSparse''s. Part XI measured on another, the author''s. This page freezes the second one as a setting of its own, puts the two side by side, and explains the switch in the top bar that lets you read the site in either.'
cards:
  - q: 'How big is one entry on the Bench, and how does it compare with the plan''s entry?'
    a: '512 bytes of values (2 heads × 256 elements at 8 bits); 1,024 bytes with keys, which is the entry the plan counted'
    wrong: ["640 bytes, like the Pin", "3,072 bytes", "256 bytes"]
    why: 'The campaigns coded values alone, one layer at a time. 3,072 bytes is a token''s values over all six layers; 256 is one head.'
    sec: the-bench
  - q: Which quantities does the Bench lack that the Pin has?
    a: 'Selections per step $\vk$, the miss rates and the time per output token: no sparse-attention selector ever ran on it'
    wrong: ["The entry size and the number of layers", "The link bandwidth and the GPU memory", "The block size and the storage format"]
    why: 'The Bench is the data-side setting. It has shapes, bytes, block sizes and measured ratios; the miss side of the economics needs a selector and a decode loop.'
    sec: the-bench
  - q: 'Which Bench number is carried into the Pin''s economics, and why may it travel?'
    a: 'The delta ratio $\vrho$, because it is a ratio of bytes to bytes; a miss on the Pin moves $\vrho\,\ve$ whatever $\ve$ is'
    wrong: ["The miss rate, because both settings use 4,096-token blocks", "The entry size, 512 bytes", "The time per output token"]
    why: 'XI.13 does exactly this. Whether a ratio measured on a 2B model''s values transfers to GLM-5.1 is itself an assumption, and that page says so.'
    sec: side-by-side
  - q: What does the setting switch in the top bar change?
    a: 'The hover reminders of terms and symbols, every live number written with the macro, and the figures of Part XII'
    wrong: ["Every number on every page", "Only the glossary page", "The miss rates in Part III"]
    why: Prose typed for the Pin keeps its numbers; only what was written to follow the setting follows it.
    sec: the-switch
  - q: A writer needs a setting-dependent number in new prose. What is the rule?
    a: 'Write it with the live macro; a number that belongs to one setting by design is typed out, and the setting is named'
    wrong: ["Always type the Pin's number", "Write both numbers with a slash", "Leave numbers out of prose"]
    why: 'A sentence whose arithmetic mixes a live number with a fixed one would be wrong in the other setting; either all of it is live or all of it is named.'
    sec: the-switch
---

Two machines appear on this site, and until now only one of them had a name. The Pin is HiSparse's server of eight H200s, frozen in [[#landscape-reference-setting]] so that every napkin would use the same numbers. The other is the single RTX 5080 on which the campaigns of Part XI compressed 20.9 GB of KV cache. Its numbers were scattered over [[#measured-the-data]] and a dozen receipts. They deserve a card of their own, and a name.

## The Bench {#the-bench}

::: define bench-setting
- **What it is.** The campaigns' rig as a second frozen set of numbers: Qwen3.5-2B's six layers with a KV cache, 2 KV heads of 256 elements, 512-byte value entries (1,024 B with keys), 225K-token coding-agent transcripts, FP8 E4M3, blocks of 512 to 32,768 tokens, one RTX 5080 with 16 GB, a PCIe 5.0 link taken as 50 GB/s.
- **What it is for.** Anything about shapes, bytes, block sizes and measured ratios. Every ratio in Part XI was measured here and nowhere else.
- **What it is not.** A deployment. No sparse-attention selector ever ran on it, so $\vk$, the miss rates and the time per output token are not measured, and the chain of [[#range-from-bits-to-dollars]] stops at bytes.
- **Its nickname.** The Bench, after the lab table the data was made on.
:::

| quantity | symbol | value | where it comes from |
|---|---|---|---|
| model | | Qwen3.5-2B, the [[proxy-model]] | [[#plan-data]], [[#measured-the-data]] |
| layers with a KV cache | $\vNL$ | 6 (of 24; the other 18 are linear attention) | XI.2 |
| KV heads × elements | | 2 × 256 (8 query heads share them) | XI.2 |
| elements per entry | $\vd$ | 512 (values of one token at one layer); 1,024 with keys | XI.2, XI.6 |
| **entry size, 8-bit** | $\ve$ | **512 B** of values; 1,024 B with keys | one byte per element |
| storage format | | FP8 E4M3, one power-of-two scale per layer and tensor | [[#plan-fp8-target]] |
| context length | $\vL$ | 225K (219,678 to 229,360 tokens) | 30 transcripts, prefill only |
| block sizes measured | $\vb$ | 512, 4,096, 16,384, 32,768 | XI.9 |
| measured delta ratios | $\vrho$ | solo 0.778; light coder 0.686; tree coder 0.636 | XI.12 |
| selections per layer per step | $\vk$ | not measured | no selector was run |
| miss rates | $\vm$ | not measured | |
| time per output token | $\vtpot$ | not measured | |
| host-to-GPU link | $\vWlink$ | 50 GB/s, **assumed** | PCIe 5.0 ×16, 64 GB/s on paper; the Pin's figure until measured |
| GPU memory for KV | $\vMhbm$ | ≈ 10 GB, **assumed** | 16 GB of GDDR7, about 4 GB of weights in BF16, headroom for the desktop |
| GPU, host | | RTX 5080; Ryzen 7 9700X | the author's workstation |

Three numbers fall out of this table the way III.11's fell out of the Pin's. One token's values over the six layers are $6 \times 512 = 3{,}072$ B, so a 225K-token sequence holds about 691 MB of values, 1.38 GB with keys, and the 10 GB would hold about seven such [[kv-cache|KV caches]] whole. A 4,096-token block of one layer's values is 2.1 MB, and the tree coder's dictionary for it, 0.525 of the block, is 1.1 MB per layer. The fourth number of [[#landscape-derived-numbers]], requests per GPU, needs misses and a step time, and the Bench has neither.

The assumptions, in order of how much they worry us. The link speed is borrowed from the Pin, whose slot has the same paper figure; nobody has measured what this host delivers. The 10 GB for KV is a guess at what is left of 16 GB once the weights and a desktop are resident. The 512-byte entry is the campaigns' cut, values alone; the plan's 1,024-byte entry counted keys, and keys compress like values ([[#measured-what-it-means]]). And every ratio comes from one kind of text.

::: takeaway
- The Bench: six KV layers, 2 × 256, 512-byte value entries (1,024 B with keys), 225K tokens, FP8, one RTX 5080; a 50 GB/s link and 10 GB for KV, both assumed.
- It is the data-side setting. $\vk$, miss rates and $\vtpot$ are not measured on it, so it gives bytes and ratios, never requests per GPU.
:::

## Side by side {#side-by-side}

| quantity | the Pin | the Bench |
|---|---|---|
| what it is | GLM-5.1 on 8 × H200, as HiSparse serves it, at 8-bit storage | Qwen3.5-2B on one RTX 5080, as the campaigns measured it |
| what it is for | deployment: misses, link, memory, requests per GPU | data: shapes, bytes, block sizes, measured ratios |
| layers with a KV cache $\vNL$ | 78 | 6 |
| elements per entry $\vd$ | ≈ 640, derived from bytes per token | 512 (values), a real layout |
| entry size $\ve$ | 640 B, keys and values | 512 B of values; 1,024 B with keys |
| storage format | 8-bit, assumed | FP8 E4M3, measured |
| context length $\vL$ | 100K | 225K |
| block size in examples $\vb$ | 4,096 | 4,096 (512 to 32,768 measured) |
| selections per step $\vk$ | 2,048 | not measured |
| miss rates at 2K / 4K / 8K slots | 30 / 13.4 / 6.7 % | not measured |
| time per output token $\vtpot$ | 30 ms | not measured |
| link $\vWlink$ | 50 GB/s (PCIe Gen5 ×16) | 50 GB/s, assumed, same slot generation |
| GPU memory for KV $\vMhbm$ | 30 GB of 141 | ≈ 10 GB of 16, assumed |
| delta ratio $\vrho$ | assumed (0.55 to 0.88 in Part VI) | measured (0.636 to 0.778) |

Read the two columns as a division of labour. The Pin owns the miss side of the economics, everything that needs a selector and a decode loop: $\vk$, $\vm$, $\vtpot$, and so $\vN$. The Bench owns the byte side: what an [[entry]] is, what a [[block]] weighs, what a coder saves. [[#measured-what-it-means]] already carried one number across, the measured $\vrho$, into the Pin's cost model. A ratio of bytes to bytes may travel; whether a ratio measured on a 2B model's values holds for GLM-5.1's entries is an assumption, and that page marks it. The miss rates may not travel at all, since the Bench has none.

::: figure fig-rng-settings rngSettings wide
**The two settings, card by card.** One column per setting, one row per frozen quantity, with its key, value and unit; "not measured" where the setting has no value. The chosen setting is highlighted and the rows where the two differ are outlined. Where a derived number exists in both settings (bytes per token, bytes per block, bytes of one request's KV cache) it is computed live from the cards above it; where it would need a miss rate or a step time, the Bench's cell says so. The button switches the setting, and the pill in the top bar follows. The data is the site's own settings table, the same one the hover reminders read.
:::

::: try
1. Press the button. The pill in the top bar flips, and the outlined rows change value; the rows that agree (block size, link) stay still.
2. While on the Bench, hover $\ve$, $\vNL$ or $\vL$ in the table above. The reminder now shows both settings' values, the current one first.
:::

::: takeaway
- The Pin is the deployment-side setting, the Bench the data-side one; together they cover the chain from bytes to requests.
- Ratios of bytes may travel between them, with a flag; miss rates and step times cannot, because the Bench has none.
:::

## The switch {#the-switch}

The pill in the top bar, right of the deck count, shows the current setting with its emblem, a pin or a flask. Click it to change the setting; the choice is kept in your browser and follows you from page to page. Three things follow it.

1. **Hover reminders.** The reminder of a term that has a size in the setting ([[entry]], [[block]], [[kv-cache|KV cache]], [[hot-cache]], [[head]], [[layer]], the [[reference-setting]] itself) gains a last line, "In the Bench: …". A symbol's reminder shows both settings' values, the current one first.
2. **Live numbers.** A number written with the macro `[[@key]]` renders as a small marked value and updates in place. Read the next paragraph, flip the pill, and read it again.
3. **The figures of this Part.** They read the setting and recompute; where the setting has no value for what a figure needs, the figure says "not measured on the Bench" instead of inventing one.

An [[entry]] is [[@e]] in the setting you have chosen, over [[@NL]] layers with a KV cache, in a context of [[@L]] tokens. The link carries [[@Wlink]] and the GPU keeps [[@Mhbm]] for KV. The model is [[@model]], on an [[@gpu]].

What does not follow the switch is every number typed into a sentence before this Part. The 274 misses of [[#landscape-derived-numbers]], the 13.7 MB and the 109 requests were computed for the Pin and stay the Pin's whatever the pill says. The same goes for the tables of III.10 and VI.16 and for the figures of earlier Parts, which have their own inputs.

For writers, one rule in two halves. A setting-dependent number in new prose goes through the macro, so that it follows the switch. A number that belongs to one setting by design, HiSparse's 109 requests, the campaigns' 0.636, is typed out and its setting is named, "on the Pin" or "on the Bench". Never mix the two in one piece of arithmetic. "`[[@e]]` × 274 misses" would be right on the Pin and wrong on the Bench, where nobody counted misses; a sentence is either all live or all named.

::: aside source Receipts
- Model geometry, sequences, tool-output shares and the FP8 recipe: [[#measured-the-data]] and `targets/02-qwen3.5-2b-agent-long30/README.md` (Part XI's spec §1.1); block sizes 512 to 32,768: [[#measured-reading-one-entry]]; measured ratios 0.778 (r1-t0005), 0.636 (env-t0096), 0.686 (r25-t0003): Part XI's spec §1.3, §1.5, §1.7.
- The machine: one RTX 5080 with 16 GB of GDDR7 in a PCIe 5.0 ×16 slot, Ryzen 7 9700X host. 50 GB/s and about 10 GB for KV are assumptions of this page: the link is the Pin's practical figure for the same slot generation; the memory is 16 GB less about 4 GB of BF16 weights for a 2B-parameter model, less headroom.
- Derived: 6 × 512 = 3,072 B per token; 225,000 × 3,072 ≈ 691 MB; × 2 for keys ≈ 1.38 GB; 10 GB ÷ 1.38 GB ≈ 7; 4,096 × 512 B ≈ 2.1 MB; × 0.525 ≈ 1.1 MB.
- The switch's keys and behaviour: `data/settings.yaml` and `docs/project/rigs.md`.
:::

::: takeaway
- The pill changes hover reminders, live `[[@key]]` numbers and this Part's figures; it leaves every number typed for the Pin alone.
- New prose writes setting-dependent numbers with the macro and names the setting for numbers that belong to one of them; never mix live and fixed numbers in one calculation.
:::
