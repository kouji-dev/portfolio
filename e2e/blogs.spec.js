// E2E — new navbar, blogs page (URL-driven via /blogs?id=<slug>), ⌘K palette.
// Data-driven from blog-data.js: passes with an empty post list and picks up
// real posts automatically as they are added.
const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect } = require('@playwright/test');

const fileUrl = (f) => pathToFileURL(path.join(__dirname, '..', f)).href;
const getPosts = (page) => page.evaluate(() =>
  (window.BLOG_POSTS_SORTED || []).map((p) => ({
    slug: p.slug, title: p.title, category: p.category,
  })));

test.describe('navbar', () => {
  test('home shows the top bar with a Blog link and index button', async ({ page }) => {
    await page.goto('/');
    const navpill = page.locator('[data-navpill]');
    await expect(navpill).toBeVisible();
    await expect(navpill.locator('a[data-navlink="writing"]')).toHaveAttribute('href', '/blogs');
    await expect(page.locator('[data-palette-open]')).toBeVisible();
  });

  test('home writing section shows latest posts, or hides when empty', async ({ page }) => {
    await page.goto('/');
    const posts = await getPosts(page);
    if (posts.length) {
      const rows = page.locator('[data-latest-posts] .post-row');
      await expect(rows).toHaveCount(Math.min(3, posts.length));
      await expect(rows.first()).toHaveAttribute('href', /\/blogs\?id=/);
    } else {
      await expect(page.locator('#writing')).toBeHidden();
    }
    await expect(page.locator('#contact .section-num')).toHaveText('06 — Contact');
  });
});

test.describe('blogs page', () => {
  test('/blogs lists every post (or an empty state) with working filters', async ({ page }) => {
    await page.goto('/blogs');
    const posts = await getPosts(page);
    await expect(page.locator('[data-view-index]')).toBeVisible();
    await expect(page.locator('[data-view-post]')).toBeHidden();
    await expect(page.locator('[data-blog-list] .post-row')).toHaveCount(posts.length);

    if (!posts.length) {
      await expect(page.locator('[data-blog-empty]')).toBeVisible();
      await expect(page.locator('.blog-filters')).toBeHidden();
      return;
    }

    await page.fill('[data-blog-search]', 'zzz-no-match');
    await expect(page.locator('[data-blog-list] .post-row')).toHaveCount(0);
    await expect(page.locator('[data-blog-empty]')).toBeVisible();

    await page.fill('[data-blog-search]', '');
    await expect(page.locator('[data-blog-list] .post-row')).toHaveCount(posts.length);

    const cat = posts[0].category;
    const expected = posts.filter((p) => p.category === cat).length;
    await page.click(`[data-tag="${cat}"]`);
    await expect(page.locator('[data-blog-list] .post-row')).toHaveCount(expected);
  });

  test('/blogs?id=<slug> renders that article directly', async ({ page }) => {
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

  test('article back link returns to the index', async ({ page }) => {
    await page.goto('/blogs');
    const posts = await getPosts(page);
    test.skip(!posts.length, 'no posts published yet');

    await page.goto('/blogs?id=' + posts[0].slug);
    await page.click('.post-back');
    await page.waitForURL(/\/blogs$/);
    await expect(page.locator('[data-view-index]')).toBeVisible();
  });
});

test.describe('page index (⌘K palette)', () => {
  test('opens with Ctrl+K, filters, and navigates to a post', async ({ page }) => {
    await page.goto('/blogs');
    const posts = await getPosts(page);
    test.skip(!posts.length, 'no posts published yet');

    await page.keyboard.press('Control+k');
    await expect(page.locator('[data-palette]')).toBeVisible();

    await page.fill('[data-palette-input]', posts[0].title);
    await expect(page.locator('.palette-item.on')).toContainText(posts[0].title);

    await page.keyboard.press('Enter');
    await page.waitForURL(new RegExp('/blogs\\?id=' + posts[0].slug));
    await expect(page.locator('[data-post-title]')).toHaveText(posts[0].title);
  });

  test('opens with Ctrl+K, shows sections, closes with Escape', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    await expect(page.locator('[data-palette]')).toBeVisible();
    await expect(page.locator('.palette-item', { hasText: 'Featured Work' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-palette]')).toBeHidden();
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
    await expect(page.locator('.post-back')).toHaveAttribute('href', 'blogs.html');
  });

  test('unknown id redirects to the blogs.html index', async ({ page }) => {
    await page.goto(fileUrl('blogs.html') + '?id=this-post-does-not-exist');
    await page.waitForURL(/blogs\.html$/);
    await expect(page.locator('[data-view-index]')).toBeVisible();
  });
});
