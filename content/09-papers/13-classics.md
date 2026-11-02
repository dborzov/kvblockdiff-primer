---
title: The classics we lean on
nav: The classics
group: Old theory
lede: Five old results this project quietly depends on. Coding against what only the receiver knows, one curve for every cache size, the clairvoyant cache, and rotations that work on integers. Each with a toy, and with our honest read of how much we need it.
cards:
  - q: The receiver knows Y, which equals X or differs from it in one of three bits. Without knowing Y, how many bits must the sender spend on X?
    a: 2 bits, the index of X's bin
    wrong: ["3 bits, the whole of X", "1 bit", "0 bits: the receiver can guess X from Y"]
    why: Bins pair each 3-bit string with its complement. The two members differ in all three bits, so only one of them can be within one flip of Y.
    sec: idea
  - q: What do Slepian–Wolf's bins assume that a 512-byte cold decode cannot offer?
    a: Very long runs of symbols and good statistics of how X and Y differ
    wrong: ["That the sender knows Y", "That X and Y are independent", "That the code is lossy"]
    why: The theorem's rate is reached in the limit of long codes. One cherry decoded alone under the leash is the opposite regime.
    sec: assume
  - q: Why can one pass over a trace give an LRU cache's misses at every size at once?
    a: An ask misses exactly when its stack distance is at least the cache size, so counting distances answers every size
    wrong: ["Because LRU never evicts anything", "Because every cache size has the same miss rate", "Because Bélády's policy computes it"]
    why: LRU's contents at size B are always contained in its contents at size B + 1 (Mattson's inclusion property), which is what makes the stack distance meaningful.
    sec: show
  - q: On the toy trace, LRU with 3 slots misses 7 times and Bélády's policy 6 times. What does the 6 mean?
    a: No eviction policy whatsoever can miss fewer than 6 times with 3 slots on this trace
    wrong: ["LRU can be tuned to reach 6", "A 6-slot cache would miss 3 times", "Bélády's policy is what HiSparse uses"]
    why: Bélády's policy knows the future and evicts the item needed furthest ahead; it is optimal for equal-cost misses, so it is a floor, not a design.
    sec: show
  - q: In kvblockdiff the sender builds each punnet dictionary itself. What is the formal home of coding cherries against it?
    a: Ordinary conditional coding; both ends know the dictionary, and Slepian–Wolf is needed only for side information the sender cannot see
    wrong: ["Slepian–Wolf coding, because only the GPU holds the dictionary", "Wyner–Ziv coding, because the deltas are lossy", "Rate–distortion theory with no side information"]
    why: Slepian–Wolf's surprise is that the sender may lack Y. When the sender has Y, our case for dictionaries, the H(X | Y) of Part II already applies.
    sec: ours
  - q: Why is the step x → x + round(a · y) exactly reversible on integers?
    a: The step leaves y unchanged, so the decoder recomputes the same round(a · y) and subtracts it
    wrong: ["Because rounding never changes an integer", "Because a is always an integer", "Because rotations preserve length"]
    why: That is lifting. Three such shears make a rotation; a PLUS factorization makes any matrix with determinant ±1 out of such steps.
    sec: words
---

