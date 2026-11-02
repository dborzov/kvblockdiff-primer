# Standing duties: maintain as you go

Every task on this repository, whatever its subject, carries these duties. They keep the site a source of
truth instead of a layered cake.

1. **Vocabulary.** If a page you touch uses a word from the "never" table, fix it in passing. If you needed
   a word that did not exist, coin it properly (`docs/workflows/new-term-or-symbol.md`) and record it in
   `docs/project/terminology.md`. If you found two words for one thing, report it there under a "drift" note.
2. **Glossary and notation data.** Reminders (`short`) must still be true after your change; `ref:` templates
   must still name the right quantity; the home page must still hold the one definition.
3. **Flashcards.** A changed section means re-reading its cards: still true, still answerable, decoys still
   wrong. Never change a card's id; add new cards rather than repurposing old ones.
4. **Cross-references.** A new claim or verdict gets linked from the summary page (X.1), the Part's map, and
   the pages it supports or corrects. A theme callout where a running theme genuinely shows up.
5. **State of knowledge.** `docs/project/state-of-knowledge.md` is updated whenever a page changes what the
   site holds as established, measured, assumed or open.
6. **Catalog.** A new doc or workflow is added to `docs/README.md`; a convention that changed is recorded in
   the doc that owns it, not in a commit message or a chat.
7. **Page plan.** New pages get a row in `docs/site/page-plan.md`; scopes of rewritten pages are updated.
8. **Receipts.** Any number you add names its source and grade; any number you change updates its figure
   data and its receipt.
9. **Build health.** Leave `STRICT=1 npm run build` passing and no new warnings for the pages you touched.
10. **Honesty in reports.** When reporting work, say what was verified (build, checker, screenshots looked
    at), what was skipped, and what is left.
