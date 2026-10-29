---
title: The classics we lean on
group: Old theory
nav: The classics
lede: Five old results that this proposal quietly depends on — coding against what only the receiver knows, one curve for every cache size, the clairvoyant cache, and rotations that work on integers. Each with a toy, and with our honest read of how much we need it.
cards:
  - q: The receiver knows Y, which equals X or differs from it in one of three bits. Without knowing Y, how many bits must the sender spend on X?
    a: 2 bits — the index of X's bin
    wrong: ["3 bits, the whole of X", "1 bit", "0 bits: the receiver can guess X from Y"]
    why: Bins pair each 3-bit string with its complement. The two members differ in all three bits, so only one of them can be within one flip of Y.
    sec: side-info
  - q: In kv-blockdiff the encoder builds each block dictionary itself. What is the formal home of coding entries against it?
    a: Ordinary conditional coding — both ends know the dictionary; Slepian–Wolf is needed only for side information the encoder cannot see
    wrong: ["Slepian–Wolf coding, because only the GPU holds the dictionary", "Wyner–Ziv coding, because the deltas are lossy", "Rate–distortion theory with no side information"]
    why: Slepian–Wolf's surprise is that the sender may lack Y. When the sender has Y — our case for dictionaries — the classic H(X | Y) of Part II already applies.
    sec: side-info
  - q: Why can one pass over a trace give an LRU cache's misses at every size at once?
    a: A request misses exactly when its stack distance is at least the cache size, so counting distances answers every size
    wrong: ["Because LRU never evicts anything", "Because every cache size has the same miss rate", "Because Bélády's policy computes it"]
    why: LRU's contents at size B are always contained in its contents at size B + 1 (Mattson's inclusion property), which is what makes the stack distance meaningful.
    sec: stack
  - q: On the toy trace, LRU with 3 slots misses 7 times and Bélády's policy 6 times. What does the 6 mean?
    a: No eviction policy whatsoever can miss fewer than 6 times with 3 slots on this trace
    wrong: ["LRU can be tuned to reach 6", "A 6-slot cache would miss 3 times", "Bélády's policy is what HiSparse uses"]
    why: Bélády's policy knows the future and evicts the item needed furthest ahead; it is optimal for equal-cost misses, so it is a floor, not a design.
    sec: stack
  - q: Why is the step x → x + round(a · y) exactly reversible on integers?
    a: The step leaves y unchanged, so the decoder recomputes the same round(a · y) and subtracts it
    wrong: ["Because rounding never changes an integer", "Because a is always an integer", "Because rotations preserve length"]
    why: That is lifting. Three such shears make a rotation; a PLUS factorization makes any matrix with determinant ±1 out of such steps.
    sec: lifting
---

Some of the most useful ideas in this proposal are older than the people writing it. The first draft name-dropped five of them in a single paragraph. Here each gets a toy, a sentence on why we lean on it, and a sentence on where we lean less than the first draft claimed.

## Side information at the decoder: Slepian–Wolf and Wyner–Ziv {#side-info}

Back on Gull Rock, the station has two thermometers, and the mainland already knows the reading $\vY$ of the upper one. The lower one's reading $\vX$ is a 3-bit code, and the two never differ in more than one bit. How many bits must the station send for $\vX$?

