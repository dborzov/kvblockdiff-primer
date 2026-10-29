/* =====================================================================
   Flashcards, part 1 — runs on every page.
   - window.KVCards: the reader's deck (Leitner boxes) and their own
     cards, kept in localStorage. practice.js uses the same object.
   - #deck: the "Flashcards from this page" panel (+ "write your own").
   - .takeaway[data-sec]: an "add this section's cards" button.
   - #deck-count: the deck counter in the top bar.
   Data format and storage schema: docs/flashcards.md
   ===================================================================== */
(() => {
  "use strict";

  const KV = window.KV || {};
  const PREFIX = KV.prefix || "/";
  const KEY_DECK = "kvp.deck";
  const KEY_CUSTOM = "kvp.custom";
  const DAY = 24 * 60 * 60 * 1000;
  const INTERVALS = [0, 1, 3, 7, 16]; // days until a card in box 1..5 is due again
  const MAX_BOX = INTERVALS.length;

  /* ------------------------------------------------------------------
     Storage. localStorage may be missing, full or throw (private mode,
     blocked cookies): we then keep the deck in memory for this visit.
     ------------------------------------------------------------------ */

  function readJSON(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  const str = (v) => (typeof v === "string" ? v : "");
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  const int = (v, lo, hi, dflt) => (isNum(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt);

  function cleanDeck(raw) {
    const deck = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return deck;
    const now = Date.now();
    for (const [id, e] of Object.entries(raw)) {
      if (!e || typeof e !== "object") continue;
      deck[id] = {
        box: int(e.box, 1, MAX_BOX, 1),
        due: isNum(e.due) ? e.due : now,
        right: int(e.right, 0, 1e9, 0),
        wrong: int(e.wrong, 0, 1e9, 0),
        added: isNum(e.added) ? e.added : now,
      };
    }
    return deck;
  }

  function cleanCustom(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((c) => c && str(c.id).startsWith("custom/") && str(c.q).trim() && str(c.a).trim())
      .map((c) => ({
        id: c.id,
        q: c.q,
        a: c.a,
        wrong: (Array.isArray(c.wrong) ? c.wrong : []).filter((w) => str(w).trim()).slice(0, 3),
        why: str(c.why),
        sec: "",
        page: str(c.page),
        num: str(c.num),
        title: str(c.title),
        part: str(c.part),
        url: str(c.url),
        custom: true,
        created: isNum(c.created) ? c.created : 0,
      }));
  }

  let deck = cleanDeck(readJSON(KEY_DECK));
  let custom = cleanCustom(readJSON(KEY_CUSTOM));
  const listeners = new Set();

  function emit(reason, ids) {
    const detail = { reason, ids: ids || [], size: Object.keys(deck).length };
    for (const fn of listeners) {
      try {
        fn(detail);
      } catch (err) {
        console.error(err);
      }
    }
    document.dispatchEvent(new CustomEvent("kv:deck-change", { detail }));
  }

  const asList = (ids) => (Array.isArray(ids) ? ids : [ids]).filter((id) => typeof id === "string" && id);
  const newEntry = (now) => ({ box: 1, due: now, right: 0, wrong: 0, added: now });

  /* ------------------------------------------------------------------
     Public API
     ------------------------------------------------------------------ */

  function getDeck() {
    const copy = {};
    for (const [id, e] of Object.entries(deck)) copy[id] = { ...e };
    return copy;
  }

  const has = (id) => Object.prototype.hasOwnProperty.call(deck, id);
  const isDue = (entry, now = Date.now()) => !!entry && entry.due <= now;

  function addCards(ids) {
    const now = Date.now();
    const added = asList(ids).filter((id) => !has(id));
    for (const id of added) deck[id] = newEntry(now);
    if (added.length) {
      writeJSON(KEY_DECK, deck);
      emit("add", added);
    }
    return added.length;
  }

  function removeCards(ids) {
    const removed = asList(ids).filter(has);
    for (const id of removed) delete deck[id];
    if (removed.length) {
      writeJSON(KEY_DECK, deck);
      emit("remove", removed);
    }
    return removed.length;
  }

  /* Leitner step: right → one box up (max 5), wrong → back to box 1. */
  function answer(id, correct) {
    const e = deck[id];
    if (!e) return null;
    const from = e.box;
    e.box = correct ? Math.min(MAX_BOX, from + 1) : 1;
    e.due = Date.now() + INTERVALS[e.box - 1] * DAY;
    if (correct) e.right += 1;
    else e.wrong += 1;
    writeJSON(KEY_DECK, deck);
    emit("answer", [id]);
    return { id, correct: !!correct, from, to: e.box, due: e.due };
  }

  const customCards = () => custom.map((c) => ({ ...c, wrong: c.wrong.slice() }));

  /* Saves a reader-written card (plain text fields) and adds it to the deck. */
  function addCustom(fields) {
    const page = KV.page || {};
    const f = fields || {};
    const q = str(f.q).trim();
    const a = str(f.a).trim();
    if (!q || !a) return null;
    const now = Date.now();
    let stamp = now;
    while (custom.some((c) => c.id === "custom/" + stamp)) stamp += 1;
    const card = cleanCustom([{
      id: "custom/" + stamp,
      q,
      a,
      wrong: (f.wrong || []).map((w) => str(w).trim()),
      why: str(f.why).trim(),
      page: str(f.page) || str(page.id),
      num: str(f.num) || str(page.num),
      title: str(f.title) || str(page.title),
      part: str(f.part) || str(page.part),
      url: str(f.url) || str(page.url),
      created: now,
    }])[0];
    custom.push(card);
    deck[card.id] = newEntry(now);
    writeJSON(KEY_CUSTOM, custom);
    writeJSON(KEY_DECK, deck);
    emit("custom-add", [card.id]);
    return { ...card, wrong: card.wrong.slice() };
  }

  function deleteCustom(id) {
    const before = custom.length;
    custom = custom.filter((c) => c.id !== id);
    if (custom.length === before) return false;
    delete deck[id];
    writeJSON(KEY_CUSTOM, custom);
    writeJSON(KEY_DECK, deck);
    emit("custom-delete", [id]);
    return true;
  }

  function escapeHTML(s) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(s).replace(/[&<>"']/g, (ch) => map[ch]);
  }

  /* Site cards carry trusted, pre-rendered HTML; custom cards plain text. */
  function toHTML(card, text) {
    if (text == null) return "";
    return card && card.custom ? escapeHTML(text).replace(/\n/g, "<br>") : String(text);
  }

  function onChange(fn) {
    if (typeof fn !== "function") return () => {};
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  // Another tab changed the deck: reload and tell everyone.
  window.addEventListener("storage", (e) => {
    if (e.key !== null && e.key !== KEY_DECK && e.key !== KEY_CUSTOM) return;
    deck = cleanDeck(readJSON(KEY_DECK));
    custom = cleanCustom(readJSON(KEY_CUSTOM));
    emit("sync", []);
  });

  const KVCards = Object.freeze({
    INTERVALS: Object.freeze(INTERVALS.slice()),
    getDeck,
    has,
    isDue,
    addCards,
    removeCards,
    answer,
    customCards,
    addCustom,
    deleteCustom,
    toHTML,
    onChange,
  });
  window.KVCards = KVCards;

  /* ------------------------------------------------------------------
     DOM helpers
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
  const partStyle = (part) =>
    /^[A-Za-z0-9-]+$/.test(part || "") ? `--c: var(--part-${part}, var(--gold))` : null;
  let uid = 0;
  const nextId = (stem) => `${stem}-${++uid}`;

  const isCard = (c) => c && typeof c.id === "string" && typeof c.q === "string" && typeof c.a === "string";

  function readPageCards() {
    const script = document.getElementById("page-cards");
    if (!script) return [];
    try {
      const data = JSON.parse(script.textContent || "[]");
      return Array.isArray(data) ? data.filter(isCard) : [];
    } catch (err) {
      console.warn("[cards] #page-cards is not valid JSON:", err);
      return [];
    }
  }

  /* Heading text for a section id, without permalink glyphs. */
  function sectionTitle(sec) {
    const heading = sec && document.getElementById(sec);
    if (!heading) return sec ? sec.replace(/[-_]+/g, " ") : "";
    const clone = heading.cloneNode(true);
    clone.querySelectorAll("[aria-hidden='true'], .anchor, .header-anchor, .heading-anchor").forEach((n) => n.remove());
    return clone.textContent.replace(/[#¶§]\s*$/, "").trim();
  }

  /* ------------------------------------------------------------------
     Deck counter in the top bar
     ------------------------------------------------------------------ */

  function updateCounter() {
    const node = document.getElementById("deck-count");
    if (!node) return;
    const entries = Object.values(deck);
    const n = entries.length;
    const due = entries.filter((e) => isDue(e)).length;
    const slot = node.querySelector("[data-deck-n], .dc-n");
    if (slot) slot.textContent = String(n);
    else node.textContent = `🂠 ${n}`;
    node.setAttribute(
      "aria-label",
      `Your flashcard deck: ${plural(n, "card")}${due ? `, ${due} due now` : ""}. Open the practice page`
    );
    node.dataset.n = String(n);
    node.dataset.due = String(due);
  }

  /* ------------------------------------------------------------------
     Card faces: a small collectible card that flips to show the answer
     ------------------------------------------------------------------ */

  function cardFace(card, { deletable = false } = {}) {
    const qid = nextId("kvc-q");
    const band = (label) =>
      el("div", { class: "kvc-band" },
        el("span", { class: "kvc-band-num", text: card.num || "" }),
        el("span", { class: "kvc-band-label", text: label }));
    const foot = (peekLabel) =>
      el("div", { class: "kvc-foot" },
        el("button", { type: "button", class: "kvc-mini kvc-peek", "aria-describedby": qid },
          el("span", { class: "kvc-ico", "aria-hidden": "true", text: peekLabel === "Peek" ? "↻" : "↺" }),
          peekLabel),
        el("button", { type: "button", class: "kvc-mini kvc-add", "data-id": card.id, "aria-describedby": qid, "aria-pressed": "false" }));

    const front = el("div", { class: "kvc-face kvc-front" },
      band(card.custom ? "Yours" : "Question"),
      el("div", { class: "kvc-body" }, el("div", { class: "kvc-q", id: qid, html: toHTML(card, card.q) })),
      foot("Peek"));
    const back = el("div", { class: "kvc-face kvc-back", "aria-hidden": "true" },
      band("Answer"),
      el("div", { class: "kvc-body" },
        el("div", { class: "kvc-a", html: toHTML(card, card.a) }),
        card.why ? el("div", { class: "kvc-why", html: toHTML(card, card.why) }) : null),
      foot("Hide"));
    back.inert = true;

    if (deletable) {
      for (const face of [front, back]) {
        face.querySelector(".kvc-band").append(
          el("button", { type: "button", class: "kvc-del", "data-id": card.id, "aria-label": "Delete this card", "aria-describedby": qid },
            el("span", { "aria-hidden": "true", text: "✕" })));
      }
    }

    return el("li", { class: "kvc-card", "data-id": card.id, style: partStyle(card.part) },
      el("div", { class: "kvc-flip" }, front, back));
  }

  function flip(cardNode) {
    const flipped = cardNode.classList.toggle("is-flipped");
    const [front, back] = cardNode.querySelectorAll(".kvc-face");
    front.inert = flipped;
    back.inert = !flipped;
    front.setAttribute("aria-hidden", String(flipped));
    back.setAttribute("aria-hidden", String(!flipped));
    (flipped ? back : front).querySelector(".kvc-peek").focus({ preventScroll: true });
  }

  function syncAddButtons(scope) {
    scope.querySelectorAll(".kvc-add[data-id]").forEach((btn) => {
      const inDeck = has(btn.dataset.id);
      btn.setAttribute("aria-pressed", String(inDeck));
      btn.replaceChildren(
        el("span", { class: "kvc-ico", "aria-hidden": "true", text: inDeck ? "✓" : "＋" }),
        inDeck ? "Added" : "Add");
    });
    scope.querySelectorAll(".kvc-card[data-id]").forEach((li) => li.classList.toggle("is-in", has(li.dataset.id)));
  }

  /* Two-step delete: first press arms the button, second press deletes. */
  function pressDelete(btn) {
    if (btn.classList.contains("is-armed")) {
      deleteCustom(btn.dataset.id);
      return;
    }
    btn.classList.add("is-armed");
    btn.setAttribute("aria-label", "Press again to delete this card");
    btn.replaceChildren(el("span", { "aria-hidden": "true", text: "Delete?" }));
    const disarm = () => {
      btn.classList.remove("is-armed");
      btn.setAttribute("aria-label", "Delete this card");
      btn.replaceChildren(el("span", { "aria-hidden": "true", text: "✕" }));
    };
    setTimeout(disarm, 4000);
    btn.addEventListener("blur", disarm, { once: true });
  }

  /* ------------------------------------------------------------------
     "Write your own card" form
     ------------------------------------------------------------------ */

  function writeForm(compact) {
    const page = KV.page || {};
    const id = nextId("kvc-f");
    const field = (name, label, opts = {}) => {
      const input = opts.multiline
        ? el("textarea", { id: `${id}-${name}`, name, rows: opts.rows || 2, maxlength: opts.max || 600, required: opts.required })
        : el("input", { id: `${id}-${name}`, name, type: "text", maxlength: opts.max || 200, required: opts.required, autocomplete: "off" });
      return el("div", { class: "kvc-field" },
        el("label", { for: input.id }, label, opts.hint ? el("span", { class: "kvc-hint", text: ` ${opts.hint}` }) : null),
        input);
    };
    const msg = el("p", { class: "kvc-form-msg", role: "status" });
    const form = el("form", { class: "kvc-form", novalidate: true },
      el("p", { class: "kvc-form-note" },
        "Your card is saved in this browser only, filed under ",
        el("b", { text: [page.num, page.title].filter(Boolean).join(" ") || "this page" }),
        ", and added to your deck."),
      field("q", "Question", { multiline: true, required: true, max: 500 }),
      field("a", "Correct answer", { required: true }),
      el("fieldset", { class: "kvc-wrongs" },
        el("legend", {}, "Wrong answers", el("span", { class: "kvc-hint", text: " optional — become the multiple-choice decoys" })),
        el("div", { class: "kvc-wrongs-grid" },
          [1, 2, 3].map((i) =>
            el("input", { name: `w${i}`, type: "text", maxlength: 200, autocomplete: "off", "aria-label": `Wrong answer ${i}`, placeholder: `Decoy ${i}` })))),
      field("why", "Why", { multiline: true, rows: 2, max: 1000, hint: "optional — shown after answering" }),
      el("div", { class: "kvc-form-actions" },
        el("button", { type: "submit", class: "kvc-btn is-primary" }, "Save card"),
        msg));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const missing = ["q", "a"].find((k) => !String(data.get(k) || "").trim());
      if (missing) {
        const input = form.elements[missing];
        input.setAttribute("aria-invalid", "true");
        msg.textContent = missing === "q" ? "Write a question first." : "Give the correct answer too.";
        msg.classList.add("is-error");
        input.focus();
        return;
      }
      const card = addCustom({
        q: data.get("q"),
        a: data.get("a"),
        wrong: [data.get("w1"), data.get("w2"), data.get("w3")],
        why: data.get("why"),
      });
      form.reset();
      form.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));
      msg.classList.remove("is-error");
      msg.textContent = card ? "Saved — it is in your deck now. Write another?" : "Could not save that card.";
      form.elements.q.focus();
    });
    form.addEventListener("input", (e) => {
      if (e.target.hasAttribute("aria-invalid") && e.target.value.trim()) e.target.removeAttribute("aria-invalid");
    });

    return el("details", { class: "kvc-write" },
      el("summary", {}, el("span", { class: "kvc-write-title", text: compact ? "Write your own flashcard for this page" : "Write your own card" })),
      form);
  }

  /* ------------------------------------------------------------------
     The deck panel (#deck)
     ------------------------------------------------------------------ */

  function buildPanel(host, pageCards) {
    const page = KV.page || {};
    const compact = pageCards.length === 0;
    const pageCustom = () => custom.filter((c) => c.page && c.page === page.id);
    const allIds = () => pageCards.map((c) => c.id).concat(pageCustom().map((c) => c.id));

    const panel = el("div", { class: `kvc-panel${compact ? " is-compact" : ""}` });
    const status = el("p", { class: "kvc-status", "aria-live": "polite" });
    const pips = el("span", { class: "kvc-pips", "aria-hidden": "true" });
    const addAll = el("button", { type: "button", class: "kvc-btn is-primary", "data-act": "add-all" });
    const removeAll = el("button", { type: "button", class: "kvc-btn", "data-act": "remove-all" }, "Remove all");
    const practise = el("a", { class: "kvc-link", href: PREFIX + "practice/" }, "Practise your deck ", el("span", { "aria-hidden": "true", text: "→" }));

    if (!compact) {
      panel.append(el("header", { class: "kvc-head" },
        el("span", { class: "kvc-orn", "aria-hidden": "true" }),
        el("p", { class: "kvc-kicker" },
          page.num ? el("span", { class: "kvc-kicker-num", text: page.num }) : null,
          page.title ? ` ${page.title}` : ""),
        el("h2", { class: "kvc-title" }, "Flashcards from this page"),
        el("div", { class: "kvc-tally" }, pips, status),
        el("div", { class: "kvc-actions" }, addAll, removeAll, practise)));

      const groups = new Map();
      for (const card of pageCards) {
        const key = card.sec || "";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(card);
      }
      const titled = groups.size > 1 || !groups.has("");
      for (const [sec, cards] of groups) {
        const heading = titled
          ? el("h3", { class: "kvc-sec" },
              sec ? el("a", { href: `#${encodeURIComponent(sec)}`, text: sectionTitle(sec) }) : "Also on this page")
          : null;
        panel.append(el("section", { class: "kvc-group" }, heading, el("ul", { class: "kvc-grid", role: "list" }, cards.map((c) => cardFace(c)))));
      }
    }

    const mineList = el("ul", { class: "kvc-grid", role: "list" });
    const mine = el("section", { class: "kvc-group kvc-mine", hidden: true },
      el("h3", { class: "kvc-sec", tabindex: "-1" }, "Your own cards"),
      mineList,
      compact ? el("p", { class: "kvc-mine-foot" }, practise.cloneNode(true)) : null);
    panel.append(mine, page.id ? writeForm(compact) : null);
    host.replaceChildren(panel);
    host.hidden = false;

    panel.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn || !panel.contains(btn)) return;
      if (btn.classList.contains("kvc-peek")) flip(btn.closest(".kvc-card"));
      else if (btn.classList.contains("kvc-add")) (has(btn.dataset.id) ? removeCards : addCards)([btn.dataset.id]);
      else if (btn.classList.contains("kvc-del")) pressDelete(btn);
      else if (btn.dataset.act === "add-all" && btn.getAttribute("aria-disabled") !== "true") addCards(allIds());
      else if (btn.dataset.act === "remove-all" && btn.getAttribute("aria-disabled") !== "true") removeCards(allIds());
    });

    let mineKey = null;
    function renderMine() {
      const cards = pageCustom();
      const key = cards.map((c) => c.id).join("|");
      if (key === mineKey) return;
      const hadFocus = mine.contains(document.activeElement);
      mineKey = key;
      mineList.replaceChildren(...cards.map((c) => cardFace(c, { deletable: true })));
      mine.hidden = cards.length === 0;
      if (hadFocus) (cards.length ? mine.querySelector(".kvc-sec") : panel.querySelector(".kvc-write > summary")).focus();
    }

    function refresh() {
      renderMine();
      syncAddButtons(panel);
      if (compact) return;
      const ids = allIds();
      const inDeck = ids.filter(has).length;
      status.textContent = inDeck === 0
        ? `None of this page’s ${plural(ids.length, "card")} is in your deck yet`
        : inDeck === ids.length
          ? `All ${plural(ids.length, "card")} from this page are in your deck`
          : `${inDeck} of ${plural(ids.length, "card")} from this page ${inDeck === 1 ? "is" : "are"} in your deck`;
      pips.replaceChildren(...ids.map((id) => el("i", { class: has(id) ? "is-in" : "" })));
      addAll.textContent = inDeck === ids.length ? "All added" : `Add all ${ids.length}`;
      addAll.setAttribute("aria-disabled", String(inDeck === ids.length));
      removeAll.setAttribute("aria-disabled", String(inDeck === 0));
    }

    return refresh;
  }

  /* ------------------------------------------------------------------
     Per-section buttons inside .takeaway[data-sec]
     ------------------------------------------------------------------ */

  function buildTakeaways(pageCards) {
    const refreshers = [];
    document.querySelectorAll(".takeaway[data-sec]").forEach((aside) => {
      const ids = pageCards.filter((c) => c.sec && c.sec === aside.dataset.sec).map((c) => c.id);
      if (!ids.length || aside.querySelector(".kvc-tk")) return;
      const icon = el("span", { class: "kvc-tk-ico", "aria-hidden": "true" });
      const label = el("span", { class: "kvc-tk-label" });
      const btn = el("button", { type: "button", class: "kvc-tk-btn", "aria-pressed": "false" }, icon, label);
      btn.addEventListener("click", () => {
        const missing = ids.filter((id) => !has(id));
        if (missing.length) addCards(missing);
        else removeCards(ids);
      });
      aside.append(el("div", { class: "kvc-tk deck-add" }, btn));
      refreshers.push(() => {
        const missing = ids.filter((id) => !has(id)).length;
        const all = missing === 0;
        btn.setAttribute("aria-pressed", String(all));
        icon.textContent = all ? "✓" : "＋";
        if (all) {
          label.textContent = "In your deck";
          btn.title = `Remove ${ids.length === 1 ? "this card" : `these ${ids.length} cards`} from your deck`;
        } else {
          btn.removeAttribute("title");
          label.textContent = missing === ids.length
            ? (ids.length === 1 ? "Add the flashcard from this section" : `Add the ${ids.length} flashcards from this section`)
            : `Add the ${missing} remaining ${missing === 1 ? "flashcard" : "flashcards"} from this section`;
        }
      });
    });
    return refreshers;
  }

  /* ------------------------------------------------------------------
     Wire up
     ------------------------------------------------------------------ */

  function init() {
    const pageCards = readPageCards();
    const host = document.getElementById("deck");
    const refreshers = [updateCounter];
    if (host && (pageCards.length || (KV.page && KV.page.id))) refreshers.push(buildPanel(host, pageCards));
    else if (host) host.hidden = true;
    refreshers.push(...buildTakeaways(pageCards));
    const refresh = () => refreshers.forEach((fn) => fn());
    onChange(refresh);
    refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
