# Reading and writing about papers

Part V holds one page per outside work. This is the method behind those pages and the template for new
ones (the step-by-step recipe is `docs/workflows/new-paper-page.md`).

## How much to trust what

A paper's **introduction and background** restate what the field already takes as known; those claims
are more likely true and are safe to lean on. A paper's **results**, above all the ones that are hard to
reproduce (a headline ratio, an accuracy table on a benchmark we cannot run), are claims to be weighed, not
facts to be copied. So: take a paper as a **source of ideas to try and of background to teach**, quote
its numbers with their provenance, and say plainly where we are not convinced and why.

## The seven questions

1. **What is rebuilt exactly?** Lossless, or lossy with unchanged accuracy? Separate statements about the
   LLM's *tolerance* ("accuracy holds at 2 bits") from statements about *predictability* ("a neighbour
   explains 80 % of the variance"). Only predictability converts into lossless savings.
2. **Which data path?** Bulk transfer, network fetch, GPU-memory footprint, or the miss path (ours:
   scattered single units that each decode alone)? May the decoder keep state?
3. **What is the dictionary, and who shares it?** Global, per thread, per stanza?
4. **What is measured, in which unit?** Can it be converted into bits per element? A similarity score that
   does not convert into bits is not evidence for us.
5. **At which precision?** BF16 results do not transfer to 8-bit storage for free.
6. **Which controls?** One trace or many? Would the effect vanish under a shuffle? Is the baseline sensible?
7. **Whose number is it?** Measured by the authors, or copied into a comparison table from elsewhere?

## The page skeleton

Every paper page has this shape, in this order:

1. **A hook that is an example.** Show the paper's central observation on a toy table or listing the reader
   can check by eye (KIVI's page opens with twelve tokens × eight element positions), using the site's words
   and shapes. A reader who has never heard of the paper must be able to follow from here.
2. **What it does, in our words.** The mechanism, retold with the site's terms and notation. No abstract phrasing.
3. **The numbers we use**, each with its source (section, table, figure) and its grade (measured by the
   authors; copied; re-checked by us; "as reported in the first draft, not re-checked").
4. **What it tells us, and what it does not.** Which of the site's claims it supports, contradicts or
   refines, by page link. Where its setting differs from ours (path, precision, scope, LLM family).
5. **Where we are not convinced.** Thin evidence, missing controls, a baseline that flatters, a unit that does
   not convert.
6. **Their words, our words.** A table translating every term the paper coins into the site's terms.
7. Takeaways, flashcards, receipts, as on every page.

## Writing rules specific to papers

- Translate before borrowing. If a page uses a word that is not defined on the site, that is a bug.
- Quote a compression figure as a fraction of raw, the paper's "×" once in brackets.
- Date and attribute: "KIVI (Liu et al., 2024)". Put the full citation in X's references page.
- Keep the paper's own claims and our reading visibly apart ("the authors report…" / "we read this as…").
- When several papers share a trick, say so and link them (SplitZip and the float coders; KV-Codec and CacheGen).
- Update `docs/project/state-of-knowledge.md` if the page changes what the site holds as established.
