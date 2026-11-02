# Add a page

1. Decide the Part (reading order is dependency order: a page may use only terms defined on earlier
   pages) and the next free number in its folder. Never renumber existing pages; file names decide ids.
2. Add the row to `docs/project/page-plan.md`: id, title, scope, defines.
3. Write the page (`docs/style/voice.md`; dialect in `docs/site/dialect.md`; exemplar
   `content/04-scenario/`): hook, one to three `##` sections with `{#ids}`, a figure, table, listing or
   worked example, a `::: takeaway` per section, flashcards per section in the front matter.
4. Terms it defines: set their `home` to the new page id (new terms in `data/terms/<slug>.yaml`).
5. Check: `python3 scripts/fix-frontmatter-quotes.py content/<dir>/<file>.md`,
   `npm run check:words content/<dir>/<file>.md`, `ONLY=<dir> npx @11ty/eleventy --output=.cache/site-x`,
   read `.cache/linker-report-site-x.txt`, `node scripts/check.mjs .cache/site-x --pages <slug>/<name>
   --shots` and look at the screenshots.
6. Link to it from at least one earlier page where it belongs, and from the Part's first page if it is a
   new thread.
