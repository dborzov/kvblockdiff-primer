# Voice and words: what to say, what never to say

The canonical word list is `docs/project/terminology.md`. This page is the quick reference for the words
that go wrong most often. (Until the rework is approved, "current" words are in force; see the status line
in `terminology.md`.)

## Never

| never write | because | write instead |
|---|---|---|
| **model** (in any sense) | it means the LLM, a coder's probability model, a cost model, a proxy, a toy, weights | the LLM; a forecast; the tally; the stand-in LLM; the toy LLM; LLM weights |
| **KV cache** (except once, to translate) | it is the whole store, not a cache; three real caches follow | the orchard (proposed) / the KV store |
| **cache** alone | which one? | hot cache, shelf, victim tier, or Part II's generic cache with that meaning in view |
| **block** for two different things | position cut vs dictionary-sharing set | stanza / basket (proposed) |
| **entry** for two different things | the picked unit vs the coded unit | cherry / morsel (proposed) |
| **channel** | paper word; communication channels; "side channel" | strand (proposed); `V[:, l, h, c]` |
| **request**, **sequence**, **conversation** as synonyms | one concept, four words | thread |
| **weight** for a dictionary's size | LLM weights, attention weights, prediction weights | heft $\vw$ (proposed) |
| **reference** for an entry or a tree | "reference setting" | twin, twin tree (proposed) |
| **index** for the selector or its output | index tax, codebook index, array index | picker, pick (proposed) |
| **×** for a compression figure, "compression ratio" | the site's convention is the fraction out ÷ in | 0.64 of raw; "(the paper says 1.56×)" once |
| **lossless** for a lossy method with unchanged accuracy | KV-Codec's "lossless accuracy" is lossy | lossy, with the model's tolerance stated separately |
| **the human** | one person | Dima |
| **the primer** meaning Parts I–X | the primer is the site | the proposal |
| "not X, but Y", "it's worth noting", colon-then-reveal, "simply", "just", "actually", "in order to" | mannered or filler | plain sentences |
| "Python dictionary" | collides with our dictionary | Python dict, hash map |

## Preferred

- **position** for the slot $t$; **token** for the vocabulary piece in it. "The same token again" and "the
  adjacent position" are different claims.
- **element** for one stored number; **bits per element** for rates.
- **unit**: the thing that decodes alone, when speaking generally about any coder.
- **pick** / **picks**: what the selector names; **hit**, **miss**, **δ-miss**, **raw miss**.
- **of raw**: "0.636 of raw", "a delta of 0.69 of a cherry".
- **the Pin**, **the Bench**: always by name when a number belongs to one.
- **verified**, **forecast-only**, **bound**, **assumed**, **toy**: the grades of a number; say which.

## Metaphors in use (keep them consistent)

The harbour office (the desk = hot cache, the archive = host memory, the lift = the link); the almanac (a
dictionary); the apple and the tree (position-neighbour similarity); the staircase (layers); Lucky Louis (picks
repeat); the Hermit, the Anchor, the Compass, the Hive, the Twin (dictionary types); fire and ice (a basket's
dictionary resident or not). The orchard, cherries, stanzas, baskets, morsels and strands are proposed.
