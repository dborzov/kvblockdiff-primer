---
title: A synthetic dress rehearsal
nav: Dress rehearsal
group: Before building
lede: Before measuring a real orchard, run the whole measurement on made-up punnets whose answer is known. If the method cannot find what was planted, or finds what was not, it is broken, and a shuffle shows which.
cards:
  - q: Why rehearse the measurement on synthetic punnets before touching a real orchard?
    a: Their structure is known, so the method must recover what was planted and find nothing where nothing was planted
    wrong: ["Synthetic data compresses better, so the results look good", "Real orchards cannot be read from a GPU", "It replaces the real measurement"]
    why: A known answer turns the data itself into a test of the code. It says nothing about orchards.
    sec: recipe
  - q: In the rehearsal, at which stretch length is the furrow-statistics rate lowest, and why?
    a: At 2048 tokens, the true length of the planted stretches
    wrong: ["At 256 tokens; smaller punnets always fit better", "At 4096 tokens; the dictionary is cheapest there", "It does not depend on the stretch length"]
    why: Shorter stretches pay more for their dictionaries and fit noisier statistics; longer ones straddle two planted stretches and fit neither.
    sec: shapes
  - q: After shuffling tokens across sequences, the sequence-scope gain fell to 0.13 bit instead of zero. What is that?
    a: The calibration gap, the global table fit on 8 other sequences being slightly off for these; it shrinks with more calibration sequences
    wrong: ["Real token-level structure that survived", "A bug in the shuffle", "The stretch-scope gain, mislabelled"]
    why: 'With 2, 8 and 32 calibration sequences the shuffled sequence gain is 0.22, 0.12 and 0.07 bit. Gains are read against the shuffled curve, never against zero.'
    sec: shapes
---

An orchestra rehearses in an empty hall before it plays for an audience. A measurement deserves the same courtesy. Before the harness touched a real orchard, the pipeline of `analysis/plan_harness.py` was run on punnets invented for the purpose, whose answer we know because we planted it.

::: note warning What this is not
Nothing on this page is a result about orchards. It checks that the **method** produces the right shapes and that its controls work. The numbers belong to the recipe below, not to any LLM.
:::

## A world with a known answer {#recipe}

The synthetic cherries have $\vd = 64$ elements. Each element is a sum of planted parts, each with its own [[scope]]:

```python the synthetic orchard (analysis/plan_harness.py, synthetic_kv)
#  x = mu_c + s_c * (sequence offset[s, c] + stretch offset[s, t // true_b, c] + noise)
#  offsets ~ N(0, 1) per sequence and per true stretch of 2048 tokens; noise ~ N(0, 1);
#  one furrow in 16 has a large constant mean (like the outlier furrows of pre-RoPE keys).
calibration, evaluation = synthetic_kv(n_eval=4, n_calib=8, T=8192, d=64, true_b=2048)
# population truth: sequence-scope gain 0.292 bit, stretch-scope gain 0.500 bit per element
```

