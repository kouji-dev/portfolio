/* =========================================================================
   Analytics — GA4 helper + site-wide delegated tracking.

   Loaded (deferred) before the page scripts on every page. Everything
   no-ops when gtag is unavailable (blocked / offline), so the site never
   depends on GA being loaded.

   Event naming follows GA4 recommended events where one exists
   (page_view, search, select_content, file_download, click for outbound)
   and snake_case custom events elsewhere (read_25…, copy_code, palette_*).
   ========================================================================= */
(function () {
  'use strict';

  window.track = function (name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  };

  function postSlug(href) {
    var m = /[?&]id=([^&#]+)/.exec(href || '');
    return m ? decodeURIComponent(m[1]) : null;
  }

  /* One delegated listener covers static markup AND dynamically rendered
     links (blog rows, prev/next, palette items). Capture phase so it still
     fires when a handler preventDefaults and navigates programmatically. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';

    // CV / file downloads
    if (a.hasAttribute('download')) {
      var file = href.split('/').pop();
      window.track('file_download', {
        file_name: file,
        file_extension: file.indexOf('.') >= 0 ? file.split('.').pop() : '',
        link_text: (a.textContent || '').trim().slice(0, 60)
      });
      return;
    }

    // contact
    if (href.indexOf('mailto:') === 0) {
      window.track('contact_click', { method: 'email' });
      return;
    }

    // outbound links (GitHub, LinkedIn, live demos, …)
    if (/^https?:/.test(href) && a.hostname && a.hostname !== location.hostname) {
      window.track('click', { outbound: true, link_url: href, link_domain: a.hostname });
      return;
    }

    // internal links to a blog post (home rows, index rows, prev/next, palette)
    var slug = postSlug(href);
    if (slug && href.indexOf('blogs') >= 0) {
      window.track('select_content', { content_type: 'post', content_id: slug });
    }
  }, true);
})();
