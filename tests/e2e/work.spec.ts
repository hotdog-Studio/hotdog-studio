import { expect, test } from '../support/fixtures';
import { SiteHeader } from '../support/pages/site-header';

test('lists every published case study, featured first', async ({ page }) => {
  await page.goto('/work');
  await expect(
    page.getByRole('main').getByRole('article').getByRole('heading', { level: 2 }),
  ).toHaveText([
    'Fixture public study',
    'Fixture sanitized study',
    'Fixture private study',
    'Reel Raffle (fixture)',
  ]);
});

test('does not list drafts', async ({ page }) => {
  await page.goto('/work');
  // The published studies are listed, so finding no draft among them means something.
  await expect(
    page.getByRole('main').getByRole('article').getByRole('heading', { level: 2 }),
  ).toHaveText([
    'Fixture public study',
    'Fixture sanitized study',
    'Fixture private study',
    'Reel Raffle (fixture)',
  ]);
  await expect(page.getByText('Fixture draft study')).toHaveCount(0);
});

test('a card opens its case study', async ({ page }) => {
  await page.goto('/work');
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Fixture sanitized study', exact: true })
    .click();
  await expect(page).toHaveURL('/work/fixture-sanitized');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(['Fixture sanitized study']);
});

test('shows the Other things I build strip with repo links', async ({ page }) => {
  await page.goto('/work');
  const strip = page.getByRole('region', { name: 'Other things I build' });
  await expect(strip.getByRole('link')).toHaveText(['Fixture project one', 'Fixture project two']);
  await expect(strip.getByRole('link', { name: 'Fixture project one' })).toHaveAttribute(
    'href',
    'https://github.com/example/fixture-one',
  );
});

test('Work is the current page in the header on the work index', async ({ page }) => {
  const header = new SiteHeader(page);
  await page.goto('/work');
  await expect(header.navLink('Work')).toHaveAttribute('aria-current', 'page');
  await expect(header.nav.locator('[aria-current]')).toHaveCount(1);
});

test('the header reaches the work index, and the site name returns home', async ({ page }) => {
  const header = new SiteHeader(page);
  await page.goto('/');
  await header.navLink('Work').click();
  await expect(page).toHaveURL('/work');
  await header.homeLink.click();
  await expect(page).toHaveURL('/');
});

test('is titled with the page name and the site name', async ({ page }) => {
  await page.goto('/work');
  await expect(page).toHaveTitle('Work · Thomas Southcott');
});

test('has one h1, "Work"', async ({ page }) => {
  await page.goto('/work');
  // The array form also fails if there is more than one h1.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(['Work']);
});

test('declares en-GB and ships no client-side JavaScript or inline styles', async ({ page }) => {
  await page.goto('/work');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
  await expect(page.locator('script')).toHaveCount(0);
  await expect(page.locator('[style]')).toHaveCount(0);
  await expect(page.locator('style')).toHaveCount(0);
});
