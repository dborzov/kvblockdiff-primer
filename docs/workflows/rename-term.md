# Workflow: rename a term, a symbol, a page or a Part

Renames are cheap in the data and expensive in the prose; the linker catches the chips, not the bare words.

## A term

1. Decide the new id and label; record old → new in `docs/project/terminology.md` and the old word in
   `docs/style/voice-and-words.md` ("never").
2. Change the key and `label`/`name`/`short` in `data/terms/*.yaml`. The build will now fail on every
   `[[old]]` chip: that is the to-do list.
   ```bash
   grep -rln "\[\[=\?old\b" content | sort          # chips
   grep -rwn "old word" content figures docs | wc -l  # bare words, captions, docs
   ```
3. Rewrite the chips, then the bare words, then figure labels and captions in `figures/*.js`, then cards.
   Reword sentences; a bare substitution leaves the old concept behind the new word.
4. Update `ref:` templates, the `nick` and emblem if the metaphor changed, and the home page's `::: define`.
5. `node scripts/validate-data.mjs`; `STRICT=1 npm run build`; read the report; run the checker on the home page.

## A symbol

Change the id in `data/symbols/`; every `\vold` in content and `data/*/short` fails KaTeX until fixed:
`grep -rn "\\\\vold\b" content data figures`. Keep the `tex` glyph unless the letter itself changes.

## A page

The page id is `<part slug>-<file name without number>`. `grep -rn "old-id" content data docs figures` before
`git mv`; update every `[[#old-id…]]`, every `home:` in `data/terms` and `data/symbols`, every `link:` in
concept graphs, and the page plan. Flashcard ids change with the page id: readers lose that page's
progress, so say so in the commit and avoid it when the page is live and popular.

## A Part

Change `dir`, `slug` or `id` in `data/parts.yaml`, rename the folder, then every page id of the Part changes
(previous section, at scale). Part numbers (roman) appear in prose ("the toy trace of III.7"): `grep -rn
"\bIII\.[0-9]" content`. Moving a Part in reading order changes define-before-use warnings; rebuild and read them.
