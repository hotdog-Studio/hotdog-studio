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
        if (message.type() !== 'error') return;
        // "Failed to load resource" doesn't say which one, so name the URL it came from.
        const { url } = message.location();
        errors.push(url === '' ? message.text() : `${message.text()} (${url})`);
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await use();
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],

  // Keeps the suite off the network, so no test depends on a third-party host such as
  // img.shields.io. Images get a placeholder. Anything else is aborted and recorded, and the test
  // fails if any request was, naming the URLs. The console can't be left to report this: Chromium
  // logs an aborted request, Firefox only some, and WebKit none.
  // It can't be called `offline`: that is Playwright's own option for emulating a lost connection,
  // and Playwright refuses to redefine it as an automatic fixture.
  offlineRouting: [
    async ({ page }, use) => {
      const aborted: string[] = [];
      await page.route(
        (url) => url.hostname !== 'localhost',
        async (route) => {
          const request = route.request();
          if (request.resourceType() === 'image') {
            await route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER_IMAGE });
          } else {
            aborted.push(request.url());
            await route.abort();
          }
        },
      );
      await use();
      // A handler still fulfilling or aborting when the page closes would otherwise reject as an
      // unhandled error, so stop routing first and ignore whatever such a handler throws.
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      expect(aborted, 'unexpected external requests').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
