# kv-compress-roofline: how to orient yourself in the experiments repo, for this site's purposes

A skill-style guide, written 2026-10-31 (vocabulary note added 2026-11-02), for whoever next has to read
`/attic/d/kv-compress-roofline` (the measuring harness plus the records of two autonomous research campaigns on
Qwen3.5-2B KV caches) in order to write or check something on this site. Read this file, then the note that
matches your task.

> **Vocabulary.** This guide and the notes under `notes/` are written in the repository's own words (entry, block,
> channel, coder, read budget, track names), which the site retired on 2026-11-02. They are receipts and are not
> rewritten. Translate with `docs/style/terminology.md` §4.2 of the site repo: entry → cherry; entry set / block
> (data) → punnet; block (positions) → stretch; entry split → slice + cherry shape; channel / elephant line →
> element / furrow; read budget → the leash; coder / algorithm → compressor; map → linear prediction;
> anchor / exemplar / reference → reference cherry; x / y → dictionary share / delta share; proxy model → stand-in
> LLM; KV cache → the orchard. Part XI of the old site is Part VIII (`content/08-measured/`) of the new one; its
> page ids are unchanged. Part XII's pages are now in Parts VI and VIII.

## What the repo is, in one paragraph

A Python harness (`kvcr`) that scores lossless "dictionary + delta" coders on real KV caches by the MDL ratio
(compressed bytes ÷ raw bytes), verifies every entry bit for bit in a separate process, and records every trial
in per-agent ledgers. On the night of 29–30 Oct 2026 four AI researcher agents ("campaign C1") and on 30 Oct
about twenty-one agents plus a supervisor ("campaign C2") wrote 126 coders and ran 387 ledger trials, mostly on
the **values** of the six full-attention layers of Qwen3.5-2B, FP8 E4M3, from 30 coding-agent transcripts of
~225K tokens each. The repo also contains the agents' notebooks, iteration pages, a nine-article series written
for the human, and the human's rulings. Treat it as **read-only** from this site: never run a `kvcr` command
that writes, never start its daemon, never touch `targets/`, `results/`, `artifacts/`.

## Where to start, by task

| you want to | read |
|---|---|
| find any file, decode a track name, look up a trial id, understand ledger fields | `notes/00-navigation.md` |
| check a headline number (the 0.63, the ladder, solo coding) or learn what a coder does in plain words | `notes/01-headline-numbers-and-coders.md` |
| the "what V really is" claims (LLM replay, memory table, weights-only rule) and the values-not-bits audit | `notes/02-what-v-is-and-values-not-bits.md` |
| entry splits, the shuffle test, codebooks and rotations, FLAC, random access, block size, noise and the trap | `notes/03-structure-and-method.md` |
| campaign C1's story, the keys results (K vs V), bf16 vs fp8, the goal clarifications, what C2 overturned | `notes/04-campaign-c1-and-keys.md` |
| what this site predicted before the data, page by page, with the site's glossary terms and symbols | `notes/05-primer-predictions-inventory.md` |
| the Part XI specification: page plan, pinned numbers with receipts, term allocation, figure list | `PART-XI-SPEC.md` |
| Part XII (the information-theory reading, the on-fire design, bits to dollars, the Bench setting) | `docs/plans/history/part-xii-spec.md` in the site repo; its curve points come from C1's dictionary-budget tracks (`figures/data/range-curve.json`, `analysis/range_extract.py`) |

## The ten things to know before quoting anything

1. **Vocabulary changed mid-campaign.** `docs/concepts/terminology.md` is the current one. Retired words still appear in older files:
   channel → "elephant line", thread → sequence, map → linear prediction, anchor (C1) → reference. On this site we say
   element or furrow, sequence, linear prediction, reference cherry (see the vocabulary note at the top).
2. **"Verified" has one meaning:** a non-`quick` ledger row with `verification.isolated: true`. Iteration-page numbers labelled
   "block test", "real bytes", "exact model" or "bound" are not verified results, however precise they look.
3. **Scores from two screens cannot be subtracted.** Each entry split and block size samples different blocks. Only a same-window
   comparison ranks splits (the token-vs-layer "trap" reversed a conclusion).
4. **Three solo numbers exist:** 0.7999 (ideal, layer 3 head 0), 0.778 (ideal, six layers), 0.804 (best real solo coder).
   C2's six-layer results compare with 0.778.
5. **C1 and C2 are different slices.** C1 = V, layer 3, head 0, no read budget, fixed detection limit 0.002, reads by the mean.
   C2 = six layers, several entry splits, read budgets on every single entry (since 2026-10-31). Their numbers look alike by coincidence.
6. **The dictionary share (x) is bookkeeping for tree coders.** Every good tree coder sits at x ≈ 0.4–0.55 because reference entries live in
   the dictionary; x = 1 is legal and cheap to read with a path layout. Only for no-tree coders (129) is x a dictionary in the site's sense.
7. **Most results rest on two sequences** of one kind of text (coding-agent prefills). The best coders reached five sequences at the very end;
   C2 never used the holdout. Say so.
8. **The ledger is the deepest layer in this checkout.** `results/runs/` holds only 42 baseline runs; C2 run records and r23's raw outputs are gone.
   A number that is not in a ledger row, a page or a json receipt cannot be recomputed here.
9. **The articles are faithful but occasionally spliced.** Three figures combine two measurements (tok2/tok4 baseline; reference-locality
   percentages; PQ chunk numbers). `notes/03` gives the like-for-like versions.
10. **The human's three rulings** (read budget for every entry; delta lengths not counted; shared tables legitimate but not yet) are in
    `docs/concepts/what-the-human-clarified.md` and `research/ASK_HUMAN.md`. They decide what "allowed" means.

## Trust order for a number

articles (`research/agents/env/pages/articles/`) → `STATUS.md` / `retro-review.md` → `READER-2026-10-30.md`, `MORNING.md` →
`KNOWLEDGE.md` tags → agent iteration pages → **ledger rows** (`research/agents/<id>/ledger.jsonl`). Go down until you hit a ledger row
or an explicit "exact model / bound" label, and quote the grade you found.

```bash
# look up one trial across all ledgers
grep -h '"id": "env-t0096"' /attic/d/kv-compress-roofline/research/agents/*/ledger.jsonl | python3 -I -c '
import sys, json
for line in sys.stdin:
    r = json.loads(line)
    for t, v in r["tracks"].items():
        print(r["id"], r["algorithm"], t, v.get("score"), v.get("status"), v.get("verification", {}).get("isolated"))'
```

## How this site uses the repo

- `analysis/measured_extract.py` reads the ledgers (path from `KVCR_REPO`, default `/attic/d/kv-compress-roofline`) and writes
  `figures/data/measured-*.json`; page-only numbers are hand-entered with receipts in `analysis/measured_pages.json`.
- Part VIII (`content/08-measured/`, the old Part XI) quotes only numbers pinned in `PART-XI-SPEC.md` §1. If a number there and in a JSON disagree,
  the JSON (ledger-derived) wins and the prose is corrected.
- Nothing from the repo is copied into the site except numbers and plain-word descriptions; its figures are not reused.