Four evaluation sequences of 8192 tokens are measured; eight others serve as the calibration corpus for the global tables. The true stretches are 2048 tokens long and line up with the stretch grid, kinder than real data will be. Values are rounded to 8-bit codes on both grids, INT8 with a per-furrow scale and E4M3 ([[#toolbox-bit-fields]]). Every rate is a bill with everything included ([[#toolbox-the-bill]]): the residual under a grid-aware table or a fixed-length code ([[#toolbox-two-rates]]), the furrow statistics' two numbers plus the compressor's own settings charged to the dictionary, the per-furrow flag's bit.

Here is the whole idea of the main control in a dozen lines: a stretch offset is planted, the stretch gain is measured, the tokens are shuffled, the gain is measured again.

```python the shuffle control on a toy with planted stretch offsets
import numpy as np
rng = np.random.default_rng(0)
offsets = rng.normal(0, 14, (32, 1, 64))                   # 32 true stretches: one offset per furrow
x = np.rint(offsets + rng.normal(0, 20, (32, 2048, 64)))    # 2048 tokens each, plus white noise

def bits(r):                      # Gaussian estimate of bits per element, furrow by furrow
    return np.mean(0.5 * np.log2(2 * np.pi * np.e * r.var(axis=0)))

def gain(x):                      # global locations minus stretch locations (each punnet subtracts its own mean)
    flat = x.reshape(-1, 64)
    return bits(flat - flat.mean(0)) - np.mean([bits(p - p.mean(0)) for p in x])

shuffled = rng.permutation(x.reshape(-1, 64)).reshape(x.shape)   # tokens across stretches
print(f"stretch gain {gain(x):.3f} bit, after shuffling {gain(shuffled):.3f} bit")
# stretch gain 0.281 bit, after shuffling 0.001 bit
```

The exchange rate predicts $\tfrac12\log_2(596/400) \approx 0.29$ bit for this toy; the code finds 0.28, and nothing once the tokens are shuffled. The harness runs four such controls, all as assertions ([[#scenario-the-harness]]):

1. **Synthetic truth.** The stretch gain must peak at the planted length and track the float-domain gain.
2. **The [[shuffle-control]].** Tokens permuted across the evaluation sequences; every stretch-scope gain must fall below 0.05 bit.
3. **The scope identity.** Sequence scope must equal stretch scope with `stretch_len = n_tokens`, to the bit, for every compressor, format and dataset.
4. **The round trip.** Every punnet's residuals decode exactly, and 2048 cherries are packed to real bytes and rebuilt one at a time, alone; the packed bits must equal the fixed-length rate to the last decimal. The control exists for bugs like `int8` wrap-around: codes `[120, −120]` minus locations `[−100, 100]` give `[−36, 36]` in `int8`, and the true residuals are `[220, −220]`.

::: takeaway
- Synthetic punnets with planted structure at known scopes make the method testable: it must find what was planted, at the right scope, and nothing else.
- Four controls run as assertions: truth, shuffle, scope identity, round trip.
:::

## What the plots must look like {#shapes}

::: figure fig-toolbox-controls planControlsRun
**The scope ladder on synthetic punnets.** Horizontal axis: stretch length $\vb$ in cherries (log scale, 256 to 8192, the whole sequence at the right edge). Vertical axis: bits per element, everything included. Solid: furrow statistics with the per-furrow flag at stretch scope on the original data; dashed: the same on the shuffled data; the horizontal dashed line is global scope; the dot at the right is sequence scope. The grey rule is solo coding at global scope; the vertical rule the planted stretch length. Switch the number format, the rate (entropy or fixed-length) and which data to show; the readout gives the sequence-scope and stretch-scope gains, original → shuffled. Data: `figures/data/plan-harness.json`, written by the script. **Synthetic data: a check of the method, not a result about orchards.**
:::

Read INT8 and the entropy rate first.

1. **The ladder has the right order.** Global 7.07, sequence 6.61, best stretch 6.27 bits: a sequence-scope gain of 0.46 and a stretch-scope gain of 0.34. The float-domain numbers are 0.41 and 0.37; the population truth 0.29 and 0.50. Four sequences and eight calibration sequences are a small world, and the two scopes borrow from each other at the edges; the test is that the grid-domain ladder tracks the float ladder within 0.1 bit, and it does.
2. **The rate bottoms out at the planted length,** 2048. Shorter stretches pay more for their dictionaries and fit noisier statistics; 4096 straddles two planted stretches and fits neither (6.50). On real data the position of this minimum would be the drift scale of the orchard; on the Bench no such minimum appeared ([[#toolbox-furrow-statistics]]).
3. **E4M3 tells the same story in the entropy column,** 6.37 → 5.91 → 5.57, gains 0.46 and 0.34, because the table is grid-aware. In the fixed-length column it does not: global furrow statistics cost 8.85 bits, *worse than raw*, until the flag turns the prediction off furrow by furrow (7.91), and the gains shrink to 0.06 and 0.16 against INT8's 0.57 and 0.37. The structure is the same on both grids; how much a fast format can cash in is not ([[#toolbox-bit-fields]]).

Now switch to the shuffled data.

- **The stretch-scope gain vanishes** on every grid and in both columns: −0.004 bit.
- **The sequence-scope gain does not quite vanish:** 0.13 bit. That is the calibration gap, the global table fit on eight other sequences being a little off for these four. With 2, 8 and 32 calibration sequences the shuffled sequence gain is 0.22, 0.12 and 0.07 bit in the float domain: a bias of the global rung that shrinks with calibration data, and exactly what the control is for.

The lesson for every real measurement: compare each curve with *its own* shuffled value at the same stretch length, not with zero and not with the global line. The campaigns did ([[#measured-two-kinds-of-structure]]): the tree compressor lost 70 % of its gain under the shuffle, the linear-prediction gain moved by 0.002.

::: theme controls
The control earned its keep twice here: the planted gains vanished when they should, and a rung that looked like structure (0.13 bit of sequence gain after shuffling) was named for what it is.
:::

::: takeaway
- On planted data the method finds the ladder (global > sequence > stretch), the planted stretch length, and the grid's effect on the fixed-length column.
- The shuffle erases the stretch gain and exposes the calibration gap; real gains are read against the shuffled curve at the same stretch length.
:::
