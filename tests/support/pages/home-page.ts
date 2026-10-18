import type { Locator, Page } from '@playwright/test';

/** The home page: the open-to-work banner, the hero, the featured work, the Reel Raffle card and the latest photos. */
export class HomePage {
  readonly banner: Locator;
  readonly hero: Locator;
  readonly featured: Locator;
  readonly featuredTitles: Locator;
  readonly reelRaffle: Locator;
  readonly latestPhotos: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.banner = page.getByRole('region', { name: 'Open to work' });
    // The hero is the region its own heading names: the fixture site's name.
    this.hero = page.getByRole('region', { name: 'Thomas Southcott', exact: true });
    this.featured = page.getByRole('region', { name: 'Featured work' });
    this.featuredTitles = this.featured.getByRole('heading', { level: 3 });
    this.reelRaffle = page.getByRole('region', { name: 'Built and shipped' });
    this.latestPhotos = page.getByRole('region', { name: 'Latest photos' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /** A link in the hero, by its exact name. */
  heroLink(name: string): Locator {
    return this.hero.getByRole('link', { name, exact: true });
  }
}
