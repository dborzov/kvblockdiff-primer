# docs/: the catalog

Short files, each for one purpose, so that an agent loads only what its task needs. Start from
`AGENTS.md` at the repository root. The site itself (built from `content/`) is the reader-facing source of
truth; these documents are about *working on it*.

## By task

| you want to | read |
|---|---|
| understand what kvblockdiff is, in one screen | `project/overview.md` |
| use or coin a term; know which words are banned and why | `style/terminology.md` |
| write or review prose | `style/voice.md`, then `site/dialect.md` |
| quote a Python expression, a shape, an axis name | `project/notation.md` |
| reason about the compression problem (contract, score, leash, scope) | `project/scenario.md` |
| see how the project's bill splits into subproblems (scenario, pick trace, replay, decoder speed, economics) | `project/subproblems.md` |
| find a page id, a page's scope, which page defines a term | `project/page-plan.md` |
| quote a number (settings, campaign results, derived numbers) | `project/numbers.md` |
| build, preview, run the checks, fix a linker error | `site/build.md` |
| add, change or validate a term, symbol, notation entry, setting, theme | `site/data.md` |
| write or fix an interactive figure | `site/figures.md` |
| write or fix flashcards | `site/flashcards.md` |
| change the engine (Markdown dialect, linker, layouts, popovers) | `site/engine.md` |
| deploy; understand the CI workflow | `site/deploy.md` |
| add a page | `tasks/add-a-page.md` |
| add a term, symbol or notation entry | `tasks/add-a-term.md` |
| add a paper page | `papers/template.md`, then `tasks/add-a-paper.md` |
| bring new numbers from the experiments repository onto the site | `tasks/update-numbers.md` |
| review a Part for vocabulary, links and style | `tasks/review-a-part.md` |
| write a whole Part (the brief the 2026-11 writers used) | `project/writer-brief.md` |
| read the experiments repository (`kv-compress-roofline`) | `experiments/kv-compress-roofline.md`, then `../experiment_repos/kv-compress-roofline/README.md` |

## The tree

```
docs/
  README.md                 this catalog
  project/
    overview.md             what the project is, the Parts, the status (one screen)
    scenario.md             the compression scenario: the dense statement every page must agree with
    subproblems.md          the project's bill and its five subproblems, each stated densely
    notation.md             the Python forms: index names, the canonical listings
    page-plan.md            every page: id, title, scope, defines, source
    numbers.md              the pinned numbers and where each comes from
    writer-brief.md         the brief for writing or rewriting a Part
  style/
    terminology.md          the vocabulary (the rule), banned words, translation tables
    voice.md                house style and the done-checklist
  site/
    build.md                commands, partial builds, the checks and what they report
    dialect.md              the Markdown dialect: terms, symbols, notation chips, settings, components
    data.md                 the YAML under data/: files, fields, validation
    figures.md              the figure API and cookbook
    flashcards.md           flashcards: format, ids, practice
    engine.md               how a page becomes HTML: lib/, theme/, eleventy.config.js, the linker
    deploy.md               GitHub Pages workflow and its caveats
  tasks/
    add-a-page.md
    add-a-term.md
    add-a-paper.md
    update-numbers.md
    review-a-part.md
  papers/
    template.md             the structure of a paper page and the trust rule
  experiments/
    kv-compress-roofline.md how this site uses the experiments repository
  plans/
    history/                specifications of past builds (kept for the record)
```
