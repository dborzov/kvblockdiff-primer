/* Page shell behaviour: theme, navigation drawer, keyboard paging, reading progress,
   and the hover/tap reminders for glossary terms (.term) and math symbols (.sym). */
(function () {
  'use strict';
  const KV = (window.KV = window.KV || {});
  const D = document, R = D.documentElement;

  // ------------------------------------------------------------ storage that never throws
  KV.store = KV.store || {
    get(k, dflt) { try { const v = localStorage.getItem(k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const emblem = name => `<svg class="emb" aria-hidden="true"><use href="#emb-${esc(name)}"></use></svg>`;
  const CAT_EMBLEM = { info: 'spark', coding: 'envelope', stats: 'bell', linalg: 'axes', numbers: 'loggrid', systems: 'chip', llm: 'eye', project: 'seal' };

  // ------------------------------------------------------------ theme
  function isDark() {
    const t = R.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function setTheme(t) {
    R.setAttribute('data-theme', t);
    try { localStorage.setItem('kvp.theme', t); } catch (e) { /* ignore */ }
    D.dispatchEvent(new CustomEvent('kv:theme', { detail: t }));
  }

  // ------------------------------------------------------------ navigation drawer
  function openNav(open) {
    D.body.classList.toggle('nav-open', open);
    const bd = D.querySelector('.backdrop');
    if (bd) bd.hidden = !open;
    const btn = D.querySelector('.menu-btn');
    if (btn) btn.setAttribute('aria-expanded', String(open));
    if (open) { const cur = D.querySelector('.sidenav [aria-current="page"]') || D.querySelector('.sn-home'); cur && cur.focus({ preventScroll: true }); }
  }

  // ------------------------------------------------------------ reminders (popovers)
  let pop = null, popFor = null, hideTimer = 0, showTimer = 0;
  const HOVER = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  function termHtml(el) {
    const id = el.getAttribute('data-term');
    const t = (KV.glossary || {})[id];
    if (!t) return null;
    const cat = (KV.cats || {})[t.cat] || {};
    const isDef = el.tagName === 'DFN';
    const where = el.getAttribute('data-def');
    const go = isDef
      ? `<span class="pop-go">✦ This is where it is defined.</span>`
      : `<a class="pop-go" href="${esc(el.getAttribute('href'))}">${where ? `Defined in ${esc(where)} →` : 'Go to the definition →'}</a>`;
    return {
      color: t.brand ? `var(--t-${id})` : `var(--cat-${t.cat})`,
      html: `<div class="pop-head"><span class="pop-emb">${emblem(t.brand ? t.emblem : CAT_EMBLEM[t.cat] || 'seal')}</span>`
        + `<span><div class="pop-name">${esc(t.name || t.label)}</div>${t.nick ? `<div class="pop-nick">“${esc(t.nick)}”</div>` : ''}</span>`
        + `<span class="pop-cat">${esc(cat.label || '')}</span></div>`
        + `<div class="pop-short">${t.short}</div>${go}`,
    };
  }
  function symHtml(el) {
    const m = /(?:^|\s)s-([A-Za-z]+)(?:\s|$)/.exec(el.className);
    const s = m && (KV.symbols || {})[m[1]];
    if (!s) return null;
    const fam = (KV.fams || {})[s.fam] || {};
    const home = s.home && (KV.pages || {})[s.home];
    return {
      color: `var(--fam-${s.fam})`,
      html: `<div class="pop-head"><span class="pop-sym">${s.html}</span><span><div class="pop-name">${s.name}</div>`
        + (s.unit ? `<div class="pop-unit">unit: ${s.unit}</div>` : '') + `</span><span class="pop-cat">${esc(fam.label || '')}</span></div>`
        + `<div class="pop-short">${s.short}</div>`
        + (home ? `<a class="pop-go" href="${esc(home.url)}">Introduced in ${esc(home.num)} ${esc(home.title)} →</a>` : ''),
    };
  }
  function place(anchor) {
    const r = anchor.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    let x = Math.min(Math.max(8, r.left + r.width / 2 - pr.width / 2), innerWidth - pr.width - 8);
    let y = r.bottom + 8;
    if (y + pr.height > innerHeight - 8) y = Math.max(8, r.top - pr.height - 8);
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  function show(el) {
    const info = el.classList.contains('term') ? termHtml(el) : symHtml(el);
    if (!info) return;
    clearTimeout(hideTimer);
    if (!pop) {
      pop = D.createElement('div');
      pop.className = 'pop'; pop.setAttribute('role', 'tooltip'); pop.hidden = true;
      pop.addEventListener('pointerenter', () => clearTimeout(hideTimer));
      pop.addEventListener('pointerleave', () => hideSoon());
      D.body.appendChild(pop);
    }
    pop.style.setProperty('--tc', info.color);
    pop.innerHTML = info.html;
    pop.hidden = false; popFor = el;
    place(el);
  }
  function hide() { if (pop) pop.hidden = true; popFor = null; }
  function hideSoon() { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 220); }
  function remindable(target) { return target.closest && target.closest('.term, .sym'); }

  function wireReminders() {
    if (HOVER) {
      D.addEventListener('pointerover', e => {
        const el = remindable(e.target);
        if (!el || el === popFor) return;
        clearTimeout(showTimer);
        showTimer = setTimeout(() => show(el), 160);
      });
      D.addEventListener('pointerout', e => {
        const el = remindable(e.target);
        if (!el) return;
        clearTimeout(showTimer);
        if (!el.contains(e.relatedTarget)) hideSoon();
      });
      D.addEventListener('focusin', e => { const el = remindable(e.target); if (el) show(el); });
      D.addEventListener('focusout', e => { if (remindable(e.target)) hideSoon(); });
    } else {
      // touch: the first tap shows the reminder; its link leads on to the definition
      D.addEventListener('click', e => {
        const el = remindable(e.target);
        if (el) {
          if (popFor !== el) { e.preventDefault(); show(el); }
          return;
        }
        if (pop && !pop.contains(e.target)) hide();
      }, true);
    }
    addEventListener('scroll', () => { if (popFor && HOVER) hide(); else if (popFor) place(popFor); }, { passive: true });
    addEventListener('keydown', e => { if (e.key === 'Escape') { hide(); openNav(false); } });
  }

  // ------------------------------------------------------------ flash the target of an in-page link
  function flashHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const el = D.getElementById(id);
    if (!el) return;
    const details = el.closest('details');
    if (details) details.open = true;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  // ------------------------------------------------------------ boot
  function boot() {
    const tb = D.querySelector('.theme-btn');
    if (tb) tb.addEventListener('click', () => setTheme(isDark() ? 'light' : 'dark'));

    const mb = D.querySelector('.menu-btn');
    if (mb) mb.addEventListener('click', () => openNav(!D.body.classList.contains('nav-open')));
    D.querySelectorAll('.sn-close, .backdrop').forEach(b => b.addEventListener('click', () => openNav(false)));
    D.querySelectorAll('.sidenav a').forEach(a => a.addEventListener('click', () => openNav(false)));

    // remember what has been read, and show it in the navigation
    const read = new Set(KV.store.get('kvp.read', []));
    if (KV.page && KV.page.id) { read.add(KV.page.id); KV.store.set('kvp.read', [...read]); }
    D.querySelectorAll('.sn-pages a[data-page]').forEach(a => { if (read.has(a.dataset.page)) a.classList.add('is-read'); });
    const cur = D.querySelector('.sidenav [aria-current="page"]');
    if (cur) cur.scrollIntoView({ block: 'center' });

    // ← → page through the site; g: glossary; p: practice
    addEventListener('keydown', e => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return;
      if (D.getElementById('practice-app')) return;   // the quiz owns the keyboard there
      const go = sel => { const a = D.querySelector(sel); if (a) location.href = a.href; };
      if (e.key === 'ArrowRight') go('a[rel="next"]');
      else if (e.key === 'ArrowLeft') go('a[rel="prev"]');
      else if (e.key === 'g') location.href = (KV.prefix || '/') + 'reference/glossary/';
      else if (e.key === 'p') location.href = (KV.prefix || '/') + 'practice/';
    });

    wireReminders();
    flashHash();
    addEventListener('hashchange', flashHash);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
