# hotdog.studio

The source of [hotdog.studio](https://hotdog.studio), Thomas Southcott's portfolio. It is a static [Astro](https://astro.build) site of case studies, photography albums and a public quality report, built to be evidence for its own message: the repository carries a real test suite and quality gates. The design is in the [design spec](docs/superpowers/specs/2026-10-14-hotdog-studio-portfolio-design.md).

## Prerequisites

- Node 24.22, the version pinned in `.node-version`. The minimum is 24.16: `.npmrc` sets `engine-strict=true`, so `npm install` refuses to run on anything older.
- Install the dependencies with `npm ci`.

## Build modes

`SITE_MODE` selects what a build reads and where it writes. `real` is the default, and an unset or empty value means the same. It builds into `dist/`. `fixtures` builds into `dist-fixtures/`, so it never overwrites the real build. Any other value fails the build rather than silently falling back to the real site.

## Scripts

| Script                     | What it does                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `npm run dev`              | Starts the Astro dev server.                                                          |
| `npm run build`            | Builds the real site into `dist/`.                                                    |
| `npm run build:fixtures`   | Builds with `SITE_MODE=fixtures` into `dist-fixtures/`.                               |
| `npm run preview:fixtures` | Serves `dist-fixtures/` on <http://localhost:4321>. Build it first.                   |
| `npm run lint`             | Type-checks with `astro check`, then runs ESLint and checks formatting with Prettier. |
| `npm run format`           | Rewrites every file with Prettier.                                                    |
| `npm run test:unit`        | Runs the Vitest unit tests and writes a JUnit report to `reports/junit/unit.xml`.     |

## End-to-end tests

The Playwright suite tests the fixture build, never the real site or the dev server.

1. Install the browsers once with `npx playwright install chromium firefox webkit`. Linux CI agents add `--with-deps`.
2. Build the fixtures with `npm run build:fixtures`. The suite serves whatever is in `dist-fixtures/`, so run this first, and again after any change to the site.
3. Run the suite with `npm run test:e2e`. Playwright starts and stops its own preview server on port 4321. It never reuses a running one, so stop `npm run dev` first, or the run fails straight away.

The HTML report goes to `reports/playwright` and the JUnit report to `reports/junit/e2e.xml`.
