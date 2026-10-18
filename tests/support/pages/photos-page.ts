import type { Locator, Page } from '@playwright/test';

/** The photos index: one article per published album. */
export class PhotosPage {
  readonly albumTitles: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.albumTitles = page
      .getByRole('main')
      .getByRole('article')
      .getByRole('heading', { level: 2 });
  }

  async goto(): Promise<void> {
    await this.page.goto('/photos');
  }

  /** The card of the album with this title. */
  album(title: string): Locator {
    return this.page
      .getByRole('article')
      .filter({ has: this.page.getByRole('heading', { name: title }) });
  }
}
