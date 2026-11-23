/* =========================================================================
   Blog page (blogs.html) — static content, URL-driven.
   Ported from design/BlogIndex.dc.html and design/BlogPost.dc.html.

   Routing (query param, no client router):
   - /blogs            → index (search + topic filter + pages over all posts)
   - /blogs?tag=<name> → index, that topic preselected
   - /blogs?id=<slug>  → that post
   - /blogs?id=<bad>   → redirect (location.replace) to /blogs

   Everything comes from blog-data.js (window.BLOG_POSTS_SORTED); the post
   shape and every block type are documented at the top of that file.

   Limits:
   - No JavaScript, no posts: the page shows the header and a <noscript> note.
   - Code colouring is a small line-by-line tokenizer (comments, strings,
     numbers, keywords, calls): a comment or a string that spans lines is
     only coloured on its first line.
   - Copy buttons need the Clipboard API (https or localhost); elsewhere,
     file:// included, they answer "Copy failed".
   - A footnote cited twice gets two links with the same id; "back" returns
     to the first.
   ========================================================================= */
(function () {
  'use strict';

  var posts = window.BLOG_POSTS_SORTED || [];
  var L = window.SITE_LINKS;
  var SITE = 'https://www.kouji.dev';
  var PER_PAGE = 9; // cards per index page, the latest post sits above them on page 1

  var viewIndex = document.querySelector('[data-view-index]');
  var viewPost = document.querySelector('[data-view-post]');
  if (!viewIndex || !viewPost) return;

  /* ---------- theme button: flips light / dark, remembered for the tab ---------- */
  var html = document.documentElement;
  var themeBtn = document.querySelector('[data-theme-toggle]');
  function themeLabel() {
    var label = 'Switch to the ' + (html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark') + ' theme';
    themeBtn.setAttribute('aria-label', label);
    themeBtn.title = label;
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      try { sessionStorage.setItem('dn-theme', next); } catch (e) { /* private mode: the flip lasts for this page */ }
      themeLabel();
    });
    themeLabel();
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function postHref(p) { return L.blogs(p.slug); }
  function tagHref(t) { return L.blogs() + '?tag=' + encodeURIComponent(t); }
  /* a post's topics: its category first, then its tags, each once */
  function topics(p) {
    return [p.category].concat(p.tags || []).filter(function (t, i, a) { return t && a.indexOf(t) === i; });
  }
  function month(p) {
    return new Date(p.date + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  /* `read` when the post gives it, else 220 words a minute over everything in the body */
  function readTime(p) {
    return p.read || Math.max(1, Math.round(JSON.stringify(p.body || []).split(/\s+/).length / 220)) + ' min';
  }
  function tagsHTML(p, linked) {
    return topics(p).map(function (t) {
      return linked ? '<a class="tag" href="' + esc(tagHref(t)) + '">' + esc(t) + '</a>' : '<span class="tag">' + esc(t) + '</span>';
    }).join('');
  }
  function setMeta(sel, attr, value) {
    var m = document.querySelector(sel);
    if (m) m.setAttribute(attr, value);
  }
  /* answers on the button itself, then puts its label back */
  function copy(btn, text, done) {
    var idle = btn.getAttribute('data-idle') || btn.textContent;
    btn.setAttribute('data-idle', idle);
    function say(t) {
      btn.textContent = t;
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.textContent = idle; }, 1600);
    }
    try {
      navigator.clipboard.writeText(text).then(function () { say(done); }, function () { say('Copy failed'); });
    } catch (e) { say('Copy failed'); }
  }

  /* An illustration: dotted paper, then the author's drawing — `svg` (inner markup on a 640×360 canvas, using the
     .ink / .f-* classes of blog.css, so it follows the theme) or `src` (an image file). With neither, the topic's name. */
  var illoN = 0;
  function illo(c, fallback) {
    c = c || {};
    if (c.src) return '<img class="illo" src="' + esc(c.src) + '" alt="' + esc(c.alt) + '" width="640" height="360" loading="lazy">';
    var id = 'dots-' + (illoN++);
    return '<svg class="illo" viewBox="0 0 640 360" ' + (c.alt ? 'role="img" aria-label="' + esc(c.alt) + '"' : 'aria-hidden="true"') + '>' +
      '<defs><pattern id="' + id + '" width="16" height="16" patternUnits="userSpaceOnUse"><circle class="dot" cx="2" cy="2" r="1.1"></circle></pattern></defs>' +
      '<rect class="bg" width="640" height="360"></rect><rect width="640" height="360" fill="url(#' + id + ')"></rect>' +
      (c.svg || '<text class="txt big" x="32" y="328">' + esc(fallback) + '</text>') + '</svg>';
  }
  function postIllo(p) { return illo(p.cover, topics(p)[0]); }

  /* ---------------------------------------------------------------------
     Index — search, topic chips, the latest post, the grid, pages
     --------------------------------------------------------------------- */
  function featuredHTML(p) {
    return '<a class="illo-link" href="' + esc(postHref(p)) + '" aria-hidden="true" tabindex="-1">' + postIllo(p) + '</a>' +
      '<div class="featured-body">' +
        '<span class="date">Latest · ' + esc(month(p)) + '</span>' +
        '<h2><a href="' + esc(postHref(p)) + '">' + esc(p.title) + '</a></h2>' +
        '<p>' + esc(p.dek) + '</p>' +
        '<div class="tags">' + tagsHTML(p) + '</div>' +
        '<a class="btn" href="' + esc(postHref(p)) + '">Read the post <span aria-hidden="true">→</span></a>' +
      '</div>';
  }
  function cardHTML(p) {
    return '<article class="card" data-post="' + esc(p.slug) + '">' +
      '<a class="illo-link" href="' + esc(postHref(p)) + '" aria-hidden="true" tabindex="-1">' + postIllo(p) + '</a>' +
      '<div class="card-meta"><span class="date">' + esc(month(p)) + '</span>' + tagsHTML(p) + '</div>' +
      '<h3><a href="' + esc(postHref(p)) + '">' + esc(p.title) + '</a></h3>' +
      '<p>' + esc(p.dek) + '</p>' +
    '</article>';
  }
  function pagerHTML(page, pages) {
    var nums = '';
    for (var i = 1; i <= pages; i++) {
      nums += '<button type="button" class="btn icon-btn" data-page="' + i + '" aria-label="Page ' + i + '"' +
        (i === page ? ' aria-current="page"' : '') + '>' + i + '</button>';
    }
    function step(to, label, on) {
      return on ? '<button type="button" class="btn" data-page="' + to + '">' + label + '</button>'
        : '<span class="btn" aria-disabled="true">' + label + '</span>';
    }
    return step(page - 1, '<span aria-hidden="true">←</span> Newer', page > 1) +
      '<div class="pager-nums">' + nums + '</div>' +
      step(page + 1, 'Older <span aria-hidden="true">→</span>', page < pages);
  }

  function renderIndex() {
    viewIndex.hidden = false;
    // manual page_view (config uses send_page_view:false)
    window.track('page_view', { page_title: document.title, page_location: location.href });

    var q = function (sel) { return viewIndex.querySelector(sel); };
    var search = q('[data-blog-search]'), chipHost = q('[data-blog-chips]'), count = q('[data-blog-count]');
    var featured = q('[data-blog-featured]'), list = q('[data-blog-list]'), empty = q('[data-blog-empty]'), pager = q('[data-blog-pager]');

    if (!posts.length) {
      // nothing published yet: no search, no filters, one plain line
      q('[data-blog-filters]').hidden = true;
      empty.innerHTML = '<h2>No posts yet.</h2><p>The first one is being written.</p>';
      empty.hidden = false;
      return;
    }

    var tags = ['All'];
    posts.forEach(function (p) { topics(p).forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); }); });
    var want = params.get('tag');
    var state = { q: '', tag: tags.indexOf(want) >= 0 ? want : 'All', page: 1 };

    // chips are built once and only re-pressed after, so a keyboard user keeps the focus on the one just used
    chipHost.innerHTML = tags.map(function (t) {
      return '<button type="button" class="btn" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');

    function draw() {
      var needle = state.q.trim().toLowerCase();
      var hits = posts.filter(function (p) {
        var all = topics(p);
        return (state.tag === 'All' || all.indexOf(state.tag) >= 0) &&
          (!needle || (p.title + ' ' + p.dek + ' ' + all.join(' ')).toLowerCase().indexOf(needle) >= 0);
      });
      // the latest post gets the wide card when it matches; the rest fill the grid, PER_PAGE at a time
      var top = hits[0] === posts[0] ? posts[0] : null;
      var rest = top ? hits.slice(1) : hits;
      var pages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
      state.page = Math.min(Math.max(state.page, 1), pages);
      var shown = rest.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);

      [].forEach.call(chipHost.children, function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-tag') === state.tag ? 'true' : 'false');
      });
      count.textContent = hits.length === 1 ? '1 post' : hits.length + ' posts';
      featured.hidden = !(top && state.page === 1);
      featured.innerHTML = featured.hidden ? '' : featuredHTML(top);
      featured.setAttribute('data-post', featured.hidden ? '' : top.slug);
      list.hidden = !shown.length;
      list.innerHTML = shown.map(cardHTML).join('');
      empty.hidden = hits.length > 0;
      pager.hidden = pages < 2;
      pager.innerHTML = pager.hidden ? '' : pagerHTML(state.page, pages);
    }
    draw();

    var searchTimer = null;
    search.addEventListener('input', function () {
      state.q = search.value;
      state.page = 1;
      draw();
      // report the term once typing settles, not per keystroke
      clearTimeout(searchTimer);
      var term = search.value.trim().toLowerCase();
      if (term.length >= 2) searchTimer = setTimeout(function () { window.track('search', { search_term: term }); }, 900);
    });
    chipHost.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tag]');
      if (!btn) return;
      state.tag = btn.getAttribute('data-tag');
      state.page = 1;
      window.track('select_content', { content_type: 'tag', content_id: state.tag });
      draw();
    });
    q('[data-blog-clear]').addEventListener('click', function () {
      state.q = search.value = '';
      state.tag = 'All';
      state.page = 1;
      draw();
      search.focus();
    });
    pager.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-page]');
      if (!btn) return;
      state.page = +btn.getAttribute('data-page');
      draw();
      // the pager was redrawn under the pointer: put the reader, and the focus, at the top of the new page
      var first = list.querySelector('h3 a');
      if (first) first.focus({ preventScroll: true });
      viewIndex.scrollIntoView();
    });
  }

  /* ---------------------------------------------------------------------
     Post — inline marks, code, blocks
     --------------------------------------------------------------------- */

  /* Inline marks inside any text of a block (documented in blog-data.js). Text is escaped first, so raw HTML never
     gets through; code spans and link targets are set aside so the other marks cannot reach into them. */
  function inline(s) {
    var kept = [];
    function keep(h) { kept.push(h); return '\u0000' + (kept.length - 1) + '\u0000'; }
    return esc(s)
      .replace(/`([^`]+)`/g, function (m, c) { return keep('<code>' + c + '</code>'); })
      .replace(/\[\^(\d+)\]/g, function (m, n) { return keep('<sup class="fn"><a href="#fn' + n + '" id="fnref' + n + '" aria-label="Note ' + n + '">' + n + '</a></sup>'); })
      .replace(/\[\[([^\]]+)\]\]/g, '<kbd>$1</kbd>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
        // only real destinations: no javascript:, no data:
        return /^(https?:|mailto:|\/|#)/.test(u) ? keep('<a href="' + u + '">') + t + '</a>' : m;
      })
      .replace(/\[([^\]]+)\]\{([^}]+)\}/g, function (m, t, title) { return keep('<abbr title="' + title + '">') + t + '</abbr>'; })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/~~([^~]+)~~/g, '<s>$1</s>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>')
      .replace(/\u0000(\d+)\u0000/g, function (m, i) { return kept[i]; });
  }

  /* One line of code → coloured spans. shortcut: line by line and language-blind (one keyword list, `#` comments
     for shell-like languages, `//` for the rest); move to a real highlighter if a post needs block comments. */
  var KEYWORDS = /^(?:as|async|await|break|case|catch|class|const|continue|def|default|do|done|elif|else|enum|esac|export|extends|fi|final|finally|fn|for|from|func|function|git|if|impl|implements|import|in|interface|let|match|mut|new|of|package|private|protected|pub|public|return|static|struct|switch|then|throw|try|type|use|var|void|while|yield|true|false|null|undefined|None|True|False|self|this)$/;
  var HASH_LANGS = /^(?:bash|sh|shell|zsh|yaml|yml|python|py|powershell|ps1|toml|ruby|dockerfile|ini)$/;
  var PLAIN_LANGS = /^(?:|text|plain|txt|output)$/;
  function colour(line, lang) {
    if (PLAIN_LANGS.test(lang)) return esc(line);
    var re = new RegExp('((?:^|\\s)' + (HASH_LANGS.test(lang) ? '#' : '\\/\\/') + '.*$)' +
      '|("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|`(?:\\\\.|[^`\\\\])*`)' +
      '|\\b(\\d[\\d_.]*)\\b' +
      '|([A-Za-z_$][\\w$]*)(\\s*\\()?', 'g');
    var out = '', last = 0, m;
    while ((m = re.exec(line))) {
      var word = m[4], cls = m[1] ? 't-c' : m[2] ? 't-s' : m[3] ? 't-n' : KEYWORDS.test(word) ? 't-k' : m[5] ? 't-f' : '';
      var text = word ? word : m[0], tail = word ? m[5] || '' : '';
      out += esc(line.slice(last, m.index)) + (cls ? '<span class="' + cls + '">' + esc(text) + '</span>' : esc(text)) + esc(tail);
      last = re.lastIndex;
    }
    return out + esc(line.slice(last));
  }

  var TERM_ICON = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l6 6-6 6M12 18h8"></path></svg>';
  var ARROW = '<svg class="arch-arrow" aria-hidden="true" width="34" height="14" viewBox="0 0 34 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 7h30M25 1.5L31 7l-6 5.5"></path></svg>';
  var BACK_ICON = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"></path></svg>';
  var OUT_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h9v9M18 6L6 18"></path></svg>';
  var TONES = { // callouts: the icon and the title carry the tone, not colour alone
    note: '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 7.5v.5"></path>',
    tip: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"></path>',
    warn: '<path d="M12 3.5l9.5 16.5h-19z"></path><path d="M12 10v4.5M12 17.2v.3"></path>',
    bad: '<path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z"></path><path d="M9 9l6 6M15 9l-6 6"></path>'
  };
  var FLOW_TONES = { orr: 1, note: 1, tip: 1, warn: 1, bad: 1 };

  function renderPost(post) {
    var url = SITE + '/blogs?id=' + encodeURIComponent(post.slug);
    var all = topics(post), read = readTime(post), when = month(post);

    viewPost.hidden = false;
    document.title = post.title + ' — Driss Najih';
    setMeta('meta[name="description"]', 'content', post.dek);
    setMeta('meta[property="og:type"]', 'content', 'article');
    setMeta('meta[property="og:title"]', 'content', post.title);
    setMeta('meta[property="og:description"]', 'content', post.dek);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('link[rel="canonical"]', 'href', url);
    var ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.dek,
      datePublished: post.date, keywords: all.join(', '), url: url, mainEntityOfPage: url,
      author: { '@type': 'Person', '@id': SITE + '/#person', name: 'Driss Najih', url: SITE + '/' }
    });
    document.head.appendChild(ld);
    // manual page_view with post dimensions (config uses send_page_view:false)
    window.track('page_view', {
      page_title: document.title, page_location: location.href,
      post_slug: post.slug, post_category: post.category, read_time: read
    });

    var heads = [];   // { id, text } of every h2, for the contents list
    var copies = [];  // what each code block's Copy button puts on the clipboard
    var taskN = 0;

    function headId(text) {
      var base = String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section', hid = base, n = 2;
      while (hid === 'notes' || heads.some(function (h) { return h.id === hid; })) hid = base + '-' + (n++);
      return hid;
    }
    function h2HTML(hid, text) {
      heads.push({ id: hid, text: text });
      return '<h2 id="' + hid + '">' + esc(text) + '<a class="anchor" href="#' + hid + '" aria-label="Link to the section ' + esc(text) + '">#</a></h2>';
    }

    /* code: files (numbered, coloured, optional highlighted lines), `terminal` (lines starting with "$ " are
       commands, the rest is output; Copy takes the commands only) and `diff` (+ / - lines; no Copy) */
    function codeHTML(b) {
      var lang = String(b.lang || '').toLowerCase(), term = lang === 'terminal', diff = lang === 'diff';
      var src = String(b.text == null ? '' : b.text).replace(/\n$/, '').split('\n'), marked = b.hl || [];
      var lines = src.map(function (l, i) {
        if (term) {
          return '<span class="ln"><span class="lc">' + (l.indexOf('$ ') === 0
            ? '<span class="t-prompt" aria-hidden="true">$ </span>' + esc(l.slice(2))
            : '<span class="t-out">' + (esc(l) || ' ') + '</span>') + '</span></span>';
        }
        if (diff) {
          var sign = l.charAt(0), kind = sign === '+' ? 'add' : sign === '-' ? 'del' : '';
          return '<span class="ln ' + kind + '"><span class="no sign" aria-hidden="true">' + (kind === 'add' ? '+' : kind === 'del' ? '−' : ' ') + '</span>' +
            '<span class="lc">' + (kind ? '<span class="sr">' + (kind === 'add' ? 'added: ' : 'removed: ') + '</span>' : '') +
            (esc(kind || sign === ' ' ? l.slice(1) : l) || ' ') + '</span></span>';
        }
        return '<span class="ln' + (marked.indexOf(i + 1) >= 0 ? ' hl' : '') + '"><span class="no" aria-hidden="true">' + (i + 1) + '</span>' +
          '<span class="lc">' + (colour(l, lang) || ' ') + '</span></span>';
      }).join('');
      copies.push(term ? src.filter(function (l) { return l.indexOf('$ ') === 0; }).map(function (l) { return l.slice(2); }).join('\n') : src.join('\n'));
      var name = term ? 'Terminal' : b.file || '';
      return '<figure class="code' + (term ? ' term' : '') + '" data-lang="' + esc(lang) + '">' +
        '<div class="code-head"><span class="mono code-file">' + (term ? TERM_ICON : '') + esc(name) + '</span><span class="code-tools">' +
          (term || !lang ? '' : '<span class="lang">' + esc(lang.toUpperCase()) + '</span>') +
          (diff ? '' : '<button type="button" class="copy" data-copy="' + (copies.length - 1) + '" aria-label="' +
            esc(term ? 'Copy the commands' : name ? 'Copy the code from ' + name : 'Copy the code') + '">Copy</button>') +
        '</span></div><pre><code>' + lines + '</code></pre></figure>';
    }

    function blockHTML(b) {
      switch (b.t) {
        case 'p': return '<p>' + inline(b.text) + '</p>';
        case 'lead': return '<p class="lead">' + inline(b.text) + '</p>';
        case 'h2': return h2HTML(headId(b.text), b.text);
        case 'h3': return '<h3>' + esc(b.text) + '</h3>';
        case 'quote': return '<blockquote><p>' + inline(b.text) + '</p>' + (b.cite ? '<footer>' + inline(b.cite) + '</footer>' : '') + '</blockquote>';
        case 'pull': return '<p class="pull">' + inline(b.text) + '</p>';
        case 'hr': return '<hr>';
        case 'list':
          return (b.title ? '<p class="list-title">' + inline(b.title) + '</p>' : '') +
            (b.ordered ? '<ol>' : '<ul>') + (b.items || []).map(function (it) { return '<li>' + inline(it) + '</li>'; }).join('') + (b.ordered ? '</ol>' : '</ul>');
        case 'tasks':
          return (b.title ? '<p class="list-title">' + inline(b.title) + '</p>' : '') +
            '<ul class="tasks">' + (b.items || []).map(function (it) {
              var tid = 'task-' + (taskN++);
              return '<li><input type="checkbox" id="' + tid + '"' + (it.done ? ' checked' : '') + ' disabled><label for="' + tid + '">' + inline(it.text) + '</label></li>';
            }).join('') + '</ul>';
        case 'code': return codeHTML(b);
        case 'tabs':
          return '<div class="tabs"><div role="tablist" aria-label="' + esc(b.label || 'Variants') + '" class="tablist">' +
            (b.tabs || []).map(function (tab, i) {
              return '<button type="button" role="tab" class="tab" aria-selected="' + (i === 0) + '">' + esc(tab.label) + '</button>';
            }).join('') + '</div>' +
            (b.tabs || []).map(function (tab, i) {
              return '<div role="tabpanel" aria-label="' + esc(tab.label) + '"' + (i ? ' hidden' : '') + '>' + codeHTML(tab) + '</div>';
            }).join('') + '</div>';
        case 'callout':
          var tone = TONES[b.tone] ? b.tone : 'note';
          return '<aside class="callout" style="--tone:var(--' + tone + ')" aria-label="' + esc(b.title || tone) + '">' +
            '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="callout-ic">' + TONES[tone] + '</svg>' +
            '<div>' + (b.title ? '<p class="callout-t">' + inline(b.title) + '</p>' : '') + '<p>' + inline(b.text) + '</p></div></aside>';
        case 'table':
          return '<div class="table-box" role="region" tabindex="0" aria-label="' + esc(b.label || 'Table') + '"><table>' +
            '<thead><tr>' + (b.head || []).map(function (c) { return '<th scope="col">' + inline(c) + '</th>'; }).join('') + '</tr></thead>' +
            '<tbody>' + (b.rows || []).map(function (r) {
              return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
            }).join('') + '</tbody></table></div>';
        case 'figure':
          return '<figure class="cover">' + illo(b, '') + (b.caption ? '<figcaption>' + inline(b.caption) + '</figcaption>' : '') + '</figure>';
        case 'flow':
          return '<figure class="arch"><div class="arch-row">' + (b.nodes || []).map(function (n, i) {
            var node = '<div class="arch-node"' + (FLOW_TONES[n.tone] ? ' style="border-color:var(--' + n.tone + ')"' : '') + '>' +
              '<span class="mono arch-k">' + (i < 9 ? '0' : '') + (i + 1) + '</span><strong>' + esc(n.title) + '</strong>' +
              (n.sub ? '<span class="arch-s">' + esc(n.sub) + '</span>' : '') + '</div>';
            if (n.fail) node = '<div class="arch-col">' + node + '<div class="arch-fail mono">' + BACK_ICON + ' ' + esc(n.fail) + '</div></div>';
            return (i ? ARROW : '') + node;
          }).join('') + '</div>' + (b.caption ? '<figcaption>' + inline(b.caption) + '</figcaption>' : '') + '</figure>';
        case 'metrics':
          return '<div class="metrics">' + (b.items || []).map(function (m) {
            return '<div class="metric"><span class="metric-n ai-grad">' + esc(m.n) + '</span><span class="metric-l">' + inline(m.label) + '</span></div>';
          }).join('') + '</div>';
        case 'faq':
          return '<div class="faq">' + (b.items || []).map(function (f) {
            return '<details><summary>' + inline(f.q) + '</summary><p>' + inline(f.a) + '</p></details>';
          }).join('') + '</div>';
        case 'cards':
          return '<div class="cards2">' + (b.items || []).map(function (c) {
            var ok = /^(https?:|mailto:|\/|#)/.test(c.href), host = '';
            try { host = new URL(c.href, location.href).hostname; } catch (e) { /* no host line */ }
            return '<a class="linkcard" href="' + (ok ? esc(c.href) : '#') + '"><span class="linkcard-ic" aria-hidden="true">' + OUT_ICON + '</span>' +
              '<span class="linkcard-b"><strong>' + esc(c.title) + '</strong>' + (c.text ? '<span>' + esc(c.text) + '</span>' : '') +
              (host ? '<span class="mono linkcard-u">' + esc(host) + '</span>' : '') + '</span></a>';
          }).join('') + '</div>';
      }
      return ''; // an unknown block type renders nothing rather than breaking the post
    }

    var body = (post.body || []).map(blockHTML).join('');
    var notes = post.notes || [], log = post.changelog || [];
    if (notes.length || log.length) {
      body += '<hr><section aria-labelledby="notes">' + h2HTML('notes', 'Notes') +
        (notes.length ? '<ol class="footnotes">' + notes.map(function (n, i) {
          return '<li id="fn' + (i + 1) + '">' + inline(n) + ' <a href="#fnref' + (i + 1) + '" aria-label="Back to the text">↑ back</a></li>';
        }).join('') + '</ol>' : '') +
        log.map(function (line) { return '<p class="changelog mono">Changelog · ' + esc(line) + '</p>'; }).join('') +
        '</section>';
    }

    /* the series: every post sharing `series.name`, by `part`; parts up to `series.of` with no post yet show as not out */
    var seriesPill = '', seriesSide = '';
    if (post.series && post.series.name) {
      var parts = {}, total = post.series.of || 0;
      posts.forEach(function (p) {
        if (p.series && p.series.name === post.series.name) { parts[p.series.part] = p; total = Math.max(total, p.series.part || 0, p.series.of || 0); }
      });
      seriesPill = '<span class="series"><i aria-hidden="true"></i>' + esc(post.series.name) + ' · part ' + esc(post.series.part) + ' of ' + total + '</span>';
      var rows = '';
      for (var n = 1; n <= total; n++) {
        rows += '<li>' + (parts[n]
          ? '<a href="' + esc(postHref(parts[n])) + '"' + (parts[n] === post ? ' aria-current="page"' : '') + '>' + n + ' · ' + esc(parts[n].title) + '</a>'
          : '<span>' + n + ' · not out yet</span>') + '</li>';
      }
      seriesSide = '<section aria-labelledby="ser-h"><p id="ser-h" class="side-h">Series · ' + esc(post.series.name) + '</p><ol class="toc toc-series">' + rows + '</ol></section>';
    }

    /* newer / older, then up to two other posts, the ones sharing the most topics first */
    var at = posts.indexOf(post), newer = posts[at - 1], older = posts[at + 1];
    function stepHTML(p, label, none) {
      return p ? '<a class="linkcard" href="' + esc(postHref(p)) + '"><span class="date">' + label + '</span><b>' + esc(p.title) + '</b></a>'
        : '<span class="linkcard" aria-disabled="true"><span class="date">' + label + '</span><span>' + none + '</span></span>';
    }
    function shared(p) { return topics(p).filter(function (t) { return all.indexOf(t) >= 0; }).length; }
    var related = posts.filter(function (p) { return p !== post && p !== newer && p !== older; })
      .sort(function (a, b) { return shared(b) - shared(a); }).slice(0, 2);

    var shareBtns = '<button type="button" class="btn btn-sm" data-copy-link>Copy link</button>';
    var authorBox = document.querySelector('[data-author-box]');

    viewPost.innerHTML =
      '<aside aria-label="About this post" class="post-side">' +
        (heads.length ? '<nav aria-labelledby="toc-h" data-toc><p id="toc-h" class="side-h">On this page</p><ol class="toc">' +
          heads.map(function (h) { return '<li><a href="#' + h.id + '">' + esc(h.text) + '</a></li>'; }).join('') + '</ol></nav>' : '') +
        seriesSide +
        (all.length ? '<section aria-labelledby="tag-h"><p id="tag-h" class="side-h">Tags</p><div class="tags">' + tagsHTML(post, true) + '</div></section>' : '') +
      '</aside>' +
      '<article class="post-art">' +
        '<header class="post-head">' +
          '<nav aria-label="Breadcrumb" class="crumbs"><a href="' + esc(L.blogs()) + '">Writing</a>' +
            (all[0] ? '<span aria-hidden="true">/</span><a href="' + esc(tagHref(all[0])) + '">' + esc(all[0]) + '</a>' : '') + '</nav>' +
          seriesPill +
          '<h1 data-post-title>' + esc(post.title) + '</h1>' +
          '<p class="post-dek">' + esc(post.dek) + '</p>' +
          '<div class="byline">' +
            '<div class="by"><span class="avatar" aria-hidden="true">DN</span><div class="by-text"><a href="' + esc(L.home()) + '">Driss Najih</a>' +
              '<span class="date" data-post-meta>' + esc(when) + ' · ' + esc(read) + ' read</span></div></div>' +
            '<div class="share">' + shareBtns +
              '<a class="btn icon-btn btn-sm" href="https://x.com/intent/post?url=' + encodeURIComponent(url) + '&amp;text=' + encodeURIComponent(post.title) + '" aria-label="Share on X"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"></path></svg></a>' +
              '<a class="btn icon-btn btn-sm" href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url) + '" aria-label="Share on LinkedIn"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"></path></svg></a>' +
            '</div>' +
          '</div>' +
        '</header>' +
        (post.cover ? '<figure class="cover">' + postIllo(post) + (post.cover.caption ? '<figcaption>' + inline(post.cover.caption) + '</figcaption>' : '') + '</figure>' : '') +
        '<div class="prose" data-post-body>' + body + '</div>' +
        '<div class="after-tags"><div class="tags">' + tagsHTML(post, true) + '</div>' + shareBtns + '</div>' +
        (authorBox ? '<section aria-label="Author" class="author-box">' + authorBox.innerHTML + '</section>' : '') +
        (posts.length > 1 ? '<nav aria-label="More posts" class="more-posts">' +
          stepHTML(newer, '← Newer', 'This is the latest post') + stepHTML(older, 'Older →', 'This is the first post') + '</nav>' : '') +
        (related.length ? '<section aria-labelledby="rel-h" class="related"><h2 id="rel-h">Read next</h2><div class="rel-grid">' +
          related.map(function (p) {
            return '<article class="rel"><a class="illo-link" href="' + esc(postHref(p)) + '" aria-hidden="true" tabindex="-1">' + postIllo(p) + '</a>' +
              '<span class="date">' + esc([month(p)].concat(topics(p)).join(' · ')) + '</span>' +
              '<h3><a href="' + esc(postHref(p)) + '">' + esc(p.title) + '</a></h3></article>';
          }).join('') + '</div></section>' : '') +
      '</article>';

    viewPost.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy],[data-copy-link],[role="tab"]');
      if (!btn) return;
      if (btn.hasAttribute('data-copy-link')) {
        window.track('share', { method: 'copy_link', content_type: 'post', item_id: post.slug });
        copy(btn, url, 'Link copied');
      } else if (btn.hasAttribute('data-copy')) {
        window.track('copy_code', { post_slug: post.slug, lang: btn.closest('.code').getAttribute('data-lang') || '' });
        copy(btn, copies[+btn.getAttribute('data-copy')], 'Copied');
      } else {
        var box = btn.closest('.tabs'), tabs = box.querySelectorAll('[role="tab"]'), panels = box.querySelectorAll('[role="tabpanel"]');
        [].forEach.call(tabs, function (tab, i) {
          tab.setAttribute('aria-selected', tab === btn ? 'true' : 'false');
          panels[i].hidden = tab !== btn;
        });
      }
    });

    setupReading(viewPost.querySelector('[data-post-body]'), post);
    // the browser looked for #section before the post existed: go there now
    if (location.hash.length > 1) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
  }

  /* the section being read, marked in the contents list + read-depth milestones for analytics */
  function setupReading(article, post) {
    var links = [].slice.call(viewPost.querySelectorAll('[data-toc] a'));
    var heads = [].slice.call(article.querySelectorAll('h2[id]'));
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
      while (milestones.length && p * 100 >= milestones[0].at) {
        window.track(milestones.shift().name, { post_slug: post.slug, post_category: post.category });
      }
      var cur = heads.length ? heads[0].id : null;
      heads.forEach(function (h) { if (h.getBoundingClientRect().top < vh * 0.3) cur = h.id; });
      links.forEach(function (a) {
        if (a.getAttribute('href') === '#' + cur) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(function () { raf = null; update(); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------------------------------------------------------------------
     Routing — last, once every const above is set
     --------------------------------------------------------------------- */
  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  var active = id ? posts.filter(function (p) { return p.slug === id; })[0] : null;

  if (id && !active) {
    // unknown post id → back to the full index
    location.replace(L.blogs());
  } else if (active) renderPost(active);
  else renderIndex();
})();
