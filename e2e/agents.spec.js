// E2E — what crawlers and AI agents read: llms.txt, markdown, sitemap, robots, 404, privacy, structured data,
// plus the a11y fixes Lighthouse flagged and the painting CSS staying off the critical path.
const { test, expect } = require('@playwright/test');

test.describe('agent readiness', () => {
  test('llms.txt, index.md, robots.txt and sitemap.xml are served', async ({ request }) => {
    const llms = await request.get('/llms.txt');
    expect(llms.status()).toBe(200);
    const llmsText = await llms.text();
    expect(llmsText).toMatch(/^# Driss Najih/);
    expect(llmsText).toContain('## When to use this');
    expect(llmsText).toContain('najih.driss73@gmail.com');

    const md = await request.get('/index.md');
    expect(md.status()).toBe(200);
    expect(await md.text()).toContain('## Projects');

    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Sitemap: https://www.kouji.dev/sitemap.xml');

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    for (const loc of ['https://www.kouji.dev/', 'https://www.kouji.dev/blogs', 'https://www.kouji.dev/about', 'https://www.kouji.dev/contact', 'https://www.kouji.dev/privacy']) expect(xml).toContain(`<loc>${loc}</loc>`);
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });

  test('unknown paths return a real 404 that points agents somewhere useful', async ({ page }) => {
    const res = await page.goto('/no-such-page');
    expect(res.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
    await expect(page.locator('[data-path]')).toHaveText('/no-such-page');
    for (const href of ['/', '/blogs', '/sitemap.xml', '/llms.txt']) await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
  });

  test('the privacy page exists and is linked from the home footer', async ({ page }) => {
    const res = await page.goto('/privacy');
    expect(res.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
    expect((await page.locator('main').innerText()).length).toBeGreaterThan(500);
    await page.goto('/');
    await expect(page.locator('footer a[href="/privacy"]')).toHaveCount(1);
  });

  test('about and contact pages exist with real content and are linked from the home footer', async ({ page }) => {
    for (const [path, h1] of [['/about', 'About Driss Najih'], ['/contact', 'Contact']]) {
      const res = await page.goto(path);
      expect(res.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
      expect((await page.locator('main').innerText()).length).toBeGreaterThan(500);
    }
    await expect(page.locator('main a[href="mailto:najih.driss73@gmail.com"]')).toHaveCount(1);
    await page.goto('/');
    for (const href of ['/about', '/contact']) await expect(page.locator(`footer a[href="${href}"]`)).toHaveCount(1);
  });

  test('home carries canonical, og:image and Person / business JSON-LD', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.kouji.dev/');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://www.kouji.dev/og.png');
    expect((await request.get('/og.png')).headers()['content-type']).toContain('image/png');
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    const types = ld['@graph'].map((n) => n['@type']);
    expect(types).toEqual(expect.arrayContaining(['Person', 'ProfessionalService', 'WebSite']));
    const biz = ld['@graph'].find((n) => n['@type'] === 'ProfessionalService');
    expect(biz.contactPoint.email).toBe('najih.driss73@gmail.com');
    expect(biz.address['@type']).toBe('PostalAddress');
  });

  test('Lighthouse a11y fixes: the chart has a role, kouji/ui links are named by their text', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-act-chart]')).toHaveAttribute('role', 'group');
    const kj = page.locator('a.kj');
    await expect(kj).toHaveCount(2);
    for (const a of await kj.all()) {
      await expect(a).not.toHaveAttribute('aria-label', /.*/);
      await expect(a).toHaveAccessibleName('kouji/ui');
    }
  });

  test('the painting CSS never blocks the first paint: it loads after window load', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('dn-svg-painting', '1'));
    await page.goto('/');
    await expect(page.locator('.sky .pt')).toBeAttached({ timeout: 30000 });
    const t = await page.evaluate(() => {
      const r = performance.getEntriesByType('resource').find((e) => /home-paint\.css/.test(e.name));
      return { load: performance.getEntriesByType('navigation')[0].loadEventStart, start: r && r.startTime, blocking: r && r.renderBlockingStatus };
    });
    expect(t.start).toBeGreaterThanOrEqual(t.load);
    expect(t.blocking).not.toBe('blocking');
    expect(await page.locator('head link[rel="stylesheet"][href="home-paint.css"]').count()).toBe(1);
  });
});
