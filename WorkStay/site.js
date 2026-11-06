/* WorkStay site behaviour, shared by every page. Needs geo.js and props.js loaded first (all deferred, in order). */
addEventListener('DOMContentLoaded', () => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const G = window.WS_GEO || {}, PROPS = window.WS_PROPS || [], CFG = window.WS_CONFIG || {};
  const BYID = Object.fromEntries(PROPS.map(p => [p.id, p]));
  const BASE = document.documentElement.dataset.base || '';
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const REACH = G.reach || {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtT = t => { const m = Math.round(t); if (m < 60) return `${m} min`; const h = Math.floor(m / 60), r = m % 60; return `${h} hr${h > 1 ? 's' : ''}${r ? ` ${r} min` : ''}`; };
  const tierOf = m => m <= 30 ? 1 : m <= 60 ? 2 : 3;
  const pct = (p, w, h) => `left:${(p[0] / w * 100).toFixed(2)}%;top:${(p[1] / h * 100).toFixed(2)}%`;
  const onceVisible = (el, fn, thr = .35) => {
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold: thr });
    io.observe(el);
  };
  const ease = p => -(Math.cos(Math.PI * p) - 1) / 2;

  /* Growing drive-time frames. Frames are nested, so every frame up to time t stays on and new ones fade in on top:
     nothing ever fades out mid-growth, which is what made the first version flicker. */
  function grower(frames, onTick) {
    let raf = 0;
    const show = t => { for (const f of frames) f.el.classList.toggle('on', f.m <= t + 1e-6); onTick && onTick(t); };
    const play = (T, dur, done) => {
      cancelAnimationFrame(raf);
      if (REDUCE) { show(T); done && done(); return; }
      const t0 = performance.now();
      const step = now => { const p = Math.min(1, (now - t0) / dur); show(ease(p) * T); if (p < 1) raf = requestAnimationFrame(step); else done && done(); };
      raf = requestAnimationFrame(step);
    };
    return { show, play, stop: () => cancelAnimationFrame(raf) };
  }

  /* ---------- header ---------- */
  const hdr = $('.hdr'), burger = $('.burger'), sheet = $('#sheet');
  if (hdr) { const f = () => hdr.classList.toggle('scrolled', scrollY > 8); addEventListener('scroll', f, { passive: true }); f(); }
  if (burger && sheet) {
    const set = open => {
      sheet.classList.toggle('open', open); burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      $('use', burger).setAttribute('href', open ? '#i-x' : '#i-menu');
    };
    burger.addEventListener('click', () => set(!sheet.classList.contains('open')));
    $$('a', sheet).forEach(a => a.addEventListener('click', () => set(false)));
  }

  /* ---------- numbers count up ---------- */
  $$('[data-count]').forEach(n => {
    const to = +n.dataset.count, f = n.dataset.fmt;
    const out = v => f === 'plus' ? `${v}+` : f === 'mins' ? `${v} min` : `${v}`;
    n.textContent = out(REDUCE ? to : 0);
    if (REDUCE) return;
    onceVisible(n, () => {
      const t0 = performance.now(), dur = f === 'mins' ? 3600 : 1600;
      const step = now => { const p = Math.min(1, (now - t0) / dur), e = f === 'mins' ? ease(p) : 1 - Math.pow(1 - p, 3); n.textContent = out(Math.round(e * to)); if (p < 1) requestAnimationFrame(step); };
      setTimeout(() => requestAnimationFrame(step), 250);
    }, .5);
  });

  /* ---------- hero map: whole island, grows out to the outer band, pins open a card ---------- */
  const heroEl = $('#heroMap');
  if (heroEl && G.island) {
    const A = G.island;
    const mins = Object.keys(A.frames).map(Number).sort((a, b) => tierOf(b) - tierOf(a) || a - b);
    const OUTER = Math.max(...mins);
    const pins = PROPS.filter(p => A.pins[p.id]);
    const towns = [['Dublin', 'out'], ['Belfast', 'left'], ['Mullingar', ''], ['Cavan', ''], ['Enniskillen', 'minor'],
      ['Kilkenny', ''], ['Galway', ''], ['Cork', '']].filter(([n]) => A.places[n]);
    heroEl.innerHTML =
      `<svg viewBox="0 0 ${A.w} ${A.h}" role="img" aria-label="Map of Ireland showing everywhere within a 30, 60 and ${OUTER} minute drive of our properties.">
        <path class="hm-land" d="${A.land}"/>
        ${mins.map(m => `<path class="hm-fr t${tierOf(m)}" data-m="${m}" d="${A.frames[m]}"/>`).join('')}
        ${pins.map(p => { const [x, y] = A.pins[p.id]; return `<g class="hm-pg" data-id="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)}, ${esc(p.place)}"><circle class="hm-hit" cx="${x}" cy="${y}" r="17"/><circle class="hm-pin" cx="${x}" cy="${y}" r="6.5"/></g>`; }).join('')}
      </svg>` +
      towns.map(([n, c]) => `<span class="hl ${c === 'out' ? 'out' : ''} ${c === 'left' ? 'left' : ''} ${c === 'minor' ? 'minor' : ''} dim" data-reach="${REACH[n] ?? 999}" style="${pct(A.places[n], A.w, A.h)}"><i class="hd${c === 'left' ? ' r' : ''}"></i>${n}</span>`).join('') +
      `<div class="pincard" role="status" hidden></div>`;
    const frames = $$('.hm-fr', heroEl).map(p => ({ m: +p.dataset.m, el: p }));
    const labs = $$('.hl[data-reach]', heroEl);
    const g = grower(frames, t => labs.forEach(l => l.classList.toggle('dim', +l.dataset.reach > t + .5)));
    g.show(0);
    onceVisible(heroEl, () => setTimeout(() => g.play(OUTER, 3600, () => heroEl.classList.add('done')), 200), .3);

    // pin cards: hover or focus on desktop, tap on phones
    const card = $('.pincard', heroEl); let hideT = 0, current = '';
    const showCard = id => {
      clearTimeout(hideT); const p = BYID[id]; if (!p) return; current = id;
      const [x, y] = A.pins[id];
      card.innerHTML = `<span class="pc-kind">${esc(p.kind)}</span><b>${esc(p.name)}</b><span class="pc-loc">${esc(p.place)}</span>` +
        `<span class="pc-f">${esc(p.facts[0][0])} ${esc(p.facts[0][1])} · ${esc(p.facts[1][0])} ${esc(p.facts[1][1])}</span>` +
        `<a href="${BASE}${p.slug}/">View property <svg class="ico"><use href="#i-arrow"/></svg></a>`;
      card.style.cssText = pct([x, y], A.w, A.h); card.style.setProperty('--dx', '0px'); card.hidden = false;
      // keep the card inside the map so phones never get a sideways overflow
      const box = heroEl.getBoundingClientRect(), r = card.getBoundingClientRect();
      const dx = r.right > box.right - 4 ? box.right - 4 - r.right : r.left < box.left + 4 ? box.left + 4 - r.left : 0;
      card.style.setProperty('--dx', dx + 'px');
      $$('.hm-pg', heroEl).forEach(n => n.classList.toggle('on', n.dataset.id === id));
    };
    const hideCard = (now) => { clearTimeout(hideT); hideT = setTimeout(() => { card.hidden = true; current = ''; $$('.hm-pg', heroEl).forEach(n => n.classList.remove('on')); }, now ? 0 : 280); };
    $$('.hm-pg', heroEl).forEach(n => {
      n.addEventListener('mouseenter', () => showCard(n.dataset.id));
      n.addEventListener('mouseleave', () => hideCard());
      n.addEventListener('focus', () => showCard(n.dataset.id));
      n.addEventListener('blur', () => hideCard());
      n.addEventListener('click', e => { e.stopPropagation(); current === n.dataset.id && matchMedia('(hover:none)').matches ? hideCard(true) : showCard(n.dataset.id); });
      n.addEventListener('keydown', e => { if (e.key === 'Enter') location.href = `${BASE}${BYID[n.dataset.id].slug}/`; });
    });
    card.addEventListener('mouseenter', () => clearTimeout(hideT));
    card.addEventListener('mouseleave', () => hideCard());
    document.addEventListener('click', e => { if (!card.hidden && !card.contains(e.target)) hideCard(true); });
  }

  /* ---------- corridor map renderer (big map, card tiles, property pages) ---------- */
  const C = G.corridor;
  const LABELS = [['Dublin'], ['Drogheda'], ['Navan'], ['Newry'], ['Balbriggan', 'minor'], ['Ardee', 'minor'],
    ['Carrickmacross', 'minor'], ['Armagh', 'minor'], ['Banbridge', 'minor'], ['Trim', 'minor']];
  const MINOR = new Set(LABELS.filter(l => l[1]).map(l => l[0]));
  const SIDE = { newgrange: 'left' };
  function corridorSVG(vb, o) {
    const [x, y, w, h] = vb;
    const roads = Object.entries(C.roads).filter(([k, d]) => d && k !== 'M1').map(([, d]) => `<path class="road" d="${d}"/>`).join('');
    const bands = (o.bands || []).map(([cls, d, op]) => `<path class="band ${cls}" d="${d}"${op != null ? ` style="opacity:${op}"` : ''}/>`).join('');
    const fr = o.frames ? [2, 1].map(t => `<g class="cg t${t}">${Object.keys(C.frames).map(Number).filter(m => tierOf(m) === t).sort((a, b) => a - b)
      .map(m => `<path class="cfr" data-m="${m}" d="${C.frames[m]}"/>`).join('')}</g>`).join('') : '';
    const dots = (o.dots || []).filter(n => C.places[n]).map(n => `<circle class="cdot${MINOR.has(n) ? ' minor' : ''}" cx="${C.places[n][0]}" cy="${C.places[n][1]}" r="${o.dotR || 2.6}"/>`).join('');
    const pins = PROPS.filter(p => C.pins[p.id]).map(p => { const [px, py] = C.pins[p.id];
      return `<g class="cpin${o.on === p.id ? ' on' : ''}" data-k="${p.id}"><circle class="halo" cx="${px}" cy="${py}" r="${o.pinR * 2.2}"/><circle class="core" cx="${px}" cy="${py}" r="${o.pinR}" style="stroke-width:${o.pinR * .42}"/></g>`; }).join('');
    return `<svg viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid slice" ${o.aria ? `role="img" aria-label="${esc(o.aria)}"` : 'aria-hidden="true"'}>
      <rect class="c-sea" x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${h + 10}"/>
      <path class="c-land" d="${C.land}"/>${fr}${bands}${roads}
      <path class="road m1c" d="${C.roads.M1}"/><path class="road m1" d="${C.roads.M1}"/>${dots}${pins}</svg>`;
  }
  const lbl = (vb, p) => `left:${((p[0] - vb[0]) / vb[2] * 100).toFixed(2)}%;top:${((p[1] - vb[1]) / vb[3] * 100).toFixed(2)}%`;
  const inView = (vb, q, padR = 60) => q[0] > vb[0] + 4 && q[0] < vb[0] + vb[2] - padR && q[1] > vb[1] + 8 && q[1] < vb[1] + vb[3] - 8;

  /* ---------- big M1 map: grows 0 to 60 minutes when scrolled to ---------- */
  const cmap = $('#cmap');
  if (cmap && C) {
    const vb = [0, 0, C.w, C.h];
    const bands = [];
    PROPS.forEach(p => [60, 30].forEach(t => C.bands[p.id + t] && bands.push([`p-${p.id} b${t}`, C.bands[p.id + t]])));
    const dots = LABELS.map(l => l[0]).concat(['Dublin Airport']);
    cmap.innerHTML = corridorSVG(vb, { bands, frames: true, dots, pinR: 7, aria: 'Map of the M1 corridor from Dublin to Newry, showing our properties and the areas within 30 and 60 minutes of each.' }) +
      LABELS.map(([n, m]) => `<span class="cl ${m || ''}" data-reach="${REACH[n] ?? 999}" style="${lbl(vb, C.places[n])}">${n}</span>`).join('') +
      `<span class="cl air" data-reach="${REACH['Dublin Airport'] ?? 999}" style="${lbl(vb, C.places['Dublin Airport'])}"><svg class="ico"><use href="#i-plane"/></svg>Dublin Airport</span>` +
      `<div class="cchip"><span><small>Drive time</small><b>0 min</b></span><button type="button" class="replay" aria-label="Replay the drive-time map"><svg class="ico"><use href="#i-replay"/></svg></button></div>` +
      `<span class="cl shield" style="${lbl(vb, C.m1label)}">M1</span>` +
      PROPS.filter(p => C.pins[p.id]).map(p => `<span class="cl prop ${SIDE[p.id] === 'left' ? 'left' : ''}" data-k="${p.id}" style="${lbl(vb, C.pins[p.id])}">${esc(p.name)}</span>`).join('');
    cmap.style.aspectRatio = `${C.w} / ${C.h}`;
    const st = document.createElement('style');
    st.textContent = PROPS.map(p => `#cmap[data-prop=${p.id}] .p-${p.id}.b60{opacity:.28} #cmap[data-prop=${p.id}] .p-${p.id}.b30{opacity:.55} #cmap[data-t="60"][data-prop=${p.id}] .p-${p.id}.b60{opacity:.42}`).join('\n');
    document.head.appendChild(st);

    // property buttons and the drive-time table come from props.js, so new properties appear by themselves
    const segP = $('#segP');
    if (segP) segP.innerHTML = `<button type="button" data-p="all" aria-pressed="true">All</button>` +
      PROPS.map(p => `<button type="button" data-p="${p.id}" aria-pressed="false">${esc(p.name)}</button>`).join('');
    const ROWS = ['Drogheda', 'Dundalk', 'Navan', 'Newry', 'Dublin Airport', 'Dublin city', 'Belfast'];
    const ALIAS = { Dundalk: ['Dundalk', 'Dundalk town centre'] };
    const val = (p, r) => { for (const k of (ALIAS[r] || [r])) if (p.drive[k] != null) return p.drive[k]; return null; };
    const fmt = m => m == null ? '<span class="dim">over 1 hr</span>' : m <= 3 ? 'in town' : fmtT(m);
    const table = sel => {
      const on = id => sel === id ? ' class="on"' : '';
      $('#tbl').innerHTML = `<thead><tr><th scope="col">Drive to</th>${PROPS.map(p => `<th scope="col"${on(p.id)}>${esc(p.short)}</th>`).join('')}</tr></thead><tbody>` +
        ROWS.map(r => `<tr><td>${r}</td>${PROPS.map(p => `<td${on(p.id)}>${fmt(val(p, r))}</td>`).join('')}</tr>`).join('') + '</tbody>';
    };
    if ($('#tbl')) table('all');

    const cfr = $$('.cfr', cmap).map(p => ({ m: +p.dataset.m, el: p }));
    const cchip = $('.cchip b', cmap), clabs = $$('.cl[data-reach]', cmap);
    const cg = grower(cfr, t => { cchip.textContent = fmtT(t); clabs.forEach(l => l.classList.toggle('far', +l.dataset.reach > t + .5)); });
    let growing = false;
    const setT = t => { cmap.dataset.t = t; $$('#segT button').forEach(x => x.setAttribute('aria-pressed', x.dataset.t === t)); };
    const setProp = p => {
      if (growing) stopGrow();
      cmap.dataset.prop = p;
      $$('#segP button').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === p));
      $$('.cpin, .cl.prop', cmap).forEach(n => n.classList.toggle('on', n.dataset.k === p));
      if ($('#tbl')) table(p);
    };
    function stopGrow() { growing = false; cg.stop(); cg.show(60); cmap.dataset.prop = 'all'; }
    function run() {
      setT('both'); setProp('all'); growing = true; cmap.dataset.prop = 'grow';
      cg.show(0); cg.play(60, 3000, () => { growing = false; cmap.dataset.prop = 'all'; });
    }
    cmap.dataset.prop = 'grow'; cg.show(0);
    onceVisible(cmap, run, .4);
    $('.replay', cmap).addEventListener('click', run);
    $$('#segP button').forEach(b => b.addEventListener('click', () => setProp(b.dataset.p)));
    $$('#segT button').forEach(b => b.addEventListener('click', () => { if (growing) stopGrow(); setT(b.dataset.t); }));
    $$('.cpin', cmap).forEach(n => { n.style.cursor = 'pointer'; n.addEventListener('click', () => setProp(cmap.dataset.prop === n.dataset.k ? 'all' : n.dataset.k)); });
  }

  /* ---------- small location tiles (property cards without photos) ---------- */
  if (C) $$('[data-mini]').forEach(el => {
    const k = el.dataset.mini, p = C.pins[k], prop = BYID[k];
    if (!p || !prop) return;
    const big = el.classList.contains('mini-big');
    const w = big ? 440 : 400, h = w * (big ? 3 / 4 : 9 / 16);
    const shift = { grianan: [-60, 10], lismar: [-40, 20] }[k] || [0, 0];
    const vb = [p[0] - w / 2 + shift[0], p[1] - h / 2 + shift[1], w, h];
    const near = ['Drogheda', 'Dundalk', 'Ardee', 'Newry', 'Balbriggan', 'Navan', 'Carrickmacross', 'Dublin'];
    el.innerHTML = corridorSVG(vb, { bands: [['b60', C.bands[k + '60'], .2], ['b30', C.bands[k + '30'], .45]], dots: near, pinR: 5, dotR: 2, on: k }) +
      near.filter(n => C.places[n] && inView(vb, C.places[n]) && Math.hypot(C.places[n][0] - p[0], C.places[n][1] - p[1]) > 18)
        .map(n => `<span class="ml" style="${lbl(vb, C.places[n])}">${n}</span>`).join('') +
      `<span class="ml me" style="${lbl(vb, p)}">${esc(prop.name)}</span><span class="mcap"><i></i>Within 30 minutes</span>`;
  });

  /* ---------- property page map ---------- */
  const pmap = $('#pmap');
  if (pmap && C) {
    const k = pmap.dataset.prop, p = C.pins[k], prop = BYID[k];
    const wide = innerWidth > 700, w = wide ? 600 : 420, h = w * (wide ? 9 / 16 : 1);
    const vb = [p[0] - w / 2, p[1] - h / 2, w, h];
    const towns = LABELS.map(l => l[0]).concat(['Dundalk', 'Dublin Airport', 'Kells', 'Swords']);
    pmap.style.aspectRatio = `${w} / ${h}`;
    pmap.innerHTML = corridorSVG(vb, { bands: [['b60 pb', C.bands[k + '60']], ['b30 pb', C.bands[k + '30']]], dots: towns, pinR: 6.5, on: k,
      aria: `Map around ${prop.name} showing the areas within 30 and 60 minutes' drive.` }) +
      towns.filter(n => C.places[n] && inView(vb, C.places[n], 70) && Math.hypot(C.places[n][0] - p[0], C.places[n][1] - p[1]) > 16)
        .map(n => `<span class="cl" style="${lbl(vb, C.places[n])}">${n}</span>`).join('') +
      PROPS.filter(o => C.pins[o.id] && inView(vb, C.pins[o.id], 0)).map(o => `<span class="cl prop${o.id === k ? ' on' : ''}${SIDE[o.id] === 'left' ? ' left' : ''}" style="${lbl(vb, C.pins[o.id])}">${esc(o.name)}</span>`).join('') +
      `<div class="plegend"><span><i class="s30"></i>30 min</span><span><i class="s60"></i>60 min</span></div>`;
    onceVisible(pmap, () => pmap.classList.add('in-view'), .3);
  }

  /* ---------- galleries and the photo viewer ---------- */
  const lb = $('#lb'); let LIST = [], cur = 0;
  const showPhoto = i => { cur = (i + LIST.length) % LIST.length; const [f, c] = LIST[cur]; $('#lbImg').src = `${BASE}img/${f}.jpg`; $('#lbImg').alt = c; $('#lbCap').textContent = `${c}  ·  ${cur + 1} of ${LIST.length}`; };
  $$('[data-gal]').forEach(gal => {
    const prop = BYID[gal.dataset.gal]; if (!prop || !prop.photos.length) return;
    const photos = prop.photos, SHOW = Math.min(photos.length, gal.classList.contains('gal-page') ? 5 : 4);
    gal.innerHTML = photos.slice(0, SHOW).map(([f, c], i) =>
      `<button type="button" data-i="${i}" aria-label="View photo: ${esc(c)}"><img src="${BASE}img/${f}-sm.jpg" srcset="${BASE}img/${f}-sm.jpg 800w, ${BASE}img/${f}.jpg 1600w" sizes="${i ? '(max-width:980px) 33vw, 18vw' : '(max-width:980px) 100vw, 55vw'}" alt="${esc(c)}" loading="${i ? 'lazy' : 'eager'}" decoding="async">` +
      (i === 0 ? `<span class="badge"><svg class="ico"><use href="#i-photo"/></svg>${photos.length} photos</span>` : '') +
      (i === SHOW - 1 && photos.length > SHOW ? `<span class="more">+${photos.length - SHOW + 1} more</span>` : '') + `</button>`).join('');
    gal.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || !lb) return; LIST = photos; showPhoto(+b.dataset.i); lb.showModal(); });
  });
  if (lb) {
    $('.lb .x').addEventListener('click', () => lb.close());
    $('.lb .pv').addEventListener('click', () => showPhoto(cur - 1));
    $('.lb .nx').addEventListener('click', () => showPhoto(cur + 1));
    lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') showPhoto(cur - 1); if (e.key === 'ArrowRight') showPhoto(cur + 1); });
  }

  /* ---------- quote form ---------- */
  const qprop = $('#q-prop');
  if (qprop) {
    const want = new URLSearchParams(location.search).get('property');
    if (want && BYID[want]) qprop.value = BYID[want].name;
    $$('a[data-prop]').forEach(a => a.addEventListener('click', () => { qprop.value = a.dataset.prop; }));
  }
  const form = $('#qform');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const d = Object.fromEntries(new FormData(form));
    const start = d.start ? new Date(d.start + 'T12:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set';
    const body = [`Name: ${d.name}`, `Company: ${d.company || '-'}`, `Email: ${d.email}`, `Phone: ${d.phone || '-'}`, `People: ${d.people}`, `Start date: ${start}`, `How long: ${d.length}`, `Property: ${d.property}`, '', d.message || ''].join('\n');
    location.href = `mailto:${CFG.email || 'bookings@workstay.ie'}?subject=${encodeURIComponent(`Quote request: ${d.people} people${d.company ? ', ' + d.company : ''}`)}&body=${encodeURIComponent(body)}`;
    $('#qdone').classList.add('show');
  });

  /* ---------- sector buttons and "ask" buttons open the chat ---------- */
  $$('[data-sector]').forEach(b => b.addEventListener('click', () => window.WSChat && WSChat.open({ sector: b.dataset.sector })));
  $$('[data-chat]').forEach(b => b.addEventListener('click', () => window.WSChat && WSChat.open({ prefill: b.dataset.chat })));

  /* ---------- reveal on scroll ---------- */
  const rv = $$('.rv');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rv.forEach((n, i) => { n.style.transitionDelay = `${(i % 3) * 70}ms`; io.observe(n); });
  } else rv.forEach(n => n.classList.add('in'));
});
