// E2E — the blog: /blogs (index) and /blogs?id=<slug> (post), ported from design/BlogIndex.dc.html + BlogPost.dc.html.
// Two kinds of test:
// - "real data": reads blog-data.js at runtime, so it passes with an empty post list and picks up real posts as they land.
// - "fixture": swaps the post list for e2e/blog-fixture.js (0, 1 or many posts, one using every block type), so each
//   behaviour is covered whatever is published.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect } = require('@playwright/test');
const { full, plain } = require('./blog-fixture');

const fileUrl = (f) => pathToFileURL(path.join(__dirname, '..', f)).href;
const getPosts = (page) => page.evaluate(() =>
  (window.BLOG_POSTS_SORTED || []).map((p) => ({
    slug: p.slug, title: p.title, category: p.category,
  })));

// serve the real blog-data.js (SITE_LINKS and all) with the post list replaced
const DATA = fs.readFileSync(path.join(__dirname, '..', 'blog-data.js'), 'utf8');
const withPosts = (page, posts) => page.route('**/blog-data.js', (route) => route.fulfill({
  contentType: 'application/javascript',
  body: DATA + '\nwindow.BLOG_POSTS = ' + JSON.stringify(posts) + ';\n' +
    'window.BLOG_POSTS_SORTED = window.BLOG_POSTS.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });',
}));
const cards = (page) => page.locator('[data-blog-list] [data-post]');
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe('header', () => {
  test('the new header: brand, site links, socials, theme button; the old navbar and ⌘K palette are gone', async ({ page }) => {
    await page.goto('/blogs');
    await expect(page.locator('.brand')).toHaveAttribute('href', '/');
    const nav = page.locator('nav[aria-label="Site"]');
    await expect(nav.locator('a[data-navlink="writing"]')).toHaveAttribute('href', '/blogs');
    await expect(nav.locator('a[data-navlink="writing"]')).toHaveAttribute('aria-current', 'page');
    await expect(nav.locator('.socials a')).toHaveCount(3);
    await expect(page.locator('[data-navpill], [data-palette], [data-palette-open], .cosmos')).toHaveCount(0);
    await page.keyboard.press('Control+k');
    await expect(page.locator('[data-palette]')).toHaveCount(0);
  });

  test('the theme button flips light / dark and the choice survives a navigation in the tab', async ({ page }) => {
    await page.goto('/blogs');
    const html = page.locator('html');
    const before = await html.getAttribute('data-theme');
    const after = before === 'dark' ? 'light' : 'dark';
    await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-label', 'Switch to the ' + after + ' theme');
    await page.click('[data-theme-toggle]');
    await expect(html).toHaveAttribute('data-theme', after);
    await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-label', 'Switch to the ' + before + ' theme');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', after);
  });
});

