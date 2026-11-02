---
title: From bits to dollars
nav: From bits to dollars
group: Economics
lede: 'A research result arrives in bits per element. The person who pays for GPUs wants dollars per million tokens. Between the two runs a chain of plain multiplications, every link of it already on this site; this page strings them together on the Pin, with the one guessed number marked as a guess.'
cards:
  - q: 'In this site''s arithmetic, what is the decode throughput of one GPU?'
    a: '$\vtps = \vN / \vtpot$: the sequences it serves at once, divided by the time one decode step takes'
    wrong: ['$\vN \times \vtpot$', '$\vWlink / \ve$', '$\vk \times \vNL / \vtpot$']
    why: 'Every decode step advances every one of the $\vN$ sequences by one token, and a step takes $\vtpot$ seconds.'
    sec: the-chain
  - q: 'HiSparse serves 109 sequences per GPU on the Pin at 30 ms per step. About how many output tokens per second is that?'
    a: About 3 630
    wrong: ["About 109", "About 36 300", "About 3.3"]
    why: '109 ÷ 0.030 s ≈ 3 633 output tokens per second per GPU.'
    sec: the-chain
  - q: 'At an assumed USD 3 per GPU-hour, what does a million output tokens cost at 3 630 tokens per second?'
    a: About USD 0.23
    wrong: ["About USD 2.30", "About USD 0.023", "About USD 3"]
    why: '3 ÷ (3 630 × 3 600) × 10⁶ ≈ 0.23. The price is an assumption; change it and every cost scales with it.'
    sec: the-calculator
  - q: 'Design A serves 138 sequences per GPU, design B 109. How does the price per GPU-hour enter their cost ratio?'
    a: 'It does not; the ratio is 109 ÷ 138 ≈ 0.79 whatever the price'
    wrong: ["It multiplies the ratio", "It adds a fixed offset", "Only through the time per output token"]
    why: 'Both costs are $\vprice / (\vtps \cdot 3600) \cdot 10^6$. Dividing one by the other cancels $\vprice$ and leaves the inverse ratio of $\vN$.'
    sec: the-calculator
  - q: '"Cheaper misses let the link feed more sequences, so the decode batch grows." When does this stop being true?'
    a: 'As soon as GPU memory binds: then the batch is $\vMhbm / \vMreq$ and only cheaper slots (lever 2) or lighter resident dictionaries move it'
    wrong: ["Never; the link always binds", "As soon as the link is faster than 50 GB/s", "When the price per GPU-hour falls"]
    why: 'On the Pin a sequence-scope dictionary lifts the link bound to 146, but memory holds 138; from there lever 1 buys nothing more.'
    sec: what-it-does-not-say
---

Part VIII ended on a ratio of 0.636, the bytes a reference-tree compressor needs for a punnet over the bytes of the raw punnet. That is the scientist's number, and nobody buys a GPU with it. The buyer asks what a million output tokens cost. Five multiplications join the two numbers, each done once already in Parts III, IV and VI. This page puts them in a row and runs [[pin|the Pin]]'s numbers through them.

## The chain, link by link {#the-chain}

Each link below is one quantity with one definition, starting from a single miss.

**1. Bytes per miss.** A [[hot-cache]] miss fetches one [[pick]] over the link. [[hisparse|HiSparse]] moves it raw, $\ve = 640$ B on the Pin. A [[delta-miss|δ-miss]] moves $\vrho\,\ve$ instead: 426 B at the light measured point ($\vrho = 0.665$), 72 B at the tree point (0.112). This is the only place where bits per element enters the chain.

