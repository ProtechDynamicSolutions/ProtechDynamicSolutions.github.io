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

  // On the Archive page the player steps through the archive instead.
  var A = window.ARCHIVE;
  var onArchive = !!(A && $('[data-slot="archive"]'));
  if (onArchive) {
    projects = [];
    A.sections.forEach(function (sec) {
      sec.items.forEach(function (it) {
        projects.push({
          client: it.client, title: it.title, type: sec.title, year: it.year || '', length: it.length || 0,
          section: sec.id,
          // No still of our own yet: Drive's thumbnail stands in.
          poster: it.poster || 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(it.drive) + '&sz=w960',
          blurb: it.blurb || '', did: it.did || [], credits: it.credits || [],
          cuts: [{ label: 'Film', drive: it.drive, vimeo: it.vimeo, youtube: it.youtube }]
        });
      });
    });
  }

  function mins(sec) {
    if (!(sec > 0)) return '';
    return Math.floor(sec / 60) + ':' + ('0' + Math.round(sec % 60)).slice(-2);
  }

  // ---------- Text ----------

  $$('[data-site="role"]').forEach(function (el) { el.textContent = S.role; });

  fill('heroImage', '<img src="' + esc(S.hero.image) + '" alt="">');
  // Colour the closing asterisk of the headline.
  fill('heroTitle', esc(S.hero.headline).replace(/\*$/, '<span class="star">*</span>'));
  fill('heroDisclaimer', esc(S.hero.disclaimer));

  // The giant landing line, one span per line (coloured below via data-bars).
  if (S.heroLines) {
    fill('heroLines', S.heroLines.map(function (line, i) {
      return '<span class="hero__line hero__line--' + (i + 1) + '" data-bars>' + esc(line) + '</span>';
    }).join(' '));
  }

  // Movie taglines in a TV-style crawl. The track holds the list twice so the
  // loop is seamless; the copy is hidden from screen readers.
  if (S.taglines) {
    var lines = S.taglines.map(function (t) {
      return '<span class="crawl__item"><q>' + esc(t[0]) + '</q> <cite>' + esc(t[1]) + '</cite></span>';
    }).join('');
    fill('crawl', '<div class="crawl__run">' + lines + '</div><div class="crawl__run" aria-hidden="true">' + lines + '</div>');
  }

  if (S.aboutLine) {
    fill('aboutLine', '<blockquote>' + esc(S.aboutLine[0]) + '</blockquote><figcaption>' + esc(S.aboutLine[1]) + '</figcaption>');
  }

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
    // A quiet line, not a button: the archive is there for those who look.
    var internal = !/^https?:/i.test(S.olderWorkUrl);
    fill('older', '<a class="older__link" href="' + esc(S.olderWorkUrl) + '"' + (internal ? '' : ' target="_blank" rel="noopener"') +
      '>Older work, the old reel and music videos are in the <span>archive</span> →</a>');
  }

  // Letters in colour-bar colours: <h2 data-bars>Colour</h2>. Spaces keep their place
  // in the cycle so a phrase reads as one strip of colour.
  // Screen readers get the plain text; the per-letter copy is hidden from them.
  // A word in [square brackets] is filled with the TV's colour bars ("the [good] bit.").
  $$('[data-bars]').forEach(function (el) {
    var raw = el.textContent;
    var text = raw.replace(/[\[\]]/g, '');
    var attr = el.getAttribute('data-bars') || '';
    var italic = attr ? attr.split(',').map(Number) : [];
    var i = 0;
    var letters = function (s) {
      return s.split('').map(function (ch) {
        var k = i++;
        if (ch === ' ') return ' ';
        return '<span class="bar-c' + (k % 7 + 1) + (italic.indexOf(k) > -1 ? ' bar-i' : '') + '">' + esc(ch) + '</span>';
      }).join('');
    };
    var html = raw.split(/(\[[^\]]*\])/).map(function (part) {
      return /^\[.*\]$/.test(part) ? '<span class="tv-word">' + letters(part.slice(1, -1)) + '</span>' : letters(part);
    }).join('');
    el.innerHTML = '<span class="sr-only">' + esc(text) + '</span><span aria-hidden="true">' + html + '</span>';
  });

  // Pac-Man: scroll down and the full stop on the second landing line turns into
  // Pac-Man and eats "the good bit." from right to left, while a ghost waits to
  // the left with its eyes darting. It follows the scroll both ways, so scrolling
  // back up brings the words back. His mouth only chomps while you scroll.
  var pacLine = $('.hero__line--2');
  if (pacLine && !still) {
    var mk = function (cls, svg) {
      var el = document.createElement('span');
      el.className = cls;
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = svg;
      pacLine.appendChild(el);
      return el;
    };
    var open = 'M50 50 L14.8 20.4 A46 46 0 1 1 14.8 79.6 Z';
    var shut = 'M50 50 L4.1 47.6 A46 46 0 1 1 4.1 52.4 Z';
    var pac = mk('pac', '<svg viewBox="0 0 100 100"><path d="' + shut + '" fill="#ffd400" stroke="#0d0d0d" stroke-width="5" stroke-linejoin="round">' +
      '<animate attributeName="d" values="' + shut + ';' + open + ';' + shut + '" dur="0.26s" repeatCount="indefinite"/></path>' +
      '<circle cx="50" cy="24" r="6.5" fill="#0d0d0d"/></svg>');
    var ghost = mk('ghost', '<svg viewBox="0 0 100 106">' +
      '<path class="ghost__body" d="M6 100 V48 A44 44 0 0 1 94 48 V100 L80 88 L65 100 L50 88 L35 100 L20 88 Z"/>' +
      '<circle class="ghost__eye" cx="33" cy="46" r="13" fill="#fff"/><circle class="ghost__eye" cx="67" cy="46" r="13" fill="#fff"/>' +
      '<g class="ghost__pupils"><circle cx="33" cy="48" r="6.5" fill="#2121ff"/><circle cx="67" cy="48" r="6.5" fill="#2121ff"/></g></svg>');
    var pacSvg = pac.querySelector('svg');
    pacSvg.pauseAnimations();
    var words = pacLine.querySelector('span[aria-hidden]:not(.pac):not(.ghost)');

    // Where the full stop sits, measured fresh on every resize.
    var m = null;
    var measure = function () {
      var dots = words.querySelectorAll('span');
      var dot = dots[dots.length - 1];
      var L = pacLine.getBoundingClientRect(), D = dot.getBoundingClientRect();
      var fs = parseFloat(getComputedStyle(pacLine).fontSize);
      // The period's ink is a small disc near the baseline of its glyph box.
      m = {
        fs: fs, size: 0.78 * fs,
        dotX: D.left + D.width / 2 - L.left,
        dotY: D.top - L.top + D.height * 0.78,
        midY: L.height / 2,
        ghostX: -(0.14 + 0.33) * fs   // centre of the ghost, left of the line
      };
    };

    var idle = null, lastP = -1;
    var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
    var update = function () {
      if (!m) measure();
      // The whole chase runs over about half a screen of scrolling.
      var range = Math.max(260, window.innerHeight * 0.5);
      var p = clamp((window.scrollY - 10) / range);
      if (p === lastP) return;
      var moving = lastP >= 0;
      lastP = p;

      // 0 to 0.1: the dot swells into Pac-Man where it stands.
      // 0.1 to 0.85: he eats right to left along the line.
      // 0.85 to 1: he carries on and eats the ghost.
      var grow = clamp(p / 0.1);
      var travel = clamp((p - 0.1) / 0.75);
      var chase = clamp((p - 0.85) / 0.15);
      var x = m.dotX + (0 - m.dotX) * travel + (m.ghostX - 0) * chase;
      var y = m.dotY + (m.midY - m.dotY) * grow;
      var scale = 0.26 + 0.74 * grow;

      pac.style.transform = 'translate(' + (x - m.size / 2).toFixed(1) + 'px,' + (y - m.size / 2).toFixed(1) + 'px) scale(' + scale.toFixed(3) + ')';
      pacLine.style.setProperty('--edge', Math.max(0, x).toFixed(1) + 'px');
      pacLine.classList.toggle('is-eating', p > 0.002);

      // The ghost rises once he's on the move, panics, then is eaten.
      var show = clamp((p - 0.06) * 6);
      var eaten = clamp((p - 0.93) / 0.07);
      pacLine.style.setProperty('--ghost', (show * (1 - eaten)).toFixed(3));
      pacLine.style.setProperty('--ghost-size', (1 - 0.8 * eaten).toFixed(3));
      ghost.classList.toggle('is-scared', p > 0.7);

      // Chomp only while the page is moving.
      if (moving && p > 0 && p < 1) {
        pacSvg.unpauseAnimations();
        clearTimeout(idle);
        idle = setTimeout(function () { pacSvg.pauseAnimations(); }, 160);
      }
    };
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', function () { measure(); lastP = -1; update(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); lastP = -1; update(); });
    update();
  }

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

  // A stack of the latest stills, standing in for a showreel. Between stills
  // the card bursts into TV static, like flicking channels. Clicking scrolls
  // down to the latest work.
  var cycle = $('[data-slot="heroCycle"]');
  if (cycle) {
    cycle.innerHTML = S.latest.map(function (p, i) {
      return '<button class="cycle__item' + (i === 0 ? ' is-on' : '') + '" type="button" data-scroll="#work"' +
        (i === 0 ? '' : ' tabindex="-1"') + ' aria-label="See the latest work">' +
        '<img src="' + esc(p.poster) + '" alt=""' + (i === 0 ? '' : ' loading="lazy"') + '>' +
        '<span class="cycle__cap">' + esc(p.client) + '</span></button>';
    }).join('') + '<span class="cycle__static" aria-hidden="true"></span>';
    var items = $$('.cycle__item', cycle);
    var at = 0;

    var tune = function (then) {
      cycle.classList.add('is-tuning');
      setTimeout(function () { if (then) then(); }, 170);
      setTimeout(function () { cycle.classList.remove('is-tuning'); }, 460);
    };

    if (!still) {
      tune();   // the set warming up on first load
      if (items.length > 1) {
        setInterval(function () {
          if (document.hidden) return;
          tune(function () {
            items[at].classList.remove('is-on');
            items[at].tabIndex = -1;
            at = (at + 1) % items.length;
            items[at].classList.add('is-on');
            items[at].tabIndex = 0;
          });
        }, 3600);
      }
    }
  }

  // ---------- Archive ----------

  // A quiet list made for talking through: number, still, who, what, length.
  // A section with one item (the showreel) gets a wide card instead.
  if (onArchive) {
    fill('archiveIntro', esc(A.intro || ''));
    var at0 = 0;
    fill('archive', A.sections.map(function (sec) {
      var first = at0;
      at0 += sec.items.length;
      if (!sec.items.length) return '';
      var head = '<header class="arch__head"><h2 class="arch__title">' + esc(sec.title) + '</h2>' +
        '<p class="arch__count">' + sec.items.length + (sec.items.length === 1 ? ' film' : ' films') + '</p></header>';
      if (sec.items.length === 1) {
        var p = projects[first];
        return '<section class="arch arch--feature" id="arch-' + esc(sec.id) + '" data-tone="paper">' + head +
          '<button class="feature" type="button" data-project="' + first + '" aria-label="Play ' + esc(p.client + ', ' + p.title) + '">' +
          '<span class="feature__media"><img src="' + esc(p.poster) + '" alt="" loading="lazy"><span class="feature__play">' + PLAY + '</span></span>' +
          '<span class="feature__cap"><b>' + esc(p.title) + '</b>' + (p.length ? '<span>' + mins(p.length) + '</span>' : '') + '</span>' +
          '</button></section>';
      }
      return '<section class="arch" id="arch-' + esc(sec.id) + '" data-tone="paper">' + head + '<ol class="arch__list">' +
        sec.items.map(function (it, k) {
          var i = first + k, p = projects[i];
          return '<li><button class="row" type="button" data-project="' + i + '" aria-label="Play ' + esc(p.client + ', ' + p.title) + '">' +
            '<span class="row__num">' + ('0' + (k + 1)).slice(-2) + '</span>' +
            '<span class="row__thumb"><img src="' + esc(p.poster) + '" alt="" loading="lazy"></span>' +
            '<span class="row__text"><span class="row__client">' + esc(p.client) + '</span>' +
            '<span class="row__title">' + esc(p.title) + (p.year ? ' <i>' + esc(p.year) + '</i>' : '') + '</span></span>' +
            '<span class="row__len">' + mins(p.length) + '</span>' +
            '<span class="row__play">' + PLAY + '</span></button></li>';
        }).join('') + '</ol></section>';
    }).join(''));
    fill('archiveJump', A.sections.filter(function (s) { return s.items.length; }).map(function (s) {
      return '<a href="#arch-' + esc(s.id) + '">' + esc(s.title) + ' <b>' + s.items.length + '</b></a>';
    }).join(''));
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

    info.innerHTML = infoHtml(p, cut);
  }

  // The panel beside the picture: what it is, what Peter did, who it was with.
  var info = $('#playerInfo');
  function infoHtml(p, cut) {
    var credits = (p.credits || []).filter(function (c) { return c && c[1]; });
    var did = p.did || [];
    return '<p class="info__type">' + esc(p.type) + (p.year ? ' · ' + esc(p.year) : '') + (p.length ? ' · ' + mins(p.length) : '') + '</p>' +
      '<h3 class="info__client">' + esc(p.client) + '</h3>' +
      '<p class="info__title">' + esc(p.title) + (p.credit ? ' · ' + esc(p.credit) : '') + '</p>' +
      (p.cuts.length > 1 ? '<p class="info__cut">Now playing <b>' + esc(cut.label) + '</b> · ' + p.cuts.length +
        (/Episode/.test(p.cuts[0].label) ? ' episodes' : ' versions') + '</p>' : '') +
      (p.blurb ? '<p class="info__blurb">' + esc(p.blurb) + '</p>' : '') +
      (did.length ? '<p class="info__label">What I did</p><ul class="info__did">' +
        did.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '') +
      (credits.length ? '<dl class="info__credits">' + credits.map(function (c) {
        return '<div><dt>' + esc(c[0]) + '</dt><dd>' + esc(c[1]) + '</dd></div>';
      }).join('') + '</dl>' : '');
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
    var sc = e.target.closest('[data-scroll]');
    if (sc) {
      var target = $(sc.getAttribute('data-scroll'));
      if (target) target.scrollIntoView({ behavior: still ? 'auto' : 'smooth' });
      return;
    }
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
