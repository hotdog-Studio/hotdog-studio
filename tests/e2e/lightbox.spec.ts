import type { Locator } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { AlbumPage } from '../support/pages/album-page';
import { Lightbox } from '../support/pages/lightbox';

/** The ids of album-newer's three photos, in grid order. */
async function photoIds(album: AlbumPage): Promise<[string, string, string]> {
  const ids = await album.thumbnails.evaluateAll((links) => links.map((link) => link.id));
  const [first, second, third] = ids;
  if (ids.length !== 3 || first === undefined || second === undefined || third === undefined) {
    throw new Error(`Expected album-newer to have 3 photo ids, got ${JSON.stringify(ids)}`);
  }
  return [first, second, third];
}

/** Where an element is drawn on the page. It throws if the element isn't laid out at all. */
async function boxOf(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error(`${locator.toString()} has no box`);
  return box;
}

test('opens on click with the photo, its counter and caption', async ({ page }) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  await album.goto('album-newer');
  await album.thumbnails.first().click();
  await expect(lightbox.dialog).toBeVisible();
  await expect(lightbox.image).toHaveAttribute('alt', 'Fixture: a mustard gradient');
  await expect(lightbox.counter).toHaveText('1 / 3');
  await expect(lightbox.caption).toHaveText('Fixture caption one.');
});

test('opens from the keyboard with Enter', async ({ page }) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  await album.goto('album-newer');
  await album.thumbnails.nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(lightbox.dialog).toBeVisible();
  await expect(lightbox.counter).toHaveText('2 / 3');
});

test('the arrow keys and the buttons move between photos, wrapping at both ends', async ({
  page,
}) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  await album.goto('album-newer');
  await album.thumbnails.first().click();
  await expect(lightbox.counter).toHaveText('1 / 3');
  await page.keyboard.press('ArrowRight');
  await expect(lightbox.counter).toHaveText('2 / 3');
  await lightbox.next.click();
  await expect(lightbox.counter).toHaveText('3 / 3');
  await lightbox.next.click();
  await expect(lightbox.counter).toHaveText('1 / 3');
  await page.keyboard.press('ArrowLeft');
  await expect(lightbox.counter).toHaveText('3 / 3');
  await lightbox.previous.click();
  await expect(lightbox.counter).toHaveText('2 / 3');
});

test('the arrow keys still move after a click on the photo itself', async ({ page }) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  await album.goto('album-newer');
  await album.thumbnails.first().click();
  // The photo can't take focus, so every engine moves focus to the dialog itself, as WebKit also
  // does for a click on a button. The keys must still reach the lightbox from there.
  await lightbox.image.click();
  await page.keyboard.press('ArrowRight');
  await expect(lightbox.counter).toHaveText('2 / 3');
});

test('moving to a photo without a caption hides the caption', async ({ page }) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  await album.goto('album-newer');
  await album.thumbnails.first().click();
  await expect(lightbox.caption).toHaveText('Fixture caption one.');
  await lightbox.next.click();
  await expect(lightbox.counter).toHaveText('2 / 3');
  await expect(lightbox.caption).toBeHidden();
});

test('Esc closes it, clears the hash and returns focus to the thumbnail that opened it', async ({
  page,
}) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  await album.goto('album-newer');
  await album.thumbnails.first().click();
  await page.keyboard.press('ArrowRight');
  await expect(lightbox.counter).toHaveText('2 / 3');
  await page.keyboard.press('Escape');
  await expect(lightbox.dialog).toBeHidden();
  await expect(album.thumbnails.first()).toBeFocused();
  await expect(page).toHaveURL('/photos/album-newer');
});

test('the Close button does the same', async ({ page }) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  await album.goto('album-newer');
  await album.thumbnails.first().click();
  await page.keyboard.press('ArrowRight');
  await expect(lightbox.counter).toHaveText('2 / 3');
  await lightbox.close.click();
  await expect(lightbox.dialog).toBeHidden();
  await expect(album.thumbnails.first()).toBeFocused();
  await expect(page).toHaveURL('/photos/album-newer');
});

