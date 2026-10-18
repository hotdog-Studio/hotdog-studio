import { expect, test } from '../support/fixtures';
import { PhotosPage } from '../support/pages/photos-page';
import { SiteHeader } from '../support/pages/site-header';

test('lists the albums newest first, leaving out the draft', async ({ page }) => {
  const photos = new PhotosPage(page);
  await photos.goto();
  await expect(photos.albumTitles).toHaveText(['Fixture newer album', 'Fixture older album']);
});

test('each album shows its cover, month and photo count', async ({ page }) => {
  const photos = new PhotosPage(page);
  await photos.goto();
  const newer = photos.album('Fixture newer album');
  await expect(newer.getByRole('img')).toHaveAttribute('alt', 'Fixture: a mustard gradient');
  await expect(newer).toContainText('June 2025 · 3 photos');
  const older = photos.album('Fixture older album');
  await expect(older.getByRole('img')).toHaveAttribute('alt', 'Fixture: older photo two');
  await expect(older).toContainText('September 2024 · 2 photos');
});

test('placeholder colours come from a stylesheet, not inline styles', async ({ page }) => {
  await new PhotosPage(page).goto();
  const cover = page.getByRole('main').getByRole('img').first();
  expect(await cover.evaluate((img) => getComputedStyle(img).backgroundColor)).not.toBe(
    'rgba(0, 0, 0, 0)',
  );
  await expect(page.locator('[style]')).toHaveCount(0);
  await expect(page.locator('script')).toHaveCount(0);
});

test('Photos is the current page in the header, and the header reaches it', async ({ page }) => {
  const header = new SiteHeader(page);
  await page.goto('/');
  await header.navLink('Photos').click();
  await expect(page).toHaveURL('/photos');
  await expect(header.navLink('Photos')).toHaveAttribute('aria-current', 'page');
});

test('does not build the draft album', async ({ request }) => {
  expect((await request.get('/photos/album-draft')).status()).toBe(404);
});
