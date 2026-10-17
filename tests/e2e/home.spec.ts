import { expect, test } from '../support/fixtures';
import { HomePage } from '../support/pages/home-page';

test('shows the open-to-work banner with the configured message', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await expect(home.banner).toHaveText('Fixture: open to QA automation roles.');
});

test('features exactly the three featured case studies, in featuredOrder', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await expect(home.featuredTitles).toHaveText([
    'Fixture public study',
    'Fixture sanitized study',
    'Fixture private study',
  ]);
});

test('each featured card shows its source badge', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await expect(home.featured.locator('.source-badge')).toHaveText([
    'Public',
    'Public edition',
    'Private',
  ]);
});

test('the hero links to the work index, the CV and email', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await expect(home.heroLink('See my work')).toHaveAttribute('href', '/work');
  await expect(home.heroLink('Download CV')).toHaveAttribute('href', '/cv/thomas-southcott-cv.pdf');
  await expect(home.heroLink('Email me')).toHaveAttribute('href', 'mailto:hello@example.com');
});

test('the Reel Raffle card links to the product and to its published case study', async ({
  page,
}) => {
  const home = new HomePage(page);
  await home.goto();
  await expect(home.reelRaffle.getByRole('link', { name: 'Visit reelraffle.org' })).toHaveAttribute(
    'href',
    'https://reelraffle.org',
  );
  await expect(home.reelRaffle.getByRole('link', { name: 'Read the case study' })).toHaveAttribute(
    'href',
    '/work/reel-raffle',
  );
});

test('ships no client-side JavaScript', async ({ page }) => {
  await new HomePage(page).goto();
  await expect(page.locator('script')).toHaveCount(0);
});
