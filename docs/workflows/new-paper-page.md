# Workflow: add a paper review page (Part V)

Read `docs/style/papers.md` first; it holds the skeleton and the seven questions.

1. **Gather.** Title, authors, year, venue or arXiv id; the abstract; the sections that carry the headline
   numbers. Note for each number whether the authors measured it or copied it, and at which precision.
   Record what you could not re-check.
2. **Place it on the map.** Lossless or lossy? Which data path (bulk, network, GPU footprint, miss path)?
   Which dictionary scope? Add a node to the concept graph on V.1 (`papers-map`) and a row to the prior-art
   map in Part X if it is a new family.
3. **Build the hook.** A toy table or listing in the site's shapes that shows the paper's central observation
   so a reader can see it before the mechanism is named. Make the toy's numbers with a seeded generator in
   `figures/papers-*.js` if the page has a figure, so prose and figure agree.
4. **Retell the mechanism in our words.** Translate every coined term; collect the translations in the
   "their words, our words" table at the end of the page. Define a term on the site (`data/terms/papers-*.yaml`)
   only if later pages will need it.
5. **Connect.** For each claim of the site the paper touches, link the page and say support / conflict /
   refinement. Mark what does not transfer (path, precision, LLM family) and why.
6. **Doubt.** Write "Where we are not convinced" with specifics: the missing control, the flattering
   baseline, the unit that does not convert to bits.
7. **Receipts and references.** `::: aside source Receipts` with sections and tables; the citation in the
   references page (X.8).
8. **Cards, takeaways, build, check, checklist** as for any page (`docs/workflows/new-page.md`).
9. **Update** `docs/project/state-of-knowledge.md` if the paper changes an "established" row, and the
   `papers-what-would-be-new` page if it bears on novelty.
