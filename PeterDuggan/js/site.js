(function () {
  'use strict';

  var S = window.SITE;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var slot = function (name) { return $('[data-slot="' + name + '"]'); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';

  // ---------- Text ----------

  $('[data-site="role"]').textContent = S.role;

  var heroImg = new Image();
  heroImg.src = S.hero.image;
  heroImg.alt = '';
  slot('heroImage').appendChild(heroImg);

  // Colour the closing asterisk of the headline.
  slot('heroTitle').innerHTML = esc(S.hero.headline).replace(/\*$/, '<span class="star">*</span>');
  slot('heroDisclaimer').textContent = S.hero.disclaimer;

  var words = ['Edit', 'Colour', 'DIT', 'Commercials', 'Trailers', 'Spots', 'Films'];
  var run = words.map(function (w) { return '<span>' + w + '</span><i>✱</i>'; }).join('');
  slot('ticker').innerHTML = run + run + run + run;

  slot('about').innerHTML = S.about.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');

  var mail = slot('email');
  mail.textContent = S.email;
  mail.href = 'mailto:' + S.email;

  var linkNames = { vimeo: 'Vimeo', instagram: 'Instagram', linkedin: 'LinkedIn' };
  var links = Object.keys(linkNames).filter(function (k) { return S.links[k]; });
  slot('contactLinks').innerHTML = links.map(function (k) {
    return '<a class="btn btn--dark" href="' + esc(S.links[k]) + '" target="_blank" rel="noopener">' + linkNames[k] + '</a>';
  }).join('');
  slot('menuLinks').innerHTML = '<a href="mailto:' + esc(S.email) + '">' + esc(S.email) + '</a>' +
    links.map(function (k) {
      return '<a href="' + esc(S.links[k]) + '" target="_blank" rel="noopener">' + linkNames[k] + '</a>';
    }).join('');

  slot('copyright').textContent = '© ' + new Date().getFullYear() + ' ' + S.name;

  if (S.olderWorkUrl) {
    slot('older').innerHTML = '<a class="btn btn--dark" href="' + esc(S.olderWorkUrl) + '" target="_blank" rel="noopener">Older work →</a>';
  }

  // ---------- Work tiles ----------

  // Every playable project, in page order, so the player can step through them.
  var projects = [];

  function tiles(list, group) {
    return list.map(function (p) {
      var i = projects.push(p) - 1;
      var n = p.cuts.length;
      var tag = n > 1 ? '<span class="tile__tag">' + n + (group === 'latest' && /Episode/.test(p.cuts[0].label) ? ' episodes' : ' cuts') + '</span>' : '';
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

  slot('latest').innerHTML = tiles(S.latest, 'latest');
  slot('workCount').textContent = String(S.latest.length).padStart(2, '0') + ' projects · ' +
    S.latest.reduce(function (a, p) { return a + p.cuts.length; }, 0) + ' films';
  slot('films').innerHTML = tiles(S.films, 'films');
  if (S.musicVideos && S.musicVideos.length) {
    slot('musicVideos').innerHTML = tiles(S.musicVideos, 'music');
    $('#music').hidden = false;
  }

  slot('laurels').innerHTML = S.laurels.map(function (l) {
    return '<li' + (l.badge ? ' class="badge"' : '') + '><img src="' + esc(l.src) + '" alt="' + esc(l.name) + '" loading="lazy"></li>';
  }).join('');

  // ---------- Logos ----------

  // A logo's width grows with its shape (ratio^0.6) so square and wide
  // logos carry similar weight. See .broadcasters img / .logo img in the CSS.
  var ratios = window.LOGO_RATIOS || {};
  function logo(group, b, alt) {
    var r = ratios[group + '/' + b[1]] || 2;
    return '<img src="img/logos/' + group + '/' + esc(b[1]) + '.webp" alt="' + esc(alt) + '" loading="lazy"' +
      ' width="' + Math.round(r * 100) + '" height="100" style="--s:' + Math.pow(r, 0.6).toFixed(3) + '">';
  }

  slot('broadcasters').innerHTML = S.broadcasters.map(function (b) {
    return '<li>' + logo('broadcasters', b, b[0]) + '</li>';
  }).join('');

  // Three rows that scroll in a loop. Each row holds its logos twice so the
  // loop is seamless; the second copy is hidden from screen readers.
  var rows = [[], [], []];
  S.brands.forEach(function (b, i) { rows[i % 3].push(b); });
  slot('brands').innerHTML = rows.map(function (row) {
    var one = row.map(function (b) { return '<span class="logo">' + logo('brands', b, b[0]) + '</span>'; }).join('');
    var two = row.map(function (b) { return '<span class="logo" aria-hidden="true">' + logo('brands', b, '') + '</span>'; }).join('');
    return '<div class="brands__row">' + one + two + '</div>';
  }).join('');

  // ---------- Header ----------

  var bar = $('#bar');
  var hero = $('.hero');
  var sections = Array.prototype.slice.call(document.querySelectorAll('.hero, .ticker, .section, .contact'));

  function tone(el) {
    if (el.classList.contains('section--paper')) return 'paper';
    if (el.classList.contains('contact') || el.classList.contains('ticker')) return 'accent';
    return 'ink';
  }

  function updateBar() {
    var y = bar.offsetHeight / 2;
    var under = sections.filter(function (s) {
      var r = s.getBoundingClientRect();
      return r.top <= y && r.bottom > y;
    })[0];
    var overHero = under === hero;
    bar.classList.toggle('is-solid', !overHero);
    bar.classList.toggle('on-ink', !overHero && under && tone(under) === 'ink');
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

  // A running 25 fps timecode in the hero, like a playhead.
  var tc = $('#tc');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var t0 = performance.now();
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  function tick(now) {
    var f = Math.floor((now - t0) / 40);
    tc.textContent = '00:' + pad(Math.floor(f / 1500) % 60) + ':' + pad(Math.floor(f / 25) % 60) + ':' + pad(f % 25);
    if (!document.hidden) requestAnimationFrame(tick);
  }

  if (!still) {
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
    if (t) openPlayer(+t.getAttribute('data-project'), t);
  });

  cutsBox.addEventListener('click', function (e) {
    var c = e.target.closest('[data-cut]');
    if (c) show(current.project, +c.getAttribute('data-cut'));
  });

  $('#playLatest').addEventListener('click', function (e) { openPlayer(0, e.currentTarget); });
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
    var f = Array.prototype.slice.call(box.querySelectorAll('button, a[href], iframe'))
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
})();
