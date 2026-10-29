---
title: The cat-thread ladder
nav: The cat-thread ladder
lede: Every proposal has an argument that made it feel obvious. This one has a story about cats, three rungs of a ladder, and a jump at the end. Here it is, told the way it was first told — and then taken apart over the next three pages.
group: The cat-thread ladder
cards:
  - q: What are the three rungs of the cat-thread ladder, from top to bottom?
    a: An entry against everything, against its thread, against its surrounding block
    wrong: ["Against its layer, its head, its channel", "Against keys, values, queries", "Against the hot cache, host memory, the link"]
    why: Each rung narrows what the entry is compared with — and so, intuitively, makes it less surprising.
    sec: rungs
  - q: What is "the jump" at the end of the cat-thread argument?
    a: Concluding from HiSparse's high hit rate that the bottom rung is steep, so block dictionaries will work
    wrong: ["Concluding that cats and dogs need different models", "Concluding that the thread rung is useless", "Concluding that the hot cache should be larger"]
    why: The jump uses evidence about which entries are selected as if it were evidence about how alike their bytes are. IV.13 takes it apart.
    sec: jump
  - q: Which parts of the cat-thread argument survive scrutiny?
    a: Its direction (a theorem), its unit (bits) and the reality of shared subjects; the jump does not, and the size of the gain is harsh
    wrong: ["All of it", "None of it", "Only the jump"]
    why: IV.12 keeps what is right, IV.13 shows the leak in the jump, IV.14 prices the rungs with the exchange rate.
    sec: jump
---

Picture two very long conversations with a model.

In `cat_thread`, the model writes an overview of cat breeds: 100K tokens on the Maine Coon, then 10K on the Siamese, and so on. In `dog_thread`, it does the same for dogs. Now pick one [[entry]] — call it *R* — from the middle of the Maine Coon part, and ask: how surprising is *R*?

## Three rungs {#rungs}

The first draft answered with three rungs, each comparing *R* with a narrower crowd.

1. **Against everything** the model could ever be asked about — cats, helicopters, Python, tax law — *R* is one message out of an enormous set. Very surprising.
2. **Against the entries of `cat_thread`.** We already know the conversation is about cats. The set of plausible messages is much smaller. Less surprising.
3. **Against the entries of the surrounding 100K tokens**, all on the Maine Coon. Smaller still. Least surprising of all.

::: define cat-ladder
- **What it is:** the intuitive argument for this project — an entry is less surprising against its own conversation than against everything, and least surprising against its own neighbourhood; so dictionaries fitted on narrower crowds should code it in fewer bits.
- **Mnemonic:** a cat climbing down a ladder, one rung per narrower crowd: everything → the thread → the block.
- **Verdict, in advance:** right in direction, leaky in its evidence, harsh in its exchange rate — the next three pages.
:::

::: figure fig-idea-cat-ladder catLadder
**The cat-thread ladder as a story in four steps.** Left: nested crowds the entry *R* (the dot) can be compared with — everything the model could be asked about, the `cat_thread` conversation (next to an unrelated `dog_thread`), and the 100K-token Maine Coon passage around *R*. The highlighted crowd is the current rung. Right: how surprising *R* is against each crowd, as bars; the heights only show the intuition's direction (lower is less surprising) and are *not* measured or computed. Step 4 adds the jump the first draft made. Use the buttons or the arrow keys.
:::

The story is good because it is concrete. You can feel the crowd shrinking. And each rung corresponds to something one could build:

- rung 1 ↔ one dictionary for every request, fitted once on a large sample of text;
- rung 2 ↔ one dictionary per conversation, fitted on its own history;
- rung 3 ↔ one dictionary per [[block]] of nearby tokens — kv-blockdiff's design.

Part VI calls these the three *scopes* of a dictionary ([[#homework-scope]]).

::: aside reminder Surprise is measured in bits
The [[surprisal]] of an outcome with probability $\vp$ is $-\log_2 \vp$ bits; the [[entropy]] $\vH$ is its average, the fewest bits per symbol any lossless code can average ([[#school-surprise]], [[#school-entropy]]). "Less surprising" means "codable in fewer bits".
:::

::: takeaway
- Three rungs: an entry against everything, against its conversation, against its neighbourhood.
- Each rung matches a dictionary scope: global, per request, per block.
- The intuition: each narrower crowd makes the entry cheaper to code.
:::

## The jump {#jump}

Then came the step that made the argument feel finished:

> "HiSparse's high hit rate shows that this ladder is steep at the bottom rung — so a block dictionary should work."

It is a tempting sentence. It points at a real, measured number (87 % of selections hit the hot cache, [[#landscape-lucky-louis]]) and attaches it to the rung we care about most. Taking it apart is worth three pages, because there are three different things in it.

| piece of the argument | verdict | page |
|---|---|---|
| narrower crowds can only help | right — it is a theorem | [[#idea-what-is-right]] |
| surprise is measured in bits | right — and it is our unit | [[#idea-what-is-right]] |
| entries of one subject share something | right — and it can be captured | [[#idea-what-is-right]] |
| HiSparse's hit rate shows the bottom rung is steep | a leak — the hit rate is about queries | [[#idea-the-leak]] |
| a steep rung means a big saving | a trap — the exchange rate is harsh | [[#idea-the-trap]] |

::: note intuition Why bother with a story we are about to dismantle?
Because it is not dismantled — it is *sorted*. The parts that are right become the measurement plan: three rungs, three scopes, three numbers in bits. The parts that are wrong tell us which evidence not to trust and how big a result to expect.
:::

::: takeaway
- The jump borrows HiSparse's hit rate as evidence for the bottom rung.
- Three things in the argument are right, one is a leak and one is a trap; the next three pages sort them.
:::
