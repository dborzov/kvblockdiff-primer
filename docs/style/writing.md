# Writing clearly: the standing guide for new and rewritten pages

This guide applies to every future writing, editing and rewriting pass on the site and the docs. The
pages written in the November 2026 rework were not all written to it; do not rewrite them for its sake,
but bring any page you touch up to it. The house style (`voice.md`) defines the page anatomy; this file
defines how the prose inside it argues. Where the two disagree, this file wins.

## 1. The goal of the writing

The writing is here to inform. It states specific facts about a mathematical or engineering topic, in
the order of the logical chain that connects them, so clearly that the reader can follow the chain and
reach the conclusion on their own. It is not here to persuade, to sound good, to be memorable, or to
summarise.

That goal decides everything below:

1. Present the facts, the example and the argument first; the conclusion comes after them, where the
   reader can check it against what they have just read. A conclusion stated before its facts is a
   slogan the reader cannot yet evaluate. The end of a section or a chapter is a fine place for the
   conclusion.
2. State each mathematical fact in precise, specific, concrete language, with the context it needs
   (which tensor, which scenario, which setting, which grade), and finish the sentence.
3. Let the content carry the big picture. A clear argument with its numbers conveys the large-scale
   point better than any phrase written to convey it.
4. Never reduce a nuanced argument to a one-line formulation. Shortness makes it vague, and vague
   makes it wrong. If an argument, property or observation must be referred to later, name it as a
   term (`terminology.md` §5) and refer to it by that name.

## 2. Sentences and paragraphs

- Normal, full English sentences, as simple as they can be while using the right term. Think of
  roughly four fifths of the way to ASD-STE100 (Simplified Technical English): one idea per sentence,
  active voice, concrete nouns, no stacked clauses. Not the spec itself; its direction.
- Follow Zinsser's *On Writing Well*: cut every word that does no work; prefer the plain word; do not
  decorate.
- No dense paragraphs of run-on sentences. Prefer short sentences, numbered lists, nested lists, and
  frequent new lines. A list of facts is a list, not a paragraph that hides them.
- Prefer numbered lists for anything with an order or that will be referred to; nested lists for
  anything with structure.
- When entities have a non-trivial graph of relations, draw the graph (the `graph` block or a
  figure) instead of describing it in prose.
- When describing how something works, a short Python listing with a toy input and its output is
  almost always clearer than words; use it, and keep it runnable (`notation.md`).
- Section titles say what the section is about to someone who has not read it: "How the leash is
  measured for every cherry", not "The rule" and not "What the leash says".
- Say the thing itself. A metaphor is allowed only where it is one of the project's named terms with
  a defined meaning (a cherry, a punnet, the leash: `philosophy.md` §2), or where the image carries
  the structure and is explained at once. An explanatory metaphor that stands in for an argument is
  not allowed.
- No catchphrases, no punchlines, no summaries written to sound good. Takeaway blocks list the
  concrete facts and numbers the section established, not slogans about them.

## 3. Writing tropes to avoid, and why each is bad

These are patterns of poor AI-generated technical prose. They share one cause: the writer is trying to
make the text pretty, punchy or persuasive, with the devices of a presentation or a sales pitch, instead of
stating the facts. Each is listed with examples and the specific way it fails the goal of §1. An advisory checker finds the mechanical ones:
`npm run check:tropes [paths…]` (rules in `data/writing-tropes.yaml`; it reports, it does not fail
a build; judgement decides).

1. **The catchphrase of counted things.** "One spectral filter, two notations"; "Two ICs answer two
   questions." It mimics a presentation-title style, tells the reader nothing about the content, and
   often forces a false symmetry on the material.
2. **The purchasing and billing metaphor.** "What the linear component buys"; "how much GLS
   buys"; "what label-dependent weights can buy"; "the information purchased by smoothness"; "the
   zero atom prices hidden signal"; and the whole family of billing language: "the dictionary foots
   the bill", "every helper charges a tax", "the room's rent is split among the guests", "a stage
   earns its keep", "the dictionary pays for itself", "the receiver pays in bits", "the price of a
   wrong table". Why it is bad: the image replaces the actual relation (an inequality, a difference of
   two rates, a count of bytes) with a transaction the reader has to interpret, and the interpretation
   is ambiguous: paid by whom, to whom, once or per use, in which unit, reversibly or not. It also
   smuggles in a judgement (worth it, not worth it) before the numbers are on the page. On this site
   the collision is worse, because cost, tax, bill, pay and price have *literal* meanings here: bits per
   element, bytes on the link, dollars per million tokens, and the defined terms *the bill* and
   *per-cherry tax*. Use those words only in their literal or defined sense, and never as a figure of
   speech. Write the relation instead: "the delta share falls from 0.733 to 0.610 when the dictionary
   share rises from 0.02 to 0.10"; "a dictionary of weight 2 150 is amortised over 4 096 cherries, so
   it adds 4.2 bits per element to the rate".
