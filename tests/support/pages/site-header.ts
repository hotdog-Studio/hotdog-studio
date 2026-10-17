import type { Locator, Page } from '@playwright/test';

/** The skip link, home link and main navigation that open every page. */
export class SiteHeader {
  readonly homeLink: Locator;
  readonly nav: Locator;
  readonly skipLink: Locator;

  constructor(page: Page) {
    this.homeLink = page.getByRole('link', { name: 'Thomas Southcott', exact: true });
    this.nav = page.getByRole('navigation', { name: 'Main' });
    this.skipLink = page.getByRole('link', { name: 'Skip to content' });
  }

  navLink(label: 'Work' | 'Photos' | 'About'): Locator {
    return this.nav.getByRole('link', { name: label });
  }
}
