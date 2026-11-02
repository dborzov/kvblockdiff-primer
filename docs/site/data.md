# The YAML under data/

All of it is loaded by `lib/data.js` and checked by `node scripts/validate-data.mjs`. Files inside
`terms/`, `symbols/` and `notation/` are merged; an id defined twice is a build error.

| file | what | fields |
|---|---|---|
| `parts.yaml` | the Parts in reading (= dependency) order | `id` (Roman), `dir`, `slug`, `title`, `short`, `emblem`, `figs` (figure files loaded on every page of the Part), `lede` |
| `settings.yaml` | the two reference settings | `default`, `keys` (`name`, `unit`, `fmt`: int, bytes, pct, ms, gbps, gb, text), `settings.<id>` (`label`, `name`, `home`, `emblem`, `values` with every key; `null` = not measured) |
| `terms/core.yaml` | the glossary; project words and the cast | `label`, `name`, `cat` (info, coding, stats, linalg, numbers, systems, llm, project), `home` (page id), `short` (hover text; `$math$` and `` `code` `` allowed), optional `ref` (`{key}` template), and for brand terms `brand: true`, `nick`, `emblem` (a name in `theme/layouts/partials/emblems.njk`), `color: [light, dark]` |
| `terms/<slug>.yaml` | a Part's own terms | same fields; `home` must be a page of that Part |
| `symbols/core.yaml`, `symbols/<slug>.yaml` | math symbols; the id becomes the macro `\v<id>` | `tex`, `fam` (index, resource, count, frac, info, stat, object), `name`, `unit`, `short`, `home`, optional `ref` |
| `notation/core.yaml`, `notation/<slug>.yaml` | Python notation chips | `code`, `name`, `short`, optional `shape`, `bytes` (templates), `home` |
| `themes.yaml` | running themes | `title`, `emblem`, `color`, `short` |
| `banned-words.yaml` | the retired words | list of `match` (regex, case-insensitive) and `say` |

Rules: never add to `core.yaml` files from a Part task (use the Part's file); never create a second id for
an existing idea (`grep -rn "^id:" data/terms data/symbols data/notation`); brand terms are a decision for
the human (they need an emblem, a colour pair and a nickname); a symbol's letter must be free site-wide
(the notation page lists them all); `home` pages must exist (unknown notation homes only warn while the
page is being written).

Settings keys are referenced by `[[@key]]` in prose and `{key}` in `ref`/`shape`/`bytes` templates; adding
a key means adding it to every setting (use `null` where unmeasured). The pill in the top bar and the live
repaint are in `theme/assets/js/core.js`; the formatting in `lib/settings-fmt.js` (shared by build and
client).
