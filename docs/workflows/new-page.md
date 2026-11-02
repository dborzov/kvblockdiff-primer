# Workflow: add or rewrite a page

1. **Place it.** Find the Part and the next free number in `docs/site/page-plan.md`; create
   `content/<NN-part>/<MM-name>.md`. The page id is `<part slug>-<name>`; it is what others will reference.
   Never renumber existing pages. Add the page's row to the page plan with its scope and what it defines.
2. **Read the words.** `docs/project/terminology.md` (and the proposal's status line), `docs/style/voice-and-words.md`.
   Decide which terms this page defines (it becomes their `home`) and which it only mentions.
3. **Front matter** per `docs/site/page-anatomy.md`: title, lede, group if the Part uses groups, cards.
4. **Write** per `docs/style/house-style.md`: hook, example, rule, example again; one idea; sections with ids;
   a listing on Bench shapes for any word introduced; takeaways; receipts aside for outside numbers.
5. **Terms and symbols.** New ones go in `data/terms/<part>.yaml` / `data/symbols/<part>.yaml`
   (`docs/workflows/new-term-or-symbol.md`). A brand term needs approval.
6. **Figures** (if any) in `figures/<part>.js`, data via `analysis/` into `figures/data/` (`docs/site/figures.md`).
7. **Build and check.**
   ```bash
   ONLY=<NN-part> npx @11ty/eleventy --output=/tmp/site-x
   node scripts/check.mjs /tmp/site-x --pages <slug>/<name> --shots --out /tmp/shots-x
   STRICT=1 npm run build            # the full site, before committing
   ```
   Read `.cache/linker-report-*.txt` for your page; look at the screenshots at both widths.
8. **Cross-link.** Add `[[#…]]` from the pages that should point here (the summary page, the Part's map, the
   theme callouts); update `docs/project/state-of-knowledge.md` if the page changes a verdict.
9. **Checklist** `docs/workflows/done-checklist.md`, then commit with a message that names the page id.
