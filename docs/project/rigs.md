# The rigs: the Pin and the Bench

Every estimate on the site is quoted for one frozen set of numbers, a **rig**, so that pages can be
compared. There are two, in `data/settings.yaml`:

| | **the Pin** | **the Bench** |
|---|---|---|
| what | GLM-5.1 on 8 × H200 as HiSparse serves it, converted to 8-bit storage | Qwen3.5-2B on one RTX 5080, the data the campaigns measured |
| owns | the deployment side: pick size $\vk$, miss rates, time per output token, link, GPU memory, threads per GPU | the data side: real tensor shapes, bytes per cherry, stanza lengths, measured ratios |
| home page | `landscape-reference-setting` (III.10) | `range-two-settings` (XII.7) |
| not measured | nothing (but every number is one trace's) | $\vk$, miss rates, TPOT (no picker ever ran on it) |

Rules:

1. **Teach shapes on the Bench, economics on the Pin.** The Bench has a real layout (6 KV layers, 2 KV
   heads × 256 elements, FP8); the Pin's 640 elements per cherry are derived from bytes per token. Code
   listings that introduce a word use Bench shapes. Threads-per-GPU arithmetic uses the Pin.
2. **A ratio of bytes may travel between rigs, with a flag.** A miss rate or a step time may not; the Bench has none.
3. **Prose typed for one rig keeps its numbers** and names the rig ("on the Pin"). Only numbers written as
   `[[@key]]` follow the switch in the top bar.
4. **Never mix a live number and a typed number in one computation.** A sentence is either all live or all named.

## `[[@key]]` and `ref:`

- `[[@e]]` renders the key's value in the current rig and repaints when the reader switches. Keys and
  formats are in `settings.yaml` (`model`, `NL`, `heads`, `headdim`, `d`, `e`, `k`, `L`, `b`, `m2`, `m4`, `m8`,
  `tpot`, `Wlink`, `Mhbm`, `gpu`, `format`; formats `int`, `bytes`, `pct`, `ms`, `gbps`, `gb`, `text`). A key
  that is `null` in a rig renders "not measured", so write the sentence so it still reads.
- A term or symbol may carry `ref: "{d} elements, {e} per cherry"`; the hover reminder then ends with the
  line for the current rig and, smaller, the other. Placeholders are substituted, never computed.
- Figures read `KV.setting`, `KV.ref(key)`, `KV.refFmt(key)` and listen for `kv:setting` (`docs/site/figures.md` §2).
- `node scripts/check-settings.mjs` and the build validate every placeholder against the key list.

## Adding a key or a rig

Add the key to `keys:` with `name`, `unit`, `fmt`, and a value (or `null`) to **every** rig; the build refuses
a rig missing a key. A new rig needs `label`, `name`, `home` (a page that defines it), `emblem`, `values`.
