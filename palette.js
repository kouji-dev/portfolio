/* =========================================================================
   Page index (⌘K command palette) — shared by index.html and blogs.html.

   Groups are rebuilt on every open so they reflect the current page:
   - "In this article"  (only when an article with h2[id] headings is shown)
   - "Sections"         (home-page anchors, prefixed with / off the home page)
   - "Blog"             (all posts from blog-data.js)
   - "Elsewhere"        (external profiles + live projects)

   Shortcuts: ⌘K / Ctrl+K toggle · "/" opens · Esc closes · ↑↓ + ↵ navigate
   ========================================================================= */
(function () {
  'use strict';

  var root = document.querySelector('[data-palette]');
  var input = document.querySelector('[data-palette-input]');
  var list = document.querySelector('[data-palette-list]');
  if (!root || !input || !list) return;

  var isHome = document.body.getAttribute('data-page') === 'home';
  // same-page anchors on home; full home links (server or file://) elsewhere
  var section = function (anchor) {
    return isHome ? '#' + anchor : window.SITE_LINKS.home(anchor);
  };

  var flat = [];   // filtered, in display order
  var sel = 0;

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildGroups() {
    var groups = [];

    var toc = Array.prototype.slice.call(
      document.querySelectorAll('[data-article] h2[id]'));
    if (toc.length) {
      groups.push({ label: 'In this article', items: toc.map(function (h) {
        return { label: h.textContent, href: '#' + h.id, glyph: '§', hint: '' };
      }) });
    }

    groups.push({ label: 'Sections', items: [
      { label: 'Top',      href: section('top'),      glyph: '01', hint: 'home' },
      { label: 'Bio',      href: section('about'),    glyph: '02', hint: 'home' },
      { label: 'Now',      href: section('now'),      glyph: '03', hint: 'home' },
      { label: 'Work',     href: section('work'),     glyph: '04', hint: 'home' },
      { label: 'Activity', href: section('activity'), glyph: '05', hint: 'home' },
      { label: 'Projects', href: section('projects'), glyph: '06', hint: 'home' },
      { label: 'Writing',  href: section('writing'),  glyph: '07', hint: 'home' },
      { label: 'Contact',  href: section('contact'),  glyph: '08', hint: 'home' }
    ] });

    var posts = window.BLOG_POSTS_SORTED || [];
    groups.push({ label: 'Blog', items: [
      { label: 'All posts', href: window.SITE_LINKS.blogs(), glyph: '≡', hint: posts.length + ' posts' }
    ].concat(posts.map(function (p) {
      return { label: p.title, href: window.SITE_LINKS.blogs(p.slug), glyph: '·', hint: p.read };
    })) });

    groups.push({ label: 'Elsewhere', items: [
      { label: 'GitHub — kouji-dev', href: 'https://github.com/kouji-dev', glyph: '↗', hint: '' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/najih-driss/', glyph: '↗', hint: '' },
      { label: 'X — @NajihDriss1', href: 'https://x.com/NajihDriss1', glyph: '↗', hint: '' },
      { label: 'Email najih.driss73@gmail.com', href: 'mailto:najih.driss73@gmail.com', glyph: '@', hint: '' },
      { label: 'Orrery — live', href: 'https://orrery.kouji.dev', glyph: '↗', hint: '' },
      { label: 'Kouji UI — live', href: 'https://ui.kouji.dev', glyph: '↗', hint: '' }
    ] });

    return groups;
  }

  function render() {
    var q = input.value.toLowerCase().trim();
    var groups = buildGroups().map(function (g) {
      return { label: g.label, items: g.items.filter(function (i) {
        return !q || i.label.toLowerCase().indexOf(q) >= 0;
      }) };
    }).filter(function (g) { return g.items.length; });

    flat = [];
    groups.forEach(function (g) { g.items.forEach(function (i) { flat.push(i); }); });
    sel = Math.max(0, Math.min(sel, flat.length - 1));

    if (!flat.length) {
      list.innerHTML = '<div class="palette-empty mono">Nothing matches that.</div>';
      return;
    }

    var fi = 0;
    list.innerHTML = groups.map(function (g) {
      return '<div class="palette-group">' +
        '<div class="palette-group-label mono">' + esc(g.label) + '</div>' +
        g.items.map(function (i) {
          var idx = fi++;
          return '<a class="palette-item' + (idx === sel ? ' on' : '') +
            '" href="' + esc(i.href) + '" data-idx="' + idx + '">' +
            '<span class="palette-glyph mono">' + esc(i.glyph) + '</span>' +
            '<span class="palette-label">' + esc(i.label) + '</span>' +
            '<span class="palette-hint mono">' + esc(i.hint) + '</span>' +
          '</a>';
        }).join('') +
      '</div>';
    }).join('');

    var on = list.querySelector('.palette-item.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
  }

  function open() {
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    input.value = '';
    sel = 0;
    render();
    setTimeout(function () { input.focus(); }, 20);
    if (window.track) window.track('palette_open', {
      page: document.body.getAttribute('data-page') || ''
    });
  }
  function close() {
    root.hidden = true;
    document.body.style.overflow = '';
  }
  function toggle() { root.hidden ? open() : close(); }

  function navigate(href) {
    if (window.track) window.track('palette_select', { link_url: href });
    close();
    if (/^https?:/.test(href)) { window.open(href, '_blank', 'noopener'); return; }
    if (/^mailto:/.test(href)) { location.href = href; return; }
    location.href = href;
  }

  /* wiring */
  Array.prototype.slice.call(document.querySelectorAll('[data-palette-open]'))
    .forEach(function (btn) { btn.addEventListener('click', open); });

  root.addEventListener('click', function (e) {
    if (e.target === root) { close(); return; }
    var item = e.target.closest('.palette-item');
    if (item) { e.preventDefault(); navigate(item.getAttribute('href')); }
  });
  root.addEventListener('mouseover', function (e) {
    var item = e.target.closest('.palette-item');
    if (!item) return;
    var idx = parseInt(item.getAttribute('data-idx'), 10);
    if (idx !== sel) { sel = idx; render(); }
  });

  input.addEventListener('input', function () { sel = 0; render(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, flat.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (flat[sel]) navigate(flat[sel].href); }
  });

  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); toggle(); return; }
    if (k === 'escape' && !root.hidden) { close(); return; }
    if (k === '/' && root.hidden) {
      var t = e.target && e.target.tagName;
      if (t !== 'INPUT' && t !== 'TEXTAREA') { e.preventDefault(); open(); }
    }
  });
})();
