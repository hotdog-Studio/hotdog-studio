import { defineConfig, devices } from '@playwright/test';

// Jenkins doesn't set CI, so look for its own variable as well.
const isCI = Boolean(process.env.CI || process.env.JENKINS_URL);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  forbidOnly: isCI,
  outputDir: 'reports/test-results',
  reporter: [
    ['list'],
    ['junit', { outputFile: 'reports/junit/e2e.xml' }],
    ['html', { outputFolder: 'reports/playwright', open: 'never' }],
  ],
  use: { baseURL: 'http://localhost:4321', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run preview:fixtures',
    url: 'http://localhost:4321',
    // Never reuse a server: `astro dev` also defaults to port 4321, and reusing it would run the
    // suite against the dev server and Thomas's drafts. A busy port should fail fast instead.
    reuseExistingServer: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
});
