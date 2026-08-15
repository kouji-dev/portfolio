/* =========================================================================
   Blog posts — single source of truth.

   Currently empty: the mock posts from the design handoff were removed;
   real posts get added here one by one.

   Consumed by:
   - blog.js     (blogs.html — index + article rendering, ?id= routing)
   - index.html  (latest-3 rows in the "Notes from the build" section,
                  hidden while there are no posts)
   - palette.js  (⌘K page index — "Blog" group)

   Post shape:
   {
     slug: 'url-safe-id',            // /blogs?id=<slug>
     title: '…',
     dek: 'one-paragraph standfirst',
     date: 'YYYY-MM-DD', dateLabel: 'Mon D, YYYY', read: 'N min',
     category: 'Agents',             // becomes a filter chip
     tags: ['…'],
     body: [                         // block types: p | h2 | quote | list | code
       { t: 'p',     text: '…' },
       { t: 'h2',    text: '…' },
       { t: 'quote', text: '…' },
       { t: 'list',  items: ['…'] },
       { t: 'code',  lang: 'bash', text: '…' }
     ]
   }
   ========================================================================= */

/* Link helpers — clean URLs (/blogs, /#about) need a server that maps them
   (Vercel cleanUrls, `serve`). Opened straight from disk (file://) those
   resolve to the drive root, so fall back to explicit .html links. */
window.SITE_LINKS = (function () {
  var isFile = location.protocol === 'file:';
  return {
    blogs: function (slug) {
      return (isFile ? 'blogs.html' : '/blogs') +
        (slug ? '?id=' + encodeURIComponent(slug) : '');
    },
    home: function (anchor) {
      return (isFile ? 'index.html' : '/') + (anchor ? '#' + anchor : '');
    }
  };
})();

/* rewrite the static root-absolute anchors in the HTML when on file://
   (runs at deferred-script time, so the DOM is already parsed) */
if (location.protocol === 'file:') {
  Array.prototype.slice.call(document.querySelectorAll('a[href^="/"]'))
    .forEach(function (a) {
      var h = a.getAttribute('href');
      if (h === '/') a.setAttribute('href', 'index.html');
      else if (h.indexOf('/#') === 0) a.setAttribute('href', 'index.html' + h.slice(1));
      else if (h.indexOf('/blogs') === 0) a.setAttribute('href', 'blogs.html' + h.slice(6));
    });
}

window.BLOG_POSTS = [];

/* newest first, shared by every consumer */
window.BLOG_POSTS_SORTED = window.BLOG_POSTS.slice().sort(function (a, b) {
  return a.date < b.date ? 1 : -1;
});
