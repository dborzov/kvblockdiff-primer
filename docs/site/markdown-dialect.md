# The Markdown dialect

Standard Markdown (CommonMark + pipe tables), rendered by `lib/markdown.js`, plus the pieces below.

## Math

`$…$` inline, `$$…$$` display, rendered at build time with KaTeX. Every symbol is a macro from
`data/symbols/`: write `$\vrho$`, never `$\rho$`, so the symbol gets its family colour, hover reminder and a
row in the equation's automatic "What's in this equation" panel. Plain numbers and generic math
(`\log_2`, `\sum`, `\min`) need no macro.

```markdown
$$
\vH(\vX) = \sum_{\vi} \vp_{\vi} \underbrace{\log_2 \frac{1}{\vp_{\vi}}}_{\text{surprisal of outcome } \vi}
$$ {#eq-school-entropy}
```

Pitfalls: no `|` inside math in a table cell (use `\lvert x \rvert` or the `\vdsz`, `\vDsz` macros); no bare
`$` in prose (write "USD 5"); Euler's number is a plain `e` in a formula and should be named in the text
when the entry-size symbol `\ve` is nearby.

## Terms and references

| write | meaning |
|---|---|
| `[[id]]`, `[[id\|other words]]` | mention a glossary term (chip with hover reminder); custom text for plurals and inflections |
| `[[=id]]` | **the** definition of the term; exactly once on the whole site, on its home page |
| `::: define id [display name]` … `:::` | a definition box for an important term; it contains the `[[=id]]` itself |
| `[[#page-id]]`, `[[#page-id/section-id]]`, `[[#fig-x]]`, `[[#eq-x]]` | cross-references, labelled automatically ("II.4 Entropy", "Plate II.4·1", "Eq. II.4·2"); `[[#target\|custom text]]` |
| `[[@key]]` | a live rig number (`[[@e]]` → "640 B" on the Pin, "512 B" on the Bench); see `docs/project/rigs.md` |

Inside a table cell, write the bar of a custom-text link as `\|`. Chip a term the first time it appears in a
section and whenever the reminder genuinely helps, not at every occurrence.

## Components (`:::` blocks)

Markdown works inside a block. To nest, give the outer block more colons (`::::`).

| block | use |
|---|---|
| `::: takeaway [title]` | the end-of-section gist, 2–4 bullets; mandatory at the end of every `##` section |
| `::: note <kind> [title]` | a boxed aside in the flow; kinds: `intuition`, `example`, `toy`, `numbers`, `connection`, `practice`, `warning`, `key`, `history`, `metric`, `question`, `literature` |
| `::: aside <kind> [open] Title` | a collapsible margin sidebar (collapsed unless `open`); kinds: `reminder` (re-explains an earlier idea next to where it is needed), `detail` (a derivation), `aside`, `source` (receipts), `why` |
| `::: define id [name]` | definition box (above) |
| `::: figure fig-<id> <builder> [wide]` | an interactive figure; the body is the caption; `<builder>` is `FIG.<builder>` in the Part's figure file; `img=/assets/img/x.svg` instead of a builder for a static image |
| `::: keycard Eyebrow text` | a framed key result: one formula, one sentence |
| `::: try` | a numbered list of things to try on the figure above and what to notice |
| `::: pull` | the one sentence to remember (at most one per page) |
| `::: theme <theme-id> [title]` | a running-theme callout (`data/themes.yaml`); lists every other page with the same theme |
| `:::: compare Title` + `::: col A` … `:::` + `::: col B` … `:::` + `::::` | two things side by side with a "vs" medallion |
| `:::: cols` + `::: col Title` … | 2–3 cards side by side |

## Code

Fenced blocks with a language and an optional caption after it:

````markdown
```python one decode step of the toy LLM
def decode_step(...):
    ...
```
````

Languages: `python`, `json`, `bash`, `js`, `text`. Python listings are short, runnable numpy that computes
exactly what the page computes; tensor slices follow the index names of `docs/project/notation.md`.

## Concept graphs

A fenced block with language `graph` and a YAML body: `id`, `columns`, `nodes` (`id`, `col`, `row`, `title`,
`text`, `link` to a page id or `page-id/section-id`, and `term` or `cat` or `color` for the card's look),
`edges` (`[from, to, "two-word label"]`). Keep labels to two or three words.

## Front matter

See `docs/site/page-anatomy.md`. YAML pitfall: any string with a backslash (TeX) must be in single quotes
or a block scalar; double quotes eat backslashes.