test('the hash follows the photo, and loading the album with it opens that photo', async ({
  page,
}) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  await album.goto('album-newer');
  const [first, second] = await photoIds(album);
  await album.thumbnails.first().click();
  await expect(page).toHaveURL(`/photos/album-newer#${first}`);
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(`/photos/album-newer#${second}`);

  // A goto that changes only the hash of the same URL doesn't reload the page, so the script
  // wouldn't start again. Leaving for another page first makes the next goto a real load.
  await page.goto('/');
  await album.goto('album-newer', second);
  await expect(lightbox.dialog).toBeVisible();
  await expect(lightbox.counter).toHaveText('2 / 3');
  await page.keyboard.press('Escape');
  await expect(album.thumbnails.nth(1)).toBeFocused();
});

test('an album URL whose hash is not a photo opens nothing', async ({ page }) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  // The skip link's target, a stale or unknown id, and an escape that can't be decoded. The
  // console guard fails the test if any of them makes the script throw.
  for (const hash of ['main', '0000000000', '%E0%A4%A']) {
    await page.goto('/');
    await album.goto('album-newer', hash);
    await expect(album.heading, hash).toBeVisible();
    await expect(lightbox.dialog, hash).toBeHidden();
  }
});

test('shows the EXIF line only in albums with showExif', async ({ page }) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  await album.goto('album-newer');
  await album.thumbnails.first().click();
  await expect(lightbox.exif).toHaveText('FixtureCam X1 · 35 mm · f/1.8 · 1/250 s · ISO 100');

  await album.goto('album-older');
  await album.thumbnails.first().click();
  await expect(lightbox.dialog).toBeVisible();
  await expect(lightbox.counter).toHaveText('1 / 2');
  await expect(lightbox.exif).toBeHidden();
});

test('preloads the neighbouring photos, once each, in the format the browser chose', async ({
  page,
}) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  const preloads = page.locator('head link[rel="preload"][as="image"]');
  await album.goto('album-newer');
  const [first, second, third] = await photoIds(album);
  await album.thumbnails.first().click();

  // The next photo, and the previous one, wrapped round from the end.
  await expect(preloads).toHaveCount(2);
  const srcsets = await preloads.evaluateAll((links) =>
    links.map((link) => link.getAttribute('imagesrcset') ?? ''),
  );
  expect(srcsets).toEqual(
    expect.arrayContaining([expect.stringContaining(second), expect.stringContaining(third)]),
  );
  // The preloads use the format the browser picked for the photo on show, never both.
  const format = (await lightbox.image.evaluate((img: HTMLImageElement) => img.currentSrc))
    .split('.')
    .pop();
  for (const srcset of srcsets) {
    for (const candidate of srcset.split(', ')) expect(candidate).toContain(`.${format} `);
  }
  await expect(page.locator('head link[rel="preload"][imagesizes="100vw"]')).toHaveCount(2);

  // On the second photo, only the first is new: the third was preloaded already. Both links are
  // added together, so a count of 3 can't be seen on the way to a duplicate's 4.
  await page.keyboard.press('ArrowRight');
  await expect(lightbox.counter).toHaveText('2 / 3');
  await expect(preloads).toHaveCount(3);
  expect(await preloads.last().getAttribute('imagesrcset')).toContain(first);
});

test('a modified click keeps the browser default and leaves the lightbox closed', async ({
  page,
}) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  await album.goto('album-newer');
  await album.thumbnails.first().click({ modifiers: ['ControlOrMeta'] });
  await expect(lightbox.dialog).toBeHidden();
});

test('the photo sits inside the viewport, between the bar and the buttons', async ({ page }) => {
  const album = new AlbumPage(page);
  const lightbox = new Lightbox(page);
  await album.goto('album-newer');
  // The portrait photo: the tallest, so the likeliest to push past the buttons.
  await album.thumbnails.nth(1).click();
  await expect(lightbox.counter).toHaveText('2 / 3');
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  const [image, close, next] = await Promise.all([
    boxOf(lightbox.image),
    boxOf(lightbox.close),
    boxOf(lightbox.next),
  ]);
  expect(image.x).toBeGreaterThanOrEqual(0);
  expect(image.x + image.width).toBeLessThanOrEqual(viewport.width);
  expect(image.y).toBeGreaterThanOrEqual(close.y + close.height);
  expect(image.y + image.height).toBeLessThanOrEqual(next.y);
  expect(next.y + next.height).toBeLessThanOrEqual(viewport.height);
});

test('the album page ships one external module script and no inline script', async ({ page }) => {
  await new AlbumPage(page).goto('album-newer');
  await expect(page.locator('script:not([src])')).toHaveCount(0);
  await expect(page.locator('script[type="module"][src^="/_astro/"]')).toHaveCount(1);
});
