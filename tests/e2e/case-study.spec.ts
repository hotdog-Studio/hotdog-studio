import { expect, test } from '../support/fixtures';
import { CaseStudyPage } from '../support/pages/case-study-page';
import { SiteHeader } from '../support/pages/site-header';

test('public: links the repository and shows its badges', async ({ page }) => {
  const study = new CaseStudyPage(page);
  await study.goto('fixture-public');
  await expect(study.source.getByRole('link', { name: 'View the repository' })).toHaveAttribute(
    'href',
    'https://github.com/example/fixture-public',
  );
  await expect(study.source.getByRole('img', { name: 'tests' })).toBeVisible();
});

test('sanitized: explains it is a public edition and links the repository', async ({ page }) => {
  const study = new CaseStudyPage(page);
  await study.goto('fixture-sanitized');
  await expect(study.source).toContainText('Public edition of a private framework');
  await expect(study.source).toContainText(
    'Fixture note: names and endpoints were replaced before publishing.',
  );
  await expect(study.source.getByRole('link', { name: 'View the repository' })).toBeVisible();
});

test('private: says the source is private and links no repository anywhere', async ({ page }) => {
  const study = new CaseStudyPage(page);
  await study.goto('fixture-private');
  await expect(study.source).toHaveText(
    'Source is private. Happy to walk through it in interview.',
  );
  await expect(page.getByRole('main').getByRole('link', { name: /repositor/i })).toHaveCount(0);
});

test('renders the six sections in order', async ({ page }) => {
  const study = new CaseStudyPage(page);
  await study.goto('fixture-public');
  // Smart punctuation renders the source's straight apostrophe as U+2019.
  await expect(study.sectionHeadings).toHaveText([
    'Context',
    'Problem',
    'Test strategy',
    'Stack',
    'Results',
    'What I’d change',
  ]);
});

test('highlights code at build time, declares en-GB and ships no client-side JavaScript or inline styles', async ({
  page,
}) => {
  await new CaseStudyPage(page).goto('fixture-public');
  await expect(page.locator('article.prose pre code .token').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
  await expect(page.locator('script')).toHaveCount(0);
  // Prism, unlike Shiki, writes classes only, so the token colours need no inline styles.
  await expect(page.locator('[style]')).toHaveCount(0);
  await expect(page.locator('style')).toHaveCount(0);
});

test('Work stays the current page in the header on a case study', async ({ page }) => {
  const header = new SiteHeader(page);
  await new CaseStudyPage(page).goto('fixture-public');
  await expect(header.navLink('Work')).toHaveAttribute('aria-current', 'page');
  await expect(header.nav.locator('[aria-current]')).toHaveCount(1);
});

test('shows the live site link for Reel Raffle', async ({ page }) => {
  await new CaseStudyPage(page).goto('reel-raffle');
  await expect(page.getByRole('link', { name: 'Live site' })).toHaveAttribute(
    'href',
    'https://reelraffle.org',
  );
});

test('private with a live site: links the site and no repository', async ({ page }) => {
  await new CaseStudyPage(page).goto('reel-raffle');
  const main = page.getByRole('main');
  // The header's link row is there, so finding no repository link in it means something.
  await expect(main.getByRole('link', { name: 'Live site' })).toBeVisible();
  await expect(main.getByRole('link', { name: /repositor/i })).toHaveCount(0);
});

test('does not build draft case studies', async ({ request }) => {
  // A published study is served, so the draft's 404 means it was left out, not that none was built.
  expect((await request.get('/work/fixture-public')).status()).toBe(200);
  expect((await request.get('/work/fixture-draft')).status()).toBe(404);
});

test('no page scrolls sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ['/', '/work', '/work/fixture-public']) {
    await page.goto(path);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      path,
    ).toBeLessThanOrEqual(320);
  }
});

test('is titled with the study title and the site name', async ({ page }) => {
  await new CaseStudyPage(page).goto('fixture-public');
  await expect(page).toHaveTitle('Fixture public study · Thomas Southcott');
});

test('has one h1, the study title', async ({ page }) => {
  await new CaseStudyPage(page).goto('fixture-public');
  // The array form also fails if there is more than one h1.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(['Fixture public study']);
});

test('the header gives the role, period, stack, source and repository', async ({ page }) => {
  await new CaseStudyPage(page).goto('fixture-public');
  const main = page.getByRole('main');
  await expect(main.getByRole('term')).toHaveText(['Role', 'Period']);
  await expect(main.getByRole('definition')).toHaveText(['QA engineer', '2024–2025']);
  await expect(main.getByRole('list', { name: 'Stack' }).getByRole('listitem')).toHaveText([
    'Playwright',
    'TypeScript',
  ]);
  await expect(main.getByText('Public', { exact: true })).toBeVisible();
  await expect(main.getByRole('link', { name: 'Repository', exact: true })).toHaveAttribute(
    'href',
    'https://github.com/example/fixture-public',
  );
});

test('a long code line scrolls inside its block, which keyboard users can focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const study = new CaseStudyPage(page);
  await study.goto('fixture-public');
  const code = study.codeBlocks.first();
  await expect(code).toHaveAttribute('tabindex', '0');
  expect(await code.evaluate((pre) => pre.scrollWidth > pre.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await code.focus();
  await expect(code).toBeFocused();
});
