/* =========================================================================
   Blog page (blogs.html) — static content, URL-driven.

   Routing (query param, no client router):
   - /blogs           → index view (search + tag filter over all posts)
   - /blogs?id=<slug> → article view for that post
   - /blogs?id=<bad>  → redirect (location.replace) to /blogs

   Renders synchronously at deferred-script time, before cosmos.js runs its
   reveal/FX setup, so [data-reveal] nodes exist when they get observed.
   ========================================================================= */
(function () {
  'use strict';

  var posts = window.BLOG_POSTS_SORTED || [];

  var viewIndex = document.querySelector('[data-view-index]');
  var viewPost = document.querySelector('[data-view-post]');
  if (!viewIndex || !viewPost) return;

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function postHref(p) { return window.SITE_LINKS.blogs(p.slug); }

  /* ---------------------------------------------------------------------
     Routing
     --------------------------------------------------------------------- */
  var id = new URLSearchParams(location.search).get('id');
  var active = id ? posts.filter(function (p) { return p.slug === id; })[0] : null;

  if (id && !active) {
    // unknown post id → back to the full index
    location.replace(window.SITE_LINKS.blogs());
    return;
  }

  if (active) renderPost(active);
  else renderIndex();

  /* ---------------------------------------------------------------------
     Index view — search + tag chips + rows
     --------------------------------------------------------------------- */
  function rowHTML(p, full) {
    var left = full
      ? '<span class="post-row-date"><span class="mono">' + esc(p.dateLabel) + '</span>' +
        '<span class="post-row-cat mono">' + esc(p.category) + '</span></span>'
      : '<span class="post-row-date mono">' + esc(p.dateLabel) + '</span>';
    return '<a class="post-row" data-reveal href="' + postHref(p) + '">' +
      left +
      '<span class="post-row-main">' +
        '<span class="post-row-title">' + esc(p.title) + '</span>' +
        '<span class="post-row-dek">' + esc(p.dek) + '</span>' +
      '</span>' +
      '<span class="post-row-read mono">' + esc(p.read) + '</span>' +
    '</a>';
  }

  function renderIndex() {
    viewIndex.hidden = false;
    document.title = 'Blog — Driss Najih · Notes from the build';
    // manual page_view (config uses send_page_view:false)
    window.track('page_view', {
      page_title: document.title,
      page_location: location.href
    });

    var list = viewIndex.querySelector('[data-blog-list]');
    var empty = viewIndex.querySelector('[data-blog-empty]');
    var search = viewIndex.querySelector('[data-blog-search]');
    var chipHost = viewIndex.querySelector('[data-blog-chips]');

    var state = { q: '', tag: 'All' };
    var tags = ['All'].concat(posts.map(function (p) { return p.category; })
      .filter(function (t, i, a) { return a.indexOf(t) === i; }));

    if (!posts.length) {
      // nothing published yet — no point showing search/filters
      viewIndex.querySelector('.blog-filters').hidden = true;
      empty.textContent = 'No posts yet — first notes are on the way.';
      empty.hidden = false;
      return;
    }

    function renderChips() {
      chipHost.innerHTML = tags.map(function (t) {
        return '<button type="button" class="chip mono' + (t === state.tag ? ' on' : '') +
          '" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
      }).join('');
    }
    function renderList(first) {
      var q = state.q.toLowerCase().trim();
      var filtered = posts.filter(function (p) {
        var okTag = state.tag === 'All' || p.category === state.tag;
        var hay = (p.title + ' ' + p.dek + ' ' + p.category + ' ' + p.tags.join(' ')).toLowerCase();
        return okTag && (!q || hay.indexOf(q) >= 0);
      });
      list.innerHTML = filtered.map(function (p) { return rowHTML(p, true); }).join('');
      empty.hidden = filtered.length > 0;
      // rows rendered after the initial reveal pass show immediately
      if (!first) {
        Array.prototype.slice.call(list.querySelectorAll('[data-reveal]'))
          .forEach(function (el) { el.classList.add('is-visible'); });
      }
    }

    renderChips();
    renderList(true);

    var searchTimer = null;
    search.addEventListener('input', function () {
      state.q = search.value;
      renderList(false);
      // report the term once typing settles, not per keystroke
      clearTimeout(searchTimer);
      var term = search.value.trim().toLowerCase();
      if (term.length >= 2) {
        searchTimer = setTimeout(function () {
          window.track('search', { search_term: term });
        }, 900);
      }
    });
    chipHost.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tag]');
      if (!btn) return;
      state.tag = btn.getAttribute('data-tag');
      window.track('select_content', { content_type: 'tag', content_id: state.tag });
      renderChips();
      renderList(false);
    });
  }

  /* ---------------------------------------------------------------------
     Article view — blocks, code copy + highlight, TOC, prev/next
     --------------------------------------------------------------------- */
  function blockHTML(b, headingId) {
    if (b.t === 'p') return '<p class="art-p">' + esc(b.text) + '</p>';
    if (b.t === 'h2') return '<h2 class="art-h2" id="' + headingId + '">' + esc(b.text) + '</h2>';
    if (b.t === 'quote') return '<p class="art-quote">' + esc(b.text) + '</p>';
    if (b.t === 'list') {
      return '<ul class="art-list">' + b.items.map(function (it) {
        return '<li><span class="art-list-dash mono">—</span><span>' + esc(it) + '</span></li>';
      }).join('') + '</ul>';
    }
    if (b.t === 'code') {
      return '<div class="codebox">' +
        '<div class="codebox-bar">' +
          '<span class="codebox-lang mono">' + esc(b.lang) + '</span>' +
          '<button type="button" class="codebox-copy mono" data-copy>copy</button>' +
        '</div>' +
        '<pre><code class="mono" data-lang="' + esc(b.lang) + '">' + esc(b.text) + '</code></pre>' +
      '</div>';
    }
    return '';
  }

  function renderPost(post) {
    viewPost.hidden = false;
    document.title = post.title + ' — Driss Najih';
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', post.dek);
    // manual page_view with post dimensions (config uses send_page_view:false)
    window.track('page_view', {
      page_title: document.title,
      page_location: location.href,
      post_slug: post.slug,
      post_category: post.category,
      read_time: post.read
    });

    viewPost.querySelector('[data-post-meta]').innerHTML =
      '<span class="c-accent">' + esc(post.category) + '</span>' +
      '<span class="meta-dot"></span><span>' + esc(post.dateLabel) + '</span>' +
      '<span class="meta-dot"></span><span>' + esc(post.read) + ' read</span>';
    viewPost.querySelector('[data-post-title]').textContent = post.title;
    viewPost.querySelector('[data-post-dek]').textContent = post.dek;

    // body blocks + TOC
    var hi = 0;
    var body = post.body.map(function (b) {
      return blockHTML(b, b.t === 'h2' ? 'h-' + (hi++) : '');
    }).join('');

    body += '<div class="art-tags">' + post.tags.map(function (t) {
      return '<span class="tech mono">' + esc(t) + '</span>';
    }).join('') + '</div>';

    var ai = posts.indexOf(post);
    var pn = [];
    if (posts[ai - 1]) pn.push({ dir: '← Previous', p: posts[ai - 1] });
    if (posts[ai + 1]) pn.push({ dir: 'Next →', p: posts[ai + 1] });
    if (pn.length) {
      body += '<div class="prevnext">' + pn.map(function (x) {
        return '<a class="prevnext-card" href="' + postHref(x.p) + '">' +
          '<span class="prevnext-dir mono">' + esc(x.dir) + '</span>' +
          '<span class="prevnext-title">' + esc(x.p.title) + '</span>' +
        '</a>';
      }).join('') + '</div>';
    }

    var article = viewPost.querySelector('[data-post-body]');
    article.innerHTML = body;

    var tocHost = viewPost.querySelector('[data-toc-links]');
    var heads = post.body.filter(function (b) { return b.t === 'h2'; });
    tocHost.innerHTML = heads.map(function (b, i) {
      return '<a href="#h-' + i + '" data-toclink="h-' + i + '">' + esc(b.text) + '</a>';
    }).join('');

    setupCopy(article, post);
    highlightPending(article);
    setupReadingFX(article, post);
  }

  function setupCopy(article, post) {
    article.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy]');
      if (!btn) return;
      var code = btn.closest('.codebox').querySelector('code');
      var src = code.getAttribute('data-src') || code.textContent;
      window.track('copy_code', {
        post_slug: post.slug,
        lang: code.getAttribute('data-lang') || ''
      });
      try {
        navigator.clipboard.writeText(src);
        btn.textContent = 'copied';
        setTimeout(function () { btn.textContent = 'copy'; }, 1400);
      } catch (err) { /* clipboard unavailable — leave the label alone */ }
    });
  }

  var hlTimer = null;
  function highlightPending(article) {
    var nodes = Array.prototype.slice.call(article.querySelectorAll('code[data-lang]'));
    if (!nodes.length) return;
    if (typeof hljs === 'undefined') {
      // highlight.js CDN may still be loading — retry until it lands
      if (!hlTimer) {
        hlTimer = setInterval(function () {
          if (typeof hljs !== 'undefined') {
            clearInterval(hlTimer); hlTimer = null;
            highlightPending(article);
          }
        }, 120);
      }
      return;
    }
    nodes.forEach(function (n) {
      if (n.getAttribute('data-src') != null) return;
      var src = n.textContent;
      n.setAttribute('data-src', src);
      var lang = n.getAttribute('data-lang') || 'plaintext';
      try {
        var out = hljs.getLanguage(lang)
          ? hljs.highlight(src, { language: lang })
          : hljs.highlightAuto(src);
        n.innerHTML = out.value;
      } catch (e) { /* keep escaped plaintext */ }
    });
  }

  /* reading progress bar + active TOC heading + read-depth milestones */
  function setupReadingFX(article, post) {
    var bar = document.querySelector('[data-readbar]');
    var tocLinks = Array.prototype.slice.call(document.querySelectorAll('[data-toclink]'));
    var raf = null;
    var milestones = [
      { at: 25, name: 'read_25' },
      { at: 50, name: 'read_50' },
      { at: 75, name: 'read_75' },
      { at: 98, name: 'read_complete' }
    ];

    function update() {
      var vh = window.innerHeight || 800;
      var r = article.getBoundingClientRect();
      var p = Math.min(Math.max((vh * 0.5 - r.top) / Math.max(r.height - vh * 0.5, 1), 0), 1);
      if (bar) {
        bar.style.display = 'block';
        bar.style.width = (p * 100) + '%';
      }
      while (milestones.length && p * 100 >= milestones[0].at) {
        window.track(milestones.shift().name, {
          post_slug: post.slug,
          post_category: post.category
        });
      }
      var cur = null;
      Array.prototype.slice.call(article.querySelectorAll('h2[id]')).forEach(function (h) {
        if (h.getBoundingClientRect().top < vh * 0.3) cur = h.id;
      });
      tocLinks.forEach(function (a) {
        a.classList.toggle('on', a.getAttribute('data-toclink') === cur);
      });
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(function () { raf = null; update(); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }
})();
