# Authoring guide

How to write and change pages of this site. Read sections 1–3 before writing anything; keep
section 4 (the Markdown dialect) open while writing. Figures have their own guide:
[`docs/figures.md`](figures.md). Flashcards: [`docs/flashcards.md`](flashcards.md).

## 0. Where things live

| folder | what it holds | who edits it |
|---|---|---|
| `content/` | the prose: one Markdown file per page, in Part folders (`02-school/04-entropy.md`) | writers |
| `data/terms/*.yaml` | the glossary: every defined term, its reminder text, its emblem and colour | writers (add to your own file) |
| `data/symbols/*.yaml` | the notation: every math symbol, its family colour and meaning | writers (add to your own file) |
| `data/themes.yaml`, `data/parts.yaml` | running themes; the list of Parts | rarely |
| `figures/<part>.js` (+ `.css`) | interactive figures of one Part | writers |
| `figures/data/` | JSON data files that figures load | writers / analysis scripts |
| `analysis/` | Python scripts that produce figure data (reproducible) | writers |
| `theme/` | layouts, CSS, the client-side engine — the presentation | maintainers only |
| `lib/` | the Markdown dialect, the linker | maintainers only |

Pages are ordered by their numeric prefix: `content/02-school/04-entropy.md` is page **II.4**, its
URL is `/school/entropy/`, its **page id** is `school-entropy` (`<part slug>-<file name without the number>`).
Cross-references use page ids, so **renaming a file renames its id** — grep for the old id first.

## 1. Build, preview, check

```bash
npm install                       # once
npm run build                     # full site into _site/ (linker report in .cache/)
npm run serve                     # live preview at http://localhost:8080/kvblockdiff-primer/
node scripts/validate-data.mjs    # quick check of the YAML in data/
node scripts/check.mjs _site --shots          # headless test of every page + screenshots in .cache/shots
node scripts/check.mjs _site --pages school/entropy,school/surprise --shots
STRICT=1 npm run build            # fail on any broken reference or undefined term (CI does this)
```

While several people write at once, build only your own Part into your own folder, so a half-written
page elsewhere cannot break your build:

```bash
ONLY=03-landscape npx @11ty/eleventy --output=/tmp/site-landscape
node scripts/check.mjs /tmp/site-landscape --pages landscape/attention --shots --out /tmp/shots-landscape
node scripts/serve.mjs /tmp/site-landscape 8123      # look at it in a browser
```

The linker prints a summary and writes every problem to `.cache/linker-report-<output folder>.txt`.
In a partial build, references to pages outside your Part show up as warnings; everything else must be clean.

## 2. House style — how a page should read

This site exists because the first draft was a wall of terse, undefined jargon. The cure, in order of importance:

1. **Define before use. Every term, every symbol, every abbreviation.** If a word has a special meaning
   here, it is a glossary term: define it once with `[[=id]]` or `::: define id`, mention it afterwards
   with `[[id]]`. Never use a term before the page that defines it (the linker warns). If you need an
   idea from a later Part, explain it in one plain sentence instead.
2. **One idea per page, and short pages.** A page is a chewable snack: 500–1200 words, one to three
   `##` sections, at least one figure, table, worked example or code snippet. Long material becomes
   more pages, not longer ones. It is fine — good — to come back to an idea on another page, from a
   new angle, with a link back.
3. **Example first, then the general rule.** Open with a hook: a concrete situation, a toy, a surprising
   number, a question. *Show* the thing (a JSON snippet, a table of numbers, a plot) before naming it.
   Then give the rule, then come back to the example with the rule in hand.
4. **Pop-science voice, plain sentences.** Write like a good science blog: curious, warm, concrete.
   Short sentences, active voice, one fact per sentence. Metaphors are welcome when they carry the
   logic (the desk and the archive, the apple and the tree). No mannered tics ("not X, but Y",
   "it's worth noting", colon-then-reveal), no filler, no hype.
5. **Our words, not the papers' words.** Retell every outside idea in the vocabulary of this site.
   A paper's "channel", "token-wise", "group", "outlier" or "page" must be translated into our defined
   terms (or defined properly first). Never paste a paper's abstract phrasing.
6. **Honest and sceptical.** Mark assumptions as assumptions and illustrative numbers as illustrative.
   Say where an argument is thin, where a paper is vague, where a result might not transfer. Negative
   results are results.
7. **Connections are the point.** When an idea echoes another one, say so explicitly and link it.
   When two things belong to one family but differ, put them side by side (`::: compare`) — the
   difference is often the clearest definition of each. Call out recurring ideas with `::: theme`.
8. **Break the wall of text.** Lists (nested when the content is nested), numbered steps, tables,
   notes, pull quotes, sidebars, compare blocks, keycards. A paragraph longer than ~6 lines is a smell.
9. **Every `##` section ends with a `::: takeaway`** — 2–4 bullets, the gist a reader should keep.
10. **Every page has flashcards** in its front matter, at least one per section (`sec:` = the section id),
    multiple choice with plausible wrong answers and a one-line `why`.
