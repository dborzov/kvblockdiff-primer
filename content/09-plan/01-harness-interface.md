---
title: 'The harness: one interface'
nav: The harness
group: The harness
lede: Before any experiment, a referee. The harness is a small program that every dictionary algorithm must pass through, so that two claims of "1.4×" can be compared without an argument.
cards:
  - q: What is the harness?
    a: The small program that runs every dictionary algorithm through one interface, charges every byte by one rule, runs the controls and plots the results
    wrong: ["A GPU kernel that decodes deltas at gather speed", "The sparse-attention indexer of the proxy model", "A test suite for the serving system"]
    why: It is a referee, not a coder. Coders plug into it; it decides what their numbers are worth.
    sec: unfair
  - q: Two people report "1.4× on 8-bit KV". Which difference makes the claims impossible to compare?
    a: One charged the dictionary's bytes to the entries that use it, the other did not
    wrong: ["One used Python, the other C++", "One ran on keys first, the other on values first", "One printed the ratio, the other the bits per element"]
    why: A dictionary that is not paid for makes any coder look good. The harness charges every byte by the same rule, so the numbers mean the same thing.
    sec: unfair
  - q: Which three methods does every algorithm implement in the harness?
    a: fit (build the dictionary), encode (one delta per entry), decode (rebuild an entry bit for bit)
    wrong: ["compress, decompress, verify", "train, predict, score", "load, store, evict"]
    why: 'The harness supplies everything else: the byte counts, both rates and the controls.'
    sec: interface
  - q: Why must each delta be decodable alone, given only its dictionary?
    a: Because a cache miss fetches one scattered entry; it cannot decode the entries before it first
    wrong: ["Because Python cannot keep state between calls", "Because it makes the deltas smaller", "Because the dictionary changes after every entry"]
    why: The access pattern of the miss path is random access. A stream coder that needs the previous entries would have to fetch them too.
    sec: interface
  - q: Read the Gull Rock afternoon as a block of entries. Which channel plays the part of an outlier channel of keys?
    a: The pressure — about 1011 hPa in every reading, a big constant that one dictionary entry absorbs
    wrong: ["The wind, because it changes most", "The humidity, because it is a fraction", "The top thermometer, because it disagrees with the foot one"]
    why: 'Written raw, a pressure needs 15 bits; minus its channel''s location, 6. That is what loc does for a channel that sits far from zero.'
    sec: interface
  - q: Why does a fixed interface make an automated search over coders possible?
    a: A proposer can write a new coder, and the harness scores it with the same rule and controls, with no human judging each claim
    wrong: ["Because a fixed interface makes every coder equally fast", "Because the controls choose the best coder by themselves", "Because the interface forbids heavy dictionaries"]
    why: One interface and one score turn "is this coder better?" into a number. The controls guard against the ways a search would cheat.
    sec: why
---

Two engineers each report that their coder squeezes 8-bit KV caches by "1.4×". Over coffee it comes out that:

- the first one counted the bytes of her dictionary, the second one forgot his;
- the first one fit her dictionary on one block and coded the same block, the second one fit his on a separate set of documents;
- the first one rebuilt every entry and compared it bit by bit, the second one "checked a few, they looked right".

Both numbers are honest. Neither means anything next to the other. This Part is the plan for the first real measurements of [[kv-blockdiff]], and it starts with the cure for that coffee-break conversation: a referee.

## Three ways to win an argument unfairly {#unfair}

Every comparison of compressors can go wrong in three ways, and the three engineers above show all of them.

1. **Forget a bill.** A dictionary, a codebook index, an escape list — every piece of [[side-information|side information]] costs bytes. Leave one out and the rate looks better than it is.
2. **Peek at the answer.** A dictionary fit on the very data it then codes has an unfair head start. A dictionary meant to be shared by all requests, fit on the test documents, is cheating outright.
3. **Lose a bit.** A coder that rebuilds "almost" the original is [[lossy]], however small the error. The whole point here is [[lossless]].

::: define harness
- **What it is:** a small program (a few hundred lines of numpy) that every dictionary algorithm must go through. It owns the byte counting, the two rates, the controls and the plots. The algorithms own only their own logic.
- **Example:** the [[loc]] dictionary plugs into it in nine lines; the harness then charges its bytes, scores it at every [[scope|dictionary scope]] and checks that every entry comes back bit for bit.
- **Easy to confuse with:** a coder (the harness codes nothing itself), or the serving system (the harness never touches a GPU after the data is dumped).
:::

