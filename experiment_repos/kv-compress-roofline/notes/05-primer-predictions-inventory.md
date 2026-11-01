# What the primer predicted, assumed and asked — an inventory for Part XI

Source: the kvblockdiff-primer site at the commit on branch `wip/primer-2` (Parts I–X), read on 2026-10-31.
Purpose: give the writer of Part XI ("what two campaigns actually measured on Qwen3.5-2B KV caches") an exact list
of what the site guessed, so each result can be stated as "we guessed X (page id), we measured Y".

Confidence vocabulary used below is the site's own: **assumed** (a number chosen to make arithmetic concrete, usually
labelled "(assumed)" or "illustrative"), **illustrative** (a toy or made-up shape), **literature** (quoted from a paper,
sometimes "not re-checked"), **derived** (arithmetic from the reference setting or a closed formula), **Monte Carlo**
(the site's own seeded synthetic runs in `analysis/`), **theorem**, **hypothesis** (the thing the project exists to measure),
**judgement call** (a threshold fixed in advance without derivation).

---

## 1. Inventory of predictions, assumptions and bets

### 1.1 Part IV — the idea and what it bets on

| page id | claim (one sentence, with its number) | confidence wording |
|---|---|---|
| `idea-mapping` | Hot-cache misses are tiny, scattered, independent fetches (≈274 per layer per step, 640 B each), so half of the "dictionary profile" holds by construction; whether the entries are *alike enough* is "the bet". System figure uses an assumed delta of 0.75 e and dictionary of 32 entries' worth. | derived / assumed |
| `idea-dictionary-delta-block` | The block is a knob we choose, not a property of the data; the right b is read off a distance curve. Weights of the three archetypes: loc w≈2 (1.25 KiB), 16-direction basis w=32 (20 KiB), 256-centroid codebook w=256 (160 KiB) at e=640 B. "Every ρ on these pages is an assumption"; the only anchor is context-free coding at 1.1–1.3× (SplitZip). | derived; ρ assumed; literature |
| `idea-size-relations` | Per entry all-in cost is ρ + w/b of a raw entry (8ρ + 8w/b bits per element); with b=4096, ρ=0.75: light w=2 → 0.7505, medium w=32 → 0.7578, heavy w=256 → 0.8125 (dictionary share 0.07 % / 1.0 % / 7.7 %). | derived; ρ assumed |
| `idea-blockdiff-step-by-step` | Average miss moves e[f_D ρ + (1−f_D)] bytes plus loads; at f_D=0.85, ρ=0.75: ≈504 B per 640-B entry. Toy residency policy: keep the n_D blocks with most hot entries. | derived; f_D, ρ assumed |
| `idea-toy-trace` | A dictionary load pays for itself after w/(1−ρ) δ-misses in its block: 8 at w=2, ρ=0.75; ≈1,024 at w=256. In the three-step toy kv-blockdiff moves *more* bytes than HiSparse (2,880 vs 1,920). | derived |
| `idea-data-layout` | Four rules of the store (independence, addressability/fixed-length deltas, asymmetry, dictionaries are units). Fixed-length deltas cost "roughly 10–15 % more bits than an ideal entropy coder" (later corrected to 15–22 % on `homework-two-rates`). Heaviest offline encode (k-means 256 centroids, b=4096) is under 1 % of prefill compute (≈5×10¹³ vs 6×10¹⁵ FLOPs). | literature-based estimate; derived Fermi estimate |
| `idea-neighbour-similarity` | Three properties: Lucky Louis (established, about *which* entries), fallen-apple (hypothesis, first priority), upstairs (hypothesis, second). "Similarity" is defined only as bits saved, H(E) − H(E \| neighbour), per element; cosine and perplexity do not count. | hypothesis / definitional |
| `idea-fallen-apple` | **Fallen-apple similarity**: Δ ↦ H(E_t \| E_{t−Δ}) rises with token distance Δ; it is a *curve* with three knobs (saving next door, half-distance, a floor that never fades), not a threshold at b. Status: "a hypothesis. Not measured anywhere at 8-bit precision." Illustrative solo rate 6.5 bits in the figure. Plausibility comes from KIVI/KVQuant/CacheGen reports of big slowly-varying key channels at 16-bit or heavily quantized precision. Cosine toy: 0.86 cosine with R²=0.000 on 636 of 640 channels. | hypothesis; illustrative |
| `idea-upstairs` | **Upstairs similarity**: H(E_{l+1,t} \| E_{l,t}) < H(E_{l+1,t}); "some upstairs similarity in the hidden states is very likely; how much survives into stored keys and values is anyone's guess." If strong, groups of 4 layers could share a dictionary (78 → 20 per block). | hypothesis; second priority |
| `idea-heavy-blocks` | **Heavy blocks** (Lucky Louis per block): selections should crowd into few blocks that stay busy many steps; "unmeasured". Load budget: loads/step/layer × w ≪ 274. Light w=2 → keep all 25 block dictionaries resident (50 entries' worth ≈1 % of a 4096-slot hot cache). Toy indexer: concentration 0 → f_D 13 %, 0.66 loads/step; 80 % → f_D 77 %, 0.14 loads/step; n_D 1→8 moves f_D 25 %→81 %. | hypothesis; illustrative toy |
| `idea-cat-thread-ladder` | The three rungs (everything / thread / block) map to global / request / block scope; the "jump" from HiSparse's 87 % hit rate to "block dictionaries will work" is a leak. | argument sorted; theorem/leak/trap |
| `idea-what-is-right` | H(E) ≥ H(E\|thread) ≥ H(E\|block) is a theorem; the sizes of the steps are not and can be zero. Toy defaults: 3.17 / 2.60 / 2.43 bits (steps 0.57, 0.17). "Sameness of subject is real" and a loc dictionary captures it. | theorem; illustrative |
| `idea-the-leak` | HiSparse-like caching (overlap 76 %, hit rate 86 % at drift η=0.25; HiSparse: 70 %, 87 %) arises from i.i.d. Gaussian keys with neighbour R²≈0.000; near-copy keys (R²≈0.90, ≈1.66 bits saveable) leave the hit-rate curve unchanged. So hit rate is no evidence for fallen-apple similarity. | Monte Carlo (toy) |
| `idea-the-trap` | Variance-budget defaults 30 % global / 20 % thread / 20 % block / 30 % noise → rungs save 0.26 / 0.24 / 0.37 bit; whole ladder 0.87 bit of 8. One bit from the block rung needs it to explain ¾ of what the thread left. Escape hatch: concentrated structure — 10 % of channels at 98 % explained lifts 0.87 → ≈1.06 bits/element. Noise floor ½log₂(1/noise). | illustrative shares; derived formula |
| `idea-two-levers` | N = min(N_link, N_HBM). HiSparse: B=4096 → link-bound ≈110 (memory 146); B=8192 → memory-bound 73 (link 219). Lever 1 lifts N_link by up to 1/ρ; lever 2 lifts N_HBM. Compounding ≈ ρ^1.08 × ρ ≈ ρ²: 2.4× less miss traffic at ρ=0.65. Defaults (B=4096, ρ=0.65): lever 1 → 109→147; both levers → 168 (≈1.5×). Metric order: bits per element → f_D & loads → requests per GPU. | derived; ρ assumed |

### 1.2 Part VI — homework (napkin information theory)

| page id | claim | confidence wording |
|---|---|---|
| `homework-the-budget` | A bell-shaped channel in E4M3 has order-0 entropy **6.47 bits** at any scale from ≈1/4 to 128 (sign 1.00, exponent 2.54, mantissa 2.93 bits); per-channel-scaled INT8 gives **7.05 bits**. Real E5M2 KV: 6.19 bits (SplitZip). So context-free coding can win at most 1.5–1.8 bits (1.24–1.29×); a fixed-length decoder keeps ≈0.8–1 bit of it (1.10–1.14×). Everything beyond must come from conditional structure. bpe unit defined; ρ ≈ bpe/8. | Monte Carlo (Gaussian); literature |
| `homework-solo-coding` | **Solo (the Hermit)**: one fixed global per-channel code; ideal 6.47 bits (1.24×), fixed-length 7.24 bits (1.10×); published 1.14× E5M2, 1.32× BF16; top-8 E4M3 code *expands* (0.93×). "Coding 8-bit KV one element at a time is worth about 1.1–1.3×, and that is already published." All gains are counted from solo, not raw. The Hermit's blind spot = cross-entropy penalty ½log₂ 1/(1−R²) averaged over blocks. | Monte Carlo; literature; derived |
| `homework-exchange-rate` | Bits saved per element = ½log₂ 1/(1−R²): 50 %→0.50, 75 %→1.00, 90 %→1.66, 94 %→2.03, 99 %→3.32; on a 6.2-bit solo rate one bit is only 1.19× extra. Ten channels at R²=0.99 out of 640 save only ≈0.05 bit/element. | derived (Gaussian) |
| `homework-dictionary-shape` | Every lossless dictionary coder = predict, subtract exact integer residual, code. bpe = H(r) + tax + 8w/b; net vs solo = gain − tax − 8w/b. loc and full KLT pay no per-entry tax; VQ pays log₂C, sib log₂b bits per entry. | derived |
| `homework-loc` | **loc (the Anchor)**: w≈2, no tax; gain = ½log₂(σ²_total/σ²_within); block means explaining 75 % → 1 bit. Dictionary cost 16/b: 0.004 bit at b=4096, a full bit at b=16. A *fixed global* location saves nothing for an entropy coder (helps a fixed-length code). On the synthetic drift world (block means = 60 % of variance) loc netted **+0.64 bit**. On E4M3 subtracting a location can cost bits unless R² is high. | derived; Monte Carlo |
| `homework-klt` | **KLT (the Compass)**: full basis w=2d (1280 for d=640; 2.5 bits/element at b=4096 — unaffordable per block); rank-16 w=32 (0.06 bit + coefficients). Gain ½log₂(AM/GM) of standardized eigenvalues: 8 of 64 directions at variance 10 vs 1 → 0.34 bit; 50 vs 0.1 → 2.43 bits. Low-rank world (rank-8, d=64, b=4096): gain 0.51, net 0.26 with basis charged. Lossless only via lifting; wave 1 computes the bound only. | derived; Monte Carlo |
| `homework-vq` | **VQ (the Hive)**: w=C, tax log₂C/d (0.0125 bit for C=256, d=640); codebook 8C/b = 0.5 bit at b=4096. Bound: gain_VQ ≤ gain_KLT + log₂C/d, so net_VQ ≤ gain_KLT − 8C/b on Gaussian data. Monte Carlo (d=64, b=16,384): correlated Gaussian → VQ best +0.22 bit at C=64 vs KLT +0.50; clustered (32 clusters) → VQ +1.45 vs KLT +0.68; C=4096 nets ≈ −1.3 (memorizes noise). "Whether KV entries cluster is an open measurement; until then 'VQ, then code the error' is not a plan." | derived bound; Monte Carlo |
| `homework-sib` | **sib (the Twin)**: w=0, tax log₂b (12 bits = 0.019 bit/element at b=4096, d=640). A random sibling doubles residual variance: **+0.5 bit worse** than loc; nearest of 4095 siblings in 640 dims still +0.37 bit worse (Monte Carlo). A true twin helps only if σ²_own > σ²_noise. Twins world: sib +0.98 bit; clustered +1.19; pure noise −0.22. Needs the sibling resident and acyclic pointers (anchor entries). | derived; Monte Carlo |
| `homework-four-side-by-side` | On five synthetic worlds (d=64, b=4096, C=64) each type wins exactly one: loc +0.64 (drift), KLT +0.26 / 0.51 shared basis (low rank), VQ +1.36 (clusters), sib +0.98 (twins); on pure noise only loc stays ≥0. "Which worlds KV caches resemble, and in what mix, is exactly what wave 1 measures." | Monte Carlo (`analysis/homework_a_portrait.py`) |
| `homework-two-rates` | Two rates always reported: entropy rate (discretized Laplace per channel) and fixed-length rate (per-channel width n covering all but ε=0.5 %, escapes at 8 + log₂b bits). Gap for Laplace residuals at 5–7 bits: **about one bit per element** (15–22 %) with the best width, 1.5 bits with the coverage rule (5.44 vs 7.01 at β=8). Corrects the draft's 10–15 % (a BF16 artefact). | derived (exact sums); literature |
| `homework-the-grid` | On E4M3 index space a block-mean predictor is **net negative below R² ≈ 0.7** (−0.81 bit at R²=0.3, ≈0 at 0.7, +0.31 at 0.8, +0.87 at 0.9) and ≈0.8 bit behind INT8 above 0.7, at any channel scale; INT8 follows the textbook rate. Per-channel one-bit "predict or not" flag makes negative savings zero. Total storage: E4M3 cheaper below R² ≈ 0.55, INT8 above (by 0.2–0.3 bit for R² 0.7–0.93). Context modelling never loses but is not fixed-length. | Monte Carlo (n=400,000) |
| `homework-where-bits-come-from` | **The written-down prior**: most gain in a few key channels stored *before RoPE* (loc per request/block; KLT if sharply low-rank); values give small gains ("plan for none"); the number format decides how much survives. Sober sum: 16 outlier key channels saving 3 bits each add only 0.075 bit/element; if values stay at solo and keys save 1 bit, ρ ≈ 0.84 fixed-length (the draft's "ρ capped near 0.85"); ρ=0.5 would need 2.5–3.2 bits saved on every element (97–98 % variance explained). Expected: "a light dictionary, about one bit on the keys, a ρ around 0.75–0.85". MLA caveat: no K/V split in the reference model. | explicit prior ("meant to be replaced") |
| `homework-scope` | Three scopes (global/request/block = the Globe/Thread/Brick), nested; request scope = block scope with b=L. Costs: request w=256 → 12.8 MB once per request; block all-resident b=4096, w=256 → 6400 entries' worth per layer (> the 4096-slot hot cache). Scope gains g_req = bpe_global − bpe_request, g_blk = bpe_request − bpe_block, same type; sign is a theorem, size unknown. Illustrative budget → g_req ≈ 0.24, g_blk ≈ 0.37. "g_blk is the number this project bets on." | derived; illustrative |
| `homework-amortization-rule` | Dictionary cost = 8w/b bits per element: at b=4096 loc 0.004, rank-16 KLT 0.06, VQ-256 0.5, full KLT d=2048 → 8 bits. Rule sets the **floor** on b (at 0.25 bit: loc 64, rank-16 1K, VQ-256 8K, full basis d=640 40K, d=2048 128K); the data's drift sets the ceiling (the draft had this backwards). A 128K block in a 100K request is request scope. | derived |
| `homework-economics` | T_step = m k N_L e [f_D ρ + (1−f_D)] + n_load N_L w e; M_req = N_L e (B + w_res). HiSparse (ρ=1, n_load=0, w_res=0): 109 at B=4096 link-bound (memory 147), 73 at 8192 memory-bound. Request-scope w=256, assumed ρ=0.75 → 138 (1.26×), now memory-bound. Anatomy figure assumptions: ρ 0.75 request / 0.65 light block / 0.55 heavy block, f_D=0.85, n_load=0.05. | derived; assumed inputs |
| `homework-calculator` | Scenario table (requests per GPU): HiSparse 2K/4K/8K = 49/**109**/73; solo ρ=.88 → 124; request w=256 ρ=.75 → **138**; block w=32 ρ=.65 all-resident → 123; block w=256 ρ=.55 all-resident → 57; cache n_D=4 w=256 → 117. Lessons: memory binds as soon as misses get cheaper; lever 1 alone is capped at ≈147 (1.34×) with 4096 raw slots; solo coding sets the bar (124); heavy all-resident loses; assumed ρ=0.55 (4.4 bpe) is optimistic — needs ≈94 % of remaining variance. | derived from assumed ρ, w, f_D, n_load |
| `homework-break-even` | Loads must satisfy n_load w < f_D (1−ρ) m k ≈ **82 entries' worth** per layer per step (f_D=0.85, ρ=0.65), not the 274 of the rule of thumb: w=256 → ≤0.32 loads/step (4 residents must live ≥13 steps; ≈125 for a 10 % tax); w=32 → 2.6 loads/step; w=2 → never matters. Decoder must emit ≈50 GB/s per GPU at 110 requests, 10× headroom → ≈500 GB/s; fixed-length decoders (565 GB/s–2.2 TB/s) clear it, rANS borderline; lever 2 needs ≈370 GB/s. | derived; assumed f_D, ρ; literature throughputs |
| `homework-rehearsal` | Synthetic dress rehearsal (d=64, planted 40 % global rank-8 / 10 % request offset / 20 % block offset / 10 % block rank-2 / 20 % noise, true blocks 2048, INT8): loc global 7.01, request 6.91, best block 6.75 → **g_req ≈ 0.10, g_blk ≈ 0.16** (exchange rate predicts 0.08, 0.18); loc bottoms out at b=2048; sib ≈ loc (6.71 vs 6.75); VQ-256 needs 8K blocks (9.6 bits at 512) then equals loc; KLT bound 0.55–0.8 bit below loc. **Shuffle control**: loc collapses onto global (gains 0.006, −0.001); KLT bound keeps 0.06–0.16 bit of optimism at small b → read gains against the shuffled curve at the same b. | Monte Carlo (method check, "not a result about KV caches") |

### 1.3 Part VIII — the questions

| page id | claim / pre-registered outcome | confidence wording |
|---|---|---|
| `questions-two-kinds` | Q1 existence (fallen-apple in bits at 8 bits), Q2 coding (beat *solo* on the miss path), Q3 residency (misses pile into few long-lived blocks). Frameworks A, B answer Q1/Q2 in wave 1; C, D answer Q3/economics in wave 2. Each "no" has a stated action (Q1 no → context-free miss-path coding; Q2 no → the measurement is the paper; Q3 no → per-request or light all-resident dictionaries). | pre-registration |
| `questions-q1` | Q1 = (1/d)[H(E_t) − H(E_t \| E_{t−Δ})] for Δ = 1, 2, 4, …; per layer, keys vs values, at 8 bits, against solo. Outcomes: *yes local* (fades, above shuffled up to Δ ≈ 1K) → block dictionaries, b from the fading length; *flat positive* → request scope; *keys only* → values cap the gain; *flat zero* → negative + solo coder. Decision thresholds (see 1.4): total ≥ 0.75 with g_blk ≥ 0.4 = yes; < 0.25 = no. "A flat answer would still be a result." | pre-registration; judgement call |
| `questions-q2` | Bar = solo, not raw: solo ρ ≈ 0.78 ideal / ≈ 0.88 fixed-length (≈6.24 / ≈7 bits). Four hurdles: solo bar, 8w/b, random access with fixed-length deltas (assumed +13 % over ideal in the figure), the E4M3 grid (needs R² ≳ 0.7). 0.6 bit saved over solo ⇒ ρ ≈ 0.7; miss shrinks 1.42× vs raw but only 1.11× vs solo. Outcomes: cheap & below solo → build; heavy only → Q3; ideal-column only → measurement; hugging solo → negative. Thin spot: "the yes row assumes light dictionaries capture most of the gain" (rate–distortion napkin). | pre-registration; assumed |
| `questions-q3` | Where misses land can change the saving ≈5× at equal ρ (even spread: f_D = 4/25 = 16 %, ≈6 % saving; piled: f_D = 0.85 assumed, ≈30 %). Loads must be rare: n_load w ≪ 274 (w=256 → < ≈0.1 loads/step/layer; w=32 → ≈1/step). Outcomes: **yes** f_D ≥ 0.8 with n_D ≤ 8 and n_load ≤ 0.1; **partly** 0.5 ≤ f_D < 0.8; **no** f_D < 0.5. Q3 is moot with light dictionaries (all 25 block dictionaries ≈ 50 entries/layer, < 2 % of the hot cache → f_D = 1). Q1 and Q3 are independent; 2×2 table of systems. | pre-registration; assumed |
| `questions-framework-a` | Vary Δ = 1 … 32K (and the layer axis); fixed: data, 8-bit format, per-channel affine then low-rank predictor, accounting = solo rate − conditional rate; the measured curve is a *lower bound* on I(E_t; E_{t−Δ})/d. Three shapes: fading (fallen-apple; half-distance = natural b, toy ≈ 355 tokens), flat positive (request/global structure), flat zero (negative). Toy (10 % request, 75 % local decaying over 512 tokens, 15 % noise): 0.94 / 0.85 / 0.29 / 0.01 bit at Δ = 1 / 16 / 256 / 2048; shuffled 0.00. | pre-registration; illustrative toy |
| `questions-framework-b` | The **compressibility curve** (x = w/b entries' worth, y = ρ) per algorithm and b; landmarks HiSparse (0, 1), solo (0, ≈0.78 ideal / ≈0.88 fixed-length); a dictionary pays only below ρ_solo − w/b. The **roofline** = lower envelope. Shapes: well below solo at small cost (light types win; residency easy) / below solo only at large cost (clustered; hinges on Q3) / hugging solo (block idea dead). Figure point clouds "invented". | pre-registration; illustrative |
| `questions-framework-c` | Replay recorded selections (one per layer) through LRU B slots + n_D dictionaries, two policies (heaviest blocks; LRU of blocks hit by a miss); vary b, n_D, policy; measure block concentration (share held by top 1/2/4/8 blocks), block reuse distance, f_D(n_D, b), n_load, token miss rates as sanity vs HiSparse 30 / 13.4 / 6.7 %. Toy replay defaults: f_D ≈ 86 %, 0.05 loads/step; concentration 0 → miss rate ≈15 % unchanged, f_D halves, loads ×9. | pre-registration; illustrative toy |
| `questions-framework-d` | Cost model with measured ρ (B), f_D & n_load (C). Compare each system at its own best B: HiSparse peaks ≈127 at B ≈ 4.7K; request-scope w=256 ρ=0.75 → ≈141 = **1.11×** (not 1.33× = 1/ρ, nor 1.26× at fixed B=4096). Lever 1 alone scales as (1/ρ)^0.48 (square-root rule); levers 1+2 as 1/ρ. At ρ=0.5: lever 1 1.34×, victim tier 1.52×, both levers 1.89×. At 450 GB/s link lever 1 alone *loses* (0.89×). Yardstick: < 1.1× not worth a system; 1.1–1.3× only if nearly free; 1.3–2× strong. Levers 1+2 ≈ 1.28× at ρ=0.75, 1.47× at 0.65. | derived; assumed ρ, f_D; judgement-call thresholds |
| `questions-parked-dictionaries` | Parked: indexer keys as a free resident dictionary (odds medium, costly; 128 vs 576 numbers); shared prefixes amortizing heavy dictionaries across requests (plausible, needs a trace); anchor entries (long shot, pays the sibling tax ≈ 0.5 bit); rate allocation across channels (likely a small win; does it transfer?). | odds stated as judgement |
| `questions-parked-measurements` | Parked: upstairs for layer-group dictionaries (long shot, ≈4× less residency); head-axis similarity (low, no head axis in MLA); prompt vs generated tokens (some difference likely); are missed entries also harder to code (coin toss; would shrink lever 1). | odds stated as judgement |
| `questions-parked-automation` | Automated proposer–harness–reviewer search (long shot as discovery, sure win as test bench); per-layer distance curves as a map of slow state vs detail (free, reading it is the risk). Table of five cheats and the control that catches each. | judgement |

### 1.4 Part IX — the plan

| page id | claim / fixed choice | confidence wording |
|---|---|---|
| `plan-harness-interface` | Harness = `DeltaCoder.fit/encode/decode`; each delta decodable alone given D; the harness (not the coder) picks the fitting set (= scope). `analysis/plan_harness.py` exists and passes its controls on synthetic data. | fact about the repo |
| `plan-accounting` | bpe = residual + tax + 8\|D\|/(b d); escapes marked by the unused field value −2^(n−1) and cost 8 bits (no position); widths fit on the fitting set; coder settings charged at **3 bytes per channel** (so loc w=4 not 2; KLT-16 w=35; VQ w=259; sib w=3 for d=1024); global scope pays nothing; request scope = block scope with b=L. Laplace β=3 test: entropy 4.015, model 4.035, histogram 4.034. | method; tested |
| `plan-controls` | Four controls: synthetic truth, shuffle, scope consistency, round trip. Synthetic run (4 eval + 8 calib × 8192 entries × 64 ch, true block 2048, INT8, entropy rate): g_req 0.459, g_blk 0.342 (float-domain 0.407, 0.368); shuffled g_blk −0.004 but **shuffled g_req 0.131 = calibration gap** (0.217 / 0.115 / 0.069 bit for 2 / 8 / 32 calibration sequences). Round trip: 2048-entry block packed → 56.05 B per 64-B entry, fixed-length 7.006 bits exactly. | Monte Carlo method check |
| `plan-data` | **Proxy model**: Qwen3.5-2B, its 6 full-attention layers (of 24; 2 KV heads × 256 → entry = 2×2×256 = **1024 elements ≈ 1 KB**), replicated on Qwen3-1.7B (28 layers, 8 KV heads × 128). Keys stored **before RoPE**, values as is; entry rate = byte-weighted mean of K and V. Formats: E4M3 (one power-of-two scale per layer per K-or-V, RNE, −0→+0, index space) and INT8 (one scale per channel); BF16 reported alongside. ≥ 8 evaluation sequences × 32K (2 books, 2 code repos, 2 transcripts, 2 LongBench-V2); **2 calibration sequences** (site says: dump 8–32). Queries of the last 4K tokens dumped for wave 2. Volume ≈ 2 GB; GPU need ≈ 5.4 GB. "Whether the proxy's statistics transfer is itself a risk (R6)". | fixed choice; ⚠ flagged |
| `plan-fp8-target` | Lossless target = the 8-bit codes, not BF16. E4M3 codes of a zero-centred channel form **two humps**; an index-space Laplace charges E4M3 solo coding 8.375 bits (> raw) vs histogram 6.128 → **grid-aware model** (6.367 bits). Fixed-length scope gains on the synthetic set: INT8 0.570 + 0.371 = **0.94 bit**; E4M3 with flag 0.058 + 0.161 = **0.22 bit**; entropy rate ≈ 0.80 bit in both grids. `e4m3_round` −0 bug fixed, tested on 200,514 probe values. | Monte Carlo; method |
| `plan-experiment-1a` | Three float-domain, grid-free numbers per layer, K and V, each with shuffled twin and per-channel breakdown: (1) distance curve bits(Δ) = ½log₂ 1/(1−R²(Δ)) for Δ ∈ {1 … 4096} and one layer down; (2) location gain (request vs global; block b = 256 … 8K vs request); (3) KLT gain ½log₂(AM/GM) of standardized eigenvalues (global/request/block). **Reading**: location + KLT gain at block scope **< 0.3 bit on both K and V** → "Q1 in serious trouble"; **> 1 bit on keys** → "the project has a pulse"; in between → the grid decides. Synthetic: request 0.407, block 0.368–0.370 for b ≤ 2048, 0.114 at 4096. Caveats: Gaussian exchange rate; KLT is a bound; one-neighbour predictor is a narrow probe. | pre-registration; judgement call |
| `plan-experiment-1b` | Rungs: loc; KLT bound (spectrum only); KLT rank 16 with explicit coefficients (16 × assumed 8 bits per entry); VQ 256 centroids on 64-element pieces (PQ, 16 sub-codebooks, one byte per 64 elements); sib (nearest sibling leave-one-out). Scopes: global, request, block b ∈ {512, 2K, 8K}; E4M3 and INT8; both rates; K and V; 6 layers; plus shuffled. Taxes alone: VQ dictionary share 4.05 / 1.01 / 0.25 / 0.06 bits at b = 512 / 2K / 8K / request → VQ at 512 not worth running; KLT-16 and VQ pay 0.125 bit tax at every scope. Synthetic Table-1 rows (loc+flag): INT8 entropy 7.073 / 6.614 / 6.272 (g 0.459, 0.342); INT8 fixed 7.953 / 7.383 / 7.012 (0.570, 0.371); E4M3 entropy 6.367 / 5.906 / 5.566 (0.461, 0.340); E4M3 fixed 7.907 / 7.848 / 7.687 (0.058, 0.161). **Flaw**: solo fixed-length = exactly 8.0 bits (straw man; needs an exponent-splitting rung 0). Runtime guess: loc ladder "a few hours of single-core numpy", VQ overnight. | method; Monte Carlo; estimate |
| `plan-wave1-outputs` | Deliverables: Figure A (bits vs Δ with shuffled twin), Table 1 (entropy / fixed-length per type at global / request / best block; K and V apart; E4M3 and INT8 apart; per layer), Figure B (curve + roofline), diagnostics (per-channel; k-means residual vs Gaussian bound; BF16 column; float vs 8-bit gains), derived ρ and \|δ\| of the fixed-length coder at best affordable (b, w). Synthetic ρ = 7.012/8 ≈ 0.88 (56 B of 64). Schedule: Day 0 dump, Day 1 build + 1a, Day 2 ladder (VQ overnight), Day 3 decide. | pre-registration |
| `plan-decision-rule` | **The decision rule** (inputs: g_req, g_blk of the best *cheap* type, K and V byte-weighted, better of the two 8-bit grids; site's amendments: read on the **fixed-length rate**, after subtracting each gain's **shuffled** value): (1) g_req + g_blk ≥ **0.75** bit and g_blk ≥ **0.4** → wave 2 at block scope; (2) total ≥ 0.75 and g_blk < **0.15** → request scope ("requestdiff"); (3) **0.25–0.75** → marginal, run framework C, decide on the cost model; (4) **< 0.25** everywhere → publish the negative, pivot to a global fixed-length miss-path coder. **Gap** (total ≥ 0.75, 0.15 ≤ g_blk < 0.4) → "both scopes, framework C decides". Rationale: 0.75 bit over ≈6.8-bit solo → ρ ≈ 0.76 → ≈1.26× at request scope; < 0.25 bit is no bigger than taxes + calibration gap. The synthetic set lands in the gap (INT8 entropy 0.80) or "negative" (E4M3 fixed 0.22). | judgement call, pre-registered |
| `plan-wave2-indexer` | Proxy indexer = exact attention: per decode step (last 4K tokens) and layer, top-k = 2048 by attention probability summed over heads; sliding window and sink tokens ignored. Replay: token LRU + dictionary LRU; δ-miss only if the dictionary was already resident; two residency policies. Synthetic trace: miss rate 8.8 / 2.9 / 2.2 % at B = k / 2k / 4k; f_D 10 % / 41 % / 88 % at n_D = 1 / 4 / 16 (0.13 loads/step at 4). | method; synthetic |
| `plan-wave2-measure` | Seven measurements: (1) token miss rates at B = 2K/4K/8K vs HiSparse 30/13/7 %; (2) block concentration for b ∈ {2K, 8K}, share in top 1/2/4/8 blocks; (3) block reuse distance; (4) f_D(n_D, b), n_load for n_D ∈ {2,4,8,16}, both policies; (5) full reuse-distance distribution (victim tier); (6) sibling residency (if sib did well); (7) are missed entries harder to code. Readings: f_D ≥ 0.8 at n_D ≤ 8, n_load ≤ 0.1 → heavy block dictionaries affordable; 0.5–0.8 → cost model decides; < 0.5 → light all-resident or request scope. | pre-registration |
| `plan-cost-model-and-paper` | Defaults (B=4K, ρ=0.75, w_res=256, 50 GB/s): HiSparse 109 (link-bound; HBM alone 146); kv-blockdiff request scope 138 (HBM-bound), **≈1.26×**. Three papers: positive on Q1–Q3 ("Lossless, scope-aware dictionary coding of 8-bit KV caches"), Q1 yes/Q3 no ("requestdiff"), Q1 negative ("How much conditional structure is left in 8-bit KV caches? (Not much.)"). | derived; assumed |
| `plan-fixed-choices` | Fixed choices and solidity: 8-bit target (strong on direction, ⚠ format); proxy model (plausible, ⚠ unproven across families; "MLA latents are already a learned low-rank projection, so the KLT rung may find less there"); exact top-k (reasonable); keys before RoPE (well supported); per-layer dictionaries (solid); b ∈ {512, 2K, 8K} + request (safe, the sweep is the measurement); residual coders (⚠ grid-aware needed); 2 calibration sequences (⚠ too few). Three changes first: 8–32 calibration sequences, grid-aware model, exponent-splitting solo baseline — "all three bias towards go". | fixed choices with flags |
| `plan-ignored` | Ignored on purpose: MLA/CSA/HCA/NSA (same shape, maybe other statistics — "riskiest"), block-scaled formats (a 2-byte dictionary), speculative decoding/MTP, sink tokens & sliding window, better eviction (Bélády beats LRU by ≈5 points), parallelism, hardware beyond three numbers, kernels. Later: CUDA kernel, victim tier, lever 2, dictionary refresh for generated tokens, MLA transfer, cross-layer dictionaries. | scoping |
| `plan-risks` | Twelve risks: R1 no structure (pivot: negative paper + solo coder); R2 gains only on keys (ρ capped ≈ 0.85); R3 only request scope ("requestdiff"); R4 only heavy VQ captures the gain (residency decides; PQ sub-codebooks ≤ 32 KB); R5 E4M3 index space hides structure floats show (INT8 as equal format; flag); R6 proxy unrepresentative (replicate on Qwen3-1.7B, later MLA); R7 misses do not concentrate (light w ≤ 32 all-resident or request scope); R8 decoder not at gather speed (phase 2); R9 prior art; R10 two calibration sequences too few (added); R11 entropy model wrong shape on E4M3 (added); R12 straw-man fixed-length baseline (added). Thinnest: the prior on fallen-apple, the assumed economics, how much a fast 8-bit format cashes in. | risk register |

### 1.5 Part X and the reference setting (Parts III, V)

| page id | numbers | confidence |
|---|---|---|
| `landscape-reference-setting` ("the Pin") | N_L = 78 sparse layers (GLM-5.1); k = 2048 (DSA top-k); L = 100K (100,384 tokens, LongBench-V2); d ≈ 640; **e = 640 B** (8-bit; 1.28 KB in BF16); m = 30 % / 13.4 % / 6.7 % at B = 2048 / 4096 / 8192 (Bélády 8.2 % at 4096); TPOT = 30 ms; W_link = 50 GB/s (PCIe Gen5 ×16, 64 on paper); M_HBM = 30 GB. Assumptions ranked: one trace; 8-bit storage leaves miss rates unchanged; entry layout; one machine; second-hand numbers. | literature (HiSparse), frozen |
| `landscape-derived-numbers` | ≈274 misses per layer per step; 13.7 MB per request per step (0.46 GB/s); link feeds ≈110, memory holds ≈147 (73 at 8192); best HiSparse ≈125 at ≈4,800 slots; 0.38 ms per layer; decoder should be ≥10× the link (≈500 GB/s). m(B) ∝ B^−1.08. | derived |
| `landscape-hisparse` | Hot cache: LRU with a "never evict a currently selected entry" guard; per request per layer; HiSparse found coordinating layers adds little; up to 4.7× throughput claimed. | literature |
| `papers-splitzip` | 1.324× on BF16 KV (ceiling 1.333×); E5M2 1.14× (ceiling 8/7); E4M3 top-8 code 0.93× (expands); exponent entropy 3.29 bits (Qwen3-32B); decode 2.2 TB/s BF16 / 565 GB/s E5M2 (H200); E5M2 at 88 % of a 6.19-bit order-0 bound. "Context-free coding of a KV number is worth about 1.1–1.3×." | literature, partly re-checked |
| `papers-what-would-be-new` | Empty square: conditional structure of 8-bit KV, in bits, with controls, on the scattered-read path. Three claims: the measurement (publishable either way), the data path (new as a combination), the economics. Unread 2026 titles to check: DeltaKV (2602.08005), "KV Cache Compression Through the Lens of Transform Coding" (2608.14191), JoLT (2607.12550), PackKV, Codec-Gauge. | novelty, provisional |
| `reference-summary` | Solo 1.1–1.3×; exchange rate 75 % → 1 bit, 93.75 % → 2 bits; light dictionaries first (VQ ≤ +0.22 vs rotation +0.50); E4M3 naive residual worse than nothing below R² ≈ 0.7; 8w/b floor (VQ-256 needs b ≥ 8K); economics: HiSparse 109 at 4096 / 125–127 at best B; solo 124; light block all-resident 123; lever 1 capped ≈147 (1.34×) at fixed B, ≈1.11× at best B (√(1/ρ)); victim tier behind a 2,048-slot raw cache ≈142, ≈169 with cheaper misses (ρ=0.65 assumed). Go/no-go: g_req + g_blk ≥ 0.75 → go; < 0.25 → negative. "So the project only pays if 8-bit KV is compressible well below solo's ρ ≈ 0.88, and the GPU-memory lever is built." | summary of the above |
| `reference-numbers` | Table of outside numbers with "not re-checked" flags, and the site's own checks (6.47 / 7.05 bits; E4M3 net negative below R² ≈ 0.7; VQ +0.22 vs KLT +0.50; m ∝ B^−1.08; context modelling beats INT8-with-subtraction by ≈0.5 bit; two rates ≈1 bit apart; rehearsal g_req ≈ 0.10, g_blk ≈ 0.16; leak toy hit rate 86 % with R² = 0.000). | grounded numbers |
| `reference-fp8-facts` | E4M3fn: 127 non-negative values (0, 7 subnormals, 15 binades × 8 − NaN), 253 with sign; max 448; spacing 2^−3 of the binade; index = byte read as sign-magnitude; one power-of-two scale per (layer, K or V) so the 99.99th percentile of \|x\| lands near 256; RNE; cross-check against `torch.float8_e4m3fn`. INT8 alternative: one scale per channel (or per channel per block). | definitional |

### 1.6 The ten numbers Part XI should confront first

1. **g_blk ≥ 0.4 bit and g_req + g_blk ≥ 0.75 bit** (fixed-length rate, shuffled value subtracted) is the pre-registered "go" for block scope; **< 0.25 bit** is "no" (`plan-decision-rule`, `questions-q1`, `reference-summary`).
2. **Solo coding ≈ 6.2–6.5 bits ideal (ρ ≈ 0.78), ≈ 7.0–7.24 bits fixed-length (ρ ≈ 0.88)**; 1.1–1.3× is "already published" and every gain counts from there (`homework-solo-coding`, `homework-the-budget`).
3. **The prior**: most gain in a few pre-RoPE key channels, little in values, ρ ≈ 0.75–0.85 all-in; ρ = 0.5 would need 2.5–3.2 bits saved on every element (`homework-where-bits-come-from`).
4. **Exchange rate**: 75 % of remaining variance → 1 bit, 94 % → 2 bits; the illustrative 30/20/20/30 budget gives g_req ≈ 0.24, g_blk ≈ 0.37, whole ladder 0.87 bit (`idea-the-trap`, `homework-exchange-rate`, `homework-scope`).
5. **Light dictionaries first**: loc (w ≈ 2–4, no tax) expected to capture most of the gain; VQ bounded by KLT + log₂C/d on Gaussian data (Monte Carlo +0.22 vs +0.50); sib ≈ loc + 0.37–0.5 bit *worse* unless true twins exist (`homework-vq`, `homework-sib`, `homework-four-side-by-side`).
6. **Fallen-apple curve shape**: high at Δ = 1, fading, with a half-distance that sets b; shuffled curve at zero; the 1a reading "< 0.3 bit (loc + KLT, block scope) on both K and V = trouble; > 1 bit on keys = a pulse" (`idea-fallen-apple`, `questions-framework-a`, `plan-experiment-1a`).
7. **The grid**: E4M3 block-mean prediction is net negative below R² ≈ 0.7 and ≈ 0.8 bit behind INT8 above; synthetic fixed-length gains 0.94 bit (INT8) vs 0.22 bit (E4M3); INT8 cheaper in total above R² ≈ 0.55 (`homework-the-grid`, `plan-fp8-target`).
8. **Two rates ≈ 1 bit apart** (15–22 % at 8-bit rates), not the draft's 10–15 % (`homework-two-rates`).
9. **Amortization floor 8w/b**: VQ-256 needs b ≥ 8K at 0.25 bit; a full KLT basis (w = 2d) only at request/global scope; the data's drift sets the ceiling, expected to show as a minimum of the loc rate against b (`homework-amortization-rule`, `homework-rehearsal`).
10. **Economics**: HiSparse 109 requests per GPU at B = 4096 (link-bound) / ≈125–127 at best B; lever 1 alone ≈ 1.11× at ρ = 0.75 (√(1/ρ)), capped ≈ 147 at fixed B; < 1.1× "not worth a system"; the prize is lever 2 / the victim tier (`homework-calculator`, `questions-framework-d`, `reference-summary`). Q3 thresholds: f_D ≥ 0.8 at n_D ≤ 8 with n_load ≤ 0.1 (`questions-q3`).

Also worth confronting: the **calibration gap** (shuffled g_req ≈ 0.13 bit with 2 calibration sequences on synthetic data; site recommends 8–32 sequences and reporting every gain next to its shuffled twin, `plan-controls`), and the **straw-man fixed-length solo baseline** (exactly 8.0 bits in the harness; `plan-experiment-1b`).

---

## 2. Glossary terms relevant to Part XI

Format: `id` — label (home page id): short text (abridged where long). Use `[[id]]` to mention, `[[id|other words]]` for custom text (`\|` inside table cells). Never `[[=id]]` for any of these — all are already defined on their home pages. Brand (signature) terms are marked ★.

### 2.1 The system and the idea
- `kv-blockdiff` ★ — kv-blockdiff (`idea-mapping`): store a long KV history as per-block dictionaries plus tiny per-entry deltas, so a cache miss moves a delta instead of a raw entry and the GPU rebuilds the entry bit for bit.
- `entry` ★ — entry (`landscape-kv-cache`): all key and value numbers of one token at one layer, E_{l,t}, of size e bytes; the unit the indexer selects, the cache moves and our coder must rebuild.
- `block` ★ — block (`idea-dictionary-delta-block`): b consecutive tokens' entries of one request at one layer; a design knob, not a property of the data.
- `dictionary` ★ — dictionary (`tiny-files-trained-dictionary`): information shared by many items and sent to the receiver once, so each item can be sent as a short delta.
- `delta` ★ — delta (`tiny-files-trained-dictionary`): the bytes needed to rebuild one item exactly given its dictionary; for a KV entry \|δ\| = ρ e.
- `weight` — dictionary weight (`idea-dictionary-delta-block`): a dictionary's size in entries' worth, w; \|D\| = w e; amortized over a block it costs 8w/b bits per element.
- `delta-ratio` — delta ratio (`idea-dictionary-delta-block`): ρ = \|δ\|/e; for 8-bit storage ρ ≈ bpe/8.
- `bpe` — bpe (`homework-the-budget`): bits per 8-bit element of a lossless code, everything included (residuals, per-entry tax, amortized dictionary); raw is 8.
- `entry-tax` — per-entry tax (`homework-dictionary-shape`): bits a dictionary coder must store with every entry on top of its residual (which centroid, which sibling, a flag); spread over d elements it is `\vtax`.
- `hot-cache` ★ — hot cache (`landscape-hisparse`): HiSparse's small buffer of B raw entries per request per layer in GPU memory, LRU-managed.
- `dictionary-cache` ★ — dictionary cache (`idea-blockdiff-step-by-step`): kv-blockdiff's per-layer set of n_D block dictionaries kept in GPU memory.
- `delta-miss` ★ — δ-miss (`idea-blockdiff-step-by-step`): a hot-cache miss whose block dictionary is resident, so only the delta crosses the link.
- `raw-miss` ★ — raw miss (`idea-blockdiff-step-by-step`): a miss whose block dictionary is not resident, so the full raw entry crosses, as in HiSparse today.
- `delta-miss-fraction` — δ-miss fraction (`idea-blockdiff-step-by-step`): f_D, share of misses that are δ-misses.
- `heavy-block` ★ — heavy block (`idea-heavy-blocks`): a block that holds many of the current step's selections.
- `victim-tier` ★ — victim tier (`missed-victim-tier`): a second GPU tier holding deltas of entries just evicted from the hot cache.
- `lever` — lever (`idea-two-levers`): lever 1 makes misses cheaper (ρe instead of e); lever 2 makes hot-cache slots cheaper.
- `hisparse` ★ — HiSparse (`landscape-hisparse`): the production system we build on; full history in host memory, LRU hot cache of raw entries on the GPU.
- `indexer` ★ — indexer (`landscape-sparse-attention`): a cheap scorer that at every layer and step picks the k positions attention will read.
- `lucky-louis` ★ — Lucky Louis property (`landscape-lucky-louis`): the indexer re-selects mostly the same positions step to step; about WHICH entries, not their bytes.
- `reference-setting` ★ — reference setting (`landscape-reference-setting`): HiSparse's GLM-5.1 deployment at 8-bit storage — 78 layers, top-2048, 100K context, 0.64 KB entries, 30 ms/token, 50 GB/s link, 30 GB GPU memory for KV.
- `sparse-attention` — sparse attention (`landscape-sparse-attention`); `dsa` — DSA (`landscape-sparse-attention`); `mla` — MLA (`landscape-kv-cache`); `kv-cache` — KV cache (`landscape-kv-cache`); `rope` — RoPE (`landscape-kv-cache`): keys are more regular before this rotation than after it; `layer` (`landscape-tokens-and-decoding`); `token` (`landscape-tokens-and-decoding`); `head` — head (`landscape-attention`): "with grouped-query attention (GQA) several query heads share one key/value head"; `attention` (`landscape-attention`); `prefill-decode` (`landscape-tokens-and-decoding`); `tpot` (`landscape-tokens-and-decoding`).

### 2.2 The properties (hypotheses)
- `neighbour` ★ — neighbour similarity (`idea-neighbour-similarity`): the family of hypotheses that an entry costs fewer bits to store exactly when a neighbouring entry along some axis of the KV tensor is known.
- `fallen-apple` ★ — fallen-apple similarity (`idea-fallen-apple`): an entry is cheaper to store exactly given an entry of the same layer a small token distance Δ away, and the closer the cheaper; a curve over Δ, not a threshold.
- `upstairs` ★ — upstairs similarity (`idea-upstairs`): the entry of the same token one layer up is partly predictable from the entry below it.
- `cat-ladder` ★ — cat-thread ladder (`idea-cat-thread-ladder`): the intuitive argument; right in direction, leaky in evidence, harsh in exchange rate.

### 2.3 The dictionary cast and scopes
- `solo` ★ — solo (`homework-solo-coding`): coding each entry by itself with one fixed, global, context-free code; ≈1.1–1.3× on 8-bit KV; the baseline every dictionary must beat. Nickname "the Hermit".
- `loc` ★ — loc (`homework-loc`): per channel a typical value (location) and spread (scale); predict by the location, store the exact difference; w ≈ 2, no per-entry tax. "The Anchor".
- `klt` ★ — KLT (`school-rotation`): the rotation that lines axes up with the directions of greatest spread (= PCA). "The Compass".
- `vq` ★ — VQ (`school-clusters`): describe each vector by the index of the nearest of C centroids; losslessly the centroid is a prediction and the exact residual is stored; the index costs log₂C bits. "The Hive".
- `sib` ★ — sib (`homework-sib`): use another entry of the same block (the nearest sibling) as the prediction plus a pointer; the residual's noise doubles. "The Twin".
- `codebook` — codebook (`school-clusters`): the list of C centroids used by VQ; on this site "codebook" means only this. `centroid` (`school-clusters`); `k-means` (`school-clusters`); `index-tax` (`school-clusters`); `product-quantization` (`school-vq-vs-klt`); `rate-distortion` (`school-vq-vs-klt`).
- `scope` — dictionary scope (`homework-scope`): what a dictionary is fit on and shared by — global, request or block.
- `scope-global` ★ — global scope (`homework-scope`, "the Globe"); `scope-request` ★ — request scope (`homework-scope`, "the Thread"); `scope-block` ★ — block scope (`homework-scope`, "the Brick").
- `scope-gain` — scope gain (`homework-scope`): bits per element saved by narrowing the scope one rung, g_req and g_blk, for the same type.
- `amortization` — amortization (`school-amortization`): a dictionary of w entries' worth shared by b entries costs 8w/b bits per element.
- `curve` ★ — compressibility curve (`questions-framework-b`): for one algorithm at one b, the points (dictionary cost per entry, delta size per entry) as settings vary.
- `roofline` — roofline (`questions-framework-b`): the lower envelope of all compressibility curves.

### 2.4 Coding, information and numbers
- `lossless` (`tiny-files-notice-anything`); `lossy` (`tiny-files-notice-anything`); `bit` (`school-bits`); `entropy` (`school-entropy`); `order-0-entropy` (`school-entropy`); `surprisal` (`school-surprise`); `side-information` (`school-side-information`); `conditional-entropy` (`school-side-information`); `mutual-information` (`school-mutual-information`): "also called redundancy or, loosely, similarity — all three are the same number of bits"; `redundancy`; `cross-entropy` (`school-arithmetic`); `entropy-coder` (`school-arithmetic`); `arithmetic-coding`; `rans` — rANS (`school-arithmetic`); `fixed-length-code` (`school-fixed-length`); `escape` (`school-fixed-length`); `random-access` (`school-fixed-length`).
- `prediction` — prediction (`school-prediction`): a guess x̂ made only from things the receiver also knows; "the rule that makes the guess is the predictor". `residual` (`school-prediction`): r = x − x̂, exact integer. `predictive-coding` (`school-prediction`). `context-modeling` (`missed-context-modeling`).
- `entropy-rate` — entropy rate (`homework-two-rates`): the rate an ideal entropy coder would reach on the residuals, plus tax and amortized dictionary. `fixed-length-rate` — fixed-length rate (`homework-two-rates`): the rate of a fixed-length code with escapes, plus tax and dictionary; "directly the delta size of the store".
- `r-squared` — R² (`school-exchange-rate`); `variance`, `standard-deviation`, `mean`, `gaussian`, `laplace` (`school-residual-shapes`); `monte-carlo` (`school-residual-shapes`); `histogram` (`school-entropy`); `covariance`, `covariance-matrix` (`school-correlation`); `standardize` (`school-vectors`); `channel` — channel (`school-vectors`): one fixed position c inside a vector, looked at across many vectors; `vector` (`school-vectors`); `rotation`, `eigenvalue`, `pca` (`school-rotation`); `low-rank`, `am-gm`, `transform-coding-gain`, `lifting` (`school-coding-gain`); `plus-factorization` (`papers-classics`); `sparse-coding` (`papers-lexico`); `slepian-wolf` (`papers-classics`).
- `fp8` — FP8 (`school-fp8`): "E4M3 has 4 exponent and 3 mantissa bits (values up to 448), E5M2 has 5 and 2". `quantization` (`school-fp8`); `index-space` (`school-fp8`); `integer-grid` — label "INT8" (`school-integers-floats`); `floating-point`, `exponent`, `bf16` (`school-integers-floats`); `scale-group` (`papers-kivi`).
- `cache`, `hit-miss`, `eviction`, `lru` (`school-caches`); `reuse-distance`, `miss-rate-curve`, `belady` (`school-reuse-distance`); `bandwidth`, `hbm`, `dram`, `pcie` (`school-wires`).

### 2.5 The plan's vocabulary
- `harness` — harness (`plan-harness-interface`): the small program that runs every dictionary algorithm through the same interface, charges every byte by the same rule, runs the controls and plots the results.
- `shuffle-control` — shuffle control (`homework-rehearsal`): rerun after shuffling tokens across sequences; any neighbour-dependent gain must vanish.
- `calibration-set` — calibration set (`plan-data`); `proxy-model` — proxy model (`plan-data`): "Qwen3.5-2B's full-attention layers, replicated on Qwen3-1.7B"; `grid-aware-model` (`plan-fp8-target`); `decision-rule` (`plan-decision-rule`); `trace-replay` (`plan-wave2-indexer`); `big-question` (`questions-two-kinds`); `framework-question` (`questions-two-kinds`).
- `data-path` (`papers-reading-guide`); `disaggregation` (`papers-splitzip`); `trained-dictionary`, `zstd`, `lz-match` (Part I).

### 2.6 Concepts with NO glossary term yet (define in Part XI with `[[=id]]`, adding to `data/terms/<xi-slug>.yaml`, or explain in a plain sentence)
- **reference / anchor entry** — "anchor entries" appear in prose on `homework-sib` and `questions-parked-dictionaries` but are not a term. **Collision warning:** "the Anchor" is already loc's nickname (emblem `anchor`); a new term for a reference entry must use another word (e.g. `exemplar`, `reference-entry`, `base-entry`).
- **exemplar** — not defined.
- **spanning tree / MST / tree of predictions** — not defined; "lifting", "PLUS factorization" exist but nothing about trees or graphs over entries.
- **linear prediction / affine predictor / low-rank predictor** — `prediction`, `predictive-coding`, `klt`, `low-rank` exist; "per-channel affine predictor" is used in prose (`questions-framework-a`, `plan-experiment-1a`) without a term.
- **read budget / byte budget on the link** — not a term (`\vTstep` is the symbol for bytes moved per step; `every-tax` is a theme).
- **MDL ratio / description length** — not defined; `bpe` and `entropy-rate` are the closest.
- **paired difference / paired comparison / confidence interval / bootstrap** — no statistics-of-measurement terms exist at all (no term for standard error, CI, significance, seed).
- **KV head / GQA / grouped-query attention** — only `head` exists (its short mentions GQA). No `gqa` or `kv-head` term.
- **hidden state / residual stream** — not defined (mentioned in prose on `idea-fallen-apple`, `idea-upstairs`).
- **E4M3 / E5M2 as separate terms** — only `fp8` (and `index-space`, `integer-grid`). Write `[[fp8|E4M3]]`.
- **calibration gap** — described on `plan-controls` as "a calibration gap", not a term.
- **distance curve / Figure A / Table 1 / Figure B** — not terms (frameworks A and B are pages).
- **location gain / KLT gain (1a's float-domain numbers)** — not terms; symbols `\vgain`, `\vgainreq`, `\vgainblk` exist.
- **predict-or-not flag** — not a term (prose on `homework-the-grid`, `plan-fp8-target`).
- **residency policy / heaviest-blocks policy** — not terms.
- **exact top-k / proxy indexer** — not terms (`trace-replay`, `indexer`, `dsa` exist).
- **outlier channel / big steady channel** — not a term (prose everywhere; KIVI page).
- **requestdiff** — used in quotes on `plan-decision-rule`, `plan-risks`; not a term.
- **two-humps (E4M3 code histogram)** — not a term.
- **block reuse distance** — `reuse-distance` exists for entries; the block form is prose.
- **Gated DeltaNet / linear-attention layers / hybrid model** — not defined (prose on `plan-data`).
- **roofline** exists; **frontier** (framework D's plot) is not a term.
- **pre-registration** — prose on `questions-two-kinds`, not a term.
- **campaign / autonomous agent / research loop** — nothing; `questions-parked-automation` discusses a "proposer–program–reviewer loop" without a term.

Rule from AUTHORING §3: grep `^<id>:` in `data/terms/` before adding; a new brand term (emblem + colour) needs permission ("Ask before adding one").

---

## 3. Symbol macros (notation) and the taken letters

Macro = `\v` + id; one meaning site-wide (`data/symbols/*.yaml`). Families: index, resource, count, frac, info, stat, object.

| id (macro) | TeX | family | meaning (unit) | home |
|---|---|---|---|---|
| `t` | t | index | token position | `landscape-tokens-and-decoding` |
| `l` | l | index | layer index (0 … N_L−1) | `landscape-tokens-and-decoding` |
| `c` | c | index | channel index (0 … d−1) | `school-vectors` |
| `h` | h | index | KV-head index | `landscape-attention` |
| `j` | j | index | block index | `idea-dictionary-delta-block` |
| `i` | i | index | generic item counter | `school-entropy` |
| `gap` | Δ | index | token distance between two entries ("used only for this distance") | `idea-fallen-apple` |
| `e` | e | resource | entry size, bytes (640 B reference; 1024 B proxy) | `landscape-kv-cache` |
| `dsz` | \|δ\| | resource | delta size, bytes = ρ e | `idea-dictionary-delta-block` |
| `Dsz` | \|D\| | resource | dictionary size, bytes = w e | `idea-dictionary-delta-block` |
| `tpot` | TPOT | resource | time per output token (30 ms) | `landscape-tokens-and-decoding` |
| `Wlink` | W_link | resource | link bandwidth (50 GB/s) | `landscape-reference-setting` |
| `Mhbm` | M_HBM | resource | GPU memory for KV (30 GB) | `landscape-reference-setting` |
| `Tstep` | T_step | resource | bytes moved per request per step | `homework-economics` |
| `Mreq` | M_req | resource | GPU memory per request | `homework-economics` |
| `k` | k | count | selections per layer per step (2048) | `landscape-sparse-attention` |
| `B` | B | count | hot-cache slots | `school-caches` |
| `BV` | B_V | count | victim-tier slots | `missed-victim-tier` |
| `b` | b | count | block size, tokens | `idea-dictionary-delta-block` |
| `w` | w | count | dictionary weight, entries' worth | `idea-dictionary-delta-block` |
| `nD` | n_D | count | resident dictionaries per layer | `idea-blockdiff-step-by-step` |
| `NL` | N_L | count | number of layers (78) | `landscape-tokens-and-decoding` |
| `L` | L | count | context length (100K) | `landscape-tokens-and-decoding` |
| `d` | d | count | elements per entry (640 ref; 1024 proxy) | `school-vectors` |
| `C` | C | count | codebook size, centroids | `school-clusters` |
| `nsub` | n_sub | count | sub-codebooks (PQ) | `school-vq-vs-klt` |
| `n` | n | count | fixed-length code width, bits | `school-fixed-length` |
| `N`, `Nlink`, `Nhbm` | N, N_link, N_HBM | count | requests per GPU and its two bounds | `idea-two-levers` |
| `nload` | n_load | count | dictionary loads per step per layer | `homework-economics` |
| `wres` | w_res | count | resident dictionary weight per layer | `homework-economics` |
| `ngrp` | n_grp | count | scale-group size (KIVI) | `papers-kivi` |
| `natoms`, `s` | n_atoms, s | count | sparse-coding atoms / atoms per vector (Lexico) | `papers-lexico` |
| `p` | p | frac | probability | `school-surprise` |
| `phat` | p̂ | frac | model probability | `school-arithmetic` |
| `m` | m | frac | miss rate m(B) | `school-reuse-distance` |
| `rho` | ρ | frac | delta ratio = \|δ\|/e ≈ bpe/8 | `idea-dictionary-delta-block` |
| `fD` | f_D | frac | δ-miss fraction | `idea-blockdiff-step-by-step` |
| `Rsq` | R² | frac | variance explained | `school-exchange-rate` |
| `eps` | ε | frac | escape fraction | `school-fixed-length` |
| `eta` | η | frac | query drift per step (the leak toy) | `idea-the-leak` |
| `H` | H | info | entropy, bits | `school-entropy` |
| `I` | I | info | mutual information, bits | `school-mutual-information` |
| `bpe` | bpe | info | bits per element, all costs | `homework-the-budget` |
| `gain` | gain | info | bits per element a dictionary's prediction saves on the residual, before costs | `homework-dictionary-shape` |
| `tax` | tax | info | per-entry tax per element | `homework-dictionary-shape` |
| `gainreq` | g_req | info | request-scope gain | `homework-scope` |
| `gainblk` | g_blk | info | block-scope gain | `homework-scope` |
| `sigma`, `mu` | σ, μ | stat | standard deviation, mean | `school-residual-shapes` |
| `lambda` | λ | stat | eigenvalue | `school-rotation` |
| `beta` | β | stat | Laplace scale | `school-residual-shapes` |
| `nu` | ν | stat | grid noise floor (KVTC) | `papers-kvtc` |
| `Sigma` | Σ | stat | covariance matrix | `school-correlation` |
| `X`, `Y` | X, Y | object | message / side information | `school-entropy`, `school-side-information` |
| `x`, `xhat`, `r` | x, x̂, r | object | a value, its prediction, the residual | `school-prediction` |
| `xvec` | **x** | object | a whole vector | `school-vectors` |
| `E` | E | object | entry E_{l,t} | `landscape-kv-cache` |
| `D`, `delta` | D, δ | object | dictionary, delta | `tiny-files-trained-dictionary` |
| `K`, `V` | K, V | object | keys, values K[l,h,t,c] | `landscape-kv-cache` |
| `q` | q | object | query | `landscape-attention` |
| `S` | S | object | selected set S_t (k elements) | `landscape-sparse-attention` |

**Letters TAKEN (do not reuse with a new meaning):** Latin lower: b, c, d, e, h, i, j, k, l, m, n, p, q, r, s, t, w, x; Latin upper: B, C, D, E, H, I, K, L, N, S, V, X, Y (plus M_·, T_·, W_· as subscripted resources and R² as a frac). Greek: Δ (token distance only), δ, ρ, ε, η, σ, μ, λ, β, ν, Σ. Words: TPOT, bpe, gain, tax.

**Letters apparently FREE** (check `data/symbols/` and the notation page again before use): a, f, g (bare), o, u, v, y, z; A, F, G, J, P, Q, R (bare), U, Z; Greek α, γ, θ, κ, τ, φ, ψ, ω, Ω. Caveats: κ was used as a declared throwaway in one figure caption (`questions-framework-a`); a, b as throwaways in school toys; "g" appears informally for layer-group size on `idea-upstairs` ("78/g"). A new symbol id must not collide with a KaTeX command `\v<id>` (`\vec`, `\varepsilon`, `\vert`, …); `node scripts/validate-data.mjs` checks this and the build throws on collision. New symbols go in `data/symbols/<xi-slug>.yaml` with fields `tex, fam, name, unit, short, home`.

Likely new symbols Part XI will want (all currently free): a per-element "bits saved" by a reference entry (consider reusing `\vgain` with a subscript rather than a new letter), a count of reference/exemplar entries per block (a letter such as `a` or `u`), a tree depth or hop count, a bootstrap/CI half-width. Avoid `n` (code width), `s` (atoms per vector), `r` (residual), `k` (selections).

---

## 4. The figure kit (from `docs/figures.md`, `figures/homework-a.js`, `figures/plan.js`)

**Registration.** One classic script per Part, `figures/<name>.js`, wrapped in an IIFE; each figure is a builder on the global registry:

```js
window.FIG = window.FIG || {};
(function () {
  'use strict';
  FIG.myFigure = (host, figure) => { /* host = empty <div class="fig-host">; figure = the <figure> */ };
})();
```

Markdown places it with `::: figure fig-<id> <builder> [wide]` (block content = caption); the build emits `<figure class="plate" id="fig-…" data-fig="builder">`. The loader (`theme/assets/js/figs-loader.js`) calls each builder **once**, lazily, ~600 px before it scrolls into view; builders may be `async` (return a Promise); errors are shown in a red `.fig-error` box and caught by `node scripts/check.mjs`. Optional per-Part CSS: `figures/<name>.css` (tokens only, prefix every class). The Part declares its files in `data/parts.yaml` → `figs: [name-a, name-b]`; a page can override with front matter `figs: [...]`. Figures are copied by Eleventy to `assets/figs/`, so data files live in `figures/data/*.json` and are fetched from `KV.prefix + 'assets/figs/data/<file>.json'` (fail loudly if missing). Heavier data is produced by reproducible scripts in `analysis/` (Python or Node).

**Helpers** (all globals from `theme/assets/js/plotkit.js`, also on `window.PK`): DOM `h()`, `el()` (SVG), `uid()`, `esc()`; formatting `fmt`, `fmtS`, `fmtSI`, `fmtBytes`, `fmtPct`; scales `linear`, `logScale`, `ticks`, `logTicks`; **`Plot(host, {w:640, h:360, x, y, xlog, ylog, xcats, ycats, xlabel, ylabel, grid, …}) → P`** with `P.x()`, `P.y()`, layers `P.g.bg/grid/axes/data/top`, `P.domain()`, `P.clear()`, `P.fs` (phone text factor); `Diagram(host, {w, h})` for bare SVG; marks `line`, `linePath`, `area`, `bars` (grouped/horizontal, tooltips built in), `rule`, `annotate`, `crosshair`, `texLabel`, `svgText`, `dot`, `arrow`, `ellipsePath`, `roundedPath`; colour `series(i)` (8 fixed slots: lapis, vermilion, peacock, saffron, amethyst, emerald, dusk, sage) and `legend(items)`; interaction `hover`, `showTip/hideTip`, `draggable` (keyboard-accessible with `get`); controls `controls`, `slider(label, min, max, step, value, onInput, format)`, `seg`, `btn`, `readout`, `kpi`, `table`, `stepper`; maths `tex(src)`, `texNode`, `texify('… $x$ …')` (site macros like `\ve`, `\vrho` work); utilities `throttleRAF`, `rng(seed)` (mulberry32, `.normal`, `.uniform`, `.int`, `.pick`, `.shuffle`), `sum`, `mean`, `variance`, `quantile`, `extent`, `linspace`, `range`, `clamp`, `log2`, `entropy`.

**House rules for figures:** colours only via CSS variables in `style` (never hex, never SVG `fill=` attributes); text in ink colours; put the container in the page before `Plot()`; viewBox units; every figure works without hover (legend for ≥2 series; key numbers in `readout`/`kpi`); state inside the closure; fail loudly; mark illustrative numbers in the caption; works at 375 px and in dark mode (`document.documentElement.dataset.theme = 'dark'`).

**A complete small builder** (from `figures/homework-a.js`, VI.1; `data()` is the file's shared fetch helper shown below it):

```js
FIG.hwaBudgetBars = async (host) => {
  const d = await data('homework-a-budget.json');
  const r = d.ref;
  const rows = [
    { cat: 'raw 8-bit', v: 8, c: 'var(--slate)', note: 'every element stored as its byte' },
    { cat: 'E4M3 · fixed-length', v: r.fixed_length.top8.bits, c: series(0), note: `sign + mantissa raw, exponent in 3 bits (top 8), ${fmtPct(r.fixed_length.top8.escape_fraction, 1)} escaped — our Monte Carlo` },
    { cat: 'E5M2 · fixed-length', v: 8 / 1.14, c: series(1), note: 'SplitZip on real KV: 1.14× (reported ratio)' },
    { cat: 'E4M3 · ideal', v: r.H_e4m3, c: series(0), note: 'order-0 entropy of a Gaussian channel — our Monte Carlo' },
    { cat: 'E5M2 · ideal', v: 6.19, c: series(1), note: 'order-0 bound SplitZip reports for real KV' },
  ];
  const box = h('div');
  host.append(legend([['E4M3, Gaussian channel (our Monte Carlo)', series(0), 'box'], ['E5M2, real KV (SplitZip)', series(1), 'box'], ['raw', 'var(--slate)', 'box']]), box);
  const P = Plot(box, { ycats: rows.map(x => x.cat), x: [0, 10], xticks: [0, 2, 4, 6, 8], h: 250, xlabel: 'bits per element (bpe)', grid: 'x', label: 'Bits per element for raw storage and context-free codes' });
  bars(P, rows.map(x => x.v), {
    horizontal: true, colors: (i) => rows[i].c, width: 30,
    labels: v => fmt(v, 2),
    tip: (v, i) => `<b>${rows[i].cat}</b><br>${fmt(v, 2)} bits per element = ${fmt(8 / v, 2)}× smaller than raw<br><i>${rows[i].note}</i>`,
  });
};

// shared helper in the same file:
async function data(name) {
  const r = await fetch((window.KV && KV.prefix ? KV.prefix : '/') + 'assets/figs/data/' + name);
  if (!r.ok) throw new Error(`could not load ${name} (${r.status})`);
  return r.json();
}
```

For Part XI the natural pattern is: export each campaign's measured tables to `figures/data/results-*.json` (via a script in `analysis/`), and write `FIG.res…` builders that draw the measured distance curves, Table-1 ladders, the compressibility curve, and replay sweeps with `line`/`bars`/`crosshair`, always with the shuffled twin as a dashed series and the primer's predicted value as a `rule(P, {y, label: 'predicted'})`.

---

## 5. House-style checklist (AUTHORING §2, §6) and page anatomy

1. Define before use: every term `[[=id]]` once on its home page, `[[id]]` after; never use a term before its defining page (linker warns; STRICT fails on undefined terms).
2. One idea per page, 500–1200 words, 1–3 `##` sections, at least one figure/table/worked example/snippet.
3. Example first, then the rule, then back to the example.
4. Pop-science voice: short active sentences, one fact per sentence; metaphors only when they carry logic; no "not X, but Y", "it's worth noting", colon-then-reveal, filler or hype.
5. Our words, not the papers': translate "channel", "token-wise", "group", "outlier", "page" into defined terms.
6. Honest and sceptical: label assumptions and illustrative numbers; say where the argument is thin; negative results are results.
7. Connections: link echoes explicitly; use `:::: compare` for same-family contrasts; `::: theme <id>` where a running theme (predict-correct, side-info, amortize, access-pattern, which-vs-what, bits-unit, noise-floor, every-tax, controls, grid-matters) genuinely shows up.
8. Break the wall of text: lists, steps, tables, `::: note <kind>`, `::: aside <kind>`, pull quotes (≤1 per page), keycards; no paragraph over ~6 lines.
9. Every `##` section ends with `::: takeaway` (2–4 bullets).
10. Every page has flashcards (`cards:`), ≥1 per section, multiple choice with plausible wrong answers and a one-line `why`, `sec:` = section id.
11. Equations use symbol macros (`\ve`, `\vrho`, …), annotate with `\underbrace{…}_{\text{…}}`, general formula then plugged-in numbers, `::: aside reminder` next to re-used definitions; display math `$$ … $$ {#eq-xi-…}`.
12. Figures explain themselves: caption states axes (units), marks/colours, how computed, what controls do; `::: try` list after interactive figures; numbers in prose must match the figure.
13. One letter, one meaning: check `data/symbols/` before using any letter; throwaway letters only inside a toy and declared there.
14. Ids: `## Heading {#id}`, figure ids `fig-<topic>-…` and equation ids unique site-wide; cross-refs `[[#page-id]]`, `[[#page-id/section]]`, `[[#fig-…]]`, `[[#eq-…]]`, `[[#target|text]]`; inside table cells write `\|`.
15. Before "done": no "used before definition" warnings; no untranslated jargon; `node scripts/check.mjs <out> --pages … --shots` passes at desktop and phone width and the screenshots were looked at.

**Page anatomy** (front matter; YAML: any string with a backslash in single quotes or `>-`; quote strings containing `: ` or starting with `[ { * & ! % @` or a backtick):

```markdown
---
title: Surprise                       # short; becomes the h1
nav: Surprise                         # optional sidebar title
lede: One or two sentences; may use $math$ and [[terms]].
group: Information                    # optional sidebar sub-heading for a run of pages
figs: [school]                        # optional: figure files (default: the Part's figs)
vendor: [pako.min.js]                 # optional vendored scripts
cards:
  - q: 'What is the surprisal of an outcome with probability $\vp = 1/8$?'
    a: 3 bits
    wrong: ["8 bits", "1/8 of a bit", "0.125 bits"]
    why: 'Surprisal is $-\log_2 \vp$, and $-\log_2(1/8) = 3$.'
    sec: surprisal
---
Opening hook paragraph (no heading)…
## First idea {#first-idea}
…
::: takeaway
- …
:::
```

Dialect blocks: `::: takeaway`, `::: note <intuition|example|toy|numbers|connection|practice|warning|key|history|metric|question|literature> [title]`, `::: aside <reminder|detail|aside|source|why> [open] Title`, `::: define <term-id>`, `::: figure fig-<id> <builder> [wide]` (or `img=/assets/img/x.svg`), `::: keycard Eyebrow`, `::: try`, `::: pull`, `::: theme <id>`, `:::: compare Title` + `::: col …`, `:::: cols` + `::: col Title`; fenced code with caption after the language (`python`, `json`, `bash`, `js`, `text`); `graph` fenced blocks for concept maps (YAML: `id, columns, nodes[{id,col,row,title,text,link,term|cat|color}], edges`).

---

## 6. How a new Part (XI) is added

1. **`data/parts.yaml`** — append an entry after Part X (order in the file = reading order; `lib/data.js` adds `index` from position):
   ```yaml
   - id: XI
     dir: 11-<slug>
     slug: <slug>
     title: …
     short: …
     emblem: <name from theme/layouts/partials/emblems.njk>   # existing names include flask, magnifier, gauge, dart, target, roofline, ladder, map, flag, seal, dice, axes, chip, bolt, hourglass, cycle, …
     figs: [<slug>]            # figures/<slug>.js (+ optional figures/<slug>.css); [] if none
     lede: >
       …
   ```
   Note Part X ("Summary and reference") currently sits last; adding XI after it puts the results *after* the reference pages in reading order and in the sidebar. If results should precede the reference, either insert XI before X in the file (then the summary page's `[[#…]]` links still resolve, but the linker's "used before its definition" check runs in reading order, so terms defined in XI must not be used in X without being defined earlier) or keep XI last and make X link forward.
2. **Folder and page ids** — `content/11-<slug>/NN-name.md`; page number = `XI.NN` (from the numeric prefix, `eleventy.config.js` `num`), URL `/<slug>/name/`, **page id = `<slug>-name`** (`pageId = partSlug + '-' + filename-without-number`; `id:` in front matter can override). Renaming a file renames its id — grep old ids first. Pages inherit `layout: page.njk` and `figList` = `figs:` in front matter or the Part's `figs`.
3. **Theme bits that hard-code the Part list (maintainer files, but required):**
   - `theme/assets/css/tokens.css` lines 39–49 define `--part-home`, `--part-I` … `--part-X`; **add `--part-XI: var(--<colour>);`** — `base.njk`, `page.njk` and `home.njk` set `--c`/`--pc` from `var(--part-{{ partId }})`, so without it Part XI pages have no accent colour. Palette in `tokens.css`: gold (home), vermilion (I), peacock (II), lapis (III), amethyst (IV), rose (V), saffron (VI), umber (VII), emerald (VIII), carmine (IX), dusk (X); **`--sky`, `--sage` and `--slate` are the named colours not yet used as a Part accent** (sage and slate are used inside figures; `--sky` is free).
   - `theme/layouts/home.njk` line 25: the string **"Ten parts, each made of short pages"** must become eleven (the parts grid itself is data-driven).
   - `eleventy.config.js` line 182: partial builds `ONLY=…` always include `p.id !== "X"` (the reference Part); nothing else is hard-coded by roman numeral. For a partial build of the new Part: `ONLY=11-<slug> npx @11ty/eleventy --output=/tmp/site-xi`.
4. **Terms and symbols** — new terms in `data/terms/<slug>.yaml` (fields `label, name, cat, home, short`; brand terms also `brand, nick, emblem, color` — ask first); new symbols in `data/symbols/<slug>.yaml`. Run `node scripts/validate-data.mjs`. Brand term colours become CSS variables `--t-<id>` automatically (`eleventy.config.js` 152–153).
5. **Figures** — `figures/<slug>.js` (+ `.css`), data in `figures/data/`, producer scripts in `analysis/`. Register via `figs:` in parts.yaml.
6. **Build and check** — `npm run build` (writes `.cache/linker-report-_site.txt`); **`STRICT=1 npm run build`** fails on any broken `[[#…]]`/`[[term]]` reference or undefined term (CI does this on every push to `main`, then force-pushes `_site/` to `gh-pages`; workflow in `.github/workflows`). The linker (`lib/linker.js`) resolves every link, figure/equation id and term, and warns when a term is used before its definition in reading order; partial builds turn out-of-Part references into warnings. Then `node scripts/check.mjs _site --pages <slug>/<page>,… --shots` (headless: console errors, failed requests, `.fig-error`, KaTeX errors, screenshots at desktop and phone width in `.cache/shots`). `npm run serve` previews at `http://localhost:8080/kvblockdiff-primer/`.
7. **Existing pages that should reference Part XI** (nothing hard-codes the list of Parts in content; these are editorial):
   - `content/index.md` — says "The answer depends on one property of KV caches that **nobody has measured yet** … plans a weekend-sized first experiment" and offers "Three ways in" (`#tiny-files-notice-anything`, `#school-why-school`, `#reference-summary`); add a fourth way in ("Just the results: [[#<slug>-…]]") and soften "nobody has measured yet".
   - `content/10-reference/01-summary.md` — section `{#plan}` ends with the "Next action" keycard ("Open the dumps … run 1a and read three numbers") and the takeaway "A weekend decides whether the idea lives"; its `{#rests-on}` section says fallen-apple is "*Unmeasured at 8 bits, anywhere.*" Both need a pointer to Part XI (or a new `## What was measured {#measured}` section). The `cards:` on that page assert "no, not at 8-bit precision" for the measured-yet question.
   - `data/parts.yaml` Part X `lede` ("the grounded numbers with their sources") and `content/10-reference/05-numbers.md` (add the campaigns' measured numbers to "From our own checks", or link out).
   - `content/09-plan/15-risks.md` keycard "Next action" and `content/09-plan/08-wave1-outputs.md` ("there should be two figures, one table …") are the natural anchors for "here is what came back".
   - `content/05-papers/14-what-would-be-new.md` lists unread 2026 papers "before any write-up"; Part XI's novelty claims should either cite that list or update it.
   - Pages whose definitions say "unmeasured"/"nobody has measured" (`idea-fallen-apple` define box "Status: a hypothesis. Not measured anywhere at 8-bit precision", `idea-heavy-blocks`, `idea-the-leak`, `homework-where-bits-come-from` "meant to be replaced", `questions-q1` "Nobody knows") can stay as the pre-registration record but should gain a one-line `::: note connection` pointing forward to the Part XI page that answers them.
8. **Flashcards** — every XI page needs `cards:` (see `docs/flashcards.md`); the practice page (`content/practice.md`, `theme/layouts/practice.njk`) collects them automatically by Part id.
9. **Docs** — `docs/PAGEPLAN.md` exists alongside `AUTHORING.md`, `figures.md`, `flashcards.md`; add XI's page plan there if the project keeps that file current.