11. **Every equation explains itself.** Use the symbol macros (`\ve`, `\vrho`, …) so every symbol is
    coloured and appears in the automatic "what's in this equation" panel. Annotate the parts that
    matter with `\underbrace{…}_{\text{what it means}}`. Write the general formula, then plug in the
    numbers of the running example. When a formula re-uses something defined pages ago, add an
    `::: aside reminder` next to it.
12. **Every figure explains itself.** The caption says what is on each axis (with units), what each mark
    and colour means, how the numbers were computed, and what the controls do. Interactive figures are
    followed by a short `::: try` list when there is something to discover.

### Page anatomy

```markdown
---
title: Surprise                       # the page title (short; it is the h1)
nav: Surprise                         # optional shorter title for the sidebar
lede: One or two sentences that say what this page is about. May use $math$ and [[terms]].
group: Information                    # optional: a sub-heading in the sidebar for this run of pages
figs: [school]                        # optional: figure files to load (default: the Part's own)
vendor: [pako.min.js]                 # optional: extra vendored scripts (in theme/assets/vendor)
cards:
  - q: 'What is the surprisal of an outcome with probability $\vp = 1/8$?'
    a: 3 bits
    wrong: ["8 bits", "1/8 of a bit", "0.125 bits"]
    why: 'Surprisal is $-\log_2 \vp$, and $-\log_2(1/8) = 3$.'
    sec: surprisal
---

An opening hook paragraph (no heading)…

## First idea {#first-idea}
…
::: takeaway
- …
:::
```

**YAML pitfall:** in front matter, a string with a backslash (any TeX) must be in **single quotes**
or a block scalar (`>-`). In double quotes YAML eats backslashes (`"\vp"` becomes a vertical tab + `p`).
Quote any string that contains `: ` or starts with `[`, `{`, `*`, `&`, `!`, `%`, `@` or a backtick.

## 3. Terms, symbols, references

### Glossary terms

- Every term lives in `data/terms/*.yaml`. Core terms are in `core.yaml` with their **home page**
  (where they must be defined). Writers add new terms only in their own file `data/terms/<part-slug>.yaml`.
  Before adding, `grep -rn "^<id>:" data/terms/` — never create a second id for an existing idea.
- Fields: `label` (chip text), `name` (full name), `cat` (`info`, `coding`, `stats`, `linalg`,
  `numbers`, `systems`, `llm`, `project`), `home` (page id), `short` (the hover reminder: 1–2 plain
  sentences that make sense on their own, may use `$math$`). Use `short: >-` block style.
- **Signature (brand) terms** add `brand: true`, `nick` ("the Compass"), `emblem` (a name from
  `theme/layouts/partials/emblems.njk`) and `color: ["#light", "#dark"]`. Reserve them for the cast:
  the properties, the dictionary types, the scopes, the system parts. Ask before adding one.
- In text: `[[=id]]` defines (exactly once on the whole site, on its home page), `[[id]]` mentions,
  `[[id|other words]]` mentions with custom text (plurals: `[[dictionary|dictionaries]]`).
  `::: define id` makes a full definition box (for important terms) — it contains the `[[=id]]` itself.
- Do not chip every occurrence. Chip a term the first time it appears in a section, and whenever the
  reminder would genuinely help.

### Symbols (notation)

- Every symbol is in `data/symbols/*.yaml` with one meaning for the whole site, a family (colour) and a
  home page. In math, write the macro: `$\ve$` not `$e$`, `$\vrho$` not `$\rho$`, `$\vE_{\vl,\vt}$`.
  The macro name is `\v` + the id.
- Families: `index` (positions: $t, l, c, j, \Delta$), `resource` (bytes, seconds, bandwidth),
  `count` (counts and knobs), `frac` (fractions and probabilities), `info` (bits), `stat`
  (statistics of numbers), `object` (vectors, sets, dictionaries).
- **One letter, one meaning.** Before you use a letter, check `data/symbols/` (and the notation page).
  If the letter is taken, pick another. New symbols go in `data/symbols/<part-slug>.yaml`.
  A toy example may use throwaway letters (e.g. $a, b$ in a two-number example) **only** if you say what
  they are right there and they do not leak out of the example.
- Plain numbers and generic math (`\log_2`, `\sum`, `\min`) need no macros.

### Cross-references

- `[[#page-id]]` → a link labelled with the page's number and title ("II.4 Entropy").
- `[[#page-id/section-id]]` → a section of a page; `[[#fig-xyz]]`, `[[#eq-xyz]]` → a figure or equation
  ("Plate II.4·1", "Eq. II.4·2"). `[[#target|custom text]]` for your own wording.
- Give ids to the things you link to: `## Heading {#my-id}`, `$$ … $$ {#eq-my-id}`, `::: figure fig-my-id …`.
  Figure and equation ids must be unique across the whole site — prefix them with your topic.
- The linker resolves and checks all of them after every build.

## 4. The Markdown dialect

Standard Markdown (CommonMark + pipe tables) plus:

**Math** — rendered at build time with KaTeX; symbols coloured by family.