A complete, tested version of it is part of this site: `analysis/plan_harness.py`. Every code snippet in this Part is quoted from that file, and every number we quote from "the harness" was printed by running it.

Here is the plan of the whole Part, as a map. The harness is the first column; the other three columns use it.

```graph
id: plan-map
columns: [Build the referee, "Wave 1: one weekend", Decide, "Wave 2"]
nodes:
  - {id: iface, col: 1, row: 1, title: "One interface", text: "fit, encode, decode.", link: plan-harness-interface, term: harness}
  - {id: acct, col: 1, row: 2, title: "One accounting rule", text: "Every byte charged the same way.", link: plan-accounting, term: bpe}
  - {id: ctrl, col: 1, row: 3, title: "Four controls", text: "Built before any real data.", link: plan-controls, term: shuffle-control}
  - {id: data, col: 1, row: 4, title: "The data", text: "A dump from a small model.", link: plan-data, cat: llm}
  - {id: s0, col: 2, row: 1, title: "Step 0: the 8-bit target", text: "E4M3 and INT8 codes.", link: plan-fp8-target, term: fp8}
  - {id: e1a, col: 2, row: 2, title: "1a: one-hour diagnostic", text: "Three float numbers.", link: plan-experiment-1a, term: fallen-apple}
  - {id: e1b, col: 2, row: 3, title: "1b: the exact ladder", text: "Real bits, every rung.", link: plan-experiment-1b, term: scope}
  - {id: out, col: 2, row: 4, title: "What wave 1 produces", text: "Curves, Table 1, the weekend.", link: plan-wave1-outputs, term: curve}
  - {id: rule, col: 3, row: 2, title: "The decision rule", text: "Written before the data.", link: plan-decision-rule, term: scope-gain}
  - {id: idx, col: 4, row: 1, title: "Simulating the indexer", text: "Exact top-k as a stand-in.", link: plan-wave2-indexer, term: indexer}
  - {id: meas, col: 4, row: 2, title: "What to measure", text: "Where misses land.", link: plan-wave2-measure, term: heavy-block}
  - {id: cost, col: 4, row: 3, title: "Cost model and paper", text: "Requests per GPU; the claim.", link: plan-cost-model-and-paper, term: lever}
edges:
  - [iface, acct]
  - [acct, ctrl]
  - [ctrl, data]
  - [iface, s0, "used by"]
  - [s0, e1a]
  - [e1a, e1b]
  - [e1b, out]
  - [out, rule]
  - [rule, idx, "go"]
  - [idx, meas]
  - [meas, cost]
```

::: takeaway
- Compressors are compared unfairly in three ways: a forgotten bill, a peek at the answer, a lost bit.
- The harness is the referee that rules out all three, once, for every algorithm.
- It exists: `analysis/plan_harness.py` runs on this site's synthetic data, and the rest of Part IX quotes it.
:::

## The interface {#interface}

An algorithm enters the harness by implementing three methods. A block arrives as a table of 8-bit codes: one row per [[entry]], one column per [[channel]].

```python the interface every dictionary algorithm implements (analysis/plan_harness.py)
class DeltaCoder:
    """One dictionary algorithm. It sees 8-bit codes as int16 arrays of shape (rows, d)."""
    name = "?"

    def fit(self, F):            # F: the fitting set (a block, a request, or calibration codes)
        raise NotImplementedError  # -> the dictionary D: a numpy array, or a tuple of them

    def encode(self, X, D):      # -> integer residuals, one row per entry, each decodable alone given D
        raise NotImplementedError

    def decode(self, r, D):      # -> the codes again, bit for bit
        raise NotImplementedError
```

- `fit` builds the [[dictionary]] $\vD$ from a **fitting set**. Which fitting set it gets is the harness's decision, not the algorithm's: that is how the harness controls the [[scope|scope]].
- `encode` turns each entry into a [[delta]]: here, a row of exact integer [[residual|residuals]].
- `decode` must give back the codes exactly. The harness checks this on every block.

