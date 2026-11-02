# Workflow: check a number, regenerate figure data

Every measured number on the site has a receipt, and every figure's numbers come from a script. When
they disagree, the ledger-derived JSON wins and the prose is corrected.

## Where numbers come from

| kind | source | how to check |
|---|---|---|
| toy and napkin numbers (Parts I–IX) | seeded generators in `figures/<part>.js`, or `analysis/homework_*.py` → `figures/data/homework-*.json` | re-run the script; compare the printed values with the prose |
| the Pin's frozen numbers | `data/settings.yaml`, III.10, with HiSparse's paper as the source | X.5 lists sources; HiSparse figures were quoted from the first draft, not re-checked |
| campaign results (Parts XI–XII) | the experiments repo ledgers, extracted by `analysis/measured_extract.py` and `analysis/range_extract.py` into `figures/data/measured-*.json` and `range-curve.json`; pinned with receipts in `experiment_repos/kv-compress-roofline/PART-XI-SPEC.md` | find the trial id in the page's Receipts aside; look it up in the spec §1, then in the ledger (`notes/00-navigation.md` §3 has the `jq` lines) |
| the Bench's frozen numbers | `data/settings.yaml`, XII.7 | the target README in the experiments repo |

The experiments repository itself is not in this repo; `experiment_repos/kv-compress-roofline/README.md`
says how to orient in it and which of its directories are read-only. Never run a command there that writes.

## Regenerating figure data

```bash
python3 analysis/homework_a_budget.py      # each script says what it writes at the top
python3 analysis/measured_extract.py       # needs the experiments repo path; see the script header
node analysis/tiny-numbers.cjs             # the Gull Rock numbers of Part I
```

After regenerating: diff the JSON, re-read every page whose Receipts aside cites the affected figure, and
update the prose numbers by hand. Then `STRICT=1 npm run build` and the checker on those pages.

## Grades to carry with a number

verified · forecast-only (the site currently says "exact model") · bound · same-window (not verified) ·
assumed · toy · published (not re-run) · as reported in the first draft (not re-checked). Say which, every time.
