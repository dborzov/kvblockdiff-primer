/* Page shell behaviour: theme, navigation drawer, keyboard paging, reading progress,
   the reference-setting switch (the Pin / the Bench: KV.setting, KV.ref, KV.setSetting, event kv:setting),
   and the hover/tap reminders for glossary terms (.term), math symbols (.sym) and Python notation (.nota). */
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

  // ------------------------------------------------------------ reference setting (the Pin / the Bench)
  // KV.settings, KV.settingDefault and KV.settingKeys come from assets/gen/site-data.js (data/settings.yaml),
  // and KV.fmt is lib/settings-fmt.js inlined there. The chosen setting lives in localStorage 'kvp.setting'.
  const SETTINGS = KV.settings || {};
  const SETTING_IDS = Object.keys(SETTINGS);
  const FMT = KV.fmt || { formatValue: v => (v == null ? 'not measured' : String(v)), fillTemplate: t => String(t == null ? '' : t), templateKeys: () => [] };
  function validSetting(id) { return id && SETTINGS[id] ? id : (SETTINGS[KV.settingDefault] ? KV.settingDefault : SETTING_IDS[0] || ''); }
  function nextSetting(id) { return SETTING_IDS[(SETTING_IDS.indexOf(validSetting(id)) + 1) % SETTING_IDS.length]; }
  KV.setting = validSetting(KV.store.get('kvp.setting', null));
  KV.settingLabel = id => (SETTINGS[validSetting(id || KV.setting)] || {}).label || '';
  // the raw value of a key (null = not measured) in the current setting, or in the setting `id`
  KV.ref = (key, id) => { const s = SETTINGS[validSetting(id || KV.setting)]; return s ? s.values[key] : undefined; };
  // the same, formatted ("640 B", "13.4 %", "not measured")
  KV.refFmt = (key, id) => { const spec = (KV.settingKeys || {})[key]; return spec ? FMT.formatValue(KV.ref(key, id), spec.fmt) : ''; };
  // a template with {key} placeholders, filled for the current setting (or the setting `id`)
  KV.refText = (tpl, id) => { const s = SETTINGS[validSetting(id || KV.setting)]; return s ? FMT.fillTemplate(tpl, s.values, KV.settingKeys || {}) : ''; };

  function paintSetting() {
    const s = SETTINGS[KV.setting];
    if (!s) return;
    R.setAttribute('data-setting', KV.setting);
    const pill = D.querySelector('.setting-pill');
    if (pill) {
      const next = SETTINGS[nextSetting(KV.setting)];
      pill.setAttribute('data-setting', KV.setting);
      // update the nodes in place: a replaced aria-live span is a new live region, and the announcement is lost
      const lab = pill.querySelector('.sp-label'), use = pill.querySelector('use');
      if (lab) lab.textContent = s.label; else pill.insertAdjacentHTML('beforeend', `<span class="sp-label" aria-live="polite">${esc(s.label)}</span>`);
      if (use) use.setAttribute('href', '#emb-' + (s.emblem || 'map')); else pill.insertAdjacentHTML('afterbegin', emblem(s.emblem || 'map'));
      pill.setAttribute('aria-label', `Reference setting for the examples: ${s.label}.` + (next && next !== s ? ` Press to switch to ${next.label}.` : ''));
      pill.title = `${s.label}: ${s.name}` + (next && next !== s ? ` — click for ${next.label}` : '');
    }
    D.querySelectorAll('.refv[data-key]').forEach(el => {
      const v = KV.refFmt(el.getAttribute('data-key'));
      if (el.textContent !== v) { el.textContent = v; el.classList.remove('is-fresh'); void el.offsetWidth; el.classList.add('is-fresh'); }
      el.title = 'in ' + s.label;
    });
  }
  function applySetting(id, store) {
    id = validSetting(id);
    if (!SETTINGS[id]) return;
    KV.setting = id;
    if (store) KV.store.set('kvp.setting', id);
    paintSetting();
    D.dispatchEvent(new CustomEvent('kv:setting', { detail: id }));
  }
  KV.setSetting = id => applySetting(id, true);

  // the "In the Pin: … · in the Bench: …" line of a reminder; a template without placeholders is shown as it is.
  // With a label (the notation reminders' "shape", "bytes"): "shape (in the Pin): … · in the Bench: …".
  function refLine(tpl, label) {
    const cur = SETTINGS[KV.setting];
    if (!tpl || !cur) return '';
    const lead = label ? `<b>${esc(label)}` : '';
    if (!FMT.templateKeys(tpl).length) return `<div class="pop-ref">${lead ? lead + ':</b> ' : ''}${esc(tpl)}</div>`;
    const others = SETTING_IDS.filter(id => id !== KV.setting)
      .map(id => `<span class="pop-ref-other"> · in ${esc(SETTINGS[id].label)}: ${esc(KV.refText(tpl, id))}</span>`).join('');
    return `<div class="pop-ref">${lead ? `${lead} (in ${esc(cur.label)}):</b>` : `<b>In ${esc(cur.label)}:</b>`} ${esc(KV.refText(tpl))}${others}</div>`;
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
        + `<div class="pop-short">${t.short}</div>${go}${refLine(t.ref)}`,
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
        + (home ? `<a class="pop-go" href="${esc(home.url)}">Introduced in ${esc(home.num)} ${esc(home.title)} →</a>` : '')
        + refLine(s.ref),
    };
  }
  function notaHtml(el) {
    const id = el.getAttribute('data-nota');
    const n = (KV.notation || {})[id];
    if (!n) return null;
    const home = n.home && (KV.pages || {})[n.home];
    return {
      color: 'var(--nota)',
      html: `<div class="pop-head"><span><code class="pop-code">${esc(n.code)}</code><div class="pop-name">${n.name}</div></span>`
        + `<span class="pop-cat">Python notation</span></div>`
        + `<div class="pop-short">${n.short}</div>`
        + refLine(n.shape, 'shape') + refLine(n.bytes, 'bytes')
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
    const info = el.classList.contains('term') ? termHtml(el) : el.classList.contains('nota') ? notaHtml(el) : symHtml(el);
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
  function remindable(target) { return target.closest && target.closest('.term, .sym, .nota'); }

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
    // a reminder is built when it opens; one that is open while the setting switches is rebuilt for the new setting
    D.addEventListener('kv:setting', () => { if (popFor) show(popFor); });
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

    // the reference-setting pill cycles through the settings; another tab's choice is followed too
    const sp = D.querySelector('.setting-pill');
    if (sp) sp.addEventListener('click', () => KV.setSetting(nextSetting(KV.setting)));
    paintSetting();
    addEventListener('storage', e => { if (e.key === 'kvp.setting') { const id = validSetting(KV.store.get('kvp.setting', null)); if (id !== KV.setting) applySetting(id, false); } });

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
