# Navigating /attic/d/kv-compress-roofline

Repo root: `/attic/d/kv-compress-roofline` (all paths below are relative to it). Treat it as read-only:
never run a `kvcr` command that writes, never start the daemon, do not touch `targets/`, `results/`, `artifacts/`.
Plain reading, `grep`, `jq`, `python3 -I` are fine. Checked 2026-10-31: 510 commits, 438 of them research
iterations (trailer `Research-Agent:`), 387 ledger trials (C1 218, C2 169), 127 algorithm dirs (126 coders + `_template`).

## 1. Layout: what matters for RESULTS vs harness code

| dir | what | read for results? |
|---|---|---|
| `AGENTS.md` | router: one table "task → doc". Start here | yes (5 min) |
| `docs/concepts/` | terminology, what-the-human-clarified, verification-and-honesty, entry-block-dictionary-delta | yes, first |
| `docs/spec/` | contracts: `research.md` (ledgers, grades, sessions), `random-access.md` (read budget), `accounting.md`, `algorithms.md`, `taxonomy.md`, `target-writer.md` | when a field or rule needs its definition |
| `docs/research/` | the project's own background theory (information-theory-budget, fp8-grid-and-index-space, controls, glossary, prior-art, summary) | background |
| `docs/INDEX.md` | generated one-line index of every doc | lookup |
| `research/` | the campaigns' records: notebook, campaign.toml, agents, taxonomy, c1/ | **the main source** |
| `algorithms/NN-slug/` | 126 frozen coders (Python encoder/decoder + README) | to see what a coder does |
| `targets/0N-*/README.md`, `target.json` | the data's provenance and geometry (data/ itself is huge, ignore) | yes |
| `results/`, `artifacts/` | run records and block cache; git-ignored, mostly **absent** in this checkout (see section 10) | mostly no |
| `src/kvcr/`, `native/`, `tests/`, `scripts/`, `autoresearcher/`, `examples/`, `pyproject.toml`, `uv.lock` | harness code (Python package, Rust crates, tests) | ignore |
| `README.md`, `ROADMAP.md`, `docs/brief.md`, `docs/research_project.html` | human README, plan, the original request, the proposal | optional |

## 2. Where the two campaigns' records are

**C1** (night of 2026-10-29/30; V of layer 3, KV head 0 only; 4 researchers r1-r4 (+r5), 5 rounds, 218 trials):
- `research/c1/KNOWLEDGE.md` (578 lines), `c1/HYPOTHESES.md`, `c1/DEADENDS.md`, `c1/campaign.toml`, `c1/REPORT.md` (generated per-track report).
- `research/MORNING.md`: the supervisor's chronological account of the night (goal changed at 10:15 UTC; read its first table).
- `research/READER-2026-10-30.md`: standalone overview of C1 for the human (what ran, what was tried, what was learned).
- `research/BRIEFING.md` Part 2 keeps C1's summary as written.

