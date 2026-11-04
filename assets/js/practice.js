/* =====================================================================
   Flashcards, part 2 — the practice page (#practice-app).
   A multiple-choice quiz over the reader's deck with Leitner boxes,
   plus a catalogue of every card on the site. Deck state lives in
   window.KVCards (cards.js, which must load first).
   Data format and storage schema: docs/flashcards.md
   ===================================================================== */
(() => {
  "use strict";

  const root = document.getElementById("practice-app");
  if (!root) return;

  const KV = window.KV || {};
  const PREFIX = KV.prefix || "/";
  const PARTS = Array.isArray(KV.parts) ? KV.parts : [];
  const SESSION_MAX = 20; // cards per practice session
  const DECOYS = 3; // wrong options shown next to the right one
  const DAY = 24 * 60 * 60 * 1000;

  let C = null; // window.KVCards
  const S = {
    site: [], // cards.json, in reading order
    cards: [], // site + custom cards
    byId: new Map(),
    view: "due", // "due" | "all" | "part" | "browse"
    part: null,
    mode: null, // what the stage shows: "quiz" | "summary" | "empty" | "none" | "browse"
    quiz: null,
    dom: null,
  };

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */

  function el(tag, props, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) node.append(kid);
    return node;
  }

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const pageUrl = (card) => (card.url || "").split("#")[0] || card.url;
  const partStyle = (part) =>
    /^[A-Za-z0-9-]+$/.test(part || "") ? `--c: var(--part-${part}, var(--gold))` : null;
  const isCard = (c) => c && typeof c.id === "string" && typeof c.q === "string" && typeof c.a === "string";

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const scratch = document.createElement("template");
  const textCache = new Map();
  /* Plain, normalised text of an HTML snippet (to compare answers). */
  function textKey(html) {
    if (!textCache.has(html)) {
      scratch.innerHTML = html;
      textCache.set(html, scratch.content.textContent.replace(/\s+/g, " ").trim().toLowerCase());
    }
    return textCache.get(html);
  }

  function partInfo(id) {
    const p = PARTS.find((x) => x.id === id);
    if (p) return { id: p.id, roman: p.roman || p.id, title: p.title || "" };
    return { id: id || "", roman: id || "·", title: id ? `Part ${id}` : "Other cards" };
  }
  const partLabel = (id) => {
    const p = partInfo(id);
    return p.title ? `Part ${p.roman} · ${p.title}` : `Part ${p.roman}`;
  };

  function whenDue(ms, now) {
    const days = Math.ceil((ms - now) / DAY);
    if (days <= 0) return "today";
    if (days === 1) return "tomorrow";
    return `in ${days} days`;
  }

  const scrollBehavior = () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

  function announce(text) {
    if (!S.dom) return;
    S.dom.live.textContent = "";
    // A fresh text node after a tick makes screen readers repeat identical messages.
    setTimeout(() => { S.dom.live.textContent = text; }, 30);
  }

  /* ------------------------------------------------------------------
     Data
     ------------------------------------------------------------------ */

  function rebuildCatalogue() {
    const custom = C.customCards().sort((a, b) => a.created - b.created);
    S.cards = S.site.concat(custom);
    S.byId = new Map(S.cards.map((c) => [c.id, c]));
  }

  /* The stored deck, restricted to cards that still exist. */
  function deckInfo() {
    const deck = C.getDeck();
    const now = Date.now();
    const ids = Object.keys(deck).filter((id) => S.byId.has(id));
    const boxes = [0, 0, 0, 0, 0];
    let due = 0;
    for (const id of ids) {
      boxes[deck[id].box - 1] += 1;
      if (deck[id].due <= now) due += 1;
    }
    return { deck, ids, due, boxes, mastered: boxes[4], now };
  }

  const partCards = (part) => S.cards.filter((c) => c.part === part);
  const partsInCatalogue = () => {
    const present = new Set(S.cards.map((c) => c.part));
    const known = PARTS.map((p) => p.id).filter((id) => present.has(id));
    return known.concat([...present].filter((id) => !known.includes(id)));
  };

  /* ------------------------------------------------------------------
     Shell: stats, filters, stage
     ------------------------------------------------------------------ */

  function renderShell() {
    const stats = el("div", { class: "kvp-stats" });
    const filters = el("nav", { class: "kvp-filters", "aria-label": "What to practise" });
    const stage = el("div", { class: "kvp-stage" });
    const live = el("p", { class: "kvp-sr", role: "status", "aria-live": "polite" });
    root.replaceChildren(stats, filters, stage, live);
    S.dom = { stats, filters, stage, live };
    buildStats();
    buildFilters();
    sync();
  }

  function buildStats() {
    const stat = (key, label) =>
      el("div", { class: `kvp-stat kvp-stat-${key}` },
        el("span", { class: "kvp-stat-n", "data-stat": key, text: "0" }),
        el("span", { class: "kvp-stat-l", text: label }));
    const boxes = el("ol", { class: "kvp-boxes", "aria-label": "Cards in each Leitner box" },
      ["I", "II", "III", "IV", "V"].map((roman, i) =>
        el("li", { class: "kvp-box" },
          el("span", { class: "kvp-box-n", "data-box": String(i + 1), text: "0" }),
          el("span", { class: "kvp-box-l" }, el("span", { class: "kvp-sr", text: "box " }), roman))));
    S.dom.stats.replaceChildren(
      stat("deck", "in your deck"),
      stat("due", "due now"),
      stat("mastered", "mastered"),
      el("div", { class: "kvp-boxes-wrap" },
        el("span", { class: "kvp-boxes-cap", "aria-hidden": "true", text: "Leitner boxes" }),
        boxes));
  }

  function buildFilters() {
    const chip = (view, label, extra = {}) =>
      el("button", { type: "button", class: `kvp-chip${extra.cls ? ` ${extra.cls}` : ""}`, "data-view": view, "aria-pressed": "false", style: extra.style, title: extra.title },
        label, el("span", { class: "kvp-chip-n", "data-count": view }));
    const parts = partsInCatalogue().map((id) => {
      const p = partInfo(id);
      return chip(`part-${id}`, el("span", { class: "kvp-chip-roman" }, el("span", { class: "kvp-sr", text: "Part " }), p.roman), {
        cls: "is-part",
        style: partStyle(id),
        title: partLabel(id),
      });
    });
    S.dom.filters.replaceChildren(
      el("div", { class: "kvp-chip-row" },
        chip("due", "Due now"),
        chip("all", "Whole deck"),
        chip("browse", "Browse the catalogue", { cls: "is-browse" })),
      parts.length
        ? el("div", { class: "kvp-chip-row is-parts", role: "group", "aria-label": "Practise one Part" },
            el("span", { class: "kvp-chip-cap", "aria-hidden": "true", text: "By Part" }), parts)
        : null);
    S.dom.filters.onclick = (e) => {
      const btn = e.target.closest("[data-view]");
      if (btn) setView(btn.dataset.view, { focus: true });
    };
  }

  const viewKey = () => (S.view === "part" ? `part-${S.part}` : S.view);

  /* Update numbers and pressed states in place (keeps focus where it is). */
  function sync() {
    const info = deckInfo();
    const set = (sel, value) => S.dom.stats.querySelectorAll(sel).forEach((n) => { n.textContent = String(value); });
    set('[data-stat="deck"]', info.ids.length);
    set('[data-stat="due"]', info.due);
    set('[data-stat="mastered"]', info.mastered);
    info.boxes.forEach((n, i) => set(`[data-box="${i + 1}"]`, n));
    S.dom.stats.classList.toggle("has-due", info.due > 0);

    const counts = { due: info.due, all: info.ids.length, browse: S.cards.length };
    for (const id of info.ids) {
      const key = `part-${S.byId.get(id).part}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    S.dom.filters.querySelectorAll("[data-view]").forEach((btn) => {
      const v = btn.dataset.view;
      btn.setAttribute("aria-pressed", String(v === viewKey()));
      btn.querySelector("[data-count]").textContent = String(counts[v] || 0);
      if (v.startsWith("part-")) {
        btn.setAttribute("aria-label", `${partLabel(v.slice(5))}: ${plural(counts[v] || 0, "card")} in your deck`);
      }
    });
    if (S.mode === "browse") syncBrowse();
  }

  function setView(key, { focus = false } = {}) {
    if (key.startsWith("part-")) {
      S.view = "part";
      S.part = key.slice(5);
    } else {
      S.view = ["due", "all", "browse"].includes(key) ? key : "due";
      S.part = null;
    }
    try {
      history.replaceState(null, "", `#${viewKey()}`);
    } catch (err) { /* sandboxed or file:// pages */ }
    sync();
    renderStage({ focus });
  }

  function readHash() {
    const key = decodeURIComponent((location.hash || "").slice(1));
    if (!key) return;
    if (key.startsWith("part-") && partsInCatalogue().includes(key.slice(5))) setViewState("part", key.slice(5));
    else if (["due", "all", "browse"].includes(key)) setViewState(key, null);
  }
  function setViewState(view, part) {
    S.view = view;
    S.part = part;
  }

  function onDeckChange(detail) {
    if (!S.dom) return; // still loading, or showing the load error
    if (["custom-add", "custom-delete", "sync"].includes(detail.reason)) {
      rebuildCatalogue();
      buildFilters();
      if (S.mode === "browse") renderBrowse();
    }
    sync();
    // An empty or "nothing due" stage may have something to show now.
    if (S.mode === "empty" || S.mode === "none") renderStage({ focus: true });
  }

  /* ------------------------------------------------------------------
     Stage
     ------------------------------------------------------------------ */

  function show(mode, node, focus) {
    S.mode = mode;
    S.dom.stage.replaceChildren(node);
    if (focus) {
      const target = node.querySelector("[data-autofocus]") || node;
      if (!target.hasAttribute("tabindex") && !target.matches("button, a")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      if (S.dom.stage.getBoundingClientRect().top < 0) S.dom.stage.scrollIntoView({ block: "start", behavior: scrollBehavior() });
    }
  }

  function renderStage({ focus = false } = {}) {
    if (S.view === "browse") return renderBrowse(focus);
    const info = deckInfo();
    if (!info.ids.length) return renderEmptyDeck(focus);
    const queue = buildQueue(info);
    if (!queue.length) return renderNothing(info, focus);
    S.quiz = { queue, i: 0, results: [], current: null };
    renderQuestion(focus);
  }

  function buildQueue(info) {
    let ids = info.ids;
    if (S.view === "due") ids = ids.filter((id) => info.deck[id].due <= info.now);
    if (S.view === "part") ids = ids.filter((id) => S.byId.get(id).part === S.part);
    // Random order, but the weakest boxes first.
    return shuffle(ids).sort((a, b) => info.deck[a].box - info.deck[b].box).slice(0, SESSION_MAX);
  }

  function inviteButtons() {
    return el("ul", { class: "kvp-invite", role: "list" },
      partsInCatalogue().map((id) => {
        const ids = partCards(id).map((c) => c.id).filter((cid) => !C.has(cid));
        if (!ids.length) return null;
        return el("li", { style: partStyle(id) },
          el("button", { type: "button", class: "kvp-invite-btn", onclick: () => C.addCards(ids) },
            el("span", { class: "kvp-invite-roman", "aria-hidden": "true", text: partInfo(id).roman }),
            el("span", { class: "kvp-invite-text" },
              `Add all ${plural(ids.length, "card")} from `,
              el("b", { text: partLabel(id) }))));
      }));
  }

  const browseButton = (label = "Browse the catalogue") =>
    el("button", { type: "button", class: "kvp-btn", onclick: () => setView("browse", { focus: true }) }, label);

  function notice(cls, title, ...body) {
    return el("section", { class: `kvp-notice ${cls}`, "aria-labelledby": "kvp-notice-h" },
      el("span", { class: "kvp-orn", "aria-hidden": "true" }),
      el("h2", { id: "kvp-notice-h", tabindex: "-1", "data-autofocus": true, text: title }),
      ...body);
  }

  function renderEmptyDeck(focus) {
    S.quiz = null;
    show("empty", notice("is-empty", "Your deck is empty",
      el("p", {}, "Pick cards on any page with ", el("b", { text: "＋ Add" }),
        ", or start with a whole Part below. They stay in this browser, and come back for review on a Leitner schedule: the better you know a card, the longer it rests."),
      inviteButtons(),
      el("p", { class: "kvp-actions" }, browseButton("Browse the catalogue card by card"))), focus);
  }

  function renderNothing(info, focus) {
    S.quiz = null;
    if (S.view === "part") {
      const ids = partCards(S.part).map((c) => c.id);
      show("none", notice("is-none", `No cards from Part ${partInfo(S.part).roman} in your deck yet`,
        el("p", {}, `${partLabel(S.part)} has ${plural(ids.length, "card")}.`),
        el("p", { class: "kvp-actions" },
          el("button", { type: "button", class: "kvp-btn is-primary", style: partStyle(S.part), onclick: () => C.addCards(ids) },
            `Add all ${ids.length} from Part ${partInfo(S.part).roman}`),
          browseButton())), focus);
      return;
    }
    const next = Math.min(...info.ids.map((id) => info.deck[id].due));
    show("none", notice("is-none", "Nothing is due right now",
      el("p", {}, `All ${plural(info.ids.length, "card")} in your deck are resting. The next one is due `,
        el("b", { text: whenDue(next, info.now) }), "."),
      el("p", { class: "kvp-actions" },
        el("button", { type: "button", class: "kvp-btn is-primary", onclick: () => setView("all", { focus: true }) }, "Practise the whole deck anyway"),
        browseButton("Add more cards"))), focus);
  }

  /* ------------------------------------------------------------------
     Quiz
     ------------------------------------------------------------------ */

  /* The right answer plus up to three decoys: the card's own wrong
     answers first, then answers of other cards from the same Part,
     then from anywhere. Never two options with the same text. */
  function buildOptions(card) {
    const right = C.toHTML(card, card.a);
    const seen = new Set([textKey(right)]);
    const decoys = [];
    const take = (src, text) => {
      if (decoys.length >= DECOYS) return;
      const html = C.toHTML(src, text);
      const key = textKey(html);
      if (!key || seen.has(key)) return;
      seen.add(key);
      decoys.push({ html, correct: false });
    };
    shuffle(card.wrong || []).forEach((w) => take(card, w));
    if (decoys.length < DECOYS) {
      const others = shuffle(S.cards.filter((c) => c.id !== card.id));
      others.filter((c) => c.part === card.part).forEach((c) => take(c, c.a));
      others.filter((c) => c.part !== card.part).forEach((c) => take(c, c.a));
    }
    return shuffle([{ html: right, correct: true }, ...decoys]);
  }

  function pips(box) {
    return el("span", { class: "kvp-pips", title: `Leitner box ${box} of 5` },
      el("span", { class: "kvp-sr", text: `Box ${box} of 5` }),
      [1, 2, 3, 4, 5].map((i) => el("i", { class: i <= box ? "is-on" : "", "aria-hidden": "true" })));
  }

  function renderQuestion(focus) {
    const q = S.quiz;
    const card = S.byId.get(q.queue[q.i]);
    const entry = card && C.getDeck()[card.id];
    if (!entry) { // removed meanwhile (another tab, or the catalogue changed)
      q.queue.splice(q.i, 1);
      if (q.i < q.queue.length) return renderQuestion(focus);
      return q.results.length ? renderSummary(focus) : renderStage({ focus });
    }

    let options = buildOptions(card);
    const selfGraded = options.length < 2; // no decoys anywhere: reveal, then grade yourself
    if (selfGraded) options = [{ html: "✓ I knew it", correct: true }, { html: "✗ Not yet", correct: false }];
    q.current = { card, options, answered: false, selfGraded };

    const list = el("ol", { class: "kvp-options", "aria-labelledby": "kvp-q" },
      options.map((o, i) =>
        el("li", {},
          el("button", { type: "button", class: "kvp-opt", "data-i": String(i), "aria-keyshortcuts": String(i + 1), onclick: () => choose(i) },
            el("span", { class: "kvp-key", "aria-hidden": "true", text: String(i + 1) }),
            el("span", { class: "kvp-opt-text", html: o.html }),
            el("span", { class: "kvp-mark", "aria-hidden": "true" })))));

    const progress = (q.i + 1) / q.queue.length;
    const node = el("article", { class: `kvp-card${card.custom ? " is-custom" : ""}`, "data-card": card.id, style: partStyle(card.part), "aria-labelledby": "kvp-q" },
      el("header", { class: "kvp-band" },
        el("span", { class: "kvp-band-src" },
          el("span", { class: "kvp-band-num", text: card.num || partInfo(card.part).roman }),
          el("span", { class: "kvp-band-title", text: card.custom ? `${card.title} · your card` : card.title })),
        pips(entry.box)),
      el("div", { class: "kvp-progress" },
        el("span", { class: "kvp-progress-text", text: `Card ${q.i + 1} of ${q.queue.length}` }),
        el("span", { class: "kvp-progress-bar", "aria-hidden": "true" }, el("i", { style: `width: ${(progress * 100).toFixed(1)}%` }))),
      el("h2", { class: "kvp-q", id: "kvp-q", tabindex: "-1", "data-autofocus": true, html: C.toHTML(card, card.q) }),
      selfGraded
        ? el("details", { class: "kvp-reveal" }, el("summary", {}, "Show the answer"), el("div", { class: "kvp-reveal-a", html: C.toHTML(card, card.a) }))
        : null,
      list,
      el("div", { class: "kvp-feedback", hidden: true }),
      el("p", { class: "kvp-hint", "aria-hidden": "true" },
        el("kbd", { text: "1" }), "–", el("kbd", { text: String(options.length) }), " answer · ",
        el("kbd", { text: "Enter" }), " or ", el("kbd", { text: "→" }), " next card"));
    show("quiz", node, focus);
  }

  function choose(i) {
    const q = S.quiz;
    const cur = q && q.current;
    if (!cur || cur.answered || !cur.options[i]) return;
    cur.answered = true;
    const { card } = cur;
    const correct = cur.options[i].correct;
    const move = C.answer(card.id, correct) || { from: 1, to: 1, due: Date.now() };
    q.results.push({ id: card.id, correct, from: move.from, to: move.to });

    const stage = S.dom.stage;
    stage.querySelector(".kvp-card").classList.add("is-answered", correct ? "is-right" : "is-wrong");
    stage.querySelectorAll(".kvp-opt").forEach((btn, j) => {
      const o = cur.options[j];
      btn.setAttribute("aria-disabled", "true");
      const isRight = cur.selfGraded ? j === i && o.correct : o.correct;
      const isWrong = j === i && !o.correct;
      btn.classList.toggle("is-right", isRight);
      btn.classList.toggle("is-wrong", isWrong);
      btn.classList.toggle("is-chosen", j === i);
      btn.querySelector(".kvp-mark").textContent = isRight ? "✓" : isWrong ? "✗" : "";
      if (isRight && !cur.selfGraded) btn.append(el("span", { class: "kvp-sr", text: " (correct answer)" }));
      if (isWrong && !cur.selfGraded) btn.append(el("span", { class: "kvp-sr", text: " (your answer)" }));
    });
    const reveal = stage.querySelector(".kvp-reveal");
    if (reveal) reveal.open = true;

    const moveText = correct
      ? (move.to > move.from ? `Up to box ${move.to}` : `Stays in box ${move.to}`)
      : (move.from > 1 ? "Back to box 1" : "Stays in box 1");
    const dueText = move.to === 1 ? "comes back next session" : `due again ${whenDue(move.due, Date.now())}`;
    const last = q.i + 1 >= q.queue.length;
    const nextBtn = el("button", { type: "button", class: "kvp-btn is-primary kvp-next", onclick: next },
      last ? "See how you did" : "Next card", el("span", { "aria-hidden": "true", text: " →" }));

    const fb = stage.querySelector(".kvp-feedback");
    fb.replaceChildren(
      el("p", { class: "kvp-verdict" },
        el("span", { class: "kvp-verdict-ico", "aria-hidden": "true", text: correct ? "✓" : "✗" }),
        el("b", { text: correct ? "Right!" : "Not quite." }),
        ` ${moveText} · ${dueText}.`),
      card.why ? el("div", { class: "kvp-why", html: C.toHTML(card, card.why) }) : null,
      el("div", { class: "kvp-fb-actions" },
        card.url
          ? el("a", { class: "kvp-revisit", href: card.url },
              "Revisit: ", el("b", { text: card.num || "" }), ` ${card.title || "the page"}`)
          : el("span"),
        nextBtn));
    fb.hidden = false;
    const answerText = textKey(C.toHTML(card, card.a));
    announce(correct ? `Right. ${moveText}.` : `Not quite. The answer is ${answerText}. ${moveText}.`);
    nextBtn.focus({ preventScroll: true });
    if (nextBtn.getBoundingClientRect().bottom > window.innerHeight) {
      fb.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
    }
  }

  function next() {
    const q = S.quiz;
    if (!q || !q.current || !q.current.answered) return;
    q.i += 1;
    if (q.i >= q.queue.length) renderSummary(true);
    else renderQuestion(true);
  }

  function renderSummary(focus) {
    const results = S.quiz.results;
    const right = results.filter((r) => r.correct).length;
    const up = results.filter((r) => r.to > r.from).length;
    const down = results.filter((r) => r.to < r.from).length;
    const mastered = results.filter((r) => r.to === 5 && r.from < 5).length;
    const missed = results.filter((r) => !r.correct).map((r) => S.byId.get(r.id)).filter(Boolean);
    const ratio = results.length ? right / results.length : 0;
    const title = ratio === 1 ? "A perfect round" : ratio >= 0.7 ? "Well played" : "Session complete";

    const moves = [
      up && el("li", { class: "is-up" }, el("span", { "aria-hidden": "true", text: "▲" }), ` ${plural(up, "card")} moved up a box`),
      down && el("li", { class: "is-down" }, el("span", { "aria-hidden": "true", text: "▼" }), ` ${plural(down, "card")} went back to box 1`),
      mastered && el("li", { class: "is-star" }, el("span", { "aria-hidden": "true", text: "★" }), ` ${plural(mastered, "card")} reached box 5: mastered`),
    ].filter(Boolean);
    if (!moves.length) moves.push(el("li", {}, "No card changed box."));

    const node = el("section", { class: "kvp-summary", "aria-labelledby": "kvp-sum-h" },
      el("span", { class: "kvp-orn", "aria-hidden": "true" }),
      el("h2", { id: "kvp-sum-h", tabindex: "-1", "data-autofocus": true, text: title }),
      el("p", { class: "kvp-score" },
        el("span", { class: "kvp-score-n", text: String(right) }),
        el("span", { class: "kvp-score-of", text: ` of ${results.length} right` })),
      el("ul", { class: "kvp-moves", role: "list" }, moves),
      missed.length
        ? el("div", { class: "kvp-missed" },
            el("h3", { text: "Worth revisiting" }),
            el("ul", { role: "list" },
              missed.map((c) =>
                el("li", { style: partStyle(c.part) },
                  el("a", { href: c.url || pageUrl(c) }, el("b", { text: c.num || "" }), ` ${c.title || ""}`),
                  el("span", { class: "kvp-missed-q", html: C.toHTML(c, c.q) })))))
        : null,
      el("p", { class: "kvp-actions" },
        el("button", { type: "button", class: "kvp-btn is-primary", onclick: () => renderStage({ focus: true }) }, "Practise again"),
        browseButton()));
    S.quiz.current = null;
    show("summary", node, focus);
    announce(`Session complete: ${right} of ${results.length} right.`);
  }

  document.addEventListener("keydown", (e) => {
    if (S.mode !== "quiz" || e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    const cur = S.quiz && S.quiz.current;
    if (!cur) return;
    const t = e.target instanceof Element ? e.target : null;
    if (t && t.closest("input, textarea, select, [contenteditable]")) return;
    if (!cur.answered && /^[1-9]$/.test(e.key) && Number(e.key) <= cur.options.length) {
      e.preventDefault();
      choose(Number(e.key) - 1);
    } else if (cur.answered && (e.key === "ArrowRight" || (e.key === "Enter" && !(t && t.closest("a, button, summary"))))) {
      e.preventDefault();
      next();
    }
  });

  /* ------------------------------------------------------------------
     Catalogue: every card on the site, by Part and page
     ------------------------------------------------------------------ */

  function catalogueTree() {
    const parts = new Map(partsInCatalogue().map((id) => [id, { id, pages: new Map(), ids: [] }]));
    for (const c of S.cards) {
      const group = parts.get(c.part);
      group.ids.push(c.id);
      const key = c.page || pageUrl(c) || c.title;
      if (!group.pages.has(key)) group.pages.set(key, { num: c.num, title: c.title, url: pageUrl(c), cards: [] });
      group.pages.get(key).cards.push(c);
    }
    return [...parts.values()];
  }

  function renderBrowse(focus) {
    S.quiz = null;
    const tree = catalogueTree();
    const node = el("section", { class: "kvp-browse", "aria-labelledby": "kvp-browse-h" },
      el("header", { class: "kvp-browse-head" },
        el("h2", { id: "kvp-browse-h", tabindex: "-1", "data-autofocus": true, text: "The catalogue" }),
        el("p", {}, `Every card on the site — ${plural(S.cards.length, "card")} — in reading order. Open a question to peek at its answer.`),
        tree.length > 1
          ? el("p", { class: "kvp-jump" }, "Jump to ",
              tree.map((g) => el("a", { href: `#browse-part-${g.id}`, style: partStyle(g.id), title: partLabel(g.id),
                onclick: (e) => {
                  e.preventDefault();
                  const target = document.getElementById(`browse-part-${g.id}`);
                  target.scrollIntoView({ behavior: scrollBehavior() });
                  target.querySelector("h3").focus({ preventScroll: true });
                } }, `Part ${partInfo(g.id).roman}`)))
          : null),
      tree.map(browsePart));
    node.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-id], button[data-part]");
      if (!btn) return;
      if (btn.dataset.id) (C.has(btn.dataset.id) ? C.removeCards : C.addCards)([btn.dataset.id]);
      else {
        const ids = partCards(btn.dataset.part).map((c) => c.id);
        const missing = ids.filter((id) => !C.has(id));
        if (missing.length) C.addCards(missing);
        else C.removeCards(ids);
      }
    });
    show("browse", node, focus);
    syncBrowse();
  }

  function browsePart(group) {
    const p = partInfo(group.id);
    return el("section", { class: "kvp-part", id: `browse-part-${group.id}`, style: partStyle(group.id), "aria-labelledby": `browse-part-${group.id}-h` },
      el("header", { class: "kvp-part-head" },
        el("span", { class: "kvp-part-roman", "aria-hidden": "true", text: p.roman }),
        el("div", { class: "kvp-part-titles" },
          el("p", { class: "kvp-kicker", text: p.id ? `Part ${p.roman}` : "Other" }),
          el("h3", { id: `browse-part-${group.id}-h`, tabindex: "-1", text: p.title || `Part ${p.roman}` }),
          el("p", { class: "kvp-part-count", "data-part-count": group.id })),
        el("button", { type: "button", class: "kvp-btn kvp-part-btn", "data-part": group.id })),
      [...group.pages.values()].map((page) =>
        el("div", { class: "kvp-page" },
          el("h4", { class: "kvp-page-h" },
            el("a", { href: page.url || "#" }, el("span", { class: "kvp-page-num", text: page.num || "" }), ` ${page.title || ""}`)),
          el("ul", { class: "kvp-rows", role: "list" }, page.cards.map(browseRow)))));
  }

  let rowSeq = 0;
  function browseRow(card) {
    const qid = `kvp-rq-${++rowSeq}`;
    return el("li", { class: "kvp-row", "data-row": card.id },
      el("details", { class: "kvp-row-peek" },
        el("summary", {}, el("span", { class: "kvp-row-q", id: qid, html: C.toHTML(card, card.q) }),
          card.custom ? el("span", { class: "kvp-tag", text: "yours" }) : null),
        el("div", { class: "kvp-row-a" },
          el("p", { class: "kvp-row-ans" }, el("span", { class: "kvp-row-ans-l", text: "Answer " }), el("span", { html: C.toHTML(card, card.a) })),
          card.why ? el("div", { class: "kvp-row-why", html: C.toHTML(card, card.why) }) : null)),
      el("button", { type: "button", class: "kvp-toggle", "data-id": card.id, "aria-pressed": "false", "aria-describedby": qid }));
  }

  function syncBrowse() {
    const stage = S.dom.stage;
    stage.querySelectorAll(".kvp-toggle[data-id]").forEach((btn) => {
      const inDeck = C.has(btn.dataset.id);
      btn.setAttribute("aria-pressed", String(inDeck));
      btn.closest(".kvp-row").classList.toggle("is-in", inDeck);
      btn.replaceChildren(
        el("span", { class: "kvp-toggle-ico", "aria-hidden": "true", text: inDeck ? "✓" : "＋" }),
        el("span", { class: "kvp-toggle-l", text: inDeck ? "Added" : "Add" }));
    });
    stage.querySelectorAll("button[data-part]").forEach((btn) => {
      const id = btn.dataset.part;
      const ids = partCards(id).map((c) => c.id);
      const n = ids.filter((cid) => C.has(cid)).length;
      const all = n === ids.length;
      btn.classList.toggle("is-primary", !all);
      btn.textContent = all ? `Remove all ${ids.length}` : `＋ Add all ${n ? `${ids.length - n} remaining` : ids.length} from this Part`;
      const count = stage.querySelector(`[data-part-count="${CSS.escape(id)}"]`);
      if (count) count.textContent = `${n} of ${plural(ids.length, "card")} in your deck`;
    });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */

  function showLoadError() {
    S.mode = "error";
    root.replaceChildren(
      el("section", { class: "kvp-notice is-error", role: "alert" },
        el("span", { class: "kvp-orn", "aria-hidden": "true" }),
        el("h2", { text: "The card catalogue did not arrive" }),
        el("p", {}, "We could not load the list of flashcards — perhaps you are offline. Your deck is safe in this browser; try again in a moment."),
        el("p", { class: "kvp-actions" },
          el("button", { type: "button", class: "kvp-btn is-primary", onclick: load }, "Try again"))));
  }

  async function load() {
    root.replaceChildren(el("p", { class: "kvp-loading" }, el("span", { class: "kvp-orn", "aria-hidden": "true" }), "Shuffling the deck…"));
    try {
      const res = await fetch(PREFIX + "cards.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("cards.json is not an array");
      S.site = data.filter(isCard).map((c) => ({ ...c, wrong: Array.isArray(c.wrong) ? c.wrong : [] }));
    } catch (err) {
      console.warn("[practice] could not load cards.json:", err);
      showLoadError();
      return;
    }
    rebuildCatalogue();
    readHash();
    renderShell();
    renderStage();
  }

  function boot() {
    C = window.KVCards;
    root.classList.add("kvp");
    if (!C) {
      root.replaceChildren(el("p", { class: "kvp-notice is-error", role: "alert" }, "The flashcard engine (cards.js) did not load, so there is nothing to practise yet."));
      return;
    }
    C.onChange(onDeckChange);
    load();
  }

  // cards.js normally runs first; if not, wait until every script has run.
  if (window.KVCards || document.readyState === "complete") boot();
  else window.addEventListener("load", boot, { once: true });
})();