test.describe('blogs page (real data)', () => {
  test('/blogs lists the posts (or an empty state) with working filters', async ({ page }) => {
    await page.goto('/blogs');
    const posts = await getPosts(page);
    await expect(page.locator('[data-view-index]')).toBeVisible();
    await expect(page.locator('[data-view-post]')).toBeHidden();

    if (!posts.length) {
      await expect(page.locator('[data-blog-empty]')).toContainText('No posts yet');
      await expect(page.locator('[data-blog-filters]')).toBeHidden();
      await expect(cards(page)).toHaveCount(0);
      return;
    }

    // the latest post is the wide card, the rest fill the grid, nine a page
    await expect(page.locator('[data-blog-featured]')).toHaveAttribute('data-post', posts[0].slug);
    await expect(cards(page)).toHaveCount(Math.min(posts.length - 1, 9));
    await expect(page.locator('[data-blog-count]')).toHaveText(posts.length === 1 ? '1 post' : posts.length + ' posts');

    await page.fill('[data-blog-search]', 'zzz-no-match');
    await expect(cards(page)).toHaveCount(0);
    await expect(page.locator('[data-blog-featured]')).toBeHidden();
    await expect(page.locator('[data-blog-empty]')).toBeVisible();

    await page.click('[data-blog-clear]');
    await expect(page.locator('[data-blog-featured]')).toBeVisible();

    const cat = posts[0].category;
    await page.click(`[data-tag="${cat}"]`);
    await expect(page.locator(`[data-tag="${cat}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-blog-featured]')).toBeVisible();
  });

  test('/blogs?id=<slug> renders that post directly', async ({ page }) => {
    await page.goto('/blogs');
    const posts = await getPosts(page);
    test.skip(!posts.length, 'no posts published yet');

    await page.goto('/blogs?id=' + posts[0].slug);
    await expect(page.locator('[data-view-post]')).toBeVisible();
    await expect(page.locator('[data-view-index]')).toBeHidden();
    await expect(page.locator('[data-post-title]')).toHaveText(posts[0].title);
    await expect(page).toHaveTitle(new RegExp(posts[0].title.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  test('unknown id redirects to the blog index', async ({ page }) => {
    await page.goto('/blogs?id=this-post-does-not-exist');
    await page.waitForURL(/\/blogs$/);
    await expect(page.locator('[data-view-index]')).toBeVisible();
  });

  test('the breadcrumb returns to the index', async ({ page }) => {
    await page.goto('/blogs');
    const posts = await getPosts(page);
    test.skip(!posts.length, 'no posts published yet');

    await page.goto('/blogs?id=' + posts[0].slug);
    await page.locator('.crumbs a').first().click();
    await page.waitForURL(/\/blogs$/);
    await expect(page.locator('[data-view-index]')).toBeVisible();
  });
});

test.describe('index (fixture)', () => {
  test('no posts: one empty state, no search, no chips, no pages', async ({ page }) => {
    await withPosts(page, []);
    await page.goto('/blogs');
    await expect(page.locator('[data-blog-empty]')).toContainText('No posts yet');
    await expect(page.locator('[data-blog-clear]')).toHaveCount(0);
    for (const sel of ['[data-blog-filters]', '[data-blog-featured]', '[data-blog-list]', '[data-blog-pager]']) {
      await expect(page.locator(sel)).toBeHidden();
    }
  });

  test('one post: the wide card alone, no grid, no pages', async ({ page }) => {
    await withPosts(page, [full]);
    await page.goto('/blogs');
    const top = page.locator('[data-blog-featured]');
    await expect(top).toContainText('Latest · Mar 2026');
    await expect(top.locator('h2 a')).toHaveText(full.title);
    await expect(top.locator('h2 a')).toHaveAttribute('href', '/blogs?id=fixture-full');
    await expect(top.locator('.tag')).toHaveText(['Testing', 'Fixtures', 'Blocks']);
    await expect(top.locator('svg.illo circle.ink')).toHaveCount(1); // the post's own cover
    await expect(page.locator('[data-blog-count]')).toHaveText('1 post');
    await expect(page.locator('[data-blog-list]')).toBeHidden();
    await expect(page.locator('[data-blog-pager]')).toBeHidden();
  });

  test('many posts: nine cards a page, newer / older, page numbers', async ({ page }) => {
    await withPosts(page, [full].concat(plain(12)));
    await page.goto('/blogs');
    const pager = page.locator('[data-blog-pager]');
    await expect(page.locator('[data-blog-count]')).toHaveText('13 posts');
    await expect(cards(page)).toHaveCount(9);
    await expect(cards(page).first().locator('h3')).toHaveText('Fixture post 1');
    await expect(cards(page).first().locator('svg.illo text')).toHaveText('Even'); // no cover: the topic on dotted paper
    await expect(pager.locator('[aria-disabled="true"]')).toContainText('Newer');
    await expect(pager.locator('[aria-current="page"]')).toHaveText('1');

    await pager.locator('button', { hasText: 'Older' }).click();
    await expect(cards(page)).toHaveCount(3);
    await expect(page.locator('[data-blog-featured]')).toBeHidden();
    await expect(pager.locator('[aria-current="page"]')).toHaveText('2');
    await expect(pager.locator('[aria-disabled="true"]')).toContainText('Older');

    await pager.locator('[data-page="1"]').first().click();
    await expect(cards(page)).toHaveCount(9);
    await expect(page.locator('[data-blog-featured]')).toBeVisible();
  });

  test('search and topic chips filter together; "Clear the filters" resets both', async ({ page }) => {
    await withPosts(page, [full].concat(plain(12)));
    await page.goto('/blogs');
    await expect(page.locator('[data-blog-chips] button')).toHaveText(['All', 'Testing', 'Fixtures', 'Blocks', 'Even', 'Odd']);
    await expect(page.locator('[data-tag="All"]')).toHaveAttribute('aria-pressed', 'true');

    await page.click('[data-tag="Odd"]');
    await expect(page.locator('[data-tag="Odd"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-tag="All"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-blog-count]')).toHaveText('6 posts');
    await expect(cards(page)).toHaveCount(6);
    await expect(page.locator('[data-blog-featured]')).toBeHidden();
    await expect(page.locator('[data-blog-pager]')).toBeHidden();

    await page.fill('[data-blog-search]', 'number 12.');
    await expect(page.locator('[data-blog-count]')).toHaveText('1 post');
    await expect(cards(page).locator('h3')).toHaveText(['Fixture post 12']);

    await page.fill('[data-blog-search]', 'number 11.'); // an Even post: no match under Odd
    await expect(page.locator('[data-blog-empty]')).toContainText('No post matches that.');
    await page.click('[data-blog-clear]');
    await expect(page.locator('[data-blog-search]')).toHaveValue('');
    await expect(page.locator('[data-tag="All"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-blog-count]')).toHaveText('13 posts');
  });

  test('/blogs?tag=<name> opens with that topic chosen; an unknown one falls back to All', async ({ page }) => {
    await withPosts(page, [full].concat(plain(4)));
    await page.goto('/blogs?tag=Even');
    await expect(page.locator('[data-tag="Even"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-blog-count]')).toHaveText('2 posts');
    await page.goto('/blogs?tag=Nope');
    await expect(page.locator('[data-tag="All"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-blog-count]')).toHaveText('5 posts');
  });

  test('a phone-wide screen never scrolls sideways, long titles included', async ({ page }) => {
    const long = Object.assign({}, plain(1)[0], { title: 'Supercalifragilistic'.repeat(5) });
    await withPosts(page, [long, full].concat(plain(3).slice(1)));
    await page.setViewportSize({ width: 340, height: 700 });
    await page.goto('/blogs');
    await expect(cards(page)).toHaveCount(3);
    expect(await noSideScroll(page)).toBe(true);
    await page.goto('/blogs?id=fixture-full');
    await expect(page.locator('[data-post-title]')).toBeVisible();
    expect(await noSideScroll(page)).toBe(true);
    await page.goto('/blogs?id=fixture-1');
    await expect(page.locator('[data-post-title]')).toBeVisible();
    expect(await noSideScroll(page)).toBe(true);
  });
});

test.describe('post (fixture)', () => {
  test.beforeEach(async ({ page }) => {
    await withPosts(page, [full].concat(plain(4)));
    await page.goto('/blogs?id=fixture-full');
  });

  test('head: breadcrumb, series, title, date and read time, cover, meta tags', async ({ page }) => {
    const art = page.locator('.post-art');
    await expect(art.locator('.crumbs a')).toHaveText(['Writing', 'Testing']);
    await expect(art.locator('.crumbs a').nth(1)).toHaveAttribute('href', '/blogs?tag=Testing');
    await expect(art.locator('.series')).toHaveText('Fixture series · part 1 of 2');
    await expect(page.locator('[data-post-title]')).toHaveText(full.title);
    await expect(page.locator('[data-post-meta]')).toHaveText(/^Mar 2026 · \d+ min read$/);
    await expect(art.locator('.post-head + .cover figcaption')).toHaveText('The cover caption.');
    await expect(art.locator('.post-head + .cover svg[role="img"]')).toHaveAttribute('aria-label', 'A circle');

    await expect(page).toHaveTitle('Fixture: every block — Driss Najih');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.kouji.dev/blogs?id=fixture-full');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', full.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', full.dek);
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(ld['@type']).toBe('BlogPosting');
    expect(ld.datePublished).toBe('2026-03-10');
  });

  test('a given `read` wins over the worked-out read time', async ({ page }) => {
    await page.unroute('**/blog-data.js');
    await withPosts(page, [Object.assign({}, full, { read: '42 min' })]);
    await page.goto('/blogs?id=fixture-full');
    await expect(page.locator('[data-post-meta]')).toHaveText('Mar 2026 · 42 min read');
  });

  test('side column: contents from the h2s, the series, the tags', async ({ page }) => {
    const toc = page.locator('[data-toc] a');
    await expect(toc).toHaveText(['First section', 'Second section', 'Notes']);
    await expect(toc.first()).toHaveAttribute('aria-current', 'location');
    for (const href of await toc.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      await expect(page.locator('.prose h2' + href)).toHaveCount(1);
    }
    await expect(page.locator('.prose h2#first-section .anchor')).toHaveAttribute('href', '#first-section');

    const series = page.locator('.toc-series li');
    await expect(series).toHaveText(['1 · Fixture: every block', '2 · not out yet']);
    await expect(series.first().locator('a')).toHaveAttribute('aria-current', 'page');

    const tag = page.locator('.post-side a.tag', { hasText: 'Fixtures' });
    await expect(tag).toHaveAttribute('href', '/blogs?tag=Fixtures');
    await tag.click();
    await expect(page.locator('[data-tag="Fixtures"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-blog-count]')).toHaveText('1 post');
  });

  test('every block type renders', async ({ page }) => {
    const prose = page.locator('.prose');
    for (const sel of ['p.lead', 'h2#first-section', 'h3', 'blockquote footer', 'p.pull', 'ul:not(.tasks) > li', 'ol:not(.footnotes) > li',
      'p.list-title', 'ul.tasks input[disabled]', 'figure.code', 'figure.code.term', '.tabs [role="tab"]', 'aside.callout svg',
      '.table-box table th[scope="col"]', 'figure.cover figcaption', 'figure.arch .arch-node', '.arch-fail', '.metrics .metric-n.ai-grad',
      '.faq details summary', 'a.linkcard', 'hr', 'ol.footnotes li#fn1', 'p.changelog']) {
      await expect(prose.locator(sel).first(), sel).toBeAttached();
    }
    await expect(prose.locator('ul.tasks input:checked')).toHaveCount(1);
    await expect(prose.locator('aside.callout')).toHaveAttribute('aria-label', 'Careful');
    await expect(prose.locator('.arch-node')).toHaveCount(3);
    await expect(prose.locator('.arch-arrow')).toHaveCount(2);
    await expect(prose.locator('.linkcard-u')).toHaveText('example.com');
    await expect(prose.locator('.table-box td code')).toHaveText(['src/**', 'docs/**']);
    await expect(prose).not.toContainText('renders nothing'); // an unknown block type is skipped
  });

  test('inline marks render; raw HTML and unsafe links stay text', async ({ page }) => {
    const lead = page.locator('.prose p.lead');
    for (const sel of ['strong', 'em', 's', 'mark', 'code', 'kbd', 'abbr[title="continuous integration"]', 'a[href="https://example.com"]', 'sup.fn a[href="#fn1"]']) {
      await expect(lead.locator(sel), sel).toHaveCount(1);
    }
    await expect(lead.locator('b')).toHaveCount(0);
    await expect(lead).toContainText('<b>raw</b>');
    await expect(page.locator('.prose a[href^="javascript"]')).toHaveCount(0);
    await expect(page.locator('.prose')).toContainText('[bad](javascript:alert(1))');
    await expect(page.locator('#fn1 a')).toHaveAttribute('href', '#fnref1');
  });

  test('code: numbered and coloured lines, a highlighted line, terminal and diff variants', async ({ page }) => {
    const file = page.locator('figure.code[data-lang="ts"]');
    await expect(file.locator('.code-file')).toHaveText('a.ts');
    await expect(file.locator('.lang')).toHaveText('TS');
    await expect(file.locator('.ln')).toHaveCount(2); // the trailing newline adds no line
    await expect(file.locator('.ln.hl .no')).toHaveText('2');
    await expect(file.locator('.t-k')).toHaveText('const');
    await expect(file.locator('.t-c')).toContainText('// one');
    await expect(file.locator('.t-f')).toHaveText('foo');
    await expect(file.locator('.t-s')).toHaveText('"x"');

    const term = page.locator('figure.code.term');
    await expect(term.locator('.code-file')).toContainText('Terminal');
    await expect(term.locator('.t-prompt')).toHaveCount(2);
    await expect(term.locator('.t-out')).toHaveText('hi');

    const diff = page.locator('figure.code[data-lang="diff"]');
    await expect(diff.locator('.ln.add')).toContainText('pull_request:');
    await expect(diff.locator('.ln.del .sr')).toContainText('removed');
    await expect(diff.locator('.copy')).toHaveCount(0);
  });

  test('copy buttons: code, terminal commands only, and the post link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    // Windows hands the clipboard back with CRLF line ends
    const clip = () => page.evaluate(() => navigator.clipboard.readText()).then((t) => t.replace(/\r\n/g, '\n'));

    const codeBtn = page.locator('figure.code[data-lang="ts"] .copy');
    await expect(codeBtn).toHaveAttribute('aria-label', 'Copy the code from a.ts');
    await codeBtn.click();
    await expect(codeBtn).toHaveText('Copied');
    expect(await clip()).toBe('const a = 1; // one\nfoo("x");');
    await expect(codeBtn).toHaveText('Copy'); // the label comes back

    await page.locator('figure.code.term .copy').click();
    await expect(page.locator('figure.code.term .copy')).toHaveText('Copied');
    expect(await clip()).toBe('echo hi\nls');

    const links = page.locator('[data-copy-link]');
    await expect(links).toHaveCount(2); // under the title and under the post
    await links.first().click();
    await expect(links.first()).toHaveText('Link copied');
    expect(await clip()).toBe('https://www.kouji.dev/blogs?id=fixture-full');
    await expect(links.first()).toHaveText('Copy link');

    const events = await page.evaluate(() => (window.dataLayer || []).filter((e) => e && e[0] === 'event').map((e) => e[1]));
    expect(events).toEqual(expect.arrayContaining(['copy_code', 'share']));
  });

  test('a refused clipboard says so instead of pretending', async ({ page }) => {
    await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('denied')); });
    const btn = page.locator('[data-copy-link]').first();
    await btn.click();
    await expect(btn).toHaveText('Copy failed');
  });

  test('share links carry the canonical post URL', async ({ page }) => {
    const enc = encodeURIComponent('https://www.kouji.dev/blogs?id=fixture-full');
    await expect(page.locator('a[aria-label="Share on X"]')).toHaveAttribute('href', new RegExp('^https://x\\.com/intent/post\\?url=' + enc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await expect(page.locator('a[aria-label="Share on LinkedIn"]')).toHaveAttribute('href', 'https://www.linkedin.com/sharing/share-offsite/?url=' + enc);
  });

  test('a figure with field "shader" sits on the drifting multicolour field, not on the dotted paper', async ({ page }) => {
    await withPosts(page, [Object.assign({}, full, { body: [{ t: 'figure', field: 'shader', alt: 'A mark', svg: '<circle cx="320" cy="180" r="60" fill="#fff"></circle>' }, { t: 'figure', alt: 'Plain', svg: '<circle class="ink" cx="320" cy="180" r="60"></circle>' }] })]);
    await page.goto('/blogs?id=' + full.slug);
    const figs = page.locator('[data-view-post] figure svg.illo');
    const shader = page.locator('[data-view-post] svg.illo-shader');
    await expect(shader).toHaveCount(1);
    await expect(shader.locator('rect.bg')).toHaveCount(0);
    await expect(shader).toHaveCSS('background-blend-mode', /overlay/);
    await expect(shader).toHaveCSS('animation-name', 'illo-drift');
    await expect(figs.last().locator('rect.bg')).toHaveCount(1);
    // reduced motion: the field stays, still
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(shader).toHaveCSS('animation-name', 'none');
  });

  test('tabs switch the code block shown', async ({ page }) => {
    const tabs = page.locator('.tabs [role="tab"]'), panels = page.locator('.tabs [role="tabpanel"]');
    await expect(tabs).toHaveText(['bash', 'PowerShell']);
    await expect(panels.nth(0)).toBeVisible();
    await expect(panels.nth(1)).toBeHidden();
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'false');
    await expect(panels.nth(0)).toBeHidden();
    await expect(panels.nth(1).locator('.code-file')).toHaveText('a.ps1');
  });

  test('after the post: tags, newer / older, read next; no author box', async ({ page }) => {
    await expect(page.locator('.after-tags a.tag')).toHaveText(['Testing', 'Fixtures', 'Blocks']);
    await expect(page.locator('.author-box')).toHaveCount(0);

    const more = page.locator('.more-posts .linkcard');
    await expect(more.nth(0)).toHaveAttribute('aria-disabled', 'true');
    await expect(more.nth(0)).toContainText('This is the latest post');
    await expect(more.nth(1)).toHaveAttribute('href', '/blogs?id=fixture-1');
    await expect(more.nth(1)).toContainText('Fixture post 1');

    // read next: two posts that are neither this one nor its neighbours
    await expect(page.locator('.related .rel h3')).toHaveText(['Fixture post 2', 'Fixture post 3']);

    await page.goto('/blogs?id=fixture-4'); // the oldest
    await expect(page.locator('.more-posts .linkcard').nth(1)).toContainText('This is the first post');
    await expect(page.locator('.more-posts a.linkcard')).toHaveAttribute('href', '/blogs?id=fixture-3');
  });

  test('a lone post has no newer / older and no read next; a post without h2 has no contents list', async ({ page }) => {
    await page.unroute('**/blog-data.js');
    await withPosts(page, plain(1));
    await page.goto('/blogs?id=fixture-1');
    await expect(page.locator('[data-post-title]')).toHaveText('Fixture post 1');
    await expect(page.locator('.more-posts, .related, [data-toc], .series, .post-art .cover')).toHaveCount(0);
    await expect(page.locator('.post-side a.tag')).toHaveText(['Even']);
  });
});

test.describe('analytics (GA4 dataLayer)', () => {
  const eventNames = (page) => page.evaluate(() =>
    (window.dataLayer || [])
      .filter((e) => e && e[0] === 'event')
      .map((e) => e[1]));

  test('blogs page sends a manual page_view after routing', async ({ page }) => {
    await page.goto('/blogs');
    const events = await page.evaluate(() =>
      (window.dataLayer || [])
        .filter((e) => e && e[0] === 'event' && e[1] === 'page_view')
        .map((e) => e[2] || {}));
    expect(events.length).toBe(1);
    expect(events[0].page_title).toContain('Writing');
  });

  test('post page_view carries post dimensions', async ({ page }) => {
    await page.goto('/blogs');
    const posts = await getPosts(page);
    test.skip(!posts.length, 'no posts published yet');

    await page.goto('/blogs?id=' + posts[0].slug);
    const pv = await page.evaluate(() =>
      (window.dataLayer || [])
        .filter((e) => e && e[0] === 'event' && e[1] === 'page_view')
        .map((e) => e[2] || {})[0]);
    expect(pv.post_slug).toBe(posts[0].slug);
    expect(pv.post_category).toBe(posts[0].category);
  });

  test('choosing a topic and a CV download are tracked', async ({ page }) => {
    await withPosts(page, [full]);
    await page.goto('/blogs');
    await page.click('[data-tag="Testing"]');
    expect(await eventNames(page)).toContain('select_content');
    await page.goto('/');
    await page.click('a[download][href*="cv-en-short"]');
    expect(await eventNames(page)).toContain('file_download');
  });
});

test.describe('file:// fallback (site opened straight from disk)', () => {
  test('blog links fall back to blogs.html', async ({ page }) => {
    await page.goto(fileUrl('index.html'));
    await expect(page.locator('a[data-navlink="writing"]')).toHaveAttribute('href', 'blogs.html');

    const posts = await getPosts(page);
    if (!posts.length) return;
    const row = page.locator('[data-latest-posts] .post-row').first();
    await expect(row).toHaveAttribute('href', /^blogs\.html\?id=/);
    await row.click();
    await page.waitForURL(/blogs\.html\?id=/);
    await expect(page.locator('[data-post-title]')).toHaveText(posts[0].title);
    await expect(page.locator('.crumbs a').first()).toHaveAttribute('href', 'blogs.html');
  });

  test('the blog header and an unknown id fall back to .html links', async ({ page }) => {
    await page.goto(fileUrl('blogs.html') + '?id=this-post-does-not-exist');
    await page.waitForURL(/blogs\.html$/);
    await expect(page.locator('[data-view-index]')).toBeVisible();
    await expect(page.locator('.brand')).toHaveAttribute('href', 'index.html');
    await expect(page.locator('a[data-navlink="writing"]')).toHaveAttribute('href', 'blogs.html');
  });
});