3. **Arguing with no one.** "That is not an omission"; "the difference is not a contradiction"; "the
   answer is about a joint spectrum, not the condition number of one matrix", when nobody raised the
   objection. It is filler that imitates argument. A contrast is legitimate only when the
   counterpoint arises naturally in that context and the distinction does work there; then state the
   counterpoint as a fact and why it does not apply.
4. **The one-sentence summary of a complex argument.** "Let me put this argument in one sentence:
   …"; "in short, …". By being short it becomes vague and invites misreading, and it is offered where
   the reader did not ask for it. If the argument must be referred to again, give it a term and use
   the term.
5. **MBA-slide slogans.** "Structure beats tuning"; "the penalty matters"; "the criteria disagree".
   Generic, abstract, and unfalsifiable as written; they carry none of the facts that would let a
   reader judge them. State the specific fact with its numbers instead.
6. **Counting the things.** "Four facts stand out"; "adds two lessons"; "a transformer adds three
   things to a head". The count is not information about the subject; it is a presenter's scaffold.
   List the things, as a list, and make each item carry its fact.
7. **This, but that.** "Attention retrieves from the context, and the MLP retrieves from the training
   corpus." A forced parallel that oversimplifies both halves to make them rhyme. Say what each thing
   does, separately and precisely; if a real contrast exists, give the specific difference.
8. **Headings that name a rhetorical move instead of content.** "What the bound says"; "Why it
   holds"; "What the three conditions say". The heading describes the writer's manoeuvre, not the
   subject, so a reader scanning the page learns nothing and cannot find the section later. Name the
   content: "The bound: 0.60 at 16 384 positions and how it was computed".
9. **Consultancy vocabulary.** "An operational playbook"; "freeze the geometry"; "a spectrum-first
   benign-overfitting audit". Words from a different register (management, sales) that carry no
   technical content, imply processes that do not exist (an audit, a playbook), and often turn into
   capitalised pseudo-names the reader must decode. Use the plain technical word for the thing done.
10. **Moralised precision.** "Honest constants"; "honest validation"; "the honest economics"; "use
    calibrated language". The adjective adds a tone of virtue and no information: say what was
    measured, with what grade, and what was assumed. (This site used "honest" in its first drafts and
    in an earlier version of the house style; the word is retired for this use.)
11. **Decorative contrast punctuation.** The colon-then-reveal ("the answer: nothing"), the
    "not X, but Y" frame, the dangling fragment used as a punchline. Occasionally a contrast or a
    colon serves the text; as a habit it is rhythm in place of content.

The common thread: these devices try to make the writing pretty, memorable or persuasive. The writing
does not need to be any of those. It needs to say, clearly and without ambiguity, what it has to say.
A useful contrast, a parallel, a technical term or a colon that serves the text is fine; the devices
above are not that. They mislead, they are vague, and they distract from the argument.

## 4. Common ground with the rest of the style

- `voice.md` §3 (example first, then the rule, then the example again) is the same rule as §1 here:
  facts and the worked example before the conclusion.
- `voice.md` §4 allowed metaphors "when they carry the logic". The narrower rule of §2 here applies:
  named project terms yes; explanatory metaphors in arguments no.
- `voice.md` §6, formerly titled "Honest and sceptical", is now "Mark assumptions; state grades".
  Its content (assumptions marked, grades stated, negative results reported) stands; the word is gone.
- Takeaway blocks (`voice.md` §9) stay, as lists of the section's concrete results placed after the
  facts, which is consistent with §1. The pull quote (`::: pull`, "the one sentence to remember") is
  the one-sentence summary of trope 4 and is no longer used on new pages.
- Running-theme titles in `data/themes.yaml` ("Predict, then store only the surprise", "Trust, but
  shuffle") are names of recurring ideas and are referenced like terms, which §1 item 4 allows; a
  future pass may replace the slogan-shaped ones with descriptive names.
- The quirky project terms (`philosophy.md` §2) are not metaphors in the sense of trope 2: each has a
  single defined meaning and a Python form, and is used as a name, never as an argument.