Some of the most useful ideas in this project are older than the people writing it. The first draft name-dropped five of them in a single paragraph. Here each gets a toy, a sentence on why we lean on it, and a sentence on where we lean less than the first draft claimed. These are theorems, not measurements, so the trust rule of [[#papers-reading-guide/trust]] reads differently: what they *show* is certain; what they *assume* is where the care goes.

## The ideas, by example {#idea}

### Side information at the decoder: Slepian–Wolf {#side-info}

Back on Gull Rock, the station has two thermometers, and the mainland already knows the reading $\vY$ of the upper one. The lower one's reading $\vX$ is a 3-bit code, and the two never differ in more than one bit. If the station knows $\vY$ too, the answer is from [[#school-side-information]]: given $\vY$ there are four possibilities ($\vY$ itself, or one of three single flips), so 2 bits. Here is the surprise: **the station does not need to know $\vY$.** Split the eight codes into four bins of two, each code paired with its exact opposite:

| bin | members | bin index sent |
|---|---|---|
| 0 | `000`, `111` | `00` |
| 1 | `001`, `110` | `01` |
| 2 | `010`, `101` | `10` |
| 3 | `100`, `011` | `11` |

Send only the bin index of $\vX$. The two members of a bin differ in all three bits, so at most one of them is within one flip of $\vY$; the receiver picks that one.

::: figure fig-papers-slepian-wolf paSlepianWolf
**Coding with side information only the receiver has.** Choose the lower thermometer's 3-bit reading $\vX$, and how the receiver's reading $\vY$ differs from it. The four cards are the bins; the sender transmits only the index of $\vX$'s bin (2 bits instead of 3). The receiver compares both members of that bin with $\vY$ (the number of differing bits is shown under each) and keeps the closer one. The last option breaks the promise, two flips, and shows how decoding then fails.
:::

::: define slepian-wolf
- **What it is.** Slepian and Wolf's theorem (1973): a source $\vX$ can be coded losslessly at $\vH(\vX \mid \vY)$ bits per symbol even when only the decoder knows $\vY$, exactly the rate as if the encoder knew it too. The proof uses bins, as in the toy, over very long runs of symbols.
- **Its lossy sibling.** Wyner and Ziv (1976) asked the same question for lossy coding. There, the encoder's ignorance usually costs some rate (for bell-shaped data with squared error, none).
- **Easy to confuse with** ordinary side information, where both ends know $\vY$ ([[side-information]], [[conditional-entropy]]).
:::

### One pass, every cache size: Mattson and Bélády {#stack}

Mattson, Gecsei, Slutz and Traiger (1970) noticed that LRU has an *inclusion property*: whatever a cache of $\vB$ slots holds, a cache of $\vB + 1$ slots holds too. So each ask has one number, its [[reuse-distance]], or stack distance (how many distinct other items were used since its last use), and it misses in every LRU cache with fewer slots than that. One pass over a trace gives the whole [[miss-rate-curve]].

| ask | A | B | C | A | D | B | A | E | C | A |
|---|---|---|---|---|---|---|---|---|---|---|
| stack distance | ∞ | ∞ | ∞ | 2 | ∞ | 3 | 2 | ∞ | 4 | 2 |

Count the distances of at least $\vB$, and you have LRU's misses at that size: 10 misses with 1 or 2 slots, 7 with 3, 6 with 4, and 5 with 5 or more (the five first uses can never hit). Bélády (1966) asked the opposite question: what is the best any policy could do? On a miss, evict the item whose next use is furthest in the future. It needs a crystal ball, so it is a yardstick, not a design. On the toy trace it misses 7 times with 2 slots, 6 with 3 and 5 with 4: one miss fewer than LRU at each of those sizes.

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

### Rotations on integers: lifting and PLUS {#lifting}

A [[klt|KLT]] [[rotation]] turns integers into irrational numbers, and rounding them back breaks reversibility: two different integer points can land on the same rounded pair. [[lifting|Lifting]] fixes this with one trick. A *shear* step adds a rounded multiple of one coordinate to another, $x \to x + \mathrm{round}(a\,y)$, and leaves $y$ alone; the decoder recomputes the same rounding from the same $y$ and subtracts it. Three shears make a rotation ($x$, $y$ and $a$ are throwaway letters for this toy).

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
- **What it is.** For a whole $\vd \times \vd$ matrix, a factorization into four pieces named P, L, U and S: a reordering of the elements (P), then three triangular factors (L, U and a special S) whose diagonals hold only ones when the matrix is a rotation. Introduced by Pengwei Hao (2004), after Hao and Shi's triangular elementary reversible matrices (2001). Each factor is a batch of shears, so any rotation (determinant 1) becomes an exactly reversible integer transform.
- **Where it is used.** Lossless JPEG 2000 does the same in miniature: its reversible colour transform and its reversible 5/3 wavelet are both written as lifting steps.
- **Easy to confuse with** a rotation followed by rounding, which is lossy, and which is what the campaigns tried ([[#measured-codebooks-and-rotations]]).
:::

::: takeaway
- Slepian–Wolf: bins let the receiver's knowledge pay even when the sender lacks it.
- Mattson: one pass over a trace gives LRU's misses at every size; Bélády gives the floor.
- Lifting: shears with rounding are exactly reversible; a PLUS factorization makes any rotation one.
:::

## What they assume {#assume}

Theorems are certain within their assumptions, so the assumptions are the whole question.

| result | assumes | where it bites us |
|---|---|---|
| Slepian–Wolf | very long runs of symbols; a known joint distribution of $\vX$ and $\vY$; a rate reached in the limit | a cherry of 512 bytes decoded cold is the opposite of a long run; practical bin codes need both the length and the statistics |
| Wyner–Ziv | the same, for a distortion measure | we are lossless; it does not apply |
| Mattson's inclusion | an LRU cache (or any stack policy); FIFO lacks the property and can even miss *more* with a bigger cache, Bélády's anomaly (1969) | HiSparse's hot cache is LRU with a guard, so the one-pass curve applies to it |
| Bélády | every miss costs the same | on the shelf a [[raw-miss]] and a [[delta-miss]] cost different bytes, so the cost-aware floor is lower than Bélády's count suggests |
| lifting, PLUS | determinant ±1; integer inputs; the rounding in each step | the integer transform only approximates the KLT, so a little gain is lost; the inverse of a triangular factor runs element by element |

::: takeaway
- Long runs and known statistics for Slepian–Wolf; LRU for Mattson; equal-cost misses for Bélády; integers and determinant 1 for lifting.
:::

## What they show {#show}

All four are proofs, the most verifiable results in this Part.

- **Slepian–Wolf:** $\vH(\vX \mid \vY)$ is enough even if only the decoder has $\vY$. In the toy, 2 bits instead of 3, with no loss.
- **Mattson:** under LRU an ask misses exactly when its stack distance is at least $\vB$, so one pass gives $\vm(\vB)$ for every $\vB$. The toy's `[10, 10, 7, 6, 5]`.
- **Bélády:** evict what is needed furthest ahead; no policy misses less. The toy's `[10, 7, 6, 5, 5]`. HiSparse's 8.2 % against LRU's 13.4 % at 4096 slots is the same comparison on a real trace ([[#papers-hisparse]]).
- **Lifting and PLUS:** any rotation becomes an integer bijection; lossless JPEG 2000 is the proof of practice.

::: takeaway
- Four proofs; nothing here is "their measurement".
:::

## What it says about our scenario {#ours}

**Builds on.**
- The side-information theme from Gull Rock on: a dictionary the receiver holds is $\vY$, and coding a cherry against it is $\vH(\vX \mid \vY)$ ([[#school-side-information]], [[#scenario-the-contract]]). Since the sender *builds* each dictionary, both ends know it, and plain conditional coding is the right frame; Slepian–Wolf is not needed for that.
- The reuse-distance curve behind every cache number ([[#hypotheses-stack-distance]], [[#landscape-reuse-curve]]): HiSparse's three points are three readings of one Mattson curve, and the plan's hot-cache replay computes the whole curve in one pass ([[#plan-hot-cache-replay]]).
- Lifting as the route from a KLT bound to a lossless rotation ([[#toolbox-lifting]], [[#toolbox-klt]]).

**Conflicts with.** Two overstatements of the first draft, corrected here.
- It called Slepian–Wolf "the formal version of *the dictionary is resident on the GPU*". It is not: our encoder sees every dictionary. Slepian–Wolf becomes the right frame only for side information the encoder cannot see, for example which neighbouring picks happen to sit in the [[hot-cache]] when a miss is decoded. Bins could, in principle, let one stored delta decode against whatever related cherry is resident; practical bin codes need long runs and good statistics of how $\vX$ and $\vY$ differ, an awkward fit for 512-byte random reads. A direction to remember, not a stage to build.
- It credited the PLUS factorization to Hao and Shi (2001); the name and form come from Hao's 2004 paper.

And one measured caution: the campaigns tried rotation-then-rounding and paid about 0.25 bit per element for the rounding ([[#measured-codebooks-and-rotations]]). Lifting removes that tax but not the question of whether the rotation's gain was ever worth it; the bound comes first ([[#toolbox-bounds]]).

**Suggests.**
- A lifted (PLUS) rotation as a stage, tried only if the standardized spectrum's $\tfrac12\log_2(\mathrm{AM}/\mathrm{GM})$ clears the campaigns' reference-and-prediction gains ([[#papers-kvtc]]).
- A cost-aware Bélády for the shelf, where a raw miss and a δ-miss have different prices, as the yardstick of [[#plan-hot-cache-replay]].
- A Slepian–Wolf-shaped experiment for the victim tier of [[#app-victim-tier]], where the decoder may hold a related cherry the encoder could not predict.

::: theme side-info
Here side information is pushed to the extreme: the sender does not even know what the receiver knows, and pays nothing extra for it, on average, over long runs, if the promise holds. Our dictionaries never need that; our victim tier might.
:::

::: takeaway
- Builds on: conditional coding, the reuse-distance curve, lifting.
- Conflicts with: two overstatements of the first draft; the rounding tax lifting removes still needs a bound to justify it.
- Suggests: a lifted rotation behind a bound; a cost-aware Bélády; a Slepian–Wolf test for the victim tier.
:::

## Their words, ours {#words}

| their word | ours | where the meanings differ |
|---|---|---|
| side information at the decoder | a [[dictionary]] the receiver holds; for Slepian–Wolf, one the sender cannot see | ours is known to both ends |
| block (of a block code) | a long run of symbols coded together | not a stretch and not a punnet; the opposite of a cold decode |
| request (of a cache trace) | an ask, a [[pick]] | one item wanted at one step |
| stack distance | [[reuse-distance]] | the same number |
| inclusion property | the reason one pass gives $\vm(\vB)$ for every $\vB$ | — |
| OPT, MIN (Bélády's policy) | [[belady|Bélády's clairvoyant policy]] | a floor for equal-cost misses only |
| integer wavelet, reversible colour transform | [[lifting]] steps | — |
| channel permutation (the P of PLUS) | a reordering of [[element|elements]] | — |

::: aside source Receipts
Slepian and Wolf, *Noiseless coding of correlated information sources*, IEEE Trans. Inf. Theory, 1973. Wyner and Ziv, *The rate-distortion function for source coding with side information at the decoder*, 1976. Mattson, Gecsei, Slutz and Traiger, *Evaluation techniques for storage hierarchies*, IBM Systems Journal, 1970. Bélády, *A study of replacement algorithms for a virtual-storage computer*, IBM Systems Journal, 1966; Bélády, Nelson and Shedler on the anomaly, 1969. Hao and Shi, *Matrix factorizations for reversible integer mapping*, IEEE Trans. Signal Processing, 2001; Hao, *Customizable triangular factorizations of matrices*, Linear Algebra and its Applications, 2004 (the PLUS factorization). JPEG 2000 Part 1 (ISO/IEC 15444-1): the reversible colour transform and the 5/3 wavelet. The toys and listings are ours and run as shown. HiSparse's 8.2 % and 13.4 %: [[#papers-hisparse]]. The rounding tax of 0.25 bit: `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` §1.7.
:::