**C2** (day of 2026-10-30; V of all 6 layers x 2 heads, fp8; agents r6-r26, 169 trials, finished):
- `research/KNOWLEDGE.md` (207 lines; rewritten, not appended; table of final verified results at top).
- `research/DEADENDS.md`, `research/HYPOTHESES.md` (976 lines, one `## rN.Hk` entry each with owner/status/trials/verdict),
  `research/ASK_HUMAN.md` (questions with the human's answers; the end-of-C2 decisions are at its top),
  `research/COORDINATION.md` (who owned which direction per round), `research/campaign.toml` (track definitions).
- `research/agents/<id>/` per-agent dirs (section 4); `research/agents/env/` is the supervisor.
- `research/BRIEFING.md` Part 1 (C2 state and the human's words), `research/INDEX.md` (generated map of digests, algorithms, crates).
- `research/design/AUTORESEARCHER-{ENV,AGENT}.md`: the design docs of the autoresearch loop itself.

**Tags.** Every fact in `KNOWLEDGE.md` is a bullet beginning `- [family/slug] **bold claim.** evidence ... [source]`.
`[split/same-bytes]` means family `split`, fact `same-bytes` (KNOWLEDGE.md line 34). Articles cite facts by these tags.
C2 families (count): quant 12, net 11, value 10, family 10, map 9, split 8, ra 8, pure 8, pdf 8, info 8, token 7, graph 7,
noise 6, big 6, data 5, transform 3, joint 3, limit/layers/layer/heads 2, struct/stream 1.
C1 families (`c1/KNOWLEDGE.md`): access, budget, cold, curve, data, family, fetch, gen, heavy, method, relax, scope, sim, t02.
```bash
grep -n '^- \[split/same-bytes\]' research/KNOWLEDGE.md          # one fact
grep -n '^- \[split/' research/KNOWLEDGE.md research/c1/KNOWLEDGE.md   # one family, both campaigns
grep -o '^- \[[a-z0-9]*/' research/KNOWLEDGE.md | sort | uniq -c       # list families
```
Beware: HYPOTHESES.md and DEADENDS.md use `[rN, session k]` or `## rN.Hk` headings, not these tags.

## 3. Trials and ledgers

One append-only JSONL per agent: `research/agents/<id>/ledger.jsonl` (spec: `docs/spec/research.md` §5). Agents r5, r9, r13,
r23 have no ledger (analysis-only directions). Trial ids are `<agent>-t<NNNN>` (`env-t0096`, `r24-t0002`). Top-level fields:

- `id, time, agent, kind` ("eval" = dev evaluation, 325 rows; "score" = holdout score, 62 rows), `campaign` ("C1"/"C2"), `session`, `hypothesis` (e.g. `r22.H5`, `env.reads`), `note`
- `algorithm` (e.g. `121-stack-rows`), `algorithm_version`, `code_hash`, `components` (Rust crates), `params` (the full parameter set), `params_bytes`
- `quick` (true = `--quick`: isolated verification skipped, exploration only, can never become an incumbent), `reference`, `validated` (conformance validation passed for this code hash; all C2 rows true), `git {commit, committed, dirty}`
- `tracks {track_id: result}`; **status, score and verification live per track, not top-level**. A track result has:
  `track_hash, split ("dev"), run_id, status, cached_run, score` (the MDL ratio), `pooled_ratio, x, y, w` (dictionary entries-worth per block), `n_blocks, n_entries`,
  `per_sequence {0000: {ratio,x,y,raw_bytes}}`, `segments {seq:k: ratio}` (32K-token segments), `per_layer {3..23}`, `delta_size {p10,p50,p90,max}`, `length_cost, mdl_with_length` (side note, not a score),
  `verification {in_process:"full", isolated: true/false, isolated_seconds, isolated_error, first_mismatch, single_entry_us}`,
  `dict_reads {mean_entries, p50, p90, p99, max_entries, worst, every_entry: true}` (read budget; `every_entry` marks the post-2026-10-30 rule),
  `gates {decode_us_per_entry, encode_s_per_block, peak_rss_mb, params_bytes, limits, failed, ok}`, `landmark {solo_ratio, h0_bits}`, `gain_vs_solo`,
  `vs {incumbent, incumbent_algorithm, delta_mean, delta_per_sequence, segments_improved, segments, grade, test}`.
- Track `status` values seen: `ok` (641), `skipped` (format unsupported, 82), `gate_failed` (16), `unmeasured` (15), `error` (14), `over_budget` (4), `lossy` (3: isolated verification failed), `over_read` (2). Only `ok` counts.
- `vs.grade` values: `better-all-dev`, `worse-all-dev`, `mixed`, `is-incumbent`, `baseline` (no incumbent), `better-t95`/`worse-t95` (>= 5 sequences, paired t-test), `holdout-better/-worse/-mixed`; `below-mdi` and `holdout-below-mdi` are C1-only labels (fixed 0.002 limit, retired in C2; never a judgement of noise).
- Meaning (from `docs/concepts/verification-and-honesty.md`, `docs/spec/research.md`): `validated` = `kvcr algo validate` passed (round trip, random access, determinism, isolation on synthetic blocks); `verification.isolated: true` = every entry of the run decoded alone in a fresh decoder-only subprocess from the stored bytes; `quick: true` = that pass skipped. An incumbent needs status ok, gates ok, not quick, isolated true.

Lookups (ledgers hold one JSON object per line; `jq -c` is fine, `python3 -I` for safety):
```bash
jq -c 'select(.id=="env-t0096") | {algorithm, note, tracks: (.tracks|map_values({status,score,isolated:.verification.isolated}))}' research/agents/*/ledger.jsonl
jq -r 'select(.algorithm|startswith("121-")) | [.id,.campaign,.kind,.quick,(.tracks|keys|join(" "))]|@tsv' research/agents/*/ledger.jsonl
jq -r 'select(.tracks["s-layer-b4k-r293"].status=="ok") | [.id,.algorithm,.tracks["s-layer-b4k-r293"].score,.tracks["s-layer-b4k-r293"].vs.grade]|@tsv' research/agents/*/ledger.jsonl | sort -k3 -n | head
python3 -I -c 'import json,glob;[print(r["id"],r["algorithm"]) for f in glob.glob("research/agents/*/ledger.jsonl") for l in open(f) if l.strip() for r in [json.loads(l)] if r["id"]=="r24-t0002"]'
```
Examples: `env-t0096` = 121-stack-rows re-measured by the supervisor on `s-layer-b4k-r293` (0.63639) and `st02n5-layer-b4k-r293` (0.62970), every entry's reads counted; `r24-t0002` = 102-path-rows on the confirmation ladder, `st02n5-layer-b4k-r293` 0.63848 and `st02n5-head-b4k-r293` 0.67015.

## 4. Per-agent directories `research/agents/<id>/`

- `agent.json`: id, model (e.g. `claude-opus-5-5`), creation time, sessions (start/end, trial count). r1-r5 are C1 (r1 coders, r2 bits/statistics, r3 similarity/depth/heads, r4 Rust speed); r6-r26 are C2 (r6-r12 round 1, r13-r17 round 1b, r18-r24 round 2, r25-r26 round 2b). `env` = supervisor.
- `ledger.jsonl`: machine-written trials (section 3).
- `journal/SESSION-NNN.md`: the agent's working notes per session (plan at top, then what happened). `env/journal/SUPERVISOR.md` is the supervisor's decision log for both campaigns.
- `digests/DIGEST-NNN.md`: one-page end-of-session summary (numbers over adjectives). All digests are listed with first lines in `research/INDEX.md`.
- `pages/iter-S-N.md` (+ `.html`, `fig-*.svg`): human-addressed page per major iteration (C2 only; r1-r5 have none). Fixed template (`env/analysis/page_template.md`): title = the finding with its number; subtitle line with agent, UTC time, tracks, trial ids; sections The question / What we did / The result / Signal or noise / What it means / Next. 61 pages in total.
- `analysis/`: the agent's Python scripts (outputs in `analysis/out/`, git-ignored). `env/analysis/` also holds the tooling: `build_pages.py`, `build_index.py`, `articles.py`, `retro_audit.py`, `recheck_reads.py`, `fastv.py` (how to read the data), `plotstyle.py`.
- `NOTES.md`: scratch. `env/briefs/c2-round{1,1b,2,2b}.md`: the supervisor's briefs that launched each round (what each agent was told to do).
- `env/pages/`: `STATUS.md`, `round-1-summary.md`, `retro-review.md`, `retro-audit.json`, `reads-recheck.json`, `articles/`.

Who studied what: `research/COORDINATION.md` (direction tables per round: e.g. r7 layer entry, r8 token entry, r9 information map, r10 codebooks, r11 transforms, r12/r24 statistics and escalation, r18 token stack, r19 big blocks, r20 mixtures, r21 nonlinear decoders, r22 sparse graphical models, r23 the floor, r25 pure vector codec, r26 quantisers). Cross-check with the digest first lines in `research/INDEX.md` and `agents/<id>/digests/DIGEST-001.md`.

## 5. Algorithms

`algorithms/NN-slug/`: `algorithm.toml` (manifest: id, name, long `description` that recites the whole fork lineage, `authors`, `formats`, `components` = Rust crates, `dictionary_access` = bytes|reader, `[params.*]` with defaults), `README.md` (what it does; first lines name the parent fork, author and hypothesis), `encoder.py`, `decoder.py`, usually `common.py`. `algorithms/_template/` is the scaffold; `01-baseline` is the reference (x + y = 1). Committed coders are frozen; an improvement is a new number, so numbers trace lineage (e.g. 102 ← 78 ← 72 ← 68 ← 64 ← 50 ← 43 ← 37). Rust crates live in `native/NN-slug/`.

Quick identification (`sed -n 1,6p algorithms/<dir>/README.md`):
- `01-baseline`: no compression; moves a fixed share of each entry into the dictionary.
- `102-path-rows` (r11): path streams (r6's 78) + exemplar reference + sparse triangular map (from 89); the round-1 frontier coder.
- `116-token-sets` (r18): 112 (token entries, three layer-group trees) with a cheaper map (parents coded under crate `32-map-sets`); best `token`-split coder.
- `121-stack-rows` (r22): tree, channel order, slopes and map fit jointly (fork of 118); best `layer`-split coder at b = 4k.
- `126-path-factors` (r20): 102 plus "path factors" (an entry's innovation predicted from its tree ancestors, coefficients inferred by the decoder, nothing sent); best `head`-split coder.
- `129-pure-wls` (r25): the "pure" vector codec (no exemplar tree): mean, triangular prediction, entropy coding, with a weighted refit.
Count: `ls -d algorithms/[0-9]*/ | wc -l` = 126 (ids 01-129 with gaps: 42, 82, 95 missing). `research/INDEX.md` lists only 01-99 (generated before round 2).

**Taxonomy** (`research/taxonomy/*.json`, spec `docs/spec/taxonomy.md`, web UI `#/taxonomy`): `stages.json` (10 pipeline stages, each with roles such as entry_scope, reach, representation, dict_selection, reference, ordering, linear_prediction, latent, basis, quantizer, distribution, location, scale, context, adaptation, coder, stream_layout, side_info, random_access, fit, shared_knowledge, control); `techniques.json` (per role: a summary paragraph and the techniques tried); `records.json` (367 records: 126 coders, 36 components, 205 experiments, each with campaign, parents, novelty, per-stage tags, verdict, evidence); `tree.json` (15 families with summaries, e.g. "Reference points"); `findings.json` (4 cross-cutting findings). It indexes every technique tried by pipeline role, with its verdict.

## 6. Targets (the data)

`targets/02-qwen3.5-2b-agent-long30/README.md` and `target.json` are the authoritative description; `targets/03-smoke-test/` (3 sequences, the dev target of both campaigns; dev `0000`,`0001`, holdout `0002`) is the same export family (agent01_long); `targets/01-qwen3.5-2b-gsm8k/` is a small early target (K post-RoPE; V only) not used by the campaigns.
Key facts: model Qwen3.5-2B "baseline" variant, hybrid Gated DeltaNet with full attention every 4th layer, so KV exists only at layers 3, 7, 11, 15, 19, 23 (of 24); 2 KV heads x head_dim 256 (GQA, 8 query heads); partial RoPE (rotary_dim 64); K stored pre-RoPE (recovered by inverting RoPE, ~1 ulp noise on channels 0-63), V as projected (no norm, no RoPE). Target 02: 30 sequences of 219,678-229,360 tokens (6.8M total), prefill positions only, in 2048-token chunks; sources are the user's own Claude Code transcripts re-rendered into Qwen's chat template (per-sequence table with tool-output share and project names in the README). Exported bf16; `fp8_e4m3` is computed on read from bf16 with `pow2_per_layer` scales (scales in `data/fp8_e4m3/scales/v.npy`), `int8` with `per_channel`.
FP8 scale rule: `docs/spec/target-writer.md` §1 ("power-of-two scale mapping the 99.99th percentile of |x| near 256", quantised RNE), referenced from `docs/spec/target-storage.md` line 60; `research/README.md` §1 and the C1 notebook state the empirical consequence "bf16 = fp8 / 2 + 0.25" (fp8 carries the information). Token metadata (role: template/system/user/assistant/tool_call/tool_response) is in `target.json` → `extra.fast_kvcache.token_kinds`.

## 7. Tracks and their names

Defined as `[[tracks]]` entries in `research/campaign.toml` (165 tracks; C1's in `research/c1/campaign.toml`). Fields: `id, format, block_size, entry, gate_scale, dict_read_max, max_blocks, target, dev, holdout, description`. Section comments in the file mark the groups (lines 46, 342, 629, 932, 1393, 1764).
Name grammar: `[tier-]<entry split>-b<block size>-<budget>`.
- Tier prefix: none = full dev run on target 03 (2 sequences); `s-` = screen, an evenly spaced ~1/10 of the blocks on target 03 dev (cheap, paired); `st02n5-`/`st02n10-`/`st02n20-` = ~1/9 of the blocks on 5/10/20 dev sequences of target 02; `t02n5-` etc. = all blocks on target 02.
- Entry split: `head` (256 values), `layer` (512), `pair`, `triple`, `regime`, `column` (1536), `token` (3072), `tok2`..`tok32` (table in `docs/concepts/terminology.md` §5).
- Block size: `b512`, `b4k` (4096), `b16k`.
- Budget: `r137`, `r293`, `r1103`, `r4421` = max dictionary bytes one entry's decode may read, in units of a `layer` entry (512 B); `u` = unlimited (reference only, never the objective).
So `s-layer-b4k-r293` (campaign.toml line 663) = screen on 03 dev, both heads of one layer per entry, 4096-token blocks, reads <= 293 entries per entry (max_blocks 72). `st02n5-token-b4k-r293` (line 1491) = 1/9 subset on 5 sequences of target 02, all V of one token per entry (3072 values), 4k blocks, reads <= 293 layer-entries (max_blocks 30). Compare scores only on the same track or on a same-window comparison; `s-token` blocks are ~0.0046 harder than `s-layer` blocks ([split/same-bytes]).

## 8. Terminology pitfalls

`docs/concepts/terminology.md` §12 retires: channel / number in the vector → **elephant line** (one position 0-255 within a V vector, followed along the sequence); thread → **sequence**; map / cross-head map → **linear prediction** (name the algorithm); series → which layer/head the entry set belongs to; block meaning data → **entry set** (a block is only a range of positions); "the network" → the LLM, Qwen3.5-2B; detection limit / MDI / `below-mdi` as a judgement → the paired difference and its spread. Also: anchor/exemplar/reference (an earlier entry used to predict), tree (links to references), x/y (dictionary share/delta share), w (dictionary weight in entries), solo (per-elephant-line order-0 entropy, 0.800 on fp8, 0.649 on bf16).
Everything written before 2026-10-31 (all of C1, MORNING, READER, BRIEFING, most KNOWLEDGE bullets, iter pages, ledgers' notes, algorithm READMEs) uses the old words; they are receipts and were deliberately not rewritten. Only the articles, STATUS.md, retro-review.md, terminology.md and what-the-human-clarified.md use the new words.

## 9. Human-readable syntheses, in order of trust

1. `research/agents/env/pages/articles/01..09-*.md` (+`index.md`): nine articles written at the end of C2 with the new terminology; each ends with a `Receipts:` line (tags, pages, trial ids). `index.md` has the final result table and the "how sure" labels (verified / real bytes block test / exact model / bound).
2. `research/agents/env/pages/STATUS.md`: generated from the ledgers (2026-10-31 06:43 UTC): incumbents per track, with trial ids.
3. `research/agents/env/pages/retro-review.md`: the human's requirements checked against what was built; which rule changes altered which results; receipts `retro-audit.json`, `reads-recheck.json`.
4. `research/READER-2026-10-30.md` and `research/MORNING.md` (C1 overview and chronology), `research/agents/env/pages/round-1-summary.md` (C2 mid-day state).
5. `research/KNOWLEDGE.md` tags (and `c1/KNOWLEDGE.md`): the facts with trial ids and grades; `DEADENDS.md` for closed ideas.
6. `research/agents/<id>/pages/iter-*.md` and `digests/`: one agent's view of one iteration/session, incl. unverified "real bytes" numbers.
7. `research/agents/<id>/ledger.jsonl`: the raw truth; every verified number traces to a row.
Caveat on the articles' numbers: some KNOWLEDGE facts (e.g. `[split/same-bytes]`, parts of `[token/*]`) are "unverified encoded bytes, no ledger grade" or "ledger row pending"; the fact text says so.

## 10. Verifying a number from an article

1. Find the number's article and read its `Receipts:` line (e.g. article 01: tags `[split/same-bytes]`, `[split/ranking]`, pages r24 iter-1-3, trial r12-t0004).
2. `grep -n '^- \[split/same-bytes\]' research/KNOWLEDGE.md`: the fact gives the numbers, the spread, the grade and its source (`[r24 sw.py, page iter-1-3]`).
3. Open the page: `research/agents/r24/pages/iter-1-3.md` (subtitle lists tracks and trials) and, if needed, the script `research/agents/r24/analysis/sw.py`.
4. For a trial id, query the ledgers (section 3): check `tracks.<track>.status == "ok"`, `quick == false`, `verification.isolated == true`, `dict_reads.every_entry`, and `vs.grade`.
5. The track result's `run_id` (e.g. `20261030-191419-121-6f163f`) names a run record under `results/runs/<run_id>/` (`run.json`, `blocks.jsonl`, `report.md`). **In this checkout `results/` is nearly empty**: only 42 baseline runs from 2026-10-29/30, 17 jobs, 2 sweeps; no C2 run_id resolves, and `artifacts/objects/` is empty (git-ignored, not shipped). So the ledger row is the deepest layer available; `results/runs` would only add per-block numbers.
6. Cross-check with the commit: `git log --grep 'r24-t0002'` (iteration commit bodies name the trial ids; the trailers are `Research-Agent: rN` and `Research-Session: k`, a `Research-Trials` trailer is not always present) or `git log --grep '^Research-Agent: r24$' --stat` (9 commits) shows when the row and page landed. The supervisor's late re-measurements (`env-t0089..t0097`) have no iteration commit of their own; their receipt is `research/agents/env/pages/reads-recheck.json`.
