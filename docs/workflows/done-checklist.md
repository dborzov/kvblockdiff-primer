# Before you call a page done

- [ ] Every term and symbol is defined before use; no "used before its definition" warning for this page in `.cache/linker-report-*.txt`.
- [ ] No word from the "never" table of `docs/style/voice-and-words.md`; no paper jargon left untranslated; no "×" for a compression figure.
- [ ] Every project word introduced here sits next to the listing or slice that computes it on Bench shapes.
- [ ] Opens with an example or a hook; one idea; 500–1200 words; no paragraph longer than about six lines.
- [ ] Each `##` section has an id, ends with a `::: takeaway`, and has at least one flashcard with three decoys and a `why`.
- [ ] Equations use symbol macros; the key ones are annotated; reminders sit next to formulas that reuse old definitions.
- [ ] Figures: caption with axes, units, marks, method and controls; the numbers in prose are the figure's numbers.
- [ ] Every outside or measured number has a receipt and a grade; rig-dependent numbers name the rig or use `[[@key]]`.
- [ ] Cross-links in and out: the Part's map, the summary page, themes, the pages this one supports or corrects.
- [ ] `docs/site/page-plan.md`, `docs/project/terminology.md` and `docs/project/state-of-knowledge.md` updated if the page added a term, a page or a verdict.
- [ ] `STRICT=1 npm run build` passes; `node scripts/check.mjs <out> --pages … --shots` passes at desktop and phone width, and the screenshots look right.
