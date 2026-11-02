# Build, preview, check

The generator is Eleventy 3 (`eleventy.config.js`), Node ≥ 20. Everything runs locally; no services.

```bash
npm install                                   # once
npm run build                                 # full site into _site/; the linker report goes to .cache/linker-report-_site.txt
STRICT=1 npm run build                        # any broken reference or undefined term fails the build (CI does this)
npm run serve                                 # http://localhost:8080/kvblockdiff-primer/ with live reload
node scripts/validate-data.mjs                # data/*.yaml: terms, symbols, notation, themes, parts, settings, ref: templates
npm run check:words [paths…]                  # retired words (data/banned-words.yaml); default paths content/ and data/
node scripts/check.mjs _site --shots          # headless Chromium over every page: console errors, figure builders, screenshots
node scripts/check.mjs _site --pages school/entropy,toolbox/the-bill --shots --out .cache/shots-x
python3 scripts/fix-frontmatter-quotes.py content/<dir>/*.md   # quotes YAML scalars that contain ': '
```

## Partial builds

Build one Part into its own folder, so a half-written page elsewhere cannot break your build (the
reference Part always builds along):

```bash
ONLY=05-toolbox npx @11ty/eleventy --output=.cache/site-toolbox
grep -v "outside this partial\|used but never defined" .cache/linker-report-site-toolbox.txt
node scripts/serve.mjs .cache/site-toolbox 8123
```

`ONLY` takes a comma-separated list of `content/` folders. In a partial build, references to pages outside
it and terms defined outside it are warnings; everything else must be clean.

## What each check reports

- **The linker** (`lib/linker.js`, runs after every build): numbers figures and equations per page,
  resolves every `[[#id]]`, points every term chip at its `<dfn>`, checks every internal link and anchor,
  and warns when a term is used on a page earlier in reading order than its definition. Errors fail a
  strict build. The report lists each problem with its file.
- **`validate-data.mjs`**: required fields, unknown categories/families/emblems, duplicate ids across
  files, KaTeX errors in reminders, `{key}` placeholders that are not settings keys, unknown `[[term]]`s in
  notation reminders.
- **`check-words.mjs`**: every retired word in prose, front-matter values and YAML values. It skips
  fenced code, inline code, `::: aside source` and `::: note literature` blocks, table rows whose first
  cell is "their word" or contains "their words", and lines ending in `<!-- old-words -->`. Exit 1 on any
  hit. Fix the prose; use the escape only for deliberate quotes of an old word.
- **`check.mjs`**: loads every page (or `--pages`) at desktop and phone widths in headless Chromium,
  builds every figure (`window.buildAllFigures()`), and reports console errors, failed builders and
  missing builders (a builder that is not in any figure file the Part loads: see `figs:` in
  `data/parts.yaml`). `--shots` writes screenshots to `.cache/shots` (or `--out`). Look at them.

## Common failures

| message | cause | fix |
|---|---|---|
| `Unknown glossary term [[x]]` | the id is not in `data/terms/*.yaml` | add it to your Part's file or use the right id (`grep -rn "^x:" data/terms`) |
| `term "x" is used but never defined` | no page has `[[=x]]` / `::: define x` | define it on its `home` page (or it is defined in a Part outside your partial build: a warning) |
| `term "x" is used before its definition` | the page is earlier in reading order than the home page | reorder, rephrase without the chip, or move the home |
| `unknown reference [[#id]]` | no page, section, figure or equation has that id | check `docs/project/page-plan.md`; section ids are `{#id}` on headings |
| `duplicate target id` | two figures or equations share an id | prefix ids with the Part slug |
| `Having trouble reading front matter` / `bad indentation` | an unquoted YAML scalar with `: ` or a backslash in double quotes | run `fix-frontmatter-quotes.py`; TeX in front matter goes in single quotes |
| `KaTeX: Undefined control sequence \vfoo` | the symbol id does not exist | `data/symbols/*.yaml` |
| `::: note: unknown kind` | a kind not in the list | see `dialect.md` |
