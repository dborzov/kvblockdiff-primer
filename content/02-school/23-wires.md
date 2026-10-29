---
title: Wires and memories
nav: Wires and memories
lede: The archive's lift is slow in two different ways — each trip takes two minutes, and each trip carries at most fifty logbooks. Those are latency and bandwidth. Then the toy gets its real names — HBM next to the GPU, host DRAM far away, and the PCIe link between them, about a hundred times slower.
group: Machines
cards:
  - q: What is the difference between bandwidth and latency?
    a: Bandwidth is how much a link moves per second once data flows; latency is how long one request takes to start arriving
    wrong: ["They are two names for the same speed", "Bandwidth is the size of a memory; latency is its price", "Latency is the bandwidth of a single wire"]
    why: The lift carries up to 50 logbooks per trip (bandwidth) and each trip takes 2 minutes however much it carries (latency).
    sec: bandwidth
  - q: 'The forecaster needs ten logbooks. How long does it take to order them one at a time, waiting for each, versus all at once?'
    a: 20 minutes versus 2 minutes
    wrong: ["20 minutes versus 10 minutes", "2 minutes versus 20 minutes", "The same either way — the lift has the same speed"]
    why: One at a time pays the 2-minute latency ten times. Ordered together, they share one trip.
    sec: bandwidth
  - q: 'Roughly how fast is PCIe Gen5 ×16, the link between host memory and the GPU, compared with the GPU’s own HBM?'
    a: About 64 GB/s per direction (≈ 50 in practice) against several TB/s — roughly 100× slower
    wrong: ["About the same speed — both are a few TB/s", "About 2× slower", "About 10,000× slower"]
    why: 'An H200’s HBM delivers about 4.8 TB/s; 4.8 TB/s ÷ 50 GB/s ≈ 96.'
    sec: real
  - q: What is host DRAM, in the harbour-office picture?
    a: The archive downstairs — the big, slower memory where everything is kept
    wrong: ["The forecaster's desk", "The slow lift", "The radio link to Gull Rock"]
    why: HBM is the desk (small, fast, next to the GPU), host DRAM the archive (big), PCIe the lift between them.
    sec: real
  - q: Why can many small scattered reads still use most of a link's bandwidth?
    a: If enough of them are in flight at once, their latencies overlap and the link stays full
    wrong: ["Because small reads have no latency", "Because the link compresses small reads automatically", "They cannot — small reads always waste most of the bandwidth"]
    why: 'Delivered rate ≈ (reads in flight × read size) ÷ latency, up to the bandwidth. GPUs keep thousands of reads in flight; a forecaster waiting for each logbook keeps one.'
    sec: scattered
---

The lift between the archive and the harbour office is slow, and there is more than one way to be slow. Watch the forecaster use it.

- She needs the Reef logbook. She presses the button; **two minutes** later it arrives.
- She needs ten logbooks, and fetches them one by one, waiting for each before asking for the next: twenty minutes.
- Next time she writes all ten on one order slip. They come up together in a single trip: two minutes.

The lift did not get faster. It was never the *carrying* that was slow; it was the waiting.

## Bandwidth and latency {#bandwidth}

Every way of moving data — a lift, a radio link, a wire inside a computer — has two speeds.

::: define bandwidth
- **Bandwidth** is how much a link moves per second once data is flowing: the lift carries at most 50 logbooks per trip, so at best 25 logbooks a minute.
- **Latency** is how long one request takes before anything arrives: two minutes per trip, whether the cart holds one logbook or fifty.
- **Together:** time to fetch ≈ latency + amount ÷ bandwidth. Small requests are dominated by latency, big ones by bandwidth.
:::

| how the forecaster asks | logbooks | time | logbooks per minute |
|---|---|---|---|
| one, then wait | 1 | 2 min | 0.5 |
| ten, one at a time, waiting each time | 10 | 20 min | 0.5 |
| ten on one slip | 10 | 2 min | 5 |
| fifty on one slip (a full cart) | 50 | 2 min | 25 |

*The lift: 2 minutes per trip, 50 logbooks per trip (illustrative toy numbers).*

The same lift delivers anything from half a logbook a minute to twenty-five. What decides it is how many logbooks are *on order at once*. To keep the cart full, fifty must be ordered and not yet arrived at every moment.

::: takeaway
- Bandwidth: how much per second once flowing. Latency: how long until the first item arrives.
- Many small requests, each waited for, are latency-bound; ordered together, they approach the bandwidth.
:::

## The real names {#real}

