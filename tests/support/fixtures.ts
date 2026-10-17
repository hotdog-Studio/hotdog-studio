import { test as base, expect } from '@playwright/test';

/** What an image from another host is replaced with: a 1x1 SVG, so the page still lays out. */
const PLACEHOLDER_IMAGE = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';

/**
 * The shared `test` for every spec. Both fixtures are automatic: every test gets them, and none
 * has to remember to ask.
 */
// Playwright types a fixture that provides no value as `void`, which this rule otherwise rejects.
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export const test = base.extend<{ consoleGuard: void; offlineRouting: void }>({
  // Fails any test whose page logs a console error or throws an uncaught exception.
  consoleGuard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await use();
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],

  // Keeps the suite off the network, so no test depends on a third-party host such as
  // img.shields.io. Images get a placeholder and everything else is aborted. Chromium logs an
  // aborted request as a console error, so consoleGuard fails the test there. Firefox and WebKit
  // are quieter.
  // It can't be called `offline`: that is Playwright's own option for emulating a lost connection,
  // and Playwright refuses to redefine it as an automatic fixture.
  offlineRouting: [
    async ({ page }, use) => {
      await page.route(
        (url) => url.hostname !== 'localhost',
        (route) =>
          route.request().resourceType() === 'image'
            ? route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE })
            : route.abort(),
      );
      await use();
    },
    { auto: true },
  ],
});

export { expect };
