/* JOR Website 2. Everything here adds motion on top of pages that already read in full without it. */
(function () {
  'use strict';
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = function () { return innerWidth < 700; };
  d.documentElement.classList.add('js');
  var scrollers = [];
  var raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      d.body.classList.toggle('scrolled', scrollY > 10);
      scrollers.forEach(function (f) { f(); });
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* menus: hover on a computer, tap anywhere */
  $$('.nav .ni > button').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var li = b.parentElement, was = li.classList.contains('open');
      $$('.nav .ni.open').forEach(function (x) { x.classList.remove('open'); });
      if (!was) li.classList.add('open');
      b.setAttribute('aria-expanded', !was);
    });
  });
  d.addEventListener('click', function (e) { if (!e.target.closest('.nav')) $$('.nav .ni.open').forEach(function (x) { x.classList.remove('open'); }); });
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    $$('.nav .ni.open').forEach(function (x) { x.classList.remove('open'); });
    d.body.classList.remove('menu-open');
  });
  var burger = $('.burger'), drawer = $('.drawer');
  if (burger && drawer) {
    burger.addEventListener('click', function () { d.body.classList.add('menu-open'); });
    drawer.addEventListener('click', function (e) { if (e.target === drawer || e.target.closest('.x') || e.target.closest('a')) d.body.classList.remove('menu-open'); });
  }

  /* things rise into place as they come into view */
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px 12% 0px', threshold: 0 });
    rvs.forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight * 0.95) el.classList.add('in'); else io.observe(el); });
  } else rvs.forEach(function (el) { el.classList.add('in'); });

  function whenSeen(el, on, off) {
    if (!('IntersectionObserver' in window)) { on(); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) on(); else if (off) off(); }); }, { threshold: 0.15 }).observe(el);
  }

  /* the film: photos drift and cross-fade; only the shown photo and the next are kept loaded */
  $$('.film').forEach(function (film) {
    var frs = $$('.fr', film), cap = film.parentElement.querySelector('.cap .chip'), pp = film.parentElement.querySelector('.cap .pp');
    if (frs.length < 2) { if (frs[0]) frs[0].classList.add('on'); return; }
    var i = 0, timer = 0, playing = !reduce, seen = true;
    function load(k) { var im = $('img', frs[k]); if (im && im.getAttribute('data-src')) { im.src = im.getAttribute('data-src'); if (im.getAttribute('data-srcset')) im.srcset = im.getAttribute('data-srcset'); im.removeAttribute('data-src'); } }
    function drift(fr) { fr.style.setProperty('--dx', (Math.random() * 4 - 2).toFixed(2) + '%'); fr.style.setProperty('--dy', (Math.random() * 4 - 2).toFixed(2) + '%'); }
    function show(k) {
      frs.forEach(function (f, j) { f.classList.toggle('was', j === i && j !== k); f.classList.toggle('on', j === k); });
      drift(frs[k]); i = k; load((k + 1) % frs.length);
      if (cap) { cap.style.opacity = 0; setTimeout(function () { cap.innerHTML = frs[k].getAttribute('data-cap') || ''; cap.style.opacity = cap.innerHTML ? 1 : 0; }, 350); }
    }
    function ready(k) { var im = $('img', frs[k]); return im && !im.getAttribute('data-src') && im.complete && im.naturalWidth > 0; }
    function tick() { clearTimeout(timer); if (playing && seen) timer = setTimeout(function () { var k = (i + 1) % frs.length; load(k); if (ready(k)) { show(k); load((k + 1) % frs.length); } tick(); }, 6500); }
    show(0); load(1); tick();
    whenSeen(film.parentElement, function () { seen = true; tick(); }, function () { seen = false; clearTimeout(timer); });
    if (pp) pp.addEventListener('click', function () {
      playing = !playing; pp.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      pp.innerHTML = playing ? '<svg class="ic" viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>' : '<svg class="ic" viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>';
      tick();
    });
  });

  /* photo bands drift slower than the page */
  var bands = $$('.band .bgp');
  if (bands.length && !reduce) scrollers.push(function () {
    bands.forEach(function (b) {
      var r = b.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      var p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      b.style.transform = 'translate3d(0,' + (p * -9).toFixed(2) + '%,0)';
    });
  });

  /* quotes: all stacked in one box the height of the longest, so changing quote never moves the page */
  $$('.quotes').forEach(function (q) {
    var qs = $$('.q', q), dots = $$('button', q.nextElementSibling || d.createElement('i')), i = 0, t = 0;
    if (qs.length < 2) return;
    function show(k) { qs.forEach(function (x, j) { x.classList.toggle('on', j === k); }); dots.forEach(function (x, j) { x.classList.toggle('on', j === k); }); i = k; }
    function tick() { clearTimeout(t); if (!reduce) t = setTimeout(function () { show((i + 1) % qs.length); tick(); }, 8000); }
    dots.forEach(function (b, j) { b.addEventListener('click', function () { show(j); tick(); }); });
    show(0); whenSeen(q, tick, function () { clearTimeout(t); });
  });

  /* sliders: swipe, arrows, and a slow turn of their own */
  $$('.slider').forEach(function (s) {
    var rail = $('.rail', s), figs = $$('figure', rail), dots = $$('.dots i', s), t = 0, seen = false;
    if (figs.length < 2) return;
    var at = function () { return Math.round(rail.scrollLeft / rail.clientWidth); };
    var go = function (k) { rail.scrollTo({ left: ((k + figs.length) % figs.length) * rail.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); };
    $('.prev', s).addEventListener('click', function () { go(at() - 1); tick(); });
    $('.next', s).addEventListener('click', function () { go(at() + 1); tick(); });
    rail.addEventListener('scroll', function () { var k = at(); dots.forEach(function (x, j) { x.classList.toggle('on', j === k); }); }, { passive: true });
    function tick() { clearTimeout(t); if (!reduce && seen) t = setTimeout(function () { go(at() + 1); tick(); }, 5200); }
    whenSeen(s, function () { seen = true; tick(); }, function () { seen = false; clearTimeout(t); });
  });

  /* videos and forms load once they are close */
  $$('.video[data-src]').forEach(function (v) {
    whenSeen(v, function () {
      if (v.querySelector('iframe')) return;
      var f = d.createElement('iframe');
      f.src = v.getAttribute('data-src'); f.allow = 'autoplay; fullscreen'; f.title = v.getAttribute('data-title') || 'Video';
      f.setAttribute('allowfullscreen', ''); f.setAttribute('referrerpolicy', 'origin');
      v.appendChild(f);
    });
  });
  var forms = $$('.fbox[data-form]');
  if (forms.length) {
    var started = false;
    var start = function () {
      if (started) return; started = true;
      var s = d.createElement('script'); s.src = 'https://js-eu1.hsforms.net/forms/embed/v2.js'; s.charset = 'utf-8';
      s.onload = function () {
        forms.forEach(function (f) {
          try {
            window.hbspt.forms.create({ region: 'eu1', portalId: f.getAttribute('data-portal'), formId: f.getAttribute('data-form'), target: '#' + f.id,
              onFormReady: function () { var w = $('.wait', f); if (w) w.remove(); } });
          } catch (e) {}
        });
      };
      d.head.appendChild(s);
    };
    forms.forEach(function (f) { whenSeen(f, start); });
    setTimeout(start, 4000);
  }

  /* the bar of links under the header follows the page */
  var sub = $('.subnav');
  if (sub) {
    d.body.classList.add('has-sub');
    var links = $$('a', sub), prog = $('.prog', sub);
    var targets = links.map(function (a) { return d.getElementById((a.getAttribute('href') || '').slice(1)); });
    scrollers.push(function () {
      var line = innerHeight * 0.35, k = -1;
      targets.forEach(function (t, j) { if (t && t.getBoundingClientRect().top < line) k = j; });
      links.forEach(function (a, j) { a.classList.toggle('on', j === k); });
      var h = d.documentElement.scrollHeight - innerHeight;
      if (prog) prog.style.width = (h > 0 ? scrollY / h * 100 : 0).toFixed(2) + '%';
    });
  }

  /* ───────── maps (the brochure sites' camera) ───────── */
  var ANCH = { r: [8, 4.3, 'start'], l: [-8, 4.3, 'end'], t: [0, -9, 'middle'], b: [0, 17, 'middle'], tr: [6, -6, 'start'], br: [6, 15, 'start'], tl: [-6, -6, 'end'], bl: [-6, 15, 'end'] };
  function boxOf(s) { return s.split(' ').map(Number); }
  function Camera(svg, pad) {
    var cam = this, vb = boxOf(svg.getAttribute('viewBox')), anim = 0, target = null;
    cam.svg = svg;
    cam.size = function () { return [svg.clientWidth || 400, svg.clientHeight || 400]; };
    cam.fit = function (box) {
      var sz = cam.size(), cw = sz[0], ch = sz[1], p = pad();
      var s = Math.min((cw - p.l - p.r) / box[2], (ch - p.t - p.b) / box[3]);
      var vw = cw / s, vh = ch / s;
      var cx = box[0] + box[2] / 2 + (p.r - p.l) / 2 / s, cy = box[1] + box[3] / 2 + (p.b - p.t) / 2 / s;
      return [cx - vw / 2, cy - vh / 2, vw, vh];
    };
    cam.apply = function (b) {
      vb = b;
      svg.setAttribute('viewBox', b[0].toFixed(2) + ' ' + b[1].toFixed(2) + ' ' + b[2].toFixed(2) + ' ' + b[3].toFixed(2));
      svg.style.setProperty('--k', (b[2] / cam.size()[0]).toFixed(4));
    };
    cam.go = function (box, ms) {
      target = box;
      var to = cam.fit(box), from = vb.slice();
      cancelAnimationFrame(anim);
      if (reduce || !ms) { cam.apply(to); return; }
      var t0 = performance.now();
      var step = function (now) {
        var t = Math.min(1, (now - t0) / ms), u = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        var w = Math.exp(Math.log(from[2]) * (1 - u) + Math.log(to[2]) * u), h = w * to[3] / to[2];
        var cx = (from[0] + from[2] / 2) * (1 - u) + (to[0] + to[2] / 2) * u, cy = (from[1] + from[3] / 2) * (1 - u) + (to[1] + to[3] / 2) * u;
        cam.apply([cx - w / 2, cy - h / 2, w, h]);
        if (t < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };
    cam.refit = function () { if (target) cam.apply(cam.fit(target)); };
  }
  function labels(svg, n) {
    $$('.st', svg).forEach(function (st) {
      var inDay = n > 0 && (' ' + st.getAttribute('data-days') + ' ').indexOf(' ' + n + ' ') >= 0;
      st.classList.toggle('on', inDay);
      var a = n > 0 ? (inDay ? st.getAttribute('data-a' + n) : null) : st.getAttribute('data-a0');
      var lb = $('.lb', st);
      if (!lb) return;
      if (a && ANCH[a]) { lb.setAttribute('x', ANCH[a][0]); lb.setAttribute('y', ANCH[a][1]); lb.setAttribute('text-anchor', ANCH[a][2]); lb.classList.remove('off'); }
      else lb.classList.add('off');
    });
  }
  /* a marker travels the day's road while it draws, and rests where the night is spent */
  function travel(svg, g) {
    var mk = svg._trav;
    if (!mk) {
      mk = d.createElementNS('http://www.w3.org/2000/svg', 'g'); mk.setAttribute('class', 'trav'); mk.style.opacity = 0;
      mk.innerHTML = '<g class="sc" style="transform:scale(var(--k,1))"><circle r="6"/></g>';
      svg.appendChild(mk); svg._trav = mk;
    }
    cancelAnimationFrame(svg._travAnim);
    if (!g) { mk.style.opacity = 0; return; }
    var segs = $$('.ln', g), lens = segs.map(function (p) { return p.getTotalLength(); });
    var total = lens.reduce(function (a, b) { return a + b; }, 0);
    if (!total) { mk.style.opacity = 0; return; }
    var at = function (u) {
      var dd = u * total;
      for (var i = 0; i < segs.length; i++) { if (dd <= lens[i] || i === segs.length - 1) return segs[i].getPointAtLength(Math.min(dd, lens[i])); dd -= lens[i]; }
    };
    var place = function (u) { var p = at(u); mk.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ')'); };
    mk.style.opacity = 1;
    if (reduce) { place(1); return; }
    var t0 = performance.now(), ms = 1100;
    var step = function (now) {
      var t = Math.min(1, (now - t0) / ms), u = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      place(u);
      if (t < 1) svg._travAnim = requestAnimationFrame(step);
    };
    place(0); svg._travAnim = requestAnimationFrame(step);
  }

  /* the day-by-day: the map flies to the day being read */
  $$('.itin').forEach(function (it) {
    var svg = $('svg.tmap', it), days = $$('article.day', it), pills = $$('.daypills button[data-day]', it);
    var lab = $('.mlab', it), mapcol = $('.mapcol', it), cur = -1, manual = 0;
    if (!svg || !days.length) return;
    var pad = function () { return phone() ? { t: 58, r: 18, b: 56, l: 18 } : { t: 70, r: 34, b: 70, l: 34 }; };
    var cam = new Camera(svg, pad);
    var dayWord = it.getAttribute('data-dayword') || 'Day', allWord = it.getAttribute('data-allword') || 'Whole tour';
    function setDay(n, ms) {
      if (n === cur) return;
      cur = n;
      days.forEach(function (x, i) { x.classList.toggle('on', i + 1 === n); });
      pills.forEach(function (p) {
        var on = +p.getAttribute('data-day') === n; p.classList.toggle('on', on);
        if (on && phone()) { var bar = p.parentElement; bar.scrollTo({ left: p.offsetLeft - bar.clientWidth / 2 + p.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' }); }
      });
      svg.classList.toggle('has-on', n > 0);
      $$('g.day', svg).forEach(function (g) {
        var on = +g.getAttribute('data-day') === n;
        g.classList.toggle('on', on);
        if (on) { g.classList.remove('draw'); g.getBoundingClientRect(); g.classList.add('draw'); } else g.classList.remove('draw');
      });
      labels(svg, n);
      var g = n > 0 ? $('g.day[data-day="' + n + '"]', svg) : null;
      travel(svg, g);
      cam.go(g ? boxOf(g.getAttribute('data-box')) : boxOf(svg.getAttribute('data-ov')), ms === undefined ? 900 : ms);
      if (lab) {
        var t = n > 0 ? days[n - 1].getAttribute('data-title') : '';
        lab.innerHTML = n > 0 ? '<b>' + dayWord + ' ' + n + '</b>' + (t ? ' · ' + t.replace(/&/g, '&amp;').replace(/</g, '&lt;') : '') : '<b>' + allWord + '</b>';
      }
    }
    function spy() {
      if (manual && Date.now() - manual < 1200) return;
      var line = phone() ? (mapcol && !mapcol.classList.contains('hidden') ? mapcol.getBoundingClientRect().bottom + 60 : innerHeight * 0.4) : innerHeight * 0.45;
      var n = 0;
      for (var i = 0; i < days.length; i++) if (days[i].getBoundingClientRect().top < line) n = i + 1;
      var r = it.getBoundingClientRect();
      if (r.top > line) n = 0;
      setDay(n);
    }
    pills.forEach(function (p) {
      p.addEventListener('click', function () {
        var n = +p.getAttribute('data-day');
        manual = Date.now(); setDay(n);
        if (n > 0) { var y = days[n - 1].getBoundingClientRect().top + scrollY - (phone() ? (mapcol.getBoundingClientRect().height + 90) : innerHeight * 0.3); scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }
      });
    });
    $$('g.day', svg).forEach(function (g) { g.style.cursor = 'pointer'; g.addEventListener('click', function () { var n = +g.getAttribute('data-day'); var b = pills.filter(function (p) { return +p.getAttribute('data-day') === n; })[0]; if (b) b.click(); }); });
    var x = $('.mapbox .x', it), show = $('.mapshow', it);
    if (x) x.addEventListener('click', function () { mapcol.classList.add('hidden'); });
    if (show) show.addEventListener('click', function () { mapcol.classList.remove('hidden'); });
    labels(svg, 0); cam.go(boxOf(svg.getAttribute('data-ov')), 0);
    scrollers.push(spy);
    addEventListener('resize', function () { cam.refit(); });
    if ('ResizeObserver' in window) new ResizeObserver(function () { cam.refit(); }).observe(svg);
    spy();
  });

  /* the route panel's map draws the whole tour, day after day, when it comes into view */
  $$('.ovmap').forEach(function (m) {
    var svg = $('svg.tmap', m);
    if (!svg) return;
    var cam = new Camera(svg, function () { return { t: 24, r: 24, b: 24, l: 24 }; });
    labels(svg, 0); cam.go(boxOf(svg.getAttribute('data-ov')), 0);
    if ('ResizeObserver' in window) new ResizeObserver(function () { cam.refit(); }).observe(svg);
    whenSeen(m, function () { m.classList.add('go'); });
  });

  /* the home page's map card: one tour after another draws its way round Ireland */
  $$('.mapcard').forEach(function (card) {
    var ts = $$('.amap .t', card), lab = $('.mc-lab', card), i = -1, t = 0, seen = true;
    if (!ts.length) return;
    ts.forEach(function (p) { p.style.setProperty('--len', p.getTotalLength().toFixed(1)); });
    function next() {
      if (i >= 0) { ts[i].classList.remove('on', 'done'); }
      i = (i + 1) % ts.length;
      var p = ts[i];
      p.parentNode.appendChild(p);
      p.classList.add('on');
      if (lab) {
        lab.style.opacity = 0;
        setTimeout(function () { lab.href = p.getAttribute('data-href'); $('span', lab).textContent = p.getAttribute('data-name'); $('small', lab).textContent = p.getAttribute('data-days') || ''; lab.style.opacity = 1; }, 300);
      }
      clearTimeout(t);
      if (!reduce && seen) t = setTimeout(next, 5200);
    }
    next();
    whenSeen(card, function () { if (!seen) { seen = true; clearTimeout(t); t = setTimeout(next, 1500); } }, function () { seen = false; clearTimeout(t); });
  });

  onScroll();
})();
;

/* ════════════ the slick layer (after jor2.js) ════════════ */
(function () {
  'use strict';
  var d = document, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* headings: each word in its own mask, so it can rise into view (the words themselves are untouched) */
  function split(h) {
    if (h._split) return; h._split = true;
    var i = 0;
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/(\s+)/), frag = d.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(p)); return; }
            var w = d.createElement('span'); w.className = 'w';
            var inner = d.createElement('span'); inner.textContent = p; inner.style.setProperty('--i', i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          c.parentNode.replaceChild(frag, c);
        } else if (c.nodeType === 1 && !/^(BR|SVG|IMG|svg)$/.test(c.tagName) && !c.hasAttribute('data-count')) walk(c);
      });
    })(h);
  }
  if (!reduce) {
    $$('.hero .rt h1, .hero .rt h2').forEach(function (h, k) {
      split(h); h.style.setProperty('--d', (k * 120 + 150) + 'ms');
      setTimeout(function () { h.classList.add('words-in'); }, 40);
    });
  }
  /* the thin line along the top fills as the page is read */
  var hero = d.querySelector('.hero'), hw = hero && hero.querySelector('.wrap'), film = hero && hero.querySelector('.film');
  var feats = $$('.grid.feature .pic:not(.graphic) img');
  var bar = d.querySelector('.readbar');
  var ticking = false;
  function frame() {
    ticking = false;
    var y = scrollY, vh = innerHeight;
    if (bar) { var h = d.documentElement.scrollHeight - vh; bar.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0); }
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', frame);
  frame();
})();
/* photos open out once a fifth of them is on screen, so the movement is seen, and happens once */
(function () {
  'use strict';
  var ps = Array.prototype.slice.call(document.querySelectorAll('.pic:not(.graphic):not(.logo-pic), .box .ph, article.day .ph'));
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { ps.forEach(function (p) { p.classList.add('open'); }); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('open'); io.unobserve(e.target); } });
  }, { threshold: 0.2 });
  ps.forEach(function (p) {
    // anything already on screen when the page opens is shown at once, so the first view never looks unfinished
    var r = p.getBoundingClientRect();
    if (r.top < innerHeight * 0.85 && r.bottom > 0) p.classList.add('open'); else io.observe(p);
  });
})();
;
