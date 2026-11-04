# The project's subproblems: dense statements

kvblockdiff's claim is a bill (Part IV.1 on the site): per sequence and layer, link bytes per decode step
`T_step = misses × e × [f_D·ρ + (1 − f_D)] + n_load × w × e` and GPU bytes `M_seq = N_L × e × (B + n_D × w)`,
compared with HiSparse's `misses × e` and `N_L × e × B`. Each factor is supplied by one subproblem with its
own clean statement, data, tools and grade of result. This file is the dense version for agents; the
site teaches each on the page named.

## 1. The compression scenario (bytes per cherry): `scenario.md`, Part IV

- **Supplies** `ρ(w)` per scenario: the delta share reachable at each dictionary weight, under the leash,
  every cherry verified.
- **Inputs** an orchard dump (`k`, `v` per sequence), a scenario `(slice, cherry_shape, stretch_len,
  leash, fmt, llm, corpus)`, a compressor. **Outputs** MDL ratio = `x + ρ`, reads per cherry, per
  sequence, paired on the same punnets.
- **Why standalone**: the bytes a cherry needs depend only on the data and the compressor; no indexer,
  link or GPU is involved. Measurable today on the Bench dump; the campaigns' 387 trials are this
  subproblem.
- **Rules that come from the application**: one cherry at a time, cold decode, the dictionary charged,
  the leash, scenarios varied by what a pick covers.
- **Status**: values measured (solo 0.778, best 0.636 at w ≈ 0.52·b, light 0.686 at w ≈ 0.02·b); keys,
  keys+values, sequence scope, global scope, other text, other LLMs: open.

## 2. The pick trace (which picks are wanted): Part X.5 `plan-queries-and-picks`

- **Supplies** `picks[step][layer_id]`: the set of `token_pos_id` a selector names at each decode step for
  each KV layer, for a sequence, at a given `k`.
- **Inputs** an LLM with its weights, a sequence (the dump's tokens), a selector (the LLM's own indexer
  if it has one; otherwise a stand-in: exact top-k over `q · k` per KV head, aggregated over its query
  heads), `k`. **Outputs** the trace; its size is steps × layers × k integers.
- **Why standalone**: the trace depends on the LLM and the text, not on bytes or caches; it is computed
  once (one forward pass per sequence with queries kept) and replayed many times.
- **Validity**: a trace is valid for a sequence position `t` only if it was computed with the orchard of
  positions `< t` (prefill-only dumps give decode-like traces if attention is run causally); a stand-in
  selector is not a trained indexer (DSA's lightning indexer picks differently); the caveat travels with
  every number derived from it.
- **Status**: run on 2026-11-03 on the Bachelor (Qwen 2.5 1.5B, five sequences of 24.5K–30K tokens,
  queries kept; repository bachelor-kv): exact top-k per layer from the 12-head mean of the causal
  softmax, ranked to 2304, resident window 0/32/128, squeezed rows of 4 (Part XI.2). No trace exists for
  the Bench (no queries were stored); Qwen3.5-2B to 225K is the next one.

## 3. The hot-cache replay (where misses land): Part X.6 `plan-hot-cache-replay`

- **Supplies** miss rate `m(B)`, misses per layer per step, their distribution over stretches, stretch
  popularity and its lifetime, `f_D` for a residency policy and `n_D`, dictionary loads per step.
- **Inputs** a pick trace, `B`, a policy (LRU with the current-step guard, as HiSparse), `stretch_len`, a
  shelf policy (`n_D`, popularity threshold). **Outputs** counts only; no bytes, no time. The resolve
  listing of `notation.md` §3 and §5 is the whole simulator.
- **Why standalone**: it is a deterministic function of the trace and the policy; it runs in seconds per
  sequence on a laptop; the shuffle-the-trace control says what is luck.
- **Status**: HiSparse published `m(B)` for GLM-5.1 (30 / 13.4 / 6.7 % at 2048 / 4096 / 8192). Replayed
  on the Bachelor's traces (Part XI.4–7): calibrated (35 / 19 / 9.7 % at the Pin's share), miss rates
  carry at equal s = k/t; misses pile into stretches 3–5× above chance; f_D collapses on b / t^1.27, so at
  the Pin 4 × 4096 extrapolates to f_D 0.36–0.54 at 0.10–0.13 net loads per step; best shelf policy:
  popularity over 32 steps. Nothing on the Bench; reading 7 (are missed cherries harder) open.

## 4. The decoder's speed (does a cold decode fit the step): Part X.7 `plan-decoder-speed`

- **Supplies** cold-decoded cherries per second for a compressor on a GPU, hence bytes per second of
  rebuilt picks, to compare with the link's `W_link` and with the step's deadline (III.12: a decoder must
  beat the link by ≈ 10× to disappear behind it).
- **Inputs** a compressor's `decompress`, a cherry shape, a GPU, a batch of scattered asks. **Outputs**
  cherries per second, bytes per second, and the dictionary bytes touched per cherry (the reads of the
  leash, now as memory traffic).
- **Why standalone**: it depends on the compressor's decode path and the hardware, not on the data's
  statistics; it can be measured on synthetic deltas of the right shape.
- **Status**: unmeasured. The frontier compressors (reference tree + linear prediction + entropy coding)
  decode in Python today; the fixed-length variants are the candidates for a GPU kernel.

## 5. The economics (sequences per GPU, dollars): Part VI.9 `app-the-napkin`, VI.11

- **Supplies** `N = min(N_link, N_HBM)`, tokens per second per GPU, cost per million output tokens, for a
  reference setting.
- **Inputs** `ρ`, `w` (subproblem 1), misses / `f_D` / loads (3), the decode condition (4), the rig
  (settings). **Outputs** the napkin; every input carries its grade, every gap is an assumption marked.
- **Why standalone**: it is arithmetic; its value is in making the other four's outputs commensurable and
  in saying which factor binds (on the Pin, heavy dictionaries bind GPU memory before the link).

## Dependencies

```
orchard dump ──► 1 compression scenario ──► ρ(w) per scenario ─┐
      │                                                        ├──► 5 economics ──► N, $/Mtok
      └──► queries ──► 2 pick trace ──► 3 hot-cache replay ────┤
                                                               │
compressor + GPU ──► 4 decoder speed ──────────────────────────┘
```

Subproblems 1 and 2–3 share the dump but nothing else; 4 needs only a compressor; 5 needs all. Parallel
work is the design.
