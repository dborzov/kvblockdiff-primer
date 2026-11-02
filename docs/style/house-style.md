# House style

The site exists because the first draft of the idea was a wall of undefined jargon. These rules are the
cure, in order of importance. Checklist form: `docs/workflows/done-checklist.md`.

1. **Define before use, every term, symbol and abbreviation.** A word with a special meaning here is a
   glossary term: define it once (`[[=id]]` or `::: define id`) on its home page, mention it afterwards with
   `[[id]]`. Never use a term before the page that defines it (the linker warns); if an idea from a later Part
   is needed, say it in one plain sentence instead.
2. **Introduce a word through code on real shapes.** The definition of a project word sits next to the
   Python expression that computes it on the Bench's tensors, and later pages reuse the expression
   (`docs/project/notation.md`). A reader who has seen `V[:, l, h, 23]` once never needs "channel" explained again.
3. **One idea per page, and short pages.** 500–1200 words, one to three `##` sections, at least one figure,
   table, worked example or listing. Long material becomes more pages. Coming back to an idea from a new
   angle, with a link back, is good.
4. **Example first, then the rule, then the example again.** Open with a hook: a concrete situation, a toy,
   a surprising number, a question. Show the thing before naming it.
5. **Pop-science voice, plain sentences.** Curious, warm, concrete. Short sentences, active voice, one fact
   per sentence. Metaphors are welcome when they carry the logic (the desk and the archive, the apple and the
   tree). No mannered tics ("not X, but Y", "it's worth noting", colon-then-reveal), no filler, no hype.
6. **Our words, not the papers' words.** Retell every outside idea in this site's vocabulary; translate a
   paper's "channel", "token-wise", "group", "page", "frame" into our defined words or define them first.
   Never paste abstract phrasing.
7. **Honest and sceptical.** Mark assumptions, illustrative numbers, toy data and unverified results as
   such. Say where an argument is thin, where a paper is vague, where a result might not transfer. Negative
   results are results. Every outside number has a receipt (`::: aside source Receipts`).
8. **Connections are the point.** When an idea echoes another, say so and link it. Put two things of one
   family side by side (`::: compare`); the difference is often the clearest definition of each. Mark
   recurring ideas with `::: theme`.
9. **Break the wall of text.** Lists, numbered steps, tables, notes, pull quotes, sidebars, compare blocks,
   keycards. A paragraph longer than about six lines is a smell.
10. **Every `##` section ends with a `::: takeaway`** of two to four bullets.
11. **Every page has flashcards**, at least one per section, multiple choice with three plausible decoys
    and a one-line `why`.
12. **Every equation and every figure explains itself.** Symbol macros so the legend builds itself;
    `\underbrace` on the parts that matter; general formula, then the rig's numbers. Captions say what is on
    each axis with units, what each mark and colour means, how the numbers were computed, what the
    controls do; a `::: try` list follows an interactive figure when there is something to discover.

## Register notes

- The site is **the primer**; Parts I–X are **the proposal** (written before data); XI **the measurements**;
  XII **the design**. The author is **Dima**.
- Write for two readers at once: a curious human and an AI agent that will reason with these words later.
  Both are served by the same thing, an unambiguous word tied to a concrete expression.
- Numbers in prose: say the rig, or make the number live (`docs/project/rigs.md`).