```markdown
Inline: the delta is $\vdsz = \vrho\,\ve$ bytes.

$$
\vH(\vX) = \sum_{\vi} \vp_{\vi} \underbrace{\log_2 \frac{1}{\vp_{\vi}}}_{\text{surprisal of outcome } \vi}
$$ {#eq-entropy}
```

A display equation automatically gets a collapsible "What's in this equation" panel listing every
symbol macro it uses. Do not put `|` inside math in a table cell (it splits the cell): use `\lvert x \rvert`
or the macros `\vdsz`, `\vDsz`. Inside a table cell, write the bar of a link with custom text as
`\|`: `[[#papers-kivi\|KIVI]]`, `[[dictionary\|dictionaries]]`. Avoid a bare `$` in prose (write "USD 5").

**Components** (`:::` blocks). Inside a block, Markdown works as usual. To nest blocks, give the
outer one more colons.

| block | use it for |
|---|---|
| `::: takeaway Optional title` | the end-of-section gist (2–4 bullets). Mandatory at the end of every `##` section. |
| `::: note <kind> Optional title` | a boxed aside in the flow. Kinds: `intuition`, `example`, `toy`, `numbers`, `connection`, `practice`, `warning`, `key`, `history`, `metric`, `question`, `literature`. |
| `::: aside <kind> Title` | a collapsible margin sidebar (collapsed by default; `::: aside reminder open Title` starts open). Kinds: `reminder` (re-explains something defined earlier, placed next to where it is needed), `detail` (a derivation), `aside`, `source`, `why`. Place it right before the paragraph, equation or figure it supports. |
| `::: define <term-id> [display name]` | a definition box for an important term (contains the term's one `[[=id]]`). Put a short list inside: what it is, an example, what it is easy to confuse with. |
| `::: figure fig-<id> <builder> [wide]` | an interactive figure; the block's content is the caption. `<builder>` is `FIG.<builder>` in your Part's figures file. `img=/assets/img/x.svg` instead of a builder for a static image. `wide` lets it break out of the column. |
| `::: keycard Eyebrow text` | a framed key result: one big formula + one sentence of meaning. |
| `::: try` | "things to try" after an interactive figure: a numbered list of actions and what to notice. |
| `::: pull` | a pull quote — the one sentence to remember from the page (at most one per page). |
| `::: theme <theme-id> [title]` | a running-theme callout (ids in `data/themes.yaml`). It automatically lists every other page where the same theme appears. Use it where the theme genuinely shows up, a sentence or two on how it shows up *here*. |
| `:::: compare Title` + `::: col A` … `:::` + `::: col B` … `:::` + `::::` | two things side by side with a "vs" medallion — for contrasts that define both sides. |
| `:::: cols` + `::: col Title` … | 2–3 cards side by side. |

**Code** — fenced blocks get syntax highlighting and an optional caption after the language:

````markdown
```python one decode step of a toy transformer
def decode_step(token, pos, keys, values):
    ...
```
````

Languages: `python`, `json`, `bash`, `js`, `text`. Python snippets should be short, runnable numpy,
computing exactly what the page computes.

**Concept graphs** — a fenced block with language `graph` and a YAML body:

````markdown
```graph
id: my-map
columns: [Information, Coding, Machines]
nodes:
  - {id: a, col: 1, row: 1, title: "Entropy", text: "Average surprise.", link: school-entropy, term: entropy}
  - {id: b, col: 2, row: 1, title: "Huffman", text: "…", link: school-codes, term: huffman}
edges:
  - [a, b, "optional short label"]
```
````

`link` is a page id (or `page-id/section-id`); `term` gives the card its emblem and colour
(or set `cat:` or `color:`). Keep edge labels to two or three words, and only where they add meaning.

## 5. Figures (summary — the full guide is `docs/figures.md`)

- One file per Part: `figures/<part>.js`, registering builders: `FIG.myFigure = (host, figure) => { … }`.
  Optional styles in `figures/<part>.css` (tokens only, prefix every class).
- Use the plot kit (`Plot`, `line`, `bars`, `slider`, `readout`, `tex`, …). Colours only via CSS variables.
- Toy data comes from seeded generators, so the numbers in the prose match the figure every time.
  Heavier data (Monte Carlo results) is produced by a script in `analysis/` into `figures/data/*.json`,
  and the figure fetches it: `fetch(KV.prefix + 'assets/figs/data/x.json')`.
- Every number you quote in prose must be what the figure shows. If you change the generator, re-check the prose.

## 6. Before you call a page done

- [ ] Every term and symbol is defined before use (linker: no "used before its definition" warnings for your pages).
- [ ] No term or letter means two things; no paper jargon left untranslated.
- [ ] Opens with an example or a hook; one idea; short; no paragraph longer than ~6 lines.
- [ ] Each `##` section ends with a takeaway; each section has at least one flashcard.
- [ ] Equations use symbol macros; key ones annotated; reminders where a reader might have forgotten something.
- [ ] Figures: caption with axes/units/method/controls; numbers in prose match the figure.
- [ ] `node scripts/check.mjs <your output> --pages … --shots` passes at desktop and phone width, and the
      screenshots look right (look at them!).
