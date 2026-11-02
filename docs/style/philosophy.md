# Why the site is built the way it is: the thinking behind the rules

The other documents say *what* to do. This one says *why*, in the human's own reasoning, so that an
agent meeting a case the rules do not cover can work out what the human would want. When a rule in
another document seems to conflict with a goal stated here, the goal wins and the rule needs amending.

## 1. What this site is for

It is the **source of truth for the context of the kvblockdiff research project**: the one place where
a human or an AI agent can start from zero and come away with the definitions, the problem statements,
the background knowledge, the results so far and the plan, all in one consistent voice. It is not a
blog, not a paper draft and not a lab notebook. Its two readers are a human who thinks about the
project between sessions and an AI agent that is handed a task and must get up to speed fast without
re-reading everything.

Consequences the human cares about:

- **Nothing on the site may contradict anything else on the site.** The site was first written in
  stages, and each stage kept the words and the assumptions of the stage before it even after the thing
  they named had changed ("layered cake"). Drift is the enemy. When a result changes a verdict, the
  hypothesis page, the summary, the plan and the numbers index all change in the same commit.
- **The site, not the chat history, carries the intent.** If the human had to explain something in a
  prompt, that explanation belongs in a doc or a page, with its reasoning, so it never has to be
  repeated. This file exists because of that rule.
- **Agents load only what their task needs.** Hence short docs, a catalog, and pages of one idea
  each. A document that tries to say everything will be skimmed and misapplied.

## 2. Why the vocabulary is strict, and how to extend it

The project touches LLMs, information theory, compression engineering, caching, GPUs and economics.
Each field has its own overloaded words, and the overlaps are exactly where misunderstandings breed:
"model" can be the LLM, a probability model, a cost model, a proxy model; "channel" can be a tensor
position, a column of statistics or the wire between sender and receiver; "cache" can be the KV store,
the hot cache, the dictionary shelf or a CPU cache; "block" can be a range of positions or the data one
dictionary serves; "entry" quietly meant three different shapes across the campaigns. The human's
position: **a word that can be taken for something else in this context is a bug, and the fix is a
different word, not a clarifying sentence.**

The tricks, in order of preference, with their reasons:

1. **Introduce every term inside the system that uses it, through a worked example and a listing.** A
   reader (human or agent) who sees `k[layer_id].append(key)` grow, then reads "this growing store is the
   orchard", knows what the orchard is, how it relates to layers and tokens, and what it is not, all at
   once. Names learned from a definition alone are forgotten and confused; names learned from the code
   that produces them stick. This is why Part III writes attention out in Python with every shape named,
   and why Part IV builds the scenario one object at a time with `.shape` and byte counts.
2. **Bundle each term with its Python form and reuse that form everywhere.** `v[token_pos_id,
   layer_id, head_id, :]` cannot be misread the way "a channel" can. The index names are spelled out,
   never `K[l,h,t,c]`, so a reader always sees which axis is which; hover chips show the shape and bytes
   in the current reference setting. When a sentence could be replaced by an expression, prefer the
   expression; when a concept is used often, give it a name as well.
3. **For project-specific concepts, pick quirky, out-of-place words whose image carries a structural
   property.** A cherry is picked one at a time; a punnet is the box cherries come in; a furrow runs the
   length of a field; a leash limits how far something may wander; apples fall near the tree; an echo
   is a far repeat. Two reasons: a word that obviously does not belong in the domain cannot be mistaken
   for a domain word, and a vivid image is a mnemonic that recalls the structure, not just the label.
   Standard concepts keep their standard names (token, layer, entropy, Huffman); quirky names are for
   things this project defines.
4. **When several related concepts could be confused in the heat of the moment, over-introduce
   distinct names and say explicitly what each is not.** Stretch (positions), slice (coordinates),
   cherry shape (dicing), punnet (the cherries), dictionary (the shared bytes) are five objects; one
   word for two of them (the old "block") was the single most damaging ambiguity on the old site.
   Every `::: define` box has an "easy to confuse with" bullet for this reason.
