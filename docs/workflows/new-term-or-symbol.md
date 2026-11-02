# Workflow: coin a term or a symbol

Before anything: is there already a word? `grep -rn "^<id>:" data/terms/`; read `docs/project/terminology.md`.
A second id for an existing idea is the worst outcome. Is the word needed at all, or does a Python slice
(`V[:, l, h, c]`) say it more exactly? The site prefers the slice unless the concept recurs many times.

## A term

1. Choose the word by the rules in `docs/plans/terminology-rework.md` §2: one concept; odd enough to be read
   as ours on sight if it could be confused with anything; plain only if the outside meaning is ours.
2. Add it to `data/terms/<part-slug>.yaml` (never `core.yaml`, unless you own the core): `label`, `name`,
   `cat`, `home` (the page that will hold `[[=id]]`), `short` (a reminder that stands alone; may use
   `$math$`), optional `ref:` (`docs/project/rigs.md`).
3. Define it on the home page, once, through an example and ideally a listing: `::: define id` with
   what it is, an example, and what it is easy to confuse with. Mention it elsewhere with `[[id]]`.
4. If it belongs in the cast (badge, emblem, colour, a card on the home page): ask first; then `brand: true`,
   `nick`, `emblem` (from `theme/layouts/partials/emblems.njk`), `color: [light, dark]`.
5. Add the word to `docs/project/terminology.md` with its home page; if it replaces or narrows an existing
   word, add the old word to the "never" table in `docs/style/voice-and-words.md`.
6. `node scripts/validate-data.mjs`, then a strict build.

## A symbol

1. Check the letter is free: `data/symbols/*.yaml` and the notation page. One letter, one meaning, site-wide.
2. Add to `data/symbols/<part-slug>.yaml`: `tex`, `fam`, `name`, `unit`, `home`, `short`, optional `ref`.
   The id is letters only; it becomes `\v<id>`.
3. Use the macro in every equation; write the symbol's meaning in prose where it first appears.
4. Add it to `docs/project/notation.md` if it is one of the handful every page uses.
