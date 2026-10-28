// E2E — home (design/Main.dc.html): sections, the sky clock and its skins,
// activity sparkline from trajectory-data.js, injected sky painting and its 3D scene.
const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect } = require('@playwright/test');

// the sky follows the visitor's local time: pin the zone, and the date where it matters
test.use({ timezoneId: 'Europe/Paris' });
const at = (page, iso) => page.clock.setFixedTime(new Date(iso));

test.describe('home', () => {
  // the 3D scene (software WebGL here) is tested on its own below; the SVG painting's tests run without it
  test.beforeEach(async ({ page }, info) => {
    if (!/3D/.test(info.title)) await page.addInitScript(() => sessionStorage.setItem('dn-svg-painting', '1'));
  });

  test('3D painting loads after the page behind the loading overlay, then replaces the SVG painting', async ({ page }) => {
    test.setTimeout(180000);
    await page.goto('/');
    const pt = page.locator('.sky .pt');
    const ov = page.locator('.sky .pt-load');
    await expect(ov).toBeVisible();
    await expect(ov.locator('.pl-title')).toHaveText('Painting Paris');
    // while it loads, only the overlay shows: the old SVG base layers stay hidden
    await expect(page.locator('.sky .pt-b').first()).toBeHidden();
    await expect(pt).not.toHaveAttribute('data-gl-warm', '', { timeout: 170000 });
    await expect(pt).toHaveAttribute('data-gl', '1');
    await expect(page.locator('.sky .pt3d')).toBeVisible();
    // lifted once the scene has drawn every painted layer, then removed
    await expect(pt).toHaveAttribute('data-loaded', '1', { timeout: 60000 });
    await expect(ov).toHaveCount(0);
    // the scene's scripts are requested only once the page has loaded
    const t = await page.evaluate(() => [performance.getEntriesByType('navigation')[0].loadEventStart, performance.getEntriesByType('resource').find((r) => /three\.module\.min\.js/.test(r.name)).startTime]);
    expect(t[1]).toBeGreaterThanOrEqual(t[0]);
    // the SVG painting's quality is measured once the scene is up; with the 3D (slow here, software GPU) it steps down to
    // "lite" at most: "static" would hide the weather (falling rain, snow) and the moments
    await expect(pt).toHaveAttribute('data-q', 'lite', { timeout: 20000 });
    await page.waitForTimeout(4000);
    await expect(pt).toHaveAttribute('data-q', 'lite');
  });

  test('3D painting is skipped without WebGL 2: the SVG painting stays', async ({ page }) => {
    await page.addInitScript(() => { delete window.WebGL2RenderingContext; });
    await page.goto('/');
    const pt = page.locator('.sky .pt');
    await expect(pt).toHaveAttribute('data-q', /full|lite|static/);
    await expect(pt).not.toHaveAttribute('data-gl', '1');
    await expect(page.locator('.sky .pt-b').first()).toBeVisible();
    await expect(page.locator('.sky .pt-load')).toHaveCount(0);
    expect(await page.evaluate(() => !!window.THREE)).toBe(false);
  });

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

  test('theme follows the local sky; the button fast-forwards to sunset', async ({ page }) => {
    await at(page, '2026-07-01T13:00:00+02:00');
    await page.goto('/');
    const html = page.locator('html'), pt = page.locator('.sky .pt');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(pt).toHaveAttribute('data-sky', 'day');
    await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-label', 'Fast-forward to sunset');
    await page.click('[data-theme-toggle]');
    await expect(html).toHaveAttribute('data-theme', 'dark', { timeout: 10000 });
    await expect(pt).not.toHaveAttribute('data-sky', 'day');
    await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-label', 'Fast-forward to sunrise');
  });

  test('skins follow the date', async ({ page }) => {
    const pt = page.locator('.sky .pt');
    await at(page, '2026-10-31T22:00:00+01:00');
    await page.goto('/');
    await expect(pt).toHaveAttribute('data-event', 'halloween');
    await expect(pt).toHaveAttribute('data-season', 'autumn');
    await expect(pt).toHaveAttribute('data-sky', 'night');
    await expect(page.locator('.sky')).toHaveAttribute('aria-label', /Dressed for Halloween/);
    // the skin's signature moment (the witch) plays first, a few seconds in
    await expect(pt).toHaveAttribute('data-moment', 'witch', { timeout: 10000 });

    await at(page, '2026-12-20T12:00:00+01:00');
    await page.reload();
    await expect(pt).toHaveAttribute('data-event', 'christmas');
    await expect(pt).toHaveAttribute('data-season', 'winter');

    // New Year's Eve: the countdown fills the painting's text hook
    await at(page, '2026-12-31T23:59:55+01:00');
    await page.reload();
    await expect(pt).toHaveAttribute('data-ny', /count/);
    await expect(page.locator('.sky [data-h="count"]')).toHaveText(/^\d+$/);
    // the moon path gets its real phase
    expect(await page.locator('.sky [data-h-d="moonD"]').first().getAttribute('d')).toMatch(/^M0 -25A25 25/);
  });

  test('the test-only skin picker shows off https and switches the skin; hidden on https', async ({ page }) => {
    const pt = page.locator('.sky .pt'), pick = page.locator('[data-skin-picker]');
    await at(page, '2026-07-01T13:00:00+02:00');
    await page.goto('/');
    await expect(pick).toBeVisible();
    await expect(pick).toHaveAttribute('title', /automatic \(Summer today\)/);
    await expect(pt).toHaveAttribute('data-season', 'summer');
    await pick.locator('select').selectOption('christmas');
    await expect(pt).toHaveAttribute('data-event', 'christmas');
    await expect(pt).toHaveAttribute('data-season', 'winter');
    await expect(pick).toHaveAttribute('title', /Seasonal skin: Christmas/);
    await pick.locator('select').selectOption('auto');
    await expect(pt).toHaveAttribute('data-event', '');
    // switching skins keeps the light: by day, New Year's Eve opens on 31 December by day, and the next skin stays by day
    await pick.locator('select').selectOption('newyear');
    await expect(pt).toHaveAttribute('data-event', 'newyear');
    await expect(pt).toHaveAttribute('data-sky', 'day');
    await pick.locator('select').selectOption('halloween');
    await expect(pt).toHaveAttribute('data-event', 'halloween');
    await expect(pt).toHaveAttribute('data-sky', 'day');
    // at night, New Year's Eve jumps to 23:59:47 on 31 December (the crowd is out; the pinned clock stops short of the
    // countdown), and leaving it stays at night
    await at(page, '2026-07-01T23:00:00+02:00');
    await page.reload();
    await expect(pt).toHaveAttribute('data-sky', 'night');
    await pick.locator('select').selectOption('newyear');
    await expect(pt).toHaveAttribute('data-event', 'newyear');
    await expect(pt).toHaveAttribute('data-ny', /crowd/);
    await expect(pt).toHaveAttribute('data-sky', 'night');
    await pick.locator('select').selectOption('valentine');
    await expect(pt).toHaveAttribute('data-event', 'valentine');
    await expect(pt).toHaveAttribute('data-sky', 'night');
    // the live site is served over https: the picker stays hidden there
    await page.route('https://kouji.test/**', async (route) => {
      const u = new URL(route.request().url());
      await route.fulfill({ response: await page.request.fetch('http://localhost:4173' + u.pathname + u.search) });
    });
    await page.goto('https://kouji.test/');
    await expect(pt).toHaveCount(1);
    await expect(pick).toBeHidden();
  });

  test('winter weather is snow, rain or fog for the whole day', async ({ page }) => {
    const pt = page.locator('.sky .pt');
    for (const [iso, wx] of [['2027-01-10T15:00:00+01:00', 'rain'], ['2027-01-08T15:00:00+01:00', 'fog'], ['2027-01-07T15:00:00+01:00', 'snow']]) {
      await at(page, iso);
      await page.goto('/');
      await expect(pt).toHaveAttribute('data-wx', wx);
    }
    await expect(page.locator('.sky')).toHaveAttribute('aria-label', /snow falling/);
    // rain day: the rain layer shows and is not marked hidden
    await at(page, '2027-01-10T15:00:00+01:00');
    await page.reload();
    await expect(page.locator('.sky .rainw')).toBeVisible();
    await expect(page.locator('.sky .rainw')).not.toHaveClass(/\boff\b/);
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

  test('hidden skin / moment groups do not animate', async ({ page }) => {
    await at(page, '2026-07-01T13:00:00+02:00');
    await page.goto('/');
    await expect(page.locator('.sky .mo-sleigh')).toHaveClass(/\boff\b/);
    const hiddenRunning = await page.evaluate(() => document.getAnimations()
      .filter((a) => a.playState === 'running' && a.effect.target.closest('.off')).length);
    expect(hiddenRunning).toBe(0);
  });

  test('static level hides falling leaves instead of freezing them at the top edge', async ({ page }) => {
    await at(page, '2026-10-26T15:00:00+01:00');
    await page.goto('/');
    await page.evaluate(() => sessionStorage.setItem('dn-sky-q', 'static'));
    await page.reload();
    await expect(page.locator('.sky .pt')).toHaveAttribute('data-q', 'static');
    await expect(page.locator('.sky .lnear')).toBeHidden();
    await page.evaluate(() => { sessionStorage.setItem('dn-sky-q', 'full'); });
    await page.reload();
    await expect(page.locator('.sky .lnear')).toBeVisible();
  });

  test('sky painting is injected and responds to a click', async ({ page }) => {
    await page.goto('/');
    const pt = page.locator('.sky .pt');
    await expect(pt).toHaveCount(1);
    // by day a click is a gust, plus the skin's shaped firework
    await at(page, '2026-07-01T13:00:00+02:00');
    await page.reload();
    await page.locator('.sky').click();
    await expect(pt).toHaveAttribute('data-gust', '1');
    await expect(pt).toHaveAttribute('data-fw', '1');
    await expect(pt).toHaveAttribute('data-shape', /\w/);
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
    // the painting (sky.js, or sky-svg.js where the 3D can't run) is requested only once the page has loaded
    const t = await page.evaluate(() => [performance.getEntriesByType('navigation')[0].loadEventStart, performance.getEntriesByType('resource').find((r) => /\/sky(-svg)?\.js/.test(r.name)).startTime]);
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
