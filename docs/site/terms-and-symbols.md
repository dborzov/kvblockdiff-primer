# Terms and symbols (the data behind the chips and the macros)

The project's vocabulary is data, not prose. `lib/data.js` loads and validates it; the build fails on a
duplicate id or a missing field; `lib/linker.js` checks that every term is defined exactly once and used
only after its definition. The *words themselves* are chosen by `docs/project/terminology.md`.

## Glossary terms: `data/terms/*.yaml`

```yaml
cherry:
  label: cherry                      # chip text
  name: cherry (one position's keys and values at one layer)   # full name on the glossary page
  cat: project                       # info | coding | stats | linalg | numbers | systems | llm | project
  home: landscape-kv-cache           # the page id that holds the one [[=cherry]]
  short: >-                          # the hover reminder: 1–2 plain sentences that stand alone; may use $math$
    …
  ref: "{d} elements, {e} per cherry"   # optional: a rig template, see docs/project/rigs.md
  brand: true                        # signature terms only (the cast): also need nick, emblem, color
  nick: the Cherry
  emblem: tile                       # a name from theme/layouts/partials/emblems.njk
  color: ["#6b4423", "#e3b48a"]      # [light theme, dark theme]
```

- Core terms live in `core.yaml`; a Part's own terms in `<part-slug>.yaml` (or `<part-slug>-a.yaml`… when several
  writers share a Part). Files are merged; an id defined in two files is a build error.
- Before adding: `grep -rn "^<id>:" data/terms/`. Never create a second id for an existing idea.
- Brand terms (badge, emblem, colour, a card in "The cast" on the home page) are reserved for the cast
  listed in `docs/project/terminology.md`. Ask before adding one.
- In Markdown: `[[id]]` mentions, `[[id|text]]` mentions with custom text, `[[=id]]` defines (once),
  `::: define id` wraps the definition in a box.

## Symbols: `data/symbols/*.yaml`

```yaml
rho:   { tex: "\\rho", fam: frac, name: delta ratio, unit: "", home: idea-dictionary-delta-block,
         short: "Delta size over cherry size, $\\vrho = \\vdsz/\\ve$. Smaller is better.", ref: "{…}" }
```

- The id becomes the macro `\v<id>` (letters only); `tex` is what it renders; `fam` picks the colour:
  `index` (positions), `resource` (bytes, seconds, bandwidth), `count` (counts and knobs), `frac`,
  `info` (bits), `stat`, `object` (vectors, sets, dictionaries).
- **One letter, one meaning.** Check `data/symbols/` and the notation page before using a letter. A toy
  example may use throwaway letters only if it says what they are right there and they do not leak out.
- `node scripts/validate-data.mjs` renders every macro and every `short` with KaTeX and reports collisions
  with built-in KaTeX commands.

## Themes and Parts

`data/themes.yaml`: a theme needs `title`, `emblem`, `color`, `short`; add one only when it recurs in at least
three Parts. `data/parts.yaml`: `id` (roman), `dir`, `slug`, `title`, `short`, `emblem`, `figs`, `lede`; the
order of the list is the reading order the linker uses for define-before-use.

## What the linker enforces

- A term mentioned anywhere must have exactly one definition on the site (error in a strict build).
- A mention on a page earlier in reading order than the definition is a warning: move the mention, or
  explain the idea in a plain sentence without the chip.
- Chips link to the definition automatically; renaming a term's home page id requires updating `home`.
