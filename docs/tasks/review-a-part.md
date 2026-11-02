# Review a Part

A review is a report, not an edit, unless the task says to fix. Read `docs/style/terminology.md` §1–2 and
`docs/style/voice.md` first; then the Part's rows in `docs/project/page-plan.md`; then the pages in order.

Check, per page, and report with file:line:

1. **Vocabulary.** `npm run check:words content/<dir>` is clean. Beyond the checker: a retired *idea*
   under a new word (a "stretch" that means a punnet; a "cherry" that means a pick; "the orchard" used for
   a slice). Every project term has its Python form nearby on first use.
2. **Definitions.** Each term the plan assigns is defined exactly once on its page (`[[=id]]` or
   `::: define`), with what it is, an example, what it is easy to confuse with. No term used before its
   defining page (linker warnings for the Part).
3. **Links.** Every `[[#id]]` resolves (full build report) and points where the sentence promises; every
   hypothesis links its verdict; every measurement links the hypothesis it tests; every toolbox stage links
   the campaign result that used it.
4. **Numbers.** Each number has a receipt or a link to `docs/project/numbers.md`; campaign numbers carry
   their grade; no old-definition numbers (a 1024-element "entry") survive.
5. **Shape.** Hook first; one idea; 500–1200 words; no paragraph over ~6 lines; a takeaway after every
   `##`; a flashcard per section with three plausible decoys; a figure, table, listing or worked example.
6. **Voice.** Plain sentences, no mannered tics, no hype; assumptions marked; scepticism where due.
7. **Figures.** Captions explain axes, marks, method, controls; UI labels in the site's words
   (`check.mjs --shots` and look); builders present in a loaded figure file.
8. **Consistency across Parts.** The same object called the same thing on every page; the same number
   the same everywhere (grep it).

Report format: a table of findings (file:line, what, fix), then three lines: what is good, what blocks a
strict build, what is a matter of taste.
