# The Markdown dialect

Standard Markdown (CommonMark + pipe tables), implemented in `lib/markdown.js`, plus the extensions below.
Pages are `content/<NN-part>/<NN-page>.md`; a page's id is `<part slug>-<file name without number>`;
its URL is `/<slug>/<name>/`. Front matter: `title`, `nav` (short sidebar title), `lede`, `group`
(sidebar sub-heading), `figs` (extra figure files), `cards` (flashcards, see `flashcards.md`).

YAML pitfalls: a front-matter string with a backslash (any TeX) must be in **single quotes** or a `>-`
block; a string containing `: ` must be quoted (`scripts/fix-frontmatter-quotes.py` does it).

## Terms: `[[id]]`, `[[=id]]`, `::: define id`

- Every term lives in `data/terms/*.yaml` with a `home` page. `[[=id]]` is THE definition (exactly once,
  on the home page); `[[id]]` a mention with a hover reminder; `[[id|other words]]` a mention with custom
  text (plurals: `[[cherry|cherries]]`). `::: define id` makes a definition box containing the `[[=id]]`
  (write a short list inside: what it is, an example, what it is easy to confuse with).
- Chip the first mention in a section and wherever the reminder helps; not every occurrence.
- Inside a table cell, write the bar as `\|`: `[[#papers-kivi\|KIVI]]`.

## Symbols: `$\vx$`

- Every math symbol is in `data/symbols/*.yaml`; the macro is `\v` + id (`\ve`, `\vrho`, `\vxshare`).
  Symbols are coloured by family and get a hover reminder; a display equation gets an automatic "What's
  in this equation" panel. One letter, one meaning: check before you use a letter.
- `$…$` inline, `$$ … $$ {#eq-id}` display with an id. Annotate with `\underbrace{…}_{\text{meaning}}`.
  No `|` inside math in a table cell (use `\lvert x \rvert` or the `\vdsz`, `\vDsz` macros). No bare `$`
  in prose (write "USD 5").

## Python notation chips: `[[~id]]`

- An inline Python expression in monospace with a hover reminder showing its name, meaning, `.shape` and
  bytes in each reference setting, and where it is introduced: `[[~v-one-head]]` →
  `v[token_pos_id, layer_id, head_id, :]`. Entries live in `data/notation/*.yaml` (fields: `code`, `name`,
  `short`, optional `shape`, `bytes` as `{key}` templates, optional `home`).
- `[[~id|other code]]` shows other code (plain text, keeps its own brackets); in a table cell the bar is
  `\|`. Chip the first mention in a section and wherever the shape or bytes matter; plain `` `code` ``
  otherwise. Every entry is listed on the notation reference page.

## Cross-references: `[[#id]]`

- `[[#page-id]]` → a link labelled with the page's number and title; `[[#page-id/section-id]]` → a
  section; `[[#fig-id]]`, `[[#eq-id]]` → a figure or equation ("Plate IV.3·1", "Eq. IV.7·2");
  `[[#target|custom text]]`. Give ids to what you link to: `## Heading {#id}`, `$$…$$ {#eq-id}`,
  `::: figure fig-id …`. Figure and equation ids are unique site-wide: prefix them with the Part slug.

## Reference settings: `[[@key]]` and `ref:`

- Two frozen settings in `data/settings.yaml` (the Pin, the Bench); a pill in the top bar switches.
  `[[@e]]` renders a key's value for the current setting and repaints on switch ("640 B" / "512 B"). Use
  it only where the sentence is true for every setting; never inside a worked computation whose other
  numbers are typed. A `null` key renders "not measured".
- Terms, symbols and notation entries may carry `ref:` / `shape:` / `bytes:` templates with `{key}`
  placeholders; the hover shows them per setting.

## Components (`:::` blocks)

Markdown works inside; nest by giving the outer block more colons.

| block | use |
|---|---|
| `::: takeaway [title]` | 2–4 bullets closing every `##` section (mandatory) |
| `::: note <kind> [title]` | a boxed aside in the flow; kinds: intuition, example, toy, numbers, connection, practice, warning, key, history, metric, question, literature |
| `::: aside <kind> [open] Title` | a collapsible margin sidebar; kinds: reminder, detail, aside, source, why. `source` holds receipts (the word checker skips it) |
| `::: define <term-id> [display name]` | the definition box of a term |
| `::: figure fig-<id> <builder> [wide]` | an interactive figure (`FIG.<builder>` in a loaded figure file); the content is the caption; `img=/assets/img/x.svg` for a static image |
| `::: keycard Eyebrow` | a framed key result |
| `::: try` | things to try after a figure |
| `::: pull` | a pull quote; not used on new pages (`docs/style/writing.md` §4), kept for old ones |
| `::: theme <theme-id> [title]` | a running-theme callout (`data/themes.yaml`); it lists every other page with the same theme |
| `:::: compare Title` + `::: col A` … `:::` + `::: col B` … `:::` + `::::` | two things side by side |
| `:::: cols` + `::: col Title` … | 2–3 cards side by side |

## Code and graphs

- Fenced code with an optional caption after the language: ```` ```python one decode step ````.
  Languages: python, json, bash, js, text. Python is short, runnable numpy computing what the page says.
- A fenced block with language `graph` and a YAML body (`id`, `columns`, `nodes` with `col`, `row`,
  `title`, `text`, `link` (page id), `term` (for emblem and colour), `edges`) renders a concept graph.