**2. Bytes per step per sequence, $\vTstep$.** Misses per layer per step, times layers, times bytes per miss, plus whatever dictionaries are loaded ([[#app-the-napkin]]). On the Pin at $\vB = 4096$ that is $274 \times 78 \times 640\ \text{B} \approx 13.7$ MB for HiSparse, and about 9.1 MB with every miss a delta at 0.665.

**3. Sequences per GPU, $\vN$.** The link feeds $\vWlink\,\vtpot / \vTstep$ sequences, the memory holds $\vMhbm / \vMreq$, and $\vN$ is the smaller of the two ([[#app-two-levers]]). These $\vN$ sequences are decoded side by side at every step, so $\vN$ is also the size of the decode batch. HiSparse: 109, link-bound. The sequence-scope dictionary of the calculator: 138, memory-bound (assumed $\vrho$).

**4. Tokens per second per GPU.** Every decode step advances each of the $\vN$ sequences by one token and takes $\vtpot$ seconds, so one GPU emits $\vN$ tokens every $\vtpot$ seconds. That rate is its [[=decode-throughput]]:

$$
\vtps \;=\; \frac{\underbrace{\vN}_{\text{sequences decoding side by side}}}{\underbrace{\vtpot}_{\text{seconds per decode step}}}, \qquad \text{the Pin, HiSparse: } \frac{109}{0.030\ \text{s}} \approx 3\,630\ \text{tokens/s}
$$ {#eq-app-tps}

At $\vN = 138$ the same step time gives about 4 600.

**5. Cost per million output tokens.** One GPU-hour costs $\vprice$ and produces $\vtps \times 3600$ tokens. Divide, and scale to a million; that is the [[=cost-per-token]]:

$$
\vcost \;=\; \frac{\vprice}{\underbrace{\vtps \times 3600}_{\text{tokens per GPU-hour}}} \times 10^{6}, \qquad \frac{\text{USD } 3}{3\,630 \times 3600} \times 10^{6} \approx \text{USD } 0.23
$$ {#eq-app-cost}

The USD 3 is an assumption about what one H200-hour costs, the only number on this page not computed from something else. At $\vN = 138$ the bill falls to about USD 0.18.

Now divide two such bills. The price appears in both and cancels; so do the 3600, the million and, if both designs share it, $\vtpot$. What is left is the inverse ratio of $\vN$, so 138 sequences against HiSparse's 109 means about 1.26 times the tokens and 109/138 ≈ 0.79 of the cost, at any price whatever.

::: theme bits-unit
The chain is a row of unit conversions, and bits are its first unit. One bit per element saved on a 640-element cherry is 80 bytes off every miss, then a smaller $\vTstep$, a larger $\vN$ while the link binds, more tokens per second, fewer dollars.
:::

::: takeaway
- Bytes per miss → $\vTstep$ → $\vN$ → $\vtps = \vN/\vtpot$ → $\vcost = \vprice/(\vtps \cdot 3600) \cdot 10^6$.
- On the Pin, HiSparse at $\vB = 4096$: 109 sequences, about 3 630 tokens per second, about USD 0.23 per million tokens at an assumed USD 3 per GPU-hour.
- The price cancels out of every ratio; 138 sequences against 109 is 0.79 of the cost at any price.
:::

## The calculator {#the-calculator}

Four designs go through the chain below, three rows of the calculator's table and the lever-2 result of the napkin ([[#app-the-napkin]]).

| design (the Pin, $\vB = 4096$) | $\vN$ | binds | $\vtps$, tokens/s | $\vcost$ at USD 3 | cost against HiSparse |
|:--|--:|:--|--:|--:|--:|
| HiSparse | 109 | link | 3 630 | 0.23 | 1.00 |
| solo coding, $\vrho = 0.88$ (assumed) | 124 | link | 4 130 | 0.20 | 0.88 |
| sequence-scope dictionary, $\vrho = 0.75$ (assumed) | 138 | memory | 4 600 | 0.18 | 0.79 |
| on-fire dictionaries at the tree point, lever 2, $\vnD = 1$ ($\vfD = 0.3$, $\vnload = 0.01$, assumed) | ≈ 120 | memory | 4 000 | 0.21 | 0.91 |

::: aside source Receipts
- $\vN$: HiSparse 109 and the sequence-scope 138 are the calculator's rows ([[#app-calculator]], $\vw = 256$, $\vrho = 0.75$ assumed); solo 124 the same table; about 120 is the lever-2 variant of the napkin ([[#app-the-napkin]], $\vnD = 1$, $\vfD = 0.3$, $\vnload = 0.01$).
- $\vtpot = 30$ ms: HiSparse's deployment, frozen in [[#landscape-reference-settings]].
- USD 3 per H200-hour: an assumption of this page, a round figure chosen for the arithmetic and taken from no price list. It scales every dollar amount and no ratio.
- Arithmetic: 109 / 0.030 = 3 633; 3 / (3 633 × 3 600) × 10⁶ = 0.229. 138 / 0.030 = 4 600; 3 / (4 600 × 3 600) × 10⁶ = 0.181. 124 / 0.030 = 4 133; 0.202. 120 / 0.030 = 4 000; 0.208.
:::

::: figure fig-app-dollars rngDollars wide
**From sequences to dollars, live.** Three tiles in a row: sequences per GPU $\vN$, tokens per second per GPU $\vtps = \vN / \vtpot$, and the cost of a million output tokens $\vcost$ in USD; below them, one bar per design showing $\vcost$ (USD, decimal). Inputs: a design (HiSparse 109 · solo 124 · sequence scope 138 · the napkin's lever-2 example, 120) or a free slider for $\vN$; the time per output token; and the price of one GPU-hour, default USD 3 and marked as assumed. Every tile also shows its ratio to HiSparse at the same inputs. The step time comes from the chosen reference setting; on the Bench no step time was measured, so there the chain stops at $\vN$ and the figure says so ([[#landscape-reference-settings]]).
:::

::: try
1. Drag the price from USD 3 to USD 6. Every cost doubles; no ratio moves.
2. Pick "sequence scope". 138 sequences become 4 600 tokens per second and about USD 0.18, 0.79 of HiSparse's bill.
3. Push the free slider past 147. The figure accepts any $\vN$; the Pin does not, since 30 GB holds at most 147 hot caches of 4096 raw slots ([[#app-calculator]]).
:::

::: takeaway
- On the Pin at USD 3 per GPU-hour: HiSparse about USD 0.23 per million tokens, solo coding 0.20, a sequence-scope dictionary 0.18, on-fire dictionaries about 0.21.
- The price is an input you may change; the ratios are what to remember.
:::

## What the chain does not say {#what-it-does-not-say}

A natural reading of the chain goes "cheaper misses, so the link binds less, so a bigger decode batch, so cheaper tokens". It is right exactly as long as the link is the wall. On the Pin that is HiSparse's situation at $\vB = 4096$, and it lasts until $\vN$ reaches 147, where the hot caches alone fill the 30 GB. Past that point memory sets the batch, and cheaper misses do nothing. Only cheaper slots, [[lever]] 2, or lighter resident dictionaries move it ([[#app-calculator]]). Every dictionary design in the calculator's table already sits on the memory side of that kink, one reason their gains fall short of $1/\vrho$.

The chain also assumes the GPU is bound by the link or by its memory and by nothing else, the regime of [[#landscape-memory-wall]]. It is silent on:

- **Compute.** It takes $\vtpot$ as fixed; at some batch size the arithmetic of attention, or the bandwidth to the weights, becomes the wall and the step time rises.
- **Prefill.** Tokens the LLM reads cost time and memory and produce no output token; the chain counts only decode ([[prefill-decode|prefill / decode]]).
- **Kernel batching limits.** An attention kernel batches some bounded number of sequences; the chain assumes it batches $\vN$.
- **Latency targets.** A service that promised 30 ms per token cannot grow its batch until that promise breaks.
- **Host memory.** The orchards pushed off the GPU live in [[dram|host DRAM]], which has a price too.

::: theme every-tax
Host memory is the tax this chain forgets. The orchards and dictionaries pushed off the GPU land in DRAM, which is billed by the gigabyte as well, at a lower rate than HBM and not at zero.
:::

::: pull
Change the price and every cost on this page moves with it; the ratio between two designs does not move at all.
:::

So read the chain as a way to rank designs against a fixed background. The dollar figure at its end is an illustration; the ratio next to it is the result.

::: takeaway
- "Cheaper misses, bigger batch" holds while the link binds; once memory binds, only lever 2 or lighter dictionaries grow the batch.
- The chain counts bytes and memory only. Compute, prefill, kernel batching limits, latency targets and the price of host memory are outside it.
- The ratio against HiSparse transfers to other machines and prices; the dollar figure does not.
:::
