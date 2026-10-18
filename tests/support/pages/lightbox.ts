import type { Locator, Page } from '@playwright/test';

/** The album lightbox: the photo, its counter, caption and EXIF line, and its buttons. */
export class Lightbox {
  readonly dialog: Locator;
  readonly image: Locator;
  readonly counter: Locator;
  readonly caption: Locator;
  readonly exif: Locator;
  readonly close: Locator;
  readonly previous: Locator;
  readonly next: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Photo viewer' });
    this.image = this.dialog.getByRole('img');
    this.counter = this.dialog.locator('.counter');
    this.caption = this.dialog.locator('.caption');
    this.exif = this.dialog.locator('.exif');
    this.close = this.dialog.getByRole('button', { name: 'Close', exact: true });
    this.previous = this.dialog.getByRole('button', { name: 'Previous', exact: true });
    this.next = this.dialog.getByRole('button', { name: 'Next', exact: true });
  }
}
