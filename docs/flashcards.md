# Flashcards

Readers collect flashcards while they read and practise them later with a
Leitner schedule. Everything runs in the browser. The deck lives in
`localStorage`, so there are no accounts and no server.

| File | Runs on | Does |
| --- | --- | --- |
| `theme/assets/js/cards.js` | every page | deck storage (`window.KVCards`), the "Flashcards from this page" panel, the buttons in takeaways, the top-bar counter |
| `theme/assets/js/practice.js` | the practice page only, after `cards.js` | the quiz, stats and catalogue |
| `theme/assets/css/cards.css` | every page | styles for both (tokens from `tokens.css` only) |

## Writing cards (content authors)

Each card belongs to a page and is written in that page's front matter. The
build turns it into this JSON (the `CARD` format):

```json
{"id": "school-entropy/what-is-surprisal",
 "q": "What is the surprisal of an event with probability 1/8?",
 "a": "3 bits",
 "wrong": ["8 bits", "1/8 bit", "0.125 bits"],
 "why": "Surprisal is −log₂ p; −log₂(1/8) = 3.",
 "sec": "surprisal",
 "page": "school-entropy", "num": "II.3", "title": "Surprise and entropy", "part": "II",
 "url": "/kvblockdiff-primer/school/entropy/#surprisal"}
```

- **`id` must never change once it is published.** It is the key of the
  reader's progress. If you rename it, every reader loses that card's
  progress. Removing a card is safe, because unknown ids are ignored.
- `q`, `a`, `wrong[]` and `why` may contain small inline HTML and math. The
  build renders it, and the scripts insert it as HTML.
- `wrong`: give **three** plausible decoys that match the answer in form and
  length ("3 bits" vs "8 bits", not vs "Huffman"). If you give fewer, the
  quiz fills the gap with answers of other cards from the same Part, then
  from anywhere. Those borrowed answers are easy to rule out.
- `why`: one or two sentences. They are shown after every answer, right or
  wrong.
- `sec`: the `id` of the `<h2>` the card is about. It is optional. Cards are
  grouped under that heading in the panel. If the section has a
  `<aside class="takeaway" data-sec="…">`, that takeaway gets an
  "Add the N flashcards from this section" button.

## Page contract (layout and build)

`cards.js` relies on exactly this. Every part is optional, and a missing
piece is skipped:

- `window.KV` is defined before the script runs: `prefix`,
  `page {id, num, title, part, url}` and `parts [{id, roman, title}]`.
- `#deck-count` (in the top bar). If it contains a `.dc-n` or `[data-deck-n]`
  element, only that element's text becomes the number, so the layout's
  emblem stays. Otherwise the whole text becomes `🂠 N`. The script also
  sets `aria-label`, `data-n` and `data-due`.
- `.takeaway[data-sec]` gets a `<div class="kvc-tk deck-add">` button
  appended.
- `<section id="deck" class="deck">` is filled with the panel. `cards.css`
  gives `.deck` the same reading column as `.page-body`. On a page
  without cards, it only holds a collapsed "Write your own flashcard" form.
  It is hidden when there is no `KV.page`.
- `<script type="application/json" id="page-cards">[CARD, …]</script>`
  holds this page's cards.
- The practice page has `<div id="practice-app"></div>` and loads
  `cards.js` **then** `practice.js`, both as deferred scripts. It fetches
  `KV.prefix + "cards.json"`, which holds every card in reading order.
- Accent colour: each card sets `--c: var(--part-<part>)` itself. Panels use
  the page's `--c`.

## Storage schema

Both keys are JSON in `localStorage`. They are validated on read. If storage
is unavailable or throws (private mode, blocked cookies), the deck works in
memory for the visit.

```text
kvp.deck   → { "<cardId>": { "box": 1..5, "due": <epoch ms>, "right": n, "wrong": n, "added": <epoch ms> } }
kvp.custom → [ { "id": "custom/<epoch ms>", "q", "a", "wrong": [≤3], "why", "sec": "",
                 "page", "num", "title", "part", "url", "custom": true, "created": <epoch ms> } ]
```

- A new card enters box 1, due now.
- A right answer moves it up one box (at most 5). A wrong answer sends it
  back to box 1.
- After each answer, `due` is set to now plus the box's interval: box 1 is
  due now, then boxes 2–5 wait 1, 3, 7 and 16 days. Box 5 counts as
  "mastered".
- Custom cards hold **plain text**, which is escaped when shown. Site cards
  hold trusted HTML.
- Saving a custom card adds it to the deck. Deleting it removes it from the
  deck.
- Other tabs pick up changes through the `storage` event.

## What the reader sees

- **Panel.** Each card is a small illustrated card: a Part-coloured band,
  the question, and **Peek** (flips the card to the answer and *why*) plus
  **Add / Added**. The panel also has *Add all N*, *Remove all*, a tally,
  *Practise your deck →*, the reader's own cards (with a two-step delete),
  and the form for writing a card.
- **Practice page.**
  - Stats: cards in the deck, due now, mastered, and a count per box.
  - Filters: *Due now* (the default), *Whole deck*, one chip per Part, and
    *Browse the catalogue*. Every site card is listed by Part and page, with
    Add/Remove per card and per Part.
  - Quiz: one card at a time, as a session of up to 20 cards, weakest boxes
    first. There are four shuffled options. Keys **1–4** answer, and
    **Enter** or **→** goes to the next card.
  - After each answer: ✓/✗, the box move, *why*, and a link to revisit the
    section.
  - At the end, a summary with *Practise again*.
  - The URL hash keeps the view (`#due`, `#all`, `#part-II`, `#browse`).

## JavaScript API

```js
KVCards.getDeck()            // → { id: {box, due, right, wrong, added} } (a copy)
KVCards.has(id)              // → boolean
KVCards.addCards(ids)        // → number added   (id or array)
KVCards.removeCards(ids)     // → number removed
KVCards.answer(id, correct)  // Leitner step → {id, correct, from, to, due} | null
KVCards.isDue(entry, now?)   // → boolean
KVCards.customCards()        // → [custom CARD] (copies)
KVCards.addCustom({q, a, wrong, why, page?, num?, title?, part?, url?}) // defaults to KV.page
KVCards.deleteCustom(id)     // → boolean
KVCards.toHTML(card, text)   // safe HTML for a card field (escapes custom cards)
KVCards.onChange(fn)         // fn({reason, ids, size}); returns an unsubscribe function
KVCards.INTERVALS            // [0, 1, 3, 7, 16] (days)
```

Every change also dispatches `kv:deck-change` on `document`, with the same
`detail`. `reason` is one of `add`, `remove`, `answer`, `custom-add`,
`custom-delete` or `sync`.
