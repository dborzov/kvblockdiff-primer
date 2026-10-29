---
title: The forecaster's desk
nav: Caches and LRU
lede: The forecaster's desk holds four logbooks; everything else is in the archive downstairs, a slow lift away. Which logbooks should stay on the desk? This is a cache, and the simplest good answer — keep what you used most recently — is called LRU.
group: Machines
cards:
  - q: What is a cache?
    a: A small, fast store that keeps copies of some items from a big, slow one
    wrong: ["A compressed copy of the whole archive", "A queue of requests waiting to be served", "The slow memory where everything is kept"]
    why: The desk is the cache, the archive is the big slow store. A request found on the desk is a hit; otherwise it is a miss and the lift must fetch it.
    sec: desk
  - q: 'On the storm morning (24 requests, 8 different logbooks), why can no desk of any size get fewer than 8 misses?'
    a: Each logbook's first request must miss — it has never been fetched before
    wrong: ["Because the desk always loses 8 logbooks to eviction", "Because LRU makes a mistake on every eighth request", "Because the lift carries only 8 logbooks a morning"]
    why: First-time requests miss whatever the policy or the desk size. Only repeat requests can hit.
    sec: desk
  - q: 'The desk is full and a new logbook arrives. Which logbook does LRU send back down?'
    a: The one whose last use was longest ago
    wrong: ["The one that arrived on the desk first", "The one requested least often overall", "A random one"]
    why: Least recently used. "Arrived first" is FIFO; "requested least often" is a different policy (LFU).
    sec: eviction
  - q: 'On the storm morning with a 4-logbook desk, how many misses do LRU and FIFO make?'
    a: LRU 10, FIFO 14
    wrong: ["LRU 14, FIFO 10", "Both 8", "LRU 4, FIFO 4"]
    why: FIFO throws out Gull Rock and Seal Point simply because they arrived early, although they are needed every few requests. LRU keeps them because they are always recently used.
    sec: eviction
---

Seven in the morning at the harbour office, and a storm is coming. The forecaster works through the logbooks of the stations along the coast — Gull Rock (G), Seal Point (S), the Harbour buoy (H), the Lighthouse (L), the Ferry pier (F), North Cape (N), Mill Bay (M) and the Reef (R). Here is the morning's list of requests, in order:

```text the storm morning: 24 requests for 8 logbooks
G S G H G S L G S F G S H G N G S L G S M G S R
```

The desk has room for **four** logbooks. Every other logbook lives in the archive downstairs, and fetching one means a trip of the slow lift. Gull Rock and Seal Point come up again and again; the Reef appears once, at the very end. Which logbooks should stay on the desk?

## Desk and archive {#desk}

::: define cache
- **What it is:** a small, fast store that keeps copies of some items from a big, slow one, so that most requests can be served quickly.
- **Example:** the desk (four logbooks, at arm's length) in front of the archive (every logbook, a lift ride away).
- **Easy to confuse with:** the archive itself. A cache holds *copies*; the full collection lives in the slow store.
:::

::: define hit-miss
- **A hit** is a request served from the cache: the logbook is already on the desk.
- **A miss** must fetch the item from the slow store: the lift goes down and comes back.
- **The miss rate** is the fraction of requests that miss. It is the number that decides how much the lift works.
:::

Some misses cannot be avoided by anyone. The first request for each logbook must miss, because it has never been fetched before. The storm morning asks for 8 different logbooks, so every desk, however large and however clever, makes at least **8 misses** out of 24.

Everything else depends on one decision.

::: takeaway
- A cache keeps copies of a few items close at hand; a hit is served there, a miss is fetched from the slow store.
- First-time requests always miss: 8 of the morning's 24 requests, whatever the desk.
:::

## Who goes back down? {#eviction}

When the desk is full and a new logbook arrives, one logbook must go back to the archive.

::: define eviction
- **What it is:** removing an item from a full cache to make room for a new one.
- **The eviction policy** is the rule that decides which item goes. Everything about a cache's performance, for a given size, is in that rule.
:::

The obvious rule bets that the recent past predicts the near future.

::: define lru
- **What it is:** *least recently used* — evict the item whose last use lies furthest in the past.
- **Why it works:** if a logbook was needed a moment ago, it will probably be needed again soon. Gull Rock is used every other request, so it is never the least recently used.
- **Easy to confuse with:** FIFO ("first in, first out", evict whatever arrived earliest, however often it is used since) and LFU (evict the item used least often overall).
:::

Step through the morning yourself.

::: figure fig-sv-desk svDeskSim
**The forecaster's desk, request by request.** Top: the morning's 24 requests; the current one is in the accent colour, past hits are tinted green and past misses red. Middle: the desk, one box per slot, each labelled with its logbook and how many requests ago it was last used (LRU) or arrived (FIFO); the dashed box is the logbook that would be sent down at the next miss. Bottom: the archive, with logbooks currently on the desk faded. *Step* with Back and Next (or play), *slide* the number of desk slots from 2 to 6, and *switch* the eviction policy. The read-out counts hits and misses so far and for the whole morning.
:::

::: try
1. LRU with 4 slots: step through. Gull Rock and Seal Point never leave the desk. The morning ends with **10 misses**: the 8 unavoidable first visits plus 2 (the Harbour buoy and the Lighthouse come back after being sent down).
2. Switch to FIFO. When the Ferry pier arrives (request 10), Gull Rock goes down just because it arrived first — and is asked for at the very next request. Then Seal Point, then the Harbour buoy: a chain of four misses in a row. **14 misses.**
3. With 3 slots: LRU 11 misses, FIFO 16. With 6 slots both policies get close to the unavoidable 8.
:::

::::: compare Two eviction policies
:::: col LRU
Evicts the logbook unused for longest. Uses the *recency* of each logbook — exactly the information that predicts the next request when work comes in bursts. Storm morning, 4 slots: **10 misses**.
::::
:::: col FIFO
Evicts the logbook that arrived earliest. Ignores how often a logbook has been used since. Storm morning, 4 slots: **14 misses**.
::::
:::::

::: theme which-vs-what
LRU never opens a logbook. It knows only *which* logbooks were asked for and when, nothing about what is written in them. A cache can work brilliantly on items that have nothing in common with each other; the requests, not the contents, make it work. Part III meets the same distinction in a language model ([[#landscape-lucky-louis]]).
:::

::: note connection Where the desk reappears
In Part III, a GPU keeps a small desk like this one for the memory of a language model, and uses LRU to manage it ([[#landscape-hisparse]]).
:::

::: takeaway
- Eviction decides which item leaves a full cache. LRU evicts the least recently used.
- On the storm morning with 4 slots: LRU 10 misses, FIFO 14, of which 8 are unavoidable.
- LRU works because of the request pattern, not because of what the items contain.
:::