The comment on `encode` hides the most important rule: **each delta must be decodable alone, given $\vD$.** On the miss path a cache miss fetches one scattered entry ([[#idea-data-layout]]). The decoder cannot first decode the entries before it. That one sentence rules out every stream coder.

The lightest real dictionary shows the shape. [[loc]] stores one typical value per channel; the delta is the difference.

```python loc: one location per channel
class Loc(DeltaCoder):
    """The lightest dictionary: one location per channel (d bytes), the median of the fitting set."""
    name = "loc"

    def fit(self, F):
        return np.round(np.median(F, axis=0)).astype(np.int8)

    def encode(self, X, D):
        return X.astype(np.int16) - D      # int16: an int8 difference would wrap around

    def decode(self, r, D):
        return (r + D).astype(np.int16)
```

A block can be any table of entries and channels. Take one you have met: the Gull Rock afternoon of [[#school-vectors]], twelve readings of five sensors. Read as a block, each reading is an entry and each sensor is a channel.

::: dataset fig-plan-day-block gull-day view=channels metrics=means,bits-raw,bits-centred
**The Gull Rock afternoon, read as a block.** *Plot:* one strip per channel (two thermometers, humidity, pressure, wind), each on its own scale; a vertical slice through all five is one reading — one entry. Hover to read an entry, click to select it. *Table:* the twelve readings. *Numbers:* each channel's mean, and the fixed-length bits of one reading written as it is and with each channel's mean subtracted. Synthetic data, seeded; the same readings as on II.13.
:::

Look at the pressure strip. Every reading sits near 1011 hPa, so most of each pressure value is the same in all twelve. Subtracting a location per channel takes 45 bits per reading down to 21 — and subtracting a location per channel is exactly what loc does. The barometer plays the part of an outlier channel of keys: a big constant that one dictionary entry absorbs.

::: figure fig-plan-decode-alone planDecodeAlone
**The afternoon, its loc dictionary, and one reading decoded alone.** First table: the twelve readings of [[#fig-plan-day-block]] in whole sensor steps (tenths of a degree for the two thermometers, hundredths of humidity, tenths of a hectopascal, knots). Second: the dictionary $\vD$, the median of each channel. Third: the deltas, each reading minus $\vD$. Click a reading: it is rebuilt from $\vD$ and its own delta only (highlighted); the other deltas are not read. The readout compares the delta's size under a [[fixed-length-code|fixed-length code]] (each channel's width just covers its largest residual, sign included) with the reading written raw, as on II.13. Synthetic data, seeded.
:::

::: try
1. Click 14:30, then 20:00. The dictionary lights up every time; only one delta row does.
2. Look at the pressure column. 10,126 steps of 0.1 hPa need 15 bits raw; the residuals around the median need 6. The location absorbed the big constant.
3. Compare the delta's 21 bits with the raw 45. That ratio is the [[delta-ratio|delta ratio]] of this toy block — before the dictionary's own bytes are charged, which is the next page's subject.
:::

::: takeaway
- Every algorithm implements `fit`, `encode` and `decode`; the harness supplies the bytes, the rates and the checks.
- The harness, not the algorithm, decides what a dictionary is fit on. That is how scope is controlled.
- Each delta must decode alone, given its dictionary: the miss path is random access.
:::

## Why an interface, not a program {#why}

One could write one script per idea. The interface is better for two reasons.

:::: compare A coder versus the harness
::: col A coder
- Knows how to predict an entry: a location, a basis, a codebook, a sibling.
- Says nothing about what its bytes cost or what it was fit on.
- Is one point in a large design space.
:::
::: col The harness
- Knows nothing about prediction.
- Fixes what every byte costs, what each scope may see, and what "exact" means.
- Turns the design space into a set of comparable points: the [[curve]] of [[#questions-framework-b]].
:::
::::

**Comparisons without argument.** With one interface and one score, "is VQ better than loc here?" has a numerical answer. The answer is a pair of rates in [[bpe|bits per element]], at a given scope and block size, with every byte charged.

**A search that can be automated.** Because the score is fixed, the loop "propose a coder, score it, read the curve, propose the next" can run without a human judging each step. The source proposal parks this idea as a question ([[#questions-parked-automation]]). The harness is what makes it safe: its controls catch the three ways a search would cheat — forgetting to charge bytes, fitting on the test set, losing bits.

::: takeaway
- An interface turns a pile of scripts into comparable points on one curve.
- A fixed score makes an automated search over coders possible; the controls keep it honest.
:::
