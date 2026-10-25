// E2E — minimal home (design/Minimal.dc.html): sections, theme toggle,
// activity sparkline from trajectory-data.js, injected sky painting.
const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect } = require('@playwright/test');

test.describe('home', () => {
  test('renders the header and every section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1.name')).toHaveText('@NAJIH Driss');
    expect(await page.locator('.socials a').evaluateAll((as) => as.map((a) => a.title))).toEqual(['GitHub', 'LinkedIn', 'X']);
    await expect(page.locator('.socials a[aria-label="Follow on X"]')).toHaveAttribute('href', 'https://x.com/NajihDriss1');
    await expect(page.locator('#contact a', { hasText: /GitHub|LinkedIn/ })).toHaveCount(0);
    for (const id of ['about', 'now', 'work', 'activity', 'projects', 'contact']) {
      await expect(page.locator('#' + id)).toBeVisible();
    }
    await expect(page.locator('#work .rows li')).toHaveCount(5);
    await expect(page.locator('#projects .rows li')).toHaveCount(5);
    await expect(page.locator('#contact a[download][href*="cv-fr-short"]')).toBeVisible();
  });

  test('writing shows latest posts, or hides when empty', async ({ page }) => {
    await page.goto('/');
    const n = await page.evaluate(() => (window.BLOG_POSTS_SORTED || []).length);
    if (n) {
      await expect(page.locator('[data-latest-posts] .post-row')).toHaveCount(Math.min(6, n));
    } else {
      await expect(page.locator('#writing')).toBeHidden();
    }
  });

  test('theme toggle flips data-theme, sky and persists', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const before = await html.getAttribute('data-theme');
    const after = before === 'light' ? 'dark' : 'light';
    await page.click('[data-theme-toggle]');
    await expect(html).toHaveAttribute('data-theme', after);
    await expect(page.locator('.pt')).toHaveAttribute('data-sky', after === 'light' ? 'day' : 'night');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', after);
  });

  test('activity readout sums every repo and reads weeks on hover and keys', async ({ page }) => {
    await page.goto('/');
    const total = await page.evaluate(() => {
      const d = window.TRAJECTORY_DATA;
      return Object.values(d.m).flat().reduce((a, b) => a + b, 0);
    });
    const readout = page.locator('[data-act-readout]');
    await expect(readout).toContainText(total.toLocaleString('en-GB') + ' commits');
    await expect(page.locator('[data-act-ticks] span').first()).toHaveText('Dec');

    await page.locator('[data-act-hits] span').nth(10).hover();
    await expect(readout).toContainText('Week of');
    await expect(page.locator('[data-act-dot]')).toBeVisible();

    await page.locator('[data-act-chart]').focus();
    await page.keyboard.press('Home');
    await expect(readout).toContainText('Week of 1 Dec 2025');
    await page.keyboard.press('Escape');
    await expect(readout).toContainText('commits ·');
  });

  test('sky painting is injected and responds to a click', async ({ page }) => {
    await page.goto('/');
    const pt = page.locator('.sky .pt');
    await expect(pt).toHaveCount(1);
    // force day so a click is a gust
    await page.evaluate(() => localStorage.setItem('dn-theme', 'light'));
    await page.reload();
    await page.locator('.sky').click();
    await expect(pt).toHaveAttribute('data-gust', '1');
  });

  test('AI layer: project hover labels the painting, chart draws, chip tooltip', async ({ page }) => {
    await page.goto('/');
    const pt = page.locator('.sky .pt');
    await expect(page.locator('.sky .pt-net')).toHaveCount(1);
    await page.locator('#projects li[data-p="vortex"]').hover();
    await expect(pt).toHaveAttribute('data-focus', 'vortex');
    await page.locator('#contact').hover();
    await expect(pt).toHaveAttribute('data-focus', '');

    await page.locator('[data-act-chart]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-act-chart]')).toHaveAttribute('data-drawn', '1');

    await page.locator('.ai-chip').focus();
    await expect(page.locator('#ai-tip')).toHaveCSS('opacity', '1');
    await expect(page.locator('.ai-trail')).toHaveCount(7);
  });

  test('painting loads after the page, fonts are self-hosted, GA waits', async ({ page }) => {
    const external = [];
    page.on('request', (r) => { if (/fonts\.g|googletagmanager/.test(r.url())) external.push(r.url()); });
    await page.goto('/');
    await expect(page.locator('.sky .pt')).toHaveCount(1);
    await expect(page.locator('.sky-inner')).toHaveClass(/is-in/);
    // sky.js is requested only once the page has loaded
    const t = await page.evaluate(() => [performance.getEntriesByType('navigation')[0].loadEventStart, performance.getEntriesByType('resource').find((r) => /\/sky\.js/.test(r.name)).startTime]);
    expect(t[1]).toBeGreaterThanOrEqual(t[0]);
    // gtag.js is not in the markup; it is requested after load
    expect(await page.locator('script[src*="googletagmanager"]').evaluateAll((ss) => ss.every((s) => !s.closest('head') || s.async))).toBe(true);
    const ga = await page.evaluate(() => performance.getEntriesByType('resource').filter((r) => /googletagmanager/.test(r.name)).map((r) => r.startTime));
    for (const start of ga) expect(start).toBeGreaterThanOrEqual(t[0]);
    expect(external.filter((u) => /fonts\.g/.test(u))).toEqual([]);
    expect(await page.evaluate(() => document.fonts.check('600 28px "Space Grotesk"'))).toBe(true);
  });

  test('painting quality steps down while frames run slow', async ({ page }) => {
    // every frame takes ~40 ms (25 fps): full → lite → static
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (f) => raf((t) => { const end = performance.now() + 40; while (performance.now() < end); f(t); });
    });
    await page.goto('/');
    const pt = page.locator('.sky .pt');
    await expect(pt).toHaveAttribute('data-q', 'lite', { timeout: 10000 });
    await expect(pt).toHaveAttribute('data-q', 'static', { timeout: 10000 });
    expect(await page.evaluate(() => sessionStorage.getItem('dn-sky-q'))).toBe('static');
    // the level holds for the session
    await page.reload();
    await expect(pt).toHaveAttribute('data-q', 'static');
  });

  test('sky painting also loads from file://', async ({ page }) => {
    await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href);
    await expect(page.locator('.sky .pt svg').first()).toBeVisible();
  });
});
