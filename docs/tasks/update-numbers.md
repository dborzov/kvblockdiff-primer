# Bring new numbers from the experiments repository onto the site

The experiments repository (`kv-compress-roofline`, read-only; reading guide in
`experiment_repos/kv-compress-roofline/README.md` and `docs/experiments/kv-compress-roofline.md`) writes
one JSON line per trial into per-agent ledgers. The site quotes only numbers that trace to a ledger row
(verified), or says which lesser grade a number has.

1. Find the number's receipt: a ledger row (`id`, `algorithm`, `tracks.<track>.score`, `verification.isolated`,
   `dict_reads.every_entry`), or the article / page that states its grade. Trust order and `jq` recipes:
   `experiment_repos/kv-compress-roofline/notes/00-navigation.md` §3, §9, §10.
2. Translate the track name into a scenario line (`docs/style/terminology.md` §4.2; e.g.
   `s-layer-b4k-r293` → `V · all · cherry (2, 256) · stretch 4096 · leash 293 (screen)`), the coder number
   into "compressor NN", the split into a cherry shape, x/y into dictionary/delta share.
3. If a figure shows the number: regenerate `figures/data/measured-*.json` with
   `KVCR_REPO=<path> python3 analysis/measured_extract.py` (ledger-derived), or add the page-only number with
   its receipt to `analysis/measured_pages.json`. JSON wins over prose when they disagree.
4. Update `docs/project/numbers.md` and `content/11-reference/05-numbers.md`; update the page that
   quotes it, with the receipt in its `::: aside source`; keep the grade word (verified, quick,
   code-length estimate, bound).
5. If the number changes a verdict, update the hypothesis page's `## Verdict` (Part VII) and, if it
   changes what to do next, Part X.
6. Checks: `check:words`, partial builds of the touched Parts, `check.mjs` on the touched pages.
