# Add a term, a symbol or a notation entry

Before anything: is it a new idea? `grep -rn "^<id>:" data/terms data/symbols data/notation`. If the idea
exists under another name, use the existing id. If the word is a standard one, use it; if it is a project
word, follow `docs/style/terminology.md` §1 and §5 (vivid, unmistakable, bundled with its Python form).

**A term.** Add it to `data/terms/<part-slug>.yaml` (fields in `docs/site/data.md`), with `home` the page
that defines it. Define it there once with `[[=id]]` or `::: define id`; mention it elsewhere with `[[id]]`.
Add a `ref:` template if a reference-setting number helps the hover. If it replaces a retired word, add
the old word to `data/banned-words.yaml` and a row to `docs/style/terminology.md` §4. Brand terms (emblem,
colour, nick) are proposed to the human, not added.

**A symbol.** `data/symbols/<part-slug>.yaml`; the letter must be free (the notation page lists all);
the id becomes `\v<id>`; give `fam`, `name`, `unit`, `short`, `home`.

**A notation entry.** `data/notation/<part-slug>.yaml`: `code` (quoted), `name`, `short`, `shape` and
`bytes` as `{key}` templates over `data/settings.yaml` when they apply, `home`. Use the index names of
`docs/project/notation.md` and never another axis order.

Then `node scripts/validate-data.mjs`, a partial build, and `npm run check:words` on the files you touched.