Now the harbour office becomes a computer that runs a language model. The arithmetic runs on a GPU — originally a graphics processor, now the chip that does nearly all of a language model's work. The GPU has a small memory of its own right beside it, and the computer it sits in has a much bigger one further away.

::: define hbm
- **What it is:** high-bandwidth memory — memory chips stacked right next to the GPU, inside the same package.
- **Numbers:** an NVIDIA H100 has 80 GB of it at about 3.35 TB/s; an H200 has 141 GB at about 4.8 TB/s.
- **In the toy:** the desk. Very fast, small (tens of GB), and expensive.
:::

::: define dram
- **What it is:** the main memory of the computer's ordinary processor (the CPU) — "host" memory, from the GPU's point of view.
- **Numbers:** hundreds of GB to a few TB per server, far cheaper per byte than HBM.
- **In the toy:** the archive downstairs. Everything fits; reaching it from the GPU means crossing a wire.
:::

::: define pcie
- **What it is:** PCI Express, the wire between host memory and the GPU.
- **Numbers:** generation 5 with 16 lanes (written Gen5 ×16) carries about 63–64 GB/s in each direction on paper, around 50 GB/s in practice.
- **In the toy:** the lift.
:::

| | toy | real | size | bandwidth |
|---|---|---|---|---|
| small and fast | the desk | HBM (H200) | 141 GB | 4.8 TB/s |
| the link | the lift | PCIe Gen5 ×16 | — | ≈ 50 GB/s per direction in practice |
| big and slow to reach | the archive | host DRAM | hundreds of GB to TBs | (reached through PCIe) |

Divide the two speeds: $4.8\ \text{TB/s} \div 50\ \text{GB/s} \approx 96$. Data already in HBM is about **a hundred times** quicker to reach than data that must cross PCIe. That ratio is the reason a GPU keeps a desk at all, and the reason every byte that crosses the link counts.

::: takeaway
- HBM: the GPU's own memory, tens of GB at several TB/s (the desk).
- Host DRAM: much bigger, reached only through PCIe (the archive).
- PCIe Gen5 ×16: about 64 GB/s per direction on paper, ≈ 50 in practice — roughly 100× slower than HBM (the lift).
:::

## Scattered small reads {#scattered}

The lift's lesson carries over directly. A read of a few hundred bytes from host memory takes on the order of a microsecond to come back across PCIe, whatever its size. If the GPU waited for each read before issuing the next, it would get a few hundred bytes per microsecond — a few hundred MB/s, a tiny fraction of the link. Real GPUs keep thousands of reads in flight at once, so their latencies overlap and the link stays busy.

::: figure fig-sv-wires svWires
**How much a link delivers, against the size of each read.** A simple model: each read waits a fixed latency, then transfers at the link's bandwidth; with several reads in flight their waits overlap, so the delivered rate is $\min(\text{bandwidth},\ \text{reads in flight} \times \text{read size} / (\text{latency} + \text{read size}/\text{bandwidth}))$. Green: HBM of an H200 (4.8 TB/s; latency assumed 0.5 µs). Red: PCIe Gen5 ×16 in practice (50 GB/s; latency assumed 1 µs). The latencies are rough orders of magnitude, not measurements of any one machine. Both axes are logarithmic; the horizontal rules mark the peak bandwidths. *Slide* the number of reads in flight and the size of each read; the dots and the read-out show the delivered rates at that size and their ratio.
:::

::: try
1. The figure starts with 4096 reads of 1 KiB in flight: PCIe is at its 50 GB/s ceiling, HBM at its 4.8 TB/s. The ratio is about 100×.
2. Drop the reads in flight to 1: HBM now delivers about 2 GB/s and PCIe about 1 GB/s — a sliver of either peak. Latency rules.
3. Shrink the read size at a fixed number in flight: the curves bend down. Small reads need more of them in flight to fill the same link.
:::

Two cautions keep this honest. The model leaves out the fixed overhead that real links add to every transfer (packet headers, minimum transfer sizes), which makes very small reads less efficient than the curve suggests. And it assumes the reads are independent, so that thousands can be issued at once.

::: theme access-pattern
How data is read decides what the machine can do with it. Thousands of independent small reads can fill a link; a chain where each read depends on the one before cannot. When the data is reached in small scattered pieces, anything stored or coded must keep each piece readable on its own.
:::

::: takeaway
- Each small read pays a latency; with enough reads in flight, the latencies overlap and the link runs near its bandwidth.
- At full speed, HBM delivers about 100× what PCIe does.
- Scattered small reads are fine only if they are independent and numerous.
:::
