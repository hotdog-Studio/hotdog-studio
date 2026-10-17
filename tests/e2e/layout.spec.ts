import { expect, test } from '../support/fixtures';
import { SiteHeader } from '../support/pages/site-header';

test('the skip link comes first and moves focus to the main content', async ({ page }) => {
  await page.goto('/');
  const header = new SiteHeader(page);
  await expect(page.locator('a[href], button').first()).toHaveText('Skip to content');
  await header.skipLink.focus();
  // Clipped to 1px until focused, which toBeVisible() still accepts, so check the width.
  expect((await header.skipLink.boundingBox())?.width ?? 0).toBeGreaterThan(1);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('the home page is titled with the site name', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Thomas Southcott');
});

test('no navigation item is current on the home page', async ({ page }) => {
  await page.goto('/');
  const header = new SiteHeader(page);
  // A renamed or removed nav matches nothing and would pass the check below, so find it first.
  await expect(header.nav.getByRole('link')).toHaveCount(3);
  await expect(header.nav.locator('[aria-current]')).toHaveCount(0);
});

test('the footer shows the build stamp and links to the quality page', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByText('local build')).toBeVisible();
  await expect(
    footer.getByRole('link', { name: 'Built with Astro, tested with Playwright' }),
  ).toHaveAttribute('href', '/quality');
});
