/* =====================================================================
   figs-loader.js — the figure registry and lazy builder.

   Markup (emitted by the build):
     <figure class="plate" id="fig-x" data-fig="builderName">
       <div class="fig-host"></div><figcaption>…</figcaption>
     </figure>
   Builders live in per-Part scripts loaded (deferred) after this one:
     FIG.builderName = (host, figure) => { … }   // may return a Promise

   Each figure is built once, when it comes within ~600px of the viewport.
   Success → figure[data-built="1"]. Failure (missing builder, throw or
   rejected promise) → figure[data-built="error"] plus a visible
   .fig-error box in the host and a console.error.
   window.buildAllFigures() builds everything now (checker, printing).
   ===================================================================== */
(function () {
  'use strict';
  window.FIG = window.FIG || {};
  const MARGIN = '600px 0px';
  let io = null;

  function hostOf(fig) {
    let host = fig.querySelector(':scope > .fig-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'fig-host';
      fig.insertBefore(host, fig.querySelector(':scope > figcaption'));
    }
    return host;
  }

  function fail(fig, host, name, err) {
    const msg = err && err.message ? err.message : String(err);
    console.error(`[figures] FIG.${name} (#${fig.id || '?'}) failed:`, err);
    fig.dataset.built = 'error';
    const box = document.createElement('div');
    box.className = 'fig-error';
    box.setAttribute('role', 'alert');
    box.innerHTML = '<b></b><code></code>';
    box.firstChild.textContent = `Figure “${name}” could not be drawn.`;
    box.lastChild.textContent = msg;
    host.prepend(box);
  }

  /** Build one figure element (no-op if already built or attempted). */
  function buildFigure(fig) {
    if (!fig || fig.dataset.built) return fig && fig.dataset.built;
    if (io) io.unobserve(fig);
    const name = fig.dataset.fig, host = hostOf(fig);
    fig.dataset.built = 'pending';
    try {
      const fn = window.FIG[name];
      if (typeof fn !== 'function') throw new Error(`No builder FIG.${name} — is its figures script loaded, and is the name spelled the same in data-fig?`);
      const out = fn(host, fig);
      if (out && typeof out.then === 'function') {
        out.then(() => { if (fig.dataset.built === 'pending') fig.dataset.built = '1'; },
          err => fail(fig, host, name, err));
      } else {
        fig.dataset.built = '1';
      }
    } catch (err) {
      fail(fig, host, name, err);
    }
    return fig.dataset.built;
  }

  const figures = () => [...document.querySelectorAll('figure[data-fig]')];

  /** Force-build every figure; returns {total, built, failed:[names]}. */
  function buildAllFigures() {
    const all = figures();
    all.forEach(buildFigure);
    const failed = all.filter(f => f.dataset.built === 'error').map(f => f.dataset.fig);
    return { total: all.length, built: all.length - failed.length, failed };
  }

  let started = false;
  function init() {
    if (started) return;
    started = true;
    const all = figures();
    if (!('IntersectionObserver' in window)) { all.forEach(buildFigure); return; }
    io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) buildFigure(e.target); });
    }, { rootMargin: MARGIN });
    all.forEach(f => io.observe(f));
  }

  window.buildFigure = buildFigure;
  window.buildAllFigures = buildAllFigures;
  addEventListener('beforeprint', buildAllFigures);

  // Deferred figure scripts run after this file but before DOMContentLoaded,
  // so wait for that event (readyState is already "interactive" here).
  if (document.readyState === 'complete') setTimeout(init);
  else {
    document.addEventListener('DOMContentLoaded', init);
    addEventListener('load', init);
  }
})();
