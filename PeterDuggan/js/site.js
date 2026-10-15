/*
  Shared behaviour for both themes (index.html and colour.html).
  A theme fills whichever data-slot="…" places it has; missing ones are skipped.
*/
(function () {
  'use strict';

  var S = window.SITE;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Put html into every element with data-slot="name". Returns how many it found.
  function fill(name, html) {
    var els = $$('[data-slot="' + name + '"]');
    els.forEach(function (el) { el.innerHTML = html; });
    return els.length;
  }

  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';

  // Every playable project, in page order, so the player can step through them.
  var projects = [].concat(S.latest, S.films, S.musicVideos || []);
  var firstFilm = S.latest.length;
  var firstMusic = firstFilm + S.films.length;

  // ---------- Text ----------

  $$('[data-site="role"]').forEach(function (el) { el.textContent = S.role; });

  fill('heroImage', '<img src="' + esc(S.hero.image) + '" alt="">');
  // Colour the closing asterisk of the headline.
  fill('heroTitle', esc(S.hero.headline).replace(/\*$/, '<span class="star">*</span>'));
  fill('heroDisclaimer', esc(S.hero.disclaimer));

  var words = ['Edit', 'Colour', 'DIT', 'Commercials', 'Trailers', 'Spots', 'Films'];
  var run = words.map(function (w) { return '<span>' + w + '</span><i>✱</i>'; }).join('');
  fill('ticker', run + run + run + run);

  fill('about', S.about.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''));
  if (S.intro) fill('intro', esc(S.intro).replace(esc(S.name), '<strong>' + esc(S.name) + '</strong>'));

  $$('[data-slot="email"]').forEach(function (a) {
    a.textContent = S.email;
    a.href = 'mailto:' + S.email;
  });

  var linkNames = { vimeo: 'Vimeo', instagram: 'Instagram', linkedin: 'LinkedIn' };
  var links = Object.keys(linkNames).filter(function (k) { return S.links[k]; });
  fill('contactLinks', links.map(function (k) {
    return '<a class="btn btn--dark" href="' + esc(S.links[k]) + '" target="_blank" rel="noopener">' + linkNames[k] + '</a>';
  }).join(''));
  fill('menuLinks', '<a href="mailto:' + esc(S.email) + '">' + esc(S.email) + '</a>' +
    links.map(function (k) {
      return '<a href="' + esc(S.links[k]) + '" target="_blank" rel="noopener">' + linkNames[k] + '</a>';
    }).join(''));

  fill('copyright', '© ' + new Date().getFullYear() + ' ' + esc(S.name));

  if (S.olderWorkUrl) {
    fill('older', '<a class="btn btn--dark" href="' + esc(S.olderWorkUrl) + '" target="_blank" rel="noopener">Older work →</a>');
  }

  // Letters in colour-bar colours: <h2 data-bars>Colour</h2>. Spaces keep their place
  // in the cycle so a phrase reads as one strip of colour.
  $$('[data-bars]').forEach(function (el) {
    var text = el.textContent;
    var italic = (el.getAttribute('data-bars') || '').split(',').map(Number);
    el.setAttribute('aria-label', text);
    el.innerHTML = '<span aria-hidden="true">' + text.split('').map(function (ch, i) {
      if (ch === ' ') return ' ';
      return '<span class="bar-c' + (i % 7 + 1) + (italic.indexOf(i) > -1 ? ' bar-i' : '') + '">' + esc(ch) + '</span>';
    }).join('') + '</span>';
  });

  // ---------- Work tiles ----------

  function tiles(list, offset) {
    return list.map(function (p, k) {
      var i = offset + k;
      var n = p.cuts.length;
      var tag = n > 1 ? '<span class="tile__tag">' + n + (/Episode/.test(p.cuts[0].label) ? ' episodes' : ' cuts') + '</span>' : '';
      return '<button class="tile" type="button" data-project="' + i + '" aria-label="Play ' + esc(p.client + ', ' + p.title) + '">' +
        '<span class="tile__media">' +
          '<img src="' + esc(p.poster) + '" alt="" loading="lazy" decoding="async">' +
          tag +
          '<span class="tile__play">' + PLAY + '</span>' +
        '</span>' +
        '<span class="tile__cap">' +
          '<span class="tile__client">' + esc(p.client) + '</span>' +
          '<span class="tile__type">' + esc(p.type) + '</span>' +
          '<span class="tile__title">' + esc(p.title) + (p.credit ? ' · ' + esc(p.credit) : '') + '</span>' +
        '</span>' +
      '</button>';
    }).join('');
  }

  fill('latest', tiles(S.latest, 0));
  fill('workCount', String(S.latest.length).padStart(2, '0') + ' projects · ' +
    S.latest.reduce(function (a, p) { return a + p.cuts.length; }, 0) + ' films');
  fill('films', tiles(S.films, firstFilm));
  if (S.musicVideos && S.musicVideos.length) {
    fill('musicVideos', tiles(S.musicVideos, firstMusic));
    var mv = $('#music');
    if (mv) mv.hidden = false;
  }

  fill('laurels', S.laurels.map(function (l) {
    return '<li' + (l.badge ? ' class="badge"' : '') + '><img src="' + esc(l.src) + '" alt="' + esc(l.name) + '" loading="lazy"></li>';
  }).join(''));

  // A stack of the latest stills that cross-fade, standing in for a showreel.
  // Clicking plays whichever project is showing.
  var cycle = $('[data-slot="heroCycle"]');
  if (cycle) {
    cycle.innerHTML = S.latest.map(function (p, i) {
      return '<button class="cycle__item' + (i === 0 ? ' is-on' : '') + '" type="button" data-project="' + i + '"' +
        (i === 0 ? '' : ' tabindex="-1"') + ' aria-label="Play ' + esc(p.client + ', ' + p.title) + '">' +
        '<img src="' + esc(p.poster) + '" alt=""' + (i === 0 ? '' : ' loading="lazy"') + '>' +
        '<span class="cycle__cap">' + esc(p.client) + '</span></button>';
    }).join('');
    var items = $$('.cycle__item', cycle);
    var at = 0;
    if (!still && items.length > 1) {
      setInterval(function () {
        if (document.hidden) return;
        items[at].classList.remove('is-on');
        items[at].tabIndex = -1;
        at = (at + 1) % items.length;
        items[at].classList.add('is-on');
        items[at].tabIndex = 0;
      }, 3200);
    }
  }

  // ---------- Logos ----------

  // A logo's width grows with its shape (ratio^0.6) so square and wide
  // logos carry similar weight. See the logo rules in each theme's CSS.
  var ratios = window.LOGO_RATIOS || {};
  function logo(group, b, alt) {
    var r = ratios[group + '/' + b[1]] || 2;
    return '<img src="img/logos/' + group + '/' + esc(b[1]) + '.webp" alt="' + esc(alt) + '" loading="lazy"' +
      ' width="' + Math.round(r * 100) + '" height="100" style="--s:' + Math.pow(r, 0.6).toFixed(3) + '">';
  }

  fill('broadcasters', S.broadcasters.map(function (b) {
    return '<li>' + logo('broadcasters', b, b[0]) + '</li>';
  }).join(''));

  // Three rows that scroll in a loop. Each row holds its logos twice so the
  // loop is seamless; the second copy is hidden from screen readers.
  var rows = [[], [], []];
  S.brands.forEach(function (b, i) { rows[i % 3].push(b); });
  fill('brands', rows.map(function (row) {
    var one = row.map(function (b) { return '<span class="logo">' + logo('brands', b, b[0]) + '</span>'; }).join('');
    var two = row.map(function (b) { return '<span class="logo" aria-hidden="true">' + logo('brands', b, '') + '</span>'; }).join('');
    return '<div class="brands__row">' + one + two + '</div>';
  }).join(''));

  // ---------- Header ----------

  // The bar turns solid once the hero has scrolled away, and dark over dark
  // sections. A section says what it is with data-tone="paper|ink|accent".
  var bar = $('#bar');
  var hero = $('.hero');
  var sections = $$('[data-tone]');

  function updateBar() {
    if (!bar) return;
    var y = bar.offsetHeight / 2;
    var under = sections.filter(function (s) {
      var r = s.getBoundingClientRect();
      return r.top <= y && r.bottom > y;
    })[0];
    // A hero with data-clear-bar keeps a see-through bar (theme 1's photo);
    // otherwise the bar is clear only at the very top of the page.
    var overHero = !!hero && under === hero && (hero.hasAttribute('data-clear-bar') || window.scrollY < 8);
    var tone = under ? under.getAttribute('data-tone') : 'paper';
    bar.classList.toggle('is-solid', !overHero);
    bar.classList.toggle('on-ink', !overHero && tone === 'ink');
    bar.classList.toggle('on-accent', !overHero && tone === 'accent');
  }

  window.addEventListener('scroll', updateBar, { passive: true });
  window.addEventListener('resize', updateBar);
  updateBar();

  // ---------- Menu ----------

  var menu = $('#menu');
  var menuOpen = $('#menuOpen');

  function openMenu() {
    menu.hidden = false;
    menuOpen.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    $('#menuClose').focus();
  }

  function closeMenu(focusBack) {
    menu.hidden = true;
    menuOpen.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
    if (focusBack) menuOpen.focus();
  }

  menuOpen.addEventListener('click', openMenu);
  $('#menuClose').addEventListener('click', function () { closeMenu(true); });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeMenu(false);
  });

  // ---------- Timecode ----------

  // A running 25 fps timecode, like a playhead.
  var tc = $('#tc');
  var t0 = performance.now();
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  function tick(now) {
    var f = Math.floor((now - t0) / 40);
    tc.textContent = '00:' + pad(Math.floor(f / 1500) % 60) + ':' + pad(Math.floor(f / 25) % 60) + ':' + pad(f % 25);
    if (!document.hidden) requestAnimationFrame(tick);
  }

  if (tc && !still) {
    requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) requestAnimationFrame(tick);
    });
  }

  // ---------- Player ----------

  var player = $('#player');
  var frame = $('#playerFrame');
  var cutsBox = $('#playerCuts');
  var current = { project: 0, cut: 0 };
  var opener = null;

  function embed(cut) {
    if (cut.vimeo) return 'https://player.vimeo.com/video/' + encodeURIComponent(cut.vimeo) + '?autoplay=1&title=0&byline=0&portrait=0&dnt=1';
    if (cut.youtube) return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(cut.youtube) + '?autoplay=1&rel=0&modestbranding=1';
    if (cut.drive) return 'https://drive.google.com/file/d/' + encodeURIComponent(cut.drive) + '/preview';
    return '';
  }

  function show(pi, ci) {
    var p = projects[pi];
    var cut = p.cuts[ci];
    current = { project: pi, cut: ci };

    $('#playerTitle').innerHTML = esc(p.client) + ' <span>— ' + esc(p.title) +
      (p.cuts.length > 1 ? ' · ' + esc(cut.label) : '') + '</span>';

    frame.classList.toggle('is-vertical', !!cut.vertical);
    frame.innerHTML = '<iframe src="' + esc(embed(cut)) + '" title="' + esc(p.client + ' ' + p.title + ' ' + cut.label) +
      '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';

    cutsBox.innerHTML = p.cuts.length > 1 ? p.cuts.map(function (c, i) {
      return '<button class="cut' + (i === ci ? ' is-on' : '') + '" type="button" data-cut="' + i + '"' +
        (i === ci ? ' aria-current="true"' : '') + '>' +
        '<img src="' + esc(c.poster || p.poster) + '" alt="" loading="lazy"><span>' + esc(c.label) + '</span></button>';
    }).join('') : '';

    var on = cutsBox.querySelector('.is-on');
    if (on) cutsBox.scrollLeft = on.offsetLeft - (cutsBox.clientWidth - on.offsetWidth) / 2;
  }

  function openPlayer(pi, from) {
    opener = from || null;
    player.hidden = false;
    document.body.classList.add('is-locked');
    show(pi, 0);
    $('#playerClose').focus();
  }

  function closePlayer() {
    player.hidden = true;
    frame.innerHTML = '';
    document.body.classList.remove('is-locked');
    if (opener) opener.focus();
  }

  function step(d) {
    show((current.project + d + projects.length) % projects.length, 0);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-project]');
    if (t) { openPlayer(+t.getAttribute('data-project'), t); return; }
    var latest = e.target.closest('[data-play-latest]');
    if (latest) openPlayer(0, latest);
  });

  cutsBox.addEventListener('click', function (e) {
    var c = e.target.closest('[data-cut]');
    if (c) show(current.project, +c.getAttribute('data-cut'));
  });

  $('#playerClose').addEventListener('click', closePlayer);
  $('#playerPrev').addEventListener('click', function () { step(-1); });
  $('#playerNext').addEventListener('click', function () { step(1); });

  document.addEventListener('keydown', function (e) {
    if (!player.hidden) {
      if (e.key === 'Escape') closePlayer();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Tab') trap(e, player);
    } else if (!menu.hidden) {
      if (e.key === 'Escape') closeMenu(true);
      else if (e.key === 'Tab') trap(e, menu);
    }
  });

  // Keep keyboard focus inside an open overlay.
  function trap(e, box) {
    var f = $$('button, a[href], iframe', box).filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
})();
