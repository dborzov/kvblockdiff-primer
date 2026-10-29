---
title: The reference setting
nav: The reference setting
group: The numbers
lede: Napkin math needs numbers, and numbers need one concrete machine. We freeze one — HiSparse's GLM-5.1 deployment, converted to 8-bit storage — and use it for every estimate on this site.
cards:
  - q: What is the entry size $\ve$ in the reference setting?
    a: 640 bytes (0.64 KB) — about 640 numbers at 8 bits each
    wrong: ["1.28 KB", "50 KB", "64 bytes"]
    why: 'GLM-5.1 holds about 100 KB of KV per token in BF16 over 78 layers; at 8 bits that is 50 KB, and 50 KB ÷ 78 ≈ 640 bytes per entry.'
    sec: table
  - q: 'What are $\vWlink$ and $\vMhbm$ in the reference setting?'
    a: 50 GB/s of host-to-GPU link, and 30 GB of GPU memory for KV per GPU
    wrong: ["64 GB/s and 141 GB", "500 GB/s and 30 GB", "50 GB/s and 240 GB"]
    why: 'PCIe Gen5 ×16 carries 64 GB/s on paper and about 50 in practice; HiSparse''s 8×H200 server has about 240 GB left for KV, 30 GB per GPU.'
    sec: table
  - q: Switching the reference setting from BF16 to 8-bit storage changes which numbers?
    a: Only the byte counts — entry size, bytes per token, traffic and memory — not the selections or miss rates
    wrong: ["All of them, including the miss rates", "Only the miss rates", "None of them"]
    why: The number format changes how many bytes an entry has, not which entries the indexer picks (we assume the model's choices are not affected).
    sec: table
  - q: Why freeze one reference setting instead of using the best numbers for each question?
    a: So every estimate on the site is comparable, and conclusions can be stated as ratios that carry over to other machines
    wrong: ["Because GLM-5.1 is the best model", "Because the numbers are exact", "Because other machines do not use sparse attention"]
    why: The point is not this rig; the point is that all pages use the same one.
    sec: why
---

A recipe that says "add some flour, bake until done" cannot be followed, or checked, or compared with another recipe. Physicists have the same problem with gases, so they agree on *standard conditions*: one temperature, one pressure, and every number in the table is quoted there.

This site needs the same thing. Every page from here on estimates bytes, seconds and requests. If one page assumed a 30 ms step and another 50 ms, nothing could be compared.

## The frozen numbers {#table}

::: define reference-setting
- **What it is.** One fixed set of numbers, used for every estimate on this site: HiSparse's GLM-5.1 deployment, with its KV entries converted from 16-bit (BF16) to 8-bit storage.
- **Why 8 bits.** HiSparse serves BF16, but 8-bit KV storage is where serving is heading, and it is the exact format this project's coder would have to reproduce ([[#plan-fp8-target]]).
- **What it is not.** A claim that this machine is the right one, or the best. Its job is to make every page use the *same* numbers.
- **Its nickname.** The Pin: it pins every estimate to one place.
:::

Two new symbols come with it. $\vWlink$ is the **link bandwidth**, the bytes per second the host-to-GPU link actually carries. $\vMhbm$ is the **GPU memory available for KV**, per GPU, after the model's weights have taken their share.

| quantity | symbol | value | where it comes from |
|---|---|---|---|
| sparse-attention layers | $\vNL$ | 78 | GLM-5.1, as in HiSparse's trace |
| selections per layer per step | $\vk$ | 2048 | DSA's top-$\vk$ |
| context length of the trace | $\vL$ | 100K (100,384 tokens) | HiSparse's LongBench-V2 prompt |
| numbers per entry | $\vd$ | ≈ 640 | 100 KB of BF16 per token ÷ 78 layers ÷ 2 bytes |
| **entry size, 8-bit** | $\ve$ | **640 B (0.64 KB)** | 50 KB per token ÷ 78; in BF16 it would be 1.28 KB |
| miss rate, top-$\vk$ only ($\vB = 2048$) | $\vm$ | 30 % | HiSparse's trace |
| miss rate, LRU, $\vB = 4096$ | $\vm$ | 13.4 % | Bélády: 8.2 % |
| miss rate, LRU, $\vB = 8192$ | $\vm$ | 6.7 % | |
| time per output token | $\vtpot$ | 30 ms | HiSparse's deployment |
| host-to-GPU link | $\vWlink$ | 50 GB/s | PCIe Gen5 ×16, one direction; 64 GB/s on paper |
| GPU memory for KV, per GPU | $\vMhbm$ | 30 GB | about 240 GB left on 8 × H200 after the weights |

Which of these depend on the number format? Flip the switch.

::: figure fig-landscape-ref refSetting
**The reference setting as a pinboard.** Each card is one frozen number: its symbol, its value, and (on hover or tap) where it comes from. Cards are grouped into the model, the cache and the machine; the last group holds three numbers derived from the others. The switch converts the entries between 8-bit storage (the reference) and BF16 (what HiSparse actually serves); cards whose value changes are outlined. All values are from the table above; the derived ones are computed live.
:::

::: try
1. Switch to BF16. Only byte counts change: the entry, the bytes per token, and what is derived from them.
2. Nothing about *which* entries are selected changes, so the miss rates stay put.
:::

::: takeaway
- The reference setting: 78 layers, $\vk = 2048$, 100K tokens, $\ve = 640$ B, $\vm$ = 30 / 13.4 / 6.7 % at 2048 / 4096 / 8192 slots, 30 ms per step, $\vWlink = 50$ GB/s, $\vMhbm = 30$ GB.
- Changing the number format changes byte counts only.
:::

## Why freeze, and what is assumed {#why}

Freezing the numbers has a second benefit. Most conclusions on this site come out as **ratios**: "a miss that moves 60 % of an entry moves 60 % of the bytes". Ratios carry over to other machines far better than absolute numbers do. If your link is twice as fast, every request count doubles, and every comparison between methods stays the same.

Still, every number in the table is an assumption about one deployment. In order of how much we worry about them:

1. **One trace.** All miss rates come from one prompt, one model, 1,799 decode steps, averaged over 78 layers. A different task, or a different model, could move them a lot.
2. **8-bit storage.** HiSparse measured with BF16. We assume that storing entries with 8 bits changes the bytes but not the model's choices, so the miss rates carry over. Plausible, not checked.
3. **The entry layout.** "About 640 numbers per entry" is derived from GLM-5.1's bytes per token; we have not checked the model's exact layout.
4. **The machine.** The 30 ms step, the 50 GB/s link and the 30 GB of memory describe one server. HiSparse notes that on machines with much faster host links (such as NVIDIA's GH200), GPU memory, not the link, becomes the binding limit — which is why both limits are carried through the next page.
5. **Second-hand numbers.** The HiSparse figures are quoted as the first draft of this proposal recorded them; they were not re-checked against the paper for this version ([[#reference-numbers]] lists the sources).

::: note numbers Where the numbers go next
[[#landscape-derived-numbers]] turns this table into the few derived numbers used everywhere else: misses per step, link traffic per request, memory per request, and the requests one GPU can serve.
:::

::: takeaway
- Freezing one setting makes every estimate comparable; the conclusions are ratios that transfer to other machines.
- The weakest assumption is that one trace's miss rates are typical; the next weakest, that 8-bit storage leaves them unchanged.
:::