5. **Ban the overloaded words outright and enforce it mechanically.** Even where the meaning would be
   clear, an allowed "model" here licenses an unclear one there. The word checker exists so that the
   rule does not depend on anyone's attention.

How to extend it: when a new concept appears, ask (a) is it standard? use the standard word; (b) could
it be confused with anything on the site? if yes, a new name by trick 3; (c) does it have a Python
form? write it down first; (d) propose brand terms (emblem, colour, nickname) to the human rather than
adding them. Record the decision in `terminology.md` with its reason.

## 3. Why the compression scenario is a standalone problem

The research project has many moving parts (HiSparse, indexers, caches, GPUs, economics). The human's
central methodological point: **the compression question must be stated as a clean, self-contained
problem that can be studied, and automated, apart from everything downstream.** Reasons:

- Information theory can answer "how many bytes does a cherry need, given a dictionary?" on a dump of
  orchards with no serving system at all, and the answer is reusable by every application design.
- A contract that fits in three lines (`compress`, `decompress`, bit-for-bit equality, cold decode)
  is what lets twenty autonomous agents search the design space without a human judging each claim.
- The access pattern of the application (one scattered pick now, nothing decoded before it) must be
  written into the scenario as rules (one cherry at a time, cold decode, the leash), otherwise the
  search finds a "best" compressor that answers a different question (bulk compression of the punnet).
  The first campaign did exactly that within an hour of starting, which is why the leash exists.
- The scenario must be varied along slice, cherry shape, stretch length, leash and scope, for two
  reasons the human wants kept distinct: as a **probe** (the best compressor per scenario and the
  differences between scenarios measure where the orchard's information is; nobody cares whether that
  compressor could run on a GPU) and as a **map** (each serving design, DSA per-layer picks, GLM-5.1
  shared picks, DeepSeek-V4 squeezed rows, needs a different scenario, and the application is chosen on
  the numbers afterwards).

The same treatment, a clean statement before any experiment, is owed to the other subproblems
(`../project/subproblems.md`): the pick trace, the hot-cache replay, the decoder's speed, the economics.

## 4. Why numbers carry grades and receipts

The human distrusts numbers that cannot be traced. A score is a result only if every cherry was rebuilt
bit for bit in a separate process with its reads counted (verified); anything else is a quick trial, a
code-length estimate or a bound, and says so. Two screens read different punnets and are never
subtracted. A paper's number is "their measurement" with its section. The reason is not pedantry: the
campaigns reversed one conclusion (which cherry shape is better) because two screens were compared.

## 5. Why papers are read the way they are

Papers are a source of ideas to try, not of facts to repeat. What a paper assumes in its introduction
and background is more likely true than what it reports as a result, and a result that is easy to
verify is more trustworthy than one that is not. Every paper page therefore teaches the idea from zero
with a worked example in our words, separates what they assume from what they show, says how verifiable
each result is, and states explicitly how it builds on, conflicts with or suggests something for our
scenario. The paper's own words are translated on first contact and listed in a table, because
untranslated jargon is how drift starts.

## 6. Why the plan is written the way it is

Speed to a result beats completeness. Experiments are designed around the data that exists (the Bench
dump) and what is one script away (queries, a stand-in indexer, a replay), each with its question, its
scenario line, its expected signal and controls, the decision it informs, and a cost in hours; the
decision rule is written before the data. A plan that waits for a serving system or a bigger LLM is a
plan that produces nothing this month.

## 7. How to apply this when the rules run out

- If a sentence could be read two ways by someone who knows the field, it is wrong; find the reading
  the human means from the scenario statement and rewrite with the exact object (stretch? punnet?
  pick? cherry?).
- If a new fact changes a verdict, propagate it everywhere it is quoted; grep the number.
- If a figure's label, a flashcard or a hover text disagrees with the prose, the prose is the spec.
- If a term is needed and none fits, name it by the rules in §2 and ask; do not reuse a banned word
  "just this once".
- If an instruction in a task conflicts with the goals here, say so in the report instead of
  silently picking one.