If the station knows $\vY$ too, the answer is from [[#school-side-information]]: given $\vY$ there are only four possibilities ($\vY$ itself, or one of three single flips), so 2 bits. Here is the surprise: **the station does not need to know $\vY$.** Split the eight codes into four bins of two, each code paired with its exact opposite:

| bin | members | bin index sent |
|---|---|---|
| 0 | `000`, `111` | `00` |
| 1 | `001`, `110` | `01` |
| 2 | `010`, `101` | `10` |
| 3 | `100`, `011` | `11` |

Send only the bin index of $\vX$. The two members of a bin differ in all three bits, so at most one of them is within one flip of $\vY$; the receiver picks that one.

::: figure fig-papers-slepian-wolf paSlepianWolf
**Coding with side information only the receiver has.** Choose the lower thermometer's 3-bit reading $\vX$, and how the receiver's reading $\vY$ differs from it. The four cards are the bins; the sender transmits only the index of $\vX$'s bin (2 bits instead of 3). The receiver compares both members of that bin with $\vY$ (the number of differing bits is shown under each) and keeps the closer one. The last option breaks the promise — two flips — and shows how decoding then fails.
:::

::: define slepian-wolf
- **What it is:** Slepian and Wolf's theorem (1973): a source $\vX$ can be coded losslessly at $\vH(\vX \mid \vY)$ bits per symbol even when only the decoder knows $\vY$ — exactly the rate as if the encoder knew it too. The proof uses bins, as in the toy, over very long blocks.
- **Its lossy sibling:** Wyner and Ziv (1976) asked the same question for lossy coding. There, the encoder's ignorance usually costs some rate (for bell-shaped data with squared error, none).
- **Easy to confuse with:** ordinary side information, where *both* ends know $\vY$ ([[side-information]], [[conditional-entropy]]).
:::

**Our read.** The first draft called Slepian–Wolf "the formal version of *the dictionary is resident on the GPU*". That overstates it. Our encoder *builds* each dictionary, so both ends know it: coding against it is plain conditional coding, Part II material. Slepian–Wolf becomes the right frame only for side information the encoder cannot see — for example, which neighbouring entries happen to be in the [[hot-cache]] when a miss is decoded, something the offline encoder cannot know. Bins could, in principle, let one stored [[delta]] decode against whatever related entry is resident. Practical bin codes, however, need long blocks and a good model of how $\vX$ and $\vY$ differ — an awkward fit for 640-byte random reads. A direction to remember, not a tool to build with.

::: theme side-info
Here side information is pushed to the extreme: the sender does not even know what the receiver knows, and pays nothing extra for it — on average, over long blocks, if the promise holds.
:::

::: takeaway
- Slepian–Wolf: losslessly, $\vH(\vX \mid \vY)$ is enough even if only the decoder has $\vY$. Wyner–Ziv: the lossy version.
- For dictionaries we build ourselves, we only need ordinary conditional coding. Slepian–Wolf matters for side information the encoder cannot predict, such as the hot cache's contents.
:::

## One pass, every cache size: Mattson and Bélády {#stack}

Mattson, Gecsei, Slutz and Traiger (1970) noticed that LRU has an *inclusion property*: whatever a cache of $\vB$ slots holds, a cache of $\vB + 1$ slots holds too. So each request has one number — its [[reuse-distance]], or stack distance: how many distinct other items were used since its last use — and it misses in every LRU cache with fewer slots than that. One pass over a trace gives the whole [[miss-rate-curve]].

| request | A | B | C | A | D | B | A | E | C | A |
|---|---|---|---|---|---|---|---|---|---|---|
| stack distance | ∞ | ∞ | ∞ | 2 | ∞ | 3 | 2 | ∞ | 4 | 2 |

Count the distances of at least $\vB$, and you have LRU's misses at that size: 10 misses with 1 or 2 slots, 7 with 3, 6 with 4, and 5 with 5 or more (the five first uses can never hit).

Bélády (1966) asked the opposite question: what is the best any policy could do? His answer: on a miss, evict the item whose next use is furthest in the future. It needs a crystal ball, so it is a yardstick, not a design. On the toy trace it misses 7 times with 2 slots, 6 with 3 and 5 with 4 — one miss fewer than LRU at each of those sizes. HiSparse's 8.2 % against LRU's 13.4 % ([[#papers-hisparse]]) is the same comparison on a real trace.

```python stack distances in one pass, and Bélády's clairvoyant count
trace = list("ABCADBAECA")

def stack_distances(trace):
    stack, out = [], []                       # most recently used first
    for x in trace:
        d = stack.index(x) if x in stack else float("inf")
        if x in stack: stack.remove(x)
        stack.insert(0, x)
        out.append(d)
    return out

def belady_misses(trace, B):
    cache, misses = set(), 0
    for i, x in enumerate(trace):
        if x in cache: continue
        misses += 1
        if len(cache) == B:                   # evict the item needed furthest ahead
            ahead = trace[i + 1:]
            cache.remove(max(cache, key=lambda y: ahead.index(y) if y in ahead else len(trace)))
        cache.add(x)
    return misses

d = stack_distances(trace)
print([sum(s >= B for s in d) for B in range(1, 6)])    # LRU:    [10, 10, 7, 6, 5]
print([belady_misses(trace, B) for B in range(1, 6)])   # Bélády: [10, 7, 6, 5, 5]
```

**Our read.** Two cautions. FIFO lacks the inclusion property — it can even miss *more* with a bigger cache (Bélády's anomaly, 1969) — so the one-pass curve is an LRU tool. And Bélády's policy is optimal only when every miss costs the same. In [[kv-blockdiff]] a [[raw-miss]] and a [[delta-miss]] cost different numbers of bytes, so the true floor is a cost-aware one, and the 8.2 % is a yardstick for HiSparse, not for us.

::: takeaway
- Mattson: under LRU, a request misses exactly when its stack distance is at least $\vB$, so one pass gives $\vm(\vB)$ for every $\vB$.
- Bélády: evict what is needed furthest ahead — a floor for equal-cost misses, not for misses of different prices.
:::

## Rotations on integers: lifting, PLUS and lossless JPEG 2000 {#lifting}

A [[klt]] [[rotation]] turns integers into irrational numbers, and rounding them back breaks reversibility: two different integer points can land on the same rounded pair. [[lifting|Lifting]] fixes this with one trick. A *shear* step adds a rounded multiple of one coordinate to another, $x \to x + \mathrm{round}(a\,y)$, and leaves $y$ alone; the decoder recomputes the same rounding from the same $y$ and subtracts it. Three shears make a rotation ($x$, $y$ and $a$ are throwaway letters for this toy).

```python a 45° rotation of two thermometer readings, exactly reversible on integers
import numpy as np

def rotate_int(x, y, theta):          # three shears; each adds a rounded multiple
    a, s = -np.tan(theta / 2), np.sin(theta)
    x = x + round(a * y)
    y = y + round(s * x)
    x = x + round(a * y)
    return x, y

def unrotate_int(x, y, theta):        # the same shears, undone in reverse order
    a, s = -np.tan(theta / 2), np.sin(theta)
    x = x - round(a * y)
    y = y - round(s * x)
    x = x - round(a * y)
    return x, y

u, v = rotate_int(113, 117, np.pi / 4)        # readings in tenths of a degree
print((u, v), unrotate_int(u, v, np.pi / 4))  # (-3, 163) (113, 117)
```

The exact rotation of (113, 117) is (−2.83, 162.63): the integer version is off by less than one step in each coordinate, and comes back exactly.

::: define plus-factorization
- **What it is:** for a whole $\vd \times \vd$ matrix, a factorization into four pieces named P, L, U and S — a reordering of channels (P), then three triangular factors (L, U and a special S) whose diagonals hold only ones when the matrix is a rotation — introduced by Pengwei Hao (2004), after Hao and Shi's triangular elementary reversible matrices (2001). Each factor is a batch of shears, so any rotation (determinant 1) becomes an exactly reversible integer transform.
- **Where it is used:** lossless JPEG 2000 does the same in miniature. Its reversible colour transform and its reversible 5/3 wavelet are both written as lifting steps.
- **Easy to confuse with:** a rotation followed by rounding, which is lossy.
:::

**Our read.** This is how a KLT becomes lossless *if* the [[transform-coding-gain]] bound says it is worth it; the plan computes the bound first. The rounding in each step means the integer transform only approximates the KLT, so a little of the gain is lost. And the inverse of a triangular step must run channel by channel — 640 dependent steps per factor in the reference setting. Since the map is a bijection, that slow direction can be given to the encoder, which runs offline. One correction to the first draft's references: it credited the PLUS factorization to Hao and Shi (2001); the name and form come from Hao's 2004 paper.

::: takeaway
- Lifting: shears with rounding are exactly reversible; three make a 2-D rotation, a PLUS factorization makes any rotation.
- Lossless JPEG 2000 is the proof of practice. For us it is the route from a KLT bound to a lossless coder, if the bound is worth it.
:::
