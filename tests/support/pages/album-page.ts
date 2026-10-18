import type { Locator, Page } from '@playwright/test';

/** An album page: the title, the month and count, and the grid of thumbnails. */
export class AlbumPage {
  readonly heading: Locator;
  readonly meta: Locator;
  readonly grid: Locator;
  readonly thumbnails: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.meta = page.getByRole('main').locator('.meta');
    this.grid = page.getByRole('list', { name: 'Photos' });
    this.thumbnails = this.grid.getByRole('link');
  }

  async goto(slug: string, hash?: string): Promise<void> {
    await this.page.goto(`/photos/${slug}${hash === undefined ? '' : `#${hash}`}`);
  }
}
