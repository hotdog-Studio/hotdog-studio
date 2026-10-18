import { expect, test } from '../support/fixtures';
import { AlbumPage } from '../support/pages/album-page';
import { PhotosPage } from '../support/pages/photos-page';

test('shows the album title, month, photo count and description', async ({ page }) => {
  const album = new AlbumPage(page);
  await album.goto('album-newer');
  await expect(album.heading).toHaveText('Fixture newer album');
  await expect(album.meta).toHaveText('June 2025 · 3 photos');
  await expect(page.getByRole('main')).toContainText('Fixture album with three photos');
});

test('lists the photos in capture order, giving the one without alt text the fallback', async ({
  page,
}) => {
  const album = new AlbumPage(page);
  await album.goto('album-newer');
  await expect(album.grid.getByRole('img')).toHaveCount(3);
  expect(
    await album.grid
      .getByRole('img')
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('alt'))),
  ).toEqual([
    'Fixture: a mustard gradient',
    'Fixture: a portrait photo stored sideways',
    'Fixture newer album, photo 3 of 3',
  ]);
});

test('shows the photo stored sideways upright', async ({ page }) => {
  const album = new AlbumPage(page);
  await album.goto('album-newer');
  const portrait = album.grid.getByRole('img').nth(1);
  await expect(portrait).toHaveAttribute('width', '600');
  await expect(portrait).toHaveAttribute('height', '900');
});

test('an album card on the photos index opens its album', async ({ page }) => {
  await new PhotosPage(page).goto();
  await page.getByRole('link', { name: 'Fixture newer album', exact: true }).click();
  await expect(page).toHaveURL('/photos/album-newer');
  await expect(new AlbumPage(page).heading).toHaveText('Fixture newer album');
});

test('no photos page scrolls sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ['/photos', '/photos/album-newer']) {
    await page.goto(path);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      path,
    ).toBeLessThanOrEqual(320);
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('a thumbnail links to a full-size image that loads', async ({ page }) => {
    const album = new AlbumPage(page);
    await album.goto('album-newer');
    const href = (await album.thumbnails.first().getAttribute('href')) ?? '';
    expect(href).toMatch(/^\/photos\/album-newer\/[0-9a-f]{10}-1600\.webp$/);
    await album.thumbnails.first().click();
    await expect(page).toHaveURL(href);
    const response = await page.request.get(href);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toBe('image/webp');
  });
});
