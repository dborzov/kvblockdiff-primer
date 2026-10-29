/* =====================================================================
   cgraph.js — concept graphs.

   Markup (emitted by the build):
     <div class="cgraph" id="graph-x" style="--cols:5">
       <div class="cg-heads"><div class="cg-head" style="--col:1">…</div>…</div>
       <div class="cg-grid">
         <a|div class="cg-node" data-node="key" style="--col:1;--row:1;--nc:var(--cat-info)">
           <span class="cg-emb"><svg class="emb"><use href="#emb-…"/></svg></span>
           <span class="cg-title">…</span><span class="cg-text">…</span>
         </a>
       </div>
       <script type="application/json" class="cg-edges">[["from","to","label"],…]</script>
     </div>

   CSS places the cards on the grid; this script draws curved connectors
   (SVG under the cards, labels above), highlights a card's neighbourhood on
   hover/focus, and adds a "leads to" line used by the stacked phone layout.
   ===================================================================== */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const NARROW = 640;               // keep in sync with the @container rule in figures.css
  const HEAD = 7.5, HALF = 4;       // arrowhead length / half-width (px)

  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const div = (cls, text) => {
    const e = document.createElement('span');
    e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const titleOf = n => (n.querySelector('.cg-title') || n).textContent.trim();

  function readEdges(root, nodes) {
    let raw = [];
    const src = root.querySelector('script.cg-edges');
    try { raw = JSON.parse(src ? src.textContent : '[]'); } catch (err) { console.error(`[cgraph] #${root.id}: bad edge JSON`, err); }
    return raw.map(([a, b, label]) => ({ a, b, label: label || '', from: nodes.get(a), to: nodes.get(b) }))
      .filter(e => {
        if (e.from && e.to && e.a !== e.b) return true;
        console.warn(`[cgraph] #${root.id}: skipping edge ${e.a} → ${e.b} (unknown node)`);
        return false;
      });
  }

  /* Phone layout helpers: section heads inside the grid, "leads to" lines. */
  function addNarrowFurniture(root, grid, nodes, edges) {
    root.querySelectorAll('.cg-heads .cg-head').forEach(hd => {
      const s = document.createElement('div');
      s.className = 'cg-sechead';
      s.setAttribute('style', hd.getAttribute('style') || '');
      s.innerHTML = hd.innerHTML;
      grid.appendChild(s);
    });
    nodes.forEach((n, key) => {
      const outs = edges.filter(e => e.a === key).map(e => titleOf(e.to));
      if (!outs.length) return;
      const line = div('cg-leads');
      line.append(div('cg-leads-k', '→ leads to: '));
      outs.forEach((t, i) => { if (i) line.append(', '); line.append(div('cg-leads-n', t)); });
      n.appendChild(line);
    });
  }

  /* Box of a card relative to the grid's top-left corner. */
  function box(n, G) {
    const r = n.getBoundingClientRect();
    const l = r.left - G.left, t = r.top - G.top;
    return { l, t, r: l + r.width, b: t + r.height, cx: l + r.width / 2, cy: t + r.height / 2, w: r.width, h: r.height };
  }

  /* Choose which sides an edge leaves and enters. */
  function route(A, B, others, firstRowTop) {
    if (A.r <= B.l || B.r <= A.l) {
      const [L, R] = A.r <= B.l ? [A, B] : [B, A];
      // same row with a card in between: arc through the gap above (or below the first row)
      const sameRow = A.t < B.b && B.t < A.b;
      const blocked = sameRow && others.some(O => O.l >= L.r - 1 && O.r <= R.l + 1 && O.t < Math.max(A.b, B.b) && O.b > Math.min(A.t, B.t));
      if (blocked) return Math.min(A.t, B.t) <= firstRowTop + 1 ? ['bottom', 'bottom'] : ['top', 'top'];
      return A.r <= B.l ? ['right', 'left'] : ['left', 'right'];
    }
    const down = A.cy < B.cy;
    const [top, bot] = down ? [A, B] : [B, A];
    // a card stacked between the two? loop around it on the right
    const blocked = others.some(O => O.t >= top.b - 1 && O.b <= bot.t + 1 && O.r > Math.max(A.l, B.l) && O.l < Math.min(A.r, B.r));
    if (blocked) return ['right', 'right'];
    return down ? ['bottom', 'top'] : ['top', 'bottom'];
  }

  /* Spread several connectors on one side of a card across its middle. */
  function assignPorts(edges) {
    const ports = new Map();
    const add = (key, side, e, end, other) => {
      const id = key + '|' + side;
      if (!ports.has(id)) ports.set(id, []);
      ports.get(id).push({ e, end, other });
    };
    edges.forEach(e => {
      add(e.a, e.sides[0], e, 0, e.B);
      add(e.b, e.sides[1], e, 1, e.A);
    });
    ports.forEach((list, id) => {
      const side = id.split('|')[1], vertical = side === 'left' || side === 'right';
      list.sort((p, q) => (vertical ? p.other.cy - q.other.cy : p.other.cx - q.other.cx));
      list.forEach((p, k) => {
        const B = p.end ? p.e.B : p.e.A;
        const f = (k + 1) / (list.length + 1), span = 0.6;
        const u = 0.5 + (f - 0.5) * span;
        const pt = side === 'left' ? [B.l, B.t + B.h * u] : side === 'right' ? [B.r, B.t + B.h * u]
          : side === 'top' ? [B.l + B.w * u, B.t] : [B.l + B.w * u, B.b];
        p.e.pts[p.end] = pt;
      });
    });
  }

  const OUT = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };

  /* Cubic connector: path data, arrowhead data and the control points. */
  function geometry(e, gap) {
    const [p0, p3] = e.pts, [s0, s1] = e.sides;
    const o0 = OUT[s0], o1 = OUT[s1];
    const dist = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
    // a same-side loop must stay inside its gap (its bulge is ~0.75k)
    const k = s0 === s1 ? Math.min(34 + 0.12 * dist, (o0[0] ? gap.x : gap.y) * 1.15)
      : Math.max(22, 0.42 * (s0 === 'left' || s0 === 'right' ? Math.abs(p3[0] - p0[0]) : Math.abs(p3[1] - p0[1])));
    const c1 = [p0[0] + o0[0] * k, p0[1] + o0[1] * k];
    const c2 = [p3[0] + o1[0] * k, p3[1] + o1[1] * k];
    // the head points along -o1 (into the card); stop the stroke at its base
    const end = [p3[0] + o1[0] * HEAD, p3[1] + o1[1] * HEAD];
    const n = [-o1[1], o1[0]];
    const head = `M${p3[0]} ${p3[1]}L${end[0] + n[0] * HALF} ${end[1] + n[1] * HALF}L${end[0] - n[0] * HALF} ${end[1] - n[1] * HALF}Z`;
    const d = `M${p0[0]} ${p0[1]}C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${end[0]} ${end[1]}`;
    return { d, head, ctrl: [p0, c1, c2, p3] };
  }
  const bezier = ([a, b, c, d], t) => [0, 1].map(i => {
    const u = 1 - t;
    return u * u * u * a[i] + 3 * u * u * t * b[i] + 3 * u * t * t * c[i] + t * t * t * d[i];
  });

  /* Put a label on the curve where it does not cover a card (middle first). */
  function labelPoint(ctrl, w, h, boxes) {
    const clear = ([x, y]) => boxes.every(B => x + w / 2 < B.l - 2 || x - w / 2 > B.r + 2 || y + h / 2 < B.t - 2 || y - h / 2 > B.b + 2);
    for (const t of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82]) {
      const p = bezier(ctrl, t);
      if (clear(p)) return p;
    }
    return bezier(ctrl, 0.5);
  }

  function setup(root) {
    if (root.dataset.cgReady) return;
    root.dataset.cgReady = '1';
    const grid = root.querySelector('.cg-grid');
    if (!grid) return;
    const nodes = new Map([...grid.querySelectorAll('.cg-node[data-node]')].map(n => [n.dataset.node, n]));
    const edges = readEdges(root, nodes);

    const svg = svgEl('svg', { class: 'cg-wires', 'aria-hidden': 'true' });
    grid.prepend(svg);
    const labels = document.createElement('div');
    labels.className = 'cg-labels';
    labels.setAttribute('aria-hidden', 'true');
    grid.appendChild(labels);
    addNarrowFurniture(root, grid, nodes, edges);

    edges.forEach(e => {
      e.g = svgEl('g', { class: 'cg-edge' }, svg);
      e.g.style.setProperty('--ec', e.from.style.getPropertyValue('--nc') || 'var(--c)');
      e.path = svgEl('path', { class: 'cg-wire' }, e.g);
      e.head = svgEl('path', { class: 'cg-head-mark' }, e.g);
      if (e.label) { e.lab = div('cg-elabel', e.label); labels.appendChild(e.lab); }
    });

    // neighbourhoods for highlighting
    const near = new Map([...nodes.keys()].map(k => [k, new Set()]));
    edges.forEach(e => { near.get(e.a).add(e.b); near.get(e.b).add(e.a); });

    function draw() {
      const narrow = root.clientWidth < NARROW;
      root.classList.toggle('cg-narrow', narrow);
      if (narrow) return;
      const G = grid.getBoundingClientRect();
      svg.setAttribute('width', G.width); svg.setAttribute('height', G.height);
      svg.setAttribute('viewBox', `0 0 ${G.width} ${G.height}`);
      const boxes = new Map([...nodes].map(([k, n]) => [k, box(n, G)]));
      const firstRowTop = Math.min(...[...boxes.values()].map(b => b.t));
      edges.forEach(e => {
        e.A = boxes.get(e.a); e.B = boxes.get(e.b);
        const others = [...boxes].filter(([k]) => k !== e.a && k !== e.b).map(([, b]) => b);
        e.sides = route(e.A, e.B, others, firstRowTop);
        e.pts = [null, null];
      });
      assignPorts(edges);
      const cs = getComputedStyle(grid);
      const gap = { x: parseFloat(cs.columnGap) || 32, y: parseFloat(cs.rowGap) || 32 };
      const all = [...boxes.values()];
      edges.forEach(e => {
        const { d, head, ctrl } = geometry(e, gap);
        e.path.setAttribute('d', d);
        e.head.setAttribute('d', head);
        if (e.lab) {
          const [x, y] = labelPoint(ctrl, e.lab.offsetWidth, e.lab.offsetHeight, all);
          e.lab.style.left = x + 'px'; e.lab.style.top = y + 'px';
        }
      });
    }

    let active = null;
    function focus(key) {
      active = key;
      root.classList.add('cg-focus');
      nodes.forEach((n, k) => {
        n.classList.toggle('is-active', k === key);
        n.classList.toggle('is-near', near.get(key).has(k));
      });
      edges.forEach(e => {
        const on = e.a === key || e.b === key;
        e.g.classList.toggle('is-on', on);
        if (on) svg.appendChild(e.g);           // draw highlighted wires on top
        if (e.lab) e.lab.classList.toggle('is-on', on);
      });
    }
    function clear() {
      // keep the keyboard-focused card highlighted when the pointer leaves
      const f = document.activeElement;
      if (f && f !== document.body && root.contains(f) && f.dataset && nodes.has(f.dataset.node)) { focus(f.dataset.node); return; }
      active = null;
      root.classList.remove('cg-focus');
      nodes.forEach(n => n.classList.remove('is-active', 'is-near'));
      edges.forEach(e => { e.g.classList.remove('is-on'); if (e.lab) e.lab.classList.remove('is-on'); });
    }
    nodes.forEach((n, key) => {
      if (n.tagName !== 'A' && !n.hasAttribute('tabindex')) n.tabIndex = 0;
      n.addEventListener('pointerenter', () => focus(key));
      n.addEventListener('pointerleave', () => { if (active === key) clear(); });
      n.addEventListener('focus', () => focus(key));
      n.addEventListener('blur', () => setTimeout(clear));
    });

    let raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(root);
    else addEventListener('resize', schedule);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    addEventListener('load', schedule);
    draw();
  }

  function initAll() { document.querySelectorAll('.cgraph').forEach(setup); }
  window.initConceptGraphs = initAll;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();
})();
