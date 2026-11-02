# The experiments repository, from this site's side

`kv-compress-roofline` is the Python harness (`kvcr`) plus the records of the two research campaigns
(29–30 Oct 2026): 126 compressors, 387 ledger trials, agents' notebooks, iteration pages, nine articles and
the human's rulings. It is **not** in this repository. Its reading guide, written for this site's
purposes, is `experiment_repos/kv-compress-roofline/README.md` (start there), with five notes under
`notes/` and the Part VIII specification `PART-XI-SPEC.md` (every pinned number with its trial id).

Two things to know before reading any of it:

1. **Its records use the old vocabulary**, on purpose (they are receipts). Since 2026-11-02 its living
   docs (`AGENTS.md`, `docs/concepts/`, `docs/guides/`, `docs/spec/`, `research/README.md`) use this
   site's words; its `docs/concepts/terminology.md` carries the table from the code's names (`entry`,
   `block_size`, track ids) to ours, and its `docs/concepts/experiments-and-scenarios.md` maps every
   track the campaigns ran onto a scenario line, with its grade and the runs to repeat. For the
   records, translate with `docs/style/terminology.md` §4.2: entry → cherry, entry set / block → punnet,
   block (positions) → stretch, entry split → slice + cherry shape, channel / elephant line → element /
   furrow, read budget → the leash, coder → compressor, map → linear prediction, anchor / exemplar /
   reference → reference cherry, x / y → dictionary / delta share. Track names (`s-layer-b4k-r293`) are
   quoted only inside `::: aside source` blocks on the site.
2. **Trust order for a number**: articles → `STATUS.md` / `retro-review.md` → `KNOWLEDGE.md` tags →
   iteration pages → ledger rows. "Verified" means a non-quick ledger row with `verification.isolated:
   true` and, since 31 Oct, `dict_reads.every_entry: true`. Scores from different screens are never
   subtracted.

How the site consumes it: `analysis/measured_extract.py` reads the ledgers (`KVCR_REPO`) into
`figures/data/measured-*.json`; `analysis/measured_pages.json` holds hand-entered page numbers with
receipts; `analysis/range_extract.py` extracts the dictionary-budget curve. Nothing else is copied:
no figures, no prose. The procedure for new numbers is `docs/tasks/update-numbers.md`.

What the campaigns measured and did not, in this site's words, is `docs/project/scenario.md` §9 and
Part VIII; the plan for the next experiments on the same data is Part X.
