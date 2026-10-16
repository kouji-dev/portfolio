// E2E — commit trajectory section (Experience): stacked weekly commit chart,
// stat counters, per-repo lanes, hover tooltip and the ⌘K palette entry.
const { test, expect } = require('@playwright/test');

const REPO_COUNT = 7;

test.describe('trajectory section', () => {
  test('renders legend, chart bands and lanes for every repo', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#trajectory');
    await expect(section).toBeVisible();
    await expect(section.locator('.traj-title')).toHaveText('Nine months, seven repositories');
    await expect(section.locator('.traj-legend-item')).toHaveCount(REPO_COUNT);
    // one fill + one outline path per repo
    await expect(section.locator('[data-traj-chart] path')).toHaveCount(REPO_COUNT * 2);
    await expect(section.locator('[data-traj-lanes] .traj-lane')).toHaveCount(REPO_COUNT);
    await expect(section.locator('[data-traj-ticks] .traj-tick').first()).toHaveText('Dec');
  });

  test('stat counters count up to the computed totals', async ({ page }) => {
    await page.goto('/');
    const stats = page.locator('.traj-stats');
    await stats.scrollIntoViewIfNeeded();
    const commits = stats.locator('[data-count]').first();
    // deterministic series → a fixed target; counter must land on it (not stay at 0)
    const target = await commits.getAttribute('data-target');
    expect(Number(target)).toBeGreaterThan(0);
    await expect(commits).toHaveText(Number(target).toLocaleString('en-US'), { timeout: 5000 });
    await expect(stats.locator('[data-count]').nth(1)).toHaveText(String(REPO_COUNT), { timeout: 5000 });
    await expect(stats.locator('[data-traj-weeks]')).toHaveText('in 37 weeks');
  });

  test('hovering the chart shows the week tooltip and clears on leave', async ({ page }) => {
    await page.goto('/');
    const chart = page.locator('[data-traj-chart]');
    await chart.scrollIntoViewIfNeeded();
    await chart.hover(); // chart mid-point falls in an active week
    const tip = page.locator('[data-traj-tip]');
    await expect(tip).toBeVisible();
    await expect(tip.locator('.traj-tip-label')).toContainText('Week of');
    await expect(tip.locator('.traj-tip-row').first()).toBeVisible();
    await expect(tip.locator('.traj-tip-total')).toContainText('commits');
    await page.locator('#experience .section-num').hover();
    await expect(tip).toBeHidden();
  });

  test('palette lists the trajectory shortcut', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    const input = page.locator('[data-palette-input]');
    await expect(input).toBeVisible();
    await input.fill('trajectory');
    const item = page.locator('.palette-item', { hasText: 'Commit trajectory' });
    await expect(item).toHaveAttribute('href', '#trajectory');
  });
});
