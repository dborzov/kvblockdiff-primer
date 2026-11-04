# Add a paper page

1. Read `docs/papers/template.md` (the sections, the trust rule) and one existing page of Part IX.
2. Add the row to `docs/project/page-plan.md` under Part IX; create `content/09-papers/<NN>-<slug>.md`
   (id `papers-<slug>`).
3. Write the page to the template. The "idea, by example" section must let a reader who has never seen
   the paper redo its trick on a toy tensor with shapes. Translate every outside term on first contact;
   end with the "their word" table (head the first column exactly `their word`).
4. Relate it explicitly to the scenario (Part IV), the stages (Part V), the hypotheses (Part VII) and the
   measurements (Part VIII): builds on / conflicts with / suggests, each with a `[[#id]]`.
5. Quote the paper's numbers as "their measurement" with section or figure; put the citation in a
   `::: aside source Receipts` and in `content/12-reference/08-references.md`; add it to the prior-art map
   if it fits; add it to the reading guide's concept graph (`papers-reading-guide`).
6. New terms the paper needs go in `data/terms/papers.yaml` with `home: papers-<slug>`.
7. Checks: `fix-frontmatter-quotes.py`, `check:words`, `ONLY=09-papers` build, `check.mjs --pages
   papers/<slug> --shots`.
