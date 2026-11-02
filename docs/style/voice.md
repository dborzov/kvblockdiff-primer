# House style: how a page should read

The site exists because the first draft of the idea was a wall of terse, undefined jargon, and because the
second draft drifted into twelve Parts that used four words for one thing. The cure, in order of
importance. The dialect that implements it is in `docs/site/dialect.md`; the words are in
`docs/style/terminology.md`; how the prose inside a page argues (facts before conclusions, simple sentences,
the writing tropes to avoid) is in `docs/style/writing.md`, which wins where the two disagree.

## 1. Define before use, and bundle every term with its Python form

Every term, every symbol, every abbreviation. If a word has a special meaning here, it is a glossary term:
define it once with `[[=id]]` or `::: define id`, mention it afterwards with `[[id]]`. Never use a term
before the page that defines it (the linker warns; the Parts are in dependency order). If you need an idea
from a later Part, explain it in one plain sentence instead.

A term that has a Python form gets it on the same line the first time: "one cherry, `cherry[i]`, of shape
`(2, 256)`". Use a notation chip `[[~id]]` where the reader would want the shape or the bytes on hover.
Introduce the thing inside the listing that uses it, then name it: show `k[layer_id].append(key)` growing,
then say "this growing store is the orchard".

## 2. One idea per page, and short pages

A page is a chewable snack: 500–1200 words, one to three `##` sections, at least one figure, table, worked
example or listing. Long material becomes more pages, not longer ones. It is fine, good, to come back to an
idea on another page, from a new angle, with a link back.

## 3. Example first, then the rule, then the example again

Open with a hook: a concrete situation, a toy, a surprising number, a question. Show the thing (a JSON
snippet, a table of numbers, a tensor with its shape) before naming it. Then give the rule. Then come back
to the example with the rule in hand. Every equation is followed by the same equation with the numbers of a
reference setting plugged in.

## 4. Plain sentences, warm voice

Write like a good science blog: curious, concrete, short sentences, active voice, one fact per sentence.
The project's named terms (the cherry, the punnet, the leash) and the toy worlds (the desk and the archive) are
the only metaphors; an explanatory metaphor standing in for an argument is not allowed (`writing.md` §2).
No mannered tics: no "not X, but Y", no "it's worth noting", no colon-then-reveal, no em-dashes, no filler,
no hype, no slogans (`writing.md` §3). No "we" that means the reader and the writer at once; "we" is the project.

## 5. Our words, not the papers' words, not the campaigns' words

Retell every outside idea in this site's vocabulary. A paper's "channel", "token-wise", "group", "page",
"entry" or "block" is translated into our terms on first contact, and each paper page ends with a
their-words-to-ours table. The experiment repository's words (entry split, read budget, elephant line) are
translated the same way; its receipts (trial ids, track names) are quoted verbatim inside `::: aside source`
blocks, which the word checker skips.

## 6. Mark assumptions; state grades

Mark assumptions as assumptions and illustrative numbers as illustrative. Say where an argument is thin,
where a paper is vague, where a result might not transfer. A number from a paper is "their measurement";
a number from the campaigns carries its grade (verified, quick, code-length estimate, bound). Negative
results are results. A measurement is a result.

## 7. Connections are the point

When an idea echoes another one, say so and link it. When two things belong to one family but differ, put
them side by side (`::: compare`); the difference is often the clearest definition of each. Call out the
recurring ideas with `::: theme`. Every hypothesis page links to its verdict; every measurement page links
to the hypothesis it tests; every toolbox page links to the campaign result that used the stage.

## 8. Break the wall of text

Lists (nested when the content is nested), numbered steps, tables, notes, sidebars, compare blocks,
keycards. Pull quotes are no longer used on new pages (`writing.md` §4). A paragraph longer than about six lines is a smell.

## 9. Every `##` section ends with a `::: takeaway`

Two to four bullets listing the concrete facts and numbers the section established, after the facts, never
a slogan about them (`writing.md` §1).

## 10. Every page has flashcards

In its front matter, at least one per section (`sec:` = the section id), multiple choice with plausible
wrong answers and a one-line `why`.

## 11. Every equation explains itself

Use the symbol macros (`\ve`, `\vrho`, …) so every symbol is coloured and appears in the automatic
"what's in this equation" panel. Annotate the parts that matter with `\underbrace{…}_{\text{what it
means}}`. Write the general formula, then plug in the numbers of a reference setting. When a formula reuses
something defined pages ago, add an `::: aside reminder` next to it.

## 12. Every figure explains itself

The caption says what is on each axis (with units), what each mark and colour means, how the numbers were
computed, and what the controls do. Interactive figures are followed by a short `::: try` list when there is
something to discover. Every UI label inside a figure uses the site's words.

## 13. Brand terms

The cast (brand terms with an emblem, a colour and a nickname) is reserved for the objects of the scenario
and the application, the hypotheses, the stage families and the two reference settings. Adding one is a
decision for the human; propose it with the emblem and the nickname.

## Before a page is done

- [ ] Every term and symbol is defined before use; no linker warning for the page.
- [ ] `npm run check:words content/<part>/<page>.md` is clean.
- [ ] No term or letter means two things; no paper or campaign jargon left untranslated.
- [ ] Opens with an example or a hook; one idea; short; no paragraph longer than about six lines.
- [ ] Each `##` section ends with a takeaway; each section has at least one flashcard.
- [ ] Equations use symbol macros; key ones annotated; reminders where a reader might have forgotten something.
- [ ] Figures: caption with axes/units/method/controls; numbers in prose match the figure.
- [ ] Cross-references use the ids of `docs/project/page-plan.md`; `[[#id]]` for pages, `[[#id/section]]` for sections.
- [ ] The page's numbers trace to `docs/project/numbers.md` or to a receipt in an `::: aside source`.
